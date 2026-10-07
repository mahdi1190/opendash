// Region helpers for the region commands of tools/anim-pack.mjs (tools/lib/anim-cmd/status.mjs, brief.mjs, new.mjs).
// Node >= 20, no dependencies. A REGION is what src/app/71-anim-0region.js animRegionDefine() makes (ANIM_REGIONS); this file turns
// one into (a) the WORK it needs: units that open, big and small places, scene keys, groups, batches for agents, and (b) what it HAS:
// the items its packs registered, their bytes, and what is missing. Also the template engine of the agent briefs and the scaffold
// (tools/lib/anim-templates/*).
//
//   regions(reg) / findRegion(reg, id)       the regions of a loaded registry (loadRegistry(...).R.ANIM_REGIONS)
//   regionNeeds(region)                      the work: {groups: [{group, units, big, small, keys}], unitsOpen, big, small, keys, elsewhere}
//   regionCoverage(reg, region, lint?, {travel?})  what exists and what is missing, per group and per pack (lint = lintRegistry() result or null); travel adds the travel-table gaps
//   travelGaps(reg, region)                  the travel cities of the region's countries that have no row, and how far every one is from its nearest row (the reach check)
//   planBatches(list, {size, of, groupOf})   consecutive, balanced batches that never split a group more than they must
//   readTemplate(name) / renderTemplate(text, vars, name) / templatePlaceholders(text)
//   CARE_RULES / careFor / careInfo           the cultural and representation care rules every brief carries (and the region's own notes)
//   varietyOf(needs)                          the time of day, season (by latitude), scene type, palette family (and element motif kind, colour) assigned to every key
//   suggestionsInfo / applySuggestions        the region doc's "Scene suggestions" section: per-key overrides of that rotation (docSection reads any section of the doc)
//   scaffoldVars(region) / sceneStubText(region, n)   the template variables of a region and the text of an empty scene file (brief makes the stubs of the batches that have none)
//   sceneChanges / fileProblems / sceneFilesOf   what a scene file registers, and what is wrong with it (a key that does not exist, a duplicate key, dead art)
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TEMPLATES_DIR = join(HERE, 'anim-templates');
/** About this many full-screen scenes per agent: a scene at the median bar is about 23 KB of drawing code plus four renders to look at, so more than this tempts an agent to rush the last ones. */
export const SCENES_PER_AGENT = 7;
/** The pack families that are not regions: a region id may not be one of them (the framework's own list is private, so it is repeated here and tested). */
export const RESERVED_IDS = ['uk', 'texas', 'world', 'core', 'seasons', 'sky', 'moments', 'rewards', 'mine'];
/** The words a unit may not be called: the framework's own kinds (repeated here and tested against the framework's list). */
export const RESERVED_UNIT_WORDS = ['place', 'city', 'big', 'small', 'signature', 'element'];

/** The scene file the agent of batch n owns (with a group filter the group is in the name, so two filtered plans never share a file). */
export const sceneFileOf = (id, n, group) => `src/app/71-anim-region-${id}-scenes-${group ? group + '-' : ''}${n}.js`;
/** The pack file of a group. */
export const packFileOf = (id, group) => `src/app/72-anim-pack-${id}-${group}.js`;
/** The file a region's config lives in: the scaffold's name, or the legacy name of the US and Asia. */
export function configFileOf(root, id) {
  for (const f of [`src/app/71-anim-region-${id}.js`, `src/app/71-anim-${id}.js`]) if (existsSync(join(root, f))) return f;
  return `src/app/71-anim-region-${id}.js`;
}
/** A JavaScript single-quoted string literal (the config and pack files are written in single quotes). */
export const jsq = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
export const titleCase = (s) => String(s).split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
export const kb = (n) => (n / 1024).toFixed(1) + ' KB';
/** "country" -> "countries", "state" -> "states". */
export const plural = (w) => (/[^aeiou]y$/.test(w) ? w.slice(0, -1) + 'ies' : /(s|x|ch|sh)$/.test(w) ? w + 'es' : w + 's');

