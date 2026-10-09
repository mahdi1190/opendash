// The procedural building and street generator (docs/dev/SCENE_ENGINE_V2.md 19, test plan 27.6; builder F): determinism and
// seeded variety for every style, object lint of the elevation objects, the projection (visible walls, windows on their wall
// planes, the detail tiers, the shape cap), prism shadows, street expansion (no overlap, runs, gaps), signs only with signage
// and only generic words, lit windows by the share, snow parts, the compile hook without the other builders, v1 untouched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { lintObject, engineOf } from '../tools/lib/scene-lint.mjs';
import { streetRules, streetDraft, mergeStreets, styleMix } from '../tools/lib/scene-cmd/street.mjs';
import { buildingSheetData } from '../tools/lib/scene-cmd/building.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const G = REG.R.get;
const E = new Proxy({}, { get: (_, n) => G(n) });
const STYLES = ['victorian-terrace', 'georgian', 'edwardian', '1930s-semi', 'interwar-shops', 'mill', 'norfolk-flint', 'stone-cottage', 'modern-glass', 'brutalist', 'station'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const CAM = { eye: 1.65, fov: 66, horizon: 470 };
const F = 800 / Math.tan(33 * Math.PI / 180);
/** A rectangle footprint W x D whose front edge (first) faces the camera, centred on x at depth d, turned by deg about its centre. */
const rect = (x, d, W, D, deg = 0) => {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), cx = x, cd = d + D / 2;
  return [[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]].map(([u, v]) => [cx + u * c - v * s, cd + u * s + v * c]);
};
const inQuad = (p, q, tol = 1.5) => {
  // inside a convex polygon (either winding), with a tolerance in screen units
  let sgn = 0;
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, cr = ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / L;
    if (Math.abs(cr) <= tol) continue;
    const s = Math.sign(cr);
    if (sgn && s !== sgn) return false;
    sgn = s;
  }
  return true;
};

test('styles: all eleven register as data, with labels, eras and groupings', () => {
  const list = E.sceneBuildingStyles();
  assert.deepEqual(list.map(s => s.id).sort(), STYLES.slice().sort());
  for (const s of list) { assert.ok(s.label && s.grouping, s.id); assert.ok(Array.isArray(s.regions)); }
  assert.throws(() => E.sceneBuildingStyleDefine('Bad Id', { label: 'x' }), /bad id/);
  assert.throws(() => E.sceneBuildingStyleDefine('nolabel', {}), /label/);
  assert.equal(E.sceneBuildingTier(5.9), 0); assert.equal(E.sceneBuildingTier(6), 1); assert.equal(E.sceneBuildingTier(13.9), 1);
  assert.equal(E.sceneBuildingTier(14), 2); assert.equal(E.sceneBuildingTier(29.9), 2); assert.equal(E.sceneBuildingTier(30), 3);
});

test('nothing is registered at load, and generated objects never join the kit picks (v1 scenes untouched)', () => {
  const fresh = loadRegistry(ROOT, { fresh: true }), g = fresh.R.get;
  assert.ok(!g('sceneObjs')().some(d => /^building\.genp?-/.test(d.id)), 'no generated object at load');
  const before = JSON.stringify(g('sceneKitPick')(['urban', 'london'], 'building-mid', {}));
  g('sceneBuildingObject')({ style: 'victorian-terrace', seed: 1 });
  assert.equal(JSON.stringify(g('sceneKitPick')(['urban', 'london'], 'building-mid', {})), before, 'weight 0: kit picks are unchanged');
});

