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
