/* ============================================================
   FRIENDS IN YOUR SCENES (2.17, agent 'scenes'): FRIENDS VISIT YOUR SCENE.
   Now and then, when a friend is around (Friends.presence: online, focusing or travelling) and shares their
   profile, their figure in their own outfit walks through the scene you are watching: in from one side of the
   frame, a stop to wave, out at the other side. A small name tag on hover or tap (and while they wave). At most
   two at once, at most one visit every 10 minutes, the same friend at most every 40, six a day; never under
   reduced motion or with animations off; Friends in your scenes can be turned off from any scene's menu.

   IT IS A SCENE MOVER, NOT A STICKER (docs/dev/SCENE_LESSONS.md, A, B and J). The visitor is drawn by the scene
   engine itself, through the render-pass registry (78-scene-0pass.js), so it obeys every rule the scene people do:
     - size from depth and the person size class (1.72 m on 64 art units, like person.walker), never by hand; the
       depth keeps the whole figure between 64 and 300 scene units tall (moverNear: under 45 % of the frame)
     - the route is the engine's own walkable map (78-scene-x-nav.js sceneXNavFor 'walk': walkable surfaces,
       clear of water, hulls, walls, fences, trunks and benches, a person's clearance), across the frame at one
       depth (a side view faces its heading: a lateral route, or an A* detour that stays within 25 degrees of it,
       its corners rounded), entering and leaving beyond the frame's sides (no popping)
     - the gait is sceneBehave's 'stroll' preset (speed, step, swing, arm, bob, the ease into and out of the stop);
       the legs turn with a planted stance and their phase follows the ground covered, so the feet never slide
     - drawn in the group of its depth band, y-sorted with that group's movers, with the canvas's occluder redraw
       (a nearer bench or hedge is drawn over it), its sprites from the bake's own rasteriser (the light, the
       haze, the night rim light); its shadow and reflection are the shadow and water passes' (env.flowNow, the
       same list the flow agents use), never drawn here
     - where the route would be mostly hidden behind nearer things, or no walkable line crosses the frame, there
       is no visit: a scene is never made strange to fit a friend in
   Scenes it visits: v2 scenes (a real camera, the walkable map) on the canvas. Not v1 or SVG scenes (no ground
   to walk on), not the v3 world scenes (their compositor draws its own agents), not stills, tiles or postcards.

   The figure: fscFigureObj (99s-friends-scenes-0core.js), a scene object per outfit; variant 0 walks, 1 waves.
   The wave: the walker eases to a stop near the middle of the frame, raises the near arm (0.35 s), waves for
   about 2 s and walks on; a 👋 bubble and the name tag show over the figure meanwhile, and a polite live region
   says "Sam is walking through your scene and waves hello" for screen readers. After a visit that you saw, the
   first one of the day for that friend adds a line to the Friends feed (friendsFeedPost, a local note).

   PUBLIC API
     friendsScenesWalkBy()          a friend who is around walks through the largest scene playing now (the palette
                                    command 'Friends: walk by in this scene'); explains in a toast when one cannot
     friendsScenesVisits()          the visits now [{friend, scene, d, T, tau, mode}] (ids and numbers: debugging)
   Private names: _fsv*.
   ============================================================ */
const FSV = Object.freeze({
  every: 10 * 60000, perFriend: 40 * 60000, perDay: 6,   // rarity: between visits, per friend, per day
  chance: 0.35,          // the chance a scene you are watching gets a visitor (one roll per scene shown)
  playMs: 5000,          // a scene plays this long before a friend may come
  pageMs: 20000,         // and never in the page's first seconds (the opening)
  pair: 0.3,             // a second friend comes too, when two are around
  H: 1.72, SIZE: 64,     // the person size class: metres, art units (person.walker)
  minPx: 64, maxPx: 300, prefPx: 165,   // the figure's height on screen, scene units of 900
  clear: 0.32,           // metres of clearance along the route (the nav's person radius is already in its cells)
  waveS: 2.6, raiseS: 0.35,
  maxCover: 0.45,        // at most this share of the walk hidden behind nearer things
});
const _fsv = { visits: [], planning: false, seen: new WeakMap(), timer: 0, uid: 0, t0: Date.now(), live: null, noted: new Map() };   // clock-ok: page age only

/* ---------- the gait: sceneBehave's stroll ---------- */
function _fsvGait() {
  const P = typeof sceneBehave !== 'undefined' && sceneBehave.PRESETS && sceneBehave.PRESETS.stroll ? sceneBehave.PRESETS.stroll : null;
  const g = { speedM: 1.15, stepM: 0.66, arm: 16, bob: 1.3, easeM: 0.9 };
  if (P) for (const k of Object.keys(g)) if (Number.isFinite(P[k]) && P[k] > 0) g[k] = P[k];
  // the leg's swing for a planted foot: half a step each side of the hip (hip pivot 31.5 of 64 units: 0.85 m)
  const hip = FSV.H * 31.5 / FSV.SIZE;
  g.legDeg = Math.asin(Math.min(0.9, g.stepM / (2 * hip))) * 180 / Math.PI;
  return g;
}

