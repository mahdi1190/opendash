// Camera presets, the composition measures and the composition lint (docs/dev/SCENE_ENGINE_V2.md 20.1, 20.2, 20.4; builder G).
// Pure parts run on crafted COMPILED scenes with a fake object table; the pack check runs on the real registry (v1 scenes: the
// camera inferred from the view).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cameraModule, compositionRules, compositionMeasures, compositionFingerprint, fingerprintSimilarity, horizonSpread, COMPOSITION_DEFAULTS, packFingerprints } from '../tools/lib/scene-composition.mjs';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { engineOf, dataOf } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAM = cameraModule(ROOT);
const { SCENE_CAMERA_PRESETS, sceneCameraPreset, sceneCompositionOf } = CAM;

/* a fake object table: boxes are [x0, y0, x1, y1] about the anchor (foot at y 0) at scale 1 */
const DEFS = {
  'landmark.tower': { id: 'landmark.tower', category: 'landmark', size: [120, 400], tags: [] },
  'landmark.facade': { id: 'landmark.facade', category: 'landmark', size: [500, 300], tags: ['symmetric'] },
  'tree.big': { id: 'tree.big', category: 'tree', size: [300, 600], tags: ['role:tree'] },
  'building.row': { id: 'building.row', category: 'building', size: [600, 260], tags: ['class:building'] },
  'person.w': { id: 'person.w', category: 'person', size: [30, 100], tags: [] },
};
const obj = (id) => DEFS[id] || null;
const shapes = (id) => { const d = DEFS[id]; return d ? { box: [-d.size[0] / 2, -d.size[1], d.size[0] / 2, 0] } : null; };
const rect = (x0, y0, x1, y1) => `M${x0} ${y0}L${x1} ${y0}L${x1} ${y1}L${x0} ${y1}Z`;
const LAYERS = [{ id: 'horizon' }, { id: 'far' }, { id: 'mid' }, { id: 'near' }, { id: 'fore' }, { id: 'front' }];
/** A crafted compiled scene: ground below the horizon, a landmark at (lx, foot), optional extras; `cam` makes it a v2 compiled scene. */
function crafted({ horizon = 470, lx = 533, foot = 520, s = 1, lmk = 'landmark.tower', cam = true, extra = [], ground = null, preset = 'street', heading = 120 } = {}) {
  const C = {
    layers: LAYERS,
    ground: ground || [{ layer: 2, d: rect(0, horizon, 1600, 900), fill: '#6a8a4a' }],
    water: [],
    items: [{ o: lmk, x: lx, y: foot, s, layer: 2 }].concat(extra),
    view: { horizon, fov: 64, heading },
  };
  if (cam) C.cam = { eye: 1.65, fov: 64, horizon, heading, x0: 800, f: 800 / Math.tan(32 * Math.PI / 180), preset };
  return C;
}
const M = (C, data = null) => sceneCompositionOf(C, { obj, shapes, data });
const rulesOf = (C, data, o = {}) => compositionRules(C, data, Object.assign({ measures: M(C, data) }, o));
const warned = (rules, name) => { const r = rules.find(x => x.rule === name); return r && (!!r.warn || !r.ok); };

test('presets: the eight of V2 20.1, and sceneCameraPreset fills a camera (explicit numbers win)', () => {
  assert.deepEqual(Object.keys(SCENE_CAMERA_PRESETS).sort(), ['across-water', 'close-up', 'down-street', 'from-hill', 'panorama', 'raised', 'street', 'through-arch']);
  const want = { street: [1.65, 64, 470], raised: [7, 68, 400], 'across-water': [1.7, 66, 440], 'from-hill': [1.7, 72, 330], 'down-street': [1.6, 58, 480], 'through-arch': [1.6, 54, 470], 'close-up': [1.5, 42, 500], panorama: [2.2, 96, 500] };
  for (const [id, [eye, fov, horizon]] of Object.entries(want)) {
    const c = sceneCameraPreset(id, { heading: 400, lat: 53.38, lon: -1.47 });
    assert.deepEqual([c.eye, c.fov, c.horizon, c.heading, c.preset, c.lat, c.lon], [eye, fov, horizon, 40, id, 53.38, -1.47], id);
  }
  assert.equal(sceneCameraPreset('nope'), null);
  assert.equal(sceneCameraPreset('street', { horizon: 433.4, eye: 2 }).horizon, 433);
  assert.equal(sceneCameraPreset('street', { eye: 2 }).eye, 2);
});

