// lib/fin-connect/monzo.mjs - Monzo, read directly (no Claude), read-only.
// Design: docs/dev/FINANCE_CONNECTIONS.md 2.2 and 3.2. Monzo's API docs, read 8 Oct 2026:
//   - OAuth with the user's OWN developer client (developers.monzo.com):
//     https://auth.monzo.com/?client_id&redirect_uri&response_type=code&state,
//     code exchange POST https://api.monzo.com/oauth2/token (with client_secret);
//   - only "Confidential" clients get a refresh token; refreshing is one-time
//     (the old refresh token dies), so the new pair is written BEFORE use;
//   - one active access token per user (signing in again replaces the old one);
//   - a new token can read nothing until the user approves in the Monzo app;
//     for 5 minutes after approval every transaction can be read, after that
//     only the last 90 days;
//   - GET /accounts, /balance, /pots, /transactions (limit <= 100, since = an
//     id or a time, expand[]=merchant). Personal use only.
//
// Flow: PUT client -> GET connect (302 to Monzo) -> GET callback (code
// exchange; then the server polls GET /accounts every few seconds until the
// app approval arrives) -> on approval the WHOLE history is downloaded at once,
// inside the 5-minute window, kept in memory, and handed to a finance update
// for this source only -> GET approval tells the page how it is going:
// idle | waiting | importing | done | expired (approved, but the window closed
// first: connected with the last 90 days; "Get full history" signs in again) |
// error (code NOT_APPROVED: never approved in the app; AUTH; BUSY...).
//
// Secrets: <data>/secrets/fin/monzo-<sourceId>.json {clientId, clientSecret,
// accessToken, refreshToken, expiresAt, userId, approvedAt, needsAuth, noRefresh}.
// The page sees configured / connected / a masked client id only.
// Never: pots deposit/withdraw, feed items, transaction annotations,
// attachments, receipts or webhooks (not on the allowlist; tested).

import { randomBytes, createHash } from 'node:crypto';
import { FinError, defineProvider } from './provider.mjs';
import { maskId } from './secrets.mjs';
import { cleanMemo } from './normalise.mjs';

const API = 'https://api.monzo.com';
const AUTH_URL = 'https://auth.monzo.com/';
const HOST = 'api.monzo.com';
const WINDOW_MS = 5 * 60 * 1000;          // Monzo's full-history window after approval
const SAFETY_MS = 15 * 1000;               // stop paging old history this long before it closes
const APPROVAL_WAIT_MS = 15 * 60 * 1000;   // how long the server waits for the app approval
const POLL_MS = 3000;
const RECENT_DAYS = 89;                    // "the last 90 days", with a day to spare
const OVERLAP_DAYS = 35;                   // same overlap as the Aureli job
const MAX_PAGES = 600;                     // 60,000 transactions per account
const STATE_TTL_MS = 10 * 60 * 1000;
const CLIENT_RE = /^oauth2client_[A-Za-z0-9]{8,64}$/;
const SECRET_RE = /^[\x21-\x7e]{16,256}$/;
const ACC_RE = /^[A-Za-z0-9_-]{1,64}$/;
const DAY = 86400000;
const secretName = (id) => `monzo-${id}`;
const hash = (s) => createHash('sha256').update('monzo:' + String(s)).digest('hex').slice(0, 24);
const iso = (ms) => new Date(ms).toISOString();

// Monzo's categories -> the finance view's bank category labels.
export const CATEGORY = Object.freeze({
  groceries: 'Groceries', eating_out: 'Eating out', transport: 'Transport', shopping: 'Shopping', bills: 'Bills',
  entertainment: 'Entertainment', holidays: 'Holidays', personal_care: 'Personal care', family: 'Family',
  charity: 'Charity', finances: 'Finances', gifts: 'Gifts', transfers: 'Transfers', savings: 'Savings',
  income: 'Income', cash: 'Cash', expenses: 'Expenses',
});

const allow = [
  { method: 'POST', host: HOST, path: '/oauth2/token', test: (u, b) => !!b && ['authorization_code', 'refresh_token'].includes(b.grant_type) },
  { method: 'POST', host: HOST, path: '/oauth2/logout' },
  { method: 'GET', host: HOST, path: '/ping/whoami' },
  { method: 'GET', host: HOST, path: '/accounts' },
  { method: 'GET', host: HOST, path: '/balance', test: (u) => ACC_RE.test(u.searchParams.get('account_id') || '') },
  { method: 'GET', host: HOST, path: '/pots', test: (u) => ACC_RE.test(u.searchParams.get('current_account_id') || '') },
  { method: 'GET', host: HOST, path: '/transactions', test: (u) => ACC_RE.test(u.searchParams.get('account_id') || '') },
  { method: 'GET', host: HOST, path: /\/transactions\/tx_[A-Za-z0-9]{1,64}/ },
];

