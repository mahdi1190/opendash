// The v2 renderer integration (docs/dev/SCENE_ENGINE_V2.md 13, 14 and 27.2; builder B): the render-pass registry and the
// light key in Node; the canvas hooks, the water and shadow passes, v1 pixel identity and the frame budget in headless
// Chrome (skipped when no browser is found). The canal fixture is tests/fixtures/scene-v2-b-canal.js (a compiled v2 scene
// built by hand, so these tests do not wait for A's v2 compile); its page is tests/fixtures/scene-v2-b-page.mjs.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes, scenePageHtml } from '../tools/lib/scene-page.mjs';
import { findBrowser } from '../tools/lib/anim-render.mjs';
import { launchChrome } from '../tools/release-chrome.mjs';
import { v2bPageHtml } from './fixtures/scene-v2-b-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CANAL = readFileSync(join(ROOT, 'tests', 'fixtures', 'scene-v2-b-canal.js'), 'utf8');
const S = loadScenes(ROOT, { fixtures: true, browser: true, extra: CANAL });
const V1 = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'scene-compiled.json'), 'utf8'));
// the commit before any v2 engine edit (the spec and A's v1 hashes only): the "before" of the pixel-identity check
const BASE = process.env.SCENE_V2_BASE || '5fa23d9';
const AT = { noon: '2026-10-08T12:10:00Z', golden: '2026-10-08T16:55:00Z', night: '2026-10-08T21:30:00Z' };

/* ---------- the pass registry (Node) ---------- */
test('the pass registry: order by stage, applies, and no pass ever runs on a v1 compiled scene', () => {
  const C = S.sceneV2BCanal();
  const ids = (stage) => S.sceneRenderPasses(stage, C).map(p => p.id);
  const under = ids('layer:under');
  assert.ok(under.indexOf('water') >= 0 && under.indexOf('shadow') > under.indexOf('water'), 'layer under: water 20 before shadow 30: ' + under);
  const fg = ids('frameGroup');
  assert.ok(fg.indexOf('shadow') > fg.indexOf('water'), 'frameGroup: water 20 before shadow 25: ' + fg);
  assert.ok(ids('group').includes('water'), 'the water pass has a group stage (reflections, masks)');
  assert.deepEqual(S.sceneRenderPasses('layer:under', V1), [], 'v1: no pass');
  assert.deepEqual(S.sceneRenderPasses('prebake', V1), [], 'v1: no prebake');
  assert.equal(S.sceneRenderIsV2(V1), false);
  assert.equal(S.sceneRenderIsV2(Object.assign({}, V1, { fx: { shadows: 2 } })), true, 'a v1 scene opts in with fx');
  assert.ok(S.sceneRenderPasses('layer:under', Object.assign({}, V1, { fx: { shadows: 2 } })).some(p => p.id === 'shadow'), 'fx shadows: the shadow pass applies');
  assert.ok(!S.sceneRenderPasses('layer:under', Object.assign({}, V1, { fx: { shadows: 2 } })).some(p => p.id === 'water'), 'but not the water pass');
  // a pass defined with a per-stage order sorts by it; redefining an id replaces it
  S.sceneRenderPassDefine({ id: 'test-order', order: { 'layer:under': 25, default: 99 }, applies: (c) => c.v === 2, layer() {} });
  const u2 = ids('layer:under');
  assert.ok(u2.indexOf('test-order') > u2.indexOf('water') && u2.indexOf('test-order') < u2.indexOf('shadow'), 'between 20 and 30: ' + u2);
  S.sceneRenderPassDefine({ id: 'test-order', applies: () => false, layer() {} });
  assert.ok(!ids('layer:under').includes('test-order'), 'replaced, and applies() false: gone');
  assert.throws(() => S.sceneRenderPassDefine({ id: 'Bad Id', applies() {} }), /bad id/);
});

