// Settings / sharing / connections routes on a real in-process server with a
// fresh data folder (a new user): onboarding, demo data, exports, import,
// backups, reset, diagnostics, connections - and their safeguards.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readZip, createZip } from '../lib/zip.mjs';

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude.mjs');
let dir, port, srv;

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function raw(method, path, { headers = {}, body, binary = false } = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
      const chunks = [];
      r.on('data', d => chunks.push(d));
      r.on('end', () => {
        const buf = Buffer.concat(chunks);
        let json = null; try { json = JSON.parse(buf.toString('utf8')); } catch {}
        res({ status: r.statusCode, headers: r.headers, buf, text: binary ? null : buf.toString('utf8'), json });
      });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(Buffer.isBuffer(body) ? body : typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}
const same = () => ({ Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' });
const post = (path, body = {}) => raw('POST', path, { headers: { 'Content-Type': 'application/json', ...same() }, body });

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'settings-test-'));
  process.env.CLAUDE_CLI_PATH = FAKE;
  process.env.FAKE_CLAUDE_MODE = 'ok';
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(FAKE);
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
});
after(async () => {
  await srv?.close();
  delete process.env.CLAUDE_CLI_PATH; delete process.env.FAKE_CLAUDE_MODE;
  rmSync(dir, { recursive: true, force: true });
});

test('a brand-new data folder asks for the welcome set-up', async () => {
  const r = await raw('GET', '/api/settings/info');
  assert.equal(r.status, 200);
  assert.equal(r.json.onboarding.needed, true);
  assert.equal(r.json.backups, 0);
  // finishing it (config.onboardedAt) turns it off even with no tasks
  const put = await raw('PUT', '/api/config', { headers: { 'Content-Type': 'application/json', ...same() }, body: { userName: 'Sam', onboardedAt: new Date().toISOString(), weekStart: 'Sun' } });
  assert.equal(put.status, 200, put.text);
  assert.equal((await raw('GET', '/api/settings/info')).json.onboarding.needed, false);
});

test('demo data loads into an empty dashboard only', async () => {
  const r = await post('/api/demo/load');
  assert.equal(r.status, 200, r.text);
  assert.ok(r.json.tasks >= 50 && r.json.people >= 4 && r.json.events > 0, JSON.stringify(r.json));
  const st = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
  assert.equal(st.custom.length, r.json.tasks);
  assert.ok(st.people.every(p => !p.email || /@example\.(com|org|net)$/.test(p.email)), 'only invented addresses');
  assert.equal((await post('/api/demo/load')).status, 409, 'never over real tasks');
  const cfg = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
  assert.equal(cfg.userName, 'Sam', 'a name the user chose is kept');
});