// ─── Small helpers ────────────────────────────────────────────────────────
const errText = {
  AUTH: 'Monzo needs you to sign in again.',
  NOT_APPROVED: 'Open the Monzo app and tap Allow access to let OpenDash read your account.',
  RATE_LIMITED: 'Monzo asked OpenDash to slow down. Try again in a few minutes.',
  BAD_RESPONSE: 'Monzo sent an answer OpenDash could not read.',
};
const mem = (c) => {
  if (!c.mem.states) Object.assign(c.mem, { states: new Map(), approvals: new Map(), prefetched: new Map(), refreshing: new Map(), aliases: new Map() });
  return c.mem;
};
const windowMs = (c) => (c.fake && c.fake.settings ? Number(c.fake.settings().windowMs) : WINDOW_MS);
const pollMs = (c) => (c.fake && c.fake.settings ? Number(c.fake.settings().pollMs) || 1000 : POLL_MS);
const redirectFor = (c) => `http://localhost:${c.port}/api/fin-connect/monzo/callback`;
const sleep = (ms) => new Promise(r => { const t = setTimeout(r, ms); t.unref?.(); });

async function readSecret(c, id) { return c.secrets.read(secretName(id)); }

/** One API call with the Monzo error mapping; 429 is retried (Retry-After, at most 3 tries). */
async function api(c, method, path, { token, form, query } = {}) {
  const u = new URL(path, API);
  for (const [k, v] of Object.entries(query || {})) {
    if (Array.isArray(v)) for (const x of v) u.searchParams.append(k, x); else if (v != null) u.searchParams.set(k, v);
  }
  for (let attempt = 1; ; attempt++) {
    const r = await c.http.request(method, u.href, { form, headers: token ? { Authorization: 'Bearer ' + token } : {}, label: 'Monzo' });
    if (r.status === 429 && attempt < 3) {
      const ra = r.headers && r.headers.get ? r.headers.get('retry-after') : null;
      const wait = Math.min(30, Math.max(0, ra != null && ra !== '' && Number.isFinite(Number(ra)) ? Number(ra) : 2 * attempt));
      c.log('warn', `fin-connect monzo rate limited; waiting ${wait}s`);
      await sleep(wait * 1000);
      continue;
    }
    return r;
  }
}

function mapError(r, what = 'request') {
  const code = String((r.json && (r.json.code || r.json.error)) || '');
  if (r.status === 401 || code === 'invalid_grant' || /bad_access_token|unauthorized/.test(code)) return new FinError('AUTH', errText.AUTH);
  if (r.status === 403) return new FinError('NOT_APPROVED', errText.NOT_APPROVED);
  if (r.status === 429) return new FinError('RATE_LIMITED', errText.RATE_LIMITED);
  return new FinError('BAD_RESPONSE', `Monzo could not complete the ${what}. Try again.`);
}

// ─── Client + tokens ──────────────────────────────────────────────────────
/** Save the user's own Monzo client. Creates the source on first save. -> {sourceId} */
async function saveClient(c, { clientId, clientSecret, sourceId } = {}) {
  const id = String(clientId || '').trim();
  const secret = clientSecret == null ? '' : String(clientSecret).trim();
  if (!CLIENT_RE.test(id)) throw new FinError('BAD_REQUEST', 'The Client ID starts with oauth2client_ - copy it from the Monzo developer site.');
  if (secret && !SECRET_RE.test(secret)) throw new FinError('BAD_REQUEST', 'That does not look like a Monzo client secret. Copy it again from the Monzo developer site.');
  let src = sourceId ? await c.svc.getSource(String(sourceId)) : null;
  if (sourceId && (!src || src.kind !== 'direct' || src.provider !== 'monzo')) throw new FinError('NOT_FOUND', 'That Monzo connection is not there any more.');
  const old = src ? await readSecret(c, src.id) : null;
  if (!secret && !(old && old.clientId === id && old.clientSecret)) throw new FinError('BAD_REQUEST', 'Paste the client secret too (it is shown once, on the Monzo developer site).');
  if (!src) src = await c.svc.createSource({ provider: 'monzo', label: 'Monzo', setup: true, accounts: [] });
  await c.secrets.update(secretName(src.id), (cur) => {
    const same = cur && cur.clientId === id;
    // A different client: the old sign-in belongs to the old client, so it goes.
    return same ? { ...cur, clientSecret: secret || cur.clientSecret } : { clientId: id, clientSecret: secret };
  });
  c.log('note', 'fin-connect monzo: client saved');
  return { sourceId: src.id };
}

