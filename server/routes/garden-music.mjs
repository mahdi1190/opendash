// server/routes/garden-music.mjs - the garden's songs (assets/music/, played by src/app/94-garden-0sound.js).
//
//   GET /api/garden-music              -> {tracks: [{file, slot, season, db, dur}]}: what is in the folder now (a file dropped in
//                                         shows on the next visit, no rebuild), with each one's level trim from levels.json
//   GET /api/garden-music/<file>       -> the file, streamed; Range requests get 206 (the page plays it through a media element)
//
// Read-only and narrow: only names like <slot>[-<season>]-<n>.mp3 (docs/dev/GARDEN_MUSIC.md) in that one folder are reachable,
// nothing else of the repo or the data folder. Same protections as every /api/ read (Host, same origin). Cached for an hour.
import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../assets/music', import.meta.url)));
export const MUSIC_NAME = /^(dawn|morning|afternoon|evening|night|late)(?:-(spring|summer|autumn|winter))?-(\d{1,3})\.(mp3|ogg|m4a)$/;
const MIME = { mp3: 'audio/mpeg', ogg: 'audio/ogg', m4a: 'audio/mp4' };
const MAX_BYTES = 40 * 1024 * 1024;

/* An MP3's exact length in seconds, by walking its frames (every player reads the same files, so every garden gets the same
   number and the songs line up on the shared timeline in 94-garden-0sound.js). null for other formats or a file it cannot read. */
const BR1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320], BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
export function mp3Seconds(b) {
  let p = 0;
  while (b.length > p + 10 && b.toString('latin1', p, p + 3) === 'ID3') p += 10 + (((b[p + 6] & 127) << 21) | ((b[p + 7] & 127) << 14) | ((b[p + 8] & 127) << 7) | (b[p + 9] & 127)) + ((b[p + 5] & 16) ? 10 : 0);
  let secs = 0, frames = 0, miss = 0;
  while (p + 4 <= b.length) {
    const h1 = b[p + 1], ver = (h1 >> 3) & 3, layer = (h1 >> 1) & 3, h2 = b[p + 2];
    const bi = h2 >> 4, si = (h2 >> 2) & 3, pad = (h2 >> 1) & 1;
    if (b[p] !== 0xff || (h1 & 0xe0) !== 0xe0 || ver === 1 || layer !== 1 || bi === 0 || bi === 15 || si === 3) { p++; if (++miss > 65536) break; continue; }
    const sr = SR[ver][si], br = (ver === 3 ? BR1 : BR2)[bi] * 1000, len = Math.floor((ver === 3 ? 144 : 72) * br / sr) + pad;
    if (len < 24) { p++; continue; }
    secs += (ver === 3 ? 1152 : 576) / sr; frames++; p += len; miss = 0;
  }
  return frames > 100 ? Math.round(secs * 1000) / 1000 : null;
}
const _durs = new Map();   // file -> {key: size|mtime, dur}
async function durOf(root, file) {
  if (!file.endsWith('.mp3')) return null;
  try {
    const full = join(root, file), st = await stat(full), key = st.size + '|' + st.mtimeMs, hit = _durs.get(full);
    if (hit && hit.key === key) return hit.dur;
    const dur = st.size > MAX_BYTES ? null : mp3Seconds(await readFile(full));
    _durs.set(full, { key, dur }); return dur;
  } catch { return null; }
}

/** The songs in the folder: [{file, slot, season, n, db, dur}] (db: the trim from levels.json, null when it has none: the page uses its default;
    dur: the length in seconds, null when it cannot be read: the page then shuffles on its own instead of following the shared timeline). */
export async function musicList(root = ROOT) {
  let names = [];
  try { names = await readdir(root); } catch { return []; }
  let levels = {};
  try { const j = JSON.parse(await readFile(join(root, 'levels.json'), 'utf8')); if (j && typeof j === 'object') levels = j.tracks || j; } catch { /* none yet */ }
  const out = [];
  for (const file of names.sort()) {
    const m = MUSIC_NAME.exec(file); if (!m) continue;
    const db = Number(levels[file] && typeof levels[file] === 'object' ? levels[file].db : levels[file]);
    out.push({ file, slot: m[1], season: m[2] || '', n: Number(m[3]), db: Number.isFinite(db) ? Math.max(-30, Math.min(12, db)) : null, dur: await durOf(root, file) });
  }
  return out;
}

export default function register(app) {
  app.route({
    path: '/api/garden-music', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => { c.send(200, JSON.stringify({ tracks: await musicList() }), 'application/json; charset=utf-8', { 'Cache-Control': 'private, no-cache' }); return undefined; },
  });
  app.route({
    prefix: '/api/garden-music/', method: 'GET', methodError: 'GET only', quiet: true,
    handler: async (c) => {
      const file = c.path.slice('/api/garden-music/'.length), m = MUSIC_NAME.exec(file);
      if (!m) return c.json(404, { error: 'not found' });
      const full = join(ROOT, file);
      let st;
      try { st = await stat(full); } catch { return c.json(404, { error: 'not found' }); }
      if (!st.isFile() || st.size < 64 || st.size > MAX_BYTES) return c.json(404, { error: 'not found' });
      const size = st.size, head = { 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': 'inline' };
      const r = /^bytes=(\d*)-(\d*)$/.exec(String(c.req.headers.range || '').trim());
      if (r && (r[1] || r[2])) {
        let a = r[1] ? Number(r[1]) : size - Number(r[2]), b = r[1] && r[2] ? Number(r[2]) : size - 1;
        a = Math.max(0, a); b = Math.min(size - 1, b);
        if (!(a <= b) || a >= size) return c.send(416, '', 'text/plain; charset=utf-8', { 'Content-Range': `bytes */${size}` });
        c.send(206, createReadStream(full, { start: a, end: b }), MIME[m[4]], { ...head, 'Content-Range': `bytes ${a}-${b}/${size}`, 'Content-Length': String(b - a + 1) });
        return undefined;
      }
      c.send(200, createReadStream(full), MIME[m[4]], { ...head, 'Content-Length': String(size) });
      return undefined;
    },
  });
}