test('determinism: every style, 3 seeds x 4 seasons, in both modes; seeds differ (door, lights, pots)', () => {
  for (const style of STYLES) {
    const doors = new Set(), lights = new Set(), pots = new Set();
    for (const seed of [3, 17, 41]) {
      const sp = E.sceneBuildingResolve({ style, seed }), sp2 = E.sceneBuildingResolve({ style, seed });
      assert.equal(JSON.stringify(Object.assign({}, sp, { rnd: 0, style: 0 })), JSON.stringify(Object.assign({}, sp2, { rnd: 0, style: 0 })), `${style} ${seed}: the spec`);
      doors.add(sp.door + sp.wall); pots.add(sp.pots);
      const id = E.sceneBuildingObject({ style, seed });
      assert.equal(E.sceneBuildingObject({ style, seed }), id, 'memoised id');
      const def = E.sceneObj(id);
      for (const season of SEASONS) {
        const a = JSON.stringify(def.build(0, null, { season })), b = JSON.stringify(def.build(0, null, { season }));
        assert.equal(a, b, `${style} ${seed} ${season}: elevation`);
        const foot = rect(-12, 18, style === 'mill' || style === 'modern-glass' || style === 'brutalist' || style === 'station' ? 24 : 7, 9, 0);
        const p1 = E.sceneBuildingProject({ style, seed, foot }, CAM, { season, debug: true }), p2 = E.sceneBuildingProject({ style, seed, foot }, CAM, { season, debug: true });
        assert.equal(JSON.stringify(p1), JSON.stringify(p2), `${style} ${seed} ${season}: projected`);
        if (season === 'summer') lights.add(p1.debug.windows.map(w => w.theta + w.kind).join(','));
      }
    }
    assert.ok(doors.size >= 2, `${style}: the seeds change the colours`);
    assert.ok(lights.size >= 2, `${style}: the seeds change the lit pattern`);
    if (['victorian-terrace', 'georgian', 'edwardian'].includes(style)) assert.ok(pots.size >= 2 || doors.size === 3, `${style}: chimney pots vary`);
  }
});

test('elevation objects pass object lint (glow included), with real sizes and no text', () => {
  const Ex = engineOf(REG);
  for (const style of STYLES) for (const extra of [{}, { storeys: 3, shop: style === 'victorian-terrace' ? { kind: 'bakery' } : undefined }]) {
    const id = E.sceneBuildingObject(Object.assign({ style, seed: 7 }, extra));
    const def = E.sceneObj(id);
    assert.match(id, /^building\.gen-[a-z0-9-]+-[0-9a-f]{8}$/);
    const L = lintObject(id, { E: Ex });
    const bad = L.rules.filter(r => !r.ok).map(r => `${r.name}: ${r.value} (${r.limit})`);
    assert.deepEqual(bad, [], `${id} (${style}) lint`);
    assert.ok(L.stats.glow >= 4, `${style}: windows glow at night`);
    assert.ok(Math.abs(def.real.h * 20 - def.size[1]) <= 1, `${style}: size[1] is real.h at SCENE_GEN_UPM`);
    assert.equal(def.weight, 0);
    assert.ok(def.parts.includes('win') && def.parts.includes('lit') && def.parts.includes('snow'));
  }
});

test('projection: a rectangle turned 30 degrees shows exactly two walls; head-on, one', () => {
  const b = { style: 'victorian-terrace', seed: 5, storeys: 2 };
  const on = E.sceneBuildingProject(Object.assign({ foot: rect(0, 30, 8, 8, 0) }, b), CAM, {});
  assert.deepEqual(on.walls, [0], 'head-on: the front only');
  const turned = E.sceneBuildingProject(Object.assign({ foot: rect(0, 30, 8, 8, 30) }, b), CAM, {});
  assert.equal(turned.walls.length, 2, 'turned: two walls');
  const side = E.sceneBuildingProject(Object.assign({ foot: rect(-14, 20, 6, 10, 0) }, b), CAM, {});
  assert.equal(side.walls.length, 2, 'off-axis to the left: its front and its right side');
  assert.equal(E.sceneBuildingProject(Object.assign({ foot: rect(0, -30, 8, 8, 0) }, b), CAM, {}), null, 'behind the camera: null');
});

