// Image operations for raster objects (docs/dev/OBJECT_IMPORT.md). Node >= 20, no dependencies; images are
// { width, height, data: Uint8Array RGBA8 } as tools/lib/png.mjs decodes them. Every function is pure (returns new images).
//
//   blank(w, h, rgba)  crop(img, x, y, w, h)  paste(dst, src, x, y)  flipX(img)
//   alphaStats(img)                -> { transparent, partial, opaque } shares of the pixels
//   borderColour(img)              -> { rgb, share }: the commonest border colour (quantised) and how much of the border it holds
//   removeBackground(img, { rgb, tol, soft, mode })  flat background -> transparent ('flood' from the edges, or 'global'), soft
//                                  edges un-mixed from the background colour (no coloured fringe)
//   trimBox(img, min)              -> [x0, y0, x1, y1] (exclusive) of alpha > min, or null
//   resize(img, w, h)              area-average down, bilinear up, on premultiplied alpha
//   fitInto(img, W, H)             -> { img, scale }: the largest size that fits W x H (aspect kept)
//   meanColour(img)                -> [r, g, b] alpha-weighted
//   paletteScore(img, palette)     -> 0..1 share of opaque pixels near a house colour (Lab dE <= 14)
//   normalisePalette(img, palette, k)  each pixel k of the way to its nearest house colour
//   textScore(img)                 -> { score, rows }: lettering-like rows of small glyph-shaped marks (a warning, never a fail)
//   litWindows(img, { seed, on })  -> an overlay: window-like blobs (small, rectangular, set off from the wall) lit warm
//   litFromPair(lit, night)        -> an overlay: what the lit-at-dusk cell has that the night cell has not
//   snowCap(img)                   -> an overlay: snow along the near-horizontal top edges (roofs, ledges, branches)
//   maskIou(a, b)  alignOffset(ref, img, max)   alpha-mask overlap and the shift that maximises it
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const blank = (w, h, rgba = [0, 0, 0, 0]) => {
  const data = new Uint8Array(w * h * 4);
  if (rgba.some(Boolean)) for (let i = 0; i < data.length; i += 4) data.set(rgba, i);
  return { width: w, height: h, data };
};
export function crop(img, x, y, w, h) {
  const out = blank(w, h);
  for (let j = 0; j < h; j++) {
    const sy = y + j;
    if (sy < 0 || sy >= img.height) continue;
    for (let i = 0; i < w; i++) {
      const sx = x + i;
      if (sx < 0 || sx >= img.width) continue;
      const s = (sy * img.width + sx) * 4, d = (j * w + i) * 4;
      out.data[d] = img.data[s]; out.data[d + 1] = img.data[s + 1]; out.data[d + 2] = img.data[s + 2]; out.data[d + 3] = img.data[s + 3];
    }
  }
  return out;
}
/** src over dst at (x, y), in place on a copy. */
export function paste(dst, src, x, y) {
  const out = { width: dst.width, height: dst.height, data: new Uint8Array(dst.data) };
  for (let j = 0; j < src.height; j++) {
    const dy = y + j; if (dy < 0 || dy >= out.height) continue;
    for (let i = 0; i < src.width; i++) {
      const dx = x + i; if (dx < 0 || dx >= out.width) continue;
      const s = (j * src.width + i) * 4, d = (dy * out.width + dx) * 4, a = src.data[s + 3] / 255;
      if (!a) continue;
      const da = out.data[d + 3] / 255, oa = a + da * (1 - a);
      for (let c = 0; c < 3; c++) out.data[d + c] = Math.round((src.data[s + c] * a + out.data[d + c] * da * (1 - a)) / oa);
      out.data[d + 3] = Math.round(oa * 255);
    }
  }
  return out;
}
export function flipX(img) {
  const out = blank(img.width, img.height);
  for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) {
    const s = (y * img.width + x) * 4, d = (y * img.width + img.width - 1 - x) * 4;
    out.data.set(img.data.subarray(s, s + 4), d);
  }
  return out;
}
export function alphaStats(img) {
  let t = 0, p = 0, o = 0;
  const n = img.width * img.height;
  for (let i = 3; i < img.data.length; i += 4) { const a = img.data[i]; if (a === 0) t++; else if (a === 255) o++; else p++; }
  return { transparent: t / n, partial: p / n, opaque: o / n };
}
const q5 = (v) => v >> 3;
export function borderColour(img) {
  const { width: W, height: H, data } = img, counts = new Map();
  let n = 0;
  const add = (x, y) => { const i = (y * W + x) * 4; if (data[i + 3] < 128) return; const k = (q5(data[i]) << 10) | (q5(data[i + 1]) << 5) | q5(data[i + 2]); counts.set(k, (counts.get(k) || 0) + 1); n++; };
  for (let x = 0; x < W; x++) { add(x, 0); add(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { add(0, y); add(W - 1, y); }
  if (!n) return { rgb: null, share: 0 };
  let best = 0, bk = 0;
  for (const [k, c] of counts) if (c > best) { best = c; bk = k; }
  // the mean of the border pixels in that bucket and its neighbours (a flat colour with a little noise or JPEG wobble)
  const near = (r, g, b) => Math.abs(q5(r) - (bk >> 10)) <= 1 && Math.abs(q5(g) - ((bk >> 5) & 31)) <= 1 && Math.abs(q5(b) - (bk & 31)) <= 1;
  let sr = 0, sg = 0, sb = 0, m = 0;
  const acc = (x, y) => { const i = (y * W + x) * 4; if (data[i + 3] >= 128 && near(data[i], data[i + 1], data[i + 2])) { sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; m++; } };
  for (let x = 0; x < W; x++) { acc(x, 0); acc(x, H - 1); }
  for (let y = 1; y < H - 1; y++) { acc(0, y); acc(W - 1, y); }
  return { rgb: [Math.round(sr / m), Math.round(sg / m), Math.round(sb / m)], share: m / n };
}
const dist = (d, i, rgb) => Math.hypot(d[i] - rgb[0], d[i + 1] - rgb[1], d[i + 2] - rgb[2]);
/** Is a colour a chroma key (saturated magenta or green, which no object is painted in)? Then 'global' removal is safe. */
export const isChroma = (rgb) => !!rgb && ((rgb[0] > 180 && rgb[2] > 180 && rgb[1] < 90) || (rgb[1] > 180 && rgb[0] < 90 && rgb[2] < 90));
export function removeBackground(img, { rgb = null, tol = 48, soft = 40, mode = null } = {}) {
  const bc = rgb || borderColour(img).rgb;
  if (!bc) return { width: img.width, height: img.height, data: new Uint8Array(img.data) };
  const m = mode || (isChroma(bc) ? 'global' : 'flood');
  const { width: W, height: H } = img, src = img.data, out = new Uint8Array(src), N = W * H;
  const bg = new Uint8Array(N);   // 1 = background
  if (m === 'global') { for (let p = 0; p < N; p++) if (src[p * 4 + 3] < 8 || dist(src, p * 4, bc) <= tol) bg[p] = 1; }
  else {
    const stack = [];
    const push = (p) => { if (!bg[p] && (src[p * 4 + 3] < 8 || dist(src, p * 4, bc) <= tol)) { bg[p] = 1; stack.push(p); } };
    for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
    for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
    while (stack.length) {
      const p = stack.pop(), x = p % W, y = (p / W) | 0;
      if (x > 0) push(p - 1); if (x < W - 1) push(p + 1); if (y > 0) push(p - W); if (y < H - 1) push(p + W);
    }
  }
  // the edge rings: 1 = next to the background, 2 = next to ring 1 (anti-aliasing spreads over about two pixels)
  const ring = new Uint8Array(N);
  const nextTo = (p, f) => { const x = p % W, y = (p / W) | 0; return (x > 0 && f(p - 1)) || (x < W - 1 && f(p + 1)) || (y > 0 && f(p - W)) || (y < H - 1 && f(p + W)); };
  for (let p = 0; p < N; p++) if (!bg[p] && nextTo(p, q => bg[q])) ring[p] = 1;
  for (let p = 0; p < N; p++) if (!bg[p] && !ring[p] && nextTo(p, q => ring[q] === 1)) ring[p] = 2;
  for (let p = 0; p < N; p++) {
    const i = p * 4;
    if (bg[p]) { out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0; continue; }
    if (!ring[p]) continue;
    // an edge pixel P is a mix a F + (1 - a) B of the object's colour F (the nearest interior pixel) and the background B:
    // a is P's projection on the line B -> F. Un-mixing it removes the coloured fringe even on dark edges far from B.
    const x = p % W, y = (p / W) | 0;
    let F = null, best = Infinity;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const q = yy * W + xx;
      if (bg[q] || ring[q]) continue;
      const dd = dx * dx + dy * dy;
      if (dd < best) { best = dd; F = q * 4; }
    }
    let a;
    if (F != null) {
      const fb = [src[F] - bc[0], src[F + 1] - bc[1], src[F + 2] - bc[2]], pb = [src[i] - bc[0], src[i + 1] - bc[1], src[i + 2] - bc[2]];
      const n2 = fb[0] * fb[0] + fb[1] * fb[1] + fb[2] * fb[2];
      a = n2 > 400 ? clamp((pb[0] * fb[0] + pb[1] * fb[1] + pb[2] * fb[2]) / n2, 0, 1) : 1;
    } else {
      const d = dist(src, i, bc);
      a = d >= tol + soft ? 1 : clamp((d - tol) / soft, 0, 1);
    }
    if (a >= 0.96) continue;
    if (a < 0.08) { out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0; continue; }
    for (let c = 0; c < 3; c++) out[i + c] = clamp(Math.round((src[i + c] - bc[c] * (1 - a)) / a), 0, 255);
    out[i + 3] = Math.round(src[i + 3] * a);
  }
  // despill the edge rings of a chroma key (thin features with no interior pixel nearby keep a tinge): magenta -> pull red and
  // blue down to green; green -> pull green down to the larger of red and blue
  if (isChroma(bc)) {
    const magenta = bc[1] < 90;
    for (let p = 0; p < N; p++) {
      if (!ring[p] || !out[p * 4 + 3]) continue;
      const i = p * 4;
      if (magenta) { const e = Math.min(out[i], out[i + 2]) - out[i + 1]; if (e > 0) { out[i] -= Math.round(e * 0.8); out[i + 2] -= Math.round(e * 0.8); } }
      else { const e = out[i + 1] - Math.max(out[i], out[i + 2]); if (e > 0) out[i + 1] -= Math.round(e * 0.8); }
    }
  }
  return { width: W, height: H, data: out };
}
export function trimBox(img, min = 8) {
  const { width: W, height: H, data } = img;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (data[(y * W + x) * 4 + 3] > min) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}
/** One axis of a separable resample: weights per output index (area-average when shrinking, linear when growing). */
function weights(srcN, dstN) {
  const scale = dstN / srcN, out = [];
  if (scale < 1) {
    for (let o = 0; o < dstN; o++) {
      const a = o / scale, b = (o + 1) / scale, ws = [];
      for (let s = Math.floor(a); s < Math.ceil(b); s++) { const w = Math.min(b, s + 1) - Math.max(a, s); if (w > 0 && s < srcN) ws.push([s, w]); }
      const t = ws.reduce((n, [, w]) => n + w, 0); out.push(ws.map(([s, w]) => [s, w / t]));
    }
  } else {
    for (let o = 0; o < dstN; o++) {
      const c = (o + 0.5) / scale - 0.5, s0 = Math.floor(c), f = c - s0;
      const a = clamp(s0, 0, srcN - 1), b = clamp(s0 + 1, 0, srcN - 1);
      out.push(a === b ? [[a, 1]] : [[a, 1 - f], [b, f]]);
    }
  }
  return out;
}
export function resize(img, w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  if (w === img.width && h === img.height) return { width: w, height: h, data: new Uint8Array(img.data) };
  const { width: W, height: H, data } = img;
  const pre = new Float32Array(W * H * 4);
  for (let i = 0; i < data.length; i += 4) { const a = data[i + 3] / 255; pre[i] = data[i] * a; pre[i + 1] = data[i + 1] * a; pre[i + 2] = data[i + 2] * a; pre[i + 3] = data[i + 3]; }
  const wx = weights(W, w), wy = weights(H, h), mid = new Float32Array(w * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < w; x++) {
    const o = (y * w + x) * 4;
    for (const [s, k] of wx[x]) { const i = (y * W + s) * 4; mid[o] += pre[i] * k; mid[o + 1] += pre[i + 1] * k; mid[o + 2] += pre[i + 2] * k; mid[o + 3] += pre[i + 3] * k; }
  }
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (const [s, k] of wy[y]) { const i = (s * w + x) * 4; r += mid[i] * k; g += mid[i + 1] * k; b += mid[i + 2] * k; a += mid[i + 3] * k; }
    const o = (y * w + x) * 4, A = a / 255;
    out[o + 3] = clamp(Math.round(a), 0, 255);
    if (A > 0.001) { out[o] = clamp(Math.round(r / A), 0, 255); out[o + 1] = clamp(Math.round(g / A), 0, 255); out[o + 2] = clamp(Math.round(b / A), 0, 255); }
  }
  return { width: w, height: h, data: out };
}
export function fitInto(img, W, H) {
  const scale = Math.min(W / img.width, H / img.height);
  return { img: resize(img, img.width * scale, img.height * scale), scale };
}
export function meanColour(img) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < img.data.length; i += 4) { const a = img.data[i + 3]; if (a < 16) continue; r += img.data[i] * a; g += img.data[i + 1] * a; b += img.data[i + 2] * a; n += a; }
  return n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : [0, 0, 0];
}
/* ---------- the house palette ---------- */
const labOf = ([r, g, b]) => {
  const f = (u) => { u /= 255; return u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4; };
  const R = f(r), G = f(g), B = f(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, Y = R * 0.2126 + G * 0.7152 + B * 0.0722, Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const h = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * h(Y) - 16, 500 * (h(X) - h(Y)), 200 * (h(Y) - h(Z))];
};
const hexRgb = (c) => { const n = parseInt(String(c).replace('#', ''), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
/** Sample the opaque pixels (about 4,000) as [rgb, lab]. */
function samples(img, n = 4000) {
  const out = [], N = img.width * img.height, step = Math.max(1, Math.floor(N / n));
  for (let p = 0; p < N; p += step) { const i = p * 4; if (img.data[i + 3] < 128) continue; const rgb = [img.data[i], img.data[i + 1], img.data[i + 2]]; out.push([rgb, labOf(rgb)]); }
  return out;
}
const nearest = (lab, pal) => { let best = Infinity, k = 0; for (let j = 0; j < pal.length; j++) { const p = pal[j][1], d = (lab[0] - p[0]) ** 2 + (lab[1] - p[1]) ** 2 + (lab[2] - p[2]) ** 2; if (d < best) { best = d; k = j; } } return [k, Math.sqrt(best)]; };
const palLab = (palette) => palette.map(c => { const rgb = Array.isArray(c) ? c : hexRgb(c); return [rgb, labOf(rgb)]; });
export function paletteScore(img, palette, { de = 14 } = {}) {
  const pal = palLab(palette), sm = samples(img);
  if (!sm.length || !pal.length) return 0;
  let ok = 0;
  for (const [, lab] of sm) if (nearest(lab, pal)[1] <= de) ok++;
  return Math.round(ok / sm.length * 100) / 100;
}
export function normalisePalette(img, palette, k = 0.3) {
  const pal = palLab(palette), out = new Uint8Array(img.data), memo = new Map();
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 8) continue;
    const key = (out[i] >> 2) << 12 | (out[i + 1] >> 2) << 6 | out[i + 2] >> 2;
    let t = memo.get(key);
    if (!t) { t = pal[nearest(labOf([out[i], out[i + 1], out[i + 2]]), pal)[0]][0]; memo.set(key, t); }
    for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] + (t[c] - out[i + c]) * k);
  }
  return { width: img.width, height: img.height, data: out };
}
/* ---------- blobs ---------- */
const lumAt = (d, i) => d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
/** Connected components (4-neighbour) of a 0/1 mask: [{ n, x0, y0, x1, y1, px: [p...] }]. */
export function components(mask, W, H, { keepPx = true, min = 1 } = {}) {
  const seen = new Uint8Array(W * H), out = [];
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || seen[s]) continue;
    const st = [s], c = { n: 0, x0: W, y0: H, x1: 0, y1: 0, px: keepPx ? [] : null };
    seen[s] = 1;
    while (st.length) {
      const p = st.pop(), x = p % W, y = (p / W) | 0;
      c.n++; if (keepPx) c.px.push(p);
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
      for (const q of nb) if (q >= 0 && mask[q] && !seen[q]) { seen[q] = 1; st.push(q); }
    }
    if (c.n >= min) out.push(c);
  }
  return out;
}
/** Luminance minus its local mean (a box blur of radius r), on the opaque pixels. */
function localContrast(img, r) {
  const { width: W, height: H, data } = img, L = new Float32Array(W * H), A = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) { L[p] = lumAt(data, p * 4); A[p] = data[p * 4 + 3] > 128 ? 1 : 0; }
  // summed-area tables of luminance and coverage
  const S = new Float64Array((W + 1) * (H + 1)), C = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, q = (y + 1) * (W + 1) + x + 1;
    S[q] = (A[p] ? L[p] : 0) + S[q - 1] + S[q - W - 1] - S[q - W - 2];
    C[q] = A[p] + C[q - 1] + C[q - W - 1] - C[q - W - 2];
  }
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (!A[p]) continue;
    const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(W, x + r + 1), y1 = Math.min(H, y + r + 1);
    const at = (xx, yy) => yy * (W + 1) + xx;
    const s = S[at(x1, y1)] - S[at(x0, y1)] - S[at(x1, y0)] + S[at(x0, y0)], c = C[at(x1, y1)] - C[at(x0, y1)] - C[at(x1, y0)] + C[at(x0, y0)];
    out[p] = L[p] - s / Math.max(1, c);
  }
  return { diff: out, opaque: A };
}
/**
 * Window-like blobs: pixels set off from their surroundings (|luminance - local mean| > 16), grouped into blobs that are
 * small (0.02 % to 1.5 % of the object), rectangular (fill >= .55) and not too thin; inside the object (not on its outline).
 * The lit overlay paints a seeded share `on` of them in warm window light (brighter toward the middle).
 */
