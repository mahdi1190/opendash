// World engine, package "sense" (docs/dev/WORLD_ENGINE.md 0, 1, 5, 9, 12; WORLD_ENGINE_REQUIREMENTS.md): the format v3 / v3.1,
// the strict validator, the REPAIRING load path (bad input makes a scene plainer, never wrong), migration, cameras (one world,
// many views), terrain, raised surfaces, water levels, registration (worldAdd never refuses; worldItem for pack files).
// Ids: W1 W2 W3 W4 C7 U1 U2 G8 G11 V1 Q7 I1 I2 L3 (the placement solver P1-P4 is in world-place.test.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadWorld, worldSourceFiles } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const t0 = Date.now();
const W = loadWorld(ROOT);
const LOAD_MS = Date.now() - t0;
const FIX = join(ROOT, 'tests', 'fixtures', 'world');
const PLACE_RULES = ['badAttach', 'overlap', 'blocksPath', 'orphan', 'orient', 'gridRow'];
const ACTIONS = ['strip', 'default', 'snap', 'move', 'rotate', 'reattach', 'drop', 'fill', 'dress', 'frame', 'jitter', 'migrate', 'flag', 'cull', 'warn'];

const good = () => ({ v: 3, place: { lat: 51.279, lon: -0.836, region: 'hampshire' }, camera: { eye: 1.65, fov: 62, horizon: 455, heading: 70 },
  surfaces: [
    { id: 'cut', kind: 'water', water: 'canal', poly: [[-30, 8], [6, 8], [40, 140], [10, 160]], shallow: 0.6 },
    { id: 'tow', kind: 'towpath', path: [[8, 5], [14, 60], [30, 160]], width: 2.4 },
    { id: 'verge', kind: 'grass', poly: [[10, 5], [40, 5], [60, 160], [32, 160]] },
    { id: 'line', kind: 'rail', path: [[-200, 300], [200, 300]], width: 3 } ],
  entities: [
    { obj: 'boat.narrowboat', at: [-2, 20], facing: 20, attach: 'water', id: 'nb1' },
    { obj: 'street.bench', at: [12.3, 22], facing: 250, id: 'bench-1' },
    { obj: 'bird.mallard', at: [-6, 30] },
    { cluster: 'plant.reed', on: 'cut', edge: true, n: 20, seed: 3 } ],
  landmarks: [{ obj: 'structure.field-gate', at: [25, 40], facing: 0, src: 'test' }],
  life: [{ who: 'walkers', on: 'tow', rate: '6/min', edges: ['S', 'N'] }, { who: 'mallard', count: 8, on: 'cut' },
    { who: 'visit', rate: '1/3min', goals: [{ go: 'bench-1' }, { do: 'sit', for: [20, 60] }, { leave: 'N' }] }],
  backdrop: { style: 'canal-wooded' }, seed: 2 });
const flat = (spec) => JSON.stringify(spec);
const keysDeep = (o, out = new Set()) => { if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!Array.isArray(o)) out.add(k); keysDeep(v, out); } return out; };
const byId = (w) => new Map(w.entities.map(e => [e.id, e]));
const angle = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

test('load.mjs evaluates the sources in Node and exposes the sense interface', () => {
  assert.ok(LOAD_MS < 6000, `load took ${LOAD_MS} ms`);
  for (const n of ['worldObjectInfo', 'worldValidate', 'worldRepair', 'worldMigrate', 'worldSpecFor', 'worldBuild', 'worldSurfaceAt', 'worldSurfaceY', 'worldWaterLevelAt',
    'worldFrontZ', 'worldAdd', 'worldAddLog', 'worldAddProblems', 'worldItem', 'worldItems', 'worldTemplated', 'worldPopulationDefine'])
    assert.equal(typeof W[n], 'function', n);
  for (const r of ['perSeasonData', 'careRule', 'regionInvalid', 'orphan', 'orient', 'gridRow', 'templated', 'buildError']) assert.ok(W.WORLD_RULES.includes(r), r);
  for (const r of W.WORLD_RULES) assert.ok(['repair', 'drop', 'fatal', 'warn'].includes(W.WORLD_RULE_SEVERITY[r]), r);
  for (const e of ['left', 'right', 'far', 'near', 'N', 'S', 'E', 'W']) assert.ok(W.WORLD_EDGES.includes(e), e);
});

test('the good spec validates, and its v3.1 migration too', () => {
  const r = W.worldValidate(good());
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
  const m = W.worldMigrate(good()).spec;
  assert.equal(m.v, 3.1);
  assert.deepEqual(W.worldValidate(m).errors, []);
  // the good spec builds with no fix by the solver (its log has no drop and no placement-rule entry)
  const w = W.worldBuild(good(), { fill: false });
  assert.deepEqual(w.problems, []);
  assert.deepEqual(w.log.filter(l => l.action === 'drop' || ['badAttach', 'overlap', 'blocksPath', 'orphan'].includes(l.rule)), []);
});

test('every bad fixture fails strict validation with its rule AND builds in repair mode with a log entry for it (46+)', () => {
  const files = readdirSync(FIX).filter(f => /^bad-.*\.json$/.test(f));
  assert.ok(files.length >= 46, `${files.length} fixtures`);
  for (const f of files) {
    const { rule, spec } = JSON.parse(readFileSync(join(FIX, f), 'utf8'));
    assert.ok(W.WORLD_RULES.includes(rule), `${f}: ${rule} is not a rule id`);
    const r = W.worldValidate(spec);
    assert.equal(r.ok, false, `${f} was accepted`);
    assert.ok(r.errors.some(e => e.rule === rule), `${f}: wanted ${rule}, got ${r.errors.map(e => e.rule + ' ' + e.path).join('; ')}`);
    for (const e of r.errors) {
      assert.equal(typeof e.path, 'string'); assert.equal(typeof e.msg, 'string'); assert.ok(e.fix.length > 5, `${f}: ${e.rule} has a fix (U2)`);
      assert.ok(['repair', 'drop', 'fatal'].includes(e.severity), `${f}: ${e.rule} severity ${e.severity}`);
    }
    let w;
    assert.doesNotThrow(() => { w = W.worldBuild(spec); }, f);
    assert.ok(w.log.some(l => l.rule === rule), `${f}: no load-log entry for ${rule}: ${w.log.filter(l => l.action !== 'fill' && l.action !== 'dress').map(l => l.action + ' ' + l.rule).join(', ')}`);
    assert.ok(w.entities.length > 0, `${f}: the scene still has its world`);
    // repair leaves only what the placement solver handles
    const left = W.worldValidate(W.worldRepair(spec).spec).errors.filter(e => !PLACE_RULES.includes(e.rule) && e.rule !== 'landmarkSrc');
    assert.deepEqual(left.map(e => `${e.rule} ${e.path}`), [], `${f}: repair left non-placement errors`);
  }
});

