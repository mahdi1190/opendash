// lib/devicedir.mjs: the per-computer folder (device root, data id, host id,
// secretsDir) and the one-time, resumable, hash-verified move of a legacy
// <data>/secrets folder. Everything runs in temp folders with an injected
// device root: the real %LOCALAPPDATA%\OpenDash is never touched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, renameSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import {
  deviceBase, deviceRoot, secretsDir, readDataId, ensureDataId, dataIdFile, readHostId, ensureHostId,
  legacySecretsDir, migrateLegacySecrets,
} from '../lib/devicedir.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'od-devicedir-'));
const sha = (f) => createHash('sha256').update(readFileSync(f)).digest('hex');
const put = (f, s) => { mkdirSync(join(f, '..'), { recursive: true }); writeFileSync(f, s); };

test('device base per platform, from the environment', () => {
  const home = join('H', 'me');
  assert.equal(deviceBase({ env: { LOCALAPPDATA: join('C', 'Local') }, platform: 'win32', home }), join('C', 'Local', 'OpenDash'));
  assert.equal(deviceBase({ env: {}, platform: 'win32', home }), join(home, 'AppData', 'Local', 'OpenDash'));
  assert.equal(deviceBase({ env: {}, platform: 'darwin', home }), join(home, 'Library', 'Application Support', 'OpenDash'));
  assert.equal(deviceBase({ env: { XDG_STATE_HOME: join('X', 'state') }, platform: 'linux', home }), join('X', 'state', 'opendash'));
  assert.equal(deviceBase({ env: {}, platform: 'linux', home }), join(home, '.local', 'state', 'opendash'));
});

test('DASHBOARD_DEVICE_DIR and opts.base replace the platform folder', () => {
  const t = tmp();
  try {
    assert.equal(deviceBase({ env: { DASHBOARD_DEVICE_DIR: t, LOCALAPPDATA: 'elsewhere' }, platform: 'win32' }), t);
    assert.equal(deviceBase({ base: join(t, 'b'), env: { DASHBOARD_DEVICE_DIR: t } }), join(t, 'b'));
  } finally { rmSync(t, { recursive: true, force: true }); }
});

test('under the test runner the default is a temp folder, never the real one', () => {
  assert.equal(deviceBase({ env: { NODE_TEST_CONTEXT: 'child', LOCALAPPDATA: join('C', 'Local') }, platform: 'win32' }), join(tmpdir(), 'opendash-test-device'));
  if (!process.env.DASHBOARD_DEVICE_DIR) {
    const b = deviceBase();
    assert.equal(b, join(tmpdir(), 'opendash-test-device'));
    if (process.env.LOCALAPPDATA) assert.ok(!b.toLowerCase().startsWith(join(process.env.LOCALAPPDATA, 'OpenDash').toLowerCase()));
  }
});