export function litWindows(img, { seed = 7, on = 0.75 } = {}) {
  const { width: W, height: H } = img, area = (() => { let n = 0; for (let i = 3; i < img.data.length; i += 4) if (img.data[i] > 128) n++; return n; })();
  const r = Math.max(3, Math.round(Math.min(W, H) / 16)), { diff, opaque } = localContrast(img, r);
  let oy0 = H, oy1 = 0;
  for (let p = 0; p < W * H; p++) if (opaque[p]) { const y = (p / W) | 0; if (y < oy0) oy0 = y; if (y > oy1) oy1 = y; }
  const inside = (p) => { const x = p % W, y = (p / W) | 0; return x >= 2 && y >= 2 && x < W - 2 && y < H - 2 && opaque[p - 2] && opaque[p + 2] && opaque[p - 2 * W] && opaque[p + 2 * W]; };
  /**
   * The window blobs of one polarity: -1 = darker than the wall (glass by day, the usual case), +1 = lighter (pale or
   * reflecting glass). The mask is eroded once, so 1 to 2 px lines (mortar, boards, outlines) vanish and window panes that only
   * touch the wall's texture come apart; each blob is grown back by that pixel when it is painted.
   */
  const blobsOf = (sign) => {
    const m = new Uint8Array(W * H), e = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) if (opaque[p] && sign * diff[p] > 14 && inside(p)) m[p] = 1;
    for (let p = W; p < W * H - W; p++) if (m[p] && m[p - 1] && m[p + 1] && m[p - W] && m[p + W]) e[p] = 1;
    const out = [];
    for (const c of components(e, W, H, { min: 2 })) {
      const bw = c.x1 - c.x0 + 3, bh = c.y1 - c.y0 + 3, fill = (c.n + 2 * (bw + bh)) / (bw * bh);
      if (bw * bh < Math.max(6, area * 0.0004) || bw * bh > area * 0.03 || fill < 0.5 || bw / bh > 4 || bh / bw > 4) continue;
      // not in the bottom band of the object (wheels, hulls at the waterline, flower beds, kerbs) and not foliage-green
      if (c.y1 + 1 >= oy1 - (oy1 - oy0) * 0.08) continue;
      let r = 0, g = 0, b = 0;
      for (const p of c.px) { r += img.data[p * 4]; g += img.data[p * 4 + 1]; b += img.data[p * 4 + 2]; }
      if (g > r * 1.12 + 8 * c.n && g > b * 1.08 + 8 * c.n) continue;
      out.push(c);
    }
    return out;
  };
  const dark = blobsOf(-1), light = dark.length >= 2 ? [] : blobsOf(1);
  const blobs = dark.length >= light.length ? dark : light;
  let s = seed >>> 0 || 1;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  const out = blank(W, H);
  for (const c of blobs) {
    if (rnd() > on) continue;
    const warm = rnd() < 0.8 ? [255, 214, 138] : [255, 236, 190];
    const x0 = Math.max(0, c.x0 - 1), y0 = Math.max(0, c.y0 - 1), x1 = Math.min(W - 1, c.x1 + 1), y1 = Math.min(H - 1, c.y1 + 1);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + 1, ry = (y1 - y0) / 2 + 1;
    // the pane's rectangle (the grown blob's box), on the object only, brighter toward the middle
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = y * W + x, i = p * 4;
      if (!opaque[p]) continue;
      const d = Math.max(Math.abs(x - cx) / rx, Math.abs(y - cy) / ry);
      out.data[i] = warm[0]; out.data[i + 1] = Math.round(warm[1] - 30 * d); out.data[i + 2] = Math.round(warm[2] - 50 * d); out.data[i + 3] = 235;
    }
  }
  return { img: out, windows: blobs.length };
}
/** The lit overlay from a sprite sheet: where the lit-at-dusk cell is clearly brighter than the night cell. */
export function litFromPair(lit, night) {
  const out = blank(lit.width, lit.height);
  let n = 0;
  for (let i = 0; i < lit.data.length; i += 4) {
    if (lit.data[i + 3] < 64) continue;
    const dl = lumAt(lit.data, i) - (night.data[i + 3] > 32 ? lumAt(night.data, i) : 0);
    if (dl < 30) continue;
    const a = clamp((dl - 30) / 60, 0, 1);
    out.data[i] = lit.data[i]; out.data[i + 1] = lit.data[i + 1]; out.data[i + 2] = lit.data[i + 2]; out.data[i + 3] = Math.round(255 * a * lit.data[i + 3] / 255);
    n++;
  }
  return { img: out, pixels: n };
}
/** Snow on the near-horizontal top edges: a white band (about 1/60 of the height) under every edge whose neighbours are level. */
export function snowCap(img) {
  const { width: W, height: H, data } = img, out = blank(W, H);
  const t = Math.max(2, Math.round(H / 60)), op = (x, y) => x >= 0 && x < W && y >= 0 && y < H && data[(y * W + x) * 4 + 3] > 128;
  const topAt = (x, y) => { for (let k = 0; k <= 2 * t; k++) { if (op(x, y + k) && !op(x, y + k - 1)) return y + k; if (op(x, y - k) && !op(x, y - k - 1)) return y - k; } return null; };
  let n = 0;
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    if (!op(x, y) || op(x, y - 1)) continue;
    const l = topAt(x - t, y), r = topAt(x + t, y);
    if (l == null || r == null || Math.abs(l - y) > t || Math.abs(r - y) > t) continue;
    for (let k = 0; k < t + 1; k++) {
      if (!op(x, y + k)) break;
      const i = ((y + k) * W + x) * 4, a = k < t ? 1 : 0.5;
      out.data[i] = 246; out.data[i + 1] = 249; out.data[i + 2] = 255; out.data[i + 3] = Math.round(240 * a);
      n++;
    }
  }
  return { img: out, pixels: n };
}
/**
 * Lettering-like marks: dark-on-light or light-on-dark glyph blobs (2 to 40 px tall, fill .2 to .7) that line up in a row of 4 or
 * more with similar heights and small gaps. Windows are excluded by shape (filled rectangles). A heuristic: it warns, never fails.
 */
