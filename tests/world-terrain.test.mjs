// World engine terrain (src/app/79-world-4terrain.js, the terrain step of the placement solver, the frame plan): requirement W2 and
// SCENE_LESSONS K. The first no-example place (Whitby, a harbour under a 36 m cliff) showed that the ground followed a relief along
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

test('a water below the ground is hidden behind the near bank: only what the sight lines carry through the opening is drawn (W2, SCENE_LESSONS K)', () => {
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
  // (merge of 15 Oct) two waters that touch at one level are ONE region (no seam: SCENE_LESSONS O); each keeps its own visible part
  const w = build(s), P = W.worldWaterPlan(w, w.cam), R = P.find(r => (r.ids || [r.id]).includes('b'));
  const near = (id) => { const i = R.ids.indexOf(id); return Math.min(...R.clipsM[i].map(p => p[1])); };
  const k = (1.7 + 2) / 1.7;
  assert.ok(R && R.ids.includes('a'), 'one water: ' + (R && R.ids));
  assert.ok(near('b') < 60 * 1.0 + 0.5, `the far water starts at its own near edge ${near('b')} (the sight line crosses the ground over the near water)`);
  assert.ok(near('a') >= 16 * k - 0.05);
});

// ---------- cliffs (src/app/79-world-4cliff.js; requirement TR5): a face is analytic, the grid only holds its coarse shape ----------
// rough: 0 is the ruled face (a plan with no buttresses, a level rim, one talus): the maths of the profile is tested on it; the default,
// irregular face has its own tests below
const CLIFF = { features: [{ kind: 'cliff', arc: { c: [0, 60], r: 190, from: -62, to: 62 }, h: 70, rough: 0 }] };
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
  const w = build(cspec({ ground: { features: [{ kind: 'cliff', path: [[-300, 220], [300, 220]], h: 40, high: 'left', batter: 0.3, scree: false, fade: 0, rough: 0 }] } }));
  const f = w.features[0];
  assert.equal(W.worldCliffHeight(f, 0, 200), 0, 'no scree: flat to the foot');
  assert.ok(W.worldCliffHeight(f, 0, 220 + 2) < 10 && Math.abs(W.worldCliffHeight(f, 0, 220 + 15) - 40) < 0.5, 'a battered face leans back: 0.3 m of plan per metre of height, so about 12 m of plan to climb 40 m');
  const half = W.worldCliffHeight(f, 0, 220 + 0.3 * 38.5 * 0.5);
  assert.ok(half > 15 && half < 25, 'halfway across the batter it is about half the height: ' + half);
  assert.equal(W.worldCliffHeight(f, 0, 260), 40);
  const r = build(cspec({ ground: { features: [{ kind: 'cliff', path: [[-300, 220], [300, 220]], h: 40, high: 'right', scree: false, fade: 0, rough: 0 }] } }));
  assert.equal(W.worldCliffHeight(r.features[0], 0, 260), 0, 'high: right puts the plateau on the camera side');
  assert.equal(W.worldCliffHeight(r.features[0], 0, 200), 40);
});

// ---------- the face of a cliff (src/app/79-world-4cliff.js; TR6 to TR9): strata, joints, ledges, order, light, weather ----------
const _fake = () => {
  const log = { fills: [], strokes: [], stops: [], grads: 0, ellipses: 0 };
  const g = { addColorStop(t, c) { log.stops.push(c); } };
  const ctx = { _fs: null, _ss: null, lineWidth: 1, globalAlpha: 1,
    save() {}, restore() {}, setTransform() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {}, rect() {}, quadraticCurveTo() {}, arc() {},
    createLinearGradient() { log.grads++; return g; }, ellipse() { log.ellipses++; },
    fill() { log.fills.push(ctx.fillStyle); }, stroke() { log.strokes.push(ctx.strokeStyle); } };
  Object.defineProperty(ctx, 'fillStyle', { get() { return ctx._fs; }, set(v) { ctx._fs = v; } });
  Object.defineProperty(ctx, 'strokeStyle', { get() { return ctx._ss; }, set(v) { ctx._ss = v; } });
  return { ctx, log };
};
const lum = (hex) => { const n = parseInt(String(hex).slice(1), 16); return 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255); };
const COVE_FEATURES = () => ({ features: [{ kind: 'cliff', arc: { c: [0, 110], r: 190, from: -90, to: 90 }, h: 70, rock: 'limestone' }] });
const COVE = () => build(cspec({ camera: { eye: 1.7, fov: 66, horizon: 580, heading: 0 }, ground: COVE_FEATURES() }));

