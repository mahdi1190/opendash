/* ============================================================
   WORLD ENGINE v3.1, package `appearance`: views and the animation state (docs/dev/WORLD_ENGINE.md 13, 14.3; requirements
   Q4, M1, M2, M4, M5, M7, A6). Private names: _wan. PURE classic script: nothing runs at load except the worldSystem
   registration of 'anim' (guarded); every other package is reached through typeof guards.

   VIEWS (Q4)
     worldViewOf(ent, cam, o) -> { view, mirror, obj, variant, rel, fs, want, missing, persp, end, roof, s } | null
       The drawn view of a static or a mover from the CAMERA'S angle to it: rel = its facing (movers: their velocity; a still
       mover: anim.face, its heading or facing) against the line of sight, folded to the 5 views (back 0, q-back 45, side 90,
       q-front 135, front 180) + the mirror (the side and three-quarter views face right; mirrored when it faces left), with
       15 degrees of hysteresis about the previous view (ent.view or o.prev) and on the mirror near the sight line, so nothing
       flickers. Only views the object has are drawn (its own `views`, else SCENE_OBJ_VIEWS); a missing view falls back to the
       nearest one it has. LONG HULLS (boats, trains, trams, buses: 6 m or longer and 2.5 times longer than tall) are drawn in
       true perspective (persp: true; the extruder's worldExtrudeHull draws the side art in depth slices plus the end face the
       eye sees and the roof when the eye is above it), so a boat seen end-on is drawn end-on and a boat seen at an angle
       recedes: never a flat side slab. s: the sprite scale that keeps the real size at its depth (f / z x real h / drawn h).
       Pure: it never writes ent (o.write: true stores view and mirror on ent). It replaces the host's worldHostViewOf.

   ANIMATION STATE (13; M1, M2, M4, M5, M7, A6)
     ent.anim = { state, clip, rate, period, phase, pose, t, cyc, k, stride, step, speed, from, blend, dur, face, obj, view, mirror,
                  sec, mult }
       state  what the entity is DOING, never a timer: move | idle | sit | lie | stopped | moored | none (WORLD_ANIM_STATES)
       clip   walk, run, trot, pedal, swim, fly, drive, cruise (move); idle, look, chat, sniff, graze, dabble, dive, perch,
              strike, wait (idle); sit, lie, stopped, moored; null (statics)
       rate   cycles a second: the ACTUAL ground speed (its velocity, never the brain's target) / stride when moving (the
              feet keep pace with the ground: no sliding, A6; a slow shuffle shortens the step instead of slowing the cycle),
              the idle micro-motion when still, 0 for sit, lie, stopped and statics (M2). Updated for every agent every tick,
              off screen too, so what it does never lags what it is doing
       period seconds a cycle (1 / rate); phase the entity's own phase offset (M4: live agents of one class take successive
              slots of a two-step low-discrepancy sequence in the order they first appear, golden-ratio phases and a period
              step that separates the slots whose phases come close, so no two that live together bob or step in unison; a
              slot never changes once given); cyc the current cycle position; t the anim clock (the runner's world.t)
       stride metres a cycle (two steps); step metres a step; k leg amplitude 0..1 (eased); speed m/s
       from, blend, dur  the transition being eased (M7: walk to stop, stand to sit, swim to take-off: 0.25 .. 0.8 s, never
              instant), face the facing the view holds meanwhile (a sitter faces the way its bench faces); obj the pose's
              object when the library has one (a bench sitter, a bird in flight)
       sec    secondary motion (M5; cheap, nearest first, dropped first under budget): lead (the line from the walker's hand
              to the dog's collar with its sag and swing), coat (lag, degrees), tail and ears (dogs, from the gait), rock (boats
              and floaters rocking in passing wakes), part (reeds parting as something walks or swims through them)
     Statics never animate (M2): state 'none', rate 0; they sway only by cause (sway: true for plants; the wind system moves
     them), a moored boat only bobs slightly ('moored'), reeds part only when something passes.

   API
     WORLD_ANIM_STATES, WORLD_ANIM_TRANS (transition durations)
     worldViewOf(ent, cam, o)              above
     worldAnimInit(world)                  statics' anim records and views (idempotent)
     worldAnimStep(world, dt, o)           one tick: every agent's anim from what it is doing, secondary motion, views
     worldAnimWake(world, e)               a passing wake ({ x, z, amp, id, t }): nearby floaters and moored boats rock
     worldAnimOf(ent, world)               the anim record (the live one when the system runs, else a pure snapshot)
     worldAnimHooks(ent, t, o)             the v2 AnimHooks (sceneAnimPose kinds) the renderer draws the entity with now: the
                                           object's own hooks (else sceneBehave.hooks for its class) with period, phase and
                                           amplitude from the anim state; legs still when seated; statics keep only causes
     the 'anim' system                     worldSystem({ id: 'anim', phase: 'anim', rate: 30, budgetMs: 0.5, ... }) when 0sys
                                           is loaded; without it the tools call worldAnimStep directly
   ============================================================ */
const WORLD_ANIM_STATES = Object.freeze(['move', 'idle', 'sit', 'lie', 'stopped', 'moored', 'none']);
/** Transition durations in seconds (M7), by clip pair first, then state pair; never under 0.25 s. */
const WORLD_ANIM_TRANS = Object.freeze({
  'move>idle': 0.35, 'idle>move': 0.3, 'move>sit': 0.6, 'idle>sit': 0.6, 'sit>idle': 0.5, 'sit>move': 0.6, 'idle>lie': 0.8, 'lie>idle': 0.7,
  'move>stopped': 0.4, 'stopped>move': 0.3, 'move>moored': 0.8, 'moored>move': 0.8,
  'swim>fly': 0.5, 'fly>swim': 0.6, 'perch>fly': 0.3, 'fly>perch': 0.45, 'walk>fly': 0.4, 'fly>walk': 0.5, 'walk>run': 0.3, 'run>walk': 0.35,
  default: 0.3,
});
const _WAN_DEG = Math.PI / 180;
const _WAN_HYST = 15;
const _WAN_VIEW_AT = Object.freeze({ back: 0, 'q-back': 45, side: 90, 'q-front': 135, front: 180 });
const _WAN_VIEWS = Object.freeze(['back', 'q-back', 'side', 'q-front', 'front']);
const _WAN_MOVE_IN = 0.08, _WAN_MOVE_OUT = 0.05;
/** sceneAnimPose's paddle turns by deg * sin(2 pi phase + 1.3): this phase makes that the full deg (a held rocking angle). */
const _WAN_ROCK_PH = (Math.PI / 2 - 1.3) / (2 * Math.PI);   // m/s: start moving above, stop below (hysteresis: no flicker)
// the low-discrepancy steps of the per-class variety sequence (M4). Phase: the golden ratio, so no two members fewer than 21
// slots apart come within 0.025 of a cycle, whatever their speeds make their periods. Period: a step chosen so that the
// members whose phases do come close (21, 34, 55, 68, 76, 89, 110, 123, 144 slots apart) differ by >= 16 % of the period
// range (>= 2 % of the period): within 150 slots of each other no two members are ever in step.
const _WAN_R2A = 0.6180339887498949, _WAN_R2B = 0.769695;
const _wanNum = v => typeof v === 'number' && Number.isFinite(v);
const _wanClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _wanFrac = v => v - Math.floor(v);
const _wanR = (v, n) => { const k = Math.pow(10, n == null ? 4 : n); return Math.round(v * k) / k; };
const _wan180 = d => ((((d % 360) + 540) % 360) - 180);
const _wanEase = u => { const x = _wanClamp(u, 0, 1); return x * x * (3 - 2 * x); };
function _wanHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15; return h >>> 0; }
const _wanU = s => (_wanHash(s) % 1000003) / 1000003;

