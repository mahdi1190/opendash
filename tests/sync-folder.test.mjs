// lib/sync/folder.mjs + lib/sync/engine.mjs on the sync folder itself: only
// protocol file names are read (temp files and cloud conflict copies are
// ignored), a log cut short is read up to its last complete line and resumed
// later, a corrupt line is retried and then skipped, logs roll over, and the
// cloud folders are found from the environment.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, appendFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  isSyncFileName, readLogFrom, createLogWriter, listDeviceFiles, listDevices, detectCloudFolders, syncRootFor, SYNC_DIR_NAME,
} from '../lib/sync/folder.mjs';
import { encodeHlc } from '../lib/sync/hlc.mjs';
import { tempDir, rm, stopAll, makeDevice, waitFor, sleep, keepAlive } from './sync.shared.mjs';

const base = tempDir('sync-folder-');
const release = keepAlive();
after(async () => { await stopAll(); release(); rm(base); });

const OTHER = 'feedfacecafebeef';
const line = (n, w, wall = Date.now()) => JSON.stringify({ v: 1, dev: OTHER, n, h: encodeHlc(wall + n, 0, OTHER), s: {}, w, x: [] }) + '\n';

test('only the protocol names are sync files', () => {
  for (const ok of ['device.json', 'snapshot.json', 'ops-20261023.jsonl', 'ops-20261023-01.jsonl']) assert.ok(isSyncFileName(ok), ok);
  for (const no of [
    '.ops-20261023.jsonl.tmp-123-ab12cd34',          // lib/fsutil.mjs atomicWrite temp file
    'ops-20261023.jsonl.tmp', 'snapshot.json.tmp',
    'ops-20261023 (1).jsonl', 'snapshot (1).json',      // Google Drive / Windows copies
    'ops-20261023-DESKTOP-AB12CD.jsonl', 'device-DESKTOP-AB12CD.json',   // OneDrive conflict copies
    "ops-20261023 (Sam's conflicted copy 2026-10-23).jsonl",              // Dropbox
    'ops-20261023-conflict-1.jsonl', 'snapshot-conflict.json',
    'desktop.ini', '.dropbox', 'Icon\r', 'ops-2026102.jsonl', 'notes.txt',
  ]) assert.ok(!isSyncFileName(no), no);
  assert.equal(syncRootFor('C:/x/OneDrive'), join('C:/x/OneDrive', SYNC_DIR_NAME));
  assert.equal(syncRootFor(join('C:/x/OneDrive', SYNC_DIR_NAME)), join('C:/x/OneDrive', SYNC_DIR_NAME));
});

test('a log cut short is read up to its last complete line, then resumed', async () => {
  const f = join(base, 'cut.jsonl');
  const l1 = line(1, [[['statuses', 'u-1'], 'doing']]), l2 = line(2, [[['statuses', 'u-2'], 'done']]);
  writeFileSync(f, l1 + l2.slice(0, 20));                 // the cloud client delivered half of line 2
  const r1 = await readLogFrom(f, 0);
  assert.equal(r1.lines.length, 1);
  assert.equal(r1.end, Buffer.byteLength(l1));
  assert.equal(r1.partial, 20);
  writeFileSync(f, l1 + l2);                               // the rest arrives
  const r2 = await readLogFrom(f, r1.end);
  assert.equal(r2.lines.length, 1);
  assert.equal(r2.lines[0].obj.n, 2);
  assert.equal(r2.partial, 0);
  // A file shorter than where we were (an older copy put back) says so.
  writeFileSync(f, l1);
  assert.equal((await readLogFrom(f, r2.end)).shrunk, true);
  // A line that is not JSON stops the read just before it.
  writeFileSync(f, l1 + 'garbage{{{\n' + l2);
  const r3 = await readLogFrom(f, 0);
  assert.equal(r3.lines.length, 1);
  assert.equal(r3.bad.at, Buffer.byteLength(l1));
});

test('the log writer only appends, closes a cut-short line, and rolls over to a new part', async () => {
  const root = join(base, 'w-root');
  const id = '0123456789abcdef';
  mkdirSync(join(root, 'devices', id), { recursive: true });
  const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  writeFileSync(join(root, 'devices', id, `ops-${day}.jsonl`), '{"v":1,"half');   // stopped mid-write earlier
  const w = createLogWriter({ root, deviceId: id, maxBytes: 300 });
  await w.append([{ a: 1 }]);
  const text = readFileSync(join(root, 'devices', id, `ops-${day}.jsonl`), 'utf8');
  assert.equal(text, '{"v":1,"half\n{"a":1}\n');
  for (let i = 0; i < 20; i++) await w.append([{ i, pad: 'x'.repeat(40) }]);
  const names = readdirSync(join(root, 'devices', id)).filter(isSyncFileName).sort();
  assert.ok(names.includes(`ops-${day}-01.jsonl`), names.join(','));
  assert.ok(!readdirSync(join(root, 'devices', id)).some(n => n.includes('.tmp')), 'no temp files left behind');
});

