// lib/fsutil.mjs: atomic writes with OneDrive-style lock retries, the
// cross-process lock, corruption recovery, and no-overwrite copies.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, utimesSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir, hostname } from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { atomicWrite, writeJson, withLock, readJson, copyTree, isInside, __test } from '../lib/fsutil.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let dir;
before(() => { dir = mkdtempSync(join(tmpdir(), 'fsutil-test-')); });
after(() => { __test.setRename(null); rmSync(dir, { recursive: true, force: true }); });

test('atomicWrite writes the file and leaves no temp files', async () => {
  const f = join(dir, 'a', 'b.json');
  await atomicWrite(f, 'hello');
  assert.equal(readFileSync(f, 'utf8'), 'hello');
  await writeJson(f, { x: 1 });
  assert.deepEqual(JSON.parse(readFileSync(f, 'utf8')), { x: 1 });
  assert.deepEqual(readdirSync(join(dir, 'a')), ['b.json']);
});

test('atomicWrite retries a rename that OneDrive briefly blocks (EPERM/EBUSY)', async () => {
  let calls = 0;
  const { rename } = await import('node:fs/promises');
  __test.setRename(async (a, b) => {
    calls++;
    if (calls <= 3) { const e = new Error('operation not permitted'); e.code = calls === 2 ? 'EBUSY' : 'EPERM'; throw e; }
    return rename(a, b);
  });
  try {
    const f = join(dir, 'locked.json');
    await atomicWrite(f, 'after retries');
    assert.equal(readFileSync(f, 'utf8'), 'after retries');
    assert.equal(calls, 4);
  } finally { __test.setRename(null); }
});

test('atomicWrite gives up on a permanent lock, explains why, and cleans its temp file', async () => {
  __test.setRename(async () => { const e = new Error('EPERM'); e.code = 'EPERM'; throw e; });
  try {
    const sub = join(dir, 'perm'); mkdirSync(sub);
    await assert.rejects(atomicWrite(join(sub, 'x.json'), 'nope', { retry: { retries: 2, baseMs: 1 } }),
      e => e.code === 'EPERM' && /locked by another program/.test(e.message));
    assert.deepEqual(readdirSync(sub), []);
  } finally { __test.setRename(null); }
});

test('a non-retryable error is not retried', async () => {
  let calls = 0;
  __test.setRename(async () => { calls++; const e = new Error('nope'); e.code = 'ENOSPC'; throw e; });
  try {
    await assert.rejects(atomicWrite(join(dir, 'nospace.json'), 'x'), e => e.code === 'ENOSPC');
    assert.equal(calls, 1);
  } finally { __test.setRename(null); }
});

