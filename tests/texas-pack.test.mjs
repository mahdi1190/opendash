// The Texas animation pack (src/app/72-anim-pack-texas.js): plays in Texas only, from the travel
// city or the home weather town; special days win the day there; nothing leaks elsewhere.
// Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const PACK_FILES = readdirSync(APP).filter(f => /^72-anim-pack-[a-z0-9-]+\.js$/.test(f)).sort();
const NAMES = ['animTexasWhere', 'animPack', 'animItems', 'animSpecialPick', 'animDailyPick', 'trPlaceTables'];
const body = ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-anim-sanitize.js', '71-delight-library.js', '71-uk-counties.js', '71-anim-texas-scenes.js', ...readdirSync(APP).filter(f => /^71-anim-us2?[-.]/.test(f)).sort(), ...PACK_FILES, '69-travel-data.js'].map(src).join('\n;\n');
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
