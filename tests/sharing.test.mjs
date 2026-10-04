// lib/zip.mjs + lib/sharing.mjs: the clean app copy, data export/import,
// backups and restore, reset, and diagnostics without personal content.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createZip, readZip, safeEntryName, crc32 } from '../lib/zip.mjs';
import { appFiles, exportApp, exportData, inspectDataZip, importData, listBackups, restoreBackup, backupNow,
  resetData, scrub, diagnostics, diagnosticsText } from '../lib/sharing.mjs';
import { createStateStore } from '../server/state-store.mjs';
import { ensureDataDir, dataPaths, loadConfig, saveConfig } from '../lib/datadir.mjs';

let root;
const mk = (p, text = 'x') => { mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, text); };
before(() => { root = mkdtempSync(join(tmpdir(), 'sharing-test-')); });
after(() => rmSync(root, { recursive: true, force: true }));

test('zip: round trip keeps names, bytes and unicode; CRCs are checked', () => {
  const big = Buffer.alloc(200000, 'abc');
  const files = [{ name: 'a/b.txt', data: 'hello' }, { name: 'a/ü € ✓.md', data: 'unicode name' }, { name: 'big.bin', data: big }, { name: 'empty', data: '' }];
  const z = createZip(files);
  const back = readZip(z);
  assert.deepEqual(back.map(e => e.name), files.map(f => f.name));
  assert.equal(back[0].data.toString(), 'hello');
  assert.ok(back[2].data.equals(big));
  assert.ok(z.length < big.length / 10, 'deflated');
  assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926);
  const bad = Buffer.from(z); bad[40] ^= 0xff;            // flip a byte inside the first file's data
  assert.throws(() => readZip(bad));
});

test('zip: unsafe entry names are refused', () => {
  for (const n of ['../x', 'a/../../x', '/etc/passwd', 'C:/Windows/x', 'a\\..\\b', 'con|x', '']) assert.equal(safeEntryName(n), null, n);
  assert.equal(safeEntryName('a/./b//c.txt'), 'a/b/c.txt');
  // a crafted zip whose entry name climbs out of the folder (same length, patched in place)
  const z = createZip([{ name: 'aa/x.txt', data: 'pwned' }]);
  const evil = Buffer.from(z.toString('latin1').split('aa/x.txt').join('../x.txt'), 'latin1');
  assert.throws(() => readZip(evil), /unsafe path/);
});