test('presets: each preset, composed by its own rules, measures within its targets', () => {
  // the subject on the left third, sized to the middle of the preset's subject range, the horizon at the preset's row; framing where wanted
  for (const P of Object.values(SCENE_CAMERA_PRESETS)) {
    const [s0, s1] = P.subject; const hFrac = (s0 + s1) / 2;
    const extra = [];
    if (P.framing) {
      const w = (P.frame[0] + P.frame[1]) / 2 * 1600;
      // a front tree cut by the left edge, covering w of the width
      const ts = w / 300 + 0.2;   // wider than w, so the box is cut by the edge and reaches w into the frame
      extra.push({ o: 'tree.big', x: w - 150 * ts, y: 900, s: ts, layer: 5 });
      if (P.framing === 'both') extra.push({ o: 'tree.big', x: 1600 - w + 150 * ts, y: 900, s: ts, layer: 5 });
    }
    // sky share: the preset's target middle; the ground starts at that row (open sky above it)
    const sky = (P.aim && P.aim.sky ? (P.aim.sky[0] + P.aim.sky[1]) / 2 : (P.sky[0] + P.sky[1]) / 2);
    const horizon = Math.round(sky * 900);
    const C = crafted({ horizon, lx: 1600 / 3, foot: Math.max(horizon + 60, hFrac * 900 + 20), s: hFrac * 900 / 400, extra, preset: P.id });
    // a road running into the picture toward the subject's third
    const data = { camera: { preset: P.id }, surfaces: [{ id: 'road', kind: 'road', path: [[-2, 5], [-30, 200]] }] };
    C.cam.horizon = horizon;
    const m = M(C, data);
    assert.ok(Math.abs(m.subject.xFrac - 1 / 3) < 0.02, `${P.id} third`);
    const rules = rulesOf(C, data);
    for (const name of ['thirds', 'skyShare', 'subjectSize', 'leadingLine']) assert.ok(!warned(rules, name), `${P.id}: ${name} ${JSON.stringify(rules.find(r => r.rule === name))}`);
    if (P.framing) assert.ok(!warned(rules, 'framing'), `${P.id}: framing ${JSON.stringify(m.framing)}`);
  }
});

test('rules: a centred subject fails thirds (unless symmetric); a missing leading line and a sky out of range are flagged', () => {
  const centred = crafted({ lx: 800 });
  let rules = rulesOf(centred, null);
  assert.ok(warned(rules, 'thirds'));
  assert.match(rules.find(r => r.rule === 'thirds').warn, /central band/);
  assert.ok(rules.find(r => r.rule === 'thirds').ok, 'a warning by default');
  const strict = rulesOf(centred, null, { strict: true });
  assert.equal(strict.find(r => r.rule === 'thirds').ok, false, '--strict-placement makes it a failure');
  const sym = crafted({ lx: 800, lmk: 'landmark.facade', s: 1 });
  assert.ok(!warned(rulesOf(sym, null), 'thirds'), 'a symmetric facade may sit in the middle');
  const onThird = crafted({ lx: 1067 });
  assert.ok(!warned(rulesOf(onThird, null), 'thirds'));
  // no strip running into the picture
  assert.ok(warned(rulesOf(onThird, { camera: {}, surfaces: [] }), 'leadingLine'));
  // a road converging at the subject's third
  const withRoad = { camera: {}, surfaces: [{ id: 'road', kind: 'road', path: [[0, 5], [25, 300]] }] };
  assert.ok(!warned(rulesOf(onThird, withRoad), 'leadingLine'));
  // a road running ACROSS the view is not a leading line
  const across = { camera: {}, surfaces: [{ id: 'road', kind: 'road', path: [[-60, 30], [60, 31]] }] };
  assert.ok(warned(rulesOf(onThird, across), 'leadingLine'));
  // sky: the horizon at 100 leaves 11 % sky; at 700, 78 %
  const low = crafted({ horizon: 100, lx: 533, foot: 400 }), high = crafted({ horizon: 700, lx: 533, foot: 760 });
  assert.ok(warned(rulesOf(low, null), 'skyShare'));
  assert.ok(warned(rulesOf(high, null), 'skyShare'));
  assert.match(rulesOf(high, null).find(r => r.rule === 'skyShare').warn, /lower the horizon/);
  // the subject's size
  assert.ok(warned(rulesOf(crafted({ s: 0.2 }), null), 'subjectSize'));
  assert.ok(!warned(rulesOf(crafted({ s: 0.8 }), null), 'subjectSize'));
});

