// World engine: trees, plants and their seasons (requirements S1, V2, V3, K4). ONE source of seasonal state: an entity's leaf
// state (kb worldKbState) picks the library's seasonal art (look worldMaterialArtSeason); the material never seasons that art
// again and never drops its shapes. Bugs this guards (15 Oct audit): every tree lost its crown in winter (the winter art's
// branch skeleton is part 'crown', material 'leaf', and was dropped as "leaves on a bare tree"); far trees, hedges and
// brambles drawn as one 'body' vanished; herbs were 'turn' all winter and got an orange tint in January and April; buddleia
// flower spikes were 'leaf'; near willows' fronds were magnified into flat bars.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWorld } from '../tools/lib/world/load.mjs';

const W = loadWorld(undefined, { extra: 'globalThis.__wfrLineK = typeof _wfrLineK === "function" ? _wfrLineK : null;' });
const DATES = { winter: [0, 20], spring: [3, 108], summer: [6, 197], autumn: [9, 295], lateAutumn: [10, 325], march: [2, 75] };
const ids = W.sceneObjs().map(o => (typeof o === 'string' ? o : o.id)).filter(id => /^(tree|plant|hedge)\./.test(id));
const kbOf = (id) => { try { return W.worldKb(id); } catch (e) { return null; } };
const leafy = ids.filter(id => { const kb = kbOf(id); return kb && kb.leaf; });
const mctxAt = ([month, doy]) => W.worldMaterialCtx({ month, doy, lat: 51.3 });
const hsl = (hex) => {
  const n = parseInt(String(hex).slice(1, 7), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
};
/** The shapes the sprite path draws for an entity now: its art season's shapes, minus the ones its materials drop. */
function drawn(id, date, key) {
  const mc = W.worldMaterialFor(mctxAt(date), { id: key, obj: id, x: 0, z: 20 });
  const sh = W.sceneObjShapes(id, 0, mc.art || 'summer');
  const out = [];
  for (const p of sh.still || sh.order) for (const s of sh.parts[p] || []) {
    const mat = W.worldMaterialOf(id, p, typeof s.f === 'string' ? s.f : null, s);
    if (!W.worldMaterialVisible(mat, mc)) continue;
    const b = W.scenePathBox(s.d, s.m);
    if (b) out.push({ p, s, mat, b });
  }
  return { mc, sh, out };
}

test('the library has seasonal plant art to test (trees, shrubs, reeds, hedges)', () => {
  assert.ok(leafy.length > 150, 'plants with a leaf habit: ' + leafy.length);
  assert.ok(leafy.filter(id => id.startsWith('tree.')).length > 80);
});

test('every tree keeps its crown (or its winter branches) in every season: shapes in the top 40 % of its box', () => {
  const bad = [];
  for (const id of leafy.filter(x => x.startsWith('tree.'))) {
    const kb = kbOf(id);
    if (kb && kb.cls !== 'tree') continue;   // boughs, fronds and trunks used as frames hang from the edge by design
    for (const [name, date] of Object.entries(DATES)) for (const key of ['a', 'b', 'c']) {
      const { sh, out } = drawn(id, date, id + key);
      const top = sh.box[1] + 0.4 * (sh.box[3] - sh.box[1]);
      if (!out.some(o => o.b[1] < top)) bad.push(`${id} ${name}`);
    }
  }
  assert.deepEqual([...new Set(bad)], [], 'trees drawn without a crown');
});

test('nothing with leaves vanishes in winter: far trees, hedges, brambles and herbs still draw (S1: bare, never absent)', () => {
  const bad = [];
  for (const id of leafy) for (const [name, date] of Object.entries(DATES)) {
    const { out } = drawn(id, date, id);
    if (!out.length) bad.push(`${id} ${name}`);
  }
  assert.deepEqual(bad, []);
});

test('one source of seasonal state: a seasonal art is never re-tinted by the material season model', () => {
  let n = 0;
  for (const id of leafy) for (const date of Object.values(DATES)) {
    const { mc, out } = drawn(id, date, id);
    if (!mc.artOwn) continue;
    const c = Object.assign({}, mc, { sky: null, L: null, haze: 0 });
    for (const o of out) {
      const hex = typeof o.s.f === 'string' ? o.s.f : typeof o.s.s === 'string' ? o.s.s : null;
      if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) continue;
      assert.equal(W.worldMaterialColour(o.mat, hex, c).toLowerCase(), hex.toLowerCase(), `${id} ${o.p} ${o.mat} in month ${mc.month}`);
      n++;
    }
  }
  assert.ok(n > 5000, 'shapes checked: ' + n);
});

