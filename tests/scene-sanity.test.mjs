// The placement-sanity lint (docs/dev/SCENE_ENGINE_V2.md 15.1, 15.2 and 27.4; builder D): crafted COMPILED scenes and a fake
// engine, so every rule is shown to fire on the defect it names (with its fix) and to stay quiet on a sane scene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sanityRules, sanitySummary, slotKind, slotOfPaint, pathContains, inferCamera, classOf, SLOT_KINDS, SANITY_SEV } from '../tools/lib/scene-sanity.mjs';
import { lintScene } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TH = JSON.parse(readFileSync(join(ROOT, 'tools', 'anim-quality.json'), 'utf8'));
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
const DEFS = {
  'vehicle.car': { id: 'vehicle.car', category: 'vehicle', size: [92, 34], tags: ['car', 'kit:vehicles', 'role:vehicle'] },
  'boat.b': { id: 'boat.b', category: 'boat', size: [200, 60], tags: ['kit:boats', 'role:boat'] },
  'tree.t': { id: 'tree.t', category: 'tree', size: [200, 300], tags: ['kit:temperate', 'role:tree'] },
  'person.w': { id: 'person.w', category: 'person', size: [20, 64], tags: ['silhouette', 'kit:people', 'role:walker'] },
  'street.bench': { id: 'street.bench', category: 'street', size: [88, 40], tags: ['kit:urban', 'role:street'] },
  'landmark.l': { id: 'landmark.l', category: 'landmark', size: [200, 400], tags: ['landmark', 'place:zz/x'] },
  'building.b': { id: 'building.b', category: 'building', size: [100, 120], tags: ['kit:urban', 'role:building-mid'] },
  'tree.ghost': { id: 'tree.ghost', category: 'tree', size: [200, 300], tags: ['kit:temperate', 'role:tree'] },
};
const SHAPES = (id) => {
  const d = DEFS[id], [w, h] = d.size;
  return { box: [-w / 2, -h, w / 2, 2], parts: { body: [{ f: '#405060', d: rect(-w / 2, -h, w, h), op: id === 'tree.ghost' ? 0.4 : 1 }] }, order: ['body'], anim: [] };
};
const fakeE = () => ({ ready: true, obj: (id) => DEFS[id] || null, shapes: SHAPES, compile: (d) => d.__C, data: (x) => x, validate: () => [], require() {} });
const LAYERS = (haze = {}) => ['horizon', 'far', 'mid', 'near', 'fore', 'front'].map((id, i) => ({ id, i, depth: [0.08, 0.2, 0.45, 0.75, 1, 1.25][i], haze: haze[id] || 0 }));
let seq = 0;
const item = (o, x, y, s, layer, extra = {}) => Object.assign({ o, v: 0, x, y, s, flip: false, layer, haze: 0, tint: null, season: 'summer', seed: ++seq, z: y, strip: -1, anim: [], shadow: false, reflect: false }, extra);
/** A sane v1 scene: a lawn to the horizon (480), a road across the near band, a car on the road, a person on the lawn, each at
 * the size of its depth (the camera fitted to the depth ladder: eye 5.47 m, fov 80). */
function base({ items = [], place = [], haze = {}, water = [] } = {}) {
  const C = { v: 1, id: 'crafted', season: 'summer', view: { horizon: 480, fov: 80, lat: 51.3, lon: -0.8 }, layers: LAYERS(haze),
    ground: [{ layer: 1, d: 'M-160 480H1760V900H-160Z', fill: '#5a7a3a' }, { layer: 3, d: rect(-160, 700, 1920, 60), fill: '#555555' }],
    water: water.map(w => ({ layer: 2, d: w, y0: 600, y1: 660, base: ['#000', '#000', '#000'], reflect: true, shimmer: 0, lightPath: false })),
    items: [item('vehicle.car', 400, 730, 2.0, 3), item('person.w', 1200, 820, 1.67, 4)].concat(items), strips: [], actors: [], flocks: [], signs: [], stats: {} };
  const data = { id: 'crafted', view: C.view, ground: [{ layer: 'far', fill: '@lawn' }, { layer: 'near', fill: '@road.0' }], water: water.map(() => ({ fill: '@water' })), place, __C: C };
  return { C, data };
}
const run = (s, opts = {}) => sanityRules(s.C, s.data, Object.assign({ E: fakeE(), thresholds: TH }, opts));
const ruleOf = (rules, r) => rules.find(x => x.rule === r);

test('sanity: the slot dictionary judges by the head word; unknown slots are not judged', () => {
  assert.equal(slotKind('lawn'), 'soft'); assert.equal(slotKind('road'), 'drive'); assert.equal(slotKind('pave'), 'walk-hard');
  assert.equal(slotKind('towpath'), 'walk', 'towpath: path'); assert.equal(slotKind('riverbank'), 'soft', 'riverbank: bank, not river');
  assert.equal(slotKind('parkingTarmac'), 'drive'); assert.equal(slotKind('ballast'), 'rail'); assert.equal(slotKind('shingle'), 'beach');
  assert.equal(slotKind('ground'), null); assert.equal(slotKind('hills'), null);
  assert.equal(slotOfPaint('@road.1'), 'road'); assert.equal(slotOfPaint({ lin: [[0, '@pave.0'], [1, '#fff']] }), 'pave'); assert.equal(slotOfPaint('#556677'), null);
  for (const k of ['drive', 'walk-hard', 'walk', 'soft', 'water', 'beach', 'rail']) assert.ok(SLOT_KINDS[k].length);
  assert.equal(Object.keys(SANITY_SEV).length, 16, 'the 16 rules of 15.1');
});

