// The style normaliser for imported raster objects (docs/dev/SCENE_ENGINE_V2.md 24, 27.8; builder H). Synthetic RGBA images only.
//   - a foreign green maps to the house foliage green, the luminance order kept
//   - a strong left-lit gradient is flattened
//   - a baked shadow blob below the base is removed (the body is kept)
//   - a 3 px black outline is recoloured and thinned
//   - a white matte fringe is cleaned
//   - an anchor off by 10 % is reported
//   - --write backs up the originals and annotates meta.json (in a temp dir)
//   - the house palette (built and committed), the RGBA PNG round trip, the object <sub> delegation
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { pngDecode } from '../tools/lib/scene-capture.mjs';
import {
  rgbToLab, labToRgb, deltaE76, housePalette, buildHousePalette, groupsFor, slotGroup, kmeansLab, paletteMap, lightBalance, flattenShading,
  removeCastShadow, outlines, defringe, meanDeltaE, checkImage, normaliseImage, pngEncodeRGBA, MATERIAL_GROUPS,
} from '../tools/lib/style-normalise.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAL_JSON = JSON.parse(readFileSync(join(REPO, 'tools', 'scene-house-palette.json'), 'utf8'));
const PAL = housePalette(PAL_JSON);

/** A blank RGBA image and a painter. */
function blank(w, h) { return { width: w, height: h, data: new Uint8Array(w * h * 4) }; }
function fill(img, x0, y0, x1, y1, rgba) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * img.width + x) * 4; img.data.set(rgba, i); } }
const px = (img, x, y) => Array.from(img.data.subarray((y * img.width + x) * 4, (y * img.width + x) * 4 + 4));
const L = (rgba) => rgbToLab(rgba)[0];

test('colour: Lab round trip and delta E', () => {
  for (const c of [[0, 0, 0], [255, 255, 255], [90, 140, 60], [200, 40, 30]]) {
    const back = labToRgb(rgbToLab(c));
    assert.ok(back.every((v, i) => Math.abs(v - c[i]) <= 1), `${c} -> ${back}`);
  }
  assert.equal(deltaE76([50, 0, 0], [50, 3, 4]), 5);
});

test('the house palette: about 60 colours, every material group, foliage by season; built from slot names', () => {
  assert.ok(PAL_JSON.colours >= 50 && PAL_JSON.colours <= 80, String(PAL_JSON.colours));
  for (const g of MATERIAL_GROUPS) assert.ok(PAL.groups[g] && PAL.groups[g].length, g);
  for (const s of ['spring', 'summer', 'autumn', 'winter']) assert.ok(PAL_JSON.groups.foliage[s].length >= 3, s);
  assert.equal(slotGroup('leafAlt'), 'foliage'); assert.equal(slotGroup('brick'), 'brick'); assert.equal(slotGroup('glass'), 'glass'); assert.equal(slotGroup('bark'), 'bark');
  const built = buildHousePalette([
    { id: 'tree.a', category: 'tree', palette: { base: { leaf: ['#4a7a30', '#5c8c3a'], bark: '#5a4636' }, autumn: { leaf: ['#b0602a'] } } },
    { id: 'building.b', category: 'building', palette: { base: { brick: ['#9a4a32', '#7a3a28'], glass: '#3a4a5a', roof: '#4c5052' } } },
  ]);
  assert.ok(built.groups.foliage.autumn.length && built.groups.brick.length && built.groups.glass.length);
  assert.deepEqual(groupsFor('tree'), ['foliage', 'bark']);
  const k = kmeansLab([[50, 0, 0, 1], [51, 0, 0, 1], [90, 0, 0, 1], [89, 1, 0, 1]], 2);
  assert.equal(k.length, 2); assert.ok(Math.abs(k[0].lab[0] - k[1].lab[0]) > 30);
});

test('palette: a foreign green maps toward the house foliage green, the luminance order kept', () => {
  const img = blank(40, 40);
  fill(img, 0, 0, 40, 20, [40, 255, 90, 255]);    // a neon AI green (light)
  fill(img, 0, 20, 40, 40, [0, 120, 70, 255]);    // a saturated foreign dark green
  const before = meanDeltaE(img, PAL, { groups: ['foliage', 'bark'], season: 'summer' });
  const r = paletteMap(img, PAL, { groups: ['foliage', 'bark'], season: 'summer' });
  const after = meanDeltaE(r.img, PAL, { groups: ['foliage', 'bark'], season: 'summer' });
  assert.ok(after < before * 0.75, `dE ${before} -> ${after}`);
  assert.ok(r.clusters.every(c => c.group === 'foliage'), JSON.stringify(r.clusters));
  assert.ok(L(px(r.img, 5, 5)) > L(px(r.img, 5, 30)) + 5, 'the light green stays lighter than the dark one');
  // the texture is kept: two neighbouring shades stay distinct after the move
  const tex = blank(20, 20); fill(tex, 0, 0, 20, 20, [40, 255, 90, 255]); fill(tex, 0, 10, 20, 20, [50, 240, 100, 255]);
  const t2 = paletteMap(tex, PAL, { groups: ['foliage'], season: 'summer', k: 1 }).img;
  assert.notDeepEqual(px(t2, 3, 3), px(t2, 3, 15));
});

