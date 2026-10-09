// object import | import-batch | import-sheet | template: raster objects from image files and AI sprite sheets
// (docs/dev/OBJECT_IMPORT.md). Node >= 20, no dependencies (PNG through tools/lib/png.mjs; Chrome only for the sheets).
//
//   object import <file-or-folder> --id <cat>.<name> [--category c] [--anchor bottom-centre] [--size 300x400] [--kit a,b] [--role r]
//                 [--tags t,u] [--res 1] [--palette 0.3] [--keep-bg] [--lit auto|none] [--snow auto|none] [--period 0.9] [--no-sheet]
//       a file: the base image. A folder: base.png plus any of spring, summer, autumn, winter, night, lit, mask_lit (.png), v1/ v2/ ...
//       (other variants, the same names), parts/<name>.png (moving parts: layers of the same canvas) and frames/*.png (2 to 6
//       animation frames, the same canvas). Every image: transparency checked (a flat background is removed: --keep-bg keeps it),
//       one shared trim (so the layers stay registered), scaled to --size (aspect kept; --res pixels per world unit, at most 1024 a
//       side), --palette k pulls each pixel k of the way to the house palette. Then: lit windows (auto, for buildings, vehicles,
//       boats, structures, landmarks, rail) and a winter snow cap (auto) are DERIVED where those images are missing; the files and
//       meta.json go to assets/objects/<category>/<name>/; src/app/70-scene-lib-raster.js is regenerated; object lint and object
//       sheet run on it.
//   object import-batch <folder> [--manifest manifest.csv] [--force] [--dry-run]
//       columns: id, file, category, size, anchor, kit, tags, parts (a ';' list of name=file|x,y|kind, the pivot in world units from the
//       anchor), role, res, rows, frames, period (header row required; files relative to the folder; other columns ignored). One
//       object per row: a row with `rows` set (or `frames` > 0 on a PNG file) is a SPRITE SHEET, imported as `object import-sheet`;
//       any other row is imported as `object import`. A failing row is reported and the others still import (exit code 1).
//   object import-sheet <sheet.png> --id <cat>.<name> --rows N [--frames K] [...the import options]
//       a whole sprite sheet in the fixed template (tools/lib/sprite-sheet.mjs SHEET): sliced, aligned, linted for consistency
//       (a missing cell, size and position drift, a cell of another shape), then imported with its REAL seasons, night and lit
//       cells (the derivations fill only the gaps) and the frames row as a frames animation.
//   object template [--rows 2] [--frames 4] [--examples] [--out dir]
//       the blank labelled template PNG, and with --examples three filled example sheets drawn from library objects
//       (building.terrace, tree.oak, person.walker with walk frames), plus the prompt pack, for attaching to Gemini or ChatGPT.
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join, resolve, dirname, basename, extname, relative } from 'node:path';
import { pngDecode, pngEncode, isPng, isWebp, webpSize } from './png.mjs';
import { alphaStats, borderColour, removeBackground, trimBox, crop, resize, blank, paste, meanColour, normalisePalette, litWindows, litFromPair, snowCap, isChroma } from './raster-image.mjs';
import { SHEET, sheetSize, cellRect, templateHtml, sliceSheet, alignSheet, lintSheet } from './sprite-sheet.mjs';
import { RASTER_DIR, writeRasterLib, readRasterMetas, rasterAssetBytes } from './raster-assets.mjs';

const ID_RE = /^([a-z]+)\.([a-z0-9-]{1,40})$/;
const CATEGORIES = ['tree', 'plant', 'ground', 'rock', 'water', 'bird', 'animal', 'person', 'vehicle', 'boat', 'building', 'street', 'rail', 'structure', 'prop', 'sky', 'landmark'];
/** The default height (world units) of a category when --size is not given (a person is 62 units to the crown, 2.8). */
export const DEFAULT_HEIGHT = { building: 260, landmark: 380, tree: 300, plant: 50, ground: 24, rock: 70, water: 30, bird: 16, animal: 40, person: 62, vehicle: 60, boat: 70, street: 110, rail: 60, structure: 200, prop: 50, sky: 60 };
export const DEFAULT_ROLE = { tree: 'tree', plant: 'ground', ground: 'ground', rock: 'rock', water: 'edge', bird: 'bird', animal: 'animal', person: 'walker', vehicle: 'vehicle', boat: 'boat', building: 'building-mid', street: 'street', rail: 'street', structure: 'building-mid', prop: 'street', sky: 'sky' };
const LIT_CATS = ['building', 'vehicle', 'boat', 'structure', 'landmark', 'rail'];
const NO_SNOW = ['person', 'vehicle', 'bird', 'animal', 'boat', 'water', 'sky'];
const IMAGE_NAMES = ['base', 'spring', 'summer', 'autumn', 'winter', 'night', 'lit', 'mask_lit'];
const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);

