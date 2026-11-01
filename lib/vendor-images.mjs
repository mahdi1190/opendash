// lib/vendor-images.mjs - a person's own picture for a merchant, picked from their computer and kept in
// their data folder (<data>/finance/vendor-images). Owner: Finance symbols.
//
// Nothing is fetched and nothing leaves this computer: these files are not in the encrypted sync's file
// list (lib/sync/blobs.mjs BLOB_DIRS), and friends never get them. Treated like receipts and people's
// pictures: the page resizes and re-encodes in a canvas (which drops metadata), and this module checks again
// that the bytes really are a raster image of the right type, within the size and pixel caps. SVG is refused.
// The file name is built here from the hash, never taken from the request.
//
//   createVendorImages({root}) -> {list(), save({merchant, data}), remove(merchant), restore(merchant, ref), read(name)}
//   VI_NAME_RE, MAX_BODY

import { promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { atomicWrite, isInside } from './fsutil.mjs';
import { imageInfo, decodeDataUrl, ImageError } from './people-images.mjs';

export const VI_NAME_RE = /^vi-[0-9a-f]{16}\.(png|jpg|webp)$/;
const MAX_BYTES = 256 * 1024;
const MAX_PIXELS = 1024;
const MAX_ITEMS = 500;
export const MAX_BODY = Math.ceil(MAX_BYTES * 4 / 3) + 4096;
const MIME = Object.freeze({ png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' });
const keyOf = (s) => String(s == null ? '' : s).trim().toLowerCase().replace(/[\u0000-\u001f]/g, '').slice(0, 120);

export function createVendorImages({ root, log = () => {} }) {
  const dir = join(root, 'finance', 'vendor-images');
  const indexFile = join(dir, 'index.json');
  const pathOf = (name) => { if (typeof name !== 'string' || !VI_NAME_RE.test(name)) return null; const p = join(dir, name); return isInside(dir, p) && p !== dir ? p : null; };
  async function readIndex() {
    try { const j = JSON.parse(await fsp.readFile(indexFile, 'utf8')); return j && typeof j.items === 'object' && j.items ? j : { v: 1, items: {} }; } catch { return { v: 1, items: {} }; }
  }
  const writeIndex = async (j) => { await fsp.mkdir(dir, { recursive: true }); await atomicWrite(indexFile, JSON.stringify(j, null, 1)); };
  const urlOf = (name) => `/api/finance/vendor-image/${name}`;
  return {
    /** {merchant key: url} */
    async list() {
      const j = await readIndex();
      const out = {};
      for (const [k, v] of Object.entries(j.items)) if (v && pathOf(v.ref)) out[k] = urlOf(v.ref);
      return out;
    },
    async save({ merchant, data }) {
      const k = keyOf(merchant);
      if (!k) throw new ImageError(400, 'BAD_REQUEST', 'Which merchant is this picture for?');
      if (typeof data === 'string' && data.length > MAX_BODY) throw new ImageError(413, 'TOO_LARGE', 'That picture is too large.');
      const d = decodeDataUrl(data);
      if (d.buf.length > MAX_BYTES) throw new ImageError(413, 'TOO_LARGE', 'That picture is too large, even after resizing.');
      const info = imageInfo(d.buf);
      if (!info || !['png', 'jpeg', 'webp'].includes(info.type)) throw new ImageError(415, 'NOT_AN_IMAGE', 'Choose a PNG, JPEG or WebP picture.');
      if (info.type !== d.type) throw new ImageError(422, 'TYPE_MISMATCH', 'The picture is not the type it says it is.');
      if (info.width > MAX_PIXELS || info.height > MAX_PIXELS) throw new ImageError(422, 'TOO_BIG', 'That picture is too big.');
      const ref = `vi-${createHash('sha256').update(d.buf).digest('hex').slice(0, 16)}.${info.ext}`;
      const p = pathOf(ref);
      if (!p) throw new ImageError(400, 'BAD_REQUEST', 'That picture could not be saved.');
      await fsp.mkdir(dir, { recursive: true });
      await atomicWrite(p, d.buf);
      const j = await readIndex();
      const prev = j.items[k] ? j.items[k].ref : '';
      if (!j.items[k] && Object.keys(j.items).length >= MAX_ITEMS) throw new ImageError(422, 'TOO_MANY', 'There are too many pictures here; remove some first.');
      j.items[k] = { ref, at: new Date().toISOString() };
      await writeIndex(j);
      log('info', 'vendor image saved', { bytes: d.buf.length });
      return { ok: true, url: urlOf(ref), ref, prev, items: await this.list() };
    },
    /** The file stays, so Undo can bring it back. */
    async remove(merchant) {
      const k = keyOf(merchant);
      const j = await readIndex();
      const prev = j.items[k] ? j.items[k].ref : '';
      if (prev) { delete j.items[k]; await writeIndex(j); }
      return { ok: true, prev, items: await this.list() };
    },
    async restore(merchant, ref) {
      const k = keyOf(merchant), p = pathOf(ref);
      if (!k || !p) throw new ImageError(400, 'BAD_REQUEST', 'That picture is not here any more.');
      try { await fsp.access(p); } catch { throw new ImageError(404, 'NOT_FOUND', 'That picture is not here any more.'); }
      const j = await readIndex();
      j.items[k] = { ref, at: new Date().toISOString() };
      await writeIndex(j);
      return { ok: true, items: await this.list() };
    },
    async read(name) {
      const p = pathOf(name);
      if (!p) return null;
      try { return { buf: await fsp.readFile(p), mime: MIME[name.split('.').pop()] }; } catch { return null; }
    },
  };
}
