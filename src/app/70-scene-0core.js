/* ============================================================
   SCENE ENGINE CORE (docs/dev/SCENE_ENGINE.md sections 2 to 5 and 8; builder A).
   PURE: functions and consts only, no DOM, nothing expensive at load. Loaded by the browser
   build and by Node (tools/lib/anim-sources.mjs) in the same order, FIRST of the 70-scene files:
   70-scene-0core < 0kit < arch-0list < arch-* < data-* < lib-* < retro < select < svg < 71-...
   Classic script, one shared scope: every top-level name starts with scene / SCENE_ / _sc.
   It may call 71 functions (ukNatureKit, animSceneKit, animSeasonOf ...) only LAZILY.

   Constants   SCENE_W / SCENE_H, SCENE_CATEGORIES, SCENE_ANIM_KINDS, SCENE_LAYERS_DEFAULT,
               SCENE_MOMENTS, SCENE_SETTINGS, SCENE_SEASONS_4, SCENE_SIGN_FONT, SCENE_SIGN_DENY
   Randomness  sceneHash(str), sceneRnd(seed), sceneD (circ, ell, rect, poly, lobed, leaf)
   Objects     sceneObjDefine(def), sceneObj(id), sceneObjs(), sceneObjShapes(id, v, season),
               sceneObjCheck(id) -> [problem], sceneObjDups()
   Light       sceneKit(name), sceneSeason(ms, lat, scene), sceneLight(o, view), sceneTone(L),
               sceneColour(hex, {L, haze, hazeCol, tint}), sceneWind(t, x, L), sceneScaleBucket(s)
   Detail      sceneDetailAt(id, sh, scale), SCENE_DETAIL_PX (size-tiered detail shapes)
   People      scenePersonHeight(view, y), scenePersonScale(objHeight, y, view), SCENE_PERSON (the depth ladder)
   Scenes     sceneValidate(data), sceneCompile(data, {season, lod, L}), sceneData(itemOrThunk),
               sceneItem(meta, data), sceneAdd(pack, meta, data), sceneItems(pack), sceneItemDups()
   Scene engine v2 (docs/dev/SCENE_ENGINE_V2.md 12, 14): data whose camera has eye / fov / horizon / preset (sceneIsV2) compiles
               through the guarded v2 stages of 70-scene-1ground.js, -1scatter.js and the other builders' files: the camera,
               surfaces, water geometry, ground placements, scatter, cover, flows, atmosphere, weather, lights, draw order. v1
               data takes exactly the path below (byte-identical compiles: tests/scene-compat.test.mjs). A recipe item
               (item.recipe, 70-scene-1recipe.js) supersedes a v1 item of the same pack and id in sceneItems.
   Archetypes  sceneArchetypeDefine(id, a), sceneArchetype(id), sceneArchetypes(),
               sceneArchetypeCheck(id, row), sceneFromArchetype(archId, params, patch),
               sceneKitPick(kits, role, {tags, exclude}), sceneTableDefine(id, t), sceneTable(id),
               sceneTables(), sceneBatch(archId, tableId, {filter, when, extra}),
               sceneLinesDefine(map), sceneLine(id), sceneSignText(s)
   The compiled form (section 4) is the contract with the renderers (70-scene-svg.js,
   78-scene-canvas.js) and the lint (tools/lib/scene-lint.mjs).
   ============================================================ */
const SCENE_W = 1600, SCENE_H = 900;
const SCENE_CATEGORIES = Object.freeze(['tree', 'plant', 'ground', 'rock', 'water', 'bird', 'animal', 'person', 'vehicle', 'boat', 'building', 'street', 'rail', 'structure', 'prop', 'sky', 'landmark']);
const SCENE_ANIM_KINDS = Object.freeze(['sway', 'bob', 'flap', 'walk', 'paddle', 'turn', 'flicker', 'spin']);
const SCENE_LAYERS_DEFAULT = Object.freeze([
  { id: 'horizon', depth: 0.08, haze: 0.65 }, { id: 'far', depth: 0.2, haze: 0.45 }, { id: 'mid', depth: 0.45, haze: 0.2 },
  { id: 'near', depth: 0.75, haze: 0.06 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
]);
const SCENE_MOMENTS = Object.freeze(['dawn', 'morning', 'day', 'noon', 'afternoon', 'golden', 'sunset', 'dusk', 'night']);
const SCENE_SETTINGS = Object.freeze(['natural', 'urban', 'mixed', 'interior']);
const SCENE_SEASONS_4 = Object.freeze(['spring', 'summer', 'autumn', 'winter']);
const SCENE_SIGN_FONT = '600 {px}px system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const SCENE_SIGN_DENY = Object.freeze(['underground', 'tfl', 'transport for london', 'johnston', 'mind the gap', 'oyster', 'roundel', 'london overground', 'elizabeth line', 'docklands light railway']);
const _SC_PERIODS = { sway: 4, bob: 3, flap: 0.5, walk: 0.9, paddle: 2.4, turn: 6, flicker: 2, spin: 4 };
const _SC_IS_NODE = typeof window === 'undefined';

/* ---------- randomness and path helpers (2.5) ---------- */
function sceneHash(str) { let h = 2166136261; const s = String(str); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function sceneRnd(seed) { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); }
const _scF1 = v => Math.round(v * 10) / 10;
const sceneD = {
  circ: (x, y, r) => `M${_scF1(x - r)} ${_scF1(y)}a${_scF1(r)} ${_scF1(r)} 0 1 0 ${_scF1(2 * r)} 0a${_scF1(r)} ${_scF1(r)} 0 1 0 ${_scF1(-2 * r)} 0z`,
  ell: (x, y, rx, ry) => `M${_scF1(x - rx)} ${_scF1(y)}a${_scF1(rx)} ${_scF1(ry)} 0 1 0 ${_scF1(2 * rx)} 0a${_scF1(rx)} ${_scF1(ry)} 0 1 0 ${_scF1(-2 * rx)} 0z`,
  rect: (x, y, w, h, r) => {
    const R = _scF1;
    if (!r) return `M${R(x)} ${R(y)}h${R(w)}v${R(h)}h${R(-w)}z`;
    r = Math.min(r, w / 2, h / 2);
    return `M${R(x + r)} ${R(y)}h${R(w - 2 * r)}a${R(r)} ${R(r)} 0 0 1 ${R(r)} ${R(r)}v${R(h - 2 * r)}a${R(r)} ${R(r)} 0 0 1 ${R(-r)} ${R(r)}h${R(-(w - 2 * r))}a${R(r)} ${R(r)} 0 0 1 ${R(-r)} ${R(-r)}v${R(-(h - 2 * r))}a${R(r)} ${R(r)} 0 0 1 ${R(r)} ${R(-r)}z`;
  },
  poly: pts => 'M' + pts.map(p => _scF1(p[0]) + ' ' + _scF1(p[1])).join('L') + 'z',
  // the kit's own leaf shapes, lazily (sceneKit('obj') needs the 71 kit files, which load later)
  lobed: (rnd, cx, cy, rx, ry, n, ragged) => sceneKit('obj').lobed(rnd, cx, cy, rx, ry, n, ragged),
  leaf: (x, y, a, len, w) => sceneKit('obj').leafD(x, y, a, len, w),
};

/* ---------- the object registry (2.1, 2.2) ---------- */
const _scObjs = new Map(), _scShapeMemo = new Map(), _scObjDups = [];
const _SC_OBJ_ID_RE = /^[a-z]+\.[a-z0-9-]{1,40}$/;
/** Define (or, for tests, redefine) an object. A second definition of an id replaces the first and is reported by sceneObjCheck / sceneObjDups. */
function sceneObjDefine(def) {
  if (!def || !_SC_OBJ_ID_RE.test(def.id || '')) throw new Error('sceneObjDefine: bad id ' + (def && def.id) + ' (the form is <category>.<name>)');
  if (typeof def.build !== 'function') throw new Error('sceneObjDefine ' + def.id + ': build(v, rnd, ctx) is required');
  if (_scObjs.has(def.id)) _scObjDups.push(def.id);
  _scObjs.set(def.id, def);
  _scShapeMemo.clear(); _scKitPickMemo.clear();
  return def;
}
function sceneObj(id) { return _scObjs.get(id) || null; }
function sceneObjs() { return [..._scObjs.values()]; }
function sceneObjDups() { return _scObjDups.slice(); }
function _scSlot(def, season, slot) {
  const p = def.palette || {};
  return (p[season] && p[season][slot] != null) ? p[season][slot] : p.base ? p.base[slot] : undefined;
}
/** A paint for a season: '#hex' | '@slot' | '@slot.N' | {lin|rad: [[offset, paint, op?]], ...}. An unknown slot paints magenta (object lint names it). */
function _scPaint(def, season, paint) {
  if (paint == null) return null;
  if (typeof paint === 'string') {
    if (paint[0] !== '@') return paint;
    const m = /^@([a-zA-Z0-9_-]+)(?:\.(\d+))?$/.exec(paint), v = m ? _scSlot(def, season, m[1]) : null;
    if (v == null) return '#ff00ff';
    return Array.isArray(v) ? v[Math.min(v.length - 1, +(m[2] || 0))] : v;
  }
  const key = paint.lin ? 'lin' : paint.rad ? 'rad' : null;
  if (!key) return '#ff00ff';
  return Object.assign({}, paint, { [key]: paint[key].map(([o, c, op]) => [o, _scPaint(def, season, c), op == null ? 1 : op]) });
}
function _scBox(parts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const k in parts) for (const sh of parts[k]) {
    const b = typeof scenePathBox === 'function' ? scenePathBox(sh.d, sh.m) : null;
    if (!b) continue;
    const w = (sh.s && sh.w) ? sh.w / 2 : 0;
    x0 = Math.min(x0, b[0] - w); y0 = Math.min(y0, b[1] - w); x1 = Math.max(x1, b[2] + w); y1 = Math.max(y1, b[3] + w);
  }
  return isFinite(x0) ? [Math.floor(x0 - 2), Math.floor(y0 - 2), Math.ceil(x1 + 2), Math.ceil(y1 + 2)] : [-2, -2, 2, 2];
}
/**
 * The resolved drawing of (id, v, season), memoised: { box, parts: {name: [Shape]}, order, anim: [AnimTemplate] }.
 * Shape = { f, d, op, s, w, cap, m, glow, detail } with paints resolved. Parts come in def.parts order, then any
 * extra part build() returned. Hooks: def.anim, else the non-enumerable $anim a kit adapter (sceneObjFromKit) attaches.
 */
