// World engine module E (docs/dev/WORLD_ENGINE.md 2.4-2.7, 8.5): shadows, reflections, night lights, backdrops, coverage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['worldBackdrop', 'worldBackdropGround', 'worldBackdropValidate', 'worldCoverage', 'worldEntityBox', 'WORLD_BACKDROP_STYLES',
  'worldSunOf', 'worldShadowPlan', 'worldReflectPlan', 'worldWaterLevel', 'worldLights', 'worldHazePlan', 'sceneCamera', 'sceneProject', 'sceneObj', 'sceneRenderPassList'];
globalThis.__WL = null;
loadScenes(ROOT, { fixtures: false, browser: true, extra: `\n;globalThis.__WL = { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };` });
const W = globalThis.__WL;

// the three test cameras (WORLD_ENGINE 8.8)
const CAMS = {
  canal: W.sceneCamera({ camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 } }),
  pond: W.sceneCamera({ camera: { eye: 1.8, fov: 60, horizon: 440, heading: 300 } }),
  kelham: W.sceneCamera({ camera: { eye: 1.65, fov: 66, horizon: 470, heading: 20 } }),
};
const canalWorld = (cam, style) => ({
  cam, seed: 2, backdrop: { style },
  surfaces: [
    { id: 'verge', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 170], [-200, 170]] },
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-30, 3], [6, 3], [40, 160], [10, 170]] },
    { id: 'tow', kind: 'towpath', path: [[8, 1], [14, 60], [44, 170]], width: 2.4 },
    { id: 'hedge', kind: 'hedge', path: [[-60, 4], [-34, 60], [-20, 170]], width: 1.5 },
  ],
  entities: [
    ...Array.from({ length: 18 }, (_, i) => ({ id: 't' + i, obj: i % 2 ? 'tree.canal-willow' : 'tree.bank-oak', x: (i % 2 ? -1 : 1) * (14 + (i * 7) % 30), z: 8 + i * 9, facing: 0 })),
    ...Array.from({ length: 30 }, (_, i) => ({ id: 'g' + i, obj: 'plant.towpath-hedge', x: 20 + (i % 6) * 6, z: 2 + Math.floor(i / 6) * 3, facing: 90 })),
    ...Array.from({ length: 30 }, (_, i) => ({ id: 'h' + i, obj: 'plant.hedgerow-blackberry', x: -6 - (i % 6) * 6, z: 2 + Math.floor(i / 6) * 3, facing: 90 })),
  ],
  life: [{ who: 'walkers', on: 'tow' }],
});

test('every backdrop preset uses library objects only', () => {
  for (const [k, st] of Object.entries(W.WORLD_BACKDROP_STYLES)) for (const b of st.bands) for (const id of b.objs) assert.ok(W.sceneObj(id), `${k}: ${id}`);
});

test('every backdrop style passes worldCoverage for the three test cameras; no backdrop fails', () => {
  for (const [cn, cam] of Object.entries(CAMS)) {
    for (const style of Object.keys(W.WORLD_BACKDROP_STYLES)) {
      const r = W.worldCoverage(canalWorld(cam, style), cam);
      assert.ok(r.ok, `${cn} / ${style}: ${r.msg}`);
      const open = canalWorld(cam, style); open.entities = open.entities.filter(e => !/^t/.test(e.id));
      const r2 = W.worldCoverage(open, cam);                 // the backdrop alone closes the horizon
      assert.ok(r2.ok, `${cn} / ${style} without near trees: ${r2.msg}`);
    }
    const bare = canalWorld(cam, 'woodland'); bare.backdrop = null; bare.entities = bare.entities.filter(e => !/^t/.test(e.id));   // near trees hide the horizon: a real scene, not an empty one
    const r = W.worldCoverage(bare, cam);
    assert.equal(r.ok, false, cn + ' without a backdrop must be bare'); assert.equal(r.rule, 'emptyBackground'); assert.ok(r.regions.length && r.regions[0].name);
  }
});

