/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: MATERIALS (docs/dev/WORLD_ENGINE.md 2.6, 15.2; requirements V2, S2).
   PURE classic script (Node + browser): nothing runs at load except constants.

   Colour comes from MATERIALS, never from baked colours: every part of a library object has a material, and the engine colours
   it from the season (leaf and grass by month, bare and budding states), the light (sun colour and elevation, sky ambient,
   overcast, night), the weather (wet darkening, frost and snow overlays) and the haze of its depth. A scene carries no
   per-season, per-time or per-weather colour (V1).

     WORLD_MATERIALS                          the materials and how they respond (wet, frost, snow catch, season, gloss)
     worldMaterialOf(obj, part, fill, shape)  -> material id: the knowledge base's material map by part name (worldKb, typeof),
                                                 else a rule on the part name, else a rule on the object's category and the fill
     worldMaterialCtx(ctx, o)                 -> MaterialCtx from the time context (WORLD_ENGINE 11.11) and the sky (worldSkyOf):
                                                 { month, doy, season, wet, frost, snow, snowDay, sky, L, band, haze, hazeCol }
     worldMaterialFor(mctx, ent)              -> the MaterialCtx of one entity: its leaf state (kb worldKbState, typeof; a seeded
                                                 fallback), its haze from its depth
     worldMaterialColour(mat, hex, mctx)      -> '#rrggbb': season -> weather overlays -> light -> haze
     worldMaterialVisible(mat, mctx)          -> false for leaves on a bare tree (the sprite drops them)
     worldMaterialSnow(mat, mctx)             -> 0..1 snow lying on this material now (S2: ground, roofs and boughs, snow days only)
     worldMaterialKey(mctx)                   -> the cache key part (V5): changes with the season state, light band and weather,
                                                 never with the time inside a light band
   ============================================================ */
