// World engine, package appearance: the PARAMETRIC MODEL system (docs/dev/WORLD_MODELS.md; src/app/79-world-4models.js).
// The registry, the parameters, the builder kit, the two hooks (worldExtrudeHull, the frame record), the entity's `model` key,
// the narrowboat on the registry, the sheet tool, and the conformance check over EVERY registered model (so the models the
// builders add are held to the same rules by this file, without their touching it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { modelSheet } from '../tools/lib/world/models.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const camOf = (o) => W.sceneCamera(Object.assign({ camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 } }, o || {}));
function mockCtx() {
  const calls = [];
  const ctx = { calls, globalAlpha: 1, fillStyle: '', strokeStyle: '', lineWidth: 1 };
  for (const n of ['save', 'restore', 'setTransform', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fill', 'stroke', 'clip', 'drawImage', 'quadraticCurveTo', 'bezierCurveTo', 'createRadialGradient', 'addColorStop']) ctx[n] = (...a) => { calls.push([n, ctx.fillStyle, ctx.globalAlpha, ...a]); return n === 'createRadialGradient' ? { addColorStop() {} } : undefined; };
  return ctx;
}
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const REGISTERED_AT_LOAD = W.worldModelIds();
/** The scratch models of the tests are removed at the start of every test (the registry is global to the loaded engine). */
const clean = () => W.worldModelIds().filter(i => /^(t.|test.)/.test(i)).forEach(i => W.worldModelRemove(i));

/** A model that uses every kit helper once: the worked example of WORLD_MODELS.md (a handcart on a library bench's footprint). */
function defineCart(id = 'test.cart', extra = {}) {
  return W.worldModelDefine(id, Object.assign({
    name: 'Test handcart', ids: ['street.bench'], sampleObj: 'street.bench',
    dims: () => ({ L: 2.4, B: 1.3, H: 2.2 }),
    liveries: [
      { name: 'green', body: '#3f6b46', trim: '#e6d9a8', awning: ['#b8433a', '#efe6d0'] },
      { name: 'blue', body: '#2f4f7a', trim: '#e8d8a0', awning: ['#2f6f8f', '#f1ead8'] },
      { name: 'red', body: '#8a2f2a', trim: '#e8c978', awning: ['#e0b43a', '#f4efe0'] },
    ],
    samples: [{ livery: 'green', age: 0.1 }, { livery: 'blue', age: 0.7 }, { livery: 'red', size: 1.2 }],
    build(p, h) {
      const L = p.L, B = p.B, lv = p.livery, a0 = -L / 2, a1 = L / 2, hb = B / 2, top = 1.95;
      h.contactShadow(a0, a1, -hb, hb);
      h.part('bed', { layer: 1 });
      h.box(a0 + 0.1, a1 - 0.3, -hb + 0.05, hb - 0.05, 0.55, 0.62, h.aged(lv.body, 'paint'), '#6e5a3e', 'timber', 'bed');
      h.box(a0 + 0.1, a1 - 0.3, -hb + 0.05, hb - 0.05, 0.62, 0.92, h.aged(lv.body, 'paint'), null, 'paint', 'body');
      h.part('wheels', { layer: 1 });
      for (const sg of [-1, 1]) h.wheel(a0 + 0.85, sg * (hb + 0.02), 0.34, 0.34, { w: 0.07, rim: h.aged('#8c6b3c', 'timber') });
      h.tube([a1 - 0.3, -0.35, 0.62], [a1 + 0.9, -0.28, 0.45], 0.025, '#6e5636', 'timber', 'shaft');
      h.part('awning', { layer: 2 });
      for (const [a, l] of [[a0 + 0.2, -hb + 0.1], [a0 + 0.2, hb - 0.1], [a1 - 0.4, -hb + 0.1], [a1 - 0.4, hb - 0.1]]) h.cyl(a, l, 0.9, top, 0.025, 0.025, '#4a3b2a', { mat: 'timber', role: 'post' });
      h.cloth([[a0 + 0.1, -hb, top], [a1 - 0.3, -hb, top], [a1 - 0.3, hb, top], [a0 + 0.1, hb, top]], 0.05, lv.awning[0], { stripe: lv.awning, nu: 6, role: 'awning' });
      h.rail([[a0 + 0.1, -hb + 0.05], [a0 + 0.1, hb - 0.05]], 0.92, 0.25, '#2a2a2c', { post: 0.4 });
      h.lamp(a1 - 0.35, hb - 0.1, 1.55, 0.07, { col: '#ffd890' });
      h.mast(a0 + 0.2, 0, top, top + 0.7, { r: 0.012 });
      h.cloth([[a0 + 0.2, 0, top + 0.65], [a0 - 0.15, 0, top + 0.6], [a0 - 0.15, 0, top + 0.45], [a0 + 0.2, 0, top + 0.45]], 0.03, '#c0392b', { nu: 3, role: 'flag' });
      h.gable(a0 + 0.1, a0 + 0.9, -hb + 0.1, hb - 0.1, 0.92, 1.35, '#7a3b2a', { over: 0.04, end: '#c9b48a', mat: 'tile' });
      const side = h.sees([0, 1, 0], [a0 + 0.5, hb, 1.1]) ? 1 : -1;
      const S = h.surface((u, v, off) => h.P(u, side * (hb - 0.1 + off), v), { normal: [0, side, 0] });
      S.windows({ u0: a0 + 0.28, u1: a0 + 0.8, v: 1.08, step: 0.3, kind: 'rect', w: 0.06, h: 0.07, glass: '#9fb3bd', trim: lv.trim });
      if (h.rnd() < 0.5) h.box(a0 + 1.0, a0 + 1.4, -0.2, 0.2, 0.92, 1.12, '#7a5a3c', null, 'timber', 'crate');
      return { height: top + 0.7 };
    },
  }, extra));
}
/** A small floating model: a hull of a plan outline, a cabin and a mast (a dinghy). */
function defineDinghy(id = 'test.dinghy') {
  return W.worldModelDefine(id, {
    name: 'Test dinghy', ids: ['boat.dinghy'], float: true, hullFallback: true,
    dims: () => ({ L: 4.2, B: 1.6, H: 3 }),
    build(p, h) {
      const { outline, half } = W.worldModelOutline({ L: p.L, B: p.B, bowLen: 1.4, stern: 'transom', sternLen: 0.3, step: 1 });
      h.part('hull');
      h.hullSides(outline, 0, (a) => 0.45 + 0.12 * Math.max(0, a / (p.L / 2)), '#c9c2b0', 'paint', 'hull');
      h.deck(outline, (a) => 0.45 + 0.12 * Math.max(0, a / (p.L / 2)), '#8a6a44', 'timber', 'deck');
      h.part('rig', { layer: 2 });
      h.mast(0.5, 0, 0.5, 3, { r: 0.04, spreader: 0.7 });
      void half;
      return { height: 3 };
    },
  });
}

test('the model API is loaded and the narrowboat is registered', () => {
  clean();
  for (const n of ['worldModelDefine', 'worldModelFor', 'worldModelHas', 'worldModelIds', 'worldModelGet', 'worldModelList', 'worldModelParams', 'worldModelBuild', 'worldModelBuildWith',
    'worldModelFit', 'worldModelSpecCheck', 'worldModelSizeOf', 'worldModelOutline', 'worldModelShade', 'worldModelMix', 'worldModelAge', 'worldModelCheck', 'worldModelError', 'worldModelSpriteOnly'])
    assert.equal(typeof W[n], 'function', n);
  assert.ok(REGISTERED_AT_LOAD.includes('narrowboat'));
  for (const o of ['boat.narrowboat', 'boat.widebeam', 'boat.canal-cruiser']) assert.equal(W.worldModelFor(o).id, 'narrowboat', o);
  assert.equal(W.worldModelFor('boat.dinghy'), null);
  assert.equal(W.worldModelHas('street.bench'), false);
});

test('registry: exact ids beat globs beat RegExps; a bad definition throws; a later definition replaces', () => {
  clean();
  W.worldModelDefine('t.re', { ids: [/^tmodel\./], build: () => ({}) });
  W.worldModelDefine('t.glob', { ids: ['tmodel.glob*'], build: () => ({}) });
  W.worldModelDefine('t.exact', { ids: ['tmodel.globby'], build: () => ({}) });
  assert.equal(W.worldModelFor('tmodel.other').id, 't.re');
  assert.equal(W.worldModelFor('tmodel.glob-1').id, 't.glob');
  assert.equal(W.worldModelFor('tmodel.globby').id, 't.exact');
  assert.throws(() => W.worldModelDefine('t.bad', { ids: ['x'] }), /build/);
  assert.throws(() => W.worldModelDefine('t.bad2', { ids: [], build() {} }), /ids/);
  assert.throws(() => W.worldModelDefine('', { ids: ['x'], build() {} }));
  W.worldModelDefine('t.exact', { ids: ['tmodel.elsewhere'], build: () => ({}) });
  assert.equal(W.worldModelFor('tmodel.globby').id, 't.glob', 'the redefinition moved the id');
  assert.equal(W.worldModelFor('tmodel.elsewhere').id, 't.exact');
});

test('parameters: a seed per entity, livery by name or index, size as a scale or metres, age, opts; the pure helpers', () => {
  clean();
  defineCart();
  const e = (o) => Object.assign({ id: 'c1', obj: 'street.bench', x: 0, z: 10, facing: 90 }, o || {});
  const a = W.worldModelParams(e(), {}), b = W.worldModelParams(e({ id: 'c2' }), {}), a2 = W.worldModelParams(e(), {});
  assert.equal(a.seed, a2.seed, 'one entity, one seed');
  assert.notEqual(a.seed, b.seed);
  assert.deepEqual([a.L, a.B, a.H], [2.4, 1.3, 2.2]);
  assert.equal(W.worldModelParams(e({ model: { livery: 'blue' } }), {}).liveryName, 'blue');
  assert.equal(W.worldModelParams(e({ model: { livery: 2 } }), {}).liveryName, 'red');
  assert.equal(W.worldModelParams(e({ model: { livery: 5 } }), {}).liveryIndex, 2, 'an index wraps');
  const big = W.worldModelParams(e({ model: { size: 1.5, age: 0.9 } }), {});
  assert.ok(Math.abs(big.L - 3.6) < 1e-9 && Math.abs(big.B - 1.95) < 1e-9 && Math.abs(big.H - 3.3) < 1e-9);
  assert.equal(big.age, 0.9);
  const m = W.worldModelParams(e({ model: { size: { l: 4 } } }), {});
  assert.equal(m.L, 4); assert.ok(Math.abs(m.B - 1.3 * 4 / 2.4) < 1e-9, 'the other dims follow the length');
  assert.equal(W.worldModelParams(e(), { season: 'winter' }).season, 'winter');
  assert.deepEqual(W.worldModelSizeOf('street.bench', { size: 2 }), { w: 4.8, d: 2.6, h: 4.4 });
  // the spec check
  assert.equal(W.worldModelSpecCheck({ livery: 'blue', size: 1.2, age: 0.3, seed: 4, opts: { decks: 2, funnel: 'red' } }), null);
  for (const bad of [{ colour: 'x' }, { size: 9 }, { age: 2 }, { seed: 1.5 }, { livery: -1 }, { opts: { x: {} } }, 'x', [1]]) assert.ok(W.worldModelSpecCheck(bad), JSON.stringify(bad));
  // colours
  assert.equal(W.worldModelShade('#808080', 0.5), '#404040');
  assert.equal(W.worldModelMix('#000000', '#ffffff', 0.5), '#808080');
  assert.equal(W.worldModelAge('#336699', 0, 'paint'), '#336699');
  assert.notEqual(W.worldModelAge('#336699', 1, 'paint'), '#336699');
  const lum = (h) => { const c = hexRgb(h); return c[0] + c[1] + c[2]; };
  assert.ok(lum(W.worldModelAge('#336699', 0.5, 'paint')) !== lum('#336699'));
  assert.ok(hexRgb(W.worldModelAge('#336699', 1, 'metal'))[0] > hexRgb('#336699')[0], 'metal rusts toward red');
});

test('build: real geometry from any angle, only the faces that face the eye, in painter order, deterministic and varied', () => {
  clean();
  defineCart();
  const cam = camOf();
  const E = (o) => Object.assign({ id: 'c1', obj: 'street.bench', x: 0, z: 9, y: 0, facing: 40, static: true }, o || {});
  const prim = W.worldModelBuild(E(), cam, { season: 'summer', strict: true });
  assert.ok(prim && prim.model && prim.kind === 'hull', 'a model prim');
  assert.equal(prim.modelId, 'test.cart');
  for (const r of ['body', 'post', 'awning', 'rim', 'window', 'lamp', 'gable', 'rail', 'mast']) assert.ok(prim.faces.some(f => f.role === r), 'has ' + r);
  assert.ok(prim.faces.some(f => f.line) && prim.faces.some(f => !f.line));
  // from every angle and three eyes: every face is finite, a face that carries its normal faces the eye (never a back face drawn)
  for (const eye of [0.6, 1.65, 7]) for (let k = 0; k < 16; k++) {
    const c = camOf({ camera: { eye, fov: 64, horizon: 468, heading: 0 } }), p = W.worldModelBuild(E({ facing: k * 22.5 }), c, { strict: true });
    assert.ok(p && p.faces.length > 20, `drawn from ${k * 22.5} at ${eye} m`);
    for (const f of p.faces) {
      assert.ok(f.pts.every(q => Number.isFinite(q[0]) && Number.isFinite(q[1])));
      if (f.n && f.pts.length >= 3) assert.ok(f.n.every(Number.isFinite), 'a normal');
    }
    // seen from above only the tops of things lie above (a top face's normal is up)
    const tops = p.faces.filter(f => f.n && f.role === 'body' && f.n[1] > 0.99).length;
    if (eye < 0.9) assert.equal(tops, 0, 'a top is never drawn from below its height');
  }
  // the painter's order: the shadow first, then the layers; within a layer far parts first
  const order = prim.faces.map(f => f.role);
  assert.equal(order[0], 'shadow', 'the contact shadow is drawn first');
  assert.ok(order.lastIndexOf('bed') < order.indexOf('post'), 'layer 1 before layer 2');
  // deterministic; instances differ
  const again = W.worldModelBuild(E(), cam, { strict: true });
  assert.deepEqual(JSON.parse(JSON.stringify(again.faces)), JSON.parse(JSON.stringify(W.worldModelBuild(E(), cam, { strict: true }).faces)));
  const sigs = new Set(), liv = new Set();
  for (let k = 0; k < 20; k++) { const p = W.worldModelBuild(E({ id: 'v' + k }), cam, {}); sigs.add(JSON.stringify(p.faces.map(f => f.hex))); liv.add(p.liveryName); }
  assert.ok(liv.size >= 3, 'every livery turns up over 20 carts: ' + [...liv]);
  assert.ok(sigs.size >= 6, `${sigs.size} different pictures of 20`);
  // size scales the geometry and the footprint
  const small = W.worldModelBuild(E({ model: { size: 0.5 } }), cam, {}), large = W.worldModelBuild(E({ model: { size: 2 } }), cam, {});
  const w = (p) => p.box[2] - p.box[0];
  assert.ok(w(large) > 1.7 * w(small), `size 2 is wider on screen than 0.5: ${w(large)} vs ${w(small)}`);
  const fw = (p) => Math.hypot(p.foot[1][0] - p.foot[0][0], p.foot[1][1] - p.foot[0][1]);
  assert.ok(Math.abs(fw(large) / fw(small) - 4) < 0.05, 'the footprint is true to size');
  // age: older paint is not the new paint
  const young = W.worldModelBuild(E({ model: { age: 0, livery: 'green' } }), cam, {}), old = W.worldModelBuild(E({ model: { age: 1, livery: 'green' } }), cam, {});
  const bodyHex = (p) => p.faces.find(f => f.role === 'body').hex;
  assert.notEqual(bodyHex(young), bodyHex(old));
  // season reaches the build
  let seen = null;
  W.worldModelDefine('test.season', { ids: ['street.bench'], build(p, h) { seen = p.season; h.box(-1, 1, -0.5, 0.5, 0, 1, '#888888', null, 'paint', 'body'); return {}; } });
  W.worldModelBuild(E(), cam, { season: 'autumn' });
  assert.equal(seen, 'autumn');
});

test('the kit helpers: wheel, tube, cyl, cloth with a belly, gable and hip roofs, rail runs, windows, the outline', () => {
  clean();
  const cam = camOf({ camera: { eye: 1.65, fov: 64, horizon: 468, heading: 0 } });
  const run = (fn, ent) => {
    W.worldModelDefine('test.kit', { ids: ['street.bench'], dims: () => ({ L: 2, B: 1, H: 1 }), build(p, h) { fn(h, p); return {}; } });
    return W.worldModelBuild(Object.assign({ id: 'k', obj: 'street.bench', x: 0, z: 8, y: 0, facing: 90, static: true }, ent || {}), cam, { strict: true });
  };
  // a wheel is a ring from any side: its tyre has the facets, its rim a disc, its spokes lines
  const wheel = run((h) => h.wheel(0, 0, 0.4, 0.4, { w: 0.1 }));
  assert.ok(wheel.faces.filter(f => f.role === 'tyre').length >= 8 && wheel.faces.some(f => f.role === 'rim') && wheel.faces.some(f => f.role === 'spoke' && f.line));
  // a belly: the cloth's middle stands off the flat quad; a flat cloth lies in the plane
  const flat = run((h) => h.cloth([[-1, -0.5, 1], [1, -0.5, 1], [1, 0.5, 1], [-1, 0.5, 1]], 0, '#ccc', { nu: 4, nv: 2 }));
  const belly = run((h) => h.cloth([[-1, -0.5, 1], [1, -0.5, 1], [1, 0.5, 1], [-1, 0.5, 1]], 0.4, '#ccc', { nu: 4, nv: 2 }));
  assert.equal(flat.faces.length, 8);
  assert.ok(belly.box[1] < flat.box[1] - 0.5 || belly.box[3] > flat.box[3] + 0.5, 'a belly changes the silhouette');
  const sail = run((h) => h.cloth([[-1, -0.5, 1], [1, -0.5, 1], [1, 0.5, 1], [-1, 0.5, 1]], 0.3, '#eeeeee', { seams: 2, role: 'sail' }));
  assert.ok(sail.faces.filter(f => f.line && f.role === 'sail-seam').length === 2, 'panel seams');
  assert.ok(sail.faces.filter(f => !f.line).length >= 6, 'cells by size on screen');
  // a V hull: the base is narrower than the deck
  const vh = run((h) => { h.hullSides([[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]], 0, 0.5, '#445566', 'paint', 'hull', { keel: 0.5 }); }, { facing: 0 });
  const wide = (q) => q.box[2] - q.box[0];
  const fl = run((h) => { h.hullSides([[-1, -0.5], [1, -0.5], [1, 0.5], [-1, 0.5]], 0, 0.5, '#445566', 'paint', 'hull', { keel: 1 }); }, { facing: 0 });
  assert.ok(vh.faces.length > 0 && fl.faces.length > 0 && wide(vh) <= wide(fl) + 1e-6);
  // a cylinder is faceted by size; a box shows at most three sides plus its top from above
  const bx = run((h) => h.box(-1, 1, -0.5, 0.5, 0, 1, '#aa8866', '#bb9977', 'paint', 'body'), { facing: 30 });
  assert.ok(bx.faces.length >= 2 && bx.faces.length <= 4, 'a box seen from outside: ' + bx.faces.length);
  const cyl = run((h) => h.cyl(0, 0, 0, 1, 0.3, 0.3, '#999999', { role: 'post' }));
  assert.ok(cyl.faces.length >= 3 && cyl.faces.length <= 8, 'half the facets of a cylinder face the eye: ' + cyl.faces.length);
  // gable and hip roofs
  const g = run((h) => h.gable(-1, 1, -0.5, 0.5, 0.5, 1, '#884433', { over: 0.05 }), { facing: 20 });
  assert.ok(g.faces.some(f => f.role === 'roof') && g.faces.some(f => f.role === 'gable'));
  const hp = run((h) => h.hip(-1, 1, -0.5, 0.5, 0.5, 1, '#884433'), { facing: 20 });
  assert.ok(hp.faces.filter(f => f.role === 'roof').length >= 2);
  // a rail run: a top rail line and posts
  const rl = run((h) => h.rail([[-1, 0], [1, 0]], 0, 0.9, '#222222', { post: 0.5 }));
  assert.ok(rl.faces.every(f => f.line) && rl.faces.length >= 4);
  // windows on a surface: lit by the seeded rule, dark ones never light
  const win = run((h) => { const s = h.surface((u, v, off) => h.P(u, 0.5 + off, v), { normal: [0, 1, 0] }); s.windows({ u0: -0.8, u1: 0.8, v: 0.5, step: 0.4, kind: 'port', r: 0.1 }); }, { facing: 90 });
  const panes = win.faces.filter(f => f.role === 'window');
  assert.ok(panes.length >= 3 && panes.every(f => f.lit && f.halo && (f.theta === 2 || f.theta >= 0 && f.theta < 1)));
  // the outline: closed, symmetric about the keel, widest amidships, a stem at the bow
  const O = W.worldModelOutline({ L: 12, B: 3, stern: 'round' });
  const maxL = Math.max(...O.outline.map(q => q[1])), minL = Math.min(...O.outline.map(q => q[1]));
  assert.ok(Math.abs(maxL - 1.5) < 1e-9 && Math.abs(minL + 1.5) < 1e-9);
  assert.ok(Math.max(...O.outline.map(q => q[0])) === 6 && Math.min(...O.outline.map(q => q[0])) >= -6);
  assert.ok(O.half(6) < 0.05 && O.half(0) === 1.5);
});

test('night: lamps and lit windows are emissive and glow after dusk; by day they are plain', () => {
  clean();
  defineCart();
  const cam = camOf();
  const prim = W.worldModelBuild({ id: 'c1', obj: 'street.bench', x: 0, z: 9, y: 0, facing: 40, static: true }, cam, {});
  const lamp = prim.faces.find(f => f.role === 'lamp');
  assert.equal(lamp.theta, 0); assert.ok(lamp.lit && lamp.halo);
  assert.ok(prim.lights.length === 1 && prim.lights[0].kind === 'lamp' && prim.lights[0].z > 0, 'a world light for the engine');
  const day = mockCtx(), night = mockCtx();
  W.worldExtrudeDraw(day, prim, { night: false });
  W.worldExtrudeDraw(night, prim, { night: true, windowShare: 0.7 });
  const fills = (c, col) => c.calls.filter(k => k[0] === 'fill' && k[1] === col).length;
  assert.equal(fills(day, lamp.lit), 0, 'no lit glass by day');
  assert.ok(fills(night, lamp.lit) >= 1, 'the lamp is lit at night');
  assert.ok(night.calls.some(k => k[0] === 'createRadialGradient'), 'with a glow');
});

test('the sun tones a face by its normal; the narrowboat keeps its own sky light', () => {
  clean();
  defineCart();
  const cam = camOf();
  const prim = W.worldModelBuild({ id: 'c1', obj: 'street.bench', x: 0, z: 9, y: 0, facing: 40, static: true }, cam, {});
  assert.equal(prim.sunLit, true);
  assert.ok(prim.faces.filter(f => f.n).length > 10);
  const cols = (sun) => { const c = mockCtx(); W.worldExtrudeDraw(c, prim, { sun, night: false }); return c.calls.filter(k => k[0] === 'fill').map(k => k[1]); };
  const lowSun = { v: [-0.7, 0.3, -0.64], k: 0.9, warm: 0.8, key: 'x' }, none = cols(null), lit = cols(lowSun);
  assert.equal(none.length, lit.length);
  assert.ok(lit.some((c, i) => c !== none[i]), 'a low sun changes some colours');
  const nb = W.worldExtrudeHull({ id: 'nb', obj: 'boat.narrowboat', x: 0, z: 30, y: -0.5, waterline: -0.45, facing: 20, static: true }, cam, {});
  assert.equal(nb.sunLit, false, 'the narrowboat is shaded by its baked sky light only');
  assert.ok(nb.faces.every(f => !f.n));
});

test('a floater: the hull starts at the waterline, nothing below it, never cut, a bob only with a time', () => {
  clean();
  defineDinghy();
  const cam = camOf();
  const E = (o) => Object.assign({ id: 'd1', obj: 'boat.dinghy', x: 0, z: 14, y: -0.57, waterline: -0.45, facing: 70, static: true }, o || {});
  const p = W.worldModelBuild(E(), cam, { strict: true });
  assert.equal(p.noCut, true); assert.equal(p.waterline, -0.45);
  const yRow = (y) => cam.horizon + cam.f * (cam.eye - y) / 14;
  const lowest = Math.max(...p.faces.filter(f => f.role === 'hull').flatMap(f => f.pts.map(q => q[1])));
  assert.ok(lowest <= yRow(-0.45) + cam.f * 0.9 / 14 * 0.5, 'the hull stands on the waterline');
  const still = W.worldModelBuild(E(), cam, {}), still2 = W.worldModelBuild(E(), cam, {});
  assert.deepEqual(still.box, still2.box);
  const bobs = new Set();
  for (let t = 0; t < 8; t += 0.7) bobs.add(W.worldModelBuild(E(), cam, { t }).box.join(','));
  assert.ok(bobs.size >= 3, 'it bobs with time');
  const moving = W.worldModelBuild(E({ vx: 1, vz: 0.2, static: false }), cam, { t: 1 });
  assert.ok(moving.faces.length > 0, 'a cruising boat builds from its velocity');
  // a floater with no waterline entity (on dry land) stands on its y
  const dry = W.worldModelBuild(E({ waterline: null, y: 0 }), cam, {});
  assert.equal(dry.waterline, null);
});

test('hooks: worldExtrudeHull draws a registered model; a failed build falls back (a sprite for a land model, the art hull for a floater)', () => {
  clean();
  defineCart();
  const cam = camOf();
  const bench = { id: 'b1', obj: 'street.bench', x: 0, z: 9, y: 0, facing: 40, static: true };
  const viaHull = W.worldExtrudeHull(bench, cam, {});
  assert.ok(viaHull && viaHull.model && viaHull.modelId === 'test.cart');
  assert.ok(W.worldExtrude({ cam, entities: [bench], lines: [], buildings: [] }, cam).some(q => q.modelId === 'test.cart'), 'worldExtrude lists a model even when the library says it is not a hull');
  // a model that throws: no throw out of the build, the error is kept, a land object falls back to its sprite (null here)
  W.worldModelDefine('test.cart', { ids: ['street.bench'], build() { throw new Error('boom'); } });
  assert.equal(W.worldModelBuild(bench, cam, {}), null);
  assert.match(W.worldModelError().message, /boom/);
  assert.equal(W.worldExtrudeHull(bench, cam, {}), null, 'a land model that fails is drawn by its sprite');
  assert.throws(() => W.worldModelBuild(bench, cam, { strict: true }), /boom/);
  // a build that draws nothing is a failed build too
  W.worldModelDefine('test.cart', { ids: ['street.bench'], build() { return {}; } });
  assert.equal(W.worldModelBuild(bench, cam, {}), null);
  // a floater that fails keeps the library's art hull (a boat with art still draws)
  W.worldModelDefine('test.ferry', { ids: ['boat.ferry'], float: true, build() { throw new Error('no ferry'); } });
  const f = W.worldExtrudeHull({ id: 'f1', obj: 'boat.ferry', x: 0, z: 60, y: -0.8, waterline: -0.45, facing: 60, static: true }, cam, {});
  assert.ok(f && !f.model, 'the art hull of the library ferry');
});

test('the frame record draws a model for an entity that carries `model`; its size and footprint follow', () => {
  clean();
  defineCart();
  const spec = { v: 3, place: { lat: 51.5, lon: -0.1, region: 'london' }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 0 },
    surfaces: [{ id: 'pave', kind: 'plaza', poly: [[-40, 3], [40, 3], [40, 80], [-40, 80]] }],
    entities: [{ id: 'cart-a', obj: 'street.bench', at: [-3, 14], facing: 80, model: { livery: 'blue', size: 1.5, age: 0.6, seed: 7 } },
      { id: 'cart-b', obj: 'street.bench', at: [4, 18], facing: 200 }],
    backdrop: { style: 'canal-wooded' }, seed: 3 };
  const v = W.worldValidate(spec);
  assert.deepEqual(v.errors.filter(e => /model/.test(e.path)), [], 'a valid model key');
  const w = W.worldBuild(JSON.parse(JSON.stringify(spec)), { fill: false });
  const A = w.entities.find(e => e.id === 'cart-a'), B = w.entities.find(e => e.id === 'cart-b');
  assert.deepEqual(A.model, spec.entities[0].model);
  assert.ok(Math.abs(A.size.w - 3.6) < 1e-6 && Math.abs(A.size.d - 1.95) < 1e-6, 'size scales the descriptor: ' + JSON.stringify(A.size));
  assert.ok(Math.abs(A.height - 3.3) < 1e-6);
  const span = (e) => { const xs = e.foot.map(q => q[0]), zs = e.foot.map(q => q[1]); return Math.max(Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs))); };
  assert.ok(span(A) > 1.2 * span(B), 'the footprint of the 1.5 x cart is larger: ' + span(A) + ' vs ' + span(B));
  const plan = W.worldFramePlan(w, { season: 'summer', backdrop: false });
  const ra = plan.recs.find(r => r.ent.id === 'cart-a'), rb = plan.recs.find(r => r.ent.id === 'cart-b');
  assert.ok(ra && ra.prim && ra.prim.model && ra.prim.liveryName === 'blue', 'the record is the model');
  assert.ok(rb && rb.prim && rb.prim.model, 'a bench with no model key is the model with seeded parameters');
  assert.equal(ra.cut, null);
  // bad keys
  for (const [bad, why] of [[{ colour: 'red' }, /model\.colour/], [{ size: 12 }, /size/], [{ age: -1 }, /age/]]) {
    const s2 = JSON.parse(JSON.stringify(spec)); s2.entities[0].model = bad;
    const r = W.worldValidate(s2);
    assert.ok(r.errors.some(e => /model/.test(e.path) && why.test(e.msg)), JSON.stringify(bad) + ' -> ' + JSON.stringify(r.errors.map(e => e.msg)));
  }
  const s3 = JSON.parse(JSON.stringify(spec)); s3.entities.push({ id: 'duck', obj: 'bird.mallard', at: [0, 20], model: { size: 1 } });
  assert.ok(W.worldValidate(s3).errors.some(e => /no parametric model/.test(e.msg)), 'a model key on an object with no model is reported');
});