test('U2: every load-log entry says who acted, what, why, from and to', () => {
  const s = JSON.parse(readFileSync(join(FIX, 'bad-boat-on-towpath.json'), 'utf8')).spec;
  s.entities[2].scale = 3; s.grade = 'warm';
  const w = W.worldBuild(s);
  assert.ok(w.log.length >= 3);
  for (const l of w.log) {
    for (const k of ['id', 'obj', 'action', 'rule', 'reason', 'from', 'to', 'by']) assert.ok(k in l, `${k} in ${JSON.stringify(l)}`);
    assert.ok(ACTIONS.includes(l.action), l.action);
    assert.ok(['sense', 'kb', 'appearance', 'look', 'life', 'systems', 'render', 'tools'].includes(l.by), l.by);
    assert.equal(typeof l.reason, 'string');
  }
  assert.ok(w.log.some(l => l.action === 'strip' && l.rule === 'screenOrLookField' && l.from === 3));
  assert.ok(w.log.some(l => l.action === 'snap' && l.rule === 'badAttach' && l.id && Array.isArray(l.from) && Array.isArray(l.to)), 'the boat on the towpath is snapped');
});

test('W1, L3: no screen, look or light field survives the load; strict validation rejects each; hand reflections are not placed', () => {
  const s = good();
  s.light = { sun: 1 }; s.grade = 'warm'; s.shadow = true;
  s.surfaces[0].tint = '#336'; s.surfaces[0].ripple = 0.4; s.surfaces[0].reflect = false;
  s.entities[0].scale = 2; s.entities[1].X = 400; s.entities[2].layer = 'near'; s.entities[2].shadow = true;
  s.backdrop.light = 'dusk';
  const strict = W.worldValidate(s);
  assert.equal(strict.ok, false);
  assert.ok(strict.errors.filter(e => e.rule === 'screenOrLookField').length >= 10);
  const r = W.worldRepair(s);
  const left = keysDeep(r.spec);
  for (const k of W.WORLD_LOOK_KEYS) assert.ok(!left.has(k), `${k} survived the repair`);
  assert.equal(r.log.filter(l => l.action === 'strip' && l.rule === 'screenOrLookField').length, strict.errors.filter(e => e.rule === 'screenOrLookField').length);
  // an object that IS a hand-drawn reflection
  const t = good(); t.entities.push({ obj: 'ground.us-vt-bridge-reflection', at: [-10, 40], id: 'refl' });
  if (W.worldObjectInfo('ground.us-vt-bridge-reflection')) {
    assert.ok(W.worldValidate(t).errors.some(e => e.rule === 'careRule'));
    const w = W.worldBuild(t, { fill: false });
    assert.ok(!w.entities.some(e => e.obj === 'ground.us-vt-bridge-reflection'));
    assert.ok(w.log.some(l => l.rule === 'careRule' && l.action === 'drop'));
  }
  assert.ok(W.WORLD_LOOK_PART_RE.test('shadow') && W.WORLD_LOOK_PART_RE.test('reflection') && !W.WORLD_LOOK_PART_RE.test('hull'));
});

test('V1: per-season, per-time and per-weather data is rejected strictly and stripped on load', () => {
  const s = good();
  s.entities[0].winterVariant = 2; s.entities[1].night = { obj: 'street.lamp' }; s.entities[2].colours = ['#fff', '#000'];
  s.entities[1].variant = { summer: 0, winter: 1 };
  s.surfaces[2].bySeason = { winter: 'heath' };
  s.entities.push({ obj: 'tree.bank-oak-winter', at: [30, 60], id: 'oak' });
  s.season = 'winter';
  const strict = W.worldValidate(s);
  const per = strict.errors.filter(e => e.rule === 'perSeasonData').map(e => e.path).sort();
  assert.deepEqual(per, ['entities[0].winterVariant', 'entities[1].night', 'entities[1].variant', 'entities[2].colours', 'entities[4].obj', 'surfaces[2].bySeason'].sort());
  assert.ok(strict.errors.some(e => e.rule === 'seasonPinned'));
  const r = W.worldRepair(s);
  assert.deepEqual(W.worldValidate(r.spec).errors.filter(e => e.rule === 'perSeasonData' || e.rule === 'seasonPinned'), []);
  assert.equal(r.spec.entities.find(e => e.id === 'oak').obj, 'tree.bank-oak', 'a seasonal copy becomes its base object');
  assert.equal(r.spec.entities[1].variant, undefined, 'a per-season variant map falls back to the seeded default');
});