/** "300x400" -> [300, 400]; "x400" -> [null, 400]; "300x" -> [300, null]; "" -> [null, null]. */
export function parseSize(s) {
  if (s == null || s === '') return [null, null];
  const m = /^\s*(\d+(?:\.\d+)?)?\s*[x*,]\s*(\d+(?:\.\d+)?)?\s*$/i.exec(String(s));
  if (!m || (!m[1] && !m[2])) throw new Error(`--size must be WxH in world units (300x400, x400 or 300x), got "${s}"`);
  return [m[1] ? +m[1] : null, m[2] ? +m[2] : null];
}
/** A small CSV reader (quoted fields, "" escapes, CRLF): -> [{ header: value }]. */
export function parseCsv(text) {
  const rows = [];
  let row = [], f = '', q = false;
  const s = String(text).replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; continue; }
    if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some(x => x.trim() !== '')) rows.push(row); row = []; }
    else f += c;
  }
  row.push(f); if (row.some(x => x.trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
}
/** Read one image: { kind: 'png', img } (decoded, metadata dropped) or { kind: 'webp', buf, size }. */
export function readImage(file) {
  const buf = readFileSync(file);
  if (isPng(buf)) return { kind: 'png', img: pngDecode(buf), file };
  if (isWebp(buf)) return { kind: 'webp', buf, size: webpSize(buf), file };
  throw new Error(`${file}: not a PNG or WebP image (export PNG with a transparent or flat background)`);
}
/** Make the background transparent: already transparent -> as is; a flat border colour -> removed; else an error (or --keep-bg). */
export function clearBackground(img, { keepBg = false, name = 'image', notes = [] } = {}) {
  const a = alphaStats(img);
  if (a.transparent >= 0.02) return img;
  const bc = borderColour(img);
  if (bc.rgb && bc.share >= 0.6) {
    notes.push(`${name}: no transparency; removed the flat ${isChroma(bc.rgb) ? 'chroma-key ' : ''}background #${bc.rgb.map(v => v.toString(16).padStart(2, '0')).join('')} (${Math.round(bc.share * 100)} % of the border)`);
    return removeBackground(img, { rgb: bc.rgb });
  }
  if (keepBg) { notes.push(`${name}: no transparency and no flat background: kept as it is (--keep-bg); it will draw as a rectangle`); return img; }
  throw new Error(`${name}: no transparent background and the background is not one flat colour: cut the object out (or export it on a flat colour such as #FF00FF), or pass --keep-bg`);
}

/**
 * Build one raster object from decoded images and write it. spec:
 *   { id, category, kits, role, tags, anchor, size: [w|null, h|null], res, palette, variants: [{ base, night, ... }] (RGBA images),
 *     parts: [{ name, img, pivot, anim }], frames: [img], period, lit ('auto' | 'none'), snow, source, flippable, reflect, credit,
 *     webp: { buf } (a WebP base passed through) }
 * Returns { meta, dir, notes, files }.
 */
export function writeObject(root, spec) {
  const m = ID_RE.exec(spec.id || '');
  if (!m) throw new Error(`--id must be <category>.<name> (lower case, digits and dashes), got "${spec.id || ''}"`);
  const category = spec.category || m[1];
  if (!CATEGORIES.includes(category) || category !== m[1]) throw new Error(`the id's prefix must be its category (${CATEGORIES.join(' ')}): ${spec.id}`);
  const notes = spec.notes || [], dir = join(root, RASTER_DIR, m[1], m[2]);
  const B = { maxSide: 1024 };
  const res = spec.res ? +spec.res : 1;
  if (!(res > 0.2 && res <= 4)) throw new Error('--res must be between 0.25 and 4 pixels per world unit');
  // the files to write: { rel: Buffer }
  const files = new Map(), meta = { id: spec.id, category, size: null, anchor: spec.anchor || 'bottom-centre', res, variants: [], tags: [], source: spec.source || 'import', derived: {} };
  if (spec.webp) {
    // WebP: passed through unprocessed (no decoder here): no trim, scale, alpha check or derivation
    const sz = spec.webp.size || { width: 100, height: 100 }, [W, H] = spec.size || [null, null];
    if (!W && !H) throw new Error('a WebP image needs --size (it is passed through unprocessed: no trim or scale)');
    meta.size = [Math.round(W || H * sz.width / sz.height), Math.round(H || W * sz.height / sz.width)];
    files.set('base.webp', spec.webp.buf);
    meta.variants.push({ base: 'base.webp' });
    notes.push('WebP: passed through unprocessed (no trim, scale, transparency check, palette or derivations): prefer PNG');
  } else {
    const all = [];
    spec.variants.forEach((v) => { for (const n of Object.keys(v)) all.push(v[n]); });
    for (const f of spec.frames || []) all.push(f);
    const layers = all.concat((spec.parts || []).map(p => p.img));
    // one canvas: same-size inputs share it as they are; others are placed bottom-centre on the largest
    const cw = Math.max(...layers.map(i => i.width)), ch = Math.max(...layers.map(i => i.height));
    const onCanvas = (img) => {
      if (img.width === cw && img.height === ch) return img;
      const b = trimBox(img) || [0, 0, img.width, img.height], t = crop(img, b[0], b[1], b[2] - b[0], b[3] - b[1]);
      return paste(blank(cw, ch), t, Math.round((cw - t.width) / 2), ch - t.height);
    };
    const canvasOf = new Map(layers.map(i => [i, onCanvas(i)]));
    // the union trim of every layer (variants, frames and parts), so --size is the whole object, sails included; parts are
    // then trimmed on their own below and placed in that frame
    let box = null;
    for (const img of layers) { const b = trimBox(canvasOf.get(img)); if (b) box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b; }
    if (!box) throw new Error('the image is empty (fully transparent after the background was removed)');
    const tw = box[2] - box[0], th = box[3] - box[1];
    let [W, H] = spec.size || [null, null];
    if (!W && !H) H = DEFAULT_HEIGHT[category] || 100;
    if (W && H) { const k = Math.min(W / tw, H / th); W = tw * k; H = th * k; }
    else if (H) W = H * tw / th; else H = W * th / tw;
    // pixels: res per world unit, never above the source (no upscaling), at most maxSide a side
    let pw = W * res, ph = H * res;
    const k = Math.min(1, tw / pw, B.maxSide / Math.max(pw, ph));
    pw = Math.max(1, Math.round(pw * k)); ph = Math.max(1, Math.round(ph * k));
    if (k < 1 && tw / (W * res) < 1) notes.push(`the source is ${tw} x ${th} px: stored at ${pw} x ${ph} (no upscaling; ${Math.round(pw / W * 100) / 100} px per unit)`);
    meta.size = [Math.round(W * 10) / 10, Math.round(H * 10) / 10];
    const fit = (img) => {
      let out = resize(crop(canvasOf.get(img), box[0], box[1], tw, th), pw, ph);
      if (spec.palette) out = normalisePalette(out, spec.housePalette || [], +spec.palette);
      return out;
    };
    const put = (rel, img) => { files.set(rel, pngEncode(img)); return rel; };
    meta.means = [];
    spec.variants.forEach((v, vi) => {
      const pre = vi ? `v${vi}/` : '', ent = {}, im = {};
      for (const n of Object.keys(v)) im[n] = fit(v[n]);
      if (!im.base) throw new Error(`variant ${vi}: no base image`);
      for (const n of IMAGE_NAMES) if (im[n] && n !== 'lit') ent[n] = put(`${pre}${n}.png`, im[n]);
      meta.means.push('#' + meanColour(im.base).map(c => c.toString(16).padStart(2, '0')).join(''));
      // the lit overlay: a sheet's lit cell against its night cell; a folder's lit.png (an overlay, or a whole lit picture);
      // else auto-detected windows (lit categories)
      if (im.lit) {
        const cover = (x) => alphaStats(x).transparent;
        if (im.night) { const r = litFromPair(im.lit, im.night); if (r.pixels) { ent.lit = put(`${pre}lit.png`, r.img); meta.derived.lit = 'lit-vs-night'; } }
        else if (cover(im.lit) - cover(im.base) > 0.3) { ent.lit = put(`${pre}lit.png`, im.lit); meta.derived.lit = 'given'; }
        else {
          const dim = { width: im.base.width, height: im.base.height, data: im.base.data.map((x, i) => (i % 4 === 3 ? x : Math.round(x * 0.35))) };
          const r = litFromPair(im.lit, dim); if (r.pixels) { ent.lit = put(`${pre}lit.png`, r.img); meta.derived.lit = 'lit-vs-base'; }
        }
      } else if (!im.mask_lit && spec.lit !== 'none' && LIT_CATS.includes(category)) {
        const r = litWindows(im.base, { seed: 11 + vi * 7 });
        if (r.windows) { ent.lit = put(`${pre}lit.png`, r.img); meta.derived.lit = `auto (${r.windows} windows)`; }
        else notes.push(`variant ${vi}: no window-like regions found for lit windows: add a lit cell, mask_lit, or tag it unlit`);
      }
      if (!im.winter && spec.snow !== 'none' && !NO_SNOW.includes(category) && spec.seasonal !== false) {
        const r = snowCap(im.base);
        if (r.pixels > 20) { ent.snow = put(`${pre}snow.png`, r.img); meta.derived.snow = 'auto'; }
      }
      meta.variants.push(ent);
    });
    const derivedSeasons = ['spring', 'autumn', 'winter'].filter(n => !spec.variants[0][n]);
    if (derivedSeasons.length) meta.derived.seasons = derivedSeasons;
    // parts: trimmed on their own, placed in world units from the anchor
    if (spec.parts && spec.parts.length) {
      meta.parts = [];
      const an = { 'bottom-centre': [0.5, 1], centre: [0.5, 0.5], 'bottom-left': [0, 1], 'bottom-right': [1, 1], 'top-centre': [0.5, 0] }[meta.anchor] || [0.5, 1];
      const sx = meta.size[0] / tw, sy = meta.size[1] / th, ox = -meta.size[0] * an[0], oy = -meta.size[1] * an[1];
      for (const p of spec.parts) {
        const c = crop(canvasOf.get(p.img), box[0], box[1], tw, th), b = trimBox(c);
        if (!b) { notes.push(`part ${p.name}: empty, skipped`); continue; }
        const img = resize(crop(c, b[0], b[1], b[2] - b[0], b[3] - b[1]), Math.max(1, Math.round((b[2] - b[0]) * pw / tw)), Math.max(1, Math.round((b[3] - b[1]) * ph / th)));
        const pbox = [ox + b[0] * sx, oy + b[1] * sy, (b[2] - b[0]) * sx, (b[3] - b[1]) * sy].map(v => Math.round(v * 10) / 10);
        const kind = p.anim || 'sway';
        const pivot = p.pivot || (kind === 'sway' ? [pbox[0] + pbox[2] / 2, pbox[1] + pbox[3]] : [pbox[0] + pbox[2] / 2, pbox[1] + pbox[3] / 2]);
        meta.parts.push({ name: p.name, image: put(`parts/${p.name}.png`, img), box: pbox, pivot: pivot.map(v => Math.round(v * 10) / 10), anim: Object.assign({ kind }, p.period ? { period: +p.period } : {}) });
      }
    }
    if (spec.frames && spec.frames.length) {
      if (spec.frames.length < 2 || spec.frames.length > 6) throw new Error(`frames: 2 to 6 images, got ${spec.frames.length}`);
      meta.frames = { images: spec.frames.map((f, i) => put(`parts/f${i}.png`, fit(f))), period: spec.period ? +spec.period : 0.9 };
    }
  }
  const kits = splitList(spec.kits), role = spec.role || (category === 'landmark' ? '' : DEFAULT_ROLE[category]);
  // people: the prompt pack asks for anonymous, faceless figures, so an imported person carries the care rule's silhouette tag
  meta.tags = [...new Set([...kits.map(k => 'kit:' + k), ...(role ? ['role:' + role] : []), ...splitList(spec.tags), ...(category === 'person' ? ['silhouette'] : []), 'raster'])];
  if (category === 'landmark') meta.flippable = false;
  if (spec.flippable != null) meta.flippable = !!spec.flippable;
  // reflections in water: as the vector library does (trees, boats, landmarks, bridges); a building opts in with --tags reflect
  if (['tree', 'boat', 'landmark', 'structure'].includes(category) || splitList(spec.tags).includes('reflect')) meta.reflect = true;
  if (['building', 'tree', 'person', 'vehicle', 'structure', 'landmark', 'street', 'animal'].includes(category) && meta.anchor === 'bottom-centre') meta.shadow = { rx: Math.round(meta.size[0] * 0.36), ry: Math.min(12, Math.max(2, Math.round(meta.size[0] * 0.05))), h: Math.round(meta.size[1] * 0.85) };   // a ground shadow along the live sun (sails and crowns overstate the footprint, hence 0.36 of the width)
  if (spec.credit) meta.credit = spec.credit;
  if (spec.sheet) meta.sheet = spec.sheet;
  meta.bytes = [...files.values()].reduce((n, b) => n + b.length, 0);
  // replace the folder's images (a re-import replaces the object; nothing outside its folder is touched)
  if (existsSync(dir)) for (const rel of listFiles(dir)) if (/\.(png|webp|json)$/i.test(rel)) rmSync(join(dir, rel));
  for (const [rel, buf] of files) { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), buf); }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 1) + '\n');
  const lib = writeRasterLib(root);
  return { meta, dir, notes, files: [...files.keys()], lib };
}
function listFiles(dir, pre = '') {
  const out = [];
  for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) out.push(...listFiles(p, pre + f + '/')); else out.push(pre + f); }
  return out;
}

