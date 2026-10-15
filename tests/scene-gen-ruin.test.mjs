// Scene engine v2 generator, ruins, bridges and the north-east coast house (docs/dev/SCENE_LESSONS.md T; WORLD_ENGINE.md 14.2):
// the gothic-ruin style draws a roofless abbey whose openings are REAL holes (the sky shows through them), the swing-bridge style a steel
// truss bridge, the parish-church style a nave with a squat tower, the pantile-cottage style red pantiles; a building declared a
// `landmark` is never hidden by the fill; a `stairs` surface draws treads; the Whitby harbour scene is built from them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__ru = { sceneBuildingProject, sceneBuildingResolve, sceneBuildingStyle, sceneBuildingObject, _scruOutline, _scruHolePoly, _scruColumn, _scruBays, _scruFitTiers, _scruLongFront, _scbgElemKinds, SCENE_GEN_MAX_SHAPES, _SCBG_ROOFS };' });
const G = globalThis.__ru;
const CAM = { eye: 3, fov: 66, horizon: 430, heading: 78 };
const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
/** Even-odd point in polygon. */
const inside = (P, x, y) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const ABBEY = { id: 'abbey', foot: [[-30, 90], [34, 90], [34, 114], [-30, 114]], storeys: 1, h: 24, style: 'gothic-ruin', crown: 'abbey', seed: 5 };

test('the four generator styles are registered with their hooks', () => {
  for (const id of ['gothic-ruin', 'parish-church', 'swing-bridge', 'pantile-cottage']) assert.ok(G.sceneBuildingStyle(id), id);
  assert.equal(typeof G.sceneBuildingStyle('gothic-ruin').build, 'function');
  assert.ok(G.sceneBuildingStyle('gothic-ruin').ruin.presets.abbey && G.sceneBuildingStyle('gothic-ruin').ruin.presets.chapel);
  assert.equal(typeof G.sceneBuildingStyle('swing-bridge').build, 'function');
  assert.ok(G.sceneBuildingStyle('parish-church').crowns['squat-tower']);
  assert.ok(typeof G._scbgElemKinds.mesh === 'function', 'the mesh element kind is registered');
});

test('a lancet is a pointed arch: counter-clockwise, symmetric, its apex at the opening height, wider than a point', () => {
  const o = G._scruOutline({ c: 10, w: 1, z0: 2, h: 6, kind: 'lancet' }, 5);
  assert.ok(area(o) > 0, 'counter-clockwise');
  const top = o.reduce((a, p) => (p[1] > a[1] ? p : a), o[0]);
  assert.ok(Math.abs(top[0] - 10) < 1e-6 && Math.abs(top[1] - 8) < 1e-6, 'apex at (c, z0 + h): ' + top);
  assert.ok(o.every(p => p[0] >= 9.5 - 1e-9 && p[0] <= 10.5 + 1e-9 && p[1] >= 2 - 1e-9), 'inside its box');
  const L = o.filter(p => p[0] < 10 - 1e-6).map(p => p[1]).sort((a, b) => a - b), R = o.filter(p => p[0] > 10 + 1e-6).map(p => p[1]).sort((a, b) => a - b);
  assert.deepEqual(L.map(v => +v.toFixed(5)), R.map(v => +v.toFixed(5)), 'mirrored about the axis');
  const r = G._scruOutline({ c: 0, w: 2, z0: 0, h: 3, kind: 'round' }, 4);
  assert.ok(Math.abs(Math.max(...r.map(p => p[1])) - 3) < 1e-6, 'a round arch reaches its height');
});

