// Real terrain and horizons for the scene tools (docs/dev/SCENE_ENGINE_V2.md 18; builder E). Node >= 20, no dependencies.
// AUTHORING TIME ONLY: the heights are sampled here and written into the recipe as plain data (ridges, skyline, camera.alt, relief).
//
//   terrariumHeight(r, g, b)               -> metres: R * 256 + G + B / 256 - 32768 (the Terrain Tiles "terrarium" encoding)
//   decodeTerrarium(png)                   -> { width, height, h: Float32Array } (pngDecode from scene-capture.mjs)
//   terrariumSource({ fetch, cacheDir, refresh, offline, url, now, log })  a height source over the open Terrain Tiles (AWS Open Data):
//                                             { name, area(lat, lon), async ensure(points [[lat, lon]], z), heightAt(lat, lon, z), fetched, tiles }
//   os50Source({ dir })                    the same interface over local OS Terrain 50 ASCII-grid tiles (.asc, British National Grid)
//   curvatureDrop(d, k = 0.13)             -> metres: d^2 / (2R) * (1 - k) (earth curvature less refraction)
//   terrainRidges(heightAt, cam, opts)     -> { alt, eyeAlt, ridges: [{ band, d, pts: [[X, Y], ...] }], skyline: [[X, Y], ...], rays } (pure: heightAt(lat, lon) metres)
//   terrainRelief(heightAt, cam, opts)     -> { x, d, nx, nd, h, src: 'terrain' }: a 7 x 9 grid of heights relative to the camera's ground (V2 2.4)
//   terrainSample(cam, { source, range, rays, step, relief, z })   -> recipe sections { terrain, camera: { alt }, ground?: { relief }, source: { terrain } }
//   terrainArea(lat, lon)                  -> 'gb' | 'eu' | 'world': which credit lines apply (70-scene-1credit.js)
//
// Screen rows follow the camera of V2 2.2 exactly: a point at bearing phi off the axis and elevation angle a is at
// X = x0 + f * tan(phi), Y = horizon - f * tan(a) / cos(phi) (the same as Y = horizon + f * (eye - h) / d with d the forward distance).
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { pngDecode } from './scene-capture.mjs';
import { groundOf, tileXY, simplify, wgs84ToBng } from './geo.mjs';
import { USER_AGENT } from './osm-fetch.mjs';

export const TERRARIUM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
export const R_EARTH_M = 6371000;
const RAD = Math.PI / 180, DAY = 86400000;
export const TERRAIN_BANDS = Object.freeze([{ band: 'near', d: [500, 2000] }, { band: 'mid', d: [2000, 6000] }, { band: 'far', d: [6000, Infinity] }]);

export const terrariumHeight = (r, g, b) => r * 256 + g + b / 256 - 32768;
export const curvatureDrop = (d, k = 0.13) => d * d / (2 * R_EARTH_M) * (1 - k);
export function terrainArea(lat, lon) {
  if (lat >= 49.8 && lat <= 60.95 && lon >= -8.7 && lon <= 1.9) return 'gb';
  if (lat >= 34 && lat <= 72 && lon >= -25 && lon <= 45) return 'eu';
  return 'world';
}
export function decodeTerrarium(buf) {
  const img = pngDecode(buf), h = new Float32Array(img.width * img.height);
  for (let i = 0, j = 0; i < h.length; i++, j += 4) h[i] = terrariumHeight(img.data[j], img.data[j + 1], img.data[j + 2]);
  return { width: img.width, height: img.height, h };
}

