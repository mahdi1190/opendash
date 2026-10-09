// The style normaliser for imported raster objects (docs/dev/SCENE_ENGINE_V2.md 24; builder H). Node >= 20, no dependencies, no I/O
// except the two small file helpers at the end. Pure functions over RGBA images ({ width, height, data: Uint8Array RGBA }), so the
// tests run them on synthetic images.
//
// AI-drawn images arrive with foreign palettes, baked-in light, black outlines, cast shadows, matte fringes and loose anchors. They
// clash with the house look and with v2's own shading (7.2) and shadows (6). normaliseImage() brings one image into line:
//
//   1. paletteMap        k-means in CIELAB (6 to 12 clusters, weighted by alpha); each cluster maps to the nearest HOUSE colour of
//                        its material groups (tools/scene-house-palette.json; seasonal images to that season's foliage); every pixel
//                        moves by its cluster's delta at 0.6 strength (texture kept) and the clusters keep their luminance ORDER
//   2. flattenShading    the baked light direction from the left / right luminance of the silhouette; over 12 % imbalance the linear
//                        left-right trend is removed (v2's rim and shading are the only directional light); highlights over 0.95
//                        luminance are clamped
//   3. removeCastShadow  dark, low-saturation components below the lowest structural row or outside the base's columns -> alpha 0
//   4. outlines          dark edge pixels (over 35 % darker than the interior beside them) recoloured to the darkest house tone of
//                        the interior's colour; outlines thinned to at most 1.5 px (the inner rows take the interior colour)
//   5. defringe          white or black matte halos removed by colour decontamination of the semi-transparent edge pixels
//   6. checkImage        the anchor (2 % of the height), the size and aspect (25 %), padding (4 px), a transparent background,
//                        SCENE_RASTER_BUDGET (bytes, side)
//
//   rgbToLab(rgb) / labToRgb(lab) / deltaE76(a, b)
//   housePalette(json)                       -> { groups: { name: [{ hex, rgb, lab, season }] }, all: [...] }
//   buildHousePalette(objs, { target })      -> the palette JSON from the library objects' palettes (object normalise --build-palette)
//   groupsFor(category, tags)                -> the material groups an object's colours may map to
//   kmeansLab(samples, k, { iters, seed })   -> centroids (deterministic)
//   paletteMap(img, pal, { groups, season, strength, k }) -> { img, clusters, op }
//   lightBalance(img)                        -> { left, right, imbalance, slope }
//   flattenShading(img, { threshold })       -> { img, op }
//   removeCastShadow(img)                    -> { img, removed, op }
//   outlines(img, pal, { groups, thin })     -> { img, recoloured, thinned, op }
//   defringe(img)                            -> { img, cleaned, op }
//   meanDeltaE(img, pal, groups)             -> the alpha-weighted mean distance (dE76) of the opaque pixels to the house palette
//   checkImage(img, meta, { bytes, real })   -> [{ check, ok, warn?, value, limit, message }]
//   normaliseImage(img, pal, { category, tags, season, kind }) -> { img, report: { ops, deltaE: { before, after }, light } }
//   pngEncodeRGBA(width, height, rgba)       -> Buffer (8-bit RGBA, adaptive filters)
import { deflateSync } from 'node:zlib';

/* ---------------------------------------------------------------------------------------------
   Colour
   --------------------------------------------------------------------------------------------- */
const lin = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
const unlin = (v) => { const u = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(u * 255))); };
const LIN = new Float64Array(256).map((_, i) => lin(i));
const fLab = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
const fInv = (t) => (t > 0.206893 ? t * t * t : (t - 16 / 116) / 7.787);
/** sRGB [r, g, b] (0..255) -> CIE L*a*b* (D65). */
export function rgbToLab(rgb) {
  const R = LIN[rgb[0] | 0], G = LIN[rgb[1] | 0], B = LIN[rgb[2] | 0];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const fy = fLab(Y);
  return [116 * fy - 16, 500 * (fLab(X) - fy), 200 * (fy - fLab(Z))];
}
/** CIE L*a*b* -> sRGB [r, g, b] (clamped). */
export function labToRgb(lab) {
  const fy = (lab[0] + 16) / 116, fx = fy + lab[1] / 500, fz = fy - lab[2] / 200;
  const X = fInv(fx) * 0.95047, Y = fInv(fy), Z = fInv(fz) * 1.08883;
  const R = X * 3.2406 - Y * 1.5372 - Z * 0.4986, G = -X * 0.9689 + Y * 1.8758 + Z * 0.0415, B = X * 0.0557 - Y * 0.2040 + Z * 1.0570;
  return [unlin(R), unlin(G), unlin(B)];
}
export const deltaE76 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const hexRgb = (h) => { const s = String(h).replace('#', ''); const n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const rgbHex = (c) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const chroma = (lab) => Math.hypot(lab[1], lab[2]);
/** A seeded generator (the same as the engine's sceneRnd). */
const rnd = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); };
const cloneImg = (img) => ({ width: img.width, height: img.height, data: new Uint8Array(img.data) });

/* ---------------------------------------------------------------------------------------------
   The house palette
   --------------------------------------------------------------------------------------------- */
