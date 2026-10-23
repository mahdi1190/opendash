// Two computers on one data folder, end to end: the state store's injectable
// write gate (423 OTHER_COMPUTER for write() and mutate()), a real server
// started while a fake "other computer" is live (page, actions, override),
// runtime.json's hostId and discoverServer ignoring another computer's file,
// embedded-mode writes refused, and the conflict-copy routes. Temp folders, an
// injected device root and a free port (never the live dashboard's).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { createStateStore } from '../server/state-store.mjs';
import { createActions } from '../server/actions/index.mjs';
import { discoverServer, writeRuntime } from '../server/actions/auth.mjs';
import { createWriteGate, otherComputerError, othersLive } from '../lib/hosts.mjs';
import { ensureHostId } from '../lib/devicedir.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'od-twocomp-'));
process.env.DASHBOARD_DEVICE_DIR = join(tmp, 'device');
after(() => { delete process.env.DASHBOARD_DEVICE_DIR; rmSync(tmp, { recursive: true, force: true }); });
let n = 0;
const newData = (state = { custom: [{ id: 't1', title: 'Synthetic task' }], _lastSave: 1 }) => {
  const d = join(tmp, `data-${++n}`);
  mkdirSync(join(d, 'state'), { recursive: true });
  if (state) writeFileSync(join(d, 'state', 'dashboard-state.json'), JSON.stringify(state));
  return d;
};
const otherHost = (dataDir, { name = 'WORK-LAPTOP', beatAt = Date.now() } = {}) => {
  const id = randomBytes(12).toString('hex');
  mkdirSync(join(dataDir, 'hosts'), { recursive: true });
  writeFileSync(join(dataDir, 'hosts', `${id}.json`), JSON.stringify({ hostId: id, hostname: name, pid: 4242, version: '9.9.9', startedAt: new Date(beatAt).toISOString(), beatAt }));
  return id;
};
const freePort = () => new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

// ─── the store ────────────────────────────────────────────────────────────
test('state store: an injected writeGate refuses write() and mutate() (423) and leaves the file alone', async () => {
  const d = newData();
  const before = readFileSync(join(d, 'state', 'dashboard-state.json'), 'utf8');
  const kinds = [];
  let closed = true;
  const store = createStateStore({ stateDir: join(d, 'state'), writeGate: (kind) => { kinds.push(kind); if (closed) throw otherComputerError({ hostname: 'WORK-LAPTOP', beatAt: Date.now(), lastSeenMs: 0 }); } });
  await assert.rejects(store.write(JSON.stringify({ custom: [], _lastSave: 1 })), (e) => e.status === 423 && e.code === 'OTHER_COMPUTER' && e.host === 'WORK-LAPTOP');
  await assert.rejects(store.mutate(() => ({ next: { custom: [] }, result: 1 })), { status: 423, code: 'OTHER_COMPUTER' });
  assert.deepEqual(kinds, ['write', 'mutate']);
  assert.equal(readFileSync(join(d, 'state', 'dashboard-state.json'), 'utf8'), before);
  assert.equal((await store.readObject()).custom.length, 1, 'reads are never gated');
  closed = false;
  assert.equal((await store.write(JSON.stringify({ custom: [], _lastSave: 1 }))).written, true);
  assert.equal((await store.mutate((cur) => ({ next: { ...cur, custom: [{ id: 'x' }] }, result: 1 }))).written, true);
  // no gate: the store behaves exactly as before
  assert.equal((await createStateStore({ stateDir: join(d, 'state') }).mutate((cur) => ({ next: { ...cur, custom: [] } }))).written, true);
});