function tokenDoc(doc, c, old = {}) {
  if (!doc || typeof doc.access_token !== 'string' || doc.access_token.length > 4096) throw new FinError('BAD_RESPONSE', errText.BAD_RESPONSE);
  const out = {
    ...old,
    accessToken: doc.access_token,
    refreshToken: typeof doc.refresh_token === 'string' ? doc.refresh_token : null,
    expiresAt: c.now() + Math.max(60, Math.min(7 * 86400, Number(doc.expires_in) || 21600)) * 1000,
    needsAuth: false,
  };
  out.noRefresh = !out.refreshToken;
  if (typeof doc.user_id === 'string' && /^user_[A-Za-z0-9]{1,64}$/.test(doc.user_id)) out.userId = doc.user_id;
  return out;
}

/**
 * A usable access token for the source. Refreshing is ONE-TIME at Monzo: it
 * runs under the secret file's lock and the new pair is written before the
 * new access token is used. invalid_grant -> needsAuth ("Sign in again").
 */
async function accessToken(c, source, { force = false } = {}) {
  const m = mem(c);
  if (m.refreshing.has(source.id)) return m.refreshing.get(source.id);
  const p = (async () => {
    let token = null;
    await c.secrets.update(secretName(source.id), async (s) => {
      if (!s || !s.clientId) throw new FinError('NOT_CONFIGURED', 'Set up your Monzo client first.');
      if (!s.accessToken || s.needsAuth) throw new FinError('AUTH', errText.AUTH);
      if (!force && s.expiresAt > c.now() + 60000) { token = s.accessToken; return undefined; }
      if (!s.refreshToken) {
        s.needsAuth = true;
        throw Object.assign(new FinError('AUTH', 'Monzo signed OpenDash out (it does so after about 6 hours when the client is not Confidential). Sign in again.'), { save: s });
      }
      const r = await api(c, 'POST', '/oauth2/token', { form: { grant_type: 'refresh_token', client_id: s.clientId, client_secret: s.clientSecret, refresh_token: s.refreshToken } });
      if (!r.ok) {
        const e = mapError(r, 'sign-in refresh');
        if (e.code === 'AUTH' || r.status === 400) { throw Object.assign(new FinError('AUTH', errText.AUTH), { save: { ...s, needsAuth: true, accessToken: null, refreshToken: null } }); }
        throw e;
      }
      const next = tokenDoc(r.json, c, s);
      token = next.accessToken;
      c.log('note', 'fin-connect monzo: token refreshed');
      return next;
    }).catch(async (e) => {
      // Record "needs sign-in" outside the failed update (the lock is free again).
      if (e && e.save) await c.secrets.update(secretName(source.id), () => e.save).catch(() => {});
      throw e;
    });
    return token;
  })().finally(() => m.refreshing.delete(source.id));
  m.refreshing.set(source.id, p);
  return p;
}

/** GET with the source's token; one refresh-and-retry on 401. */
async function authed(c, source, path, query) {
  let token = await accessToken(c, source);
  let r = await api(c, 'GET', path, { token, query });
  if (r.status === 401) {
    const s = await readSecret(c, source.id);
    if (s && s.refreshToken) {
      token = await accessToken(c, source, { force: true });
      r = await api(c, 'GET', path, { token, query });
    }
    if (r.status === 401) {
      await c.secrets.update(secretName(source.id), (cur) => (cur ? { ...cur, needsAuth: true } : undefined)).catch(() => {});
    }
  }
  return r;
}

// ─── Sign-in ──────────────────────────────────────────────────────────────
async function authUrl(c, sourceId) {
  const s = await readSecret(c, sourceId);
  if (!s || !s.clientId || !s.clientSecret) throw new FinError('NOT_CONFIGURED', 'Save your Monzo Client ID and secret first (Step 1).');
  const m = mem(c);
  for (const [k, v] of m.states) if (v.expires < c.now()) m.states.delete(k);
  while (m.states.size >= 20) m.states.delete(m.states.keys().next().value);
  const state = randomBytes(32).toString('base64url');
  const redirectUri = redirectFor(c);
  m.states.set(state, { sourceId, redirectUri, clientId: s.clientId, expires: c.now() + STATE_TTL_MS });
  const q = new URLSearchParams({ client_id: s.clientId, redirect_uri: redirectUri, response_type: 'code', state });
  const base = c.fake ? `http://localhost:${c.port}/api/fin-connect/fake/monzo/authorize` : AUTH_URL;
  return base + '?' + q;
}

