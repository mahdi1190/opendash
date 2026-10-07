// The briefs of the new standard (docs/dev/SCENE_ENGINE.md 10.3): `brief <subject> --kind composed|upgrade|archetype|object`.
// Node >= 20, no dependencies. Made from tools/lib/anim-templates/{composed-scene-brief,upgrade-brief,archetype-brief,object-brief}.md,
// filled with facts generated from the repo (the bar from tools/anim-reference.json, the budget from tools/anim-quality.json, the
// kits and objects from the loaded library, the region's care rules): never typed.
//
//   SCENE_KINDS                                         the four kinds
//   sceneBriefPlan(reg, root, kind, subject, opts)      -> { kind, subject, batches: [{ n, title, items, markdown }] }
//       composed:  subject = a pack id (new or existing); one brief for one new scene (--note adds instructions)
//       upgrade:   subject = a region; every scene below the new standard, grouped by suggested archetype, in batches of SCENES_PER_AGENT
//       archetype: subject = an archetype id of SCENE_ARCHETYPE_INDEX; one brief to build it, with the batch commands
//       object:    subject = a kit of SCENE_KITS; one brief to add objects to it
import { readTemplate, renderTemplate, careFor, findRegion, SCENES_PER_AGENT, CARE_RULES } from './anim-region.mjs';
import { loadReference, loadThresholds } from '../anim-pack.mjs';
import { engineOf } from './scene-lint.mjs';
import { standardBlock } from './anim-cmd/status.mjs';
import { regionKeyOf } from './scene-upgrade.mjs';

export const SCENE_KINDS = ['composed', 'upgrade', 'archetype', 'object'];
export const LEGAL_NOTE = 'The TfL roundel, the "Underground" logotype, the line-diagram style and the New Johnston typeface are TfL trademarks or otherwise protected: never reproduce them, approximate them or draw them as decoration. What evokes a real station without copying the marks: coloured bars in the line colours, a plain sans-serif name board in the system font (the engine\'s sign primitive draws it from data: escaped, `system-ui`, 1 to 40 characters, with a deny-list), the period architecture (Victorian brick and canopy, Edwardian tiled frontage, Holden brick and glass, Jubilee-extension steel and glass) and the real nearby features from the data. Signs exist only where the archetype declares `signs: true` (it sets `signage: true` on its scenes); region scenes have NO signs.';

const mdCell = (s) => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
function barLines(root) {
  const ref = loadReference(root);
  const bar = ref.bar || [];
  if (!bar.length) return '(tools/anim-reference.json has no bar yet)';
  return bar.map(b => `- \`${b.ref}\` (${b.kind}): ${b.why}\n  .anim-ref/${b.ref.replace(/\//g, '__')}-light.png and .anim-ref/${b.ref.replace(/\//g, '__')}-night.png`).join('\n');
}
function budgetText(root) {
  const T = loadThresholds(root).composed || {}, d = T.data || {}, p = T.perf || {}, b = T.bar || {};
  const v = (o, k) => (o && o[k] != null ? o[k] : '?');
  return `**The performance principle.** Static objects are baked into at most ${v(d.bitmaps, 'max')} cropped layer bitmaps, so thousands of static placements cost NOTHING per frame. Only animated sprites and effects cost: at most ${v(d.animatedDraws, 'max')} animated draws, ${v(p.dynMs, 'max')} ms of dynamic drawing (dynMs) within an ${v(p.drawMs, 'max')} ms frame on a laptop (x ${p.swFactor || 1.75} under the headless software raster). At most ${v(d.placements, 'max')} placements, ${v(d.actors, 'max')} actors, ${v(d.flockBirds, 'max')} flock birds, ${v(d.particles, 'max')} particles, ${v(d.dataBytes, 'max')} bytes of scene data. The bar floors: ${v(b.depthLayers, 'min')} depth layers, ground cover ${b.groundCover ? `${b.groundCover.natural} of the columns (natural; urban ${b.groundCover.urban})` : '?'} with ${b.coverItems ? `${b.coverItems.natural} cover placements (urban ${b.coverItems.urban})` : '?'}, ${v(b.movers, 'min')} movers, ${v(b.travellers, 'min')} crossing, ${v(b.motionKinds, 'min')} kinds of motion, a signature, seasons that change by at least delta E ${v(b.seasonDeltaE, 'min')}, shadows on ${v(b.shadows, 'min')} of the casters, ${v(b.nightLights, 'min')} night lights. A rich look comes from DENSE STATIC DETAIL plus a measured number of well-chosen movers, not from animating everything.`;
}
const careText = (lines) => `${lines}\n\nFor composed scenes too (8.5): life comes mostly from animals, birds, boats and ordinary vehicles. People are tiny anonymous silhouettes (at most 8 per scene, 10 at a station; no 4 within 120 units of each other: no crowds). No flags, emblems, holy figures or brands in any object. No text anywhere except the engine's place-name signs where the archetype allows them.`;
function generalCare() { return CARE_RULES.map(r => `- ${r}`).join('\n'); }