function sceneObjShapes(id, v, season) {
  const def = sceneObj(id);
  if (!def) return null;
  const vv = Math.max(0, Math.min((def.variants || 1) - 1, v | 0)), se = def.seasonal === false ? 'summer' : (season || 'summer');
  const key = id + '|' + vv + '|' + se;
  if (_scShapeMemo.has(key)) return _scShapeMemo.get(key);
  const raw = def.build(vv, sceneRnd(sceneHash(id + '|' + vv + (def.shapeBySeason ? '|' + se : ''))), { season: se, v: vv, id }) || {};
  const want = def.parts || ['body'];
  const order = want.filter(n => raw[n]).concat(Object.keys(raw).filter(n => !want.includes(n)));
  const parts = {};
  for (const name of order) {
    parts[name] = (raw[name] || []).filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => {
      const o = Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2] } : sh;
      return { f: o.f == null ? null : _scPaint(def, se, o.f), d: o.d, op: o.op == null ? 1 : o.op, s: o.s ? _scPaint(def, se, o.s) : null, w: o.w || 0, cap: o.cap || null, m: o.m || null, glow: o.glow || null, detail: !!o.detail };
    });
  }
  const hooks = def.anim ? Object.entries(def.anim).map(([kind, a]) => Object.assign({ kind, k: 1 }, a)) : (raw.$anim || []).map(a => Object.assign({ k: 1 }, a));
  const out = { box: def.box || _scBox(parts), parts, order, anim: hooks };
  _scShapeMemo.set(key, out);
  return out;
}
/** Definition-level problems of one object (the drawing rules are tools/lib/scene-lint.mjs lintObject). */
function sceneObjCheck(id) {
  const def = sceneObj(id), p = [];
  if (!def) return ['no object ' + id];
  if (!SCENE_CATEGORIES.includes(def.category)) p.push('unknown category ' + def.category);
  if (id.split('.')[0] !== def.category) p.push('the id prefix must be the category');
  if (_scObjDups.includes(id)) p.push('defined more than once');
  if (!Array.isArray(def.size) || def.size.length !== 2 || def.size.some(n => !(n >= 4 && n <= 2000))) p.push('size must be [w, h] within 4 to 2000');
  for (const kind of Object.keys(def.anim || {})) if (!SCENE_ANIM_KINDS.includes(kind)) p.push('unknown animation kind ' + kind);
  return p;
}

/* ---------- the nature kit, seasons, light, colour, wind (2.3, 5) ---------- */
const _scKits = new Map();
/** A memoised nature kit instance per name: 'obj' (object builds; K.live never called), 'light' (sceneLight), 'svg' (the SVG sky). */
function sceneKit(name) {
  if (!_scKits.has(name)) {
    const ok = typeof ukNatureKit === 'function' && typeof animSceneKit === 'function';
    if (!ok) return null;   // too early (the 71 files have not loaded) or a build without the kit: try again later
    _scKits.set(name, ukNatureKit(animSceneKit()));
  }
  return _scKits.get(name);
}
/** The UTC month (0..11) of a time in ms, by the civil-from-days arithmetic (no clock read, no Date object). */
function _scMonthOf(ms) {
  const z = Math.floor(ms / 86400000) + 719468, era = Math.floor(z / 146097), doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100)), mp = Math.floor((5 * doy + 2) / 153);
  return (mp < 10 ? mp + 3 : mp - 9) - 1;
}
/** The season for a date (5.1): a fixed scene season, the tropic palette within 23.5 degrees, else the month (flipped south). */
function sceneSeason(ms, lat, scene) {
  if (scene && scene.season && scene.season !== 'auto') return scene.season;
  if (!Number.isFinite(ms)) return 'summer';
  if (Math.abs(lat || 0) < 23.5) return (scene && scene.tropic) || 'summer';
  const m = _scMonthOf(ms), n = m < 2 || m === 11 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';   // the months of animSeasonOf
  return lat < 0 ? { winter: 'summer', summer: 'winter', spring: 'autumn', autumn: 'spring' }[n] : n;
}
/** The live light L of the Yateley scenes (5.2): the kit's K.live(o, view). Without the kit, a fixed day light. */
function sceneLight(o, view) {
  const K = sceneKit('light');
  if (K) return K.live(o || {}, view || {});
  return { live: false, alt: 30, az: 180, tod: 'day', phase: 'day', dark: 0, sun: { x: 900, y: 200, show: true, rel: 0 }, moon: { show: false, illum: 0 }, top: '#3a80c4', mid: '#98c4e4', low: '#eaeee6', lowSun: '#eaeee6', lowAway: '#dce9ef',
    light: '#fff0d4', shade: '#fff0dc', shadeOp: 0.03, haze: '#d6e2e6', cloud: ['#c0cfe0', '#f2f5f8', '#ffffff'], cover: 0.3, rain: false, snow: false, fog: false, wind: 1, stars: 0, lamps: false, windows: false,
    side: 1, backlit: 0, shadow: { dx: 0.5, dy: 0.1, len: 1, gx: 1, gy: 0, op: 0.2 }, horizon: (view && view.horizon) || 560, fov: 80, heading: 180, water: (b) => b || ['#7fb0c0', '#3f7e96', '#1d4c64'] };
}
const _scHx = c => { let s = String(c).replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const _scMix = (a, b, t) => { if (!t || !b) return a; const A = _scHx(a), B = _scHx(b), k = Math.max(0, Math.min(1, t)); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
const _scTones = new WeakMap();
/** The grade for L, memoised: exactly the kit's K.toneStr (night desaturation, the shade multiply, golden warmth). */
function sceneTone(L) {
  if (!L) return c => c;
  let f = _scTones.get(L);
  if (f) return f;
  const K = sceneKit('obj'), memo = new Map();
  f = c => { let v = memo.get(c); if (v) return v; v = K && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c) ? K.toneStr(L, `fill="${c}"`).slice(6, -1) : c; memo.set(c, v); return v; };
  _scTones.set(L, f);
  return f;
}
/** tint mix, then haze toward hazeCol || L.haze, then the grade (5.3). */
function sceneColour(hex, o) {
  o = o || {};
  let c = hex;
  if (o.tint && o.tint[1]) c = _scMix(c, o.tint[0], o.tint[1]);
  if (o.haze) c = _scMix(c, o.hazeCol || (o.L ? o.L.haze : '#c9dbe0'), o.haze);
  return o.L ? sceneTone(o.L)(c) : c;
}
/** The shared wind field (5.4): about -1.6 .. 1.6, scaled by the live wind. */
function sceneWind(t, x, L) {
  const w = L ? (L.wind == null ? 1 : L.wind) : 1;
  const base = 0.55 * Math.sin(0.9 * t + 0.0035 * x) + 0.3 * Math.sin(2.1 * t + 0.011 * x + 1.7) + 0.15 * Math.sin(5.3 * t + 0.031 * x);
  const gust = 0.8 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * (t - x / 420) / 9)), 6);
  return w * (base + gust);
}
function sceneScaleBucket(s) { return 2 ** (Math.round(Math.log2(Math.max(1e-3, s)) * 4) / 4); }

