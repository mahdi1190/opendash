// lib/secret-store.mjs: the one interface every secret goes through (get, set,
// delete, list, has, update, lock), its file backend in the device folder, and
// a swapped-in backend (what a later OS keychain backend does) that callers
// use without any change. Temp folders and an injected device root only.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { secretStore, fileBackend, setSecretBackendFactory, checkKey } from '../lib/secret-store.mjs';
import { secretsDir } from '../lib/devicedir.mjs';
import { secretsFor } from '../lib/fin-connect/secrets.mjs';
import { createMicrosoft } from '../lib/microsoft.mjs';
import { createRemoteAuth } from '../lib/remote-mcp-auth.mjs';
import { createNarration } from '../lib/narration.mjs';
import { initGoogle, googleStatus } from '../lib/google.mjs';

const tmp = mkdtempSync(join(tmpdir(), 'od-secretstore-'));
process.env.DASHBOARD_DEVICE_DIR = join(tmp, 'device');
after(() => { setSecretBackendFactory(null); delete process.env.DASHBOARD_DEVICE_DIR; rmSync(tmp, { recursive: true, force: true }); });
let n = 0;
const dataDir = () => { const d = join(tmp, `data-${++n}`); mkdirSync(d); return d; };

test('keys: one or two plain parts, nothing that can leave the folder', () => {
  for (const k of ['microsoft-tokens', 'fin/monzo-src-1', 'client_secret_1-abc.apps.googleusercontent.com', 'a']) assert.equal(checkKey(k), k);
  for (const k of ['', '../x', 'fin/../x', '.hidden', 'fin/.x', 'a/b/c', 'a\\b', 'C:/x', 'x y', null]) assert.throws(() => checkKey(k), { code: 'BAD_SECRET_KEY' }, String(k));
});

test('file backend: get/set/has/list/delete/update in the device folder, mode 0600', async () => {
  const d = dataDir();
  const s = secretStore(d);
  assert.equal(s.kind, 'file');
  assert.equal(s.location, secretsDir(d));
  assert.equal(await s.get('microsoft-tokens'), null);
  assert.equal(await s.has('microsoft-tokens'), false);
  await s.set('microsoft-tokens', { refresh_token: 'synthetic' });
  await s.set('fin/plasma-key', { key: 'k' });
  await s.set('signed-out', null);
  assert.deepEqual(await s.get('microsoft-tokens'), { refresh_token: 'synthetic' });
  assert.equal(await s.has('signed-out'), true, 'a saved null counts');
  assert.equal(await s.get('signed-out'), null);
  assert.deepEqual(await s.list(), ['fin/plasma-key', 'microsoft-tokens', 'signed-out']);
  assert.deepEqual(await s.list('fin/'), ['fin/plasma-key']);
  const f = join(secretsDir(d), 'microsoft-tokens.json');
  assert.ok(existsSync(f));
  if (process.platform !== 'win32') assert.equal(statSync(f).mode & 0o777, 0o600);
  assert.equal(await s.update('counter', (cur) => (cur || 0) + 1), 1);
  assert.equal(await s.update('counter', (cur) => cur + 1), 2);
  assert.equal(await s.update('counter', () => undefined), 2, 'undefined: no change');
  assert.equal(await s.update('counter', () => null), null, 'null: delete');
  assert.equal(await s.has('counter'), false);
  await s.delete('microsoft-tokens');
  await s.delete('microsoft-tokens');   // twice is fine
  assert.equal(await s.get('microsoft-tokens'), null);
  assert.equal(existsSync(join(d, 'secrets')), false, 'never in the data folder');
});

test('a damaged value throws SECRET_CORRUPT: never mistaken for "none"', async () => {
  const d = dataDir();
  const s = secretStore(d);
  mkdirSync(secretsDir(d), { recursive: true });
  writeFileSync(join(secretsDir(d), 'fin-like.json'), '{broken');
  await assert.rejects(s.get('fin-like'), { code: 'SECRET_CORRUPT' });
  await assert.rejects(secretStore(d).update('fin-like', () => ({})), { code: 'SECRET_CORRUPT' });
});