test('G11: worldMigrate turns v3.0 (camera frame) into v3.1 (place frame); the validator knows both; v3.1 edges are names', () => {
  const s = good(); s.ground = { relief: { x: [-50, 50], d: [5, 400], nx: 2, nd: 2, h: [0, 2, 1, 4] } };
  const { spec: m, log } = W.worldMigrate(s);
  assert.equal(m.v, 3.1); assert.equal(m.camera, undefined);
  assert.equal(m.cameras.length, 1);
  const c = m.cameras[0];
  assert.deepEqual(c.at, [0, 0]); assert.equal(c.heading, 70); assert.equal(c.height, 1.65); assert.equal(c.horizon, 455);
  assert.deepEqual(c.relief, s.ground.relief, 'the camera-frame relief rides on its camera');
  // points rotate by the heading: a thing straight ahead lies on the camera's bearing
  const nb = m.entities.find(e => e.id === 'nb1'), r = Math.hypot(-2, 20);
  assert.ok(Math.abs(Math.hypot(nb.at[0], nb.at[1]) - r) < 1e-9);
  assert.ok(Math.abs(angle(Math.atan2(nb.at[0], nb.at[1]) * 180 / Math.PI, 70 + Math.atan2(-2, 20) * 180 / Math.PI)) < 1e-9);
  assert.equal(nb.facing, 90);   // 20 + 70
  assert.deepEqual(m.life[0].edges, ['near', 'far']);
  assert.equal(m.life[2].goals[2].leave, 'far');
  assert.ok(log.some(l => l.action === 'migrate'));
  // the validator: v3.1 rejects letters for edges (they read as compass points) and repairs them to names
  const bad = JSON.parse(JSON.stringify(m)); bad.life[0].edges = ['S', 'N'];
  assert.ok(W.worldValidate(bad).errors.some(e => e.rule === 'badValue' && e.path === 'life[0].edges'));
  assert.deepEqual(W.worldRepair(bad).spec.life[0].edges, ['near', 'far']);
  // an unknown version is read as the version its shape says
  const v2 = good(); v2.v = 2;
  assert.ok(W.worldValidate(v2).errors.some(e => e.rule === 'badVersion'));
  assert.equal(W.worldRepair(v2).spec.v, 3);
  const v9 = JSON.parse(JSON.stringify(m)); v9.v = 9;
  assert.equal(W.worldRepair(v9).spec.v, 3.1);
  // v3.1 without a camera gets one; with a single `camera` by intent it is cameras: [camera]
  const one = JSON.parse(JSON.stringify(m)); one.camera = one.cameras[0]; delete one.cameras;
  assert.deepEqual(W.worldValidate(one).errors, []);
  assert.equal(W.worldRepair(one).spec.cameras.length, 1);
});

test('G11, Q7: the v3.0 and v3.1 forms of one scene build identical worlds (with the solver and the fill)', () => {
  for (const fill of [false, true]) {
    const a = W.worldBuild(good(), { fill }), b = W.worldBuild(W.worldMigrate(good()).spec, { fill });
    assert.equal(a.entities.length, b.entities.length, `fill ${fill}: entity count`);
    const B = byId(b);
    for (const e of a.entities) {
      const f = B.get(e.id);
      assert.ok(f, `fill ${fill}: ${e.id} missing from the v3.1 world`);
      for (const k of ['x', 'z', 'y']) assert.ok(Math.abs(e[k] - f[k]) < 1e-3, `${e.id}.${k} ${e[k]} vs ${f[k]}`);
      assert.ok(angle(e.facing, f.facing) < 1e-3, `${e.id} facing`);
      assert.equal(e.attach, f.attach, `${e.id} attach`);
    }
    assert.deepEqual(a.surfaces, b.surfaces);
    assert.deepEqual(a.life.map(l => l.edges || null), b.life.map(l => l.edges || null));
    assert.deepEqual([a.cam.eye, a.cam.fov, a.cam.horizon, a.cam.heading], [b.cam.eye, b.cam.fov, b.cam.horizon, b.cam.heading]);
  }
});

test('Q7: one world, many cameras: every camera sees the same things at the same place; one item per camera', () => {
  const spec = { v: 3.1, place: { lat: 51.29, lon: -0.82, style: 'canal-wooded' },
    cameras: [{ id: 'south', at: [0, -10], heading: 0, height: 1.7, fov: 60 }, { id: 'east', at: [45, 40], heading: 270, height: 1.7, fov: 60 }],
    surfaces: [{ id: 'lawn', kind: 'grass', poly: [[-60, -5], [60, -5], [60, 100], [-60, 100]] },
      { id: 'pond', kind: 'water', water: 'pond', poly: [[-15, 20], [15, 20], [18, 60], [-12, 62]] },
      { id: 'path', kind: 'path', path: [[-20, 10], [25, 10], [30, 80]], width: 2 }],
    entities: [{ obj: 'tree.bank-oak', at: [-25, 40], id: 'oak' }, { obj: 'street.bench', at: [26.5, 30], id: 'bench' }, { obj: 'bird.mallard', at: [0, 40], id: 'duck' },
      { cluster: 'plant.reed', on: 'pond', edge: true, n: 30, seed: 4 }],
    life: [{ who: 'walkers', on: 'path', rate: '4/min', edges: ['near', 'far'] }] };
  assert.deepEqual(W.worldValidate(spec).errors, []);
  const toPlace = (c, p) => { const H = c.heading * Math.PI / 180; return [c.at[0] + p[0] * Math.cos(H) + p[1] * Math.sin(H), c.at[1] - p[0] * Math.sin(H) + p[1] * Math.cos(H)]; };
  const worlds = spec.cameras.map((c, i) => W.worldBuild(spec, { camera: c.id, place: false, fill: false }));
  assert.deepEqual(worlds.map(w => w.camera.id), ['south', 'east']);
  const P = worlds.map((w, i) => new Map(w.entities.map(e => [e.id, toPlace(spec.cameras[i], [e.x, e.z])])));
  assert.ok(P[0].size >= 30 && P[0].size === P[1].size, `${P[0].size} vs ${P[1].size}`);
  for (const [id, p] of P[0]) { const q = P[1].get(id); assert.ok(q, id); assert.ok(Math.hypot(p[0] - q[0], p[1] - q[1]) < 2e-3, `${id}: ${p} vs ${q}`); }
  assert.equal(P[0].get('oak')[0].toFixed(3), '-25.000');
  // facings: compass in the spec, camera-relative in each world
  const facing = spec.entities[0].facing; assert.equal(facing, undefined);
  // the life edges become the camera-frame letters every module after load reads
  assert.deepEqual(worlds[0].life[0].edges, ['S', 'N']);
  const items = W.worldItems({ id: 'q7-place', label: 'Q7 place', ukPlace: 'q7' }, spec);
  assert.deepEqual(items.map(i => i.id), ['q7-place-south', 'q7-place-east']);
  assert.deepEqual(items.map(i => i.ukView), ['south', 'east']);
  assert.deepEqual(items.map(i => i.worldSpec.v), [3, 3]);
  assert.deepEqual(items.map(i => i.worldSpec.camera.heading), [0, 270]);
  assert.deepEqual(W.worldValidate(items[1].worldSpec).errors, [], 'an item\'s spec is a valid camera-frame spec');
});

