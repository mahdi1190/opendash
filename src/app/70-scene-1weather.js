/* ============================================================
   SCENE ENGINE v2: weather (docs/dev/SCENE_ENGINE_V2.md section 8; builder C).
   PURE classic script: functions and consts only, no DOM, nothing expensive at load. Other 70-scene-1* files
   (the ground's surfaces and projection) are called only lazily, behind typeof guards.

     sceneWeather(input, L, o)          -> { kind, rain, snow, fog, wind, wet, snowDepth, frost, banks, thunder, temp, src }
                                           input: 'live' (o.sky.wx; the authored moment is clear) | 'none' | a kind |
                                           { kind, intensity, wind, temp, snowDepth, wet, frost, banks } ('auto' or a number each)
     sceneWeatherCompile(data, C)       -> C.weather = { input }   (the authored input; resolved at bake from L)
     SCENE_SNOW_CLIMATE                 the share of snowy winter days by height and latitude (UK-tuned)
     sceneSnowCover(lat, lon, alt, ms)  -> 0..1 snow lying today by the climatology: seeded by the date and the place, so every
                                           scene of an area agrees, and higher ground is white whenever the valley is
     sceneFrostAt(L, temp, kind)        -> 0..1 hoar frost now (a cold clear morning, until the sun is 12 degrees up)
     scenePuddles(C, wx, o)             -> extra water regions (kind 'puddle') on the hard and path surfaces within 60 m
     SCENE_WEATHER_KINDS                the kinds: clear partly cloudy rain drizzle showers thunder snow sleet fog mist frost
   ============================================================ */
const SCENE_WEATHER_KINDS = Object.freeze(['clear', 'partly', 'cloudy', 'rain', 'drizzle', 'showers', 'thunder', 'snow', 'sleet', 'fog', 'mist', 'frost']);
/** Per kind: falling rain, falling snow, fog, wet ground (8.1), fog banks. */
const _SCWX_KIND = Object.freeze({
  clear: [0, 0, 0, 0, 0], partly: [0, 0, 0, 0, 0], cloudy: [0, 0, 0, 0, 0], frost: [0, 0, 0, 0, 0],
  rain: [0.8, 0, 0, 1, 0], drizzle: [0.35, 0, 0, 0.6, 0], showers: [0.6, 0, 0, 0.5, 0], thunder: [1, 0, 0, 1, 0],
  snow: [0, 0.8, 0, 0, 0], sleet: [0.4, 0.4, 0, 0.8, 0], fog: [0, 0, 1, 0.3, 4], mist: [0, 0, 0.5, 0.2, 2],
});
/** The kit's live conditions (o.sky.wx.cond) to kinds. */
const _SCWX_LIVE = { clear: 'clear', partly: 'partly', cloudy: 'cloudy', fog: 'fog', drizzle: 'drizzle', rain: 'rain', showers: 'showers', snow: 'snow', thunder: 'thunder', sleet: 'sleet', mist: 'mist' };
const _scwxClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _scwxHash = (s) => (typeof sceneHash === 'function' ? sceneHash(s) : (() => { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; })());
const _scwxRnd = (seed) => (typeof sceneRnd === 'function' ? sceneRnd(seed) : (() => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); })());
/** The UTC month (0..11) of a time (the core's civil-from-days arithmetic). */
function _scwxMonth(ms) {
  if (typeof _scMonthOf === 'function') return _scMonthOf(ms);
  const z = Math.floor(ms / 86400000) + 719468, era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153);
  return (mp < 10 ? mp + 3 : mp - 9) - 1;
}
/** How deep in winter a month is at a latitude: 1 in the three winter months, 1/3 in the shoulder months, else 0; 0 in the tropics. */
function _scwxWinter(ms, lat) {
  if (!Number.isFinite(ms) || !Number.isFinite(lat) || Math.abs(lat) < 23.5) return 0;
  let m = _scwxMonth(ms);
  if (lat < 0) m = (m + 6) % 12;   // southern winters are June to August
  return m === 11 || m <= 1 ? 1 : m === 10 || m === 2 ? 1 / 3 : 0;
}

