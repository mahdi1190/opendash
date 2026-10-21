// World engine life (src/app/79-world-2life.js with 79-world-2brains.js, 79-world-1nav.js and 79-world-2traffic.js):
// WORLD_ENGINE.md 4; requirements A1-A11, Y4, M6, T1, C2. Hand-made worlds run the four life files alone in a context;
// the three test scenes run on the whole engine (tools/lib/world/load.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const src = name => readFileSync(new URL('../src/app/' + name, import.meta.url), 'utf8');
const LIFE_FILES = ['79-world-1nav.js', '79-world-2brains.js', '79-world-2traffic.js', '79-world-2life.js'];
// The files run in ONE function scope through vm.Script.runInThisContext, as the build concatenates them (a vm context's
// global interceptors made every global call slow and crashed V8's optimiser on Node 24: "unreachable code").
function bundle(files, extra = '') {
  const body = (extra ? extra + '\n;\n' : '') + files.map(src).join('\n;\n');
  const names = new Set();
  for (const m of body.matchAll(/^(?:async\s+)?function\s+([A-Za-z_]\w*)\s*\(/gm)) names.add(m[1]);
  for (const m of body.matchAll(/^(?:const|let|var)\s+([A-Za-z_]\w*)\s*=/gm)) names.add(m[1]);
  const tail = '\nreturn { ' + [...names].map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ') + ' };';
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'life-bundle.js' }).runInThisContext()();
}
function load(extra = '') { return bundle(LIFE_FILES, extra); }
const median = (a) => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
const REF_MS = 16;   // the reference workload on the machine the budgets were set on (see tests/world-nav.test.mjs)
function refMs() { const a = new Float64Array(200000); let s = 12345; for (let i = 0; i < a.length; i++) { s = (s * 1103515245 + 12345) >>> 0; a[i] = s; } const t = performance.now(); a.sort(); return performance.now() - t; }
function rect(x0, z0, x1, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }

// a canal: water x in [-12, -1], towpath x in [1, 4] beyond a 1 m bank, verge and a field on the right, a bench, a post, a moored boat
const cam = { fov: 64, eye: 1.65, horizon: 470, water: -0.4 };
function canal(life, o = {}) {
  return {
    seed: o.seed || 2, cam, waterY: -0.4,
    surfaces: [
      { id: 'offside', kind: 'grass', poly: rect(-60, 1, -12, 300) },
      { id: 'cut', kind: 'water', water: 'canal', poly: rect(-12, 1, -1, 300), shallow: 0.6 },
      { id: 'bank', kind: 'grass', poly: rect(-1, 1, 1, 300) },
      { id: 'tow', kind: 'towpath', path: [[2.5, 1], [2.5, 299]], width: 3 },
      { id: 'verge', kind: 'grass', poly: rect(4, 1, 30, 300) },
      { id: 'field', kind: 'field', poly: rect(30, 1, 120, 300) },
      ...(o.surfaces || []),
    ],
    entities: [
      { id: 'bench-1', obj: 'street.bench', cls: 'bench', x: 5.4, z: 30, facing: 270, solidity: 'solid', size: { w: 1.2, d: 0.6, h: 0.85 }, static: true },
      { id: 'post-1', obj: 'street.bollard', cls: 'post', x: -0.6, z: 18, solidity: 'solid', size: { w: 0.3, d: 0.3, h: 1.1 }, height: 1.1, static: true },
      ...(o.entities || []),
    ],
    life,
  };
}

/* ---------- the three test scenes, whole engine ---------- */
let ENGINE = null;
async function engine() {
  if (ENGINE) return ENGINE;
  const { loadWorld } = await import(new URL('../tools/lib/world/load.mjs', import.meta.url).href);
  const E = loadWorld(undefined, { extra: 'var __wlfPacks = typeof _scPacks === "undefined" ? {} : _scPacks;' });
  const E2 = loadWorld(undefined, { extra: 'return { packs: typeof _scPacks === "undefined" ? {} : _scPacks };' });
  ENGINE = { E, packs: E2.packs };
  return ENGINE;
}
const SCENES = ['fleet-canal-2-w3', 'fleet-pond-2-w3', 'sheffield-kelham-1-w3'];