test('folder listing skips temp files, conflict copies and folders that are not device ids', async () => {
  const root = join(base, 'l-root');
  const d = join(root, 'devices', OTHER);
  mkdirSync(d, { recursive: true });
  mkdirSync(join(root, 'devices', 'not-a-device'), { recursive: true });
  mkdirSync(join(root, 'devices', `${OTHER} (1)`), { recursive: true });
  for (const n of ['ops-20261023.jsonl', 'ops-20261023 (1).jsonl', 'ops-20261023-DESKTOP-AB12CD.jsonl', '.ops-20261023.jsonl.tmp-1-ab', 'snapshot.json', 'snapshot (1).json', 'device.json']) writeFileSync(join(d, n), '{}\n');
  assert.deepEqual(await listDevices(root), [OTHER]);
  const files = await listDeviceFiles(root, OTHER);
  assert.deepEqual(files.logs.map(l => l.name), ['ops-20261023.jsonl']);
  assert.ok(files.snapshot && files.device);
});

test('the engine ignores junk and conflict copies, waits for a half-delivered line, and skips a line that stays corrupt', async () => {
  const cloud = join(base, 'cloud-e');
  mkdirSync(cloud);
  const me = makeDevice(base, 'e', { state: { custom: [{ id: 'u-1', title: 'one' }], statuses: {} }, pollMs: 100 });
  await me.eng.start();
  await me.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Me' });
  const dir = join(cloud, SYNC_DIR_NAME, 'devices', OTHER);
  mkdirSync(dir, { recursive: true });
  const wall = Date.now();
  // A container must exist before its entries count: the other device announces statuses.
  const l1 = line(1, [[['statuses', '@alive'], true], [['statuses', 'u-1'], 'doing']], wall);
  const evil = line(2, [[['statuses', 'u-1'], 'FROM A CONFLICT COPY']], wall + 50);
  const l3 = line(3, [[['statuses', 'u-2'], 'done']], wall);
  writeFileSync(join(dir, 'ops-20261023-DESKTOP-AB12CD.jsonl'), evil);
  writeFileSync(join(dir, 'ops-20261023 (1).jsonl'), evil);
  writeFileSync(join(dir, '.ops-20261023.jsonl.tmp-9-ab'), evil);
  writeFileSync(join(dir, 'ops-20261023.jsonl'), l1 + l3.slice(0, 25));
  await waitFor(async () => ((await me.store.readObject()).statuses || {})['u-1'] === 'doing', 5000, 'the first line');
  assert.equal((await me.store.readObject()).statuses['u-2'], undefined, 'the half line is not applied');
  assert.match(me.eng.status().message, /Waiting for the sync folder to finish downloading/);
  appendFileSync(join(dir, 'ops-20261023.jsonl'), l3.slice(25));
  await waitFor(async () => (await me.store.readObject()).statuses['u-2'] === 'done', 5000, 'the completed line');
  assert.equal((await me.store.readObject()).statuses['u-1'], 'doing', 'conflict copies and temp files were never read');
  // A corrupt line: retried a few passes, then skipped so the lines after it still arrive.
  appendFileSync(join(dir, 'ops-20261023.jsonl'), '{"v":1,"dev":"broken\n' + line(4, [[['statuses', 'u-3'], 'doing']], wall));
  await waitFor(async () => (await me.store.readObject()).statuses['u-3'] === 'doing', 8000, 'the line after the corrupt one');
  assert.ok(me.eng.status().state === 'ok');
  await me.eng.stop();
});