test('the leaf state picks the art: bare -> winter skeleton, bud -> spring, turning -> autumn, unevenly per tree', () => {
  const oak = 'tree.bank-oak';
  assert.equal(W.worldMaterialFor(mctxAt(DATES.winter), { id: 'o1', obj: oak, x: 0, z: 20 }).art, 'winter');
  assert.equal(W.worldMaterialFor(mctxAt(DATES.summer), { id: 'o1', obj: oak, x: 0, z: 20 }).art, 'summer');
  assert.equal(W.worldMaterialFor(mctxAt(DATES.lateAutumn), { id: 'o1', obj: oak, x: 0, z: 20 }).art, 'autumn');
  // mid October: some trees still green, some turned (S1 "turning unevenly")
  const arts = new Set(Array.from({ length: 30 }, (_, i) => W.worldMaterialFor(mctxAt([9, 290]), { id: 'k' + i, obj: oak, x: 0, z: 20 }).art));
  assert.ok(arts.has('summer') && arts.has('autumn'), [...arts].join(','));
  // evergreens follow the scene season (their own winter art), never 'bare'
  const pine = leafy.find(id => /pine/.test(id) && kbOf(id).leaf === 'evergreen');
  assert.ok(pine);
  assert.notEqual(W.worldMaterialFor(mctxAt(DATES.winter), { id: 'p', obj: pine, x: 0, z: 20 }).leaf, 'bare');
});

test('herbs are dormant (bare, the winter art), not turning, through the winter; they turn in autumn', () => {
  const reed = W.worldKb('plant.reed');
  assert.equal(W.worldKbState(reed, { doy: 20 }, 'r').leaf, 'bare', 'January');
  assert.equal(W.worldKbState(reed, { doy: 75 }, 'r').leaf, 'bare', 'March');
  assert.equal(W.worldKbState(reed, { doy: 200 }, 'r').leaf, 'full', 'July');
  assert.equal(W.worldKbState(reed, { doy: 290 }, 'r').leaf, 'turn', 'October');
  assert.equal(W.worldKbState(reed, { doy: 350 }, 'r').leaf, 'bare', 'December');
});

test('season colours: no autumn orange on herbs and shrubs in January or March, reeds are straw in winter, no purple leaves', () => {
  const orange = (hex) => { const [h, s, l] = hsl(hex); return h >= 15 && h < 45 && s > 0.55 && l > 0.3 && l < 0.7; };
  const bad = [];
  for (const id of leafy) {
    const kb = kbOf(id);
    if (!kb || kb.leaf === 'evergreen' || /maple|momiji|beech|oak|bracken|dogwood|cornus|robin|heather|holly|haw|berry|rose|cotoneaster/.test(id)) continue;
    for (const name of ['winter', 'march']) {
      const { mc, out } = drawn(id, DATES[name], id);
      const c = Object.assign({}, mc, { sky: null, L: null, haze: 0 });
      const cols = out.filter(o => o.mat === 'leaf' || o.mat === 'reed').map(o => (typeof o.s.f === 'string' ? o.s.f : o.s.s)).filter(h => typeof h === 'string' && h[0] === '#')
        .map(h => W.worldMaterialColour('leaf', h, c));
      const share = cols.length ? cols.filter(orange).length / cols.length : 0;
      if (share > 0.5) bad.push(`${id} ${name} ${Math.round(share * 100)} % orange`);
    }
  }
  assert.deepEqual(bad, []);
  // reeds in January: straw (low saturation, yellow-brown hue)
  const { mc, out } = drawn('plant.reed', DATES.winter, 'r');
  for (const o of out) {
    const [h, s] = hsl(W.worldMaterialColour(o.mat, o.s.f || o.s.s, Object.assign({}, mc, { sky: null, L: null, haze: 0 })));
    assert.ok(s < 0.45 && h > 25 && h < 75, 'straw reed: ' + (o.s.f || o.s.s));
  }
  // flower heads are flowers: no purple shape is classed 'leaf' (buddleia spikes read as purple leaves)
  const purple = [];
  for (const id of leafy) {
    const sh = W.sceneObjShapes(id, 0, 'summer');
    for (const p of sh.order) for (const s of sh.parts[p] || []) {
      const hex = typeof s.f === 'string' ? s.f : null;
      if (!hex) continue;
      const [h, sat] = hsl(hex);
      if (h > 255 && h < 320 && sat > 0.3 && W.worldMaterialOf(id, p, hex, s) === 'leaf') purple.push(`${id} ${p} ${hex}`);
    }
  }
  assert.deepEqual([...new Set(purple.map(x => x.split(' ').slice(0, 2).join(' ')))], [], 'purple shapes classed as leaf');
});