/* ---------- views (Q4) ---------- */
function _wanInfo(obj) { return typeof worldObjectInfo === 'function' && typeof obj === 'string' ? worldObjectInfo(obj) : null; }
const _wanViewMemo = new Map();
/** The views an object has: { side: obj, back?, 'q-back'?, 'q-front'?, front?, v (a view variant) }. */
function _wanViews(obj) {
  if (_wanViewMemo.has(obj)) return _wanViewMemo.get(obj);
  const has = { side: obj };
  let vw = null;
  if (typeof sceneObjViews === 'function') { try { vw = sceneObjViews(obj); } catch (e) { vw = null; } }
  else if (typeof sceneObj === 'function') { const d = sceneObj(obj); vw = (d && d.views) || null; }
  if (vw && !Array.isArray(vw)) {
    const ok = o => typeof o === 'string' && (typeof sceneObj !== 'function' || !!sceneObj(o));
    const get = n => (n === 'back' ? (vw.back || vw.rear) : n === 'q-front' ? (vw['q-front'] || vw.q) : vw[n]);
    for (const n of _WAN_VIEWS) if (n !== 'side') { const o = get(n); if (ok(o)) has[n] = o; }
    if (ok(vw.side)) has.side = vw.side;
    if (Number.isInteger(vw.v)) has.v = vw.v;
  }
  _wanViewMemo.set(obj, has);
  return has;
}
/** The ideal view of |rel| (0 away .. 180 toward) with hysteresis about the previous view. */
function _wanWant(abs, prev) {
  if (prev && _WAN_VIEW_AT[prev] != null && Math.abs(abs - _WAN_VIEW_AT[prev]) <= 22.5 + _WAN_HYST) return prev;
  return abs < 22.5 ? 'back' : abs < 67.5 ? 'q-back' : abs <= 112.5 ? 'side' : abs <= 157.5 ? 'q-front' : 'front';
}
/** Is this object a long hull drawn in perspective? */
function _wanHull(info, obj) {
  if (!info || !info.size) return false;
  const L = info.size.w, h = info.size.h, cls = info.cls;
  const hullish = cls === 'boat' || cls === 'train' || cls === 'tram' || (cls === 'vehicle' && L >= 8) || (!cls && /^boat\./.test(String(obj || '')));
  return hullish && L >= 6 && L / Math.max(0.1, h) >= 2.5;
}
/** The facing (degrees, camera frame) an entity shows now: velocity, else anim.face, else heading (radians, life), else facing. */
function _wanFacing(ent) {
  const vx = _wanNum(ent.vx) ? ent.vx : 0, vz = _wanNum(ent.vz) ? ent.vz : 0, sp = Math.hypot(vx, vz);
  if (sp > _WAN_MOVE_OUT) return { deg: Math.atan2(vx, vz) / _WAN_DEG, moving: true };
  if (ent.anim && _wanNum(ent.anim.face)) return { deg: ent.anim.face, moving: false };
  if (_wanNum(ent.facing)) return { deg: ent.facing, moving: false };
  if (_wanNum(ent.heading)) return { deg: ent.heading / _WAN_DEG, moving: false };
  return { deg: 90, moving: false };
}
/**
 * The drawn view of an entity from the camera's angle (see the header). cam: a v2 camera (for s; optional).
 * o: { prev, prevMirror, write, keep }.
 */
function worldViewOf(ent, cam, o) {
  o = o || {};
  if (!ent || !_wanNum(ent.x) || !_wanNum(ent.z)) return null;
  const obj = ent.obj;
  const fc = _wanFacing(ent), bearing = Math.atan2(ent.x, Math.max(1e-3, ent.z)) / _WAN_DEG;
  const rel = _wan180(fc.deg - bearing), abs = Math.abs(rel);
  const prev = o.prev !== undefined ? o.prev : (ent.anim && ent.anim.view) || ent.view || null;
  const prevMirror = o.prevMirror !== undefined ? o.prevMirror : ent.anim && typeof ent.anim.mirror === 'boolean' ? ent.anim.mirror : ent.mirror;
  const want = _wanWant(abs, prev), has = obj ? _wanViews(obj) : { side: obj };
  let view = has[want] ? want : null;
  if (!view) {
    let best = 'side', bd = Math.abs(abs - 90);
    for (const n of Object.keys(has)) { if (_WAN_VIEW_AT[n] == null) continue; const d = Math.abs(abs - _WAN_VIEW_AT[n]); if (d < bd - 1e-6) { best = n; bd = d; } }
    if (prev && has[prev] && prev !== best && Math.abs(abs - _WAN_VIEW_AT[prev]) - bd < 2 * _WAN_HYST) best = prev;
    view = best;
  }
  let mirror = rel < 0;
  if (typeof prevMirror === 'boolean' && Math.abs(Math.sin(rel * _WAN_DEG)) < Math.sin(_WAN_HYST * _WAN_DEG)) mirror = prevMirror;
  if (view === 'front' || view === 'back') mirror = false;
  const info = _wanInfo(obj), persp = _wanHull(info, obj);
  const vObj = has[view] || obj;
  const variant = view !== 'side' && Number.isInteger(has.v) ? has.v : (ent.variant == null ? null : ent.variant);
  const out = { view, mirror, obj: vObj, variant, rel: _wanR(rel, 2), fs: _wanR(Math.abs(Math.sin(rel * _WAN_DEG)), 3), want, missing: view !== want, persp, end: null, roof: false, s: null };
  if (persp) {
    // the end the eye sees (its outward normal faces the eye) and whether the roof shows
    const f = fc.deg * _WAN_DEG, ax = Math.sin(f), az = Math.cos(f), L = info.size.w;
    const bowX = ent.x + ax * L / 2, bowZ = ent.z + az * L / 2, sternX = ent.x - ax * L / 2, sternZ = ent.z - az * L / 2;
    if (-(ax * bowX + az * bowZ) > 0) out.end = 'bow'; else if (ax * sternX + az * sternZ > 0) out.end = 'stern';
    const eye = cam && _wanNum(cam.eye) ? cam.eye : 1.65, top = (_wanNum(ent.y) ? ent.y : 0) + (_wanNum(ent.height) ? ent.height : info.size.h);
    out.roof = eye > top;
  }
  if (cam && _wanNum(cam.f) && ent.z > 0.05 && typeof sceneObj === 'function') {
    const def = sceneObj(vObj), h = _wanNum(ent.height) && ent.height > 0 ? ent.height : _wanNum(ent.h) && ent.h > 0 ? ent.h : info && info.size ? info.size.h : null;
    if (def && Array.isArray(def.size) && def.size[1] > 0 && h) out.s = _wanR((cam.f / ent.z) * h / def.size[1], 5);
  }
  if (o.write && !o.keep) { ent.view = view; ent.mirror = mirror; }
  return out;
}

