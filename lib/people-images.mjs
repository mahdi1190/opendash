// lib/people-images.mjs - profile and cover pictures for People, stored in
// the data folder (<data>/people/images). Owner: People.
//
// The page resizes and re-encodes a picture in a canvas (which drops EXIF and
// any other metadata) and sends it as a data URL; this module checks it again
// before anything is written:
//   - only PNG, JPEG, WebP or GIF, and the bytes must really be that type
//     (magic numbers; the declared type must match);
//   - a size cap (avatar 400 KB, cover 1.2 MB, decoded) and a pixel cap
//     (at most 4096 x 4096, read from the image header);
//   - the person must exist in the state; the file name is built here
//     (<person-slug>-<avatar|cover>-<sha256/16>.<ext>), never taken from the
//     request, and every path is checked to stay inside the folder.
// Names, rules and the built-in covers come from ONE place, the page's pure
// src/app/54-people-card-logic.js (evaluated here like lib/people-tags.mjs).
//
//   imageInfo(buf)                  {type:'png'|'jpeg'|'webp'|'gif', ext, mime, width, height} | null
//   decodeDataUrl(s)                {mime, buf} | throws ImageError
//   checkImage({kind, data})        {buf, info} | throws ImageError (400/413/415/422)
//   createPeopleImages({paths, readState, log})
//     .save({person, kind, data})   -> {ok, ref:'file:<name>', url, name, bytes, width, height}
//     .read(name)                   -> {buf, mime} | null (unknown or unsafe name)
//     .dir                          the folder
//   COVER_PRESETS, IMG_NAME_RE, refKind(ref)   (from the page's logic file)

import { readFileSync, promises as fsp } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { atomicWrite, isInside } from './fsutil.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
export const SOURCE_FILE = join(APP, '54-people-card-logic.js');
// eslint-disable-next-line no-new-func
const api = new Function(`"use strict";\n${readFileSync(SOURCE_FILE, 'utf8')}\nreturn { PC_IMG_NAME_RE, PC_COVERS, pcRefKind, pcPhotoUrl, pcCoverLook, pcMailCandidates, pcAssignPairs, pcOpenMode };`)();
export const { pcPhotoUrl, pcCoverLook, pcMailCandidates, pcAssignPairs, pcOpenMode } = api;
export const IMG_NAME_RE = api.PC_IMG_NAME_RE;
export const COVER_PRESETS = Object.freeze(api.PC_COVERS.map(c => c.id));
export const refKind = api.pcRefKind;

export const LIMITS = Object.freeze({ avatar: 400 * 1024, cover: 1200 * 1024, pixels: 4096 });
// base64 of the largest picture plus the JSON around it.
export const MAX_BODY = Math.ceil(LIMITS.cover * 4 / 3) + 4096;
const TYPES = Object.freeze({
  png: { ext: 'png', mime: 'image/png' },
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  webp: { ext: 'webp', mime: 'image/webp' },
  gif: { ext: 'gif', mime: 'image/gif' },
});
const MIME_TO_TYPE = Object.freeze({ 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/jpg': 'jpeg', 'image/webp': 'webp', 'image/gif': 'gif' });
const EXT_MIME = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' });
const KEEP_PER_SLOT = 4;   // older pictures of the same person and kind stay a while (Undo can bring them back)

export class ImageError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
  toJSON() { return { ok: false, code: this.code, error: this.message }; }
}

/** What the bytes are (magic numbers) and how big (from the header). */
export function imageInfo(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 16) return null;
  const at = (i, s) => buf.slice(i, i + s.length).toString('latin1') === s;
  const out = (type, width, height) => (width > 0 && height > 0 ? { type, ...TYPES[type], width, height } : null);
  if (buf[0] === 0x89 && at(1, 'PNG\r\n\x1a\n')) {
    if (buf.length < 24 || !at(12, 'IHDR')) return null;
    return out('png', buf.readUInt32BE(16), buf.readUInt32BE(20));
  }
  if (at(0, 'GIF87a') || at(0, 'GIF89a')) return out('gif', buf.readUInt16LE(6), buf.readUInt16LE(8));
  if (at(0, 'RIFF') && at(8, 'WEBP')) {
    if (buf.length < 30) return null;
    if (at(12, 'VP8 ')) return out('webp', buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff);
    if (at(12, 'VP8L')) { const b = buf.readUInt32LE(21); return out('webp', (b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1); }
    if (at(12, 'VP8X')) return out('webp', 1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3));
    return null;
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    // Walk the segments to the first start-of-frame marker.
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const m = buf[i + 1];
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      const len = buf.readUInt16BE(i + 2);
      if (len < 2) return null;
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return out('jpeg', buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5));
      i += 2 + len;
    }
    return null;
  }
  return null;
}

