// Synthetic Worker/Durable Object runtime and temporary local data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import worker, { OpenDashRelay, relayHash } from '../cloudflare/relay-worker.mjs';
import { createHostedRelay } from '../lib/hosted-relay.mjs';
import { writeJson } from '../lib/fsutil.mjs';
const ORIGIN = 'https://relay.example.test', REDIRECT = 'https://claude.ai/api/mcp/auth_callback', verifier = 'v'.repeat(64);
function runtime() {
  const objects = new Map(), env = { PUBLIC_ORIGIN: ORIGIN };
  env.RELAY = { idFromName: name => name, get: name => {
    if (!objects.has(name)) { const values = new Map(); const storage = { writes: 0, get: async key => structuredClone(values.get(key)), put: async (key, value) => { storage.writes++; values.set(key, structuredClone(value)); } }; objects.set(name, { storage, object: new OpenDashRelay({ storage }, env) }); }
    return { fetch: request => objects.get(name).object.fetch(request) };
  } };
  const fetcher = (url, opts) => worker.fetch(url instanceof Request ? url : new Request(url, opts), env);
  const request = (path, { method = 'GET', body, token, form = false } = {}) => fetcher(ORIGIN + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, ...(body !== undefined ? { body: form ? new URLSearchParams(body).toString() : JSON.stringify(body) } : {}) });
  const install = async () => { const r = await request('/installations', { method: 'POST', body: {} }); assert.equal(r.status, 201); return r.json(); };
  return { objects, env, fetcher, request, install };
}
async function authorization(rt, install, { approve = true, scope = 'opendash:read opendash:propose' } = {}) {
  const base = '/i/' + install.installation, resource = ORIGIN + base + '/mcp';
  const client = await (await rt.request(base + '/oauth/register', { method: 'POST', body: { redirect_uris: [REDIRECT], client_name: 'Synthetic Claude' } })).json();
  const q = new URLSearchParams({ client_id: client.client_id, redirect_uri: REDIRECT, response_type: 'code', state: 'synthetic-state', resource, code_challenge: await relayHash(verifier), code_challenge_method: 'S256', scope });
  const start = await rt.request(base + '/oauth/authorize?' + q); assert.equal(start.status, 302);
  const ticket = new URL(start.headers.get('Location')).searchParams.get('ticket');
  const poll = await (await rt.request(base + '/agent/poll', { method: 'POST', token: install.secret, body: { wait: false } })).json();
  const pending = poll.requests.find(r => r.id === ticket); assert.ok(pending);
  if (approve) assert.equal((await rt.request(base + '/agent/approve', { method: 'POST', token: install.secret, body: { id: ticket, code: pending.displayCode } })).status, 200);
  return { client, ticket, pending, base, resource, q };
}
async function grant(rt, install, options) {
  const a = await authorization(rt, install, options);
  const done = await rt.request(a.base + '/oauth/continue?ticket=' + a.ticket); assert.equal(done.status, 302);
  const url = new URL(done.headers.get('Location')); assert.equal(url.searchParams.get('state'), 'synthetic-state');
  const input = { grant_type: 'authorization_code', client_id: a.client.client_id, redirect_uri: REDIRECT, code: url.searchParams.get('code'), resource: a.resource, code_verifier: verifier };
  const response = await rt.request(a.base + '/oauth/token', { method: 'POST', form: true, body: input }); assert.equal(response.status, 200);
  return { ...a, input, tokens: await response.json() };
}
const eventually = async fn => { for (let i = 0; i < 100; i++) { if (fn()) return; await new Promise(r => setTimeout(r, 5)); } throw new Error('condition timed out'); };

test('hosted relay unknown installation creates no persistent records; main dashboard/API is never routed', async () => {
  const rt = runtime(), id = 'x'.repeat(43);
  assert.equal((await rt.request('/i/' + id + '/mcp')).status, 404); assert.equal(rt.objects.get(id).storage.writes, 0);
  for (const path of ['/api/state', '/index.html', '/i/' + id + '/internal/init', '/internal/init']) assert.equal((await rt.request(path)).status, 404);
  assert.equal((await rt.fetcher('https://other.example.test/health')).status, 421);
  assert.equal((await rt.fetcher(ORIGIN + '/health', { headers: { Origin: 'https://evil.example.test' } })).status, 403);
});

