// The model sheet (docs/dev/WORLD_MODELS.md): every parametric model (79-world-4models.js) on one contact sheet, drawn in Node with a
// small software rasteriser (no browser): from N angles, in the four seasons, noon / golden hour / night, afloat where it floats
// (waterline, bob, reflection), at three sizes, in its liveries and ages, beside the old library sprite when there is one.
// Node >= 20, no dependencies. What the sheet draws is the model's own faces: the same prim the renderer draws, coloured by the
// same material pass (worldMaterialColour), toned by the same sun (worldSunTone) and lit by the same window rule.
//
//   modelSheet(W, id, o) -> { file?, png: Buffer, width, height, cells: [{ label, faces, ms }], errors: [] }
//       o: { angles (8), seasons (false), night (false), water (false: the afloat row), full, out (dir; writes <id>.png), eye (1.65) }
//   modelSheetAll(W, o) -> [{ id, file, ... }] one sheet per registered model, plus an overview strip
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pngEncode } from '../png.mjs';

/* ---------- a software canvas ---------- */
const hexRgb = (h) => { const s = String(h || '#808080').replace('#', ''), n = parseInt(s.length === 3 ? s.replace(/./g, '$&$&') : s, 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
class Canvas {
  constructor(w, h, bg) { this.w = w; this.h = h; this.d = new Float32Array(w * h * 3); if (bg) this.clear(bg); }
  clear(bg) { const c = hexRgb(bg); for (let i = 0; i < this.w * this.h; i++) { this.d[i * 3] = c[0]; this.d[i * 3 + 1] = c[1]; this.d[i * 3 + 2] = c[2]; } }
  /** Fill a polygon (even-odd, scanline at pixel centres) with an rgb colour at an alpha. */
  poly(pts, rgb, a = 1, clip) {
    if (!pts || pts.length < 3) return;
    let y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const cy0 = Math.max(clip ? clip[1] : 0, Math.floor(y0)), cy1 = Math.min(clip ? clip[3] : this.h, Math.ceil(y1));
    const xs = [];
    for (let y = cy0; y < cy1; y++) {
      const yc = y + 0.5; xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const A = pts[i], B = pts[j];
        if ((A[1] > yc) !== (B[1] > yc)) xs.push(A[0] + (yc - A[1]) / (B[1] - A[1]) * (B[0] - A[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(clip ? clip[0] : 0, Math.round(xs[k])), xb = Math.min(clip ? clip[2] : this.w, Math.round(xs[k + 1]));
        for (let x = xa; x < xb; x++) {
          const o = (y * this.w + x) * 3;
          this.d[o] += (rgb[0] - this.d[o]) * a; this.d[o + 1] += (rgb[1] - this.d[o + 1]) * a; this.d[o + 2] += (rgb[2] - this.d[o + 2]) * a;
        }
      }
    }
  }
  /** A polyline of width w (pixels) as quads and round joints. */
  stroke(pts, w, rgb, a = 1, clip) {
    const r = Math.max(0.5, w / 2);
    for (let i = 1; i < pts.length; i++) {
      const A = pts[i - 1], B = pts[i], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * r, ny = dx / L * r;
      this.poly([[A[0] + nx, A[1] + ny], [B[0] + nx, B[1] + ny], [B[0] - nx, B[1] - ny], [A[0] - nx, A[1] - ny]], rgb, a, clip);
    }
    if (r > 1.2) for (const p of pts) this.disc(p[0], p[1], r, rgb, a, clip);
  }
  disc(cx, cy, r, rgb, a = 1, clip) { const n = 10, pts = []; for (let k = 0; k < n; k++) { const t = k / n * Math.PI * 2; pts.push([cx + Math.cos(t) * r, cy + Math.sin(t) * r]); } this.poly(pts, rgb, a, clip); }
  /** A soft glow (radial falloff), additive. */
  glow(cx, cy, r, rgb, a = 0.3, clip) {
    const x0 = Math.max(clip ? clip[0] : 0, Math.floor(cx - r)), x1 = Math.min(clip ? clip[2] : this.w, Math.ceil(cx + r)), y0 = Math.max(clip ? clip[1] : 0, Math.floor(cy - r)), y1 = Math.min(clip ? clip[3] : this.h, Math.ceil(cy + r));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const k = 1 - Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
      if (k <= 0) continue;
      const o = (y * this.w + x) * 3, t = a * k * k;
      for (let c = 0; c < 3; c++) this.d[o + c] = Math.min(255, this.d[o + c] + (rgb[c] - this.d[o + c]) * t);
    }
  }
  rect(x0, y0, x1, y1, rgb, a = 1) { this.poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], rgb, a); }
  /** Box-downsample by k into a new canvas. */
  down(k) {
    const W = Math.floor(this.w / k), H = Math.floor(this.h / k), o = new Canvas(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) { let s = 0; for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) s += this.d[((y * k + j) * this.w + x * k + i) * 3 + c]; o.d[(y * W + x) * 3 + c] = s / (k * k); }
    }
    return o;
  }
  /** Copy another canvas into this one at (x, y). */
  blit(src, x, y) { for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) { const X = x + i, Y = y + j; if (X < 0 || Y < 0 || X >= this.w || Y >= this.h) continue; for (let c = 0; c < 3; c++) this.d[(Y * this.w + X) * 3 + c] = src.d[(j * src.w + i) * 3 + c]; } }
  png() {
    const data = new Uint8Array(this.w * this.h * 4);
    for (let i = 0; i < this.w * this.h; i++) { for (let c = 0; c < 3; c++) data[i * 4 + c] = Math.max(0, Math.min(255, Math.round(this.d[i * 3 + c]))); data[i * 4 + 3] = 255; }
    return pngEncode({ width: this.w, height: this.h, data });
  }
}
/* ---------- a 3 x 5 font for the labels ---------- */
const FONT = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111',
  A: '111101111101101', B: '110101110101110', C: '111100100100111', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '111100101101111', H: '101101111101101', I: '111010010010111', J: '001001001101111',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '111101101101101', O: '111101101101111', P: '111101111100100', Q: '111101101111001', R: '111101110101101', S: '111100111001111', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '-': '000000111000000', '.': '000000000000010', ':': '000010000010000', '/': '001001010100100', x: '000101010101000', '+': '000010111010000', ',': '000000000010100', '=': '000111000111000', _: '000000000000111', '#': '101111101111101', '(': '010100100100010', ')': '010001001001010',
};
function text(cv, s, x, y, k, rgb) {
  for (const ch of String(s).toUpperCase()) {
    const g = FONT[ch];
    if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') cv.rect(x + c * k, y + r * k, x + (c + 1) * k, y + (r + 1) * k, rgb);
    x += 4 * k;
  }
}
const textW = (s, k) => String(s).length * 4 * k;

