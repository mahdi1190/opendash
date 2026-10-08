// Scene capture: a few seconds of a composed scene as an animated GIF (docs/dev/SCENE_ENGINE.md 10.4). Node >= 20, no dependencies.
//
//   pngDecode(buf)                          -> { width, height, data: RGBA Uint8Array }   8-bit RGB / RGBA, non-interlaced, all five filters
//   pngEncode(width, height, rgb)           -> Buffer   an 8-bit RGB PNG (filter 0): the debug frames (--frames)
//   quantise(rgb, max = 256)                -> Uint8Array palette (n x 3, n <= max)   median cut over RGB triples; deterministic
//   indexFrame(rgba, w, h, palette, o)      -> Uint8Array indices   the nearest palette colour per pixel (o.dither: ordered 4 x 4 Bayer; o.cache)
//   lzwEncode(indices, minCodeSize = 8)     -> Uint8Array   the GIF LZW code stream (before the 255-byte sub-blocks)
//   gifEncode({ width, height, palette, frames, loop = 0 }) -> Buffer   GIF89a, one global palette, NETSCAPE2.0 loop;
//                                              frame: { indices, x, y, w, h, delay (1/100 s), transparent (index or -1) }
//   gifFromPngs(pngs, { fps, dither, diff, onFrame }) -> { gif, frames, colours }   the whole pipeline over PNG buffers; diff (default on)
//                                              writes only the changed rectangle of each frame, unchanged pixels transparent
//   sceneCapture(chrome, pageOpts, { seconds, fps, dither, framesDir }) -> { gif, frames, colours, width, height }
//                                              loads the scene through the page harness, stops its clock and draws frame k at t = k / fps
//                                              itself (deterministic, independent of the machine's speed), one PNG per frame
import { inflateSync, deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenePageHtml } from './scene-page.mjs';

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Decode a PNG: 8-bit RGB (colour type 2) or RGBA (6), not interlaced. Returns RGBA. */
export function pngDecode(buf) {
  buf = Buffer.from(buf);
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('not a PNG');
  let off = 8, width = 0, height = 0, type = -1;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off), kind = buf.toString('latin1', off + 4, off + 8), body = buf.subarray(off + 8, off + 8 + len);
    if (kind === 'IHDR') {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4); type = body[9];
      if (body[8] !== 8 || (type !== 2 && type !== 6) || body[12] !== 0) throw new Error(`unsupported PNG: bit depth ${body[8]}, colour type ${type}, interlace ${body[12]} (8-bit RGB / RGBA, not interlaced)`);
    } else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    off += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, stride = width * bpp, raw = inflateSync(Buffer.concat(idat));
  if (raw.length < (stride + 1) * height) throw new Error('truncated PNG data');
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, row = y * stride, up = row - stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? px[row + i - bpp] : 0, b = y ? px[up + i] : 0, c = i >= bpp && y ? px[up + i - bpp] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      else if (f !== 0) throw new Error('bad PNG filter ' + f);
      px[row + i] = (raw[src + i] + p) & 255;
    }
  }
  if (bpp === 4) return { width, height, data: px };
  const data = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < px.length; i += 3, j += 4) { data[j] = px[i]; data[j + 1] = px[i + 1]; data[j + 2] = px[i + 2]; data[j + 3] = 255; }
  return { width, height, data };
}

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (kind, body) => { const h = Buffer.alloc(8), t = Buffer.alloc(4); h.writeUInt32BE(body.length); h.write(kind, 4, 'latin1'); t.writeUInt32BE(crc32(Buffer.concat([h.subarray(4), body]))); return Buffer.concat([h, body, t]); };
/** An 8-bit RGB PNG (filter 0 on every row). */
export function pngEncode(width, height, rgb) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/**
 * Median cut, variance-based: split the box with the largest squared error along its worst channel, at the cut that leaves the least
 * error, until there are `max` boxes (or none can split); each colour is its box's mean. A plain population median starves small
 * bright things (lit windows, a painted door) and bands the sky; the error-driven cut gives both their colours.
 * Then `refineSteps` k-means steps (default 3) pull each colour to the mean of the pixels nearest to it (a smoother sky, truer tints).
 * rgb: Uint8Array of triples. Deterministic (a stable counting sort; the k-means visits colours in sample order).
 */