for (const id of SCENES) {
  test(`${id}: 600 s with no forbidden cell, no pop, no stuck mover, near-edge populations spawning, nobody idling in the clip band`, async () => {
    const { E, packs } = await engine();
    const it = (packs['world-test'] || []).find(x => x.id === id);
    assert.ok(it && it.worldSpec, 'the scene is registered');
    const world = E.worldBuild(it.worldSpec, { season: 'summer' });
    const nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0);
    assert.deepEqual(life.problems.filter(p => p.rule === 'error'), [], 'no errors');
    const cam = nav.cam, spawnsBy = new Map(), still = new Map(), seenCls = new Set();
    let spawned = 0, left = 0, nearSpawn = new Set();
    const nearPops = life.pops.filter(p => p.edges && p.edges.includes('S')).map(p => p.idx);
    for (let s = 0; s < 600 * 15; s++) {
      E.worldLifeTick(life, 1 / 15);
      for (const e of life.events) {
        if (e.layer !== 'air') assert.ok(E.worldLifeIsSpawn(life, e.layer, e.x, e.z), `${id}: ${e.kind} ${e.id} off a spawn point at ${e.x.toFixed(2)},${e.z.toFixed(2)} (${e.layer})`);
        if (e.kind === 'spawn') { spawned++; const a = life.byId.get(e.id); if (a && nearPops.includes(a.pop) && (a.edge === 'S' || e.z < 45)) nearSpawn.add(a.pop); } else left++;
      }
      life.events.length = 0;
      if (s % 3) continue;
      const t = life.t;
      for (const a of E.worldAgents(life)) {
        seenCls.add(a.cls);
        if (a.layer !== 'air' && !a.host) assert.ok(E.worldNavOk(nav, a.layer, a.x, a.z, 0), `${id}: ${a.cls} ${a.id} on a forbidden ${a.layer} cell at ${a.x.toFixed(2)},${a.z.toFixed(2)}`);
        if (a.layer === 'swim' || a.layer === 'wade') assert.ok(Math.abs(a.y - E.worldNavY(nav, a.layer, a.x, a.z)) < 1e-9, `${id}: ${a.cls} off its water level`);
        // C2: nothing in the near band where the camera sees it
        if (a.layer !== 'air' && a.kind !== 'lane' && a.kind !== 'rail' && a.x > -a.z * cam.tanL0 && a.x < a.z * cam.tanR0) assert.ok(a.z >= nav.layers[a.layer].nearZ - 0.3, `${id}: ${a.cls} in the near band at z ${a.z.toFixed(2)}`);
        // stuck: shown as moving but no progress for 10 s
        const moving = /^(walk|swim|stalk|ride|cruise|drive|run|turn|trot)$/.test(a.state);
        let h = still.get(a.id);
        if (!h || !moving || Math.hypot(a.x - h.x, a.z - h.z) > 0.5) still.set(a.id, h = { x: a.x, z: a.z, t });
        else assert.ok(t - h.t < 10, `${id}: ${a.cls} ${a.id} stuck in ${a.state} at ${a.x.toFixed(1)},${a.z.toFixed(1)}`);
      }
    }
    assert.ok(spawned > 10 && left > 5, `traffic: ${spawned} spawned, ${left} left`);
    for (const p of nearPops) assert.ok(nearSpawn.has(p), `${id}: population ${p} (${life.pops.find(q => q.idx === p).spec.who}) never came in at its near edge`);
  });
}

test('the test scenes: varied heights and variants (A10, A11), no clones in a group, periods dividing the loop (T1)', async () => {
  const { E, packs } = await engine();
  const loop = E.WORLD_LOOP_S || 360;
  for (const id of SCENES) {
    const it = (packs['world-test'] || []).find(x => x.id === id);
    const world = E.worldBuild(it.worldSpec, { season: 'summer' }), nav = E.worldNavBuild(world), life = E.worldLifeInit(world, nav, 0);
    for (let s = 0; s < 120 * 15; s++) E.worldLifeTick(life, 1 / 15);
    for (const p of life.pops) if (p.period) assert.equal(loop % p.period, 0, `${id}: ${p.spec.who} period ${p.period} divides ${loop}`);
    const ag = E.worldAgents(life);
    for (const a of ag) {
      if (a.cls === 'stroll' || a.cls === 'brisk' || a.cls === 'elderly') assert.ok(a.h >= 1.0 && a.h <= 1.95, `${a.cls} ${a.h}`);
      if (a.pose === 'sit') assert.ok(a.h < 1.5, 'seated ' + a.h);
      if (a.cls === 'swan') assert.ok(a.h > 0.4 && a.h < 0.8, 'a swan on the water ' + a.h);
      if (a.cls === 'duck') assert.ok(a.h > 0.25 && a.h < 0.45, 'a duck ' + a.h);
    }
    const people = ag.filter(a => a.age === 'adult' && a.layer === 'walk' && a.pose !== 'sit' && a.h > 1.2);
    if (people.length > 4) { const m = people.reduce((s, a) => s + a.h, 0) / people.length, sd = Math.sqrt(people.reduce((s, a) => s + (a.h - m) ** 2, 0) / people.length); assert.ok(sd > 0.03, `${id}: heights vary (sd ${sd.toFixed(3)})`); }
    for (const g of new Set(ag.filter(a => a.group).map(a => a.group))) {
      const mem = life.agents.filter(a => a.group === g && a.obj === life.agents.find(b => b.id === g)?.obj);
      const n = mem[0] && mem[0].info ? mem[0].info.variants : 1;
      if (mem.length > 1 && n >= mem.length) assert.equal(new Set(mem.map(a => a.variant)).size, mem.length, `${id}: group ${g} has clones`);
    }
  }
});

