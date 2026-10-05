// node tools/anim-pack.mjs new <id> "<Name>" [--unit-word country|state|province|...] [--groups a,b,c] [--root dir]
// Scaffold a new region: the config (starter tables), an empty scene file with the IIFE pattern, one pack file per group, the generated
// data-driven test, and the doc skeleton. Refuses to overwrite anything. Prints the MODULES.md row and the next steps.
//
// DECISION: the scaffold ships NO example art. A scene or an icon "deliberately minimal but lint-valid" would be the thing an agent copies,
// and a minimal scene cannot pass the strict lint anyway; any art in the starter files would also go live in the app if it were forgotten.
// So the starter rows are in the open sea (nothing plays anywhere real), the pack files register nothing until they have an item, and the
// generated test FAILS until every unit, big place and small place has its art: a half-built region must not be committable, and
// `node tools/anim-pack.mjs status <id>` is the progress bar. The config loads and region.check() is empty from the first second.
import { existsSync, mkdirSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadRegistry } from '../anim-render.mjs';
import { regions, worldCities, readTemplate, renderTemplate, titleCase, plural, RESERVED_IDS, RESERVED_UNIT_WORDS } from '../anim-region.mjs';

const MAX_GROUPS = 8;
const NUMBER_WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'];
const jsq = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const cap = (s) => s[0].toUpperCase() + s.slice(1);

/** Where the starter rows go when nothing else is known (the open South Atlantic), and the places `new` tries when another region still has example rows: all open sea. */
export const STARTER_BASE = Object.freeze({ lat: -50, lon: -25 });
const STARTER_BASES = [-50, -44, -56].flatMap(lat => [-25, 5, 35, 65].map(lon => ({ lat, lon })));
const kmBetween = (la1, lo1, la2, lo2) => { const r = Math.PI / 180, a = Math.sin((la2 - la1) * r / 2) ** 2 + Math.cos(la1 * r) * Math.cos(la2 * r) * Math.sin((lo2 - lo1) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(a)); };
/**
 * The first starter position (of STARTER_BASES) whose rows are at least 1,500 km from every row of every region already defined, so two scaffolds
 * made one after the other (each still full of "example-" rows) never sit inside each other's reach and trip the no-overlap test of tests/region-framework.test.mjs.
 */
export function starterBaseFor(reg, groups, unitWord) {
  const others = regions(reg).flatMap(r => r.places.filter(p => Array.isArray(p) && typeof p[3] === 'number').map(p => [p[3], p[4]]));
  for (const base of STARTER_BASES) {
    const mine = starterData(groups, unitWord, base).rows.map(r => [r[3], r[4]]);
    if (mine.every(m => others.every(o => kmBetween(m[0], m[1], o[0], o[1]) >= 1500))) return base;
  }
  return null;
}

/** The starter tables: one example unit per group (at least two), a big place, a small place and anchors, all in the open sea (at `base`). */
export function starterData(groups, unitWord, base = STARTER_BASE) {
  const n = Math.max(2, groups.length), { lat, lon } = base;
  const units = Array.from({ length: n }, (_, i) => ({ code: 'X' + String.fromCharCode(65 + i), name: `Example ${cap(unitWord)} ${NUMBER_WORDS[i]}`, group: groups[Math.min(i, groups.length - 1)] }));
  const rows = [
    ['example-big', 'Example Big City', 'XA', lat, lon, 'big'],
    ['example-small', 'Example Small Town', 'XB', lat, lon + 2.5, 'small'],
    ['example-anchor', 'Example Anchor', 'XA', lat - 2, lon, ''],
  ];
  for (let i = 2; i < n; i++) rows.push([`example-anchor-${String.fromCharCode(97 + i)}`, `Example Anchor ${String.fromCharCode(65 + i)}`, units[i].code, lat - 2, lon + 3 * (i - 1), '']);
  const unitsTable = '{\n  // STARTER DATA (see the note above): replace with the real units\n' + units.map(u => `  ${u.code}: [${jsq(u.name)}, ${jsq(u.group)}],`).join('\n') + '\n}';
  const placesTable = '[\n  // STARTER ROWS: examples in the open sea, far from every real region. Replace them. [id, name, unit, lat, lon, kind]\n'
    + rows.map(r => `  [${r.slice(0, 3).map(jsq).join(', ')}, ${r[3].toFixed(2)}, ${r[4].toFixed(2)}, ${jsq(r[5])}],`).join('\n') + '\n]';
  return { units, rows, unitsTable, placesTable };
}

