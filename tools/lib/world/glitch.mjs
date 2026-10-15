// World engine: PIXEL CHECKS for render glitches on real renders (the 14 Oct review; docs/dev/SCENE_LESSONS.md section G).
// Node >= 20, no dependencies. Each detector reads an RGBA image ({ width, height, data }: tools/lib/png.mjs pngDecode) and returns
// { ok, value, limit, note, ... } so a test, the `glitch` subcommand of tools/world.mjs or a reviewer can run it on any cell.
//
//   glitchFlatDiscs(img, o)       G1: flat, opaque, bright discs (a lamp pool drawn as a filled ellipse, a particle drawn as a lit
//                                 disc). A light is a soft additive falloff: no large bright region of near-constant colour.
//   glitchSawtooth(img, o)        G4: the water's reflection sheared into a staircase from row to row (vertical edges broken into a
//                                 zigzag). Per row, the horizontal shift that best matches the next row; jagged rows shift >= 2 px.
//   glitchNightReadable(img, o)   G3: a night frame keeps its structure readable: deep darks (no grey veil over the scene), enough
//                                 spread between the darks and the lights, and edges (structure) below the horizon.
//   glitchCheck(img, o)           all three on one cell (o.night: the night checks too; o.water: [x0, y0, x1, y1] the water box).
//   glitchText(res, label)        a short report.
import { readFileSync } from 'node:fs';
import { pngDecode } from '../png.mjs';

/** The luminance (0..1, Rec. 709) of every pixel. */
export function glitchLum(img) {
  const { width: W, height: H, data: D } = img, L = new Float32Array(W * H);
  for (let i = 0, p = 0; p < W * H; p++, i += 4) L[p] = (0.2126 * D[i] + 0.7152 * D[i + 1] + 0.0722 * D[i + 2]) / 255;
  return L;
}
const quant = (arr, q) => { const a = Array.from(arr).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.max(0, Math.floor(q * (a.length - 1))))] : 0; };
/** Load a PNG file as an image. */
export function glitchLoad(file) { return pngDecode(readFileSync(file)); }

/**
 * G1: flat bright discs on a dark frame (a light drawn as a filled ellipse, a particle drawn as a lit disc; by day the check is not
 * applicable: clouds and white walls are bright regions). A pixel is a candidate when it is bright: lum >= max(o.minLum (0.4), the
 * frame's median + o.above (0.25)). Connected candidates form regions; a region of at least o.minArea px (scaled to a 1600 x 900
 * frame; 2500: a figure's white shirt or a tall window is smaller) that is an ellipse rather than a rectangle (it fills 62 to 90 % of its box), is
 * evenly lit inside (p90 - p10 under o.spread, 0.14) and stops at a HARD edge (its rim is o.edge (0.16) brighter than just outside
 * it: a light's soft falloff fades into its surroundings) is a flat disc. ok: none.
 */
export function glitchFlatDiscs(img, o = {}) {
  const W = img.width, H = img.height, L = glitchLum(img), k = (W * H) / (1600 * 900);
  const med = quant(L.filter((_, i) => i % 7 === 0), 0.5);
  if (med > (o.dayMedian == null ? 0.3 : o.dayMedian) && !o.always) return { ok: true, value: 0, limit: 0, discs: [], na: true, note: 'not applicable by day (median ' + med.toFixed(2) + ')' };
  const minLum = Math.max(o.minLum == null ? 0.4 : o.minLum, med + (o.above == null ? 0.25 : o.above));
  const minArea = (o.minArea || 2500) * k, maxSpread = o.spread == null ? 0.14 : o.spread, minEdge = o.edge == null ? 0.16 : o.edge;
  const cand = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (L[p] >= minLum) cand[p] = 1;
  const seen = new Uint8Array(W * H), discs = [], stack = [];
  for (let p0 = 0; p0 < W * H; p0++) {
    if (!cand[p0] || seen[p0]) continue;
    let n = 0, x0 = W, y0 = H, x1 = 0, y1 = 0, rimIn = 0, rimOut = 0, rimN = 0;
    const vals = [];
    stack.length = 0; stack.push(p0); seen[p0] = 1;
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p - x) / W;
      n++; if (n % 3 === 0) vals.push(L[p]);
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const [q, ok] of [[p - 1, x > 0], [p + 1, x < W - 1], [p - W, y > 0], [p + W, y < H - 1]]) {
        if (!ok) continue;
        if (cand[q]) { if (!seen[q]) { seen[q] = 1; stack.push(q); } continue; }
        // a rim step: two pixels out from the edge against the edge pixel (a soft falloff has none)
        const d = q - p, q2 = q + d, out2 = q2 >= 0 && q2 < W * H ? L[q2] : L[q];
        rimIn += L[p]; rimOut += Math.min(L[q], out2); rimN++;
      }
    }
    if (n < minArea) continue;
    const fill = n / ((x1 - x0 + 1) * (y1 - y0 + 1)), spread = quant(vals, 0.9) - quant(vals, 0.1), edge = rimN ? (rimIn - rimOut) / rimN : 0;
    if (spread < maxSpread && fill > 0.62 && fill < 0.9 && edge >= minEdge) discs.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, area: n, fill: Math.round(fill * 100) / 100, lum: Math.round(quant(vals, 0.5) * 1000) / 1000, spread: Math.round(spread * 1000) / 1000, edge: Math.round(edge * 1000) / 1000 });
  }
  return { ok: discs.length === 0, value: discs.length, limit: 0, discs, minLum: Math.round(minLum * 1000) / 1000, note: discs.length ? `${discs.length} flat bright disc(s), the largest ${Math.max(...discs.map(d => d.w))} x ${Math.max(...discs.map(d => d.h))} px` : 'no flat bright discs' };
}

