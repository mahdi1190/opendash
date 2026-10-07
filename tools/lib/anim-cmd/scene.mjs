// node tools/anim-pack.mjs scene new|upgrade|lint|sheet|perf ...   composed scenes (docs/dev/SCENE_ENGINE.md sections 3, 8, 10, 15, 16)
//
//   scene new <pack> <id> [--brief file.md | --archetype <id> --row '<json>'] [--lat .. --lon .. --heading ..] [--setting s] [--kits a,b]
//       writes src/app/71-scene-<pack>-<n>.js (and src/app/72-anim-pack-<pack>.js when missing): a composed scene that compiles at once,
//       composed from the library by kit and role (or from an archetype), ready to lint and look at
//   scene upgrade <ref> [--archetype <id>] [--box x0,y0,x1,y1 | --landmark <obj id>] [--slug s] [--dry-run] [--force]
//       the composed draft of a hand-drawn region scene: the landmark extracted into a library object, the archetype suggested (16.3)
//   scene lint [<ref>,... | --pack <id> | --region <id> | --archetype <id> --table <id> [--rows N]] [--upgrades] [--perf] [--gpu] [--json]
//       the composed profile: data, the bar (15.2), placement variety, care (and perf with --perf); exit 2 on a failure. A batch ends with
//       one summary table: rows, pass, fail, the worst animatedDraws and dynMs, the means, and the 5 rows nearest to failing
//   scene sheet [<ref>,... | --pack | --region | --archetype --table [--sample N]] [--times] [--seasons] [--compare] [--date D] [--at ISO]
//       [--crop phone|square] [--contact] [--svg] [--upgrades] [--out dir]   PNGs from the real renderer in headless Chrome
//   scene perf [<ref>,... | --pack | --region | --archetype --table [--sample N]] [--seconds 3] [--gpu] [--rebake] [--upgrades] [--json]
//       drawMs and dynMs in the real canvas renderer against the budget (x swFactor in software raster)
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadRegistry, findBrowser, parseLocation } from '../anim-render.mjs';
import { loadThresholds } from '../../anim-pack.mjs';
import { engineOf, lintScene, perfRules, dataOf } from '../scene-lint.mjs';
import { upgradeScaffold, regionOf, suggestArchetype } from '../scene-upgrade.mjs';
import { sceneTimesFor, seasonDates, MOMENTS } from '../scene-times.mjs';
import { regions } from '../anim-region.mjs';
import { launchChrome } from '../../release-chrome.mjs';