/* ---------- clouds (6.3): the natural sky as pure data; the canvas paints each cloud once into a sprite ---------- */
const SCENE_CLOUD_PAD = 24;   // scene units beyond the frame where a cloud wraps: it enters and leaves fully off-screen
const _scRr = (r, a, b) => a + r() * (b - a);
const _scCl = (v, a, b) => Math.max(a, Math.min(b, v));
// depth bands (far: small, pale, slow, low in the sky; near: larger, brighter, faster, higher) and the high cirrus band
const _SC_CLOUD_BANDS = { '-1': { s: [0.6, 1], y: [0.05, 0.35], v: 0.35 }, 0: { s: [0.5, 0.72], y: [0.7, 1], v: 0.55 }, 1: { s: [0.75, 1], y: [0.45, 0.8], v: 0.8 }, 2: { s: [1, 1.3], y: [0.3, 0.65], v: 1.1 } };
/** A heap's or a strip's lobes [x, y, rx, ry] round its centre, its flat base at y = 0: heaps tower in a bell, strips stay low and flat. */
function _scCloudLobes(strip, r, W) {
  const k = strip ? 9 + Math.floor(r() * 5) : 7 + Math.floor(r() * 4), tall = strip ? 0.45 : _scRr(r, 0.9, 1.35), skew = _scRr(r, -0.25, 0.25), lobes = [];
  // a cauliflower edge: small florets on the upper rim of a lobe (angles across its top, never under it)
  const florets = (x, y, rad, n) => { for (let f = 0; f < n; f++) { const a = _scRr(r, -2.6, -0.55), q = rad * _scRr(r, 0.3, 0.46); lobes.push([x + Math.cos(a) * rad * 0.78, y + Math.sin(a) * rad * 0.78, q * 1.04, q * 0.96]); } };
  // a strip is not a smooth lens: its thickness rises and falls in a few cells along its length
  const cells = 2 + Math.floor(r() * 2), ph = r() * Math.PI;
  for (let j = 0; j < k; j++) {
    // the lobes overlap along the whole length (no loose bubbles at the ends): spacing 0.8 W / (k - 1), radii from a bell
    const t = (j + _scRr(r, -0.25, 0.25)) / (k - 1) - 0.5, bell = Math.max(0.15, 1 - Math.abs(t - skew * 0.5) * 1.8) ** 0.7;
    const cell = strip ? 0.55 + 0.45 * Math.abs(Math.sin((t + 0.5) * cells * Math.PI + ph)) : 1;
    const pr = W * (strip ? 0.032 + 0.05 * bell * cell : 0.06 + 0.12 * bell) * _scRr(r, 0.8, 1.2), px = t * W * 0.8, py = -pr * _scRr(r, 0.3, 0.7) * tall;
    lobes.push([px, py, pr * (strip ? 1.6 : 1.08), pr * (strip ? 0.55 : 0.92)]);
    if (strip) { if (bell * cell > 0.4 && r() < 0.5) florets(px, py, pr * 0.8, 1); continue; }
    // towers: a smaller head on the tall middle lobes
    if (bell > 0.5 && r() < 0.8) { const q = pr * _scRr(r, 0.45, 0.7), qy = -pr * (1 + _scRr(r, 0.1, 0.5) * tall) - q * 0.2; lobes.push([px + _scRr(r, -0.6, 0.6) * pr, qy, q * 1.05, q * 0.95]); florets(px, qy, q, 1 + Math.floor(r() * 2)); }
    else if (bell > 0.3 && r() < 0.6) florets(px, py, pr, 1);
  }
  lobes.sort((a, b) => (a[1] + a[3] * 0.3) - (b[1] + b[3] * 0.3));   // towers behind, lower heads in front
  const rag = [];
  for (let j = 0; j < 4; j++) rag.push([_scRr(r, -0.38, 0.38) * W, _scRr(r, -2, 1.5), W * _scRr(r, 0.08, 0.18), Math.max(2, W * _scRr(r, 0.012, 0.022))]);
  // one wide low lobe under the middle keeps the underside a level shelf; rag: the soft ragged underside below it
  return { lobes, shelf: [W * skew * 0.2, -W * 0.03, W * (strip ? 0.46 : 0.42), W * (strip ? 0.05 : 0.07)], rag };
}
/** A cirrus wisp: soft streaks [x, y, rx, ry, angle] along a slight slope and fine hooked fibres [x0, y0, cx, cy, x1, y1, width]. */
function _scCirrus(r, W) {
  const slope = _scRr(r, -0.12, 0.05), hook = _scRr(r, -1, 1) * 14, streaks = [], fibres = [], n = 3 + Math.floor(r() * 2), f = 3 + Math.floor(r() * 4);
  for (let j = 0; j < n; j++) { const x = _scRr(r, -0.22, 0.22) * W; streaks.push([x, x * slope + _scRr(r, -4, 6), W * _scRr(r, 0.24, 0.42), _scRr(r, 2.5, 6), Math.atan(slope)]); }
  for (let j = 0; j < f; j++) {
    const len = W * _scRr(r, 0.35, 0.75), x0 = _scRr(r, -0.45, 0.05) * W, y0 = x0 * slope + _scRr(r, -5, 7), x1 = x0 + len;
    fibres.push([x0, y0, x0 + len * 0.55, y0 + len * 0.55 * slope + _scRr(r, -3, 3), x1, x1 * slope + hook * _scRr(r, 0.3, 1), _scRr(r, 1.2, 2.6)]);
  }
  return { streaks, fibres };
}
/**
 * A cloud's colours under L: [shade, body, lit] from L.cloud (dawn and dusk pink and gold, night blue-grey), a rim on the
 * sun's side (or a faint one on the moon's side at night), the low sun's glow under the base round sunrise and sunset,
 * far clouds hazed toward the horizon, near ones brighter; the opacity as before (0.92, 0.7 in deep night).
 */
function _scCloudTone(L, kind, band) {
  const cover = _scCl(L.cover || 0, 0, 1), alt = L.alt == null ? 30 : L.alt, back = _scCl(L.backlit || 0, 0, 1), m = L.moon || {};
  const sunK = _scCl((alt + 3) / 6, 0, 1) * (1 - cover * 0.8), moonK = m.show ? (0.2 + 0.4 * (m.illum || 0)) * (1 - cover) : 0, byMoon = sunK < 0.25 && moonK > 0;
  let [shade, body, lit] = L.cloud || ['#c4d3e3', '#f4f7fa', '#ffffff'];
  let rimK = byMoon ? moonK : Math.min(1, sunK * (0.75 + back * 0.5));
  const rim = byMoon ? _scMix(body, '#c8d4ee', 0.55) : _scMix(_scMix(lit, '#ffffff', 0.4), L.lowSun || lit, _scCl(1 - alt / 12, 0, 1) * 0.5);
  const under = _scCl((2 - alt) / 3, 0, 1) * _scCl((alt + 6) / 3, 0, 1) * (1 - cover * 0.7);
  body = _scMix(body, shade, back * 0.3);
  if (band === 0) { const hz = L.low || body; shade = _scMix(shade, hz, 0.3); body = _scMix(body, hz, 0.25); lit = _scMix(lit, hz, 0.2); rimK *= 0.6; }
  if (band === 2) { body = _scMix(body, lit, 0.12); rimK = Math.min(1, rimK * 1.15); }
  const op = (L.dark > 0.9 ? 0.7 : 0.92) * (kind === 'cirrus' ? 0.6 : kind === 'strip' ? 0.96 : 1) * (band === 0 ? 0.9 : 1);
  const side = byMoon ? ((m.rel != null ? m.rel : (m.x || 800) - 800) >= 0 ? 1 : -1) : (L.side || 1);
  const r2 = v => Math.round(v * 100) / 100;
  // round sunrise and sunset the sun below the horizon lights the cloud from under: a glowing base, a duller top
  return { shade, body, lit, rim, rimK: r2(rimK), hk: r2((0.35 + 0.55 * sunK + 0.1 * moonK) * (1 - 0.5 * under)), side, op: r2(op),
    baseCol: _scMix(shade, lit, under), ragCol: _scMix(_scMix(body, shade, 0.6), lit, under * 0.6), wisp: _scMix(lit, rim, 0.5) };
}
/** The extent [x0, y0, x1, y1] of a cloud's shapes (round its centre and base), so its sprite holds every soft edge. */
function _scCloudBox(sh) {
  const b = [Infinity, Infinity, -Infinity, -Infinity], add = (x0, y0, x1, y1) => { b[0] = Math.min(b[0], x0); b[1] = Math.min(b[1], y0); b[2] = Math.max(b[2], x1); b[3] = Math.max(b[3], y1); };
  for (const e of [...(sh.lobes || []), ...(sh.shelf ? [sh.shelf] : []), ...(sh.rag || [])]) add(e[0] - e[2], e[1] - e[3], e[0] + e[2], e[1] + e[3]);
  for (const s of sh.streaks || []) { const dy = s[3] + Math.abs(Math.sin(s[4])) * s[2]; add(s[0] - s[2], s[1] - dy, s[0] + s[2], s[1] + dy); }
  for (const f of sh.fibres || []) for (let i = 0; i < 6; i += 2) add(f[i] - f[6], f[i + 1] - f[6], f[i] + f[6], f[i + 1] + f[6]);
  return b;
}
/**
 * The clouds of a compiled scene under the light L (6.3): count min(10, max(1, round(n * (0.45 + cover * 1.6)))) as before,
 * cirrus wisps inside it. Kinds by cover and weather: fair-weather cumulus heaps (and a few high cirrus wisps in a clear sky),
 * low stratus strips under overcast, rain, snow or fog. Two or three depth bands drift at their own speeds (parallax).
 * Seeded by the scene id (two scenes never share a sky); a cloud's place, size, shape and speed do not depend on the light,
 * so a re-bake at a new light recolours the sky without moving it. Sorted far to near (the draw order). Each:
 * { kind, band (-1 cirrus, 0 far, 1 mid, 2 near), w, h (the sprite, scene units), x0 (drift phase), y (the sprite's bottom
 * edge), sp (units / s), base (the flat base's y in the sprite), lobes, shelf, rag | streaks, fibres (sprite units), tone }.
 * At t = 0 every cloud is on screen (the reduced-motion still is a finished sky).
 */
