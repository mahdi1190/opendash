// The region workflow commands of tools/anim-pack.mjs: `status` (coverage of a region), `brief` (ready-to-paste agent briefs from
// tools/lib/anim-templates/*.md) and `new` (scaffold a region), their shared helpers (tools/lib/anim-region.mjs) and the generated
// coverage test. The scaffold is made in a temp copy of the animation sources (--root), never in the repo. Synthetic data only.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { main, loadCommands, COMMANDS } from '../tools/anim-pack.mjs';
import { loadRegistry, findBrowser } from '../tools/lib/anim-render.mjs';
import { animRegistryFiles } from '../tools/lib/anim-sources.mjs';
import { planBatches, regionNeeds, findRegion, templatePlaceholders, renderTemplate, readTemplate, careFor, careInfo, varietyOf, suggestionsInfo, applySuggestions, fileProblems, RESERVED_IDS, RESERVED_UNIT_WORDS, TEMPLATES_DIR, SCENES_PER_AGENT, CARE_RULES, RUBRIC_PASS, plural, seasonFor, SEASONS, SEASON_NOTE, TROPIC_LAT, sceneStubText, scaffoldVars, travelGaps, worldCities } from '../tools/lib/anim-region.mjs';
import { starterData, starterBaseFor, STARTER_BASE } from '../tools/lib/anim-cmd/new.mjs';
import { corpusTargets, exemplarRanges, safeZones, markupRules, passMark, briefFileOf, seasonCell, citedPngs } from '../tools/lib/anim-cmd/brief.mjs';
import { guardResult, parseStatus, parseNameStatus, forbiddenReason, gitScaffoldState, GUARD_PROOF } from '../tools/lib/anim-cmd/guard.mjs';
import { declareComplete } from '../tools/lib/anim-cmd/status.mjs';
import { loadThresholds, loadReference, itemNames, keyFilter, measureRegistry, selectEntries } from '../tools/anim-pack.mjs';
import { TARGETS, allowedTagList, measure } from '../tools/lib/anim-quality.mjs';
import { CROPS } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const run = async (argv, extra = {}) => { const out = [], err = []; const code = await main(argv, { out: (s) => out.push(s), err: (s) => err.push(s), ...extra }); return { code, out: out.join('\n'), err: err.join('\n') }; };

/** The animation sources of the first regions and the fixed pack families: a region added to the repo since (and its packs) is not copied, so these tests never depend on it. */
const isBase = (f) => !/^71-anim-region-/.test(f) && (!/^72-anim-pack-/.test(f) || /^72-anim-pack-(core|moments|rewards|seasons|sky|texas|world|uk|us|asia)[-.]/.test(f));
/** A temp checkout with just the animation sources: what the registry load, the lint and the generated test need. */
const temps = [];
function makeRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'anim-cli-'));
  temps.push(dir);
  mkdirSync(join(dir, 'src', 'app'), { recursive: true });
  for (const f of animRegistryFiles(APP).filter(isBase)) cpSync(join(APP, f), join(dir, 'src', 'app', f));
  cpSync(join(ROOT, 'src', 'styles'), join(dir, 'src', 'styles'), { recursive: true });
  mkdirSync(join(dir, 'tools', 'lib'), { recursive: true });
  cpSync(join(ROOT, 'tools', 'lib', 'anim-sources.mjs'), join(dir, 'tools', 'lib', 'anim-sources.mjs'));   // the generated test imports it
  return dir;
}
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });
const files = (dir) => { const out = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else out.push(relative(dir, p).replace(/\\/g, '/')); } }; walk(dir); return out.sort(); };

/* A scaffold shared by the read-only tests: 2 groups, province as the unit word. */
let SHARED = null;
async function shared() {
  if (!SHARED) { const root = makeRoot(); const r = await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root]); assert.equal(r.code, 0, r.err); SHARED = { root, out: r.out }; }
  return SHARED;
}
/** Minimal art for the starter data: enough for the COVERAGE test (not the lint: it is deliberately junk). */
function fillStarterArt(root) {
  writeFileSync(join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), `(function () {
  const K = animSceneKit();
  const add = (key, label, n) => animRegionSceneAdd('zz', { key, label, site: label, colour: 'teal', mood: 'calm', season: 'any', tags: ['landscape'],
    svg: () => K.full('#a9d4f0') + K.mv('usdrift', null, '<circle cx="' + (200 + n * 100) + '" cy="300" r="40" fill="#fff"/>') });
  add('province:XA', 'Hills one', 1); add('province:XB', 'Hills two', 2); add('place:example-big', 'Harbour', 3);
})();\n`);
  const patch = (g, calls) => { const f = join(root, 'src', 'app', `72-anim-pack-zz-${g}.js`); writeFileSync(f, readFileSync(f, 'utf8').replace('  // The pack registers once', calls + '\n  // The pack registers once')); };
  const dot = (x) => `svg: () => '<circle class="c x-pulse" cx="${x}" cy="32" r="8"/>'`;
  patch('west', `  B.element('XA', { id: 'm', label: 'Motif A', colour: 'amber', mood: 'cheerful', tags: ['t'], ${dot(20)} });`);
  patch('east', `  B.element('XB', { id: 'm', label: 'Motif B', colour: 'amber', mood: 'cheerful', tags: ['t'], ${dot(30)} });\n  B.place('example-small', { id: 'm', label: 'Motif C', colour: 'teal', mood: 'calm', tags: ['t'], ${dot(40)} });`);
}

test('the region commands are found without editing the CLI, listed in --help and documented', async () => {
  const all = await loadCommands();
  for (const c of ['new', 'status', 'brief']) { assert.ok(all[c], c); assert.ok(!COMMANDS[c], `${c} is a module of tools/lib/anim-cmd/, not a built-in`); }
  const h = await run(['--help']);
  for (const c of ['new', 'status', 'brief']) assert.match(h.out, new RegExp(`\\b${c}\\s+\\S`), c);
  assert.match(h.out, /status <id> --strict/);
  assert.match((await run(['status', '--help'])).out, /--strict[\s\S]*--no-lint/);
  assert.match((await run(['brief', '--help'])).out, /--kind[\s\S]*--batch[\s\S]*--of[\s\S]*--out/);
  assert.match((await run(['new', '--help'])).out, /--unit-word[\s\S]*--groups/);
});

test('status: the US and Asia are complete (every unit, big place and small place has its art, every item lints)', async () => {
  const us = await run(['status', 'us', '--strict', '--short']);
  assert.equal(us.code, 0, us.out);
  assert.match(us.out, /scenes {3}88 of 88/); assert.match(us.out, /COMPLETE/); assert.match(us.out, /us-pacific/);
  const asia = await run(['status', 'asia', '--json', '--strict']);
  assert.equal(asia.code, 0, asia.out);
  const st = JSON.parse(asia.out);
  const region = findRegion(loadRegistry(ROOT), 'asia'), needs = regionNeeds(region);
  assert.equal(st.complete, true); assert.deepEqual(st.missing, []); assert.deepEqual(st.orphans, []); assert.deepEqual(st.problems, []); assert.deepEqual(st.starter, []);
  assert.equal(st.totals.scenes, needs.keys.length); assert.equal(st.totals.scenesNeeded, needs.keys.length);
  assert.equal(st.totals.units, needs.unitsOpen.length); assert.equal(st.totals.big, needs.big.length); assert.equal(st.totals.small, needs.small.length);
  assert.equal(st.totals.elements, needs.unitsOpen.length + needs.small.length);
  assert.deepEqual(st.groups.map(g => g.group), region.groups);
  assert.ok(st.totals.bytes > 1e6 && st.totals.sceneBytes > st.totals.smallBytes);
  assert.deepEqual(st.packs.map(p => p.pack), ['asia-central', 'asia-east', 'asia-south', 'asia-southeast', 'asia-west']);
  // the 32,000-byte cap is the HAND-DRAWN scene budget: a LIVE upgrade (docs/dev/SCENE_ENGINE.md 16.5) is a composed scene, held to
  // the composed lint (its own budgets; tests/scene-upgrades-live.test.mjs) instead. A pack with no live upgrade is checked on the
  // status's largest scene exactly as before; a pack with one on its largest hand-drawn scene, measured the same way (html bytes).
  const reg = loadRegistry(ROOT), composedOf = id => reg.items().filter(e => e.pack === id && e.full && e.composed);
  const largestDrawn = id => Math.max(0, ...reg.items().filter(e => e.pack === id && e.full && !e.composed).map(e => reg.html(e.item).length));
  for (const p of st.packs) {
    assert.equal(p.lint.fail, 0, p.pack);
    for (const e of composedOf(p.pack)) assert.equal(e.item.upgrade && e.item.upgrade.state, 'live', e.ref + ': a composed scene in a region pack is a live upgrade');
    assert.ok(p.lint.pass > 0 && (composedOf(p.pack).length ? largestDrawn(p.pack) : p.largestScene.bytes) <= 32000, p.pack);
  }
  const jp = st.groups.find(g => g.group === 'east').units.find(u => u.code === 'JP');
  assert.deepEqual([jp.signature.state, jp.element.state, jp.signature.ref], ['ok', 'ok', 'asia-east/jp-signature']);
  assert.ok(jp.signature.bytes > 9000 && jp.element.bytes < 3000);
  const list = await run(['status']);
  assert.match(list.out, /asia\s+Asia\s+52 countries/); assert.match(list.out, /us\s+United States\s+49 states/); assert.match(list.out, /complete/);
  const bad = await run(['status', 'atlantis']);
  assert.equal(bad.code, 1); assert.match(bad.err, /unknown region "atlantis" \(regions: asia, .*\bus\b/);
});

test('planBatches: balanced consecutive batches, every item once, cuts snap to a group boundary within 1', () => {
  const mk = (...sizes) => sizes.flatMap((n, gi) => Array.from({ length: n }, () => ({ g: 'abcdef'[gi] }))).map((x, i) => ({ ...x, i }));
  const groupOf = (x) => x.g;
  const check = (parts, n) => { assert.deepEqual(parts.flat().map(x => x.i), [...Array(n).keys()], 'every item once, in order'); assert.ok(parts.every(p => p.length > 0)); };
  const list = mk(10, 6, 7);
  assert.equal(SCENES_PER_AGENT, 7, 'about 7 scenes per agent: a scene at the median bar is about 23 KB of drawing code plus four renders to look at');
  const auto = planBatches(list, { groupOf });
  assert.equal(auto.length, Math.ceil(23 / SCENES_PER_AGENT)); check(auto, 23);
  assert.ok(Math.max(...auto.map(p => p.length)) <= SCENES_PER_AGENT + 1, auto.map(p => p.length).join());
  assert.deepEqual(planBatches(mk(8, 8, 7), { groupOf, of: 3 }).map(p => [...new Set(p.map(groupOf))].join('')), ['a', 'b', 'c'], 'cuts on the group boundaries');
  assert.deepEqual(planBatches(mk(9, 7, 7), { groupOf, of: 3 }).map(p => p.length), [9, 7, 7], 'a boundary one item from the even cut wins');
  for (const of of [1, 2, 4, 7, 23, 50]) { const p = planBatches(list, { of, groupOf }); check(p, 23); assert.equal(p.length, Math.min(of, 23), `of ${of}`); }
  assert.deepEqual(planBatches([], { of: 3 }), []); assert.deepEqual(planBatches([1], { of: 3 }), [[1]]);
  const sizes = planBatches(Array.from({ length: 132 }, (_, i) => ({ i })), {}).map(p => p.length);
  assert.deepEqual([sizes.length, Math.min(...sizes), Math.max(...sizes)], [19, 6, 7], '132 scenes: 19 agents of 6 or 7');
  assert.equal(plural('country'), 'countries'); assert.equal(plural('state'), 'states'); assert.equal(plural('county'), 'counties'); assert.equal(plural('province'), 'provinces');
});

test('the reserved region ids are the framework\'s own', () => {
  const m = /_AR_RESERVED = \[([^\]]*)\]/.exec(readFileSync(join(APP, '71-anim-0region.js'), 'utf8'));
  assert.ok(m);
  assert.deepEqual(RESERVED_IDS, m[1].split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean));
});