test('projection: windows lie on their wall planes (inside the projected wall), tiers, shape cap', () => {
  for (const style of ['victorian-terrace', 'georgian', 'mill', 'modern-glass', '1930s-semi', 'station']) {
    const big = /mill|modern|station/.test(style);
    const d = E.sceneBuildingProject({ style, seed: 9, foot: rect(-10, 16, big ? 30 : 7, 10, 20) }, CAM, { debug: true });
    const walls = new Map(d.debug.walls.map(w => [w.edge + '|' + w.role, w.poly]));
    let n = 0;
    for (const w of d.debug.windows) {
      const poly = walls.get(w.edge + '|' + w.role);
      if (!poly) continue;   // a bay or block face (its own plane)
      for (const p of w.quad) assert.ok(inQuad(p, poly, 2), `${style}: window corner ${p} inside wall ${w.edge}`);
      n++;
    }
    assert.ok(n >= (style === '1930s-semi' ? 1 : 2), `${style}: windows checked (${n})`);
    assert.ok(d.n <= 900, `${style}: ${d.n} shapes`);
  }
  // the tier of a window follows its storey's on-screen height: far = tone (0), nearer = plain (1), frames (2), detail (3)
  const tierAt = (dist) => { const d = E.sceneBuildingProject({ style: 'victorian-terrace', seed: 2, storeys: 2, foot: rect(0, dist, 6, 9) }, CAM, { debug: true }); return Math.max(...d.debug.windows.map(w => w.tier)); };
  const storeyPx = (dist) => F * 2.8 / dist;
  for (const [dist, tier] of [[F * 2.8 / 4, 0], [F * 2.8 / 10, 1], [F * 2.8 / 20, 2], [F * 2.8 / 45, 3]]) assert.equal(tierAt(dist), tier, `storey ${storeyPx(dist).toFixed(1)} units at ${dist.toFixed(0)} m`);
  const counts = [0, 1, 2, 3].map(t => E.sceneBuildingProject({ style: 'georgian', seed: 2, foot: rect(0, 25, 8, 10) }, CAM, { tierCap: t }).n);
  for (let i = 1; i < 4; i++) assert.ok(counts[i] > counts[i - 1], 'more detail at each tier: ' + counts.join(' < '));
  // the cap: a long mill seen close, obliquely, steps down until it fits
  const mill = E.sceneBuildingProject({ style: 'mill', seed: 4, storeys: 6, foot: [[-6, 8], [-6, 90], [-26, 90], [-26, 8]] }, CAM, {});
  assert.ok(mill.n <= E.SCENE_GEN_MAX_SHAPES, 'mill: ' + mill.n);
});

test('shadow: points along sunG, lengthens as the sun lowers, projects through the camera', () => {
  const b = { style: 'georgian', seed: 1, storeys: 3, foot: rect(-10, 30, 8, 10) };
  const cen = (p) => p.reduce((a, q) => [a[0] + q[0] / p.length, a[1] + q[1] / p.length], [0, 0]);
  const fc = cen(b.foot);
  let last = 0;
  for (const tan of [0.6, 1.5, 4, 11]) {
    for (const g of [[1, 0], [-0.6, 0.8], [0, -1]]) {
      const sg = E.sceneBuildingShadowGround(b, g, tan), c = cen(sg), v = [c[0] - fc[0], c[1] - fc[1]], L = Math.hypot(v[0], v[1]);
      assert.ok((v[0] * g[0] + v[1] * g[1]) / L > 0.99, 'along sunG');
    }
    const area = (p) => Math.abs(p.reduce((a, q, i) => a + q[0] * p[(i + 1) % p.length][1] - p[(i + 1) % p.length][0] * q[1], 0) / 2);
    const A = area(E.sceneBuildingShadowGround(b, [0.6, 0.8], tan));
    assert.ok(A > last, 'longer as the sun lowers'); last = A;
  }
  const scr = E.sceneBuildingShadow(b, [0.6, 0.8], 2, CAM);
  assert.ok(Array.isArray(scr) && scr.length >= 4 && scr.every(p => p[1] > 470), 'on the ground, below the horizon');
  assert.equal(E.sceneBuildingShadow(b, [0.6, 0.8], NaN, CAM), null);
});

const STREET = { id: 'f-test', camera: CAM, surfaces: [{ id: 'land', kind: 'plot', rest: true }, { id: 'road', kind: 'road', path: [[0, 3], [0, 120], [10, 300]], width: 7.3 },
  { id: 'pave-l', kind: 'pavement', beside: 'road', side: 'left', width: 2.6 }, { id: 'pave-r', kind: 'pavement', beside: 'road', side: 'right', width: 2.6 }] };