test('preset-aware rules: across-water judges the water share instead of a leading line', () => {
  const dry = crafted({ horizon: 440, lx: 533, foot: 520, preset: 'across-water' });
  let rules = rulesOf(dry, { camera: { preset: 'across-water' } });
  assert.ok(!rules.find(r => r.rule === 'leadingLine'), 'no leading line asked of across-water');
  assert.ok(warned(rules, 'waterShare'));
  const wet = crafted({ horizon: 440, lx: 533, foot: 520, preset: 'across-water' });
  wet.water = [{ layer: 3, d: rect(0, 540, 1600, 765) }];   // 25 % of the height
  rules = rulesOf(wet, { camera: { preset: 'across-water' } });
  assert.ok(!warned(rules, 'waterShare'), JSON.stringify(rules.find(r => r.rule === 'waterShare')));
  // down-street still wants its line
  assert.ok(warned(rulesOf(crafted({ preset: 'down-street', lx: 533 }), { camera: { preset: 'down-street' }, surfaces: [] }), 'leadingLine'));
});

test('measures: buildings and trees in front of the sky lower the sky share; a framing signature at the edge is not the subject', () => {
  const open = M(crafted({ horizon: 450 }));
  const built = M(crafted({ horizon: 450, extra: [{ o: 'building.row', x: 1200, y: 600, s: 1, layer: 3 }] }));
  assert.ok(built.skyShare < open.skyShare - 0.03, `${built.skyShare} < ${open.skyShare}`);
  assert.ok(built.grid.groups.building.some(v => v > 0));
  // a huge signature tree cut by the right edge, and a smaller landmark on the left third: the landmark is the subject
  const C = crafted({ lx: 533, extra: [{ o: 'tree.big', x: 1550, y: 900, s: 1.3, layer: 4 }] });
  DEFS['tree.big'].tags = ['role:tree', 'signature'];
  try { assert.equal(M(C).subject.o, 'landmark.tower'); } finally { DEFS['tree.big'].tags = ['role:tree']; }
  // an explicit subject flag wins
  const S = crafted({ lx: 533, extra: [{ o: 'building.row', x: 1100, y: 600, s: 0.5, layer: 2, subject: true }] });
  assert.equal(M(S).subject.o, 'building.row');
});

