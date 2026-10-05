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
import { main, loadCommands, COMMANDS } from '../tools/anim-pack.mjs';
import { loadRegistry, findBrowser } from '../tools/lib/anim-render.mjs';
import { animRegistryFiles } from '../tools/lib/anim-sources.mjs';
import { planBatches, regionNeeds, findRegion, templatePlaceholders, renderTemplate, readTemplate, careFor, careInfo, varietyOf, fileProblems, RESERVED_IDS, RESERVED_UNIT_WORDS, TEMPLATES_DIR, SCENES_PER_AGENT, CARE_RULES, RUBRIC_PASS, plural } from '../tools/lib/anim-region.mjs';
import { starterData, starterBaseFor, STARTER_BASE } from '../tools/lib/anim-cmd/new.mjs';
import { corpusTargets, exemplarRanges, safeZones, markupRules, passMark, briefFileOf } from '../tools/lib/anim-cmd/brief.mjs';
import { guardResult, parseStatus, parseNameStatus, forbiddenReason } from '../tools/lib/anim-cmd/guard.mjs';
import { loadThresholds, loadReference } from '../tools/anim-pack.mjs';
import { TARGETS, allowedTagList } from '../tools/lib/anim-quality.mjs';
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
  for (const p of st.packs) { assert.equal(p.lint.fail, 0, p.pack); assert.ok(p.lint.pass > 0 && p.largestScene.bytes <= 32000, p.pack); }
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
  assert.deepEqual(names, ['element-brief.md', 'modules-row.md.tpl', 'region-config.js.tpl', 'region-doc.md.tpl', 'region-pack.js.tpl', 'region-scenes.js.tpl', 'region-test.mjs.tpl', 'scene-brief.md']);
  // the briefs and the scaffold render every template (above); here the placeholder inventory is pinned so a new one cannot slip in unsupplied
  const known = { 'scene-brief.md': ['care', 'count', 'batch', 'batch_groups', 'batches', 'done_note', 'exemplars', 'existing', 'file', 'guard', 'keys', 'markup_rules', 'max_redraws', 'max_thin', 'min_richness', 'notes', 'pass_mark', 'refs', 'region_file', 'region_id', 'region_name', 'safe_zones', 'scene_cap', 'skill', 'targets', 'todo_count', 'todo_s', 'unit_word', 'verify', 'weaker', 'groups_summary'],
    'element-brief.md': ['care', 'count', 'batch', 'batch_groups', 'batches', 'done_note', 'exemplars', 'existing', 'files', 'guard', 'item_cap', 'keys', 'markup_rules', 'max_redraws', 'max_thin', 'min_richness', 'notes', 'pass_mark', 'refs', 'region_file', 'region_id', 'region_name', 'skill', 'targets', 'todo_count', 'todo_s', 'unit_word', 'verify', 'weaker', 'groups_summary'] };
  for (const [f, list] of Object.entries(known)) assert.deepEqual(templatePlaceholders(readTemplate(f)).sort(), [...list].sort(), f);
  assert.throws(() => renderTemplate('a {{b}} c', {}, 'demo'), /demo: no value for \{\{b\}\}/);
  assert.equal(renderTemplate('a {{b}} c {{b}}', { b: '$&' }), 'a $& c $&', 'a value is never read as a replacement pattern');
  assert.deepEqual(templatePlaceholders('{{a}} {{ b }} {x} {{{c}}}'), ['a', 'b', 'c']);
  for (const f of names.filter(n => /^region-|^modules/.test(n))) assert.ok(templatePlaceholders(readTemplate(f)).length > 0, f);
});