function validate(id, name, unitWord, groups) {
  if (!id || !name) throw new Error('usage: node tools/anim-pack.mjs new <id> "<Name>" [--unit-word country|state|province] [--groups a,b,c]');
  if (!/^[a-z][a-z0-9]*$/.test(id)) throw new Error(`invalid id "${id}": lower-case letters and digits, starting with a letter (the dash is the separator in pack names: <id>-<group>)`);
  if (RESERVED_IDS.includes(id)) throw new Error(`the id "${id}" belongs to another pack family (reserved: ${RESERVED_IDS.join(', ')})`);
  if (!name.trim() || name.length > 60 || /[\u0000-\u001f\u2028\u2029]|\*\//.test(name)) throw new Error('the name must be 1 to 60 printable characters and may not contain "*/"');
  if (!/^[a-z]+$/.test(unitWord)) throw new Error(`invalid --unit-word "${unitWord}": one lower-case word ("country", "state", "province", "county", "town")`);
  if (RESERVED_UNIT_WORDS.includes(unitWord)) throw new Error(`invalid --unit-word "${unitWord}": it is one of the framework's own kinds (${RESERVED_UNIT_WORDS.join(', ')}) and would make the coverage wrong. Use "${unitWord === 'city' ? 'town" or "municipality' : 'country", "state" or "province'}"`);
  if (!groups.length || groups.length > MAX_GROUPS) throw new Error(`--groups: 1 to ${MAX_GROUPS} group names, comma separated`);
  for (const g of groups) if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(g)) throw new Error(`invalid group "${g}": lower-case letters, digits and single dashes, starting with a letter`);
  if (new Set(groups).size !== groups.length) throw new Error('--groups: a group name is used twice');
}