test('the light key: unchanged for v1 scenes; v2 scenes append the pass keys; sceneFrameDraws counts the v2 estimates', () => {
  const L = { alt: 6.2, cover: 0.3, moon: { show: false }, windows: false, fog: false, sun: { rel: -5, x: 683, show: true }, lowSun: '#ffb070' };
  assert.equal(S.sceneLightKey(L, 'autumn', V1), S.sceneLightKey(L, 'autumn'), 'v1: the same key with or without C');
  const C = S.sceneV2BCanal();
  const k = S.sceneLightKey(L, 'autumn', C);
  assert.ok(k.startsWith(S.sceneLightKey(L, 'autumn') + '|') && /shadow:/.test(k) && /water:/.test(k), k);
  assert.notEqual(S.sceneLightKey(Object.assign({}, L, { sun: { rel: 60, x: 2000, show: true } }), 'autumn', C), k, 'the sun moving round re-bakes a v2 scene');
  const base = archive();
  if (base) assert.equal(S.sceneFrameDraws(V1), loadScenes(base, { fixtures: true }).sceneFrameDraws(V1), 'v1: as the base commit counts');
  assert.equal(S.sceneFrameDraws(C), S.sceneFrameDraws(Object.assign({}, C, { stats: Object.assign({}, C.stats, { v2: null }) })) + C.stats.v2.fxDraws, 'v2: + fxDraws');
});

test('the SVG still: v2 has the shadow filter group and the water edges, stays within the budgets; v1 markup unchanged', () => {
  const Sx = loadScenes(ROOT, { fixtures: true, extra: CANAL + '\n;globalThis.__svgOf = (C, o) => { const keep = sceneCompile; sceneCompile = () => C; try { return sceneSvg({ v: 1, id: C.id, view: C.view }, o); } finally { sceneCompile = keep; } };' });
  const C = Sx.sceneV2BCanal(), svg = globalThis.__svgOf(C, { size: 'fill' }), again = globalThis.__svgOf(C, { size: 'fill' });
  const noIds = (s) => s.replace(/sc[0-9a-z]+-[0-9a-z]+/g, 'ID');
  assert.equal(noIds(svg), noIds(again), 'deterministic');
  assert.ok(/<g class="sc-shadow" filter="url\(#[^)]+\)"/.test(svg) && /<feFlood/.test(svg) && /<feGaussianBlur/.test(svg), 'the shadow filter group');
  assert.ok(svg.length <= Sx.SCENE_SVG_FILL_MAX_BYTES, 'fill budget ' + svg.length);
  // the tile (LOD .3): v2 adds next to nothing to the markup of the same scene drawn as v1 (the fixture's big trees are
  // its own weight; the 150 KB tile budget is the lint's, per scene)
  const tile = globalThis.__svgOf(Sx.sceneV2BCanal({ lod: 0.3, id: 'v2b-tile' }), { size: 'lg', lod: 0.3 });
  const C1 = Sx.sceneV2BCanal({ lod: 0.3, id: 'v2b-tile-v1' }); C1.v = 1;
  const tile1 = globalThis.__svgOf(C1, { size: 'lg', lod: 0.3 });
  assert.ok(tile.length <= tile1.length * 1.05 + 4000, 'tile: v2 ' + tile.length + ' vs v1 ' + tile1.length);
  assert.ok(svg.length <= globalThis.__svgOf(Object.assign(Sx.sceneV2BCanal({ id: 'v2b-v1' }), { v: 1 }), { size: 'fill' }).length * 1.05 + 4000, 'fill: v2 adds next to nothing');
  // v1: byte-identical markup (but the fresh ids) to the SVG renderer of the base commit
  const base = archive();
  if (!base) return;
  const B = loadScenes(base, { fixtures: true });
  const A = loadScenes(ROOT, { fixtures: true });
  for (const x of ['SCENE_TEST_TINY', 'sceneTestDense']) {
    const data = typeof A[x] === 'function' ? A[x]() : A[x], dataB = typeof B[x] === 'function' ? B[x]() : B[x];
    for (const o of [{ size: 'fill' }, { size: 'lg' }, { size: 'fill', season: 'winter' }]) assert.equal(noIds(A.sceneSvg(data, o)), noIds(B.sceneSvg(dataB, o)), x + ' ' + JSON.stringify(o));
  }
});