test('narrowboat on the registry: the model of the canal, its liveries by family, a scene livery and size', () => {
  clean();
  const cam = camOf();
  const E = (o) => Object.assign({ id: 'nb', obj: 'boat.narrowboat', x: 0, z: 30, y: -0.511, waterline: -0.45, facing: 20, static: true }, o || {});
  const a = W.worldExtrudeHull(E(), cam, {}), b = W.worldModelBuild(E(), cam, {}), c = W.worldExtrudeBoatModel(E(), cam, {});
  assert.deepEqual(JSON.parse(JSON.stringify(a.faces)), JSON.parse(JSON.stringify(b.faces)));
  assert.deepEqual(JSON.parse(JSON.stringify(a.faces)), JSON.parse(JSON.stringify(c.faces)));
  assert.equal(a.modelId, 'narrowboat'); assert.equal(a.noCut, true);
  // the scene asks for a livery and a size
  const liv = W.worldModelBuild(E({ model: { livery: 2 } }), cam, {});
  assert.equal(liv.livery, 2);
  assert.equal(W.WORLD_BOAT_LIVERIES[2].stern, liv.stern);
  const big = W.worldModelBuild(E({ model: { size: 1.3 } }), cam, {});
  assert.ok(big.foot && Math.hypot(big.foot[1][0] - big.foot[0][0], big.foot[1][1] - big.foot[0][1]) > 1.25 * Math.hypot(a.foot[1][0] - a.foot[0][0], a.foot[1][1] - a.foot[0][1]));
  // the variant still picks the family when the scene names none
  for (const v of [0, 1, 2]) assert.equal(W.worldModelBuild(E({ variant: v, id: 'v' + v }), cam, {}).livery % 3, v);
});