const pad = (s, n) => String(s).padEnd(n), lpad = (s, n) => String(s).padStart(n);
const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = (v) => Math.round(v * 100) / 100;
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** A seeded random (the tool's own: synthetic rows and samples must be the same on every run). */
function rndOf(seed) { let a = seed >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hashOf(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/* ---------------------------------------------------------------------------------------------
   What a command works on
   --------------------------------------------------------------------------------------------- */
/**
 * Synthetic rows for an archetype (--rows N): from its params (2.7 types) and the real table's values, seeded, so a batch of
 * hundreds can be linted and timed without writing a table. id: syn-<n>; a sign: "Synthetic <n>"; a list: 1 to 3 of the table's values;
 * a number: a table value jittered; an enum: any of its values.
 */
export function syntheticRows(arch, rows, n, seed = 7) {
  const r = rndOf(seed), out = [], params = arch.params || {};
  const pick = (a) => a[Math.floor(r() * a.length)];
  for (let i = 1; i <= n; i++) {
    const base = rows.length ? pick(rows) : {}, row = {};
    for (const [k, t] of Object.entries(params)) {
      const vals = rows.map(x => x[k]).filter(v => v != null);
      if (t === 'id') row[k] = `syn-${i}`;
      else if (t === 'sign') row[k] = `Synthetic ${['Halt', 'Road', 'Park', 'Green', 'Cross', 'Hill', 'Lane', 'Gate'][i % 8]} ${i}`;
      else if (t === 'list') { const all = [...new Set(vals.flat())]; row[k] = all.length ? [...new Set(Array.from({ length: 1 + Math.floor(r() * Math.min(3, all.length)) }, () => pick(all)))] : []; }
      else if (t === 'number') row[k] = Number.isFinite(base[k]) ? r2(base[k] + (r() - 0.5) * (/lat|lon/.test(k) ? 0.1 : Math.abs(base[k]) * 0.2)) : 0;
      else if (Array.isArray(t)) row[k] = pick(t);
      else row[k] = base[k];
    }
    out.push(row);
  }
  return out;
}
/** A seeded sample of n of a list (the same n every run). */
export function sampleOf(list, n, seed = 11) {
  if (!n || n >= list.length) return list;
  const r = rndOf(seed), idx = list.map((_, i) => [r(), i]).sort((a, b) => a[0] - b[0]).slice(0, n).map(x => x[1]).sort((a, b) => a - b);
  return idx.map(i => list[i]);
}
/**
 * The scenes a command works on: [{ ref, label, item, data: () => sceneData, kind: 'item' | 'draft' | 'row', row? }].
 * refs (composed items, or with --upgrades the draft of a legacy item), --pack, --region, or --archetype + --table (+ --rows synthetic rows).
 */
export function selectScenes(reg, E, args, positionals) {
  const refs = splitList(positionals), packs = splitList(args.pack), region = args.region;
  const out = [];
  const fromEntry = (e, strict) => {
    const it = e.item;
    if (it.composed) return out.push({ ref: e.ref, label: it.label, item: it, data: () => dataOf(it, E), kind: 'item', pack: e.pack });
    if (args.upgrades && it.upgrade && typeof it.upgrade.scene === 'function') return out.push({ ref: e.ref, label: it.label + ' (draft upgrade)', item: it, data: () => it.upgrade.scene(), kind: 'draft', pack: e.pack });
    if (strict) throw new Error(`${e.ref} is a hand-drawn (legacy) scene${it.upgrade ? ' with a draft upgrade: add --upgrades' : ''}: lint it with \`lint --ref ${e.ref}\`, or upgrade it (\`scene upgrade ${e.ref}\`)`);
    return null;
  };
  if (args.archetype || args.table) {
    if (!args.archetype || !args.table) throw new Error('--archetype and --table go together (a batch over a data table)');
    const arch = typeof E.archetype === 'function' ? E.archetype(args.archetype) : null;
    if (!arch) throw new Error(`no archetype ${args.archetype}${typeof E.archetype === 'function' ? '' : ' (the scene engine is not loaded)'}`);
    const rows = (typeof E.table === 'function' && E.table(args.table)) || null;
    if (!rows) throw new Error(`no data table ${args.table}`);
    let all = rows.map(r => ({ row: r, synthetic: false }));
    const nSyn = args.rows ? Number(args.rows) : 0;
    if (args.rows && (!Number.isInteger(nSyn) || nSyn < 1 || nSyn > 5000)) throw new Error('--rows must be a whole number from 1 to 5000');
    if (nSyn) all = all.concat(syntheticRows(arch, rows, nSyn).map(r => ({ row: r, synthetic: true })));
    for (const { row, synthetic } of all) out.push({ ref: `${args.archetype}:${args.table}/${row.id}`, label: row.name || row.id, item: null, row, synthetic, kind: 'row', data: () => E.fromArchetype(args.archetype, row, {}) });
    return out;
  }
  if (region) {
    const r = regions(reg).find(x => x.id === region);
    const ids = new Set(reg.items().map(e => e.pack));
    const mine = r ? [...ids].filter(p => r.owns(p)) : [...ids].filter(p => p === region || p.startsWith(region + '-'));
    if (!mine.length) throw new Error(`no region or pack family "${region}" (regions: ${regions(reg).map(x => x.id).join(', ')})`);
    packs.push(...mine);
  }
  if (packs.length) {
    const known = new Set(reg.items().map(e => e.pack));
    for (const p of packs) if (!known.has(p)) throw new Error(`unknown pack "${p}"`);
    for (const e of reg.items().filter(x => packs.includes(x.pack) && x.full)) fromEntry(e, false);
  }
  if (refs.length) {
    const byRef = new Map(reg.items().map(e => [e.ref, e]));
    for (const r of refs) { const e = byRef.get(r); if (!e) throw new Error(`unknown ref ${r} (a ref is <pack>/<item id>)`); fromEntry(e, true); }
  }
  return out;
}

/* ---------------------------------------------------------------------------------------------
   Chrome, perf, pages
   --------------------------------------------------------------------------------------------- */
async function harness() {
  try { return await import('../scene-page.mjs'); }
  catch { throw new Error('this needs the page harness tools/lib/scene-page.mjs (the canvas renderer, builder B), which this checkout does not have yet'); }
}
async function withChrome(args, fn) {
  const exe = findBrowser();
  if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable (or PLAYWRIGHT_BROWSERS_PATH to a Playwright browsers folder).');
  const chrome = await launchChrome({ executable: exe, extraArgs: args.gpu ? ['--enable-gpu', '--ignore-gpu-blocklist'] : [] });
  try { return await fn(chrome); } finally { await chrome.close(); }
}
/** The page options for one selected scene (a registered item by ref, else its data). */
function pageOpts(root, s, extra = {}) {
  const base = { root, size: { w: 1600, h: 900 }, dpr: 1, still: false, renderer: 'canvas' };
  if (s.kind === 'row') return Object.assign(base, { data: s.data() }, extra);
  return Object.assign(base, { refs: [s.ref], upgrades: s.kind === 'draft' }, extra);
}
async function measurePerf(chrome, root, s, args) {
  const page = await harness();
  const res = await page.scenePerf(chrome, pageOpts(root, s, { seconds: Number(args.seconds) || 3, rebake: !!args.rebake }));
  return res || { skipped: 'no stats from the page' };
}

/* ---------------------------------------------------------------------------------------------
   scene new
   --------------------------------------------------------------------------------------------- */
/** A brief's scene card: the ```scene fenced block of key: value lines (tools/lib/anim-templates/composed-scene-brief.md). */
export function briefCard(text) {
  const m = /```scene\s*\n([\s\S]*?)```/.exec(String(text));
  if (!m) throw new Error('the brief has no ```scene block (the scene card: id, label, site, lat, lon, heading, setting, kits, archetype, tags ...)');
  const card = {};
  for (const line of m[1].split('\n')) { const k = /^\s*([a-z][a-zA-Z]*)\s*:\s*(.*?)\s*$/.exec(line); if (k && k[2] !== '') card[k[1]] = k[2]; }
  return card;
}
const pickIds = (E, kits, role, n = 3) => Object.entries((typeof E.kitPick === 'function' ? E.kitPick(kits, role, {}) : {}) || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
/** A composed scene that compiles at once: six layers, ground bands, dense cover by kit and role, movers, the live sky; the author refines it. */
export function sceneStubData(E, { id, lat, lon, heading = 180, setting = 'natural', kits = ['temperate', 'birds', 'people'], landmark = '' }) {
  const w = (ids) => Object.fromEntries(ids.map((x, i) => [x, Math.max(1, 3 - i)]));
  const trees = pickIds(E, kits, 'tree'), ground = pickIds(E, kits, 'ground', 4), edge = pickIds(E, kits, 'edge', 2), birds = pickIds(E, kits, 'bird', 2), walkers = pickIds(E, kits, 'walker', 1);
  const far = pickIds(E, kits, setting === 'natural' ? 'tree' : 'building-far', 2), street = setting === 'natural' ? [] : pickIds(E, kits, 'street', 2), vehicles = setting === 'natural' ? [] : pickIds(E, kits, 'vehicle', 1);
  const data = {
    v: 1, id, view: { lat, lon, heading, fov: 78, horizon: 480, lift: 1 }, at: 'afternoon', season: 'auto', tropic: 'summer', setting, weather: 'live', particles: 'season',
    palette: { base: { ground: ['#6a7a3a', '#55652e'] }, autumn: { ground: ['#7a6a32', '#5f5226'] }, winter: { ground: ['#7a7c70', '#5e6058'] } },
    ground: [
      { layer: 'horizon', d: 'M-160 470 Q400 450 900 466 T1760 462 V900 H-160 Z', fill: '#8fa3b4' },
      { layer: 'far', d: 'M-160 500 Q400 476 900 494 T1760 490 V900 H-160 Z', fill: { lin: [[0, '@ground.0'], [1, '@ground.1']], y1: 480, y2: 640 } },
      { layer: 'mid', d: 'M-160 580 Q520 560 1000 586 T1760 576 V900 H-160 Z', fill: '@ground.0' },
      { layer: 'near', d: 'M-160 680 Q600 660 1100 690 T1760 676 V900 H-160 Z', fill: '@ground.1' },
      { layer: 'fore', d: 'M-160 820 Q700 800 1760 816 V900 H-160 Z', fill: '@ground.1' },
    ],
    place: landmark ? [{ obj: landmark, x: 800, y: 590, s: 1, layer: 'mid' }] : [],
    scatter: [],
    actors: [],
    flocks: [],
  };
  if (far.length) data.scatter.push({ obj: w(far), layer: 'far', seed: 1, area: { rect: [-140, 492, 1740, 530] }, n: 40, minGap: 30, s: [0.35, 0.55], flip: 0.5, variant: 'random' });
  if (trees.length) data.scatter.push({ obj: w(trees), layer: 'mid', seed: 2, area: { rect: [-140, 586, 1740, 640] }, n: 18, minGap: 70, s: [0.5, 0.8], sByY: [[586, 0.8], [640, 1.1]], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.16] } });
  if (ground.length) {
    data.scatter.push({ obj: w(ground), layer: 'near', seed: 3, area: { rect: [-160, 690, 1760, 820] }, n: 420, minGap: 9, s: [0.6, 1.1], sByY: [[690, 0.7], [820, 1.2]], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.16] }, anim: 'strip' });
    data.scatter.push({ obj: w(ground), layer: 'fore', seed: 4, area: { rect: [-160, 820, 1760, 900] }, n: 260, minGap: 12, s: [1.1, 1.6], flip: 0.5, variant: 'random', tint: { col: '#8a7a40', k: [0, 0.16] }, anim: 'strip' });
  }
  if (street.length) data.scatter.push({ obj: w(street), layer: 'near', seed: 5, area: { rect: [-100, 700, 1700, 720] }, n: 10, minGap: 120, s: [0.8, 1.05], flip: 0.5, variant: 'random' });
  if (edge.length) data.scatter.push({ obj: w(edge), layer: 'near', seed: 6, area: { rect: [-160, 682, 1760, 700] }, n: 60, minGap: 14, s: [0.7, 1.2], flip: 0.5, variant: 'random', anim: 'strip' });
  if (walkers.length) for (let i = 0; i < 4; i++) data.actors.push({ obj: walkers[0], layer: 'near', path: [[-60, 740 + i * 12], [1660, 748 + i * 12]], speed: 16 + i * 3, loop: 'pingpong', s: 0.9, offset: (i * 0.27) % 1, seed: 10 + i });
  if (vehicles.length) data.actors.push({ obj: vehicles[0], layer: 'near', path: [[-200, 712], [1800, 712]], speed: 60, loop: 'loop', s: 0.9, offset: 0.4, seed: 20 });
  if (birds.length) { data.flocks.push({ obj: birds[0], n: 7, area: [200, 90, 1400, 280], speed: 28, s: 0.5, seed: 30 }); data.scatter.push({ obj: birds[birds.length - 1], layer: 'near', seed: 7, area: { rect: [200, 700, 1400, 760] }, n: 6, minGap: 80, s: [0.8, 1.2], flip: 0.5 }); }
  return data;
}
function sceneFileText({ pack, id, meta, dataText, from }) {
  return `/* ============================================================
   COMPOSED SCENE ${pack}/${id} (docs/dev/SCENE_ENGINE.md section 3)
   Scaffolded by \`node tools/anim-pack.mjs scene new\`${from ? ` ${from}` : ''}.
   Compose from the library (object list --kit <kit>); add an object only
   when the subject truly needs one (object new). Then:
     node tools/anim-pack.mjs scene lint ${pack}/${id} --perf
     node tools/anim-pack.mjs scene sheet ${pack}/${id} --times --seasons --contact
   The bar (section 15): 5+ depth layers, dense ground cover, 15+ movers
   (6+ crossing the scene), a signature or landmark, the live sky and
   seasons, shadows, reflections, night lights, varied placements, and
   at most 300 animated draws.
   ============================================================ */
(function () {
  sceneAdd(${q(pack)}, ${meta}, ${dataText});
})();
`;
}
function packFileText(pack, name) {
  return `/* ============================================================
   PACK ${pack}: composed scenes (docs/dev/SCENE_ENGINE.md section 3).
   The scene files 71-scene-${pack}-N.js call sceneAdd('${pack}', meta,
   data); this registers them.
   ============================================================ */
(function () {
  animRegisterPack({ id: ${q(pack)}, name: ${q(name)}, items: sceneItems(${q(pack)}) });
})();
`;
}
function nextSceneFile(root, pack) {
  const app = join(root, 'src', 'app'), re = new RegExp(`^71-scene-${pack.replace(/[-]/g, '\\-')}-(\\d+)\\.js$`);
  const ns = existsSync(app) ? readdirSync(app).map(f => re.exec(f)).filter(Boolean).map(m => +m[1]) : [];
  return `src/app/71-scene-${pack}-${(ns.length ? Math.max(...ns) : 0) + 1}.js`;
}

