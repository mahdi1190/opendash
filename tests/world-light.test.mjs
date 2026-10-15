// World engine, package look (docs/dev/WORLD_ENGINE.md 2.4, 2.6, 2.7, 11.2; requirements L1, L2, L4, L5, V4, B1, B2, C5,
// section 19): the sky from the almanac, shadows (one direction, never on water, thin things, decks, bridges, weather), night
// lights from glow parts by the sun's elevation, glitter, haze, the backdrop bands (yield, look, overscan) and coverage.
// The per-entity reflection plan of the first pass is retired: reflections come from the water surface (world-water.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { sceneSourceFiles } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// the look package on its own over the v2 scene engine (other world packages are reached through typeof guards)
const LOOK = ['79-world-4backdrop.js', '79-world-4light.js', '79-world-4material.js', '79-world-4water.js'];
const NAMES = ['worldBackdrop', 'worldBackdropGround', 'worldBackdropValidate', 'worldBackdropYield', 'worldBackdropLook', 'worldCoverage', 'worldEntityBox', 'WORLD_BACKDROP_STYLES',
  'worldSkyOf', 'worldSunOf', 'worldShadowPlan', 'worldShadeAt', 'worldWaterLevel', 'worldLights', 'worldGlitterPlan', 'worldHazePlan', 'worldLookOf', 'worldLightTick',
  'worldReflectPlan', 'worldWaterPlan', 'worldDither', 'worldDitherGradient', 'sceneCamera', 'sceneProject', 'sceneObj', 'sceneRenderPassList', 'almSunPosition'];
