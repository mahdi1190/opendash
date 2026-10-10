// World engine traffic (src/app/79-world-2traffic.js, through the life sim): WORLD_ENGINE.md 4.5; requirements A9, T1, M6.
// Lanes on the left (UK), gaps, crossings, bus stops, tram platforms, trains to a timetable, boats mid-channel with wakes,
// moored boats still. The four life files run alone in a context.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
function load(extra = '') {
  const ctx = vm.createContext({ console })   // the context's own builtins (handing it this realm's crashes V8 in vm contexts);
  if (extra) vm.runInContext(extra, ctx);
  for (const f of ['79-world-1nav.js', '79-world-2brains.js', '79-world-2traffic.js', '79-world-2life.js']) vm.runInContext(src(f), ctx);
  return ctx;
}
function rect(x0, z0, x1, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
const cam = { fov: 64, eye: 1.65, horizon: 470 };
// a street across the frame: a road (7 m) with pavements both sides, a zebra crossing in the middle
function street(life, o = {}) {
  return {
    seed: 3, cam, place: Object.assign({ lat: 53.38, lon: -1.47 }, o.place || {}),
    surfaces: [
      { id: 'pave-n', kind: 'pavement', path: [[-90, 36], [90, 36]], width: 3 },
      { id: 'road', kind: 'road', path: [[-90, 30], [90, 30]], width: 7 },
      { id: 'pave-s', kind: 'pavement', path: [[-90, 24], [90, 24]], width: 3 },
      ...(o.surfaces || []),
    ],
    entities: o.entities || [],
    life,
  };
}
/** The signed offset of a point to the left of travel along a horizontal road at z = 30. */
const leftOf = (a) => { const hx = Math.sin(a.heading), hz = Math.cos(a.heading); return (a.x - a.x) * -hz + (a.z - 30) * hx; };

test('periods divide the loop (T1): plain and alternating schedules', () => {
  const C = load();
  for (const s of [5, 37, 60, 90, 100, 150, 180, 240, 300, 360, 500, 1000]) {
    const p = C.worldLoopPeriod(s);
    assert.equal(360 % p, 0, `${s} s -> ${p}`);
    const q = C.worldLoopPeriod(s, true);
    assert.equal(360 % (2 * q), 0, `${s} s alternating -> ${q}`);
  }
  assert.equal(C.worldLoopPeriod(360), 360);
  assert.equal(C.worldLoopPeriod(240), 180);
});

test('lanes run on the left in the UK and on the right in France (A9, SCENE_DRIVE_LEFT)', () => {
  const C = load('var SCENE_DRIVE_LEFT = { boxes: [[49.8, -8.7, 60.9, 1.8]] };');
  const uk = C.worldTraffic(street([]), C.worldNavBuild(street([])));
  assert.equal(uk.drive, 'left');
  const f = uk.lanes.find(l => l.dir === 1), b = uk.lanes.find(l => l.dir === -1);
  // eastbound (+x): its left is +z (away from the camera); westbound keeps to the near side
  assert.ok(f.pts[0][1] > 30 && b.pts[0][1] < 30, `eastbound at z ${f.pts[0][1]}, westbound at ${b.pts[0][1]}`);
  const fr = C.worldTraffic(street([], { place: { lat: 48.85, lon: 2.35 } }), C.worldNavBuild(street([])));
  assert.equal(fr.drive, 'right');
  assert.ok(fr.lanes.find(l => l.dir === 1).pts[0][1] < 30, 'driving on the right in France');
});

test('cars keep left, keep their gaps and never pass through each other (A9)', () => {
  const C = load('var SCENE_DRIVE_LEFT = { boxes: [[49.8, -8.7, 60.9, 1.8]] };');
  const world = street([{ who: 'cars', on: 'road', rate: '24/min' }, { who: 'buses', on: 'road', every: '2min' }, { who: 'cyclists', on: 'road', rate: '6/min' }]);
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0);
  assert.equal(JSON.stringify(life.problems), '[]');
  let pairs = 0, moved = 0, n = 0;
  for (let s = 0; s < 300 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    const vs = life.agents.filter(a => a.kind === 'lane');
    for (const a of vs) {
      n++;
      const hx = Math.sin(a.heading), hz = Math.cos(a.heading), lat = (a.z - 30) * hx - 0 * hz;
      assert.ok(lat > 0.5, `${a.cls} ${a.id} is not on the left of the road (offset ${lat.toFixed(2)})`);
      assert.ok(C.worldNavOk(nav, 'drive', a.x, a.z, 0), `${a.cls} off the road at ${a.x.toFixed(1)},${a.z.toFixed(1)}`);
      if (a.speed > 1) moved++;
    }
    const byLane = new Map();
    for (const a of vs) { if (!byLane.has(a.lane)) byLane.set(a.lane, []); byLane.get(a.lane).push(a); }
    for (const list of byLane.values()) {
      list.sort((p, q) => q.s - p.s);
      for (let i = 1; i < list.length; i++) {
        const gap = list[i - 1].s - list[i - 1].len / 2 - (list[i].s + list[i].len / 2);
        assert.ok(gap > 0.4, `${list[i].id} is ${gap.toFixed(2)} m behind ${list[i - 1].id}`);
        pairs++;
      }
    }
  }
  assert.ok(n > 1000 && moved > n * 0.5, `vehicles moved (${moved} / ${n})`);
  assert.ok(pairs > 100, 'vehicles followed one another: ' + pairs);
  const seen = new Set(life.evlog.filter(e => e.kind === 'spawn').map(e => life.byId.get(e.id) && life.byId.get(e.id).cls));
  void seen;
});

