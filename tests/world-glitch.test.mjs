// World engine: RENDER GLITCHES (14 Oct review: "the v3 scenes are so buggy ... it's an engine problem"). One section per class
// of glitch; each test fails on the engine as it was and passes once the cause is fixed, so none can come back. The pixel
// detectors are in tools/lib/world/glitch.mjs (run on real renders with `node tools/world.mjs glitch <ref | png>`); their own
// behaviour on synthetic images is tested here too. docs/dev/SCENE_LESSONS.md section G lists the mistakes and the rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const FLEET = { lat: 51.29, lon: -0.82 };
const doyOf = (m, d) => [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334][m - 1] + d;
const tctx = (m, d) => ({ month: m - 1, doy: doyOf(m, d), lat: FLEET.lat, lon: FLEET.lon, season: W.sceneSeason(Date.UTC(2026, m - 1, d, 12), FLEET.lat), ms: Date.UTC(2026, m - 1, d, 12) });

/* ---------- G2: winter trees (S1) ---------- */
// every deciduous tree the kits, the fill and the test scenes draw (and the rest of the library's deciduous trees with seasonal art)
const TREES = () => W.sceneObjs().map(o => (typeof o === 'string' ? o : o.id)).filter(id => /^tree\./.test(id)).filter(id => {
  const kb = W.worldKb(id), def = W.sceneObj(id);
  return kb && kb.leaf === 'deciduous' && def && def.shapeBySeason;
});
/** What a tree draws for an entity at a time: the form's shapes that its materials keep. */
function drawn(id, c) {
  const mc0 = W.worldMaterialCtx(c), mc = W.worldMaterialFor(mc0, { id: id + '@g', obj: id, x: 0, z: 20 }, c);
  const sh = W.sceneObjShapes(id, 0, mc.form || c.season), out = [];
  for (const p of sh.order) for (const s of sh.parts[p] || []) {
    const m = W.worldMaterialOf(id, p, typeof s.f === 'string' ? s.f : null, s);
    if (W.worldMaterialVisible(m, mc)) out.push({ p, s, m, box: W.scenePathBox(s.d, s.m) });
  }
  return { mc, sh, out };
}

test('G2 a bare deciduous tree is drawn in its own bare form: limbs and twigs above the trunk, never a trunk slab or a pole', () => {
  const ids = TREES();
  assert.ok(ids.length >= 15, 'deciduous trees with seasonal art: ' + ids.length);
  const bad = [];
  const extent = (list) => { let b = null; for (const d of list) if (d.box) b = b ? [Math.min(b[0], d.box[0]), Math.min(b[1], d.box[1]), Math.max(b[2], d.box[2]), Math.max(b[3], d.box[3])] : d.box.slice(); return b; };
  for (const id of ids) {
    const { mc, out } = drawn(id, tctx(1, 20)), full = drawn(id, tctx(7, 16));
    assert.equal(mc.leaf, 'bare', id + ' is bare on 20 January');
    assert.equal(mc.form, 'winter', id + ' is drawn in its bare (winter) form');
    assert.equal(full.mc.leaf, 'full', id + ' is in full leaf in July');
    // the bare tree keeps its stature: its limbs and twig haze span most of the height and the width of the leafy crown (a trunk
    // slab keeps a third of the height; a bare white pole keeps the height and a tenth of the width)
    const b = extent(out), s = extent(full.out);
    const hk = (0 - b[1]) / (0 - s[1]), wk = (b[2] - b[0]) / (s[2] - s[0]);
    if (!(out.length >= 3) || hk < 0.7 || wk < 0.4) bad.push(`${id}: the bare form keeps ${Math.round(hk * 100)} % of the height and ${Math.round(wk * 100)} % of the width (${out.length} shapes)`);
  }
  assert.deepEqual(bad, []);
});

test('G2 limbs keep their bark colour in every season (a crown part holds the limbs: wood colours are bark, never leaf)', () => {
  // the white birch limbs and the oak limbs in the crown part
  assert.equal(W.worldMaterialOf('tree.bank-birch', 'crown', null, { s: '#e8e4dc', f: null }), 'bark');
  assert.equal(W.worldMaterialOf('tree.canal-oak', 'crown', '#4a3c30', { f: '#4a3c30' }), 'bark');
  // the leaves of the same crowns stay leaf
  assert.equal(W.worldMaterialOf('tree.bank-birch', 'crown', '#5e8e3a', { f: '#5e8e3a' }), 'leaf');
  // in autumn the oak's limbs do not turn gold with its leaves
  const c = tctx(10, 28), mc = W.worldMaterialFor(W.worldMaterialCtx(c), { id: 'o1', obj: 'tree.canal-oak', x: 0, z: 20 }, c);
  assert.equal(W.worldMaterialColour('bark', '#4a3c30', mc), W.worldMaterialColour('bark', '#4a3c30', Object.assign({}, mc, { leaf: 'full', turn: 0 })));
});

