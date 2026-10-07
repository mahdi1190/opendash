// The scene engine's renderers (docs/dev/SCENE_ENGINE.md 6 and 10.1; builder B): the SVG still renderer and the shared
// pure helpers in Node, and the canvas renderer and host in headless Chrome (skipped when no browser is found).
// The placeholder objects and test scenes live in tests/fixtures/scene-test-*.js; until the core lands, the core shim
// (tests/fixtures/scene-core-shim.js) stands in for 70-scene-0core.js (tools/lib/scene-page.mjs picks it).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes, scenePageHtml, scenePageRows, scenePerf } from '../tools/lib/scene-page.mjs';
import { findBrowser } from '../tools/lib/anim-render.mjs';
import { launchChrome } from '../tools/release-chrome.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = loadScenes(ROOT, { fixtures: true });
const FIXTURE = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'scene-compiled.json'), 'utf8'));
const clone = (x) => JSON.parse(JSON.stringify(x));
const noIds = (s) => s.replace(/sc[0-9a-z]+-[0-9a-z]+/g, 'ID');
const meta = (id) => ({ id, label: 'Renderer test', site: 'test', tags: ['test', 'demo', 'renderer', 'scene', 'engine', 'canvas'], mood: 'calm', colour: 'blue', when: () => false });

/* ---------- expansion (the compiled form both renderers draw) ---------- */
test('expansion is deterministic, LOD thins scatter, and the dense test scene has ~3,000 placements and 40 actors', () => {
  const a = S.sceneCompile(S.sceneTestDense(), { season: 'summer', lod: 1 }), b = S.sceneCompile(S.sceneTestDense(), { season: 'summer', lod: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(a.items)), JSON.parse(JSON.stringify(b.items)), 'same data, same placements');
  assert.equal(a.actors.length, 40);
  assert.ok(a.stats.placements >= 2900 && a.stats.placements <= 3100, 'placements ' + a.stats.placements);
  const lo = S.sceneCompile(S.sceneTestDense(), { season: 'summer', lod: 0.3 });
  assert.ok(lo.items.length < a.items.length * 0.45, 'LOD 0.3 keeps about 30% of the scatter');
  assert.equal(lo.actors.length, 40, 'actors are always kept');
  const w = S.sceneCompile(S.sceneTestDense(), { season: 'winter', lod: 1 });
  assert.equal(w.items.length, a.items.length, 'a season changes colours, not placements');
});

/* ---------- the shared pure helpers ---------- */
test('the sprite cache key and the light key', () => {
  const k = (h, t, s, l) => S.sceneSpriteKey('tree.oak-test', 1, 'crown', 'summer', h, t, s, l);
  assert.equal(k(0.2, null, 1.5, 'L1'), k(0.2, null, 1.5, 'L1'), 'stable');
  assert.notEqual(k(0.2, null, 1.5, 'L1'), k(0.3, null, 1.5, 'L1'), 'haze');
  assert.notEqual(k(0.2, null, 1.5, 'L1'), k(0.2, ['#8a7a40', 0.08], 1.5, 'L1'), 'tint');
  assert.notEqual(k(0.2, null, 1.5, 'L1'), k(0.2, null, 1.75, 'L1'), 'scale');
  assert.notEqual(k(0.2, null, 1.5, 'L1'), k(0.2, null, 1.5, 'L2'), 'light');
  assert.equal(k(0.2, null, 1.5, 'L1'), k(0.2000001, null, 1.5000001, 'L1'), 'rounded');
  const L = (alt, o = {}) => Object.assign({ alt, cover: 0.3, moon: { show: false }, windows: alt < 3, fog: false }, o);
  const lk = (l) => S.sceneLightKey(l, 'summer');
  assert.notEqual(lk(L(5.4)), lk(L(5.6)), '1 degree steps at low sun');
  assert.equal(lk(L(31)), lk(L(32)), '5 degree steps by day');
  assert.notEqual(lk(L(2.9)), lk(L(3.1)), 'windows light at real dusk');
  assert.notEqual(lk(L(40)), lk(L(40, { cover: 0.8 })), 'cloud');
  assert.notEqual(S.sceneLightKey(L(40), 'summer'), S.sceneLightKey(L(40), 'winter'), 'season');
  const sb = S.sceneScaleBucket;
  assert.ok(Math.abs(sb(1.07) - 1) < 1e-9 && Math.abs(sb(0.5) - 0.5) < 1e-9, 'scale buckets');
});

