/* ============================================================
   WORLD ENGINE v3.1, package `systems` (1 of 3 files): the runtime every other package plugs into.
   docs/dev/WORLD_ENGINE.md 1.2 and 11; the contract is docs/dev/WORLD_ENGINE_REQUIREMENTS.md (G1-G7, G12, Y1, Y2, Y7, M8).
   PURE classic script: no DOM. Nothing runs at load except constants and the worldSystem(...) registrations of the
   built-in systems: time, attach and lod here; wind in 79-world-6wind.js; particles in 79-world-6particles.js.

   Phases, components, systems (G1, Y1)
     WORLD_PHASES                ['time', 'brain', 'nav', 'move', 'anim', 'attach', 'fx', 'light', 'render']
     WORLD_TICK_HZ = 30          the fixed simulation tick. WORLD_LOOP_S = 360: schedules divide it (T1)
     WORLD_COMPONENTS            component -> the entity (or world) fields it covers (1.2); systems declare what they read
                                 and write, and the order check warns when two systems of one phase write the same component
                                 with nothing ordering them (`writeRace`)
     worldSystem(def) -> def | null
       def = { id, phase, after: [ids], before: [ids], components: { read: [...], write: [...] },
               rate: Hz dividing 30 (1 2 3 5 6 10 15 30) | 'frame', budgetMs,
               init(world), update(world, dt), onEvent: { <kind>(world, e) }, degrade(level, world), dispose(world) }
       A def with no id or an unknown phase is refused (worldSystemProblems() says why), never half-registered. A rate that
       does not divide 30 snaps to the nearest divisor (logged). Registering an id again replaces it (logged).
     worldSystemOrder(defs) -> { order: [def], problems }   the total, deterministic order: phase, then after / before
                                 (Kahn), then id. A cycle is broken at the smallest id (logged); an after / before that
                                 contradicts the phases is ignored (logged).
     worldSystemList() -> [{ id, phase, after, before, rate, budgetMs, components }]   the registry in run order
     worldSystemProblems(), worldSystemLevel(world, id) -> the degrade level (0..3) the runner set on this world

   The runner (11.3: M8, G8, G12, Y7)
     worldRun(world, o) -> Runner { step(dtReal), frame(nowMs), advance(sec), pause(), resume(), stop(), setTime(ms),
                                    stats(), t, tick, alpha, paused, bus, log, ctx }
       A fixed 30 Hz tick. step(dtReal) takes REAL seconds (never frames) and runs at most 8 sub-steps; a longer gap is
       absorbed, never replayed. alpha = the share of the next tick already elapsed (render interpolates with it).
       A system of rate r runs every 30 / r ticks with dt = (30 / r) / 30 s; 'frame' systems run once per step() after the
       ticks. pause() freezes the scene clock; resume() carries on from where it stopped: the first step after it advances
       at most one tick whatever dtReal says (no jump). frame(nowMs) is step() from a timestamp (the gap over a pause is
       never counted). advance(sec) runs the ticks sec covers at once, carrying the remainder (warm-ups, stills, captures, tools).
       Error isolation (G8): a system whose init, update or event handler throws is disabled on this world and logged; the
       rest keep running. Profiling (G12): per system, ms per frame (p50 and p95 over 120 frames) in stats(). Budgets (Y7):
       a system whose average cost per frame is over its budgetMs for 30 frames steps down a ladder (rate / 2, then
       degrade(1), degrade(2), degrade(3), then rate / 4 and / 8); under half its budget for 90 frames it steps back up
       (degrade(level - 1) ... degrade(0), then the full rate).
       o: { ms | clock() (the time source: a fixed time in previews, the live clock in the app), sky, wx, wind (overrides
            for worldTimeCtx), systems: [def | id] (run exactly these), extra: [def] (the registry plus these), skip: [id],
            deterministic: true (budgets measured but never acted on: stills, captures, determinism tests),
            now() (the profiling clock, ms), particles: { weather } (79-world-6particles.js), quiet }
       world gains: world.runner, world.bus, world.t (scene seconds), world.tick, world.time (the time context, 11.11).

   Shared services
     worldRng(world, system, id, o) -> rnd()   an independent seeded stream per (world seed, system, entity) (G4): adding
                                 or changing one entity never reshuffles another. id may be an entity: worldEntityKey(e)
                                 (its id, else obj@x,z). Cached per world (successive calls continue the stream);
                                 o.fresh: a new stream from the start. rnd.range(a, b), rnd.int(n), rnd.pick(list), rnd.seed
     worldEntityKey(e) -> string
     worldGrid(cell) -> { add(id, x, z, r), move(id, x, z, r), remove(id), query(x, z, r, fn) -> n, list(x, z, r) -> ids,
                         has(id), get(id), size(), clear() }   a uniform hash grid in metres (G3): query calls fn(id, x, z, r)
                         once for every item whose disc meets the query disc; fn returning false stops the query
     worldBus(world) -> world.bus { on(kind, fn) -> off, off, once, emit(kind, data) -> n, kinds(), recent, problems } (G5)
                         standard kinds WORLD_BUS_KINDS (11.7); worldBusKind(name) adds a custom kind. A throwing listener is
                         removed and logged; an unknown kind is delivered and flagged once; a storm (depth > 16) is cut
     worldAttach(world, child, parentId, local, o) -> link | null    the scene graph (G2); parents are found by id in world.entities,
                         world.agents and the life sim's index (world.sim.byId). local = { dx: right of the
                         parent's facing, dy: up, dz: ahead along its facing, dfacing } (omitted: kept where it is now).
                         o.to (+ o.toLocal): a second anchor (a lead, a mooring or washing line): child.ends = [[x, y, z] x2],
                         child.len, the child at the midpoint. Cycles are refused; a parent that is gone for 3 ticks
                         detaches the child (two-anchor children hide), logged.
     worldDetach(world, child), worldResolve(world, ent) -> { x, y, z, facing } (the current world transform)
     worldLod(ent, cam, o) -> { lod: 0 | 1 | 2, culled, reason, box } (G7): from the projected height (60 / 15 px, 15 %
                         hysteresis); culled when off-screen (out at 80 px beyond the frame, back in at 40 px) or wholly
                         inside the solid core of a nearer building, wall or hedge (o.occluders = worldLodOccluders(...)).
                         Sets ent.lod, ent.culled, ent.cullReason. worldLodDue(ent, tick): lod 0 every tick, 1 every 2nd,
                         2 every 4th (staggered by entity), culled never.
     worldTimeCtx(world, ms, o) -> the time context of 11.11 (see the function)

   Registration of the other built-in systems (Y2): every one of them uses this same interface. The exact snippets (each in
   its own package's file, at the top level; the names they call are that package's own):

     // life (79-world-2life.js): brains, navigation and movement in one system for now
     worldSystem({ id: 'life', phase: 'move', components: { read: ['desc', 'collider', 'nav', 'time'], write: ['transform', 'brain', 'agents'] },
       rate: 15, budgetMs: 1.5,
       init(world) { world.nav = world.nav || worldNavBuild(world); world.sim = worldLifeInit(world, world.nav, 0); world.agents = world.sim.agents; },
       update(world, dt) { worldLifeTick(world.sim, dt); world.agents = world.sim.agents; },
       onEvent: { weather(world, e) { /- re-read worldKbDensity for the new weather -/ } },
       degrade(level, world) { world.sim.max = Math.round(60 * [1, 0.85, 0.7, 0.5][level]); } });

     // anim (79-world-6anim.js): one animation state per entity from what it is doing (M1); far and culled ones skip ticks
     worldSystem({ id: 'anim', phase: 'anim', components: { read: ['transform', 'brain', 'render', 'time'], write: ['anim'] },
       rate: 30, budgetMs: 0.5,
       update(world, dt) { for (const a of world.agents || []) if (worldLodDue(a, world.tick)) a.anim = worldAnimOf(a); },
       degrade(level, world) { /- 1: secondary motion only at lod 0; 2: none; 3: idle micro-motion off -/ } });

     // water (79-world-4water.js): ripples by the ONE wind, wakes, rings, buoyancy
     worldSystem({ id: 'water', phase: 'fx', after: ['wind'], components: { read: ['transform', 'collider', 'wind', 'time'], write: ['look'] },
       rate: 30, budgetMs: 0.8,
       init(world) { world.water = worldWaterPlan(world, world.cam); },
       update(world, dt) { /- ripple drift from worldWind(world, x, z, world.t), wakes of moving floaters, rings -/ },
       onEvent: { wake(world, e) { /- a boat passed: rock the floaters near e.x, e.z -/ } } });

     // light (79-world-4light.js): the sun, shadow plans, lights on and off
     worldSystem({ id: 'light', phase: 'light', components: { read: ['time', 'transform', 'collider'], write: ['look'] },
       rate: 2, budgetMs: 0.3,
       update(world) { world.sun = worldSunOf(world.time.sun, world.cam); world.shadows = worldShadowPlan(world, world.cam, world.sun); },
       onEvent: { lightsOn(world) { world.lights = worldLights(world, { ctx: world.time }); }, lightsOff(world) { world.lights = []; } } });

     // render (79-world-5frame.js): the frame record and the compositor, once per drawn frame, after lod
     worldSystem({ id: 'render', phase: 'render', after: ['lod'], components: { read: ['transform', 'render', 'anim', 'sway', 'particles', 'look'], write: ['render'] },
       rate: 'frame', budgetMs: 4,
       update(world, dt) { const r = world.runner; world.frame = worldFrameAt(world, r.t + r.alpha / WORLD_TICK_HZ); } });

   (In the snippets, /- -/ stands for a block comment.) The render package owns the driver: it calls runner.frame(now) from
   its animation frame, pause() when the scene is hidden or the tab inactive and resume() when it shows again (M8, R5).
   ============================================================ */