test('hosted relay OAuth needs matching-code local approval, exact resource and PKCE; installation secret is hashed', async () => {
  const rt = runtime(), inst = await rt.install(), a = await authorization(rt, inst, { approve: false });
  const waiting = await rt.request(a.base + '/oauth/continue?ticket=' + a.ticket); assert.equal(waiting.status, 200); assert.ok((await waiting.text()).includes(a.pending.displayCode));
  assert.equal((await rt.request(a.base + '/agent/approve', { method: 'POST', body: { id: a.ticket, code: a.pending.displayCode }, token: 'wrong'.padEnd(43, 'x') })).status, 401);
  assert.equal((await rt.request(a.base + '/agent/approve', { method: 'POST', body: { id: a.ticket, code: 'WRONG123' }, token: inst.secret })).status, 400);
  assert.equal((await rt.request(a.base + '/agent/approve', { method: 'POST', body: { id: a.ticket, code: a.pending.displayCode }, token: inst.secret })).status, 200);
  const done = await rt.request(a.base + '/oauth/continue?ticket=' + a.ticket), code = new URL(done.headers.get('Location')).searchParams.get('code');
  const input = { grant_type: 'authorization_code', client_id: a.client.client_id, redirect_uri: REDIRECT, resource: a.resource, code, code_verifier: verifier };
  for (const bad of [{ code_verifier: 'z'.repeat(64) }, { resource: ORIGIN + '/another/mcp' }, { redirect_uri: REDIRECT + '/another' }]) assert.equal((await rt.request(a.base + '/oauth/token', { method: 'POST', form: true, body: { ...input, ...bad } })).status, 400);
  const tokens = await (await rt.request(a.base + '/oauth/token', { method: 'POST', form: true, body: input })).json(); assert.ok(tokens.access_token);
  assert.equal((await rt.request(a.base + '/oauth/token', { method: 'POST', form: true, body: input })).status, 400, 'code is one-use');
  const stored = JSON.stringify(await rt.objects.get(inst.installation).storage.get('state'));
  assert.ok(!stored.includes(inst.secret)); assert.ok(!stored.includes(tokens.access_token)); assert.ok(!stored.includes(tokens.refresh_token));
  const oauthAsAgent = await rt.request(a.base + '/agent/status', { method: 'POST', body: {}, token: tokens.access_token }); assert.equal(oauthAsAgent.status, 401);
});

test('hosted relay routes only to grant installation, bounds queue and rejects direct writes; responses are transient', async () => {
  const rt = runtime(), first = await rt.install(), second = await rt.install(), a = await grant(rt, first);
  assert.equal((await rt.request('/i/' + second.installation + '/mcp', { method: 'POST', token: a.tokens.access_token, body: { jsonrpc: '2.0', id: 1, method: 'ping' } })).status, 401);
  for (const name of ['apply_changes', 'undo_changes']) assert.equal((await rt.request(a.base + '/mcp', { method: 'POST', token: a.tokens.access_token, body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name } } })).status, 403);
  const replies = Array.from({ length: 4 }, (_, id) => rt.request(a.base + '/mcp', { method: 'POST', token: a.tokens.access_token, body: { jsonrpc: '2.0', id, method: 'ping' } }));
  await eventually(() => rt.objects.get(first.installation).object.jobs.size === 4);
  assert.equal((await rt.request(a.base + '/mcp', { method: 'POST', token: a.tokens.access_token, body: { jsonrpc: '2.0', id: 9, method: 'ping' } })).status, 429);
  const noJobs = await (await rt.request('/i/' + second.installation + '/agent/poll', { method: 'POST', token: second.secret, body: { wait: false } })).json(); assert.equal(noJobs.jobs.length, 0);
  const poll = await (await rt.request(a.base + '/agent/poll', { method: 'POST', token: first.secret, body: { wait: false } })).json(); assert.equal(poll.jobs.length, 4);
  const job = poll.jobs[0]; assert.equal((await rt.request(a.base + '/agent/result', { method: 'POST', token: first.secret, body: { id: job.id, nonce: 'wrong', response: { jsonrpc: '2.0', id: job.message.id, result: {} } } })).status, 409);
  for (const job of poll.jobs) assert.equal((await rt.request(a.base + '/agent/result', { method: 'POST', token: first.secret, body: { id: job.id, nonce: job.nonce, response: { jsonrpc: '2.0', id: job.message.id, result: { synthetic: 'private-response' } } } })).status, 200);
  for (const response of await Promise.all(replies)) assert.equal(response.status, 200);
  assert.ok(!JSON.stringify(await rt.objects.get(first.installation).storage.get('state')).includes('private-response'));
});

