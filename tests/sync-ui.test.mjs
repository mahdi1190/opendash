// Settings > Sync (src/app/58-settings-sync.js): the plain-language status
// helpers, loaded into a VM (nothing renders) and the live-sync label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const box = { registerSettingsGroup: () => {}, state: { view: 'home' } };
vm.createContext(box);
vm.runInContext(readFileSync(join(APP, '58-settings-sync.js'), 'utf8'), box);
const now = Date.UTC(2026, 9, 23, 12, 0, 0);

test('times read as people say them', () => {
  assert.equal(box.syncAgo(now - 2000, now), 'just now');
  assert.equal(box.syncAgo(now - 12000, now), '12 s ago');
  assert.equal(box.syncAgo(now - 2 * 60000, now), '2 min ago');
  assert.equal(box.syncAgo(now - 3 * 3600000, now), '3 h ago');
  assert.equal(box.syncAgo(now - 86400000, now), '1 day ago');
  assert.equal(box.syncAgo(null, now), '');
});

test('the status line: off, synced, waiting for the cloud, paused', () => {
  assert.deepEqual({ ...box.syncStatusLine({ enabled: false }, now) }, { tone: 'off', text: 'Off. Your data stays on this computer.' });
  assert.deepEqual({ ...box.syncStatusLine({ enabled: true, state: 'ok', lastSyncAt: now - 12000 }, now) }, { tone: 'ok', text: 'Synced 12 s ago' });
  assert.equal(box.syncStatusLine({ enabled: true, state: 'waiting', message: 'Waiting for OneDrive: the folder is not there.' }, now).text, 'Waiting for OneDrive: the folder is not there.');
  assert.equal(box.syncStatusLine({ enabled: true, state: 'error', message: 'Sync paused: OneDrive is holding a file.' }, now).tone, 'err');
  assert.equal(box.syncStatusLine(null, now).text, 'Reading...');
  const trial = box.syncStatusLine({ enabled: true, mode: 'shadow', state: 'ok', lastSyncAt: now, message: 'Trial mode: Work laptop has changes waiting (2 new tasks). Nothing here has been changed yet.' }, now);
  assert.equal(trial.tone, 'warn');
  assert.match(trial.text, /^Trial mode/);
});

test('other computers are listed by name with when they were last seen', () => {
  const st = { devices: [{ name: 'This one', me: true, lastSeen: now }, { name: 'Work laptop', me: false, lastSeen: now - 120000 }] };
  assert.deepEqual([...box.syncDeviceLines(st, now)], ['Another device: Work laptop, last seen 2 min ago']);
  assert.match(box.syncDeviceLines({ devices: [{ name: 'x', me: true }] }, now)[0], /No other computer yet/);
});

test('changes from another computer are labelled with its name in the live-sync toast', () => {
  const src = readFileSync(join(APP, '86-live-sync.js'), 'utf8');
  const fn = /function _liveSourceLabel\(d\) \{[\s\S]*?\n\}/.exec(src)[0];
  const b = {}; vm.createContext(b); vm.runInContext(fn, b);
  assert.equal(b._liveSourceLabel({ source: 'sync', client: 'Work laptop' }), 'Work laptop');
  assert.equal(b._liveSourceLabel({ source: 'sync' }), 'another computer');
});
