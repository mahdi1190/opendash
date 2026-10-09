// The v2 shadows (docs/dev/SCENE_ENGINE_V2.md 6 and 27.2; builder B): the pure maths in Node (70-scene-svg.js: the sun on the
// ground, the shear, contact shadows). The canvas checks (direction of the dark pixels, the pass stats) are in
// tests/scene-render-v2.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenes } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const S = loadScenes(ROOT, { fixtures: true, browser: true, extra: readFileSync(join(ROOT, 'tests', 'fixtures', 'scene-v2-b-canal.js'), 'utf8') });
const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const D = Math.PI / 180;
const Lsun = (alt, rel, o) => Object.assign({ alt, cover: 0.1, dark: alt < 0 ? 1 : 0, sun: { rel, show: true }, moon: { show: false, alt: -20, illum: 0 }, shade: '#304050' }, o || {});

test('the shear maps the sprite top to the projected tip of the shadow, for three suns (6.2)', () => {
  const cam = S.SCENE_V2B_CAM, hTop = 400, s = 0.5;
  for (const [alt, rel] of [[60, -70], [20, 40], [6, -5]]) {
    const sun = S.sceneShadowSun(Lsun(alt, rel));
    const foot = { x: 10, d: 30 }, fp = S.sceneCamProject(cam, foot.x, foot.d);
    Object.assign(foot, { X: fp.X, Y: fp.Y });
    const M = S.sceneShadowMatrix(cam, foot, s, hTop, false, sun, 1, 0, 0);
    // the foot (local 0, 0) stays at the foot
    close(M[4], foot.X, 1e-9, 'foot X'); close(M[5], foot.Y, 1e-9, 'foot Y');
    // the top (local 0, -hTop) lands on the projected tip of a caster of the sprite's height in metres
    const Hm = hTop * s * foot.d / cam.f, tip = S.sceneShadowTip(cam, foot.x, foot.d, Hm, sun.g, sun.tan), tp = S.sceneCamProject(cam, tip[0], tip[1]);
    close(M[2] * -hTop + M[4], tp.X, 1e-6, `tip X at alt ${alt}`); close(M[3] * -hTop + M[5], tp.Y, 1e-6, `tip Y at alt ${alt}`);
    // the shadow points away from the sun on the ground
    const gx = tip[0] - foot.x, gd = tip[1] - foot.d;
    assert.ok(gx * -Math.sin(rel * D) + gd * -Math.cos(rel * D) > 0, 'away from the sun at rel ' + rel);
  }
});

test('lengths follow 1 / tan(alt) and are clamped at 12 (6.1)', () => {
  const cam = { eye: 1.65, f: 1232, x0: 800, horizon: 470, dMin: 4.7 };
  for (const alt of [5, 30, 60]) {
    const sun = S.sceneShadowSun(Lsun(alt, 90));   // the sun on the right: the shadow runs left along the ground, no clamp
    close(sun.tan, 1 / Math.tan(alt * D), 1e-9, 'tan at ' + alt);
    const tip = S.sceneShadowTip(cam, 0, 50, 10, sun.g, sun.tan);
    close(Math.hypot(tip[0], tip[1] - 50), 10 / Math.tan(alt * D), 1e-6, 'length at ' + alt);
  }
  assert.equal(S.sceneShadowSun(Lsun(0.5, 0)).tan, 12, 'a grazing sun is clamped at 12x');
  assert.equal(S.sceneShadowSun(Lsun(30, 0, { sunTan: 1.732, sunG: [0, -1] })).tan, 1.732, "C's L.sunTan is used when present");
  // a shadow toward the camera never passes behind it
  const tip = S.sceneShadowTip(cam, 0, 10, 20, [0, -1], 12);
  assert.ok(tip[1] >= cam.dMin * 0.6 && tip[1] >= 10 * 0.3 - 1e-9, 'kept in front of the camera: ' + tip[1]);
});

