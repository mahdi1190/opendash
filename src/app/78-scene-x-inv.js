/* ============================================================
   SCENE ENGINE v2 + v3 SYSTEMS: the per-frame mover invariants (merge package "checks", 15 Oct).
   PURE classic script: constants and functions only, nothing runs at load and nothing touches the DOM, so it loads in the Node
   registry (tools/lib/anim-sources.mjs SCENE_FILE_RE takes 78-scene-x-*) and in the browser page alike. Private prefix _scxi.

   Ported from the world engine's invariant checker (79-world-9inv.js, worldInvariants and its rules) and adapted to v2 movers,
   which are PURE FUNCTIONS OF t (sceneActorAt / sceneActorAtV2 for actors, sceneFlowAgents for flows). Nothing here calls a
   world* function: v2 must not depend on code that is changing under it. Other packages are reached through typeof guards.

     SCENE_X_INV_RULES                          [{ rule, sev, what, from }]: the rules and the v3 rule each comes from
     sceneXFrameAt(C, t, L, o)                  -> { t, movers: [{ id, kind: 'actor' | 'flow', i, obj, cls, x, d, h, X, Y, s, alpha,
                                                   r, layer: 'walk' | 'swim' | 'wade' | 'graze' | 'drive' | 'rail', moving, vx, vd,
                                                   group, framed, vmax, maxWait, src }], crowd: bool }
                                                   the ground movers as drawn at t: package 1's sceneXCrowdAt (the resolved crowd)
                                                   when it is loaded and o.crowd !== false, else the base positions. o: { data,
                                                   crowd, dt (velocity step, 0.25 s) }
     sceneXInvariantTracker()                   -> the history one run keeps across frames (pop, teleport, stuck, held overlaps)
     sceneXInvariants(C, frame, track, o)       -> [{ rule, id, msg, sev, at: [X, Y] }]: the violations of one frame
     sceneXInvariantLoop(C, o)                  -> { seconds, hz, frames, movers, crowd, counts: { rule: n }, errors, warns,
                                                   pairs (bodiesOverlap pairs), samples: { rule: [first 5 violations] }, ms }
                                                   a full loop that really advances t (o: { seconds 300, hz 4, L, data, crowd })
     sceneXGroundMover(obj)                     -> true for a ground mover (what these rules and the drawn check judge)
     sceneXMoverBox(m, season)                  -> [x0, y0, x1, y1] in scene units (1600 x 900) of a mover record's sprite (its
                                                   facing m.dir when 1 | -1, else both; the drawn-vs-simulated check of `scene check`)

   Rules (THE v2-relevant subset of worldInvariants; the static, light, water and season rules stay in v3):
     bodiesOverlap  two people closer than 0.5 m on the ground (not group mates); error once held 1 s       (v3 crowd, inSolid)
     offLayer       a walker off walkable ground or on water, a swimmer off the water                       (v3 onWater, habitat)
     throughSolid   a mover's foot inside a blocker footprint (a wall, fence, bench, trunk, hull)           (v3 inSolid)
     floaterLevel   a floater's drawn waterline above the drawn water in its column (a duck in the air)      (v3 floating)
     nearBand       a person or animal inside the near band (f * h / d > 405 px) unless framed               (v3 nearBand)
     pop            a mover appearing or vanishing (alpha jump) inside the frame, not at an edge, not a pose
                    swap of one animal, not a diving bird on the water                                       (v3 popping)
     teleport       a step longer on screen than twice its top speed allows                                  (v3 popping, new)
     faceSlide      drawn side-on while moving toward or away (no view), or mirrored against its motion     (v3 facing)
     stuck          a person, dog or flow agent making no progress for 10 s beyond its scripted stands     (v3 stuck)
   ============================================================ */
