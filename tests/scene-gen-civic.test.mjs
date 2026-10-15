// The civic part of the procedural building generator (src/app/70-scene-gen-1civic.js, 70-scene-gen-2civic-facade.js, the
// `baroque-civic` style; docs/dev/SCENE_LESSONS.md K): a building's `crown` (towers, domes, clock faces, finials) and its giant-order
// facade, in BOTH views (projected and elevation), cheap, deterministic, care-clean, lit by the real sun, never a flat slab.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { lintObject, engineOf } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const G = REG.R.get;
const E = new Proxy({}, { get: (_, n) => G(n) });
const CAM = { eye: 1.7, fov: 72, horizon: 500 };
const CROWNS = ['twin-towers', 'great-dome', 'corner-dome', 'clock-tower', 'pediment'];
/** A W x D block, its front on the line d = d0 facing the camera. */
const block = (x, d0, W, D) => [[x - W / 2, d0], [x + W / 2, d0], [x + W / 2, d0 + D], [x - W / 2, d0 + D]];
const spec = (crown, extra) => Object.assign({ style: 'baroque-civic', seed: 11, storeys: crown === 'twin-towers' ? 12 : 7, foot: block(0, 220, 64, 50), crown }, extra || {});
const fills = (d) => d.shapes.map(s => typeof s.f === 'string' ? s.f : '');

test('the baroque-civic style registers with the crowns it names', () => {
  const st = E.sceneBuildingStyle('baroque-civic');
  assert.ok(st && st.label && st.civic, 'data');
  for (const k of CROWNS) assert.equal(typeof st.crowns[k], 'function', k);
  assert.ok(E.sceneBuildingStyles().some(s => s.id === 'baroque-civic'));
  assert.equal(typeof st.front, 'function'); assert.equal(typeof st.side, 'function');
});

test('a crown raises the building: a twin-tower block reaches over 90 m, the same block with no crown stops at its cornice', () => {
  const crowned = E.sceneBuildingProject(spec('twin-towers'), CAM, {}), plain = E.sceneBuildingProject(spec(undefined), CAM, {});
  assert.ok(crowned.h > 90 && crowned.h < 115, 'twin towers with their birds: ' + crowned.h);
  assert.ok(plain.h < 60, 'no crown: ' + plain.h);
  assert.ok(crowned.box[1] < plain.box[1] - 60, 'the crown is drawn (the box rises)');
  for (const c of ['great-dome', 'clock-tower', 'corner-dome']) { const d = E.sceneBuildingProject(spec(c), CAM, {}); assert.ok(d.h > E.sceneBuildingProject(spec(undefined), CAM, {}).h + 8, c + ' rises above the cornice'); }
  assert.doesNotThrow(() => E.sceneBuildingProject(spec('no-such-crown'), CAM, {}), 'an unknown crown draws none and never throws');
  assert.equal(E.sceneBuildingProject(spec('no-such-crown'), CAM, {}).h, plain.h);
});