/* ---------------------------------------------------------------------------------------------
   Printing lint results
   --------------------------------------------------------------------------------------------- */
function printScene(out, s, r, { rules }) {
  out('');
  out(`${r.pass ? 'PASS' : 'FAIL'}  ${s.ref}${s.synthetic ? '  (synthetic row)' : ''}${r.gold ? '  GOLD' : r.pass ? '  (passes the bar; GOLD needs --perf)' : ''}`);
  if (rules) for (const x of r.rules) out(`    ${x.ok ? (x.warn ? 'WARN' : 'PASS') : 'FAIL'}  ${pad(x.group, 8)} ${pad(x.rule, 16)} ${lpad(x.value == null ? '-' : x.value, 12)}   ${x.limit || ''}`);
  for (const f of r.failures) out(`    - [${f.group} ${f.rule}] ${f.message}`);
  for (const w of r.warnings || []) out(`    warn: ${w}`);
}
/** Rules fixed by the archetype's structure (a count at its floor is the design, not a near miss). */
const STRUCTURAL = new Set(['depthLayers', 'layersUsed', 'bitmaps', 'signature', 'signs', 'people', 'crowd']);
/** How close a passing scene is to failing: the smallest relative slack over its numeric rules (0 = on the limit). */
function slackOf(r) {
  let best = { slack: Infinity, rule: '' };
  for (const x of r.rules) {
    if (!x.ok || typeof x.value !== 'number' || STRUCTURAL.has(x.rule)) continue;
    const m = /([<>]=)\s*([\d.]+)/.exec(x.limit || '');
    if (!m || !+m[2]) continue;
    const lim = +m[2], slack = m[1] === '<=' ? (lim - x.value) / lim : (x.value - lim) / lim;
    if (slack < best.slack) best = { slack: r2(slack), rule: `${x.rule} ${x.value} ${m[1]} ${lim}` };
  }
  return best;
}
function batchSummary(out, list) {
  const n = list.length, pass = list.filter(x => x.r.pass).length;
  const num = (f) => list.map(f).filter(Number.isFinite);
  const ad = num(x => x.r.metrics.stats && x.r.metrics.stats.animatedDraws), pl = num(x => x.r.metrics.stats && x.r.metrics.stats.placements), db = num(x => x.r.metrics.stats && x.r.metrics.stats.dataBytes);
  const dyn = num(x => x.perf && x.perf.dynMs && x.perf.dynMs.median);
  const mean = (a) => (a.length ? Math.round(a.reduce((s, v) => s + v, 0) / a.length) : '-');
  out('');
  out('BATCH SUMMARY');
  out(`  rows ${n}   pass ${pass}   fail ${n - pass}   worst animatedDraws ${ad.length ? Math.max(...ad) : '-'}   worst dynMs ${dyn.length ? Math.max(...dyn) : '- (no --perf)'}   mean placements ${mean(pl)}   mean dataBytes ${mean(db)}`);
  const near = list.filter(x => x.r.pass).map(x => ({ ref: x.s.ref, ...slackOf(x.r) })).filter(x => Number.isFinite(x.slack)).sort((a, b) => a.slack - b.slack).slice(0, 5);
  if (near.length) { out('  nearest to failing:'); for (const x of near) out(`    ${pad(x.ref, 46)} slack ${lpad(Math.round(x.slack * 100) + ' %', 6)}   ${x.rule}`); }
}