/** The OAuth return. -> {sourceId} (and the approval watcher is running). */
async function callback(c, { state, code, error } = {}) {
  const m = mem(c);
  const key = String(state || '');
  const pending = m.states.get(key);
  m.states.delete(key);
  if (!pending || pending.expires < c.now()) throw new FinError('OAUTH_STATE', 'This sign-in expired or was not started from OpenDash. Start again from Connections.');
  if (error || !code || String(code).length > 4096) throw new FinError('OAUTH_STATE', 'Monzo sign-in was cancelled or could not finish. Start again from Connections.');
  let source = await c.svc.getSource(pending.sourceId);
  if (!source) throw new FinError('NOT_FOUND', 'That Monzo connection was removed. Start again from Connections.');
  const s = await readSecret(c, source.id);
  if (!s || s.clientId !== pending.clientId) throw new FinError('OAUTH_STATE', 'The Monzo client changed. Start sign-in again.');
  const r = await api(c, 'POST', '/oauth2/token', { form: { grant_type: 'authorization_code', client_id: s.clientId, client_secret: s.clientSecret, redirect_uri: pending.redirectUri, code: String(code) } });
  if (!r.ok) {
    if (r.status === 401 || r.status === 400) throw new FinError('AUTH', 'Monzo did not accept the sign-in. Check the Client ID and secret (Step 1), then try again.');
    throw mapError(r, 'sign-in');
  }
  let t = tokenDoc(r.json, c, { clientId: s.clientId, clientSecret: s.clientSecret });
  if (!t.userId) {
    const w = await api(c, 'GET', '/ping/whoami', { token: t.accessToken });
    if (w.ok && typeof w.json.user_id === 'string' && /^user_[A-Za-z0-9]{1,64}$/.test(w.json.user_id)) t.userId = w.json.user_id;
  }
  t.approvedAt = null;
  // One Monzo source per Monzo user: signing in again from a second wizard joins the first.
  const userHash = t.userId ? hash(t.userId) : null;
  if (userHash) {
    const twin = (await c.svc.allSources()).find(x => x.kind === 'direct' && x.provider === 'monzo' && x.userHash === userHash && x.id !== source.id);
    if (twin) {
      await c.secrets.write(secretName(twin.id), t);
      await c.secrets.remove(secretName(source.id)).catch(() => {});
      await c.svc.removeSource(source.id);
      m.aliases.set(source.id, twin.id);     // the page keeps asking about the id it started with
      source = twin;
    }
  }
  await c.secrets.write(secretName(source.id), t);
  if (userHash && source.userHash !== userHash) source = await c.svc.updateSource(source.id, { userHash });
  c.log('note', `fin-connect monzo: signed in${t.noRefresh ? ' (no refresh token: the client is not Confidential)' : ''}`);
  startApproval(c, source.id);
  return { sourceId: source.id, noRefresh: !!t.noRefresh };
}

// ─── Approval + the 5-minute full-history import ─────────────────────────
function approvalOf(c, id) { return mem(c).approvals.get(id) || null; }

function startApproval(c, sourceId) {
  const m = mem(c);
  const old = m.approvals.get(sourceId);
  if (old) old.cancelled = true;
  const a = { sourceId, state: 'waiting', startedAt: c.now(), deadline: c.now() + windowMs(c), waitUntil: c.now() + (c.fake ? 2 * windowMs(c) : Math.max(APPROVAL_WAIT_MS, windowMs(c))), imported: 0, earliest: null, approved: false, historyMode: null, message: null, code: null };
  m.approvals.set(sourceId, a);
  (async () => {
    while (!a.cancelled && a.state === 'waiting') {
      if (c.now() > a.waitUntil) {
        // Nothing can be read without the approval, so this is not "connected with 90 days".
        Object.assign(a, { state: 'error', message: 'Monzo has not been approved in the app yet. Open Monzo, tap Allow access, then sign in again.', code: 'NOT_APPROVED' });
        return;
      }
      let r = null;
      try { r = await authed(c, { id: sourceId }, '/accounts'); }
      catch (e) {
        if (e.code === 'AUTH' || e.code === 'NOT_CONFIGURED') { Object.assign(a, { state: 'error', message: e.message, code: e.code }); return; }
        r = null;    // network: keep trying
      }
      if (r && r.ok) {
        a.approved = true; a.approvedAt = c.now(); a.state = 'importing';
        a.deadline = a.approvedAt + windowMs(c);
        await c.secrets.update(secretName(sourceId), (s) => (s ? { ...s, approvedAt: a.approvedAt } : undefined)).catch(() => {});
        await importHistory(c, sourceId, a);
        return;
      }
      if (r && r.status === 401) { Object.assign(a, { state: 'error', message: errText.AUTH, code: 'AUTH' }); return; }
      await sleep(pollMs(c));
    }
  })().catch((e) => { Object.assign(a, { state: 'error', message: e instanceof FinError ? e.message : 'The Monzo import stopped. Try again.', code: e.code || 'FAILED' }); c.log('warn', `fin-connect monzo: approval watcher failed (${e.code || 'error'})`); });
  return a;
}