/* ---------- where a scene can be visited ---------- */
function _fsvEnvOk(env) {
  try {
    if (!env || env.still || !env.C || env.C.v !== 2) return false;
    const cam = env.cam;
    if (!cam || cam.inferred || !Number.isFinite(cam.f) || !(cam.f > 0) || !Number.isFinite(cam.horizon)) return false;
    if (typeof worldHostLive === 'function' && env.C.id) { const r = worldHostLive(env.C.id); if (r && r.compositor) return false; }   // a v3 world draws its own agents
    if (typeof sceneXNavFor !== 'function' || typeof sceneXNavOk !== 'function' || typeof sceneProject !== 'function') return false;
    if (typeof sceneXNavOn === 'function' && !sceneXNavOn(env.C)) return false;
    return !!(env.W > 0 && env.H > 0 && env.vs > 0);
  } catch (e) { return false; }
}
/** The depths the scene's own people walk at (person flows' lanes, person actors): a visitor fits in with them. */
function _fsvPeopleDepths(C, cam) {
  const out = [], cls = (id) => (typeof sceneObjClassOf === 'function' ? sceneObjClassOf(id) : String(id).split('.')[0] === 'person' ? 'person' : '');
  const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
  try {
    for (const fl of C.flows || []) {
      if (!(fl.pairs || []).some(p => cls(p[0]) === 'person')) continue;
      for (const ln of fl.lanes || []) { const ds = (ln.path || []).map(p => p[1]).filter(Number.isFinite); if (ds.length) out.push(med(ds)); }
    }
    for (const a of C.actors || []) {
      if (!a || cls(a.o) !== 'person' || !Array.isArray(a.path) || !a.path.length) continue;
      const Y = a.path[Math.floor(a.path.length / 2)][1];
      if (Number.isFinite(Y) && Y > cam.horizon + 1) out.push(cam.f * cam.eye / (Y - cam.horizon));
    }
  } catch (e) { /* none */ }
  return out.slice(0, 24);
}
/** The screen boxes and draw-order keys of a bake's statics (once a plan): [z, x0, y0, x1, y1] (the canvas's itemBox). */
function _fsvBoxes(C) {
  const out = [];
  for (const it of C.items || []) {
    if (!it || !it.o) continue;
    let sh = null;
    try { sh = sceneObjShapes(it.o, it.v || 0, it.season || C.season); } catch (e) { sh = null; }
    if (!sh || !sh.box) continue;
    const s = it.s || 1, b = sh.box;
    out.push([it.z != null ? it.z : it.y, it.flip ? it.x - b[2] * s : it.x + b[0] * s, it.y + b[1] * s, it.flip ? it.x - b[0] * s : it.x + b[2] * s, it.y + b[3] * s]);
  }
  return out;
}
/** The share of the visible walk at depth d that nearer statics hide at the walker's waist (the canvas's own z rule: nearer = larger z). */
function _fsvCover(boxes, cam, d, X0, X1) {
  const zMe = cam.horizon + cam.f * cam.eye / d, Yw = zMe - cam.f * FSV.H / d * 0.55, spans = [];
  for (const q of boxes) {
    if (!(q[0] > zMe + 0.5) || q[2] > Yw || q[4] < Yw) continue;
    const a = Math.max(X0, q[1]), e = Math.min(X1, q[3]);
    if (e > a) spans.push([a, e]);
  }
  spans.sort((p, q) => p[0] - q[0]);
  let cov = 0, cur = null;
  for (const sp of spans) { if (!cur || sp[0] > cur[1]) { if (cur) cov += cur[1] - cur[0]; cur = sp.slice(); } else cur[1] = Math.max(cur[1], sp[1]); }
  if (cur) cov += cur[1] - cur[0];
  return cov / Math.max(1, X1 - X0);
}
/** A seeded random in [0, 1). */
function _fsvRnd(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }

/**
 * A walk across the frame of a bake (its env): { pts: [[x, d], ...] ground metres in walking order, cum, L, d, face (+1: to
 * the right), sW (where the stop is, metres along), hPx } or null. o: { seed, avoidD (keep 1.5 m off this depth), face }.
 */
