// Crowds and traffic (docs/dev/SCENE_ENGINE_V2.md 9 and 27.4; builder D): the pure flow engine (src/app/70-scene-1flow.js) loaded
// with the library through the registry bundle, the view objects (70-scene-lib-vehicles-views.js), and, when Chrome and B's pass
// registry are in the checkout, the flow pass (78-scene-flow.js) drawing a small v2 scene through the real renderer.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { loadRegistry, findBrowser } from '../tools/lib/anim-render.mjs';
import { engineOf, lintObject } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const g = REG.R.get;
const E = engineOf(REG);
const FLOW = typeof g('sceneFlowCompile') === 'function' ? false : 'the flow engine (70-scene-1flow.js) is not in this build';
const deep = (x) => JSON.parse(JSON.stringify(x));

/** A small v2 scene: a straight UK road with pavements, a canal with a towpath (all declared in ground metres). */
function scene(over = {}) {
  return Object.assign({
    v: 2, id: 'flow-test', view: { lat: 51.32, lon: -0.56 }, camera: { eye: 1.7, fov: 60, horizon: 450, heading: 160 }, at: 'noon',
    surfaces: [
      { id: 'land', kind: 'grass', rest: true },
      { id: 'road', kind: 'road', path: [[0, 3], [0, 400]], width: 7.2 },
      { id: 'pave-l', kind: 'pavement', beside: 'road', side: 'left', width: 3 },
      { id: 'pave-r', kind: 'pavement', beside: 'road', side: 'right', width: 3 },
    ],
    water: [{ id: 'canal', kind: 'canal', path: [[24, 4], [24, 300]], width: 10, banks: { left: { surface: 'towpath', width: 2.6 } } }],
    flows: [
      { id: 'walkers', kind: 'walk', on: ['pave-l', 'pave-r'], density: 1, profile: 'town', max: 14 },
      { id: 'traffic', kind: 'drive', on: 'road', density: 1.4, profile: 'commuter', mix: { 'vehicle.car': 5, 'vehicle.taxi': 1 }, bus: { obj: 'vehicle.bus', every: 4, stops: [{ along: 0.3, dwell: 20 }] }, max: 12 },
      { id: 'boats', kind: 'boat', on: 'canal', density: 0.5, profile: 'boats', max: 3 },
    ],
  }, over);
}
/** The compiled flows of a scene, on a minimal compiled form (the camera from the data: A's compile is not needed). */
function compiled(data, extra = {}) {
  const C = Object.assign({ v: 2, season: 'summer', problems: [], stats: { animatedDraws: 0 } }, extra);
  C.cam = g('_scflCam')(data, null);
  C.flows = g('sceneFlowCompile')(data, C);
  return C;
}
const L = (hour, weekday = 3, more = {}) => Object.assign({ localHour: hour, weekday, alt: 30 }, more);

test('flows: the compile is deterministic, pure JSON, and makes keep-left lanes on a UK road (keep-right when drive is right)', { skip: FLOW }, () => {
  const a = compiled(scene()), b = compiled(scene());
  assert.deepEqual(deep(a.flows), deep(b.flows));
  assert.deepEqual(deep(a.flows), a.flows.map(f => deep(f)), 'plain data');
  const road = a.flows.find(f => f.id === 'traffic');
  assert.equal(road.lanes.length, 2, 'a 7.2 m road has two lanes');
  // the road runs along +d at x = 0: the lane left of the path (x < 0) travels along it (dir 1) when driving on the left
  for (const ln of road.lanes) { const x = ln.path[Math.floor(ln.path.length / 2)][0]; assert.equal(ln.dir, x < 0 ? 1 : -1, `lane at x ${x}`); }
  const right = compiled(scene({ drive: 'right' })).flows.find(f => f.id === 'traffic');
  for (const ln of right.lanes) { const x = ln.path[Math.floor(ln.path.length / 2)][0]; assert.equal(ln.dir, x < 0 ? -1 : 1); }
  assert.equal(g('sceneDriveSide')({ view: { lat: 48.85, lon: 2.35 } }), 'right', 'Paris drives on the right');
  assert.equal(g('sceneDriveSide')({ view: { lat: 53.38, lon: -1.47 } }), 'left', 'Sheffield on the left');
  // the canal's bank is a surface the walkers may use: <water id>-left
  const towpath = compiled(scene({ flows: [{ id: 't', kind: 'walk', on: 'canal-left', max: 4 }] }));
  assert.ok(towpath.flows[0] && towpath.flows[0].lanes.length >= 1, 'the towpath beside the canal');
  const boats = a.flows.find(f => f.id === 'boats');
  assert.equal(boats.lanes.length, 2, 'a 10 m channel: one lane each way');
  assert.equal(boats.level, 0, 'boats sit at the water level');
});

