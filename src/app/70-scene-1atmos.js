/* ============================================================
   SCENE ENGINE v2: atmosphere and light (docs/dev/SCENE_ENGINE_V2.md section 7; builder C).
   PURE classic script: functions and consts only, no DOM, nothing expensive at load. It may call
   70-scene-0core.js at load; everything else (the ground file's projection, the weather file, the
   SVG helpers, the kit) only lazily, inside functions, behind typeof guards.

   Aerial perspective (7.1)
     SCENE_ATMOS                       the presets: clear haze city mist coast mountain ({ V metres, max, tint, k })
     sceneAtmosCompile(data, C)        -> C.atmos = { preset, V, max, tint, auto, water }   (authored; no light)
     sceneAtmosResolve(atmos, L, wx)   -> { preset, V, max, col }   (the preset now: auto's dawn mist, weather, the sun's lean)
     sceneHazeAt(d, atmos, L)          -> max * (1 - exp(-d / V)): the haze of a point d metres away (0 near, never a ghost)
   Night light sources (7.3, 7.4)
     SCENE_LIGHT_SOURCES               the defaults by object id glob: lamp pools, station lamps, shop and pub spill
     sceneLightsOf(C)                  -> [{ kind: 'lamp' | 'spill' | 'halo', x, d, X, Y, hx, hy, r, h, w, col, i, layer }]
     sceneLiftAt(item, lights, L)      -> 0 | 0.15 | 0.3 | 0.45: how much a placement is lifted toward a nearby lamp's colour
     SCENE_WINDOW_SHARE                [[local hour, share of windows lit], ...] (a town goes dark late at night)
     sceneWindowShare(Lor hour)        the share now (0 by day)
   The v2 light (7.5)
     sceneLightV2(o, view, data)       sceneLight (the kit's K.live, unchanged) + sunG, sunTan, moonG, moonTan, localHour,
                                       weekday, wx (sceneWeather), atmos; in a v2 scene the view's horizon, fov and heading
                                       come from the camera, L.haze is the atmosphere's colour, and the v1 weather flags
                                       (L.rain, L.snow, L.fog) are cleared: the v2 weather pass draws the weather from L.wx.
   The v2 grade (v2 scenes only; v1 light untouched)
     sceneGradeAt(L)                   -> { golden, dusk }: how golden / dusky the light is now
     sceneLightGradeV2(L)              amber golden hour (split tone, warm low sky and haze), cool pink dusk, dark night masses,
                                       night water mirroring the sky: L.grade, L.grade2 (applied by sceneTone), L.low / lowSun / mid
   Helpers shared with the passes: sceneAtmosIsV2(data), sceneAtmosProject(cam, x, d, h)
   ============================================================ */