/* ---------- classes, strides, rates ---------- */
const _WAN_PERSON = new Set(['person', 'stroll', 'brisk', 'jogger', 'elderly', 'child', 'dog-walker', 'boater', 'visit', 'walker', 'crowd', 'chat']);
/** What kind of body an entity has: person, dog, grazer, walkbird, swimmer, flyer, cyclist, vehicle, rail, boat, plant, other. */
function _wanKind(e) {
  const cls = String(e.cls || ''), obj = String(e.obj || '');
  if (_WAN_PERSON.has(cls) || /^person\.(?!cyclist)/.test(obj) && cls !== 'cyclist') return 'person';
  if (cls === 'cyclist' || /^person\.cyclist/.test(obj)) return 'cyclist';
  if (cls === 'dog' || /^animal\.dog/.test(obj)) return 'dog';
  if (cls === 'boat' || /^boat\./.test(obj)) return 'boat';
  if (cls === 'train' || cls === 'tram' || /^rail\.|tram/.test(obj)) return 'rail';
  if (cls === 'vehicle' || cls === 'car' || cls === 'bus' || /^vehicle\./.test(obj)) return 'vehicle';
  if (['cow', 'sheep', 'grazer', 'deer', 'pony', 'cattle', 'animal'].includes(cls) || /^animal\.(cow|cattle|sheep|pony|deer|horse|donkey)/.test(obj)) return 'grazer';
  if (['duck', 'coot', 'swan', 'diver', 'grebe', 'goose', 'moorhen'].includes(cls) || /mallard|swan|coot|moorhen|grebe|goosander|duck/.test(obj)) return 'swimmer';
  if (['gull', 'kingfisher', 'bird-air', 'air', 'bird'].includes(cls) || /gull|kingfisher|flight/.test(obj)) return 'flyer';
  if (['heron', 'pigeon'].includes(cls) || /heron|egret|pigeon/.test(obj)) return 'walkbird';
  if (['tree', 'shrub', 'reed', 'hedge', 'cover', 'grass', 'flower', 'bough', 'branch', 'frond', 'plant'].includes(cls) || /^(tree|plant|water\.lily)\./.test(obj)) return 'plant';
  return 'other';
}
/** A body's height in metres. */
function _wanH(e) {
  if (_wanNum(e.h) && e.h > 0) return e.h;
  if (_wanNum(e.hStand) && e.hStand > 0) return e.state === 'sit' && _wanNum(e.hSit) && e.hSit > 0 ? e.hSit : e.hStand;   // life's size per agent (K8)
  if (_wanNum(e.height) && e.height > 0) return e.height;
  const info = _wanInfo(e.obj);
  return info && info.size ? info.size.h : 1.7;
}
/** The knowledge base's stride (metres a cycle at the reference speed) when it has one. */
function _wanKbStride(obj) {
  if (typeof worldKb !== 'function') return null;
  try { const kb = worldKb(obj); const s = kb && kb.anim ? kb.anim.stride : null; return _wanNum(s) && s > 0 ? s : null; } catch (e) { return null; }
}
/** One step (metres) for a body kind at a speed; the gait lengthens the step with speed (sceneBehave's stepM at its speedM). */
function _wanStep(kind, h, speed, kbStride) {
  let base;
  if (kind === 'dog') base = h * _wanClamp(0.5 + 0.2 * speed, 0.3, 1.2);
  else if (kind === 'grazer') base = h * _wanClamp(0.35 + 0.1 * speed, 0.25, 0.9);
  else if (kind === 'walkbird') base = h * 0.33;
  else base = h * _wanClamp(0.26 + 0.11 * speed, 0.22, 0.75);
  if (kbStride && kind === 'person') base *= (kbStride / 2) / (h * (0.26 + 0.11 * 1.3));
  return base;
}
const _WAN_IDLE_PERIOD = Object.freeze({ person: 4.2, dog: 2.6, grazer: 5, walkbird: 6, swimmer: 2.8, flyer: 2.6, cyclist: 4.2, vehicle: 0, rail: 0, boat: 5.2, other: 4 });
/** The wingbeat rate (Hz) of a flyer of height h. */
const _wanWing = h => _wanClamp(3.6 / Math.sqrt(Math.max(0.05, h) / 0.3), 1.6, 5);

/* ---------- per-entity variety (M4) ---------- */
/** { u, v } in [0, 1): u the phase, v the period / stride multiplier; a low-discrepancy point per population member. */
function _wanVariety(world, id) {
  const s = String(id == null ? 'x' : id), m = /^(.*?)(\d+)$/.exec(s), prefix = m ? m[1] : s, ord = m ? parseInt(m[2], 10) : 0;
  let j1 = null, j2 = null;
  if (typeof worldRng === 'function' && world) {
    // a fresh stream from its start: the same offsets for every member of the population (the runtime's streams continue otherwise)
    try { const r = worldRng(world, 'anim', prefix, { fresh: true }); const next = typeof r === 'function' ? r : r && typeof r.next === 'function' ? () => r.next() : null; if (next) { j1 = next(); j2 = next(); } } catch (e) { j1 = null; }
  }
  if (!_wanNum(j1) || !_wanNum(j2)) { const seed = world && _wanNum(world.seed) ? world.seed : 0; j1 = _wanU(seed + '|anim|' + prefix); j2 = _wanU(seed + '|anim2|' + prefix); }
  if (!m) { const k = _wanHash(s); return { u: _wanFrac(j1 + (k % 9973) / 9973), v: _wanFrac(j2 + (k % 7919) / 7919) }; }
  return { u: _wanFrac(j1 + ord * _WAN_R2A), v: _wanFrac(j2 + ord * _WAN_R2B) };
}

