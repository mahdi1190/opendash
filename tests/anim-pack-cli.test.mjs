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
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { animRegistryFiles } from '../tools/lib/anim-sources.mjs';
import { planBatches, regionNeeds, findRegion, templatePlaceholders, renderTemplate, readTemplate, careFor, RESERVED_IDS, TEMPLATES_DIR, SCENES_PER_AGENT, CARE_RULES, plural } from '../tools/lib/anim-region.mjs';
import { starterData } from '../tools/lib/anim-cmd/new.mjs';

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
  const auto = planBatches(list, { groupOf });
  assert.equal(auto.length, Math.ceil(23 / SCENES_PER_AGENT)); check(auto, 23);
  assert.deepEqual(auto.map(p => p.length), [8, 8, 7], 'about 11 per agent: 3 agents, as even as it gets');
  assert.deepEqual(planBatches(mk(8, 8, 7), { groupOf }).map(p => [...new Set(p.map(groupOf))].join('')), ['a', 'b', 'c'], 'cuts on the group boundaries');
  assert.deepEqual(planBatches(mk(9, 7, 7), { groupOf }).map(p => p.length), [9, 7, 7], 'a boundary one item from the even cut wins');
  for (const of of [1, 2, 4, 7, 23, 50]) { const p = planBatches(list, { of, groupOf }); check(p, 23); assert.equal(p.length, Math.min(of, 23), `of ${of}`); }
  assert.deepEqual(planBatches([], { of: 3 }), []); assert.deepEqual(planBatches([1], { of: 3 }), [[1]]);
  const sizes = planBatches(Array.from({ length: 132 }, (_, i) => ({ i })), {}).map(p => p.length);
  assert.deepEqual([sizes.length, Math.min(...sizes), Math.max(...sizes)], [12, 11, 11], '132 scenes: 12 agents of 11');
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
  assert.deepEqual(region.check(), []); assert.deepEqual(region.groups, ['west', 'east']); assert.equal(region.unitWord, 'province');
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
  assert.equal(st.complete, false); assert.deepEqual(st.starter, ['example-big', 'example-small', 'example-anchor']);
  assert.deepEqual(st.missing.map(m => `${m.need}:${m.key}`).sort(), ['element:place:example-small', 'element:province:XA', 'element:province:XB', 'scene:place:example-big', 'scene:province:XA', 'scene:province:XB']);
  assert.deepEqual([st.totals.scenes, st.totals.scenesNeeded, st.totals.elements, st.totals.elementsNeeded], [0, 3, 0, 3]);
  const text = await run(['status', 'zz', '--root', root]);
  assert.equal(text.code, 0); assert.match(text.out, /MISSING \(6\)/); assert.match(text.out, /STARTER DATA still in the tables/); assert.match(text.out, /INCOMPLETE/); assert.match(text.out, /GROUP west[\s\S]*GROUP east/);
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
  assert.deepEqual(q.check(), []); assert.deepEqual(findRegion(reg, 'zz').check(), []);
  const one = starterData(['solo'], 'state'), many = starterData(['a', 'b', 'c', 'd'], 'country');
  assert.equal(one.units.length, 2); assert.ok(one.units.every(u => u.group === 'solo'));
  assert.deepEqual(many.units.map(u => u.group), ['a', 'b', 'c', 'd'], 'every group has a unit, or the builder of that group would throw');
  const solo = makeRoot();
  assert.equal((await run(['new', 'solo', 'Solo', '--groups', 'only', '--unit-word', 'state', '--root', solo])).code, 0);
  assert.deepEqual(findRegion(loadRegistry(solo, { fresh: true }), 'solo').check(), []);
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
  assert.equal(ap.of, 12); assert.equal(keys.length, an.keys.length); assert.equal(new Set(keys).size, keys.length, 'every key once'); assert.deepEqual(keys, an.keys.map(k => k.key), 'in the region\'s order: by group');
  assert.ok(ap.batches.every(b => b.count === 11), ap.batches.map(b => b.count).join());
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
  assert.ok(md.includes('Example Big City (Example Province One): big city, at -50, -25'));
  const file = 'src/app/71-anim-region-zz-scenes-1.js';
  for (const s of [`You own exactly ONE file: \`${file}\``, `node --check ${file}`, `node tools/anim-pack.mjs lint --file ${file}`, `node tools/anim-pack.mjs sheet --file ${file} --mode light --out .anim-ref/71-anim-region-zz-scenes-1 --contact`,
    `node tools/anim-pack.mjs sheet --file ${file} --mode night`, 'node tools/anim-pack.mjs reference --render', 'reference --render --mode night', 'node tools/anim-pack.mjs status zz',
    '.claude/skills/animation-pack/SKILL.md', 'references/style-guide.md', 'references/rubric.md', 'references/recipes.md', 'references/kit-reference.md', '20-point rubric', 'instant reject',
    'animSceneKit()', 'animRegionSceneAdd(\'zz\'', '32,000 bytes', 'IIFE', 'Prefer morning light.', 'us-northeast/new-york-skyline', 'asia-southeast/th-signature', 'asia-west/sa-signature',
    // the definition of done and what not to do
    'STUDIED', 'DRAWN', 'LINT', 'LOOK', 'SCORED', 'CARE', 'REPORTED', 'NO waiver', 'never edit', 'tools/anim-quality.json', 'No padding', 'No copy-paste', 'recolour', 'No text', 'No flags', 'No people', 'No holy figures', 'FEWER',
    'WEAKEST', 'rubric score', 'Do not commit', 'PUBLIC',
  ]) assert.ok(md.includes(s), s);
  for (const rule of CARE_RULES) assert.ok(md.includes(rule), rule.slice(0, 40));
  assert.doesNotMatch(md, /\n{3,}/, 'no runs of blank lines');
  // the element brief
  const e = (await run(['brief', 'zz', '--kind', 'element', '--batch', '2', '--root', root])).out;
  assert.doesNotMatch(e, /\{\{|\}\}|undefined/);
  for (const s of ['draw 2 small elements for the Zed Land region (batch 2 of 2)', 'src/app/72-anim-pack-zz-east.js', "B.element('XB'", "B.place('example-small'", 'B.scenes()', 'theme classes ONLY', 'never a hex colour', 'references/small-icons.md',
    'node tools/anim-pack.mjs lint --file src/app/72-anim-pack-zz-east.js --only small', 'sheet --file src/app/72-anim-pack-zz-east.js --only small --mode dark', '28 px', 'bellingham-ferry-baker', 'natchez-steamboat-wheel', 'STUDIED', 'LINT', 'LOOK', 'SCORED', 'No padding', 'No people', 'FEWER', '14,000 bytes']) assert.ok(e.includes(s), s);
  assert.ok(!e.includes('71-anim-region-zz-scenes-1.js\`:') , 'the element brief does not give away a scene file as its own');
  // --out writes the briefs, --json adds the markdown, bad input is an error
  const out = mkdtempSync(join(tmpdir(), 'anim-brief-')); temps.push(out);
  const w = await run(['brief', 'zz', '--kind', 'element', '--out', out, '--root', root]);
  assert.equal(w.code, 0); assert.deepEqual(readdirSync(out).sort(), ['element-brief-1.md', 'element-brief-2.md']); assert.equal(readFileSync(join(out, 'element-brief-2.md'), 'utf8').trimEnd(), e.trimEnd());
  const j = JSON.parse((await run(['brief', 'zz', '--kind', 'scene', '--batch', '1', '--json', '--root', root])).out);
  assert.equal(j.batches.length, 1); assert.match(j.batches[0].markdown, /^# Brief: draw 3 full-screen scenes/);
  for (const [argv, re] of [[['brief'], /needs a region/], [['brief', 'zz'], /--kind must be/], [['brief', 'zz', '--kind', 'x'], /--kind must be/], [['brief', 'nope', '--kind', 'scene'], /unknown region "nope"/],
    [['brief', 'zz', '--kind', 'scene', '--batch', '2'], /out of range/], [['brief', 'zz', '--kind', 'scene', '--batch', '0'], /whole number/], [['brief', 'zz', '--kind', 'scene', '--of', 'x'], /whole number/],
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
  const known = { 'scene-brief.md': ['care', 'count', 'batch', 'batch_groups', 'batches', 'done_note', 'exemplars', 'existing', 'file', 'keys', 'notes', 'over', 'region_file', 'region_id', 'region_name', 'scene_cap', 'todo_count', 'unit_word', 'verify', 'weaker', 'groups_summary'],
    'element-brief.md': ['care', 'count', 'batch', 'batch_groups', 'batches', 'done_note', 'exemplars', 'existing', 'files', 'item_cap', 'keys', 'notes', 'region_file', 'region_id', 'region_name', 'todo_count', 'unit_word', 'verify', 'weaker', 'groups_summary'] };
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
  const green = test();
  assert.equal(green.status, 0, green.stdout.slice(-3000) + green.stderr);
  assert.match(green.stdout, /# pass 7/); assert.match(green.stdout, /# fail 0/);
  // status agrees: everything exists; the junk art fails the lint, the example rows are still there
  const st = JSON.parse((await run(['status', 'zz', '--json', '--root', root])).out);
  assert.deepEqual(st.missing, []); assert.deepEqual(st.orphans, []); assert.deepEqual(st.problems, []);
  assert.equal(st.complete, false); assert.ok(st.lint.failing > 0, 'a one-circle scene is not a scene'); assert.equal(st.starter.length, 3);
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