/* ---------- hand-made worlds ---------- */
test('a canal in life: spawn and leave only at spawn points, floaters at the water level, turns rate-limited (A3, A5)', () => {
  const C = load(), world = canal([
    { who: 'walkers', on: 'tow', rate: '8/min', mix: { stroll: 0.6, brisk: 0.2, 'dog-walker': 0.2 }, edges: ['S', 'N'] },
    { who: 'mallard', count: 8, on: 'cut' }, { who: 'mute-swan', count: 2, on: 'cut', group: 'pair' }, { who: 'heron', count: 1, on: 'cut' },
    { who: 'kingfisher', count: 1 },
  ]);
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 36000);
  assert.equal(JSON.stringify(life.problems), '[]');
  const seen = new Set(), prevHead = new Map();
  let spawned = 0;
  for (let s = 0; s < 400 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const e of life.events) { if (e.kind === 'spawn') spawned++; if (e.layer !== 'air') assert.ok(C.worldLifeIsSpawn(life, e.layer, e.x, e.z), `${e.kind} off a spawn cell at ${e.x},${e.z}`); }
    life.events.length = 0;
    for (const a of C.worldAgents(life)) {
      seen.add(a.cls);
      if (a.layer !== 'air' && !a.host) assert.ok(C.worldNavOk(nav, a.layer, a.x, a.z, 0), `${a.cls} ${a.id} on a forbidden cell ${a.x},${a.z}`);
      if (a.layer === 'swim' || a.layer === 'wade') assert.equal(a.y, -0.4, `${a.cls} off the water`);
    }
    for (const a of life.agents) {
      if (prevHead.has(a.id) && a.layer !== 'air' && !a.step) {
        const d = Math.abs(Math.atan2(Math.sin(a.heading - prevHead.get(a.id)), Math.cos(a.heading - prevHead.get(a.id))));
        assert.ok(d <= Math.PI / a.brain.turn / 15 + 1e-9, `${a.cls} turned ${d}`);
      }
      prevHead.set(a.id, a.heading);
    }
  }
  assert.ok(spawned > 20, 'spawned ' + spawned);
  for (const c of ['stroll', 'dog', 'duck', 'swan', 'heron', 'kingfisher']) assert.ok(seen.has(c), 'saw ' + c);
});

test('the view matches the velocity bucket (within hysteresis); a still mover faces its point of interest (A5)', () => {
  const C = load(), world = canal([
    { who: 'walkers', on: 'tow', rate: '10/min', mix: { stroll: 1 }, edges: ['S', 'N'] },
    { who: 'visit', mix: { birdwatcher: 1 }, rate: '2/min', goals: [{ view: 'post-1', for: [8, 12] }, { leave: 'N' }] },
  ]);
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 100);
  let checked = 0, faced = 0;
  for (let s = 0; s < 3000; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      const sp = Math.hypot(a.vx, a.vz);
      if (sp >= 0.25 && a.brain.views === 'five' && !a.turning) {
        const rl = Math.hypot(a.x, a.z), rx = a.x / rl, rz = a.z / rl, hx = a.vx / sp, hz = a.vz / sp;
        const ang = Math.abs(Math.atan2(rx * hz - rz * hx, rx * hx + rz * hz)) * 180 / Math.PI;
        const b = ['back', 'q-back', 'side', 'q-front', 'front'].indexOf(a.view);
        assert.ok(Math.abs(ang - b * 45) <= 22.5 + 15 + 1e-6, `${a.cls} view ${a.view} for angle ${ang}`);
        checked++;
      }
      if (a.bs === 'look' && a.lookAt && a.speed < 0.05 && life.t - (a.lookT || (a.lookT = life.t)) > 4) {
        const des = Math.atan2(a.lookAt[0] - a.x, a.lookAt[1] - a.z), d = Math.abs(Math.atan2(Math.sin(des - a.heading), Math.cos(des - a.heading)));
        assert.ok(d < 0.35, `${a.id} looks ${d.toFixed(2)} rad off its point of interest`);
        faced++;
      }
      if (a.bs !== 'look') a.lookT = 0;
    }
  }
  assert.ok(checked > 1000, 'checked ' + checked);
  assert.ok(faced > 20, 'still viewers faced their point ' + faced);
});

