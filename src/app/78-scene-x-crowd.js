/* ============================================================
   SCENE ENGINE v2 + v3 systems: CROWD CORRECTIONS (merge package "crowd", 15 Oct). PURE: constants and functions only, no DOM
   at load (part of the Node registry load); every call into another module goes through a typeof guard; never calls world*.

   Why stateless. v2 movers are pure functions of t (sceneActorAt, sceneActorAtV2, sceneFlowAgents) and every tool (sheet,
   capture, prebake, scrubbing) depends on that. So the crowd fix is a pure function too: it takes the BASE places of every
   ground mover at t (actors and flow agents together, so they see each other) and their base velocities (from t and t - 0.25 s)
   and returns RESOLVED places. Base places are continuous in t and every correction below is a smooth function of them
   (smoothstep ramps, tanh side choices, no thresholds that switch a correction on at full strength), so the result is
   continuous: no jitter, scrubbable, the same on every replay.

   The corrections, adapted from the v3 life sim (src/app/79-world-2life.js):
   1. Passing (_wlfPassBy, _wlfSteer's velocity obstacle, one formula): two movers on one layer whose RELATIVE motion would
      bring them closer than their bodies (r + r + gap) step sideways off that line, each by its share (the faster or the
      moving one more), over the encounter (full within ~1.5 m of each other along the relative line, nothing beyond ~4 m, so
      they return to their line after passing). The side: the one they are already on, with the UK bias: head-on, each keeps
      to its LEFT; overtaking, the faster passes on the slower one's RIGHT (_wlfPassBy's preference). Crossing paths: the
      sidestep is across the relative motion (a slight slow-down or hurry).
   2. Push-apart (_wlfResolve, _wlfBody radii: a person's shoulders 0.28 m, dogs and birds by size): a few Jacobi rounds that
      move two bodies apart to touching; a moving boat (a capsule) never gives way. Group mates (a dog and its walker, a
      chatting pair, a duck and its companion) are exempt from (1) but not from (2).
   3. Legal ground (worldStep's rule): every corrected point is checked against the nav grid of its layer (78-scene-x-nav.js);
      the correction is shrunk toward the base place until legal (or no worse than the base), so a correction never puts a
      mover in a wall, a hedge, a boat or the water (or, for a swimmer, on land).
   The flows keep their lane headway (_scflBase): within one lane they never overlap; the pass adds the cross-lane, cross-flow
   and actor-flow cases.

     sceneXCrowdAt(C, t, L, o) -> [{ id, kind: 'actor' | 'flow', obj, cls, x, d, h, X, Y, s, alpha, r, layer, moving, vx, vd,
       group, bx, bd (the base place), ref (the actor or agent) }] exactly as drawn. o: { actors (the list the renderer draws;
       default sceneMotionFixed(C)), flows (the flow agents at t, else sceneFlowAgents), pre (Map actor -> its base place at t,
       the renderer's), cam (the v2 actors' camera), crowd: false (the base places only) }
     sceneXCrowdOn(C)          -> false when switched off (window.__sceneOpts.x.crowd === false, C.x.crowd === false, SCENE_X=off)
     sceneXCrowdPairs(C, o)    -> { pairs, frames, near: [...] } person pairs closer than o.dist (0.55 m) over o.seconds (300) at
                                  o.hz (4): the measure of this package (base vs resolved: o.crowd)
   Private names: _scxc*.
   ============================================================ */
const SCENE_X_CROWD = Object.freeze({
  dt: 1,               // the base velocity: (place at t + dt - place at t - dt) / 2 dt (a 2 s window: a pause or a corner turns it smoothly)
  gap: 0.12,           // clear ground between two bodies when they pass
  bias: 0.25,          // metres of preference for a pair's fixed side (the later mover passes on the + side)
  sideSoft: 0.2,       // the side choice's softness (tanh scale, metres)
  full: 1.4,           // apart: the full sidestep within this (plus 0.3 x the closing speed)
  ramp: 2.4,           // ... falling to nothing over this many metres more
  iters: 4,            // solver rounds (passing constraints, push-apart, legal clamp)
  maxOff: 1.5,         // the largest correction (metres: a duck in a moving boat's way moves up to its half beam and more)
});
/** Body radii (metres) by class, else by object: the v3 _wlfBody (a person's shoulders 0.28 m) and the nav radii by size. */
const _SCXC_BODY = [[/swan/, 0.3], [/goose/, 0.25], [/coot|moorhen/, 0.12], [/grebe|mallard|duck|teal|wigeon|pochard|tufted|mandarin/, 0.15], [/heron|egret/, 0.2],
  [/cattle|cow|galloway|highland|pony|horse|donkey/, 0.7], [/deer|stag/, 0.5], [/sheep|lamb/, 0.45], [/fox/, 0.2], [/rabbit|hare|squirrel/, 0.1]];
