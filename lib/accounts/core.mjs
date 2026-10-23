// lib/accounts/core.mjs - the multi-account core (docs/dev/ACCOUNTS.md).
//
// PURE, PLATFORM-AGNOSTIC JS: no node: imports, no file access, no globals
// except the Web platform ones every runtime has (globalThis.crypto,
// TextEncoder, URL, URLSearchParams, AbortSignal). The Node server, a mobile
// app (Capacitor / React Native), a desktop app (Tauri / Electron) and a PWA
// all run this same file; what differs is passed in as adapters:
//   fetch      (url, init) -> Response-like {ok, status, text()}
//   secrets    SecretStore {get, set, delete, lock?}  (tokens; device-local)
//   registry   {read, mutate}                              (the account list; no secrets)
//   redirect   Redirect {kind, uri, matches}               (loopback / custom scheme / web)
//   now        () -> ms
//   deviceId   this device's id (the fetcher role)
//
// Exports: the record (validateAccount, publicAccount), ids and crypto helpers
// (Web Crypto), the pending sign-in store, redirect adapters, the token vault
// and createAccounts (the service).

export const PROVIDERS = Object.freeze(['microsoft', 'google', 'imap']);
export const KINDS = Object.freeze(['personal', 'work']);
export const STATUSES = Object.freeze(['connected', 'needs-sign-in', 'needs-admin-approval', 'paused']);
export const FEATURES = Object.freeze(['mail', 'calendar']);
export const ACCOUNT_ID_RE = /^acc_[a-f0-9]{16}$/;
const HOST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;

// ─── Errors ───────────────────────────────────────────────────────────────
/** An error with a code and a plain-language message (never provider detail). */
export class AccountError extends Error {
  constructor(code, message, status = 409, extra = {}) { super(message); this.code = code; this.status = status; Object.assign(this, extra); }
  toJSON() { return { error: this.message, code: this.code, ...(this.retryKind ? { retryKind: this.retryKind } : {}) }; }
}
export const fail = (code, message, status = 409, extra) => new AccountError(code, message, status, extra);

// ─── Text ─────────────────────────────────────────────────────────────────
const BS = String.fromCharCode(92);
const CTRL = new RegExp('[' + [[0x00, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]]
  .map(([a, b]) => BS + 'u' + a.toString(16).padStart(4, '0') + '-' + BS + 'u' + b.toString(16).padStart(4, '0')).join('') + ']', 'g');
/** One line of external text, trimmed, control and bidi characters removed. */
export function cleanText(s, max = 200) {
  return String(s == null ? '' : s).replace(CTRL, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}
const EMAIL_RE = /^[^\s@<>()",;:\\[\]]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,62}[A-Za-z0-9])?)+$/;
/** A plausible email address, lower-cased, or '' (never throws). */
export function cleanEmail(s) {
  const e = String(s == null ? '' : s).trim().toLowerCase();
  return e.length <= 254 && EMAIL_RE.test(e) ? e : '';
}
export const emailDomain = (email) => { const e = cleanEmail(email); return e ? e.slice(e.lastIndexOf('@') + 1) : ''; };
const isoOrNull = (s) => (typeof s === 'string' && Number.isFinite(Date.parse(s)) ? new Date(s).toISOString() : null);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

// ─── Web Crypto helpers ───────────────────────────────────────────────────
function webCrypto() {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== 'function' || !c.subtle) throw new Error('Web Crypto is not available');
  return c;
}
export function randomBytes(n) { const a = new Uint8Array(n); webCrypto().getRandomValues(a); return a; }
export function base64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function base64urlDecode(s) {
  const b = String(s).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
}
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
export const randomToken = (n = 32) => base64url(randomBytes(n));
export async function sha256(text) { return new Uint8Array(await webCrypto().subtle.digest('SHA-256', new TextEncoder().encode(String(text)))); }
export async function sha256Hex(text) { return hex(await sha256(text)); }
export const newAccountId = () => 'acc_' + hex(randomBytes(8));
/** A PKCE pair (RFC 7636, S256). */
export async function pkcePair() {
  const verifier = randomToken(48);
  return { verifier, challenge: base64url(await sha256(verifier)), method: 'S256' };
}
/** The payload of a JWT (an id token straight from the token endpoint over TLS; not verified, used only for tid/name). */
export function jwtClaims(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part || part.length > 16384) return {};
    const doc = JSON.parse(new TextDecoder().decode(base64urlDecode(part)));
    return isObj(doc) ? doc : {};
  } catch { return {}; }
}

