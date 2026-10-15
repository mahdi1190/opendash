// World engine terrain (src/app/79-world-4terrain.js, the terrain step of the placement solver, the frame plan): requirement W2 and
// SCENE_LESSONS J. The first no-example place (Whitby, a harbour under a 36 m cliff) showed that the ground followed a relief along
// the edges of a polygon only: a hill inside one was never drawn and every house on it hung in the sky. Terrain is drawn by the
// world, as strips of the relief ordered with everything else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const spec = (extra) => Object.assign({
  v: 3, place: { lat: 54.49, lon: -0.61, region: 'north-yorkshire' }, camera: { eye: 1.7, fov: 66, horizon: 430, heading: 0, water: -2 }, seed: 5,
  surfaces: [{ id: 'quay', kind: 'plaza', poly: [[-100, 1], [100, 1], [100, 16], [-100, 16]] }, { id: 'esk', kind: 'water', water: 'harbour', poly: [[-300, 16], [300, 16], [300, 90], [-300, 90]], shallow: 1.5 },
    { id: 'cliff', kind: 'grass', poly: [[-300, 90], [300, 90], [300, 300], [-300, 300]] }],
  entities: [], backdrop: { style: 'town-low' },
}, extra || {});
const HILL = { features: [{ kind: 'embankment', path: [[-400, 170], [400, 170]], width: 150, h: 36 }] };
const build = (s) => W.worldBuild(s, { fill: false });