function _scxcBody(cls, id) {
  if (/kayak|canoe|paddleboard|rower|rowing|punt/.test(id)) return 0.6;   // a person afloat: the craft
  if (cls === 'person') return 0.28;
  if (cls === 'cyclist' || /cyclist|bike/.test(id)) return 0.42;
  if (cls === 'animal-dog') return 0.2;
  for (const [re, r] of _SCXC_BODY) if (re.test(id)) return r;
  if (cls === 'bird-water' || cls === 'bird-ground') return 0.15;
  return 0.3;
}
const _scxcSmooth = (a, b, v) => { const u = (v - a) / (b - a); if (u <= 0) return 0; if (u >= 1) return 1; return u * u * (3 - 2 * u); };
/** On for a v2 scene and a v1 scene that opted into the v2 effects (fx: { water: 2, ... }); a plain v1 scene keeps its frames
    pixel-identical (V2 14.1), so the pass never touches it; and off by the switches. */
function sceneXCrowdOn(C) {
  if (C && C.v !== 2 && !(C.fx && typeof C.fx === 'object' && Object.keys(C.fx).some(k => C.fx[k] === 2))) return false;
  return typeof _scxnSwitch === 'function' ? _scxnSwitch('crowd', C) : true;
}

/* ---------- the base places ---------- */
const _scxcCams = new WeakMap();
/** The camera the renderer places v2 ground actors with (sceneRenderCam, else C.cam). */
function _scxcCamOf(C) {
  if (_scxcCams.has(C)) return _scxcCams.get(C);
  let cam = null;
  try { cam = typeof sceneRenderCam === 'function' ? sceneRenderCam(C) : null; } catch (e) { cam = null; }
  if (!cam || !Number.isFinite(cam.f)) cam = C && C.cam && Number.isFinite(C.cam.f) ? C.cam : null;
  _scxcCams.set(C, cam);
  return cam;
}
/** An actor's base place at t, as the renderer has it: { X, Y, s, alpha, x?, d? } (screen units; a v2 ground actor also metres). */
function _scxcActorPos(a, t, cam) {
  if (a.ground && typeof sceneActorAtV2 === 'function' && cam) {
    try { const q = sceneActorAtV2(a, t, cam); if (q) return { X: q.X != null ? q.X : q.x, Y: q.Y != null ? q.Y : q.y, s: q.s, alpha: q.alpha == null ? 1 : q.alpha, x: q.x, d: q.d, v2: true }; } catch (e) { /* the v1 path */ }
  }
  if (typeof sceneActorAt !== 'function') return null;
  const q = sceneActorAt(a, t);
  return q ? { X: q.x, Y: q.y, s: q.s, alpha: q.alpha == null ? 1 : q.alpha } : null;
}
/** Screen place -> ground metres for an actor (its ground record's own metres for a v2 ground actor). */
function _scxcGround(W, p, h) {
  if (!p || !(p.s > 0) || (p.alpha != null && !(p.alpha > 0))) return null;
  if (p.v2 && Number.isFinite(p.x) && Number.isFinite(p.d)) return [p.x, p.d];
  if (!(p.Y > W.cam.horizon + 0.5) || p.Y > 4000) return null;
  return W.unproj(p.X, p.Y, h);
}
/** The movers' info of a compiled scene's actors (memoised per list): [{ i, a, ms, cls, layer, r, floats, h, len, w }] (ground movers only). */
const _scxcInfo = new WeakMap();
function _scxcActorsInfo(W, actors) {
  if (_scxcInfo.has(actors)) return _scxcInfo.get(actors);
  const out = [];
  actors.forEach((a, i) => {
    if (!a || typeof _scgrGroundMover !== 'function') return;
    let ms = null;
    try { ms = _scgrGroundMover(a); } catch (e) { ms = null; }
    if (!ms) return;
    const id = a.o || a.obj, layer = typeof sceneXNavLayerOf === 'function' ? sceneXNavLayerOf(ms.cls, id) : null;
    if (!layer) return;
    const floats = ms.cls === 'boat' || ms.cls === 'bird-water';
    out.push({ i, a, ms, cls: ms.cls, id, layer, r: _scxcBody(ms.cls, id), floats, h: floats ? W.cam.water || 0 : 0, boat: ms.cls === 'boat', len: ms.l || 10, w: ms.w || 2 });
  });
  _scxcInfo.set(actors, out);
  return out;
}
/** The crowd layer of a flow agent (walkers and cyclists walk, grazers graze, boats swim; traffic and trains: none). */
const _scxcFlowLayer = (ag) => (ag.kind === 'walk' || ag.kind === 'cycle' ? 'walk' : ag.kind === 'graze' ? 'graze' : ag.kind === 'boat' ? 'swim' : null);