export function decodeDataUrl(s) {
  if (typeof s !== 'string') throw new ImageError(400, 'BAD_REQUEST', 'data must be an image data URL');
  const m = /^data:(image\/[a-z]+);base64,([A-Za-z0-9+/]+={0,2})$/.exec(s);
  if (!m) throw new ImageError(415, 'NOT_AN_IMAGE', 'Only PNG, JPEG, WebP or GIF pictures can be used.');
  const type = MIME_TO_TYPE[m[1]];
  if (!type) throw new ImageError(415, 'NOT_AN_IMAGE', 'Only PNG, JPEG, WebP or GIF pictures can be used.');
  return { mime: m[1], type, buf: Buffer.from(m[2], 'base64') };
}

export function checkImage({ kind, data }) {
  if (kind !== 'avatar' && kind !== 'cover') throw new ImageError(400, 'BAD_REQUEST', "kind must be 'avatar' or 'cover'");
  if (typeof data === 'string' && data.length > MAX_BODY) throw new ImageError(413, 'TOO_LARGE', 'That picture is too large.');
  const d = decodeDataUrl(data);
  if (d.buf.length > LIMITS[kind]) throw new ImageError(413, 'TOO_LARGE', `That picture is too large (at most ${Math.round(LIMITS[kind] / 1024)} KB after resizing).`);
  const info = imageInfo(d.buf);
  if (!info) throw new ImageError(415, 'NOT_AN_IMAGE', 'That file is not a picture the dashboard can use.');
  if (info.type !== d.type) throw new ImageError(422, 'TYPE_MISMATCH', 'The picture is not the type it says it is.');
  if (info.width > LIMITS.pixels || info.height > LIMITS.pixels) throw new ImageError(422, 'TOO_BIG', `That picture is too big (at most ${LIMITS.pixels} x ${LIMITS.pixels} pixels).`);
  return { buf: d.buf, info };
}

/** A file-name-safe slug of a person id ('' when nothing is left). */
export function personSlug(id) {
  return String(id || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
}

export function createPeopleImages({ paths, readState, log = () => {} }) {
  const dir = join(paths.root, 'people', 'images');
  const pathOf = (name) => {
    if (typeof name !== 'string' || !IMG_NAME_RE.test(name)) return null;
    const p = join(dir, name);
    return isInside(dir, p) && p !== dir ? p : null;
  };
  async function prune(prefix, keep) {
    let list = [];
    try { list = await fsp.readdir(dir); } catch { return; }
    const mine = [];
    for (const f of list) {
      if (!f.startsWith(prefix) || !IMG_NAME_RE.test(f) || f === keep) continue;
      try { mine.push({ f, t: (await fsp.stat(join(dir, f))).mtimeMs }); } catch { /* gone */ }
    }
    mine.sort((a, b) => b.t - a.t);
    for (const x of mine.slice(KEEP_PER_SLOT - 1)) await fsp.unlink(join(dir, x.f)).catch(() => {});
  }
  return {
    dir,
    async save(body) {
      const b = body && typeof body === 'object' ? body : {};
      const pid = typeof b.person === 'string' ? b.person.trim() : '';
      if (!pid || pid.length > 100) throw new ImageError(400, 'BAD_REQUEST', 'person is required');
      const { buf, info } = checkImage({ kind: b.kind, data: b.data });
      const st = await readState();
      const who = (Array.isArray(st && st.people) ? st.people : []).find(p => p && p.id === pid);
      if (!who) throw new ImageError(404, 'UNKNOWN_PERSON', 'There is nobody with that id in People.');
      const slug = personSlug(pid) || 'person';
      const hash = createHash('sha256').update(buf).digest('hex').slice(0, 16);
      const name = `${slug}-${b.kind}-${hash}.${info.ext}`;
      const file = pathOf(name);
      if (!file) throw new ImageError(400, 'BAD_REQUEST', 'bad picture name');
      await atomicWrite(file, buf, { encoding: null });
      await prune(`${slug}-${b.kind}-`, name);
      log('note', `people image saved: ${b.kind}, ${buf.length} bytes`);
      return { ok: true, ref: 'file:' + name, name, url: '/api/people/image/' + name, bytes: buf.length, width: info.width, height: info.height };
    },
    async read(name) {
      const file = pathOf(name);
      if (!file) return null;
      let buf;
      try { buf = await fsp.readFile(file); } catch { return null; }
      const info = imageInfo(buf);
      const ext = name.slice(name.lastIndexOf('.') + 1);
      if (!info || info.ext !== ext) return null;
      return { buf, mime: EXT_MIME[ext] };
    },
  };
}