const SCENE_X_INV_RULES = Object.freeze([
  { rule: 'bodiesOverlap', sev: 'warn', what: 'two people closer than 0.5 m on the ground, not group mates (error once held for 1 s)', from: 'crowd, inSolid' },
  { rule: 'offLayer', sev: 'error', what: 'a walker off walkable ground or on the water; a swimmer off the water', from: 'onWater, habitat' },
  { rule: 'throughSolid', sev: 'error', what: 'a mover standing inside a blocker footprint (wall, fence, gate, bench, trunk, hull)', from: 'inSolid' },
  { rule: 'floaterLevel', sev: 'error', what: 'a floater whose drawn waterline sits above the drawn water in its column (floating in the air above the bank)', from: 'floating' },
  { rule: 'nearBand', sev: 'warn', what: 'a person or animal inside the near band (f * h / d > 405 px) unless framed', from: 'nearBand' },
  { rule: 'pop', sev: 'error', what: 'a mover appears or vanishes (alpha jump) inside the frame, not at an edge', from: 'popping' },
  { rule: 'teleport', sev: 'error', what: 'a step longer on screen than twice the top speed of its class allows', from: 'popping' },
  { rule: 'faceSlide', sev: 'warn', what: 'drawn side-on while moving toward or away from the eye (no view), or mirrored against its motion', from: 'facing' },
  { rule: 'stuck', sev: 'warn', what: 'a mover that should move makes no progress for 10 s beyond its scripted waits', from: 'stuck' },
]);

/* ---------- small maths ---------- */
const _scxiNum = v => typeof v === 'number' && Number.isFinite(v);
const _scxiR = v => Math.round(v * 100) / 100;
function _scxiInPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i], b = P[j];
    if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
// the top speed of a class in m/s (teleport), and the classes that walk (offLayer, nearBand)
const _SCXI_VMAX = { person: 3.6, cyclist: 9, animal: 6, 'animal-dog': 6, 'animal-graze': 2.5, 'bird-water': 2.5, 'bird-ground': 3, boat: 2.5 };
const _SCXI_LAND = ['person', 'cyclist', 'animal', 'animal-dog', 'animal-graze', 'bird-ground'];
const _SCXI_SIZED = ['person', 'cyclist', 'animal', 'animal-dog', 'animal-graze', 'bird-water', 'bird-ground'];
// the fliers and insects the motion rules leave alone (the same list as 70-scene-1ground.js _scgrGroundMover)
const _SCXI_FLIER = /flight|swallow|swift|martin|bat|butterfly|dragonfly|bee\b|kite|buzzard|hobby|skylark/;
const _SCXI_WADER = /heron|egret|stork|crane|wader|curlew|kingfisher/;
const _SCXI_DIVER = /grebe|dabchick|coot|cormorant|shag|tufted|pochard|goldeneye|merganser|goosander|diver|kingfisher/;
const _SCXI_HIDDEN = Object.freeze({ x: -1e5, y: -1e5, X: -1e5, Y: -1e5, s: 0, alpha: 0, dir: 1, flip: false, d: 1e5 });

