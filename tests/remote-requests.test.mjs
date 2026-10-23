// Connect once, use everywhere (docs/dev/MULTI_DEVICE.md): what each device can
// do (lib/sync/caps.mjs), the remote request queue (lib/sync/requests.mjs) and
// its Node service (lib/remote-jobs.mjs) on real sync engines in temp folders.
//   - capabilities never carry a secret; the group decides what is available
//   - the allow-list refuses unknown kinds and bad params, on the way in and before running
//   - a non-account source's snapshot is published by the device that reads it
//   - two capable devices that both claim a request: it runs once
//   - the holder is off: the requester says so after a short wait
//   - a phone (never runs jobs) asks through the same path
// No real Claude: the jobs are fake functions (the spawn guard blocks real CLIs anyway).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir, rm, stopAll, makeDevice, sleep, keepAlive, waitFor, engines } from './sync.shared.mjs';
import { cleanCaps, hasNeed, pickRunner, groupView, jobNeed, sourceOwner, ONLINE_MS } from '../lib/sync/caps.mjs';
import { KINDS, checkRequest, newRequest, enqueue, prune, claim, finish, cancel, readDoc, MAX_OPEN_PER_DEVICE } from '../lib/sync/requests.mjs';
import { createRemoteJobs, setLocalCapsFor } from '../lib/remote-jobs.mjs';
import { createStateStore } from '../server/state-store.mjs';
import { createNodeSyncEngine } from '../lib/sync/node-host.mjs';

const base = tempDir('remote-req-');
const release = keepAlive();
const services = [];
after(async () => { for (const s of services) s.stop(); await stopAll(); release(); rm(base); });

const readJ = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const writeJ = (p, v) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 1)); };
const settle = async (...ds) => { for (let i = 0; i < 3; i++) { for (const d of ds) await d.eng.syncNow(); await sleep(40); } };

// ─── Pure: capabilities ────────────────────────────────────────────────
test('capabilities keep only what is safe to publish: no URL, server, token or address', () => {
  const c = cleanCaps({
    v: 1, at: 5, claude: true, token: ['sk', 'ant', 'secret-0123456789abcdef'].join('-'), url: 'https://cal.example.com/private/abc.ics',
    sources: [{ id: 'calendar-work-ab12', capability: 'calendar', kind: 'ical', label: 'Work <b>', url: 'https://x.example/secret.ics', server: 'my-server', colour: 'blue' },
      { id: 'BAD ID', capability: 'calendar', kind: 'ical' }, { id: 'bank-x-1', capability: 'bank', kind: 'shell' }],
    accounts: ['acc_00000000000000a1', 'not ok!'], banks: [], apply: true,
  });
  assert.deepEqual(Object.keys(c).sort(), ['accounts', 'apply', 'at', 'background', 'banks', 'claude', 'kind', 'sources', 'v']);
  assert.deepEqual(c.sources, [{ id: 'calendar-work-ab12', capability: 'calendar', kind: 'ical', label: 'Work b', colour: 'blue' }]);
  assert.deepEqual(c.accounts, ['acc_00000000000000a1']);
  assert.ok(!JSON.stringify(c).includes('secret') && !JSON.stringify(c).includes('my-server'));
  assert.equal(cleanCaps({ v: 2, claude: true }), null, 'an unknown version is not read');
  assert.equal(hasNeed(c, 'claude'), true);
  assert.equal(hasNeed(c, 'calendar'), true);
  assert.equal(hasNeed(c, 'email'), false);
  assert.equal(hasNeed(c, 'source:calendar-work-ab12'), true);
  assert.equal(jobNeed('ai-brief'), 'claude');
  assert.equal(jobNeed('connectors'), 'connectors');
});