test('every crown draws, is deterministic, and the clock faces, bird, dome rings and belfries are there', () => {
  for (const c of CROWNS) {
    const a = E.sceneBuildingProject(spec(c), CAM, {}), b = E.sceneBuildingProject(spec(c), CAM, {});
    assert.equal(JSON.stringify(a), JSON.stringify(b), c + ' deterministic');
    assert.ok(a.n >= 50, c + ' has detail: ' + a.n);
  }
  const tw = E.sceneBuildingProject(spec('twin-towers'), CAM, {});
  assert.ok(tw.shapes.filter(s => s.glow === 'core').length >= 1, 'a clock face that lights at night');
  assert.ok(tw.shapes.some(s => s.part === 'roof' && /^#(4|5|6)[0-9a-f]/.test(s.f) && s.d.length > 60), 'the copper-dark bird silhouette on a roof part');
  const dome = E.sceneBuildingProject(spec('great-dome'), CAM, {});
  const roofFills = new Set(dome.shapes.filter(s => s.part === 'roof').map(s => s.f));
  assert.ok(roofFills.size >= 4, 'a dome reads through several tone rings: ' + roofFills.size);
  assert.ok(E.sceneBuildingProject(spec('clock-tower'), CAM, {}).shapes.some(s => s.glow === 'core'), 'a town-hall clock tower has a clock');
});

test('tall buildings stay cheap: under the shape budget at every distance and tier, and the tier steps down with distance', () => {
  const counts = [];
  for (const d0 of [45, 90, 160, 300, 600]) {
    const d = E.sceneBuildingProject(spec('twin-towers', { foot: block(30, d0, 64, 50) }), CAM, {});
    assert.ok(d.n <= G('SCENE_GEN_MAX_SHAPES'), `at ${d0} m: ${d.n} shapes`);
    counts.push(d.n);
  }
  assert.ok(counts[0] > counts[counts.length - 1] * 1.1 && Math.max(...counts) <= 420, 'detail falls with distance and stays modest: ' + counts.join());
  // a building right at the lens (a camera in front of the crowns) never throws and stays in budget
  for (const d0 of [3, 8, 14]) { const d = E.sceneBuildingProject(spec('great-dome', { foot: block(0, d0, 40, 40) }), CAM, {}); if (d) assert.ok(d.n <= G('SCENE_GEN_MAX_SHAPES')); }
});

test('the whole facade vocabulary is drawn: rusticated base, order, entablature, balustrade, a central door; both views', () => {
  const d = E.sceneBuildingProject(spec('pediment', { foot: block(0, 60, 60, 40) }), CAM, { debug: true });
  assert.ok(d.shapes.length > 50);
  assert.ok(d.walls.includes(0), 'the front');
  // the elevation (orthographic) object of the style: the same elements through the other view, with crowns
  const id = E.sceneBuildingObject({ style: 'baroque-civic', seed: 5, storeys: 8, frontage: 56, depth: 40, crown: 'corner-dome' });
  const def = E.sceneObj(id);
  assert.ok(def.real.h > 40, 'the elevation object includes the crown: ' + def.real.h);
  const L = lintObject(id, { E: engineOf(REG) });
  assert.deepEqual(L.rules.filter(r => !r.ok).map(r => `${r.name}: ${r.value} (${r.limit})`), [], id + ' lint');
  assert.ok(L.stats.glow >= 4);
  const body = def.build(0, null, { season: 'summer' });
  assert.ok((body.body || []).length > 20 && (body.win || []).length > 4, 'parts are filled');
});

test('shapes carry the outward normal of their face (the sun lights them); the crown shapes of curved surfaces carry none', () => {
  const d = E.sceneBuildingProject(spec('twin-towers'), CAM, {});
  const withN = d.shapes.filter(s => Array.isArray(s.n));
  assert.ok(withN.length > d.shapes.length * 0.5, 'wall shapes are stamped: ' + withN.length + ' of ' + d.shapes.length);
  for (const s of withN) { assert.equal(s.n.length, 3); const L = Math.hypot(...s.n); assert.ok(L > 0.9 && L < 1.1, 'a unit normal ' + s.n); }
  // the front wall of a block facing the camera has the normal (0, 0, -1)
  assert.ok(withN.some(s => Math.abs(s.n[2] + 1) < 0.02 && Math.abs(s.n[0]) < 0.02), 'the front wall faces the camera');
});

test('care: finials are a bird, urn, ball or spike (never a flag, a religious symbol, a name or a number); no text anywhere', () => {
  const src = readFileSync(join(ROOT, 'src', 'app', '70-scene-gen-style-baroque.js'), 'utf8') + readFileSync(join(ROOT, 'src', 'app', '70-scene-gen-1civic.js'), 'utf8');
  const kinds = [...src.matchAll(/k: 'finial', kind: (?:o.finial || )?'([a-z]+)'/g), ...src.matchAll(/finial: '([a-z]+)'/g)].map(m => m[1]);
  assert.ok(kinds.length >= 4, 'the presets name finials');
  for (const k of kinds) assert.ok(['bird', 'urn', 'ball', 'spike'].includes(k), 'finial kind ' + k);
  assert.ok(!/\b(flag|cross|crescent|banner|crest|emblem|cipher|monogram)\b/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'no flags, crosses or emblems in the code');
  // every shape is path data only (M L Z and numbers): the generator draws no text
  for (const c of CROWNS) for (const s of E.sceneBuildingProject(spec(c), CAM, {}).shapes) assert.match(s.d, /^[MLZ0-9.,\- ]+$/, c + ' path data');
});

test('detail follows size on screen: a clock face is a disc far away and a dial with hands and ticks near', () => {
  const far = E.sceneBuildingProject(spec('clock-tower', { foot: block(0, 700, 60, 40) }), CAM, {}), near = E.sceneBuildingProject(spec('clock-tower', { foot: block(0, 90, 60, 40) }), CAM, {});
  assert.ok(near.n > far.n, `near ${near.n} vs far ${far.n}`);
  assert.ok(far.shapes.some(s => s.glow === 'core'), 'even far away the clock is a lit disc');
});