/* ---------- the old library sprite (a v2 object: SVG paths) ---------- */
function flattenPath(d, m) {
  const t = String(d).match(/[MLHVQCZmlhvqcz]|-?\d*\.?\d+(?:e-?\d+)?/g) || [], out = [];
  let i = 0, x = 0, y = 0, sx = 0, sy = 0, cmd = 'M', cur = null;
  const num = () => parseFloat(t[i++]);
  const T = (px, py) => (Array.isArray(m) && m.length === 6 ? [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]] : [px, py]);
  const end = () => { if (cur && cur.length > 2) out.push(cur); cur = null; };
  while (i < t.length) {
    if (/[A-Za-z]/.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { end(); x = sx; y = sy; continue; }
    if (C === 'M' || C === 'L') { let nx = num(), ny = num(); if (rel) { nx += x; ny += y; } if (C === 'M') { end(); cur = [T(nx, ny)]; sx = nx; sy = ny; cmd = rel ? 'l' : 'L'; } else (cur || (cur = [T(x, y)])).push(T(nx, ny)); x = nx; y = ny; }
    else if (C === 'H') { let nx = num(); if (rel) nx += x; (cur || (cur = [T(x, y)])).push(T(nx, y)); x = nx; }
    else if (C === 'V') { let ny = num(); if (rel) ny += y; (cur || (cur = [T(x, y)])).push(T(x, ny)); y = ny; }
    else if (C === 'Q') { let a = num(), b = num(), c = num(), e = num(); if (rel) { a += x; b += y; c += x; e += y; } for (let k = 1; k <= 8; k++) { const u = k / 8; (cur || (cur = [T(x, y)])).push(T((1 - u) * (1 - u) * x + 2 * (1 - u) * u * a + u * u * c, (1 - u) * (1 - u) * y + 2 * (1 - u) * u * b + u * u * e)); } x = c; y = e; }
    else if (C === 'C') { let a = num(), b = num(), c = num(), e = num(), g = num(), k2 = num(); if (rel) { a += x; b += y; c += x; e += y; g += x; k2 += y; } for (let k = 1; k <= 10; k++) { const u = k / 10, v = 1 - u; (cur || (cur = [T(x, y)])).push(T(v * v * v * x + 3 * v * v * u * a + 3 * v * u * u * c + u * u * u * g, v * v * v * y + 3 * v * v * u * b + 3 * v * u * u * e + u * u * u * k2)); } x = g; y = k2; }
    else i++;
  }
  end();
  return out;
}
function drawSprite(cv, W, obj, v, season, cx, baseY, pxPerUnit, sky) {
  let sh = null;
  try { sh = W.sceneObjShapes(obj, v | 0, season || 'summer'); } catch { sh = null; }
  if (!sh) return false;
  const tone = (c) => (typeof c === 'string' && c[0] === '#' ? hexRgb(c) : null);
  let n = 0;
  for (const name of sh.still || sh.order) for (const s of sh.parts[name] || []) {
    const col = tone(s.f);
    if (!col || !s.d) continue;
    for (const poly of flattenPath(s.d, s.m)) { cv.poly(poly.map(([x, y]) => [cx + x * pxPerUnit, baseY + y * pxPerUnit]), col, s.op == null ? 1 : s.op); n++; }
  }
  void sky;
  return n > 0;
}

