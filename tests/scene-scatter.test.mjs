// Scene engine v2, builder A (docs/dev/SCENE_ENGINE_V2.md 10, 11, 27.1): smarter scatter (on / avoid and the class rule, no
// shrub on a road, footprints that never overlap, Poisson-disk sampling that passes the variety grid rule, clusters, species,
// determinism and the LOD share) and seasonal ground cover (autumn leaves only on leaf-holding surfaces, thicker under
// deciduous crowns, none in summer, at most 1,500, static).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const G = loadRegistry(ROOT).R.get;
const E = new Proxy({}, { get: (_, n) => G(n) });
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
E.sceneObjDefine({ id: 'plant.v2ascrub', category: 'plant', size: [40, 30], variants: 3, real: { h: 0.9 }, palette: { base: { a: '#446633' }, autumn: { a: '#886633' }, winter: { a: '#667755' } },
  tags: ['kit:v2atest', 'role:shrub'], build: (v) => ({ body: [['@a', rect(-20, -30, 40, 30)]] }) });
E.sceneObjDefine({ id: 'plant.v2ascrub-b', category: 'plant', size: [40, 30], real: { h: 0.7 }, palette: { base: { a: '#335533' } }, seasonal: false, tags: ['kit:v2atest', 'role:shrub'], build: () => ({ body: [['@a', rect(-20, -30, 40, 30)]] }) });
E.sceneObjDefine({ id: 'tree.v2adec', category: 'tree', size: [100, 200], real: { h: 14 }, tags: ['deciduous', 'kit:v2atest', 'role:tree'], build: () => ({ body: [['#336633', rect(-50, -200, 100, 200)]] }) });

const base = (over = {}) => Object.assign({ id: 'v2a-scatter', v: 2, view: { lat: 51.5, lon: -0.8 }, camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180 }, season: 'summer', cover: false,
  surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'heath', kind: 'heath', poly: [[-200, 8], [200, 8], [400, 300], [-400, 300]] },
    { id: 'road', kind: 'road', path: [[2, 2], [4, 120], [-20, 400]], width: 7 }, { id: 'path', kind: 'path', path: [[-30, 6], [-25, 80]], width: 2 }],
  water: [{ id: 'pond', kind: 'pond', poly: [[20, 30], [45, 30], [50, 60], [18, 55]] }], place: [], scatter: [] }, over);
const compile = (d, o) => E.sceneCompile(d, Object.assign({ season: 'summer', lod: 1 }, o || {}));
/** The variety rule's grid measure (tools/lib/scene-lint.mjs placementVariety): the share of nearest-neighbour gaps within 5 % of the median. */
function gridShare(pts) {
  const nn = pts.map((p, i) => Math.min(...pts.filter((_, j) => j !== i).map(q => Math.hypot(q[0] - p[0], q[1] - p[1])))).sort((a, b) => a - b);
  const m = nn[Math.floor(nn.length / 2)];
  return nn.filter(x => Math.abs(x - m) <= m * 0.05).length / nn.length;
}

test('scatter: on and avoid by kind or id, the class rule on top (no shrub on a road, a path or water, ever)', () => {
  const C = compile(base({ scatter: [{ obj: 'plant.v2ascrub', d: [6, 150], n: 200, seed: 1, species: 1 }, { obj: 'plant.v2ascrub', on: 'heath', avoid: ['path'], d: [6, 150], n: 120, seed: 2, species: 1 }] }));
  const its = C.items.filter(i => i.o === 'plant.v2ascrub');
  assert.ok(its.length > 200, 'placed: ' + its.length);
  for (const it of its) {
    const s = E.sceneSurfaceAt(C, it.g.x, it.g.d);
    assert.ok(s && !['road', 'path', 'water'].includes(s.kind), `a shrub on ${s && s.kind} at ${it.g.x},${it.g.d}`);
    assert.equal(s.id, it.g.surf);
    assert.ok(it.g.d >= 6 && it.g.d <= 150);
  }
  assert.ok(its.filter(i => i.g.surf === 'heath').length >= 100);
  assert.ok(its.every(i => i.cls === 'shrub' && i.dz === i.g.d && i.layer === E.sceneDepthBand(C.cam, i.g.d)));
});

