// node tools/anim-pack.mjs status [<region>] [--json] [--strict] [--short] [--no-lint]
// Coverage of a region (a config made with animRegionDefine, src/app/71-anim-0region.js): per group the units with their signature
// (a full-screen scene) and element (a small symbol), the big places with their full-screen scene, the small places with their element,
// what is MISSING, the bytes, and the lint result per pack. Exit 2 under --strict when anything is missing or failing.
import { loadRegistry } from '../anim-render.mjs';
import { lintRegistry, loadThresholds } from '../../anim-pack.mjs';
import { regions, findRegion, regionCoverage, kb, plural } from '../anim-region.mjs';

const pad = (s, n) => String(s).padEnd(n);
const lpad = (s, n) => String(s).padStart(n);
const mark = (x) => (x.state === 'ok' ? `ok ${lpad(kb(x.bytes), 8)}` : x.state === 'small' ? 'NOT FULL SCREEN' : 'MISSING');

/** The coverage of one region as the command computes it (exported for the tests and other tools). */
export function statusOf(reg, region, thresholds, { lint = true } = {}) {
  let res = null;
  if (lint) res = lintRegistry(reg, thresholds, reg.items().filter(e => region.owns(e.pack)));
  return regionCoverage(reg, region, res);
}

function printRegion(out, st, { short }) {
  const t = st.totals, w = st.unitWord;
  out(`anim-pack status: region "${st.region}" (${st.name}): ${t.units} ${t.units === 1 ? w : plural(w)} that open, ${t.big} big and ${t.small} small places, ${st.groups.length} group${st.groups.length === 1 ? '' : 's'}`
    + (st.elsewhere.length ? `; art elsewhere: ${st.elsewhere.join(', ')}` : ''));
  out(`  scenes   ${t.scenes} of ${t.scenesNeeded} full-screen scenes   (${t.units} ${w} signatures + ${t.big} big places)`);
  out(`  elements ${t.elements} of ${t.elementsNeeded} small elements        (${t.units} ${w} elements + ${t.small} small places)`);
  out(`  bytes    ${kb(t.bytes)} rendered: scenes ${kb(t.sceneBytes)}, small ${kb(t.smallBytes)}`);
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
  out(`${pad('pack', 24)} ${lpad('scenes', 6)} ${lpad('small', 6)} ${lpad('bytes', 10)} ${lpad('largest scene', 14)}${st.lint.ran ? ` ${lpad('pass', 5)} ${lpad('FAIL', 5)} ${lpad('waived', 6)}` : ''}`);
  for (const p of st.packs) out(`${pad(p.pack, 24)} ${lpad(p.scenes, 6)} ${lpad(p.small, 6)} ${lpad(kb(p.sceneBytes + p.smallBytes), 10)} ${lpad(p.largestScene.ref ? kb(p.largestScene.bytes) : '-', 14)}${p.lint ? ` ${lpad(p.lint.pass, 5)} ${lpad(p.lint.fail, 5)} ${lpad(p.lint.waived, 6)}` : ''}`);
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
  if (st.duplicates.length) { sections.push(`DUPLICATE SCENE KEYS (${st.duplicates.length}): the last registration wins and silently hides the others`); for (const d of st.duplicates) sections.push(`    ${d.key}: registered ${d.count} times${d.files.length ? ', in ' + d.files.join(', ') : ''}: keep one`); }
  const exampleRows = st.starter.filter(x => /^example-/.test(x)), starterNotes = st.starter.filter(x => !/^example-/.test(x));
  if (exampleRows.length) sections.push(`STARTER DATA still in the tables (${exampleRows.join(', ')}): replace the example rows of src/app/71-anim-region-${st.region}.js with the real units and places`);
  for (const n of starterNotes) sections.push(`STARTER DATA: ${n}`);
  if (sections.length) { out(''); sections.forEach(s => out(s)); }
  out('');
  if (st.complete) out(`COMPLETE: every ${w} and place has its art${st.lint.ran ? ', every item passes the lint' : ' (lint not run)'}.`);
  else {
    const next = [];
    if (st.starter.length || st.problems.length) next.push('fix the tables');
    if (st.duplicates.length) next.push(`remove the duplicate scene keys (${st.duplicates.map(d => d.key).join(', ')})`);
    if (st.lint.failing) next.push(`node tools/anim-pack.mjs lint --pack ${st.packs.filter(p => p.lint && (p.lint.fail || p.lint.cssFailures.length)).map(p => p.pack).join(' --pack ')}`);
    if (st.missing.some(m => m.need === 'scene')) next.push(`node tools/anim-pack.mjs brief ${st.region} --kind scene`);
    if (st.missing.some(m => m.need === 'element')) next.push(`node tools/anim-pack.mjs brief ${st.region} --kind element`);
    out(`INCOMPLETE: ${st.missing.length} missing, ${st.orphans.length} orphan scene(s), ${st.problems.length} table problem(s)${st.duplicates.length ? `, ${st.duplicates.length} duplicate scene key(s)` : ''}, ${st.lint.failing} lint failure(s)${st.starter.length ? ', starter data present' : ''}.${next.length ? ' Next: ' + next.join('; ') + '.' : ''}`);
  }
}