function _fsvPlan(env, o) {
  o = o || {};
  if (!_fsvEnvOk(env)) return null;
  const C = env.C, cam = env.cam, f = cam.f, H = FSV.H, vs = env.vs, rnd = _fsvRnd(o.seed || 1);
  const X0 = -env.ox / vs, X1 = (env.W - env.ox) / vs, Y0 = -env.oy / vs, Y1 = (env.H - env.oy) / vs;
  const dLo = Math.max((cam.dMin || 1) * 1.08, f * H / FSV.maxPx, 2), dHi = Math.min(f * H / FSV.minPx, 80);
  if (!(dHi > dLo * 1.05)) return null;
  const cands = [];
  for (let i = 0; i < 12; i++) cands.push({ d: dLo * Math.pow(dHi / dLo, i / 11), people: false });
  for (const d of _fsvPeopleDepths(C, cam)) if (d > dLo && d < dHi) cands.push({ d, people: true });
  const padU = (d) => 0.6 * 29 * (f / d * H / FSV.SIZE) + 24;   // half the figure's width and a margin beyond each side
  const xm = (X, d) => (X - cam.x0) * d / f;
  const box = [Math.min(xm(X0 - padU(dLo), dHi), xm(X0 - padU(dLo), dLo)) - 2, dLo - 1, Math.max(xm(X1 + padU(dLo), dHi), xm(X1 + padU(dLo), dLo)) + 2, dHi + 1];
  let nav = null;
  try { nav = sceneXNavFor(C, 'walk', box); } catch (e) { nav = null; }
  if (!nav) return null;
  const R = typeof sceneBehave !== 'undefined' && sceneBehave._geo ? sceneBehave._geo : null;
  const boxes = _fsvBoxes(C);
  let best = null, astar = 0;
  for (const c of cands) {
    const d = c.d;
    if (Number.isFinite(o.avoidD) && Math.abs(d - o.avoidD) < 1.5) continue;
    const pad = padU(d), xs = xm(X0 - pad, d), xe = xm(X1 + pad, d);
    let n = 0, bad = 0;
    for (let x = xs; x <= xe; x += 0.4) {
      const X = cam.x0 + f * x / d;
      if (X < X0 || X > X1) continue;
      n++;
      if (!sceneXNavOk(nav, x, d, FSV.clear)) bad++;
    }
    if (n < 4) continue;
    let pts = null;
    if (!bad) pts = [[xs, d], [xe, d]];
    else if (bad / n < 0.45 && astar < 4 && typeof sceneXNavPath === 'function' && nav.W && nav.N) {
      astar++;
      let p = null;
      try { p = sceneXNavPath(nav.W, nav.N, [xs, d], [xe, d], { pad: 3 }); } catch (e) { p = null; }
      if (p && p.length) {
        let q = [[xs, d]].concat(p.map(z => [z[0], z[1]]));
        // a side view must face its heading: a detour stays near this depth and within 25 degrees of across, and never turns back
        const lateral = q.every((z, i) => !i || (z[0] - q[i - 1][0] > 0.05 && Math.abs(z[1] - q[i - 1][1]) <= 0.47 * (z[0] - q[i - 1][0])));
        const near = q.every(z => Math.abs(z[1] - d) <= Math.max(1.2, 0.18 * d));
        if (lateral && near) { if (R && R.roundCorners) q = R.roundCorners(q, 2); pts = q; }
      }
    }
    if (!pts) continue;
    // the whole figure inside the frame (the relief can lift or drop the ground)
    let fits = true;
    for (const z of pts.length > 2 ? pts : [[xs, d], [(xs + xe) / 2, d], [xe, d]]) {
      const P = sceneProject(cam, z[0], z[1], null);
      if (P.X < X0 - pad || P.X > X1 + pad) continue;
      if (P.Y > Y1 - 4 || P.Y - f * H / z[1] < Y0 + 6) { fits = false; break; }
    }
    if (!fits) continue;
    const cover = _fsvCover(boxes, cam, d, X0, X1);
    if (cover > FSV.maxCover) continue;
    const hPx = f * H / d, size = Math.exp(-Math.pow(Math.log(hPx / FSV.prefPx), 2) / (2 * 0.45 * 0.45));
    const score = (1 - cover) * size * (c.people ? 1.25 : 1) * (pts.length > 2 ? 0.85 : 1) * (0.88 + 0.24 * rnd());
    if (!best || score > best.score) best = { score, pts, d, hPx, cover };
  }
  if (!best) return null;
  // walking order and the stop (near the middle of the frame, where nothing nearer hides them)
  const face = o.face === 1 || o.face === -1 ? o.face : (rnd() < 0.5 ? 1 : -1);
  const pts = face > 0 ? best.pts.map(z => z.slice()) : best.pts.map(z => z.slice()).reverse();
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = cum[cum.length - 1];
  const want = X0 + (0.32 + 0.36 * rnd()) * (X1 - X0);
  let sW = L / 2, bestDx = Infinity;
  for (let s = 0; s <= L; s += 0.25) {
    const p = _fsvAlong(pts, cum, s), X = cam.x0 + f * p[0] / p[1], dx = Math.abs(X - want);
    if (dx < bestDx) { bestDx = dx; sW = s; }
  }
  return { pts, cum, L, d: best.d, face, sW, hPx: best.hPx, cover: best.cover };
}
/** The point s metres along a route. */
function _fsvAlong(pts, cum, s) {
  if (s <= 0) return pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (cum[i] >= s) { const u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]); return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * u, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * u]; }
  }
  return pts[pts.length - 1];
}

