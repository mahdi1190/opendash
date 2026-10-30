/* ============================================================
   PETS IN SCENES (2.18, agent 'pets'). Your pet walks with you:
     - beside the full figure (friendsSceneFigureEl, 99s-friends-scenes-0core.js calls petFigureCompanion through a
       guarded hook): yours in the Friends hangout, a friend's beside theirs;
     - beside a friend's figure when they visit the scene you are watching (99s-friends-scenes-1visit.js): their
       pet trots along at their side, stops when they stop to wave (it sits), and walks on with them.

   IT IS A SCENE MOVER, NOT A STICKER (docs/dev/SCENE_LESSONS.md, A, B, J and AG). The pet is drawn by the scene
   engine itself through the render-pass registry (78-scene-0pass.js), exactly like the visitor it walks with:
     - its size comes from depth and its species' real size class (PET_SPECIES h: a cat 0.3 m, a dog 0.5 m ...; the
       smallest are drawn at 0.18 m so a hamster is more than a speck), never by hand
     - its route IS the visitor's route (the engine's walkable map, sceneXNavFor 'walk'), a little ahead and 0.45 m
       nearer the eye; it enters and leaves beyond the frame's sides with them; at their stop it sits
     - drawn in the group of its own depth band, y-sorted with that group's movers, under the canvas's occluder
       redraw; its shadow and reflection are the shadow and water passes' (env.flowNow), never drawn here
     - the gait follows the ground covered (the legs' phase is distance, so feet do not slide): trotters scissor their
       legs about their hips, hoppers hop, birds fly at shoulder height and land at the stop, a robot rolls
     - a runtime object per pet ('animal.pv-<hash>', at most 16 a page) with weight 0 and no kit or role tags, so no
       scene, kit or flow ever picks it; its sprites are made in idle time before it first shows
   A friend's pet is their shared profile's 'pet' field: allow-listed ids mapped through the kit's tables
   (petSanitize); a friend who keeps their pet at home ('walks: false') visits alone.

     petSceneObj(look)              the scene object id of a pet (defined once), or null
     petFigureCompanion(fig, who, h, o)   put the pet beside a full figure element (o.walk: it walks)
     petScenePets()                 the pets walking now [{friend, scene, d, mode}] (ids and numbers: debugging)
   Private names: _pts*.
   ============================================================ */
const _pts = { objs: 0, ids: new Map(), info: new Map(), pets: new Map(), warm: new Set() };
const PTS = Object.freeze({ lead: 0.55, side: 0.45, minH: 0.18, flyAlt: 0.85, maxObjs: 16 });

/* ---------- the pet as a scene object ---------- */
/** What makes two pets draw differently: every field, and the drawing of each custom accessory worn (look.items, 2.22). */
function _ptsKey(look) { return PET_FIELDS.map(f => look[f] || '').join('|') + '|' + _PT_ITEM_FIELDS.map(f => petItemSig(look.items && look.items[f])).join(','); }
function petSceneObj(look0) {
  try {
    if (typeof sceneObjDefine !== 'function' || typeof sceneObj !== 'function') return null;
    const look = Object.assign(petNormalize(look0), look0 && look0.items ? { items: look0.items } : {}), key = _ptsKey(look);
    if (_pts.ids.has(key)) return _pts.ids.get(key);
    const id = 'animal.pv-' + _ptHash(key).toString(36);
    if (sceneObj(id)) { _pts.ids.set(key, id); return id; }
    if (_pts.objs >= PTS.maxObjs) return null;
    const sp = petSpecies(look.species) || PET_SPECIES[0];
    const order = ['legsF', 'tail', 'body', 'legsN', 'paw', 'neck', 'head', 'eyes', 'acc'];
    const info = { 0: null, 1: null };
    const build = (v) => {
      const A = petArt(look, v === 1 ? 'sit' : 'walk', { eyes: 'open', mouth: 'smile' });
      const parts = {};
      const shift = (m) => (Array.isArray(m) ? [m[0], m[1], m[2], m[3], m[4] - 50, m[5] - 90] : [1, 0, 0, 1, -50, -90]);
      for (const name of order) {
        parts[name] = (A.parts[name] || []).filter(s => s && s.d && s.op !== 0 && !s.dash).map(s => ({ f: s.f || null, s: s.s || null, w: s.w || 0, d: s.d, op: s.op == null ? 1 : s.op, cap: s.cap || null, m: shift(s.m) }));
      }
      const pv = {};
      for (const [k, p] of Object.entries(A.piv || {})) if (Array.isArray(p)) pv[k] = [p[0] - 50, p[1] - 90];
      info[v] = { piv: pv, artH: 90 - Math.max(0, Math.min(60, A.top || 20)), bird: !!A.bird };
      return parts;
    };
    // the drawn height (art units) is known after a first build; real metres from the species, the smallest lifted to PTS.minH
    build(0); build(1);
    const H = Math.max(PTS.minH, sp.h);
    sceneObjDefine({
      id, category: 'animal', size: [100, Math.round(info[0].artH)], variants: 2, seasonal: false, flippable: true, parts: order,
      palette: { base: {} }, weight: 0, tags: ['pet-visit'], real: { h: H, l: H * 1.4, w: H * 0.5 },
      credit: "a friend's pet walking with them (Pets, 2.18): drawn by the pets kit",
      build(v) { return build(v === 1 ? 1 : 0); },
    });
    _pts.objs++;
    _pts.ids.set(key, id);
    _pts.info.set(id, { info, H, gait: sp.gait, species: sp.id });
    return id;
  } catch (e) { console.error('[pets] scene object', e); return null; }
}