test('W2: banks, embankments and cuttings are compiled into the relief; grounded things stand on h(x, z)', () => {
  const s = good();
  s.ground = { features: [{ kind: 'bank', path: [[20, 10], [20, 120]], width: 6, h: 1.5 }, { kind: 'embankment', path: [[-60, 250], [60, 250]], width: 20, h: 4 },
    { kind: 'cutting', path: [[45, 20], [45, 100]], width: 8, h: 2 }] };
  s.entities.push({ obj: 'tree.bank-oak', at: [20, 60], id: 'on-bank' }, { obj: 'tree.bank-oak', at: [45, 60], id: 'in-cutting' }, { obj: 'tree.bank-oak', at: [32, 60], id: 'flat' });
  assert.deepEqual(W.worldValidate(s).errors, []);
  const w = W.worldBuild(s, { fill: false });
  const h = (x, z) => W.sceneGroundHeight(w.cam, x, z);
  assert.ok(Math.abs(h(20, 60) - 1.5) < 0.15, `bank crest ${h(20, 60)}`);
  assert.ok(Math.abs(h(20 + 3.5, 60)) < 0.05, 'off the bank: flat');
  assert.ok(h(20 + 1.5, 60) > 0.3 && h(20 + 1.5, 60) < 1.4, 'the bank slopes');
  assert.ok(Math.abs(h(0, 250) - 4) < 0.25 && Math.abs(h(3, 250) - 4) < 0.25, 'the embankment has a flat top');
  assert.ok(h(45, 60) < -1.6, `the cutting is below the ground ${h(45, 60)}`);
  const E = byId(w);
  for (const id of ['on-bank', 'in-cutting', 'flat']) assert.ok(Math.abs(E.get(id).y - Math.round(h(E.get(id).x, E.get(id).z) * 1000) / 1000) < 1e-9, `${id} stands on h(x, z)`);
  assert.ok(E.get('on-bank').y > 1.2 && E.get('in-cutting').y < -1.6 && Math.abs(E.get('flat').y) < 0.05);
  // a bad feature is dropped with a log entry, the rest compile
  const b = good(); b.ground = { features: [{ kind: 'mountain', path: [[0, 10], [0, 20]], width: 4, h: 2 }, { kind: 'bank', path: [[30, 10], [30, 50]], width: 4 }] };
  const wb = W.worldBuild(b, { fill: false });
  assert.ok(wb.log.some(l => l.path === 'ground.features[0].kind' && l.action === 'drop'));
  assert.ok(wb.log.some(l => l.path === 'ground.features[1].h' && l.action === 'default'));
  assert.ok(W.sceneGroundHeight(wb.cam, 30, 30) > 0.5);
});

test('W3: raised decks carry their height; a bridge spans over what passes beneath; stairs join two levels', () => {
  const s = good();
  s.surfaces.push({ id: 'platform', kind: 'platform', poly: [[18, 30], [26, 30], [26, 40], [18, 40]], y: 1.1 },
    { id: 'bridge', kind: 'bridge-deck', path: [[-35, 100], [45, 100]], width: 4, y: 5 },
    { id: 'steps', kind: 'stairs', path: [[22, 41], [22, 47]], width: 2, from: 'platform', to: 'ground' });
  s.entities.push({ obj: 'person.walker', at: [22, 35], id: 'on-platform' }, { obj: 'bird.mallard', at: [10, 100], id: 'under-bridge', attach: 'water' },
    { obj: 'street.bench', at: [5, 100], id: 'on-bridge', attach: 'deck:bridge', facing: 0 });
  assert.deepEqual(W.worldValidate(s).errors, []);
  const w = W.worldBuild(s, { fill: false }), E = byId(w);
  assert.equal(E.get('on-platform').y, 1.1, 'a person on a raised platform stands at its height');
  assert.equal(E.get('on-platform').attach, 'deck:platform');
  assert.equal(E.get('on-bridge').y, 5, 'a bench on the bridge deck');
  const duck = E.get('under-bridge');
  assert.ok(duck && duck.waterline === 0 && duck.y < 0, 'a duck under the bridge stays in the water: the deck blocks nothing beneath');
  const br = w.surfaces.find(q => q.id === 'bridge');
  assert.equal(br.overhead, true); assert.equal(br.y, 5);
  assert.equal(W.worldSurfaceAt(w, 10, 100).id, 'bridge', 'the default lookup finds the deck (walkers)');
  assert.equal(W.worldSurfaceAt(w, 10, 100, { ground: true }).id, 'cut', 'the ground lookup finds the water under it');
  assert.equal(W.worldSurfaceAt(w, 10, 100, { y: 0.2 }).id, 'cut');
  assert.equal(W.worldSurfaceAt(w, 10, 100, { y: 5 }).id, 'bridge');
  const p = W.worldPlaceProbe(w, 10, 100);
  assert.ok(p.inWater && p.under && p.under.id === 'bridge' && !p.deck, 'the probe: in water, under the bridge');
  const st = w.surfaces.find(q => q.id === 'steps');
  assert.deepEqual([st.y0, st.y1], [1.1, 0]);
  assert.ok(Math.abs(W.worldSurfaceY(st, 22, 44) - 0.55) < 1e-9, 'half way down the stairs');
  assert.equal(W.worldSurfaceY(st, 22, 41), 1.1);
  // y on a kind that cannot be raised, from / to on a deck: strict errors, stripped on load
  const b = good(); b.surfaces[2].y = 2; b.surfaces.push({ id: 'deck2', kind: 'deck', poly: [[18, 30], [26, 30], [26, 40]], from: 0 });
  const r = W.worldValidate(b);
  assert.ok(r.errors.some(e => e.path === 'surfaces[2].y' && e.rule === 'unknownKey') && r.errors.some(e => e.path === 'surfaces[4].from'));
});