/* ---------- the scenarios ---------- */
const MOMENTS = {
  noon: { ms: Date.UTC(2026, 6, 16, 13), season: 'summer' },
  golden: { ms: Date.UTC(2026, 6, 16, 19, 25), season: 'summer' },
  night: { ms: Date.UTC(2026, 6, 16, 23, 30), season: 'summer' },
  spring: { ms: Date.UTC(2026, 3, 18, 13), season: 'spring' },
  summer: { ms: Date.UTC(2026, 6, 16, 13), season: 'summer' },
  autumn: { ms: Date.UTC(2026, 9, 22, 13), season: 'autumn' },
  winter: { ms: Date.UTC(2026, 0, 20, 12), season: 'winter' },
};
const SKY = { day: ['#8fc0ea', '#dbe9f1'], golden: ['#e8a870', '#fbe3b8'], night: ['#0a1124', '#1e2b45'] };
const GROUND = { spring: '#76a85a', summer: '#5f9150', autumn: '#8c8446', winter: '#dfe7ea' };
const WATER = { day: '#4f7d94', golden: '#6b7f8c', night: '#0d1828' };

function worldAt(W, mom) {
  const ctx = { ms: mom.ms, lat: 51.5, lon: -0.1, month: new Date(mom.ms).getUTCMonth() };
  let sky = null;
  try { sky = W.worldSkyOf(ctx); } catch { sky = null; }
  const mc = W.worldMaterialCtx(Object.assign({ season: mom.season }, ctx), { sky });
  const night = !!(sky && sky.dark > 0.5), golden = !!(sky && !night && sky.sun && sky.sun.alt < 14);
  return { sky, mc, night, golden, share: sky && Number.isFinite(sky.windowShare) ? sky.windowShare : 0.6, tone: night ? 'night' : golden ? 'golden' : 'day', season: mom.season };
}
const firstObj = (def) => def.sampleObj || (def.ids || []).find(x => typeof x === 'string' && !x.endsWith('*')) || null;

/** Draw one prim at the transform (device = o + s * (scene - c)), coloured and lit as the renderer does. */
function drawPrim(cv, W, prim, T, sc, clip, alphaK = 1) {
  if (!prim || !prim.faces) return 0;
  const colour = (f) => {
    let hex = f.hex;
    if (sc.sun && f.n && prim.sunLit) { try { hex = W.worldSunTone(hex, f.n, sc.sun); } catch { /* base */ } }
    try { const c = W.worldMaterialColour(f.mat, hex, Object.assign({}, sc.mc, { z: f.z })); if (typeof c === 'string') return c; } catch { /* base */ }
    return hex;
  };
  const P = (p) => [T.ox + (p[0] - T.cx) * T.s, T.oy + (p[1] - T.cy) * T.s];
  let n = 0;
  for (const f of prim.faces) {
    const on = sc.night && Number.isFinite(f.theta) && f.theta < sc.share && f.lit;
    const alpha = (f.alpha == null ? 1 : f.alpha) * alphaK;
    if (f.line) {
      if (!f.pts || f.pts.length < 2) continue;
      cv.stroke(f.pts.map(P), Math.max(0.6, (f.w || 1) * T.s), hexRgb(on ? f.lit : colour(f)), alpha, clip); n++;
    } else if (on) {
      const pts = f.pts.map(P);
      cv.poly(pts, hexRgb(f.lit), alphaK, clip); n++;
      if (f.halo && alphaK === 1) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        cv.glow((x0 + x1) / 2, (y0 + y1) / 2, Math.max(2, 1.6 * Math.max(x1 - x0, y1 - y0)), [255, 200, 120], 0.35, clip);
      }
    } else { cv.poly(f.pts.map(P), hexRgb(colour(f)), alpha, clip); n++; }
  }
  return n;
}

