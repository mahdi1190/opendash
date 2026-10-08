// The Texas animation pack (src/app/72-anim-pack-texas.js): plays in Texas only, from the travel
// city or the home weather town; special days win the day there; nothing leaks elsewhere.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { animRegistryFiles } from '../tools/lib/anim-sources.mjs';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { engineOf, lintScene, retroCheck } from '../tools/lib/scene-lint.mjs';
import { stableIds } from '../tools/lib/anim-quality.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const NAMES = ['animTexasWhere', 'animPack', 'animItems', 'animSpecialPick', 'animDailyPick', 'trPlaceTables'];
const body = animRegistryFiles(APP, ['71-anim-sanitize.js', '69-travel-data.js']).map(src).join('\n;\n');   // the build's order
// eslint-disable-next-line no-new-func
const R = new Function(`"use strict";\n${body}\nreturn { ${NAMES.join(', ')} };`)();

const HOUSTON = { lat: 29.76, lon: -95.37 }, AUSTIN = { lat: 30.27, lon: -97.74 }, LONDON = { lat: 51.5, lon: -0.12 };
const texas = R.animPack('texas');

test('texas pack: registered, every item has a when() rule, a size of a real Lone Star pack', () => {
  assert.ok(texas, 'the texas pack is registered');
  assert.ok(texas.items.length >= 30, `${texas.items.length} items`);
  for (const it of texas.items) {
    assert.equal(typeof it.when, 'function', `${it.ref}: a when() rule`);
    assert.ok(it.tags.includes('texas'), it.ref);
    assert.deepEqual(it.region, ['US'], it.ref);
    assert.ok(['statewide', 'city', 'day', 'scene'].includes(it.texasKind), it.ref);
  }
});

test('texas pack: city items are real travel cities where the tables have them, one signature and one element each', () => {
  const T = R.trPlaceTables();
  const by = new Map();
  for (const it of texas.items.filter(i => i.texasKind === 'city')) {
    assert.equal(it.slot, it.worldKind === 'signature' ? 'opening' : 'symbol', it.ref);
    if (!by.has(it.txTown)) by.set(it.txTown, []);
    by.get(it.txTown).push(it.worldKind);
  }
  assert.ok(by.size >= 6, `${by.size} cities`);
  for (const [town, kinds] of by) assert.deepEqual(kinds.sort(), ['element', 'signature'], `${town}: one signature and one element`);
  for (const id of ['houston-us', 'dallas-us', 'san-antonio-us', 'el-paso-us']) assert.ok(T.byId.has(id), `${id} is a travel city`);
});

test('texas pack: plays from the travel city or the home weather town, and nowhere else', () => {
  const day = '2026-10-05';   // a Monday: no special day
  assert.equal(R.animSpecialPick('opening', day, {}, { city: 'houston-us' }).txTown, 'houston', 'travel to Houston');
  assert.equal(R.animSpecialPick('symbol', day, {}, { city: 'el-paso-us' }).txTown, 'el-paso');
  assert.equal(R.animSpecialPick('opening', day, {}, { ...AUSTIN }).txTown, 'austin', 'home in Austin (the weather town)');
  assert.equal(R.animSpecialPick('symbol', day, {}, { ...AUSTIN }).txTown, 'austin');
  assert.equal(R.animSpecialPick('opening', day, {}, { ...LONDON }), null, 'not in London');
  assert.equal(R.animSpecialPick('opening', day, {}, {}), null, 'no location, no Texas');
  assert.equal(R.animSpecialPick('opening', day, {}, { ...HOUSTON, city: 'paris-fr' }).pack, 'world', 'a trip to Paris from Texas is Paris (the world pack), not Texas');
  assert.equal(R.animSpecialPick('opening', day, {}, { lat: 19.43, lon: -99.13 }), null, 'Mexico City is far from every Texas town and is not in the US');
  for (let i = 0; i < 40; i++) {
    const d = `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`;
    for (const slot of ['opening', 'symbol', 'celebration', 'sky']) {
      const it = R.animDailyPick(slot, d, {}, { ...LONDON });
      assert.ok(!it || it.pack !== 'texas', `${d} ${slot}: no Texas item away from Texas`);
    }
  }
  assert.equal(R.animSpecialPick('opening', day, { packsOff: ['texas'] }, { city: 'houston-us' }), null, 'switched off: nothing');
});