/* ---------- the movers of a frame ---------- */
const _scxiMemo = new WeakMap();
/** The per-compile facts of every ground actor (memoised per C): { list: [{ a, i, ms, mode, layer, floats, maxWait, vmax }], W }. */
function _scxiActors(C) {
  if (_scxiMemo.has(C)) return _scxiMemo.get(C);
  const W = typeof sceneMotionWorld === 'function' ? sceneMotionWorld(C) : null;
  const drawn = typeof sceneMotionFixed === 'function' ? sceneMotionFixed(C) : (C.actors || []);
  const list = [];
  drawn.forEach((a, i) => {
    if (!a || typeof sceneMoverSize !== 'function') return;
    const o = a.o || a.obj, ms = sceneMoverSize(o);
    if (!sceneXGroundMover(o)) return;
    const floats = ms.cls === 'boat' || ms.cls === 'bird-water';
    // the mover's mode, as the motion rules decide it (sceneMoverFixPath's _scgrMoverNeeds): a boat swims; a wader wades; a water
    // bird swims when at least half its shown path is on the water, else it is mixed (a goose on the bank) and only wades
    let mode = _SCXI_LAND.includes(ms.cls) ? 'walk' : floats ? 'swim' : null;
    if (ms.cls === 'animal-graze') mode = 'graze';
    if (ms.cls === 'bird-water' && W) {
      if (_SCXI_WADER.test(o)) mode = 'wade';
      else {
        const h = W.cam.water, pts = Array.isArray(a.ground) ? a.ground : (a.path || []).map(p => W.unproj(p[0], p[1], h)).filter(Boolean);
        const shown = pts.filter(p => W.shown(p[0], p[1])), wet = shown.filter(p => W.water(p[0], p[1])).length;
        mode = shown.length && wet >= shown.length * 0.5 ? 'swim' : 'wade';
      }
    }
    // the longest scripted stand of a timed path (points [x, y, wait, face, dur]): its waits plus the legs that stay within 3 px
    let maxWait = 0, run = 0;
    (a.path || []).forEach((p, j, P) => {
      if (p.length <= 2) return;
      const q = j ? P[j - 1] : null, still = q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 3;
      run = (still ? run + (+p[4] || 0) : 0) + (+p[2] || 0);
      if (run > maxWait) maxWait = run;
    });
    list.push({ a, i, o, ms, mode, floats, maxWait, vmax: _SCXI_VMAX[ms.cls] || 3 });
  });
  const r = { list, W };
  _scxiMemo.set(C, r);
  return r;
}
/** One actor at t in the frame-record form (null when hidden by its timeline or above the horizon). */
function _scxiActorAt(C, A, W, t) {
  const a = A.a, cam = W ? W.cam : C.cam;
  if (!cam) return null;
  let X, Y, s, alpha, x, d, dir;
  if (Array.isArray(a.ground) && typeof sceneActorAtV2 === 'function') {
    const q = sceneActorAtV2(a, t, cam);
    if (!q) return null;
    X = q.X; Y = q.Y; s = q.s; alpha = q.alpha == null ? 1 : q.alpha; x = q.x; d = q.d; dir = q.flip ? -1 : 1;
  } else if (typeof sceneActorAt === 'function' && W) {
    const q = sceneActorAt(a, t);
    if (!q) return null;
    X = q.x; Y = q.y; s = q.s; alpha = q.alpha == null ? 1 : q.alpha; dir = q.dir;
    const g = W.unproj(X, Y, A.floats ? cam.water : 0);
    if (!g) return null;
    x = g[0]; d = g[1];
  } else return null;
  return { X, Y, s, alpha, x, d, dir };
}
/** The base movers at t (no crowd pass): every ground actor and every flow agent on its ground. */
function _scxiBase(C, t, L, o) {
  const { list, W } = _scxiActors(C), out = [], dt = o.dt || 0.25;
  for (const A of list) {
    const p = _scxiActorAt(C, A, W, t);
    if (!p) continue;
    const q = _scxiActorAt(C, A, W, t - dt);
    const vx = q ? (p.x - q.x) / dt : 0, vd = q ? (p.d - q.d) / dt : 0;
    out.push({ id: 'a' + A.i, kind: 'actor', i: A.i, obj: A.o, v: A.a.v || 0, cls: A.ms.cls, x: p.x, d: p.d, h: A.floats && W ? W.cam.water : 0, X: p.X, Y: p.Y, s: p.s,
      alpha: p.alpha, dir: p.dir, r: Math.max(0.12, A.ms.w * 0.5), layer: A.mode || 'walk', moving: Math.hypot(vx, vd) > 0.05, vx, vd, group: A.a.group != null ? A.a.group : null,
      framed: !!A.a.framed, vmax: A.vmax, maxWait: A.maxWait, src: 'base' });
  }
  if (Array.isArray(C.flows) && C.flows.length && typeof sceneFlowAgents === 'function') {
    const at = (tt) => sceneFlowAgents(C, tt, L || null, { data: o.data || {} });
    const now = at(t), prev = new Map(at(t - dt).map(g => [g.flow + '.' + g.lane + '.' + g.k, g]));
    for (const g of now) {
      const k = g.flow + '.' + g.lane + '.' + g.k, q = prev.get(k), lay = { walk: 'walk', cycle: 'walk', graze: 'graze', boat: 'swim', drive: 'drive', tram: 'rail', train: 'rail' }[g.kind] || 'walk';
      const vx = q ? (g.x - q.x) / dt : 0, vd = q ? (g.d - q.d) / dt : 0, ms = typeof sceneMoverSize === 'function' ? sceneMoverSize(g.o) : { w: 0.5, cls: g.cls };
      out.push({ id: 'f' + k, kind: 'flow', i: k, obj: g.o, v: g.v || 0, cls: g.cls || ms.cls, x: g.x, d: g.d, h: g.h || 0, X: g.X, Y: g.Y, s: g.s, alpha: g.alpha, dir: g.flip ? -1 : 1,
        r: Math.max(0.12, (ms.w || 0.5) * 0.5), layer: lay, moving: !!g.moving, vx, vd, group: null, framed: false, vmax: Math.max(_SCXI_VMAX[g.cls] || 3, (g.speed || 0) * 1.2), maxWait: 0, src: 'base' });
    }
  }
  return out;
}
/**
 * The ground movers as drawn at t (see the head). Package 1's crowd pass (sceneXCrowdAt, 78-scene-x-crowd.js) when loaded and
 * not switched off (o.crowd === false, opt.x.crowd === false), else the base positions.
 */