/* ---------- constants (literals behind functions, so a registration from an earlier file never meets a TDZ) ---------- */
function _wsyPhaseList() { return ['time', 'brain', 'nav', 'move', 'anim', 'attach', 'fx', 'light', 'render']; }
function _wsyBudgets() { return { time: 0.1, life: 1.5, anim: 0.5, attach: 0.1, wind: 0.2, particles: 0.5, water: 0.8, light: 0.3, order: 0.7, lod: 0.3, render: 4 }; }
function _wsyComponentMap() {
  return {
    desc: ['id', 'obj', 'cls', 'variant', 'kb'],
    transform: ['x', 'y', 'z', 'facing', 'heading', 'px', 'py', 'pz', 'pfacing'],
    collider: ['foot', 'r', 'height', 'size', 'solidity', 'layer', 'clearance', 'deck', 'waterline'],
    attach: ['attach', 'host', 'parent', 'local', 'ends', 'len'],
    tags: ['static', 'auto', 'landmark', 'framing', 'src', 'born', 'hidden'],
    brain: ['goals', 'state', 'pose', 'age', 'lookAt', 'group'],
    anim: ['anim'],
    render: ['view', 'mirror', 'lod', 'culled', 'cullReason'],
    look: ['look'],
    sway: ['sway'],
    // world-level components (one per world, not per entity)
    time: ['time'], wind: ['wind'], particles: ['particles'], bus: ['bus'], nav: ['nav'], agents: ['agents'], frame: ['frame'],
  };
}
function _wsyStdKinds() {
  return ['spawn', 'leave', 'arrive', 'depart', 'board', 'alight', 'sit', 'stand', 'stop', 'go', 'scare', 'strike', 'lightsOn', 'lightsOff',
    'weather', 'snowStart', 'snowStop', 'schedule', 'wake'];
}
const WORLD_PHASES = Object.freeze(_wsyPhaseList());
const WORLD_TICK_HZ = 30;
const WORLD_LOOP_S = 360;
const WORLD_SYSTEM_BUDGETS = Object.freeze(_wsyBudgets());
const WORLD_COMPONENTS = Object.freeze(_wsyComponentMap());
const WORLD_BUS_KINDS = Object.freeze(_wsyStdKinds());
/** LOD and culling thresholds (G7): projected height in frame units (the v2 frame is 1600 x 900), hysteresis, cull margins. */
const WORLD_LOD = Object.freeze({ W: 1600, H: 900, near: 60, far: 15, hyst: 1.15, cullOut: 80, cullIn: 40, rates: [1, 2, 4] });
/** The scene time when nothing gives one: a fixed midsummer noon (plain, never wrong: no snow, no night). */
const WORLD_TIME_DEFAULT_MS = Date.UTC(2026, 5, 20, 12, 0, 0);

/* ---------- small helpers ---------- */
const _WSY_DEG = Math.PI / 180;
const _wsyNum = v => typeof v === 'number' && Number.isFinite(v);
const _wsyNorm360 = d => ((d % 360) + 360) % 360;
function _wsyNow() { return typeof performance !== 'undefined' && performance && typeof performance.now === 'function' ? performance.now() : Date.now(); }
/** FNV-1a then the murmur finaliser: a well mixed 32-bit hash of a string. */
function _wsyHash(s) {
  s = String(s);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}
/** mulberry32: a small, fast, seedable stream in [0, 1). */
function _wsyStream(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.seed = seed >>> 0;
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.int = n => Math.floor(r() * Math.max(0, n | 0));
  r.pick = list => (Array.isArray(list) && list.length ? list[Math.floor(r() * list.length)] : undefined);
  r.chance = p => r() < p;
  return r;
}
function _wsyRing(n) { return { a: new Float64Array(n), i: 0, n: 0 }; }
function _wsyPush(r, v) { r.a[r.i] = v; r.i = (r.i + 1) % r.a.length; if (r.n < r.a.length) r.n++; }
function _wsyLast(r, k) { const m = Math.min(k, r.n); if (!m) return 0; let s = 0; for (let j = 1; j <= m; j++) s += r.a[(r.i - j + r.a.length) % r.a.length]; return s / m; }
function _wsyQuant(r, q) {
  if (!r.n) return 0;
  const v = Array.from(r.a.subarray(0, r.n)).sort((x, y) => x - y);
  return v[Math.min(v.length - 1, Math.floor(q * (v.length - 1) + 0.5))];
}
function _wsyR3(v) { return Math.round(v * 1000) / 1000; }
/** A private per-world slot (not enumerable: never in JSON, a frame record or a copy of the world). */
function _wsySlot(world, key, make) {
  let v = world[key];
  if (v === undefined) { v = make(); try { Object.defineProperty(world, key, { value: v, enumerable: false, configurable: true, writable: true }); } catch (e) { world[key] = v; } }
  return v;
}