test('texas pack: special days win the day in Texas (and only there, only on the day)', () => {
  const ctx = { ...HOUSTON };
  assert.equal(R.animSpecialPick('opening', '2026-03-02', {}, ctx).id, 'independence-day');
  assert.equal(R.animSpecialPick('opening', '2026-04-21', {}, ctx).id, 'san-jacinto');
  assert.equal(R.animSpecialPick('opening', '2026-06-19', {}, ctx).id, 'juneteenth');
  assert.equal(R.animSpecialPick('symbol', '2026-04-01', {}, ctx).id, 'bluebonnet-season');
  assert.equal(R.animSpecialPick('symbol', '2026-03-10', {}, ctx).id, 'rodeo-wheel');
  assert.equal(R.animSpecialPick('symbol', '2026-10-09', {}, ctx).id, 'friday-lights');   // a Friday in October
  assert.notEqual(R.animSpecialPick('symbol', '2026-10-08', {}, ctx).id, 'friday-lights', 'a Thursday is not Friday night');
  assert.equal(R.animSpecialPick('opening', '2026-03-02', {}, { ...LONDON }), null, 'not on 2 March in London');
  assert.notEqual(R.animSpecialPick('opening', '2026-03-03', {}, ctx).id, 'independence-day', 'only on the day');
});

test('texas pack: the sky item joins the sunsets in Texas only', () => {
  const seen = (ctx) => new Set(Array.from({ length: 60 }, (_, i) => R.animSpecialPick('sky', `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`, {}, ctx)).map(it => it && it.id));
  assert.ok(seen({ ...HOUSTON, moment: 'sunset' }).has('big-sky-sunset'), 'comes up at a Texas sunset');
  assert.ok(!seen({ ...HOUSTON, moment: 'day' }).has('big-sky-sunset'), 'not in daylight');
  assert.ok(!seen({ ...LONDON, moment: 'sunset' }).has('big-sky-sunset'), 'not at a London sunset');
});

test('texas pack: animTexasWhere names the town for the opening welcome (home weather town or travel), else null', () => {
  assert.deepEqual(R.animTexasWhere({ lat: 32.7254, lon: -97.3208 }), { id: 'fort-worth', name: 'Fort Worth' }, 'Fort Worth');
  assert.equal(R.animTexasWhere({ lat: 32.68, lon: -97.46 }).name, 'Fort Worth', 'Benbrook is Fort Worth');
  assert.equal(R.animTexasWhere({ city: 'dallas-us' }).name, 'Dallas');
  assert.equal(R.animTexasWhere({ lat: 51.5, lon: -0.12 }), null);
  assert.equal(R.animTexasWhere({}), null);
});

test('texas pack: nine full-screen scenes; a city\'s own scene wins its opening, the statewide ones play anywhere in Texas', () => {
  const scenes = texas.items.filter(i => i.texasKind === 'scene');
  assert.equal(scenes.length, 9);
  for (const it of scenes) { assert.equal(it.full, true, `${it.ref}: full-viewport`); assert.equal(it.slot, 'opening'); assert.ok(it.site, `${it.ref}: an origin line`); }
  const day = '2026-10-05';
  const town = { houston: 'houston-liftoff-scene', dallas: 'dallas-skyline', 'san-antonio': 'alamo-morning', 'el-paso': 'el-paso-star-scene', 'fort-worth': 'fort-worth-stockyards-scene' };
  for (const [t, id] of Object.entries(town)) {
    const c = { houston: { city: 'houston-us' }, dallas: { city: 'dallas-us' }, 'san-antonio': { city: 'san-antonio-us' }, 'el-paso': { city: 'el-paso-us' }, 'fort-worth': { lat: 32.7254, lon: -97.3208 } }[t];
    assert.equal(R.animSpecialPick('opening', day, {}, c).id, id, `${t}: its own scene wins the opening`);
  }
  assert.equal(R.animSpecialPick('opening', day, {}, { ...AUSTIN }).id, 'austin-capitol-walk');
  // anywhere else in Texas (Lubbock): only statewide items, never a city's scene
  const seen = new Set(Array.from({ length: 40 }, (_, i) => R.animSpecialPick('opening', `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`, {}, { lat: 33.58, lon: -101.86 })).map(it => it && it.id));
  assert.ok(!seen.has('dallas-skyline') && !seen.has('austin-capitol-walk'), 'no other city\'s scene');
  assert.ok(seen.has('west-texas-sunset') || seen.has('gulf-coast-sunrise'), 'a statewide scene comes up');
  assert.equal(R.animSpecialPick('opening', '2026-10-05', {}, { ...LONDON }), null);
  assert.ok(!R.animItems({}).some(i => i.ref === 'texas/hill-country-bluebonnets' && i.when('2026-10-05', { ...HOUSTON })), 'no bluebonnets in October');
  assert.ok(R.animItems({}).some(i => i.ref === 'texas/hill-country-bluebonnets' && i.when('2026-04-05', { ...HOUSTON })), 'bluebonnets in April');
});