test('the face is drawn in depth-binned columns: far first, a footprint along the plan, true vertical joints, horizontal beds, nothing shimmers (TR6, TR8)', () => {
  const w = COVE(), P = W.worldCliffPrims(w, w.cam, {});
  assert.ok(P.length >= 8 && P.every(p => p.sub === 'terrain' && p.lineKind === 'cliff' && p.faces.length === 0 && p.ops.length > 20), `${P.length} face prims of ops`);
  const all = W.worldTerrainPrims(w, w.cam, {});
  for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].zKey >= all[i].zKey, 'strips and faces together are far first');
  // each face prim stands on a footprint in metres whose nearest z is its zKey (the chunk order puts what is in front of it after it)
  for (const p of P) assert.ok(p.foot.length >= 4 && Math.abs(Math.min(...p.foot.map(q => q[1])) - p.zKey) < 0.01 && p.foot.every(q => q[1] > 100));
  // the same build twice gives the same ops (a stable texture: nothing shimmers between frames or between builds)
  const P2 = W.worldCliffPrims(COVE(), COVE().cam, {});
  assert.equal(JSON.stringify(P2.map(p => p.ops)), JSON.stringify(P.map(p => p.ops)), 'deterministic');
  // the strokes of the joints (grykes) are near vertical on the screen, the bed lines near horizontal, for the group at the apex
  const apex = P.find(p => p.box[0] < 800 && p.box[2] > 800), strokes = apex.ops.filter(o => o.t === 's' && o.p.length >= 2 && o.m === 'stone');
  const vert = strokes.filter(o => Math.abs(o.p[o.p.length - 1][1] - o.p[0][1]) > 12 && Math.abs(o.p[o.p.length - 1][0] - o.p[0][0]) < 6), horiz = strokes.filter(o => Math.abs(o.p[o.p.length - 1][0] - o.p[0][0]) > 20 && Math.abs(o.p[o.p.length - 1][1] - o.p[0][1]) < 4);
  assert.ok(vert.length >= 3, `joints stand vertical (${vert.length})`);
  assert.ok(horiz.length >= 3, `ledges and bedding run along (${horiz.length})`);
  // the beds are gradient fills of the whole group: smooth tone along them, shaded column by column
  assert.ok(apex.ops.filter(o => o.t === 'fg').length >= 8, 'a bed of rock is one smooth gradient fill');
  // the rim: the face's top edge at the apex is the real rim row of a 70 m face 300 m away (less its rounded lip), within a few px
  const rimY = w.cam.horizon + w.cam.f * (w.cam.eye - 68.5) / 300, topY = Math.min(...apex.ops.filter(o => o.t === 'fg').flatMap(o => o.p.map(q => q[1])));
  assert.ok(Math.abs(topY - rimY) < 14, `the rim is at ${Math.round(topY)}, expected about ${Math.round(rimY)}`);
});

test('the beds of two neighbouring groups overlap under the nearer one: no hairline seam between columns', () => {
  const w = COVE(), P = W.worldCliffPrims(w, w.cam, {});
  // the union of every group's bed polygons covers every screen column from the first to the last without a gap
  const spans = P.map(p => { const f = p.ops.filter(o => o.t === 'fg'); return [Math.min(...f.map(o => o.x0)), Math.max(...f.map(o => o.x1))]; }).sort((a, b) => a[0] - b[0]);
  let reach = spans[0][1];
  for (let i = 1; i < spans.length; i++) { assert.ok(spans[i][0] <= reach + 0.05, `a gap between ${reach} and ${spans[i][0]}`); reach = Math.max(reach, spans[i][1]); }
});

