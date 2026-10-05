// Region helpers for the region commands of tools/anim-pack.mjs (tools/lib/anim-cmd/status.mjs, brief.mjs, new.mjs).
// Node >= 20, no dependencies. A REGION is what src/app/71-anim-0region.js animRegionDefine() makes (ANIM_REGIONS); this file turns
// one into (a) the WORK it needs: units that open, big and small places, scene keys, groups, batches for agents, and (b) what it HAS:
// the items its packs registered, their bytes, and what is missing. Also the template engine of the agent briefs and the scaffold
// (tools/lib/anim-templates/*).
//
//   regions(reg) / findRegion(reg, id)       the regions of a loaded registry (loadRegistry(...).R.ANIM_REGIONS)
//   regionNeeds(region)                      the work: {groups: [{group, units, big, small, keys}], unitsOpen, big, small, keys, elsewhere}
//   regionCoverage(reg, region, lint?)       what exists and what is missing, per group and per pack (lint = lintRegistry() result or null)
//   planBatches(list, {size, of, groupOf})   consecutive, balanced batches that never split a group more than they must
//   readTemplate(name) / renderTemplate(text, vars, name) / templatePlaceholders(text)
//   CARE_RULES / careFor(root, region)       the cultural and representation care rules every brief carries
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = join(HERE, 'anim-templates');
/** About this many full-screen scenes per agent: enough to keep one context busy, few enough to finish each one properly. */
export const SCENES_PER_AGENT = 11;
/** The pack families that are not regions: a region id may not be one of them (the framework's own list is private, so it is repeated here and tested). */
export const RESERVED_IDS = ['uk', 'texas', 'world', 'core', 'seasons', 'sky', 'moments', 'rewards', 'mine'];