test('hosted relay read-only grants refuse proposals, refresh rotates and revocation removes access', async () => {
  const rt = runtime(), inst = await rt.install(), a = await grant(rt, inst, { scope: 'opendash:read' });
  assert.equal((await rt.request(a.base + '/mcp', { method: 'POST', token: a.tokens.access_token, body: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'propose_changes' } } })).status, 403);
  const refresh = { grant_type: 'refresh_token', client_id: a.client.client_id, resource: a.resource, refresh_token: a.tokens.refresh_token };
  const token = await (await rt.request(a.base + '/oauth/token', { method: 'POST', form: true, body: refresh })).json(); assert.ok(token.access_token);
  assert.equal((await rt.request(a.base + '/oauth/token', { method: 'POST', form: true, body: refresh })).status, 400);
  await rt.request(a.base + '/agent/revoke', { method: 'POST', token: inst.secret, body: {} });
  assert.equal((await rt.request(a.base + '/mcp', { method: 'POST', token: token.access_token, body: { jsonrpc: '2.0', id: 1, method: 'ping' } })).status, 401);
  await rt.request(a.base + '/agent/disconnect', { method: 'POST', token: inst.secret, body: {} });
  assert.equal((await rt.request(a.base + '/agent/status', { method: 'POST', token: inst.secret, body: {} })).status, 404);
});

test('hosted relay caps request bytes, rejects unsafe client redirects and expired grants, and clears queued requests on revoke', async () => {
  const rt = runtime(), inst = await rt.install(), a = await grant(rt, inst);
  assert.equal((await rt.request('/installations', { method: 'POST', body: { huge: 'x'.repeat(256 * 1024) } })).status, 413);
  assert.equal((await rt.request(a.base + '/oauth/register', { method: 'POST', body: { redirect_uris: ['https://claude.ai.evil.example/callback'] } })).status, 400);
  assert.equal((await rt.request(a.base + '/oauth/register', { method: 'POST', body: { redirect_uris: ['https://claude.ai/' + 'x'.repeat(512)] } })).status, 400);
  const badScope = new URLSearchParams(a.q); badScope.set('scope', 'opendash:propose');
  assert.equal((await rt.request(a.base + '/oauth/authorize?' + badScope)).status, 400);
  const waiting = rt.request(a.base + '/mcp', { method: 'POST', token: a.tokens.access_token, body: { jsonrpc: '2.0', id: 1, method: 'ping' } });
  await eventually(() => rt.objects.get(inst.installation).object.jobs.size === 1);
  await rt.request(a.base + '/agent/revoke', { method: 'POST', token: inst.secret, body: {} });
  assert.equal((await waiting).status, 401); assert.equal(rt.objects.get(inst.installation).object.jobs.size, 0);
  const second = await grant(rt, inst); const storage = rt.objects.get(inst.installation).storage;
  const db = await storage.get('state'); db.tokens.forEach(t => t.accessExpires = Date.now() - 1); await storage.put('state', db);
  assert.equal((await rt.request(second.base + '/mcp', { method: 'POST', token: second.tokens.access_token, body: { jsonrpc: '2.0', id: 1, method: 'ping' } })).status, 401);
});