test('flows: sceneFlowAgents is a pure function of t; the t = 0 still is already populated', { skip: FLOW }, () => {
  const C = compiled(scene()), agents = g('sceneFlowAgents');
  const a = agents(C, 12.5, L(12)), b = agents(compiled(scene()), 12.5, L(12));
  assert.deepEqual(deep(a), deep(b));
  assert.ok(agents(C, 0, L(12)).length >= 6, 'a street already in motion at t = 0');
  const later = agents(C, 13, L(12));
  assert.notDeepEqual(deep(a).map(x => [x.x, x.d]), deep(later).map(x => [x.x, x.d]), 'they move');
  for (const x of a) { assert.ok(Number.isFinite(x.X) && Number.isFinite(x.Y) && x.s > 0); assert.ok(x.alpha > 0 && x.alpha <= 1); }
  // far to near
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].d >= a[i].d);
});

test('flows: no two vehicles of one lane closer than the headway, at 200 sampled times (no overtaking)', { skip: FLOW }, () => {
  const data = scene({ flows: [{ id: 'traffic', kind: 'drive', on: 'road', density: 3, profile: 'commuter', mix: { 'vehicle.car': 3, 'vehicle.taxi': 1 }, max: 40 }] });
  const C = compiled(data), flow = C.flows[0], S = g('_scflS'), P = g('SCENE_FLOW_PERIOD');
  let pairs = 0;
  flow.lanes.forEach((ln, li) => {
    const sched = g('sceneFlowSchedule')(flow, li, 1).list;
    assert.ok(sched.length > 10, 'a busy lane');
    for (let k = 0; k < 200; k++) {
      const tau = 37 + k * 2.9, on = [];
      for (const q of [Math.floor(tau / P) - 1, Math.floor(tau / P)]) for (const a of sched) { const u = tau - (q * P + a.t0); if (u >= 0 && u <= a.dur) on.push({ s: S(a, u), len: a.len }); }
      on.sort((x, y) => x.s - y.s);
      for (let i = 1; i < on.length; i++) { const gap = on[i].s - on[i - 1].s, need = 6 + (on[i].len + on[i - 1].len) / 2; assert.ok(gap >= need - 0.6, `lane ${li} at ${tau}: ${gap.toFixed(2)} m < ${need}`); pairs++; }
    }
  });
  assert.ok(pairs > 100, 'the check saw many pairs');
});

test('flows: the bus dwells at its stop; timetabled trams run every few minutes and stop at night', { skip: FLOW }, () => {
  g('sceneObjDefine')({ id: 'vehicle.tram-test', category: 'vehicle', size: [200,40], real: {h:3.5,l:30,w:2.5}, tags: ['tram'], build:()=>({body:[['#334455','M-100-40H100V0H-100Z']]}) });
  const C = compiled(scene({ flows: [{ id: 'traffic', kind: 'drive', on: 'road', density: 0.1, profile: 'commuter', mix: { 'vehicle.car': 1 }, bus: { obj: 'vehicle.bus', every: 3, stops: [{ along: 0.3, dwell: 25 }] }, max: 10 }] }));
  let dwelling = 0;
  for (let t = 0; t < 400; t += 2) dwelling += g('sceneFlowAgents')(C, t, L(9)).filter(a => a.bus && !a.moving && a.speed === 0).length;
  assert.ok(dwelling > 0, 'a bus stands at its stop');
  const T = compiled(scene({ surfaces: scene().surfaces.concat([{ id: 'tramline', kind: 'tramway', path: [[-1.5, 3], [-1.5, 400]], width: 6 }]), flows: [{ id: 'trams', kind: 'tram', on: 'tramline', timetable: { every: 4, dwell: 20, stops: [{ along: 0.4 }] }, obj: 'vehicle.tram-test' }] }));
  const day = [], night = [];
  for (let t = 0; t < 600; t += 5) { day.push(g('sceneFlowAgents')(T, t, L(12)).length); night.push(g('sceneFlowAgents')(T, t, L(3)).length); }
  assert.ok(day.some(n => n > 0), 'trams by day'); assert.ok(night.every(n => n === 0), 'no service at 3 h');
});