test('streets: from..to without overlap, set back from the pavement, runs of a style, gaps at about the rate', () => {
  const rule = { side: 'left', along: 'road', from: 10, to: 290, style: { 'victorian-terrace': 3, 'interwar-shops': 1, edwardian: 1 }, setback: 2, gaps: 0.15, seed: 4 };
  const list = E.sceneStreetExpand(rule, null, null, STREET);
  assert.ok(list.length > 25, list.length + ' buildings');
  for (let i = 1; i < list.length; i++) assert.ok(list[i].along >= list[i - 1].along + list[i - 1].frontage - 0.011, 'no overlap along the street (rounded to 0.01 m)');
  for (const b of list) {
    assert.ok(b.along >= 10 && b.along + b.frontage <= 290.6, 'within from..to');
    // the street-facing corners sit at the road's half width + the pavement + the setback, on the left (x < 0 on the straight part)
    if (b.along + b.frontage < 115) assert.ok(Math.abs(Math.max(b.foot[0][0], b.foot[1][0]) - -(3.65 + 2.6 + 2)) < 0.05, 'set back: ' + b.foot[0][0]);
    const d = E.sceneBuildingProject(b, CAM, {});
    if (d) assert.ok(d.walls.includes(0), 'the front faces the street');
  }
  let runs = 1; for (let i = 1; i < list.length; i++) if (list[i].style !== list[i - 1].style) runs++;
  assert.ok(list.length / runs > 2, `runs of a style (${list.length} in ${runs} runs)`);
  let gaps = 0; for (let i = 1; i < list.length; i++) if (list[i].along - (list[i - 1].along + list[i - 1].frontage) > 1.1) gaps++;
  const shareN = gaps / (list.length - 1);
  assert.ok(shareN > 0.03 && shareN < 0.4, 'gaps at about the rate: ' + shareN.toFixed(2));
  // terraces share party walls inside a run, the ends are open; the right side mirrors
  assert.ok(list.some(b => b.party === 'both') && list.some(b => b.party === 'left' || b.party === 'right'));
  const right = E.sceneStreetExpand(Object.assign({}, rule, { side: 'right' }), null, null, STREET);
  assert.ok(right.length > 20 && right.filter(b => b.along + b.frontage < 115).every(b => Math.min(b.foot[0][0], b.foot[1][0]) > 0), 'the right side is on the right');
  assert.deepEqual(E.sceneStreetExpand(Object.assign({}, rule, { along: 'nope' }), null, null, STREET), [], 'an unknown strip: nothing');
  assert.equal(JSON.stringify(E.sceneStreetExpand(rule, null, null, STREET)), JSON.stringify(list), 'deterministic');
});

test('signs: only with signage, generic words only, never a brand; shops get their fascia', () => {
  const words = new Set(Object.values(E.SCENE_GEN_SHOP_WORDS));
  assert.ok(words.size <= 40, 'at most 40 generic words');
  const shop = (s) => ({ style: 'interwar-shops', seed: 3, storeys: 2, foot: rect(0, 14, 7, 12), shop: s });
  assert.deepEqual(E.sceneBuildingProject(shop({ kind: 'bakery' }), CAM, {}).signs, [], 'no signage: no signs');
  const s1 = E.sceneBuildingProject(shop({ kind: 'bakery' }), CAM, { signage: true }).signs;
  assert.equal(s1.length, 1); assert.equal(s1[0].text, 'Bakery'); assert.ok(words.has(s1[0].text));
  assert.equal(E.sceneBuildingProject(shop({ kind: 'bakery', sign: 'Acme Bread Co' }), CAM, { signage: true }).signs[0].text, 'Bakery', 'a name is never copied');
  assert.deepEqual(E.sceneBuildingProject(shop({ kind: 'bakery', brand: true }), CAM, { signage: true }).signs, [], 'a brand: no sign');
  assert.equal(E.sceneBuildingProject(shop({ kind: 'books', sign: 'books' }), CAM, { signage: true }).signs[0].text, 'Books');
  const obj = { style: 'interwar-shops', seed: 3, shop: { kind: 'florist' } };
  assert.deepEqual(E.sceneBuildingObjectSigns(obj, { x: 800, y: 700, s: 1, layer: 'mid' }, false), []);
  const os = E.sceneBuildingObjectSigns(obj, { x: 800, y: 700, s: 1, layer: 'mid' }, true);
  assert.equal(os.length, 1); assert.equal(os[0].text, 'Florist'); assert.ok(os[0].y < 700 && os[0].w > 20);
  // no text, numbers or url() in any generated path
  const d = E.sceneBuildingProject(shop({ kind: 'cafe' }), CAM, { signage: true });
  for (const sh of d.shapes.concat(d.lit)) assert.match(sh.d, /^[ML0-9 .Z-]+$/);
});