export function textScore(img) {
  const { width: W, height: H } = img, { diff, opaque } = localContrast(img, Math.max(3, Math.round(Math.min(W, H) / 30)));
  // one polarity at a time (dark letters on a light ground, then light on dark): both at once would fill the counters
  const r1 = textRows(W, H, diff, opaque, -1), r2 = textRows(W, H, diff, opaque, 1);
  return { score: r1 + r2, rows: r1 + r2 };
}
function textRows(W, H, diff, opaque, sign) {
  const mask = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (opaque[p] && sign * diff[p] > 40) mask[p] = 1;
  const glyphs = components(mask, W, H, { keepPx: false, min: 6 }).filter(c => {
    const bw = c.x1 - c.x0 + 1, bh = c.y1 - c.y0 + 1, fill = c.n / (bw * bh);
    return bh >= 4 && bh <= 40 && bw <= bh * 1.6 && fill > 0.2 && fill < 0.7;
  }).sort((a, b) => a.x0 - b.x0);
  let rows = 0;
  const used = new Set();
  for (let i = 0; i < glyphs.length; i++) {
    if (used.has(i)) continue;
    const g = glyphs[i], h = g.y1 - g.y0 + 1, cy = (g.y0 + g.y1) / 2, row = [i];
    let last = g;
    for (let j = i + 1; j < glyphs.length; j++) {
      const k = glyphs[j], kh = k.y1 - k.y0 + 1;
      if (Math.abs((k.y0 + k.y1) / 2 - cy) > h * 0.3 || Math.abs(kh - h) > h * 0.35) continue;
      if (k.x0 - last.x1 > h * 0.9) break;
      row.push(j); last = k;
    }
    if (row.length < 4) continue;
    // a run of IDENTICAL marks at an even pitch is architecture (windows, railings, panels), not lettering: letters vary in width
    const ws = row.map(r => glyphs[r].x1 - glyphs[r].x0 + 1), ns = row.map(r => glyphs[r].n / ((glyphs[r].x1 - glyphs[r].x0 + 1) * (glyphs[r].y1 - glyphs[r].y0 + 1)));
    const pitch = row.slice(1).map((r, k) => glyphs[r].x0 - glyphs[row[k]].x0);
    const cv = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return m ? Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length) / m : 0; };
    if (cv(ws) < 0.15 && cv(ns) < 0.15 && cv(pitch) < 0.2) continue;
    rows++; row.forEach(r => used.add(r));
  }
  return rows;
}
export function maskIou(a, b, dx = 0, dy = 0) {
  let inter = 0, uni = 0;
  for (let y = 0; y < a.height; y++) for (let x = 0; x < a.width; x++) {
    const A = a.data[(y * a.width + x) * 4 + 3] > 128;
    const bx = x - dx, by = y - dy, B = bx >= 0 && by >= 0 && bx < b.width && by < b.height && b.data[(by * b.width + bx) * 4 + 3] > 128;
    if (A && B) inter++; if (A || B) uni++;
  }
  return uni ? inter / uni : 0;
}
/** The shift (dx, dy within +-max) of img over ref (same size) that maximises the mask overlap, on a coarse then a fine grid. */
export function alignOffset(ref, img, max = 6) {
  let best = { dx: 0, dy: 0, iou: maskIou(ref, img) };
  const step = Math.max(1, Math.round(max / 3));
  const tryAt = (dx, dy) => { const v = maskIou(ref, img, dx, dy); if (v > best.iou + 1e-6) best = { dx, dy, iou: v }; };
  for (let dy = -max; dy <= max; dy += step) for (let dx = -max; dx <= max; dx += step) tryAt(dx, dy);
  const c = { ...best };
  for (let dy = c.dy - step; dy <= c.dy + step; dy++) for (let dx = c.dx - step; dx <= c.dx + step; dx++) tryAt(dx, dy);
  best.iou = Math.round(best.iou * 1000) / 1000;
  return best;
}
/** Shift an image by (dx, dy), same size (what falls off is dropped). */
export function shift(img, dx, dy) { return crop(img, -dx, -dy, img.width, img.height); }