/* ---------- what an entity is doing -> the target state ---------- */
/** The pose object for a pose when the library has one (a bench sitter, a bird in flight). */
function _wanPoseObj(obj, kind, pose, onBench) {
  if (typeof sceneObj !== 'function' || !obj) return null;
  const has = id => (sceneObj(id) ? id : null);
  if (pose === 'sit' && kind === 'person') return has(obj + '-sit') || has(obj + '-sitting') || (onBench ? has('person.bench-sitter') : has('person.picnicker') || has('person.bench-sitter'));
  if (pose === 'fly' && kind !== 'flyer') {
    const own = has(obj + '-flight') || has(obj + '-fly');
    if (own) return own;
    if (/gull/.test(obj)) return has('bird.herring-gull-flight');
    if (/heron|egret/.test(obj)) return has('bird.egret-flight');
    if (/goose|swan|mallard|duck|teal/.test(obj)) return has('bird.goose-flight');
    if (/kingfisher/.test(obj)) return has('bird.kingfisher-flight');
    return has('bird.small-flight');
  }
  return null;
}
function _wanTarget(e, prevState) {
  // the velocity life SHOWS (svx: low-passed over 0.2 s, so a one-tick spike never flips a walk cycle), else the real one
  const kind = _wanKind(e), vx = _wanNum(e.svx) ? e.svx : _wanNum(e.vx) ? e.vx : 0, vz = _wanNum(e.svz) ? e.svz : _wanNum(e.vz) ? e.vz : 0;
  // the ACTUAL ground speed (the velocity), never the speed the brain is aiming for: the feet must match the ground (A6)
  const speed = _wanNum(e.svx) || _wanNum(e.vx) || _wanNum(e.vz) ? Math.hypot(vx, vz) : _wanNum(e.speed) ? Math.abs(e.speed) : _wanNum(e.spd) ? Math.abs(e.spd) : 0;
  const st = String(e.state || ''), clip0 = String(e.clip || '');
  const wasMoving = prevState === 'move';
  const moving = speed >= (wasMoving ? _WAN_MOVE_OUT : _WAN_MOVE_IN) || (speed >= _WAN_MOVE_OUT && prevState == null);
  const air = e.layer === 'air' || st === 'fly' || clip0 === 'fly';
  if (st === 'sit' || clip0 === 'sit') return { state: 'sit', clip: 'sit', pose: 'sit', kind, speed: 0 };
  if (st === 'lie' || clip0 === 'lie') return { state: 'lie', clip: 'lie', pose: 'lie', kind, speed: 0 };
  if (kind === 'vehicle' || kind === 'rail') return moving ? { state: 'move', clip: 'drive', pose: 'drive', kind, speed } : { state: 'stopped', clip: 'stopped', pose: 'drive', kind, speed: 0, idling: st === 'wait' || st === 'board' || st === 'stop' };
  if (kind === 'boat') return moving ? { state: 'move', clip: 'cruise', pose: 'float', kind, speed } : { state: e.static === false ? 'stopped' : 'moored', clip: e.static === false ? 'stopped' : 'moored', pose: 'float', kind, speed: 0 };
  if (kind === 'cyclist') return moving ? { state: 'move', clip: 'pedal', pose: 'ride', kind, speed } : { state: 'idle', clip: 'idle', pose: 'ride', kind, speed: 0 };
  if (air && (kind === 'flyer' || kind === 'swimmer' || kind === 'walkbird')) return moving || st === 'fly' ? { state: 'move', clip: 'fly', pose: 'fly', kind, speed } : { state: 'idle', clip: 'perch', pose: 'perch', kind, speed: 0 };
  if (kind === 'flyer') return st === 'perch' || clip0 === 'perch' || !moving ? { state: 'idle', clip: st === 'dive' ? 'dive' : 'perch', pose: 'perch', kind, speed: 0 } : { state: 'move', clip: 'fly', pose: 'fly', kind, speed };
  if (moving) {
    let clip = 'walk';
    if (kind === 'person') clip = speed > 2.2 ? 'run' : 'walk';
    else if (kind === 'dog') clip = speed > 2.6 ? 'run' : 'trot';
    else if (kind === 'swimmer') clip = 'swim';
    else if (kind === 'walkbird') clip = 'walk';
    return { state: 'move', clip, pose: kind === 'swimmer' ? 'swim' : 'stand', kind, speed };
  }
  const idleClip = { look: 'look', chat: 'chat', graze: 'graze', peck: 'graze', dabble: 'dabble', dive: 'dive', sniff: 'sniff', strike: 'strike', wait: 'wait', stalk: 'idle' };
  const clip = idleClip[clip0] || idleClip[st] || 'idle';
  return { state: 'idle', clip, pose: kind === 'swimmer' ? 'swim' : 'stand', kind, speed: 0 };
}
function _wanTransDur(fromState, fromClip, toState, toClip) {
  const T = WORLD_ANIM_TRANS;
  const d = T[fromClip + '>' + toClip] != null ? T[fromClip + '>' + toClip] : T[fromState + '>' + toState] != null ? T[fromState + '>' + toState] : T.default;
  return Math.max(0.25, d);
}

/* ---------- the record ---------- */
function _wanStatic(e) {
  const kind = _wanKind(e);
  if (kind === 'boat' && /^water/.test(String(e.attach || 'water'))) {
    const vr = _wanVariety(null, e.id != null ? e.id : e.obj + '@' + e.x + ',' + e.z), period = _WAN_IDLE_PERIOD.boat * (1 + 0.14 * (vr.v - 0.5));
    return { state: 'moored', clip: 'moored', rate: _wanR(1 / period), period: _wanR(period), phase: _wanR(vr.u), pose: 'float', t: 0, cyc: vr.u, k: 0.35, stride: 0, step: 0, speed: 0,
      from: null, blend: 1, dur: 0, face: null, obj: null, sec: {}, mult: 1 + 0.14 * (vr.v - 0.5), static: true, oid: e.obj };
  }
  return { state: 'none', clip: null, rate: 0, period: 0, phase: 0, pose: null, t: 0, cyc: 0, k: 0, stride: 0, step: 0, speed: 0, from: null, blend: 1, dur: 0,
    face: null, obj: null, sec: {}, mult: 1, static: true, sway: kind === 'plant' || /washing|smoke|steam/.test(String(e.obj || '')), oid: e.obj };
}
/** The rates of a target for a body: { rate, period, stride, step, k, legPeriod, paddle } (M1, A6). */
function _wanRates(e, tg, vr, mult) {
  const h = _wanH(e), kind = tg.kind, sp = tg.speed;
  const out = { rate: 0, period: 0, stride: 0, step: 0, k: 0, legPeriod: 0, paddle: 0 };
  if (tg.state === 'move') {
    if (tg.clip === 'walk' || tg.clip === 'run' || tg.clip === 'trot') {
      let step = _wanStep(kind, h, sp, _wanKbStride(e.obj)) * (1 + 0.12 * (vr.v - 0.5));
      let k = 1;
      // a slow shuffle shortens the step instead of slowing the cycle past 1.6 s (the feet still keep pace)
      const pMax = kind === 'walkbird' ? 4 : 1.6;
      if (2 * step / Math.max(1e-3, sp) > pMax) { const s2 = Math.max(0.02, sp * pMax / 2); k = _wanClamp(s2 / step, 0.12, 1); step = s2; }
      out.step = step; out.stride = 2 * step; out.k = k;
    } else if (tg.clip === 'swim') { out.stride = 0.7 * h * (1 + 0.12 * (vr.v - 0.5)); out.k = 1; }
    else if (tg.clip === 'fly') { const wr = _wanWing(h) * mult; out.stride = Math.max(0.05, sp) / wr; out.k = 1; }
    else if (tg.clip === 'pedal') { out.stride = 5 * (1 + 0.1 * (vr.v - 0.5)); out.k = 1; }
    else if (tg.clip === 'drive') { const L = (_wanInfo(e.obj) || { size: { w: 4 } }).size.w; out.stride = kind === 'rail' ? 2.6 : L > 8 ? 3.0 : 2.0; out.k = 1; }
    else if (tg.clip === 'cruise') { out.stride = Math.max(0.05, sp) * _WAN_IDLE_PERIOD.boat * mult; out.k = 1; }
    out.rate = Math.max(1e-3, sp) / out.stride;
    out.period = 1 / out.rate;
    out.legPeriod = out.period;
    out.paddle = _wanClamp(out.period, 0.9, 3.2);
    return out;
  }
  if (tg.state === 'idle') { const p = (_WAN_IDLE_PERIOD[kind] || 4) * mult; out.rate = 1 / p; out.period = p; out.paddle = (_WAN_IDLE_PERIOD.swimmer) * mult; return out; }
  if (tg.state === 'moored' || (tg.state === 'stopped' && kind === 'boat')) { const p = _WAN_IDLE_PERIOD.boat * mult; out.rate = 1 / p; out.period = p; out.k = 0.35; return out; }
  return out;   // sit, lie, stopped, none: no cycle (M1)
}
/**
 * The variety slot of a live agent (M4): agents of one class in one world take successive points of a two-step low-discrepancy
 * sequence (see _WAN_R2A) in the order they first appear, so any two that live at the same time differ in phase or period. A
 * slot, once given, never changes: a new agent never reshuffles the others. Without a world: by id, per population.
 */