/* ---------- a visit's timeline (scene seconds since it started): walk, ease to a stop, wave, ease off, walk ---------- */
function _fsvTimeline(V) {
  const g = V.gait, v = V.v, e = Math.min(g.easeM, V.sW - 0.3, V.L - V.sW - 0.3), Te = 2 * Math.max(0.05, e) / v;
  const t1 = Math.max(0, V.sW - e) / v, t2 = t1 + Te, t3 = t2 + FSV.waveS, t4 = t3 + Te;
  V.tl = { e: Math.max(0.05, e), Te, t1, t2, t3, t4, T: t4 + Math.max(0, V.L - V.sW - e) / v };
  V.T = V.tl.T;
}
/** { s (metres along), go (0..1 of the pace), wave (seconds into the wave, or -1) } at tau. */
function _fsvAt(V, tau) {
  const T = V.tl, v = V.v, a = v / T.Te;
  if (tau <= T.t1) return { s: v * Math.max(0, tau), go: 1, wave: -1 };
  if (tau <= T.t2) { const q = tau - T.t1; return { s: V.sW - T.e + v * q - a * q * q / 2, go: Math.max(0, 1 - q / T.Te), wave: -1 }; }
  if (tau <= T.t3) return { s: V.sW, go: 0, wave: tau - T.t2 };
  if (tau <= T.t4) { const q = tau - T.t3; return { s: V.sW + a * q * q / 2, go: q / T.Te, wave: -1 }; }
  return { s: Math.min(V.L, V.sW + T.e + v * (tau - T.t4)), go: 1, wave: -1 };
}

/* ---------- the visits of a bake, and one visitor's pose at t ---------- */
function _fsvFor(env) {
  if (!_fsv.visits.length || !env || !env.C) return [];
  return _fsv.visits.filter(V => !V.done && (V.C === env.C || (V.cid && V.cid === env.C.id)));
}
function _fsvBucket(s) { return 2 ** (Math.ceil(Math.log2(Math.max(1e-3, s)) * 4) / 4); }
function _fsvHaze(env, d) {
  try { return typeof sceneHazeAt === 'function' ? Math.round(sceneHazeAt(d, env.C.atmos, env.L) * 10) / 10 : 0; } catch (e) { return 0; }
}
/** The visitor at scene time t in this bake (computed once a frame): null before it starts, after it ends, or when the clock went back. */
function _fsvNow(env, V, t) {
  if (V.now && V.now.env === env && V.now.t === t) return V.now.a;
  let a = null;
  V.frameAt = Date.now();   // clock-ok: the last frame that drew it (a visit in a scene paused for long is ended)
  if (V.t0 == null) { V.t0 = t + (V.delay || 0); V.startedAt = V.frameAt; }
  if (V.tLast != null && t < V.tLast - 1) { _fsvEnd(V); return null; }   // the scene restarted (shown again): the visit ends with it
  V.tLast = t;
  const tau = t - V.t0;
  if (tau > V.T) { _fsvEnd(V); return null; }
  if (tau >= 0) {
    const st = _fsvAt(V, tau), p = _fsvAlong(V.pts, V.cum, st.s), cam = env.cam;
    const P = sceneProject(cam, p[0], p[1], null), s = cam.f / p[1] * FSV.H / FSV.SIZE;
    const band = typeof sceneDepthBand === 'function' ? sceneDepthBand(cam, p[1]) : 0, lg = env.layerOfGroup || [];
    const gi = lg[band] != null ? lg[band] : Math.max(0, (env.groups || []).length - 1);
    const mode = st.wave >= 0 ? 'wave' : 'walk';
    a = { x: p[0], d: p[1], X: P.X, Y: P.Y, s, flip: V.face < 0, layer: band, gi, go: st.go, u: st.s / (2 * V.gait.stepM) + V.ph, wave: st.wave, mode, v: mode === 'wave' ? 1 : 0, alpha: 1 };
    if (mode === 'wave' && !V.waved) _fsvWaveStart(V);
    if (mode === 'wave' && !document.hidden && V.hostEl && !V.hostEl.classList.contains('is-offscreen')) V.seen = true;
  }
  V.now = { env, t, a };
  return a;
}
/** The record the shadow and water passes read (env.flowNow, like a flow agent), with the sprite they cast and mirror. */
function _fsvRec(env, V, a) {
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(V.obj, a.v, env.C.season || 'summer') : null;
  let sp = null;
  if (env.shadow || (env.C.water && env.C.water.length)) sp = _fsvSprite(env, V, a, '*');
  return { fv: true, X: a.X, Y: a.Y, x: a.X, y: a.Y, s: a.s, flip: a.flip, d: a.d, cls: 'person', o: V.obj, v: a.v, alpha: a.alpha, gi: a.gi, layer: a.layer,
    sp, box: sh ? sh.box : null, speed: V.v * a.go, speedU: 0 };
}
function _fsvSprite(env, V, a, part) {
  try {
    const req = { o: V.obj, v: a.v, part, season: env.C.season || 'summer', haze: _fsvHaze(env, a.d), tint: null, scale: _fsvBucket(a.s) * env.vs, flip: false, cls: 'person', litGlow: !!(env.L && env.L.windows) };
    const sp = env.sprite(req);
    return typeof env.keep === 'function' ? env.keep(sp) : sp;
  } catch (e) { return null; }
}
/** Draw the visitor (the canvas's custom mover): the far leg, the body (bobbing), the near leg, the near arm; or the wave. */
function _fsvDraw(env, V, a, ctx) {
  if (typeof sceneAnimPose !== 'function' || typeof _scMul !== 'function') return 0;
  const sh = sceneObjShapes(V.obj, a.v, env.C.season || 'summer');
  if (!sh) return 0;
  const vs = env.vs, fc = a.flip ? -1 : 1, M = [vs * a.s * fc, 0, 0, vs * a.s, vs * a.X + env.ox, vs * a.Y + env.oy], hooks = sh.anim || [];
  let n = 0;
  const put = (sp, MM) => { if (!sp || !sp.c) return; ctx.globalAlpha = a.alpha; ctx.setTransform(MM[0], MM[1], MM[2], MM[3], MM[4], MM[5]); ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); n++; };
  const g = V.gait;
  if (a.mode !== 'wave') {
    const legs = hooks.find(h => h.kind === 'walk' && (h.parts || []).includes('legB')), arm = hooks.find(h => h.kind === 'walk' && (h.parts || []).includes('armA'));
    // the stride's phase is the ground covered (a.u, in cycles of two steps): planted feet at any pace, legs together at a stop
    const pl = legs ? sceneAnimPose(Object.assign({}, legs, { period: 1, phase: 0, deg: g.legDeg * a.go, bob: g.bob * a.go, stance: 0.5 }), a.u, env.L, a.X) : { m: _SC_ID, m2: _SC_ID, bob: 0 };
    const pa = arm ? sceneAnimPose(Object.assign({}, arm, { period: 1, phase: 0, deg: g.arm * a.go, bob: 0 }), a.u, env.L, a.X) : { m: _SC_ID };
    const Mb = M.slice(); Mb[5] += (pl.bob || 0) * vs * a.s;
    put(_fsvSprite(env, V, a, 'legB'), _scMul(M, pl.m));
    put(_fsvSprite(env, V, a, 'rest:legB,legA,armA'), Mb);
    put(_fsvSprite(env, V, a, 'legA'), _scMul(M, pl.m2 || pl.m));
    put(_fsvSprite(env, V, a, 'armA'), _scMul(Mb, pa.m));
  } else {
    // the wave: the near arm swings up (a quarter turn and more about the shoulder, eased), waves, and comes down at the end
    const hk = hooks[0], k = a.wave, end = FSV.waveS - k, ease = (x) => { const c = Math.max(0, Math.min(1, x)); return c * c * (3 - 2 * c); };
    const up = Math.min(ease(k / FSV.raiseS), ease(end / FSV.raiseS)), amp = Math.min(ease((k - FSV.raiseS) / 0.3), ease((end - FSV.raiseS) / 0.3));
    const piv = hk && hk.pivot ? hk.pivot : [1, -50];
    const lift = typeof _scAbout === 'function' ? _scAbout(piv[0], piv[1], 155 * (1 - up), 1, 1, 0, 0) : _SC_ID;
    const pw = hk ? sceneAnimPose(Object.assign({}, hk, { deg: (hk.deg || 18) * amp }), k, env.L, a.X) : { m: _SC_ID };
    put(_fsvSprite(env, V, a, 'rest:armA'), M);
    put(_fsvSprite(env, V, a, 'armA'), _scMul(M, _scMul(lift, pw.m)));
  }
  ctx.globalAlpha = 1;
  return n;
}

