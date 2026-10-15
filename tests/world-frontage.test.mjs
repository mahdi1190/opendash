// World engine, the no-example medieval street (the Shambles, York; docs/dev/SCENE_LESSONS.md L; WORLD_ENGINE_REQUIREMENTS.md 28):
// a whole side of a lane is ONE rule (`buildings: [{ along, side, style, storeys }]`) that the engine cuts into irregular houses along the
// surface's centre line; the timber-framed generator stacks its storeys (jetties) and hangs its fittings from the wall; the measures
// (coverage, richness, the strict critic, the edge-cut invariant, the near band) know an extruded street is the frame, not a gap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { worldCritic } from '../tools/lib/world/critic.mjs';
import { runCells } from '../tools/lib/world/cells.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__york = { sceneBuildingProject, sceneBuildingResolve, sceneBuildingObject, sceneBuildingStyle, _scbgBuild, _scbgFoot, _scbgPersp, _scbgOrtho, _SCTF_NEAR, SCENE_GEN_UPM, _scbgElemKinds, _scbgWallPlane };' });
const G = globalThis.__york;
const lane = (o) => Object.assign({ v: 3, place: { lat: 53.959, lon: -1.0815, region: 'north-yorkshire', style: 'old-town-lane' }, camera: { eye: 1.7, fov: 62, horizon: 590, heading: 318 },
  surfaces: [{ id: 'lane', kind: 'plaza', path: [[0, -6], [0, 40], [3, 70], [3, 122]], width: 3.8 }],
  buildings: [{ id: 'west', along: 'lane', side: 'left', style: 'timber-framed', storeys: [2, 3], from: 2, to: 119 }, { id: 'east', along: 'lane', side: 'right', style: 'timber-framed', storeys: [2, 3], from: 2, to: 119 }],
  life: [{ who: 'walkers', on: 'lane', rate: '14/min', mix: { stroll: 0.6, chat: 0.2, family: 0.2 }, edges: ['S', 'N'] }], seed: 5 }, o || {});
const clone = (s) => JSON.parse(JSON.stringify(s));
const built = (o, opt) => W.worldBuild(clone(lane(o)), Object.assign({ fill: false }, opt || {}));
const centroid = (f) => [f.reduce((a, p) => a + p[0], 0) / f.length, f.reduce((a, p) => a + p[1], 0) / f.length];
/** Do two convex quads overlap (separating axis, a 3 cm tolerance)? */
function overlap(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], n = [b[1] - a[1], a[0] - b[0]], L = Math.hypot(n[0], n[1]) || 1;
    const pr = (Q) => Q.map(p => (p[0] * n[0] + p[1] * n[1]) / L), pa = pr(A), pb = pr(B);
    if (Math.max(...pa) <= Math.min(...pb) + 0.03 || Math.max(...pb) <= Math.min(...pa) + 0.03) return false;
  }
  return true;
}

test('the validator takes a whole side of a street: along + side, never a foot, and the surface must exist', () => {
  assert.deepEqual(W.worldValidate(clone(lane())).errors, []);
  const bad1 = W.worldValidate(clone(lane({ buildings: [{ id: 'x', along: 'nowhere', style: 'timber-framed', storeys: 3 }] })));
  assert.ok(bad1.errors.some(e => e.rule === 'unknownSurface'), 'an unknown surface');
  const bad2 = W.worldValidate(clone(lane({ buildings: [{ id: 'x', along: 'lane', side: 'up', storeys: 3 }] })));
  assert.ok(bad2.errors.some(e => e.rule === 'badValue' && /side/.test(e.path)), 'side is left or right');
  const bad3 = W.worldValidate(clone(lane({ buildings: [{ id: 'x', along: 'lane', foot: [[1, 1], [2, 1], [2, 2]], storeys: 3 }] })));
  assert.ok(bad3.errors.length > 0, 'an along building has no foot');
  const bad4 = W.worldValidate(clone(lane({ buildings: [{ id: 'x', along: 'lane', storeys: [4, 2] }] })));
  assert.ok(bad4.errors.some(e => /storeys/.test(e.path)), 'storeys [min, max] in order');
});

