// World engine, a cobbled hill lane (Elm Hill, Norwich; docs/dev/SCENE_LESSONS.md section AA). One test per reusable piece the place needed:
// the `slope` ground feature (a street that climbs), the terrain pass leaving a thin paved surface on a gentle slope to the base (so its
// cobbles show), the `cobbles` look, the `cobbled-lane` kit, the `tudor-colourwash` style (pastel limewash, plastered fronts, gables) and
// `tudor-thatch`, the flint nodules of the church model, the sitting cat, the lane planter, and the scene itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__hl = { sceneBuildingResolve, sceneBuildingStyle, sceneObj, sceneObjShapes, sceneBuildingProject, _scbgBuild, _scbgFoot, _scbgPersp, _scbgBlockKinds, _scbgWallPlane, _scbgSoftStops };' });
const G = globalThis.__hl;
const LANE = [[0, -8], [0, 26], [1, 50], [3.5, 68], [6, 90]];
const HILL = (h) => ({ features: [{ id: 'hill', kind: 'slope', path: [[0, 0], [0, 26], [1, 50], [3.5, 68], [6, 90]], width: 70, h, fade: 14 }] });
const spec = (extra) => Object.assign({
  v: 3, place: { lat: 52.63, lon: 1.29, region: 'norfolk', style: 'cobbled-lane' }, camera: { eye: 1.7, fov: 54, horizon: 580, heading: 0 }, seed: 5,
  ground: HILL(7), surfaces: [{ id: 'lane', kind: 'plaza', path: LANE, width: 6.6 }], entities: [],
}, extra || {});
const build = (s, o) => W.worldBuild(s, Object.assign({ fill: false }, o || {}));

test('a `slope` feature climbs along its path, is level beyond both ends and across the whole width (no round hump at the head)', () => {
  const v = W.worldValidate(spec());
  assert.ok(v.ok, JSON.stringify(v.errors));
  const w = build(spec()), g = (x, z) => W.sceneGroundHeight(w.cam, x, z);
  assert.ok(Math.abs(g(0, 0)) < 0.05, 'level at the camera (the eye height is above 0 there): ' + g(0, 0));
  assert.ok(g(0, 20) < g(0, 50) && g(0, 50) < g(3.5, 80), 'rising along the lane: ' + [g(0, 20), g(0, 50), g(3.5, 80)].map(v => v.toFixed(2)).join(' < '));
  assert.ok(Math.abs(g(6, 95) - 7) < 0.05 && Math.abs(g(30, 110) - 7) < 0.05 && Math.abs(g(0.3, 104) - 7) < 0.05, 'level at the full rise beyond the end, out to the sides: ' + [g(6, 95), g(30, 110), g(0.3, 104)].join(' '));
  assert.ok(Math.abs(g(25, 60) - g(0, 60)) < 1.3, 'across the width the ground is about as high as the lane (houses stand level with it)');
  assert.ok(g(60, 50) < 0.5 * g(0, 50), 'and falls away beyond width + fade');
  const bad = W.worldValidate(spec({ ground: { features: [{ kind: 'hummock', path: LANE, width: 10, h: 2 }] } }));
  assert.ok(bad.errors.some(e => /kind/.test(e.path || '')), 'an unknown feature kind is still refused');
});

test('a church on the level ground at the head of a slope is not floating (its lowest corner has the same ground)', () => {
  const s = spec({ landmarks: [{ id: 'church', obj: 'structure.parish-church', at: [18, 113], facing: 90, src: 'a flint church', model: { livery: 'flint', size: 1.12, seed: 3, opts: { era: 'perpendicular', aisle: 'south', crown: 'parapet', porch: true } } }] });
  const w = build(s), c = w.entities.find(e => e.id === 'church');
  assert.ok(c && Array.isArray(c.foot) && c.foot.length > 3, 'the church stands');
  for (const q of c.foot) assert.ok(Math.abs(W.sceneGroundHeight(w.cam, q[0], q[1]) - c.y) < 0.05, `corner ${q} is on the ground the church stands on (${c.y})`);
});

