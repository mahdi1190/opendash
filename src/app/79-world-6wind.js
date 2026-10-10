/* ============================================================
   WORLD ENGINE v3.1, package `systems` (2 of 3 files): the ONE wind of a scene (WORLD_ENGINE_REQUIREMENTS.md S3, Y5, M3;
   docs/dev/WORLD_ENGINE.md 11.8, 13). PURE classic script: nothing runs at load except constants and the 'wind' system
   registration (worldSystem, 79-world-0sys.js).

   One wind field per scene. Its direction and mean strength come from the time context (worldTimeCtx(...).wind: dir is where
   it blows TO in the camera frame, 0 = away from the camera, 90 = right; s = km/h / 20). Gusts are fronts that TRAVEL across
   the scene along the wind at a speed that grows with the wind, so trees, reeds, grass, water and smoke downwind feel a gust
   after the ones upwind of them. Everything that moves by wind reads this one field, so nothing sways against anything else.

     WORLD_WIND_CALM                s below this is calm air (about 3 km/h): no leaf fall, no seed drift, no sway
     WORLD_WIND_MS                  metres per second of moving air per unit of s (s 1 = 20 km/h = 5.6 m/s)
     worldWindParams(world) -> world.wind = { dir, s, from, kmh, ux, uz, gust: { speed, amp, phases } }   (from world.time)
     worldWind(world, x, z, t) -> { dx, dz, s, g, dir }   the wind at a ground point: (dx, dz) the unit direction it blows
                                    to (within about 8 degrees of the scene's), s the local strength (>= 0; 0 in calm air),
                                    g the gust share (0..1). Pure in (world.wind, x, z, t): the gust pattern at (x, z, t)
                                    equals the one at (x, z) - speed * t * (ux, uz) at time 0 (it travels downwind).
     worldSwayProfile(ent) -> { stiff, maxDeg, freq, h } | null   how an entity sways: from the knowledge base
                                    (worldKb(obj).anim: { stiffness, sway }) when loaded, else by class: trees, boughs and
                                    fronds, reeds, grass and shrubs, hedges, washing. Buildings, walls, benches, rocks, signs,
                                    bridges, vehicles, boats and every mover: null (they never sway: M2; movers animate by
                                    what they do: M1).
     worldSway(ent, wind, t) -> { dir, deg, amp, dx, dz, rot, w, s } | null
                                    wind: a worldWind sample at the entity, or the world (sampled there). The lean is always
                                    DOWNWIND (dir within 30 degrees of the wind, invariant windDir) and oscillates in size only,
                                    by the entity's own natural frequency and phase (from its key: no two sway in step, M4).
                                    deg: the lean angle; amp: the tip's displacement in metres; rot: the screen rotation about
                                    the base (degrees, + = top to the right); w: a signed value in the units of the v2
                                    sceneWind (-1.6..1.6) for the v2 'sway' hooks.
     the 'wind' system (phase fx, 30 Hz, 0.2 ms): keeps world.wind in step with world.time and sets ent.sway on every
     swaying static that is due this tick (worldLodDue). Degrades: 1 far ones every 4th tick, 2 only lod 0, 3 sway frozen.
   Smoke and steam drift downwind through the particles (79-world-6particles.js); water ripples read worldWind (look).
   ============================================================ */
const WORLD_WIND_CALM = 0.15;
const WORLD_WIND_MS = 5.6;
const _WWD_DEG = Math.PI / 180;
const _wwdNum = v => typeof v === 'number' && Number.isFinite(v);
function _wwdHash(s) {
  s = String(s);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}
const _wwdU = (h, k) => (((h >>> (k * 5)) & 1023) / 1023);   // a 0..1 number from bits of a hash