test('K1: a side of a lane is irregular houses, not identical boxes: widths, depths, storeys, a stepping front line, a bend', () => {
  const w = built(), hs = w.buildings;
  assert.ok(hs.length >= 30 && hs.every(b => Array.isArray(b.foot) && b.foot.length === 4 && b.along === undefined), 'the rules became houses with real footprints');
  assert.ok(w.log.some(l => l.rule === 'frontage'), 'logged');
  const west = hs.filter(b => /^west#/.test(b.id)), east = hs.filter(b => /^east#/.test(b.id));
  assert.ok(west.length >= 15 && east.length >= 15);
  assert.ok(west.every(b => centroid(b.foot)[0] < 0.5) && east.every(b => centroid(b.foot)[0] > -0.5), 'left of the lane is -x, right is +x');
  const frontW = hs.map(b => Math.round(b.frontage * 2) / 2), depths = hs.map(b => b.depth);
  assert.ok(new Set(frontW).size >= 6, 'at least six different frontages: ' + [...new Set(frontW)].sort());
  assert.ok(Math.max(...depths) - Math.min(...depths) > 2, 'depths vary');
  assert.deepEqual([...new Set(hs.map(b => b.storeys))].sort(), [2, 3], 'both storey counts');
  assert.ok(new Set(hs.map(b => b.seed)).size === hs.length, 'every house its own seed (doors, colours, jetties, fittings)');
  // the front line steps in and out a little at the party walls (a house standing proud) and never more than half a metre
  let steps = 0, worst = 0;
  for (let k = 1; k < west.length; k++) { const d = Math.hypot(west[k].foot[0][0] - west[k - 1].foot[1][0], west[k].foot[0][1] - west[k - 1].foot[1][1]); if (d > 0.04) steps++; worst = Math.max(worst, d); }
  assert.ok(steps >= 4 && worst < 0.55, `steps ${steps}, worst ${worst.toFixed(2)} m`);
  // every house stands clear of the lane (half its width) and no two houses overlap
  for (const b of hs) {
    const side = /^west/.test(b.id) ? -1 : 1;
    for (const p of b.foot.slice(0, 2)) {
      const cx = p[1] < 40 ? 0 : p[1] < 70 ? 3 * (p[1] - 40) / 30 : 3;   // the lane's centre at that depth
      assert.ok(side * (p[0] - cx) > 1.9 - 0.2, `${b.id} front corner ${p} is ${side * (p[0] - cx)} m from the centre line`);
    }
  }
  for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) assert.ok(!overlap(hs[i].foot, hs[j].foot), `${hs[i].id} overlaps ${hs[j].id}`);
  // the row follows the bend: its fronts turn with the lane
  const ang = (b) => Math.atan2(b.foot[1][0] - b.foot[0][0], b.foot[1][1] - b.foot[0][1]) * 180 / Math.PI;
  const early = west.find(b => b.foot[0][1] > 8 && b.foot[0][1] < 30), late = west.find(b => b.foot[0][1] > 45 && b.foot[0][1] < 65);
  assert.ok(Math.abs(ang(late) - ang(early)) > 3, `fronts turn with the lane: ${ang(early).toFixed(1)} -> ${ang(late).toFixed(1)}`);
  // the world measures a house by what is drawn: eaves and roof, not storeys x 3.1
  assert.ok(hs.every(b => b.h > b.storeys * 2.2 && b.h < 18), 'real heights');
});

test('K1: the street is seeded: the same spec is the same street, another seed another one', () => {
  const key = (w) => JSON.stringify(w.buildings.map(b => [b.id, b.foot, b.storeys, b.seed]));
  assert.equal(key(built()), key(built()));
  assert.notEqual(key(built()), key(built({ seed: 6 })));
});

