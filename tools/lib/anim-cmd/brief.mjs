// node tools/anim-pack.mjs brief <region> --kind scene|element [--batch N --of M] [--group g] [--out dir] [--clean] [--note text] [--json]
// node tools/anim-pack.mjs brief <subject> --kind composed|upgrade|archetype|object [--batch N] [--out dir] [--note text] [--json]   (the new standard:
//   tools/lib/scene-briefs.mjs; the subject is a pack id, a region, an archetype id or a kit). Hand-drawn scene briefs are the LEGACY tier.
// Ready-to-paste task briefs for the agents that draw a region: made from tools/lib/anim-templates/scene-brief.md and element-brief.md
// ({{placeholders}}, listed in docs/dev/ANIMATION_PACKS.md), filled with the region's facts, the exact keys of the batch (each with a suggested time of day,
// season, scene type and palette, or motif kind and colour, from a rotation over the whole region so that parallel batches differ), the file the agent owns,
// the exact verify commands, the corpus targets (generated from tools/anim-quality.json and the measured exemplars: never typed), the pass mark and the
// cultural care rules. Scene batches are consecutive slices of the region's scene keys in group order (about 7 per agent; --of M overrides); element batches
// are whole groups (a pack file has one owner). --out writes the briefs and a plan.json index for the orchestrator, creates the empty scene file (the IIFE stub) of
// every scene batch that has none, stores the --note texts in plan.json (a re-run re-reads them, never drops them: --clear-notes starts afresh), and says whether the
// scaffold is COMMITTED (the agents must start from a committed tree and `guard` compares with a commit).
// The season column follows the key's latitude: `any` in the tropics, the local season (and the label to write) in the south, the same word in the north. The
// \`season:\` field of an entry is only a label (gallery card, "picked for ..." note): it does not decide when a region scene plays.
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { loadRegistry, CROPS } from '../anim-render.mjs';
import { loadReference, loadThresholds, measureRegistry, selectEntries } from '../../anim-pack.mjs';
import { TARGETS, allowedTagList, forbiddenTagList } from '../anim-quality.mjs';
import { findRegion, regionNeeds, regionCoverage, planBatches, readTemplate, renderTemplate, careFor, careInfo, varietyOf, suggestionsInfo, applySuggestions, plural, sceneFileOf, packFileOf, configFileOf, sceneStubText, SEASON_NOTE, SCENES_PER_AGENT, RUBRIC_PASS } from '../anim-region.mjs';
import { gitScaffoldState, GUARD_PROOF } from './guard.mjs';
import { sceneBriefPlan, SCENE_KINDS } from '../scene-briefs.mjs';
export { sceneFileOf, packFileOf, configFileOf };

const KINDS = ['scene', 'element'];
const SKILL = '.claude/skills/animation-pack/SKILL.md';
const REFS = '.claude/skills/animation-pack/references';

/** The brief file of batch n: `<kind>-brief[-<group>]-<n>.md` (the group is in the name when the plan is filtered, so two filtered plans never share a file name). */
export const briefFileOf = (kind, n, group) => `${kind}-brief${group ? '-' + group : ''}-${n}.md`;
const briefFileRe = (kind) => new RegExp(`^${kind}-brief(-[a-z][a-z0-9]*(?:-[a-z0-9]+)*)?-\\d+\\.md$`);