/** The images of a file or a folder (the naming convention above) -> { variants: [{ name: img }], parts, frames, webp }. */
export function collectSource(path, { keepBg = false, notes = [] } = {}) {
  const st = statSync(path);
  const load = (file, name) => {
    const r = readImage(file);
    if (r.kind === 'webp') return { webp: r };
    return { img: clearBackground(r.img, { keepBg, name, notes }) };
  };
  if (!st.isDirectory()) {
    const r = load(path, basename(path));
    return r.webp ? { webp: r.webp, variants: [] } : { variants: [{ base: r.img }] };
  }
  const variantDir = (d, label) => {
    const v = {};
    for (const n of IMAGE_NAMES) { const f = join(d, n + '.png'); if (existsSync(f)) v[n] = load(f, `${label}${n}.png`).img; }
    return v;
  };
  const variants = [variantDir(path, '')];
  if (!variants[0].base) {
    if (variants[0].summer) { variants[0].base = variants[0].summer; delete variants[0].summer; }
    else throw new Error(`${path}: a folder needs base.png (or summer.png)`);
  }
  for (let i = 1; i < 16; i++) { const d = join(path, `v${i}`); if (!existsSync(d)) break; const v = variantDir(d, `v${i}/`); if (!v.base) throw new Error(`${d}: no base.png`); variants.push(v); }
  const parts = [], frames = [];
  const pd = join(path, 'parts');
  if (existsSync(pd)) for (const f of readdirSync(pd).filter(f => /\.png$/i.test(f)).sort()) parts.push({ name: f.replace(/\.png$/i, '').toLowerCase(), img: load(join(pd, f), `parts/${f}`).img });
  const fd = join(path, 'frames');
  if (existsSync(fd)) for (const f of readdirSync(fd).filter(f => /\.png$/i.test(f)).sort()) frames.push(load(join(fd, f), `frames/${f}`).img);
  return { variants, parts, frames };
}

