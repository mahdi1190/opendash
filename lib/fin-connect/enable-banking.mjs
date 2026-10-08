// lib/fin-connect/enable-banking.mjs - the READ-ONLY Enable Banking provider
// (docs/dev/FINANCE_CONNECTIONS.md sections 2.3, 3.2-3.7; Builder 4).
//
// Enable Banking (api.enablebanking.com) reads accounts the user links
// themselves through their own "restricted production" application. Every
// call carries a JWT signed (RS256) with the user's PEM key, which never
// leaves this computer: it lives in <data>/secrets/fin/eb-app.json and the
// JWT lives one hour, is never logged and is only sent to api.enablebanking.com.
//
// What this module can call (ALLOW, checked before every request, again by
// the shared allowlist client when the core passes one in):
//   GET  /application, /aspsps, /sessions/{id}, /accounts/{uid}/details|balances|transactions
//   POST /auth, /sessions
//   DELETE /sessions/{id}
// Nothing under /payments, nothing that writes to an account. There is no
// code path here that can move money.
//
// Flow: saveApp (PEM + application id, tested with GET /application) ->
// banks (live /aspsps per country, cached 24 h; the bundled snapshot before
// an app exists) -> start (POST /auth, one-use state `<port>.<random>`) ->
// the bank -> callback / finishFromUrl (POST /sessions {code}) -> a `direct`
// source {provider:'enable-banking'} with one account per EB account uid ->
// fetch (balances + transactions with continuation_key, from the cursor minus
// 35 days; at most 4 automatic updates per account per day) -> normalise.
//
// Consent: access.valid_until = now + the bank's maximum_consent_validity
// (capped at 180 days); status() turns it into reauthDue + a due level
// (ok / soon: 14 days / urgent: 3 days / expired). EXPIRED_SESSION and
// friends become CONSENT_EXPIRED (needs a new sign-in, the source is kept).
//
// Fake mode (DASHBOARD_ENABLEBANKING_FAKE=1): tests/fixtures/fin-fake-enablebanking.mjs
// answers in-process instead of the network (the core loads it: ctx.fake).
//
// Logs carry the op, milliseconds, counts and error codes only: never the
// JWT, PEM, session or account ids, amounts, memos or URLs with a query.
//
// Node stdlib only.

