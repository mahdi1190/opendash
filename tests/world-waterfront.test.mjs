// World engine: what the Liverpool Pier Head (the second no-example place: a wide tidal river, three huge stone buildings, a ferry,
// a great plaza) found missing, each with the check that fails on the engine as it was. docs/dev/SCENE_LESSONS.md M;
// docs/dev/WORLD_ENGINE_REQUIREMENTS.md section 28.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT, { extra: 'globalThis.__scPacks = _scPacks;' });
const camOf = (o) => W.sceneCamera(Object.assign({ camera: { eye: 1.7, fov: 72, horizon: 500, heading: 352 } }, o || {}));
function mockCtx() {
  const calls = [];
  const ctx = { calls, globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 };
  for (const n of ['save', 'restore', 'setTransform', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'clip', 'drawImage', 'quadraticCurveTo', 'bezierCurveTo']) ctx[n] = (...a) => { calls.push([n, ctx.fillStyle, ctx.globalAlpha, ...a]); };
  return ctx;
}

const V2 = readFileSync(join(ROOT, 'src', 'app', '78-scene-water.js'), 'utf8');
/* ---------- the estuary: one water kind, known to every table that is indexed by kind ---------- */
test('K1: every water kind has a look, a v2 default, a host mapping and a quay rule in every kit that names edges', () => {
  for (const k of W.WORLD_WATER_KINDS) {
    assert.ok(W.WORLD_WATER_LOOK[k], k + ' has a world look');
    assert.ok(W.WORLD_WATER_LOOK[k].base.length === 3);
    assert.ok(W.WORLD_HOST_WATER_V2[k], k + ' maps to a v2 kind');
    const row = V2.split(String.fromCharCode(10)).find(l => l.startsWith('  ' + k + ': { base: ['));
    const m = row ? [null, row.slice(row.indexOf('[') + 1, row.indexOf(']'))] : null;
    assert.ok(m, k + ' is in the v2 water table (78-scene-water.js: an unknown kind falls back to a blue lake)');
    assert.deepEqual(m[1].split(',').map(x => x.trim().replace(/'/g, '')), W.WORLD_WATER_LOOK[k].base, k + ': the v2 table and the world look agree (one table with the v2 base water)');
  }
  for (const [id, kit] of Object.entries(W.WORLD_STYLE_KITS)) {
    const E = kit.edges && kit.edges.water;
    if (!E) continue;
    for (const k of W.WORLD_WATER_KINDS) assert.ok(k in E, `kit ${id}: edges.water names ${k}`);
  }
  assert.ok(W.WORLD_WATER_KINDS.includes('estuary') && !('estuary' in W.WORLD_WATER_ALIAS), 'an estuary is a kind of its own, not a river');
});

test('K2: an estuary is brown-grey, opaque and choppy; a pond is none of those', () => {
  const est = W.worldWaterLook('estuary'), pond = W.worldWaterLook('pond');
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  for (const c of est.base) { const [r, g, b] = rgb(c); assert.ok(r > g && g > b, 'warm (silt): ' + c); }
  assert.ok(est.clarity < 0.05 && est.mirror < 0.3 && est.drift === 'flow' && est.chop > 0.5, 'opaque, a poor mirror, running with the tide, choppy');
  assert.ok(!pond.chop, 'a pond has no chop');
});

test('K3: the chop of open water: wavelets in the base bake, deterministic, converging, none on a pond, faded where under a pixel', () => {
  const cam = camOf(), w = 400, h = 300, y0 = 500, mk = () => ({ B: new Uint8ClampedArray(w * h * 4).fill(128), wet: new Uint8Array(w * h).fill(1) });
  const R = { id: 'mersey', level: -3, cam }, run = (look) => { const o = mk(); const n = W.worldWaterChop(o.B, o.wet, w, h, 600, y0, { R, look, vs: 1, ox: 0, oy: 0, cam }); return Object.assign(o, { n }); };
  const a = run(W.worldWaterLook('estuary')), b = run(W.worldWaterLook('estuary')), pond = run(W.worldWaterLook('pond')), sea = run(W.worldWaterLook('sea'));
  assert.ok(a.n > w * h * 0.1, 'streaks cover part of the water: ' + a.n);
  assert.deepEqual(Array.from(a.B), Array.from(b.B), 'deterministic');
  assert.equal(pond.n, 0, 'a pond is untouched');
  assert.ok(sea.n > 0 && sea.n < a.n, 'the sea has less than an estuary');
  // lighter and darker than the base, never brighter than a streak allows
  const vals = new Set(Array.from(a.B.filter((_, i) => i % 4 === 0))), mn = Math.min(...vals), mx = Math.max(...vals);
  assert.ok(mn < 124 && mx > 132 && mn > 80 && mx < 180, `${mn}..${mx}`);
  // the rows at the horizon (under a pixel per wavelet) are not touched; they would shimmer
  const nearHz = a.B.slice(0, 4 * w * 3).every((v, i) => i % 4 === 3 || v === 128);
  assert.ok(nearHz, 'no chop within 3 rows of the horizon');
});

test('K4: the far shore: an estuary backdrop is a low line of buildings and trees a mile off, covering the horizon', () => {
  assert.ok(W.WORLD_BACKDROPS.includes('estuary') && W.WORLD_BACKDROP_STYLES.estuary);
  const world = { cam: camOf(), seed: 3, surfaces: [{ id: 'r', kind: 'water', water: 'estuary', poly: [[-900, 1], [900, 1], [900, 1200], [-900, 1200]] }], entities: [], backdrop: { style: 'estuary' } };
  const ents = W.worldBackdrop(world, world.cam, 'summer', {});
  assert.ok(ents.length > 80, 'a continuous shore: ' + ents.length);
  assert.ok(ents.every(e => e.z >= 1200), 'beyond the scene\'s own far edge');
  assert.ok(ents.some(e => /building\./.test(e.obj)) && ents.some(e => /tree\./.test(e.obj)));
  const kit = W.worldKit('waterfront-city');
  assert.ok(kit && kit.backdrop === 'estuary' && kit.bare.paving >= 0.2, 'the waterfront-city kit names it and allows a great plaza');
  assert.deepEqual(W.worldKitCheck({ kit: 'waterfront-city' }), [], 'every object of the kit exists, is strong and belongs in its slot');
});

/* ---------- a hull seen along its length with no end art ---------- */
test('K5: a hull with no end art gets a stepped silhouette (hull, house, deck, mast) from its side art, never one flat slab', () => {
  const cam = camOf({ camera: { eye: 1.7, fov: 72, horizon: 500, heading: 0 } });
  const hull = W.worldExtrudeHull({ id: 'f', obj: 'boat.ferry', x: -6, z: 60, y: -3, facing: 0 }, cam);
  assert.ok(hull && hull.end && !hull.end.obj && hull.end.face, 'no end art: a procedural face');
  const f = hull.end.face;
  assert.ok(f.bands.length === 4 && f.bands[0].u === 0 && f.bands[3].u > f.bands[1].u, 'a stepped outline narrowing upward: ' + f.bands.map(b => b.u).join());
  assert.ok(new Set(f.bands.map(b => b.hex)).size >= 2, 'more than one colour (hull and house)');
  assert.ok(f.rows.length >= 1, 'windows, because the art has lit glass');
  const ctx = mockCtx();
  W.worldExtrudeDraw(ctx, hull, { vs: 1, ox: 0, oy: 0 });
  assert.ok(ctx.calls.filter(c => c[0] === 'fill').length >= 1 + f.bands.length, 'the bands are drawn');
  // a boat WITH end art (the new river ferry) uses it
  const rf = W.worldExtrudeHull({ id: 'rf', obj: 'boat.river-ferry', x: -6, z: 60, y: -3, facing: 0 }, cam);
  assert.equal(rf.end.obj, 'boat.river-ferry-end'); assert.ok(!rf.end.face);
  // (merge of 15 Oct) a narrowboat is the 3D boat model (worldExtrudeBoatModel): its ends are modelled faces (stern counter, bow),
  // never end art on a face and never a flat slab
  const nb = W.worldExtrudeHull({ id: 'nb', obj: 'boat.narrowboat', x: 0, z: 30, y: -0.5, facing: 0 }, cam);
  assert.ok(nb.model && nb.end && nb.end.which === 'stern' && !nb.end.face && !nb.end.obj, 'the stern of the model, seen from behind');
  assert.ok(nb.faces.filter(f => !f.line).length > 20, 'a solid model, not one slab');
});

test('K6: the river passenger ferry is a library object with both end views, a real size and lit windows', () => {
  const def = W.sceneObj('boat.river-ferry'), end = W.sceneObj('boat.river-ferry-end');
  assert.ok(def && end);
  assert.deepEqual(def.views, { front: 'boat.river-ferry-end', back: 'boat.river-ferry-end' });
  const r = W.sceneObjReal('boat.river-ferry');
  assert.ok(r.l > 35 && r.l < 70 && r.h > 12 && r.w > 8, JSON.stringify(r));
  assert.ok(W.worldObjectInfo('boat.river-ferry') && W.worldKb('boat.river-ferry').cls === 'boat');
  for (const id of ['boat.river-ferry', 'boat.river-ferry-end']) { const sh = W.sceneObjShapes(id, 0, 'summer'); assert.ok(sh.parts.body.filter(s => s.glow).length >= 4, id + ' windows glow'); }
});

/* ---------- the sun on a face ---------- */
test('K7: a face turned to a low sun is lighter and warmer than one turned away; none at night or under thick cloud', () => {
  const cam = { heading: 0 };
  const sky = (alt, az, cover) => ({ sun: { alt, az }, cover });
  const low = W.worldSunLight(sky(10, 90, 0.1), cam);              // the sun low in the east, the camera looking north
  assert.ok(low && low.k > 0.6 && low.warm > 0.3, JSON.stringify(low));
  assert.ok(low.v[0] > 0.9 && Math.abs(low.v[2]) < 0.2, 'the sun is to the right');
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); return 0.3 * r + 0.59 * g + 0.11 * b; };
  const base = '#a89c84', toSun = W.worldSunTone(base, [1, 0, 0], low), away = W.worldSunTone(base, [-1, 0, 0], low), front = W.worldSunTone(base, [0, 0, -1], low);
  assert.ok(lum(toSun) > lum(front) && lum(front) > lum(away) - 1, 'lit > side-on >= shaded');
  assert.ok(lum(toSun) - lum(away) > 40, 'a real difference: ' + lum(toSun) + ' vs ' + lum(away));
  const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  assert.ok(rgb(toSun)[0] - rgb(toSun)[2] > rgb(base)[0] - rgb(base)[2], 'the lit face is warmer');
  assert.equal(W.worldSunLight(sky(-5, 90, 0), cam), null, 'no sun at night');
  assert.ok((W.worldSunLight(sky(40, 90, 1), cam) || { k: 0 }).k < 0.2, 'thick cloud: diffuse light, almost no direction');
  assert.equal(W.worldSunTone(base, null, low), base); assert.equal(W.worldSunTone(base, [1, 0, 0], null), base);
  // the bake follows the sun in coarse buckets: an hour later is the same bucket, the other side of the sky is not
  const noon = W.worldSunLight(sky(58, 175, 0.2), cam), later = W.worldSunLight(sky(60, 200, 0.2), cam), evening = W.worldSunLight(sky(10, 280, 0.2), cam);
  assert.equal(noon.key, later.key, 'an hour inside the band: the same key (V5)');
  assert.notEqual(noon.key, evening.key);
});

test('K8: a generated building is drawn lit by the sun: the same wall, two suns, two colours', () => {
  const cam = camOf({ camera: { eye: 1.7, fov: 72, horizon: 500, heading: 0 } });
  const b = W.worldExtrudeBuilding({ id: 'g', foot: [[-20, 60], [20, 60], [20, 90], [-20, 90]], storeys: 6, style: 'baroque-civic' }, cam);
  const draw = (sun) => { const ctx = mockCtx(); W.worldExtrudeDraw(ctx, b, { vs: 1, ox: 0, oy: 0, sun }); return ctx.calls.filter(c => c[0] === 'fill').map(c => c[1]); };
  const flat = draw(null), lit = draw(W.worldSunLight({ sun: { alt: 12, az: 200 }, cover: 0 }, { heading: 0 })), other = draw(W.worldSunLight({ sun: { alt: 12, az: 150 }, cover: 0 }, { heading: 0 }));
  assert.equal(flat.length, lit.length);
  assert.notDeepEqual(flat, lit, 'the sun changes the faces');
  assert.notDeepEqual(lit, other, 'and a different sun, different faces');
});

/* ---------- the place itself ---------- */
test('K9: the Pier Head spec is short and validates clean; its buildings and ferry stand; the three Graces dominate the frame', () => {
  const item = (globalThis.__scPacks['world-test'] || []).find(i => i.id === 'liverpool-pier-head-1-w3');
  assert.ok(item, 'registered in the gallery pack');
  const spec = JSON.parse(JSON.stringify(W.worldHostSpec(item)));
  assert.equal(spec.v, 3); assert.equal(spec.place.style, 'waterfront-city'); assert.equal(spec.place.region, 'merseyside');
  assert.ok(spec.surfaces.length <= 6 && spec.entities.length <= 3 && spec.buildings.length === 3 && spec.life.length <= 8, 'short');
  assert.ok(!spec.fill && !spec.landmarks, 'no hand-placed dressing, no drawn landmarks: the generator draws the buildings');
  assert.ok(spec.buildings.every(b => b.style === 'baroque-civic' && typeof b.crown === 'string'), 'three civic buildings with crowns');
  assert.deepEqual(spec.buildings.map(b => b.crown).sort(), ['corner-dome', 'great-dome', 'twin-towers']);
  assert.deepEqual((W.worldValidate(JSON.parse(JSON.stringify(spec))).errors || []).map(e => e.rule + ' ' + e.path), [], 'validates clean');
  const world = W.worldBuild(JSON.parse(JSON.stringify(spec)), { season: 'summer' });
  assert.ok(world.entities.some(e => e.id === 'ferry-1'), 'the moored ferry stands on the water');
  assert.ok(!(world.log || []).some(r => r.action === 'drop' && /ferry|port|cunard|liver/.test(String(r.id))), 'nothing named is dropped');
  const cam = world.cam, prims = W.worldExtrude(world, cam, { season: 'summer' }).filter(p => p.kind === 'building' && p.direct);
  assert.equal(prims.length, 3, 'the three buildings are extruded');
  const tallest = Math.max(...prims.map(p => p.height)), top = Math.min(...prims.map(p => p.box[1]));
  assert.ok(tallest > 90, 'the Liver twin towers: ' + tallest + ' m');
  assert.ok(top > 8 && top < 320, 'the crowns are in the frame, not cut by its top edge: ' + top);
  const x0 = Math.min(...prims.map(p => p.box[0])), x1 = Math.max(...prims.map(p => p.box[2]));
  assert.ok(x1 - x0 > 600, 'the group spans over a third of the frame: ' + Math.round(x1 - x0) + ' px');
  for (const p of prims) assert.ok(p.direct.shapes.some(sh => sh.part === 'roof' && /^#[4-9a-f]/.test(sh.f)), p.id + ' has its crown');
});