export default {
  summary: 'scaffold a new region: config with starter tables, scene stub, one pack file per group, generated test, doc skeleton',
  usage: 'new <id> "<Name>" [--unit-word <word>] [--groups a,b,c]',
  positionals: '<id> "<Name>"',
  options: {
    'unit-word': { type: 'string', default: 'country', help: 'what a unit is called: country (default), state, province, county ... (the item kind and the scene key prefix)' },
    groups: { type: 'string', help: `the groups, comma separated (default north,south; 1 to ${MAX_GROUPS}): each becomes a pack <id>-<group> and a pack file` },
  },
  run(args, ctx) {
    if (ctx.positionals.length > 2) throw new Error(`the name is ONE quoted argument: new ${ctx.positionals[0]} "${ctx.positionals.slice(1).join(' ')}"`);
    const [id, name] = [ctx.positionals[0], (ctx.positionals[1] || '').trim()];
    if (args['unit-word'] != null && !String(args['unit-word']).trim()) throw new Error('--unit-word is empty: give one lower-case word ("country", "state", "province") or leave the option out');
    if (args.groups != null && !String(args.groups).trim()) throw new Error('--groups is empty: give 1 to ' + MAX_GROUPS + ' group names, comma separated (north,south), or leave the option out');
    const unitWord = args['unit-word'] != null ? String(args['unit-word']).trim() : 'country';
    const rawGroups = (args.groups != null ? String(args.groups) : 'north,south').split(',').map(s => s.trim());
    if (rawGroups.some(g => !g)) throw new Error(`--groups "${args.groups}": an empty group name (a stray comma?)`);
    const groups = rawGroups;
    validate(id, name, unitWord, groups);
    const root = ctx.root, app = join(root, 'src', 'app');
    if (!existsSync(app)) throw new Error(`no src/app folder under ${root}: run it in the repository (or give --root <a checkout>)`);
    const reg = loadRegistry(root, { fresh: true });
    if (regions(reg).some(r => r.id === id)) throw new Error(`"${id}" is already a region (regions: ${regions(reg).map(r => r.id).join(', ')})`);
    const clash = reg.R.animPacks().filter(p => p.id === id || p.id.startsWith(id + '-')).map(p => p.id);
    if (clash.length) throw new Error(`pack names would collide: ${clash.join(', ')} (a region owns every pack named "${id}" or "${id}-<group>")`);

    const base = starterBaseFor(reg, groups, unitWord) || STARTER_BASE;
    const ID = id.toUpperCase(), data = starterData(groups, unitWord, base), title = titleCase;
    const common = { id, ID, name, name_js: jsq(name), unit_word: unitWord, unit_word_plural: plural(unitWord), groups_list: groups.map(g => `'${g}'`).join(', ') };
    const unitOfRow = (code) => data.units.find(u => u.code === code);
    const plan = [];
    plan.push({ path: `src/app/71-anim-region-${id}.js`, tpl: 'region-config.js.tpl', what: 'the config: starter tables, radii, worldTravel, animRegionDefine',
      vars: { ...common, units_table: data.unitsTable, places_table: data.placesTable, world_cities: worldCities(reg).join(', ') || 'none', field_unit: id + cap(unitWord),
        country_line: unitWord === 'country'
          ? "  // country: 'XX',                     // the ISO 3166-1 alpha-2 country of the items AND the suffix of the travel ids; needed when the units are NOT countries (states, provinces ...); here each unit code is its own country code"
          : `  country: 'XX',                         // TODO: the ISO 3166-1 alpha-2 country code of every item (the units are ${plural(unitWord)}, not countries): also the travel ids' suffix ('<place id>-xx')` } });
    plan.push({ path: `src/app/71-anim-region-${id}-scenes-1.js`, tpl: 'region-scenes.js.tpl', what: 'an empty scene file with the IIFE pattern (batch 1)', vars: { ...common, n: 1 } });
    for (const g of groups) {
      const mine = data.units.filter(u => u.group === g);
      const small = data.rows.filter(r => r[5] === 'small' && (unitOfRow(r[2]) || {}).group === g);
      const todo = [...mine.map(u => `  // B.element('${u.code}', { id: 'motif', label: 'What it is', colour: 'amber', mood: 'cheerful', tags: ['tag'], svg: () => '...' });   // ${u.name}`),
        ...small.map(r => `  // B.place('${r[0]}', { id: 'motif', label: 'What it is', colour: 'teal', mood: 'calm', tags: ['tag'], svg: () => '...' });   // ${r[1]} (${r[2]})`)].join('\n');
      plan.push({ path: `src/app/72-anim-pack-${id}-${g}.js`, tpl: 'region-pack.js.tpl', what: `the ${g} pack: B.scenes() plus the element calls to fill`,
        vars: { ...common, group: g, todo_lines: todo, pack_name_js: jsq(`${name}: ${title(g)}`), pack_desc_js: jsq(`Full-screen openings and small symbols for the ${title(g)} part of ${name}, played only where you are.`) } });
    }
    plan.push({ path: `tests/${id}-pack.test.mjs`, tpl: 'region-test.mjs.tpl', what: 'the coverage gate (data-driven: red until every unit and place has its art)', vars: common });
    const packRows = groups.map(g => `| \`${id}-${g}\` | \`72-anim-pack-${id}-${g}.js\` | TODO: the ${plural(unitWord)} of the ${g} group |`).join('\n');
    plan.push({ path: `docs/dev/${ID}_PACK.md`, tpl: 'region-doc.md.tpl', what: 'the guide skeleton', vars: { ...common, over: name, pack_rows: packRows } });

    const rendered = plan.map(f => ({ ...f, text: renderTemplate(readTemplate(f.tpl), f.vars, f.tpl) }));
    const siblings = existsSync(app) ? readdirSync(app).filter(f => new RegExp(`^(71-anim-region-${id}[.-]|72-anim-pack-${id}-)`).test(f)).map(f => 'src/app/' + f) : [];
    const exists = [...new Set([...rendered.map(f => f.path).filter(p => existsSync(join(root, p))), ...siblings])];
    if (exists.length) throw new Error(`refusing to overwrite: ${exists.join(', ')} already exist${exists.length === 1 ? 's' : ''}. Nothing was written.`);

    const written = [];
    try {
      for (const f of rendered) { const abs = join(root, f.path); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, f.text, { flag: 'wx' }); written.push(abs); }
      // the scaffold must load and its tables must be sound from the first second: prove it before reporting success
      const fresh = loadRegistry(root, { fresh: true });
      const region = regions(fresh).find(r => r.id === id);
      if (!region) throw new Error(`the region "${id}" did not register`);
      const problems = region.check({ worldCities: worldCities(fresh) }).filter(p => !/^starter:/.test(p));   // the placeholder country is the one thing the scaffold leaves for the author
      if (problems.length) throw new Error(`the scaffold's tables are not sound: ${problems.join('; ')}`);
    } catch (e) {
      for (const f of written) { try { unlinkSync(f); } catch { /* already gone */ } }
      throw new Error(`the scaffold did not load, everything it wrote was removed: ${e.message}`);
    }

    const out = ctx.out;
    out(`new region "${id}" (${name}): ${rendered.length} files, ${groups.length} group${groups.length === 1 ? '' : 's'} (${groups.join(', ')}), unit word "${unitWord}"`);
    for (const f of rendered) out(`  ${f.path.padEnd(48)} ${f.what}`);
    out('');
    out('The scaffold loads and its tables are sound (the example rows are in the open sea, away from every other region: nothing plays anywhere real). It ships NO example art.');
    if (unitWord !== 'country') out(`The units are ${plural(unitWord)}, not countries: set \`country: '<ISO code>'\` in the config. Until then region.check() and \`status --strict\` report the placeholder XX as starter data (travel ids would end in -xx).`);
    out(`Until every ${unitWord} and place has its art, tests/${id}-pack.test.mjs, the "every region" test of tests/region-framework.test.mjs and the "every pack file registered a valid pack" test of tests/anim-packs.test.mjs`);
    out('are RED on purpose: a half-built region must not be committed. `status` is the progress bar.');
    out('');
    out('MODULES.md row (paste it into the Animation library table):');
    out(renderTemplate(readTemplate('modules-row.md.tpl'), { ...common, pack_count: groups.length, pack_s: groups.length === 1 ? '' : 's', pack_list: groups.map(g => '`' + id + '-' + g + '`').join(', ') }, 'modules-row.md.tpl').trimEnd());
    out('');
    out('Next steps (in this order):');
    out(`  1. Replace the STARTER rows of src/app/71-anim-region-${id}.js with the real units and places (status warns while "example-" rows remain). Choose the groups,`);
    out('     the big and small places, unitKm and worldTravel; keep every row out of every other region\'s reach (tests/region-framework.test.mjs checks it).');
    out(`  2. node build.mjs --syntax && node tools/anim-pack.mjs status ${id}        (what is missing)`);
    out(`  3. Fill the "Cultural care" section of docs/dev/${ID}_PACK.md BEFORE any brief is made: it is copied into every brief (a brief made earlier carries only the general rules; \`brief\` says so).`);
    out('  4. node tools/anim-pack.mjs reference --render   (and --mode night, --mode dark), once, so that no agent renders the gold standard at the same time as another.');
    out(`  5. node tools/anim-pack.mjs brief ${id} --kind scene --out .anim-ref/briefs     and     ... --kind element --out .anim-ref/briefs`);
    out('  6. Fan the briefs out to agents; each lints (lint --file ...), looks (sheet ...) and reports; prove each batch touched only its own files (guard --owned ...); review independently (.claude/skills/animation-pack/references/workflow.md).');
    out(`  7. node tools/anim-pack.mjs status ${id} --strict   (exit 0)   then   npm test   and   node tools/privacy-scan.mjs;  paste the MODULES.md row above.`);
    return 0;
  },
};