test('motion helpers: actors, poses, flocks, particles (pure functions of t; t = 0 is the still)', () => {
  const a = { path: [[0, 0], [100, 0]], len: 100, speed: 10, loop: 'pingpong', s: 1, offset: 0.5 };
  assert.deepEqual([S.sceneActorAt(a, 0).x, S.sceneActorAt(a, 0).dir], [50, 1]);
  assert.equal(Math.round(S.sceneActorAt(a, 7).x), 80);
  assert.equal(S.sceneActorAt(a, 7).dir, -1, 'turns round at the end (pingpong)');
  assert.equal(Math.round(S.sceneActorAt(Object.assign({}, a, { loop: 'loop' }), 7).x), 20, 'loop wraps');
  assert.ok(S.sceneActorAt(Object.assign({}, a, { loop: 'fade', offset: 0.01 }), 0).alpha < 0.1, 'fade at the ends');
  const sway = { kind: 'sway', part: 'crown', pivot: [0, -120], deg: 2, period: 4, phase: 0, k: 1 };
  const p = S.sceneAnimPose(sway, 1.3, { wind: 1 }, 400).m;
  assert.ok(Math.abs(p[0] * 0 + p[2] * -120 + p[4]) < 1e-9 && Math.abs(p[1] * 0 + p[3] * -120 + p[5] + 120) < 1e-9, 'the pivot stays put');
  const fl = { kind: 'flicker', part: 'head', op: [0.6, 1], period: 2, phase: 0 };
  for (let t = 0; t < 4; t += 0.37) { const al = S.sceneAnimPose(fl, t, null, 0).alpha; assert.ok(al >= 0.6 - 1e-9 && al <= 1 + 1e-9); }
  const f = { n: 5, area: [0, 100, 1000, 200], speed: 30, s: 0.5, seed: 3 };
  assert.deepEqual(S.sceneFlockAt(f, 2, 1.5), S.sceneFlockAt(f, 2, 1.5), 'flocks are seeded');
  const ps = S.sceneParticleSet('snow', 20, 4);
  assert.deepEqual(ps, S.sceneParticleSet('snow', 20, 4));
  assert.equal(ps.length, 20);
});

test('budget: animated draws, bake bitmaps and the bake plan', () => {
  const C = S.sceneCompile(S.sceneTestDense(), { season: 'summer', lod: 1 });
  assert.ok(S.sceneFrameDraws(C) <= S.SCENE_DRAW_BUDGET, 'animated draws ' + S.sceneFrameDraws(C));
  const plan = S.sceneBakePlan(C);
  assert.ok(plan.length + 1 <= S.SCENE_MAX_BITMAPS, 'bitmaps incl. the sky');
  assert.deepEqual(plan.flatMap(g => g.layers), C.layers.map(l => l.i), 'every layer once, far to near');
  // eight layers that all move: merged down to five land bitmaps, still in order
  const eight = { layers: Array.from({ length: 8 }, (_, i) => ({ id: 'l' + i, i, depth: i / 8, haze: 0 })), items: Array.from({ length: 8 }, (_, i) => ({ layer: i, anim: [{ kind: 'bob' }], strip: -1 })), strips: [], actors: [], flocks: [], water: [] };
  const p8 = S.sceneBakePlan(eight);
  assert.equal(p8.length, S.SCENE_MAX_BITMAPS - 1);
  assert.deepEqual(p8.flatMap(g => g.layers), [0, 1, 2, 3, 4, 5, 6, 7]);
  // the hand-written compiled fixture
  assert.equal(S.sceneFrameDraws(FIXTURE), 3 + 1 + (1 + 2) + 1 + 4, 'fixture draws: sway, flicker, duck, strip, walker + legs, car, 4 gulls');
  assert.ok(S.sceneBakePlan(FIXTURE).length <= 5);
});