test('same seed and time give identical motion; another time differs (R4)', () => {
  const run = t => { const C = load(), l = C.worldLifeInit(canal([{ who: 'walkers', on: 'tow', rate: '8/min', mix: { stroll: 1 } }, { who: 'mallard', count: 6, on: 'cut' }]), C.worldNavBuild(canal([])), t); for (let i = 0; i < 300; i++) C.worldLifeTick(l, 1 / 15); return JSON.stringify(C.worldAgents(l).map(a => [a.id, a.x, a.z, a.view])); };
  assert.equal(run(500), run(500));
  assert.notEqual(run(500), run(501));
});

test('adding one agent leaves the other agents\' tracks unchanged (G4: own streams, stable ids)', () => {
  const pops = [{ who: 'walkers', on: 'tow', rate: '8/min', mix: { stroll: 0.7, 'dog-walker': 0.3 }, edges: ['S', 'N'] }, { who: 'mallard', count: 6, on: 'cut' }, { who: 'mute-swan', count: 2, on: 'cut' }];
  const track = (extra) => {
    const C = load(), w = canal(pops.concat(extra)), nav = C.worldNavBuild(w), life = C.worldLifeInit(w, nav, 7);
    const out = new Map();
    for (let s = 0; s < 120 * 15; s++) { C.worldLifeTick(life, 1 / 15); if (s % 15 === 0) for (const a of life.agents) { if (!out.has(a.id)) out.set(a.id, []); out.get(a.id).push(a.x.toFixed(6) + ',' + a.z.toFixed(6)); } }
    return out;
  };
  const A = track([]), B = track([{ who: 'cow', count: 1, on: 'field' }]);
  assert.ok(A.size > 10);
  for (const [id, t] of A) assert.deepEqual(B.get(id), t, 'track of ' + id);
  assert.ok([...B.keys()].some(id => !A.has(id)), 'the cow is there');
});

test('bench capacity is respected; a full bench makes a short queue; everyone gets up and goes (A4, Y4)', () => {
  const C = load(), world = canal([{ who: 'visit', mix: { elderly: 1 }, rate: '6/min', goals: [{ go: 'bench-1' }, { do: 'sit', 'for': [20, 30] }, { leave: 'N' }] }]);
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  let maxSeated = 0, sits = 0, everSeated = new Set();
  life.bus.on('sit', () => sits++);
  for (let s = 0; s < 300 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    const seated = life.agents.filter(a => a.host === 'bench-1' && (a.bs === 'sit' || (a.step && a.step.sit)));
    seated.forEach(a => everSeated.add(a.id));
    maxSeated = Math.max(maxSeated, seated.length);
    const B = life.seats.get('bench-1');
    if (B) { const taken = B.seats.filter(q => q.by).map(q => q.by); assert.equal(new Set(taken).size, taken.length, 'one sitter per seat'); }
    for (const a of seated) if (!a.step) assert.ok(Math.hypot(a.x - 5.4, a.z - 30) < 1.0, 'seated on the bench');
  }
  const cap = life.seats.get('bench-1').seats.length;
  assert.equal(cap, 2, 'a 1.2 m bench seats two');
  assert.ok(maxSeated <= cap, `at most ${cap} seated (saw ${maxSeated})`);
  assert.ok(sits >= 4 && everSeated.size >= 4, 'people sat: ' + sits);
  const sitters = C.worldAgents(life).filter(a => a.pose === 'sit');
  for (const a of sitters) assert.ok(a.h < a.h + 1 && a.h < 1.5, 'a seated height');
});