export const MATERIAL_GROUPS = ['foliage', 'bark', 'brick', 'stone', 'slate', 'render', 'timber', 'metal', 'glass', 'water', 'fabric', 'paint'];
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
/** Slot-name words -> material group (the library's palette slots, 70-scene-lib-*.js). First match wins, in this order. */
const SLOT_WORDS = [
  ['glass', /^(glass|win|window|dglass|wglass|libglass|glassG|glassD|glassT|glassB)$/i],
  ['water', /^(water|sea|wake|foam|pool|wash|washD|ice)$/i],
  ['bark', /(bark|trunk|twig|limb|stem|root|branch|cane|culm)/i],
  ['foliage', /(leaf|leaves|canopy|crown|foliage|forest|veg|shrub|scrub|pine|needle|yew|beech|willow|alder|oak|birch|larch|poplar|frond|fern|ivy|creeper|hedge|moss|grass|turf|lawn|gorse|heath|heather|bracken|reed|plant|tuft|weed|nettle|cress|lichen|olive|lime|bloom|blossom|flower|petal|bract|fresh|fallen|garden|verge|moor|field|hay|algae)/i],
  ['brick', /(brick|terra|tilehang|chim)/i],
  ['slate', /^(slate|roof|roofL|roofD|roofTop|tile|pantile|lead|shingle)$/i],
  ['stone', /(stone|granite|gran|flint|knap|chalk|marble|rock|grit|crag|sand|conc|plinth|pillar|coping|cope|kerb|pave|ballast|gravel|rubble|quay|pier|step|gault|platform)/i],
  ['render', /^(render|stucco|wall|wallL|wallD|wallS|plaster|cream|white|clad|wash)$/i],
  ['timber', /(wood|timber|door|board|deck|beam|frame|post|fence|rafter|batten|thatch|cork|bench|crate|gate|shut|tiller|spar|mast)/i],
  ['metal', /(iron|steel|alloy|metal|rail|rust|bronze|brass|copper|chrome|silver|alu|pylon|cable|wire|chain|truss|verd|gold|tyre|wheel|hub)/i],
  ['fabric', /^(navy|denim|teal|khaki|camel|tan|coral|burgundy|mustard|charcoal|tweed|coat|coatD|coatL|jacket|shirt|shirtD|dress|skirt|trou|wool|cloth|canvas|sail|sailD|sailF|rug|rug2|towel|hat|vest|sk\d|hr\d|skin|hair|fur|boot|sole|bag|scarf|helmet|cap)$/i],
  ['paint', /(paint|red|yellow|pink|plum|blue|orange|livery|hull|body|cab|fascia|sign|panel|trim|band|stripe|accent|ochre|pastel|green|black|grey|navy|funnel)/i],
];
export function slotGroup(name) { for (const [g, re] of SLOT_WORDS) if (re.test(name)) return g; return null; }
/** Which material groups an object's colours may map to (by category, with tags refining). */
export function groupsFor(category, tags = []) {
  const t = new Set(tags || []);
  switch (category) {
    case 'tree': return ['foliage', 'bark'];
    case 'plant': case 'ground': return ['foliage', 'bark', 'stone'];
    case 'building': return ['brick', 'stone', 'slate', 'render', 'timber', 'glass', 'metal', 'paint'];
    case 'person': return ['fabric', 'paint'];
    case 'vehicle': return ['paint', 'metal', 'glass', 'fabric'];
    case 'boat': return ['paint', 'timber', 'metal', 'glass', 'fabric'];
    case 'rail': return ['paint', 'metal', 'glass', 'stone', 'timber'];
    case 'rock': return ['stone', 'foliage'];
    case 'water': return ['water', 'foliage', 'stone'];
    case 'street': case 'prop': case 'structure': case 'landmark': return ['stone', 'metal', 'timber', 'paint', 'brick', 'glass', 'slate', 'render'].concat(t.has('natural') ? ['foliage'] : []);
    default: return MATERIAL_GROUPS.slice();
  }
}
/** The palette JSON -> lookup form. */
export function housePalette(json) {
  const groups = {}, all = [];
  for (const [g, v] of Object.entries((json && json.groups) || {})) {
    const list = [];
    const push = (hex, season) => { const rgb = hexRgb(hex), e = { hex: rgbHex(rgb), rgb, lab: rgbToLab(rgb), group: g, season: season || null }; list.push(e); all.push(e); };
    if (Array.isArray(v)) v.forEach(h => push(h));
    else if (v && typeof v === 'object') for (const s of Object.keys(v)) for (const h of v[s] || []) push(h, s);
    groups[g] = list;
  }
  return { groups, all, v: json && json.v };
}
function candidates(pal, groups, season) {
  const out = [];
  for (const g of groups && groups.length ? groups : Object.keys(pal.groups)) {
    for (const e of pal.groups[g] || []) {
      if (e.season && season && e.season !== season) continue;
      if (e.season && !season && e.season !== 'summer') continue;
      out.push(e);
    }
  }
  return out.length ? out : pal.all;
}
const nearest = (lab, list) => { let b = null, bd = Infinity; for (const e of list) { const d = deltaE76(lab, e.lab); if (d < bd) { bd = d; b = e; } } return { e: b, d: bd }; };