/* ---------- the overlay: the name tag, the 👋 bubble and the hover / tap area, over the figure (plain DOM) ---------- */
function _fsvHost(V, env) {
  if (V.hostEl && V.hostEl.isConnected) return V.hostEl;
  // re-mounted with the same key (a re-render): the renderer moved to a new host element; look it up at most once a second
  const now = Date.now();   // clock-ok: a throttle only
  if (V.hostAt && now - V.hostAt < 1000) return null;
  V.hostAt = now;
  if (typeof _schHosts === 'undefined') return null;
  for (const [el, rec] of _schHosts) if (rec && rec.r && rec.r.env === env && el.isConnected) { V.hostEl = el; V.ov = null; V.k = 0; return el; }
  return null;
}
function _fsvOverlay(V, env, a) {
  const host = _fsvHost(V, env);
  if (!host) return;
  if (!V.ov || !V.ov.root.isConnected || V.ov.root.parentNode !== host) {
    if (V.ov && V.ov.root) V.ov.root.remove();
    const root = _fscEl('div', 'fsv-ov'), hit = _fscEl('span', 'fsv-hit'), tag = _fscEl('span', 'fsv-tag'), emo = _fscEl('span', 'fsv-emote', '👋');
    root.setAttribute('aria-hidden', 'true');   // the live region says it for screen readers (no focus stop inside a scene)
    tag.appendChild(_fscEl('span', 'fsv-tag-dot'));
    tag.appendChild(_fscEl('span', 'fsv-tag-n', V.name));
    // the tag shows while a mouse is over the figure, for 3.5 s after a tap or click, and while they wave
    hit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') V.hover = true; });
    hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') V.hover = false; });
    hit.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); V.tagPin = V.tagPin > Date.now() ? 0 : Date.now() + 3500; });   // clock-ok: UI timing (and a tap never replays the card under it)
    hit.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.append(hit, tag, emo);
    host.appendChild(root);
    V.ov = { root, hit, tag, emo, last: '' };
    V.k = 0; V.tagShown = false; V.waving = false;
  }
  const now = Date.now();   // clock-ok: layout reads at most twice a second, UI timing
  if (!V.k || now - (V.kAt || 0) > 500) { V.k = (host.clientWidth || 0) / Math.max(1, env.W); V.kAt = now; }
  const k = V.k, sh = sceneObjShapes(V.obj, a.v, env.C.season || 'summer');
  if (!k || !sh) return;
  const b = sh.box, vs = env.vs, s = a.s;
  const xl = a.flip ? a.X - b[2] * s : a.X + b[0] * s, xr = a.flip ? a.X - b[0] * s : a.X + b[2] * s;
  const L = (vs * xl + env.ox) * k, R = (vs * xr + env.ox) * k, T = (vs * (a.Y + b[1] * s) + env.oy) * k, B = (vs * (a.Y + b[3] * s) + env.oy) * k;
  const cx = (vs * a.X + env.ox) * k, key = [Math.round(L), Math.round(T), Math.round(R - L), Math.round(B - T)].join(',');
  if (key !== V.ov.last) {
    V.ov.last = key;
    V.ov.hit.style.transform = `translate(${L.toFixed(1)}px, ${T.toFixed(1)}px)`;
    V.ov.hit.style.width = Math.max(14, R - L).toFixed(1) + 'px';
    V.ov.hit.style.height = Math.max(20, B - T).toFixed(1) + 'px';
    V.ov.tag.style.transform = `translate(${cx.toFixed(1)}px, ${(T - 6).toFixed(1)}px) translate(-50%, -100%)`;
    // the bubble beside the raised hand, clear of the name tag over the head
    V.ov.emo.style.transform = `translate(${(cx + (a.flip ? -1 : 1) * ((R - L) * 0.5 + 22)).toFixed(1)}px, ${(T + 10).toFixed(1)}px) translate(-50%, -100%)`;
  }
  const waving = a.mode === 'wave' && a.wave > FSV.raiseS * 0.6 && a.wave < FSV.waveS - 0.2, tagOn = waving || !!V.hover || V.tagPin > now;
  if (waving !== V.waving) { V.waving = waving; V.ov.root.classList.toggle('is-wave', waving); }
  if (tagOn !== V.tagShown) { V.tagShown = tagOn; V.ov.root.classList.toggle('is-tag', tagOn); }
}
function _fsvWaveStart(V) {
  V.waved = true;
  try {
    if (!_fsv.live || !_fsv.live.isConnected) { _fsv.live = _fscEl('div', 'sr-only fsv-live'); _fsv.live.setAttribute('aria-live', 'polite'); document.body.appendChild(_fsv.live); }
    _fsv.live.textContent = `${V.name} is walking through your scene and waves hello.`;
  } catch (e) { /* no page */ }
}
function _fsvEnd(V) {
  if (V.done) return;
  V.done = true;
  if (V.ov && V.ov.root) V.ov.root.remove();
  V.ov = null;
  _fsv.visits = _fsv.visits.filter(x => x !== V);
  // a visit you saw: the first of the day for that friend leaves a line in the Friends feed (local only)
  if (V.seen && V.manual !== true && typeof friendsFeedPost === 'function') {
    const day = _fscToday(), k = V.friendId + '|' + day;
    if (!_fsv.noted.has(k)) {
      _fsv.noted.set(k, 1);
      friendsFeedPost({ kind: 'note', text: `${V.name} walked through ${V.label || 'your scene'} and waved`, icon: 'users', friend: V.friendId }).catch(() => {});
    }
  }
}
function _fsvEndAll() { for (const V of _fsv.visits.slice()) { V.seen = false; _fsvEnd(V); } }

