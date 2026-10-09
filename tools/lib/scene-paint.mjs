// Painted scenes (docs/dev/PAINTED_SCENES.md): a whole location as one 1600 x 900 painting plus aligned edit-variants and masks,
// turned into raster library objects and a scene scaffold. Node >= 20, no dependencies; decoding, resizing and WebP encoding run
// in headless Chrome (tools/release-chrome.mjs), the mask and alignment work here.
//
//   the inputs folder (ai-objects/inbox/<batch>/ by convention)
//     summer.png (or base.png)                 the master painting, 16:9 (any size; resized to 1600 x 900)
//     spring.png autumn.png winter.png night.png   edit-variants of the SAME image (optional; a missing season is derived by the
//                                              raster colour matrices, a missing night by the live grade)
//     sky.png water.png front.png              masks (optional): white (or any bright opaque colour) = inside, black or transparent = outside
//     paint.json                               optional: { label, lat, lon, heading, horizon, water: [[x, y], ...], front: [[x, y], ...],
//                                              sky: [[x, y], ...] } polygons in 1600 x 900 pixels, for masks there is no PNG for
//
//   PAINT_W, PAINT_H, PAINT_BUDGET
//   readPaintInputs(folder)                  -> { files: { summer, spring, ... , sky, water, front }, cfg }
//   decodeAll(chrome, files)                 -> { name: img } every input decoded and resized to 1600 x 900 (RGBA8)
//   maskOf(img) / polyMask(pts) / deriveSky(img) / feather(mask)   masks: Uint8Array 0..255 of 1600 x 900
//   horizonOf(sky)                           -> the row where the sky ends (median of the columns)
//   alignDrift(ref, img)                     -> { dx, dy, px, score }: the shift (full-size px) that best aligns img's edges to ref's
//   cut(img, mask, invert)                   -> img with alpha * mask (or * (1 - mask))
//   encodeWebp(chrome, img, q)               -> Buffer (image/webp)
//   paintImport(root, { folder, pack, id, ... , chrome }) -> the report (writes assets/objects/ground/paint-<id>[-water|-front]/,
//                                              the masks, src/app/70-scene-lib-raster.js, and the scene and pack scaffolds)
//   paintLint(root, id, { E, C })            -> [{ name, ok, warn, value, message }]
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pngEncode, pngDecode, webpSize } from './png.mjs';
import { writeRasterLib } from './raster-assets.mjs';

export const PAINT_W = 1600, PAINT_H = 900;
/** Bytes per stored image (the painting is embedded in the page): warn and max, KB. */
export const PAINT_BUDGET = Object.freeze({ imageKB: { warn: 360, max: 720 }, sceneKB: { warn: 1600, max: 3200 }, drift: { warn: 8, max: 24 } });
const VARIANTS = ['summer', 'spring', 'autumn', 'winter', 'night'];
const MASKS = ['sky', 'water', 'front'];
const ID_RE = /^[a-z][a-z0-9-]{1,40}$/;

export function readPaintInputs(folder) {
  if (!existsSync(folder)) throw new Error(`no folder ${folder}`);
  const names = readdirSync(folder), files = {};
  const find = (base) => names.find(n => n.toLowerCase().replace(/\.(png|jpe?g|webp)$/, '') === base && /\.(png|jpe?g|webp)$/i.test(n));
  for (const n of VARIANTS.concat(MASKS)) { const f = find(n); if (f) files[n] = join(folder, f); }
  if (!files.summer) { const f = find('base'); if (f) files.summer = join(folder, f); }
  if (!files.summer) throw new Error(`${folder}: no summer.png (or base.png): the master painting`);
  let cfg = {};
  if (existsSync(join(folder, 'paint.json'))) { try { cfg = JSON.parse(readFileSync(join(folder, 'paint.json'), 'utf8')); } catch (e) { throw new Error(`${folder}/paint.json: ${e.message}`); } }
  return { files, cfg };
}

