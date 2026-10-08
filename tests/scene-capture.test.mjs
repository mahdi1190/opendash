// Scene capture (tools/lib/scene-capture.mjs; docs/dev/SCENE_ENGINE.md 10.4): the PNG decoder, the median-cut quantiser, the
// GIF89a / LZW writer in Node, and a short capture of the test scene in headless Chrome (skipped when no browser is found).
// The GIF reader and LZW decoder below are the test's own, written from the GIF89a specification, so the writer is checked
// against an independent implementation.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pngDecode, pngEncode, quantise, indexFrame, lzwEncode, gifEncode, gifFromPngs, sceneCapture } from '../tools/lib/scene-capture.mjs';
import { findBrowser } from '../tools/lib/anim-render.mjs';
import { launchChrome } from '../tools/release-chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- test helpers: a PNG writer with a chosen filter, a GIF reader, an LZW decoder ---------- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (kind, body) => { const h = Buffer.alloc(8), t = Buffer.alloc(4); h.writeUInt32BE(body.length); h.write(kind, 4, 'latin1'); t.writeUInt32BE(crc32(Buffer.concat([h.subarray(4), body]))); return Buffer.concat([h, body, t]); };
/** A PNG of `px` (bpp 3 or 4 bytes per pixel) with every row filtered by `filter` (0 none, 1 sub, 2 up, 3 average, 4 Paeth). */
function makePng(w, h, px, bpp, filter) {
  const stride = w * bpp, raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = filter;
    for (let i = 0; i < stride; i++) {
      const x = px[y * stride + i], a = i >= bpp ? px[y * stride + i - bpp] : 0, b = y ? px[(y - 1) * stride + i] : 0, c = i >= bpp && y ? px[(y - 1) * stride + i - bpp] : 0;
      const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
      const pred = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      raw[y * (stride + 1) + 1 + i] = (x - pred) & 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = bpp === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const rand = (seed) => () => ((seed = Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
const pixels = (n, seed) => { const r = rand(seed); return Uint8Array.from({ length: n }, (_, i) => (i % 7 < 3 ? Math.floor(r() * 256) : (i * 13) & 255)); };

/** GIF LZW decoder (independent of the writer: an array-of-strings table). */
function lzwDecode(data, min) {
  const clear = 1 << min, eoi = clear + 1, out = [];
  let size, dict, prev, pos = 0;
  const reset = () => { dict = Array.from({ length: clear + 2 }, (_, i) => (i < clear ? [i] : null)); size = min + 1; prev = null; };
  const read = () => { let v = 0; for (let i = 0; i < size; i++, pos++) { if ((pos >> 3) >= data.length) return eoi; v |= ((data[pos >> 3] >> (pos & 7)) & 1) << i; } return v; };
  reset();
  for (;;) {
    const code = read();
    if (code === clear) { reset(); continue; }
    if (code === eoi) break;
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (code === dict.length && prev) entry = prev.concat(prev[0]);
    else throw new Error('bad LZW code ' + code + ' at bit ' + pos);
    for (const v of entry) out.push(v);
    if (prev && dict.length < 4096) dict.push(prev.concat(entry[0]));
    prev = entry;
    if (dict.length === (1 << size) && size < 12) size++;
  }
  return Uint8Array.from(out);
}
/** Read a GIF: the screen, the loop extension, every image (rect, delay, transparent index, indices) and the composited frames. */
function readGif(buf) {
  assert.equal(buf.toString('latin1', 0, 6), 'GIF89a');
  const W = buf.readUInt16LE(6), H = buf.readUInt16LE(8), packed = buf[10];
  assert.ok(packed & 0x80, 'a global colour table');
  let off = 13 + 3 * (1 << ((packed & 7) + 1)), loop = null, gce = null;
  const images = [], composed = [];
  let canvas = new Uint8Array(W * H);
  const blocks = () => { const parts = []; for (;;) { const n = buf[off++]; if (!n) break; parts.push(buf.subarray(off, off + n)); off += n; } return Buffer.concat(parts); };
  for (;;) {
    const b = buf[off++];
    if (b === 0x3b) break;
    if (b === 0x21) {
      const label = buf[off++];
      const body = blocks();
      if (label === 0xff && body.toString('latin1', 0, 11) === 'NETSCAPE2.0') loop = body[11] === 1 ? body.readUInt16LE(12) : null;
      if (label === 0xf9) gce = { delay: body.readUInt16LE(1), transparent: body[0] & 1 ? body[3] : -1, disposal: (body[0] >> 2) & 7 };
      continue;
    }
    assert.equal(b, 0x2c, 'an image descriptor at ' + (off - 1));
    const x = buf.readUInt16LE(off), y = buf.readUInt16LE(off + 2), w = buf.readUInt16LE(off + 4), h = buf.readUInt16LE(off + 6); off += 9;
    const min = buf[off++], indices = lzwDecode(blocks(), min);
    assert.equal(indices.length, w * h, 'the image has w x h pixels');
    images.push(Object.assign({ x, y, w, h, indices }, gce || {}));
    canvas = canvas.slice();
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const v = indices[j * w + i]; if (!gce || v !== gce.transparent) canvas[(y + j) * W + x + i] = v; }
    composed.push(canvas);
    gce = null;
  }
  return { W, H, loop, images, composed };
}

/* ---------- the PNG decoder ---------- */
test('pngDecode: RGB and RGBA PNGs made with node:zlib, every one of the five filter types, decode to the exact pixels', () => {
  const w = 13, h = 9;
  // noise, and values from {0, 5, 10, 20, 30}: there the Paeth distances often tie (e.g. left 20, up 5, up-left 10),
  // so its tie order (left, then up, then up-left) is checked too
  const r = rand(17), ties = (n) => Uint8Array.from({ length: n }, () => [0, 5, 10, 20, 30][Math.floor(r() * 5)]);
  for (const [bpp, px] of [[3, pixels(w * h * 3, 8)], [4, pixels(w * h * 4, 9)], [3, ties(w * h * 3)], [4, ties(w * h * 4)]]) {
    for (let f = 0; f <= 4; f++) {
      const d = pngDecode(makePng(w, h, px, bpp, f));
      assert.equal(d.width, w); assert.equal(d.height, h);
      for (let p = 0; p < w * h; p++) {
        for (let c = 0; c < 3; c++) assert.equal(d.data[p * 4 + c], px[p * bpp + c], `bpp ${bpp} filter ${f} pixel ${p} channel ${c}`);
        assert.equal(d.data[p * 4 + 3], bpp === 4 ? px[p * 4 + 3] : 255);
      }
    }
  }
  // the writer's own PNG (the --frames debug output) reads back too
  const rgb = pixels(w * h * 3, 9), back = pngDecode(pngEncode(w, h, rgb));
  for (let p = 0; p < w * h; p++) assert.deepEqual([...back.data.subarray(p * 4, p * 4 + 3)], [...rgb.subarray(p * 3, p * 3 + 3)]);
  assert.throws(() => pngDecode(Buffer.from('not a png')), /not a PNG/);
});

/* ---------- the quantiser ---------- */
test('quantise: at most 256 colours, deterministic, exact when there are few colours; indexFrame maps to the nearest', () => {
  const n = 64 * 64, rgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) { rgb[i * 3] = (i * 4) & 255; rgb[i * 3 + 1] = (i >> 4) & 255; rgb[i * 3 + 2] = (i * 7 + (i >> 6)) & 255; }
  const a = quantise(rgb), b = quantise(rgb.slice());
  assert.equal(a.length % 3, 0);
  assert.ok(a.length / 3 <= 256 && a.length / 3 > 200, a.length / 3 + ' colours');
  assert.deepEqual([...a], [...b], 'deterministic');
  assert.ok(quantise(rgb, 16).length / 3 <= 16);
  const few = Uint8Array.from([10, 20, 30, 10, 20, 30, 200, 100, 0, 0, 0, 0, 255, 255, 255, 200, 100, 0]);
  const p = quantise(few), set = new Set(); for (let i = 0; i < p.length; i += 3) set.add(p.slice(i, i + 3).join(','));
  assert.deepEqual([...set].sort(), ['0,0,0', '10,20,30', '200,100,0', '255,255,255']);
  const rgba = Uint8Array.from([10, 20, 30, 255, 250, 250, 250, 255, 190, 110, 5, 255]);
  const idx = indexFrame(rgba, 3, 1, p);
  assert.deepEqual([...idx].map(i => p.slice(i * 3, i * 3 + 3).join(',')), ['10,20,30', '255,255,255', '200,100,0']);
  assert.ok(indexFrame(rgba, 3, 1, p, { dither: true }).length === 3);
});

/* ---------- LZW and the GIF writer ---------- */
test('lzwEncode round-trips through an independent decoder (runs, noise, a full table and its clear codes)', () => {
  const r = rand(3);
  const cases = [[], [7], new Uint8Array(5000).fill(4), Uint8Array.from({ length: 30000 }, () => Math.floor(r() * 256)), Uint8Array.from({ length: 20000 }, (_, i) => (i >> 5) % 3 ? 9 : Math.floor(r() * 4))];
  for (const c of cases) assert.deepEqual([...lzwDecode(lzwEncode(Uint8Array.from(c), 8), 8)], [...c]);
  const small = Uint8Array.from({ length: 900 }, () => Math.floor(r() * 4));
  assert.deepEqual([...lzwDecode(lzwEncode(small, 2), 2)], [...small], 'a 2-bit minimum code size');
});

test('gifEncode / gifFromPngs: GIF89a, the right size, a loop extension, N frames with fps delays, frames that composite back exactly', () => {
  const w = 24, h = 10, n = 5, pngs = [], want = [];
  for (let k = 0; k < n; k++) {
    const px = new Uint8Array(w * h * 3);
    for (let p = 0; p < w * h; p++) { const x = p % w, y = (p / w) | 0, on = x >= k * 3 && x < k * 3 + 4 && y > 2 && y < 7; px.set(on ? [230, 60, 20] : [40 + y * 15, 90 + y * 10, 200], p * 3); }
    pngs.push(makePng(w, h, px, 3, k % 5));
  }
  pngs.push(pngs[n - 1]);   // a frame identical to the one before it
  const res = gifFromPngs(pngs, { fps: 12, onFrame: (k, idx) => want.push(idx) });
  assert.equal(res.frames, n + 1);
  assert.ok(res.colours <= 255, 'one index is kept for transparency');
  const g = readGif(res.gif);
  assert.equal(g.W, w); assert.equal(g.H, h);
  assert.equal(g.loop, 0, 'NETSCAPE2.0 loop for ever');
  assert.equal(g.images.length, n + 1);
  assert.deepEqual(g.images.map(i => i.delay), [8, 9, 8, 8, 9, 8], '12 fps: 100 cs every 12 frames');
  assert.ok(g.images.slice(1).every(i => i.disposal === 1 && i.transparent === 255), 'later frames draw over the previous one');
  assert.ok(g.images[1].w < w, 'only the changed rectangle is written: ' + g.images[1].w);
  assert.equal(g.images[n].w * g.images[n].h, 1, 'an unchanged frame is one transparent pixel');
  g.composed.forEach((c, k) => assert.deepEqual([...c], [...want[k]], 'frame ' + k + ' composites to the indexed frame'));
  assert.notDeepEqual([...g.composed[0]], [...g.composed[1]]);
  // without the diff: full frames, 256 colours allowed, no transparency
  const full = readGif(gifFromPngs(pngs.slice(0, 2), { fps: 10, diff: false }).gif);
  assert.deepEqual(full.images.map(i => [i.w, i.h, i.transparent, i.delay]), [[w, h, -1, 10], [w, h, -1, 10]]);
  // gifEncode directly
  const pal = new Uint8Array(768); pal.set([0, 0, 0, 255, 255, 255]);
  const one = readGif(gifEncode({ width: 3, height: 2, palette: pal, frames: [{ indices: Uint8Array.from([0, 1, 0, 1, 0, 1]), delay: 5 }], loop: 2 }));
  assert.equal(one.loop, 2); assert.deepEqual([...one.composed[0]], [0, 1, 0, 1, 0, 1]);
});

/* ---------- a capture in headless Chrome ---------- */
const browser = findBrowser();
let chrome = null;
before(async () => { if (browser) chrome = await launchChrome({ executable: browser }); });
after(async () => { if (chrome) await chrome.close(); });

test('sceneCapture: 3 frames of the test scene in the real renderer make a valid GIF whose frames differ', { skip: !browser && 'no Chrome / Chromium found' }, async () => {
  const res = await sceneCapture(chrome, { root: ROOT, data: 'SCENE_TEST_TINY', size: { w: 320, h: 180 } }, { seconds: 1.5, fps: 2 });
  assert.equal(res.frames, 3);
  const g = readGif(res.gif);
  assert.equal(g.W, 320); assert.equal(g.H, 180);
  assert.equal(g.loop, 0);
  assert.equal(g.images.length, 3);
  assert.deepEqual(g.images.map(i => i.delay), [50, 50, 50]);
  assert.ok(new Set(g.composed[0]).size > 20, 'not blank: ' + new Set(g.composed[0]).size + ' colours');
  assert.notDeepEqual([...g.composed[0]], [...g.composed[1]], 'frame 1 moved');
  assert.notDeepEqual([...g.composed[1]], [...g.composed[2]], 'frame 2 moved');
});
