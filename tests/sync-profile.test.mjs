// The person's settings follow the person (lib/profile.mjs): their part of
// config.json (name, own addresses, home zone, working hours...) syncs through
// <data>/profile.json; this computer's part (paths, its zone and trips, its
// weather place, notifications) never leaves it. A fresh computer that joins
// gets the main computer's myEmails, so a calendar of someone else's address
// starts hidden on both (the trial's second copy showed it).
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import { tempDir, rm, stopAll, makeDevice, sleep, keepAlive, waitFor } from './sync.shared.mjs';
import { loadConfig, saveConfig, DEFAULT_CONFIG } from '../lib/datadir.mjs';
import { writeProfile, applyProfile, personOf, PERSON_KEYS, LOCAL_KEYS, PROFILE_REL } from '../lib/profile.mjs';
import { calendarDefaultOn } from '../lib/sources.mjs';
import { mergeCalendarData } from '../lib/calendar-sources.mjs';

const base = tempDir('sync-profile-');
const release = keepAlive();
after(async () => { await stopAll(); release(); rm(base); });
const cloud = join(base, 'cloud');
mkdirSync(cloud);
const settle = async (...ds) => { for (let i = 0; i < 3; i++) { for (const d of ds) await d.eng.syncNow(); await sleep(40); } };
const readJ = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);

/** A computer as the server wires it: config in memory, every save writes profile.json, a received one is applied. */
async function computer(name, configPatch) {
  const d = makeDevice(base, name);
  if (configPatch) await saveConfig(d.data, configPatch);
  let config = await loadConfig(d.data);
  d.getConfig = () => config;
  d.setConfig = async (patch) => { config = await saveConfig(d.data, patch); await writeProfile(d.data, config, { defaults: DEFAULT_CONFIG }); return config; };
  d.applied = [];
  d.eng.onApplied((info) => { if ((info.fileRels || []).includes(PROFILE_REL)) applyProfile(d.data, { getConfig: d.getConfig, setConfig: d.setConfig }).then(k => d.applied.push(...k)); });
  await writeProfile(d.data, config, { defaults: DEFAULT_CONFIG });           // at start (server/routes/sync.mjs)
  return d;
}

test('every config key is classified: the person\'s or this computer\'s', () => {
  const keys = Object.keys(DEFAULT_CONFIG).concat('travel');
  for (const k of keys) assert.ok(PERSON_KEYS[k] || LOCAL_KEYS[k], `${k} is classified in lib/profile.mjs`);
  for (const k of Object.keys(PERSON_KEYS)) assert.ok(!LOCAL_KEYS[k], k);
  for (const k of ['financeDir', 'time', 'location', 'notifications', 'travel']) assert.ok(LOCAL_KEYS[k], `${k} stays on this computer`);
  for (const k of ['myEmails', 'userName', 'timezone', 'workHours']) assert.ok(PERSON_KEYS[k], `${k} follows the person`);
  const p = personOf({ ...DEFAULT_CONFIG, financeDir: 'C:/Users/me/finance', time: { follow: 'zone', zone: 'Asia/Tokyo' } });
  assert.equal(p.financeDir, undefined);
  assert.equal(p.time, undefined);
});

let A, B;
test('a fresh computer that joins gets the main computer\'s own addresses, so the same calendars start shown', async () => {
  A = await computer('home', { userName: 'Alex', myEmails: ['me@example.com'], workHours: { start: '08:30', end: '17:00', days: [1, 2, 3, 4, 5] }, financeDir: join(base, 'fin-home'), time: { follow: 'zone', zone: 'America/New_York' } });
  await A.eng.start();
  await A.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Home laptop' });
  await settle(A);
  B = await computer('work');                               // a fresh install: every default
  assert.deepEqual(B.getConfig().myEmails, []);
  await B.eng.start();
  await B.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Work laptop' });
  await waitFor(async () => { await settle(A, B); return B.getConfig().myEmails.length > 0; }, 10000, "A's addresses on B");
  const a = A.getConfig(), b = B.getConfig();
  assert.deepEqual(b.myEmails, ['me@example.com']);
  assert.equal(b.userName, 'Alex');
  assert.deepEqual(b.workHours, a.workHours);
  assert.equal(b.financeDir, null, "A's folder path never comes over");
  assert.deepEqual(b.time, { follow: 'system' }, "A's shown zone (it is travelling) stays on A");
  assert.deepEqual(readJ(join(B.data, 'config.json')).myEmails, ['me@example.com'], "saved in B's own config.json");
  // the fresh computer's blank values never replaced A's
  await settle(A, B);
  assert.deepEqual(A.getConfig().myEmails, ['me@example.com']);
  assert.equal(A.getConfig().userName, 'Alex');
  // ...and so the same calendar defaults: someone else's calendar starts hidden on both
  const cals = [{ id: 'me@example.com', name: 'Me' }, { id: 'sam@example.com', name: 'Sam' }];
  for (const cfg of [a, b]) assert.deepEqual(cals.map(c => calendarDefaultOn(c, cfg.myEmails)), [true, false]);
  const googleDoc = { fetchedAt: '2026-10-23T09:00:00Z', calendars: cals, events: [] };
  const src = [{ id: 'calendar-google', capability: 'calendar', kind: 'mcp', preset: 'google-calendar', label: 'Google Calendar', enabled: true, accounts: [] }];
  const onA = mergeCalendarData({ googleDoc, sources: src, myEmails: a.myEmails }).calendars.map(c => [c.id, c.defaultOn]);
  const onB = mergeCalendarData({ googleDoc, sources: src, myEmails: b.myEmails }).calendars.map(c => [c.id, c.defaultOn]);
  assert.deepEqual(onB, onA);
  assert.deepEqual(onA, [['me@example.com', true], ['sam@example.com', false]]);
});

test('a change on either computer reaches the other; this computer\'s keys never travel', async () => {
  await B.setConfig({ myEmails: ['me@example.com', 'me@work.example'], notifications: { enabled: true } });
  await waitFor(async () => { await settle(A, B); return A.getConfig().myEmails.length === 2; }, 10000, "B's new address on A");
  assert.equal(A.getConfig().notifications.enabled, false, "B's browser notifications stay on B");
  await A.setConfig({ weekStart: 'Sun' });
  await waitFor(async () => { await settle(A, B); return B.getConfig().weekStart === 'Sun'; }, 10000, 'the week start on B');
  // nothing of this computer's in the synced file, nor anywhere in the sync folder
  const prof = readJ(join(A.data, 'profile.json'));
  for (const k of Object.keys(LOCAL_KEYS)) if (k !== 'version') assert.equal(prof[k], undefined, k);   // (profile.json has its own format version)
  const all = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else all.push(readFileSync(p, 'utf8')); } };
  walk(cloud);
  assert.ok(!all.join('\n').includes('fin-home'), 'the finance folder path is in no synced file');
  assert.ok(!all.join('\n').includes('America/New_York'), "A's shown zone is in no synced file");
});