test('the group decides: a device without Claude sees it on the other device; nobody has it -> nothing', () => {
  const now = 1_800_000_000_000;
  const home = { deviceId: '1111111111111111', fetcherId: 'host-home-0001', name: 'Home laptop', me: false, lastSeen: now - 60_000, caps: cleanCaps({ v: 1, claude: true, apply: true }) };
  const work = { deviceId: '2222222222222222', fetcherId: 'host-work-0002', name: 'Work laptop', me: true, lastSeen: now, caps: cleanCaps({ v: 1, claude: false, apply: true }) };
  const g = groupView({ devices: [home, work], now, apply: true });
  assert.deepEqual(g.has.claude, [{ name: 'Home laptop', online: true, apply: true }]);
  assert.deepEqual(g.has.calendar, []);
  assert.equal(pickRunner({ devices: [home, work], need: 'claude', now, requireApply: true }).name, 'Home laptop');
  // asleep (unseen for a while) still counts for "the group has it", but is not online
  const asleep = { ...home, lastSeen: now - ONLINE_MS - 1000 };
  assert.equal(groupView({ devices: [asleep, work], now }).has.claude[0].online, false);
  assert.equal(pickRunner({ devices: [asleep, work], need: 'claude', now }).name, 'Home laptop');
  // in trial mode it cannot see a request
  assert.equal(pickRunner({ devices: [{ ...home, caps: { ...home.caps, apply: false } }, work], need: 'claude', now, requireApply: true }), null);
  // nobody has Claude
  assert.equal(pickRunner({ devices: [{ ...home, caps: cleanCaps({ v: 1 }) }, work], need: 'claude', now }), null);
  // a device unseen for weeks no longer counts at all
  assert.deepEqual(groupView({ devices: [{ ...home, lastSeen: now - 30 * 86400000 }, work], now }).has.claude, []);
  // two capable: the online one with the smallest id, unless the lease or a preferred one says otherwise
  const office = { ...home, deviceId: '3333333333333333', fetcherId: 'host-aaaa-0003', name: 'Office PC' };
  assert.equal(pickRunner({ devices: [home, office, work], need: 'claude', now }).name, 'Office PC');
  assert.equal(pickRunner({ devices: [home, office, work], need: 'claude', now, preferred: ['host-home-0001'] }).name, 'Home laptop');
  assert.equal(pickRunner({ devices: [home, office, work], need: 'claude', now, lease: '1111111111111111' }).name, 'Home laptop');
  assert.equal(sourceOwner([{ ...home, caps: cleanCaps({ v: 1, sources: [{ id: 'calendar-work-ab12', capability: 'calendar', kind: 'ical', label: 'W' }] }) }, work], 'calendar-work-ab12', { now }), 'host-home-0001');
});

// ─── Pure: the allow-list and the queue ────────────────────────────────
test('the allow-list refuses unknown kinds and bad params; params are cleaned', () => {
  for (const k of ['shell', 'exec', 'assistant', '__proto__', 'toString', 'fetch:finance', '']) assert.throws(() => checkRequest(k, {}), /not something another device can be asked/, k);
  assert.throws(() => checkRequest('ai', {}), /prompt is required/);
  assert.throws(() => checkRequest('ai', { prompt: 'x'.repeat(100001) }), /too long/);
  assert.throws(() => checkRequest('ai', { prompt: 'hi', model: 'gpt-4' }), /model not allowed/);
  assert.throws(() => checkRequest('ai', { prompt: 'hi', effort: 'max' }), /effort/);
  assert.throws(() => checkRequest('story', { kind: 'rm -rf /' }), /kind must be/);
  assert.throws(() => checkRequest('brief', { kind: 'brief', date: 'tomorrow', facts: {} }), /date/);
  const ai = checkRequest('triage', { prompt: 'Suggest tasks', tools: ['Bash'], cmd: 'calc.exe', zone: 'Europe/London', mcpServer: { command: 'x' } });
  assert.deepEqual(ai.params, { prompt: 'Suggest tasks', zone: 'Europe/London' }, 'anything not on the list is dropped');
  assert.equal(ai.need, 'claude');
  assert.deepEqual(checkRequest('dayplan', { automatic: true, extra: 1 }).params, { automatic: false }, 'a remote day plan is always a click');
  assert.deepEqual(checkRequest('fetch:calendar', { force: false, back: 7, ahead: 99999 }).params, { force: true, back: 7 });
  assert.equal(checkRequest('ai', { prompt: 'x', zone: 'Not a zone; rm' }).params.zone, undefined);
  for (const k of Object.keys(KINDS)) assert.ok(KINDS[k].path.startsWith('/api/') && KINDS[k].need, k);
});

