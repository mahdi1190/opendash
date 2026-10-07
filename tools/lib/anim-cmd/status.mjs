// node tools/anim-pack.mjs status [<region>] [--json] [--strict] [--short] [--no-lint] [--declare-complete] [--standard] [--all]
// Coverage of a region (a config made with animRegionDefine, src/app/71-anim-0region.js): per group the units with their signature
// (a full-screen scene) and element (a small symbol), the big places with their full-screen scene, the small places with their element,
// what is MISSING, the bytes, and the lint result per pack. Also: the overlaps with other regions (the border cases), the trips that match
// nothing (travel cities of the region's countries with no row) and the REACH line (how far the farthest travel city is from its nearest row).
// THE NEW STANDARD (docs/dev/SCENE_ENGINE.md 15.3): the STANDARD line counts the scenes at the new standard (gold: composed and passing the
// composed profile), upgrading (a draft upgrade), rich and legacy (below the new standard), with the columns gold / upgr / legacy per pack;
// --standard lists every non-gold scene with its tier and suggested archetype, grouped by archetype (the upgrade worklist, in batches of 7);
// --all prints the tier table for EVERY pack, regions or not (UK, Texas, world, the demo).
// Exit 2 under --strict when anything is missing or failing, or when everything is drawn but the config still says `complete: false`.
// --declare-complete sets `complete: true` in the config (only when --strict would pass): from then on the coverage tests fail hard.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry } from '../anim-render.mjs';
import { lintRegistry, loadThresholds } from '../../anim-pack.mjs';
import { regions, findRegion, regionCoverage, configFileOf, kb, plural, SCENES_PER_AGENT } from '../anim-region.mjs';
import { engineOf, lintScene, standardOf, TIERS } from '../scene-lint.mjs';
import { suggestArchetype } from '../scene-upgrade.mjs';

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
const mark = (x) => (x.state === 'ok' ? `ok ${lpad(kb(x.bytes), 8)}` : x.state === 'small' ? 'NOT FULL SCREEN' : 'MISSING');
const TRAVEL_SHOWN = 15;

/**
 * The new standard of some registry entries (15.3): { gold, composed, upgrading, rich, legacy, list: [{ ref, pack, tier, suggest }], packs: { pack: counts } }.
 * A composed item is gold when it passes the composed profile (the lint result when given, else lintScene here: it is fast); `suggest` is
 * the best archetype of SCENE_ARCHETYPE_INDEX for a non-gold scene ('basic' when nothing scores; null without the index).
 */