test('new: scaffolds a region that loads, passes check() at once, ships no art, and status reports what is missing', async () => {
  const { root, out } = await shared();
  for (const f of ['src/app/71-anim-region-zz.js', 'src/app/71-anim-region-zz-scenes-1.js', 'src/app/72-anim-pack-zz-west.js', 'src/app/72-anim-pack-zz-east.js', 'tests/zz-pack.test.mjs', 'docs/dev/ZZ_PACK.md']) assert.ok(existsSync(join(root, f)), f);
  assert.match(out, /MODULES\.md row/); assert.match(out, /\| Zed Land packs: 2 regional packs \(`zz-west`, `zz-east`\)/); assert.match(out, /Next steps/); assert.match(out, /status zz/); assert.match(out, /brief zz --kind scene/);
  const reg = loadRegistry(root, { fresh: true }), region = findRegion(reg, 'zz');
  assert.deepEqual(region.check().filter(p => !/^starter:/.test(p)), [], 'the tables are sound'); assert.deepEqual(region.groups, ['west', 'east']); assert.equal(region.unitWord, 'province');
  assert.match(region.check().join('\n'), /^starter: the country is still the placeholder XX \(3 of the travel ids end in -xx/, 'provinces are not countries: the placeholder country is reported as starter data');
  assert.deepEqual(Object.keys(region.units), ['XA', 'XB']); assert.equal(region.places.length, 3);
  assert.deepEqual(region.places.map(p => p[5]), ['big', 'small', ''], 'a big place, a small place and an anchor');
  assert.equal(region.travelId(region.places[0]), 'example-big-xx', 'the starter data names its country: XX');
  assert.deepEqual(Object.keys(region.scenes), [], 'no example art'); assert.equal(reg.R.animPacks().filter(p => p.id.startsWith('zz-')).length, 0, 'the pack files register nothing until they have an item');
  const code = readFileSync(join(root, 'src', 'app', '71-anim-region-zz.js'), 'utf8');
  for (const word of ['STARTER DATA', 'unitKm', 'placeKm', 'travelId', 'worldTravel', 'elsewhere', 'pseudo', 'placeKinds', 'MUST NOT OVERLAP', 'tokyo-jp', 'trPlaceTables', 'lat, lon', 'ANCHOR', 'animRegionDefine']) assert.ok(code.includes(word), word);
  assert.match(readFileSync(join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), 'utf8'), /^\/\*[\s\S]*\*\/\n\(function \(\) \{\n {2}const K = animSceneKit\(\);/);
  assert.match(readFileSync(join(root, 'src', 'app', '72-anim-pack-zz-west.js'), 'utf8'), /const B = ZZ_REGION\.builder\('west'\);\n {2}B\.scenes\(\);/);
  // status: nothing exists yet
  const st = JSON.parse((await run(['status', 'zz', '--json', '--root', root])).out);
  assert.equal(st.complete, false); assert.deepEqual(st.starter.slice(0, 3), ['example-big', 'example-small', 'example-anchor']); assert.equal(st.starter.length, 4); assert.match(st.starter[3], /the country is still the placeholder XX/); assert.deepEqual(st.problems, []);
  assert.deepEqual(st.missing.map(m => `${m.need}:${m.key}`).sort(), ['element:place:example-small', 'element:province:XA', 'element:province:XB', 'scene:place:example-big', 'scene:province:XA', 'scene:province:XB']);
  assert.deepEqual([st.totals.scenes, st.totals.scenesNeeded, st.totals.elements, st.totals.elementsNeeded], [0, 3, 0, 3]);
  const text = await run(['status', 'zz', '--root', root]);
  assert.equal(text.code, 0); assert.match(text.out, /MISSING \(6\)/); assert.match(text.out, /STARTER DATA still in the tables/); assert.match(text.out, /STARTER DATA: the country is still the placeholder XX/); assert.match(text.out, /INCOMPLETE/); assert.match(text.out, /GROUP west[\s\S]*GROUP east/);
  assert.equal((await run(['status', 'zz', '--strict', '--no-lint', '--root', root])).code, 2, 'under --strict anything missing is exit 2');
  assert.match((await run(['status', '--root', root])).out, /zz\s+Zed Land\s+2 provinces/);
});

test('new: the defaults (country, north and south), one group, and the scaffold of a second region next to the first', async () => {
  const { root } = await shared();
  assert.equal((await run(['new', 'qq', 'Quux', '--root', root])).code, 0);
  const reg = loadRegistry(root, { fresh: true }), q = findRegion(reg, 'qq');
  assert.deepEqual([q.unitWord, q.groups.join()], ['country', 'north,south']);
  assert.match(readFileSync(join(root, 'src', 'app', '71-anim-region-qq.js'), 'utf8'), /\/\/ country: 'XX'/, 'for countries the unit code is the ISO code: the country line is a comment');
  assert.match(readFileSync(join(root, 'src', 'app', '71-anim-region-zz.js'), 'utf8'), /\n {2}country: 'XX',/, 'for provinces it is active, with a TODO');
  assert.deepEqual(reg.R.ANIM_REGIONS.map(r => r.id).sort(), ['asia', 'qq', 'us', 'zz']);
  assert.deepEqual(q.check(), [], 'a region of countries has no placeholder: the unit code is the country code'); assert.deepEqual(findRegion(reg, 'zz').check().filter(p => !/^starter:/.test(p)), []);
  const one = starterData(['solo'], 'state'), many = starterData(['a', 'b', 'c', 'd'], 'country');
  assert.equal(one.units.length, 2); assert.ok(one.units.every(u => u.group === 'solo'));
  assert.deepEqual(many.units.map(u => u.group), ['a', 'b', 'c', 'd'], 'every group has a unit, or the builder of that group would throw');
  const solo = makeRoot();
  assert.equal((await run(['new', 'solo', 'Solo', '--groups', 'only', '--unit-word', 'state', '--root', solo])).code, 0);
  assert.deepEqual(findRegion(loadRegistry(solo, { fresh: true }), 'solo').check().filter(p => !/^starter:/.test(p)), []);
});

test('new: refuses bad ids, reserved ids, an existing region or file, bad options; nothing is written', async () => {
  const { root } = await shared();
  const before = files(root);
  const bad = [
    [['new'], /usage/], [['new', 'abc'], /usage/], [['new', 'eu', 'Europe', 'West'], /ONE quoted argument: new eu "Europe West"/], [['new', 'Bad', 'Name'], /invalid id/], [['new', 'a-b', 'Name'], /invalid id/], [['new', '1ab', 'Name'], /invalid id/], [['new', 'a b', 'Name'], /invalid id/], [['new', '', 'Name'], /usage/],
    ...RESERVED_IDS.map(id => [['new', id, 'Name'], /belongs to another pack family/]),
    [['new', 'us', 'United'], /already a region/], [['new', 'asia', 'Asia again'], /already a region/], [['new', 'zz', 'Again'], /already a region/],
    [['new', 'ok', 'Name', '--unit-word', 'place'], /invalid --unit-word/], [['new', 'ok', 'Name', '--unit-word', 'Two Words'], /invalid --unit-word/], [['new', 'ok', 'Name', '--groups', 'a,a'], /used twice/],
    [['new', 'ok', 'Name', '--groups', 'A'], /invalid group/], [['new', 'ok', 'Name', '--groups', '1,2'], /invalid group/], [['new', 'ok', 'Name', '--groups', 'a,b,c,d,e,f,g,h,i'], /1 to 8 group/], [['new', 'ok', 'Bad */ name'], /may not contain/],
  ];
  for (const [argv, re] of bad) { const r = await run([...argv, '--root', root]); assert.equal(r.code, 1, argv.join(' ')); assert.match(r.err, re, argv.join(' ')); }
  assert.deepEqual(files(root), before, 'nothing was written by any refusal');
  // an existing file of the scaffold: refused whole, nothing else is written
  const lone = makeRoot(); mkdirSync(join(lone, 'tests')); writeFileSync(join(lone, 'tests', 'ex-pack.test.mjs'), '// mine\n');
  const was = files(lone), r = await run(['new', 'ex', 'Ex', '--root', lone]);
  assert.equal(r.code, 1); assert.match(r.err, /refusing to overwrite: tests\/ex-pack\.test\.mjs/); assert.deepEqual(files(lone), was); assert.equal(readFileSync(join(lone, 'tests', 'ex-pack.test.mjs'), 'utf8'), '// mine\n');
  const stray = makeRoot(); writeFileSync(join(stray, 'src', 'app', '72-anim-pack-st-extra.js'), '// not mine\n');
  const r2 = await run(['new', 'st', 'St', '--root', stray]);
  assert.equal(r2.code, 1); assert.match(r2.err, /refusing to overwrite: src\/app\/72-anim-pack-st-extra\.js/);
  const noApp = mkdtempSync(join(tmpdir(), 'anim-cli-')); temps.push(noApp);
  assert.match((await run(['new', 'nn', 'Nn', '--root', noApp])).err, /no src\/app folder/);
  // a pack that is already named like the region
  const clash = makeRoot(); writeFileSync(join(clash, 'src', 'app', '72-anim-pack-zq-x.js'), "animRegisterPack({ id: 'zq-x', name: 'x', items: [{ id: 'a', slot: 'symbol', label: 'a', tags: [], mood: 'calm', intensity: 'subtle', svg: () => '<circle class=\"c x-pulse\" cx=\"32\" cy=\"32\" r=\"8\"/>', reduced: 'static' }] });\n");
  assert.match((await run(['new', 'zq', 'Zq', '--root', clash])).err, /pack names would collide: zq-x/);
});

test('brief: batches cover every scene key exactly once, ordered by group, and every element once (the scaffold, then Asia)', async () => {
  const { root } = await shared();
  const region = findRegion(loadRegistry(root, { fresh: true }), 'zz'), needs = regionNeeds(region);
  const plan = JSON.parse((await run(['brief', 'zz', '--kind', 'scene', '--json', '--root', root])).out);
  assert.equal(plan.total, needs.keys.length); assert.equal(plan.of, 1);
  assert.deepEqual(plan.batches.flatMap(b => b.keys.map(k => k.key)).sort(), needs.keys.map(k => k.key).sort());
  assert.deepEqual(plan.batches[0].files, ['src/app/71-anim-region-zz-scenes-1.js']);
  const two = JSON.parse((await run(['brief', 'zz', '--kind', 'scene', '--of', '2', '--json', '--root', root])).out);
  assert.deepEqual(two.batches.map(b => b.count), [2, 1]); assert.deepEqual(two.batches[0].groups, ['west']);
  const el = JSON.parse((await run(['brief', 'zz', '--kind', 'element', '--json', '--root', root])).out);
  assert.deepEqual(el.batches.map(b => [b.groups.join(), b.files.join(), b.count]), [['west', 'src/app/72-anim-pack-zz-west.js', 1], ['east', 'src/app/72-anim-pack-zz-east.js', 2]]);
  assert.deepEqual(el.batches.flatMap(b => b.keys.map(k => `${k.call}:${k.key}`)).sort(), ['B.element:province:XA', 'B.element:province:XB', 'B.place:place:example-small']);
  const merged = JSON.parse((await run(['brief', 'zz', '--kind', 'element', '--of', '1', '--json', '--root', root])).out);
  assert.equal(merged.of, 1); assert.deepEqual(merged.batches[0].files, ['src/app/72-anim-pack-zz-west.js', 'src/app/72-anim-pack-zz-east.js']);
  // Asia, the real region: every key once, in group order, batches of about 11
  const asia = findRegion(loadRegistry(ROOT), 'asia'), an = regionNeeds(asia);
  const ap = JSON.parse((await run(['brief', 'asia', '--kind', 'scene', '--json'])).out);
  const keys = ap.batches.flatMap(b => b.keys.map(k => k.key));
  assert.equal(ap.of, Math.ceil(an.keys.length / SCENES_PER_AGENT)); assert.equal(ap.of, 19); assert.equal(keys.length, an.keys.length); assert.equal(new Set(keys).size, keys.length, 'every key once'); assert.deepEqual(keys, an.keys.map(k => k.key), 'in the region\'s order: by group');
  assert.ok(ap.batches.every(b => b.count >= 5 && b.count <= SCENES_PER_AGENT + 1), ap.batches.map(b => b.count).join());
  assert.deepEqual(ap.batches.map(b => b.files[0]).slice(0, 2), ['src/app/71-anim-region-asia-scenes-1.js', 'src/app/71-anim-region-asia-scenes-2.js']);
  const groupSeq = ap.batches.flatMap(b => b.keys.map(k => k.group)).filter((g, i, a) => i === 0 || g !== a[i - 1]);
  assert.deepEqual(groupSeq, asia.groups, 'each group appears as one run: batches are culturally coherent');
  const of5 = JSON.parse((await run(['brief', 'asia', '--kind', 'scene', '--of', '5', '--json'])).out);
  assert.equal(of5.of, 5); assert.deepEqual(of5.batches.flatMap(b => b.keys.map(k => k.key)), an.keys.map(k => k.key));
  const west = JSON.parse((await run(['brief', 'asia', '--kind', 'scene', '--group', 'west', '--json'])).out);
  assert.ok(west.batches.every(b => b.groups.join() === 'west' && /scenes-west-\d+\.js$/.test(b.files[0])), 'a group filter names its own files'); assert.equal(west.total, an.groups[0].keys.length);
  const ael = JSON.parse((await run(['brief', 'asia', '--kind', 'element', '--json'])).out);
  assert.equal(ael.total, an.unitsOpen.length + an.small.length); assert.deepEqual(ael.batches.map(b => b.groups[0]), asia.groups);
  assert.equal(JSON.parse((await run(['brief', 'asia', '--kind', 'element', '--of', '2', '--json'])).out).of, 2);
});

test('brief: the scene brief carries the whole quality contract, the keys, the file and the exact commands', async () => {
  const { root } = await shared();
  const r = await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--note', 'Prefer morning light.', '--root', root]);
  assert.equal(r.code, 0, r.err); const md = r.out;
  assert.doesNotMatch(md, /\{\{|\}\}|undefined|NaN|\[object/, 'no placeholder is left');
  assert.match(md, /^# Brief: draw 3 full-screen scenes for the Zed Land region \(batch 1 of 1\)/);
  for (const key of ['province:XA', 'province:XB', 'place:example-big']) assert.ok(md.includes('`' + key + '`'), key);
  assert.ok(md.includes('Example Big City (Example Province One): big city, at '));
  const file = 'src/app/71-anim-region-zz-scenes-1.js';
  for (const s of [`You own exactly ONE file: \`${file}\``, `node --check ${file}`, `node tools/anim-pack.mjs lint --file ${file}`, `node tools/anim-pack.mjs sheet --file ${file} --mode light --out .anim-ref/71-anim-region-zz-scenes-1 --contact`,
    `node tools/anim-pack.mjs sheet --file ${file} --mode night`, `--mode light --crop phone`, `--mode light --crop square`, 'git status --short', 'node tools/anim-pack.mjs status zz', `node tools/anim-pack.mjs guard --owned ${file}`,
    '.claude/skills/animation-pack/SKILL.md', '.claude/skills/animation-pack/references/style-guide.md', '.claude/skills/animation-pack/references/rubric.md', '.claude/skills/animation-pack/references/recipes.md', '.claude/skills/animation-pack/references/kit-reference.md', 'the 20 lines', 'instant reject',
    'animSceneKit()', 'animRegionSceneAdd(\'zz\'', '32,000 bytes', 'IIFE', 'Prefer morning light.', 'us-northeast/new-york-skyline', 'asia-southeast/th-signature', 'asia-west/sa-signature',
    // the definition of done and what not to do
    'STUDIED', 'DRAWN', 'LINT', 'LOOK', 'SELF-CHECK', 'CARE', 'REPORTED', 'no waiver', 'Never edit `tools/anim-quality.json`', 'No padding', 'No copy-paste', 'recolour', 'No text', 'No flags', 'identifiable people', 'No holy figures', 'FEWER',
    'WEAKEST THREE', 'TARGET MISSES', 'Do not commit', 'PUBLIC',
  ]) assert.ok(md.includes(s), s);
  for (const rule of CARE_RULES) assert.ok(md.includes(rule), rule.slice(0, 40));
  assert.doesNotMatch(md, /\n{3,}/, 'no runs of blank lines');
  assert.doesNotMatch(md, /^\s*node tools\/anim-pack\.mjs reference --render/m, 'agents do not render the gold standard: the orchestrator does it once');
  // the element brief
  const e = (await run(['brief', 'zz', '--kind', 'element', '--batch', '2', '--root', root])).out;
  assert.doesNotMatch(e, /\{\{|\}\}|undefined/);
  for (const s of ['draw 2 small elements for the Zed Land region (batch 2 of 2)', 'src/app/72-anim-pack-zz-east.js', "B.element('XB'", "B.place('example-small'", 'B.scenes()', 'theme classes ONLY', 'never a hex colour', '.claude/skills/animation-pack/references/small-icons.md',
    'node tools/anim-pack.mjs lint --file src/app/72-anim-pack-zz-east.js --only small', 'sheet --file src/app/72-anim-pack-zz-east.js --only small --mode dark', '28 px', 'bellingham-ferry-baker', 'natchez-steamboat-wheel', 'STUDIED', 'LINT', 'LOOK', 'SELF-CHECK', 'No padding', 'identifiable people', 'FEWER',
    'node tools/anim-pack.mjs guard --owned src/app/72-anim-pack-zz-east.js']) assert.ok(e.includes(s), s);
  assert.ok(!e.includes('71-anim-region-zz-scenes-1.js\`:') , 'the element brief does not give away a scene file as its own');
  // --out writes the briefs, --json adds the markdown, bad input is an error
  const out = mkdtempSync(join(tmpdir(), 'anim-brief-')); temps.push(out);
  const w = await run(['brief', 'zz', '--kind', 'element', '--out', out, '--root', root]);
  assert.equal(w.code, 0); assert.deepEqual(readdirSync(out).sort(), ['element-brief-1.md', 'element-brief-2.md', 'plan.json']); assert.equal(readFileSync(join(out, 'element-brief-2.md'), 'utf8').trimEnd(), e.trimEnd());
  const j = JSON.parse((await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--json', '--root', root])).out);
  assert.equal(j.batches.length, 1); assert.match(j.batches[0].markdown, /^# Brief: draw 3 full-screen scenes/);
  for (const [argv, re] of [[['brief'], /needs a region/], [['brief', 'zz'], /--kind must be/], [['brief', 'zz', '--kind', 'x'], /--kind must be/], [['brief', 'nope', '--kind', 'scene'], /unknown region "nope"/],
    [['brief', 'zz', '--kind', 'scene', '--batch', '2'], /out of range/], [['brief', 'zz', '--kind', 'scene', '--batch', '0'], /whole number/], [['brief', 'zz', '--kind', 'scene', '--of', 'x'], /whole number/],
    [['brief', 'zz', '--kind', 'scene', '--of', '-1'], /--of needs a value that does not start with a dash/], [['brief', 'zz', '--kind', 'scene', '--of=-1'], /whole number/], [['brief', 'zz', '--kind', 'scene', '--of', ''], /whole number/],
    [['brief', 'zz', 'yy', '--kind', 'scene'], /brief takes one region/], [['brief', 'zz', '--kind', 'scene', '--clean'], /--clean goes with --out/], [['brief', 'zz', '--kind', 'scene', '--group', ''], /--group is empty/],
    [['brief', 'zz', '--kind', 'scene', '--group', 'middle'], /not a group of zz \(groups: west, east\)/]]) {
    const b = await run([...argv, '--root', root]); assert.equal(b.code, 1, argv.join(' ')); assert.match(b.err, re, argv.join(' '));
  }
});

test('brief: the region\'s own care notes (the "Cultural care" section of its doc) are added after the general rules', async () => {
  const root = makeRoot();
  assert.equal((await run(['new', 'cc', 'Care Land', '--root', root])).code, 0);
  const region = findRegion(loadRegistry(root, { fresh: true }), 'cc');
  assert.equal(careFor(root, region), CARE_RULES.map(r => `- ${r}`).join('\n'), 'the scaffold\'s placeholder comment adds nothing');
  const doc = join(root, 'docs', 'dev', 'CC_PACK.md');
  writeFileSync(doc, readFileSync(doc, 'utf8').replace(/<!--[\s\S]*?-->/, '- Never draw a river crossing the border; draw the mountains instead.\n- Draw the festival lanterns lit.'));
  const md = (await run(['brief', 'cc', '--kind', 'scene', '--batch', '1', '--root', root])).out;
  assert.match(md, /Specific to Care Land \(from docs\/dev\/CC_PACK\.md\):\n\n- Never draw a river crossing the border; draw the mountains instead\.\n- Draw the festival lanterns lit\./);
  assert.ok(md.indexOf('No flags') < md.indexOf('Specific to Care Land'), 'general rules first');
});

test('templates: every placeholder of every template is supplied by the commands, and a missing value is an error', async () => {
  const names = readdirSync(TEMPLATES_DIR).filter(f => /\.(md|tpl)$/.test(f)).sort();
  assert.deepEqual(names, ['ai-object-prompt.md', 'archetype-brief.md', 'composed-scene-brief.md', 'element-brief.md', 'modules-row.md.tpl', 'object-brief.md', 'object-sheet-prompt.md', 'region-config.js.tpl', 'region-doc.md.tpl', 'region-pack.js.tpl', 'region-scenes.js.tpl', 'region-test.mjs.tpl', 'scene-brief.md', 'upgrade-brief.md']);
  // the briefs and the scaffold render every template (above); here the placeholder inventory is pinned so a new one cannot slip in unsupplied
  const known = { 'scene-brief.md': ['care', 'count', 'batch', 'batch_groups', 'batches', 'done_note', 'exemplars', 'existing', 'file', 'guard', 'keys', 'markup_rules', 'max_redraws', 'max_thin', 'min_richness', 'notes', 'pass_mark', 'refs', 'region_file', 'region_id', 'region_name', 'safe_zones', 'scene_cap', 'skill', 'targets', 'todo_count', 'todo_s', 'unit_word', 'verify', 'weaker', 'groups_summary'],
    'element-brief.md': ['care', 'count', 'batch', 'batch_groups', 'batches', 'done_note', 'exemplars', 'existing', 'files', 'guard', 'item_cap', 'keys', 'markup_rules', 'max_redraws', 'max_thin', 'min_richness', 'notes', 'pass_mark', 'refs', 'region_file', 'region_id', 'region_name', 'skill', 'targets', 'todo_count', 'todo_s', 'unit_word', 'verify', 'weaker', 'groups_summary'],
    // the briefs of the new standard (tools/lib/scene-briefs.mjs; tests/scene-tool.test.mjs renders each one)
    'composed-scene-brief.md': ['archetypes', 'bar', 'budget', 'care', 'kits', 'notes', 'pack', 'scene_id', 'subject', 'verify'],
    'upgrade-brief.md': ['archetype', 'bar', 'batch', 'batches', 'care', 'count', 'count_s', 'notes', 'refs', 'region_id', 'region_name', 'verify'],
    'archetype-brief.md': ['archetype', 'bar', 'hints', 'kits', 'legal', 'notes', 'verify', 'what'],
    'object-brief.md': ['kit', 'notes', 'objects', 'roles', 'verify'],
    // the AI sprite-sheet prompt (tools/lib/object-import.mjs promptText fills every one; ai-object-prompt.md is filled by hand)
    'object-sheet-prompt.md': ['BASE', 'CELL', 'FRAMES', 'FRAMES_LINE', 'FRAMES_SUFFIX', 'GUTTER', 'H', 'ID', 'LEFT', 'ROWS', 'SUBJECT', 'TOP', 'W'] };
  for (const [f, list] of Object.entries(known)) assert.deepEqual(templatePlaceholders(readTemplate(f)).sort(), [...list].sort(), f);
  assert.throws(() => renderTemplate('a {{b}} c', {}, 'demo'), /demo: no value for \{\{b\}\}/);
  assert.equal(renderTemplate('a {{b}} c {{b}}', { b: '$&' }), 'a $& c $&', 'a value is never read as a replacement pattern');
  assert.deepEqual(templatePlaceholders('{{a}} {{ b }} {x} {{{c}}}'), ['a', 'b', 'c']);
  for (const f of names.filter(n => /^region-|^modules/.test(n))) assert.ok(templatePlaceholders(readTemplate(f)).length > 0, f);
});

test('the generated test keeps the repo GREEN while the region is drawn (structural checks hard, coverage checks todo) and turns hard once the config says complete: true (run for real, in the temp checkout)', async () => {
  const root = makeRoot();
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;   // inside `node --test` a nested run would think it is a child of this one
  const test = () => spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/zz-pack.test.mjs'], { cwd: root, encoding: 'utf8', env });
  const cfg = join(root, 'src', 'app', '71-anim-region-zz.js');
  assert.match(readFileSync(cfg, 'utf8'), /\n {2}complete: false, /, 'the scaffold says complete: false');
  const wip = test();
  assert.equal(wip.status, 0, 'no art yet, and the suite is green: ' + wip.stdout.slice(-2500));
  for (const t of ['the region is defined and its tables are sound', 'every registered scene is built into a pack \\(no dead art\\)', 'items are unique, animated and gated by a when\\(\\) rule', 'where the user is decides what plays', 'nothing plays away from the region']) assert.match(wip.stdout, new RegExp(`\\nok \\d+ - zz: ${t}`), 'structural: ' + t);
  assert.match(wip.stdout, /# fail 0/); assert.match(wip.stdout, /# todo 4/); assert.match(wip.stdout, /# pass 5/);
  assert.match(wip.stdout, /not ok \d+ - zz: every province that opens has a full-screen signature opening and an element # TODO the region is not declared complete \(complete: false in its config\)/, 'coverage: reported as todo, with the reason');
  assert.match(wip.stdout, /signature opening is missing/); assert.match(wip.stdout, /node tools\/anim-pack\.mjs status zz lists everything that is missing/, 'the todo still says what is missing');
  fillStarterArt(root);
  const art = test();
  assert.equal(art.status, 0, 'every piece of art exists, the placeholder country and the example rows keep the last coverage test todo: ' + art.stdout.slice(-2000));
  assert.match(art.stdout, /not ok \d+ - zz: no starter data is left .* # TODO/); assert.match(art.stdout, /example row example-big/); assert.match(art.stdout, /starter: the country is still the placeholder XX/);
  assert.match(art.stdout, /\nok \d+ - zz: every province that opens has a full-screen signature opening and an element # TODO/, 'a coverage test that passes is still listed as todo until the region is declared complete');
  // declare complete (by hand here; `status --declare-complete` does it): from now on the coverage tests FAIL HARD
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/\n {2}complete: false,/, '\n  complete: true,'));
  const hard = test();
  assert.notEqual(hard.status, 0, 'complete: true and starter data left: red'); assert.match(hard.stdout, /# todo 0/); assert.match(hard.stdout, /not ok \d+ - zz: no starter data is left/); assert.doesNotMatch(hard.stdout, /# TODO/);
  assert.match(hard.stdout, /\nok \d+ - zz: the region is defined and its tables are sound/, 'the structural tests stay green');
  // real data: the country set, the example rows renamed: green, every test hard
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/\n {2}country: 'XX',/, "\n  country: 'ZZ',"));
  for (const f of readdirSync(join(root, 'src', 'app')).filter(f => /zz/.test(f))) { const p = join(root, 'src', 'app', f); writeFileSync(p, readFileSync(p, 'utf8').replace(/example-/g, 'real-')); }
  const green = test();
  assert.equal(green.status, 0, green.stdout.slice(-3000) + green.stderr);
  assert.match(green.stdout, /# pass 9/); assert.match(green.stdout, /# fail 0/); assert.match(green.stdout, /# todo 0/);
  // complete: true with a missing piece of art: red again (the coverage tests are hard)
  const east = join(root, 'src', 'app', '72-anim-pack-zz-east.js');
  writeFileSync(east, readFileSync(east, 'utf8').replace(/\n {2}B\.element\('XB'[^\n]*/, ''));
  const regressed = test();
  assert.notEqual(regressed.status, 0, 'a finished region that loses an element fails'); assert.match(regressed.stdout, /an element is missing/);
  // status agrees: everything exists; the junk art fails the lint, so the region is not complete
  const st = JSON.parse((await run(['status', 'zz', '--json', '--root', root])).out);
  assert.equal(st.declared, true); assert.deepEqual(st.starter, []); assert.deepEqual(st.orphans, []); assert.deepEqual(st.problems, []);
  assert.equal(st.complete, false); assert.ok(st.lint.failing > 0, 'a one-circle scene is not a scene'); assert.deepEqual(st.missing.map(m => m.key), ['province:XB']);
  const text = await run(['status', 'zz', '--strict', '--root', root]);
  assert.equal(text.code, 2); assert.match(text.out, /FAIL zz-west\/xa-signature: /); assert.match(text.out, /node tools\/anim-pack\.mjs lint --ref zz-west\/xa-signature/); assert.match(text.out, /The config says complete: true, so the coverage tests of the region fail until this is fixed/);
  // lint --file works for a file that is already in src/app (everything the file adds), and --only keeps the elements of a pack file apart from its scenes
  writeFileSync(east, readFileSync(east, 'utf8').replace('  // The pack registers once', "  B.element('XB', { id: 'm', label: 'Motif B', colour: 'amber', mood: 'cheerful', tags: ['t'], svg: () => '<circle class=\"c x-pulse\" cx=\"30\" cy=\"32\" r=\"8\"/>' });\n  // The pack registers once"));
  const refsOf = async (argv) => JSON.parse((await run([...argv, '--root', root, '--json'])).out).items.map(i => i.ref).sort();
  assert.equal((await run(['lint', '--file', join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), '--root', root, '--json'])).code, 2, 'lint --file sees the new scenes through the scaffold\'s pack files');
  assert.deepEqual(await refsOf(['lint', '--file', join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js')]), ['zz-east/xb-signature', 'zz-west/real-big-skyline', 'zz-west/xa-signature'], 'a scene file adds its scenes');
  const westPack = join(root, 'src', 'app', '72-anim-pack-zz-west.js');
  assert.deepEqual(await refsOf(['lint', '--file', westPack]), ['zz-west/real-big-skyline', 'zz-west/xa-m', 'zz-west/xa-signature'], 'a pack file adds its elements and the scenes it builds');
  assert.deepEqual(await refsOf(['lint', '--file', westPack, '--only', 'small']), ['zz-west/xa-m']);
  assert.deepEqual(await refsOf(['lint', '--file', westPack, '--only', 'scenes']), ['zz-west/real-big-skyline', 'zz-west/xa-signature']);
  assert.deepEqual(await refsOf(['lint', '--file', westPack, '--key', 'province:XA']), ['zz-west/xa-m', 'zz-west/xa-signature'], '--key: a unit\'s key names its signature and its element');
  assert.deepEqual(await refsOf(['lint', '--file', westPack, '--key', 'place:real-big']), ['zz-west/real-big-skyline']);
  const bogus = await run(['lint', '--file', westPack, '--only', 'bogus', '--root', root]);
  assert.equal(bogus.code, 1); assert.match(bogus.err, /--only must be small or scenes/);
  assert.match((await run(['sheet', '--file', westPack, '--only', 'bogus', '--root', root])).err, /--only must be small or scenes/);
});

test('status: orphan scenes and table problems are reported (a scene for a small place, a table edited after define)', async () => {
  const root = makeRoot();
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  fillStarterArt(root);
  writeFileSync(join(root, 'src', 'app', '71-anim-region-zz-scenes-2.js'), "(function () {\n  const K = animSceneKit();\n  animRegionSceneAdd('zz', { key: 'place:example-small', label: 'x', site: 'x', colour: 'teal', mood: 'calm', season: 'any', tags: [], svg: () => K.full('#fff') });\n})();\n");
  const st = JSON.parse((await run(['status', 'zz', '--json', '--no-lint', '--root', root])).out);
  assert.deepEqual(st.orphans.map(o => o.key), ['place:example-small']);
  assert.ok(st.problems.some(p => /place:example-small: a scene is for a big place/.test(p)), st.problems.join('\n'));
  assert.equal(st.complete, false);
  const text = await run(['status', 'zz', '--no-lint', '--short', '--root', root]);
  assert.match(text.out, /ORPHAN SCENES \(1\)/); assert.match(text.out, /TABLE PROBLEMS \(1, from region\.check\)/);
});

/* ---------- FIX2: every defect of the CLI review has a regression test ---------- */

/** A fresh scaffold (province, groups west and east) with art for every key: complete but for the lint, the example rows and the placeholder country. */
async function artRoot() {
  const root = makeRoot();
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  fillStarterArt(root);
  return root;
}
const sceneEntry = (key, label = 'x') => `animRegionSceneAdd('zz', { key: '${key}', label: '${label}', site: 'x', colour: 'teal', mood: 'calm', season: 'any', tags: [], svg: () => K.full('#a9d4f0') + K.mv('usdrift', null, '<circle cx="300" cy="300" r="40" fill="#fff"/>') });`;
const iife = (...entries) => `(function () {\n  const K = animSceneKit();\n  ${entries.join('\n  ')}\n})();\n`;

test('a load error names the FILE and the line (a duplicate top-level declaration, a runtime throw, a syntax error), for lint, status, brief and sheet', async () => {
  const root = makeRoot();
  const app = (f) => join(root, 'src', 'app', f);
  const two = app('71-anim-region-zz-scenes-2.js'), three = app('71-anim-region-zz-scenes-3.js');
  writeFileSync(two, 'const K = animSceneKit();\n'); writeFileSync(three, '\n\nconst K = animSceneKit();\n');
  for (const argv of [['lint', '--file', two], ['status'], ['brief', 'zz', '--kind', 'scene'], ['sheet', '--file', two]]) {
    const r = await run([...argv, '--root', root]);
    assert.equal(r.code, 1, argv.join(' '));
    assert.match(r.err, /71-anim-region-zz-scenes-3\.js:3: SyntaxError: Identifier 'K' has already been declared \(first declared in 71-anim-region-zz-scenes-2\.js; every file shares one scope: wrap a scene file in an IIFE/, argv.join(' '));
  }
  rmSync(two);
  writeFileSync(three, '(function () { undefinedFn(); })();\n');
  assert.match((await run(['status', '--root', root])).err, /71-anim-region-zz-scenes-3\.js:1: ReferenceError: undefinedFn is not defined/);
  writeFileSync(three, '(function () {\n  const x = ;\n})();\n');
  assert.match((await run(['status', '--root', root])).err, /71-anim-region-zz-scenes-3\.js:2: SyntaxError/);
  // a config constant declared again by a scene file: the later file is named, with the file that declared it first
  const root2 = makeRoot();
  assert.equal((await run(['new', 'zz', 'Zed Land', '--root', root2])).code, 0);
  writeFileSync(join(root2, 'src', 'app', '71-anim-region-zz-scenes-9.js'), '\nconst ZZ_UNITS = {};\n');
  assert.match((await run(['status', '--root', root2])).err, /71-anim-region-zz\.js:\d+: SyntaxError: Identifier 'ZZ_UNITS' has already been declared \(first declared in 71-anim-region-zz-scenes-9\.js/);
  // a healthy tree still loads (the vm bundle evaluates what the build concatenates)
  rmSync(join(root2, 'src', 'app', '71-anim-region-zz-scenes-9.js'));
  assert.equal((await run(['status', 'zz', '--no-lint', '--root', root2])).code, 0, 'the clash gone, the registry loads');
});

test('the briefs carry the corpus targets, generated from tools/anim-quality.json and the measured exemplars: nothing is typed, a changed file changes the brief', async () => {
  const { root } = await shared();
  const th = loadThresholds(ROOT), ref = loadReference(ROOT), reg = loadRegistry(ROOT);
  const kb = (n) => (n / 1000).toFixed(1) + ' KB';
  const scene = (await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--root', root])).out;
  for (const [metric, label] of [['shapes', 'shapes'], ['pathSegments', 'path segments'], ['gradients', 'gradients'], ['translucentLayers', 'translucent layers (haze, glow, soft shadow)'], ['movingGroups', 'moving groups'], ['motionKinds', 'kinds of motion'], ['detailCells', 'cells of 100 x 100 holding detail']]) {
    assert.ok(scene.includes(`| ${label} | ${th.scene[metric].median} | ${th.scene[metric].warnMin} |`), `${metric}: ${th.scene[metric].median} / ${th.scene[metric].warnMin}`);
  }
  assert.ok(scene.includes(`| rendered size | ${kb(th.scene.bytes.median)} | ${kb(th.scene.bytes.warnMin)} |`));
  const exS = exemplarRanges(reg, ref.scenes.map(x => x.ref), th), exI = exemplarRanges(reg, ref.items.map(x => x.ref), th);
  assert.ok(scene.includes(`| shapes | ${th.scene.shapes.median} | ${th.scene.shapes.warnMin} | ${exS.shapes[0]} to ${exS.shapes[1]} |`), 'the exemplars are MEASURED, not quoted');
  const el = (await run(['brief', 'zz', '--kind', 'element', '--batch', '1', '--root', root])).out;
  assert.ok(el.includes(`| rendered size | ${kb(th.item.bytes.median)} | ${kb(th.item.bytes.warnMin)} | ${kb(exI.bytes[0])} to ${kb(exI.bytes[1])} |`));
  assert.ok(el.includes(`| moving groups (independently staggered) | ${th.item.movingGroups.median} | ${th.item.movingGroups.warnMin} | ${exI.movingGroups[0]} to ${exI.movingGroups[1]} |`));
  assert.ok(el.includes(`| shapes | ${th.item.shapes.median} | ${th.item.shapes.warnMin} | ${exI.shapes[0]} to ${exI.shapes[1]} |`));
  assert.ok(exI.shapes[0] >= 10 && exI.movingGroups[0] >= 5, 'the exemplars are richer than the median icon (the old recipe said 1 to 3 motions)');
  for (const md of [scene, el]) {
    assert.ok(md.includes(`richness >= ${TARGETS.richness.toFixed(2)} and at most ${TARGETS.maxThinSpots} thin spots`)); assert.match(md, /at most 3 attempts/);
    assert.doesNotMatch(md, /1 to 3 \S*\s*motion|under a kilobyte|most accepted ones/, 'the stale recipe claims are gone');
  }
  for (const f of ['scene-brief.md', 'element-brief.md']) assert.doesNotMatch(readTemplate(f), /22\.8|\b397\b|\b210\b|\b1\.0 KB\b|under a kilobyte|1 to 3|14,000/, `${f} has no hand-typed corpus number`);
  // a changed thresholds file changes the brief (the numbers come from it)
  const custom = makeRoot(); mkdirSync(join(custom, 'tools'), { recursive: true });
  const edited = JSON.parse(readFileSync(join(ROOT, 'tools', 'anim-quality.json'), 'utf8')); edited.scene.shapes.median = 777;
  writeFileSync(join(custom, 'tools', 'anim-quality.json'), JSON.stringify(edited));
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', custom])).code, 0);
  assert.ok((await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--root', custom])).out.includes('| shapes | 777 |'));
});

test('site is the caption of a full scene, over only prefixes the small opening items: the brief, the doc skeleton, the stub and the docs say what 78-anim-wire.js does', () => {
  const wire = readFileSync(join(APP, '78-anim-wire.js'), 'utf8');
  assert.ok(wire.includes("tx.it.full ? tx.it.site || tx.it.label : tx.over + ' · ' + tx.it.label"), 'the code the docs describe: a full scene shows its site, a small one "<over> · <label>"');
  // the title: "Welcome to" (within the arrival budget of 78-anim-uk.js; a region's match always gets it when that budget is not loaded) and the place name
  assert.ok(wire.includes('<span class="od-seq-over">Welcome to</span>') && wire.includes('(arrival ? arrival.remaining > 0 : !w && !!tx)') && wire.includes('esc(openingPoint.town || openingPoint.name)'), 'the title is "Welcome to" and the place name from the table');
  const scene = readTemplate('scene-brief.md');
  assert.match(scene, /under it, your scene's `site` as a caption/); assert.match(scene, /site: 'Rice terraces above a misty valley'.*CAPTION under the "Welcome to <place>" title.*never just the place name again/);
  assert.doesNotMatch(scene, /The place named under|shown to the user as "Welcome to <place>" over|over "/);
  assert.doesNotMatch(readTemplate('region-scenes.js.tpl'), /The place under "Welcome to"/); assert.match(readTemplate('region-scenes.js.tpl'), /site is the caption shown under the "Welcome to <place>"/);
  const doc = readTemplate('region-doc.md.tpl');
  assert.doesNotMatch(doc, /"Welcome to <place>" over/); assert.match(doc, /a full-screen scene's own `site` is the caption under it, and `over` \("\{\{over\}\}"\) only prefixes the small opening items/);
  assert.match(readTemplate('region-config.js.tpl'), /over: .*SMALL \(64-unit\) opening items only/);
  const packs = readFileSync(join(ROOT, 'docs', 'dev', 'ANIMATION_PACKS.md'), 'utf8');
  assert.match(packs, /\| `id`, `name`, `over` \| .*caption prefix of the SMALL \(64-unit\) opening items only.*\*\*`site`\*\* as the caption/);
  assert.equal(readTemplate('scene-brief.md').includes('{{over}}'), false, 'the scene brief no longer prints `over`');
});

test('a failing scene is removed before reporting and listed under NOT DONE with its draft; nothing says "leave it as it is"; the report must say LINT PASS; only the orchestrator waives', async () => {
  const { root } = await shared();
  for (const kind of ['scene', 'element']) {
    const md = (await run(['brief', 'zz', '--kind', kind, '--batch', '1', '--root', root])).out.replace(/\s+/g, ' ');
    for (const s of ['After 3 attempts', 'NOT DONE', 'REMOVE it from your', '.anim-ref/drafts/', 'only the orchestrator decides about waivers', 'your report\'s LINT line must say PASS', 'TARGET MISSES', 'You never ship a failing']) assert.ok(md.includes(s), `${kind}: ${s}`);
    assert.doesNotMatch(md, /leave (it|the scene|the item) as it is|believe the art is right|you believe it is right/i, `${kind}: the contradiction is gone`);
    assert.match(md, /LINT: <the last line of[^>]*verbatim: "PASS: <n> items clean\." with no waivers>/);
  }
  assert.equal(TARGETS.maxRedraws, 3);
});

test('the Cultural care section comes BEFORE the briefs everywhere, brief says when it is still the skeleton, and the extractor keeps sub-headings and stops at the right heading', async () => {
  const root = makeRoot();
  const made = await run(['new', 'cc', 'Care Land', '--root', root]);
  const steps = made.out.split('\n').filter(l => /^ {2}\d\. /.test(l));
  const at = (re) => steps.findIndex(l => re.test(l));
  assert.ok(at(/Cultural care/) >= 0 && at(/Cultural care/) < at(/brief cc --kind scene/), steps.join('\n'));
  assert.ok(at(/Cultural care/) < at(/reference --render/) && at(/reference --render/) < at(/brief cc --kind scene/), 'care, then the gold standard rendered once, then the briefs');
  const doc = readFileSync(join(root, 'docs', 'dev', 'CC_PACK.md'), 'utf8');
  const making = doc.slice(doc.indexOf('## Making the whole region'));
  assert.ok(making.indexOf('Cultural care') >= 0 && making.indexOf('Cultural care') < making.indexOf('brief cc --kind scene'), 'the doc skeleton lists the care step first');
  assert.match(doc, /Fill the "Cultural care" section FIRST, before any brief is made/);
  const wf = readFileSync(join(ROOT, 'docs', 'dev', 'ANIMATION_PACKS.md'), 'utf8').slice(readFileSync(join(ROOT, 'docs', 'dev', 'ANIMATION_PACKS.md'), 'utf8').indexOf('### Making a new region with the tools'));
  assert.ok(wf.indexOf('Cultural care') >= 0 && wf.indexOf('Cultural care') < wf.indexOf('node tools/anim-pack.mjs brief eu'), 'ANIMATION_PACKS.md: care before the briefs');
  // brief says so while the section is the skeleton, not after it is filled
  const skeleton = await run(['brief', 'cc', '--kind', 'scene', '--batch', '1', '--root', root]);
  assert.match(skeleton.err, /note: the "Cultural care" section of docs\/dev\/CC_PACK\.md is still the skeleton comment: the briefs carry only the general care rules/);
  const region = findRegion(loadRegistry(root, { fresh: true }), 'cc');
  assert.equal(careInfo(root, region).state, 'skeleton');
  const docFile = join(root, 'docs', 'dev', 'CC_PACK.md');
  const withSection = (body) => readFileSync(docFile, 'utf8').replace(/## Cultural care\n\n<!--[\s\S]*?-->\n/, `## Cultural care\n\n${body}\n`);
  writeFileSync(docFile, withSection('- Never draw X.\n\n### Rivers\n\n- Draw the river calm.\n\n```md\n# not a heading\n## neither\n```\n\n- Last line after the fence.\n\n#### Deeper\n\n- Still inside.'));
  const info = careInfo(root, region);
  assert.equal(info.state, 'ok');
  for (const line of ['- Never draw X.', '### Rivers', '- Draw the river calm.', '# not a heading', '## neither', '- Last line after the fence.', '#### Deeper', '- Still inside.']) assert.ok(info.own.includes(line), `kept: ${line}`);
  assert.doesNotMatch(info.own, /Adding a place/, 'it stops at the next heading of the SAME level (## Adding a place ...)');
  assert.doesNotMatch((await run(['brief', 'cc', '--kind', 'scene', '--batch', '1', '--root', root])).err, /Cultural care/, 'no note once it is filled in');
  // a higher-level heading ends it; a section under another heading level works too; no section and no doc are named
  writeFileSync(docFile, '# T\n\n### Cultural care (notes)\n\n- Deep one.\n\n#### Sub\n\n- sub line\n\n## Next\n\n- not mine\n');
  assert.deepEqual([careInfo(root, region).state, careInfo(root, region).own.includes('- sub line'), careInfo(root, region).own.includes('not mine')], ['ok', true, false]);
  writeFileSync(docFile, '# T\n\n## Something else\n'); assert.equal(careInfo(root, region).state, 'no-section');
  assert.match((await run(['brief', 'cc', '--kind', 'scene', '--batch', '1', '--root', root])).err, /has no "Cultural care" section/);
  rmSync(docFile); assert.equal(careInfo(root, region).state, 'no-doc');
  assert.match((await run(['brief', 'cc', '--kind', 'scene', '--batch', '1', '--root', root])).err, /CC_PACK\.md does not exist/);
  assert.equal(careFor(root, region), CARE_RULES.map(r => `- ${r}`).join('\n'));
});

test('unit words: city and the other framework kinds are refused by `new`, with a suggestion; empty options and stray commas are errors', async () => {
  const root = makeRoot(), before = files(root);
  for (const w of RESERVED_UNIT_WORDS) { const r = await run(['new', 'ww', 'Ww', '--unit-word', w, '--root', root]); assert.equal(r.code, 1, w); assert.match(r.err, /one of the framework's own kinds \(place, city, big, small, signature, element\)/, w); }
  assert.match((await run(['new', 'ww', 'Ww', '--unit-word', 'city', '--root', root])).err, /Use "town" or "municipality"/);
  for (const [argv, re] of [[['--groups', ''], /--groups is empty/], [['--groups', '  '], /--groups is empty/], [['--unit-word', ''], /--unit-word is empty/], [['--groups', 'a,,b'], /an empty group name/], [['--groups', 'a,'], /an empty group name/], [['--groups', ',a'], /an empty group name/]]) {
    const r = await run(['new', 'ww', 'Ww', ...argv, '--root', root]); assert.equal(r.code, 1, argv.join(' ')); assert.match(r.err, re, argv.join(' '));
  }
  assert.deepEqual(files(root), before, 'nothing was written');
  assert.equal((await run(['new', 'ww', 'Ww', '--unit-word', 'town', '--groups', ' a , b ', '--root', root])).code, 0, 'spaces around names are fine');
});

test('brief --out: group-qualified file names, a plan.json index, stale briefs are refused (or removed with --clean), the other kind\'s briefs stay', async () => {
  const { root } = await shared();
  const out = mkdtempSync(join(tmpdir(), 'anim-plan-')); temps.push(out);
  assert.equal(briefFileOf('scene', 2, ''), 'scene-brief-2.md'); assert.equal(briefFileOf('scene', 1, 'west'), 'scene-brief-west-1.md');
  assert.equal((await run(['brief', 'zz', '--kind', 'element', '--out', out, '--root', root])).code, 0);
  const two = await run(['brief', 'zz', '--kind', 'scene', '--of', '2', '--out', out, '--root', root]);
  assert.equal(two.code, 0, two.err); assert.deepEqual(readdirSync(out).sort(), ['element-brief-1.md', 'element-brief-2.md', 'plan.json', 'scene-brief-1.md', 'scene-brief-2.md']);
  assert.match(two.out, /render the gold standard ONCE[\s\S]*reference --render {6}\(light, night and dark in one run\)[\s\S]*guard --owned/);
  assert.doesNotMatch(two.out, /reference --render --mode/, 'one run renders every mode the briefs cite');
  const plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  assert.equal(plan.region, 'zz'); assert.deepEqual(plan.dispatch, ['element-brief-1.md', 'element-brief-2.md', 'scene-brief-1.md', 'scene-brief-2.md'].sort((a, b) => (plan.dispatch.indexOf(a) - plan.dispatch.indexOf(b))));
  assert.deepEqual(Object.keys(plan.plans).sort(), ['element', 'scene']);
  const sp = plan.plans.scene; assert.equal(sp.of, 2);
  assert.deepEqual(sp.batches.map(b => [b.brief, b.owns, b.count]), [['scene-brief-1.md', ['src/app/71-anim-region-zz-scenes-1.js'], 2], ['scene-brief-2.md', ['src/app/71-anim-region-zz-scenes-2.js'], 1]]);
  assert.deepEqual(sp.batches.flatMap(b => b.keys).sort(), ['place:example-big', 'province:XA', 'province:XB']);
  assert.deepEqual(sp.before, ['node tools/anim-pack.mjs reference --render'], 'light, night and dark in one run (a bare temp checkout is not a git repo: no commit step)');
  assert.equal(sp.afterEach[0].guard, 'node tools/anim-pack.mjs guard --owned src/app/71-anim-region-zz-scenes-1.js');
  assert.match(sp.afterAll[0], /guard --owned src\/app\/71-anim-region-zz-scenes-1\.js,src\/app\/71-anim-region-zz-scenes-2\.js/); assert.ok(sp.afterAll.includes('node --test tests/anim-packs.test.mjs')); assert.ok(sp.afterAll.includes('node --test tests/region-framework.test.mjs tests/zz-pack.test.mjs'));
  // a different plan for the same kind: the old briefs would double-assign keys, so it is refused, nothing is touched
  const was = readFileSync(join(out, 'scene-brief-1.md'), 'utf8');
  const clash = await run(['brief', 'zz', '--kind', 'scene', '--group', 'west', '--out', out, '--root', root]);
  assert.equal(clash.code, 1); assert.match(clash.err, /refusing to write: .* already holds scene briefs that this plan does not overwrite \(scene-brief-1\.md, scene-brief-2\.md\)/); assert.match(clash.err, /--clean/);
  assert.equal(readFileSync(join(out, 'scene-brief-1.md'), 'utf8'), was); assert.equal(existsSync(join(out, 'scene-brief-west-1.md')), false);
  const clean = await run(['brief', 'zz', '--kind', 'scene', '--group', 'west', '--out', out, '--clean', '--root', root]);
  assert.equal(clean.code, 0, clean.err); assert.match(clean.err, /removed 2 stale scene brief\(s\): scene-brief-1\.md, scene-brief-2\.md/);
  assert.deepEqual(readdirSync(out).sort(), ['element-brief-1.md', 'element-brief-2.md', 'plan.json', 'scene-brief-west-1.md'], 'the element briefs of the other kind stay');
  assert.match(readFileSync(join(out, 'scene-brief-west-1.md'), 'utf8'), /scenes-west-1\.js/);
  const plan2 = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  assert.deepEqual(plan2.dispatch.sort(), ['element-brief-1.md', 'element-brief-2.md', 'scene-brief-west-1.md']); assert.equal(plan2.plans.scene.group, 'west');
  // the same plan again simply overwrites; a foreign file is left alone
  writeFileSync(join(out, 'notes.md'), 'mine'); assert.equal((await run(['brief', 'zz', '--kind', 'scene', '--group', 'west', '--out', out, '--root', root])).code, 0); assert.equal(readFileSync(join(out, 'notes.md'), 'utf8'), 'mine');
});

test('a scene key registered in two files is reported by region.check(), status (naming both files) and lint --file; the earlier scene is not silently hidden', async () => {
  const root = await artRoot();
  const cfg = join(root, 'src', 'app', '71-anim-region-zz.js'); writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/\n {2}country: 'XX',/, "\n  country: 'ZZ',"));
  const one = join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), dup = join(root, 'src', 'app', '71-anim-region-zz-scenes-2.js');
  writeFileSync(dup, iife(sceneEntry('province:XA', 'Second drawing')));
  const region = findRegion(loadRegistry(root, { fresh: true }), 'zz');
  assert.deepEqual(region.sceneDuplicates(), [['province:XA', 2]]);
  assert.match(region.check().join('\n'), /DUPLICATE SCENE KEY province:XA \(registered 2 times/);
  const st = JSON.parse((await run(['status', 'zz', '--json', '--no-lint', '--root', root])).out);
  assert.deepEqual(st.duplicates, [{ key: 'province:XA', count: 2, files: ['71-anim-region-zz-scenes-1.js', '71-anim-region-zz-scenes-2.js'] }]);
  assert.equal(st.complete, false); assert.ok(!st.problems.some(p => /DUPLICATE/.test(p)), 'reported once, with its files');
  const text = (await run(['status', 'zz', '--no-lint', '--short', '--root', root])).out;
  assert.match(text, /DUPLICATE SCENE KEYS \(1\)[\s\S]*province:XA: registered 2 times, in 71-anim-region-zz-scenes-1\.js, 71-anim-region-zz-scenes-2\.js: keep one/); assert.match(text, /1 duplicate scene key\(s\)/);
  for (const f of [dup, one]) {   // both agents are told, not only the later one
    const r = await run(['lint', '--file', f, '--root', root]);
    assert.equal(r.code, 1, f); assert.match(r.err, /lint: DUPLICATE SCENE KEY province:XA \(region zz\) is registered 2 times, in 71-anim-region-zz-scenes-1\.js, 71-anim-region-zz-scenes-2\.js/); assert.match(r.err, /nothing was linted/);
  }
});

test('lint --file and sheet --file fail loudly: a file that registers nothing, a key that does not exist, a scene for a small place, a scene no pack uses', async () => {
  const root = await artRoot();
  const stub = join(root, 'src', 'app', '71-anim-region-zz-scenes-5.js');
  writeFileSync(stub, '(function () {\n  const K = animSceneKit();\n})();\n');
  const nothing = await run(['lint', '--file', stub, '--root', root]);
  assert.equal(nothing.code, 1); assert.match(nothing.err, /registered no new or changed item, so there is nothing to lint/);
  const bogus = join(root, 'src', 'app', '71-anim-region-zz-scenes-6.js');
  writeFileSync(bogus, iife(sceneEntry('province:XA', 'Good one'), sceneEntry('province:ZZ', 'No such province')));
  const r = await run(['lint', '--file', bogus, '--root', root]);
  assert.equal(r.code, 1); assert.match(r.err, /lint: province:ZZ \(region zz\): not a province\. A scene key is a key of the region/); assert.match(r.err, /nothing was linted/);
  assert.match((await run(['sheet', '--file', bogus, '--root', root])).err, /the scene file\(s\) are not sound:\s+province:ZZ \(region zz\): not a province/);
  const small = join(root, 'src', 'app', '71-anim-region-zz-scenes-7.js');
  writeFileSync(small, iife(sceneEntry('place:example-small', 'A scene for a small place')));
  assert.match((await run(['lint', '--file', small, '--root', root])).err, /place:example-small \(region zz\): a scene is for a big place/);
  // dead art: the pack file of its group does not call B.scenes(), so no item uses the scene
  rmSync(small); rmSync(bogus);
  const east = join(root, 'src', 'app', '72-anim-pack-zz-east.js');
  writeFileSync(east, readFileSync(east, 'utf8').replace('  B.scenes();', '  // B.scenes();'));
  const extra = join(root, 'src', 'app', '71-anim-region-zz-scenes-8.js');
  writeFileSync(extra, iife(sceneEntry('province:XB', 'Dead art')));
  const dead = await run(['lint', '--file', extra, '--root', root]);
  assert.equal(dead.code, 1); assert.match(dead.err, /province:XB \(region zz\): a scene is registered but no pack item uses it \(is the pack file of its group calling B\.scenes\(\)/);
  // a sound file still lints (exit 2 here only because the toy art is thin: the point is that it was linted)
  rmSync(extra); writeFileSync(east, readFileSync(east, 'utf8').replace('  // B.scenes();', '  B.scenes();'));
  assert.equal((await run(['lint', '--file', join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), '--root', root, '--quiet'])).code, 2);
});

test('options: starter rows never overlap another scaffold, extra positionals are errors, the first starter position is kept', async () => {
  const root = makeRoot();
  assert.equal((await run(['new', 'aa', 'Aa', '--root', root])).code, 0); assert.equal((await run(['new', 'bb', 'Bb', '--groups', 'a,b,c,d,e,f,g,h', '--root', root])).code, 0); assert.equal((await run(['new', 'cc', 'Cc', '--root', root])).code, 0);
  const reg = loadRegistry(root, { fresh: true });
  const rows = (id) => findRegion(reg, id).places.map(p => [p[3], p[4]]);
  const km = (a, b) => { const r = Math.PI / 180, x = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2; return 12742 * Math.asin(Math.sqrt(x)); };
  const first = rows('aa'); assert.deepEqual(first[0], [STARTER_BASE.lat, STARTER_BASE.lon], 'the first scaffold keeps the usual position');
  for (const [x, y] of [['aa', 'bb'], ['aa', 'cc'], ['bb', 'cc']]) for (const a of rows(x)) for (const b of rows(y)) assert.ok(km(a, b) >= 1500, `${x} and ${y} starter rows are ${Math.round(km(a, b))} km apart: far outside each other's reach (150 km)`);
  for (const id of ['aa', 'bb', 'cc']) for (const o of reg.R.ANIM_REGIONS) if (o.id !== id) for (const p of findRegion(reg, id).places) assert.equal(o.unitOf({ lat: p[3], lon: p[4] }), '', `${id} row ${p[0]} sits inside ${o.id}'s reach`);
  assert.deepEqual(starterData(['x'], 'state').rows[0].slice(3, 5), [-50, -25]); assert.deepEqual(starterData(['x'], 'state', { lat: -44, lon: 5 }).rows[0].slice(3, 5), [-44, 5]);
  assert.equal(starterBaseFor(loadRegistry(makeRoot(), { fresh: true }), ['north', 'south'], 'country').lat, STARTER_BASE.lat);
  for (const [argv, re] of [[['status', 'zz', 'yy'], /status takes one region, got 2 \(zz, yy\)/], [['brief', 'zz', 'yy', '--kind', 'scene'], /brief takes one region/], [['guard', 'x', '--owned', 'a'], /guard takes no positional argument/]]) {
    const r = await run([...argv, '--root', root]); assert.equal(r.code, 1, argv.join(' ')); assert.match(r.err, re, argv.join(' '));
  }
});

test('the briefs close the prompt gaps: pass mark, evidence of looking, git status, time of day, people, safe zones, markup, variety, scale, the gold standard rendered once, full paths', async () => {
  const { root } = await shared();
  const rubric = readFileSync(join(ROOT, '.claude', 'skills', 'animation-pack', 'references', 'rubric.md'), 'utf8'), skill = readFileSync(join(ROOT, '.claude', 'skills', 'animation-pack', 'SKILL.md'), 'utf8');
  const sceneMd = (await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--root', root])).out, el = (await run(['brief', 'zz', '--kind', 'element', '--batch', '1', '--root', root])).out;
  // the pass mark is IN the brief, and is the rubric's
  assert.deepEqual([RUBRIC_PASS.score, RUBRIC_PASS.of], [18, 20]);
  assert.ok(passMark('scene').includes('18 of 20 lines of part A (R1 to R20)') && passMark('scene').includes(RUBRIC_PASS.core.scene.join(', ')) && passMark('item').includes(RUBRIC_PASS.core.item.join(', ')));
  assert.ok(sceneMd.includes(passMark('scene')) && el.includes(passMark('item')));
  for (const c of RUBRIC_PASS.core.scene) assert.ok(new RegExp(`\\b${c}\\b`).test(rubric.split('## 3. Part A')[0]), `rubric section 2 names the core line ${c}`);
  for (const c of RUBRIC_PASS.core.item) assert.ok(new RegExp(`\\b${c}\\b`).test(rubric.split('## 3. Part A')[0]), `rubric section 2 names the core line ${c}`);
  assert.match(rubric, /at least 18 of 20/); assert.match(skill, />= 18\/20/);
  // looking is evidenced, the report carries git status
  for (const md of [sceneMd, el]) {
    assert.match(md, /ONE concrete thing you saw in it and ONE defect\s+you found in it|ONE concrete thing you saw in it and ONE defect you found in it/); assert.match(md, /"none" is not accepted/);
    assert.match(md, /GIT: <the output of `git status --short`, verbatim: only your/); assert.match(md, /WEAKEST THREE/); assert.match(md, /reply with exactly this block/);
    assert.match(md, /Sections 3 to 8 are the quality contract/); assert.match(md, /If you notice that you are rushing/);
    assert.doesNotMatch(md, /nothing implied/);
  }
  assert.match(sceneMd, /LOOKED: <per scene and render: png path \| one concrete thing seen \| one defect found/);
  // time of day, people, safe zones, allowed markup
  assert.match(sceneMd, /Time of day is yours[\s\S]*a night scene is painted as night[\s\S]*the shared evening grade then darkens/); assert.doesNotMatch(sceneMd, /Paint for daylight \(a dusk/);
  assert.match(sceneMd, /tiny faceless silhouette as a scale cue is allowed/); assert.match(CARE_RULES.join('\n'), /tiny anonymous silhouette without features, a few pixels tall, used as a scale cue/);
  assert.ok(sceneMd.includes(safeZones()) && /central 900 \(x 350 to 1250\)/.test(safeZones()) && /central 420 to 506 \(x 590 to 1010 at the narrowest/.test(safeZones()), safeZones());
  assert.doesNotMatch(sceneMd, /middle 1200 x 800/);
  assert.ok(sceneMd.includes(markupRules('scene')) && el.includes(markupRules('item')));
  for (const t of allowedTagList()) assert.ok(markupRules().includes('`' + t + '`'), t);
  assert.match(markupRules(), /REJECTS: `text`.*`image`.*`script`.*`style`.*`a`.*`animate`/); assert.doesNotMatch(markupRules().split('REJECTS')[0], /`use`/);
  assert.doesNotMatch(sceneMd, /No text, images, `<use>`|the markup sanitiser rejects/);
  // variety columns, scale, the gold standard rendered once, full paths
  assert.match(sceneMd, /\| # \| key \| what to draw \| group \| status \| suggested time \| season \| type \| palette \|/); assert.match(el, /suggested motif kind \| suggested colour/);
  assert.match(sceneMd, /SUGGESTIONS from a fixed rotation over the whole region/); assert.match(sceneMd, /does not coordinate the batches/);
  assert.match(sceneMd, /do NOT render the exemplars yourself/); assert.doesNotMatch(sceneMd + el, /^\s*node tools\/anim-pack\.mjs reference --render/m);
  assert.match(sceneMd, /PNG: \.anim-ref\/us-northeast__new-york-skyline-light\.png , \.anim-ref\/us-northeast__new-york-skyline-night\.png/);
  assert.match(el, /PNG: \.anim-ref\/us-pacific__hi-sea-turtle-light\.png , \.anim-ref\/us-pacific__hi-sea-turtle-dark\.png/);
  assert.doesNotMatch(sceneMd + el, /(?<!animation-pack\/)references\/[a-z-]+\.md/, 'every reference is cited with its full path');
  assert.match(el, /read: src\/app\/72-anim-pack-us-pacific\.js \(B\.state\('HI', 'element', \{ id: 'sea-turtle' \}\)\)/); assert.match(el, /read: src\/app\/72-anim-pack-us-northeast\.js \(B\.state\('VT', 'element', \{ id: 'maple-syrup' \}\)\)/);
  assert.doesNotMatch(el.split('## 5. Draw')[0].split('Accepted small items that are flat')[1], /\`asia-west\/sa-signature\`/, 'the element agent\'s negative examples are small items, not scenes');
  // neutral examples: XX, a neutral motif, a label that does not name the place
  assert.match(el, /B\.element\('XX', \{ id: 'motif', label: 'A quiet motif'/); assert.doesNotMatch(el, /'JP'|sushi|food'\]/); assert.doesNotMatch(sceneMd, /Kyoto/); assert.match(sceneMd, /label: 'Terraced hills at dusk'/);
  // the variety rotation: deterministic, over the whole region, different across batches and inside a cycle
  const needs = regionNeeds(findRegion(loadRegistry(ROOT), 'asia')), v = varietyOf(needs);
  assert.deepEqual([...v.scene.keys()], needs.keys.map(k => k.key));
  assert.equal(new Set(needs.keys.slice(0, 7).map(k => v.scene.get(k.key).time)).size, 7, 'seven consecutive keys have seven different times of day');
  assert.ok(new Set(needs.keys.map(k => v.scene.get(k.key).palette)).size >= 6 && new Set(needs.keys.map(k => v.scene.get(k.key).type)).size >= 9);
  const plan = JSON.parse((await run(['brief', 'asia', '--kind', 'scene', '--json'])).out);
  assert.deepEqual(plan.batches.flatMap(b => b.keys.map(k => k.key)), needs.keys.map(k => k.key));
  assert.deepEqual(varietyOf(needs).scene.get(needs.keys[40].key), v.scene.get(needs.keys[40].key), 'the same key gets the same suggestion whatever batch or filter it is briefed in');
  assert.equal(SCENES_PER_AGENT, 7);
  // a partly done batch: the heading counts what is TO DRAW, done keys say "leave alone", a redraw is the orchestrator's
  const part = await artRoot();
  const md = (await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--root', part])).out;
  assert.match(md, /^# Brief: draw 0 full-screen scenes for/); assert.match(md, /done \(leave alone\)/); assert.match(md, /Redrawing a finished piece is the orchestrator's decision and the orchestrator names the file that holds it/);
  assert.match(md, /scenes drawn and passing: <n of 0>/);
});

test('the skill and the docs agree with the briefs: the same pass mark, the failure rule, the people rule, the safe zones, guard and the order of the care step', () => {
  const base = join(ROOT, '.claude', 'skills', 'animation-pack');
  const text = (f) => readFileSync(join(base, f), 'utf8');
  const skill = text('SKILL.md'), workflow = text('references/workflow.md'), rubric = text('references/rubric.md'), style = text('references/style-guide.md');
  for (const t of [skill, workflow]) assert.match(t, /guard --owned/);
  for (const t of [skill, workflow, rubric]) assert.doesNotMatch(t, /leave the piece as it is|Leave the piece as it is|leave it as it is/, 'the "believe the art is right, leave it" escape is gone');
  assert.match(skill, /REMOVE|remove it from the file/); assert.match(skill, /\.anim-ref\/drafts/); assert.match(skill, /at most 3 attempts|3 attempts/);
  assert.match(skill, /tiny anonymous (faceless )?silhouette/i); assert.match(rubric, /tiny anonymous (faceless )?silhouette/i);
  assert.match(style, /x 590 to 1010/); assert.match(rubric, /x 590\.\.1010/); assert.match(skill, /--crop phone/);
  assert.doesNotMatch(style + rubric, /subject lives inside x 200\.\.1400|middle 1200 x 800/);
  assert.match(rubric, /richness >= 0\.90/); assert.match(skill + workflow, /richness >= 0\.90/);
  assert.ok(workflow.indexOf('| 4 | Care notes') < workflow.indexOf('| 5 | Gold standard and briefs'), 'care notes are before the briefs in the stage table');
  assert.match(workflow, /reference --render` \(light, night, dark\) ONCE|reference --render.*once/);
});

/* ---------- guard ---------- */

/** A throw-away git repository with a few tracked files, to prove what `guard` sees. */
function gitRepo(prefix = '') {
  const dir = mkdtempSync(join(tmpdir(), 'anim-guard-')); temps.push(dir);
  const git = (...a) => { const r = spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8' }); assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`); return r.stdout; };
  git('init', '-q');
  const w = (rel, text) => { const p = join(dir, prefix, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); };
  w('src/app/71-anim-region-zz-scenes-1.js', 'a\n'); w('src/app/71-anim-region-zz-scenes-2.js', 'b\n'); w('src/app/72-anim-pack-zz-west.js', 'c\n'); w('tools/anim-quality.json', '{}\n'); w('tools/anim-reference.json', '{}\n'); w('tests/zz-pack.test.mjs', 't\n'); w('docs/dev/ZZ_PACK.md', 'd\n');
  writeFileSync(join(dir, '.gitignore'), '.anim-ref/\n');
  git('add', '-A'); git('commit', '-q', '-m', 'base');
  return { dir, root: join(dir, prefix), git, w, p: (rel) => join(dir, prefix, rel) };
}
const OWN1 = 'src/app/71-anim-region-zz-scenes-1.js', OWN2 = 'src/app/71-anim-region-zz-scenes-2.js';

test('guard: passes when only the owned files changed (modified, new, deleted) and fails (exit 2) on any other file; ignored files are not changes', async () => {
  const g = gitRepo();
  const guard = (...a) => run(['guard', ...a, '--root', g.root]);
  assert.match((await guard('--owned', OWN1)).out, /guard: OK\. 0 changed files \(the owned files are unchanged\)/);
  g.w(OWN1, 'a2\n'); mkdirSync(join(g.dir, '.anim-ref', 'x'), { recursive: true }); writeFileSync(join(g.dir, '.anim-ref', 'x', 'p.png'), 'png');
  const ok = await guard('--owned', OWN1);
  assert.equal(ok.code, 0, ok.out); assert.match(ok.out, /guard: OK\. 1 changed file, all of them owned:\n {2}M {2}src\/app\/71-anim-region-zz-scenes-1\.js/, 'the git-ignored .anim-ref/ is not a change');
  g.w('src/app/71-anim-region-zz-scenes-3.js', 'new\n');
  const stray = await guard('--owned', OWN1);
  assert.equal(stray.code, 2); assert.match(stray.out, /guard: FAIL\. 1 changed file outside the batch:\n {2}\?\? src\/app\/71-anim-region-zz-scenes-3\.js {3}\(not one of the owned files\)/); assert.match(stray.out, /owned and changed \(fine\)/);
  assert.equal((await guard('--owned', `${OWN1},src/app/71-anim-region-zz-scenes-3.js`)).code, 0, 'a comma list, and the union of several agents\' files');
  assert.equal((await guard('--owned', OWN1, '--owned', 'src/app/71-anim-region-zz-scenes-3.js')).code, 0, 'or the option repeated');
  rmSync(g.p(OWN2)); const del = await guard('--owned', `${OWN1},src/app/71-anim-region-zz-scenes-3.js`);
  assert.equal(del.code, 2); assert.match(del.out, / D {1,2}src\/app\/71-anim-region-zz-scenes-2\.js/, 'a deleted foreign file');
  const j = JSON.parse((await guard('--owned', OWN1, '--json')).out);
  assert.equal(j.ok, false); assert.deepEqual(j.violations.map(v => v.path).sort(), ['src/app/71-anim-region-zz-scenes-2.js', 'src/app/71-anim-region-zz-scenes-3.js']);
});

test('guard: a threshold, waiver, gold-standard or test change fails even when it is listed as owned; a rename counts both names', async () => {
  const g = gitRepo();
  const guard = (...a) => run(['guard', ...a, '--root', g.root]);
  for (const [file, why] of [['tools/anim-quality.json', /the thresholds and the waiver list: never an agent's to edit/], ['tools/anim-reference.json', /the gold-standard list/], ['tests/zz-pack.test.mjs', /a test/]]) {
    g.w(file, 'changed\n');
    const r = await guard('--owned', `${OWN1},${file}`);
    assert.equal(r.code, 2, file); assert.match(r.out, why, file);
    spawnSync('git', ['-C', g.dir, 'checkout', '--', file]);
  }
  g.w('docs/dev/ZZ_PACK.md', 'changed\n');
  assert.match((await guard('--owned', OWN1)).out, /docs\/dev\/ZZ_PACK\.md {3}\(not one of the owned files\)/, 'anything else outside the owned set');
  spawnSync('git', ['-C', g.dir, 'checkout', '--', 'docs/dev/ZZ_PACK.md']);
  assert.equal(forbiddenReason('tests/a/b.test.mjs'), 'a test'); assert.equal(forbiddenReason('src/app/x.js'), '');
  spawnSync('git', ['-C', g.dir, 'mv', OWN2, 'src/app/71-anim-region-zz-scenes-9.js']);
  const mv = await guard('--owned', 'src/app/71-anim-region-zz-scenes-9.js');
  assert.equal(mv.code, 2); assert.match(mv.out, /71-anim-region-zz-scenes-2\.js/, 'the old name of a rename is a change too');
  assert.equal((await guard('--owned', 'src/app/71-anim-region-zz-scenes-9.js,' + OWN2)).code, 0);
  assert.deepEqual(parseStatus('R  new.js\0old.js\0?? u.js\0 M m.js\0').map(x => x.path), ['new.js', 'old.js', 'u.js', 'm.js']);
  assert.deepEqual(parseNameStatus('M\0a.js\0R100\0old.js\0new.js\0D\0gone.js\0').map(x => x.path), ['a.js', 'old.js', 'new.js', 'gone.js']);
});

test('guard: --base compares with a commit (what was committed since too), a repository in a sub-folder works, and bad input is an error', async () => {
  const g = gitRepo('sub');
  const guard = (...a) => run(['guard', ...a, '--root', g.root]);
  g.w(OWN1, 'a2\n'); g.git('add', '-A'); g.git('commit', '-q', '-m', 'agent');
  assert.match((await guard('--owned', OWN1)).out, /0 changed files/, 'committed: not an uncommitted change');
  const since = await guard('--owned', OWN2, '--base', 'HEAD~1');
  assert.equal(since.code, 2); assert.match(since.out, / M {1,2}src\/app\/71-anim-region-zz-scenes-1\.js {3}\(not one of the owned files\)/, 'since the base, the committed change counts (paths relative to the root)');
  assert.equal((await guard('--owned', OWN1, '--base', 'HEAD~1')).code, 0);
  assert.match((await guard('--owned', OWN1, '--base', 'nope')).err, /--base "nope" is not a commit/);
  assert.match((await guard()).err, /guard needs --owned/); assert.match((await guard('--owned', ' , ')).err, /guard needs --owned/); assert.match((await guard('--owned', 'a', '--base', '')).err, /--base is empty/);
  const plain = mkdtempSync(join(tmpdir(), 'anim-nogit-')); temps.push(plain);
  const ng = await run(['guard', '--owned', 'a.js', '--root', plain]); assert.equal(ng.code, 1); assert.match(ng.err, /is not inside a git work tree/);
  assert.deepEqual(guardResult(g.root, [OWN1]).owned, [OWN1]);
  assert.match((await run(['--help'])).out, /guard\s+prove a batch of agents touched only their own files/); assert.match((await run(['guard', '--help'])).out, /--owned[\s\S]*--base[\s\S]*--json/);
});

/* ---------- every command and path quoted in the skill, the templates and the docs is real ---------- */

test('every `node tools/anim-pack.mjs ...` command quoted in the skill, the templates and the docs names a real subcommand and real options; every quoted repo path exists', async () => {
  const table = await loadCommands();
  const sources = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(md|tpl)$/.test(f)) sources.push(p); } };
  walk(join(ROOT, '.claude', 'skills', 'animation-pack')); walk(TEMPLATES_DIR);
  sources.push(join(ROOT, 'docs', 'dev', 'ANIMATION_PACKS.md'));
  const bad = [];
  let commands = 0;
  for (const file of sources) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/node tools\/anim-pack\.mjs ([^\n`|#]*)/g)) {
      const words = m[1].trim().split(/\s+/);
      const name = words[0];
      if (!name || /^[<{(\[.-]/.test(name)) continue;
      commands++;
      const cmd = table[name];
      if (!cmd) { bad.push(`${file.replace(ROOT, '')}: unknown command "${name}" in "${m[0].trim()}"`); continue; }
      const known = new Set([...Object.keys(cmd.options || {}), 'root', 'help']);
      for (const w of words.slice(1)) { const f = /^--([a-z-]+)/.exec(w); if (f && !known.has(f[1])) bad.push(`${file.replace(ROOT, '')}: "${name}" has no --${f[1]} ("${m[0].trim().slice(0, 90)}")`); }
    }
    for (const m of text.matchAll(/`((?:src\/app|tools|tests|docs|\.claude)\/[A-Za-z0-9_./-]+)`/g)) {
      const p = m[1];
      if (/[<*]|\bN\b|-N[.-]|\.anim-ref|-<|<id>|_PACK|\{\{/.test(p) || /(^|\/)(eu|zz)[-.]|\/EU_|-eu[-.]|ID_|-id-/.test(p) || p.endsWith('/')) continue;
      if (/-(west|east|north|south)\./.test(p) && !existsSync(join(ROOT, p))) continue;
      if (!existsSync(join(ROOT, p))) bad.push(`${file.replace(ROOT, '')}: the path ${p} does not exist`);
    }
  }
  assert.deepEqual(bad, []);
  assert.ok(commands > 60, `${commands} commands checked`);
});

test('the verify block of a generated brief runs: every command is a real invocation (scene and element briefs, in a scaffold with art)', async () => {
  const root = await artRoot();
  const cfg = join(root, 'src', 'app', '71-anim-region-zz.js'); writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/\n {2}country: 'XX',/, "\n  country: 'ZZ',"));
  const browser = !!findBrowser();
  let ran = 0;
  for (const [kind, batch] of [['scene', 1], ['element', 1]]) {
    const md = (await run(['brief', 'zz', '--kind', kind, '--batch', String(batch), '--root', root])).out;
    const block = /```bash\n([\s\S]*?)\n```/.exec(md)[1].split('\n').filter(l => l && !l.startsWith('#'));
    assert.ok(block.length >= 6, kind);
    for (const line of block) {
      const [first, second, ...rest] = line.split(/\s+/);
      if (first === 'git') continue;
      if (line.startsWith('node --check ')) { assert.equal(spawnSync(process.execPath, ['--check', join(root, line.slice('node --check '.length))]).status, 0, line); ran++; continue; }
      assert.equal(first + ' ' + second, 'node tools/anim-pack.mjs', line);
      const argv = rest;
      if (argv[0] === 'sheet' && !browser) continue;
      const out = mkdtempSync(join(tmpdir(), 'anim-verify-')); temps.push(out);
      const fixed = argv.map((a, i) => (argv[i - 1] === '--out' ? join(out, a.replace(/^.*\//, '')) : argv[i - 1] === '--file' ? join(root, a) : a));   // the briefs run from the repository root; the test's root is a temp copy
      const r = await run([...fixed, '--root', root]);
      assert.ok([0, 2].includes(r.code), `${line} -> exit ${r.code}: ${r.err}`);   // 2 = the toy art fails the lint, which is the point: the command ran
      ran++;
    }
  }
  assert.ok(ran >= 12, `${ran} commands ran`);
});

/* ---------- FIX3A: the pilot's friction in the tooling ---------- */

const git = (dir, ...a) => { const r = spawnSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@example.invalid', '-c', 'commit.gpgsign=false', ...a], { encoding: 'utf8' }); assert.equal(r.status, 0, `git ${a.join(' ')}: ${r.stderr}`); return r.stdout; };
/** A scaffold (province, groups west and east) in a temp checkout that is also a git repository: the animation sources are committed, the scaffold is not. */
async function gitScaffold() {
  const root = makeRoot();
  git(root, 'init', '-q'); writeFileSync(join(root, '.gitignore'), '.anim-ref/\n'); git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'sources');
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  return root;
}
const retarget = (root, from, to) => { const f = join(root, 'src', 'app', '71-anim-region-zz.js'); writeFileSync(f, readFileSync(f, 'utf8').replace(from, to)); };

test('season: the suggestion follows the latitude (any in the tropics, the local season with the flipped label in the south), and the briefs and plan.json say what season means', async () => {
  // the rule
  for (const [lat, base, want] of [[-17.8, 'autumn', ['any', 'any']], [-9.5, 'winter', ['any', 'any']], [23.4, 'winter', ['any', 'any']], [-23.4, 'summer', ['any', 'any']],
    [23.6, 'winter', ['winter', 'winter']], [-23.6, 'winter', ['winter', 'summer']], [35.7, 'autumn', ['autumn', 'autumn']], [-37.8, 'autumn', ['autumn', 'spring']], [-37.8, 'spring', ['spring', 'autumn']], [-45, 'summer', ['summer', 'winter']], [47, 'spring', ['spring', 'spring']],
    [undefined, 'summer', ['summer', 'summer']], [NaN, 'summer', ['summer', 'summer']]]) {
    const r = seasonFor(lat, base); assert.deepEqual([r.season, r.label], want, `${lat} ${base}`);
  }
  assert.equal(TROPIC_LAT, 23.5); assert.deepEqual(SEASONS, ['spring', 'summer', 'autumn', 'winter']);
  assert.equal(seasonCell({ season: 'any', seasonLabel: 'any' }), 'any'); assert.equal(seasonCell({ season: 'autumn', seasonLabel: 'autumn' }), 'autumn'); assert.equal(seasonCell({ season: 'autumn', seasonLabel: 'spring' }), "autumn (season: 'spring')");
  // the rotation: a key's season depends on its latitude only; the tropics never get a four-season word
  const keys = Array.from({ length: 28 }, (_, i) => ({ key: 'place:p' + i, kind: 'place', lat: i % 3 === 0 ? -17.8 : i % 3 === 1 ? 10 : -37.8 }));
  const v = varietyOf({ keys, groups: [] }).scene;
  for (const k of keys) { const x = v.get(k.key); if (Math.abs(k.lat) < TROPIC_LAT) assert.deepEqual([x.season, x.seasonLabel], ['any', 'any'], k.key); else assert.notEqual(x.season, 'any', k.key); }
  const south = keys.filter(k => k.lat < -30).map(k => v.get(k.key)); assert.ok(south.length > 5);
  for (const x of south) assert.equal(x.seasonLabel, ({ spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' })[x.season], 'the south flips the label');
  // a unit key carries the mean latitude of its rows
  const reg = loadRegistry(ROOT), needs = regionNeeds(findRegion(reg, 'asia'));
  const jp = needs.keys.find(k => k.key === 'country:JP'), sg = needs.keys.find(k => k.key === 'country:SG'), id = needs.keys.find(k => k.key === 'country:ID');
  assert.ok(jp.lat > 30 && jp.lat < 40, String(jp.lat)); assert.ok(Math.abs(sg.lat) < 3); assert.ok(Number.isFinite(id.lat) && Number.isFinite(jp.lon));
  const asia = varietyOf(needs).scene;
  assert.equal(asia.get('country:SG').season, 'any', 'Singapore has no autumn'); assert.notEqual(asia.get('country:JP').season, 'any');
  for (const k of needs.keys) if (Math.abs(k.lat) < TROPIC_LAT) assert.equal(asia.get(k.key).season, 'any', k.key + ' is in the tropics');
  // a tropical scaffold: every suggestion is `any`, no autumn anywhere; a northern one: the words as they are; a southern one: the label is written out
  const brief = async (root) => (await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--root', root])).out;
  const trop = makeRoot(); assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', trop])).code, 0);
  const cfg = join(trop, 'src', 'app', '71-anim-region-zz.js'), text = readFileSync(cfg, 'utf8');
  writeFileSync(cfg, text.replace(/-50\.00/g, '-10.00').replace(/-52\.00/g, '-12.00'));
  const tmd = await brief(trop), rows = tmd.split('\n').filter(l => /^\| \d+ \| `/.test(l));
  assert.equal(rows.length, 3); for (const r of rows) assert.equal(r.split(' | ')[6], 'any', r);
  assert.doesNotMatch(rows.join('\n'), /autumn|spring|summer|winter/, 'the tropics: no four-season word in the table');
  const north = makeRoot(); assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', north])).code, 0);
  writeFileSync(join(north, 'src', 'app', '71-anim-region-zz.js'), text.replace(/-50\.00/g, '50.00').replace(/-52\.00/g, '52.00'));
  const nrows = (await brief(north)).split('\n').filter(l => /^\| \d+ \| `/.test(l)); assert.ok(nrows.every(r => /^(spring|summer|autumn|winter)$/.test(r.split(' | ')[6])), nrows.join('\n'));
  const { root } = await shared(); const srows = (await brief(root)).split('\n').filter(l => /^\| \d+ \| `/.test(l));
  assert.ok(srows.every(r => /^(spring|summer|autumn|winter) \(season: '(spring|summer|autumn|winter)'\)$/.test(r.split(' | ')[6])), 'the south: the local season and the label to write: ' + srows.join('\n'));
  // what season means is IN the brief and in plan.json
  for (const md of [tmd, await brief(root)]) {
    assert.ok(md.includes(SEASON_NOTE)); assert.match(md, /only a LABEL/); assert.match(md, /does NOT decide when the scene plays/); assert.match(md, /Use `any` unless the picture really shows one season/); assert.match(md, /tropics \(\|latitude\| < 23\.5\) have no four seasons/); assert.match(md, /local autumn \(March to May\) is labelled `spring`/);
  }
  const out = mkdtempSync(join(tmpdir(), 'anim-season-')); temps.push(out);
  assert.equal((await run(['brief', 'zz', '--kind', 'scene', '--out', out, '--root', root])).code, 0);
  const plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).plans.scene;
  assert.equal(plan.seasonNote, SEASON_NOTE); assert.ok(Object.values(plan.suggestions).every(x => 'seasonLabel' in x && 'season' in x));
  // the framework agrees: a region item's season does not gate play (animSpecialPick never reads it), which is why the note says "label"
  const registry = readFileSync(join(APP, '71-anim-registry.js'), 'utf8'), pick = registry.slice(registry.indexOf('function animSpecialPick'), registry.indexOf('function animDailyPick'));
  assert.ok(!/season/.test(pick), 'animSpecialPick has no season rule: the label is only a label');
});

test('brief --out creates the empty scene file of every batch that has none (listed in plan.json), keeps an existing file as it is, and refuses before it writes anything', async () => {
  const root = makeRoot(); assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  const out = mkdtempSync(join(tmpdir(), 'anim-stub-')); temps.push(out);
  const one = join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), two = join(root, 'src', 'app', '71-anim-region-zz-scenes-2.js'), three = join(root, 'src', 'app', '71-anim-region-zz-scenes-3.js');
  writeFileSync(one, '// an agent was here\n(function () { const K = animSceneKit(); })();\n');
  assert.equal(existsSync(two), false);
  const r = await run(['brief', 'zz', '--kind', 'scene', '--of', '3', '--out', out, '--root', root]);
  assert.equal(r.code, 0, r.err);
  assert.equal(readFileSync(one, 'utf8'), '// an agent was here\n(function () { const K = animSceneKit(); })();\n', 'an existing scene file is never touched');
  const region = findRegion(loadRegistry(root, { fresh: true }), 'zz');
  assert.equal(readFileSync(two, 'utf8'), sceneStubText(region, 2)); assert.equal(readFileSync(three, 'utf8'), sceneStubText(region, 3));
  assert.match(readFileSync(two, 'utf8'), /^\/\*[\s\S]*batch 2\.[\s\S]*\*\/\n\(function \(\) \{\n {2}const K = animSceneKit\(\);/);
  assert.match(r.out, /created 2 empty scene files[\s\S]*71-anim-region-zz-scenes-2\.js[\s\S]*71-anim-region-zz-scenes-3\.js/);
  const plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).plans.scene;
  assert.deepEqual(plan.created, ['src/app/71-anim-region-zz-scenes-2.js', 'src/app/71-anim-region-zz-scenes-3.js']);
  assert.ok(plan.batches.every(b => b.owns.every(f => existsSync(join(root, f)))), 'every file a batch owns exists before its agent starts');
  assert.doesNotMatch(readFileSync(join(out, 'scene-brief-2.md'), 'utf8'), /does not exist yet: create it/, 'the brief no longer says the file is missing');
  // the stubs load, register nothing and are loud when linted alone
  assert.deepEqual(findRegion(loadRegistry(root, { fresh: true }), 'zz').check().filter(p => !/^starter:/.test(p)), []);
  const lint = await run(['lint', '--file', two, '--root', root]); assert.equal(lint.code, 1); assert.match(lint.err, /registered no new or changed item/);
  // a re-run: nothing is created again, the earlier list stays
  const again = await run(['brief', 'zz', '--kind', 'scene', '--of', '3', '--out', out, '--root', root]);
  assert.doesNotMatch(again.out, /created \d+ empty scene file/); assert.deepEqual(JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).plans.scene.created, plan.created);
  // a refusal (a stale plan) happens BEFORE anything is created
  const west = join(root, 'src', 'app', '71-anim-region-zz-scenes-west-1.js');
  const refused = await run(['brief', 'zz', '--kind', 'scene', '--group', 'west', '--out', out, '--root', root]);
  assert.equal(refused.code, 1); assert.match(refused.err, /refusing to write/); assert.equal(existsSync(west), false, 'nothing was created by a refused run');
  assert.equal((await run(['brief', 'zz', '--kind', 'scene', '--group', 'west', '--out', out, '--clean', '--root', root])).code, 0); assert.equal(existsSync(west), true, 'a group filter names its own file');
  // printing a brief (no --out) writes nothing
  const bare = makeRoot(); assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', bare])).code, 0);
  assert.equal((await run(['brief', 'zz', '--kind', 'scene', '--of', '2', '--batch', '2', '--root', bare])).code, 0); assert.equal(existsSync(join(bare, 'src', 'app', '71-anim-region-zz-scenes-2.js')), false);
  // --of is a number of batches, cut at group boundaries: the printed line says so (the pilot read "about 7 per agent" as a promise)
  assert.match(r.out, /--of M sets the number of batches, cut at group boundaries where that costs little, so the sizes can differ/); assert.doesNotMatch(r.out, /--of M changes it/);
});

test('brief --note is stored in plan.json and re-read on every re-run (never silently dropped); --clear-notes forgets them', async () => {
  const { root } = await shared();
  const out = mkdtempSync(join(tmpdir(), 'anim-notes-')); temps.push(out);
  const planOf = () => JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).plans.scene;
  const first = await run(['brief', 'zz', '--kind', 'scene', '--out', out, '--note', 'Prefer morning light.', '--note', 'No bridges.', '--root', root]);
  assert.equal(first.code, 0, first.err); assert.deepEqual(planOf().notes, ['Prefer morning light.', 'No bridges.']); assert.match(first.out, /notes in every brief \(stored in plan\.json; a re-run re-reads them\):\n {2}- Prefer morning light\.\n {2}- No bridges\./);
  const md = () => readFileSync(join(out, 'scene-brief-1.md'), 'utf8');
  assert.match(md(), /Extra instructions for this batch:\n\n- Prefer morning light\.\n- No bridges\./);
  // re-run with no --note: the stored ones are used again, and the run says so
  const re = await run(['brief', 'zz', '--kind', 'scene', '--out', out, '--root', root]);
  assert.match(re.err, /re-using 2 stored notes from .*plan\.json/); assert.deepEqual(planOf().notes, ['Prefer morning light.', 'No bridges.']); assert.match(md(), /- Prefer morning light\.\n- No bridges\./);
  // a new one is ADDED (a repeated one is not doubled)
  const add = await run(['brief', 'zz', '--kind', 'scene', '--out', out, '--note', 'No bridges.', '--note', 'Draw the harbour calm.', '--root', root]);
  assert.match(add.err, /re-using 2 stored notes .* and adding 1 new/); assert.deepEqual(planOf().notes, ['Prefer morning light.', 'No bridges.', 'Draw the harbour calm.']);
  // the other kind keeps its own notes; a single batch re-run keeps them too
  assert.equal((await run(['brief', 'zz', '--kind', 'element', '--out', out, '--note', 'Foods are safe.', '--root', root])).code, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).plans.element.notes, ['Foods are safe.']); assert.equal(planOf().notes.length, 3, 'the scene notes are untouched by the element run');
  assert.doesNotMatch(readFileSync(join(out, 'element-brief-1.md'), 'utf8'), /Prefer morning light/);
  // --clear-notes forgets the stored ones (the new ones still apply)
  const clear = await run(['brief', 'zz', '--kind', 'scene', '--out', out, '--clear-notes', '--note', 'Fresh start.', '--root', root]);
  assert.match(clear.err, /3 stored note\(s\) of scene briefs forgotten/); assert.deepEqual(planOf().notes, ['Fresh start.']); assert.doesNotMatch(md(), /Prefer morning light/); assert.match(md(), /- Fresh start\./);
  assert.match((await run(['brief', 'zz', '--kind', 'scene', '--clear-notes', '--root', root])).err, /--clear-notes goes with --out/);
  // a plan.json of another region is replaced loudly, and its notes are not carried over
  const other = await run(['brief', 'us', '--kind', 'element', '--group', 'pacific', '--out', out, '--clean']);
  assert.equal(other.code, 0, other.err); assert.match(other.err, /was the plan of region "zz": it is replaced by this region's plan \(its stored notes are not carried over\)/);
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).plans.element.notes, []);
});

test('the scaffold must be COMMITTED before the agents start: new and brief say so, plan.json carries the command, and once it is committed the guard commands carry the base', async () => {
  const root = await gitScaffold();
  const made = await run(['new', 'qq', 'Quux', '--root', root]);
  assert.match(made.out, /COMMIT THE SCAFFOLD before any agent starts, so that every agent begins from the same tree and `guard` has a baseline/); assert.match(made.out, /git add src\/app\/71-anim-region-qq\.js .* docs\/dev\/QQ_PACK\.md && git commit -m "Quux: scaffold"/);
  const steps = made.out.split('\n').filter(l => /^ {2}\d\. /.test(l)), at = (re) => steps.findIndex(l => re.test(l));
  assert.ok(at(/Cultural care/) < at(/COMMIT THE SCAFFOLD/) && at(/COMMIT THE SCAFFOLD/) < at(/reference --render/) && at(/reference --render/) < at(/brief qq --kind scene/), steps.join('\n'));
  const out = mkdtempSync(join(tmpdir(), 'anim-commit-')); temps.push(out);
  const plan = () => JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  const r = await run(['brief', 'zz', '--kind', 'scene', '--of', '2', '--out', out, '--root', root]);
  assert.equal(r.code, 0, r.err); assert.match(r.out, /Before you dispatch:\n {2}1\. COMMIT THE SCAFFOLD first \(\d+ files are uncommitted: .*71-anim-region-zz\.js/); assert.match(r.out, /git add .* && git commit -m "Zed Land: scaffold"/);
  assert.match(r.out, /guard over the files of every agent that ran: node tools\/anim-pack\.mjs guard --owned src\/app\/71-anim-region-zz-scenes-1\.js,src\/app\/71-anim-region-zz-scenes-2\.js\n\(it proves the UNION of the files listed, not one agent alone: to prove one agent give it its own git worktree/);
  let p = plan(); assert.equal(p.git.committed, false); assert.equal(p.git.base, null); assert.ok(p.git.uncommitted.includes('src/app/71-anim-region-zz-scenes-2.js'), 'the stub just made is part of what must be committed');
  assert.match(p.plans.scene.before[0], /^git add .*docs\/dev\/ZZ_PACK\.md.* && git commit -m "Zed Land: scaffold"$/); assert.equal(p.plans.scene.before[1], 'node tools/anim-pack.mjs reference --render'); assert.doesNotMatch(p.plans.scene.afterAll[0], /--base/);
  assert.match(p.proves, /UNION/);
  // commit it, make the briefs again: the base is in plan.json and in every guard command
  git(root, 'add', '-A'); git(root, 'commit', '-q', '-m', 'scaffold');
  const head = git(root, 'rev-parse', '--short=10', 'HEAD').trim();
  const again = await run(['brief', 'zz', '--kind', 'scene', '--of', '2', '--out', out, '--root', root]);
  assert.doesNotMatch(again.out, /COMMIT THE SCAFFOLD/); p = plan();
  assert.deepEqual([p.git.committed, p.git.base, p.git.uncommitted], [true, head, []]); assert.deepEqual(p.plans.scene.before, ['node tools/anim-pack.mjs reference --render']);
  assert.equal(p.plans.scene.afterEach[0].guard, `node tools/anim-pack.mjs guard --owned src/app/71-anim-region-zz-scenes-1.js --base ${head}`); assert.match(p.plans.scene.afterAll[0], new RegExp(`guard --owned .*scenes-1\\.js,.*scenes-2\\.js --base ${head}$`));
  assert.match(readFileSync(join(out, 'scene-brief-1.md'), 'utf8'), new RegExp(`guard --owned src/app/71-anim-region-zz-scenes-1\\.js --base ${head}`));
  assert.deepEqual(gitScaffoldState(root, ['src/app/71-anim-region-zz*.js']).uncommitted, []); assert.equal(gitScaffoldState(mkdtempSync(join(tmpdir(), 'anim-nogit-')), ['x']), null);
  // the agents work, the orchestrator guards: the committed scaffold is the baseline (the pilot's guard listed the scaffold itself as strays)
  const guard = (...a) => run(['guard', ...a, '--root', root]);
  const s1 = join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), s2 = join(root, 'src', 'app', '71-anim-region-zz-scenes-2.js');
  writeFileSync(s1, readFileSync(s1, 'utf8') + '// agent 1\n'); writeFileSync(s2, readFileSync(s2, 'utf8') + '// agent 2\n');
  const both = await guard('--owned', 'src/app/71-anim-region-zz-scenes-1.js,src/app/71-anim-region-zz-scenes-2.js', '--base', head);
  assert.equal(both.code, 0, both.out); assert.match(both.out, new RegExp(`Compared with ${head} \\(${head}\\)\\. What this proves: In ONE shared working tree this proves the UNION`));
  const one = await guard('--owned', 'src/app/71-anim-region-zz-scenes-1.js');
  assert.equal(one.code, 2, 'in a shared tree one agent\'s guard sees the other agent\'s file'); assert.match(one.out, /\?\? |M {2}src\/app\/71-anim-region-zz-scenes-2\.js/); assert.match(one.out, /Compared with HEAD, the last commit \(/);
  assert.match(both.out, /list the files of every agent that ran in this tree/); assert.match(both.out, /git worktree add \.\.\/agent-1/);
});

test('guard: an untracked scaffold is named as such (commit it first), what it proves is stated, and ONE agent is proved in its own git worktree', async () => {
  const g = gitRepo(); const guard = (...a) => run(['guard', ...a, '--root', g.root]);
  const base = g.git('rev-parse', '--short=10', 'HEAD').trim();
  g.w('src/app/71-anim-region-yy.js', 'config\n'); g.w('src/app/72-anim-pack-yy-north.js', 'pack\n'); g.w(OWN1, 'a2\n');
  const r = await guard('--owned', OWN1);
  assert.equal(r.code, 2); assert.match(r.out, /2 of them are untracked \(\?\?\)\. If they are the region's scaffold .* COMMIT it before the agents start so that guard has a baseline \(git add src\/app\/71-anim-region-yy\.js src\/app\/72-anim-pack-yy-north\.js && git commit -m "scaffold"\)/);
  assert.match(r.out, /guard cannot tell a scaffold file from a stray one/); assert.match(r.out, new RegExp(`Compared with HEAD, the last commit \\(${base}\\)\\. What this proves: In ONE shared working tree this proves the UNION`));
  assert.match(r.out, /To prove ONE agent alone, give it its own git worktree \(git worktree add \.\.\/agent-1 <the commit of the committed scaffold>\) and run guard there/);
  assert.equal(JSON.parse((await guard('--owned', OWN1, '--json')).out).proves, GUARD_PROOF); assert.equal(JSON.parse((await guard('--owned', OWN1, '--json')).out).base.sha, base);
  // forbidden files are not "untracked scaffold": no commit advice for them
  g.w('tests/new.test.mjs', 'x\n'); assert.doesNotMatch((await guard('--owned', OWN1)).out, /git add [^\n]*tests\/new\.test\.mjs/);
  // commit the scaffold: now guard passes for the owned file and says what it proved
  rmSync(g.p('tests/new.test.mjs')); g.git('add', 'src/app/71-anim-region-yy.js', 'src/app/72-anim-pack-yy-north.js'); g.git('commit', '-q', '-m', 'scaffold');
  const base2 = g.git('rev-parse', '--short=10', 'HEAD').trim();
  assert.equal((await guard('--owned', OWN1)).code, 0); assert.match((await guard('--owned', OWN1, '--base', base)).out, /scaffold|FAIL/, 'since the OLD base the scaffold counts as changed');
  assert.equal((await guard('--owned', OWN1, '--base', base)).code, 2); assert.equal((await guard('--owned', OWN1, '--base', base2)).code, 0);
  // one agent alone: its own worktree, made from the scaffold commit; the other agent's change in the main tree is not its business
  g.git('add', '-A'); g.git('commit', '-q', '-m', 'agent 1 in the main tree'); const wt = join(g.dir, '..', 'anim-agent-' + base2); temps.push(wt);
  g.git('worktree', 'add', '-q', wt, base2);
  writeFileSync(join(wt, OWN2), 'agent 2 was here\n');
  const inWt = await run(['guard', '--owned', OWN2, '--base', base2, '--root', wt]);
  assert.equal(inWt.code, 0, inWt.out); assert.match(inWt.out, /1 changed file, all of them owned:\n {2}M {2}src\/app\/71-anim-region-zz-scenes-2\.js/);
  writeFileSync(join(wt, 'src/app/71-anim-region-zz-scenes-1.js'), 'agent 2 touched agent 1\'s file\n');
  const stray = await run(['guard', '--owned', OWN2, '--base', base2, '--root', wt]);
  assert.equal(stray.code, 2); assert.match(stray.out, /M {2}src\/app\/71-anim-region-zz-scenes-1\.js {3}\(not one of the owned files\)/, 'in its own worktree one agent\'s stray edit is caught');
});

test('complete: `new` writes complete: false, status shows it, --strict also fails when everything is drawn but the flag is still false, and --declare-complete sets it (only when nothing is missing)', async () => {
  const root = makeRoot();
  const made = await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root]);
  assert.equal(made.code, 0); assert.match(made.out, /The repo stays GREEN while you draw: the config says `complete: false`/); assert.match(made.out, /status zz --declare-complete/);
  assert.match(made.out, /8\. node tools\/anim-pack\.mjs status zz --strict {3}\(exit 0\) {3}then {3}node tools\/anim-pack\.mjs status zz --declare-complete/);
  const cfg = join(root, 'src', 'app', '71-anim-region-zz.js'), text = readFileSync(cfg, 'utf8');
  assert.match(text, /\n {2}complete: false, {23}\/\/ true when every unit and place has its art/); for (const w of ['coverage tests are reported as todo', 'they fail hard']) assert.ok(text.includes(w), w);
  assert.equal(findRegion(loadRegistry(root, { fresh: true }), 'zz').complete, false);
  const st = JSON.parse((await run(['status', 'zz', '--json', '--no-lint', '--root', root])).out); assert.equal(st.declared, false);
  assert.match((await run(['status', 'zz', '--short', '--no-lint', '--root', root])).out, /config says complete: false \(the coverage tests are todo\)/);
  assert.match((await run(['status', '--root', root])).out, /zz\s+Zed Land\s+2 provinces.*6 missing, being drawn \(complete: false\)/);
  // refused while anything is missing: exit 2, nothing changed
  const refused = await run(['status', 'zz', '--declare-complete', '--root', root]);
  assert.equal(refused.code, 2); assert.match(refused.out, /NOT DECLARED: zz is not complete \(see above\): nothing was changed/); assert.equal(readFileSync(cfg, 'utf8'), text);
  assert.equal(JSON.parse((await run(['status', 'zz', '--declare-complete', '--json', '--root', root])).out).declare.ok, false);
  for (const [argv, re] of [[['status', 'zz', '--declare-complete', '--no-lint'], /--declare-complete needs the lint/], [['status', '--declare-complete'], /--declare-complete needs a region/]]) { const e = await run([...argv, '--root', root]); assert.equal(e.code, 1, argv.join(' ')); assert.match(e.err, re); }
  // a region with nothing left to draw (every unit has its art elsewhere), real data: complete, but not declared
  const done = text.replace(/\n {2}country: 'XX',/, "\n  country: 'ZZ',").replace("// elsewhere: ['XX'],", "elsewhere: ['XA', 'XB'],").replace(/example-/g, 'real-');
  writeFileSync(cfg, done);
  const ready = await run(['status', 'zz', '--strict', '--root', root]);
  assert.equal(ready.code, 2, ready.out); assert.match(ready.out, /COMPLETE: every province and place has its art, every item passes the lint\. The config still says complete: false: run `node tools\/anim-pack\.mjs status zz --declare-complete`/);
  assert.match(ready.out, /STRICT: everything is drawn and lint-clean, but src\/app\/71-anim-region-zz\.js still says complete: false, so the coverage tests are only todo/);
  assert.match((await run(['status', '--root', root])).out, /zz\s+Zed Land.*complete, not declared \(status zz --declare-complete\)/);
  // declare: the flag flips in the config (that line only), the run says what changes, strict passes, a second run is a no-op
  const d = await run(['status', 'zz', '--declare-complete', '--root', root]);
  assert.equal(d.code, 0, d.out); assert.match(d.out, /DECLARED: set complete: true in src\/app\/71-anim-region-zz\.js\. The coverage tests of tests\/zz-pack\.test\.mjs, tests\/region-framework\.test\.mjs and tests\/anim-packs\.test\.mjs now fail hard/);
  assert.equal(readFileSync(cfg, 'utf8'), done.replace(/\n {2}complete: false,/, '\n  complete: true,')); assert.equal(findRegion(loadRegistry(root, { fresh: true }), 'zz').complete, true);
  assert.equal((await run(['status', 'zz', '--strict', '--root', root])).code, 0);
  const again = await run(['status', 'zz', '--declare-complete', '--root', root]); assert.equal(again.code, 0); assert.match(again.out, /Nothing to change: the region already says complete: true/);
  // the real regions say nothing and are complete by default: declaring them changes nothing
  const us = await run(['status', 'us', '--declare-complete']); assert.equal(us.code, 0, us.out); assert.match(us.out, /Nothing to change/); assert.equal(findRegion(loadRegistry(ROOT), 'us').complete, true);
  assert.deepEqual(declareComplete(ROOT, findRegion(loadRegistry(ROOT), 'asia')), { changed: false, file: 'src/app/71-anim-asia.js', why: 'the region already says complete: true (or sets no flag: the default is true)' });
  // a config that lost its `complete: false,` line cannot be flipped by the tool: it says what to do by hand
  writeFileSync(cfg, done.replace(/\n {2}complete: false,/, '\n  complete: (false),'));
  const lost = await run(['status', 'zz', '--declare-complete', '--root', root]); assert.equal(lost.code, 1); assert.match(lost.err, /has no `complete: false,` line to flip: set `complete: true` in its animRegionDefine/);
  assert.match(readTemplate('region-config.js.tpl'), /complete: false, /); assert.match(readTemplate('region-doc.md.tpl'), /--declare-complete/);
  assert.match((await run(['status', '--help'])).out, /--declare-complete[\s\S]*Good to know:[\s\S]*complete: false \(what `new` writes\) keeps the repo green/);
});

test('status: a row inside another region\'s reach is an OVERLAP (the border case), shown in its own section, with the ways out; the region is not complete until it is resolved', async () => {
  const root = makeRoot(); assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  const cfg = join(root, 'src', 'app', '71-anim-region-zz.js'), text = readFileSync(cfg, 'utf8');
  assert.equal(JSON.parse((await run(['status', 'zz', '--json', '--no-lint', '--root', root])).out).overlaps.length, 0, 'the scaffold is far from every region');
  // move the example small town to where a town just across Asia's eastern border would be (about 70 km from Asia's Jayapura row)
  writeFileSync(cfg, text.replace(/\['example-small', 'Example Small Town', 'XB', -50\.00, -22\.50, 'small'\]/, "['example-small', 'Example Small Town', 'XB', -2.68, 141.30, 'small']"));
  const st = JSON.parse((await run(['status', 'zz', '--json', '--no-lint', '--root', root])).out);
  assert.equal(st.overlaps.length, 1); assert.match(st.overlaps[0], /^example-small \(XB, -2\.68, 141\.3\) and asia's row jayapura are \d+ km apart, each inside the other's reach \(asia 300 km, this region 150 km\)/); assert.equal(st.problems.some(p => /overlap/.test(p)), false, 'reported once, in its own list');
  assert.equal(st.complete, false);
  const text2 = (await run(['status', 'zz', '--short', '--no-lint', '--root', root])).out;
  assert.match(text2, /OVERLAP WITH OTHER REGIONS \(1\): rows inside another region's reach, the border cases where the neighbour wins\n {4}example-small/); assert.match(text2, /1 overlap\(s\)/); assert.match(text2, /resolve the overlaps \(move or drop the row, or lower a unitKm\)/);
  assert.equal((await run(['status', 'zz', '--strict', '--no-lint', '--root', root])).code, 2);
  const region = findRegion(loadRegistry(root, { fresh: true }), 'zz'); assert.match(region.check().join('\n'), /overlap: example-small .* move or drop one of the two rows .* add it to asia's own tables/);
  // the config template documents it, with the example
  for (const w of ['THE BORDER CASE', 'Jayapura', 'inside Asia\'s 300 km reach', 'OVERLAP WITH OTHER REGIONS', 'never push the neighbour out by adding rows']) assert.ok(text.includes(w), w);
});

test('status lists the travel cities of the region\'s countries that have no row (a trip there matches nothing) and the REACH line; the template says what travelling does', async () => {
  const root = makeRoot(); cpSync(join(APP, '69-travel-data.js'), join(root, 'src', 'app', '69-travel-data.js'));
  assert.equal((await run(['new', 'oz', 'Oz', '--unit-word', 'country', '--groups', 'south', '--root', root])).code, 0);
  const cfg = join(root, 'src', 'app', '71-anim-region-oz.js'), tpl = readFileSync(cfg, 'utf8');
  for (const w of ['WHAT TRAVELLING DOES', 'ONLY travelRow(ctx.city) is used', 'matches nothing at all', 'is still reached from home', 'REACH line']) assert.ok(tpl.includes(w), w);
  writeFileSync(cfg, `const OZ_UNITS = { AU: ['Australia', 'south'] };
const OZ_PLACES = [['brisbane', 'Brisbane', 'AU', -27.47, 153.03, ''], ['perth', 'Perth', 'AU', -31.95, 115.86, ''], ['sydney', 'Sydney', 'AU', -33.87, 151.21, 'big'], ['mildura', 'Mildura', 'AU', -34.19, 142.16, '']];
const OZ_REGION = animRegionDefine({ id: 'oz', name: 'Oz', unitWord: 'country', units: OZ_UNITS, places: OZ_PLACES, unitKm: 150, worldTravel: ['sydney-au'], complete: false });
`);
  const reg = loadRegistry(root, { fresh: true }), region = findRegion(reg, 'oz'), g = travelGaps(reg, region);
  assert.deepEqual(g.countries, ['AU']); assert.ok(g.cities >= 10, String(g.cities));
  assert.ok(g.drawnByWorld >= 1 && g.withRow >= 3, JSON.stringify([g.drawnByWorld, g.withRow]));
  const mel = g.noRow.find(c => c.id === 'melbourne-au');
  assert.ok(mel && mel.pop > 1e6 && mel.km > 150 && mel.inReach === false && mel.unit === 'AU', JSON.stringify(mel)); assert.equal(mel.row, "['melbourne', 'Melbourne', '??', -37.81, 144.96, '']", 'a line to paste (the unit is ?? when no row reaches it)');
  assert.ok(g.noRow.every(c => !['brisbane-au', 'perth-au', 'sydney-au'].includes(c.id)), 'a city with a row, or drawn by the world pack, is not a gap');
  assert.deepEqual(g.noRow.map(c => c.pop), [...g.noRow.map(c => c.pop)].sort((a, b) => b - a), 'most populous first');
  assert.ok(g.reach.farthest.km > 300 && g.reach.beyond.length >= 3 && g.reach.beyond.some(b => b.id === 'melbourne-au') === (mel.km > 150) && g.reach.unitKm === 150);
  const near = g.noRow.find(c => c.inReach); if (near) assert.match(near.row, /'AU', /, 'inside the reach the suggestion carries the unit');
  const text = (await run(['status', 'oz', '--no-lint', '--root', root])).out;
  assert.match(text, /TRAVEL \(while travelling only a row's travel id counts\): \d+ travel cities in AU: \d+ have a row \(\d+ of them drawn by the world pack for a traveller\), \d+ have none \(a trip there plays nothing; an anchor row of the right country is enough to fix it\)/);
  assert.match(text, /melbourne-au {10,}Melbourne .* km from AU +\['melbourne', 'Melbourne', '\?\?', -37\.81, 144\.96, ''\]/); assert.match(text, /REACH: unitKm 150; the farthest travel city from its nearest row is .* at \d+ km; \d+ lie beyond unitKm \(a home position there is in no country\): /);
  const j = JSON.parse((await run(['status', 'oz', '--json', '--no-lint', '--root', root])).out); assert.deepEqual(j.travel.countries, ['AU']); assert.equal(j.travel.noRow.length, g.noRow.length);
  assert.equal(j.complete, false, 'advice, not part of complete: a region is not held back by a trip it chose not to serve');
  // a root without the travel tables says nothing about trips (no crash); a region whose country is still the placeholder says nothing either
  const bare = makeRoot(); assert.equal((await run(['new', 'zz', 'Zed Land', '--unit-word', 'province', '--root', bare])).code, 0);
  assert.equal(JSON.parse((await run(['status', 'zz', '--json', '--no-lint', '--root', bare])).out).travel, null); assert.doesNotMatch((await run(['status', 'zz', '--no-lint', '--root', bare])).out, /TRAVEL \(/);
  const usT = JSON.parse((await run(['status', 'us', '--json', '--no-lint'])).out).travel; assert.deepEqual(usT.countries, ['US']); assert.ok(usT.cities > 30 && usT.reach.farthest.km < 190, 'the US: every travel city is within reach');
});

test('scaffold text: the unit word is pluralised properly (countries, counties, states, provinces), the world pack list is read from the registry, the banner says what to delete', async () => {
  const cases = [['country', 'countries'], ['county', 'counties'], ['state', 'states'], ['province', 'provinces'], ['territory', 'territories'], ['municipality', 'municipalities'], ['parish', 'parishes'], ['oblast', 'oblasts'], ['canton', 'cantons'], ['prefecture', 'prefectures']];
  for (const [w, p] of cases) assert.equal(plural(w), p, w);
  for (const [i, [w, p]] of cases.slice(0, 5).entries()) {
    const root = makeRoot(); assert.equal((await run(['new', 'pl' + String.fromCharCode(97 + i), 'Plural', '--unit-word', w, '--root', root])).code, 0, w);
    const text = readFileSync(join(root, 'src', 'app', `71-anim-region-pl${String.fromCharCode(97 + i)}.js`), 'utf8');
    assert.ok(text.includes(`middle of large ${p} so that`) && text.includes(`A row decides ${p} by DISTANCE`), `${w}: ${p}`);
    assert.doesNotMatch(text, /countrys|countys|statess|provincess|territorys|ys by DISTANCE|large \w+ys so/, w);
    assert.doesNotMatch(readFileSync(join(root, 'docs', 'dev', `PL${String.fromCharCode(65 + i)}_PACK.md`), 'utf8'), /countrys|countys|statess/, w);
  }
  const { root } = await shared(); const text = readFileSync(join(root, 'src', 'app', '71-anim-region-zz.js'), 'utf8'), live = worldCities(loadRegistry(root, { fresh: true }));
  assert.ok(live.length >= 12);
  assert.ok(text.replace(/\s+/g, ' ').includes(`when this file was made it was: ${live.join(', ')}). List EVERY one`), 'the list is the registry\'s, not typed'); assert.match(text, /read it live from\n {3}the registry, it grows: `region\.check\(\)` and `node tools\/anim-pack\.mjs status zz` compare it with this region's rows every time/);
  assert.match(text, /WHEN THE TABLES ARE REAL, DELETE THIS BANNER and the how-to comments you no longer need \(keep one line per column and the region's own\n {3}notes: Asia's config is the model\)/);
  assert.ok(!/world pack \(72-anim-pack-world\.js\) draws a landmark for travellers in: /.test(text), 'the stale "draws a landmark in: <list>" sentence is gone');
});

test('--key names items by id, ref or region key (a wildcard works), and an unknown key is an error that lists what exists', async () => {
  const reg = loadRegistry(ROOT), all = reg.items().filter(e => e.pack === 'asia-east');
  const jp = all.filter(e => e.id.startsWith('jp-'));
  assert.deepEqual(itemNames(reg, all.find(e => e.id === 'jp-signature')).sort(), ['asia-east/jp-signature', 'country:JP', 'jp-signature'].sort());
  assert.ok(itemNames(reg, all.find(e => e.item.asiaKind === 'city' && e.full)).some(n => /^place:/.test(n)), 'a big place is place:<id>');
  assert.deepEqual(keyFilter(reg, all, ['country:JP']).map(e => e.id).sort(), jp.map(e => e.id).sort(), 'a unit key names its signature and its element');
  assert.deepEqual(keyFilter(reg, all, ['jp-signature']).map(e => e.id), ['jp-signature']); assert.deepEqual(keyFilter(reg, all, ['ASIA-EAST/JP-SIGNATURE']).map(e => e.id), ['jp-signature'], 'case does not matter');
  assert.deepEqual(keyFilter(reg, all, ['jp-*']).map(e => e.id).sort(), jp.map(e => e.id).sort()); assert.equal(keyFilter(reg, all, []).length, all.length);
  assert.equal(keyFilter(reg, all, ['jp-signature', 'country:KR']).length, 1 + all.filter(e => e.id.startsWith('kr-')).length);
  assert.throws(() => keyFilter(reg, all, ['jp-signature', 'atlantis']), /--key atlantis names no item of the selection\. A key is an item id \(au-signature\), a ref \(pack\/id\) or a region key \(country:AU, place:sydney\); \* is a wildcard\. The selection has: /);
  const r = await run(['lint', '--pack', 'asia-east', '--key', 'country:JP', '--quiet']); assert.equal(r.code, 0, r.out); assert.match(r.out, new RegExp(`lint: ${jp.length} items`)); assert.match((await run(['lint', '--pack', 'asia-east', '--key', 'zzz'])).err, /--key zzz names no item/);
  assert.match((await run(['lint', '--help'])).out, /--key <v> {7,}lint only the items these keys name/);
});

test('brief warns when the PNGs it cites do not exist, and `reference --render` renders every mode the briefs cite (light, night, dark) unless one --mode is given (skipped without Chrome)', { skip: !findBrowser() }, async () => {
  const root = makeRoot(); mkdirSync(join(root, 'tools'), { recursive: true });
  const small = { _about: 'a tiny gold standard for the test', scenes: [{ ref: 'us-mountain/nm-white-sands', why: 'w', tags: [] }], items: [{ ref: 'us-pacific/hi-sea-turtle', why: 'w', tags: [] }], weaker: [{ ref: 'us-pacific/ak-midnight-sun', wrong: 'x' }], weakerItems: [{ ref: 'us-pacific/ak-totem', wrong: 'x' }] };
  writeFileSync(join(root, 'tools', 'anim-reference.json'), JSON.stringify(small)); cpSync(join(ROOT, 'tools', 'anim-quality.json'), join(root, 'tools', 'anim-quality.json'));
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  assert.deepEqual(citedPngs('scene', small), ['.anim-ref/us-mountain__nm-white-sands-light.png', '.anim-ref/us-mountain__nm-white-sands-night.png']);
  assert.deepEqual(citedPngs('element', small), ['.anim-ref/us-pacific__hi-sea-turtle-light.png', '.anim-ref/us-pacific__hi-sea-turtle-dark.png', '.anim-ref/us-mountain__nm-white-sands-light.png'], 'the element brief cites -dark for icons, light for the scene palette');
  const out = mkdtempSync(join(tmpdir(), 'anim-png-')); temps.push(out);
  const missing = JSON.parse((await run(['brief', 'zz', '--kind', 'element', '--json', '--batch', '1', '--root', root])).out).missingPng; assert.equal(missing.length, 3);
  const b = await run(['brief', 'zz', '--kind', 'element', '--out', out, '--root', root]); assert.match(b.out, /render the gold standard ONCE \(3 PNGs the briefs cite do not exist yet, for example \.anim-ref\/us-pacific__hi-sea-turtle-light\.png/); assert.equal(JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).missingPng.length, 3);
  // one mode: only that mode, for everything
  const dark = await run(['reference', '--render', '--mode', 'dark', '--json', '--root', root]); assert.equal(dark.code, 0, dark.err);
  assert.deepEqual(readdirSync(join(root, '.anim-ref')).sort(), ['us-mountain__nm-white-sands-dark.png', 'us-pacific__ak-midnight-sun-dark.png', 'us-pacific__ak-totem-dark.png', 'us-pacific__hi-sea-turtle-dark.png']);
  assert.deepEqual(JSON.parse(dark.out).rendered['us-pacific/hi-sea-turtle'], { dark: join(root, '.anim-ref', 'us-pacific__hi-sea-turtle-dark.png') });
  // no --mode: the exemplars in light, night AND dark, the weaker ones in light
  const all = await run(['reference', '--render', '--json', '--root', root]); assert.equal(all.code, 0, all.err);
  const files = readdirSync(join(root, '.anim-ref')).sort();
  for (const f of ['us-mountain__nm-white-sands-light.png', 'us-mountain__nm-white-sands-night.png', 'us-mountain__nm-white-sands-dark.png', 'us-pacific__hi-sea-turtle-light.png', 'us-pacific__hi-sea-turtle-night.png', 'us-pacific__hi-sea-turtle-dark.png', 'us-pacific__ak-midnight-sun-light.png', 'us-pacific__ak-totem-light.png']) assert.ok(files.includes(f), f);
  assert.deepEqual(Object.keys(JSON.parse(all.out).rendered['us-pacific/hi-sea-turtle']), ['light', 'night', 'dark']); assert.equal(JSON.parse(all.out).rendered['us-pacific/ak-totem'].night, undefined);
  // now every PNG a brief cites exists, and the brief says nothing
  for (const kind of ['scene', 'element']) assert.deepEqual(citedPngs(kind, small).filter(f => !existsSync(join(root, f))), [], kind);
  assert.deepEqual(JSON.parse((await run(['brief', 'zz', '--kind', 'scene', '--json', '--batch', '1', '--root', root])).out).missingPng, []);
  const ok = await run(['brief', 'zz', '--kind', 'scene', '--out', out, '--clean', '--root', root]); assert.match(ok.out, /the gold standard PNGs the briefs cite exist/);
  assert.match((await run(['reference', '--help'])).out, /--render +render the exemplars to \.anim-ref\/ .*Without --mode: the exemplars in light, night AND dark/);
  assert.equal((await run(['reference', '--render', '--mode', 'purple', '--root', root])).code, 1);
});

test('"Scene suggestions" in the region doc override the rotation per key (once, for every brief); bad lines and unknown keys are reported, never silently used; the exemplars carry their written description', async () => {
  const root = makeRoot(); assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  const doc = join(root, 'docs', 'dev', 'ZZ_PACK.md'), text = readFileSync(doc, 'utf8');
  assert.ok(text.includes('## Scene suggestions') && text.indexOf('## Cultural care') < text.indexOf('## Scene suggestions') && text.indexOf('## Scene suggestions') < text.indexOf('## Adding a place'), 'the doc skeleton has the section, after the care notes');
  const region = findRegion(loadRegistry(root, { fresh: true }), 'zz');
  assert.equal(suggestionsInfo(root, region).state, 'skeleton', 'the example is inside a comment: nothing is applied');
  const json = async (extra = []) => JSON.parse((await run(['brief', 'zz', '--kind', 'scene', '--json', '--batch', '1', '--root', root, ...extra])).out);
  const before = await json(), keyOf = (j, key) => j.batches[0].keys.find(k => k.key === key);
  const md0 = (await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--root', root])).out;
  writeFileSync(doc, text.replace('## Adding a place', `- \`place:example-big\`: type = old town and river; palette = warm amber and rose; time = night; season = any
- province:XA: motif = plant; colour = green; season = winter
- province:NOPE: type = coast
- not a line
- place:example-big: nonsense = 1; colour = purple; season = monsoon

## Adding a place`));
  const r = await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--root', root]);
  assert.equal(r.code, 0, r.err);
  assert.match(r.err, /note: 2 suggestions from the "Scene suggestions" section of docs\/dev\/ZZ_PACK\.md replace the rotation's/);
  assert.match(r.err, /province:NOPE is not a scene or element key of zz .*: ignored/); assert.match(r.err, /not a suggestion line \(expected "- <key>: field = value; field = value"\): - not a line.*: ignored/);
  assert.match(r.err, /"nonsense = 1" is not one of time, season, type, palette, motif, colour \(field = value\)/); assert.match(r.err, /colour = purple is not one of blue, indigo/); assert.match(r.err, /season = monsoon is not any, spring, summer, autumn or winter/);
  const row = r.out.split('\n').find(l => /^\| \d+ \| `place:example-big`/.test(l)); assert.ok(row && row.includes('| night | any | old town and river | warm amber and rose |'), row);
  const xa = r.out.split('\n').find(l => /^\| \d+ \| `province:XA`/.test(l)); assert.ok(/\| winter \(season: 'summer'\) \|/.test(xa), 'a season override in the south keeps the flipped label: ' + xa);
  assert.notEqual(r.out, md0);
  const j = await json(); assert.equal(keyOf(j, 'place:example-big').season, 'any'); assert.equal(keyOf(before, 'place:example-big').season !== 'any', true);
  // elements: motif and colour
  const el = (await run(['brief', 'zz', '--kind', 'element', '--batch', '1', '--root', root])).out, erow = el.split('\n').find(l => /B\.element\('XA'/.test(l) && /^\| \d+ \|/.test(l)); assert.ok(/\| plant \| green \|$/.test(erow), erow);
  // plan.json carries the applied values; the info reader and the applier agree
  const info = suggestionsInfo(root, region); assert.deepEqual(info.byKey['place:example-big'], { type: 'old town and river', palette: 'warm amber and rose', time: 'night', season: 'any' }); assert.ok(info.problems.length >= 4);
  const out = mkdtempSync(join(tmpdir(), 'anim-sugg-')); temps.push(out);
  assert.equal((await run(['brief', 'zz', '--kind', 'scene', '--out', out, '--root', root])).code, 0);
  assert.deepEqual(JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8')).plans.scene.suggestions['place:example-big'], { time: 'night', season: 'any', seasonLabel: 'any', type: 'old town and river', palette: 'warm amber and rose' });
  // the exemplars carry what they show, in words (the fallback when a PNG cannot be displayed)
  const ref = loadReference(ROOT), ny = ref.scenes.find(x => x.ref === 'us-northeast/new-york-skyline');
  assert.ok(md0.includes(`what it shows: ${ny.why}`)); assert.match(md0, /`us-northeast\/new-york-skyline`.*\n {4}read: .*\n {4}what it shows: Three depth layers of towers[\s\S]*?\n {4}PNG: /);
  for (const x of ref.items) assert.ok(el.includes(`what it shows: ${x.why.replace(/\s+/g, ' ').trim()}`), x.ref);
});

test('a scaffold keeps the repo-wide tests GREEN (region-framework: structural checks run, coverage is todo; anim-packs: an empty scaffold pack file is waiting) and complete: true makes them fail hard (run for real, in the temp checkout)', async () => {
  const root = makeRoot();
  for (const f of ['78-anim-wire.js', '69-travel-data.js']) cpSync(join(APP, f), join(root, 'src', 'app', f));
  mkdirSync(join(root, 'tests'), { recursive: true }); cpSync(join(ROOT, 'build.mjs'), join(root, 'build.mjs')); cpSync(join(ROOT, 'tools', 'lib', 'anim-region.mjs'), join(root, 'tools', 'lib', 'anim-region.mjs'));
  cpSync(join(ROOT, 'tools', 'lib', 'raster-assets.mjs'), join(root, 'tools', 'lib', 'raster-assets.mjs'));   // build.mjs embeds the raster objects' images through it
  for (const f of ['region-framework.test.mjs', 'anim-packs.test.mjs']) cpSync(join(ROOT, 'tests', f), join(root, 'tests', f));
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
  const test = () => spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'tests/region-framework.test.mjs', 'tests/anim-packs.test.mjs'], { cwd: root, encoding: 'utf8', env });
  const wip = test();
  assert.equal(wip.status, 0, 'the scaffold is green: ' + wip.stdout.split('\n').filter(l => /^not ok|^# (pass|fail)/.test(l)).join('\n'));
  assert.match(wip.stdout, /# fail 0/); assert.match(wip.stdout, /# todo 1/);
  assert.match(wip.stdout, /not ok \d+ - zz: a pack exactly when a group has units that open, and no starter data left .* # TODO zz is not declared complete/);
  for (const t of ['every region: the flag is a boolean, the tables are sound', 'every region: no row inside another region\'s reach', 'every region: unique travel ids']) assert.match(wip.stdout, new RegExp(`\\nok \\d+ - ${t.replace(/[()'\\]/g, '\\$&')}`), t + ' ran and passed');
  assert.match(wip.stdout, /\nok \d+ - there is at least the core pack, and every pack file registered a valid pack \(an empty scaffold pack file/, 'the pack registration test tolerates the empty scaffold pack files');
  // declare it complete: the coverage test and the registration test fail hard, the structural ones stay green
  const cfg = join(root, 'src', 'app', '71-anim-region-zz.js');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/\n {2}complete: false,/, '\n  complete: true,'));
  const hard = test();
  assert.notEqual(hard.status, 0); assert.match(hard.stdout, /# todo 0/);
  assert.match(hard.stdout, /not ok \d+ - zz: a pack exactly when a group has units that open, and no starter data left/); assert.doesNotMatch(hard.stdout, /zz: a pack exactly[^\n]*# TODO/);
  assert.match(hard.stdout, /not ok \d+ - there is at least the core pack, and every pack file registered a valid pack/); assert.match(hard.stdout, /registration files \d+, registered \d+/);
  assert.match(hard.stdout, /\nok \d+ - every region: no row inside another region's reach/, 'the overlap test is its own test: it keeps running');
});

/* ---------- FIX3B: the pilot's friction in the skill, the briefs and the docs ---------- */

const SKILL_DIR = join(ROOT, '.claude', 'skills', 'animation-pack');
const skillText = (f) => readFileSync(join(SKILL_DIR, f), 'utf8');
const SKILL = () => skillText('SKILL.md');
const REF = (n) => skillText(`references/${n}.md`);
const KIT_NAMES = 'U, R, rnd, lin, linU, radU, mv, full, ridge, canopy, mesa, cloud, streak, haze, rays, sun, stars, birds, shimmer, puffs, dots, lit, star5, finish';
/** The scene kit, evaluated on its own (the framework file is pure: it needs nothing else). */
const kit = () => vm.runInNewContext(readFileSync(join(APP, '71-anim-0region.js'), 'utf8') + '\n;animSceneKit()', {});
/** The fenced js blocks of a reference that are marked `<!-- tested -->`: the helpers the docs promise run, and their `// use: <expr>` lines. */
function testedBlocks(file) {
  const code = [...REF(file).matchAll(/<!-- tested -->\n```js\n([\s\S]*?)```/g)].map(m => m[1]).join('\n');
  return { code, uses: [...code.matchAll(/^\s*\/\/ use: (.*)$/gm)].map(m => m[1]) };
}
/** Evaluate the tested helpers with the real kit and return each `// use:` expression's markup, plus extra expressions. */
function runUses(code, uses, extra = []) {
  const all = [...uses, ...extra];
  const fn = new Function('K', `const { ${KIT_NAMES} } = K;\n${code}\nreturn [${all.map(u => `() => (${u})`).join(', ')}];`);
  return fn(kit()).map(t => t());
}

test('recipes.md: every tested helper block runs against the real kit, every // use: line renders valid markup, and the hygiene lint rules pass (the helpers are not folklore)', async () => {
  const { code, uses } = testedBlocks('recipes');
  assert.ok(uses.length >= 11, `${uses.length} use lines`);
  for (const name of ['reflect', 'win', 'city', 'palm', 'pine', 'pines', 'fall', 'snowflakes', 'flies', 'blades', 'clipped', 'blob', 'crown3', 'rock', 'bush', 'rangePts', 'sharp', 'facets', 'frond', 'treeFern', 'hut', 'yacht', 'sst', 'moon', 'pane', 'panes', 'lamp'])
    assert.match(code, new RegExp(`const ${name} = `), `${name} is defined in a tested block`);
  const out = runUses(code, uses);
  out.forEach((m, i) => { assert.equal(typeof m, 'string'); assert.ok(m.length > 40, uses[i].slice(0, 60)); assert.doesNotMatch(m, /NaN|undefined|\[object/, uses[i].slice(0, 60)); });
  // the markup is balanced (every <g> closes) and uses only the lint's vocabulary
  const markup = out.join('');
  assert.equal((markup.match(/<g[ >]/g) || []).length, (markup.match(/<\/g>/g) || []).length, 'balanced groups');
  for (const t of new Set([...markup.matchAll(/<([a-zA-Z]+)/g)].map(m => m[1]))) assert.ok(allowedTagList().includes(t), `<${t}> is allowed markup`);
  // what section 7 says the night pattern is: always-on stars (not us-star), a painted AND a us-lit pane, a lit path of many panes, a lamps string
  const night = runUses(code, uses, ["sst(1051, 12, 330, 0.9)", "stars(1053, 12, 340)", "pane(10, 10, 14, 18)", "panes(560, 600, 6, 3, 8, 10, 14, 18)", "moon(330, 200, 32, -135)"]).slice(-5);
  assert.doesNotMatch(night[0], /us-star/); assert.match(night[1], /class="us-star"/);
  assert.match(night[2], /fill="#ffc872"[^>]*\/><rect class="us-lit"/);
  assert.match(night[3], /<path fill="#ffc872" d="(M[^"]*){18}"\/><path class="us-lit" d="/);
  assert.match(night[4], /<circle[^>]*fill="url\(#us\d+\)"/); assert.doesNotMatch(night[4], /class="x-ussun|us-star/);
  // "a path carrying us-lit counts as ONE shape": 18 panes as one path are one shape, as 18 rects they are 18
  const classes = new Set(['us-lit']), wrap = (x) => `<svg viewBox="0 0 1600 900">${x}</svg>`;
  let d = ''; for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) d += `M${560 + i * 14} ${600 + j * 18}h8v10h-8z`;
  assert.equal(measure(wrap(`<path class="us-lit" d="${d}"/>`), 'scene', { classes }).shapes, 1);
  assert.equal(measure(wrap([...d.matchAll(/M(\d+) (\d+)/g)].map(m => `<rect class="us-lit" x="${m[1]}" y="${m[2]}" width="8" height="10"/>`).join('')), 'scene', { classes }).shapes, 18);
  // the same helpers inside a real scene file: the structural lint rules pass (the count rules do not apply to a toy)
  const root = makeRoot();
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  const file = join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js');
  writeFileSync(file, `(function () {\n  const K = animSceneKit();\n  const { ${KIT_NAMES} } = K;\n${code}\n  animRegionSceneAdd('zz', { key: 'province:XA', label: 'Helpers', site: 'x', colour: 'teal', mood: 'calm', season: 'any', tags: [],\n    svg: () => {\n      const s1 = U();\n      return '<defs>' + lin(s1, [[0, '#161142'], [0.4, '#8c3b6b'], [1, '#ffc674']]) + '</defs>' + full('url(#' + s1 + ')')\n${uses.map(u => '        + ' + u).join('\n')}\n        + finish(0.34);\n    } });\n})();\n`);
  const lint = JSON.parse((await run(['lint', '--file', file, '--json', '--root', root])).out);
  const failed = lint.items[0].failures.map(f => f.rule);
  for (const rule of ['structure', 'unique-ids', 'refs-resolve', 'x-transform', 'viewbox', 'classes-defined', 'sky-gradient', 'evening-grade', 'evening-grade-last', 'unknownClasses', 'coverUps']) assert.ok(!failed.includes(rule), `${rule} passes: ${failed.join(', ')}`);
});

test('recipes.md: the byte budget per layer is measured (the numbers in the table are what the kit and the helpers really cost), and the seed and clone warnings are there', () => {
  const doc = REF('recipes');
  const { lin, stars, sun, rays, cloud, birds, haze, canopy, ridge, shimmer, puffs, finish } = kit();
  const { code } = testedBlocks('recipes');
  const bytes = (expr) => runUses(code, [], [expr])[0].length;
  const cost = [   // [the doc's wording, bytes now]
    ['`stars(seed, 24, 200)` .87', stars(61, 24, 200).length], ['`sun` .43', sun(1280, 520, 52, '#fff0c8', '#ff9a68').length], ['`rays` .75', rays(1280, 520, 900, '#ffd29a', 0.14).length],
    ['`cloud` .6 each', cloud(420, 330, 1.4, '#c8649a', 0.88, 64, 6, '#ff9488').length], ['`birds(seed, 5, ...)` 1.3', birds(8, 5, 760, 250, '#34405a', 1, 600).length], ['`haze` .36', haze(540, 120, '#ffb894', 0.55).length],
    ['`canopy` .6', canopy('#4e6a78', 630, 16, 7, -160, 1760, 700).length], ['`ridge` .2', ridge('#6a78a8', 610, 50, 9, 7, 700).length], ['112 B per glint', shimmer(7, 40, 300, 1300, 660, 880, '#ffd0b0', 60).length / 40],
    ['`puffs` .37', puffs(500, 600, 3, '#fff', 14, -120, 4, -200, 2.6).length], ['`finish(.34)`', finish(0.34).length], ['`lin` with 5 stops .27', lin('a', [[0, '#4f4a92'], [0.3, '#b26aa0'], [0.55, '#ff8a7e'], [0.78, '#ffc080'], [1, '#ffe4a0']]).length],
    ['a palm .6 to 1.0', bytes("palm(200, 800, 300, '#1c2c2a', 30, 1.2, 7)")], ['a row of 10 pines 5', bytes("pines(5, 0, 1600, 760, 160, '#0b1b2d', 70)")], ['`blades` (30) .7', bytes("blades(9, 30, 0, 400, 880, 900, '#160c24', 5, 24, 52)")],
    ['a tree fern with 7 fronds 2.2', bytes("treeFern(300, 800, 160, 1, '#244a40', '#6a5a30', [[-80, -20, 30], [-50, -60, 30], [0, -80, 20], [50, -60, 30], [80, -20, 30], [-20, -70, 20], [30, -75, 20]], 7, 5)")],
    ['falling petals 113 B each (18 = 2 KB)', bytes("fall(4, 18, ['#f6c0c8'], 4, 7, 9, 15)")], ['fireflies 200 B each (16 = 3.2 KB)', bytes("flies(9, 16, 100, 1500, 560, 760, '#ffe08a')")],
  ];
  const want = { '`stars(seed, 24, 200)` .87': 870, '`sun` .43': 430, '`rays` .75': 750, '`cloud` .6 each': 600, '`birds(seed, 5, ...)` 1.3': 1300, '`haze` .36': 360, '`canopy` .6': 600, '`ridge` .2': 200, '112 B per glint': 112, '`puffs` .37': 370, '`finish(.34)`': 300, '`lin` with 5 stops .27': 270,
    'a palm .6 to 1.0': 800, 'a row of 10 pines 5': 5000, '`blades` (30) .7': 700, 'a tree fern with 7 fronds 2.2': 2200, 'falling petals 113 B each (18 = 2 KB)': 2000, 'fireflies 200 B each (16 = 3.2 KB)': 3200 };
  for (const [text, got] of cost) {
    assert.ok(doc.includes(text), `the table says "${text}"`);
    const w = want[text], tol = text === 'a palm .6 to 1.0' ? 0.3 : 0.2;   // a palm costs .6 to 1.0 KB: 800 +- 30 % covers both ends
    assert.ok(Math.abs(got - w) <= w * tol + 12, `${text}: measured ${Math.round(got)} B, the doc says about ${w}`);
  }
  assert.match(doc, /A median scene is 22\.8 KB rendered \(p10 14\.8, p90 29\.0\), the cap is 32,000 and the target is at most 29,000/);
  for (const must of ['Ladders without clones', 'an identical circle repeated', 'bake the scale into the coordinates', 'unique per CALL, per scene AND per file', 'start above 1000', 'never two consecutive numbers', 'rays()', 'ensign']) assert.ok(doc.includes(must) || REF('kit-reference').includes(must), must);
});

test('small-icons.md: the ONE size table is what the corpus and the exemplars measure and what the generated target table prints; no older contradicting range is left anywhere', async () => {
  const doc = REF('small-icons'), reg = loadRegistry(ROOT), th = loadThresholds(ROOT), ref = loadReference(ROOT);
  const all = reg.items().filter(e => !e.full && /^(us|asia)-/.test(e.pack));
  const svg = all.map(e => { try { return e.item.svg().length; } catch { return 0; } }).sort((a, b) => a - b);
  const rendered = measureRegistry(reg, all, th).map(r => r.metrics.bytes).sort((a, b) => a - b);
  const q = (a, p) => a[Math.floor((a.length - 1) * p)];
  const row = (label) => { const m = new RegExp(`\\| ${label} \\| ([\\d,]+) \\| ([\\d,]+) \\| ([\\d,]+) \\| ([\\d,]+) \\| ([\\d,]+) to ([\\d,]+) \\|`).exec(doc); assert.ok(m, `the size table has a "${label}" row`); return m.slice(1).map(x => +x.replace(/,/g, '')); };
  const near = (a, b, what) => assert.ok(Math.abs(a - b) <= Math.max(15, b * 0.03), `${what}: the doc says ${a}, measured ${b}`);
  const [s10, s50, s90, sMax, sLo, sHi] = row('`svg\\(\\)` bytes'), [r10, r50, r90, rMax, rLo, rHi] = row('rendered bytes');
  [[s10, q(svg, 0.1)], [s50, q(svg, 0.5)], [s90, q(svg, 0.9)], [sMax, svg[svg.length - 1]], [r10, q(rendered, 0.1)], [r50, q(rendered, 0.5)], [r90, q(rendered, 0.9)], [rMax, rendered[rendered.length - 1]]].forEach(([a, b], i) => near(a, b, ['svg p10', 'svg median', 'svg p90', 'svg max', 'rendered p10', 'rendered median', 'rendered p90', 'rendered max'][i]));
  const ex = selectEntries(reg, { refs: ref.items.map(x => x.ref) }), exSvg = ex.map(e => e.item.svg().length), exRendered = measureRegistry(reg, ex, th).map(r => r.metrics.bytes);
  near(sLo, Math.min(...exSvg), 'exemplar svg() min'); near(sHi, Math.max(...exSvg), 'exemplar svg() max'); near(rLo, Math.min(...exRendered), 'exemplar rendered min'); near(rHi, Math.max(...exRendered), 'exemplar rendered max');
  // the generated brief target table says the same (median 1.0 KB, thin below 0.8 KB, the exemplars 1.4 to 1.9 KB)
  const targets = corpusTargets('item', th, exemplarRanges(reg, ref.items.map(x => x.ref), th));
  assert.match(targets, /\| rendered size \| 1\.0 KB \| 0\.8 KB \| 1\.4 KB to 1\.9 KB \|/);
  assert.match(doc, /aim at 1\.0 to 1\.9 KB rendered \(`svg\(\)` about 780 to 1,700 B\)/); assert.match(doc, /the ceiling is 2\.0 KB rendered \(`svg\(\)` 1,800 B\), the corpus maximum/);
  // every file that states the size says the same, and the older contradicting ranges are gone
  const files = ['SKILL.md', 'references/style-guide.md', 'references/rubric.md', 'references/small-icons.md', 'references/workflow.md'];
  for (const f of files) assert.doesNotMatch(skillText(f), /0\.8 to 1\.4 KB|600 to about 1,700|about 1\.7 KB is an outlier|over about 1\.7 KB with nothing/, `${f}: no older size range`);
  for (const f of ['SKILL.md', 'references/rubric.md', 'references/style-guide.md']) assert.match(skillText(f), /2\.0 KB/, f);
  assert.match(skillText('references/rubric.md'), /the ceiling 1,800 B `svg\(\)` \/ 2\.0 KB rendered, the corpus maximum: above it FAIL/);
  const el = readFileSync(join(TEMPLATES_DIR, 'element-brief.md'), 'utf8');
  assert.match(el, /aim at 1\.0 to 1\.9 KB rendered \(`svg\(\)` 780 to 1,700 B\); the ceiling is 2\.0 KB rendered \/ 1,800 B `svg\(\)`/); assert.doesNotMatch(el, /0\.8 to 1\.4/);
});

test('small-icons.md: `s` and `w` are described as the CSS defines them, the pale-object rule, opacity, lsoft, x-shadow, x-blink and the 14-segment wave band are all there and true', () => {
  const doc = REF('small-icons'), css = readFileSync(join(ROOT, 'src', 'styles', '71-anim-library.css'), 'utf8');
  assert.match(css, /--as-soft: color-mix\(in oklab, var\(--c, var\(--accent\)\) 24%, transparent\)/); assert.match(css, /\.anim-scene \.s \{ fill: var\(--as-soft\); \}/); assert.match(css, /\.anim-scene \.w \{ fill: var\(--surface\); \}/);
  assert.match(css, /\.anim-scene \.lsoft \{ stroke: var\(--as-soft\); stroke-width: 9; \}/); assert.match(css, /\.x-shadow \{ --an: as-shadow/); assert.match(css, /@keyframes as-blink \{ 0% \{ opacity: 1; \} 50% \{ opacity: 0; \} \}/);
  for (const must of ['24 % alpha over whatever is behind it', 'DARKEN where they overlap', 'the tile\'s **surface**', 'near-black', '**Pale objects.**', '`w lk`', 'a large plain `w` area', '`opacity` as an attribute is allowed', '`lsoft`', '`x-shadow`', 'It is off for half the cycle', '14 segments in all', 'a plate whose top edge IS the wave', 'One idea per tile', 'That strip is the 28 px test']) assert.ok(doc.includes(must), must);
  // the wave band of 14 segments loops seamlessly with the 12 px slide: it covers x 0 to 64 at both ends of the slide
  const wv = (y) => `M-2 ${y}q3-2 6 0${'t6 0'.repeat(13)}`; assert.equal(wv(58).match(/[qt]/g).length, 14); const width = 14 * 6, from = -2;
  assert.ok(from <= 0 && from + width >= 64 + 0 && from - 12 <= 0 && from + width - 12 >= 64, 'the band covers the tile at both ends of its slide');
  assert.ok(doc.includes("'t6 0'.repeat(13)"), 'the wv() helper is the 14-segment one'); assert.ok(!doc.includes("'q3-2 6 0t6 0'.repeat(12)"));
  // the corpus facts quoted: w is used by most symbols and most of its shapes have no outline class
  const reg = loadRegistry(ROOT), items = reg.items().filter(e => !e.full && /^(us|asia)-/.test(e.pack)); let wTot = 0, wOut = 0, itemsW = 0;
  for (const e of items) { let hasW = false; for (const [, , attrs] of reg.html(e.item).matchAll(/<(path|circle|ellipse|rect|polygon|polyline|line)\b([^>]*)>/g)) { const cls = ((/class="([^"]*)"/.exec(attrs) || [])[1] || '').split(/\s+/); if (cls.includes('w')) { wTot++; hasW = true; if (cls.some(c => /^(lk|lc|lm|lw|ln|t)$/.test(c))) wOut++; } } if (hasW) itemsW++; }
  assert.equal(items.length, 245); assert.ok(Math.abs(itemsW - 209) <= 6 && Math.abs(wTot - 561) <= 20 && Math.abs(wOut - 164) <= 10, `${itemsW} items use w, ${wOut} of ${wTot} outlined`);
});

test('the six recurring weaknesses of the pilot: the rubric names each as a check, the style guide has the fix and an example, the recipes have the pattern, and the scene and element briefs point at them', () => {
  const rubric = REF('rubric'), style = REF('style-guide'), recipes = REF('recipes'), small = REF('small-icons');
  const sec9 = rubric.split('## 9. The six recurring weaknesses')[1], sec14 = style.split('## 14. The six weaknesses')[1];
  assert.ok(sec9 && sec14);
  for (const w of ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']) { assert.ok(new RegExp(`\\| ${w}\\b`).test(sec9), `rubric section 9 names ${w}`); assert.ok(new RegExp(`\\| ${w} \\|`).test(sec14), `style-guide section 14 has ${w}`); }
  for (const line of ['R7', 'R10', 'R12', 'R13', 'R15']) assert.ok(new RegExp(`\\| ${line} \\|[^\\n]*\\(W\\d\\)`).test(rubric), `${line} carries its weakness tag`);
  for (const line of ['I1', 'I3', 'I9']) assert.match(rubric, new RegExp(`\\| ${line} \\|[^\\n]*(W6|grey on grey|black hole)`));
  assert.match(sec14, /dim tint over the day picture/); assert.match(sec14, /coin circles/); assert.match(sec14, /Cloned or template shapes/); assert.match(sec14, /no dark anchor/); assert.match(sec14, /hard vertical seams/); assert.match(sec14, /scene-in-a-tile/);
  // the concrete fixes live where the table says
  for (const must of ['## 7. A night scene painted for the LIGHT theme', '### Water and ground that are not slabs, and the dark anchor', '### Mountains, cones and strata', '## 6. Helper patterns from the pilot', 'const crown3 =', 'const treeFern =', 'const hut =', 'Ladders without clones']) assert.ok(recipes.includes(must), must);
  assert.match(small, /\*\*One idea per tile \(an icon is not a scene\)\.\*\*/);
  assert.match(style, /\| E19 \| Water or ground as a hard-edged slab/); assert.match(style, /\| E20 \| A sunburst or striped rays that read as a flag/);
  for (const t of ['scene-brief.md', 'element-brief.md']) assert.match(readFileSync(join(TEMPLATES_DIR, t), 'utf8'), /six recurring weaknesses of (rubric )?section 9|rubric section 9/, t);
  // the night render check is a named rubric line, not only advice
  assert.match(rubric, /\| R13 \| Lights are layered; the night is not a dim copy \|/); assert.match(rubric, /the sun disc and rays still bright and nothing lit \(W1\)/);
});

test('the skill, the briefs and the rubric agree: seven steps in one order, one attempts rule, one looking rule, one place for the study note, one GIT line, one reading list per kind', () => {
  const skill = SKILL(), scene = readFileSync(join(TEMPLATES_DIR, 'scene-brief.md'), 'utf8'), el = readFileSync(join(TEMPLATES_DIR, 'element-brief.md'), 'utf8');
  assert.ok(skill.split('\n').length <= 400, `SKILL.md is ${skill.split('\n').length} lines`);
  // the seven steps, in the briefs' order, in the checklist
  const steps = ['STUDY', 'DRAW', 'LINT', 'LOOK', 'SELF-CHECK', 'CARE', 'REPORT'], at = steps.map((s, i) => skill.indexOf(`**${i + 1} ${s}`));
  assert.ok(at.every(x => x > 0) && at.every((x, i) => !i || x > at[i - 1]), `the checklist has the seven steps in order: ${at}`);
  assert.match(skill, /seven steps, the same seven in the same order as the agent briefs' "Definition of done"/);
  for (const [name, t] of [['scene', scene], ['element', el]]) {
    const bs = ['STUDIED', 'DRAWN', 'LINT', 'LOOK', 'SELF-CHECK', 'CARE', 'REPORTED'].map((s, i) => t.search(new RegExp(`\\n${i + 1}\\. ${s}\\b`)));
    assert.ok(bs.every(x => x > 0) && bs.every((x, i) => !i || x > bs[i - 1]), `${name} brief: the seven steps in order: ${bs}`); assert.match(t, /Definition of done, for EACH \w+ \(all seven, in this order\)/);
  }
  assert.doesNotMatch(skill, /0 Care/);
  // attempts: every redraw from scratch counts, look failures too, polish does not
  for (const [n, t] of [['skill', skill], ['scene', scene], ['element', el]]) { assert.match(t, /EVERY redraw from scratch counts|every redraw from scratch (is the next|counts)/i, n); assert.match(t, /failed LOOK/, n); assert.match(t, /[Pp]olish edits/, n); assert.match(t, /do not count/, n); assert.match(t, /a polish pass that needs a different composition is a redraw/i, n); }
  // looking: an image that did not load has not been looked at, and the report lists the PNGs that loaded
  for (const [n, t] of [['skill', skill], ['scene', scene], ['element', el], ['rubric', REF('rubric')], ['workflow', REF('workflow')], ['small-icons', REF('small-icons')]]) { assert.match(t, /did not load/, n); assert.match(t, /request limit/, n); }
  assert.match(skill, /never claim a look you did not make/i); assert.match(scene + el, /PNGS LOADED:/); assert.match(skill, /PNGS LOADED:/);
  // the study note has a place in every report, in the SKILL.md form
  for (const [n, t] of [['skill', skill], ['scene', scene], ['element', el]]) { assert.match(t, /STUDY: <[^>]+> \| MODEL: <[^>]+> \| TAKE:/, n); assert.match(t, /NOT COPYING/, n); }
  // the GIT line: git status AND the guard output, the committed scaffold, what to expect in a shared tree
  for (const [n, t] of [['skill', skill], ['scene', scene], ['element', el]]) { assert.match(t, /GIT: <the output of `git status --short`|GIT: <git status --short, verbatim>/, n); assert.match(t, /guard/, n); }
  assert.match(scene, /then <the output of `\{\{guard\}\}`, verbatim: `guard: OK` when you work alone/); assert.match(el, /then <the output of `\{\{guard\}\}`, verbatim: `guard: OK` when you work alone/);
  assert.match(scene + el, /COMMITTED the scaffold/); assert.match(REF('workflow'), /\*\*The GIT line of the report\.\*\*/);
  // reading lists: one per kind, and they agree between the skill and the briefs
  assert.match(skill, /\| Draw a SCENE \| `references\/style-guide\.md` \(sections 1 to 10\), `references\/recipes\.md`[^|]*`references\/kit-reference\.md`, `references\/rubric\.md` part A \| `small-icons\.md`/);
  assert.match(skill, /\| Draw a small icon or an element \| `references\/small-icons\.md` \(all\), `references\/style-guide\.md` sections 1 and 10, `references\/rubric\.md` part B \| `recipes\.md` and `kit-reference\.md`/);
  assert.match(scene, /exactly these four references/); assert.match(scene, /a scene agent does not need `small-icons\.md`/);
  assert.match(el, /exactly these three references/); assert.match(el, /You do NOT need `\{\{refs\}\}\/recipes\.md` or `\{\{refs\}\}\/kit-reference\.md`/); assert.doesNotMatch(el, /read all of them|all of them, with their full paths/); assert.doesNotMatch(scene, /all of them, with their full paths/);
  assert.match(REF('small-icons'), /What an element agent reads, and nothing else/);
  // the study step: the orchestrator renders once, the agents open the PNGs (the checklist and the briefs say the same)
  assert.match(skill, /you OPEN the PNGs, you do not render them/); assert.match(scene, /you OPEN those PNGs, you do not render them/); assert.match(el, /you OPEN those PNGs, you do not render them/);
  assert.doesNotMatch(skill, /`reference --render` and `reference --render --mode night`/);
});

test('care: the region\'s notes may only be STRICTER (the briefs, the doc skeleton, the workflow and the docs say so), the rotation yields to the care text, and the safe motifs are named', async () => {
  const scene = readFileSync(join(TEMPLATES_DIR, 'scene-brief.md'), 'utf8'), el = readFileSync(join(TEMPLATES_DIR, 'element-brief.md'), 'utf8'), tpl = readFileSync(join(TEMPLATES_DIR, 'region-doc.md.tpl'), 'utf8');
  for (const [n, t] of [['scene', scene], ['element', el], ['doc skeleton', tpl], ['workflow', REF('workflow')], ['skill', SKILL()], ['docs', readFileSync(join(ROOT, 'docs', 'dev', 'ANIMATION_PACKS.md'), 'utf8')]]) assert.match(t, /may only be STRICTER|MAY ONLY BE STRICTER/i, n);
  assert.match(scene, /a region note that bans every figure bans that silhouette too/); assert.match(el, /a region note that bans every figure bans that silhouette too/);
  assert.match(scene, /the care text and the place win/); assert.match(el, /the care text and the place win/); assert.match(SKILL(), /the care text and the place win/);
  assert.match(scene + el, /Scene suggestions/);
  for (const must of ['NAME THE SAFE MOTIFS', 'a food or a drink in a plain vessel', 'a plant or a crop', 'a real animal in its habitat that is not an emblem or a mascot', 'a tool of daily work', 'a natural feature', 'a landscape', 'a national bird used as an emblem']) assert.ok(tpl.includes(must), must);
  assert.ok(el.includes('a food or drink in a plain vessel, a plant or crop, a real animal in its habitat that is not an emblem or a mascot'), 'the element brief names the safe kinds'); assert.match(REF('small-icons'), /Safe by default: a food or drink in a plain vessel/);
  assert.match(tpl, /rays\(\)/); assert.match(scene, /rising-sun flag/); assert.match(REF('kit-reference'), /rising-sun ensign/);
  // the scaffold's doc is still "skeleton" for `brief` (the comment is the placeholder), and a region that writes its own notes gets them after the general rules
  const root = makeRoot();
  assert.equal((await run(['new', 'cc', 'Care Land', '--root', root])).code, 0);
  const region = findRegion(loadRegistry(root, { fresh: true }), 'cc'); assert.equal(careInfo(root, region).state, 'skeleton');
  assert.match(readFileSync(join(root, 'docs', 'dev', 'CC_PACK.md'), 'utf8'), /THE REGION'S NOTES MAY ONLY BE STRICTER THAN THE GENERAL RULES, NEVER LOOSER/);
  assert.doesNotMatch(readFileSync(join(ROOT, 'docs', 'dev', 'ASIA_PACK.md'), 'utf8'), /no real people/);
});

test('workflow.md documents the tooling as it is: commit before fan-out, stubs, todo until complete, overlap and travel, the --of hint, the sheet options, declare-complete before strict; and the pilot procedure is there with its pass rule and a working blinding sketch', () => {
  const wf = REF('workflow'), skill = SKILL();
  for (const must of ['COMMIT the scaffold and the stubs', 'git.committed: true', '`missingPng`', 'creates the empty scene file (the IIFE stub) of every batch', 'stored in `plan.json`'.replace('stored in', 'the `--note` texts stored in'), '`--of M` is the NUMBER of batches, not a size', 'the repo stays GREEN', 'complete: false', 'node:test `todo`', 'OVERLAP WITH OTHER REGIONS', '**a travel city that is not a row matches nothing at all**', 'The border case', 'REACH line', '`--still`', '`--sizes`', '`sheet --key`', '`lint --key`']) assert.ok(wf.includes(must), must);
  assert.ok(wf.indexOf('status eu --declare-complete') < wf.indexOf('status eu --strict', wf.indexOf('status eu --declare-complete')), 'declare-complete comes before the strict run');
  assert.match(skill, /--declare-complete` \(it refuses while anything is missing, overlapping or failing\), then `status <id> --strict` exits 0/);
  assert.doesNotMatch(wf, /are RED until every unit|A half-built region cannot be committed|region tests stay red/, 'the old "red by design" wording is gone');
  assert.match(skill, /A region in one paragraph/); assert.match(skill, /COMMIT the scaffold and the stubs/);
  // the pilot procedure and its pass rule
  const pilot = wf.split('## 18. Validating a change to the skill or the briefs')[1];
  assert.ok(pilot, 'section 18'); assert.match(wf, /18 validating a change to the skill or the briefs/);
  assert.match(pilot, /at least the corpus mean minus 0\.75; every pilot piece is at least the corpus mean minus 1\.0; and no pilot piece has more than ONE instant-reject vote of the three/);
  for (const must of ['first user', 'Three fresh judges', 'crypto.randomInt', 'one fixed date', 'OUTSIDE the folder', 'pilot mean 7.06 against the corpus sample\'s 4.77', 'icons: 6.55 against 4.63', '9 of 9 and 7 of 7', '60 items']) assert.ok(pilot.includes(must), must);
  // the blinding sketch runs: it copies the PNGs under neutral shuffled names with one modified time and writes the key outside the folder
  const sketch = /```js\n\/\/ the blinding step[^\n]*\n([\s\S]*?)```/.exec(pilot); assert.ok(sketch, 'the sketch is in the section');
  const dir = mkdtempSync(join(tmpdir(), 'anim-blind-')); temps.push(dir);
  writeFileSync(join(dir, 'a.png'), 'a'); writeFileSync(join(dir, 'b.png'), 'b');
  writeFileSync(join(dir, 'blind.mjs'), `const pieces = [{ source: 'pilot', ref: 'p/a', png: { light: ${JSON.stringify(join(dir, 'a.png'))}, night: ${JSON.stringify(join(dir, 'b.png'))} } }, { source: 'corpus', ref: 'c/b', png: { light: ${JSON.stringify(join(dir, 'b.png'))} } }];\n${sketch[1]}`);
  const r = spawnSync(process.execPath, ['blind.mjs'], { cwd: dir, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
  const blind = readdirSync(join(dir, 'blind')).sort(); assert.equal(blind.length, 3); assert.ok(blind.every(f => /^S0[12]-(light|night)\.png$/.test(f)), blind.join(', ')); assert.ok(!blind.some(f => /pilot|corpus/.test(f)), 'no name gives the source away');
  assert.equal(new Set(blind.map(f => statSync(join(dir, 'blind', f)).mtimeMs)).size, 1, 'one modified time for every file'); assert.equal(JSON.parse(readFileSync(join(dir, 'blind-KEY.json'), 'utf8')).length, 2);
  assert.match(pilot, /Math\.floor\(N \/ 2\) \+ i \* N/);
});

test('the skill\'s commands for the look gate are real: sheet --still --sizes --key --at, lint --key, status --declare-complete, brief --clear-notes; and SKILL.md says what each one is for', () => {
  const skill = SKILL(), small = REF('small-icons');
  for (const must of ['--still', '--sizes', '--key', '--at <ms>', '--crop phone', '--crop square', '--contact']) assert.ok(skill.includes(must), must);
  assert.match(skill, /the 28 px test is the `--sizes` strip/); assert.match(skill, /a rising `sun\(\.\.\., true\)` takes 9 s/); assert.match(small, /`--still` renders the REST frame/); assert.match(small, /That strip is the 28 px test/);
  assert.match(REF('rubric'), /The 28 px test is the `--sizes` strip/); assert.match(REF('rubric'), /How to judge a contact sheet or a strip/); assert.match(REF('kit-reference'), /`sheet --still`/);
  const brief = readFileSync(join(TEMPLATES_DIR, 'element-brief.md'), 'utf8'); assert.match(brief, /--still --sizes --contact --out \.anim-ref\/<name>/); assert.match(brief, /The 28 px test is the `--sizes` strip/);
});