test('scenePathBox: absolute, relative, H/V, arcs, through a matrix', () => {
  assert.deepEqual(S.scenePathBox('M10 20L30 40'), [10, 20, 30, 40]);
  assert.deepEqual(S.scenePathBox('M10 20h10v-30z'), [10, -10, 20, 20]);
  assert.deepEqual(S.scenePathBox('M-160 500Q400 470 900 492T1760 488V900H-160Z'), [-160, 470, 1760, 900]);
  const arc = S.scenePathBox('M-5 0a5 5 0 1 0 10 0a5 5 0 1 0 -10 0z');
  assert.ok(arc[0] <= -5 && arc[1] <= -5 && arc[2] >= 5 && arc[3] >= 5, 'arcs are covered');
  assert.deepEqual(S.scenePathBox('M0 0L10 10', [2, 0, 0, 2, 5, 5]), [5, 5, 25, 25]);
});

/* ---------- the SVG still ---------- */
test('sceneSvg is deterministic apart from fresh ids, and fits the budgets', () => {
  const a = S.sceneSvg(S.SCENE_TEST_TINY, { size: 'fill' }), b = S.sceneSvg(S.SCENE_TEST_TINY, { size: 'fill' });
  assert.notEqual(a, b, 'fresh ids per render');
  assert.equal(noIds(a), noIds(b));
  const dense = S.sceneTestDense();
  const fill = S.sceneSvg(dense, { size: 'fill' }), lg = S.sceneSvg(dense, { size: 'lg' }), md = S.sceneSvg(dense, { size: 'md' });
  assert.ok(fill.length <= S.SCENE_SVG_FILL_MAX_BYTES, 'fill ' + fill.length);
  assert.ok(lg.length <= S.SCENE_SVG_TILE_MAX_BYTES, 'tile ' + lg.length);
  const uses = (s) => (s.match(/<use /g) || []).length;
  assert.ok(uses(lg) < uses(fill) * 0.5 && uses(md) < uses(lg), 'LOD thins the tiles');
  assert.doesNotMatch(fill, /<image|url\(\s*['"]?https?:|<script/i);
});

test('composed items render through animItemHtml as a sliced full scene (Node: the SVG renderer)', () => {
  const it = S.sceneItem(meta('renderer-tiny'), S.SCENE_TEST_TINY);
  const v = S.animRegisterPack({ id: 'scene-render-test', name: 'Renderer test', items: [it] });
  assert.ok(v.ok, JSON.stringify(v.errors));
  const html = S.animItemHtml('scene-render-test/renderer-tiny', { size: 'fill', live: true, lighting: false });
  assert.match(html, /viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice"/);
  assert.match(html, /class="sc-svg"/);
  assert.equal(S.sceneRendererFor(it, { size: 'fill' }), 'svg', 'no canvas in Node');
});

test('signs: <text> only inside g.sc-sign, escaped, in the system font; none without signage', () => {
  const data = Object.assign(clone(S.SCENE_TEST_TINY), { id: 'renderer-signs', signs: [{ layer: 'near', x: 300, y: 742, w: 220, h: 34, text: 'Elephant & Castle', bars: ['#b36305'], style: 'board' }, { layer: 'near', x: 900, y: 742, w: 200, h: 30, text: 'Mind the Gap', style: 'board' }] });
  const svg = S.sceneSvg(data, { size: 'fill' });
  const texts = svg.match(/<text[^>]*>[^<]*<\/text>/g) || [];
  assert.equal(texts.length, 1, 'the deny-listed sign is not drawn');
  assert.match(texts[0], />Elephant &amp; Castle<\/text>/);
  assert.match(texts[0], /font-family="system-ui/);
  assert.doesNotMatch(texts[0], /johnston/i);
  for (const m of svg.matchAll(/<text/g)) assert.match(svg.slice(Math.max(0, m.index - 400), m.index), /<g class="sc-sign">(?:(?!<\/g>).)*$/s, 'text is a direct child of g.sc-sign');
  assert.doesNotMatch(svg.match(/<g class="sc-sign">.*?<\/g>/s)[0], /<circle|<ellipse/, 'no circles in a sign');
  const off = S.sceneSvg(Object.assign(clone(data), { id: 'renderer-signs-off', signage: false }), { size: 'fill' });
  assert.doesNotMatch(off, /<text/);
});

test('lit parts and lit windows appear only after real dusk', () => {
  const day = S.sceneSvg(S.SCENE_TEST_TINY, { size: 'fill' });
  const night = S.sceneSvg(S.SCENE_TEST_TINY, { size: 'fill', sky: S.almSceneLight(Date.parse('2026-10-07T21:30:00Z'), 51.5, -0.12, 'UTC') });
  const litColour = /fill="#ffd98a" opacity="0.12"/;
  assert.doesNotMatch(day, litColour, 'no lit part by day');
  assert.match(night, litColour, 'the lit part at night (ungraded)');
  assert.ok((night.match(/fill="#ffd98a"/g) || []).length > (day.match(/fill="#ffd98a"/g) || []).length, 'lit windows at night');
});

test('sceneRendererFor and the host markup', () => {
  const C = loadScenes(ROOT, { fixtures: true, extra: 'function sceneCanvasSupported() { return true; }' });
  const it = C.sceneItem(meta('renderer-host'), C.SCENE_TEST_TINY);
  const R = (o) => C.sceneRendererFor(it, o);
  assert.deepEqual(['xs', 'sm', 'md', 'tip', 'dense'].map(size => R({ size })), ['svg', 'svg', 'svg', 'svg', 'svg']);
  assert.deepEqual(['lg', 'xl', 'hero', 'fill'].map(size => R({ size })), ['canvas', 'canvas', 'canvas', 'canvas']);
  assert.equal(R({ size: 'fill', renderer: 'svg' }), 'svg');
  assert.equal(R({ size: 'fill', reduced: true }), 'canvas', 'reduced motion: the canvas still');
  const attrs = C.sceneHostAttrs(it, { size: 'fill', live: true, lighting: false });
  assert.match(attrs, /^ data-sc-lod="1" data-sc-still="0" data-sc-hover="0" data-sc-sky="off" style="--sc-top:#[0-9a-f]{6};--sc-low:#[0-9a-f]{6}"$/);
  assert.match(C.sceneHostAttrs(it, { size: 'fill', detail: 'tile', live: true }), /data-sc-lod="0.5"/);
  assert.match(C.sceneHostAttrs(it, { size: 'lg', hover: true }), /data-sc-lod="0.3" data-sc-still="0" data-sc-hover="1"/);
  assert.match(C.sceneHostAttrs(it, { size: 'lg' }), /data-sc-still="1"/, 'a tile without hover is a still');
  assert.match(C.sceneHostAttrs(it, { size: 'fill', reduced: true, hover: true }), /data-sc-still="1" data-sc-hover="0"/);
  const sky = C.almSceneLight(Date.parse('2026-01-15T12:00:00Z'), 51.5, -0.12, 'UTC');
  assert.match(C.sceneHostAttrs(it, { size: 'fill', live: true, sky, season: 'winter' }), / data-sc-sky="\d+,51.5,-0.12" data-sc-season="winter"/);
});

test('the page harness: one box per ref, two captioned boxes per ref with compare', () => {
  const one = scenePageRows({ refs: ['a/b', 'c/d'] });
  assert.equal((one.match(/class="sp-box"/g) || []).length, 2);
  const cmp = scenePageRows({ refs: ['a/b', 'c/d'], compare: true });
  assert.equal((cmp.match(/class="sp-box"/g) || []).length, 4);
  assert.equal((cmp.match(/old: hand-drawn \(legacy\)/g) || []).length, 2);
  assert.equal((cmp.match(/new: composed/g) || []).length, 2);
  assert.match(cmp, /data-ref="a\/b" data-side="old"[^>]*><\/div>.*data-ref="a\/b" data-side="new"/s);
  const html = scenePageHtml({ root: ROOT, refs: ['a/b'], compare: true, at: '2026-10-07T21:30:00Z' });
  assert.match(html, /window\.__sceneOpts=\{[^<]*"compare":true/);
  assert.match(html, /function sceneRendererCreate/);
  assert.match(html, /function sceneHostScan/);
  assert.match(html, /\.ap-composed \.sc-canvas/);
});

/* ---------- the canvas clouds (6.3): the natural sky's plan, pure data the renderer paints ---------- */
// sceneCloudPlan and sceneCloudX are not in the harness's name list: the same bundle, returning them (extra is test-only source)
const SC = loadScenes(ROOT, { fixtures: true, extra: 'return { sceneCloudPlan, sceneCloudX, sceneCompile, sceneLight, SCENE_TEST_TINY };' });
const VIEW = { lat: 51.34, lon: -0.83, heading: 200, season: 'summer' };
const skyAt = (at, o) => Object.assign(SC.sceneLight({}, Object.assign({ at }, VIEW)), o || {});
const skyOf = (id, n, o) => ({ id, sky: { clouds: Object.assign({ n, y0: 60, y1: 320, speed: 6 }, o || {}) } });
const cloudCount = (n, cover) => Math.min(10, Math.max(1, Math.round(n * (0.45 + cover * 1.6))));
const shapeOf = (c) => JSON.stringify([c.kind, c.band, c.w, c.h, c.x0, c.y, c.sp, c.base, c.lobes, c.shelf, c.rag, c.streaks, c.fibres]);

test('clouds: the same scene bakes the same sky, another scene its own', () => {
  const C = SC.sceneCompile(SC.SCENE_TEST_TINY, { season: 'summer', lod: 1 }), L = skyAt('noon');
  const a = SC.sceneCloudPlan(C, L), b = SC.sceneCloudPlan(SC.sceneCompile(SC.SCENE_TEST_TINY, { season: 'summer', lod: 1 }), skyAt('noon'));
  assert.ok(a.length > 0);
  assert.deepEqual(a, b, 'same scene, same light: the same clouds');
  const other = SC.sceneCloudPlan(Object.assign({}, C, { id: C.id + '-other' }), L);
  assert.equal(other.length, a.length, 'the count is the formula, not the seed');
  assert.notDeepEqual(other.map(shapeOf), a.map(shapeOf), 'seeded by the scene: another id, another sky');
  assert.deepEqual(SC.sceneCloudPlan(null, L), []);
  assert.deepEqual(SC.sceneCloudPlan(C, null), [], 'no light, no clouds (as before)');
});

test('clouds: the count keeps the formula and the cap of 10 (cirrus inside it); kinds follow cover and weather', () => {
  const L = skyAt('noon');
  for (const n of [1, 3, 4, 6, 10]) for (const cover of [0, 0.08, 0.3, 0.45, 0.62, 0.92, 1]) {
    const plan = SC.sceneCloudPlan(skyOf('count-' + n + '-' + cover, n), Object.assign({}, L, { cover }));
    assert.equal(plan.length, cloudCount(n, cover), `n ${n}, cover ${cover}`);
    assert.ok(plan.length <= 10);
  }
  const kinds = (o) => { const k = { heap: 0, strip: 0, cirrus: 0 }; for (let i = 0; i < 24; i++) for (const c of SC.sceneCloudPlan(skyOf('kinds-' + i, 6), Object.assign({}, L, o))) k[c.kind]++; return k; };
  const clear = kinds({ cover: 0.08 }), overcast = kinds({ cover: 0.92 }), rain = kinds({ cover: 0.62, rain: true });
  assert.ok(clear.cirrus > 0 && clear.heap > clear.strip, 'a clear sky: fair-weather heaps and a few cirrus ' + JSON.stringify(clear));
  assert.ok(overcast.cirrus === 0 && overcast.strip > overcast.heap, 'overcast: low strips, no cirrus ' + JSON.stringify(overcast));
  assert.ok(rain.cirrus === 0 && rain.strip > rain.heap, 'rain: strips ' + JSON.stringify(rain));
});

test('clouds: depth bands give parallax (far small and slow, near large and fast), drawn far to near', () => {
  const L = skyAt('noon'), all = [];
  for (let i = 0; i < 16; i++) {
    const plan = SC.sceneCloudPlan(skyOf('bands-' + i, 6), L);
    assert.deepEqual(plan.map(c => c.band), plan.map(c => c.band).sort((a, b) => a - b), 'sorted far to near');
    assert.ok(new Set(plan.filter(c => c.band >= 0).map(c => c.band)).size >= 2, 'at least two depth bands');
    all.push(...plan);
  }
  const mean = (band, k) => { const l = all.filter(c => c.band === band && c.kind === 'heap'); return l.reduce((s, c) => s + c[k], 0) / l.length; };
  assert.ok(mean(0, 'sp') < mean(1, 'sp') && mean(1, 'sp') < mean(2, 'sp'), 'farther is slower');
  assert.ok(mean(0, 'w') < mean(2, 'w'), 'farther is smaller');
  const far = all.find(c => c.band === 0 && c.kind === 'heap'), near = all.find(c => c.band === 2 && c.kind === 'heap');
  assert.ok(far.tone.op < near.tone.op && far.tone.rimK < near.tone.rimK, 'farther is paler');
});

test('clouds: each wraps on its own width (enters and leaves fully off-screen); at t = 0 every cloud is in the frame', () => {
  const plans = [];
  for (let i = 0; i < 12; i++) plans.push(...SC.sceneCloudPlan(skyOf('wrap-' + i, 6), skyAt('noon', { cover: [0.08, 0.45, 0.92][i % 3] })));
  assert.ok(plans.some(c => c.w > 260), 'wider than the old fixed 260-unit margin (the old wrap popped these in)');
  for (const c of plans) {
    const x0 = SC.sceneCloudX(c, 0);
    assert.ok(x0 < 1600 && x0 + c.w > 0, 'the still (t = 0) is a finished sky: on screen at ' + x0);
    let prev = x0, wraps = 0;
    const dt = 2 / c.sp, period = (1600 + c.w + 48) / c.sp;
    for (let t = dt; t <= period + dt; t += dt) {
      const x = SC.sceneCloudX(c, t);
      if (x < prev) {
        wraps++;
        assert.ok(prev >= 1600, `leaves fully off the right edge (x ${prev}, w ${c.w})`);
        assert.ok(x + c.w <= 0, `enters fully off the left edge (x ${x}, w ${c.w})`);
      } else assert.ok(Math.abs(x - prev - c.sp * dt) < 1e-6, 'a steady drift between wraps');
      prev = x;
    }
    assert.equal(wraps, 1, 'one wrap per period');
  }
});

test('clouds: the light colours them (noon white, dusk glowing from under, deep night dim with a moon rim) and never moves them', () => {
  const C = skyOf('light', 6), noon = skyAt('noon'), dusk = skyAt('dusk'), night = skyAt('night');
  assert.equal(noon.cover, dusk.cover);
  const pn = SC.sceneCloudPlan(C, noon), pd = SC.sceneCloudPlan(C, dusk), pk = SC.sceneCloudPlan(C, night);
  assert.deepEqual(pd.map(shapeOf), pn.map(shapeOf), 'a re-bake at another light keeps every cloud where it is');
  assert.deepEqual(pk.map(shapeOf), pn.map(shapeOf));
  const warm = (hex) => parseInt(hex.slice(1, 3), 16) - parseInt(hex.slice(5, 7), 16);
  pn.forEach((c, i) => {
    assert.notDeepEqual(pd[i].tone, c.tone, 'noon and dusk colours differ');
    assert.ok(warm(pd[i].tone.baseCol) > warm(c.tone.baseCol), 'the base glows warm at dusk: ' + pd[i].tone.baseCol + ' vs ' + c.tone.baseCol);
  });
  const heaps = (p) => p.filter(c => c.kind === 'heap' && c.band > 0);
  assert.ok(heaps(pn).length > 0);
  for (const c of heaps(pn)) assert.equal(c.tone.op, 0.92, 'by day: as before');
  for (const c of heaps(pk)) assert.equal(c.tone.op, 0.7, 'deep night: as before');
  for (const c of pn) assert.ok(c.tone.rimK > 0.3 && c.tone.side === noon.side, 'a lit rim on the sun side by day');
  const moon = SC.sceneCloudPlan(C, Object.assign({}, night, { cover: 0.3, moon: { show: true, illum: 1, rel: 12, x: 1040 } }));
  const dark = SC.sceneCloudPlan(C, Object.assign({}, night, { cover: 0.3, moon: { show: false, illum: 0 } }));
  moon.forEach((c, i) => {
    assert.ok(c.tone.rimK > dark[i].tone.rimK, 'a faint moon rim when the moon shows');
    assert.ok(c.tone.rimK <= 0.6 && c.tone.side === 1, 'faint, on the moon side');
  });
});

/* ---------- the canvas renderer, in headless Chrome ---------- */
const browser = findBrowser();
let chrome = null;
before(async () => { if (browser) chrome = await launchChrome({ executable: browser }); });
after(async () => { if (chrome) await chrome.close(); });

test('canvas: the compiled fixture renders, a still frame is the frame at t = 0, frames move, stats are reported', { skip: !browser && 'no Chrome / Chromium found' }, async () => {
  await chrome.screenshot({ html: scenePageHtml({ root: ROOT, data: 'SCENE_TEST_TINY', still: true }), width: 400, height: 225, transparent: false });
  const fx = JSON.stringify(FIXTURE);
  const r = await chrome.evaluate(`(async () => {
    await window.__sceneReady;
    const C = ${fx};
    const mk = (o) => { const c = document.createElement('canvas'); c.style.cssText = 'width:640px;height:360px'; document.body.appendChild(c); const r = sceneRendererCreate(c, { compiled: C }, Object.assign({ dpr: 1 }, o)); r.resize(640, 360); return [c, r]; };
    const hash = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261, colours = new Set(); for (let i = 0; i < d.length; i += 4) { h = Math.imul(h ^ d[i] ^ (d[i + 1] << 8) ^ (d[i + 2] << 16), 16777619); if (i % 64 === 0) colours.add(d[i] << 16 | d[i + 1] << 8 | d[i + 2]); } return [h >>> 0, colours.size]; };
    const [c1, still] = mk({ still: true }); still.frame(0);
    const [c2, live] = mk({}); live.frame(3.7); live.frame(0);
    const a = hash(c1), b = hash(c2);
    live.frame(2.2); const m = hash(c2);
    for (let i = 0; i < 10; i++) live.frame(i * 0.05);
    const st = live.stats();
    still.destroy(); live.destroy();
    return { a, b, m, st };
  })()`);
  assert.ok(r.a[1] > 40, 'non-blank: ' + r.a[1] + ' colours');
  assert.equal(r.a[0], r.b[0], 'a still frame equals the frame at t = 0');
  assert.notEqual(r.m[0], r.a[0], 'later frames move');
  assert.ok(r.st.drawMs.n >= 10 && typeof r.st.drawMs.median === 'number' && typeof r.st.dynMs.median === 'number', 'drawMs and dynMs');
  assert.ok(r.st.bitmaps >= 2 && r.st.bitmaps <= 6, 'bitmaps ' + r.st.bitmaps);
  assert.ok(r.st.animatedDraws > 0 && r.st.animatedDraws <= 300, 'animated draws ' + r.st.animatedDraws);
  assert.ok(r.st.firstBakeMs > 0 && r.st.sprites > 0);
});

test('canvas: two bakes of a scene draw the same sky; another scene id draws other clouds', { skip: !browser && 'no Chrome / Chromium found' }, async () => {
  await chrome.screenshot({ html: scenePageHtml({ root: ROOT, data: 'SCENE_TEST_TINY', still: true }), width: 400, height: 225, transparent: false });
  const fx = JSON.stringify(Object.assign(clone(FIXTURE), { particles: { kind: 'none', n: 0 } }));
  const r = await chrome.evaluate(`(async () => {
    await window.__sceneReady;
    const C = ${fx}, L = sceneLight({}, Object.assign({ at: 'noon' }, C.view));
    // the sky rows only (above the far land): nothing else there depends on the scene id
    const skyHash = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, Math.round(c.height * 0.4)).data; let h = 2166136261; for (let i = 0; i < d.length; i += 4) h = Math.imul(h ^ d[i] ^ (d[i + 1] << 8) ^ (d[i + 2] << 16), 16777619); return h >>> 0; };
    const bake = (CC) => { const c = document.createElement('canvas'); c.style.cssText = 'width:640px;height:360px'; document.body.appendChild(c); const r = sceneRendererCreate(c, { compiled: CC }, { dpr: 1, still: true, L }); r.resize(640, 360); r.frame(0); const h = skyHash(c), n = r.stats().animatedDraws; r.destroy(); c.remove(); return [h, n]; };
    return { a: bake(C), b: bake(JSON.parse(JSON.stringify(C))), other: bake(Object.assign({}, C, { id: C.id + '-other' })), clouds: sceneCloudPlan(C, L).length };
  })()`);
  assert.ok(r.clouds > 0);
  assert.equal(r.a[0], r.b[0], 'two bakes of the same scene: the same sky');
  assert.notEqual(r.other[0], r.a[0], 'another scene id: other clouds');
  assert.equal(r.a[1], r.other[1], 'the same number of draws (one per cloud)');
});

test('canvas: the dense scene (3,000 placements, 40 actors) through the host at 1600 x 900', { skip: !browser && 'no Chrome / Chromium found' }, async () => {
  const st = await scenePerf(chrome, { root: ROOT, data: 'sceneTestDense()', seconds: 2 });
  assert.equal(st.placements >= 2900, true, 'placements ' + st.placements);
  assert.equal(st.actors, 40);
  assert.ok(st.drawMs.n > 20, 'frames drawn: ' + st.drawMs.n);
  assert.ok(st.animatedDraws <= 300);
  assert.ok(st.bitmaps <= 6);
  // no time limit here: npm test runs files in parallel and a loaded machine says nothing about the renderer.
  // `scene perf` (one scene, an idle machine) gates the budget; this test only proves the numbers are measured.
  assert.ok(st.drawMs.median > 0 && st.dynMs.median >= 0 && st.dynMs.median <= st.drawMs.median + 0.01, 'drawMs and dynMs');
  console.log(`  dense scene: drawMs median ${st.drawMs.median} (p95 ${st.drawMs.p95}), dynMs median ${st.dynMs.median}, first bake ${st.firstBakeMs} ms, ${st.sprites} sprites, ${st.bitmaps} bitmaps, ${st.animatedDraws} animated draws`);
});

test('host: a re-render with the same key takes over the renderer (no re-bake); the SVG fallback when the canvas fails', { skip: !browser && 'no Chrome / Chromium found' }, async () => {
  await chrome.screenshot({ html: scenePageHtml({ root: ROOT, data: 'SCENE_TEST_TINY' }), width: 800, height: 450, transparent: false });
  const r = await chrome.evaluate(`(async () => {
    await window.__sceneReady;
    const box = document.querySelector('.sp-box'), before = window.__sceneStats()[0];
    const html = box.innerHTML; box.innerHTML = ''; await new Promise(r => setTimeout(r, 50)); box.innerHTML = html;
    await sceneHostReady();
    const afterR = window.__sceneStats()[0];
    // a renderer that throws: the host shows the SVG still instead
    const it = sceneItem({ id: 'broken', label: 'x', site: 'x', tags: ['x'], mood: 'calm', colour: 'blue' }, SCENE_TEST_TINY);
    animRegisterPack({ id: 'scene-broken', name: 'broken', items: [it] });
    const span = document.createElement('div'); span.className = 'sp-box';
    span.innerHTML = '<span class="anim-scene ap-composed is-live sz-fill" data-anim="scene-broken/broken" data-sc-lod="1" data-sc-still="0" data-sc-hover="0"><canvas class="sc-canvas" width="0" height="0"></canvas></span>';
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function () { return null; };
    document.body.appendChild(span); sceneHostScan(span);
    HTMLCanvasElement.prototype.getContext = orig;
    return { ridBefore: before.rid, ridAfter: afterR.rid, bakesBefore: before.bakes, bakesAfter: afterR.bakes, hosts: window.__sceneStats().length, fallback: !!span.querySelector('svg.sc-fallback'), svgLen: span.innerHTML.length };
  })()`);
  assert.equal(r.ridAfter, r.ridBefore, 'the same renderer after a re-render');
  assert.equal(r.bakesAfter, r.bakesBefore, 'no re-bake on a re-render');
  assert.ok(r.fallback && r.svgLen > 10000, 'the SVG still replaced the broken canvas');
});