/** k-means in Lab: samples [[L, a, b, w]], deterministic (k-means++ from a fixed seed). -> [{ lab, w }] */
export function kmeansLab(samples, k, { iters = 12, seed = 7 } = {}) {
  const n = samples.length;
  if (!n) return [];
  k = Math.max(1, Math.min(k, n));
  const r = rnd(seed), cents = [];
  let first = 0, bw = -1;
  for (let i = 0; i < n; i++) if (samples[i][3] > bw) { bw = samples[i][3]; first = i; }
  cents.push(samples[first].slice(0, 3));
  const dist = new Float64Array(n).fill(Infinity);
  while (cents.length < k) {
    let sum = 0;
    const c = cents[cents.length - 1];
    for (let i = 0; i < n; i++) { const s = samples[i], d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2; if (d < dist[i]) dist[i] = d; sum += dist[i] * s[3]; }
    if (!(sum > 0)) break;
    let t = r() * sum, pick = n - 1;
    for (let i = 0; i < n; i++) { t -= dist[i] * samples[i][3]; if (t <= 0) { pick = i; break; } }
    cents.push(samples[pick].slice(0, 3));
  }
  const assign = new Int32Array(n);
  for (let it = 0; it < iters; it++) {
    const acc = cents.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const s = samples[i];
      let bi = 0, bd = Infinity;
      for (let j = 0; j < cents.length; j++) { const c = cents[j], d = (s[0] - c[0]) ** 2 + (s[1] - c[1]) ** 2 + (s[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = j; } }
      assign[i] = bi; const a = acc[bi]; a[0] += s[0] * s[3]; a[1] += s[1] * s[3]; a[2] += s[2] * s[3]; a[3] += s[3];
    }
    let moved = 0;
    for (let j = 0; j < cents.length; j++) { const a = acc[j]; if (!a[3]) continue; const nc = [a[0] / a[3], a[1] / a[3], a[2] / a[3]]; moved += deltaE76(nc, cents[j]); cents[j] = nc; }
    if (moved < 0.05) break;
  }
  const w = cents.map(() => 0);
  for (let i = 0; i < n; i++) w[assign[i]] += samples[i][3];
  return cents.map((lab, j) => ({ lab, w: w[j] })).filter(c => c.w > 0);
}

/** The palette JSON from library objects' palettes: slot names -> material groups, foliage by season; ~60 colours. */
export function buildHousePalette(objs, { target = { foliage: 5, bark: 4, brick: 4, stone: 5, slate: 4, render: 4, timber: 4, metal: 4, glass: 3, water: 3, fabric: 6, paint: 6 } } = {}) {
  const bins = {};
  const add = (g, season, hex) => { const key = g === 'foliage' ? g + '|' + season : g; (bins[key] = bins[key] || new Map()).set(hex, ((bins[key].get(hex)) || 0) + 1); };
  for (const d of objs) {
    const p = d && d.palette;
    if (!p || typeof p !== 'object') continue;
    const tags = d.tags || [];
    if (tags.includes('landmark') || d.category === 'sky') continue;   // one-off landmark colours and sky tints are not house materials
    for (const [season, slots] of Object.entries(p)) {
      if (!slots || typeof slots !== 'object') continue;
      const se = SEASONS.includes(season) ? season : 'summer';
      for (const [name, v] of Object.entries(slots)) {
        const g = slotGroup(name);
        if (!g) continue;
        for (const hex of (Array.isArray(v) ? v : [v])) if (typeof hex === 'string' && /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex)) {
          if (g === 'foliage' && season === 'base') { for (const s of SEASONS) add(g, s, rgbHex(hexRgb(hex))); } else add(g, se, rgbHex(hexRgb(hex)));
        }
      }
    }
  }
  const pick = (map, k, seed) => {
    if (!map || !map.size) return [];
    const samples = [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([hex, n]) => [...rgbToLab(hexRgb(hex)), n]);
    return kmeansLab(samples, k, { seed, iters: 20 }).sort((a, b) => a.lab[0] - b.lab[0]).map(c => rgbHex(labToRgb(c.lab)));
  };
  const groups = {};
  for (const g of MATERIAL_GROUPS) {
    if (g === 'foliage') { groups.foliage = {}; SEASONS.forEach((s, i) => { groups.foliage[s] = pick(bins['foliage|' + s], target.foliage, 11 + i); }); }
    else groups[g] = pick(bins[g], target[g] || 4, 31 + MATERIAL_GROUPS.indexOf(g));
  }
  const n = Object.values(groups).reduce((a, v) => a + (Array.isArray(v) ? v.length : Object.values(v).reduce((x, l) => x + l.length, 0)), 0);
  return { v: 1, about: 'The house palette for imported raster objects (docs/dev/SCENE_ENGINE_V2.md 24.2): built from the object library palettes by object normalise --build-palette; grouped by material, foliage by season.', colours: n, groups };
}

/* ---------------------------------------------------------------------------------------------
   The steps
   --------------------------------------------------------------------------------------------- */