test('night: lit windows follow the share; glow kinds; lit parts for shops and the station', () => {
  const d = E.sceneBuildingProject({ style: 'mill', seed: 6, storeys: 6, foot: rect(-20, 40, 50, 16, 10) }, CAM, { debug: true });
  const th = d.debug.windows.map(w => w.theta);
  assert.ok(th.length > 60);
  for (const share of [0.12, 0.4, 0.7]) { const lit = th.filter(t => t < share).length / th.length; assert.ok(Math.abs(lit - share) < 0.15, `share ${share}: ${lit.toFixed(2)} lit`); }
  assert.ok(th.every(t => t > 0 && t < 1 && Math.abs(t * 16 - Math.round(t * 16)) < 1e-6), 'thetas are the 8 bucket centres');
  const glass = d.shapes.filter(s => s.glow);
  assert.ok(glass.length >= 4 && glass.every(s => E.SCENE_GEN_NIGHT[s.glow] && Number.isFinite(s.theta)), 'glow shapes carry kind and theta');
  assert.deepEqual(d.glow, Object.assign({}, E.SCENE_GEN_NIGHT));
  const kinds = new Set(E.sceneBuildingProject({ style: 'victorian-terrace', seed: 2, storeys: 3, foot: rect(0, 12, 6, 9) }, CAM, { debug: true }).debug.windows.map(w => w.kind));
  for (let seed = 3; seed < 12; seed++) for (const w of E.sceneBuildingProject({ style: 'victorian-terrace', seed, storeys: 3, foot: rect(0, 12, 6, 9) }, CAM, { debug: true }).debug.windows) kinds.add(w.kind);
  assert.ok(kinds.has('window') && kinds.has('curtain') && kinds.has('tv'), 'warm, curtained and blue-TV rooms: ' + [...kinds]);
  assert.ok(E.sceneBuildingProject({ style: 'interwar-shops', seed: 1, foot: rect(0, 14, 6, 12) }, CAM, {}).lit.length > 0, 'a shopfront is lit');
  assert.ok(E.sceneBuildingProject({ style: 'station', seed: 1, foot: rect(0, 40, 30, 12) }, CAM, {}).lit.length > 0, 'the canopy lamps');
});

test('snow: snow parts appear at snowDepth > 0 (roofs, sills), and only in winter elevation objects that ask', () => {
  const b = { style: 'victorian-terrace', seed: 8, storeys: 2, foot: rect(-6, 60, 7, 9, 25) };
  const dry = E.sceneBuildingProject(b, CAM, { snowDepth: 0 }), snowy = E.sceneBuildingProject(b, CAM, { snowDepth: 0.6 });
  assert.ok(dry.snow.length > 0, 'the snow parts are always offered (direct.snow) for the bake');
  assert.ok(!dry.shapes.some(s => s.part === 'snow'), 'none drawn without snow');
  const sn = snowy.shapes.filter(s => s.part === 'snow');
  assert.ok(sn.length > 0 && sn.every(s => s.op > 0 && s.op <= 0.6), 'drawn at op * snowDepth');
  const plain = E.sceneObj(E.sceneBuildingObject({ style: 'stone-cottage', seed: 2 })), snowObj = E.sceneObj(E.sceneBuildingObject({ style: 'stone-cottage', seed: 2, snow: true }));
  assert.equal(plain.build(0, null, { season: 'winter' }).snow.length, 0);
  assert.ok(snowObj.build(0, null, { season: 'winter' }).snow.length > 0);
  assert.equal(snowObj.build(0, null, { season: 'summer' }).snow.length, 0);
  // seasons: window boxes in spring and summer, ivy reddens in autumn (the palette moves between seasons)
  const sum = JSON.stringify(plain.build(0, null, { season: 'summer' })), aut = JSON.stringify(plain.build(0, null, { season: 'autumn' }));
  assert.notEqual(sum, aut);
});