const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
/** Decode one file in Chrome, drawn to 1600 x 900 (stretched when the aspect is off by a little; the lint reports the aspect). */
async function decodeOne(chrome, file) {
  const b64 = readFileSync(file).toString('base64'), mime = MIME[extname(file).toLowerCase()] || 'image/png';
  const r = await chrome.evaluate(`(async () => {
    const im = new Image(); im.src = 'data:${mime};base64,${b64}'; await im.decode();
    const c = document.createElement('canvas'); c.width = ${PAINT_W}; c.height = ${PAINT_H};
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, ${PAINT_W}, ${PAINT_H});
    const px = x.getImageData(0, 0, ${PAINT_W}, ${PAINT_H}).data; let s = '';
    for (let i = 0; i < px.length; i += 32768) s += String.fromCharCode.apply(null, px.subarray(i, i + 32768));
    return { w: im.naturalWidth, h: im.naturalHeight, b64: btoa(s) };
  })()`);
  if (!r || !r.b64) throw new Error(`could not decode ${file}`);
  return { width: PAINT_W, height: PAINT_H, data: new Uint8Array(Buffer.from(r.b64, 'base64')), src: { w: r.w, h: r.h } };
}
export async function decodeAll(chrome, files) {
  const out = {};
  for (const [k, f] of Object.entries(files)) out[k] = await decodeOne(chrome, f);
  return out;
}
export async function encodeWebp(chrome, img, q = 0.86) {
  const b64 = Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length).toString('base64');
  const url = await chrome.evaluate(`(async () => {
    const bin = atob('${b64}'), px = new Uint8ClampedArray(bin.length);
    for (let i = 0; i < bin.length; i++) px[i] = bin.charCodeAt(i);
    const c = document.createElement('canvas'); c.width = ${img.width}; c.height = ${img.height};
    c.getContext('2d').putImageData(new ImageData(px, ${img.width}, ${img.height}), 0, 0);
    return c.toDataURL('image/webp', ${q});
  })()`);
  if (!/^data:image\/webp;base64,/.test(url || '')) throw new Error('this Chrome cannot encode WebP');
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

/* ---------- masks ---------- */
const N = PAINT_W * PAINT_H;
/** A mask image -> 0..255 (inside: bright and opaque). */
export function maskOf(img) {
  const m = new Uint8Array(N), d = img.data;
  for (let i = 0, p = 0; p < N; i += 4, p++) { const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; m[p] = l >= 128 && d[i + 3] >= 128 ? 255 : 0; }
  return m;
}
/** A polygon [[x, y], ...] in 1600 x 900 px -> a mask (even-odd scanline fill). */
export function polyMask(pts) {
  const m = new Uint8Array(N);
  if (!Array.isArray(pts) || pts.length < 3) return m;
  for (let y = 0; y < PAINT_H; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [x1, y1] = pts[j], [x2, y2] = pts[i];
      if ((y1 <= yc) !== (y2 <= yc)) xs.push(x1 + (yc - y1) / (y2 - y1) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k] - 0.5)); x < Math.min(PAINT_W, Math.floor(xs[k + 1] + 0.5)); x++) m[y * PAINT_W + x] = 255;
  }
  return m;
}
/**
 * The sky when there is no sky mask: every pixel in the top band's colour family (or cloud white and grey) that is connected to
 * the top edge through such pixels (a flood fill, so sky seen under a bough or between trees counts); specks (stars, birds)
 * are closed. It stops at hard edges of another colour: roofs, trees, hills. A sky.png is always better.
 */