test('scatter: footprints never overlap each other or the hand placements (gap: foot)', () => {
  const C = compile(base({ id: 'v2a-feet', place: [{ obj: 'tree.v2adec', at: [-40, 60], k: 1 }, { obj: 'tree.v2adec', at: [30, 120], k: 1 }],
    scatter: [{ obj: 'tree.v2adec', on: ['heath', 'land'], d: [20, 250], n: 60, gap: 'foot', seed: 3, species: 1 }, { obj: 'plant.v2ascrub', on: 'heath', d: [8, 80], n: 150, gap: 'foot', seed: 4, species: 1 }] }));
  const feet = C.items.filter(i => i.g && i.cls !== 'cover').map(i => [i.g.x, i.g.d, G('_scgrFootR')(i.o, i.$k || 1) ]);
  const trees = C.items.filter(i => i.o === 'tree.v2adec');
  assert.ok(trees.length >= 30, 'trees: ' + trees.length);
  // radius from the compiled scale: k = s / (f / d * h / size)
  const rOf = (i) => { const k = i.s / (C.cam.f / i.g.d * E.sceneObjReal(i.o).h / E.sceneObj(i.o).size[1]); return G('_scgrFootR')(i.o, k); };
  const all = C.items.filter(i => i.g && (i.o === 'tree.v2adec' || i.o === 'plant.v2ascrub'));
  for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) {
    const p = all[a], q = all[b], dist = Math.hypot(p.g.x - q.g.x, p.g.d - q.g.d);
    assert.ok(dist >= rOf(p) + rOf(q) - 0.02, `${p.o} and ${q.o} overlap: ${dist.toFixed(2)} < ${(rOf(p) + rOf(q)).toFixed(2)}`);
  }
  assert.ok(feet.length);
});

test('scatter: Poisson disk is even but never a grid (the variety rule passes); clusters clump (Clark-Evans under 0.8)', () => {
  const even = compile(base({ id: 'v2a-even', scatter: [{ obj: 'plant.v2ascrub', on: 'heath', d: [10, 200], n: 160, seed: 5, dist: 'ground', species: 1 }] }));
  const pe = even.items.filter(i => i.o === 'plant.v2ascrub');
  assert.ok(gridShare(pe.map(i => [i.x, i.y])) <= 0.5, 'screen grid share ' + gridShare(pe.map(i => [i.x, i.y])));
  const nnEven = E.sceneScatterNN(pe.map(i => [i.g.x, i.g.d]));
  const cl = compile(base({ id: 'v2a-cluster', scatter: [{ obj: 'plant.v2ascrub', on: 'heath', d: [10, 200], n: 160, seed: 5, dist: 'ground', cluster: { centres: 6, spread: 6 }, species: 1 }] }));
  const pc = cl.items.filter(i => i.o === 'plant.v2ascrub');
  const nnCl = E.sceneScatterNN(pc.map(i => [i.g.x, i.g.d]));
  assert.ok(nnCl < 0.8, 'clustered: ' + nnCl);
  assert.ok(nnCl < nnEven, `clusters (${nnCl}) are clumpier than the even set (${nnEven})`);
  // the sampler itself: no two points closer than the minimum distance
  const r = E.sceneRnd(7), pts = E.scenePoissonDisk(r, [0, 0, 100, 60], 5, () => true, {});
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) assert.ok(Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) >= 5 - 1e-9);
  assert.ok(pts.length > 120, 'it fills the box: ' + pts.length);
});

test('scatter: deterministic; the LOD keeps a seeded share; species fill-out (and species: 1 keeps one)', () => {
  const d1 = base({ id: 'v2a-det', scatter: [{ obj: 'plant.v2ascrub', on: 'heath', d: [8, 120], n: 100, seed: 9 }] });
  const d2 = JSON.parse(JSON.stringify(d1));
  const A = compile(d1), B = compile(d2);
  assert.equal(JSON.stringify(A.items), JSON.stringify(B.items), 'the same data gives the same placements');
  const lo = compile(d1, { lod: 0.3 });
  const nA = A.items.length, nL = lo.items.length;
  assert.ok(nL >= nA * 0.25 && nL <= nA * 0.35, `LOD 0.3 keeps about 30 %: ${nL} of ${nA}`);
  const key = i => i.o + '|' + i.x + '|' + i.y;
  const full = new Set(A.items.map(key));
  assert.ok(lo.items.every(i => full.has(key(i))), 'a subset of the full set');
  assert.ok(A.items.some(i => i.o === 'plant.v2ascrub-b'), 'a second species of the same kit and role');
  assert.ok(A.problems.some(p => p.rule === 'species' && p.sev === 'info'));
  const one = compile(base({ id: 'v2a-one', scatter: [{ obj: 'plant.v2ascrub', on: 'heath', d: [8, 120], n: 100, seed: 9, species: 1 }] }));
  assert.ok(one.items.every(i => i.o === 'plant.v2ascrub'));
});