export function quantise(rgb, max = 256, refineSteps = 3) {
  const n = Math.floor(rgb.length / 3);
  if (!n) return new Uint8Array(3);
  let order = new Uint32Array(n).map((_, i) => i);
  const tmp = new Uint32Array(n), counts = new Uint32Array(256);
  // a box's score is its weighted squared error (the same channel weights as the nearest-colour search), its axis the channel with most
  const measure = (lo, hi) => {
    const s = [0, 0, 0], q = [0, 0, 0], e = [0, 0, 0], k = hi - lo;
    for (let i = lo; i < hi; i++) for (let c = 0; c < 3; c++) { const v = rgb[order[i] * 3 + c]; s[c] += v; q[c] += v * v; }
    for (let c = 0; c < 3; c++) e[c] = W3[c] * (q[c] - (s[c] * s[c]) / k);
    const axis = e[1] >= e[0] && e[1] >= e[2] ? 1 : e[0] >= e[2] ? 0 : 2;
    return { lo, hi, axis, score: e[0] + e[1] + e[2] > 1e-9 ? e[0] + e[1] + e[2] : 0 };
  };
  const boxes = [measure(0, n)];
  while (boxes.length < max) {
    let bi = 0;
    for (let i = 1; i < boxes.length; i++) if (boxes[i].score > boxes[bi].score) bi = i;
    const b = boxes[bi];
    if (!b.score) break;
    counts.fill(0);
    for (let i = b.lo; i < b.hi; i++) counts[rgb[order[i] * 3 + b.axis]]++;
    // the cut along the axis that leaves the least squared error (the most between-side variance), then a stable counting sort
    let acc = 0, best = -1, nL = 0, sL = 0, sT = 0;
    const nT = b.hi - b.lo;
    for (let v = 0; v < 256; v++) sT += v * counts[v];
    for (let v = 0; v < 255; v++) {
      nL += counts[v]; sL += v * counts[v];
      if (!nL || nL === nT || !counts[v]) continue;
      const g = (sL * sL) / nL + ((sT - sL) * (sT - sL)) / (nT - nL);
      if (g > best) { best = g; acc = nL; }
    }
    for (let s = 0, k = 0; k < 256; k++) { const c = counts[k]; counts[k] = s; s += c; }
    for (let i = b.lo; i < b.hi; i++) { const o = order[i]; tmp[b.lo + counts[rgb[o * 3 + b.axis]]++] = o; }
    order.set(tmp.subarray(b.lo, b.hi), b.lo);
    const mid = b.lo + acc;
    if (mid <= b.lo || mid >= b.hi) { b.score = 0; continue; }
    boxes.splice(bi, 1, measure(b.lo, mid), measure(mid, b.hi));
  }
  const pal = new Uint8Array(boxes.length * 3);
  boxes.forEach((b, j) => {
    const s = [0, 0, 0];
    for (let i = b.lo; i < b.hi; i++) for (let c = 0; c < 3; c++) s[c] += rgb[order[i] * 3 + c];
    for (let c = 0; c < 3; c++) pal[j * 3 + c] = Math.round(s[c] / (b.hi - b.lo));
  });
  return refine(rgb, pal, refineSteps);
}
/** Lloyd (k-means) steps over the distinct sample colours: every colour moves to the mean of the samples nearest to it. */
function refine(rgb, pal, steps) {
  if (!steps) return pal;
  const seen = new Map();
  for (let i = 0; i < rgb.length; i += 3) { const key = (rgb[i] << 16) | (rgb[i + 1] << 8) | rgb[i + 2]; seen.set(key, (seen.get(key) || 0) + 1); }
  const n = pal.length / 3, sum = new Float64Array(n * 4);
  for (let step = 0; step < steps; step++) {
    sum.fill(0);
    for (const [key, cnt] of seen) {
      const r = key >> 16, g = (key >> 8) & 255, b = key & 255;
      let best = 0, bd = Infinity;
      for (let j = 0; j < n; j++) { const dr = r - pal[j * 3], dg = g - pal[j * 3 + 1], db = b - pal[j * 3 + 2], d = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (d < bd) { bd = d; best = j; } }
      sum[best * 4] += r * cnt; sum[best * 4 + 1] += g * cnt; sum[best * 4 + 2] += b * cnt; sum[best * 4 + 3] += cnt;
    }
    for (let j = 0; j < n; j++) if (sum[j * 4 + 3]) for (let c = 0; c < 3; c++) pal[j * 3 + c] = Math.round(sum[j * 4 + c] / sum[j * 4 + 3]);
  }
  return pal;
}

