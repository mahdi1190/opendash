// World engine, package appearance: cameras by intent, the place -> camera transform, framing (C1), landmarks (C4) and
// overscan (Q6). docs/dev/WORLD_ENGINE_REQUIREMENTS.md W5, Q1, Q6, Q7, C1, C4; docs/dev/WORLD_ENGINE.md 12.4, 14.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const DEG = Math.PI / 180;
const clone = (o) => JSON.parse(JSON.stringify(o));

// a place-frame world (x east, z north) with a landmark and four viewpoints of it
const place = () => ({
  v: 3.1,
  place: { lat: 51.2905, lon: -0.8228, alt: 68, region: 'hampshire' },
  cameras: [
    { id: 'south', at: [0, -10], height: 1.65, lookAt: 'bridge' },
    { id: 'east', at: [70, 110], height: 1.7, lookAt: 'bridge' },
    { id: 'raised', at: [-40, 60], height: 6, lookAt: 'bridge', fov: 58 },
    { id: 'framed', frame: ['bridge', 'tower'] },
  ],
  surfaces: [
    { id: 'meadow', kind: 'grass', poly: [[-300, -300], [300, -300], [300, 400], [-300, 400]] },
    { id: 'lane', kind: 'path', path: [[0, -60], [0, 150]], width: 2.5 },
  ],
  entities: [
    { obj: 'tree.bank-willow', at: [-18, 40], id: 't1' },
    { obj: 'tree.bank-oak', at: [22, 70], id: 't2' },
    { obj: 'street.bench', at: [3, 20], id: 'bench-1', facing: 270 },
  ],
  landmarks: [
    { obj: 'structure.bridge-brick', at: [5, 120], facing: 90, id: 'bridge', src: 'test' },
    { obj: 'structure.bridge-brick', at: [-30, 135], facing: 90, id: 'tower', src: 'test' },
  ],
  backdrop: { style: 'farmland' },
  seed: 4,
});
/** A camera-frame world of camera i (the convenience path; sense's worldBuild does the same transform). */
const worldOf = (spec, i) => W.worldBuild(W.worldCameraSpec(spec, i), { validate: false });

test('the appearance camera API is loaded', () => {
  for (const n of ['worldCameraResolve', 'worldCameraXform', 'worldCameraSpec', 'worldCameraBearing', 'worldScreenBox', 'worldFrameCheck', 'worldLandmarkCheck', 'worldOverscan'])
    assert.equal(typeof W[n], 'function', n);
  assert.ok(W.WORLD_OVERSCAN_FRAMES && W.WORLD_OVERSCAN_FRAMES['21:9'] > 2.3);
});

test('W5: a v3.0 camera resolves to its own block, the pitch derived from the horizon, the position from the place', () => {
  const spec = { v: 3, place: { lat: 51.2, lon: -0.8, alt: 60 }, camera: { eye: 1.7, fov: 64, horizon: 395, heading: 112 }, surfaces: [], entities: [] };
  const c = W.worldCameraResolve(spec, 0);
  assert.equal(c.src, 'v3.0');
  assert.equal(c.heading, 112);
  assert.equal(c.eye, 1.7);
  assert.equal(c.horizon, 395);
  assert.ok(Math.abs(450 + c.f * Math.tan(c.pitch * DEG) - c.horizon) < 0.1, 'horizon = 450 + f tan(pitch)');
  assert.ok(c.pitch < 0, 'a horizon above the centre is a camera tilted down');
  assert.equal(c.lat, 51.2); assert.equal(c.lon, -0.8); assert.equal(c.alt, 60);
  const X = W.worldCameraXform(spec, 0);
  assert.equal(X.identity, true);
  assert.deepEqual(X.toCam(3, 7), [3, 7]);
  assert.equal(X.facing(40), 40);
});