/* ---------- groups: movers that keep together (a dog and its walker, a chatting pair, a duck and its companion) ---------- */
const _scxcGroupMemo = new WeakMap();
/**
 * Groups of a scene's actors, found from their base places over two minutes (every 2 s): two movers of one layer that are both
 * shown in at least 10 samples, within 2.5 m of each other at the median and within 4 m in 60 % of them, are mates. Deterministic
 * (a function of the actors alone), memoised per actor list. -> Map actor index -> group id.
 */
function _scxcGroups(W, info, cam, actors) {
  if (_scxcGroupMemo.has(actors)) return _scxcGroupMemo.get(actors);
  const S = [];
  for (const m of info) {
    const row = [];
    for (let t = 0; t <= 120; t += 2) { const g = _scxcGround(W, _scxcActorPos(m.a, t, cam), m.h); row.push(g); }
    S.push(row);
  }
  const parent = info.map((_, k) => k), find = (k) => (parent[k] === k ? k : (parent[k] = find(parent[k])));
  // built on one clock (a walker and its dog, a chatting pair, a duck and its companion: sceneBehave gives them one cycle and one
  // offset): mates, however far the dog runs ahead
  const cyc = info.map(m => _scxcCycle(m.a));
  for (let u = 0; u < info.length; u++) for (let v = u + 1; v < info.length; v++) {
    if (info[u].layer !== info[v].layer || !cyc[u] || !cyc[v]) continue;
    if (Math.abs(cyc[u] - cyc[v]) < 0.6 && Math.abs((info[u].a.offset || 0) - (info[v].a.offset || 0)) < 1e-6) parent[find(u)] = find(v);
  }
  for (let u = 0; u < info.length; u++) for (let v = u + 1; v < info.length; v++) {
    if (info[u].layer !== info[v].layer) continue;
    const ds = [];
    for (let k = 0; k < S[u].length; k++) { const p = S[u][k], q = S[v][k]; if (p && q) ds.push(Math.hypot(p[0] - q[0], p[1] - q[1])); }
    if (ds.length < 10) continue;
    ds.sort((x, y) => x - y);
    if (ds[Math.floor(ds.length / 2)] < 2.5 && ds.filter(x => x < 4).length >= 0.6 * ds.length) parent[find(u)] = find(v);
  }
  const out = new Map();
  info.forEach((m, k) => { const g = find(k); if (info.some((_, j) => j !== k && find(j) === g)) out.set(m.i, 'g' + info[g].i); });
  _scxcGroupMemo.set(actors, out);
  return out;
}

/** The cycle (seconds) of a timed path (every leg after the first has its seconds), else null. */
function _scxcCycle(a) {
  const P = a && a.path;
  if (!Array.isArray(P) || P.length < 2 || !P.some(p => p.length > 2)) return a && a.$behave && a.$behave.cycle || null;
  let T = 0;
  for (let i = 0; i < P.length; i++) {
    if (i) { const d = P[i][4]; if (d == null) { if (!(a.speed > 0)) return null; T += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) / a.speed; } else T += +d; }
    T += +(P[i][2] || 0);
  }
  return T;
}

/* ---------- the nav grids of a scene (one per layer, over every route) ---------- */
const _scxcNavMemo = new WeakMap();
function _scxcNav(C, W, info, layer) {
  let per = _scxcNavMemo.get(C);
  if (!per) { per = new Map(); _scxcNavMemo.set(C, per); }
  if (per.has(layer)) return per.get(layer);
  // the box: every route of this layer (ground metres; the visible part of the frustum, to 300 m)
  let box = null;
  const add = (x, d) => {
    if (!(d > 0.3) || d > 300 || !Number.isFinite(x)) return;
    const half = (1700 / Math.max(1, W.cam.f)) * d / 2 + 8;   // the frame's width at that depth, and some
    if (Math.abs(x) > half + Math.abs(W.cam.x0 - 800) * d / W.cam.f) return;
    box = box ? [Math.min(box[0], x), Math.min(box[1], d), Math.max(box[2], x), Math.max(box[3], d)] : [x, d, x, d];
  };
  for (const m of info) {
    if (m.layer !== layer) continue;
    const a = m.a;
    if (Array.isArray(a.ground)) for (const p of a.ground) add(p[0], p[1]);
    else if (Array.isArray(a.path)) for (const p of a.path) { if (!(p[1] > W.cam.horizon + 0.5) || p[1] > 4000) continue; const g = W.unproj(p[0], p[1], m.h); if (g) add(g[0], g[1]); }
  }
  for (const F of C.flows || []) if (_scxcFlowLayer({ kind: F.kind }) === layer) for (const ln of F.lanes || []) for (const p of ln.path || []) add(p[0], p[1]);
  const nav = box && typeof sceneXNavFor === 'function' ? sceneXNavFor(C, layer, box) : null;
  per.set(layer, nav);
  return nav;
}