function runWorker(file, n) {
  return new Promise((res, rej) => {
    const p = spawn(process.execPath, [join(HERE, 'fixtures', 'lock-worker.mjs'), file, String(n)], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('close', code => (code === 0 ? res() : rej(new Error(`worker exit ${code}: ${err}`))));
  });
}

test('two processes contending for the lock never lose an update', async () => {
  const f = join(dir, 'counter.txt');
  await Promise.all([runWorker(f, 40), runWorker(f, 40)]);
  assert.equal(readFileSync(f, 'utf8'), '80');
  assert.ok(!existsSync(f + '.lock'), 'lock released');
});

test('withLock serialises callers in one process too, and releases on throw', async () => {
  const f = join(dir, 'serial.txt');
  const order = [];
  await Promise.all([1, 2, 3].map(i => withLock(f, async () => { order.push('in' + i); await new Promise(r => setTimeout(r, 20)); order.push('out' + i); })));
  for (let i = 0; i < order.length; i += 2) assert.equal(order[i].slice(2), order[i + 1].slice(3));
  await assert.rejects(withLock(f, async () => { throw new Error('boom'); }), /boom/);
  assert.ok(!existsSync(f + '.lock'));
});

test('a stale lock (dead process or old timestamp) is recovered', async () => {
  const f = join(dir, 'stale.json');
  writeFileSync(f + '.lock', JSON.stringify({ pid: 999999, host: hostname(), ts: Date.now(), token: 'dead' }));
  const t0 = Date.now();
  await withLock(f, async () => {}, { timeoutMs: 3000 });
  assert.ok(Date.now() - t0 < 2000);
  writeFileSync(f + '.lock', JSON.stringify({ pid: process.pid, host: 'another-machine', ts: Date.now() - 60000, token: 'old' }));
  await withLock(f, async () => {}, { timeoutMs: 3000, staleMs: 20000 });
  assert.ok(!existsSync(f + '.lock'));
});

test('withLock times out on a live lock', async () => {
  const f = join(dir, 'live.json');
  writeFileSync(f + '.lock', JSON.stringify({ pid: process.pid, host: hostname(), ts: Date.now(), token: 'mine' }));
  await assert.rejects(withLock(f, async () => {}, { timeoutMs: 300 }), e => e.code === 'LOCK_TIMEOUT');
  rmSync(f + '.lock');
});

test('readJson: missing -> fallback; corrupt -> newest good backup', async () => {
  assert.equal(await readJson(join(dir, 'missing.json')), null);
  assert.deepEqual(await readJson(join(dir, 'missing.json'), { fallback: { a: 1 } }), { a: 1 });
  const f = join(dir, 'state.json');
  const b = join(dir, 'backups'); mkdirSync(b);
  writeFileSync(join(b, 'state-1.json'), JSON.stringify({ v: 'older' }));
  writeFileSync(join(b, 'state-2.json'), JSON.stringify({ v: 'newest' }));
  writeFileSync(join(b, 'state-3.json'), '{ broken');
  const old = (Date.now() - 100000) / 1000;
  utimesSync(join(b, 'state-1.json'), old, old);
  utimesSync(join(b, 'state-3.json'), Date.now() / 1000 + 5, Date.now() / 1000 + 5);   // newest but corrupt
  writeFileSync(f, '{"truncated": ');
  let rec = null;
  const r = await readJson(f, { backupDirs: [b], onRecover: (x) => { rec = x; } });
  assert.deepEqual(r, { v: 'newest' });
  assert.match(rec.from, /state-2\.json$/);
  await assert.rejects(readJson(f), /not valid JSON/);
  // validate() can reject a parseable but wrong file
  writeFileSync(f, '{"custom": "not an array"}');
  const v = await readJson(f, { backupDirs: [b], validate: o => Array.isArray(o.custom) || o.v === 'newest' });
  assert.deepEqual(v, { v: 'newest' });
});

test('copyTree never overwrites unless asked, supports dry runs and skips', async () => {
  const src = join(dir, 'src'), dst = join(dir, 'dst');
  mkdirSync(join(src, 'sub', '__pycache__'), { recursive: true });
  writeFileSync(join(src, 'a.txt'), 'A');
  writeFileSync(join(src, 'sub', 'b.txt'), 'B');
  writeFileSync(join(src, 'sub', '__pycache__', 'x.pyc'), 'X');
  mkdirSync(dst); writeFileSync(join(dst, 'a.txt'), 'KEEP');
  const dry = await copyTree(src, dst, { dryRun: true, skip: r => /__pycache__/.test(r) });
  assert.ok(!existsSync(join(dst, 'sub')));
  assert.deepEqual(dry.existing, ['a.txt']);
  const r = await copyTree(src, dst, { skip: r2 => /__pycache__/.test(r2) });
  assert.equal(readFileSync(join(dst, 'a.txt'), 'utf8'), 'KEEP');
  assert.equal(readFileSync(join(dst, 'sub', 'b.txt'), 'utf8'), 'B');
  assert.ok(!existsSync(join(dst, 'sub', '__pycache__')));
  assert.equal(r.copied.length, 1);
});

test('isInside', () => {
  assert.ok(isInside('/a/b', '/a/b/c'));
  assert.ok(isInside('/a/b', '/a/b'));
  assert.ok(!isInside('/a/b', '/a/bc'));
  assert.ok(!isInside('/a/b', '/a'));
});