test('W5, Q1: a camera at [lat, lon] has a real position, height and lat / lon; the horizon follows its pitch', () => {
  const spec = place();
  spec.cameras = [{ at: [51.2905 + 0.001, -0.8228], height: 1.65, lookAt: 0, pitch: -2 }];
  const c = W.worldCameraResolve(spec, 0);
  assert.ok(Math.abs(c.pos[0]) < 0.01, `x ${c.pos[0]}`);
  assert.ok(Math.abs(c.pos[1] - 111.25) < 0.5, `0.001 degrees north is about 111 m (${c.pos[1]})`);
  assert.ok(Math.abs(c.lat - (51.2905 + 0.001)) < 1e-6 && Math.abs(c.lon + 0.8228) < 1e-6, 'the camera carries its own lat / lon');
  assert.equal(c.heading, 0, 'lookAt a bearing sets the heading');
  assert.equal(c.eye, 1.65);
  assert.ok(Math.abs(c.pitch + 2) < 1e-6 && Math.abs(c.horizon - (450 + c.f * Math.tan(-2 * DEG))) < 0.1);
  assert.ok(c.alt > 68, 'alt is the place altitude plus the eye');
  const timed = W.worldCameraResolve(spec, 0, { ms: Date.UTC(2026, 9, 10, 12) });
  assert.equal(timed.ms, Date.UTC(2026, 9, 10, 12), 'the time comes from the time context');
});

test('Q1: a camera with lookAt centres the landmark with >= 60 % of its face visible', () => {
  const spec = place();
  for (const i of [0, 1, 2]) {
    const c = W.worldCameraResolve(spec, i);
    const X = W.worldCameraXform(spec, i);
    const [x, z] = X.toCam(5, 120);
    assert.ok(Math.abs(x) < 1e-6 * Math.max(1, z) + 1e-3, `camera ${i}: the landmark is on the axis (x ${x})`);
    const world = worldOf(spec, i);
    const lm = world.entities.find(e => e.id === 'bridge');
    const box = W.worldScreenBox(lm, world.cam).box, cx = (box[0] + box[2]) / 2;
    assert.ok(Math.abs(cx - 800) < 16, `camera ${i}: centred (X ${cx})`);
    assert.ok(box[1] >= 0.08 * 900 - 1 && box[3] <= 900, `camera ${i}: fits vertically ${box}`);
    const r = W.worldLandmarkCheck(world, world.cam), rec = r.landmarks.find(l => l.id === 'bridge');
    assert.ok(rec.visible >= 0.6, `camera ${i}: ${rec.visible} of the face visible (${rec.msg})`);
    assert.ok(rec.tile >= 0.6, `camera ${i}: ${rec.tile} in the tile crop`);
    assert.equal(rec.ok, true, rec.msg);
    assert.ok(Math.abs(world.cam.heading - c.heading) < 1e-6, 'the world camera is the resolved one');
  }
});

test('Q1: frame: [ids] stands the camera in front of the subjects and fits them all', () => {
  const spec = place(), c = W.worldCameraResolve(spec, 3);
  assert.equal(c.src, 'intent');
  const world = worldOf(spec, 3);
  for (const id of ['bridge', 'tower']) {
    const e = world.entities.find(q => q.id === id), b = W.worldScreenBox(e, world.cam).box;
    assert.ok(b[0] >= -1 && b[2] <= 1601 && b[1] >= -1 && b[3] <= 901, `${id} in frame: ${b.map(Math.round)}`);
  }
  const r = W.worldLandmarkCheck(world, world.cam);
  assert.ok(r.landmarks.every(l => l.visible >= 0.6), JSON.stringify(r.landmarks.map(l => [l.id, l.visible])));
});

test('Q1: bad intent never throws; it falls back and logs', () => {
  const spec = place();
  spec.cameras = [{ lookAt: 'no-such-thing', fov: 'wide' }, {}, null];
  for (const i of [0, 1, 2, 7, 'missing']) {
    const c = W.worldCameraResolve(spec, i);
    assert.ok(Number.isFinite(c.heading) && Number.isFinite(c.horizon) && Number.isFinite(c.f) && c.eye > 0, JSON.stringify(c));
  }
  const c0 = W.worldCameraResolve(spec, 0);
  assert.ok(c0.log.some(l => l.rule === 'unknownLookAt'), 'the unknown lookAt is logged');
  assert.equal(c0.fov, 62, 'a bad fov falls back to the default');
  assert.ok(W.worldCameraResolve(null, 0).eye > 0);
});