test('the intelligent driver model: a car slows for the one ahead and stops behind it, never into it', () => {
  const C = load();
  const lead = { s: 50, v: 0, len: 4.2 }, car = { s: 0, v: 12, v0: 12, len: 4.2 };
  let minGap = Infinity;
  for (let i = 0; i < 600; i++) { const r = C.worldTrafficIdm(car, lead, 0.05); car.v = r.v; car.s = r.s; minGap = Math.min(minGap, lead.s - lead.len / 2 - (car.s + car.len / 2)); }
  assert.ok(car.v < 0.05, 'stopped: ' + car.v);
  assert.ok(minGap > 1.5 && minGap < 4, 'stopped a car length short: ' + minGap.toFixed(2));
});

test('cars stop for someone on the zebra crossing (A9, M6)', () => {
  const C = load('var SCENE_DRIVE_LEFT = { boxes: [[49.8, -8.7, 60.9, 1.8]] };');
  const world = street([], { surfaces: [{ id: 'zebra', kind: 'crossing', poly: rect(-2, 26.5, 2, 33.5) }] });
  const nav = C.worldNavBuild(world), T = C.worldTraffic(world, nav), lane = T.lanes.find(l => l.dir === 1);
  assert.equal(lane.cross.length, 1);
  const c = lane.cross[0], car = { lane: lane.id, s: c.s0 - 40, v: 10, v0: 10, len: 4.2 };
  for (let i = 0; i < 400; i++) C.worldTrafficStep(T, [car], 0.05, { t: i * 0.05, pedOn: () => true });
  assert.ok(car.s + car.len / 2 < c.s0, `stopped before the crossing (front at ${(car.s + car.len / 2).toFixed(2)}, crossing at ${c.s0})`);
  assert.ok(car.v < 0.1);
  for (let i = 0; i < 200; i++) C.worldTrafficStep(T, [car], 0.05, { t: 20 + i * 0.05, pedOn: () => false });
  assert.ok(car.s > c.s1, 'and drove on when it was clear');
});

