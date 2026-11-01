// OAuth for the optional remote MCP gateway. Approval lives exclusively in
// the local dashboard; the public endpoint never receives the local token.
// Its records are kept in this computer's secret store (lib/secret-store.mjs).
//
// The endpoint is public, so:
// - New clients can register, and new sign-ins can start, only while the owner
//   has pressed Connect in the local dashboard in the last ten minutes
//   (openConnectWindow). Existing connections keep refreshing their tokens.
// - Unused clients (no token after an hour) are dropped, and when the list is
//   full the oldest unused one makes room, so nobody can fill it up.
// - Approving needs the code from the owner's own sign-in tab, typed in the
//   dashboard: a request someone else started shows a code only they can see.
//   2.20.1: the code is 4 letters (lib/sync/e2e-crypto.mjs SHORT_ALPHABET), and
//   only LIVE: the request lasts 10 minutes, is used once, and 3 wrong codes in
//   all (across every request) close the Connect window and drop the requests
//   that are waiting, so at most 3 guesses ever meet a code: 3 in 279,841.
// - Reads (verify, pending, a sign-in tab still waiting) never rewrite the store.
// - Revoke all clears tokens, codes, requests and registered clients.
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { secretStore } from './secret-store.mjs';
import { newShortCode, parseShortCode } from './sync/e2e-crypto.mjs';