test('embedded mode (MCP, actions-cli): actions refused while another computer is live, allowed after', async () => {
  const d = newData();
  const id = otherHost(d);
  const gate = createWriteGate({ others: () => othersLive(d), pauseLater: true, recheckMs: 0 });
  const a = createActions({ dataDir: d, writeGate: () => gate.check() });
  await assert.rejects(a.apply({ ops: [{ op: 'task.create', title: 'Refused' }], source: 'mcp' }), (e) => e.code === 'OTHER_COMPUTER' && /OpenDash is open on WORK-LAPTOP/.test(e.message));
  assert.equal((await a.query('tasks.list', { view: 'all' })).tasks.length >= 0, true, 'queries still work');
  const dry = await a.apply({ ops: [{ op: 'task.create', title: 'Preview only' }], dryRun: true });
  assert.equal(dry.dryRun, true, 'a dry run writes nothing and is allowed');
  rmSync(join(d, 'hosts', `${id}.json`));
  assert.equal((await a.apply({ ops: [{ op: 'task.create', title: 'Now fine' }], source: 'mcp' })).ok, true);
});

// ─── discoverServer ───────────────────────────────────────────────────────
test("discoverServer treats another computer's runtime.json as stale before looking at its pid", async () => {
  const d = newData();
  const mine = ensureHostId(d);
  const port = await freePort();             // nothing listens there
  await writeRuntime(d, { pid: process.pid, port, hostname: 'WORK-LAPTOP', hostId: 'f'.repeat(24), stateFile: join(d, 'state', 'dashboard-state.json') });
  const r = await discoverServer(d, { timeoutMs: 300 });
  assert.equal(r.foreign, true);
  assert.match(r.stale, /another computer \(WORK-LAPTOP\)/);
  // the same file from this computer goes on to the usual checks (here: no answer on the port)
  await writeRuntime(d, { pid: process.pid, port, hostname: 'HOME-PC', hostId: mine });
  const r2 = await discoverServer(d, { timeoutMs: 300 });
  assert.equal(r2.foreign, undefined);
  assert.match(r2.stale, /no answer on port/);
  // an older runtime.json without a hostId: as before (a dead pid is stale)
  await writeRuntime(d, { pid: 2 ** 31 - 2, port });
  assert.match((await discoverServer(d, { timeoutMs: 300 })).stale, /is not running/);
  // a forced port ignores the file altogether
  await writeRuntime(d, { pid: process.pid, port, hostId: 'f'.repeat(24) });
  assert.match((await discoverServer(d, { port, timeoutMs: 300 })).stale, /no answer on port/);
});

// ─── a real server ────────────────────────────────────────────────────────
async function boot(dataDir) {
  const { main } = await import('../server/index.mjs');
  const port = await freePort();
  const srv = await main(['--port', String(port), '--no-open', '--data-dir', dataDir, '--fresh']);
  const req = async (method, path, { body, origin = true, headers = {} } = {}) => {
    const h = { Host: `localhost:${port}`, ...headers };
    if (origin) h.Origin = `http://localhost:${port}`;
    if (body !== undefined) h['Content-Type'] = 'application/json';
    const r = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: r.status, json, text };
  };
  return { srv, port, req };
}

test('server started while another computer is live: writes 423 + banner data, "Use here anyway" resumes', async () => {
  const d = newData();
  otherHost(d, { name: 'WORK-LAPTOP' });
  const { srv, req } = await boot(d);
  try {
    const h = await req('GET', '/api/hosts');
    assert.equal(h.status, 200);
    assert.equal(h.json.paused, true);
    assert.equal(h.json.by.hostname, 'WORK-LAPTOP');
    assert.equal(h.json.by.seen, 'just now');
    assert.deepEqual(h.json.others.map(o => o.hostname), ['WORK-LAPTOP']);
    assert.equal(h.json.oneDrive, false);
    assert.ok(h.json.me && h.json.me.hostId);
    // this server's own presence file, and runtime.json with this computer's id
    assert.ok(existsSync(join(d, 'hosts', `${h.json.me.hostId}.json`)));
    const rt = JSON.parse(readFileSync(join(d, 'runtime.json'), 'utf8'));
    assert.equal(rt.hostId, h.json.me.hostId);
    assert.equal(typeof rt.hostname, 'string');
    // the page's save
    const cur = (await req('GET', '/api/state')).json;
    const put = await req('PUT', '/api/state', { body: { ...cur, custom: [...cur.custom, { id: 't2', title: 'Second' }] } });
    assert.equal(put.status, 423);
    assert.equal(put.json.code, 'OTHER_COMPUTER');
    assert.equal(put.json.host, 'WORK-LAPTOP');
    assert.ok(put.json.lastSeen);
    // actions (the page, the assistant's Apply, MCP over HTTP all come here)
    const act = await req('POST', '/api/actions', { body: { ops: [{ op: 'task.create', title: 'Refused' }] } });
    assert.equal(act.status, 423);
    assert.equal(act.json.error.code, 'OTHER_COMPUTER');
    // the override is the page's own click: a local program cannot send it
    assert.equal((await req('POST', '/api/hosts/override', { body: {}, origin: false })).status, 403);
    const o = await req('POST', '/api/hosts/override', { body: {} });
    assert.equal(o.status, 200);
    assert.equal(o.json.paused, false);
    assert.equal(o.json.overridden, true);
    assert.equal(o.json.others.length, 1, 'the warning stays');
    assert.equal((await req('PUT', '/api/state', { body: { ...cur, custom: [...cur.custom, { id: 't2', title: 'Second' }] } })).status, 200);
    assert.equal((await req('POST', '/api/actions', { body: { ops: [{ op: 'task.create', title: 'Allowed' }] } })).json.ok, true);
  } finally { await srv.close(); }
  assert.equal(readdirSync(join(d, 'hosts')).length, 1, 'a clean stop removes only its own presence file');
});