/* ---------- the system registry (Y1) ---------- */
var _wsyReg;          // no initialiser on purpose: a registration from an earlier file must survive this line
var _wsyNormalised;   // WeakSet of normalised defs
var _wsyBusExtra;     // custom event kinds (worldBusKind)
function _wsyRegistry() { return _wsyReg || (_wsyReg = { defs: new Map(), order: null, problems: [], orderProblems: [] }); }
function _wsyIsNorm(d) { return !!(_wsyNormalised && d && typeof d === 'object' && _wsyNormalised.has(d)); }
function _wsyKnownKind(k) { return _wsyStdKinds().includes(k) || !!(_wsyBusExtra && _wsyBusExtra.has(k)) || k === '*'; }
/** Divisors of the tick rate a system may run at. */
function _wsyRateOf(rate, id, problems) {
  if (rate === 'frame') return 'frame';
  const divs = [1, 2, 3, 5, 6, 10, 15, 30];   // the divisors of WORLD_TICK_HZ (30)
  if (rate == null) return 30;
  if (!_wsyNum(rate) || rate <= 0) { problems.push({ id, rule: 'badRate', msg: `${id}: rate ${JSON.stringify(rate)} is not a positive number or 'frame'; runs at 30 Hz` }); return 30; }
  let best = 30, bd = Infinity;
  for (const d of divs) { const e = Math.abs(Math.log(d / rate)); if (e < bd - 1e-12) { bd = e; best = d; } }
  if (best !== rate) problems.push({ id, rule: 'badRate', msg: `${id}: rate ${rate} does not divide 30; runs at ${best} Hz` });
  return best;
}
/** A checked, frozen copy of a system def, or null (the reason is in problems). */
function _wsyNormalise(def, problems) {
  if (_wsyIsNorm(def)) return def;
  const refuse = (rule, msg) => { problems.push({ id: def && def.id != null ? String(def.id) : '?', rule, msg }); return null; };
  if (!def || typeof def !== 'object') return refuse('badSystem', 'a system is an object { id, phase, update, ... }');
  const id = typeof def.id === 'string' ? def.id.trim() : '';
  if (!id) return refuse('badSystem', 'a system needs an id (a non-empty string)');
  const phases = _wsyPhaseList();
  if (!phases.includes(def.phase)) return refuse('badPhase', `${id}: phase ${JSON.stringify(def.phase)} is not one of ${phases.join(', ')}`);
  const list = v => (v == null ? [] : (Array.isArray(v) ? v : [v])).filter(x => typeof x === 'string' && x.trim()).map(x => x.trim());
  const comps = _wsyComponentMap(), c = def.components && typeof def.components === 'object' ? def.components : {};
  const read = list(c.read), write = list(c.write);
  for (const n of [...read, ...write]) if (!comps.hasOwnProperty(n)) problems.push({ id, rule: 'unknownComponent', msg: `${id}: unknown component ${n} (WORLD_COMPONENTS)` });
  const fn = (k) => {
    if (def[k] == null) return null;
    if (typeof def[k] !== 'function') { problems.push({ id, rule: 'badSystem', msg: `${id}: ${k} must be a function; ignored` }); return null; }
    return def[k];
  };
  const onEvent = {};
  if (def.onEvent != null) {
    if (typeof def.onEvent !== 'object') problems.push({ id, rule: 'badSystem', msg: `${id}: onEvent is { kind: fn }; ignored` });
    else for (const k of Object.keys(def.onEvent).sort()) {
      if (typeof def.onEvent[k] !== 'function') { problems.push({ id, rule: 'badSystem', msg: `${id}: onEvent.${k} is not a function; ignored` }); continue; }
      if (!_wsyKnownKind(k)) problems.push({ id, rule: 'unknownEvent', msg: `${id}: onEvent.${k} is not a standard event kind (WORLD_BUS_KINDS); add it with worldBusKind` });
      onEvent[k] = def.onEvent[k];
    }
  }
  const budgets = _wsyBudgets();
  let budgetMs = def.budgetMs;
  if (budgetMs != null && !(_wsyNum(budgetMs) && budgetMs > 0)) { problems.push({ id, rule: 'badBudget', msg: `${id}: budgetMs must be > 0; the default is used` }); budgetMs = null; }
  if (budgetMs == null) budgetMs = budgets.hasOwnProperty(id) ? budgets[id] : 0.5;
  const out = Object.freeze({ id, phase: def.phase, after: Object.freeze(list(def.after)), before: Object.freeze(list(def.before)),
    components: Object.freeze({ read: Object.freeze(read), write: Object.freeze(write) }), rate: _wsyRateOf(def.rate, id, problems), budgetMs,
    init: fn('init'), update: fn('update'), degrade: fn('degrade'), dispose: fn('dispose'), onEvent: Object.freeze(onEvent) });
  if (!_wsyNormalised) _wsyNormalised = new WeakSet();
  _wsyNormalised.add(out);
  return out;
}
/** Register a system (Y1). Returns the frozen def, or null when it is refused (worldSystemProblems() says why). */
function worldSystem(def) {
  const R = _wsyRegistry(), d = _wsyNormalise(def, R.problems);
  if (!d) return null;
  if (R.defs.has(d.id)) R.problems.push({ id: d.id, rule: 'replaced', msg: `${d.id}: registered again; the new def replaces the old one` });
  R.defs.set(d.id, d);
  R.order = null;
  return d;
}
/** The total, deterministic order of a set of systems (11.1): phase, then after / before, then id. */
function worldSystemOrder(defs) {
  const problems = [], norm = [];
  const seen = new Set();
  for (const d0 of Array.isArray(defs) ? defs : []) {
    const d = _wsyNormalise(d0, problems);
    if (!d) continue;
    if (seen.has(d.id)) { problems.push({ id: d.id, rule: 'dupId', msg: `${d.id}: listed twice; the later one is used` }); const i = norm.findIndex(x => x.id === d.id); norm.splice(i, 1); }
    seen.add(d.id); norm.push(d);
  }
  const phases = _wsyPhaseList(), byId = new Map(norm.map(d => [d.id, d])), out = [];
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const reach = new Map();   // id -> Set of ids it is ordered before (within its phase)
  for (const ph of phases) {
    const group = norm.filter(d => d.phase === ph).sort((a, b) => cmp(a.id, b.id));
    if (!group.length) continue;
    const ids = new Set(group.map(d => d.id)), edges = new Map(group.map(d => [d.id, new Set()])), indeg = new Map(group.map(d => [d.id, 0]));
    const edge = (a, b) => { if (a === b || edges.get(a).has(b)) return; edges.get(a).add(b); indeg.set(b, indeg.get(b) + 1); };
    const cross = (d, other, rel) => {
      const o = byId.get(other);
      if (!o) return;   // an optional dependency that is not loaded: nothing to order
      const a = phases.indexOf(d.phase), b = phases.indexOf(o.phase);
      if ((rel === 'after' && b > a) || (rel === 'before' && b < a)) problems.push({ id: d.id, rule: 'orderImpossible', msg: `${d.id} (${d.phase}) cannot run ${rel} ${o.id} (${o.phase}): phases come first; ignored` });
    };
    for (const d of group) {
      for (const a of d.after) if (ids.has(a)) edge(a, d.id); else cross(d, a, 'after');
      for (const b of d.before) if (ids.has(b)) edge(d.id, b); else cross(d, b, 'before');
    }
    const ready = group.filter(d => indeg.get(d.id) === 0).map(d => d.id), done = new Set();
    while (done.size < group.length) {
      let id = null;
      while (ready.length && done.has(ready[0])) ready.shift();
      if (ready.length) id = ready.shift();
      else {
        // stuck: break the cycle at its smallest id (a node that reaches itself through the remaining nodes)
        const left = group.map(d => d.id).filter(i => !done.has(i)).sort(cmp);
        const inCycle = (s) => { const seen = new Set(), st = [...edges.get(s)].filter(x => !done.has(x)); while (st.length) { const x = st.pop(); if (x === s) return true; if (seen.has(x)) continue; seen.add(x); for (const y of edges.get(x)) if (!done.has(y)) st.push(y); } return false; };
        id = left.find(inCycle) || left[0];
        problems.push({ id, rule: 'cycle', msg: `the after / before lists of phase ${ph} form a cycle; broken at ${id}` });
      }
      done.add(id); out.push(byId.get(id));
      for (const b of [...edges.get(id)].sort(cmp)) {
        indeg.set(b, indeg.get(b) - 1);
        if (indeg.get(b) <= 0 && !done.has(b) && !ready.includes(b)) { ready.push(b); ready.sort(cmp); }
      }
    }
    // reachability inside the phase (for the write race check)
    for (const d of group) {
      const r = new Set(), stack = [...edges.get(d.id)];
      while (stack.length) { const x = stack.pop(); if (r.has(x)) continue; r.add(x); for (const y of edges.get(x)) stack.push(y); }
      reach.set(d.id, r);
    }
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j], both = a.components.write.filter(c => b.components.write.includes(c));
      if (both.length && !reach.get(a.id).has(b.id) && !reach.get(b.id).has(a.id))
        problems.push({ id: b.id, rule: 'writeRace', msg: `${a.id} and ${b.id} (phase ${ph}) both write ${both.join(', ')} and nothing orders them; they run by id` });
    }
  }
  return { order: out, problems };
}
function _wsyRegOrder() {
  const R = _wsyRegistry();
  if (!R.order) { const r = worldSystemOrder([...R.defs.values()]); R.order = r.order; R.orderProblems = r.problems; }
  return R.order;
}
/** The registered systems in run order (a description; the defs themselves run through worldRun). */
function worldSystemList() {
  return _wsyRegOrder().map(d => ({ id: d.id, phase: d.phase, after: d.after.slice(), before: d.before.slice(), rate: d.rate, budgetMs: d.budgetMs,
    components: { read: d.components.read.slice(), write: d.components.write.slice() } }));
}
function worldSystemProblems() { _wsyRegOrder(); const R = _wsyRegistry(); return [...R.problems, ...R.orderProblems].map(p => Object.assign({}, p)); }
/** The degrade level (0..3) the runner has set for a system on this world (a system reads it in update). */
function worldSystemLevel(world, id) {
  const r = world && world.runner, I = r && r._inst ? r._inst.find(x => x.id === id) : null;
  return I ? I.level : 0;
}

/* ---------- the event bus (G5, 11.7) ---------- */
/** Add a custom event kind (beyond WORLD_BUS_KINDS). */
function worldBusKind(name) { if (typeof name === 'string' && name) { if (!_wsyBusExtra) _wsyBusExtra = new Set(); _wsyBusExtra.add(name); } return name; }
function worldBus(world) {
  if (world && world.bus && world.bus._wsy) return world.bus;
  const subs = new Map(), recent = [], problems = [], warned = new Set();
  let depth = 0;
  const bus = {
    _wsy: true, recent, problems,
    on(kind, fn) {
      if (typeof kind !== 'string' || typeof fn !== 'function') return () => {};
      if (!_wsyKnownKind(kind) && !warned.has(kind)) { warned.add(kind); problems.push({ rule: 'unknownEvent', kind, msg: `${kind} is not a standard event kind (WORLD_BUS_KINDS)` }); }
      if (!subs.has(kind)) subs.set(kind, []);
      subs.get(kind).push(fn);
      return () => bus.off(kind, fn);
    },
    off(kind, fn) { const l = subs.get(kind); if (!l) return; const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); },
    once(kind, fn) { const off = bus.on(kind, (e, k) => { off(); fn(e, k); }); return off; },
    emit(kind, data) {
      if (typeof kind !== 'string' || !kind) return 0;
      if (!_wsyKnownKind(kind) && !warned.has(kind)) { warned.add(kind); problems.push({ rule: 'unknownEvent', kind, msg: `${kind} is not a standard event kind (WORLD_BUS_KINDS)` }); }
      if (depth > 16) { problems.push({ rule: 'busStorm', kind, msg: `events nested deeper than 16 (${kind} dropped): a handler loop` }); return 0; }
      const e = Object.assign({}, data && typeof data === 'object' ? data : { value: data });
      e.kind = kind;
      if (!_wsyNum(e.t)) e.t = world && _wsyNum(world.t) ? world.t : 0;
      recent.push(e); if (recent.length > 200) recent.shift();
      let n = 0;
      depth++;
      try {
        for (const k of [kind, '*']) {
          const l = subs.get(k);
          if (!l || !l.length) continue;
          for (const fn of l.slice()) {
            try { fn(e, kind); n++; }
            catch (err) { problems.push({ rule: 'listenerError', kind, msg: `a ${kind} listener threw (${err && err.message || err}); removed` }); bus.off(k, fn); }
          }
        }
      } finally { depth--; }
      return n;
    },
    kinds() { return [..._wsyStdKinds(), ...(_wsyBusExtra ? [..._wsyBusExtra] : [])]; },
    count(kind) { const l = subs.get(kind); return l ? l.length : 0; },
  };
  if (world && typeof world === 'object') world.bus = bus;
  return bus;
}

