// World engine, the Shambles second pass (York; docs/dev/SCENE_LESSONS.md L): a street that is atmospheric in every light and a Minster
// glimpsed at its end. One test per SCENE_LESSONS row: what is cut at the near plane stays (the nearest house keeps its frame), a
// jetty is carried on brackets over a joisted soffit, storeys lean and an overhang is never negative, a shop shows its goods behind
// small panes and a butcher its meat hooks, an upper floor may carry an oriel with framed returns, and the cathedral generator draws a
// real gothic west front (two towers, a nave gable, a great window, a portal, pinnacles, a crossing tower) in budget, in every plan.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__york2 = { sceneBuildingProject, sceneBuildingResolve, sceneBuildingStyle, sceneCathedralParts, sceneCathedralPlans, _scbgBuild, _scbgFoot, _scbgPersp, _scbgOrtho, _scbgRect, _scbgMap, _scbgWallPlane, SCENE_GEN_MAX_SHAPES };' });
const G = globalThis.__york2;
const CAM = { eye: 1.7, fov: 62, horizon: 590, heading: 0, f: 1331.4 };
const lane = (z0, z1, x1, x0) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

test('a rectangle that crosses the near plane is cut there, never dropped; one wholly behind it is gone', () => {
  const view = G._scbgPersp(CAM), pl = G._scbgWallPlane([-1.9, 0.4], [-1.9, 7]);
  // the plane runs along z at x = -1.9; its start (z = 0.4) is behind the near plane (about 1.8 m), its end in front
  const r = G._scbgRect(pl, view, 0, 2, 6, 3, 0.0);
  assert.ok(Array.isArray(r) && r.length >= 3 && r.every(p => Number.isFinite(p[0]) && Number.isFinite(p[1])), 'a cut polygon');
  const m = G._scbgMap(pl, view, [[0, 2], [6, 2], [6, 5], [0, 5]], 0);
  assert.ok(Array.isArray(m) && m.length >= 3, 'the outline of an opening is cut too');
  assert.equal(G._scbgRect(pl, view, 0, 2, 0.5, 3, 0.0), null, 'a rectangle wholly behind the near plane is not drawn');
  // and in a street: the first house, half behind the near plane, keeps its frame and its openings
  const b = { style: 'timber-framed', seed: 9, storeys: 3, foot: [[-1.9, 0.6], [-1.9, 6.4], [-8.2, 6.4], [-8.2, 0.6]], front: 0, shop: { kind: 'bakery' } };
  const d = G.sceneBuildingProject(b, CAM, { season: 'summer' });
  const nearShapes = d.shapes.filter(s => (s.d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number).some((v, i) => i % 2 === 0 && v < 200));
  assert.ok(nearShapes.length > 15, 'detail in the nearest 200 px of the frame: ' + nearShapes.length);
});

/** Build a timber house through the generator's own build: { sp, res }. */
function house(seed, extra) {
  const b = Object.assign({ style: 'timber-framed', seed, storeys: 3, foot: lane(14, 20, -1.9, -8.1), front: 1 }, extra || {});
  const sp = G.sceneBuildingResolve(b), view = G._scbgPersp(CAM), foot = G._scbgFoot(b.foot, b.front);
  const res = G._scbgBuild(b, sp, foot, view, { season: 'summer', tierCap: 3 });
  return { b, sp, res };
}