test('G2 forms follow each tree\'s own leaf state: bare in winter, budding on the bare form, full in summer, turning unevenly', () => {
  const F = (leaf, season, grow, drop) => W.worldMaterialForm('tree.bank-oak', season, leaf, grow, drop);
  assert.equal(F('bare', 'autumn'), 'winter', 'a tree bare in late November shows its branches');
  assert.equal(F('bud', 'spring', 0.1), 'winter', 'buds just breaking: the bare form, greening');
  assert.equal(F('bud', 'spring', 0.7), 'spring');
  assert.equal(F('full', 'autumn'), 'summer', 'still green in October');
  assert.equal(F('turn', 'autumn', 0, 0.2), 'autumn');
  assert.equal(F('turn', 'autumn', 0, 0.9), 'winter', 'most leaves down');
  assert.equal(W.worldMaterialForm('tree.pond-pine', 'winter', 'full'), 'winter', 'an evergreen keeps the calendar form');
  // the budding twig haze greens; the bare form keeps its own art colour
  const twig = '#5a4c40', cBare = tctx(1, 20), cBud = tctx(4, 22);
  const mBare = W.worldMaterialFor(W.worldMaterialCtx(cBare), { id: 't', obj: 'tree.bank-oak', x: 0, z: 20 }, cBare);
  assert.equal(W.worldMaterialColour('leaf', twig, Object.assign({}, mBare, { sky: null, L: null, haze: 0 })), twig, 'the bare form is drawn in its own colours');
  const mBud = Object.assign({}, W.worldMaterialFor(W.worldMaterialCtx(cBud), { id: 't', obj: 'tree.bank-oak', x: 0, z: 20 }, cBud), { leaf: 'bud', grow: 0.2, form: 'winter', sky: null, L: null, haze: 0 });
  const g = W.worldMaterialColour('leaf', twig, mBud), rgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  assert.ok(rgb(g)[1] > rgb(twig)[1] + 20, `the budding haze greens: ${twig} -> ${g}`);
});

test('G2 the compositor plans each tree in its own form (the box and the sprite agree with the drawn form)', () => {
  const spec = { v: 3, place: { lat: FLEET.lat, lon: FLEET.lon }, camera: { eye: 1.65, fov: 64, horizon: 470, heading: 0 },
    surfaces: [{ id: 'g', kind: 'grass', poly: [[-200, 1], [200, 1], [200, 400], [-200, 400]] }],
    entities: [{ obj: 'tree.bank-oak', at: [-6, 30], id: 'oak' }, { obj: 'tree.bank-birch', at: [6, 34], id: 'birch' }, { obj: 'tree.pond-pine', at: [0, 60], id: 'pine' }], fill: false, seed: 1 };
  const world = W.worldBuild(spec, { season: 'winter' });
  const plan = W.worldFramePlan(world, { season: 'winter', ctx: tctx(1, 20), backdrop: false });
  const by = (id) => plan.recs.find(r => r.ent && r.ent.id === id);
  assert.equal(by('oak').season, 'winter');
  assert.equal(by('birch').season, 'winter');
  // late November: the calendar says autumn, a bare tree is still drawn bare
  const plan2 = W.worldFramePlan(world, { season: 'autumn', ctx: tctx(12, 20), backdrop: false });
  assert.equal(plan2.recs.find(r => r.ent && r.ent.id === 'oak').season, 'winter');
});

