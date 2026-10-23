// server/routes/relocate.mjs on a real in-process server (temp data folder in a
// fake OneDrive, fake adapters, never port 4173): the page's dry run, the
// move job, writes paused with 423 MOVING, the hand-over plan, a second
// server started on the OLD path landing in the new folder and finishing the
// rename, and the page-only rule.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, mkdtempSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { request, createServer } from 'node:http';
import { makeComputer, adaptersFor, fakeCli, safeServerEnv } from './relocate.shared.mjs';
import { README } from '../lib/relocate/index.mjs';

let pc, port, srv;
process.env.DASHBOARD_SYNC_LOCAL_DIR = mkdtempSync(join(process.env.DASHBOARD_DEVICE_DIR, 'sync-'));

function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function call(method, path, body, headers = {}) {
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json', Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin', ...headers } }, (r) => {
      let t = ''; r.setEncoding('utf8'); r.on('data', d => { t += d; }); r.on('end', () => { let j = null; try { j = JSON.parse(t); } catch {} res({ status: r.statusCode, json: j }); });
    });
    req.on('error', rej);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

before(async () => {
  pc = makeComputer({ files: 6 });
  await safeServerEnv();
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', pc.data]);
  Object.assign(srv.ctx, { relocateAdapters: adaptersFor(pc, { cli: fakeCli(pc.home) }), relocateHome: pc.home, relocateEnv: { ...pc.env, DASHBOARD_DEVICE_DIR: process.env.DASHBOARD_DEVICE_DIR } });
});
after(async () => { await srv?.close(); pc?.cleanup(); });

test('GET /api/relocate: the data is in OneDrive, a place on this computer is suggested', async () => {
  const r = await call('GET', '/api/relocate');
  assert.equal(r.status, 200);
  assert.equal(r.json.synced.data, 'OneDrive');
  assert.equal(r.json.dataDir, pc.data);
  assert.equal(r.json.canUndo, false);
  assert.equal(r.json.job.state, 'idle');
  assert.ok(r.json.suggested.data.endsWith('Data'));
});

test('the page only: another site or a program without the page gets 403', async () => {
  const r = await call('POST', '/api/relocate/plan', {}, { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' });
  assert.ok([403].includes(r.status), String(r.status));
  const r2 = await call('POST', '/api/relocate/start', { to: 'relative/path', planId: '0123456789abcdef' });
  assert.equal(r2.status, 400);
  const r3 = await call('POST', '/api/relocate/start', {});
  assert.equal(r3.status, 400);
});

test('plan (dry run) -> start -> job done; writes answer 423 MOVING; a new server on the old path finishes the move', async () => {
  const to = join(pc.t, 'local', 'OpenDash', 'Data');
  const p = await call('POST', '/api/relocate/plan', { to, moveApp: false });
  assert.equal(p.status, 200);
  assert.equal(p.json.ok, true, JSON.stringify(p.json.problems));
  assert.ok(p.json.refs.some(r => r.kind === 'claude-code'));
  assert.ok(!existsSync(to), 'the dry run changes nothing');
  const s = await call('POST', '/api/relocate/start', { to, moveApp: false, planId: p.json.id });
  assert.equal(s.status, 202);
  let j;
  for (let i = 0; i < 100; i++) { j = (await call('GET', '/api/relocate/job')).json; if (j.state !== 'running') break; await sleep(100); }
  assert.equal(j.state, 'done', JSON.stringify(j));
  assert.equal(j.result.phase, 'switched');
  assert.equal(j.restart.mode, 'test');
  assert.deepEqual(srv.ctx.relocateHandoff, { appDir: srv.ctx.repoRoot, dataDir: to, port, window: process.env.DASHBOARD_NO_PAUSE !== '1' });
  // this server's paths are the old place now: state writes stay paused until it stops
  const w = await call('PUT', '/api/state', { custom: [], _lastSave: 0 });
  assert.equal(w.status, 423);
  assert.equal(w.json.code, 'MOVING');
  await srv.close(); srv = null;
  // OpenDash started again (as an old start-up entry would: --data-dir <old>) lands in the new folder
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', pc.data]);
  await srv.settled();
  assert.equal(srv.ctx.paths.root, to);
  const st = await call('GET', '/api/relocate');
  assert.equal(st.json.dataDir, to);
  assert.equal(st.json.canUndo, true);
  assert.equal(st.json.move.phase, 'finished');
  const renamed = Object.values(st.json.move.renamed)[0];
  assert.ok(existsSync(join(renamed, README)) && !existsSync(pc.data));
  assert.ok(readdirSync(dirname(pc.data)).some(n => n === basename(renamed)));
});
