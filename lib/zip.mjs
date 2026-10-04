// lib/zip.mjs - a minimal ZIP writer and reader (Node stdlib only: zlib).
//
//   createZip([{ name, data: Buffer|string, mtime?, mode? }], { level }) -> Buffer
//   readZip(buffer, { maxTotal, maxEntries }) -> [{ name, data: Buffer, mtime }]
//   safeEntryName(name) -> normalised 'a/b/c' or null if unsafe
//
// Plain PKZIP 2.0: deflate (or store for tiny/incompressible files), UTF-8
// names (flag bit 11), no zip64 (the dashboard's files are far below 4 GB),
// no encryption. Readable by Windows Explorer / Expand-Archive, macOS
// Archive Utility, unzip and 7-Zip. The reader refuses absolute paths, drive
// letters, '..' segments and zip bombs (size and entry limits enforced while
// inflating), and checks every CRC.

import { deflateRawSync, inflateRawSync } from 'node:zlib';

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

function dosTime(d) {
  const y = Math.max(1980, d.getFullYear());
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}
function fromDos(date, time) {
  const y = ((date >> 9) & 0x7f) + 1980, mo = ((date >> 5) & 0x0f) - 1, d = date & 0x1f;
  return new Date(y, mo, d || 1, (time >> 11) & 0x1f, (time >> 5) & 0x3f, (time & 0x1f) * 2);
}

/** 'a/b.txt' style name, or null when the name could escape the target folder. */
export function safeEntryName(name) {
  const n = String(name || '').replace(/\\/g, '/');
  if (!n || n.length > 400 || n.includes('\0')) return null;
  if (n.startsWith('/') || /^[a-zA-Z]:/.test(n)) return null;
  const parts = n.split('/');
  if (parts.some(p => p === '..')) return null;
  const clean = parts.filter(p => p && p !== '.');
  if (!clean.length) return null;
  if (clean.some(p => /[<>:"|?*\u0000-\u001f]/.test(p))) return null;   // not valid on Windows
  return clean.join('/') + (n.endsWith('/') ? '/' : '');
}

export function createZip(files, { level = 6 } = {}) {
  if (files.length > 65000) throw new Error('too many files for a zip without zip64');
  const chunks = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = safeEntryName(f.name);
    if (!name || name.endsWith('/')) throw new Error(`bad zip entry name: ${String(f.name).slice(0, 80)}`);
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(String(f.data ?? ''), 'utf8');
    const crc = crc32(data);
    let method = 0, body = data;
    if (data.length > 64) {
      const def = deflateRawSync(data, { level });
      if (def.length < data.length) { method = 8; body = def; }
    }
    if (body.length >= 0xffffffff || data.length >= 0xffffffff) throw new Error('file too large for a zip without zip64');
    const nameBuf = Buffer.from(name, 'utf8');
    const { time, date } = dosTime(f.mtime instanceof Date ? f.mtime : new Date());
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(method, 8); local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26); local.writeUInt16LE(0, 28);
    chunks.push(local, nameBuf, body);
    const cd = Buffer.alloc(46);
    // f.mode (e.g. 0o755 for a shell script): written as Unix permissions so unzip keeps it executable
    const unix = Number.isInteger(f.mode);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(unix ? 0x0314 : 20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(method, 10); cd.writeUInt16LE(time, 12); cd.writeUInt16LE(date, 14);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(body.length, 20); cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34); cd.writeUInt16LE(0, 36); cd.writeUInt32LE(unix ? (((0o100000 | (f.mode & 0o7777)) << 16) >>> 0) : 0, 38); cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += local.length + nameBuf.length + body.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, cdBuf, end]);
}

export function readZip(buf, { maxTotal = 1024 * 1024 * 1024, maxEntries = 50000 } = {}) {
  if (!Buffer.isBuffer(buf) || buf.length < 22) throw new Error('not a zip file');
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file (no end record)');
  const count = buf.readUInt16LE(eocd + 10);
  const cdSize = buf.readUInt32LE(eocd + 12);
  let p = buf.readUInt32LE(eocd + 16);
  if (count > maxEntries) throw new Error('the zip has too many files');
  if (p + cdSize > buf.length) throw new Error('the zip is damaged (central directory)');
  const out = [];
  let total = 0;
  for (let k = 0; k < count; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('the zip is damaged (entry header)');
    const flags = buf.readUInt16LE(p + 8), method = buf.readUInt16LE(p + 10);
    const time = buf.readUInt16LE(p + 12), date = buf.readUInt16LE(p + 14);
    const crc = buf.readUInt32LE(p + 16), csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28), xlen = buf.readUInt16LE(p + 30), clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const rawName = buf.subarray(p + 46, p + 46 + nlen).toString(flags & 0x0800 ? 'utf8' : 'latin1');
    p += 46 + nlen + xlen + clen;
    if (flags & 0x1) throw new Error('encrypted zips are not supported');
    const name = safeEntryName(rawName);
    if (!name) throw new Error(`unsafe path in the zip: ${rawName.slice(0, 80)}`);
    if (name.endsWith('/')) continue;                      // folders are implied
    if (buf.readUInt32LE(lho) !== 0x04034b50) throw new Error('the zip is damaged (local header)');
    const start = lho + 30 + buf.readUInt16LE(lho + 26) + buf.readUInt16LE(lho + 28);
    const body = buf.subarray(start, start + csize);
    total += usize;
    if (total > maxTotal) throw new Error('the zip is too large once unpacked');
    let data;
    if (method === 0) data = Buffer.from(body);
    else if (method === 8) data = inflateRawSync(body, { maxOutputLength: Math.max(usize, 1) });
    else throw new Error(`unsupported compression in the zip (method ${method})`);
    if (data.length !== usize || crc32(data) !== crc) throw new Error(`the zip is damaged (checksum of ${name.slice(0, 80)})`);
    out.push({ name, data, mtime: fromDos(date, time) });
  }
  return out;
}
