/* ============================================================
   WORLD ENGINE v3.1, package `systems` (3 of 3 files): particles and cheap rigid bodies (WORLD_ENGINE_REQUIREMENTS.md G6, Y6,
   M3; docs/dev/WORLD_ENGINE.md 11.8). PURE classic script: nothing runs at load except constants and the 'particles' system
   registration (worldSystem, 79-world-0sys.js).

   Pooled, capped particles in world metres. The engine decides whether a kind may exist at all, whatever the caller asks:
     leaf    only in autumn (sceneSeason) AND in wind (s >= WORLD_WIND_CALM); from trees that are turning (worldKbState) or,
             without the knowledge base, any deciduous tree
     seed    May to October, in wind, not in rain
     snow    only while it snows (worldTimeCtx(...).snowing); rain only while it rains
     spray, smoke, steam, splash, ring   always (spray at weirs, smoke and steam drift DOWNWIND with the one wind)
   A refused request returns null and is logged once per reason (worldParticles(world).log). Live particles of a kind that is no
   longer allowed (the snow stopped) finish their fall; no new ones start. Nothing pops: a falling particle lives until it lands,
   and every particle fades in over 0.3 s and out over its last 0.6 s (p.alpha; draw with it).

     WORLD_PARTICLE_KINDS          per kind: cap, life, drag, fall, wind share, size, growth, rest time
     WORLD_PARTICLE_CAP = 600      all kinds together; WORLD_BODY_CAP = 24 bodies. At a cap the OLDEST is recycled.
     worldEmit(world, kind, o) -> emitter | null
        o: { x, y, z | at: [x, z] | from: entity (follows it through worldResolve), dy, spread (m), rate (per second: a running
             emitter) | n (a burst, the default 1), vy (or up: the upward speed), life, id (a stable id: its random stream),
             area: { x0, x1, z0, z1, y } }
        emitter: { id, kind, active, stop() }; a burst returns a stopped emitter after emitting
     worldParticles(world) -> { list (live particles: { kind, x, y, z, px, py, pz, size, alpha, age, life, rot, rest, water }),
                                bodies, counts: { kind: n }, total, caps, emitters, log }
     worldBody(world, o) -> body | null   a cheap ballistic body: o { x, y, z, vx, vy, vz, r, bounce, friction, floats, life,
                                id, onLand(body), onWater(body), onRest(body) }; gravity, air drag, ground contact with
                                bounce and rolling friction, water contact with a splash and rings, then it floats (drifting
                                downwind) or sinks. A ball thrown for a dog, a heron's strike.
     the 'particles' system (phase fx, after wind, 30 Hz, 0.5 ms): auto emitters at init (leaves from trees, smoke and steam
     from their entities, spray at weirs; rain and snow over the view only with worldRun(world, { particles: { weather: true }})
     because the v2 weather overlay draws falling rain and snow today), then emits, moves and lands everything each tick.
     Degrades: caps x 0.6, x 0.35, x 0.15.
   ============================================================ */
const WORLD_PARTICLE_KINDS = Object.freeze({
  // cap, life [s], drag (1/s), fall (m/s2; < 0 rises), wind share, size [m], grow (m/s), rest on landing [s]
  leaf: Object.freeze({ cap: 90, life: [7, 14], drag: 1.6, fall: 1.3, wind: 0.75, size: [0.04, 0.07], grow: 0, rest: 4 }),
  snow: Object.freeze({ cap: 300, life: [6, 10], drag: 2.4, fall: 2.4, wind: 0.6, size: [0.01, 0.025], grow: 0, rest: 0 }),
  rain: Object.freeze({ cap: 300, life: [1, 2.5], drag: 1.2, fall: 8, wind: 0.3, size: [0.006, 0.01], grow: 0, rest: 0 }),
  spray: Object.freeze({ cap: 120, life: [0.6, 1.4], drag: 0.8, fall: 6, wind: 0.4, size: [0.02, 0.05], grow: 0.05, rest: 0 }),
  smoke: Object.freeze({ cap: 80, life: [4, 8], drag: 1.2, fall: -0.4, wind: 0.55, size: [0.3, 0.6], grow: 0.35, rest: 0 }),
  steam: Object.freeze({ cap: 60, life: [1.5, 3], drag: 1.4, fall: -0.6, wind: 0.5, size: [0.15, 0.3], grow: 0.4, rest: 0 }),
  splash: Object.freeze({ cap: 60, life: [0.4, 0.9], drag: 0.2, fall: 9.81, wind: 0.1, size: [0.015, 0.035], grow: 0, rest: 0 }),
  seed: Object.freeze({ cap: 40, life: [6, 14], drag: 2.8, fall: 0.5, wind: 0.8, size: [0.01, 0.02], grow: 0, rest: 2 }),
  ring: Object.freeze({ cap: 40, life: [1.2, 2.2], drag: 0, fall: 0, wind: 0, size: [0.05, 0.1], grow: 0.6, rest: 0 }),
});
const WORLD_PARTICLE_CAP = 600;
const WORLD_BODY_CAP = 24;
const _wptNum = v => typeof v === 'number' && Number.isFinite(v);
const _WPT_EVERGREEN = /pine|fir|yew|spruce|holly|conifer|cedar|palm|cypress|laurel|leylandii|juniper|ivy/;