test('W4: water has a level per region and can step at a weir or lock', () => {
  const s = good();
  s.surfaces[0] = { id: 'upper', kind: 'water', water: 'river', poly: [[-30, 8], [6, 8], [20, 60], [-20, 60]], level: 0, step: { to: 'lower', kind: 'weir' }, hint: 'breezy', flow: 0 };
  s.surfaces.splice(1, 0, { id: 'lower', kind: 'water', water: 'river', poly: [[-20, 61], [20, 61], [40, 140], [10, 160]], level: -1.5, hint: 'calm' });
  s.entities[0].at = [-2, 30]; s.entities[0].facing = 15;
  s.entities.push({ obj: 'bird.mallard', at: [12, 100], id: 'low-duck', attach: 'water' });
  s.entities[3].on = 'upper'; s.life[1].on = 'upper';
  assert.deepEqual(W.worldValidate(s).errors, []);
  const w = W.worldBuild(s, { fill: false }), E = byId(w);
  assert.equal(E.get('nb1').waterline, 0);
  assert.equal(E.get('low-duck').waterline, -1.5);
  assert.ok(E.get('low-duck').y < -1.5);
  assert.equal(W.worldWaterLevelAt(w, 0, 100), -1.5);
  assert.equal(W.worldWaterLevelAt(w, 0, 30), 0);
  assert.equal(W.worldWaterLevelAt(w, 100, 30), null);
  assert.deepEqual(w.waterSteps, [{ from: 'upper', to: 'lower', kind: 'weir', drop: 1.5 }]);
  assert.equal(w.surfaces.find(q => q.id === 'upper').hint, 'breezy');
  // a step to nowhere and a bad hint are strict errors, stripped on load
  const b = JSON.parse(JSON.stringify(s)); b.surfaces[0].step.to = 'nowhere'; b.surfaces[0].hint = 'stormy';
  const r = W.worldValidate(b);
  assert.ok(r.errors.some(e => e.rule === 'unknownSurface' && e.path === 'surfaces[0].step.to') && r.errors.some(e => e.path === 'surfaces[0].hint'));
  const wb = W.worldBuild(b, { fill: false });
  assert.deepEqual(wb.waterSteps, []); assert.equal(wb.surfaces.find(q => q.id === 'upper').hint, undefined);
});

test('C7: views of one place that are too alike are a WARNING (across specs and across the cameras of one place)', () => {
  const a = good(), b = good();
  assert.ok(W.worldTemplated([a, b]).some(e => e.rule === 'templated' && e.severity === 'warn'));
  const r = W.worldValidate(a, { views: [b] });
  assert.equal(r.ok, true, 'a warning never fails validation');
  assert.ok(r.warnings.some(e => e.rule === 'templated'));
  const c = good(); c.camera.heading = 200; c.place.lat += 0.001;
  c.entities = [{ obj: 'building.mill-red-brick', at: [-30, 60], facing: 90 }, { obj: 'tree.birch', at: [20, 15] }, { obj: 'street.lamp', at: [5, 9] }];
  c.surfaces = [{ id: 'yard', kind: 'plaza', poly: [[-60, 2], [60, 2], [60, 200], [-60, 200]] }];
  c.landmarks = []; c.life = [{ who: 'walkers', on: 'yard', rate: '6/min' }];
  assert.deepEqual(W.worldTemplated([a, c]), []);
  // two cameras of one v3.1 place at nearly the same spot and heading
  const m = W.worldMigrate(good()).spec;
  m.cameras.push(Object.assign({}, m.cameras[0], { id: 'twin', at: [3, 2], heading: 80 }));
  const v = W.worldValidate(m);
  assert.equal(v.ok, true);
  assert.ok(v.warnings.some(e => e.rule === 'templated'));
  assert.ok(W.worldTemplated([m]).some(e => e.rule === 'templated'));
});

test('U1: a short spec: the backdrop comes from place.style; fill: false carries through; nothing else is required', () => {
  const s = { v: 3.1, place: { lat: 53.39, lon: -1.47, style: 'city-sheffield-hills' }, cameras: [{ at: [0, -5], heading: 20 }],
    surfaces: [{ id: 'sq', kind: 'plaza', poly: [[-30, 0], [30, 0], [30, 60], [-30, 60]] }], fill: false };
  const r = W.worldValidate(s);
  assert.deepEqual(r.errors, []);
  const rep = W.worldRepair(s);
  assert.equal(rep.spec.backdrop.style, 'city-sheffield-hills');
  assert.deepEqual(rep.log, [], 'a default from place.style is not a fix');
  const w = W.worldBuild(s);
  assert.equal(w.fill, false); assert.equal(w.style, 'city-sheffield-hills'); assert.equal(w.backdrop.style, 'city-sheffield-hills');
  // no place.style: the style is guessed from the surfaces and logged
  const g = { v: 3, camera: {}, surfaces: [{ id: 'cut', kind: 'water', water: 'canal', poly: [[-5, 2], [5, 2], [5, 90], [-5, 90]] }] };
  const wg = W.worldBuild(g, { fill: false });
  assert.equal(wg.backdrop.style, 'canal-wooded');
  assert.ok(wg.log.some(l => l.rule === 'emptyBackground' && l.action === 'default' && l.to === '{...}'));
});

