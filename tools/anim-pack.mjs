#!/usr/bin/env node
// OpenDash animation pack tool: make animation packs EASY and CONSISTENT. Node >= 20, no npm dependencies.
//
//   node tools/anim-pack.mjs --help
//   node tools/anim-pack.mjs lint [--pack <id>] [--ref <ref,ref>] [--key <key,key>] [--file <path>] [--only small|scenes] [--json] [--rules] [--quiet]
//   node tools/anim-pack.mjs sheet <ref,ref | --pack <id> | --file <path>> [--key <key,key>] [--only small|scenes] [--mode light|dark|night] [--crop square|phone] [--still] [--at <ms>] [--sizes] [--out <dir>] [--contact]
//   node tools/anim-pack.mjs reference [--render] [--mode light|dark|night]
//   node tools/anim-pack.mjs calibrate [--propose]
//   node tools/anim-pack.mjs new <id> "<Name>" [--unit-word country|state|...] [--groups a,b,c]      (tools/lib/anim-cmd/new.mjs)
//   node tools/anim-pack.mjs status [<region>] [--json] [--strict] [--short] [--no-lint] [--declare-complete]   (tools/lib/anim-cmd/status.mjs)
//   node tools/anim-pack.mjs brief <region> --kind scene|element [--batch N --of M] [--group g] [--out dir] [--clean] [--note text] [--clear-notes]   (tools/lib/anim-cmd/brief.mjs)
//   node tools/anim-pack.mjs guard --owned <file>[,<file>...] [--base <ref>]                           (tools/lib/anim-cmd/guard.mjs)
//
// Composed scenes, the object library and THE NEW STANDARD (docs/dev/SCENE_ENGINE.md; tools/lib/anim-cmd/object.mjs, scene.mjs):
//   node tools/anim-pack.mjs object new <cat>.<name> [--kit "K.tree('alder')"] [--variants N] [--kits a,b] [--role r]
//   node tools/anim-pack.mjs object lint [<id>,...] [--json]  |  object sheet <id>[,...] [--canvas] [--mode night]  |  object list [--kit k] [--role r]
//   node tools/anim-pack.mjs scene new <pack> <id> [--brief f.md | --archetype <id> --row '<json>'] [--lat .. --lon=.. --heading ..]
//   node tools/anim-pack.mjs scene upgrade <ref> [--box x0,y0,x1,y1 | --landmark <id>] [--archetype <id>] [--slug s] [--dry-run]
//   node tools/anim-pack.mjs scene lint|sheet|perf [<ref>,... | --pack <id> | --region <id> | --archetype <id> --table <id> [--rows N | --sample N]]
//                            [--upgrades] [--perf] [--gpu] [--times] [--seasons] [--compare] [--contact] [--json]
//   lint and sheet also take --at <ISO> [--location lat,lon] [--season s] (the live sky and the retrofit overlay); status takes --standard and --all.
//
// THE NEW STANDARD: the rich Yateley and Fleet scenes are the bar (reference prints it first). A composed scene (item.composed) is judged by the
// composed profile (tools/lib/scene-lint.mjs: data, the bar, placement variety, care, and perf with scene lint --perf) and is GOLD when it
// passes; every hand-drawn scene keeps its own floors as the LEGACY tier ("below the new standard"). The workflow for a new scene:
//   brief -> compose from the library (object list --kit; an archetype when one fits) -> add objects if needed (object new / lint / sheet)
//   -> scene lint --perf -> scene sheet --times --seasons -> review.
//
// lint      measures every full scene and small item against tools/anim-quality.json (calibrated on the accepted
//           corpus) and prints PASS / FAIL per rule; exit code 2 when anything fails. A pass is still checked against the redraw
//           targets (richness, thin spots): the thin spots of every selected item are printed (--quiet silences them).
//           With --file it first fails loudly (exit 1) on a file that registers nothing, a scene key that does not exist, dead art or a duplicate key.
// sheet     renders items to PNG with the app's theme and the animation paused at 6.5 s (--at <ms>), so they can be LOOKED AT
//           (--crop phone | square shows only what a portrait phone / a square tile shows of a scene; --still turns the animation OFF: the
//           rest frame, what reduced motion shows; --sizes adds a strip of a small item at 28, 40, 64 and 128 px; --key renders only some items).
// reference prints the gold-standard exemplars (tools/anim-reference.json): study them before drawing; --render
//           writes their PNGs to .anim-ref/ (git-ignored): light, night AND dark in one run (one --mode renders only that one).
// calibrate compares every threshold with the corpus today (and proposes thresholds from it with --propose).
// new       scaffolds a whole new region (config with starter tables, scene stub, a pack file per group, a generated coverage test,
//           a doc skeleton); it refuses to overwrite and ships no example art. status shows what a region has and what is MISSING
//           (units, big and small places, bytes, lint per pack; exit 2 under --strict). brief writes the ready-to-paste task briefs
//           for the agents that draw it (tools/lib/anim-templates/*.md). guard proves that a batch of agents touched only their own files.
//           Guide: docs/dev/ANIMATION_PACKS.md, "Making a new region".
//
// To add a subcommand, either drop a module in tools/lib/anim-cmd/<name>.mjs (it is found automatically; no edit here) or add an entry
// to COMMANDS below. A command is {summary, usage, options, notes?, run(args, ctx)}: `options` is a node:util parseArgs spec with a `help`
// text per option, `notes` an optional list of sentences `<command> --help` prints under the options; `ctx` carries {root, out, err, positionals};
// run returns the exit code (0 ok, 1 error, 2 failures).
//   // tools/lib/anim-cmd/hello.mjs
//   export default { summary: 'say hello', usage: 'hello [--name <n>]', options: { name: { type: 'string', help: 'who' } },
//                    run(args, ctx) { ctx.out('hello ' + (args.name || 'world')); return 0; } };
// Reusable parts: tools/lib/anim-quality.mjs (measure / check / lintMarkup / thinSpots), tools/lib/anim-render.mjs (registry, rendering),
// and here lintRegistry / measureRegistry / selectEntries / loadThresholds / loadReference.
import { readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { measure, check, profileFor, applyWaivers, ruleTable, checkCss, richness, describe, proposeThresholds, shapeKeys, sharedShares, thinSpots, stableIds, isLegacyProfile, bytesCapFor, TARGETS, RULE_PLAN } from './lib/anim-quality.mjs';
import { loadRegistry, renderItems, contactSheet, repoRoot, findBrowser, skyFor, parseLocation, CROPS, SIZES, DEFAULT_AT } from './lib/anim-render.mjs';
import { engineOf, lintScene, retroCheck, standardOf } from './lib/scene-lint.mjs';
import { fileProblems, regions } from './lib/anim-region.mjs';
import { launchChrome } from './release-chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/* ---------------------------------------------------------------------------------------------
   Shared: thresholds, the reference list, selecting items
   --------------------------------------------------------------------------------------------- */
export function loadThresholds(root = repoRoot()) {
  const p = [join(root, 'tools', 'anim-quality.json'), join(HERE, 'anim-quality.json')].find(existsSync);
  if (!p) throw new Error('tools/anim-quality.json not found');
  return JSON.parse(readFileSync(p, 'utf8'));
}
export function loadReference(root = repoRoot()) {
  const p = [join(root, 'tools', 'anim-reference.json'), join(HERE, 'anim-reference.json')].find(existsSync);
  if (!p) throw new Error('tools/anim-reference.json not found');
  return JSON.parse(readFileSync(p, 'utf8'));
}
/** --only small | scenes: keep only the small items or only the full-screen scenes of a selection (an element agent lints its pack file without the scenes other agents are still drawing). */
function onlyKind(args, entries) {
  if (!args.only) return entries;
  if (!['small', 'scenes'].includes(args.only)) throw new Error('--only must be small or scenes');
  return entries.filter(e => (args.only === 'scenes' ? e.full : !e.full));
}
const splitList = (v) => [].concat(v || []).flatMap(x => String(x).split(',')).map(s => s.trim()).filter(Boolean);

/** The names an item answers to for --key: its id (au-signature), its ref (oceania-australasia/au-signature) and, in a region, its key (country:AU, place:sydney: a unit's key names both its signature and its element). */
export function itemNames(reg, e) {
  const names = [e.id, e.ref], r = regions(reg).find(x => x.owns(e.pack));
  if (r) { const F = r.fields, it = e.item; if (it[F.kind] === 'city') names.push('place:' + it[F.place]); else if (it[F.kind] === r.unitWord) names.push(r.unitWord + ':' + it[F.unit]); }
  return names;
}
/** --key <key,key>: keep the entries a key names (`*` is a wildcard, case does not matter). A key that names nothing is an error: a typo must not render everything or nothing silently. */
export function keyFilter(reg, entries, keys) {
  if (!keys.length) return entries;
  const tests = keys.map(k => ({ k, re: new RegExp('^' + k.split('*').map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$', 'i'), hit: 0 }));
  const kept = entries.filter(e => { const names = itemNames(reg, e); let ok = false; for (const t of tests) if (names.some(n => t.re.test(n))) { t.hit++; ok = true; } return ok; });
  const missing = tests.filter(t => !t.hit).map(t => t.k);
  if (missing.length) throw new Error(`--key ${missing.join(', ')} names no item of the selection. A key is an item id (au-signature), a ref (pack/id) or a region key (country:AU, place:sydney); * is a wildcard. The selection has: ${entries.slice(0, 12).map(e => e.id).join(', ')}${entries.length > 12 ? ', ...' : ''}`);
  return kept;
}
/** --at <ms>: a whole number of milliseconds, 0 to 600000. */
function toMs(v) {
  const n = Number(v);
  if (!String(v).trim() || !Number.isInteger(n) || n < 0 || n > 600000) throw new Error(`--at must be a whole number of milliseconds from 0 to 600000, got "${v}"`);
  return n;
}

/** The drawing without its per-render gradient ids, to tell changed art from the same art drawn again. */
function canonicalArt(html) {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  const names = new Map(ids.map((id, i) => [id, 'n' + i]));
  return html.replace(/\bid="([^"]+)"/g, (a, id) => `id="${names.get(id)}"`).replace(/url\(#([^)]+)\)/g, (a, id) => `url(#${names.get(id) || id})`).replace(/href="#([^"]+)"/g, (a, id) => `href="#${names.get(id) || id}"`);
}

/** The registry entries a command works on: --ref, --pack, or (with extra files) what those files add or change. */
export function selectEntries(reg, { refs = [], packs = [], baseline = null } = {}) {
  let list = reg.items();
  if (baseline) {
    const was = new Map(baseline.items().map(e => [e.ref, canonicalArt(baseline.html(e.item))]));
    list = list.filter(e => !was.has(e.ref) || was.get(e.ref) !== canonicalArt(reg.html(e.item)));
  }
  if (packs.length) {
    const known = new Set(reg.items().map(e => e.pack));
    for (const p of packs) if (!known.has(p)) throw new Error(`unknown pack "${p}" (packs: ${[...known].join(', ')})`);
    list = list.filter(e => packs.includes(e.pack));
  }
  if (refs.length) {
    const byRef = new Map(list.map(e => [e.ref, e]));
    const missing = refs.filter(r => !byRef.has(r));
    if (missing.length) throw new Error(`unknown ref(s): ${missing.join(', ')}. A ref is <pack>/<item id>, for example us-pacific/ak-midnight-sun`);
    list = refs.map(r => byRef.get(r));
  }
  return list;
}

/* ---------------------------------------------------------------------------------------------
   lint
   --------------------------------------------------------------------------------------------- */
/**
 * Measure registry entries: [{entry, metrics}]. Every drawing also gets `sharedShare` / `sharedShareAll`: how much of it is identical (same
 * geometry, any paint) to other drawings of its pack / of any pack, scenes against scenes and small items against small items, always measured
 * against the WHOLE registry, not only `entries`. A re-coloured copy of an icon or a scene shares everything with its original.
 * The markup is measured with its ids renamed to a fixed length (stableIds): the size must not depend on what was rendered before.
 */
export function measureRegistry(reg, entries = reg.items(), thresholds = loadThresholds(reg.root)) {
  const classCache = new Map();
  const rows = entries.map(e => {
    if (!classCache.has(e.pack)) classCache.set(e.pack, reg.classesFor(e.packObj));
    const legacy = isLegacyProfile(profileFor(e, thresholds));
    return { entry: e, metrics: measure(stableIds(reg.html(e.item), legacy), e.full ? 'scene' : 'item', { classes: classCache.get(e.pack), legacy }) };
  });
  const cache = reg._shapeKeys || (reg._shapeKeys = new Map());
  for (const full of [true, false]) {
    const mine = rows.filter(r => r.entry.full === full);
    if (!mine.length) continue;
    const inSet = new Set(mine.map(r => r.entry.ref));
    const list = mine.map(r => ({ ref: r.entry.ref, pack: r.entry.pack, keys: r.metrics._keys }));
    for (const e of reg.items()) if (e.full === full && !e.composed && !inSet.has(e.ref)) list.push({ ref: e.ref, pack: e.pack, keys: cache.get(e.ref) || cache.set(e.ref, shapeKeys(reg.html(e.item))).get(e.ref) });
    const shares = sharedShares(list);
    mine.forEach((r, i) => { r.metrics.sharedShare = shares[i].pack; r.metrics.sharedShareAll = shares[i].all; });
  }
  return rows;
}

/**
 * Lint registry entries. Returns {results, packCss, staleWaivers, summary}; a result is {ref, pack, profile, metrics, failures, waived, tier}.
 * A COMPOSED item (item.composed) is judged by the composed profile (lintScene, tools/lib/scene-lint.mjs: data, the bar, variety, care;
 * its result also carries `rules`, every PASS / FAIL row); every other item by measure / check as before. `tier` is the new standard's
 * (standardOf: gold, composed, upgrading, rich, legacy; null for small items). With `sky` (an o.sky, or a function entry -> o.sky: the
 * tools' --at / --location), a scene whose markup then carries the retrofit overlay (g.sr-retro) is also checked against the retro rules;
 * the base art is still measured without it.
 */
export function lintRegistry(reg, thresholds, entries = reg.items(), { sky = null } = {}) {
  const composed = entries.filter(e => profileFor(e, thresholds) === 'composed'), plain = entries.filter(e => !composed.includes(e));
  const results = measureRegistry(reg, plain, thresholds).map(({ entry: e, metrics }) => {
    const profile = profileFor(e, thresholds);
    let fails = check(metrics, profile, thresholds);
    if (sky && e.full) {
      const o = typeof sky === 'function' ? sky(e) : sky;
      if (o) fails = fails.concat(retroCheck(reg.html(e.item, { live: true, size: 'fill', sky: o }), { classes: reg.classesFor(e.packObj) }).filter(r => !r.ok).map(r => ({ rule: r.rule, message: r.message, value: r.value })));
    }
    const split = applyWaivers(fails, e.ref, thresholds);
    return { ref: e.ref, pack: e.pack, slot: e.slot, full: e.full, rich: !!e.rich, profile, metrics, failures: split.failures, waived: split.waived, tier: standardOf(e, null, null) };
  });
  if (composed.length) {
    const E = engineOf(reg);
    for (const e of composed) {
      let r;
      try { r = E.ready ? lintScene(e.item, thresholds, { E, item: e.item, ref: e.ref }) : null; } catch (err) { r = { pass: false, rules: [{ group: 'data', rule: 'compile', ok: false, value: 'error', limit: 'compiles', message: err.message }], metrics: {} }; }
      if (!r) r = { pass: false, rules: [{ group: 'data', rule: 'engine', ok: false, value: 'missing', limit: 'the scene engine', message: 'a composed item needs the scene engine (src/app/70-scene-0core.js), which this checkout does not load' }], metrics: {} };
      const split = applyWaivers(r.rules.filter(x => !x.ok).map(x => ({ rule: x.rule, group: x.group, message: x.message, value: x.value })), e.ref, thresholds);
      const lint = { pass: !split.failures.length };
      results.push({ ref: e.ref, pack: e.pack, slot: e.slot, full: true, rich: true, composed: true, profile: 'composed', metrics: r.metrics, rules: r.rules, warnings: r.warnings || [], failures: split.failures, waived: split.waived, tier: standardOf(e, lint, null) });
    }
    const order = new Map(entries.map((e, i) => [e.ref, i]));
    results.sort((a, b) => order.get(a.ref) - order.get(b.ref));
  }
  const packCss = [];
  for (const id of new Set(entries.map(e => e.pack))) {
    const p = reg.packs().find(x => x.id === id);
    const f = checkCss(p && p.css);
    if (f.length) packCss.push({ pack: id, failures: f });
  }
  const seen = new Set(results.map(r => r.ref));
  const staleWaivers = (thresholds.waivers || []).filter(w => seen.has(w.ref) && !results.find(r => r.ref === w.ref).waived.some(f => f.rule === w.rule));
  const failing = results.filter(r => r.failures.length);
  return {
    results, packCss, staleWaivers,
    summary: { items: results.length, scenes: results.filter(r => r.full).length, small: results.filter(r => !r.full).length, failing: failing.length, failures: failing.reduce((n, r) => n + r.failures.length, 0) + packCss.reduce((n, p) => n + p.failures.length, 0), waived: results.reduce((n, r) => n + r.waived.length, 0) },
  };
}

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);

function printRuleTable(out, r, thresholds) {
  if (r.profile === 'composed') {
    for (const row of r.rules || []) out(`    ${row.ok ? (row.warn ? 'WARN' : 'PASS') : r.waived.some(f => f.rule === row.rule) ? 'WAIV' : 'FAIL'}  ${pad(row.group, 8)} ${pad(row.rule, 16)} ${lpad(row.value == null ? '-' : row.value, 12)}   ${row.limit || ''}`);
    return;
  }
  for (const row of ruleTable(r.metrics, r.profile, thresholds, [...r.failures, ...r.waived])) {
    const waived = r.waived.some(f => f.rule === row.rule);
    out(`    ${row.ok ? 'PASS' : waived ? 'WAIV' : 'FAIL'}  ${pad(row.rule, 22)} ${lpad(row.value, 8)}   ${row.limit}`);
  }
}

/** How an item stands against the redraw targets (TARGETS): its richness index, its thin spots and what misses. */
function targetOf(r, thresholds) {
  if (r.profile === 'composed') return { index: null, thin: [], miss: [] };   // judged by the bar, not by the corpus targets
  const rs = thresholds[r.profile] && thresholds[r.profile].richness;
  const index = rs ? richness(r.metrics, rs).index : null;
  const thin = thinSpots(r.metrics, r.profile, thresholds);
  const miss = [];
  if (index != null && index < TARGETS.richness) miss.push(`richness ${index} < ${TARGETS.richness.toFixed(2)}`);
  if (thin.length > TARGETS.maxThinSpots) miss.push(`${thin.length} thin spots > ${TARGETS.maxThinSpots}`);
  return { index, thin, miss };
}

const lint = {
  summary: 'measure every full scene and small item against the calibrated thresholds, print the thin spots (exit 2 on any failure)',
  usage: 'lint [--pack <id>] [--ref <ref,ref>] [--key <key,key>] [--file <path>] [--only small|scenes] [--at <ISO> [--location lat,lon]] [--season s] [--json] [--rules] [--quiet]',
  options: {
    pack: { type: 'string', multiple: true, help: 'lint one pack (repeatable)' },
    ref: { type: 'string', multiple: true, help: 'lint these items (<pack>/<id>, comma separated)' },
    key: { type: 'string', multiple: true, help: 'lint only the items these keys name: an item id (au-signature), a ref (pack/id) or a region key (country:AU, place:sydney: a unit\'s key names its signature and its element); * is a wildcard. Combine with --file or --pack to lint one scene of a file' },
    file: { type: 'string', multiple: true, help: 'a scene or pack file (not registered yet, or already in src/app): it is loaded with the registry and what it adds (new or changed items) is linted. Exit 1, nothing linted, when the file registers nothing, registers a scene key that does not exist or that no pack uses, or registers a key twice' },
    json: { type: 'boolean', help: 'machine-readable output' },
    rules: { type: 'boolean', help: 'print the PASS / FAIL table of every rule for every selected item (default when 3 or fewer items)' },
    quiet: { type: 'boolean', help: 'print only failures and the summary: no thin spots, no redraw-target lines' },
    only: { type: 'string', help: 'small | scenes: lint only the small items, or only the full-screen scenes, of the selection (e.g. a pack file with --file)' },
    at: { type: 'string', help: 'an ISO time (2026-10-07T21:30:00Z): also render each scene with the LIVE sky of that moment (at --location, else the place of the scene) and check the retrofit overlay it carries (at most 6,000 bytes, every sr-* class defined). The base art is still judged without it' },
    location: { type: 'string', help: 'lat,lon for --at (default: the place of each scene)' },
    season: { type: 'string', help: 'spring | summer | autumn | winter: the season passed to the renderers (composed scenes and the retrofit overlay)' },
  },
  notes: [
    'THE NEW STANDARD (docs/dev/SCENE_ENGINE.md section 15): a composed scene (item.composed) is judged by the composed profile (data, the bar, placement variety, care; scene lint adds perf) and prints GOLD when it passes. Every hand-drawn full scene is judged by its own (legacy) floors and prints "(legacy floors: below the new standard)" even when it passes: new scenes are composed (scene new, scene upgrade).',
    'A pass is still measured against the redraw targets (richness, thin spots). Thin spots are ADVISORY, never a failure: the levels in tools/anim-quality.json (warnMin / warnMax) are the 10th / 90th percentile of the accepted corpus, and each thin spot prints what to do about it.',
    'Counting: a <path> that carries the class us-lit (a row of lit panes drawn as ONE path of many sub-paths) counts as ONE shape and ONE lit pane group, however many panes it holds. That is the cheap way to draw a lit row (one path, not forty rects), but the pane count does not raise `shapes`.',
    'Seeds: stars(), birds(), shimmer(), puffs(), ridge() and canopy() draw the SAME shapes for the same seed, and identical shapes count as copies (sharedShare / sharedShareAll): give every call its own seed, also across scenes and files.',
    '"Too little drawn" is detailPerKB (shapes plus path segments per KB), so a path-heavy scene with few shapes per KB is not flagged; shapesPerKB keeps its hard floor. Small items also report how many moving elements share one --d (a bare x-glow counts as delay 0): a thin spot above 5, the accepted median is 3.',
    'A scene with a 5-stop dusk sky already spends four of the five hue sectors the advisory allows (blue, violet, magenta, red to gold): the ground and the water share ONE more family, accents stay under 4 % of the painted area.',
  ],
  run(args, ctx) {
    const root = ctx.root, thresholds = loadThresholds(root);
    const files = splitList(args.file);
    const reg = loadRegistry(root, { extraFiles: files });
    const baseline = files.length ? loadRegistry(root, { omit: files.map(f => basename(f)) }) : null;   // without the files: a file already in src/app adds all its items
    if (files.length) {
      const bad = fileProblems(reg, baseline, files);
      if (bad.length) { for (const m of bad) ctx.err(`lint: ${m}`); ctx.err(`lint: ${bad.length} problem(s) in the scene file(s): nothing was linted. Fix them first.`); return 1; }
    }
    const t0 = Date.now();
    const entries = keyFilter(reg, onlyKind(args, selectEntries(reg, { refs: splitList(args.ref), packs: splitList(args.pack), baseline })), splitList(args.key));
    if (files.length && !entries.length) { ctx.err(`lint: the file(s) loaded but registered no new or changed ${args.only === 'small' ? 'small item' : args.only === 'scenes' ? 'scene' : 'item'}, so there is nothing to lint. A scene file only shows once a pack item uses its key (the pack file of its group calls B.scenes()); a pack file must call animRegisterPack; the file must be saved with a scene in it.`); return 1; }
    const loc = parseLocation(args.location);
    if (args.season && !['spring', 'summer', 'autumn', 'winter'].includes(args.season)) throw new Error('--season must be spring, summer, autumn or winter');
    const res = lintRegistry(reg, thresholds, entries, { sky: args.at ? (e) => skyFor(reg, e.item, { at: args.at, location: loc }) : null });
    const ms = Date.now() - t0;
    const fail = res.summary.failing > 0 || res.packCss.length > 0;
    const targets = new Map(res.results.map(r => [r.ref, targetOf(r, thresholds)]));
    if (args.json) {
      ctx.out(JSON.stringify({ ok: !fail, ms, summary: res.summary, packCss: res.packCss, staleWaivers: res.staleWaivers, targets: TARGETS, items: res.results.map(r => ({ ref: r.ref, pack: r.pack, profile: r.profile, tier: r.tier, pass: !r.failures.length, rules: r.rules, failures: r.failures, waived: r.waived, thin: targets.get(r.ref).thin, richness: targets.get(r.ref).index, targetMiss: targets.get(r.ref).miss, metrics: r.metrics })) }, null, 1));
      return fail ? 2 : 0;
    }
    const out = ctx.out, quiet = !!args.quiet;
    out(`anim-pack lint: ${res.summary.items} items (${res.summary.scenes} full scenes, ${res.summary.small} small) in ${(ms / 1000).toFixed(1)} s`);
    const showRules = args.rules || entries.length <= 3;
    if (!showRules) {
      out('');
      out(`${pad('pack', 22)} ${lpad('scenes', 6)} ${lpad('small', 6)} ${lpad('pass', 6)} ${lpad('FAIL', 6)} ${lpad('waived', 6)}`);
      for (const id of [...new Set(res.results.map(r => r.pack))]) {
        const rs = res.results.filter(r => r.pack === id);
        out(`${pad(id, 22)} ${lpad(rs.filter(r => r.full).length, 6)} ${lpad(rs.filter(r => !r.full).length, 6)} ${lpad(rs.filter(r => !r.failures.length).length, 6)} ${lpad(rs.filter(r => r.failures.length).length, 6)} ${lpad(rs.filter(r => r.waived.length).length, 6)}`);
      }
    }
    const selected = files.length > 0 || splitList(args.ref).length > 0 || splitList(args.pack).length > 0 || splitList(args.key).length > 0;   // an explicit selection lists every item; the whole registry lists only the failures
    const thinLine = (t) => `      ${pad(t.rule, 22)} ${lpad(t.value, 8)}   median ${t.median}   ${t.side === 'low' ? 'too little' : 'too much'}${t.hint ? `\n          -> ${t.hint}` : ''}`;
    for (const r of res.results) {
      const tg = targets.get(r.ref);
      if (!r.failures.length && !showRules && !(selected && !quiet)) continue;
      out('');
      const tierNote = r.tier === 'gold' ? '  GOLD' : r.tier === 'composed' ? '  (composed: below the bar until it passes)' : r.tier && !r.failures.length ? `  (legacy floors: below the new standard${r.tier === 'rich' ? '; rich: the look of the bar, converted at the convert stage' : r.tier === 'upgrading' ? '; an upgrade is drafted' : ''})` : '';
      out(`${r.failures.length ? 'FAIL' : 'PASS'}  ${r.ref}  (${r.profile}${r.waived.length ? `, waived: ${r.waived.map(f => f.rule).join(', ')}` : ''})${tierNote}`);
      for (const w of r.warnings || []) out(`    warn: ${w}`);
      if (showRules) printRuleTable(out, r, thresholds);
      if (r.failures.length) {
        if (showRules) out('    how to fix:');
        for (const f of r.failures) out(`    - [${f.rule}] ${f.message}`);
      }
      if (quiet || r.profile === 'composed') continue;
      const shown = tg.thin.slice(0, showRules ? 8 : 6);
      out(`    ${tg.index != null ? `richness ${tg.index} (target >= ${TARGETS.richness.toFixed(2)}, 1.0 = the median accepted ${r.full ? 'scene' : 'item'}); ` : ''}thin spots ${tg.thin.length} (target <= ${TARGETS.maxThinSpots})${tg.miss.length ? `   MISSES THE TARGET: ${tg.miss.join(', ')}: redraw, do not pad` : '   target met'}${tg.thin.length ? `; a pass, but ${tg.thin.some(t => t.side === 'high') ? 'beyond the 10th / 90th percentile of' : 'thinner than 90 % of'} the accepted ${r.full ? 'scenes' : 'items'}, aim for the median:` : ''}`);
      for (const t of shown) out(thinLine(t));
      if (tg.thin.length > shown.length) out(`      ... and ${tg.thin.length - shown.length} more (--rules or --json lists all)`);
      const dl = thresholds[r.profile] && thresholds[r.profile].sameDelay;
      if (!r.full && dl && r.metrics.sameDelay >= 3 && !tg.thin.some(t => t.rule === 'sameDelay')) out(`    delays: ${r.metrics.sameDelay} moving elements share --d ${r.metrics.sameDelayValue}s (a bare x-* counts as 0): they pulse together; the accepted median is ${dl.median} and a thin spot starts above ${dl.warnMax}. Staggering them is better craft.`);
    }
    for (const p of res.packCss) for (const f of p.failures) out(`\nFAIL  pack ${p.pack} css  [${f.rule}] ${f.message}`);
    if (res.staleWaivers.length) out(`\nnote: ${res.staleWaivers.length} waiver(s) no longer needed, remove them from tools/anim-quality.json: ${res.staleWaivers.map(w => w.ref + ' ' + w.rule).join('; ')}`);
    const missed = res.results.filter(r => !r.failures.length && targets.get(r.ref).miss.length);
    if (!quiet && missed.length) out(`\nredraw target missed by ${missed.length} passing item(s): ${missed.map(r => r.ref).join(', ')} (richness >= ${TARGETS.richness.toFixed(2)} and at most ${TARGETS.maxThinSpots} thin spots; a redraw is at most ${TARGETS.maxRedraws} attempts, then it is reported as NOT DONE)`);
    out('');
    const tiers = {}; for (const r of res.results) if (r.tier) tiers[r.tier] = (tiers[r.tier] || 0) + 1;
    if (Object.keys(tiers).length) out(`standard: ${tiers.gold || 0} of ${res.summary.scenes} full scenes at the new standard (gold)${['composed', 'upgrading', 'rich', 'legacy'].filter(t => tiers[t]).map(t => `; ${tiers[t]} ${t}`).join('')}${tiers.legacy || tiers.rich || tiers.upgrading ? ' (below the new standard)' : ''}`);
    out(fail ? `FAIL: ${res.summary.failing} item(s) with ${res.summary.failures} failing rule(s). Compare with \`node tools/anim-pack.mjs reference\`, fix, re-run.`
      : `PASS: ${res.summary.items} items clean${res.summary.waived ? ` (${res.summary.waived} documented waivers)` : ''}.`);
    return fail ? 2 : 0;
  },
};

/* ---------------------------------------------------------------------------------------------
   sheet
   --------------------------------------------------------------------------------------------- */
const MODES = ['light', 'dark', 'night'];
const sheet = {
  summary: 'render items to PNG (scenes 1600 x 900 paused at 6.5 s, small items 512 x 512) so they can be looked at; --still, --at, --sizes, --key',
  usage: 'sheet <ref,ref | --pack <id> | --file <path>> [--key <key,key>] [--only small|scenes] [--mode light|dark|night] [--crop square|phone] [--still] [--at <ms> | --at <ISO> [--location lat,lon]] [--season s] [--sizes] [--out <dir>] [--contact]',
  options: {
    pack: { type: 'string', multiple: true, help: 'render every item of this pack (repeatable)' },
    file: { type: 'string', multiple: true, help: 'a scene or pack file (not registered yet, or already in src/app): renders what it adds (new or changed items)' },
    key: { type: 'string', multiple: true, help: 'render only the items these keys name: an item id (au-signature), a ref (pack/id) or a region key (country:AU, place:sydney: a unit\'s key names its signature and its element); * is a wildcard. So an iteration re-renders one scene of a file, not all of them' },
    mode: { type: 'string', default: 'light', help: 'light | dark | night (night = dark theme at night time: lit windows, stars)' },
    crop: { type: 'string', help: 'square | phone: render only what a square tile (the central 900 of the 1600 units) or a portrait phone (the central 420) shows of a scene: the subject must still be the picture there (files get a -square / -phone suffix)' },
    still: { type: 'boolean', help: 'animations OFF: the rest frame, exactly what reduced motion shows (a rising sun is at its place, a falling leaf or a half-faded drop is not caught mid-animation). Files get a -still suffix. Without it the animations are paused at --at' },
    at: { type: 'string', help: `a whole number: the time the animations are paused at, in ms (default ${DEFAULT_AT}; ignored with --still; a -t<ms> suffix). An ISO time (2026-10-07T21:30:00Z): the LIVE sky of that moment (at --location, else the place of each scene): the real sun, moon and stars, the grade, lit windows after dusk, and on a hand-drawn region scene the retrofit overlay (a -<time> suffix)` },
    location: { type: 'string', help: 'lat,lon for --at <ISO> (default: the place of each scene)' },
    season: { type: 'string', help: 'spring | summer | autumn | winter: the season passed to the renderers (a -<season> suffix)' },
    sizes: { type: 'boolean', help: `also write <...>-sizes.png for every small item: the item at ${SIZES.join(', ')} px, at its real pixel size (1x), so "reads at 28 px" can be checked. With --contact a contact sheet of the strips is written too. Scenes have no strip` },
    out: { type: 'string', help: 'output folder (default .anim-ref/sheets/)' },
    contact: { type: 'boolean', help: 'also write one contact-sheet PNG with all the renders (on a page that matches --mode: a light render sits on a light page)' },
    only: { type: 'string', help: 'small | scenes: render only the small items, or only the full-screen scenes, of the selection' },
  },
  positionals: '<ref,ref>',
  notes: [
    'The contact-sheet tiles are about 200 px wide: that is NOT 28 px. Judge "does it read at 28 px" on the --sizes strip, which is rendered at its real pixel size.',
    'Animations are paused at --at (6.5 s by default), so an animated part (a rising sun, a falling leaf, a pulse) shows a mid-animation state. --still shows the rest frame, the one reduced motion shows and the one a viewer sees first.',
  ],
  async run(args, ctx) {
    const mode = args.mode || 'light';
    if (!MODES.includes(mode)) throw new Error(`--mode must be one of ${MODES.join(', ')}`);
    const crop = args.crop || '';
    if (crop && !CROPS[crop]) throw new Error(`--crop must be one of ${Object.keys(CROPS).join(', ')}`);
    const iso = args.at != null && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(args.at).trim());   // an ISO time (YYYY-MM-DDTHH:MM ...) is a live sky; anything else is the pause time in ms
    const at = args.at == null || iso ? DEFAULT_AT : toMs(args.at), still = !!args.still;
    const loc = parseLocation(args.location);
    if (args.season && !['spring', 'summer', 'autumn', 'winter'].includes(args.season)) throw new Error('--season must be spring, summer, autumn or winter');
    if (iso && !Number.isFinite(Date.parse(args.at))) throw new Error(`--at: "${args.at}" is not a valid ISO time (such as 2026-10-07T21:30:00Z)`);
    const files = splitList(args.file);
    const reg = loadRegistry(ctx.root, { extraFiles: files });
    const baseline = files.length ? loadRegistry(ctx.root, { omit: files.map(f => basename(f)) }) : null;   // without the files: a file already in src/app adds all its items
    if (files.length) { const bad = fileProblems(reg, baseline, files); if (bad.length) throw new Error(`the scene file(s) are not sound:\n  ${bad.join('\n  ')}`); }
    const refs = splitList(ctx.positionals);
    if (!refs.length && !splitList(args.pack).length && !files.length) throw new Error('sheet needs refs (us-pacific/ak-midnight-sun,...), --pack <id> or --file <path>');
    const entries = keyFilter(reg, onlyKind(args, selectEntries(reg, { refs, packs: splitList(args.pack), baseline })), splitList(args.key));
    if (!entries.length) throw new Error('nothing to render');
    const outDir = resolve(args.out || join(ctx.root, '.anim-ref', 'sheets'));
    const exe = findBrowser();
    if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable (or PLAYWRIGHT_BROWSERS_PATH to a Playwright browsers folder).');
    if (args.sizes && entries.every(e => e.full)) ctx.err('note: --sizes draws a strip for small items only; the selection is all full-screen scenes (--crop phone shows what a narrow screen keeps)');
    const chrome = await launchChrome({ executable: exe });
    try {
      const liveTag = (iso ? '-' + String(args.at).replace(/[:]/g, '').replace(/\.\d+Z$/, 'Z') : '') + (args.season ? '-' + args.season : '');
      const done = await renderItems(reg, entries, { mode, outDir, chrome, crop, still, at, sizes: !!args.sizes, sky: iso ? (e) => skyFor(reg, e.item, { at: args.at, location: loc }) : null, season: args.season || null, tag: liveTag, onProgress: (i, n, ref) => { if (!args.json) ctx.err(`  [${i}/${n}] ${ref}`); } });
      for (const d of done) { ctx.out(d.file); if (d.sizesFile) ctx.out(d.sizesFile); }
      const tag = (still ? '-still' : at !== DEFAULT_AT ? `-t${at}` : '') + liveTag;
      if (args.contact) {
        ctx.out(await contactSheet(done, { file: join(outDir, `contact-${mode}${crop && entries.some(e => e.full) ? '-' + crop : ''}${tag}.png`), chrome, mode, columns: entries.every(e => !e.full) ? 6 : crop === 'phone' ? 8 : crop === 'square' ? 5 : 3 }));
        if (args.sizes && done.some(d => d.sizesFile)) ctx.out(await contactSheet(done, { file: join(outDir, `contact-${mode}-sizes${tag}.png`), chrome, mode, sizes: true, columns: 2 }));
      }
    } finally { await chrome.close(); }
    return 0;
  },
};

/* ---------------------------------------------------------------------------------------------
   reference
   --------------------------------------------------------------------------------------------- */
const reference = {
  summary: 'print THE BAR (the new standard: the rich Yateley and Fleet scenes), then the legacy exemplars and the weaker ones to beat; --render writes their PNGs to .anim-ref/',
  usage: 'reference [--render] [--mode light|dark|night] [--json]',
  options: {
    render: { type: 'boolean', help: 'render the exemplars to .anim-ref/ (git-ignored) and print the paths. Without --mode: the exemplars in light, night AND dark (every PNG the briefs cite: scenes light + night, small items light + dark), the bar (the new standard) in light and night, the weaker ones in light. A composed bar scene is also rendered in its four seasons' },
    mode: { type: 'string', help: 'with --render: only this mode (light | dark | night) for everything' },
    json: { type: 'boolean', help: 'machine-readable output (with --render: rendered is {ref: {mode: path}})' },
  },
  async run(args, ctx) {
    const ref = loadReference(ctx.root);
    if (args.json && !args.render) { ctx.out(JSON.stringify(ref, null, 1)); return 0; }
    const weakerItems = ref.weakerItems || [], bar = ref.bar || [];
    const all = [...bar, ...ref.scenes, ...ref.items, ...ref.weaker, ...weakerItems];
    const paths = new Map();   // ref -> {mode: path}
    if (args.mode && !MODES.includes(args.mode)) throw new Error(`--mode must be one of ${MODES.join(', ')}`);
    if (args.render) {
      const reg = loadRegistry(ctx.root);
      const exe = findBrowser();
      if (!exe) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable (or PLAYWRIGHT_BROWSERS_PATH to a Playwright browsers folder).');
      const outDir = join(ctx.root, '.anim-ref');
      mkdirSync(outDir, { recursive: true });
      const jobs = args.mode ? [[args.mode, all.map(x => x.ref)]] : [['light', all.map(x => x.ref)], ['night', [...bar, ...ref.scenes, ...ref.items].map(x => x.ref)], ['dark', [...ref.scenes, ...ref.items].map(x => x.ref)]];
      const chrome = await launchChrome({ executable: exe });   // one browser for every mode
      try {
        for (const [mode, refs] of jobs) {
          const done = await renderItems(reg, selectEntries(reg, { refs }), { mode, outDir, chrome, onProgress: (i, n, r) => ctx.err(`  ${mode} [${i}/${n}] ${r}`) });
          for (const d of done) paths.set(d.ref, { ...(paths.get(d.ref) || {}), [mode]: d.file });
        }
        // a COMPOSED bar scene adapts to the date: render it in its four seasons too (a rich hand-drawn one is one season per item)
        for (const b of bar.filter(x => x.kind === 'composed')) {
          const e = selectEntries(reg, { refs: [b.ref] });
          for (const season of ['spring', 'summer', 'autumn', 'winter']) {
            const done = await renderItems(reg, e, { mode: 'light', outDir, chrome, season, tag: '-' + season });
            for (const d of done) paths.set(d.ref, { ...(paths.get(d.ref) || {}), [season]: d.file });
          }
        }
      } finally { await chrome.close(); }
    }
    if (args.json) { ctx.out(JSON.stringify({ ...ref, rendered: Object.fromEntries(paths) }, null, 1)); return 0; }
    const show = (title, list, why) => {
      ctx.out(`\n${title}`);
      for (const x of list) {
        ctx.out(`  ${x.ref}${x.tags && x.tags.length ? `   [${x.tags.join(', ')}]` : ''}`);
        ctx.out(`      ${x[why]}`);
        if (x.fix) ctx.out(`      instead: ${x.fix}`);
        if (x.source) ctx.out(`      read: ${x.source}`);
        for (const f of Object.values(paths.get(x.ref) || {})) ctx.out(`      ${f}`);
      }
    };
    ctx.out(ref._about || 'Gold-standard exemplars: match their craft, never copy their drawing.');
    if (bar.length) show(`THE BAR: the new standard every scene must reach (${bar.length}; docs/dev/SCENE_ENGINE.md section 15). Match their depth, cover, life and light, at the frame budget`, bar, 'why');
    show(`LEGACY EXEMPLARS: FULL-SCREEN SCENES to study (${ref.scenes.length}): hand-drawn craft to learn from; below the new bar`, ref.scenes, 'why');
    show(`SMALL 64 x 64 ITEMS to study (${ref.items.length})`, ref.items, 'why');
    show(`DO BETTER THAN THESE SCENES (${ref.weaker.length}): accepted, but flat, blobby or crude`, ref.weaker, 'wrong');
    show(`DO BETTER THAN THESE SMALL ITEMS (${weakerItems.length}): accepted, but flat, blobby or crude`, weakerItems, 'wrong');
    if (!args.render) ctx.out('\nSee them: node tools/anim-pack.mjs reference --render   (writes .anim-ref/*.png: light, night and dark; open them before you draw)');
    return 0;
  },
};

/* ---------------------------------------------------------------------------------------------
   calibrate
   --------------------------------------------------------------------------------------------- */
const calibrate = {
  summary: 'compare every threshold with the corpus today; --propose prints thresholds computed from it',
  usage: 'calibrate [--propose]',
  options: { propose: { type: 'boolean', help: 'print proposed thresholds (JSON) at the corpus floor instead of the comparison' } },
  run(args, ctx) {
    const thresholds = loadThresholds(ctx.root);
    const reg = loadRegistry(ctx.root);
    const res = lintRegistry(reg, thresholds);
    for (const profile of Object.keys(RULE_PLAN)) {
      const rs = res.results.filter(r => r.profile === profile);
      if (!rs.length || (thresholds[profile] && thresholds[profile].designed)) continue;   // a DESIGNED profile (composed) is re-based at the convert stage, not calibrated
      if (args.propose) {
        const caps = { bytes: bytesCapFor(profile, reg.limits) };
        ctx.out(JSON.stringify({ [profile]: proposeThresholds(rs.map(r => r.metrics), profile, { caps }) }, null, 1));
        continue;
      }
      ctx.out(`\n== ${profile}: ${rs.length} items`);
      ctx.out(`${pad('rule', 22)} ${pad('threshold', 14)} ${lpad('min', 8)} ${lpad('p3', 8)} ${lpad('median', 8)} ${lpad('p90', 8)} ${lpad('max', 8)}   tightest item`);
      for (const [metric, t] of Object.entries(thresholds[profile])) {
        if (metric.startsWith('_') || typeof t !== 'object') continue;
        const vals = rs.map(r => metric === 'richness' ? richness(r.metrics, t).index : r.metrics[metric]);
        const d = describe(vals), lim = [t.min != null ? `>= ${t.min}` : '', t.max != null ? `<= ${t.max}` : ''].filter(Boolean).join(' ');
        const tight = t.min != null ? rs[vals.indexOf(d.min)].ref : rs[vals.indexOf(d.max)].ref;
        ctx.out(`${pad(metric, 22)} ${pad(lim, 14)} ${lpad(d.min, 8)} ${lpad(d.p3, 8)} ${lpad(d.median, 8)} ${lpad(d.p90, 8)} ${lpad(d.max, 8)}   ${tight}`);
      }
    }
    return 0;
  },
};

/** The subcommand table: add new commands here. */
export const COMMANDS = { lint, sheet, reference, calibrate };

/* ---------------------------------------------------------------------------------------------
   main
   --------------------------------------------------------------------------------------------- */
/** The sections of the --help list (a command that is in none of them is listed last, under "Other"). */
const HELP_GROUPS = [
  ['Composed scenes and the object library: THE NEW STANDARD (docs/dev/SCENE_ENGINE.md)', ['object', 'scene']],
  ['Check and look at the art', ['lint', 'sheet', 'reference', 'calibrate']],
  ['Make a whole region (docs/dev/ANIMATION_PACKS.md, "Making a new region")', ['new', 'status', 'brief', 'guard']],
];
function usage(out, table = COMMANDS) {
  out('OpenDash animation pack tool\n');
  out('usage: node tools/anim-pack.mjs <command> [options]\n');
  const shown = new Set();
  const section = (title, names) => {
    const mine = names.filter(n => table[n]);
    if (!mine.length) return;
    out(title + ':');
    for (const n of mine) { out(`  ${pad(n, 11)} ${table[n].summary}`); shown.add(n); }
    out('');
  };
  for (const [title, names] of HELP_GROUPS) section(title, names);
  section('Other', Object.keys(table).filter(n => !shown.has(n)));
  out('A new scene (the new standard): brief -> compose from the library (object list --kit <kit>; an archetype when one fits) -> object new / lint / sheet only if the subject needs a new object ->');
  out('  scene lint <ref> --perf (GOLD) -> scene sheet <ref> --times --seasons --contact -> review. A hand-drawn region scene: scene upgrade <ref> --box ... -> scene sheet <ref> --compare --upgrades.');
  out('');
  out('A new region, start to finish: new <id> "<Name>"  ->  fill the tables and the "Cultural care" section of its doc  ->  status <id>  ->  COMMIT the scaffold  ->  reference --render (once)  ->');
  out('  brief <id> --kind scene / --kind element  ->  each agent: lint --file <its file>, sheet --file <its file> (light AND night), report  ->  guard --owned <the files of every agent>  ->  status <id> --strict  ->  status <id> --declare-complete  ->  npm test.');
  out('\nRun `node tools/anim-pack.mjs <command> --help` for a command\'s options.');
  out('Global: --root <dir> works on another checkout of the repo.');
  out('Exit codes: 0 ok, 1 error, 2 lint failures (status --strict: anything missing or failing, or everything done but `complete: false` still in the config).');
}
function commandHelp(c, out) {
  out(`usage: node tools/anim-pack.mjs ${c.usage}\n\n${c.summary}\n`);
  for (const [k, o] of Object.entries(c.options || {})) out(`  --${pad(k + (o.type === 'string' ? ' <v>' : ''), 14)} ${o.help || ''}`);
  out(`  --${pad('root <dir>', 14)} the repo root (default: this checkout)`);
  if (c.notes && c.notes.length) { out('\nGood to know:'); for (const n of c.notes) out(`  - ${n}`); }
}

/** The built-in commands plus every module in tools/lib/anim-cmd/ (default export; the file name is the command name). */
export async function loadCommands(dir = join(HERE, 'lib', 'anim-cmd')) {
  const all = { ...COMMANDS };
  if (!existsSync(dir)) return all;
  for (const f of readdirSync(dir).filter(f => /^[a-z][a-z0-9-]*\.mjs$/.test(f)).sort()) {
    const mod = await import(pathToFileURL(join(dir, f)).href);
    const c = mod.default || mod.command;
    const name = f.replace(/\.mjs$/, '');
    if (!c || typeof c.run !== 'function' || !c.summary || !c.usage) throw new Error(`tools/lib/anim-cmd/${f}: export default {summary, usage, options, run}`);
    if (COMMANDS[name]) throw new Error(`tools/lib/anim-cmd/${f}: "${name}" is a built-in command`);
    all[name] = c;
  }
  return all;
}

export async function main(argv, io = {}) {
  const out = io.out || ((s) => console.log(s)), err = io.err || ((s) => console.error(s));
  let table;
  try { table = await loadCommands(io.commandsDir); } catch (e) { err(`anim-pack: ${e.message}`); return 1; }
  const name = argv[0];
  if (!name || name === '--help' || name === '-h' || name === 'help') { usage(out, table); return 0; }
  const cmd = table[name];
  if (!cmd) { err(`unknown command "${name}"\n`); usage(err, table); return 1; }
  if (argv.includes('--help') || argv.includes('-h')) { commandHelp(cmd, out); return 0; }
  let parsed;
  try {
    parsed = parseArgs({ args: argv.slice(1), options: { ...(cmd.options || {}), root: { type: 'string' } }, allowPositionals: true, strict: true });
  } catch (e) {
    const amb = /Option '--([\w-]+)[^']*' argument is ambiguous/.exec(e.message);
    err(`${amb ? `--${amb[1]} needs a value that does not start with a dash (a negative number, or what looks like another option, is not accepted: write --${amb[1]}=<value> if it is really meant)` : e.message}\n`);
    commandHelp(cmd, err); return 1;
  }
  const ctx = { root: resolve(parsed.values.root || repoRoot()), out, err, positionals: parsed.positionals };
  try { return await cmd.run(parsed.values, ctx); }
  catch (e) { err(`anim-pack ${name}: ${e.message}`); return 1; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
