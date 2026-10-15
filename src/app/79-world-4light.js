/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: LIGHT, SHADOWS, NIGHT LIGHTS AND HAZE (docs/dev/WORLD_ENGINE.md 2.4, 2.6,
   11.2, 15.4; requirements L1, L2, L4, L5, V4, section 19). The scene has NO light, shadow or reflection field: everything here
   is derived from the world, the camera and the almanac. Reflections are NOT planned here (nor per entity anywhere): the water
   surface mirrors the composite (79-world-4water.js; the per-entity worldReflectPlan of the first pass is retired).

   Pure part (Node + browser):
     worldSkyOf(ctx, o)                   -> Sky: the sun and moon from the real almanac (almSunPosition / almMoonPosition) for the
                                             time context's lat / lon / ms, the phase ('night' | 'dawn' | 'golden' | 'day' | 'noon' |
                                             'dusk'), the light band (caches, V5), sun colour and strength, sky ambient, sky colours,
                                             overcast, fog, darkness, and the v2 live light L (sceneLightV2) when it is loaded
     worldSunOf(sun, cam)                 -> { kind, g: [gx, gz], tan, op, blur } (camera space) from a Sky, a v2 L, { az, alt }
     worldShadowPlan(world, cam, sun, o)  -> [{ ref, kind: 'cast' | 'contact' | 'deck', poly, scr, y, op, blur, dir, holes, holesScr,
                                             on, thin, sil, mover }]: ONE direction for the whole scene; never on water (holes:
                                             the parts over water, cut out of the shadow; the water mirror dims there instead);
                                             thin things from their real outline (sil); movers only while visible; a mover on a
                                             deck casts onto the deck (it moves with the deck); a bridge deck shades what is under it
     worldShadeAt(plan, x, z, o)          -> 0..1: how shaded a ground point is (under a bridge, in a tree's shadow); 0 on water
     worldLights(world, o)                -> [{ ref, part, kind, x, y, z, r, halo, src, col, on, pool?, beam?, agent? }] from LIBRARY
                                             GLOW PARTS only: windows per window by a seeded threshold against the sun's elevation
                                             (lit surfaces: src false, no halo), lamps with one pool each, head and tail lights of
                                             moving vehicles, lit tram and train windows; a figure's glow parts are never sources
     worldGlowOn(key, i, kind, alt, share, o) -> is a glow part lit now (one seeded rule for the plan and the lit glass)
     worldLightDraws(lights, cam, o)      -> the shapes the lights paint (pools, halos, beams) within WORLD_LIGHT_CAPS (pure)
     worldGlitterPlan(region, sky, cam, o) -> the sun's or the moon's glitter road on a water region (worldWaterPlan)
     worldHazePlan(world, cam, L, atmos)  -> Float32Array: each entity's haze from its own depth
     worldLookOf(world, cam, o)           -> Map id -> { shadow: { poly, dir, holes, on } | null, reflect: { surface, rowY } | null }
                                             the fields look owns in the frame record (WORLD_ENGINE 16.1)
     worldLightTick(world, ctx)           -> the 'light' system's step: world.sky, world.sun; lightsOn / lightsOff on world.bus
   Browser part (guarded by typeof document): worldDrawShadows, worldDrawLights; the 'world-light' v2 pass for a compiled
   v3 scene that carries C.world (C.fx.world = 2 opts in).
   ============================================================ */
const _WL_D = Math.PI / 180;
// classes that cast no ground shadow (floaters: the water dims instead; flat cover none)
const _WL_NO_CAST = /^(boat|water|ground|sky)\./;
const WORLD_SHADOW_FAR = 400;                   // metres: beyond, a cast shadow is under a pixel tall; skip it
const WORLD_WINDOW_SHARE = 0.6;                 // share of library windows lit in the middle of the night (per window threshold)
// thin casters: their shadow is their real outline (the sprite's silhouette), never a solid block; see-through ones are lighter
const _WL_THIN_CLS = new Set(['fence', 'gate', 'post', 'lamp', 'reed', 'rail-kit', 'street', 'shrub']);
const _WL_SEE_THROUGH = /railing|palisade|fence|gate|trellis|pergola|bike-rack|barrier/;
const _WL_PRISM_CLS = new Set(['building', 'structure', 'landmark', 'walkway', 'weir']);
// v3 weather kinds -> the v2 weather kinds (sceneLightV2's fixed weather)
const _WL_WX_V2 = Object.freeze({ clear: 'clear', cloud: 'cloudy', cloudy: 'cloudy', partly: 'partly', rain: 'rain', drizzle: 'drizzle', showers: 'showers', snow: 'snow', sleet: 'sleet', fog: 'fog', mist: 'mist', thunder: 'thunder' });
const _WL_COVER = Object.freeze({ clear: 0.1, partly: 0.45, cloud: 0.85, cloudy: 0.85, rain: 0.92, drizzle: 0.88, showers: 0.62, snow: 0.9, sleet: 0.9, fog: 0.85, mist: 0.6, thunder: 0.95 });

/* ---------- colour helpers ---------- */
function _wlRgb(hex) { let s = String(hex || '#000').replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s.slice(0, 6), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function _wlHex(c) { return '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }
function _wlMix(a, b, t) { if (!(t > 0) || !b) return a; const A = _wlRgb(a), B = _wlRgb(b), k = Math.min(1, t); return _wlHex(A.map((v, i) => v + (B[i] - v) * k)); }
function _wlClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ---------- the sky (L1, V4) ---------- */
const _wlSkyMemo = new Map();
/** The local solar hour at a longitude (0..24) and the weekday there. */
function _wlLocal(ms, lon) {
  const t = (Number(ms) || 0) + (Number(lon) || 0) / 15 * 3600000;
  return { hour: (((t / 3600000) % 24) + 24) % 24, weekday: ((Math.floor(t / 86400000) + 4) % 7 + 7) % 7 };
}
/** The sun's colour at an altitude (degrees) under a cover (0..1): deep orange at the horizon, warm in the golden hour, white high. */
function _wlSunCol(alt, cover) {
  const T = [[-1, '#ff7a3a'], [2, '#ff9a50'], [6, '#ffb873'], [12, '#ffd6a2'], [22, '#ffecd2'], [40, '#fff4e6'], [90, '#fff8f0']];
  let c = T[T.length - 1][1];
  for (let i = 1; i < T.length; i++) if (alt <= T[i][0]) { const [a0, c0] = T[i - 1], [a1, c1] = T[i]; c = _wlMix(c0, c1, _wlClamp((alt - a0) / (a1 - a0), 0, 1)); break; }
  return _wlMix(c, '#e9edf2', 0.8 * _wlClamp((cover - 0.3) / 0.6, 0, 1));
}
/** Sky colours without the v2 light (top, mid, low) by sun altitude, darkness and cover. */
function _wlSkyCols(alt, golden, dusk, dark, cover) {
  let top = '#3a80c4', mid = '#98c4e4', low = '#e6eee8';
  if (golden > 0) { mid = _wlMix(mid, '#d9c0aa', 0.3 * golden); low = _wlMix(low, '#f6c08c', 0.55 * golden); }
  if (dusk > 0) { top = _wlMix(top, '#3a4a80', 0.6 * dusk); mid = _wlMix(mid, '#8a86b8', 0.5 * dusk); low = _wlMix(low, '#d99aae', 0.5 * dusk); }
  if (dark > 0) { top = _wlMix(top, '#0a1024', dark); mid = _wlMix(mid, '#1a2240', dark); low = _wlMix(low, '#2a3050', dark * 0.9); }
  if (cover > 0.5) { const k = (cover - 0.5) * 1.6; top = _wlMix(top, _wlMix('#a8b0b8', '#141820', dark), k); mid = _wlMix(mid, _wlMix('#c0c6cc', '#1a1e26', dark), k); low = _wlMix(low, _wlMix('#d6dade', '#22262e', dark), k); }
  return { top, mid, low };
}
/**
 * The sky now: the sun and moon from the real almanac for the context's place and time, and the light they give.
 * ctx: a WorldTimeCtx (WORLD_ENGINE 11.11: { ms, lat, lon, weather, cover, sun?, moon?, frost, ... }) or a v2 light L.
 * o: { L (a v2 light to read colours from), heading (the camera's, for the v2 light), live (false: never call sceneLightV2) }.
 * The phase: night (sun under -6 degrees), dawn / dusk (civil twilight, by the solar hour), golden (0 to 10 degrees), noon (within
 * 4 degrees of the day's highest sun and 1.75 h of solar noon), else day. band: the light band for caches (noon is day).
 */
function worldSkyOf(ctx, o) {
  ctx = ctx || {}; o = o || {};
  if (ctx.__sky) return ctx;
  const isL = !!(ctx.top && Number.isFinite(ctx.alt));                 // a v2 light given as the context
  const lat = Number.isFinite(ctx.lat) ? ctx.lat : 51.5, lon = Number.isFinite(ctx.lon) ? ctx.lon : 0, ms = Number.isFinite(ctx.ms) ? ctx.ms : null;
  // the weather: the time context's kind, an override (ctx.wx: a v2 kind or { kind, ... }), a v2 light's own, or LIVE: the app's sky
  // record (ctx.sky: { ms, lat, lon, wx: { cond, wind, temp } }) carries the forecast and sceneLightV2 reads it. Nothing: clear.
  const over = !isL && ctx.wx != null ? ctx.wx : null, liveSky = ctx.sky && typeof ctx.sky === 'object' && ctx.sky.wx ? ctx.sky : null;
  const kind0 = typeof ctx.weather === 'string' ? ctx.weather : typeof over === 'string' ? over : over && typeof over.kind === 'string' ? over.kind : isL && ctx.wx && ctx.wx.kind ? ctx.wx.kind : null;
  const mk = [ms == null ? 'x' : Math.round(ms / 60000), lat.toFixed(2), lon.toFixed(2), kind0 || '', liveSky ? [liveSky.wx.cond, liveSky.wx.temp, liveSky.wx.wind].join(',') : '', Number.isFinite(ctx.cover) ? ctx.cover : '',
    ctx.sun ? ctx.sun.alt + ',' + ctx.sun.az : '', ctx.moon ? ctx.moon.alt + ',' + ctx.moon.az + ',' + ctx.moon.illum : '', Number.isFinite(ctx.fog) ? 'f' + ctx.fog : '', isL ? 'L' + ctx.alt : '', o.L ? 'oL' : '', o.live === false ? 'n' : '', Number.isFinite(o.heading) ? o.heading : ''].join('|');
  const hit = _wlSkyMemo.get(mk);
  if (hit && !isL && !o.L) return hit;
  // the sun and the moon
  let sun = ctx.sun && Number.isFinite(ctx.sun.alt) ? { alt: ctx.sun.alt, az: Number.isFinite(ctx.sun.az) ? ctx.sun.az : 180 } : null;
  if (!sun && isL) sun = { alt: ctx.alt, az: Number.isFinite(ctx.az) ? ctx.az : 180 };
  if (!sun && ms != null && typeof almSunPosition === 'function') { const p = almSunPosition(ms, lat, lon); if (p) sun = { alt: p.alt, az: p.az }; }
  if (!sun) sun = { alt: 35, az: 180 };
  let moon = ctx.moon && Number.isFinite(ctx.moon.alt) ? { alt: ctx.moon.alt, az: ctx.moon.az, illum: ctx.moon.illum == null ? 0.5 : ctx.moon.illum } : null;
  if (!moon && ms != null && typeof almMoonPosition === 'function') { const p = almMoonPosition(ms, lat, lon); if (p) moon = { alt: p.alt, az: p.az, illum: p.illum }; }
  if (!moon) moon = { alt: -20, az: 0, illum: 0 };
  const alt = sun.alt, loc = ms != null ? _wlLocal(ms, lon) : { hour: Number.isFinite(ctx.hour) ? ctx.hour : 12, weekday: 3 };
  const morning = isL && ctx.morning != null ? !!ctx.morning : loc.hour < 12;
  // the day's highest sun (solar noon) for the noon phase
  let noonAlt = 90 - Math.abs(lat - 23.44 * Math.sin((((ctx.doy || 172) - 81) / 365) * 2 * Math.PI));
  if (ms != null && typeof almSunPosition === 'function') { const p = almSunPosition(ms + (12 - loc.hour) * 3600000, lat, lon); if (p) noonAlt = p.alt; }
  const phase = alt < -6 ? 'night' : alt < 0 ? (morning ? 'dawn' : 'dusk') : alt < 10 ? 'golden' : (alt >= noonAlt - 4 && Math.abs(loc.hour - 12) < 1.75 ? 'noon' : 'day');
  // the v2 live light for the same moment (one grade for the base layer and the world)
  let L = o.L || (isL ? ctx : null);
  if (!L && o.live !== false && ms != null && typeof sceneLightV2 === 'function' && typeof almSceneLight === 'function') {
    try {
      const heading = Number.isFinite(o.heading) ? o.heading : Number.isFinite(ctx.heading) ? ctx.heading : 180, sky0 = almSceneLight(ms, lat, lon, 'UTC');
      const w2 = over && typeof over === 'object' && !kind0 ? over : kind0 ? (over && typeof over === 'object' ? Object.assign({}, over, { kind: _WL_WX_V2[kind0] || over.kind }) : _WL_WX_V2[kind0] || 'clear') : 'live';
      if (sky0 && liveSky) sky0.wx = liveSky.wx;
      if (sky0) L = sceneLightV2({ sky: sky0, wx: w2 === 'live' ? undefined : w2 }, { heading, lat, lon }, { v: 2, camera: { heading, lat, lon }, weather: w2 });
    } catch (e) { L = null; }
  }
  const wx = kind0 || (L && L.wx && typeof L.wx.kind === 'string' && L.wx.kind !== 'none' ? L.wx.kind : 'clear');
  const cover = _wlClamp(Number.isFinite(ctx.cover) ? ctx.cover : L && Number.isFinite(L.cover) && !kind0 ? L.cover : _WL_COVER[wx] != null ? _WL_COVER[wx] : 0.3, 0, 1);
  const golden = _wlClamp((16 - alt) / 10, 0, 1) * _wlClamp((alt + 1.5) / 3, 0, 1) * (1 - 0.6 * cover);
  const dusk = _wlClamp((1 - alt) / 3, 0, 1) * _wlClamp((alt + 12) / 6, 0, 1) * (1 - 0.5 * cover);
  const dark = L && Number.isFinite(L.dark) ? _wlClamp(L.dark, 0, 1) : _wlClamp(-alt / 12, 0, 1) * (1 - 0.15 * (moon.alt > 0 ? moon.illum : 0));
  const fog = wx === 'fog' ? 1 : wx === 'mist' ? 0.5 : Number.isFinite(ctx.fog) ? _wlClamp(ctx.fog, 0, 1) : 0;
  const overcast = _wlClamp((cover - 0.45) / 0.45, 0, 1);
  const sunK = alt > 0 ? Math.sqrt(Math.sin(Math.min(90, alt) * _WL_D)) * 0.65 * (1 - 0.8 * overcast) * (1 - 0.6 * fog) : 0;
  const cols = L && L.top ? { top: L.top, mid: L.mid || L.top, low: L.low || L.mid || L.top } : _wlSkyCols(alt, golden, dusk, dark, cover);
  const ambient = dark > 0.6 ? _wlMix('#4a5a88', '#6a78a8', moon.alt > 0 ? moon.illum * 0.6 : 0) : _wlMix(_wlMix(cols.mid, cols.top, 0.3), '#c8cdd4', overcast * 0.7);
  const ambK = 0.35 + 0.25 * overcast * (1 - dark) - 0.15 * dark + (dark > 0.6 && moon.alt > 0 ? 0.05 * moon.illum : 0);
  // the night key (QP4): the light a night scene is SEEN by, the moon (by its height and phase) over a floor of starlight and
  // skyglow, dimmed by cloud. The material step lights pale things by it (in proportion to their own lightness) and darkens the
  // foliage masses into silhouettes against the sky; the compositor lays it on the paths. 0 by day.
  const moonUp = _wlClamp(moon.alt / 18, 0, 1) * (moon.illum == null ? 0.5 : moon.illum);
  const nightK = _wlClamp((dark - 0.35) / 0.5, 0, 1), nightKey = { n: Math.round(nightK * 1000) / 1000, k: Math.round((0.62 + 0.38 * moonUp) * (1 - 0.3 * _wlClamp((cover - 0.4) / 0.5, 0, 1)) * 1000) / 1000, col: _wlMix('#8ea4d6', '#c4cfe6', moonUp) };
  const S = {
    __sky: true, id: mk, ms, lat, lon, sun, moon, phase, band: phase === 'noon' ? 'day' : phase, morning, noonAlt: Math.round(noonAlt * 10) / 10, nightKey,
    golden: Math.round(golden * 100) / 100, dusk: Math.round(dusk * 100) / 100, dark: Math.round(dark * 1000) / 1000, cover, overcast, fog, weather: wx,
    rain: /rain|drizzle|showers|thunder|sleet/.test(wx), snow: /snow|sleet/.test(wx),
    sunCol: L && L.light && alt > 0 ? _wlMix(L.light, _wlSunCol(alt, cover), 0.5) : _wlSunCol(alt, cover), sunK: Math.round(sunK * 1000) / 1000,
    ambient, ambK: Math.round(_wlClamp(ambK, 0.08, 0.7) * 1000) / 1000, sky: cols, haze: (L && L.haze) || _wlMix(cols.low, '#c9d6dc', 0.4),
    fogV: fog > 0 ? Math.round(900 - 650 * fog) : null, localHour: Math.round(loc.hour * 1000) / 1000, weekday: loc.weekday,
    windowShare: L && Number.isFinite(L.windowShare) && L.windowShare > 0 ? L.windowShare : _wlWindowShare(loc.hour), L: L || null,
  };
  if (!isL && !o.L) { if (_wlSkyMemo.size > 400) _wlSkyMemo.clear(); _wlSkyMemo.set(mk, S); }
  return S;
}
/** The share of windows lit in the night by the local hour (the v2 table when loaded). */
function _wlWindowShare(hour) {
  if (typeof sceneWindowShare === 'function') { const v = sceneWindowShare(hour); if (v > 0) return v; }
  return WORLD_WINDOW_SHARE;
}

/* ---------- the sun (one direction for the whole scene) ---------- */
function worldSunOf(sun, cam) {
  const none = { kind: null, g: [0, 1], tan: 0, op: 0, blur: 0, fade: false, contact: 0.3 };
  if (!sun) return none;
  if (Array.isArray(sun.g) && Number.isFinite(sun.tan)) return sun;
  const heading = (cam && cam.heading) || 0, wrap = (a) => ((a % 360) + 540) % 360 - 180;
  if (sun.__sky) {
    const L = { alt: sun.sun.alt, cover: sun.cover || 0, sun: { rel: wrap(sun.sun.az - heading), show: sun.sun.alt > 0 },
      moon: { alt: sun.moon.alt, illum: sun.moon.illum, rel: wrap((sun.moon.az || 0) - heading) } };
    const S = worldSunOf(L, null), fogK = 1 - 0.85 * (sun.fog || 0);
    return Object.assign({}, S, { op: S.op * fogK, blur: S.blur + 6 * (sun.fog || 0), fogV: sun.fogV });
  }
  if (Number.isFinite(sun.az)) {
    const rel = wrap(sun.az - heading), alt = Number(sun.alt) || 0;
    const L = { alt, cover: sun.cover || 0, sun: { rel, show: alt > 0 }, moon: sun.moon || { alt: -20, illum: 0 } };
    return worldSunOf(L, null);
  }
  if (Number.isFinite(sun.alt)) {
    if (typeof sceneShadowSun === 'function') return sceneShadowSun(sun, null);
    const alt = sun.alt, rel = sun.sun && Number.isFinite(sun.sun.rel) ? sun.sun.rel : 0;
    if (alt <= -1) return none;
    return { kind: 'sun', g: [-Math.sin(rel * _WL_D), -Math.cos(rel * _WL_D)], tan: alt > 0.08 ? Math.min(12, 1 / Math.tan(alt * _WL_D)) : 12,
      op: 0.38 * (1 - 0.75 * _wlClamp((sun.cover - 0.45) / 0.3, 0, 1)), blur: 2, fade: false, contact: 0.35 };
  }
  return none;
}

/* ---------- footprints and polygons ---------- */
/** The world footprint of an entity: its derived foot, else the library box rotated by its facing. */
function _wlFoot(e) {
  if (Array.isArray(e.foot) && e.foot.length >= 3) return e.foot;
  const d = _wlDims(e.obj), f = (Number(e.facing) || 0) * _WL_D;
  const hl = (d.l || 1) / 2, hw = (d.w || d.l || 1) / 2, ax = [Math.sin(f), Math.cos(f)], ay = [Math.cos(f), -Math.sin(f)];
  return [[-hl, -hw], [hl, -hw], [hl, hw], [-hl, hw]].map(([a, b]) => [e.x + ax[0] * a + ay[0] * b, e.z + ax[1] * a + ay[1] * b]);
}
function _wlHull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  lo.pop(); up.pop();
  return lo.concat(up);
}
function _wlArea(P) { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return a / 2; }
/** Sutherland-Hodgman: the part of a (possibly concave) subject polygon inside a CONVEX clip polygon. */
function _wlClipConvex(subject, clip) {
  if (!subject || subject.length < 3 || !clip || clip.length < 3) return [];
  const C = _wlArea(clip) < 0 ? clip : clip.slice().reverse();     // the shoelace above is negative for counter-clockwise (x right, z up)
  let out = subject.slice();
  for (let i = 0; i < C.length && out.length; i++) {
    const a = C[i], b = C[(i + 1) % C.length], inp = out; out = [];
    const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);   // > 0: left of a->b (inside for CCW)
    for (let j = 0; j < inp.length; j++) {
      const P = inp[j], Q = inp[(j + 1) % inp.length], sp = side(P), sq = side(Q);
      if (sp >= 0) out.push(P);
      if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
    }
  }
  return out.length >= 3 && Math.abs(_wlArea(out)) > 1e-6 ? out : [];
}
function _wlIsWater(s) { return !!s && s.kind === 'water'; }
function _wlAttachOf(e) { return String(e.attach || 'ground'); }
/** The deck an entity stands on: its 'deck:<id>' attachment, or (an agent of the life sim) its host when it has no other attachment. */
function _wlDeckOf(e) {
  const a = _wlAttachOf(e);
  if (a.startsWith('deck:')) return a.slice(5);
  if (e.host != null && (e.attach == null || /^deck/.test(a))) return e.host;
  return null;
}

/* ---------- shadows (L2, L5, section 19) ---------- */
/**
 * The shadows of a world now. sun: a Sky (worldSkyOf), a v2 L, { az, alt } or a resolved sun. o: { agents (movers, per frame;
 * only those visible: a.visible !== false, not culled, on screen), statics (false: movers only), W (frame width, 1600) }.
 * Static casters: the footprint extruded to the real height and laid along the sun (the hull of the foot and the tip footprint);
 * thin casters (railings, posts, lamps, reeds) are marked sil (the renderer lays the sprite's silhouette, so gaps stay gaps) and
 * see-through ones are lighter; bridges and raised decks cast their deck slab onto what is beneath. Every grounded or decked
 * thing gets a contact shadow. Nothing lies on water: the part of a shadow over a water surface is a hole (holes / holesScr),
 * where the water mirror dims a little instead. A mover on a deck casts onto the deck plane (it moves with the deck).
 * o.drawn(e) (optional): the renderer's word on whether e drew any pixels now; a thing that is not drawn casts no shadow.
 */
function worldShadowPlan(world, cam, sun, o) {
  cam = _wlCam(world, cam); o = o || {};
  const S = worldSunOf(sun, cam), out = [], waters = [].concat(...((world && world.surfaces) || []).filter(_wlIsWater).map(w => {
    // a winding stream is a concave polygon: its shadow holes come piece by piece (convex pieces of the water), never one clip of a concave shape
    const P = _wlSurfPoly(w);
    let pcs = [P];
    if (P && P.length > 4 && typeof _wwaConvexPieces === 'function') { try { const q = _wwaConvexPieces(P); if (Array.isArray(q) && q.length) pcs = q; } catch (e) { pcs = [P]; } }
    return pcs.map(q => ({ id: w.id, P: q }));
  }));
  const fogV = S.fogV || (sun && sun.fogV) || null, W = o.W || 2 * (cam.x0 || 800);
  const scr = (P, y) => P.map(p => { const q = _wlProj(cam, p[0], Math.max(0.05, p[1]), y); return [q.X, q.Y]; });
  const holesOf = (poly) => { const H = []; for (const w of waters) { const q = _wlClipConvex(w.P, poly); if (q.length) H.push({ surface: w.id, poly: q }); } return H; };
  const fogK = (z) => (fogV ? Math.exp(-z / fogV) : 1);
  const push = (r) => { if (r.holes && r.holes.length) r.holesScr = r.holes.map(h => scr(h.poly, r.y)); out.push(r); };
  const one = (e, mover) => {
    if (!e || !e.obj || !(e.z > 0) || e.backdrop) return;
    // o.drawn(e): false for a thing that draws no pixels now (no art this season, absent): it casts nothing (bug 17, orphan shadows)
    if (typeof o.drawn === 'function' && o.drawn(e) === false) return;
    const at = _wlAttachOf(e);
    if (at === 'water' || at === 'air' || at.startsWith('air') || e.layer === 'swim' || e.layer === 'air' || e.cls === 'boat') return;   // floaters and flyers: the water dims
    const deck = _wlDeckOf(e), y = deck != null && Number.isFinite(e.y) ? e.y : null;   // the receiver plane: a deck, else the ground
    const foot = _wlFoot(e), h = _wlHeight(e), cls = e.cls || (typeof worldObjectInfo === 'function' && worldObjectInfo(e.obj) ? worldObjectInfo(e.obj).cls : null);
    const cx = foot.reduce((a, p) => a + p[0], 0) / foot.length, cz = foot.reduce((a, p) => a + p[1], 0) / foot.length;
    if (e.z < WORLD_SHADOW_FAR) {
      // contact: a flattened disc a little wider than the foot (never on water: a wader's disc is a hole there)
      const rx = Math.max(0.15, Math.max(...foot.map(p => Math.abs(p[0] - cx))) * 1.15), rz = Math.max(0.12, Math.max(...foot.map(p => Math.abs(p[1] - cz))) * 1.15);
      const c = [];
      for (let i = 0; i < 10; i++) { const a = i / 10 * 2 * Math.PI; c.push([cx + rx * Math.cos(a), cz + rz * Math.sin(a)]); }
      push({ ref: e.id, kind: 'contact', mover: !!mover, poly: c, scr: scr(c, y), y, op: (S.contact || 0.3) * fogK(e.z), blur: 1, holes: deck != null ? [] : holesOf(c), on: deck != null ? 'deck:' + deck : 'ground' });
    }
    // a bridge or a raised deck: its slab casts onto whatever is beneath (shade under bridges by geometry)
    if (S.kind && e.deck && Array.isArray(e.deck.poly) && Number.isFinite(e.deck.y) && e.deck.y - (Number.isFinite(e.y) ? e.y : 0) > 1.2 && e.z < WORLD_SHADOW_FAR && !mover) {
      const hd = e.deck.y - (Number.isFinite(e.y) && cls !== 'walkway' ? e.y : 0), L = typeof sceneShadowTip === 'function' ? sceneShadowTip(cam, cx, cz, hd, S.g, S.tan) : [cx + S.g[0] * hd * S.tan, cz + S.g[1] * hd * S.tan];
      const dx = L[0] - cx, dz = L[1] - cz, poly = _wlHull(e.deck.poly.map(p => [p[0] + dx, p[1] + dz]));
      push({ ref: e.id, kind: 'deck', mover: false, poly, scr: scr(poly, null), y: null, op: S.op * 1.1 * fogK(e.z), blur: S.blur, dir: [dx, dz], holes: holesOf(poly), on: 'ground', sun: S.kind });
    }
    if (!S.kind || _WL_NO_CAST.test(e.obj) || h < 0.25 || e.z > WORLD_SHADOW_FAR) return;
    if (cls === 'walkway' && e.deck) return;                          // a deck's own cast is its slab, above
    const tip = typeof sceneShadowTip === 'function' ? sceneShadowTip(cam, cx, cz, h, S.g, S.tan) : [cx + S.g[0] * h * S.tan, cz + S.g[1] * h * S.tan];
    const dx = tip[0] - cx, dz = tip[1] - cz;
    const poly = _wlHull(foot.concat(foot.map(p => [p[0] + dx, p[1] + dz])));
    const size = e.size || (typeof worldObjectInfo === 'function' && worldObjectInfo(e.obj) ? worldObjectInfo(e.obj).size : null);
    const thin = _WL_THIN_CLS.has(cls) || (size && Math.min(size.w || 1, size.d || 1) < 0.3) || /railing|fence|post|lamp|reed|rush|pole|wire|sign/.test(e.obj);
    const sil = !_WL_PRISM_CLS.has(cls) || /railing|fence|palisade/.test(e.obj);
    const see = _WL_SEE_THROUGH.test(e.obj) ? 0.55 : 1;
    push({ ref: e.id, kind: 'cast', mover: !!mover, poly, scr: scr(poly, y), y, op: S.op * see * fogK(e.z), blur: S.blur, fade: !!S.fade, sun: S.kind, dir: [dx, dz],
      holes: deck != null ? [] : holesOf(poly), on: deck != null ? 'deck:' + deck : 'ground', thin: !!thin, sil, h });
  };
  if (o.statics !== false) for (const e of (world && world.entities) || []) if (e && e.static !== false) one(e, false);
  for (const a of o.agents || []) {
    if (!a || a.visible === false || a.culled) continue;
    const p = _wlProj(cam, a.x || 0, Math.max(0.05, a.z || 0), Number.isFinite(a.y) ? a.y : null), hw = (_wlDims(a.obj).l || 1) * p.k;
    if (p.X + hw < -W * 0.1 || p.X - hw > W * 1.1 || !(a.z > 0)) continue;   // off screen: no shadow (it only exists while visible)
    one(a, true);
  }
  // the CW / CCW sign of the poly orientation does not matter for drawing; normalise dir to one shared direction for checks
  out.sunDir = S.kind ? [S.g[0], S.g[1]] : null;
  return out;
}
/** How shaded a ground point is now (0..1): the strongest shadow over it, 0 inside a hole (water never takes a shadow). */
function worldShadeAt(plan, x, z, o) {
  o = o || {};
  let best = 0;
  for (const s of plan || []) {
    if (o.kinds && !o.kinds.includes(s.kind)) continue;
    if (o.on && s.on !== o.on) continue;
    if (!_wlInPoly(x, z, s.poly)) continue;
    if ((s.holes || []).some(h => _wlInPoly(x, z, h.poly))) continue;
    if (s.op > best) best = s.op;
  }
  return best;
}

/* ---------- reflections: none here ---------- */
/** The water level (y, metres) of a water surface (its own level, else the camera's water plane). */
function worldWaterLevel(world, s) {
  if (s && Number.isFinite(s.level)) return s.level;
  const cam = world && world.cam;
  return cam && Number.isFinite(cam.water) ? cam.water : 0;
}

/* ---------- night lights (L4) ---------- */
const _WL_GLOW = Object.freeze({ window: { r: 0.7, col: '#ffd890' }, win: { r: 0.7, col: '#ffd890' }, lamp: { r: 1.2, col: '#ffd9a0' }, head: { r: 0.6, col: '#fff6e0' },
  tail: { r: 0.5, col: '#ff4a3a' }, sign: { r: 1, col: '#ffe6b0' }, screen: { r: 0.8, col: '#cfe8ff' }, led: { r: 0.4, col: '#ffffff' }, beacon: { r: 1.5, col: '#ff5040' },
  rim: { r: 0.6, col: '#ffe0a0' }, port: { r: 0.4, col: '#ff4040' }, starboard: { r: 0.4, col: '#40ff70' }, beam: { r: 1, col: '#fff6e0' }, strip: { r: 0.4, col: '#ff6a50' }, amber: { r: 0.4, col: '#ffb030' } });
const _WL_VEHICLE = /^(vehicle|rail)\.|^person\.cyclist|^boat\./;
// glow kinds that are lit SURFACES, never light sources: lit glass and screens are drawn lit by their own shape (per window), with
// no halo and no pool (a halo per window blurred whole facades; a phone screen or a rim drawn as a light read as a white blob)
const _WL_SURFACE = new Set(['window', 'win', 'screen', 'rim', 'shop']);
// things that CARRY their glow parts: a figure's glow parts are reflective strips, an umbrella's sheen, a phone; never sources. Only
// a cyclist's own lamps (opaque front and rear lamps) light (SCENE_LESSONS H: the lit discs over walkers)
const _WL_CARRIED = /^(person|animal|bird|insect)\./;
// the halo of a source: its radius in metres from the glowing part's own size, at most this (a bulb's glow, never its reach)
const _WL_HALO_MAX = Object.freeze({ lamp: 0.7, sign: 0.5, beacon: 0.6, head: 0.45, beam: 0.45, tail: 0.25, led: 0.15, port: 0.3, starboard: 0.3, strip: 0.2, amber: 0.25 });
// caps of what a light may paint (scene units of the 1600 x 900 frame, peak alpha): soft additive radial falloffs, never flat discs
const WORLD_LIGHT_CAPS = Object.freeze({ haloPx: 26, haloAlpha: 0.5, poolPx: 480, poolAlpha: 0.3, beamAlpha: 0.12 });
const _wlGlowMemo = new Map();
/**
 * The glow parts of a library object: [{ kind, u, v, size, op, d, m, f }] (sprite units, foot at 0: the centre, the half size of the
 * part's box, its opacity and its path for drawing it lit), and the sprite's top.
 */
function _wlGlowParts(id, variant, season) {
  const key = id + '|' + (variant | 0) + '|' + (season || '');
  let r = _wlGlowMemo.get(key);
  if (r) return r;
  r = { parts: [], top: -1 };
  let sh = null;
  try { sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(id, variant | 0, season || 'summer') : null; } catch (e) { sh = null; }
  if (sh) {
    r.top = sh.box[1] || -1;
    for (const p of sh.order) for (const s of sh.parts[p] || []) {
      if (!s.glow) continue;
      const b = typeof scenePathBox === 'function' ? scenePathBox(s.d, s.m) : null;
      if (b) r.parts.push({ kind: s.glow, u: (b[0] + b[2]) / 2, v: (b[1] + b[3]) / 2, size: Math.max(b[2] - b[0], b[3] - b[1]) / 2, op: s.op == null ? 1 : s.op, d: s.d, m: s.m || null, f: typeof s.f === 'string' ? s.f : null });
    }
  }
  _wlGlowMemo.set(key, r);
  return r;
}
/** The glow parts of a library object at a variant and a drawn form (see _wlGlowParts): the compositor draws lit glass from them. */
function worldGlowParts(id, variant, season) { return _wlGlowParts(id, variant, season); }
/**
 * Is glow part i of an entity lit now? One seeded rule for the light plan and the compositor's lit glass. key: the entity's id;
 * kind: the part's glow kind (after vehicle lamps became 'head'); alt: the sun's elevation; share: the lit share of windows;
 * o: { veh, moving, murky, wetDim }. Windows light one by one (a threshold per window between -9 and +2 degrees and a share draw);
 * a lamp's heads switch together (one photocell per lamp); vehicle lamps only while moving.
 */
function worldGlowOn(key, i, kind, alt, share, o) {
  o = o || {};
  const r = _wlRng(key + '|g|' + i);
  if (kind === 'window' || kind === 'win' || kind === 'shop') {
    if (o.veh) return !!o.moving && alt < 4;                         // a lit tram, train or bus interior
    const thr = -9 + 11 * r(), u = r(); return alt < thr && u < share;
  }
  if (kind === 'head' || kind === 'tail' || kind === 'beam' || kind === 'strip' || kind === 'amber') return !!o.moving && (alt < 3 || !!o.murky || !!o.wetDim);
  if (kind === 'lamp') { const q = _wlRng(key + '|lamp')(); return alt < -1 + 3 * q || !!o.murky; }
  if (kind === 'rim') return false;
  return alt < 0 || !!o.murky;
}
/**
 * Every light source of the world, ONLY from the library's glow parts: an entity with no glow part never lights.
 * o: { sky (worldSkyOf: the sun's elevation decides), night (bool: the old switch; true = deep night, false = noon), L, share
 * (lit share of windows at deep night; default from the hour), season, agents, wet }.
 *   windows: each window has a seeded threshold between -9 and +2 degrees of sun elevation and a seeded share draw, so windows
 *            light one by one through dusk and never all at once, and none by day;
 *   lamps, signs, beacons: on below a seeded threshold near sunset (or in fog / deep overcast), with a pool on the ground;
 *   vehicles (agents): head lamps ('lamp' parts of a vehicle) and tail lights on at dusk, at night, in fog and in rain, a beam
 *            on the road ahead; tram, train and bus windows (lit interiors) on below +4 degrees; a parked (static) vehicle stays dark.
 */
function worldLights(world, o) {
  o = o || {};
  const sky = o.sky && o.sky.__sky ? o.sky : null;
  const alt = sky ? sky.sun.alt : o.night != null ? (o.night ? -20 : 40) : o.L && Number.isFinite(o.L.alt) ? o.L.alt : (o.L && o.L.dark > 0.5 ? -20 : 40);
  const share = o.share != null ? o.share : sky ? sky.windowShare : o.night ? WORLD_WINDOW_SHARE : o.L && Number.isFinite(o.L.windowShare) && o.L.windowShare > 0 ? o.L.windowShare : WORLD_WINDOW_SHARE;
  const murky = sky ? (sky.fog > 0.3 || (sky.overcast > 0.85 && alt < 8)) : false, wetDim = sky ? sky.rain || sky.fog > 0.3 : !!o.wet;
  const out = [];
  const one = (e, agent) => {
    if (!e || !e.obj) return;
    const G = _wlGlowParts(e.obj, e.variant, o.season);
    if (!G.parts.length) return;
    const h = _wlHeight(e), mpu = h / Math.max(1, -G.top), f = ((Number(e.facing) || 0) % 360 + 360) % 360, flip = e.mirror != null ? (e.mirror ? -1 : 1) : f > 180 ? -1 : 1;
    // a moored boat (a static) is a home: its windows light one by one like a house's; a boat under way lights as a vehicle
    const y0 = Number.isFinite(e.y) ? e.y : 0, src = typeof _scatSourceOf === 'function' ? _scatSourceOf(e.obj) : null, veh = _WL_VEHICLE.test(e.obj) && !(!agent && /^boat\./.test(e.obj));
    const key = e.id || e.obj, moving = agent && !e.parked && e.state !== 'parked', carried = _WL_CARRIED.test(e.obj), cyclist = /^person\.cyclist/.test(e.obj);
    // a fixed lamp lights ONE pool on the ground under its head(s) (a double lamp is not two pools)
    const lampParts = G.parts.map((p, i) => [p, i]).filter(([p]) => p.kind === 'lamp');
    let pooled = false;
    G.parts.forEach((p, i) => {
      let kind = p.kind;
      // a rim is the figure's own catch-light (drawn by its sprite at low sun), never a light source: no glow, no pool
      if (kind === 'rim') return;
      // a figure's glow parts are reflective strips, an umbrella's sheen, a phone: lit by the sprite, never sources (only a
      // cyclist's opaque lamps light)
      if (carried && !(cyclist && (kind === 'lamp' || kind === 'tail') && p.op >= 0.95)) return;
      if (veh && kind === 'lamp') kind = 'head';
      const t = _WL_GLOW[kind] || _WL_GLOW.window;
      const on = worldGlowOn(key, i, kind, alt, share, { veh, moving, murky, wetDim });
      const surface = _WL_SURFACE.has(kind);
      // the halo: from the glowing part's own size (a bulb a few cm across glows a little; never the light's reach), capped by kind
      const halo = surface ? 0 : Math.round(_wlClamp(p.size * mpu * 2.2, 0.06, _WL_HALO_MAX[kind] || 0.4) * 1000) / 1000;
      // u, v: the glow part's point in the sprite's own units (the compositor lays the halo on the drawn sprite there: scr)
      const L = { ref: e.id, part: i, kind, x: e.x + flip * p.u * mpu, y: y0 - p.v * mpu, z: e.z, u: p.u, v: p.v, r: t.r, halo, src: !surface, col: t.col, on, agent: !!agent };
      if (kind === 'lamp' && !veh && src && src.kind === 'lamp' && !pooled) {
        // the pool under the lamp's head(s): centred under them, its reach from the lamp's light spec, its falloff from the head's height
        const xs = lampParts.map(([q]) => e.x + flip * q.u * mpu), hy = Math.max(0.5, Math.max(...lampParts.map(([q]) => -q.v * mpu)));
        L.pool = { x: xs.reduce((a, v) => a + v, 0) / xs.length, z: e.z, r: src.r || 6, h: Math.round(hy * 100) / 100, col: src.col || t.col };
        pooled = true;
      }
      if (kind === 'head' && /^vehicle\./.test(e.obj)) {
        // the beam: a cone on the road ahead of the vehicle, along its heading (camera frame: 0 = away, 90 = right)
        const hd = (Number.isFinite(e.heading) ? e.heading : f) * _WL_D;
        L.beam = { x: L.x, z: e.z, dx: Math.sin(hd), dz: Math.cos(hd), len: 14, w: 3.5 };
      }
      out.push(L);
    });
  };
  for (const e of (world && world.entities) || []) one(e, false);
  for (const a of o.agents || []) one(a, true);
  return out;
}

/* ---------- glitter on water: the sun's road by day, the moon's at night (L4) ---------- */
/**
 * The glitter road on a water region (a worldWaterPlan region, or anything with clip / box). The source is the sun (low,
 * 0 to 35 degrees, not overcast) or a bright moon after dark; its screen column comes from its bearing against the camera's
 * heading. -> { kind: 'sun' | 'moon' | null, X, col, k, glints: [{ x, y, len, g }] } in scene units, seeded.
 */
function worldGlitterPlan(region, sky, cam, o) {
  o = o || {};
  const none = { kind: null, X: 0, col: '#ffffff', k: 0, glints: [] };
  if (!region || !sky || !sky.__sky || !cam) return none;
  const wrap = (a) => ((a % 360) + 540) % 360 - 180, half = (cam.fov || 66) / 2;
  let body = null, kind = null, k = 0, col = '#fff6e0';
  if (sky.sun.alt > 0 && sky.sun.alt < 35 && sky.overcast < 0.8) { body = sky.sun; kind = 'sun'; k = (1 - sky.overcast) * _wlClamp((35 - sky.sun.alt) / 25, 0.3, 1); col = _wlMix('#fff6e0', sky.sunCol, 0.5); }
  else if (sky.dark > 0.45 && sky.moon.alt > 0 && sky.moon.illum > 0.25 && sky.cover < 0.75) { body = sky.moon; kind = 'moon'; k = sky.moon.illum * (1 - sky.cover) * _wlClamp(sky.moon.alt / 8, 0.3, 1); col = '#e6eefa'; }
  if (!body) return none;
  const rel = wrap((body.az || 0) - (cam.heading || 0));
  if (Math.abs(rel) > half + 12) return none;                           // behind or far to the side: no road on this water
  const X = (cam.x0 || 800) + cam.f * Math.tan(_wlClamp(rel, -80, 80) * _WL_D);
  const box = region.box || [0, cam.horizon, 2 * (cam.x0 || 800), 900], rnd = _wlRng('glitter|' + (region.id || '') + '|' + kind), yMax = Math.min(box[3], o.H || 900);
  const clips = Array.isArray(region.clips) && region.clips.length ? region.clips : Array.isArray(region.clip) ? [region.clip] : null, inside = (x, y) => (clips ? clips.some(P => _wlInPoly(x, y, P)) : true);
  const glints = [], n = o.n || 30, y0 = Math.max(box[1], cam.horizon + 1), span = Math.max(1, yMax - y0);
  for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
    const t = Math.pow(rnd(), 0.8), y = y0 + 2 + t * Math.max(0, span - 4), hw = 50 * (0.2 + t * 1.6), x = X + (rnd() * 2 - 1) * hw, len = (5 + rnd() * 15) * (0.35 + t);
    if (!inside(x, y) || !inside(x + len, y)) continue;
    glints.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, len: Math.round(len * 10) / 10, g: i % 3 });
    i++;
  }
  return { kind, X: Math.round(X * 10) / 10, col, k: Math.round(k * 100) / 100, glints };
}

