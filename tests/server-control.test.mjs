// Restarting and starting the server: the exit-code contract (server/lifecycle.mjs),
// the supervisor (tools/supervisor.mjs, with fake children and with real
// processes), the API (server/routes/server-control.mjs + /api/health), a real
// unsupervised restart (a detached replacement), and the Windows start-up
// helpers (lib/os-integration.mjs) - ONLY with the dry-run executor: nothing
// here writes to the registry or runs reg.exe.
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { request, createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAKE_CLAUDE = join(ROOT, 'tests', 'fixtures', 'fake-claude.mjs');
const FAKE_SERVE = join(ROOT, 'tests', 'fixtures', 'fake-serve.mjs');
process.env.DASHBOARD_OS_EXEC = 'dry-run';          // belt and braces: never the real registry

const L = await import('../server/lifecycle.mjs');
const { createSupervisor } = await import('../tools/supervisor.mjs');
const OS = await import('../lib/os-integration.mjs');

function freePort() {
  return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
function raw(port, method, path, { headers = {}, body } = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
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
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── 1. the contract ─────────────────────────────────────────────────────
describe('exit-code contract', () => {
  test('codes and what the supervisor does with them', () => {
    assert.deepEqual({ ...L.EXIT }, { OK: 0, CRASH: 1, RESTART: 75, REBUILD: 76, CONFIG: 78 });
    assert.equal(L.classifyExit(0, null), 'stop');
    assert.equal(L.classifyExit(75, null), 'restart');
    assert.equal(L.classifyExit(76, null), 'rebuild');
    assert.equal(L.classifyExit(78, null), 'config');
    for (const c of [1, 2, 7, 3221225477, -1]) assert.equal(L.classifyExit(c, null), 'crash', String(c));
    assert.equal(L.classifyExit(null, 'SIGKILL'), 'crash');
    assert.equal(L.classifyExit(0, 'SIGTERM'), 'crash', 'killed by a signal is never a clean stop');
  });
  test('readable exits and signals', () => {
    assert.match(L.describeExit(4294967295, null), /-1: ended from outside/);
    assert.match(L.describeExit(3221225477, null), /0xC0000005/);
    assert.match(L.describeExit(null, 'SIGKILL'), /killed by SIGKILL/);
    assert.match(L.describeSignal('SIGHUP', 'win32'), /window was closed/);
    assert.match(L.describeSignal('SIGINT', 'linux'), /Ctrl\+C/);
  });
  test('a restart never opens another browser tab', () => {
    assert.deepEqual(L.withNoOpen(['--port', '4311']), ['--port', '4311', '--no-open']);
    assert.deepEqual(L.withNoOpen(['--no-open', '--port', '1']), ['--no-open', '--port', '1']);
  });
  test('initLifecycle reads what the previous process handed over, and keeps it from child programs', () => {
    const now = Date.now();
    const env = { DASHBOARD_SUPERVISED: '1', DASHBOARD_RESTART_COUNT: '3', DASHBOARD_LAST_STOP: 'restart requested',
      DASHBOARD_LAST_REBUILD: JSON.stringify({ ok: false, step: 'build', message: 'boom' }), DASHBOARD_RESTART_HISTORY: `${now - 1000},${now - 20 * 60000},junk` };
    const life = L.initLifecycle({ env, hasIpc: true, now });
    assert.equal(life.supervised, true);
    assert.equal(life.restartCount, 3);
    assert.equal(life.lastStopReason.reason, 'restart requested');
    assert.equal(life.lastRebuild.step, 'build');
    assert.deepEqual(life.history, [now - 1000], 'old and junk entries dropped');
    assert.deepEqual(Object.keys(env), [], 'the hand-over variables are removed from the environment');
    assert.equal(L.initLifecycle({ env: { DASHBOARD_SUPERVISED: '1' }, hasIpc: false }).supervised, false, 'supervised needs the IPC channel too');
    const info = L.runtimeInfo();
    for (const k of ['pid', 'startedAt', 'uptime', 'supervised', 'restartCount', 'lastStopReason']) assert.ok(k in info, k);
  });
  test('the restart rate limit carries across restarts and allows one at a time', () => {
    const now = Date.now();
    L.initLifecycle({ env: { DASHBOARD_RESTART_HISTORY: [1, 2, 3, 4, 5, 6].map(i => now - i * 1000).join(',') }, now });
    const r = L.checkRestartAllowed({ now });
    assert.equal(r.ok, false); assert.equal(r.status, 429); assert.ok(r.retryAfter > 500 && r.retryAfter <= 600);
    L.initLifecycle({ env: {}, now });
    assert.equal(L.checkRestartAllowed({ now }).ok, true);
    const calls = [];
    L.setLifecycleHandler((x) => calls.push(x));
    assert.equal(L.requestLifecycle({ action: 'restart', rebuild: true, now }), 'respawn');
    assert.deepEqual(calls.map(c => [c.action, c.rebuild]), [['restart', true]]);
    assert.equal(L.checkRestartAllowed({ now }).status, 409, 'one at a time');
    const env = L.nextEnv({ PATH: 'x', DASHBOARD_SUPERVISED: '1' }, { lastStop: 'restart requested', now });
    assert.equal(env.DASHBOARD_RESTART_COUNT, '1');
    assert.equal(env.DASHBOARD_RESTART_HISTORY, String(now));
    assert.equal(env.DASHBOARD_RESPAWN_WAIT, '15000');
    assert.ok(!('DASHBOARD_SUPERVISED' in env));
    L.setLifecycleHandler(null);
    L.initLifecycle({ env: {} });
  });
});

describe('why the last server stopped (from the log)', () => {
  const head = '2026-10-03T08:00:00.000Z INFO  server started on http://localhost:4173/ (data X)\n2026-10-03T08:00:01.000Z INFO  GET /api/state 200 3ms\n';
  test('a logged stop', () => {
    const r = L.lastStopFromLog(head + '2026-10-03T09:00:00.000Z NOTE  stopping: received SIGHUP (the window was closed)\n2026-10-03T09:00:00.100Z NOTE  server process exiting (code 0)\n');
    assert.equal(r.reason, 'received SIGHUP (the window was closed)');
    assert.equal(r.at, '2026-10-03T09:00:00.000Z');
  });
  test('a crash, an exit code, and nothing at all', () => {
    assert.match(L.lastStopFromLog(head + '2026-10-03T09:00:00.000Z NOTE  crash (uncaughtException): TypeError: x | at y\n2026-10-03T09:00:00.001Z NOTE  server process exiting (code 1)\n').reason, /^crash \(uncaughtException\): TypeError/);
    assert.equal(L.lastStopFromLog(head + '2026-10-03T09:00:00.001Z NOTE  server process exiting (code 7)\n').reason, 'crashed (exit code 7)');
    assert.match(L.lastStopFromLog(head).reason, /^unknown: .*Task Manager/);
    assert.equal(L.lastStopFromLog('no start line here\n'), null);
    assert.equal(L.lastStopFromLog(''), null);
  });
  test('only the run after the LAST start counts', () => {
    const t = head + '2026-10-03T09:00:00.000Z NOTE  stopping: received SIGINT (Ctrl+C)\n' + head.replace(/08:00/g, '10:00');
    assert.match(L.lastStopFromLog(t).reason, /^unknown/);
  });
});

describe('rebuild steps', () => {
  test('runNodeStep runs node with the script, keeps the last lines, reports the exit code', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'step-test-'));
    try {
      writeFileSync(join(dir, 'fail.mjs'), "console.log('line one'); console.error('SyntaxError: Unexpected token'); process.exit(3);\n");
      const echoed = [];
      const r = await L.runNodeStep('fail.mjs', ['--x'], { cwd: dir, echo: (s) => echoed.push(s) });
      assert.equal(r.code, 3);
      assert.deepEqual(r.tail, ['line one', 'SyntaxError: Unexpected token']);
      assert.ok(echoed.join('').includes('line one'), 'echoed to the window');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  test('rebuildApp: migrate, syntax check, build - in that order, stopping at the first failure', async () => {
    const ran = [];
    const ok = await L.rebuildApp({ args: ['--data-dir', 'D'], run: async (s, a) => { ran.push([s, ...a].join(' ')); return { code: 0, tail: [] }; } });
    assert.equal(ok.ok, true);
    assert.deepEqual(ran, ['tools/migrate.mjs --auto --data-dir D', 'build.mjs --syntax', 'build.mjs']);
    const ran2 = [];
    const bad = await L.rebuildApp({ run: async (s, a) => { ran2.push(s + ' ' + a.join(' ')); return a.includes('--syntax') ? { code: 1, tail: ['[build --syntax] src/app/*.js (bundle)', 'SyntaxError: x'] } : { code: 0, tail: [] }; } });
    assert.deepEqual([bad.ok, bad.step, bad.code], [false, 'check', 1]);
    assert.match(bad.message, /SyntaxError: x/);
    assert.equal(ran2.length, 2, 'the build never ran, so index.html is the previous build');
  });
});

// ─── 2. the supervisor, with fake children and a fake clock ──────────────
function fakeWorld({ plan, rebuildResult = { ok: true, at: 'x' } }) {
  let t = 1_000_000;
  const spawned = [], logs = [], sleeps = [], rebuilds = [];
  let i = 0;
  const spawnChild = (args, env) => {
    const c = new EventEmitter();
    c.pid = 100 + spawned.length; c.connected = true; c.sent = []; c.killed = false;
    c.send = (m) => c.sent.push(m);
    // A running child keeps the event loop alive, as a real process handle does
    // (the supervisor's own kill timer is unref'd and must not have to).
    const alive = setInterval(() => {}, 60000);
    c.once('exit', () => clearInterval(alive));
    c.kill = () => { c.killed = true; setImmediate(() => c.emit('exit', null, 'SIGTERM')); };
    spawned.push({ args, env, child: c });
    const step = plan[Math.min(i++, plan.length - 1)];
    if (step !== 'wait') setImmediate(() => { t += 100; c.emit('exit', step, null); });
    return c;
  };
  const sup = createSupervisor({
    args: ['--port', '4311'], env: { PATH: 'p', DASHBOARD_LAST_STOP: 'stale' }, spawnChild,
    rebuild: async (a) => { rebuilds.push(a); return rebuildResult; },
    log: (level, msg) => logs.push(`${level} ${msg}`),
    now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; },
    stopTimeoutMs: 50,
  });
  return { sup, spawned, logs, sleeps, rebuilds, advance: (ms) => { t += ms; } };
}

describe('supervisor (fake children)', () => {
  test('a clean exit (0) is not restarted', async () => {
    const w = fakeWorld({ plan: [0] });
    assert.equal(await w.sup.run(), 0);
    assert.equal(w.spawned.length, 1);
    assert.deepEqual(w.spawned[0].args, ['--port', '4311'], 'the first start keeps the arguments as given');
    assert.equal(w.spawned[0].env.DASHBOARD_SUPERVISED, '1');
    assert.ok(!('DASHBOARD_LAST_STOP' in w.spawned[0].env), 'nothing stale handed over');
    assert.ok(!('DASHBOARD_RESPAWN_WAIT' in w.spawned[0].env), 'the first start does not wait for the port');
    assert.ok(w.logs.some(l => /supervisor: the server stopped cleanly \(exit 0\); not restarting/.test(l)));
  });
  test('75 restarts at once with --no-open and the hand-over environment', async () => {
    const w = fakeWorld({ plan: [75, 75, 0] });
    assert.equal(await w.sup.run(), 0);
    assert.equal(w.spawned.length, 3);
    assert.deepEqual(w.sleeps, [], 'no backoff for a requested restart');
    assert.deepEqual(w.spawned[1].args, ['--port', '4311', '--no-open']);
    assert.equal(w.spawned[1].env.DASHBOARD_RESTART_COUNT, '1');
    assert.equal(w.spawned[2].env.DASHBOARD_RESTART_COUNT, '2');
    assert.equal(w.spawned[1].env.DASHBOARD_LAST_STOP, 'restart requested');
    assert.equal(w.spawned[1].env.DASHBOARD_RESPAWN_WAIT, '15000');
    assert.equal(w.spawned[2].env.DASHBOARD_RESTART_HISTORY.split(',').length, 2, 'requested restarts are counted for the rate limit');
  });
  test('76 rebuilds first; a failed build restarts the previous build and reports it', async () => {
    const ok = fakeWorld({ plan: [76, 0] });
    await ok.sup.run();
    assert.deepEqual(ok.rebuilds, [['--port', '4311']], 'the steps get the same arguments (data folder)');
    assert.equal(ok.spawned[1].env.DASHBOARD_LAST_STOP, 'rebuild requested');
    assert.equal(JSON.parse(ok.spawned[1].env.DASHBOARD_LAST_REBUILD).ok, true);

    const bad = fakeWorld({ plan: [76, 0], rebuildResult: { ok: false, step: 'check', code: 1, at: 'x', message: 'SyntaxError: Unexpected token' } });
    assert.equal(await bad.sup.run(), 0);
    assert.equal(bad.spawned.length, 2, 'the previous build is started again');
    assert.match(bad.spawned[1].env.DASHBOARD_LAST_STOP, /the check step failed, so the previous build was restarted/);
    assert.equal(JSON.parse(bad.spawned[1].env.DASHBOARD_LAST_REBUILD).step, 'check');
    assert.ok(bad.logs.some(l => /^error supervisor: the rebuild failed at the check step/.test(l)));
  });
  test('crashes restart with backoff 1 s, 2 s, 5 s, 10 s and give up at the 5th within 60 s', async () => {
    const w = fakeWorld({ plan: [1] });
    assert.equal(await w.sup.run(), 1);
    assert.deepEqual(w.sleeps, [1000, 2000, 5000, 10000]);
    assert.equal(w.spawned.length, 5);
    assert.match(w.spawned[1].env.DASHBOARD_LAST_STOP, /^crashed \(exit code 1\)/);
    assert.ok(w.logs.some(l => /^error supervisor: giving up: the server crashed 5 times within 60 s/.test(l)), w.logs.join('\n'));
  });
  test('crashes spread out over more than a minute keep being restarted', async () => {
    let t = 0, n = 0;
    const plan = [1, 1, 1, 1, 1, 1, 1, 0];
    const sleeps = [];
    const sup = createSupervisor({
      args: [], log: () => {},
      spawnChild: () => { const c = new EventEmitter(); c.pid = 1; const code = plan[n++]; setImmediate(() => { t += 20000; c.emit('exit', code, null); }); return c; },
      now: () => t, sleep: async (ms) => { sleeps.push(ms); t += ms; },
    });
    assert.equal(await sup.run(), 0, 'never gave up');
    assert.equal(n, 8);
    assert.equal(sleeps.length, 7);
  });
  test('requested restarts beyond the limit are slowed down: never a tight loop', async () => {
    // The server refuses a 7th restart in 10 minutes; if exits 75/76 keep coming
    // anyway (a bug, a local program looping), each further one waits 10 s.
    const w = fakeWorld({ plan: [75, 75, 76, 75, 75, 75, 75, 75, 0] });
    assert.equal(await w.sup.run(), 0);
    assert.equal(w.spawned.length, 9, 'still restarted, just not at once');
    assert.deepEqual(w.sleeps, [10000, 10000], 'the 7th and 8th wait 10 s each');
    assert.ok(w.logs.some(l => /^warn supervisor: 7 restarts were requested within 10 minutes \(the limit is 6\); waiting 10 s/.test(l)), w.logs.join('\n'));
  });
  test('78 (set-up problem) is not retried', async () => {
    const w = fakeWorld({ plan: [78] });
    assert.equal(await w.sup.run(), 78);
    assert.equal(w.spawned.length, 1);
  });
  test('a stop is sent to the child over IPC; it is ended only if it does not stop', async () => {
    const w = fakeWorld({ plan: ['wait'] });
    const done = w.sup.run();
    assert.equal(w.spawned.length, 1, 'the child is started synchronously by run()');
    w.sup.stop('received SIGINT (Ctrl+C)');
    const c = w.spawned[0].child;
    assert.deepEqual(c.sent, [{ cmd: 'stop', reason: 'received SIGINT (Ctrl+C)' }]);
    assert.equal(c.killed, false, 'not killed straight away');
    assert.equal(await done, 0, 'killed after the timeout, and the supervisor stops');
    assert.equal(c.killed, true);
    assert.equal(w.spawned.length, 1, 'never restarted after a stop');
  });
  test('a stop while waiting to restart after a crash ends at once', async () => {
    let t = 0;
    const spawned = [];
    let wakeSleep, sleeping;
    const asleep = new Promise(r => { sleeping = r; });
    // The backoff sleep never ends on its own: only the stop can end the wait.
    // A ref'd timer keeps the event loop alive meanwhile (as the real sleep does).
    const alive = setInterval(() => {}, 60000);
    const sup = createSupervisor({
      args: [], spawnChild: () => { const c = new EventEmitter(); c.pid = 1; spawned.push(c); setImmediate(() => c.emit('exit', 1, null)); return c; },
      log: () => {}, now: () => t, sleep: () => new Promise(r => { wakeSleep = r; sleeping(); }),
    });
    const done = sup.run();
    await asleep;                       // the crash happened and the backoff wait began
    try {
      sup.stop('received SIGTERM');
      assert.equal(await done, 0);
      assert.equal(spawned.length, 1);
    } finally { wakeSleep && wakeSleep(); clearInterval(alive); }
  });
});

// ─── 3. the supervisor as real processes ─────────────────────────────────
describe('supervisor (real processes)', () => {
  let dir;
  before(() => { dir = mkdtempSync(join(tmpdir(), 'supervisor-test-')); });
  after(() => rmSync(dir, { recursive: true, force: true }));
  const runSup = (plan, { ipc = false } = {}) => {
    const rec = join(dir, `rec-${plan.replace(/\W/g, '_')}-${Date.now()}.jsonl`);
    const child = spawn(process.execPath, [join(ROOT, 'tools', 'supervisor.mjs'), '--data-dir', join(dir, 'data'), '--port', '4999'], {
      env: { ...process.env, DASHBOARD_SUPERVISOR_SERVE: FAKE_SERVE, FAKE_SERVE_PLAN: plan, FAKE_SERVE_RECORD: rec },
      stdio: ipc ? ['ignore', 'pipe', 'pipe', 'ipc'] : ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let out = '';
    child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
    const exit = new Promise(r => child.on('exit', (code) => r(code)));
    const records = () => { try { return readFileSync(rec, 'utf8').split('\n').filter(Boolean).map(JSON.parse); } catch { return []; } };
    return { child, exit, records, rec, out: () => out };
  };

  test('restart, crash, clean stop: the child gets IPC, the environment and --no-open; all of it is logged', async () => {
    const s = runSup('75,1,0');
    assert.equal(await s.exit, 0, s.out());
    const r = s.records();
    assert.equal(r.length, 3, s.out());
    assert.deepEqual(r.map(x => x.ipc), [true, true, true]);
    assert.deepEqual(r.map(x => x.supervised), ['1', '1', '1']);
    assert.deepEqual(r.map(x => x.restartCount), ['0', '1', '2']);
    assert.deepEqual(r.map(x => x.argv.includes('--no-open')), [false, true, true]);
    assert.deepEqual(r.map(x => x.lastStop), [null, 'restart requested', 'crashed (exit code 1)']);
    assert.deepEqual(r.map(x => x.wait), [null, '15000', '15000']);
    const log = readFileSync(join(dir, 'data', 'logs', 'server.log'), 'utf8');
    for (const re of [/INFO  supervisor: started the server/, /supervisor: restart requested; starting it again now/, /WARN  supervisor: the server crashed \(exit code 1\); starting it again in 1 s/, /supervisor: the server stopped cleanly \(exit 0\); not restarting/]) assert.match(log, re);
  });

  test('asking the supervisor to stop stops the child cleanly (over IPC) and both exit 0', async () => {
    const s = runSup('wait', { ipc: true });
    for (let i = 0; i < 100 && !s.records().length; i++) await sleep(50);
    assert.equal(s.records().length, 1, s.out());
    s.child.send({ cmd: 'stop' });
    assert.equal(await s.exit, 0, s.out());
    assert.match(readFileSync(s.rec + '.stop', 'utf8'), /asked to stop/);
  });
});

// ─── 4. the API, in-process ──────────────────────────────────────────────
describe('server API', () => {
  let dir, port, srv, token, dry;
  const calls = [];
  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'server-control-'));
    mkdirSync(join(dir, 'finance', '_system'), { recursive: true });
    mkdirSync(join(dir, 'logs'), { recursive: true });
    // an earlier run that was closed with the window
    writeFileSync(join(dir, 'logs', 'server.log'), '2026-10-03T08:00:00.000Z INFO  server started on http://localhost:1/ (data X)\n2026-10-03T08:30:00.000Z NOTE  stopping: received SIGHUP (the window was closed)\n');
    process.env.CLAUDE_CLI_PATH = FAKE_CLAUDE;
    process.env.FAKE_CLAUDE_MODE = 'ok';
    process.env.DASHBOARD_AUTOLINK = 'off';
    const { setCliPath } = await import('../lib/claude-runner.mjs');
    setCliPath(FAKE_CLAUDE);
    dry = OS.createDryRunExec();
    OS.setOsExec(dry.exec);
    port = await freePort();
    const { main } = await import('../server/index.mjs');
    srv = await main(['--port', String(port), '--no-open', '--data-dir', dir, '--fresh']);
    L.setLifecycleHandler((x) => calls.push(x));
    token = readFileSync(join(dir, 'local-token'), 'utf8').trim();
  });
  after(async () => {
    OS.setOsExec(null);
    L.setLifecycleHandler(null);
    await srv?.close();
    delete process.env.CLAUDE_CLI_PATH; delete process.env.FAKE_CLAUDE_MODE;
    rmSync(dir, { recursive: true, force: true });
  });
  const J = { 'Content-Type': 'application/json' };
  const asPage = () => ({ ...J, Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' });
  const asTool = (t = token) => ({ ...J, 'X-Dashboard-Token': t });

  test('health says which process answered and why the last one stopped', async () => {
    const h = (await raw(port, 'GET', '/api/health?quick=1')).json;
    assert.equal(h.pid, process.pid);
    assert.equal(typeof h.uptime, 'number');
    assert.equal(h.supervised, false);
    assert.equal(h.restartCount, 0);
    assert.ok(Date.parse(h.startedAt) > 0);
    assert.equal(h.lastStopReason.reason, 'received SIGHUP (the window was closed)');
    assert.equal(h.lastStopReason.source, 'log');
    assert.match(String(h.build), /^[0-9a-f]{12}$/);
    assert.deepEqual(h.launch, { startScheme: null });
    assert.ok(h.ai.pending === true || typeof h.ai.available === 'boolean', 'quick never waits for the AI probe');
  });

  test('the page gets its build id in the injected config', async () => {
    const r = await raw(port, 'GET', '/');
    const cfg = JSON.parse(/<script id="dashboard-config" type="application\/json">(.*?)<\/script>/.exec(r.text)[1]);
    assert.match(cfg.build, /^[0-9a-f]{12}$/);
  });

  test('status (same origin only)', async () => {
    const s = (await raw(port, 'GET', '/api/server/status')).json;
    assert.equal(s.port, port);
    assert.equal(s.dataDir, dir);
    assert.equal(s.canRestart, true);
    for (const k of ['pid', 'version', 'build', 'startedAt', 'uptime', 'supervised', 'restartCount', 'lastStopReason', 'logFile']) assert.ok(k in s, k);
    assert.equal((await raw(port, 'GET', '/api/server/status', { headers: { Origin: 'http://evil.example' } })).status, 403);
  });

  test('the guards, unit level: DNS rebinding (Host) and cross-site / null origins', async () => {
    const { hostAllowed, sameOrigin } = await import('../server/http.mjs');
    const P = 4311;
    const rq = (h) => ({ headers: h });
    for (const host of [`evil.example:${P}`, `localhost.evil.example:${P}`, `localhost.:${P}`, `127.0.0.1.nip.io:${P}`,
      `localhost:${P}@evil.example`, `[::1]:${P}`, 'localhost', `localhost:${P + 1}`, '', undefined]) {
      assert.equal(hostAllowed(rq({ host }), P), false, `Host ${host}`);
    }
    for (const host of [`localhost:${P}`, `127.0.0.1:${P}`, `LOCALHOST:${P}`]) assert.equal(hostAllowed(rq({ host }), P), true, host);
    for (const origin of ['null', `http://localhost:${P}/`, `https://localhost:${P}`, `http://localhost:${P}.evil.example`,
      `http://[::1]:${P}`, `http://localhost:${P + 1}`, 'https://evil.example', `http://evil.example:${P}`]) {
      assert.equal(sameOrigin(rq({ origin }), P), false, `Origin ${origin}`);
      assert.equal(sameOrigin(rq({ origin, 'sec-fetch-site': 'same-origin' }), P), false, `Origin ${origin} + forged Sec-Fetch-Site`);
    }
    for (const sfs of ['cross-site', 'same-site']) assert.equal(sameOrigin(rq({ 'sec-fetch-site': sfs }), P), false, sfs);
    assert.equal(sameOrigin(rq({ origin: `http://localhost:${P}`, 'sec-fetch-site': 'cross-site' }), P), false);
  });

  test('restart / stop / integration: no Origin and no token is not enough, even with Sec-Fetch-Site: none', async () => {
    for (const path of ['/api/server/restart', '/api/server/stop', '/api/server/integration']) {
      const body = path.endsWith('integration') ? { feature: 'autostart', enabled: true } : {};
      assert.equal((await raw(port, 'POST', path, { headers: { ...J, 'Sec-Fetch-Site': 'none' }, body })).status, 401, path);
      assert.equal((await raw(port, 'POST', path, { headers: { ...J, Origin: 'null' }, body })).status, 403, path);
      assert.equal((await raw(port, 'POST', path, { headers: { ...asTool(), Origin: 'https://evil.example' }, body })).status, 403, `${path}: the token does not make a cross-site request OK`);
      // a form post: text/plain or urlencoded, from another site
      assert.equal((await raw(port, 'POST', path, { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' }, body: 'rebuild=true' })).status, 403, path);
    }
    assert.equal(L.lifecyclePending(), null, 'nothing was started');
  });

  test('restart: Host, Origin, Sec-Fetch-Site and the token are all checked', async () => {
    const n = calls.length;
    assert.equal((await raw(port, 'POST', '/api/server/restart', { headers: { ...asTool(), Host: `evil.example:${port}` }, body: {} })).status, 421);
    assert.equal((await raw(port, 'POST', '/api/server/restart', { headers: { ...J, Origin: 'http://evil.example' }, body: {} })).status, 403);
    assert.equal((await raw(port, 'POST', '/api/server/restart', { headers: { ...J, 'Sec-Fetch-Site': 'cross-site' }, body: {} })).status, 403);
    assert.equal((await raw(port, 'POST', '/api/server/restart', { headers: J, body: {} })).status, 401, 'no origin and no token');
    assert.equal((await raw(port, 'POST', '/api/server/restart', { headers: asTool('0'.repeat(64)), body: {} })).status, 401, 'wrong token');
    assert.equal((await raw(port, 'POST', '/api/server/restart', { headers: { 'X-Dashboard-Token': token, 'Content-Type': 'text/plain' }, body: 'x' })).status, 415);
    assert.equal((await raw(port, 'POST', '/api/server/restart', { headers: asTool(), body: { rebuild: 'yes' } })).status, 400);
    assert.equal((await raw(port, 'GET', '/api/server/restart')).status, 405);
    await sleep(120);
    assert.equal(calls.length, n, 'nothing was restarted');
  });

  test('restart: 202 first, then the handler; one at a time', async () => {
    const r = await raw(port, 'POST', '/api/server/restart', { headers: asPage(), body: { rebuild: true } });
    assert.equal(r.status, 202);
    assert.equal(r.json.restarting, true);
    assert.equal(r.json.rebuild, true);
    assert.equal(r.json.mode, 'respawn', 'not supervised in this process');
    assert.equal(r.json.pid, process.pid);
    for (let i = 0; i < 40 && !calls.length; i++) await sleep(25);
    assert.deepEqual(calls.map(c => [c.action, c.rebuild, c.mode]), [['restart', true, 'respawn']]);
    const again = await raw(port, 'POST', '/api/server/restart', { headers: asTool(), body: {} });
    assert.equal(again.status, 409);
    assert.equal((await raw(port, 'GET', '/api/server/status')).json.pending.action, 'restart');
  });

  test('restart: rate limited across restarts (429 + Retry-After); stop works with the token', async () => {
    const now = Date.now();
    L.initLifecycle({ env: { DASHBOARD_RESTART_HISTORY: [1, 2, 3, 4, 5, 6].map(i => now - i * 1000).join(',') }, now });
    const r = await raw(port, 'POST', '/api/server/restart', { headers: asTool(), body: {} });
    assert.equal(r.status, 429);
    assert.ok(Number(r.headers['retry-after']) > 0);
    L.initLifecycle({ env: {} });
    calls.length = 0;
    const s = await raw(port, 'POST', '/api/server/stop', { headers: asTool(), body: {} });
    assert.equal(s.status, 202);
    assert.equal(s.json.stopping, true);
    for (let i = 0; i < 40 && !calls.length; i++) await sleep(25);
    assert.deepEqual(calls.map(c => c.action), ['stop']);
    L.initLifecycle({ env: {} });
  });

  test('restart: a burst of requests gets ONE 202 and 409s (the slot is taken before the answer)', async () => {
    L.initLifecycle({ env: {} });
    calls.length = 0;
    // Each request awaits its body before the checks, so they interleave: before
    // the fix all of them passed the checks and all got a 202.
    const rs = await Promise.all([0, 1, 2, 3, 4, 5].map(i => raw(port, 'POST', i % 3 === 2 ? '/api/server/stop' : '/api/server/restart', { headers: asPage(), body: {} })));
    assert.deepEqual(rs.map(r => r.status).sort(), [202, 409, 409, 409, 409, 409]);
    for (let i = 0; i < 40 && !calls.length; i++) await sleep(25);
    await sleep(150);
    assert.equal(calls.length, 1, 'serve.mjs is told once');
    L.initLifecycle({ env: {} });
  });

  test('the log: the last lines; the page or the token only, never the token itself', async () => {
    const r5 = await raw(port, 'GET', '/api/server/log?lines=5', { headers: { 'Sec-Fetch-Site': 'same-origin' } });
    assert.equal(r5.status, 200);
    assert.ok(r5.json.lines.length <= 5 && r5.json.lines.length > 0);
    const r = await raw(port, 'GET', '/api/server/log?lines=60', { headers: { 'Sec-Fetch-Site': 'same-origin' } });
    assert.ok(r.json.lines.some(l => /restart requested from the dashboard|stop requested/.test(l)), r.json.lines.join('\n'));
    assert.equal((await raw(port, 'GET', '/api/server/log', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    assert.equal((await raw(port, 'GET', '/api/server/log', { headers: { Origin: 'null' } })).status, 403);
    assert.equal((await raw(port, 'GET', '/api/server/log')).status, 401, 'not any program (or other user) on this computer');
    assert.equal((await raw(port, 'GET', '/api/server/log', { headers: { 'X-Dashboard-Token': '0'.repeat(64) } })).status, 401);
    assert.equal((await raw(port, 'GET', '/api/server/log', { headers: { 'X-Dashboard-Token': token } })).status, 200);
    assert.equal((await raw(port, 'POST', '/api/server/log', { headers: asTool(), body: {} })).status, 405, 'read-only');
    const all = await raw(port, 'GET', '/api/server/log?lines=1000', { headers: { 'X-Dashboard-Token': token } });
    assert.ok(!all.text.includes(token), 'the token is never logged');
    assert.ok(!readFileSync(join(dir, 'logs', 'server.log'), 'utf8').includes(token));
  });

  test('the service worker is served, versioned by the build, never cached by HTTP', async () => {
    const r = await raw(port, 'GET', '/sw.js');
    assert.equal(r.status, 200);
    assert.match(r.headers['content-type'], /javascript/);
    assert.equal(r.headers['cache-control'], 'no-store');
    assert.ok(!r.text.includes('__SW_VERSION__'));
    assert.match(r.text, /const SW_VERSION = "[0-9a-f]{12}";/);
    assert.equal((await raw(port, 'GET', '/src/sw.js')).status, 404, 'still nothing else from the repo');
  });

  test('integration: queried, switched on and off through fixed reg.exe calls (dry run), token-protected', async () => {
    // GET runs reg.exe too: the page or the token only.
    assert.equal((await raw(port, 'GET', '/api/server/integration')).status, 401);
    assert.equal((await raw(port, 'GET', '/api/server/integration', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
    const st0 = (await raw(port, 'GET', '/api/server/integration', { headers: { 'Sec-Fetch-Site': 'same-origin' } })).json;
    if (process.platform !== 'win32') {
      assert.equal(st0.supported, false);
      assert.ok(st0.manual && st0.manual.start && st0.manual.autostart);
      assert.equal((await raw(port, 'POST', '/api/server/integration', { headers: asTool(), body: { feature: 'protocol', enabled: true } })).status, 501);
      return;
    }
    assert.equal(st0.supported, true);
    assert.equal(st0.protocol.enabled, false);
    assert.equal(st0.autostart.enabled, false);
    assert.equal((await raw(port, 'POST', '/api/server/integration', { headers: J, body: { feature: 'protocol', enabled: true } })).status, 401);
    assert.equal((await raw(port, 'POST', '/api/server/integration', { headers: { ...J, Origin: 'http://evil.example' }, body: { feature: 'protocol', enabled: true } })).status, 403);
    assert.equal((await raw(port, 'POST', '/api/server/integration', { headers: asTool(), body: { feature: 'calc.exe', enabled: true } })).status, 400);
    assert.equal((await raw(port, 'POST', '/api/server/integration', { headers: asTool(), body: { feature: 'protocol', enabled: 'on' } })).status, 400);
    const before = dry.calls.length;
    const on = await raw(port, 'POST', '/api/server/integration', { headers: asPage(), body: { feature: 'protocol', enabled: true } });
    assert.equal(on.status, 200, on.text);
    assert.equal(on.json.protocol.enabled, true);
    assert.equal(on.json.protocol.current, true);
    const cmd = on.json.protocol.command;
    assert.ok(!/%\d|%\*/.test(cmd), 'the link is never passed to the command');
    assert.match(cmd, /^"[^"]*\\System32\\conhost\.exe" --headless "[^"]*node(\.exe)?" "[^"]*\\tools\\start-hidden\.mjs" --port \d+ --data-dir "/);
    assert.ok(dry.calls.slice(before).every(c => /\\System32\\reg\.exe$/i.test(c.file)), 'only reg.exe, by full path');
    assert.equal((await raw(port, 'GET', '/api/health?quick=1')).json.launch.startScheme, 'dashboard-start', 'the page learns the Start server link');
    assert.equal(JSON.parse(readFileSync(join(dir, 'launch.json'), 'utf8')).protocol, true);
    const off = await raw(port, 'POST', '/api/server/integration', { headers: asTool(), body: { feature: 'protocol', enabled: false } });
    assert.equal(off.json.protocol.enabled, false);
    assert.equal([...dry.keys.keys()].filter(k => k.includes('dashboard-start')).length, 0, 'everything it wrote is gone');
    assert.equal((await raw(port, 'GET', '/api/health?quick=1')).json.launch.startScheme, null);
    const a = await raw(port, 'POST', '/api/server/integration', { headers: asTool(), body: { feature: 'autostart', enabled: true } });
    assert.equal(a.json.autostart.enabled, true);
    assert.equal(a.json.autostart.approved, true);
    const a2 = await raw(port, 'POST', '/api/server/integration', { headers: asTool(), body: { feature: 'autostart', enabled: false } });
    assert.equal(a2.json.autostart.enabled, false);
  });
});

// ─── 5. the Windows helpers, unit level (dry run only) ───────────────────
describe('os-integration (dry run)', () => {
  const env = { SystemRoot: 'C:\\Windows' };
  const repoRoot = 'C:\\Apps\\dash board';
  const base = { platform: 'win32', repoRoot, port: 4173, dataDir: 'C:\\Apps\\dash board\\data', defaultDataDir: 'C:\\Apps\\dash board\\data', env, exists: () => true };

  // The command is a Windows registry value built from Windows paths (C:\...),
  // which node:path only joins and resolves as such on Windows.
  test('the command is fixed: the launcher, plus only a non-default port / data folder', { skip: process.platform !== 'win32' && 'Windows only: the start-up command uses Windows paths' }, () => {
    const node = 'C:\\Program Files\\nodejs\\node.exe';
    assert.equal(OS.launcherCommand({ ...base, nodeExe: node }), `"${join('C:\\Windows', 'System32', 'conhost.exe')}" --headless "${node}" "${join(repoRoot, 'tools', 'start-hidden.mjs')}"`);
    assert.equal(OS.launcherCommand({ ...base, nodeExe: node, hidden: false }), `"${node}" "${join(repoRoot, 'tools', 'start-hidden.mjs')}"`, 'no conhost: node directly');
    assert.throws(() => OS.launcherCommand({ ...base, nodeExe: 'C:\\n&de\\node.exe' }), /cannot be used/);
    const c = OS.launcherCommand({ ...base, port: 4300, dataDir: 'D:\\My data\\dash\\' });
    assert.ok(c.endsWith('--port 4300 --data-dir "' + join('D:\\My data\\dash') + '"'), c);
    assert.throws(() => OS.launcherCommand({ ...base, dataDir: 'D:\\a&calc' }), /cannot be used/);
    assert.throws(() => OS.launcherCommand({ ...base, repoRoot: 'C:\\100%' }), /cannot be used/);
  });

  test('plans: exactly these keys, nothing else', () => {
    const cmd = OS.launcherCommand(base);
    const on = OS.plan('protocol', true, cmd, env).map(s => s.args.slice(0, 2).join(' '));
    assert.deepEqual(on, [`add ${OS.PROTO_KEY}`, `add ${OS.PROTO_KEY}`, `add ${OS.PROTO_CMD_KEY}`]);
    assert.ok(OS.PROTO_KEY.startsWith('HKCU\\Software\\Classes\\'), 'per user only');
    assert.deepEqual(OS.plan('protocol', false, null, env).map(s => s.args.slice(0, 2).join(' ')), [`delete ${OS.PROTO_KEY}`]);
    const run = OS.plan('autostart', true, cmd, env);
    assert.deepEqual(run[0].args, ['add', OS.RUN_KEY, '/v', 'personal-dashboard', '/t', 'REG_SZ', '/d', cmd, '/f']);
    assert.ok(OS.RUN_KEY.startsWith('HKCU\\'));
    assert.throws(() => OS.plan('anything', true, cmd, env), /unknown feature/);
  });

  test('status is read back from the registry, including "set up for another copy" and Task Manager', async () => {
    const dry = OS.createDryRunExec();
    const os = OS.createOsIntegration({ ...base, exec: dry.exec });
    let st = await os.status();
    assert.equal(st.supported, true);
    assert.equal(st.autostart.enabled, false);
    st = await os.set('autostart', true);
    assert.deepEqual([st.autostart.enabled, st.autostart.current, st.autostart.approved], [true, true, true]);
    // another copy of the app registered itself
    await dry.exec(OS.regExe(env), ['add', OS.RUN_KEY, '/v', 'personal-dashboard', '/t', 'REG_SZ', '/d', '"x.exe" "D:\\other\\tools\\start-hidden.mjs"', '/f']);
    // and the user switched it off in Task Manager
    await dry.exec(OS.regExe(env), ['add', OS.APPROVED_KEY, '/v', 'personal-dashboard', '/t', 'REG_BINARY', '/d', '030000000000000000000000', '/f']);
    st = await os.status();
    assert.deepEqual([st.autostart.enabled, st.autostart.current, st.autostart.approved], [true, false, false]);
    st = await os.set('autostart', true);
    assert.deepEqual([st.autostart.current, st.autostart.approved], [true, true], 'switching it on again fixes both');
    st = await os.set('autostart', false);
    assert.equal(st.autostart.enabled, false);
    assert.equal(dry.keys.get(OS.APPROVED_KEY.toLowerCase())?.values.size || 0, 0);
  });

  test('not Windows: nothing is run, instructions instead', async () => {
    const dry = OS.createDryRunExec();
    for (const platform of ['darwin', 'linux']) {
      const os = OS.createOsIntegration({ ...base, platform, repoRoot: '/home/sam/dash', exec: dry.exec });
      const st = await os.status();
      assert.equal(st.supported, false);
      assert.match(st.manual.start, /start-opendash\.sh/);
      assert.match(st.manual.autostart, platform === 'darwin' ? /Login Items/ : /autostart/);
      await assert.rejects(os.set('protocol', true), /only works on Windows/);
    }
    assert.equal(dry.calls.length, 0);
  });

  test('the instructions name start-opendash.*, or start-dashboard.* in an older copy that has only that', () => {
    const only = (name) => (p) => p.replace(/\\/g, '/').endsWith('/' + name);
    for (const [platform, files, want] of [
      ['linux', 'start-opendash.sh', /start-opendash\.sh/], ['linux', 'start-dashboard.sh', /start-dashboard\.sh/],
      ['win32', 'start-opendash.bat', /Double-click start-opendash\.bat/], ['win32', 'start-dashboard.bat', /Double-click start-dashboard\.bat/],
    ]) {
      const os = OS.createOsIntegration({ ...base, platform, repoRoot: '/home/sam/dash', exec: OS.createDryRunExec().exec, exists: only(files) });
      assert.match(os.manual().start, want, `${platform} ${files}`);
    }
    assert.deepEqual(OS.START_SCRIPTS, { bat: ['start-opendash.bat', 'start-dashboard.bat'], sh: ['start-opendash.sh', 'start-dashboard.sh'] });
  });

  test('missing launcher: refused before anything is written; no conhost: still works, node directly', async () => {
    const dry = OS.createDryRunExec();
    const noLauncher = OS.createOsIntegration({ ...base, exec: dry.exec, exists: (p) => !/start-hidden/i.test(p) });
    await assert.rejects(noLauncher.set('protocol', true), (e) => e.code === 'NO_LAUNCHER');
    assert.equal(dry.calls.length, 0);
    // turning OFF still works without it
    await noLauncher.set('protocol', false);
    const noHost = OS.createOsIntegration({ ...base, exec: dry.exec, exists: (p) => !/conhost/i.test(p) });
    const st = await noHost.set('autostart', true);
    assert.equal(st.hiddenHost, false);
    assert.equal(st.autostart.current, true);
    assert.ok(!/conhost/i.test(st.autostart.command) && /start-hidden\.mjs"$/.test(st.autostart.command), st.autostart.command);
  });

  test('reg query output is parsed in any language', () => {
    const out = '\r\nHKEY_CURRENT_USER\\Software\\Classes\\dashboard-start\\shell\\open\\command\r\n    (Standard)    REG_SZ    "C:\\x\\conhost.exe" --headless "C:\\n\\node.exe" "C:\\a b\\tools\\start-hidden.mjs"\r\n    URL Protocol    REG_SZ    \r\n';
    assert.deepEqual(OS.parseRegQuery(out), [{ name: '', type: 'REG_SZ', data: '"C:\\x\\conhost.exe" --headless "C:\\n\\node.exe" "C:\\a b\\tools\\start-hidden.mjs"' }, { name: 'URL Protocol', type: 'REG_SZ', data: '' }]);
  });

  test('the start scripts never pause a hidden window and only hand over to the supervisor', () => {
    const bat = readFileSync(join(ROOT, 'start-opendash.bat'), 'utf8');
    assert.ok(!/^\s*pause\s*$/m.test(bat), 'every pause is skipped for a hidden window');
    assert.match(bat, /node tools\\supervisor\.mjs %\*/);
    assert.match(readFileSync(join(ROOT, 'start-opendash.sh'), 'utf8'), /exec node tools\/supervisor\.mjs "\$@"/);
    // The old names are thin shims (desktop shortcuts and start-up entries made before the rename).
    const shim = readFileSync(join(ROOT, 'start-dashboard.bat'), 'utf8');
    assert.ok(!/^\s*pause\s*$/m.test(shim), 'the shim never pauses a hidden window either');
    assert.match(shim, /call "%~dp0start-opendash\.bat" %\*/);
    assert.match(shim, /exit \/b %ERRORLEVEL%/);
    assert.match(readFileSync(join(ROOT, 'start-dashboard.sh'), 'utf8'), /exec sh "\$here\/start-opendash\.sh" "\$@"/);
  });

  test('a data folder the launcher would not take is refused, never silently swapped for the default', () => {
    for (const d of ['\\\\server\\share\\data', 'C:\\']) {
      assert.throws(() => OS.launcherCommand({ ...base, platform: 'win32', dataDir: d }), (e) => e.code === 'UNSAFE_PATH', d);
    }
  });
});

// ─── 5b. the launcher's own logic (tools/start-hidden.mjs) ───────────────
// A plain Node script (Defender quarantined the old script-host launcher):
// its pure parts directly, the guard through DASHBOARD_LAUNCHER_DRY_RUN, and
// one real start on a COPY of it next to a decoy start-dashboard.bat.
describe('launcher (start-hidden.mjs)', () => {
  let LH;
  before(async () => { LH = await import('../tools/start-hidden.mjs'); });
  const CMD = (extra, bat = 'start-opendash.bat') => `/d /s /c ""C:\\Apps\\dash board\\${bat}" --no-open${extra}"`;
  const line = (args) => LH.cmdLine('C:\\Apps\\dash board\\start-opendash.bat', LH.parseLauncherArgs(args));

  test('no arguments: start-opendash.bat --no-open; the registered --port / --data-dir are passed on, quoted', () => {
    assert.equal(line([]), CMD(''));
    assert.equal(line(['--port', '4300', '--data-dir', 'D:\\My data (2)']), CMD(' --port 4300 --data-dir "D:\\My data (2)"'));
    assert.equal(line(['--data-dir', 'D:\\dash\\']), CMD(' --data-dir "D:\\dash"'), 'a trailing \\ never escapes the quote');
  });
  test('reading stops at the first other argument: a link (even one Windows appended) adds nothing', () => {
    for (const [args, extra] of [
      [['--port', '4300', 'dashboard-start://x', '--data-dir', 'C:\\evil'], ' --port 4300'],
      [['dashboard-start://start" & calc & "', '--port', '1234'], ''],
      [['dashboard-start://start%20--data-dir%20C:\\x'], ''],
      [['--data-dir', '\\\\srv\\share', '--port', '4300'], ''],
      [['--data-dir', 'C:\\a&calc.exe'], ''],
      [['--data-dir', 'C:\\a" & calc & "'], ''],
      [['--data-dir', 'C:\\%COMSPEC%'], ''],
      [['--data-dir', 'C:\\'], ''],
      [['--port', '80;calc'], ''],
      [['--port', '99999'], ''],
      [['//X', '--port', '4300'], ''],
    ]) assert.equal(line(args), CMD(extra), args.join(' '));
  });
  test('the app folder: start-opendash.bat first, the old name as the fallback, none -> nothing; unsafe -> refused', () => {
    const only = (...names) => (p) => names.some(n => p.endsWith('\\' + n) || p.endsWith('/' + n));
    assert.equal(LH.pickBat('C:\\A', only('start-opendash.bat', 'start-dashboard.bat')), join('C:\\A', 'start-opendash.bat'));
    assert.equal(LH.pickBat('C:\\A', only('start-dashboard.bat')), join('C:\\A', 'start-dashboard.bat'));
    assert.equal(LH.pickBat('C:\\A', () => false), null);
    for (const root of ['C:\\a&b', 'C:\\100%']) assert.throws(() => LH.cmdLine(root + '\\start-opendash.bat', LH.parseLauncherArgs([])), /unsafe/);
  });
  test('the 20 s guard: a second start within 20 s does nothing; an old stamp does not block', () => {
    const box = mkdtempSync(join(tmpdir(), 'launcher-guard-'));
    try {
      const t0 = Date.now();
      assert.equal(LH.guardStamp(box, 4301, t0), false, 'first start');
      assert.ok(existsSync(join(box, 'dashboard-start-4301.stamp')), 'the start is stamped');
      assert.equal(LH.guardStamp(box, 4301, t0 + 5000), true, 'a second click / the page opening the link again');
      assert.equal(LH.guardStamp(box, 4301, t0 + 60000), false);
    } finally { rmSync(box, { recursive: true, force: true }); }
  });
  test('the script itself: never a script-host file, no URL handling, fixed health check only', () => {
    const src = readFileSync(join(ROOT, 'tools', 'start-hidden.mjs'), 'utf8');
    assert.match(src, /DASHBOARD_NO_PAUSE: '1'/);
    assert.match(src, /windowsHide: true/);
    assert.match(src, /host: '127\.0\.0\.1'/);
    assert.ok(!/:\/\//.test(src.replace(/dashboard-start:\/\//g, '')), 'no URL handling');
    assert.ok(!existsSync(join(ROOT, 'tools', 'start-hidden.wsf')) && !existsSync(join(ROOT, 'tools', 'start-hidden.vbs')));
  });
  test('dry run through the real script: running or recently started -> nothing; otherwise the stage-2 command', { timeout: 30000 }, async () => {
    const { spawnSync } = await import('node:child_process');
    const box = mkdtempSync(join(tmpdir(), 'launcher-dry-'));
    try {
      const p = await freePort();
      const run = () => JSON.parse(spawnSync(process.execPath, [join(ROOT, 'tools', 'start-hidden.mjs'), '--port', String(p), 'dashboard-start://x'], { encoding: 'utf8', windowsHide: true, env: { ...process.env, DASHBOARD_LAUNCHER_DRY_RUN: box } }).stdout);
      const a = run();
      assert.equal(a.started, true);
      assert.deepEqual(a.args.slice(1), ['--hidden-child', '--port', String(p)]);
      assert.equal(run().reason, 'recent');
    } finally { rmSync(box, { recursive: true, force: true }); }
  });

  test('for real (a copy, a decoy start-dashboard.bat): hidden, and the arguments survive cmd intact', { skip: process.platform !== 'win32' && 'Windows only: runs cmd.exe', timeout: 30000 }, async () => {
    const { spawnSync } = await import('node:child_process');
    const box = mkdtempSync(join(tmpdir(), 'launcher-'));
    try {
      mkdirSync(join(box, 'tools'));
      writeFileSync(join(box, 'tools', 'start-hidden.mjs'), readFileSync(join(ROOT, 'tools', 'start-hidden.mjs')));
      writeFileSync(join(box, 'start-dashboard.bat'), '@echo off\r\n>"%~dp0got.txt" echo [%*] [%DASHBOARD_NO_PAUSE%]\r\n');
      const dataDir = join(box, 'my data');
      const p = await freePort();
      const r = spawnSync(process.execPath, [join(box, 'tools', 'start-hidden.mjs'), '--port', String(p), '--data-dir', dataDir, 'dashboard-start://x&calc', '--port', '1'], { encoding: 'utf8', windowsHide: true, timeout: 20000 });
      assert.equal(r.status, 0, r.stderr);
      let got = null;
      for (let i = 0; i < 100 && !got; i++) { await sleep(100); try { got = readFileSync(join(box, 'got.txt'), 'utf8').trim(); } catch { /* not yet */ } }
      try { rmSync(join(tmpdir(), `dashboard-start-${p}.stamp`), { force: true }); } catch { /* fine */ }
      assert.equal(got, `[--no-open --port ${p} --data-dir "${dataDir}"] [1]`);
      // (Retries: the detached second stage may still be ending in the folder.)
    } finally { try { rmSync(box, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 }); } catch { /* a just-exited child can hold the folder on Windows; a leftover temp folder is harmless */ } }
  });
});

// ─── 6. a real unsupervised restart: a detached replacement ──────────────
describe('unsupervised restart (real processes)', () => {
  let dir, port, token;
  const pids = new Set();
  before(async () => {
    dir = mkdtempSync(join(tmpdir(), 'respawn-test-'));
    port = await freePort();
  });
  after(async () => {
    for (const pid of pids) { try { process.kill(pid); } catch { /* gone */ } }
    // Wait until they are gone (no fixed pause), then delete with retries: on
    // Windows a process that is just ending can still hold its log file.
    const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
    for (let i = 0; i < 200 && [...pids].some(alive); i++) await sleep(50);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  });
  const health = async () => { try { return (await raw(port, 'GET', '/api/health?quick=1')).json; } catch { return null; } };

  test('POST /api/server/restart -> a new pid with the same arguments; stop ends it', { timeout: 60000 }, async () => {
    const SECRET = 'sk-test-secret-0123456789abcdef';   // an API key in the environment never reaches the log
    const env = { ...process.env, CLAUDE_CLI_PATH: FAKE_CLAUDE, FAKE_CLAUDE_MODE: 'ok', DASHBOARD_AUTOLINK: 'off', DASHBOARD_OS_EXEC: 'dry-run', DASHBOARD_TEST_API_KEY: SECRET };
    for (const k of Object.keys(env)) if (/^NODE_TEST|^NODE_OPTIONS$/.test(k)) delete env[k];
    const first = spawn(process.execPath, [join(ROOT, 'serve.mjs'), '--port', String(port), '--no-open', '--data-dir', dir, '--fresh'], { env, stdio: 'ignore', windowsHide: true });
    pids.add(first.pid);
    let h = null;
    for (let i = 0; i < 100 && !h; i++) { await sleep(100); h = await health(); }
    assert.ok(h, 'the first server answers');
    assert.equal(h.pid, first.pid);
    token = readFileSync(join(dir, 'local-token'), 'utf8').trim();
    const firstExit = new Promise(r => first.on('exit', r));
    const r = await raw(port, 'POST', '/api/server/restart', { headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token }, body: {} });
    assert.equal(r.status, 202);
    assert.equal(r.json.mode, 'respawn');
    assert.equal(await firstExit, 0, 'the old server exits cleanly');
    let h2 = null;
    for (let i = 0; i < 150; i++) { await sleep(100); h2 = await health(); if (h2 && h2.pid !== first.pid) break; }
    assert.ok(h2 && h2.pid !== first.pid, 'a new pid answers');
    pids.add(h2.pid);
    assert.equal(h2.restartCount, 1);
    assert.equal(h2.lastStopReason.reason, 'restart requested');
    assert.equal(h2.supervised, false);
    // runtime.json is written by an onReady hook just after the listener opens:
    // under a loaded full run the health answer can come first.
    const readRt = () => { try { return JSON.parse(readFileSync(join(dir, 'runtime.json'), 'utf8')); } catch { return null; } };
    let rt = readRt();
    for (let i = 0; i < 50 && !(rt && rt.pid === h2.pid); i++) { await sleep(100); rt = readRt(); }
    assert.ok(rt, 'runtime.json is written');
    assert.equal(rt.pid, h2.pid, 'runtime.json belongs to the new server');
    const log = readFileSync(join(dir, 'logs', 'server.log'), 'utf8');
    assert.match(log, /stopping: restart requested from the dashboard \(starting a replacement\)/);
    assert.match(log, /started the replacement server \(pid \d+\)/);
    assert.ok(!log.includes(SECRET) && !log.includes(token), 'no secrets in the log (the replacement\'s console output goes there)');
    const s = await raw(port, 'POST', '/api/server/stop', { headers: { 'Content-Type': 'application/json', 'X-Dashboard-Token': token }, body: {} });
    assert.equal(s.status, 202);
    let gone = false;
    for (let i = 0; i < 50 && !gone; i++) { await sleep(100); gone = !(await health()); }
    assert.ok(gone, 'stopped');
    for (let i = 0; i < 20 && existsSync(join(dir, 'runtime.json')); i++) await sleep(100);
    assert.ok(!existsSync(join(dir, 'runtime.json')), 'runtime.json removed on a clean stop');
  });
});
