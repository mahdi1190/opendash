// Folder sync inside the real server (in-process, temp data folder, a free
// port): /api/sync/* routes and their safeguards, a change made through the
// actions layer (as the MCP server does over HTTP) reaching the shared folder,
// and a change from another computer reaching an open tab over /api/events.
// Measures file-appears -> SSE 'state' event (what the page reacts to).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { request, createServer } from 'node:http';
import { SYNC_DIR_NAME, isSyncFileName } from '../lib/sync/folder.mjs';
import { tempDir, rm, makeDevice, editState, waitFor, sleep } from './sync.shared.mjs';

const base = tempDir('sync-srv-');
const dataDir = join(base, 'data-server');
const cloudB = join(base, 'cloud-b'), cloudA = join(base, 'cloud-a');
let port, srv;

const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
function call(method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, agent: false, headers: { Host: `localhost:${port}`, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers } }, (r) => {
      let d = ''; r.setEncoding('utf8'); r.on('data', x => { d += x; }); r.on('end', () => { let json = null; try { json = JSON.parse(d); } catch {} res({ status: r.statusCode, json }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
/** An open tab's event stream: collects {event, data}. */
function events() {
  const got = [];
  const waiters = [];
  const req = request({ host: '127.0.0.1', port, method: 'GET', path: '/api/events', agent: false, headers: { Host: `localhost:${port}`, Accept: 'text/event-stream', Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' } }, (r) => {
    let buf = '';
    r.setEncoding('utf8');
    r.on('data', (chunk) => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i); buf = buf.slice(i + 2);
        const ev = (/^event: (.*)$/m.exec(block) || [])[1];
        const data = (/^data: (.*)$/m.exec(block) || [])[1];
        if (!ev) continue;
        const e = { event: ev, data: data ? JSON.parse(data) : null, at: Date.now() };
        got.push(e);
        for (const w of waiters.splice(0)) w();
      }
    });
  });
  req.on('error', () => {});
  req.end();
  return {
    got, close: () => req.destroy(),
    next: (pred, ms = 5000) => new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error('no matching event; got ' + JSON.stringify(got.slice(-5)))), ms);
      const check = () => { const e = got.find(pred); if (e) { clearTimeout(t); res(e); } else waiters.push(check); };
      check();
    }),
  };
}
function put(path, text) {
  mkdirSync(join(path, '..'), { recursive: true });
  const tmp = join(path, '..', `.~${Math.random().toString(36).slice(2)}.tmp`);
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}
const filesOf = (cloud, id) => { const d = join(cloud, SYNC_DIR_NAME, 'devices', id); return existsSync(d) ? readdirSync(d).filter(isSyncFileName).map(n => ({ n, text: readFileSync(join(d, n), 'utf8') })) : []; };

before(async () => {
  mkdirSync(join(dataDir, 'state'), { recursive: true });
  mkdirSync(cloudB); mkdirSync(cloudA);
  writeFileSync(join(dataDir, 'config.json'), JSON.stringify({ userName: 'Test User' }));
  writeFileSync(join(dataDir, 'state', 'dashboard-state.json'), JSON.stringify({ custom: [{ id: 'u-1-aaa', title: 'Write the report', stream: 'work', priority: 'p2', tags: [], subtasks: [] }], streams: [{ id: 'work', label: 'Work' }], _lastSave: 1 }));
  // No Claude, no Windows integration in this test: nothing is started besides the server.
  process.env.CLAUDE_CLI_PATH = join(base, 'no-claude-here.exe');
  process.env.DASHBOARD_OS_EXEC = 'dry-run';
  process.env.DASHBOARD_SYNC_POLL_MS = '3000';
  const { setCliPath } = await import('../lib/claude-runner.mjs');
  setCliPath(process.env.CLAUDE_CLI_PATH);
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dataDir, '--fresh']);
});
after(async () => {
  await srv?.close();
  delete process.env.CLAUDE_CLI_PATH; delete process.env.DASHBOARD_OS_EXEC; delete process.env.DASHBOARD_SYNC_POLL_MS;
  rm(base);
});

test('sync is off by default and says so plainly', async () => {
  const r = await call('GET', '/api/sync/status');
  assert.equal(r.status, 200);
  assert.equal(r.json.enabled, false);
  assert.equal(r.json.state, 'off');
  assert.match(r.json.message, /stays on this computer/);
  assert.equal(existsSync(join(cloudB, SYNC_DIR_NAME)), false, 'nothing is written anywhere while off');
});