/* ---------- the snow climatology (8.3) ---------- */
/**
 * The share of winter (December to February) days with snow lying, first match wins. Tuned on the UK: lowland under 150 m south
 * of 54 N 4 %, north of it 8 %, 150 to 400 m (the Peaks) 15 %, over 400 m 30 %, the Highlands over 600 m 50 %, Alpine 70 %.
 */
const SCENE_SNOW_CLIMATE = Object.freeze([
  { where: 'alpine', alt: 1500, share: 0.7 },
  { where: 'highlands', alt: 600, lat: 56, share: 0.5 },
  { where: 'upland-high', alt: 400, share: 0.3 },
  { where: 'upland', alt: 150, share: 0.15 },
  { where: 'subarctic lowland', alt: -1e9, lat: 60, share: 0.45 },
  { where: 'lowland north', alt: -1e9, lat: 54, share: 0.08 },
  { where: 'lowland', alt: -1e9, share: 0.04 },
]);
/** The climatology's share of snowy days for a place (the winter months; 0 in the tropics). */
function _scwxSnowShare(lat, alt) {
  const a = Number.isFinite(alt) ? alt : 0, la = Math.abs(lat || 0);
  if (la < 23.5) return 0;
  for (const r of SCENE_SNOW_CLIMATE) if (a >= r.alt && (r.lat == null || la >= r.lat)) return r.share;
  return 0;
}
/**
 * Snow lying today by the climatology (8.3), 0..1: deterministic per date and place. Snow comes in spells of 4 days; a spell is
 * snowy where ONE seeded number for the spell and a 2-degree cell is under the place's share, so neighbouring scenes agree and
 * high ground is snowy whenever the low ground near it is. Depth on a snowy day 0.55..0.9 (seeded by the spell).
 */
function sceneSnowCover(lat, lon, alt, ms) {
  const w = _scwxWinter(ms, lat);
  if (!w) return 0;
  const share = _scwxSnowShare(lat, alt) * w;
  if (!share) return 0;
  const spell = Math.floor(Math.floor(ms / 86400000) / 4);
  const cell = Math.floor((lat || 0) / 2) + ',' + Math.floor((lon || 0) / 2);
  const r = _scwxRnd(_scwxHash('snow|' + spell + '|' + cell));
  const u = r(), depth = 0.55 + 0.35 * r();
  return u < share ? Math.round(depth * 100) / 100 : 0;
}
/**
 * Hoar frost now (8.4), 0..1: when the temperature is at or below 0 C (live), or on a seeded 35 % of clear winter mornings without
 * live data; only in the morning (before solar noon) while the sun is under 12 degrees, fading out from 6 to 12 degrees.
 * kind: the weather kind (rain, snow, fog and thunder wash it out).
 */
function sceneFrostAt(L, temp, kind) {
  if (!L || !L.morning || !(L.alt < 12)) return 0;
  if (['rain', 'drizzle', 'showers', 'thunder', 'snow', 'sleet'].includes(kind)) return 0;
  const fade = _scwxClamp((12 - L.alt) / 6, 0, 1);
  if (Number.isFinite(temp)) return temp <= 0 ? Math.round(fade * _scwxClamp(0.6 - temp * 0.15, 0.6, 1) * 100) / 100 : 0;
  if (!_scwxWinter(L.ms, L.lat) || (kind && !['clear', 'partly', 'frost'].includes(kind))) return 0;
  const day = Math.floor((L.ms || 0) / 86400000), u = _scwxRnd(_scwxHash('frost|' + day + '|' + Math.floor((L.lat || 0) / 2) + ',' + Math.floor((L.lon || 0) / 2)))();
  return u < 0.35 * _scwxWinter(L.ms, L.lat) ? Math.round(fade * 100) / 100 : 0;
}

/* ---------- the resolver (8.1) ---------- */
/**
 * The weather now. input: 'live' (default: the live forecast o.sky.wx = { cond, wind, temp }; without one, the authored moment,
 * clear), 'none' (interiors: nothing), a kind, or { kind, intensity, wind (0.4..1.8), temp, snowDepth, wet, frost, banks } where
 * each of the last four is 'auto' or a number. An override o.wx (the editor, the gallery, the tools' --weather) is passed AS the
 * input by sceneLightV2. o.alt: the ground's elevation (the snow climatology). Returns
 * { kind, rain, snow, fog, wind, wet, snowDepth, frost, banks, thunder, temp, src: 'none' | 'live' | 'moment' | 'fixed' }.
 */
