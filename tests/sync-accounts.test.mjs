// Accounts across devices: the account registry (<data>/accounts.json, the
// shape lib/accounts-file.mjs writes, no secrets) and each account's
// mail/calendar snapshot (named after the source id the record lists in
// `sources`) sync; only the account's FETCHER device (the record's `fetcher`,
// a lib/devicedir.mjs host id) publishes its snapshot; another device can take
// over only with its own sign-in; jobs that are not accounts ('bank',
// 'ai-brief') get a fetcher too; a device that only fetches while open (a
// phone) does not grab unassigned work. The last tests run the real accounts
// service (lib/accounts.mjs) on two computers with sync as its fetcher policy.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tempDir, rm, stopAll, makeDevice, sleep, keepAlive } from './sync.shared.mjs';
import { fileRegistry } from '../lib/accounts-file.mjs';
import { secretStore } from '../lib/secret-store.mjs';
import { secretsDir, readHostId } from '../lib/devicedir.mjs';
import { createAccountsService, resetAccountsServices } from '../lib/accounts.mjs';
import { readSourcesFile } from '../lib/sources.mjs';
import { createMainComputer } from '../lib/main-computer.mjs';

const base = tempDir('sync-acc-');
const release = keepAlive();
after(async () => { await stopAll(); resetAccountsServices(); release(); rm(base); });

const cloud = join(base, 'cloud');
mkdirSync(cloud);
const TOKEN = 'refresh-token-marker-6c1f02';
const ACC = 'acc_00000000000000a1', SRC = 'email-outlook-a1b2';
const readJ = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
const writeJ = (p, v) => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(v, null, 1)); };
const settle = async (...ds) => { for (let i = 0; i < 3; i++) { for (const d of ds) await d.eng.syncNow(); await sleep(40); } };
const msg = (id, subject) => ({ id, subject, from: { name: 'Sam', email: 'sam@example.com' }, date: '2026-10-23T09:00:00Z', snippet: 'Hello', unread: true });
const record = (extra = {}) => ({ id: ACC, provider: 'microsoft', email: 'alex@example.com', displayName: 'Alex', kind: 'personal', scopes: ['User.Read', 'Mail.Read'],
  features: { mail: true, calendar: true }, status: 'connected', lastSync: null, error: null, fetcher: null, sources: { mail: SRC }, createdAt: '2026-10-23T08:00:00.000Z', updatedAt: '2026-10-23T08:00:00.000Z', ...extra });

const A = makeDevice(base, 'a');
const B = makeDevice(base, 'b');
const inboxA = join(A.data, 'inbox', 'sources', SRC + '.json'), inboxB = join(B.data, 'inbox', 'sources', SRC + '.json');

test('the registry and the snapshot of an account reach the other device; its token never does', async () => {
  // A connected the account: the registry entry (an unwanted token field in the file too) and the token in A's own secret store.
  await fileRegistry(A.data).mutate((list) => { list.push({ ...record(), refreshToken: TOKEN }); });
  await secretStore(A.data).set('accounts/' + ACC, { refresh_token: TOKEN });
  assert.ok(!secretsDir(A.data).startsWith(A.data), 'the token is outside the data folder');
  await A.eng.start();
  await A.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Home PC' });
  assert.equal(A.eng.fetcherId, readHostId(A.data), "the fetcher id is the device folder's host id (the accounts code uses the same)");
  await A.eng.setFetcher(ACC);                     // where it was connected
  assert.equal(readJ(join(A.data, 'accounts.json')).accounts[0].fetcher, A.eng.fetcherId);
  assert.equal(readJ(join(A.data, 'accounts.json')).version, 1, 'the file keeps the registry shape');
  assert.equal(await A.eng.isFetcher(ACC), true);
  writeJ(inboxA, { version: 1, sourceId: SRC, fetchedAt: '2026-10-23T09:05:00Z', messages: [msg('m1', 'Lunch?'), msg('m2', 'Invoice')] });
  await A.eng.syncNow();
  await B.eng.start();
  await B.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Work laptop' });
  await settle(A, B);
  const reg = readJ(join(B.data, 'accounts.json'));
  assert.equal(reg.version, 1);
  assert.equal(reg.accounts[0].email, 'alex@example.com');
  assert.equal(reg.accounts[0].fetcher, A.eng.fetcherId);
  assert.deepEqual(reg.accounts[0].sources, { mail: SRC });
  assert.equal(reg.accounts[0].refreshToken, undefined, 'a token in the registry is dropped');
  assert.deepEqual(readJ(inboxB).messages.map(m => m.id), ['m1', 'm2']);
  assert.ok(!existsSync(join(B.data, 'secrets')), 'no secrets folder appears in the data folder');
  assert.equal(await secretStore(B.data).get('accounts/' + ACC), null, 'and B holds no sign-in for it');
  const everything = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else everything.push(readFileSync(p, 'utf8')); } };
  walk(cloud);
  assert.ok(!everything.join('\n').includes(TOKEN), 'the token is in no synced file');
  assert.equal(await B.eng.isFetcher(ACC), false, 'B gets the mail through sync, without signing in');
  const f = B.eng.fetcher(ACC);
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

