// The page side of two-computer safety, loaded into a VM:
//  - hostsBannerModel (src/app/86-hosts-banner.js): which banners show, with
//    the exact texts, for each GET /api/hosts answer;
//  - saveData (src/app/01-core-state.js): a full browser storage
//    (QuotaExceededError) never stops the save from being queued for the server;
//  - serverStateWrite (src/app/04-core-persistence.js): a 423 keeps the edit
//    unsaved in the browser and shows the paused banner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const load = (box, ...files) => { vm.createContext(box); for (const f of files) vm.runInContext(readFileSync(join(APP, f), 'utf8'), box, { filename: f }); return box; };
const plain = (x) => JSON.parse(JSON.stringify(x));

test('banners: paused, also open, OneDrive, conflict copies; the texts', () => {
  const { hostsBannerModel } = load({}, '86-hosts-banner.js');
  assert.deepEqual(plain(hostsBannerModel(null)), []);
  assert.deepEqual(plain(hostsBannerModel({ paused: false, others: [], conflicts: [], oneDrive: false })), [], 'one computer, not in OneDrive: nothing');
  const paused = plain(hostsBannerModel({ paused: true, by: { hostname: 'WORK-LAPTOP', seen: '1 min ago' }, others: [{ hostId: 'a', hostname: 'WORK-LAPTOP', seen: '1 min ago' }], conflicts: [], oneDrive: false }));
  assert.equal(paused.length, 1, 'the paused banner replaces the also-open warning');
  assert.equal(paused[0].title, 'OpenDash is open on WORK-LAPTOP (seen 1 min ago).');
  assert.match(paused[0].sub, /^Changes here are paused so the two computers don’t overwrite each other\./);
  assert.deepEqual(paused[0].actions, [{ id: 'override', label: 'Use here anyway', primary: true }]);
  assert.equal(paused[0].dismissible, false);
  const also = plain(hostsBannerModel({ paused: false, others: [{ hostId: 'a', hostname: 'WORK-LAPTOP', seen: 'just now' }], conflicts: [], oneDrive: false }));
  assert.equal(also[0].kind, 'also-open');
  assert.equal(also[0].title, 'OpenDash is also open on WORK-LAPTOP (seen just now).');
  assert.equal(also[0].actions.length, 0, 'a later arrival is a warning only');
  assert.deepEqual(plain(hostsBannerModel({ others: [{ hostId: 'a', hostname: 'W' }] }, { dismissed: new Set(['also:a']) })), []);
  const od = plain(hostsBannerModel({ oneDrive: true }));
  assert.equal(od[0].title, 'Your data is in OneDrive: use OpenDash on one computer at a time.');
  assert.equal(od[0].dismissible, true);
  assert.deepEqual(plain(hostsBannerModel({ oneDrive: true }, { oneDriveOff: true })), [], 'dismissed for good');
  const cc = plain(hostsBannerModel({ conflicts: [{ rel: 'state/dashboard-state-WORK-LAPTOP.json', kind: 'state', device: 'WORK-LAPTOP', at: '2026-10-23T12:00:00Z' }] }));
  assert.equal(cc[0].kind, 'conflict');
  assert.match(cc[0].title, /^OneDrive kept a second copy from WORK-LAPTOP \(.+\)\.$/);
  assert.match(cc[0].sub, /your tasks and notes.*Nothing was merged/);
  assert.deepEqual(cc[0].actions, [{ id: 'keep', label: 'Keep as a backup', primary: false }]);
});

function stateBox({ storageFull, server = true }) {
  const toasts = [];
  let persisted = 0;
  const box = {
    state: { custom: [], _saveCount: 0, _lastBackup: Date.now() },   // no download backup without a server
    localStorage: { setItem() { if (storageFull) { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; } }, getItem: () => null, removeItem() {} },
    document: { getElementById: (id) => (id === 'toast-host' ? {} : null) },
    toast: (msg, opts) => toasts.push([msg, (opts && opts.kind) || null]),
    schedulePersist: () => { persisted++; },
    _serverAvailable: server,
    setTimeout, clearTimeout, console,
  };
  load(box, '01-core-state.js');
  return { box, toasts, persisted: () => persisted };
}

test('saveData: a full browser storage still queues the save for the server', () => {
  const { box, toasts, persisted } = stateBox({ storageFull: true });
  vm.runInContext('saveData()', box);
  assert.equal(persisted(), 1, 'schedulePersist ran');
  assert.equal(box.state._localDirty, true);
  assert.deepEqual(toasts, [['Browser storage is full; saved to the server', null]]);
  vm.runInContext('saveData()', box);
  assert.equal(persisted(), 2);
  assert.equal(toasts.length, 1, 'the notice is not repeated on every edit');
});

test('saveData: with room in storage nothing changes', () => {
  const { box, toasts, persisted } = stateBox({ storageFull: false });
  vm.runInContext('saveData()', box);
  assert.equal(persisted(), 1);
  assert.ok(!toasts.some(([m]) => /full|failed/i.test(m)));
});

test('saveData: full storage and no server says the save failed', () => {
  const { box, toasts } = stateBox({ storageFull: true, server: false });
  vm.runInContext('saveData()', box);
  assert.equal(toasts.length, 1);
  assert.equal(toasts[0][1], 'err');
  assert.match(toasts[0][0], /save failed: browser storage is full/i);
});

test('serverStateWrite: 423 keeps the edit in the browser and shows the paused banner', async () => {
  const paused = [];
  const box = {
    state: { custom: [{ id: 'a' }], _lastSave: 5, _localDirty: true },
    fetch: async () => ({ status: 423, ok: false, json: async () => ({ code: 'OTHER_COMPUTER', host: 'WORK-LAPTOP', lastSeen: '2026-10-23T12:00:00Z' }) }),
    hostsOnPaused: (j) => paused.push(j),
    updateSyncIndicator() {}, console, setTimeout, clearTimeout,
  };
  load(box, '04-core-persistence.js');
  vm.runInContext('_serverAvailable = true', box);
  const ok = await vm.runInContext('serverStateWrite()', box);
  assert.equal(ok, false);
  assert.equal(box.state._localDirty, true, 'still unsaved: sent once changes resume');
  assert.equal(paused.length, 1);
  assert.equal(paused[0].host, 'WORK-LAPTOP');
  assert.match(vm.runInContext('_serverLastError', box), /paused: OpenDash is open on WORK-LAPTOP/);
});