// ─── The record ───────────────────────────────────────────────────────────
/** Validate one account record. Returns {account, errors}; unknown fields are dropped. */
export function validateAccount(input) {
  const s = isObj(input) ? input : {};
  const errors = [];
  const out = {};
  out.id = typeof s.id === 'string' && ACCOUNT_ID_RE.test(s.id) ? s.id : (errors.push('id is missing or not valid'), null);
  out.provider = PROVIDERS.includes(s.provider) ? s.provider : (errors.push('unknown provider'), null);
  out.email = cleanEmail(s.email);
  if (!out.email) errors.push('email is missing or not valid');
  out.displayName = cleanText(s.displayName, 120);
  out.kind = KINDS.includes(s.kind) ? s.kind : 'personal';
  if (typeof s.tenantId === 'string' && /^[A-Za-z0-9.-]{1,100}$/.test(s.tenantId)) out.tenantId = s.tenantId;
  out.scopes = [...new Set((Array.isArray(s.scopes) ? s.scopes : []).map(String).filter((x) => /^[A-Za-z0-9._:/-]{1,120}$/.test(x)))].slice(0, 30);
  const f = isObj(s.features) ? s.features : {};
  out.features = { mail: f.mail !== false, calendar: f.calendar !== false };
  out.status = STATUSES.includes(s.status) ? s.status : 'needs-sign-in';
  out.lastSync = isoOrNull(s.lastSync);
  out.error = isObj(s.error) && s.error.message ? { code: cleanText(s.error.code, 40) || 'FAILED', message: cleanText(s.error.message, 240), at: isoOrNull(s.error.at) } : null;
  out.fetcher = typeof s.fetcher === 'string' && HOST_ID_RE.test(s.fetcher) ? s.fetcher : null;
  out.createdAt = isoOrNull(s.createdAt) || new Date(0).toISOString();
  out.updatedAt = isoOrNull(s.updatedAt) || out.createdAt;
  if (s.legacy === true) out.legacy = true;
  // IMAP ('+ Other email'): which server it reads. Not a secret (the app password is in the vault).
  if (out.provider === 'imap' && isObj(s.server)) {
    const v = s.server, host = String(v.host || '').toLowerCase(), port = Number(v.port);
    if (/^[a-z0-9.:\[\]-]{1,253}$/.test(host) && Number.isInteger(port) && port > 0 && port < 65536) {
      out.server = { service: /^[a-z0-9-]{1,30}$/.test(String(v.service || '')) ? v.service : 'other', host, port, security: v.security === 'starttls' ? 'starttls' : 'tls' };
    }
  }
  return { account: out, errors };
}

/** Minutes-ago text for "synced N min ago" (plain words, no seconds). */
export function syncedText(iso, now = Date.now()) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return 'not synced yet';
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return 'synced just now';
  if (m < 60) return `synced ${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `synced ${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `synced ${d} day${d === 1 ? '' : 's'} ago`;
}

export const STATUS_TEXT = Object.freeze({
  connected: 'Connected', 'needs-sign-in': 'Sign in again', 'needs-admin-approval': 'Waiting for your organisation', paused: 'Paused',
});