/** The scene wind's parameters from the time context (or a light south-westerly breeze when there is none). */
function worldWindParams(world) {
  if (!world || typeof world !== 'object') return null;
  const c = world.time && world.time.wind ? world.time.wind : null;
  const dir = c && _wwdNum(c.dir) ? c.dir : 45, s = c && _wwdNum(c.s) ? Math.max(0, c.s) : 0.5;
  const prev = world.wind;
  if (prev && prev._dir === dir && prev._s === s && prev._seed === (world.seed | 0)) return prev;
  const h = _wwdHash('gust|' + (world.seed | 0));
  const a = dir * _WWD_DEG;
  const W = { dir, s, from: c && _wwdNum(c.from) ? c.from : null, kmh: c && _wwdNum(c.kmh) ? c.kmh : s * 20, ux: Math.sin(a), uz: Math.cos(a),
    gust: { speed: 2.5 + 3.5 * Math.min(2, s), amp: 0.45 + 0.2 * Math.min(1, s), phases: [_wwdU(h, 0), _wwdU(h, 1), _wwdU(h, 2), _wwdU(h, 3), _wwdU(h, 4), _wwdU(h, 5)] },
    _dir: dir, _s: s, _seed: world.seed | 0 };
  world.wind = W;
  return W;
}
const _WWD_FRONTS = [[38, 17, 0.55], [23, 29, 0.3], [61, 11, 0.25]];   // gust fronts: wavelength along the wind (m), bend scale across it (m), weight
const _WWD_TAU = 6.283185307179586;
const _WWD_DEFAULT = Object.freeze({ dir: 45, s: 0.5, ux: Math.SQRT1_2, uz: Math.SQRT1_2, gust: Object.freeze({ speed: 4.25, amp: 0.55, phases: Object.freeze([0, 0.3, 0.6, 0.2, 0.5, 0.8]) }) });
function _wwdParamsOf(world) { return world && world.wind && _wwdNum(world.wind.ux) ? world.wind : (world && typeof world === 'object' ? worldWindParams(world) : null) || _WWD_DEFAULT; }
/** The terms of the field that depend only on where a point is (constant for a static entity until the wind changes). */
function _wwdPlace(W, x, z, out) {
  const P = W.gust.phases, across = -x * W.uz + z * W.ux;
  out.W = W; out.along = x * W.ux + z * W.uz;
  out.b0 = 0.35 * Math.sin(across / _WWD_FRONTS[0][1] + P[3] * 6.283);
  out.b1 = 0.35 * Math.sin(across / _WWD_FRONTS[1][1] + P[4] * 6.283);
  out.b2 = 0.35 * Math.sin(across / _WWD_FRONTS[2][1] + P[5] * 6.283);
  out.tb = 0.6 * Math.sin(across / 5.1);
  return out;
}
/** The wind at a placed point at time t into out { dx, dz, s, g, dir } (no allocation). */
function _wwdSampleAt(pl, t, out) {
  const W = pl.W, P = W.gust.phases, u = pl.along - W.gust.speed * t;
  let G = 0, p;
  p = Math.sin(_WWD_TAU * (u / 38 + P[0] + pl.b0)); if (p > 0) G += 0.55 * p * p * p;
  p = Math.sin(_WWD_TAU * (u / 23 + P[1] + pl.b1)); if (p > 0) G += 0.3 * p * p * p;
  p = Math.sin(_WWD_TAU * (u / 61 + P[2] + pl.b2)); if (p > 0) G += 0.25 * p * p * p;
  const g = G < 0.8 ? G / 0.8 : 1;
  const turb = 0.5 + 0.5 * Math.sin(_WWD_TAU * (u / 7.3 + P[1]) + pl.tb);
  out.s = W.s <= 0 ? 0 : W.s * (0.72 + 0.14 * turb + W.gust.amp * g);
  out.g = g;
  // a gust veers a little (a few degrees), never across the wind: rotate (ux, uz) by d (|d| < 0.08 rad, a 4th-order rotation)
  const d = (g - 0.35) * 7 * _WWD_DEG, d2 = d * d, sd0 = d * (1 - d2 / 6), cd0 = 1 - d2 / 2 + d2 * d2 / 24, nn = 1 / Math.sqrt(sd0 * sd0 + cd0 * cd0), sd = sd0 * nn, cd = cd0 * nn;
  out.dx = W.ux * cd + W.uz * sd; out.dz = W.uz * cd - W.ux * sd;
  const dir = W.dir + d / _WWD_DEG;
  out.dir = dir >= 360 ? dir - 360 : dir < 0 ? dir + 360 : dir;
  return out;
}
/** The wind at a ground point (x, z) at scene time t (seconds). */
function worldWind(world, x, z, t) {
  const W = _wwdParamsOf(world);
  return _wwdSampleAt(_wwdPlace(W, _wwdNum(x) ? x : 0, _wwdNum(z) ? z : 0, {}), _wwdNum(t) ? t : 0, {});
}