/* ---------- deterministic random streams (G4, 11.6) ---------- */
/** A stable key for an entity: its id, else obj@x,z (so adding another entity never changes it). */
function worldEntityKey(e) {
  if (e == null) return 'null';
  if (typeof e !== 'object') return String(e);
  if (e.id != null && e.id !== '') return String(e.id);
  const x = _wsyNum(e.x) ? e.x : e.at && _wsyNum(e.at[0]) ? e.at[0] : 0, z = _wsyNum(e.z) ? e.z : e.at && _wsyNum(e.at[1]) ? e.at[1] : 0;
  return `${e.obj || e.cls || 'ent'}@${Math.round(x * 100) / 100},${Math.round(z * 100) / 100}`;
}
function worldRngSeed(world, system, id) { return _wsyHash(((world && world.seed) | 0) + '|' + String(system || '') + '|' + worldEntityKey(id)); }
function worldRng(world, system, id, o) {
  const seed = worldRngSeed(world, system, id);
  if ((o && o.fresh) || !world || typeof world !== 'object') return _wsyStream(seed);
  const m = _wsySlot(world, '_wsyRng', () => new Map());
  const key = String(system || '') + '|' + worldEntityKey(id);
  let r = m.get(key);
  if (!r) { if (m.size > 50000) m.clear(); r = _wsyStream(seed); m.set(key, r); }
  return r;
}

/* ---------- the spatial index (G3, 11.5) ---------- */
function worldGrid(cell) {
  const C = _wsyNum(cell) && cell > 0 ? cell : 2, inv = 1 / C, MAXC = 1024;
  const cells = new Map(), items = new Map(), big = new Set();
  let stamp = 0;
  const ci = v => Math.max(-32767, Math.min(32767, Math.floor(v * inv)));
  const key = (i, j) => (i + 32768) * 65536 + (j + 32768);
  const range = (x, z, r) => [ci(x - r), ci(z - r), ci(x + r), ci(z + r)];
  function cover(it) {
    const [i0, j0, i1, j1] = range(it.x, it.z, it.r);
    it.rg = [i0, j0, i1, j1];
    if ((i1 - i0 + 1) * (j1 - j0 + 1) > MAXC) { big.add(it); it.big = true; return; }
    it.big = false;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const k = key(i, j); let a = cells.get(k); if (!a) cells.set(k, a = []); a.push(it); }
  }
  function uncover(it) {
    if (it.big) { big.delete(it); return; }
    const [i0, j0, i1, j1] = it.rg;
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const k = key(i, j), a = cells.get(k); if (!a) continue;
      const p = a.indexOf(it); if (p >= 0) { a[p] = a[a.length - 1]; a.pop(); }
      if (!a.length) cells.delete(k);
    }
  }
  const G = {
    cell: C,
    add(id, x, z, r) {
      if (items.has(id)) return G.move(id, x, z, r);
      if (!_wsyNum(x) || !_wsyNum(z)) return false;
      const it = { id, x, z, r: _wsyNum(r) && r > 0 ? r : 0, s: 0, rg: null, big: false };
      items.set(id, it); cover(it);
      return true;
    },
    move(id, x, z, r) {
      const it = items.get(id);
      if (!it) return G.add(id, x, z, r);
      if (!_wsyNum(x) || !_wsyNum(z)) return false;
      const nr = _wsyNum(r) && r > 0 ? r : r == null ? it.r : 0, [i0, j0, i1, j1] = range(x, z, nr), g = it.rg;
      it.x = x; it.z = z;
      if (g && !it.big && g[0] === i0 && g[1] === j0 && g[2] === i1 && g[3] === j1) { it.r = nr; return true; }
      uncover(it); it.r = nr; cover(it);
      return true;
    },
    remove(id) { const it = items.get(id); if (!it) return false; uncover(it); items.delete(id); return true; },
    query(x, z, r, fn) {
      if (!_wsyNum(x) || !_wsyNum(z)) return 0;
      r = _wsyNum(r) && r > 0 ? r : 0;
      stamp++;
      let n = 0, stop = false;
      const visit = (it) => {
        if (it.s === stamp) return; it.s = stamp;
        const dx = it.x - x, dz = it.z - z, R = r + it.r;
        if (dx * dx + dz * dz > R * R) return;
        n++;
        if (fn && fn(it.id, it.x, it.z, it.r) === false) stop = true;
      };
      const [i0, j0, i1, j1] = range(x, z, r);
      if ((i1 - i0 + 1) * (j1 - j0 + 1) > Math.max(64, items.size * 2)) { for (const it of items.values()) { visit(it); if (stop) break; } return n; }
      for (let i = i0; i <= i1 && !stop; i++) for (let j = j0; j <= j1 && !stop; j++) {
        const a = cells.get(key(i, j)); if (!a) continue;
        for (let p = 0; p < a.length && !stop; p++) visit(a[p]);
      }
      if (!stop) for (const it of big) { visit(it); if (stop) break; }
      return n;
    },
    list(x, z, r) { const out = []; G.query(x, z, r, id => { out.push(id); }); return out; },
    has(id) { return items.has(id); },
    get(id) { const it = items.get(id); return it ? { x: it.x, z: it.z, r: it.r } : null; },
    size() { return items.size; },
    clear() { cells.clear(); items.clear(); big.clear(); },
  };
  return G;
}

