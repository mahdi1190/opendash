// World sense in the v2 engine (package "sense", src/app/78-scene-x-sense.js; v3's placement knowledge of 79-world-1place.js and
// 79-world-0kb.js ported to the v2 compile). One minimal fixture per rule: a boat half on the towpath, a duck in the air and one
// on the towpath, reeds mid-channel, an orphan bough, a legal framing bough left alone; the edge: true scatter clip; the off
// switch and report mode; v1 compiles untouched; and the good Hampshire views get no repair at all (the hard rule).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { engineOf, dataOf } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const reg = loadRegistry(ROOT);
const G = reg.R.get;
const E = new Proxy({}, { get: (_, n) => G(n) });
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
E.sceneObjDefine({ id: 'boat.sxtest-boat', category: 'boat', size: [200, 60], real: { h: 1.2, l: 6, w: 2 }, tags: ['class:boat'], build: () => ({ hull: [['#223344', rect(-100, -60, 200, 60)]] }) });
E.sceneObjDefine({ id: 'bird.sxtest-duck', category: 'bird', size: [40, 30], real: { h: 0.35, l: 0.5, w: 0.3 }, tags: ['water'], build: () => ({ body: [['#665533', rect(-20, -30, 40, 30)]] }) });
E.sceneObjDefine({ id: 'plant.sxtest-reed', category: 'plant', size: [40, 120], real: { h: 1.8 }, tags: [], build: () => ({ body: [['#887744', rect(-20, -120, 40, 120)]] }) });
E.sceneObjDefine({ id: 'plant.sxtest-bough', category: 'plant', size: [300, 200], tags: [], build: () => ({ body: [['#335522', rect(0, 0, 300, 200)]] }) });
E.sceneObjDefine({ id: 'tree.sxtest-oak', category: 'tree', size: [200, 400], real: { h: 12 }, tags: ['deciduous'], build: () => ({ body: [['#335522', rect(-100, -400, 200, 400)]] }) });

const CAM = { eye: 1.65, fov: 66, horizon: 470, heading: 180, x0: 800 };
let n = 0;
/** A canal (x -5..5) with a towpath on its right (x 5.5..8.5), grass beyond; fresh data every call (the compile memoises on it). */
const canal = (over = {}) => Object.assign({ id: 'sxtest-' + (++n), v: 2, view: { lat: 51.28, lon: -0.83 }, camera: Object.assign({}, CAM), season: 'summer', cover: false, particles: 'none',
  surfaces: [{ id: 'land', kind: 'grass', rest: true }, { id: 'tow', kind: 'towpath', path: [[7, 3], [7, 300]], width: 3 }, { id: 'marsh', kind: 'bank', poly: [[-30, 3], [-5, 3], [-5, 300], [-30, 300]] }],
  water: [{ id: 'cut', kind: 'canal', path: [[0, 3], [0, 300]], width: 10 }], place: [], scatter: [] }, over);
/** A wide pond (x -40..40, d 10..90). */
const pond = (over = {}) => Object.assign({ id: 'sxtest-' + (++n), v: 2, view: { lat: 51.28, lon: -0.83 }, camera: Object.assign({}, CAM), season: 'summer', cover: false, particles: 'none',
  surfaces: [{ id: 'land', kind: 'grass', rest: true }], water: [{ id: 'pond', kind: 'pond', poly: [[-40, 10], [40, 10], [40, 90], [-40, 90]] }], place: [], scatter: [] }, over);
const compile = (d, o) => E.sceneCompile(d, Object.assign({ season: 'summer', lod: 1 }, o || {}));
const px = (x, d, h = 0) => { const cam = E.sceneCamera({ camera: CAM }); const P = E.sceneProject(cam, x, d, h); return { x: Math.round(P.X * 10) / 10, y: Math.round(P.Y * 10) / 10 }; };
const find = (C, obj) => C.items.filter(it => it.o === obj);
const acts = (C, rule) => (C.sense || []).filter(e => !rule || e.rule === rule);