test('sanity: path hit-testing follows curves, arcs and the non-zero rule', () => {
  assert.ok(pathContains('M-160 600Q800 500 1760 600V900H-160Z', 800, 560), 'under the curve top');
  assert.ok(!pathContains('M-160 600Q800 500 1760 600V900H-160Z', 800, 530));
  assert.ok(pathContains('M100 100a50 50 0 1 0 100 0a50 50 0 1 0 -100 0z', 150, 100), 'a circle');
  assert.ok(!pathContains('M100 100a50 50 0 1 0 100 0a50 50 0 1 0 -100 0z', 210, 100));
  assert.ok(pathContains('M0 0H100V100H0Z M20 20H80V80H20Z', 50, 50), 'non-zero: an inner ring with the same winding stays filled');
  const cam = inferCamera({ view: { horizon: 560, fov: 80 } }, {});
  assert.ok(Math.abs(cam.eye - 1.72 * 340 / 132) < 1e-9, 'the eye fitted to the depth ladder');
  assert.equal(classOf(DEFS['vehicle.car']), 'car'); assert.equal(classOf(DEFS['person.w']), 'person'); assert.equal(classOf({ id: 'bird.duck', category: 'bird', tags: ['water'] }), 'bird-water');
});

test('sanity: a sane scene raises nothing', () => {
  const rules = run(base());
  assert.equal(rules.length, 16);
  assert.deepEqual(rules.filter(r => r.offenders.length).map(r => r.rule), []);
  assert.ok(rules.every(r => r.ok && !r.warn));
});

test('sanity: a car on @lawn gives vehicleSurface with its fix; a v1 scene keeps it a warning, --strict-placement fails it', () => {
  const s = base({ items: [item('vehicle.car', 900, 650, 0.6, 3)], place: [] });
  const v = ruleOf(run(s), 'vehicleSurface');
  assert.equal(v.offenders.length, 1); assert.equal(v.ok, true, 'v1: a warning'); assert.match(v.warn, /stands on grass \(slot @lawn\) at x 900 y 650: move it onto the road \(on: 'road'\), or run scene migrate/);
  const strict = ruleOf(run(s, { strict: true }), 'vehicleSurface');
  assert.equal(strict.ok, false); assert.match(strict.message, /vehicleSurface: .*move it onto the road/);
  const v2 = ruleOf(run(s, { v1: false }), 'vehicleSurface');
  assert.equal(v2.ok, false, 'a migrated (v2) scene: an error without strict');
});

test('sanity: a tree in the sky floats; a boat on land; a person on the road', () => {
  const s = base({ items: [item('tree.t', 800, 300, 0.4, 2), item('boat.b', 300, 820, 0.5, 4), item('person.w', 1000, 730, 1.1, 3)] });
  const r = run(s);
  assert.equal(ruleOf(r, 'floating').offenders.length, 1); assert.match(ruleOf(r, 'floating').warn, /tree\.t stands on no ground or water .*pin: true/);
  assert.equal(ruleOf(r, 'boatSurface').offenders.length, 1); assert.match(ruleOf(r, 'boatSurface').warn, /boat off the water/);
  assert.equal(ruleOf(r, 'personSurface').offenders.length, 1); assert.match(ruleOf(r, 'personSurface').warn, /stands on the road .*pavement/);
});

test('sanity: a person twice the size of a neighbour gives scalePairs; an oversized walker gives scale', () => {
  const s = base({ items: [item('person.w', 600, 800, 1.6, 4), item('person.w', 660, 805, 3.3, 4)] });
  const r = run(s);
  const p = ruleOf(r, 'scalePairs');
  assert.equal(p.offenders.length, 1); assert.match(p.warn, /is 2(\.\d+)? x the size of .* on the same baseline.*: size both by the depth/);
  assert.ok(ruleOf(r, 'scale').offenders.some(o => /drawn .* m tall|are drawn at x [\d.]+ to x/.test(o.msg)), 'the big one is out of its real height too');
});

test('sanity: haze 0.6 in the near band gives ghost and haze', () => {
  const s = base({ haze: { near: 0.6 }, items: [item('tree.t', 300, 760, 0.8, 3, { haze: 0.6 })] });
  const r = run(s);
  assert.ok(ruleOf(r, 'ghost').offenders.length >= 1); assert.match(ruleOf(r, 'ghost').warn, /60 % hazed while in the near band/);
  assert.equal(ruleOf(r, 'haze').offenders.length, 1); assert.match(ruleOf(r, 'haze').warn, /layer near carries haze 0\.6/);
  const see = run(base({ items: [item('tree.ghost', 500, 700, 0.5, 2)] }));
  assert.match(ruleOf(see, 'ghost').warn, /see-through/);
});