/* ---------- the scene graph (G2, 11.4) ---------- */
function _wsyFacing(e) { return _wsyNum(e.facing) ? e.facing : _wsyNum(e.heading) ? e.heading / _WSY_DEG : 0; }
/** The world transform of a local offset { dx: right, dy: up, dz: ahead, dfacing } in a parent's frame. */
function _wsyCompose(p, l) {
  const pf = _wsyFacing(p), f = pf * _WSY_DEG, s = Math.sin(f), c = Math.cos(f), dx = l && _wsyNum(l.dx) ? l.dx : 0, dz = l && _wsyNum(l.dz) ? l.dz : 0;
  return { x: p.x + dz * s + dx * c, z: p.z + dz * c - dx * s, y: (_wsyNum(p.y) ? p.y : 0) + (l && _wsyNum(l.dy) ? l.dy : 0), facing: _wsyNorm360(pf + (l && _wsyNum(l.dfacing) ? l.dfacing : 0)) };
}
/** The local offset that keeps child c where it is in parent p's frame. */
function _wsyLocalOf(p, c) {
  const f = _wsyFacing(p) * _WSY_DEG, s = Math.sin(f), co = Math.cos(f), ex = (c.x || 0) - p.x, ez = (c.z || 0) - p.z;
  return { dx: ex * co - ez * s, dz: ex * s + ez * co, dy: (_wsyNum(c.y) ? c.y : 0) - (_wsyNum(p.y) ? p.y : 0), dfacing: _wsyNorm360(_wsyFacing(c) - _wsyFacing(p)) };
}
function _wsyAttachState(world) {
  return _wsySlot(world, '_wsyAttach', () => ({ links: new Map(), order: [], dirty: true, ents: new Map(), entSrc: null, entN: -1, agents: null, log: [] }));
}
function _wsyFind(world, id) {
  if (id == null) return null;
  if (typeof id === 'object') return id;
  const A = _wsyAttachState(world), key = String(id), ents = Array.isArray(world.entities) ? world.entities : [];
  if (A.entSrc !== ents || A.entN !== ents.length) {
    A.ents = new Map(); A.entSrc = ents; A.entN = ents.length;
    for (const e of ents) if (e && e.id != null && !A.ents.has(String(e.id))) A.ents.set(String(e.id), e);
  }
  const hit = A.ents.get(key);
  if (hit) return hit;
  if (A.agents) { const a = A.agents.get(key); if (a) return a; }
  else for (const a of Array.isArray(world.agents) ? world.agents : []) if (a && String(a.id) === key) return a;
  const sim = world.sim;   // the life sim's own index (life keeps byId)
  if (sim && sim.byId instanceof Map) { const a = sim.byId.get(key) || sim.byId.get(id); if (a && !a.dead) return a; }
  return null;
}
function _wsyAttachLog(world, entry) {
  const A = _wsyAttachState(world), e = Object.assign({ t: _wsyNum(world.t) ? world.t : 0, by: 'systems' }, entry);
  A.log.push(e); if (A.log.length > 200) A.log.shift();
  if (world.runner && Array.isArray(world.runner.log)) world.runner.log.push(Object.assign({ sys: 'attach', kind: 'attach' }, e));
}
/** Give a child a parent (and optionally a second anchor). Refuses cycles and missing parents (logged); returns the link. */
function worldAttach(world, child, parentId, local, o) {
  if (!world || typeof world !== 'object') return null;
  o = o || {};
  const A = _wsyAttachState(world), c = _wsyFind(world, child);
  if (!c || typeof c !== 'object') { _wsyAttachLog(world, { id: String(child), action: 'drop', rule: 'orphan', reason: 'worldAttach: no such child' }); return null; }
  if (parentId == null) { worldDetach(world, c); return null; }
  const p = _wsyFind(world, parentId);
  if (!p) { _wsyAttachLog(world, { id: worldEntityKey(c), action: 'drop', rule: 'orphan', reason: `no parent ${parentId}` }); return null; }
  // cycle: walk up from the parent; reaching the child would make a loop
  for (let q = p, n = 0; q && n < 64; n++) {
    if (q === c) { _wsyAttachLog(world, { id: worldEntityKey(c), action: 'drop', rule: 'cycle', reason: `attaching to ${parentId} would make a loop` }); return null; }
    const l = A.links.get(q); q = l ? _wsyFind(world, l.parent) : null;
  }
  let to = null;
  if (o.to != null) { to = _wsyFind(world, o.to); if (!to || to === c) { _wsyAttachLog(world, { id: worldEntityKey(c), action: 'drop', rule: 'orphan', reason: `no second anchor ${o.to}` }); return null; } }
  const pid = typeof parentId === 'object' ? worldEntityKey(parentId) : String(parentId);
  const L = local && typeof local === 'object' ? { dx: +local.dx || 0, dy: +local.dy || 0, dz: +local.dz || 0, dfacing: +local.dfacing || 0 } : _wsyLocalOf(p, c);
  const rec = { child: c, parent: pid, local: L, to: to ? (typeof o.to === 'object' ? worldEntityKey(o.to) : String(o.to)) : null,
    toLocal: to ? (o.toLocal && typeof o.toLocal === 'object' ? { dx: +o.toLocal.dx || 0, dy: +o.toLocal.dy || 0, dz: +o.toLocal.dz || 0, dfacing: 0 } : { dx: 0, dy: 0, dz: 0, dfacing: 0 }) : null, missing: 0 };
  A.links.set(c, rec); A.dirty = true;
  c.parent = pid; c.local = L;
  _wsyResolveOne(world, A, rec);
  return rec;
}
function worldDetach(world, child) {
  if (!world || typeof world !== 'object') return false;
  const A = _wsyAttachState(world), c = _wsyFind(world, child);
  if (!c || !A.links.has(c)) return false;
  A.links.delete(c); A.dirty = true; c.parent = null;
  return true;
}
function _wsyResolveOne(world, A, rec) {
  const p = _wsyFind(world, rec.parent), q = rec.to ? _wsyFind(world, rec.to) : null, c = rec.child;
  if (!p || (rec.to && !q)) {
    if (++rec.missing >= 3) {
      A.links.delete(c); A.dirty = true; c.parent = null; c.orphan = true;
      if (rec.to) c.hidden = true;
      _wsyAttachLog(world, { id: worldEntityKey(c), obj: c.obj, action: 'detach', rule: 'orphan', reason: `parent ${!p ? rec.parent : rec.to} is gone` });
    }
    return false;
  }
  rec.missing = 0;
  if (_wsyNum(c.x)) { c.px = c.x; c.pz = c.z; c.py = c.y; c.pfacing = c.facing; }
  const a = _wsyCompose(p, rec.local);
  if (q) {
    const b = _wsyCompose(q, rec.toLocal);
    c.ends = [[a.x, a.y, a.z], [b.x, b.y, b.z]];
    c.len = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    c.x = (a.x + b.x) / 2; c.y = (a.y + b.y) / 2; c.z = (a.z + b.z) / 2;
    c.facing = _wsyNorm360(Math.atan2(b.x - a.x, b.z - a.z) / _WSY_DEG);
  } else { c.x = a.x; c.y = a.y; c.z = a.z; c.facing = a.facing; }
  return true;
}
/** Resolve every link, parents first (the attach system's tick). */
function _wsyAttachResolve(world) {
  const A = _wsyAttachState(world);
  if (!A.links.size) return 0;
  // the agents of this tick by id (they come and go; the statics are indexed once)
  A.agents = null;
  if (Array.isArray(world.agents) && world.agents.length) { A.agents = new Map(); for (const a of world.agents) if (a && a.id != null) A.agents.set(String(a.id), a); }
  if (A.dirty) {
    const depth = new Map(), recs = [...A.links.values()];
    const d = (rec, n) => {
      if (depth.has(rec)) return depth.get(rec);
      if (n > 64) return 0;
      let v = 0;
      for (const id of [rec.parent, rec.to]) { if (id == null) continue; const pe = _wsyFind(world, id), pl = pe ? A.links.get(pe) : null; if (pl) v = Math.max(v, 1 + d(pl, n + 1)); }
      depth.set(rec, v); return v;
    };
    recs.forEach(r => d(r, 0));
    A.order = recs.map((r, i) => [r, depth.get(r), i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map(x => x[0]);
    A.dirty = false;
  }
  let n = 0;
  for (const rec of A.order.slice()) if (A.links.get(rec.child) === rec && _wsyResolveOne(world, A, rec)) n++;
  A.agents = null;
  return n;
}
/** The current world transform of an entity: its parent chain composed (or its own transform). */
function worldResolve(world, ent, depth) {
  if (!ent) return null;
  const own = { x: ent.x, y: _wsyNum(ent.y) ? ent.y : 0, z: ent.z, facing: _wsyFacing(ent) };
  if (!world || typeof world !== 'object' || (depth | 0) > 32) return own;
  const A = world._wsyAttach, rec = A ? A.links.get(ent) : null;
  if (!rec) return own;
  const p = _wsyFind(world, rec.parent);
  if (!p) return own;
  const a = _wsyCompose(worldResolve(world, p, (depth | 0) + 1), rec.local);
  if (!rec.to) return a;
  const q = _wsyFind(world, rec.to);
  if (!q) return own;
  const b = _wsyCompose(worldResolve(world, q, (depth | 0) + 1), rec.toLocal);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2, facing: _wsyNorm360(Math.atan2(b.x - a.x, b.z - a.z) / _WSY_DEG) };
}

/* ---------- level of detail and culling (G7, 11.9) ---------- */
/** The screen box of an entity through a v2 camera: [X0, Y0, X1, Y1]; null wholly behind the camera; 'span' across its plane. */
function _wsyBox(cam, e) {
  const h = _wsyNum(e.height) ? e.height : e.size && _wsyNum(e.size.h) ? e.size.h : _wsyNum(e.h) ? e.h : 1;
  const y = _wsyNum(e.y) ? e.y : 0, sz = e.size || {};
  const half = Math.max(0.3, Math.max(_wsyNum(sz.w) ? sz.w : 0, _wsyNum(sz.d) ? sz.d : 0, h * 0.5) * 0.6);
  const pts = [[e.x, e.z, half]];
  if (Array.isArray(e.foot)) for (const p of e.foot) if (Array.isArray(p)) pts.push([p[0], p[1], 0.05]);
  let X0 = Infinity, X1 = -Infinity, Y0 = Infinity, Y1 = -Infinity, front = 0, behind = 0;
  for (const [x, z, hw0] of pts) {
    if (!_wsyNum(x) || !_wsyNum(z)) continue;
    if (!(z > 0.3)) { behind++; continue; }
    front++;
    const k = cam.f / z, X = cam.x0 + k * x, hw = k * hw0, Yf = cam.horizon + k * (cam.eye - y), Yt = Yf - k * h;
    if (X - hw < X0) X0 = X - hw; if (X + hw > X1) X1 = X + hw;
    if (Yt < Y0) Y0 = Yt; if (Yf > Y1) Y1 = Yf;
  }
  if (!front) return null;
  if (behind) return 'span';
  return [X0, Y0, X1, Y1];
}
function _wsyNearZ(e) {
  let z = _wsyNum(e.z) ? e.z - (_wsyNum(e.r) ? e.r : 0) : Infinity;
  if (Array.isArray(e.foot)) for (const p of e.foot) if (Array.isArray(p) && _wsyNum(p[1])) z = Math.min(z, p[1]);
  return z;
}
/** Occluders for culling: the solid core of buildings, walls and hedges (inset 10 % each side, the top 30 % left out). */
function worldLodOccluders(world, cam) {
  const out = [];
  cam = cam || (world && world.cam);
  if (!cam || !(cam.f > 0)) return out;
  for (const e of world && Array.isArray(world.entities) ? world.entities : []) {
    if (!e || e.hidden) continue;
    const cls = String(e.cls || ''), obj = String(e.obj || '');
    const opaque = cls === 'building' || cls === 'hedge' || (cls === 'fence' && /wall/.test(obj)) || cls === 'wall';
    if (!opaque || e.solidity === 'passable') continue;
    const b = _wsyBox(cam, e);
    if (!Array.isArray(b)) continue;
    const w = b[2] - b[0], h = b[3] - b[1];
    if (w < 4 || h < 4) continue;
    let zFar = -Infinity;
    for (const p of Array.isArray(e.foot) && e.foot.length ? e.foot : [[e.x, e.z]]) if (_wsyNum(p[1])) zFar = Math.max(zFar, p[1]);
    out.push({ id: e.id == null ? worldEntityKey(e) : e.id, core: [b[0] + w * 0.1, b[1] + h * 0.3, b[2] - w * 0.1, b[3]], zFar });
  }
  return out;
}
/** The LOD level and the cull state of one entity (with hysteresis against its previous state). */
function worldLod(ent, cam, o) {
  if (!ent || typeof ent !== 'object') return null;
  o = o || {};
  const L = WORLD_LOD;
  if (!cam || !(cam.f > 0)) { ent.lod = 0; ent.culled = false; ent.cullReason = null; return { lod: 0, culled: false, reason: null, box: null }; }
  const box = ent.hidden ? null : _wsyBox(cam, ent), wasC = ent.culled === true, prev = Number.isInteger(ent.lod) ? ent.lod : null;
  let culled = false, reason = null, hpx = Infinity;
  if (ent.hidden) { culled = true; reason = 'hidden'; }
  else if (box === null) { culled = true; reason = 'behind'; }
  else if (box !== 'span') {
    hpx = box[3] - box[1];
    const out = Math.max(-box[2], box[0] - L.W, -box[3], box[1] - L.H);
    if (out > (wasC ? L.cullIn : L.cullOut)) { culled = true; reason = 'offscreen'; }
    else if (Array.isArray(o.occluders) && o.occluders.length) {
      const zn = _wsyNearZ(ent), m = wasC && ent.cullReason === 'occluded' ? 0 : 6;
      for (const oc of o.occluders) {
        if (!(oc.zFar < zn) || (ent.id != null && oc.id === ent.id)) continue;
        const c = oc.core;
        if (box[0] >= c[0] + m && box[2] <= c[2] - m && box[1] >= c[1] + m && box[3] <= c[3]) { culled = true; reason = 'occluded'; break; }
      }
    }
  }
  const t0 = prev === 0 ? L.near / L.hyst : prev == null ? L.near : L.near * L.hyst;
  const t1 = prev === 2 ? L.far * L.hyst : prev == null ? L.far : L.far / L.hyst;
  const lod = hpx >= t0 ? 0 : hpx >= t1 ? 1 : 2;
  ent.lod = lod; ent.culled = culled; ent.cullReason = reason;
  return { lod, culled, reason, box: Array.isArray(box) ? box : null };
}
var _wsyLodPh;
/** Whether a per-tick system should update this entity on this tick: lod 0 every tick, 1 every 2nd, 2 every 4th; culled never. */
function worldLodDue(ent, tick) {
  if (!ent || ent.culled === true) return false;
  const l = ent.lod | 0;
  if (l <= 0) return true;
  if (!_wsyLodPh) _wsyLodPh = new WeakMap();
  let ph = _wsyLodPh.get(ent);
  if (ph == null) { ph = _wsyHash(worldEntityKey(ent)) & 3; _wsyLodPh.set(ent, ph); }
  const m = WORLD_LOD.rates[Math.min(2, l)];
  return (((tick | 0) + ph) % m) === 0;
}
function _wsyLodAll(world, statics) {
  const cam = world.cam, S = _wsySlot(world, '_wsyLod', () => ({ occ: null, n: -1, src: null, cam: null }));
  const ents = Array.isArray(world.entities) ? world.entities : [];
  let n = 0;
  if (statics || S.src !== ents || S.n !== ents.length || S.cam !== cam) {
    S.occ = worldLodOccluders(world, cam); S.src = ents; S.n = ents.length; S.cam = cam;
    for (const e of ents) if (e && typeof e === 'object') { worldLod(e, cam, { occluders: S.occ }); n++; }
  }
  for (const a of Array.isArray(world.agents) ? world.agents : []) if (a && typeof a === 'object') { worldLod(a, cam, { occluders: S.occ }); n++; }
  return n;
}

/* ---------- the time context (11.11) ---------- */
var _wsySkyBusy = false;
/** Local solar date parts of a time: { hour, dow (0 = Sunday), month (0..11), doy (0..365), day (days since 1970) }. */
function _wsyLocal(ms, lon) {
  const t = ms + (_wsyNum(lon) ? lon : 0) / 15 * 3600000, day = Math.floor(t / 86400000);
  const z = day + 719468, era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doyM = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doyM + 2) / 153);
  const month = (mp < 10 ? mp + 3 : mp - 9) - 1, y = yoe + era * 400 + (month < 2 ? 1 : 0);
  const jan1 = (() => { const yy = y - 1, e2 = Math.floor(yy / 400), yoe2 = yy - e2 * 400, doy2 = 306, doe2 = yoe2 * 365 + Math.floor(yoe2 / 4) - Math.floor(yoe2 / 100) + doy2; return e2 * 146097 + doe2 - 719468; })();
  return { hour: ((t / 3600000) % 24 + 24) % 24, dow: ((day + 4) % 7 + 7) % 7, month, doy: Math.max(0, day - jan1), day };
}
/** A UK lowland climatology (deg C) when nothing live gives the temperature: the month's mean and a day swing, less 0.65 per 100 m. */
function _wsyClimateTemp(month, hour, lat, alt) {
  const mean = [4.5, 4.8, 6.8, 9, 12, 15, 17, 17, 14.5, 11, 7.5, 5][month] - Math.max(0, (Math.abs(lat) - 52)) * 0.6 - (_wsyNum(alt) ? alt : 0) * 0.0065;
  const swing = [2.5, 3, 4, 5, 5.5, 5.5, 5.5, 5, 4.5, 3.5, 2.5, 2][month];
  return Math.round((mean + swing * Math.cos(2 * Math.PI * (hour - 15) / 24)) * 10) / 10;
}
/** The weather kinds of the v2 resolver to the context's five. */
function _wsyWeatherOf(wx, snowing) {
  const k = wx && wx.kind;
  if (snowing || k === 'snow') return 'snow';
  if (k === 'rain' || k === 'drizzle' || k === 'showers' || k === 'thunder' || k === 'sleet') return 'rain';
  if (k === 'fog' || k === 'mist') return 'fog';
  if (k === 'cloudy') return 'cloud';
  return 'clear';
}
/**
 * The scene's ONE wind (S3, Y5): { dir, s, from, kmh, src }. dir = where it blows TO in the camera frame (0 = away from the
 * camera, 90 = right: the entity facing convention); from = the compass bearing it comes FROM; s = km/h / 20 (1 = a moderate
 * breeze; under WORLD_WIND_CALM is calm). Live data first (sky.wx.wind km/h, sky.wx.dir), then a fixed weather's wind, else a
 * seeded wind for the date and a 2-degree cell (so every scene of an area agrees): mostly south-westerly, about 1 day in 8
 * calm, stronger in the afternoon, gusty in showers and thunder, still in fog.
 */