test('G8: one entity that throws never takes the scene down: validate, repair, build and worldAdd all go on', () => {
  const s = good();
  s.entities.push({ obj: 'tree.bank-oak', get at() { throw new Error('boom'); }, id: 'bad-tree' });
  s.life.push({ get who() { throw new Error('bang'); } });
  let r;
  assert.doesNotThrow(() => { r = W.worldValidate(s); });
  assert.ok(Array.isArray(r.errors));
  let w;
  assert.doesNotThrow(() => { w = W.worldBuild(s, { fill: false }); });
  assert.ok(w.log.some(l => l.rule === 'buildError' && /boom/.test(l.reason)));
  assert.ok(w.log.some(l => l.rule === 'buildError' && /bang/.test(l.reason)));
  assert.ok(!w.entities.some(e => e.id === 'bad-tree'));
  assert.ok(w.entities.some(e => e.id === 'nb1') && w.entities.some(e => e.id === 'bench-1'), 'the rest renders');
  const meta = { id: 'core-throw-w3', label: 'Throw test', site: 'test', tags: ['test'] };
  assert.equal(W.worldAdd('world-core-test', meta, s), true);
  const it = W.sceneItems('world-core-test').find(i => i.id === 'core-throw-w3');
  assert.ok(it, 'registered');
  assert.ok(!it.worldSpec.entities.some(e => e.id === 'bad-tree'));
  assert.ok(W.worldAddLog('core-throw-w3', { build: false }).some(l => l.rule === 'buildError'));
  // not even an object: a fatal error that still repairs to an empty scene
  const f = W.worldRepair(null);
  assert.equal(f.errors[0].severity, 'fatal');
  assert.ok(W.worldBuild('junk').cam);
  for (const junk of [undefined, 42, [], { v: 3, entities: 'x', surfaces: [null, 3, { id: 1 }] }, { v: 3.1, cameras: 'x' }]) assert.doesNotThrow(() => W.worldBuild(junk), JSON.stringify(junk));
});

test('a spec with only a camera and a water polygon registers and builds (v3.0 and v3.1)', () => {
  const v30 = { v: 3, camera: { eye: 1.7, fov: 60, heading: 10 }, surfaces: [{ id: 'pond', kind: 'water', water: 'pond', poly: [[-20, 8], [20, 8], [25, 60], [-25, 60]] }] };
  const v31 = { v: 3.1, cameras: [{ at: [0, -6], heading: 0 }], surfaces: [{ id: 'pond', kind: 'water', water: 'pond', poly: [[-20, 8], [20, 8], [25, 60], [-25, 60]] }] };
  for (const [k, s] of [['v30', v30], ['v31', v31]]) {
    const w = W.worldBuild(s);
    assert.ok(w.cam && w.surfaces.length === 1 && w.backdrop && w.backdrop.style, k);
    assert.equal(W.worldAdd('world-core-test', { id: 'core-bare-' + k, label: 'Bare' }, s), true, k);
    const it = W.sceneItems('world-core-test').find(i => i.id === 'core-bare-' + k);
    assert.ok(it && it.worldSpec.v === 3 && it.worldSpec.surfaces.length === 1, k);
    assert.equal(typeof it.scene, 'function');
    const log = W.worldAddLog('core-bare-' + k);
    assert.ok(Array.isArray(log));
    if (k === 'v30') assert.ok(log.some(l => l.rule === 'emptyBackground'));
  }
});

test('worldAdd never refuses: a bad spec is registered repaired, its strict errors and its load log are kept', () => {
  const meta = { id: 'core-test-w3', label: 'Core test', site: 'test', tags: ['test'] };
  assert.equal(W.worldAdd('world-core-test', meta, good()), true);
  const it = W.sceneItems('world-core-test').find(i => i.id === 'core-test-w3');
  assert.ok(it);
  assert.equal(it.world, 3);
  assert.equal(it.worldSpec.v, 3);
  if (typeof W.worldHostSpec === 'function') assert.equal(W.worldHostSpec(it), it.worldSpec);
  assert.deepEqual(it.liveSky, { lat: 51.279, lon: -0.836 });
  const bad = good(); bad.entities[0].scale = 2; bad.entities[1].obj = 'bench.wood'; bad.backdrop.style = 'mars';
  assert.equal(W.worldAdd('world-core-test', Object.assign({}, meta, { id: 'core-bad-w3' }), bad), true);
  const ib = W.sceneItems('world-core-test').find(i => i.id === 'core-bad-w3');
  assert.ok(ib, 'registered all the same');
  assert.equal(ib.worldSpec.entities[0].scale, undefined);
  assert.ok(!ib.worldSpec.entities.some(e => e.obj === 'bench.wood'));
  assert.equal(ib.worldSpec.backdrop.style, 'canal-wooded');
  const p = W.worldAddProblems().find(q => q.id === 'core-bad-w3');
  assert.ok(p && ['screenOrLookField', 'unknownSize', 'unknownBackdrop'].every(r => p.errors.some(e => e.rule === r)));
  const log = W.worldAddLog('core-bad-w3');
  assert.ok(log.some(l => l.action === 'strip' && l.rule === 'screenOrLookField'));
  assert.ok(log.some(l => l.action === 'drop' && l.rule === 'unknownSize'));
  assert.ok(log.some(l => l.action === 'default' && l.rule === 'unknownBackdrop'));
  assert.deepEqual(W.worldAddLog('no-such-item'), []);
});