function sceneWeather(input, L, o) {
  o = o || {};
  const none = { kind: 'none', rain: 0, snow: 0, fog: 0, wind: 1, wet: 0, snowDepth: 0, frost: 0, banks: 0, thunder: false, temp: null, src: 'none' };
  if (input === 'none') return none;
  const sky = o.sky && typeof o.sky === 'object' ? o.sky : null;
  let kind = 'clear', src = 'moment', spec = {};
  const live = sky && sky.wx && typeof sky.wx === 'object' ? sky.wx : null;
  if (input == null || input === 'live') { if (live && _SCWX_LIVE[live.cond]) { kind = _SCWX_LIVE[live.cond]; src = 'live'; } else if (live) src = 'live'; }
  else if (typeof input === 'string') { kind = _SCWX_KIND[input] ? input : 'clear'; src = 'fixed'; }
  else if (typeof input === 'object') { spec = input; kind = _SCWX_KIND[input.kind] ? input.kind : 'clear'; src = 'fixed'; }
  const row = _SCWX_KIND[kind], I = Number.isFinite(spec.intensity) ? _scwxClamp(spec.intensity, 0, 1.5) : 1;
  const temp = Number.isFinite(spec.temp) ? spec.temp : live && Number.isFinite(live.temp) ? live.temp : null;
  // wind: the input's multiplier, else the light's (K.live: 0.4 + km/h / 28), else 1; thunder and showers are gusty
  let wind = Number.isFinite(spec.wind) ? spec.wind : L && Number.isFinite(L.wind) ? L.wind : 1;
  if (!Number.isFinite(spec.wind) && (kind === 'thunder' || kind === 'showers')) wind = Math.max(wind, 1.3);
  wind = _scwxClamp(wind, 0.4, 1.8);
  const rain = _scwxClamp(row[0] * I, 0, 1), snow = _scwxClamp(row[1] * I, 0, 1), fog = _scwxClamp(row[2] * (kind === 'fog' || kind === 'mist' ? Math.min(1, I) : 1), 0, 1);
  const num = (v, auto) => (v === 'auto' || v == null ? auto : _scwxClamp(Number(v) || 0, 0, 1));
  const wet = num(spec.wet, _scwxClamp(row[3] * Math.min(1, I), 0, 1));
  // snow lying: falling snow builds to 0.8; otherwise the climatology; a live thaw (over 4 C patchy, over 7 C none)
  const lat = L && Number.isFinite(L.lat) ? L.lat : o.lat, lon = L && Number.isFinite(L.lon) ? L.lon : o.lon;
  let depth = snow > 0 ? Math.max(0.5, 0.8 * Math.min(1, snow / 0.8)) : (L && Number.isFinite(L.ms) ? sceneSnowCover(lat, lon, o.alt, L.ms) : 0);
  if (Number.isFinite(temp)) { if (temp > 7) depth = 0; else if (temp > 4) depth = Math.min(depth, 0.3); }
  const snowDepth = num(spec.snowDepth, Math.round(depth * 100) / 100);
  const frost = num(spec.frost, kind === 'frost' ? (L && Number.isFinite(L.alt) ? Math.max(0.6, sceneFrostAt(Object.assign({}, L, { morning: true }), -2, 'frost')) : 1) : sceneFrostAt(L, temp, kind));
  const banks = spec.banks != null && spec.banks !== 'auto' ? _scwxClamp(Math.round(Number(spec.banks) || 0), 0, 4) : row[4];
  return { kind, rain: Math.round(rain * 100) / 100, snow: Math.round(snow * 100) / 100, fog: Math.round(fog * 100) / 100, wind: Math.round(wind * 100) / 100, wet: Math.round(wet * 100) / 100,
    snowDepth, frost: Math.round(frost * 100) / 100, banks, thunder: kind === 'thunder', temp, src };
}
/** The authored weather input (V2 12: C.weather = { input }); resolved at bake from L. Sets C.weather when C is given. */
function sceneWeatherCompile(data, C) {
  const w = data && data.weather != null ? data.weather : 'live';
  const input = w === 'none' || w === 'live' ? w : typeof w === 'string' ? (_SCWX_KIND[w] ? w : 'live') : typeof w === 'object' ? Object.assign({}, w) : 'live';
  const out = { input };
  if (C && typeof C === 'object') C.weather = out;
  return out;
}
/** The input of a compiled scene's weather (v2: C.weather.input; v1: 'live' | 'none'). */
function _scwxInputOf(C) { const w = C && C.weather; return w && typeof w === 'object' && 'input' in w ? w.input : w || 'live'; }