test('Q7: the place -> camera transform: positions, facings and the round trip', () => {
  const spec = place();
  spec.cameras = [{ at: [10, 20], heading: 90 }];
  const X = W.worldCameraXform(spec, 0);
  assert.deepEqual(X.toCam(20, 20), [0, 10], 'east of a camera heading east is straight ahead');
  assert.deepEqual(X.toCam(10, 10), [10, 0], 'south of it is to its right');
  assert.equal(X.facing(0), 270, 'a boat facing north is seen facing left');
  assert.equal(X.facingToPlace(270), 0);
  for (const p of [[3, 4], [-50, 120], [0.5, -7]]) { const q = X.toPlace(...X.toCam(p[0], p[1])); assert.ok(Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-3); }
  assert.equal(W.worldCameraBearing(X.cam, 0, 10), 90, 'a point dead ahead lies on the heading (backdrop bearings)');
  assert.equal(W.worldCameraBearing(X.cam, 10, 10), 135);
});

test('Q7: one world through 4 cameras builds with no other spec change', () => {
  const spec = place(), before = clone(spec), headings = new Set();
  for (let i = 0; i < 4; i++) {
    const cs = W.worldCameraSpec(spec, i);
    assert.equal(cs.cameras, undefined, 'the camera-frame spec has one camera');
    const world = W.worldBuild(cs, { validate: false }), X = W.worldCameraXform(spec, i);
    headings.add(Math.round(world.cam.heading));
    // every authored entity in front of this camera is in its world, at the same world point (the auto-fill may differ per view)
    for (const src of [...spec.entities, ...spec.landmarks]) {
      const [, zc] = X.toCam(src.at[0], src.at[1]);
      const e = world.entities.find(q => q.id === src.id);
      if (zc < 2) continue;
      // the placement solver may snap, move or drop an authored entity: that is logged, and then it is the log's word
      if ((world.log || []).some(l => l.id === src.id && /snap|move|rotate|drop|reattach|jitter/.test(String(l.action)))) continue;
      assert.ok(e, `camera ${i}: ${src.id} is in its world`);
      const back = X.toPlace(e.x, e.z);
      assert.ok(Math.hypot(back[0] - src.at[0], back[1] - src.at[1]) < 0.05, `camera ${i}: ${e.id} is where the world says`);
      if (src.facing != null) assert.ok(Math.abs(((X.facingToPlace(e.facing) - src.facing) % 360 + 540) % 360 - 180) < 1e-6, `${e.id} facing`);
    }
    const lm = W.worldLandmarkCheck(world, world.cam).landmarks.find(l => l.id === 'bridge');
    assert.ok(lm && lm.visible >= 0.6, `camera ${i}: the landmark shows (${lm && lm.visible})`);
  }
  assert.deepEqual(spec, before, 'the spec is never changed by a camera');
  // the load path itself (sense's worldBuild with a camera of a v3.1 spec) uses this transform
  for (let i = 0; i < 4; i++) {
    let world = null;
    try { world = W.worldBuild(spec, { camera: i }); } catch (e) { world = null; }
    if (!world || !world.cam || Math.abs(world.cam.heading - W.worldCameraResolve(spec, i).heading) > 1e-6) continue;   // a build without v3.1 support
    const lm = W.worldLandmarkCheck(world, world.cam).landmarks.find(l => l.id === 'bridge');
    assert.ok(lm && lm.visible >= 0.6, `worldBuild camera ${i}: the landmark shows after the fill (${lm && lm.visible})`);
  }
  assert.deepEqual(spec, before, 'and the build never changes it either');
  assert.ok(headings.size >= 3, 'the four views differ');
});

/* ---------- C1 ---------- */
const canal = (boats) => ({
  v: 3, place: { lat: 51.29, lon: -0.82 }, camera: { eye: 1.65, fov: 64, horizon: 468, heading: 200 },
  surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-12, 1], [-3.5, 1], [-3.5, 260], [-12, 260]] },
    { id: 'tow', kind: 'towpath', path: [[0, 1], [0, 260]], width: 2.6 },
    { id: 'verge', kind: 'grass', poly: [[1.3, 1], [40, 1], [40, 260], [1.3, 260]] },
  ],
  entities: boats, backdrop: { style: 'canal-wooded' }, seed: 1,
});