test('the generated test is red until every unit and place has its art, then green (run for real, in the temp checkout)', async () => {
  const root = makeRoot();
  assert.equal((await run(['new', 'zz', 'Zed Land', '--groups', 'west,east', '--unit-word', 'province', '--root', root])).code, 0);
  const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;   // inside `node --test` a nested run would think it is a child of this one
  const test = () => spawnSync(process.execPath, ['--test', 'tests/zz-pack.test.mjs'], { cwd: root, encoding: 'utf8', env });
  const red = test();
  assert.notEqual(red.status, 0, 'no art yet: the coverage tests fail');
  assert.match(red.stdout, /signature opening is missing/); assert.match(red.stdout, /node tools\/anim-pack\.mjs status zz lists everything that is missing/);
  assert.match(red.stdout, /ok \d+ - zz: the region is defined and its tables are sound/, 'the table checks pass from the start');
  fillStarterArt(root);
  const red2 = test();
  assert.notEqual(red2.status, 0, 'the placeholder country XX keeps the generated test red even when every piece of art exists');
  assert.match(red2.stdout, /starter: the country is still the placeholder XX/);
  const cfg = join(root, 'src', 'app', '71-anim-region-zz.js');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/\n {2}country: 'XX',/, "\n  country: 'ZZ',"));
  const green = test();
  assert.equal(green.status, 0, green.stdout.slice(-3000) + green.stderr);
  assert.match(green.stdout, /# pass 7/); assert.match(green.stdout, /# fail 0/);
  // status agrees: everything exists; the junk art fails the lint, the example rows are still there
  const st = JSON.parse((await run(['status', 'zz', '--json', '--root', root])).out);
  assert.deepEqual(st.missing, []); assert.deepEqual(st.orphans, []); assert.deepEqual(st.problems, []);
  assert.equal(st.complete, false); assert.ok(st.lint.failing > 0, 'a one-circle scene is not a scene'); assert.equal(st.starter.length, 3, 'the three example rows are still there; the country is no longer a placeholder');
  assert.deepEqual(st.packs.map(p => p.pack), ['zz-east', 'zz-west']); assert.ok(st.packs.every(p => p.lint.fail > 0 && p.lint.failing.every(f => f.rules.length > 0)));
  const text = await run(['status', 'zz', '--strict', '--root', root]);
  assert.equal(text.code, 2); assert.match(text.out, /FAIL zz-west\/xa-signature: /); assert.match(text.out, /node tools\/anim-pack\.mjs lint --ref zz-west\/xa-signature/);
  // lint --file works for a file that is already in src/app (everything the file adds), and --only keeps the elements of a pack file apart from its scenes
  const refsOf = async (argv) => JSON.parse((await run([...argv, '--root', root, '--json'])).out).items.map(i => i.ref).sort();
  assert.equal((await run(['lint', '--file', join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js'), '--root', root, '--json'])).code, 2, 'lint --file sees the new scenes through the scaffold\'s pack files');
  assert.deepEqual(await refsOf(['lint', '--file', join(root, 'src', 'app', '71-anim-region-zz-scenes-1.js')]), ['zz-east/xb-signature', 'zz-west/example-big-skyline', 'zz-west/xa-signature'], 'a scene file adds its scenes');
  const westPack = join(root, 'src', 'app', '72-anim-pack-zz-west.js');
  assert.deepEqual(await refsOf(['lint', '--file', westPack]), ['zz-west/example-big-skyline', 'zz-west/xa-m', 'zz-west/xa-signature'], 'a pack file adds its elements and the scenes it builds');
  assert.deepEqual(await refsOf(['lint', '--file', westPack, '--only', 'small']), ['zz-west/xa-m']);
  assert.deepEqual(await refsOf(['lint', '--file', westPack, '--only', 'scenes']), ['zz-west/example-big-skyline', 'zz-west/xa-signature']);
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
  assert.ok(wire.includes("tx ? 'Welcome to' : 'Welcome back'") && wire.includes('esc(w ? animOpeningPlace(it, w) : tx.name)'), 'the title is "Welcome to" and the place name from the table');
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
  assert.match(two.out, /render the gold standard ONCE[\s\S]*reference --render --mode night[\s\S]*guard --owned/);
  const plan = JSON.parse(readFileSync(join(out, 'plan.json'), 'utf8'));
  assert.equal(plan.region, 'zz'); assert.deepEqual(plan.dispatch, ['element-brief-1.md', 'element-brief-2.md', 'scene-brief-1.md', 'scene-brief-2.md'].sort((a, b) => (plan.dispatch.indexOf(a) - plan.dispatch.indexOf(b))));
  assert.deepEqual(Object.keys(plan.plans).sort(), ['element', 'scene']);
  const sp = plan.plans.scene; assert.equal(sp.of, 2);
  assert.deepEqual(sp.batches.map(b => [b.brief, b.owns, b.count]), [['scene-brief-1.md', ['src/app/71-anim-region-zz-scenes-1.js'], 2], ['scene-brief-2.md', ['src/app/71-anim-region-zz-scenes-2.js'], 1]]);
  assert.deepEqual(sp.batches.flatMap(b => b.keys).sort(), ['place:example-big', 'province:XA', 'province:XB']);
  assert.deepEqual(sp.before, ['node tools/anim-pack.mjs reference --render', 'node tools/anim-pack.mjs reference --render --mode night']);
  assert.equal(sp.afterEach[0].guard, 'node tools/anim-pack.mjs guard --owned src/app/71-anim-region-zz-scenes-1.js');
  assert.match(sp.afterAll[0], /guard --owned src\/app\/71-anim-region-zz-scenes-1\.js,src\/app\/71-anim-region-zz-scenes-2\.js/); assert.ok(sp.afterAll.includes('node --test tests/anim-packs.test.mjs'));
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