/** Build one cell's prim for a scenario { z, facing, moment, eye?, model?, t?, seed?, variant? }. */
function buildCell(W, def, spec, eye0) {
  const sc = worldAt(W, MOMENTS[spec.moment || 'summer']);
  const eye = spec.eye || eye0;
  const cam = W.sceneCamera({ camera: { eye, fov: 64, horizon: 468, heading: 0 } });
  const obj = firstObj(def), info = W.worldObjectInfo ? W.worldObjectInfo(obj) : null, wl = -0.45;
  const base = def.float ? wl : 0;
  const ent = { id: 'sheet-' + (spec.seed || 0), obj, x: 0, z: spec.z, y: def.float ? wl - ((info && info.sink) || 0.05) : 0, waterline: def.float ? wl : null, facing: spec.facing,
    variant: spec.variant | 0, static: spec.t == null, model: spec.model || null, vx: 0, vz: 0, anim: spec.t != null ? { t: spec.t, phase: 0 } : null };
  const prim = W.worldModelBuildWith(def.id, ent, cam, { season: sc.season, strict: true, t: spec.t });
  const sun = sc.sky && typeof W.worldSunLight === 'function' ? W.worldSunLight(sc.sky, cam) : null;
  return { prim, box: prim ? prim.box : null, sc: Object.assign({}, sc, { sun }), cam, base, baseRow: cam.horizon + cam.f * (cam.eye - base) / spec.z };
}
const fitScale = (box, w, h) => { const bw = Math.max(1, box[2] - box[0]), bh = Math.max(1, box[3] - box[1]); return Math.min((w * 0.86) / bw, (h * 0.66) / bh); };

/** One cell composited on its sky, ground or water: the model, and a faint mirror under it when it floats. */
function composeCell(W, def, r, scale, cell, ss) {
  const w = cell.w * ss, h = cell.h * ss, cv = new Canvas(w, h), tone = r.sc.tone, sk = SKY[tone];
  const b = r.box || [0, 0, 1, 1], s = scale || fitScale(b, w, h);
  const T = { s, cx: (b[0] + b[2]) / 2, cy: r.baseRow, ox: w / 2, oy: h * 0.74 };
  const horizonY = Math.max(0, Math.min(h, T.oy + (r.cam.horizon - r.baseRow) * s));
  const a = hexRgb(sk[0]), c = hexRgb(sk[1]);
  for (let y = 0; y < horizonY; y++) { const t = y / Math.max(1, horizonY); cv.rect(0, y, w, y + 1, a.map((v, i) => v + (c[i] - v) * t)); }
  const ground = hexRgb(GROUND[r.sc.season]).map(v => v * (r.sc.night ? 0.22 : r.sc.golden ? 0.85 : 1));
  cv.rect(0, horizonY, w, h, ground);
  if (def.float) {
    const wc = hexRgb(WATER[tone]);
    for (let y = Math.floor(horizonY); y < h; y++) { const t = (y - horizonY) / Math.max(1, h - horizonY); cv.rect(0, y, w, y + 1, wc.map(v => Math.min(255, v * (1.12 - 0.3 * t)))); }
  }
  const clip = [0, 0, w, h];
  if (def.float && r.prim) {
    const row = r.baseRow, flipped = { faces: r.prim.faces.map(f => Object.assign({}, f, { pts: f.pts.map(p => [p[0], 2 * row - p[1]]) })), sunLit: r.prim.sunLit };
    drawPrim(cv, W, flipped, T, r.sc, [0, Math.floor(T.oy), w, h], 0.3);
  }
  const n = drawPrim(cv, W, r.prim, T, r.sc, clip);
  return { cv: cv.down(ss), faces: n, scale: s };
}