export function standardBlock(reg, entries, thresholds, res = null) {
  const E = engineOf(reg), byRef = new Map(((res && res.results) || []).map(r => [r.ref, r]));
  const out = Object.fromEntries(TIERS.map(t => [t, 0]));
  out.list = []; out.packs = {};
  for (const e of entries.filter(x => x.full)) {
    let tier;
    const r = byRef.get(e.ref);
    if (r && r.tier) tier = r.tier;
    else if (e.item.composed) {
      let pass = false;
      try { pass = E.ready && lintScene(e.item, thresholds, { E, item: e.item, ref: e.ref }).pass; } catch { pass = false; }
      tier = standardOf(e, { pass }, null);
    } else tier = standardOf(e, null, null);
    out[tier]++;
    const pk = out.packs[e.pack] || (out.packs[e.pack] = Object.fromEntries(TIERS.map(t => [t, 0])));
    pk[tier]++;
    const sug = tier !== 'gold' && E.index ? suggestArchetype(e.item, E.index)[0] : null;
    out.list.push({ ref: e.ref, pack: e.pack, tier, suggest: tier === 'gold' ? null : !E.index ? null : sug && sug.score > 0 ? sug.id : 'basic' });
  }
  return out;
}
/** The coverage of one region as the command computes it (exported for the tests and other tools). `travel: false` skips the travel-table gaps. */
export function statusOf(reg, region, thresholds, { lint = true, travel = true } = {}) {
  let res = null;
  const mine = reg.items().filter(e => region.owns(e.pack));
  if (lint) res = lintRegistry(reg, thresholds, mine);
  const st = regionCoverage(reg, region, res, { travel });
  st.standard = standardBlock(reg, mine, thresholds, res);
  return st;
}
/** The STANDARD line (15.3). */
export function standardLine(sd) {
  const n = TIERS.reduce((a, t) => a + sd[t], 0), below = sd.upgrading + sd.rich + sd.legacy;
  return `standard  ${sd.gold} of ${n} scenes at the new standard (gold)${sd.composed ? `; ${sd.composed} composed but below the bar` : ''}${sd.upgrading ? `; ${sd.upgrading} upgrading` : ''}${sd.rich ? `; ${sd.rich} rich (hand-drawn, too slow)` : ''}${sd.legacy ? `; ${sd.legacy} legacy` : ''}${below ? ' (below the new standard)' : ''}`;
}
/** The --standard worklist: every non-gold scene with its tier, grouped by suggested archetype, briefed in batches of SCENES_PER_AGENT. */
function printWorklist(out, sd) {
  const todo = sd.list.filter(x => x.tier !== 'gold');
  out('');
  out(`UPGRADE WORKLIST (${todo.length} scene(s) below the new standard, by suggested archetype; brief them in batches of ${SCENES_PER_AGENT}):`);
  const by = new Map();
  for (const x of todo) { const k = x.suggest || 'basic'; if (!by.has(k)) by.set(k, []); by.get(k).push(x); }
  for (const [arch, xs] of [...by.entries()].sort((a, b) => b[1].length - a[1].length)) {
    out(`  ${arch} (${xs.length})`);
    for (const x of xs) out(`    ${pad(x.ref, 52)} ${x.tier}`);
  }
  if (!todo.length) out('  (none: every scene is gold)');
}

/** The lines about the travel tables: the trips that match nothing, and the reach. */
function travelLines(st, short) {
  const t = st.travel, out = [];
  if (!t || !t.countries.length) return out;   // no travel tables in this checkout, or no real country yet (the starter placeholder XX): nothing to compare
  const n = t.noRow.length, w = st.unitWord;
  const where = t.countries.length > 8 ? `${t.countries.slice(0, 8).join(', ')} and ${t.countries.length - 8} more countries` : t.countries.join(', ');
  out.push(`TRAVEL (while travelling only a row's travel id counts): ${t.cities} travel cities in ${where}: ${t.withRow} have a row${t.drawnByWorld ? ` (${t.drawnByWorld} of them drawn by the world pack for a traveller)` : ''}, ${n} have none${n ? ' (a trip there plays nothing; an anchor row of the right ' + w + ' is enough to fix it)' : ''}`);
  if (n && !short) {
    for (const c of t.noRow.slice(0, TRAVEL_SHOWN)) out.push(`    ${pad(c.id, 26)} ${pad(c.name, 22)} ${lpad(c.km == null ? '-' : c.km + ' km', 8)} from ${pad(c.unit || '?', 3)}   ${c.row}`);
    if (n > TRAVEL_SHOWN) out.push(`    ... and ${n - TRAVEL_SHOWN} more (--json lists all, most populous first)`);
  }
  const r = t.reach;
  if (r.farthest) out.push(`REACH: unitKm ${r.unitKm}; the farthest travel city from its nearest row is ${r.farthest.name} (${r.farthest.id}) at ${r.farthest.km} km${r.beyond.length ? `; ${r.beyond.length} lie beyond unitKm (a home position there is in no ${w})${short ? '' : ': ' + r.beyond.slice(0, 6).map(b => `${b.name} ${b.km} km`).join(', ') + (r.beyond.length > 6 ? ', ...' : '')}` : ': every travel city is within reach'}`);
  return out;
}

