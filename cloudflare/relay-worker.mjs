// Raw Cloudflare ES module; deploy once with SQLite Durable Object RELAY.
// Installation credentials authenticate outbound agents; OAuth grants never
// authenticate agents, and cannot route to another installation's object.
const MAX = 256 * 1024;
const scopes = ['opendash:read', 'opendash:propose'];
const opaque = () => { const b = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
export async function relayHash(value) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value))); return btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
const failure = (error, status = 400) => { throw Object.assign(new Error(error), { status }); };
const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', ...extra } });
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
async function input(req, form = false) {
  if (req.headers.get('content-type')?.split(';')[0] !== (form ? 'application/x-www-form-urlencoded' : 'application/json')) failure('invalid_content_type', 415);
  const reader = req.body?.getReader(); let size = 0, chunks = [];
  if (reader) try { for (;;) { const { value, done } = await reader.read(); if (done) break; size += value.byteLength; if (size > MAX) { await reader.cancel(); failure('body_too_large', 413); } chunks.push(value); } } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let at = 0; for (const c of chunks) { bytes.set(c, at); at += c.length; }
  const text = new TextDecoder().decode(bytes);
  try { return form ? Object.fromEntries(new URLSearchParams(text)) : JSON.parse(text || '{}'); } catch { failure('invalid_body'); }
}
export function relayOrigin(value) { let u; try { u = new URL(value); } catch { failure('relay_not_configured', 503); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.pathname !== '/' || u.search || u.hash || !/^[a-z0-9.-]+$/.test(u.hostname) || !u.hostname.includes('.') || /^\d+\./.test(u.hostname) || /(^|\.)(localhost|local)$/.test(u.hostname)) failure('relay_not_configured', 503); return u.origin; }
const redirectOK = value => { try { if (typeof value !== 'string' || value.length > 512) return false; const u = new URL(value); return u.origin === 'https://claude.ai' && !u.username && !u.password && !u.hash; } catch { return false; } };
export const relayMethods = new Set(['initialize', 'ping', 'tools/list', 'tools/call', 'resources/list', 'resources/templates/list', 'resources/read', 'prompts/list', 'prompts/get', 'logging/setLevel']);

export default {
  async fetch(req, env) {
    try {
      const origin = relayOrigin(env.PUBLIC_ORIGIN), u = new URL(req.url);
      if (u.origin !== origin) return json({ error: 'invalid_host' }, 421);
      const caller = req.headers.get('origin'); if (caller && ![origin, 'https://claude.ai'].includes(caller)) return json({ error: 'invalid_origin' }, 403);
      if (u.pathname === '/health' && req.method === 'GET') return json({ service: 'opendash-relay', version: 1 });
      if (u.pathname === '/installations' && req.method === 'POST') {
        await input(req);
        const limiter = env.RELAY.get(env.RELAY.idFromName('_registration'));
        const limited = await limiter.fetch(new Request(origin + '/internal/rate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip: await relayHash(req.headers.get('CF-Connecting-IP') || 'unknown') }) }));
        if (!limited.ok) return limited;
        const id = opaque(), secret = opaque(), stub = env.RELAY.get(env.RELAY.idFromName(id));
        const result = await stub.fetch(new Request(origin + '/internal/init', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, secret }) }));
        if (!result.ok) return result;
        return json({ installation: id, secret, endpoint: origin + '/i/' + id + '/mcp' }, 201);
      }
      // RFC 8414 path-based issuer discovery, plus explicit resource metadata.
      const discovery = /^\/\.well-known\/oauth-authorization-server\/i\/([A-Za-z0-9_-]{43})$/.exec(u.pathname);
      const match = /^\/i\/([A-Za-z0-9_-]{43})\/(mcp|oauth\/(?:register|authorize|continue|token|revoke)|agent\/(?:poll|result|approve|revoke|status|disconnect)|\.well-known\/(?:oauth-authorization-server|oauth-protected-resource))$/.exec(u.pathname);
      const id = match?.[1] || discovery?.[1]; if (!id) return json({ error: 'not_found' }, 404);
      return await env.RELAY.get(env.RELAY.idFromName(id)).fetch(req);
    } catch (e) { return json({ error: e.status ? e.message : 'relay_error' }, e.status || 500); }
  },
};