test('the clean app copy never contains data, state, secrets, logs, .env, tokens or personal scripts', () => {
  const repo = join(root, 'repo');
  for (const f of ['package.json', 'README.md', 'LICENSE', 'build.mjs', 'serve.mjs', 'index.html', 'src/app/00-core.js', 'server/index.mjs',
    'lib/x.mjs', 'mcp/server.mjs', 'vendor/fonts/a.woff2', 'tools/migrate.mjs', 'tests/a.test.mjs']) mk(join(repo, f), f === 'package.json' ? '{"version":"2.1.0"}' : 'ok');
  for (const f of ['data/config.json', 'data/state/dashboard-state.json', 'state/dashboard-state.json', 'secrets/google.json', '.env', '.env.local',
    'lib/.env', 'logs/server.log', 'node_modules/x/index.js', '.git/HEAD', '.claude/settings.json', 'tools/apply_sync.py',
    'tools/__pycache__/a.pyc', 'src/app/x.js.lock', 'local-token', 'runtime.json', 'tasks-2026-01-01.md', 'Thumbs.db', 'random-notes.txt']) mk(join(repo, f), 'SECRET');
  const rels = appFiles(repo).map(f => f.rel).sort();
  assert.ok(rels.includes('src/app/00-core.js') && rels.includes('mcp/server.mjs') && rels.includes('vendor/fonts/a.woff2'));
  for (const r of rels) {
    assert.ok(!/(^|\/)(data|state|secrets|logs|node_modules|\.git|\.claude)\//.test(r), r);
    assert.ok(!/\.env|apply_sync|\.pyc$|\.lock$|local-token|runtime\.json|tasks-|Thumbs|random-notes/.test(r), r);
  }
  const z = exportApp(repo);
  assert.equal(z.name, 'opendash-v2.1.0.zip');
  const entries = readZip(z.buffer);
  assert.ok(entries.every(e => e.name.startsWith('opendash-v2.1.0/')));
  assert.ok(entries.some(e => e.name === 'opendash-v2.1.0/data/README.txt'), 'an empty data folder note');
  assert.ok(!entries.some(e => e.data.toString().includes('SECRET')), 'nothing excluded slipped in');
});

async function makeData(name, tasks = 3) {
  const dir = join(root, name);
  await ensureDataDir(dir);
  const p = dataPaths(dir);
  const store = createStateStore({ stateDir: p.stateDir });
  await store.mutate(() => ({ next: { custom: Array.from({ length: tasks }, (_, i) => ({ id: 't' + i, title: 'Task ' + i })), people: [{ id: 'sam', name: 'Sam' }] }, result: true }));
  mk(join(dir, 'finance', '_system', 'rules.json'), '{"rules":[]}');
  mk(join(dir, 'secrets', 'google-token.json'), 'TOKEN');
  mk(join(dir, 'logs', 'server.log'), 'log line');
  mk(join(dir, 'local-token'), 'abc');
  mk(join(dir, 'calendar', 'calendar.json'), '{"events":[]}');
  const setConfig = (patch) => saveConfig(dir, patch);
  return { dir, p, store, setConfig };
}

test('data export holds the data and nothing machine-specific; import replaces it after a full backup', async () => {
  const a = await makeData('A', 5);
  await saveConfig(a.dir, { userName: 'Sam', currency: 'EUR' });
  const z = exportData({ dataDir: a.dir });
  const names = readZip(z.buffer).map(e => e.name.replace(/^[^/]+\//, ''));
  assert.ok(names.includes('state/dashboard-state.json') && names.includes('config.json') && names.includes('finance/_system/rules.json'));
  for (const n of names) assert.ok(!/secrets|logs|local-token|connections\.json|runtime\.json|backups\//.test(n), n);
  const info = inspectDataZip(z.buffer);
  assert.equal(info.tasks, 5); assert.equal(info.people, 1); assert.equal(info.hasConfig, true); assert.ok(info.financeFiles >= 1);

  const b = await makeData('B', 2);
  const r = await importData({ buffer: z.buffer, dataDir: b.dir, store: b.store, setConfig: b.setConfig });
  assert.equal(r.tasks, 5);
  assert.ok(r.backup.startsWith('pre-import-'));
  assert.ok(existsSync(join(b.dir, 'backups', r.backup, 'state', 'dashboard-state.json')), 'the old data was copied first');
  assert.equal((await b.store.readObject()).custom.length, 5);
  const cfg = await loadConfig(b.dir);
  assert.equal(cfg.userName, 'Sam'); assert.equal(cfg.currency, 'EUR'); assert.ok(cfg.onboardedAt, 'an imported dashboard skips the welcome');
  assert.equal(readFileSync(join(b.dir, 'secrets', 'google-token.json'), 'utf8'), 'TOKEN', 'secrets on the new machine are untouched');
  assert.throws(() => inspectDataZip(createZip([{ name: 'x/readme.txt', data: 'hi' }])), /not an OpenDash data export/);
  assert.throws(() => inspectDataZip(Buffer.from('not a zip')));
});

test('backups: manual backup, list, restore keeps a pre-restore copy', async () => {
  const c = await makeData('C', 4);
  const { name } = await backupNow({ paths: c.p, store: c.store });
  await c.store.mutate((cur) => ({ next: { ...cur, custom: [] }, result: true }));
  const list = await listBackups(c.p);
  assert.ok(list.some(b => b.name === name && b.kind === 'manual'));
  const r = await restoreBackup({ name, paths: c.p, store: c.store });
  assert.equal(r.tasks, 4);
  assert.equal((await c.store.readObject()).custom.length, 4);
  assert.ok((await listBackups(c.p)).some(b => b.kind === 'before restore'));
  await assert.rejects(restoreBackup({ name: '../config.json', paths: c.p, store: c.store }), /unknown backup/);
  await assert.rejects(restoreBackup({ name: 'nope.json', paths: c.p, store: c.store }), /unknown backup/);
});

test('reset: backs up the whole folder, empties the state, restores default settings and shows the welcome again', async () => {
  const d = await makeData('D', 6);
  await saveConfig(d.dir, { userName: 'Alex', onboardedAt: new Date().toISOString() });
  const r = await resetData({ dataDir: d.dir, store: d.store, setConfig: d.setConfig });
  assert.ok(existsSync(join(d.dir, 'backups', r.backup, 'state', 'dashboard-state.json')));
  assert.equal((await d.store.readObject()).custom.length, 0);
  const cfg = await loadConfig(d.dir);
  assert.equal(cfg.userName, ''); assert.equal(cfg.onboardedAt, null);
  assert.ok(existsSync(join(d.dir, 'finance', '_system', 'rules.json')), 'finance kept unless asked');
  assert.ok(!existsSync(join(d.dir, 'calendar', 'calendar.json')));
});

test('diagnostics: no paths, addresses or tokens in the copied text', async () => {
  const e = await makeData('E', 2);
  mk(join(e.dir, 'logs', 'server.log'), `2026-01-01 INFO started ${e.dir}\\x mail sam@example.com ?token=abc123 C:\\Users\\someone\\x`);
  const d = await diagnostics({ dataDir: e.dir, version: '2.0.0', store: e.store, connections: { gmail: { status: 'needs-auth', message: `bad at ${e.dir} for a@b.co` } }, port: 1 });
  const text = diagnosticsText(d);
  assert.ok(!text.includes(e.dir), 'data path scrubbed');
  assert.ok(!/@example\.com|a@b\.co/.test(text), 'emails scrubbed');
  assert.ok(!text.includes('abc123'), 'tokens scrubbed');
  assert.match(text, /<data>/);
  assert.match(text, /^OpenDash 2\.0\.0 · Node /);
  assert.equal(d.data.taskCount, 2);
  assert.equal(scrub('x C:/Users/me/y', { dataDir: 'C:/nope', home: 'C:/Users/me' }), 'x ~/y');
});
