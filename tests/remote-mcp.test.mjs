import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request as httpRequest } from 'node:http';
import { createRemoteAuth, remoteHash, remoteOrigin } from '../lib/remote-mcp-auth.mjs';
import { createRemoteServer, bridgeMcp } from '../mcp/remote-server.mjs';
import { makeDataDir } from './fixtures/actions-state.mjs';

const origin = 'https://mcp.example.org';
const redirect = 'https://claude.ai/api/mcp/auth_callback';
const verifier = 'x'.repeat(64);
async function authorize(auth, { approve = true, scope } = {}) {
  const client = await auth.register({ client_name: 'Synthetic Claude', redirect_uris: [redirect], token_endpoint_auth_method: 'none' });
  const q = { client_id: client.client_id, redirect_uri: redirect, response_type: 'code', state: 'synthetic-state', resource: origin + '/mcp', code_challenge: remoteHash(verifier), code_challenge_method: 'S256', ...(scope ? { scope } : {}) };
  const request = await auth.authorize(q);
  if (approve) await auth.approve(request.ticket);
  return { client, request, q };
}
async function grant(auth, options) {
  const a = await authorize(auth, options);
  const done = await auth.continue(a.request.ticket);
  const code = new URL(done.redirect).searchParams.get('code');
  const input = { grant_type: 'authorization_code', client_id: a.client.client_id, redirect_uri: redirect, code_verifier: verifier, resource: origin + '/mcp', code };
  return { ...a, input, tokens: await auth.token(input) };
}
test('remote OAuth requires local approval, PKCE, exact callback and resource; stores hashes only', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'remote-oauth-')); let clock = 100000;
  const auth = createRemoteAuth({ dataDir: dir, publicOrigin: origin, now: () => clock });
  try {
    for (const bad of ['http://mcp.example.org', 'https://localhost', 'https://mcp.example.org/path', 'https://u:p@mcp.example.org', 'https://mcp.example.org?x=1']) assert.throws(() => remoteOrigin(bad));
    await assert.rejects(auth.register({ redirect_uris: ['https://claude.ai.attacker.example/callback'] }));
    const a = await authorize(auth, { approve: false });
    assert.equal((await auth.continue(a.request.ticket)).waiting, true);
    assert.equal((await auth.pending())[0].displayCode, a.request.displayCode);
    await assert.rejects(auth.authorize({ ...a.q, redirect_uri: 'https://claude.ai/not-registered' }));
    await assert.rejects(auth.authorize({ ...a.q, resource: origin + '/other' }));
    await assert.rejects(auth.authorize({ ...a.q, code_challenge_method: 'plain' }));
    await assert.rejects(auth.authorize({ ...a.q, scope: 'opendash:apply' }));
    await auth.approve(a.request.ticket);
    const done = await auth.continue(a.request.ticket), url = new URL(done.redirect);
    assert.equal(url.searchParams.get('state'), 'synthetic-state');
    await assert.rejects(auth.continue(a.request.ticket));
    const input = { grant_type: 'authorization_code', code: url.searchParams.get('code'), client_id: a.client.client_id, redirect_uri: redirect, code_verifier: verifier, resource: origin + '/mcp' };
    await assert.rejects(auth.token({ ...input, code_verifier: 'y'.repeat(64) }));
    await assert.rejects(auth.token({ ...input, resource: origin + '/other' }));
    const tokens = await auth.token(input);
    await assert.rejects(auth.token(input), 'code is single-use');
    assert.ok(await auth.verify(tokens.access_token));
    const stored = readFileSync(join(dir, 'secrets', 'remote-mcp-auth.json'), 'utf8');
    assert.ok(!stored.includes(tokens.access_token)); assert.ok(!stored.includes(tokens.refresh_token));
    clock += 3600001; assert.equal(await auth.verify(tokens.access_token), null);
    const refresh = { grant_type: 'refresh_token', refresh_token: tokens.refresh_token, client_id: a.client.client_id, resource: origin + '/mcp' };
    const next = await auth.token(refresh); await assert.rejects(auth.token(refresh), 'refresh rotates');
    assert.ok(await auth.verify(next.access_token));
    await auth.revoke(next.refresh_token); assert.equal(await auth.verify(next.access_token), null);
    const exp = await authorize(auth, { approve: false }); clock += 600001;
    await assert.rejects(auth.approve(exp.request.ticket));
    const live = await grant(auth); await auth.revokeAll(); assert.equal(await auth.verify(live.tokens.access_token), null);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('remote transport challenges unauthenticated calls and publishes only MCP/OAuth', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'remote-http-')); const seen = [];
  const { server, auth } = createRemoteServer({ dataDir: dir, publicOrigin: origin, rpc: async msg => { seen.push(msg); return { jsonrpc: '2.0', id: msg.id, result: {} }; } });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const denied = await fetch(base + '/mcp', { method: 'POST' }); assert.equal(denied.status, 401); assert.match(denied.headers.get('www-authenticate'), /oauth-protected-resource\/mcp/);
    assert.equal((await fetch(base + '/api/query')).status, 404);
    assert.equal((await fetch(base + '/')).status, 404);
    const metadata = await (await fetch(base + '/.well-known/oauth-authorization-server')).json(); assert.deepEqual(metadata.code_challenge_methods_supported, ['S256']);
    const { tokens } = await grant(auth, { scope: 'opendash:read' });
    const headers = { Authorization: 'Bearer ' + tokens.access_token, 'Content-Type': 'application/json' };
    const rpc = (method, params, extra = {}) => fetch(base + '/mcp', { method: 'POST', headers: { ...headers, ...(extra.headers || {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
    assert.equal((await fetch(base + '/mcp', { headers })).status, 405);
    assert.equal((await rpc('ping', {}, { headers: { Origin: 'https://attacker.example' } })).status, 403);
    const wrongHost = await new Promise((resolve, reject) => {
      const r = httpRequest(base + '/mcp', { method: 'POST', headers: { ...headers, Host: 'attacker.example' } }, response => { response.resume(); resolve(response.statusCode); });
      r.on('error', reject); r.end(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }));
    });
    assert.equal(wrongHost, 421);
    assert.equal((await rpc('ping', {}, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
    assert.equal((await rpc('tools/call', { name: 'propose_changes' })).status, 403);
    assert.equal((await rpc('ping', {})).status, 200); assert.equal(seen.length, 1);
    const note = await fetch(base + '/mcp', { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) }); assert.equal(note.status, 202);
    const bad = await fetch(base + '/mcp', { method: 'POST', headers, body: '{' }); assert.equal(bad.status, 400);
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); rmSync(dir, { recursive: true, force: true }); }
});
test('remote bridge reuses existing propose-only MCP and cannot apply changes', async () => {
  const dir = makeDataDir();
  try {
    const list = await bridgeMcp(dir, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    assert.ok(list.result.tools.some(t => t.name === 'propose_changes'));
    assert.ok(!list.result.tools.some(t => t.name === 'apply_changes'));
    const denied = await bridgeMcp(dir, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'apply_changes', arguments: { ops: [] } } });
    assert.ok(denied.error || denied.result.isError);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