/* ---------- the render passes (78-scene-0pass.js): the visitor joins the movers of its depth's group ---------- */
if (typeof sceneRenderPassDefine === 'function') {
  const applies = (C) => !!(C && C.v === 2 && C.cam);
  sceneRenderPassDefine({
    id: 'friend-visit',
    // frameGroup after the flows (10), before the water (20) and the shadows (25): they cast and mirror it; movers after the flows' agents
    order: { frameGroup: 12, movers: 55, default: 55 },
    applies,
    frameGroup(env, grp, ctx, t) {
      const list = _fsvFor(env);
      if (!list.length || (typeof window !== 'undefined' && window.__sceneOpts && window.__sceneOpts.moversOff)) return 0;
      const gi = (env.groups || []).indexOf(grp);
      for (const V of list) {
        const a = _fsvNow(env, V, t);
        if (a && a.gi === gi) env.flowNow = (env.flowNow || []).concat([_fsvRec(env, V, a)]);
      }
      return 0;
    },
    movers(env, grp, t, push) {
      const list = _fsvFor(env);
      if (!list.length || (typeof window !== 'undefined' && window.__sceneOpts && window.__sceneOpts.moversOff)) return 0;
      const gi = (env.groups || []).indexOf(grp);
      for (const V of list) {
        const a = _fsvNow(env, V, t);
        if (!a || a.gi !== gi) continue;
        // the canvas sorts it by its foot row, redraws the nearer statics of this group over its box (agent: o, v, X, Y, s, flip, d)
        push({ kind: 'custom', y: a.Y, agent: { X: a.X, Y: a.Y, s: a.s, flip: a.flip, d: a.d, layer: a.layer, o: V.obj, v: a.v, cls: 'person' }, draw: (ctx) => _fsvDraw(env, V, a, ctx) });
        try { _fsvOverlay(V, env, a); } catch (e) { /* the tag is a nicety */ }
      }
      return 0;
    },
    stats(env) { const l = _fsvFor(env); return l.length ? { visitors: l.length } : {}; },
  });
  // after the water and shadow passes have read them: the visitors leave env.flowNow, so the flow pass never draws them too
  sceneRenderPassDefine({
    id: 'friend-visit-tidy', order: { frameGroup: 90, default: 90 }, applies,
    frameGroup(env) { if (env.flowNow && env.flowNow.some(r => r && r.fv)) env.flowNow = env.flowNow.filter(r => !(r && r.fv)); return 0; },
  });
}