const files = sceneSourceFiles(ROOT, { browser: true, fixtures: false }).filter(f => !/79-world-/.test(f.split(/[\\/]/).pop())).concat(LOOK.map(f => join(ROOT, 'src', 'app', f)));
const body = files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + `\n;return { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
const W = new vm.Script('(function () {\n' + body + '\n})', { filename: 'look-bundle.js' }).runInThisContext()();

const FLEET = { lat: 51.28, lon: -0.84 };
const at = (y, m, d, h, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const ctxAt = (ms, o = {}) => Object.assign({ ms, lat: FLEET.lat, lon: FLEET.lon, weather: 'clear' }, o);
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
const ang = (v) => Math.atan2(v[0], v[1]) * 180 / Math.PI;
const angDiff = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

/* ---------- the retired plan ---------- */
test('the per-entity reflection plan is retired (reflections come from the water surface)', () => {
  assert.equal(W.worldReflectPlan, undefined);
  assert.equal(typeof W.worldWaterPlan, 'function');
});

/* ---------- the sky (L1, V4) ---------- */
test('worldSkyOf: sun and moon from the almanac; night, dawn, golden, day, noon, golden, dusk, night through a June day at Fleet', () => {
  const seq = [];
  for (let m = 0; m < 24 * 60; m += 10) {
    const S = W.worldSkyOf(ctxAt(at(2026, 6, 21, 0) + m * 60000));
    if (seq[seq.length - 1] !== S.phase) seq.push(S.phase);
  }
  assert.deepEqual(seq, ['night', 'dawn', 'golden', 'day', 'noon', 'day', 'golden', 'dusk', 'night'], seq.join(' > '));
  const noon = W.worldSkyOf(ctxAt(at(2026, 6, 21, 12, 5))), gold = W.worldSkyOf(ctxAt(at(2026, 6, 21, 19, 45))), night = W.worldSkyOf(ctxAt(at(2026, 6, 21, 23, 30)));
  const sun = W.almSunPosition(at(2026, 6, 21, 12, 5), FLEET.lat, FLEET.lon);
  assert.ok(Math.abs(noon.sun.alt - sun.alt) < 1e-9 && Math.abs(noon.sun.az - sun.az) < 1e-9, 'the almanac sun');
  assert.ok(noon.sun.alt > 55 && noon.sun.alt < 65, 'midsummer noon at 51 N: ' + noon.sun.alt);
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [nr, , nb] = rgb(noon.sunCol), [gr, , gb] = rgb(gold.sunCol);
  assert.ok(nb / nr > 0.85, 'noon light is near white ' + noon.sunCol);
  assert.ok(gb / gr < 0.75, 'golden hour light is warm ' + gold.sunCol);
  assert.ok(night.dark > 0.6 && night.sunK === 0 && noon.sunK > 0.5 && noon.dark === 0, 'night is dark and sunless');
  assert.ok(gold.golden > 0.3 && noon.golden === 0);
  assert.equal(noon.band, 'day'); assert.equal(gold.band, 'golden'); assert.equal(night.band, 'night');
  // morning sun in the east, evening sun in the west; the moon is placed too
  assert.ok(W.worldSkyOf(ctxAt(at(2026, 6, 21, 6))).sun.az < 180 && gold.sun.az > 180);
  assert.ok(Number.isFinite(night.moon.alt) && night.moon.illum >= 0 && night.moon.illum <= 1);
  // winter: a low noon sun, still a noon phase near solar noon
  const jan = W.worldSkyOf(ctxAt(at(2026, 1, 15, 12, 4)));
  assert.equal(jan.phase, 'noon'); assert.ok(jan.sun.alt < 20 && jan.sun.alt > 15, 'January noon ' + jan.sun.alt);
  // overcast and fog
  const grey = W.worldSkyOf(ctxAt(at(2026, 6, 21, 12, 5), { weather: 'cloud' })), fog = W.worldSkyOf(ctxAt(at(2026, 6, 21, 12, 5), { weather: 'fog' }));
  assert.ok(grey.overcast > 0.5 && grey.sunK < noon.sunK * 0.6, 'overcast takes the direct sun');
  assert.ok(fog.fog === 1 && fog.fogV > 0 && fog.fogV < 400);
  // the live forecast (the app's sky record) and an override come through; nothing given is clear
  const ms = at(2026, 6, 21, 12, 5), live = W.worldSkyOf(ctxAt(ms, { weather: undefined, sky: { ms, lat: FLEET.lat, lon: FLEET.lon, wx: { cond: 'rain', temp: 9, wind: 12 } } }));
  assert.ok(live.weather === 'rain' && live.rain && live.cover > 0.8, 'live rain: ' + live.weather);
  assert.equal(W.worldSkyOf(ctxAt(ms, { weather: undefined, wx: 'snow' })).weather, 'snow');
  assert.equal(W.worldSkyOf(ctxAt(ms, { weather: undefined })).weather, 'clear');
});

/* ---------- shadows (L2, L5, section 19) ---------- */
const shadowWorld = (cam) => ({ cam,
  surfaces: [{ id: 'grass', kind: 'grass', poly: [[-60, 1], [60, 1], [60, 120], [-60, 120]] }, { id: 'w', kind: 'water', water: 'canal', poly: [[-14, 5], [-4, 5], [-4, 90], [-14, 90]] }],
  entities: [
    { id: 'tree', obj: 'tree.oak', x: 0, z: 30, y: 0 }, { id: 'tree2', obj: 'tree.bank-oak', x: 8, z: 22, y: 0 }, { id: 'lamp', obj: 'street.lamp', x: 4, z: 14, y: 0 },
    { id: 'boat', obj: 'boat.narrowboat', x: -9, z: 20, y: -0.3, attach: 'water' },
    { id: 'heron', obj: 'bird.heron', x: -6, z: 12, y: 0 },
  ] });
test('shadows rotate with the sun over a day, share ONE direction, and never fall on water', () => {
  const cam = CAMS.canal, world = shadowWorld(cam);
  let last = null, turned = 0, nCast = 0, onLand = 0;
  for (let h = 5; h <= 19; h++) {
    const sky = W.worldSkyOf(ctxAt(at(2026, 6, 21, h)));
    const plan = W.worldShadowPlan(world, cam, sky), casts = plan.filter(s => s.kind === 'cast');
    assert.ok(!plan.some(s => s.ref === 'boat'), 'a floater casts nothing (the water dims instead)');
    if (sky.sun.alt < 2) continue;
    assert.ok(casts.length >= 3, 'casts at ' + h + ' h');
    const a0 = ang(casts[0].dir);
    for (const c of casts) assert.ok(angDiff(ang(c.dir), a0) < 1e-6, `one direction at ${h} h: ${c.ref} ${ang(c.dir)} vs ${a0}`);
    const want = ((sky.sun.az + 180 - cam.heading) % 360 + 540) % 360 - 180;     // away from the sun, camera frame
    assert.ok(angDiff(a0, want) < 1, `${h} h: ${a0} vs ${want}`);
    if (last != null && angDiff(a0, last) > 3) turned++;
    last = a0;
    // never on water: every sample point inside a shadow and inside the canal lies in one of its holes; shade reads 0 there
    for (const s of plan) {
      const xs = s.poly.map(p => p[0]), zs = s.poly.map(p => p[1]);
      for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
        const x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * (i + 0.5) / 13, z = Math.min(...zs) + (Math.max(...zs) - Math.min(...zs)) * (j + 0.5) / 13;
        if (Math.abs(x + 14) < 0.02 || Math.abs(x + 4) < 0.02 || Math.abs(z - 5) < 0.02) continue;      // on the bank line itself
        const inPoly = W.worldShadeAt([Object.assign({}, s, { holes: [] })], x, z) > 0, wet = x > -14 && x < -4 && z > 5 && z < 90;
        if (!inPoly) continue;
        nCast++;
        if (wet) assert.equal(W.worldShadeAt([s], x, z), 0, `${s.ref} ${s.kind} shades water at (${x.toFixed(1)}, ${z.toFixed(1)}) at ${h} h`);
        else if (W.worldShadeAt([s], x, z) > 0) onLand++;
      }
    }
  }
  assert.ok(turned >= 8, 'the direction turns through the day: ' + turned);
  assert.ok(nCast > 100 && onLand > 50, 'shadows do fall on the land');
  const night = W.worldShadowPlan(world, cam, W.worldSkyOf(ctxAt(at(2026, 6, 21, 23, 30), { moon: { alt: -10, az: 0, illum: 0 } })));
  assert.equal(night.filter(s => s.kind === 'cast').length, 0, 'no cast at night without a bright moon');
  assert.ok(night.some(s => s.kind === 'contact' && s.ref === 'tree'), 'contact shadows always');
  // a westward evening shadow of the heron by the canal is cut where it crosses the water
  const heronCut = W.worldShadowPlan(world, cam, { az: 100, alt: 8 }).filter(s => s.ref === 'heron');
  assert.ok(heronCut.some(s => s.holes.length && s.holes[0].surface === 'w' && s.holesScr.length), 'the water part is a hole');
});

test('overcast flattens shadows and fog fades them with depth; thin things cast from their outline', () => {
  const cam = CAMS.canal, ms = at(2026, 6, 21, 15);
  const world = { cam, surfaces: [], entities: [{ id: 'near', obj: 'tree.oak', x: 0, z: 15, y: 0 }, { id: 'far', obj: 'tree.oak', x: 0, z: 200, y: 0 }, { id: 'rail', obj: 'street.railing', x: 3, z: 10, y: 0, facing: 90 }].filter(e => W.sceneObj(e.obj)) };
  const clear = W.worldShadowPlan(world, cam, W.worldSkyOf(ctxAt(ms))).filter(s => s.kind === 'cast');
  const grey = W.worldShadowPlan(world, cam, W.worldSkyOf(ctxAt(ms, { weather: 'cloud' }))).filter(s => s.kind === 'cast');
  const fog = W.worldShadowPlan(world, cam, W.worldSkyOf(ctxAt(ms, { weather: 'fog' }))).filter(s => s.kind === 'cast');
  const op = (P, id) => (P.find(s => s.ref === id) || { op: 0 }).op, blur = (P, id) => (P.find(s => s.ref === id) || { blur: 0 }).blur;
  assert.ok(op(grey, 'near') < op(clear, 'near') * 0.7 && blur(grey, 'near') > blur(clear, 'near'), 'overcast: fainter and softer');
  assert.ok(op(fog, 'far') < op(fog, 'near') * 0.5, 'fog fades the far shadow');
  assert.ok(op(fog, 'near') < op(clear, 'near'));
  const rail = clear.find(s => s.ref === 'rail');
  if (rail) { assert.ok(rail.thin && rail.sil, 'a railing casts its outline'); assert.ok(rail.op < op(clear, 'near'), 'see-through: lighter'); }
  const lamp = W.worldShadowPlan({ cam, surfaces: [], entities: [{ id: 'l', obj: 'street.lamp', x: 0, z: 10, y: 0 }] }, cam, W.worldSkyOf(ctxAt(ms))).find(s => s.kind === 'cast');
  assert.ok(lamp && lamp.thin && lamp.sil, 'a lamp post is thin');
});

test('movers: shadows only while visible; a walker on a moving boat casts onto the deck; a bridge shades what is beneath', () => {
  const cam = CAMS.canal, sky = W.worldSkyOf(ctxAt(at(2026, 6, 21, 14)));
  const world = { cam, surfaces: [{ id: 'cut', kind: 'water', water: 'canal', poly: [[-20, 4], [20, 4], [20, 80], [-20, 80]] }],
    entities: [{ id: 'bridge', obj: 'structure.footbridge', cls: 'walkway', x: 0, z: 40, y: 0, height: 5, foot: [[-12, 38.5], [12, 38.5], [12, 41.5], [-12, 41.5]],
      deck: { poly: [[-12, 38.5], [12, 38.5], [12, 41.5], [-12, 41.5]], y: 3 } }] };
  const walker = { id: 'w1', obj: 'person.walker', x: 2, z: 20, y: 1.6, attach: 'deck:nb1', height: 1.7 };
  const p1 = W.worldShadowPlan(world, cam, sky, { agents: [walker], statics: false }).filter(s => s.ref === 'w1');
  assert.ok(p1.length >= 1 && p1.every(s => s.on === 'deck:nb1' && s.y === 1.6 && s.holes.length === 0), 'onto the deck, over the water, not cut');
  const p2 = W.worldShadowPlan(world, cam, sky, { agents: [Object.assign({}, walker, { x: 4 })], statics: false }).filter(s => s.ref === 'w1');
  assert.ok(Math.abs(p2[0].poly[0][0] - p1[0].poly[0][0] - 2) < 1e-6, 'the shadow moves with the mover');
  assert.equal(W.worldShadowPlan(world, cam, sky, { agents: [Object.assign({}, walker, { visible: false })], statics: false }).length, 0, 'hidden: no shadow');
  assert.equal(W.worldShadowPlan(world, cam, sky, { agents: [Object.assign({}, walker, { x: 400 })], statics: false }).length, 0, 'off screen: no shadow');
  const plan = W.worldShadowPlan(world, cam, sky), deck = plan.find(s => s.ref === 'bridge' && s.kind === 'deck');
  assert.ok(deck, 'the bridge deck casts its slab');
  assert.ok(deck.holes.length > 0, 'over the canal its shade is a hole (the water dims)');
  const land = { cam, surfaces: [], entities: world.entities };
  const dplan = W.worldShadowPlan(land, cam, sky), d2 = dplan.find(s => s.kind === 'deck');
  const cx = d2.poly.reduce((a, p) => a + p[0], 0) / d2.poly.length, cz = d2.poly.reduce((a, p) => a + p[1], 0) / d2.poly.length;
  assert.ok(W.worldShadeAt(dplan, cx, cz) > 0.2, 'a point under the bridge on land is in shade');
});

/* ---------- night lights (L4) ---------- */
test('night lights only from glow parts; windows light one by one by the sun elevation; vehicles carry head and tail lights', () => {
  const world = { entities: [
    { id: 'lamp', obj: 'street.lamp', x: 2, z: 10, y: 0 }, { id: 'house', obj: 'building.terrace-victorian', x: -10, z: 40, y: 0 },
    { id: 'nb', obj: 'boat.narrowboat', x: 0, z: 20, y: 0, attach: 'water' }, { id: 'oak', obj: 'tree.oak', x: 5, z: 30, y: 0 },
    { id: 'parked', obj: 'vehicle.car', x: 8, z: 18, y: 0, facing: 90 }] };
  const night = W.worldLights(world, { night: true }), day = W.worldLights(world, { night: false });
  assert.ok(!night.some(l => l.ref === 'oak'), 'a tree has no glow part');
  assert.ok(night.length && night.every(l => Number.isInteger(l.part) && l.kind));
  assert.ok(night.some(l => l.ref === 'lamp' && l.on && l.pool), 'the lamp is lit with a pool');
  const win = night.filter(l => l.ref === 'house');
  assert.ok(win.some(l => l.on) && win.some(l => !l.on), 'windows switch per window');
  assert.ok(win.every(l => l.y > 0 && l.y < 12), 'window heights inside the building');
  assert.equal(day.filter(l => l.on).length, 0, 'nothing lit by day');
  assert.ok(!night.some(l => l.ref === 'parked' && l.on), 'a parked car stays dark');
  assert.deepEqual(W.worldLights(world, { night: true }), night, 'seeded');
  // by the sun's elevation through dusk: more windows as the sun sinks, none at noon, never all at once
  const lit = (ms) => W.worldLights(world, { sky: W.worldSkyOf(ctxAt(ms)) }).filter(l => l.ref === 'house' && l.on).length;
  const counts = [[21, 0], [21, 30], [22, 0], [23, 0]].map(([h, m]) => lit(at(2026, 6, 21, h, m)));
  assert.equal(lit(at(2026, 6, 21, 12)), 0, 'no lit windows at noon');
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1] - 2, 'lighting up through dusk ' + counts);
  assert.ok(counts[0] < win.length && counts[counts.length - 1] > counts[0], 'one by one: ' + counts);
  // a moving car (an agent) at night: head lamps with a beam and tail lights; a tram's windows lit
  const car = { id: 'a1', obj: 'vehicle.car', x: 0, z: 12, y: 0, facing: 90, heading: 90 }, tram = { id: 'a2', obj: 'vehicle.supertram', x: -5, z: 30, y: 0, facing: 90 };
  const L = W.worldLights({ entities: [] }, { sky: W.worldSkyOf(ctxAt(at(2026, 12, 15, 21))), agents: [car, tram] });
  assert.ok(L.some(l => l.ref === 'a1' && l.kind === 'head' && l.on && l.beam), 'head lamps and their beam');
  assert.ok(L.some(l => l.ref === 'a1' && l.kind === 'tail' && l.on), 'tail lights');
  assert.ok(L.filter(l => l.ref === 'a2' && l.kind === 'window').every(l => l.on), 'a tram is lit inside');
  const Lday = W.worldLights({ entities: [] }, { sky: W.worldSkyOf(ctxAt(at(2026, 6, 21, 12))), agents: [car, tram] });
  assert.equal(Lday.filter(l => l.on).length, 0, 'no vehicle lights at a clear noon');
});

test('glitter: the moon on the water at night when it is up, bright and in view; the low sun by day', () => {
  const cam = CAMS.canal, world = { cam, surfaces: [{ id: 'pond', kind: 'water', water: 'pond', level: 0, poly: [[-80, 5], [80, 5], [80, 200], [-80, 200]] }] };
  const [R] = W.worldWaterPlan(world, cam);
  const moonSky = W.worldSkyOf(ctxAt(at(2026, 6, 21, 23, 30), { moon: { alt: 20, az: cam.heading + 5, illum: 0.9 }, cover: 0.1 }));
  const g = W.worldGlitterPlan(R, moonSky, cam);
  assert.equal(g.kind, 'moon'); assert.ok(g.glints.length > 10 && g.k > 0.3);
  assert.ok(g.glints.every(s => s.y > cam.horizon), 'on the water');
  assert.equal(W.worldGlitterPlan(R, W.worldSkyOf(ctxAt(at(2026, 6, 21, 23, 30), { moon: { alt: 20, az: cam.heading + 150, illum: 0.9 } })), cam).kind, null, 'behind the camera: none');
  assert.equal(W.worldGlitterPlan(R, W.worldSkyOf(ctxAt(at(2026, 6, 21, 23, 30), { moon: { alt: -5, az: cam.heading, illum: 0.9 } })), cam).kind, null, 'set: none');
  assert.equal(W.worldGlitterPlan(R, W.worldSkyOf(ctxAt(at(2026, 6, 21, 12, 5))), cam).kind, null, 'a high sun: no road');
  assert.equal(W.worldGlitterPlan(R, W.worldSkyOf(ctxAt(at(2026, 6, 21, 19), { sun: { alt: 8, az: cam.heading - 10 } })), cam).kind, 'sun');
});

test('haze grows with depth and thickens in fog; the pass is registered; the light system switches the lamps', () => {
  const cam = CAMS.canal, ents = { entities: [{ obj: 'tree.oak', x: 0, z: 10 }, { obj: 'tree.oak', x: 0, z: 3000 }, { obj: 'tree.oak', x: 0, z: 300 }] };
  const h = W.worldHazePlan(ents, cam, null);
  assert.ok(h[1] > h[0]);
  const hf = W.worldHazePlan(ents, cam, W.worldSkyOf(ctxAt(at(2026, 6, 21, 12), { weather: 'fog' })));
  assert.ok(hf[2] > h[2] + 0.3, 'fog: ' + hf[2] + ' vs ' + h[2]);
  assert.ok(W.sceneRenderPassList().some(p => p.id === 'world-light'));
  const events = [], world = { cam, bus: { emit: (k, d) => events.push(k) } };
  W.worldLightTick(world, ctxAt(at(2026, 6, 21, 19, 30)));
  W.worldLightTick(world, ctxAt(at(2026, 6, 21, 21, 40)));
  W.worldLightTick(world, ctxAt(at(2026, 6, 21, 23, 40)));
  W.worldLightTick(world, ctxAt(at(2026, 6, 22, 5, 30)));
  assert.deepEqual(events, ['lightsOn', 'lightsOff']);
  assert.ok(world.sky && world.sun && world.sky.__sky);
});

test('the frame record fields: shadow and reflect per entity (reflect from the water surface)', () => {
  const cam = CAMS.canal, world = { cam, surfaces: [{ id: 'pond', kind: 'water', water: 'pond', level: 0, poly: [[-40, 6], [40, 6], [40, 60], [-40, 60]] }],
    entities: [{ id: 'heron', obj: 'bird.heron', x: -5, z: 20, y: 0 }, { id: 'inland', obj: 'tree.bank-oak', x: 0, z: 140, y: 0 }, { id: 'bank', obj: 'tree.bank-oak', x: 10, z: 61.5, y: 0 },
      { id: 'side', obj: 'tree.bank-oak', x: 200, z: 30, y: 0 }] };
  const m = W.worldLookOf(world, cam, { sky: W.worldSkyOf(ctxAt(at(2026, 6, 21, 15))) });
  assert.ok(m.get('heron').reflect && m.get('heron').reflect.surface === 'pond');
  assert.ok(Math.abs(m.get('heron').reflect.rowY - W.sceneProject(cam, -5, 20, 0).Y) < 0.05, 'its own waterline');
  assert.ok(Math.abs(m.get('bank').reflect.rowY - W.sceneProject(cam, 10, 60, 0).Y) < 1.5, 'the bank tree at the bank edge');
  // the far land reflects too (a calm pond mirrors the far landscape), from the bank edge in its column; nothing reflects where
  // there is no water below it
  assert.ok(m.get('inland').reflect && Math.abs(m.get('inland').reflect.rowY - W.sceneProject(cam, 0, 60, 0).Y) < 1.5, 'the far land from the bank edge');
  assert.equal(m.get('side').reflect, null, 'nothing reflects outside the water');
  assert.ok(m.get('inland').shadow && m.get('inland').shadow.dir, 'a cast shadow with its direction');
});

/* ---------- the backdrop (B1, B2, C5) ---------- */
test('every backdrop preset uses library objects only', () => {
  for (const [k, st] of Object.entries(W.WORLD_BACKDROP_STYLES)) for (const b of st.bands) for (const id of b.objs) assert.ok(W.sceneObj(id), `${k}: ${id}`);
});

test('every backdrop style passes worldCoverage for the three test cameras; no backdrop fails', () => {
  for (const [cn, cam] of Object.entries(CAMS)) {
    for (const style of Object.keys(W.WORLD_BACKDROP_STYLES)) {
      const r = W.worldCoverage(canalWorld(cam, style), cam);
      assert.ok(r.ok, `${cn} / ${style}: ${r.msg}`);
      const open = canalWorld(cam, style); open.entities = open.entities.filter(e => !/^t/.test(e.id));
      const r2 = W.worldCoverage(open, cam);                 // the backdrop alone closes the horizon (C5: wherever sky meets ground)
      assert.ok(r2.ok, `${cn} / ${style} without near trees: ${r2.msg}`);
    }
    const bare = canalWorld(cam, 'woodland'); bare.backdrop = null; bare.entities = bare.entities.filter(e => !/^t/.test(e.id));
    const r = W.worldCoverage(bare, cam);
    assert.equal(r.ok, false, cn + ' without a backdrop must be bare'); assert.equal(r.rule, 'emptyBackground'); assert.ok(r.regions.length && r.regions[0].name);
  }
});

test('backdrop: world metres, seeded, beyond the scene, across 21:9; skyline at its bearing and distance; validator', () => {
  const cam = CAMS.canal, w = canalWorld(cam, 'canal-wooded');
  w.backdrop.skyline = [{ obj: 'building.church', bearing: 70 + 10, dist: 1500, src: 'OS map' }, { obj: 'building.church', bearing: 70 + 180, dist: 900, src: 'OS map' }];
  const a = W.worldBackdrop(w, cam, 'summer'), b = W.worldBackdrop(w, cam, 'summer');
  assert.deepEqual(a, b);
  assert.ok(a.length > 30 && a.length < 400, 'count ' + a.length);
  for (const e of a) { assert.ok(e.z >= 170, e.id + ' z ' + e.z); assert.ok(!('X' in e) && !('s' in e) && !('layer' in e)); assert.ok(e.haze >= 0 && e.haze < 0.5); }
  const sky = a.filter(e => e.skyline);
  assert.equal(sky.length, 1, 'the one behind the camera is dropped');
  assert.ok(Math.abs(Math.hypot(sky[0].x, sky[0].z) - 1500) < 0.2 && sky[0].x > 0);
  // the 21:9 frame (2100 x 900) extends 250 units each side: the bands reach past both edges
  const X = a.filter(e => !e.skyline).map(e => W.sceneProject(cam, e.x, e.z, 0).X);
  assert.ok(Math.min(...X) < -250 && Math.max(...X) > 1850, 'overscan ' + Math.min(...X) + ' .. ' + Math.max(...X));
  assert.deepEqual(W.worldBackdropValidate({ style: 'woodland' }), []);
  assert.deepEqual(W.worldBackdropValidate({ style: 'woodland', yield: [[300, 330]] }), []);
  const errs = W.worldBackdropValidate({ style: 'nope', scale: 2, yield: 'east', skyline: [{ obj: 'x.none', bearing: 1, dist: 5, Y: 3 }] }).map(e => e.rule);
  for (const r of ['unknownStyle', 'screenOrLookField', 'unknownSize', 'badBackdrop']) assert.ok(errs.includes(r), r + ' in ' + errs);
  assert.equal(W.worldBackdropValidate(null)[0].rule, 'emptyBackground');
});

test('the backdrop yields where a skyline entry stands, to declared bearing ranges and to far scene landmarks (no duplicate skyline)', () => {
  const cam = CAMS.kelham, w = canalWorld(cam, 'city-sheffield-hills');
  const bear = (e) => Math.atan2(e.x, e.z) * 180 / Math.PI;
  const none = W.worldBackdrop(w, cam, 'summer').filter(e => !e.skyline);
  w.backdrop.skyline = [{ obj: 'building.church', bearing: cam.heading + 4, dist: 1200, src: 'OS map' }];
  const Y = W.worldBackdropYield(w, cam);
  assert.equal(Y.length, 1); assert.ok(Y[0][0] < 4 && Y[0][1] > 4);
  const withSky = W.worldBackdrop(w, cam, 'summer');
  const inRange = (e, r) => { const c = bear(e); return c > r[0] + 0.3 && c < r[1] - 0.3; };
  assert.ok(none.some(e => inRange(e, Y[0])), 'without the entry the bands stand there');
  assert.ok(!withSky.filter(e => !e.skyline).some(e => inRange(e, Y[0])), 'with it they yield');
  assert.ok(withSky.filter(e => !e.skyline).length > none.length * 0.8, 'elsewhere the bands stay');
  // a declared bearing range (compass degrees) and a far landmark of the scene itself
  const w2 = canalWorld(cam, 'city-sheffield-hills'); w2.backdrop.yield = [[cam.heading - 12, cam.heading - 2]];
  assert.ok(!W.worldBackdrop(w2, cam, 'summer').some(e => { const c = bear(e); return c > -11.5 && c < -2.5; }));
  const w3 = canalWorld(cam, 'city-sheffield-hills'); w3.entities.push({ id: 'cath', obj: 'building.church', x: -60, z: 400, landmark: true });
  const c3 = Math.atan2(-60, 400) * 180 / Math.PI;
  assert.ok(!W.worldBackdrop(w3, cam, 'summer').some(e => Math.abs(bear(e) - c3) < 0.4), 'yields to the scene landmark');
  // the horizon is still closed wherever sky meets ground (C5)
  assert.ok(W.worldCoverage(Object.assign({}, w, { entities: w.entities.filter(e => !/^t/.test(e.id)) }), cam).ok);
});

test('backdrop look: bands haze by distance and thicken in fog, follow the season, and light at night', () => {
  const cam = CAMS.kelham, w = canalWorld(cam, 'city-sheffield-hills'), mem = W.worldBackdrop(w, cam, 'winter');
  const near = mem.filter(e => e.band === 0), far = mem.filter(e => e.band === 2);
  const avg = (L, f) => L.reduce((a, e) => a + f(e), 0) / L.length;
  assert.ok(avg(far, e => e.haze) > avg(near, e => e.haze) * 1.5, 'far bands hazier');
  const day = W.worldBackdropLook(mem, W.worldSkyOf(ctxAt(at(2026, 1, 15, 12)))), fog = W.worldBackdropLook(mem, W.worldSkyOf(ctxAt(at(2026, 1, 15, 12), { weather: 'fog' })));
  assert.ok(avg(near, e => fog.get(e.id).haze) > avg(near, e => day.get(e.id).haze) + 0.2, 'fog thickens the haze');
  const night = W.worldBackdropLook(mem, W.worldSkyOf(ctxAt(at(2026, 1, 15, 21))));
  const blds = mem.filter(e => /^building\./.test(e.obj));
  assert.ok(blds.length > 5 && blds.every(e => !day.get(e.id).lit), 'no lit buildings by day');
  assert.ok(blds.filter(e => night.get(e.id).lit).length > blds.length * 0.5, 'the town lights at night');
  const woods = W.worldBackdrop(canalWorld(cam, 'woodland'), cam, 'winter').filter(e => /^tree\./.test(e.obj) && !/pine/.test(e.obj));
  const jan = W.worldBackdropLook(woods, W.worldSkyOf(ctxAt(at(2026, 1, 15, 12))), { ctx: { month: 0, doy: 15 } }), jul = W.worldBackdropLook(woods, W.worldSkyOf(ctxAt(at(2026, 7, 15, 12))), { ctx: { month: 6, doy: 196 } });
  assert.ok(woods.every(e => jan.get(e.id).leaf === 'bare') && woods.every(e => jul.get(e.id).leaf === 'full'), 'bare woods in January, full in July');
});

test('dither: an ordered dither breaks the bands of a slow gradient', () => {
  const vals = []; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) vals.push(W.worldDither(x, y));
  assert.ok(Math.abs(vals.reduce((a, b) => a + b, 0) / 16) < 1e-9 && Math.min(...vals) >= -0.5 && Math.max(...vals) < 0.5);
  const img = { data: new Uint8ClampedArray(64 * 200 * 4), width: 64, height: 200 };
  W.worldDitherGradient(img, 0, 0, 64, 200, [[0, '#404850'], [1, '#444c54']]);
  // without dither the 4 levels would sit in 4 flat bands of 50 rows; with it each row's mean tracks the ideal value
  let worst = 0;
  for (let y = 0; y < 200; y++) { let s = 0; for (let x = 0; x < 64; x++) s += img.data[(y * 64 + x) * 4]; const ideal = 0x40 + 4 * y / 199; worst = Math.max(worst, Math.abs(s / 64 - ideal)); }
  assert.ok(worst < 0.35, 'row means within ' + worst.toFixed(3) + ' of the ideal');
});