/* ---------------------------------------------------------------------------------------------
   The commands
   --------------------------------------------------------------------------------------------- */
const optsSpec = (args) => ({
  kits: splitList(args.kit || args.kits), role: args.role || '', tags: args.tags || '', anchor: args.anchor || 'bottom-centre', size: parseSize(args.size), res: args.res,
  palette: args.palette, lit: args.lit || 'auto', snow: args.snow || 'auto', period: args.period, category: args.category,
});
async function afterImport(root, id, ctx, args, hooks) {
  const code = hooks.lint ? await hooks.lint([id]) : 0;
  if (!args['no-sheet'] && hooks.sheet) { try { await hooks.sheet([id]); } catch (e) { ctx.out(`(sheet skipped: ${e.message})`); } }
  return code;
}
function report(ctx, r) {
  ctx.out(`imported ${r.meta.id}: ${r.meta.variants.length} variant(s), ${r.files.length} file(s), ${Math.round(r.meta.bytes / 1024)} KB, size ${r.meta.size.join(' x ')} units -> ${relative(process.cwd(), r.dir) || r.dir}`);
  if (Object.keys(r.meta.derived).length) ctx.out(`  derived: ${Object.entries(r.meta.derived).map(([k, v]) => `${k} ${Array.isArray(v) ? v.join(',') : v}`).join('; ')}`);
  for (const n of r.notes) ctx.out(`  note: ${n}`);
  ctx.out(`  library: ${r.lib.changed ? 'regenerated' : 'unchanged'} ${relative(process.cwd(), r.lib.file) || r.lib.file}`);
}
export async function runImport(sub, args, ctx, hooks = {}) {
  const root = ctx.root, pos = ctx.positionals.slice(1);
  if (sub === 'import') {
    const src = pos[0];
    if (!src || !existsSync(src)) throw new Error('object import needs a file or folder: object import <file-or-folder> --id <cat>.<name>');
    if (!args.id) throw new Error('object import needs --id <category>.<name>');
    const notes = [], s = collectSource(resolve(src), { keepBg: !!args['keep-bg'], notes });
    const r = writeObject(root, Object.assign(optsSpec(args), { id: args.id, notes, variants: s.variants, parts: s.parts, frames: s.frames, webp: s.webp, housePalette: hooks.palette ? hooks.palette() : [] }));
    report(ctx, r);
    return afterImport(root, args.id, ctx, args, hooks);
  }
  if (sub === 'import-batch') {
    const folder = pos[0];
    if (!folder || !existsSync(folder)) throw new Error('object import-batch needs a folder: object import-batch <folder> --manifest manifest.csv');
    const man = args.manifest ? resolve(args.manifest) : join(folder, 'manifest.csv');
    if (!existsSync(man)) throw new Error(`no manifest ${man} (columns: id, file, category, size, anchor, kit, tags, parts, role, res, rows, frames)`);
    const rows = parseCsv(readFileSync(man, 'utf8'));
    if (!rows.length) throw new Error(`${man}: no rows`);
    const ids = [];
    let failed = 0;
    let sheets = 0;
    for (const row of rows) {
      try {
        if (!row.id || !row.file) throw new Error('every row needs id and file');
        const src = resolve(folder, row.file);
        if (!existsSync(src)) throw new Error(`no file ${row.file} (relative to ${basename(resolve(folder))})`);
        // a sprite sheet: `rows` set (or `frames` on a single PNG file): the import-sheet path, with the row's options
        const isSheet = (row.rows || '') !== '' || ((row.frames || '') !== '' && Number(row.frames) > 0 && !statSync(src).isDirectory());
        if (isSheet) {
          if (statSync(src).isDirectory()) throw new Error(`rows is set, so ${row.file} must be a sprite-sheet PNG, not a folder`);
          if (row.parts) throw new Error('a sprite-sheet row takes no parts column (animate it with the frames row)');
          const sargs = Object.assign({}, args, {
            id: row.id, rows: row.rows || '1', frames: row.frames, kit: row.kit || args.kit, size: row.size || args.size, anchor: row.anchor || args.anchor,
            tags: row.tags ? row.tags.replace(/;/g, ',') : args.tags, role: row.role || args.role, res: row.res || args.res, category: row.category || args.category,
            period: row.period || args.period,
          });
          if (row.kit) sargs.kit = row.kit.replace(/;/g, ',');
          const r = importSheet(root, src, sargs, ctx, hooks);
          if (r.written) { ids.push(row.id); sheets++; }
          else if (r.code) { failed++; ctx.out(`FAILED ${row.id}: sheet problems (above)`); }
          continue;
        }
        const notes = [], s = collectSource(src, { keepBg: !!args['keep-bg'], notes });
        if (args['dry-run']) { ctx.out(`dry run: ${row.id} (${row.file}) reads, ${s.variants.length} variant(s); nothing written`); continue; }
        const parts = (row.parts || '').split(';').map(x => x.trim()).filter(Boolean).map(p => {
          const mm = /^([a-z][a-z0-9-]*)=([^|]+)(?:\|(-?[\d.]+),(-?[\d.]+))?(?:\|([a-z]+))?$/.exec(p);
          if (!mm) throw new Error(`parts: "${p}" is not name=file|x,y|kind`);
          const r = readImage(resolve(folder, mm[2]));
          if (r.kind !== 'png') throw new Error(`parts: ${mm[2]} must be a PNG`);
          return { name: mm[1], img: clearBackground(r.img, { keepBg: !!args['keep-bg'], name: mm[2], notes }), pivot: mm[3] != null ? [+mm[3], +mm[4]] : null, anim: mm[5] || 'sway' };
        });
        const spec = Object.assign(optsSpec(Object.assign({}, args, { kit: row.kit || args.kit, size: row.size || args.size, anchor: row.anchor || args.anchor, tags: row.tags ? row.tags.replace(/;/g, ',') : args.tags, role: row.role || args.role, res: row.res || args.res, category: row.category || args.category })), {
          id: row.id, notes, variants: s.variants, parts: parts.length ? parts : s.parts, frames: s.frames, webp: s.webp, source: args.source || 'import-batch', housePalette: hooks.palette ? hooks.palette() : [],
        });
        if (row.kit) spec.kits = row.kit.split(/[;,]/).map(x => x.trim()).filter(Boolean);
        const r = writeObject(root, spec);
        report(ctx, r);
        ids.push(row.id);
      } catch (e) { failed++; ctx.out(`FAILED ${row.id || '(no id)'}: ${e.message}`); }
    }
    let code = hooks.lint && ids.length ? await hooks.lint(ids) : 0;
    if (!args['no-sheet'] && hooks.sheet && ids.length) { try { await hooks.sheet(ids); } catch (e) { ctx.out(`(sheets skipped: ${e.message})`); } }
    ctx.out(`import-batch: ${ids.length} imported (${sheets} from sprite sheets), ${failed} failed`);
    return failed ? Math.max(code, 1) : code;
  }
  if (sub === 'import-sheet') {
    const file = pos[0];
    if (!file || !existsSync(file)) throw new Error('object import-sheet needs the sheet PNG: object import-sheet <sheet.png> --id <cat>.<name> --rows N');
    if (!args.id) throw new Error('object import-sheet needs --id <category>.<name>');
    const r = importSheet(root, resolve(file), args, ctx, hooks);
    if (!r.written) return r.code;
    return Math.max(await afterImport(root, args.id, ctx, args, hooks), r.code);
  }
  throw new Error(`unknown subcommand ${sub}`);
}