const WORLD_MATERIALS = Object.freeze({
  // wet: darkening when wet (0..1 of the colour); frost: hoar frost catch; snow: where snow lies ('ground' | 'roof' | 'bough'
  // or null); season: the seasonal colour model; gloss: how much of the sky a surface reflects; hard: a hard surface
  bark: { wet: 0.22, frost: 0.2, snow: 'bough', season: null, gloss: 0 },
  leaf: { wet: 0.08, frost: 0.45, snow: 'bough', season: 'leaf', gloss: 0.05 },
  needle: { wet: 0.06, frost: 0.4, snow: 'bough', season: 'needle', gloss: 0.03, evergreen: true },
  grass: { wet: 0.1, frost: 0.7, snow: 'ground', season: 'grass', gloss: 0 },
  reed: { wet: 0.06, frost: 0.5, snow: null, season: 'reed', gloss: 0 },
  flower: { wet: 0.05, frost: 0.3, snow: null, season: null, gloss: 0 },
  brick: { wet: 0.28, frost: 0.08, snow: null, season: null, gloss: 0, hard: true },
  stone: { wet: 0.32, frost: 0.12, snow: null, season: null, gloss: 0.02, hard: true },
  slate: { wet: 0.3, frost: 0.5, snow: 'roof', season: null, gloss: 0.08, hard: true },
  tile: { wet: 0.26, frost: 0.5, snow: 'roof', season: null, gloss: 0.04, hard: true },
  render: { wet: 0.18, frost: 0.05, snow: null, season: null, gloss: 0, hard: true },
  timber: { wet: 0.3, frost: 0.3, snow: null, season: null, gloss: 0 },
  paint: { wet: 0.1, frost: 0.1, snow: null, season: null, gloss: 0.25 },
  metal: { wet: 0.08, frost: 0.15, snow: null, season: null, gloss: 0.45 },
  glass: { wet: 0.04, frost: 0.2, snow: null, season: null, gloss: 0.7 },
  water: { wet: 0, frost: 0, snow: null, season: null, gloss: 0.6 },
  skin: { wet: 0, frost: 0, snow: null, season: null, gloss: 0 },
  fabric: { wet: 0.15, frost: 0, snow: null, season: null, gloss: 0 },
  fur: { wet: 0.12, frost: 0, snow: null, season: null, gloss: 0 },
  feather: { wet: 0.05, frost: 0, snow: null, season: null, gloss: 0.05 },
  tarmac: { wet: 0.4, frost: 0.35, snow: 'ground', season: null, gloss: 0.1, hard: true },
  paving: { wet: 0.32, frost: 0.35, snow: 'ground', season: null, gloss: 0.05, hard: true },
  gravel: { wet: 0.3, frost: 0.4, snow: 'ground', season: null, gloss: 0, hard: true },
  soil: { wet: 0.35, frost: 0.5, snow: 'ground', season: null, gloss: 0 },
});
// part name -> material (the library's part names: crown, trunk, leaves, hull, wheels ... ; first match wins)
const _WMT_PART = [
  [/^(needles?|pine)/, 'needle'], [/^(crown|leaves|leaf|canopy|foliage|tips|tufts|fronds?|ivy|blossom)/, 'leaf'],
  [/^(trunk|branch|limb|twigs?|bough|stump|log)/, 'bark'], [/^(flowers?|bloom|petals?)/, 'flower'], [/^(stems?|reeds?|rush)/, 'reed'],
  [/^(roof|roofs|tiles?)$/, 'tile'], [/^(glint|glass|windows?|lit|pane)/, 'glass'], [/^(wheels?|rails?|chain)/, 'metal'],
  [/^(sails?|awning|canopyFabric|flag|sock|towel|washing)/, 'fabric'], [/^(hull|boat|cabin)/, 'paint'],
  [/^(wings?|wingFar|neck|tail|feathers?)$/, 'feather'], [/^(fur|mane|dog)$/, 'fur'], [/^(hands?|face|heads?)$/, 'skin'],
  [/^(legs?|legA|legB|legsFar|legsNear|arm|armA|armB|pA|pB|pBody|body2)$/, 'fabric'], [/^(water|wake|foam|spray|splash|rings?)$/, 'water'],
  [/^(bench|chair|board|deck|fence|post)$/, 'timber'],
];
const _WMT_REF_AMB = [124, 176, 218], _WMT_REF_SUN = [255, 246, 234];
const _WMT_SNOW_COL = '#f3f6f9', _WMT_FROST_COL = '#e4ecf2', _WMT_WET_TINT = '#28303a';
// month (0..11) -> the seasonal grass colour and how far toward it (northern hemisphere; the south is shifted 6 months)
const _WMT_GRASS = ['#848a5c', '#83895a', '#7d9850', '#7eac48', '#6ea844', null, '#86a448', '#9aa252', '#8c9a50', '#7f8a4a', '#7c8452', '#828a5c'];
const _WMT_GRASS_K = [0.65, 0.6, 0.35, 0.35, 0.25, 0, 0.2, 0.35, 0.3, 0.42, 0.55, 0.62];
const _WMT_TURN = ['#c9a227', '#d9822b', '#b9552a', '#8f5f2c', '#c48a2a'];
const _WMT_D = Math.PI / 180;