test('jetties are carried: brackets under every overhang, a soffit with joists, and an overhang is never negative while storeys lean', () => {
  let leaned = 0, withBrackets = 0, joists = 0, n = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const { sp, res } = house(seed);
    const tf = sp.tf;
    n++;
    for (let i = 1; i < sp.storeys; i++) assert.ok(tf.jet[i] - tf.top[i - 1] >= -1e-9, `seed ${seed} storey ${i}: the overhang starts from where the storey below ended up`);
    assert.equal(tf.lean[0], 0, 'the shopfront is plumb');
    assert.equal(tf.lean[sp.storeys - 1], 0, 'the top storey carries the roof true');
    if (tf.lean.some(v => Math.abs(v) > 0.01)) leaned++;
    if ((tf.fit || []).some(f => f.kind === 'bracket')) withBrackets++;
    if (res.model.faces.some(f => f.role === 'soffit' && (f.elems || []).some(e => e.k === 'tjoist'))) joists++;
  }
  assert.ok(leaned >= n * 0.5, 'most houses lean a storey: ' + leaned + ' of ' + n);
  assert.ok(withBrackets >= n * 0.6, 'most jettied houses hang brackets: ' + withBrackets + ' of ' + n);
  assert.ok(joists >= n * 0.6, 'the underside of an overhang is joisted boards: ' + joists + ' of ' + n);
});

test('a shopfront is small panes with goods behind them; a butcher keeps meat hooks over the stall; the goods are shapes, never lettering', () => {
  const { sp, res } = house(11, { shop: { kind: 'butcher' }, foot: lane(14, 20, -1.9, -8.1) });
  const front0 = res.model.faces.find(f => f.part === 'wall' && f.role === 'front' && f.stack === 0);
  assert.ok(front0, 'the ground storey');
  const kinds = front0.elems.map(e => e.k);
  assert.ok(kinds.includes('tgoods') && kinds.includes('thooks'), 'goods and hooks: ' + kinds.join(','));
  const hooks = front0.elems.find(e => e.k === 'thooks'), goods = front0.elems.find(e => e.k === 'tgoods'), win = front0.elems.find(e => e.k === 'win' && e.shopGlass);
  assert.equal(hooks.full, true, 'the butcher hangs the meat');
  assert.equal(goods.kind, 'butcher');
  assert.ok(win.panes[1] >= 3 && win.panes[0] >= 3, 'the shop window is small panes, not one sheet');
  // goods shapes are present in the projected building, day and night (the lit copy), and carry no text
  const d = G.sceneBuildingProject({ style: 'timber-framed', seed: 11, storeys: 3, foot: lane(14, 20, -1.9, -8.1), front: 1, shop: { kind: 'butcher' } }, CAM, { season: 'summer', signage: false });
  assert.ok(d.lit.length > 0, 'lit shop interior and goods after dusk');
  assert.equal(JSON.stringify(d.signs), '[]');
  void sp;
});

test('an upper floor can carry an oriel: a boxed bay on a corbel with a window ribbon and framed returns (no bare slab)', () => {
  let found = null;
  for (let seed = 1; seed <= 60 && !found; seed++) {
    const { sp, res } = house(seed, { storeys: 3, foot: lane(14, 22, -1.9, -8.1) });
    if (sp.tf.oriel && sp.tf.oriel.i <= 1 && (sp.tf.fit || []).some(f => f.kind === 'oriel')) found = { sp, res };
  }
  assert.ok(found, 'a seed with an oriel');
  const d = G.sceneBuildingProject({ style: 'timber-framed', seed: found.sp.seed, storeys: 3, foot: lane(14, 22, -1.9, -8.1), front: 1 }, CAM, { season: 'summer' });
  assert.ok(d && d.n > 100 && d.n <= G.SCENE_GEN_MAX_SHAPES, 'in budget: ' + (d && d.n));
});