/* ---------- headless Chrome ---------- */
const browser = findBrowser();
let chrome = null, baseDir = null;
/** The base commit's src, tools and tests in a temp dir (git archive, not a worktree), or null without git. */
function archive() {
  if (baseDir) return baseDir;
  try {
    const dir = mkdtempSync(join(tmpdir(), 'v2b-base-'));
    execSync(`git archive --format=tar ${BASE} src tools tests | tar -x -C "${dir.replace(/\\/g, '/')}"`, { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'], shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh' });
    if (!existsSync(join(dir, 'src', 'app', '78-scene-canvas.js'))) return null;
    baseDir = dir;
    return dir;
  } catch (e) { return null; }
}
before(async () => { if (browser) chrome = await launchChrome({ executable: browser }); });
after(async () => { if (chrome) await chrome.close(); if (baseDir) rmSync(baseDir, { recursive: true, force: true }); });
const load = async (opts) => {
  await chrome.screenshot({ html: v2bPageHtml(Object.assign({ root: ROOT, still: true }, opts)), width: 1600, height: 900, transparent: false });
  const ok = await chrome.evaluate('JSON.stringify({ ready: !!(window.__v2b && window.__v2b.ready), err: window.__sceneErrors })');
  const r = JSON.parse(ok);
  assert.ok(r.ready, 'page ready: ' + JSON.stringify(r.err));
  assert.deepEqual(r.err, [], 'no page errors');
};
/** Pixels of the canvas in a box (device px) as a hash, after frame(t) (t null: no new frame). */
const pix = (box, t) => chrome.evaluate(`(() => { const v = window.__v2b; ${t == null ? '' : `v.r.frame(${t});`} const c = document.getElementById('c').getContext('2d');
  const b = ${JSON.stringify(box)}, d = c.getImageData(b[0], b[1], b[2] - b[0], b[3] - b[1]).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); })()`);

test('canvas: the v2 canal renders, the passes report their draws, a still equals the frame at t = 0', { skip: !browser }, async () => {
  await load({ at: AT.golden, t: 0 });
  const st = JSON.parse(await chrome.evaluate('JSON.stringify(window.__v2b.r.stats())'));
  assert.ok(st.passes && st.passes.water && st.passes.shadow, 'r.stats().passes: ' + JSON.stringify(st.passes));
  assert.ok(st.passes.water.draws > 0 && st.passes.water.regions === 1 && st.passes.water.rings > 0, 'water draws, regions, rings');
  assert.ok(st.passes.shadow.casters > 0 && st.passes.shadow.contacts > 0, 'shadow casters and contacts');
  assert.ok(st.animatedDraws <= 300, 'the 300 draw budget: ' + st.animatedDraws);
  const full = [0, 0, 1600, 900];
  const stats = JSON.parse(await chrome.evaluate(`(() => { const c = document.getElementById('c').getContext('2d'), d = c.getImageData(0, 0, 1600, 900).data; let n = 0, s = 0; for (let i = 0; i < d.length; i += 4 * 97) { n++; s += d[i] + d[i + 1] + d[i + 2]; } return JSON.stringify({ mean: s / n / 3 }); })()`));
  assert.ok(stats.mean > 30 && stats.mean < 240, 'not blank: ' + stats.mean);
  const a = await pix(full, 0), b = await pix(full, 0);
  assert.equal(a, b, 'frame(0) twice: the same pixels');
  await load({ at: AT.golden, t: 0, still: false });
  assert.equal(await pix(full, 0), a, 'a still and a live renderer agree at t = 0');
});

test('canvas: the ripple moves the water over t while the masked reed in front of it does not change', { skip: !browser }, async () => {
  await load({ at: AT.golden, t: 1 });
  const geo = JSON.parse(await chrome.evaluate(`(() => { const C = window.__v2b.C, it = C.items.find(i => i.o === 'plant.reed' && i.dz > 50), sh = sceneObjShapes(it.o, it.v, it.season);
    return JSON.stringify({ reed: [Math.floor(it.x + sh.box[0] * it.s) + 2, Math.floor(it.y + sh.box[1] * it.s) + 2, Math.ceil(it.x + sh.box[2] * it.s) - 2, Math.floor(it.y) - 1], layer: it.layer, wl: C.water[0].layer }); })()`));
  assert.equal(geo.layer, geo.wl, 'the far reed is in the water\'s own layer (its bake group)');
  // a patch of open water in the near canal (no birds, no reflections of movers there) and the reed's own pixels
  const water = [640, 560, 1150, 880];
  // the mask: where the reed's shapes are opaque, the 15 Hz ripple scratch (blitted over the group bitmap) must be clear
  const m = JSON.parse(await chrome.evaluate(`(() => { const v = window.__v2b; v.r.frame(1.3); const C = v.C, it = C.items.find(i => i.o === 'plant.reed' && i.dz > 50), sh = sceneObjShapes(it.o, it.v, it.season);
    // the very sprite the reed is drawn with (env.itemSprite), placed as the bake places it
    const env = v.r.env, R = env.water.regions[0], b = ${JSON.stringify(geo.reed)}, w = b[2] - b[0] + 8, h = b[3] - b[1] + 8, oc = new OffscreenCanvas(w, h), x = oc.getContext('2d');
    const sp = env.itemSprite(C.items.indexOf(it)), M = env.placeM(it.x, it.y, it.s, it.flip);
    x.setTransform(M[0], M[1], M[2], M[3], M[4] - (b[0] - 4), M[5] - (b[1] - 4)); x.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h);
    const a = x.getImageData(0, 0, w, h).data, sc = R.scratch.getContext('2d').getImageData(b[0] - 4 - R.db[0], b[1] - 4 - R.db[1], w, h).data;
    let n = 0, leak = 0, open = 0;
    for (let k = 0; k < a.length; k += 4) { if (a[k + 3] === 255) { n++; if (sc[k + 3] > 24) leak++; } else if (sc[k + 3] > 24) open++; }
    return JSON.stringify({ n, leak, open }); })()`));
  assert.ok(m.n > 5, 'the reed covers pixels: ' + JSON.stringify(m));
  assert.equal(m.leak, 0, 'the ripple never paints over the reed: ' + JSON.stringify(m));
  assert.ok(m.open > 0, 'and does paint the water round it: ' + JSON.stringify(m));
  const w1 = await pix(water, 1.0), w2 = await pix(water, 1.6);
  assert.notEqual(w1, w2, 'the ripple (and glints) change the water between frames');
  assert.equal(await pix(water, 1.0), w1, 'the ripple is a function of t (quantised): the same t, the same pixels');
});

