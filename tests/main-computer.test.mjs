// lib/main-computer.mjs + server/routes/main-computer.mjs: only the main
// computer runs the AUTOMATIC background jobs; the others answer "Runs on
// <name>" (skipped, never an error the page shows as a failure); a click still
// runs; nothing runs automatically while a move copies the data. The sync
// engine's roles when sync is on (a fake engine here), a file in the data
// folder otherwise. Temp folders, a real in-process server, never port 4173.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { decide, skippedBody, createMainComputer, JOB_IDS } from '../lib/main-computer.mjs';
import { safeServerEnv } from './relocate.shared.mjs';

const ROOT = process.platform === 'win32' && existsSync('C:/tmp') ? 'C:/tmp/relocate-test' : join(tmpdir(), 'relocate-test');
mkdirSync(ROOT, { recursive: true });
if (!process.env.DASHBOARD_DEVICE_DIR) process.env.DASHBOARD_DEVICE_DIR = mkdtempSync(join(ROOT, 'device-'));
process.env.DASHBOARD_SYNC_LOCAL_DIR = process.env.DASHBOARD_SYNC_LOCAL_DIR || mkdtempSync(join(ROOT, 'sync-'));
const A = 'a'.repeat(24), B = 'b'.repeat(24);

test('the rule: a click always runs; automatic runs only on the main computer; nothing while moving', () => {
  assert.deepEqual(decide({ automatic: false, mainId: B, meId: A }), { run: true });
  assert.deepEqual(decide({ automatic: true, mainId: null, meId: A }), { run: true });
  assert.deepEqual(decide({ automatic: true, mainId: A, meId: A }), { run: true });
  assert.deepEqual(decide({ automatic: true, mainId: B, mainName: 'WORK-LAPTOP', meId: A }), { run: false, reason: 'not-main', runsOn: 'WORK-LAPTOP' });
  assert.deepEqual(decide({ automatic: true, paused: true, mainId: A, meId: A }), { run: false, reason: 'moving' });
  assert.deepEqual(skippedBody({ run: false, reason: 'not-main', runsOn: 'WORK-LAPTOP' }), { skipped: true, reason: 'main-computer', runsOn: 'WORK-LAPTOP', message: 'Runs on WORK-LAPTOP, your main computer.' });
});

test('without sync: the choice is roles.json in the shared data folder; both computers agree', async () => {
  const data = mkdtempSync(join(ROOT, 'mc-'));
  try {
    let moving = false;
    const onA = createMainComputer({ dataDir: data, me: () => ({ id: A, name: 'HOME-PC' }), computers: () => [{ id: B, name: 'WORK-LAPTOP', lastSeenMs: 1000 }], paused: () => moving });
    const onB = createMainComputer({ dataDir: data, me: () => ({ id: B, name: 'WORK-LAPTOP' }), computers: () => [{ id: A, name: 'HOME-PC' }] });
    assert.equal((await onA.gate('bank')).run, true, 'no main chosen: as before');
    const st = await onA.set(B);
    assert.equal(st.mode, 'local'); assert.equal(st.main.name, 'WORK-LAPTOP'); assert.equal(st.isMain, false);
    assert.deepEqual(st.computers.map(c => c.name), ['HOME-PC', 'WORK-LAPTOP']);
    assert.ok(st.jobs.every(j => j.runsOn === 'WORK-LAPTOP' && !j.here));
    for (const job of JOB_IDS) {
      assert.deepEqual(await onA.gate(job), { run: false, reason: 'not-main', runsOn: 'WORK-LAPTOP' });
      assert.deepEqual(await onB.gate(job), { run: true });
    }
    assert.deepEqual(await onA.gate('bank', { automatic: false }), { run: true }, 'a click runs');
    await onB.set('this');
    assert.equal((await onB.status()).isMain, true);
    moving = true;
    assert.equal((await onA.gate('connectors')).reason, 'moving');
    moving = false;
    await onA.set(null);
    assert.equal((await onA.status()).main, null);
    assert.equal((await onA.gate('bank')).run, true);
    await assert.rejects(onA.set('c'.repeat(24)), (e) => e.code === 'UNKNOWN_COMPUTER');
    assert.ok(!existsSync(join(data, 'main-computer.json')), 'one place for who runs what: roles.json (lib/sync/roles.mjs)');
    await onA.set(B);
    assert.equal(JSON.parse(readFileSync(join(data, 'roles.json'), 'utf8')).roles.main.fetcher, B);
  } finally { rmSync(data, { recursive: true, force: true }); }
});