/* ---------- when: the scheduler (every 3 s, cheap; the planning runs in idle time) ---------- */
function _fsvHostsNow() {
  const out = [];
  if (typeof _schHosts === 'undefined' || typeof document === 'undefined' || document.hidden) return out;
  for (const [el, rec] of _schHosts) {
    if (!el.isConnected || !rec || !rec.r || rec.still || rec.hoverOnly) continue;
    const c = el.classList;
    if (!c.contains('is-live') || c.contains('is-offscreen') || c.contains('is-rested') || c.contains('is-held') || el.closest('#od-splash')) continue;
    let env = null;
    try { env = rec.r.env; } catch (e) { env = null; }
    if (!_fsvEnvOk(env)) continue;
    const w = el.clientWidth || 0;
    if (w < 240) continue;
    out.push({ el, rec, env, w });
  }
  return out.sort((a, b) => b.w - a.w);
}
function _fsvAllowed(now) {
  const st = _fscStore(), day = _fscToday();
  if (st.day !== day) { st.day = day; st.n = 0; }
  if (st.n >= FSV.perDay || now - st.last < FSV.every) return false;
  return true;
}
function _fsvPick(friends, rnd, not) {
  const st = _fscStore(), now = Date.now();   // clock-ok: cooldowns
  const ok = friends.filter(f => f.id !== not && !(now - (st.per[f.id] || 0) < FSV.perFriend));
  if (!ok.length) return null;
  ok.sort((a, b) => (st.per[a.id] || 0) - (st.per[b.id] || 0));   // the one who has not come by for longest first
  return ok[Math.min(ok.length - 1, Math.floor(rnd() * Math.min(2, ok.length)))];
}
function _fsvTick() {
  try {
    const now = Date.now();   // clock-ok: cooldowns
    for (const V of _fsv.visits.slice()) {
      if (V.done) continue;
      const last = V.frameAt || V.createdAt || now;
      // never drawn (its scene went away first), its scene gone for good, or paused for two minutes: the visit ends
      if (now - last > 120000 || (V.t0 == null && now - V.createdAt > 20000) || (V.hostEl && !V.hostEl.isConnected && now - last > 3000 && !_fsvHostAlive(V))) _fsvEnd(V);
    }
    if (_fsv.visits.length || _fsv.planning || !friendsScenesOn() || !_fscMotionOk()) return;
    if (now - _fsv.t0 < FSV.pageMs || !_fsvAllowed(now)) return;
    const friends = fscFriendsAround();
    if (!friends.length) return;
    for (const h of _fsvHostsNow()) {
      let s = _fsv.seen.get(h.el);
      if (!s) { s = { at: now, rolled: false }; _fsv.seen.set(h.el, s); }
      if (s.rolled || now - s.at < FSV.playMs) continue;
      s.rolled = true;
      if (Math.random() >= FSV.chance) continue;
      _fsvStartSoon(h, friends, false);
      return;
    }
  } catch (e) { console.error('[friends scenes] visit', e); }
}
function _fsvHostAlive(V) { const env = V.now && V.now.env; return !!(env && _fsvHost(V, env)); }
/** Plan and start a visit in idle time (the walkable map and the sprites are built there, not in a frame). */
function _fsvStartSoon(h, friends, manual) {
  _fsv.planning = true;
  return new Promise((resolve) => {
    const run = () => {
      let started = 0;
      try { started = _fsvStart(h, friends, manual); } catch (e) { console.error('[friends scenes] visit', e); }
      _fsv.planning = false;
      resolve(started);
    };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1500 }); else setTimeout(run, 60);
  });
}
function _fsvStart(h, friends, manual) {
  const env = h.rec && h.rec.r ? h.rec.r.env : null;
  if (!_fsvEnvOk(env)) return 0;
  const seed = (Math.random() * 4294967296) >>> 0, rnd = _fsvRnd(seed);
  const f1 = manual ? friends[Math.floor(rnd() * friends.length)] : _fsvPick(friends, rnd, null);
  if (!f1) return 0;
  const item = typeof animItem === 'function' ? animItem(h.el.getAttribute('data-anim')) : null;
  const label = item && typeof item.label === 'string' ? item.label.slice(0, 80) : '';
  const mk = (f, plan, delay) => {
    const obj = fscFigureObj(_fscAvatarOf(f));
    if (!obj || !plan) return null;
    const g = _fsvGait(), V = { id: 'fv' + (++_fsv.uid), friendId: f.id, name: _fscName(f), obj, C: env.C, cid: env.C.id || null, hostEl: h.el, label, manual,
      pts: plan.pts, cum: plan.cum, L: plan.L, d: plan.d, face: plan.face, sW: plan.sW, gait: g, v: g.speedM * (0.92 + 0.16 * rnd()), ph: rnd(), delay: delay || 0, t0: null, done: false,
      createdAt: Date.now() };   // clock-ok: housekeeping
    V.sW = Math.max(g.easeM + 0.4, Math.min(V.L - g.easeM - 0.4, V.sW));
    _fsvTimeline(V);
    return V;
  };
  const p1 = _fsvPlan(env, { seed });
  const V1 = mk(f1, p1, 0);
  if (!V1) return 0;
  const list = [V1];
  const f2 = friends.length > 1 && (manual ? rnd() < 0.5 : rnd() < FSV.pair) ? _fsvPick(friends.filter(f => f.id !== f1.id), rnd, f1.id) || (manual ? friends.find(f => f.id !== f1.id) : null) : null;
  if (f2) {
    // a second friend: another depth, walking the other way (they pass, each at its own depth); else the same line, well behind
    let V2 = mk(f2, _fsvPlan(env, { seed: seed + 7, avoidD: p1.d, face: -p1.face }), 1.2 + 2 * rnd());
    if (!V2) V2 = mk(f2, p1, 6.5 + rnd());
    if (V2) list.push(V2);
  }
  // the sprites now (idle time), not in the frame the friend first shows in
  for (const V of list) for (const v of [0, 1]) {
    const a = { v, s: env.cam.f / V.d * FSV.H / FSV.SIZE, d: V.d };
    for (const part of v ? ['rest:armA', 'armA'] : ['legB', 'rest:legB,legA,armA', 'legA', 'armA']) _fsvSprite(env, V, a, part);
  }
  const st = _fscStore(), now = Date.now();   // clock-ok: cooldowns
  if (!manual) { st.last = now; st.n++; }
  for (const V of list) { st.per[V.friendId] = now; _fsv.visits.push(V); }
  _fscSave();
  return list.length;
}

