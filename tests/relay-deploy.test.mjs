import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relayMetadata, deployRelay } from '../tools/deploy-relay.mjs';

test('relay deployment uses SQLite and no logging, credentials in arguments or plan upgrade calls', async () => {
  const first = relayMetadata('https://mcp.example.org', { initial: true });
  assert.deepEqual(first.migrations.new_sqlite_classes, ['OpenDashRelay']);
  assert.equal(first.bindings.find(x => x.name === 'PUBLIC_ORIGIN').text, 'https://mcp.example.org');
  assert.equal(first.observability.enabled, false);
  assert.equal(relayMetadata('https://mcp.example.org').migrations, undefined);
  assert.throws(() => relayMetadata('http://mcp.example.org'));
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push(url);
    assert.match(url, /^https:\/\/api.cloudflare.com\/client\/v4\/accounts\/[a-f0-9]{32}\/workers\/scripts\/opendash-relay(?:\/settings)?$/);
    assert.equal(options.redirect, 'error');
    if (!options.method) return { ok: false, status: 404, json: async () => ({ success: false, errors: [{ code: 10007 }] }) };
    const metadata = JSON.parse(await options.body.get('metadata').text());
    assert.deepEqual(metadata.migrations, first.migrations);
    assert.ok((await options.body.get('relay-worker.mjs').text()).includes('export class OpenDashRelay'));
    return { ok: true, status: 200, json: async () => ({ success: true, result: { etag: 'synthetic' } }) };
  };
  const r = await deployRelay({ accountId: 'a'.repeat(32), publicOrigin: 'https://mcp.example.org', token: 'synthetic-token', fetchFn });
  assert.equal(r.ok, true); assert.equal(calls.length, 2);
  await assert.rejects(deployRelay({ accountId: 'bad', publicOrigin: 'https://mcp.example.org', token: 'synthetic-token', fetchFn }));
  await assert.rejects(deployRelay({ accountId: 'a'.repeat(32), publicOrigin: 'https://mcp.example.org', token: 'synthetic-token', scriptName: 'unrelated-app', fetchFn }));
});
test('deploy helper refuses to overwrite another Worker and never leaks provider errors', async () => {
  const base = { accountId: 'a'.repeat(32), publicOrigin: 'https://mcp.example.org', token: 'synthetic-token' };
  await assert.rejects(deployRelay({ ...base, fetchFn: async () => ({ ok: true, status: 200, json: async () => ({ success: true, result: { bindings: [] } }) }) }), /unrelated Worker/);
  await assert.rejects(deployRelay({ ...base, fetchFn: async () => ({ ok: false, status: 403, json: async () => ({ success: false, errors: [{ code: 1, message: 'synthetic-sensitive-details' }] }) }) }), e => !e.message.includes('synthetic-sensitive-details'));
});
