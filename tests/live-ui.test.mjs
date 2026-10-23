// Settings > Sync, the live connection (src/app/58-settings-sync.js
// syncLiveLines / syncMainLines), loaded into a VM: what the user reads for
// each situation, in plain words.
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
const texts = (st) => [...box.syncLiveLines(st)].map(l => l.text);
const st = (live) => ({ enabled: true, cloud: 'OneDrive', live: { on: true, state: 'on', internet: true, reach: { state: 'mapped' }, peers: [], roles: [], ...live } });

test('live on the same Wi-Fi, and over the internet', () => {
  assert.deepEqual(texts(st({ peers: [{ name: 'Work laptop', state: 'live', path: 'lan' }] }))[0], 'Live with Work laptop (same Wi-Fi)');
  assert.deepEqual(texts(st({ peers: [{ name: 'Home laptop', state: 'live', path: 'internet' }] }))[0], 'Live with Home laptop (over the internet)');
  assert.match(texts(st({}))[1], /can reach this one over the internet/);
});

test('not live: the reason, and that OneDrive still carries the changes', () => {
  const one = (reason, reach = 'none') => texts(st({ reach: { state: reach }, peers: [{ name: 'Home laptop', state: 'not-live', reason }] }));
  assert.equal(one('router')[0], 'Not live with Home laptop: using OneDrive (your router does not allow incoming connections)');
  assert.equal(one('cgnat', 'cgnat')[0], 'Not live with Home laptop: using OneDrive (your internet provider does not allow incoming connections)');
  assert.match(one('cgnat', 'cgnat')[1], /shares one address between many homes/);
  assert.match(one('router')[1], /your router does not allow incoming connections/);
  assert.match(one('offline')[0], /^Not live: Home laptop is off or asleep; its changes come through OneDrive/);
  assert.match(one('no-address')[0], /has not shared how to reach it yet/);
  assert.match(one('new-key')[0], /waiting for OneDrive to bring the new sync key/);
  assert.equal(one('trying')[0], 'Connecting to Home laptop...');
});

test('Windows firewall: the one thing to click', () => {
  const t = texts(st({ firewall: true, peers: [{ name: 'Work laptop', state: 'not-live', reason: 'firewall' }] }));
  assert.match(t[0], /^Windows asked to allow OpenDash on private networks: click Allow\./);
  assert.match(t[1], /Windows on one of the computers is blocking OpenDash/);
});

test('which computer is main for each job; nothing when sync or live is off', () => {
  const s = st({ roles: [{ label: 'Gmail (me@example.com)', name: 'Home laptop', me: false, acting: true }, { label: 'Answering your phone', name: 'This computer', me: true, acting: false }] });
  assert.deepEqual([...box.syncMainLines(s)], ['Gmail (me@example.com): Home laptop', 'Answering your phone: this computer (taking over)']);
  assert.deepEqual(texts({ enabled: false, live: s.live }), []);
  assert.deepEqual(texts({ enabled: true }), []);
  assert.match(texts({ enabled: true, cloud: 'OneDrive', live: { on: false } })[0], /^Live sync is off: changes travel through OneDrive/);
  assert.deepEqual(texts(st({ state: 'waiting', why: 'no-key' })), [], 'nothing to say until encrypted sync is ready');
  assert.match(texts(st({ internet: false }))[1], /does not ask your router/);
});