test('a dog never leaves its lead\'s length; the lead joins walker and dog (A7)', () => {
  const C = load(), world = canal([{ who: 'dog-walkers', on: 'tow', rate: '12/min', edges: ['S', 'N'] }, { who: 'mallard', count: 6, on: 'cut' }]);
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 3);
  let checked = 0, scares = 0;
  life.bus.on('scare', () => scares++);
  for (let s = 0; s < 300 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const d of life.agents) {
      if (d.cls !== 'dog' || !d.lead) continue;
      const w = life.byId.get(d.lead.to);
      if (!w || w.dead) continue;
      assert.ok(Math.hypot(d.x - w.x, d.z - w.z) <= d.lead.len + 1e-6, `dog ${d.id} ${Math.hypot(d.x - w.x, d.z - w.z).toFixed(2)} m from its walker (lead ${d.lead.len.toFixed(2)})`);
      checked++;
    }
    for (const l of C.worldLifeLeads(life)) assert.ok(Math.hypot(l.ax - l.bx, l.az - l.bz) <= l.len + 1e-6);
  }
  assert.ok(checked > 1000, 'checked ' + checked);
});

test('groups move as units: couples, friends and families keep together (A7)', () => {
  const C = load(), world = canal([{ who: 'walkers', on: 'tow', rate: '10/min', mix: { couple: 0.4, friends: 0.3, family: 0.3 }, edges: ['S', 'N'] }]);
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 11);
  let n = 0, far = 0;
  for (let s = 0; s < 240 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    if (s % 15) continue;
    for (const a of life.agents) if (a.leader && !a.leader.dead && !a.fadeOut) { n++; if (Math.hypot(a.x - a.leader.x, a.z - a.leader.z) > 3.5) far++; }
  }
  assert.ok(n > 200, 'members ' + n);
  assert.ok(far / n < 0.05, `members strayed ${far} / ${n}`);
});

test('reactions (M6): ducks paddle from a dog at the bank, pigeons lift and settle, the heron freezes then strikes, a cyclist rings and passes', () => {
  const C = load(), world = canal([
    { who: 'dog-walkers', on: 'tow', rate: '6/min', edges: ['S', 'N'] },
    { who: 'mallard', count: 8, on: 'cut' },
    { who: 'heron', count: 1, on: 'cut' },
    { who: 'pigeons', count: 6, on: 'plaza' },
    { who: 'walkers', on: 'plaza', rate: '10/min', mix: { stroll: 1 } },
    { who: 'cyclists', on: 'tow', rate: '4/min', edges: ['S', 'N'] },
    { who: 'walkers', on: 'tow', rate: '10/min', mix: { stroll: 1 }, edges: ['S', 'N'] },
  ], { surfaces: [{ id: 'plaza', kind: 'plaza', poly: rect(6, 20, 26, 60) }] });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 5);
  const ev = {}, fled = new Set();
  for (const k of ['scare', 'lift', 'settle', 'strike', 'ring']) life.bus.on(k, () => { ev[k] = (ev[k] || 0) + 1; });
  for (let s = 0; s < 400 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) if (a.cls === 'duck' && a.flee && life.t < a.flee.until) fled.add(a.id);
  }
  // (20 Oct, the ghost pass) the ducks keep to the far half of this cut, 9 to 12 m from where a dog at the bank scares (a duck flees
  // within 6 m): the run used to pass on one chance flee (40 scares, 1 duck in 400 s) because dogs reached the bank more often while
  // walkers kept left of each other; walkers no longer swerve for strangers, so dogs reach it less (6 scares). The scare comes from
  // the run; whether a duck in reach paddles off is checked on a duck put within reach of the last scare, not left to chance.
  assert.ok(ev.scare > 0, `a dog at the bank scared the ducks: ${ev.scare} scares`);
  if (!fled.size) {
    const duck = life.agents.find(a => a.cls === 'duck' && !a.dead);
    assert.ok(duck, 'a duck');
    let at = null; life.bus.on('scare', (e) => { at = e; });
    life.bus.emit('scare', { id: 'test', by: 'test', x: duck.x + 2, z: duck.z, r: 6, t: life.t });
    assert.ok(at && duck.flee && duck.flee.until > life.t, 'a duck within reach of a scare paddles away');
  }
  assert.ok(ev.lift > 0 && ev.settle > 0, `pigeons lifted ${ev.lift} and settled ${ev.settle}`);
  assert.ok(ev.strike > 0, 'the heron struck');
  assert.ok(ev.ring > 0, 'a cyclist rang');
});