const SCENE_ATMOS = Object.freeze({
  clear: Object.freeze({ V: 9000, max: 0.7, tint: null, k: 0 }),
  haze: Object.freeze({ V: 4000, max: 0.7, tint: '#f2d6a8', k: 0.15 }),       // a summer heat haze: warm
  city: Object.freeze({ V: 3000, max: 0.6, tint: '#9a958c', k: 0.2 }),        // grey-brown
  mist: Object.freeze({ V: 900, max: 0.8, tint: '#ffffff', k: 0.3 }),         // a dawn river
  coast: Object.freeze({ V: 5000, max: 0.65, tint: '#dfe8f0', k: 0.2 }),
  mountain: Object.freeze({ V: 15000, max: 0.75, tint: '#9fb6d6', k: 0.3 }),  // a cool blue
});
const _scatD = Math.PI / 180;
const _scatClamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** A hex colour mix (the core's _scMix when present; the same arithmetic otherwise). */
function _scatMix(a, b, t) {
  if (typeof _scMix === 'function') return _scMix(a, b, t);
  if (!t || !b) return a;
  const h = c => { let s = String(c).replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const A = h(a), B = h(b), k = _scatClamp(t, 0, 1);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
const _scatHash = (s) => (typeof sceneHash === 'function' ? sceneHash(s) : 1);

/**
 * Is this scene data v2? A v2 camera has a horizon, an eye height or a field of view (v1 data may carry
 * camera: { pan, period }, the slow pan, which does not make it v2). A compiled scene says so in C.v.
 */
function sceneAtmosIsV2(x) {
  if (!x) return false;
  if (x.v === 2 && x.cam) return true;
  const c = x.camera;
  return !!(c && typeof c === 'object' && (c.eye != null || c.horizon != null || c.fov != null || c.preset != null));
}
/** The camera's projection: A's sceneProject when it is loaded, else the formulas of V2 2.2 (flat ground). -> { X, Y, k } */
function sceneAtmosProject(cam, x, d, h) {
  if (typeof sceneProject === 'function') { try { const p = sceneProject(cam, x, d, h == null ? null : h); if (p && Number.isFinite(p.X)) return p; } catch (e) { /* the formula below */ } }
  const f = cam.f || 800 / Math.tan((cam.fov || 66) * _scatD / 2), dd = Math.max(0.05, d);
  return { X: (cam.x0 == null ? 800 : cam.x0) + f * x / dd, Y: (cam.horizon == null ? 470 : cam.horizon) + f * ((cam.eye == null ? 1.65 : cam.eye) - (h || 0)) / dd, k: f / dd };
}
/** The focal length of a compiled camera. */
function _scatF(cam) { return cam.f || 800 / Math.tan((cam.fov || 66) * _scatD / 2); }

/* ---------- aerial perspective (7.1) ---------- */
/** The atmos input of a scene: a preset name, 'auto', or an object { V, max, tint }. */
function _scatPreset(input) {
  if (input && typeof input === 'object') {
    const V = Number(input.V) > 0 ? Number(input.V) : SCENE_ATMOS.clear.V, max = Number.isFinite(input.max) ? _scatClamp(input.max, 0, 1) : SCENE_ATMOS.clear.max;
    return { preset: 'custom', V, max, tint: typeof input.tint === 'string' ? input.tint : null, k: input.tint ? (Number.isFinite(input.k) ? input.k : 0.25) : 0 };
  }
  const p = SCENE_ATMOS[input] || SCENE_ATMOS.clear;
  return { preset: SCENE_ATMOS[input] ? input : 'clear', V: p.V, max: p.max, tint: p.tint, k: p.k };
}
/**
 * The authored atmosphere (V2 12: C.atmos). 'auto' (the default) is 'city' in an urban setting, 'coast' with sea water, else
 * 'clear'; whether a dawn over water is misty is decided with the light (sceneAtmosResolve). Sets C.atmos when C is given.
 */
function sceneAtmosCompile(data, C) {
  data = data || {};
  const input = data.atmos == null ? 'auto' : data.atmos;
  const water = (data.water || []).filter(w => w && typeof w === 'object');
  const sea = water.some(w => w.kind === 'sea'), anyWater = water.length > 0;
  let out;
  if (input === 'auto') {
    const setting = (C && C.setting) || data.setting || 'natural';
    const base = setting === 'urban' ? 'city' : sea ? 'coast' : 'clear';
    out = Object.assign(_scatPreset(base), { preset: 'auto', auto: base });
  } else out = Object.assign(_scatPreset(input), { auto: null });
  out.water = anyWater;
  const A = { preset: out.preset, V: out.V, max: out.max, tint: out.tint, k: out.k, auto: out.auto, water: out.water };
  if (C && typeof C === 'object') C.atmos = A;
  return A;
}
/** The whole days since 1970 (UTC) of a time. */
const _scatDay = (ms) => Math.floor((Number(ms) || 0) / 86400000);
/**
 * The atmosphere now: the authored preset (C.atmos, or a preset name / object), auto's dawn mist over water (about 30 % of
 * dates, seeded by the date and the place), then the weather (fog 150 to 400 m, mist 600 to 900 m, rain V x 0.5, falling snow
 * V x 0.4), and the colour: L.haze mixed toward the preset's tint and leaning to the low sun's side when backlit.
 */
function sceneAtmosResolve(atmos, L, wx) {
  const a = atmos && typeof atmos === 'object' && atmos.V ? atmos : sceneAtmosCompile({ atmos: atmos == null ? 'auto' : atmos });
  let preset = a.auto || a.preset, V = a.V, max = a.max, tint = a.tint, k = a.k || 0;
  if (a.preset === 'auto' && a.water && L && Number.isFinite(L.alt) && L.alt > -6 && L.alt < 6 && L.morning) {
    const seed = _scatHash('mist|' + _scatDay(L.ms) + '|' + Math.round((L.lat || 0) * 2) + '|' + Math.round((L.lon || 0) * 2));
    if (seed % 100 < 30) { const m = SCENE_ATMOS.mist; preset = 'mist'; V = m.V; max = m.max; tint = m.tint; k = m.k; }
  }
  let fogCol = null;
  if (wx) {
    if (wx.fog >= 0.75) { V = Math.min(V, 400 - 250 * _scatClamp((wx.fog - 0.75) / 0.25, 0, 1)); max = Math.max(max, 0.9); fogCol = 0.55; }
    else if (wx.fog > 0) { V = Math.min(V, 900 - 300 * _scatClamp(wx.fog / 0.75, 0, 1)); max = Math.max(max, 0.85); fogCol = 0.35; }
    if (wx.rain > 0) V *= 1 - 0.5 * _scatClamp(wx.rain / 0.6, 0, 1);
    if (wx.snow > 0) V *= 1 - 0.6 * _scatClamp(wx.snow / 0.6, 0, 1);
  }
  let col = (L && L.haze) || '#d6e2e6';
  if (tint && k) col = _scatMix(col, tint, k);
  if (fogCol && L) col = _scatMix(col, _scatMix('#dfe3e4', '#2a3040', L.dark || 0), fogCol);
  if (L && L.lowSun && L.backlit) col = _scatMix(col, L.lowSun, 0.5 * _scatClamp(L.backlit, 0, 1));
  return { preset, V: Math.round(V), max: Math.round(max * 100) / 100, col };
}
/**
 * The haze of a point d metres away (7.1): max * (1 - exp(-d / V)). atmos: the resolved L.atmos when L has one, else C.atmos
 * (or a preset name); with neither, 'clear'. Clear: 0.008 at 100 m, 0.14 at 2 km, 0.47 at 10 km. Near objects get none.
 */
function sceneHazeAt(d, atmos, L) {
  const a = (L && L.atmos && L.atmos.V) ? L.atmos : (atmos && typeof atmos === 'object' && atmos.V) ? atmos : _scatPreset(atmos || 'clear');
  if (!(d > 0)) return 0;
  return a.max * (1 - Math.exp(-d / a.V));
}

/* ---------- night light sources (7.3) ---------- */
/**
 * The default light of library objects, by id glob (first match wins). kind lamp: a pool r metres across on the ground under a
 * head h metres up; spill: light from lit ground-floor windows and shopfronts onto the ground in front (depth metres); halo: a
 * glow round a lit sign or lantern only. An object's own `light` field wins over this table.
 */
const SCENE_LIGHT_SOURCES = Object.freeze([
  { match: 'street.lamp*', kind: 'lamp', r: 7, h: 5.5, col: '#ffd9a0' },
  { match: 'street.station-*', kind: 'lamp', r: 9, h: 4.5, col: '#f4f0e0' },
  { match: '*.platform-lamp*', kind: 'lamp', r: 9, h: 4.5, col: '#f4f0e0' },
  { match: 'rail.*lamp*', kind: 'lamp', r: 9, h: 4.5, col: '#f4f0e0' },
  { match: 'structure.lantern*', kind: 'lamp', r: 3, h: 1.6, col: '#ffcf8a' },
  { match: 'street.lantern*', kind: 'halo', r: 2, col: '#ffcf8a' },
  { match: 'building.shopfront*', kind: 'spill', depth: 2.6, col: '#ffe0a8' },
  { match: 'building.*shop*', kind: 'spill', depth: 2.4, col: '#ffe0a8' },
  { match: 'building.*pub*', kind: 'spill', depth: 2.4, col: '#ffcf90' },
  { match: 'building.station-*', kind: 'spill', depth: 3, col: '#f6ecd6' },
  { match: '*.*cafe*', kind: 'spill', depth: 2, col: '#ffe0a8' },
]);
const _scatGlobMemo = new Map();
function _scatGlob(g) {
  let re = _scatGlobMemo.get(g);
  if (!re) { re = new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$'); _scatGlobMemo.set(g, re); }
  return re;
}
/** The light spec of an object id: its own `light` field, else SCENE_LIGHT_SOURCES, else null. */
function _scatSourceOf(id) {
  const def = typeof sceneObj === 'function' ? sceneObj(id) : null;
  if (def && def.light && typeof def.light === 'object') return Object.assign({ kind: 'lamp' }, def.light);
  for (const row of SCENE_LIGHT_SOURCES) if (_scatGlob(row.match).test(id)) return row;
  return null;
}
/** Categories whose glow:'lamp' shapes light the ground (not vehicles, boats or people: their lamps travel with them). */
const _SCAT_LAMP_CATS = ['street', 'structure', 'building', 'rail', 'prop', 'landmark'];
/** The ground position of a compiled item in metres { x, d }: its ground record, else inferred from its screen row (4.7). */
function _scatGroundOf(it, cam) {
  if (it.g && Number.isFinite(it.g.d)) return { x: it.g.x, d: it.g.d };
  if (!cam) return null;
  const f = _scatF(cam), hor = cam.horizon == null ? 470 : cam.horizon, eye = cam.eye == null ? 1.65 : cam.eye;
  const d = Number.isFinite(it.dz) && it.dz > 0 ? it.dz : it.y > hor + 0.5 ? f * eye / (it.y - hor) : null;
  if (!d) return null;
  return { x: (it.x - (cam.x0 == null ? 800 : cam.x0)) * d / f, d };
}
/** The screen boxes of an item's glow shapes of some kinds (scene units), or null. */
function _scatGlowBox(it, kinds) {
  if (typeof sceneObjShapes !== 'function' || typeof scenePathBox !== 'function') return null;
  const sh = sceneObjShapes(it.o, it.v, it.season);
  if (!sh) return null;
  let b = null, n = 0;
  for (const p of sh.order) for (const s of sh.parts[p] || []) {
    if (!s.glow || !kinds.includes(s.glow)) continue;
    const q = scenePathBox(s.d, s.m);
    if (!q) continue;
    b = b ? [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])] : q;
    n++;
  }
  if (!b) return null;
  const s = it.s == null ? 1 : it.s, fl = it.flip;
  const x0 = fl ? it.x - b[2] * s : it.x + b[0] * s, x1 = fl ? it.x - b[0] * s : it.x + b[2] * s;
  return { box: [x0, it.y + b[1] * s, x1, it.y + b[3] * s], n, obj: [b[0], b[1], b[2], b[3]], top: sh.box[1] };
}
/**
 * The static light sources of a compiled scene (7.3), pure: lamps (a pool on the ground under the head), spill (lit ground-floor
 * windows and shopfronts light the ground in front of them) and halos (lit signs, lanterns). v2 scenes only (a v1 scene has no
 * ground to light: []). Every source has its ground point (x, d metres), the head's screen point (hx, hy), the foot row (X, Y),
 * r (metres), h (the head's height, metres), col, i (the item index) and layer. Sets C.lights when C is a compiled scene.
 */
function sceneLightsOf(C) {
  const out = [];
  if (!C || !C.items || !C.cam) { if (C && typeof C === 'object' && C.items) C.lights = out; return out; }
  const cam = C.cam, f = _scatF(cam);
  C.items.forEach((it, i) => {
    if (!it || it.strip >= 0 && it.strip != null) return;
    const def = typeof sceneObj === 'function' ? sceneObj(it.o) : null;
    if (!def) return;
    let src = _scatSourceOf(it.o);
    const lamps = !src && _SCAT_LAMP_CATS.includes(def.category) ? _scatGlowBox(it, ['lamp']) : null;
    if (!src && lamps) src = { kind: 'lamp', r: 5, col: (def.night && def.night.glow && def.night.glow.lamp) || '#ffd9a0' };
    let win = null;
    if (!src && def.category === 'building') {
      // a building with lit ground-floor windows or a shopfront: spill on the ground in front
      win = _scatGlowBox(it, ['window', 'shop']);
      if (win) {
        const s = it.s == null ? 1 : it.s, foot = it.y, h = foot - win.box[3];
        // ground floor: the lowest lit glass within about 4.5 m of the foot (on screen: a share of the building's height)
        const H = Math.max(1, -win.top * s);
        if (h < H * 0.4) src = { kind: 'spill', depth: 2.2, col: (def.night && def.night.glow && (def.night.glow.shop || def.night.glow.window)) || '#ffd98a' };
      }
    }
    if (!src) return;
    const g = _scatGroundOf(it, cam);
    if (!g || !(g.d > 0)) return;
    const k = f / g.d;
    const base = { kind: src.kind, i, layer: it.layer, col: src.col || '#ffd9a0', X: it.x, Y: it.y };
    if (src.kind === 'spill') {
      const wb = win || _scatGlowBox(it, ['window', 'shop']);
      const s = it.s == null ? 1 : it.s, sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(it.o, it.v, it.season) : null;
      const bx = wb ? wb.box : sh ? [it.x + sh.box[0] * s, it.y + sh.box[1] * s, it.x + sh.box[2] * s, it.y] : [it.x - 40, it.y - 40, it.x + 40, it.y];
      const w = Math.max(1, (bx[2] - bx[0]) / k), cx = g.x + ((bx[0] + bx[2]) / 2 - it.x) / k;
      out.push(Object.assign(base, { x: cx, d: g.d, w: Math.round(w * 10) / 10, r: src.depth || 2.4, h: Math.max(0.5, (it.y - (bx[1] + bx[3]) / 2) / k), hx: (bx[0] + bx[2]) / 2, hy: (bx[1] + bx[3]) / 2 }));
      return;
    }
    // lamp or halo: the head is the centre of its lamp glows, else the top of the object
    const lb = lamps || _scatGlowBox(it, ['lamp', 'sign', 'shop']);
    let hx, hy;
    if (lb) { hx = (lb.box[0] + lb.box[2]) / 2; hy = (lb.box[1] + lb.box[3]) / 2; }
    else { const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(it.o, it.v, it.season) : null; hx = it.x; hy = sh ? it.y + sh.box[1] * (it.s == null ? 1 : it.s) * 0.97 : it.y - (src.h || 4) * k; }
    const h = Math.max(0.3, (it.y - hy) / k), x = g.x + (hx - it.x) / k;
    out.push(Object.assign(base, { x, d: g.d, r: src.r || 5, h: Math.round(h * 100) / 100, hx, hy }));
  });
  if (C && typeof C === 'object') C.lights = out;
  return out;
}
/**
 * The lift of a placement near a lamp at night (7.4): its sprite colours mixed toward the light's colour by 0, 0.15, 0.3 or
 * 0.45 (a bucket: part of the sprite key). item: a compiled item (or { x, d }); lights: sceneLightsOf; 0 by day.
 */
function sceneLiftAt(item, lights, L, cam) {
  if (!item || !lights || !lights.length || !L || !L.lamps) return 0;
  const g = Number.isFinite(item.d) && item.o == null ? item : _scatGroundOf(item, cam || null);
  if (!g) return 0;
  let best = 0;
  for (const l of lights) {
    if (l.kind === 'halo' || (item.i != null && l.i === item.i)) continue;
    let k = 0;
    if (l.kind === 'lamp') { const dist = Math.hypot(g.x - l.x, g.d - l.d), r = l.r || 5; if (dist < r) k = 0.5 * Math.pow(1 - dist / r, 1.2); }
    else if (l.kind === 'spill') { const dx = Math.abs(g.x - l.x) - (l.w || 3) / 2, dd = l.d - g.d; if (dx < 0.5 && dd >= -0.5 && dd < (l.r || 2.4) + 0.5) k = 0.2; }
    if (k > best) best = k;
  }
  best *= _scatClamp(L.dark == null ? 1 : L.dark * 1.2, 0, 1);
  return best < 0.075 ? 0 : best < 0.225 ? 0.15 : best < 0.375 ? 0.3 : 0.45;
}

/* ---------- lit windows by the hour (7.3; B applies it) ---------- */
/** [local solar hour, the share of windows lit]: about 0.55 at dusk, 0.7 at 21 h, 0.4 at 23 h, 0.12 at 1 h, 0.08 at 5 h, 0.2 at dawn. */
const SCENE_WINDOW_SHARE = Object.freeze([[0, 0.25], [1, 0.12], [3, 0.09], [5, 0.08], [6, 0.14], [7, 0.2], [9, 0.2], [15, 0.5], [17, 0.55], [19, 0.62], [21, 0.7], [22, 0.6], [23, 0.4], [24, 0.25]]);
/** The share of windows lit (0 by day): at a local hour, or for a light L (its localHour, or computed; Friday and Saturday nights a little later). */
function sceneWindowShare(x) {
  let h = x, wd = null;
  if (x && typeof x === 'object') {
    if (!x.windows) return 0;
    h = Number.isFinite(x.localHour) ? x.localHour : _scatLocal(x.ms, x.lon).hour;
    wd = Number.isFinite(x.weekday) ? x.weekday : null;
  }
  if (!Number.isFinite(h)) return 0;
  h = ((h % 24) + 24) % 24;
  const T = SCENE_WINDOW_SHARE;
  let v = T[T.length - 1][1];
  for (let i = 1; i < T.length; i++) if (h <= T[i][0]) { const [h0, s0] = T[i - 1], [h1, s1] = T[i]; v = s0 + (s1 - s0) * (h - h0) / ((h1 - h0) || 1); break; }
  // Friday and Saturday evenings (weekday 5 / 6 local, or 6 / 0 after midnight) stay lit about an hour longer
  if (wd != null && ((h >= 22 && (wd === 5 || wd === 6)) || (h < 2 && (wd === 6 || wd === 0)))) v = Math.min(0.75, v + 0.08);
  return Math.round(v * 1000) / 1000;
}
/** Local solar time at a longitude: { hour (0..24), weekday (0 Sunday .. 6) }. */
function _scatLocal(ms, lon) {
  const t = (Number(ms) || 0) + (Number(lon) || 0) / 15 * 3600000, day = Math.floor(t / 86400000);
  return { hour: Math.round(((t / 3600000) % 24 + 24) % 24 * 1000) / 1000, weekday: ((day + 4) % 7 + 7) % 7 };
}

/* ---------- the v2 light (7.5) ---------- */
/** The kit's cloud cover for a weather kind (K.live's WX table, by the kit's own condition names). */
const _SCAT_WX_COND = { clear: 'clear', partly: 'partly', cloudy: 'cloudy', rain: 'rain', drizzle: 'drizzle', showers: 'showers', thunder: 'thunder', snow: 'snow', sleet: 'rain', fog: 'fog', mist: 'partly', frost: 'clear' };
const _SCAT_WX_COVER = { clear: 0.08, partly: 0.45, cloudy: 0.92, fog: 0.85, drizzle: 0.88, rain: 0.92, showers: 0.62, snow: 0.9, thunder: 0.95 };
/** The weather kind of an input that is fixed (an override or a scene of one weather), or null (live, none, absent). */
function _scatFixedKind(w) {
  if (!w || w === 'live' || w === 'none') return null;
  if (typeof w === 'string') return _SCAT_WX_COND[w] ? w : null;
  return typeof w === 'object' && _SCAT_WX_COND[w.kind] ? w.kind : null;
}
/**
 * The light of a v2 scene (7.5): sceneLight (the kit's K.live, unchanged) plus
 *   L.sunG, L.sunTan        the way shadows fall on the ground in camera space ([-sin rel, -cos rel]) and 1 / tan(alt) (max 12)
 *   L.moonG, L.moonTan      the same for the moon
 *   L.localHour, L.weekday  local solar time at the scene (lon / 15) and the weekday there
 *   L.wx                    sceneWeather(o.wx || data.weather, L, o): the resolved weather (8.1)
 *   L.atmos                 sceneAtmosResolve(C.atmos, L, L.wx): { preset, V, max, col }
 *   L.windowShare           the share of windows lit now (7.3)
 * o: the host's options ({ sky, season, wx (an override: a kind or an object), cloud }); view: the scene's view (+ season, at);
 * data: the scene data. In a v2 scene the camera's horizon, fov, heading (and lat / lon) are the view's; a fixed weather (an
 * override, or a scene of one weather) sets the sky's cover; L.haze becomes the atmosphere's colour, L.wind the weather's, and
 * L.rain / L.snow / L.fog are cleared (the weather pass draws v2 weather). A v1 scene (fx opt-in) keeps its view and v1 flags.
 */
function sceneLightV2(o, view, data) {
  o = o || {}; view = view || {}; data = data || {};
  const v2 = sceneAtmosIsV2(data), cam = v2 ? data.camera : null;
  const v = Object.assign({}, view);
  if (cam) {
    if (Number.isFinite(cam.horizon)) v.horizon = cam.horizon;
    if (Number.isFinite(cam.fov)) v.fov = cam.fov;
    if (Number.isFinite(cam.heading)) v.heading = cam.heading;
    if (Number.isFinite(cam.lat) && Number.isFinite(cam.lon)) { v.lat = cam.lat; v.lon = cam.lon; }
  }
  const input = o.wx != null ? o.wx : data.weather == null ? 'live' : data.weather;
  const fixed = _scatFixedKind(input);
  let o2 = o;
  if (fixed) {
    // a fixed weather: the sky's cover follows it (the kit reads o.sky.wx on a live sky, o.cloud on the authored moment)
    o2 = Object.assign({}, o);
    const wind = input && typeof input === 'object' && Number.isFinite(input.wind) ? Math.max(0, (input.wind - 0.4) * 28) : undefined;
    const temp = input && typeof input === 'object' && Number.isFinite(input.temp) ? input.temp : o.sky && o.sky.wx ? o.sky.wx.temp : undefined;
    if (o.sky && Number.isFinite(o.sky.ms)) o2.sky = Object.assign({}, o.sky, { wx: { cond: _SCAT_WX_COND[fixed], wind: wind != null ? wind : o.sky.wx ? o.sky.wx.wind : null, temp } });
    else o2.cloud = _SCAT_WX_COVER[_SCAT_WX_COND[fixed]];
  }
  const L = typeof sceneLight === 'function' ? sceneLight(o2, v) : null;
  if (!L) return L;
  const rel = L.sun && Number.isFinite(L.sun.rel) ? L.sun.rel : 0, alt = Number(L.alt) || 0;
  L.sunG = [Math.round(-Math.sin(rel * _scatD) * 1e4) / 1e4, Math.round(-Math.cos(rel * _scatD) * 1e4) / 1e4];
  L.sunTan = alt > 0 ? Math.min(12, Math.round(1 / Math.tan(alt * _scatD) * 1e3) / 1e3) : 12;
  const m = L.moon || {}, mrel = Number.isFinite(m.rel) ? m.rel : 0, malt = Number.isFinite(m.alt) ? m.alt : -10;
  L.moonG = [Math.round(-Math.sin(mrel * _scatD) * 1e4) / 1e4, Math.round(-Math.cos(mrel * _scatD) * 1e4) / 1e4];
  L.moonTan = malt > 0 ? Math.min(12, Math.round(1 / Math.tan(malt * _scatD) * 1e3) / 1e3) : 12;
  const lt = _scatLocal(L.ms, L.lon != null ? L.lon : v.lon);
  L.localHour = lt.hour; L.weekday = lt.weekday;
  L.wx = typeof sceneWeather === 'function' ? sceneWeather(input, L, Object.assign({}, o, { alt: cam && Number.isFinite(cam.alt) ? cam.alt : data.view && Number.isFinite(data.view.alt) ? data.view.alt : undefined })) : null;
  const atmos = data.v === 2 && data.atmos && data.atmos.V ? data.atmos : sceneAtmosCompile(data);
  L.atmos = sceneAtmosResolve(atmos, L, L.wx);
  L.windowShare = sceneWindowShare(L);
  if (L.wx && Number.isFinite(L.wx.wind)) L.wind = L.wx.wind;
  if (v2) {
    sceneLightGradeV2(L);
    L.haze = L.atmos.col;
    L.rain = false; L.snow = false; L.fog = false;
  }
  return L;
}

/* ---------- the v2 grade (7.6): golden, dusk, noon and night read clearly apart ---------- */
/**
 * How golden, how dusky the light is now (pure). golden: 1 with the sun 1.5 to 6 degrees up, fading out by 16 degrees and just
 * after sunset; dusk: the sun 1 to 12 degrees below the horizon (most at -2 to -6). Both weakened by cloud. -> { golden, dusk }.
 */
function sceneGradeAt(L) {
  if (!L || !Number.isFinite(L.alt)) return { golden: 0, dusk: 0 };
  const alt = L.alt, cover = _scatClamp(L.cover || 0, 0, 1);
  const golden = _scatClamp((16 - alt) / 10, 0, 1) * _scatClamp((alt + 1.5) / 3, 0, 1) * (1 - 0.6 * cover);
  const dusk = _scatClamp((1 - alt) / 3, 0, 1) * _scatClamp((alt + 12) / 6, 0, 1) * (1 - 0.5 * cover);
  return { golden: Math.round(golden * 100) / 100, dusk: Math.round(dusk * 100) / 100 };
}
/**
 * The v2 grade on top of the kit's (sceneLightV2, v2 scenes only; v1 light is never touched):
 *  - golden hour: an amber key that warms the highlights and leaves the darks a little cool (a split tone), a warmer, hazier
 *    low sky (strongest on the sun's side), a warmer haze;
 *  - dusk: cooler and pinker (green pulled down, blue and a little red up), a pink low sky;
 *  - noon: neutral (nothing added);
 *  - night: surfaces lit by nothing stay dark masses (highlights compressed); the water reflects the night sky (never brighter than it); lamps and lit windows come from the light pass.
 * Sets L.grade (the factors), L.grade2 (hex -> hex, applied by sceneTone after the kit's grade), and adjusts L.low, L.lowSun,
 * L.mid, L.atmos.col, L.water in place.
 */
function sceneLightGradeV2(L) {
  if (!L) return L;
  const G = sceneGradeAt(L), g = G.golden, du = G.dusk, dark = _scatClamp(L.dark || 0, 0, 1);
  L.grade = G;
  const sunSide = 0.4 + 0.6 * _scatClamp((L.backlit || 0) * 1.6, 0, 1);
  if (g > 0.01) {
    L.low = _scatMix(L.low, '#f6c08c', 0.45 * g * sunSide);
    L.lowSun = _scatMix(L.lowSun, '#ffa458', 0.4 * g);
    L.mid = _scatMix(L.mid, '#d9c0aa', 0.18 * g);
    if (L.atmos) L.atmos.col = _scatMix(L.atmos.col, '#efc08e', 0.4 * g);
    if (L.light) L.light = _scatMix(L.light, '#ffa858', 0.45 * g);
  }
  if (du > 0.01) {
    L.low = _scatMix(L.low, '#d99aae', 0.22 * du);
    L.mid = _scatMix(L.mid, '#8a86b8', 0.12 * du);
    if (L.atmos) L.atmos.col = _scatMix(L.atmos.col, '#a98fb0', 0.25 * du);
  }
  const night = _scatClamp((dark - 0.6) / 0.4, 0, 1);
  if (g > 0.01 || du > 0.01 || night > 0.01) {
    const memo = new Map();
    L.grade2 = (hex) => {
      let v = memo.get(hex);
      if (v) return v;
      let s = hex.slice(1); if (s.length === 3) s = s.replace(/./g, '$&$&');
      const n = parseInt(s, 16);
      let r = (n >> 16 & 255) / 255, gr = (n >> 8 & 255) / 255, b = (n & 255) / 255;
      const lum = 0.3 * r + 0.59 * gr + 0.11 * b;
      if (g > 0.01) {
        const wk = g * (0.4 + 0.6 * lum), ck = g * (1 - lum);
        r *= 1 + 0.26 * wk - 0.04 * ck; gr *= 1 + 0.05 * wk; b *= 1 - 0.42 * wk + 0.08 * ck;
      }
      // night: surfaces lit by nothing (pale walls, light stone) stay dark masses: the highlights are compressed
      if (night > 0.01) { const q = 1 - 0.32 * night * _scatClamp((lum - 0.06) * 4, 0, 1); r *= q; gr *= q; b *= q; }
      if (du > 0.01) { r *= 1 + 0.03 * du; gr *= 1 - 0.1 * du; b *= 1 + 0.1 * du; }
      v = '#' + [r, gr, b].map(x => Math.round(_scatClamp(x, 0, 1) * 255).toString(16).padStart(2, '0')).join('');
      memo.set(hex, v);
      return v;
    };
  }
  // night water: the sky's own colours (far: the sky low down, near: the sky high up), a touch darker than the sky it mirrors,
  // so open water never glows brighter than the sky; the lights and the moon are added by the water pass (reflections, glint)
  const water0 = L.water;
  if (typeof water0 === 'function' && dark > 0.05) {
    const n = _scatClamp((dark - 0.05) * 1.25, 0, 1) * 0.9, dk = (c, k) => _scatMix(c, '#05070c', k);
    L.water = (base) => { const w = water0(base); return [_scatMix(w[0], dk(L.low, 0.18), n), _scatMix(w[1], dk(L.mid, 0.25), n), _scatMix(w[2], dk(L.top, 0.3), n)]; };
  }
  return L;
}