test('settings are checked: a missing folder, the data folder itself, another site', async () => {
  let r = await call('POST', '/api/sync/settings', { enabled: true, folder: join(base, 'nope') });
  assert.equal(r.status, 400); assert.match(r.json.error, /does not exist/);
  r = await call('POST', '/api/sync/settings', { enabled: true, folder: dataDir });
  assert.equal(r.status, 400); assert.match(r.json.error, /outside the OpenDash data folder/);
  r = await call('POST', '/api/sync/settings', { enabled: true, folder: 'relative/path' });
  assert.equal(r.status, 400);
  r = await call('POST', '/api/sync/settings', { enabled: true, folder: cloudB }, { Origin: 'https://evil.example' });
  assert.equal(r.status, 403, 'another web site cannot turn sync on');
  assert.equal((await call('GET', '/api/sync/status')).json.enabled, false);
});

let A;
test('turned on: a change made through the actions layer (the MCP route) is written to the shared folder', async () => {
  const r = await call('POST', '/api/sync/settings', { enabled: true, folder: cloudB, deviceName: 'Work laptop' });
  assert.equal(r.status, 200);
  assert.equal(r.json.enabled, true);
  assert.equal(r.json.state, 'ok');
  assert.equal(r.json.deviceName, 'Work laptop');
  const token = readFileSync(join(dataDir, 'local-token'), 'utf8').trim();
  const before = filesOf(cloudB, srv.ctx.sync.deviceId).find(f => f.n.endsWith('.jsonl')).text.length;
  const a = await call('POST', '/api/actions', { ops: [{ op: 'task.update', id: 'u-1-aaa', title: 'Write the final report' }], client: 'test mcp' }, { 'X-Dashboard-Token': token });
  assert.equal(a.status, 200, JSON.stringify(a.json));
  await waitFor(() => filesOf(cloudB, srv.ctx.sync.deviceId).find(f => f.n.endsWith('.jsonl')).text.length > before, 3000, 'the change in the log');
  const log = filesOf(cloudB, srv.ctx.sync.deviceId).find(f => f.n.endsWith('.jsonl')).text;
  assert.ok(log.includes('Write the final report'));
});

test('a change from another computer reaches an open tab over /api/events (and the page label says who)', async () => {
  A = makeDevice(base, 'home', { state: { custom: [] }, pollMs: 60000 });
  await A.eng.start();
  await A.eng.configure({ enabled: true, folder: cloudA, deviceName: 'Home PC' });
  // The cloud brings the server's files to A, and A's to the server.
  for (const f of filesOf(cloudB, srv.ctx.sync.deviceId)) put(join(cloudA, SYNC_DIR_NAME, 'devices', srv.ctx.sync.deviceId, f.n), f.text);
  await waitFor(async () => ((await A.store.readObject()).custom || []).length === 1, 5000, 'A to have the task');
  await A.eng.syncNow();
  const sse = events();
  await sse.next(e => e.event === 'hello');
  const samples = [];
  for (let i = 0; i < 6; i++) {
    await editState(A.store, s => { s.custom[0].priority = ['p1', 'p3'][i % 2]; s.custom[0].title = `From home ${i}`; });
    await A.eng.syncNow();
    const v0 = (await call('GET', '/api/state')).json._lastSave;
    const t0 = Date.now();
    for (const f of filesOf(cloudA, A.eng.deviceId)) put(join(cloudB, SYNC_DIR_NAME, 'devices', A.eng.deviceId, f.n), f.text);
    const ev = await sse.next(e => e.event === 'state' && e.data.source === 'sync' && e.data.version > v0);
    samples.push(ev.at - t0);
    assert.equal(ev.data.client, 'Home PC');
    assert.match(ev.data.summary, /change/);
    assert.equal((await call('GET', '/api/state')).json.custom[0].title, `From home ${i}`);
    await sleep(80);
  }
  sse.close();
  samples.sort((x, y) => x - y);
  console.log(`# browser-visible latency (file appears -> /api/events 'state'): median ${samples[Math.floor(samples.length / 2)]} ms, max ${samples[samples.length - 1]} ms`);
  const st = (await call('GET', '/api/sync/status')).json;
  assert.ok(st.devices.some(d => !d.me && d.name === 'Home PC'));
  assert.ok(typeof st.lastSyncAt === 'number');
  await A.eng.stop();
});

test('turned off: it stops, and says so', async () => {
  const r = await call('POST', '/api/sync/settings', { enabled: false });
  assert.equal(r.json.enabled, false);
  assert.equal(r.json.state, 'off');
  assert.equal(srv.ctx.sync.active, false);
});
