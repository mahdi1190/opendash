// node tools/anim-pack.mjs object normalise ...   the style normaliser for imported raster objects (docs/dev/SCENE_ENGINE_V2.md 24.2; builder H)
//
//   object normalise <id>[,...] | --dir assets/objects/<cat>/<name> | --all-raster [--write] [--report] [--strict] [--json]
//                    [--palette tools/scene-house-palette.json]
//   object normalise --build-palette [--palette <out>]   (re)build the house palette from the library objects' palettes
//
// Reads each raster object's meta.json and PNGs (assets/objects/<category>/<name>/), runs tools/lib/style-normalise.mjs on every
// image (base and seasons: palette, shading, cast shadow, outlines, fringe; night: shadow and fringe; lit, snow and masks: untouched;
// parts and frames: all but the shadow), and checks the base image (anchor, size, padding, background, budget).
//   default      a dry run: what would change, with the mean delta E to the house palette before and after
//   --write      replaces the PNGs after backing up the originals to .anim-ref/normalise-backup/<id>/, and writes
//                meta.normalised = { v: 1, palette, deltaE: { before, after }, ops } into meta.json
//   --strict     a failing check exits 2
// PNG decoding uses scene-capture.mjs's pngDecode (8-bit RGB / RGBA) until object-import's tools/lib/png.mjs lands.
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, statSync } from 'node:fs';
import { join, resolve, relative, dirname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { pngDecode } from '../scene-capture.mjs';
import { housePalette, buildHousePalette, normaliseImage, checkImage, unionBox, contentBox, pngEncodeRGBA, RASTER_ANCHORS } from '../style-normalise.mjs';

const ID_RE = /^([a-z]+)\.([a-z0-9-]{1,40})$/;
const COLOUR = ['base', 'summer', 'spring', 'autumn', 'winter'], NIGHT = ['night'], OVERLAY = ['lit', 'snow', 'mask_lit'];
const SEASON_OF = { spring: 'spring', summer: 'summer', autumn: 'autumn', winter: 'winter', base: null };
const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);
const rel = (root, f) => relative(root, f).replace(/\\/g, '/');

/** Every image of a raster object: [{ file, kind, season, role }] from its meta.json (variants, parts, frames). */
export function objectImages(dir, meta) {
  const out = [], seen = new Set();
  const add = (file, kind, season, role) => { const f = join(dir, file); if (seen.has(f) || !existsSync(f) || !/\.png$/i.test(file)) return; seen.add(f); out.push({ file: f, kind, season, role }); };
  const variants = Array.isArray(meta.variants) ? meta.variants : [];
  variants.forEach((v, i) => {
    if (!v || typeof v !== 'object') return;
    for (const [name, file] of Object.entries(v)) {
      if (typeof file !== 'string') continue;
      const key = name.replace(/\.png$/i, '');
      if (COLOUR.includes(key)) add(file, 'colour', SEASON_OF[key] || null, `v${i}:${key}`);
      else if (NIGHT.includes(key)) add(file, 'night', null, `v${i}:${key}`);
      else if (OVERLAY.includes(key)) add(file, 'overlay', null, `v${i}:${key}`);
    }
  });
  for (const p of Array.isArray(meta.parts) ? meta.parts : []) if (p && typeof p.image === 'string') { add(p.image, 'part', null, 'part:' + (p.name || '')); if (Array.isArray(p.box) && out.length) out[out.length - 1].box = out[out.length - 1].role === 'part:' + (p.name || '') ? p.box : undefined; }
  const fr = meta.frames && Array.isArray(meta.frames.images) ? meta.frames.images : [];
  fr.forEach((f, i) => { if (typeof f === 'string') add(f, 'part', null, 'frame:' + i); });
  // the colour images first: a night image reuses its variant's day cut (the base's, else the first season's)
  const rank = { colour: 0, part: 1, night: 2, overlay: 3 };
  return out.map((x, i) => [x, i]).sort((p, q) => rank[p[0].kind] - rank[q[0].kind] || p[1] - q[1]).map(p => p[0]);
}
/** The object folders a run covers. */
function targets(root, args, ids) {
  const base = join(root, 'assets', 'objects');
  const list = [];
  if (args['all-raster']) {
    if (existsSync(base)) for (const cat of readdirSync(base).sort()) {
      const cd = join(base, cat);
      if (!statSync(cd).isDirectory()) continue;
      for (const name of readdirSync(cd).sort()) if (existsSync(join(cd, name, 'meta.json'))) list.push(join(cd, name));
    }
  }
  for (const d of splitList(args.dir)) list.push(resolve(root, d));
  for (const id of ids) {
    const m = ID_RE.exec(id);
    if (!m) throw new Error(`object normalise: "${id}" is not an object id (<category>.<name>)`);
    list.push(join(base, m[1], m[2]));
  }
  return [...new Set(list)];
}

