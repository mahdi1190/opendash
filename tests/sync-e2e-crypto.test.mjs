// End-to-end encrypted sync, the primitives (lib/sync/e2e-crypto.mjs): AES-GCM
// round trips and tamper detection (a flipped byte, a record moved to another
// file, device or sequence number, the wrong key), base64url, device ids,
// key wraps, the pairing code, and the recovery code (format, check
// characters that find and name a typo, recreating the same key).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as X from '../lib/sync/e2e-crypto.mjs';

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'sync');

test('the encryption core is platform-agnostic (Web Crypto only, no node:, no Buffer)', () => {
  for (const f of ['e2e-crypto.mjs', 'e2e.mjs']) {
    const code = readFileSync(join(LIB, f), 'utf8').split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
    assert.doesNotMatch(code, /from\s+['"]node:|require\(|\bBuffer\b|\bprocess\.|__dirname/, `${f} must stay platform-agnostic`);
    for (const m of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) assert.ok(['./e2e-crypto.mjs'].includes(m[1]), `${f} imports ${m[1]}`);
  }
});

test('base64url round-trips every length and refuses anything an encoder would not write', () => {
  for (let n = 0; n < 70; n++) {
    const b = X.randomBytes(n);
    const s = X.b64u(b);
    assert.match(s, /^[A-Za-z0-9_-]*$/);
    assert.deepEqual([...X.unb64u(s)], [...b]);
    assert.equal(s, Buffer.from(b).toString('base64url'), 'same as the standard encoding');
  }
  assert.equal(X.unb64u('AB+/'), null, 'not the url alphabet');
  assert.equal(X.unb64u('A'), null, 'impossible length');
  assert.equal(X.unb64u('AB'), null, 'stray bits ("AB" leaves non-zero bits)');
  assert.deepEqual([...X.unb64u('AA')], [0]);
});

test('AES-256-GCM: round trip, a fresh nonce every time, and any change is caught', async () => {
  const raw = X.newSecretKey();
  const key = await X.aesKey(raw);
  const aad = X.recordAad({ kind: 'log', group: 'a'.repeat(16), dev: 'b'.repeat(16), file: 'ops-20261023.jsonl', seq: 7, kid: 'c'.repeat(16) });
  const msg = { h: '000001792771200000.00000.bbbbbbbbbbbbbbbb', w: [[['custom', 'u-1', 'title'], 'Write the report']] };
  const a = await X.sealJson(key, msg, aad);
  const b = await X.sealJson(key, msg, aad);
  assert.notEqual(a.iv, b.iv, 'a unique nonce per record');
  assert.notEqual(a.ct, b.ct);
  assert.deepEqual(await X.openJson(key, a, aad), msg);
  assert.ok(!a.ct.includes('Write') && !JSON.stringify(a).includes('report'), 'no plaintext in the record');

  // A flipped bit anywhere in the ciphertext, the tag or the nonce.
  const ct = X.unb64u(a.ct);
  for (const i of [0, 5, ct.length - 17, ct.length - 1]) {
    const t = Uint8Array.from(ct); t[i] ^= 1;
    assert.equal(await X.openJson(key, { iv: a.iv, ct: X.b64u(t) }, aad), null, `flipped byte ${i}`);
  }
  const iv = X.unb64u(a.iv); iv[3] ^= 0x80;
  assert.equal(await X.openJson(key, { iv: X.b64u(iv), ct: a.ct }, aad), null, 'flipped nonce');
  // Cut short, or garbage.
  assert.equal(await X.openJson(key, { iv: a.iv, ct: a.ct.slice(0, 20) }, aad), null);
  assert.equal(await X.openJson(key, { iv: 'x', ct: a.ct }, aad), null);
  // The same record presented as another file, device, sequence number, kind or key id.
  for (const other of [
    { file: 'ops-20261024.jsonl' }, { dev: 'd'.repeat(16) }, { seq: 8 }, { kind: 'snapshot' }, { kid: 'e'.repeat(16) }, { group: 'f'.repeat(16) },
  ]) {
    const aad2 = X.recordAad({ kind: 'log', group: 'a'.repeat(16), dev: 'b'.repeat(16), file: 'ops-20261023.jsonl', seq: 7, kid: 'c'.repeat(16), ...other });
    assert.equal(await X.openJson(key, a, aad2), null, `moved: ${JSON.stringify(other)}`);
  }
  // Another key.
  assert.equal(await X.openJson(await X.aesKey(X.newSecretKey()), a, aad), null, 'wrong key');
  await assert.rejects(() => X.aesKey(new Uint8Array(16)), /32 bytes/);
});

test('device ids are fingerprints of the identity key', async () => {
  const a = await X.newKeyPair(), b = await X.newKeyPair();
  const ia = await X.deviceIdOf(a.pub), ib = await X.deviceIdOf(b.pub);
  assert.match(ia, /^[0-9a-f]{16}$/);
  assert.notEqual(ia, ib);
  assert.equal(await X.deviceIdOf(a.pub), ia, 'stable');
  assert.equal(await X.deviceIdOf('nope'), null);
});

test('key wraps: between two devices only they can open, and the opener knows who sent it', async () => {
  const a = await X.newKeyPair(), b = await X.newKeyPair(), m = await X.newKeyPair();
  const label = 'opendash-wrap-v2|g|k|a|b';
  const w = await X.wrapBetween({ myPriv: a.priv, fromPub: a.pub, toPub: b.pub, label, value: { k: 'secret' } });
  assert.deepEqual(await X.unwrapBetween({ myPriv: b.priv, fromPub: a.pub, toPub: b.pub, label, enc: w }), { k: 'secret' });
  assert.equal(await X.unwrapBetween({ myPriv: m.priv, fromPub: a.pub, toPub: m.pub, label, enc: w }), null, 'a third key cannot open it');
  assert.equal(await X.unwrapBetween({ myPriv: b.priv, fromPub: m.pub, toPub: b.pub, label, enc: w }), null, 'it did not come from M');
  assert.equal(await X.unwrapBetween({ myPriv: b.priv, fromPub: a.pub, toPub: b.pub, label: label + 'x', enc: w }), null, 'another purpose');
  // A wrap M makes to B is opened only as "from M".
  const forged = await X.wrapBetween({ myPriv: m.priv, fromPub: m.pub, toPub: b.pub, label, value: { k: 'evil' } });
  assert.equal(await X.unwrapBetween({ myPriv: b.priv, fromPub: a.pub, toPub: b.pub, label, enc: forged }), null);
  // To a public key (the recovery key).
  const r = await X.wrapTo({ toPub: b.pub, label: 'rec', value: { k: 1 } });
  assert.deepEqual(await X.unwrapTo({ myPriv: b.priv, myPub: b.pub, label: 'rec', enc: r }), { k: 1 });
  assert.equal(await X.unwrapTo({ myPriv: m.priv, myPub: m.pub, label: 'rec', enc: r }), null);
  // A low-order public key is refused.
  await assert.rejects(() => X.dh(a.priv, X.b64u(new Uint8Array(32))));
});

test('the pairing code: 6 digits, the same on both sides, different if anything differs', async () => {
  const base = { sid: '0123456789abcdef', group: 'fedcba9876543210', commit: 'c', joinPub: 'p1', approvePub: 'p2', joinNonce: 'n1', approveNonce: 'n2' };
  const c = await X.pairCode(base);
  assert.match(c, /^\d{6}$/);
  assert.equal(await X.pairCode({ ...base }), c);
  for (const k of Object.keys(base)) assert.notEqual(await X.pairCode({ ...base, [k]: base[k] + '!' }), c, k);
  assert.equal(X.formatPairCode('482913'), '482 913');
  const commit = await X.pairCommitment({ sid: base.sid, pub: 'p1', name: 'Kitchen laptop', kind: 'computer', nonce: 'n1' });
  assert.notEqual(commit, await X.pairCommitment({ sid: base.sid, pub: 'p1', name: 'Kitchen laptop!', kind: 'computer', nonce: 'n1' }), 'the name is bound too');
});

test('recovery code: 8 groups of 4, check characters find and name a typo, the same code makes the same key', async () => {
  const seen = new Set();
  for (let i = 0; i < 50; i++) {
    const { code, entropy } = X.newRecoveryCode();
    assert.match(code, /^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/, code);
    assert.equal(entropy.length, 15);
    const p = X.parseRecoveryCode(code);
    assert.ok(p.ok);
    assert.deepEqual([...p.entropy], [...entropy]);
    seen.add(code);
  }
  assert.equal(seen.size, 50);
  const entropy = Uint8Array.from([7, 1, 200, 33, 90, 14, 250, 3, 128, 64, 77, 31, 0, 99, 180]);   // fixed: the checks below are exact
  const code = X.encodeRecoveryCode(entropy);
  // Typed loosely: lower case, spaces instead of dashes, O for 0, I or L for 1.
  const loose = code.toLowerCase().replace(/-/g, ' ').replace(/0/g, 'o').replace(/1/g, 'l');
  assert.deepEqual([...X.parseRecoveryCode(loose).entropy], [...entropy]);
  assert.deepEqual([...X.parseRecoveryCode(`  ${code.replace(/-/g, '')}  `).entropy], [...entropy]);
  // Every single wrong character in every position is caught, and its group named.
  const flat = code.replace(/-/g, '');
  let caught = 0, total = 0;
  for (let i = 0; i < flat.length; i++) {
    for (const ch of X.CODE_ALPHABET) {
      if (ch === flat[i]) continue;
      total++;
      const r = X.parseRecoveryCode(flat.slice(0, i) + ch + flat.slice(i + 1));
      if (!r.ok) { caught++; assert.deepEqual(r.groups, [Math.floor(i / 4) + 1]); assert.match(r.message, new RegExp(`group ${Math.floor(i / 4) + 1}`)); }
    }
  }
  assert.equal(caught, total, 'all single-character typos are found');
  // Two neighbours swapped inside a group: nearly always caught.
  let swaps = 0, swapCaught = 0;
  for (let i = 0; i < flat.length - 1; i++) {
    if (i % 4 === 3 || flat[i] === flat[i + 1]) continue;
    swaps++;
    const t = flat.slice(0, i) + flat[i + 1] + flat[i] + flat.slice(i + 2);
    if (!X.parseRecoveryCode(t).ok) swapCaught++;
  }
  assert.ok(swapCaught >= swaps - 2, `swaps caught ${swapCaught}/${swaps}`);
  // Two groups swapped (each group's check includes its position).
  const g = code.split('-');
  if (g[0] !== g[1]) assert.equal(X.parseRecoveryCode([g[1], g[0], ...g.slice(2)].join('-')).ok, false);
  assert.match(X.parseRecoveryCode('ABCD-EFGH').message, /32 letters and numbers/);
  assert.equal(X.parseRecoveryCode(code.slice(0, -1) + 'U').ok, false, 'U is not in the alphabet');
  // The same code makes the same key pair; another code another.
  const k1 = await X.recoveryKeyPair(entropy), k2 = await X.recoveryKeyPair(X.parseRecoveryCode(loose).entropy);
  assert.equal(k1.pub, k2.pub);
  assert.notEqual((await X.recoveryKeyPair(X.newRecoveryCode().entropy)).pub, k1.pub);
  const w = await X.wrapTo({ toPub: k1.pub, label: 'rec', value: { ok: 1 } });
  assert.deepEqual(await X.unwrapTo({ myPriv: k2.priv, myPub: k2.pub, label: 'rec', enc: w }), { ok: 1 }, 'a key recreated from the code opens what was wrapped to it');
});