function sceneXFrameAt(C, t, L, o) {
  o = o || {};
  const crowdOn = o.crowd !== false && !(C && C.opt && C.opt.x && C.opt.x.crowd === false);
  if (crowdOn && typeof sceneXCrowdAt === 'function') {
    try {
      const res = sceneXCrowdAt(C, t, L, o);
      if (Array.isArray(res)) {
        const base = new Map(_scxiBase(C, t, L, o).map(m => [m.id, m]));
        const movers = res.map((m, j) => {
          const id = m.id != null ? String(m.id) : (m.kind === 'flow' ? 'f' : 'a') + j, b = base.get(id) || base.get('a' + id) || base.get('f' + id) || {};
          return Object.assign({}, b, m, { id: b.id || id, vmax: b.vmax || _SCXI_VMAX[m.cls] || 3, maxWait: b.maxWait || 0, src: 'crowd' });
        });
        return { t, movers, crowd: true };
      }
    } catch (e) { return { t, movers: _scxiBase(C, t, L, o), crowd: false, crowdError: String(e && e.message || e) }; }
  }
  return { t, movers: _scxiBase(C, t, L, o), crowd: false };
}

/* ---------- the rules ---------- */
const _scxiTops = new WeakMap();
/** The top row of the drawn water (W.waterScr, scene units) in column X, or null when the column has none (memoised per world). */
function _scxiWaterTop(W, X) {
  let M = _scxiTops.get(W);
  if (!M) { M = new Map(); _scxiTops.set(W, M); }
  const k = Math.round(X);
  if (M.has(k)) return M.get(k);
  let top = null;
  for (const P of W.waterScr) for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[j], b = P[i];
    if ((a[0] <= k) === (b[0] <= k)) continue;
    const y = a[1] + (b[1] - a[1]) * (k - a[0]) / (b[0] - a[0]);
    if (top == null || y < top) top = y;
  }
  M.set(k, top);
  return top;
}
/** The history of one run: per mover its last state (pop, teleport, stuck), held overlaps, facing hysteresis. */
function sceneXInvariantTracker() { return { prev: new Map(), stuck: new Map(), held: new Map(), face: new Map(), frames: 0 }; }
const _scxiVisible = (m) => _scxiNum(m.alpha) && m.alpha > 0.3 && m.s > 0;
const _scxiOnScreen = (m, pad) => m.X > -pad && m.X < 1600 + pad && m.Y > 0 && m.Y < 900 + pad;
const _scxiInterior = (m) => m.X > 60 && m.X < 1540 && m.Y > 0 && m.Y < 880;

/**
 * The violations of one frame (see the head): [{ rule, id, msg, sev, at }]. C: the compiled scene; frame: sceneXFrameAt's record;
 * track: sceneXInvariantTracker() (pop, teleport, stuck and held overlaps need it; without it those rules are n/a); o: { rules (a
 * subset), dt (seconds since the last frame) }. Never throws: a rule that throws is reported as a violation of that rule.
 */