/** The old library sprite in a cell, at the same pixels per metre as the model's row. */
function spriteCell(W, def, info, pxPerMetre, cell, ss) {
  const w = cell.w * ss, h = cell.h * ss, cv = new Canvas(w, h), sc = worldAt(W, MOMENTS.summer), obj = firstObj(def);
  const hz = h * 0.74 - (info && info.size ? info.size.h * pxPerMetre * 0.0 : 0);
  for (let y = 0; y < h * 0.74; y++) { const t = y / (h * 0.74), a = hexRgb(SKY[sc.tone][0]), c = hexRgb(SKY[sc.tone][1]); cv.rect(0, y, w, y + 1, a.map((v, k) => v + (c[k] - v) * t)); }
  cv.rect(0, hz, w, h, hexRgb(GROUND.summer));
  const sdef = W.sceneObj(obj), hM = info && info.size ? info.size.h : 1, unitsPerM = sdef && sdef.size ? sdef.size[1] / hM : 1;
  const ok = drawSprite(cv, W, obj, 0, 'summer', w / 2, h * 0.74, pxPerMetre / unitsPerM, sc.sky);
  const out = cv.down(ss);
  if (!ok) text(out, 'NO SPRITE', 20, 20, 3, [255, 255, 255]);
  return out;
}

/** The registered definition of a model id or an object id. */
function resolveDef(W, idOrObj) {
  return (typeof W.worldModelGet === 'function' && W.worldModelGet(idOrObj)) || (typeof W.worldModelFor === 'function' && W.worldModelFor(idOrObj)) || null;
}