test('texas pack: the nine scenes take the shared live sky (docs/dev/SCENE_ENGINE.md section 7): re-lit at night, a small overlay, their own lamps, one moon', () => {
  const root = join(APP, '..', '..'), current = loadRegistry(root);
  // A live composed upgrade keeps its original painting as legacySvg. Exercise
  // all nine original retrofit paintings by loading the pack without upgrades.
  const REG = loadRegistry(root, { omit: current.files.filter(f => /^71-scene-upgrade-/.test(f)) });
  const G = REG.R.get, max = G('SCENE_RETRO_MAX_BYTES');
  const entries = REG.items().filter(e => e.packObj.id === 'texas' && e.full);
  assert.equal(entries.length, 9);
  const classes = REG.classesFor(entries[0].packObj);
  // under the retrofit the paintings' own evening tint and stars step aside (the real sky and stars replace them)
  assert.match(entries[0].packObj.css, /\.sr-retro :is\(\.tx-tint, \.tx-star\) \{ opacity: 0 !important; \}/);
  const lum = c => { let s = c.replace('#', ''); if (s.length === 3) s = s.replace(/./g, '$&$&'); const n = parseInt(s, 16); return (0.3 * (n >> 16 & 255) + 0.59 * (n >> 8 & 255) + 0.11 * (n & 255)) / 255; };
  const moons = s => (s.match(/rotate\([-0-9.]+\)" d="M0 -16A/g) || []).length;
  const opens = s => [...s.matchAll(/<[a-z]+\b[^>]*class="[^"]*\b(tx-lit|tx-lamps)\b[^"]*"[^>]*>/g)].map(m => m[0]);
  // a moon (or a low sun that reads as one at night) is painted in these skies: they keep it and get no second one
  const painted = new Set(['fort-worth-stockyards-scene', 'houston-liftoff-scene', 'west-texas-sunset', 'gulf-coast-sunrise']);
  let live = 0;
  for (const { item: it } of entries) {
    assert.ok(it.liveSky && Number.isFinite(it.liveSky.lat) && Number.isFinite(it.liveSky.lon), it.ref + ' liveSky');
    assert.ok(it.retro && typeof it.retro === 'object', it.ref + ' retro');
    for (const k of ['veil', 'grade', 'lamps', 'stars', 'horizon']) assert.ok(!(k in it.retro), it.ref + ': the shared overlay, no ' + k + ' override');
    const raw = it.svg({ size: 'fill' });
    assert.ok(!/sr-retro/.test(raw), it.ref + ': no overlay without a live sky');
    // deep night at the scene's own place, the moon up
    const sky = G('almSceneLight')(Date.parse('2026-07-28T05:05:00Z'), it.liveSky.lat, it.liveSky.lon, 'UTC');
    assert.equal(G('sceneLight')({ sky }, { lat: it.liveSky.lat, lon: it.liveSky.lon }).dark, 1, it.ref + ': night');
    const html = REG.html(it, { live: true, size: 'fill', sky }), svg = html.slice(html.indexOf('>', html.indexOf('<svg')) + 1, html.lastIndexOf('</svg>'));
    const rules = retroCheck(svg, { classes, maxBytes: max });
    assert.ok(rules.every(r => r.ok), it.ref + ': ' + rules.filter(r => !r.ok).map(r => r.message).join('; '));
    assert.ok(svg.length - raw.length <= max, it.ref + ': the retrofit adds ' + (svg.length - raw.length) + ' bytes');
    // re-lit, not veiled: its own sky first, now the dark real sky, with the real stars behind the land
    assert.match(svg, /^<g class="sr-retro"><g class="sr-back">(<g class="sr-lamps">)?(<defs>[\s\S]*?<\/defs>)*<rect y="0" width="1600" height="900" fill="[^"]+"\/><g class="sr-sky">/, it.ref + ': the live sky behind the land');
    assert.ok(lum(/stop-color="(#[0-9a-fA-F]{3,6})"/.exec(svg)[1]) < 0.12, it.ref + ': the real night sky is dark');
    assert.deepEqual(opens(svg), opens(raw), it.ref + ': its windows and lamps, byte for byte (lit by the tod class, never graded)');
    if (painted.has(it.id)) assert.equal(moons(svg), 0, it.ref + ': its own painted moon, no second one');
    else { assert.ok(moons(svg) <= 1, it.ref + ': one moon at most'); live += moons(svg); }
  }
  assert.ok(live >= 3, 'the scenes without a painted moon get the real one (' + live + ')');
});