function _wsyWindOf(p) {
  const o = p.o || {}, sky = p.sky || {}, live = sky.wx && typeof sky.wx === 'object' ? sky.wx : null, wx = p.wx || {}, heading = p.heading;
  const ov = o.wind && typeof o.wind === 'object' ? o.wind : null;
  const day = p.local.day, hour = p.local.hour, cell = Math.floor((p.lat || 0) / 2) + ',' + Math.floor((p.lon || 0) / 2);
  const r = _wsyStream(_wsyHash('wind|' + day + '|' + cell)), u1 = r(), u2 = r(), u3 = r(), u4 = r();
  let kmh = u1 < 0.12 ? 1 + 2 * u2 : 5 + 25 * Math.pow(u2, 1.4), src = 'seeded';
  kmh *= hour >= 7 && hour <= 21 ? 0.8 + 0.35 * Math.sin(Math.PI * (hour - 7) / 14) : 0.8;
  let from = 225 + 80 * (u3 + u4 - 1) + 10 * Math.sin(2 * Math.PI * hour / 24 + u3 * 6);
  if (live && _wsyNum(live.wind) && wx.src === 'live') { kmh = Math.max(0, live.wind); src = 'live'; }
  else if (wx.src === 'fixed' && _wsyNum(o.wx && o.wx.wind)) { kmh = Math.max(0, (o.wx.wind - 0.4) * 28); src = 'fixed'; }
  for (const k of ['dir', 'deg', 'windDir', 'bearing']) if (live && _wsyNum(live[k])) { from = live[k]; break; }
  if (src !== 'live') {
    if (wx.kind === 'thunder' || wx.kind === 'showers') kmh = Math.max(kmh, 28);
    if (wx.kind === 'fog' || wx.kind === 'mist') kmh = Math.min(kmh, 4);
  }
  if (ov) {
    if (_wsyNum(ov.kmh)) kmh = Math.max(0, ov.kmh);
    if (_wsyNum(ov.s)) kmh = Math.max(0, ov.s) * 20;
    if (_wsyNum(ov.from)) from = ov.from;
    if (_wsyNum(ov.dir)) from = ov.dir + 180 + heading;
    src = 'override';
  }
  from = _wsyNorm360(from);
  return { dir: _wsyR3(_wsyNorm360(from + 180 - heading)), s: _wsyR3(kmh / 20), from: _wsyR3(from), kmh: Math.round(kmh * 10) / 10, src };
}
/**
 * The time context (11.11) at time ms, for this world's place and camera. Pure and deterministic: the same world, ms and o
 * give the same context. Sources: the live sky (look's worldSkyOf(ctx) when it is loaded, else the v2 sceneLightV2), the v2
 * weather (sceneWeather through the sky; sceneSnowCover, sceneSnowFalling, sceneFrostAt) and sceneSeason. o: { sky: the app's
 * sky { ms, lat, lon, wx: { cond, wind, temp, dir } } (or a function returning it), wx: a weather override ('snow', { kind,
 * wind, temp }), wind: { dir, s } or { from, kmh } }.
 * -> { ms, t, lat, lon, alt, heading, month, doy, hour, dow, weekend, season, weather: 'clear' | 'cloud' | 'rain' | 'snow' | 'fog',
 *      wx, cover, temp, tempSrc, snowDay, snowCover, snowDepth, snowing, frost, wet, wind: { dir, s, from, kmh, src },
 *      sun: { az, alt, rel }, moon: { az, alt, illum }, dark, lamps, band: 'night' | 'dawn' | 'day' | 'golden' | 'dusk', src }
 */
