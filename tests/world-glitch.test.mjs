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
