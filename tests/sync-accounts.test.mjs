// Accounts across devices: the account registry (no secrets) and each
// account's mail/calendar snapshot sync; only the account's FETCHER device
// publishes its snapshot; another device can take over only with its own
// sign-in; jobs that are not accounts ('bank', 'ai-brief') get a fetcher too;
// a device that only fetches while open (a phone) does not grab unassigned work.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir, rm, stopAll, makeDevice, waitFor, sleep, keepAlive } from './sync.shared.mjs';

const base = tempDir('sync-acc-');
const release = keepAlive();
after(async () => { await stopAll(); release(); rm(base); });

const cloud = join(base, 'cloud');
mkdirSync(cloud);
const TOKEN = 'refresh-token-marker-6c1f02';
const readJ = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const writeJ = (p, v) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 1)); };
const settle = async (...ds) => { for (let i = 0; i < 3; i++) { for (const d of ds) await d.eng.syncNow(); await sleep(40); } };
const msg = (id, subject) => ({ id, subject, from: { name: 'Sam', email: 'sam@example.com' }, date: '2026-10-23T09:00:00Z', snippet: 'Hello', unread: true });

const A = makeDevice(base, 'a');
const B = makeDevice(base, 'b');
const inboxA = join(A.data, 'inbox', 'sources', 'acc-home.json'), inboxB = join(B.data, 'inbox', 'sources', 'acc-home.json');

test('the registry and the snapshot of an account reach the other device; its token never does', async () => {
  // A connected the account: a registry entry (an unwanted token field in it too) and the token file.
  writeJ(join(A.data, 'accounts.json'), { v: 1, accounts: [{ id: 'acc-home', provider: 'outlook', email: 'alex@example.com', label: 'Home mail', refreshToken: TOKEN }] });
  writeJ(join(A.data, 'secrets', 'accounts', 'acc-home.json'), { refresh_token: TOKEN });
  await A.eng.start();
  await A.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Home PC' });
  await A.eng.setFetcher('acc-home');                     // where it was connected
  assert.equal(await A.eng.isFetcher('acc-home'), true);
  writeJ(inboxA, { fetchedAt: '2026-10-23T09:05:00Z', messages: [msg('m1', 'Lunch?'), msg('m2', 'Invoice')] });
  await A.eng.syncNow();
  await B.eng.start();
  await B.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Work laptop' });
  await settle(A, B);
  const reg = readJ(join(B.data, 'accounts.json'));
  assert.equal(reg.accounts[0].email, 'alex@example.com');
  assert.equal(reg.accounts[0].fetcherDeviceId, A.eng.deviceId);
  assert.equal(reg.accounts[0].refreshToken, undefined, 'a token in the registry is dropped');
  assert.deepEqual(readJ(inboxB).messages.map(m => m.id), ['m1', 'm2']);
  assert.ok(!existsSync(join(B.data, 'secrets')), 'no secrets folder appears on the other device');
  const everything = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else everything.push(readFileSync(p, 'utf8')); } };
  walk(cloud);
  assert.ok(!everything.join('\n').includes(TOKEN), 'the token is in no synced file');
  assert.equal(await B.eng.isFetcher('acc-home'), false, 'B gets the mail through sync, without signing in');
  const f = B.eng.fetcher('acc-home');
  assert.equal(f.name, 'Home PC');
  assert.equal(f.me, false);
});

test('only the fetcher publishes: a stray local change on another device is not sent', async () => {
  const stray = readJ(inboxB); stray.messages.push(msg('m-stray', 'fetched by mistake on B')); writeJ(inboxB, stray);
  const pub = readJ(inboxA); pub.messages.unshift(msg('m3', 'New from home')); writeJ(inboxA, pub);
  await settle(A, B);
  assert.ok(!readJ(inboxA).messages.some(m => m.id === 'm-stray'), "B's copy is not published");
  assert.equal(readJ(inboxB).messages[0].id, 'm3', "A's new message reached B");
  assert.ok(!readJ(inboxB).messages.some(m => m.id === 'm-stray'), "B's copy follows the fetcher's");
});

test('"Fetch on this computer instead": refused without a sign-in here, then moves the job', async () => {
  const no = await B.eng.takeOver('acc-home', { hasToken: false });
  assert.equal(no.ok, false);
  assert.equal(no.code, 'SIGN_IN_FIRST');
  assert.match(no.message, /Sign in on this computer to take over/);
  const yes = await B.eng.takeOver('acc-home', { hasToken: true });
  assert.equal(yes.ok, true);
  assert.equal(yes.me, true);
  await settle(B, A);
  assert.equal(await A.eng.isFetcher('acc-home'), false, 'the old fetcher stops');
  assert.equal(await B.eng.isFetcher('acc-home'), true);
  assert.equal(A.eng.fetcher('acc-home').name, 'Work laptop');
  // Now B publishes and A receives.
  const pub = readJ(inboxB); pub.messages.unshift(msg('m4', 'Fetched at work')); writeJ(inboxB, pub);
  await settle(B, A);
  assert.equal(readJ(inboxA).messages[0].id, 'm4');
});

test('both devices take over at the same moment: they still agree on one fetcher', async () => {
  await Promise.all([A.eng.takeOver('acc-home', { hasToken: true }), B.eng.takeOver('acc-home', { hasToken: true })]);
  await settle(A, B);
  const fa = readJ(join(A.data, 'accounts.json')).accounts[0].fetcherDeviceId, fb = readJ(join(B.data, 'accounts.json')).accounts[0].fetcherDeviceId;
  assert.equal(fa, fb);
  assert.equal([await A.eng.isFetcher('acc-home'), await B.eng.isFetcher('acc-home')].filter(Boolean).length, 1, 'exactly one fetches');
});

test("'main computer' jobs: the first device to ask takes an unassigned job, the other leaves it", async () => {
  assert.equal(await A.eng.isFetcher('bank'), true);
  await settle(A, B);
  assert.equal(await B.eng.isFetcher('bank'), false);
  assert.equal(B.eng.fetcher('bank').name, 'Home PC');
  assert.ok(readJ(join(B.data, 'roles.json')).roles.bank.deviceId === A.eng.deviceId);
});

test('a phone (fetches only while open) leaves unassigned jobs to a computer, and is marked when it is the fetcher', async () => {
  const P = makeDevice(base, 'phone', { background: false });
  await P.eng.start();
  await P.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Phone' });
  await settle(P, A, B);
  assert.equal(await P.eng.isFetcher('ai-brief'), false, 'a background-capable device exists, so the phone does not take it');
  assert.ok((await P.eng.devices()).some(d => d.name === 'Home PC' && d.background));
  await P.eng.setFetcher('weather', P.eng.deviceId);
  await settle(P, A);
  const f = A.eng.fetcher('weather');
  assert.equal(f.name, 'Phone');
  assert.equal(f.background, false);
  assert.match(f.note, /only while OpenDash is open/);
  await P.eng.stop();
});

test('with sync off every job runs here, as before sync existed', async () => {
  const S = makeDevice(base, 'solo');
  await S.eng.start();
  assert.equal(await S.eng.isFetcher('acc-anything'), true);
  assert.deepEqual(await S.eng.devices(), []);
});