/* ---------- puddles (8.2) ---------- */
const _SCWX_PUDDLE_KINDS = ['road', 'pavement', 'path', 'towpath', 'track', 'plaza', 'parking', 'driveway', 'cycleway'];
function _scwxInPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function _scwxArea(poly) { let a = 0; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]); return Math.abs(a / 2); }
/** The surface kind at a ground point: A's sceneSurfaceAt, else the last surface whose polygon holds it. */
function _scwxSurfaceAt(C, x, d) {
  if (typeof sceneSurfaceAt === 'function') { try { const s = sceneSurfaceAt(C, x, d); if (s !== undefined) return s; } catch (e) { /* the fallback */ } }
  const list = C.surfaces || [];
  for (let i = list.length - 1; i >= 0; i--) { const s = list[i]; if (s.polyM && s.polyM.length > 2 && _scwxInPoly(x, d, s.polyM)) return s; }
  return null;
}
/** The depth band (layer index) of a depth: A's sceneDepthBand, else the compiled bands. */
function _scwxBand(C, d) {
  if (typeof sceneDepthBand === 'function') { try { const b = sceneDepthBand(C.cam, d); if (Number.isFinite(b)) return b; } catch (e) { /* the bands */ } }
  for (const b of (C.cam && C.cam.bands) || []) if (b.d0 != null && d >= b.d0 && d < b.d1) return b.i;
  return C.layers ? C.layers.length - 1 : 0;
}
/**
 * Seeded puddles on a compiled v2 scene (8.2): 3 to 12 (by wx.wet, from 0.45: drizzle, showers, rain, and the area of the hard and
 * path surfaces from 8 to 60 m), only where a puddle is 6 to 240 units across (smooth lobed outlines), never overlapping, each a small still mirror: a water region in the C.water form
 * with a v2 record (kind 'puddle', mirror 0.7, ripple 0.25, clarity 0), handed to the water pass (env.waterExtra). [] when dry.
 */