function sceneCloudPlan(C, L) {
  const sk = C && C.sky && C.sky.clouds;
  if (!sk || !L) return [];
  const cover = _scCl(L.cover || 0, 0, 1), n = Math.min(10, Math.max(1, Math.round((sk.n || 4) * (0.45 + cover * 1.6))));
  const wet = !!(L.rain || L.snow || L.fog), id = String(C.id), off = sceneHash(id + '|clouds'), span = Math.max(10, sk.y1 - sk.y0);
  // cumulative weights heap | strip | cirrus, and at most this many cirrus
  const kw = wet || cover > 0.75 ? [0.3, 1] : cover > 0.5 ? [0.55, 1] : cover < 0.2 ? [0.6, 0.72] : [0.7, 0.86];
  const maxCi = wet || cover > 0.5 ? 0 : cover < 0.2 ? Math.max(1, Math.round(n / 3)) : 1, bands = n > 2 ? 3 : 2;
  const out = [];
  let cirri = 0;
  for (let i = 0; i < n; i++) {
    const r = sceneRnd(sceneHash(id + '|cloud|' + i)), u = (off % 997 / 997 + i * 0.6180339887 + _scRr(r, -0.12, 0.12) + 1) % 1, yr = r(), sr = r(), vr = r(), kr = r();
    let kind = kr < kw[0] ? 'heap' : kr < kw[1] ? 'strip' : 'cirrus';
    if (kind === 'cirrus' && cirri++ >= maxCi) kind = 'heap';
    const band = kind === 'cirrus' ? -1 : bands === 3 ? (i + off) % 3 : ((i + off) % 2) * 2, B = _SC_CLOUD_BANDS[band], s = B.s[0] + sr * (B.s[1] - B.s[0]);
    const W = 280 * s * (kind === 'cirrus' ? _scRr(r, 1, 1.7) : kind === 'strip' ? _scRr(r, 1.7, 2.6) : _scRr(r, 0.85, 1.2));
    const sh = kind === 'cirrus' ? _scCirrus(r, W) : _scCloudLobes(kind === 'strip', r, W), bx = _scCloudBox(sh), pad = 4, dx = pad - bx[0], dy = pad - bx[1];
    const mv = (e) => { const c = e.slice(); c[0] += dx; c[1] += dy; if (e.length === 7) { c[2] += dx; c[3] += dy; c[4] += dx; c[5] += dy; } return c; };
    const w = bx[2] - bx[0] + 2 * pad, h = bx[3] - bx[1] + 2 * pad, yBase = sk.y0 + span * (B.y[0] + yr * (B.y[1] - B.y[0]));
    const left0 = 80 + u * 1440 - dx;   // the cloud's centre at t = 0 lies between x 80 and 1520
    const p = { kind, band, w, h, x0: left0 + w + SCENE_CLOUD_PAD, y: yBase + h - dy, sp: (sk.speed || 6) * B.v * (0.9 + vr * 0.2), base: dy, tone: _scCloudTone(L, kind, band) };
    if (kind === 'cirrus') { p.streaks = sh.streaks.map(mv); p.fibres = sh.fibres.map(mv); }
    else { p.lobes = sh.lobes.map(mv); p.shelf = mv(sh.shelf); p.rag = sh.rag.map(mv); }
    out.push(p);
  }
  return out.sort((a, b) => a.band - b.band || a.y - b.y);
}
/** A cloud's x (scene units) at t seconds: it drifts right and wraps on its own width, entering and leaving fully off-screen. */
function sceneCloudX(c, t) { const P = SCENE_W + c.w + 2 * SCENE_CLOUD_PAD; return ((c.x0 + c.sp * t) % P + P) % P - c.w - SCENE_CLOUD_PAD; }
/**
 * Size-tiered detail (2.2): may a drawing of object `id` (resolved form sh) at `scale` keep its `detail: true` shapes?
 * An object that opts in with `detailPx` (true: SCENE_DETAIL_PX, or a number) keeps them only when drawn at least that
 * tall (box height x scale: device px on the canvas, scene units in the SVG); other objects always do (LOD < 0.5 still
 * drops every detail shape). A pure function of (object, variant, season, scale), all in the sprite key.
 */
const SCENE_DETAIL_PX = 48;
function sceneDetailAt(id, sh, scale) {
  const def = sceneObj(id), px = def && def.detailPx;
  if (!px || !sh) return true;
  return (sh.box[3] - sh.box[1]) * (scale || 0) >= (px === true ? SCENE_DETAIL_PX : px);
}
/**
 * The depth ladder for people (2.8): the on-screen height, in units, of a 1.72 m person whose feet are on row y of a
 * view. 16 at the view's horizon row, 132 at the ground row (the frame's foot, SCENE_H), linear in y between (a flat
 * ground seen in perspective), never above 150 (the care limit, 8.5) nor below 6.
 */
