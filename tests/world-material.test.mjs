// World engine, package look: MATERIALS (docs/dev/WORLD_ENGINE.md 2.6, 15.2; requirements V2, S2, L5). Colour comes from
// materials, never from baked colours: season and leaf state, light, weather (wet, frost, snow) and haze of depth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { sceneSourceFiles } from '../tools/lib/scene-page.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOOK = ['79-world-4backdrop.js', '79-world-4light.js', '79-world-4material.js', '79-world-4water.js'];
const NAMES = ['WORLD_MATERIALS', 'worldMaterialOf', 'worldMaterialCtx', 'worldMaterialFor', 'worldMaterialColour', 'worldMaterialVisible', 'worldMaterialSnow', 'worldMaterialKey',
  'worldSkyOf', 'sceneObjShapes', 'sceneObjs'];
const files = sceneSourceFiles(ROOT, { browser: true, fixtures: false }).filter(f => !/79-world-/.test(f.split(/[\\/]/).pop())).concat(LOOK.map(f => join(ROOT, 'src', 'app', f)));
const load = (pre = '') => new vm.Script('(function () {\n' + pre + files.map(f => readFileSync(f, 'utf8')).join('\n;\n') +
  `\n;return { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };\n})`, { filename: 'material-bundle.js' }).runInThisContext()();
const W = load();