function scenePuddles(C, wx, o) {
  o = o || {};
  if (!C || !C.cam || !C.surfaces || !wx || !(wx.wet >= 0.45) || wx.snowDepth > 0.5) return [];
  // from 8 m (a puddle at the camera's feet would fill the foreground) to 60 m
  const cam = C.cam, f = cam.f || 800 / Math.tan((cam.fov || 66) * Math.PI / 360), dMin = Math.max((cam.dMin || 3) * 1.6, 8), dLim = 60;
  // only what is in view: the x span of the frame at a depth (x0 the principal column)
  const x0c = cam.x0 == null ? 800 : cam.x0, vis = (d) => [(-x0c + 20) * d / f, (1600 - x0c - 20) * d / f];
  const cands = [];
  for (const s of C.surfaces) {
    if (!_SCWX_PUDDLE_KINDS.includes(s.kind) || !s.polyM || s.polyM.length < 3) continue;
    const xs = s.polyM.map(p => p[0]), ds = s.polyM.map(p => p[1]);
    const box = [Math.min(...xs), Math.max(dMin, Math.min(...ds)), Math.max(...xs), Math.min(dLim, Math.max(...ds))];
    if (box[3] <= box[1]) continue;
    // the visible area (metres squared), from 8 depth slices
    let area = 0;
    for (let k = 0; k < 8; k++) { const d = box[1] + (box[3] - box[1]) * (k + 0.5) / 8, v = vis(d); area += Math.max(0, Math.min(box[2], v[1]) - Math.max(box[0], v[0])) * (box[3] - box[1]) / 8; }
    if (area > 0.5) cands.push({ s, box, area });
  }
  if (!cands.length) return [];
  const area = cands.reduce((n, c) => n + c.area, 0);
  const n = Math.round(_scwxClamp(3 + 9 * wx.wet * Math.min(1, area / 1500), 3, 12) * (o.lod == null ? 1 : Math.max(0.3, o.lod)));
  const r = _scwxRnd(_scwxHash((C.id || 'scene') + '|puddles|' + (o.seed || 0)));
  const got = [];
  for (let tries = 0; got.length < n && tries < n * 40; tries++) {
    let u = r() * area, c = cands[0];
    for (const k of cands) { if ((u -= k.area) <= 0) { c = k; break; } }
    // more puddles nearer the camera (uniform on the screen, not on the ground), across what is in view at that depth
    const d = 1 / (1 / c.box[1] + r() * (1 / c.box[3] - 1 / c.box[1])), v = vis(d), xa = Math.max(c.box[0], v[0]), xb = Math.min(c.box[2], v[1]);
    if (!(xb > xa)) continue;
    const x = xa + r() * (xb - xa);
    if (!_scwxInPoly(x, d, c.s.polyM)) continue;
    const at = _scwxSurfaceAt(C, x, d);
    if (!at || !_SCWX_PUDDLE_KINDS.includes(at.kind)) continue;
    const rx = 0.5 + r() * 1.1, rd = rx * (0.45 + r() * 0.35);
    if (2 * rx * f / d < 6 || 2 * rx * f / d > 240) continue;   // at least 6 units across, at most 240
    if (got.some(p => Math.hypot((p.x - x) / (p.rx + rx), (p.d - d) / (p.rd + rd)) < 1.15)) continue;
    // the whole puddle on the same surface
    if (![[x - rx, d], [x + rx, d], [x, d - rd], [x, d + rd]].every(([px, pd]) => { const q = _scwxSurfaceAt(C, px, pd); return q && _SCWX_PUDDLE_KINDS.includes(q.kind); })) continue;
    got.push({ x, d, rx, rd, surf: at.id || c.s.id, seed: Math.floor(r() * 1e6) });
  }
  const proj = (x, d) => (typeof sceneAtmosProject === 'function' ? sceneAtmosProject(cam, x, d, 0) : { X: (cam.x0 == null ? 800 : cam.x0) + f * x / d, Y: cam.horizon + f * cam.eye / d });
  return got.map((p, i) => {
    const pr = _scwxRnd(p.seed), polyM = [];
    const ph = [pr() * 6.283, pr() * 6.283], am = [0.06 + 0.08 * pr(), 0.04 + 0.06 * pr()];
    for (let k = 0; k < 20; k++) { const a = k / 20 * Math.PI * 2, wob = 1 + am[0] * Math.sin(2 * a + ph[0]) + am[1] * Math.sin(3 * a + ph[1]); polyM.push([Math.round((p.x + Math.cos(a) * p.rx * wob) * 100) / 100, Math.round((p.d + Math.sin(a) * p.rd * wob) * 100) / 100]); }
    const scr = polyM.map(([x, d]) => proj(x, d)), ys = scr.map(q => q.Y);
    const path = 'M' + scr.map(q => Math.round(q.X * 10) / 10 + ' ' + Math.round(q.Y * 10) / 10).join('L') + 'Z';
    const dNear = Math.min(...polyM.map(q => q[1])), dFar = Math.max(...polyM.map(q => q[1])), level = -0.01;   // a film of water on the ground
    const rowAt = [];
    for (let k = 0; k <= 4; k++) { const dd = dNear + (dFar - dNear) * k / 4; rowAt.push([Math.round(dd * 100) / 100, Math.round(proj(0, dd).Y * 10) / 10]); }
    return { layer: _scwxBand(C, dFar), d: path, y0: Math.round(Math.min(...ys) * 10) / 10, y1: Math.round(Math.max(...ys) * 10) / 10, base: ['#5a6670', '#47525c', '#3a444c'], reflect: true, shimmer: 0, lightPath: true,
      v2: { id: 'puddle-' + i, kind: 'puddle', polyM, dNear, dFar, level, rowAt, edges: [], mirror: 0.7, ripple: 0.25, clarity: 0, bed: '#3a3a36', glint: true, foam: 'none', wakes: false, rings: false, flow: [0, 0], surf: p.surf, puddle: { x: p.x, d: p.d, rx: p.rx, rd: p.rd } } };
  });
}
