// OAuth for the optional remote MCP gateway. Approval lives exclusively in
// the local dashboard; the public endpoint never receives the local token.
import { join } from 'node:path';
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { readJson, writeJson, withLock } from './fsutil.mjs';

const opaque = () => randomBytes(32).toString('base64url');
export const remoteHash = value => createHash('sha256').update(String(value)).digest('base64url');
const empty = () => ({ clients: [], requests: [], codes: [], tokens: [] });
const fail = (error, status = 400) => { throw Object.assign(new Error(error), { status, error }); };
export function remoteOrigin(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.pathname !== '/' || u.search || u.hash || !u.hostname.includes('.') || /^(localhost|127\.)/i.test(u.hostname)) fail('A public HTTPS hostname is required.');
  return u.origin;
}
export function createRemoteAuth({ dataDir, publicOrigin, now = Date.now }) {
  const origin = remoteOrigin(publicOrigin), resource = origin + '/mcp';
  const file = join(dataDir, 'secrets', 'remote-mcp-auth.json');
  const change = fn => withLock(file, async () => {
    const db = await readJson(file, { fallback: empty() });
    for (const key of ['clients', 'requests', 'codes', 'tokens']) db[key] = (db[key] || []).filter(x => x.expires > now() && (!x.origin || x.origin === origin));
    const result = await fn(db);
    await writeJson(file, db, { mode: 0o600 });
    return result;
  });
  const redirectOK = uri => {
    try { const u = new URL(uri); return u.origin === 'https://claude.ai' && !u.username && !u.password && !u.hash; } catch { return false; }
  };
  return {
    origin, resource,
    metadata: () => ({ issuer: origin, authorization_endpoint: origin + '/oauth/authorize', token_endpoint: origin + '/oauth/token', registration_endpoint: origin + '/oauth/register', revocation_endpoint: origin + '/oauth/revoke', response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: ['opendash:read', 'opendash:propose'] }),
    register: input => change(db => {
      const redirects = input.redirect_uris;
      if (!Array.isArray(redirects) || !redirects.length || redirects.length > 4 || !redirects.every(redirectOK) || (input.token_endpoint_auth_method && input.token_endpoint_auth_method !== 'none')) fail('invalid_client_metadata');
      if (db.clients.length >= 100) fail('registration_limit', 429);
      const client = { client_id: opaque(), client_name: String(input.client_name || 'Claude connector').slice(0, 80), redirect_uris: [...new Set(redirects)], expires: now() + 90 * 86400000, origin };
      db.clients.push(client);
      return { client_id: client.client_id, client_name: client.client_name, redirect_uris: client.redirect_uris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] };
    }),
    authorize: query => change(db => {
      const client = db.clients.find(c => c.client_id === query.client_id);
      if (!client || !client.redirect_uris.includes(query.redirect_uri)) fail('invalid_client');
      if (query.response_type !== 'code' || query.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(query.code_challenge || '') || !query.state || query.state.length > 1024 || query.resource !== resource) fail('invalid_request');
      const scope = query.scope || 'opendash:read opendash:propose';
      if (scope.split(' ').some(s => !['opendash:read', 'opendash:propose'].includes(s))) fail('invalid_scope');
      if (db.requests.length >= 40) fail('authorization_limit', 429);
      const r = { id: opaque(), displayCode: randomBytes(4).toString('hex').toUpperCase(), client_id: client.client_id, client_name: client.client_name, redirect_uri: query.redirect_uri, state: query.state, challenge: query.code_challenge, scope, resource, origin, expires: now() + 10 * 60000, approved: false };
      db.requests.push(r);
      return { ticket: r.id, displayCode: r.displayCode };
    }),
    pending: () => change(db => db.requests.filter(r => !r.approved).map(r => ({ id: r.id, displayCode: r.displayCode, clientName: r.client_name, redirectOrigin: new URL(r.redirect_uri).origin, expires: r.expires, scope: r.scope }))),
    approve: id => change(db => { const r = db.requests.find(r => r.id === id); if (!r) fail('expired_request'); r.approved = true; return { ok: true }; }),
    continue: ticket => change(db => {
      const r = db.requests.find(r => r.id === ticket); if (!r) fail('expired_request');
      if (!r.approved) return { waiting: true, displayCode: r.displayCode };
      const code = opaque(); db.codes.push({ ...r, code: remoteHash(code), expires: now() + 60000 });
      db.requests = db.requests.filter(x => x !== r);
      const url = new URL(r.redirect_uri); url.searchParams.set('code', code); url.searchParams.set('state', r.state);
      return { redirect: url.href };
    }),
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
    verify: token => change(db => {
      const grant = db.tokens.find(t => t.access === remoteHash(token || '') && t.resource === resource && t.accessExpires > now());
      return grant ? { scope: grant.scope } : null;
    }),
    revoke: token => change(db => { const h = remoteHash(token || ''); db.tokens = db.tokens.filter(t => t.access !== h && t.refresh !== h); return {}; }),
    revokeAll: () => change(db => { db.tokens = []; db.codes = []; db.requests = []; return { ok: true }; }),
  };
}