test('a thin paved surface on a gentle slope is left to the base (its marks show), a steep one still gets the terrain strip', () => {
  const faces = (s) => W.worldTerrainPrims(build(s), build(s).cam, { season: 'summer' }).reduce((n, p) => n + (p.faces || []).length, 0);
  const gentle = faces(spec()), bare = faces(spec({ surfaces: [{ id: 'far', kind: 'grass', poly: [[300, 300], [310, 300], [310, 310]] }] }));
  assert.ok(gentle > 0 && bare > gentle, `the lane's quads are not drawn over its paving: ${gentle} faces with it, ${bare} without`);
  // ground above the eye projects above the horizon row, where the base draws nothing: the lane's strips stay there (a hole showed the backdrop and the grass)
  const wl = build(spec()), P = W.worldTerrainPrims(wl, wl.cam, { season: 'summer' });
  const above = P.flatMap(p => p.faces).filter(f => f.pts.every(q => q[1] < wl.cam.horizon - 2) && Math.abs((f.pts[0][0] + f.pts[2][0]) / 2 - 800 - 1640 * 2 / 70) < 400);
  assert.ok(above.length > 20, 'strips above the horizon row under the far lane: ' + above.length);
  const steep = (s) => faces(Object.assign({}, s, { ground: { features: [{ id: 'hill', kind: 'slope', path: [[0, 0], [0, 12]], width: 70, h: 7, fade: 14 }] } }));
  const withLane = steep(spec()), noLane = steep(spec({ surfaces: [{ id: 'far', kind: 'grass', poly: [[300, 300], [310, 300], [310, 310]] }] }));
  assert.ok(withLane >= noLane * 0.9, `on a steep slope the lane keeps its strip: ${withLane} vs ${noLane}`);
});

test('the `cobbles` look: stones drawn far to near within the mark cap, each a joint, a stone in one of several tones and (near) a catch of light', () => {
  assert.ok(W.WORLD_GROUND_LOOKS.cobbles && W.WORLD_GROUND_LOOKS.cobbles.cobbles > 0.1 && W.WORLD_GROUND_LOOKS.cobbles.cobbles < 0.3, 'the look exists, stones about 15 cm');
  const w = build(spec()), plan = W.worldGroundDetail(w, w.cam, { W: 1600, H: 900 });
  const g = plan.groups.find(x => x.surf === 'lane');
  assert.ok(g, 'the lane has marks');
  assert.equal(g.look, 'cobbles', 'the kit gives a plaza the cobbles look');
  const dots = g.marks.filter(m => m.t === 'dot' && m.mat === 'stone');
  assert.ok(dots.length > 1500, 'a field of stones: ' + dots.length);
  assert.ok(g.marks.length <= 9000, 'within the mark cap: ' + g.marks.length);
  assert.ok(new Set(dots.map(m => m.c)).size >= 6, 'stones come in several tones');
  assert.ok(dots.every(m => m.y - m.ry <= 905), 'no stone is spent wholly below the frame');
  // far to near: a later stone is never farther up the screen than an earlier one by more than a row of stones
  const ys = dots.map(m => m.y), runs = ys.slice(1).filter((y, i) => y < ys[i] - 25).length;
  assert.ok(runs < dots.length * 0.02, 'drawn far to near (so a near stone covers the one behind it): ' + runs + ' out-of-order');
  const near = dots.filter(m => m.rx > 12).length;
  assert.ok(near > 100, 'the stones near the eye are big enough to read: ' + near);
});

test('the `cobbled-lane` kit: cobbles for the lane, nothing big in the near 12 m, planters built for a lane, its objects exist (worldKitCheck)', () => {
  const k = W.worldKit('cobbled-lane');
  assert.ok(k && k.look.plaza === 'cobbles' && k.look.path === 'cobbles', 'the kit and its look');
  assert.deepEqual(k.fill.paving.near, [], 'a lane 5 m wide has no tub in its near band');
  assert.ok(k.fill.paving.mid.some(e => e[0] === 'plant.lane-planter'), 'its planter is the lane planter, not the 1.8 m village tub');
  assert.equal(W.worldKit('hill-lane'), k, 'aliases');
  const chk = W.worldKitCheck ? W.worldKitCheck('cobbled-lane') : { ok: true, problems: [] };
  assert.ok(chk.ok !== false && !(chk.problems && chk.problems.length), JSON.stringify(chk.problems || chk));
});

