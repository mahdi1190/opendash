// World engine, package kb: the fill (docs/dev/WORLD_ENGINE.md 12.3; requirements P5, P6, P7, P8, C3, C6). Edge dressing, the
// auto-fill by surface, style and season, the framing foreground, landmark protection, the richness floor and the bare-frame
// loop. The fill must turn a spec with only a camera and a water polygon into a scene above the richness floor, with no
// overlaps, nothing on a walking line and <= 15 % of the frame bare.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
// the same engine without sense's placement API: the fill's own checks and entity records (a missing package removes a feature)
const W2 = loadWorld(ROOT, { extra: ';worldPlaceAdd = undefined; worldPlaceProbe = undefined; worldPlaceOk = undefined;' });
const CAM = { eye: 1.65, fov: 62, horizon: 455, heading: 70 };
const PLACE = { lat: 51.2905, lon: -0.8228, region: 'hampshire' };
const POND = { id: 'pond', kind: 'water', water: 'pond', poly: [[-30, 14], [25, 12], [40, 60], [-35, 70]], shallow: 0.6 };
const waterOnly = () => ({ v: 3, place: Object.assign({}, PLACE), camera: Object.assign({}, CAM), surfaces: [JSON.parse(JSON.stringify(POND))], seed: 3 });
const canalSpec = () => ({ v: 3, place: Object.assign({}, PLACE), camera: Object.assign({}, CAM), seed: 4,
  surfaces: [
    { id: 'verge', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 300], [-200, 300]] },
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-12, 2], [-3, 2], [-1, 300], [-10, 300]], shallow: 0.6 },
    { id: 'tow', kind: 'towpath', path: [[1.2, 1], [3, 150], [4, 300]], width: 2.6 },
  ],
  life: [{ who: 'walkers', on: 'tow', rate: '4/min', edges: ['S', 'N'] }] });

/** Build a world through the core when it is loaded (it runs the fill itself), else a minimal world; then the fill (idempotent). */
function build(E, spec, o = {}) {
  let world;
  if (typeof E.worldBuild === 'function') world = E.worldBuild(spec, Object.assign({ validate: false }, o));
  else world = { cam: E.sceneCamera({ camera: spec.camera }), place: spec.place, seed: spec.seed, surfaces: spec.surfaces, entities: [], life: spec.life || [], backdrop: spec.backdrop || null };
  const log = E.worldFill(world, Object.assign({}, o));
  return { world, log };
}
/** A bare world record (no core build): the fill's input shape. */
function bareWorld(E, spec) {
  return { v: 3, cam: E.sceneCamera({ camera: spec.camera }), place: spec.place, seed: spec.seed, surfaces: JSON.parse(JSON.stringify(spec.surfaces)), entities: [],
    life: (spec.life || []).map(l => Object.assign({}, l)), backdrop: spec.backdrop || null, log: [] };
}
function penetration(A, B) {
  let best = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = -(b[1] - a[1]), nz = b[0] - a[0], L = Math.hypot(nx, nz);
    if (!L) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const v = (q[0] * nx + q[1] * nz) / L; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
    for (const q of B) { const v = (q[0] * nx + q[1] * nz) / L; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return 0;
    best = Math.min(best, o);
  }
  return best === Infinity ? 0 : best;
}
/** Solid ground footprints that intersect (> 5 cm) where at least one is auto-placed. */
function overlaps(world) {
  const S = world.entities.filter(e => e && e.solidity === 'solid' && Array.isArray(e.foot) && e.foot.length >= 3 && !/^(air|deck|wall)/.test(String(e.attach || '')) && !e.backdrop && !e._wplDropped);
  const out = [];
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    const a = S[i], b = S[j];
    if (!a.auto && !b.auto) continue;
    if (Math.abs(a.z - b.z) > 40 || Math.abs(a.x - b.x) > 40) continue;
    const p = penetration(a.foot, b.foot);
    if (p > 0.05) out.push(`${a.id} x ${b.id}: ${p.toFixed(2)} m`);
  }
  return out;
}
function segDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
/** Auto entities whose foot reaches into the 1.2 m walking line of a walk path (P3). */
function onWalkingLines(world) {
  const out = [];
  for (const s of world.surfaces) {
    if (!Array.isArray(s.path) || !['path', 'towpath', 'pavement', 'boardwalk', 'track', 'cycleway'].includes(s.kind)) continue;
    for (const e of world.entities) {
      if (!e.auto || /^(air|deck|wall)/.test(String(e.attach || ''))) continue;
      const pts = (e.foot || []).concat([[e.x, e.z]]);
      let d = Infinity;
      for (const p of pts) for (let i = 1; i < s.path.length; i++) d = Math.min(d, segDist(p[0], p[1], s.path[i - 1], s.path[i]));
      if (d < 0.6 - 0.02) out.push(`${e.id} ${e.obj} ${d.toFixed(2)} m from the line of ${s.id}`);
    }
  }
  return out;
}
const coverage = (E, world) => typeof E.worldCoverage === 'function' ? E.worldCoverage(world, world.cam) : { bare: E.worldRichness(world, world.cam).bare, ok: true };
const perennial = (E, world) => Object.assign({}, world, { entities: world.entities.filter(e => { const k = E.worldKb(e.obj); return !k || !k.when || !(k.when.months || k.when.dates || k.when.weather); }) });