function _wanSlot(world, e, key) {
  if (!world || typeof world !== 'object') return _wanVariety(world, key);
  const S = _wanState(world);
  if (!S.slotOf) { S.slotOf = new Map(); S.slots = new Map(); }
  if (S.slotOf.has(key)) return S.slotOf.get(key);
  const cls = String(e.cls || _wanKind(e)), k = S.slots.get(cls) || 0, seed = _wanNum(world.seed) ? world.seed : 0;
  S.slots.set(cls, k + 1);
  const r = { u: _wanFrac(_wanU(seed + '|anim|' + cls) + k * _WAN_R2A), v: _wanFrac(_wanU(seed + '|anim2|' + cls) + k * _WAN_R2B), slot: k };
  S.slotOf.set(key, r);
  return r;
}
function _wanNew(world, e) {
  const key = e.id != null ? e.id : e.obj + '@' + _wanR(e.x, 2) + ',' + _wanR(e.z, 2);
  const vr = world && typeof world === 'object' && world.__wanLive ? _wanSlot(world, e, key) : _wanVariety(world, key), mult = 1 + 0.14 * (vr.v - 0.5);
  return { state: null, clip: null, rate: 0, period: 0, phase: _wanR(vr.u), pose: null, t: 0, cyc: vr.u, k: 0, stride: 0, step: 0, speed: 0, from: null, blend: 1, dur: 0,
    face: null, obj: null, view: null, mirror: null, sec: {}, mult, vr, legPeriod: 0, paddle: 0, pv: null, oid: e.obj };
}
/** One agent's anim for dt seconds (pure but for e.anim). */
function _wanUpdate(world, e, dt, clock) {
  let an = e.anim;
  if (!an || an.static || an.oid !== e.obj) an = e.anim = _wanNew(world, e);
  const tg = _wanTarget(e, an.state), r = _wanRates(e, tg, an.vr || { u: an.phase, v: 0.5 }, an.mult || 1);
  if (an.state == null) { an.state = tg.state; an.clip = tg.clip; an.pose = tg.pose; an.k = r.k; an.blend = 1; an.dur = 0; }
  else if (tg.state !== an.state || tg.clip !== an.clip) {
    an.from = { state: an.state, clip: an.clip, pose: an.pose, k: an.k, rate: an.rate, legPeriod: an.legPeriod, obj: an.obj };
    an.dur = _wanTransDur(an.state, an.clip, tg.state, tg.clip); an.blend = 0;
    an.state = tg.state; an.clip = tg.clip; an.pose = tg.pose;
  }
  if (an.blend < 1) an.blend = Math.min(1, an.blend + dt / Math.max(0.25, an.dur));
  const u = _wanEase(an.blend), from = an.from;
  // the cycle: continuous; easing out of a move the cycle slows with the legs, never jumps
  const effRate = from && an.blend < 1 && from.state === 'move' && tg.state !== 'move' ? from.rate * (1 - u) : r.rate;
  an.cyc = _wanFrac(an.cyc + dt * effRate);
  an.rate = _wanR(r.rate, 5); an.period = _wanR(r.period, 5); an.stride = _wanR(r.stride, 4); an.step = _wanR(r.step, 4); an.speed = _wanR(tg.speed, 4);
  if (r.legPeriod) an.legPeriod = r.legPeriod; else if (an.blend >= 1) an.legPeriod = 0;
  if (r.paddle) an.paddle = r.paddle;
  an.k = _wanR(from && an.blend < 1 ? from.k + (r.k - from.k) * u : r.k, 4);
  an.idling = !!tg.idling;
  an.t = clock;
  // under budget pressure (degrade 3) far ones keep still between moves: no idle micro-motion at LOD 2
  const S0 = world && typeof world === 'object' ? _wanWorlds.get(world) : null;
  an.quiet = Math.max(_wanDegrade, S0 ? S0.level | 0 : 0) >= 3 && e.lod >= 2 && tg.state !== 'move';
  // the view a transition holds (M7): a sitter faces the way its bench faces; others keep their last facing while they stop
  an.face = null;
  if (tg.state === 'sit' && e.seat && _wanNum(e.seat.facing)) an.face = e.seat.facing;
  else if (tg.state === 'sit' && e.host && world && Array.isArray(world.entities)) { const b = world.entities.find(q => q && q.id === e.host); if (b && _wanNum(b.facing)) an.face = b.facing; }
  const onBench = !!(e.host && world && Array.isArray(world.entities) && world.entities.some(q => q && q.id === e.host && /bench|seat/.test(String(q.obj || ''))));
  an.obj = _wanPoseObj(e.obj, tg.kind, tg.pose, onBench);
  // views with hysteresis (the camera's angle), skipped while culled (a culled agent keeps its last view)
  if (world && world.cam && !e.culled) { const v = worldViewOf(e, world.cam, { prev: an.view, prevMirror: an.mirror }); if (v) { an.view = v.view; an.mirror = v.mirror; an.persp = v.persp; } }
  return an;
}