const W3 = [2, 4, 3];   // channel weights (r, g, b) of the colour distance
const BAYER =[0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => Math.round((v / 16 - 0.47) * 10));
/** The nearest palette index per pixel. o.cache: an Int16Array(1 << 24) filled with -1, shared across frames; o.dither: ordered dither. */
export function indexFrame(rgba, w, h, palette, o = {}) {
  const cache = o.cache || new Int16Array(1 << 24).fill(-1), n = palette.length / 3, out = new Uint8Array(w * h);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let y = 0, p = 0; y < h; y++) for (let x = 0; x < w; x++, p++) {
    let r = rgba[p * 4], g = rgba[p * 4 + 1], b = rgba[p * 4 + 2];
    if (o.dither) { const d = BAYER[(y & 3) * 4 + (x & 3)]; r = clamp(r + d); g = clamp(g + d); b = clamp(b + d); }
    const key = (r << 16) | (g << 8) | b;
    let best = cache[key];
    if (best < 0) {
      let bd = Infinity;
      for (let j = 0; j < n; j++) { const dr = r - palette[j * 3], dg = g - palette[j * 3 + 1], db = b - palette[j * 3 + 2], dd = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (dd < bd) { bd = dd; best = j; } }
      cache[key] = best;
    }
    out[p] = best;
  }
  return out;
}

/** GIF LZW: variable-width codes (minCodeSize + 1 .. 12 bits), LSB first, a clear code when the table is full. */
export function lzwEncode(indices, minCodeSize = 8) {
  const clear = 1 << minCodeSize, eoi = clear + 1, out = [];
  const stamp = new Uint16Array(1 << 20), val = new Uint16Array(1 << 20);
  let gen = 1, next = eoi + 1, size = minCodeSize + 1, acc = 0, bits = 0;
  const emit = (code) => { acc |= code << bits; bits += size; while (bits >= 8) { out.push(acc & 255); acc >>>= 8; bits -= 8; } };
  emit(clear);
  if (!indices.length) { emit(eoi); if (bits) out.push(acc & 255); return Uint8Array.from(out); }
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k;
    if (stamp[key] === gen) { prefix = val[key]; continue; }
    emit(prefix);
    if (next < 4096) {
      stamp[key] = gen; val[key] = next++;
      if (next > (1 << size) && size < 12) size++;
    } else {
      emit(clear); next = eoi + 1; size = minCodeSize + 1;
      if (++gen === 65536) { stamp.fill(0); gen = 1; }   // a new table: the old entries' stamps no longer match
    }
    prefix = k;
  }
  emit(prefix); emit(eoi);
  if (bits) out.push(acc & 255);
  return Uint8Array.from(out);
}

/** GIF89a with one global 256-colour table, looping (NETSCAPE2.0; loop 0 = for ever), one image per frame. */
export function gifEncode({ width, height, palette, frames, loop = 0 }) {
  const parts = [], u16 = (v) => [v & 255, (v >> 8) & 255];
  const table = new Uint8Array(768); table.set(palette.subarray(0, 768));
  parts.push(Buffer.from('GIF89a', 'latin1'), Buffer.from([...u16(width), ...u16(height), 0xf7, 0, 0]), Buffer.from(table));
  parts.push(Buffer.from([0x21, 0xff, 11, ...Buffer.from('NETSCAPE2.0', 'latin1'), 3, 1, ...u16(loop), 0]));
  for (const f of frames) {
    const x = f.x || 0, y = f.y || 0, w = f.w || width, h = f.h || height, tr = f.transparent != null && f.transparent >= 0;
    parts.push(Buffer.from([0x21, 0xf9, 4, (1 << 2) | (tr ? 1 : 0), ...u16(Math.max(0, Math.round(f.delay || 0))), tr ? f.transparent : 0, 0]));
    parts.push(Buffer.from([0x2c, ...u16(x), ...u16(y), ...u16(w), ...u16(h), 0, 8]));
    const data = lzwEncode(f.indices, 8);
    for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); parts.push(Buffer.from([n]), Buffer.from(data.subarray(i, i + n))); }
    parts.push(Buffer.from([0]));
  }
  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}

/**
 * The pipeline over PNG buffers (all the same size): a sample of every frame -> one palette -> per frame the indices,
 * then (diff) only the rectangle that changed, unchanged pixels transparent. Delays follow fps exactly on average (8, 8, 9 cs at 12 fps).
 * Memory: one decoded frame and two index buffers at a time (plus the 32 MB colour cache).
 */