/** Compose a model's sheet. See the header. */
export function modelSheet(W, id, o = {}) {
  const D = resolveDef(W, id);
  if (!D) throw new Error(`no model '${id}' (registered: ${W.worldModelIds().join(', ')})`);
  const errors = [], ss = 2, cell = { w: 440, h: 320 }, eye = o.eye || 1.65, cols = 4;
  const nAng = Math.max(4, Math.min(16, o.angles | 0 || 8));
  const obj = firstObj(D), info = W.worldObjectInfo && obj ? W.worldObjectInfo(obj) : null;
  const p0 = W.worldModelParams({ id: 'sheet-0', obj, x: 0, z: 10, model: null }, {}, D);
  const dim = Math.max(p0.L, p0.B, p0.H, 0.4), z = Math.max(5, 2.4 * dim);
  const base = (extra) => Object.assign({ z, facing: 135, moment: 'summer', seed: 1 }, extra || {});
  const rows = [];
  rows.push({ title: `${nAng} ANGLES (NOON, SUMMER, EYE ${eye} M)`, cells: Array.from({ length: nAng }, (_, k) => { const a = Math.round(k * 360 / nAng); return { label: `FACING ${a}`, spec: base({ facing: a }) }; }) });
  if (o.seasons || o.full) rows.push({ title: 'FOUR SEASONS', cells: ['spring', 'summer', 'autumn', 'winter'].map(m => ({ label: m, spec: base({ moment: m, facing: 60 }) })) });
  if (o.night || o.full) rows.push({ title: 'LIGHT: NOON, GOLDEN HOUR, NIGHT (LIT WINDOWS AND LAMPS)', cells: ['noon', 'golden', 'night'].map(m => ({ label: m, spec: base({ moment: m, facing: 60 }) })).concat([{ label: 'night end-on', spec: base({ moment: 'night', facing: 160 }) }]) });
  if ((o.water || o.full) && D.float) rows.push({ title: 'AFLOAT: WATERLINE, BOB AT FOUR MOMENTS, REFLECTION', cells: [0, 1.7, 3.4, 5.1].map(t => ({ label: `BOB T=${t}`, spec: base({ facing: 70, t }) })) });
  rows.push({ title: 'THREE SIZES (SAME CAMERA)', cells: [0.65, 1, 1.5].map(k => ({ label: `SIZE x${k}`, spec: base({ facing: 60, model: { size: k } }) })) });
  const names = (typeof D.liveries === 'function' ? D.liveries() : D.liveries) || [];
  const samples = (Array.isArray(D.samples) ? D.samples : []).slice(0, 4);
  while (samples.length < 4) { const k = samples.length, n = Array.isArray(names) ? names.length : 0; samples.push({ seed: k + 11, age: [0.1, 0.4, 0.7, 0.95][k], livery: n ? (names[k % n].name != null ? names[k % n].name : k % n) : null }); }
  rows.push({ title: 'ONE MODEL, MANY INSTANCES (LIVERY, AGE, SEED)', cells: samples.map((m, k) => ({ label: [m.livery != null ? 'LIVERY ' + m.livery : 'SEED ' + (m.seed || k), m.age != null ? 'AGE ' + m.age : '', m.size ? 'x' + m.size : ''].filter(Boolean).join(' '), spec: base({ facing: 50 + k * 17, seed: 3 + k, model: Object.assign({ seed: 3 + k }, m) }) })) });
  const hasSprite = !!(obj && typeof W.sceneObj === 'function' && W.sceneObj(obj));
  const sideCells = [{ label: 'MODEL SIDE', spec: base({ facing: 90 }) }, { label: 'MODEL END-ON', spec: base({ facing: 180 }) }, { label: 'MODEL 3/4 FROM ABOVE', spec: base({ facing: 135, eye: 4 }) }];
  rows.push({ title: hasSprite ? 'THE OLD LIBRARY SPRITE (LEFT) BESIDE THE MODEL' : 'SIDE, END AND FROM ABOVE (NO LIBRARY SPRITE)', cells: hasSprite ? [{ label: 'OLD SPRITE', sprite: true }].concat(sideCells) : sideCells });
  // layout
  const rowH = cell.h + 26, W2 = cols * cell.w, head = 62;
  const total = head + rows.reduce((n, r) => n + 28 + Math.ceil(r.cells.length / cols) * rowH, 0) + 8;
  const out = new Canvas(W2, total, '#14171c');
  text(out, `${D.id.toUpperCase()}  (${D.name})`, 12, 10, 4, [235, 235, 235]);
  const sizeTxt = `${p0.L.toFixed(1)} X ${p0.B.toFixed(1)} X ${p0.H.toFixed(1)} M`;
  text(out, `OBJECTS ${(D.ids || []).map(String).join(' ')}   FLOATS ${D.float ? 'YES' : 'NO'}   SIZE ${sizeTxt}`.slice(0, 160), 12, 38, 2, [170, 180, 190]);
  let y = head;
  const cells = [];
  for (const row of rows) {
    text(out, row.title, 12, y + 6, 2, [200, 210, 120]);
    y += 28;
    const built = row.cells.map(c => { if (c.sprite) return null; try { return buildCell(W, D, c.spec, eye); } catch (e) { errors.push(`${c.label}: ${e.message}`); return null; } });
    let sMin = Infinity;
    for (const b of built) if (b && b.box) sMin = Math.min(sMin, fitScale(b.box, cell.w * ss, cell.h * ss));
    const sRow = Number.isFinite(sMin) ? sMin : null;
    row.cells.forEach((c, i) => {
      const x0 = (i % cols) * cell.w, y0 = y + Math.floor(i / cols) * rowH;
      let cv = null;
      if (c.sprite) cv = spriteCell(W, D, info, (W.sceneCamera({ camera: { eye, fov: 64, horizon: 468, heading: 0 } }).f / z) * (sRow || 1), cell, ss);
      else if (built[i] && built[i].prim) { const r = composeCell(W, D, built[i], sRow, cell, ss); cv = r.cv; cells.push({ label: c.label, faces: r.faces }); }
      else if (built[i] && !built[i].prim) errors.push(`${c.label}: the model drew nothing`);
      if (!cv) { cv = new Canvas(cell.w, cell.h, '#3a1c1c'); text(cv, 'BUILD FAILED', 20, 20, 3, [255, 200, 200]); }
      out.blit(cv, x0, y0);
      text(out, c.label, x0 + 8, y0 + cell.h + 7, 2, [225, 225, 225]);
    });
    y += Math.ceil(row.cells.length / cols) * rowH;
  }
  const png = out.png();
  let file = null;
  if (o.out) { mkdirSync(o.out, { recursive: true }); file = join(o.out, `${D.id}.png`); writeFileSync(file, png); }
  return { file, png, width: out.w, height: out.h, cells, errors, id: D.id };
}

/** One sheet per registered model. */
export function modelSheetAll(W, o = {}) {
  const res = [];
  for (const id of W.worldModelIds()) { try { res.push(modelSheet(W, id, o)); } catch (e) { res.push({ id, file: null, errors: [e.message], cells: [] }); } }
  return res;
}
