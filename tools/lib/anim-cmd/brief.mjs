// node tools/anim-pack.mjs brief <region> --kind scene|element [--batch N --of M] [--group g] [--out dir] [--note text] [--json]
// Ready-to-paste task briefs for the agents that draw a region: made from tools/lib/anim-templates/scene-brief.md and element-brief.md
// ({{placeholders}}, listed in docs/dev/ANIMATION_PACKS.md), filled with the region's facts, the exact keys of the batch, the file the agent
// owns, the exact verify commands and the cultural care rules. Scene batches are consecutive slices of the region's scene keys in group order
// (about 11 per agent; --of M overrides); element batches are whole groups (a pack file has one owner).
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { loadRegistry } from '../anim-render.mjs';
import { loadReference } from '../../anim-pack.mjs';
import { findRegion, regionNeeds, regionCoverage, planBatches, readTemplate, renderTemplate, careFor, plural, SCENES_PER_AGENT } from '../anim-region.mjs';

const KINDS = ['scene', 'element'];
const SKILL = '.claude/skills/animation-pack/SKILL.md';

/** The scene file the agent of batch n owns (with a group filter the group is in the name, so two filtered plans never share a file). */
export const sceneFileOf = (id, n, group) => `src/app/71-anim-region-${id}-scenes-${group ? group + '-' : ''}${n}.js`;
/** The pack file of a group. */
export const packFileOf = (id, group) => `src/app/72-anim-pack-${id}-${group}.js`;
/** The file a region's config lives in: the scaffold's name, or the legacy name of the US and Asia. */
export function configFileOf(root, id) {
  for (const f of [`src/app/71-anim-region-${id}.js`, `src/app/71-anim-${id}.js`]) if (existsSync(join(root, f))) return f;
  return `src/app/71-anim-region-${id}.js`;
}

function toInt(v, name) {
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Error(`--${name} must be a whole number of 1 or more, got "${v}"`);
  return n;
}

/** Split whole groups over `of` consecutive batches, balanced by their item counts. Never more batches than groups. */
function groupBatches(groups, of) {
  const m = Math.max(1, Math.min(groups.length, of || groups.length));
  if (m >= groups.length) return groups.map(g => [g]);
  const total = groups.reduce((n, g) => n + g.items.length, 0), cum = []; let run = 0;
  for (const g of groups) { run += g.items.length; cum.push(run); }
  const cuts = [];
  for (let i = 1; i < m; i++) {
    const want = (i * total) / m, lo = (cuts[cuts.length - 1] || 0) + 1, hi = groups.length - (m - i);
    let best = lo;
    for (let c = lo; c <= hi; c++) if (Math.abs(cum[c - 1] - want) < Math.abs(cum[best - 1] - want)) best = c;
    cuts.push(best);
  }
  const out = []; let from = 0;
  for (const c of [...cuts, groups.length]) { out.push(groups.slice(from, c)); from = c; }
  return out;
}

/** The plan: which agent draws what. Pure (no output). */
export function buildPlan(reg, region, { kind, of = 0, batch = 0, group = '' }) {
  if (group && !region.groups.includes(group)) throw new Error(`--group "${group}" is not a group of ${region.id} (groups: ${region.groups.join(', ')})`);
  const needs = regionNeeds(region), cov = regionCoverage(reg, region, null);
  const doneScene = (k) => !!(region.scenes[k.key] || (k.kind === 'unit' && region.scenes['unit:' + k.ref]));   // 'unit:<CODE>' also works as a key
  let batches;
  if (kind === 'scene') {
    const keys = needs.keys.filter(k => !group || k.group === group).map(k => ({ ...k, need: 'scene', state: doneScene(k) ? 'done' : 'draw' }));
    const parts = planBatches(keys, { of, size: SCENES_PER_AGENT, groupOf: (k) => k.group });
    batches = parts.map((items, i) => ({ n: i + 1, files: [sceneFileOf(region.id, i + 1, group)], groups: [...new Set(items.map(k => k.group))], items }));
  } else {
    const rows = cov.groups.filter(g => !group || g.group === group).map(g => {
      const items = [
        ...g.units.map(u => ({ need: 'element', call: 'B.element', code: u.code, id: u.code, key: u.key, name: u.name, unit: u.code, unitName: u.name, group: g.group, state: u.element.state === 'ok' ? 'done' : 'draw' })),
        ...g.small.map(b => ({ need: 'element', call: 'B.place', id: b.id, key: b.key, name: b.name, unit: b.unit, unitName: b.unitName, group: g.group, state: b.item.state === 'ok' ? 'done' : 'draw' })),
      ];
      return { group: g.group, items };
    }).filter(g => g.items.length);
    batches = groupBatches(rows, of).map((gs, i) => ({ n: i + 1, files: gs.map(g => packFileOf(region.id, g.group)), groups: gs.map(g => g.group), items: gs.flatMap(g => g.items) }));
  }
  for (const b of batches) { b.count = b.items.length; b.todo = b.items.filter(x => x.state === 'draw').length; }
  if (batch && (batch < 1 || batch > batches.length)) throw new Error(`--batch ${batch} is out of range: this plan has ${batches.length} batch${batches.length === 1 ? '' : 'es'} (add --of M to change the number)`);
  return { region: region.id, kind, group: group || null, of: batches.length, size: kind === 'scene' ? SCENES_PER_AGENT : null, total: batches.reduce((n, b) => n + b.count, 0), batches };
}