/* ---------- secondary motion (M5) ---------- */
let _wanDegrade = 0;
const _wanWorlds = new WeakMap();
let _wanLastRef = null;   // the last world stepped, held weakly where the runtime allows (an app session never pins a world)
const _wanLast = () => (_wanLastRef && typeof _wanLastRef.deref === 'function' ? _wanLastRef.deref() || null : _wanLastRef);
function _wanState(world) {
  let s = _wanWorlds.get(world);
  if (!s) { s = { t: 0, byId: new Map(), reeds: null, waves: [], init: false }; _wanWorlds.set(world, s); }
  return s;
}
function _wanAgentsOf(world) {
  if (!world) return [];
  if (Array.isArray(world.agents)) return world.agents;
  if (world.life && !Array.isArray(world.life) && Array.isArray(world.life.agents)) return world.life.agents;
  if (world.sim && world.sim.life && Array.isArray(world.sim.life.agents)) return world.sim.life.agents;
  return [];
}
function _wanReedGrid(world, S) {
  if (S.reeds) return S.reeds;
  const g = new Map();
  for (const e of world.entities || []) {
    if (!e || !(e.cls === 'reed' || /reed|bulrush|rush|sedge/.test(String(e.obj || '')))) continue;
    const k = Math.floor(e.x / 2) + ',' + Math.floor(e.z / 2);
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(e);
  }
  return (S.reeds = g);
}
/** The dog's leader (its walker), when the life sim pairs them. */
function _wanLeader(e, byId) {
  const id = e.leader != null ? e.leader : e.follow != null ? e.follow : e.group && e.group.leader != null ? e.group.leader : typeof e.parent === 'string' && /^lead:/.test(e.parent) ? e.parent.slice(5) : null;
  return id != null ? byId.get(id) || null : null;
}
function _wanSecondary(world, agents, dt, S) {
  const lvl = Math.max(_wanDegrade, S.level | 0);
  if (lvl >= 2) return;
  const max = lvl >= 1 ? 12 : 40, byId = new Map();
  for (const a of agents) if (a && a.id != null) byId.set(a.id, a);
  const near = agents.filter(a => a && a.anim && !a.dead && (a.lod != null ? a.lod === 0 : a.z > 0 && a.z < 45)).sort((p, q) => p.z - q.z).slice(0, max);
  for (const a of near) {
    const an = a.anim, sec = an.sec || (an.sec = {}), kind = _wanKind(a), vx = a.vx || 0, vz = a.vz || 0;
    const pv = an.pv || [vx, vz], ax = (vx - pv[0]) / Math.max(1e-3, dt), az = (vz - pv[1]) / Math.max(1e-3, dt), sp = Math.hypot(vx, vz);
    an.pv = [vx, vz];
    if (kind === 'person') {
      // the coat lags the body's acceleration (low-pass)
      const fwd = sp > 0.05 ? (ax * vx + az * vz) / sp : 0, want = _wanClamp(-fwd * 4, -6, 6);
      sec.coat = _wanR((sec.coat || 0) + (want - (sec.coat || 0)) * Math.min(1, dt * 4), 3);
    }
    if (kind === 'dog') {
      const mv = an.state === 'move';
      sec.tail = { period: _wanR((mv ? 0.3 : 0.5) * (an.mult || 1), 3), k: mv ? 1 : 0.6 };
      sec.ears = { k: mv ? _wanClamp(sp / 2, 0.3, 1) : 0.2, period: mv && an.legPeriod ? _wanR(an.legPeriod / 2, 3) : 2 };
      const w = _wanLeader(a, byId);
      if (w) {
        const hw = _wanH(w), hd = _wanH(a), len = 1.8, d = Math.hypot(w.x - a.x, w.z - a.z);
        const sag = Math.sqrt(Math.max(0, (len / 2) ** 2 - (Math.min(d, len) / 2) ** 2));
        // the swing: a damped pendulum driven by the dog's sideways acceleration
        const L = d > 1e-3 ? [(a.x - w.x) / d, (a.z - w.z) / d] : [1, 0], lat = -ax * L[1] + az * L[0];
        const lead = sec.lead || { swing: 0, vel: 0 }, ell = sag + 0.3;
        lead.vel += (-(9.81 / ell) * lead.swing - 2.5 * lead.vel - lat / ell) * dt;
        lead.swing = _wanClamp(lead.swing + lead.vel * dt, -0.6, 0.6);
        sec.lead = Object.assign(lead, { a: [w.x, (_wanNum(w.y) ? w.y : 0) + hw * 0.55, w.z], b: [a.x, (_wanNum(a.y) ? a.y : 0) + hd * 0.75, a.z], len, sag: _wanR(sag, 3), taut: d >= len * 0.98, by: w.id });
      }
    }
    // reeds part as something walks or swims through them
    if (lvl < 1 && an.state === 'move' && (kind === 'walkbird' || kind === 'swimmer' || kind === 'dog' || kind === 'person')) {
      const g = _wanReedGrid(world, S), cx = Math.floor(a.x / 2), cz = Math.floor(a.z / 2);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const r of g.get((cx + i) + ',' + (cz + j)) || []) {
        const d = Math.hypot(r.x - a.x, r.z - a.z);
        if (d > 1.2) continue;
        const ra = r.anim || (r.anim = _wanStatic(r)), amp = 1 - d / 1.2;
        const dir = (r.x - a.x) * r.z - (r.z - a.z) * r.x >= 0 ? 1 : -1;   // away from the mover, sideways on screen
        if (!ra.sec.part || ra.sec.part.amp < amp) ra.sec.part = { dir, amp: _wanR(amp, 3), t: S.t };
        S.active = S.active || new Set(); S.active.add(r);
      }
    }
  }
}
/** Decay the statics' secondary motion (reeds closing, rocking dying away). */
function _wanStatics(world, dt, S) {
  if (!S.active) return;
  for (const r of S.active) {
    if (r.anim) r.anim.t = S.t;
    const sec = r.anim && r.anim.sec;
    if (!sec) { S.active.delete(r); continue; }
    if (sec.part) { sec.part.amp = _wanR(sec.part.amp * Math.exp(-dt / 0.9), 4); if (sec.part.amp < 0.02) delete sec.part; }
    if (sec.rock) { const live = sec.rock.waves.filter(w => S.t - w.t0 < 12); sec.rock.waves = live; if (!live.length) delete sec.rock; }
    if (!sec.part && !sec.rock) S.active.delete(r);
  }
}
/** A wake passes (an event from the water or traffic system): floaters and moored boats within 40 m rock as it arrives. */
function worldAnimWake(world, e) {
  if (!world || !e || !_wanNum(e.x) || !_wanNum(e.z)) return 0;
  const S = _wanState(world), amp0 = _wanNum(e.amp) ? e.amp : 1, t0 = _wanNum(e.t) ? e.t : S.t;
  let n = 0;
  const hit = (q) => {
    if (!q || q.id === e.id || q === e.src) return;
    const kind = _wanKind(q);
    if (!(kind === 'boat' || kind === 'swimmer')) return;
    const d = Math.hypot(q.x - e.x, q.z - e.z);
    if (d > 40) return;
    const an = q.anim || (q.anim = q.static === false ? _wanNew(world, q) : _wanStatic(q));
    const sec = an.sec || (an.sec = {}), rock = sec.rock || (sec.rock = { waves: [] });
    rock.waves.push({ t0: t0 + d / 1.2, amp: _wanR(amp0 * Math.exp(-d / 25) * (kind === 'boat' ? 1.6 : 4), 3), period: kind === 'boat' ? 2.2 : 1.1 });
    if (rock.waves.length > 3) rock.waves.shift();
    S.active = S.active || new Set(); S.active.add(q);
    n++;
  };
  for (const q of world.entities || []) hit(q);
  for (const q of _wanAgentsOf(world)) hit(q);
  return n;
}
/** The rocking now (degrees) of an entity's waves. */
function _wanRock(an, t) {
  const R = an && an.sec && an.sec.rock;
  if (!R) return 0;
  let v = 0;
  for (const w of R.waves) { const dt = t - w.t0; if (dt > 0) v += w.amp * Math.exp(-dt / 3) * Math.sin(2 * Math.PI * dt / w.period); }
  return v;
}