test('canvas: shadows point away from the sun (the centroid of the darkened pixels from the foot)', { skip: !browser }, async () => {
  // the left oak at (-16 m, 32 m); with and without the shadow pass (without it, the v1 ellipses: only pixels that get darker count)
  const darker = async (at) => {
    await load({ at, t: 0, only: ['water'] });
    const before = await chrome.evaluate(`Array.from(document.getElementById('c').getContext('2d').getImageData(0, 520, 800, 380).data.filter((v, i) => i % 4 === 1)).join(',')`);
    await load({ at, t: 0, only: ['water', 'shadow'] });
    const r = await chrome.evaluate(`(() => { const C = window.__v2b.C, it = C.items.find(i => i.o === 'tree.oak' && i.dz === 32); return JSON.stringify({ x: it.x, y: it.y }); })()`);
    const foot = JSON.parse(r);
    const after = await chrome.evaluate(`Array.from(document.getElementById('c').getContext('2d').getImageData(0, 520, 800, 380).data.filter((v, i) => i % 4 === 1)).join(',')`);
    const b = before.split(',').map(Number), c = after.split(',').map(Number);
    let n = 0, sx = 0, sy = 0;
    for (let i = 0; i < b.length; i++) if (b[i] - c[i] > 12) { n++; sx += i % 800; sy += 520 + Math.floor(i / 800); }
    assert.ok(n > 200, 'a cast shadow darkens the ground: ' + n);
    return { dx: sx / n - foot.x, dy: sy / n - foot.y };
  };
  const noon = await darker(AT.noon);
  assert.ok(noon.dx > 20, 'noon, the sun on the left (rel -72): the shadows fall to the right: ' + JSON.stringify(noon));
  const gold = await darker(AT.golden);
  assert.ok(gold.dy > 15, 'golden hour, the sun ahead: the shadows come toward the camera: ' + JSON.stringify(gold));
});