test('sanity: 5 stamped benches give stamp; 12 salient objects in one window give clutter', () => {
  const benches = [200, 300, 400, 500, 600].map(x => ({ obj: 'street.bench', x, y: 790, s: 0.8, layer: 'fore' }));
  const s = base({ place: benches, items: benches.map(b => item('street.bench', b.x, b.y, b.s, 4)) });
  const st = ruleOf(run(s), 'stamp');
  assert.equal(st.offenders.length, 1); assert.match(st.warn, /place\[0\] street\.bench and 3 more are one size, evenly spaced on a line/);
  const varied = base({ place: benches.map((b, i) => Object.assign({}, b, { x: b.x + [0, 37, -21, 55, 12][i], s: 0.8 + i * 0.07 })), items: benches.map((b, i) => item('street.bench', b.x + [0, 37, -21, 55, 12][i], b.y, 0.8 + i * 0.07, 4)) });
  assert.equal(ruleOf(run(varied), 'stamp').offenders.length, 0, 'varied spacing and sizes are no stamp');
  const crowd = [];
  for (let i = 0; i < 12; i++) crowd.push(item('building.b', 1020 + (i % 6) * 55, 640 + Math.floor(i / 6) * 60, 0.6, 2));
  const c = ruleOf(run(base({ items: crowd })), 'clutter');
  assert.ok(c.offenders.length >= 1); assert.match(c.warn, /1[23] salient placements .* in the 400 x 300 window/);
});

test('sanity: a landmark 40 % behind trees gives landmarkOccluded', () => {
  const L = item('landmark.l', 800, 640, 0.6, 2);
  const trees = [item('tree.t', 760, 660, 0.55, 3), item('tree.t', 860, 670, 0.5, 3)];
  const r = ruleOf(run(base({ items: [L, ...trees] })), 'landmarkOccluded');
  assert.equal(r.offenders.length, 1); assert.ok(r.value > 0.3 && r.value <= 0.75, `share ${r.value}`); assert.match(r.warn, /hidden by nearer placements .*move the trees and buildings in front of it aside/);
  assert.equal(ruleOf(run(base({ items: [L] })), 'landmarkOccluded').offenders.length, 0);
});

test('sanity: a v2 scene: refused is an error (no GOLD), snapped beyond half the radius a warning, viewSync and view from the compile', () => {
  const s = base();
  s.C.v = 2; s.C.cam = { eye: 1.65, fov: 66, horizon: 480, x0: 800, f: 800 / Math.tan(33 * Math.PI / 180) };
  s.C.problems = [{ rule: 'refused', sev: 'error', i: 3, obj: 'vehicle.car', at: [30, 12], msg: 'no road within 3 m', fix: 'on: \'road\'' },
    { rule: 'snapped', sev: 'warn', i: 2, obj: 'person.w', at: [4, 20], m: 1.6, msg: 'moved 1.6 m onto the pavement' },
    { rule: 'snapped', sev: 'warn', i: 5, obj: 'person.w', at: [4, 20], m: 0.4, msg: 'moved 0.4 m' },
    { rule: 'viewSync', sev: 'warn', i: -1, msg: 'view.horizon 520, camera 480' }];
  const r = run(s);
  assert.equal(ruleOf(r, 'refused').ok, false); assert.match(ruleOf(r, 'refused').message, /refused: no road within 3 m/);
  assert.equal(ruleOf(r, 'snapped').offenders.length, 1, 'only the one past half its snap radius');
  assert.equal(ruleOf(r, 'viewSync').offenders.length, 1);
  assert.equal(sanitySummary(r).errors, 1);
  // through lintScene: the sanity group is there; refused blocks GOLD even with a perfect perf
  const lint = lintScene(s.data, TH, { E: fakeE(), perf: { drawMs: { median: 5, p95: 8 }, dynMs: { median: 3 }, firstBakeMs: 100 }, gpu: true });
  assert.ok(lint.rules.some(x => x.group === 'sanity')); assert.equal(lint.gold, false); assert.ok(lint.failures.some(f => f.rule === 'refused'));
});

test('sanity: --strict-placement turns every warning into a failure through lintScene; without it a v1 scene keeps its status', () => {
  const s = base({ items: [item('vehicle.car', 900, 650, 0.6, 3), item('tree.t', 800, 300, 0.4, 2)] });
  const loose = lintScene(s.data, TH, { E: fakeE() }), strict = lintScene(s.data, TH, { E: fakeE(), strict: true });
  assert.ok(!loose.failures.some(f => f.group === 'sanity'), 'v1: warnings only');
  assert.ok(loose.warnings.some(w => /^vehicleSurface:/.test(w)) && loose.warnings.some(w => /^floating:/.test(w)));
  const sf = strict.failures.filter(f => f.group === 'sanity').map(f => f.rule);
  assert.ok(sf.includes('floating') && sf.includes('vehicleSurface'), sf.join(' '));
  assert.equal(strict.strict, true); assert.equal(loose.metrics.sanity.warnings, sf.length);
});