export function sceneBriefPlan(reg, root, kind, subject, { notes = [], batch = 0, of = 0 } = {}) {
  if (!SCENE_KINDS.includes(kind)) throw new Error(`--kind must be one of scene, element, ${SCENE_KINDS.join(', ')}`);
  const E = engineOf(reg);
  const noteText = notes.length ? `**Notes from the orchestrator:**\n\n${notes.map(n => `- ${n}`).join('\n')}\n` : '';
  const index = E.index || [];
  const built = (id) => typeof E.archetype === 'function' && !!E.archetype(id);
  if (kind === 'composed') {
    if (!/^[a-z0-9-]{1,40}$/.test(subject || '')) throw new Error('brief <pack> --kind composed: the subject is the pack id of the new scene (lower case, digits, dashes)');
    const md = renderTemplate(readTemplate('composed-scene-brief.md'), {
      subject: `a new scene for ${subject}`, pack: subject, scene_id: 'my-scene', notes: noteText, bar: barLines(root), budget: budgetText(root),
      archetypes: index.length ? index.map(a => `\`${a.id}\` (${a.what}${built(a.id) ? '; BUILT' : '; not built yet'})`).join(', ') : 'the archetype index is not loaded in this checkout',
      kits: 'temperate, birds, people, water', care: careText(generalCare()),
      verify: [`node tools/anim-pack.mjs scene lint ${subject}/my-scene --perf`, `node tools/anim-pack.mjs scene sheet ${subject}/my-scene --times --seasons --contact`, `node tools/anim-pack.mjs scene sheet ${subject}/my-scene --crop phone`, `node tools/anim-pack.mjs scene perf ${subject}/my-scene`].join('\n'),
    }, 'composed-scene-brief.md');
    return { kind, subject, batches: [{ n: 1, title: `compose a new scene for ${subject}`, items: [], markdown: md }] };
  }
  if (kind === 'upgrade') {
    const region = findRegion(reg, subject);
    const mine = reg.items().filter(e => region.owns(e.pack));
    const sd = standardBlock(reg, mine, loadThresholds(root), null);
    const todo = sd.list.filter(x => x.tier === 'legacy' || x.tier === 'upgrading');
    const byArch = new Map();
    for (const x of todo) { const k = x.suggest || 'basic'; if (!byArch.has(k)) byArch.set(k, []); byArch.get(k).push(x); }
    const batches = [];
    for (const [arch, xs] of [...byArch.entries()].sort((a, b) => b[1].length - a[1].length)) for (let i = 0; i < xs.length; i += SCENES_PER_AGENT) batches.push({ arch, items: xs.slice(i, i + SCENES_PER_AGENT) });
    if (!batches.length) throw new Error(`nothing to brief: every scene of ${region.id} is at the new standard`);
    const pick = batch ? [batches[batch - 1]] : batches;
    if (batch && !pick[0]) throw new Error(`--batch ${batch} is out of range (1 to ${batches.length})`);
    const byRef = new Map(mine.map(e => [e.ref, e]));
    const care = careText(careFor(root, region));
    return { kind, subject: region.id, batches: pick.map(b => {
      const n = batches.indexOf(b) + 1;
      const refs = b.items.map((x, i) => { const e = byRef.get(x.ref); return `| ${i + 1} | \`${x.ref}\` | \`${regionKeyOf(region, e.item) || '-'}\` | ${mdCell(e.item.label)} | ${x.tier} |`; }).join('\n');
      const verify = b.items.flatMap(x => [`node tools/anim-pack.mjs scene sheet ${x.ref} --compare --upgrades --times`, `node tools/anim-pack.mjs scene lint ${x.ref} --upgrades --perf`]).join('\n');
      const md = renderTemplate(readTemplate('upgrade-brief.md'), { count: b.items.length, count_s: b.items.length === 1 ? '' : 's', region_name: region.name, region_id: region.id, archetype: b.arch + (built(b.arch) ? '' : ' (not built yet: the drafts use basic)'), batch: n, batches: batches.length, notes: noteText, refs, bar: barLines(root), verify, care }, 'upgrade-brief.md');
      return { n, title: `upgrade ${b.items.length} ${region.id} scene(s), archetype ${b.arch}`, items: b.items.map(x => x.ref), archetype: b.arch, markdown: md };
    }), of: batches.length };
  }
  if (kind === 'archetype') {
    const a = index.find(x => x.id === subject);
    if (!a) throw new Error(`brief <archetype> --kind archetype: unknown archetype "${subject}" (the index: ${index.map(x => x.id).join(', ') || 'not loaded'})`);
    const verify = [`node tools/anim-pack.mjs scene lint --archetype ${a.id} --table <table> --rows 200`, `node tools/anim-pack.mjs scene perf --archetype ${a.id} --table <table> --sample 3`, `node tools/anim-pack.mjs scene sheet --archetype ${a.id} --table <table> --sample 6 --times --contact`, `node tools/anim-pack.mjs scene sheet --archetype ${a.id} --table <table> --sample 3 --seasons --contact`].join('\n');
    const md = renderTemplate(readTemplate('archetype-brief.md'), { archetype: a.id, what: a.what, hints: (a.hints || []).join(', '), kits: a.kits ? a.kits.join(', ') : 'from the region (SCENE_REGION_KITS)', notes: noteText, bar: barLines(root), legal: a.signs ? LEGAL_NOTE : `This archetype has NO signs (region scenes carry no text). ${LEGAL_NOTE}`, verify }, 'archetype-brief.md');
    return { kind, subject: a.id, batches: [{ n: 1, title: `build the ${a.id} archetype`, items: [], markdown: md }] };
  }
  // object
  const kits = E.kits || [];
  if (kits.length && !kits.includes(subject)) throw new Error(`brief <kit> --kind object: unknown kit "${subject}" (SCENE_KITS: ${kits.join(', ')})`);
  const objs = E.ready ? E.objs().filter(d => (d.tags || []).includes('kit:' + subject)) : [];
  const md = renderTemplate(readTemplate('object-brief.md'), {
    kit: subject, notes: noteText, roles: (E.roles || []).join(', ') || 'see SCENE_ROLES',
    objects: objs.length ? objs.map(d => `- \`${d.id}\` (${d.category}, ${(d.tags || []).find(t => t.startsWith('role:')) || 'no role'}, ${d.variants || 1} variant${(d.variants || 1) === 1 ? '' : 's'})`).join('\n') : '(nothing yet: this kit is new)',
    verify: [`node tools/anim-pack.mjs object list --kit ${subject}`, `node tools/anim-pack.mjs object new <category>.<name> --kits ${subject} --role <role>`, 'node tools/anim-pack.mjs object lint <category>.<name>', 'node tools/anim-pack.mjs object sheet <category>.<name>', 'node tools/anim-pack.mjs object sheet <category>.<name> --mode night'].join('\n'),
  }, 'object-brief.md');
  return { kind, subject, batches: [{ n: 1, title: `add objects to the ${subject} kit`, items: objs.map(d => d.id), markdown: md }] };
}