/**
 * One sprite sheet: slice, align, lint, then write (unless a FAIL without --force, or --dry-run). args: the import options
 * plus id, rows, frames, force, dry-run. Returns { written, code } (code 2: sheet FAILs). Used by import-sheet and by
 * import-batch for manifest rows that set `rows` (or `frames`).
 */
export function importSheet(root, file, args, ctx, hooks = {}, extra = {}) {
  const rows = Number(args.rows);
  if (!Number.isInteger(rows) || rows < 1) throw new Error('a sprite sheet needs rows N >= 1: the number of variant rows (not counting the frames row)');
  const r0 = readImage(file);
  if (r0.kind !== 'png') throw new Error(`${basename(file)}: a sprite sheet must be a PNG`);
  const frames = args.frames == null || args.frames === '' ? null : Number(args.frames);
  if (frames != null && !(Number.isInteger(frames) && frames >= 0)) throw new Error(`frames must be 0 or 2 to 6, got "${args.frames}"`);
  const sliced = sliceSheet(r0.img, { rows, frames });
  const aligned = alignSheet(sliced);
  const issues = lintSheet(sliced, aligned, { category: args.category || String(args.id).split('.')[0] });
  ctx.out(`sheet ${basename(file)}: ${r0.img.width} x ${r0.img.height}, background ${sliced.bg}, ${sliced.rows.length} variant row(s), ${sliced.frames.length} frame(s); cells ${sliced.rows.map(r => r.map(c => (c ? 'x' : '.')).join('')).join(' ')}`);
  for (const n of sliced.notes) ctx.out(`  note: ${n}`);
  for (const i of issues) ctx.out(`  ${i.severity.toUpperCase()}  ${i.rule.padEnd(9)} ${i.message}`);
  const fails = issues.filter(i => i.severity === 'fail');
  if (fails.length && !args.force) { ctx.out(`FAIL: ${fails.length} sheet problem(s) in ${basename(file)}: fix the sheet (or --force to import what there is)`); return { written: false, code: 2 }; }
  if (args['dry-run']) { ctx.out('dry run: nothing written'); return { written: false, code: fails.length ? 2 : 0 }; }
  const variants = aligned.rows.filter(Boolean).map(o => {
    const v = { base: o.summer || o[o.$ref] };
    for (const n of ['spring', 'autumn', 'winter', 'night', 'lit']) if (o[n]) v[n] = o[n];
    return v;
  });
  const notes = [];
  const r = writeObject(root, Object.assign(optsSpec(args), { id: args.id, notes, variants, frames: aligned.frames.length >= 2 ? aligned.frames : [], source: 'sheet', sheet: { file: basename(file), warnings: issues.filter(i => i.severity === 'warn').length }, housePalette: hooks.palette ? hooks.palette() : [] }, extra));
  report(ctx, r);
  return { written: true, code: fails.length ? 2 : 0 };
}