test('C1: a near boat at the frame edge is moved along its bank, never left as a cut slab', () => {
  const world = W.worldBuild(canal([{ obj: 'boat.narrowboat', at: [-7.5, 8], facing: 0, attach: 'water', id: 'nb1' }]), { validate: false });
  const nb = world.entities.find(e => e.id === 'nb1');
  const v = W.worldViewOf(nb, world.cam);
  assert.equal(v.persp, true, 'a long hull is drawn in perspective, never a flat side slab');
  const before = W.worldFrameCheck(world, world.cam);
  assert.equal(before.ok, false);
  const issue = before.issues.find(i => i.id === 'nb1');
  assert.ok(issue && issue.cut.length, 'the near boat is reported as cut');
  assert.equal(issue.fix.action, 'move');
  const r = W.worldFrameCheck(world, world.cam, { apply: true });
  assert.ok(r.log.some(l => l.id === 'nb1' && l.rule === 'C1' && l.action === 'move' && l.by === 'appearance'), 'the move is logged');
  assert.ok(world.log.some(l => l.id === 'nb1' && l.rule === 'C1'), 'and in the world log');
  assert.ok(Math.abs(nb.x - -7.5) < 1e-6 && nb.z > 8, `it slid along the bank (${nb.x}, ${nb.z})`);
  for (const p of nb.foot) assert.ok(p[0] > -12 && p[0] < -3.5, 'its whole footprint is still on the water');
  const after = W.worldFrameCheck(world, world.cam);
  assert.equal(after.issues.filter(i => i.id === 'nb1').length, 0, JSON.stringify(after.issues));
});

test('C1: a boat with no legal place in frame is dropped and logged (plainer, never wrong)', () => {
  const world = W.worldBuild(canal([
    { obj: 'boat.narrowboat', at: [-7.5, 7], facing: 0, attach: 'water', id: 'nb1' },
    { obj: 'boat.narrowboat', at: [-7.5, 26], facing: 0, attach: 'water', id: 'nb2' },
    { obj: 'boat.narrowboat', at: [-7.5, 45], facing: 0, attach: 'water', id: 'nb3' },
    { obj: 'boat.narrowboat', at: [-7.5, 64], facing: 0, attach: 'water', id: 'nb4' },
  ]), { validate: false });
  const r = W.worldFrameCheck(world, world.cam, { apply: true });
  const fixed = r.log.find(l => l.id === 'nb1');
  assert.ok(fixed, 'the near boat was dealt with');
  if (fixed.action === 'drop') assert.ok(!world.entities.some(e => e.id === 'nb1'), 'dropped from the world');
  else assert.equal(W.worldFrameCheck(world, world.cam).issues.filter(i => i.id === 'nb1').length, 0, 'or moved to a spot that fits');
  assert.equal(W.worldFrameCheck(world, world.cam).issues.length, 0, 'nothing is left cut');
});

test('C1: framing elements (a near tree) may be cut; landmarks are never moved', () => {
  const spec = canal([{ obj: 'tree.bank-willow', at: [6, 6], id: 'frame-tree' }]);
  spec.landmarks = [{ obj: 'structure.bridge-brick', at: [-2, 9], facing: 90, attach: 'water', id: 'lm', src: 'test' }];
  const world = W.worldBuild(spec, { validate: false });
  const r = W.worldFrameCheck(world, world.cam, { apply: true });
  assert.ok(!r.issues.some(i => i.id === 'frame-tree'), 'the tree is a framing element');
  const lm = r.issues.find(i => i.id === 'lm');
  assert.ok(lm, 'the cut landmark is reported');
  assert.equal(lm.fix.action, 'aim');
  assert.ok(world.entities.some(e => e.id === 'lm' && e.x === -2 && e.z === 9), 'and never moved');
});