test('export a clean copy of the app: same-origin only, and nothing personal inside', async () => {
  const cross = await raw('GET', '/api/settings/export-app', { headers: { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' }, binary: true });
  assert.equal(cross.status, 403);
  const r = await raw('GET', '/api/settings/export-app', { headers: { 'Sec-Fetch-Site': 'same-origin' }, binary: true });
  assert.equal(r.status, 200);
  assert.match(r.headers['content-type'], /application\/zip/);
  assert.match(r.headers['content-disposition'], /attachment; filename="opendash-v[\d.]+\.zip"/);
  const names = readZip(r.buf).map(e => e.name.replace(/^[^/]+\//, ''));
  for (const must of ['package.json', 'serve.mjs', 'build.mjs', 'start-opendash.bat', 'start-opendash.sh', 'start-dashboard.bat', 'start-dashboard.sh', 'assets/brand/favicon.svg', 'README.md', 'LICENSE', 'THIRD_PARTY_NOTICES.md',
    'mcp/server.mjs', 'server/index.mjs', 'lib/claude-runner.mjs', 'tools/migrate.mjs', 'vendor/fonts/InterVariable-latin.woff2']) assert.ok(names.includes(must), must);
  for (const n of names) {
    assert.ok(!/^(data|state|secrets|logs|backups|node_modules|\.git|\.claude)\//.test(n) || n === 'data/README.txt', n);
    assert.ok(!/(^|\/)\.env|apply_sync\.py|local-token|runtime\.json|\.lock$/.test(n), n);
  }
});

test('export all data, then import it back (dry run first); the old data is backed up', async () => {
  const cross = await raw('GET', '/api/settings/export-data', { headers: { 'Sec-Fetch-Site': 'cross-site', Origin: 'https://evil.example' }, binary: true });
  assert.equal(cross.status, 403, 'a link on another site cannot download your data');
  const r = await raw('GET', '/api/settings/export-data', { headers: { 'Sec-Fetch-Site': 'same-origin' }, binary: true });
  assert.equal(r.status, 200);
  const zip = r.buf;
  const names = readZip(zip).map(e => e.name.replace(/^[^/]+\//, ''));
  assert.ok(names.includes('state/dashboard-state.json') && names.includes('config.json'));
  assert.ok(!names.some(n => /local-token|connections\.json|logs\/|secrets\//.test(n)));
  const zh = { 'Content-Type': 'application/zip', ...same() };
  const dry = await raw('POST', '/api/settings/import-data?dryRun=1', { headers: zh, body: zip });
  assert.equal(dry.status, 200, dry.text);
  assert.ok(dry.json.tasks > 0);
  assert.equal((await raw('POST', '/api/settings/import-data', { headers: { 'Content-Type': 'text/plain', ...same() }, body: zip })).status, 415);
  assert.equal((await raw('POST', '/api/settings/import-data', { headers: { 'Content-Type': 'application/zip', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' }, body: zip })).status, 403);
  const bad = await raw('POST', '/api/settings/import-data', { headers: zh, body: createZip([{ name: '../x.json', data: '{}' }].map(e => ({ ...e, name: 'ok/x.txt' }))) });
  assert.equal(bad.status, 400);
  const imp = await raw('POST', '/api/settings/import-data', { headers: zh, body: zip });
  assert.equal(imp.status, 200, imp.text);
  assert.ok(imp.json.backup.startsWith('pre-import-'));
  assert.ok(existsSync(join(dir, 'backups', imp.json.backup)));
});

test('backups: back up now, list, restore', async () => {
  const now = await post('/api/settings/backups/now');
  assert.equal(now.status, 200, now.text);
  const list = (await raw('GET', '/api/settings/backups')).json.backups;
  assert.ok(list.some(b => b.name === now.json.name));
  const info = await raw('GET', '/api/settings/backups/info?name=' + encodeURIComponent(now.json.name));
  assert.ok(info.json.tasks > 0);
  assert.equal((await raw('GET', '/api/settings/backups/info?name=..%2Fconfig.json')).status, 400);
  const res = await post('/api/settings/backups/restore', { name: now.json.name });
  assert.equal(res.status, 200, res.text);
});

test('diagnostics: facts, connection statuses and a log tail, with the data path scrubbed from the copy text', async () => {
  const r = await raw('GET', '/api/settings/diagnostics');
  assert.equal(r.status, 200);
  assert.equal(r.json.app.version.split('.').length, 3);
  assert.ok(r.json.connections.claude);
  assert.ok(!r.json.text.includes(dir), 'data folder path not in the copied text');
  assert.ok(r.json.log.length > 0);
});

test('connections: list shape, probe of an unknown id, MCP install info', async () => {
  const r = await raw('GET', '/api/connections');
  assert.equal(r.status, 200);
  for (const id of ['claude', 'gmail', 'calendar', 'bank', 'mcp', 'google']) assert.ok(r.json[id] && 'state' in r.json[id], id);
  assert.equal(typeof r.json.cli.installed, 'boolean');
  assert.ok(!('path' in r.json.cli));
  assert.equal((await post('/api/connections/probe', { id: 'dropbox' })).status, 400);
  assert.equal((await raw('POST', '/api/connections/probe', { headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' }, body: { id: 'claude' } })).status, 403);
  const m = await raw('GET', '/api/connections/mcp');
  assert.equal(m.status, 200);
  assert.ok(m.json.install && m.json.installed && m.json.installed.summary);
  const t = await post('/api/connections/mcp-test');
  assert.equal(t.status, 200, t.text);
  assert.equal(t.json.ok, true, t.json.error);
});

test('reset needs the typed word, backs up first and brings the welcome back', async () => {
  assert.equal((await post('/api/settings/reset', { confirm: 'yes' })).status, 400);
  const r = await post('/api/settings/reset', { confirm: 'RESET' });
  assert.equal(r.status, 200, r.text);
  assert.ok(existsSync(join(dir, 'backups', r.json.backup)));
  const info = (await raw('GET', '/api/settings/info')).json;
  assert.equal(info.onboarding.needed, true);
  const st = JSON.parse(readFileSync(join(dir, 'state', 'dashboard-state.json'), 'utf8'));
  assert.equal(st.custom.length, 0);
});
