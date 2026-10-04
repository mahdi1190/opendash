// PNG and ICO helpers for the release tools (brand assets). Node built-ins only.
//
//   readChunks(buf)      -> [{ type, data }]          (throws on a bad signature or CRC)
//   pngInfo(buf)         -> { width, height, bitDepth, colorType, chunks: [types] }
//   stripPng(buf)        -> Buffer   keeps only IHDR, PLTE, tRNS, IDAT (merged,
//                                    recompressed at level 9) and IEND: no text,
//                                    time, colour-profile or EXIF metadata
//   decodePng(buf)       -> { width, height, data }   8-bit RGBA pixels (for tests)
//   encodeIco([{ size, png }]) -> Buffer   an .ico that embeds PNG images
//
// Only what Chrome's screenshots and the brand assets use is supported:
// 8-bit greyscale, RGB, grey+alpha and RGBA, not interlaced.
import { inflateSync, deflateSync, constants as Z } from 'node:zlib';

export const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
// Chunks a plain image needs. Everything else is metadata and is dropped.
export const KEEP_CHUNKS = new Set(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND']);

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function readChunks(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG file');
  const out = [];
  let off = 8;
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    if (off + 12 + len > buf.length) throw new Error(`truncated ${type} chunk`);
    const data = buf.subarray(off + 8, off + 8 + len);
    const crc = buf.readUInt32BE(off + 8 + len);
    if (crc32(buf.subarray(off + 4, off + 8 + len)) !== crc) throw new Error(`bad CRC in ${type} chunk`);
    out.push({ type, data });
    off += 12 + len;
    if (type === 'IEND') break;
  }
  if (!out.length || out[0].type !== 'IHDR' || out[out.length - 1].type !== 'IEND') throw new Error('PNG must start with IHDR and end with IEND');
  return out;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

export function writePng(chunks) {
  return Buffer.concat([PNG_SIGNATURE, ...chunks.map(c => chunk(c.type, c.data))]);
}

export function pngInfo(buf) {
  const chunks = readChunks(buf);
  const h = chunks[0].data;
  return {
    width: h.readUInt32BE(0), height: h.readUInt32BE(4),
    bitDepth: h[8], colorType: h[9], interlace: h[12],
    chunks: chunks.map(c => c.type),
  };
}

export function stripPng(buf) {
  const chunks = readChunks(buf);
  const idat = Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data));
  // Same filtered scanlines, smaller stream: recompress with the best setting.
  const raw = inflateSync(idat);
  const packed = deflateSync(raw, { level: 9, memLevel: 9, strategy: Z.Z_DEFAULT_STRATEGY });
  const keep = [];
  for (const c of chunks) {
    if (!KEEP_CHUNKS.has(c.type) || c.type === 'IDAT') continue;
    if (c.type === 'IEND') keep.push({ type: 'IDAT', data: packed.length < idat.length ? packed : idat });
    keep.push(c);
  }
  return writePng(keep);
}

const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

export function decodePng(buf) {
  const chunks = readChunks(buf);
  const { width, height, bitDepth, colorType, interlace } = pngInfo(buf);
  const ch = CHANNELS[colorType];
  if (bitDepth !== 8 || !ch || interlace) throw new Error(`unsupported PNG (depth ${bitDepth}, colour type ${colorType}, interlace ${interlace})`);
  const raw = inflateSync(Buffer.concat(chunks.filter(c => c.type === 'IDAT').map(c => c.data)));
  const stride = width * ch;
  const px = Buffer.alloc(stride * height);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = px.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? cur[i - ch] : 0, b = prev[i], c = i >= ch ? prev[i - ch] : 0;
      let v = line[i];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (f !== 0) throw new Error(`bad filter ${f}`);
      cur[i] = v & 0xff;
    }
    prev = cur;
  }
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += ch) {
    const o = i * 4;
    if (ch === 1) { data[o] = data[o + 1] = data[o + 2] = px[j]; data[o + 3] = 255; }
    else if (ch === 2) { data[o] = data[o + 1] = data[o + 2] = px[j]; data[o + 3] = px[j + 1]; }
    else if (ch === 3) { data[o] = px[j]; data[o + 1] = px[j + 1]; data[o + 2] = px[j + 2]; data[o + 3] = 255; }
    else { data[o] = px[j]; data[o + 1] = px[j + 1]; data[o + 2] = px[j + 2]; data[o + 3] = px[j + 3]; }
  }
  return { width, height, data };
}

// An .ico whose entries are PNG images (supported by every current browser and
// by Windows Vista onwards). Entries are sorted small to large.
export function encodeIco(images) {
  const list = [...images].sort((a, b) => a.size - b.size);
  const head = Buffer.alloc(6 + 16 * list.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(list.length, 4);
  let off = head.length;
  list.forEach((img, i) => {
    const e = 6 + 16 * i;
    head[e] = img.size >= 256 ? 0 : img.size;
    head[e + 1] = img.size >= 256 ? 0 : img.size;
    head[e + 2] = 0; head[e + 3] = 0;
    head.writeUInt16LE(1, e + 4); head.writeUInt16LE(32, e + 6);
    head.writeUInt32LE(img.png.length, e + 8); head.writeUInt32LE(off, e + 12);
    off += img.png.length;
  });
  return Buffer.concat([head, ...list.map(i => i.png)]);
}

export function readIco(buf) {
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error('not an ICO file');
  const n = buf.readUInt16LE(4);
  const out = [];
  for (let i = 0; i < n; i++) {
    const e = 6 + 16 * i;
    const len = buf.readUInt32LE(e + 8), off = buf.readUInt32LE(e + 12);
    out.push({ size: buf[e] || 256, png: buf.subarray(off, off + len) });
  }
  return out;
}
