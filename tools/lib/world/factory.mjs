// The scene factory's fast loop (docs/dev/SCENE_FACTORY.md): brief -> archetype -> DRAFT spec (a scratch JSON, never src/app) ->
// review sheet (the draft at summer noon, autumn golden hour and winter night beside the archetype's gold at the same moments, with
// the gold-relative checks, the solver and fill drops and the load budget) -> accept (writes src/app/79-world-zscene-<slug>-1.js).
//
//   factoryDraft(E, archetype, brief)    -> draft { draft: 1, archetype, brief, meta, plan, notes, spec, validation }
//   factoryReview(chrome, E, draft, o)   -> { sheet, cells, checks, gold, ms }   o: { dir, root, goldDir (the gold renders are cached) }
//   draftSource(draft)                   -> { text, file, id }: the scene file (one line a thing, like the hand-made ones)
import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { archetypeSpec, ARCHETYPES } from './archetypes.mjs';
import { validateSpec } from './convert.mjs';
import { goldChecks, goldText } from './goldcheck.mjs';
import { renderWorlds, contactSheet, FACTORY_MOMENTS } from './contact.mjs';

export function factoryDraft(E, archetype, brief) {
  const r = archetypeSpec(archetype, brief, E);
  const v = validateSpec(r.spec, E);
  return { draft: 1, archetype: r.archetype.id, gold: r.archetype.gold, brief: r.brief, meta: r.meta, plan: r.plan, notes: r.notes, validation: { ok: v.ok, errors: v.errors.slice(0, 30).map(e => `${e.path}: ${e.msg}`) }, spec: r.spec };
}

/** The review sheet. The gold renders are cached in o.goldDir (re-drawn when the gold's scene file is newer). */
export async function factoryReview(chrome, E, draft, o = {}) {
  const t0 = Date.now(), A = ARCHETYPES[draft.archetype], keys = FACTORY_MOMENTS.map(m => m.key);
  // the renders first (the sky share is measured on the summer-noon PNG), then the checks
  let goldSpec = null;
  try { const hit = (E.packs && E.packs['world-test'] || []).find(i => i.id === A.gold); goldSpec = hit && E.worldHostSpec ? E.worldHostSpec(hit) : null; } catch { goldSpec = null; }
  const cells = await renderWorlds(chrome, [{ id: draft.meta.id, spec: draft.spec }], { dir: o.dir, moments: keys, root: o.root });
  let goldCells = [];
  if (goldSpec) {
    const src = o.root ? join(o.root, 'src', 'app', `79-world-zscene-${A.gold.replace(/-w3$/, '')}.js`) : null;
    goldCells = await renderWorlds(chrome, [{ id: A.gold, spec: goldSpec }], { dir: o.goldDir || o.dir, moments: keys, root: o.root, cache: true, since: src && existsSync(src) ? statSync(src).mtimeMs : 0 });
  }
  const tRender = Date.now() - t0, png = (cs) => (cs[0] && !cs[0].error ? cs[0].file : null);
  const gold = goldSpec ? goldChecks(E, goldSpec, { plan: A.goldPlan, checks: A.checks, skyPng: png(goldCells) }) : null;
  const checks = goldChecks(E, draft.spec, { plan: draft.plan, checks: A.checks, gold, skyPng: png(cells) });
  const tChecks = Date.now() - t0 - tRender;
  const cs = checks.checks, line = (c) => `${c.ok == null ? '--' : c.ok ? 'ok' : 'MISS'} ${c.label}: ${c.value}`;
  const B = checks.budget;
  const lines = [
    cs.slice(0, 5).map(line), cs.slice(5).map(line),
    [`budget: ${B.statics} statics, ${B.buildings} buildings`, `chunks ${B.chunks} (biggest ${B.biggestChunk == null ? '?' : Math.round(B.biggestChunk * 100) + ' %'}), ${B.live} live statics`, `${B.agents} agents, ${B.sprites} sprites, build ${B.buildMs} ms`,
      `solver/fill: ${Object.entries(checks.drops).map(([k, v]) => `${k} ${v}`).join(', ')}`, ...checks.dropped.slice(0, 4).map(d => 'drop ' + d)],
  ];
  const tiles = cells.map((c, i) => ({ file: c.error ? null : c.file, title: `DRAFT ${draft.meta.id} - ${FACTORY_MOMENTS[i].label}  ${checks.pass}/${checks.of}`, lines: c.error ? [c.error] : lines[i], cls: checks.pass === checks.of ? 'ok' : 'bad' }));
  for (const [i, c] of goldCells.entries()) tiles.push({ file: c.error ? null : c.file, title: `GOLD ${A.gold} - ${FACTORY_MOMENTS[i].label}${gold ? '  ' + gold.pass + '/' + gold.of : ''}`, cls: 'gold',
    lines: i === 0 && gold ? gold.checks.slice(0, 5).map(line) : i === 1 && gold ? gold.checks.slice(5).map(line) : i === 2 && gold ? [`budget: ${gold.budget.statics} statics, ${gold.budget.chunks} chunks (biggest ${Math.round((gold.budget.biggestChunk || 0) * 100)} %), ${gold.budget.agents} agents, build ${gold.budget.buildMs} ms`] : [] });
  const notes = [`archetype ${A.id}: ${A.summary}`, `brief: ${JSON.stringify(Object.fromEntries(Object.entries(draft.brief).filter(([k, v]) => v != null && !['slug'].includes(k))))}`]
    .concat(draft.validation.ok ? ['validate: ok'] : ['validate: ' + draft.validation.errors.length + ' error(s): ' + draft.validation.errors.slice(0, 4).join('; ')], draft.notes || []);
  mkdirSync(o.dir, { recursive: true });
  const sheet = join(o.dir, `${draft.meta.id}--review.png`);
  writeFileSync(sheet, await contactSheet(chrome, tiles, { title: `Review: ${draft.meta.label} (${A.id})`, sub: 'top: the draft; bottom: the archetype\'s gold at the same moments. Look first, then read the numbers.', cols: 3, thumb: 520, notes }));
  return { sheet, cells, goldCells, checks, gold, ms: Date.now() - t0, msChecks: tChecks, msRender: tRender };
}

