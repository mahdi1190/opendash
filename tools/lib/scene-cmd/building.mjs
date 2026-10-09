// `scene building` (docs/dev/SCENE_ENGINE_V2.md 19.4; builder F): preview the procedural building generator.
//
//   scene building sheet [--style mill[,georgian...] | --all] [--storeys N] [--frontage M] [--seeds 4] [--seasons] [--night]
//                        [--snow] [--date YYYY-MM-DD] [--out dir]
//       renders the ELEVATION objects (sceneBuildingObject) as sheets: a row per seed, a column per season (summer only
//       without --seasons); --night adds the same sheet after dark (lit windows by the share, shopfronts, canopy lamps)
//   scene building list
//       the styles: id, label, eras, regions, grouping
//
// Loaded by the `scene` command's delegation (tools/lib/anim-cmd/scene.mjs, builder D): default { summary, usage, options, run }.
// lib (optional) = { loadRegistry, harness, times, ... }; without it this module imports what it needs itself.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];

/** The page expression (evaluated in the scene page) of a sheet: a v1 scene with one elevation object per cell. */
export function buildingSheetData({ styles, seeds = 4, seasons = ['summer'], storeys = null, frontage = null, snow = false, lat = 53.38, lon = -1.47 }) {
  const cfg = { styles, seeds, seasons, storeys, frontage, snow, lat, lon };
  return `(() => {
    const cfg = ${JSON.stringify(cfg)};
    const rows = [];
    for (const st of cfg.styles) for (let k = 0; k < cfg.seeds; k++) rows.push({ st, seed: 101 + k * 37 });
    const cw = 1600 / cfg.seasons.length, ch = 900 / rows.length, place = [];
    rows.forEach((r, i) => cfg.seasons.forEach((season, j) => {
      const p = { style: r.st, seed: r.seed };
      if (cfg.storeys) p.storeys = cfg.storeys;
      if (cfg.frontage) p.frontage = cfg.frontage;
      if (cfg.snow) p.snow = true;
      const id = sceneBuildingObject(p), d = sceneObj(id);
      const s = Math.min(cw * 0.86 / d.size[0], ch * 0.8 / d.size[1], 1.6);
      place.push({ obj: id, x: Math.round(cw * (j + 0.5)), y: Math.round(ch * (i + 0.93)), s: Math.round(s * 1000) / 1000, layer: 'near', season, seed: i * 7 + j + 1 });
    }));
    const ground = rows.map((r, i) => ({ layer: 'far', d: 'M-160 ' + Math.round(ch * (i + 0.93)) + 'H1760V' + Math.round(ch * (i + 1)) + 'H-160Z', fill: '#a8a49a' }));
    return { v: 1, id: 'building-sheet', view: { lat: cfg.lat, lon: cfg.lon, heading: 180, fov: 66, horizon: 900 }, at: 'noon', season: 'summer', setting: 'urban', particles: 'none', weather: 'none',
      layers: [{ id: 'far', depth: 0.2, haze: 0 }, { id: 'near', depth: 0.75, haze: 0 }], ground, place };
  })()`;
}

export default {
  summary: 'preview the procedural building generator: sheets of the elevation objects by style, seed, season and night (19)',
  usage: 'scene building sheet [--style id,... | --all] [--storeys N] [--frontage M] [--seeds 4] [--seasons] [--night] [--snow] [--date D] [--out dir] | scene building list',
  options: {
    style: { type: 'string', multiple: true, help: 'building: the styles to show (comma-separated; default all)' },
    all: { type: 'boolean', help: 'building: every style' },
    storeys: { type: 'string', help: 'building / street: storeys (building: one number; street: N or N,M)' },
    frontage: { type: 'string', help: 'building / street: frontage in metres (building: one number; street: A,B)' },
    seeds: { type: 'string', help: 'building: seeds per style, one row each (default 4; with several styles 1)' },
    night: { type: 'boolean', help: 'building / street: also render after dark' },
    snow: { type: 'boolean', help: 'building: roofs and sills under snow in the winter column' },
  },
  async run(args, ctx, lib = {}) {
    const pos = (ctx.positionals || []).filter(x => x !== 'building');
    const sub = pos[0] || 'sheet';
    const reg = (lib.loadRegistry || (await import('../anim-render.mjs')).loadRegistry)(ctx.root, { fresh: true });
    const G = reg.R.get;
    if (typeof G('sceneBuildingStyles') !== 'function') throw new Error('the building generator (src/app/70-scene-gen-0building.js) is not loaded');
    const all = G('sceneBuildingStyles')();
    if (sub === 'list') {
      for (const s of all) ctx.out(`${s.id.padEnd(20)} ${s.label.padEnd(30)} ${s.eras ? s.eras.join('-') : ''}  ${s.regions.join(',')}  ${s.grouping}`);
      return 0;
    }
    if (sub !== 'sheet') throw new Error('scene building needs a subcommand: sheet or list');
    const want = args.all ? all.map(s => s.id) : splitList(args.style);
    const styles = want.length ? want : all.map(s => s.id);
    for (const s of styles) if (!all.some(x => x.id === s)) throw new Error(`unknown style ${s} (${all.map(x => x.id).join(', ')})`);
    const seeds = args.seeds ? Math.max(1, Math.min(8, Number(args.seeds) | 0)) : (styles.length > 1 ? 1 : 4);
    if (styles.length * seeds > 12) throw new Error(`${styles.length * seeds} rows: at most 12 (fewer --style or --seeds)`);
    const seasons = args.seasons ? SEASONS : ['summer'];
    const out = args.out || join(ctx.root, '.anim-ref', 'buildings');
    mkdirSync(out, { recursive: true });
    const page = lib.harness || await import('../scene-page.mjs');
    const times = lib.times || await import('../scene-times.mjs');
    const { findBrowser } = await import('../anim-render.mjs');
    const { launchChrome } = await import('../../release-chrome.mjs');
    const exe = findBrowser();
    if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable.');
    const date = args.date || new Date().toISOString().slice(0, 10), T = times.sceneTimesFor(53.38, -1.47, date);
    const data = buildingSheetData({ styles, seeds, seasons, storeys: args.storeys ? Number(args.storeys) : null, frontage: args.frontage ? Number(args.frontage) : null, snow: !!args.snow });
    const name = (styles.length > 3 ? 'all' : styles.join('+')) + (args.seasons ? '-seasons' : '');
    const files = [];
    const chrome = await launchChrome({ executable: exe });
    try {
      files.push(await page.sceneRenderPng(chrome, { root: ctx.root, data, at: T.noon, size: { w: 1600, h: 900 }, still: true }, join(out, name + '.png')));
      if (args.night) files.push(await page.sceneRenderPng(chrome, { root: ctx.root, data, at: T.night, size: { w: 1600, h: 900 }, still: true }, join(out, name + '-night.png')));
    } finally { await chrome.close(); }
    for (const f of files) ctx.out(f);
    return 0;
  },
};