test('shading: a strong left-lit gradient is flattened; a balanced image is left alone', () => {
  const img = blank(60, 60);
  for (let x = 0; x < 60; x++) { const v = Math.round(220 - x * 2.4); fill(img, x, 0, x + 1, 60, [v, v - 10, v - 20, 255]); }
  const lb = lightBalance(img);
  assert.ok(lb.imbalance < -0.12, 'lit from the left: ' + lb.imbalance);
  const r = flattenShading(img);
  assert.equal(r.light.flattened, true); assert.equal(r.light.from, 'left');
  assert.ok(Math.abs(lightBalance(r.img).imbalance) < 0.04, 'after: ' + lightBalance(r.img).imbalance);
  const flat = blank(30, 30); fill(flat, 0, 0, 30, 30, [120, 130, 110, 255]);
  const f = flattenShading(flat);
  assert.equal(f.light.flattened, false);
  assert.deepEqual(px(f.img, 10, 10), px(flat, 10, 10));
  const hot = blank(10, 10); fill(hot, 0, 0, 10, 10, [255, 255, 255, 255]);
  assert.ok(flattenShading(hot).clamped > 0, 'pure white highlights are clamped');
});

test('shadow: a baked cast shadow below and beside the base is cut; the body and a dark tyre inside it stay', () => {
  const img = blank(80, 70);
  fill(img, 20, 10, 40, 50, [70, 120, 50, 255]);          // the body (a green trunk-and-crown block), base row 49
  fill(img, 24, 44, 30, 50, [30, 30, 32, 255]);           // a dark tyre INSIDE the body's base columns
  for (let y = 48; y < 60; y++) for (let x = 10; x < 75; x++) {   // a soft dark shadow ellipse to the right, under and beside the base
    const e = ((x - 45) / 32) ** 2 + ((y - 53) / 6) ** 2;
    if (e <= 1 && !(x >= 20 && x < 40 && y < 50)) img.data.set([40, 42, 44, 170], (y * 80 + x) * 4);
  }
  const r = removeCastShadow(img);
  assert.ok(r.removed > 200, 'removed ' + r.removed);
  assert.equal(px(r.img, 60, 53)[3], 0, 'the shadow beside the base is gone');
  assert.equal(px(r.img, 30, 55)[3], 0, 'the shadow below the base is gone');
  assert.equal(px(r.img, 30, 30)[3], 255, 'the body is kept');
  assert.equal(px(r.img, 26, 47)[3], 255, 'the tyre inside the body is kept');
  // a tree: a dark grey-brown opaque trunk under the canopy is the object, not a shadow; the flat strip thrown to the right is
  const tree = blank(80, 64);
  fill(tree, 10, 0, 50, 30, [70, 120, 50, 255]);         // the canopy
  fill(tree, 27, 30, 33, 62, [62, 58, 54, 255]);          // a dark, low-saturation, opaque trunk (to the bottom)
  fill(tree, 33, 59, 78, 62, [48, 48, 50, 255]);          // a flat opaque cast shadow along the ground to the right
  const t = removeCastShadow(tree);
  assert.equal(px(t.img, 30, 45)[3], 255, 'the trunk is kept');
  assert.equal(px(t.img, 30, 61)[3], 255, 'the trunk foot is kept');
  assert.equal(px(t.img, 70, 60)[3], 0, 'the shadow beyond the canopy is cut');
  // tyres and the dark underbody of a bus sit under its body: kept
  const bus = blank(90, 40);
  fill(bus, 5, 0, 85, 30, [190, 40, 35, 255]); fill(bus, 5, 30, 85, 33, [40, 40, 42, 255]); fill(bus, 15, 28, 25, 38, [25, 25, 25, 255]); fill(bus, 65, 28, 75, 38, [25, 25, 25, 255]);
  const b2 = removeCastShadow(bus);
  assert.equal(b2.removed, 0, b2.op);
});