test('cloud folders are found from the environment and their usual places (looking only)', () => {
  const exists = (p) => [
    'C:\\Users\\sam\\OneDrive', 'C:\\Users\\sam\\OneDrive - Contoso', 'G:\\My Drive', 'D:\\Dropbox',
  ].includes(p);
  const read = (p) => { if (p === 'C:\\Users\\sam\\AppData\\Roaming\\Dropbox\\info.json') return JSON.stringify({ personal: { path: 'D:\\Dropbox' } }); throw new Error('ENOENT'); };
  const win = detectCloudFolders({
    platform: 'win32', home: 'C:\\Users\\sam', exists, read,
    env: { OneDrive: 'C:\\Users\\sam\\OneDrive', OneDriveConsumer: 'C:\\Users\\sam\\OneDrive', OneDriveCommercial: 'C:\\Users\\sam\\OneDrive - Contoso', APPDATA: 'C:\\Users\\sam\\AppData\\Roaming' },
  });
  // A work or school OneDrive is marked and listed last (never the default for personal data).
  assert.deepEqual(win.map(x => [x.kind, x.path, !!x.work]), [
    ['onedrive', 'C:\\Users\\sam\\OneDrive', false], ['dropbox', 'D:\\Dropbox', false], ['gdrive', 'G:\\My Drive', false], ['onedrive', 'C:\\Users\\sam\\OneDrive - Contoso', true],
  ]);
  assert.equal(win[3].label, 'OneDrive (work or school: Contoso)');
  // %OneDrive% names the account added last: here the work one; the personal one is %OneDriveConsumer%.
  const both = detectCloudFolders({ platform: 'win32', home: 'C:\\Users\\sam', exists, read: () => { throw new Error('no'); },
    env: { OneDrive: 'C:\\Users\\sam\\OneDrive - Contoso', OneDriveCommercial: 'C:\\Users\\sam\\OneDrive - Contoso', OneDriveConsumer: 'C:\\Users\\sam\\OneDrive' } });
  assert.deepEqual(both.filter(x => x.kind === 'onedrive').map(x => [x.path, !!x.work]), [['C:\\Users\\sam\\OneDrive', false], ['C:\\Users\\sam\\OneDrive - Contoso', true]]);
  const workOnly = detectCloudFolders({ platform: 'win32', home: 'C:\\Users\\nobody', exists, read: () => { throw new Error('no'); }, env: { OneDrive: 'C:\\Users\\sam\\OneDrive - Contoso' } });
  assert.deepEqual(workOnly.filter(x => x.kind === 'onedrive').map(x => [x.label, !!x.work]), [['OneDrive (work or school: Contoso)', true]], 'known from its folder name alone');
  const mac = detectCloudFolders({
    platform: 'darwin', home: '/Users/sam', env: {}, read: () => { throw new Error('no'); },
    exists: (p) => ['/Users/sam/Library/CloudStorage', '/Users/sam/Library/CloudStorage/OneDrive-Personal', '/Users/sam/Library/CloudStorage/GoogleDrive-sam@example.com/My Drive'].includes(p),
    list: () => ['OneDrive-Personal', 'GoogleDrive-sam@example.com'],
  });
  assert.deepEqual(mac.map(x => [x.kind, !!x.work]), [['onedrive', false], ['gdrive', false]], 'OneDrive-Personal is personal');
  assert.equal(detectCloudFolders({ platform: 'linux', home: '/home/x', env: {}, exists: () => false, read: () => { throw new Error('no'); } }).length, 0);
  assert.ok(!existsSync(join(base, 'OneDrive')), 'detection never creates anything');
});

test('a cloud folder that disappears (signed out, deleted) costs no CPU while sync waits for it', async () => {
  const cloud = join(base, 'cloud-gone');
  mkdirSync(cloud);
  const d = makeDevice(base, 'gone', { pollMs: 300 });
  await d.eng.start();
  await d.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Gone' });
  rm(cloud);   // Windows keeps firing watch events for a deleted folder: the watcher must stand down
  const c0 = process.cpuUsage();
  await sleep(2000);
  const c = process.cpuUsage(c0);
  const ms = Math.round((c.user + c.system) / 1000);
  assert.ok(ms < 400, `${ms} ms of CPU in 2 s`);
  assert.equal(d.eng.status().state, 'waiting');
  assert.match(d.eng.status().message, /is not there/);
  mkdirSync(cloud);   // it comes back: sync carries on by itself
  await waitFor(() => d.eng.status().state === 'ok', 3000, 'sync to resume');
  await d.eng.stop();
});

test('a line that is encrypted (reserved enc field) or in a newer format stops reading and is reported, never skipped', async () => {
  const cloud = join(base, 'cloud-enc');
  mkdirSync(cloud);
  const me = makeDevice(base, 'enc', { state: { custom: [], statuses: {} }, pollMs: 100 });
  await me.eng.start();
  await me.eng.configure({ enabled: true, apply: true, folder: cloud, deviceName: 'Me' });
  const dir = join(cloud, SYNC_DIR_NAME, 'devices', OTHER);
  mkdirSync(dir, { recursive: true });
  const wall = Date.now();
  const ok = line(1, [[['statuses', '@alive'], true], [['statuses', 'u-1'], 'doing']], wall);
  const enc = JSON.stringify({ v: 1, dev: OTHER, n: 2, h: encodeHlc(wall + 2, 0, OTHER), enc: { alg: 'A256GCM', iv: 'x', ct: 'y' } }) + '\n';
  const after = line(3, [[['statuses', 'u-2'], 'done']], wall);
  writeFileSync(join(dir, 'ops-20261023.jsonl'), ok + enc + after);
  await waitFor(async () => ((await me.store.readObject()).statuses || {})['u-1'] === 'doing', 5000, 'the plain line');
  await sleep(400);
  assert.equal((await me.store.readObject()).statuses['u-2'], undefined, 'nothing after the encrypted line is applied (order is kept)');
  assert.match(me.eng.status().message, /cannot read yet/);
  writeFileSync(join(dir, 'ops-20261024.jsonl'), JSON.stringify({ v: 2, dev: OTHER, n: 4, h: encodeHlc(wall + 4, 0, OTHER), w: [] }) + '\n');
  await sleep(300);
  assert.match(me.eng.status().message, /newer format/);
  await me.eng.stop();
});
