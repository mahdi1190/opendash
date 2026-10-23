// lib/offsite-backup.mjs + server/routes/offsite-backup.mjs: the daily
// encrypted copy. AES-256-GCM round trip (passphrase and recovery key), wrong
// passphrase and tampering refused, the cloud folder never sees plain text,
// 14 dailies kept per computer (others' files and stray files untouched),
// restoring on this computer and on another one, and restore through the
// server (the current data is backed up first). Temp folders only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { request, createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { encryptBackup, decryptBackup, deriveKey, parseBackup, createOffsiteBackup, backupName, KEEP, MAGIC } from '../lib/offsite-backup.mjs';
import { secretStore } from '../lib/secret-store.mjs';
import { createZip, readZip } from '../lib/zip.mjs';

const ROOT = process.platform === 'win32' && existsSync('C:/tmp') ? 'C:/tmp/relocate-test' : join(tmpdir(), 'relocate-test');
mkdirSync(ROOT, { recursive: true });
if (!process.env.DASHBOARD_DEVICE_DIR) process.env.DASHBOARD_DEVICE_DIR = mkdtempSync(join(ROOT, 'device-'));
process.env.DASHBOARD_SYNC_LOCAL_DIR = process.env.DASHBOARD_SYNC_LOCAL_DIR || mkdtempSync(join(ROOT, 'sync-'));

/** An in-memory secret store (another computer = another store). */
function memSecrets() {
  const m = new Map();
  return secretStore(null, { backend: { kind: 'memory', read: async (k) => (m.has(k) ? JSON.parse(m.get(k)) : null), write: async (k, v) => { m.set(k, JSON.stringify(v)); }, remove: async (k) => { m.delete(k); }, keys: async (p) => [...m.keys()].filter(k => k.startsWith(p)), lock: async (k, fn) => fn() } });
}
const ZIP = createZip([{ name: 'opendash-data-x/state/dashboard-state.json', data: JSON.stringify({ custom: [{ id: 'u-1', title: 'SECRET-TASK-TITLE' }], _lastSave: 5 }) }, { name: 'opendash-data-x/config.json', data: '{"version":1,"userName":"Ann"}' }]);

test('round trip with a passphrase; a wrong one, a changed header or body, or another file are refused', async () => {
  const { key, kdf } = await deriveKey({ passphrase: 'correct horse battery' });
  assert.equal(kdf.name, 'scrypt'); assert.equal(kdf.N, 32768);
  const file = encryptBackup(ZIP, { key, kdf, host: 'HOME-PC', appVersion: '9.9.9', now: Date.parse('2026-10-23T08:00:00Z') });
  assert.ok(file.subarray(0, MAGIC.length).toString() === MAGIC);
  assert.ok(!file.includes(Buffer.from('SECRET-TASK-TITLE')) && !file.includes(Buffer.from('Ann')), 'no plain text in the file');
  assert.equal(parseBackup(file).header.host, 'HOME-PC');
  assert.deepEqual(await decryptBackup(file, { passphrase: 'correct horse battery' }), ZIP);
  await assert.rejects(decryptBackup(file, { passphrase: 'wrong horse battery' }), (e) => e.code === 'WRONG_KEY');
  const h = Buffer.from(file); const i = h.indexOf(Buffer.from('HOME-PC')); h[i] = 'X'.charCodeAt(0);
  await assert.rejects(decryptBackup(h, { passphrase: 'correct horse battery' }), (e) => e.code === 'WRONG_KEY', 'the header is authenticated');
  const b = Buffer.from(file); b[b.length - 40] ^= 1;
  await assert.rejects(decryptBackup(b, { passphrase: 'correct horse battery' }), (e) => e.code === 'WRONG_KEY');
  await assert.rejects(decryptBackup(Buffer.from('hello'), { passphrase: 'x' }), (e) => e.code === 'NOT_A_BACKUP');
});

test('round trip with the sync recovery key', async () => {
  const rk = Buffer.alloc(32, 7);
  const { key, kdf } = await deriveKey({ recoveryKey: rk });
  const file = encryptBackup(ZIP, { key, kdf, host: 'HOME-PC' });
  assert.deepEqual(await decryptBackup(file, { recoveryKey: rk }), ZIP);
  await assert.rejects(decryptBackup(file, { passphrase: 'anything at all' }), (e) => e.code === 'NEEDS_RECOVERY_KEY');
  await assert.rejects(decryptBackup(file, { recoveryKey: Buffer.alloc(32, 8) }), (e) => e.code === 'WRONG_KEY');
});