test('the fill interface and its styles: every object exists, belongs in the UK and keeps the care rules', () => {
  for (const n of ['worldFill', 'worldRichness', 'worldFillStyle']) assert.equal(typeof W[n], 'function', n);
  assert.ok(W.WORLD_RICHNESS_FLOOR && W.WORLD_RICHNESS_FLOOR.score > 0);
  const ids = new Set(), walk = (o) => { if (Array.isArray(o)) { if (o.length === 2 && typeof o[0] === 'string' && typeof o[1] === 'number') ids.add(o[0]); else o.forEach(walk); } else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (['obj', 'trunk', 'bough'].includes(k) && typeof v === 'string') ids.add(v); walk(v); } };
  walk(W.WORLD_FILL_STYLES);
  assert.ok(ids.size > 30);
  for (const id of ids) {
    assert.ok(W.sceneObj(id), 'no library object ' + id);
    const kb = W.worldKb(id);
    assert.ok(kb, 'no descriptor ' + id);
    assert.equal(W.worldKbRegionOk(kb, PLACE).ok, true, id + ' is not a UK object');
    assert.equal(kb.care.ok, true, id + ' breaks the care rules');
  }
  for (const [k, st] of Object.entries(W.WORLD_FILL_STYLES)) {
    for (const g of ['grass', 'paving', 'path', 'water']) assert.ok(st.fill[g], `${k} fills ${g}`);
    assert.ok(Array.isArray(st.frame) && st.frame.length, k + ' has framing options');
    assert.ok(st.edges && st.edges.water, k + ' dresses water edges');
  }
  for (const lessonBlob of ['tree.pond-wood', 'tree.pond-oak', 'tree.pool-oak', 'tree.birch-heath']) assert.ok(!ids.has(lessonBlob), 'no lollipop trees in the fill: ' + lessonBlob);
});