/* ---------- which pet walks with which visitor ---------- */
function _ptsFriendPet(friendId) {
  try {
    const F = window.Friends;
    const f = F && typeof F.get === 'function' ? F.get(friendId) : null;
    const raw = f && f.profile && typeof f.profile === 'object' ? f.profile.pet : null;
    if (!raw || typeof raw !== 'object' || raw.walks === false) return null;
    return petWithItems(petSanitize(raw), f);
  } catch (e) { return null; }
}
/**
 * The pet of a visit: {obj, look, ready} or null. Made in idle time, never in a frame (defining a scene object clears the
 * engine's shape memo): the first frames of a visit only ask for it, and the visitor enters from beyond the frame anyway.
 */
function _ptsOf(V, env) {
  const P = _pts.pets.get(V);
  if (P !== undefined) return P && typeof P === 'object' ? P : null;
  _pts.pets.set(V, 'pending');
  const run = () => {
    let p = null;
    try {
      const look = _ptsFriendPet(V.friendId), obj = look ? petSceneObj(look) : null;
      if (obj) p = { obj, look, ready: false, ph: Math.random() };
    } catch (e) { p = null; }
    _pts.pets.set(V, p);
    if (p) _ptsWarm(p, env, V);
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1200 }); else setTimeout(run, 40);
  return null;
}
/** Its sprites in idle time, before its first frame (the visitor enters from beyond the frame, so the wait never shows). */
function _ptsWarm(P, env, V) {
  const run = () => {
    try {
      const I = _pts.info.get(P.obj), d = Math.max(1, V.d - PTS.side), s = env.cam.f / d * I.H / I.info[0].artH;
      for (const part of ['legsF', 'rest:legsF,legsN,paw', 'legsN', 'paw', 'rest:paw']) _ptsSprite(env, P, 0, s, d, part);
      _ptsSprite(env, P, 1, s, d, '*');
    } catch (e) { /* drawn lazily then */ }
    P.ready = true;
  };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 1200 }); else setTimeout(run, 40);
}
function _ptsSprite(env, P, v, s, d, part) {
  try {
    const haze = typeof _fsvHaze === 'function' ? _fsvHaze(env, d) : 0, bucket = typeof _fsvBucket === 'function' ? _fsvBucket(s) : s;
    const sp = env.sprite({ o: P.obj, v, part, season: env.C.season || 'summer', haze, tint: null, scale: bucket * env.vs, flip: false, cls: 'animal', litGlow: !!(env.L && env.L.windows) });
    return typeof env.keep === 'function' ? env.keep(sp) : sp;
  } catch (e) { return null; }
}