export function deriveSky(img) {
  const d = img.data, at = (x, y) => (y * PAINT_W + x) * 4, maxY = Math.floor(PAINT_H * 0.85);
  // the sky's colour family: the median of the top rows over the whole width
  const top = [[], [], []];
  for (let y = 0; y < 8; y++) for (let x = 0; x < PAINT_W; x += 4) { const i = at(x, y); top[0].push(d[i]); top[1].push(d[i + 1]); top[2].push(d[i + 2]); }
  const [tr, tg, tb] = top.map(a => a.sort((p, q) => p - q)[a.length >> 1]);
  const like = new Uint8Array(N);
  for (let y = 0; y < maxY; y++) for (let x = 0; x < PAINT_W; x++) {
    const i = at(x, y), r = d[i], g = d[i + 1], b = d[i + 2];
    const fam = Math.abs((r - g) - (tr - tg)) + 1.5 * Math.abs((b - g) - (tb - tg));
    const cloud = Math.max(r, g, b) - Math.min(r, g, b) < 50 && r * 0.3 + g * 0.59 + b * 0.11 > 150;
    like[y * PAINT_W + x] = fam <= 100 || cloud ? 1 : 0;
  }
  const m = new Uint8Array(N), stack = [];
  for (let x = 0; x < PAINT_W; x++) if (like[x]) { m[x] = 255; stack.push(x); }
  while (stack.length) {
    const p = stack.pop(), x = p % PAINT_W, y = (p - x) / PAINT_W;
    const nb = [x > 0 ? p - 1 : -1, x < PAINT_W - 1 ? p + 1 : -1, y > 0 ? p - PAINT_W : -1, y < maxY - 1 ? p + PAINT_W : -1];
    for (const q of nb) if (q >= 0 && like[q] && !m[q]) { m[q] = 255; stack.push(q); }
  }
  // close specks: a non-sky run of at most 5 px between sky pixels, along rows and along columns
  const close = (horiz) => {
    const L = horiz ? PAINT_W : PAINT_H, M = horiz ? PAINT_H : PAINT_W, idx = (u, v) => (horiz ? v * PAINT_W + u : u * PAINT_W + v);
    for (let v = 0; v < M; v++) { let last = -1; for (let u = 0; u < L; u++) { if (!m[idx(u, v)]) continue; if (last >= 0 && u - last > 1 && u - last <= 6) for (let k = last + 1; k < u; k++) m[idx(k, v)] = 255; last = u; } }
  };
  close(true); close(false);
  return m;
}
/** A 3 x 3 box blur (twice): soft mask edges, no jaggies. */
export function feather(mask) {
  let a = mask;
  for (let pass = 0; pass < 2; pass++) {
    const b = new Uint8Array(N);
    for (let y = 0; y < PAINT_H; y++) for (let x = 0; x < PAINT_W; x++) {
      let s = 0, n = 0;
      for (let dy = -1; dy <= 1; dy++) { const yy = y + dy; if (yy < 0 || yy >= PAINT_H) continue; for (let dx = -1; dx <= 1; dx++) { const xx = x + dx; if (xx < 0 || xx >= PAINT_W) continue; s += a[yy * PAINT_W + xx]; n++; } }
      b[y * PAINT_W + x] = Math.round(s / n);
    }
    a = b;
  }
  return a;
}
export function share(mask) { let s = 0; for (let i = 0; i < N; i++) s += mask[i] > 127 ? 1 : 0; return s / N; }
export function horizonOf(sky) {
  const ends = [];
  for (let x = 0; x < PAINT_W; x += 8) { let y = 0; while (y < PAINT_H && sky[y * PAINT_W + x] > 127) y++; ends.push(y); }
  ends.sort((a, b) => a - b);
  return ends[Math.floor(ends.length / 2)];
}
export function cut(img, mask, invert = false) {
  const out = new Uint8Array(img.data);
  for (let p = 0, i = 3; p < N; p++, i += 4) { const k = invert ? 255 - mask[p] : mask[p]; out[i] = (out[i] * k / 255) | 0; }
  return { width: img.width, height: img.height, data: out };
}
const maskImg = (mask) => { const d = new Uint8Array(N * 4); for (let p = 0; p < N; p++) { d[p * 4] = d[p * 4 + 1] = d[p * 4 + 2] = mask[p]; d[p * 4 + 3] = 255; } return { width: PAINT_W, height: PAINT_H, data: d }; };
const empty = (mask) => { for (let i = 0; i < N; i += 7) if (mask[i] > 127) return false; return true; };