test('a data folder in the system temp folder never gets the real device folder, whatever the environment', () => {
  // (a test may start a real server with NODE_TEST* removed from its environment)
  const env = { LOCALAPPDATA: join('C', 'Local') };
  assert.equal(deviceBase({ env, platform: 'win32', dataDir: join(tmpdir(), 'some-test', 'data') }), join(tmpdir(), 'opendash-test-device'));
  assert.equal(deviceBase({ env, platform: 'win32', dataDir: join('D', 'Users', 'me', 'data') }), join('C', 'Local', 'OpenDash'));
  assert.equal(deviceBase({ env: { ...env, DASHBOARD_DEVICE_DIR: join(tmpdir(), 'x') }, platform: 'win32', dataDir: join(tmpdir(), 'd') }), join(tmpdir(), 'x'));
  const t = tmp();
  try {
    mkdirSync(join(t, 'data'));
    assert.equal(deviceRoot(join(t, 'data'), { env: {}, platform: 'win32' }).startsWith(join(tmpdir(), 'opendash-test-device')), true);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

test('the data id is made once, read back, and follows the folder when it moves', () => {
  const t = tmp();
  try {
    const data = join(t, 'data'), base = join(t, 'device');
    mkdirSync(data);
    assert.equal(readDataId(data), null);
    assert.equal(deviceRoot(data, { base, create: false }), null, 'create:false never makes an id');
    assert.equal(existsSync(dataIdFile(data)), false);
    const id = ensureDataId(data);
    assert.match(id, /^[a-f0-9]{24}$/);
    assert.equal(ensureDataId(data), id);
    assert.equal(readDataId(data), id);
    const root = deviceRoot(data, { base });
    assert.equal(root, join(base, id));
    assert.equal(secretsDir(data, { base }), join(base, id, 'secrets'));
    assert.equal(existsSync(join(base, id)), false, 'the path is computed; writers create the folder');
    renameSync(data, join(t, 'moved'));
    assert.equal(deviceRoot(join(t, 'moved'), { base }), root, 'a moved data folder keeps its device folder');
    // another data folder gets another device folder
    mkdirSync(join(t, 'other'));
    assert.notEqual(deviceRoot(join(t, 'other'), { base }), root);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

test('a broken data-id.json is replaced rather than blocking the app', () => {
  const t = tmp();
  try {
    writeFileSync(join(t, 'data-id.json'), '{not json');
    const id = ensureDataId(t);
    assert.match(id, /^[a-f0-9]{24}$/);
    assert.equal(readDataId(t), id);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

test('the host id lives in the device folder, one per data folder', () => {
  const t = tmp();
  try {
    const base = join(t, 'device'), a = join(t, 'a'), b = join(t, 'b');
    mkdirSync(a); mkdirSync(b);
    assert.equal(readHostId(a, { base }), null);
    assert.equal(existsSync(join(a, 'data-id.json')), false, 'peeking never creates the data id');
    const h = ensureHostId(a, { base });
    assert.match(h, /^[a-f0-9]{24}$/);
    assert.equal(ensureHostId(a, { base }), h);
    assert.equal(readHostId(a, { base }), h);
    assert.ok(existsSync(join(deviceRoot(a, { base }), 'host.json')));
    assert.notEqual(ensureHostId(b, { base }), h);
    // the same data folder seen from "another computer" (another device base) has another host id
    assert.notEqual(ensureHostId(a, { base: join(t, 'device2') }), h);
  } finally { rmSync(t, { recursive: true, force: true }); }
});

// ─── migration ────────────────────────────────────────────────────────────
function fixture() {
  const t = tmp();
  const data = join(t, 'data'), base = join(t, 'device');
  const L = legacySecretsDir(data);
  put(join(L, 'google-tokens.json'), '{"refresh_token":"synthetic-google"}');
  put(join(L, 'microsoft-tokens.json'), '{"refresh_token":"synthetic-ms"}');
  put(join(L, 'fin', 'monzo-src-1.json'), '{"refreshToken":"synthetic-once"}');
  put(join(L, 'fin', 'eb-app.json'), '{"pem":"-----BEGIN SYNTHETIC-----"}');
  put(join(L, 'narration.json.lock'), '{}');
  const hashes = Object.fromEntries(['google-tokens.json', 'microsoft-tokens.json', join('fin', 'monzo-src-1.json'), join('fin', 'eb-app.json')].map(r => [r, sha(join(L, r))]));
  return { t, data, base, L, hashes, done: () => rmSync(t, { recursive: true, force: true }) };
}
function assertMoved(f) {
  const S = secretsDir(f.data, { base: f.base }), B = join(deviceRoot(f.data, { base: f.base }), 'legacy-secrets-backup');
  for (const [rel, h] of Object.entries(f.hashes)) {
    assert.equal(sha(join(S, rel)), h, `${rel} is on this computer`);
    assert.equal(sha(join(B, rel)), h, `${rel} original is in legacy-secrets-backup`);
  }
  assert.equal(existsSync(f.L), false, '<data>/secrets is gone from the data folder');
}

test('migration: nothing to do without <data>/secrets', () => {
  const t = tmp();
  try {
    const r = migrateLegacySecrets(t, { base: join(t, 'device') });
    assert.equal(r.status, 'none');
    assert.equal(existsSync(join(t, 'device')), false);
    assert.equal(existsSync(join(t, 'data-id.json')), false, 'a no-op writes nothing at all');
  } finally { rmSync(t, { recursive: true, force: true }); }
});

test('migration: copies, verifies, backs up, removes; a second run is a no-op', () => {
  const f = fixture();
  try {
    const r = migrateLegacySecrets(f.data, { base: f.base });
    assert.equal(r.status, 'done');
    assert.equal(r.copied.length, 4);
    assert.deepEqual(r.removed.sort(), ['fin/eb-app.json', 'fin/monzo-src-1.json', 'google-tokens.json', 'microsoft-tokens.json']);
    assertMoved(f);
    assert.ok(existsSync(join(deviceRoot(f.data, { base: f.base }), 'legacy-secrets-migrated.json')));
    const again = migrateLegacySecrets(f.data, { base: f.base });
    assert.equal(again.status, 'none');
    assertMoved(f);
  } finally { f.done(); }
});

test('migration: a dry run writes nothing', () => {
  const f = fixture();
  try {
    const r = migrateLegacySecrets(f.data, { base: f.base, dryRun: true });
    assert.equal(r.status, 'dry-run');
    assert.equal(r.copied.length, 4);
    assert.ok(existsSync(join(f.L, 'google-tokens.json')));
    assert.equal(existsSync(secretsDir(f.data, { base: f.base })), false);
  } finally { f.done(); }
});

test('migration: skipped while another computer is live', () => {
  const f = fixture();
  try {
    const r = migrateLegacySecrets(f.data, { base: f.base, othersLive: () => [{ hostId: 'b'.repeat(24), hostname: 'WORK-LAPTOP' }] });
    assert.equal(r.status, 'skipped');
    assert.match(r.reason, /WORK-LAPTOP/);
    assert.ok(existsSync(join(f.L, 'fin', 'monzo-src-1.json')), 'nothing moved');
    assert.equal(existsSync(secretsDir(f.data, { base: f.base })), false);
  } finally { f.done(); }
});

for (const [phase, nth] of [['copy', 2], ['backup', 1], ['remove', 3]]) {
  test(`migration: a crash during ${phase} (file ${nth}) is finished by the next run`, () => {
    const f = fixture();
    try {
      let n = 0;
      assert.throws(() => migrateLegacySecrets(f.data, {
        base: f.base,
        onStep: (step) => { if (step === phase && ++n === nth) throw new Error('simulated crash'); },
      }), /simulated crash/);
      // partway: some originals may be gone, but every file exists somewhere complete
      const S = secretsDir(f.data, { base: f.base });
      for (const [rel, h] of Object.entries(f.hashes)) {
        const inData = existsSync(join(f.L, rel)), onDevice = existsSync(join(S, rel));
        assert.ok(inData || onDevice, `${rel} is never lost`);
        if (inData) assert.equal(sha(join(f.L, rel)), h);
        if (onDevice) assert.equal(sha(join(S, rel)), h, `${rel} is complete or absent, never half-copied`);
      }
      const r = migrateLegacySecrets(f.data, { base: f.base });
      assert.equal(r.status, 'done');
      assertMoved(f);
      const tmpLeft = readdirSync(S, { recursive: true }).filter(n => /\.tmp-/.test(String(n)));
      assert.deepEqual(tmpLeft, []);
    } finally { f.done(); }
  });
}

test("migration: this computer's newer copy is kept, the old one is still backed up", () => {
  const f = fixture();
  try {
    const S = secretsDir(f.data, { base: f.base });
    put(join(S, 'microsoft-tokens.json'), '{"refresh_token":"rotated-on-this-computer"}');
    const r = migrateLegacySecrets(f.data, { base: f.base });
    assert.equal(r.status, 'done');
    assert.deepEqual(r.kept, ['microsoft-tokens.json']);
    assert.match(readFileSync(join(S, 'microsoft-tokens.json'), 'utf8'), /rotated-on-this-computer/);
    const B = join(deviceRoot(f.data, { base: f.base }), 'legacy-secrets-backup');
    assert.equal(sha(join(B, 'microsoft-tokens.json')), f.hashes['microsoft-tokens.json']);
    assert.equal(existsSync(f.L), false);
  } finally { f.done(); }
});

test('migration: an earlier backup with other content is never overwritten', () => {
  const f = fixture();
  try {
    const B = join(deviceRoot(f.data, { base: f.base }), 'legacy-secrets-backup');
    put(join(B, 'google-tokens.json'), '{"refresh_token":"from-an-older-folder"}');
    migrateLegacySecrets(f.data, { base: f.base });
    assert.match(readFileSync(join(B, 'google-tokens.json'), 'utf8'), /older-folder/);
    assert.equal(sha(join(B, 'google-tokens.json.2')), f.hashes['google-tokens.json']);
  } finally { f.done(); }
});