test("with sync: the sync engine's devices and fetcher roles are used (one choice: the jobs follow the main computer)", async () => {
  const roles = {};
  const devices = [{ deviceId: '1111111111111111', fetcherId: A, name: 'HOME-PC', me: true, lastSeen: 1, background: true }, { deviceId: '2222222222222222', fetcherId: B, name: 'WORK-LAPTOP', me: false, lastSeen: 2, background: true }];
  const who = (id) => roles[id] || roles.main || null;       // the rule of lib/sync/roles.mjs, for jobs
  const sync = {
    devices: async () => devices,
    setFetcher: async (id, fid) => { roles[id] = fid; return {}; },
    clearFetcher: async (id) => { delete roles[id]; return {}; },
    isFetcher: async (id) => !who(id) || who(id) === A,
    fetcher: (id) => (who(id) ? { deviceId: devices.find(d => d.fetcherId === who(id)).deviceId, name: devices.find(d => d.fetcherId === who(id)).name, me: who(id) === A } : { deviceId: null, name: null, me: true }),
  };
  const mc = createMainComputer({ dataDir: mkdtempSync(join(ROOT, 'mcs-')), sync: () => sync, me: () => ({ id: A, name: 'HOME-PC' }) });
  assert.equal((await mc.gate('ai-brief')).run, true);
  roles['ai-brief'] = A;                                      // a job's own older role is cleared by the one choice
  const st = await mc.set('2222222222222222');
  assert.equal(st.mode, 'sync');
  assert.deepEqual(roles, { main: B }, 'the main computer is recorded by its fetcher id; the jobs follow it');
  assert.equal(st.main.name, 'WORK-LAPTOP'); assert.equal(st.isMain, false);
  assert.ok(st.jobs.every(j => j.runsOn === 'WORK-LAPTOP' && !j.here));
  assert.deepEqual(await mc.gate('ai-brief'), { run: false, reason: 'not-main', runsOn: 'WORK-LAPTOP' });
  assert.deepEqual(await mc.gate('ai-brief', { automatic: false }), { run: true });
  await assert.rejects(mc.set(null), (e) => e.code === 'NEEDS_MAIN');
});

function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }

test('server: automatic calendar, email, finance, AI summary and story jobs say "Runs on" on the other computer; clicks run', async () => {
  const data = mkdtempSync(join(ROOT, 'mc-srv-'));
  // the other computer once had this folder open (an old presence file: not live, writes are not paused)
  mkdirSync(join(data, 'hosts'), { recursive: true });
  writeFileSync(join(data, 'hosts', `${B}.json`), JSON.stringify({ hostId: B, hostname: 'WORK-LAPTOP', pid: 1, version: '9', startedAt: null, beatAt: Date.now() - 3600 * 1000 }));
  const port = await freePort();
  const call = (method, path, body) => new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json', Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' } }, (r) => {
      let s = ''; r.setEncoding('utf8'); r.on('data', d => { s += d; }); r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch {} res({ status: r.statusCode, json: j }); });
    });
    req.on('error', rej); if (body !== undefined) req.write(JSON.stringify(body)); req.end();
  });
  await safeServerEnv();     // the fake claude CLI: a forced update must never start a real Claude run
  assert.match((await import('../lib/claude-runner.mjs')).cliPath(), /fake-claude.mjs$/);
  const { main } = await import('../server/index.mjs');
  const srv = await main(['--port', String(port), '--no-open', '--data-dir', data, '--fresh']);
  try {
    let r = await call('GET', '/api/main-computer');
    assert.equal(r.status, 200); assert.equal(r.json.mode, 'local'); assert.equal(r.json.main, null);
    assert.ok(r.json.computers.some(c => c.name === 'WORK-LAPTOP'));
    r = await call('POST', '/api/main-computer', { id: B });
    assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(r.json.main.name, 'WORK-LAPTOP');
    for (const path of ['/api/calendar/update', '/api/inbox/update']) {
      r = await call('POST', path, { force: false });
      assert.equal(r.status, 200, path); assert.equal(r.json.skipped, true); assert.equal(r.json.runsOn, 'WORK-LAPTOP');
      r = await call('POST', path, { force: true });
      assert.ok(!(r.json && r.json.reason === 'main-computer'), `${path}: a click is not held back`);
    }
    r = await call('POST', '/api/finance/update', { automatic: true });
    assert.equal(r.status, 200); assert.equal(r.json.runsOn, 'WORK-LAPTOP');
    r = await call('POST', '/api/finance/update', {});
    assert.ok(!(r.json && r.json.reason === 'main-computer'), 'a click on Update finances runs');
    r = await call('POST', '/api/brief/summary', { kind: 'brief', date: '2026-10-23', facts: {} });
    assert.equal(r.status, 409); assert.equal(r.json.code, 'NOT_MAIN'); assert.match(r.json.error, /Runs on WORK-LAPTOP/);
    r = await call('POST', '/api/story/script', { kind: 'morning' });
    assert.equal(r.status, 409); assert.equal(r.json.code, 'NOT_MAIN');
    // this computer becomes the main one: the automatic update is no longer held back
    r = await call('POST', '/api/main-computer', { id: 'this' });
    assert.equal(r.json.isMain, true);
    r = await call('POST', '/api/calendar/update', { force: false });
    assert.ok(!(r.json && r.json.reason === 'main-computer'));
    r = await call('POST', '/api/main-computer', { id: 'x'.repeat(100) });
    assert.equal(r.status, 400);
  } finally { await srv.close(); rmSync(data, { recursive: true, force: true }); }
});