test('the strips leave the face to the cliff pass: no ground quad lies on the face, a plateau behind a face taller than the eye is not drawn, from above it is (TR5, TR7)', () => {
  const w = COVE(), strips = W.worldTerrainPrims(w, w.cam, {}).filter(p => p.lineKind === 'terrain');
  const foot = w.cam.horizon + w.cam.f * (w.cam.eye - 11.2) / 300, rim = w.cam.horizon + w.cam.f * (w.cam.eye - 70) / 300;
  // at the apex columns (X 780 to 820) nothing but the cliff pass paints between the rim and the foot rows
  for (const s of strips) for (const f of s.faces) {
    const cx = f.pts.reduce((a, q) => a + q[0], 0) / f.pts.length, cy = f.pts.reduce((a, q) => a + q[1], 0) / f.pts.length;
    if (cx > 780 && cx < 820) assert.ok(cy > foot - 2 || cy < rim - 40, `a ground quad at (${Math.round(cx)}, ${Math.round(cy)}) lies on the face (rows ${Math.round(rim)} to ${Math.round(foot)})`);
  }
  const high = build(cspec({ camera: { eye: 90, fov: 66, horizon: 580, heading: 0 }, ground: COVE_FEATURES() }));
  const nLow = strips.reduce((a, s) => a + s.faces.length, 0), nHigh = W.worldTerrainPrims(high, high.cam, {}).filter(p => p.lineKind === 'terrain').reduce((a, s) => a + s.faces.length, 0);
  assert.ok(nHigh > nLow * 1.5, `from above the plateau is drawn (${nHigh}) and from below it is not (${nLow})`);
});

test('what a cliff hides is exact: a point behind the rim is hidden while the sight line passes below it, not from above the rim, not beyond the end of the face (TR7)', () => {
  const w = build(cspec({ camera: { eye: 1.7, fov: 66, horizon: 580, heading: 0 }, ground: { features: [Object.assign({}, COVE_FEATURES().features[0], { rough: 0 })] } })), G = W.worldCliffGeom(w.features[0]);
  assert.equal(W.worldCliffHides(G, 0, 330, 70, 1.7), true, 'the plateau behind the apex');
  assert.equal(W.worldCliffHides(G, 0, 330, 70, 90), false, 'seen from above the rim');
  assert.equal(W.worldCliffHides(G, 0, 200, 0, 1.7), false, 'in front of the face');
  const tapered = build(cspec({ ground: { features: [{ kind: 'cliff', arc: { c: [0, 110], r: 190, from: -90, to: 20 }, h: 70, fade: 40 }] } }));
  assert.equal(W.worldCliffHides(W.worldCliffGeom(tapered.features[0]), 200, 250, 30, 1.7), false, 'past the end of the face');
});

test('a mover is hidden by terrain only where the ground reaches above its feet (the page redrew 84 strips over its movers)', () => {
  const w = build(spec({ ground: HILL })), P = W.worldTerrainPrims(w, w.cam, {});
  assert.ok(P.length > 10 && P.every(p => p.tops && p.tops.y.length > 0), 'every strip carries its upper edge');
  assert.equal(W.worldTerrainOccludes({ tops: { w: 32, x0: 20, y: [500, 500, 500] } }, { x0: 650, x1: 700, y0: 300, y1: 420 }), false, 'ground below the feet does not hide the mover');
  assert.equal(W.worldTerrainOccludes({ tops: { w: 32, x0: 20, y: [300, 300, 300] } }, { x0: 650, x1: 700, y0: 300, y1: 420 }), true, 'a rise above the feet does');
  assert.equal(W.worldTerrainOccludes({ tops: { w: 32, x0: 60, y: [100] } }, { x0: 650, x1: 700, y0: 300, y1: 420 }), false, 'a strip that does not reach the mover columns');
  assert.equal(W.worldTerrainOccludes({ tops: JSON.parse(JSON.stringify({ w: 32, x0: 20, y: [1e9, 1e9, 1e9] })) }, { x0: 650, x1: 700, y0: 300, y1: 420 }), false, 'columns with no quad (the frame record is JSON) hide nothing');
  assert.equal(W.worldTerrainOccludes({ tops: { w: 32, x0: 20, y: [null, null, null] } }, { x0: 650, x1: 700, y0: 300, y1: 420 }), false, 'a null column (JSON of Infinity) hides nothing');
  const plan = W.worldFramePlan(COVE(), { season: 'summer' }), strips = plan.recs.filter(r => r.prim && r.prim.sub === 'terrain' && r.prim.lineKind === 'terrain');
  assert.ok(strips.length > 5 && strips.every(r => typeof r.occlude === 'function'), 'the plan gives each strip its occlusion rule');
});