/** The scene file of an accepted draft. */
export function draftSource(d) {
  const j = (v) => JSON.stringify(v), spec = d.spec, meta = Object.assign({}, d.meta);
  delete meta.archetype; delete meta.setting;
  const list = (arr, ind) => '[\n' + arr.map(x => ind + '  ' + j(x)).join(',\n') + '\n' + ind + ']';
  const L = [];
  const brief = Object.fromEntries(Object.entries(d.brief).filter(([k, v]) => v != null && v !== false && !['slug'].includes(k)));
  L.push(`/* ============================================================`);
  L.push(`   WORLD SCENE (format v3) world-test / ${meta.id}: ${String(d.meta.site || d.meta.label).replace(/\*\//g, '* /')}.`);
  L.push(`   Made by the scene factory: archetype '${d.archetype}' (tools/lib/world/archetypes.mjs; gold ${d.gold}), from the brief`);
  L.push(`     ${j(brief).replace(/\*\//g, '* /')}`);
  L.push(`   then reviewed on its sheet (summer noon, autumn golden hour, winter night beside the gold) and accepted with`);
  L.push(`   \`node tools/world.mjs accept <draft.json>\`. Edit the lists below by hand to improve it; docs/dev/SCENE_FACTORY.md.`);
  L.push(`   PURE. Registered in 'world-test'; it plays as an opening only once promoted (\`node tools/world.mjs promote ${meta.id}\`).`);
  L.push(`   ============================================================ */`);
  L.push('(function () {', "  if (typeof worldAdd !== 'function') return;", `  worldAdd('world-test', ${j(meta)}, {`);
  const keys = Object.keys(spec);
  for (const k of keys) {
    const v = spec[k];
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') L.push(`    ${k}: ${list(v, '    ')},`);
    else L.push(`    ${k}: ${j(v)},`);
  }
  L.push('  });', '})();');
  return { text: L.join('\n') + '\n', file: `79-world-zscene-${meta.id.replace(/-w3$/, '')}.js`, id: meta.id };
}