/* ---------- sway (M3) ---------- */
// by class: stiffness (0 limp .. 1 rigid), the largest lean in degrees at s = 1 for a fully limp plant, the frequency factor
const _WWD_CLASS = Object.freeze({
  tree: [0.6, 6, 1], bough: [0.5, 7, 1.2], frond: [0.15, 12, 1.4], reed: [0.2, 14, 1.3], shrub: [0.4, 8, 1.1], cover: [0.35, 9, 1.2], grass: [0.25, 12, 1.4],
  hedge: [0.85, 4, 1], washing: [0.05, 22, 1.6],
});
const _wwdProfMemo = new Map();
function _wwdClassOf(ent) {
  const cls = String(ent.cls || ''), obj = String(ent.obj || '');
  if (/washing|laundry/.test(obj) || cls === 'washing') return 'washing';
  if (/frond/.test(obj) || cls === 'frond') return 'frond';
  if (/bough|branch/.test(obj) || cls === 'bough' || cls === 'branch') return 'bough';
  if (cls === 'tree') return 'tree';
  if (cls === 'reed' || /reed|bulrush|rush|sedge|iris/.test(obj) && (cls === 'shrub' || cls === 'cover' || cls === 'reed')) return 'reed';
  if (/grass|tussock|bracken|fern|heather|flower|meadow/.test(obj) && (cls === 'shrub' || cls === 'cover' || cls === 'grass')) return 'grass';
  if (cls === 'hedge') return 'hedge';
  if (cls === 'shrub') return 'shrub';
  if (cls === 'cover') return 'cover';
  return null;
}
/** How an entity sways in the wind, or null (it never does). */
function worldSwayProfile(ent) {
  if (!ent || typeof ent !== 'object' || ent.static === false) return null;
  const key = String(ent.obj || '') + '|' + String(ent.cls || '');
  const hOf = (d) => (_wwdNum(ent.height) ? ent.height : ent.size && _wwdNum(ent.size.h) ? ent.size.h : d);
  if (_wwdProfMemo.has(key)) { const p = _wwdProfMemo.get(key); return p && Object.assign({}, p, { h: hOf(p.h) }); }
  let kbA = null;
  if (typeof worldKb === 'function' && ent.obj) { try { const k = worldKb(ent.obj); kbA = k && k.anim && typeof k.anim === 'object' ? k.anim : null; } catch (e) { kbA = null; } }
  let prof = null;
  const c = _wwdClassOf(ent), row = c ? _WWD_CLASS[c] : null;
  if (kbA && kbA.sway === false) prof = null;
  else if (kbA && _wwdNum(kbA.stiffness) && kbA.stiffness < 1) {
    const st = Math.max(0, Math.min(1, kbA.stiffness));
    prof = { kind: c || 'kb', stiff: st, maxDeg: _wwdNum(kbA.swayDeg) ? kbA.swayDeg : row ? row[1] : 8, freq: row ? row[2] : 1 };
  } else if (row) prof = { kind: c, stiff: row[0], maxDeg: row[1], freq: row[2] };
  if (prof) prof.h = 1;
  _wwdProfMemo.set(key, prof ? Object.freeze(Object.assign({}, prof)) : null);
  return prof && Object.assign(prof, { h: hOf(1) });
}
const _wwdPhMemo = new WeakMap();
function _wwdPhase(ent) {
  let p = _wwdPhMemo.get(ent);
  if (!p) {
    const k = typeof worldEntityKey === 'function' ? worldEntityKey(ent) : String(ent.id != null ? ent.id : (ent.obj || '') + '@' + ent.x + ',' + ent.z);
    const h = _wwdHash('sway|' + k);
    p = { ph: _wwdU(h, 0) * _WWD_TAU, fj: 0.85 + 0.3 * _wwdU(h, 1) };
    _wwdPhMemo.set(ent, p);
  }
  return p;
}
/** An entity's sway constants (memoised per entity; renewed when its object, class or height changes). */
const _wwdKMemo = new WeakMap();
function _wwdConst(ent) {
  let c = _wwdKMemo.get(ent);
  if (c && c.obj === ent.obj && c.cls === ent.cls && c.hh === ent.height && c.st === ent.static) return c;
  const prof = worldSwayProfile(ent);
  c = { obj: ent.obj, cls: ent.cls, hh: ent.height, st: ent.static, prof, pl: { W: null } };
  if (prof) {
    const h = Math.max(0.1, prof.h), { ph, fj } = _wwdPhase(ent);
    c.h = h; c.ph = ph;
    c.w = _WWD_TAU * Math.max(0.12, Math.min(2.2, 1.1 / Math.sqrt(Math.max(0.3, h)))) * prof.freq * fj;
    c.k = prof.maxDeg * (1 - prof.stiff) * (prof.kind === 'tree' || prof.kind === 'kb' ? 1 / Math.sqrt(Math.max(1, h / 4)) : 1);
  }
  _wwdKMemo.set(ent, c);
  return c;
}
/** The sway from an entity's constants and the wind at it, into out (no allocation). */
function _wwdSwayInto(c, w, t, out) {
  const sx = w.dx, cz = w.dz;
  if (!(w.s > 0)) {
    out.dir = _wwdNum(w.dir) ? w.dir : ((Math.atan2(sx, cz) / _WWD_DEG) % 360 + 360) % 360;
    out.deg = 0; out.amp = 0; out.dx = sx; out.dz = cz; out.rot = 0; out.w = 0; out.s = 0;
    return out;
  }
  const wt = c.w * t + c.ph;
  const osc = 1 + 0.28 * Math.sin(wt) + 0.08 * Math.sin(2.3 * wt + c.ph);   // 0.64 .. 1.36: the lean grows and eases, never reverses
  const deg = Math.min(35, c.k * (w.s < 2.2 ? w.s : 2.2) * osc);
  const lat = 0.12 * Math.sin(1.7 * wt + 2 * c.ph), n = 1 / Math.sqrt(1 + lat * lat);   // a little flutter across the wind (7 degrees at most)
  const dx = (sx + cz * lat) * n, dz = (cz - sx * lat) * n;
  let dir = (_wwdNum(w.dir) ? w.dir : Math.atan2(sx, cz) / _WWD_DEG) + lat * (1 - lat * lat / 3 + lat * lat * lat * lat / 5) / _WWD_DEG;   // atan, |lat| <= 0.12
  dir = dir >= 360 ? dir - 360 : dir < 0 ? dir + 360 : dir;
  out.dir = dir; out.deg = deg; out.amp = c.h * Math.sin(deg * _WWD_DEG); out.dx = dx; out.dz = dz; out.rot = deg * dx;
  out.w = (w.s * osc < 1.6 ? w.s * osc : 1.6) * dx; out.s = w.s;
  return out;
}
/** The sway of an entity at scene time t in the wind (a sample at the entity, or the world to sample there). */
function worldSway(ent, wind, t) {
  if (!ent || typeof ent !== 'object') return null;
  const c = _wwdConst(ent);
  if (!c.prof) return null;
  t = _wwdNum(t) ? t : 0;
  let w = wind;
  if (!(w && _wwdNum(w.dx) && _wwdNum(w.dz) && _wwdNum(w.s))) w = worldWind(wind && typeof wind === 'object' ? wind : null, ent.x, ent.z, t);
  return _wwdSwayInto(c, w, t, {});
}

