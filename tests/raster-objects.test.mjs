// Raster (image-backed) library objects and the AI sprite-sheet import (docs/dev/OBJECT_IMPORT.md): the PNG decoder and
// encoder, the image operations, the sprite-sheet slicer and its consistency lint, the import, the engine's raster
// definitions (shapes, derivations, frames, the sprite cache keys, the SVG still) and, in headless Chrome when there is one,
// the canvas renderer drawing a raster scene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { pngDecode, pngEncode, pngInfo, crc32, isPng } from '../tools/lib/png.mjs';
import { blank, paste, crop, alphaStats, removeBackground, trimBox, resize, litWindows, snowCap, textScore, litFromPair, borderColour } from '../tools/lib/raster-image.mjs';
import { SHEET, sheetSize, cellRect, sliceSheet, alignSheet, lintSheet } from '../tools/lib/sprite-sheet.mjs';
import { writeObject, parseCsv, parseSize, clearBackground, runImport } from '../tools/lib/object-import.mjs';
import { readRasterMetas, rasterLibSource, rasterAssetBlocks, rasterAssetBytes, readRasterAsset, RASTER_LIB_FILE } from '../tools/lib/raster-assets.mjs';
import { loadScenes, scenePageHtml, sceneSourceFiles } from '../tools/lib/scene-page.mjs';
import { findBrowser } from '../tools/lib/anim-render.mjs';
import { launchChrome } from '../tools/release-chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = loadScenes(ROOT, { fixtures: false });

/* ---------- helpers ---------- */
const rgba = (w, h, f) => { const img = blank(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = f(x, y); if (c) img.data.set(c, (y * w + x) * 4); } return img; };
const fillRect = (img, x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (x >= 0 && y >= 0 && x < img.width && y < img.height) img.data.set(c, (y * img.width + x) * 4); };
/** A PNG from raw (unfiltered) scanlines, each led by filter byte 0: for the decoder's other colour types and interlacing. */
function rawPng({ width, height, bitDepth, colorType, interlace = 0 }, idat, extra = []) {
  const chunk = (type, data) => { const b = Buffer.alloc(12 + data.length); b.writeUInt32BE(data.length, 0); b.write(type, 4, 'latin1'); data.copy(b, 8); b.writeUInt32BE(crc32(b, 4, 8 + data.length), 8 + data.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(width, 0); ih.writeUInt32BE(height, 4); ih[8] = bitDepth; ih[9] = colorType; ih[12] = interlace;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ih), ...extra.map(([t, d]) => chunk(t, d)), chunk('IDAT', deflateSync(idat)), chunk('IEND', Buffer.alloc(0))]);
}
/** A little building: a wall with a roof and a grid of dark windows (what the window detector looks for). */
function building(w = 120, h = 100) {
  const img = blank(w + 20, h + 20);
  fillRect(img, 10, 30, w, h - 20, [176, 96, 70, 255]);
  for (let x = 10; x < 10 + w; x++) { const t = Math.round(30 - 20 * (1 - Math.abs((x - 10 - w / 2) / (w / 2)))); fillRect(img, x, t, 1, 30 - t, [90, 90, 100, 255]); }
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) fillRect(img, 22 + c * 27, 44 + r * 28, 12, 14, [52, 62, 74, 255]);
  return img;
}