test('outlines: a 3 px black outline is recoloured to a house tone and thinned to 1.5 px', () => {
  const img = blank(52, 52);
  fill(img, 6, 6, 46, 46, [0, 0, 0, 255]);                 // the black outline ring (3 px) ...
  fill(img, 9, 9, 43, 43, [170, 110, 80, 255]);           // ... round a brick-ish interior
  const r = outlines(img, PAL, { groups: ['brick', 'stone', 'render'] });
  assert.ok(r.recoloured > 0 && r.thinned > 0, r.op);
  let black = 0;
  for (let i = 0; i < 52 * 52; i++) if (r.img.data[i * 4 + 3] > 128 && L(Array.from(r.img.data.subarray(i * 4, i * 4 + 3))) < 12) black++;
  assert.equal(black, 0, 'no black outline pixels remain');
  const outer = L(px(r.img, 6, 25)), inner3 = L(px(r.img, 8, 25)), body = L(px(r.img, 25, 25));
  assert.ok(outer < body - 10, 'an outline remains at the edge, in a darker house tone');
  assert.ok(Math.abs(inner3 - body) < 6, 'the third outline row takes the interior colour');
  const edgeTone = px(r.img, 6, 25).slice(0, 3);
  assert.ok(PAL.all.some(e => deltaE76(e.lab, rgbToLab(edgeTone)) < 1), 'the edge is a house colour');
});

test('fringe: a white matte halo is decontaminated', () => {
  const img = blank(40, 40);
  fill(img, 8, 8, 32, 32, [60, 110, 50, 255]);
  for (let i = 7; i <= 32; i++) for (const [x, y] of [[i, 7], [i, 32], [7, i], [32, i]]) img.data.set([158, 182, 152, 128], (y * 40 + x) * 4);   // 50 % green over white at alpha 128
  const r = defringe(img);
  assert.ok(r.cleaned >= 80, r.op);
  const c = px(r.img, 20, 7).slice(0, 3);
  assert.ok(deltaE76(rgbToLab(c), rgbToLab([60, 110, 50])) < 10, 'the halo pixel is the object colour again: ' + c);
  assert.equal(px(r.img, 20, 7)[3], 128, 'its alpha is kept');
});

test('checks: an anchor off by 10 % is reported; padding, background, budget', () => {
  const img = blank(60, 100);
  fill(img, 26, 0, 46, 100, [90, 90, 90, 255]);           // the content's contact centre is at x = 36, the anchor at 30: 6 % ... widen it
  const ok = checkImage(img, { size: [20, 100], anchor: 'bottom-centre', category: 'person' }, { bytes: 4000 });
  const a = ok.find(c => c.check === 'anchor');
  assert.equal(a.ok, false, a.value);
  const img2 = blank(60, 100); fill(img2, 0, 0, 60, 100, [90, 90, 90, 255]); fill(img2, 0, 90, 20, 100, [0, 0, 0, 0]);   // bottom contact at x 40 of 60 (10 % of the height off)
  const off = checkImage(img2, { size: [60, 100], anchor: 'bottom-centre' }).find(c => c.check === 'anchor');
  assert.equal(off.ok, false); assert.match(off.message, /10 % of the height/);
  const good = blank(40, 100); fill(good, 0, 0, 40, 100, [90, 90, 90, 255]);
  const g = checkImage(good, { size: [40, 100], anchor: 'bottom-centre', category: 'person', real: { h: 1.75 } }, { bytes: 2000 });
  assert.ok(g.find(c => c.check === 'anchor').ok && g.find(c => c.check === 'padding').ok && g.find(c => c.check === 'real').ok, JSON.stringify(g));
  const padded = blank(60, 60); fill(padded, 20, 20, 40, 40, [90, 90, 90, 255]);
  assert.equal(checkImage(padded, {}).find(c => c.check === 'padding').ok, false);
  const big = checkImage(good, {}, { bytes: 300 * 1024 }).find(c => c.check === 'bytes');
  assert.equal(big.ok, false);
  const flatBg = blank(30, 30); fill(flatBg, 0, 0, 30, 30, [255, 0, 255, 255]); fill(flatBg, 10, 10, 20, 30, [90, 90, 90, 255]);
  assert.equal(checkImage(flatBg, {}).find(c => c.check === 'background').ok, false, 'a magenta background is not transparent');
});

test('normaliseImage: the whole pass lowers the distance to the house palette; overlays are untouched', () => {
  const img = blank(48, 64);
  fill(img, 10, 4, 38, 50, [40, 255, 90, 255]);           // a neon crown
  fill(img, 21, 50, 27, 64, [150, 60, 200, 255]);         // a purple trunk
  const r = normaliseImage(img, PAL, { category: 'tree', season: 'summer' });
  assert.ok(r.report.deltaE.after < r.report.deltaE.before, JSON.stringify(r.report.deltaE));
  assert.ok(r.report.ops.length >= 5);
  const o = normaliseImage(img, PAL, { category: 'tree', kind: 'overlay' });
  assert.equal(o.img, img);
});