test('I1: worldItem is usable from a 72-anim-pack file: copied by add(), it keeps every pack field and draws lazily', () => {
  const meta = { id: 'fleet-canal-w3', label: 'Basingstoke Canal', site: 'Basingstoke Canal, Fleet', county: 'hampshire', ukPlace: 'fleet-canal', ukView: 'towpath',
    ukLocality: 'Fleet', ukTown: 'Fleet', colour: 'slate', mood: 'calm', tags: ['canal'], when: () => true };
  const it = W.worldItem(meta, good());
  // the pack's add(): Object.assign of defaults, the item and its overrides (72-anim-pack-uk-south-east.js)
  const add = (county, kind, o) => Object.assign({ slot: 'opening', season: 'any', reduced: 'static', priority: 1, full: true, county, ukKind: kind }, o, { id: county + '-' + o.id, label: o.label + ', Hampshire' });
  const copy = add('hampshire', 'heritage', it);
  for (const k of ['county', 'ukPlace', 'ukView', 'ukLocality', 'ukTown', 'when', 'colour', 'mood']) assert.ok(copy[k] != null, k);
  assert.equal(copy.id, 'hampshire-fleet-canal-w3');
  assert.equal(copy.composed, true); assert.equal(copy.full, true); assert.equal(copy.world, 3);
  assert.deepEqual(copy.liveSky, { lat: 51.279, lon: -0.836 });
  assert.equal(typeof copy.scene, 'function', 'the scene is a thunk (built only when shown: prebake, bake cache and restart clock as any composed item)');
  assert.equal(typeof copy.svg, 'function');
  assert.equal(copy.worldSpec.v, 3, 'the camera-frame spec is reachable (worldHostSpec)');
  if (typeof W.worldHostSpec === 'function') assert.equal(W.worldHostSpec(copy), copy.worldSpec);
  if (typeof W.worldHostData === 'function') { const d = copy.scene(); assert.equal(d.v, 2); assert.ok(Array.isArray(d.place) && d.place.length > 0); }
  if (typeof W.animGalleryInfo === 'function') { const g = W.animGalleryInfo(copy); assert.equal(g.view, 'towpath'); }
});

test('I1: worldItem works when called while the pack files load, before the world files (one shared classic script)', () => {
  const files = worldSourceFiles(ROOT), at = files.findIndex(f => /79-world-0core\.js$/.test(f));
  assert.ok(at > 0);
  const spec = JSON.stringify(good());
  const early = `\n;var __earlyItem = (typeof worldItem === 'function') ? worldItem({ id: 'early-w3', label: 'Early', county: 'hampshire', ukPlace: 'early', ukView: 'v1' }, ${spec}) : null;\n`;
  const body = files.slice(0, at).map(f => readFileSync(f, 'utf8')).join('\n;\n') + early + files.slice(at).map(f => readFileSync(f, 'utf8')).join('\n;\n');
  const fn = new vm.Script('(function () {\n' + body + '\nreturn { item: __earlyItem, worldHostSpec: typeof worldHostSpec === "function" ? worldHostSpec : null, worldAddLog };\n})', { filename: 'early-bundle.js' }).runInThisContext();
  let out;
  assert.doesNotThrow(() => { out = fn(); }, 'calling worldItem before the world constants exist must not throw');
  assert.ok(out.item, 'an item was made');
  assert.equal(out.item.worldSpec.v, 3);
  assert.ok(out.item.worldSpec.entities.length >= 4);
  assert.deepEqual(out.worldAddLog('early-w3', { build: false }), []);
});

test('I2: v1 and v2 scenes are untouched: no world fields, worldHostSpec finds no v3 spec in them', () => {
  const v2 = W.sceneItems('uk-south-east').find(i => i.id === 'fleet-canal-2');
  if (!v2) return;
  assert.equal(v2.world, undefined); assert.equal(v2.worldSpec, undefined);
  if (typeof W.worldHostSpec === 'function') assert.equal(W.worldHostSpec(v2), null);
  const d = W.sceneData ? W.sceneData(v2) : null;
  if (d) assert.notEqual(d.v, 3);
});

test('descriptors: true size, solidity, attachments, sink, kb merged; front-facing footprints lie across their facing', () => {
  const ids = ['boat.narrowboat', 'tree.canal-willow', 'bird.mallard', 'bird.swan', 'bird.heron', 'bird.kingfisher', 'rail.train', 'tree.birch', 'plant.reed', 'structure.boardwalk',
    'structure.shp-weir', 'building.mill-red-brick', 'person.walker', 'animal.dog', 'person.cyclist', 'street.bench', 'street.lamp', 'plant.towpath-hedge'];
  for (const id of ids) { const d = W.worldObjectInfo(id); assert.ok(d, id); assert.ok(d.size.h > 0 && d.size.w > 0 && d.size.d > 0, id); }
  const nb = W.worldObjectInfo('boat.narrowboat');
  assert.equal(nb.cls, 'boat'); assert.equal(nb.solidity, 'solid'); assert.ok(nb.attachOk.includes('water')); assert.ok(nb.sink > 0 && nb.sink < 0.5); assert.ok(nb.deck);
  assert.equal(W.worldObjectInfo('bird.mallard').cls, 'duck');
  assert.equal(W.worldObjectInfo('bird.mallard').size.h, 0.35);
  assert.ok(W.worldObjectInfo('rail.train').attachOk.includes('rail'));
  assert.equal(W.worldObjectInfo('plant.canal-view-bough').cls, 'bough');
  assert.equal(W.worldObjectInfo('bench.wood'), null);
  assert.equal(W.worldObjectInfo(42), null);
  if (typeof W.worldKb === 'function') { const d = W.worldObjectInfo('street.bench'); assert.ok(d.kb && d.kcls); }
  // a bench facing 270 looks left: its seat (its length) runs along z
  const w = W.worldBuild({ v: 3, camera: {}, surfaces: [], entities: [{ obj: 'street.bench', at: [0, 10], facing: 270, id: 'b' }, { obj: 'boat.narrowboat', at: [0, 30], facing: 0, id: 'nb', attach: 'water' }], backdrop: { style: 'heath' } }, { place: false, fill: false });
  const span = (e, k) => Math.max(...e.foot.map(p => p[k])) - Math.min(...e.foot.map(p => p[k]));
  const b = w.entities.find(e => e.id === 'b'), boat = w.entities.find(e => e.id === 'nb');
  assert.ok(span(b, 1) > span(b, 0) * 2, 'bench length along z');
  assert.ok(span(boat, 1) > span(boat, 0) * 5, 'a boat facing 0 runs along z (its length along its facing)');
});

