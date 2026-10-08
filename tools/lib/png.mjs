// A minimal PNG decoder and encoder (Node >= 20, node:zlib only; no npm dependencies).
// Used by the raster object tools (tools/lib/raster-image.mjs, object import / import-sheet; docs/dev/OBJECT_IMPORT.md).
//
//   pngDecode(buf)                -> { width, height, data: Uint8Array RGBA8 (width * height * 4) }
//       every PNG the spec allows: grey, grey + alpha, RGB, RGBA and palette images; bit depths 1, 2, 4, 8 and 16 (16-bit
//       samples are reduced to 8); tRNS transparency (grey, RGB and palette); Adam7 interlacing. Ancillary chunks (text, EXIF,
//       ICC, gamma) are ignored, so a re-encoded image carries no metadata.
//   pngEncode({ width, height, data }, { level = 9 })  -> Buffer
//       8-bit RGBA, or 8-bit RGB when every pixel is opaque (smaller); per-row adaptive filters (the minimum sum of absolute
//       differences heuristic); no ancillary chunks at all (no text, time or EXIF: nothing personal can ride along).
//   pngInfo(buf)                  -> { width, height, bitDepth, colorType, interlace, hasAlpha } from the IHDR alone (cheap)
//   isPng(buf), isWebp(buf), webpSize(buf) -> { width, height } | null
import { inflateSync, deflateSync } from 'node:zlib';

export const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
export const isPng = (buf) => !!buf && buf.length > 8 && Buffer.from(buf.subarray(0, 8)).equals(PNG_SIG);
export const isWebp = (buf) => !!buf && buf.length > 16 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP';

/* ---------- CRC-32 (the PNG chunk checksum) ---------- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(buf, start = 0, end = buf.length) {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** The chunks of a PNG: [{ type, data }] (checks the signature and every CRC). */
function chunks(buf) {
  if (!isPng(buf)) throw new Error('not a PNG file (bad signature)');
  const out = [];
  let p = 8;
  while (p + 12 <= buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8);
    if (p + 12 + len > buf.length) throw new Error(`PNG chunk ${type} runs past the end of the file`);
    const crc = buf.readUInt32BE(p + 8 + len);
    if (crc32(buf, p + 4, p + 8 + len) !== crc) throw new Error(`PNG chunk ${type}: bad CRC (the file is damaged)`);
    out.push({ type, data: buf.subarray(p + 8, p + 8 + len) });
    p += 12 + len;
    if (type === 'IEND') break;
  }
  return out;
}

export function pngInfo(buf) {
  if (!isPng(buf) || buf.length < 33) throw new Error('not a PNG file');
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20), bitDepth = buf[24], colorType = buf[25], interlace = buf[28];
  let hasAlpha = colorType === 4 || colorType === 6;
  if (!hasAlpha) { try { hasAlpha = chunks(buf).some(c => c.type === 'tRNS'); } catch { /* reported by the decoder */ } }
  return { width, height, bitDepth, colorType, interlace, hasAlpha };
}

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };

/** Undo the per-row filters of one (sub)image in place: rows of `stride` bytes, each led by its filter byte. Returns the raw rows. */
function unfilter(src, off, rows, stride, bpp) {
  const out = new Uint8Array(rows * stride);
  let p = off;
  for (let y = 0; y < rows; y++) {
    const f = src[p++], o = y * stride, u = o - stride;
    if (p + stride > src.length) throw new Error('PNG image data is shorter than the image');
    for (let x = 0; x < stride; x++) {
      const raw = src[p + x], a = x >= bpp ? out[o + x - bpp] : 0, b = y ? out[u + x] : 0, c = y && x >= bpp ? out[u + x - bpp] : 0;
      let v;
      switch (f) {
        case 0: v = raw; break;
        case 1: v = raw + a; break;
        case 2: v = raw + b; break;
        case 3: v = raw + ((a + b) >> 1); break;
        case 4: v = raw + paeth(a, b, c); break;
        default: throw new Error(`PNG row filter ${f} is not valid`);
      }
      out[o + x] = v & 255;
    }
    p += stride;
  }
  return { rows: out, next: p };
}