export function gifFromPngs(pngs, { fps = 12, dither = false, diff = true, onFrame = null } = {}) {
  if (!pngs.length) throw new Error('no frames');
  const first = pngDecode(pngs[0]), W = first.width, H = first.height;
  const step = Math.max(1, Math.ceil((W * H * pngs.length) / 600000)), sample = [];
  pngs.forEach((png, k) => {
    const { width, height, data } = k ? pngDecode(png) : first;
    if (width !== W || height !== H) throw new Error(`frame ${k} is ${width} x ${height}, not ${W} x ${H}`);
    for (let p = (k * 7) % step; p < W * H; p += step) sample.push(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
  });
  const palette = quantise(Uint8Array.from(sample), diff ? 255 : 256), TR = diff ? 255 : -1;
  const cache = new Int16Array(1 << 24).fill(-1), frames = [];
  let prev = null;
  pngs.forEach((png, k) => {
    const cur = indexFrame(k ? pngDecode(png).data : first.data, W, H, palette, { dither, cache });
    const delay = Math.round(((k + 1) * 100) / fps) - Math.round((k * 100) / fps);
    if (onFrame) onFrame(k, cur, palette, W, H);
    if (!diff || !prev) { frames.push({ indices: cur, delay }); prev = cur; return; }
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0, p = 0; y < H; y++) for (let x = 0; x < W; x++, p++) if (cur[p] !== prev[p]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { frames.push({ indices: Uint8Array.of(TR), x: 0, y: 0, w: 1, h: 1, delay, transparent: TR }); return; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, sub = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y0 + y) * W + x0 + x; sub[y * w + x] = cur[p] === prev[p] ? TR : cur[p]; }
    frames.push({ indices: sub, x: x0, y: y0, w, h, delay, transparent: TR });
    prev = cur;
  });
  return { gif: gifEncode({ width: W, height: H, palette, frames }), frames: frames.length, colours: palette.length / 3 };
}

/**
 * Record a scene. pageOpts: the scene-page options (root, refs | data, size, at, location, season, mode, upgrades); the box size
 * is the GIF size. The page loads once; the host's own clock is stopped and every frame is drawn at t = k / fps.
 */
export async function sceneCapture(chrome, pageOpts, { seconds = 3, fps = 12, dither = false, diff = true, framesDir = null } = {}) {
  const size = pageOpts.size || { w: 640, h: 360 }, n = Math.max(1, Math.round(seconds * fps));
  if (chrome.emulateMedia) await chrome.emulateMedia([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await chrome.screenshot({ html: scenePageHtml(Object.assign({}, pageOpts, { size, still: false, renderer: 'canvas', dpr: 1 })), width: size.w, height: size.h, scale: 1, transparent: false });
  const ready = await chrome.evaluate('Promise.race([window.__sceneReady, new Promise(r => setTimeout(() => r("timeout"), 20000))])');
  if (ready !== true) throw new Error('scene page did not get ready: ' + ready + ' ' + JSON.stringify(await chrome.evaluate('window.__sceneErrors')));
  // the host's renderer (78-scene-host.js keeps them in _schHosts): stop its clock, the capture draws every frame itself
  const held = await chrome.evaluate(`(() => {
    const rec = typeof _schHosts !== 'undefined' ? [..._schHosts.values()].find(r => r.r) : null;
    if (!rec) return 'no canvas renderer on the page (the scene fell back to the SVG still): ' + JSON.stringify(window.__sceneErrors);
    rec.still = true; rec.r.stop(); window.__captureR = rec.r; return true; })()`);
  if (held !== true) throw new Error(String(held));
  const pngs = [];
  for (let k = 0; k < n; k++) {
    await chrome.evaluate(`window.__captureR.frame(${k / fps})`);
    pngs.push(await chrome.capture({ width: size.w, height: size.h }));
  }
  if (framesDir) mkdirSync(framesDir, { recursive: true });
  const onFrame = framesDir ? (k, idx, pal, W, H) => {
    const rgb = new Uint8Array(W * H * 3);
    for (let p = 0; p < W * H; p++) { const j = idx[p] * 3; rgb[p * 3] = pal[j]; rgb[p * 3 + 1] = pal[j + 1]; rgb[p * 3 + 2] = pal[j + 2]; }
    writeFileSync(join(framesDir, `frame-${String(k).padStart(3, '0')}.png`), pngEncode(W, H, rgb));
  } : null;
  const res = gifFromPngs(pngs, { fps, dither, diff, onFrame });
  return Object.assign(res, { width: size.w, height: size.h, fps, seconds: n / fps });
}