test('queue: cap per device, claim once, cancel, expiry, pruning', () => {
  const doc = { version: 1, requests: [] };
  const t = 1_800_000_000_000;
  const mk = (i, by = 'host-work-0002') => newRequest({ id: 'rq_' + String(i).padStart(8, '0'), kind: 'ai', params: { prompt: 'p' + i }, by, now: t });
  for (let i = 0; i < MAX_OPEN_PER_DEVICE; i++) enqueue(doc, mk(i), { now: t });
  assert.throws(() => enqueue(doc, mk(99), { now: t }), (e) => e.code === 'TOO_MANY');
  enqueue(doc, mk(100, 'host-phone-0003'), { now: t });          // another device has its own allowance
  const r = readDoc(doc).requests[0];
  assert.equal(claim(r, 'host-home-0001', t + 1), true);
  assert.equal(claim(r, 'host-office-04', t + 2), false, 'claimed already');
  assert.equal(finish(r, 'host-office-04', { ok: true }), false, 'only the claimer answers');
  assert.equal(finish(r, 'host-home-0001', { ok: true, result: { status: 200, body: { text: 'hi' } }, now: t + 3 }), true);
  assert.equal(r.status, 'done');
  const r2 = readDoc(doc).requests[1];
  assert.equal(cancel(r2, t + 4), true);
  assert.equal(claim(r2, 'host-home-0001', t + 5), false, 'a cancelled request is never run');
  const r3 = readDoc(doc).requests[2];
  assert.equal(claim(r3, 'host-home-0001', r3.exp + 1), false, 'past its time');
  prune(doc, { now: r3.exp + 1 });
  assert.equal(doc.requests.find(x => x.id === r3.id).status, 'expired');
  prune(doc, { now: t + 3 * 60 * 60 * 1000 });
  assert.ok(!doc.requests.some(x => x.status === 'done' || x.status === 'cancelled'), 'finished ones go after a while');
});

// ─── Engines: three computers and a phone on one (temp) sync folder ────
const cloud = join(base, 'cloud');
mkdirSync(cloud);
const capsOf = {};
function service(dev, { invoke, timing } = {}) {
  setLocalCapsFor(dev.data, async () => capsOf[dev.name] || { claude: false });
  const ctx = { dataDir: dev.data, paths: { root: dev.data }, sync: dev.eng };
  const rj = createRemoteJobs({ ctx, invoke: invoke || (async () => ({ status: 500, body: { error: 'no job here' } })), timing: { settleMs: 1200, offlineAfterMs: 300, tickMs: 60000, capsFreshMs: 0, ...timing } });
  rj.attach(dev.eng);
  services.push(rj);
  return rj;
}
const runs = { A: 0, C: 0 };
const fakeJob = (who, dev) => async (method, path, { body }) => {
  runs[who]++;
  if (path === '/api/story/advice') writeJ(join(dev.data, 'brief', 'day-advice.json'), { date: '2026-10-23', summary: `made on ${who}`, ideas: [] });
  return { status: 200, body: { summary: `made on ${who}`, path, body } };
};

const A = makeDevice(base, 'A'), B = makeDevice(base, 'B'), C = makeDevice(base, 'C');
let rjA, rjB, rjC;