test('conformance: every registered model builds from every angle, finite, within its budget, deterministic and not a clone', () => {
  clean();
  for (const id of W.worldModelIds()) {
    if (/^(t\.|test\.)/.test(id)) continue;   // the registry tests' own scratch models
    const r = W.worldModelCheck(id);
    assert.deepEqual(r.problems, [], `${id}: ${r.problems.join('; ')}`);
    assert.ok(r.stats.built > 100, id + ' builds');
  }
  // the check itself catches what it should
  W.worldModelDefine('test.bad', { ids: ['street.bench'], dims: () => ({ L: 2, B: 1, H: 1 }), build(p, h) { h.box(-1, 1, -0.5, 0.5, 0, 1, '#zzz', null, 'paint', 'body'); return {}; } });
  assert.ok(W.worldModelCheck('test.bad').problems.some(m => /not #rrggbb/.test(m)));
  W.worldModelDefine('test.clone', { ids: ['street.bench'], dims: () => ({ L: 2, B: 1, H: 1 }), build(p, h) { h.box(-1, 1, -0.5, 0.5, 0, 1, '#888888', null, 'paint', 'body'); return {}; } });
  assert.ok(W.worldModelCheck('test.clone').problems.some(m => /clones/.test(m)));
  W.worldModelDefine('test.empty', { ids: ['street.bench'], dims: () => ({ L: 2, B: 1, H: 1 }), build() { return {}; } });
  assert.ok(W.worldModelCheck('test.empty').problems.some(m => /drew nothing/.test(m)));
  W.worldModelDefine('test.nan', { ids: ['street.bench'], dims: () => ({ L: 2, B: 1, H: 1 }), build(p, h) { h.line([h.P(0, 0, 0), h.P(NaN, 0, 1)], 0.1, '#444444', 'metal', 'x'); h.box(-1, 1, -0.5, 0.5, 0, 1, '#888888', null, 'paint', 'body'); return {}; } });
  assert.ok(W.worldModelCheck('test.nan').problems.length >= 1);
});

test('the model sheet tool draws a model from 8 angles, seasons, night, afloat, sizes and its sprite, without an error', () => {
  clean();
  defineCart();
  defineDinghy();
  for (const id of ['narrowboat', 'test.cart', 'test.dinghy']) {
    const r = modelSheet(W, id, { full: true, angles: 8 });
    assert.deepEqual(r.errors, [], id);
    assert.equal(r.png.subarray(1, 4).toString('latin1'), 'PNG');
    assert.ok(r.width === 1760 && r.height > 1500, `${r.width} x ${r.height}`);
    assert.ok(r.cells.length >= 16, id + ' cells: ' + r.cells.length);
    assert.ok(r.cells.every(c => c.faces > 5));
  }
  assert.throws(() => modelSheet(W, 'no-such-model'), /no model/);
});

test('the 20-line example of WORLD_MODELS.md runs: it defines a model that passes the conformance check and draws a sheet', () => {
  clean();
  const md = readFileSync(join(ROOT, 'docs', 'dev', 'WORLD_MODELS.md'), 'utf8');
  const sec = md.slice(md.indexOf('## 2. Add a model in 20 lines'));
  const m = new RegExp("```" + 'js' + "\\" + 'n([' + "\\s\\S" + ']*?)' + "```").exec(sec);
  assert.ok(m, 'the example block');
  assert.ok(m[1].split('\n').length <= 24, 'about 20 lines');
  const before = new Set(W.worldModelIds());
  new Function('worldModelDefine', m[1].replace("worldModelDefine('street-lamp'", "worldModelDefine('test.street-lamp'"))(W.worldModelDefine);
  const id = W.worldModelIds().find(i => !before.has(i));
  assert.equal(id, 'test.street-lamp');
  const r = W.worldModelCheck(id);
  assert.deepEqual(r.problems, []);
  const sheet = modelSheet(W, id, { angles: 8 });
  assert.deepEqual(sheet.errors, []);
});