test('opacity and softness by the sky: noon, golden hour, low sun, overcast, a moonlit night, a dark night (6.1)', () => {
  const noon = S.sceneShadowSun(Lsun(55, 0)), gold = S.sceneShadowSun(Lsun(7, 0)), low = S.sceneShadowSun(Lsun(1, 0)), set = S.sceneShadowSun(Lsun(-1.5, 0));
  close(noon.op, 0.42, 1e-9, 'noon'); close(noon.blur, 1.5, 1e-9, 'noon blur');
  close(gold.op, 0.34, 1e-9, 'golden'); close(gold.blur, 4, 1e-9, 'golden blur'); assert.equal(gold.fade, true, 'long shadows fade from the foot');
  assert.ok(low.op < gold.op && low.op > 0, 'fading under 3 degrees'); assert.equal(set.kind, null, 'nothing below -1');
  const over = S.sceneShadowSun(Lsun(55, 0, { cover: 0.9 }));
  close(over.op, 0.42 * 0.25, 1e-9, 'overcast x .25'); close(over.blur, 10, 1e-9, 'overcast blur 10');
  const moon = S.sceneShadowSun({ alt: -30, cover: 0.1, dark: 1, sun: { rel: 0 }, moon: { show: true, alt: 35, illum: 0.9, rel: 20 } });
  assert.equal(moon.kind, 'moon'); close(moon.op, 0.12, 1e-9, 'moonlit'); close(moon.blur, 6, 1e-9, 'moon blur');
  close(moon.g[0], -Math.sin(20 * D), 1e-9, 'along the moon');
  const dark = S.sceneShadowSun({ alt: -30, cover: 0.1, dark: 1, sun: { rel: 0 }, moon: { show: true, alt: 35, illum: 0.3, rel: 20 } });
  assert.equal(dark.kind, null, 'a dark night casts no sun or moon shadows');
  close(dark.contact, 0.25, 1e-9, 'contact shadows at night are .25');
  close(noon.contact, 0.35, 1e-9, 'and .35 by day');
  close(over.contact, 0.25, 1e-9, 'and .25 under overcast');
});

test('contact shadows exist for every caster class, day and night: one per axle for vehicles, a band for buildings (6.3)', () => {
  const C = S.sceneV2BCanal(), cam = S.sceneRenderCam(C);
  const sh = (id) => S.sceneObjShapes(id, 0, 'summer');
  const person = S.sceneContactOf('person.walker', 'person', sh('person.walker'), 1, 20, cam);
  assert.equal(person.length, 1); assert.ok(person[0][1] > person[0][2], 'flat on the ground');
  const car = S.sceneContactOf('boat.narrowboat', 'car', sh('boat.narrowboat'), 0.3, 30, cam);
  assert.equal(car.length, 2, 'one per axle');
  const bld = S.sceneContactOf('building.mcr-mill', 'building', sh('building.mcr-mill'), 0.9, 70, cam);
  assert.equal(bld.length, 1); assert.ok(bld[0][1] > 100, 'a band along the base');
  assert.ok(S.SCENE_SHADOW_CLASSES.includes('tree') && S.SCENE_SHADOW_CLASSES.includes('car') && !S.SCENE_SHADOW_CLASSES.includes('boat'));
  // the fixture's casters all have contact shadows, also at night (the night has no cast shadows: sceneShadowSun kind null)
  const casters = C.items.filter(it => S.SCENE_SHADOW_CLASSES.includes(it.cls));
  assert.ok(casters.length >= 12, 'casters ' + casters.length);
  for (const it of casters) assert.ok(S.sceneContactOf(it.o, it.cls, S.sceneObjShapes(it.o, it.v, it.season), it.s, it.dz, cam).length >= 1, it.o);
});

test('the class fallback (no A): from the category and tags', () => {
  assert.equal(S.sceneObjClassOf('bird.swan'), 'bird-water');
  assert.equal(S.sceneObjClassOf('boat.narrowboat'), 'boat');
  assert.equal(S.sceneObjClassOf('tree.oak'), 'tree');
  assert.equal(S.sceneObjClassOf('person.walker'), 'person');
  assert.equal(S.sceneObjClassOf('street.lamp'), 'street');
});