export class OpenDashRelay {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.serial = Promise.resolve(); this.jobs = new Map(); this.rate = { at: 0, count: 0 }; }
  change(fn) {
    const result = this.serial.then(async () => {
      const db = await this.ctx.storage.get('state') || { clients: [], requests: [], codes: [], tokens: [] };
      for (const key of ['clients', 'requests', 'codes', 'tokens']) db[key] = db[key].filter(x => x.expires > Date.now());
      const value = await fn(db);
      if (new TextEncoder().encode(JSON.stringify(db)).byteLength > 120 * 1024) failure('state_limit', 429);
      await this.ctx.storage.put('state', db); return value;
    }); this.serial = result.catch(() => {}); return result;
  }
  async fetch(req) {
    try {
      const origin = relayOrigin(this.env.PUBLIC_ORIGIN), u = new URL(req.url);
      if (u.pathname === '/internal/rate' && req.method === 'POST') {
        const b = await input(req); const now = Date.now();
        return await this.change(db => { const rates = (db.rates || []).filter(x => x.until > now); const hit = rates.find(x => x.ip === b.ip);
          if (rates.reduce((n, x) => n + x.n, 0) >= 500 || (hit?.n || 0) >= 10 || rates.length >= 1000) return json({ error: 'registration_limit' }, 429);
          if (hit) hit.n++; else rates.push({ ip: b.ip, n: 1, until: now + 3600000 }); db.rates = rates; return json({ ok: true }); });
      }
      if (u.pathname === '/internal/init' && req.method === 'POST') {
        const b = await input(req); if (!/^[A-Za-z0-9_-]{43}$/.test(b.id) || !/^[A-Za-z0-9_-]{43}$/.test(b.secret)) failure('invalid_installation');
        return await this.change(async db => { if (db.installation) failure('already_registered', 409); db.installation = b.id; db.secretHash = await relayHash(b.secret); db.createdAt = Date.now(); return json({ ok: true }); });
      }
      const db = await this.ctx.storage.get('state'); if (!db?.installation || db.disabled) return json({ error: 'installation_unavailable' }, 404);
      for (const key of ['clients', 'requests', 'codes', 'tokens']) db[key] = db[key].filter(x => x.expires > Date.now());
      const base = origin + '/i/' + db.installation, resource = base + '/mcp';
      const suffix = u.pathname.startsWith('/i/' + db.installation + '/') ? u.pathname.slice(('/i/' + db.installation).length) : u.pathname === '/.well-known/oauth-authorization-server/i/' + db.installation ? '/.well-known/oauth-authorization-server' : null;
      if (!suffix) failure('not_found', 404);
      if (Date.now() - this.rate.at > 60000) this.rate = { at: Date.now(), count: 0 };
      if (++this.rate.count > 300) failure('rate_limit', 429);
      const bearer = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.get('authorization') || '')?.[1];
      if (suffix.startsWith('/agent/')) {
        if (!bearer || await relayHash(bearer) !== db.secretHash) failure('invalid_agent', 401);
        if (req.method !== 'POST') failure('POST only', 405);
        const b = await input(req);
        if (suffix === '/agent/approve') return await this.change(db => { const r = db.requests.find(r => r.id === b.id && r.displayCode === b.code); if (!r) failure('expired_request'); r.approved = true; return json({ ok: true }); });
        if (suffix === '/agent/revoke' || suffix === '/agent/disconnect') {
          await this.change(db => { db.tokens = []; db.codes = []; db.requests = []; if (suffix.endsWith('/disconnect')) { db.disabled = true; db.secretHash = null; } });
          for (const j of this.jobs.values()) j.finish(json({ error: 'access_revoked' }, 401)); return json({ ok: true });
        }
        if (suffix === '/agent/status') return json({ linked: db.tokens.some(t => t.accessExpires > Date.now()), requests: db.requests.filter(r => !r.approved).map(r => ({ id: r.id, displayCode: r.displayCode, clientName: r.client_name, expires: r.expires, scope: r.scope })) });
        if (suffix === '/agent/result') {
          const j = this.jobs.get(b.id); if (!j || j.nonce !== b.nonce || !db.tokens.some(t => t.id === j.grant && t.accessExpires > Date.now())) failure('expired_job', 409);
          if (!b.response || b.response.jsonrpc !== '2.0' || b.response.id !== j.message.id || (!('result' in b.response) && !('error' in b.response))) failure('invalid_result');
          j.finish(json(b.response)); return json({ ok: true });
        }
        if (suffix === '/agent/poll') {
          const ready = () => [...this.jobs.values()].filter(j => !j.dispatched).slice(0, 4);
          const current = await this.change(db => { db.lastPoll = Date.now(); return { tokens: db.tokens, requests: db.requests }; });
          const jobs = ready().filter(j => current.tokens.some(t => t.id === j.grant && t.accessExpires > Date.now()));
          for (const j of jobs) j.dispatched = true;
          return json({ requests: current.requests.filter(r => !r.approved).map(r => ({ id: r.id, displayCode: r.displayCode, clientName: r.client_name, expires: r.expires, scope: r.scope })), jobs: jobs.map(j => ({ id: j.id, nonce: j.nonce, scope: j.scope, expires: j.expires, message: j.message })) });
        }
        failure('not_found', 404);
      }
      if (suffix === '/.well-known/oauth-authorization-server' && req.method === 'GET') return json({ issuer: base, authorization_endpoint: base + '/oauth/authorize', token_endpoint: base + '/oauth/token', registration_endpoint: base + '/oauth/register', revocation_endpoint: base + '/oauth/revoke', response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'], scopes_supported: scopes });
      if (suffix === '/.well-known/oauth-protected-resource' && req.method === 'GET') return json({ resource, authorization_servers: [base], scopes_supported: scopes });
      if (suffix === '/oauth/register' && req.method === 'POST') {
        const b = await input(req);
        if (!Array.isArray(b.redirect_uris) || !b.redirect_uris.length || b.redirect_uris.length > 4 || !b.redirect_uris.every(redirectOK) || (b.token_endpoint_auth_method && b.token_endpoint_auth_method !== 'none')) failure('invalid_client_metadata');
        return await this.change(db => { if (db.clients.length >= 20) failure('registration_limit', 429); const client = { client_id: opaque(), client_name: String(b.client_name || 'Claude').slice(0, 80), redirect_uris: [...new Set(b.redirect_uris)], expires: Date.now() + 90 * 86400000 }; db.clients.push(client); return json({ ...client, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] }, 201); });
      }
      if (suffix === '/oauth/authorize' && req.method === 'GET') {
        const b = Object.fromEntries(u.searchParams);
        const ticket = await this.change(db => { const client = db.clients.find(c => c.client_id === b.client_id);
          if (!client || !client.redirect_uris.includes(b.redirect_uri)) failure('invalid_client');
          if (b.response_type !== 'code' || b.code_challenge_method !== 'S256' || !/^[A-Za-z0-9_-]{43}$/.test(b.code_challenge || '') || !b.state || b.state.length > 1024 || b.resource !== resource) failure('invalid_request');
          const requested = (b.scope || scopes.join(' ')).split(' '); if (requested.length > 2 || !requested.includes(scopes[0]) || requested.some(s => !scopes.includes(s))) failure('invalid_scope');
          const scope = [...new Set(requested)].join(' ');
          if (db.requests.length >= 10) failure('authorization_limit', 429);
          const r = { id: opaque(), displayCode: opaque().slice(0, 8).toUpperCase(), client_id: client.client_id, client_name: client.client_name, redirect_uri: b.redirect_uri, state: b.state, challenge: b.code_challenge, scope, resource, approved: false, expires: Date.now() + 600000 }; db.requests.push(r); return r.id; });
        return new Response(null, { status: 302, headers: { Location: base + '/oauth/continue?ticket=' + ticket, 'Cache-Control': 'no-store' } });
      }
      if (suffix === '/oauth/continue' && req.method === 'GET') {
        const result = await this.change(async db => { const r = db.requests.find(r => r.id === u.searchParams.get('ticket')); if (!r) failure('expired_request');
          if (!r.approved) return { displayCode: r.displayCode }; if (db.codes.length >= 20) failure('code_limit', 429); const code = opaque(); db.codes.push({ ...r, code: await relayHash(code), expires: Date.now() + 60000 }); db.requests = db.requests.filter(x => x !== r); const url = new URL(r.redirect_uri); url.searchParams.set('code', code); url.searchParams.set('state', r.state); return { redirect: url.href }; });
        if (result.redirect) return new Response(null, { status: 302, headers: { Location: result.redirect, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
        return new Response(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="3"><title>Connect OpenDash</title><h1>Approve in your local OpenDash</h1><p>In Connections, match this code before approving Claude:</p><strong>${esc(result.displayCode)}</strong><p>Access allows dashboard reads and proposals. Applying changes still needs approval in OpenDash.</p>`, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
      }
      if (suffix === '/oauth/token' && req.method === 'POST') {
        const b = await input(req, true);
        return await this.change(async db => { let grant;
          const digest = await relayHash(b.grant_type === 'authorization_code' ? b.code || '' : b.refresh_token || '');
          if (b.grant_type === 'authorization_code') { grant = db.codes.find(c => c.code === digest); if (!grant || grant.client_id !== b.client_id || grant.redirect_uri !== b.redirect_uri || grant.resource !== b.resource || !/^[A-Za-z0-9._~-]{43,128}$/.test(b.code_verifier || '') || await relayHash(b.code_verifier) !== grant.challenge) failure('invalid_grant'); db.codes = db.codes.filter(c => c !== grant); }
          else if (b.grant_type === 'refresh_token') { grant = db.tokens.find(t => t.refresh === digest); if (!grant || grant.client_id !== b.client_id || grant.resource !== b.resource) failure('invalid_grant'); db.tokens = db.tokens.filter(t => t !== grant); }
          else failure('unsupported_grant_type');
          const access = opaque(), refresh = opaque(); if (db.tokens.length >= 50) failure('token_limit', 429);
          db.tokens.push({ id: opaque(), access: await relayHash(access), refresh: await relayHash(refresh), client_id: grant.client_id, resource, scope: grant.scope, accessExpires: Date.now() + 3600000, expires: Date.now() + 30 * 86400000 });
          return json({ access_token: access, refresh_token: refresh, token_type: 'Bearer', expires_in: 3600, scope: grant.scope }); });
      }
      if (suffix === '/oauth/revoke' && req.method === 'POST') { const b = await input(req, true), hash = await relayHash(b.token || ''); const removed = await this.change(db => { const ids = db.tokens.filter(t => t.access === hash || t.refresh === hash).map(t => t.id); db.tokens = db.tokens.filter(t => !ids.includes(t.id)); return ids; }); for (const j of this.jobs.values()) if (removed.includes(j.grant)) j.finish(json({ error: 'access_revoked' }, 401)); return json({}); }
      if (suffix !== '/mcp') failure('not_found', 404);
      const hash = await relayHash(bearer || ''), grant = db.tokens.find(t => t.access === hash && t.resource === resource && t.accessExpires > Date.now());
      if (!grant) return json({ error: 'unauthorized' }, 401, { 'WWW-Authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource", scope="${scopes.join(' ')}"` });
      if (!grant.scope.split(' ').includes(scopes[0])) failure('insufficient_scope', 403);
      if (req.method !== 'POST') failure('POST only', 405);
      const msg = await input(req);
      if (!msg || Array.isArray(msg) || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string' || (msg.id !== undefined && !['string', 'number'].includes(typeof msg.id))) failure('invalid_request');
      if (msg.id === undefined && msg.method.startsWith('notifications/')) return new Response(null, { status: 202 });
      if (msg.id === undefined || !relayMethods.has(msg.method)) failure('invalid_method');
      if (msg.method === 'tools/call' && ['apply_changes', 'undo_changes'].includes(msg.params?.name)) failure('unsafe_tool', 403);
      if (msg.method === 'tools/call' && msg.params?.name === 'propose_changes' && !grant.scope.split(' ').includes(scopes[1])) failure('insufficient_scope', 403);
      if (this.jobs.size >= 4) failure('busy', 429);
      if (!db.lastPoll || Date.now() - db.lastPoll > 45000) failure('installation_offline', 503);
      return await new Promise(resolve => { const id = opaque(); const timer = setTimeout(() => finish(json({ error: 'local_timeout' }, 504)), 45000); const finish = response => { clearTimeout(timer); this.jobs.delete(id); resolve(response); }; this.jobs.set(id, { id, nonce: opaque(), grant: grant.id, scope: grant.scope, message: msg, expires: Date.now() + 45000, dispatched: false, finish }); });
    } catch (e) { return json({ error: e.status ? e.message : 'relay_error' }, e.status || 500); }
  }
}
