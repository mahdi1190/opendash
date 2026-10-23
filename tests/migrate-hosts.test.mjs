// tools/migrate.mjs --auto while another computer has the data folder open:
// pending migrations are skipped with the reason printed, the exit code stays
// 0 (the launcher goes on to start the server and its banner), and nothing in
// the data folder is touched. Once the other computer is gone they apply.
// Pre-migrate backups never copy an old <data>/secrets folder.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { autoMigrate, backupDataDir } from '../tools/migrate.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'od-migrate-hosts-'));
const DEVICE = join(tmp, 'device');
process.env.DASHBOARD_DEVICE_DIR = DEVICE;
after(() => { delete process.env.DASHBOARD_DEVICE_DIR; rmSync(tmp, { recursive: true, force: true }); });
const quiet = () => {};
let n = 0;
function oldDataFolder() {
  const d = join(tmp, `data-${++n}`);
  mkdirSync(join(d, 'state'), { recursive: true });
  writeFileSync(join(d, 'state', 'dashboard-state.json'), JSON.stringify({ custom: [{ id: 't1', title: 'Synthetic' }], _lastSave: 1 }));
  writeFileSync(join(d, 'migrations.json'), JSON.stringify({ version: 1, applied: [] }));
  return d;
}
const otherHost = (d, beatAt = Date.now()) => {
  const id = randomBytes(12).toString('hex');
  mkdirSync(join(d, 'hosts'), { recursive: true });
  writeFileSync(join(d, 'hosts', `${id}.json`), JSON.stringify({ hostId: id, hostname: 'WORK-LAPTOP', pid: 1, version: '9', startedAt: null, beatAt }));
  return join(d, 'hosts', `${id}.json`);
};
const snapshot = (d) => readdirSync(d, { recursive: true }).map(String).sort().map(f => [f, existsSync(join(d, f)) && !f.endsWith('hosts') ? (() => { try { return readFileSync(join(d, f), 'utf8'); } catch { return 'dir'; } })() : '']);

test('autoMigrate skips every pending migration while another computer is live, then applies them', async () => {
  const d = oldDataFolder();
  const presence = otherHost(d);
  const before = snapshot(d);
  const r = await autoMigrate({ dataDir: d, repoRoot: tmp, log: quiet });
  assert.equal(r.status, 'other-computer');
  assert.equal(r.host.hostname, 'WORK-LAPTOP');
  assert.ok(r.pending.length > 3);
  assert.deepEqual(r.applied, []);
  assert.deepEqual(snapshot(d), before, 'nothing in the data folder changed, not even a backup');
  rmSync(presence);
  const r2 = await autoMigrate({ dataDir: d, repoRoot: tmp, log: quiet });
  assert.equal(r2.status, 'applied');
  assert.ok(r2.applied.length > 3);
  // up to date: the presence of another computer no longer matters
  otherHost(d);
  assert.equal((await autoMigrate({ dataDir: d, repoRoot: tmp, log: quiet })).status, 'up-to-date');
});

test('a presence file older than 3 minutes does not stop migrations', async () => {
  const d = oldDataFolder();
  otherHost(d, Date.now() - 10 * 60000);
  assert.equal((await autoMigrate({ dataDir: d, repoRoot: tmp, log: quiet })).status, 'applied');
});

test('the launcher command prints why and exits 0', () => {
  const d = oldDataFolder();
  otherHost(d);
  const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'migrate.mjs'), '--auto', '--data-dir', d], { encoding: 'utf8', env: { ...process.env, DASHBOARD_DEVICE_DIR: DEVICE }, timeout: 60000 });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /OpenDash is open on WORK-LAPTOP \(seen just now\): \d+ pending migration\(s\) skipped/);
  assert.match(r.stdout, /don't overwrite each other/);
  assert.equal(JSON.parse(readFileSync(join(d, 'migrations.json'), 'utf8')).applied.length, 0);
});

test('pre-migrate backups never copy secrets/ or hosts/ into the data folder', async () => {
  const d = oldDataFolder();
  mkdirSync(join(d, 'secrets', 'fin'), { recursive: true });
  writeFileSync(join(d, 'secrets', 'fin', 'monzo-x.json'), '{"refreshToken":"synthetic"}');
  otherHost(d, 1);
  const b = await backupDataDir(d);
  assert.ok(existsSync(join(b.dest, 'state', 'dashboard-state.json')));
  assert.equal(existsSync(join(b.dest, 'secrets')), false);
  assert.equal(existsSync(join(b.dest, 'hosts')), false);
});