function sceneXInvariants(C, frame, track, o) {
  o = o || {};
  const out = [], want = o.rules ? new Set(o.rules) : null;
  const W = typeof sceneMotionWorld === 'function' ? sceneMotionWorld(C) : null, cam = W ? W.cam : (C && C.cam) || null;
  const movers = (frame && frame.movers) || [], t = frame && _scxiNum(frame.t) ? frame.t : 0;
  const prevT = track && _scxiNum(track.t) ? track.t : null, dt = _scxiNum(o.dt) ? o.dt : prevT != null ? t - prevT : 0.25;
  const push = (rule, m, msg, sev) => out.push({ rule, id: m ? m.id : null, obj: m ? m.obj : null, msg, sev: sev || (SCENE_X_INV_RULES.find(r => r.rule === rule) || {}).sev || 'warn', at: m ? [_scxiR(m.X), _scxiR(m.Y)] : null, t: _scxiR(t) });
  const run = (rule, fn) => { if (want && !want.has(rule)) return; try { fn(); } catch (e) { push(rule, null, `the rule threw: ${e && e.message || e}`, 'error'); } };
  const shown = (m) => (W ? W.shown(m.x, m.d) : true) && _scxiVisible(m);
  const walkKinds = (cls) => { const R = typeof SCENE_PLACE_RULES !== 'undefined' ? SCENE_PLACE_RULES : null, r = R && (R[cls] || R.person); return r ? r.on.filter(k => k !== 'water') : null; };

  run('bodiesOverlap', () => {
    const ppl = movers.filter(m => (m.cls === 'person' || m.cls === 'cyclist') && m.layer === 'walk' && shown(m));
    const now = new Set();
    for (let u = 0; u < ppl.length; u++) for (let v = u + 1; v < ppl.length; v++) {
      const a = ppl[u], b = ppl[v];
      if (a.group != null && a.group === b.group) continue;
      const dist = Math.hypot(a.x - b.x, a.d - b.d);
      if (dist >= 0.5) continue;
      const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
      now.add(k);
      let since = t;
      if (track) { if (!track.held.has(k)) track.held.set(k, t); since = track.held.get(k); }
      const held = t - since >= 1 - 1e-6;
      push('bodiesOverlap', a, `${a.obj} ${a.id} and ${b.obj} ${b.id} are ${Math.round(dist * 100)} cm apart${held ? ` (for ${_scxiR(t - since)} s: walking through each other)` : ''}`, held ? 'error' : 'warn');
      out[out.length - 1].pair = k;
    }
    if (track) for (const k of [...track.held.keys()]) if (!now.has(k)) track.held.delete(k);
  });
  run('offLayer', () => {
    if (!W) return;
    for (const m of movers) {
      if (!shown(m)) continue;
      if (m.layer === 'swim') {
        if (!W.water(m.x, m.d)) push('offLayer', m, `${m.obj} swims off the water at x ${_scxiR(m.x)} m, d ${_scxiR(m.d)} m`);
        continue;
      }
      if (m.layer !== 'walk' && m.layer !== 'graze') continue;
      const s = W.surf(m.x, m.d), kinds = W.v2 ? walkKinds(m.cls) : null;
      const ok = (q) => (W.v2 ? !!q && (q.kind === 'bridge' || !kinds || kinds.includes(q.kind)) : !(q && q.kind === 'water'));
      if (ok(s)) continue;
      // a body has width (a person's shoulders 0.28 m): feet within 0.3 m of walkable ground stand on it (v3 onWater: 0.2 m on
      // its 0.5 m grid), so stepping onto a towpath's grass middle strip or a deck's edge is not a fault
      if ([[0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]].some(e => ok(W.surf(m.x + e[0], m.d + e[1])))) continue;
      const what = !s ? 'no surface (mid-air)' : s.kind === 'water' ? `the water (${s.id || 'water'})` : `${s.kind} (${s.id})`;
      push('offLayer', m, `${m.obj} walks on ${what} at x ${_scxiR(m.x)} m, d ${_scxiR(m.d)} m`);
    }
  });
  run('throughSolid', () => {
    if (!W || !W.blockers.length) return;
    for (const m of movers) {
      if (!shown(m) || m.layer === 'rail' || m.layer === 'drive' || m.layer === 'wade') continue;
      for (const b of W.blockers) {
        if (m.layer === 'swim' ? b.kind !== 'hull' : b.wet) continue;   // a wet hull blocks only what floats; a swimmer meets only hulls
        if (Math.abs(m.x - b.x) < b.hx - 0.05 && Math.abs(m.d - b.d) < b.hd - 0.05) { push('throughSolid', m, `${m.obj} is inside ${b.o} (${b.kind}) at x ${_scxiR(m.x)} m, d ${_scxiR(m.d)} m`); break; }
      }
    }
  });
  run('floaterLevel', () => {
    if (!W || !W.waterScr || !W.waterScr.length) return;
    for (const m of movers) {
      if (m.layer !== 'swim' || !_scxiVisible(m) || !_scxiOnScreen(m, 0)) continue;
      // the waterline is the foot row: it must not sit above the top of the drawn water in its column (a duck in the air over
      // the bank, the 10 Oct bug); a foot inside a hole of the water (a reed bed, an island) is offLayer's business
      const top = _scxiWaterTop(W, m.X);
      if (top == null) push('floaterLevel', m, `${m.obj} floats where no water is drawn (column ${Math.round(m.X)})`);
      else if (m.Y < top - 2) push('floaterLevel', m, `${m.obj} floats ${Math.round(top - m.Y)} units above the drawn water (waterline ${Math.round(m.Y)}, water from ${Math.round(top)})`);
    }
  });
  run('nearBand', () => {
    if (!cam || !(cam.f > 0)) return;
    for (const m of movers) {
      if (m.framed || !_scxiVisible(m) || !_SCXI_LAND.includes(m.cls) || m.X < -80 || m.X > 1680) continue;
      const h = typeof sceneMoverSize === 'function' ? sceneMoverSize(m.obj).h : 1.7;
      if (m.d > 0 && cam.f * h / m.d > 405 + 1e-6) push('nearBand', m, `${m.obj} at ${_scxiR(m.d)} m is ${Math.round(cam.f * h / m.d)} px tall (near band ${_scxiR(cam.f * h / 405)} m)`);
    }
  });
  run('pop', () => {
    if (!track || prevT == null) return;
    // appear / vanish events; a pose swap (one actor hidden as another of the same animal shows in its place, a duck up-ending:
    // the motion lint's "two poses of one animal") is not a pop
    const seen = new Set(), ev = [], base = (o) => String(o || '').replace(/-[a-z]+$/, '');
    for (const m of movers) {
      seen.add(m.id);
      const p = track.prev.get(m.id), a0 = p ? p.alpha : 0, a1 = _scxiVisible(m) ? m.alpha : 0;
      if (Math.abs(a1 - a0) > 0.5) ev.push({ m: a1 > a0 ? m : Object.assign({}, m, { X: p.X, Y: p.Y }), up: a1 > a0, a0, a1, inside: a1 > a0 ? _scxiInterior(m) && (!p || _scxiInterior(p)) : _scxiInterior(p) });
    }
    for (const [id, p] of track.prev) if (!seen.has(id) && p.alpha > 0.5) ev.push({ m: { id, obj: p.obj, X: p.X, Y: p.Y }, up: false, a0: p.alpha, a1: 0, inside: _scxiInterior(p) });
    // a vanish waits up to 0.5 s for its swap mate (the timeline may leave a step between the two poses)
    const pend = track.pend || (track.pend = []);
    const mateOf = (e, list) => list.find(f => f !== e && f.up !== e.up && !f.swap && (f.m.obj === e.m.obj || base(f.m.obj) === base(e.m.obj)) && Math.hypot(f.m.X - e.m.X, f.m.Y - e.m.Y) < 12);
    // swaps first (an appearing pose may come from a hidden row, so the inside test comes after the match)
    for (const e of ev) if (!e.swap) { const mate = mateOf(e, ev.concat(pend)); if (mate) { mate.swap = true; e.swap = true; } }
    for (const e of ev) {
      if (!e.inside || e.swap) continue;
      // a diving bird goes under and comes up again on the water (v3's 'dive' state): not a pop
      if (_SCXI_DIVER.test(e.m.obj || '') && (e.m.layer === 'swim' || (track.prev.get(e.m.id) || {}).layer === 'swim')) continue;
      if (!e.up) { e.t = t; pend.push(e); continue; }
      push('pop', e.m, `${e.m.obj} appears inside the frame at (${Math.round(e.m.X)}, ${Math.round(e.m.Y)}) (alpha ${_scxiR(e.a0)} -> ${_scxiR(e.a1)} in ${_scxiR(dt)} s)`);
    }
    for (let q = pend.length - 1; q >= 0; q--) {
      const e = pend[q];
      if (e.swap) { pend.splice(q, 1); continue; }
      if (t - e.t >= 0.5 - 1e-9) { pend.splice(q, 1); push('pop', e.m, `${e.m.obj} vanishes inside the frame at (${Math.round(e.m.X)}, ${Math.round(e.m.Y)}) (alpha ${_scxiR(e.a0)} -> 0 at t ${_scxiR(e.t)} s)`); }
    }
  });
  run('teleport', () => {
    if (!track || prevT == null || !(dt > 0) || !cam) return;
    for (const m of movers) {
      const p = track.prev.get(m.id);
      if (!p || !_scxiVisible(m) || !(p.alpha > 0.3 && p.s > 0) || !_scxiOnScreen(m, 40)) continue;
      // the screen jump against the most its top speed allows at its depth (sideways is the fastest on screen: f / d px a metre)
      const jump = Math.hypot(m.X - p.X, m.Y - p.Y), dMin = Math.max(0.5, Math.min(m.d, p.d)), allow = 2 * m.vmax * dt * cam.f / dMin + 4;
      if (jump > allow) push('teleport', m, `${m.obj} jumps ${Math.round(jump)} px in ${_scxiR(dt)} s (at most ${Math.round(allow)} px at ${_scxiR(m.vmax)} m/s, ${_scxiR(dMin)} m)`);
    }
  });
  run('faceSlide', () => {
    if (!cam || typeof sceneHeadingView !== 'function') return;
    for (const m of movers) {
      if (!shown(m) || !_scxiOnScreen(m, 0) || m.layer === 'rail' || m.layer === 'drive') continue;
      const sp = Math.hypot(m.vx || 0, m.vd || 0);
      if (sp < 0.25) continue;
      const prev = track ? track.face.get(m.id) : null, r = sceneHeadingView(m.obj, m.vx, m.vd, m.x, m.d, prev);
      if (track) track.face.set(m.id, Object.assign(track.face.get(m.id) || {}, { view: r.view, flip: r.flip }));
      if (r.view === 'side' && r.want !== 'side' && r.off > 42.5) push('faceSlide', m, `${m.obj} is drawn side-on moving ${Math.round(r.off)} degrees off side-on (no '${r.want}' view): it slides`);
      // the mirror against the motion on screen (side and three-quarter views only): moonwalking
      const p = track && track.prev.get(m.id);
      // (held for two frames: a turn round is eased over a.turn seconds and may straddle one step)
      const bad = !!(p && r.view !== 'front' && r.view !== 'back' && _scxiNum(m.dir) && Math.abs(m.X - p.X) > 3 && Math.sign(m.X - p.X) !== Math.sign(m.dir) && Math.abs(r.lat) > 0.5);
      const f = track ? track.face.get(m.id) : null, n = bad ? ((f && f.bad) || 0) + 1 : 0;
      if (f) f.bad = n;
      if (n === 2) push('faceSlide', m, `${m.obj} faces ${m.dir < 0 ? 'left' : 'right'} but moves ${m.X < p.X ? 'left' : 'right'} on screen`);
    }
  });
  run('stuck', () => {
    if (!track) return;
    for (const m of movers) {
      // people, dogs and flow agents on their way (resting birds and boats idle by design, v3's idle states)
      if (m.kind !== 'flow' && m.cls !== 'person' && m.cls !== 'cyclist' && m.cls !== 'animal-dog') continue;
      let h = track.stuck.get(m.id);
      if (!h || !_scxiVisible(m)) { track.stuck.set(m.id, { x: m.x, d: m.d, X: m.X, Y: m.Y, since: t, flagged: false }); continue; }
      if (Math.hypot(m.x - h.x, m.d - h.d) > 0.3 || Math.hypot(m.X - h.X, m.Y - h.Y) > 3) { h.x = m.x; h.d = m.d; h.X = m.X; h.Y = m.Y; h.since = t; h.flagged = false; continue; }
      const lim = Math.max(10, (m.maxWait || 0) + 2);
      if (t - h.since > lim && !h.flagged && (m.vmax > 0)) { h.flagged = true; push('stuck', m, `${m.obj} has made no progress for ${Math.round(t - h.since)} s at (${Math.round(m.X)}, ${Math.round(m.Y)})`); }
    }
  });
  if (track) {
    track.prev = new Map(movers.map(m => [m.id, { alpha: _scxiVisible(m) ? m.alpha : 0, s: m.s, X: m.X, Y: m.Y, x: m.x, d: m.d, obj: m.obj, layer: m.layer }]));
    track.t = t; track.frames++;
  }
  return out;
}