const A_SOLID = 128;
function labImage(img) {
  const n = img.width * img.height, L = new Float32Array(n * 3), d = img.data;
  for (let i = 0; i < n; i++) { if (!d[i * 4 + 3]) continue; const l = rgbToLab([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]); L[i * 3] = l[0]; L[i * 3 + 1] = l[1]; L[i * 3 + 2] = l[2]; }
  return L;
}
function bboxOf(img, thr = 8) {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (img.data[(y * img.width + x) * 4 + 3] > thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** 1. Palette mapping (24.2.1). */
export function paletteMap(img, pal, { groups = null, season = null, strength = 0.6, k = null, maxSamples = 24000 } = {}) {
  const out = cloneImg(img), d = out.data, n = img.width * img.height;
  const Lab = labImage(img), samples = [];
  let opaque = 0;
  const q = new Set();
  for (let i = 0; i < n; i++) if (d[i * 4 + 3] > 16) { opaque++; q.add((d[i * 4] >> 3) << 10 | (d[i * 4 + 1] >> 3) << 5 | (d[i * 4 + 2] >> 3)); }
  if (!opaque) return { img: out, clusters: [], op: 'palette: no opaque pixels' };
  const step = Math.max(1, Math.floor(opaque / maxSamples));
  for (let i = 0, c = 0; i < n; i++) if (d[i * 4 + 3] > 16 && (c++ % step === 0)) samples.push([Lab[i * 3], Lab[i * 3 + 1], Lab[i * 3 + 2], d[i * 4 + 3] / 255]);
  const kk = k || Math.max(Math.min(6, q.size), Math.min(12, Math.ceil(q.size / 40)));
  const cents = kmeansLab(samples, kk, { seed: 7 });
  const cand = candidates(pal, groups, season);
  // targets: the nearest house colour per cluster, then the luminance ORDER of the clusters is restored where a mapping crossed it
  const cl = cents.map(c => { const t = nearest(c.lab, cand); return { lab: c.lab, w: c.w, to: t.e.lab.slice(), hex: t.e.hex, group: t.e.group, d: t.d }; });
  const order = cl.map((c, i) => i).sort((a, b) => cl[a].lab[0] - cl[b].lab[0]);
  for (let j = 1; j < order.length; j++) {
    const prev = cl[order[j - 1]], cur = cl[order[j]];
    const gap = Math.max(0.5, (cur.lab[0] - prev.lab[0]) * 0.5);
    if (cur.to[0] < prev.to[0] + gap) cur.to[0] = Math.min(100, prev.to[0] + gap);
  }
  for (let i = 0; i < n; i++) {
    if (!d[i * 4 + 3]) continue;
    const p = [Lab[i * 3], Lab[i * 3 + 1], Lab[i * 3 + 2]];
    let bi = 0, bd = Infinity;
    for (let j = 0; j < cl.length; j++) { const c = cl[j].lab, dd = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (dd < bd) { bd = dd; bi = j; } }
    const c = cl[bi], s = strength;
    const rgb = labToRgb([Math.max(0, Math.min(100, p[0] + (c.to[0] - c.lab[0]) * s)), p[1] + (c.to[1] - c.lab[1]) * s, p[2] + (c.to[2] - c.lab[2]) * s]);
    d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2];
  }
  return { img: out, clusters: cl.map(c => ({ from: rgbHex(labToRgb(c.lab)), to: c.hex, group: c.group, w: Math.round(c.w), dE: Math.round(c.d * 10) / 10, L: [Math.round(c.lab[0]), Math.round(c.to[0])] })), op: `palette: ${cl.length} clusters -> house (${[...new Set(cl.map(c => c.group))].join(', ')}), strength ${strength}` };
}

/** The silhouette's left / right luminance and the linear left-right slope of L* (per unit of half width). */
/** The content box of an image (alpha over thr): { x0, y0, x1, y1, w, h } | null. */
export function contentBox(img, thr = 8) { return bboxOf(img, thr); }
export function lightBalance(img) {
  const bb = bboxOf(img, A_SOLID);
  if (!bb) return { left: 0, right: 0, imbalance: 0, slope: 0, cx: 0, half: 1 };
  const cx = (bb.x0 + bb.x1) / 2, half = Math.max(1, bb.w / 2), d = img.data;
  let sl = 0, nl = 0, sr = 0, nr = 0, sx = 0, sxx = 0, sy = 0, sxy = 0, n = 0;
  for (let y = bb.y0; y <= bb.y1; y++) for (let x = bb.x0; x <= bb.x1; x++) {
    const i = y * img.width + x;
    if (d[i * 4 + 3] < A_SOLID) continue;
    const L = rgbToLab([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]])[0], u = (x - cx) / half;
    if (u < 0) { sl += L; nl++; } else if (u > 0) { sr += L; nr++; }
    sx += u; sxx += u * u; sy += L; sxy += u * L; n++;
  }
  const left = nl ? sl / nl : 0, right = nr ? sr / nr : 0, mean = n ? sy / n : 0;
  const den = n * sxx - sx * sx, slope = den ? (n * sxy - sx * sy) / den : 0;
  return { left, right, mean, imbalance: mean ? (right - left) / mean : 0, slope, cx, half };
}
/** 2. Shading (24.2.2): over 12 % left-right imbalance, the linear trend is removed; highlights over 0.95 luminance are clamped. */
export function flattenShading(img, { threshold = 0.12, highlight = 0.95 } = {}) {
  const lb = lightBalance(img), out = cloneImg(img), d = out.data, n = img.width * img.height;
  const flat = Math.abs(lb.imbalance) > threshold;
  const Lmax = 116 * Math.cbrt(highlight) - 16;
  let clamped = 0;
  for (let i = 0; i < n; i++) {
    if (!d[i * 4 + 3]) continue;
    const x = i % img.width, lab = rgbToLab([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    let L = lab[0];
    if (flat) L -= lb.slope * (x - lb.cx) / lb.half;
    if (L > Lmax) { L = Lmax; clamped++; }
    if (L === lab[0]) continue;
    const rgb = labToRgb([Math.max(0, L), lab[1], lab[2]]);
    d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2];
  }
  const pct = Math.round(lb.imbalance * 100);
  return { img: out, light: { left: Math.round(lb.left), right: Math.round(lb.right), imbalance: pct, from: pct > 0 ? 'right' : pct < 0 ? 'left' : 'none', flattened: flat }, clamped,
    op: flat ? `shading: baked light from the ${pct > 0 ? 'right' : 'left'} (${Math.abs(pct)} % imbalance) flattened` + (clamped ? `; ${clamped} highlights clamped` : '') : `shading: balanced (${Math.abs(pct)} %)` + (clamped ? `; ${clamped} highlights clamped` : '') };
}

/**
 * 3. Baked cast shadows (24.2.3). A cast shadow is a dark, low-saturation, FLAT region lying on the ground at the object's foot.
 * Of each dark low-saturation component that reaches the foot (its bottom within 4 % of the content's bottom), these are cut:
 *   - its pixels with no structural pixel above them in their column (thrown out beyond the body), when those pixels together
 *     are flat (wider than twice their height), low (their top within 30 % of the content height from the bottom) and look like
 *     a shadow: soft (mean alpha under 235), or a thin (within 12 %) uniform grey. A lamp post or a figure standing alone is
 *     tall, and a dark hull is opaque and deep, so they stay;
 *   - its semi-transparent pixels (alpha under 200) below the lowest structural row (a soft blob under the object).
 * Opaque dark parts under the body (a trunk under its canopy, tyres, a hull, a dark coat) have structure above them and are kept.
 */
export function removeCastShadow(img, { darkL = 50, grey = 14, softA = 200 } = {}) {
  const out = cloneImg(img), d = out.data, W = img.width, H = img.height, n = W * H;
  const shadowLike = new Uint8Array(n), structural = new Uint8Array(n);
  let cBottom = -1;
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3];
    if (a <= 16) continue;
    cBottom = Math.max(cBottom, (i / W) | 0);
    const lab = rgbToLab([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    if (lab[0] < darkL && chroma(lab) < grey) shadowLike[i] = 1;
    else if (a >= A_SOLID) structural[i] = 1;
  }
  // per column: the topmost structural row (Infinity: nothing structural in that column); the lowest structural row overall
  const top = new Float64Array(W).fill(Infinity);
  let y0 = H, base = -1;
  for (let y = 0; y < H; y++) { let c = 0; for (let x = 0; x < W; x++) if (structural[y * W + x]) { c++; if (y < top[x]) top[x] = y; } if (c >= 2) { if (y < y0) y0 = y; base = y; } }
  if (base < 0) return { img: out, removed: 0, op: 'shadow: no structure found' };
  const h = Math.max(1, cBottom - y0 + 1);
  const seen = new Uint8Array(n), mask = new Uint8Array(n);
  let removed = 0, comps = 0;
  for (let s = 0; s < n; s++) {
    if (!shadowLike[s] || seen[s]) continue;
    const stack = [s], px = [];
    seen[s] = 1;
    let bx0 = W, bx1 = -1, by0 = H, by1 = -1;
    while (stack.length) {
      const i = stack.pop(); px.push(i);
      const x = i % W, y = (i / W) | 0;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= n || seen[j] || !shadowLike[j]) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    if (by1 < cBottom - Math.max(1, h * 0.04)) continue;   // not on the ground at the foot: part of the object
    const open = [];
    let ox0 = W, ox1 = -1, oy0 = H, oy1 = -1;
    for (const i of px) {
      const x = i % W, y = (i / W) | 0;
      if (top[x] === Infinity || top[x] > y) { open.push(i); if (x < ox0) ox0 = x; if (x > ox1) ox1 = x; if (y < oy0) oy0 = y; if (y > oy1) oy1 = y; }
    }
    let shadowy = false;
    if (open.length && (ox1 - ox0 + 1) >= 2 * (oy1 - oy0 + 1) && oy0 >= cBottom - h * 0.3) {
      let sa = 0, sL = 0, sLL = 0, sc = 0;
      for (const i of open) { const lab = rgbToLab([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]); sa += d[i * 4 + 3]; sL += lab[0]; sLL += lab[0] * lab[0]; sc += chroma(lab); }
      const m = open.length, meanA = sa / m, meanL = sL / m, sdL = Math.sqrt(Math.max(0, sLL / m - meanL * meanL)), meanC = sc / m;
      shadowy = meanA < 235 || (oy0 >= cBottom - h * 0.12 && sdL < 4 && meanC < 8);
    }
    let cut = 0;
    if (shadowy) for (const i of open) { d[i * 4 + 3] = 0; mask[i] = 1; cut++; }
    for (const i of px) { const y = (i / W) | 0; if (y > base && d[i * 4 + 3] && d[i * 4 + 3] < softA) { d[i * 4 + 3] = 0; mask[i] = 1; cut++; } }
    if (cut) { comps++; removed += cut; }
  }
  return { img: out, removed, mask, op: removed ? `shadow: ${removed} px of baked cast shadow cut (${comps} region${comps === 1 ? '' : 's'})` : 'shadow: none found' };
}
/** The same cut on another look of the same canvas (night): its own darks are not judged, the colour image's mask is applied. */
export function applyCutMask(img, mask) {
  if (!mask || mask.length !== img.width * img.height) return { img, removed: 0, op: 'shadow: no mask for this canvas' };
  const out = cloneImg(img);
  let removed = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] && out.data[i * 4 + 3]) { out.data[i * 4 + 3] = 0; removed++; }
  return { img: out, removed, op: removed ? `shadow: ${removed} px cut as in the day image` : 'shadow: none (as the day image)' };
}