/* ---------- the 'wind' system ---------- */
function _wwdState(world) {
  let S = world._wwd;
  if (!S) { S = { list: [], src: null, n: -1, scratch: {} }; try { Object.defineProperty(world, '_wwd', { value: S, enumerable: false, configurable: true, writable: true }); } catch (e) { world._wwd = S; } }
  return S;
}
function _wwdCollect(world) {
  const S = _wwdState(world), ents = Array.isArray(world.entities) ? world.entities : [];
  if (S.src === ents && S.n === ents.length) return S.list;
  S.src = ents; S.n = ents.length; S.list = [];
  for (const e of ents) if (e && typeof e === 'object' && _wwdConst(e).prof) S.list.push(e);
  return S.list;
}
/** The wind system's tick: world.wind in step with the time context; ent.sway (updated in place) on the swaying statics due now. */
function _wwdTick(world) {
  const W = worldWindParams(world), S = _wwdState(world), list = _wwdCollect(world), t = _wwdNum(world.t) ? world.t : 0, tick = world.tick | 0;
  const level = typeof worldSystemLevel === 'function' ? worldSystemLevel(world, 'wind') : 0;
  if (level >= 3 && tick % 8 !== 0) return 0;
  const due = typeof worldLodDue === 'function' ? worldLodDue : null, w = S.scratch;
  let n = 0;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (e.hidden) { e.sway = null; continue; }
    const had = !!e.sway, lod = e.lod | 0;
    if (had) {
      if (due && !due(e, tick)) continue;
      if (level >= 2 && lod > 0) continue;
      if (level >= 1 && lod > 0 && tick % 4 !== 0) continue;
    }
    const c = _wwdConst(e);
    if (c.pl.W !== W || c.pl.x !== e.x || c.pl.z !== e.z) { _wwdPlace(W, e.x, e.z, c.pl); c.pl.x = e.x; c.pl.z = e.z; }
    e.sway = _wwdSwayInto(c, _wwdSampleAt(c.pl, t, w), t, had ? e.sway : {});
    n++;
  }
  return n;
}
if (typeof worldSystem === 'function') worldSystem({
  id: 'wind', phase: 'fx', components: { read: ['time', 'transform', 'desc', 'render'], write: ['wind', 'sway'] }, rate: 30, budgetMs: 0.2,
  init(world) { worldWindParams(world); _wwdTick(world); },
  update(world) { _wwdTick(world); },
  onEvent: { weather(world) { worldWindParams(world); } },
});