/** A full loop that really advances t (see the head). */
function sceneXInvariantLoop(C, o) {
  o = o || {};
  const seconds = _scxiNum(o.seconds) && o.seconds > 0 ? o.seconds : 300, hz = _scxiNum(o.hz) && o.hz > 0 ? o.hz : 4, t0 = _scxiNum(o.t0) ? o.t0 : 0;
  const track = sceneXInvariantTracker(), counts = {}, samples = {}, pairs = new Set(), ids = new Set();
  const a = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let frames = 0, errors = 0, warns = 0, crowd = false, crowdError = null;
  for (const r of SCENE_X_INV_RULES) counts[r.rule] = 0;
  const n = Math.round(seconds * hz);
  for (let k = 0; k <= n; k++) {
    const t = t0 + k / hz, F = sceneXFrameAt(C, t, o.L || null, { data: o.data, crowd: o.crowd });
    crowd = crowd || F.crowd;
    if (F.crowdError && !crowdError) crowdError = F.crowdError;
    for (const m of F.movers) ids.add(m.id);
    const V = sceneXInvariants(C, F, track, { dt: 1 / hz, rules: o.rules });
    for (const v of V) {
      counts[v.rule] = (counts[v.rule] || 0) + 1;
      if (v.sev === 'error') errors++; else warns++;
      if (v.pair) pairs.add(v.pair);
      const s = samples[v.rule] || (samples[v.rule] = []);
      if (s.length < 5) s.push(v);
    }
    frames++;
  }
  const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - a;
  return { seconds, hz, frames, movers: ids.size, crowd, crowdError, counts, errors, warns, pairs: pairs.size, samples, ms: Math.round(ms) };
}