test('flows: profiles by the hour (8 h above 13 h, 3 h near 0), weekends, rain halves the walkers, snow moors the boats', { skip: FLOW }, () => {
  const P = g('sceneFlowProfile');
  assert.ok(P('commuter', 8, 3) > P('commuter', 13, 3)); assert.ok(P('commuter', 3, 3) < 0.1);
  assert.ok(P('town', 12, 6) > P('town', 12, 3), 'Saturday is busier in town'); assert.ok(P('town', 12, 0) < P('town', 12, 6), 'Sunday less than Saturday');
  const C = compiled(scene()), walk = C.flows.find(f => f.kind === 'walk'), boat = C.flows.find(f => f.kind === 'boat'), M = g('sceneFlowMult');
  const dry = M(walk, L(12), {}, 'summer'), wet = M(walk, L(12, 3, { wx: { kind: 'rain', rain: 0.8 } }), {}, 'summer');
  assert.equal(wet, Math.round(dry * 0.5 * 20) / 20);
  assert.equal(M(boat, L(12, 3, { wx: { kind: 'snow', snow: 0.9 } }), {}, 'winter'), 0);
  assert.ok(M(boat, L(12), {}, 'summer') > M(boat, L(12), {}, 'winter'), 'boats: summer x 1.5, winter x 0.2');
  assert.equal(M(boat, L(23, 3, { alt: -20 }), {}, 'summer'), 0, 'no boats in the dark');
  // the crowd thins without reshuffling: everyone on the street at the quieter hour was also there at the busy one
  const busy = new Set(g('sceneFlowAgents')(C, 30, L(12)).filter(a => a.kind === 'walk').map(a => a.k)), quiet = g('sceneFlowAgents')(C, 30, L(20)).filter(a => a.kind === 'walk');
  assert.ok(quiet.length < busy.size); for (const a of quiet) assert.ok(busy.has(a.k), 'a stable subset');
  // the hour from the light: C's localHour, else solar time from L.ms and the longitude
  assert.equal(Math.round(g('sceneFlowHour')({ ms: Date.parse('2026-10-08T12:00:00Z'), lon: 15 }, {}).hour), 13);
});

test('flows: the budget holds 60 agents and 300 draws (flowBudget); the LOD scales max', { skip: FLOW }, () => {
  const many = Array.from({ length: 6 }, (_, i) => ({ id: 'w' + i, kind: 'walk', on: ['pave-l', 'pave-r'], density: 3, max: 30 }));
  const C = compiled(scene({ flows: many }));
  const st = g('sceneFlowStats')(C.flows);
  assert.ok(st.flowMax <= 60, `${st.flowMax} agents`); assert.ok(st.flowDraws <= 300);
  assert.ok(C.problems.some(p => p.rule === 'flowBudget' && p.sev === 'info'));
  for (let t = 0; t < 300; t += 7) assert.ok(g('sceneFlowAgents')(C, t, L(12)).length <= 60);
  const lod = compiled(scene(), { lod: 0.3 });
  assert.ok(lod.flows.every((f, i) => f.max <= Math.round(compiled(scene()).flows[i].max * 0.3)), 'tiles show a few');
  const other = compiled(scene(), { stats: { animatedDraws: 260 } });
  assert.ok(g('sceneFlowStats')(other.flows).flowDraws + 260 <= 300, 'room left by the other animated draws');
});

test('flows: problems name the flow and the fix (an unknown surface, an unknown kind, boats on land)', { skip: FLOW }, () => {
  const C = compiled(scene({ flows: [{ id: 'x', kind: 'walk', on: 'nowhere' }, { id: 'y', kind: 'skate', on: 'road' }, { id: 'z', kind: 'boat', on: 'road' }] }));
  const rules = C.problems.map(p => p.rule + ':' + p.sev);
  assert.ok(rules.includes('flow:error'), 'unknown surface / kind is an error');
  assert.ok(C.problems.some(p => /no surface or water "nowhere"/.test(p.msg) && /on: one of/.test(p.fix)));
  assert.ok(C.problems.some(p => p.rule === 'flowSurface' && /not water/.test(p.msg)));
});