/**
 * G4: a sawtooth in the water's reflection. For each row of the box (o.box: [x0, y0, x1, y1] device px; default the bottom 40 % of
 * the frame), the shift s in -o.max..o.max (6) that best matches it to the next row (the mean absolute difference over the columns
 * where the row has texture); a reflection rippled smoothly moves at most a pixel a row. ok: at most o.rate (6 %) of the textured rows
 * jump by 2 px or more (the first v3 renders: about a fifth of the rows).
 */
export function glitchSawtooth(img, o = {}) {
  const W = img.width, H = img.height, L = glitchLum(img);
  const B = o.box || [0, Math.floor(H * 0.6), W, H];
  const bx0 = Math.max(8, Math.floor(B[0])), bx1 = Math.min(W - 8, Math.ceil(B[2])), by0 = Math.max(0, Math.floor(B[1])), by1 = Math.min(H - 1, Math.ceil(B[3]));
  const M = o.max || 6, shifts = [];
  let rows = 0, jag = 0;
  for (let y = by0; y < by1 - 1; y++) {
    // the textured columns: a horizontal gradient worth matching (a vertical edge of a mirrored window, a trunk, a post)
    const cols = [];
    for (let x = bx0 + M; x < bx1 - M; x++) { const g = Math.abs(L[y * W + x + 1] - L[y * W + x - 1]); if (g > (o.edge || 0.06)) cols.push(x); }
    if (cols.length < (o.minCols || 12)) continue;
    let best = 0, bestE = Infinity, e0 = Infinity;
    for (let s = -M; s <= M; s++) {
      let e = 0;
      for (const x of cols) e += Math.abs(L[y * W + x] - L[(y + 1) * W + x + s]);
      e /= cols.length;
      if (s === 0) e0 = e;
      if (e < bestE - 1e-6 || (Math.abs(e - bestE) <= 1e-6 && Math.abs(s) < Math.abs(best))) { bestE = e; best = s; }
    }
    // a shift only counts when it explains the row clearly better than no shift (texture that changes from row to row is not a shear)
    const s = bestE < e0 * 0.6 ? best : 0;
    rows++; shifts.push(s);
    if (Math.abs(s) >= 2) jag++;
  }
  const rate = rows ? jag / rows : 0, limit = o.rate == null ? 0.06 : o.rate;
  return { ok: rate <= limit, value: Math.round(rate * 1000) / 1000, limit, rows, jagged: jag, shifts, note: `${jag} of ${rows} textured rows jump >= 2 px (${Math.round(rate * 100)} %)` };
}

/**
 * G3: a night frame's structure is readable. Below the horizon (o.horizon: a device row; default 45 % of the height) the darks are
 * deep (p5 <= o.dark, 0.1: no grey veil) and the spread from the darks to the lights is wide (p95 - p5 >= o.spread, 0.105: the
 * murky first v3 nights spread 0.087 to 0.094 over one blue-grey, most v2 originals 0.07 to 0.11; an overcast rainy night
 * with lit windows and wet paths reads at about 0.11; a readable night has pale paths, moonlit
 * pale things and lit windows against dark masses). The mean edge step is reported (not judged: a night is darker, so are its
 * edges). value: the spread.
 */
export function glitchNightReadable(img, o = {}) {
  const W = img.width, H = img.height, L = glitchLum(img), y0 = Math.floor(o.horizon != null ? o.horizon : H * 0.45);
  const vals = [];
  let g = 0, n = 0;
  for (let y = y0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const p = y * W + x;
    if ((x + y) % 3 === 0) vals.push(L[p]);
    g += Math.abs(L[p] - L[p + 1]) + Math.abs(L[p] - L[p + W]); n++;
  }
  const p5 = quant(vals, 0.05), p50 = quant(vals, 0.5), p95 = quant(vals, 0.95), edge = n ? g / n / 2 : 0;
  const lim = { dark: o.dark == null ? 0.1 : o.dark, spread: o.spread == null ? 0.105 : o.spread };
  const bad = [];
  if (p5 > lim.dark) bad.push(`a grey veil: the darkest 5 % at ${p5.toFixed(3)} (> ${lim.dark})`);
  if (p95 - p5 < lim.spread) bad.push(`murky: darks to lights only ${(p95 - p5).toFixed(3)} (< ${lim.spread})`);
  const r = (v) => Math.round(v * 1000) / 1000;
  return { ok: !bad.length, value: r(p95 - p5), limit: lim.spread, p5: r(p5), p50: r(p50), p95: r(p95), edge: Math.round(edge * 10000) / 10000, note: bad.length ? bad.join('; ') : `readable: darks ${r(p5)}, lights ${r(p95)}, edges ${Math.round(edge * 10000) / 10000}` };
}

/** All the checks on one rendered cell. o: { night (bool), water ([x0, y0, x1, y1] device px), horizon }. */
export function glitchCheck(img, o = {}) {
  const out = { discs: glitchFlatDiscs(img, o.discs || {}), sawtooth: glitchSawtooth(img, Object.assign({}, o.saw || {}, o.water ? { box: o.water } : {})) };
  if (o.night) out.night = glitchNightReadable(img, Object.assign({}, o.nightOpts || {}, o.horizon != null ? { horizon: o.horizon } : {}));
  out.ok = Object.values(out).every(r => !r || typeof r !== 'object' || r.ok !== false);
  return out;
}
export function glitchText(res, label = '') {
  const L = [`${res.ok ? 'ok  ' : 'FAIL'} ${label}`];
  for (const [k, r] of Object.entries(res)) if (r && typeof r === 'object') L.push(`     ${(r.ok ? 'ok  ' : 'FAIL')} ${k.padEnd(9)} ${r.note}`);
  return L.join('\n');
}