const isCurrent = (acc) => acc && !acc.closed && ['uk_retail', 'uk_retail_joint'].includes(acc.type) && ACC_RE.test(String(acc.id));

function accountInfo(acc) {
  const joint = acc.type === 'uk_retail_joint';
  const num = String(acc.account_number || '').replace(/\D/g, '');
  return { id: acc.id, name: joint ? 'Monzo joint account' : 'Monzo current account', kind: joint ? 'joint' : 'current', currency: /^[A-Z]{3}$/.test(acc.currency || '') ? acc.currency : 'GBP', ...(num.length >= 4 ? { mask: '••••' + num.slice(-4) } : {}), created: acc.created };
}

/** Balances and pots for the accounts. */
async function balancesAndPots(c, source, accs, today) {
  const balances = [], pots = [];
  for (const acc of accs) {
    const b = await authed(c, source, '/balance', { account_id: acc.id });
    if (b.ok && Number.isInteger(b.json.balance)) balances.push({ accountId: acc.id, name: acc.name, balance: b.json.balance / 100, currency: b.json.currency || acc.currency, asOf: today });
    const p = await authed(c, source, '/pots', { current_account_id: acc.id });
    if (!p.ok) continue;
    for (const pot of Array.isArray(p.json.pots) ? p.json.pots.slice(0, 30) : []) {
      if (!pot || pot.deleted || !ACC_RE.test(String(pot.id)) || !Number.isInteger(pot.balance)) continue;
      const name = cleanMemo(pot.name, 60) || 'Pot';
      pots.push({ id: pot.id, name, kind: 'pot', balanceOnly: true, currency: pot.currency || acc.currency });
      balances.push({ accountId: pot.id, name, balance: pot.balance / 100, currency: pot.currency || acc.currency, asOf: today });
    }
  }
  return { balances, pots };
}

/**
 * Page one account's transactions forward from `since` (an ISO time). Stops at
 * `stopAt` (ms) when given. -> {rows, closed: true when Monzo refused (403)}
 */
async function pageTransactions(c, source, acc, since, { stopAt = 0, onPage } = {}) {
  const rows = [];
  let cursor = since, closed = false;
  for (let n = 0; n < MAX_PAGES; n++) {
    if (stopAt && c.now() > stopAt) { closed = true; break; }
    const r = await authed(c, source, '/transactions', { account_id: acc.id, since: cursor, limit: '100', 'expand[]': ['merchant'] });
    if (r.status === 403) { closed = true; break; }
    if (!r.ok) throw mapError(r, 'transaction list');
    const list = Array.isArray(r.json.transactions) ? r.json.transactions : null;
    if (!list) throw new FinError('BAD_RESPONSE', errText.BAD_RESPONSE);
    for (const t of list) if (t && typeof t.id === 'string') rows.push(slim(acc.id, t));
    if (onPage) onPage(rows);
    if (list.length < 100) break;
    const last = list[list.length - 1];
    if (!last || typeof last.id !== 'string' || last.id === cursor) break;
    cursor = last.id;
  }
  return { rows, closed };
}

/** Only what normalise needs (raw Monzo objects carry much more). */
function slim(accountId, t) {
  return {
    accountId, id: t.id, created: t.created, settled: t.settled, amount: t.amount, currency: t.currency,
    description: t.description, category: t.category, decline: t.decline_reason || null,
    merchant: t.merchant && typeof t.merchant === 'object' ? { name: t.merchant.name } : null,
    counterparty: t.counterparty && typeof t.counterparty === 'object' ? { name: t.counterparty.name } : null,
    potId: (t.metadata && typeof t.metadata.pot_id === 'string' && t.metadata.pot_id) || (/^pot_[A-Za-z0-9]+$/.test(String(t.description || '')) ? t.description : null),
  };
}