const opaque = () => randomBytes(32).toString('base64url');
export const remoteHash = value => createHash('sha256').update(String(value)).digest('base64url');
const empty = () => ({ clients: [], requests: [], codes: [], tokens: [] });
const fail = (error, status = 400) => { throw Object.assign(new Error(error), { status, error }); };
export const CONNECT_WINDOW_MS = 10 * 60000;
const UNUSED_CLIENT_MS = 60 * 60000;
const CLIENT_LIFE_MS = 90 * 86400000;
export const CODE_TRIES = 3;
const MAX_CLIENTS = 100;
export function remoteOrigin(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.pathname !== '/' || u.search || u.hash || !u.hostname.includes('.') || /^(localhost|127\.)/i.test(u.hostname)) fail('A public HTTPS hostname is required.');
  return u.origin;
}
const cleanMeta = (v, n) => String(v || '').replace(/[^\w.:\-[\] ]/g, '').slice(0, n);
export function createRemoteAuth({ dataDir, publicOrigin, now = Date.now }) {
  const origin = remoteOrigin(publicOrigin), resource = origin + '/mcp';
  const store = secretStore(dataDir), KEY = 'remote-mcp-auth';
  const load = async () => {
    // missing or damaged: start empty (as before)
    const db = (await store.get(KEY).catch(e => { if (e.code === 'SECRET_CORRUPT') return null; throw e; })) || empty();
    for (const key of ['clients', 'requests', 'codes', 'tokens']) db[key] = (db[key] || []).filter(x => x.expires > now() && (!x.origin || x.origin === origin));
    return db;
  };
  // A change: read, let fn change it, write. A fail() inside fn writes nothing.
  const change = fn => store.lock(KEY, async () => {
    const db = await load();
    const result = await fn(db);
    await store.set(KEY, db);
    return result;
  });
  // A read: never writes (unauthenticated callers must not cause disk writes).
  const read = async fn => fn(await load());
  const windowOpen = db => Number(db.connectUntil) > now() && db.connectOrigin === origin;
  const redirectOK = uri => {
    try { const u = new URL(uri); return u.origin === 'https://claude.ai' && !u.username && !u.password && !u.hash; } catch { return false; }
  };
  const used = (db, id) => db.tokens.some(t => t.client_id === id) || db.codes.some(c => c.client_id === id) || db.requests.some(r => r.client_id === id);
  const created = c => Number(c.created) || (Number(c.expires) - CLIENT_LIFE_MS);
  return {
    origin, resource,
    metadata: () => ({ issuer: origin, authorization_endpoint: origin + '/oauth/authorize', token_endpoint: origin + '/oauth/token', registration_endpoint: origin + '/oauth/register', revocation_endpoint: origin + '/oauth/revoke', response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['opendash:read', 'opendash:propose'] }),
    /** The owner pressed Connect in the local dashboard: allow new registrations and sign-ins for ten minutes. */
    openConnectWindow: () => change(db => { db.connectUntil = now() + CONNECT_WINDOW_MS; db.connectOrigin = origin; db.wrong = 0; return { connectUntil: db.connectUntil }; }),
    connectState: () => read(db => ({ connectUntil: windowOpen(db) ? db.connectUntil : null })),
    register: async input => {
      if (!await read(windowOpen)) fail('connect_closed', 403);
      return change(db => {
        if (!windowOpen(db)) fail('connect_closed', 403);
        const redirects = input.redirect_uris;
        if (!Array.isArray(redirects) || !redirects.length || redirects.length > 4 || !redirects.every(redirectOK) || (input.token_endpoint_auth_method && input.token_endpoint_auth_method !== 'none')) fail('invalid_client_metadata');
        // Unused clients go after an hour; a full list makes room by dropping the oldest unused one.
        db.clients = db.clients.filter(c => used(db, c.client_id) || created(c) > now() - UNUSED_CLIENT_MS);
        if (db.clients.length >= MAX_CLIENTS) {
          const spare = db.clients.filter(c => !used(db, c.client_id)).sort((a, b) => created(a) - created(b))[0];
          if (!spare) fail('registration_limit', 429);
          db.clients = db.clients.filter(c => c !== spare);
        }
        const client = { client_id: opaque(), client_name: String(input.client_name || 'Claude connector').slice(0, 80), redirect_uris: [...new Set(redirects)], created: now(), expires: now() + CLIENT_LIFE_MS, origin };
        db.clients.push(client);
        return { client_id: client.client_id, client_name: client.client_name, redirect_uris: client.redirect_uris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] };
      });
    },
    authorize: async (query, meta = {}) => {
      if (!await read(windowOpen)) fail('connect_closed', 403);
      return change(db => {
        if (!windowOpen(db)) fail('connect_closed', 403);
        const client = db.clients.find(c => c.client_id === query.client_id);
        if (!client || !client.redirect_uris.includes(query.redirect_uri)) fail('invalid_client');
        if (query.response_type !== 'code' || query.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(query.code_challenge || '') || !query.state || query.state.length > 1024 || query.resource !== resource) fail('invalid_request');
        const scope = query.scope || 'opendash:read opendash:propose';
        if (scope.split(' ').some(s => !['opendash:read', 'opendash:propose'].includes(s))) fail('invalid_scope');
        if (db.requests.length >= 40) fail('authorization_limit', 429);
        const r = { id: opaque(), displayCode: newShortCode(), client_id: client.client_id, client_name: client.client_name, redirect_uri: query.redirect_uri, state: query.state, challenge: query.code_challenge, scope, resource, origin, ip: cleanMeta(meta.ip, 64), country: cleanMeta(meta.country, 4), created: now(), expires: now() + 10 * 60000, approved: false };
        db.requests.push(r);
        return { ticket: r.id, displayCode: r.displayCode };
      });
    },
    // The display code is not sent to the dashboard: the owner types it from their own sign-in tab.
    pending: () => read(db => db.requests.filter(r => !r.approved).map(r => {
      const u = new URL(r.redirect_uri);
      return { id: r.id, clientName: r.client_name, redirectOrigin: u.origin, redirectHost: u.host, redirectPath: u.pathname.slice(0, 120), ip: r.ip || '', country: r.country || '', created: r.created || null, expires: r.expires, scope: r.scope };
    })),
    approve: async (id, code) => {
      // A wrong code is counted (and written) before it is refused: 3 wrong ones in all close the Connect window.
      const res = await change(db => {
        const r = db.requests.find(r => r.id === id); if (!r) fail('expired_request');
        const typed = String(code || '').replace(/[\s-]/g, '').toUpperCase();
        const want = String(r.displayCode || '');
        const okShape = want.length === 4 ? parseShortCode(typed).ok : /^[0-9A-F]{8}$/.test(typed);    // 8 hex: a request from before 2.20.1
        if (okShape && typed.length === want.length && timingSafeEqual(Buffer.from(typed), Buffer.from(want))) { r.approved = true; return { ok: true }; }
        db.wrong = (Number(db.wrong) || 0) + 1;
        if (db.wrong >= CODE_TRIES) { db.requests = db.requests.filter(x => x.approved); db.connectUntil = 0; return { error: 'code_burned' }; }
        return { error: 'code_mismatch', left: CODE_TRIES - db.wrong };
      });
      if (res.error) throw Object.assign(new Error(res.error), { status: 403, error: res.error, left: res.left });
      return res;
    },
    continue: async ticket => {
      const peek = await read(db => db.requests.find(r => r.id === ticket) || null);
      if (!peek) fail('expired_request');
      if (!peek.approved) return { waiting: true, displayCode: peek.displayCode };
      return change(db => {
        const r = db.requests.find(r => r.id === ticket); if (!r) fail('expired_request');
        if (!r.approved) return { waiting: true, displayCode: r.displayCode };
        const code = opaque(); db.codes.push({ ...r, code: remoteHash(code), expires: now() + 60000 });
        db.requests = db.requests.filter(x => x !== r);
        const url = new URL(r.redirect_uri); url.searchParams.set('code', code); url.searchParams.set('state', r.state);
        return { redirect: url.href };
      });
    },
    token: input => change(db => {
      let grant;
      if (input.grant_type === 'authorization_code') {
        const index = db.codes.findIndex(c => c.code === remoteHash(input.code || ''));
        if (index < 0) fail('invalid_grant');
        grant = db.codes[index];
        if (grant.client_id !== input.client_id || grant.redirect_uri !== input.redirect_uri || grant.resource !== input.resource || !/^[A-Za-z0-9._~-]{43,128}$/.test(input.code_verifier || '')) fail('invalid_grant');
        const challenge = remoteHash(input.code_verifier);
        if (!timingSafeEqual(Buffer.from(challenge), Buffer.from(grant.challenge))) fail('invalid_grant');
        db.codes.splice(index, 1);
      } else if (input.grant_type === 'refresh_token') {
        const index = db.tokens.findIndex(t => t.refresh === remoteHash(input.refresh_token || ''));
        if (index < 0) fail('invalid_grant');
        grant = db.tokens[index];
        if (grant.client_id !== input.client_id || grant.resource !== input.resource) fail('invalid_grant');
        db.tokens.splice(index, 1);
      } else fail('unsupported_grant_type');
      const access = opaque(), refresh = opaque();
      if (db.tokens.length >= 100) db.tokens.shift();
      db.tokens.push({ access: remoteHash(access), refresh: remoteHash(refresh), client_id: grant.client_id, resource, scope: grant.scope, origin, accessExpires: now() + 3600000, expires: now() + 30 * 86400000 });
      return { access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600, scope: grant.scope };
    }),
    verify: token => read(db => {
      const grant = db.tokens.find(t => t.access === remoteHash(token || '') && t.resource === resource && t.accessExpires > now());
      return grant ? { scope: grant.scope } : null;
    }),
    revoke: async token => {
      const h = remoteHash(token || '');
      if (!await read(db => db.tokens.some(t => t.access === h || t.refresh === h))) return {};
      return change(db => { db.tokens = db.tokens.filter(t => t.access !== h && t.refresh !== h); return {}; });
    },
    revokeAll: () => change(db => { db.tokens = []; db.codes = []; db.requests = []; db.clients = []; db.connectUntil = 0; return { ok: true }; }),
  };
}