test('K2: jetties: each storey on its own plane, an overhang is a soffit seen from below, in both views, with its fittings on the wall', () => {
  const cam = { eye: 1.7, fov: 62, horizon: 590 }, foot = [[1.9, 8], [1.9, 13], [9, 13], [9, 8]];
  const base = { foot, front: 0, style: 'timber-framed', seed: 11, storeys: 3, shop: { kind: 'butcher' } };
  const flat = G.sceneBuildingProject(Object.assign({}, base, { jetty: [0, 0] }), cam, { debug: true }), jet = G.sceneBuildingProject(Object.assign({}, base, { jetty: [0.5, 0.9] }), cam, { debug: true });
  assert.ok(flat && jet);
  const roles = (d) => d.debug.walls.map(w => w.role);
  assert.equal(roles(jet).filter(r => r === 'soffit').length, 2, 'one soffit under each overhang: ' + roles(jet));
  assert.equal(roles(flat).filter(r => r === 'soffit').length, 0, 'none without a jetty');
  assert.equal(roles(jet).filter(r => r === 'front').length, 3, 'a front face per storey');
  assert.equal(jet.walls.length, new Set(jet.walls).size, 'the visible wall list has no duplicates (the extruder indexes the footprint by it)');
  // the overhang shows: the upper storey's wall stands nearer the lane than the ground storey's, so its projected edge is further out
  const front = (d, k) => d.debug.walls.filter(w => w.role === 'front')[k].poly;
  assert.ok(Math.abs(front(jet, 2)[0][0] - front(jet, 0)[0][0]) > Math.abs(front(flat, 2)[0][0] - front(flat, 0)[0][0]) + 0.2, 'the upper storey is displaced by the overhang');
  // the elevation: the same machinery, an object with lit windows, the shadow band, no shape count over the cap
  const id = G.sceneBuildingObject({ style: 'timber-framed', storeys: 3, frontage: 5.4, seed: 7 });
  const def = W.sceneObj(id), shapes = W.sceneObjShapes(id, 0, 'summer');
  assert.ok(def && shapes && shapes.parts.body.length > 5 && shapes.parts.win.length >= 4, 'elevation object: body and windows');
  const d0 = G.sceneBuildingProject(Object.assign({}, base), cam, {});
  assert.ok(d0.n <= 900, 'the shape cap holds: ' + d0.n);
});

test('K2: nothing in the generator can read as a brand, a flag, a symbol, lettering or a house number', () => {
  const cam = { eye: 1.7, fov: 62, horizon: 590 };
  for (let seed = 1; seed <= 24; seed++) {
    const d = G.sceneBuildingProject({ foot: [[1.9, 8], [1.9, 14], [9, 14], [9, 8]], front: 0, style: 'timber-framed', seed, storeys: 3, shop: { kind: 'butcher', brand: true } }, cam, { signage: true });
    assert.deepEqual(d.signs, [], 'a brand never gets a sign (seed ' + seed + ')');
    for (const s of d.shapes) assert.ok(/^[MLHVZ0-9eE+\-., ]+$/.test(s.d), 'paths only: no glyphs');
  }
});

test('K2: a fitting never hangs where it would fill the corner of the frame; in elevation they are all there', () => {
  const cam = { eye: 1.7, fov: 62, horizon: 590 }, view = G._scbgPersp(cam), ortho = G._scbgOrtho(G.SCENE_GEN_UPM);
  const fits = (z0, v) => {
    const out = [];
    for (let seed = 1; seed <= 40; seed++) {
      const b = { foot: [[1.9, z0], [1.9, z0 + 5.4], [9, z0 + 5.4], [9, z0]], front: 0, style: 'timber-framed', seed, storeys: 3, shop: { kind: 'butcher' } };
      const sp = G.sceneBuildingResolve(b), foot = G._scbgFoot(v.ortho ? [[-2.7, 0], [2.7, 0], [2.7, 8], [-2.7, 8]] : b.foot, 0);
      G._scbgBuild(b, sp, foot, v, { season: 'summer', tierCap: 3 });
      out.push(...(sp.tf.fit || []).map(f => f.kind));
    }
    return out;
  };
  assert.deepEqual(fits(0.6, view).filter(k => k === 'stall' || k === 'awning' || k === 'basket' || k === 'sign'), [], 'none within the near band (the house spans z 0.6-6)');
  const far = fits(16, view);
  for (const k of ['stall', 'awning', 'sign', 'lantern', 'basket']) assert.ok(far.includes(k), 'a ' + k + ' hangs at 16 m');
  assert.ok(fits(0, ortho).includes('stall'), 'an elevation has them all');
});