test('server alone at start: a computer that appears later is a warning, writes go on', async () => {
  const d = newData();
  const { srv, req } = await boot(d);
  try {
    assert.equal((await req('GET', '/api/hosts')).json.paused, false);
    otherHost(d, { name: 'WORK-LAPTOP' });
    const h = (await req('GET', '/api/hosts')).json;
    assert.equal(h.paused, false);
    assert.deepEqual(h.others.map(o => o.hostname), ['WORK-LAPTOP']);
    const cur = (await req('GET', '/api/state')).json;
    assert.equal((await req('PUT', '/api/state', { body: { ...cur, custom: [] } })).status, 200);
  } finally { await srv.close(); }
});

test('an old presence file (a computer that crashed 10 minutes ago) does not pause anything', async () => {
  const d = newData();
  otherHost(d, { name: 'WORK-LAPTOP', beatAt: Date.now() - 10 * 60000 });
  const { srv, req } = await boot(d);
  try {
    const h = (await req('GET', '/api/hosts')).json;
    assert.equal(h.paused, false);
    assert.deepEqual(h.others, []);
  } finally { await srv.close(); }
});

test('conflict copies over HTTP: listed, kept as a backup, gone from the list', async () => {
  const d = newData();
  writeFileSync(join(d, 'state', 'dashboard-state-WORK-LAPTOP.json'), JSON.stringify({ custom: [{ id: 'z', title: 'From the other computer' }], _lastSave: 1 }));
  const { srv, req } = await boot(d);
  try {
    const h = (await req('GET', '/api/hosts')).json;
    assert.deepEqual(h.conflicts.map(c => [c.rel, c.kind, c.device]), [['state/dashboard-state-WORK-LAPTOP.json', 'state', 'WORK-LAPTOP']]);
    assert.equal((await req('POST', '/api/hosts/conflicts/keep', { body: { rel: 'state/dashboard-state-WORK-LAPTOP.json' }, origin: false })).status, 403);
    assert.equal((await req('POST', '/api/hosts/conflicts/keep', { body: { rel: '../../etc/passwd' } })).status, 404);
    const k = await req('POST', '/api/hosts/conflicts/keep', { body: { rel: 'state/dashboard-state-WORK-LAPTOP.json' } });
    assert.equal(k.status, 200, k.text);
    assert.match(k.json.name, /^onedrive-WORK-LAPTOP-/);
    assert.deepEqual(k.json.conflicts, []);
    const b = (await req('GET', '/api/settings/backups')).json.backups;
    assert.ok(b.some(x => x.name === k.json.name && x.kind === 'OneDrive copy'), 'Settings > Data can open it');
    assert.equal(JSON.parse(readFileSync(join(d, 'state', 'dashboard-state.json'), 'utf8')).custom[0].id, 't1', 'never merged');
  } finally { await srv.close(); }
});