/* ---------- G1: lights are soft additive falloffs within caps; figures carry no light sources ---------- */
const NIGHT = { night: true };
test('G1 a figure\'s glow parts (reflective strips, a phone, a watch) are never light sources; a cyclist\'s own lamps are', () => {
  for (const obj of ['person.jogger', 'person.walker', 'person.commuter', 'person.hiker', 'person.student']) {
    const a = { id: 'p-' + obj, obj, x: 0, z: 20, y: 0, facing: 90, variant: obj === 'person.walker' ? 4 : 0 };
    const L = W.worldLights({ entities: [] }, Object.assign({ agents: [a] }, NIGHT));
    assert.deepEqual(L.filter(l => l.src !== false), [], obj + ' lights nothing');
  }
  const bike = W.worldLights({ entities: [] }, Object.assign({ agents: [{ id: 'c1', obj: 'person.cyclist', x: 0, z: 20, y: 0, facing: 90, heading: 90 }] }, NIGHT));
  assert.ok(bike.some(l => l.kind === 'head' && l.on) && bike.some(l => l.kind === 'tail' && l.on), 'a cyclist lights its lamps');
  assert.ok(bike.every(l => !(l.halo > 0.45)), 'a lamp glows by its own size, never its reach');
});

test('G1 what a light paints is capped: soft pools under lamps, small halos round bulbs, none round lit windows', () => {
  const cam = W.sceneCamera({ camera: { eye: 1.65, fov: 64, horizon: 470, heading: 0 } }), C = W.WORLD_LIGHT_CAPS;
  const world = { entities: [{ id: 'lamp', obj: 'street.lamp', x: 1.5, z: 6, y: 0 }, { id: 'lamp2', obj: 'street.lamp', x: -3, z: 40, y: 0 }, { id: 'house', obj: 'building.terrace-victorian', x: -10, z: 30, y: 0 }] };
  const L = W.worldLights(world, NIGHT);
  assert.ok(L.some(l => l.ref === 'lamp' && l.pool), 'the near lamp has a pool');
  assert.equal(L.filter(l => l.pool && l.ref === 'lamp').length, 1, 'one pool per lamp');
  const D = W.worldLightDraws(L, cam, {});
  assert.ok(D.length > 0);
  for (const d of D) {
    if (d.kind === 'pool') { assert.ok(d.rx <= C.poolPx + 1e-6 && d.a <= C.poolAlpha + 1e-6, `pool ${d.rx} px at ${d.a}`); assert.ok(d.ry < d.rx, 'a pool lies flat in perspective'); }
    if (d.kind === 'halo') assert.ok(d.rx <= C.haloPx + 1e-6 && d.a <= C.haloAlpha + 1e-6, `halo ${d.rx} px at ${d.a}`);
  }
  assert.ok(!D.some(d => d.kind === 'halo' && d.ref === 'house'), 'a lit window is lit glass, not a halo');
  // a nearer pool is scaled down whole: the near lamp's pool is no wider on the screen than the cap
  const near = D.find(d => d.kind === 'pool' && d.ref === 'lamp'), far = D.find(d => d.kind === 'pool' && d.ref === 'lamp2');
  assert.ok(near && far && near.rx > far.rx && near.rx <= C.poolPx + 1e-6);
});

test('G1 the canvas paints every light as a radial or linear gradient, never a filled disc or ellipse', () => {
  const cam = W.sceneCamera({ camera: { eye: 1.65, fov: 64, horizon: 470, heading: 0 } });
  const L = W.worldLights({ entities: [{ id: 'lamp', obj: 'street.lamp', x: 1.5, z: 8, y: 0 }] }, NIGHT);
  const calls = [];
  const grad = () => ({ addColorStop: (o, c) => calls.push(['stop', o, c]) });
  const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push([k, ...a]); return k === 'createRadialGradient' || k === 'createLinearGradient' ? grad() : undefined; }), set: (t, k, v) => { if (k === 'fillStyle') calls.push(['fillStyle', typeof v]); t[k] = v; return true; } });
  const n = W.worldDrawLights(ctx, L, cam, {});
  assert.ok(n >= 2, 'a pool and a halo: ' + n);
  assert.ok(!calls.some(c => c[0] === 'ellipse' || c[0] === 'arc'), 'no flat ellipse or disc');
  assert.ok(!calls.some(c => c[0] === 'fillStyle' && c[1] === 'string'), 'every fill is a gradient');
  const stops = calls.filter(c => c[0] === 'stop');
  assert.ok(stops.length >= 8 && stops.some(s => /,0\.000\)$/.test(s[2])), 'falling off to nothing at the rim');
});