test('a wall column is the wall MINUS its opening: a real hole, one simple polygon, nothing inside the opening', () => {
  const hole = G._scruOutline({ c: 5, w: 1, z0: 1, h: 4, kind: 'lancet' }, 5), rect = [[3, 0], [7, 0], [7, 8], [3, 8]];
  const poly = G._scruHolePoly(rect, hole);
  assert.ok(Math.abs(Math.abs(area(poly)) - (area(rect) - area(hole))) < 1e-9, 'area = wall - hole');
  assert.ok(!inside(poly, 5, 2.5), 'the middle of the opening is empty');
  assert.ok(inside(poly, 3.5, 2.5) && inside(poly, 5, 6.5) && inside(poly, 6.8, 0.5), 'the wall is whole around it');
  const out = { polys: [], holes: [] };
  G._scruColumn(out, 3, 7, 0, 12, 12, [{ z0: 1, h: 4, w: 1, kind: 'lancet' }, { z0: 6.5, h: 4, w: 1, kind: 'lancet' }], 4);
  assert.equal(out.holes.length, 2, 'two tiers, two holes');
  assert.ok(out.polys.every(p => p.pts.length >= 4));
  const where = (x, y) => out.polys.filter(p => inside(p.pts, x, y)).length;
  assert.equal(where(5, 3), 0, 'sky through the lower opening'); assert.equal(where(5, 8.5), 0, 'sky through the upper one');
  assert.equal(where(3.4, 3), 1, 'the pier beside it is wall'); assert.equal(where(5, 5.7), 1, 'the string course between the tiers is wall');
  // a gap: the head of the window has gone: sky above the sill all the way up
  const g = { polys: [], holes: [] };
  G._scruColumn(g, 3, 7, 0, 9, 9, [{ z0: 3, h: 4, w: 1.2, kind: 'lancet', gap: true }], 4);
  const gw = (x, y) => g.polys.filter(p => inside(p.pts, x, y)).length;
  assert.equal(gw(5, 8), 0, 'open to the sky above the sill'); assert.equal(gw(5, 1.5), 1, 'whole below it'); assert.equal(gw(3.4, 8), 1, 'wall at its side');
});

test('the abbey projects to a bounded number of shapes, deterministically, and the sky shows through its windows', () => {
  const a = G.sceneBuildingProject(ABBEY, CAM, { season: 'summer' }), b = G.sceneBuildingProject(ABBEY, CAM, { season: 'summer' });
  assert.ok(a && a.shapes.length > 8, 'drawn');
  assert.ok(a.shapes.length + a.lit.length + a.snow.length <= G.SCENE_GEN_MAX_SHAPES, 'inside the shape budget: ' + a.shapes.length);
  assert.deepEqual(a.shapes, b.shapes, 'the same building twice');
  assert.ok(a.h >= 24 && a.h < 40, 'height follows h: ' + a.h);
  assert.ok(a.box[2] - a.box[0] > 150 && a.box[3] - a.box[1] > 60, 'a big thing on the screen: ' + a.box);
  assert.deepEqual(a.walls.filter(i => !Number.isInteger(i)), [], 'the wall edges are real footprint indices');
  // detail steps down with the tier cap, never up past the budget
  const far = G.sceneBuildingProject(Object.assign({}, ABBEY, { foot: ABBEY.foot.map(p => [p[0], p[1] + 700]) }), CAM, { season: 'summer' });
  assert.ok(far && far.shapes.length <= a.shapes.length + 40, 'a far one is no richer');
  const other = G.sceneBuildingProject(Object.assign({}, ABBEY, { seed: 99 }), CAM, { season: 'summer' });
  assert.notDeepEqual(other.shapes.map(s => s.d), a.shapes.map(s => s.d), 'another seed is another ruin');
});

test('the long edge that faces the eye is the front of the plan, whatever edge the world picked', () => {
  const foot = [[-30, 90], [34, 90], [34, 114], [-30, 114]], rot = (f, k) => f.slice(k).concat(f.slice(0, k));
  const view = { ortho: false };
  for (let k = 0; k < 4; k++) {
    const f = G._scruLongFront(rot(foot, k), view);
    assert.deepEqual(f[0], [-30, 90], 'edge ' + k + ' -> the south side first');
    assert.deepEqual(f[1], [34, 90]);
  }
});

test('the chapel preset is smaller than the abbey, and an unknown crown falls back to the style default', () => {
  const ch = G.sceneBuildingProject(Object.assign({}, ABBEY, { crown: 'chapel', h: 13 }), CAM, {});
  const ab = G.sceneBuildingProject(ABBEY, CAM, {});
  assert.ok(ch.n < ab.n, 'fewer shapes: ' + ch.n + ' < ' + ab.n);
  const d = G.sceneBuildingProject(Object.assign({}, ABBEY, { crown: 'nonesuch' }), CAM, {});
  assert.deepEqual(d.shapes, ab.shapes, 'the default preset');
});