test('RGBA PNG round trip', () => {
  const img = blank(13, 7);
  for (let i = 0; i < img.data.length; i++) img.data[i] = (i * 37) & 255;
  const back = pngDecode(pngEncodeRGBA(13, 7, img.data));
  assert.equal(back.width, 13); assert.equal(back.height, 7);
  assert.deepEqual(Array.from(back.data), Array.from(img.data));
});

test('object normalise --write backs up the originals and annotates meta.json; the dry run writes nothing', async () => {
  const { default: cmd } = await import('../tools/lib/object-cmd/normalise.mjs');
  const { OBJECT_SUBS, default: objectCmd } = await import('../tools/lib/anim-cmd/object.mjs');
  assert.equal(OBJECT_SUBS.normalise, cmd, 'object <sub> delegates to tools/lib/object-cmd/<sub>.mjs');
  assert.ok(objectCmd.options.write && objectCmd.options['all-raster'], 'the sub-command options merge into object');
  const root = mkdtempSync(join(tmpdir(), 'v2h-norm-'));
  try {
    const dir = join(root, 'assets', 'objects', 'tree', 'test-ai');
    mkdirSync(dir, { recursive: true }); mkdirSync(join(root, 'tools'));
    writeFileSync(join(root, 'tools', 'scene-house-palette.json'), JSON.stringify(PAL_JSON));
    const img = blank(40, 60);
    fill(img, 4, 0, 36, 44, [40, 255, 90, 255]); fill(img, 17, 44, 23, 60, [150, 60, 200, 255]);
    const png = pngEncodeRGBA(40, 60, img.data);
    writeFileSync(join(dir, 'base.png'), png);
    writeFileSync(join(dir, 'lit.png'), png);
    const meta = { id: 'tree.test-ai', category: 'tree', size: [40, 60], anchor: 'bottom-centre', res: 1, variants: [{ base: 'base.png', lit: 'lit.png' }], tags: ['kit:temperate', 'role:tree', 'raster'] };
    writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 1));
    const out = [];
    const ctx = { root, out: (s) => out.push(s), err: (s) => out.push(s), positionals: ['normalise', 'tree.test-ai'] };
    assert.equal(await cmd.run({}, ctx, { loadRegistry: () => { throw new Error('no registry in a temp root'); } }), 0);
    assert.deepEqual(readFileSync(join(dir, 'base.png')), png, 'a dry run writes nothing');
    assert.ok(!existsSync(join(root, '.anim-ref')));
    assert.match(out.join('\n'), /tree\.test-ai\s+delta E to the house palette/);
    out.length = 0;
    assert.equal(await cmd.run({ write: true, json: true }, ctx, { loadRegistry: () => { throw new Error('no registry'); } }), 0);
    const rep = JSON.parse(out.join('\n'));
    assert.equal(rep.written, true); assert.equal(rep.objects[0].id, 'tree.test-ai');
    const bak = join(root, '.anim-ref', 'normalise-backup', 'tree.test-ai', 'base.png');
    assert.deepEqual(readFileSync(bak), png, 'the original is backed up');
    assert.ok(!existsSync(join(root, '.anim-ref', 'normalise-backup', 'tree.test-ai', 'lit.png')), 'overlays are neither changed nor backed up');
    assert.notDeepEqual(readFileSync(join(dir, 'base.png')), png, 'the image is replaced');
    assert.deepEqual(readFileSync(join(dir, 'lit.png')), png, 'the lit overlay is untouched');
    const m2 = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    assert.equal(m2.normalised.v, 1); assert.match(m2.normalised.palette, /^scene-house-palette\.json@[0-9a-f]{8}$/);
    assert.ok(m2.normalised.deltaE.after < m2.normalised.deltaE.before); assert.ok(m2.normalised.ops.includes('palette'));
    const dec = pngDecode(readFileSync(join(dir, 'base.png')));
    assert.equal(dec.width, 40); assert.equal(dec.height, 60);
    // --strict: a failing check exits 2 (an anchor 10 % off)
    const off = blank(40, 60); fill(off, 0, 0, 40, 60, [90, 90, 90, 255]); fill(off, 0, 54, 14, 60, [0, 0, 0, 0]);
    writeFileSync(join(dir, 'base.png'), pngEncodeRGBA(40, 60, off.data));
    out.length = 0;
    assert.equal(await cmd.run({ strict: true }, ctx, { loadRegistry: () => { throw new Error('no registry'); } }), 2);
    assert.match(out.join('\n'), /FAIL\s+anchor/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