const SCENE_PERSON = Object.freeze({ metres: 1.72, horizon: 16, ground: 132, max: 150, min: 6 });
function scenePersonHeight(view, y) {
  const P = SCENE_PERSON, H = view && Number.isFinite(view.horizon) ? view.horizon : 560;
  const h = P.horizon + (P.ground - P.horizon) * (y - H) / Math.max(1, SCENE_H - H);
  return Math.round(Math.max(P.min, Math.min(P.max, h)) * 10) / 10;
}
/** The scale that draws a person object `objHeight` units tall (its size[1] stands for 1.72 m) at row y of the view. */
function scenePersonScale(objHeight, y, view) { return Math.floor(scenePersonHeight(view, y) / Math.max(1, objHeight) * 1000) / 1000; }
/** Sign text (8.3): trimmed, 1 to 40 letters / digits / ' & . , ( ) - /, not on the deny-list. */
function sceneSignText(s) {
  const text = String(s == null ? '' : s).trim().replace(/\s+/g, ' ');
  if (!text || text.length > 40) return { ok: false, text, problem: 'length 1 to 40' };
  if (!/^[\p{L}\p{N} '&.,()\-\/]+$/u.test(text)) return { ok: false, text, problem: 'characters' };
  const low = text.toLowerCase(), bad = SCENE_SIGN_DENY.find(w => low.includes(w));
  return bad ? { ok: false, text, problem: 'deny-list: ' + bad } : { ok: true, text, problem: null };
}

/* ---------- validate and compile (3, 4) ---------- */
function _scInPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function _scAreaBox(a) { if (a.rect) return a.rect; const xs = a.poly.map(p => p[0]), ys = a.poly.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
function _scInArea(x, y, a) { return a.rect ? x >= a.rect[0] && x <= a.rect[2] && y >= a.rect[1] && y <= a.rect[3] : _scInPoly(x, y, a.poly); }
function _scAreaOk(a) {
  if (!a || typeof a !== 'object') return false;
  if (a.rect) return Array.isArray(a.rect) && a.rect.length === 4 && a.rect.every(Number.isFinite) && a.rect[2] > a.rect[0] && a.rect[3] > a.rect[1];
  if (a.poly) { if (!Array.isArray(a.poly) || a.poly.length < 3 || !a.poly.every(p => Array.isArray(p) && Number.isFinite(p[0]) && Number.isFinite(p[1]))) return false; const b = _scAreaBox(a); return b[2] > b[0] && b[3] > b[1]; }
  return false;
}
function _scNoise(x, y, seed) {
  const h = (i, j) => (sceneHash(seed + ':' + i + ':' + j) % 1000) / 1000, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function _scLerpY(tab, y) { if (!tab || !tab.length) return 1; if (y <= tab[0][0]) return tab[0][1]; for (let i = 1; i < tab.length; i++) if (y <= tab[i][0]) { const [y0, s0] = tab[i - 1], [y1, s1] = tab[i]; return s0 + (s1 - s0) * (y - y0) / (y1 - y0); } return tab[tab.length - 1][1]; }
function _scPick(r, w) { if (typeof w === 'string') return w; if (Array.isArray(w)) return w[Math.floor(r() * w.length) % w.length]; const e = Object.entries(w), tot = e.reduce((n, [, k]) => n + k, 0); let x = r() * tot; for (const [id, k] of e) { if ((x -= k) <= 0) return id; } return e[e.length - 1][0]; }
function _scPathLen(path) { let n = 0; for (let i = 1; i < path.length; i++) n += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); return n; }
const _scObjIds = o => (typeof o === 'string' ? [o] : Array.isArray(o) ? o : Object.keys(o || {}));

/** The problems of a scene's data (3): an empty list when it is fine. */
function sceneValidate(data) {
  const p = [];
  if (!data || typeof data !== 'object') return ['the scene is not an object'];
  if (typeof sceneIsV2 === 'function' && typeof sceneValidateV2 === 'function' && sceneIsV2(data)) return sceneValidateV2(data);   // v2 (70-scene-1recipe.js)
  if (!data.view || !Number.isFinite(data.view.lat) || !Number.isFinite(data.view.lon)) p.push('view.lat / view.lon missing');
  const layers = data.layers || SCENE_LAYERS_DEFAULT;
  if (!Array.isArray(layers) || !layers.length) p.push('layers must be a non-empty list');
  else if (layers.length > 8) p.push('at most 8 layers (' + layers.length + ')');
  const ids = new Set((Array.isArray(layers) ? layers : []).map(l => l.id));
  if (data.setting != null && !SCENE_SETTINGS.includes(data.setting)) p.push('unknown setting ' + data.setting + ' (' + SCENE_SETTINGS.join(' ') + ')');
  if (data.at != null && !SCENE_MOMENTS.includes(data.at)) p.push('unknown moment at: ' + data.at);
  const layerOk = (k, e) => { if (e.layer != null && !ids.has(e.layer)) p.push(`${k}: unknown layer ${e.layer}`); };
  for (const k of ['place', 'scatter', 'actors', 'flocks']) for (const e of data[k] || []) {
    const objs = _scObjIds(e.obj);
    if (!objs.length) p.push(`${k}: no object`);
    for (const o of objs) if (!sceneObj(o)) p.push(`${k}: unknown object ${o}`);
    layerOk(k, e);
  }
  for (const k of ['ground', 'water', 'signs']) for (const e of data[k] || []) layerOk(k, e);
  (data.scatter || []).forEach((r, i) => {
    if (!_scAreaOk(r.area)) p.push(`scatter ${i}: an empty or bad area`);
    else { const b = _scAreaBox(r.area); if (b[2] < -400 || b[0] > SCENE_W + 400 || b[3] < -200 || b[1] > SCENE_H + 200) p.push(`scatter ${i}: the area is out of range`); }
    const n = r.n != null ? r.n : (r.density || 1) * (_scAreaOk(r.area) ? (() => { const b = _scAreaBox(r.area); return (b[2] - b[0]) * (b[3] - b[1]) / 10000; })() : 0);
    if (n > 3000) p.push(`scatter ${i}: n ${Math.round(n)} is above 3000`);
  });
  (data.actors || []).forEach((a, i) => { if (!Array.isArray(a.path) || a.path.length < 2) p.push(`actors ${i}: the path needs at least 2 points`); });
  (data.flocks || []).forEach((f, i) => { if (!Array.isArray(f.area) || f.area.length !== 4 || !(f.area[2] > f.area[0] && f.area[3] > f.area[1])) p.push(`flocks ${i}: area must be [x0, y0, x1, y1]`); });
  const signs = data.signs || [];
  if (signs.length > 6) p.push('at most 6 signs (' + signs.length + ')');
  if (signs.length && !data.signage) p.push('signs need signage: true (8.3)');
  signs.forEach((s, i) => { const t = sceneSignText(s.text); if (!t.ok) p.push(`signs ${i}: ${t.problem}`); });
  return p;
}
function _scAnims(id, v, season, seed, over) {
  if (over === false) return [];
  const sh = sceneObjShapes(id, v, season);
  if (!sh) return [];
  const r = sceneRnd(seed * 7 + 3);
  return sh.anim.map(a => {
    const o = (over && over[a.kind]) || {};
    if (over && over[a.kind] === false) return null;
    let k = o.k != null ? o.k : (a.k || 1);
    if (Array.isArray(k)) k = k[0] + r() * (k[1] - k[0]);
    return Object.assign({}, a, o, { phase: r(), k, period: o.period || a.period || _SC_PERIODS[a.kind] || 3, pivot: a.pivot || [0, 0] });
  }).filter(Boolean);
}
function _scGlowOn(id, v, season, seed) {
  const def = sceneObj(id), sh = sceneObjShapes(id, v, season);
  let n = 0;
  for (const p of sh.order) for (const s of sh.parts[p]) if (s.glow) n++;
  if (!n) return null;
  const r = sceneRnd(seed * 13 + 5), on = def.night && def.night.on != null ? def.night.on : 0.7, out = [];
  for (let i = 0; i < n; i++) out.push(r() < on);
  return out;
}
const _scCompiled = new WeakMap();
/**
 * The COMPILED scene (section 4): pure, deterministic, memoised on (data, season, lod). Scatter rules expand with
 * sceneRnd(sceneHash(id | rule index | seed)); LOD keeps a seeded share of each rule (hand placements and actors
 * are always kept). L is accepted for the contract but the compiled form does not depend on it.
 */
function sceneCompile(data, opt) {
  opt = opt || {};
  data = sceneData(data);
  const season = opt.season || (data.season && data.season !== 'auto' ? data.season : 'summer'), lod = opt.lod == null ? 1 : opt.lod;
  const memoKey = season + '|' + lod;
  let m = _scCompiled.get(data);
  if (m && m.has(memoKey)) return m.get(memoKey);
  // v2 (V2 12): the camera, surfaces, water, ridges and generated buildings first; G is null for v1 data
  const G = typeof sceneIsV2 === 'function' && typeof sceneCompileV2Begin === 'function' && sceneIsV2(data) ? sceneCompileV2Begin(data, { season, lod }) : null;
  const layersIn = G ? G.layers : (data.layers || SCENE_LAYERS_DEFAULT).slice(0, 8), layers = layersIn.map((l, i) => ({ id: l.id, i, depth: l.depth, haze: l.haze || 0 }));
  const li = id => { const l = layers.find(x => x.id === id); return l ? l.i : layers.length - 1; };
  const pal = (paint) => _scPaint({ palette: data.palette || {} }, season, paint);
  const items = [], strips = [];
  const hz = (i) => Math.round(layers[i].haze * 10) / 10;
  const push = (p, order) => {
    const def = sceneObj(p.obj);
    if (!def) return null;
    const v = Math.max(0, Math.min((def.variants || 1) - 1, p.variant | 0)), se = p.season || season, seed = p.seed | 0, L = li(p.layer);
    const sh = sceneObjShapes(p.obj, v, se);
    const tk = p.tint ? Math.max(0, Math.min(0.24, Math.round(p.tint[1] / 0.08) * 0.08)) : 0;
    const it = { o: p.obj, v, x: p.x, y: p.y, s: p.s || 1, flip: !!p.flip && def.flippable !== false, layer: L, haze: hz(L),
      tint: p.tint && tk ? [p.tint[0], Math.round(tk * 100) / 100] : null, season: se, seed, z: p.y, order,
      strip: -1, anim: p.strip ? [] : _scAnims(p.obj, v, se, seed, p.anim), glowOn: _scGlowOn(p.obj, v, se, seed),
      shadow: p.shadow != null ? !!p.shadow : !!def.shadow, reflect: p.reflect != null ? !!p.reflect : !!def.reflect, lit: !!(sh && sh.parts.lit && sh.parts.lit.length) };
    items.push(it);
    return it;
  };
  let order = 0;
  // v2: a resolved placement (pixel form + its ground record $v2) is pushed as v1, then gains its v2 fields
  const pushV2 = (q, seedOf) => {
    const it = push(seedOf != null ? Object.assign({}, q, { seed: q.seed != null ? q.seed : seedOf }) : q, order++);
    if (it) { sceneCompileV2Attach(G, it, q); G.placed.push(q); if (typeof sceneScatterFootAdd === 'function' && q.$v2 && !q.$v2.cover) sceneScatterFootAdd(G, it.o, q.$v2.g, q.$v2.k); }
    return it;
  };
  if (G) (data.place || []).forEach((p, i) => { const q = sceneCompileV2Place(G, p, i); if (q) pushV2(q, sceneHash(data.id + '|p|' + i) % 1e6); });
  else (data.place || []).forEach((p, i) => push(Object.assign({}, p, { seed: p.seed != null ? p.seed : sceneHash(data.id + '|p|' + i) % 1e6 }), order++));
  (data.scatter || []).forEach((rule, ri) => {
    if (G && rule && !rule.area) {
      // a v2 rule (V2 11): ground metres, surfaces, Poisson disk, clusters, footprints; wind strips per layer
      const made = (typeof sceneScatterV2 === 'function' ? sceneScatterV2(G, rule, ri) : []).map(q => pushV2(q)).filter(Boolean);
      if (rule.anim === 'strip' && made.length && typeof sceneScatterStrips === 'function') strips.push(...sceneScatterStrips(made, rule));
      return;
    }
    if (!_scAreaOk(rule.area)) return;
    const r = sceneRnd(sceneHash(data.id + '|' + ri + '|' + (rule.seed | 0)));
    const box = _scAreaBox(rule.area), aw = box[2] - box[0], ah = box[3] - box[1];
    let n = rule.n != null ? rule.n : Math.round((rule.density || 1) * aw * ah / 10000);
    n = Math.min(3000, Math.max(0, n | 0));
    const keep = Math.max(0, Math.round(n * lod)), gap = rule.minGap || 0, cell = Math.max(4, gap), grid = new Map(), got = [];
    let tries = 0;
    while (got.length < n && tries++ < n * 12) {
      const x = box[0] + r() * aw, y = box[1] + r() * ah;
      if (!_scInArea(x, y, rule.area)) continue;
      const mk = rule.mask;
      if (mk && mk.avoid && mk.avoid.some(a => _scInArea(x, y, a))) continue;
      if (mk && mk.noise && _scNoise(x / mk.noise.scale, y / mk.noise.scale, rule.seed | 0) < mk.noise.cut) continue;
      if (gap) {
        const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
        let ok = true;
        for (let i = -1; i <= 1 && ok; i++) for (let j = -1; j <= 1 && ok; j++) for (const q of grid.get((gx + i) + ',' + (gy + j)) || []) if (Math.hypot(q[0] - x, q[1] - y) < gap) { ok = false; break; }
        if (!ok) continue;
        const k = gx + ',' + gy; (grid.get(k) || grid.set(k, []).get(k)).push([x, y]);
      }
      const obj = _scPick(r, rule.obj), def = sceneObj(obj);
      const s0 = Array.isArray(rule.s) ? rule.s[0] + r() * (rule.s[1] - rule.s[0]) : (rule.s || 1);
      const vv = rule.variant === 'random' || rule.variant == null ? Math.floor(r() * ((def && def.variants) || 1)) : Array.isArray(rule.variant) ? rule.variant[0] + Math.floor(r() * (rule.variant[1] - rule.variant[0] + 1)) : rule.variant;
      const tk = rule.tint ? [rule.tint.col, rule.tint.k[0] + r() * (rule.tint.k[1] - rule.tint.k[0])] : null;
      got.push({ obj, x: Math.round(x), y: Math.round(y), s: Math.round(s0 * _scLerpY(rule.sByY, y) * 100) / 100, flip: r() < (rule.flip == null ? 0.5 : rule.flip), variant: vv, layer: rule.layer, seed: Math.floor(r() * 1e6), tint: tk,
        strip: rule.anim === 'strip', anim: rule.anim === 'strip' ? false : rule.anim, shadow: rule.shadow, reflect: rule.reflect });
    }
    // stratified flips and sizes: exactly round(n * flip) mirrored and the size range covered evenly (seeded order), so a
    // small group never comes out all one way or all one size by chance (the variety rule, 10.2)
    if (got.length > 1) {
      // flips per object of the rule (a mixed rule's minor object is its own small group: the variety rule judges each object)
      const sr = sceneRnd(sceneHash(data.id + '|strat|' + ri)), keys = got.map(() => sr()), fs = rule.flip == null ? 0.5 : rule.flip, byObj = new Map();
      got.forEach((g, i) => { const k = String(g.obj); if (!byObj.has(k)) byObj.set(k, []); byObj.get(k).push(i); });
      for (const idx of byObj.values()) {
        if (idx.length < 2 && byObj.size > 1) continue;
        const nf = Math.round(idx.length * fs);
        idx.slice().sort((a, b) => keys[a] - keys[b]).forEach((gi, k) => { got[gi].flip = k < nf; });
      }
      if (Array.isArray(rule.s)) {
        const o2 = got.map((g, i) => [sr(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
        o2.forEach((gi, k) => { const g = got[gi], s0 = rule.s[0] + (rule.s[1] - rule.s[0]) * (k + sr()) / got.length; g.s = Math.round(s0 * _scLerpY(rule.sByY, g.y) * 100) / 100; });
      }
    }
    // a height cap (maxH, units): an object whose tallest placement would pass it is scaled down as a whole, so its sizes keep their spread
    if (rule.maxH > 0) {
      const top = new Map();
      for (const g of got) top.set(g.obj, Math.max(top.get(g.obj) || 0, g.s));
      for (const g of got) { const d = sceneObj(g.obj), k = d && d.size ? rule.maxH / (d.size[1] * top.get(g.obj)) : 1; if (k < 1) g.s = Math.floor(g.s * k * 100) / 100; }
    }
    const pick = sceneRnd(sceneHash(data.id + '|lod|' + ri)), kept = keep >= got.length ? got : got.map(g => [pick(), g]).sort((a, b) => a[0] - b[0]).slice(0, keep).map(x => x[1]);
    const made = kept.map(p => push(p, order++)).filter(Boolean);
    if (rule.anim === 'strip' && made.length) {
      const w = 140, byCol = new Map();
      for (const it of made) { const c = Math.floor((it.x + 160) / w); (byCol.get(c) || byCol.set(c, []).get(c)).push(it); }
      for (const [c, list] of byCol) strips.push({ layer: li(rule.layer), x0: -160 + c * w, x1: -160 + (c + 1) * w, y0: Math.min(...list.map(i => i.y)), y1: Math.max(...list.map(i => i.y)), items: list, amp: rule.amp || 1 });
    }
  });
  if (G && typeof sceneCoverAuto === 'function') for (const q of sceneCoverAuto(G, G.placed)) pushV2(q);   // seasonal cover (V2 10)
  items.sort((a, b) => a.layer - b.layer || a.z - b.z || a.order - b.order);
  items.forEach(it => { delete it.order; });
  const index = new Map(items.map((it, i) => [it, i]));
  strips.sort((a, b) => a.layer - b.layer || a.x0 - b.x0);
  strips.forEach((st, si) => { st.items = st.items.map(it => { it.strip = si; return index.get(it); }); });
  // v2 actors on the ground (V2 4.8) arrive in the v1 form (a projected path, sByY), their ground record riding along
  const actorsIn = G ? (data.actors || []).map((a, i) => (a && Array.isArray(a.path) ? a : (typeof sceneCompileV2Actor === 'function' && sceneCompileV2Actor(G, a || {}, i)) || {})) : (data.actors || []);
  const actors = actorsIn.map((a, i) => {
    const def = sceneObj(a.obj); if (!def || !Array.isArray(a.path) || a.path.length < 2) return null;
    const v = Math.max(0, Math.min((def.variants || 1) - 1, a.variant | 0)), seed = a.seed != null ? a.seed : i + 1;
    return { o: a.obj, v, layer: li(a.layer), path: a.path, len: _scPathLen(a.path), speed: a.speed || 20, loop: a.loop || 'pingpong', s: a.s || 1, flip: !!a.flip,
      sByY: a.sByY === true ? [[500, 0.5], [900, 1.2]] : a.sByY || null, seed, offset: a.offset != null ? a.offset : sceneRnd(seed)(), anim: _scAnims(a.obj, v, a.season || season, seed, a.anim) };
  }).map((c, i) => (c && G && actorsIn[i].$ground ? Object.assign(c, actorsIn[i].$ground) : c)).filter(Boolean);
  const flocks = (data.flocks || []).filter(f => sceneObj(f.obj)).map((f, i) => ({ o: f.obj, v: f.variant | 0, n: Math.max(0, f.n == null ? 5 : f.n), area: f.area, speed: f.speed || 30, s: f.s || 0.5, seed: f.seed != null ? f.seed : i + 1, layer: li(f.layer || 'far') }));
  const signs = (data.signage ? data.signs || [] : []).slice(0, 6).map((s, i) => ({ s, t: sceneSignText(s.text), i })).filter(x => x.t.ok).map(({ s, t, i }) => ({ layer: li(s.layer), x: s.x, y: s.y, w: s.w, h: s.h, text: t.text, bars: (s.bars || []).slice(0, 6), style: ['board', 'fascia', 'totem'].includes(s.style) ? s.style : 'board', ink: s.ink || '#1d2226', board: s.board || '#f4f1e8', seed: i }));
  // v2: data.ground may be { relief, fills }; the surfaces' and ridges' fills come first, then any pixel fills; v2 water regions after any pixel water
  const groundIn = G ? (Array.isArray(data.ground) ? data.ground : (data.ground && Array.isArray(data.ground.fills) ? data.ground.fills : [])) : (data.ground || []);
  const ground = (G ? G.ground : []).concat(groundIn.map(g => ({ layer: li(g.layer), d: g.d, fill: pal(g.fill) })));
  const water = (G ? (data.water || []).filter(w => w && w.d != null) : (data.water || [])).map(w => ({ layer: li(w.layer), d: w.d, y0: w.y0, y1: w.y1, base: (w.base || ['#7fb0c0', '#3f7e96', '#1d4c64']).map(c => pal(c)), reflect: !!w.reflect, shimmer: w.shimmer || 0, lightPath: !!w.lightPath })).concat(G ? G.water : []);
  const sky = data.sky === false ? null : Object.assign({ stars: 180, sunR: 26, moonR: 20 }, data.sky || {}, { clouds: Object.assign({ n: 4, y: [60, 320], speed: 6 }, (data.sky && data.sky.clouds) || {}) });
  if (sky) { sky.clouds = { n: Math.min(10, sky.clouds.n), y0: sky.clouds.y[0], y1: sky.clouds.y[1], speed: sky.clouds.speed }; }
  const pk = data.particles === 'none' ? 'none' : data.particles && typeof data.particles === 'object' ? data.particles.kind : { spring: 'petals', summer: 'motes', autumn: 'leaves', winter: 'snow' }[season];
  const animatedParts = items.reduce((n, it) => n + it.anim.reduce((m, a) => m + (a.parts ? a.parts.length : 1), 0), 0);
  const actorParts = actors.reduce((n, a) => n + 1 + a.anim.length, 0), flockBirds = flocks.reduce((n, f) => n + f.n, 0);
  const objects = {}, categories = {};
  for (const it of items) { objects[it.o] = (objects[it.o] || 0) + 1; const c = (sceneObj(it.o).category || 'prop'); categories[c] = (categories[c] || 0) + 1; }
  const used = new Set([...items.map(i => i.layer), ...ground.map(g => g.layer), ...water.map(w => w.layer)]);
  const C = { v: 1, id: data.id, w: SCENE_W, h: SCENE_H, season, lod, setting: data.setting || 'natural', arch: data.arch || null,
    view: Object.assign({ heading: 180, fov: 80, horizon: 560, lift: 1 }, data.view), sky, layers, ground, water, items, strips, actors, flocks, signs,
    particles: { kind: pk || 'none', n: !pk || pk === 'none' ? 0 : Math.min(250, (data.particles && data.particles.n) || 60) }, weather: data.weather === 'none' ? 'none' : 'live',
    camera: Object.assign({ pan: 0, period: 90 }, data.camera || {}),
    stats: { placements: items.length, staticItems: items.filter(i => !i.anim.length && i.strip < 0).length, animatedParts, stripItems: items.filter(i => i.strip >= 0).length, strips: strips.length,
      actors: actors.length, flockBirds, signs: signs.length, animatedDraws: animatedParts + strips.length + actorParts + flockBirds, objects, categories, layersUsed: used.size,
      distinctSprites: new Set(items.map(i => [i.o, i.v, i.season, i.haze, i.tint ? i.tint[1] : 0, sceneScaleBucket(i.s)].join('|'))).size, dataBytes: _scDataBytes(data) } };
  if (G && typeof sceneCompileV2Finish === 'function') sceneCompileV2Finish(G, C);   // flows, atmosphere, weather, lights, draw order, stats.v2
  // v1 opt-in effects (V2 14.2): fx { shadows, water, atmos, weather: 2 } rides on the compiled scene for the render passes (only when set)
  if (data.fx && typeof data.fx === 'object') { const fx = {}; for (const k of ['shadows', 'water', 'atmos', 'weather']) if (data.fx[k] === 2) fx[k] = 2; if (Object.keys(fx).length) C.fx = fx; }
  if (!m) { m = new Map(); _scCompiled.set(data, m); }
  m.set(memoKey, C);
  return C;
}
/** The data size the lint budgets (3, 10.2): an archetype scene counts its params and patch, not its expansion. */
function _scDataBytes(data) {
  if (data && data.arch && data.arch.params) return JSON.stringify({ params: data.arch.params, patch: data.arch.patch || {} }).length;
  try { return JSON.stringify(data).length; } catch (e) { return 0; }
}
const _scDataMemo = new WeakMap();
/** The scene data of an item, a thunk or a data object: a thunk is evaluated once and cached. */
function sceneData(x) {
  const s = x && typeof x === 'object' && x.scene !== undefined && !x.layers && !x.place && !x.view ? x.scene : x;
  if (typeof s !== 'function') return s;
  if (!_scDataMemo.has(s)) _scDataMemo.set(s, s());
  return _scDataMemo.get(s);
}

/* ---------- registry items (3) ---------- */
/** A registry item for a composed scene. data is the scene or a thunk () => data (built only when shown or linted). */
function sceneItem(meta, data) {
  const d0 = typeof data === 'function' ? null : data;
  const item = Object.assign({}, meta, { slot: meta.slot || 'opening', full: true, rich: true, composed: true, scene: data,
    season: 'any', theme: meta.theme || 'any', intensity: meta.intensity || 'standard', reduced: 'static' });
  delete item.lat; delete item.lon;
  if (d0 && d0.view) item.liveSky = { lat: d0.view.lat, lon: d0.view.lon };
  else if (meta.liveSky) item.liveSky = meta.liveSky;
  else if (Number.isFinite(meta.lat) && Number.isFinite(meta.lon)) item.liveSky = { lat: meta.lat, lon: meta.lon };
  else item.liveSky = true;
  // a still with no clock (Node, gallery sheets, tiles) draws the item's own season when it has one (ukSeason / sceneSeason:
  // the seasonal items of one auto-season view), so its four items are four pictures; a live sky or o.season decides otherwise
  item.svg = (o) => {
    const own = item.sceneSeason || item.ukSeason;
    return sceneSvg(item, own && !(o && (o.season || (o.sky && Number.isFinite(o.sky.ms)))) ? Object.assign({}, o, { season: own }) : o);
  };
  return item;
}
const _scPacks = Object.create(null);
/** A scene file registers its scene: sceneAdd('<pack>', meta, data). The pack file lists them with sceneItems('<pack>'). */
function sceneAdd(pack, meta, data) { (_scPacks[pack] = _scPacks[pack] || []).push(sceneItem(meta, data)); }
/**
 * The items of a pack. A recipe item (item.recipe, V2 14.3) wins over a v1 item with the same id and takes its place in the
 * list (pins, favourites and rotation keep the id); two items of one kind keep both, as before. A pack with no recipe: as v1.
 */
function sceneItems(pack) {
  const list = _scPacks[pack] || [];
  if (!list.some(it => it && it.recipe)) return list.slice();
  const out = [], at = new Map();
  for (const it of list) {
    const k = at.get(it.id);
    if (k == null) { at.set(it.id, out.length); out.push(it); continue; }
    if (it.recipe && !out[k].recipe) out[k] = it;
    else if (!it.recipe && out[k].recipe) continue;
    else out.push(it);
  }
  return out;
}
/** The superseded pairs (V2 14.3, information, not an error): [{ pack, id, kind: 'superseded', by: 'recipe' }]. */
function sceneItemDups() {
  const out = [];
  for (const pack of Object.keys(_scPacks)) {
    const byId = new Map();
    for (const it of _scPacks[pack]) { const e = byId.get(it.id) || { r: 0, v: 0 }; if (it.recipe) e.r++; else e.v++; byId.set(it.id, e); }
    for (const [id, e] of byId) if (e.r && e.v) out.push({ pack, id, kind: 'superseded', by: 'recipe' });
  }
  return out;
}

/* ---------- archetypes, kits, tables, lines (2.7, 8) ---------- */
const _scArch = Object.create(null), _scTables = Object.create(null), _scLines = Object.create(null);
function sceneArchetypeDefine(id, a) {
  if (!/^[a-z0-9-]{1,40}$/.test(id || '')) throw new Error('sceneArchetypeDefine: bad id ' + id);
  if (!a || typeof a.build !== 'function') throw new Error('sceneArchetypeDefine ' + id + ': build(params, u) is required');
  _scArch[id] = Object.assign({ id, params: {}, kits: [], slots: [] }, a, { id });
  _scFromArchMemo.delete(id);
  return _scArch[id];
}
function sceneArchetype(id) { return _scArch[id] || null; }
function sceneArchetypes() { return Object.values(_scArch); }
/** A params row coerced to the archetype's types (lists split on |, numbers parsed, enums checked) plus its problems. */
function _scParams(a, row) {
  const out = Object.assign({}, row), problems = [];
  for (const [k, t] of Object.entries(a.params || {})) {
    let v = out[k];
    if (t === 'list') { if (v == null || v === '') v = []; else if (typeof v === 'string') v = v.split('|').map(s => s.trim()).filter(Boolean); else if (!Array.isArray(v)) { problems.push(k + ': a list'); v = []; } }
    else if (t === 'number') { if (v != null && v !== '') { const n = Number(v); if (!Number.isFinite(n)) problems.push(k + ': not a number (' + v + ')'); else v = n; } }
    else if (t === 'id') { if (v != null && !/^[a-z0-9-]{1,40}$/.test(String(v))) problems.push(k + ': an id is /^[a-z0-9-]{1,40}$/ (' + v + ')'); }
    else if (t === 'sign') { if (v != null) { const s = sceneSignText(v); if (!s.ok) problems.push(k + ': ' + s.problem); else v = s.text; } }
    else if (Array.isArray(t)) { if (v != null && !t.includes(v)) { problems.push(k + ': unknown value ' + v + ' (' + t.join(' ') + ')'); v = t[0]; } }
    out[k] = v;
  }
  return { params: out, problems };
}
/** The problems of one table row (or params object) for an archetype: unknown enum values, bad ids, sign text, numbers. */
function sceneArchetypeCheck(id, row) {
  const a = sceneArchetype(id);
  if (!a) return ['no archetype ' + id];
  return _scParams(a, row || {}).problems;
}
const _scKitPickMemo = new Map();
/**
 * { objectId: weight } of every object with one of the kit:<k> tags, the role:<role> tag and every tag in o.tags (not o.exclude),
 * keyed in id order (never registration order: library files load by file name). weight defaults to 1; weight 0 excludes. Empty-safe.
 */
function sceneKitPick(kits, role, o) {
  o = o || {};
  const ks = (Array.isArray(kits) ? kits : kits ? [kits] : []).slice().sort(), tags = (o.tags || []).slice().sort(), ex = o.exclude || [];
  const key = ks.join(',') + '|' + role + '|' + tags.join(',') + '|' + (Array.isArray(ex) ? ex.slice().sort().join(',') : ex);
  if (_scKitPickMemo.has(key)) return Object.assign({}, _scKitPickMemo.get(key));
  const out = {};
  for (const d of [..._scObjs.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const t = d.tags || [], w = d.weight == null ? 1 : d.weight;
    if (!(w > 0) || !t.includes('role:' + role) || !ks.some(k => t.includes('kit:' + k)) || !tags.every(x => t.includes(x))) continue;
    if ((Array.isArray(ex) ? ex : [ex]).some(x => x === d.id || t.includes(x))) continue;
    out[d.id] = w;
  }
  _scKitPickMemo.set(key, out);
  return Object.assign({}, out);
}
/**
 * The ids of w ({ id: weight }) best first for a slot key (8.6): a weighted rendezvous hash of (key, id), so the order is a
 * function of the SET of ids, their weights and the key only, never of the order of w's keys. A new id moves a slot only
 * when it ranks above the current holder; a light weight (0.3) makes a heavy object rare; weight 0 never ranks.
 * prefer (a scene's own picks, params.picks[slot]): those of its ids that are in w come first, in its order; the rest follow
 * by the hash, so a preferred id that leaves the library or the kit falls back to the hash order.
 */
function sceneSlotRank(w, key, prefer) {
  const mix = h => { h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); return (h ^ (h >>> 16)) >>> 0; };
  const first = (Array.isArray(prefer) ? prefer : prefer ? [prefer] : []).filter((id, i, a) => w && w[id] > 0 && a.indexOf(id) === i);
  return first.concat(Object.keys(w || {}).filter(id => w[id] > 0 && !first.includes(id))
    .map(id => [id, Math.log((mix(sceneHash(key + '|' + id)) + 0.5) / 4294967296) / w[id]])
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(x => x[0]));
}
/** The one id of w that holds the slot key (sceneSlotRank's first), or null. */
function sceneSlotPick(w, key) { return sceneSlotRank(w, key)[0] || null; }
/**
 * The archetype helper u (8.1): seeded from the params' id. The scene's own picks come from its patch (own = { picks, mix },
 * 8.6), never from the params row (a row stays small). u.slot(w, name): w's ids ranked for the slot name, own.picks[name]
 * first; u.picks: own.picks; u.mix(role, w): own.mix[role] ({ id: weight } in the scene's order) cut to the ids w allows, or
 * w itself when it names none of them.
 */
function _scU(a, p, own) {
  const r = sceneRnd(sceneHash(String(p.id || a.id)));
  const kits = (p.kits && p.kits.length ? p.kits : a.kits) || [];
  const picks = (own && own.picks) || {}, mixes = (own && own.mix) || {};
  const mix = (role, w) => {
    const m = mixes[role], out = {};
    if (m) for (const id of Object.keys(m)) if (w[id] > 0 && m[id] > 0) out[id] = m[id];
    return Object.keys(out).length ? out : w;
  };
  return { hash: sceneHash, rnd: r, pick: arr => arr[Math.floor(r() * arr.length) % arr.length], line: sceneLine,
    has: f => (Array.isArray(p.features) ? p.features : []).includes(f), kit: (role, tags) => sceneKitPick(kits, role, { tags }), kits,
    slot: (w, name) => sceneSlotRank(w, String(p.id) + '|' + name, picks[name]), picks, mix };
}
const _scFromArchMemo = new Map();
const _scWarned = new Set();
/**
 * One scene from an archetype plus its own touches (8.1): build(params, u), arch = {id, params}; the patch APPENDS
 * place / scatter / actors / flocks / signs / ground / water, drop {place: [objId | index], scatter: [index], actors: [index]}
 * removes archetype entries first, view merges shallowly, picks / mix are the scene's own picks (8.6, read by the build), any
 * other key REPLACES. Validated (thrown in Node, logged once
 * in the browser). Memoised per (archId, params object, patch object).
 */
function sceneFromArchetype(archId, params, patch) {
  const a = sceneArchetype(archId);
  if (!a) throw new Error('sceneFromArchetype: no archetype ' + archId);
  params = params || {}; patch = patch || {};
  let byParams = _scFromArchMemo.get(archId);
  if (!byParams) { byParams = new WeakMap(); _scFromArchMemo.set(archId, byParams); }
  let byPatch = byParams.get(params);
  if (byPatch && byPatch.has(patch)) return byPatch.get(patch);
  const P = _scParams(a, params).params;
  const data = a.build(P, _scU(a, P, patch)) || {};
  data.arch = { id: archId, params, patch: Object.keys(patch).length ? patch : undefined };
  if (!data.arch.patch) delete data.arch.patch;
  const drop = patch.drop || {};
  if (drop.place && data.place) data.place = data.place.filter((e, i) => !drop.place.some(d => d === i || d === e.obj));
  if (drop.scatter && data.scatter) data.scatter = data.scatter.filter((e, i) => !drop.scatter.includes(i));
  if (drop.actors && data.actors) data.actors = data.actors.filter((e, i) => !drop.actors.includes(i));
  for (const k of ['place', 'scatter', 'actors', 'flocks', 'signs', 'ground', 'water']) if (patch[k] && patch[k].length) data[k] = (data[k] || []).concat(patch[k]);
  if (patch.view) data.view = Object.assign({}, data.view, patch.view);
  for (const [k, v] of Object.entries(patch)) if (!['place', 'scatter', 'actors', 'flocks', 'signs', 'ground', 'water', 'view', 'drop', 'picks', 'mix'].includes(k)) data[k] = v;
  if (!data.id) data.id = String(P.id || archId);
  const problems = sceneValidate(data);
  if (problems.length) {
    const msg = 'sceneFromArchetype ' + archId + ' (' + (P.id || '') + '): ' + problems.join('; ');
    if (_SC_IS_NODE) throw new Error(msg);
    if (!_scWarned.has(msg)) { _scWarned.add(msg); try { console.warn(msg); } catch (e) { /* no console */ } }
  }
  if (!byPatch) { byPatch = new WeakMap(); byParams.set(params, byPatch); }
  byPatch.set(patch, data);
  return data;
}
/** A data table: { cols: [...], rows: [[...], ...] } (8.2). */
function sceneTableDefine(id, t) {
  if (!t || !Array.isArray(t.cols) || !Array.isArray(t.rows)) throw new Error('sceneTableDefine ' + id + ': { cols, rows } required');
  _scTables[id] = t;
  return t;
}
/** The rows as objects; a column whose cells hold '|' anywhere is a list column (split in every row). */
function sceneTable(id) {
  const t = _scTables[id];
  if (!t) return null;
  const listCols = new Set(t.cols.filter((c, i) => (t.lists || []).includes(c) || t.rows.some(r => typeof r[i] === 'string' && r[i].includes('|'))));
  return t.rows.map(r => Object.fromEntries(t.cols.map((c, i) => [c, listCols.has(c) && typeof r[i] === 'string' ? r[i].split('|').filter(Boolean) : r[i]])));
}
function sceneTables() { return Object.keys(_scTables); }
/** One registry item per table row; scene is a THUNK, so rows cost nothing until shown or linted (8.2). */
function sceneBatch(archId, tableId, o) {
  o = o || {};
  const a = sceneArchetype(archId);
  if (!a) throw new Error('sceneBatch: no archetype ' + archId);
  const rows = sceneTable(tableId) || [];
  return rows.filter(o.filter || (() => true)).map(row => {
    const P = _scParams(a, row).params;
    const meta = Object.assign({}, a.meta ? a.meta(P) : { id: String(P.id), label: String(P.name || P.id), site: String(P.name || P.id), tags: [], mood: 'calm', colour: 'blue' }, o.extra || {});
    if (o.when) meta.when = o.when;
    meta.tags = (meta.tags || []).slice();
    if (Number.isFinite(P.lat) && Number.isFinite(P.lon)) meta.liveSky = { lat: P.lat, lon: P.lon };
    return sceneItem(meta, () => sceneFromArchetype(archId, row, {}));
  });
}
function sceneLinesDefine(map) { Object.assign(_scLines, map || {}); }
function sceneLine(id) { return _scLines[id] || null; }
