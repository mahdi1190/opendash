// The scene-engine tooling (docs/dev/SCENE_ENGINE.md sections 10, 15, 16): the composed lint profile (the bar, placement variety,
// care, perf), the object lint, the new standard's tiers, the tool-side SVG parser, the real moments of a day, the upgrade scaffold,
// the briefs of the new standard, and the CLI (object, scene, status --standard / --all, lint tiers, reference).
// Pure parts run against crafted COMPILED scenes and a fake engine. The parts that need the engine itself (src/app/70-scene-0core.js,
// the library, the archetypes and the demo) are skipped, with the reason, until those files are in the checkout.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, cpSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { main } from '../tools/anim-pack.mjs';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { sceneShapesFromSvg, scenePathBox, KIT_PARTS } from '../tools/lib/scene-svg.mjs';
import { sceneTimesFor, seasonDates, MOMENTS } from '../tools/lib/scene-times.mjs';
import { engineOf, lintScene, barMetrics, placementVariety, careCheck, perfRules, standardOf, signTextCheck, svgTextCheck, bakeBitmaps, retroCheck, deltaE, TIERS } from '../tools/lib/scene-lint.mjs';
import { suggestArchetype, extractLandmark, paletteOf, shapeClusters, climateOf, kitsFor, waterOf, atOf, regionKeyOf, placeOf, regionOf } from '../tools/lib/scene-upgrade.mjs';
import { syntheticRows, sampleOf, briefCard } from '../tools/lib/anim-cmd/scene.mjs';
import { kitCall, objectStub, libraryFileFor, hookTransform } from '../tools/lib/anim-cmd/object.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TH = JSON.parse(readFileSync(join(ROOT, 'tools', 'anim-quality.json'), 'utf8'));
const run = async (argv) => { const out = [], err = []; const code = await main(argv, { out: (s) => out.push(s), err: (s) => err.push(s) }); return { code, out: out.join('\n'), err: err.join('\n') }; };
const REG = loadRegistry(ROOT);
const E_REAL = engineOf(REG);
const ENGINE = E_REAL.ready ? false : 'the scene engine (src/app/70-scene-0core.js) is not in this checkout yet';
const INDEX = E_REAL.index && E_REAL.index.length ? E_REAL.index : null;
const temps = [];
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });

