// The time route and the server side of the resolver (travel spec 2.2, 2.4, 7.2,
// 7.3 "Server"): time.json round trip and pruning, the observe rate limit, the
// zone header (a bad one is ignored), get_context's "today" following time.json,
// and history removal. The whole server runs in-process on a synthetic data folder.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { request, createServer } from 'node:http';
import { makeDataDir } from './fixtures/actions-state.mjs';
import { createActions } from '../server/actions/index.mjs';
import { createTimeStore, normalizeTimeFile, pruneChanges, clockTodayIn, processZone, MAX_CHANGES } from '../lib/clock.mjs';

let dir, port, srv;
function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }
function raw(method, path, { headers = {}, body } = {}) {
  const data = body === undefined ? undefined : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
  if (data) headers = { 'Content-Length': String(data.length), ...headers };
  return new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, agent: false, headers: { Host: `localhost:${port}`, ...headers } }, (r) => {
      const chunks = []; r.on('data', d => chunks.push(d));
      r.on('end', () => { const t = Buffer.concat(chunks).toString('utf8'); let json = null; try { json = JSON.parse(t); } catch {} res({ status: r.statusCode, json, text: t }); });
    });
    req.on('error', rej);
    if (data) req.write(data);
    req.end();
  });
}
const same = () => ({ Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' });
const get = (p, h = {}) => raw('GET', p, { headers: { ...same(), ...h } });
const send = (m, p, body, h = {}) => raw(m, p, { headers: { 'Content-Type': 'application/json', ...same(), ...h }, body });
// A zone that is never this machine's, so following it is visible.
const FAR = processZone() === 'Pacific/Kiritimati' ? 'Pacific/Pago_Pago' : 'Pacific/Kiritimati';

before(async () => {
  dir = makeDataDir();
  port = await freePort();
  const { main } = await import('../server/index.mjs');
  srv = await main(['--port', String(port), '--no-open', '--data-dir', dir]);
});
after(async () => {
  await srv?.close();
  rmSync(dir, { recursive: true, force: true });
});

test('time.json: round trip, a change appended, junk dropped, pruned to 50 and keepDays', async () => {
  const tdir = makeDataDir(undefined, { observedZone: null });
  try {
    let t = 1_790_000_000_000;
    const store = createTimeStore(tdir, { now: () => t, keepDays: () => 30 });
    assert.deepEqual(await store.get(), { version: 1, system: null, changes: [] });
    let r = await store.observe('Europe/London', 60, t);
    assert.deepEqual([r.ok, r.changed, r.wrote], [true, false, true], 'the first reading is not a change');
    r = await store.observe('Europe/London', 60, t + 60000);
    assert.equal(r.wrote, false, 'the same zone within 10 min is not written again');
    r = await store.observe('asia/calcutta', 330, t + 120000);
    assert.deepEqual([r.changed, r.from, r.to], [true, 'Europe/London', 'Asia/Kolkata']);
    const got = await store.get();
    assert.equal(got.system.zone, 'Asia/Kolkata');
    assert.equal(got.system.offsetMin, 330);
    assert.deepEqual(got.changes.map(c => [c.from, c.to]), [['Europe/London', 'Asia/Kolkata']]);
    assert.equal(store.peek().system.zone, 'Asia/Kolkata', 'peek() is the last reading, without I/O');
    assert.deepEqual(await store.observe('Mars/Base', 0, t), { ok: false, error: 'unknown time zone' });
    const file = JSON.parse(readFileSync(join(tdir, 'time.json'), 'utf8'));
    assert.equal(file.version, 1);
    // A hand-edited file: bad entries dropped, sorted.
    assert.deepEqual(normalizeTimeFile({ system: { zone: 'Nope/Nope', at: 'x' }, changes: [{ at: '2026-10-02T00:00:00Z', to: 'Asia/Tokyo' }, { at: 'bad', to: 'Asia/Tokyo' }, { at: '2026-10-01T00:00:00Z', from: 'GB', to: 'Europe/Paris' }] }),
      { version: 1, system: null, changes: [{ at: '2026-10-01T00:00:00.000Z', from: 'Europe/London', to: 'Europe/Paris' }, { at: '2026-10-02T00:00:00.000Z', from: null, to: 'Asia/Tokyo' }] });
    // Pruning: at most 50, none older than keepDays.
    const now = Date.parse('2026-10-04T00:00:00Z');
    const many = Array.from({ length: 80 }, (_, i) => ({ at: new Date(now - (79 - i) * 3600000).toISOString(), from: 'Europe/London', to: 'Asia/Tokyo' }));
    assert.equal(pruneChanges(many, { now }).length, MAX_CHANGES);
    assert.equal(pruneChanges([{ at: '2026-08-01T00:00:00Z', from: null, to: 'Asia/Tokyo' }, { at: '2026-10-01T00:00:00Z', from: null, to: 'Asia/Tokyo' }], { now, keepDays: 30 }).length, 1);
    // History and forgetting a window (the current system zone stays).
    t += 3 * 3600000;
    await store.observe('Asia/Tokyo', 540, t);
    assert.equal((await store.history({})).length, 2);
    assert.equal((await store.history({ from: new Date(t - 60000).toISOString() })).length, 1);
    assert.deepEqual(await store.forget({ from: new Date(t - 60000).toISOString(), to: new Date(t + 60000).toISOString() }), { ok: true, removed: 1 });
    assert.equal((await store.get()).system.zone, 'Asia/Tokyo');
    assert.deepEqual(await store.forget({}), { ok: true, removed: 1 });
    assert.equal((await store.get()).changes.length, 0);
  } finally { rmSync(tdir, { recursive: true, force: true }); }
});

test('GET /api/time, POST /api/time/observe (validated, once per 10 s per client), live "today"', async () => {
  let r = await get('/api/time');
  assert.equal(r.status, 200);
  assert.equal(r.json.home, 'Europe/London');
  assert.equal(r.json.follow, 'system');
  assert.ok('overrideReady' in r.json);
  // Bad input.
  assert.equal((await send('POST', '/api/time/observe', { zone: 'Mars/Base' })).status, 400);
  assert.equal((await send('POST', '/api/time/observe', { zone: 'Asia/Tokyo', offsetMin: 99999 })).status, 400);
  assert.equal((await raw('POST', '/api/time/observe', { headers: { 'Content-Type': 'application/json', Origin: 'http://evil.example' }, body: { zone: 'Asia/Tokyo' } })).status, 403, 'same origin only');
  assert.equal((await raw('POST', '/api/time/observe', { headers: { 'Content-Type': 'text/plain', ...same() }, body: 'zone=Asia/Tokyo' })).status, 415);
  // The page reports the computer's zone; a second report within 10 s from the same tab is refused.
  r = await send('POST', '/api/time/observe', { zone: 'Europe/London', offsetMin: 60, client: 'tab-a' });
  assert.equal(r.status, 200);
  r = await send('POST', '/api/time/observe', { zone: FAR, offsetMin: 840, client: 'tab-a' });
  assert.equal(r.status, 429);
  assert.ok(r.json.retryAfterMs > 0 && r.json.retryAfterMs <= 10000);
  r = await send('POST', '/api/time/observe', { zone: FAR, offsetMin: 840, client: 'tab-b' });
  assert.equal(r.status, 200);
  assert.equal(r.json.changed, true);
  // No header: the server follows what the page told it (time.json).
  r = await raw('GET', '/api/time', { headers: same() });
  assert.equal(r.json.system.zone, FAR);
  assert.equal(r.json.effective, FAR);
  assert.equal(r.json.today, clockTodayIn(FAR, Date.now()));
  assert.equal(r.json.changes.at(-1).to, FAR);
  // The log has the event, never the zone id.
  const log = readFileSync(join(dir, 'logs', 'server.log'), 'utf8');
  assert.match(log, /time observe: changed/);
  assert.ok(!log.includes(FAR), 'zone ids stay out of the log');
});

test('the request header wins for that request; a bad header is ignored', async () => {
  let r = await raw('GET', '/api/time', { headers: { ...same(), 'X-Dashboard-Zone': 'Asia/Tokyo' } });
  assert.equal(r.json.effective, 'Asia/Tokyo');
  r = await raw('GET', '/api/time', { headers: { ...same(), 'X-Dashboard-Zone': '../../etc' } });
  assert.equal(r.json.effective, FAR, 'junk header: time.json');
  r = await raw('GET', '/api/query?op=context.get', { headers: { ...same(), 'X-Dashboard-Zone': 'Asia/Tokyo' } });
  assert.equal(r.status, 200);
  assert.equal(r.json.timezone, 'Asia/Tokyo');
  assert.equal(r.json.homeTimezone, 'Europe/London');
  assert.equal(r.json.today, clockTodayIn('Asia/Tokyo', Date.now()));
  assert.ok(!('away' in r.json), 'only the zone by default (trips need "Let Claude see trips")');
});

test('get_context in another process (the MCP) follows time.json, not its own clock', async () => {
  // A second actions instance on the same folder = the MCP's embedded mode.
  const actions = createActions({ dataDir: dir });
  const ctx = await actions.query('context.get', {});
  assert.equal(ctx.timezone, FAR);
  assert.equal(ctx.homeTimezone, 'Europe/London');
  assert.equal(ctx.today, clockTodayIn(FAR, Date.now()));
  // A stale reading (older than 12 h) falls back to this process's own zone.
  const tdir = makeDataDir();
  try {
    writeFileSync(join(tdir, 'time.json'), JSON.stringify({ version: 1, system: { zone: FAR, at: new Date(Date.now() - 13 * 3600000).toISOString() }, changes: [] }));
    const c2 = await createActions({ dataDir: tdir }).query('context.get', {});
    assert.equal(c2.timezone, processZone());
  } finally { rmSync(tdir, { recursive: true, force: true }); }
});

test('DELETE /api/time/history forgets zone changes in a window (or all)', async () => {
  let r = await send('DELETE', '/api/time/history', { from: 'not a date' });
  assert.equal(r.status, 400);
  r = await send('DELETE', '/api/time/history', { from: '2000-01-01', to: '2000-01-02' });
  assert.deepEqual(r.json, { ok: true, removed: 0 }, `${r.status} ${r.text}`);
  r = await send('DELETE', '/api/time/history', {});
  assert.equal(r.status, 200);
  assert.ok(r.json.removed >= 1);
  r = await get('/api/time');
  assert.equal(r.json.changes.length, 0);
  assert.equal(r.json.system.zone, FAR, 'the current zone stays');
  assert.ok(existsSync(join(dir, 'time.json')));
});

test('config.time is validated; Settings can only store known modes and zones', async () => {
  let r = await send('PUT', '/api/config', { time: { follow: 'moon' } });
  assert.equal(r.status, 400);
  r = await send('PUT', '/api/config', { time: { follow: 'zone' } });
  assert.equal(r.status, 400, 'a fixed zone needs the zone');
  r = await send('PUT', '/api/config', { time: { follow: 'zone', zone: 'Asia/Tokyo', clock12: true } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json.time, { follow: 'zone', zone: 'Asia/Tokyo', clock12: true });
  r = await send('PUT', '/api/config', { time: { follow: 'system', zone: null, clock12: null } });
  assert.deepEqual(r.json.time, { follow: 'system' });
  r = await send('PUT', '/api/config', { time: { trip: { zone: 'Asia/Tokyo', until: 'soon' } } });
  assert.equal(r.status, 400);
});