/* ---------- the pet's pose at t: beside its visitor ---------- */
function _ptsNow(env, V, P, t) {
  if (P.now && P.now.env === env && P.now.t === t) return P.now.a;
  let a = null;
  try {
    const va = typeof _fsvNow === 'function' ? _fsvNow(env, V, t) : null;
    if (va && P.ready && V.t0 != null) {
      const I = _pts.info.get(P.obj), cam = env.cam, st = _fsvAt(V, t - V.t0);
      const sAlong = Math.max(0, Math.min(V.L, st.s + PTS.lead));
      const p = _fsvAlong(V.pts, V.cum, sAlong), d = Math.max((cam.dMin || 1) * 1.05, p[1] - PTS.side);
      const Pj = sceneProject(cam, p[0], d, null);
      const sit = st.wave >= 0 || st.go < 0.05, v = sit ? 1 : 0;
      const s = cam.f / d * I.H / I.info[v].artH;
      const band = typeof sceneDepthBand === 'function' ? sceneDepthBand(cam, d) : 0, lg = env.layerOfGroup || [];
      const gi = lg[band] != null ? lg[band] : Math.max(0, (env.groups || []).length - 1);
      const stride = Math.max(0.16, I.H * 0.9), u = sAlong / stride + P.ph;
      const fly = I.gait === 'fly', hop = I.gait === 'hop';
      // lift in scene units: a hop's arc, or flight at shoulder height that lands at the stop
      const lift = fly ? cam.f / d * PTS.flyAlt * st.go + cam.f / d * 0.05 * Math.sin(t * 2.4 + P.ph * 6) * st.go : hop && !sit ? cam.f / d * I.H * 0.42 * Math.abs(Math.sin(Math.PI * u)) * st.go : 0;
      a = { X: Pj.X, Y: Pj.Y, d, s, v, gi, layer: band, flip: V.face < 0, go: st.go, u, lift, t, gait: I.gait, piv: I.info[v].piv };
    }
  } catch (e) { a = null; }
  P.now = { env, t, a };
  return a;
}
/** The record the shadow and water passes read (env.flowNow, as the visitor's): fv, so the visit's tidy pass removes it. */
function _ptsRec(env, P, a) {
  const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(P.obj, a.v, env.C.season || 'summer') : null;
  const sp = env.shadow || (env.C.water && env.C.water.length) ? _ptsSprite(env, P, a.v, a.s, a.d, '*') : null;
  return { fv: true, pet: true, X: a.X, Y: a.Y - a.lift, x: a.X, y: a.Y, s: a.s, flip: a.flip, d: a.d, cls: 'animal', o: P.obj, v: a.v, alpha: 1, gi: a.gi, layer: a.layer, sp, box: sh ? sh.box : null, speed: 1.1 * a.go, speedU: 0 };
}
/** Draw the pet (the canvas's custom mover): far legs, the rest, near legs; a sitting pet in one piece. */
function _ptsDraw(env, P, a, ctx) {
  if (typeof _scMul !== 'function' || typeof _scAbout !== 'function') return 0;
  const vs = env.vs, fc = a.flip ? -1 : 1, M = [vs * a.s * fc, 0, 0, vs * a.s, vs * a.X + env.ox, vs * (a.Y - a.lift) + env.oy];
  let n = 0;
  const put = (sp, MM) => { if (!sp || !sp.c) return; ctx.globalAlpha = 1; ctx.setTransform(MM[0], MM[1], MM[2], MM[3], MM[4], MM[5]); ctx.drawImage(sp.c, sp.x0, sp.y0, sp.w, sp.h); n++; };
  if (a.v === 1) { put(_ptsSprite(env, P, 1, a.s, a.d, '*'), M); ctx.globalAlpha = 1; return n; }
  const pv = a.piv || {}, w = Math.sin(2 * Math.PI * a.u), go = a.go;
  const about = (p, deg) => (p ? _scAbout(p[0], p[1], deg, 1, 1, 0, 0) : _SC_ID);
  if (a.gait === 'fly') {
    // flying: the near wing beats (the bird's 'paw' part), the body glides
    put(_ptsSprite(env, P, 0, a.s, a.d, 'rest:paw'), M);
    put(_ptsSprite(env, P, 0, a.s, a.d, 'paw'), _scMul(M, about(pv.paw, -28 * go * Math.abs(Math.sin(a.t * 14)))));
  } else if (a.gait === 'roll') {
    const Mb = M.slice(); Mb[5] -= vs * a.s * 0.8 * Math.abs(w) * go;
    put(_ptsSprite(env, P, 0, a.s, a.d, '*'), Mb);
  } else {
    const deg = (a.gait === 'hop' ? 6 : a.gait === 'plod' || a.gait === 'scurry' || a.gait === 'paddle' ? 22 : 16) * go * w;
    const sway = a.gait === 'waddle' ? _scAbout(0, 0, 5 * go * w, 1, 1, 0, 0) : _SC_ID;
    const Mb = _scMul(M, sway); Mb[5] -= vs * a.s * (a.gait === 'hop' ? 0 : 1.1 * Math.abs(w) * go);
    put(_ptsSprite(env, P, 0, a.s, a.d, 'legsF'), _scMul(Mb, about(pv.legsF, -deg * 0.7)));
    put(_ptsSprite(env, P, 0, a.s, a.d, 'rest:legsF,legsN,paw'), Mb);
    put(_ptsSprite(env, P, 0, a.s, a.d, 'legsN'), _scMul(Mb, about(pv.legsN, deg)));
    put(_ptsSprite(env, P, 0, a.s, a.d, 'paw'), _scMul(Mb, about(pv.paw, -deg)));
  }
  ctx.globalAlpha = 1;
  return n;
}

