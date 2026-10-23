// lib/hosts.mjs: presence files of two fake computers on one temp data folder
// (each with its own injected device root), othersLive with an injected clock
// and clock differences, the write gate (pause at start, override, 3-minute
// expiry, warning only for a computer that appears later) and OneDrive
// conflict-copy detection with look-alikes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  createPresence, othersLive, readHosts, hostsDir, createWriteGate, otherComputerError, seenText,
  findConflictCopies, keepConflictCopy, LIVE_MS, BEAT_MS,
} from '../lib/hosts.mjs';
import { listBackups } from '../lib/sharing.mjs';
import { dataPaths } from '../lib/datadir.mjs';

const MIN = 60000;
function setup() {
  const t = mkdtempSync(join(tmpdir(), 'od-hosts-'));
  const data = join(t, 'data');
  mkdirSync(data);
  let clockA = Date.parse('2026-10-23T10:00:00Z'), clockB = clockA;
  const A = createPresence({ dataDir: data, version: '9.9.9', hostname: 'HOME-PC', pid: 101, now: () => clockA, device: { base: join(t, 'devA') }, intervalMs: 1e9 });
  const B = createPresence({ dataDir: data, version: '9.9.9', hostname: 'WORK-LAPTOP', pid: 202, now: () => clockB, device: { base: join(t, 'devB') }, intervalMs: 1e9 });
  return {
    t, data, A, B,
    get a() { return clockA; }, set a(v) { clockA = v; },
    get b() { return clockB; }, set b(v) { clockB = v; },
    done: async () => { await A.stop(); await B.stop(); rmSync(t, { recursive: true, force: true }); },
  };
}

test('presence: each computer writes only its own file; a clean stop removes it', async () => {
  const s = setup();
  try {
    assert.notEqual(s.A.hostId, s.B.hostId, 'random ids, never the computer name');
    await s.A.start(); await s.B.start();
    const files = readdirSync(hostsDir(s.data)).sort();
    assert.deepEqual(files, [`${s.A.hostId}.json`, `${s.B.hostId}.json`].sort());
    const a = JSON.parse(readFileSync(join(hostsDir(s.data), `${s.A.hostId}.json`), 'utf8'));
    assert.deepEqual(Object.keys(a).sort(), ['beatAt', 'hostId', 'hostname', 'pid', 'startedAt', 'version']);
    assert.equal(a.hostname, 'HOME-PC'); assert.equal(a.pid, 101); assert.equal(a.beatAt, s.a);
    assert.equal(readHosts(s.data).length, 2);
    await s.B.stop();
    assert.deepEqual(readdirSync(hostsDir(s.data)), [`${s.A.hostId}.json`]);
    assert.equal(BEAT_MS, 60000); assert.equal(LIVE_MS, 180000);
  } finally { await s.done(); }
});

test('othersLive: the other computer, never this one; gone 3 minutes after its last beat', async () => {
  const s = setup();
  try {
    await s.A.start(); await s.B.start();
    const memo = new Map();
    const seenByA = (at) => othersLive(s.data, at, { selfId: s.A.hostId, observer: memo });
    assert.deepEqual(seenByA(s.a).map(h => h.hostname), ['WORK-LAPTOP']);
    assert.deepEqual(s.B.others(s.b, { observer: new Map() }).map(h => h.hostname), ['HOME-PC']);
    assert.equal(seenByA(s.a + 2.5 * MIN).length, 1, 'still live 2.5 min after its beat');
    assert.equal(seenByA(s.a + 2.5 * MIN)[0].lastSeenMs, 2.5 * MIN);
    assert.equal(seenByA(s.a + 3 * MIN + 1).length, 0, 'not live after 3 minutes (a crash or sleep)');
    s.b += 4 * MIN; await s.B.beat();        // it wakes up and beats again
    s.a += 4 * MIN;
    assert.equal(seenByA(s.a).length, 1);
    // the files of other data folders and malformed files never count
    writeFileSync(join(hostsDir(s.data), 'not-a-host.json'), '{}');
    writeFileSync(join(hostsDir(s.data), `${'c'.repeat(24)}.json`), '{"hostId":"' + 'd'.repeat(24) + '","beatAt":1}');
    writeFileSync(join(hostsDir(s.data), `${'e'.repeat(24)}-WORK-LAPTOP.json`), '{}');
    assert.equal(readHosts(s.data).length, 2);
  } finally { await s.done(); }
});