test('texas pack: Fort Worth uses its composed cattle-drive opening and keeps the original identity and painting', () => {
  const root = join(APP, '..', '..'), REG = loadRegistry(root), G = REG.R.get;
  const LEGACY = loadRegistry(root, { omit: REG.files.filter(f => /^71-scene-upgrade-/.test(f)) });
  const entry = REG.items().find(e => e.ref === 'texas/fort-worth-stockyards-scene');
  const old = LEGACY.items().find(e => e.ref === 'texas/fort-worth-stockyards-scene');
  const up = (G('_ANIM_REGION_UPGRADES').texas || {})['place:fort-worth'];
  assert.ok(entry && old && up, 'the existing Fort Worth scene has a registered upgrade');
  const it = entry.item;
  assert.equal(up.state, 'live');
  assert.equal(it.composed, true);
  assert.equal(it.upgrade.state, 'live');
  assert.equal(typeof it.legacySvg, 'function');
  assert.equal(it.retro, undefined, 'the composed scene uses its own live sky');
  assert.equal(it.reduced, 'static', 'motion preferences retain a still opening');
  const identity = x => Object.fromEntries(['id', 'ref', 'label', 'site', 'tags', 'priority', 'slot', 'region', 'country', 'state', 'colour', 'mood', 'season', 'texasKind', 'txTown', 'worldKind', 'liveSky']
    .map(k => [k, x[k]]).concat([['when', String(x.when)]]));
  assert.deepEqual(identity(it), identity(old.item));
  assert.equal(stableIds(it.legacySvg({ size: 'fill' }), true), stableIds(old.item.svg({ size: 'fill' }), true), 'the original drawing is retained exactly apart from generated ids');
  const data = it.scene(), E = engineOf(REG);
  assert.deepEqual(G('sceneValidate')(data), []);
  const TH = JSON.parse(readFileSync(join(root, 'tools', 'anim-quality.json'), 'utf8'));
  const lint = lintScene(data, TH, { E, item: it, ref: it.ref });
  assert.deepEqual(lint.failures, [], 'the new scene passes data, bar, variety and care');
  assert.equal(lint.pass, true);
  assert.deepEqual(it.upgrade.landmarks, ['landmark.fort-worth-stockyards']);
  const C = G('sceneCompile')(data, { lod: 1 });
  assert.ok(C.items.some(x => x.o === 'landmark.fort-worth-stockyards'), 'the Stockyards gate is placed');
  assert.equal(C.actors.filter(a => a.o === 'animal.texas-longhorn').length, 3, 'three individual longhorns cross the street');
  const day = '2026-10-05', ctx = { lat: 32.7254, lon: -97.3208 };
  assert.equal(R.animSpecialPick('opening', day, {}, ctx).ref, it.ref, 'the existing Fort Worth location selects the new opening');
  assert.equal(R.animSpecialPick('opening', day, { packsOff: ['texas'] }, ctx), null, 'the Texas pack preference still applies');
});

test('texas pack: all nine opening scenes use distinct live compositions while retaining location selection and originals', () => {
  const root = join(APP, '..', '..'), REG = loadRegistry(root), G = REG.R.get;
  const LEGACY = loadRegistry(root, { omit: REG.files.filter(f => /^71-scene-upgrade-/.test(f)) });
  const scenes = REG.items().filter(e => e.packObj.id === 'texas' && e.full);
  const upgrades = G('_ANIM_REGION_UPGRADES').texas;
  assert.equal(scenes.length, 9);
  const compositions = new Set();
  for (const e of scenes) {
    const it = e.item, old = LEGACY.items().find(o => o.ref === e.ref).item;
    const key = 'place:' + (it.txTown || it.id);
    assert.equal(upgrades[key].state, 'live', e.ref + ': live upgrade for city or statewide key');
    assert.equal(it.composed, true, e.ref + ': composed opening');
    assert.equal(it.reduced, 'static', e.ref + ': reduced-motion fallback');
    for (const field of ['id', 'ref', 'label', 'site', 'priority', 'slot', 'texasKind', 'txTown'])
      assert.deepEqual(it[field], old[field], e.ref + ': preserved ' + field);
    assert.equal(String(it.when), String(old.when), e.ref + ': preserved selection rule');
    assert.equal(stableIds(it.legacySvg({ size: 'fill' }), true), stableIds(old.svg({ size: 'fill' }), true), e.ref + ': original painting retained');
    const data = it.scene();
    assert.deepEqual(G('sceneValidate')(data), [], e.ref + ': valid scene');
    assert.equal(data.season, 'auto');
    assert.equal(data.weather, 'live');
    const C = G('sceneCompile')(data, { lod: 1 });
    assert.ok(C.actors.length + C.flocks.reduce((n, f) => n + (f.n || 0), 0) >= 6, e.ref + ': travelling life');
    compositions.add(JSON.stringify([data.ground, data.place, data.water]));
    assert.ok(it.upgrade.landmarks.length, e.ref + ': has its own landmark or natural signature');
  }
  assert.equal(compositions.size, 9, 'every intro has a distinct composition');
});