/** What a page or app sees: the record plus this device's view of it. */
export function publicAccount(account, { deviceId = null, signedIn = false, now = Date.now(), approval = null } = {}) {
  const fetcherHere = !account.fetcher || account.fetcher === deviceId;
  const elsewhere = !fetcherHere && account.status !== 'paused';
  return {
    ...account,
    here: { fetcher: fetcherHere, signedIn: !!signedIn },
    statusText: elsewhere && account.status === 'connected' ? 'Checked on your other computer' : STATUS_TEXT[account.status] || 'Not connected',
    syncedText: syncedText(account.lastSync, now),
    ...(account.status === 'needs-admin-approval' && approval ? { approval } : {}),
  };
}

// ─── Pending sign-ins (state + PKCE verifier, memory only) ───────────────
export function createPendingStore({ now = () => Date.now(), ttlMs = 600000, max = 20 } = {}) {
  const map = new Map();
  const sweep = () => { for (const [k, v] of map) if (v.expires < now()) map.delete(k); };
  return {
    begin(data) {
      sweep();
      while (map.size >= max) map.delete(map.keys().next().value);
      const state = randomToken(32);
      map.set(state, { ...data, expires: now() + ttlMs });
      return state;
    },
    /** The sign-in for this state, once; null when unknown, used or expired. */
    take(state) {
      const k = String(state || '');
      const v = map.get(k);
      if (!v) return null;
      map.delete(k);
      return v.expires >= now() ? v : null;
    },
    peek(state) { const v = map.get(String(state || '')); return v && v.expires >= now() ? v : null; },
    clear(filter) { for (const [k, v] of map) if (!filter || filter(v)) map.delete(k); },
    get size() { sweep(); return map.size; },
  };
}

// ─── Redirect adapters ───────────────────────────────────────────────────
const samePlace = (a, b) => a.protocol === b.protocol && a.host === b.host && a.pathname === b.pathname;
/** Desktop / local server: http://localhost:<port><path>. */
export function loopbackRedirect({ port, path = '/api/accounts/callback', host = 'localhost' } = {}) {
  if (!['localhost', '127.0.0.1'].includes(host) || !/^\/[A-Za-z0-9/_-]{1,80}$/.test(path)) throw fail('BAD_REQUEST', 'Invalid sign-in return address.', 400);
  const p = Number(port);
  const uri = `http://${host}${Number.isInteger(p) && p > 0 && p < 65536 ? ':' + p : ''}${path}`;
  return { kind: 'loopback', uri: () => uri, matches: (u) => { try { const x = new URL(u); return samePlace(x, new URL(uri)) && !x.hash; } catch { return false; } } };
}
/** Mobile apps: <reverse-dns scheme>:/<path> (RFC 8252 section 7.1). */
export function customSchemeRedirect({ scheme = 'com.opendash.app', path = '/oauth2redirect' } = {}) {
  if (!/^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+$/.test(scheme) || !/^\/[A-Za-z0-9/_-]{1,80}$/.test(path)) throw fail('BAD_REQUEST', 'Invalid app return address.', 400);
  const uri = `${scheme}:${path}`;
  return { kind: 'custom-scheme', uri: () => uri, matches: (u) => { try { const x = new URL(u); return x.protocol === scheme + ':' && x.pathname === path; } catch { return false; } } };
}
/** PWA / hosted: https://<origin><path>. */
export function webRedirect({ origin, path = '/oauth/callback' } = {}) {
  let o;
  try { o = new URL(origin); } catch { throw fail('BAD_REQUEST', 'Invalid web return address.', 400); }
  if (o.protocol !== 'https:' || o.username || o.password || !/^\/[A-Za-z0-9/_-]{1,80}$/.test(path)) throw fail('BAD_REQUEST', 'Invalid web return address.', 400);
  const uri = o.origin + path;
  return { kind: 'web', uri: () => uri, matches: (u) => { try { return samePlace(new URL(u), new URL(uri)); } catch { return false; } } };
}

