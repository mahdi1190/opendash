#!/usr/bin/env node
// The raster-object demo's SOURCE images (docs/dev/OBJECT_IMPORT.md, "The demo"): five library objects rendered to PNG with
// headless Chrome, standing in for images an AI tool (Gemini, ChatGPT) would make, plus the manifest.csv that
// `object import-batch` reads. Node >= 20, no dependencies; needs Chrome, Edge or Chromium (CHROME_PATH).
//
//   node tools/object-import-demo.mjs [--out docs/dev/object-import-demo/source] [--import]
//   node tools/anim-pack.mjs object import-batch docs/dev/object-import-demo/source --manifest docs/dev/object-import-demo/source/manifest.csv
//
// --import also runs the demo's import: ONE manifest, ONE `object import-batch` (the five rows below, plus two SHEET rows that
// point at whole sprite sheets in docs/dev/object-sheets, with `rows` and `frames` set, exactly as an AI answer would be listed),
// which regenerates src/app/70-scene-lib-raster.js; the composed scene is src/app/71-scene-raster-demo-0.js.
//
// The five exercise the import paths on purpose:
//   building.cottage-ai   one PNG on a flat #00ff00 background (the background is removed), auto lit windows, derived seasons
//   tree.cherry-ai        a folder with REAL spring / summer (base) / autumn / winter images (nothing derived)
//   building.windmill-ai  a folder (base without sails) plus a sails PART from the manifest's parts column (spin about its centre)
//   vehicle.bus-ai        one transparent PNG, auto lit windows (no night image)
//   boat.narrowboat-ai    a folder with a REAL night image (the night image wins after dusk) and a lit overlay
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { loadRegistry, findBrowser } from './lib/anim-render.mjs';
import { engineOf } from './lib/scene-lint.mjs';
import { objectSvg, nightGrade } from './lib/anim-cmd/object.mjs';
import { launchChrome } from './release-chrome.mjs';
import { pngDecode, pngEncode } from './lib/png.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PX = 2;   // source pixels per world unit (the import scales them down to its --res)

/** What to render: the vector source, the demo id, the files (name -> how), the manifest fields. */
export const DEMO = [
  { src: 'building.cottage', id: 'building.cottage-ai', kit: 'temperate', role: 'building-mid', file: 'cottage.png', bg: '#00ff00', images: { 'cottage.png': { season: 'summer' } } },
  { src: 'tree.cherry', id: 'tree.cherry-ai', kit: 'temperate', role: 'tree', file: 'cherry', images: { 'cherry/base.png': { season: 'summer' }, 'cherry/spring.png': { season: 'spring' }, 'cherry/autumn.png': { season: 'autumn' }, 'cherry/winter.png': { season: 'winter' } } },
  { src: 'building.windmill', id: 'building.windmill-ai', kit: 'temperate', role: 'building-mid', tags: 'demo;signature', file: 'windmill', parts: 'sails=windmill-sails.png|spin', images: { 'windmill/base.png': { season: 'summer', omit: ['sails'] }, 'windmill-sails.png': { season: 'summer', only: ['sails'] } } },
  { src: 'vehicle.bus', id: 'vehicle.bus-ai', kit: 'london', role: 'vehicle', file: 'bus.png', images: { 'bus.png': { season: 'summer' } } },
  { src: 'boat.narrowboat', id: 'boat.narrowboat-ai', kit: 'water', role: 'boat', file: 'narrowboat', images: { 'narrowboat/base.png': { season: 'summer' }, 'narrowboat/night.png': { season: 'summer', night: true }, 'narrowboat/lit.png': { season: 'summer', night: true, lit: true } } },
];

/** The demo's sprite-sheet rows: example sheets of the prompt pack, listed in the manifest with rows / frames (as an AI answer would be). */
export const SHEET_ROWS = [
  { id: 'building.terrace-ai', sheet: 'docs/dev/object-sheets/example-building-terrace.png', size: 'x120', kit: 'london', role: 'building-far', rows: 2, frames: 0 },
  { id: 'person.walker-ai', sheet: 'docs/dev/object-sheets/example-person-walker.png', size: '', kit: 'people', role: 'walker', rows: 1, frames: 4 },
];