/* ---------- the system ---------- */
/** The statics' anim records and views (idempotent). */
function worldAnimInit(world) {
  if (!world) return 0;
  const S = _wanState(world);
  let n = 0;
  for (const e of world.entities || []) {
    if (!e || e.static === false) continue;
    if (!e.anim || e.anim.oid !== e.obj) { e.anim = _wanStatic(e); n++; }
    if (world.cam && e.obj && e.view == null) { const v = worldViewOf(e, world.cam); if (v) { e.view = v.view; e.mirror = v.mirror; } }
  }
  S.init = true;
  return n;
}
/**
 * One tick (dt seconds of scene time): every agent's anim from what it is doing (M1, A6, M4, M7), secondary motion (M5) for
 * the nearest, the statics' secondary decays. o: { agents (override the world's), t (set the clock) }.
 */
function worldAnimStep(world, dt, o) {
  o = o || {};
  if (!world || !(dt >= 0)) return 0;
  const S = _wanState(world);
  if (!S.init) worldAnimInit(world);
  if (!world.__wanLive) Object.defineProperty(world, '__wanLive', { value: true, enumerable: false, configurable: true });
  // the clock: the caller's, else the runner's scene time (world.t), else our own
  S.t = _wanNum(o.t) ? o.t : _wanNum(world.t) && !o.ownClock ? world.t : S.t + dt;
  _wanLastRef = typeof WeakRef === 'function' ? new WeakRef(world) : world;
  const agents = Array.isArray(o.agents) ? o.agents : _wanAgentsOf(world);
  // every agent's state every tick (a few microseconds each: what it is doing must never lag what it does, even off
  // screen); the costly parts (views, secondary motion) follow the level of detail (G7)
  let n = 0;
  S.byId = new Map();   // only the living: an app session never accumulates the gone
  for (const a of agents) {
    if (!a || a.dead) continue;
    _wanUpdate(world, a, dt, S.t);
    if (a.id != null) S.byId.set(a.id, a.anim);
    n++;
  }
  // the variety slots of agents that have left are forgotten now and then (their ids never come back)
  S.ticks = (S.ticks | 0) + 1;
  if (S.slotOf && S.ticks % 300 === 0) for (const k of [...S.slotOf.keys()]) if (!S.byId.has(k)) S.slotOf.delete(k);
  if (S.ticks % 8 === 0) _wanDeclone(agents);
  _wanSecondary(world, agents, dt, S);
  _wanStatics(world, dt, S);
  // statics added later (the fill, a re-attach) get their record on the next tick
  for (const e of world.entities || []) if (e && e.static !== false && (!e.anim || e.anim.oid !== e.obj)) e.anim = _wanStatic(e);
  return n;
}
/**
 * M4 at run time: two agents of one class within 10 m whose cycles have fallen into step (the same period within 2 % and the
 * same place in the cycle; a group swimming or walking at one speed can drift there and stay) are put out of step: the later
 * one's cycle moves on by a third of a cycle (a paddle or a step a third early is invisible; marching in step is not).
 * Deterministic: agents in their list order, a grid of 10 m cells.
 */
function _wanDeclone(agents) {
  const g = new Map(), cell = 10;
  for (const a of agents) {
    const an = a && !a.dead && a.anim;
    if (!an || !(an.period > 0) || !_wanNum(a.x) || !_wanNum(a.z) || (an.state !== 'move' && an.state !== 'idle')) continue;
    const cls = String(a.cls || a.obj || ''), cx = Math.floor(a.x / cell), cz = Math.floor(a.z / cell);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      for (const b of g.get(i + ',' + j) || []) {
        const bn = b.anim;
        if (String(b.cls || b.obj || '') !== cls || bn.state !== an.state || Math.hypot(a.x - b.x, a.z - b.z) > 10) continue;
        if (Math.abs(an.period - bn.period) / an.period < 0.02 && Math.abs(_wanFrac(an.cyc - bn.cyc + 0.5) - 0.5) < 0.04) an.cyc = _wanFrac(an.cyc + 0.333);
      }
    }
    const k = cx + ',' + cz;
    if (!g.has(k)) g.set(k, []);
    g.get(k).push(a);
  }
}
/** A pure snapshot anim for an entity with no live record (tools, stills): what it is doing now, at its own phase. */
function _wanSnapshot(e, world) {
  if (e.static !== false && !_wanNum(e.vx) && !_wanNum(e.vz) && e.state == null && e.spd == null) return _wanStatic(e);
  const an = _wanNew(world || null, e), tg = _wanTarget(e, null), r = _wanRates(e, tg, an.vr, an.mult);
  Object.assign(an, { state: tg.state, clip: tg.clip, pose: tg.pose, rate: _wanR(r.rate, 5), period: _wanR(r.period, 5), stride: _wanR(r.stride, 4), step: _wanR(r.step, 4), k: r.k, speed: _wanR(tg.speed, 4),
    legPeriod: r.legPeriod, paddle: r.paddle, t: _wanNum(e.t) ? e.t : 0, snapshot: true });
  an.obj = _wanPoseObj(e.obj, tg.kind, tg.pose, !!e.host);
  return an;
}
/** The anim record of an entity: its live record, else the one the system keeps by id, else a pure snapshot. */
function worldAnimOf(ent, world) {
  if (!ent) return null;
  if (ent.anim && ent.anim.state !== undefined && ent.anim.oid === ent.obj) return ent.anim;
  const W = world || _wanLast();
  if (W && ent.id != null) { const S = _wanWorlds.get(W); const an = S && S.byId.get(ent.id); if (an && an.oid === ent.obj) return an; }
  return _wanSnapshot(ent, world || null);
}

/* ---------- hooks (the v2 AnimHooks the renderer draws with) ---------- */
/** The preset of sceneBehave.hooks for a body kind (objects without hooks of their own). */
function _wanBehaveHooks(kind, obj) {
  if (typeof sceneBehave !== 'object' || !sceneBehave || typeof sceneBehave.hooks !== 'function') return [];
  const name = kind === 'person' ? 'person-walk' : kind === 'dog' ? 'dog' : kind === 'swimmer' ? (/swan/.test(obj) ? 'swan' : 'swimmer') : kind === 'grazer' ? 'graze'
    : kind === 'walkbird' ? (/pigeon/.test(obj) ? 'pigeon' : 'heron') : /kingfisher/.test(obj) ? 'kingfisher' : null;
  try { return name ? sceneBehave.hooks(name, {}) || [] : []; } catch (e) { return []; }
}
const _wanHookMemo = new Map();
function _wanObjHooks(obj, v, season) {
  const key = obj + '|' + (v | 0) + '|' + (season || 'summer');
  if (_wanHookMemo.has(key)) return _wanHookMemo.get(key);
  let hs = [];
  if (typeof sceneObjShapes === 'function' && obj) { try { const sh = sceneObjShapes(obj, v | 0, season || 'summer'); hs = sh && Array.isArray(sh.anim) ? sh.anim : []; } catch (e) { hs = []; } }
  _wanHookMemo.set(key, hs);
  return hs;
}
/**
 * The hooks to draw an entity with at scene time t (default: its anim clock). o: { obj (the object drawn: a view or pose
 * object), variant, season, world }. Returns new objects (the library's are never mutated).
 */