// ─── Token vault ─────────────────────────────────────────────────────────
/** A secret store kept in memory (tests, and a PWA session without storage). */
export function memorySecretStore() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? JSON.parse(m.get(k)) : null; },
    async set(k, v) { m.set(k, JSON.stringify(v)); },
    async delete(k) { m.delete(k); },
    _map: m,
  };
}

/**
 * Tokens per account over a SecretStore. refresh(id, fn) runs fn(old) one at
 * a time per account: concurrent callers share one result, the document fn
 * returns (if any) replaces the old one (rotation). lock (or withLock), when the store
 * has it, makes the section exclusive across processes too.
 */
export function createVault(store) {
  if (!store || typeof store.get !== 'function' || typeof store.set !== 'function' || typeof store.delete !== 'function') throw new Error('a secret store needs get, set and delete');
  const key = (id) => { if (!ACCOUNT_ID_RE.test(String(id))) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected.', 404); return 'accounts/' + id; };
  const queues = new Map();
  const lockFn = typeof store.lock === 'function' ? store.lock.bind(store) : typeof store.withLock === 'function' ? store.withLock.bind(store) : null;
  const locked = (id, fn) => (lockFn ? lockFn(key(id), fn) : fn());
  function serial(id, fn) {
    const prev = queues.get(id) || Promise.resolve();
    const next = prev.catch(() => {}).then(() => locked(id, fn));
    const tail = next.catch(() => {});
    queues.set(id, tail);
    tail.then(() => { if (queues.get(id) === tail) queues.delete(id); });
    return next;
  }
  const inflight = new Map();
  return {
    read: async (id) => { const v = await store.get(key(id)); return isObj(v) ? v : null; },
    write: (id, doc) => serial(id, () => store.set(key(id), doc)),
    remove: (id) => serial(id, () => store.delete(key(id))),
    /** fn(old) -> {doc?, value?, error?}: doc replaces the stored one, then error (if any) is thrown. Concurrent callers share one run. Never call the vault from inside fn (same queue). */
    refresh(id, fn) {
      if (inflight.has(id)) return inflight.get(id);
      const p = serial(id, async () => {
        const old = await store.get(key(id));
        const r = await fn(isObj(old) ? old : null);
        if (r && r.doc) await store.set(key(id), r.doc);
        if (r && r.error) throw r.error;
        return r ? r.value : undefined;
      }).finally(() => inflight.delete(id));
      inflight.set(id, p);
      return p;
    },
    /** Run fn(old) in the account's queue (status marks such as needsAuth). */
    update: (id, fn) => serial(id, async () => { const old = await store.get(key(id)); const doc = await fn(isObj(old) ? old : null); if (doc) await store.set(key(id), doc); return doc; }),
  };
}

// ─── Status from an error ────────────────────────────────────────────────
/** The registry status an error implies (null: keep the status, just note the error). */
export function statusForError(e) {
  if (!e) return null;
  if (e.code === 'NEEDS_SIGN_IN') return 'needs-sign-in';
  if (e.code === 'NEEDS_ADMIN_APPROVAL') return 'needs-admin-approval';
  return null;
}

// ─── The service ─────────────────────────────────────────────────────────
/**
 * createAccounts(opts) -> the account service (docs/dev/ACCOUNTS.md section 8).
 *   registry       {read() -> {version, accounts}, mutate(fn(accounts) -> r) -> r}
 *   secrets        SecretStore
 *   providers      {microsoft: createMicrosoftProvider, ...} (factories)
 *   providerConfig {microsoft: {clientId() ...}, ...}
 *   redirect       Redirect adapter, or a function (providerName) -> Redirect (the port can change)
 *   fetch, now, deviceId, log
 *   hooks          {changed(event, account, extra)} : 'connected' | 'features' | 'paused' | 'resumed' | 'removed' | 'synced'
 */
export function createAccounts({ registry, secrets, providers = {}, providerConfig = {}, redirect, fetch: fetchFn = globalThis.fetch, now = () => Date.now(), deviceId = null, log = () => {}, hooks = {} } = {}) {
  if (!registry || typeof registry.read !== 'function' || typeof registry.mutate !== 'function') throw new Error('createAccounts needs a registry adapter');
  const vault = createVault(secrets);
  const pending = createPendingStore({ now });
  const getRedirect = (name) => (typeof redirect === 'function' ? redirect(name) : redirect);
  const iso = () => new Date(now()).toISOString();
  const changed = async (event, account, extra) => { if (typeof hooks.changed === 'function') { try { await hooks.changed(event, account, extra); } catch (e) { log('warn', `accounts: ${event} hook failed (${e && e.code || 'error'})`); } } };

  async function all() {
    const doc = await registry.read();
    const out = [];
    for (const a of (doc && Array.isArray(doc.accounts) ? doc.accounts : [])) { const { account, errors } = validateAccount(a); if (!errors.length && !out.some((x) => x.id === account.id)) out.push(account); }
    return out;
  }
  const get = async (id) => (await all()).find((a) => a.id === id) || null;
  async function mutate(fn) {
    return registry.mutate(async (list) => {
      // Stored records are re-validated before a change is applied (a bad one is dropped).
      const clean = [];
      for (const a of list) { const { account, errors } = validateAccount(a); if (!errors.length && !clean.some((x) => x.id === account.id)) clean.push(account); }
      list.splice(0, list.length, ...clean);
      return fn(list);
    });
  }
  async function patch(id, fields) {
    return mutate((list) => {
      const a = list.find((x) => x.id === id);
      if (!a) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
      Object.assign(a, fields, { updatedAt: iso() });
      const { account } = validateAccount(a);
      Object.assign(a, account);
      return { ...account };
    });
  }

  async function accountIdFor({ provider, email, tenantId }) {
    const e = cleanEmail(email);
    const hit = (await all()).find((a) => a.provider === provider && a.email === e && (!tenantId || !a.tenantId || a.tenantId === tenantId || !/^[0-9a-f-]{36}$/i.test(a.tenantId)));
    return hit ? hit.id : newAccountId();
  }

  const made = new Map();
  function provider(name) {
    if (!PROVIDERS.includes(name)) throw fail('BAD_REQUEST', 'Choose Microsoft, Google or another email provider.', 400);
    if (made.has(name)) return made.get(name);
    const factory = providers[name];
    if (typeof factory !== 'function') throw fail('NOT_CONFIGURED', name === 'imap' ? 'Other email providers are coming soon.' : 'This kind of account cannot be added in this copy of OpenDash yet.', 409);
    const p = factory({ fetch: fetchFn, now, get redirect() { return getRedirect(name); }, vault, pending, config: providerConfig[name] || {}, accountIdFor, account: get, log });
    made.set(name, p);
    return p;
  }

  async function upsert(acc, { status } = {}) {
    return mutate((list) => {
      const i = list.findIndex((x) => x.id === acc.id);
      const prev = i >= 0 ? list[i] : null;
      const next = {
        ...(prev || {}), ...acc,
        // The user's choices and the fetcher survive a re-sign-in.
        features: prev ? prev.features : acc.features || { mail: true, calendar: true },
        fetcher: prev && prev.fetcher ? prev.fetcher : deviceId || null,
        status: status || acc.status || 'connected',
        error: acc.error || null,
        createdAt: prev ? prev.createdAt : iso(), updatedAt: iso(),
      };
      if (prev && prev.legacy) next.legacy = true;
      const { account, errors } = validateAccount(next);
      if (errors.length) throw fail('PROVIDER_RESPONSE', 'The account details could not be read. Try again.', 502);
      if (i >= 0) list[i] = account; else list.push(account);
      return { account: { ...account }, isNew: !prev };
    });
  }

  async function signedInHere(a) { try { return !!(await vault.read(a.id)); } catch { return false; } }
  async function approvalFor(a) {
    if (a.status !== 'needs-admin-approval') return null;
    try { const p = provider(a.provider); return typeof p.approvalHelp === 'function' ? await p.approvalHelp(a) : null; } catch { return null; }
  }
  async function isFetcher(id) { const a = await get(id); return !!a && (!a.fetcher || a.fetcher === deviceId); }

  async function guardFetch(id, feature) {
    const a = await get(id);
    if (!a) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
    if (a.status === 'paused') throw fail('PAUSED', 'This account is paused.', 409);
    if (a.fetcher && a.fetcher !== deviceId) throw fail('NOT_FETCHER', 'Another computer checks this account.', 409);
    if (feature && !a.features[feature]) throw fail('FEATURE_OFF', feature === 'mail' ? 'Mail is switched off for this account.' : 'Calendar is switched off for this account.', 409);
    if (a.status === 'needs-admin-approval') throw fail('NEEDS_ADMIN_APPROVAL', 'Your organisation needs to approve OpenDash once.', 409);
    return a;
  }
  async function noteResult(a, e) {
    if (!e) {
      const fields = { lastSync: iso(), error: null, ...(a.status === 'needs-sign-in' ? { status: 'connected' } : {}), ...(!a.fetcher && deviceId ? { fetcher: deviceId } : {}) };
      const out = await patch(a.id, fields).catch(() => null);
      if (out) await changed('synced', out);
      return;
    }
    const st = statusForError(e);
    await patch(a.id, { ...(st ? { status: st } : {}), error: { code: e.code || 'FAILED', message: e.code ? e.message : 'The account could not be read. Try again later.', at: iso() } }).catch(() => null);
  }
  async function run(id, feature, method, opts) {
    const a = await guardFetch(id, feature);
    const p = provider(a.provider);
    try { const r = await p[method](id, opts || {}); await noteResult(a, null); return r; }
    catch (e) { await noteResult(a, e); throw e; }
  }

  return {
    vault, pending, provider, accountIdFor, isFetcher,
    all, get,
    async list() {
      const out = [];
      for (const a of await all()) out.push(publicAccount(a, { deviceId, signedIn: await signedInHere(a), now: now(), approval: await approvalFor(a) }));
      return out;
    },
    async begin({ provider: name, email, kind, accountId, features } = {}) {
      const p = provider(name);
      let hint = cleanEmail(email), k = KINDS.includes(kind) ? kind : undefined;
      if (accountId) {
        const a = await get(accountId);
        if (!a || a.provider !== name) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
        hint = hint || a.email; k = k || a.kind; features = features || a.features;
      }
      if (!hint) throw fail('BAD_REQUEST', 'Type your full email address, for example name@outlook.com.', 400);
      return p.beginSignIn({ loginHint: hint, kind: k, accountId: accountId || undefined, features });
    },
    /** Finish a sign-in. {account} on success; {adminConsent:true} after an admin approved. */
    async callback(params = {}) {
      // An admin who approved through the admin-consent link comes back here without a sign-in of ours.
      if (params.admin_consent != null && !pending.peek(params.state)) return { adminConsent: String(params.admin_consent).toLowerCase() === 'true' };
      const pend = pending.take(params.state);
      if (!pend) throw fail('OAUTH_STATE', 'This sign-in expired or was not started from OpenDash. Start again.', 400);
      const p = provider(pend.provider);
      try {
        const acc = await p.handleCallback(params, pend);
        const { account, isNew } = await upsert(acc, { status: 'connected' });
        log('note', `accounts: ${account.provider} ${isNew ? 'account added' : 'signed in again'}`);
        await changed('connected', account, { isNew });
        return { account: publicAccount(account, { deviceId, signedIn: true, now: now() }), isNew };
      } catch (e) {
        if (e && e.code === 'NEEDS_ADMIN_APPROVAL' && e.account) {
          // Keep a record to come back to: "Waiting for your organisation", Try again.
          const id = pend.accountId || await accountIdFor({ provider: pend.provider, email: e.account.email, tenantId: e.account.tenantId });
          const { account } = await upsert({ ...e.account, id, provider: pend.provider, scopes: pend.scopes || [], features: pend.features, error: { code: e.code, message: e.message, at: iso() } }, { status: 'needs-admin-approval' }).catch(() => ({}));
          if (account) e.account = publicAccount(account, { deviceId, now: now(), approval: await approvalFor(account) });
        }
        throw e;
      }
    },
    /**
     * Connect an account that signs in without a browser (IMAP with an app password):
     * the provider's connect(input) tests the sign-in, saves the secret in the vault and
     * returns an Account; the record is merged like a callback's. -> {account, isNew, inbox?}
     */
    async connect({ provider: name, ...input } = {}) {
      const p = provider(name);
      if (typeof p.connect !== 'function') throw fail('BAD_REQUEST', 'This kind of account signs in through the browser.', 400);
      if (input.accountId) {
        const a = await get(input.accountId);
        if (!a || a.provider !== name) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
        input.features = input.features || a.features;
      }
      const acc = await p.connect(input);
      const { account, isNew } = await upsert(acc, { status: 'connected' });
      log('note', `accounts: ${account.provider} ${isNew ? 'account added' : 'signed in again'}`);
      await changed('connected', account, { isNew });
      return { account: publicAccount(account, { deviceId, signedIn: true, now: now() }), isNew, ...(acc.inbox ? { inbox: { exists: Number(acc.inbox.exists) || 0 } } : {}) };
    },
    async pause(id) { const a = await patch(id, { status: 'paused' }); await changed('paused', a); return a; },
    async resume(id) {
      const cur = await get(id);
      if (!cur) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
      const a = await patch(id, { status: cur.status === 'paused' ? (await vault.read(id).catch(() => null) || cur.fetcher !== deviceId ? 'connected' : 'needs-sign-in') : cur.status });
      await changed('resumed', a);
      return a;
    },
    async setFeatures(id, { mail, calendar } = {}) {
      const cur = await get(id);
      if (!cur) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
      const features = { mail: typeof mail === 'boolean' ? mail : cur.features.mail, calendar: typeof calendar === 'boolean' ? calendar : cur.features.calendar };
      const a = await patch(id, { features });
      await changed('features', a);
      return a;
    },
    async remove(id) {
      const a = await get(id);
      if (!a) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
      pending.clear((v) => v.accountId === id);
      try { await provider(a.provider).disconnect(id); } catch { await vault.remove(id).catch(() => {}); }
      await mutate((list) => { const i = list.findIndex((x) => x.id === id); if (i >= 0) list.splice(i, 1); });
      log('note', `accounts: ${a.provider} account removed`);
      await changed('removed', a);
      return { removed: id };
    },
    /** Placeholder until computers sync (docs/dev/ACCOUNTS.md section 7): changes nothing. */
    async fetchHere(id) {
      if (!(await get(id))) throw fail('UNKNOWN_ACCOUNT', 'That account is not connected any more.', 404);
      return { ok: false, placeholder: true, message: 'Coming soon: once your computers sync, you can choose which one checks this account.' };
    },
    async accessToken(id) { const a = await guardFetch(id); return provider(a.provider).accessToken(id); },
    fetchMail: (id, opts) => run(id, 'mail', 'fetchMail', opts),
    fetchCalendar: (id, opts) => run(id, 'calendar', 'fetchCalendar', opts),
    async approvalHelp(id) { const a = await get(id); return a ? (await approvalFor({ ...a, status: 'needs-admin-approval' })) : null; },
    noteResult: async (id, e) => { const a = await get(id); if (a) await noteResult(a, e); },
  };
}