test('goal verbs: wait then board, alight, enter, fish, feed, view (A4)', () => {
  const C = load(), world = canal([
    { who: 'commuters', mix: { brisk: 1 }, rate: '4/min', goals: [{ wait: 'stop' }] },
    { who: 'tram', on: 'line', every: '3min' },
    { who: 'visit', mix: { stroll: 1 }, rate: '2/min', goals: [{ enter: 'house' }] },
    { who: 'angler', count: 1, goals: [{ fish: 'cut', 'for': 30 }] },
    { who: 'visit', mix: { stroll: 1 }, rate: '1/min', goals: [{ feed: 'cut', 'for': 25 }, { leave: 'N' }] },
    { who: 'mallard', count: 8, on: 'cut' },
  ], {
    surfaces: [{ id: 'line', kind: 'tram', path: [[40, 1], [40, 299]], width: 3 }, { id: 'stop', kind: 'platform', poly: rect(42, 60, 45, 90) }],
    entities: [{ id: 'house', obj: 'building.cottage', cls: 'building', x: 16, z: 50, facing: 270, solidity: 'solid', size: { w: 8, d: 8, h: 7 }, static: true }],
  });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  assert.equal(JSON.stringify(life.problems), '[]');
  const ev = {};
  for (const k of ['arrive', 'depart', 'board', 'alight', 'enter', 'feed']) life.bus.on(k, () => { ev[k] = (ev[k] || 0) + 1; });
  let fishing = 0, attracted = 0, waiting = 0;
  for (let s = 0; s < 420 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      if (a.state === 'fish') { fishing++; assert.ok(a.lookAt && C.worldNavOk(nav, 'swim', a.lookAt[0], a.lookAt[1], 0.05), 'an angler faces the water'); }
      if (a.cls === 'duck' && a.attract) attracted++;
      if (a.state === 'wait') waiting++;
    }
  }
  assert.ok(ev.arrive > 0 && ev.depart > 0, 'the tram stopped at the platform');
  assert.ok(waiting > 0 && ev.board > 0, `passengers waited and boarded (${ev.board})`);
  assert.ok(ev.enter > 0, 'someone went in at the door');
  assert.ok(fishing > 100, 'an angler fished');
  assert.ok(ev.feed > 0 && attracted > 0, 'ducks came to be fed');
});

test('levels: a boater steps aboard a moored boat by its landing and back off (W3, A2)', () => {
  const C = load(), world = canal([{ who: 'boater', count: 1, goals: [{ go: 'nb' }, { 'do': 'idle', 'for': 8 }, { go: 'tow' }, { 'do': 'look', 'for': 5 }] }], {
    entities: [{ id: 'nb', obj: 'boat.narrowboat', cls: 'boat', x: -2.4, z: 40, facing: 0, solidity: 'solid', foot: rect(-3.45, 31, -1.35, 49), size: { w: 18, d: 2.1, h: 1.9 }, deck: { poly: rect(-3.25, 32, -1.55, 48), y: 0.9 }, static: true }],
  });
  const nav = C.worldNavBuild(world);
  const lv = C.worldNavLevels(nav).find(l => l.id === 'nb');
  assert.ok(lv, 'the boat deck is a level');
  const life = C.worldLifeInit(world, nav, 0, { warm: false });
  let aboard = 0, stepped = 0, back = 0;
  for (let s = 0; s < 360 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    const a = life.agents.find(x => x.cls === 'boater');
    if (!a) continue;
    if (a.step) stepped++;
    if (a.layer === lv.layer && !a.step) { aboard++; assert.ok(Math.abs(a.y - 0.9) < 1e-9, 'standing on the deck at its height'); }
    else if (aboard && !a.step) back++;
    if (!a.step && !a.host) assert.ok(C.worldNavOk(nav, a.layer, a.x, a.z), 'legal on ' + a.layer);
  }
  assert.ok(stepped > 0 && aboard > 30, `stepped aboard (${stepped} step ticks, ${aboard} ticks aboard)`);
  assert.ok(back > 0, 'and back to the towpath');
});

test('water birds in loose groups; perchers only on perch points; flights go round volumes (A8)', () => {
  const C = load(), world = canal([{ who: 'mallard', count: 9, on: 'cut' }, { who: 'kingfisher', count: 1 }], {
    entities: [{ id: 'shed', obj: 'building.shed', cls: 'building', x: -20, z: 40, solidity: 'solid', foot: rect(-24, 36, -16, 44), size: { w: 8, d: 8, h: 5 }, height: 5, static: true }],
  });
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 1);
  const perches = C._wlfPerches(life);
  let near = 0, n = 0;
  for (let s = 0; s < 300 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of life.agents) {
      if (a.cls === 'kingfisher' && a.bs === 'perch' && !a.flight && !a.diveT) assert.ok(perches.some(p => Math.hypot(p.x - a.x, p.z - a.z) < 1e-6 && Math.abs(p.y - a.alt) < 1e-6), 'perched on a perch point');
      if (a.cls === 'duck' && a.leader && s % 15 === 0) { n++; if (Math.hypot(a.x - a.leader.x, a.z - a.leader.z) < 9) near++; }
    }
  }
  assert.ok(n > 50 && near / n > 0.8, `ducks keep near their group (${near} / ${n})`);
  // a flight from one side of the shed to the other goes round it (or over it when it may), never through it
  const plan = C._wlfFlightPlan(life, [-28, 1.5, 40], [-12, 1.5, 40], 3);
  assert.ok(plan, 'a flight plan');
  let prev = [-28, 1.5, 40];
  for (const w of plan) { assert.equal(C._wlfFlightHit(life, prev, w), null, 'a leg through a volume'); prev = w; }
});