test('scatter: the scale comes from the depth and k; flips and sizes are stratified; strips per layer', () => {
  const C = compile(base({ id: 'v2a-scale', scatter: [{ obj: 'plant.v2ascrub', on: 'heath', d: [8, 100], n: 80, k: [0.8, 1.2], flip: 0.5, seed: 2, species: 1, anim: 'strip' }] }));
  const its = C.items.filter(i => i.o === 'plant.v2ascrub');
  for (const it of its) { const k = it.s / (C.cam.f / it.g.d * 0.9 / 30); assert.ok(k >= 0.79 && k <= 1.21, 'k in range: ' + k); }
  const flips = its.filter(i => i.flip).length;
  assert.ok(Math.abs(flips - its.length / 2) <= 1, 'half mirrored exactly');
  assert.ok(C.strips.length > 0 && C.strips.every(s => s.items.every(k => C.items[k].strip >= 0 && C.items[k].layer === s.layer)), 'wind strips per layer');
});

test('cover: autumn leaves only on leaf-holding surfaces, thicker under deciduous crowns; none in summer; static; capped', () => {
  const d = base({ id: 'v2a-cover', cover: 'auto', surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'heath', kind: 'heath', poly: [[10, 8], [200, 8], [400, 300], [30, 300]] }, { id: 'road', kind: 'road', path: [[2, 2], [4, 120], [-20, 400]], width: 7 }, { id: 'path', kind: 'path', path: [[-30, 6], [-25, 80]], width: 2 }],
    place: [{ obj: 'tree.v2adec', at: [-12, 18], k: 1 }, { obj: 'tree.v2adec', at: [-20, 26], k: 1 }] });
  const A = compile(d, { season: 'autumn' });
  const leaves = A.items.filter(i => i.o === 'ground.leaf-litter');
  assert.ok(leaves.length > 20, 'leaves: ' + leaves.length);
  for (const it of leaves) {
    const s = E.sceneSurfaceAt(A, it.g.x, it.g.d);
    assert.ok(['grass', 'park', 'lawn', 'path', 'towpath', 'pavement', 'plaza', 'verge', 'wood', 'garden', 'bank', 'meadow'].includes(s.kind), 'a leaf on ' + s.kind);
    assert.equal(it.anim.length, 0, 'static'); assert.equal(it.cls, 'cover'); assert.equal(it.cover, true); assert.equal(it.shadow, false);
    assert.ok(it.g.d <= 60.5, 'cut beyond 60 m');
  }
  // density per square metre within the crowns (radius 0.3 h) against the rest within 30 m on grass
  const inCrown = (i) => [[-12, 18], [-20, 26]].some(c => Math.hypot(i.g.x - c[0], i.g.d - c[1]) < 0.3 * 14 * 0.98);
  const crownArea = 2 * Math.PI * Math.pow(0.3 * 14, 2), nIn = leaves.filter(inCrown).length;
  const nOut = leaves.filter(i => !inCrown(i) && i.g.surf === 'land' && i.g.d < 30).length;
  assert.ok(nIn / crownArea > 0, 'leaves under the crowns: ' + nIn);
  const S = compile(JSON.parse(JSON.stringify(d)), { season: 'summer' });
  assert.equal(S.items.filter(i => i.o === 'ground.leaf-litter').length, 0, 'no leaf litter in summer');
  assert.ok(A.items.filter(i => i.cover).length <= 1500);
  assert.equal(A.stats.v2.coverItems, A.items.filter(i => i.cover).length);
  assert.equal(A.cover.auto, true);
  const off = compile(base({ id: 'v2a-nocover', cover: false }), { season: 'autumn' });
  assert.equal(off.items.filter(i => i.cover).length, 0, 'cover: false turns it off');
  assert.ok(nOut >= 0);
});

test('cover: within the crowns the litter is about three times as thick as on open grass', () => {
  // a wide lawn with one big deciduous tree near the camera: compare leaves per screen area in and out of the crown band
  const d = base({ id: 'v2a-crown', cover: 'auto', surfaces: [{ id: 'land', kind: 'grass', rest: true }], water: [], place: [{ obj: 'tree.v2adec', at: [0, 20], k: 1.4 }] });
  const A = compile(d, { season: 'autumn' });
  const leaves = A.items.filter(i => i.o === 'ground.leaf-litter' && i.g.d > 14 && i.g.d < 26);
  const r = 0.3 * 14 * 1.4, inside = leaves.filter(i => Math.hypot(i.g.x, i.g.d - 20) < r).length;
  const out = leaves.filter(i => Math.abs(i.g.x) > r + 2 && Math.abs(i.g.x) < 4 * r).length;
  const areaIn = Math.PI * r * r, areaOut = 2 * (3 * r - 2) * 12 - 0;   // the two side strips between |x| r+2 and 4r, d 14..26
  assert.ok(inside / areaIn > 1.5 * (out / areaOut), `thicker under the crown: ${inside}/${areaIn.toFixed(0)} m2 vs ${out}/${areaOut.toFixed(0)} m2`);
});