/** Is an object a GROUND mover (people, dogs, grazers, water and ground birds, boats; not fliers, insects or sky things)? */
function sceneXGroundMover(obj) {
  if (!obj || typeof sceneMoverSize !== 'function' || _SCXI_FLIER.test(obj)) return false;
  const cls = sceneMoverSize(obj).cls;
  return _SCXI_SIZED.includes(cls) || cls === 'boat';
}
/** A mover record's sprite box in scene units (the canvas's boxAt over the object's shapes box): its facing m.dir, else both. */
function sceneXMoverBox(m, season) {
  if (!m || !_scxiNum(m.X) || !_scxiNum(m.Y) || !(m.s > 0) || typeof sceneObjShapes !== 'function') return null;
  let sh = null;
  try { sh = sceneObjShapes(m.obj, m.v || 0, season || 'summer'); } catch (e) { sh = null; }
  if (!sh || !sh.box) return null;
  const b = sh.box, s = m.s, w = Math.max(Math.abs(b[0]), Math.abs(b[2]));
  // its facing when known (dir: 1 as drawn, -1 mirrored: the canvas's boxAt), else both facings
  if (m.dir === 1 || m.dir === -1) return m.dir < 0 ? [m.X - b[2] * s, m.Y + b[1] * s, m.X - b[0] * s, m.Y + b[3] * s] : [m.X + b[0] * s, m.Y + b[1] * s, m.X + b[2] * s, m.Y + b[3] * s];
  return [m.X - w * s, m.Y + b[1] * s, m.X + w * s, m.Y + b[3] * s];
}