test('density from the knowledge base scales a population (A1); unknown entries are dropped, the rest spawn', () => {
  const stub = 'function worldKbDensity(who, ctx, placeType) { return who === "walkers" ? 0.5 : 1; }';
  const C = load(stub), world = canal([{ who: 'walkers', on: 'tow', rate: '10/min', mix: { stroll: 0.5, 'no-such-walker': 0.5 } }]);
  const nav = C.worldNavBuild(world);
  const life = C.worldLifeInit(world, nav, 0, { ctx: { hour: 12, month: 6 }, warm: false });
  assert.ok(Math.abs(life.pops[0].rate - 10 / 60 * 0.5) < 1e-9, 'rate halved: ' + life.pops[0].rate);
  assert.ok(life.problems.some(p => p.rule === 'unknownWho'), 'the unknown entry is a load problem');
  for (let s = 0; s < 120 * 15; s++) C.worldLifeTick(life, 1 / 15);
  assert.ok(life.pops[0].ord > 3, 'the population still came: ' + life.pops[0].ord);
  const none = C.worldLifeInit(world, nav, 0, { warm: false });
  assert.equal(none.pops[0].rate, 10 / 60, 'no time context: the authored rate');
});

test('missing spawn layer and missing perch are load problems, never a crash', () => {
  const C = load();
  const world = { seed: 1, cam, surfaces: [{ id: 'g', kind: 'grass', poly: rect(-30, 1, 30, 60) }], entities: [], life: [{ who: 'mallard', rate: '1/min' }, { who: 'kingfisher', count: 1 }, { who: 'zebra', count: 2 }] };
  const life = C.worldLifeInit(world, C.worldNavBuild(world), 0, { warm: false });
  assert.equal(JSON.stringify(life.problems.map(p => p.rule).sort()), JSON.stringify(['noPerch', 'noSpawn', 'unknownWho']));
});

test('stuck movers never stay stuck: head-on in a narrow corridor, they back off and leave (A4)', () => {
  const C = load();
  const world = { seed: 1, cam, surfaces: [{ id: 'c', kind: 'path', path: [[-40, 20], [40, 20]], width: 1.4 }], entities: [], life: [{ who: 'brisk', rate: '20/min', edges: ['W', 'E'] }] };
  const nav = C.worldNavBuild(world), life = C.worldLifeInit(world, nav, 0, { warm: false });
  const still = new Map();
  for (let s = 0; s < 300 * 15; s++) {
    C.worldLifeTick(life, 1 / 15);
    for (const a of C.worldAgents(life)) {
      const moving = a.speed > 0.05;
      const t = moving || !/walk|turn/.test(a.state) ? 0 : (still.get(a.id) || 0) + 1 / 15;
      still.set(a.id, t);
      assert.ok(t < 2, `${a.id} walking on the spot for ${t.toFixed(1)} s`);
    }
    for (const a of life.agents) {
      const h = still.get('p:' + a.id) || { x: a.x, z: a.z, t: life.t };
      if (Math.hypot(a.x - h.x, a.z - h.z) > 0.5) { h.x = a.x; h.z = a.z; h.t = life.t; }
      still.set('p:' + a.id, h);
      assert.ok(life.t - h.t < 40, `${a.id} has not moved for ${(life.t - h.t).toFixed(0)} s`);
    }
  }
});