/* ---------------------------------------------------------------------------------------------
   object template: the blank template, the example sheets and the prompt pack
   --------------------------------------------------------------------------------------------- */
export const EXAMPLES = [
  { id: 'building.terrace', rows: 2, frames: 0, note: 'a building: two variants, real seasons (snow on the roof in winter), night and lit windows' },
  { id: 'tree.oak', rows: 2, frames: 0, note: 'a tree: spring blossom-green, summer, autumn colour, bare-ish winter; at night it is only darker' },
  { id: 'person.walker', rows: 1, frames: 4, note: 'a person: one variant, seasonal clothes, and a frames row of four walk poses' },
];
/** The SVG of one cell: an object at a common scale, bottom-centre on the baseline (objectSvg from object.mjs draws it). */
export function exampleCells(E, id, { rows, frames, objectSvg, nightGrade, hookTransform, reg }) {
  const def = E.obj(id);
  if (!def) throw new Error(`no object ${id}`);
  const night = nightGrade(reg, E);
  const shapes = (v, s) => E.shapes(id, Math.min(v, (def.variants || 1) - 1), s);
  let box = null;
  const grow = (R) => { const b = R.box; box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b.slice(); };
  for (let v = 0; v < rows; v++) for (const s of ['spring', 'summer', 'autumn', 'winter']) grow(shapes(v, s));
  const { cell, baseline } = SHEET, k = Math.min((cell - 24) / (box[2] - box[0]), (cell - baseline - 12) / (-box[1]));
  const svg = (R, opts) => {
    const g = objectSvg(R, def, opts);
    return `<svg width="${cell}" height="${cell}" viewBox="0 0 ${cell} ${cell}"><defs>${g.defs}</defs><g transform="translate(${cell / 2} ${cell - baseline}) scale(${k.toFixed(4)})">${g.body}</g></svg>`;
  };
  const cells = {};
  for (let v = 0; v < rows; v++) {
    ['spring', 'summer', 'autumn', 'winter'].forEach((s, c) => { cells[`${v},${c}`] = svg(shapes(v, s), { idp: `v${v}${c}` }); });
    cells[`${v},4`] = svg(shapes(v, 'summer'), { grade: night, idp: `v${v}n` });
    cells[`${v},5`] = svg(shapes(v, 'summer'), { grade: night, lit: true, idp: `v${v}l` });
  }
  if (frames) {
    const R = shapes(0, 'summer');
    for (let i = 0; i < frames; i++) cells[`${rows},${i}`] = svg(R, { ph: i / frames, idp: `f${i}` });
  }
  return cells;
}
export function promptText({ id = '<category>.<name>', rows = 2, frames = 0, subject = '<the object>' } = {}) {
  const { width, height } = sheetSize(rows, frames);
  return readFileSync(new URL('./anim-templates/object-sheet-prompt.md', import.meta.url), 'utf8')
    .replace(/\{\{SUBJECT\}\}/g, subject).replace(/\{\{ID\}\}/g, id).replace(/\{\{ROWS\}\}/g, String(rows)).replace(/\{\{FRAMES\}\}/g, String(frames))
    .replace(/\{\{W\}\}/g, String(width)).replace(/\{\{H\}\}/g, String(height)).replace(/\{\{CELL\}\}/g, String(SHEET.cell)).replace(/\{\{GUTTER\}\}/g, String(SHEET.gutter))
    .replace(/\{\{TOP\}\}/g, String(SHEET.margin.top)).replace(/\{\{LEFT\}\}/g, String(SHEET.margin.left)).replace(/\{\{BASE\}\}/g, String(SHEET.baseline))
    .replace(/\{\{FRAMES_SUFFIX\}\}/g, frames ? `-f${frames}` : '')
    .replace(/\{\{FRAMES_LINE\}\}/g, frames
      ? `Then ONE more row at the bottom, FRAMES: ${frames} cells from the left, the SUMMER look of variant 1 in ${frames} poses of one smooth animation loop (a walk cycle: contact, passing, contact, passing; or sails at evenly turned angles; or branches swaying left, centre, right, centre), each pose the same size and on the same baseline. The other cells of that row stay empty.`
      : 'No frames row: only the variant rows.');
}
/** Render the template, the examples and the prompt into outDir. hooks: { chrome, reg, E, objectSvg, nightGrade, hookTransform }. */
export async function writeTemplates(outDir, { rows = 2, frames = 4, examples = false, chrome, reg, E, objectSvg, nightGrade, hookTransform }) {
  mkdirSync(outDir, { recursive: true });
  const shot = async (html, r, f, file) => {
    const { width, height } = sheetSize(r, f);
    const png = await chrome.screenshot({ html, width, height, transparent: false });
    writeFileSync(file, pngEncode(pngDecode(png)));   // re-encoded: no metadata
    return file;
  };
  const out = [];
  out.push(await shot(templateHtml(rows, frames, { labels: true, title: `OpenDash object sprite sheet: ${rows} variant row(s)${frames ? ` + ${frames} frames` : ''}, cell ${SHEET.cell} px, gutter ${SHEET.gutter} px, background ${SHEET.background}` }), rows, frames, join(outDir, `template-${rows}x6${frames ? `-f${frames}` : ''}.png`)));
  if (examples) for (const ex of EXAMPLES) {
    if (!E.obj(ex.id)) continue;
    const cells = exampleCells(E, ex.id, { rows: ex.rows, frames: ex.frames, objectSvg, nightGrade, hookTransform, reg });
    out.push(await shot(templateHtml(ex.rows, ex.frames, { labels: false, cells }), ex.rows, ex.frames, join(outDir, `example-${ex.id.replace('.', '-')}.png`)));
  }
  writeFileSync(join(outDir, 'PROMPT.md'), promptText({ rows, frames }));
  out.push(join(outDir, 'PROMPT.md'));
  return out;
}
export { rasterAssetBytes, readRasterMetas, cellRect };