/* ---------------------------------------------------------------------------------------------
   A fake engine and crafted compiled scenes (section 4 form)
   --------------------------------------------------------------------------------------------- */
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
const DEFS = {
  'plant.g': { id: 'plant.g', category: 'plant', size: [30, 30], variants: 3, seasonal: true, palette: { spring: {}, summer: {}, autumn: {}, winter: {} }, tags: ['kit:temperate', 'role:ground'] },
  'plant.h': { id: 'plant.h', category: 'plant', size: [40, 36], variants: 2, seasonal: true, palette: { spring: {}, summer: {}, autumn: {}, winter: {} }, tags: ['kit:temperate', 'role:ground'] },
  'tree.u': { id: 'tree.u', category: 'tree', size: [180, 280], variants: 2, seasonal: true, palette: { spring: {}, summer: {}, autumn: {}, winter: {} }, tags: ['kit:temperate', 'role:tree'] },
  'tree.t': { id: 'tree.t', category: 'tree', size: [200, 300], variants: 2, seasonal: true, palette: { spring: {}, summer: {}, autumn: {}, winter: {} }, tags: ['kit:temperate', 'role:tree'] },
  'bird.d': { id: 'bird.d', category: 'bird', size: [40, 24], variants: 1, seasonal: false, tags: ['kit:birds', 'role:bird'] },
  'person.w': { id: 'person.w', category: 'person', size: [20, 60], variants: 1, seasonal: false, tags: ['kit:people', 'role:walker', 'silhouette'] },
  'landmark.l': { id: 'landmark.l', category: 'landmark', size: [200, 400], variants: 1, seasonal: false, flippable: false, tags: ['landmark', 'place:zz/place:x'] },
  'building.b': { id: 'building.b', category: 'building', size: [100, 120], variants: 1, seasonal: false, tags: ['kit:urban', 'role:building-far'] },
};
const SEASON_COL = { spring: '#6f9a48', summer: '#3f6a2a', autumn: '#c07a2a', winter: '#8a8a80' };
const SHAPES = (id, v, season) => {
  const d = DEFS[id];
  const col = d.seasonal ? SEASON_COL[season] : '#806040';
  const parts = { body: [{ f: col, d: rect(-10, -d.size[1], 20, d.size[1]) }] };
  if (id === 'building.b' || id === 'landmark.l') for (let i = 0; i < 14; i++) parts.body.push({ f: '#334455', d: rect(-8 + i, -50, 2, 4), glow: 'window' });
  return { box: [-d.size[0] / 2, -d.size[1], d.size[0] / 2, 2], parts, order: ['body'], anim: id === 'bird.d' ? [{ kind: 'bob', part: '*', dy: 1.5 }] : [] };
};
const fakeE = () => ({ ready: true, compile: (d, o = {}) => (typeof d.__C === 'function' ? d.__C(o.season || 'summer') : d.__C), obj: (id) => DEFS[id] || null, shapes: SHAPES, require() {}, index: null, data: (it) => it.scene });
const LAYERS = ['horizon', 'far', 'mid', 'near', 'fore', 'front'].map((id, i) => ({ id, i, depth: [0.08, 0.2, 0.45, 0.75, 1, 1.25][i], haze: 0 }));
/** A compiled scene that reaches the bar: 5 layers, dense varied cover, 16 movers, a signature, shadows. Options knock rules out. */
function goodC(season = 'summer', { layers = 5, movers = 16, signature = true, people = 2, cover = 400 } = {}) {
  const items = [];
  let seed = 1; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < cover; i++) items.push({ o: ['plant.g', 'plant.h', 'tree.t', 'tree.u'][Math.floor(r() * 4)], v: Math.floor(r() * 2), x: r() * 1600, y: 700 + r() * 200, s: 0.6 + r() * 0.8, flip: r() < 0.5, layer: r() < 0.5 ? 3 : 4, haze: 0, tint: ['#8a7a40', [0, 0.08, 0.16][Math.floor(r() * 3)]], season, seed: i, z: 0, strip: 0, anim: [], shadow: true, reflect: false });
  for (let l = 0; l < layers - 3; l++) items.push({ o: 'tree.t', v: 0, x: 200 + l * 300, y: 520 + l * 40, s: 0.3, flip: false, layer: l, haze: 0, tint: null, season, seed: 9000 + l, z: 0, strip: -1, anim: [], shadow: true, reflect: false });
  if (signature) items.push({ o: 'landmark.l', v: 0, x: 800, y: 600, s: 0.8, flip: false, layer: 2, haze: 0, tint: null, season, seed: 77, z: 0, strip: -1, anim: [], shadow: true, reflect: false });
  const actors = [];
  for (let i = 0; i < people; i++) actors.push({ o: 'person.w', v: 0, layer: 3, path: [[-60, 760 + i * 30], [1660, 770 + i * 30]], speed: 20, loop: 'pingpong', s: 1, sByY: null, seed: i, offset: i * 0.37, anim: [{ kind: 'walk', parts: ['body'] }] });
  const flocks = movers - people > 0 ? [{ o: 'bird.d', n: movers - people, area: [200, 80, 1400, 260], speed: 30, s: 0.5, seed: 1, layer: 1 }] : [];
  const used = new Set(items.map(i => i.layer));
  return { v: 1, id: 'crafted', season, setting: 'natural', view: { lat: 51.3, lon: -0.8, horizon: 480 }, sky: { sunR: 26 }, layers: LAYERS, ground: [], water: [], items, strips: [{ layer: 3 }], actors, flocks, signs: [], particles: { kind: 'leaves', n: 60 }, camera: { pan: 0 },
    stats: { placements: items.length, animatedDraws: 40, actors: actors.length, flockBirds: flocks.reduce((n, f) => n + f.n, 0), layersUsed: used.size, distinctSprites: 50 } };
}
const goodData = (opts = {}) => ({ id: 'crafted', view: { lat: 51.3, lon: -0.8, horizon: 480 }, season: 'auto', weather: 'live', particles: 'season', __C: (season) => goodC(season, opts) });

/* ---------------------------------------------------------------------------------------------
   The composed profile on crafted scenes
   --------------------------------------------------------------------------------------------- */
test('composed profile: a crafted scene at the bar passes every rule; a pass with perf is GOLD, without it is not', () => {
  const E = fakeE();
  const r = lintScene(goodData(), TH, { E, ref: 'crafted' });
  assert.deepEqual(r.failures.map(f => `${f.rule}: ${f.message}`), []);
  assert.equal(r.pass, true); assert.equal(r.gold, false, 'GOLD needs the perf rules');
  for (const g of ['data', 'bar', 'variety', 'care']) assert.ok(r.rules.some(x => x.group === g), g);
  const perf = { drawMs: { median: 7, p95: 10 }, dynMs: { median: 5 }, firstBakeMs: 200 };
  const p = lintScene(goodData(), TH, { E, ref: 'crafted', perf, gpu: true });
  assert.equal(p.gold, true);
  assert.ok(p.rules.filter(x => x.group === 'perf').length >= 3);
});

test('the bar: 4 layers, 14 movers, no signature and 9 people each fail with the fix in the message', () => {
  const E = fakeE();
  const fails = (opts) => lintScene(goodData(opts), TH, { E }).failures.map(f => f.rule);
  assert.ok(fails({ layers: 4 }).includes('depthLayers'));
  const m = lintScene(goodData({ movers: 14 }), TH, { E }).failures.find(f => f.rule === 'movers');
  assert.ok(m); assert.match(m.message, /movers 14 of 15: add a flock/);
  assert.ok(fails({ signature: false }).includes('signature'));
  const nine = lintScene(goodData({ people: 9, movers: 16 }), TH, { E }).failures.map(f => f.rule);
  assert.ok(nine.includes('people'), 'at most 8 people in a region scene');
  assert.ok(fails({ cover: 40 }).includes('coverItems'));
});