test('a brown or grey stroke in a crown is bark (the winter skeleton), a green fill stays leaf', () => {
  assert.equal(W.worldMaterialOf('tree.bank-oak', 'crown', null, { s: '#4e4034', w: 2 }), 'bark');
  assert.equal(W.worldMaterialOf('tree.bank-oak', 'crown', '#46703a', { f: '#46703a' }), 'leaf');
});

test('frost and snow baked into winter art follow the day\'s weather (V1, S2): no white rime on a mild day', () => {
  assert.equal(W.worldMaterialRime('#f4f8fa', { frost: 0, snowDay: false }), 0, 'kit frost on a mild day');
  assert.equal(W.worldMaterialRime('#f4f7fb', { frost: 0 }), 0, 'kit snow on a day without snow');
  assert.equal(W.worldMaterialRime('#f4f8fa', { frost: 0.6 }), 0.6, 'a frosty morning');
  assert.equal(W.worldMaterialRime('#f4f8fa', { snowDay: true, snow: 0.8 }), 1, 'a snow day');
  for (const warm of ['#fff4f6', '#e8e4dc', '#f6c9d7', '#ffffff', '#cfe0ea']) assert.equal(W.worldMaterialRime(warm, { frost: 0 }), 1, warm + ' is not rime');
  // the winter hawthorn's rime twigs exist in the art (so the rule has something to do)
  const sh = W.sceneObjShapes('tree.hawthorn', 0, 'winter');
  assert.ok(Object.values(sh.parts).flat().some(s => W.worldMaterialRime(s.s || s.f, { frost: 0 }) === 0));
});

test('line-weight LOD: a near tree\'s thin strokes stay thin; limbs keep their true scale', () => {
  const K = globalThis.__wfrLineK;
  assert.equal(typeof K, 'function');
  assert.equal(K(2.6, 1), 1, 'at art scale nothing changes');
  assert.ok(2.6 * 3.4 * K(2.6, 3.4) <= 2.6 * 1.6 + 1e-9, 'a frond at 3.4x is at most 1.6x its art width');
  assert.equal(K(8, 3.4), 1, 'a limb is drawn at true scale');
  assert.ok(K(4.5, 3.4) > K(2.6, 3.4) && K(4.5, 3.4) < 1, 'blended between');
});

// (merge of 15 Oct) the art season is chosen when the frame plan makes the record (render's _wfrFormOf, the same
// worldMaterialArtSeason), so the record box IS the drawn art's own box: a winter skeleton or a tree still in summer leaf in an
// autumn scene always fits its record (the union of the four arts that _wfrArtBox took is no longer needed)
test('a plant\'s record box is the box of the art it is drawn in (chunk bitmaps and culling are cut to it)', () => {
  const spec = { v: 3, place: { lat: 51.29, lon: -0.82 }, camera: { eye: 1.65, fov: 64, horizon: 470, heading: 0 }, fill: false, seed: 1,
    surfaces: [{ id: 'g', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 400], [-200, 400]] }],
    entities: ['tree.bank-oak', 'tree.bank-birch', 'tree.pond-willow', 'tree.hawthorn'].map((obj, i) => ({ obj, at: [-12 + 8 * i, 30 + 4 * i], id: 't' + i })) };
  const seen = new Set();
  for (const [season, [month, doy]] of [['winter', DATES.winter], ['summer', DATES.summer], ['autumn', DATES.autumn]]) {
    const world = W.worldBuild(spec, { season });
    const plan = W.worldFramePlan(world, { season, ctx: { month, doy, lat: 51.29, lon: -0.82, season }, backdrop: false });
    for (let i = 0; i < 4; i++) {
      const r = plan.recs.find(q => q.ent && q.ent.id === 't' + i);
      assert.ok(r && ['spring', 'summer', 'autumn', 'winter'].includes(r.season), 't' + i + ' ' + season);
      seen.add(r.season);
      const q = W.sceneObjShapes(r.o, r.v, r.season).box, k = r.s;
      assert.ok(Math.abs((r.box.y1 - r.box.y0) - (q[3] - q[1]) * k) < 1e-6 && Math.abs((r.box.x1 - r.box.x0) - (q[2] - q[0]) * k) < 1e-6, `${r.o} ${season}: the record box is its ${r.season} art's box`);
    }
  }
  assert.ok(seen.has('winter') && seen.has('summer'), 'records were made in their own art seasons: ' + [...seen].join());
});
