// `scene street` (docs/dev/SCENE_ENGINE_V2.md 19.4; builder F): a street of generated buildings, as a recipe draft or a rule.
//
//   scene street [<pack>/<id>] [--style id,id | id:3,id:1] [--side left|right|both] [--storeys 2,3] [--frontage 4.6,6.2]
//                [--from 6] [--to 140] [--setback 2] [--gaps 0.08] [--shops ground|none|corner] [--seed N]
//                [--into <pack>/<id>] [--out file.json] [--render [--night] [--date D] [--dir folder]]
//     with <pack>/<id>: writes a NEW v2 recipe file (a straight road, pavements, the street rules) through scene-recipe.mjs (D)
//     --into <pack>/<id>: appends the rule(s) to that recipe's scene.streets (the recipe's version is checked: never a lost edit)
//     --out file.json: writes the draft recipe as JSON; with neither, the draft (or the rule) is printed
//     --render: a preview at noon and golden hour (--night: and after dark) through sceneGenPreview (the v1 renderers), PNGs
//               into --dir (default .anim-ref/streets/)
// Loaded by the `scene` command's delegation (tools/lib/anim-cmd/scene.mjs): default { summary, usage, options, run(args, ctx, lib) }.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);
const num = (v, def) => { const n = Number(v); return v == null || v === '' || !Number.isFinite(n) ? def : n; };
const range = (v, def) => { if (v == null) return def; const a = String(v).split(',').map(Number).filter(Number.isFinite); return a.length === 2 ? a : a.length === 1 ? a[0] : def; };

/** The style mix of --style: 'a,b' (equal weights) or 'a:3,b:1'. */
export function styleMix(v) {
  const out = {};
  for (const tok of splitList(v)) { const [id, w] = tok.split(':'); out[id] = w == null ? 1 : Math.max(0, Number(w) || 0); }
  return Object.keys(out).length ? out : { 'victorian-terrace': 1 };
}
/** The street rule(s) from the options: one per side (19.4). */
export function streetRules(args = {}) {
  const sides = args.side === 'both' || args.side == null ? ['left', 'right'] : [args.side === 'right' ? 'right' : 'left'];
  const seed = Math.round(num(args.seed, 1));
  return sides.map((side, i) => {
    const r = { side, along: args.along || 'road', from: num(args.from, 6), to: num(args.to, 140), style: styleMix(args.style), setback: num(args.setback, 1.5), gaps: num(args.gaps, 0.08), shops: ['ground', 'none', 'corner'].includes(args.shops) ? args.shops : 'none', seed: seed + i * 17 };
    const st = range(args.storeys, null), fr = range(args.frontage, null);
    if (st != null) r.storeys = st;
    if (fr != null) r.frontage = fr;
    return r;
  });
}
/** A new v2 street recipe: a straight road with pavements, the rules, the street camera (G's preset numbers when loaded). */
export function streetDraft(pack, id, rules, { lat = 53.38, lon = -1.47, heading = 180, camera = null } = {}) {
  return {
    v: 2, pack, meta: { id, label: id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()), site: 'A generated street', tags: ['street', 'terrace', 'town', 'houses', 'generated', 'urban'], mood: 'calm', colour: 'amber' },
    scene: {
      id, view: { lat, lon }, camera: Object.assign({ eye: 1.65, fov: 64, horizon: 470, heading, preset: 'street' }, camera || {}),
      surfaces: [
        { id: 'land', kind: 'plot', rest: true },
        { id: 'road', kind: 'road', path: [[0.6, 3], [0.6, 120], [4, 260]], width: 7.3, markings: 'centre' },
        { id: 'pave-l', kind: 'pavement', beside: 'road', side: 'left', width: 2.6, kerb: 0.12 },
        { id: 'pave-r', kind: 'pavement', beside: 'road', side: 'right', width: 2.6, kerb: 0.12 },
      ],
      streets: rules, place: [], flows: [], atmos: 'auto', weather: 'live', cover: 'auto', season: 'auto', at: 'afternoon', setting: 'urban',
    },
  };
}
/** rec with the rules appended to scene.streets (a new object; the input is not changed). */
export function mergeStreets(rec, rules) {
  const out = JSON.parse(JSON.stringify(rec));
  out.scene.streets = (out.scene.streets || []).concat(rules);
  return out;
}