/* ---------- haze ---------- */
function worldHazePlan(world, cam, L, atmos) {
  const E = (world && world.entities) || [], out = new Float32Array(E.length);
  const fogV = L && L.__sky ? L.fogV : null;
  E.forEach((e, i) => {
    const d = Math.hypot(e.x || 0, e.z || 0);
    let h = typeof sceneHazeAt === 'function' ? sceneHazeAt(d, atmos || (world && world.atmos), L && L.__sky ? L.L : L) : 0.47 * (1 - Math.exp(-d / 12000));
    if (fogV) h = Math.max(h, 0.9 * (1 - Math.exp(-d / fogV)));
    out[i] = h;
  });
  return out;
}

/* ---------- the frame record fields look owns (16.1) ---------- */
/**
 * Per entity (statics and o.agents), the shadow and reflection fields of the frame record: shadow { poly, dir, holes, on } of its
 * cast (or contact) shadow; reflect { surface, rowY } from the water surface's mirror (worldWaterReflectOf, typeof) or null.
 * o: { sky / sun, agents, regions (worldWaterPlan, reused) }.
 */
function worldLookOf(world, cam, o) {
  o = o || {};
  cam = _wlCam(world, cam);
  const plan = worldShadowPlan(world, cam, o.sky || o.sun || null, { agents: o.agents });
  const regions = o.regions || (typeof worldWaterPlan === 'function' ? worldWaterPlan(world, cam) : []);
  const map = new Map();
  const ents = ((world && world.entities) || []).concat(o.agents || []);
  for (const e of ents) if (e && e.id != null) map.set(e.id, { shadow: null, reflect: null });
  for (const s of plan) {
    const m = map.get(s.ref);
    if (!m) continue;
    if (s.kind === 'cast' || !m.shadow) m.shadow = { poly: s.poly, dir: s.dir || null, holes: (s.holes || []).map(h => h.poly), on: s.on, kind: s.kind };
  }
  if (typeof worldWaterReflectOf === 'function') for (const e of ents) { const m = e && map.get(e.id); if (m) m.reflect = worldWaterReflectOf(world, cam, e, regions); }
  return map;
}