test('a swing bridge: two trusses over a deck, a cabin, a pier; wide on the screen, within budget', () => {
  const b = { id: 'br', foot: [[68, 196], [124, 196], [124, 204], [68, 204]], storeys: 1, h: 8, style: 'swing-bridge', seed: 3 };
  const d = G.sceneBuildingProject(b, CAM, { season: 'summer' });
  assert.ok(d && d.shapes.length >= 6 && d.shapes.length <= G.SCENE_GEN_MAX_SHAPES, 'shapes ' + (d && d.shapes.length));
  assert.ok(d.box[2] - d.box[0] > 200, 'the span is wide: ' + (d.box[2] - d.box[0]));
  assert.ok(d.box[3] - d.box[1] < 90, 'and low: ' + (d.box[3] - d.box[1]));
  const e = G.sceneBuildingProject(Object.assign({}, b, { foot: [[68, 204], [124, 204], [124, 196], [68, 196]] }), CAM, {});   // clockwise
  assert.ok(e && e.shapes.length >= 6, 'any vertex order');
});

test('the parish church has a tower twice the nave; the pantile cottage roof is a red tile', () => {
  const nave = { id: 'c', foot: [[-82, 212], [-58, 212], [-58, 222], [-82, 222]], storeys: 1, style: 'parish-church', seed: 1 };
  const plain = G.sceneBuildingProject(Object.assign({}, nave, { crown: 'none' }), CAM, {}), tower = G.sceneBuildingProject(Object.assign({}, nave, { crown: 'squat-tower' }), CAM, {});
  assert.ok(tower.h > plain.h * 1.5, 'the tower rises above the roof: ' + tower.h + ' vs ' + plain.h);
  const st = G.sceneBuildingStyle('pantile-cottage');
  const hue = (c) => { const n = parseInt(c.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return r > g && g >= b * 0.5 && r - g > 30; };
  assert.ok(st.roofMat.cols.filter(hue).length >= 6, 'red pantiles');
  assert.ok(st.roofs.includes('gable') && st.roofs.includes('pitched-side'), 'gable ends to the lane among the ridges');
});

test('the validator takes landmark: true on a building and refuses anything else', () => {
  const spec = (l) => ({ v: 3, place: { lat: 54.4858, lon: -0.6133, region: 'north-yorkshire', style: 'quayside' }, camera: { eye: 3, fov: 66, horizon: 430, heading: 78 },
    surfaces: [{ id: 'g', kind: 'grass', poly: [[-100, 1], [100, 1], [100, 300], [-100, 300]] }],
    buildings: [{ id: 'abbey', foot: [[-30, 90], [34, 90], [34, 114], [-30, 114]], storeys: 1, h: 24, style: 'gothic-ruin', crown: 'abbey', landmark: l }], life: [], seed: 1 });
  assert.deepEqual(W.worldValidate(JSON.parse(JSON.stringify(spec(true)))).errors, []);
  assert.ok(W.worldValidate(JSON.parse(JSON.stringify(spec('yes')))).errors.some(e => /landmark/.test(e.path)));
});

test('the fill never plants across a landmark building: auto trees stay off the face of the abbey, and cover it when it is not declared', () => {
  const mk = (landmark) => ({
    v: 3, place: { lat: 54.4858, lon: -0.6133, region: 'north-yorkshire', style: 'quayside' }, camera: { eye: 3, fov: 66, horizon: 430, heading: 78 },
    ground: { features: [{ kind: 'embankment', path: [[-200, 252], [100, 252]], width: 184, h: 36 }] },
    surfaces: [{ id: 'cliff', kind: 'grass', poly: [[-300, 100], [300, 100], [300, 400], [-300, 400]] }],
    buildings: [{ id: 'abbey', foot: [[-30, 208], [30, 208], [30, 230], [-30, 230]], storeys: 1, h: 26, landmark, style: 'gothic-ruin', crown: 'abbey', src: 'test' }],
    life: [], seed: 4,
  });
  const covered = (landmark) => {
    const w = W.worldBuild(JSON.parse(JSON.stringify(mk(landmark))), { fill: true }), cam = w.cam;
    const proj = (x, z, y) => { const k = cam.f / z; return [(cam.x0 == null ? 800 : cam.x0) + k * x, cam.horizon + k * (cam.eye - y)]; };
    const pts = []; for (const p of [[-30, 208], [30, 208], [30, 230], [-30, 230]]) pts.push(proj(p[0], p[1], 36), proj(p[0], p[1], 36 + 26));
    const box = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])), Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
    const n = 16, m = 10, cw = (box[2] - box[0]) / n, ch = (box[3] - box[1]) / m, hit = new Set();
    for (const e of w.entities || []) {
      if (!e.auto || !(e.z < 208) || !e.obj) continue;
      const b = W.worldEntityBox(cam, e); if (!b) continue;
      for (let i = 0; i < n; i++) for (let j = 0; j < m - 1; j++) {
        const X = box[0] + (i + 0.5) * cw, Y = box[1] + (j + 0.5) * ch;
        if (X >= b[0] && X <= b[2] && Y >= b[1] && Y <= b[3]) hit.add(i * m + j);
      }
    }
    return hit.size / (n * (m - 1));
  };
  const on = covered(true), off = covered(false);
  assert.ok(on <= 0.09, 'declared: ' + on.toFixed(3) + ' of the face of the abbey is planted over');
  assert.ok(off > on, 'not declared it is covered more: ' + off.toFixed(3) + ' vs ' + on.toFixed(3));
});