/* ---------- G3: night keeps its structure readable (QP4) ---------- */
test('G3 at night foliage sinks into silhouettes against the sky and pale things catch the night key', () => {
  const ms = Date.UTC(2026, 6, 16, 22, 30), lat = 51.29, lon = -0.82;
  const L = W.sceneLightV2({ sky: W.almSceneLight(ms, lat, lon, 'UTC'), wx: 'clear' }, { heading: 215, lat, lon }, { v: 2, camera: { heading: 215, lat, lon }, weather: 'clear' });
  const ctx = W.worldTimeCtx({ place: { lat, lon }, cam: { heading: 215 } }, ms), sky = W.worldSkyOf(ctx, { L, heading: 215 });
  assert.ok(sky.nightKey && sky.nightKey.n > 0.9, 'a night key in deep night');
  const mc = W.worldMaterialCtx(ctx, { sky, L }), lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
  const leaf = lum(W.worldMaterialColour('leaf', '#46703a', mc)), render = lum(W.worldMaterialColour('render', '#ece4d4', mc)), skyLow = lum(sky.sky.low);
  assert.ok(leaf < 0.62 * skyLow, `foliage ${leaf.toFixed(3)} against the sky low down ${skyLow.toFixed(3)}`);
  assert.ok(render > 3.5 * leaf, `pale render ${render.toFixed(3)} reads against foliage ${leaf.toFixed(3)}`);
  // by day nothing changes
  const day = W.worldSkyOf(W.worldTimeCtx({ place: { lat, lon }, cam: { heading: 215 } }, Date.UTC(2026, 6, 16, 13)), {});
  assert.equal(day.nightKey.n, 0);
});

/* ---------- G4: the water's ripple is smooth from row to row and gentle near the camera (no sawtooth columns) ---------- */
test('G4 the ripple shift never shears a reflection by more than a fraction of a pixel a row, at any wind, and shrinks near the camera', () => {
  const cam = W.sceneCamera({ camera: { eye: 1.65, fov: 66, horizon: 470, heading: 20, water: -0.6 } });
  for (const kind of ['river', 'canal', 'pond', 'lake', 'sea', 'harbour']) {
    const world = { cam, surfaces: [{ id: 'w', kind: 'water', water: kind, poly: [[-8, 1], [9, 1], [9, 220], [-8, 220]] }] };
    const [R] = W.worldWaterPlan(world, cam);
    for (const vs of [1, 1.6]) for (const wind of [0.5, 1, 2.5, 4]) for (const t of [0, 1.3, 7.7]) {
      const y0 = Math.ceil(R.box[1] * vs), y1 = Math.floor(Math.min(R.box[3], 900) * vs);
      let prev = null, worst = 0;
      const amp = [];
      for (let y = y0; y < y1; y++) {
        const d = W.worldWaterRipple(R, y, t, { vs, oy: 0, wind });
        if (prev != null) worst = Math.max(worst, Math.abs(d - prev));
        prev = d; amp.push(Math.abs(d));
      }
      assert.ok(worst <= 0.46 * vs + 1e-9, `${kind} wind ${wind} vs ${vs}: a row shears ${worst.toFixed(3)} px`);
      // the strongest shift sits in the middle distance; near the camera it is gentler than there
      const n = amp.length, mid = Math.max(...amp.slice(Math.floor(n * 0.3), Math.floor(n * 0.6))), near = Math.max(...amp.slice(Math.floor(n * 0.92)));
      if (mid > 0.2) assert.ok(near <= mid * 1.25, `${kind}: near ${near.toFixed(2)} px vs middle ${mid.toFixed(2)} px`);
    }
  }
});

/* ---------- G5: a walkway seen end-on is drawn in perspective, never as an elevation across the water ---------- */
test('G5 a boardwalk running away from the eye: handrails in perspective along its real edges, never the broadside elevation', () => {
  const spec = { v: 3, place: { lat: FLEET.lat, lon: FLEET.lon }, camera: { eye: 2.4, fov: 66, horizon: 400, heading: 0, water: -0.2 },
    surfaces: [{ id: 'pond', kind: 'water', water: 'pond', poly: [[-60, 1], [60, 1], [60, 120], [-60, 120]] }],
    entities: [{ obj: 'structure.boardwalk', at: [1, 16], facing: 4, id: 'endon', attach: 'water' }, { obj: 'structure.boardwalk', at: [-14, 40], facing: 90, id: 'broad', attach: 'water' }], fill: false, seed: 1 };
  const world = W.worldBuild(spec, { season: 'summer' }), cam = world.cam;
  const plan = W.worldFramePlan(world, { season: 'summer', backdrop: false });
  const endon = plan.recs.filter(r => r.ent && r.ent.id === 'endon'), broad = plan.recs.filter(r => r.ent && r.ent.id === 'broad');
  assert.ok(endon.length >= 2 && endon.every(r => r.prim && r.prim.kind === 'line' && r.prim.sub === 'fence'), 'end-on: rails in perspective, ' + endon.map(r => r.prim ? r.prim.sub : 'sprite').join(','));
  // the rails follow the walkway's long edges: they converge toward the vanishing point (their screen boxes are tall and narrow)
  for (const r of endon) assert.ok(r.box.y1 - r.box.y0 > r.box.x1 - r.box.x0, 'a rail piece running away from the eye');
  assert.ok(plan.decks.some(d => d.s && d.s.id === 'endon:deck'), 'its deck is drawn (planks) over the water');
  assert.equal(broad.length, 1); assert.ok(!broad[0].prim, 'seen broadside it keeps its own elevation art');
});