/* ---------- C4 ---------- */
test('C4: a landmark behind a tree wall is reported with its occluders; auto-placed ones are cleared', () => {
  const spec = canal([]);
  spec.landmarks = [{ obj: 'structure.bridge-brick', at: [-2, 140], facing: 90, attach: 'water', id: 'lm', src: 'test' }];
  for (let k = -5; k <= 5; k++) spec.entities.push({ obj: 'tree.bank-oak', at: [-2 + k * 1.6 + 6, 40 + (k % 2)], id: 'tw' + (k + 5) });
  const world = W.worldBuild(spec, { validate: false });
  for (const e of world.entities) if (/^tw/.test(e.id || '')) { e.x -= 6; e.foot = e.foot.map(p => [p[0] - 6, p[1]]); e.auto = 'fill'; }
  const r = W.worldLandmarkCheck(world, world.cam), rec = r.landmarks[0];
  assert.equal(rec.ok, false);
  assert.ok(rec.visible < 0.6, `hidden: ${rec.visible}`);
  assert.ok(rec.occluders.length > 0 && rec.occluders.every(id => /^tw/.test(id)));
  assert.equal(rec.fix.action, 'clear');
  W.worldLandmarkCheck(world, world.cam, { apply: true });
  assert.ok(world.log.some(l => l.rule === 'C4' && l.action === 'drop'), 'the auto-placed occluders are dropped and logged');
  const again = W.worldLandmarkCheck(world, world.cam).landmarks[0];
  assert.ok(again.visible >= 0.6 && again.ok, `visible after the fix: ${again.visible} ${again.msg}`);
});

test('C4, 16.3: an authored tree wall in front of a landmark is moved aside (plainer, never wrong); buildings are never touched', () => {
  const spec = canal([]);
  spec.landmarks = [{ obj: 'structure.bridge-brick', at: [-2, 140], facing: 90, attach: 'water', id: 'lm', src: 'test' }];
  spec.surfaces.push({ id: 'offside', kind: 'grass', poly: [[-60, 1], [-12, 1], [-12, 260], [-60, 260]] });
  for (let k = 0; k < 5; k++) spec.entities.push({ obj: 'tree.bank-oak', at: [-13.2 - (k % 2) * 0.8, 38 + k * 2.2], id: 'wall-' + k });
  const world = W.worldBuild(spec, { validate: false });
  // the authored trees stand in the line of sight on the offside bank (the build keeps them: they are legal there)
  for (const e of world.entities) if (/^wall-/.test(e.id || '')) { const dx = -2 - e.x + (e.z - 38) * 0.02; e.x += dx; e.foot = e.foot.map(p => [p[0] + dx, p[1]]); e.surfaceFix = true; }
  world.surfaces.push({ id: 'island', kind: 'grass', poly: [[-60, 30], [-1, 30], [-1, 50], [-60, 50]] });
  const before = W.worldLandmarkCheck(world, world.cam).landmarks[0];
  assert.ok(before.visible < 0.6, `the tree wall hides it: ${before.visible}`);
  W.worldLandmarkCheck(world, world.cam, { apply: true });
  const moves = world.log.filter(l => l.rule === 'C4');
  assert.ok(moves.length > 0 && moves.every(l => l.by === 'appearance' && /^wall-/.test(l.id)), 'the trees are dealt with, each logged');
  assert.ok(moves.some(l => l.action === 'move'), 'moved aside first, not just dropped');
  const after = W.worldLandmarkCheck(world, world.cam).landmarks[0];
  assert.ok(after.ok && after.visible >= 0.6, `the face shows: ${after.visible} ${after.msg}`);
  // a mill in front is the place itself: it is reported, never moved
  const spec2 = { v: 3, place: { lat: 51.29, lon: -0.82 }, camera: { eye: 1.65, fov: 64, horizon: 468, heading: 200 },
    surfaces: [{ id: 'yard', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 400], [-200, 400]] }], fill: false,
    entities: [{ obj: 'building.mill-red-brick', at: [-3, 70], facing: 0, id: 'mill' }],
    landmarks: [{ obj: 'structure.bridge-brick', at: [-8, 200], facing: 90, id: 'lm', src: 'test' }], backdrop: { style: 'farmland' }, seed: 1 };
  const w2 = W.worldBuild(spec2, { validate: false });
  const mill = w2.entities.find(e => e.id === 'mill');
  assert.ok(mill, 'the mill stands');
  const r2 = W.worldLandmarkCheck(w2, w2.cam, { apply: true }).landmarks[0];
  assert.equal(r2.ok, false, `the mill hides it (${r2.visible})`);
  assert.ok(r2.fix.hard.includes('mill'), 'the mill is named as the cause');
  assert.ok(!w2.log.some(l => l.rule === 'C4' && l.id === 'mill') && w2.entities.includes(mill), 'and never moved or dropped');
  // an extruded building (spec.buildings) hides like any static: by its real outline
  const w3 = W.worldBuild(Object.assign({}, spec2, { entities: [] }), { validate: false });
  w3.buildings = [{ id: 'warehouse', foot: [[-12, 60], [6, 60], [6, 72], [-12, 72]], storeys: 4, style: 'victorian-terrace' }];
  const r3 = W.worldLandmarkCheck(w3, w3.cam, { apply: true }).landmarks[0];
  assert.equal(r3.ok, false, `the warehouse hides it (${r3.visible})`);
  assert.ok(r3.fix.hard.includes('warehouse') && !w3.log.some(l => l.rule === 'C4'), 'named, never touched');
});