/** Expand raw rows of one (sub)image into RGBA8 pixels at (x0 + i * dx, y0 + j * dy) of the output. */
function expand(raw, w, h, hdr, pal, trns, outData, W, x0, y0, dx, dy) {
  const { bitDepth: bd, colorType: ct } = hdr, ch = CHANNELS[ct], stride = Math.ceil(w * ch * bd / 8);
  const max = (1 << bd) - 1;
  const sample = (row, i) => {   // the i-th sample of a row, as an integer of `bd` bits
    if (bd === 8) return raw[row + i];
    if (bd === 16) return (raw[row + 2 * i] << 8) | raw[row + 2 * i + 1];
    const bit = i * bd, byte = raw[row + (bit >> 3)], shift = 8 - bd - (bit & 7);
    return (byte >> shift) & max;
  };
  const to8 = (v) => (bd === 16 ? v >> 8 : bd === 8 ? v : Math.round(v * 255 / max));
  for (let j = 0; j < h; j++) {
    const row = j * stride;
    for (let i = 0; i < w; i++) {
      const o = ((y0 + j * dy) * W + (x0 + i * dx)) * 4;
      let r, g, b, a = 255;
      if (ct === 0) { const v = sample(row, i); r = g = b = to8(v); if (trns && trns.grey === v) a = 0; }
      else if (ct === 2) { const R = sample(row, 3 * i), G = sample(row, 3 * i + 1), B = sample(row, 3 * i + 2); r = to8(R); g = to8(G); b = to8(B); if (trns && trns.rgb && trns.rgb[0] === R && trns.rgb[1] === G && trns.rgb[2] === B) a = 0; }
      else if (ct === 3) { const k = sample(row, i); if (!pal || 3 * k + 2 >= pal.length) throw new Error('PNG palette index out of range'); r = pal[3 * k]; g = pal[3 * k + 1]; b = pal[3 * k + 2]; a = trns && trns.alpha && k < trns.alpha.length ? trns.alpha[k] : 255; }
      else if (ct === 4) { r = g = b = to8(sample(row, 2 * i)); a = to8(sample(row, 2 * i + 1)); }
      else { r = to8(sample(row, 4 * i)); g = to8(sample(row, 4 * i + 1)); b = to8(sample(row, 4 * i + 2)); a = to8(sample(row, 4 * i + 3)); }
      outData[o] = r; outData[o + 1] = g; outData[o + 2] = b; outData[o + 3] = a;
    }
  }
}

const ADAM7 = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];

export function pngDecode(buf) {
  buf = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  const list = chunks(buf);
  const ih = list.find(c => c.type === 'IHDR');
  if (!ih || list[0] !== ih) throw new Error('PNG without an IHDR chunk first');
  const hdr = { width: ih.data.readUInt32BE(0), height: ih.data.readUInt32BE(4), bitDepth: ih.data[8], colorType: ih.data[9], compression: ih.data[10], filter: ih.data[11], interlace: ih.data[12] };
  const { width: W, height: H, bitDepth: bd, colorType: ct } = hdr;
  if (!CHANNELS[ct]) throw new Error(`PNG colour type ${ct} is not valid`);
  const okDepth = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] }[ct];
  if (!okDepth.includes(bd)) throw new Error(`PNG bit depth ${bd} is not valid for colour type ${ct}`);
  if (hdr.compression !== 0 || hdr.filter !== 0 || hdr.interlace > 1) throw new Error('PNG with an unknown compression, filter or interlace method');
  if (!W || !H || W > 16384 || H > 16384) throw new Error(`PNG size ${W} x ${H} is out of range (1 to 16384 per side)`);
  const plte = list.find(c => c.type === 'PLTE'), tr = list.find(c => c.type === 'tRNS');
  if (ct === 3 && !plte) throw new Error('palette PNG without a PLTE chunk');
  let trns = null;
  if (tr) {
    if (ct === 0) trns = { grey: tr.data.readUInt16BE(0) };
    else if (ct === 2) trns = { rgb: [tr.data.readUInt16BE(0), tr.data.readUInt16BE(2), tr.data.readUInt16BE(4)] };
    else if (ct === 3) trns = { alpha: tr.data };
  }
  const idat = Buffer.concat(list.filter(c => c.type === 'IDAT').map(c => c.data));
  if (!idat.length) throw new Error('PNG without image data');
  let raw;
  try { raw = inflateSync(idat); } catch (e) { throw new Error('PNG image data does not inflate: ' + e.message); }
  const ch = CHANNELS[ct], bpp = Math.max(1, Math.ceil(ch * bd / 8)), data = new Uint8Array(W * H * 4);
  const pal = plte ? plte.data : null;
  if (!hdr.interlace) {
    const stride = Math.ceil(W * ch * bd / 8);
    const { rows } = unfilter(raw, 0, H, stride, bpp);
    expand(rows, W, H, hdr, pal, trns, data, W, 0, 0, 1, 1);
  } else {
    let off = 0;
    for (const [x0, y0, dx, dy] of ADAM7) {
      const w = Math.ceil((W - x0) / dx), h = Math.ceil((H - y0) / dy);
      if (w <= 0 || h <= 0) continue;
      const stride = Math.ceil(w * ch * bd / 8);
      const { rows, next } = unfilter(raw, off, h, stride, bpp);
      off = next;
      expand(rows, w, h, hdr, pal, trns, data, W, x0, y0, dx, dy);
    }
  }
  return { width: W, height: H, data };
}