/** A height source over the Terrain Tiles (terrarium PNGs), cached a year in <cacheDir>/terrain/terrarium/z/x/y.png. */
export function terrariumSource({ fetch = globalThis.fetch, cacheDir = null, refresh = false, offline = false, url = TERRARIUM_URL, now = Date.now, log = () => {}, maxAgeDays = 365 } = {}) {
  const tiles = new Map();
  let fetched = null, requests = 0;
  const fileOf = (z, x, y) => cacheDir ? join(cacheDir, 'terrain', 'terrarium', String(z), String(x), y + '.png') : null;
  async function load(z, x, y) {
    const key = `${z}/${x}/${y}`;
    if (tiles.has(key)) return tiles.get(key);
    const file = fileOf(z, x, y), t = typeof now === 'function' ? now() : now;
    let buf = null;
    if (file && existsSync(file) && !refresh) {
      const age = t - statSync(file).mtimeMs;
      if (age < maxAgeDays * DAY || offline) { buf = readFileSync(file); fetched = fetched || new Date(statSync(file).mtimeMs).toISOString().slice(0, 10); }
    }
    if (!buf) {
      if (offline) throw new Error(`terrain tile ${key} is not cached and --offline is set (run once without --offline)`);
      if (typeof fetch !== 'function') throw new Error('no fetch available');
      const u = url.replace('{z}', z).replace('{x}', x).replace('{y}', y);
      let res;
      try { res = await fetch(u, { headers: { 'User-Agent': USER_AGENT } }); } catch (e) { throw new Error(`terrain tile ${key} could not be fetched: ${e.message}`); }
      requests++;
      if (res.status === 404) { tiles.set(key, null); return null; }
      if (!res.ok) throw new Error(`terrain tile ${key}: the server answered ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
      if (file) { mkdirSync(join(file, '..'), { recursive: true }); const tmp = file + '.' + process.pid + '.tmp'; writeFileSync(tmp, buf); renameSync(tmp, file); }
      fetched = new Date(t).toISOString().slice(0, 10);
    }
    const dec = decodeTerrarium(buf);
    tiles.set(key, dec);
    return dec;
  }
  const n = (z) => 2 ** z;
  /** The raw height at a global pixel (integer) of zoom z, or NaN when its tile is not loaded. */
  const px = (z, gx, gy) => {
    const N = n(z) * 256; gx = ((gx % N) + N) % N; gy = Math.max(0, Math.min(N - 1, gy));
    const t = tiles.get(`${z}/${Math.floor(gx / 256)}/${Math.floor(gy / 256)}`);
    return t ? t.h[(gy % 256) * t.width + (gx % 256)] : NaN;
  };
  return {
    name: 'terrarium',
    get fetched() { return fetched; }, get requests() { return requests; }, tiles,
    area: terrainArea,
    async ensure(points, z) {
      const need = new Set();
      // each point's tile, plus the neighbour tiles its bilinear stencil reaches near a tile edge
      for (const [lat, lon] of points) { const t = tileXY(lat, lon, z); for (const dx of [-1, 1]) for (const dy of [-1, 1]) need.add(`${Math.floor((t.x * 256 + dx) / 256)}/${Math.floor((t.y * 256 + dy) / 256)}`); }
      const list = [...need].sort();
      if (list.some(k => !tiles.has(`${z}/${k}`))) log(`terrain: ${list.length} tile(s) at zoom ${z}`);
      for (const k of list) { const [x, y] = k.split('/').map(Number); await load(z, x, y); }
      return list.length;
    },
    heightAt(lat, lon, z = 12) {
      const t = tileXY(lat, lon, z), gx = t.x * 256 - 0.5, gy = t.y * 256 - 0.5, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const a = px(z, x0, y0), b = px(z, x0 + 1, y0), c = px(z, x0, y0 + 1), d = px(z, x0 + 1, y0 + 1);
      return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
    },
  };
}

/** A height source over local OS Terrain 50 ASCII grids (.asc in `dir`, any depth): Contains OS data (c) Crown copyright (OGL v3). */
export function os50Source({ dir }) {
  if (!dir || !existsSync(dir)) throw new Error(`--dem-dir ${dir || ''}: no such folder of OS Terrain 50 .asc tiles`);
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.asc$/i.test(f)) files.push(p); } };
  walk(dir);
  const heads = files.map(file => {
    const txt = readFileSync(file, 'latin1').slice(0, 400), h = {};
    for (const line of txt.split(/\r?\n/).slice(0, 7)) { const m = /^\s*([a-z_]+)\s+(-?[\d.eE+-]+)\s*$/i.exec(line); if (m) h[m[1].toLowerCase()] = +m[2]; }
    const cs = h.cellsize, xll = h.xllcorner != null ? h.xllcorner : h.xllcenter - cs / 2, yll = h.yllcorner != null ? h.yllcorner : h.yllcenter - cs / 2;
    return { file, ncols: h.ncols, nrows: h.nrows, cs, xll, yll, nodata: h.nodata_value != null ? h.nodata_value : -9999, grid: null };
  }).filter(h => h.ncols > 0 && h.nrows > 0 && h.cs > 0);
  if (!heads.length) throw new Error(`--dem-dir ${dir}: no readable .asc tiles`);
  const gridOf = (t) => {
    if (t.grid) return t.grid;
    const nums = readFileSync(t.file, 'latin1').split(/\r?\n/).filter(l => !/^\s*[a-z_]/i.test(l)).join(' ').trim().split(/\s+/).map(Number);
    t.grid = Float32Array.from(nums.slice(0, t.ncols * t.nrows), v => v === t.nodata ? NaN : v);
    return t.grid;
  };
  const at = (e, n) => {
    for (const t of heads) {
      if (e < t.xll || n < t.yll || e >= t.xll + t.ncols * t.cs || n >= t.yll + t.nrows * t.cs) continue;
      const g = gridOf(t), cx = (e - t.xll) / t.cs - 0.5, cy = (t.yll + t.nrows * t.cs - n) / t.cs - 0.5;
      const c0 = Math.max(0, Math.min(t.ncols - 1, Math.floor(cx))), r0 = Math.max(0, Math.min(t.nrows - 1, Math.floor(cy)));
      const c1 = Math.min(t.ncols - 1, c0 + 1), r1 = Math.min(t.nrows - 1, r0 + 1), fx = Math.max(0, Math.min(1, cx - c0)), fy = Math.max(0, Math.min(1, cy - r0));
      const v = (r, c) => g[r * t.ncols + c];
      return (v(r0, c0) * (1 - fx) + v(r0, c1) * fx) * (1 - fy) + (v(r1, c0) * (1 - fx) + v(r1, c1) * fx) * fy;
    }
    return NaN;
  };
  return { name: 'os50', fetched: null, area: () => 'gb', tiles: heads, async ensure() { return heads.length; }, heightAt(lat, lon) { const [e, n] = wgs84ToBng(lat, lon); return at(e, n); }, atGrid: at };
}

const RAYS = 161;
/** The ray directions of a camera: bearing phi (degrees off the axis) across fov * 1.1, and their screen columns. */
function raysOf(C, n = RAYS) {
  const span = C.fov * 1.1, out = [];
  for (let i = 0; i < n; i++) { const phi = -span / 2 + span * i / (n - 1); out.push({ phi, X: C.x0 + C.f * Math.tan(phi * RAD), c: Math.cos(phi * RAD), s: Math.sin(phi * RAD) }); }
  return out;
}
const camOf = (cam) => {
  const fov = +cam.fov || 66, f = 800 / Math.tan(fov / 2 * RAD);
  return { lat: +cam.lat, lon: +cam.lon, heading: +cam.heading || 0, fov, eye: cam.eye != null ? +cam.eye : 1.65, horizon: cam.horizon != null ? +cam.horizon : 470, x0: cam.x0 != null ? +cam.x0 : 800, f };
};
/** The points a ridge scan samples ([lat, lon] list), so a source can fetch its tiles first. */
export function terrainSamplePoints(cam, { range = 25000, rays = RAYS, step = 30, near = 500 } = {}) {
  const C = camOf(cam), G = groundOf(C), pts = [[C.lat, C.lon]];
  for (const r of raysOf(C, rays)) for (let s = near; s <= range; s += step * 4) pts.push(G.fromGround(r.s * s, r.c * s));
  for (const r of raysOf(C, rays)) pts.push(G.fromGround(r.s * range, r.c * range));
  return pts;
}

/**
 * The ridges (V2 18.3). heightAt(lat, lon) -> metres (NaN where unknown). For each ray, samples every `step` m from `near` to `range`
 * give elevation angles atan((h - eyeAlt - drop) / s); per band the maximum per ray is a silhouette (dropped when it never rises above
 * the farther ones), as screen rows, simplified to about `maxPts` points and rounded to 1 unit. The skyline is the overall maximum.
 */
export function terrainRidges(heightAt, cam, { range = 25000, rays = RAYS, step = 30, near = 500, alt = null, maxPts = 60, bands = TERRAIN_BANDS } = {}) {
  const C = camOf(cam), G = groundOf(C);
  const a0 = alt != null ? alt : heightAt(C.lat, C.lon);
  if (!Number.isFinite(a0)) throw new Error('no height at the camera (is it inside the data?)');
  const eyeAlt = a0 + C.eye, R = raysOf(C, rays);
  const nb = bands.length, best = bands.map(() => R.map(() => ({ a: -Infinity, d: NaN }))), sky = R.map(() => ({ a: -Infinity, d: NaN }));
  let known = 0;
  R.forEach((r, i) => {
    for (let s = near; s <= range + 1e-6; s += step) {
      const [lat, lon] = G.fromGround(r.s * s, r.c * s), h = heightAt(lat, lon);
      if (!Number.isFinite(h)) continue;
      known++;
      const a = Math.atan((h - eyeAlt - curvatureDrop(s)) / s);
      const b = bands.findIndex(B => s >= B.d[0] && s < B.d[1]);
      if (b >= 0 && a > best[b][i].a) best[b][i] = { a, d: s * r.c };
      if (a > sky[i].a) sky[i] = { a, d: s * r.c };
    }
  });
  if (!known) throw new Error('no terrain heights along the view (no data, or the tiles are missing)');
  const rowOf = (a, r) => C.horizon - C.f * Math.tan(a) / r.c;
  const toPts = (line) => {
    const raw = line.map((v, i) => [R[i].X, Math.max(-300, Math.min(1200, rowOf(v.a, R[i])))]).filter(p => Number.isFinite(p[1]));
    let tol = 0.4, s = simplify(raw, tol);
    while (s.length > maxPts && tol < 50) { tol *= 1.35; s = simplify(raw, tol); }
    const out = []; for (const p of s) { const q = [Math.round(p[0]), Math.round(p[1])]; if (!out.length || out[out.length - 1][0] !== q[0]) out.push(q); }
    return out;
  };
  // A band's silhouette is kept when it shows: somewhere it is not hidden by a nearer silhouette (higher on screen), it differs from
  // the farther ones by more than a unit (a layer of its own, above or in front of them), and it is not flat land on the horizon.
  // (From a summit every band lies below eye level and still reads as a layer; at street level flat land is dropped.)
  // one hill across a band edge (its slope in one band, its top in the next) is one silhouette: bands whose typical depths are within
  // 30 % of each other are merged (the maximum angle per ray) into the one that stands higher (more rays where it is the top)
  const medD = (b) => { const ds = best[b].map(v => v.d).filter(Number.isFinite).sort((p, q) => p - q); return ds.length ? ds[Math.floor(ds.length / 2)] : NaN; };
  for (let b = 0; b < nb - 1; b++) {
    const dn = medD(b), df = medD(b + 1);
    if (!(dn > 0 && df > 0) || dn / df < 0.7) continue;
    const nearTop = best[b].filter((v, i) => v.a > best[b + 1][i].a).length * 2 > best[b].length;
    const [keep, drop] = nearTop ? [b, b + 1] : [b + 1, b];
    best[keep] = best[keep].map((v, i) => (best[drop][i].a > v.a ? best[drop][i] : v));
    best[drop] = best[drop].map(() => ({ a: -Infinity, d: NaN }));
    if (nearTop) b++;   // the farther band is consumed; go on from the next pair
  }
  const ridges = [], rowsOf = (b) => best[b].map((v, i) => v.a > -Infinity ? rowOf(v.a, R[i]) : NaN);
  const rows = bands.map((_, b) => rowsOf(b));
  for (let b = nb - 1; b >= 0; b--) {
    const line = best[b], rb = rows[b];
    if (rb.every(y => !Number.isFinite(y))) continue;
    const keep = rb.some((y, i) => {
      if (!Number.isFinite(y) || Math.abs(y - C.horizon) <= 1.5) return false;                       // flat land on the horizon
      for (let c = 0; c < b; c++) if (rows[c][i] <= y - 0.5) return false;                             // hidden by a nearer silhouette
      let farTop = Infinity; for (let c = b + 1; c < nb; c++) if (Number.isFinite(rows[c][i])) farTop = Math.min(farTop, rows[c][i]);
      return !Number.isFinite(farTop) || Math.abs(y - farTop) > 1;                                    // a layer of its own
    });
    if (!keep) continue;
    const ds = line.map(v => v.d).filter(Number.isFinite).sort((p, q) => p - q), fill = line.find(w => w.a > -Infinity);
    ridges.push({ band: bands[b].band, d: Math.round(ds[Math.floor(ds.length / 2)] / 10) * 10, pts: toPts(line.map(v => v.a === -Infinity ? fill : v)) });
  }
  ridges.sort((p, q) => q.d - p.d);
  return { alt: Math.round(a0 * 10) / 10, eyeAlt: Math.round(eyeAlt * 10) / 10, ridges, skyline: toPts(sky.map(v => v.a === -Infinity ? { a: 0 } : v)), rays: R.length, samples: known };
}

/** A 7 x 9 relief grid (V2 2.4): x from -300 to 300, d log-spaced from 5 to 1200, heights relative to the camera's ground. */
export function terrainRelief(heightAt, cam, { x = [-300, 300], d = [5, 1200], nx = 7, nd = 9, alt = null } = {}) {
  const C = camOf(cam), G = groundOf(C), a0 = alt != null ? alt : heightAt(C.lat, C.lon), h = [];
  for (let j = 0; j < nd; j++) {
    const dj = Math.exp(Math.log(d[0]) + (Math.log(d[1]) - Math.log(d[0])) * j / (nd - 1));
    for (let i = 0; i < nx; i++) { const xi = x[0] + (x[1] - x[0]) * i / (nx - 1), [lat, lon] = G.fromGround(xi, dj), v = heightAt(lat, lon); h.push(Number.isFinite(v) ? Math.round((v - a0) * 10) / 10 : 0); }
  }
  return { x, d, nx, nd, h, src: 'terrain' };
}

/** The whole command's computation: recipe sections from a height source (the composer calls this too). */
export async function terrainSample(cam, { source, range = 25000, rays = RAYS, step = 30, relief = false, z = 12, zNear = 14, log = () => {} } = {}) {
  if (!source) throw new Error('terrainSample needs a source (terrariumSource or os50Source)');
  const C = camOf(cam);
  await source.ensure([[C.lat, C.lon]], zNear);
  const alt = source.heightAt(C.lat, C.lon, zNear);
  await source.ensure(terrainSamplePoints(C, { range, rays, step }), z);
  const r = terrainRidges((la, lo) => source.heightAt(la, lo, z), C, { range, rays, step, alt });
  const out = {
    terrain: { src: source.name, ridges: r.ridges, skyline: r.skyline, cam: { heading: C.heading, fov: C.fov, horizon: C.horizon, eye: C.eye, range } },
    camera: { alt: r.alt },
    source: { terrain: { src: source.name, fetched: source.fetched || new Date().toISOString().slice(0, 10), area: source.area(C.lat, C.lon) } },
    stats: { samples: r.samples, rays: r.rays, tiles: source.tiles.size || source.tiles.length || 0, requests: source.requests || 0, eyeAlt: r.eyeAlt },
  };
  if (relief) {
    const pts = [];
    terrainRelief((la, lo) => { pts.push([la, lo]); return 0; }, C, { alt: 0 });   // the grid's sample points, so their tiles load first
    await source.ensure(pts, zNear);
    out.ground = { relief: terrainRelief((la, lo) => source.heightAt(la, lo, zNear), C, { alt }) };
  }
  log(`terrain: camera ground ${r.alt} m, eye ${r.eyeAlt} m above sea level; ${r.ridges.length} ridge(s)`);
  return out;
}