test('the compile hook: direct items and buildings, without the other builders; unknown styles warn', () => {
  const data = Object.assign({}, STREET, { signage: true, streets: [{ side: 'right', along: 'road', from: 8, to: 80, style: 'interwar-shops', shops: 'ground', seed: 2 }],
    buildings: [{ style: 'mill', seed: 1, foot: [[-30, 150], [10, 150], [10, 166], [-30, 166]] }, { style: 'no-such-style', seed: 2, foot: rect(20, 200, 10, 10) }, { style: 'georgian', foot: rect(0, -50, 8, 8) },
      { style: 'interwar-shops', seed: 5, shop: { kind: 'cafe' }, foot: rect(-2, 30, 7, 12) }] });
  const out = E.sceneGenExpand(data, { season: 'autumn', lod: 1 }, CAM);
  assert.ok(out.items.length >= 8);
  assert.equal(out.items.length, out.buildings.length);
  for (const [k, it] of out.items.entries()) {
    assert.equal(it.cls, 'building'); assert.ok(it.direct && it.direct.shapes.length); assert.equal(it.haze, null); assert.equal(it.s, 1);
    assert.ok(E.sceneObj(it.o), 'the placeholder object exists'); assert.equal(out.buildings[k].i, k);
    assert.ok(Number.isFinite(it.dz) && it.g && Number.isFinite(it.g.d));
  }
  assert.ok(out.problems.some(p => p.rule === 'genStyle' && p.sev === 'warn'), 'an unknown style warns');
  assert.ok(out.problems.some(p => p.rule === 'genOffscreen' && p.sev === 'info'), 'a building behind the camera is an info');
  assert.ok(out.signs.length > 0 && out.signs.every(s => Object.values(E.SCENE_GEN_SHOP_WORDS).includes(s.text)), 'signs with signage, generic words');
  assert.deepEqual(E.sceneGenExpand(Object.assign({}, data, { signage: false }), { season: 'autumn' }, CAM).signs, []);
  assert.equal(JSON.stringify(E.sceneGenExpand(data, { season: 'autumn', lod: 1 }, CAM)), JSON.stringify(out), 'deterministic');
});

test('the v1 bridge: a projected building as an object, and a street preview as v1 data', () => {
  const o = E.sceneBuildingAsObject({ style: 'edwardian', seed: 3, foot: rect(-10, 20, 7, 10) }, CAM, {});
  assert.match(o.obj, /^building\.genp-[0-9a-f]{8}$/);
  const sh = E.sceneObjShapes(o.obj, 0, 'summer');
  assert.ok(sh.parts.body.length > 10 && sh.parts.body.some(s => s.glow));
  const data = Object.assign({}, STREET, { id: 'f-prev', view: { lat: 53.4, lon: -1.5 }, streets: [{ side: 'left', along: 'road', from: 6, to: 60, style: 'victorian-terrace', seed: 1 }], place: [{ obj: 'person.walker', at: [-5, 12] }] });
  const v1 = E.sceneGenPreview(data, { season: 'summer' });
  assert.deepEqual(E.sceneValidate(v1), []);
  const C = E.sceneCompile(v1, { season: 'summer' });
  assert.ok(C.items.filter(i => /^building\.genp-/.test(i.o)).length >= 5);
  const walker = C.items.find(i => i.o === 'person.walker'), def = E.sceneObj('person.walker');
  assert.ok(Math.abs(walker.s * def.size[1] - F * 1.72 / 12) < 3, 'a walker 12 m away is f * 1.72 / 12 units tall');
});

test('the tools: street rules, drafts and merges; the building sheet', () => {
  assert.deepEqual(styleMix('victorian-terrace:3,mill'), { 'victorian-terrace': 3, mill: 1 });
  const rules = streetRules({ style: 'georgian,interwar-shops', storeys: '2,3', frontage: '5,7', shops: 'corner', seed: '9' });
  assert.equal(rules.length, 2); assert.deepEqual(rules.map(r => r.side), ['left', 'right']);
  assert.deepEqual(rules[0].storeys, [2, 3]); assert.deepEqual(rules[0].frontage, [5, 7]); assert.equal(rules[0].shops, 'corner');
  const rec = streetDraft('v2-test', 'a-street', rules);
  assert.equal(rec.v, 2); assert.equal(rec.scene.id, rec.meta.id); assert.ok(rec.scene.camera && rec.scene.surfaces.some(s => s.id === 'road'));
  assert.ok(JSON.parse(JSON.stringify(rec)), 'strict JSON');
  const merged = mergeStreets(rec, [rules[0]]);
  assert.equal(merged.scene.streets.length, 3); assert.equal(rec.scene.streets.length, 2, 'the input is not changed');
  // the draft's streets expand
  const list = E.sceneStreetExpand(rec.scene.streets[0], null, rec.scene.camera, rec.scene);
  assert.ok(list.length > 5);
  const expr = buildingSheetData({ styles: ['mill', 'georgian'], seeds: 1, seasons: ['summer', 'winter'] });
  assert.match(expr, /sceneBuildingObject/); assert.match(expr, /"mill"/);
});