/** The distance (in pixels, 4-neighbour steps) of each opaque pixel from the transparent background; 0 for transparent pixels. */
function edgeDistance(img, maxD = 12) {
  const W = img.width, H = img.height, n = W * H, d = img.data, dist = new Uint8Array(n).fill(255), q = [];
  for (let i = 0; i < n; i++) if (d[i * 4 + 3] < 64) { dist[i] = 0; q.push(i); }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x === 0 || y === 0 || x === W - 1 || y === H - 1)) { const i = y * W + x; if (dist[i] === 255) { dist[i] = 1; q.push(i); } }
  for (let h = 0; h < q.length; h++) {
    const i = q[h], x = i % W, v = dist[i];
    if (v >= maxD) continue;
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < n && dist[j] > v + 1) { dist[j] = v + 1; q.push(j); }
  }
  return dist;
}
/** 4. Outlines (24.2.4): dark edge rings recoloured to the darkest house tone of the colour inside them, thinned to 1.5 px. */
export function outlines(img, pal, { groups = null, season = null, ratio = 0.65, band = 4, thin = true } = {}) {
  const out = cloneImg(img), d = out.data, W = img.width, H = img.height, n = W * H;
  const dist = edgeDistance(img, band + 6), Lab = labImage(img), cand = candidates(pal, groups, season);
  let recoloured = 0, thinned = 0;
  const darkMemo = new Map();
  for (let i = 0; i < n; i++) {
    const di = dist[i];
    if (!di || di > band || d[i * 4 + 3] < A_SOLID) continue;
    const x = i % W, y = (i / W) | 0;
    let sL = 0, sa = 0, sb = 0, sr = 0, sg = 0, sbb = 0, c = 0;
    for (let yy = Math.max(0, y - 4); yy <= Math.min(H - 1, y + 4); yy++) for (let xx = Math.max(0, x - 4); xx <= Math.min(W - 1, x + 4); xx++) {
      const j = yy * W + xx;
      if (dist[j] < band + 1 || dist[j] === 255 && d[j * 4 + 3] < A_SOLID) continue;
      sL += Lab[j * 3]; sa += Lab[j * 3 + 1]; sb += Lab[j * 3 + 2]; sr += d[j * 4]; sg += d[j * 4 + 1]; sbb += d[j * 4 + 2]; c++;
    }
    if (!c) continue;
    const Lint = sL / c;
    if (!(Lab[i * 3] < Lint * ratio)) continue;
    if (thin && di >= 3) { d[i * 4] = Math.round(sr / c); d[i * 4 + 1] = Math.round(sg / c); d[i * 4 + 2] = Math.round(sbb / c); thinned++; continue; }
    const key = Math.round(Lint / 4) + '|' + Math.round(sa / c / 6) + '|' + Math.round(sb / c / 6);
    let dark = darkMemo.get(key);
    if (!dark) {
      const want = [Lint * 0.55, sa / c, sb / c];
      const pick = nearest(want, cand.filter(e => e.lab[0] < Lint - 4)).e || nearest(want, cand).e;
      dark = pick ? pick.rgb : labToRgb(want);
      darkMemo.set(key, dark);
    }
    let rgb = dark;
    if (thin && di === 2) rgb = [0, 1, 2].map(k => Math.round((dark[k] + [sr, sg, sbb][k] / c) / 2));   // the half pixel of 1.5 px
    d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2];
    recoloured++;
  }
  return { img: out, recoloured, thinned, op: recoloured + thinned ? `outlines: ${recoloured} px recoloured to house tones${thinned ? `, ${thinned} px thinned` : ''}` : 'outlines: none' };
}