/* ---------- alignment between the variants ---------- */
const F = 4, GW = PAINT_W / F, GH = PAINT_H / F;
function edges(img) {
  const g = new Float32Array(GW * GH), d = img.data;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    let s = 0;
    for (let yy = 0; yy < F; yy++) for (let xx = 0; xx < F; xx++) { const i = ((y * F + yy) * PAINT_W + x * F + xx) * 4; s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; }
    g[y * GW + x] = s / (F * F);
  }
  const e = new Float32Array(GW * GH);
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    const i = y * GW + x, gx = g[i + 1] - g[i - 1], gy = g[i + GW] - g[i - GW];
    e[i] = Math.hypot(gx, gy);
  }
  // normalise (a night variant is darker: compare the edge structure, not the brightness)
  let mean = 0; for (const v of e) mean += v; mean = mean / e.length || 1;
  for (let i = 0; i < e.length; i++) e[i] /= mean;
  return e;
}
/** The shift (in full-size px) that best lines img's edges up with ref's, within +-32 px. */
export function alignDrift(ref, img) {
  const a = edges(ref), b = edges(img), R = 8;
  let best = { dx: 0, dy: 0, score: Infinity };
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    let s = 0, n = 0;
    for (let y = R + 1; y < GH - R - 1; y += 2) for (let x = R + 1; x < GW - R - 1; x += 2) { s += Math.abs(a[y * GW + x] - b[(y + dy) * GW + x + dx]); n++; }
    s /= n;
    if (s < best.score) best = { dx, dy, score: s };
  }
  return { dx: best.dx * F, dy: best.dy * F, px: Math.round(Math.hypot(best.dx, best.dy) * F), score: Math.round(best.score * 1000) / 1000 };
}

/* ---------- the import ---------- */
const kb = (b) => Math.round(b.length / 1024);
function writeObject(root, name, images, meta) {
  const dir = join(root, 'assets', 'objects', 'ground', name);
  mkdirSync(dir, { recursive: true });
  const variant = {};
  for (const [k, buf] of Object.entries(images)) { const f = (k === 'summer' ? 'base' : k) + '.webp'; writeFileSync(join(dir, f), buf); variant[k === 'summer' ? 'base' : k] = f; }
  const bytes = Object.values(images).reduce((n, b) => n + b.length, 0);
  const m = Object.assign({ id: `ground.${name}`, category: 'ground', size: [PAINT_W, PAINT_H], anchor: [0, 0], variants: [variant], flippable: false, reflect: false, shadow: false, weight: 0, bytes }, meta);
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(m, null, 1) + '\n');
  return dir;
}