function _wptState(world) {
  let S = world._wpt;
  if (!S) {
    S = { live: [], free: [], counts: {}, emitters: [], bodies: [], seq: 0, log: [], logged: new Set(), surf: new Map(), capMul: 1, weather: false, auto: false };
    for (const k of Object.keys(WORLD_PARTICLE_KINDS)) S.counts[k] = 0;
    try { Object.defineProperty(world, '_wpt', { value: S, enumerable: false, configurable: true, writable: true }); } catch (e) { world._wpt = S; }
  }
  return S;
}
function _wptLog(S, kind, why) {
  const k = kind + '|' + why;
  if (S.logged.has(k)) return;
  S.logged.add(k);
  S.log.push({ kind, action: 'refuse', reason: why });
  if (S.log.length > 100) S.log.shift();
}
/** The time context, or a plain one (summer noon, calm-ish, dry) when the world has none. */
function _wptCtx(world) {
  if (world.time) return world.time;
  return { season: 'summer', month: 5, weather: 'clear', snowing: false, wx: { rain: 0 }, wind: { s: 0.5 } };
}
/** Whether a kind may exist now (G6, M3): '' when it may, else the reason. */
function _wptWhyNot(world, kind) {
  const c = _wptCtx(world), s = world.wind && _wptNum(world.wind.s) ? world.wind.s : c.wind && _wptNum(c.wind.s) ? c.wind.s : 0;
  const calm = typeof WORLD_WIND_CALM === 'number' ? WORLD_WIND_CALM : 0.15;
  const raining = c.weather === 'rain' || (c.wx && (c.wx.rain || 0) > 0.05);
  switch (kind) {
    case 'leaf': return c.season !== 'autumn' ? 'falling leaves only in autumn' : s < calm ? 'falling leaves only in wind' : '';
    case 'seed': return !(c.month >= 4 && c.month <= 9) ? 'seeds drift May to October' : s < calm ? 'seeds drift only in wind' : raining ? 'no seed drift in rain' : '';
    case 'snow': return c.snowing ? '' : 'snowflakes only while it snows';
    case 'rain': return raining ? '' : 'raindrops only while it rains';
    default: return WORLD_PARTICLE_KINDS.hasOwnProperty(kind) ? '' : 'unknown particle kind ' + kind;
  }
}
/** The ground (or water) under a point, memoised per metre cell: { y, water }. */
function _wptContact(world, S, x, z) {
  const k = Math.floor(x) * 100003 + Math.floor(z);
  let c = S.surf.get(k);
  if (c) return c;
  const cam = world.cam;
  let y = cam && typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, x, Math.max(0.01, z)) : 0, water = false;
  let s = null;
  if (typeof worldSurfaceAt === 'function') { try { s = worldSurfaceAt(world, x, z); } catch (e) { s = null; } }
  if (s && s.kind === 'water') { water = true; y = _wptNum(s.level) ? s.level : cam && _wptNum(cam.water) ? cam.water : 0; }
  else if (s && s.kind === 'deck' && _wptNum(s.y)) y = s.y;
  if (!_wptNum(y)) y = 0;
  c = { y, water };
  if (S.surf.size > 20000) S.surf.clear();
  S.surf.set(k, c);
  return c;
}
function _wptCap(S, kind) { return Math.max(1, Math.floor(WORLD_PARTICLE_KINDS[kind].cap * S.capMul)); }
/** A particle slot for a kind: a free one, else the oldest of that kind (at its cap) or of all (at the global cap). */
function _wptAlloc(S, kind) {
  const cap = _wptCap(S, kind), gcap = Math.max(1, Math.floor(WORLD_PARTICLE_CAP * S.capMul));
  if (S.counts[kind] >= cap || S.live.length >= gcap) {
    let best = -1, age = -1;
    const same = S.counts[kind] >= cap;
    for (let i = 0; i < S.live.length; i++) { const p = S.live[i]; if ((!same || p.kind === kind) && p.age / p.life > age) { age = p.age / p.life; best = i; } }
    if (best < 0) return null;
    const p = S.live[best];
    S.counts[p.kind]--; S.counts[kind]++;
    p.kind = kind;
    return p;
  }
  const p = S.free.pop() || {};
  p.kind = kind;
  S.live.push(p); S.counts[kind]++;
  return p;
}
function _wptKill(S, i) {
  const p = S.live[i];
  S.counts[p.kind]--;
  S.live[i] = S.live[S.live.length - 1]; S.live.pop();
  if (S.free.length < WORLD_PARTICLE_CAP) S.free.push(p);
}
function _wptSpawn(world, S, em, rnd) {
  const K = WORLD_PARTICLE_KINDS[em.kind], p = _wptAlloc(S, em.kind);
  if (!p) return null;
  let x, y, z;
  if (em.area) {
    const A = em.area, zz = A.z0 * Math.pow(A.z1 / A.z0, rnd()), cam = world.cam;
    const xl = cam && cam.f > 0 ? -cam.x0 * zz / cam.f : A.x0, xr = cam && cam.f > 0 ? (1600 - cam.x0) * zz / cam.f : A.x1;
    x = xl + (xr - xl) * rnd(); z = zz;
    const top = cam && cam.f > 0 ? cam.eye + cam.horizon * zz / cam.f : 12;   // the height at the top edge of the frame at this depth
    y = Math.max(_wptNum(A.y) ? A.y : 6 + 10 * rnd(), top + 0.5 + rnd());
  } else {
    let ax = em.x, ay = em.y, az = em.z;
    if (em.from && typeof em.from === 'object') {
      const T = typeof worldResolve === 'function' ? worldResolve(world, em.from) : em.from;
      ax = T.x; az = T.z; ay = (_wptNum(T.y) ? T.y : 0) + (_wptNum(em.dy) ? em.dy : (_wptNum(em.from.height) ? em.from.height * 0.8 : 1));
    }
    const sp = em.spread, a = rnd() * 6.283185307, r = sp * Math.sqrt(rnd());
    x = ax + Math.cos(a) * r; z = az + Math.sin(a) * r; y = ay + (em.kind === 'leaf' ? (rnd() - 0.5) * sp * 0.6 : 0);
  }
  const lf = _wptNum(em.life) ? em.life : K.life[0] + (K.life[1] - K.life[0]) * rnd();
  p.x = x; p.y = y; p.z = z; p.px = x; p.py = y; p.pz = z;
  const kick = em.kind === 'splash' || em.kind === 'spray' ? 1.6 : em.kind === 'leaf' || em.kind === 'seed' ? 0.3 : 0.1, a2 = rnd() * 6.283185307;
  p.vx = Math.cos(a2) * kick * rnd(); p.vz = Math.sin(a2) * kick * rnd();
  p.vy = _wptNum(em.vy) ? em.vy * (0.7 + 0.6 * rnd()) : em.kind === 'rain' ? -6 : em.kind === 'splash' ? 1.5 + 2 * rnd() : em.kind === 'spray' ? 1 + 1.5 * rnd() : 0;
  p.age = 0; p.life = lf; p.size = K.size[0] + (K.size[1] - K.size[0]) * rnd(); p.rot = rnd() * 6.283185307; p.spin = (rnd() - 0.5) * 6;
  if (K.fall > 0 && K.drag > 0) {   // the ground height is enough here (cheap); the landing itself finds the surface
    const gy = world.cam && typeof sceneGroundHeight === 'function' ? sceneGroundHeight(world.cam, x, Math.max(0.01, z)) : 0, fallT = Math.max(0, y - gy) / (K.fall / K.drag) + 1;
    if (p.life < fallT) p.life = fallT;
  }
  p.alpha = 0;
  p.seed = rnd(); p.rest = false; p.restT = 0; p.water = false; p.em = em.id;
  return p;
}
/** Start an emitter (a running source with o.rate, or a burst of o.n). Refused kinds return null (logged). */
function worldEmit(world, kind, o) {
  if (!world || typeof world !== 'object') return null;
  o = o || {};
  const S = _wptState(world), why = _wptWhyNot(world, kind);
  if (why) { _wptLog(S, kind, why); return null; }
  const at = Array.isArray(o.at) ? o.at : null;
  const em = { id: o.id != null ? String(o.id) : kind + ':' + (S.seq++), kind, x: _wptNum(o.x) ? o.x : at ? at[0] : 0, z: _wptNum(o.z) ? o.z : at ? at[1] : 0,
    y: _wptNum(o.y) ? o.y : 0, dy: o.dy, from: o.from && typeof o.from === 'object' ? o.from : null, spread: _wptNum(o.spread) ? Math.max(0, o.spread) : 0.2,
    rate: _wptNum(o.rate) && o.rate > 0 ? o.rate : 0, vy: _wptNum(o.vy) ? o.vy : _wptNum(o.up) ? o.up : undefined, life: o.life, area: o.area && typeof o.area === 'object' ? o.area : null, acc: 0, active: true,
    windScale: o.windScale === true, auto: !!o.auto };
  if (!_wptNum(o.y) && !em.from && !em.area) em.y = _wptContact(world, S, em.x, em.z).y + (_wptNum(o.dy) ? o.dy : 0);
  if (em.area) { em.area = Object.assign({}, em.area); if (!(em.area.z0 > 0)) em.area.z0 = 2; if (!(em.area.z1 > em.area.z0)) em.area.z1 = Math.max(em.area.z0 + 1, 40); }
  em.stop = () => { em.active = false; };
  const rnd = typeof worldRng === 'function' ? worldRng(world, 'particles', 'em:' + em.id) : Math.random;
  if (!em.rate) {
    const n = Math.max(1, Math.min(200, _wptNum(o.n) ? Math.round(o.n) : 1));
    for (let i = 0; i < n; i++) _wptSpawn(world, S, em, rnd);
    em.active = false;
    return em;
  }
  em.rnd = rnd;
  S.emitters.push(em);
  return em;
}
/** The live particles and bodies (for the renderer, the frame record and the tools). */
function worldParticles(world) {
  const S = world && typeof world === 'object' ? _wptState(world) : null;
  if (!S) return { list: [], bodies: [], counts: {}, total: 0, caps: {}, emitters: 0, log: [] };
  const caps = {};
  for (const k of Object.keys(WORLD_PARTICLE_KINDS)) caps[k] = _wptCap(S, k);
  return { list: S.live, bodies: S.bodies, counts: Object.assign({}, S.counts), total: S.live.length, caps, cap: Math.floor(WORLD_PARTICLE_CAP * S.capMul),
    emitters: S.emitters.filter(e => e.active).length, log: S.log.slice() };
}
/** A cheap ballistic body (Y6). */
function worldBody(world, o) {
  if (!world || typeof world !== 'object') return null;
  o = o || {};
  const S = _wptState(world);
  if (!_wptNum(o.x) || !_wptNum(o.z)) return null;
  if (S.bodies.length >= WORLD_BODY_CAP) S.bodies.shift();   // the oldest goes
  const r = _wptNum(o.r) && o.r > 0 ? o.r : 0.035, g = _wptContact(world, S, o.x, o.z);
  const b = { id: o.id != null ? String(o.id) : 'body:' + (S.seq++), x: o.x, y: _wptNum(o.y) ? o.y : g.y + r, z: o.z, vx: +o.vx || 0, vy: +o.vy || 0, vz: +o.vz || 0, r,
    bounce: _wptNum(o.bounce) ? Math.max(0, Math.min(0.95, o.bounce)) : 0.55, friction: _wptNum(o.friction) ? Math.max(0, o.friction) : 1.2, floats: o.floats !== false,
    life: _wptNum(o.life) && o.life > 0 ? o.life : 30, age: 0, landed: false, wet: false, rest: false, bounces: 0,
    onLand: typeof o.onLand === 'function' ? o.onLand : null, onWater: typeof o.onWater === 'function' ? o.onWater : null, onRest: typeof o.onRest === 'function' ? o.onRest : null };
  b.px = b.x; b.py = b.y; b.pz = b.z;
  S.bodies.push(b);
  return b;
}
function _wptBodyStep(world, S, b, dt, t) {
  b.px = b.x; b.py = b.y; b.pz = b.z;
  b.age += dt;
  const call = (fn) => { if (fn) { try { fn(b); } catch (e) { _wptLog(S, 'body', 'a body callback threw: ' + (e && e.message || e)); } } };
  if (b.rest && !b.wet) return;
  if (b.wet && b.floats) {
    // floating: drift slowly downwind, water drag
    const w = typeof worldWind === 'function' ? worldWind(world, b.x, b.z, t) : { dx: 0, dz: 0, s: 0 }, k = Math.min(1, 1.5 * dt);
    b.vx += (w.dx * w.s * 0.15 - b.vx) * k; b.vz += (w.dz * w.s * 0.15 - b.vz) * k; b.vy = 0;
    b.x += b.vx * dt; b.z += b.vz * dt;
    const c = _wptContact(world, S, b.x, b.z);
    if (!c.water) { b.x = b.px; b.z = b.pz; b.vx = 0; b.vz = 0; }   // at the bank: it stays in the water
    else b.y = c.y + b.r * 0.3;
    return;
  }
  const drag = Math.max(0, 1 - 0.05 * dt);
  b.vx *= drag; b.vz *= drag; b.vy = b.vy * drag - 9.81 * dt;
  b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
  const c = _wptContact(world, S, b.x, b.z);
  if (b.y - b.r > c.y) return;
  if (c.water) {
    if (!b.wet) {
      b.wet = true;
      const sp = Math.hypot(b.vx, b.vy, b.vz);
      worldEmit(world, 'splash', { x: b.x, z: b.z, y: c.y, n: Math.max(3, Math.min(14, Math.round(4 + sp * 1.5))), spread: 0.08 + b.r });
      worldEmit(world, 'ring', { x: b.x, z: b.z, y: c.y, n: 1, spread: 0 });
      call(b.onWater);
    }
    if (!b.floats) { b.dead = true; return; }
    b.y = c.y + b.r * 0.3; b.vy = 0; b.vx *= 0.3; b.vz *= 0.3;
    return;
  }
  b.y = c.y + b.r;
  if (b.vy < 0) {
    if (!b.landed) { b.landed = true; call(b.onLand); }
    if (-b.vy > 0.8) { b.vy = -b.vy * b.bounce; b.bounces++; }
    else b.vy = 0;
  }
  if (b.vy === 0) {
    const k = Math.exp(-b.friction * dt);
    b.vx *= k; b.vz *= k;
    if (Math.hypot(b.vx, b.vz) < 0.05) { b.vx = 0; b.vz = 0; if (!b.rest) { b.rest = true; call(b.onRest); } }
  }
}
function _wptStep(world, S, dt) {
  const t = _wptNum(world.t) ? world.t : 0, hasWind = typeof worldWind === 'function', WMS = typeof WORLD_WIND_MS === 'number' ? WORLD_WIND_MS : 5.6;
  // emitters: gated every tick (no new leaves once the wind drops, no new flakes once the snow stops)
  const gate = {};
  for (const em of S.emitters) {
    if (!em.active) continue;
    if (em.from && (em.from.hidden || em.from.dead)) { em.active = false; continue; }
    if (!(em.kind in gate)) gate[em.kind] = _wptWhyNot(world, em.kind);
    if (gate[em.kind]) { em.acc = 0; continue; }
    let rate = em.rate;
    if (em.windScale) { const s = world.wind && _wptNum(world.wind.s) ? world.wind.s : 0; rate *= Math.min(2, s); }
    em.acc += rate * dt;
    let n = Math.floor(em.acc);
    em.acc -= n;
    if (n > 40) n = 40;
    while (n-- > 0) _wptSpawn(world, S, em, em.rnd);
  }
  if (S.emitters.length > 64) S.emitters = S.emitters.filter(e => e.active);
  // particles
  for (let i = S.live.length - 1; i >= 0; i--) {
    const p = S.live[i], K = WORLD_PARTICLE_KINDS[p.kind];
    p.px = p.x; p.py = p.y; p.pz = p.z;
    p.age += dt;
    if (p.age >= p.life) { _wptKill(S, i); continue; }
    p.alpha = Math.max(0, Math.min(1, p.age / 0.3, (p.life - p.age) / 0.6, p.rest ? p.restT / 0.8 : 1));
    if (K.grow) p.size += K.grow * dt;
    if (p.kind === 'ring') continue;
    if (p.rest) {
      p.restT -= dt;
      if (p.restT <= 0) { _wptKill(S, i); continue; }
      if (p.water && hasWind) { const w = worldWind(world, p.x, p.z, t); p.x += w.dx * w.s * 0.12 * dt; p.z += w.dz * w.s * 0.12 * dt; }
      continue;
    }
    let tvx = 0, tvz = 0;
    if (hasWind && K.wind > 0) { const w = worldWind(world, p.x, p.z, t); tvx = w.dx * w.s * WMS * K.wind; tvz = w.dz * w.s * WMS * K.wind; }
    const k = Math.min(1, K.drag * dt);
    p.vx += (tvx - p.vx) * k; p.vz += (tvz - p.vz) * k;
    p.vy += -K.fall * dt - p.vy * Math.min(1, K.drag * dt);
    if (p.kind === 'leaf' || p.kind === 'seed') { const fl = Math.sin(p.age * 3.1 + p.seed * 6.283); p.vx += fl * 0.6 * dt; p.vz += Math.cos(p.age * 2.3 + p.seed * 4) * 0.3 * dt; p.rot += p.spin * dt; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (!(p.z > 0.05)) { _wptKill(S, i); continue; }
    const c = _wptContact(world, S, p.x, p.z);
    if (p.y > c.y) continue;
    if (p.kind === 'smoke' || p.kind === 'steam') { p.y = c.y; p.vy = Math.max(0, p.vy); continue; }
    if (K.rest > 0) { p.y = c.y; p.rest = true; p.restT = K.rest; p.life = Math.max(p.life, p.age + K.rest); p.water = c.water; p.vx = p.vy = p.vz = 0; continue; }
    if (p.kind === 'rain' && c.water && S.counts.ring < _wptCap(S, 'ring') * 0.5 && p.seed < 0.12) {
      const x = p.x, z = p.z, y = c.y;
      _wptKill(S, i);
      worldEmit(world, 'ring', { x, z, y, n: 1, spread: 0 });
      continue;
    }
    _wptKill(S, i);
  }
  // bodies
  for (let i = S.bodies.length - 1; i >= 0; i--) {
    const b = S.bodies[i];
    _wptBodyStep(world, S, b, dt, t);
    if (b.dead || b.age >= b.life) S.bodies.splice(i, 1);
  }
}
/** Auto emitters from the world (leaves from trees, smoke and steam from their entities, spray at weirs; weather if asked). */
function _wptAuto(world, S) {
  for (const em of S.emitters) if (em.auto) em.active = false;
  S.emitters = S.emitters.filter(e => e.active);
  const c = _wptCtx(world), ents = Array.isArray(world.entities) ? world.entities : [];
  const add = (kind, o) => {
    // auto emitters are created whatever the weather now and gated per tick, so leaves start when the wind rises
    const S2 = S, em = { id: o.id, kind, x: o.x, y: o.y, z: o.z, dy: o.dy, from: o.from || null, spread: o.spread || 0.2, rate: o.rate, vy: o.vy, life: o.life,
      area: o.area || null, acc: 0, active: true, windScale: !!o.windScale, auto: true };
    em.stop = () => { em.active = false; };
    if (em.area) { if (!(em.area.z0 > 0)) em.area.z0 = 2; if (!(em.area.z1 > em.area.z0)) em.area.z1 = 40; }
    if (!_wptNum(em.y) && !em.from && !em.area) em.y = _wptContact(world, S2, em.x, em.z).y + (_wptNum(o.dy) ? o.dy : 0);
    em.rnd = typeof worldRng === 'function' ? worldRng(world, 'particles', 'em:' + em.id) : Math.random;
    S2.emitters.push(em);
  };
  // leaves: up to 12 deciduous trees, nearest first, each dropping a few leaves a second at full wind
  const trees = [];
  for (const e of ents) {
    if (!e || e.cls !== 'tree' || e.hidden || !_wptNum(e.x) || !_wptNum(e.z) || e.z > 120) continue;
    if (_WPT_EVERGREEN.test(String(e.obj || ''))) continue;
    if (typeof worldKb === 'function' && typeof worldKbState === 'function') {
      try {
        const kb = worldKb(e.obj), st = kb ? worldKbState(kb, c, typeof worldEntityKey === 'function' ? worldEntityKey(e) : e.id) : null;
        if (kb && kb.evergreen) continue;
        if (st && st.leaf && st.leaf === 'bare') continue;
      } catch (err) { /* the class rule */ }
    }
    trees.push(e);
  }
  trees.sort((a, b) => a.z - b.z || (String(a.id) < String(b.id) ? -1 : 1));
  for (const e of trees.slice(0, 12)) {
    const h = _wptNum(e.height) ? e.height : 8, key = typeof worldEntityKey === 'function' ? worldEntityKey(e) : String(e.id);
    add('leaf', { id: 'leaf:' + key, from: e, dy: h * 0.65, spread: Math.max(1, h * 0.25), rate: 0.6, windScale: true });
  }
  // smoke and steam from the entities that are them (K4 attaches them to a chimney or a stove)
  for (const e of ents) {
    if (!e || e.hidden) continue;
    const obj = String(e.obj || ''), cls = String(e.cls || ''), key = typeof worldEntityKey === 'function' ? worldEntityKey(e) : String(e.id);
    if (cls === 'smoke' || /(^|[.-])smoke([.-]|$)/.test(obj)) add('smoke', { id: 'smoke:' + key, from: e, dy: 0.2, spread: 0.15, rate: 2.5, vy: 0.4 });
    else if (cls === 'steam' || /(^|[.-])steam([.-]|$)/.test(obj)) add('steam', { id: 'steam:' + key, from: e, dy: 0.1, spread: 0.1, rate: 3, vy: 0.5 });
    else if (cls === 'weir') add('spray', { id: 'spray:' + key, x: e.x, z: e.z, y: _wptNum(e.waterline) ? e.waterline : e.y, spread: Math.max(0.5, (e.size && e.size.w || 4) / 2), rate: 10, vy: 1.5 });
  }
  for (const s of Array.isArray(world.surfaces) ? world.surfaces : []) {
    if (!s || s.kind !== 'weir') continue;
    const pts = s.poly || s.path || [];
    if (!pts.length) continue;
    const x = pts.reduce((a, p) => a + p[0], 0) / pts.length, z = pts.reduce((a, p) => a + p[1], 0) / pts.length;
    const span = Math.max(...pts.map(p => Math.hypot(p[0] - x, p[1] - z)));
    add('spray', { id: 'spray:' + s.id, x, z, spread: Math.max(0.5, Math.min(8, span)), rate: 10, vy: 1.5 });
  }
  if (S.weather) {
    add('snow', { id: 'snow:view', area: { z0: 2, z1: 40 }, rate: 90 });
    add('rain', { id: 'rain:view', area: { z0: 2, z1: 30, y: 9 }, rate: 220 });
  }
  S.auto = true;
}
if (typeof worldSystem === 'function') worldSystem({
  id: 'particles', phase: 'fx', after: ['wind'], components: { read: ['time', 'wind', 'transform'], write: ['particles'] }, rate: 30, budgetMs: 0.5,
  init(world) {
    const S = _wptState(world), o = world.runner && world.runner.o && world.runner.o.particles;
    S.weather = !!(o && o.weather);
    S.surf.clear();
    _wptAuto(world, S);
  },
  update(world, dt) { _wptStep(world, _wptState(world), dt); },
  degrade(level, world) { _wptState(world).capMul = [1, 0.6, 0.35, 0.15][Math.max(0, Math.min(3, level | 0))]; },
});