test('`tudor-colourwash`: pastel limewash, gables, a share of plastered fronts; York\'s `timber-framed` stays exactly as it was', () => {
  const S = G.sceneBuildingStyle('tudor-colourwash');
  assert.ok(S && S.timber && S.timber.plastered > 0.2 && S.roofs.filter(r => r === 'gable').length >= 3, 'the style: ' + (S && S.label));
  const plasters = new Set(), N = 80;
  let plastered = 0, gables = 0, york = 0;
  for (let seed = 1; seed <= N; seed++) {
    const a = G.sceneBuildingResolve({ style: 'tudor-colourwash', seed, storeys: 2, foot: [[-3, 10], [-3, 16], [-9, 16], [-9, 10]], front: 0 });
    plasters.add(a.tf.plaster);
    if (a.tf.pattern === 'plastered') plastered++;
    if (a.roof === 'gable') gables++;
    const b = G.sceneBuildingResolve({ style: 'timber-framed', seed, storeys: 2, foot: [[-3, 10], [-3, 16], [-9, 16], [-9, 10]], front: 0 });
    if (b.tf.pattern === 'plastered') york++;
  }
  assert.ok(plasters.size >= 6, 'six or more washes among 80 houses: ' + plasters.size);
  assert.ok(plastered > N * 0.2 && plastered < N * 0.65, 'plastered fronts: ' + plastered);
  assert.ok(gables > N * 0.6, 'most roofs are gables to the street: ' + gables);
  assert.equal(york, 0, 'the York style never plasters its frame over');
});

test('a plastered house draws no studs, rails or braces but keeps its posts, plates and openings; a framed one still has studs', () => {
  const foot = [[-3, 10], [-3, 17], [-9, 17], [-9, 10]], cam = { eye: 1.7, fov: 54, horizon: 580, heading: 0, f: 1640 };
  const studs = (seed) => {
    const b = { style: 'tudor-colourwash', seed, storeys: 2, foot, front: 0 }, sp = G.sceneBuildingResolve(b), res = G._scbgBuild(b, sp, G._scbgFoot(b.foot, b.front), G._scbgPersp(cam), { season: 'summer', tierCap: 3 });
    let lvl2 = 0, quads = 0, wins = 0;
    for (const f of res.model.faces) { const el = f.layout ? f.layout(sp, f, res.model) : { elems: f.elems || [] }; for (const e of el.elems || []) { if (e.k === 'tframe') { lvl2 += (e.rects || []).filter(r => r[4] === 2).length; quads += (e.quads || []).length; } if (e.k === 'win') wins++; } }
    return { pattern: sp.tf.pattern, lvl2, quads, wins };
  };
  let P = null, F = null;
  for (let s = 1; s < 200 && !(P && F); s++) { const r = studs(s); if (r.pattern === 'plastered') P = P || r; else if (r.pattern === 'close') F = F || r; }
  assert.ok(P && F, 'both kinds exist');
  assert.equal(P.lvl2, 0, 'no studs on a plastered front');
  assert.ok(P.quads <= 2, 'no braces (the two rake boards of a gable are all the diagonals): ' + P.quads);
  assert.ok(P.wins >= 2, 'but its windows: ' + P.wins);
  assert.ok(F.lvl2 > 20, 'a framed front has its studs: ' + F.lvl2);
});

test('`tudor-thatch`: straw tones and ragged courses in two tones (a thatched roof is not a tiled one)', () => {
  const S = G.sceneBuildingStyle('tudor-thatch');
  assert.ok(S && S.roofMat.kind === 'thatch' && S.pitch >= 50, 'the style');
  const sp = G.sceneBuildingResolve({ style: 'tudor-thatch', seed: 4, storeys: 1, foot: [[-3, 10], [-3, 17], [-9, 17], [-9, 10]], front: 0 });
  const rc = parseInt(sp.roofCol.slice(1), 16), r = rc >> 16, b = rc & 255;
  assert.ok(r > b + 30, 'a warm straw, not a red tile or a grey slate: ' + sp.roofCol);
  const d = G.sceneBuildingProject({ style: 'tudor-thatch', seed: 4, storeys: 2, foot: [[-3, 10], [-3, 17], [-9, 17], [-9, 10]], front: 0 }, { eye: 1.7, fov: 54, horizon: 580, heading: 0, f: 1640 }, { season: 'summer' });
  assert.ok(d.shapes.filter(s => s.part === 'roof' && s.detail).length >= 2, 'ragged straw bands drawn on the roof');
});