const FLEET = { lat: 51.28, lon: -0.84 };
const at = (y, m, d, h) => Date.UTC(y, m - 1, d, h);
const rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = (h) => { const [r, g, b] = rgb(h); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
const sat = (h) => { const c = rgb(h).map(v => v / 255), mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };
const dist = (a, b) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
// a material context for a month at Fleet at noon (no light step: season and weather only, unless asked)
const mctx = (month, o = {}) => Object.assign(W.worldMaterialCtx({ month, doy: Math.round(month * 30.4 + 15), lat: FLEET.lat, weather: o.weather || 'clear', snowDay: !!o.snowDay, snowDepth: o.snowDepth, frost: o.frost }, { sky: o.sky || null }), o.sky ? {} : { sky: null });

test('every part has a material: from the part name, else the object category and the fill', () => {
  for (const m of ['bark', 'leaf', 'needle', 'grass', 'reed', 'flower', 'brick', 'stone', 'slate', 'tile', 'render', 'timber', 'paint', 'metal', 'glass', 'water', 'skin', 'fabric', 'fur', 'feather', 'tarmac', 'paving', 'gravel', 'soil'])
    assert.ok(W.WORLD_MATERIALS[m], m);
  assert.equal(W.worldMaterialOf('tree.oak', 'crown', '#4f8538'), 'leaf');
  assert.equal(W.worldMaterialOf('tree.oak', 'trunk', '#5d4c3c'), 'bark');
  assert.equal(W.worldMaterialOf('tree.oak', 'body', '#5d4c3c'), 'bark');
  assert.equal(W.worldMaterialOf('tree.oak', 'body', '#4f8538'), 'leaf');
  assert.equal(W.worldMaterialOf('tree.scots-pine', 'body', '#2f5b44'), 'needle');
  assert.equal(W.worldMaterialOf('boat.narrowboat', 'hull', '#2a5a3a'), 'paint');
  assert.equal(W.worldMaterialOf('building.terrace-victorian', 'body', '#4a5058'), 'slate');
  assert.equal(W.worldMaterialOf('building.terrace-victorian', 'body', '#9a4a32'), 'brick');
  assert.equal(W.worldMaterialOf('building.terrace-victorian', 'body', '#ece4d4'), 'render');
  assert.equal(W.worldMaterialOf('building.terrace-victorian', 'glint', '#cfe0ea'), 'glass');
  assert.equal(W.worldMaterialOf('ground.grass-tufts', 'body', '#5f8f3a'), 'grass');
  assert.equal(W.worldMaterialOf('vehicle.car', 'wheels', '#202020'), 'metal');
  assert.equal(W.worldMaterialOf('person.walker', 'body', '#2a3a5a'), 'fabric');
  assert.equal(W.worldMaterialOf('building.terrace-victorian', 'body', '#ffd890', { glow: 'window' }), 'glass', 'a glow part is glass');
  // every shape of every library object resolves to a known material
  let n = 0;
  for (const o of W.sceneObjs().slice(0, 300)) {
    const id = typeof o === 'string' ? o : o.id;
    let sh = null; try { sh = W.sceneObjShapes(id, 0, 'summer'); } catch (e) { sh = null; }
    if (!sh) continue;
    for (const p of sh.order) for (const s of sh.parts[p] || []) { const m = W.worldMaterialOf(id, p, s.f || s.s, s); assert.ok(W.WORLD_MATERIALS[m], id + ' ' + p + ' -> ' + m); n++; }
  }
  assert.ok(n > 1000, 'shapes checked: ' + n);
});

test('grass and leaf colours differ by month; trees are bare in winter, bud in spring, turn unevenly in autumn', () => {
  const grass = '#5f8f3a', leaf = '#4f8538';
  const g = Array.from({ length: 12 }, (_, m) => W.worldMaterialColour('grass', grass, mctx(m)));
  assert.ok(dist(g[0], g[5]) > 25, `January ${g[0]} vs June ${g[5]}`);
  assert.ok(sat(g[0]) < sat(g[5]), 'winter grass is duller');
  assert.ok(new Set(g).size >= 8, 'the grass changes through the year');
  const ent = (id) => ({ id, obj: 'tree.oak', x: 0, z: 30 });
  const jan = W.worldMaterialFor(mctx(0), ent('t1')), apr = W.worldMaterialFor(mctx(3), ent('t1')), jun = W.worldMaterialFor(mctx(5), ent('t1')), oct = W.worldMaterialFor(mctx(9), ent('t1'));
  assert.equal(jan.leaf, 'bare'); assert.equal(apr.leaf, 'bud'); assert.equal(jun.leaf, 'full'); assert.equal(oct.leaf, 'turn');
  assert.equal(W.worldMaterialVisible('leaf', jan), false, 'no green leaves in January');
  assert.equal(W.worldMaterialVisible('needle', jan), true, 'evergreens stay');
  assert.equal(W.worldMaterialVisible('bark', jan), true);
  const cA = W.worldMaterialColour('leaf', leaf, apr), cJ = W.worldMaterialColour('leaf', leaf, jun), cO = W.worldMaterialColour('leaf', leaf, oct);
  assert.ok(lum(cA) > lum(cJ), 'spring leaves are fresh and light');
  const [r, gg] = rgb(cO);
  assert.ok(r > gg * 0.9, 'autumn leaves turn: ' + cO);
  // unevenly: across 40 trees in mid October the states and turning colours differ
  const many = Array.from({ length: 40 }, (_, i) => W.worldMaterialFor(Object.assign(mctx(9), { doy: 285 }), ent('tree' + i)));
  assert.ok(new Set(many.map(m => W.worldMaterialColour('leaf', leaf, m))).size >= 4, 'uneven turning');
  assert.ok(Math.max(...many.map(m => m.turn)) - Math.min(...many.map(m => m.turn)) > 0.2);
  // the reed beds go straw in winter
  assert.ok(dist(W.worldMaterialColour('reed', '#6f9a48', mctx(0)), W.worldMaterialColour('reed', '#6f9a48', mctx(6))) > 30);
});

test('weather: wet stone is darker in rain; frost whitens grass on a frosty morning', () => {
  for (const [mat, col] of [['stone', '#a8a090'], ['paving', '#9a9a92'], ['tarmac', '#5a5a5e'], ['brick', '#9a4a32'], ['slate', '#4a5058']]) {
    const dry = W.worldMaterialColour(mat, col, mctx(5)), wet = W.worldMaterialColour(mat, col, mctx(5, { weather: 'rain' }));
    assert.ok(lum(wet) < lum(dry) * 0.85, `${mat}: wet ${wet} vs dry ${dry}`);
  }
  const g0 = W.worldMaterialColour('glass', '#cfe0ea', mctx(5)), g1 = W.worldMaterialColour('glass', '#cfe0ea', mctx(5, { weather: 'rain' }));
  assert.ok(lum(g1) > lum(g0) * 0.9, 'glass barely changes');
  const frosty = W.worldMaterialColour('grass', '#5f8f3a', mctx(0, { frost: 0.9 })), plain = W.worldMaterialColour('grass', '#5f8f3a', mctx(0));
  assert.ok(lum(frosty) > lum(plain) + 0.15, 'hoar frost on the grass');
  assert.ok(W.worldMaterialCtx({ weather: 'rain', month: 3 }).wet === 1 && W.worldMaterialCtx({ weather: 'clear', month: 3 }).wet === 0);
});

test('snow lies on the ground, roofs and boughs on a snow day only', () => {
  const snowy = mctx(0, { snowDay: true, snowDepth: 0.8 }), cold = mctx(0, { frost: 0 }), july = mctx(6, { snowDay: false });
  const roof = (c) => W.worldMaterialColour('slate', '#4a5058', c), tileRoof = (c) => W.worldMaterialColour('tile', '#8a3a2a', c);
  assert.ok(lum(roof(snowy)) > 0.75 && lum(roof(cold)) < 0.4, `slate roof: snow day ${roof(snowy)}, a cold dry day ${roof(cold)}`);
  assert.ok(lum(tileRoof(snowy)) > 0.7 && lum(tileRoof(july)) < 0.4);
  assert.equal(W.worldMaterialSnow('slate', cold), 0, 'no snow on a cold day without snow');
  assert.equal(W.worldMaterialSnow('slate', july), 0, 'never in July');
  assert.ok(W.worldMaterialSnow('grass', snowy) > 0.6 && W.worldMaterialSnow('tarmac', snowy) > 0.6, 'the ground is white');
  assert.ok(W.worldMaterialSnow('bark', snowy) > 0.2 && W.worldMaterialSnow('bark', snowy) < 0.6, 'a dusting on the boughs');
  assert.equal(W.worldMaterialSnow('brick', snowy), 0, 'walls stay clear');
  assert.equal(W.worldMaterialColour('brick', '#9a4a32', snowy), W.worldMaterialColour('brick', '#9a4a32', cold), 'a brick wall is the same on a snow day');
  // from a time context: the snow day flag is the switch
  assert.ok(W.worldMaterialCtx({ month: 0, snowDay: true }).snow > 0 && W.worldMaterialCtx({ month: 0, snowDay: false }).snow === 0);
});

test('light: the same paint is darker and cooler at night, warmer in the golden hour, flatter under cloud; haze by depth', () => {
  const sky = (h, o = {}) => W.worldSkyOf(Object.assign({ ms: at(2026, 6, 21, h), lat: FLEET.lat, lon: FLEET.lon, weather: 'clear' }, o), { live: false });
  const c = (s) => W.worldMaterialColour('render', '#e8e0d0', Object.assign(mctx(5), { sky: s, L: null }));
  const noon = c(sky(12)), gold = c(Object.assign({}, sky(19), {})), night = c(sky(23));
  assert.ok(lum(night) < lum(noon) * 0.5, `night ${night} vs noon ${noon}`);
  const [nr, , nb] = rgb(noon), [gr, , gb] = rgb(gold), [kr, , kb] = rgb(night);
  assert.ok(gr / gb > nr / nb + 0.05, `golden hour warmer: ${gold} vs ${noon}`);
  assert.ok(kb / Math.max(1, kr) > nb / nr, 'night is bluer');
  assert.ok(dist(noon, '#e8e0d0') < 40, 'clear noon keeps the art close to its own colour: ' + noon);
  const grey = c(sky(12, { weather: 'cloud' }));
  assert.ok(dist(grey, noon) > 5 && sat(grey) <= sat(noon) + 0.02, 'overcast flattens');
  // with the v2 light (the base layer's grade) the result follows it
  const live = W.worldSkyOf({ ms: at(2026, 6, 21, 23), lat: FLEET.lat, lon: FLEET.lon, weather: 'clear' });
  if (live.L) assert.ok(lum(W.worldMaterialColour('render', '#e8e0d0', Object.assign(mctx(5), { L: live.L }))) < lum('#e8e0d0') * 0.8, 'the v2 night grade darkens');
  const far = W.worldMaterialFor(mctx(5), { id: 'f', obj: 'tree.oak', x: 0, z: 4000 }), near = W.worldMaterialFor(mctx(5), { id: 'n', obj: 'tree.oak', x: 0, z: 20 });
  assert.ok(far.haze > near.haze + 0.1);
  assert.ok(dist(W.worldMaterialColour('bark', '#5d4c3c', far), far.hazeCol) < dist(W.worldMaterialColour('bark', '#5d4c3c', near), near.hazeCol), 'far things lean to the haze');
});

test('the cache key changes with the season state, light band and weather, never inside a light band', () => {
  const s = (h, m = 0) => W.worldSkyOf({ ms: at(2026, 6, 21, h, m), lat: FLEET.lat, lon: FLEET.lon, weather: 'clear' }, { live: false });
  const k = (o) => W.worldMaterialKey(Object.assign(mctx(5), o));
  assert.equal(k({ band: s(13).band }), k({ band: s(15).band }), 'two afternoon hours share the key');
  assert.notEqual(k({ band: s(13).band }), k({ band: s(23).band }), 'day and night differ');
  assert.notEqual(W.worldMaterialKey(mctx(0)), W.worldMaterialKey(mctx(6)), 'months differ');
  assert.notEqual(W.worldMaterialKey(mctx(5)), W.worldMaterialKey(mctx(5, { weather: 'rain' })), 'wet differs');
  assert.notEqual(W.worldMaterialKey(mctx(0)), W.worldMaterialKey(mctx(0, { snowDay: true })), 'snow differs');
});

test('the knowledge base decides when it is loaded: its material map and its leaf state', () => {
  const K = load(`function worldKb(id) { return { material: { body: 'stone', crown: 'needle' } }; }
    function worldKbState(kb, ctx, key) { return { leaf: 'turn', turn: 0.9 }; }\n`);
  assert.equal(K.worldMaterialOf('building.anything', 'body', '#9a4a32'), 'stone', 'the map wins over the colour rule');
  assert.equal(K.worldMaterialOf('tree.oak', 'crown', '#4f8538'), 'needle');
  const st = K.worldMaterialFor(K.worldMaterialCtx({ month: 5 }), { id: 'x', obj: 'tree.oak', x: 0, z: 10 });
  assert.equal(st.leaf, 'turn'); assert.equal(st.turn, 0.9);
});