/**
 * The lateral axis of a pair: across the principal direction of their relative travel (rv) and, weighted 0.3, their shared heading
 * (sum): the main axis of the tensor rv rv' + 0.09 sum sum' (sign-free and continuous, unlike adding the vectors), turned to one fixed
 * screen-wise orientation (+x and a little +d) so it never flips with who approaches whom. -> [nx, nd]
 */
function _scxcAxis(vx, vd, sx, sd) {
  const txx = vx * vx + 0.09 * sx * sx, tdd = vd * vd + 0.09 * sd * sd, txd = vx * vd + 0.09 * sx * sd;
  const th = 0.5 * Math.atan2(2 * txd, txx - tdd);
  let nx = -Math.sin(th), nd = Math.cos(th);
  if (nx * 0.94 + nd * 0.34 < 0) { nx = -nx; nd = -nd; }
  return [nx, nd];
}

/* ---------- the pass ---------- */
/**
 * Every ground mover at t with its resolved place. See the file head. Pure: depends on (C, t, L) and the lists given.
 */
function sceneXCrowdAt(C, t, L, o) {
  o = o || {};
  const W = typeof sceneMotionWorld === 'function' ? sceneMotionWorld(C) : null;
  if (!W) return [];
  const X = SCENE_X_CROWD, dt = X.dt, cam = o.cam || _scxcCamOf(C);
  const actors = o.actors || (typeof sceneMotionFixed === 'function' ? sceneMotionFixed(C) : C.actors || []);
  const info = _scxcActorsInfo(W, actors), groups = info.length > 1 ? _scxcGroups(W, info, cam, actors) : new Map();
  const recs = [];
  for (const m of info) {
    const p = (o.pre && o.pre.get(m.a)) || _scxcActorPos(m.a, t, cam), g = _scxcGround(W, p, m.h);
    if (!g) continue;
    // the travel (a centred 2 s window: smooth through pauses and corners; a hidden end: the one-sided half)
    const g0 = _scxcGround(W, _scxcActorPos(m.a, t - dt, cam), m.h), g1 = _scxcGround(W, _scxcActorPos(m.a, t + dt, cam), m.h);
    const a0 = g0 || g, a1 = g1 || g, span = (g0 ? dt : 0) + (g1 ? dt : 0);
    const vx = span ? (a1[0] - a0[0]) / span : 0, vd = span ? (a1[1] - a0[1]) / span : 0;
    recs.push({ id: 'a' + m.i, kind: 'actor', obj: m.id, cls: m.cls, x: g[0], d: g[1], h: m.h, X: p.X, Y: p.Y, s: p.s, alpha: p.alpha == null ? 1 : p.alpha, r: m.r, layer: m.layer,
      moving: Math.hypot(vx, vd) > 0.05, vx, vd, group: groups.get(m.i) || null, bx: g[0], bd: g[1], ref: m.a, boat: m.boat, len: m.len, beam: m.w, v2: !!p.v2 });
  }
  const fcam = C.cam && Number.isFinite(C.cam.f) ? C.cam : null;
  const flows = o.flows || (C.flows && C.flows.length && typeof sceneFlowAgents === 'function' ? sceneFlowAgents(C, t, L, {}) : []);
  for (const ag of flows) {
    const layer = _scxcFlowLayer(ag);
    if (!layer || !fcam || !Number.isFinite(ag.x) || !Number.isFinite(ag.d)) continue;
    const sp = ag.speed || 0, vx = (ag.dirX || 0) * sp, vd = (ag.dirD || 0) * sp;
    recs.push({ id: 'f' + ag.flow + '.' + ag.lane + '.' + ag.k, kind: 'flow', obj: ag.o, cls: ag.cls, x: ag.x, d: ag.d, h: ag.h || 0, X: ag.X, Y: ag.Y, s: ag.s, alpha: ag.alpha == null ? 1 : ag.alpha,
      r: _scxcBody(ag.cls, ag.o), layer, moving: !!ag.moving && sp > 0.05, vx, vd, group: null, bx: ag.x, bd: ag.d, ref: ag, boat: ag.kind === 'boat', len: ag.len || 10, beam: 2, lane: ag.flow + '.' + ag.lane });
  }
  if (o.crowd === false || !sceneXCrowdOn(C) || recs.length < 2) return recs;
  _scxcResolve(C, W, info, recs, cam, fcam);
  return recs;
}
/** The corrections (see the file head), then the legal shrink and the screen place of every corrected record. */
function _scxcResolve(C, W, info, recs, cam, fcam) {
  const X = SCENE_X_CROWD, n = recs.length;
  const sp = recs.map(r => Math.hypot(r.vx, r.vd)), mw = sp.map(v => _scxcSmooth(0.08, 0.35, v));
  const navs = new Map(), navOf = (layer) => { if (!navs.has(layer)) navs.set(layer, _scxcNav(C, W, info, layer)); return navs.get(layer); };
  // 1. the passing constraints: for each pair that would pass closer than their bodies, a lateral axis (across their relative
  //    travel), a side and a weight (the encounter). Constraints, not summed pushes: several walkers meeting on one towpath line share one consistent answer.
  const cons = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const A = recs[i], B = recs[j];
    if (A.layer !== B.layer || A.boat || B.boat) continue;
    if (A.group && A.group === B.group) continue;
    if (A.lane && A.lane === B.lane) continue;      // one flow lane keeps its own headway (no overtaking within a lane)
    const rx = B.x - A.x, rd = B.d - A.d, dist = Math.hypot(rx, rd);
    if (dist > 10) continue;
    const vx = B.vx - A.vx, vd = B.vd - A.vd, rv = Math.hypot(vx, vd), wv = _scxcSmooth(0.08, 0.3, rv);
    if (!(wv > 0)) continue;
    // the lateral axis: across their travel (their relative travel, and their shared heading when that is small), turned to one
    // fixed screen-wise orientation (so it never flips with who approaches whom)
    const [nx, nd] = _scxcAxis(vx, vd, A.vx + B.vx, A.vd + B.vd);
    // the encounter: full while they are within ~1.5 m of each other, nothing beyond ~4 m (by distance: symmetric before and after;
    // a fast pair, a cyclist meeting a walker, starts sooner and eases longer)
    const full = X.full + 0.3 * rv, ww = 1 - _scxcSmooth(full, full + X.ramp + 0.5 * rv, dist);
    if (!(ww > 0)) continue;
    // how far apart across that axis they would pass (straight-line prediction from now): only a pair that would brush counts
    const m = rx * nx + rd * nd, S = A.r + B.r + X.gap, need = Math.max(0, S - Math.abs(m)), gN = _scxcSmooth(0, 0.08, need);
    if (!(gN > 0)) continue;
    // the side: the one B is already on, else a FIXED one per pair (the later mover on the + side: the order is transitive, so three
    // on one line agree). A stateless pass cannot switch between v3's keep-left and overtake-on-the-right rules, or lean to the
    // side with room, mid-encounter without a visible jump (a dog sprinting from a sniff, a cyclist sweeping past a bench at 4 m/s
    // sees the clearance change ten times a second), so the side is fixed and room is the solver's business: each round ends with
    // the legal clamp, and a mover with no room on its side leaves the whole step to the other.
    const side = Math.tanh((m + X.bias) / X.sideSoft);
    // the shares: the faster (or the moving) one steps more
    const shA = (0.2 + sp[i]) / (0.4 + sp[i] + sp[j]);
    const w = ww * wv * gN * Math.min(A.alpha, B.alpha);
    if (typeof globalThis !== 'undefined' && globalThis.__scxcDbg) globalThis.__scxcDbg.push({ A: A.id, B: B.id, m, need, ww, wv, side, w, shA });
    cons.push({ i, j, nx, nd, target: side * S, w, shA });
  }
  // 2. solve: a few Gauss-Seidel rounds (position based). The passing constraints pull each pair toward its lateral separation; the
  //    push-apart keeps every two bodies (group mates too) from overlapping (a moving boat, a capsule along its travel, never
  //    gives way); each round ends with the legal clamp, so the next round's partner takes the share a blocked one cannot.
  const px = recs.map(r => r.x), pd = recs.map(r => r.d);
  const sd0 = recs.map(R => { const nav = navOf(R.layer); return nav ? sceneXNavSd(nav, R.x, R.d) : Infinity; });
  for (let it = 0; it < X.iters; it++) {
    for (const q of cons) {
      const m = (px[q.j] - px[q.i]) * q.nx + (pd[q.j] - pd[q.i]) * q.nd, e = (q.target - m) * q.w;
      px[q.i] -= e * q.shA * q.nx; pd[q.i] -= e * q.shA * q.nd;
      px[q.j] += e * (1 - q.shA) * q.nx; pd[q.j] += e * (1 - q.shA) * q.nd;
    }
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const A = recs[i], B = recs[j];
      if (A.layer !== B.layer || (A.boat && B.boat) || (A.lane && A.lane === B.lane)) continue;
      if (A.group && A.group === B.group && A.obj === B.obj && A.kind === 'actor' && B.kind === 'actor' && (!(sp[i] > 0.05) || !(sp[j] > 0.05))) continue;   // one animal in two poses (a duck and its up-ended companion)
      let ax = px[i], ad = pd[i], bx = px[j], bd = pd[j], minD = A.r + B.r + 0.02;
      // a boat: the nearest point of its keel line
      const boat = A.boat ? A : B.boat ? B : null;
      if (boat) {
        const bi = boat === A ? i : j, v = sp[bi], hx = v > 0.05 ? boat.vx / v : 1, hd = v > 0.05 ? boat.vd / v : 0, half = Math.max(0, boat.len / 2 - boat.beam / 2);
        const cx = px[bi], cd = pd[bi], oi = boat === A ? j : i, u = Math.max(-half, Math.min(half, (px[oi] - cx) * hx + (pd[oi] - cd) * hd));
        if (boat === A) { ax = cx + hx * u; ad = cd + hd * u; } else { bx = cx + hx * u; bd = cd + hd * u; }
        minD = boat.beam / 2 + (boat === A ? B.r : A.r) + 0.05;
      }
      const rx = bx - ax, rd = bd - ad, dist = Math.hypot(rx, rd);
      if (dist >= minD) continue;
      // the way apart. Two that are passing each other (relative travel): ACROSS their relative line only, to the pair's side (the
      // passing constraint's rule), never along it (a push along it would hold them back, then fling them on, as they cross).
      // Two at rest together: along the line between them, with a fixed tie-break (B, the later one, toward +x), so two movers
      // resting on one spot never swap sides frame to frame. Blended by the relative speed, so nothing switches.
      const vx = B.vx - A.vx, vd = B.vd - A.vd, rv = Math.hypot(vx, vd), wr = _scxcSmooth(0.05, 0.3, rv);
      let ex = 0, ed = 0;
      if (wr < 1) {
        const sr = Math.tanh((rx + 0.04) / 0.05), lx = rx + (1 - Math.abs(rx) / minD) * minD * 0.5 * (dist < 1e-6 ? sr : 0), l = Math.hypot(lx, rd) || 1;
        const k = (minD - dist) * (1 - wr);
        ex += (dist > 1e-6 ? rx / dist : sr) * k; ed += (dist > 1e-6 ? rd / dist : 0) * k;
        void l;
      }
      if (wr > 0) {
        const [nx, nd] = _scxcAxis(vx, vd, A.vx + B.vx, A.vd + B.vd), m = rx * nx + rd * nd, al = rx * nd - rd * nx;
        const needLat = Math.sqrt(Math.max(0, minD * minD - al * al));
        const sg = Math.tanh((m + X.bias) / X.sideSoft), e = sg * needLat - m;
        if (e * sg > 0) { ex += nx * e * wr; ed += nd * e * wr; }
      }
      const a2 = Math.min(A.alpha, B.alpha), shA = A.boat ? 0 : B.boat ? 1 : 0.5, shB = 1 - shA;
      px[i] -= ex * a2 * shA; pd[i] -= ed * a2 * shA;
      px[j] += ex * a2 * shB; pd[j] += ed * a2 * shB;
    }
    // the legal clamp (worldStep's rule): the largest share of each correction its nav grid accepts, from the base outward (the
    // FIRST illegal share: an island of legal ground beyond a bank never pulls a mover across it; no worse than the base when the
    // base itself is off), found by bisection on the bilinear clearance, so it is continuous in the inputs
    for (let i = 0; i < n; i++) {
      const R = recs[i], nav = navOf(R.layer);
      let cx = px[i] - R.x, cd = pd[i] - R.d;
      const cl = Math.hypot(cx, cd);
      if (cl < 1e-6) continue;
      if (cl > X.maxOff) { cx *= X.maxOff / cl; cd *= X.maxOff / cl; }
      let k = 1;
      if (nav) {
        const okAt = (u) => { const s = sceneXNavSd(nav, R.x + cx * u, R.d + cd * u); return s >= 0 || s >= sd0[i]; };
        for (let q = 1; q <= 6; q++) {
          if (okAt(q / 6)) continue;
          let lo = (q - 1) / 6, hi = q / 6;
          for (let z = 0; z < 5; z++) { const mid = (lo + hi) / 2; if (okAt(mid)) lo = mid; else hi = mid; }
          k = lo; break;
        }
      }
      px[i] = R.x + cx * k; pd[i] = R.d + cd * k;
    }
  }
  for (let i = 0; i < n; i++) {
    const R = recs[i];
    if (Math.abs(px[i] - R.x) < 1e-6 && Math.abs(pd[i] - R.d) < 1e-6) continue;
    _scxcPlace(R, px[i], Math.max(0.5, pd[i]), W, cam, fcam);
  }
}
/** Move a record to (x, d) metres: its screen place and scale from its own projection (scale goes as 1 / depth). */
function _scxcPlace(R, x, d, W, cam, fcam) {
  if (R.kind === 'flow') {
    const c = fcam;
    R.X = c.x0 + c.f * x / d; R.Y = c.horizon + c.f * (c.eye - (R.h || 0)) / d;
  } else if (R.v2 && cam && typeof sceneProject === 'function') {
    const P = sceneProject(cam, x, d, R.h ? R.h : null); R.X = P.X; R.Y = P.Y;
  } else { const P = W.proj(x, d, R.h); R.X = P.X; R.Y = P.Y; }
  R.s = R.s * R.d / d;
  R.x = x; R.d = d;
}