test('the flint church: nodules of dark and pale flint in wide joints, within the face budget, in every angle', () => {
  const M = W.worldModelBuild || null;
  const def = W.worldModelDef ? W.worldModelDef('parish-church') : null;
  assert.ok(M || def, 'the model system is loaded');
  const ent = (liv) => ({ id: 'c', obj: 'structure.parish-church', x: 0, z: 60, facing: 90, model: { livery: liv, seed: 3, opts: { era: 'perpendicular', aisle: 'south', crown: 'parapet', porch: true } } });
  const cam = { eye: 1.65, fov: 54, horizon: 580, heading: 0, f: 1640, x0: 800, W: 1600, H: 900 };
  const flint = W.worldModelBuild(ent('flint'), cam, { season: 'summer' }), honey = W.worldModelBuild(ent('honey'), cam, { season: 'summer' });
  assert.ok(flint && flint.faces && honey && honey.faces, 'both build');
  const nod = flint.faces.filter(f => f.role === 'flint').length;
  assert.ok(nod > 20 && nod < 1500, 'flint nodules on the walls: ' + nod);
  assert.equal(honey.faces.filter(f => f.role === 'flint').length, 0, 'other stone is untouched');
  assert.ok(flint.faces.length < 2500, 'within the face cap: ' + flint.faces.length);
});

test('animal.cat: a sitting cat in four coats, 0.3 m high, a static animal that places on paving; plant.lane-planter is 0.7 m street dressing', () => {
  const cat = G.sceneObj('animal.cat'), pot = G.sceneObj('plant.lane-planter');
  assert.ok(cat && cat.variants === 4 && pot && pot.variants === 4, 'both objects exist, four variants each');
  for (let v = 0; v < 4; v++) { const sh = G.sceneObjShapes('animal.cat', v, 'summer'); assert.ok(sh && sh.parts && sh.parts.body && sh.parts.head && sh.parts.tail, 'cat variant ' + v + ' has tail, body and head'); }
  assert.ok(Math.abs(W.worldObjectInfo('animal.cat').size.h - 0.3) < 0.01, 'a cat is 30 cm sitting');
  assert.ok(W.worldObjectInfo('plant.lane-planter').size.h <= 0.8 && W.worldObjectInfo('plant.lane-planter').cls === 'street', 'a lane planter is small and street dressing');
  const s = spec({ entities: [{ obj: 'animal.cat', at: [2.2, 9.2], facing: 270, id: 'cat-1' }, { obj: 'plant.lane-planter', at: [-2.4, 14], id: 'pots-1' }] });
  const v = W.worldValidate(s), w = build(s);
  assert.ok(v.ok, JSON.stringify(v.errors));
  assert.ok(w.entities.some(e => e.id === 'cat-1') && w.entities.some(e => e.id === 'pots-1'), 'both stand: ' + JSON.stringify((w.log || []).filter(l => l.action === 'drop')));
  const winter = G.sceneObjShapes('plant.lane-planter', 0, 'winter'), summer = G.sceneObjShapes('plant.lane-planter', 0, 'summer');
  assert.notEqual(JSON.stringify(winter.parts.leaf), JSON.stringify(summer.parts.leaf), 'flowers by season');
});

test('the scene: Elm Hill registers, validates with no drop, its houses build with no fallback prism, the lane rises and the church stands on the head of it', () => {
  const got = [];
  vm.runInNewContext(readFileSync(join(ROOT, 'src', 'app', '79-world-zscene-norwich-elm-hill-1.js'), 'utf8'), { worldAdd: (p, m, sp) => got.push({ p, m, sp }), Math });
  assert.equal(got.length, 1, 'the scene file registers one place');
  assert.equal(got[0].p, 'world-test');
  assert.ok(got[0].m.ukPlace === 'norwich-elm-hill' && got[0].m.county === 'norfolk', 'the gallery meta');
  const src = got[0].sp;
  const v = W.worldValidate(JSON.parse(JSON.stringify(src)));
  assert.ok(v.ok, JSON.stringify(v.errors));
  const w = build(JSON.parse(JSON.stringify(src)), { fill: true });
  const drops = (w.log || []).filter(l => l.action === 'drop');
  assert.equal(drops.length, 0, 'no drop: ' + JSON.stringify(drops.slice(0, 3)));
  const houses = w.buildings.filter(b => /^(w|e)-/.test(b.id));
  assert.ok(houses.length >= 28, 'two rows of houses: ' + houses.length);
  assert.ok(houses.some(b => b.style === 'tudor-thatch') && houses.some(b => b.style === 'norfolk-flint') && houses.some(b => b.style === 'tudor-colourwash'), 'a thatched house, flint cottages and the colourwash houses');
  const church = w.entities.find(e => e.id === 'church');
  assert.ok(church && church.y > 6.5, 'the church stands on the head of the hill: ' + (church && church.y));
  assert.ok(w.entities.some(e => e.obj === 'animal.cat'), 'a cat');
  const prims = W.worldPrimEntities ? W.worldPrimEntities(w, w.cam) : [];
  assert.ok(!prims.some(p => p && p.error), 'no house fell back to the prism');
});