function toInt(v, name) {
  if (v == null) return 0;
  const n = Number(v);
  if (!String(v).trim() || !Number.isInteger(n) || n < 1) throw new Error(`--${name} must be a whole number of 1 or more, got "${v}"`);
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

/** The plan: which agent draws what. Pure (no output). Every key carries its suggested variety (time, season, type, palette / motif kind, colour). */
export function buildPlan(reg, region, { kind, of = 0, batch = 0, group = '' }) {
  if (group && !region.groups.includes(group)) throw new Error(`--group "${group}" is not a group of ${region.id} (groups: ${region.groups.join(', ')})`);
  const needs = regionNeeds(region), cov = regionCoverage(reg, region, null), variety = varietyOf(needs);
  const sugg = suggestionsInfo(reg.root, region), overrides = applySuggestions(variety, sugg, needs);   // the region doc's "Scene suggestions": per-key overrides of the rotation
  const doneScene = (k) => !!(region.scenes[k.key] || (k.kind === 'unit' && region.scenes['unit:' + k.ref]));   // 'unit:<CODE>' also works as a key
  let batches;
  if (kind === 'scene') {
    const keys = needs.keys.filter(k => !group || k.group === group).map(k => ({ ...k, need: 'scene', state: doneScene(k) ? 'done' : 'draw', ...variety.scene.get(k.key) }));
    const parts = planBatches(keys, { of, size: SCENES_PER_AGENT, groupOf: (k) => k.group });
    batches = parts.map((items, i) => ({ n: i + 1, files: [sceneFileOf(region.id, i + 1, group)], groups: [...new Set(items.map(k => k.group))], items }));
  } else {
    const rows = cov.groups.filter(g => !group || g.group === group).map(g => {
      const items = [
        ...g.units.map(u => ({ need: 'element', call: 'B.element', code: u.code, id: u.code, key: u.key, name: u.name, unit: u.code, unitName: u.name, group: g.group, state: u.element.state === 'ok' ? 'done' : 'draw', ...variety.element.get(u.key) })),
        ...g.small.map(b => ({ need: 'element', call: 'B.place', id: b.id, key: b.key, name: b.name, unit: b.unit, unitName: b.unitName, group: g.group, state: b.item.state === 'ok' ? 'done' : 'draw', ...variety.element.get(b.key) })),
      ];
      return { group: g.group, items };
    }).filter(g => g.items.length);
    batches = groupBatches(rows, of).map((gs, i) => ({ n: i + 1, files: gs.map(g => packFileOf(region.id, g.group)), groups: gs.map(g => g.group), items: gs.flatMap(g => g.items) }));
  }
  for (const b of batches) { b.count = b.items.length; b.todo = b.items.filter(x => x.state === 'draw').length; b.brief = briefFileOf(kind, b.n, group); }
  if (batch && (batch < 1 || batch > batches.length)) throw new Error(`--batch ${batch} is out of range: this plan has ${batches.length} batch${batches.length === 1 ? '' : 'es'} (add --of M to change the number)`);
  return { region: region.id, kind, group: group || null, of: batches.length, size: kind === 'scene' ? SCENES_PER_AGENT : null, total: batches.reduce((n, b) => n + b.count, 0), batches, suggestions: { doc: sugg.doc, applied: overrides.applied, unknown: overrides.unknown, problems: overrides.problems } };
}

/* ---------------------------------------------------------------------------------------------
   The numbers: generated, never typed
   --------------------------------------------------------------------------------------------- */
const kbOf = (n) => (n / 1000).toFixed(1) + ' KB';
const fmt = (metric, v) => (metric === 'bytes' ? kbOf(v) : String(v));
const ROWS = {
  scene: [['bytes', 'rendered size'], ['shapes', 'shapes'], ['pathSegments', 'path segments'], ['gradients', 'gradients'], ['translucentLayers', 'translucent layers (haze, glow, soft shadow)'], ['movingGroups', 'moving groups'], ['motionKinds', 'kinds of motion'], ['detailCells', 'cells of 100 x 100 holding detail']],
  item: [['bytes', 'rendered size'], ['shapes', 'shapes'], ['pathSegments', 'path segments'], ['movingGroups', 'moving groups (independently staggered)'], ['motionKinds', 'kinds of motion'], ['distinctForms', 'different forms'], ['inkCells', 'cells of 8 x 8 holding ink (of 64)']],
};
/** The range (min to max) of each metric over the gold-standard exemplars of a kind, MEASURED now (they are rendered and linted like any piece). */
export function exemplarRanges(reg, refs, thresholds) {
  const entries = selectEntries(reg, { refs });
  const rows = measureRegistry(reg, entries, thresholds).map(r => r.metrics);
  const out = { n: rows.length };
  for (const metric of new Set([...ROWS.scene, ...ROWS.item].map(r => r[0]))) { const v = rows.map(m => m[metric]).filter(Number.isFinite); if (v.length) out[metric] = [Math.min(...v), Math.max(...v)]; }
  return out;
}
/** The corpus-targets block of a brief, from tools/anim-quality.json (the accepted corpus: median and 10th percentile) and the measured exemplars. */
export function corpusTargets(kind, thresholds, ex) {
  const prof = kind === 'scene' ? thresholds.scene : thresholds.item, what = kind === 'scene' ? 'scene' : 'small item';
  const corpus = String((prof.bytes && prof.bytes.note) || '').match(/n=(\d+)/);
  const lines = [`These are the numbers of the accepted hand-drawn ${what}s${corpus ? ` (${corpus[1]} of them)` : ''}, generated from \`tools/anim-quality.json\` (1 KB = 1,000 bytes). The median is the bar; "thin below" is the 10th percentile: a number under it is a thin spot; the exemplars are the best ${ex.n}, measured now:`, '',
    '| what | median ' + what + ' | thin below | the exemplars |', '| --- | --- | --- | --- |'];
  for (const [metric, label] of ROWS[kind === 'scene' ? 'scene' : 'item']) {
    const t = prof[metric];
    if (!t) continue;
    const e = ex[metric];
    lines.push(`| ${label} | ${fmt(metric, t.median)} | ${t.warnMin != null ? fmt(metric, t.warnMin) : '-'} | ${e ? (e[0] === e[1] ? fmt(metric, e[0]) : `${fmt(metric, e[0])} to ${fmt(metric, e[1])}`) : '-'} |`);
  }
  const r = prof.richness;
  lines.push('', `The richness index (what \`lint\` prints; 1.0 = the median accepted ${what}, the lint floor is ${r ? r.min : '-'}) is built from these numbers. **Your targets: richness >= ${TARGETS.richness.toFixed(2)} and at most ${TARGETS.maxThinSpots} thin spots** per ${what}; \`lint --file\` prints both, and says MISSES THE TARGET when you miss. A ${what} that misses is redrawn with more real drawing (never padding), at most ${TARGETS.maxRedraws} attempts (section 6 says what happens after).`);
  if (kind === 'scene') lines.push(`Hard cap ${thresholds && prof.bytes ? Number(prof.bytes.max).toLocaleString('en-US') : ''} bytes rendered; the accepted ones sit around the median, so a scene far above it is bloated, not rich.`);
  else lines.push('A small item is drawn with a few real forms: it is not a landmark scene. Far above the exemplars in size is bloat, far below the median is thin.');
  return lines.join('\n');
}
/** The safe zones, from the crops the `sheet --crop` option renders: the scene is cut with xMidYMid slice, so a screen of the same height and width W shows the central W of the 1600 units. */
export function safeZones() {
  const x = (w) => `${800 - w / 2} to ${800 + w / 2}`;
  return `A scene is cut to fill the screen (preserveAspectRatio "xMidYMid slice"), so only the middle of the 1600 units survives on a narrow screen: a square tile shows the central ${CROPS.square} (x ${x(CROPS.square)}), a portrait phone only the central ${CROPS.phone} to 506 (x ${x(CROPS.phone)} at the narrowest; a 9:16 phone shows x 547 to 1053). So: **the subject (the landmark or animal the scene is about), or at least the part that identifies it (a tower top, a peak, the animal's body), must be recognisable inside x ${x(CROPS.phone)}** (and y 40 to 840); **the whole subject and everything the story needs (a second building, the lit windows, the reflection) must stay inside x ${x(CROPS.square)}**; the outer ${(1600 - CROPS.square) / 2} units on each side carry framing, foliage, water, sky and distance and may be cropped. Check it: \`sheet --crop phone\` and \`sheet --crop square\` render exactly those crops.`;
}
/** The markup the lint accepts and rejects (its `structure` rule), generated from the lint's own tag sets. */
export function markupRules(kind = 'scene') {
  return `Allowed markup, exactly what the lint's \`structure\` rule accepts: ${allowedTagList().map(t => '`' + t + '`').join(', ')} (\`defs\` and \`clipPath\` are for gradients and clips). The lint REJECTS: ${forbiddenTagList().slice(0, 16).map(t => '`' + t + '`').join(', ')} (text, images, scripts, styles, links, SMIL animation; the lint has a few more), and every other tag (\`use\`, \`pattern\`, \`mask\`, \`symbol\`, \`filter\`: the accepted strict scenes use none of them). ${kind === 'scene' ? 'Motion is the kit\'s \`x-*\` classes and \`mv()\` only' : 'Motion is the library\'s \`x-*\` classes only'}, never SMIL or a \`style\` element.`;
}
/** What the rubric pass mark is (references/rubric.md section 2), as the brief states it. */
export function passMark(kind) {
  const core = RUBRIC_PASS.core[kind === 'scene' ? 'scene' : 'item'].join(', '), part = kind === 'scene' ? 'part A (R1 to R20)' : 'part B (I1 to I20)';
  return `${RUBRIC_PASS.score} of ${RUBRIC_PASS.of} lines of ${part} of \`${REFS}/rubric.md\`, EVERY core line (${core}), no instant reject, and the redraw targets above. Your own score is a self-check, never an approval: an independent reviewer scores it blind afterwards, so mark a line P only when you checked it in the render or the code.`;
}

/* ---------------------------------------------------------------------------------------------
   Pieces of a brief
   --------------------------------------------------------------------------------------------- */
const mdCell = (s) => String(s).replace(/\|/g, '/');
const stateCell = (k) => (k.state === 'done' ? 'done (leave alone)' : 'draw');
/** The season cell: `any` (the tropics), the word (north), or the local season with the label to write (south: "autumn (season: 'spring')"). */
export const seasonCell = (k) => (k.season === 'any' ? 'any' : k.seasonLabel && k.seasonLabel !== k.season ? `${k.season} (season: '${k.seasonLabel}')` : k.season);
function keyTable(region, b, kind) {
  const word = region.unitWord;
  if (kind === 'scene') {
    const lines = ['| # | key | what to draw | group | status | suggested time | season | type | palette |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |'];
    b.items.forEach((k, i) => lines.push(`| ${i + 1} | \`${k.key}\` | ${k.kind === 'unit' ? `${mdCell(k.name)}: the ${word}'s signature` : `${mdCell(k.name)} (${mdCell(k.unitName)}): big city, at ${k.lat}, ${k.lon}`} | ${k.group} | ${stateCell(k)} | ${k.time} | ${seasonCell(k)} | ${k.type} | ${k.palette} |`));
    return lines.join('\n') + '\n\n' + SEASON_NOTE;
  }
  const lines = ['| # | file | call | what it is | status | suggested motif kind | suggested colour |', '| --- | --- | --- | --- | --- | --- | --- |'];
  b.items.forEach((k, i) => lines.push(`| ${i + 1} | \`${basename(packFileOf(region.id, k.group))}\` | \`${k.call}('${k.id}', { id, label, colour, mood, tags, svg })\` | ${k.call === 'B.element' ? `${mdCell(k.name)}: the ${word}'s symbol` : `${mdCell(k.name)} (${mdCell(k.unitName)}): a small place's symbol`} | ${stateCell(k)} | ${k.motif} | ${k.colour} |`));
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
  if (!lines.length) return '(none yet when this brief was made)';
  return lines.length > 80 ? lines.slice(0, 80).join('\n') + `\n- ... and ${lines.length - 80} more` : lines.join('\n');
}
const pngName = (ref, mode) => `.anim-ref/${ref.replace(/\//g, '__')}-${mode}.png`;
/** One block per exemplar: the item, its source, WHAT TO TAKE FROM IT in words (the written fallback when a PNG cannot be shown: the value structure, the layers, the palette) and the PNGs to open. */
function exemplarLines(list, modes) {
  return list.map(x => `- \`${x.ref}\`${x.tags && x.tags.length ? `  [${x.tags.join(', ')}]` : ''}${x.source ? `\n    read: ${x.source}` : ''}${x.why ? `\n    what it shows: ${String(x.why).replace(/\s+/g, ' ').trim()}` : ''}\n    PNG: ${modes.map(m => pngName(x.ref, m)).join(' , ')}`).join('\n');
}
function weakerLines(list) {
  return list.map(x => `- \`${x.ref}\`: ${String(x.wrong || '').replace(/\s+/g, ' ').slice(0, 240)}${x.source ? `\n    read: ${x.source}` : ''}`).join('\n');
}
function verifyBlock(kind, files, regionId, owned) {
  const lines = [];
  const only = kind === 'element' ? ' --only small' : '';   // a pack file also carries the scenes the scene agents are drawing: judge only the elements
  const dark = kind === 'scene' ? 'night' : 'dark';
  for (const f of files) {
    const stem = basename(f).replace(/\.js$/, '');
    lines.push(`# ${f}`, `node --check ${f}`,
      '# the lint must end with PASS: no waiver, no threshold edit. It prints the thin spots and the redraw target of every piece (--quiet hides them, --rules prints every rule)',
      `node tools/anim-pack.mjs lint --file ${f}${only}`,
      `# render light and ${dark}, then OPEN the PNGs and compare each with its nearest exemplar`,
      `node tools/anim-pack.mjs sheet --file ${f}${only} --mode light --out .anim-ref/${stem} --contact`,
      `node tools/anim-pack.mjs sheet --file ${f}${only} --mode ${dark} --out .anim-ref/${stem} --contact`);
    if (kind === 'scene') lines.push('# the crops of a portrait phone and a square tile: is the subject still the picture?',
      `node tools/anim-pack.mjs sheet --file ${f} --mode light --crop phone --out .anim-ref/${stem} --contact`,
      `node tools/anim-pack.mjs sheet --file ${f} --mode light --crop square --out .anim-ref/${stem} --contact`);
    lines.push('');
  }
  lines.push('# before you report: only your own file(s) may be listed here', 'git status --short', '', '# what is still missing in the whole region (other agents are still drawing: do not try to fix their part)', `node tools/anim-pack.mjs status ${regionId}`);
  return '```bash\n' + lines.join('\n') + '\n```';
}

/** The brief of one batch, as markdown. `opts.targets` (the corpus-targets block) is made once per command by the caller; without it it is computed here. */
export function renderBrief(reg, region, plan, b, { root, notes = [], targets = null, base = '' }) {
  const needs = regionNeeds(region), ref = loadReference(root), kind = plan.kind;
  const name = kind === 'scene' ? 'scene-brief.md' : 'element-brief.md';
  const thresholds = loadThresholds(root);
  if (!targets) targets = corpusTargets(kind, thresholds, exemplarRanges(reg, kind === 'scene' ? ref.scenes.map(x => x.ref) : ref.items.map(x => x.ref), thresholds));
  const verify = verifyBlock(kind, b.files, region.id);
  const files = b.files.map(f => `- \`${f}\`${existsSync(join(root, f)) ? '' : '  (does not exist yet: create it like the scaffold\'s pack files: `const B = <REGION>.builder(\'<group>\'); B.scenes(); ...; animRegisterPack(B.pack({ id: \'' + region.id + '-<group>\', name, description }))`)'}`).join('\n');
  const doneN = b.count - b.todo;
  const guard = `node tools/anim-pack.mjs guard --owned ${b.files.join(',')}${base ? ' --base ' + base : ''}`;
  const vars = {
    region_id: region.id, region_name: region.name, over: region.over, unit_word: region.unitWord, unit_word_plural: plural(region.unitWord),
    groups_summary: groupsSummary(region, needs), batch: b.n, batches: plan.of, count: b.count, todo_count: b.todo, todo_s: b.todo === 1 ? '' : 's', batch_groups: batchGroups(b),
    file: b.files[0], files, owned: b.files.map(f => `\`${f}\``).join(', '), guard, keys: keyTable(region, b, kind),
    done_note: doneN ? `\n${doneN} of these already ${kind === 'scene' ? 'have a scene' : 'have an element'} (status \`done\`): leave ${doneN === 1 ? 'it' : 'them'} exactly as ${doneN === 1 ? 'it is' : 'they are'}. Redrawing a finished piece is the orchestrator's decision and the orchestrator names the file that holds it; if you think ${doneN === 1 ? 'it is' : 'one is'} wrong, say so under OTHER FILES I THINK ARE WRONG.\n` : '',
    existing: existingList(reg, region, kind),
    exemplars: kind === 'scene' ? exemplarLines(ref.scenes, ['light', 'night']) : exemplarLines(ref.items, ['light', 'dark']) + '\n\nScenes, for their palette and finish only:\n\n' + exemplarLines(ref.scenes.slice(0, 4), ['light']),
    weaker: kind === 'scene' ? weakerLines(ref.weaker) : weakerLines(ref.weakerItems || []),
    care: careFor(root, region),
    notes: notes.length ? 'Extra instructions for this batch:\n\n' + notes.map(n => `- ${n}`).join('\n') + '\n' : '',
    targets, pass_mark: passMark(kind), safe_zones: safeZones(), markup_rules: markupRules(kind), max_thin: TARGETS.maxThinSpots, min_richness: TARGETS.richness.toFixed(2), max_redraws: TARGETS.maxRedraws,
    verify, scene_cap: reg.limits.scene.toLocaleString('en-US'), item_cap: reg.limits.item.toLocaleString('en-US'),
    region_file: configFileOf(root, region.id), skill: SKILL, refs: REFS,
  };
  return renderTemplate(readTemplate(name), vars, name).replace(/\n{3,}/g, '\n\n');
}

/** The PNG paths the briefs of a kind cite (exemplarLines): the gold standard must be rendered before they are dispatched. */
export function citedPngs(kind, ref) {
  return kind === 'scene'
    ? ref.scenes.flatMap(x => ['light', 'night'].map(m => pngName(x.ref, m)))
    : [...ref.items.flatMap(x => ['light', 'dark'].map(m => pngName(x.ref, m))), ...ref.scenes.slice(0, 4).map(x => pngName(x.ref, 'light'))];
}

/** The orchestrator's commands around a plan: render the gold standard once before the agents start (all three modes), check after. `base` = the commit of the scaffold when it is known. */
function planCommands(plan, base, commit = '') {
  const owned = [...new Set(plan.batches.flatMap(b => b.files))];
  const guard = (files) => `node tools/anim-pack.mjs guard --owned ${files.join(',')}${base ? ' --base ' + base : ''}`;
  return {
    before: [...(commit ? [commit] : []), 'node tools/anim-pack.mjs reference --render'],
    afterEach: plan.batches.map(b => ({ batch: b.n, owns: b.files, lint: b.files.map(f => `node tools/anim-pack.mjs lint --file ${f}${plan.kind === 'element' ? ' --only small' : ''}`), guard: guard(b.files) })),
    afterAll: [guard(owned), 'node --test tests/anim-packs.test.mjs', `node --test tests/region-framework.test.mjs tests/${plan.region}-pack.test.mjs`, `node tools/anim-pack.mjs status ${plan.region} --strict`],
  };
}

/** The files of a region's scaffold, as git pathspecs (for "is the scaffold committed?"). */
const scaffoldPaths = (root, id) => [configFileOf(root, id), `docs/dev/${id.toUpperCase()}_PACK.md`, `tests/${id}-pack.test.mjs`, `src/app/71-anim-region-${id}-scenes-*.js`, `src/app/72-anim-pack-${id}-*.js`];

/** brief <subject> --kind composed|upgrade|archetype|object: the briefs of the new standard (tools/lib/scene-briefs.mjs). */
function sceneBriefs(args, ctx) {
  const subject = ctx.positionals[0];
  if (ctx.positionals.length > 1) throw new Error(`brief --kind ${args.kind} takes one subject, got ${ctx.positionals.length}`);
  if (!subject) throw new Error(`brief --kind ${args.kind} needs a subject: ${{ composed: 'a pack id', upgrade: 'a region', archetype: 'an archetype id', object: 'a kit' }[args.kind]}`);
  const reg = loadRegistry(ctx.root, { fresh: true });
  const notes = [].concat(args.note || []).map(x => String(x).trim()).filter(Boolean);
  const plan = sceneBriefPlan(reg, ctx.root, args.kind, subject, { notes, batch: toInt(args.batch, 'batch') });
  const written = [];
  if (args.out) {
    const dir = resolve(args.out);
    mkdirSync(dir, { recursive: true });
    for (const b of plan.batches) { const f = join(dir, `${args.kind}-brief-${plan.subject}-${b.n}.md`); writeFileSync(f, b.markdown); written.push(f); }
  }
  if (args.json) { ctx.out(JSON.stringify({ kind: plan.kind, subject: plan.subject, of: plan.of || plan.batches.length, written, batches: plan.batches.map(b => ({ batch: b.n, title: b.title, items: b.items, archetype: b.archetype || null, markdown: args.batch || plan.batches.length === 1 ? b.markdown : undefined })) }, null, 1)); return 0; }
  if (written.length) { written.forEach(f => ctx.out(f)); return 0; }
  if (plan.batches.length === 1) { ctx.out(plan.batches[0].markdown.replace(/\s+$/, '')); return 0; }
  ctx.out(`brief ${args.kind}, ${plan.subject}: ${plan.batches.length} batches`);
  for (const b of plan.batches) ctx.out(`  batch ${String(b.n).padStart(2)}  ${b.title}: ${b.items.join(', ')}`);
  ctx.out(`\nPrint one: node tools/anim-pack.mjs brief ${plan.subject} --kind ${args.kind} --batch N\nWrite all: node tools/anim-pack.mjs brief ${plan.subject} --kind ${args.kind} --out .anim-ref/briefs`);
  return 0;
}

export default {
  summary: 'ready-to-paste task briefs for the agents that draw a region (batched scene briefs, per-group element briefs)',
  usage: 'brief <region> --kind scene|element [--batch N --of M] [--group <g>] [--out <dir> [--clean]] [--note <text>] [--clear-notes] [--json]  |  brief <pack|region|archetype|kit> --kind composed|upgrade|archetype|object [--batch N] [--out <dir>] [--note <text>] [--json]',
  positionals: '<region>',
  options: {
    kind: { type: 'string', help: `scene (hand-drawn full-screen scenes: the LEGACY tier, batches of about ${SCENES_PER_AGENT} keys) | element (small symbols, one batch per group) | composed (a new composed scene; the subject is its pack id) | upgrade (the region scenes below the new standard, in batches of ${SCENES_PER_AGENT} by suggested archetype) | archetype (build one; the subject is its id) | object (add objects to a kit; the subject is the kit) (required)` },
    batch: { type: 'string', help: 'print the brief of batch N (1-based); without it the plan is printed (and with --out every brief is written)' },
    of: { type: 'string', help: `the number of batches (default: scenes ceil(keys / ${SCENES_PER_AGENT}), elements one per group). Scene batches are cut at group boundaries where that costs little, so the sizes can differ; elements never split a group` },
    group: { type: 'string', help: 'only this group' },
    out: { type: 'string', help: 'write the brief(s) as <kind>-brief[-<group>]-<N>.md into this folder, plus plan.json (the index to dispatch from), instead of printing them; also creates the empty scene file of every scene batch that has none' },
    clean: { type: 'boolean', help: 'with --out: remove the briefs of this kind in the folder that this plan does not overwrite (otherwise they are refused: dispatching a stale one gives two agents the same keys)' },
    note: { type: 'string', multiple: true, help: 'an extra instruction added to every brief (repeatable). With --out it is stored in plan.json and re-used by every later run into the same folder (a re-run never drops it)' },
    'clear-notes': { type: 'boolean', help: 'with --out: forget the notes stored in plan.json (the ones given with --note this time still apply)' },
    json: { type: 'boolean', help: 'machine-readable: the plan; with --batch also the brief as markdown' },
  },
  notes: [
    'season: the season column follows the latitude of the key: `any` in the tropics (|latitude| < 23.5), the local season in the south with the label to write ("autumn (season: \'spring\')": the app calendar is the northern one), the same word in the north. The `season:` field of an entry is only a LABEL (gallery card, "picked for ..." note): it does not decide when a region scene plays; use `any` unless the picture really shows one season.',
    'Commit the scaffold (and the scene stubs this command creates) before the agents start: they begin from the same tree and `guard` compares with a commit.',
    GUARD_PROOF,
  ],
  run(args, ctx) {
    if (SCENE_KINDS.includes(args.kind)) return sceneBriefs(args, ctx);
    if (ctx.positionals.length > 1) throw new Error(`brief takes one region, got ${ctx.positionals.length} (${ctx.positionals.join(', ')}): run it once per region`);
    const id = ctx.positionals[0];
    if (!id) throw new Error('brief needs a region: node tools/anim-pack.mjs brief <region> --kind scene|element');
    if (!KINDS.includes(args.kind)) throw new Error(`--kind must be one of ${[...KINDS, ...SCENE_KINDS].join(', ')}`);
    if (args.clean && !args.out) throw new Error('--clean goes with --out <dir>');
    if (args['clear-notes'] && !args.out) throw new Error('--clear-notes goes with --out <dir> (the notes are stored in its plan.json)');
    const reg = loadRegistry(ctx.root, { fresh: true });
    const region = findRegion(reg, id);
    const of = toInt(args.of, 'of'), batch = toInt(args.batch, 'batch'), given = [].concat(args.note || []).map(s => String(s).trim()).filter(Boolean);
    if (args.group != null && !String(args.group).trim()) throw new Error('--group is empty: give one of the region\'s groups (' + region.groups.join(', ') + ') or leave the option out');
    const plan = buildPlan(reg, region, { kind: args.kind, of, batch, group: args.group || '' });
    if (!plan.batches.length) throw new Error(`nothing to brief: ${region.id} has no ${args.kind === 'scene' ? 'scene keys' : 'elements to draw'}${args.group ? ' in group ' + args.group : ''}`);
    if (args.kind === 'element' && of && of > plan.of) ctx.err(`note: --of ${of} is more than the ${plan.of} group(s): a pack file has one owner, so there are ${plan.of} batch(es)`);
    const care = careInfo(ctx.root, region);
    if (care.state !== 'ok' && !(args.json && !batch && !args.out)) ctx.err(`note: ${care.state === 'no-doc' ? `${care.doc} does not exist` : care.state === 'no-section' ? `${care.doc} has no "Cultural care" section` : `the "Cultural care" section of ${care.doc} is still the skeleton comment`}: the briefs carry only the general care rules. Fill in the region's own notes (sensitive places, motifs to avoid), then make the briefs again.`);
    const sg = plan.suggestions;
    for (const k of sg.unknown) ctx.err(`note: ${sg.doc}, "Scene suggestions": ${k} is not a scene or element key of ${region.id} (node tools/anim-pack.mjs status ${region.id} lists them): ignored`);
    for (const m of sg.problems) ctx.err(`note: ${m}: ignored`);
    if (sg.applied && !(args.json && !batch && !args.out)) ctx.err(`note: ${sg.applied} suggestion${sg.applied === 1 ? '' : 's'} from the "Scene suggestions" section of ${sg.doc} replace the rotation's`);
    const chosen = batch ? [plan.batches[batch - 1]] : plan.batches;
    const written = [], created = [];
    const needMd = !(args.json && !batch && !args.out);
    const ref = loadReference(ctx.root), th = loadThresholds(ctx.root);

    // --out: the stale-brief check comes FIRST (nothing is written when it refuses), then the stub scene files, then the briefs (which then say the file exists), then plan.json
    let dir = null, planFile = null, old = {}, stale = [], notes = given;
    if (args.out) {
      dir = resolve(args.out);
      mkdirSync(dir, { recursive: true });
      const names = new Set(chosen.map(b => b.brief));
      stale = readdirSync(dir).filter(f => briefFileRe(args.kind).test(f) && !names.has(f));
      if (stale.length && !args.clean) throw new Error(`refusing to write: ${dir} already holds ${args.kind} briefs that this plan does not overwrite (${stale.join(', ')}), from an earlier plan. Dispatching one of them would give two agents the same keys. Pass --clean to remove them, or use another folder. Nothing was written.`);
      planFile = join(dir, 'plan.json');
      try { old = JSON.parse(readFileSync(planFile, 'utf8')); } catch { old = {}; }
      if (old && old.region && old.region !== region.id) ctx.err(`note: ${planFile} was the plan of region "${old.region}": it is replaced by this region's plan (its stored notes are not carried over)`);
      const stored = old.region === region.id && old.plans && old.plans[args.kind] && Array.isArray(old.plans[args.kind].notes) ? old.plans[args.kind].notes : [];
      if (stored.length && args['clear-notes']) ctx.err(`note: ${stored.length} stored note(s) of ${args.kind} briefs forgotten (--clear-notes)`);
      else if (stored.length) ctx.err(`note: re-using ${stored.length} stored note${stored.length === 1 ? '' : 's'} from ${planFile}${given.length ? ` and adding ${given.filter(n => !stored.includes(n)).length} new` : ''} (--clear-notes forgets them)`);
      notes = [...new Set([...(args['clear-notes'] ? [] : stored), ...given])];
      if (args.kind === 'scene') {
        for (const b of chosen) for (const f of b.files) if (!existsSync(join(ctx.root, f))) { mkdirSync(dirname(join(ctx.root, f)), { recursive: true }); writeFileSync(join(ctx.root, f), sceneStubText(region, b.n), { flag: 'wx' }); created.push(f); }
      }
    }
    // is the scaffold committed? (the agents start from the committed tree; guard compares with a commit)
    const gitState = args.out ? gitScaffoldState(ctx.root, scaffoldPaths(ctx.root, region.id)) : null;
    const base = gitState && gitState.head && !gitState.uncommitted.length ? gitState.head : '';
    const commitCmd = gitState && gitState.uncommitted.length ? `git add ${[...new Set(gitState.uncommitted.map(x => x.path))].join(' ')} && git commit -m "${region.name}: scaffold"` : '';

    let targets = null;
    if (needMd) targets = corpusTargets(args.kind, th, exemplarRanges(reg, args.kind === 'scene' ? ref.scenes.map(x => x.ref) : ref.items.map(x => x.ref), th));
    const briefs = chosen.map(b => ({ b, md: needMd ? renderBrief(reg, region, plan, b, { root: ctx.root, notes, targets, base }) : null }));
    const missingPng = args.out || batch ? citedPngs(args.kind, ref).filter(f => !existsSync(join(ctx.root, f))) : [];
    if (dir) {
      for (const f of stale) unlinkSync(join(dir, f));
      for (const { b, md } of briefs) { const f = join(dir, b.brief); writeFileSync(f, md); written.push(f); }
      // plan.json: the index to dispatch from; the other kind's plan, if the folder has one, is kept
      const plans = old.region === region.id && old.plans && typeof old.plans === 'object' ? old.plans : {};
      const suggestions = Object.fromEntries(briefs.flatMap(({ b }) => b.items.map(k => [k.key, args.kind === 'scene' ? { time: k.time, season: k.season, seasonLabel: k.seasonLabel, type: k.type, palette: k.palette } : { motif: k.motif, colour: k.colour }])));
      const before = plans[args.kind] && Array.isArray(plans[args.kind].created) ? plans[args.kind].created : [];   // the stubs an earlier run made stay listed
      plans[args.kind] = { kind: args.kind, group: plan.group, of: plan.of, total: plan.total, notes, ...(args.kind === 'scene' ? { seasonNote: SEASON_NOTE } : {}), ...planCommands(plan, base, commitCmd), created: [...new Set([...before, ...created])], suggestions,
        batches: briefs.map(({ b }) => ({ batch: b.n, brief: b.brief, owns: b.files, groups: b.groups, count: b.count, todo: b.todo, keys: b.items.map(k => k.key) })) };
      writeFileSync(planFile, JSON.stringify({ region: region.id, dispatch: Object.values(plans).flatMap(p => p.batches.map(x => x.brief)), git: gitState ? { head: gitState.head, base: base || null, committed: !gitState.uncommitted.length, uncommitted: gitState.uncommitted.map(x => x.path) } : null, missingPng, proves: GUARD_PROOF, plans }, null, 1) + '\n');
      written.push(planFile);
      if (stale.length) ctx.err(`removed ${stale.length} stale ${args.kind} brief(s): ${stale.join(', ')}`);
    }
    if (args.json) {
      const slim = (b) => ({ batch: b.n, brief: b.brief, files: b.files, groups: b.groups, count: b.count, todo: b.todo, keys: b.items.map(k => ({ key: k.key, call: k.call || null, name: k.name, group: k.group, state: k.state, ...(args.kind === 'scene' ? { season: k.season, seasonLabel: k.seasonLabel } : {}) })) });
      ctx.out(JSON.stringify({ region: plan.region, kind: plan.kind, group: plan.group, of: plan.of, size: plan.size, total: plan.total, written, created, notes, missingPng,
        batches: briefs.map(({ b, md }) => (batch ? { ...slim(b), markdown: md } : slim(b))) }, null, 1));
      return 0;
    }
    if (batch && !args.out) { ctx.out(briefs[0].md.replace(/\s+$/, '')); if (briefs[0].b.todo === 0) ctx.err('note: every key of this batch already has its art; the brief is for a redraw'); if (missingPng.length) ctx.err(`note: ${missingPng.length} of the PNGs this brief cites do not exist yet: render the gold standard once with node tools/anim-pack.mjs reference --render`); return 0; }
    if (written.length) written.forEach(f => ctx.out(f));
    const unit = args.kind === 'scene' ? 'scene key' : 'element';
    ctx.out(`brief ${args.kind}, region "${region.id}": ${plan.total} ${unit}${plan.total === 1 ? '' : 's'} in ${plan.of} batch${plan.of === 1 ? '' : 'es'}${args.kind === 'scene' ? ` (about ${SCENES_PER_AGENT} per agent; --of M sets the number of batches, cut at group boundaries where that costs little, so the sizes can differ)` : ' (one per group; --of M merges groups)'}`);
    for (const b of plan.batches) ctx.out(`  batch ${String(b.n).padStart(2)}  ${String(b.count).padStart(3)} (${String(b.todo).padStart(3)} to draw)  ${b.groups.join(', ').padEnd(24)} ${b.files.join(', ')}`);
    if (created.length) ctx.out(`\ncreated ${created.length} empty scene file${created.length === 1 ? '' : 's'} (the IIFE stub, so that every batch's file exists before its agent starts):\n  ${created.join('\n  ')}`);
    if (notes.length) ctx.out(`\nnotes in every brief (stored in plan.json; a re-run re-reads them):\n${notes.map(n => `  - ${n}`).join('\n')}`);
    if (!written.length) ctx.out(`\nPrint one: node tools/anim-pack.mjs brief ${region.id} --kind ${args.kind} --batch N${of ? ` --of ${of}` : ''}${args.group ? ` --group ${args.group}` : ''}\nWrite all: node tools/anim-pack.mjs brief ${region.id} --kind ${args.kind}${of ? ` --of ${of}` : ''}${args.group ? ` --group ${args.group}` : ''} --out .anim-ref/briefs`);
    else {
      const steps = [];
      if (commitCmd) steps.push(`COMMIT THE SCAFFOLD first (${gitState.uncommitted.length} file${gitState.uncommitted.length === 1 ? ' is' : 's are'} uncommitted: ${gitState.uncommitted.slice(0, 8).map(x => x.path).join(', ')}${gitState.uncommitted.length > 8 ? ', ...' : ''}). The agents must start from the same committed tree, and guard compares with a commit (an uncommitted scaffold is listed as strays):\n       ${commitCmd}`);
      if (missingPng.length) steps.push(`render the gold standard ONCE (${missingPng.length} PNG${missingPng.length === 1 ? '' : 's'} the briefs cite ${missingPng.length === 1 ? 'does' : 'do'} not exist yet, for example ${missingPng[0]}; the agents must not write the same PNGs at the same time):\n       node tools/anim-pack.mjs reference --render      (light, night and dark in one run)`);
      else steps.push('the gold standard PNGs the briefs cite exist; render them again only if the exemplars changed (node tools/anim-pack.mjs reference --render)');
      ctx.out(`\nBefore you dispatch:\n${steps.map((x, i) => `  ${i + 1}. ${x}`).join('\n')}`);
      ctx.out(`After the agents, in a shared tree ONE guard over the files of every agent that ran: ${planCommands(plan, base).afterAll[0]}\n(it proves the UNION of the files listed, not one agent alone: to prove one agent give it its own git worktree and guard it there.)\nplan.json lists what to dispatch (briefs, the file each batch owns, the stored notes, the suggestions) and the commands.`);
    }
    return 0;
  },
};