test('backdrop: world metres, seeded, beyond the scene; skyline at its bearing and distance; validator', () => {
  const cam = CAMS.canal, w = canalWorld(cam, 'canal-wooded');
  w.backdrop.skyline = [{ obj: 'building.church', bearing: 70 + 10, dist: 1500, src: 'OS map' }, { obj: 'building.church', bearing: 70 + 180, dist: 900, src: 'OS map' }];
  const a = W.worldBackdrop(w, cam, 'summer'), b = W.worldBackdrop(w, cam, 'summer');
  assert.deepEqual(a, b);
  assert.ok(a.length > 30 && a.length < 400, 'count ' + a.length);
  for (const e of a) { assert.ok(e.z >= 170, e.id + ' z ' + e.z); assert.ok(!('X' in e) && !('s' in e) && !('layer' in e)); }
  const sky = a.filter(e => e.skyline);
  assert.equal(sky.length, 1, 'the one behind the camera is dropped');
  assert.ok(Math.abs(Math.hypot(sky[0].x, sky[0].z) - 1500) < 0.2 && sky[0].x > 0);
  assert.deepEqual(W.worldBackdropValidate({ style: 'woodland' }), []);
  const errs = W.worldBackdropValidate({ style: 'nope', scale: 2, skyline: [{ obj: 'x.none', bearing: 1, dist: 5, Y: 3 }] }).map(e => e.rule);
  for (const r of ['unknownStyle', 'screenOrLookField', 'unknownSize', 'badBackdrop']) assert.ok(errs.includes(r), r + ' in ' + errs);
  assert.equal(W.worldBackdropValidate(null)[0].rule, 'emptyBackground');
});

test('a heron, a post and a boat each reflect about their own waterline; a bank tree at the bank edge; none outside water', () => {
  const cam = CAMS.canal;
  const world = { cam, surfaces: [{ id: 'pond', kind: 'water', water: 'pond', level: 0, poly: [[-40, 6], [40, 6], [40, 60], [-40, 60]] }],
    entities: [
      { id: 'heron', obj: 'bird.heron', x: -5, z: 20, attach: 'ground' },
      { id: 'post', obj: 'street.bollard', x: 3, z: 15 },
      { id: 'boat', obj: 'boat.narrowboat', x: 8, z: 30, attach: 'water', facing: 90 },
      { id: 'tree', obj: 'tree.bank-oak', x: 12, z: 61.2 },
      { id: 'inland', obj: 'tree.bank-oak', x: 0, z: 100 },
      { id: 'side', obj: 'tree.bank-oak', x: 200, z: 30 },
    ] };
  const plan = W.worldReflectPlan(world, cam), by = Object.fromEntries(plan.map(r => [r.ref, r]));
  for (const id of ['heron', 'post', 'boat']) {
    const e = world.entities.find(x => x.id === id), row = W.sceneProject(cam, e.x, e.z, 0).Y;
    assert.ok(by[id], id + ' reflects');
    assert.ok(Math.abs(by[id].rowY - row) <= 1, `${id} row ${by[id].rowY} vs ${row}`);
    assert.ok(Math.abs(by[id].artClipY - row) <= 1, id + ' clip row');
  }
  const edge = W.sceneProject(cam, 12, 60, 0).Y;
  assert.ok(by.tree, 'bank tree reflects');
  assert.ok(Math.abs(by.tree.rowY - edge) <= 1 && Math.abs(by.tree.start - edge) <= 1, `tree ${by.tree.rowY} start ${by.tree.start} vs edge ${edge}`);
  assert.ok(!by.inland && !by.side, 'no reflection away from the water');
  for (const r of plan) {
    const ys = r.clip.map(p => p[1]);
    assert.ok(r.start >= Math.min(...ys) - 1e-6 && r.start <= Math.max(...ys) + 1e-6, r.ref + ' starts inside the water');
  }
  // a mover is planned the same way, per frame
  const m = W.worldReflectPlan(world, cam, { agents: [{ id: 'duck', obj: 'bird.mallard', x: 0, z: 12, attach: 'water' }] }).find(r => r.ref === 'duck');
  assert.ok(m && m.mover && Math.abs(m.rowY - W.sceneProject(cam, 0, 12, 0).Y) <= 1);
});