test('a non-account source is published by the device that reads it and received by the others', async () => {
  capsOf.A = { claude: true, sources: [{ id: 'calendar-work-ab12', capability: 'calendar', kind: 'ical', label: 'Work calendar', colour: 'teal' }] };
  capsOf.B = { claude: false };
  capsOf.C = { claude: false };
  rjA = service(A, { invoke: fakeJob('A', A) });
  rjB = service(B);
  for (const [d, name] of [[A, 'Home laptop'], [B, 'Work laptop']]) { await d.eng.start(); await d.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: name }); }
  await rjA.refreshCaps(); await rjB.refreshCaps();
  const snapA = join(A.data, 'calendar', 'sources', 'calendar-work-ab12.json'), snapB = join(B.data, 'calendar', 'sources', 'calendar-work-ab12.json');
  writeJ(snapA, { version: 1, sourceId: 'calendar-work-ab12', fetchedAt: '2026-10-23T09:00:00Z', calendars: [{ id: 'feed', name: 'Work' }], events: [{ id: 'e1', summary: 'Stand-up', calendarId: 'calendar-work-ab12/feed', start: { dateTime: '2026-10-23T09:30:00Z' }, end: { dateTime: '2026-10-23T09:45:00Z' } }] });
  await settle(A, B);
  await waitFor(async () => { await settle(A, B); return !!readJ(snapB); }, 8000, 'the snapshot on B');
  assert.deepEqual(readJ(snapB).events.map(e => e.id), ['e1']);
  // B sees what A can do, and the source as a remote one (shown, never fetched on B)
  await waitFor(async () => { await settle(A, B); const x = rjB.group(); return x && x.has.claude.length > 0; }, 8000, "A's capabilities on B");
  const g = rjB.group();
  assert.equal(g.has.claude[0].name, 'Home laptop');
  assert.equal(g.has.calendar[0].name, 'Home laptop');
  const remote = rjB.remoteSources('calendar', []);
  assert.deepEqual(remote.map(s => [s.id, s.label, s.remote.name]), [['calendar-work-ab12', 'Work calendar', 'Home laptop']]);
  assert.deepEqual(rjB.remoteSources('calendar', ['calendar-work-ab12']), [], 'one this computer reads itself is not doubled');
  // a stray copy on B is never sent: the next fetch on A wins and B mirrors it
  const stray = readJ(snapB); stray.events.push({ id: 'stray', summary: 'fetched by mistake on B' }); writeJ(snapB, stray);
  const pub = readJ(snapA); pub.events.push({ id: 'e2', summary: 'Lunch', calendarId: 'calendar-work-ab12/feed' }); writeJ(snapA, pub);
  await waitFor(async () => { await settle(A, B); const v = readJ(snapB); return v && v.events.some(e => e.id === 'e2'); }, 8000, 'the new event on B');
  assert.deepEqual(readJ(snapA).events.map(e => e.id), ['e1', 'e2'], "B's stray event never reached A");
  // the device record carries the capabilities, never the calendar link
  const folderText = JSON.stringify(readJ(join(cloud, 'OpenDash Sync', 'devices', A.eng.deviceId, 'device.json')));
  assert.match(folderText, /calendar-work-ab12/);
  assert.doesNotMatch(folderText, /https?:/);
});

test('jobs that need Claude go to a device that has it, whatever the main computer is', async () => {
  // B (no Claude) is made the main computer; the AI jobs still run on A, which has Claude.
  await B.eng.setFetcher('main');
  await settle(A, B);
  assert.equal(await A.eng.isFetcher('ai-brief'), true, 'A has Claude: it runs the AI brief');
  assert.equal(await B.eng.isFetcher('ai-brief'), false, 'B, the main computer, has no Claude');
  assert.equal(B.eng.fetcher('ai-brief').name, 'Home laptop', '"Runs on Home laptop"');
  assert.equal(await B.eng.isFetcher('bank'), true, 'nobody has a bank: the recorded rule (the main computer) as before');
  await B.eng.clearFetcher('main');
  await settle(A, B);
});

test('a request from B runs on A (the same job), the answer reaches B; a duplicate claim runs once', async () => {
  const req = await rjB.ask('dayplan', { automatic: true }, { zone: 'Europe/London' });
  assert.equal(req.params.automatic, false);
  await waitFor(async () => { await settle(A, B); return (await rjA.readQueue()).requests.some(r => r.id === req.id); }, 8000, 'the request on A');
  await rjA.tick();
  await waitFor(async () => { await settle(A, B); const r = await rjB.get(req.id); return r && r.status === 'done'; }, 15000, 'the answer on B');
  const r = await rjB.get(req.id);
  assert.equal(r.runsOn, 'Home laptop');
  assert.equal(r.result.body.summary, 'made on A');
  assert.deepEqual(r.result.body.body, { automatic: false }, 'the job got only the validated params');
  assert.equal(runs.A, 1);
  await waitFor(async () => { await settle(A, B); return !!readJ(join(B.data, 'brief', 'day-advice.json')); }, 8000, "A's result file on B");
  assert.equal(readJ(join(B.data, 'brief', 'day-advice.json')).summary, 'made on A', 'the result shows on both');

  // C also has Claude now; A and C both claim the same request at once: it runs once.
  capsOf.C = { claude: true };
  rjC = service(C, { invoke: fakeJob('C', C) });
  await C.eng.start(); await C.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Office PC' });
  await rjC.refreshCaps();
  // Both claim at the same moment (as two devices whose views differ would): no automatic step in between.
  rjA.timing.autoTick = false; rjC.timing.autoTick = false;
  const r2 = await rjB.ask('ai', { prompt: 'Say hi' });
  await waitFor(async () => { await settle(A, B, C); return (await rjA.readQueue()).requests.some(x => x.id === r2.id) && (await rjC.readQueue()).requests.some(x => x.id === r2.id); }, 10000, 'the request on A and C');
  const before = runs.A + runs.C;
  const both = await Promise.all([rjA.runOne(r2.id), rjC.runOne(r2.id)]);
  assert.equal(runs.A + runs.C - before, 1, `ran once (claims taken: ${both})`);
  await waitFor(async () => { await settle(A, B, C); const x = await rjB.get(r2.id); return x && x.status === 'done'; }, 10000, 'the answer on B');
  // the loser never runs it later either
  await rjA.tick(); await rjC.tick();
  rjA.timing.autoTick = true; rjC.timing.autoTick = true;
  assert.equal(runs.A + runs.C - before, 1);
});