/* ---------- the measure ---------- */
/**
 * Person pairs closer than o.dist (0.55 m) over a loop: { frames, pairs (pair-frames), near (the first 20), offLayer (resolved points
 * off their layer's ground, where the base was on it), maxStep (the largest step over its base step plus speed x dt), maxExtra
 * (the largest step beyond what the base moved, m/s) }. o: { seconds 300, hz 4, crowd (false: the base places), dist }.
 */
function sceneXCrowdPairs(C, o) {
  o = o || {};
  const T = o.seconds || 300, hz = o.hz || 4, dist = o.dist || 0.55, W = typeof sceneMotionWorld === 'function' ? sceneMotionWorld(C) : null;
  const out = { frames: 0, pairs: 0, near: [], offLayer: 0, maxExtra: 0, ms: 0, movers: 0 };
  if (!W) return out;
  let prev = null;
  for (let k = 0; k <= T * hz; k++) {
    const t = k / hz, a0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const recs = sceneXCrowdAt(C, t, o.L || null, { crowd: o.crowd });
    out.ms += (typeof performance !== 'undefined' ? performance.now() : Date.now()) - a0;
    out.frames++; out.movers = Math.max(out.movers, recs.length);
    const ppl = recs.filter(r => r.layer === 'walk' && (r.cls === 'person' || r.cls === 'cyclist') && r.alpha > 0.3 && r.s > 0);
    for (let i = 0; i < ppl.length; i++) for (let j = i + 1; j < ppl.length; j++) {
      const A = ppl[i], B = ppl[j];
      if (A.group && A.group === B.group) continue;
      const dd = Math.hypot(A.x - B.x, A.d - B.d);
      if (dd < dist && W.shown(A.x, A.d)) { out.pairs++; if (out.near.length < 20) out.near.push({ t, a: A.id, b: B.id, dist: Math.round(dd * 100) / 100, at: [Math.round(A.x * 10) / 10, Math.round(A.d * 10) / 10] }); }
    }
    const nav = new Map();
    for (const R of recs) {
      if (R.x === R.bx && R.d === R.bd) continue;
      if (!nav.has(R.layer)) nav.set(R.layer, _scxcNav(C, W, _scxcActorsInfo(W, typeof sceneMotionFixed === 'function' ? sceneMotionFixed(C) : C.actors || []), R.layer));
      const g = nav.get(R.layer);
      if (g && sceneXNavSd(g, R.x, R.d) < 0 && sceneXNavSd(g, R.bx, R.bd) >= 0) out.offLayer++;
    }
    if (prev) for (const R of recs) {
      const P = prev.get(R.id);
      if (!P) continue;
      const step = Math.hypot(R.x - P.x, R.d - P.d), base = Math.hypot(R.bx - P.bx, R.bd - P.bd);
      out.maxExtra = Math.max(out.maxExtra, (step - base) * hz);
    }
    prev = new Map(recs.map(R => [R.id, R]));
  }
  out.ms = Math.round(out.ms / Math.max(1, out.frames) * 1000) / 1000;
  out.maxExtra = Math.round(out.maxExtra * 100) / 100;
  return out;
}