/* ---------------------------------------------------------------------------------------------
   Sheets
   --------------------------------------------------------------------------------------------- */
/** A grid page of PNGs with captions (one row per `rows` entry). */
function gridHtml(title, rows, { dark = false } = {}) {
  const cells = rows.map(r => `<div class="r">${r.map(c => `<figure><img src="${pathToFileURL(c.file).href}"><figcaption>${esc(c.caption)}</figcaption></figure>`).join('')}</div>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:10px;background:${dark ? '#121820' : '#eceef2'};color:${dark ? '#eef' : '#1b2430'};font:13px system-ui,sans-serif}h1{font-size:15px;margin:0 0 8px}.r{display:flex;gap:8px;margin:0 0 8px}figure{margin:0;flex:1}img{display:block;width:100%;height:auto}figcaption{padding:3px 0}</style></head><body><h1>${esc(title)}</h1>${cells}</body></html>`;
}
const fileSafe = (ref) => ref.replace(/[/:]/g, '__');
/** The moments of a scene: its lat / lon from the data, the real sun on --date (default today). */
function momentsOf(data, date) {
  const v = (data && data.view) || {};
  if (!Number.isFinite(v.lat) || !Number.isFinite(v.lon)) throw new Error(`${data && data.id}: no view.lat / view.lon, so no real moments`);
  return sceneTimesFor(v.lat, v.lon, date);
}

export default {
  summary: 'composed scenes: new (scaffold), upgrade (a hand-drawn region scene to its composed draft), lint (the bar, perf, variety, care), sheet (PNG: times, seasons, old vs new), perf (frame times)',
  usage: 'scene new <pack> <id> [--brief f.md | --archetype a --row \'<json>\'] | scene upgrade <ref> [--box x0,y0,x1,y1 | --landmark id] [--archetype a] [--slug s] [--dry-run] [--force] | scene lint|sheet|perf [<ref>,... | --pack p | --region r | --archetype a --table t [--rows N | --sample N]] [--upgrades] [--perf] [--times] [--seasons] [--compare] [--json]',
  positionals: '<new|upgrade|lint|sheet|perf> [<ref,...>]',
  options: {
    pack: { type: 'string', multiple: true, help: 'lint / sheet / perf: every composed scene of this pack (repeatable)' },
    region: { type: 'string', help: 'lint / sheet / perf: every pack of this region (asia, us ...)' },
    archetype: { type: 'string', help: 'new: build the scene from this archetype; lint / sheet / perf: with --table, a batch of one scene per table row; upgrade: override the suggestion' },
    table: { type: 'string', help: 'with --archetype: the data table (sceneTableDefine) the batch runs over' },
    rows: { type: 'string', help: 'with --archetype --table: add N synthetic rows (seeded, in memory) to stress-test the archetype' },
    sample: { type: 'string', help: 'sheet / perf of a batch: N seeded rows of it' },
    row: { type: 'string', help: 'new --archetype: the row as JSON (its params)' },
    brief: { type: 'string', help: 'new: a brief file with a ```scene card (tools/lib/anim-templates/composed-scene-brief.md): id, label, site, lat, lon, heading, setting, kits, archetype, tags, mood, colour, landmark' },
    lat: { type: 'string', help: 'new: the latitude of the view' },
    lon: { type: 'string', help: 'new: the longitude of the view' },
    heading: { type: 'string', help: 'new: which way the view looks (degrees from north)' },
    setting: { type: 'string', help: 'new: natural | urban | mixed | interior (picks the ground-cover and lighting floors)' },
    kits: { type: 'string', help: 'new: the kits it composes from (comma separated; default temperate, birds, people)' },
    label: { type: 'string', help: 'new: the caption (label)' },
    upgrades: { type: 'boolean', help: 'lint / sheet / perf: use the DRAFT upgrade of a hand-drawn region scene (its composed scene) instead of the legacy art' },
    perf: { type: 'boolean', help: 'lint: also time each scene in the real renderer (headless Chrome) and apply the perf rules: GOLD needs them' },
    gpu: { type: 'boolean', help: 'lint --perf / perf: Chrome with the GPU, so the budget is the laptop one (no swFactor)' },
    seconds: { type: 'string', help: 'perf: how long to run the animation (default 3)' },
    rebake: { type: 'boolean', help: 'perf: force a light change mid-run and report the worst frame (the re-bake must not drop frames)' },
    json: { type: 'boolean', help: 'lint / perf / upgrade: machine-readable output' },
    times: { type: 'boolean', help: 'sheet: dawn, noon, golden hour, dusk and night, found from the real sun at the scene\'s lat / lon on --date' },
    seasons: { type: 'boolean', help: 'sheet: all four seasons at noon (the 15th of January, April, July and October; flipped south of the equator)' },
    compare: { type: 'boolean', help: 'sheet: old (the hand-drawn art with the retrofit overlay) vs new (composed) side by side, at noon and at night (--times: every moment). Writes <ref>--compare.png' },
    date: { type: 'string', help: 'sheet: the day for --times / --compare (YYYY-MM-DD, default today)' },
    at: { type: 'string', help: 'sheet: one ISO moment for the live sky (default: the scene\'s authored moment)' },
    location: { type: 'string', help: 'sheet: lat,lon for the live sky (default: the scene\'s own place)' },
    season: { type: 'string', help: 'sheet: one season' },
    crop: { type: 'string', help: 'sheet: phone | square: what a portrait phone (420 of the 1600) or a square tile (900) shows' },
    contact: { type: 'boolean', help: 'sheet: also one contact sheet with every render' },
    svg: { type: 'boolean', help: 'sheet: draw with the SVG fallback renderer (one still frame) instead of the canvas' },
    out: { type: 'string', help: 'sheet: the output folder (default .anim-ref/scenes/, compare: .anim-ref/compare/)' },
    box: { type: 'string', help: 'upgrade: x0,y0,x1,y1 of the landmark in the old art (without it: the 5 largest shape clusters are listed to choose from)' },
    landmark: { type: 'string', help: 'upgrade: use this existing library object as the landmark instead of extracting one' },
    slug: { type: 'string', help: 'upgrade: the file and object slug (default: the key\'s place or unit, e.g. singapore)' },
    'dry-run': { type: 'boolean', help: 'upgrade: print the suggestion, the box, the shape count and the file paths; write nothing' },
    force: { type: 'boolean', help: 'upgrade: scaffold again over an existing upgrade or landmark' },
  },
  notes: [
    'The workflow: brief -> compose from the library (object list --kit <kit>; an archetype when one fits) -> add objects only if needed (object new / lint / sheet) -> scene lint --perf -> scene sheet --times --seasons -> review.',
    'Static placements are FREE per frame (baked into the layer bitmaps); only animated draws cost (at most 300, dynMs at most 6 ms on a laptop). A rich look comes from dense static detail plus a measured number of movers.',
    'Batches: --archetype <id> --table <id> runs over every row of a data table (one scene per row, built only when needed); --rows N adds synthetic rows; --sample N picks N rows for sheet and perf. A batch ends with one summary table.',
    'Signs (place names) only where the archetype declares signs (signage: true): plain sans-serif boards with line-colour bars, never the TfL roundel, the Underground logotype, the line-diagram style or New Johnston (section 8.4).',
  ],
  async run(args, ctx) {
    const [sub, ...rest] = ctx.positionals;
    if (!sub || !['new', 'upgrade', 'lint', 'sheet', 'perf'].includes(sub)) throw new Error('scene needs a subcommand: new, upgrade, lint, sheet or perf (node tools/anim-pack.mjs scene --help)');
    const root = ctx.root;
    const reg = loadRegistry(root, { fresh: true }), E = engineOf(reg);

    /* ----- new ----- */
    if (sub === 'new') {
      const [pack, id0] = rest;
      let card = {};
      if (args.brief) { if (!existsSync(args.brief)) throw new Error(`no brief ${args.brief}`); card = briefCard(readFileSync(args.brief, 'utf8')); }
      const id = id0 || card.id;
      if (!/^[a-z0-9-]{1,40}$/.test(pack || '')) throw new Error('scene new needs a pack id (lower case, digits, dashes): scene new <pack> <id>');
      if (!/^[a-z0-9-]{1,60}$/.test(id || '')) throw new Error('scene new needs a scene id (lower case, digits, dashes)');
      E.require('scene new');
      if (reg.items().some(e => e.pack === pack && e.id === id)) throw new Error(`${pack}/${id} already exists`);
      const num = (v, what) => { if (v == null || v === '') return null; const n = Number(v); if (!Number.isFinite(n)) throw new Error(`--${what} must be a number`); return n; };
      const archId = args.archetype || card.archetype || '';
      let dataText, metaObj, from = '';
      const kits = splitList(args.kits || card.kits);
      const label = args.label || card.label || id.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase());
      const tags = splitList(card.tags);
      if (archId) {
        const arch = E.archetype(archId);
        if (!arch) throw new Error(`no archetype ${archId} (built archetypes: ${(E.index || []).filter(a => E.archetype(a.id)).map(a => a.id).join(', ') || 'basic, station'})`);
        let row = {};
        if (args.row) { try { row = JSON.parse(args.row); } catch (e) { throw new Error(`--row must be JSON: ${e.message}`); } }
        else row = { id, lat: num(args.lat || card.lat, 'lat'), lon: num(args.lon || card.lon, 'lon'), heading: num(args.heading || card.heading, 'heading') || 180, kits: kits.length ? kits : undefined, landmarks: card.landmark ? [card.landmark] : undefined };
        row = Object.fromEntries(Object.entries(row).filter(([, v]) => v != null));
        const problems = typeof reg.R.get('sceneArchetypeCheck') === 'function' ? reg.R.get('sceneArchetypeCheck')(archId, row) || [] : [];
        if (problems.length) ctx.err(`note: the row has problems (the build falls back): ${problems.join('; ')}`);
        const m = typeof arch.meta === 'function' ? arch.meta(row) : null;
        metaObj = Object.assign({ id, label, site: card.site || label, tags: tags.length >= 6 ? tags : [...new Set([...tags, 'composed', archId, ...(kits.length ? kits : ['scene']), 'live-sky', 'seasons'])].slice(0, 12), mood: card.mood || 'calm', colour: card.colour || 'teal' }, m || {}, { id });
        dataText = `() => sceneFromArchetype(${q(archId)}, ${JSON.stringify(row)}, { place: [], scatter: [], actors: [] })`;
        from = `--archetype ${archId}`;
      } else {
        const lat = num(args.lat || card.lat, 'lat'), lon = num(args.lon || card.lon, 'lon');
        if (lat == null || lon == null) throw new Error('scene new needs --lat and --lon (or a brief card with lat and lon): every scene has the real sun and moon of its place');
        const data = sceneStubData(E, { id, lat, lon, heading: num(args.heading || card.heading, 'heading') || 180, setting: args.setting || card.setting || 'natural', kits: kits.length ? kits : ['temperate', 'birds', 'people', 'water'], landmark: card.landmark || '' });
        metaObj = { id, label, site: card.site || label, tags: tags.length >= 6 ? tags : [...new Set([...tags, 'composed', 'landscape', 'live-sky', 'seasons', 'birds', 'trees'])].slice(0, 12), mood: card.mood || 'calm', colour: card.colour || 'teal', when: '__WHEN__' };
        dataText = JSON.stringify(data, null, 2).replace(/\n/g, '\n  ');
        from = args.brief ? `--brief ${args.brief.replace(/\\/g, '/').split('/').pop()}` : '';
      }
      const metaText = JSON.stringify(metaObj, null, 2).replace(/\n/g, '\n  ').replace('"__WHEN__"', '() => false   /* a new scene stays out of the daily rotation until it passes the bar: then remove this line */');
      const file = nextSceneFile(root, pack), packFile = `src/app/72-anim-pack-${pack}.js`;
      writeFileSync(join(root, file), sceneFileText({ pack, id, meta: metaText, dataText, from }));
      ctx.out(`wrote ${file}`);
      if (!existsSync(join(root, packFile))) { writeFileSync(join(root, packFile), packFileText(pack, args.label || pack.replace(/-/g, ' '))); ctx.out(`wrote ${packFile}`); }
      ctx.out(`next: node tools/anim-pack.mjs scene lint ${pack}/${id}   then   scene sheet ${pack}/${id} --times --seasons --contact`);
      return 0;
    }

    /* ----- upgrade ----- */
    if (sub === 'upgrade') {
      const ref = rest[0];
      if (!ref) throw new Error('scene upgrade needs a ref: scene upgrade asia-southeast/singapore-skyline --box 560,160,1120,640');
      let box = null;
      if (args.box) { box = args.box.split(',').map(Number); if (box.length !== 4 || !box.every(Number.isFinite) || box[2] <= box[0] || box[3] <= box[1]) throw new Error('--box must be x0,y0,x1,y1 with x1 > x0 and y1 > y0 (scene units, 1600 x 900)'); }
      if (box && args.landmark) throw new Error('--box (extract a landmark) and --landmark (use an existing one) exclude each other');
      const res = upgradeScaffold(reg, E, ref, { archetype: args.archetype, box, landmark: args.landmark, slug: args.slug, force: !!args.force });
      if (args.json) { ctx.out(JSON.stringify({ ref, key: res.key, region: res.region.id, suggest: res.suggest, archetype: res.archetype, wanted: res.wanted, fallback: res.fallback, landmark: res.landmark && { count: res.landmark.count, size: res.landmark.size, glow: res.landmark.glow, dropped: res.landmark.dropped }, landmarkId: res.landmarkId, files: res.files.map(f => f.file), clusters: res.clusters, params: res.params, dryRun: !!args['dry-run'] }, null, 1)); }
      else {
        ctx.out(`scene upgrade ${ref}  (region ${res.region.id}, key ${res.key})`);
        ctx.out('  suggested archetypes (tags +2, label and site words +1):');
        for (const s of res.suggest) ctx.out(`    ${pad(s.id, 18)} ${lpad(s.score, 3)}   ${s.what}`);
        ctx.out(`  archetype: ${res.archetype}${res.fallback ? `  (suggested ${res.wanted} is not built yet: using basic; switch when it lands)` : ''}`);
        if (res.landmark) ctx.out(`  landmark ${res.landmarkId}: box ${box.join(',')}, ${res.landmark.count} shapes (${res.landmark.glow} lit), size ${res.landmark.size.join(' x ')}; dropped ${res.landmark.dropped.sky} sky / haze, ${res.landmark.dropped.outside} outside, ${res.landmark.dropped.wide} too wide`);
        else if (args.landmark) ctx.out(`  landmark: ${args.landmark} (existing)`);
        if (!box && !args.landmark) {
          ctx.out('  no --box: the largest shape clusters of the old art (choose the landmark, then re-run with --box x0,y0,x1,y1):');
          for (const c of res.clusters) ctx.out(`    --box ${pad(c.box.join(','), 22)} ${lpad(c.count, 4)} shapes`);
          return 0;
        }
        ctx.out(`  params: ${JSON.stringify(res.params)}`);
        ctx.out(`  files${args['dry-run'] ? ' (dry run: nothing written)' : ''}:`);
        for (const f of res.files) ctx.out(`    ${f.file}`);
      }
      if (!args['dry-run'] && (box || args.landmark)) {
        for (const f of res.files) { mkdirSync(dirname(join(root, f.file)), { recursive: true }); writeFileSync(join(root, f.file), f.text); }
        if (!args.json) {
          ctx.out('next:');
          if (res.landmark) ctx.out(`  node tools/anim-pack.mjs object sheet ${res.landmarkId} --mode night   then REFINE it (the checklist in its file header)`);
          ctx.out(`  node tools/anim-pack.mjs scene sheet ${ref} --compare --upgrades --times`);
          ctx.out(`  node tools/anim-pack.mjs scene lint ${ref} --upgrades --perf   and set state: 'live' when it prints GOLD`);
        }
      }
      return 0;
    }

    /* ----- lint / perf / sheet: the selection ----- */
    E.require(`scene ${sub}`);
    const thresholds = loadThresholds(root);
    let list = selectScenes(reg, E, args, rest);
    if (!list.length) throw new Error(`nothing to ${sub}: give refs (composed items), --pack, --region, or --archetype with --table${args.upgrades ? '' : ' (a hand-drawn scene with a draft upgrade needs --upgrades)'}`);
    const isBatch = !!args.archetype;
    if (args.sample && sub !== 'lint') list = sampleOf(list, Number(args.sample));

    if (sub === 'lint') {
      const t0 = Date.now(), results = [];
      const lintAll = async (chrome) => {
        for (const [idx, s] of list.entries()) {
          let perf = null;
          if (chrome) { try { perf = await measurePerf(chrome, root, s, args); } catch (e) { perf = { skipped: e.message }; } }
          let r;
          try { r = lintScene(s.data, thresholds, { E, item: s.kind === 'item' ? s.item : s.kind === 'draft' ? Object.assign({}, s.item, { upgrade: s.item.upgrade }) : null, perf, ref: s.ref, gpu: !!args.gpu, svg: s.kind !== 'row' || idx < 3 }); }   // a batch renders the SVG fallback for the first 3 rows: the archetype's output size is alike row to row
          catch (e) { r = { pass: false, gold: false, rules: [{ group: 'data', rule: 'build', ok: false, value: 'error', limit: 'builds', message: e.message }], failures: [{ group: 'data', rule: 'build', message: e.message }], warnings: [], metrics: {} }; }
          results.push({ s, r, perf });
        }
      };
      if (args.perf) {
        let ok = true;
        try { await harness(); if (!findBrowser()) ok = false; } catch { ok = false; }
        if (ok) await withChrome(args, lintAll); else { ctx.err('note: --perf skipped: no Chrome or no page harness (tools/lib/scene-page.mjs) in this checkout; the perf rules are not applied'); await lintAll(null); }
      } else await lintAll(null);
      const failing = results.filter(x => !x.r.pass);
      if (args.json) {
        ctx.out(JSON.stringify({ ok: !failing.length, ms: Date.now() - t0, scenes: results.map(({ s, r, perf }) => ({ ref: s.ref, kind: s.kind, synthetic: !!s.synthetic, pass: r.pass, gold: r.gold, failures: r.failures.map(f => ({ group: f.group, rule: f.rule, value: f.value, message: f.message })), warnings: r.warnings, rules: r.rules, stats: r.metrics && r.metrics.stats, bar: r.metrics && r.metrics.bar, perf })) }, null, 1));
        return failing.length ? 2 : 0;
      }
      ctx.out(`anim-pack scene lint: ${results.length} scene(s) in ${((Date.now() - t0) / 1000).toFixed(1)} s (the composed profile: data${args.perf ? ', perf' : ''}, the bar, variety, care)`);
      const showRules = results.length <= 3 && !isBatch;
      const shownFails = showRules ? results : results.filter(x => !x.r.pass).slice(0, 10);
      for (const x of shownFails) printScene(ctx.out, x.s, x.r, { rules: showRules });
      if (!showRules && failing.length > shownFails.length) ctx.out(`
... and ${failing.length - shownFails.length} more failing scene(s) (--json lists all)`);
      if (isBatch || results.length > 3) batchSummary(ctx.out, results);
      ctx.out('');
      const gold = results.filter(x => x.r.gold).length;
      ctx.out(failing.length ? `FAIL: ${failing.length} of ${results.length} scene(s) below the bar: ${failing.slice(0, 8).map(x => x.s.ref).join(', ')}${failing.length > 8 ? ', ...' : ''}. Fix the data (each failure says how), re-run.`
        : `PASS: ${results.length} scene(s) clean${args.perf ? `; ${gold} GOLD` : ' (add --perf for GOLD)'}.`);
      return failing.length ? 2 : 0;
    }

    if (sub === 'perf') {
      await harness();
      const rows = [];
      await withChrome(args, async (chrome) => {
        for (const s of list) {
          let perf; try { perf = await measurePerf(chrome, root, s, args); } catch (e) { perf = { skipped: e.message }; }
          const rules = perfRules(perf, thresholds, { gpu: !!args.gpu });
          rows.push({ ref: s.ref, perf, rules, pass: rules.every(r => r.ok) });
          if (!args.json) ctx.err(`  [${rows.length}/${list.length}] ${s.ref}`);
        }
      });
      if (args.json) { ctx.out(JSON.stringify({ ok: rows.every(r => r.pass), gpu: !!args.gpu, scenes: rows }, null, 1)); return rows.every(r => r.pass) ? 0 : 2; }
      const k = args.gpu ? 1 : ((thresholds.composed && thresholds.composed.perf && thresholds.composed.perf.swFactor) || 1.75);
      ctx.out(`anim-pack scene perf: ${rows.length} scene(s), 1600 x 900, dpr 1, ${Number(args.seconds) || 3} s each, ${args.gpu ? 'GPU (laptop budget)' : `software raster (budget x ${k})`}`);
      ctx.out(`${pad('scene', 46)} ${lpad('dyn med', 8)} ${lpad('draw med', 9)} ${lpad('draw p95', 9)} ${lpad('1st bake', 9)} ${lpad('bitmaps', 8)} ${lpad('anim', 5)} ${lpad('blitPx', 9)}  result`);
      const g = (o, f) => (o && o[f] != null ? r2(o[f]) : '-');
      for (const r of rows) {
        const p = r.perf || {};
        ctx.out(`${pad(r.ref, 46)} ${lpad(g(p.dynMs, 'median'), 8)} ${lpad(g(p.drawMs, 'median'), 9)} ${lpad(g(p.drawMs, 'p95'), 9)} ${lpad(p.firstBakeMs != null ? r2(p.firstBakeMs) : '-', 9)} ${lpad(p.bitmaps != null ? p.bitmaps : '-', 8)} ${lpad(p.animatedDraws != null ? p.animatedDraws : '-', 5)} ${lpad(p.blitPx != null ? p.blitPx : '-', 9)}  ${p.skipped ? 'SKIPPED: ' + p.skipped : r.pass ? 'PASS' : 'FAIL ' + r.rules.filter(x => !x.ok).map(x => x.rule).join(', ')}`);
        for (const x of r.rules.filter(x => !x.ok)) ctx.out(`    - ${x.message}`);
      }
      const bad = rows.filter(r => !r.pass);
      ctx.out(`\n${bad.length ? `FAIL: ${bad.length} of ${rows.length} over the budget. The fix is in the DATA (fewer animated draws, strips, particles), never a lower frame rate.` : `PASS: ${rows.length} scene(s) within the budget (dynMs <= ${r2(6 * k)}, drawMs <= ${r2(8 * k)}, p95 <= ${r2(12 * k)}).`}`);
      return bad.length ? 2 : 0;
    }

    /* ----- sheet ----- */
    const page = await harness();
    const crop = args.crop || '';
    if (crop && !['phone', 'square'].includes(crop)) throw new Error('--crop must be phone or square');
    const size = { w: crop === 'phone' ? 420 : crop === 'square' ? 900 : 1600, h: 900 };
    const loc = parseLocation(args.location);
    const outDir = resolve(args.out || join(root, '.anim-ref', args.compare ? 'compare' : 'scenes'));
    mkdirSync(outDir, { recursive: true });
    const renderer = args.svg ? 'svg' : 'canvas';
    const written = [], contactRows = [];
    await withChrome(args, async (chrome) => {
      const shot = async (s, extra, tag) => {
        const file = join(outDir, `${fileSafe(s.ref)}${tag}.png`);
        await page.sceneRenderPng(chrome, pageOpts(root, s, Object.assign({ size, renderer, location: loc, still: true }, extra)), file);
        return file;
      };
      for (const s of list) {
        const data = s.data();
        if (args.compare) {
          if (s.kind === 'row') throw new Error('--compare needs a registered hand-drawn scene with an upgrade (a ref), not a table row');
          const times = momentsOf(data, args.date);
          const moments = args.times ? MOMENTS : ['noon', 'night'];
          const rows = [];
          for (const m of moments) {
            if (!times[m]) continue;
            const file = join(outDir, `${fileSafe(s.ref)}--compare-${m}.png`);
            await page.sceneRenderPng(chrome, { root, refs: [s.ref], compare: true, upgrades: true, size: { w: 800, h: 450 }, at: times[m], location: loc || [data.view.lat, data.view.lon], renderer: 'canvas', still: true }, file);
            rows.push([{ file, caption: `${m} ${times[m].slice(11, 16)} UTC: old (left, hand-drawn with the retrofit overlay) | new (right, composed)` }]);
          }
          const file = join(outDir, `${fileSafe(s.ref)}--compare.png`);
          writeFileSync(file, await chrome.screenshot({ html: gridHtml(`${s.ref}: old vs new (${times.date})`, rows), width: 1640, height: 'auto', transparent: false }));
          written.push(file); contactRows.push([{ file, caption: s.ref }]);
          ctx.out(file);
          continue;
        }
        const cells = [];
        if (args.times) {
          const times = momentsOf(data, args.date);
          for (const m of MOMENTS) if (times[m]) cells.push({ file: await shot(s, { at: times[m], season: args.season || null }, `-${m}${crop ? '-' + crop : ''}`), caption: `${s.ref} ${m} ${times[m].slice(11, 16)} UTC` });
        }
        if (args.seasons) {
          const lat = data.view && data.view.lat;
          for (const { season, date } of seasonDates(lat)) {
            const t = momentsOf(data, date);
            cells.push({ file: await shot(s, { at: t.noon, season }, `-${season}${crop ? '-' + crop : ''}`), caption: `${s.ref} ${season} (noon ${date})` });
          }
        }
        if (!args.times && !args.seasons) cells.push({ file: await shot(s, { at: args.at || null, season: args.season || null }, `${args.at ? '-' + args.at.replace(/[:]/g, '') : ''}${crop ? '-' + crop : ''}${renderer === 'svg' ? '-svg' : ''}`), caption: s.ref });
        for (const c of cells) { written.push(c.file); ctx.out(c.file); }
        contactRows.push(cells);
      }
      if (args.contact && written.length) {
        const flat = contactRows.flat(), cols = args.compare ? 1 : (args.times ? MOMENTS.length : args.seasons ? 4 : 3);
        const rows = [];
        for (let i = 0; i < flat.length; i += cols) rows.push(flat.slice(i, i + cols));
        const file = join(outDir, `contact${args.compare ? '-compare' : ''}${args.times ? '-times' : ''}${args.seasons ? '-seasons' : ''}${crop ? '-' + crop : ''}.png`);
        writeFileSync(file, await chrome.screenshot({ html: gridHtml(`${list.length} scene(s)`, rows), width: 1640, height: 'auto', transparent: false }));
        ctx.out(file);
      }
    });
    return 0;
  },
};