test('the measures know an extruded street is the frame: coverage, richness and the strict critic', () => {
  const w = W.worldBuild(clone(lane()), {}), cam = w.cam;
  const cov = W.worldCoverage(w, cam);
  assert.ok(cov.bare < 0.1 && cov.ok, 'a lane between two rows of houses is not bare ground: bare ' + cov.bare);
  const rich = W.worldRichness(w, cam);
  assert.ok(rich.ok && rich.near.cover >= 0.7 && rich.mid.cover >= 0.7, 'richness counts the houses: ' + JSON.stringify(rich.near) + JSON.stringify(rich.mid));
  // the fill did not bury the street behind the houses (it used to add hundreds of far entities to make up for houses it could not see)
  assert.ok(w.entities.filter(e => /^tree./.test(e.obj) && e.z < 100).length === 0, 'no tree in or behind the lane within 100 m');
  assert.ok(w.entities.length < 170, 'a lane needs no forest behind its houses: ' + w.entities.length + ' entities');
  for (const season of ['summer', 'winter']) { const c = worldCritic(W, clone(lane()), { season }); assert.deepEqual(c.problems, [], season + ': ' + JSON.stringify(c.problems)); }
});

test('the kit keeps the lane clear: no bench, bin, bollard or lamp post in a lane; the near band holds the fill\'s furniture back', () => {
  const w = W.worldBuild(clone(lane()), {});
  const bad = w.entities.filter(e => /street\.(bench|bollard|lamppost|lamp|mcf-litter-bin|mcr-bin|mqn-bin)/.test(e.obj));
  assert.deepEqual(bad.map(e => e.obj + '@' + e.x.toFixed(1) + ',' + e.z.toFixed(1)), []);
  const lim = w.cam.f * 0.95 / 110;
  for (const e of w.entities) if (/street\.mqn-aboard|plant\.rph-flower-tub/.test(e.obj) && !e.framing && e.auto !== 'frame') assert.ok(e.z >= Math.min(lim, 11) - 0.5, `${e.obj} at ${e.z.toFixed(1)} m is in the near band`);
  const a = { obj: 'street.mqn-aboard', facing: 0, id: 'ab' };
  assert.equal(W.worldPlaceOk(w, a, 0.5, 4.5, 0).ok, false, 'an A-board 4.5 m from the lens is a blob in the corner');
  assert.equal(W.worldPlaceOk(w, a, 1.2, 22, 0).rule, undefined, 'at 22 m it is fine (or blocked by something else, never the band)');
});

test('the lane\'s ground is a running bond with a worn central drain, from the kit look alone', () => {
  const w = W.worldBuild(clone(lane()), {}), s = w.surfaces.find(q => q.id === 'lane');
  assert.equal(W.worldGroundLookOf(w, s), 'lane');
  assert.ok(W.WORLD_GROUND_LOOKS.lane.stagger && W.WORLD_GROUND_LOOKS.lane.drain > 0 && !W.WORLD_GROUND_LOOKS.lane.cracks);
  const plan = W.worldGroundDetail(w, w.cam, {}), g = plan.groups.find(q => q.surf === 'lane' || (q.surf && q.surf.id === 'lane'));
  assert.ok(g && g.marks.length > 40, 'marks');
  const drain = g.marks.filter(m => m.t === 'poly' && m.c === 'dark' && m.a === 0.3);
  assert.ok(drain.length >= 3, 'the drain is drawn along the centre line, foreshortened: ' + drain.length);
  // no joint runs the length of the lane: every along-cut is one course long
  const cuts = g.marks.filter(m => m.k === 'joint-along');
  assert.ok(cuts.length > 20 && cuts.every(m => m.pts.length <= 6), 'a running bond, not a tile grid');
});