/* ---------- colour maths ---------- */
function _wmtRgb(hex) {
  let s = String(hex || '#000').replace('#', '');
  if (s.length === 3) s = s.replace(/./g, '$&$&');
  const n = parseInt(s.slice(0, 6), 16);
  return Number.isFinite(n) ? [n >> 16 & 255, n >> 8 & 255, n & 255] : [0, 0, 0];
}
function _wmtHex(c) { return '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); }
function _wmtMix(a, b, t) {
  if (!(t > 0) || !b) return a;
  const A = _wmtRgb(a), B = _wmtRgb(b), k = Math.min(1, t);
  return _wmtHex(A.map((v, i) => v + (B[i] - v) * k));
}
/** h (0..360), s, l (0..1) */
function _wmtHsl(hex) {
  const [r, g, b] = _wmtRgb(hex).map(v => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return [h, s, l];
}
function _wmtLum(hex) { const [r, g, b] = _wmtRgb(hex); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; }
function _wmtHash(s) { let h = 2166136261 >>> 0; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function _wmtU(s) { return (_wmtHash(s) % 100000) / 100000; }
function _wmtClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ---------- which material ---------- */
const _wmtOfMemo = new Map();
/**
 * The material of a part of a library object. Order: the knowledge base's material map (worldKb(obj).material[part], typeof),
 * the part name, the object's category with the fill colour (green on a plant is leaf, brown is bark; a slate-grey roof tone
 * on a building is slate, brick red is brick, a pale cream is render ...). shape (optional): a sceneObjShapes shape, whose
 * glow marks lit glass.
 */
function worldMaterialOf(obj, part, fill, shape) {
  const key = obj + '|' + part + '|' + fill + '|' + (shape && shape.glow ? 'g' : '');
  let m = _wmtOfMemo.get(key);
  if (m) return m;
  m = _wmtOfRaw(String(obj || ''), String(part || ''), typeof fill === 'string' ? fill : null, shape);
  if (_wmtOfMemo.size > 20000) _wmtOfMemo.clear();
  _wmtOfMemo.set(key, m);
  return m;
}
function _wmtOfRaw(obj, part, fill, shape) {
  if (typeof worldKb === 'function') {
    try { const kb = worldKb(obj), mm = kb && kb.material; if (mm && typeof mm === 'object') { const v = mm[part] || mm['*']; if (WORLD_MATERIALS[v]) return v; } } catch (e) { /* the rules below */ }
  }
  if (shape && shape.glow) return 'glass';
  const cat = obj.split('.')[0], id = obj;
  if (part !== 'body') for (const [re, mat] of _WMT_PART) if (re.test(part)) return part === 'roof' && /slate/.test(id) ? 'slate' : mat;
  const [h, s, l] = fill ? _wmtHsl(fill) : [0, 0, 0.5];
  const green = s > 0.12 && h >= 55 && h <= 170, brown = h >= 15 && h < 55 && s > 0.12 && l < 0.55, grey = s < 0.12;
  if (cat === 'tree' || cat === 'plant') {
    if (/pine|fir|yew|spruce|cedar|conifer|holly|box/.test(id) && green) return 'needle';
    if (/reed|rush|sedge|bulrush|grass|tussock/.test(id)) return green || brown ? 'reed' : 'reed';
    if (green) return 'leaf';
    if (brown || grey) return 'bark';
    if (s > 0.35 && (h < 15 || h > 280 || (h > 40 && h < 60 && l > 0.5))) return 'flower';
    return 'leaf';
  }
  if (cat === 'ground') return green ? 'grass' : brown ? 'soil' : grey ? (l < 0.35 ? 'tarmac' : 'paving') : 'gravel';
  if (cat === 'rock') return green ? 'leaf' : 'stone';
  if (cat === 'water') return 'water';
  if (cat === 'person') return (h >= 15 && h < 45 && s > 0.2 && s < 0.7 && l > 0.35 && l < 0.85) ? 'skin' : 'fabric';
  if (cat === 'animal') return 'fur';
  if (cat === 'bird') return 'feather';
  if (cat === 'boat') return grey ? 'metal' : brown ? 'timber' : 'paint';
  if (cat === 'vehicle' || cat === 'rail') return grey ? (l < 0.3 ? 'metal' : 'metal') : (h > 180 && h < 230 && l < 0.45 ? 'glass' : 'paint');
  if (cat === 'building' || cat === 'landmark' || cat === 'structure') {
    if (green) return 'leaf';
    if (grey && l < 0.42) return 'slate';
    if (h > 190 && h < 240 && s > 0.1 && l < 0.5) return 'slate';
    if ((h < 25 || h > 340) && s > 0.25 && l < 0.6) return (l < 0.32 ? 'tile' : 'brick');
    if (h >= 15 && h < 40 && s > 0.3 && l < 0.5) return 'brick';
    if (brown && l < 0.35) return 'timber';
    if (l > 0.72) return 'render';
    if (grey) return 'stone';
    if (h >= 35 && h < 60 && s < 0.45) return 'stone';
    return 'paint';
  }
  if (cat === 'street' || cat === 'prop') return grey ? 'metal' : brown ? 'timber' : 'paint';
  return grey ? 'stone' : green ? 'leaf' : 'paint';
}

/* ---------- the context ---------- */
/**
 * The material context of a moment: from a WorldTimeCtx (11.11) and, when look's light is loaded, its sky (worldSkyOf).
 * o: { sky (a worldSkyOf result), L (the v2 light: when given and sceneTone exists, the light step uses the same grade as the v2
 * base layer, so statics and ground agree), atmos }.
 */
function worldMaterialCtx(ctx, o) {
  ctx = ctx || {}; o = o || {};
  const sky = o.sky || (typeof worldSkyOf === 'function' && (Number.isFinite(ctx.ms) || ctx.sun) ? worldSkyOf(ctx) : null);
  const month = Number.isFinite(ctx.month) ? ctx.month : Number.isFinite(ctx.ms) ? new Date(ctx.ms).getUTCMonth() : 6;
  const south = Number.isFinite(ctx.lat) && ctx.lat < -23.5, m = south ? (month + 6) % 12 : month;
  const wxk = ctx.weather || 'clear';
  const wet = Number.isFinite(ctx.wet) ? _wmtClamp(ctx.wet, 0, 1) : /rain|drizzle|showers|thunder|sleet/.test(wxk) ? 1 : 0;
  const snowDay = !!(ctx.snowDay || (Number.isFinite(ctx.snowDepth) && ctx.snowDepth > 0));
  const snow = snowDay ? _wmtClamp(Number.isFinite(ctx.snowDepth) && ctx.snowDepth > 0 ? ctx.snowDepth : 0.8, 0.3, 1) : 0;
  return { month: m, doy: Number.isFinite(ctx.doy) ? ctx.doy : Math.round(m * 30.4 + 15), season: ctx.season || null, lat: ctx.lat, wet, snowDay, snow,
    frost: Number.isFinite(ctx.frost) ? _wmtClamp(ctx.frost, 0, 1) : 0, sky, L: o.L || null, band: sky ? sky.band : null, atmos: o.atmos || null,
    haze: 0, hazeCol: (sky && sky.haze) || (o.L && o.L.haze) || '#c9d6dc', leaf: null, turn: 0, key: '' };
}
/** The leaf state by day of year (fallback when the knowledge base is not loaded), seeded per entity so trees turn unevenly. */
function _wmtLeafOf(doy, key, evergreen) {
  if (evergreen) return { leaf: 'full', turn: 0 };
  const u = _wmtU('leaf|' + key) - 0.5, d = doy + u * 18;            // +-9 days of unevenness
  if (d < 95 || d >= 335) return { leaf: 'bare', turn: 0 };          // to early April, from December
  if (d < 125) return { leaf: 'bud', turn: 0 };                       // April to early May
  if (d < 262) return { leaf: 'full', turn: 0 };                      // to mid September
  if (d < 315) return { leaf: 'turn', turn: _wmtClamp((d - 262) / 45, 0.05, 1) };
  return { leaf: 'turn', turn: 1 };                                   // the last leaves of November
}
/**
 * The context of one entity: leaf state from the knowledge base (worldKbState(kb, ctx, key), typeof) or the seeded fallback, and
 * its haze from its depth (sceneHazeAt when loaded). ent: { id, obj, x, z }. ctx (optional): the time context for kb.
 */
function worldMaterialFor(mctx, ent, ctx) {
  const out = Object.assign({}, mctx || worldMaterialCtx({}));
  const key = String((ent && (ent.id || ent.obj)) || '');
  out.key = key;
  let st = null;
  if (typeof worldKbState === 'function' && typeof worldKb === 'function' && ent && ent.obj) {
    try { st = worldKbState(worldKb(ent.obj), ctx || { month: out.month, doy: out.doy, season: out.season }, key); } catch (e) { st = null; }
  }
  const ever = ent && /pine|fir|yew|spruce|cedar|conifer|holly|ivy|box|laurel|palm/.test(String(ent.obj || ''));
  if (st && st.leaf) { out.leaf = st.leaf; out.turn = Number.isFinite(st.turn) ? st.turn : st.leaf === 'turn' ? 0.6 : 0; }
  else { const f = _wmtLeafOf(out.doy, key, ever); out.leaf = f.leaf; out.turn = f.turn; }
  if (ent && Number.isFinite(ent.z)) {
    const d = Math.hypot(ent.x || 0, ent.z);
    out.haze = typeof sceneHazeAt === 'function' ? sceneHazeAt(d, out.atmos, out.L) : 0.47 * (1 - Math.exp(-d / 12000));
  }
  return out;
}

/* ---------- the colour ---------- */
/** False for leaves on a bare tree (the renderer drops those shapes); needles and every other material stay. */
function worldMaterialVisible(mat, mctx) {
  if (mat !== 'leaf' || !mctx) return true;
  return mctx.leaf !== 'bare';
}
/** Snow lying on a material now, 0..1 (S2): only on snow days, only on what catches it (ground, roofs, boughs). */
function worldMaterialSnow(mat, mctx) {
  const M = WORLD_MATERIALS[mat];
  if (!M || !M.snow || !mctx || !mctx.snowDay || !(mctx.snow > 0)) return 0;
  const k = M.snow === 'ground' ? 0.92 : M.snow === 'roof' ? 0.85 : (mat === 'leaf' || mat === 'needle') ? 0.4 : 0.45;   // boughs: a dusting on the tops
  return Math.round(_wmtClamp(mctx.snow * k, 0, 1) * 100) / 100;
}
function _wmtSeason(mat, hex, c) {
  const M = WORLD_MATERIALS[mat];
  if (!M || !M.season) return hex;
  const m = c.month == null ? 6 : c.month;
  if (M.season === 'grass') return _WMT_GRASS[m] ? _wmtMix(hex, _WMT_GRASS[m], _WMT_GRASS_K[m]) : hex;
  if (M.season === 'reed') return m >= 9 || m <= 2 ? _wmtMix(hex, '#b39a62', 0.6) : m === 8 ? _wmtMix(hex, '#a59a5e', 0.3) : hex;
  if (M.season === 'needle') return m <= 1 || m === 11 ? _wmtMix(hex, '#3c4a3a', 0.15) : hex;
  // leaf: bud, full (early summer bright, late summer dark), turning (seeded hue per tree), bare (a dead brown for what remains)
  const leaf = c.leaf || (m < 3 || m > 10 ? 'bare' : m === 3 ? 'bud' : m >= 9 ? 'turn' : 'full');
  if (leaf === 'bud') return _wmtMix(hex, '#b3d468', 0.45);
  if (leaf === 'full') return m >= 7 ? _wmtMix(hex, '#56682e', 0.18) : m === 4 ? _wmtMix(hex, '#9cc95a', 0.15) : hex;
  if (leaf === 'turn') {
    const t = _wmtClamp(c.turn == null ? 0.6 : c.turn, 0, 1), pick = _WMT_TURN[_wmtHash('turn|' + (c.key || '') + '|' + hex) % _WMT_TURN.length];
    return _wmtMix(_wmtMix(hex, '#8a8a3a', 0.25 * Math.min(1, t * 3)), pick, 0.85 * t);
  }
  return _wmtMix(hex, '#7a5a3a', 0.7);
}
function _wmtWeather(mat, hex, c) {
  const M = WORLD_MATERIALS[mat];
  if (!M) return hex;
  let out = hex;
  if (c.wet > 0 && M.wet > 0) {
    // wet: darker and a touch more saturated (a film of water); hard and porous surfaces most
    const [r, g, b] = _wmtRgb(out), k = 1 - M.wet * c.wet, lum = (r + g + b) / 3;
    out = _wmtHex([r, g, b].map(v => (lum + (v - lum) * (1 + 0.25 * c.wet * M.wet / 0.3)) * k));
    if (M.gloss > 0.2) out = _wmtMix(out, _WMT_WET_TINT, 0.05 * c.wet);
  }
  if (c.frost > 0 && M.frost > 0) out = _wmtMix(out, _WMT_FROST_COL, c.frost * M.frost * 0.8);
  const sn = worldMaterialSnow(mat, c);
  if (sn > 0) out = _wmtMix(out, _WMT_SNOW_COL, sn);
  return out;
}
/**
 * The light step. With a v2 light (c.L) and the v2 grade loaded: the same grade the base layer uses (sceneTone), so the ground
 * and the statics agree; then the material's gloss mixes in a little of the sky. Without: an ambient + sun model from the sky
 * (worldSkyOf): factor = ambient colour x ambient strength + sun colour x sun strength, normalised so clear noon is the art's own
 * colour; overcast trades sun for a grey ambient, night leaves a dim blue ambient.
 */
function _wmtLight(mat, hex, c) {
  const M = WORLD_MATERIALS[mat] || {}, sky = c.sky;
  if (c.L && typeof sceneTone === 'function') {
    let out = sceneTone(c.L)(hex);
    if (M.gloss > 0 && c.L.mid) out = _wmtMix(out, c.L.mid, M.gloss * 0.25 * (1 - (c.L.dark || 0)));
    return out;
  }
  if (!sky) return hex;
  // normalised by a clear high summer sun (the light the library art is drawn in), so clear noon leaves the art as drawn
  const amb = _wmtRgb(sky.ambient || '#7cb0da'), sun = _wmtRgb(sky.sunCol || '#fff4e4'), ka = sky.ambK == null ? 0.35 : sky.ambK, ks = sky.sunK == null ? 0.62 : sky.sunK;
  const f = [0, 1, 2].map(i => (ka * amb[i] + ks * sun[i]) / (0.35 * _WMT_REF_AMB[i] + 0.62 * _WMT_REF_SUN[i]));
  const [r, g, b] = _wmtRgb(hex);
  let out = _wmtHex([r * f[0], g * f[1], b * f[2]]);
  if (M.gloss > 0 && sky.sky && sky.sky.mid) out = _wmtMix(out, sky.sky.mid, M.gloss * 0.25 * (1 - (sky.dark || 0)));
  // night: colour drains (a scotopic grey-blue), keeping the darks dark
  if (sky.dark > 0.3) { const L0 = _wmtLum(out), n = _wmtClamp((sky.dark - 0.3) / 0.6, 0, 1); out = _wmtMix(out, _wmtHex([L0 * 200, L0 * 215, L0 * 255]), 0.6 * n); }
  return out;
}
/**
 * The colour of a material now. mctx: worldMaterialCtx / worldMaterialFor (month, leaf, turn, wet, frost, snow, snowDay, sky or
 * L, haze, hazeCol). Pure and memoised per (material, colour, key).
 */
const _wmtColMemo = new Map();
function worldMaterialColour(mat, hex, mctx) {
  if (typeof hex !== 'string' || hex[0] !== '#') return hex;
  const c = mctx || {}, M = WORLD_MATERIALS[mat] ? mat : 'paint';
  const key = M + hex + '|' + worldMaterialKey(c) + '|' + (c.key && (M === 'leaf') ? c.key : '') + '|' + (c.sky ? c.sky.id || '' : '') + (c.L ? 'L' + (c.L.ms || '') + (c.L.alt || '') : '');
  const hit = _wmtColMemo.get(key);
  if (hit) return hit;
  let out = _wmtSeason(M, hex, c);
  out = _wmtWeather(M, out, c);
  out = _wmtLight(M, out, c);
  if (c.haze > 0) out = _wmtMix(out, c.hazeCol || '#c9d6dc', c.haze);
  if (_wmtColMemo.size > 50000) _wmtColMemo.clear();
  _wmtColMemo.set(key, out);
  return out;
}
/** The cache key part of a material context (V5): the season state, the light band, the weather buckets and the haze bucket. */
function worldMaterialKey(mctx) {
  const c = mctx || {}, q = (v, n) => Math.round(_wmtClamp(Number(v) || 0, 0, 1) * n);
  return 'm' + (c.month == null ? '' : c.month) + (c.leaf ? c.leaf[0] + q(c.turn, 4) : '') + '|' + (c.band || (c.sky && c.sky.band) || '-') +
    '|w' + q(c.wet, 3) + 'f' + q(c.frost, 3) + 's' + (c.snowDay ? q(c.snow, 4) : 0) + 'h' + q(c.haze, 10);
}