test('fingerprints: near-identical scenes are tooSimilar, different ones are not; a seasonal series is exempt', () => {
  const a = crafted({ lx: 533, extra: [{ o: 'building.row', x: 1200, y: 600, s: 1, layer: 3 }] });
  const b = crafted({ lx: 540, extra: [{ o: 'building.row', x: 1190, y: 605, s: 1, layer: 3 }] });
  const c = crafted({ horizon: 330, lx: 1067, preset: 'from-hill', heading: 300, extra: [{ o: 'tree.big', x: 300, y: 800, s: 1, layer: 4 }], ground: [{ layer: 2, d: rect(0, 330, 1600, 900), fill: '#6a8a4a' }, { layer: 3, d: rect(0, 600, 1600, 900), fill: '#5a7a9a' }] });
  const fa = compositionFingerprint(M(a), { id: 'a' }, 'p/a'), fb = compositionFingerprint(M(b), { id: 'b' }, 'p/b'), fc = compositionFingerprint(M(c), { id: 'c' }, 'p/c');
  const ab = fingerprintSimilarity(fa, fb), ac = fingerprintSimilarity(fa, fc);
  assert.ok(ab.sim > COMPOSITION_DEFAULTS.tooSimilar.similar, `near-identical ${ab.sim}`);
  assert.ok(ac.sim < 0.6, `different ${ac.sim}`);
  const rules = rulesOf(a, { id: 'a' }, { ref: 'p/a', siblings: [{ ref: 'p/b', fp: fb }, { ref: 'p/c', fp: fc }] });
  const ts = rules.find(r => r.rule === 'tooSimilar');
  assert.ok(ts.warn && ts.similarTo === 'p/b', JSON.stringify(ts));
  assert.match(ts.warn, /shared: .*preset/);
  // the same view in two fixed seasons is a series on purpose
  const sa = compositionFingerprint(M(a), { id: 'x-pond-1', season: 'summer' }, 'p/x-pond-1'), sb = compositionFingerprint(M(b), { id: 'x-pond-1-winter', season: 'winter' }, 'p/x-pond-1-winter');
  const r2 = rulesOf(a, { id: 'x-pond-1', season: 'summer' }, { ref: 'p/x-pond-1', siblings: [{ ref: 'p/x-pond-1-winter', fp: sb }] });
  assert.equal(sa.series, sb.series);
  assert.ok(!r2.find(r => r.rule === 'tooSimilar'), 'no tooSimilar inside a series');
});

test('horizon variety across a pack', () => {
  assert.equal(horizonSpread([520, 520, 520]), 0);
  assert.ok(horizonSpread([330, 470, 520]) >= 40);
  const a = crafted({ horizon: 520 });
  const fp = (h) => ({ ref: 'p/' + h, fp: compositionFingerprint(M(crafted({ horizon: h })), null, 'p/' + h) });
  assert.ok(warned(rulesOf(a, null, { siblings: [fp(520), fp(515)] }), 'horizonVariety'));
  assert.ok(!warned(rulesOf(a, null, { siblings: [fp(330), fp(450)] }), 'horizonVariety'));
});

test('v1 packs: the measures run on real composed scenes (the camera inferred) and find the centred subjects', () => {
  const reg = loadRegistry(ROOT), E = engineOf(reg);
  if (!E.ready) return;
  const items = reg.items().filter(e => e.pack === 'texas' && e.item.composed).slice(0, 6);
  assert.ok(items.length >= 4);
  let centred = 0;
  for (const e of items) {
    const data = dataOf(e.item, E);
    const C = E.compile(data, { season: 'summer', lod: 1 });
    const m = compositionMeasures(C, data, { E });
    assert.equal(m.camSrc, 'view');
    assert.ok(m.skyShare > 0.1 && m.skyShare < 0.7, `${e.ref} sky ${m.skyShare}`);
    assert.ok(m.subject, `${e.ref} has a landmark`);
    if (m.subject.central) centred++;
    const rules = compositionRules(C, data, { E, measures: m, ref: e.ref, siblings: [] });
    for (const r of rules) assert.equal(r.group, 'composition');
  }
  assert.ok(centred >= 2, 'released v1 Texas views centre their landmark (the diagnosis of V2 0)');
  // the pack fingerprints are memoised per registry
  const a = packFingerprints(reg, 'texas', E), b = packFingerprints(reg, 'texas', E);
  assert.equal(a, b);
  assert.ok(a.length >= 5 && a.every(x => x.fp.grid.length === 7 * 144));
});