test('canvas: the frame budget at 1600 x 900 with water and shadows on (drawMs median <= 8 ms, x 1.75 in software)', { skip: !browser }, async (t) => {
  await load({ at: AT.golden, t: 2, still: false, flush: true, governor: false });
  const r = JSON.parse(await chrome.evaluate(`(async () => {
    const r = window.__v2b.r; await new Promise(res => setTimeout(res, 200)); r.resetStats();
    const t0 = performance.now();
    await new Promise(res => { const f = (now) => { r.frame((now - t0) / 1000 + 2); if (now - t0 < 2500) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    return JSON.stringify(r.stats()); })()`));
  const sw = 1.75;   // headless Chrome here runs --disable-gpu: software raster (V2 25)
  assert.ok(r.drawMs.n > 30, 'frames ' + r.drawMs.n);
  if (r.drawMs.median > 8 * sw || r.dynMs.median > 6 * sw) {
    // a busy machine (other test runs) slows every frame: then the same scene drawn by the v1 path, measured now, must be at
    // least half as slow (the v2 passes may not cost more than the v1 frame they sit on)
    await load({ at: AT.golden, t: 2, still: false, flush: true, governor: false, passes: false });
    const v1 = JSON.parse(await chrome.evaluate(`(async () => { const r = window.__v2b.r; await new Promise(res => setTimeout(res, 200)); r.resetStats(); const t0 = performance.now();
      await new Promise(res => { const f = (now) => { r.frame((now - t0) / 1000 + 2); if (now - t0 < 2500) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); }); return JSON.stringify(r.stats()); })()`));
    t.diagnostic(`busy machine: v2 drawMs ${r.drawMs.median}, the v1 path ${v1.drawMs.median}`);
    assert.ok(r.drawMs.median <= v1.drawMs.median * 1.5 + 1, `drawMs median ${r.drawMs.median} against the v1 path ${v1.drawMs.median}`);
  }
  assert.ok(r.firstBakeMs <= 600 * sw, 'first bake ' + r.firstBakeMs);
  assert.ok(r.passes.water.frameMs < 3 * sw, 'the water pass per frame ' + r.passes.water.frameMs);
});

// v1 pixel identity (V2 14.1): eight composed scenes, at noon and at night, before (the base commit, from git archive) and after
const SAMPLES = ['uk-area-yateley/hampshire-yateley-common-1', 'uk-area-yateley/hampshire-wyndhams-pool-1', 'uk-area-fleet/hampshire-fleet-pond-1', 'uk-area-woking-b/surrey-woking-commercial-way',
  'uk-area-sheffield/south-yorkshire-kelham', 'uk-area-norwich/norwich-cathedral-close', 'scene-demo/station-arnos-grove', 'uk-area-woking/surrey-woking-canal'];
test('canvas: v1 scenes are pixel-identical to the base commit (8 samples, noon and night)', { skip: !browser || process.env.SCENE_V2_SKIP_IDENTITY === '1' }, async (t) => {
  const base = archive();
  if (!base) { t.skip('no git archive of ' + BASE); return; }
  const shot = async (root, ref, at) => {
    await chrome.screenshot({ html: scenePageHtml({ root, refs: [ref], at, still: true, size: { w: 800, h: 450 } }), width: 800, height: 450, transparent: false });
    const ok = await chrome.evaluate('Promise.race([window.__sceneReady, new Promise(r => setTimeout(() => r("timeout"), 20000))])');
    assert.equal(ok, true, 'ready: ' + ref);
    return chrome.capture({ width: 800, height: 450, scale: 1 });
  };
  // identical PNG bytes; headless Chrome's raster threads now and then move a single anti-aliased pixel by a few levels
  // between two runs of the SAME page (seen base against base), so a mismatch is retaken once and then compared pixel by
  // pixel: at most 4 pixels off by at most 8 levels is that noise, anything more is a change
  const pixels = async (a, b) => JSON.parse(await chrome.evaluate(`(async () => {
    const load = (b64) => createImageBitmap(new Blob([Uint8Array.from(atob(b64), c => c.charCodeAt(0))], { type: 'image/png' }));
    const [A, B] = await Promise.all([load(${JSON.stringify(a.toString('base64'))}), load(${JSON.stringify(b.toString('base64'))})]);
    const get = (im) => { const c = new OffscreenCanvas(im.width, im.height), x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, im.width, im.height).data; };
    const p = get(A), q = get(B); let n = 0, m = 0;
    for (let i = 0; i < p.length; i += 4) { const d = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2])); if (d) { n++; m = Math.max(m, d); } }
    return JSON.stringify({ n, m }); })()`));
  const diffs = [], noise = [];
  for (const ref of SAMPLES) for (const at of [AT.noon, AT.night]) {
    let a = await shot(base, ref, at), b = await shot(ROOT, ref, at);
    if (Buffer.compare(a, b) === 0) continue;
    a = await shot(base, ref, at); b = await shot(ROOT, ref, at);
    if (Buffer.compare(a, b) === 0) continue;
    const d = await pixels(a, b);
    if (d.n <= 4 && d.m <= 8) noise.push(ref + ' @ ' + at + ' ' + JSON.stringify(d)); else diffs.push(ref + ' @ ' + at + ' ' + JSON.stringify(d));
  }
  if (noise.length) t.diagnostic('raster noise only: ' + noise.join('; '));
  assert.deepEqual(diffs, [], 'v1 scenes changed: ' + diffs.join(', '));
});