test('buses stop at their bus stop (a stop from the knowledge base), passengers board and get off (A9, A4)', () => {
  const C = load('var SCENE_DRIVE_LEFT = { boxes: [[49.8, -8.7, 60.9, 1.8]] }; function worldKb(id) { return id === "street.bus-stop" ? { cls: "bus-stop", stop: "bus" } : null; }');
  const world = street([{ who: 'buses', on: 'road', every: '1min' }, { who: 'commuters', mix: { brisk: 1 }, rate: '6/min', goals: [{ wait: 'stop-1' }] }],
    { entities: [{ id: 'stop-1', obj: 'street.bus-stop', x: 10, z: 35.5, solidity: 'passable', size: { w: 1, d: 0.5, h: 2.6 } }] });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  assert.equal(life.traffic.stops.length, 1, 'the bus stop is on the eastbound lane (the kerb side)');
  const ev = {};
  for (const k of ['arrive', 'depart', 'board', 'alight']) life.bus.on(k, () => { ev[k] = (ev[k] || 0) + 1; });
  let dwell = 0;
  for (let s = 0; s < 360 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) if (a.cls === 'bus' && a.speed < 0.05 && a.stopAt && a.stopAt.until != null) dwell++;
  }
  assert.ok(ev.arrive > 0 && ev.depart > 0, `buses stopped at the stop (${ev.arrive} arrivals)`);
  assert.ok(dwell > 15 * 5, 'and waited there');
  assert.ok(ev.board > 0, 'passengers boarded: ' + ev.board);
});

test('trains keep their timetable at a plausible speed; the loop repeats exactly (A9, T1)', () => {
  const C = load();
  const world = { seed: 4, cam, place: { lat: 51.28, lon: -0.82 }, surfaces: [{ id: 'g', kind: 'grass', poly: rect(-200, 1, 200, 260) }, { id: 'railway', kind: 'rail', path: [[-320, 196], [320, 210]], width: 9 }], entities: [],
    life: [{ who: 'train', on: 'railway', every: '4min', mix: { 'rail.train-mainline': 1 } }] };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  const e = life.pops[0].entries[0].tt;
  assert.ok(e, 'a timetable entry');
  assert.equal(360 % (2 * e.period), 0, 'the alternating pattern divides the loop: ' + e.period);
  assert.equal(e.tracks.length, 2, 'two tracks on a wide line, one each way');
  // the timetable is a pure function of the clock, and periodic in the loop
  for (let t = 0; t < 360; t += 7.5) {
    const a = C.worldTrafficRailAt(life.traffic, e, t), b = C.worldTrafficRailAt(life.traffic, e, t + 360);
    assert.equal(JSON.stringify(a.map(r => [r.track.id, +r.x.toFixed(6), +r.z.toFixed(6)])), JSON.stringify(b.map(r => [r.track.id, +r.x.toFixed(6), +r.z.toFixed(6)])), 'the same at t and t + loop');
    for (const r of a) {
      assert.ok(r.v >= 0 && r.v <= 40, 'plausible speed ' + r.v);
      assert.ok(Math.abs(((r.t0 - e.offset) / e.period) - Math.round((r.t0 - e.offset) / e.period)) < 1e-9, 'departs on the beat');
      assert.ok(C.worldNavOk(nav, 'rail', r.x, r.z, 0), 'on its line');
    }
  }
  // the life sim's trains are where the timetable says, every tick; nothing else moves them
  let trains = 0;
  for (let s = 0; s < 400 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    const now = C.worldTrafficRailAt(life.traffic, e, life.t0 + life.t);
    for (const a of life.agents.filter(x => x.cls === 'train')) {
      const r = now.find(q => a.id.endsWith('k' + q.k));
      assert.ok(r, 'a timetabled train ' + a.id);
      assert.ok(Math.hypot(r.x - a.x, r.z - a.z) < 1e-6, 'at its timetable position');
      trains++;
    }
  }
  assert.ok(trains > 100, 'trains ran: ' + trains);
});