function worldTimeCtx(world, ms, o) {
  o = o || {}; world = world && typeof world === 'object' ? world : {};
  const place = world.place || {}, cam = world.cam || {};
  let sky = typeof o.sky === 'function' ? o.sky() : o.sky;
  sky = sky && typeof sky === 'object' ? sky : null;
  const pick = (...v) => { for (const x of v) if (_wsyNum(x)) return x; return null; };
  const lat = pick(place.lat, cam.lat, sky && sky.lat, 52.5), lon = pick(place.lon, cam.lon, sky && sky.lon, -1.5), alt = pick(place.alt, cam.alt, 0);
  const heading = pick(cam.heading, 0);
  if (!_wsyNum(ms)) ms = pick(sky && sky.ms, world.ms, WORLD_TIME_DEFAULT_MS);
  const local = _wsyLocal(ms, lon);
  // the light and the weather, ONE resolution for the base layer, the compositor and every system: the v2 light from the real
  // inputs (a fixed weather override, the live sky's conditions), then look's sky (worldSkyOf) told that light and weather, so
  // the sun, the moon and the darkness are the drawn sky's. Without look: the v2 light alone; without either: a plain day.
  let V = null, S = null;
  if (typeof sceneLightV2 === 'function') {
    try { V = sceneLightV2({ sky: Object.assign({}, sky || {}, { ms, lat, lon }), wx: o.wx }, {}, { v: 2, camera: { heading, lat, lon, alt } }); } catch (e) { V = null; }
  }
  if (typeof worldSkyOf === 'function' && !_wsySkyBusy) {
    _wsySkyBusy = true;   // a sky that asks for the time context again gets the v2 light, never a loop
    const vw = V && V.wx && typeof V.wx === 'object' ? V.wx : null;
    try { S = worldSkyOf({ ms, lat, lon, alt, heading, month: local.month, doy: local.doy, hour: local.hour, weather: vw ? vw.kind : undefined, cover: V ? V.cover : undefined, fog: vw ? vw.fog : undefined }, V ? { L: V, heading } : { heading }); } catch (e) { S = null; }
    _wsySkyBusy = false;
  }
  const altOf = X => (X ? pick(X.alt, X.sun && X.sun.alt) : null);
  if (altOf(S) == null) S = null;
  // the drawn sky first for the sky's own fields; the v2 light first for the weather, the lamps and the morning
  const get = k => (S && S[k] != null ? S[k] : V && V[k] != null ? V[k] : undefined), getV = k => (V && V[k] != null ? V[k] : S && S[k] != null ? S[k] : undefined);
  const sunAlt = pick(altOf(S), altOf(V), 45), sunAz = pick(S && S.az, S && S.sun && S.sun.az, V && V.az, 180);
  const m = get('moon') || {}, morning = getV('morning');
  let wx = getV('wx');
  wx = wx && typeof wx === 'object' ? wx : null;
  if (!wx && typeof sceneWeather === 'function') { try { wx = sceneWeather(o.wx != null ? o.wx : 'live', { ms, lat, lon, alt: sunAlt, morning: !!morning }, { sky, alt, lat, lon }); } catch (e) { wx = null; } }
  wx = wx || { kind: 'clear', rain: 0, snow: 0, fog: 0, wind: 1, wet: 0, snowDepth: 0, frost: 0, temp: null, src: 'none' };
  const season = typeof sceneSeason === 'function' ? sceneSeason(ms, lat) : ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'][local.month];
  let snowCover = 0;
  if (typeof sceneSnowCover === 'function') { try { snowCover = sceneSnowCover(lat, lon, alt, ms) || 0; } catch (e) { snowCover = 0; } }
  const snowing = typeof sceneSnowFalling === 'function' ? !!sceneSnowFalling(wx) : (wx.snow || 0) > 0.05 || wx.kind === 'snow' || wx.kind === 'sleet';
  const tempLive = _wsyNum(wx.temp) ? wx.temp : null, temp = tempLive != null ? tempLive : _wsyClimateTemp(local.month, local.hour, lat, alt);
  let frost = _wsyNum(wx.frost) ? wx.frost : 0;
  if (typeof sceneFrostAt === 'function' && morning != null) { try { frost = Math.max(frost, sceneFrostAt(V || { ms, lat, lon, alt: sunAlt, morning: !!morning }, tempLive, wx.kind) || 0); } catch (e) { /* keep */ } }
  const snowDepth = _wsyNum(wx.snowDepth) ? wx.snowDepth : snowCover;
  const lamps = typeof getV('lamps') === 'boolean' ? getV('lamps') : sunAlt < -2;
  const band = sunAlt < -6 ? 'night' : sunAlt < 4 ? (morning != null ? (morning ? 'dawn' : 'dusk') : local.hour < 12 ? 'dawn' : 'dusk') : sunAlt < 12 ? 'golden' : 'day';
  const cover = get('cover'), dark = get('dark'), lh = get('localHour'), wd = get('weekday');
  const ctx = {
    ms, t: _wsyNum(world.t) ? world.t : 0, lat, lon, alt, heading, month: local.month, doy: local.doy, hour: Math.round((_wsyNum(lh) ? lh : local.hour) * 1000) / 1000,
    dow: _wsyNum(wd) ? wd : local.dow, weekend: false, season, weather: _wsyWeatherOf(wx, snowing), wx,
    cover: _wsyNum(cover) ? cover : wx.kind === 'cloudy' ? 0.9 : 0.3, temp, tempSrc: tempLive != null ? 'live' : 'climate',
    snowDay: snowDepth > 0 || snowCover > 0, snowCover, snowDepth, snowing, frost: _wsyR3(frost), wet: _wsyNum(wx.wet) ? wx.wet : 0,
    wind: null, sun: { az: _wsyR3(sunAz), alt: _wsyR3(sunAlt), rel: _wsyR3(((sunAz - heading) % 360 + 540) % 360 - 180) },
    moon: { az: pick(m.az, 0), alt: pick(m.alt, -10), illum: pick(m.illum, 0) }, dark: _wsyNum(dark) ? dark : sunAlt < -6 ? 1 : 0, lamps, band,
    src: wx.src || 'moment',
  };
  ctx.weekend = ctx.dow === 0 || ctx.dow === 6;
  ctx.wind = _wsyWindOf({ o, sky, wx, heading, lat, lon, local });
  return ctx;
}
/** The time system's tick: the context now, recomputed when the clock moved >= 1 s (or forced); events on changes. */
function _wsyTimeUpdate(world, force) {
  const R = world.runner, S = _wsySlot(world, '_wsyTimeS', () => ({ ms: null }));
  const ms = R && typeof R.msAt === 'function' ? R.msAt() : _wsyNum(world.ms) ? world.ms : WORLD_TIME_DEFAULT_MS;
  if (force || !world.time || S.ms == null || Math.abs(ms - S.ms) >= 1000) {
    const prev = world.time || null, ctx = worldTimeCtx(world, ms, R ? R.o : {});
    S.ms = ms; world.time = ctx;
    if (prev && !force) {
      const bus = world.bus;
      if (bus) {
        if (prev.weather !== ctx.weather || (prev.wx && ctx.wx && prev.wx.kind !== ctx.wx.kind)) bus.emit('weather', { from: prev.weather, to: ctx.weather });
        if (!prev.snowing && ctx.snowing) bus.emit('snowStart', {});
        if (prev.snowing && !ctx.snowing) bus.emit('snowStop', {});
        // lightsOn / lightsOff belong to the light system when one runs (look decides when lamps light); else the time system says
        const lightRuns = !!(R && R._inst && R._inst.some(I => I.id === 'light' && I.enabled));
        if (!lightRuns && !prev.lamps && ctx.lamps) bus.emit('lightsOn', { alt: ctx.sun.alt });
        if (!lightRuns && prev.lamps && !ctx.lamps) bus.emit('lightsOff', { alt: ctx.sun.alt });
      }
    }
  }
  if (world.time) world.time.t = _wsyNum(world.t) ? world.t : 0;
  return world.time;
}