/** The page of one image: the object (some parts only) at PX pixels per unit on one shared canvas per object. */
function pageOf(E, reg, d, img) {
  const def = E.obj(d.src), R0 = E.shapes(d.src, 0, img.season);
  // one canvas for every image of the object: the union box of its seasons
  let box = null;
  for (const s of ['spring', 'summer', 'autumn', 'winter']) { const b = E.shapes(d.src, 0, s).box; box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b.slice(); }
  const order = (R0.order || Object.keys(R0.parts)).filter(p => (!img.only || img.only.includes(p) || (img.lit && p === 'lit')) && !(img.omit || []).includes(p));
  const R = Object.assign({}, R0, { order, still: order.filter(p => p !== 'lit'), anim: [] });
  const g = objectSvg(R, def, { grade: img.night ? nightGrade(reg, E) : (c) => c, lit: !!img.lit, idp: 'd' });
  const w = Math.ceil((box[2] - box[0] + 8) * PX), h = Math.ceil((box[3] - box[1] + 8) * PX);
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:${d.bg || 'transparent'}}</style></head><body>`
    + `<svg width="${w}" height="${h}" viewBox="${box[0] - 4} ${box[1] - 4} ${box[2] - box[0] + 8} ${box[3] - box[1] + 8}"><defs>${g.defs}</defs>${g.body}</svg></body></html>`;
  return { html, w, h, height: box[3] - box[1] };
}

async function main() {
  const { values } = parseArgs({ options: { out: { type: 'string' }, import: { type: 'boolean' } } });
  const out = resolve(values.out || join(ROOT, 'docs', 'dev', 'object-import-demo', 'source'));
  const exe = findBrowser();
  if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable.');
  const reg = loadRegistry(ROOT), E = engineOf(reg);
  const chrome = await launchChrome({ executable: exe });
  const rows = ['id,file,category,size,anchor,kit,tags,parts,role,res,rows,frames'];
  try {
    for (const d of DEMO) {
      if (!E.obj(d.src)) throw new Error(`no library object ${d.src}`);
      let height = 0;
      for (const [rel, img] of Object.entries(d.images)) {
        const p = pageOf(E, reg, d, img);
        height = Math.max(height, p.height);
        const png = await chrome.screenshot({ html: p.html, width: p.w, height: p.h, transparent: !d.bg });
        mkdirSync(dirname(join(out, rel)), { recursive: true });
        writeFileSync(join(out, rel), pngEncode(pngDecode(png)));   // re-encoded: no metadata
        console.log(join(out, rel));
      }
      // the same height as the vector source (the trimmed image fills it), so the raster stands in at the same scale
      rows.push([d.id, d.file, d.id.split('.')[0], 'x' + Math.round(height), 'bottom-centre', d.kit, d.tags || 'demo', d.parts || '', d.role, '1', '', ''].join(','));
    }
  } finally { await chrome.close(); }
  // the sheet rows: the file relative to the manifest's folder
  for (const r of SHEET_ROWS) rows.push([r.id, relative(out, join(ROOT, r.sheet)).split(sep).join('/'), r.id.split('.')[0], r.size, 'bottom-centre', r.kit, 'demo', '', r.role, '1', r.rows, r.frames].join(','));
  writeFileSync(join(out, 'manifest.csv'), rows.join('\n') + '\n');
  console.log(join(out, 'manifest.csv'));
  if (!values.import) return;
  const run = (args) => {
    console.log('> node tools/anim-pack.mjs ' + args.join(' '));
    const r = spawnSync(process.execPath, [join(ROOT, 'tools', 'anim-pack.mjs'), ...args], { cwd: ROOT, stdio: 'inherit' });
    if (r.status) throw new Error('failed: ' + args.join(' '));
  };
  run(['object', 'import-batch', out, '--manifest', join(out, 'manifest.csv'), '--no-sheet']);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e.message || e); process.exit(1); });