function printRegion(out, st, { short }) {
  const t = st.totals, w = st.unitWord;
  out(`anim-pack status: region "${st.region}" (${st.name}): ${t.units} ${t.units === 1 ? w : plural(w)} that open, ${t.big} big and ${t.small} small places, ${st.groups.length} group${st.groups.length === 1 ? '' : 's'}`
    + (st.elsewhere.length ? `; art elsewhere: ${st.elsewhere.join(', ')}` : '') + `; config says complete: ${st.declared ? 'true (the coverage tests fail hard)' : 'false (the coverage tests are todo)'}`);
  out(`  scenes   ${t.scenes} of ${t.scenesNeeded} full-screen scenes   (${t.units} ${w} signatures + ${t.big} big places)`);
  out(`  elements ${t.elements} of ${t.elementsNeeded} small elements        (${t.units} ${w} elements + ${t.small} small places)`);
  out(`  bytes    ${kb(t.bytes)} rendered: scenes ${kb(t.sceneBytes)}, small ${kb(t.smallBytes)}`);
  if (st.standard) out(`  ${standardLine(st.standard)}`);
  if (!short) {
    for (const g of st.groups) {
      out('');
      out(`GROUP ${g.group}  (pack ${g.packId}: scenes ${g.counts.scenes}/${g.counts.scenesNeeded}, elements ${g.counts.elements}/${g.counts.elementsNeeded})`);
      if (g.units.length) out(`  ${pad(w, 8)} ${pad('name', 28)} ${pad('signature (full screen)', 24)} element (symbol)`);
      for (const u of g.units) out(`  ${pad(u.code, 8)} ${pad(u.name, 28)} ${pad(mark(u.signature), 24)} ${mark(u.element)}`);
      for (const b of g.big) out(`  big place   ${pad(b.id, 22)} ${pad(`${b.name} (${b.unit})`, 30)} scene   ${mark(b.item)}`);
      for (const b of g.small) out(`  small place ${pad(b.id, 22)} ${pad(`${b.name} (${b.unit})`, 30)} element ${mark(b.item)}`);
    }
  }
  out('');
  out(`PACKS${st.lint.ran ? '' : '  (lint skipped: --no-lint)'}`);
  const sp = (st.standard && st.standard.packs) || {}, tcols = (p) => { const c = sp[p] || {}; return ` ${lpad(c.gold || 0, 5)} ${lpad(c.upgrading || 0, 5)} ${lpad((c.legacy || 0) + (c.rich || 0) + (c.composed || 0), 6)}`; };
  out(`${pad('pack', 24)} ${lpad('scenes', 6)} ${lpad('small', 6)} ${lpad('bytes', 10)} ${lpad('largest scene', 14)}${st.lint.ran ? ` ${lpad('pass', 5)} ${lpad('FAIL', 5)} ${lpad('waived', 6)}` : ''} ${lpad('gold', 5)} ${lpad('upgr', 5)} ${lpad('legacy', 6)}`);
  for (const p of st.packs) out(`${pad(p.pack, 24)} ${lpad(p.scenes, 6)} ${lpad(p.small, 6)} ${lpad(kb(p.sceneBytes + p.smallBytes), 10)} ${lpad(p.largestScene.ref ? kb(p.largestScene.bytes) : '-', 14)}${p.lint ? ` ${lpad(p.lint.pass, 5)} ${lpad(p.lint.fail, 5)} ${lpad(p.lint.waived, 6)}` : ''}${tcols(p.pack)}`);
  if (!st.packs.length) out('  (no pack of this region has registered an item yet)');
  for (const p of st.packs) {
    if (!p.lint) continue;
    for (const f of p.lint.failing) out(`  FAIL ${f.ref}: ${f.rules.slice(0, 6).join(', ')}${f.rules.length > 6 ? `, ... (${f.rules.length} rules)` : ''}   (node tools/anim-pack.mjs lint --ref ${f.ref})`);
    for (const c of p.lint.cssFailures) out(`  FAIL pack ${p.pack} css ${c}`);
  }
  if (st.lint.stale.length) out(`  note: ${st.lint.stale.length} waiver(s) no longer needed: ${st.lint.stale.map(x => x.ref + ' ' + x.rule).join('; ')}`);
  const sections = [];
  if (st.missing.length) {
    sections.push(`MISSING (${st.missing.length}):`);
    for (const g of st.groups) {
      const mine = st.missing.filter(m => m.group === g.group);
      if (!mine.length) continue;
      sections.push(`  group ${g.group}: ${mine.filter(m => m.need === 'scene').length} scene(s), ${mine.filter(m => m.need === 'element').length} element(s)`);
      for (const m of mine) sections.push(`    ${pad(m.need, 8)} ${pad(m.key, 24)} ${m.name}${m.state === 'small' ? '   (' + m.why + ')' : ''}`);
    }
  }
  if (st.orphans.length) { sections.push(`ORPHAN SCENES (${st.orphans.length}):`); for (const o of st.orphans) sections.push(`    ${o.key}: ${o.why}`); }
  if (st.problems.length) { sections.push(`TABLE PROBLEMS (${st.problems.length}, from region.check):`); for (const p of st.problems) sections.push(`    ${p}`); }
  if (st.overlaps.length) { sections.push(`OVERLAP WITH OTHER REGIONS (${st.overlaps.length}): rows inside another region's reach, the border cases where the neighbour wins`); for (const o of st.overlaps) sections.push(`    ${o}`); }
  if (st.duplicates.length) { sections.push(`DUPLICATE SCENE KEYS (${st.duplicates.length}): the last registration wins and silently hides the others`); for (const d of st.duplicates) sections.push(`    ${d.key}: registered ${d.count} times${d.files.length ? ', in ' + d.files.join(', ') : ''}: keep one`); }
  const exampleRows = st.starter.filter(x => /^example-/.test(x)), starterNotes = st.starter.filter(x => !/^example-/.test(x));
  if (exampleRows.length) sections.push(`STARTER DATA still in the tables (${exampleRows.join(', ')}): replace the example rows of src/app/71-anim-region-${st.region}.js with the real units and places`);
  for (const n of starterNotes) sections.push(`STARTER DATA: ${n}`);
  const trips = travelLines(st, short);
  if (trips.length) sections.push(...trips);
  if (sections.length) { out(''); sections.forEach(s => out(s)); }
  out('');
  if (st.complete) out(`COMPLETE: every ${w} and place has its art${st.lint.ran ? ', every item passes the lint' : ' (lint not run)'}.${st.declared ? '' : ` The config still says complete: false: run \`node tools/anim-pack.mjs status ${st.region} --declare-complete\` so that the coverage tests fail hard from now on.`}`);
  else {
    const next = [];
    if (st.starter.length || st.problems.length) next.push('fix the tables');
    if (st.overlaps.length) next.push('resolve the overlaps (move or drop the row, or lower a unitKm)');
    if (st.duplicates.length) next.push(`remove the duplicate scene keys (${st.duplicates.map(d => d.key).join(', ')})`);
    if (st.lint.failing) next.push(`node tools/anim-pack.mjs lint --pack ${st.packs.filter(p => p.lint && (p.lint.fail || p.lint.cssFailures.length)).map(p => p.pack).join(' --pack ')}`);
    if (st.missing.some(m => m.need === 'scene')) next.push(`node tools/anim-pack.mjs brief ${st.region} --kind scene`);
    if (st.missing.some(m => m.need === 'element')) next.push(`node tools/anim-pack.mjs brief ${st.region} --kind element`);
    out(`INCOMPLETE: ${st.missing.length} missing, ${st.orphans.length} orphan scene(s), ${st.problems.length} table problem(s)${st.overlaps.length ? `, ${st.overlaps.length} overlap(s)` : ''}${st.duplicates.length ? `, ${st.duplicates.length} duplicate scene key(s)` : ''}, ${st.lint.failing} lint failure(s)${st.starter.length ? ', starter data present' : ''}.${next.length ? ' Next: ' + next.join('; ') + '.' : ''}${st.declared ? ' The config says complete: true, so the coverage tests of the region fail until this is fixed.' : ''}`);
  }
}

/** Set `complete: true` in a region's config file. Returns {changed, file, why}: the config's own line is `  complete: false,` (what `new` writes); a legacy config with no such line is already complete by default. */
export function declareComplete(root, region) {
  const file = configFileOf(root, region.id), path = join(root, file);
  if (region.complete) return { changed: false, file, why: 'the region already says complete: true (or sets no flag: the default is true)' };
  const text = readFileSync(path, 'utf8'), re = /^(\s*complete\s*:\s*)false(\s*,)/m;
  if (!re.test(text)) throw new Error(`${file} has no \`complete: false,\` line to flip: set \`complete: true\` in its animRegionDefine({...}) call by hand`);
  writeFileSync(path, text.replace(re, '$1true$2'));
  return { changed: true, file, why: '' };
}