test('the bar: live sky and seasons are required (a fixed season, no weather, no particles fail; a dull winter fails the delta E)', () => {
  const E = fakeE();
  const d = Object.assign(goodData(), { season: 'summer', weather: 'none', particles: 'none' });
  const f = lintScene(d, TH, { E }).failures.find(x => x.rule === 'liveSky');
  assert.ok(f); assert.match(f.message, /season 'summer'.*weather 'none'.*particles/);
  const dull = goodData(); const save = { ...SEASON_COL };
  SEASON_COL.winter = SEASON_COL.summer; SEASON_COL.autumn = SEASON_COL.summer;
  try { const s = lintScene(dull, TH, { E: fakeE() }).failures.find(x => x.rule === 'seasons'); assert.ok(s, 'summer = winter fails'); assert.match(s.message, /barely change/); }
  finally { Object.assign(SEASON_COL, save); }
  assert.ok(deltaE([63, 106, 42], [138, 138, 128]) > 6);
});

test('placement variety: rows and stamps fail, varied scatter passes, stacked copies fail', () => {
  const E = fakeE();
  const base = (items) => ({ items, actors: [], flocks: [], layers: LAYERS });
  const row = Array.from({ length: 12 }, (_, i) => ({ o: 'plant.g', v: i % 3, x: 100 + i * 100, y: 800, s: 0.6 + (i % 4) * 0.2, flip: i % 2 === 0, tint: null, layer: 3 }));
  assert.ok(placementVariety(base(row), { E, thresholds: TH }).fails.some(f => f.rule === 'grid'), 'a row: every gap the same');
  const stamp = Array.from({ length: 12 }, (_, i) => ({ o: 'plant.g', v: 0, x: (i * 137) % 1600, y: 700 + (i * 53) % 200, s: 1, flip: false, tint: null, layer: 3 }));
  const sf = placementVariety(base(stamp), { E, thresholds: TH }).fails.map(f => f.rule);
  for (const rr of ['scaleSpread', 'flipShare', 'variantUse']) assert.ok(sf.includes(rr), rr);
  const varied = goodC().items;
  assert.deepEqual(placementVariety(base(varied), { E, thresholds: TH }).fails.map(f => f.rule), []);
  const stacked = [...varied, { ...varied[0], x: varied[0].x + 1 }];
  assert.ok(placementVariety(base(stacked), { E, thresholds: TH }).fails.some(f => f.rule === 'stacked'));
});

test('care: crowds, tall people and signs outside signage fail; sign text keeps the TfL marks out', () => {
  const E = fakeE();
  const C = goodC();
  C.actors = [0, 1, 2, 3].map(i => ({ o: 'person.w', v: 0, layer: 3, path: [[800 + i * 10, 760], [810 + i * 10, 760]], s: 1, offset: 0, anim: [] }));
  const rules = careCheck(C, { signs: [] }, null, { E, thresholds: TH });
  assert.equal(rules.find(r => r.rule === 'crowd').ok, false);
  C.actors = [{ o: 'person.w', v: 0, layer: 3, path: [[0, 760], [10, 760]], s: 2.7, offset: 0, anim: [] }];
  assert.equal(careCheck(C, { signs: [] }, null, { E, thresholds: TH }).find(r => r.rule === 'personHeight').ok, false, '162 units tall');
  assert.equal(careCheck(C, { signs: [{ text: 'Arnos Grove' }] }, null, { E, thresholds: TH }).find(r => r.rule === 'signs').ok, false, 'no signage: no signs');
  assert.equal(careCheck(C, { signage: true, signs: [{ text: 'Arnos Grove', style: 'board' }] }, null, { E, thresholds: TH }).find(r => r.rule === 'signs').ok, true);
  assert.equal(careCheck(C, { signage: true, signs: [{ text: 'Arnos Grove' }] }, { upgrade: { state: 'draft' } }, { E, thresholds: TH }).find(r => r.rule === 'signs').ok, false, 'a region upgrade never has signs');
  for (const t of ["King's Cross St. Pancras", 'Elephant & Castle', 'Arnos Grove']) assert.equal(signTextCheck(t).ok, true, t);
  for (const t of ['Underground', 'TfL Rail', 'Mind the gap', 'Elizabeth line', '<b>x</b>', '', 'x'.repeat(41)]) assert.equal(signTextCheck(t).ok, false, t);
  assert.equal(svgTextCheck('<g class="sc-sign"><rect/><text x="1">Arnos Grove</text></g>', [{ text: 'Arnos Grove' }])[0].ok, true);
  assert.equal(svgTextCheck('<g><text>Arnos Grove</text></g>', [{ text: 'Arnos Grove' }])[0].ok, false, 'text outside a sign');
  assert.equal(svgTextCheck('<g class="sc-sign"><text>Other</text></g>', [{ text: 'Arnos Grove' }])[0].ok, false, 'text that is not a sign\'s');
});