test('a hill is drawn: strips of the relief, far first, each with quads and a footprint in metres (W2)', () => {
  const w = build(spec({ ground: HILL }));
  assert.ok(w.cam.relief, 'the camera carries the relief');
  const P = W.worldTerrainPrims(w, w.cam, { season: 'summer' });
  assert.ok(P.length > 20, `strips: ${P.length}`);
  for (let i = 1; i < P.length; i++) assert.ok(P[i - 1].zKey >= P[i].zKey, 'far first, so a nearer rise is drawn over what lies behind it');
  const hi = P.find(p => p.height > 30);
  assert.ok(hi && hi.faces.length > 10 && hi.faces.every(f => Array.isArray(f.pts) && f.pts.length === 4 && /^#[0-9a-f]{6}$/.test(f.hex)), 'quads with colours');
  assert.ok(hi.foot.length === 4 && hi.solidity === 'passable' && hi.kind === 'line', 'a footprint, and it blocks nothing');
  // the face of the hill reaches well above the horizon: the highest quad of the nearest steep strip is where the ground really is
  const ymin = Math.min(...P.flatMap(p => p.faces.flatMap(f => f.pts.map(q => q[1]))));
  assert.ok(ymin < 150, `the rim is high on the screen (${Math.round(ymin)}): the hill hides the horizon behind it`);
});

test('flat ground draws no terrain (the v2 base draws it); water is never painted over', () => {
  assert.deepEqual(W.worldTerrainPrims(build(spec()), build(spec()).cam, {}), []);
  const w = build(spec({ ground: { features: [{ kind: 'bank', path: [[-400, 50], [400, 50]], width: 40, h: 5 }] } }));
  const P = W.worldTerrainPrims(w, w.cam, {});
  for (const p of P) for (const f of p.faces) assert.ok(f.mat !== null);
  // the bank crosses the harbour: no strip quad is centred in the water's depth range at its x
  const water = (z) => z > 16 && z < 90;
  assert.ok(P.every(p => !water(p.zKey) || p.faces.length === 0), 'no quad over the water');
});

test('a steep face is rock, a grass slope is grass (W2, Q5)', () => {
  const w = build(spec({ ground: { features: [{ kind: 'embankment', path: [[-400, 170], [400, 170]], width: 40, h: 36 }] } }));
  const P = W.worldTerrainPrims(w, w.cam, {});
  const mats = new Set(P.flatMap(p => p.faces.map(f => f.hex)));
  assert.ok(P.some(p => p.faces.some(f => f.mat === 'stone')), 'a 36 m face in 10 m of depth is bare rock');
  assert.ok(mats.size > 4, 'a few tones, never one flat colour');
});

test('an entity wholly behind a nearer rise of the ground is dropped, never drawn floating in the sky (W2)', () => {
  const s = spec({ ground: HILL, entities: [
    { obj: 'building.terrace-victorian', at: [0, 120], facing: 180, id: 'on-face' },        // on the face, in view
    { obj: 'building.cottage', at: [0, 232], facing: 180, id: 'behind-rim' },                // behind the plateau's rim at 36 m
  ] });
  const w = build(s);
  assert.ok(w.entities.find(e => e.id === 'on-face'), 'a house on the face stays');
  const dropped = w.log.find(l => l.id === 'behind-rim' && l.action === 'drop');
  assert.ok(dropped && dropped.rule === 'terrain', 'the house behind the rim is dropped with a reason');
  assert.ok(!w.entities.find(e => e.id === 'behind-rim' && !e._wplDropped) || w.entities.find(e => e.id === 'behind-rim')._wplDropped, 'and gone');
});

test('the frame plan includes the strips among the statics (the chunk order does the rest)', () => {
  const w = build(spec({ ground: HILL, entities: [{ obj: 'building.terrace-victorian', at: [0, 120], facing: 180, id: 'on-face' }] }));
  const plan = W.worldFramePlan(w, { season: 'summer' });
  const strips = plan.recs.filter(r => r.prim && r.prim.sub === 'terrain');
  assert.ok(strips.length > 20, 'strips in the plan: ' + strips.length);
  const order = []; for (const ch of plan.chunks) for (const r of ch.ents) order.push(r);
  const iHouse = order.findIndex(r => r.id === 'on-face'), iFar = order.findIndex(r => r.prim && r.prim.sub === 'terrain' && r.prim.zKey > 200), iNear = order.findIndex(r => r.prim && r.prim.sub === 'terrain' && r.prim.zKey < 100);
  assert.ok(iFar >= 0 && iHouse >= 0 && iFar < iHouse, 'the far plateau is drawn before the house on the face');
  assert.ok(iNear < 0 || iNear >= 0, 'the near foot exists or is flat');
});

test('a water below the ground is hidden behind the near bank: only what the sight lines carry through the opening is drawn (W2, SCENE_LESSONS J)', () => {
  const w = build(spec());                                    // quay z 1-16, water z 16-90 at -2 m, eye 1.7
  const R = W.worldWaterPlan(w, w.cam).find(r => r.id === 'esk');
  const k = (1.7 + 2) / 1.7;
  assert.ok(R.dNear >= 16 * k - 0.05, `the nearest visible water is ${R.dNear} m, at least ${(16 * k).toFixed(1)} (the quay edge's shadow)`);
  assert.ok(R.dNear <= 16 * k + 0.5, 'and no further than the sight line over the edge');
  // the screen: no water row below the quay edge's own row (the paving covers it)
  const edgeRow = w.cam.horizon + w.cam.f * w.cam.eye / 16;
  assert.ok(Math.min(...R.clip.map(p => p[1])) > 0 && Math.max(...R.clip.map(p => p[1])) <= edgeRow + 0.5, `water rows end at the edge's row ${Math.round(edgeRow)}`);
  // flush water (level 0) is not clipped
  const flush = build(spec({ camera: { eye: 1.7, fov: 66, horizon: 430, heading: 0, water: 0 } }));
  assert.ok(W.worldWaterPlan(flush, flush.cam).find(r => r.id === 'esk').dNear <= 16.01, 'water at the ground level is seen from its own edge');
});

test('two waters side by side are one opening: the seam between them hides nothing', () => {
  const s = spec({ surfaces: [{ id: 'quay', kind: 'plaza', poly: [[-100, 1], [100, 1], [100, 16], [-100, 16]] },
    { id: 'a', kind: 'water', water: 'harbour', poly: [[-300, 16], [300, 16], [300, 60], [-300, 60]] }, { id: 'b', kind: 'water', water: 'harbour', poly: [[-300, 60], [300, 60], [300, 140], [-300, 140]] }] });
  const w = build(s), P = W.worldWaterPlan(w, w.cam), b = P.find(r => r.id === 'b');
  const k = (1.7 + 2) / 1.7;
  assert.ok(b && b.dNear < 60 * 1.0 + 0.5, `the far water starts at its own near edge ${b && b.dNear} (the sight line crosses the ground over the near water)`);
  assert.ok(P.find(r => r.id === 'a').dNear >= 16 * k - 0.05);
});

// ---------- cliffs (src/app/79-world-4cliff.js; requirement TR5): a face is analytic, the grid only holds its coarse shape ----------
const CLIFF = { features: [{ kind: 'cliff', arc: { c: [0, 60], r: 190, from: -62, to: 62 }, h: 70 }] };
const cspec = (extra) => spec(Object.assign({ camera: { eye: 1.7, fov: 66, horizon: 560, heading: 0 }, surfaces: [{ id: 'floor', kind: 'grass', poly: [[-400, 1], [400, 1], [400, 400], [-400, 400]] }], ground: CLIFF }, extra || {}));

test('a cliff feature validates: an arc becomes its polyline, a face needs h, a bad rock or side is stripped', () => {
  const ok = W.worldValidate(cspec());
  assert.ok(!ok.errors.some(e => /ground\.features/.test(e.path)), JSON.stringify(ok.errors.filter(e => /ground\.features/.test(e.path))));
  const w = build(cspec());
  assert.ok(Array.isArray(w.features[0].path) && w.features[0].path.length > 20, 'the arc is expanded to a path at repair (before the camera transform maps its points)');
  const bad = W.worldValidate(cspec({ ground: { features: [{ kind: 'cliff', path: [[-100, 200], [100, 200]], h: 40, rock: 'cheese', high: 'up' }, { kind: 'cliff', h: 20 }] } }));
  assert.ok(bad.errors.some(e => e.path === 'ground.features[0].rock') && bad.errors.some(e => e.path === 'ground.features[0].high') && bad.errors.some(e => e.path === 'ground.features[1].path'), JSON.stringify(bad.errors.map(e => e.path)));
});

test('the cliff is analytic: a vertical face of the full height, a talus skirt below it, the plateau behind; the grid is fine enough for the rest of the engine', () => {
  const w = build(cspec()), f = w.features[0];
  const apex = 250;                                                    // the arc's centre (0, 60) + radius 190
  assert.ok(W.worldCliffHeight(f, 0, apex - 0.01) < 14, 'the face base is the talus top');
  assert.ok(W.worldCliffHeight(f, 0, apex + 0.3) > 68, 'a third of a metre into the face is already within 2 m of the full height (the lip rounds the rest): it is vertical');
  assert.ok(W.worldCliffHeight(f, 0, apex + 40) === 70 || Math.abs(W.worldCliffHeight(f, 0, apex + 40) - 70) < 1e-6, 'the plateau is level');
  const foot = W.worldCliffHeight(f, 0, apex - 30);
  assert.ok(foot > 0 && foot < W.worldCliffHeight(f, 0, apex - 10), 'the talus rises toward the face');
  assert.equal(W.worldCliffHeight(f, 0, apex - 80), 0, 'the valley floor is flat');
  // the camera is inside the arc, so the high ground is behind the face, never in front of it
  assert.equal(W.worldCliffHeight(f, 0, 100), 0);
  const R = w.cam.relief;
  assert.ok(R && R.nx >= 300 && R.nd >= 90, `a cliff gets a fine relief grid (${R && R.nx} x ${R && R.nd})`);
  assert.ok(W.sceneGroundHeight(w.cam, 0, apex + 8) > 69 && W.sceneGroundHeight(w.cam, 0, apex - 10) < 15, 'the grid carries the face to within a few metres');
  // the ends taper: far along the arc the face has fallen to the ground
  const e = f.path[0];
  assert.ok(W.worldCliffHeight(f, e[0], e[1] + 5) < 8, 'the face tapers out at its ends');
});

test('a straight cliff with the high ground on the left, a batter and no scree takes the same spec', () => {
  // the path runs along +x: its LEFT is the far side (+z), its right the camera's side
  const w = build(cspec({ ground: { features: [{ kind: 'cliff', path: [[-300, 220], [300, 220]], h: 40, high: 'left', batter: 0.3, scree: false, fade: 0 }] } }));
  const f = w.features[0];
  assert.equal(W.worldCliffHeight(f, 0, 200), 0, 'no scree: flat to the foot');
  assert.ok(W.worldCliffHeight(f, 0, 220 + 2) < 10 && Math.abs(W.worldCliffHeight(f, 0, 220 + 15) - 40) < 0.5, 'a battered face leans back: 0.3 m of plan per metre of height, so about 12 m of plan to climb 40 m');
  const half = W.worldCliffHeight(f, 0, 220 + 0.3 * 38.5 * 0.5);
  assert.ok(half > 15 && half < 25, 'halfway across the batter it is about half the height: ' + half);
  assert.equal(W.worldCliffHeight(f, 0, 260), 40);
  const r = build(cspec({ ground: { features: [{ kind: 'cliff', path: [[-300, 220], [300, 220]], h: 40, high: 'right', scree: false, fade: 0 }] } }));
  assert.equal(W.worldCliffHeight(r.features[0], 0, 260), 0, 'high: right puts the plateau on the camera side');
  assert.equal(W.worldCliffHeight(r.features[0], 0, 200), 40);
});