export default {
  summary: 'coverage of a region: units, big and small places, what is MISSING, bytes, lint per pack (exit 2 under --strict)',
  usage: 'status [<region>] [--json] [--strict] [--short] [--no-lint]',
  positionals: '<region>',
  options: {
    json: { type: 'boolean', help: 'machine-readable output' },
    strict: { type: 'boolean', help: 'exit 2 when anything is missing, orphaned, wrong in the tables, failing the lint, or still starter data' },
    short: { type: 'boolean', help: 'totals, packs and the missing lists only (no row per unit and place)' },
    'no-lint': { type: 'boolean', help: 'skip the lint (faster; the lint columns and the lint part of --strict are left out)' },
  },
  run(args, ctx) {
    if (ctx.positionals.length > 1) throw new Error(`status takes one region, got ${ctx.positionals.length} (${ctx.positionals.join(', ')}): run it once per region, or without a region to list them all`);
    const reg = loadRegistry(ctx.root, { fresh: true });
    const id = ctx.positionals[0];
    if (!id) {
      // no region: one line per region
      const rows = regions(reg).map(r => { const st = regionCoverage(reg, r, null); return { id: r.id, name: r.name, unitWord: r.unitWord, groups: r.groups.length, units: st.totals.units, big: st.totals.big, small: st.totals.small, scenes: `${st.totals.scenes}/${st.totals.scenesNeeded}`, elements: `${st.totals.elements}/${st.totals.elementsNeeded}`, missing: st.missing.length, complete: !st.missing.length && !st.orphans.length && !st.problems.length && !st.duplicates.length && !st.starter.length }; });
      if (args.json) { ctx.out(JSON.stringify({ regions: rows }, null, 1)); return 0; }
      ctx.out('regions (node tools/anim-pack.mjs status <region> for the detail):');
      for (const r of rows) ctx.out(`  ${pad(r.id, 10)} ${pad(r.name, 18)} ${lpad(r.units, 3)} ${plural(r.unitWord)}, ${lpad(r.big, 3)} big and ${lpad(r.small, 3)} small places   scenes ${pad(r.scenes, 8)} elements ${pad(r.elements, 8)} ${r.complete ? 'complete' : `${r.missing} missing`}`);
      if (!rows.length) ctx.out('  (none)');
      return 0;
    }
    const region = findRegion(reg, id);
    const st = statusOf(reg, region, loadThresholds(ctx.root), { lint: !args['no-lint'] });
    if (args.json) ctx.out(JSON.stringify(st, null, 1));
    else printRegion(ctx.out, st, { short: !!args.short });
    return args.strict && !st.complete ? 2 : 0;
  },
};
