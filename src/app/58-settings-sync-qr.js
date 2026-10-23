/* ============================================================
   QR CODES FOR SETTINGS > SYNC (owner: Sync)
   A small QR encoder for the one-time "scan with your phone" offer
   (byte mode, error correction level M, versions 1-10: up to 213 bytes;
   the offer is about 80). Pure functions, no DOM until syncQrSvg:
     syncQrMatrix(text) -> {size, version, mask, rows: [[bool]]}  (true = dark)
     syncQrSvg(text, px) -> an <svg> element with a 4-module quiet zone
   The layout follows ISO/IEC 18004 as in Project Nayuki's reference
   encoder (finder, timing and alignment patterns, format and version
   bits, zig-zag placement, the 8 masks scored by the 4 penalty rules).
   ============================================================ */
const _QR_ECC_M = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];      // error-correction codewords per block
const _QR_BLOCKS_M = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];             // blocks

function _qrRawModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}
const _qrDataCodewords = (ver) => Math.floor(_qrRawModules(ver) / 8) - _QR_ECC_M[ver] * _QR_BLOCKS_M[ver];

function _qrMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
  return z;
}
function _qrDivisor(degree) {
  const r = [];
  for (let i = 0; i < degree - 1; i++) r.push(0);
  r.push(1);
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) { r[j] = _qrMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
    root = _qrMul(root, 0x02);
  }
  return r;
}
/** Reed-Solomon error-correction codewords of `data` (GF(256), polynomial 0x11D). */
function syncQrEcc(data, degree) {
  const div = _qrDivisor(degree);
  const r = div.map(() => 0);
  for (const b of data) {
    const f = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => { r[i] ^= _qrMul(c, f); });
  }
  return r;
}
function _qrInterleave(data, ver) {
  const nb = _QR_BLOCKS_M[ver], ecc = _QR_ECC_M[ver], raw = Math.floor(_qrRawModules(ver) / 8);
  const nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb);
  const blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const d = data.slice(k, k + shortLen - ecc + (i < nShort ? 0 : 1));
    k += d.length;
    const e = syncQrEcc(d, ecc);
    if (i < nShort) d.push(0);
    blocks.push(d.concat(e));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecc || j >= nShort) out.push(b[i]); });
  return out;
}
/** The 15 format bits for level M and a mask (the BCH code, XOR 0x5412). */
function syncQrFormatBits(mask) {
  const data = (0 << 3) | mask;          // level M = 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}
/** The 18 version bits (versions 7 and up). */
function syncQrVersionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (ver << 12) | rem;
}
function _qrAlignPos(ver, size) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const r = [6];
  for (let pos = size - 7; r.length < n; pos -= step) r.splice(1, 0, pos);
  return r;
}
const _qrBit = (x, i) => ((x >>> i) & 1) !== 0;
function _qrMaskHit(mask, x, y) {
  switch (mask) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}
function _qrPenalty(m, size) {
  let p = 0;
  const line = (get) => {
    for (let a = 0; a < size; a++) {
      let run = 1;
      for (let b = 1; b <= size; b++) {
        if (b < size && get(a, b) === get(a, b - 1)) run++;
        else { if (run >= 5) p += 3 + (run - 5); run = 1; }
      }
      // 1:1:3:1:1 with 4 light modules on a side
      for (let b = 0; b + 11 <= size; b++) {
        const s = Array.from({ length: 11 }, (_, k) => (get(a, b + k) ? 1 : 0)).join('');
        if (s === '10111010000' || s === '00001011101') p += 40;
      }
    }
  };
  line((y, x) => m[y][x]);
  line((x, y) => m[y][x]);
  let dark = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (m[y][x]) dark++;
    if (x + 1 < size && y + 1 < size) { const c = m[y][x]; if (m[y][x + 1] === c && m[y + 1][x] === c && m[y + 1][x + 1] === c) p += 3; }
  }
  const total = size * size;
  p += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;
  return p;
}

/** The QR symbol for `text` (UTF-8, byte mode, level M). Throws if it does not fit version 10. */
function syncQrMatrix(text) {
  const bytes = Array.from(new TextEncoder().encode(String(text)));
  let ver = 1;
  for (; ver <= 10; ver++) if (4 + (ver < 10 ? 8 : 16) + bytes.length * 8 <= _qrDataCodewords(ver) * 8) break;
  if (ver > 10) throw new Error('too long for a QR code here');
  const cap = _qrDataCodewords(ver) * 8;
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4); put(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  const words = _qrInterleave(data, ver);

  const size = ver * 4 + 17;
  const m = Array.from({ length: size }, () => Array(size).fill(false));
  const fn = Array.from({ length: size }, () => Array(size).fill(false));
  const set = (x, y, dark) => { m[y][x] = dark; fn[y][x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  }
  const al = _qrAlignPos(ver, size);
  for (let i = 0; i < al.length; i++) for (let j = 0; j < al.length; j++) {
    if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  const drawFormat = (mask) => {
    const b = syncQrFormatBits(mask);
    for (let i = 0; i <= 5; i++) set(8, i, _qrBit(b, i));
    set(8, 7, _qrBit(b, 6)); set(8, 8, _qrBit(b, 7)); set(7, 8, _qrBit(b, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, _qrBit(b, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, _qrBit(b, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, _qrBit(b, i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    const b = syncQrVersionBits(ver);
    for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, _qrBit(b, i)); set(c, a, _qrBit(b, i)); }
  }
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!fn[y][x] && i < words.length * 8) { m[y][x] = _qrBit(words[i >>> 3], 7 - (i & 7)); i++; }
      }
    }
  }
  const applyMask = (mask) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && _qrMaskHit(mask, x, y)) m[y][x] = !m[y][x]; };
  let best = 0, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    applyMask(mask); drawFormat(mask);
    const s = _qrPenalty(m, size);
    if (s < bestScore) { best = mask; bestScore = s; }
    applyMask(mask);
  }
  applyMask(best); drawFormat(best);
  return { size, version: ver, mask: best, rows: m };
}

/** An <svg> of the QR code, `px` pixels square, dark on white with a quiet zone. */
function syncQrSvg(text, px) {
  const q = syncQrMatrix(text), n = q.size + 8;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${n} ${n}`);
  svg.setAttribute('width', String(px || 220)); svg.setAttribute('height', String(px || 220));
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'QR code for adding a phone');
  const bg = document.createElementNS(ns, 'rect');
  bg.setAttribute('width', String(n)); bg.setAttribute('height', String(n)); bg.setAttribute('fill', '#fff');
  svg.appendChild(bg);
  let d = '';
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.rows[y][x]) d += `M${x + 4} ${y + 4}h1v1h-1z`;
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d); path.setAttribute('fill', '#000');
  svg.appendChild(path);
  return svg;
}