export async function paintImport(root, o) {
  const { folder, pack, id, chrome, out = () => {} } = o;
  if (!ID_RE.test(id || '')) throw new Error(`scene paint new: the id must be lower case letters, digits and dashes (got "${id || ''}")`);
  if (!ID_RE.test(pack || '')) throw new Error(`scene paint new: the pack must be lower case letters, digits and dashes (got "${pack || ''}")`);
  const t0 = Date.now(), { files, cfg } = readPaintInputs(folder), cf = Object.assign({}, cfg, o.cfg || {});
  out(`painted scene ${pack}/${id} from ${folder}: ${Object.keys(files).join(', ')}`);
  const img = await decodeAll(chrome, files), ref = img.summer, report = { notes: [], drift: {}, masks: {}, bytes: {}, files: [] };
  const aspect = ref.src.w / ref.src.h;
  if (Math.abs(aspect - 16 / 9) > 0.03) report.notes.push(`the summer painting is ${ref.src.w} x ${ref.src.h} (aspect ${aspect.toFixed(2)}, not 16:9): stretched to 1600 x 900`);
  for (const v of VARIANTS.slice(1)) if (img[v]) {
    report.drift[v] = alignDrift(ref, img[v]);
    if (img[v].src.w / img[v].src.h - aspect > 0.01) report.notes.push(`${v}: another aspect than summer (${img[v].src.w} x ${img[v].src.h})`);
  }
  // the masks: a PNG, else a polygon from paint.json, else (sky only) derived
  const masks = {};
  for (const k of MASKS) {
    if (img[k]) { masks[k] = maskOf(img[k]); report.masks[k] = 'png'; }
    else if (Array.isArray(cf[k]) && cf[k].length >= 3) { masks[k] = polyMask(cf[k]); report.masks[k] = 'polygon'; }
  }
  if (!masks.sky) { masks.sky = deriveSky(ref); report.masks.sky = 'derived'; }
  for (const k of Object.keys(masks)) if (empty(masks[k])) { delete masks[k]; report.masks[k] = 'empty (ignored)'; }
  const soft = {};
  for (const k of Object.keys(masks)) soft[k] = feather(masks[k]);
  const horizon = Number.isFinite(cf.horizon) ? cf.horizon : masks.sky ? horizonOf(masks.sky) : 450;
  report.horizon = horizon;
  report.share = Object.fromEntries(Object.keys(masks).map(k => [k, Math.round(share(masks[k]) * 1000) / 10]));
  // the objects: back (sky cut out), water (inside the water mask), front (inside the occluder mask)
  const name = `paint-${id}`, tags = ['painted', `paint:${pack}/${id}`, 'kit:temperate', 'role:ground'];
  const prov = { source: 'painted scene import (scene paint new)', at: new Date().toISOString().slice(0, 10), drift: report.drift, masks: report.masks, horizon };
  const encodeSet = async (fn) => { const o2 = {}; for (const v of VARIANTS) if (img[v]) o2[v] = await encodeWebp(chrome, fn(img[v])); return o2; };
  const back = await encodeSet(im => (soft.sky ? cut(im, soft.sky, true) : im));
  report.files.push(writeObject(root, name, back, { tags, credit: cf.credit || 'painted scene', paint: prov }));
  for (const [k, b] of Object.entries(back)) report.bytes[`back/${k}`] = kb(b);
  const ids = { back: `ground.${name}` };
  if (soft.water) {
    const w = await encodeSet(im => cut(im, soft.water));
    report.files.push(writeObject(root, `${name}-water`, w, { tags: tags.slice(0, 2).concat(['kit:water', 'role:edge']), credit: cf.credit || 'painted scene' }));
    for (const [k, b] of Object.entries(w)) report.bytes[`water/${k}`] = kb(b);
    ids.water = `ground.${name}-water`;
  }
  if (soft.front) {
    const f = await encodeSet(im => cut(im, soft.front));
    report.files.push(writeObject(root, `${name}-front`, f, { tags: tags.slice(0, 2).concat(['kit:temperate', 'role:ground']), credit: cf.credit || 'painted scene' }));
    for (const [k, b] of Object.entries(f)) report.bytes[`front/${k}`] = kb(b);
    ids.front = `ground.${name}-front`;
  }
  // the masks, for the lint (never embedded in the page: no meta names them)
  const mdir = join(root, 'assets', 'objects', 'ground', name, 'masks');
  mkdirSync(mdir, { recursive: true });
  for (const k of Object.keys(masks)) writeFileSync(join(mdir, `${k}.png`), pngEncode(maskImg(masks[k])));
  const lib = writeRasterLib(root);
  report.files.push(lib.file);
  // the scene and its pack (never overwritten: an existing scene keeps its actors)
  const sceneFile = join(root, 'src', 'app', `71-scene-${pack}.js`), packFile = join(root, 'src', 'app', `72-anim-pack-${pack}.js`);
  if (!existsSync(sceneFile) || o.force) { writeFileSync(sceneFile, sceneScaffold({ pack, id, ids, horizon, cf })); report.files.push(sceneFile); }
  else report.notes.push(`${sceneFile} exists: kept (its paint ids are ${JSON.stringify(ids)})`);
  if (!existsSync(packFile)) { writeFileSync(packFile, packScaffold({ pack, cf })); report.files.push(packFile); }
  report.ids = ids; report.ms = Date.now() - t0;
  return report;
}