/* ---------- the render passes: the pet joins the movers of its own depth's group, after its visitor ---------- */
if (typeof sceneRenderPassDefine === 'function') {
  const applies = (C) => !!(C && C.v === 2 && C.cam);
  const each = (env, t, fn) => {
    if (typeof _fsvFor !== 'function' || (typeof window !== 'undefined' && window.__sceneOpts && window.__sceneOpts.moversOff)) return;
    for (const V of _fsvFor(env)) {
      const P = _ptsOf(V, env);
      if (!P) continue;
      const a = _ptsNow(env, V, P, t);
      if (a) fn(P, a);
    }
  };
  sceneRenderPassDefine({
    id: 'pet-visit',
    // frameGroup after the friend visit (12), before the water (20) and the shadows (25): they cast and mirror it
    order: { frameGroup: 13, movers: 56, default: 56 },
    applies,
    frameGroup(env, grp, ctx, t) {
      const gi = (env.groups || []).indexOf(grp);
      each(env, t, (P, a) => { if (a.gi === gi) env.flowNow = (env.flowNow || []).concat([_ptsRec(env, P, a)]); });
      return 0;
    },
    movers(env, grp, t, push) {
      const gi = (env.groups || []).indexOf(grp);
      each(env, t, (P, a) => {
        if (a.gi !== gi) return;
        push({ kind: 'custom', y: a.Y, agent: { X: a.X, Y: a.Y - a.lift, s: a.s, flip: a.flip, d: a.d, layer: a.layer, o: P.obj, v: a.v, cls: 'animal' }, draw: (ctx) => _ptsDraw(env, P, a, ctx) });
      });
      return 0;
    },
    // counts what the last frame drew (never poses a visit again at another time: that would end it)
    stats(env) { let n = 0; for (const [V, P] of _pts.pets) if (P && !V.done && P.now && P.now.env === env && P.now.a) n++; return n ? { pets: n } : {}; },
  });
}
function petScenePets() {
  const out = [];
  for (const [V, P] of _pts.pets) if (P && !V.done) out.push({ friend: V.friendId, scene: V.cid, d: P.now && P.now.a ? Math.round(P.now.a.d * 10) / 10 : null, mode: P.now && P.now.a ? (P.now.a.v ? 'sit' : 'walk') : 'waiting' });
  return out;
}
// forget the pets of visits that ended
if (typeof window !== 'undefined') setInterval(() => { for (const V of [..._pts.pets.keys()]) if (V.done) _pts.pets.delete(V); }, 15000);

/* ---------- beside the full figure (the Friends hangout) ---------- */
function petFigureCompanion(fig, who, h, o) {
  try {
    o = o || {};
    if (!fig || !(h >= 50)) return null;   // stamps and tiny figures stay alone
    const w = _ptWho(who);
    if (!w.look) return null;
    if (w.me && (!petGet().scenes || _ptFun() === 'off')) return null;
    if (!w.me && who && who.profile && who.profile.pet && who.profile.pet.walks === false) return null;
    const ph = Math.round(h * 0.4), size = Math.round(ph * 1.3);
    const pe = petEl(who, size, { pose: o.walk ? 'walk' : 'sit', mood: { eyes: 'open', mouth: 'smile' }, motion: !!o.walk, crop: 'none' });
    if (!pe) return null;
    const box = document.createElement('span');
    box.className = 'pt-comp ' + (w.me ? 'is-left' : 'is-right');
    box.setAttribute('aria-hidden', 'true');
    box.appendChild(pe);
    if (!fig.style.position) fig.style.position = 'relative';   // the figure is not on the page yet: no computed style to ask
    fig.appendChild(box);
    return box;
  } catch (e) { return null; }
}