test('the holder is off: after a short wait the requester says so, and nothing runs later', async () => {
  // A and C stop (shut down); B still knows them as recently seen, but not online.
  // Make them look asleep: their device records are older than the online window.
  for (const d of [A, C]) await d.eng.stop();
  const realNow = Date.now;
  const later = realNow() + ONLINE_MS + 60_000;
  const rjLate = createRemoteJobs({ ctx: { dataDir: B.data, paths: { root: B.data }, sync: B.eng }, invoke: async () => ({ status: 500, body: {} }), now: () => later, timing: { offlineAfterMs: 300, capsFreshMs: 0 } });
  services.push(rjLate);
  const req = await rjLate.ask('dayplan', {});
  const first = await rjLate.get(req.id);
  assert.equal(first.state, 'waiting');
  assert.match(first.message, /Asking (Home laptop|Office PC)/);
  // Date.now inside the engine is real, so the devices' last-seen times are "minutes ago" only for rjLate's clock.
  await sleep(10);
  const late = createRemoteJobs({ ctx: { dataDir: B.data, paths: { root: B.data }, sync: B.eng }, invoke: async () => ({ status: 500, body: {} }), now: () => later + 1000, timing: { offlineAfterMs: 300, capsFreshMs: 0 } });
  services.push(late);
  const off = await late.get(req.id);
  assert.equal(off.state, 'offline');
  assert.match(off.message, /(Home laptop|Office PC) is off\. Try again later, or set up Claude on this computer\./);
  const raw = (await late.readQueue()).requests.find(x => x.id === req.id);
  assert.equal(raw.status, 'error', 'it will not run when the holder wakes up');
  assert.equal(claim(raw, A.eng.fetcherId, later + 2000), false);
});

test('a phone (it never runs jobs) asks through the same path; the request survives a restart of the asker', async () => {
  for (const d of [A]) { await d.eng.start(); }
  await settle(A, B);
  // The phone: a foreground device of its own kind, no capabilities that run anything.
  const data = join(base, 'data-phone');
  mkdirSync(join(data, 'state'), { recursive: true });
  writeFileSync(join(data, 'state', 'dashboard-state.json'), JSON.stringify({ custom: [], _lastSave: 1 }));
  const store = createStateStore({ stateDir: join(data, 'state') });
  const eng = createNodeSyncEngine({ store, dataDir: data, localDir: join(base, 'local-phone'), host: 'host-phone', pollMs: 200, debounceMs: 30, background: false, kind: 'phone', detect: () => [] });
  engines.add(eng);
  const P = { name: 'P', data, store, eng };
  capsOf.P = { claude: false };
  const rjP = service(P);
  await eng.start(); await eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Phone' });
  await rjP.refreshCaps();
  await settle(A, B, P);
  await waitFor(async () => { await settle(A, P); return !!(await rjP.runnerFor('claude')); }, 8000, 'the phone sees a device with Claude');
  assert.equal(eng.caps.kind, 'phone');
  const req = await rjP.ask('taskchat', { prompt: 'What next?' });
  // the phone's server restarts before the answer: the queue is a file, it is still there
  rjP.stop();
  const rjP2 = service(P);
  await waitFor(async () => { await settle(A, P); return (await rjA.readQueue()).requests.some(x => x.id === req.id); }, 8000, 'the request on A');
  await rjA.runOne(req.id);      // (which device answers is the rule tested above; here: the phone's path)
  await waitFor(async () => { await settle(A, P); const x = await rjP2.get(req.id); return x && x.status === 'done'; }, 15000, 'the answer on the phone');
  assert.equal((await rjP2.get(req.id)).runsOn, 'Home laptop');
});