test('a spec with only a camera and a water polygon becomes a scene above the richness floor: no overlaps, nothing on a walking line, <= 15 % bare', () => {
  for (const E of [W, W2]) {
    const t0 = Date.now();
    const { world } = build(E, waterOnly());
    const ms = Date.now() - t0;
    const auto = world.entities.filter(e => e.auto);
    assert.ok(auto.length > 60, 'filled: ' + auto.length);
    assert.ok(auto.some(e => e.auto === 'edge') && auto.some(e => e.auto === 'fill'), 'edges dressed and surfaces filled');
    const rich = E.worldRichness(world, world.cam);
    assert.ok(rich.ok, 'richness ' + JSON.stringify(rich));
    assert.ok(rich.score >= E.WORLD_RICHNESS_FLOOR.score);
    const cov = coverage(E, world);
    assert.ok(cov.bare <= 0.15, 'bare ' + cov.bare);
    const covAllYear = coverage(E, perennial(E, world));
    assert.ok(covAllYear.bare <= 0.15, 'bare without the seasonal accents (January) ' + covAllYear.bare);
    assert.deepEqual(overlaps(world), []);
    assert.deepEqual(onWalkingLines(world), []);
    assert.ok(world.backdrop && world.backdrop.style, 'a backdrop from the place style');
    assert.ok(ms < 1500, `build and fill took ${ms} ms`);
    // every auto entity stands on its habitat (K1) and belongs in the region (K7)
    for (const e of auto) {
      const kb = E.worldKb(e.obj);
      assert.ok(kb, e.obj);
      assert.equal(E.worldKbRegionOk(kb, world.place).ok, true, e.obj);
    }
    // the reeds stand in the margin of the pond, the trees out of the water
    const reeds = auto.filter(e => (E.worldKb(e.obj) || {}).cls === 'reed');
    assert.ok(reeds.length > 10, 'reed stands on the banks');
    const inPond = (x, z) => { let c = false; const P = POND.poly; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < (P[j][0] - P[i][0]) * (z - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
    for (const e of auto.filter(e => ['tree', 'shrub', 'flower'].includes((E.worldKb(e.obj) || {}).cls))) assert.equal(inPond(e.x, e.z), false, `${e.obj} in the pond`);
  }
});

test('the fallback path (no sense loaded) logs every auto entity with its reason and keeps the core entity shape', () => {
  const world = bareWorld(W2, waterOnly());
  const log = W2.worldFill(world, {});
  const auto = world.entities.filter(e => e.auto);
  assert.ok(auto.length > 60);
  for (const e of auto) {
    assert.ok(e.id && e.obj && Number.isFinite(e.x) && Number.isFinite(e.z) && Number.isFinite(e.y) && Array.isArray(e.foot) && e.foot.length >= 3, 'shape ' + JSON.stringify(e).slice(0, 120));
    assert.ok(['fill', 'edge', 'frame'].includes(e.auto));
  }
  const ids = new Set(log.filter(l => l.id).map(l => l.id));
  for (const e of auto) assert.ok(ids.has(e.id), 'logged ' + e.id);
  for (const l of log) { assert.equal(l.by, 'kb'); assert.ok(['fill', 'dress', 'frame', 'default'].includes(l.action), l.action); assert.equal(typeof l.reason, 'string'); }
  assert.ok(log.some(l => l.action === 'default' && /backdrop/.test(l.reason)), 'the default backdrop is logged');
  assert.deepEqual(world.log.length, log.length, 'the entries go into world.log too');
});

test('a canal with a lived towpath: reeds in the margin, verges beside the path, nothing on the walking line or on the lived path', () => {
  for (const E of [W, W2]) {
    const { world } = build(E, canalSpec());
    const auto = world.entities.filter(e => e.auto);
    assert.deepEqual(onWalkingLines(world), []);
    assert.deepEqual(overlaps(world), []);
    const tow = world.surfaces.find(s => s.id === 'tow');
    const onTow = auto.filter(e => !/^(air|deck)/.test(String(e.attach || '')) && tow.path.some((p, i) => i > 0 && segDist(e.x, e.z, tow.path[i - 1], p) < tow.width / 2));
    assert.deepEqual(onTow.map(e => e.obj), [], 'nothing placed on the lived towpath');
    const reeds = auto.filter(e => (E.worldKb(e.obj) || {}).cls === 'reed');
    assert.ok(reeds.length >= 5, 'reed stands on the offside bank: ' + reeds.length);
    const cut = world.surfaces.find(s => s.id === 'cut').poly;
    const nearCut = (x, z) => { let c = false; for (let i = 0, j = cut.length - 1; i < cut.length; j = i++) if ((cut[i][1] > z) !== (cut[j][1] > z) && x < (cut[j][0] - cut[i][0]) * (z - cut[i][1]) / (cut[j][1] - cut[i][1]) + cut[i][0]) c = !c; if (c) return true; let d = Infinity; for (let i = 0, j = cut.length - 1; i < cut.length; j = i++) d = Math.min(d, segDist(x, z, cut[j], cut[i])); return d <= 0.8; };
    for (const r of reeds) assert.ok(nearCut(r.x, r.z), `reeds stand in the margin of the cut: ${r.x}, ${r.z}`);
    assert.ok(auto.some(e => e.auto === 'edge' && e.x > tow.path[0][0] + tow.width / 2 && e.x < tow.path[0][0] + tow.width / 2 + 3 && e.z < 60), 'a verge beside the towpath');
    assert.ok(coverage(E, world).bare <= 0.15);
  }
});

test('fill: false switches the auto-fill off; edges and framing still run; the fill is idempotent and deterministic', () => {
  const spec = Object.assign(waterOnly(), { fill: false });
  const world = bareWorld(W, spec); world.fill = false;
  const log = W.worldFill(world, { fill: false });
  assert.equal(world.entities.filter(e => e.auto === 'fill').length, 0, 'no auto-fill');
  assert.ok(world.entities.some(e => e.auto === 'edge'), 'edges still dressed');
  assert.ok(world.entities.some(e => e.auto === 'frame') || log.some(l => l.rule === 'C3'), 'framing still runs');
  assert.ok(log.some(l => /fill: false/.test(l.reason)));
  // the fill switched on later fills what was skipped, once
  world.fill = true;
  W.worldFill(world, {});
  assert.ok(world.entities.some(e => e.auto === 'fill'), 'filled once switched on');
  const n1 = world.entities.length;
  W.worldFill(world, {});
  assert.equal(world.entities.length, n1, 'a second call adds nothing');
  // determinism: the same spec gives the same entities
  const a = bareWorld(W, waterOnly()), b = bareWorld(W, waterOnly());
  W.worldFill(a, {}); W.worldFill(b, {});
  assert.deepEqual(a.entities.map(e => [e.obj, e.x, e.z, e.variant]), b.entities.map(e => [e.obj, e.x, e.z, e.variant]));
});

test('clustered and seeded, never rows or grids: few equally spaced collinear runs within any object kind', () => {
  const { world } = build(W, waterOnly());
  const by = new Map();
  for (const e of world.entities.filter(e => e.auto === 'fill' || e.auto === 'edge')) { const l = by.get(e.obj) || []; l.push(e); by.set(e.obj, l); }
  let checked = 0;
  for (const [obj, L] of by) {
    if (L.length < 8) continue;
    // a row or a lattice puts many points exactly midway between two others on a line, at the same spacing again and again
    const nn = L.map(e => Math.min(...L.filter(q => q !== e).map(q => Math.hypot(q.x - e.x, q.z - e.z))));
    const sp = nn.slice().sort((a, b) => a - b)[Math.floor(nn.length / 2)];
    const inRun = new Set();
    for (const b of L) for (const a of L) {
      if (a === b) continue;
      const cx = 2 * b.x - a.x, cz = 2 * b.z - a.z, dab = Math.hypot(a.x - b.x, a.z - b.z);
      if (dab > 2.5 * sp) continue;
      if (L.some(c => c !== a && c !== b && Math.hypot(c.x - cx, c.z - cz) < 0.06 * dab)) { inRun.add(a); inRun.add(b); }
    }
    assert.ok(inRun.size / L.length < 0.35, `${obj}: ${inRun.size} of ${L.length} stand in equally spaced rows`);
    checked++;
  }
  assert.ok(checked >= 1);
});

test('P8: nothing auto-placed hides a declared landmark main face', () => {
  const spec = Object.assign(waterOnly(), { surfaces: [], landmarks: [{ obj: 'landmark.st-peters-yateley', at: [2, 70], facing: 0, src: 'test', id: 'church' }] });
  const { world } = build(W, spec);
  const lm = world.entities.find(e => e.id === 'church');
  assert.ok(lm, 'the landmark stands');
  const box = W.worldEntityBox ? W.worldEntityBox(world.cam, lm) : null;
  if (!box) return;
  const x0 = Math.max(0, box[0]), x1 = Math.min(1600, box[2]), y0 = Math.max(0, box[1]), y1 = Math.min(900, box[3]);
  const zf = Math.min(...lm.foot.map(p => p[1]));
  const near = world.entities.filter(e => e.auto && e.z < zf).map(e => {
    const k = W.worldKb(e.obj);
    if (k && k.hang) return null;
    return W.worldEntityBox(world.cam, e);
  }).filter(Boolean);
  let hid = 0, n = 0;
  for (let i = 0; i < 16; i++) for (let j = 0; j < 9; j++) {   // the main face: the box above its foot row
    const X = x0 + (i + 0.5) * (x1 - x0) / 16, Y = y0 + (j + 0.5) * (y1 - y0) / 10; n++;
    if (near.some(b => X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3])) hid++;
  }
  assert.ok(hid / n <= 0.1, `auto items cover ${Math.round(hid / n * 100)} % of the landmark`);
});

test('C3: a natural framing element at a side of the near band when the author gave none; a framing bough has its tree', () => {
  for (const spec of [canalSpec(), Object.assign(waterOnly(), { surfaces: [] })]) {
    const { world } = build(W, spec);
    const frame = world.entities.filter(e => e.auto === 'frame');
    const c3 = (world.log || []).filter(l => l.rule === 'C3');
    assert.ok(frame.length >= 1 || c3.some(l => /already framed/.test(l.reason)), 'a framing element: ' + JSON.stringify(c3));
    const cam = world.cam;
    for (const e of frame) {
      const X = cam.x0 + cam.f / e.z * e.x;
      assert.ok(X < 0.35 * 1600 || X > 0.65 * 1600, 'at a side of the frame: ' + X);
      const kb = W.worldKb(e.obj);
      if (kb.parent && !kb.parent.optional) {
        const p = world.entities.find(q => q.id === e.parent);
        assert.ok(p, `${e.obj} has its parent`);
        assert.equal(W.worldKbParentOk(kb, e, Object.assign({}, p, { height: p.height }), { cam }).ok, true);
      }
    }
  }
  // the author's framing is kept and nothing is added
  const spec = Object.assign(canalSpec(), { entities: [{ obj: 'plant.yc-gorse-spray', at: [5.5, 7], id: 'gorse-frame', framed: true }, { obj: 'plant.yc-gorse-spray', at: [6.4, 7.6] }, { obj: 'plant.yc-gorse-spray', at: [5.0, 8.2] }] });
  const w2 = build(W, spec).world;
  if (w2.entities.find(e => e.id === 'gorse-frame')) assert.equal(w2.entities.filter(e => e.auto === 'frame').length, 0, 'no second frame');
});

test('paving gets sparse street furniture (scattered, >= 3 m apart) and its people: an unlived plaza gets a crowd population (C6)', () => {
  const spec = { v: 3, place: { lat: 53.4794, lon: -2.2453, region: 'greater-manchester', style: 'city-manchester-towers' }, camera: { eye: 1.65, fov: 64, horizon: 470, heading: 20 },
    surfaces: [{ id: 'plaza', kind: 'plaza', poly: [[-40, 2], [40, 2], [40, 60], [-40, 60]] }, { id: 'road', kind: 'road', path: [[-200, 70], [200, 70]], width: 8 }], seed: 9 };
  for (const E of [W, W2]) {
    const { world } = build(E, spec);
    const furnIds = new Set((world.log || []).filter(l => l.id && /street furniture/.test(l.reason || '')).map(l => l.id));
    const furn = world.entities.filter(e => furnIds.has(e.id));
    assert.ok(furn.length >= 4 && furn.length <= 40, 'a few pieces of street furniture: ' + furn.length);
    for (let i = 0; i < furn.length; i++) for (let j = i + 1; j < furn.length; j++) assert.ok(Math.hypot(furn[i].x - furn[j].x, furn[i].z - furn[j].z) >= 2.9, 'furniture never in clutter');
    const crowd = world.life.find(l => l.on === 'plaza');
    assert.ok(crowd && crowd.who === 'crowd' && crowd.auto === 'fill', 'a crowd dresses the plaza');
    assert.ok((world.log || []).some(l => l.rule === 'C6' && /crowd on plaza/.test(l.reason)));
    assert.ok(coverage(E, world).bare <= 0.15);
    assert.ok(world.lines.some(l => l.kind === 'kerb'), 'kerbs along the road');
    assert.ok(world.surfaces.some(s => s.auto === 'edge' && s.kind === 'pavement'), 'a pavement beside the road');
    assert.deepEqual(overlaps(world), []);
  }
  // the author's own population is kept as it is
  const spec2 = Object.assign({}, spec, { life: [{ who: 'crowd', on: 'plaza', rate: '20/min' }] });
  const w2 = build(W, spec2).world;
  assert.equal(w2.life.filter(l => l.on === 'plaza').length, 1);
});

test('P7 the box measure (the critic measure): the richness tier lifts a bare world towards the target, and seasonal things wait for the renderer', () => {
  const { world } = build(W, waterOnly());
  const r = W.worldRichness(world, world.cam);
  assert.ok(r.box && r.box.near && r.box.mid && r.box.far && Number.isFinite(r.box.score), 'worldRichness reports the box measure');
  assert.ok(r.box.score >= 80, 'a bare pond becomes a rich scene: box ' + r.box.score);
  assert.ok(r.box.mid.variety >= 12, 'mid-distance variety ' + r.box.mid.variety);
  assert.ok((world.log || []).some(l => l.rule === 'P7' && /richness tier/.test(l.reason)));
  // things that come and go (flowers, lilies, leaf litter) are placed only where the renderer hides them out of season
  const seasonalOf = w => w.entities.filter(e => { const k = W.worldKb(e.obj); return e.auto && k && k.when && (k.when.months || k.when.dates || k.when.weather); });
  assert.deepEqual(seasonalOf(world).map(e => e.obj), [], 'no seasonal auto entities by default');
  const w2 = bareWorld(W, waterOnly());
  W.worldFill(w2, { seasonal: true });
  assert.ok(seasonalOf(w2).length > 0, 'seasonal accents when asked (o.seasonal or a renderer that hides them)');
  // a converted scene's source score raises the target
  const w3 = bareWorld(W, waterOnly());
  W.worldFill(w3, { floor: { score: 50 } });
  assert.ok((w3.log || []).some(l => /target 50, the source/.test(l.reason)) || W.worldRichness(w3, w3.cam).box.score >= 50);
});

test('never throws: junk worlds give a log', () => {
  for (const x of [null, undefined, 3, {}, { cam: {} }, { cam: W.sceneCamera({ camera: CAM }), surfaces: 'x', entities: null }]) assert.ok(Array.isArray(W.worldFill(x, {})));
  const r = W.worldRichness(null, null);
  assert.equal(r.ok, false);
});

test('the three test scenes are at or above the richness floor and <= 15 % bare after the fill', () => {
  const items = typeof W.sceneItems === 'function' ? (W.sceneItems('world-test') || []) : [];
  for (const id of ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3']) {
    const it = items.find(i => i.id === id);
    if (!it || !it.worldSpec) continue;
    const t0 = Date.now(), world = W.worldBuild(it.worldSpec, { validate: false });
    W.worldFill(world, {});
    const ms = Date.now() - t0, rich = W.worldRichness(world, world.cam), cov = coverage(W, world);
    assert.ok(rich.ok, `${id}: ${JSON.stringify(rich)}`);
    assert.ok(cov.bare <= 0.15, `${id}: bare ${cov.bare}`);
    assert.deepEqual(onWalkingLines(world), [], id);
    assert.ok(ms < 2000, `${id}: build + fill ${ms} ms`);
  }
});