test('G5 a sprite standing in the water mirrors about its own waterline, a perspective piece about its footprint', () => {
  const cam = W.sceneCamera({ camera: { eye: 2.4, fov: 66, horizon: 400, heading: 0, water: -0.2 } });
  const world = { cam, surfaces: [{ id: 'pond', kind: 'water', water: 'pond', level: -0.2, poly: [[-60, 1], [60, 1], [60, 120], [-60, 120]] }] };
  const [R] = W.worldWaterPlan(world, cam);
  const e = { id: 'plat', obj: 'structure.viewing-platform', x: 6.6, z: 31, y: 0, foot: [[2.5, 29.2], [7.7, 35.4], [10.7, 32.8], [5.5, 26.6]] };
  assert.equal(W.worldWaterContact(R, e, cam).kind, 'line', 'a perspective piece: its footprint outline');
  const c = W.worldWaterContact(R, e, cam, { sprite: true });
  assert.equal(c.kind, 'own');
  assert.ok(Math.abs(W.worldWaterContactRow(R, c, 900) - (cam.horizon + cam.f * (cam.eye + 0.2) / 31)) < 0.5, 'about the waterline at its anchor');
});

/* ---------- the pixel detectors themselves (tools/lib/world/glitch.mjs) ---------- */
const G = await import('../tools/lib/world/glitch.mjs');
const canvas = (W0, H0, f) => { const data = new Uint8ClampedArray(W0 * H0 * 4); for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) { const v = Math.round(255 * Math.max(0, Math.min(1, f(x, y)))), i = (y * W0 + x) * 4; data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255; } return { width: W0, height: H0, data }; };
test('detector G1: a hard-edged bright ellipse on a night frame is a flat disc; the same light as a soft falloff is not', () => {
  const night = (x, y) => 0.1 + 0.02 * Math.sin(x * 0.3) * Math.sin(y * 0.2);
  const hard = canvas(800, 450, (x, y) => (((x - 400) / 220) ** 2 + ((y - 330) / 40) ** 2 < 1 ? 0.62 + 0.03 * Math.sin(x * 0.3) : night(x, y)));
  const soft = canvas(800, 450, (x, y) => { const d = Math.sqrt(((x - 400) / 220) ** 2 + ((y - 330) / 40) ** 2); return night(x, y) + 0.32 * Math.max(0, Math.pow(1 + 3 * d * d, -1.5) * (1 - d * d * (3 - 2 * d))) * (d < 1 ? 1 : 0); });
  assert.equal(G.glitchFlatDiscs(hard).ok, false);
  assert.equal(G.glitchFlatDiscs(soft).ok, true);
  // a lit window (a rectangle) is not a disc
  assert.equal(G.glitchFlatDiscs(canvas(800, 450, (x, y) => (x > 300 && x < 360 && y > 100 && y < 160 ? 0.85 : night(x, y)))).ok, true);
});
test('detector G4: a reflection sheared in steps of 3 rows is a sawtooth; a smooth sub-pixel ripple is not', () => {
  const stripes = (x) => ((Math.floor(x / 9) % 2) ? 0.7 : 0.25);
  const saw = canvas(800, 300, (x, y) => stripes(x + 5 * Math.sin(Math.floor(y / 3) * 3 * 0.25)));
  const smooth = canvas(800, 300, (x, y) => stripes(x + 0.8 * Math.sin(y * 0.15)));
  const box = [0, 0, 800, 300];
  assert.equal(G.glitchSawtooth(saw, { box }).ok, false, JSON.stringify(G.glitchSawtooth(saw, { box }).note));
  assert.equal(G.glitchSawtooth(smooth, { box }).ok, true, JSON.stringify(G.glitchSawtooth(smooth, { box }).note));
});
test('detector G3: one murky blue-grey is unreadable; dark masses with pale paths and lit windows read', () => {
  const murk = canvas(800, 450, (x, y) => 0.11 + 0.03 * Math.sin(x * 0.05 + y * 0.07));
  const read = canvas(800, 450, (x, y) => (y > 250 && Math.abs(x - 400) < (y - 250) * 0.8 ? 0.22 : (x % 97 < 8 && y < 300 ? 0.8 : 0.05 + 0.02 * Math.sin(x * 0.05))));
  assert.equal(G.glitchNightReadable(murk).ok, false);
  assert.equal(G.glitchNightReadable(read).ok, true, G.glitchNightReadable(read).note);
});