/* ---------- the 'light' system (11.2; phase light) ---------- */
/**
 * One step of the light system: the sky for the world's time context (world.ctx, from the time system; else ctx), the shadow
 * sun for its camera, and the lamp switch: when the sun crosses the lamp threshold, 'lightsOn' / 'lightsOff' go out on world.bus.
 */
function worldLightTick(world, ctx) {
  if (!world) return null;
  const c = ctx || world.time || world.ctx || null;
  if (!c) return null;
  const sky = worldSkyOf(c, { heading: world.cam && world.cam.heading });
  world.sky = sky;
  world.sun = worldSunOf(sky, world.cam || null);
  const on = sky.sun.alt < 0.5 || sky.fog > 0.3;
  const st = world._wlLight || (world._wlLight = { on: null });
  if (st.on !== null && st.on !== on && world.bus && typeof world.bus.emit === 'function') world.bus.emit(on ? 'lightsOn' : 'lightsOff', { alt: sky.sun.alt, band: sky.band });
  st.on = on;
  return sky;
}
if (typeof worldSystem === 'function') {
  worldSystem({ id: 'light', phase: 'light', rate: 2, budgetMs: 0.3, components: { read: ['transform', 'desc'], write: ['look'] },
    init(world) { worldLightTick(world); }, update(world) { worldLightTick(world); } });
}