const js = (v) => JSON.stringify(v);
export function sceneScaffold({ pack, id, ids, horizon, cf }) {
  const label = cf.label || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const lat = Number.isFinite(cf.lat) ? cf.lat : 51.5, lon = Number.isFinite(cf.lon) ? cf.lon : -0.12, heading = Number.isFinite(cf.heading) ? cf.heading : 180;
  const place = [`      { obj: ${js(ids.back)}, x: 0, y: 0, s: 1, layer: 'back', anim: false },`];
  if (ids.water) place.push(`      { obj: ${js(ids.water)}, x: 0, y: 0, s: 1, layer: 'back', anim: false },`);
  if (ids.front) place.push(`      { obj: ${js(ids.front)}, x: 0, y: 0, s: 1, layer: 'front', anim: false },`);
  return `/* ============================================================
   PAINTED SCENE: ${label} (docs/dev/PAINTED_SCENES.md). The location is one painting (assets/objects/ground/paint-${id}*,
   imported by node tools/anim-pack.mjs scene paint new); the engine adds the live sky through the sky cut, the crossfade to
   the night painting, ripples and glints in the water, weather, and the actors below, drawn BEHIND the foreground occluder.
   Coordinates are the painting's pixels (1600 x 900). Add 3 to 5 standout animations with library actors on the painting's
   own ground: people on its paths, boats on its water, birds in its sky; check them with scene paint lint.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function' || typeof sceneObj !== 'function' || !sceneObj(${js(ids.back)})) return;
  const PACK = ${js(pack)};
  const data = () => ({
    v: 1, id: ${js(id)}, view: { lat: ${lat}, lon: ${lon}, heading: ${heading}, fov: 70, horizon: ${horizon}, lift: 1 },
    at: 'noon', season: 'auto', setting: 'natural', signage: false,
    layers: [{ id: 'back', depth: 0.2, haze: 0 }, { id: 'mid', depth: 0.45, haze: 0.06 }, { id: 'near', depth: 0.75, haze: 0.02 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
    sky: { stars: 180, clouds: { n: 4, y: [30, ${Math.max(60, horizon - 90)}], speed: 6 }, sunR: 24, moonR: 18 },
    paint: ${js(ids)},
    place: [
${place.join('\n')}
    ],
    actors: [
      // the standout animations: { obj, layer, path: [[x, y], ...], speed, loop: 'loop' | 'pingpong', s, seed, offset }
    ],
    flocks: [],
    particles: 'season', weather: 'live',
  });
  sceneAdd(PACK, { id: ${js(id)}, label: ${js(label)}, site: ${js(cf.site || label)}, tags: ['painted', 'scene'], mood: 'calm', colour: 'green',
    lat: ${lat}, lon: ${lon}, liveSky: { lat: ${lat}, lon: ${lon} }, when: () => false }, data);
})();
`;
}
export function packScaffold({ pack, cf }) {
  return `/* ============================================================
   PACK ${pack}: a painted scene (docs/dev/PAINTED_SCENES.md; the scene is 71-scene-${pack}.js). In the gallery; set the
   items' when (see 72-anim-pack-proof-yateley-green.js) to put it in the daily rotation for its place.
   ============================================================ */
(function () {
  if (typeof sceneItems !== 'function' || typeof animRegisterPack !== 'function' || !sceneItems(${js(pack)}).length) return;
  animRegisterPack({ id: ${js(pack)}, name: ${js(cf.label || pack)}, description: 'A painted scene: one painting of the place, animated by the engine.', version: '1.0.0', items: sceneItems(${js(pack)}) });
})();
`;
}

/* ---------- the lint ---------- */
/**
 * The painted-scene checks: the files (sizes, bytes), the masks, the drift between the variants (stored at import), and where
 * the actors stand (a boat on the water, a walker not on the water or in the sky, a bird anywhere).
 */
