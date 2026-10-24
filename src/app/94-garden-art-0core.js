/* ============================================================
   GARDEN ART, the core (2.18, agent 'garden-art'). User request (24 Oct 2026):
   "make the garden feature way way better with far more things ... more plants,
   more everything". The catalogue (94-garden-0catalog.js, agent 'garden-engine',
   docs/dev/GARDEN.md section 2) says WHAT exists and the art contract; these
   files say how each thing LOOKS.

     gardenArt(id, o) -> an SVG fragment ('<g>…</g>'), or '' (the engine then draws its placeholder)
       o {kind: 'plant'|'decor'|'visitor'|'tile'|'crop'|'seed'|'tool'|'bouquet', stage 0..4,
          season, variant 0..7, size 's'|'m'|'l', t 0..1, tod 'dawn'|'day'|'dusk'|'night', r 0..3,
          thirsty, overgrown, ripe, silhouette, uid}
       (0, 0) is the ground anchor at the bottom centre of the footprint; 64 units = one cell; plants grow
       up to about -64 * look.h. Explicit colours only, no references, no text: the photo mode paints the
       garden onto a canvas. Deterministic: the same inputs give the same string.

   PURE: tables and functions only, nothing drawn at load, no DOM. Node can load these files.

   THE LOOK. The scene library's flat style (70-scene-lib-*.js): light from the LEFT, three or four tones
   per colour (deep, base, light, glint) worked out from the catalogue's own colours (look.c, look.c2,
   look.leaf, look.v[variant]), hand-shaped silhouettes per form and per plant, seeded variety (the id,
   the variant and the instance phase t) so a bed of one plant never looks cloned.

   LIGHT. Shapes of one tone are merged into ONE path (a whole plant's leaves are three paths), no
   gradients, and motion is a class on one or two <g>s (the engine's gda-* classes, plus a few of this
   agent's gart-* idles for visitors in 94-garden-art.css): a garden of 250 plants stays fast.

   Other agents (all optional, guarded): gartIds(kind) every id with art, gartHas(kind, id),
   gartWeather(kind, o) and gartLighting(tod, o), the overlays over a whole garden (94-garden-art-e-sky.js;
   the renderer asks for them through two guarded hooks), window.GardenArt {art, ids, has, weather, lighting}.

   FILES. 0core (this: helpers, palette, registry, the contract), 1kit (the plant kit), 2flowers / 3flowers /
   5flowers / 6wild (flowers, wildflowers, herbs), 4trees, 7veg (veg and fruit), 8more (succulents, the pond,
   exotics), 9ground (tiles and paths), a-decor / b-decor (decorations), c-visitors, d-items (crops, seed packets,
   tools, bouquets), e-sky (weather and light); motion extras in src/styles/94-garden-art.css.
   ============================================================ */