test('flows: views: a car along the sightline is drawn from the front or the rear; crossing, from the side; the view objects pass object lint', { skip: FLOW }, () => {
  const V = g('sceneFlowViewOf');
  assert.equal(V('vehicle.car', 10, false).view, 'rear'); assert.equal(V('vehicle.car', 10, true).view, 'front');
  assert.equal(V('vehicle.car', 80, true).view, 'side');
  assert.equal(V('vehicle.car', 10, true).o, 'vehicle.car-front');
  assert.equal(V('vehicle.metrolink-tram', 5, true).v, 1, 'a tram view keeps its livery');
  const missing = V('vehicle.tractor', 10, true);
  assert.equal(missing.view, 'side'); assert.equal(missing.missing, true);
  const C = compiled(scene()), views = new Set();
  for (let t = 0; t < 120; t += 3) for (const a of g('sceneFlowAgents')(C, t, L(17))) if (a.kind === 'drive') views.add(a.view);
  assert.ok(views.has('front') && views.has('rear'), 'a road along the view: fronts coming, rears going');
  const TH = { object: {} };
  for (const id of ['vehicle.car-front', 'vehicle.car-rear', 'vehicle.taxi-front', 'vehicle.taxi-rear', 'vehicle.bus-front', 'vehicle.bus-rear', 'vehicle.tram-front', 'vehicle.tram-rear', 'person.cyclist-front', 'person.cyclist-rear', 'boat.narrowboat-bow', 'boat.narrowboat-stern']) {
    const r = lintObject(id, { E, thresholds: TH });
    assert.ok(r.pass, `${id}: ${r.rules.filter(x => !x.ok).map(x => x.message).join('; ')}`);
    const d = E.obj(id);
    assert.equal(d.weight, 0, `${id}: weight 0 (no archetype picks a view)`); assert.ok(d.real && d.real.h > 0, `${id}: a real size`);
  }
  // weight 0: the kit picks (and so every archetype scene) never change
  assert.ok(!Object.keys(g('sceneKitPick')(['vehicles', 'urban', 'london'], 'vehicle', {})).some(id => /-(front|rear)$/.test(id)));
});

test('flows: the walkers of the kit walk (a walk hook), cyclists ride; umbrellas come out in the rain', { skip: FLOW }, () => {
  const C = compiled(scene({ flows: [{ id: 'w', kind: 'walk', on: ['pave-l', 'pave-r'], density: 2, max: 20 }] })), f = C.flows[0];
  for (const id of Object.keys(f.mix)) { const sh = E.shapes(id, 0, 'summer'); assert.ok(sh.anim.some(a => a.kind === 'walk'), `${id} walks`); assert.ok(!(E.obj(id).tags || []).includes('cyclist')); }
  assert.ok(f.pairs.length <= 14, 'a bounded palette of (object, variant) pairs (10 + 4)');
  if (f.rainObj) {
    const wet = g('sceneFlowAgents')(C, 40, L(12, 3, { wx: { kind: 'rain', rain: 1 } }));
    assert.ok(wet.some(a => a.base === f.rainObj), 'some walkers carry an umbrella');
  }
});

/* ---------------------------------------------------------------------------------------------
   The flow pass in the real renderer (headless Chrome; skipped without Chrome or without B's pass registry)
   --------------------------------------------------------------------------------------------- */
const CHROME = !findBrowser() ? 'no Chrome' : !existsSync(join(ROOT, 'src', 'app', '78-scene-0pass.js')) ? 'no pass registry (78-scene-0pass.js, builder B)' : FLOW;
test('flow pass (Chrome): agents draw through the canvas renderer; measured draws within the compile estimate; frame time recorded', { skip: CHROME, timeout: 180000 }, async () => {
  const { scenePerf } = await import('../tools/lib/scene-page.mjs');
  const { launchChrome } = await import('../tools/release-chrome.mjs');
  const chrome = await launchChrome({ executable: findBrowser() });
  try {
    const data = scene({ at: 'afternoon', place: [] });
    const r = await scenePerf(chrome, { root: ROOT, data, at: '2026-10-08T15:00:00Z', seconds: 2, size: { w: 1600, h: 900 } });
    assert.ok(r && r.passes, 'the renderer reports its passes');
    const fl = r.passes.flow;
    assert.ok(fl && fl.agents > 0, 'agents on screen');
    const est = g('sceneFlowStats')(compiled(data).flows);
    assert.ok(fl.draws <= est.flowDraws, `measured ${fl.draws} draws <= the estimate ${est.flowDraws}`);
    assert.ok(fl.draws >= fl.agents, 'at least one draw per agent');
    assert.ok(r.drawMs && r.drawMs.median > 0);
  } finally { await chrome.close(); }
});
after(() => {});
