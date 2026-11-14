/* ============================================================
   WORLD ENGINE v3.1, package render: the SHADE OF A MOVER, continuous (docs/dev/WORLD_SHADE.md). PURE classic script: only constants
   and functions at load. Private prefix _wsh.

   A mover's colours come from MATERIALS (79-world-4material.js) and are rasterised into sprites kept in the shared sprite cache, keyed
   by the material context (worldMaterialKey). Two inputs of that context change as a mover walks: the lamp light at its feet
   (worldLocalLight) and the haze of its depth. Both were keyed in steps of 0.1, so a walker passing a lamp at night brightened and
   darkened in up to six visible steps, and one walking away changed colour in steps of 10 % of the way to the haze colour.

   Lamp light: the sprite cache keeps its steps of 0.1 (a handful of rasters a figure, shared by every walker), and the mover is drawn
   as a BLEND of the two neighbouring steps: its pose plan (_wfrPosePlan, 79-world-5frame.js) lays a second blit of each part over the
   first, the other step's sprite at the share w of the way to it (interface C4: a blit whose part carries WORLD_SHADE_BLEND draws
   the other step; both players draw a plan's blits as they are, so neither changes). The nearer step is the base and the farther one
   is laid over at w <= 0.5, so the colour is (1 - w) x near + w x far exactly, and the edge coverage (two over-blends of an
   anti-aliased edge cover a little more than one) rises and falls smoothly with w and is the same on both sides of every midpoint:
   nothing switches. A change of the lit pools (lamps coming on at dusk, a relight) fades the light on movers over
   WORLD_SHADE_FADE_S, as the pools and halos themselves cross-fade.
   Haze: a mover's haze is keyed in steps of 0.01 (1 % of the way to the haze colour: under 3 levels of 255, below what the eye sees
   on a figure) and its colour is the haze OF its key (the context's haze is set to the step), so two movers in one step are one
   sprite and a step is the same change wherever it falls. A walker crosses a step every few tens of metres: its sprites are drawn
   again about as often as its scale bucket changes. Statics keep their 0.1 steps (they never move: no step is ever seen).

     WORLD_SHADE_BLEND                 the prefix of a pose plan blit's part that draws the other lamp step (C4)
     worldShadeLight(S, r, tau)        -> { kc, kb, ko, w } the continuous lamp light of a mover and its two steps (the base kb, the other
                                          ko, the share w of the other), remembered on its draw memory for the frame; null for a static
     _wshBlend(r, tau, plan, L)        the pose plan with the blend blits added (each part's blit followed by its other step at a x w;
                                          for a vehicle in the second after the night switch, its lamps' old state at a x (1 - f): WORLD_SHADE_GLOW)
     _wshMcOf(S, r, h, other)          the material context of a mover's sprites now: its own context, its haze at the 0.01 step, the
                                          lamp light at the base step (or the other one)
   ============================================================ */
const WORLD_SHADE_BLEND = '~:';
const WORLD_SHADE_GLOW = '~g:';         // the prefix of a blit that draws the part with its vehicle lamps in the state before the switch
const WORLD_SHADE_LAMP_Q = 10;          // the lamp light on a mover is rasterised in steps of 1 / this (the sprite cache keys on the step)
const WORLD_SHADE_HAZE_Q = 100;         // a mover's haze is rasterised in steps of 1 / this
const WORLD_SHADE_MIN_W = 0.03;         // a blend share below this draws no second blit (0.3 % of k: no visible change)
const WORLD_SHADE_FADE_S = 1;           // the light on movers follows a change of the lit pools over this (the pools' own cross-fade)

/** The continuous lamp light at a ground point (worldLocalLight's exact sum, capped, before its rounding to the cache steps). */
function _wshK(pools, x, z) {
  if (!pools || !pools.length || typeof worldLocalLight !== 'function') return 0;
  const L = worldLocalLight(pools, x, z);
  return L && Number.isFinite(L.kc) ? L.kc : L && Number.isFinite(L.k) ? L.k : 0;
}
/**
 * The lamp light on a mover at scene time tau: the continuous light at its feet, faded from the pools lit before a change of the lit set
 * (S.localLights is planned again at each relight) to the new ones over WORLD_SHADE_FADE_S; and the two cache steps it lies between:
 * kb the nearer (the base drawing), ko the other, w (0..0.5) the share of the other. Remembered on the mover's draw memory h for the
 * frame (h._shNow: the sprites of the frame read it). tau NaN: no fade (a drawing without a frame: the mirror of a capture).
 */