/* ---------- phase de-conflict (compile time) ---------- */
/**
 * Movers that share a NARROW stretch (walkable less than two bodies wide: a boardwalk, a gap in a hedge) cannot pass each other
 * there whatever the crowd pass does, so their PHASES are chosen to keep them apart there: for each walker that meets another in
 * such a place (both within 1 m, over two minutes at 2 Hz), a deterministic search over 24 shifts of its offset (its group mates
 * shifted with it) keeps the one with the fewest such meetings (the smallest shift on a tie; no change unless it helps).
 * actors: the list the renderer draws (sceneMotionFixed). -> { offsets: Map index -> new offset, log: [{ i, obj, from, to, before,
 * after }] } (the motion lint reports it as moverPhase, info). Pure; nothing when the crowd is off or no stretch is narrow.
 */
function sceneXPhase(C, actors) {
  const out = { offsets: new Map(), log: [] };
  if (!sceneXCrowdOn(C) || !Array.isArray(actors) || typeof sceneMotionWorld !== 'function') return out;
  const W = sceneMotionWorld(C);
  if (!W) return out;
  const cam = _scxcCamOf(C), info = _scxcActorsInfo(W, actors).filter(m => m.layer === 'walk');
  if (info.length < 2) return out;
  const nav = _scxcNav(C, W, _scxcActorsInfo(W, actors), 'walk');
  if (!nav) return out;
  const T = 120, step = 0.5, N = Math.round(T / step) + 1, groups = _scxcGroups(W, _scxcActorsInfo(W, actors), cam, actors);
  // each walker's base track for a given offset (a copy of the actor with that offset)
  const track = (m, off) => { const a = Object.assign({}, m.a, { offset: off }), r = []; for (let k = 0; k < N; k++) r.push(_scxcGround(W, _scxcActorPos(a, k * step, cam), m.h)); return r; };
  // narrow: under 0.7 m of walkable width (clearance 0.35 m each side): single file, where the crowd pass has no room to step aside
  const narrow = (p) => p && W.shown(p[0], p[1]) && sceneXNavSd(nav, p[0], p[1]) < 0.35 && sceneXNavSd(nav, p[0], p[1]) > -0.3;
  const base = info.map(m => track(m, m.a.offset || 0));
  if (!base.some(tr => tr.some(narrow))) return out;
  const meets = (A, B) => { let n = 0; for (let k = 0; k < N; k++) { const p = A[k], q = B[k]; if (p && q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 1 && (narrow(p) || narrow(q))) n++; } return n; };
  const mates = (u, v) => { const g = groups.get(info[u].i); return !!g && g === groups.get(info[v].i); };
  const cur = base.slice(), offs = info.map(m => m.a.offset || 0);
  for (let u = 0; u < info.length; u++) {
    if (offs[u] !== (info[u].a.offset || 0)) continue;   // moved already, as a group mate
    const score = (tr) => info.reduce((s, _, v) => (v === u || mates(u, v) ? s : s + meets(tr, cur[v])), 0);
    const before = score(cur[u]);
    if (before < 2) continue;   // (a single brush: the push-apart's)
    let best = { k: 0, n: before, tr: cur[u] };
    for (let k = 1; k < 24; k++) {
      const off = ((offs[u] + k / 24) % 1 + 1) % 1, tr = track(info[u], off), n = score(tr);
      if (n < best.n || (n === best.n && Math.min(k, 24 - k) < Math.min(best.k, 24 - best.k) && n < before)) best = { k, n, tr };
      if (!n) break;
    }
    if (!best.k) continue;
    for (let v = 0; v < info.length; v++) {
      if (v !== u && !mates(u, v)) continue;
      const to = Math.round((((offs[v] + best.k / 24) % 1) + 1) % 1 * 1000) / 1000;
      out.log.push({ i: info[v].i, obj: info[v].id, from: offs[v], to, before, after: best.n });
      out.offsets.set(info[v].i, to); offs[v] = to; cur[v] = v === u ? best.tr : track(info[v], to);
    }
  }
  return out;
}