test('senseBoat: a pixel boat a third on the towpath is moved whole into the water; one far up the bank is dropped; each logged', () => {
  const C = compile(canal({ place: [Object.assign({ obj: 'boat.sxtest-boat', s: 0.5 }, px(4.5, 30)), Object.assign({ obj: 'boat.sxtest-boat', s: 0.5 }, px(9, 30))] }));
  const boats = find(C, 'boat.sxtest-boat');
  assert.equal(boats.length, 1, 'the boat on the bank is dropped, the other kept');
  const b = boats[0];
  assert.ok(b.g.x + 3 <= 5.001 && b.g.x - 3 >= -5.001, 'the whole 6 m hull lies in the 10 m channel: ' + b.g.x);
  assert.ok(Math.hypot(b.g.x - 4.5, b.g.d - 30) <= 3.01, 'moved at most max(2 m, half its length)');
  const log = acts(C, 'boat');
  assert.deepEqual(log.map(e => e.action).sort(), ['drop', 'snap']);
  for (const e of log) { assert.equal(e.by, 'sense'); assert.ok(Array.isArray(e.from) && e.reason); }
  assert.ok(C.problems.some(p => p.rule === 'senseBoat' && p.sev === 'info'), 'applied repairs are info problems');
  // the moved boat's screen point and scale follow its new ground point
  const P = px(b.g.x, b.g.d, b.g.h);
  assert.ok(Math.abs(b.x - P.x) < 0.2 && Math.abs(b.y - P.y) < 0.2);
  assert.ok(b.s < 0.5 * 1.2 && b.s > 0.5 * 0.8);
});

test('senseFloat: a duck in the sky is dropped, a duck on the towpath beside the water goes into the water, a duck on the marsh bank stays (it grazes)', () => {
  const C = compile(canal({ place: [
    { obj: 'bird.sxtest-duck', x: 700, y: 400, s: 0.3 },
    Object.assign({ obj: 'bird.sxtest-duck', s: 0.3 }, px(5.8, 20)),
    Object.assign({ obj: 'bird.sxtest-duck', s: 0.3 }, px(-6, 20)),
  ] }));
  const ducks = find(C, 'bird.sxtest-duck');
  assert.equal(ducks.length, 2, 'the duck in the sky is dropped');
  const wet = ducks.filter(d => d.g && Math.abs(d.g.x) < 5);
  assert.equal(wet.length, 1, 'the towpath duck is in the water now');
  assert.ok(wet[0].g.x <= 5 - 0.15 && Math.hypot(wet[0].g.x - 5.8, wet[0].g.d - 20) <= 2.6);
  assert.ok(ducks.some(d => d.g && d.g.x < -5), 'the bank duck stays on its bank');
  const log = acts(C, 'float');
  assert.deepEqual(log.map(e => e.action).sort(), ['drop', 'snap']);
});

test('senseReed: a reed mid-channel (far out in a wide pond) is dropped; one 3.5 m out comes back into the margin; one in the margin stays', () => {
  const C = compile(pond({ place: [
    Object.assign({ obj: 'plant.sxtest-reed', s: 0.3 }, px(0, 50)),
    Object.assign({ obj: 'plant.sxtest-reed', s: 0.3 }, px(-36.5, 50)),
    Object.assign({ obj: 'plant.sxtest-reed', s: 0.3 }, px(-38.5, 50)),
  ] }));
  const reeds = find(C, 'plant.sxtest-reed');
  assert.equal(reeds.length, 2, 'the mid-pond reed is dropped');
  for (const r of reeds) assert.ok(r.g.x <= -40 + 2.5 + 1e-6, 'every reed within 2.5 m of the bank: ' + r.g.x);
  assert.deepEqual(acts(C, 'reed').map(e => e.action).sort(), ['drop', 'snap']);
});

test('senseOrphan: a bough hanging from nothing mid-frame is dropped; a framing bough off the frame edge, a bough by its tree and a declared framing bough stay', () => {
  const tree = px(-6, 20);
  const C = compile(pond({ place: [
    { obj: 'plant.sxtest-bough', x: 650, y: 120, s: 0.5, pin: true, layer: 'mid' },                // an orphan in the sky
    { obj: 'plant.sxtest-bough', x: -20, y: -10, s: 1, pin: true, layer: 'front' },               // the legal framing bough at the top left
    { obj: 'tree.sxtest-oak', x: tree.x, y: tree.y, s: 0.8 },                                       // a tree ...
    { obj: 'plant.sxtest-bough', x: tree.x - 60, y: tree.y - 250, s: 0.4, pin: true, layer: 'mid' }, // ... and its bough
    { obj: 'plant.sxtest-bough', x: 1100, y: 140, s: 0.5, pin: true, layer: 'mid', framing: true },  // declared framing: never dropped
  ] }));
  const boughs = find(C, 'plant.sxtest-bough');
  assert.equal(boughs.length, 3, 'only the orphan is dropped');
  assert.ok(boughs.some(b => b.x === -20 && b.y === -10), 'the framing bough at the edge is left alone');
  assert.ok(!boughs.some(b => b.x === 650), 'the orphan is gone');
  const log = acts(C, 'orphan');
  assert.deepEqual(log.map(e => e.action).sort(), ['drop', 'warn'], 'the declared framing bough is a warning');
});

