// Settings > Sync with encryption (src/app/58-settings-sync.js and
// 58-settings-sync-qr.js), loaded into a VM (nothing renders): which screen
// shows, the pairing texts, the devices list, the recovery code layout, the
// status line; and the QR encoder against published vectors (Reed-Solomon
// for "HELLO WORLD" 1-M, the format and version bit tables), plus reading a
// whole symbol back with a decoder written from the standard's tables.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const box = { registerSettingsGroup: () => {}, state: { view: 'home' }, TextEncoder };
vm.createContext(box);
vm.runInContext(readFileSync(join(APP, '58-settings-sync-qr.js'), 'utf8') + '\n' + readFileSync(join(APP, '58-settings-sync.js'), 'utf8'), box);
const now = Date.UTC(2026, 9, 23, 12, 0, 0);
const plain = (v) => JSON.parse(JSON.stringify(v));

test('which screen: the first question, setting up, joining, removed, ready, and unencrypted sync', () => {
  const S = box.syncScreen;
  assert.equal(S({ enabled: false, e2e: { available: true, on: false } }, null), 'start');
  assert.equal(S({ enabled: false, e2e: { available: true } }, 'first'), 'first');
  assert.equal(S({ enabled: false, e2e: { available: true } }, 'join'), 'join');
  assert.equal(S({ enabled: true, e2e: { available: true, on: false } }), 'plain');
  assert.equal(S({ enabled: true, state: 'locked', e2e: { on: true, ready: false, reason: 'not-joined' } }), 'joining');
  assert.equal(S({ enabled: true, state: 'locked', e2e: { on: true, ready: false, reason: 'removed' } }), 'removed');
  assert.equal(S({ enabled: true, state: 'ok', e2e: { on: true, ready: true } }), 'ready');
  assert.equal(S({ enabled: true, state: 'locked', e2e: { on: true, ready: true } }), 'locked', "ready, but records with a key it does not have: asks for the code");
  assert.equal(S(null), 'loading');
});

test('pairing texts are plain and the code is shown in two groups of three', () => {
  const v = plain(box.syncPairView({ role: 'join', step: 'compare', code: '482913', sid: 'x' }));
  assert.equal(v.code, '482 913');
  assert.match(v.text, /exactly the same/);
  assert.deepEqual(v.actions.map(a => a[1]), ['Yes, they match', "No, they're different"]);
  const a = plain(box.syncPairView({ role: 'approve', step: 'compare', code: '000042', name: 'Kitchen laptop' }));
  assert.equal(a.code, '000 042');
  assert.match(a.text, /Does "Kitchen laptop" show exactly these 6 numbers\?/);
  assert.match(a.text, /someone else may be trying to get in/);
  assert.match(box.syncPairView({ role: 'join', step: 'waiting' }).text, /Settings > Sync/);
  assert.match(box.syncPairView({ role: 'join', step: 'declined' }).text, /nothing was shared/);
  assert.match(box.syncPairView({ role: 'approve', step: 'failed' }).text, /recovery code/);
  for (const step of ['waiting', 'compare', 'confirmed', 'done', 'declined', 'cancelled', 'expired', 'failed']) {
    for (const role of ['join', 'approve']) {
      const t = box.syncPairView({ role, step, code: '123456', name: 'X' });
      assert.ok(t.title && t.text, `${role}/${step}`);
      assert.doesNotMatch(t.text, /nonce|commit|ECDH|key wrap|undefined/i, 'no jargon');
    }
  }
  assert.equal(box.syncPairView(null), null);
});

test('the devices list, the recovery code layout and the status line', () => {
  const me = plain(box.syncDeviceSummary({ name: 'Work laptop', kind: 'computer', me: true, fetches: ['Home mail', 'Bank'] }, now));
  assert.deepEqual(me, { name: 'Work laptop', detail: 'Computer · This computer · main computer for Home mail, Bank' });
  assert.equal(box.syncDeviceSummary({ name: 'Phone', kind: 'phone', lastSeen: now - 120000 }, now).detail, 'Phone · last seen 2 min ago');
  assert.deepEqual(plain(box.syncCodeLines('AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH')), ['AAAA-BBBB-CCCC-DDDD', 'EEEE-FFFF-GGGG-HHHH']);
  const L = (st) => plain(box.syncStatusLine(st, now));
  assert.deepEqual(L({ enabled: true, state: 'locked', message: "This computer can't read the synced data: enter your recovery code." }), { tone: 'warn', text: "This computer can't read the synced data: enter your recovery code." });
  assert.equal(L({ enabled: true, state: 'waiting', message: 'Waiting for OneDrive to finish uploading: Work laptop has not received this computer\'s latest changes yet.' }).tone, 'warn');
  assert.equal(L({ enabled: true, state: 'ok', lastSyncAt: now, message: 'Up to date.' }).text, 'Synced just now');
  assert.equal(L({ enabled: true, state: 'ok', lastSyncAt: now, message: 'Up to date. 2 changes in OneDrive did not come from your devices (changed or added by something else) and were ignored.' }).tone, 'warn');
  assert.equal(box.syncKindLabel('phone'), 'Phone');
  assert.equal(box.syncKindLabel(undefined), 'Computer');
});