test('people never walk through the houses of a lane and nothing in it is cut by the frame wrongly (a minute of life, the checker)', async () => {
  const [r] = await runCells([{ op: 'inv', spec: clone(lane()), seconds: 40, hz: 2 }], { root: ROOT, concurrency: 1 });
  assert.ok(r && !r.error, r && r.error);
  for (const k of ['inSolid', 'habitat', 'edgeCut', 'pathBlocked', 'floating', 'overlap']) assert.equal((r.counts || {})[k] || 0, 0, k + ': ' + (r.first && r.first[k] && r.first[k].msg));
});

test('a group that spawns in a lane never stacks its members on the leader (the formation slot is blocked by a wall: another free spot, or no member)', () => {
  // the old fallback put a member whose slot was blocked EXACTLY on its leader (0.000 m apart, the browser checker's personalSpace at
  // t = 1.5 s); the spawn events carry where every mover appeared
  const spec = clone(lane());
  spec.life[0].mix = { family: 0.6, chat: 0.2, couple: 0.2 }; spec.life[0].rate = '24/min';
  const w = W.worldBuild(spec, {}), nav = W.worldNavBuild(w), life = W.worldLifeInit(w, nav, 3, { warm: false });
  for (let s = 0; s < 120 * 15; s++) W.worldLifeTick(life, 1 / 15);
  const at = new Map(life.events.filter(e => e.kind === 'spawn').map(e => [e.id, e]));
  let pairs = 0, minD = 9;
  for (const [id, e] of at) {
    const k = id.lastIndexOf('.');
    if (k < 0 || !at.has(id.slice(0, k))) continue;
    pairs++; minD = Math.min(minD, Math.hypot(e.x - at.get(id.slice(0, k)).x, e.z - at.get(id.slice(0, k)).z));
  }
  assert.ok(pairs >= 10, 'groups arrived: ' + pairs + ' members');
  assert.ok(minD > 0.12, 'the closest a member appeared to its leader: ' + minD.toFixed(3) + ' m');
});

test('ST3: a wall seen at a grazing angle is not a smear of studs: the pitch is drawn only where it is >= 2.6 px on screen', () => {
  const cam = { eye: 1.7, fov: 62, horizon: 590 }, view = G._scbgPersp(cam);
  const run = (a, b) => {
    const plane = G._scbgWallPlane(a, b), adds = [];
    const ctx = { view, sink: { add: (layer, sh) => adds.push([layer, sh]) }, sp: {}, season: 'summer', tierCap: 3 };
    const face = { plane, n: plane.N, part: 'wall', col: '#e8e1cd', elems: [] };
    const rects = [[0, 0, 0.17, 3, 1], [plane.len - 0.17, 0, 0.17, 3, 1]];
    for (let s = 0.3; s < plane.len - 0.2; s += 0.31) rects.push([s, 0.4, 0.08, 2.4, 2]);
    G._scbgElemKinds.tframe({ s0: 0, s1: plane.len, z0: 0, z1: 3, storey: 0, rects, quads: [], col: '#33261b', pitch: 0.31, studZone: [0.17, 0.4, plane.len - 0.34, 2.4] }, face, ctx, 3);
    const body = adds.find(x => x[0] === 2), tone = adds.find(x => x[0] === 1);
    return { quads: body ? (body[1].d.match(/M/g) || []).length : 0, tone: !!tone };
  };
  const frontal = run([-2.7, 12], [2.7, 12]);         // square to the eye: every stud reads
  const grazing = run([1.9, 40], [1.9, 46.4]);        // along the lane, 40 m away: studs would be a fraction of a pixel apart
  assert.ok(frontal.quads > 12 && !frontal.tone, 'frontal: posts and studs, no tone panel: ' + JSON.stringify(frontal));
  assert.ok(grazing.quads === 2 && grazing.tone, 'grazing: only the posts, the stud zone is one toned panel: ' + JSON.stringify(grazing));
});