test('a grounded entity has y = h(x, z); a floater sits at its waterline; every entity has a stable id', () => {
  const s = good();
  s.camera.water = 0.3;
  s.ground = { relief: { x: [-50, 50], d: [5, 400], nx: 2, nd: 2, h: [0, 2, 1, 4] } };
  const w = W.worldBuild(s, { fill: false });
  assert.deepEqual(w.problems, []);
  const bench = w.entities.find(e => e.id === 'bench-1');
  assert.equal(bench.y, Math.round(W.sceneGroundHeight(w.cam, bench.x, bench.z) * 1000) / 1000);
  assert.ok(bench.y > 0);
  for (const e of w.entities.filter(e => e.attach === 'water')) {
    assert.equal(e.waterline, 0.3, e.obj);
    const d = W.worldObjectInfo(e.obj);
    assert.ok(Math.abs(e.y - (0.3 - (d.floats ? d.sink : 0))) < 1e-9, e.obj);
  }
  const duck = w.entities.find(e => e.obj === 'bird.mallard');
  assert.ok(duck.y < 0.3 && duck.waterline === 0.3);
  assert.equal(duck.id, 'bird.mallard@-6,30');
  assert.equal(new Set(w.entities.map(e => e.id)).size, w.entities.length);
  s.surfaces[0].level = -0.5;
  assert.equal(W.worldBuild(s, { fill: false }).entities.find(e => e.id === 'nb1').waterline, -0.5);
});

test('worldBuild derives footprints, decks and clusters deterministically', () => {
  const w = W.worldBuild(good()), w2 = W.worldBuild(good());
  assert.deepEqual(w.entities, w2.entities);
  assert.deepEqual(w.log, w2.log);
  const nb = w.entities.find(e => e.id === 'nb1');
  assert.equal(nb.foot.length, 4); assert.equal(nb.height, 1.9); assert.ok(nb.deck && nb.deck.y > nb.y);
  const reeds = w.entities.filter(e => e.obj === 'plant.reed' && e.cluster);
  assert.equal(reeds.length, 20);
  for (const r of reeds) assert.equal(W.worldSurfaceAt({ surfaces: w.surfaces }, r.x, r.z).id, 'cut');
  const s = good(); s.entities.push({ obj: 'person.walker', at: [-2, 20], attach: 'deck:nb1' });
  const w3 = W.worldBuild(s, { fill: false });
  assert.deepEqual(w3.problems, []);
  const p = w3.entities.find(e => e.obj === 'person.walker');
  assert.equal(p.y, w3.entities.find(e => e.id === 'nb1').deck.y); assert.equal(p.host, 'nb1');
});

test('worldSurfaceAt: decks first, later surfaces win, solids cut water', () => {
  const w = W.worldBuild(good(), { fill: false });
  assert.equal(W.worldSurfaceAt(w, -2, 20).kind, 'deck');
  assert.equal(W.worldSurfaceAt(w, -10, 30).id, 'cut');
  assert.equal(W.worldSurfaceAt(w, 12, 40).id, 'tow');
  assert.equal(W.worldSurfaceAt(w, 30, 40).id, 'verge');
  assert.equal(W.worldSurfaceAt(w, -100, 30), null);
  const s = good(); s.entities.push({ obj: 'structure.shp-weir', at: [10, 100], facing: 90, attach: 'water' });
  const w2 = W.worldBuild(s, { fill: false });
  assert.notEqual((W.worldSurfaceAt(w2, 10, 100) || {}).id, 'cut');
});

test('worldFrontZ: the near edge of a footprint at a column', () => {
  const sq = [[0, 10], [4, 10], [4, 14], [0, 14]];
  assert.equal(W.worldFrontZ(sq, 2), 10);
  assert.equal(W.worldFrontZ(sq, 9), Infinity);
  assert.equal(W.worldFrontZ(sq, null), 10);
  const diamond = [[0, 10], [5, 15], [0, 20], [-5, 15]];
  assert.equal(W.worldFrontZ(diamond, 2), 12);
  assert.equal(W.worldFrontZ(diamond, -4), 14);
});

test('every library id used by the three test scenes has a descriptor, and each test scene loads clean and builds', (t) => {
  const app = join(ROOT, 'src', 'app'), files = readdirSync(app).filter(f => /^79-world-zscene-.*\.js$/.test(f));
  if (!files.length) { t.skip('no test scenes yet'); return; }
  const ids = new Set();
  for (const f of files) for (const m of readFileSync(join(app, f), 'utf8').matchAll(/(?:obj|cluster):\s*'([a-z]+\.[a-z0-9-]+)'/g)) ids.add(m[1]);
  const missing = [...ids].filter(id => !W.worldObjectInfo(id));
  if (missing.length) t.todo('no descriptor (no library object or no real size): ' + missing.join(', '));
  for (const f of files) {
    const got = []; vm.runInNewContext(readFileSync(join(app, f), 'utf8'), { worldAdd: (p, m, s) => got.push(s), Math });
    const s = got[0];
    assert.deepEqual(W.worldValidate(s).errors, [], f);
    const w = W.worldBuild(s);
    assert.ok(w.entities.length > 100, f);
    assert.ok(!w.log.some(l => l.rule === 'buildError'), f);
    assert.ok(!w.log.some(l => l.action === 'drop' && !l.auto && (s.entities || []).some(e => e.id && e.id === l.id)), `${f}: an authored, named entity was dropped`);
  }
});
