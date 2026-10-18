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
     worldMaterialArtSeason(obj, leaf, turn, season, ever) -> { art, own }: the library art season an entity is drawn in, from
                                                 its own leaf state (ONE source of seasonal state: the art, never art + material)
     worldMaterialVisible(mat, mctx)          -> false for leaves on a bare tree whose art does not show the season (legacy)
     worldMaterialRime(hex, mctx)             -> 0..1: how much of a winter art's painted frost or snow shows (the day's weather)
     worldMaterialOutfit(hex, outfit, part)   -> a person's A11 outfit drawn as the colour of the top (skin and hair kept)
     worldMaterialSnow(mat, mctx)             -> 0..1 snow lying on this material now (S2: ground, roofs and boughs, snow days only)
     worldMaterialKey(mctx)                   -> the cache key part (V5): changes with the season state, light band and weather,
                                                 never with the time inside a light band
   ============================================================ */
const WORLD_MATERIALS = Object.freeze({
  // wet: darkening when wet (0..1 of the colour; raised 15 Oct, audit bug 15: rain looked dry, leaves and grass barely changed); frost: hoar frost catch; snow: where snow lies ('ground' | 'roof' | 'bough'
  // or null); season: the seasonal colour model; gloss: how much of the sky a surface reflects; hard: a hard surface
  bark: { wet: 0.22, frost: 0.2, snow: 'bough', season: null, gloss: 0 },
  leaf: { wet: 0.18, frost: 0.45, snow: 'bough', season: 'leaf', gloss: 0.05 },
  needle: { wet: 0.06, frost: 0.4, snow: 'bough', season: 'needle', gloss: 0.03, evergreen: true },
  grass: { wet: 0.2, frost: 0.7, snow: 'ground', season: 'grass', gloss: 0 },
  reed: { wet: 0.06, frost: 0.5, snow: null, season: 'reed', gloss: 0 },
  flower: { wet: 0.05, frost: 0.3, snow: null, season: null, gloss: 0 },
  brick: { wet: 0.28, frost: 0.08, snow: null, season: null, gloss: 0, hard: true },
  stone: { wet: 0.32, frost: 0.12, snow: null, season: null, gloss: 0.02, hard: true },
  slate: { wet: 0.3, frost: 0.5, snow: 'roof', season: null, gloss: 0.08, hard: true },
  tile: { wet: 0.26, frost: 0.5, snow: 'roof', season: null, gloss: 0.04, hard: true },
  render: { wet: 0.18, frost: 0.05, snow: null, season: null, gloss: 0, hard: true },
  timber: { wet: 0.35, frost: 0.3, snow: null, season: null, gloss: 0 },
  paint: { wet: 0.18, frost: 0.1, snow: null, season: null, gloss: 0.25 },
  metal: { wet: 0.08, frost: 0.15, snow: null, season: null, gloss: 0.45 },
  glass: { wet: 0.04, frost: 0.2, snow: null, season: null, gloss: 0.7 },
  water: { wet: 0, frost: 0, snow: null, season: null, gloss: 0.6 },
  skin: { wet: 0, frost: 0, snow: null, season: null, gloss: 0 },
  fabric: { wet: 0.25, frost: 0, snow: null, season: null, gloss: 0 },
  fur: { wet: 0.12, frost: 0, snow: null, season: null, gloss: 0 },
  feather: { wet: 0.05, frost: 0, snow: null, season: null, gloss: 0.05 },
  tarmac: { wet: 0.4, frost: 0.35, snow: 'ground', season: null, gloss: 0.1, hard: true },
  paving: { wet: 0.32, frost: 0.35, snow: 'ground', season: null, gloss: 0.05, hard: true },
  gravel: { wet: 0.3, frost: 0.4, snow: 'ground', season: null, gloss: 0, hard: true },
  soil: { wet: 0.35, frost: 0.5, snow: 'ground', season: null, gloss: 0 },
  // broken rock on a slope (the talus at the foot of a cliff, 4terrain): wet like stone, and snow lies on it as on any ground
  scree: { wet: 0.34, frost: 0.25, snow: 'ground', season: null, gloss: 0, hard: true },
  // a moor's ground of heather, bilberry, bracken and bents (4terrain): its colour carries the month already (_wtrMoorCols: ONE seasonal model), and snow lies in
  // drifts and patches that the terrain draws on snow days, never as a white wash over the whole moor
  heath: { wet: 0.24, frost: 0.55, snow: null, season: null, gloss: 0 },
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
  const key = obj + '|' + part + '|' + fill + '|' + (shape && shape.glow ? 'g' : '') + (!fill && shape && typeof shape.s === 'string' && !shape.f ? '|s' + shape.s : '');
  let m = _wmtOfMemo.get(key);
  if (m) return m;
  m = _wmtOfRaw(String(obj || ''), String(part || ''), typeof fill === 'string' ? fill : null, shape);
  if (_wmtOfMemo.size > 20000) _wmtOfMemo.clear();
  _wmtOfMemo.set(key, m);
  return m;
}
function _wmtOfRaw(obj, part, fill, shape) {
  if (typeof worldKb === 'function') {
    try {
      const kb = worldKb(obj), mm = kb && kb.material;
      if (mm && typeof mm === 'object') {
        const v = mm[part] || mm['*'];
        // a brown or grey stroke inside a crown is a branch or a twig (the winter art's skeleton), never a leaf
        const line = shape && !shape.f && typeof shape.s === 'string' ? shape.s : null;
        if ((v === 'leaf' || v === 'needle') && line && !fill) { const [h, s2, l] = _wmtHsl(line); if (s2 < 0.12 || (h >= 10 && h < 50 && l < 0.5)) return 'bark'; }
        if (WORLD_MATERIALS[v]) return v;
      }
    } catch (e) { /* the rules below */ }
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
    haze: 0, hazeCol: (sky && sky.haze) || (o.L && o.L.haze) || '#c9d6dc', leaf: null, turn: 0, art: null, artOwn: false, key: '' };
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
/* ---------- the art season: ONE source of seasonal state (S1, V2) ----------
   The library draws its plants per season (sceneObjShapes(id, v, season): bare branch skeletons in winter, blossom in spring,
   turned crowns in autumn). The entity's leaf state (kb worldKbState, seeded per entity so trees turn unevenly) picks WHICH
   seasonal art is drawn; the material season step then leaves that art's colours alone (it only seasons the reference summer
   art of objects whose art does not change with the season). Before 15 Oct both did it: the winter art's branch skeleton (part
   'crown', material 'leaf') was dropped as "leaves on a bare tree", so every tree lost its head in winter, and the autumn
   tint was laid over herbs that were already drawn dead. */
const _wmtArtMemo = new Map();
/** True when the library draws obj differently in season se than in summer (its colours or shapes change). */
function _wmtArtHas(obj, se) {
  if (se === 'summer') return true;
  const key = obj + '|' + se;
  let r = _wmtArtMemo.get(key);
  if (r !== undefined) return r;
  r = false;
  try {
    const def = typeof sceneObj === 'function' ? sceneObj(obj) : null;
    if (def && def.seasonal !== false && typeof sceneObjShapes === 'function') {
      const sig = (x) => { const sh = sceneObjShapes(obj, 0, x); return sh ? JSON.stringify(Object.keys(sh.parts).map(p => sh.parts[p].map(q => [q.f, q.s, q.d]))) : ''; };
      const a = sig(se);
      r = !!a && a !== sig('summer');
    }
  } catch (e) { r = false; }
  _wmtArtMemo.set(key, r);
  return r;
}
/** The season of a month (0..11, northern; the caller flips the south), as sceneSeason names it. */
function _wmtSeasonOfMonth(m) { return m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn'; }
/**
 * The library art season to draw an entity in, from its leaf state (S1): bare -> 'winter' (the branch skeleton), bud ->
 * 'spring', full -> 'summer' ('spring' in the spring months: May blossom), turn -> 'autumn' (from 15 % turned; before that
 * the summer art with a light material turn), evergreens and things without leaves -> the scene season. Falls back to 'summer'
 * (the reference art, seasoned by materials) when the object's art does not change for that season. obj: the library id.
 * -> { art: season name, own: true when the art carries the season itself }
 */
function worldMaterialArtSeason(obj, leaf, turn, season, ever) {
  const se = season || 'summer';
  let want = se;
  if (leaf && !ever) {
    if (leaf === 'bare') want = 'winter';
    else if (leaf === 'bud') want = 'spring';
    else if (leaf === 'full') want = se === 'spring' ? 'spring' : 'summer';
    else if (leaf === 'turn') want = (Number.isFinite(turn) ? turn : 0.6) >= 0.15 ? 'autumn' : 'summer';
  }
  if (!obj) return { art: want, own: want !== 'summer' };
  if (_wmtArtHas(String(obj), want)) return { art: want, own: want !== 'summer' };
  return { art: 'summer', own: false };
}
/**
 * The context of one entity: leaf state from the knowledge base (worldKbState(kb, ctx, key), typeof) or the seeded fallback, and
 * its haze from its depth (sceneHazeAt when loaded). ent: { id, obj, x, z }. ctx (optional): the time context for kb.
 * Sets art (the library season to draw it in, worldMaterialArtSeason) and artOwn (that art already carries the season: the
 * material season step leaves its colours alone and no shape is dropped).
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
  let kbEver = false;
  if (st && st.leaf) { out.leaf = st.leaf; out.turn = Number.isFinite(st.turn) ? st.turn : st.leaf === 'turn' ? 0.6 : 0; try { const kb = worldKb(ent.obj); kbEver = !!(kb && kb.evergreen); } catch (e) { kbEver = false; } }
  else { const f = _wmtLeafOf(out.doy, key, ever); out.leaf = f.leaf; out.turn = f.turn; }
  out.ever = !!(ever || kbEver);
  if (ent && ent.obj && typeof sceneObj === 'function' && sceneObj(ent.obj)) {
    const a = worldMaterialArtSeason(ent.obj, out.leaf, out.turn, out.season || _wmtSeasonOfMonth(out.month == null ? 6 : out.month), out.ever);
    out.art = a.art; out.artOwn = a.own;
  } else { out.art = null; out.artOwn = false; }
  if (ent && Number.isFinite(ent.z)) {
    const d = Math.hypot(ent.x || 0, ent.z);
    out.haze = typeof sceneHazeAt === 'function' ? sceneHazeAt(d, out.atmos, out.L) : 0.47 * (1 - Math.exp(-d / 12000));
    if (ent.backdrop && Number.isFinite(ent.haze)) out.haze = Math.max(out.haze, ent.haze);   // a band's own haze floor (the far shore of an estuary: backdrop styles' band.haze)
  }
  return out;
}

/* ---------- the colour ---------- */
/**
 * False for leaves on a bare tree whose art does not show the season itself (the renderer drops those shapes); needles and every
 * other material stay. When the entity is drawn in its own art (mctx.art, worldMaterialFor) nothing is dropped: the winter art's
 * 'crown' IS the bare branch skeleton, and far trees, hedges and brambles drawn as one 'body' are all of their drawing
 * (dropping it left bare trunk slabs and white poles: SCENE_LESSONS H and P).
 */
function worldMaterialVisible(mat, mctx) {
  if (mat !== 'leaf' || !mctx) return true;
  if (mctx.art) return true;
  return mctx.leaf !== 'bare';
}
/**
 * A11 outfits drawn (audit bug 8): life gives every person an outfit index (0..WORLD_LIFE_OUTFITS-1); it was never drawn, so a
 * crowd of 40 had only the 8 looks of person.walker and two strangers walked the towpath side by side as clones. Outfit 0 is
 * the art's own; 1..11 recolour the TOP (the body and arm parts: shirts, jackets, tees) to a plausible clothing hue, keeping
 * lightness. Skin and skin outlines (warm hues 10-48 degrees), hair and dark outlines (l < 0.28) and near-whites of the eyes are
 * never touched; low-saturation tops (white tees, grey fleeces) take a light tint of the hue. -> the hex to colour instead of hex.
 */
const WORLD_OUTFIT_HUES = [null, 215, 0, 140, 345, 45, 185, 270, 22, 80, 228, 330];
const _WMT_TOP_PART = /^(body|body2|torso|top|coat|jacket|shirt|arm|armA|armB|arms|armFar|armNear)$/;
function worldMaterialOutfit(hex, outfit, part) {
  if (typeof hex !== 'string' || hex[0] !== '#' || !outfit || !_WMT_TOP_PART.test(String(part || ''))) return hex;
  const hue = WORLD_OUTFIT_HUES[((outfit | 0) % WORLD_OUTFIT_HUES.length + WORLD_OUTFIT_HUES.length) % WORLD_OUTFIT_HUES.length];
  if (hue == null) return hex;
  const [h, s, l] = _wmtHsl(hex);
  if (l < 0.28 || l > 0.95) return hex;
  if (h >= 10 && h <= 48 && s >= 0.15 && s <= 0.75 && l <= 0.88) return hex;
  const S = s < 0.15 ? 0.22 : Math.min(0.7, s);
  const C = (1 - Math.abs(2 * l - 1)) * S, X = C * (1 - Math.abs((hue / 60) % 2 - 1)), m = l - C / 2;
  const seg = Math.floor(hue / 60) % 6;
  const rgb = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][seg];
  const out = _wmtHex(rgb.map(v => (v + m) * 255));
  return s < 0.15 ? _wmtMix(hex, out, 0.55) : out;
}
/**
 * Weather baked into a winter art (V1, S2): the library's winter trees carry hoar frost on their twigs ('@frost' #f4f8fa) and
 * some carry snow on their limbs ('@snow' #f2f6fa, #f4f7fb ...). In v3 frost and snow come from the day's weather (the frost and
 * snow overlays), so a rime-white shape (near white with a cold, blue-leaning tint; flowers and birch bark lean warm) shows only
 * as much as the day is frosty or snowy. -> the alpha factor 0..1 for a shape of colour hex (1: not rime).
 */
function worldMaterialRime(hex, mctx) {
  if (typeof hex !== 'string' || hex[0] !== '#') return 1;
  const [r, g, b] = _wmtRgb(hex);
  if (!(r >= 230 && g >= 236 && b >= 240 && b >= r + 4 && b >= g)) return 1;
  const c = mctx || {};
  return _wmtClamp(Math.max(Number(c.frost) || 0, c.snowDay ? 1 : 0, Number(c.snow) || 0), 0, 1);
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
  // the art already carries the season (winter skeletons, spring blossom, autumn crowns, dead winter herbs): one source only
  if (c.artOwn) return hex;
  // the reference summer art of a plant (its own state picked it): only the leaf state's light touches, never a month model
  // that contradicts the state (a 'full' tree in October stays green, a turning one only starts to turn)
  if (c.art === 'summer' && c.leaf && M.season !== 'grass') {
    if (c.leaf === 'full') return m >= 7 && m <= 8 ? _wmtMix(hex, '#56682e', 0.18) : hex;
    if (c.leaf === 'turn') {
      const t = _wmtClamp(c.turn == null ? 0.2 : c.turn, 0, 1), pick = _WMT_TURN[_wmtHash('turn|' + (c.key || '') + '|' + hex) % _WMT_TURN.length];
      return _wmtMix(_wmtMix(hex, '#8a8a3a', 0.4 * t), pick, 0.85 * t);
    }
  }
  if (M.season === 'grass') return _WMT_GRASS[m] ? _wmtMix(hex, _WMT_GRASS[m], _WMT_GRASS_K[m]) : hex;
  if (M.season === 'reed') return m >= 9 || m <= 2 ? _wmtMix(hex, '#b39a62', 0.6) : m === 8 ? _wmtMix(hex, '#a59a5e', 0.3) : hex;
  if (M.season === 'needle') return m <= 1 || m === 11 ? _wmtMix(hex, '#3c4a3a', 0.15) : hex;
  // leaf: bud, full (early summer bright, late summer dark), turning (seeded hue per tree), bare (a dead brown for what remains)
  const leaf = c.leaf || (m < 3 || m > 10 ? 'bare' : m === 3 ? 'bud' : m >= 9 ? 'turn' : 'full');
  // fresh green, not lime: the 0.45 mix of #b3d468 washed spring trees lemon, worse at golden hour (audit bug 14)
  if (leaf === 'bud') return _wmtMix(hex, '#8fc25a', 0.2);
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
// materials that stand as dark masses at night (silhouettes against the sky: they see little of it), and lit glass's dark panes
const _WMT_MASS = new Set(['leaf', 'needle', 'bark', 'reed', 'grass']);
/**
 * The night key (QP4: night keeps every structure readable): after the grade, foliage, trunks and reed beds sink into silhouettes
 * (x (1 - 0.3 n)) against the sky, and every other material catches the night key in proportion to its OWN lightness (pale stone,
 * render, paint, a white boat or shirt read as moonlit; dark brick stays dark), so the scene keeps its contrast instead of one
 * murky blue-grey. n: the sky's nightKey.n (0 by day, 1 in deep night); k and col: the moon's strength and colour.
 */
function _wmtNightKey(mat, src, out, c) {
  const sky = c.sky, NK = sky && sky.nightKey, dark = c.L && Number.isFinite(c.L.dark) ? c.L.dark : sky ? sky.dark || 0 : 0;
  const n = NK ? NK.n : _wmtClamp((dark - 0.35) / 0.5, 0, 1);
  if (!(n > 0.01)) return out;
  const k = NK ? NK.k : 0.6, col = _wmtRgb(NK ? NK.col : '#9fb2dc'), o = _wmtRgb(out);
  if (_WMT_MASS.has(mat)) return _wmtHex(o.map(v => v * (1 - 0.3 * n)));
  if (mat === 'glass' || mat === 'water') return _wmtHex(o.map(v => v * (1 - 0.15 * n)));
  const a = Math.pow(_wmtLum(src), 1.25) * 0.26 * n * k;
  return _wmtHex(o.map((v, i) => v + a * col[i]));
}
function _wmtLight(mat, hex, c) {
  const M = WORLD_MATERIALS[mat] || {}, sky = c.sky;
  if (c.L && typeof sceneTone === 'function') {
    let out = sceneTone(c.L)(hex);
    if (M.gloss > 0 && c.L.mid) out = _wmtMix(out, c.L.mid, M.gloss * 0.25 * (1 - (c.L.dark || 0)));
    return _wmtNightKey(mat, hex, out, c);
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
  return _wmtNightKey(mat, hex, out, c);
}
/**
 * The colour of a material now. mctx: worldMaterialCtx / worldMaterialFor (month, leaf, turn, wet, frost, snow, snowDay, sky or
 * L, haze, hazeCol). Pure and memoised per (material, colour, key).
 */
const _wmtColMemo = new Map();
function worldMaterialColour(mat, hex, mctx) {
  if (typeof hex !== 'string' || hex[0] !== '#') return hex;
  const c = mctx || {}, M = WORLD_MATERIALS[mat] ? mat : 'paint';
  const key = M + hex + '|' + worldMaterialKey(c) + '|' + (c.key && (M === 'leaf' || M === 'reed') && !c.artOwn ? c.key : '') + '|' + (c.sky ? c.sky.id || '' : '') + (c.L ? 'L' + (c.L.ms || '') + (c.L.alt || '') : '');
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
  return 'm' + (c.month == null ? '' : c.month) + (c.leaf ? c.leaf[0] + q(c.turn, 4) : '') + (c.art ? (c.artOwn ? 'A' : 'a') + c.art.slice(0, 2) : '') + '|' + (c.band || (c.sky && c.sky.band) || '-') +
    '|w' + q(c.wet, 3) + 'f' + q(c.frost, 3) + 's' + (c.snowDay ? q(c.snow, 4) : 0) + 'h' + q(c.haze, 10);
}