test('scatter edge: true clips a margin cluster to the band (within 1 m of the water on land); without it the reeds fill the bank', () => {
  const rule = { obj: 'plant.sxtest-reed', on: ['marsh'], d: [6, 60], n: 120, dist: 'ground', cluster: { centres: 6, spread: 6 }, seed: 3, species: 1, k: [0.9, 1.1] };
  const C1 = compile(canal({ scatter: [Object.assign({ edge: true }, rule)] })), C0 = compile(canal({ scatter: [rule] }));
  const a = find(C1, 'plant.sxtest-reed'), b = find(C0, 'plant.sxtest-reed');
  assert.ok(a.length >= 10, 'the clipped rule still places reeds: ' + a.length);
  for (const r of a) assert.ok(r.g.x >= -6 - 1e-6, 'within 1 m of the water: ' + r.g.x);
  assert.ok(b.some(r => r.g.x < -8), 'unclipped, some stand far up the bank');
});

test('the switch: opt.x.sense false leaves the compile as it was; report logs what it WOULD do and changes nothing', () => {
  const mk = () => canal({ place: [Object.assign({ obj: 'boat.sxtest-boat', s: 0.5 }, px(9, 30))] });
  const off = compile(mk(), { x: { sense: false } });
  assert.equal(off.sense, undefined);
  assert.equal(find(off, 'boat.sxtest-boat').length, 1);
  const rep = compile(mk(), { x: { sense: 'report' } });
  assert.equal(find(rep, 'boat.sxtest-boat').length, 1, 'report mode keeps the boat');
  assert.equal(rep.sense.length, 1);
  assert.equal(rep.sense[0].action, 'warn');
  assert.equal(rep.sense[0].would, 'drop');
  assert.equal(E.sceneXSenseMode({ x: { sense: false } }), 'off');
  assert.equal(E.sceneXSenseMode({ x: { sense: 'report' } }), 'report');
});

test('the probe: in the water minus the distance to the nearest real bank, on land the distance to the water, the bank direction', () => {
  const C = compile(canal());
  const a = E.sceneXSenseProbe(C, 2, 40), b = E.sceneXSenseProbe(C, 8, 40);
  assert.equal(a.inWater, true);
  assert.ok(Math.abs(a.waterDist + 3) < 1e-6 && a.bankDir < 1e-6, JSON.stringify(a));
  assert.equal(b.inWater, false);
  assert.ok(Math.abs(b.waterDist - 3) < 1e-6 && b.kind === 'towpath', JSON.stringify(b));
  // a pond: the frame's cuts are no banks
  const P = compile(pond());
  const c = E.sceneXSenseProbe(P, 0, 85);
  assert.ok(Math.abs(c.waterDist + 5) < 1e-6, 'the far shore at d 90 is the nearest bank: ' + c.waterDist);
});

test('v1 data: the compile is untouched (no sense key); sceneXSenseReport only reports', () => {
  const v1 = { id: 'sxtest-v1', view: { lat: 51.3, lon: -0.8, horizon: 520 }, layers: [{ id: 'far', depth: 0.2 }, { id: 'near', depth: 0.8 }],
    water: [{ layer: 'near', d: 'M0 600h1600v300h-1600z' }],
    place: [{ obj: 'plant.sxtest-reed', x: 800, y: 880, s: 0.5, layer: 'near' }, { obj: 'bird.sxtest-duck', x: 300, y: 560, s: 0.5, layer: 'near' }] };
  const C = compile(v1);
  assert.equal(C.v, 1);
  assert.equal(C.sense, undefined);
  assert.equal(C.items.length, 2);
  const log = E.sceneXSenseReport(C, v1);
  assert.ok(Array.isArray(log));
  for (const e of log) assert.equal(e.action, 'warn');
});

test('THE HARD RULE: the good v2 Hampshire views and the proof get no repair (warnings only)', { timeout: 120000 }, () => {
  const E2 = engineOf(reg);
  const want = /hampshire-(fleet-pond|fleet-canal)-[1-4]$|hampshire-fleet-pond-proof$/;
  const seen = [];
  for (const e of reg.items()) {
    if (!want.test(e.ref)) continue;
    const C = compile(dataOf(e.item, E2), { season: 'autumn' });
    assert.equal(C.v, 2, e.ref);
    const applied = (C.sense || []).filter(x => x.action !== 'warn');
    assert.deepEqual(applied.map(x => `${x.obj} ${x.action} ${x.rule}`), [], e.ref);
    seen.push(e.ref);
  }
  assert.equal(seen.length, 9, seen.join(' '));
});