test('a snapshot no account owns (a source set up on one computer) is never sent', async () => {
  writeJ(join(A.data, 'inbox', 'sources', 'email-mymcp-0001.json'), { version: 1, sourceId: 'email-mymcp-0001', messages: [msg('x1', 'Only on A')] });
  await settle(A, B);
  assert.ok(!existsSync(join(B.data, 'inbox', 'sources', 'email-mymcp-0001.json')));
});

test('"Fetch on this computer instead": refused without a sign-in here, then moves the job', async () => {
  const no = await B.eng.takeOver(ACC, { hasToken: false });
  assert.equal(no.ok, false);
  assert.equal(no.code, 'SIGN_IN_FIRST');
  assert.match(no.message, /Sign in on this computer to take over/);
  const yes = await B.eng.takeOver(ACC, { hasToken: true });
  assert.equal(yes.ok, true);
  assert.equal(yes.me, true);
  await settle(B, A);
  assert.equal(readJ(join(A.data, 'accounts.json')).accounts[0].fetcher, B.eng.fetcherId);
  assert.equal(await A.eng.isFetcher(ACC), false, 'the old fetcher stops');
  assert.equal(await B.eng.isFetcher(ACC), true);
  assert.equal(A.eng.fetcher(ACC).name, 'Work laptop');
  // Now B publishes and A receives.
  const pub = readJ(inboxB); pub.messages.unshift(msg('m4', 'Fetched at work')); writeJ(inboxB, pub);
  await settle(B, A);
  assert.equal(readJ(inboxA).messages[0].id, 'm4');
});

test('both devices take over at the same moment: they still agree on one fetcher', async () => {
  await Promise.all([A.eng.takeOver(ACC, { hasToken: true }), B.eng.takeOver(ACC, { hasToken: true })]);
  await settle(A, B);
  const fa = readJ(join(A.data, 'accounts.json')).accounts[0].fetcher, fb = readJ(join(B.data, 'accounts.json')).accounts[0].fetcher;
  assert.equal(fa, fb);
  assert.equal([await A.eng.isFetcher(ACC), await B.eng.isFetcher(ACC)].filter(Boolean).length, 1, 'exactly one fetches');
});