function worldShadeLight(S, r, tau, h) {
  const e = r && r.ent;
  if (!S || !e || e.static) return null;
  h = h || r.mem || null;
  const LL = S.localLights || null, x = e.x || 0, z = e.z || 0;
  const was = h && h._shNow;
  if (was && was.S === S && was.LL === LL && was.x === x && was.z === z && (was.tau === tau || (tau !== tau && was.tau !== was.tau))) return was;
  // a change of the lit pools: from the old to the new over the fade (_wshLitSet)
  const F = _wshLitSet(S, tau);
  let kc = _wshK(LL, x, z);
  if (F.u < 1) kc = _wshK(F.old, x, z) * (1 - F.u) + kc * F.u;
  const q = WORLD_SHADE_LAMP_Q, v = Math.max(0, Math.min(0.6, kc)) * q, k0 = Math.floor(v + 1e-9), fr = v - k0;
  const near = fr < 0.5 ? k0 : k0 + 1, far = fr < 0.5 ? k0 + 1 : k0, w = fr < 0.5 ? fr : 1 - fr;
  const out = { S, LL, x, z, tau, kc, kb: near / q, ko: far / q, w: w < 1e-6 ? 0 : w };
  if (h) h._shNow = out;
  return out;
}
/**
 * The lit pools' change (S.localLights is planned again at each relight; lamps come on at dusk one by one): kept per bake (S._shLL:
 * { cur, old, t0, u }), u the eased share of the new set at tau (1: no change under way). The first set seen has nothing to fade from.
 * Every mover's pose plan calls it (also with no pool lit, so the first lamps of the evening fade in).
 */
function _wshLitSet(S, tau) {
  const LL = S.localLights || null;
  let F = S._shLL;
  if (!F) F = S._shLL = { cur: LL, old: LL, t0: null, u: 1 };
  else if (F.cur !== LL) { F.old = F.cur; F.cur = LL; F.t0 = null; F.u = 0; }   // (a change during a fade fades from the newer set)
  if (F.old !== F.cur) {
    if (!Number.isFinite(tau)) return F;
    if (F.t0 == null || tau < F.t0 - 1e-6) F.t0 = tau;
    const f = (tau - F.t0) / WORLD_SHADE_FADE_S;
    if (f >= 1) { F.old = F.cur; F.u = 1; } else F.u = f <= 0 ? 0 : f * f * (3 - 2 * f);
  } else F.u = 1;
  return F;
}
/**
 * The pose plan of a mover with its blend blits (interface C4): when its lamp light lies between two cache steps by at least
 * WORLD_SHADE_MIN_W, each blit is followed by the same part at the same matrix drawn from the other step at its share. Drawn in this
 * order (a part, then its other step, then the next part) every part is the blend of its two steps, and a nearer limb still covers the
 * body. A mover with no draw memory (the tools' figures) or not drawn yet in this bake (its memory does not know the bake) is unchanged.
 */
function _wshBlend(r, tau, plan, L) {
  if (!plan || !r || r.static || r.prim || r.bmp || !r.ent || r.ent.static) return plan;
  const h = r.mem, S = h && h._shS;
  if (!S) return plan;
  // a vehicle's lamps and lit windows (the players draw its 'litGlow' sprites from L: lit at night) come on or go off over the fade: the
  // state before the switch is laid over the new one at 1 - f (the switch is one relight's reading, for every vehicle at once)
  const g = _wshGlowFade(S, r, tau, L), F = _wshLitSet(S, tau);
  const lamps = S.localLights && S.localLights.length || F.u < 1 && F.old && F.old.length;
  const s = lamps ? worldShadeLight(S, r, tau, h) : null;
  const lb = !!(s && s.w >= WORLD_SHADE_MIN_W);
  if (!lb && !(g > 0)) return plan;
  const out = [], n0 = plan.blits.length;
  for (const b of plan.blits) {
    out.push(b);
    if (lb) out.push({ part: WORLD_SHADE_BLEND + b.part, M: b.M, a: b.a * s.w });
    if (g > 0) out.push({ part: WORLD_SHADE_GLOW + b.part, M: b.M, a: b.a * g });
  }
  plan.blits = out;
  // (the tools' count: blended mover drawings and their extra blits since the bake)
  const st = S.shStats || (S.shStats = { blends: 0, blits: 0, glows: 0 });
  st.blends++; st.blits += out.length - n0; if (g > 0) st.glows++;
  return plan;
}
const _WSH_LIT_CLS = /vehicle|tram|train|boat|bus|car/;
/**
 * The share (0..1) of a vehicle's drawing still in its lamps' state before the night switch (the players' rule: lit when the light has
 * windows on or is darker than 0.5), fading out over WORLD_SHADE_FADE_S from the first frame of the new state. 0 for anything else.
 * The state is kept per bake (S._shGlow).
 */