/** 5. Matte fringes (24.2.5): semi-transparent edge pixels un-mixed from a white or black matte; opaque halo pixels take the interior colour. */
export function defringe(img, { band = 2 } = {}) {
  const out = cloneImg(img), d = out.data, W = img.width, H = img.height, n = W * H;
  const dist = edgeDistance(img, band + 6);
  let cleaned = 0;
  for (let i = 0; i < n; i++) {
    const a = d[i * 4 + 3];
    if (a < 8) continue;
    if (a >= 250 && dist[i] > band) continue;
    const x = i % W, y = (i / W) | 0;
    let sr = 0, sg = 0, sb = 0, c = 0;
    for (let yy = Math.max(0, y - 3); yy <= Math.min(H - 1, y + 3); yy++) for (let xx = Math.max(0, x - 3); xx <= Math.min(W - 1, x + 3); xx++) {
      const j = yy * W + xx;
      if (d[j * 4 + 3] < 250 || dist[j] <= band) continue;
      sr += d[j * 4]; sg += d[j * 4 + 1]; sb += d[j * 4 + 2]; c++;
    }
    if (!c) continue;
    const inner = [sr / c, sg / c, sb / c], obs = [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]];
    const Li = rgbToLab(inner)[0], lo = rgbToLab(obs), Lo = lo[0];
    let M = null;
    if (Lo > Li + 8 && Lo > 70 && chroma(lo) < 30) M = [255, 255, 255];
    else if (Lo < Li - 8 && Lo < 30 && chroma(lo) < 20) M = [0, 0, 0];
    if (!M) continue;
    let rgb;
    if (a < 250) {
      const al = a / 255;
      rgb = obs.map((v, k) => Math.round((v - (1 - al) * M[k]) / al));
      if (rgb.some(v => v < 0 || v > 255) || deltaE76(rgbToLab(rgb.map(v => Math.max(0, Math.min(255, v)))), rgbToLab(inner)) > 30) rgb = inner.map(Math.round);
    } else rgb = inner.map(Math.round);
    rgb = rgb.map(v => Math.max(0, Math.min(255, v)));
    d[i * 4] = rgb[0]; d[i * 4 + 1] = rgb[1]; d[i * 4 + 2] = rgb[2];
    cleaned++;
  }
  return { img: out, cleaned, op: cleaned ? `fringe: ${cleaned} edge px decontaminated` : 'fringe: clean' };
}