test("'main computer' jobs: the first device to ask takes an unassigned job, the other leaves it", async () => {
  assert.equal(await A.eng.isFetcher('bank'), true);
  await settle(A, B);
  assert.equal(await B.eng.isFetcher('bank'), false);
  assert.equal(B.eng.fetcher('bank').name, 'Home PC');
  assert.equal(readJ(join(B.data, 'roles.json')).roles.bank.fetcher, A.eng.fetcherId);
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

test("with sync off every job runs here, as before sync existed; an account's recorded fetcher still holds", async () => {
  const S = makeDevice(base, 'solo');
  await fileRegistry(S.data).mutate((list) => { list.push(record({ fetcher: 'otherhost0001' })); });
  await S.eng.start();
  assert.equal(S.eng.enabled, false);
  assert.equal(await S.eng.isFetcher('acc-anything'), true);
  assert.equal(await S.eng.isFetcher('bank'), true);
  assert.equal(await S.eng.isFetcher(ACC), false, 'the record names another computer (a shared data folder)');
  assert.deepEqual(await S.eng.devices(), []);
});

// ─── The real accounts service on two computers ─────────────────────────
test('two computers through the accounts service: sources made with the same ids, only the fetcher reads, take-over needs a sign-in', async () => {
  const C = makeDevice(base, 'c'), D = makeDevice(base, 'd');
  const svcC = createAccountsService({ dataDir: C.data, sync: C.eng }), svcD = createAccountsService({ dataDir: D.data, sync: D.eng });
  assert.equal(svcC.deviceId, C.eng.fetcherId, 'accounts and sync use one id for this computer');
  // C connected an account (as a sign-in would: the record, then its sources through the hook path).
  const ID = 'acc_00000000000000c1';
  await fileRegistry(C.data).mutate((list) => { list.push(record({ id: ID, email: 'casey@example.org', sources: undefined, fetcher: svcC.deviceId })); });
  await secretStore(C.data).set('accounts/' + ID, { refresh_token: 'r-c' });
  await svcC.ready();                                     // brings the sources in line: made, ids recorded on the account
  const srcC = (await readSourcesFile(C.data)).sources.filter(s => s.account === ID);
  assert.deepEqual(srcC.map(s => s.capability).sort(), ['calendar', 'email']);
  const recorded = (await svcC.get(ID)).sources;
  assert.deepEqual(recorded, { mail: srcC.find(s => s.capability === 'email').id, calendar: srcC.find(s => s.capability === 'calendar').id });
  const cloud2 = join(base, 'cloud2'); mkdirSync(cloud2);
  await C.eng.start(); await C.eng.configure({ enabled: true, apply: true, folder: cloud2, deviceName: 'Desk' });
  await D.eng.start(); await D.eng.configure({ enabled: true, apply: true, folder: cloud2, deviceName: 'Laptop' });
  writeJ(join(C.data, 'inbox', 'sources', recorded.mail + '.json'), { version: 1, sourceId: recorded.mail, fetchedAt: '2026-10-23T09:05:00Z', messages: [msg('c1', 'From the desk')] });
  await settle(C, D);
  await svcD.reconcileSources();                          // the server does this when sync applies a new accounts.json
  const srcD = (await readSourcesFile(D.data)).sources.filter(s => s.account === ID);
  assert.deepEqual(srcD.map(s => s.id).sort(), [recorded.calendar, recorded.mail].sort(), 'the other computer names the sources (and so the snapshots) the same');
  assert.deepEqual(readJ(join(D.data, 'inbox', 'sources', recorded.mail + '.json')).messages.map(m => m.id), ['c1']);
  // Only the fetcher reads.
  assert.equal((await svcC.readsHere(srcC)).length, 2);
  assert.equal((await svcD.readsHere(srcD)).length, 0);
  await assert.rejects(svcD.fetchMail(ID), { code: 'NOT_FETCHER' });
  const seen = (await svcD.list()).find(a => a.id === ID);
  assert.equal(seen.here.fetcher, false); assert.equal(seen.here.signedIn, false); assert.equal(seen.here.fetcherName, 'Desk');
  // "Fetch on this computer instead" without a sign-in here: refused, nothing moves.
  assert.deepEqual(await svcD.fetchHere(ID), { ok: false, code: 'SIGN_IN_FIRST', message: 'Sign in on this computer to take over.' });
  // After signing in on D: D reads it, C stops.
  await secretStore(D.data).set('accounts/' + ID, { refresh_token: 'r-d' });
  const moved = await svcD.fetchHere(ID);
  assert.equal(moved.ok, true); assert.equal(moved.account.here.fetcher, true);
  await settle(D, C);
  assert.equal((await svcC.get(ID)).fetcher, svcD.deviceId);
  assert.equal((await svcC.readsHere(srcC)).length, 0, 'the old fetcher stops reading');
  assert.equal((await svcD.readsHere(srcD)).length, 2);
  // Removed on D: C's sources and snapshots go when the registry arrives.
  await fileRegistry(D.data).mutate((list) => { list.splice(list.findIndex(a => a.id === ID), 1); });
  await settle(D, C);
  await svcC.reconcileSources();
  assert.equal((await readSourcesFile(C.data)).sources.filter(s => s.account === ID).length, 0);
  assert.ok(!existsSync(join(C.data, 'inbox', 'sources', recorded.mail + '.json')));
  // Sync switched off: the accounts code is back to the record alone.
  await C.eng.configure({ enabled: false });
  assert.equal(C.eng.enabled, false);
});

test('one rule for who runs what: jobs follow the main computer; an account follows its own fetcher; no sign-in here, never taken', async () => {
  const E = makeDevice(base, 'e'), F = makeDevice(base, 'f');
  const svcE = createAccountsService({ dataDir: E.data, sync: E.eng }), svcF = createAccountsService({ dataDir: F.data, sync: F.eng });
  const cloud3 = join(base, 'cloud3'); mkdirSync(cloud3);
  await E.eng.start(); await E.eng.configure({ enabled: true, apply: true, folder: cloud3, deviceName: 'Desk' });
  await F.eng.start(); await F.eng.configure({ enabled: true, apply: true, folder: cloud3, deviceName: 'Laptop' });
  await settle(E, F);
  const mcE = createMainComputer({ dataDir: E.data, sync: E.eng, me: () => ({ id: E.eng.fetcherId, name: 'Desk' }) });
  const mcF = createMainComputer({ dataDir: F.data, sync: F.eng, me: () => ({ id: F.eng.fetcherId, name: 'Laptop' }) });
  // Desk is the main computer; an account was connected on the laptop (its sign-in is there).
  assert.equal((await mcE.set('this')).isMain, true);
  const ID = 'acc_00000000000000f1';
  await fileRegistry(F.data).mutate((list) => { list.push(record({ id: ID, email: 'sam@example.org', sources: undefined, fetcher: svcF.deviceId })); });
  await secretStore(F.data).set('accounts/' + ID, { refresh_token: 'r-f' });
  await settle(F, E);
  assert.deepEqual(await mcF.gate('connectors'), { run: false, reason: 'not-main', runsOn: 'Desk' });
  assert.deepEqual(await mcE.gate('connectors'), { run: true });
  assert.equal(await svcF.isFetcher(ID), true, 'the account is read where its sign-in is, not on the main computer');
  assert.equal(await svcE.isFetcher(ID), false);
  const stF = await mcF.status();
  assert.equal(stF.main.name, 'Desk'); assert.equal(stF.isMain, false); assert.ok(stF.jobs.every(j => j.runsOn === 'Desk' && !j.here));
  // An account nobody reads yet: a computer without its sign-in never takes it, not even the main computer.
  const ID2 = 'acc_00000000000000f2';
  await fileRegistry(F.data).mutate((list) => { list.push(record({ id: ID2, email: 'jo@example.org', sources: undefined, fetcher: null })); });
  await settle(F, E);
  assert.equal(await svcE.isFetcher(ID2), false, 'no sign-in on Desk');
  assert.equal((await svcE.get(ID2)).fetcher, null, 'and nothing was claimed');
  await secretStore(F.data).set('accounts/' + ID2, { refresh_token: 'r-f2' });
  assert.equal(await svcF.isFetcher(ID2), true, 'the laptop holds the sign-in and takes it');
  await settle(F, E);
  assert.equal((await svcE.get(ID2)).fetcher, svcF.deviceId);
  // The laptop becomes the main computer: the jobs move, the accounts stay where their sign-ins are.
  await mcF.set('this');
  await settle(F, E);
  assert.deepEqual(await mcE.gate('bank'), { run: false, reason: 'not-main', runsOn: 'Laptop' });
  assert.equal(await svcF.isFetcher(ID), true);
  await E.eng.stop(); await F.eng.stop();
});

test("live sync's lease answers first: every account fetch (the guarded read and the scheduled jobs' filter) follows it; no answer, the record decides", async () => {
  const G = makeDevice(base, 'g'), H = makeDevice(base, 'h');
  const svcG = createAccountsService({ dataDir: G.data, sync: G.eng });
  const cloud4 = join(base, 'cloud4'); mkdirSync(cloud4);
  await G.eng.start(); await G.eng.configure({ enabled: true, apply: true, folder: cloud4, deviceName: 'Desk' });
  await H.eng.start(); await H.eng.configure({ enabled: true, apply: true, folder: cloud4, deviceName: 'Laptop' });
  await settle(G, H);
  const MINE = 'acc_00000000000000a7', THEIRS = 'acc_00000000000000a8';
  await fileRegistry(G.data).mutate((list) => {
    list.push(record({ id: MINE, email: 'mine@example.org', sources: undefined, fetcher: G.eng.fetcherId }));
    list.push(record({ id: THEIRS, email: 'theirs@example.org', sources: undefined, fetcher: H.eng.fetcherId }));
  });
  await secretStore(G.data).set('accounts/' + MINE, { refresh_token: 'r-1' });
  await secretStore(G.data).set('accounts/' + THEIRS, { refresh_token: 'r-2' });
  await settle(G, H);
  await svcG.reconcileSources();
  const srcs = (await readSourcesFile(G.data)).sources.filter(s => s.account === MINE || s.account === THEIRS);
  const reads = async () => (await svcG.readsHere(srcs)).map(s => s.account).filter((v, i, a) => a.indexOf(v) === i).sort();
  // No answer from the lease: the record decides.
  assert.deepEqual(await reads(), [MINE]);
  // The lease: Desk is asleep for MINE (another computer took it), and holds THEIRS while the laptop sleeps.
  const lease = { [MINE]: false, [THEIRS]: true };
  G.eng.setLeaseOracle((id) => (id in lease ? lease[id] : null));
  assert.deepEqual(await reads(), [THEIRS], 'the scheduled inbox and calendar jobs follow the lease');
  await assert.rejects(svcG.fetchMail(MINE, {}), { code: 'NOT_FETCHER' });
  assert.equal(await svcG.isFetcher(THEIRS), true);
  assert.equal((await svcG.get(THEIRS)).fetcher, H.eng.fetcherId, 'a lease moves the job, never the recorded choice');
  // The lease pins the recorded computer: jobs() names it by its sync device id.
  const pins = Object.fromEntries(G.eng.jobs().accounts.map(a => [a.id, a.fetcherDeviceId]));
  assert.deepEqual([pins[MINE], pins[THEIRS]], [G.eng.deviceId, H.eng.deviceId]);
  G.eng.setLeaseOracle(null);
  assert.deepEqual(await reads(), [MINE]);
  await G.eng.stop(); await H.eng.stop();
});