test('lock: changes to one key from two callers run one after the other', async () => {
  const s = secretStore(dataDir());
  const order = [];
  await Promise.all([1, 2, 3].map(i => s.lock('k', async () => {
    order.push(`in${i}`);
    await new Promise(r => setTimeout(r, 15));
    await s.set('k', i);
    order.push(`out${i}`);
  })));
  assert.deepEqual(order, ['in1', 'out1', 'in2', 'out2', 'in3', 'out3']);
});

// A stand-in for a later OS keychain backend: everything in memory.
function memoryBackend() {
  const m = new Map(), locks = new Map();
  return {
    kind: 'memory', m,
    async read(k) { return m.has(k) ? structuredClone(m.get(k)) : null; },
    async write(k, v) { m.set(k, structuredClone(v)); },
    async remove(k) { m.delete(k); },
    async keys(prefix) { return [...m.keys()].filter(k => k.startsWith(prefix)).sort(); },
    async lock(k, fn) { const prev = locks.get(k) || Promise.resolve(); let rel; const mine = new Promise(r => { rel = r; }); locks.set(k, prev.then(() => mine)); await prev; try { return await fn(); } finally { rel(); } },
  };
}

test('a swapped backend serves every caller unchanged (the keychain path)', async () => {
  const mem = memoryBackend();
  setSecretBackendFactory(() => mem);
  try {
    const d = join(tmp, 'keychain-data'); mkdirSync(d);
    // finance connectors
    await secretsFor(d).write('plasma-key', { key: 'synthetic' });
    assert.deepEqual(mem.m.get('fin/plasma-key'), { key: 'synthetic' });
    assert.equal(secretsFor(d).dir, null, 'no folder with a non-file backend');
    // Microsoft
    await createMicrosoft({ dataDir: d, fetchFn: async () => { throw new Error('no network'); } }).configure('00000000-0000-4000-8000-000000000002');
    assert.deepEqual(mem.m.get('microsoft-client'), { clientId: '00000000-0000-4000-8000-000000000002' });
    // remote MCP sign-ins
    await createRemoteAuth({ dataDir: d, publicOrigin: 'https://mcp.example.org' }).register({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'], client_name: 'test' });
    assert.ok(mem.m.get('remote-mcp-auth').clients.length === 1);
    // narration key
    const voice = createNarration({ dataDir: d, fetchFn: async () => new Response(JSON.stringify({ subscription: { tier: 'free', character_count: 0, character_limit: 10000 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }) });
    await voice.configure({ apiKey: 'sk_' + 'a'.repeat(48) }).catch(() => {});
    assert.ok(!existsSync(join(d, 'secrets')));
    // Google: the server hands initGoogle a store
    initGoogle(secretStore(d));
    await mem.write('google-client', { installed: { client_id: 'x.apps.googleusercontent.com', client_secret: 'synthetic' } });
    const st = await googleStatus();
    assert.equal(st.configured, true);
    assert.equal(st.secretsDir, null);
    // nothing reached any folder: no device path was even computed (no data id was needed)
    assert.equal(existsSync(join(d, 'data-id.json')), false);
    assert.equal(existsSync(join(tmp, 'device')) && existsSync(join(tmp, 'device', 'secrets')), false);
  } finally { setSecretBackendFactory(null); initGoogle(null); }
});

test('Google finds the client file under the name Google gives the download', async () => {
  const d = dataDir();
  const s = secretStore(d);
  initGoogle(s);
  try {
    assert.equal((await googleStatus()).configured, false);
    await s.set('client_secret_123-abc.apps.googleusercontent.com', { installed: { client_id: '123-abc.apps.googleusercontent.com', client_secret: 'synthetic' } });
    initGoogle(s);
    const st = await googleStatus();
    assert.equal(st.configured, true);
    assert.equal(st.clientFile, join(secretsDir(d), 'client_secret_123-abc.apps.googleusercontent.com.json'));
    // a folder path still works (older callers)
    initGoogle(secretsDir(d));
    assert.equal((await googleStatus()).configured, true);
  } finally { initGoogle(null); }
});

test('fileBackend on an explicit folder (tools, tests)', async () => {
  const dir = join(tmp, 'plain');
  const s = secretStore(null, { backend: fileBackend(dir) });
  await s.set('x', { a: 1 });
  assert.deepEqual(JSON.parse(readFileSync(join(dir, 'x.json'), 'utf8')), { a: 1 });
});