/** The alpha-weighted mean dE76 of the opaque pixels to their nearest house colour (sampled). */
export function meanDeltaE(img, pal, { groups = null, season = null, maxSamples = 20000 } = {}) {
  const d = img.data, n = img.width * img.height, cand = candidates(pal, groups, season);
  let s = 0, w = 0, c = 0;
  const step = Math.max(1, Math.floor(n / (maxSamples * 2)));
  const memo = new Map();
  for (let i = 0; i < n; i += step) {
    const a = d[i * 4 + 3];
    if (a < 16) continue;
    const key = d[i * 4] << 16 | d[i * 4 + 1] << 8 | d[i * 4 + 2];
    let e = memo.get(key);
    if (e == null) { e = nearest(rgbToLab([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]), cand).d; memo.set(key, e); }
    s += e * a; w += a; c++;
  }
  return w ? Math.round(s / w * 10) / 10 : 0;
}

/* ---------------------------------------------------------------------------------------------
   Checks (24.2.6)
   --------------------------------------------------------------------------------------------- */
export const RASTER_BUDGET = { imageKB: { warn: 96, max: 256 }, maxSide: 1024 };   // SCENE_RASTER_BUDGET (object-import's 70-scene-0raster.js)
export const RASTER_ANCHORS = { 'bottom-centre': [0.5, 1], 'bottom-center': [0.5, 1], centre: [0.5, 0.5], center: [0.5, 0.5], 'bottom-left': [0, 1], 'bottom-right': [1, 1], 'top-centre': [0.5, 0], 'top-center': [0.5, 0] };
/** Real heights (metres) by category: the stand-in for A's SCENE_REAL_SIZE (70-scene-1real.js), which the command passes when loaded. */
export const REAL_BY_CATEGORY = { person: 1.72, vehicle: 1.5, boat: 1.9, tree: 15, plant: 0.6, ground: 0.25, rock: 1, water: 0.4, bird: 0.4, animal: 1.1, building: 9, street: 1.1, rail: 3.8, structure: 6, prop: 1, landmark: 30 };
/** The union of the content boxes of several same-size images (an object's variants, seasons, parts and frames share one canvas). */
export function unionBox(imgs, extra = []) {
  let u = null;
  for (const b of imgs.map(im => bboxOf(im, 8)).concat(extra)) { if (!b) continue; u = u ? { x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) } : Object.assign({}, b); }
  if (u) { u.w = u.x1 - u.x0 + 1; u.h = u.y1 - u.y0 + 1; }
  return u;
}
export function checkImage(img, meta = {}, { bytes = null, real = null, budget = RASTER_BUDGET, union = null } = {}) {
  const res = [];
  const add = (check, ok, value, limit, message, warn) => res.push({ check, ok: !!ok, warn: !!warn && !!ok, value, limit, message: ok && !warn ? '' : message });
  const bb0 = bboxOf(img, 8), W = img.width, H = img.height, d = img.data;
  const bb = union && bb0 ? union : bb0;   // the canvas is shared: padding and aspect are judged on the union of its images
  if (!bb) { add('content', false, 'empty', 'opaque pixels', 'the image is fully transparent'); return res; }
  // the anchor: the lowest opaque row's contact centre against meta.anchor, within 2 % of the height
  const an = Array.isArray(meta.anchor) ? meta.anchor : RASTER_ANCHORS[meta.anchor || 'bottom-centre'] || [0.5, 1];
  let yb = -1;
  for (let y = H - 1; y >= 0 && yb < 0; y--) { let c = 0; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] >= A_SOLID) c++; if (c >= 1) yb = y; }
  // the contact: the feet, the wheels or the trunk base (the lowest 1.5 % of rows); a hull floats, so its bottom tenth
  const rows = Math.max(1, Math.round(bb.h * (meta.category === 'boat' ? 0.1 : 0.015)));
  let ex0 = W, ex1 = -1;
  for (let y = Math.max(0, yb - rows + 1); y <= yb; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] >= A_SOLID) { if (x < ex0) ex0 = x; if (x > ex1) ex1 = x; }
  const cx = ex1 >= 0 ? (ex0 + ex1 + 1) / 2 : W / 2, ax = an[0] * W, ay = an[1] * H;
  const offX = (cx - ax) / bb.h, offY = (yb + 1 - ay) / bb.h, off = Math.max(Math.abs(offX), Math.abs(offY));
  add('anchor', off <= 0.02, `${Math.round(offX * 1000) / 10} %, ${Math.round(offY * 1000) / 10} %`, 'within 2 % of the height',
    `the contact point (${Math.round(cx)}, ${yb + 1}) is ${Math.round(off * 1000) / 10} % of the height from the anchor (${Math.round(ax)}, ${Math.round(ay)}): re-centre the image or fix meta.anchor`);
  // size: the aspect against meta.size, and the real height against the class table, within 25 %
  if (Array.isArray(meta.size) && meta.size[0] > 0 && meta.size[1] > 0) {
    const a0 = meta.size[0] / meta.size[1], a1 = bb.w / bb.h, r = a1 / a0;
    add('aspect', r >= 0.75 && r <= 1.25, Math.round(a1 * 100) / 100, `${Math.round(a0 * 100) / 100} (meta.size) within 25 %`, `the drawn aspect ${Math.round(a1 * 100) / 100} differs from meta.size's ${Math.round(a0 * 100) / 100} by ${Math.round(Math.abs(r - 1) * 100)} %`);
  }
  const want = real && real.h ? real.h : (meta.category && REAL_BY_CATEGORY[meta.category]) || null;
  if (meta.real && meta.real.h && want) {
    const r = meta.real.h / want;
    add('real', r >= 0.75 && r <= 1.25, meta.real.h + ' m', `${want} m (the class) within 25 %`, `meta.real.h ${meta.real.h} m is ${Math.round(Math.abs(r - 1) * 100)} % off the class height ${want} m`);
  } else if (want) add('real', true, 'class default', `${want} m`, 'no meta.real: the class height applies (add real: { h } in metres)', true);
  // padding: at most 4 px round the content
  const pad = Math.max(bb.x0, bb.y0, W - 1 - bb.x1, H - 1 - bb.y1);
  add('padding', pad <= 4, pad + ' px', 'at most 4 px', `${pad} px of empty margin: trim the image (object import trims; re-import it)`);
  // a transparent background: no flat matte round the border (an object may touch the edges: then its own colours vary), no faint veil
  let border = 0, faint = 0, bg = 0;
  const cols = new Map();
  const edge = (x, y) => { const i = (y * W + x) * 4; if (d[i + 3] > 8) { border++; const k = (d[i] >> 4) << 8 | (d[i + 1] >> 4) << 4 | (d[i + 2] >> 4); cols.set(k, (cols.get(k) || 0) + 1); } };
  for (let x = 0; x < W; x++) { edge(x, 0); edge(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { edge(0, y); edge(W - 1, y); }
  for (let i = 0; i < W * H; i++) { const a = d[i * 4 + 3]; if (a === 0) bg++; else if (a < 12) faint++; }
  const ring = 2 * (W + H) - 4, opaqueBorder = border / ring, flat = border ? Math.max(...cols.values()) / border : 0;
  const corners = [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]].filter(([x, y]) => d[(y * W + x) * 4 + 3] > 8).length;
  const matte = corners >= 3 && opaqueBorder > 0.6 && flat > 0.7;   // a matte surrounds the object: the corners too (an object touching the edges does not fill them)
  add('background', bg > 0 && !matte && faint < W * H * 0.02, `${Math.round(opaqueBorder * 100)} % border${matte ? ', one flat colour' : ''}, ${faint} faint px`, 'transparent', 'the background is not fully transparent (a flat or faint matte remains): remove it (object import removes flat backgrounds)');
  // the budget
  if (bytes != null) {
    const kb = Math.round(bytes / 102.4) / 10;
    add('bytes', kb <= budget.imageKB.max, kb + ' KB', `at most ${budget.imageKB.max} KB (warn ${budget.imageKB.warn})`, `${kb} KB is over the ${kb > budget.imageKB.max ? 'limit' : 'warning'}: re-import at a lower --res`, kb > budget.imageKB.warn);
  }
  add('side', Math.max(W, H) <= budget.maxSide, Math.max(W, H) + ' px', `at most ${budget.maxSide} px`, 'an image side over the budget');
  return res;
}