test('tick median < 1.5 ms for 60 agents (median of runs at 1.2x, judged against a fixed workload too)', () => {
  const C = load(), world = canal([
    { who: 'walkers', on: 'tow', count: 20, mix: { stroll: 1 } }, { who: 'walkers', on: 'verge', count: 10, mix: { stroll: 1 } },
    { who: 'walkers', on: 'tow', rate: '10/min', mix: { stroll: 0.6, 'dog-walker': 0.4 }, edges: ['S', 'N'] },
    { who: 'mallard', count: 24, on: 'cut' }, { who: 'heron', count: 1, on: 'cut' },
  ]);
  const life = C.worldLifeInit(world, C.worldNavBuild(world), 0);
  assert.ok(life.agents.length >= 50, 'agents ' + life.agents.length);
  const runs = [], refs = [];
  for (let r = 0; r < 7; r++) {
    refs.push(refMs());
    const ms = [];
    for (let i = 0; i < 300; i++) { const t = performance.now(); C.worldLifeTick(life, 1 / 15); ms.push(performance.now() - t); }
    runs.push(median(ms));
  }
  const m = median(runs), r = median(refs);
  assert.ok(m < 1.5 * 1.2 || m / r < (1.5 / REF_MS) * 1.2, `tick median ${m.toFixed(3)} ms (reference ${r.toFixed(1)} ms)`);
});

test('the systems runtime: life registers its brain, nav and move systems; the Life of a world is found again', () => {
  const reg = [];
  const C = load('var __reg = [];\nfunction worldSystem(def) { __reg.push(def); return def; }');
  const defs = C.__reg || [];
  for (const d of defs) reg.push(d.id + ':' + d.phase);
  // (20 Oct: life-lerp keeps life.alpha, the share of a move step gone, every runner tick: the records then move every frame)
  assert.deepEqual(reg, ['life:brain', 'life-nav:nav', 'life-move:move', 'life-lerp:move']);
  const world = canal([{ who: 'mallard', count: 4, on: 'cut' }]);
  defs[0].init(world);
  const L = C.worldLifeOf(world);
  assert.ok(L && L.agents.length === 4 && world.sim === L && world.agents === L.agents);
  const before = L.t;
  for (const d of defs) d.update(world, 1 / 15);
  assert.ok(L.alpha >= 0 && L.alpha <= 1, 'the share of a step');
  assert.ok(Math.abs(L.t - before - 1 / 15) < 1e-9, 'one fixed step through the three phases');
  for (const a of world.agents) assert.ok(typeof a.state === 'string' && Number.isFinite(a.facing) && Number.isFinite(a.h), 'agents carry what they are doing');
});

test('A1 again on a weather change: worldLifeRetime re-reads the density of rate populations; residents stay', () => {
  const stub = 'function worldKbDensity(who, ctx, placeType) { return ctx && ctx.weather === "rain" ? 0.25 : 1; }';
  const C = load(stub), world = canal([{ who: 'walkers', on: 'tow', rate: '8/min', mix: { stroll: 1 } }, { who: 'mallard', count: 6, on: 'cut' }]);
  const life = C.worldLifeInit(world, C.worldNavBuild(world), 0, { ctx: { hour: 12, weather: 'clear' }, warm: false });
  assert.ok(Math.abs(life.pops[0].rate - 8 / 60) < 1e-9);
  const ducks = life.agents.length;
  C.worldLifeRetime(life, { hour: 12, weather: 'rain' });
  assert.ok(Math.abs(life.pops[0].rate - 8 / 60 * 0.25) < 1e-9, 'rain: a quarter of the walkers');
  assert.equal(life.agents.length, ducks, 'nobody already out is removed');
});

test('A11: seeded outfits differ inside a group, dogs have breeds, and the same seed gives the same looks', () => {
  const run = () => {
    const C = load(), world = canal([{ who: 'walkers', on: 'tow', rate: '12/min', mix: { family: 0.5, 'dog-walker': 0.5 }, edges: ['S', 'N'] }]);
    const life = C.worldLifeInit(world, C.worldNavBuild(world), 4);
    return C.worldAgents(life);
  };
  const ag = run();
  assert.ok(ag.length > 6, 'agents ' + ag.length);
  for (const a of ag) {
    if (a.cls === 'dog') assert.ok(typeof a.breed === 'string' && a.breed, 'a dog has a breed');
    else if (a.kind === 'walker') assert.ok(Number.isInteger(a.outfit), a.id + ' has an outfit');
  }
  const groups = new Map();
  for (const a of ag) if (a.group && a.cls !== 'dog') { if (!groups.has(a.group)) groups.set(a.group, []); groups.get(a.group).push(a.outfit); }
  for (const [g, o] of groups) if (o.length > 1) assert.equal(new Set(o).size, o.length, 'group ' + g + ' dressed alike');
  assert.deepEqual(run().map(a => [a.id, a.outfit, a.breed]), ag.map(a => [a.id, a.outfit, a.breed]));
});