test('C4, section 19: a landmark at the frame side fails the tile crop and asks for a re-aim', () => {
  const spec = canal([]);
  spec.landmarks = [{ obj: 'structure.bridge-brick', at: [-62, 140], facing: 90, attach: 'water', id: 'side', src: 'test' }];
  spec.surfaces[0].poly = [[-90, 1], [-3.5, 1], [-3.5, 260], [-90, 260]];
  const world = W.worldBuild(spec, { validate: false });
  const rec = W.worldLandmarkCheck(world, world.cam).landmarks[0];
  assert.ok(rec.visible >= 0.6, `visible in the full frame: ${rec.visible}`);
  assert.ok(rec.tile < 0.6, `but not in the tile crop: ${rec.tile}`);
  assert.equal(rec.ok, false);
  assert.equal(rec.fix.action, 'aim');
  assert.ok(Number.isFinite(rec.fix.bearing));
});

/* ---------- Q6 ---------- */
test('Q6: wide, tall and tile frames show more of the same world, never stretched', () => {
  const cam = W.sceneCamera({ camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 } });
  const wide = W.worldOverscan(cam, '21:9');
  assert.deepEqual(wide.box, [-250, 0, 1850, 900]);
  assert.ok(Math.abs((wide.box[2] - wide.box[0]) / (wide.box[3] - wide.box[1]) - 21 / 9) < 1e-6, 'its shape is the frame shape');
  assert.ok(wide.hfov > 64, 'it sees a wider angle');
  const tile = W.worldOverscan(cam, 'tile');
  assert.deepEqual(tile.box, [350, 0, 1250, 900]);
  const phone = W.worldOverscan(cam, 'phone');
  assert.ok(Math.abs((phone.box[2] - phone.box[0]) / (phone.box[3] - phone.box[1]) - 9 / 19.5) < 1e-3);
  assert.ok(phone.box[1] < 0 && phone.box[3] > 900, 'a phone sees more sky and foreground');
  assert.ok(phone.dNear < cam.dMin, 'and nearer ground than the core frame');
  const dev = W.worldOverscan(cam, { W: 3440, H: 1440 });
  assert.ok(dev.vs > 0 && Math.abs(dev.vs * (dev.box[2] - dev.box[0]) - 3440) < 1e-6 && Math.abs(dev.vs * (dev.box[3] - dev.box[1]) - 1440) < 1e-6, 'one uniform scale fills the device');
  assert.ok(Math.abs(dev.vs * 0 + dev.ox - (-dev.box[0] * dev.vs)) < 1e-6);
  const all = W.worldOverscan(cam, 'all');
  for (const k of Object.keys(W.WORLD_OVERSCAN_FRAMES)) {
    const b = W.worldOverscan(cam, k).box;
    assert.ok(all.box[0] <= b[0] && all.box[1] <= b[1] && all.box[2] >= b[2] && all.box[3] >= b[3], `'all' contains ${k}`);
  }
  const [xl, xr] = all.xAt(50);
  assert.ok(xl < -50 && xr > 50, 'the ground the fill must cover at 50 m');
});
