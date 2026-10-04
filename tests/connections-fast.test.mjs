// User reports, 4 Oct: the MCP server list ignored a server just set up, the
// connections answer waited for `claude mcp list` (Finances said "checking"
// with no bank connected), and the workspace icon could not be chosen.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSourcesService, withConfiguredServers } from '../lib/sources.mjs';
import { normAppIcon, validateConfig } from '../lib/datadir.mjs';
import { addUserMcpServer } from '../lib/claude-runner.mjs';

test('withConfiguredServers: a server added to the config shows at once, a removed one goes', () => {
  const listed = [
    { name: 'claude.ai Gmail', kind: 'claude.ai', status: 'ok' },
    { name: 'old', kind: 'stdio', status: 'ok', userScope: true },
    { name: 'project-one', kind: 'stdio', status: 'ok' },          // not user scope: never dropped
  ];
  const r = withConfiguredServers(listed, { dashboard: { command: 'node', args: ['C:/x/mcp/server.mjs'] }, web: { type: 'http', url: 'https://mcp.example.org/x' } });
  assert.equal(r.changed, true);
  assert.deepEqual(r.servers.map(s => s.name), ['claude.ai Gmail', 'project-one', 'dashboard', 'web']);
  const d = r.servers.find(s => s.name === 'dashboard');
  assert.equal(d.status, 'pending'); assert.equal(d.kind, 'stdio'); assert.equal(d.host, 'node'); assert.equal(d.usable, true);
  assert.equal(r.servers.find(s => s.name === 'web').host, 'mcp.example.org');
  assert.equal(withConfiguredServers(null, { a: {} }).servers, null);
  assert.equal(withConfiguredServers([{ name: 'a', kind: 'stdio', userScope: true }], { a: { command: 'x' } }).changed, false);
});

test('status: the list follows the real config; background mode never waits for claude mcp list', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'conn-fast-'));
  try {
    let defs = { a: { command: 'node', args: ['a.js'] } };
    let calls = 0;
    const svc = createSourcesService({ dataDir: dir, userDefs: () => defs, list: async () => { calls++; return { text: 'a: node a.js - ✔ Connected', ms: 1 }; } });
    const s1 = await svc.status({});
    assert.deepEqual(s1.servers.map(s => s.name), ['a']);
    defs = { a: defs.a, dashboard: { command: 'node', args: ['mcp/server.mjs'] } };
    const s2 = await svc.status({ discover: 'cached' });
    assert.deepEqual(s2.servers.map(s => s.name), ['a', 'dashboard']);
    assert.equal(s2.servers[1].status, 'pending');
    defs = { dashboard: defs.dashboard };
    const s3 = await svc.status({ discover: 'cached' });
    assert.deepEqual(s3.servers.map(s => s.name), ['dashboard']);
    assert.ok(calls >= 1);

    // A list that never answers: 'background' still answers at once, from the local records.
    const slow = createSourcesService({ dataDir: dir, userDefs: () => ({}), list: () => new Promise(() => {}) });
    const t0 = Date.now();
    const st = await slow.status({ discover: 'background' });
    assert.ok(Date.now() - t0 < 2000);
    assert.equal(st.servers, null);
    assert.equal(st.discovery.pending, true);
    assert.equal(st.capabilities.bank.available, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('addUserMcpServer refuses bad names and commands before running anything', async () => {
  await assert.rejects(addUserMcpServer({ name: 'bad name;rm', command: 'node' }), { code: 'BAD_REQUEST' });
  await assert.rejects(addUserMcpServer({ name: 'dashboard', command: 'node', args: ['a\nb'] }), { code: 'BAD_REQUEST' });
  await assert.rejects(addUserMcpServer({ name: 'dashboard', command: '' }), { code: 'BAD_REQUEST' });
});

test('config.appIcon: automatic, logo, initial, a sprite icon or an emoji; anything else is refused', () => {
  assert.equal(normAppIcon(''), '');
  assert.equal(normAppIcon('logo'), 'logo');
  assert.equal(normAppIcon('initial'), 'initial');
  assert.equal(normAppIcon('rocket'), 'rocket');
  assert.equal(normAppIcon('🚀'), '🚀');
  assert.equal(normAppIcon('no-such-icon-here'), '');
  assert.equal(normAppIcon('<b>'), '');
  assert.equal(validateConfig({}).config.appIcon, '');
  assert.equal(validateConfig({ appIcon: 'rocket' }).config.appIcon, 'rocket');
  assert.match(validateConfig({ appIcon: '<script>' }).errors.join(';'), /appIcon/);
});