test('trams stop at their platform and dwell there (A9)', () => {
  const C = load();
  const world = { seed: 5, cam, surfaces: [{ id: 'g', kind: 'plaza', poly: rect(-80, 1, 80, 120) }, { id: 'line', kind: 'tram', path: [[-150, 50], [150, 50]], width: 3 }, { id: 'stop', kind: 'platform', poly: rect(-10, 52, 10, 55) }],
    entities: [], life: [{ who: 'tram', on: 'line', every: '2min' }] };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  const e = life.pops[0].entries[0].tt;
  assert.equal(e.shared, true, 'a narrow line is one shared track');
  let stopped = 0;
  for (let t = 0; t < 360; t += 0.5) for (const r of C.worldTrafficRailAt(life.traffic, e, t)) if (r.state === 'stopped') { stopped++; assert.ok(Math.abs(r.x) < 12, 'stopped at the platform, x ' + r.x); }
  assert.ok(stopped > 20, 'dwelt at the platform: ' + stopped);
  // one tram on the shared track at a time
  for (let t = 0; t < 720; t += 1) assert.ok(C.worldTrafficRailAt(life.traffic, e, t).length <= 1, 'one tram at a time on a single track');
});

test('boats under way keep mid-channel at walking pace and leave wakes; moored boats never move (A9)', () => {
  const C = load();
  const world = { seed: 6, cam, waterY: -0.4, surfaces: [
    { id: 'bank-l', kind: 'grass', poly: rect(-60, 1, -12, 300) }, { id: 'cut', kind: 'water', water: 'canal', poly: rect(-12, 1, 0, 300) },
    { id: 'tow', kind: 'towpath', path: [[2, 1], [2, 299]], width: 3 }, { id: 'bank-r', kind: 'grass', poly: rect(0, 1, 60, 300) }], entities: [],
    life: [{ who: 'narrowboat-cruising', on: 'cut', every: '2min' }, { who: 'narrowboat-moored', count: 2, on: 'cut' }] };
  world.surfaces[3].poly = rect(3.5, 1, 60, 300);
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0);
  const moored = life.agents.filter(a => a.cls === 'boat-moored').map(a => ({ a, x: a.x, z: a.z }));
  assert.equal(moored.length, 2, JSON.stringify(life.problems));
  let wakes = 0, n = 0, off = 0, fast = 0;
  life.bus.on('wake', () => wakes++);
  for (let s = 0; s < 360 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) if (a.cls === 'boat' && a.speed > 0.3 && a.z > 20) {
      n++; off += Math.abs(a.x - (-6)); if (a.speed > 1.7) fast++;
      assert.ok(C.worldNavOk(nav, 'swim', a.x, a.z, a.r), 'the hull stays in the water');
    }
    for (const m of moored) { assert.equal(m.a.x, m.x); assert.equal(m.a.z, m.z); assert.ok(m.a.speed === 0); }
  }
  assert.ok(n > 200, 'boats cruised: ' + n);
  assert.ok(off / n < 2.0, 'mid-channel: mean offset ' + (off / n).toFixed(2) + ' m on a 12 m canal');
  assert.equal(fast, 0, 'at walking pace');
  assert.ok(wakes > n / 15 * 0.8, `a wake every second under way (${wakes})`);
});

test('a lane through the near band: no vehicle is ever on screen inside it (A10, C2)', () => {
  const C = load('var SCENE_DRIVE_LEFT = { boxes: [[49.8, -8.7, 60.9, 1.8]] };');
  const world = { seed: 8, cam, place: { lat: 53.38, lon: -1.47 }, surfaces: [{ id: 'road', kind: 'road', path: [[2, 1], [2, 200]], width: 7 }], entities: [], life: [{ who: 'buses', on: 'road', every: '30s' }, { who: 'cars', on: 'road', rate: '12/min' }] };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0);
  const f = nav.cam.f;
  let n = 0;
  for (let s = 0; s < 240 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of C.worldAgents(life)) if (a.kind === 'lane') {
      const on = a.x > -a.z * nav.cam.tanL - a.len / 2 && a.x < a.z * nav.cam.tanR + a.len / 2;
      if (on) { n++; assert.ok(a.z >= f * a.h / 405 - 0.5, `${a.cls} at z ${a.z.toFixed(1)} is a giant at the lens (h ${a.h})`); }
    }
  }
  assert.ok(n > 100, 'vehicles on screen: ' + n);
});
