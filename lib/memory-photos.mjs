// lib/memory-photos.mjs - garden photos kept in Memories, in <data>/memories/photos (2.32). Owner: Memories.
//
// A photo is taken by the page (a part of the garden drawn on a canvas, which drops any metadata) and sent as a data URL; the same checks as every picture
// the dashboard keeps run again here before anything is written (lib/people-images.mjs: the bytes must really be the type they say, within the size and
// pixel caps). The file name is built here (<yyyymmdd>-<sha256/16>.<ext>), never taken from a request, and every path stays inside the folder.
//
// index.json next to the pictures is the album: newest first, at most PHOTO_LIMITS.keep (the oldest go, with their files). A row holds ids and numbers only,
// never a name: who = the friend ids that were in the garden (the page reads the names from Friends when it shows them), at = whose garden it was ('' = yours).
// The pictures and this list stay on this computer: they are not part of the encrypted sync (a photo of a friend's garden is not for other devices to fetch).
//
//   createMemoryPhotos({paths, log})
//     .save({data, iso, ts, who, at, kind})   -> the row   (ImageError 400/413/415/422)
//     .list()                                 -> [row]
//     .read(name)                             -> {buf, mime} | null
//     .remove(id)                             -> true when there was one
//   PHOTO_LIMITS, PHOTO_NAME_RE

import { promises as fsp } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { atomicWrite, readJson, writeJson, withLock, isInside } from './fsutil.mjs';
import { imageInfo, decodeDataUrl, ImageError } from './people-images.mjs';

export const PHOTO_LIMITS = Object.freeze({ bytes: 900 * 1024, pixels: 3200, keep: 200, who: 8 });
export const PHOTO_NAME_RE = /^[0-9]{8}-[0-9a-f]{16}\.(jpg|png|webp)$/;
const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const EXT_MIME = Object.freeze({ jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' });

export function createMemoryPhotos({ paths, log = () => {} }) {
  const dir = join(paths.root, 'memories', 'photos'), indexFile = join(dir, 'index.json');
  const pathOf = (name) => {
    if (typeof name !== 'string' || !PHOTO_NAME_RE.test(name)) return null;
    const p = join(dir, name);
    return isInside(dir, p) && p !== dir ? p : null;
  };
  const rows = async () => { const j = await readJson(indexFile, { fallback: null }); return j && Array.isArray(j.items) ? j.items.filter(x => x && PHOTO_NAME_RE.test(String(x.name))) : []; };
  return {
    dir,
    async list() { return rows(); },
    async save(body) {
      const b = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
      const d = decodeDataUrl(b.data);
      if (d.buf.length > PHOTO_LIMITS.bytes) throw new ImageError(413, 'TOO_LARGE', 'That photo is too large.');
      const info = imageInfo(d.buf);
      if (!info || !EXT_MIME[info.ext]) throw new ImageError(415, 'NOT_AN_IMAGE', 'That is not a picture the dashboard can keep.');
      if (info.type !== d.type) throw new ImageError(422, 'TYPE_MISMATCH', 'The picture is not the type it says it is.');
      if (info.width > PHOTO_LIMITS.pixels || info.height > PHOTO_LIMITS.pixels) throw new ImageError(422, 'TOO_BIG', 'That photo is too big.');
      const iso = typeof b.iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.iso) ? b.iso : new Date().toISOString().slice(0, 10);   // clock-ok: only when the page sent no day
      const hash = createHash('sha256').update(d.buf).digest('hex').slice(0, 16);
      const name = `${iso.replace(/-/g, '')}-${hash}.${info.ext}`;
      const file = pathOf(name);
      if (!file) throw new ImageError(400, 'BAD_REQUEST', 'bad photo name');
      const who = [...new Set((Array.isArray(b.who) ? b.who : []).filter(x => typeof x === 'string' && ID_RE.test(x)))].slice(0, PHOTO_LIMITS.who);
      const row = {
        id: hash, name, iso, ts: Number.isFinite(b.ts) && b.ts > 0 ? Math.floor(b.ts) : Date.now(),   // clock-ok: only when the page sent no time
        kind: b.kind === 'group' ? 'group' : 'garden', at: typeof b.at === 'string' && ID_RE.test(b.at) ? b.at : '', who, w: info.width, h: info.height, bytes: d.buf.length,
      };
      await withLock(indexFile, async () => {
        await atomicWrite(file, d.buf, { encoding: null });
        const items = await rows();
        const have = items.findIndex(x => x.name === name);
        if (have >= 0) items.splice(have, 1);
        items.unshift(row);
        const drop = items.splice(PHOTO_LIMITS.keep);
        await writeJson(indexFile, { v: 1, items });
        for (const x of drop) { const f = pathOf(x.name); if (f) await fsp.unlink(f).catch(() => {}); }
      });
      log('note', `memory photo saved: ${d.buf.length} bytes`);
      return row;
    },
    async read(name) {
      const file = pathOf(name);
      if (!file) return null;
      let buf;
      try { buf = await fsp.readFile(file); } catch { return null; }
      const info = imageInfo(buf), ext = name.slice(name.lastIndexOf('.') + 1);
      if (!info || info.ext !== ext) return null;
      return { buf, mime: EXT_MIME[ext] };
    },
    async remove(id) {
      if (typeof id !== 'string' || !ID_RE.test(id)) return false;
      let gone = false;
      await withLock(indexFile, async () => {
        const items = await rows(), at = items.findIndex(x => x.id === id);
        if (at < 0) return;
        const [x] = items.splice(at, 1);
        await writeJson(indexFile, { v: 1, items });
        const f = pathOf(x.name); if (f) await fsp.unlink(f).catch(() => {});
        gone = true;
      });
      return gone;
    },
  };
}