function worldAnimHooks(ent, t, o) {
  o = o || {};
  if (!ent) return [];
  const an = worldAnimOf(ent, o.world);
  if (!an) return [];
  const W0 = o.world || _wanLast(), S0 = W0 ? _wanWorlds.get(W0) : null;
  const obj = o.obj || an.obj || ent.obj, kind = _wanKind(ent), T = _wanNum(t) ? t : S0 && _wanNum(S0.t) ? S0.t : an.t || 0;
  let base = _wanObjHooks(obj, o.variant != null ? o.variant : ent.variant, o.season);
  const isStatic = an.static || ent.static !== false && an.state === 'none';
  if (!base.length && !isStatic) base = _wanBehaveHooks(kind, String(obj || ''));
  const out = [], mult = an.mult || 1, rock = _wanRock(an, T);
  // statics (M2): only causes move them: the wind (sway), smoke and flame (flicker), wind-driven sails (spin), the water (a moored bob)
  if (isStatic || an.state === 'moored') {
    for (const h of base) {
      if (h.kind === 'sway') {
        const part = an.sec && an.sec.part;
        if (part && part.amp > 0.05) out.push(Object.assign({}, h, { kind: 'turn', deg: (h.deg || 2) * 6 * part.dir * part.amp, period: 1e9, phase: 0.5, hold: 0 }));
        else out.push(Object.assign({}, h));
      } else if (h.kind === 'flicker' && /smoke|steam|flame|fire|glow|lit/.test(String(h.part || (h.parts || []).join(' ')))) out.push(Object.assign({}, h, { phase: _wanFrac((h.phase || 0) + an.phase) }));
      else if (h.kind === 'spin' && /wind|mill|turbine/.test(String(obj))) out.push(Object.assign({}, h));
      else if (h.kind === 'bob' && an.state === 'moored') {
        if (Math.abs(rock) > 0.05) out.push({ kind: 'paddle', part: h.part || '*', parts: h.parts, dy: (h.dy || 1) * 0.35, deg: rock, period: 1e9, phase: _WAN_ROCK_PH });
        else out.push(Object.assign({}, h, { k: (h.k == null ? 1 : h.k) * 0.35, period: (h.period || 5) * mult, phase: an.phase }));
      }
    }
    return out;
  }
  const mv = an.state === 'move', blendU = _wanEase(an.blend == null ? 1 : an.blend);
  const legPer = an.legPeriod || an.period || 1, legPh = _wanFrac(an.cyc - (an.t || 0) / legPer);
  const flying = an.pose === 'fly', still = an.state === 'sit' || an.state === 'lie' || an.state === 'stopped';
  base.forEach((h, i) => {
    const k0 = h.k == null ? 1 : h.k, ph = _wanFrac((h.phase || 0) + an.phase + i * 0.37);
    switch (h.kind) {
      case 'walk': {
        // legs: the stride period from the speed (A6); still when seated, lying or stopped (M1); eased in and out (M7)
        const k = still ? 0 : an.k;
        out.push(Object.assign({}, h, { period: legPer, phase: legPh, k: k0 * k, bob: (h.bob == null ? 1.5 : h.bob) * k, fs: ent.view === 'front' || ent.view === 'back' ? 0.3 : 1 }));
        break;
      }
      case 'paddle': {
        const k = an.quiet ? 0 : an.state === 'idle' ? 0.6 : mv ? 1 : 0.3;
        out.push(Object.assign({}, h, { period: an.paddle || (h.period || 2.8) * mult, phase: mv ? legPh : ph, k: k0 * k, deg: (h.deg || 2) + (Math.abs(rock) > 0.05 ? rock : 0) }));
        break;
      }
      case 'turn': {
        const isTail = /tail/.test(String(h.part || (h.parts || []).join(' ')));
        if (isTail && an.sec && an.sec.tail) { out.push(Object.assign({}, h, { period: an.sec.tail.period, phase: ph, k: k0 * an.sec.tail.k })); break; }
        // idle micro-motion (head turns, looks): varied per entity; quieter while walking; still only far away under budget
        out.push(Object.assign({}, h, { period: (h.period || 3) * mult, phase: ph, k: an.quiet ? 0 : k0 * (mv ? 0.6 : 1) }));
        break;
      }
      case 'flap': out.push(Object.assign({}, h, { period: (h.period || 0.4) * mult, phase: ph, k: k0 * (flying ? blendU : 0) })); break;
      case 'bob': {
        const k = (kind === 'vehicle' || kind === 'rail') ? (mv ? 1 : an.idling ? 0.2 : 0) : kind === 'boat' ? (mv ? 1 : 0.35) : mv ? 1 : 0.5;
        if (kind === 'boat' && Math.abs(rock) > 0.05) out.push({ kind: 'paddle', part: h.part || '*', parts: h.parts, dy: (h.dy || 1) * k, deg: rock, period: 1e9, phase: _WAN_ROCK_PH });
        else out.push(Object.assign({}, h, { period: (h.period || 1) * mult, phase: ph, k: k0 * k }));
        break;
      }
      case 'spin': out.push(Object.assign({}, h, { period: mv && an.rate > 0 ? 1 / an.rate : h.period || 1, phase: ph, k: k0 * (mv ? 1 : 0) })); break;
      case 'sway': case 'flicker': case 'frames': out.push(Object.assign({}, h, { phase: ph, period: (h.period || 3) * mult })); break;
      default: out.push(Object.assign({}, h, { phase: ph }));
    }
  });
  return out;
}

/* ---------- the 'anim' system (Y2): registered when the runtime (0sys) is loaded ---------- */
if (typeof worldSystem === 'function') {
  try {
    worldSystem({
      id: 'anim', phase: 'anim', after: [], before: [],
      components: { read: ['transform', 'brain', 'desc', 'render', 'time'], write: ['anim', 'render'] },
      rate: 30, budgetMs: 0.5,
      init(world) { worldAnimInit(world); },
      update(world, dt) { worldAnimStep(world, dt); },
      onEvent: { wake(world, e) { worldAnimWake(world, e); } },
      // 1: secondary motion for the 12 nearest only, no reeds; 2: no secondary motion; 3: idle micro-motion still for far ones
      degrade(level, world) { if (world) _wanState(world).level = level | 0; else _wanDegrade = level | 0; },
    });
  } catch (e) { /* a runtime that refuses the definition: the tools drive worldAnimStep directly */ }
}