/* ---------- the runner (11.3) ---------- */
const _WSY_LADDER = Object.freeze([[1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [4, 3], [8, 3]]);   // [rate divisor, degrade level]
function worldRun(world, o) {
  o = o || {};
  if (!world || typeof world !== 'object') world = {};
  if (world.runner && typeof world.runner.stop === 'function' && world.runner._wsy) world.runner.stop();
  const HZ = WORLD_TICK_HZ, TICK = 1 / HZ, MAXSTEPS = 8, WIN = Math.max(16, (o.window | 0) || 120);
  const now = typeof o.now === 'function' ? o.now : _wsyNow;
  const bus = worldBus(world), log = [], offs = [];
  // the system set: o.systems exactly, else the registry (+ o.extra), less o.skip
  const R0 = _wsyRegistry(), problems = [];
  let defs;
  if (Array.isArray(o.systems)) defs = o.systems.map(s => (typeof s === 'string' ? R0.defs.get(s) || (problems.push({ id: s, rule: 'unknownSystem', msg: `no system ${s}` }), null) : s)).filter(Boolean);
  else defs = [...R0.defs.values(), ...(Array.isArray(o.extra) ? o.extra : [])];
  const skip = new Set(Array.isArray(o.skip) ? o.skip : []);
  const ord = worldSystemOrder(defs.filter(d => !(d && skip.has(d.id))));
  problems.push(...ord.problems);
  const R = {
    _wsy: true, world, bus, log, problems, o, tick: 0, t: 0, alpha: 0, paused: false, stopped: false, frames: 0, dropped: 0,
    acc: 0, resumed: false, lastNow: null, ms0: null,
    get ctx() { return world.time || null; },
  };
  const msStart = [o.ms, world.ms, o.sky && typeof o.sky === 'object' ? o.sky.ms : null].find(_wsyNum);
  R.ms0 = _wsyNum(msStart) ? msStart : WORLD_TIME_DEFAULT_MS;
  R.msAt = () => {
    if (typeof o.clock === 'function') { const v = Number(o.clock()); if (Number.isFinite(v)) return v; }
    return R.ms0 + (_wsyNum(o.timeScale) && o.timeScale > 0 ? R.t * 1000 * o.timeScale : 0);
  };
  const inst = ord.order.map(d => {
    const frame = d.rate === 'frame', base = frame ? 1 : Math.max(1, Math.round(HZ / d.rate));
    return { id: d.id, def: d, frame, base, every: base, step: 0, level: 0, enabled: true, error: null, over: 0, under: 0,
      ran: _wsyRing(WIN), all: _wsyRing(WIN), fMs: 0, fRuns: 0, runs: 0, lastT: 0 };
  });
  R._inst = inst;
  world.runner = R; world.t = 0; world.tick = 0;
  const quiet = o.quiet || typeof document === 'undefined';
  const fail = (I, where, e) => {
    if (!I.enabled) return;
    I.enabled = false; I.error = `${where}: ${e && e.message ? e.message : String(e)}`;
    log.push({ t: R.t, sys: I.id, kind: 'error', msg: I.error });
    if (!quiet && typeof console !== 'undefined' && console.warn) console.warn('[world] system ' + I.id + ' disabled: ' + I.error);
  };
  const run = (I, dt) => { const a = now(); try { I.def.update(world, dt); } catch (e) { fail(I, 'update', e); } const ms = now() - a; I.fMs += ms > 0 ? ms : 0; I.fRuns++; I.runs++; };
  // event handlers (subscribed before init: a system's init may already emit)
  for (const I of inst) for (const k of Object.keys(I.def.onEvent)) {
    const h = I.def.onEvent[k];
    offs.push(bus.on(k, (e) => { if (!I.enabled || R.stopped) return; try { h(world, e); } catch (err) { fail(I, 'onEvent.' + k, err); } }));
  }
  for (const I of inst) if (I.def.init) { try { I.def.init(world); } catch (e) { fail(I, 'init', e); } }
  const tickOnce = () => {
    R.tick++; R.t = R.tick * TICK; world.t = R.t; world.tick = R.tick;
    for (const I of inst) {
      if (!I.enabled || I.frame || !I.def.update || R.tick % I.every !== 0) continue;
      run(I, I.every * TICK);
    }
  };
  const runFrameSystems = () => {
    const tNow = R.t + R.alpha * TICK;
    for (const I of inst) {
      if (!I.enabled || !I.frame || !I.def.update || R.frames % I.every !== 0) continue;
      const dt = Math.max(0, tNow - I.lastT); I.lastT = tNow;
      run(I, dt);
    }
  };
  const setStep = (I, s, why) => {
    s = Math.max(0, Math.min(_WSY_LADDER.length - 1, s));
    if (s === I.step) return;
    const [mul, level] = _WSY_LADDER[s], up = s > I.step;
    I.step = s; I.every = I.base * mul;
    if (level !== I.level) { I.level = level; if (I.def.degrade) { try { I.def.degrade(level, world); } catch (e) { fail(I, 'degrade', e); } } }
    log.push({ t: R.t, sys: I.id, kind: up ? 'degrade' : 'recover', step: s, level, rate: I.frame ? 'frame/' + mul : HZ / I.every, why });
  };
  const budgets = () => {
    for (const I of inst) {
      _wsyPush(I.all, I.fMs);
      if (I.fRuns) _wsyPush(I.ran, I.fMs);
      I.fMs = 0; I.fRuns = 0;
      if (!I.enabled || o.deterministic) continue;
      const avg = _wsyLast(I.all, 8);
      if (avg > I.def.budgetMs) { I.under = 0; if (++I.over >= 30) { I.over = 0; setStep(I, I.step + 1, `${_wsyR3(avg)} ms > ${I.def.budgetMs} ms for 30 frames`); } }
      else if (I.step > 0 && avg < I.def.budgetMs * 0.5) { I.over = 0; if (++I.under >= 90) { I.under = 0; setStep(I, I.step - 1, `${_wsyR3(avg)} ms < half of ${I.def.budgetMs} ms for 90 frames`); } }
      else { I.over = 0; I.under = 0; }
    }
  };
  /** One drawn frame: dtReal seconds of real time. Returns the number of ticks run. */
  R.step = (dtReal) => {
    if (R.stopped || R.paused) return 0;
    let dt = _wsyNum(dtReal) && dtReal > 0 ? dtReal : 0;
    if (R.resumed) { dt = Math.min(dt, TICK); R.resumed = false; }
    R.acc += dt;
    let n = 0;
    while (R.acc >= TICK - 1e-9 && n < MAXSTEPS) { R.acc -= TICK; tickOnce(); n++; }
    if (R.acc >= TICK) { const k = Math.floor(R.acc / TICK); R.dropped += k * TICK; R.acc -= k * TICK; }   // a long gap: absorbed, never replayed
    if (R.acc < 0) R.acc = 0;
    R.alpha = Math.min(1, R.acc / TICK);
    runFrameSystems();
    budgets();
    R.frames++;
    return n;
  };
  /** step() from a timestamp (ms): the first call after start or resume advances nothing. */
  R.frame = (nowMs) => {
    if (R.stopped || R.paused) { R.lastNow = null; return 0; }
    const dt = R.lastNow == null || !_wsyNum(nowMs) ? 0 : (nowMs - R.lastNow) / 1000;
    R.lastNow = _wsyNum(nowMs) ? nowMs : null;
    return R.step(dt);
  };
  /** Advance scene time by sec at once (a warm-up, a still, a capture, a tool's sub-step): every whole tick it covers runs, the
      remainder carries to the next call (no drift), no sub-step cap, no budget accounting. Works while paused (a scrub). */
  R.advance = (sec) => {
    if (R.stopped) return 0;
    R.acc += _wsyNum(sec) && sec > 0 ? sec : 0;
    let n = 0;
    while (R.acc >= TICK - 1e-9) { R.acc -= TICK; tickOnce(); n++; }
    if (R.acc < 0) R.acc = 0;
    for (const I of inst) { I.fMs = 0; I.fRuns = 0; }
    R.alpha = Math.min(1, R.acc / TICK);
    runFrameSystems();
    for (const I of inst) { I.fMs = 0; I.fRuns = 0; }
    return n;
  };
  R.pause = () => { if (!R.paused) { R.paused = true; R.lastNow = null; } return R; };
  R.resume = () => { if (R.paused) { R.paused = false; R.resumed = true; R.lastNow = null; } return R; };
  R.setTime = (ms) => { if (_wsyNum(ms)) { R.ms0 = ms; _wsyTimeUpdate(world, false); } return world.time; };
  R.stop = () => {
    if (R.stopped) return;
    R.stopped = true;
    for (const off of offs) off();
    for (const I of inst) if (I.def.dispose) { try { I.def.dispose(world); } catch (e) { /* stopping */ } }
    if (world.runner === R) world.runner = null;
  };
  R.stats = () => ({
    t: R.t, tick: R.tick, alpha: R.alpha, paused: R.paused, frames: R.frames, dropped: _wsyR3(R.dropped),
    systems: inst.map(I => ({ id: I.id, phase: I.def.phase, rate: I.frame ? 'frame' : HZ / I.every, baseRate: I.def.rate, every: I.every, step: I.step, level: I.level,
      enabled: I.enabled, error: I.error, budgetMs: I.def.budgetMs, p50: _wsyR3(_wsyQuant(I.ran, 0.5)), p95: _wsyR3(_wsyQuant(I.ran, 0.95)),
      avg: _wsyR3(_wsyLast(I.all, WIN)), runs: I.runs })),
    problems: problems.slice(), log: log.slice(-100),
  });
  return R;
}

/* ---------- built-in systems (Y2): time, attach, lod ---------- */
worldSystem({
  id: 'time', phase: 'time', components: { read: [], write: ['time'] }, rate: 30, budgetMs: 0.1,
  init(world) { _wsyTimeUpdate(world, true); },
  update(world) { _wsyTimeUpdate(world, false); },
});
worldSystem({
  id: 'attach', phase: 'attach', components: { read: ['transform', 'agents'], write: ['transform', 'attach'] }, rate: 30, budgetMs: 0.1,
  init(world) { _wsyAttachResolve(world); },
  update(world) { _wsyAttachResolve(world); },
});
worldSystem({
  id: 'lod', phase: 'render', components: { read: ['transform', 'collider', 'agents'], write: ['render'] }, rate: 10, budgetMs: 0.3,
  init(world) { _wsyLodAll(world, true); },
  update(world) { _wsyLodAll(world, false); },
});