/** The rubric pass mark (references/rubric.md, section 2): the briefs state it, the tests pin it to the rubric. */
export const RUBRIC_PASS = Object.freeze({ score: 18, of: 20, core: Object.freeze({ scene: ['R1', 'R2', 'R9', 'R11', 'R16', 'R19', 'R20'], item: ['I1', 'I2', 'I6', 'I11', 'I15', 'I17'] }) });

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
  // a unit has no position of its own: the mean of its rows says which hemisphere and climate band it is in (the season suggestion needs it)
  const meanOf = (code) => {
    const mine = region.places.filter(p => Array.isArray(p) && p[2] === code && Number.isFinite(p[3]) && Number.isFinite(p[4]));
    return mine.length ? { lat: +(mine.reduce((n, p) => n + p[3], 0) / mine.length).toFixed(2), lon: +(mine.reduce((n, p) => n + p[4], 0) / mine.length).toFixed(2) } : {};
  };
  for (const g of groups) {
    for (const u of g.units) {
      g.keys.push({ key: u.key, kind: 'unit', ref: u.code, name: u.name, group: g.group, unit: u.code, unitName: u.name, ...meanOf(u.code) });
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
const _travelTables = new Map();
/** The travel tables of a checkout (src/app/69-travel-data.js: trPlaceTables()), or null when the file is not there (a bare temp checkout). Read once per root. */
export function travelTables(root) {
  if (_travelTables.has(root)) return _travelTables.get(root);
  const file = join(root, 'src', 'app', '69-travel-data.js');
  let tables = null;
  if (existsSync(file)) { try { tables = new Function(readFileSync(file, 'utf8') + '\nreturn trPlaceTables();')(); } catch { tables = null; } }
  _travelTables.set(root, tables);
  return tables;
}
const rad = Math.PI / 180;
const kmApart = (la1, lo1, la2, lo2) => { const a = Math.sin((la2 - la1) * rad / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin((lo2 - lo1) * rad / 2) ** 2; return 12742 * Math.asin(Math.sqrt(a)); };
/**
 * What a TRIP does in this region, from the travel tables (the cities of the region's countries): while travelling only travelRow(ctx.city) is used, so a travel
 * city that is not a row of the region matches nothing (the traveller gets no opening). Returns null when the tables are not available, else
 *   {countries, cities, withRow (rows, the ones the world pack draws included: drawnByWorld of them), noRow: [{id, name, cc, lat, lon, pop, km, unit, inReach, row}], reach: {unitKm, farthest, beyond}}
 *   noRow     the travel cities of the region's countries with no row (and not drawn by the world pack), most populous first; km / unit = the nearest row of the region and its
 *             unit, inReach = within unitKm; row = a line to paste into the places table (an anchor: add the art kind by hand)
 *   reach     the coverage line: how far the farthest travel city of the region's countries is from the nearest row, and the cities beyond unitKm (home positions there are in no unit)
 * The countries are the codes the region's units carry (region.countryOf): a region of states has one (US), a region of countries has them all.
 */
export function travelGaps(reg, region) {
  const T = travelTables(reg.root);
  if (!T || !region.countryOf) return null;
  const countries = [...new Set(Object.keys(region.units).map(u => String(region.countryOf(u)).toUpperCase()).filter(c => /^[A-Z]{2}$/.test(c) && c !== 'XX'))].sort();
  const want = new Set(countries), rows = region.places.filter(p => Array.isArray(p) && p.length >= 6 && Number.isFinite(p[3]) && Number.isFinite(p[4]));
  const have = new Set(rows.map(p => region.travelId(p))), world = new Set(region.worldTravel);
  const mine = T.cities.filter(c => want.has(String(c.cc).toUpperCase()));
  const near = (c) => { let best = null, bd = Infinity; for (const p of rows) { const d = kmApart(c.lat, c.lon, p[3], p[4]); if (d < bd) { bd = d; best = p; } } return { row: best, km: bd }; };
  const noRow = [], dist = [];
  for (const c of mine) {
    const n = near(c);
    dist.push({ id: c.id, name: c.name, cc: c.cc, km: n.km, pop: c.pop });
    if (have.has(c.id) || world.has(c.id)) continue;
    const idRe = String(c.cc).toLowerCase();
    const rowId = c.id.endsWith('-' + idRe) ? c.id.slice(0, -(idRe.length + 1)) : c.id;
    noRow.push({ id: c.id, name: c.name, cc: c.cc, lat: c.lat, lon: c.lon, pop: c.pop, km: Number.isFinite(n.km) ? Math.round(n.km) : null, unit: n.row ? n.row[2] : '', inReach: n.km <= region.unitKm,
      row: `[${jsq(rowId)}, ${jsq(c.name)}, ${jsq(n.row && n.km <= region.unitKm ? n.row[2] : '??')}, ${c.lat}, ${c.lon}, '']` });
  }
  noRow.sort((a, b) => b.pop - a.pop || (a.id < b.id ? -1 : 1));
  dist.sort((a, b) => b.km - a.km);
  const beyond = dist.filter(d => d.km > region.unitKm);
  return { countries, cities: mine.length, withRow: mine.filter(c => have.has(c.id)).length, drawnByWorld: mine.filter(c => world.has(c.id)).length, noRow,
    reach: { unitKm: region.unitKm, farthest: dist[0] ? { id: dist[0].id, name: dist[0].name, km: Math.round(dist[0].km), pop: dist[0].pop } : null, beyond: beyond.map(d => ({ id: d.id, name: d.name, km: Math.round(d.km), pop: d.pop })) } };
}

/**
 * Coverage of a region, from the items its packs registered (not from the scene registry: a scene nobody built into a pack is not in the app).
 * `lint` is lintRegistry()'s result for the region's items, or null (not linted).
 * `travel: true` also computes the travel-table gaps (travelGaps: the trips that match nothing, the farthest city from any row; it reads 69-travel-data.js, so it is opt-in).
 * Returns {region, unitWord, groups: [{group, units, big, small, packId, counts}], packs, totals, missing, orphans, problems, overlaps, duplicates, starter, lint, declared, travel, complete}.
 *   declared   the region's own `complete` flag (config: complete: true | false; the scaffold writes false); `complete` below is what the tables and packs actually are
 *   overlaps   region.check()'s 'overlap: ...' sentences: a row inside another region's reach, or another region's row inside this one's (the border cases)
 *   starter    the scaffold's example rows ("example-...") and the placeholder country XX (a region whose units are not countries); duplicates [{key, count, files}]: a scene key registered twice
 *   unit row   {code, name, signature: {state, ref, bytes}, element: {state, ref, bytes}}   state: 'ok' | 'small' (an opening that is not full screen) | 'missing'
 *   place row  {id, name, unit, unitName, kind, item: {state, ref, bytes}}
 *   missing    [{need: 'scene' | 'element', key, name, group, state, why}]
 */
export function regionCoverage(reg, region, lint = null, { travel = false } = {}) {
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
  const all = region.check({ worldCities: worldCities(reg) });
  const problems = all.filter(p => !/^starter:|^DUPLICATE SCENE KEY |^overlap: /.test(p));
  const overlaps = all.filter(p => /^overlap: /.test(p)).map(p => p.replace(/^overlap: /, ''));
  const duplicates = (region.sceneDuplicates ? region.sceneDuplicates() : []).map(([key, count]) => ({ key, count, files: sceneFilesOf(reg, key) }));
  // starter data: the scaffold's example rows, and the placeholder country (check() says so: "starter: ...")
  const starter = [...region.places.filter(p => Array.isArray(p) && /^example-/.test(p[0])).map(p => p[0]), ...all.filter(p => /^starter:/.test(p)).map(p => p.replace(/^starter: /, ''))];
  const lintFail = packs.reduce((n, p) => n + (p.lint ? p.lint.fail + p.lint.cssFailures.length : 0), 0);
  const totals = {
    units: needs.unitsOpen.length, big: needs.big.length, small: needs.small.length, scenesNeeded: needs.keys.length,
    scenes: groups.reduce((n, g) => n + g.counts.scenes, 0), elementsNeeded: needs.unitsOpen.length + needs.small.length, elements: groups.reduce((n, g) => n + g.counts.elements, 0),
    items: entries.length, bytes: packs.reduce((n, p) => n + p.sceneBytes + p.smallBytes, 0), sceneBytes: packs.reduce((n, p) => n + p.sceneBytes, 0), smallBytes: packs.reduce((n, p) => n + p.smallBytes, 0),
    lintFailing: lintFail,
  };
  return {
    region: region.id, name: region.name, unitWord: word, groups, packs, totals, missing, orphans, problems, overlaps, duplicates, starter, elsewhere: needs.elsewhere, declared: !!region.complete,
    travel: travel ? travelGaps(reg, region) : null,
    lint: lint ? { ran: true, failing: lintFail, stale: lint.staleWaivers || [] } : { ran: false, failing: 0, stale: [] },
    complete: !missing.length && !orphans.length && !problems.length && !overlaps.length && !duplicates.length && !starter.length && !lintFail,
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

/** The variables the scaffold templates share, from a region's plain facts ({id, name, unitWord, groups}); `new` calls it before the region exists, `brief` for a region that does. */
export function scaffoldVars({ id, name, unitWord, groups }) {
  return { id, ID: id.toUpperCase(), name, name_js: jsq(name), unit_word: unitWord, unit_word_plural: plural(unitWord), groups_list: groups.map(g => `'${g}'`).join(', ') };
}
/** The text of an empty scene file (the scaffold's stub: header, rules, the IIFE with the kit): batch n of the region, `file` is its path for the header. */
export function sceneStubText(region, n) {
  return renderTemplate(readTemplate('region-scenes.js.tpl'), { ...scaffoldVars({ id: region.id, name: region.name, unitWord: region.unitWord, groups: region.groups }), n }, 'region-scenes.js.tpl');
}

/* ---------------------------------------------------------------------------------------------
   Cultural and representation care
   --------------------------------------------------------------------------------------------- */
/** The rules every brief carries, for every region (the Asia pack's care rule, made general). They override anything an older scene shows. */
export const CARE_RULES = [
  'No text of any kind: no lettering, signs, numerals, pseudo-script or marks that read as letters. The lint rejects <text> (its `structure` rule); review rejects letter-like shapes.',
  'No flags, no maps, no borders, no national or political emblems. A place is shown as landscape and architecture, never as a political entity. A few older scenes of the United States and Asia still carry flags: these care rules override anything you see in older scenes, never imitate it.',
  'No political or military symbols: no coats of arms, party or state insignia, uniforms, weapons, war vehicles, parades or monuments to a conflict.',
  'People: no portraits, faces, crowds or figures of real or identifiable persons, and no person as the subject. The one allowed form is a tiny anonymous silhouette without features, a few pixels tall, used as a scale cue (a figure on a pier, a walker on a dune): a handful per scene at most, never a group that reads as a crowd. Life in a scene comes from animals, boats, birds, ordinary vehicles, lights and weather.',
  'No holy figures, deities or prophets, and no religious statues or icons. Sacred architecture (a temple, a mosque, a church, a shrine) may be drawn respectfully as architecture, never as the butt of a joke or as a prop.',
  'Disputed, contested or sensitive places stay neutral: draw the landscape or the skyline, never a claim. When in doubt, choose the landscape.',
  'No stereotypes or caricature: draw what the people who live there are proud of (a landmark, a landscape, a craft, a food, a plant, an animal), at their best. No tourist-brochure cliche stacked with every symbol of the place at once.',
  'No real brands, logos or trademarked characters, and no copyrighted artwork.',
  'Be factual: the right season, climate, architecture and plants for the place and the time of day. When you are not sure what something looks like, draw something you are sure of.',
];

/**
 * A section of the region's doc (docs/dev/<ID>_PACK.md): the text under the first heading, of any level, whose text matches `re`. The section runs to the next heading of the
 * SAME OR A HIGHER level (a "###" inside a "##" section belongs to it); "#" lines inside a code fence are not headings; HTML comments (the scaffold's placeholders and
 * examples) count as empty. Returns {state, own, doc}: state 'ok' (text found), 'skeleton' (the section is there but empty or still a placeholder comment),
 * 'no-section' (the doc has no such heading) or 'no-doc' (there is no doc).
 */
export function docSection(root, region, re) {
  const rel = `docs/dev/${region.id.toUpperCase()}_PACK.md`, doc = join(root, 'docs', 'dev', `${region.id.toUpperCase()}_PACK.md`);
  if (!existsSync(doc)) return { state: 'no-doc', own: '', doc: rel };
  const lines = readFileSync(doc, 'utf8').split(/\r?\n/);
  let fence = '', at = -1, level = 0;
  const heading = (l) => { const m = /^(#{1,6})\s+(.*\S)\s*$/.exec(l); return m ? { level: m[1].length, text: m[2] } : null; };
  const fenceOf = (l) => { const m = /^\s{0,3}(`{3,}|~{3,})/.exec(l); return m ? m[1][0] : ''; };
  for (let i = 0; i < lines.length; i++) {
    const f = fenceOf(lines[i]);
    if (f) { fence = fence === f ? '' : fence || f; continue; }
    if (fence) continue;
    const h = heading(lines[i]);
    if (h && re.test(h.text)) { at = i; level = h.level; break; }
  }
  if (at < 0) return { state: 'no-section', own: '', doc: rel };
  const body = []; fence = '';
  for (let i = at + 1; i < lines.length; i++) {
    const f = fenceOf(lines[i]);
    if (f) fence = fence === f ? '' : fence || f;
    else if (!fence) { const h = heading(lines[i]); if (h && h.level <= level) break; }
    body.push(lines[i]);
  }
  const own = body.join('\n').replace(/<!--[\s\S]*?-->/g, '').trim();   // the scaffold's placeholder is an HTML comment
  return { state: own ? 'ok' : 'skeleton', own, doc: rel };
}

/** The region's own care notes: the "Cultural care" section of docs/dev/<ID>_PACK.md (docSection). Returns {state, own, doc}. */
export function careInfo(root, region) { return docSection(root, region, /^cultural care\b/i); }

/** The care text of a brief: CARE_RULES, plus the region's own notes (careInfo). */
export function careFor(root, region) {
  const { own, doc } = careInfo(root, region);
  const generic = CARE_RULES.map(r => `- ${r}`).join('\n');
  return own ? `${generic}\n\nSpecific to ${region.name} (from ${doc}):\n\n${own}` : generic;
}

/* ---------------------------------------------------------------------------------------------
   Variety: what each key is suggested to be, so that parallel agents do not all draw the same picture
   --------------------------------------------------------------------------------------------- */
const TIMES = ['sunrise', 'morning', 'midday', 'late afternoon', 'golden hour', 'dusk', 'night'];
/** The app's calendar (animSeasonOf in 71-anim-registry.js) is the northern one: spring Mar-May, summer Jun-Aug, autumn Sep-Nov, winter Dec-Feb. */
export const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
/** Inside the tropics (|latitude| below this) there are no four seasons: the suggestion is `any`. */
export const TROPIC_LAT = 23.5;
const UNIT_TYPES = ['mountains', 'coast', 'desert or dry plain', 'forest', 'farmland', 'lake or river', 'monument or landmark', 'island or archipelago', 'canyon, cliffs or hills'];
const PLACE_TYPES = ['skyline', 'harbour or waterfront', 'bridge', 'monument or landmark', 'old town or temple town', 'lights at night', 'skyline across water'];
const PALETTES = ['warm amber and rose', 'cool blue and violet', 'teal and green', 'red and orange', 'slate and silver', 'indigo and gold', 'pink and violet'];
const MOTIFS = ['animal', 'plant', 'food', 'craft', 'instrument', 'building detail', 'natural feature'];
const SWATCHES = ['blue', 'indigo', 'violet', 'pink', 'red', 'orange', 'amber', 'green', 'teal', 'slate'];
/**
 * The suggested season of a picture at latitude `lat`, from the rotation's northern-named season `base`: {season, label}.
 *   season  what the PICTURE shows there (the local season): `any` inside the tropics, else the rotation's word
 *   label   what to write in the entry's `season:` field. That field is only a LABEL (the gallery card and the "picked for <season>" note read it; a region
 *           item plays wherever the user is, in any month: animSpecialPick never looks at it) and the app's calendar is the northern one, so in the
 *           southern hemisphere the label is the app-calendar season of the months the picture is true in: local autumn (March to May) is `spring`.
 */
export function seasonFor(lat, base) {
  if (!Number.isFinite(lat)) return { season: base, label: base };
  if (Math.abs(lat) < TROPIC_LAT) return { season: 'any', label: 'any' };
  if (lat < 0) return { season: base, label: SEASONS[(SEASONS.indexOf(base) + 2) % 4] };
  return { season: base, label: base };
}
/** What `season` means, as the briefs and plan.json state it. */
export const SEASON_NOTE = `**season**: the season of the PICTURE at that place, a suggestion. The \`season:\` field of an entry is only a LABEL: it names the gallery card and the "picked for <season>" note and does NOT decide when the scene plays (a region scene plays wherever the user is, in any month). Use \`any\` unless the picture really shows one season; the tropics (|latitude| < ${TROPIC_LAT}) have no four seasons, so the suggestion there is \`any\` and a scene there must not show autumn leaves or snow. The app's calendar is the northern one (spring Mar-May, summer Jun-Aug, autumn Sep-Nov, winter Dec-Feb): in the southern hemisphere the suggestion is the LOCAL season and the label to write is the app-calendar season of those months, shown in the cell as "(season: '...')": a picture of local autumn (March to May) is labelled \`spring\`.`;
/**
 * A suggestion for every scene key (time, season, type, palette) and element (motif kind, colour) of a region, from a fixed rotation over the whole region's key
 * list: the keys of different batches get different suggestions without the agents knowing about each other (a list of subjects already drawn is a snapshot and cannot
 * do that). The agent may deviate when the place demands it (a desert has no forest) with one line of reason in its report. The SEASON follows the latitude of the key
 * (a place's own, a unit's mean of its rows): `any` in the tropics, the same words in the north, the local season with the flipped label in the south (seasonFor).
 * Returns {scene: Map key -> {time, season, seasonLabel, type, palette}, element: Map key -> {motif, colour}}; `needs` is regionNeeds(region).
 */
export function varietyOf(needs) {
  const scene = new Map(), element = new Map();
  needs.keys.forEach((k, i) => {
    const cyc = Math.floor(i / 7), s = seasonFor(k.lat, SEASONS[(i + cyc) % 4]);
    scene.set(k.key, { time: TIMES[i % 7], season: s.season, seasonLabel: s.label, type: (k.kind === 'unit' ? UNIT_TYPES : PLACE_TYPES)[(i + cyc) % (k.kind === 'unit' ? 9 : 7)], palette: PALETTES[(i + 2 * cyc + 1) % 7] });
  });
  let j = 0;
  for (const g of needs.groups) for (const u of g.units) { element.set(u.key, { motif: MOTIFS[j % 7], colour: SWATCHES[(j * 3 + Math.floor(j / 7)) % 10] }); j++; }
  for (const g of needs.groups) for (const b of g.small) { element.set(b.key, { motif: MOTIFS[j % 7], colour: SWATCHES[(j * 3 + Math.floor(j / 7)) % 10] }); j++; }
  return { scene, element };
}

/** The fields a "Scene suggestions" line may set: scenes take time, season, type and palette; elements motif and colour. */
export const SUGGEST_FIELDS = Object.freeze(['time', 'season', 'type', 'palette', 'motif', 'colour']);
export const ELEMENT_COLOURS = SWATCHES;
/**
 * The region's own overrides of the rotation: the "Scene suggestions" section of docs/dev/<ID>_PACK.md, one line per key,
 *   - place:melbourne: type = laneways and trams; palette = red and orange
 *   - country:AU: season = any; type = coast; motif = plant; colour = green
 * The rotation knows nothing about a place (a "bridge" for a city with none, a "craft" the care notes forbid): the orchestrator says what to use instead ONCE, here, and every
 * brief carries it, so no agent has to spend a report line on overriding the tool. Returns {state, byKey: {key: {field: value}}, problems: [sentence]}.
 */
export function suggestionsInfo(root, region) {
  const sec = docSection(root, region, /^scene suggestions\b/i), byKey = {}, problems = [];
  if (sec.state !== 'ok') return { state: sec.state, byKey, problems, doc: sec.doc };
  for (const raw of sec.own.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^[-*]\s+`?([a-z]+:[^`:\s]+)`?\s*:\s*(.+)$/.exec(line);
    if (!m) { problems.push(`${sec.doc}, "Scene suggestions": not a suggestion line (expected "- <key>: field = value; field = value"): ${line.slice(0, 80)}`); continue; }
    const set = (byKey[m[1]] = byKey[m[1]] || {});
    for (const part of m[2].split(';').map(x => x.trim()).filter(Boolean)) {
      const f = /^([a-z]+)\s*=\s*(.+)$/.exec(part);
      if (!f || !SUGGEST_FIELDS.includes(f[1])) { problems.push(`${sec.doc}, "Scene suggestions", ${m[1]}: "${part.slice(0, 40)}" is not one of ${SUGGEST_FIELDS.join(', ')} (field = value)`); continue; }
      const v = f[2].trim();
      if (f[1] === 'season' && !['any', ...SEASONS].includes(v)) { problems.push(`${sec.doc}, ${m[1]}: season = ${v} is not any, spring, summer, autumn or winter`); continue; }
      if (f[1] === 'colour' && !SWATCHES.includes(v)) { problems.push(`${sec.doc}, ${m[1]}: colour = ${v} is not one of ${SWATCHES.join(', ')}`); continue; }
      set[f[1]] = v;
    }
  }
  return { state: 'ok', byKey, problems, doc: sec.doc };
}
/** Apply suggestionsInfo's overrides to varietyOf's maps (in place). Returns {applied: n lines, unknown: [keys the region does not have], problems}. A season override is the picture's season; the label follows from the key's latitude (seasonFor). */
export function applySuggestions(variety, info, needs) {
  const lat = new Map(needs.keys.map(k => [k.key, k.lat])), unknown = [];
  let applied = 0;
  for (const [key, set] of Object.entries(info.byKey)) {
    const sc = variety.scene.get(key), el = variety.element.get(key);
    if (!sc && !el) { unknown.push(key); continue; }
    applied++;
    if (sc) {
      for (const f of ['time', 'type', 'palette']) if (set[f]) sc[f] = set[f];
      if (set.season) { const r = set.season === 'any' ? { season: 'any', label: 'any' } : seasonFor(lat.get(key), set.season); sc.season = r.season; sc.seasonLabel = r.label; }
    }
    if (el) for (const f of ['motif', 'colour']) if (set[f]) el[f] = set[f];
  }
  return { applied, unknown, problems: info.problems };
}

/* ---------------------------------------------------------------------------------------------
   What a scene file registers, and what is wrong with it
   --------------------------------------------------------------------------------------------- */
/** The scene keys with no pack item that carries them (dead art): [{region, key, why}]. */
export function regionOrphans(reg, region) {
  const F = region.fields, word = region.unitWord, sigs = new Set(), cities = new Set();
  for (const e of reg.items()) {
    if (!region.owns(e.pack) || !e.full) continue;
    const it = e.item;
    if (it[F.kind] === word && it[F.signature]) sigs.add(it[F.unit]); else if (it[F.kind] === 'city') cities.add(it[F.place]);
  }
  return Object.keys(region.scenes).filter(key => { const [kind, ref] = key.split(':'); return kind === 'place' ? !cities.has(ref) : !sigs.has(ref); })
    .map(key => ({ region: region.id, key, why: 'a scene is registered but no pack item uses it (is the pack file of its group calling B.scenes()? is the key a unit that opens, or a big place?)' }));
}
/** The scenes a loaded registry has that `baseline` (the registry without some files) lacks or has drawn differently: [{region, key, entry, state: 'new' | 'changed'}]. */
export function sceneChanges(reg, baseline) {
  const out = [];
  for (const region of regions(reg)) {
    const was = baseline ? regions(baseline).find(r => r.id === region.id) : null;
    for (const [key, e] of Object.entries(region.scenes)) {
      const old = was && was.scenes[key];
      if (!old) out.push({ region: region.id, key, entry: e, state: 'new' });
      else if (String(old.svg) !== String(e.svg) || old.label !== e.label) out.push({ region: region.id, key, entry: e, state: 'changed' });
    }
  }
  return out;
}
/** The source files that mention a scene key as a literal (key: 'country:KE'), for naming who owns a duplicate. */
export function sceneFilesOf(reg, key) {
  const re = new RegExp(`['"]${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`);
  return (reg.sources || []).filter(f => /^71-/.test(f.name) && re.test(f.text)).map(f => f.name);
}
/**
 * What is wrong with the scene files a command was given ([] = sound): a key that is not a key of the region (a unit that does not exist, a place that is not big),
 * a scene no pack item uses (dead art) and a key registered twice (the last registration wins and silently hides the other). `baseline` is the registry without the files.
 */
export function fileProblems(reg, baseline, files = []) {
  const out = [], changed = sceneChanges(reg, baseline), names = new Set(files.map(f => String(f).replace(/^.*[\\/]/, '')));
  const orphans = new Map();
  for (const region of regions(reg)) {
    for (const o of regionOrphans(reg, region)) orphans.set(`${region.id}|${o.key}`, o);
    const problems = region.check({ worldCities: worldCities(reg) });
    for (const c of changed.filter(x => x.region === region.id)) {
      for (const p of problems) if (p.startsWith(c.key + ':')) out.push(`${c.key} (region ${region.id}): ${p.slice(c.key.length + 2)}. A scene key is a key of the region: "${region.unitWord}:<CODE>" of a unit that opens, or "place:<id>" of a big place (node tools/anim-pack.mjs status ${region.id} lists them)`);
      const o = orphans.get(`${region.id}|${c.key}`);
      if (o && !problems.some(p => p.startsWith(c.key + ':'))) out.push(`${c.key} (region ${region.id}): ${o.why}`);
    }
    for (const [key, n] of region.sceneDuplicates ? region.sceneDuplicates() : []) {
      const owners = sceneFilesOf(reg, key);
      if (changed.some(c => c.region === region.id && c.key === key) || owners.some(f => names.has(f))) out.push(`DUPLICATE SCENE KEY ${key} (region ${region.id}) is registered ${n} times${owners.length ? ', in ' + owners.join(', ') : ''}: the last registration wins and hides the others. Draw only the keys of your batch, each once`);
    }
  }
  return out;
}