export default {
  summary: 'coverage of a region: units, places, MISSING, bytes, lint per pack, overlaps, trips with no row, reach (exit 2 under --strict; --declare-complete sets complete: true)',
  usage: 'status [<region>] [--json] [--strict] [--short] [--no-lint] [--declare-complete] [--standard] [--all]',
  positionals: '<region>',
  options: {
    json: { type: 'boolean', help: 'machine-readable output' },
    strict: { type: 'boolean', help: 'exit 2 when anything is missing, orphaned, wrong in the tables, overlapping another region, failing the lint, or still starter data; also when everything is done but the config still says complete: false (so the flag is never forgotten)' },
    short: { type: 'boolean', help: 'totals, packs and the missing lists only (no row per unit and place)' },
    'no-lint': { type: 'boolean', help: 'skip the lint (faster; the lint columns and the lint part of --strict are left out)' },
    standard: { type: 'boolean', help: 'list every scene below the new standard (not gold) with its tier and suggested archetype, grouped by archetype: the upgrade worklist (docs/dev/SCENE_ENGINE.md 15.3)' },
    all: { type: 'boolean', help: 'the tier table (gold, composed, upgrading, rich, legacy) for EVERY pack, regions or not (UK, Texas, world, the demo)' },
    'declare-complete': { type: 'boolean', help: 'when --strict would pass: set `complete: true` in the region\'s config (the generated test, the "every region" tests and the pack-registration test then fail hard on any missing art); refuses, exit 2, when anything is missing. Needs the lint (no --no-lint)' },
  },
  notes: [
    'complete: false (what `new` writes) keeps the repo green while a region is drawn: its coverage tests are todo, its structural tests (sound tables, no overlap, no dead art, the lookups) always fail hard.',
    'TRAVEL lists the travel cities of the region\'s countries that have no row (a trip there matches nothing) with the nearest row and a line to paste; REACH is how far the farthest travel city is from its nearest row, against unitKm. Both are advice, not part of --strict.',
  ],
  run(args, ctx) {
    if (ctx.positionals.length > 1) throw new Error(`status takes one region, got ${ctx.positionals.length} (${ctx.positionals.join(', ')}): run it once per region, or without a region to list them all`);
    if (args['declare-complete'] && args['no-lint']) throw new Error('--declare-complete needs the lint: a region is complete only when every item passes it (drop --no-lint)');
    const reg = loadRegistry(ctx.root, { fresh: true });
    const id = ctx.positionals[0];
    if (args.all) {
      const thresholds = loadThresholds(ctx.root), sd = standardBlock(reg, reg.items(), thresholds, null);
      if (args.json) { ctx.out(JSON.stringify({ standard: sd }, null, 1)); return 0; }
      ctx.out('anim-pack status --all: the new standard (docs/dev/SCENE_ENGINE.md section 15) for every pack');
      ctx.out(`${pad('pack', 46)} ${TIERS.map(t => lpad(t, 9)).join(' ')}`);
      for (const [p, c] of Object.entries(sd.packs).sort()) ctx.out(`${pad(p, 46)} ${TIERS.map(t => lpad(c[t] || '-', 9)).join(' ')}`);
      ctx.out(`${pad('total', 46)} ${TIERS.map(t => lpad(sd[t], 9)).join(' ')}`);
      ctx.out('');
      ctx.out(standardLine(sd));
      if (args.standard) printWorklist(ctx.out, sd);
      return 0;
    }
    if (!id) {
      if (args['declare-complete']) throw new Error('--declare-complete needs a region: node tools/anim-pack.mjs status <region> --declare-complete');
      // no region: one line per region
      const rows = regions(reg).map(r => { const st = regionCoverage(reg, r, null); return { id: r.id, name: r.name, unitWord: r.unitWord, groups: r.groups.length, units: st.totals.units, big: st.totals.big, small: st.totals.small, scenes: `${st.totals.scenes}/${st.totals.scenesNeeded}`, elements: `${st.totals.elements}/${st.totals.elementsNeeded}`, missing: st.missing.length, declared: st.declared, complete: st.complete }; });
      if (args.json) { ctx.out(JSON.stringify({ regions: rows }, null, 1)); return 0; }
      ctx.out('regions (node tools/anim-pack.mjs status <region> for the detail):');
      for (const r of rows) ctx.out(`  ${pad(r.id, 10)} ${pad(r.name, 18)} ${lpad(r.units, 3)} ${plural(r.unitWord)}, ${lpad(r.big, 3)} big and ${lpad(r.small, 3)} small places   scenes ${pad(r.scenes, 8)} elements ${pad(r.elements, 8)} ${r.complete ? (r.declared ? 'complete' : 'complete, not declared (status ' + r.id + ' --declare-complete)') : `${r.missing} missing${r.declared ? '' : ', being drawn (complete: false)'}`}`);
      if (!rows.length) ctx.out('  (none)');
      return 0;
    }
    const region = findRegion(reg, id);
    const st = statusOf(reg, region, loadThresholds(ctx.root), { lint: !args['no-lint'] });
    let declared = null;
    if (args['declare-complete']) {
      if (!st.complete) {
        if (args.json) ctx.out(JSON.stringify({ ...st, declare: { ok: false } }, null, 1)); else { printRegion(ctx.out, st, { short: !!args.short }); ctx.out(`\nNOT DECLARED: ${st.region} is not complete (see above): nothing was changed. Fix it, run \`node tools/anim-pack.mjs status ${st.region} --strict\` until it exits 0, then declare.`); }
        return 2;
      }
      declared = declareComplete(ctx.root, region);
      st.declared = st.declared || declared.changed;
    }
    if (args.json) ctx.out(JSON.stringify(declared ? { ...st, declare: { ok: true, ...declared } } : st, null, 1));
    else {
      printRegion(ctx.out, st, { short: !!args.short });
      if (args.standard) printWorklist(ctx.out, st.standard);
      if (declared) ctx.out(declared.changed ? `\nDECLARED: set complete: true in ${declared.file}. The coverage tests of tests/${st.region}-pack.test.mjs, tests/region-framework.test.mjs and tests/anim-packs.test.mjs now fail hard. Run npm test.` : `\nNothing to change: ${declared.why}.`);
    }
    if (args.strict && !st.complete) return 2;
    if (args.strict && !st.declared) {
      if (!args.json) ctx.out(`\nSTRICT: everything is drawn and lint-clean, but ${configFileOf(ctx.root, st.region)} still says complete: false, so the coverage tests are only todo. Run \`node tools/anim-pack.mjs status ${st.region} --declare-complete\`.`);
      return 2;
    }
    return 0;
  },
};