function _wshGlowFade(S, r, tau, L) {
  if (!L || !_WSH_LIT_CLS.test(String(r.ent.cls || r.obj))) return 0;
  const night = !!(L.windows || L.dark > 0.5);
  let G = S._shGlow;
  if (!G) { S._shGlow = { night, t0: -1e9 }; return 0; }
  if (G.night !== night) { G.night = night; G.t0 = Number.isFinite(tau) ? tau : -1e9; }
  if (!Number.isFinite(tau) || tau < G.t0 - 1e-6) return 0;
  const f = (tau - G.t0) / WORLD_SHADE_FADE_S;
  return f >= 1 ? 0 : 1 - (f <= 0 ? 0 : f * f * (3 - 2 * f));
}
/** The haze of an entity at its depth, as worldMaterialFor takes it (sceneHazeAt with the context's atmosphere and light). */
function _wshHazeOf(mc, e) {
  const d = Math.hypot(e.x || 0, e.z || 0);
  if (typeof sceneHazeAt === 'function') { try { return sceneHazeAt(d, mc.atmos, mc.L) || 0; } catch (err) { return mc.haze || 0; } }
  return 0.47 * (1 - Math.exp(-d / 12000));
}
/**
 * A mover's own material context with its haze at the step it lies on (one shared object per context and step: the sprite memo and the
 * colour memo key on it). Remembered on the draw memory for the position it was asked at (every part of a frame asks).
 */
function _wshBaseMc(S, r, h) {
  const e = r.ent, x = e.x || 0, z = e.z || 0;
  const was = h && h._shB;
  if (was && was.S === S && was.x === x && was.z === z && was.id === e.id) return was.mc;
  const mc0 = typeof _wfrMc === 'function' ? _wfrMc(S, e) : null;
  let mc = mc0;
  if (mc0) {
    const hz = Math.round(Math.max(0, Math.min(1, _wshHazeOf(mc0, e))) * WORLD_SHADE_HAZE_Q) / WORLD_SHADE_HAZE_Q;
    const W = S.shHaze || (S.shHaze = new WeakMap());
    let byH = W.get(mc0);
    if (!byH) { byH = new Map(); W.set(mc0, byH); }
    mc = byH.get(hz);
    if (!mc) { mc = { ...mc0, haze: hz, hazeQ: WORLD_SHADE_HAZE_Q }; delete mc._mk; byH.set(hz, mc); }
  }
  if (h) h._shB = { S, x, z, id: e.id, mc };
  return mc;
}
/** A context under lamp light k (one shared object per context and k). */
function _wshLampMc(S, mc, k) {
  if (!mc || !(k > 0)) return mc;
  const W = S.shLamp || (S.shLamp = new WeakMap());
  let byK = W.get(mc);
  if (!byK) { byK = new Map(); W.set(mc, byK); }
  let m2 = byK.get(k);
  if (!m2) { m2 = { ...mc, lamp: { k, col: typeof WORLD_LAMP_LIGHT_COL === 'string' ? WORLD_LAMP_LIGHT_COL : '#ffd59a' } }; delete m2._mk; byK.set(k, m2); }
  return m2;
}
/**
 * The material context of a mover's sprites now (its base step, or with other the step its blend blits draw): its own context, its haze
 * at the step and the lamp light at the step. The light is the frame's (h._shNow, set by its pose plan) when it is of this position and
 * bake, else worked out now without a fade. h: the draw memory (null: a record drawn without one).
 */
function _wshMcOf(S, r, h, other) {
  const base = _wshBaseMc(S, r, h);
  if (!base) return null;
  const e = r.ent;
  let s = h && h._shNow;
  if (!s || s.S !== S || s.LL !== (S.localLights || null) || s.x !== (e.x || 0) || s.z !== (e.z || 0)) s = worldShadeLight(S, r, s && s.S === S ? s.tau : NaN, h);
  return _wshLampMc(S, base, s ? (other ? s.ko : s.kb) : 0);
}
