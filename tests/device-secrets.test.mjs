// Sign-ins and keys live on this computer (secretsDir, lib/devicedir.mjs),
// never in the data folder: no code path may still join a data folder with
// 'secrets', and each module that keeps a secret writes it to the device
// folder. Runs in temp folders with DASHBOARD_DEVICE_DIR set to a temp device root.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { secretsDir, legacySecretsDir, deviceRoot } from '../lib/devicedir.mjs';
import { dataPaths } from '../lib/datadir.mjs';
import { secretsFor } from '../lib/fin-connect/secrets.mjs';
import { createMicrosoft } from '../lib/microsoft.mjs';
import { createRemoteAuth } from '../lib/remote-mcp-auth.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'od-devsecrets-'));
const base = join(tmp, 'device');
process.env.DASHBOARD_DEVICE_DIR = base;   // read at call time by lib/devicedir.mjs
after(() => { delete process.env.DASHBOARD_DEVICE_DIR; rmSync(tmp, { recursive: true, force: true }); });

// ─── static: no join(<data>, 'secrets') left anywhere in the app ───────────
function codeFiles(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const st = statSync(p);
    if (st.isDirectory()) { if (!/^(node_modules|vendor|fixtures)$/.test(n)) codeFiles(p, out); }
    else if (/\.(mjs|js)$/.test(n)) out.push(p);
  }
  return out;
}
// Comments may still describe the old place; code may not use it.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|[^:'"`\\])\/\/.*$/, '$1')).join('\n');
// The two places that may name the OLD folder: the one-time move itself, and
// migration 001 (it copies a pre-2.0 <repo>/secrets into the device folder).
const ALLOWED = new Set(['lib/devicedir.mjs', 'tools/migrations/001-data-dir.mjs']);

test("no code path joins a data folder with 'secrets'", () => {
  const files = ['lib', 'server', 'mcp', 'tools', 'src', 'serve.mjs', 'build.mjs'].flatMap(d => {
    const p = join(ROOT, d);
    return statSync(p).isDirectory() ? codeFiles(p) : [p];
  });
  assert.ok(files.length > 50);
  const hits = [];
  for (const f of files) {
    const rel = relative(ROOT, f).split(/[\\/]/).join('/');
    if (ALLOWED.has(rel)) continue;
    const code = stripComments(readFileSync(f, 'utf8'));
    const re = [
      /\b(?:join|resolve)\([^)]*['"`]secrets['"`]/g,     // join(dataDir, 'secrets', ...)
      /['"`][^'"`\n]*[\\/]secrets[\\/][^'"`\n]*['"`]/g,   // '<x>/secrets/<y>' in a string
      /\$\{[^}]+\}[\\/]secrets\b/g,                       // `${dataDir}/secrets`
    ];
    for (const r of re) for (const m of code.matchAll(r)) hits.push(`${rel}: ${m[0].slice(0, 80)}`);
  }
  assert.deepEqual(hits, []);
});

// ─── behaviour: every module that keeps a secret uses the device folder ────
// (static imports at the top: a top-level await would let the root after() hook run early)

const dataDir = () => mkdtempSync(join(tmpdir(), 'od-devsecrets-data-'));
const onDevice = (dir, rel) => {
  assert.ok(existsSync(join(secretsDir(dir), rel)), `${rel} is in the device folder`);
  assert.ok(join(secretsDir(dir), rel).startsWith(base), `under the injected device root (${secretsDir(dir)} vs ${base})`);
  assert.equal(existsSync(legacySecretsDir(dir)), false, 'nothing is written to <data>/secrets');
};

test('dataPaths().secrets is the device folder, computed lazily', () => {
  const d = dataDir();
  try {
    const p = dataPaths(d);
    assert.equal(existsSync(join(d, 'data-id.json')), false, 'dataPaths() alone makes no data id');
    assert.equal(p.secrets, secretsDir(d));
    assert.equal(p.secrets, join(deviceRoot(d), 'secrets'));
    assert.equal(p.hosts, join(d, 'hosts'));
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('finance connector credentials (secrets/fin)', async () => {

  const d = dataDir();
  try {
    await secretsFor(d).write('plasma-key', { key: 'synthetic' });
    onDevice(d, join('fin', 'plasma-key.json'));
    assert.deepEqual(await secretsFor(d).read('plasma-key'), { key: 'synthetic' });
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('Microsoft client and tokens', async () => {

  const d = dataDir();
  try {
    await createMicrosoft({ dataDir: d, fetchFn: async () => { throw new Error('no network in tests'); } }).configure('00000000-0000-4000-8000-000000000001');
    onDevice(d, 'microsoft-client.json');
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('remote MCP sign-in records', async () => {

  const d = dataDir();
  try {
    const auth = createRemoteAuth({ dataDir: d, publicOrigin: 'https://mcp.example.org' });
    await auth.register({ redirect_uris: ['https://claude.ai/api/mcp/auth_callback'], client_name: 'test' });
    onDevice(d, 'remote-mcp-auth.json');
  } finally { rmSync(d, { recursive: true, force: true }); }
});