test('hosted relay durable code/state limits preserve approved requests for retry', async () => {
  const rt = runtime(), inst = await rt.install(), a = await authorization(rt, inst);
  const storage = rt.objects.get(inst.installation).storage, db = await storage.get('state');
  db.codes = Array.from({ length: 20 }, (_, n) => ({ code: 'synthetic-' + n, expires: Date.now() + 60000 })); await storage.put('state', db);
  assert.equal((await rt.request(a.base + '/oauth/continue?ticket=' + a.ticket)).status, 429);
  assert.ok((await storage.get('state')).requests.some(r => r.id === a.ticket && r.approved));
  const cleared = await storage.get('state'); cleared.codes.forEach(c => c.expires = Date.now() - 1); await storage.put('state', cleared);
  assert.equal((await rt.request(a.base + '/oauth/continue?ticket=' + a.ticket)).status, 302);
  const object = rt.objects.get(inst.installation).object;
  await assert.rejects(object.change(state => { state.oversize = 'x'.repeat(128 * 1024); }), /state_limit/);
  assert.equal((await storage.get('state')).oversize, undefined, 'oversized durable mutation is not persisted');
});

test('outbound local connector links without user tunnel, isolates secrets and executes only propose-mode RPC', async () => {
  const rt = runtime(), dir = mkdtempSync(join(tmpdir(), 'hosted-relay-')); const calls = [];
  const local = createHostedRelay({ dataDir: dir, publicOrigin: ORIGIN, fetchFn: rt.fetcher, rpc: async msg => { calls.push(msg); return { jsonrpc: '2.0', id: msg.id, result: { ok: true } }; } });
  try {
    const initial = await local.link(); assert.ok(initial.endpoint); assert.ok(!JSON.stringify(initial).includes('secret'));
    const cfg = JSON.parse(readFileSync(join(dir, 'secrets', 'hosted-relay.json')));
    const a = await authorization(rt, cfg, { approve: false });
    await local.refresh(); await local.approve(a.ticket, a.pending.displayCode);
    const code = new URL((await rt.request(a.base + '/oauth/continue?ticket=' + a.ticket)).headers.get('Location')).searchParams.get('code');
    const tokens = await (await rt.request(a.base + '/oauth/token', { method: 'POST', form: true, body: { grant_type: 'authorization_code', client_id: a.client.client_id, redirect_uri: REDIRECT, resource: a.resource, code, code_verifier: verifier } })).json();
    const result = await rt.request(a.base + '/mcp', { method: 'POST', token: tokens.access_token, body: { jsonrpc: '2.0', id: 1, method: 'ping' } });
    assert.equal(result.status, 200); assert.equal(calls.length, 1);
    assert.equal((await local.refresh()).linked, true);
    await local.disconnect(); assert.equal((await local.status()).configured, false);
  } finally { await local.stop(); rmSync(dir, { recursive: true, force: true }); }
});

test('published relay service configuration needs no per-user environment setup and remains unavailable when absent', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'relay-service-config-'));
  const serviceFile = join(dir, 'service.json'), previous = process.env.OPENDASH_RELAY_ORIGIN;
  delete process.env.OPENDASH_RELAY_ORIGIN;
  try {
    const local = createHostedRelay({ dataDir: dir, serviceFile });
    assert.equal((await local.status()).available, false);
    await assert.rejects(local.link(), /not been published/);
    await writeJson(serviceFile, { publicOrigin: ORIGIN }); assert.equal((await local.status()).available, true);
    await writeJson(serviceFile, { publicOrigin: 'https://127.0.0.1' }); await assert.rejects(local.status(), /invalid/);
  } finally { if (previous !== undefined) process.env.OPENDASH_RELAY_ORIGIN = previous; rmSync(dir, { recursive: true, force: true }); }
});