test('care: the people limits (8.5): a silhouette of 170 shapes passes and 190 fails; 140 units tall passes and 160 fails', () => {
  assert.equal(TH.composed.care.personShapes.max, 180); assert.equal(TH.composed.care.personHeight.max, 150);
  const withShapes = (n) => Object.assign(fakeE(), { shapes: (id, v, season) => (id === 'person.w'
    ? { box: [-10, -60, 10, 2], parts: { body: Array.from({ length: n }, (_, i) => ({ f: '#806040', d: rect(-10, -60 + (i % 60), 20, 1) })) }, order: ['body'], anim: [] }
    : SHAPES(id, v, season)) });
  const care = (C, E) => careCheck(C, { signs: [] }, null, { E, thresholds: TH });
  const one = (s) => { const C = goodC(); C.actors = [{ o: 'person.w', v: 0, layer: 3, path: [[0, 760], [10, 760]], s, offset: 0, anim: [] }]; return C; };
  assert.equal(care(one(1), withShapes(170)).find(r => r.rule === 'silhouettes').ok, true, '170 shapes');
  const big = care(one(1), withShapes(190)).find(r => r.rule === 'silhouettes');
  assert.equal(big.ok, false, '190 shapes'); assert.match(big.message, /person\.w: people are anonymous silhouettes \(tag 'silhouette', at most 180 shapes, no faces\)/);
  assert.equal(care(one(140 / 60), fakeE()).find(r => r.rule === 'personHeight').ok, true, '140 units tall');
  const tall = care(one(160 / 60), fakeE()).find(r => r.rule === 'personHeight');
  assert.equal(tall.ok, false, '160 units tall'); assert.match(tall.message, /taller than 150 units: size them with the depth ladder/);
});

test('perf rules: the laptop budget with --gpu, x swFactor in software, the first bake warns before it fails', () => {
  const sw = TH.composed.perf.swFactor;
  const p = { drawMs: { median: 9, p95: 13 }, dynMs: { median: 7 }, firstBakeMs: 400 };
  assert.ok(perfRules(p, TH, { gpu: true }).some(r => !r.ok), 'over the laptop budget');
  assert.ok(perfRules(p, TH, { gpu: false }).every(r => r.ok), `inside the software budget (x ${sw})`);
  assert.ok(perfRules({ ...p, firstBakeMs: 400 }, TH, { gpu: true }).find(r => r.rule === 'firstBakeMs').warn);
  assert.equal(perfRules({ skipped: 'no chrome' }, TH)[0].ok, true);
});

test('bake bitmaps: a new bitmap starts after a layer with animated content; the sky is one', () => {
  const C = { layers: LAYERS, ground: [{ layer: 0 }, { layer: 1 }, { layer: 3 }], water: [{ layer: 2, shimmer: 20 }], items: [], actors: [], flocks: [], strips: [], signs: [] };
  assert.equal(bakeBitmaps(C), 3, 'sky + [horizon, far, mid(water)] + [near]');
});

test('the new standard: standardOf tiers, and the thresholds carry the designed composed profile, the object rules and the standard block', () => {
  assert.equal(standardOf({ full: true, item: { composed: true } }, { pass: true }), 'gold');
  assert.equal(standardOf({ full: true, item: { composed: true } }, { pass: false }), 'composed');
  assert.equal(standardOf({ full: true, item: { composed: true } }, { pass: true }, { pass: false }), 'composed', 'perf fails: not gold');
  assert.equal(standardOf({ full: true, item: { upgrade: { state: 'draft' } } }), 'upgrading');
  assert.equal(standardOf({ full: true, item: { rich: true } }), 'rich');
  assert.equal(standardOf({ full: true, item: {} }), 'legacy');
  assert.equal(standardOf({ full: false, item: {} }), null, 'small items are not scenes');
  assert.deepEqual(TIERS, ['gold', 'composed', 'upgrading', 'rich', 'legacy']);
  assert.equal(TH.composed.designed, true);
  assert.equal(TH.composed.data.animatedDraws.max, 300); assert.equal(TH.composed.perf.dynMs.max, 6); assert.equal(TH.composed.perf.drawMs.max, 8);
  assert.equal(TH.composed.bar.depthLayers.min, 5); assert.equal(TH.composed.bar.movers.min, 15);
  assert.deepEqual(TH.standard.legacyProfiles, ['scene', 'scene-legacy', 'scene-rich']);
  assert.equal(TH.object.shapes.max, 600);
  const ref = JSON.parse(readFileSync(join(ROOT, 'tools', 'anim-reference.json'), 'utf8'));
  assert.equal(ref.standard, 2); assert.equal(ref.bar.length, 6);
  for (const b of ref.bar) assert.ok(REG.items().some(e => e.ref === b.ref && e.full), b.ref);
});

test('retrofit overlay check: the overlay bytes exclude the art it wraps; unknown sr-* classes are named', () => {
  const art = '<path d="M0 0h1600v900H0z"/>'.repeat(400);
  const m = `<g class="sr-retro"><g class="sr-back">${art}</g><g class="sr-stars x-srtw"><circle r="1"/></g></g>`;
  const r = retroCheck(m, { classes: new Set(['sr-retro', 'sr-back']) });
  assert.equal(r[0].ok, true, 'the art is not counted'); assert.ok(r[0].value < 200);
  assert.equal(r[1].ok, false); assert.match(r[1].message, /sr-stars, x-srtw/);
  assert.deepEqual(retroCheck('<svg></svg>'), [], 'no overlay, nothing to check');
});

/* ---------------------------------------------------------------------------------------------
   The SVG parser
   --------------------------------------------------------------------------------------------- */