test('the daily copy: set up, run, not again the same day, 14 kept per computer, opened here and elsewhere', async () => {
  const t = mkdtempSync(join(ROOT, 'offsite-'));
  try {
    const folder = join(t, 'OneDrive', 'OpenDash Backups');
    let clock = Date.parse('2026-10-01T09:00:00');
    const secrets = memSecrets();
    const svc = createOffsiteBackup({ secrets, exportZip: () => ZIP, host: 'HOME-PC', appVersion: '9.9.9', env: { OneDrive: join(t, 'OneDrive') }, now: () => clock });
    let st = await svc.status();
    assert.equal(st.suggestedFolder, folder);
    assert.equal(st.enabled, false);
    await assert.rejects(svc.configure({ enabled: true }), (e) => e.code === 'NO_PASSPHRASE');
    await assert.rejects(svc.configure({ passphrase: 'short' }), (e) => e.code === 'WEAK_PASSPHRASE');
    st = await svc.configure({ passphrase: 'four random words here', enabled: true });
    assert.equal(st.enabled, true); assert.equal(st.folder, folder); assert.equal(st.lock, 'passphrase'); assert.equal(st.due, true);
    const saved = JSON.stringify(await secrets.get('offsite-backup'));
    assert.ok(!saved.includes('four random words'), 'the passphrase itself is never stored');
    // someone else's copies and a stray file in the same folder
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, backupName('2026-01-01', 'WORK-LAPTOP')), 'theirs');
    writeFileSync(join(folder, 'notes.txt'), 'mine, not a backup');
    for (let d = 0; d < 20; d++) {
      const r = await svc.runNow();
      assert.equal(r.name, backupName(new Date(clock).toISOString().slice(0, 10), 'HOME-PC'));
      assert.equal(await svc.isDue(), false, 'not again the same day');
      clock += 24 * 3600 * 1000;
      assert.equal(await svc.isDue(), true, 'due the next day');
    }
    const names = readdirSync(folder).sort();
    const mine = names.filter(n => n.includes('HOME-PC'));
    assert.equal(mine.length, KEEP);
    assert.equal(mine[0], backupName('2026-10-07', 'HOME-PC'), 'the oldest ones went');
    assert.ok(names.includes(backupName('2026-01-01', 'WORK-LAPTOP')) && names.includes('notes.txt'), 'nothing else is removed');
    assert.ok(!names.some(n => n.includes('.tmp-')));
    const list = await svc.list();
    assert.equal(list[0].name, mine[mine.length - 1]);
    assert.equal(list.find(b => b.host === 'HOME-PC').lock, 'passphrase');
    // this computer opens it without typing; another computer needs the passphrase
    assert.deepEqual(await svc.open(mine[0]), ZIP);
    const other = createOffsiteBackup({ secrets: memSecrets(), exportZip: () => ZIP, host: 'NEW-PC', env: {} });
    await assert.rejects(other.open(mine[0], { folder }), (e) => e.code === 'NO_PASSPHRASE' || e.code === 'WRONG_KEY');
    await assert.rejects(other.open(mine[0], { folder, passphrase: 'not the right one' }), (e) => e.code === 'WRONG_KEY');
    assert.deepEqual(await other.open(mine[0], { folder, passphrase: 'four random words here' }), ZIP);
    // a failure is recorded and tried again
    const bad = createOffsiteBackup({ secrets, exportZip: () => { throw new Error('disk gone'); }, host: 'HOME-PC', now: () => clock });
    await assert.rejects(bad.runNow(), /disk gone/);
    assert.equal((await bad.status()).lastResult, 'error');
    assert.equal(await bad.isDue(), true);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

function freePort() { return new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); }); }

test('server: set up, copy now, inspect and restore (the current data is backed up first)', async () => {
  const t = mkdtempSync(join(ROOT, 'offsite-srv-'));
  const data = join(t, 'data');
  const port = await freePort();
  const call = (method, path, body) => new Promise((res, rej) => {
    const req = request({ host: '127.0.0.1', port, method, path, headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json', Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' } }, (r) => {
      let s = ''; r.setEncoding('utf8'); r.on('data', d => { s += d; }); r.on('end', () => { let j = null; try { j = JSON.parse(s); } catch {} res({ status: r.statusCode, json: j }); });
    });
    req.on('error', rej); if (body !== undefined) req.write(JSON.stringify(body)); req.end();
  });
  const { main } = await import('../server/index.mjs');
  const srv = await main(['--port', String(port), '--no-open', '--data-dir', data, '--fresh']);
  try {
    const folder = join(t, 'cloud', 'OpenDash Backups');
    // a task to protect
    const st0 = { custom: [], _lastSave: 0 };
    const put = (s) => new Promise((res) => { const req = request({ host: '127.0.0.1', port, method: 'PUT', path: '/api/state', headers: { Host: `localhost:${port}`, 'Content-Type': 'application/json', Origin: `http://localhost:${port}`, 'Sec-Fetch-Site': 'same-origin' } }, (r) => { r.resume(); r.on('end', () => res(r.statusCode)); }); req.end(JSON.stringify(s)); });
    assert.equal(await put({ ...st0, custom: [{ id: 'u-1', title: 'keep me' }] }), 200);
    let r = await call('POST', '/api/backup/offsite/settings', { folder, passphrase: 'a long enough phrase', enabled: true });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.folder, folder);
    r = await call('POST', '/api/backup/offsite/now', {});
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const name = r.json.name;
    assert.ok(existsSync(join(folder, name)));
    // the data changes; then restore the copy
    const st1 = JSON.parse(readFileSync(join(data, 'state', 'dashboard-state.json'), 'utf8'));
    assert.equal(await put({ ...st1, custom: [] }), 200);
    r = await call('POST', '/api/backup/offsite/inspect', { name, passphrase: 'wrong wrong wrong' });
    assert.equal(r.status, 403);
    r = await call('POST', '/api/backup/offsite/inspect', { name });
    assert.equal(r.status, 200); assert.equal(r.json.tasks, 1);
    r = await call('POST', '/api/backup/offsite/restore', { name, passphrase: 'a long enough phrase' });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.ok(r.json.backup, 'the data before the restore was kept');
    const st2 = JSON.parse(readFileSync(join(data, 'state', 'dashboard-state.json'), 'utf8'));
    assert.deepEqual(st2.custom.map(x => x.title), ['keep me']);
    const g = await call('GET', '/api/backup/offsite');
    assert.equal(g.json.backups.length, 1);
    assert.equal(g.json.lastResult, 'ok');
    // unzips to what was exported
    assert.ok(readZip(await createOffsiteBackup({ secrets: secretStore(data), exportZip: () => Buffer.alloc(0) }).open(name)).some(e => e.name.endsWith('state/dashboard-state.json')));
  } finally { await srv.close(); rmSync(t, { recursive: true, force: true }); }
});