// ─── QR ──────────────────────────────────────────────────────────────────
test('QR: Reed-Solomon, format bits and version bits match the published tables', () => {
  // "HELLO WORLD" as 1-M (Thonky's QR tutorial): 16 data codewords -> 10 error-correction codewords.
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(plain(box.syncQrEcc(data, 10)), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  // Format information, level M, masks 0 and 1 (ISO/IEC 18004 table C.1).
  assert.equal(box.syncQrFormatBits(0).toString(2).padStart(15, '0'), '101010000010010');
  assert.equal(box.syncQrFormatBits(1).toString(2).padStart(15, '0'), '101000100100101');
  // Version information (table D.1).
  assert.equal(box.syncQrVersionBits(7).toString(2).padStart(18, '0'), '000111110010010100');
  assert.equal(box.syncQrVersionBits(8).toString(2).padStart(18, '0'), '001000010110111100');
});

// A decoder from the standard's own tables (not the encoder's code): function
// areas, format bits, unmasking, zig-zag reading, de-interleaving, RS check, byte mode.
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };
const BLOCKS_M = { 1: [[1, 26, 16]], 2: [[1, 44, 28]], 3: [[1, 70, 44]], 4: [[2, 50, 32]], 5: [[2, 67, 43]], 6: [[4, 43, 27]], 7: [[4, 49, 31]], 8: [[2, 60, 38], [2, 61, 39]], 9: [[3, 58, 36], [2, 59, 37]], 10: [[4, 69, 43], [1, 70, 44]] };
function decode(q) {
  const n = q.size, ver = (n - 17) / 4, M = q.rows;
  const fn = Array.from({ length: n }, () => Array(n).fill(false));
  const mark = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < n && y < n) fn[y][x] = true; };
  mark(0, 0, 9, 9); mark(n - 8, 0, 8, 9); mark(0, n - 8, 9, 8);
  mark(6, 0, 1, n); mark(0, 6, n, 1);
  const al = ALIGN[ver];
  for (const ay of al) for (const ax of al) {
    if ((ax === 6 && ay === 6) || (ax === 6 && ay === al[al.length - 1]) || (ax === al[al.length - 1] && ay === 6)) continue;
    mark(ax - 2, ay - 2, 5, 5);
  }
  if (ver >= 7) { mark(n - 11, 0, 3, 6); mark(0, n - 11, 6, 3); }
  // Format bits, first copy: (row 8, cols 0-5, 7, 8), (rows 7, 5..0 of col 8).
  const fmtPos = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];   // [x, y], bit 0 first
  let fmt = 0;
  fmtPos.forEach(([x, y], i) => { if (M[y][x]) fmt |= 1 << i; });
  fmt ^= 0x5412;
  assert.equal(fmt >>> 13, 0, 'error correction level M');
  const mask = (fmt >>> 10) & 7;
  assert.equal(mask, q.mask);
  // The second copy agrees.
  let fmt2 = 0;
  for (let i = 0; i < 8; i++) if (M[8][n - 1 - i]) fmt2 |= 1 << i;
  for (let i = 8; i < 15; i++) if (M[n - 15 + i][8]) fmt2 |= 1 << i;
  assert.equal(fmt2 ^ 0x5412, fmt);
  assert.equal(M[n - 8][8], true, 'the dark module');
  const masks = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0, (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0, (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0];
  const bits = [];
  let upward = true;
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let k = 0; k < n; k++) {
      const y = upward ? n - 1 - k : k;
      for (const x of [col, col - 1]) if (!fn[y][x]) bits.push(M[y][x] !== masks[mask](x, y) ? 1 : 0);
    }
    upward = !upward;
  }
  const words = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) words.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  // De-interleave.
  const blocks = [];
  for (const [count, total, dataLen] of BLOCKS_M[ver]) for (let c = 0; c < count; c++) blocks.push({ total, dataLen, d: [], e: [] });
  let w = 0;
  const maxData = Math.max(...blocks.map(b => b.dataLen));
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.dataLen) b.d.push(words[w++]);
  const ecLen = blocks[0].total - blocks[0].dataLen;
  for (let i = 0; i < ecLen; i++) for (const b of blocks) b.e.push(words[w++]);
  for (const b of blocks) assert.deepEqual(plain(box.syncQrEcc(b.d, ecLen)), b.e, 'every block passes its Reed-Solomon check');
  const data = blocks.flatMap(b => b.d);
  const dbits = data.flatMap(x => Array.from({ length: 8 }, (_, i) => (x >>> (7 - i)) & 1));
  const read = (at, len) => dbits.slice(at, at + len).reduce((a, b) => (a << 1) | b, 0);
  assert.equal(read(0, 4), 4, 'byte mode');
  const cl = ver < 10 ? 8 : 16, len = read(4, cl);
  const out = [];
  for (let i = 0; i < len; i++) out.push(read(4 + cl + i * 8, 8));
  return new TextDecoder().decode(Uint8Array.from(out));
}

test('QR: the offer and longer texts read back exactly (versions 1 to 10, one and several blocks)', () => {
  const offer = 'opendash-join:1:0123456789abcdef:fedcba9876543210:a1b2c3d4:AbCdEfGhIjKlMnOpQrStUv';
  const q = box.syncQrMatrix(offer);
  assert.equal(q.version, 5);
  assert.equal(decode(q), offer);
  const seen = new Set();
  for (const len of [1, 10, 14, 20, 40, 62, 84, 100, 110, 120, 130, 150, 180, 213]) {
    const t = Array.from({ length: len }, (_, i) => String.fromCharCode(33 + ((i * 7 + len) % 90))).join('');
    const m = box.syncQrMatrix(t);
    seen.add(m.version);
    assert.equal(decode(m), t, `length ${len} (version ${m.version})`);
  }
  for (const v of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) assert.ok(seen.has(v), `version ${v} covered`);
  assert.throws(() => box.syncQrMatrix('x'.repeat(214)), /too long/);
});