const GART = (function () {
  const f1 = v => Math.round(v * 10) / 10;
  const D = Math.PI / 180;
  /* ---------- seeded randomness: the same id + variant + t always draws the same thing ---------- */
  function hash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    let a = (typeof seed === 'number' ? seed : hash(seed)) >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const rr = (r, a, b) => a + r() * (b - a);
  const pick = (r, list) => list[Math.floor(r() * list.length) % list.length];
  /* ---------- colour ---------- */
  const HEX = /^#[0-9a-f]{6}$/i;
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const toHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
  const dk = (c, k) => mix(c, '#1a1410', k == null ? 0.25 : k);
  const lt = (c, k) => mix(c, '#fffbea', k == null ? 0.25 : k);
  function hsl(c) {
    const [R, G, B] = hx(c).map(v => v / 255), mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4;
    return [h * 60, s, l];
  }
  function fromHsl(h, s, l) {
    h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return toHex([f(h / 360 + 1 / 3) * 255, f(h / 360) * 255, f(h / 360 - 1 / 3) * 255]);
  }
  /** Shift a colour: hue degrees, saturation x, lightness + (in 0..1). */
  const shift = (c, dh, sk, dl) => { const [h, s, l] = hsl(c); return fromHsl(h + (dh || 0), s * (sk == null ? 1 : sk), l + (dl || 0)); };
  /**
   * A petal or fruit colour as [deep, base, light]: the shade leans cooler and richer, the light warmer and
   * paler, the way the scene people's cloth is toned (light from the upper left). Whites keep a cool lilac
   * shade so a white flower still reads on a pale lawn; near-blacks get a lift.
   */
  function tone3(c) {
    if (!HEX.test(String(c))) c = '#c8507a';
    const [h, s, l] = hsl(c);
    const towards = (h > 40 && h < 200) ? -12 : 10;
    const deep = l > 0.88 ? fromHsl(s < 0.15 ? 250 : h, Math.max(0.12, s * 0.6), 0.74) : fromHsl(h + towards, Math.min(1, s * 1.08 + 0.04), l * 0.7);
    const light = l < 0.22 ? fromHsl(h, s * 0.8, l + 0.2) : fromHsl(h - towards * 0.5, s * 0.92, l + (1 - l) * 0.42);
    return [deep, c, light];
  }
  /** A leaf colour as four tones [deep, base, light, pale] (light from the left: yellower, paler). */
  function leaf4(c) {
    if (!HEX.test(String(c))) c = '#4f8a3a';
    const [h, s, l] = hsl(c);
    return [fromHsl(h + 8, Math.min(1, s * 1.05), l * 0.62), c, fromHsl(h - 8, s * 0.95, l + 0.1), fromHsl(h - 16, s * 0.85, l + 0.24)];
  }
  /* ---------- geometry: angles are radians from straight UP, clockwise (a > 0 leans right) ---------- */
  const at = (x, y, a, L) => [x + Math.sin(a) * L, y - Math.cos(a) * L];
  const circ = (x, y, r) => `M${f1(x - r)} ${f1(y)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const rrect = (x, y, w, h, q) => { q = Math.min(q, w / 2, h / 2); return `M${f1(x + q)} ${f1(y)}h${f1(w - 2 * q)}q${f1(q)} 0 ${f1(q)} ${f1(q)}v${f1(h - 2 * q)}q0 ${f1(q)} ${f1(-q)} ${f1(q)}h${f1(-(w - 2 * q))}q${f1(-q)} 0 ${f1(-q)} ${f1(-q)}v${f1(-(h - 2 * q))}q0 ${f1(-q)} ${f1(q)} ${f1(-q)}z`; };
  const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  const line = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
  /** A pointed leaf from (x, y) along a, length L, half-width W; bulge 0.3..0.8 moves the widest point. */
  function leaf(x, y, a, L, W, bulge) {
    const b = bulge == null ? 0.42 : bulge, [tx, ty] = at(x, y, a, L), [mx, my] = at(x, y, a, L * b), nx = Math.cos(a) * W, ny = Math.sin(a) * W;
    return `M${f1(x)} ${f1(y)}Q${f1(mx + nx * 2)} ${f1(my + ny * 2)} ${f1(tx)} ${f1(ty)}Q${f1(mx - nx * 2)} ${f1(my - ny * 2)} ${f1(x)} ${f1(y)}z`;
  }
  /** One half of a leaf (side +1 right of the midrib, -1 left): the light or the shade on a leaf. */
  function halfLeaf(x, y, a, L, W, side, bulge) {
    const b = bulge == null ? 0.42 : bulge, [tx, ty] = at(x, y, a, L), [mx, my] = at(x, y, a, L * b), nx = Math.cos(a) * W * side, ny = Math.sin(a) * W * side;
    return `M${f1(x)} ${f1(y)}Q${f1(mx + nx * 2)} ${f1(my + ny * 2)} ${f1(tx)} ${f1(ty)}z`;
  }
  /** A rounded petal (widest near the tip, a soft round end) from (x, y) along a. */
  function petal(x, y, a, L, W) {
    const [tx, ty] = at(x, y, a, L), [m1x, m1y] = at(x, y, a, L * 0.55), nx = Math.cos(a), ny = Math.sin(a), [ex, ey] = at(x, y, a, L * 1.12);
    return `M${f1(x)} ${f1(y)}C${f1(m1x + nx * W * 1.3)} ${f1(m1y + ny * W * 1.3)} ${f1(tx + nx * W)} ${f1(ty + ny * W)} ${f1(ex)} ${f1(ey)}C${f1(tx - nx * W)} ${f1(ty - ny * W)} ${f1(m1x - nx * W * 1.3)} ${f1(m1y - ny * W * 1.3)} ${f1(x)} ${f1(y)}z`;
  }
  /** A stem from (x, y) along a, length L, bending by `bend` (units sideways at the middle). */
  function stem(x, y, a, L, bend) {
    const [ex, ey] = at(x, y, a, L), [mx, my] = at(x, y, a, L * 0.5), cx = mx + Math.cos(a) * (bend || 0), cy = my + Math.sin(a) * (bend || 0);
    const pt = t => { const u = 1 - t; return [u * u * x + 2 * u * t * cx + t * t * ex, u * u * y + 2 * u * t * cy + t * t * ey]; };
    return { d: `M${f1(x)} ${f1(y)}Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)}`, tip: [ex, ey], pt, ang: t => { const p = pt(Math.max(0, t - 0.02)), q = pt(Math.min(1, t + 0.02)); return Math.atan2(q[0] - p[0], p[1] - q[1]); } };
  }
  /** A lobed outline round an ellipse: n bumps, ragged 0..1 (crowns, bushes, clouds). */
  function blob(r, cx, cy, rx, ry, n, ragged) {
    n = Math.max(5, n | 0); ragged = ragged == null ? 0.25 : ragged;
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3, k = 1 - ragged * 0.5 + r() * ragged * 0.5; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = mx - cx, oy = my - cy, l = Math.hypot(ox, oy) || 1, bulge = (0.3 + r() * 0.22) * Math.hypot(q[0] - p[0], q[1] - p[1]);
      d += `Q${f1(mx + ox / l * bulge)} ${f1(my + oy / l * bulge)} ${f1(q[0])} ${f1(q[1])}`;
    }
    return d + 'z';
  }
  function star(x, y, n, r1, r2, rot) {
    const pts = [];
    for (let i = 0; i < n * 2; i++) { const a = (rot || 0) + i * Math.PI / n, R = i % 2 ? r2 : r1; pts.push([x + Math.sin(a) * R, y - Math.cos(a) * R]); }
    return poly(pts);
  }
  function twigs(r, starts, depth, spread) {
    spread = spread == null ? 0.5 : spread;
    let d = '';
    const grow = (x, y, a, len, k) => {
      const [x2, y2] = at(x, y, a, len);
      d += `M${f1(x)} ${f1(y)}L${f1(x2)} ${f1(y2)}`;
      if (k <= 0 || len < 1.6) return;
      grow(x2, y2, a - spread * (0.45 + r() * 0.6), len * (0.6 + r() * 0.18), k - 1);
      grow(x2, y2, a + spread * (0.45 + r() * 0.6), len * (0.6 + r() * 0.18), k - 1);
    };
    for (const s of starts) grow(s[0], s[1], s[2], s[3], depth);
    return d;
  }
  function limb(x, y, a, L, w0, w1, bend) {
    const s = stem(x, y, a, L, bend || 0), N = 6, left = [], right = [];
    for (let i = 0; i <= N; i++) { const t = i / N, p = s.pt(t), g = s.ang(t), w = (w0 + (w1 - w0) * t) / 2; left.push([p[0] - Math.cos(g) * w, p[1] - Math.sin(g) * w]); right.push([p[0] + Math.cos(g) * w, p[1] + Math.sin(g) * w]); }
    return { d: poly(left.concat(right.reverse())), tip: s.tip, pt: s.pt, ang: s.ang };
  }
  /* ---------- markup: few nodes; attributes only ---------- */
  const op = o => (o != null && o < 1 ? ` opacity="${f1(o * 100) / 100}"` : '');
  const P = (fill, d, o) => (d ? `<path fill="${fill}"${op(o)} d="${d}"/>` : '');
  const S = (stroke, w, d, o, cap) => (d ? `<path fill="none" stroke="${stroke}" stroke-width="${f1(w)}" stroke-linecap="${cap || 'round'}" stroke-linejoin="round"${op(o)} d="${d}"/>` : '');
  const G = (cls, inner, style, tf) => (!inner ? '' : (!cls && !style && !tf) ? inner : `<g${cls ? ` class="${cls}"` : ''}${tf ? ` transform="${tf}"` : ''}${style ? ` style="${style}"` : ''}>${inner}</g>`);
  /** A negative animation delay from the seed, so a bed never moves in step. */
  const T = (r, d0, d1) => `animation-delay:-${f1(rr(r, d0 == null ? 0 : d0, d1 == null ? 4 : d1))}s`;
  /** A contact shadow: one flat, faint ellipse. */
  const shadow = (rx, ry, o) => `<ellipse cx="0" cy="0" rx="${f1(rx)}" ry="${f1(ry || rx * 0.22)}" fill="#2a2418"${op(0.16 * (o == null ? 1 : o))}/>`;
  return Object.freeze({ f1, D, hash, rng, rr, pick, hx, mix, dk, lt, hsl, fromHsl, shift, tone3, leaf4, at, circ, ell, rect, rrect, poly, line, leaf, halfLeaf, petal, stem, blob, star, twigs, limb, P, S, G, T, shadow, op, HEX });
})();

/* ---------- the palette: the scene library's colours (70-scene-lib-plants.js, -trees, -birds) ---------- */
const GART_PAL = Object.freeze({
  leaf: Object.freeze({
    spring: ['#3f6f2e', '#5f9a3a', '#8fc451', '#c6e27f'],
    summer: ['#2f5a2a', '#4a7f34', '#70a443', '#a8cc66'],
    autumn: ['#7a4a1c', '#b8702a', '#e0a040', '#f2cf6e'],
    winter: ['#3e4a3a', '#5a6a50', '#7f8c6c', '#b6bea2'],
  }),
  evergreen: ['#1f3f2c', '#2f5a3a', '#4a7a4a', '#7aa070'],
  silver: ['#5a6e62', '#7f968a', '#a8bcae', '#d2ded4'],
  succulent: ['#3a6a5a', '#5a9080', '#86b8a4', '#c4e0d0'],
  stem: '#4f7a35', stemDry: '#9a8a5a', straw: '#c8b47a',
  bark: ['#4a3324', '#6a4a32', '#8b6440', '#b08a60'],
  soil: ['#4a3324', '#6b4a32', '#8a6242', '#a8805a'],
  stone: ['#5e5e5a', '#8a8a84', '#aeaca4', '#d2d0c8'],
  wood: ['#5a3a22', '#8a5a34', '#b07c4c', '#d2a46e'],
  water: ['#2f6a98', '#4f8fc0', '#7cb6dc', '#c4e4f4'],
  metal: ['#2a2e32', '#4a5056', '#7a8288', '#b8c0c6'],
  terracotta: ['#8a3e22', '#b85a32', '#d8804e', '#f0aa7a'],
  snow: '#f6f8fb', frost: '#e2ecf2', snowShade: '#c8d6e2',
  glow: '#ffe7a0', glowHot: '#fff6d8',
  fl: Object.freeze({
    red: ['#a82a24', '#e2443a', '#f27a62'], scarlet: ['#b02418', '#ec3a22', '#ff7a52'], pink: ['#b83a78', '#e86aa6', '#f6a8cc'],
    rose: ['#9a2440', '#d6406a', '#ee7a98'], blush: ['#d68a9a', '#f4bcc6', '#fde2e6'], coral: ['#d0584a', '#f4846c', '#fbb49c'],
    orange: ['#c8601a', '#f28a2a', '#fbb45a'], apricot: ['#e08a40', '#f6b070', '#fcd4a4'], yellow: ['#d49a10', '#f2c21e', '#fbe070'],
    lemon: ['#d8c030', '#f6e45a', '#fcf2a4'], cream: ['#d8c8a0', '#f4e8c8', '#fffaea'], white: ['#c8c4bc', '#f6f4ee', '#ffffff'],
    lilac: ['#8a6ab8', '#b498dc', '#d8c8f0'], violet: ['#5a3a9a', '#8a5ac8', '#b48ae6'], purple: ['#4a2a6a', '#7a3a9a', '#a868c4'],
    blue: ['#2f4fa8', '#4f7ad8', '#86a8ee'], sky: ['#4a86c0', '#7ab4e4', '#b4d8f4'], indigo: ['#2a2a7a', '#4a4ab0', '#7a7ad8'],
    magenta: ['#8a1a5a', '#c83a8a', '#e478b4'], wine: ['#5a1428', '#8a2440', '#b4506a'], peach: ['#e09a7a', '#f8c4a4', '#fde4d0'],
  }),
});

/* ---------- the registry: art keyed 'kind:id' (or 'form:<form>' for plants drawn by their form) ---------- */
const _GART_DEF = Object.create(null);
/**
 * (the art files) Define art. key: 'plant:<id>' | 'form:<form>' | 'decor:<id>' | 'visitor:<id>' | 'tile:<id>' |
 * 'crop:<id>' | 'cropform:<form>' | 'seed' | 'tool:<id>' | 'bouquet:<id>'. def {box: [w, h] in the drawing's own
 * units (sprites: the foot at 0, 0), stages, draw(o, r, A) -> markup, fit}. Plants are scaled so their box is
 * look.h cells tall (and no wider than the footprint); everything else is drawn in art units (64 = one cell)
 * unless fit is 'unit' (scaled into one cell).
 */
function gartDefine(key, def) {
  if (!key || !def || typeof def.draw !== 'function') return;
  _GART_DEF[key] = Object.freeze(Object.assign({ box: [40, 56], stages: 5 }, def, { key }));
}
function _gartCat(kind, id) {
  try {
    if (kind === 'plant' || kind === 'crop' || kind === 'seed') return typeof gardenPlant === 'function' ? gardenPlant(id) : null;
    if (kind === 'decor') return typeof gardenDecor === 'function' ? gardenDecor(id) : null;
    if (kind === 'visitor') return typeof gardenVisitor === 'function' ? gardenVisitor(id) : null;
    if (kind === 'tile') return typeof gardenTile === 'function' ? gardenTile(id) : null;
    if (kind === 'tool') return typeof gardenTool === 'function' ? gardenTool(id) : null;
  } catch (e) { /* no catalogue */ }
  return null;
}
/** The art definition for a kind and id: the id's own drawing first, then its form's. */
function _gartFind(kind, id, cat) {
  const k = kind || 'plant';
  if (k === 'seed') return _GART_DEF['seed'] || null;
  if (_GART_DEF[k + ':' + id]) return _GART_DEF[k + ':' + id];
  if (k === 'plant' && cat && cat.look && _GART_DEF['form:' + cat.look.form]) return _GART_DEF['form:' + cat.look.form];
  if (k === 'crop') return (cat && cat.look && _GART_DEF['cropform:' + cat.look.form]) || _GART_DEF['crop:_any'] || null;
  return null;
}
function gartHas(kind, id) { return !!_gartFind(kind, id, _gartCat(kind, id)); }
function gartIds(kind) {
  const out = new Set();
  for (const key of Object.keys(_GART_DEF)) { const [k, id] = key.split(':'); if (id && (!kind || k === kind) && id[0] !== '_') out.add(kind ? id : key); }
  return Array.from(out).sort();
}

/* ---------- options ---------- */
const _GART_SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const _GART_TODS = ['dawn', 'day', 'dusk', 'night'];
function _gartSeasonNow() { const m = (new Date()).getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter'; }
/** The leaf palette of a catalogue leaf colour in a season. kind: 'perennial' | 'deciduous' | 'evergreen' | 'succulent'. */
function gartLeafSeason(c, season, kind, autumnCol) {
  const L = GART.leaf4(c || '#4f8a3a');
  if (season === 'spring') return L.map((x, i) => GART.shift(x, -6, 1.05, i === 0 ? 0.02 : 0.04));
  if (season === 'summer' || kind === 'succulent') return L;
  if (season === 'autumn') {
    if (kind === 'evergreen') return L.map(x => GART.shift(x, 4, 0.9, -0.02));
    if (kind === 'deciduous') { const A4 = GART.leaf4(autumnCol || '#c8782a'); return A4.map((x, i) => GART.mix(x, L[i], 0.12)); }
    return L.map((x, i) => GART.mix(x, ['#5a4a1e', '#9a8a34', '#c8b04a', '#e8d488'][i], 0.32));
  }
  // winter: evergreens darken and cool; perennials rest, dulled towards grey-olive (never brown, never dead)
  if (kind === 'evergreen') return L.map(x => GART.shift(x, 6, 0.85, -0.04));
  if (kind === 'deciduous') return ['#4a3a2a', '#6a5440', '#8a7058', '#b09a80'];
  return L.map((x, i) => GART.mix(x, ['#3a4038', '#5e665a', '#848c7c', '#b0b6a6'][i], 0.42));
}
function _gartOpts(def, o, cat, kind) {
  o = o || {};
  const stages = def.stages || 5;
  let stage = o.stage == null ? stages - 1 : Math.round(+o.stage || 0);
  stage = Math.max(0, Math.min(4, stage));
  const season = _GART_SEASONS.includes(o.season) ? o.season : _gartSeasonNow();
  const variant = Math.max(0, Math.min(7, Math.abs(Math.round(+o.variant || 0))));
  const tod = _GART_TODS.includes(o.tod) ? o.tod : 'day';
  const t = Math.max(0, Math.min(1, +o.t || 0));
  const size = o.size === 's' || o.size === 'l' ? o.size : 'm';
  const look = (cat && cat.look) || {};
  const main = (look.v && look.v[variant]) || look.c || null;
  const out = Object.assign({}, o, {
    kind, id: String(o.id || ''), cat, look, stage, s5: stage, season, variant, tod, night: tod === 'night', dusk: tod === 'dusk' || tod === 'dawn', t, size,
    lod: size === 's' ? 0 : size === 'l' ? 2 : 1, dn: size === 's' ? 0.5 : size === 'l' ? 1 : 0.75, r: Math.max(0, Math.min(3, Math.round(+o.r || 0))),
    thirsty: !!o.thirsty, overgrown: !!o.overgrown, ripe: !!o.ripe, silhouette: !!o.silhouette, anim: !o.silhouette,
    main: GART.HEX.test(String(main)) ? main : null,
    col: GART.HEX.test(String(main)) ? GART.tone3(main) : null,
    col2: GART.HEX.test(String(look.c2)) ? GART.tone3(look.c2) : null,
  });
  return out;
}

/* ---------- drawing ---------- */
/** How a drawing in its own units is fitted into the contract's art units. Returns the scale. */
function _gartFit(def, o) {
  const b = def.box, U = 64;
  if (def.fit === 'none') return 1;
  if (o.kind === 'plant') {
    const fp = (o.cat && o.cat.fp) || def.fp || 1, h = (o.look && o.look.h) || def.h || (b[1] / U);
    return Math.min(U * h / b[1], (U * fp + 18) / b[0]);
  }
  // decorations, visitors and tiles are drawn in art units already; 'unit' scales a drawing into one 64-unit cell
  return def.fit === 'unit' ? Math.min((U - 8) / b[0], (U - 8) / b[1]) : 1;
}
/** One flat colour for the almanac's undiscovered entry: every fill and stroke the same, no motion. */
function _gartSilhouette(s, col) {
  // glows and faint washes (shadows, halos, dew, highlights) would turn into solid blobs: drop them first
  s = s.replace(/<g class="gda-glow"[^>]*>(?:(?!<\/g>).)*<\/g>/g, '').replace(/<(?:path|ellipse)[^>]* opacity="0?\.(?:[0-3]\d*)"[^>]*\/>/g, '');
  return s.replace(/(fill|stroke)="#[0-9a-fA-F]{6}"/g, (m, k) => `${k}="${col}"`).replace(/ opacity="[\d.]+"/g, '').replace(/ class="[^"]*"/g, '').replace(/ style="[^"]*"/g, '');
}
/** Thirsty: the plant droops a little (shorter, leaning), never browns. */
function _gartDroop(s, r) { return `<g transform="matrix(1 0 ${GART.f1(0.06 + r() * 0.04)} 0.9 0 0)">${s}</g>`; }
/** Overgrown: a few weeds, grass blades and stray shoots round the foot; it wants a trim. */
function _gartWeeds(o, r, w) {
  const A = GART;
  let blades = '', blades2 = '', heads = '';
  for (let i = 0; i < 9; i++) { const x = A.rr(r, -w, w), h = A.rr(r, 6, 14), a = A.rr(r, -0.5, 0.5), [tx, ty] = A.at(x, 0, a, h); (i % 2 ? (blades += `M${A.f1(x)} 0Q${A.f1(x + (tx - x) * 0.2)} ${A.f1(ty * 0.6)} ${A.f1(tx)} ${A.f1(ty)}`) : (blades2 += `M${A.f1(x)} 0Q${A.f1(x + (tx - x) * 0.2)} ${A.f1(ty * 0.6)} ${A.f1(tx)} ${A.f1(ty)}`)); }
  const dx = A.rr(r, -w * 0.8, w * 0.8), dh = A.rr(r, 10, 15);
  heads = A.S('#5a8a3a', 0.8, `M${A.f1(dx)} 0q1 ${A.f1(-dh * 0.5)} 0.6 ${A.f1(-dh)}`) + A.P('#f2c21e', A.circ(dx + 0.6, -dh, 2)) + A.P('#ffe680', A.circ(dx, -dh - 0.6, 0.9));
  if (o.season === 'autumn' || o.season === 'winter') heads = A.S('#8a8a5a', 0.7, `M${A.f1(dx)} 0q1 ${A.f1(-dh * 0.5)} 0.6 ${A.f1(-dh)}`) + A.P('#f4f2ea', A.circ(dx + 0.6, -dh, 2.4), 0.9);
  return A.S('#5f8f3a', 1, blades) + A.S('#86b44e', 0.9, blades2) + heads;
}
/** Ripe: two small sparkles (the engine may add its own badge). */
function _gartRipe(r, w, h) {
  const A = GART, sp = (x, y, s) => `M${A.f1(x)} ${A.f1(y - s)}l${A.f1(s * 0.28)} ${A.f1(s * 0.72)} ${A.f1(s * 0.72)} ${A.f1(s * 0.28)} ${A.f1(-s * 0.72)} ${A.f1(s * 0.28)} ${A.f1(-s * 0.28)} ${A.f1(s * 0.72)} ${A.f1(-s * 0.28)} ${A.f1(-s * 0.72)} ${A.f1(-s * 0.72)} ${A.f1(-s * 0.28)} ${A.f1(s * 0.72)} ${A.f1(-s * 0.28)}z`;
  return `<g class="gda-blink" style="${A.T(r, 0, 2)}">${A.P('#fff3b0', sp(-w * 0.55, -h * 0.8, 4) + sp(w * 0.5, -h * 0.55, 3))}</g>`;
}
/**
 * THE CONTRACT. gardenArt(id, o) -> '<g>…</g>' in art units (anchor: the bottom centre of the footprint), or ''.
 * Never throws: a broken drawing returns '' and the engine draws its placeholder for that one item.
 */
function gardenArt(id, o) {
  try {
    o = o || {};
    const kind = GART_KINDS.includes(o.kind) ? o.kind : 'plant';
    id = String(id == null ? '' : id).slice(0, 64);
    const cat = _gartCat(kind, id);
    const def = _gartFind(kind, id, cat);
    if (!def) return '';
    const opts = _gartOpts(def, Object.assign({}, o, { id }), cat, kind);
    const r = GART.rng(GART.hash(kind + '|' + id + '|' + opts.variant + '|' + Math.round(opts.t * 100) + '|' + opts.r));
    let s = def.draw(opts, r, GART) || '';
    if (!s) return '';
    const k = _gartFit(def, opts);
    const fr = GART.rng(GART.hash('flags|' + id + '|' + opts.t));
    if (kind === 'plant') {
      const bw = def.box[0] * 0.5, bh = def.box[1];
      if (opts.thirsty && opts.stage > 0) s = _gartDroop(s, fr);
      if (opts.overgrown && opts.stage > 1) s += _gartWeeds(opts, fr, bw * 0.9);
      if (opts.ripe && opts.stage >= 3 && !opts.silhouette) s += _gartRipe(fr, bw, bh * (opts.stage === 4 ? 0.9 : 0.6));
    }
    if (opts.silhouette) s = _gartSilhouette(s, '#5d6658');
    const sc = Math.abs(k - 1) < 0.005 ? '' : ` transform="scale(${Math.round(k * 1000) / 1000})"`;
    // path data needs no space before a minus sign: about a tenth off every fragment (a garden draws hundreds)
    s = s.replace(/ d="([^"]*)"/g, (m, d) => ` d="${d.replace(/ -/g, '-')}"`);
    return `<g class="gart gart-${kind}"${sc}>${s}</g>`;
  } catch (e) {
    return '';
  }
}
const GART_KINDS = Object.freeze(['plant', 'decor', 'visitor', 'tile', 'crop', 'seed', 'tool', 'bouquet']);

if (typeof window !== 'undefined') {
  window.GardenArt = Object.freeze({
    art: (id, o) => gardenArt(id, o), ids: k => gartIds(k), has: (k, id) => gartHas(k, id),
    weather: (k, o) => (typeof gartWeather === 'function' ? gartWeather(k, o) : ''),
    lighting: (tod, o) => (typeof gartLighting === 'function' ? gartLighting(tod, o) : ''),
  });
}