test('othersLive with clock differences between the computers', async () => {
  const s = setup();
  try {
    await s.A.start();
    // B's clock is 2 minutes behind: its fresh beat looks 2 minutes old, still live
    s.b = s.a - 2 * MIN; await s.B.start();
    assert.equal(othersLive(s.data, s.a, { selfId: s.A.hostId, observer: new Map() }).length, 1);
    // ...and 2 minutes ahead: a beat "from the future" within the window is live too
    s.b = s.a + 2 * MIN; await s.B.beat();
    assert.equal(othersLive(s.data, s.a, { selfId: s.A.hostId, observer: new Map() }).length, 1);
    // 10 minutes off: not live at first look (no history) ...
    const memo = new Map();
    s.b = s.a - 10 * MIN; await s.B.beat();
    assert.equal(othersLive(s.data, s.a, { selfId: s.A.hostId, observer: memo }).length, 0);
    // ... but once its beat is seen to CHANGE, it is live by this computer's clock
    s.a += 1 * MIN; s.b += 1 * MIN; await s.B.beat();
    const l = othersLive(s.data, s.a, { selfId: s.A.hostId, observer: memo });
    assert.equal(l.length, 1);
    assert.equal(l[0].lastSeenMs, 0);
    // and gone 3 minutes after the last change this computer saw
    assert.equal(othersLive(s.data, s.a + 2 * MIN, { selfId: s.A.hostId, observer: memo }).length, 1);
    assert.equal(othersLive(s.data, s.a + 3 * MIN + 1, { selfId: s.A.hostId, observer: memo }).length, 0);
  } finally { await s.done(); }
});

