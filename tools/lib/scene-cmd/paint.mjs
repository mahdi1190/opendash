// `scene paint` (docs/dev/PAINTED_SCENES.md): a whole location as one AI painting, animated by the engine.
//
//   scene paint new <pack> <id> --images <folder> [--lat .. --lon .. --heading ..] [--label "..."] [--force]
//       the painting (summer.png), its edit-variants (spring, autumn, winter, night) and masks (sky, water, front; PNGs or
//       polygons in paint.json; the sky is derived when missing) -> raster objects ground.paint-<id>[-water|-front], the masks,
//       the regenerated 70-scene-lib-raster.js, and src/app/71-scene-<pack>.js + 72-anim-pack-<pack>.js (kept when they exist)
//   scene paint lint <pack>/<id>[,...]
//       sizes, bytes, masks present, alignment drift between the variants, where the actors stand
//   then: scene sheet <ref> --times, scene perf <ref> (the ordinary commands)
import { resolve } from 'node:path';
import { paintImport, paintLint } from '../scene-paint.mjs';

const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);

export default {
  summary: 'painted scenes: one AI painting of a place (+ seasons, night, masks) imported as the backdrop, then lint',
  usage: 'scene paint new <pack> <id> --images <folder> [--lat N --lon N --heading N] [--label t] [--force] | scene paint lint <ref>[,...]',
  options: {
    images: { type: 'string', help: 'paint new: the folder with summer.png (+ spring, autumn, winter, night .png; sky, water, front masks; paint.json)' },
    lat: { type: 'string', help: 'paint new: the standpoint latitude (the live sky)' },
    lon: { type: 'string', help: 'paint new: the standpoint longitude' },
    heading: { type: 'string', help: 'new / paint new: the view heading in degrees' },
    label: { type: 'string', help: 'paint new: the scene label (e.g. "Frensham Great Pond, Surrey")' },
    force: { type: 'boolean', help: 'paint new: overwrite the scene file (its actors are lost)' },
  },
  async run(args, ctx, lib = {}) {
    const pos = (ctx.positionals || []).filter(x => x !== 'paint');
    const sub = pos[0];
    if (sub === 'new') {
      const [pack, id] = pos.slice(1);
      if (!pack || !id || !args.images) throw new Error('usage: scene paint new <pack> <id> --images <folder>');
      const { launchChrome } = await import('../../release-chrome.mjs');
      const { findBrowser } = await import('../anim-render.mjs');
      const exe = findBrowser();
      if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable.');
      const chrome = await launchChrome({ executable: exe });
      const cfg = {};
      for (const k of ['lat', 'lon', 'heading']) if (args[k] != null) cfg[k] = Number(args[k]);
      if (args.label) cfg.label = args.label;
      let r;
      try { r = await paintImport(ctx.root, { folder: resolve(args.images), pack, id, chrome, cfg, force: !!args.force, out: ctx.out }); }
      finally { await chrome.close(); }
      ctx.out(`masks: ${Object.entries(r.masks).map(([k, v]) => `${k} ${v}`).join(', ')}; shares ${Object.entries(r.share).map(([k, v]) => `${k} ${v} %`).join(', ')}; horizon ${r.horizon}`);
      for (const [k, d] of Object.entries(r.drift)) ctx.out(`alignment ${k}: ${d.px} px (${d.dx}, ${d.dy})${d.px > 8 ? '  WARN: regenerate it as an edit of the summer image' : ''}`);
      ctx.out(`bytes (KB): ${Object.entries(r.bytes).map(([k, v]) => `${k} ${v}`).join(', ')}`);
      for (const n of r.notes) ctx.out(`note: ${n}`);
      for (const f of r.files) ctx.out(`wrote ${f}`);
      ctx.out(`objects: ${Object.values(r.ids).join(', ')} (${(r.ms / 1000).toFixed(1)} s)`);
      ctx.out(`next: add the actors in src/app/71-scene-${pack}.js, then node build.mjs --syntax && node tools/anim-pack.mjs scene paint lint ${pack}/${id} && node tools/anim-pack.mjs scene sheet ${pack}/${id} --times && node tools/anim-pack.mjs scene perf ${pack}/${id}`);
      return 0;
    }
    if (sub === 'lint') {
      const reg = lib.loadRegistry(ctx.root, { fresh: true }), E = lib.engineOf(reg);
      E.require('scene paint lint');
      const scenes = lib.selectScenes(reg, E, args, pos.slice(1));
      if (!scenes.length) throw new Error('scene paint lint needs a ref <pack>/<id>');
      let fail = 0;
      for (const s of scenes) {
        const C = E.compile(s.data(), { season: 'summer', lod: 1, L: null });
        const rules = paintLint(ctx.root, { C, E }), bad = rules.filter(r => !r.ok);
        if (bad.length) fail++;
        ctx.out(`${bad.length ? 'FAIL' : 'PASS'}  ${s.ref}`);
        for (const r of rules) ctx.out(`    ${!r.ok ? 'FAIL' : r.warn ? 'warn' : 'PASS'}  ${r.name.padEnd(14)} ${r.value}${r.message ? '  ' + r.message : ''}`);
      }
      return fail ? 2 : 0;
    }
    throw new Error('scene paint needs a subcommand: new or lint (node tools/anim-pack.mjs scene --help)');
  },
};