test('parser: the nature kit\'s tree, duck and walker become parts and hooks (sway about the crown, bob and turn, a walk pair)', () => {
  const K = REG.R.get('ukNatureKit')(REG.R.get('animSceneKit')());
  const tree = sceneShapesFromSvg(K.tree('oak', 0, 0, 1, { season: 'summer', seed: 11, shadow: false }));
  assert.deepEqual(tree.order, ['body', 'sway']); assert.equal(tree.anim[0].kind, 'sway'); assert.ok(tree.anim[0].pivot[1] < -50, 'pivot up the trunk');
  assert.ok(tree.parts.sway.length > 50 && tree.parts.sway.every(s => /^#[0-9a-f]{6}$/.test(s.f || s.s)));
  const duck = sceneShapesFromSvg(K.duck('mallard', 0, 0, 1, {}));
  assert.deepEqual(duck.anim.map(a => a.kind).sort(), ['bob', 'turn']);
  const walker = sceneShapesFromSvg(K.walker(0, 0, 1, {}));
  const walk = walker.anim.filter(a => a.kind === 'walk');
  assert.ok(walk.length >= 1 && walk.every(a => a.parts.length >= 2), 'legs (and arms) pair into a walk hook');
  assert.equal(KIT_PARTS.tree, 'sway'); assert.equal(KIT_PARTS.peck, 'turn');
  assert.throws(() => sceneShapesFromSvg('<g><image href="x"/></g>'), /<image> is not supported/);
  assert.throws(() => sceneShapesFromSvg('<g><text>Hi</text></g>'), /<text> is not supported|drawings carry no text/);
  const g = sceneShapesFromSvg('<defs><linearGradient id="a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient></defs><g transform="translate(10 20) scale(2)"><rect width="10" height="10" fill="url(#a)"/></g>');
  const s = g.parts.body[0];
  assert.deepEqual(s.m, [2, 0, 0, 2, 10, 20]); assert.ok(s.f.lin && s.f.y2 === 10, 'a bounding-box gradient in the shape\'s own units');
  assert.deepEqual(scenePathBox('M0 0a10 10 0 1 0 20 0a10 10 0 1 0 -20 0z'), [0, -10, 20, 10]);
});

test('parser, flatten: a US and an Asia scene read whole, lit windows become glow, stars and tints are dropped, every shape has its world box', () => {
  const tiny = sceneShapesFromSvg('<g class="us-star"><circle cx="5" cy="5" r="1" fill="#fff"/></g><g class="us-tint"><rect width="1600" height="900" fill="#000"/></g><g class="x-usdrift" style="--dx:40px"><g class="us-lamps"><circle cx="9" cy="9" r="2" fill="#ffd"/></g></g>', { flatten: true }).parts.body;
  assert.equal(tiny.length, 1, 'the star and the tint are dropped, the drifting lamp kept at rest'); assert.equal(tiny[0].glow, 'lamp'); assert.deepEqual(tiny[0].bb, [7, 7, 11, 11]);
  for (const ref of ['us-northeast/new-york-skyline', 'asia-southeast/singapore-skyline']) {
    const e = REG.items().find(x => x.ref === ref);
    const markup = REG.html(e.item, { live: true, size: 'fill' });
    const all = sceneShapesFromSvg(markup, { flatten: true }).parts.body;
    assert.ok(all.length > 150, `${ref}: ${all.length} shapes`);
    assert.ok(all.some(s => s.glow === 'window'), `${ref}: us-lit -> glow`);
    assert.ok(all.every(s => Array.isArray(s.bb) && s.bb.length === 4));
  }
});

/* ---------------------------------------------------------------------------------------------
   Times, upgrade helpers, briefs, small helpers
   --------------------------------------------------------------------------------------------- */
test('the real moments of a day: in order at London, tropical Singapore has them too, the polar summer has no dusk; seasons flip south', () => {
  const t = sceneTimesFor(51.5, -0.12, '2026-10-07');
  const ms = MOMENTS.map(m => Date.parse(t[m]));
  assert.ok(ms.every((x, i) => i === 0 || x > ms[i - 1]), JSON.stringify(t));
  assert.ok(Math.abs(Date.parse(t.noon) - Date.parse('2026-10-07T11:50:00Z')) < 15 * 60000, 'solar noon near 11:50 UTC');
  assert.ok(sceneTimesFor(1.29, 103.85, '2026-10-07').dusk);
  const polar = sceneTimesFor(78.2, 15.6, '2026-06-21');
  assert.equal(polar.dusk, null); assert.equal(polar.dawn, null);
  assert.deepEqual(seasonDates(51, 2026).map(x => x.season + ' ' + x.date), ['spring 2026-04-15', 'summer 2026-07-15', 'autumn 2026-10-15', 'winter 2026-01-15']);
  assert.equal(seasonDates(-33, 2026).find(x => x.season === 'summer').date, '2026-01-15');
});

test('upgrade helpers: the archetype suggestion, the region key and place, climate, kits, water and the moment', () => {
  const index = INDEX || [{ id: 'skyline-water', hints: ['skyline', 'bay', 'harbour', 'supertrees'] }, { id: 'temple-mountain', hints: ['temple', 'pagoda', 'mountain', 'blossom'] }, { id: 'plaza', hints: ['plaza'] }];
  const sg = REG.items().find(e => e.ref === 'asia-southeast/singapore-skyline'), jp = REG.items().find(e => e.ref === 'asia-east/jp-signature');
  assert.equal(suggestArchetype(sg.item, index)[0].id, 'skyline-water');
  assert.equal(suggestArchetype(jp.item, index)[0].id, 'temple-mountain');
  const asia = regionOf(REG, 'asia-southeast');
  assert.equal(regionKeyOf(asia, sg.item), 'place:singapore'); assert.equal(regionKeyOf(asia, jp.item), 'country:JP');
  const at = placeOf(asia, sg.item); assert.ok(Math.abs(at.lat - 1.3) < 0.2 && Math.abs(at.lon - 103.8) < 0.3);
  assert.equal(climateOf(1.3, []), 'tropical'); assert.equal(climateOf(35, ['desert']), 'arid'); assert.equal(climateOf(35, ['mountain']), 'alpine'); assert.equal(climateOf(51, []), 'temperate');
  const table = { 'asia-southeast': ['tropical', 'shophouse', 'urban'], 'uk-*': ['temperate', 'london'], climate: { arid: ['arid'], temperate: ['temperate'] }, always: ['birds'] };
  assert.deepEqual(kitsFor('asia-southeast', 'tropical', table), ['tropical', 'shophouse', 'urban', 'birds']);
  assert.deepEqual(kitsFor('uk-south-east', 'temperate', table), ['temperate', 'london', 'birds']);
  assert.deepEqual(kitsFor('texas', 'arid', table), ['arid', 'birds']);
  assert.equal(waterOf(['bay']), 'bay'); assert.equal(waterOf([], { water: 'lake' }), 'lake'); assert.equal(atOf(['dusk']), 'dusk'); assert.equal(atOf([]), 'afternoon');
});

test('landmark extraction: the shapes inside the box, re-anchored at its bottom centre, sky and haze dropped, glow kept; clusters to choose a box from', () => {
  const sg = REG.items().find(e => e.ref === 'asia-southeast/singapore-skyline');
  const markup = REG.html(sg.item, { live: true, size: 'fill' });
  const lm = extractLandmark(markup, [560, 160, 1120, 640]);
  assert.ok(lm.count >= 10, `${lm.count} shapes`); assert.ok(lm.dropped.sky > 0 && lm.dropped.outside > 0);
  assert.deepEqual(lm.anchor, [840, 640]);
  for (const s of lm.shapes) {
    assert.ok(!s.bb && Array.isArray(s.m), 'no world box, re-anchored through m');
    const b = scenePathBox(s.d, s.m), cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    assert.ok(cx >= -281 && cx <= 281 && cy >= -481 && cy <= 1, `centre ${cx}, ${cy} inside the box, relative to its bottom centre`);
  }
  assert.ok(lm.glow > 0, 'the lit windows stay lit');
  assert.equal(paletteOf(lm.shapes).length, 6);
  const cl = shapeClusters(sceneShapesFromSvg(markup, { flatten: true }).parts.body);
  assert.ok(cl.length >= 3 && cl.every(c => c.box.length === 4 && c.count > 0));
});

test('small helpers: synthetic rows and samples are seeded, the brief card is read, kit calls and stubs are well formed', () => {
  const arch = { params: { id: 'id', name: 'sign', lines: 'list', lat: 'number', lon: 'number', era: ['victorian', 'holden'], features: 'list' } };
  const rows = [{ id: 'a', name: 'Alpha', lines: ['piccadilly'], lat: 51.5, lon: -0.1, era: 'holden', features: ['trees'] }];
  const syn = syntheticRows(arch, rows, 50);
  assert.equal(syn.length, 50); assert.deepEqual(syntheticRows(arch, rows, 50), syn, 'seeded');
  assert.ok(syn.every(r => /^syn-\d+$/.test(r.id) && signTextCheck(r.name).ok && ['victorian', 'holden'].includes(r.era) && Math.abs(r.lat - 51.5) < 0.06));
  assert.deepEqual(sampleOf([1, 2, 3, 4, 5, 6], 3), sampleOf([1, 2, 3, 4, 5, 6], 3)); assert.equal(sampleOf([1, 2, 3, 4, 5, 6], 3).length, 3);
  assert.deepEqual(briefCard('x\n```scene\nid: my-scene\nlat: 51.3\nkits: a, b\nempty:\n```\n'), { id: 'my-scene', lat: '51.3', kits: 'a, b' });
  assert.throws(() => briefCard('no card'), /no ```scene block/);
  assert.equal(kitCall("K.tree('alder')"), "K.tree('alder', 0, 0, 1, { season, seed: 11 + v * 7, shadow: false })");
  assert.equal(kitCall('K.gorse'), 'K.gorse(0, 0, 1, { season, seed: 11 + v * 7, shadow: false })');
  assert.throws(() => kitCall('alert(1)'), /--kit must be/);
  for (const stub of [objectStub('tree.rowan', { kits: ['temperate'], role: 'tree' }), objectStub('building.shop', { kits: ['shophouse'] }), objectStub('landmark.x', { region: 'asia' }), objectStub('tree.alder', { kit: "K.tree('alder')", kits: ['temperate'] })]) {
    assert.doesNotThrow(() => new Function('sceneObjDefine', 'sceneObjFromKit', 'sceneD', stub), 'the stub is valid JS');
  }
  assert.match(objectStub('building.shop', { kits: ['shophouse'] }), /glow: 'window'/); assert.match(objectStub('landmark.x', {}), /flippable: false[\s\S]*parts: \['body', 'lit'\]/);
  assert.equal(libraryFileFor(ROOT, 'tree.rowan', ['temperate']), 'src/app/70-scene-lib-trees.js');
  assert.equal(libraryFileFor(ROOT, 'tree.palm', ['tropical']), 'src/app/70-scene-lib-trees-tropical.js');
  assert.equal(libraryFileFor(ROOT, 'landmark.marina-bay-sands', []), 'src/app/70-scene-lib-landmark-marina-bay-sands.js');
  assert.equal(hookTransform({ kind: 'sway', part: 'crown', pivot: [0, -100], deg: 2 }, 'crown', 0.25), 'rotate(3.20 0 -100)');
});

/* ---------------------------------------------------------------------------------------------
   The CLI (no engine needed)
   --------------------------------------------------------------------------------------------- */
test('CLI: lint prints the tier (legacy floors: below the new standard; an upgrade is drafted) and the STANDARD summary; --json carries tier', async () => {
  // New York has a DRAFT upgrade (the pilot, 71-scene-upgrade-us-new-york.js): still the legacy art, tier 'upgrading'
  const r = await run(['lint', '--ref', 'us-northeast/new-york-skyline']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /PASS {2}us-northeast\/new-york-skyline {2}\(scene\) {2}\(legacy floors: below the new standard; an upgrade is drafted\)/);
  assert.match(r.out, /standard: 0 of 1 full scenes at the new standard \(gold\); 1 upgrading \(below the new standard\)/);
  const j = JSON.parse((await run(['lint', '--ref', 'us-northeast/new-york-skyline,us-northeast/ny-statue', '--json'])).out);
  assert.equal(j.items[0].tier, 'upgrading');
  const at = await run(['lint', '--ref', 'us-northeast/new-york-skyline', '--at', 'not-a-time']);
  assert.equal(at.code, 1); assert.match(at.err, /--at must be an ISO time/);
});

test('CLI: status prints the STANDARD line and per-pack tier columns; --standard is the worklist; --all covers every pack; --json has the block', async () => {
  const s = await run(['status', 'asia', '--no-lint', '--short', '--standard']);
  assert.equal(s.code, 0, s.err);
  assert.match(s.out, /standard {2}\d+ of 132 scenes at the new standard \(gold\)(; \d+ [a-z ]+)*; \d+ legacy \(below the new standard\)/);
  assert.match(s.out, /pack .* gold {2}upgr legacy/); assert.match(s.out, /UPGRADE WORKLIST \(\d+ scene\(s\) below the new standard/);
  const j = JSON.parse((await run(['status', 'asia', '--no-lint', '--json'])).out);
  assert.equal(j.standard.list.length, 132); assert.equal(TIERS.reduce((n, t) => n + j.standard[t], 0), 132, 'every scene has exactly one tier');
  assert.ok(j.standard.legacy > 100, 'most of Asia is hand-drawn (legacy) until the upgrades land');
  const all = await run(['status', '--all']);
  assert.match(all.out, /uk-south-east \s+80 \s/, 'the convert stage: the 80 Yateley and Fleet items are composed and gold'); assert.match(all.out, /us-northeast/); assert.match(all.out, /texas/);
  const aj = JSON.parse((await run(['status', '--all', '--json'])).out).standard;
  assert.ok(aj.gold >= 80 && aj.legacy > 300);
});

test('CLI: reference prints THE BAR first, then the legacy exemplars', async () => {
  const r = await run(['reference']);
  assert.equal(r.code, 0);
  assert.ok(r.out.indexOf('THE BAR') > 0 && r.out.indexOf('THE BAR') < r.out.indexOf('LEGACY EXEMPLARS'));
  assert.match(r.out, /uk-south-east\/hampshire-fleet-pond-1/);
});

test('CLI: the briefs of the new standard (upgrade in batches by archetype, composed with the scene card, object, archetype); the help lists object and scene', async () => {
  const up = JSON.parse((await run(['brief', 'asia', '--kind', 'upgrade', '--json'])).out);
  assert.ok(up.batches.length >= 19 && up.batches.every(b => b.items.length >= 1 && b.items.length <= 7));
  const one = (await run(['brief', 'asia', '--kind', 'upgrade', '--batch', '1'])).out;
  assert.match(one, /^# Brief: upgrade \d hand-drawn Asia scenes? to the new standard/); assert.match(one, /scene upgrade <ref> --box x0,y0,x1,y1/); assert.match(one, /--compare --upgrades --times/);
  assert.match(one, /hampshire-yateley-common-1/, 'the bar is cited');
  const comp = (await run(['brief', 'my-pack', '--kind', 'composed'])).out;
  assert.match(comp, /```scene\nid: my-scene/); assert.match(comp, /static placements cost NOTHING per frame/i); assert.match(comp, /scene lint my-pack\/my-scene --perf/);
  assert.match((await run(['brief', 'tropical', '--kind', 'object'])).out, /kit:tropical/);
  if (INDEX) assert.match((await run(['brief', 'station', '--kind', 'archetype'])).out, /TfL roundel/);
  const legacy = (await run(['brief', 'asia', '--kind', 'scene', '--batch', '1'])).out;
  assert.match(legacy.split('\n').slice(0, 3).join('\n'), /Hand-drawn scenes are the LEGACY tier/);
  const h = await run(['--help']);
  assert.match(h.out, /object {6}the object library/); assert.match(h.out, /scene {7}composed scenes/);
  assert.match((await run(['scene', '--help'])).out, /--archetype[\s\S]*--rows[\s\S]*--compare[\s\S]*--dry-run/);
  assert.match((await run(['object', '--help'])).out, /--kit[\s\S]*--kits[\s\S]*--role/);
  const bad = await run(['scene', 'nope']); assert.equal(bad.code, 1); assert.match(bad.err, /new, upgrade, lint, sheet, perf or capture/);
  const legacyRef = await run(['scene', 'upgrade', 'us-northeast/nope']); assert.equal(legacyRef.code, 1); assert.match(legacyRef.err, /unknown ref/);
});

/* ---------------------------------------------------------------------------------------------
   The CLI with the engine (skipped until the core, the library and the demo are in the checkout)
   --------------------------------------------------------------------------------------------- */
test('CLI with the engine: object list and object lint --json over the library', { skip: ENGINE }, async () => {
  const l = await run(['object', 'list']);
  assert.equal(l.code, 0, l.err); assert.match(l.out, /object\(s\)/);
  const j = JSON.parse((await run(['object', 'lint', '--json'])).out);
  assert.ok(j.objects.length > 0);
  for (const o of j.objects) assert.ok(Array.isArray(o.failures));
});

test('CLI with the engine: scene lint over the demo pack and a 50-row batch with its summary table (under 10 s)', { skip: ENGINE || (!REG.items().some(e => e.pack === 'scene-demo') && 'the demo pack is not in this checkout yet') }, async () => {
  const j = JSON.parse((await run(['scene', 'lint', '--pack', 'scene-demo', '--json'])).out);
  assert.ok(j.scenes.length >= 3);
  const t0 = Date.now();
  const b = await run(['scene', 'lint', '--archetype', 'station', '--table', 'london-demo', '--rows', '50']);
  assert.ok(Date.now() - t0 < 10000, `${Date.now() - t0} ms`);
  assert.match(b.out, /BATCH SUMMARY\n {2}rows 53 {3}pass \d+ {3}fail \d+ {3}worst animatedDraws \d+/);
});

test('CLI with the engine: scene upgrade --dry-run suggests skyline-water for Singapore, falls back to basic while it is not built, and lists the two files', { skip: ENGINE || (!INDEX && 'the archetype index is not in this checkout yet') }, async () => {
  // Singapore already has the pilot's draft upgrade: --force scaffolds over it (--dry-run still writes nothing)
  const r = await run(['scene', 'upgrade', 'asia-southeast/singapore-skyline', '--box', '560,160,1120,640', '--dry-run', '--force', '--json']);
  assert.equal(r.code, 0, r.err);
  const j = JSON.parse(r.out);
  assert.equal(j.suggest[0].id, 'skyline-water'); assert.equal(j.key, 'place:singapore');
  if (!E_REAL.archetype('skyline-water')) { assert.equal(j.archetype, 'basic'); assert.equal(j.fallback, true); }
  assert.deepEqual(j.files, ['src/app/70-scene-lib-landmark-singapore.js', 'src/app/71-scene-upgrade-asia-singapore.js']);
  assert.ok(j.landmark.count > 0);
});

test('CLI with the engine: scene new writes a scene that compiles and lints (in a temp copy)', { skip: ENGINE }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'scene-tool-')); temps.push(dir);
  mkdirSync(join(dir, 'src'), { recursive: true });
  cpSync(join(ROOT, 'src', 'app'), join(dir, 'src', 'app'), { recursive: true });
  cpSync(join(ROOT, 'src', 'styles'), join(dir, 'src', 'styles'), { recursive: true });
  const w = await run(['scene', 'new', 'zz-test', 'meadow', '--lat', '51.33', '--lon=-0.85', '--root', dir]);
  assert.equal(w.code, 0, w.err); assert.match(w.out, /src\/app\/71-scene-zz-test-1\.js[\s\S]*src\/app\/72-anim-pack-zz-test\.js/);
  const l = JSON.parse((await run(['scene', 'lint', 'zz-test/meadow', '--json', '--root', dir])).out);
  assert.equal(l.scenes.length, 1); assert.ok(l.scenes[0].stats.placements > 300, 'dense cover from the kits');
  const again = await run(['scene', 'new', 'zz-test', 'meadow', '--lat', '51.33', '--lon=-0.85', '--root', dir]);
  assert.equal(again.code, 1); assert.match(again.err, /already exists/);
});