test('a lane lantern glows in ONE soft falloff, never stacked hard-edged discs', () => {
  // (the night-light audit, 18 Oct: three discs, then six smaller steps, both showed as rings at night; the glow is now one radial
  // gradient, so no edge exists to show. The same behaviour as before is checked: no hard discs, a soft falloff, never opaque, lit glass)
  const faces = G._scbgBlockKinds.lantern({ s: 1, z: 2.4, out: 0.5 }, { plane: G._scbgWallPlane([-2, 0], [-2, 8]) });
  const round = faces.filter(f => f.part === 'lit' && f.round);
  assert.equal(round.length, 1, 'one glow face, no stack of discs: ' + round.length);
  assert.ok(round[0].soft > 0 && round[0].soft < 0.6, 'a soft glow whose peak is never an opaque disc: ' + round[0].soft);
  const a = G._scbgSoftStops('#ffd890', round[0].soft).map(q => q[2]);
  assert.ok(a.length >= 8, 'at least 8 gradient stops');
  for (let i = 1; i < a.length; i++) assert.ok(a[i] <= a[i - 1] && a[i - 1] - a[i] <= 0.15, `each step is small: ${a[i - 1]} -> ${a[i]}`);
  assert.equal(a[a.length - 1], 0, 'it fades to nothing at its rim');
  assert.ok(faces.some(f => f.part === 'lit' && !f.round && f.op === 1), 'the glass itself is lit');
});

test('the ground of a hill street is one layer: after the backdrop bands, under everything else, never merged with the houses (no 700 redraws a frame)', () => {
  const got = [];
  vm.runInNewContext(readFileSync(join(ROOT, 'src', 'app', '79-world-zscene-norwich-elm-hill-1.js'), 'utf8'), { worldAdd: (p, m, sp) => got.push(sp), Math });
  const w = build(JSON.parse(JSON.stringify(got[0])), { fill: true }), plan = W.worldFramePlan(w, { season: 'summer' });
  const ground = plan.chunks.filter(c => c.ground);
  assert.equal(ground.length, 1, 'one ground chunk');
  assert.ok(ground[0].ents.length > 100 && ground[0].ents.every(r => r.ground && r.prim && r.prim.sub === 'terrain'), 'it holds the strips: ' + ground[0].ents.length);
  for (let i = 1; i < ground[0].ents.length; i++) assert.ok(ground[0].ents[i - 1].z >= ground[0].ents[i].z, 'far first, as the strips were');
  const gi = plan.chunks.indexOf(ground[0]);
  plan.chunks.forEach((c, i) => { if (c.backdrop && !c.ground) assert.ok(i < gi, 'the bands come before the ground (a plateau above the eye hides them)'); });
  assert.ok(plan.chunks.filter(c => !c.backdrop && c.ents.length).every(c => c.ents.every(r => !r.ground)), 'no strip among the houses');
  assert.ok(plan.chunks.length >= 3, 'the houses are not collapsed into one bitmap with the ground: ' + plan.chunks.length + ' chunks');
  // a cliff or an embankment hides what stands behind it: its strips stay statics in depth order
  const cliff = build(spec({ ground: { features: [{ kind: 'embankment', path: [[-100, 60], [100, 60]], width: 60, h: 12 }] } }), { fill: true });
  assert.ok(!W.worldFramePlan(cliff, { season: 'summer' }).chunks.some(c => c.ground), 'other relief keeps the strips in depth order');
});