/* ---------- on request: the palette command ---------- */
async function friendsScenesWalkBy() {
  if (!_fscMotionOk()) { toast('Friends walk by only while scenes move. Reduced motion or animations off keep them still.', { icon: 'users' }); return 0; }
  const friends = fscFriendsAround();
  if (!friends.length) {
    toast("None of your friends are around right now. They walk by when they're online and share their profile.", { icon: 'moon', action: { label: 'Open Friends', run: () => setView('friends') } });
    return 0;
  }
  const hosts = _fsvHostsNow();
  if (!hosts.length) {
    toast('Open a scene first: the Animations gallery, or Home’s animation of the day.', { icon: 'image', action: { label: 'Open the gallery', run: () => setView('settings:animations') } });
    return 0;
  }
  if (_fsv.visits.length) { toast('A friend is already walking through.', { icon: 'users' }); return 0; }
  if (_fsv.planning) return 0;
  const n = await _fsvStartSoon(hosts[0], friends, true);
  if (!n) toast('There is no clear path across this scene for a walker. Try another scene.', { icon: 'users' });
  return n;
}
function friendsScenesVisits() {
  return _fsv.visits.map(V => ({ friend: V.friendId, scene: V.cid, d: Math.round(V.d * 10) / 10, T: Math.round(V.T * 10) / 10, tau: V.now && V.t0 != null ? Math.round((V.now.t - V.t0) * 10) / 10 : null, mode: V.now && V.now.a ? V.now.a.mode : 'waiting' }));
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  _fsv.timer = setInterval(_fsvTick, 3000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) return; for (const h of _fsvHostsNow()) { const s = _fsv.seen.get(h.el); if (s && !s.rolled) s.at = Date.now(); } });   // clock-ok: a scene counts from when you see it
  try { matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => { if (e.matches) _fsvEndAll(); }); } catch (e) { /* old browsers */ }
  if (typeof registerCommand === 'function') {
    registerCommand({ id: 'friends-walk-by', label: 'Friends: walk by in this scene', icon: 'users', keywords: 'friends scene visit walk wave surprise', run: () => { friendsScenesWalkBy(); } });
  }
}
