// /api/sources on the real server (in-process, temp data folder, fake claude CLI):
// discovery, adding/editing/removing sources, the tools list, the test fetch,
// capabilities in /api/connections, and the safeguards.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude-source.mjs');
let dir, port, srv, saved;
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const h = { Host: `localhost:${port}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' } : {}), ...headers };
    const req = request({ host: '127.0.0.1', port, method, path, headers: h }, (r) => {
      let data = ''; r.setEncoding('utf8');
      r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} res({ status: r.statusCode, json, text: data }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sources-server-'));
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  process.env.CLAUDE_CLI_PATH = FAKE;
  process.env.FAKE_SOURCE_MODE = 'ok';
  // A home folder of our own: no ~/.claude.json, so no user-scope MCP servers.
  saved = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME };
  process.env.USERPROFILE = dir; process.env.HOME = dir;
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(FAKE);
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => {
  await srv?.close();
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(null);
  delete process.env.CLAUDE_CLI_PATH; delete process.env.FAKE_SOURCE_MODE;
  for (const [k, v] of Object.entries(saved || {})) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  rmSync(dir, { recursive: true, force: true });
});

test('GET /api/sources: the sources, what claude mcp list shows, capabilities', async () => {
  const r = await call('GET', '/api/sources?refresh=1');
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.servers.map(s => [s.name, s.status]), [['claude.ai Bank', 'ok'], ['claude.ai Gmail', 'auth'], ['my-cal', 'ok'], ['files', 'error']]);
  assert.ok(!r.text.includes('--token') && !r.text.includes('secret'), 'no command lines reach the page');
  assert.equal(r.json.servers.find(s => s.name === 'my-cal').usable, false, 'not a user-scope server here: not usable');
  const bank = r.json.sources.find(s => s.id === 'bank-aureli');
  assert.equal(bank.health.state, 'ok');
  assert.equal(r.json.sources.find(s => s.id === 'email-gmail').health.state, 'auth');
  assert.equal(r.json.sources.find(s => s.id === 'calendar-google').health.state, 'setup', 'not in claude mcp list');
  assert.equal(r.json.capabilities.bank.available, true);
  assert.equal(r.json.capabilities.email.available, false);
  assert.equal(r.json.persisted, false);
  const c = await call('GET', '/api/connections');
  assert.equal(c.json.capabilities.bank.available, true);
  assert.ok(Array.isArray(c.json.sources));
});

test('add an iCal source, rename it, switch an account off, remove it; the link never goes back to the page', async () => {
  const add = await call('POST', '/api/sources', { source: { capability: 'calendar', kind: 'ical', url: 'webcal://cal.example.org/private-token/basic.ics', label: 'Uni <img src=x onerror=alert(1)>', colour: 'teal' } });
  assert.equal(add.status, 201);
  const id = add.json.source.id;
  assert.equal(add.json.source.url, undefined, 'the link is not sent back, even on create');
  assert.ok(!add.text.includes('private-token'));
  assert.match(id, /^calendar-uni-img-src-x-[0-9a-f]{4}$|^calendar-[a-z0-9-]+$/);
  assert.equal(add.json.source.label, 'Uni img src=x onerror=alert(1)', 'angle brackets are dropped');
  const list = await call('GET', '/api/sources');
  const s = list.json.sources.find(x => x.id === id);
  assert.equal(s.url, undefined);
  assert.equal(s.urlHint, 'cal.example.org/…');
  assert.ok(!list.text.includes('private-token'));
  const stored = JSON.parse(readFileSync(join(dir, 'sources.json'), 'utf8'));
  assert.equal(stored.sources.find(x => x.id === id).url, 'https://cal.example.org/private-token/basic.ics', 'kept on the server, as https');
  assert.equal((await call('PUT', '/api/sources/' + id, { label: 'Timetable' })).json.source.label, 'Timetable');
  assert.equal((await call('PUT', '/api/sources/' + id, { colour: 'not-a-colour' })).json.source.colour, 'indigo');
  assert.equal((await call('PUT', '/api/sources/nope-nope', { label: 'x' })).status, 404);
  assert.equal((await call('POST', '/api/sources', { source: { capability: 'calendar', kind: 'ical', url: 'http://plain.example/a.ics' } })).status, 400);
  assert.equal((await call('POST', '/api/sources', { source: { capability: 'bank', kind: 'mcp', server: 'monzo', tools: ['transfer_money'] } })).status, 400);
  const dup = await call('POST', '/api/sources', { source: { capability: 'bank', kind: 'mcp', server: 'claude.ai Bank' } });
  assert.equal(dup.status, 400, 'one source per server and capability');
  assert.equal((await call('DELETE', '/api/sources/' + id)).json.removed, id);
  assert.equal((await call('DELETE', '/api/sources/' + id)).status, 404);
});

test('safeguards: cross-site writes refused, wrong host refused', async () => {
  const cross = await call('POST', '/api/sources', { source: { capability: 'calendar', kind: 'ical', url: 'https://a.example/a.ics' } }, { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(cross.status, 403);
  const del = await call('DELETE', '/api/sources/bank-csv', undefined, { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' });
  assert.equal(del.status, 403);
  const host = await call('GET', '/api/sources', undefined, { Host: 'evil.example' });
  assert.equal(host.status, 421);
});

test('POST /api/sources/tools: read tools pre-selected, write tools locked', async () => {
  const r = await call('POST', '/api/sources/tools', { server: 'claude.ai Bank' });
  assert.equal(r.status, 200);
  const by = Object.fromEntries(r.json.tools.map(t => [t.name, t]));
  assert.equal(by.list_items.safety, 'read');
  assert.equal(by.create_item.safety, 'write');
  assert.equal(by.create_item.selected, false);
  assert.equal(by.delete_item.safety, 'write');
  assert.ok(!r.json.tools.some(t => t.name.includes('read_all')), 'only that server\'s tools');
  const bad = await call('POST', '/api/sources/tools', { server: 'my-cal' });
  assert.equal(bad.status, 400, 'a server the dashboard cannot load on its own');
});

test('Test now persists readiness for an existing source without clearing the previous sync failure', async () => {
  const { createSourcesService } = await import('../lib/sources.mjs');
  const svc = createSourcesService({ dataDir: dir });
  await svc.noteSync('bank-aureli', { ok: false, code: 'TOOL_MISSING', error: 'Old startup failure.' });
  await new Promise(resolve => setTimeout(resolve, 2));
  const testResult = await call('POST', '/api/sources/test', { source: { id: 'bank-aureli' } });
  assert.equal(testResult.json.ok, true); assert.equal(testResult.json.level, 'tools');
  const bank = (await call('GET', '/api/sources?discover=cached')).json.sources.find(s => s.id === 'bank-aureli');
  assert.equal(bank.lastCheck.ok, true); assert.equal(bank.health.connectionState, 'ok');
  assert.equal(bank.health.syncWarning.code, 'TOOL_MISSING'); assert.equal(bank.lastSync, null);
  await svc.noteSync('bank-aureli', { ok: true });
  assert.equal((await svc.get('bank-aureli')).lastError, null);
});

test('POST /api/sources/test: an iCal link inside the network is refused before anything is fetched', async () => {
  const r = await call('POST', '/api/sources/test', { source: { capability: 'calendar', kind: 'ical', url: 'https://192.168.1.10/cal.ics' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.code, 'PRIVATE_ADDRESS');
  const csv = await call('POST', '/api/sources/test', { source: { capability: 'bank', kind: 'csv' } });
  assert.equal(csv.json.ok, true);
});