export function paintLint(root, { C, E }) {
  const rules = [], add = (name, ok, value, message, warn = false) => rules.push({ name, ok: warn ? true : ok, warn: warn && !ok, value, message: ok ? '' : message });
  const p = C && C.paint;
  if (!p || !p.back) { add('paint', false, 'none', 'not a painted scene (no paint.back)'); return rules; }
  const dirOf = (oid) => join(root, 'assets', 'objects', 'ground', String(oid).split('.')[1]);
  const metaOf = (oid) => { try { return JSON.parse(readFileSync(join(dirOf(oid), 'meta.json'), 'utf8')); } catch { return null; } };
  const back = metaOf(p.back);
  add('objects', !!back && (!p.water || !!metaOf(p.water)) && (!p.front || !!metaOf(p.front)), Object.values(p).join(' '), 'a paint object is missing: run scene paint new again');
  if (!back) return rules;
  let total = 0;
  const sizes = [], big = [], warnBig = [];
  for (const oid of Object.values(p)) {
    const m = metaOf(oid); if (!m) continue;
    for (const f of Object.values(m.variants[0] || {})) {
      const buf = readFileSync(join(dirOf(oid), f)), s = webpSize(buf) || (() => { try { const i = pngDecode(buf); return { width: i.width, height: i.height }; } catch { return null; } })();
      total += buf.length;
      if (!s || s.width !== PAINT_W || s.height !== PAINT_H) sizes.push(`${oid}/${f} ${s ? s.width + ' x ' + s.height : 'unreadable'}`);
      if (buf.length / 1024 > PAINT_BUDGET.imageKB.max) big.push(`${oid}/${f} ${kb(buf)} KB`); else if (buf.length / 1024 > PAINT_BUDGET.imageKB.warn) warnBig.push(`${oid}/${f} ${kb(buf)} KB`);
    }
  }
  add('sizes', !sizes.length, sizes.length ? sizes.join(', ') : '1600 x 900', `every image must be 1600 x 900: ${sizes.join(', ')}`);
  add('bytes', !big.length && total / 1024 <= PAINT_BUDGET.sceneKB.max, `${Math.round(total / 1024)} KB`, `over the budget (${PAINT_BUDGET.imageKB.max} KB an image, ${PAINT_BUDGET.sceneKB.max} KB a scene): ${big.join(', ')}`);
  if (warnBig.length || total / 1024 > PAINT_BUDGET.sceneKB.warn) add('bytesWarn', false, `${Math.round(total / 1024)} KB`, `large: ${warnBig.join(', ') || Math.round(total / 1024) + ' KB'}`, true);
  const v = back.variants[0] || {};
  add('variants', true, ['base', 'spring', 'autumn', 'winter', 'night'].map(k => (v[k] ? k : `(${k} derived)`)).join(' '), '');
  if (!v.night) add('night', false, 'derived', 'no night painting: the live grade darkens the day one (a night edit-variant looks far better)', true);
  const prov = back.paint || {}, drift = prov.drift || {};
  const worst = Object.entries(drift).sort((a, b) => b[1].px - a[1].px)[0];
  add('alignment', !worst || worst[1].px <= PAINT_BUDGET.drift.max, worst ? `${worst[0]} ${worst[1].px} px` : 'one painting', `the ${worst && worst[0]} variant is ${worst && worst[1].px} px off the summer painting: regenerate it as an EDIT of the summer image (same composition)`);
  if (worst && worst[1].px > PAINT_BUDGET.drift.warn && worst[1].px <= PAINT_BUDGET.drift.max) add('alignmentWarn', false, `${worst[0]} ${worst[1].px} px`, `the ${worst[0]} variant drifts ${worst[1].px} px: edges will shift at the season change`, true);
  // masks
  const masks = {};
  for (const k of MASKS) { const f = join(dirOf(p.back), 'masks', `${k}.png`); if (existsSync(f)) masks[k] = pngDecode(readFileSync(f)); }
  const ms = prov.masks || {};
  add('skyMask', !!masks.sky, ms.sky || 'none', 'no sky mask: the live sky cannot show (add sky.png or a sky polygon)');
  if (!masks.water) add('waterMask', false, 'none', 'no water mask: no ripples or glints (add water.png or a water polygon in paint.json, if the place has water)', true);
  if (!masks.front) add('frontMask', false, 'none', 'no foreground occluder: actors cannot pass behind anything (add front.png: the near reeds, a wall, a bough)', true);
  if (masks.sky) { const sh = share(maskOf(masks.sky)); add('skyShare', sh >= 0.03 && sh <= 0.75, `${Math.round(sh * 100)} %`, `the sky mask covers ${Math.round(sh * 100)} % of the picture: check it (3 to 75 %)`); }
  // where the actors stand
  const inM = (k, x, y) => { const m = masks[k]; if (!m) return false; const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= PAINT_W || yi >= PAINT_H) return false; return m.data[(yi * PAINT_W + xi) * 4] > 127; };
  const bad = [];
  for (const a of C.actors || []) {
    const cat = E && E.obj(a.o) ? E.obj(a.o).category : String(a.o).split('.')[0];
    if (cat === 'bird' || cat === 'sky') continue;
    const pts = (a.path || []).filter(q => q[0] >= 0 && q[0] <= PAINT_W);
    for (const [x, y] of pts) {
      if (cat === 'boat' ? masks.water && !inM('water', x, y) : inM('sky', x, y) || inM('water', x, y)) { bad.push(`${a.o} at ${Math.round(x)}, ${Math.round(y)}`); break; }
    }
  }
  add('actorsGround', !bad.length, bad.length ? bad.join('; ') : `${(C.actors || []).length} actor(s)`, `actors off their ground (boats on the water, walkers and vehicles on land): ${bad.join('; ')}`);
  add('actors', (C.actors || []).length + (C.flocks || []).length >= 3, `${(C.actors || []).length} actor(s), ${(C.flocks || []).length} flock(s)`, 'fewer than 3 animations: add 3 to 5 standout ones (library actors on the painting\'s ground)', true);
  return rules;
}