import { createSign, createPrivateKey, createPublicKey, randomBytes, createHash } from 'node:crypto';
import { promises as fsp, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { cleanText } from '../calendar-jobkit.mjs';
import { FinError, defineProvider } from './provider.mjs';
import { readOnlyClient, allowedBy } from './http.mjs';
import { secretsFor } from './secrets.mjs';
import { minorDigits } from './normalise.mjs';

export const ID = 'enable-banking';
export const EB_HOST = 'api.enablebanking.com';
export const EB_BASE = `https://${EB_HOST}`;
export const JWT_TTL_S = 3600;                    // EB allows up to 86400
export const MAX_CONSENT_DAYS = 180;
export const AUTO_UPDATES_PER_DAY = 4;            // PSD2 unattended access limit
export const PEM_MAX_BYTES = 16 * 1024;
export const OVERLAP_DAYS = 35;                   // same overlap as the Aureli job
export const FIRST_IMPORT_DAYS = 730;             // what we ask for; banks give 90 days to 2 years
export const FALLBACK_DAYS = 89;                  // when a bank refuses the long period
export const STATE_TTL_MS = 10 * 60 * 1000;
export const MAX_PENDING = 20;
export const BANKS_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_PAGES = 200;                     // continuation pages per account per fetch
export const DUE_SOON_DAYS = 14;
export const DUE_URGENT_DAYS = 3;
// The two ways back from the bank (section 2.3.1). Both can be registered at once.
export const BOUNCE_URL = 'https://mahdi1190.github.io/opendash/eb-callback.html';
export const PASTE_URL = 'https://localhost/opendash-eb-callback';

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const PATH_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;       // session ids and account uids before they go into a path (= the core's account id rule)
const SOURCE_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const COUNTRY_RE = /^[A-Z]{2}$/;
const STATE_RE = /^(\d{4,5})\.([A-Za-z0-9_-]{43})$/;
const DAY_MS = 86400000;
const COLOURS = ['teal', 'blue', 'violet', 'green', 'amber', 'pink', 'indigo', 'orange'];

// ─── Errors ──────────────────────────────────────────────────────────────
// The core's typed codes (provider.mjs FIN_CODES, section 3.6). Messages are
// plain English and never echo input or provider text.
export const FinConnectError = FinError;
const fail = (code, message, status) => new FinError(code, message, status ? { status } : {});
const MESSAGES = {
  NOT_CONFIGURED: 'Enable Banking is not set up yet. Add your app key first.',
  APP_KEY: 'Enable Banking did not accept the app key. Check that the application ID and the .pem file belong to the same app.',
  AUTH: 'The bank sign-in did not finish. Start it again from OpenDash.',
  CONSENT_EXPIRED: 'Your bank access has ended. Sign in to the bank again to keep syncing.',
  RATE_LIMITED: 'The bank allows only a few updates a day. Try again later.',
  NETWORK: 'Enable Banking could not be reached. Check your internet connection and try again.',
  BAD_RESPONSE: 'Enable Banking sent an answer OpenDash could not read.',
  POLICY: 'OpenDash only reads from banks. That request was blocked.',
  NOT_SUPPORTED: 'That bank is not available through Enable Banking. Import a CSV instead.',
  BUDGET: 'Automatic updates for this bank are used up for today (banks allow about 4). Press Sync now to update anyway.',
};

// ─── Allowlist (read-only by construction, section 3.3) ─────────────────
const P = (re) => re;
export const allow = Object.freeze([
  { method: 'GET', host: EB_HOST, path: P(/^\/application$/) },
  { method: 'GET', host: EB_HOST, path: P(/^\/aspsps$/) },
  { method: 'GET', host: EB_HOST, path: P(/^\/sessions\/[A-Za-z0-9_-]{1,64}$/) },
  { method: 'GET', host: EB_HOST, path: P(/^\/accounts\/[A-Za-z0-9_-]{1,64}\/(details|balances|transactions)$/) },
  { method: 'POST', host: EB_HOST, path: P(/^\/auth$/) },
  { method: 'POST', host: EB_HOST, path: P(/^\/sessions$/) },
  { method: 'DELETE', host: EB_HOST, path: P(/^\/sessions\/[A-Za-z0-9_-]{1,64}$/) },
]);
export const readOnly = true;

/** True when (method, url) is on the list (https only; the core's matcher). */
export function isAllowed(method, url) {
  try { if (new URL(url).protocol !== 'https:') return false; } catch { return false; }
  return !!allowedBy(allow, method, url);
}

// ─── Small helpers ───────────────────────────────────────────────────────
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const isIsoDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const nowMs = (ctx) => (ctx && typeof ctx.now === 'function' ? Number(ctx.now()) : Date.now());
const logOf = (ctx) => (ctx && typeof ctx.log === 'function' ? ctx.log : () => {});
const shortHash = (s, n = 12) => createHash('sha256').update(String(s)).digest('hex').slice(0, n);

/** The application id Enable Banking shows (a UUID). */
export function checkAppId(s) {
  const v = String(s == null ? '' : s).trim();
  if (!UUID_RE.test(v)) throw fail('BAD_REQUEST', 'The application ID should look like 8-4-4-4-12 letters and numbers (copy it from the Enable Banking Control Panel).');
  return v.toLowerCase();
}

/**
 * The .pem file the Control Panel downloads. Must be ONE unencrypted RSA
 * private key (PKCS#8 "PRIVATE KEY" or PKCS#1 "RSA PRIVATE KEY"), 2048 bits
 * or more, under 16 KB. Returns the key re-exported as PKCS#8 PEM. Never
 * echoes the input in an error.
 */
export function checkPem(text) {
  const t = typeof text === 'string' ? text : '';
  if (!t.trim()) throw fail('BAD_REQUEST', 'Choose the .pem file Enable Banking gave you.');
  if (Buffer.byteLength(t, 'utf8') > PEM_MAX_BYTES) throw fail('BAD_REQUEST', 'That file is too big to be an Enable Banking key (.pem files are a few KB).', 413);
  const begins = t.match(/-----BEGIN ([A-Z ]+)-----/g) || [];
  if (begins.length !== 1) throw fail('BAD_REQUEST', 'That file is not a single private key. Use the .pem file Enable Banking downloaded.');
  const label = begins[0].replace(/-----BEGIN |-----/g, '');
  if (label === 'ENCRYPTED PRIVATE KEY') throw fail('BAD_REQUEST', 'That key is protected with a password. Download an unprotected key from Enable Banking.');
  if (label !== 'PRIVATE KEY' && label !== 'RSA PRIVATE KEY') throw fail('BAD_REQUEST', 'That file is not a private key. Use the .pem file Enable Banking downloaded.');
  let key;
  try { key = createPrivateKey({ key: t, format: 'pem' }); }
  catch { throw fail('BAD_REQUEST', 'That key file could not be read. Download it again from Enable Banking.'); }
  if (key.asymmetricKeyType !== 'rsa') throw fail('BAD_REQUEST', 'Enable Banking keys are RSA keys. This one is not.');
  const bits = key.asymmetricKeyDetails && key.asymmetricKeyDetails.modulusLength;
  if (!bits || bits < 2048) throw fail('BAD_REQUEST', 'That key is too short. Enable Banking keys are 2048 bits or more.');
  return key.export({ type: 'pkcs8', format: 'pem' });
}

/** RS256 JWT for Enable Banking: header {typ, alg, kid: appId}; claims iss/aud/iat/exp. */
export function signJwt({ appId, pem, now = Date.now(), ttl = JWT_TTL_S }) {
  const iat = Math.floor(now / 1000);
  const life = Math.max(60, Math.min(Number(ttl) || JWT_TTL_S, 86400));
  const header = { typ: 'JWT', alg: 'RS256', kid: appId };
  const claims = { iss: 'enablebanking.com', aud: EB_HOST, iat, exp: iat + life };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const sig = createSign('RSA-SHA256').update(input).end().sign(pem);
  return `${input}.${b64url(sig)}`;
}

/** Decimal string -> unsigned integer minor units (digits after the point), exactly: no floats. null when not a number. */
export function toMinor(amount, digits = 2) {
  const s = typeof amount === 'number' ? (Number.isFinite(amount) ? amount.toFixed(digits + 1) : '') : String(amount == null ? '' : amount).trim();
  const m = s.match(/^[+-]?(\d{1,13})(?:\.(\d+))?$/);
  if (!m) return null;
  const frac = (m[2] || '').padEnd(digits + 1, '0');
  let p = Number(m[1]) * 10 ** digits + (digits ? Number(frac.slice(0, digits)) : 0);
  if (Number(frac[digits]) >= 5) p += 1;                  // half up on the next digit
  return p;
}
export const toPence = (amount) => toMinor(amount, 2);

/** Days until the consent end and the badge level the page shows. */
export function consentDue(validUntil, now = Date.now()) {
  const end = Date.parse(validUntil || '');
  if (!Number.isFinite(end)) return { reauthDue: null, daysLeft: null, level: 'unknown' };
  const daysLeft = Math.floor((end - now) / DAY_MS);
  const level = end <= now ? 'expired' : daysLeft <= DUE_URGENT_DAYS ? 'urgent' : daysLeft <= DUE_SOON_DAYS ? 'soon' : 'ok';
  return { reauthDue: isoDay(end), daysLeft: Math.max(0, daysLeft), level };
}

/** access.valid_until for a new consent: the bank's maximum, capped at 180 days. */
export function consentEnd(maxSeconds, now = Date.now()) {
  const want = Number(maxSeconds) > 0 ? Number(maxSeconds) * 1000 : 90 * DAY_MS;
  return new Date(now + Math.min(want, MAX_CONSENT_DAYS * DAY_MS) - 60 * 1000).toISOString();   // a minute's slack
}

/** `••••1234` from an IBAN / account number; never the whole number. */
export function maskAccount(acc) {
  const id = isObj(acc) ? acc : {};
  const raw = (isObj(id.account_id) && (id.account_id.iban || (isObj(id.account_id.other) && id.account_id.other.identification)))
    || (Array.isArray(id.all_account_ids) && id.all_account_ids.map(x => x && x.identification).find(Boolean)) || '';
  const digits = String(raw).replace(/[^A-Za-z0-9]/g, '');
  return digits.length >= 4 ? '••••' + digits.slice(-4) : null;
}

const KIND_BY_TYPE = { CACC: 'current', SVGS: 'savings', CARD: 'card', LOAN: 'loan', MOMA: 'savings', TRAN: 'current', CASH: 'current', OTHR: 'current' };

/**
 * Our id for an EB account. EB's `uid` belongs to one session (a new sign-in
 * gives new uids), so the id comes from `identification_hash`, which stays the
 * same for the same bank account across sessions: rows, cursors and the
 * user's choices survive a re-auth. Falls back to the uid.
 */
export function stableAccountId(a) {
  const basis = isObj(a) && typeof a.identification_hash === 'string' && a.identification_hash ? `ih:${a.identification_hash}` : `uid:${a && a.uid}`;
  return 'eb' + shortHash(basis, 20);
}

/** One EB session account -> our account entry (+ `uid`, the session's id for it; kept in secrets only). */
export function accountFromSession(a, i = 0) {
  if (!isObj(a) || typeof a.uid !== 'string' || !PATH_ID_RE.test(a.uid)) return null;
  const name = cleanText(a.name || a.product || a.details || 'Account', 60) || 'Account';
  return {
    id: stableAccountId(a),
    uid: a.uid,
    name,
    colour: COLOURS[i % COLOURS.length],
    enabled: true,
    kind: KIND_BY_TYPE[a.cash_account_type] || 'current',
    ...(maskAccount(a) ? { mask: maskAccount(a) } : {}),
    ...(typeof a.currency === 'string' && /^[A-Z]{3}$/.test(a.currency) ? { currency: a.currency } : {}),
  };
}

const secretsOf = (ctx) => (ctx && ctx.secrets) || secretsFor(ctx.dataDir);

// ─── HTTP (read-only) ────────────────────────────────────────────────────
/**
 * The core's allowlist client (http.mjs): ctx.http(provider) when the core
 * passes one, else readOnlyClient(allow) over ctx.fetch / the fake's fetchFn.
 * isAllowed() is checked here too, before the client is even asked.
 */
function clientOf(ctx) {
  if (typeof ctx.http === 'function') { const c = ctx.http(provider); if (c && typeof c.request === 'function') return c; }
  if (ctx.http && typeof ctx.http.request === 'function') return ctx.http;
  const fetchFn = ctx.fetch || (ctx.fake && ctx.fake.fetchFn) || globalThis.fetch;
  return readOnlyClient(allow, { provider: ID, fetchFn, log: logOf(ctx) });
}
async function httpRequest(ctx, req) {
  if (!isAllowed(req.method, req.url)) {
    logOf(ctx)('warn', `fin-connect policy ${ID} ${String(req.method).toUpperCase().slice(0, 8)}`);
    throw fail('POLICY', MESSAGES.POLICY);
  }
  return clientOf(ctx).request(req.method, req.url, { headers: req.headers, ...(req.body !== undefined ? { json: req.body } : {}), label: 'Enable Banking' });
}

/** EB error body -> our typed error. */
export function mapEbError(status, body) {
  const code = isObj(body) ? String(body.error || body.code || '') : '';
  if (/EXPIRED_SESSION|CLOSED_SESSION|REVOKED_SESSION|SESSION_DOES_NOT_EXIST|EXPIRED_ACCESS|ACCESS_DENIED_BY_ASPSP/.test(code)) return fail('CONSENT_EXPIRED', MESSAGES.CONSENT_EXPIRED, 409);
  if (/RATE_LIMIT/.test(code) || status === 429) return fail('RATE_LIMITED', MESSAGES.RATE_LIMITED, 429);
  if (/EXPIRED_AUTHORIZATION_CODE|ALREADY_AUTHORIZED|AUTHORIZATION_NOT_ACCEPTED|UNAUTHORIZED_ACCESS/.test(code)) return fail('AUTH', MESSAGES.AUTH, 400);
  if (/ASPSP_NOT_FOUND|WRONG_ASPSP_PROVIDED/.test(code)) return fail('NOT_SUPPORTED', MESSAGES.NOT_SUPPORTED, 404);
  if (status === 401 || status === 403 || /JWT|INVALID_APPLICATION|APPLICATION/.test(code)) return fail('NOT_CONFIGURED', MESSAGES.APP_KEY, 409);
  if (/WRONG_TRANSACTIONS_PERIOD|WRONG_DATE/.test(code)) return Object.assign(fail('BAD_RESPONSE', MESSAGES.BAD_RESPONSE, 502), { period: true });
  if (status >= 500 || /ASPSP_ERROR|ASPSP_TIMEOUT/.test(code)) return fail('NETWORK', MESSAGES.NETWORK, 502);
  return fail('BAD_RESPONSE', MESSAGES.BAD_RESPONSE, 502);
}

/** A signed client for one app. call(method, path, {query, body}) -> json. */
export function ebClient(ctx, app) {
  if (!app || !app.appId || !app.pem) throw fail('NOT_CONFIGURED', MESSAGES.NOT_CONFIGURED, 409);
  let jwt = null, jwtExp = 0;
  const token = () => {
    const t = nowMs(ctx);
    if (!jwt || t > jwtExp - 5 * 60 * 1000) { jwt = signJwt({ appId: app.appId, pem: app.pem, now: t }); jwtExp = t + JWT_TTL_S * 1000; }
    return jwt;
  };
  return {
    async call(method, path, { query, body } = {}) {
      const url = new URL(EB_BASE + path);
      for (const [k, v] of Object.entries(query || {})) if (v != null && v !== '') url.searchParams.set(k, String(v));
      const req = {
        method, url: url.toString(),
        headers: { Authorization: `Bearer ${token()}` },
        ...(body ? { body } : {}),
      };
      const res = await httpRequest(ctx, req);
      if (!res || res.status < 200 || res.status >= 300) throw mapEbError(res && res.status, res && res.json);
      if (!isObj(res.json)) throw fail('BAD_RESPONSE', MESSAGES.BAD_RESPONSE, 502);
      return res.json;
    },
  };
}

// ─── Per data folder runtime (pending sign-ins, bank list cache) ─────────
const RUNTIME = new Map();
function runtime(ctx) {
  if (ctx && ctx.mem && typeof ctx.mem === 'object') {          // the core's per-provider memory
    if (!ctx.mem.eb) ctx.mem.eb = { pending: new Map(), results: new Map(), banks: new Map() };
    return ctx.mem.eb;
  }
  const key = resolve((ctx && ctx.dataDir) || '.');
  if (!RUNTIME.has(key)) RUNTIME.set(key, { pending: new Map(), results: new Map(), banks: new Map() });
  return RUNTIME.get(key);
}
/** Tests: forget pending states and caches. */
export function _reset() { RUNTIME.clear(); }

async function readApp(ctx) {
  const a = await secretsOf(ctx).read('eb-app');
  if (!(a && a.appId && a.pem)) return null;
  // Fake mode keeps its apps in memory: a saved app is registered again after a restart.
  if (ctx.fake && typeof ctx.fake.registerApp === 'function' && ctx.fake.autoRegister) {
    try { ctx.fake.registerApp(a.appId, createPublicKey(a.pem)); } catch { /* an unreadable key fails its first call */ }
  }
  return a;
}

// ─── App (step 1) ────────────────────────────────────────────────────────
/** {appId, pem} -> tests it with GET /application, then saves it. */
export async function saveApp(ctx, input = {}) {
  const appId = checkAppId(input.appId);
  const pem = checkPem(input.pem);
  if (ctx.fake && typeof ctx.fake.registerApp === 'function' && ctx.fake.autoRegister) ctx.fake.registerApp(appId, createPublicKey(pem));
  const t0 = nowMs(ctx);
  const info = await ebClient(ctx, { appId, pem }).call('GET', '/application');
  await secretsOf(ctx).write('eb-app', { appId, pem, savedAt: new Date(nowMs(ctx)).toISOString() });
  runtime(ctx).banks.clear();
  logOf(ctx)('info', `fin-connect ${ID} app saved ${nowMs(ctx) - t0}ms`);
  return { ok: true, app: appInfo(info, appId) };
}

/** The page's view of GET /application: no key, a masked id, which returns are registered. */
export function appInfo(info, appId) {
  const urls = Array.isArray(info && info.redirect_urls) ? info.redirect_urls.map(String) : [];
  const env = String((info && info.environment) || '').toUpperCase();
  return {
    configured: true,
    appIdMasked: appId ? '••••' + appId.slice(-4) : null,
    name: cleanText(info && info.name, 60) || null,
    environment: env === 'SANDBOX' ? 'sandbox' : 'production',
    active: !!(info && info.active),
    // Restricted = production without a contract: only accounts the user linked in the Control Panel.
    restricted: env !== 'SANDBOX' && !(info && info.restricted === false),
    redirects: { bounce: urls.includes(BOUNCE_URL), paste: urls.includes(PASTE_URL) },
  };
}

/** Provider-level facts for the catalogue (no network): is an app saved, its masked id. */
export async function info(ctx) {
  const app = await readApp(ctx).catch(() => null);
  return { configured: !!app, appIdMasked: app ? '••••' + String(app.appId).slice(-4) : null, ebRedirect: ebRedirectMode(ctx) };
}

/** 'bounce' (the GitHub Pages return page) or 'paste' (copy the address back); config.finance.ebRedirect. */
export function ebRedirectMode(ctx) {
  const cfg = (ctx && typeof ctx.getConfig === 'function' && ctx.getConfig()) || {};
  return cfg.finance && cfg.finance.ebRedirect === 'bounce' ? 'bounce' : 'paste';
}

/** Re-check the saved app (the "Check again" button after activating it). */
export async function checkApp(ctx) {
  const app = await readApp(ctx);
  if (!app) return { configured: false };
  const info = await ebClient(ctx, app).call('GET', '/application');
  return appInfo(info, app.appId);
}

export async function removeApp(ctx) {
  await secretsOf(ctx).remove('eb-app');
  runtime(ctx).banks.clear();
  return { ok: true };
}

// ─── Banks (step 0 / 2) ──────────────────────────────────────────────────
/** One /aspsps entry -> the page's bank. Logos only when https. */
export function bankFromAspsp(a) {
  if (!isObj(a) || typeof a.name !== 'string' || !COUNTRY_RE.test(a.country || '')) return null;
  const secs = Number(a.maximum_consent_validity);
  const logo = typeof a.logo === 'string' && /^https:\/\/[^\s"'<>]+$/.test(a.logo) ? a.logo : null;
  const psu = Array.isArray(a.psu_types) ? a.psu_types.filter(x => x === 'personal' || x === 'business') : ['personal'];
  return {
    name: cleanText(a.name, 80),
    country: a.country,
    beta: a.beta === true,
    maxConsentDays: secs > 0 ? Math.min(MAX_CONSENT_DAYS, Math.floor(secs / 86400)) : null,
    psuTypes: psu.length ? psu : ['personal'],
    ...(logo ? { logo } : {}),
  };
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();

/** Filter + rank by a search text (prefix match first). */
export function searchBanks(list, q) {
  const n = norm(q);
  if (!n) return list.slice();
  return list.map(b => { const t = norm(b.name); const i = t.indexOf(n); return { b, s: i === 0 ? 0 : i > 0 ? 1 : n.split(' ').every(w => t.includes(w)) ? 2 : -1 }; })
    .filter(x => x.s >= 0).sort((a, b) => a.s - b.s || a.b.name.localeCompare(b.b.name)).map(x => x.b);
}

/** The bundled snapshot (src/app/56-fin-eb-banks.js, written by tools/eb-bank-snapshot.mjs). */
export function readSnapshot(file = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'app', '56-fin-eb-banks.js')) {
  // The file is the page's (a JS literal assigned to FIN_EB_BANKS): evaluated alone, with nothing in scope.
  try {
    const box = Object.create(null);
    vm.runInNewContext(readFileSync(file, 'utf8') + '\n;this.__snap = FIN_EB_BANKS;', box, { timeout: 200 });
    const doc = JSON.parse(JSON.stringify(box.__snap));
    return isObj(doc) && isObj(doc.countries) ? doc : null;
  } catch { return null; }
}

/** Banks for a country: live when an app exists (cached 24 h), else the snapshot. */
export async function banks(ctx, { country = 'GB', q = '', psuType } = {}) {
  const cc = String(country || '').toUpperCase();
  if (!COUNTRY_RE.test(cc)) throw fail('BAD_REQUEST', 'Choose a country.');
  const app = await readApp(ctx);
  let list, source, asOf;
  if (app) {
    const rt = runtime(ctx);
    const hit = rt.banks.get(cc);
    if (hit && nowMs(ctx) - hit.at < BANKS_TTL_MS) { list = hit.list; }
    else {
      const t0 = nowMs(ctx);
      const r = await ebClient(ctx, app).call('GET', '/aspsps', { query: { country: cc } });
      list = (Array.isArray(r.aspsps) ? r.aspsps : []).map(bankFromAspsp).filter(Boolean).filter(b => b.country === cc);
      rt.banks.set(cc, { at: nowMs(ctx), list });
      logOf(ctx)('info', `fin-connect ${ID} banks ${cc} ${list.length} ${nowMs(ctx) - t0}ms`);
    }
    source = 'live'; asOf = new Date((runtime(ctx).banks.get(cc) || {}).at || nowMs(ctx)).toISOString();
  } else {
    const snap = ctx.snapshot !== undefined ? ctx.snapshot : readSnapshot();
    const names = snap && Array.isArray(snap.countries[cc]) ? snap.countries[cc] : [];
    // Snapshot entries: a name, or {name, beta?, maxConsentDays?} (tools/eb-bank-snapshot.mjs).
    list = names.map(x => {
      const name = cleanText(typeof x === 'string' ? x : x && x.name, 80);
      if (!name) return null;
      const days = isObj(x) && Number(x.maxConsentDays) > 0 ? Math.min(MAX_CONSENT_DAYS, Math.floor(Number(x.maxConsentDays))) : null;
      return { name, country: cc, beta: isObj(x) && x.beta === true, maxConsentDays: days, psuTypes: ['personal'] };
    }).filter(Boolean);
    source = 'snapshot'; asOf = (snap && snap.asOf) || null;
  }
  if (psuType === 'personal' || psuType === 'business') list = list.filter(b => b.psuTypes.includes(psuType));
  return { country: cc, source, asOf, total: list.length, banks: searchBanks(list, q).slice(0, 200) };
}

/** Providers OpenDash connects directly: these never go through Enable Banking. */
export function directAlternative(name) {
  const n = norm(name);
  if (/\bmonzo\b/.test(n)) return 'monzo';
  if (/\bplasma\b/.test(n)) return 'plasma';
  return null;
}

// ─── Sign-in (step 3) ────────────────────────────────────────────────────
function prunePending(rt, now) {
  for (const [k, v] of rt.pending) if (now - v.at > STATE_TTL_MS) rt.pending.delete(k);
  for (const [k, v] of rt.results) if (now - v.at > STATE_TTL_MS * 3) rt.results.delete(k);
}

/** `<port>.<random>`: the bounce page reads the port from it (1024-65535 only). */
export function makeState(port) {
  const p = Number(port);
  if (!Number.isInteger(p) || p < 1024 || p > 65535) throw new Error('bad port');
  return `${p}.${b64url(randomBytes(32))}`;
}
export function portFromState(state) {
  const m = STATE_RE.exec(String(state || ''));
  if (!m) return null;
  const p = Number(m[1]);
  return p >= 1024 && p <= 65535 ? p : null;
}

/**
 * Start a bank sign-in: {bank, country, psuType, sourceId?, port, redirect:
 * 'bounce'|'paste'|<fake url>} -> {url, state, validUntil}. sourceId = sign in
 * again for an existing source (same bank).
 */
export async function start(ctx, input = {}) {
  const app = await readApp(ctx);
  if (!app) throw fail('NOT_CONFIGURED', MESSAGES.NOT_CONFIGURED, 409);
  const rt = runtime(ctx);
  const now = nowMs(ctx);
  prunePending(rt, now);
  if (rt.pending.size >= MAX_PENDING) throw fail('RATE_LIMITED', 'Too many bank sign-ins are waiting. Finish or close one, then try again.', 429);
  let bankName = cleanText(input.bank, 80), cc = String(input.country || '').toUpperCase();
  let psuType = input.psuType === 'business' ? 'business' : 'personal';
  let sourceId = null;
  if (input.sourceId != null) {
    if (!SOURCE_ID_RE.test(String(input.sourceId))) throw fail('BAD_REQUEST', 'Unknown connection.');
    const sess = await secretsOf(ctx).read(`eb-${input.sourceId}`);
    if (!sess || !isObj(sess.aspsp)) throw fail('BAD_REQUEST', 'Unknown connection.');
    sourceId = String(input.sourceId); bankName = sess.aspsp.name; cc = sess.aspsp.country; psuType = sess.psuType || psuType;
  }
  if (!bankName || !COUNTRY_RE.test(cc)) throw fail('BAD_REQUEST', 'Choose your bank first.');
  if (directAlternative(bankName)) throw fail('NOT_SUPPORTED', 'Connect that one directly instead (it has its own card on this page).', 400);
  const { banks: list } = await banks(ctx, { country: cc, q: '' });
  const bank = list.find(b => b.name === bankName);
  if (!bank) throw fail('NOT_SUPPORTED', MESSAGES.NOT_SUPPORTED, 404);
  if (!bank.psuTypes.includes(psuType)) psuType = bank.psuTypes[0];
  const redirectUrl = input.redirect === 'paste' ? PASTE_URL
    : input.redirect === 'bounce' || input.redirect == null ? BOUNCE_URL
    : (ctx.fake && typeof input.redirect === 'string' && /^http:\/\/localhost:\d{4,5}\/api\/fin-connect\/eb\/[a-z-]+$/.test(input.redirect)) ? input.redirect
    : null;
  if (!redirectUrl) throw fail('BAD_REQUEST', 'Unknown return address.');
  const state = makeState(input.port || ctx.port);
  const validUntil = consentEnd(bank.maxConsentDays ? bank.maxConsentDays * 86400 : null, now);
  const r = await ebClient(ctx, app).call('POST', '/auth', {
    body: { access: { valid_until: validUntil }, aspsp: { name: bank.name, country: cc }, state, redirect_url: redirectUrl, psu_type: psuType },
  });
  if (typeof r.url !== 'string' || !/^https:\/\//.test(r.url) && !(ctx.fake && /^http:\/\/localhost:\d+\//.test(r.url))) throw fail('BAD_RESPONSE', MESSAGES.BAD_RESPONSE, 502);
  rt.pending.set(state, { at: now, bank: bank.name, country: cc, psuType, sourceId, validUntil, maxConsentDays: bank.maxConsentDays });
  logOf(ctx)('info', `fin-connect ${ID} start ${redirectUrl === PASTE_URL ? 'paste' : 'bounce'}`);
  return { url: r.url, state, validUntil, bank: bank.name };
}

/** Where the sign-in for this state stands (the sheet's "Waiting for <bank>..."). */
export function pendingStatus(ctx, state) {
  const rt = runtime(ctx);
  prunePending(rt, nowMs(ctx));
  const done = rt.results.get(String(state || ''));
  if (done) return done.result;
  if (rt.pending.has(String(state || ''))) return { status: 'waiting', bank: rt.pending.get(state).bank };
  return { status: 'unknown' };
}

/**
 * The bank sent the user back: {code, state, error} -> session -> source.
 * The state is one-use and must be ours and fresh.
 */
export async function callback(ctx, query = {}) {
  const q = query instanceof URLSearchParams ? Object.fromEntries(query) : (query || {});
  const state = String(q.state || '');
  const rt = runtime(ctx);
  const now = nowMs(ctx);
  prunePending(rt, now);
  const p = rt.pending.get(state);
  if (!p) throw fail('AUTH', 'This bank sign-in was not started from OpenDash, or it has expired. Start it again from Connections.', 400);
  rt.pending.delete(state);                                   // one use, whatever happens next
  const done = (result) => { rt.results.set(state, { at: now, result }); return result; };
  try {
    if (q.error) throw fail('AUTH', 'The bank sign-in was cancelled or refused. You can try again.', 400);
    const code = String(q.code || '');
    if (!/^[A-Za-z0-9._~-]{4,512}$/.test(code)) throw fail('AUTH', MESSAGES.AUTH, 400);
    const app = await readApp(ctx);
    if (!app) throw fail('NOT_CONFIGURED', MESSAGES.NOT_CONFIGURED, 409);
    const s = await ebClient(ctx, app).call('POST', '/sessions', { body: { code } });
    if (typeof s.session_id !== 'string' || !PATH_ID_RE.test(s.session_id)) throw fail('BAD_RESPONSE', MESSAGES.BAD_RESPONSE, 502);
    const accounts = (Array.isArray(s.accounts) ? s.accounts : []).map(accountFromSession).filter(Boolean)
      .filter((x, i, all) => all.findIndex(y => y.id === x.id) === i).slice(0, 40);
    const validUntil = (isObj(s.access) && !Number.isNaN(Date.parse(s.access.valid_until || '')) && s.access.valid_until) || p.validUntil;
    const aspsp = { name: (isObj(s.aspsp) && cleanText(s.aspsp.name, 80)) || p.bank, country: (isObj(s.aspsp) && COUNTRY_RE.test(s.aspsp.country || '') && s.aspsp.country) || p.country };
    const source = await saveSession(ctx, { sourceId: p.sourceId, sessionId: s.session_id, validUntil, aspsp, psuType: p.psuType, accounts });
    logOf(ctx)('info', `fin-connect ${ID} connected ${accounts.length} account(s)`);
    return done({ status: 'done', sourceId: source.id, bank: aspsp.name, accounts: source.accounts.map(publicAccount), reauthDue: source.reauthDue, source, next: 'sync' });
  } catch (e) {
    const err = e instanceof FinConnectError ? e : fail('BAD_RESPONSE', MESSAGES.BAD_RESPONSE, 502);
    done({ status: 'error', code: err.code, message: err.message, bank: p.bank });
    throw err;
  }
}

/**
 * The paste-the-address return (2.3.1 B): only
 * https://localhost/opendash-eb-callback?... is accepted.
 */
export function parsePastedUrl(text) {
  const t = String(text == null ? '' : text).trim();
  if (t.length > 4096) throw fail('BAD_REQUEST', 'That is not the address OpenDash is waiting for.');
  let u;
  try { u = new URL(t); } catch { throw fail('BAD_REQUEST', 'Paste the whole address from that tab (it starts with https://localhost/).'); }
  if (u.protocol !== 'https:' || u.hostname !== 'localhost' || u.port !== '' || u.pathname !== '/opendash-eb-callback' || u.username || u.password) {
    throw fail('BAD_REQUEST', 'That is not the address OpenDash is waiting for. It starts with https://localhost/opendash-eb-callback.');
  }
  return { code: u.searchParams.get('code') || '', state: u.searchParams.get('state') || '', error: u.searchParams.get('error') || '' };
}
export async function finishFromUrl(ctx, { url } = {}) { return callback(ctx, parsePastedUrl(url)); }

// ─── Sources ─────────────────────────────────────────────────────────────
/** Source store: ctx.sources {get, upsert, remove} from the core, else sources.json directly. */
function sourcesOf(ctx) {
  if (ctx.svc && typeof ctx.svc.createSource === 'function') {
    const svc = ctx.svc;
    return {
      get: (id) => svc.getSource(id),
      create: (src) => svc.createSource(src),
      update: (id, fn) => svc.updateSource(id, fn),
      remove: (id) => svc.removeSource(id),
    };
  }
  if (ctx.sources && typeof ctx.sources.create === 'function') return ctx.sources;
  const load = () => import('../sources.mjs');
  return {
    async get(id) { const { readSourcesFile } = await load(); const d = await readSourcesFile(ctx.dataDir); return d ? d.sources.find(s => s.id === id) || null : null; },
    async list() { const { readSourcesFile } = await load(); const d = await readSourcesFile(ctx.dataDir); return d ? d.sources : []; },
    async create(input) {
      const { mutateSources } = await load();
      const src = { id: newSourceIdFor(input.label), capability: 'bank', kind: 'direct', enabled: true, colour: 'teal', lastSync: null, lastError: null, createdAt: new Date(nowMs(ctx)).toISOString(), ...input };
      return mutateSources(ctx.dataDir, (list) => { list.push(src); return src; });
    },
    async update(id, fn) {
      const { mutateSources } = await load();
      return mutateSources(ctx.dataDir, (list) => { const s = list.find(x => x.id === id); if (s) fn(s); return s || null; });
    },
  };
}

export const publicAccount = (a) => ({ id: a.id, name: a.name, kind: a.kind || 'current', ...(a.mask ? { mask: a.mask } : {}), ...(a.currency ? { currency: a.currency } : {}), enabled: a.enabled !== false });

export function newSourceIdFor(bankName, rand = randomBytes(2).toString('hex')) {
  const slug = norm(bankName).replace(/ /g, '-').slice(0, 20).replace(/-+$/, '') || 'bank';
  return `bank-eb-${slug}-${rand}`;
}

/** Store the session secret and create / update the source. Re-auth keeps the user's account choices. */
async function saveSession(ctx, { sourceId, sessionId, validUntil, aspsp, psuType, accounts }) {
  const store = sourcesOf(ctx);
  const sec = secretsOf(ctx);
  const nowIso = new Date(nowMs(ctx)).toISOString();
  const reauthDue = isoDay(Date.parse(validUntil));
  // The session's own account uids stay in the secret; the source keeps our stable ids.
  const uids = Object.fromEntries(accounts.map(x => [x.id, x.uid]));
  const plain = accounts.map(({ uid, ...x }) => x);
  const secret = { sessionId, validUntil, aspsp, psuType, uids, createdAt: nowIso };
  const sessionHash = shortHash(sessionId, 16);
  const existing = sourceId ? await store.get(sourceId) : null;
  if (existing) {
    const old = await sec.read(`eb-${existing.id}`).catch(() => null);
    await sec.write(`eb-${existing.id}`, secret);
    const src = await store.update(existing.id, (s) => {
      const byId = new Map((s.accounts || []).map(x => [x.id, x]));
      const next = plain.map(x => (byId.has(x.id) ? { ...x, ...pick(byId.get(x.id), ['name', 'colour', 'enabled', 'own', 'renamed', 'hiddenReason', 'duplicateOf', 'dupChoice']) } : x));
      // An account the bank no longer shares stays listed (its past rows are still there); it just stops updating.
      for (const x of s.accounts || []) if (!next.some(y => y.id === x.id)) next.push(x);
      s.accounts = next; s.reauthDue = reauthDue; s.sessionHash = sessionHash; s.lastError = null;
    });
    if (old && old.sessionId && old.sessionId !== sessionId) await deleteSession(ctx, old.sessionId).catch(() => {});
    return src;
  }
  // A source without its session secret would only ask for a new sign-in; if the write fails it is removed.
  // extra.bankName / extra.country: public facts the page uses for "Sign in again" (the session itself stays secret).
  const src = await store.create({ provider: ID, label: cleanText(aspsp.name, 60) || 'Bank', accounts: plain, reauthDue, sessionHash, setup: true,
    extra: { bankName: cleanText(aspsp.name, 80), country: aspsp.country } });
  try { await sec.write(`eb-${src.id}`, secret); }
  catch (e) { if (store.remove) await store.remove(src.id).catch(() => {}); throw e; }
  // Set up: the session is saved, so the finance update may now read it (it skips sources still in setup).
  return (await store.update(src.id, (s) => { delete s.setup; })) || src;
}
const pick = (o, keys) => Object.fromEntries(keys.filter(k => o[k] !== undefined).map(k => [k, o[k]]));

async function deleteSession(ctx, sessionId) {
  if (!PATH_ID_RE.test(String(sessionId))) return;
  const app = await readApp(ctx);
  if (!app) return;
  await ebClient(ctx, app).call('DELETE', `/sessions/${sessionId}`);
}

async function sessionOf(ctx, source) {
  if (!source || !SOURCE_ID_RE.test(String(source.id))) throw fail('BAD_REQUEST', 'Unknown connection.');
  const s = await secretsOf(ctx).read(`eb-${source.id}`);
  if (!s || !PATH_ID_RE.test(String(s.sessionId || ''))) throw fail('CONSENT_EXPIRED', MESSAGES.CONSENT_EXPIRED, 409);
  return s;
}

// ─── Provider interface (section 3.2) ────────────────────────────────────
/** {configured, connected, needsAuth, reauthDue, daysLeft, dueLevel, message} for one source (or the app when no source). */
export async function status(ctx, source) {
  const app = await readApp(ctx).catch(() => null);
  if (!source) return { configured: !!app, connected: false, needsAuth: false, reauthDue: null, message: app ? null : MESSAGES.NOT_CONFIGURED };
  const s = await secretsOf(ctx).read(`eb-${source.id}`).catch(() => null);
  const due = consentDue(s && s.validUntil, nowMs(ctx));
  const authErr = source.lastError && /CONSENT_EXPIRED|AUTH|APP_KEY/.test(source.lastError.code || '')
    && Date.parse(source.lastError.at || '') >= (Date.parse(source.lastSync || '') || 0);
  const needsAuth = !app || !s || due.level === 'expired' || !!authErr;
  const bank = (s && s.aspsp && s.aspsp.name) || source.label || 'your bank';
  const message = !app ? MESSAGES.NOT_CONFIGURED
    : needsAuth ? `Sign in to ${bank} again to keep syncing.`
    : due.level === 'urgent' || due.level === 'soon' ? `Sign in to ${bank} again by ${due.reauthDue}.` : null;
  return { configured: !!app, connected: !needsAuth, needsAuth, reauthDue: due.reauthDue, daysLeft: due.daysLeft, dueLevel: due.level, message };
}

/** "Connect": nothing to do without a bank choice; the wizard calls start(). */
export async function connect(ctx, input = {}) { return start(ctx, input); }

/** Check the session is still authorised (GET /sessions/{id}). Throws CONSENT_EXPIRED otherwise. */
export async function refresh(ctx, source) {
  const s = await sessionOf(ctx, source);
  if (consentDue(s.validUntil, nowMs(ctx)).level === 'expired') throw fail('CONSENT_EXPIRED', MESSAGES.CONSENT_EXPIRED, 409);
  const app = await readApp(ctx);
  if (!app) throw fail('NOT_CONFIGURED', MESSAGES.NOT_CONFIGURED, 409);
  const r = await ebClient(ctx, app).call('GET', `/sessions/${s.sessionId}`);
  if (r.status && String(r.status).toUpperCase() !== 'AUTHORIZED') throw fail('CONSENT_EXPIRED', MESSAGES.CONSENT_EXPIRED, 409);
  return { ok: true };
}

export async function listAccounts(ctx, source) {
  return (source && Array.isArray(source.accounts) ? source.accounts : []).map(publicAccount);
}

/** Pick the balance banks mean by "balance": booked/closing first, then available, then expected. */
export function pickBalance(list) {
  const order = ['CLBD', 'ITBD', 'ITAV', 'CLAV', 'XPCD', 'OPBD', 'PRCD', 'OTHR', 'INFO'];
  const arr = (Array.isArray(list) ? list : []).filter(b => isObj(b) && isObj(b.balance_amount) && toPence(b.balance_amount.amount) != null);
  arr.sort((a, b) => ((order.indexOf(a.balance_type) + 1 || 99) - (order.indexOf(b.balance_type) + 1 || 99)));
  const b = arr[0];
  if (!b) return null;
  const neg = /^-/.test(String(b.balance_amount.amount).trim());
  const pence = toPence(b.balance_amount.amount) * (neg ? -1 : 1);
  return { pence, currency: String(b.balance_amount.currency || '').toUpperCase(), asOf: (b.reference_date || b.last_change_date_time || '').slice(0, 10) || null };
}

/** The automatic-update budget (4 a day per account); `manual` always passes. */
export function budgetCheck(cursor, { day, manual = false } = {}) {
  const used = cursor && isObj(cursor.auto) && cursor.auto.day === day ? Number(cursor.auto.count) || 0 : 0;
  return { ok: manual || used < AUTO_UPDATES_PER_DAY, used, left: Math.max(0, AUTO_UPDATES_PER_DAY - used) };
}

/**
 * Read balances and new transactions for every enabled account.
 * opts: {cursor, manual, from, to, accountOn(id)}. cursor = {accounts:{uid:{date}}, auto:{day,count}}.
 * Returns {rows:[{accountId, tx}], balances, accounts, cursor, warning?, skipped?}.
 */
export async function fetch(ctx, source, opts = {}) {
  const t0 = nowMs(ctx);
  const today = isoDay(t0);
  const cursor = isObj(opts.cursor) ? JSON.parse(JSON.stringify(opts.cursor)) : {};
  cursor.accounts = isObj(cursor.accounts) ? cursor.accounts : {};
  const manual = opts.manual === true || opts.full === true;   // Sync now / a first import: always allowed
  const budget = budgetCheck(cursor, { day: today, manual });
  if (!budget.ok) return { rows: [], balances: [], accounts: await listAccounts(ctx, source), cursor, skipped: true, warning: MESSAGES.BUDGET };
  const s = await sessionOf(ctx, source);
  if (consentDue(s.validUntil, t0).level === 'expired') throw fail('CONSENT_EXPIRED', MESSAGES.CONSENT_EXPIRED, 409);
  const app = await readApp(ctx);
  if (!app) throw fail('NOT_CONFIGURED', MESSAGES.NOT_CONFIGURED, 409);
  const client = ebClient(ctx, app);
  const on = typeof opts.accountOn === 'function' ? (a) => opts.accountOn(a.id) : (a) => a.enabled !== false;
  // Our stable account id -> this session's uid (accounts the bank no longer shares are skipped).
  const uidOf = (id) => String((isObj(s.uids) ? s.uids[id] : null) || '');
  const accounts = (source.accounts || []).filter(a => PATH_ID_RE.test(uidOf(a.id)));
  const rows = [], balances = [];
  let pages = 0;
  for (const acc of accounts) {
    if (!on(acc)) continue;
    const bal = await client.call('GET', `/accounts/${uidOf(acc.id)}/balances`);
    const b = pickBalance(bal.balances);
    if (b) balances.push({ accountId: acc.id, name: acc.name, balance: b.pence / 100, currency: b.currency || acc.currency || null, asOf: b.asOf || today });
    const last = cursor.accounts[acc.id] && cursor.accounts[acc.id].date;
    let from = opts.from || (isIsoDate(last) ? isoDay(Date.parse(last) - OVERLAP_DAYS * DAY_MS) : isoDay(t0 - FIRST_IMPORT_DAYS * DAY_MS));
    const to = opts.to || null;
    let key = null, newest = isIsoDate(last) ? last : null, retried = false;
    for (;;) {
      let r;
      try {
        r = await client.call('GET', `/accounts/${uidOf(acc.id)}/transactions`, { query: key ? { continuation_key: key } : { date_from: from, ...(to ? { date_to: to } : {}) } });
      } catch (e) {
        // Some banks refuse a long first period: fall back once to about 90 days.
        if (e.period && !retried && !key) { retried = true; from = isoDay(t0 - FALLBACK_DAYS * DAY_MS); continue; }
        throw e;
      }
      for (const tx of Array.isArray(r.transactions) ? r.transactions : []) {
        if (!isObj(tx)) continue;
        rows.push({ accountId: acc.id, ...(acc.currency ? { currency: acc.currency } : {}), tx });
        const d = tx.booking_date || tx.value_date;
        if ((tx.status || 'BOOK') === 'BOOK' && isIsoDate(d) && d <= today && (!newest || d > newest)) newest = d;
      }
      pages++;
      key = typeof r.continuation_key === 'string' && r.continuation_key ? r.continuation_key : null;
      if (!key || pages >= MAX_PAGES * accounts.length) break;
    }
    cursor.accounts[acc.id] = { date: newest || last || null, at: new Date(t0).toISOString() };
  }
  if (!manual) cursor.auto = { day: today, count: budget.used + 1 };
  logOf(ctx)('info', `fin-connect ${ID} fetch ${accounts.length} account(s) ${rows.length} row(s) ${pages} page(s) ${nowMs(ctx) - t0}ms`);
  // reauthDue follows the session (a re-auth elsewhere may have moved it).
  return { rows, balances, accounts: await listAccounts(ctx, source), cursor, sourcePatch: { reauthDue: consentDue(s.validUntil, t0).reauthDue } };
}

const counterpartyName = (p) => (isObj(p) && typeof p.name === 'string' ? p.name : '');

/**
 * One raw EB transaction -> {row: Tx} | {reason} (the core's Tx: signed
 * integer minor units of the transaction's own currency; lib/fin-connect/
 * normalise.mjs then cleans the memo and converts other currencies at that
 * day's rate). The sign comes from credit_debit_indicator only, never from
 * the amount's text. Pending (PDNG) and other non-booked rows are dropped.
 */
export function normalise(raw, ctx = {}) {
  const tx = raw && raw.tx;
  if (!isObj(tx)) return { reason: 'not an object' };
  if ((tx.status || 'BOOK') !== 'BOOK') return { reason: 'pending' };
  const dir = tx.credit_debit_indicator;
  if (dir !== 'CRDT' && dir !== 'DBIT') return { reason: 'no direction' };
  const date = [tx.booking_date, tx.value_date, tx.transaction_date].find(isIsoDate);
  if (!date) return { reason: 'bad date' };
  const amt = isObj(tx.transaction_amount) ? tx.transaction_amount : {};
  const ccy = [amt.currency, raw.currency, ctx.currency, 'GBP'].map(x => String(x || '').toUpperCase()).find(x => /^[A-Z]{3}$/.test(x));
  const minor = toMinor(amt.amount, minorDigits(ccy));
  if (minor == null) return { reason: 'bad amount' };
  const other = counterpartyName(dir === 'DBIT' ? tx.creditor : tx.debtor);
  const remit = Array.isArray(tx.remittance_information) ? tx.remittance_information.filter(x => typeof x === 'string').join(' ') : '';
  const memo = cleanText(other || remit || (typeof tx.note === 'string' ? tx.note : ''), 200).replace(/^[=+@\-\s]+/, '').trim() || '(no description)';
  const ref = typeof tx.entry_reference === 'string' && tx.entry_reference ? tx.entry_reference : typeof tx.transaction_id === 'string' ? tx.transaction_id : '';
  // entry_reference is unique per account, not globally: the account goes into the id.
  const id = ref ? `${raw.accountId}:${cleanText(ref, 60)}` : `${raw.accountId}:h${shortHash([date, dir, amt.amount, ccy, memo].join('|'))}`;
  return { row: { id, accountId: String(raw.accountId), date, minor: dir === 'DBIT' ? -minor : minor, currency: ccy, memo, bc: null, sub: '' } };
}

/** Revoke the session (DELETE /sessions/{id}) where possible, then delete its secret. */
export async function disconnect(ctx, source) {
  const s = await secretsOf(ctx).read(`eb-${source.id}`).catch(() => null);
  if (s && s.sessionId) await deleteSession(ctx, s.sessionId).catch(() => {});
  await secretsOf(ctx).remove(`eb-${source.id}`);
  logOf(ctx)('info', `fin-connect ${ID} disconnected`);
  return { ok: true };
}

// Fake mode (DASHBOARD_ENABLEBANKING_FAKE=1) is loaded by the core (index.mjs FAKES):
// ctx.fake = tests/fixtures/fin-fake-enablebanking.mjs createFake(), whose fetchFn the
// allowlist client uses instead of the network.
export function fakeEnabled(env = process.env) { return env.DASHBOARD_ENABLEBANKING_FAKE === '1'; }


// ─── Routes (mounted by server/routes/fin-connect.mjs: provider.routes(app, ctx)) ─
//   PUT    /api/fin-connect/eb/app        {appId, pem} -> {ok, app}
//   GET    /api/fin-connect/eb/app        -> {configured, appIdMasked, environment, active, restricted, redirects}
//   DELETE /api/fin-connect/eb/app        -> {ok}  (the key file is deleted; connected banks stop syncing)
//   GET    /api/fin-connect/eb/banks?country=&q=&psuType= -> {country, source:'live'|'snapshot', asOf, total, banks}
//   POST   /api/fin-connect/eb/start      {bank, country, psuType?, sourceId?, redirect?:'bounce'|'paste'} -> {url, state, validUntil, bank}
//   GET    /api/fin-connect/eb/pending?state= -> {status:'waiting'|'done'|'error'|'unknown', ...}
//   GET    /api/fin-connect/eb/callback   (crossSite: the bounce page's navigation; state-protected, one use)
//   POST   /api/fin-connect/eb/finish     {url} -> the paste-the-address return
//   Fake mode only: GET eb/fake-bank (the fake bank's sign-in page), GET eb/fake-bounce (docs/eb-callback.html served locally)
export function routes(app, svc, helpers = {}) {
  const base = '/api/fin-connect/eb';
  // The core's ctx for this provider (secrets, allowlist client, fake, memory, sources), with this request's port.
  const ctxFor = async (c) => {
    if (svc && typeof svc.ready === 'function') await svc.ready();
    const ctx = svc.ctxFor(ID);
    const port = c.port || ctx.port;
    if (ctx.fake && typeof ctx.fake.configure === 'function') ctx.fake.configure({ bankBase: `http://localhost:${port}${base}/fake-bank` });
    return { ...ctx, port, currency: ctx.home || 'GBP' };
  };
  // After a new bank is linked: its first update (full history), in the background.
  const afterConnect = (source) => {
    if (source && svc && typeof svc.requestSync === 'function') svc.requestSync(source.id, { waitMs: 120000, full: true }).catch(() => {});
  };
  const wrap = (fn) => async (c) => {
    try { return await fn(c, await ctxFor(c)); }
    catch (e) {
      if (e instanceof FinConnectError) return c.json(e.status || 400, e.toJSON());
      if (e && /JSON/.test(e.message || '')) return c.json(400, { error: 'The request was not valid.', code: 'BAD_REQUEST' });
      if (e && e.status) return c.json(e.status, { error: 'The request was not valid.', code: 'BAD_REQUEST' });
      (app.ctx.log || (() => {}))('warn', `fin-connect ${ID} failed: ${(e && e.code) || 'error'}`);
      return c.json(500, { error: 'Something went wrong with Enable Banking. Try again.', code: 'FAILED' });
    }
  };
  const page = (c, title, body, code = 200) => c.send(code,
    '<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width">'
    + `<title>${escHtml(title)}</title><body style="font:16px system-ui;padding:3rem;max-width:34rem;margin:auto;color-scheme:light dark">${body}</body>`,
    'text/html; charset=utf-8', { 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });

  app.route({ path: `${base}/app`, method: 'PUT', maxBody: 32 * 1024, methodError: 'GET, PUT or DELETE only',
    handler: wrap(async (c, ctx) => { const b = await c.body(); return saveApp(ctx, { appId: b.appId, pem: b.pem }); }) });
  app.route({ path: `${base}/app`, method: 'GET', methodError: 'GET, PUT or DELETE only',
    handler: wrap(async (c, ctx) => checkApp(ctx)) });
  app.route({ path: `${base}/app`, method: 'DELETE', methodError: 'GET, PUT or DELETE only',
    handler: wrap(async (c, ctx) => removeApp(ctx)) });
  app.route({ path: `${base}/banks`, method: 'GET',
    handler: wrap(async (c, ctx) => {
      const q = String(c.query.get('q') || '').slice(0, 80);
      const out = await banks(ctx, { country: c.query.get('country') || 'GB', q, psuType: c.query.get('psuType') || undefined });
      const alt = directAlternative(q);
      return alt ? { ...out, direct: alt } : out;
    }) });
  app.route({ path: `${base}/start`, method: 'POST', methodError: 'POST only',
    handler: wrap(async (c, ctx) => {
      const b = await c.body();
      let redirect = b.redirect === 'paste' || b.redirect === 'bounce' ? b.redirect : ebRedirectMode(ctx);
      // Fake mode: the bounce page is served locally, so the whole round trip stays on this computer.
      if (ctx.fake && redirect === 'bounce') redirect = `http://localhost:${ctx.port}${base}/fake-bounce`;
      return start(ctx, { bank: b.bank, country: b.country, psuType: b.psuType, sourceId: b.sourceId, redirect, port: ctx.port });
    }) });
  app.route({ path: `${base}/pending`, method: 'GET', quiet: true,
    handler: wrap(async (c, ctx) => { const r = pendingStatus(ctx, c.query.get('state')); const { source, ...rest } = r; return rest; }) });
  app.route({ path: `${base}/finish`, method: 'POST', methodError: 'POST only',
    handler: wrap(async (c, ctx) => { const b = await c.body(); const { source, ...rest } = await finishFromUrl(ctx, { url: b.url }); afterConnect(source); return rest; }) });
  app.route({ path: `${base}/callback`, method: 'GET', crossSite: true,
    handler: async (c) => {
      const ctx = await ctxFor(c);
      try {
        const r = await callback(ctx, c.query);
        afterConnect(r.source);
        const text = `${r.accounts.length} account${r.accounts.length === 1 ? '' : 's'} found. OpenDash is bringing in your transactions now.`;
        if (typeof helpers.callbackPage === 'function') return helpers.callbackPage(c, { title: `${r.bank} connected`, text, ok: true, close: true });
        return page(c, 'Bank connected', `<h2>${escHtml(r.bank)} connected</h2><p>${escHtml(text)} Close this tab and go back to OpenDash.</p>`);
      } catch (e) {
        const msg = e instanceof FinConnectError ? e.message : 'Something went wrong. Start the bank sign-in again from OpenDash.';
        if (typeof helpers.callbackPage === 'function') return helpers.callbackPage(c, { title: 'Could not connect', text: msg, ok: false, status: 400 });
        return page(c, 'Could not connect', `<h2>Could not connect</h2><p>${escHtml(msg)}</p><p>You can close this tab.</p>`, 400);
      }
    } });

  // ── Fake-only pages ──
  app.route({ path: `${base}/fake-bank`, method: 'GET',
    handler: async (c) => {
      const fake = (await ctxFor(c)).fake;
      if (!fake || typeof fake.authorisation !== 'function') return c.json(404, { error: 'not found' });
      const a = fake.authorisation(c.query.get('auth'));
      if (!a) return page(c, 'Fake bank', '<p>This sign-in has expired.</p>', 400);
      const ok = a.redirect_url + (a.redirect_url.includes('?') ? '&' : '?') + new URLSearchParams({ code: a.code, state: a.state });
      const no = a.redirect_url + '?' + new URLSearchParams({ error: 'access_denied', state: a.state });
      const paste = a.redirect_url === PASTE_URL;
      return page(c, `${a.aspsp.name} (fake)`,
        `<p style="font-size:13px;opacity:.7">FAKE BANK for tests - no real bank is contacted</p><h2>${escHtml(a.aspsp.name)}</h2>`
        + '<p>OpenDash (via Enable Banking) asks to <b>read</b> your accounts, balances and transactions.</p>'
        + (paste
          ? `<p>A real bank would now send you to an address that does not open. Copy it:</p><input id="u" readonly style="width:100%;font:13px monospace;padding:.5rem" value="${escHtml(ok)}"><p><a id="deny" href="#" onclick="document.getElementById('u').value=${escHtml(JSON.stringify(no))};return false">Use the "refused" address instead</a></p>`
          : `<p><a id="approve" href="${escHtml(ok)}" style="display:inline-block;padding:.6rem 1.2rem;background:#0a7;color:#fff;border-radius:8px;text-decoration:none">Allow</a> <a id="deny" href="${escHtml(no)}" style="margin-left:1rem">Cancel</a></p>`));
    } });
  app.route({ path: `${base}/fake-bounce`, method: 'GET',
    handler: async (c) => {
      if (!(await ctxFor(c)).fake) return c.json(404, { error: 'not found' });
      const html = await fsp.readFile(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'docs', 'eb-callback.html'), 'utf8');
      return c.send(200, html, 'text/html; charset=utf-8', { 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store' });
    } });
}

const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

// ─── Default export: the provider object (section 3.2) ───────────────────
const provider = defineProvider({
  id: ID, label: 'Enable Banking', readOnly: true, allow,
  status, connect, callback, refresh, listAccounts, fetch, normalise, disconnect, routes,
  // extras the routes / UI / core use
  info, saveApp, checkApp, removeApp, banks, start, finishFromUrl, pendingStatus,
});
export default provider;