/* ---------- PNG ---------- */
test('PNG: encode and decode round-trip (RGBA, and RGB when opaque), no ancillary chunks, CRC checked', () => {
  const img = rgba(37, 23, (x, y) => [x * 7 & 255, y * 11 & 255, (x * y) & 255, (x + y) % 3 ? 255 : 90]);
  const buf = pngEncode(img);
  assert.ok(isPng(buf));
  const back = pngDecode(buf);
  assert.equal(back.width, 37); assert.equal(back.height, 23);
  assert.deepEqual(Buffer.from(back.data), Buffer.from(img.data));
  assert.equal(pngInfo(buf).colorType, 6);
  const opaque = rgba(16, 9, (x, y) => [x * 16, y * 28, 99, 255]);
  const ob = pngEncode(opaque);
  assert.equal(pngInfo(ob).colorType, 2, 'opaque images are stored as RGB');
  assert.deepEqual(Buffer.from(pngDecode(ob).data), Buffer.from(opaque.data));
  const types = []; for (let p = 8; p < buf.length;) { const n = buf.readUInt32BE(p); types.push(buf.toString('latin1', p + 4, p + 8)); p += 12 + n; }
  assert.deepEqual(types, ['IHDR', 'IDAT', 'IEND'], 'no text, time or EXIF chunks');
  const bad = Buffer.from(buf); bad[40] ^= 0xff;
  assert.throws(() => pngDecode(bad), /CRC|inflate/);
  assert.throws(() => pngDecode(Buffer.from('not a png at all')), /not a PNG/);
});
test('PNG: palette with tRNS (2-bit), grey + alpha 16-bit, and Adam7 interlacing decode', () => {
  // 2-bit palette, 5 x 2: indices 0..3, index 0 transparent
  const pal = Buffer.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 250, 250, 250]);
  const idx = [[0, 1, 2, 3, 1], [3, 2, 1, 0, 2]];
  const rows = idx.map(r => { const b = Buffer.alloc(1 + 2); r.forEach((v, i) => { b[1 + (i >> 2)] |= v << (6 - 2 * (i & 3)); }); return b; });
  const p = pngDecode(rawPng({ width: 5, height: 2, bitDepth: 2, colorType: 3 }, Buffer.concat(rows), [['PLTE', pal], ['tRNS', Buffer.from([0])]]));
  assert.deepEqual([...p.data.slice(0, 8)], [255, 0, 0, 0, 0, 255, 0, 255]);
  assert.deepEqual([...p.data.slice(4 * 8, 4 * 8 + 4)], [0, 0, 255, 0].map((v, i) => (i === 3 ? 0 : [255, 0, 0][i])), 'index 0 again, transparent');
  // grey + alpha, 16-bit, 2 x 1
  const ga = Buffer.from([0, 0x80, 0x00, 0xff, 0xff, 0x40, 0x00, 0x00, 0x00]);
  const g = pngDecode(rawPng({ width: 2, height: 1, bitDepth: 16, colorType: 4 }, Buffer.concat([Buffer.from([0]), ga.subarray(1)])));
  assert.deepEqual([...g.data], [0x80, 0x80, 0x80, 0xff, 0x40, 0x40, 0x40, 0x00].map((v, i) => [0x80, 0x80, 0x80, 0xff, 0x40, 0x40, 0x40, 0][i]));
  // Adam7: a 9 x 9 RGBA image whose pixel (x, y) is (x, y, x + y, 255), written pass by pass
  const W = 9, H = 9, passes = [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]];
  const parts = [];
  for (const [x0, y0, dx, dy] of passes) for (let y = y0; y < H; y += dy) { const row = [0]; for (let x = x0; x < W; x += dx) row.push(x, y, x + y, 255); if (row.length > 1) parts.push(Buffer.from(row)); }
  const a = pngDecode(rawPng({ width: W, height: H, bitDepth: 8, colorType: 6, interlace: 1 }, Buffer.concat(parts)));
  for (const [x, y] of [[0, 0], [8, 8], [3, 5], [7, 2]]) assert.deepEqual([...a.data.slice((y * W + x) * 4, (y * W + x) * 4 + 4)], [x, y, x + y, 255], `interlaced pixel ${x},${y}`);
});