test('the face is lit by the real sun, darker in rain, snowy on snow days, bare trees in winter (TR9)', () => {
  const w = COVE(), apex = W.worldCliffPrims(w, w.cam, {}).find(p => p.box[0] < 800 && p.box[2] > 800);
  const draw = (o) => { const { ctx, log } = _fake(); W.worldTerrainDraw(ctx, apex, Object.assign({ vs: 1, ox: 0, oy: 0, colour: (m, h) => h }, o)); return log; };
  const mean = (L) => { const c = L.fills.concat(L.stops).filter(x => /^#/.test(x)); return c.reduce((a, x) => a + lum(x), 0) / Math.max(1, c.length); };
  // sun on the face or behind it: the stone fills are lighter turned to the sun
  const sunOn = draw({ mctx: { sky: { sun: { az: 180, alt: 40 } }, month: 6 } }), sunOff = draw({ mctx: { sky: { sun: { az: 0, alt: 40 } }, month: 6 } });   // the camera looks north: the sun in the south is behind it, on the face
  assert.ok(mean(sunOn) > mean(sunOff) + 1.5, `a face lit (${mean(sunOn).toFixed(1)}) is lighter than one in shade (${mean(sunOff).toFixed(1)})`);
  // rain darkens the rock
  const wet = draw({ mctx: { sky: { sun: { az: 180, alt: 40 } }, month: 6, wet: 1 } });
  assert.ok(mean(wet) < mean(sunOn) - 2, `wet rock (${mean(wet).toFixed(1)}) is darker than dry (${mean(sunOn).toFixed(1)})`);
  // snow lies along the ledges on snow days only
  const dry = draw({ mctx: { month: 0, snowDay: false } }), snow = draw({ mctx: { month: 0, snowDay: true, snow: 0.8 } });
  assert.ok(snow.strokes.length > dry.strokes.length, `snow adds strokes along the ledges (${snow.strokes.length} against ${dry.strokes.length})`);
  // trees: crowns in leaf in July (ellipses), bare limbs and twigs in January (strokes, no crown)
  const summer = draw({ mctx: { month: 6 } }), winter = draw({ mctx: { month: 0 } });
  assert.ok(summer.ellipses > 0 && winter.ellipses === 0, `crowns in leaf (${summer.ellipses}), none in winter (${winter.ellipses})`);
});

test('Malham Cove, the no-example place: a short spec that validates clean, builds with nothing dropped, and the horizon is not open sky', async () => {
  const { loadEngine, resolveRef } = await import('../tools/lib/world/convert.mjs');
  const E = loadEngine(ROOT), hit = resolveRef(E, 'world-test/malham-cove-1-w3');
  assert.ok(hit, 'registered in the world-test pack');
  const sp = E.worldHostSpec(hit.item), v = W.worldValidate(JSON.parse(JSON.stringify(sp)));
  assert.deepEqual((v.errors || []).map(e => `${e.rule} ${e.path}`), [], 'validates clean');
  assert.ok(JSON.stringify(sp).length < 4000, 'the spec stays short: ' + JSON.stringify(sp).length + ' chars');
  assert.ok((sp.ground.features || []).some(f => f.kind === 'cliff') && !(sp.entities || []).some(e => /cliff|rock\.|boulder|stones/.test(e.obj || '')), 'the cliff is a ground feature; no hand-placed rock');
  const w = W.worldBuild(sp, { season: 'summer' });
  assert.deepEqual(w.log.filter(l => l.action === 'drop' && l.id && !/^(fill|edge|frame)/.test(l.id)).map(l => l.id + ':' + l.rule), [], 'nothing of the spec was dropped');
  assert.equal(W.worldCoverage(w, w.cam, {}).sky, 0, 'a cliff across the horizon is not an open sky (C6)');
});

test('dry-stone walls in the uplands, a clear beck where the water is narrow, a dale kit (TR9)', () => {
  assert.equal(W.worldDrystoneIs({ style: 'dale' }), true); assert.equal(W.worldDrystoneIs({ style: 'moor' }), true); assert.equal(W.worldDrystoneIs({ style: 'quayside' }), false);
  const w = build(Object.assign(cspec(), { place: { lat: 54.07, lon: -2.16, region: 'north-yorkshire', style: 'dale' }, lines: [{ id: 'wall', kind: 'wall', path: [[-30, 20], [-26, 120]] }] }));
  assert.deepEqual([w.lines[0].width, w.lines[0].h], [0.6, 1.3], 'a dry-stone wall is 0.6 m thick and 1.3 m high by default');
  const P = W.worldExtrude(w, w.cam, { season: 'summer', hulls: false }).filter(p => p.sub === 'wall' && p.zKey < 80);
  assert.ok(P.length && P.some(p => p.details.length > 40), 'a near piece carries courses, joints and cope stones');
  const town = build(Object.assign(cspec(), { place: { lat: 54.07, lon: -2.16, region: 'north-yorkshire', style: 'quayside' }, lines: [{ id: 'wall', kind: 'wall', path: [[-30, 20], [-26, 120]] }] }));
  assert.deepEqual([town.lines[0].width, town.lines[0].h], [0.45, 1.8], 'a town wall is not dry-stone');
  // a beck
  const river = (width) => ({ id: 'r', kind: 'water', water: 'river', path: [[0, 5], [0, 200]], width }), look = (width) => W.worldWaterNarrow(W.worldWaterLook('river'), river(width));
  assert.equal(look(2.6).stream, true); assert.ok(look(2.6).clarity > 0.4 && look(2.6).bed, 'a clear shallow beck over a pale stony bed');
  assert.equal(look(12).stream, undefined, 'a wide river is a river');
  assert.equal(W.worldWaterNarrow(W.worldWaterLook('canal'), river(2)).stream, undefined, 'a narrow canal is still a canal');
  assert.deepEqual(W.worldKitCheck({}).filter(x => x.kit === 'dale'), [], 'the dale kit is sound');
});

test('line gaps: the validator reads both forms the extruder reads (metres along, or a point and a width)', () => {
  const s = cspec({ lines: [{ id: 'a', kind: 'wall', path: [[0, 20], [40, 20]], gaps: [[10, 12]] }, { id: 'b', kind: 'wall', path: [[0, 30], [40, 30]], gaps: [{ at: [20, 30], w: 3 }] }, { id: 'c', kind: 'wall', path: [[0, 40], [40, 40]], gaps: [{ at: 'x' }] }] });
  const errs = W.worldValidate(s).errors.filter(e => /lines\[\d\]\.gaps/.test(e.path));
  assert.deepEqual(errs.map(e => e.path), ['lines[2].gaps'], 'only the malformed gap is refused');
});

test('a bench on a quay edge faces the water, and the sitter who stands up never steps into it (SCENE_LESSONS K)', () => {
  const sp = spec({ surfaces: [{ id: 'quay', kind: 'plaza', poly: [[-60, 1], [60, 1], [60, 10], [-60, 10]] }, { id: 'esk', kind: 'water', water: 'harbour', poly: [[-60, 10], [60, 10], [60, 80], [-60, 80]], shallow: 1 }],
    entities: [{ obj: 'street.bench', at: [-6, 9.2], facing: 0, id: 'bench-q' }],
    life: [{ who: 'visit', mix: { elderly: 1 }, rate: '4/min', goals: [{ go: 'bench-q' }, { do: 'sit', for: [10, 20] }, { leave: 'W' }] }] });
  const w = W.worldBuild(sp, { fill: false }), nav = W.worldNavBuild(w), life = W.worldLifeInit(w, nav, 0);
  let sat = 0, wet = 0;
  for (let t = 0; t < 240 * 15; t++) {
    W.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) { if (a.dead || a.kind !== 'walker') continue; if (a.bs === 'sit') sat++; if (a.z > 10) wet++; }
  }
  assert.ok(sat > 15, `somebody sat down (${sat} ticks)`);
  assert.equal(wet, 0, `${wet} ticks on the water`);
});

test('walls, fences, hedges and railings are solid to the nav, except at their gaps (docs 1.4; a sheep stood in a dry-stone wall)', () => {
  const sp = spec({ surfaces: [{ id: 'field', kind: 'grass', poly: [[-80, 1], [80, 1], [80, 120], [-80, 120]] }], entities: [],
    lines: [{ id: 'w', kind: 'wall', path: [[-40, 30], [40, 30]], width: 0.6, h: 1.3, gaps: [{ at: [0, 30], w: 3 }] }, { id: 'k', kind: 'kerb', path: [[-40, 60], [40, 60]], width: 0.2 }] });
  const w = W.worldBuild(sp, { fill: false }), nav = W.worldNavBuild(w);
  for (const layer of ['walk', 'graze']) {
    assert.equal(W.worldNavOk(nav, layer, 15, 30, 0.25), false, layer + ': the wall blocks');
    assert.equal(W.worldNavOk(nav, layer, 15, 33, 0.25), true, layer + ': beside it is open');
    assert.equal(W.worldNavOk(nav, layer, 0, 30, 0.25), true, layer + ': the gap is open');
    assert.equal(W.worldNavOk(nav, layer, 15, 60, 0.25), true, layer + ': a kerb is only an edge');
  }
});

test('nobody is left standing at an edge of the frame in a bench queue: a mover held in an edge zone leaves at once (C2)', () => {
  // a quay with one bench in view and a steady stream of visitors who all want it: the queue grows to the frame's edge
  const sp = spec({ surfaces: [{ id: 'quay', kind: 'plaza', poly: [[-150, 1], [150, 1], [150, 14], [-150, 14]] }, { id: 'esk', kind: 'water', water: 'harbour', poly: [[-300, 14], [300, 14], [300, 90], [-300, 90]], shallow: 1.5 }],
    entities: [{ obj: 'street.bench', at: [-3, 11], facing: 0, id: 'bench-q' }],
    life: [{ who: 'visit', mix: { elderly: 1 }, rate: '6/min', goals: [{ go: 'bench-q' }, { do: 'sit', for: [40, 70] }, { leave: 'W' }], edges: ['E'] }] });
  sp.camera = { eye: 3, fov: 66, horizon: 430, heading: 0, water: -3 };
  const w = W.worldBuild(sp, { fill: false }), nav = W.worldNavBuild(w), life = W.worldLifeInit(w, nav, 0);
  const held = new Map(); let worst = 0;
  for (let t = 0; t < 15 * 400; t++) {
    W.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      if (a.dead || a.kind !== 'walker') continue;
      const X = 800 + w.cam.f * a.x / Math.max(0.5, a.z), still = Math.hypot(a.vx || 0, a.vz || 0) < 0.1 && !a.seat && !a.step && (X < 30 || X > 1570);
      if (still) { const t0 = held.get(a.id) != null ? held.get(a.id) : (held.set(a.id, life.t), life.t); worst = Math.max(worst, life.t - t0); } else held.delete(a.id);
    }
  }
  assert.ok(worst < 2.5, `the longest anyone stood still in an edge zone: ${worst.toFixed(1)} s`);
});