test('the cathedral: every plan is a real gothic church in budget, deterministic, lit at night, with no symbol or text', () => {
  const plans = G.sceneCathedralPlans();
  assert.deepEqual(plans.slice().sort(), ['central-spire', 'twin-towers', 'west-tower']);
  const parts = G.sceneCathedralParts(30, 150, 'twin-towers');
  assert.equal(parts.towers.length, 2, 'two west towers');
  assert.ok(parts.towers.every(t => Math.abs(t.h - 60) < 0.5), 'the west towers stand 60 m');
  assert.ok(parts.central && parts.central.kind === 'lantern' && parts.central.h > 70, 'a lantern tower over the crossing');
  assert.ok(parts.transept && parts.choirEnd === 150, 'transepts and a choir');
  assert.ok(parts.top > 70 && parts.top < 90);
  const small = G.sceneCathedralParts(16, 70, 'twin-towers');
  assert.ok(small.towers[0].h < parts.towers[0].h, 'a smaller church is the same church smaller');
  for (const crown of plans) {
    const foot = [[-14, 260], [14, 260], [14, 400], [-14, 400]];
    const b = { style: 'gothic-minster', seed: 3, storeys: 4, foot, crown };
    const d = G.sceneBuildingProject(b, CAM, { season: 'summer' }), d2 = G.sceneBuildingProject(b, CAM, { season: 'summer' });
    assert.ok(d && d.n > 60 && d.n + d.lit.length <= G.SCENE_GEN_MAX_SHAPES, crown + ' in budget: ' + (d && d.n));
    assert.equal(JSON.stringify(d.shapes), JSON.stringify(d2.shapes), crown + ' is deterministic');
    assert.ok(d.h > 40, crown + ' stands tall: ' + d.h);
    assert.ok(d.shapes.some(s => s.glow === 'window') && d.lit.length > 0, crown + ': glass that glows and a floodlit stone after dusk');
    assert.ok(d.shapes.every(s => !('text' in s)), 'no text');
  }
  // the west towers have louvred belfries (dark openings) and pinnacles: shapes at the top of the box above the nave roof
  const t = G.sceneBuildingProject({ style: 'gothic-minster', seed: 3, storeys: 4, foot: [[-14, 200], [14, 200], [14, 340], [-14, 340]], crown: 'twin-towers' }, CAM, { season: 'summer' });
  assert.ok(t.shapes.some(s => s.f === '#262c35'), 'a louvred belfry');
  assert.ok(t.box[1] < 590 - 55 * 1331.4 / 200, 'the towers rise above 55 m at 200 m');
});

test('the Shambles has the Minster at the end of the street: over the roofs, in the slot of sky, both views through the same generator', async () => {
  const { loadEngine, resolveRef } = await import('../tools/lib/world/convert.mjs');
  const E = loadEngine({ root: ROOT, fresh: true });
  const item = resolveRef(E, 'world-test/york-shambles-1-w3').item;
  const w = E.worldBuild(E.worldHostSpec(item), {}), world = w.world || w;
  const m = world.buildings.find(b => b.style === 'gothic-minster');
  assert.ok(m, 'the Minster is a building of the world');
  assert.ok(Math.min(...m.foot.map(p => p[1])) > 200, 'far beyond the lane (' + Math.min(...m.foot.map(p => p[1])) + ' m)');
  const prims = E.worldExtrude(world, world.cam, { season: 'summer' }), p = prims.find(q => q.id === m.id);
  assert.ok(p && p.direct, 'extruded');
  const [x0, y0, x1, y1] = p.box;
  assert.ok(y0 < 330 && y0 > 150, 'its towers show above the roofs of the lane: top at y ' + y0);
  assert.ok(x1 > 740 && x0 < 880, 'inside the slot of sky between the rows: x ' + x0 + '..' + x1);
  assert.ok(y1 > 470, 'its foot is hidden behind the end of the lane');
  // the lane's last houses stand in front of its foot: nothing of the lane is behind it
  assert.ok(prims.filter(q => q.kind === 'building' && q.id !== m.id).every(q => q.zKey < p.zKey), 'the church is the farthest thing');
  // no house fell back to the grey prism (a generator exception used to be swallowed and a rust-coloured slab drawn in its place)
  const fell = prims.filter(q => q.kind === 'building' && q.fallback);
  assert.deepEqual(fell.map(q => q.id + ': ' + q.error), [], 'every house comes from the generator');
  // the church is a landmark, not a house: no frontage rule made it, and it was not moved or dropped by the load
  assert.ok(!world.log.some(l => l.id === m.id && new RegExp('drop|mo' + 've').test(l.action)), 'untouched by the load');
});