async function importHistory(c, sourceId, a) {
  const source = { id: sourceId };
  const t0 = c.now();
  const today = iso(c.now()).slice(0, 10);
  const accR = await authed(c, source, '/accounts');
  if (!accR.ok) throw mapError(accR, 'account list');
  const accs = (Array.isArray(accR.json.accounts) ? accR.json.accounts : []).filter(isCurrent).map(accountInfo);
  const stopAt = a.deadline - SAFETY_MS;
  const rows = [];
  let full = true;
  for (const acc of accs) {
    const created = Date.parse(acc.created) || (c.now() - 10 * 365 * DAY);
    const since = iso(Math.max(0, created - DAY));
    const before = rows.length;
    const got = await pageTransactions(c, source, acc, since, { stopAt, onPage: (r) => { a.imported = before + r.length; const e = r[0] && String(r[0].created || '').slice(0, 10); if (e && (!a.earliest || e < a.earliest)) a.earliest = e; } });
    if (got.closed) {
      // The window closed first: keep what came, then the last 90 days for this account.
      full = false;
      const recent = await pageTransactions(c, source, acc, iso(c.now() - RECENT_DAYS * DAY));
      const have = new Set(got.rows.map(x => x.id));
      rows.push(...got.rows, ...recent.rows.filter(x => !have.has(x.id)));
    } else rows.push(...got.rows);
    a.imported = rows.length;
  }
  const { balances, pots } = await balancesAndPots(c, source, accs, today);
  const historyMode = full ? 'full' : '90d';
  mem(c).prefetched.set(sourceId, { rows, accounts: [...accs, ...pots], balances, historyMode, at: c.now() });
  a.historyMode = historyMode;
  c.log('note', `fin-connect monzo: history import ${historyMode} (${rows.length} rows, ${accs.length} accounts, ${c.now() - t0}ms)`);
  // The source is ready: the finance update reads the prefetched rows.
  await c.svc.updateSource(sourceId, (s) => { delete s.setup; s.extra = { ...(s.extra || {}), historyMode }; });
  a.state = 'saving';
  const r = await c.svc.requestSync(sourceId, { waitMs: 3 * 60 * 1000 });
  a.jobId = r && r.job ? r.job.id : null;
  if (!r || !r.started) {
    Object.assign(a, { state: 'error', message: 'Your Monzo history was downloaded but could not be saved yet. Press Sync now in Connections.', code: 'BUSY' });
    return;
  }
  await waitForJob(a.jobId);
  finishApproval(a);
}

async function waitForJob(id) {
  if (!id) return;
  const fin = await import('../finance.mjs');
  for (let i = 0; i < 1200; i++) {
    const j = fin.financeJob();
    if (!j || j.id !== id || j.state !== 'running') return;
    await sleep(250);
  }
}

function finishApproval(a) {
  if (a.historyMode === 'full') Object.assign(a, { state: 'done', message: null, code: null });
  else Object.assign(a, { state: 'expired', message: 'Monzo is connected, with the last 90 days. To bring in older history, press Get full history and approve in the Monzo app within 5 minutes.', code: 'LIMITED_HISTORY' });
}

/** The page's view of the approval (GET monzo/approval). */
function approvalView(c, asked) {
  const id = mem(c).aliases.get(asked) || asked;
  const a = approvalOf(c, id);
  if (!a) return { state: 'idle', sourceId: id };
  const pageState = a.state === 'saving' ? 'importing' : a.state;
  return {
    sourceId: id, state: pageState, approved: !!a.approved,
    secondsLeft: Math.max(0, Math.ceil((a.deadline - c.now()) / 1000)),
    windowSeconds: Math.round(windowMs(c) / 1000),
    imported: a.imported, earliest: a.earliest, historyMode: a.historyMode,
    ...(a.message ? { message: a.message } : {}), ...(a.code ? { code: a.code } : {}),
    ...(a.state === 'saving' ? { detail: 'Saving your transactions' } : {}),
  };
}

// ─── The provider ─────────────────────────────────────────────────────────
async function status(c, source) {
  const s = await readSecret(c, source.id).catch(() => null);
  const configured = !!(s && s.clientId && s.clientSecret);
  const signedIn = !!(s && s.accessToken && !s.needsAuth);
  const approved = !!(s && s.approvedAt);
  const a = approvalOf(c, source.id);
  const historyMode = (source.extra && source.extra.historyMode) || (a && a.historyMode) || null;
  let message = null;
  if (!configured) message = 'Add your Monzo client (Step 1) to finish setting up.';
  else if (s && s.needsAuth) message = s.noRefresh ? 'Monzo signed OpenDash out. Sign in again (choose Confidential on the Monzo developer site to stay signed in).' : 'Monzo needs you to sign in again.';
  else if (!signedIn) message = 'Sign in to Monzo to finish connecting.';
  else if (!approved) message = 'Approve OpenDash in your Monzo app (tap Allow access).';
  else if (historyMode === '90d') message = 'Connected with the last 90 days. Get full history to bring in older transactions.';
  return {
    configured, connected: signedIn && approved, needsAuth: configured && (!signedIn || (s && s.needsAuth) || !approved),
    reauthDue: null, message, client: s && s.clientId ? maskId(s.clientId) : null,
    historyMode, limitedHistory: historyMode === '90d', staysSignedIn: !!(s && s.refreshToken),
    approval: a ? (a.state === 'saving' ? 'importing' : a.state) : null,
  };
}