/* ---------------------------------------------------------------------------------------------
   The whole pass for one image
   --------------------------------------------------------------------------------------------- */
/**
 * kind: 'colour' (base and the seasons: every step), 'night' (the colour image's shadow cut (shadowMask) and the fringe only:
 * the night look keeps its own palette, and its darks are not judged as shadows),
 * 'overlay' (lit, snow, mask: untouched), 'part' (every step but the shadow).
 */
export function normaliseImage(img, pal, { category = null, tags = [], season = null, kind = 'colour', strength = 0.6, thin = true, shadowMask = null } = {}) {
  const groups = groupsFor(category, tags), ops = [];
  const before = meanDeltaE(img, pal, { groups, season });
  if (kind === 'overlay') return { img, report: { ops: ['overlay: untouched'], deltaE: { before, after: before }, light: null } };
  let cur = img, light = null;
  if (kind === 'colour' || kind === 'part') {
    const p = paletteMap(cur, pal, { groups, season, strength }); cur = p.img; ops.push(p.op);
    const s = flattenShading(cur); cur = s.img; light = s.light; ops.push(s.op);
  }
  let mask = null;
  if (kind === 'colour') { const r = removeCastShadow(cur); cur = r.img; mask = r.mask; ops.push(r.op); }
  else if (kind === 'night') { const r = applyCutMask(cur, shadowMask); cur = r.img; ops.push(r.op); }
  if (kind === 'colour' || kind === 'part') { const o = outlines(cur, pal, { groups, season, thin }); cur = o.img; ops.push(o.op); }
  const f = defringe(cur); cur = f.img; ops.push(f.op);
  return { img: cur, mask, report: { ops, deltaE: { before, after: meanDeltaE(cur, pal, { groups, season }) }, light } };
}

/* ---------------------------------------------------------------------------------------------
   PNG (RGBA) encoding: scene-capture.mjs's pngEncode writes RGB only
   --------------------------------------------------------------------------------------------- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = (b) => { let c = -1; for (const x of b) c = CRC[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (kind, body) => { const h = Buffer.alloc(8), t = Buffer.alloc(4); h.writeUInt32BE(body.length); h.write(kind, 4, 'latin1'); t.writeUInt32BE(crc32(Buffer.concat([h.subarray(4), body]))); return Buffer.concat([h, body, t]); };
export function pngEncodeRGBA(width, height, rgba) {
  const stride = width * 4, raw = Buffer.alloc((stride + 1) * height), cand = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const row = y * stride, up = row - stride;
    let best = 0, bestSum = Infinity, bestRow = null;
    for (let f = 0; f <= 4; f++) {
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const v = rgba[row + i], a = i >= 4 ? rgba[row + i - 4] : 0, b = y ? rgba[up + i] : 0, c = i >= 4 && y ? rgba[up + i - 4] : 0;
        let p = 0;
        if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
        else if (f === 4) { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
        const o = (v - p) & 255; cand[i] = o; sum += o < 128 ? o : 256 - o;
      }
      if (sum < bestSum) { bestSum = sum; best = f; bestRow = Buffer.from(cand); }
    }
    raw[y * (stride + 1)] = best; bestRow.copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