/* ---------- browser: drawing (the compositor calls these while baking chunks and per frame) ---------- */
/**
 * Fill the shadow polygons (scene units -> device via vs, ox, oy) with their water holes cut out. o: { vs, ox, oy, col,
 * spriteOf(ref) -> { c, x0, y0, w, h, s, flip, X, Y, top } (sil entries then lay the sprite's silhouette with sceneShadowMatrix,
 * so a railing's shadow keeps its gaps), cam, sun (worldSunOf) }.
 */
const _wlSilMemo = typeof WeakMap === 'function' ? new WeakMap() : null;
/** A sprite canvas as a flat silhouette in one colour (memoised per canvas and colour); null when no canvas can be made. */
function _wlSilhouette(c, col) {
  if (!c || !c.width || !c.height) return null;
  let byCol = _wlSilMemo && _wlSilMemo.get(c);
  if (byCol && byCol.has(col)) return byCol.get(col);
  let t = null;
  try {
    t = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(c.width, c.height) : typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: c.width, height: c.height }) : null;
    if (t) { const g = t.getContext('2d'); g.drawImage(c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); }
  } catch (e) { t = null; }
  if (_wlSilMemo) { if (!byCol) { byCol = new Map(); _wlSilMemo.set(c, byCol); } byCol.set(col, t); }
  return t;
}
function worldDrawShadows(ctx, plan, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0, col = o.col || '#14202e';
  let n = 0;
  const path = (P) => { ctx.moveTo(P[0][0] * vs + ox, P[0][1] * vs + oy); for (const q of P) ctx.lineTo(q[0] * vs + ox, q[1] * vs + oy); ctx.closePath(); };
  for (const s of plan) {
    if (!s.scr || s.scr.length < 3 || !(s.op > 0)) continue;
    ctx.save();
    if (s.holesScr && s.holesScr.length && ctx.clip) {
      ctx.beginPath(); ctx.rect(-1e5, -1e5, 2e5, 2e5);
      for (const H of s.holesScr) if (H.length >= 3) path(H);
      ctx.clip('evenodd');
    }
    ctx.globalAlpha = s.op; ctx.fillStyle = col;
    const sp = s.sil && o.spriteOf ? o.spriteOf(s.ref) : null, sil = sp && sp.c ? _wlSilhouette(sp.c, col) : null;
    if (sil && o.cam && o.sun && typeof sceneShadowMatrix === 'function') {
      // the sprite's SILHOUETTE in the shadow colour (drawing the sprite itself laid its own colours on the ground: a green ghost
      // of every tree across a boardwalk at golden hour)
      const fz = Math.max(0.5, (s.poly[0] && s.poly[0][1]) || 1), M = sceneShadowMatrix(o.cam, { X: sp.X, Y: sp.Y, x: sp.x, d: sp.d || fz }, sp.s || 1, -(sp.top || sp.y0 || -1), sp.flip, o.sun, vs, ox, oy);
      ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
      ctx.drawImage(sil, sp.x0, sp.y0, sp.w, sp.h);
    } else { ctx.beginPath(); path(s.scr); ctx.fill(); }
    ctx.restore(); n++;
  }
  return n;
}
/**
 * What the lights paint, in scene units (pure: the caps are tested here, the canvas only fills these). lights: worldLights; cam: the
 * v2 camera; o: { sky (fog widens halos and dims pools), stage: 'ground' (pools and beams: on the ground, under what stands on it)
 * | 'glow' (halos round the sources) | undefined (both) }.
 * -> [{ kind: 'pool' | 'beam' | 'halo', ref, part, X, Y, rx, ry, a (peak alpha), col, h (pool: the head's height over its reach,
 *       for the falloff), pts (beam: [apex, left, right]) }]
 *   pool: a perspective ellipse of the lamp's reach on the ground with a physical falloff (bright under the head, a soft tail, nothing
 *         at the rim); peak alpha <= WORLD_LIGHT_CAPS.poolAlpha, screen half-width <= poolPx (a nearer pool is scaled down whole);
 *   halo: a soft radial glow round the glowing part, of the part's own size (L.halo metres), <= haloPx, peak alpha <= haloAlpha;
 *         lit surfaces (windows, screens) and carried reflectors have none;
 *   beam: a vehicle's head-lamp cone on the road, fading along its length, peak alpha <= beamAlpha.
 */