export default {
  summary: 'normalise imported raster objects to the house style: palette, shading, cast shadows, outlines, fringes; anchor and size checks',
  usage: 'object normalise <id>[,...] | --dir <folder> | --all-raster [--write] [--report] [--strict] [--json] [--palette <file>] | object normalise --build-palette',
  options: {
    dir: { type: 'string', help: 'object normalise: a raster object folder (assets/objects/<category>/<name>)' },
    'all-raster': { type: 'boolean', help: 'object normalise: every raster object under assets/objects/' },
    write: { type: 'boolean', help: 'object normalise: replace the PNGs (originals backed up to .anim-ref/normalise-backup/<id>/) and record meta.normalised' },
    report: { type: 'boolean', help: 'object normalise: print every image with its steps and the delta E to the house palette before and after' },
    strict: { type: 'boolean', help: 'object normalise: a failing check (anchor, size, padding, background, budget) exits 2' },
    palette: { type: 'string', help: 'object normalise: the house palette JSON (default tools/scene-house-palette.json); with --build-palette, where to write it' },
    'build-palette': { type: 'boolean', help: 'object normalise: (re)build the house palette from the object library palettes' },
  },
  async run(args, ctx, lib = {}) {
    const root = ctx.root, rest = ctx.positionals.slice(1);
    const palFile = resolve(root, args.palette || join('tools', 'scene-house-palette.json'));
    if (args['build-palette']) {
      const loadRegistry = lib.loadRegistry || (await import('../anim-render.mjs')).loadRegistry;
      const engineOf = lib.engineOf || (await import('../scene-lint.mjs')).engineOf;
      const E = engineOf(loadRegistry(root, { fresh: true }));
      E.require('object normalise --build-palette');
      const json = buildHousePalette(E.objs());
      writeFileSync(palFile, JSON.stringify(json, null, 1) + '\n');
      ctx.out(`wrote ${rel(root, palFile)}: ${json.colours} colours in ${Object.keys(json.groups).length} material groups`);
      return 0;
    }
    if (!existsSync(palFile)) throw new Error(`no house palette at ${rel(root, palFile)} (object normalise --build-palette makes it)`);
    const palText = readFileSync(palFile, 'utf8'), pal = housePalette(JSON.parse(palText));
    const palId = basename(palFile) + '@' + createHash('sha1').update(palText).digest('hex').slice(0, 8);
    const dirs = targets(root, args, splitList(rest));
    if (!dirs.length) throw new Error('object normalise needs ids, --dir <folder> or --all-raster (node tools/anim-pack.mjs object --help)');
    // real heights from the engine (A's sceneObjReal) when the registry loads; else the class table in style-normalise.mjs
    let realOf = () => null;
    try {
      const loadRegistry = lib.loadRegistry || (await import('../anim-render.mjs')).loadRegistry;
      const reg = loadRegistry(root);
      const f = reg && reg.R && reg.R.get('sceneObjReal');
      if (typeof f === 'function') realOf = (id) => { try { return f(id); } catch { return null; } };
    } catch { /* the class table */ }
    const results = [];
    let failing = 0;
    for (const dir of dirs) {
      const metaFile = join(dir, 'meta.json');
      if (!existsSync(metaFile)) throw new Error(`no meta.json in ${rel(root, dir)}`);
      const meta = JSON.parse(readFileSync(metaFile, 'utf8'));
      const id = meta.id || (basename(dirname(dir)) + '.' + basename(dir)), category = meta.category || id.split('.')[0], tags = meta.tags || [];
      const imgs = objectImages(dir, meta), done = [], canvas = [], parts = [], masks = new Map();
      let checks = [], first = null;
      for (const im of imgs) {
        const buf = readFileSync(im.file);
        let img;
        try { img = pngDecode(buf); } catch (e) { done.push({ file: rel(root, im.file), role: im.role, error: e.message }); continue; }
        const vkey = im.role.split(':')[0];
        const r = normaliseImage(img, pal, { category, tags, season: im.season, kind: im.kind, shadowMask: masks.get(vkey) || masks.get('v0') || null });
        if (r.mask && (im.role.endsWith(':base') || !masks.has(vkey))) masks.set(vkey, r.mask);
        if (im.kind !== 'overlay' && !im.box) canvas.push(r.img);
        if (im.box) parts.push({ img: r.img, box: im.box });
        if (im.role === 'v0:base' || (!first && im.kind === 'colour')) first = { img: r.img, bytes: buf.length };
        const out = { file: rel(root, im.file), role: im.role, kind: im.kind, ops: r.report.ops, deltaE: r.report.deltaE, light: r.report.light };
        if (args.write && im.kind !== 'overlay') {
          const bak = join(root, '.anim-ref', 'normalise-backup', id, relative(dir, im.file));
          mkdirSync(dirname(bak), { recursive: true });
          if (!existsSync(bak)) copyFileSync(im.file, bak);
          writeFileSync(im.file, pngEncodeRGBA(r.img.width, r.img.height, r.img.data));
          out.written = true;
        }
        done.push(out);
      }
      if (first) {
        // a part (sails, a wheel) has its own image placed by its box (world units from the anchor): its content joins the canvas union
        const Wb = first.img.width, Hb = first.img.height, an = RASTER_ANCHORS[meta.anchor || 'bottom-centre'] || [0.5, 1];
        const k = Array.isArray(meta.size) && meta.size[0] ? Wb / meta.size[0] : 1;
        const extra = parts.map(({ img, box }) => {
          const b = contentBox(img);
          if (!b || !Array.isArray(box) || box.length < 4) return null;
          const sx = box[2] / img.width, sy = box[3] / img.height, X = (wx) => an[0] * Wb + wx * k, Y = (wy) => an[1] * Hb + wy * k;
          return { x0: Math.max(0, Math.floor(X(box[0] + b.x0 * sx))), y0: Math.max(0, Math.floor(Y(box[1] + b.y0 * sy))), x1: Math.min(Wb - 1, Math.ceil(X(box[0] + (b.x1 + 1) * sx)) - 1), y1: Math.min(Hb - 1, Math.ceil(Y(box[1] + (b.y1 + 1) * sy)) - 1) };
        }).filter(Boolean);
        checks = checkImage(first.img, Object.assign({ category }, meta), { bytes: first.bytes, real: realOf(id), union: unionBox(canvas.filter(im => im.width === Wb && im.height === Hb), extra) });
      }
      const colour = done.filter(x => x.deltaE && x.kind !== 'overlay');
      const before = colour.length ? Math.round(colour.reduce((a, x) => a + x.deltaE.before, 0) / colour.length * 10) / 10 : 0;
      const after = colour.length ? Math.round(colour.reduce((a, x) => a + x.deltaE.after, 0) / colour.length * 10) / 10 : 0;
      const ops = [...new Set(colour.flatMap(x => x.ops.map(o => o.split(':')[0])))];
      if (args.write) {
        meta.normalised = { v: 1, palette: palId, deltaE: { before, after }, ops, at: new Date().toISOString().slice(0, 10) };   // clock-ok: a provenance date in the object's metadata
        writeFileSync(metaFile, JSON.stringify(meta, null, 1) + '\n');
      }
      const fails = checks.filter(c => !c.ok);
      if (fails.length) failing++;
      results.push({ id, dir: rel(root, dir), images: done, deltaE: { before, after }, checks, pass: !fails.length });
    }
    if (args.json) { ctx.out(JSON.stringify({ ok: !failing, palette: palId, written: !!args.write, objects: results }, null, 1)); return args.strict && failing ? 2 : 0; }
    ctx.out(`object normalise: ${results.length} object(s), palette ${palId}${args.write ? ' (written; originals in .anim-ref/normalise-backup/)' : ' (dry run: --write to apply)'}`);
    for (const r of results) {
      ctx.out(`\n${r.pass ? 'PASS' : 'FAIL'}  ${r.id}   delta E to the house palette ${r.deltaE.before} -> ${r.deltaE.after}   (${r.images.length} image${r.images.length === 1 ? '' : 's'})`);
      if (args.report) for (const im of r.images) {
        if (im.error) { ctx.out(`    ${im.file}: ${im.error}`); continue; }
        ctx.out(`    ${im.role.padEnd(12)} ${im.file}   dE ${im.deltaE.before} -> ${im.deltaE.after}${im.light ? `   light ${im.light.imbalance} %` : ''}`);
        for (const o of im.ops) ctx.out(`        ${o}`);
      }
      for (const c of r.checks) if (!c.ok || c.warn || args.report) ctx.out(`    ${!c.ok ? 'FAIL' : c.warn ? 'WARN' : 'ok  '}  ${c.check.padEnd(11)} ${String(c.value).padEnd(22)} ${c.limit}${c.message ? `\n          -> ${c.message}` : ''}`);
    }
    ctx.out('');
    ctx.out(failing ? `${failing} object(s) with failing checks${args.strict ? '' : ' (warnings: --strict makes them failures)'}` : 'All checks pass.');
    return args.strict && failing ? 2 : 0;
  },
};