const mdCell = (s) => String(s).replace(/\|/g, '/');
function keyTable(region, b, kind) {
  const word = region.unitWord;
  if (kind === 'scene') {
    const lines = ['| # | key | what to draw | group | status |', '| --- | --- | --- | --- | --- |'];
    b.items.forEach((k, i) => lines.push(`| ${i + 1} | \`${k.key}\` | ${k.kind === 'unit' ? `${mdCell(k.name)}: the ${word}'s signature` : `${mdCell(k.name)} (${mdCell(k.unitName)}): big city, at ${k.lat}, ${k.lon}`} | ${k.group} | ${k.state} |`));
    return lines.join('\n');
  }
  const lines = ['| # | file | call | what it is | status |', '| --- | --- | --- | --- | --- |'];
  b.items.forEach((k, i) => lines.push(`| ${i + 1} | \`${basename(packFileOf(region.id, k.group))}\` | \`${k.call}('${k.id}', { id, label, colour, mood, tags, svg })\` | ${k.call === 'B.element' ? `${mdCell(k.name)}: the ${word}'s symbol` : `${mdCell(k.name)} (${mdCell(k.unitName)}): a small place's symbol`} | ${k.state} |`));
  return lines.join('\n');
}

function groupsSummary(region, needs) {
  const w = plural(region.unitWord);
  return `${needs.groups.length} group${needs.groups.length === 1 ? '' : 's'}: ` + needs.groups.map(g => `${g.group} (${g.units.length} ${g.units.length === 1 ? region.unitWord : w}, ${g.big.length} big and ${g.small.length} small place${g.big.length + g.small.length === 1 ? '' : 's'})`).join(', ');
}
function batchGroups(b) {
  const counts = new Map();
  for (const it of b.items) counts.set(it.group, (counts.get(it.group) || 0) + 1);
  return [...counts].map(([g, n]) => `group \`${g}\` (${n} ${n === 1 ? 'key' : 'keys'})`).join(', ');
}
function existingList(reg, region, kind) {
  let lines;
  if (kind === 'scene') lines = Object.entries(region.scenes).map(([k, e]) => `- \`${k}\`: ${e.label}${e.site ? ' (' + e.site + ')' : ''}`);
  else lines = reg.items().filter(e => region.owns(e.pack) && !e.full).map(e => `- \`${e.ref}\`: ${e.item.label}`);
  if (!lines.length) return '(none yet: you are the first)';
  return lines.length > 80 ? lines.slice(0, 80).join('\n') + `\n- ... and ${lines.length - 80} more` : lines.join('\n');
}
function exemplarLines(list, sourceLabel = true) {
  return list.map(x => `- \`${x.ref}\`${x.tags && x.tags.length ? `  [${x.tags.join(', ')}]` : ''}${sourceLabel && x.source ? `\n    read: ${x.source}` : ''}`).join('\n');
}
function weakerLines(list) {
  return list.map(x => `- \`${x.ref}\`: ${String(x.wrong || '').replace(/\s+/g, ' ').slice(0, 220)}`).join('\n');
}
function verifyBlock(kind, files, regionId) {
  const lines = [];
  lines.push('# once, before you draw: render the gold standard and open the PNGs in .anim-ref/', 'node tools/anim-pack.mjs reference --render');
  lines.push(kind === 'scene' ? 'node tools/anim-pack.mjs reference --render --mode night' : 'node tools/anim-pack.mjs reference --render --mode dark');
  const only = kind === 'element' ? ' --only small' : '';   // a pack file also carries the scenes the scene agents are drawing: judge only the elements
  for (const f of files) {
    const stem = basename(f).replace(/\.js$/, ''), dark = kind === 'scene' ? 'night' : 'dark';
    lines.push('', `# ${f}`, `node --check ${f}`,
      '# the lint must end with PASS: no waiver, no threshold edit (--rules prints every rule)',
      `node tools/anim-pack.mjs lint --file ${f}${only}`,
      `# render light and ${dark}, then OPEN the PNGs and compare each with its nearest exemplar`,
      `node tools/anim-pack.mjs sheet --file ${f}${only} --mode light --out .anim-ref/${stem} --contact`,
      `node tools/anim-pack.mjs sheet --file ${f}${only} --mode ${dark} --out .anim-ref/${stem} --contact`);
  }
  lines.push('', '# the whole region, when everything is in: what is still missing and how every pack lints', `node tools/anim-pack.mjs status ${regionId}`);
  return '```bash\n' + lines.join('\n') + '\n```';
}

/** The brief of one batch, as markdown. */
export function renderBrief(reg, region, plan, b, { root, notes = [] }) {
  const needs = regionNeeds(region), ref = loadReference(root), kind = plan.kind;
  const name = kind === 'scene' ? 'scene-brief.md' : 'element-brief.md';
  const verify = verifyBlock(kind, b.files, region.id);
  const files = b.files.map(f => `- \`${f}\`${existsSync(join(root, f)) ? '' : '  (does not exist yet: create it with the pattern of the scaffold: `const B = <REGION>.builder(\'<group>\'); B.scenes(); ...; animRegisterPack(B.pack({ id: \'' + region.id + '-<group>\', name, description }))`)'}`).join('\n');
  const doneN = b.count - b.todo;
  const vars = {
    region_id: region.id, region_name: region.name, over: region.over, unit_word: region.unitWord, unit_word_plural: plural(region.unitWord),
    groups_summary: groupsSummary(region, needs), batch: b.n, batches: plan.of, count: b.count, todo_count: b.todo, batch_groups: batchGroups(b),
    file: b.files[0], files, keys: keyTable(region, b, kind),
    done_note: doneN ? `\n${doneN} of these already ${kind === 'scene' ? 'have a scene' : 'have an element'} (status \`done\`): leave ${doneN === 1 ? 'it' : 'them'} as ${doneN === 1 ? 'it is' : 'they are'} unless the orchestrator asks you to redraw ${doneN === 1 ? 'it' : 'them'}.\n` : '',
    existing: existingList(reg, region, kind),
    exemplars: exemplarLines(kind === 'scene' ? ref.scenes : [...ref.items, ...ref.scenes]),
    weaker: weakerLines(ref.weaker), care: careFor(root, region),
    notes: notes.length ? 'Extra instructions for this batch:\n\n' + notes.map(n => `- ${n}`).join('\n') + '\n' : '',
    verify, scene_cap: reg.limits.scene.toLocaleString('en-US'), item_cap: reg.limits.item.toLocaleString('en-US'),
    region_file: configFileOf(root, region.id), skill: SKILL,
  };
  return renderTemplate(readTemplate(name), vars, name).replace(/\n{3,}/g, '\n\n');
}

export default {
  summary: 'ready-to-paste task briefs for the agents that draw a region (batched scene briefs, per-group element briefs)',
  usage: 'brief <region> --kind scene|element [--batch N --of M] [--group <g>] [--out <dir>] [--note <text>] [--json]',
  positionals: '<region>',
  options: {
    kind: { type: 'string', help: 'scene (full-screen scenes, batches of about 11 keys) | element (small symbols, one batch per group) (required)' },
    batch: { type: 'string', help: 'print the brief of batch N (1-based); without it the plan is printed (and with --out every brief is written)' },
    of: { type: 'string', help: 'the number of batches (default: scenes ceil(keys / 11), elements one per group; elements never split a group)' },
    group: { type: 'string', help: 'only this group' },
    out: { type: 'string', help: 'write the brief(s) as <kind>-brief-<N>.md into this folder instead of printing them' },
    note: { type: 'string', multiple: true, help: 'an extra instruction added to every brief (repeatable)' },
    json: { type: 'boolean', help: 'machine-readable: the plan; with --batch also the brief as markdown' },
  },
  run(args, ctx) {
    const id = ctx.positionals[0];
    if (!id) throw new Error('brief needs a region: node tools/anim-pack.mjs brief <region> --kind scene|element');
    if (!KINDS.includes(args.kind)) throw new Error(`--kind must be one of ${KINDS.join(', ')}`);
    const reg = loadRegistry(ctx.root, { fresh: true });
    const region = findRegion(reg, id);
    const of = toInt(args.of, 'of'), batch = toInt(args.batch, 'batch'), notes = [].concat(args.note || []).map(s => String(s).trim()).filter(Boolean);
    const plan = buildPlan(reg, region, { kind: args.kind, of, batch, group: args.group || '' });
    if (!plan.batches.length) throw new Error(`nothing to brief: ${region.id} has no ${args.kind === 'scene' ? 'scene keys' : 'elements to draw'}${args.group ? ' in group ' + args.group : ''}`);
    if (args.kind === 'element' && of && of > plan.of) ctx.err(`note: --of ${of} is more than the ${plan.of} group(s): a pack file has one owner, so there are ${plan.of} batch(es)`);
    const chosen = batch ? [plan.batches[batch - 1]] : plan.batches;
    const written = [];
    const briefs = chosen.map(b => ({ b, md: (args.json && !batch && !args.out) ? null : renderBrief(reg, region, plan, b, { root: ctx.root, notes }) }));
    if (args.out) {
      const dir = resolve(args.out);
      mkdirSync(dir, { recursive: true });
      for (const { b, md } of briefs) { const f = join(dir, `${args.kind}-brief-${b.n}.md`); writeFileSync(f, md); written.push(f); }
    }
    if (args.json) {
      const slim = (b) => ({ batch: b.n, files: b.files, groups: b.groups, count: b.count, todo: b.todo, keys: b.items.map(k => ({ key: k.key, call: k.call || null, name: k.name, group: k.group, state: k.state })) });
      ctx.out(JSON.stringify({ region: plan.region, kind: plan.kind, group: plan.group, of: plan.of, size: plan.size, total: plan.total, written,
        batches: briefs.map(({ b, md }) => (batch ? { ...slim(b), markdown: md } : slim(b))) }, null, 1));
      return 0;
    }
    if (batch && !args.out) { ctx.out(briefs[0].md.replace(/\s+$/, '')); if (briefs[0].b.todo === 0) ctx.err('note: every key of this batch already has its art; the brief is for a redraw'); return 0; }
    if (written.length) written.forEach(f => ctx.out(f));
    const unit = args.kind === 'scene' ? 'scene key' : 'element';
    ctx.out(`brief ${args.kind}, region "${region.id}": ${plan.total} ${unit}${plan.total === 1 ? '' : 's'} in ${plan.of} batch${plan.of === 1 ? '' : 'es'}${args.kind === 'scene' ? ` (about ${SCENES_PER_AGENT} per agent; --of M changes it)` : ' (one per group; --of M merges groups)'}`);
    for (const b of plan.batches) ctx.out(`  batch ${String(b.n).padStart(2)}  ${String(b.count).padStart(3)} (${String(b.todo).padStart(3)} to draw)  ${b.groups.join(', ').padEnd(24)} ${b.files.join(', ')}`);
    if (!written.length) ctx.out(`\nPrint one: node tools/anim-pack.mjs brief ${region.id} --kind ${args.kind} --batch N${of ? ` --of ${of}` : ''}${args.group ? ` --group ${args.group}` : ''}\nWrite all: node tools/anim-pack.mjs brief ${region.id} --kind ${args.kind}${of ? ` --of ${of}` : ''}${args.group ? ` --group ${args.group}` : ''} --out .anim-ref/briefs`);
    return 0;
  },
};