function worldLightDraws(lights, cam, o) {
  o = o || {};
  const out = [], C = WORLD_LIGHT_CAPS, sky = o.sky && o.sky.__sky ? o.sky : null, fog = sky ? sky.fog || 0 : 0;
  if (!cam || !Array.isArray(lights)) return out;
  const near = Math.max(0.3, (cam.dMin || 1) * 0.5), ground = o.stage !== 'glow', glow = o.stage !== 'ground';
  for (const L of lights) {
    if (!L || !L.on) continue;
    if (ground && L.pool && L.pool.z > near) {
      const P = L.pool, c = _wlProj(cam, P.x, Math.max(near, P.z));
      const yN = _wlProj(cam, P.x, Math.max(near, P.z - P.r)).Y, yF = _wlProj(cam, P.x, P.z + P.r).Y;
      let rx = P.r * c.k, ry = Math.max(0.5, (yN - yF) / 2, rx * 0.09);
      if (rx > C.poolPx) { const k = C.poolPx / rx; rx *= k; ry *= k; }
      const Y = _wlClamp(c.Y, Math.min(yF, yN), Math.max(yF, yN));
      if (rx >= 1.5) out.push({ kind: 'pool', ref: L.ref, part: L.part, X: c.X, Y, rx, ry, a: C.poolAlpha * (1 - 0.45 * fog), col: P.col || L.col, h: Math.max(0.15, Math.min(1.2, (P.h || 4) / Math.max(0.5, P.r))) });
    }
    if (ground && L.beam && L.beam.z > near) {
      const b = L.beam, a = _wlProj(cam, b.x, Math.max(near, b.z)), e1 = _wlProj(cam, b.x + b.dx * b.len - b.dz * b.w, Math.max(near, b.z + b.dz * b.len + b.dx * b.w)), e2 = _wlProj(cam, b.x + b.dx * b.len + b.dz * b.w, Math.max(near, b.z + b.dz * b.len - b.dx * b.w));
      out.push({ kind: 'beam', ref: L.ref, part: L.part, X: a.X, Y: a.Y, rx: 0, ry: 0, a: C.beamAlpha, col: L.col, pts: [[a.X, a.Y], [e1.X, e1.Y], [e2.X, e2.Y]] });
    }
    if (glow && L.src !== false && L.halo !== 0 && L.z > near) {
      // L.scr: the glow part's point on its owner's DRAWN sprite (scene units), when the compositor knows it (bug 13: a projected world
      // point drifts from the sprite's own glow part, so a near lamp's halo floated beside its head)
      const q = _wlProj(cam, L.x, L.z, L.y), hm = Number.isFinite(L.halo) ? L.halo : Math.min(0.4, (L.r || 0.6) * 0.3);
      const r = _wlClamp(hm * q.k * (1 + 0.6 * fog), 0.8, C.haloPx);
      out.push({ kind: 'halo', ref: L.ref, part: L.part, X: L.scr ? L.scr[0] : q.X, Y: L.scr ? L.scr[1] : q.Y, rx: r, ry: r, a: C.haloAlpha * (fog > 0 ? 0.85 : 1), col: L.col });
    }
  }
  return out;
}
function _wlRgba(hex, a) { const c = _wlRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`; }
/**
 * Paint the lights additively ('lighter'): the pools and beams on the ground (o.stage 'ground'), the halos round the sources (o.stage
 * 'glow'), or both. Every shape is a soft gradient within the caps of worldLightDraws; nothing is a flat disc. o: { vs, ox, oy, sky,
 * stage, only (a Set of refs: only their lights) }. -> the number of shapes painted.
 */
function worldDrawLights(ctx, lights, cam, o) {
  o = o || {};
  const vs = o.vs || 1, ox = o.ox || 0, oy = o.oy || 0;
  const list = o.only ? (lights || []).filter(L => o.only.has(L.ref)) : lights;
  let n = 0;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const d of worldLightDraws(list, cam, o)) {
    if (!ctx.createRadialGradient && d.kind !== 'beam') continue;
    if (d.kind === 'pool') {
      // a point light h (of its reach) above the ground: the light falls as (1 + (rho / h)^2)^-1.5, eased to nothing at the rim
      ctx.save(); ctx.translate(d.X * vs + ox, d.Y * vs + oy); ctx.scale(1, d.ry / d.rx);
      const R = d.rx * vs, g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      for (const u of [0, 0.1, 0.22, 0.36, 0.5, 0.65, 0.8, 1]) { const e = Math.pow(1 + (u / d.h) * (u / d.h), -1.5) * (1 - u * u * (3 - 2 * u)); g.addColorStop(u, _wlRgba(d.col, d.a * e)); }
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(-R, -R, 2 * R, 2 * R);
      ctx.restore();
    } else if (d.kind === 'beam') {
      const [A, B, Cc] = d.pts, mx = (B[0] + Cc[0]) / 2, my = (B[1] + Cc[1]) / 2;
      const g = ctx.createLinearGradient ? ctx.createLinearGradient(A[0] * vs + ox, A[1] * vs + oy, mx * vs + ox, my * vs + oy) : null;
      if (g) { g.addColorStop(0, _wlRgba(d.col, d.a)); g.addColorStop(1, _wlRgba(d.col, 0)); ctx.fillStyle = g; ctx.globalAlpha = 1; } else { ctx.fillStyle = d.col; ctx.globalAlpha = d.a * 0.5; }
      ctx.beginPath(); ctx.moveTo(A[0] * vs + ox, A[1] * vs + oy); ctx.lineTo(B[0] * vs + ox, B[1] * vs + oy); ctx.lineTo(Cc[0] * vs + ox, Cc[1] * vs + oy); ctx.closePath(); ctx.fill();
    } else {
      const cx = d.X * vs + ox, cy = d.Y * vs + oy, r = d.rx * vs, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, _wlRgba(d.col, d.a)); g.addColorStop(0.18, _wlRgba(d.col, d.a * 0.42)); g.addColorStop(0.45, _wlRgba(d.col, d.a * 0.12)); g.addColorStop(1, _wlRgba(d.col, 0));
      ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    }
    n++;
  }
  ctx.restore();
  return n;
}

/* ---------- v2 render pass for a v3 compiled scene (C.world; opted in by C.fx.world = 2) ---------- */
if (typeof sceneRenderPassDefine === 'function') {
  const isW = (C) => !!(C && C.world && C.world.entities);
  sceneRenderPassDefine({
    id: 'world-light', order: { prebake: 15, framePost: 70 },
    applies: isW,
    key: (L) => 'wl' + (L && L.dark > 0.5 ? 'n' : 'd') + (L && Number.isFinite(L.alt) ? Math.round(L.alt / 3) : ''),
    // plans once per bake: the compositor (render) draws the shadows into the chunks; the water mirrors the composite itself
    prebake(env) {
      const W = env.C.world, cam = env.cam || W.cam, L = env.L, sky = L ? worldSkyOf(L) : null;
      env.worldLight = { sky, shadow: worldShadowPlan(W, cam, sky || L), lights: worldLights(W, { sky, L, season: env.season }), haze: worldHazePlan(W, cam, L, env.C.atmos) };
    },
    framePost(env, ctx) {
      const st = env.worldLight;
      if (!st || typeof document === 'undefined') return 0;
      return worldDrawLights(ctx, st.lights, env.cam || env.C.world.cam, env);
    },
    stats(env) { const st = env.worldLight || {}; return { shadows: (st.shadow || []).length, lights: (st.lights || []).filter(l => l.on).length }; },
  });
}