test('shadow direction rotates with the sun azimuth across a day; floaters cast none; water is cut out', () => {
  const cam = CAMS.canal;
  const world = { cam, surfaces: [{ id: 'w', kind: 'water', water: 'canal', poly: [[-4, 5], [-1, 5], [-1, 80], [-4, 80]] }],
    entities: [{ id: 'tree', obj: 'tree.oak', x: 0, z: 30 }, { id: 'boat', obj: 'boat.narrowboat', x: -2.5, z: 20, attach: 'water' }] };
  let last = null;
  for (let az = 90; az <= 270; az += 30) {
    const plan = W.worldShadowPlan(world, cam, { az, alt: 30 });
    assert.ok(!plan.some(s => s.ref === 'boat' && s.kind === 'cast'));
    const c = plan.find(s => s.ref === 'tree' && s.kind === 'cast');
    assert.ok(c, 'cast at az ' + az);
    const ang = Math.atan2(c.dir[0], c.dir[1]) * 180 / Math.PI;                  // the ground way, camera frame (0 = away)
    const want = ((az + 180 - cam.heading) % 360 + 540) % 360 - 180;
    assert.ok(Math.abs(((ang - want) % 360 + 540) % 360 - 180) < 1, `az ${az}: ${ang} vs ${want}`);
    if (last != null) assert.notEqual(Math.round(ang), Math.round(last));
    last = ang;
    if (Math.abs(want - -90) < 50) assert.ok(c.cutWater.includes('w'), 'a westward shadow at az ' + az + ' touches the canal');
  }
  assert.equal(W.worldShadowPlan(world, cam, { az: 180, alt: -10 }).filter(s => s.kind === 'cast').length, 0, 'no cast after sunset');
  assert.ok(W.worldShadowPlan(world, cam, { az: 180, alt: -10 }).some(s => s.kind === 'contact' && s.ref === 'tree'), 'contact shadows always');
});

test('a night render lights only library glow parts', () => {
  const world = { entities: [
    { id: 'lamp', obj: 'street.lamp', x: 2, z: 10, y: 0 }, { id: 'house', obj: 'building.terrace-victorian', x: -10, z: 40, y: 0 },
    { id: 'nb', obj: 'boat.narrowboat', x: 0, z: 20, y: 0, attach: 'water' }, { id: 'oak', obj: 'tree.oak', x: 5, z: 30, y: 0 }] };
  const night = W.worldLights(world, { night: true }), day = W.worldLights(world, { night: false });
  assert.ok(!night.some(l => l.ref === 'oak'), 'a tree has no glow part');
  assert.ok(night.length && night.every(l => Number.isInteger(l.part) && l.kind));
  assert.ok(night.some(l => l.ref === 'lamp' && l.on && l.pool), 'the lamp is lit with a pool');
  const win = night.filter(l => l.ref === 'house');
  assert.ok(win.some(l => l.on) && win.some(l => !l.on), 'windows switch per window');
  assert.ok(night.filter(l => l.ref === 'house').every(l => l.y > 0 && l.y < 12), 'window heights inside the building');
  assert.equal(day.filter(l => l.on).length, 0, 'nothing lit by day');
  assert.deepEqual(W.worldLights(world, { night: true }), night, 'seeded');
});

test('haze grows with depth; the pass is registered', () => {
  const cam = CAMS.canal, h = W.worldHazePlan({ entities: [{ obj: 'tree.oak', x: 0, z: 10 }, { obj: 'tree.oak', x: 0, z: 3000 }] }, cam, null);
  assert.ok(h[1] > h[0]);
  assert.ok(W.sceneRenderPassList().some(p => p.id === 'world-light'));
});