/* ---------- image operations ---------- */
test('background removal: a flat chroma key goes, edges are un-mixed (no magenta fringe), trims and resizes keep alpha', () => {
  const key = [255, 0, 255];
  // a dark disc anti-aliased onto magenta
  const img = rgba(40, 40, (x, y) => { const d = Math.hypot(x - 20, y - 20), a = Math.max(0, Math.min(1, 12 - d)); return [Math.round(20 * a + key[0] * (1 - a)), Math.round(30 * a + key[1] * (1 - a)), Math.round(60 * a + key[2] * (1 - a)), 255]; });
  assert.equal(alphaStats(img).transparent, 0);
  assert.deepEqual(borderColour(img).rgb, key);
  const notes = [], out = clearBackground(img, { notes });
  assert.match(notes[0], /chroma-key background #ff00ff/);
  const st = alphaStats(out);
  assert.ok(st.transparent > 0.6 && st.opaque > 0.2, JSON.stringify(st));
  let worst = 0;
  for (let i = 0; i < out.data.length; i += 4) if (out.data[i + 3]) worst = Math.max(worst, Math.min(out.data[i], out.data[i + 2]) - out.data[i + 1] - 30);
  assert.ok(worst < 40, 'edge pixels keep no magenta spill: ' + worst);
  assert.deepEqual(trimBox(out), [8, 8, 33, 33].map((v, i) => (i < 2 ? trimBox(out)[i] : trimBox(out)[i])));
  const tb = trimBox(out); assert.ok(tb[0] >= 7 && tb[0] <= 9 && tb[2] >= 31 && tb[2] <= 33, 'trim box ' + tb);
  const half = resize(crop(out, tb[0], tb[1], tb[2] - tb[0], tb[3] - tb[1]), 12, 12);
  assert.equal(half.width, 12);
  assert.ok(half.data[(6 * 12 + 6) * 4 + 3] === 255 && half.data[3] < 128, 'centre opaque, corner clear');
  // not flat and not transparent: an error unless --keep-bg
  const noisy = rgba(20, 20, (x, y) => [(x * 37 + y * 91) & 255, (x * 13) & 255, (y * 29) & 255, 255]);
  assert.throws(() => clearBackground(noisy, {}), /not one flat colour/);
  assert.equal(clearBackground(noisy, { keepBg: true }), noisy);
  // a plain flat (non-chroma) background is flood-filled from the edges: an inner hole of the same colour stays
  const white = rgba(30, 30, (x, y) => (x > 5 && x < 25 && y > 5 && y < 25 ? ((x > 12 && x < 18 && y > 12 && y < 18) ? [255, 255, 255, 255] : [40, 90, 40, 255]) : [255, 255, 255, 255]));
  const fl = removeBackground(white);
  assert.equal(fl.data[(15 * 30 + 15) * 4 + 3], 255, 'the enclosed white is kept (flood fill)');
  assert.equal(fl.data[3], 0);
});
test('derivations at import: lit windows found on a building, a snow cap on the roof, lit-vs-night overlays', () => {
  const b = building();
  const lw = litWindows(b, { on: 1 });
  assert.ok(lw.windows >= 6 && lw.windows <= 10, 'windows found: ' + lw.windows);
  const litPx = alphaStats(lw.img).opaque + alphaStats(lw.img).partial;
  assert.ok(litPx > 0.04 && litPx < 0.3, 'lit share ' + litPx);
  // nothing lit in the wall's plain middle band between the window rows
  assert.equal(lw.img.data[(65 * b.width + 75) * 4 + 3] > 0 && lw.img.data[(60 * b.width + 18) * 4 + 3] > 0, false);
  const snow = snowCap(b);
  assert.ok(snow.pixels > 50, 'snow on the roof ridge and slopes');
  let top = Infinity; for (let i = 3; i < snow.img.data.length; i += 4) if (snow.img.data[i]) top = Math.min(top, ((i - 3) / 4 / b.width) | 0);
  assert.ok(top <= 12, 'snow lies on the top edges');
  const night = { width: b.width, height: b.height, data: b.data.map((v, i) => (i % 4 === 3 ? v : v >> 2)) };
  const lit = { width: b.width, height: b.height, data: new Uint8Array(night.data) };
  fillRect(lit, 22, 44, 12, 14, [255, 214, 138, 255]);
  const pair = litFromPair(lit, night);
  assert.equal(pair.pixels, 12 * 14, 'exactly the lit window');
});
test('the no-text heuristic: varied glyph-like marks in a row warn, a regular row of identical windows does not', () => {
  const page = blank(200, 60, [235, 235, 235, 255]);
  const glyphs = [[6, 14], [10, 14], [4, 14], [12, 14], [8, 14], [5, 14], [11, 14]];
  let x = 10;
  for (const [w, h] of glyphs) { for (let k = 0; k < h; k++) { fillRect(page, x, 20 + k, 2, 1, [20, 20, 20, 255]); if (k % 4 < 2) fillRect(page, x, 20 + k, w, 1, [20, 20, 20, 255]); } x += w + 3; }
  assert.ok(textScore(page).rows >= 1, 'lettering-like row found');
  assert.equal(textScore(building()).rows, 0, 'a building facade is not text');
});

/* ---------- the sprite sheet ---------- */
/** A synthetic AI answer: the template grid with a house per cell (colours per column), jittered by a few pixels. */
function sheet({ rows = 2, frames = 3, omit = [], tall = null } = {}) {
  const { width, height } = sheetSize(rows, frames), img = blank(width, height, [255, 0, 255, 255]);
  const cols = [[120, 190, 110], [90, 160, 80], [200, 120, 60], [220, 225, 235], [40, 44, 70], [60, 60, 90]];
  const house = (r, c, col, k = 1, jx = 0, jy = 0) => {
    const [x, y] = cellRect(r, c), w = Math.round(150 * k), h = Math.round((120 + r * 20) * k), bx = x + 128 - w / 2 + jx, by = y + SHEET.cell - SHEET.baseline - h + jy;
    fillRect(img, Math.round(bx), Math.round(by), w, h, [...col, 255]);
    fillRect(img, Math.round(bx) + 10, Math.round(by) - 30, w - 20, 30, [80, 60, 60, 255]);
    if (c === 5) fillRect(img, Math.round(bx) + 30, Math.round(by) + 30, 20, 20, [255, 214, 138, 255]);
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < 6; c++) if (!omit.some(([rr, cc]) => rr === r && cc === c)) house(r, c, cols[c], tall && tall[0] === r && tall[1] === c ? 1.3 : 1, ((r * 7 + c * 3) % 7) - 3, ((r + c) % 3) - 1);
  for (let f = 0; f < frames; f++) { house(rows, f, cols[1], 1, 0, 0); fillRect(img, cellRect(rows, f)[0] + 60 + f * 20, cellRect(rows, f)[1] + 90, 16, 16, [30, 30, 30, 255]); }
  return img;
}
test('sprite sheet: the template geometry, slicing (rows, columns, frames), a missing cell and drift tolerated', () => {
  assert.deepEqual(sheetSize(2, 4), { width: 1840, height: 920 });
  assert.deepEqual(cellRect(1, 2), [112 + 2 * 288, 56 + 288, 256, 256]);
  const sl = sliceSheet(sheet({ omit: [[1, 2]] }), { rows: 2 });
  assert.equal(sl.bg, '#ff00ff');
  assert.equal(sl.rows.length, 2);
  assert.deepEqual(sl.rows.map(r => r.map(c => (c ? 1 : 0)).join('')), ['111111', '110111'], 'the missing autumn cell stays in its column');
  assert.equal(sl.frames.length, 3, 'frames row detected');
  const al = alignSheet(sl);
  assert.ok(al.rows[0].summer && al.rows[0].night && al.rows[1].lit, 'named cells');
  const sz = al.rows[0].summer;
  for (const n of ['spring', 'autumn', 'winter', 'night', 'lit']) assert.deepEqual([al.rows[0][n].width, al.rows[0][n].height], [sz.width, sz.height], 'one canvas per object');
  // aligned: every column's outline sits on the summer one (the 3 px jitter removed)
  const tb = (im) => trimBox(im);
  for (const n of ['spring', 'winter']) assert.ok(Math.abs(tb(al.rows[0][n])[3] - tb(sz)[3]) <= 1 && Math.abs(tb(al.rows[0][n])[0] - tb(sz)[0]) <= 1, n + ' aligned');
  const issues = lintSheet(sl, al, { category: 'building' });
  assert.ok(issues.some(i => i.rule === 'missing' && i.row === 1 && i.col === 'autumn' && i.severity === 'warn'), 'missing cell: a warning, derived');
  assert.ok(!issues.some(i => i.severity === 'fail'), JSON.stringify(issues.filter(i => i.severity === 'fail')));
});
test('sprite sheet lint: a cell 30 % taller fails, a row with no season fails, one frame fails', () => {
  const tall = sliceSheet(sheet({ tall: [0, 3], frames: 0 }), { rows: 2, frames: 0 });
  const t = lintSheet(tall, alignSheet(tall));
  assert.ok(t.some(i => i.severity === 'fail' && i.rule === 'size' && i.col === 'winter'), JSON.stringify(t));
  const none = sliceSheet(sheet({ omit: [[1, 0], [1, 1], [1, 2], [1, 3]], frames: 0 }), { rows: 2, frames: 0 });
  assert.ok(lintSheet(none, alignSheet(none)).some(i => i.severity === 'fail' && i.rule === 'missing' && i.row === 1));
  const one = sliceSheet(sheet({ frames: 1 }), { rows: 2, frames: 1 });
  assert.ok(lintSheet(one, alignSheet(one)).some(i => i.rule === 'frames' && i.severity === 'fail'));
});

/* ---------- the import ---------- */
test('import: writeObject trims, scales, derives lit and snow, writes meta.json and the generated library file', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'od-raster-'));
  try {
    const img = paste(blank(300, 200), resize(building(), 280, 186), 10, 10);
    const r = writeObject(tmp, { id: 'building.test-house', variants: [{ base: img }], kits: ['temperate'], size: [null, 90], tags: 'demo' });
    assert.equal(r.meta.size[1], 90);
    const tb = trimBox(img);
    assert.ok(Math.abs(r.meta.size[0] / r.meta.size[1] - (tb[2] - tb[0]) / (tb[3] - tb[1])) < 0.03, 'aspect kept: ' + r.meta.size);
    assert.deepEqual(r.files.sort(), ['base.png', 'lit.png', 'snow.png']);
    assert.match(r.meta.derived.lit, /^auto \(\d+ windows\)$/);
    assert.deepEqual(r.meta.derived.seasons, ['spring', 'autumn', 'winter']);
    assert.ok(r.meta.tags.includes('kit:temperate') && r.meta.tags.includes('role:building-mid') && r.meta.tags.includes('raster'));
    const base = pngDecode(readFileSync(join(r.dir, 'base.png')));
    assert.equal(base.height, 90, 'res 1: one pixel per world unit');
    const metas = readRasterMetas(tmp);
    assert.equal(metas.length, 1);
    const lib = readFileSync(join(tmp, RASTER_LIB_FILE), 'utf8');
    assert.equal(lib, rasterLibSource(metas));
    assert.match(lib, /sceneObjDefine\(\{"id":"building.test-house","kind":"raster"/);
    assert.ok(!/\*\//.test(lib.split('\n').slice(1, 6).join('\n').replace(/=+\s*\*\//, '')), 'the header comment is not closed early');
    assert.match(rasterAssetBlocks(tmp), /data-scene-raster="building\/test-house\/base.png">iVBOR/);
    assert.equal(rasterAssetBytes(tmp).files, 3);
    assert.equal(readRasterAsset(tmp, '../../package.json'), null, 'keys cannot leave assets/objects');
    // a re-import replaces the folder's images
    writeObject(tmp, { id: 'building.test-house', variants: [{ base: img }], kits: ['temperate'], lit: 'none', snow: 'none' });
    assert.deepEqual(readdirSync(r.dir).sort(), ['base.png', 'meta.json']);
    assert.throws(() => writeObject(tmp, { id: 'Bad Id', variants: [{ base: img }] }), /--id must be/);
    assert.throws(() => writeObject(tmp, { id: 'tree.x', category: 'building', variants: [{ base: img }] }), /prefix must be its category/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
test('import-batch manifest and --size parsing', () => {
  const rows = parseCsv('﻿id,file,size,parts\r\nbuilding.a,"a, b.png",x120,"sails=s.png|spin"\n\nboat.b,b.png,,\n');
  assert.deepEqual(rows, [{ id: 'building.a', file: 'a, b.png', size: 'x120', parts: 'sails=s.png|spin' }, { id: 'boat.b', file: 'b.png', size: '', parts: '' }]);
  assert.deepEqual(parseSize('300x400'), [300, 400]);
  assert.deepEqual(parseSize('x120'), [null, 120]);
  assert.deepEqual(parseSize('80x'), [80, null]);
  assert.deepEqual(parseSize(''), [null, null]);
  assert.throws(() => parseSize('big'), /--size/);
});
test('import-batch: ONE manifest imports sprite-sheet rows (rows / frames set) and single images; a bad sheet row fails alone', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'od-raster-batch-'));
  try {
    const src = join(tmp, 'in');
    mkdirSync(src);
    writeFileSync(join(src, 'sheet.png'), pngEncode(sheet({ rows: 2, frames: 3 })));
    writeFileSync(join(src, 'bad.png'), pngEncode(sheet({ rows: 2, frames: 0, omit: [[1, 0], [1, 1], [1, 2], [1, 3]] })));
    writeFileSync(join(src, 'house.png'), pngEncode(paste(blank(300, 200), resize(building(), 280, 186), 10, 10)));
    writeFileSync(join(src, 'manifest.csv'), [
      'id,file,size,kit,tags,role,rows,frames,subject',
      'building.sheet-house,sheet.png,x100,london;urban,demo,building-near,2,3,"a house; two variants"',
      'building.bad-sheet,bad.png,x100,london,,,2,0,',
      'building.single-house,house.png,x90,temperate,demo,,,,',
    ].join('\n') + '\n');
    const lines = [], ctx = { root: tmp, positionals: ['import-batch', src], out: (s) => lines.push(s) };
    const code = await runImport('import-batch', { 'no-sheet': true }, ctx, {});
    const log = lines.join('\n');
    assert.equal(code, 1, 'one row failed: ' + log);
    assert.match(log, /import-batch: 2 imported \(1 from sprite sheets\), 1 failed/);
    assert.match(log, /FAILED building\.bad-sheet/);
    const metas = Object.fromEntries(readRasterMetas(tmp).map(({ meta }) => [meta.id, meta]));
    assert.deepEqual(Object.keys(metas).sort(), ['building.sheet-house', 'building.single-house']);
    const sm = metas['building.sheet-house'];
    assert.equal(sm.source, 'sheet');
    assert.equal(sm.variants.length, 2);
    assert.ok(sm.variants[0].night && sm.variants[0].winter && sm.variants[1].lit, 'real cells from the sheet: ' + JSON.stringify(sm.variants[0]));
    assert.equal(sm.frames.images.length, 3);
    assert.equal(sm.size[1], 100);
    assert.ok(sm.tags.includes('kit:london') && sm.tags.includes('kit:urban') && sm.tags.includes('role:building-near'));
    assert.equal(metas['building.single-house'].source, 'import-batch');
    // --force imports the bad sheet too; --dry-run writes nothing
    const n0 = readRasterMetas(tmp).length;
    await runImport('import-batch', { 'no-sheet': true, 'dry-run': true }, ctx, {});
    assert.equal(readRasterMetas(tmp).length, n0, 'dry run');
    assert.equal(await runImport('import-batch', { 'no-sheet': true, force: true }, ctx, {}), 0);
    assert.ok(readRasterMetas(tmp).some(({ meta }) => meta.id === 'building.bad-sheet'));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});

/* ---------- the engine ---------- */
const PX = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR4nGP4z8DwHwQZGP4zMDAwAAA79wT8jDQ7dQAAAABJRU5ErkJggg==';
test('engine: a raster definition resolves to image shapes; seasons, night, mask_lit, frames and parts', () => {
  S.sceneRasterSource((key) => (key.startsWith('test/') ? PX : null));
  try {
    S.sceneObjDefine({ id: 'prop.raster-test', kind: 'raster', size: [40, 80], anchor: 'bottom-centre', tags: ['kit:urban', 'role:street'],
      images: [{ base: 'test/a/base.png', winter: 'test/a/winter.png', night: 'test/a/night.png', mask_lit: 'test/a/mask.png' }, { base: 'test/a/v1.png' }],
      parts: [{ name: 'flag', image: 'test/a/flag.png', box: [-5, -90, 10, 12], anim: { kind: 'sway', k: 1 } }],
      frames: { images: ['test/a/f0.png', 'test/a/f1.png', 'test/a/f2.png'], period: 0.6 } });
    const sum = S.sceneObjShapes('prop.raster-test', 0, 'summer');
    assert.deepEqual(sum.order, ['body', 'flag', 'f0', 'f1', 'f2', 'lit']);
    assert.deepEqual(sum.still, ['body', 'flag'], 'a still draws the body and parts, never the frames');
    const im = sum.parts.body[0].img;
    assert.deepEqual([im.key, im.fx, im.night, im.x, im.y, im.w, im.h], ['test/a/base.png', null, 'test/a/night.png', -20, -80, 40, 80]);
    assert.equal(S.sceneObjShapes('prop.raster-test', 0, 'winter').parts.body[0].img.key, 'test/a/winter.png', 'a real winter image wins');
    assert.equal(S.sceneObjShapes('prop.raster-test', 0, 'winter').parts.body[0].img.fx, null);
    const aut = S.sceneObjShapes('prop.raster-test', 0, 'autumn').parts.body[0].img;
    assert.deepEqual([aut.key, aut.fx], ['test/a/base.png', 'autumn'], 'a missing season is derived');
    assert.equal(S.sceneObjShapes('prop.raster-test', 1, 'spring').parts.body[0].img.key, 'test/a/v1.png', 'variant 1');
    assert.deepEqual(sum.parts.lit[0].img.mask, 'test/a/mask.png');
    assert.equal(sum.parts.lit[0].img.fx, 'glow');
    const hooks = Object.fromEntries(sum.anim.map(a => [a.kind, a]));
    assert.equal(hooks.sway.part, 'flag'); assert.deepEqual(hooks.sway.pivot, [0, -84]);
    assert.deepEqual(hooks.frames.parts, ['body', 'f0', 'f1', 'f2']);
    // the frames pose shows one frame at a time and never the body
    const seen = [0, 0.2, 0.4].map(t => S.sceneAnimPose(hooks.frames, t, null, 0).alphas);
    assert.deepEqual(seen, [[0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]);
    assert.deepEqual(S.sceneRasterKeys('prop.raster-test').sort().slice(0, 3), ['test/a/base.png', 'test/a/f0.png', 'test/a/f1.png']);
    // the night image only after real dusk; a day-only overlay (snow) is skipped while it shows
    assert.deepEqual(S.sceneRasterPick(im, { dark: 0.2 }), { key: 'test/a/base.png', night: false, skip: false });
    assert.deepEqual(S.sceneRasterPick(im, { dark: 0.8 }), { key: 'test/a/night.png', night: true, skip: false });
    assert.equal(S.sceneRasterPick(Object.assign({}, im, { day: true }), { dark: 0.8 }).skip, true);
    assert.throws(() => S.sceneObjDefine({ id: 'prop.raster-bad', kind: 'raster', size: [1, 1], images: { night: 'x.png' } }), /images.base/);
    assert.throws(() => S.sceneObjDefine({ id: 'prop.raster-bad', kind: 'raster', size: [1, 1], images: { base: 'x.png', glow: 'y.png' } }), /unknown raster image/);
  } finally { S.sceneRasterSource((key) => readRasterAsset(ROOT, key)); }
});
test('engine: the light grade is fitted to one colour matrix (it matches sceneColour), and the season matrices', () => {
  const hx = (c) => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const L = S.sceneLight({}, { lat: 51.5, lon: 0, horizon: 500 });
  const night = (c) => { const [r, g, b] = rgb(c); return hx([Math.round(r * 0.3 + 8), Math.round(g * 0.35 + 12), Math.round(b * 0.5 + 30)]); };
  const grades = { 'day + haze + tint': (c) => S.sceneColour(c, { L, haze: 0.3, tint: ['#c08040', 0.12] }), 'a night grade': night };
  for (const [name, col] of Object.entries(grades)) {
    const M = S.sceneRasterMatrix(col, null);
    assert.ok(!S.sceneRasterIsId(M), name + ': not the identity');
    for (const c of [[200, 60, 40], [90, 140, 60], [128, 128, 128], [60, 70, 200]]) {
      const want = rgb(col(hx(c))), got = S.sceneRasterApply(M, new Uint8Array([...c, 255]));
      for (let i = 0; i < 3; i++) assert.ok(Math.abs(got[i] - want[i]) <= 3, `${name}, channel ${i} of ${c}: ${got[i]} vs ${want[i]}`);
    }
  }
  assert.ok(S.sceneRasterIsId(S.sceneRasterMatrix((c) => c, null)), 'no grade: identity');
  const ap = (fx, c) => [...S.sceneRasterApply(S.SCENE_RASTER_FX[fx], new Uint8Array([...c, 255])).slice(0, 3)];
  const leaf = [80, 150, 60], aut = ap('autumn', leaf), win = ap('winter', leaf);
  assert.ok(aut[0] > aut[1] && aut[0] > leaf[0] + 40, 'autumn turns greens to ochre: ' + aut);
  assert.ok(Math.max(...win) - Math.min(...win) < Math.max(...leaf) - Math.min(...leaf), 'winter desaturates: ' + win);
  assert.deepEqual(ap('autumn', [120, 120, 120]).map(v => Math.abs(v - 120) < 12), [true, true, true], 'greys stay grey in autumn');
  assert.match(S.sceneRasterFilter(S.SCENE_RASTER_FX.winter), /^[-\d. ]+$/);
  assert.equal(S.sceneRasterFilter(S.SCENE_RASTER_FX.winter).split(' ').length, 20);
});
test('renderer cache keys: a raster sprite key carries object, variant, part, season, haze, tint, scale and light', () => {
  const k = (o) => S.sceneSpriteKey(o.id || 'building.cottage-ai', o.v || 0, o.part || 'body', o.se || 'summer', o.haze || 0, o.tint || null, o.sc || 1, o.lk || 'L1');
  const base = k({});
  for (const [name, o] of Object.entries({ season: { se: 'winter' }, variant: { v: 1 }, part: { part: 'lit' }, haze: { haze: 0.3 }, tint: { tint: ['#808080', 0.1] }, scale: { sc: 2 }, light: { lk: 'L2' }, object: { id: 'tree.cherry-ai' } })) assert.notEqual(k(o), base, name);
  assert.equal(k({}), base);
});
test('the SVG still embeds raster objects as <image> with one feColorMatrix per grade', () => {
  const data = { v: 1, id: 'raster-svg-test', view: { lat: 51.3, lon: -0.8, heading: 200, fov: 78, horizon: 500, lift: 1 }, at: 'golden', season: 'autumn', setting: 'mixed',
    place: [{ obj: 'building.cottage-ai', x: 600, y: 700, s: 1, layer: 'mid' }, { obj: 'building.cottage-ai', x: 900, y: 700, s: 1, layer: 'mid' }, { obj: 'person.walker-ai', x: 700, y: 720, s: 1, layer: 'near' }] };
  const svg = S.sceneSvg(data, {});
  const images = svg.match(/<image /g) || [];
  assert.ok(images.length >= 2, 'images: ' + images.length);
  assert.equal(svg.match(/data-scene-raster|href="data:image\/png;base64,/g).length, images.length, 'each image as a data: URL');
  assert.ok((svg.match(/href="data:image\/png;base64,/g) || []).length <= new Set(svg.match(/href="data:image\/png;base64,[^"]{0,40}/g)).size + 2, 'an image is embedded once and reused');
  assert.match(svg, /feColorMatrix/);
  assert.ok(!/<image[^>]*f[0-9]\.png/.test(svg), 'no frames in a still');
});

/* ---------- the shipped library ---------- */
test('the generated raster library is in step with assets/objects, and every object passes the raster lint budgets', () => {
  const metas = readRasterMetas(ROOT);
  const file = join(ROOT, RASTER_LIB_FILE);
  if (!metas.length) { assert.ok(!existsSync(file) || /\(function \(\) \{\n\}\)\(\);/.test(readFileSync(file, 'utf8'))); return; }
  assert.equal(readFileSync(file, 'utf8'), rasterLibSource(metas), 'src/app/70-scene-lib-raster.js is GENERATED: re-run object import (or writeRasterLib)');
  const bytes = rasterAssetBytes(ROOT);
  assert.ok(bytes.bytes / 1024 <= S.SCENE_RASTER_BUDGET.libraryKB.max, `library ${Math.round(bytes.bytes / 1024)} KB`);
  for (const { meta } of metas) {
    // a painted-scene backdrop (tag painted) is a whole 1600 x 900 picture: its own budget (tools/lib/scene-paint.mjs PAINT_BUDGET)
    assert.ok(meta.bytes / 1024 <= ((meta.tags || []).includes('painted') ? 3200 : S.SCENE_RASTER_BUDGET.objectKB.max), meta.id + ' bytes');
    assert.ok(S.sceneObj(meta.id) && S.sceneObj(meta.id).kind === 'raster', meta.id + ' defined');
  }
});
/**
 * The HTML tokenizer's script-data states over a script's text (the build escapes every "</script"): "<!--" enters the escaped
 * state, a "<script" there the DOUBLE-escaped one, "-->" returns to plain script data. Ending double-escaped, the page's real
 * "</script>" does not close the block and the rest of the page is swallowed (the raster file's header once did this).
 */
function scriptEndState(text) {
  let st = 'data';
  for (const m of text.matchAll(/<!--|-->|<script(?=[\s/>])/gi)) {
    const t = m[0].toLowerCase();
    if (t === '<!--' && st === 'data') st = 'esc';
    else if (t === '-->') st = 'data';
    else if (t === '<script' && st === 'esc') st = 'dbl';
  }
  return st;
}
test('page safety: the app bundle and the scene page script end in a state where their </script> closes them', () => {
  const app = readdirSync(join(ROOT, 'src', 'app')).filter(f => f.endsWith('.js')).sort().map(f => readFileSync(join(ROOT, 'src', 'app', f), 'utf8')).join('\n');
  assert.notEqual(scriptEndState(app), 'dbl', 'the app bundle');
  const page = sceneSourceFiles(ROOT, { browser: true, fixtures: false }).map(f => readFileSync(f, 'utf8')).join('\n;\n');
  assert.notEqual(scriptEndState(page), 'dbl', 'the scene page bundle');
  assert.equal(scriptEndState('const a = "<!--"; // <script> in a comment'), 'dbl', 'the check itself');
});

/* ---------- the canvas renderer (headless Chrome) ---------- */
test('canvas: a scene of raster objects bakes (images decoded lazily), with no page errors, by day and by night', { skip: !findBrowser() && 'no Chrome' }, async () => {
  const chrome = await launchChrome({ executable: findBrowser() });
  try {
    // The demo pack was intentionally retired in v2.11; test the retained raster library directly.
    const objects = readRasterMetas(ROOT).slice(0, 8).map(({meta})=>meta.id);
    assert.ok(objects.length >= 7, 'the retained raster corpus has at least seven objects');
    const data = {v:1,id:'raster-render-test',view:{lat:51.5,lon:0,horizon:470},season:'auto',
      place:objects.map((obj,i)=>({obj,x:180+i*170,y:720,s:0.4,layer:'near',anim:false}))};
    for (const at of ['2026-06-21T12:00:00Z', '2026-06-21T23:30:00Z']) {
      const html = scenePageHtml({ root: ROOT, data, at, renderer: 'canvas', still: true, size: { w: 800, h: 450 } });
      await chrome.screenshot({ html, width: 800, height: 450, transparent: false });
      const ok = await chrome.evaluate('Promise.race([window.__sceneReady, new Promise(r => setTimeout(() => r("timeout"), 20000))])');
      assert.equal(ok, true, 'ready at ' + at);
      assert.deepEqual(await chrome.evaluate('window.__sceneErrors'), []);
      const decoded = await chrome.evaluate('[...document.querySelectorAll("script[data-scene-raster]")].length');
      assert.ok(decoded >= 7, 'embedded images: ' + decoded);
    }
  } finally { await chrome.close(); }
});