export default {
  summary: 'a street of generated buildings (19.4): a new v2 recipe, or street rules merged into one (--into); --render previews it',
  usage: 'scene street [<pack>/<id>] [--style a,b | a:3,b:1] [--side left|right|both] [--storeys 2,3] [--frontage 4.6,6.2] [--from 6] [--to 140] [--setback 2] [--gaps 0.08] [--shops ground|none|corner] [--seed N] [--into <pack>/<id>] [--out f.json] [--render [--night] [--date D] [--dir d]]',
  options: {
    side: { type: 'string', help: 'street: left | right | both (default both)' },
    along: { type: 'string', help: 'street: the id of the strip to build along (default road)' },
    from: { type: 'string', help: 'street: metres along the road where the buildings start (default 6)' },
    to: { type: 'string', help: 'street: metres along the road where they end (default 140)' },
    setback: { type: 'string', help: 'street: metres from the pavement edge to the fronts (default 1.5)' },
    gaps: { type: 'string', help: 'street: the share of alleys and driveways between buildings (default 0.08)' },
    shops: { type: 'string', help: 'street: ground | none | corner (default none; interwar shops always have theirs)' },
    render: { type: 'boolean', help: 'street: render a preview (noon, golden hour; --night adds after dark)' },
    dir: { type: 'string', help: 'street --render: the folder for the PNGs (default .anim-ref/streets/)' },
  },
  async run(args, ctx, lib = {}) {
    const pos = (ctx.positionals || []).filter(x => x !== 'street');
    const target = pos[0] || null;
    const recipes = lib.recipes || await import('../scene-recipe.mjs');
    const reg = (lib.loadRegistry || (await import('../anim-render.mjs')).loadRegistry)(ctx.root);
    const G = reg.R.get, known = typeof G('sceneBuildingStyles') === 'function' ? G('sceneBuildingStyles')().map(s => s.id) : [];
    const rules = streetRules(args);
    for (const id of Object.keys(rules[0].style)) if (known.length && !known.includes(id)) throw new Error(`unknown style ${id} (${known.join(', ')})`);
    let rec = null;
    if (args.into) {
      const cur = recipes.readRecipe(ctx.root, args.into);
      rec = mergeStreets(cur.rec, rules.map(r => Object.assign({}, r, { along: r.along })));
      const road = (rec.scene.surfaces || []).find(s => s.id === rules[0].along);
      if (!road) throw new Error(`${args.into} has no surface "${rules[0].along}" to build along (pass --along <surface id>)`);
      const w = recipes.writeRecipe(ctx.root, rec, { version: cur.version });
      ctx.out(`${w.changed ? 'merged' : 'unchanged'}: ${rules.length} street rule(s) into ${args.into} (${w.file})`);
    } else {
      const [pack, id] = target ? target.split('/') : ['v2-draft', 'generated-street'];
      if (!/^[a-z0-9-]{1,40}$/.test(pack || '') || !/^[a-z0-9-]{1,60}$/.test(id || '')) throw new Error('scene street <pack>/<id>: lower case, digits and dashes');
      rec = streetDraft(pack, id, rules, { lat: num(args.lat, 53.38), lon: num(args.lon, -1.47), heading: num(args.heading, 180) });
      if (target) { const w = recipes.newRecipeFile(ctx.root, rec); ctx.out(`wrote ${w.rel || w.file}`); }
      if (args.out) { mkdirSync(dirname(args.out), { recursive: true }); writeFileSync(args.out, JSON.stringify(rec, null, 1) + '\n'); ctx.out(`wrote ${args.out}`); }
      if (!target && !args.out && !args.render) ctx.out(JSON.stringify(rec, null, 1));
    }
    if (args.render) {
      const page = lib.harness || await import('../scene-page.mjs');
      const times = lib.times || await import('../scene-times.mjs');
      const { findBrowser } = await import('../anim-render.mjs');
      const { launchChrome } = await import('../../release-chrome.mjs');
      const exe = findBrowser();
      if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable.');
      const sc = rec.scene, lat = (sc.view && sc.view.lat) || 53.38, lon = (sc.view && sc.view.lon) || -1.47;
      const T = times.sceneTimesFor(lat, lon, args.date || new Date().toISOString().slice(0, 10));
      const dir = args.dir || join(ctx.root, '.anim-ref', 'streets');
      mkdirSync(dir, { recursive: true });
      const data = `sceneGenPreview(${JSON.stringify(sc)}, { sky: window.__sceneSkyFor(${lat}, ${lon}) })`;
      const chrome = await launchChrome({ executable: exe });
      try {
        for (const m of ['noon', 'golden'].concat(args.night ? ['night'] : [])) {
          if (!T[m]) continue;
          ctx.out(await page.sceneRenderPng(chrome, { root: ctx.root, data, at: T[m], size: { w: 1600, h: 900 }, still: true }, join(dir, `${rec.meta.id}-${m}.png`)));
        }
      } finally { await chrome.close(); }
    }
    return 0;
  },
};