test('write gate: another computer live at start pauses writes (423) until "Use here anyway"', async () => {
  const s = setup();
  try {
    await s.B.start(); await s.A.start();
    const gate = createWriteGate({ others: () => s.A.others(s.a, { observer: new Map() }), now: () => s.a, recheckMs: 0 });
    const st = gate.init();
    assert.equal(st.paused, true);
    assert.equal(st.by.hostname, 'WORK-LAPTOP');
    assert.throws(() => gate.check(), (e) => e.status === 423 && e.code === 'OTHER_COMPUTER' && e.host === 'WORK-LAPTOP' && !!e.lastSeen
      && /OpenDash is open on WORK-LAPTOP \(seen just now\)\. Changes here are paused so the two computers don't overwrite each other\./.test(e.message));
    const j = otherComputerError({ hostname: 'WORK-LAPTOP', beatAt: s.a, lastSeenMs: 61000 }).toJSON();
    assert.equal(j.code, 'OTHER_COMPUTER'); assert.equal(j.host, 'WORK-LAPTOP'); assert.match(j.error, /seen 1 min ago/);
    assert.equal(gate.override().paused, false);
    assert.doesNotThrow(() => gate.check());
    assert.equal(gate.status().overridden, true);
  } finally { await s.done(); }
});

test('write gate: writes resume by themselves once the other computer is gone (3 minutes)', async () => {
  const s = setup();
  try {
    await s.B.start(); await s.A.start();
    const memo = new Map();
    const gate = createWriteGate({ others: () => s.A.others(s.a, { observer: memo }), now: () => s.a, recheckMs: 10000 });
    gate.init();
    assert.throws(() => gate.check(), { code: 'OTHER_COMPUTER' });
    s.a += 2 * MIN;
    assert.throws(() => gate.check(), { code: 'OTHER_COMPUTER' });
    s.a += 1 * MIN + 1000;                     // B has not beaten for 3 min 1 s
    assert.doesNotThrow(() => gate.check());
    assert.equal(gate.status().paused, false);
    // B comes back: warning only, never a pause mid-edit
    s.b = s.a; await s.B.beat();
    assert.doesNotThrow(() => gate.check());
    assert.equal(gate.others().length, 1);
  } finally { await s.done(); }
});

test('write gate: a clean stop of the other computer resumes writes at once', async () => {
  const s = setup();
  try {
    await s.B.start(); await s.A.start();
    const gate = createWriteGate({ others: () => s.A.others(s.a, { observer: new Map() }), now: () => s.a, recheckMs: 0 });
    gate.init();
    await s.B.stop();
    assert.doesNotThrow(() => gate.check());
  } finally { await s.done(); }
});

test('write gate: nobody else at start, a computer that appears later is a warning only', async () => {
  const s = setup();
  try {
    await s.A.start();
    const gate = createWriteGate({ others: () => s.A.others(s.a, { observer: new Map() }), now: () => s.a, recheckMs: 0 });
    assert.equal(gate.init().paused, false);
    await s.B.start();
    assert.doesNotThrow(() => gate.check());
    assert.equal(gate.status().paused, false);
    assert.deepEqual(gate.others().map(h => h.hostname), ['WORK-LAPTOP']);
    // pauseLater (one-shot writers such as MCP in embedded mode): checked on every write
    const strict = createWriteGate({ others: () => s.A.others(s.a, { observer: new Map() }), now: () => s.a, pauseLater: true, recheckMs: 0 });
    assert.throws(() => strict.check(), { code: 'OTHER_COMPUTER' });
  } finally { await s.done(); }
});

test('seenText', () => {
  assert.equal(seenText(0), 'just now'); assert.equal(seenText(59999), 'just now');
  assert.equal(seenText(60000), '1 min ago'); assert.equal(seenText(5 * MIN + 10), '5 min ago');
});

// ─── conflict copies ──────────────────────────────────────────────────────
test('conflict copies: the known files with a device name, never look-alikes or backups', () => {
  const t = mkdtempSync(join(tmpdir(), 'od-conflicts-'));
  try {
    const st = join(t, 'state');
    mkdirSync(join(st, 'backups', 'daily'), { recursive: true });
    const real = ['state/dashboard-state-WORK-LAPTOP.json', 'state/actions-journal-WORK-LAPTOP.json', 'config-HOME-PC.json', 'sources-DESKTOP-AB12CD3.json', 'connections-WORK-LAPTOP.json', 'state/dashboard-state-MacBook-Pro-2.json'];
    const lookAlikes = [
      'state/dashboard-state.json', 'config.json', 'sources.json', 'connections.json',
      'state/dashboard-state.json.lock', 'state/.dashboard-state.json.tmp-123-abcd', 'state/dashboard-state-WORK-LAPTOP.json.lock',
      'state/dashboard-state-backup.json', 'state/dashboard-state-v2.json', 'state/dashboard-state-2.json', 'config-old.json', 'config-copy.json',
      'state/dashboard-state-WORK-LAPTOP.txt', 'state/dashboard-WORK-LAPTOP.json', 'config-WORK LAPTOP.json',
      'state/backups/dashboard-state-WORK-LAPTOP.json', 'state/backups/daily/config-WORK-LAPTOP.json',
      'dashboard-state-WORK-LAPTOP.json',       // the state belongs in state/, not the top
      'state/config-WORK-LAPTOP.json',          // config belongs at the top
      'migrations-WORK-LAPTOP.json', 'state/calendar-WORK-LAPTOP.json',
    ];
    for (const f of [...real, ...lookAlikes]) { mkdirSync(join(t, f, '..'), { recursive: true }); writeFileSync(join(t, f), '{"custom":[]}'); }
    const found = findConflictCopies(t);
    assert.deepEqual(found.map(c => c.rel).sort(), real.slice().sort());
    const byRel = Object.fromEntries(found.map(c => [c.rel, c]));
    assert.equal(byRel['state/dashboard-state-WORK-LAPTOP.json'].kind, 'state');
    assert.equal(byRel['state/dashboard-state-WORK-LAPTOP.json'].device, 'WORK-LAPTOP');
    assert.equal(byRel['state/actions-journal-WORK-LAPTOP.json'].kind, 'journal');
    assert.equal(byRel['sources-DESKTOP-AB12CD3.json'].device, 'DESKTOP-AB12CD3');
    assert.ok(byRel['config-HOME-PC.json'].at && byRel['config-HOME-PC.json'].size > 0);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

test('"Keep as a backup": the state copy becomes a restorable backup; the stray copy is gone; no merge', async () => {
  const t = mkdtempSync(join(tmpdir(), 'od-keep-'));
  try {
    mkdirSync(join(t, 'state'));
    const mine = '{"custom":[{"id":"a","title":"this computer"}],"_lastSave":5}';
    const theirs = '{"custom":[{"id":"b","title":"the other computer"}],"_lastSave":4}';
    writeFileSync(join(t, 'state', 'dashboard-state.json'), mine);
    writeFileSync(join(t, 'state', 'dashboard-state-WORK-LAPTOP.json'), theirs);
    writeFileSync(join(t, 'config-WORK-LAPTOP.json'), '{"userName":"x"}');
    const r = keepConflictCopy(t, 'state/dashboard-state-WORK-LAPTOP.json', { now: () => Date.parse('2026-10-23T10:00:00Z') });
    assert.equal(r.name, 'onedrive-WORK-LAPTOP-2026-10-23T10-00-00-000Z.json');
    assert.equal(readFileSync(join(t, 'state', 'backups', r.name), 'utf8'), theirs);
    assert.equal(existsSync(join(t, 'state', 'dashboard-state-WORK-LAPTOP.json')), false);
    assert.equal(readFileSync(join(t, 'state', 'dashboard-state.json'), 'utf8'), mine, 'the live state is untouched: nothing is merged');
    const listed = (await listBackups(dataPaths(t))).find(b => b.name === r.name);
    assert.ok(listed, 'Settings > Data lists it');
    assert.equal(listed.kind, 'OneDrive copy');
    const c = keepConflictCopy(t, 'config-WORK-LAPTOP.json');
    assert.match(c.name, /^onedrive-copies\/config-WORK-LAPTOP-.*\.json$/);
    assert.ok(existsSync(join(t, 'state', 'backups', ...c.name.split('/'))));
    assert.ok(!(await listBackups(dataPaths(t))).some(b => b.name.includes('config-')), 'only state copies are offered for restore');
    assert.deepEqual(findConflictCopies(t), []);
    for (const bad of ['state/dashboard-state.json', '../x.json', 'state/dashboard-state-WORK-LAPTOP.json', 'C:/x.json']) {
      assert.throws(() => keepConflictCopy(t, bad), { status: 404 });
    }
  } finally { rmSync(t, { recursive: true, force: true }); }
});