/* ---------- G6: the matrix sweep (season x time x weather) ---------- */
test('G6 the hoar frost the art paints on winter twigs shows on frosty mornings only, never as white limbs on a mild afternoon', () => {
  const sh = W.sceneObjShapes('tree.hawthorn', 0, 'winter');
  const frostShapes = [];
  for (const p of sh.order) for (const s of sh.parts[p] || []) if (W.worldMaterialOf('tree.hawthorn', p, typeof s.f === 'string' ? s.f : null, s) === 'rime') frostShapes.push(s);
  assert.ok(frostShapes.length > 0, 'the hawthorn\'s winter frost lines are rime');
  const c = tctx(1, 20), mc = W.worldMaterialFor(W.worldMaterialCtx(c), { id: 'h', obj: 'tree.hawthorn', x: 0, z: 10 }, c);
  assert.equal(W.worldMaterialVisible('rime', Object.assign({}, mc, { frost: 0, snowDay: false })), false, 'a mild day: no frost');
  assert.equal(W.worldMaterialVisible('rime', Object.assign({}, mc, { frost: 0.8 })), true, 'a frosty morning');
  assert.equal(W.worldMaterialVisible('rime', Object.assign({}, mc, { frost: 0, snowDay: true, snow: 0.8 })), true, 'a snow day');
});
test('G6 what stands dead in January (bracken, dock) is a weathered russet, not autumn flame', () => {
  const sat = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(...c), mn = Math.min(...c); return mx ? (mx - mn) / mx : 0; };
  const lumOf = (h) => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2]; };
  const base = W.worldMaterialCtx({ month: 0, doy: 20, lat: FLEET.lat }), oct = W.worldMaterialCtx({ month: 9, doy: 290, lat: FLEET.lat });
  for (let i = 0; i < 12; i++) {
    const key = 'fern' + i, jan = W.worldMaterialColour('leaf', '#6a8a3a', Object.assign({}, base, { leaf: 'turn', turn: 1, key, sky: null, L: null }));
    const autumn = W.worldMaterialColour('leaf', '#6a8a3a', Object.assign({}, oct, { leaf: 'turn', turn: 1, key, sky: null, L: null }));
    assert.ok(lumOf(jan) < lumOf(autumn) && sat(jan) <= sat(autumn) + 0.02, `January ${jan} vs October ${autumn}`);
    assert.ok(lumOf(jan) < 0.42, 'a dull dead brown: ' + jan);
  }
});
test('G6 a moored boat is a home: its windows light one by one at night; a parked car stays dark', () => {
  const ents = Array.from({ length: 12 }, (_, i) => ({ id: 'nb' + i, obj: 'boat.narrowboat', x: 4, z: 10 + i * 20, y: -0.4, attach: 'water', facing: 30 }));
  const L = W.worldLights({ entities: ents.concat([{ id: 'car', obj: 'vehicle.car', x: 8, z: 18, y: 0, facing: 90 }]) }, NIGHT);
  const lit = L.filter(l => /^nb/.test(l.ref) && l.on && (l.kind === 'window' || l.kind === 'win'));
  assert.ok(lit.length > 0, 'moored boats light their windows at night');
  assert.ok(L.filter(l => /^nb/.test(l.ref) && (l.kind === 'window' || l.kind === 'win')).some(l => !l.on), 'one by one, never all at once');
  assert.ok(!L.some(l => l.ref === 'car' && l.on), 'a parked car stays dark');
  assert.equal(W.worldLights({ entities: ents }, { night: false }).filter(l => l.on).length, 0, 'none by day');
});