async function fetch(c, source, { cursor = {}, accountOn = () => true } = {}) {
  const m = mem(c);
  const pre = m.prefetched.get(source.id);
  const today = iso(c.now()).slice(0, 10);
  const accCursor = { ...(cursor.accounts || {}) };
  let rows, accounts, balances, historyMode = cursor.historyMode || null;
  if (pre) {
    m.prefetched.delete(source.id);
    ({ rows, accounts, balances } = pre);
    historyMode = pre.historyMode === 'full' ? 'full' : (historyMode === 'full' ? 'full' : '90d');
  } else {
    const accR = await authed(c, source, '/accounts');
    if (!accR.ok) throw mapError(accR, 'account list');
    const accs = (Array.isArray(accR.json.accounts) ? accR.json.accounts : []).filter(isCurrent).map(accountInfo);
    rows = [];
    for (const acc of accs) {
      if (!accountOn(acc.id)) continue;
      const last = accCursor[acc.id] && accCursor[acc.id].lastDate;
      // Since the last transaction minus the usual overlap, but never older than Monzo allows.
      const floor = c.now() - RECENT_DAYS * DAY;
      const from = last ? Math.max(Date.parse(last + 'T00:00:00Z') - (OVERLAP_DAYS + 1) * DAY, floor) : floor;
      const got = await pageTransactions(c, source, acc, iso(from));
      if (got.closed) throw new FinError('NOT_APPROVED', errText.NOT_APPROVED);
      rows.push(...got.rows);
    }
    const bp = await balancesAndPots(c, source, accs, today);
    balances = bp.balances;
    accounts = [...accs, ...bp.pots];
    if (!historyMode) historyMode = '90d';
  }
  for (const r of rows) {
    const d = String(r.created || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    const cur = accCursor[r.accountId] || (accCursor[r.accountId] = {});
    if (!cur.lastDate || d > cur.lastDate) cur.lastDate = d;
    if (!cur.earliest || d < cur.earliest) cur.earliest = d;
  }
  const potNames = new Map((accounts || []).filter(a => a.kind === 'pot').map(a => [a.id, a.name]));
  for (const r of rows) if (r.potId && potNames.has(r.potId)) r.potName = potNames.get(r.potId);
  return {
    rows, balances, accounts: (accounts || []).map(({ created, ...a }) => a),
    cursor: { ...cursor, accounts: accCursor, historyMode, ...(historyMode === 'full' && !cursor.fullAt ? { fullAt: iso(c.now()) } : {}) },
    sourcePatch: { extra: { ...(source.extra || {}), historyMode } },
  };
}

/** A slimmed Monzo transaction -> Tx, or a reason it is left out. */
function normalise(raw) {
  if (!raw || typeof raw !== 'object') return { reason: 'not an object' };
  if (raw.decline) return { reason: 'declined' };
  if (!raw.settled) return { reason: 'pending' };
  if (!Number.isInteger(raw.amount)) return { reason: 'bad amount' };
  const pot = !!raw.potId;
  const memo = pot
    ? (raw.amount < 0 ? `To pot: ${raw.potName || 'Pot'}` : `From pot: ${raw.potName || 'Pot'}`)
    : (raw.merchant && raw.merchant.name) || (raw.counterparty && raw.counterparty.name) || raw.description || '';
  const cat = CATEGORY[String(raw.category || '')] || null;
  return {
    row: {
      id: raw.id, accountId: raw.accountId, ts: raw.created, minor: raw.amount, currency: raw.currency || 'GBP',
      memo, bc: pot ? 'Transfers' : cat, sub: pot || raw.category === 'transfers' ? 'FT' : '',
    },
  };
}

async function listAccounts(c, source) {
  const accR = await authed(c, source, '/accounts');
  if (!accR.ok) throw mapError(accR, 'account list');
  const accs = (Array.isArray(accR.json.accounts) ? accR.json.accounts : []).filter(isCurrent).map(accountInfo);
  const { pots } = await balancesAndPots(c, source, accs, iso(c.now()).slice(0, 10));
  return [...accs.map(({ created, ...a }) => a), ...pots];
}

async function refresh(c, source) { await accessToken(c, source, { force: true }); }

async function disconnect(c, source) {
  const a = approvalOf(c, source.id);
  if (a) a.cancelled = true;
  mem(c).approvals.delete(source.id);
  mem(c).prefetched.delete(source.id);
  const s = await readSecret(c, source.id).catch(() => null);
  if (s && s.accessToken && !s.needsAuth) {
    try { await api(c, 'POST', '/oauth2/logout', { token: s.accessToken }); } catch { /* deleted below anyway */ }
  }
  await c.secrets.remove(secretName(source.id));
}

// ─── Routes (/api/fin-connect/monzo/...) ─────────────────────────────────
function routes(app, svc, { callbackPage, BASE }) {
  const ctx = () => svc.ctxFor('monzo');
  const sourceParam = (v) => { const id = String(v || ''); if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(id)) throw new FinError('BAD_REQUEST', 'Which Monzo connection?'); return id; };

  // PUT {clientId, clientSecret, sourceId?} -> {sourceId, status}
  app.route({ path: BASE + 'monzo/client', method: 'PUT', methodError: 'PUT only', handler: async (c) => {
    const b = await c.body();
    const k = ctx();
    const r = await saveClient(k, { clientId: b.clientId, clientSecret: b.clientSecret, sourceId: b.sourceId });
    const s = await svc.getSource(r.sourceId);
    return { ok: true, sourceId: r.sourceId, status: await status(k, s) };
  } });

  // GET ?source= -> 302 to Monzo's sign-in (or the fake one).
  app.route({ path: BASE + 'monzo/connect', method: 'GET', sameOrigin: true, handler: async (c) => {
    const k = ctx();
    const id = sourceParam(c.query.get('source'));
    const s = await svc.getSource(id);
    if (!s || s.provider !== 'monzo') throw new FinError('NOT_FOUND', 'That Monzo connection is not there any more.');
    const url = await authUrl({ ...k, port: c.port }, id);
    c.res.writeHead(302, { Location: url, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    c.res.end();
  } });

  // The OAuth return (a navigation from auth.monzo.com: crossSite, state-protected, one use).
  app.route({ path: BASE + 'monzo/callback', method: 'GET', crossSite: true, handler: async (c) => {
    try {
      const r = await callback({ ...ctx(), port: c.port }, { state: c.query.get('state'), code: c.query.get('code'), error: c.query.get('error') });
      return callbackPage(c, { title: 'Now approve in your Monzo app', text: 'Open Monzo on your phone and tap Allow access. Do it within 5 minutes to bring in your full history.' + (r.noRefresh ? ' (Your client is not Confidential, so Monzo will sign OpenDash out after about 6 hours.)' : ''), ok: true, close: true });
    } catch (e) {
      return callbackPage(c, { title: 'Monzo could not connect', text: e instanceof FinError ? e.message : 'The connection could not finish. Return to OpenDash and try again.', ok: false, status: e.status || 400 });
    }
  } });

  // GET ?source= -> {state: idle|waiting|importing|done|expired|error, secondsLeft, imported, earliest, ...}
  app.route({ path: BASE + 'monzo/approval', method: 'GET', handler: async (c) => approvalView(ctx(), sourceParam(c.query.get('source'))) });

  // Fake mode only: Monzo's sign-in page, answered at once.
  if (svc.fake('monzo')) {
    app.route({ path: BASE + 'fake/monzo/authorize', method: 'GET', crossSite: true, handler: async (c) => {
      const to = svc.fake('monzo').authorize(c.query);
      const u = to ? new URL(to) : null;
      if (!u || u.origin !== `http://localhost:${c.port}` || u.pathname !== BASE + 'monzo/callback') return c.json(400, { error: 'bad fake sign-in' });
      c.res.writeHead(302, { Location: u.href, 'Cache-Control': 'no-store' });
      c.res.end();
    } });
  }
}

export default defineProvider({
  id: 'monzo', label: 'Monzo', readOnly: true, allow,
  status, fetch, normalise, listAccounts, refresh, disconnect, routes,
  connect: async (c, input) => saveClient(c, input),
  callback: async (c, q) => callback(c, q),
  info: async (c) => ({ redirectUri: redirectFor(c), windowSeconds: Math.round(windowMs(c) / 1000) }),
  // For tests: the pieces behind the routes.
  _test: { saveClient, authUrl, callback, approvalView, accessToken, startApproval, mem },
});