/* ---------- the encoder ---------- */
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  Buffer.from(data.buffer, data.byteOffset, data.length).copy(out, 8);
  out.writeUInt32BE(crc32(out, 4, 8 + data.length), 8 + data.length);
  return out;
}
export function pngEncode(img, { level = 9 } = {}) {
  const { width: W, height: H, data } = img;
  if (!(W > 0 && H > 0) || !data || data.length !== W * H * 4) throw new Error('pngEncode needs { width, height, data: RGBA8 of width * height * 4 bytes }');
  let opaque = true;
  for (let i = 3; i < data.length; i += 4) if (data[i] !== 255) { opaque = false; break; }
  const ch = opaque ? 3 : 4, stride = W * ch, bpp = ch;
  const rows = new Uint8Array(H * stride);
  for (let i = 0, j = 0; i < data.length; i += 4) { rows[j++] = data[i]; rows[j++] = data[i + 1]; rows[j++] = data[i + 2]; if (!opaque) rows[j++] = data[i + 3]; }
  const out = new Uint8Array(H * (stride + 1)), cand = [0, 1, 2, 3, 4].map(() => new Uint8Array(stride));
  for (let y = 0; y < H; y++) {
    const o = y * stride, u = o - stride;
    let best = 0, bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const c = cand[f];
      let sum = 0;
      for (let x = 0; x < stride; x++) {
        const v = rows[o + x], a = x >= bpp ? rows[o + x - bpp] : 0, b = y ? rows[u + x] : 0, cc = y && x >= bpp ? rows[u + x - bpp] : 0;
        const r = (f === 0 ? v : f === 1 ? v - a : f === 2 ? v - b : f === 3 ? v - ((a + b) >> 1) : v - paeth(a, b, cc)) & 255;
        c[x] = r; sum += r < 128 ? r : 256 - r;
        if (sum >= bestSum) break;
      }
      if (sum < bestSum) { bestSum = sum; best = f; }
    }
    // the chosen filter's row may have stopped early in the loop above: compute it fully
    const c = cand[best];
    for (let x = 0; x < stride; x++) {
      const v = rows[o + x], a = x >= bpp ? rows[o + x - bpp] : 0, b = y ? rows[u + x] : 0, cc = y && x >= bpp ? rows[u + x - bpp] : 0;
      c[x] = (best === 0 ? v : best === 1 ? v - a : best === 2 ? v - b : best === 3 ? v - ((a + b) >> 1) : v - paeth(a, b, cc)) & 255;
    }
    out[y * (stride + 1)] = best;
    out.set(c, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = opaque ? 2 : 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(out, { level })), chunk('IEND', Buffer.alloc(0))]);
}

/** The pixel size of a WebP (VP8, VP8L or VP8X), or null. WebP is passed through unprocessed (no decoder here). */
export function webpSize(buf) {
  if (!isWebp(buf)) return null;
  const kind = buf.toString('latin1', 12, 16);
  if (kind === 'VP8X') return { width: 1 + buf.readUIntLE(24, 3), height: 1 + buf.readUIntLE(27, 3) };
  if (kind === 'VP8L') { const b = buf.readUInt32LE(21); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
  if (kind === 'VP8 ') return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  return null;
}