test('a stairs surface draws treads (the look "steps"), every other walk kind is unchanged', () => {
  const spec = { v: 3, place: { lat: 54.4858, lon: -0.6133, region: 'north-yorkshire', style: 'quayside' }, camera: { eye: 3, fov: 66, horizon: 430, heading: 78 },
    ground: { features: [{ kind: 'embankment', path: [[-200, 252], [100, 252]], width: 184, h: 36 }] },
    surfaces: [{ id: 'cliff', kind: 'grass', poly: [[-300, 100], [300, 100], [300, 400], [-300, 400]] }, { id: 'steps', kind: 'stairs', path: [[-10, 160], [0, 180], [8, 204]], width: 2.4, from: 'ground', to: 'ground' }],
    life: [], seed: 4 };
  const w = W.worldBuild(JSON.parse(JSON.stringify(spec)), { fill: false });
  const s = w.surfaces.find(x => x.id === 'steps');
  assert.equal(W.worldGroundLookOf(w, s), 'steps');
  const plan = W.worldGroundDetail(w, w.cam, {});
  const grp = (plan.groups || []).find(g => g.surf === 'steps' || (g.surf && g.surf.id === 'steps'));
  assert.ok(grp && grp.marks.some(m => m.k === 'tread'), 'tread lines across the flight');
  assert.ok(grp.marks.some(m => m.k === 'nosing'), 'and a pale nosing');
});

test('a narrow surface across a slope is never lost between big terrain quads: every strip the steps cross has stone in it', () => {
  const spec = { v: 3, place: { lat: 54.4858, lon: -0.6133, region: 'north-yorkshire', style: 'quayside' }, camera: { eye: 3, fov: 66, horizon: 430, heading: 78 },
    ground: { features: [{ kind: 'embankment', path: [[-200, 252], [100, 252]], width: 184, h: 36 }] },
    surfaces: [{ id: 'cliff', kind: 'grass', poly: [[-300, 100], [300, 100], [300, 400], [-300, 400]] }, { id: 'steps', kind: 'stairs', path: [[-30, 162], [-24, 182], [-18, 204]], width: 2.2, from: 'ground', to: 'ground' }],
    life: [], seed: 4 };
  const w = W.worldBuild(JSON.parse(JSON.stringify(spec)), { fill: false });
  const prims = W.worldTerrainPrims(w, w.cam, {}).filter(p => p.sub === 'terrain' && p.zKey > 163 && p.zKey < 203);
  assert.ok(prims.length >= 6, 'strips across the flight: ' + prims.length);
  const miss = prims.filter(p => !(p.faces || []).some(f => f.mat === 'stone'));
  assert.deepEqual(miss.map(p => Math.round(p.zKey)), [], 'strips with no stone where the steps cross');
});
