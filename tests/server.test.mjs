// The whole server, in-process, on a fresh temp data dir with a fake claude CLI:
// every route keeps its behaviour and every safeguard answers as it should.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const FAKE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-claude.mjs');
let dir, port, srv;

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function raw(method, path, { headers = {}, body } = {}) {
  return new Promise((res, rej) => {
    // agent:false: a fresh connection each time. A request refused with 413
    // leaves its body unread; on a kept-alive socket the next request could
    // be reset (ECONNRESET, seen on macOS).
    const req = request({ host: '127.0.0.1', port, method, path, agent: false, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
      let data = '';
      r.setEncoding('utf8');
      r.on('data', d => { data += d; });
      r.on('end', () => { let json = null; try { json = JSON.parse(data); } catch {} res({ status: r.statusCode, headers: r.headers, text: data, json }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}
const J = { 'Content-Type': 'application/json' };

before(async () => {
  dir = mkdtempSync(join(tmpdir(), 'server-test-'));
  mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify({ userName: 'Test </script><b>User' }));
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

test('data dir layout and default files are created', () => {
  for (const f of ['config.json', 'connections.json', 'migrations.json', 'state', 'finance', 'calendar', 'email', 'logs']) {
    assert.ok(existsSync(join(dir, f)), f);
  }
});

test('index.html gets the public config injected, safely', async () => {
  const r = await raw('GET', '/');
  assert.equal(r.status, 200);
  const m = /<script id="dashboard-config" type="application\/json">(.*?)<\/script>/.exec(r.text);
  assert.ok(m, 'config tag present');
  const cfg = JSON.parse(m[1]);
  assert.equal(cfg.userName, 'Test /scriptbUser', 'angle brackets are stripped from the name');
  assert.ok(!m[1].includes('</script'), 'no raw </script> inside the tag');
  assert.ok(!('financeDir' in cfg), 'paths are not exposed');
  assert.match(r.headers['content-security-policy'], /connect-src 'self'/);
});

test('only the app is served: nothing else from the repo or the data dir', async () => {
  for (const p of ['/data/config.json', '/state/dashboard-state.json', '/server/index.mjs', '/lib/ai.mjs', '/package.json', '/../secrets/x']) {
    assert.equal((await raw('GET', p)).status, 404, p);
  }
  assert.equal((await raw('GET', '/favicon.ico')).status, 204);
});

test('Host check -> 421', async () => {
  assert.equal((await raw('GET', '/api/health', { headers: { Host: `evil.example:${port}` } })).status, 421);
  assert.equal((await raw('GET', '/', { headers: { Host: 'evil.example' } })).status, 421);
});

test('health answers with app marker and capabilities', async () => {
  const r = await raw('GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.app, 'dashboard');
  assert.equal(r.json.stateExists, false);
  assert.equal(typeof r.json.ai.available, 'boolean');
});

test('state: 404, create, read back, stale 409, no-op write, bad body 400', async () => {
  assert.equal((await raw('GET', '/api/state')).status, 404);
  const a = await raw('PUT', '/api/state', { headers: J, body: { custom: [{ id: 'x' }], _lastSave: 0 } });
  assert.equal(a.status, 200);
  assert.equal(a.json.taskCount, 1);
  assert.ok(a.json.lastSave > 0);
  const g = await raw('GET', '/api/state');
  assert.equal(g.json._lastSave, a.json.lastSave);
  const stale = await raw('PUT', '/api/state', { headers: J, body: { custom: [], _lastSave: a.json.lastSave - 1 } });
  assert.equal(stale.status, 409);
  assert.equal(stale.json.lastSave, a.json.lastSave);
  const same = await raw('PUT', '/api/state', { headers: J, body: { custom: [{ id: 'x' }], _lastSave: a.json.lastSave } });
  assert.equal(same.json.written, false);
  const beacon = await raw('POST', '/api/state', { headers: J, body: { custom: [{ id: 'y' }], _lastSave: a.json.lastSave } });
  assert.equal(beacon.status, 200);
  assert.equal((await raw('PUT', '/api/state', { headers: J, body: { nope: 1 } })).status, 400);
  assert.equal((await raw('DELETE', '/api/state')).status, 405);
});

test('mutating routes: cross-origin -> 403, non-JSON -> 415', async () => {
  const evil = { ...J, Origin: 'https://evil.example' };
  const xsite = { ...J, 'Sec-Fetch-Site': 'cross-site' };
  const otherPort = { ...J, Origin: `http://localhost:${port + 1}` };
  for (const [m, p, b] of [['PUT', '/api/state', { custom: [] }], ['POST', '/api/ai', { prompt: 'x' }], ['POST', '/api/finance/update', {}],
    ['PUT', '/api/finance/budgets', { budgets: {} }], ['POST', '/api/finance/categorise', { merchant: 'x', category: null }],
    ['POST', '/api/google/disconnect', {}], ['PUT', '/api/config', {}], ['POST', '/api/connections/probe', { id: 'claude' }]]) {
    assert.equal((await raw(m, p, { headers: evil, body: b })).status, 403, `${m} ${p} origin`);
    assert.equal((await raw(m, p, { headers: xsite, body: b })).status, 403, `${m} ${p} sec-fetch-site`);
    assert.equal((await raw(m, p, { headers: otherPort, body: b })).status, 403, `${m} ${p} other localhost port`);
  }
  assert.equal((await raw('POST', '/api/ai', { headers: { 'Content-Type': 'text/plain' }, body: '{"prompt":"x"}' })).status, 415);
  assert.equal((await raw('GET', '/api/google/connect', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
});

test('body limits -> 413', async () => {
  const big = JSON.stringify({ budgets: { x: 'a'.repeat(70 * 1024) } });
  assert.equal((await raw('PUT', '/api/finance/budgets', { headers: J, body: big })).status, 413);
  assert.equal((await raw('POST', '/api/ai', { headers: J, body: JSON.stringify({ prompt: 'a'.repeat(600 * 1024) }) })).status, 413);
});

test('AI: allowlisted model/effort only; text and JSON answers; typed errors', async () => {
  const ok = await raw('POST', '/api/ai', { headers: J, body: { prompt: 'Reply with exactly: OK', model: 'claude-opus-5-5', effort: 'medium' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.json.text, 'OK');
  assert.equal(ok.json.model, 'claude-opus-5-5');
  const js = await raw('POST', '/api/ai', { headers: J, body: { prompt: 'x', schema: { type: 'object' } } });
  assert.deepEqual(js.json.json, { ok: true, n: 3 });
  assert.equal((await raw('POST', '/api/ai', { headers: J, body: { prompt: 'x', model: 'claude-opus-5' } })).status, 400);
  assert.equal((await raw('POST', '/api/ai', { headers: J, body: { prompt: 'x', effort: 'xhigh' } })).status, 400);
  assert.equal((await raw('POST', '/api/ai', { headers: J, body: { prompt: '' } })).status, 400);
  assert.equal((await raw('GET', '/api/ai')).status, 405);
  process.env.FAKE_CLAUDE_MODE = 'usage-limit';
  try {
    const lim = await raw('POST', '/api/ai', { headers: J, body: { prompt: 'x' } });
    assert.equal(lim.status, 429);
    assert.equal(lim.json.code, 'USAGE_LIMIT');
  } finally { process.env.FAKE_CLAUDE_MODE = 'ok'; }
  const st = await raw('GET', '/api/ai/status');
  assert.deepEqual(st.json.models, ['claude-opus-5-5', 'claude-sonnet-5', 'claude-haiku-4-5']);
});

test('config: read and validated update', async () => {
  const g = await raw('GET', '/api/config');
  assert.equal(g.json.currency, 'GBP');
  assert.equal(g.json.weekStart, 'Mon');
  const bad = await raw('PUT', '/api/config', { headers: J, body: { ai: { chatModel: 'gpt-5' } } });
  assert.equal(bad.status, 400);
  const good = await raw('PUT', '/api/config', { headers: J, body: { userName: 'Sam', weekStart: 'Sun', financeDir: 'C:/x' } });
  assert.equal(good.status, 200);
  assert.equal(good.json.userName, 'Sam');
  assert.equal(JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8')).financeDir, null, 'the page cannot set paths');
});

test('finance routes keep their shapes', async () => {
  const f = await raw('GET', '/api/finance');
  assert.equal(f.status, 200);
  assert.equal(f.json.status, 'empty');
  assert.equal((await raw('GET', '/api/finance/update')).status, 405);
  assert.equal((await raw('GET', '/api/finance/nope')).status, 404);
  // The pipeline is built in (no Python): a no-bank rebuild starts on an empty folder.
  const up = await raw('POST', '/api/finance/update', { headers: J, body: { bank: false } });
  assert.equal(up.status, 202, 'no-bank rebuild starts');
  for (let i = 0; i < 100; i++) {
    const s = await raw('GET', '/api/finance/status');
    if (!s.json.job || s.json.job.state !== 'running') break;
    await new Promise(r => setTimeout(r, 30));
  }
  const cat = await raw('POST', '/api/finance/categorise', { headers: J, body: { merchant: 'x' } });
  assert.equal(cat.status, 400);
  assert.deepEqual((await raw('GET', '/api/finance/budgets')).json, { budgets: {} });
});

test('google routes: status, snapshot fallbacks, person never errors when not connected', async () => {
  const s = await raw('GET', '/api/google/status');
  assert.equal(s.status, 200);
  assert.equal(s.json.connected, false);
  assert.equal((await raw('GET', '/api/google/inbox')).status, 502);
  writeFileSync(join(dir, 'email', 'inbox.json'), JSON.stringify({ fetchedAt: '2026-01-01T00:00:00Z', emails: [{ id: '1', sender: 'A <a@example.com>', subject: 's' }] }));
  const inbox = await raw('GET', '/api/google/inbox');
  assert.equal(inbox.json.source, 'snapshot');
  const person = await raw('GET', '/api/google/person?email=a%40example.com');
  assert.equal(person.status, 200);
  assert.equal(person.json.threads.length, 1);
  assert.equal((await raw('GET', '/api/google/nope')).status, 404);
  const cb = await raw('GET', '/api/google/callback?error=%3Cscript%3E');
  assert.ok(!cb.text.includes('<script>'), 'callback page escapes');
});

test('connections: listed, and a claude probe updates connections.json', async () => {
  const c = await raw('GET', '/api/connections');
  assert.equal(c.json.bank.status, 'unknown');
  const p = await raw('POST', '/api/connections/probe', { headers: J, body: { id: 'claude' } });
  assert.equal(p.json.status, 'connected');
  try {
    process.env.FAKE_CLAUDE_MODE = 'connector-ok';
    assert.equal((await raw('POST', '/api/connections/probe', { headers: J, body: { id: 'bank' } })).json.status, 'connected');
    process.env.FAKE_CLAUDE_MODE = 'ok';           // finishes, but the Bank connector is not there
    assert.equal((await raw('POST', '/api/connections/probe', { headers: J, body: { id: 'bank' } })).json.status, 'missing');
    process.env.FAKE_CLAUDE_MODE = 'connector-needs-auth';
    const b = await raw('POST', '/api/connections/probe', { headers: J, body: { id: 'bank' } });
    assert.equal(b.json.status, 'needs-auth');
  } finally { process.env.FAKE_CLAUDE_MODE = 'ok'; }
  const saved = JSON.parse(readFileSync(join(dir, 'connections.json'), 'utf8'));
  assert.equal(saved.claude.status, 'connected');
  assert.equal(saved.bank.status, 'needs-auth');
  assert.equal((await raw('POST', '/api/connections/probe', { headers: J, body: { id: 'slack' } })).status, 400);
});

test('server log is written and holds no request bodies', async () => {
  await srv.ctx.log.flush();   // log lines are written in order, after the response
  const log = readFileSync(join(dir, 'logs', 'server.log'), 'utf8');
  assert.match(log, /PUT \/api\/state 200/);
  assert.ok(!log.includes('Reply with exactly'), 'prompts never logged');
});