export const titleCase = (s) => String(s).split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
export const kb = (n) => (n / 1024).toFixed(1) + ' KB';
/** "country" -> "countries", "state" -> "states". */
export const plural = (w) => (/[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /(s|x|ch|sh)$/.test(w) ? w + 'es' : w + 's');

/* ---------------------------------------------------------------------------------------------
   Finding a region
   --------------------------------------------------------------------------------------------- */
export function regions(reg) { return (reg.R && reg.R.ANIM_REGIONS) || []; }
export function findRegion(reg, id) {
  const r = regions(reg).find(x => x.id === id);
  if (!r) throw new Error(`unknown region "${id}" (regions: ${regions(reg).map(x => x.id).join(', ') || 'none'})`);
  return r;
}
/** The travel city ids the world pack draws (a region must list the ones its rows map to in worldTravel). */
export function worldCities(reg) {
  const w = reg.R.animPack('world');
  return w ? [...new Set(w.items.map(i => i.city).filter(Boolean))] : [];
}

/* ---------------------------------------------------------------------------------------------
   The work a region needs
   --------------------------------------------------------------------------------------------- */
/**
 * What a region's tables ask for, in the order a batch of agents should draw it (group by group; inside a group each unit
 * followed by its big places, so one agent's batch is geographically and culturally coherent):
 *   unitsOpen   units that open (every unit but those with art elsewhere): each needs a full-screen signature and an element
 *   big         big places (kind 'big'): each needs a full-screen opening scene
 *   small       small places (kind 'small'): each needs an element
 *   keys        the scene keys: '<unitWord>:<CODE>' per unit that opens, 'place:<id>' per big place
 * A place of a pseudo unit (the US's DC: no unit art of its own) takes the first group.
 */
export function regionNeeds(region) {
  const word = region.unitWord, elsewhere = new Set(region.elsewhere);
  const groups = region.groups.map(group => ({ group, units: [], big: [], small: [], keys: [] }));
  const byGroup = new Map(groups.map(g => [g.group, g]));
  const unitName = (u) => (region.units[u] ? region.units[u][0] : u);
  const unitGroup = (u) => (region.units[u] ? byGroup.get(region.units[u][1]) : null) || groups[0];
  for (const code of Object.keys(region.units)) {
    if (elsewhere.has(code) || !Array.isArray(region.units[code])) continue;
    const g = byGroup.get(region.units[code][1]);
    if (g) g.units.push({ code, name: region.units[code][0], group: g.group, key: `${word}:${code}` });
  }
  for (const p of region.places) {
    if (!Array.isArray(p) || p.length < 6 || !p[5] || elsewhere.has(p[2])) continue;
    const [id, name, unit, lat, lon, kind] = p, g = unitGroup(unit);
    (kind === 'big' ? g.big : g.small).push({ id, name, unit, unitName: unitName(unit), kind, lat, lon, group: g.group, key: 'place:' + id });
  }
  for (const g of groups) {
    for (const u of g.units) {
      g.keys.push({ key: u.key, kind: 'unit', ref: u.code, name: u.name, group: g.group, unit: u.code, unitName: u.name });
      for (const b of g.big.filter(x => x.unit === u.code)) g.keys.push({ key: b.key, kind: 'place', ref: b.id, name: b.name, group: g.group, unit: b.unit, unitName: b.unitName, lat: b.lat, lon: b.lon });
    }
    for (const b of g.big.filter(x => !g.units.some(u => u.code === x.unit))) g.keys.push({ key: b.key, kind: 'place', ref: b.id, name: b.name, group: g.group, unit: b.unit, unitName: b.unitName, lat: b.lat, lon: b.lon });
  }
  const used = groups.filter(g => g.units.length || g.big.length || g.small.length);   // a group whose units all have art elsewhere (the US's texas) has no work
  return {
    groups: used, unitsOpen: used.flatMap(g => g.units), big: used.flatMap(g => g.big), small: used.flatMap(g => g.small),
    keys: used.flatMap(g => g.keys), elsewhere: [...elsewhere],
  };
}

/* ---------------------------------------------------------------------------------------------
   What a region has
   --------------------------------------------------------------------------------------------- */
/**
 * Coverage of a region, from the items its packs registered (not from the scene registry: a scene nobody built into a pack is not in the app).
 * `lint` is lintRegistry()'s result for the region's items, or null (not linted).
 * Returns {region, unitWord, groups: [{group, units, big, small, packId, counts}], packs, totals, missing, orphans, problems, starter, lint, complete}.
 *   unit row   {code, name, signature: {state, ref, bytes}, element: {state, ref, bytes}}   state: 'ok' | 'small' (an opening that is not full screen) | 'missing'
 *   place row  {id, name, unit, unitName, kind, item: {state, ref, bytes}}
 *   missing    [{need: 'scene' | 'element', key, name, group, state, why}]
 */
export function regionCoverage(reg, region, lint = null) {
  const needs = regionNeeds(region), F = region.fields, word = region.unitWord;
  const entries = reg.items().filter(e => region.owns(e.pack));
  const bytesOf = new Map();
  const size = (e) => { if (!bytesOf.has(e.ref)) bytesOf.set(e.ref, reg.html(e.item).length); return bytesOf.get(e.ref); };
  const sigs = new Map(), els = new Map(), cities = new Map();
  const add = (map, key, e) => { if (!map.has(key)) map.set(key, []); map.get(key).push(e); };
  for (const e of entries) {
    const it = e.item;
    if (it[F.kind] === word) add(it[F.signature] ? sigs : els, it[F.unit], e);
    else if (it[F.kind] === 'city') add(cities, it[F.place], e);
  }
  const rate = (list, wantFull, wantSlot) => {
    if (!list || !list.length) return { state: 'missing', ref: null, bytes: 0 };
    const good = list.find(e => e.slot === wantSlot && e.full === wantFull);
    if (good) return { state: 'ok', ref: good.ref, bytes: size(good) };
    return { state: 'small', ref: list[0].ref, bytes: size(list[0]) };
  };
  const missing = [];
  const groups = needs.groups.map(g => {
    const units = g.units.map(u => {
      const signature = rate(sigs.get(u.code), true, 'opening'), element = rate(els.get(u.code), false, 'symbol');
      if (signature.state !== 'ok') missing.push({ need: 'scene', key: u.key, name: u.name, group: g.group, state: signature.state, why: signature.state === 'small' ? 'a signature opening exists but is not a full-screen scene' : 'no full-screen signature opening' });
      if (element.state !== 'ok') missing.push({ need: 'element', key: u.key, name: u.name, group: g.group, state: element.state, why: 'no small element (symbol)' });
      return { code: u.code, name: u.name, key: u.key, signature, element };
    });
    const big = g.big.map(b => {
      const item = rate(cities.get(b.id), true, 'opening');
      if (item.state !== 'ok') missing.push({ need: 'scene', key: b.key, name: `${b.name} (${b.unitName})`, group: g.group, state: item.state, why: item.state === 'small' ? 'the place item is not a full-screen opening' : 'no full-screen opening scene' });
      return { id: b.id, name: b.name, unit: b.unit, unitName: b.unitName, kind: 'big', key: b.key, item };
    });
    const small = g.small.map(b => {
      const item = rate(cities.get(b.id), false, 'symbol');
      if (item.state !== 'ok') missing.push({ need: 'element', key: b.key, name: `${b.name} (${b.unitName})`, group: g.group, state: item.state, why: 'no small element (symbol)' });
      return { id: b.id, name: b.name, unit: b.unit, unitName: b.unitName, kind: 'small', key: b.key, item };
    });
    const sceneOk = units.filter(u => u.signature.state === 'ok').length + big.filter(b => b.item.state === 'ok').length;
    const elementOk = units.filter(u => u.element.state === 'ok').length + small.filter(b => b.item.state === 'ok').length;
    return { group: g.group, packId: `${region.id}-${g.group}`, units, big, small, counts: { scenes: sceneOk, scenesNeeded: units.length + big.length, elements: elementOk, elementsNeeded: units.length + small.length } };
  });
  // registered scenes no pack item carries: the group is wrong, the pack file does not call B.scenes(), or the unit has art elsewhere
  const orphans = [];
  for (const key of Object.keys(region.scenes)) {
    const [kind, ref] = key.split(':');
    const has = kind === 'place' ? (cities.get(ref) || []).some(e => e.full) : (sigs.get(ref) || []).some(e => e.full);
    if (!has) orphans.push({ key, why: 'a scene is registered but no pack item uses it (is the pack file of its group calling B.scenes()? is the key a unit that opens, or a big place?)' });
  }
  const packs = [...new Set(entries.map(e => e.pack))].sort().map(id => {
    const es = entries.filter(e => e.pack === id), scenes = es.filter(e => e.full), small = es.filter(e => !e.full);
    const by = (list) => list.reduce((b, e) => (size(e) > b.bytes ? { bytes: size(e), ref: e.ref } : b), { bytes: 0, ref: null });
    const row = { pack: id, items: es.length, scenes: scenes.length, small: small.length, sceneBytes: scenes.reduce((n, e) => n + size(e), 0), smallBytes: small.reduce((n, e) => n + size(e), 0), largestScene: by(scenes), largestSmall: by(small), lint: null };
    if (lint) {
      const rs = lint.results.filter(r => r.pack === id);
      row.lint = { items: rs.length, pass: rs.filter(r => !r.failures.length).length, fail: rs.filter(r => r.failures.length).length, waived: rs.filter(r => r.waived.length).length,
        failing: rs.filter(r => r.failures.length).map(r => ({ ref: r.ref, rules: r.failures.map(f => f.rule), messages: r.failures.map(f => f.message) })),
        cssFailures: (lint.packCss.find(p => p.pack === id) || { failures: [] }).failures.map(f => `[${f.rule}] ${f.message}`) };
    }
    return row;
  });
  const problems = region.check({ worldCities: worldCities(reg) });
  const starter = region.places.filter(p => Array.isArray(p) && /^example-/.test(p[0])).map(p => p[0]);
  const lintFail = packs.reduce((n, p) => n + (p.lint ? p.lint.fail + p.lint.cssFailures.length : 0), 0);
  const totals = {
    units: needs.unitsOpen.length, big: needs.big.length, small: needs.small.length, scenesNeeded: needs.keys.length,
    scenes: groups.reduce((n, g) => n + g.counts.scenes, 0), elementsNeeded: needs.unitsOpen.length + needs.small.length, elements: groups.reduce((n, g) => n + g.counts.elements, 0),
    items: entries.length, bytes: packs.reduce((n, p) => n + p.sceneBytes + p.smallBytes, 0), sceneBytes: packs.reduce((n, p) => n + p.sceneBytes, 0), smallBytes: packs.reduce((n, p) => n + p.smallBytes, 0),
    lintFailing: lintFail,
  };
  return {
    region: region.id, name: region.name, unitWord: word, groups, packs, totals, missing, orphans, problems, starter, elsewhere: needs.elsewhere,
    lint: lint ? { ran: true, failing: lintFail, stale: lint.staleWaivers || [] } : { ran: false, failing: 0, stale: [] },
    complete: !missing.length && !orphans.length && !problems.length && !starter.length && !lintFail,
  };
}

/* ---------------------------------------------------------------------------------------------
   Batches
   --------------------------------------------------------------------------------------------- */
/**
 * Split an ordered list into `of` consecutive batches of nearly equal size (default: ceil(length / size)). A cut that falls within 1 of a
 * group boundary (groupOf(item) changes) moves to it, so a batch stays inside one group when that costs little. Never empty, never more
 * batches than items. Returns an array of arrays covering every item exactly once.
 */
export function planBatches(list, { size = SCENES_PER_AGENT, of = 0, groupOf = () => '' } = {}) {
  const n = list.length;
  if (!n) return [];
  const m = Math.max(1, Math.min(n, of || Math.ceil(n / size)));
  const cuts = [];
  for (let i = 1; i < m; i++) {
    const ideal = Math.round((i * n) / m);
    let cut = ideal;
    for (let d = 0; d <= 1; d++) {
      const near = [ideal - d, ideal + d].find(c => c > 0 && c < n && groupOf(list[c - 1]) !== groupOf(list[c]));
      if (near != null) { cut = near; break; }
    }
    const lo = (cuts[cuts.length - 1] || 0) + 1, hi = n - (m - i);
    cuts.push(Math.min(hi, Math.max(lo, cut)));
  }
  const out = []; let from = 0;
  for (const c of [...cuts, n]) { out.push(list.slice(from, c)); from = c; }
  return out;
}

/* ---------------------------------------------------------------------------------------------
   Templates
   --------------------------------------------------------------------------------------------- */
export function readTemplate(name, dir = TEMPLATES_DIR) {
  const p = join(dir, name);
  if (!existsSync(p)) throw new Error(`template not found: ${p}`);
  return readFileSync(p, 'utf8');
}
const PLACEHOLDER = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;
/** The placeholder names a template uses. */
export function templatePlaceholders(text) { return [...new Set([...String(text).matchAll(PLACEHOLDER)].map(m => m[1]))]; }
/** Replace every {{name}} with vars[name]. A placeholder without a value is a bug in the template or the caller: it throws instead of printing "undefined". */
export function renderTemplate(text, vars, name = 'template') {
  return String(text).replace(PLACEHOLDER, (all, key) => {
    if (!Object.prototype.hasOwnProperty.call(vars, key) || vars[key] == null) throw new Error(`${name}: no value for {{${key}}}`);
    return String(vars[key]);
  });
}

/* ---------------------------------------------------------------------------------------------
   Cultural and representation care
   --------------------------------------------------------------------------------------------- */
/** The rules every brief carries, for every region (the Asia pack's care rule, made general). */
export const CARE_RULES = [
  'No text of any kind: no lettering, signs, numerals, pseudo-script or marks that read as letters. The markup sanitiser rejects <text>; review rejects letter-like shapes.',
  'No flags, no maps, no borders, no national or political emblems. A place is shown as landscape and architecture, never as a political entity.',
  'No political or military symbols: no coats of arms, party or state insignia, uniforms, weapons, war vehicles, parades or monuments to a conflict.',
  'No people: no portraits, faces, crowds or figures of real or identifiable persons. Life in a scene comes from animals, boats, birds, ordinary vehicles, lights and weather.',
  'No holy figures, deities or prophets, and no religious statues or icons. Sacred architecture (a temple, a mosque, a church, a shrine) may be drawn respectfully as architecture, never as the butt of a joke or as a prop.',
  'Disputed, contested or sensitive places stay neutral: draw the landscape or the skyline, never a claim. When in doubt, choose the landscape.',
  'No stereotypes or caricature: draw what the people who live there are proud of (a landmark, a landscape, a craft, a food, a plant, an animal), at their best. No tourist-brochure cliche stacked with every symbol of the place at once.',
  'No real brands, logos or trademarked characters, and no copyrighted artwork.',
  'Be factual: the right season, the right climate, the right architecture and plants for the place and the time of day. When you are not sure what something looks like, draw something you are sure of.',
];

/**
 * The care text of a brief: CARE_RULES, plus the region's own notes when docs/dev/<ID>_PACK.md has a heading that starts with
 * "Cultural care" (the scaffold writes one): the lines under it, up to the next heading.
 */
export function careFor(root, region) {
  let own = '';
  const doc = join(root, 'docs', 'dev', `${region.id.toUpperCase()}_PACK.md`);
  if (existsSync(doc)) {
    const lines = readFileSync(doc, 'utf8').split(/\r?\n/);
    const at = lines.findIndex(l => /^#{2,4}\s+cultural care/i.test(l));
    if (at >= 0) {
      const body = [];
      for (let i = at + 1; i < lines.length && !/^#{1,4}\s/.test(lines[i]); i++) body.push(lines[i]);
      own = body.join('\n').replace(/<!--[\s\S]*?-->/g, '').trim();   // the scaffold's placeholder is an HTML comment
    }
  }
  const generic = CARE_RULES.map(r => `- ${r}`).join('\n');
  const mine = own ? `\n\nSpecific to ${region.name} (from docs/dev/${region.id.toUpperCase()}_PACK.md):\n\n${own}` : '';
  return generic + mine;
}
