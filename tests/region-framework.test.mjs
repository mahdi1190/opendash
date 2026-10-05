// The generic region framework (src/app/71-anim-0region.js): a region is a CONFIG of data tables, not code.
// A TOY region (2 groups, 4 units, 6 places, a travel mapping, a skip list, scenes) is defined through the framework
// exactly as a real region's config file would be, and everything the US and Asia need is proved on it: the lookups
// (nearest row, place radius, travel, outside = empty), the builder (items, ids, labels, tags, slots, priorities,
// full flags, when rules), the scene upgrade and the scene items, animRegionWhere and the opening sequence's one
// generic branch. Then the US and Asia, defined the same way, keep every public name. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { animRegistryFiles, regionSourceFiles, REGION_FILE_RE } from '../tools/lib/anim-sources.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const BODY = animRegistryFiles(APP).map(src).join('\n;\n');
const NAMES = ['ANIM_REGIONS', 'animRegion', 'animRegionDefine', 'animRegionWhere', 'animRegionOwns', 'animRegionSceneAdd', 'animSceneKit', 'animSceneCss',
  'animRegisterPack', 'animPack', 'animItem', 'animItems', 'animItemHtml', 'animSpecialPick', 'animDailyPick',
  'usPlace', 'usStateOf', 'usWhere', 'usBuilder', 'usSceneAdd', 'usSceneKit', 'usSceneCss', 'US_SCENES', 'US_STATES', 'US_PLACES',
  'asiaPlace', 'asiaCountryOf', 'asiaWhere', 'asiaBuilder', 'asiaSceneAdd', 'ASIA_SCENES', 'ASIA_COUNTRIES', 'ASIA_PLACES'];

/* The toy region, written the way a region's files are: a config, its scenes, its packs (classic-script source). */
const TOY_SRC = `
const TOY = animRegionDefine({
  id: 'toy', name: 'Toyland', over: 'Toyland', unitWord: 'island',
  units: { AA: ['Aland', 'north'], BB: ['Bland', 'north'], CC: ['Cland', 'south'], DD: ['Dland', 'south'] },
  places: [
    ['alpha-city', 'Alpha City', 'AA', -40.0, -20.0, 'big'], ['alpha-cove', 'Alpha Cove', 'AA', -40.0, -19.2, 'small'], ['bravo-bay', 'Bravo Bay', 'BB', -41.0, -20.0, ''],
    ['charlie-port', 'Charlie Port', 'CC', -42.0, -20.0, 'big'], ['charlie-camp', 'Charlie Camp', 'CC', -42.0, -19.0, 'small'], ['delta-post', 'Delta Post', 'DD', -43.0, -20.0, ''],
  ],
  unitKm: 80,
  travelId: (p) => p[0] + '~' + p[2],          // any convention: here 'alpha-city~AA'
  worldTravel: ['alpha-cove~AA'],              // the world pack draws this one for travellers
  elsewhere: ['DD'],                           // Dland has art elsewhere: lookups know it, no opening is made for it
});
const _toyScene = (key, o) => animRegionSceneAdd('toy', Object.assign({ key, colour: 'teal', mood: 'calm', season: 'any', tags: ['toy-scene'],
  svg: () => { const K = animSceneKit(); return K.full('#a9d4f0') + K.sun(1180, 210, 40, '#fff6d8', '#ffe39a') + K.cloud(420, 230, 1, '#dbe9f5'); } }, o));
_toyScene('island:AA', { label: 'Harbour at dawn', site: 'Aland harbour' });
_toyScene('place:alpha-city', { label: 'Alpha City skyline', site: 'The Alpha City waterfront' });
_toyScene('island:CC', { label: 'Cland ridge', site: 'The Cland ridge' });
_toyScene('place:charlie-port', { id: 'quay', label: 'Charlie Port quay', site: 'The old quay' });
const _toyIcon = (x) => () => '<circle class="c x-pulse" cx="' + x + '" cy="32" r="8"/>';
const TOY_PACKS = [];
(function () {
  const B = TOY.builder('north');                                  // the US way: an icon per item, a registered scene upgrades it
  B.unit('AA', 'signature', { id: 'harbour', label: 'Small harbour', colour: 'blue', tags: ['own-tag'], svg: _toyIcon(10) });
  B.unit('AA', 'element', { id: 'gull', label: 'Gull on a post', colour: 'blue', mood: 'cheerful', svg: _toyIcon(14) });
  B.unit('BB', 'signature', { id: 'lighthouse', label: 'Lighthouse', colour: 'amber', svg: _toyIcon(18) });
  B.element('BB', { id: 'buoy', label: 'Red buoy', colour: 'red', svg: _toyIcon(22) });
  B.place('alpha-city', { id: 'skyline', label: 'Small skyline', colour: 'indigo', svg: _toyIcon(26) });
  B.place('alpha-cove', { id: 'boat', label: 'Rowing boat', colour: 'teal', svg: _toyIcon(30) });
  TOY_PACKS.push(animRegisterPack(B.pack({ id: 'toy-north', name: 'Toy north', description: 'The north of Toyland.' })));
})();
(function () {
  const B = TOY.builder('south');                                  // the Asia way: every registered scene of the group is an opening item
  B.scenes();
  B.element('CC', { id: 'palm', label: 'Palm tree', colour: 'green', svg: _toyIcon(34) });
  B.place('charlie-camp', { id: 'tent', label: 'Camp tent', colour: 'orange', svg: _toyIcon(38) });
  TOY_PACKS.push(animRegisterPack(B.pack({ id: 'toy-south', name: 'Toy south', description: 'The south of Toyland.' })));
})();
`;
const load = (toy = true) => new Function(`"use strict";\n${BODY}\n${toy ? TOY_SRC : ''}\nreturn { ${NAMES.join(', ')}${toy ? ', TOY, TOY_PACKS' : ''} };`)();
const R = load();
const { TOY } = R;
const day = '2026-10-05';   // a Monday: no festival
const KM = 111.1949;        // km per degree of latitude: the framework's own haversine on a meridian
const row = (id) => TOY.places.find(p => p[0] === id);
const at = (p) => ({ lat: p[3], lon: p[4] });
const north = (p, km) => ({ lat: p[3] + km / KM, lon: p[4] });
const AC = row('alpha-city'), CV = row('alpha-cove'), BB = row('bravo-bay'), CP = row('charlie-port'), CC = row('charlie-camp'), DP = row('delta-post');

test('file names: the framework sorts before the US and Asia configs; region files follow the naming convention', () => {
  const files = regionSourceFiles(APP);
  assert.equal(files[0], '71-anim-0region.js', 'the framework loads first among the region files');
  assert.ok(files.indexOf('71-anim-0region.js') < files.indexOf('71-anim-asia.js') && files.indexOf('71-anim-0region.js') < files.indexOf('71-anim-us.js'));
  for (const f of ['71-anim-0region.js', '71-anim-region-europe.js', '71-anim-region-europe-scenes-3.js', '71-anim-us.js', '71-anim-us2-scenes-1.js', '71-anim-asia.js', '71-anim-asia2-scenes-9.js']) assert.ok(REGION_FILE_RE.test(f), f);
  for (const f of ['71-anim-registry.js', '71-anim-library.js', '72-anim-pack-europe-west.js']) assert.ok(!REGION_FILE_RE.test(f), f);
  // '-scenes-N.js' sorts before '.js': a scene file registers before its config loads, so scenes live in the framework
  assert.ok(['71-anim-region-x.js', '71-anim-region-x-scenes-1.js'].sort()[0].includes('scenes'));
});

test('toy region: defined through the framework, registered, and its tables are sound', () => {
  assert.equal(R.ANIM_REGIONS.at(-1), TOY);
  assert.deepEqual(R.ANIM_REGIONS.map(r => r.id), ['asia', 'us', 'toy']);
  assert.equal(R.animRegion('toy'), TOY); assert.equal(R.animRegion('nope'), null);
  assert.deepEqual(TOY.check(), []);
  assert.deepEqual(TOY.groups, ['north', 'south']);
  assert.deepEqual([TOY.name, TOY.over, TOY.unitWord], ['Toyland', 'Toyland', 'island']);
  assert.deepEqual(TOY.fields, { kind: 'toyKind', unit: 'toyIsland', place: 'toyPlace', size: 'toySize', signature: 'toySignature' }, 'item fields default from the id and the unit word');
  assert.deepEqual(TOY.tags, { root: 'toy', unit: 'toy-island', city: 'toy-city' });
  assert.deepEqual(TOY.priority, { unit: 1, city: 1.2 });
  assert.deepEqual(R.TOY_PACKS.map(r => [r.ok, r.errors]), [[true, []], [true, []]], 'both packs register');
});

test('toy lookups: the nearest row decides the unit, the radii decide the place, outside is empty', () => {
  for (const [p, u] of [[AC, 'AA'], [CV, 'AA'], [BB, 'BB'], [CP, 'CC'], [CC, 'CC'], [DP, 'DD']]) assert.equal(TOY.unitOf(at(p)), u, p[0]);
  // nearest row: 55 km south of Alpha City is 56 km north of the Bravo anchor; 57 km south is nearer Bravo
  assert.equal(TOY.unitOf(north(AC, -55)), 'AA'); assert.equal(TOY.unitOf(north(AC, -57)), 'BB');
  // the unit radius (80 km) from the nearest row
  assert.equal(TOY.unitOf(north(AC, 79)), 'AA'); assert.equal(TOY.unitOf(north(AC, 81)), '');
  // the place radius: 50 km for a big place, 30 km for a small one; an anchor never is a place
  assert.equal(TOY.place(at(AC)).id, 'alpha-city');
  assert.equal(TOY.place(north(AC, 49)).id, 'alpha-city'); assert.equal(TOY.place(north(AC, 51)), null);
  assert.equal(TOY.unitOf(north(AC, 51)), 'AA', 'outside the place radius the unit still plays');
  assert.equal(TOY.place(north(CV, 29)).id, 'alpha-cove'); assert.equal(TOY.place(north(CV, 31)), null);
  assert.equal(TOY.place(at(BB)), null, 'an anchor row is not an art place'); assert.equal(TOY.unitOf(at(BB)), 'BB');
  assert.deepEqual(TOY.place(at(CP)), { id: 'charlie-port', name: 'Charlie Port', unit: 'CC', kind: 'big' });
  // outside the region, or no usable position
  assert.equal(TOY.unitOf({ lat: 51.5, lon: -0.12 }), ''); assert.equal(TOY.place({ lat: 51.5, lon: -0.12 }), null);
  for (const c of [{}, null, undefined, { lat: null, lon: null }, { lat: NaN, lon: 10 }, { lat: 'x', lon: 1 }, { lat: -40 }]) {
    assert.equal(TOY.unitOf(c), '', JSON.stringify(c)); assert.equal(TOY.place(c), null); assert.equal(TOY.where(c), null);
  }
});

test('toy travel: the travel city id maps to a row, travel beats the position, the skip list returns no match', () => {
  assert.equal(TOY.travelRow('alpha-city~AA'), AC); assert.equal(TOY.travelRow('nope~ZZ'), null);
  assert.equal(TOY.place({ city: 'alpha-city~AA' }).id, 'alpha-city'); assert.equal(TOY.unitOf({ city: 'alpha-city~AA' }), 'AA');
  assert.equal(TOY.place({ city: 'charlie-camp~CC' }).kind, 'small');
  assert.equal(TOY.unitOf({ city: 'bravo-bay~BB' }), 'BB'); assert.equal(TOY.place({ city: 'bravo-bay~BB' }), null, 'an anchor is a unit, not a place');
  assert.equal(TOY.unitOf({ city: 'alpha-city~AA', lat: 0, lon: 0 }), 'AA', 'travel beats the weather town');
  assert.equal(TOY.unitOf({ city: 'alpha-city~BB', lat: at(AC).lat, lon: at(AC).lon }), '', 'a travel id that names no row is no match, whatever the position');
  assert.equal(TOY.unitOf({ city: '', ...at(AC) }), 'AA', 'no travel city: the position decides');
  // the world pack draws Alpha Cove for travellers: no match while travelling, the full lookup at home
  assert.equal(TOY.unitOf({ city: 'alpha-cove~AA' }), ''); assert.equal(TOY.place({ city: 'alpha-cove~AA' }), null); assert.equal(TOY.where({ city: 'alpha-cove~AA' }), null);
  assert.equal(TOY.place(at(CV)).id, 'alpha-cove');
});

test('toy where(): a place wins, else the unit; units with art elsewhere are known but never opened', () => {
  assert.deepEqual(TOY.where(at(AC)), { id: 'alpha-city', name: 'Alpha City', unit: 'AA', unitName: 'Aland', kind: 'big' });
  assert.deepEqual(TOY.where(north(AC, 51)), { id: '', name: 'Aland', unit: 'AA', unitName: 'Aland', kind: '' });
  assert.deepEqual(TOY.where({ city: 'bravo-bay~BB' }), { id: '', name: 'Bland', unit: 'BB', unitName: 'Bland', kind: '' });
  assert.equal(TOY.unitOf(at(DP)), 'DD'); assert.equal(TOY.where(at(DP)), null, 'Dland has art elsewhere');
  assert.equal(R.animRegionWhere(at(DP)), null);
  const w = R.animRegionWhere(at(CP));
  assert.deepEqual(w, { region: 'toy', over: 'Toyland', id: 'charlie-port', name: 'Charlie Port', unit: 'CC', unitName: 'Cland', kind: 'big' });
  assert.equal(R.animRegionWhere({ lat: 0, lon: 0 }), null); assert.equal(R.animRegionWhere(null), null);
  assert.equal(R.animRegionWhere({ lat: 47.61, lon: -122.33 }).region, 'us', 'the other regions answer through the same call');
  assert.equal(R.animRegionWhere({ lat: 35.68, lon: 139.69 }).region, 'asia');
  assert.ok(R.animRegionOwns('toy', 'toy-north') && R.animRegionOwns('toy', 'toy') && !R.animRegionOwns('toy', 'toyland-x') && !R.animRegionOwns('toy', 'us-pacific'));
});

test('toy builder: items, ids, labels, tags, slots, priorities, full flags and when rules', () => {
  const N = R.animPack('toy-north'), S = R.animPack('toy-south');
  assert.deepEqual(N.items.map(i => i.id), ['aa-harbour', 'aa-gull', 'bb-lighthouse', 'bb-buoy', 'alpha-city-skyline', 'alpha-cove-boat']);
  assert.deepEqual(S.items.map(i => i.id), ['cc-signature', 'charlie-port-quay', 'cc-palm', 'charlie-camp-tent'], 'scenes first (sorted by key), then the hand-made items');
  const it = (id) => [...N.items, ...S.items].find(i => i.id === id);
  // a unit signature upgraded by its scene: full screen, the scene's art and label, the pack file's id, both tag lists
  const sig = it('aa-harbour');
  assert.deepEqual([sig.slot, sig.full, sig.toyKind, sig.toyIsland, sig.toySignature, sig.priority, sig.region, sig.country], ['opening', true, 'island', 'AA', true, 1, ['AA'], 'AA']);
  assert.equal(sig.label, 'Harbour at dawn, Aland'); assert.equal(sig.site, 'Aland harbour'); assert.equal(sig.colour, 'teal');
  assert.deepEqual(sig.tags, ['toy', 'toy-island', 'aland', 'aa', 'signature', 'own-tag', 'toy-scene']);
  assert.equal(sig.ref, 'toy-north/aa-harbour');
  assert.match(sig.svg({}), /x-usdrift/, 'a scene draws with the shared kit');
  // an element: the small symbol
  const el = it('aa-gull');
  assert.deepEqual([el.slot, el.full, el.toySignature, el.priority, el.mood, el.label], ['symbol', undefined, false, 1, 'cheerful', 'Gull on a post, Aland']);
  assert.deepEqual(el.tags, ['toy', 'toy-island', 'aland', 'aa', 'element']);
  // a signature with no scene stays the small opening item the pack file drew
  const lh = it('bb-lighthouse');
  assert.deepEqual([lh.slot, lh.full, lh.label, lh.colour, lh.toySignature], ['opening', undefined, 'Lighthouse, Bland', 'amber', true]);
  assert.equal(lh.svg({}), '<circle class="c x-pulse" cx="18" cy="32" r="8"/>');
  assert.equal(it('bb-buoy').slot, 'symbol');
  // a big place: an opening (upgraded by its scene); a small one: a symbol; both priority 1.2 and a place when rule
  const bigp = it('alpha-city-skyline');
  assert.deepEqual([bigp.slot, bigp.full, bigp.toyKind, bigp.toyIsland, bigp.toyPlace, bigp.toySize, bigp.priority, bigp.label], ['opening', true, 'city', 'AA', 'alpha-city', 'big', 1.2, 'Alpha City skyline, Alpha City']);
  assert.deepEqual(bigp.tags, ['toy', 'toy-city', 'alpha city', 'aa', 'big', 'toy-scene']);
  const smallp = it('alpha-cove-boat');
  assert.deepEqual([smallp.slot, smallp.full, smallp.toySize, smallp.priority, smallp.label, smallp.region], ['symbol', undefined, 'small', 1.2, 'Rowing boat, Alpha Cove', ['AA']]);
  assert.deepEqual(smallp.tags, ['toy', 'toy-city', 'alpha cove', 'aa', 'small']);
  // B.scenes(): every registered scene of the group becomes a full-screen opening (the id defaults to signature / skyline, a scene's own id wins)
  const sc = it('cc-signature'), quay = it('charlie-port-quay');
  assert.deepEqual([sc.slot, sc.full, sc.toyKind, sc.toyIsland, sc.toySignature, sc.priority, sc.label, sc.key], ['opening', true, 'island', 'CC', true, 1, 'Cland ridge, Cland', undefined]);
  assert.deepEqual(sc.tags, ['toy', 'toy-island', 'cland', 'cc', 'signature', 'toy-scene']);
  assert.deepEqual([quay.slot, quay.full, quay.toyKind, quay.toyPlace, quay.toySize, quay.priority, quay.label, quay.region], ['opening', true, 'city', 'charlie-port', 'big', 1.2, 'Charlie Port quay, Charlie Port', ['CC']]);
  assert.ok(!S.items.some(i => /^aa-|^alpha-/.test(i.id)), 'another group\'s scenes are left to its own pack');
  assert.deepEqual(it('charlie-camp-tent').slot, 'symbol');
  // the pack: the shared scene css, a version, the manifest fields
  assert.equal(N.css, R.animSceneCss()); assert.equal(N.version, '1.0.0'); assert.equal(S.name, 'Toy south');
  // every item is gated by a when() rule, and renders (live, still and full screen)
  for (const i of [...N.items, ...S.items]) {
    assert.equal(typeof i.when, 'function', i.ref);
    assert.ok(R.animItemHtml(i, { live: true, size: i.full ? 'fill' : 'lg' }).includes('<svg'), i.ref);
    assert.ok(R.animItemHtml(i, { reduced: true, size: 'lg' }).includes('<svg'), i.ref);
  }
});

test('toy items play only where the user is: when rules and the special picks', () => {
  const pick = (slot, ctx, look) => { const r = R.animSpecialPick(slot, day, look || {}, ctx); return r && r.ref; };
  assert.equal(pick('opening', at(AC)), 'toy-north/alpha-city-skyline', 'a big place beats its unit (1.2 over 1)');
  assert.equal(pick('symbol', at(AC)), 'toy-north/aa-gull', 'a big place has no symbol: the unit element plays');
  assert.equal(pick('symbol', north(CV, 20)), 'toy-north/alpha-cove-boat', 'a small place wins the symbol');
  assert.equal(pick('opening', north(CV, 20)), 'toy-north/aa-harbour', 'and the unit signature the opening');
  assert.equal(pick('opening', at(BB)), 'toy-north/bb-lighthouse'); assert.equal(pick('symbol', at(BB)), 'toy-north/bb-buoy');
  assert.equal(pick('opening', at(CP)), 'toy-south/charlie-port-quay'); assert.equal(pick('symbol', at(CP)), 'toy-south/cc-palm');
  assert.equal(pick('opening', at(CC)), 'toy-south/cc-signature'); assert.equal(pick('symbol', at(CC)), 'toy-south/charlie-camp-tent');
  assert.equal(pick('opening', { city: 'alpha-city~AA' }), 'toy-north/alpha-city-skyline', 'travel');
  assert.equal(pick('opening', { city: 'alpha-cove~AA' }), null, 'a travel city the world pack owns');
  assert.equal(pick('opening', at(DP)), null, 'Dland has no items here'); assert.equal(pick('symbol', at(DP)), null);
  assert.equal(pick('opening', { lat: 0, lon: 0 }), null); assert.equal(pick('opening', {}), null);
  assert.equal(pick('opening', at(AC), { packsOff: ['toy-north'] }), null, 'switched off: nothing');
  assert.equal(pick('opening', at(AC), { block: ['toy-north/alpha-city-skyline'] }), 'toy-north/aa-harbour', 'a blocked item falls back to the unit');
  for (let i = 0; i < 40; i++) {
    const d = `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`;
    for (const slot of ['opening', 'symbol']) {
      const it = R.animDailyPick(slot, d, {}, { lat: 51.5, lon: -0.12 });
      assert.ok(!it || !/^toy-/.test(it.pack), `${d} ${slot}: no toy item away from Toyland`);
    }
  }
});

test('builder rules: a unit or place of another group, a bad group, a bad kind, a missing id', () => {
  const N = TOY.builder('north'), icon = () => '<circle class="c x-pulse" cx="32" cy="32" r="8"/>';
  assert.throws(() => N.unit('CC', 'element', { id: 'x', label: 'X', svg: icon }), /toy pack north: CC is not a north island/);
  assert.throws(() => N.unit('ZZ', 'element', { id: 'x', label: 'X', svg: icon }), /ZZ is not a north island/);
  assert.throws(() => N.unit('AA', 'sig', { id: 'x', label: 'X', svg: icon }), /toy pack: kind sig/);
  assert.throws(() => N.unit('AA', 'element', { label: 'X' }), /AA element needs an id/);
  assert.throws(() => N.place('charlie-port', { id: 'x', label: 'X', svg: icon }), /charlie-port belongs to another group/);
  assert.throws(() => N.place('bravo-bay', { id: 'x', label: 'X', svg: icon }), /bravo-bay is not an art place/, 'an anchor row has no art');
  assert.throws(() => N.place('nowhere', { id: 'x', label: 'X', svg: icon }), /nowhere is not an art place/);
  assert.throws(() => TOY.builder('west'), /no group "west" \(groups: north, south\)/);
  assert.equal(N.items.length, 0, 'nothing is added by a failed call');
});

test('scenes registered before their region is defined are kept (a "-scenes-" file sorts before its config)', () => {
  const L = load(false), icon = () => '<circle class="c x-pulse" cx="32" cy="32" r="8"/>';
  L.animRegionSceneAdd('late', { key: 'zone:LL', label: 'Late zone', site: 'A late zone', colour: 'teal', mood: 'calm', svg: icon });
  L.animRegionSceneAdd('late', { key: 'unit:MM', label: 'Another zone', site: 'Another zone', colour: 'teal', mood: 'calm', svg: icon });
  assert.equal(L.animRegion('late'), null);
  const late = L.animRegionDefine({ id: 'late', unitWord: 'zone', unitKm: 50, units: { LL: ['Lland', 'g'], MM: ['Mland', 'g'] },
    places: [['l-town', 'L Town', 'LL', 10, 10, 'big'], ['m-town', 'M Town', 'MM', 12, 12, '']] });
  assert.deepEqual(Object.keys(late.scenes), ['zone:LL', 'unit:MM']);
  assert.deepEqual(late.check(), []);
  const B = late.builder('g');
  B.unit('LL', 'signature', { id: 'a', label: 'A', svg: icon });
  B.unit('MM', 'signature', { id: 'b', label: 'B', svg: icon });   // the 'unit:' prefix works for any region
  assert.deepEqual(B.items.map(i => [i.id, i.full]), [['ll-a', true], ['mm-b', true]]);
  assert.deepEqual(B.items[0].tags.slice(0, 3), ['late', 'late-zone', 'lland']);
  assert.equal(late.scenes, L.animRegion('late').scenes);
  assert.throws(() => L.animRegionSceneAdd('late', { label: 'no key' }), /key/);
  assert.throws(() => L.animRegionSceneAdd('late', { key: 'nocolon' }), /key/);
  assert.throws(() => L.animRegionSceneAdd('late', { key: 'a:b:c' }), /key/);
  assert.throws(() => late.sceneAdd(null), /key/);
});

test('animRegionDefine refuses a config that cannot work, and check() lists the mistakes in the tables', () => {
  const L = load(false);
  const ok = { id: 'okay', unitKm: 100, units: { AA: ['A', 'g'] }, places: [['a-town', 'A Town', 'AA', 1, 1, 'big']] };
  assert.throws(() => L.animRegionDefine(), /config object/); assert.throws(() => L.animRegionDefine(null), /config object/);
  assert.throws(() => L.animRegionDefine({ ...ok, id: 'Bad Id' }), /id: lower-case/); assert.throws(() => L.animRegionDefine({ ...ok, id: '' }), /id: lower-case/);
  for (const id of ['uk', 'texas', 'world', 'core']) assert.throws(() => L.animRegionDefine({ ...ok, id }), /belongs to another pack family/, id);
  assert.throws(() => L.animRegionDefine({ ...ok, unitWord: 'place' }), /unitWord/); assert.throws(() => L.animRegionDefine({ ...ok, unitWord: 'Two Words' }), /unitWord/);
  assert.throws(() => L.animRegionDefine({ ...ok, units: null }), /units/); assert.throws(() => L.animRegionDefine({ ...ok, units: [] }), /units/);
  assert.throws(() => L.animRegionDefine({ ...ok, places: {} }), /places/);
  assert.throws(() => L.animRegionDefine({ ...ok, unitKm: 0 }), /unitKm/); assert.throws(() => L.animRegionDefine({ ...ok, unitKm: undefined }), /unitKm/);
  assert.throws(() => L.animRegionDefine({ ...ok, keys: { unit: 'id' } }), /keys/); assert.throws(() => L.animRegionDefine({ ...ok, keys: { unit: 'x', unitName: 'x' } }), /keys/);
  assert.equal(L.animRegionDefine(ok).id, 'okay');
  assert.throws(() => L.animRegionDefine(ok), /already defined/);
  const broken = L.animRegionDefine({ id: 'broken', unitKm: 100, units: { AA: ['A', 'g'], BB: ['B', 'g'], CC: 'x' }, elsewhere: ['QQ'], worldTravel: ['ghost-broken'],
    places: [['a1', 'A1', 'AA', 10, 10, 'big'], ['a1', 'Dup', 'AA', 10, 10, ''], ['x1', 'X1', 'ZZ', 10, 10, ''], ['far', 'Far', 'AA', 95, 10, ''], ['kind', 'Kind', 'AA', 10, 10, 'huge'],
      ['Bad Id', 'Bad', 'AA', 10, 10, ''], ['noname', '', 'AA', 10, 10, ''], ['short', 'Short'], ['sea', 'Sea', 'AA', 10, 200, '']] });
  L.animRegionSceneAdd('broken', { key: 'planet:AA', label: 'x', svg: () => '' }); L.animRegionSceneAdd('broken', { key: 'place:a1', label: 'x', svg: () => '' });
  L.animRegionSceneAdd('broken', { key: 'unit:QQ', label: 'x', svg: () => '' }); L.animRegionSceneAdd('broken', { key: 'place:far', label: 'x', svg: () => '' });
  assert.doesNotThrow(() => broken.where({ lat: 10, lon: 10 }), 'a malformed row is skipped by the lookups, never a crash');
  assert.equal(broken.unitOf({ lat: 10, lon: 10 }), 'AA');
  const problems = broken.check();
  for (const re of [/a1: duplicate id/, /x1: ZZ is not in units/, /far: lat \/ lon out of range/, /sea: lat \/ lon out of range/, /kind: kind is big, small or ""/, /Bad Id: the id is lower-case/, /noname: no name/, /a place row needs/,
    /BB: no place row/, /CC: no place row/, /CC: a unit is \[name, group\]/, /elsewhere QQ is not in units/, /worldTravel ghost-broken: no place has that travel id/, /a1: travel id a1-broken is also a1/,
    /planet:AA: a scene key starts with/, /unit:QQ: not a unit/, /place:far: a scene is for a big place/]) assert.ok(problems.some(p => re.test(p)), String(re) + '\n' + problems.join('\n'));
  assert.ok(!problems.some(p => /place:a1/.test(p)), 'a scene for a big place is fine');
});

test('place kinds a pack file may build: the default is every art place, a region can limit it (Asia: only small ones)', () => {
  const L = load(false), icon = () => '<circle class="c x-pulse" cx="32" cy="32" r="8"/>';
  const cfg = { unitKm: 100, units: { AA: ['A', 'g'] }, places: [['big-one', 'Big One', 'AA', 1, 1, 'big'], ['small-one', 'Small One', 'AA', 1, 2, 'small'], ['anchor', 'Anchor', 'AA', 1, 3, '']] };
  const free = L.animRegionDefine({ id: 'free', ...cfg }).builder('g'), strict = L.animRegionDefine({ id: 'strict', placeKinds: ['small'], ...cfg }).builder('g');
  free.place('big-one', { id: 'x', label: 'X', svg: icon }); free.place('small-one', { id: 'y', label: 'Y', svg: icon });
  assert.deepEqual(free.items.map(i => i.slot), ['opening', 'symbol']);
  strict.place('small-one', { id: 'y', label: 'Y', svg: icon });
  assert.throws(() => strict.place('big-one', { id: 'x', label: 'X', svg: icon }), /strict pack: big-one is not a small art place/);
  assert.throws(() => strict.place('anchor', { id: 'x', label: 'X', svg: icon }), /anchor is not a small art place/);
});

test('hooks: a pseudo unit is one fixed place in any lookup, units can carry a constant country and extra item fields', () => {
  const L = load(false), icon = () => '<circle class="c x-pulse" cx="32" cy="32" r="8"/>';
  const hk = L.animRegionDefine({ id: 'hook', unitWord: 'state', unitKm: 100, keys: { unit: 'st', unitName: 'stName' }, fields: { unit: 'hookSt' }, tags: { root: 'hooks' }, country: 'ZZ', extra: (u) => ({ st: u }),
    pseudo: { PP: { id: 'capital', name: 'The Capital', kind: 'big', group: 'g' } }, units: { AA: ['A', 'g'], BB: ['B', 'h'] },
    places: [['a-town', 'A Town', 'AA', 10, 10, 'small'], ['capital', 'The Capital', 'PP', 12, 12, 'big'], ['b-town', 'B Town', 'BB', 20, 20, '']] });
  assert.deepEqual(hk.check(), []);
  assert.deepEqual(hk.where({ lat: 12, lon: 12 }), { id: 'capital', name: 'The Capital', st: 'PP', stName: 'The Capital', kind: 'big' }, 'a pseudo unit always answers with its one fixed place');
  assert.deepEqual(hk.where({ lat: 10, lon: 10 }), { stName: 'A', id: 'a-town', name: 'A Town', st: 'AA', kind: 'small' });
  const B = hk.builder('g');
  B.place('capital', { id: 'dome', label: 'Dome', svg: icon }); B.place('a-town', { id: 'hut', label: 'Hut', svg: icon });
  assert.throws(() => hk.builder('h').place('capital', { id: 'x', label: 'X', svg: icon }), /belongs to another group/, 'a pseudo unit with a group stays in it');
  const [cap, hut] = B.items;
  assert.deepEqual([cap.hookSt, cap.st, cap.region, cap.country, cap.slot], ['PP', 'PP', ['ZZ'], 'ZZ', 'opening']);
  assert.deepEqual(hut.tags, ['hooks', 'hook-city', 'a town', 'aa', 'small']);
  assert.deepEqual(B.items.map(i => i.when({}, { lat: 12, lon: 12 })), [true, false]);
});

test('the opening sequence has ONE generic branch: a toy region reaches it, a festival still wins, outside nothing', () => {
  const run = ({ dayStr = day, pos }) => {
    const timers = [], attributes = {}, stored = new Map(); let gone = false;
    const element = () => ({ isConnected: true, innerHTML: '', children: [], className: '', classList: { add() {}, contains() { return false; } }, style: { setProperty() {} },
      setAttribute(k, v) { attributes[k] = v; }, appendChild(el) { this.children.push(el); }, remove() { this.isConnected = false; }, addEventListener() {} });
    const splash = element();
    const ctx = vm.createContext({
      console, setTimeout: fn => { timers.push(fn); }, setInterval() {}, addEventListener() {}, removeEventListener() {}, performance: { now: () => 0 },
      localStorage: { getItem: k => stored.get(k), setItem: (k, v) => stored.set(k, v) },
      document: { hidden: false, readyState: 'loading', addEventListener() {}, getElementById: () => splash, createElement: element, querySelector: () => null, documentElement: { classList: { contains: () => false } }, body: element() },
      window: { addEventListener() {}, __odOpening: { hold: true, gone: () => gone, out: () => { gone = true; }, t0: () => 0 } },
      APP_CONFIG: { onboardedAt: 'synthetic', location: pos }, _serverAvailable: false, todayStr: () => dayStr, _agLevel: () => 'standard',
      animEnabled: () => true, animLook: () => ({ opening: 'daily', block: [], packsOff: [] }), esc: s => String(s),
      animUkWhere: () => null, _AUK_KEY: 'synthetic-county',
    });
    for (const f of ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-uk-counties.js', '71-anim-0region.js', '72-anim-pack-seasons.js']) vm.runInContext(src(f), ctx);
    vm.runInContext(TOY_SRC, ctx);
    vm.runInContext("function animToday(slot) { return animDailyPick(slot, todayStr(), animLook(), animCtx()); }", ctx);
    vm.runInContext(src('78-anim-wire.js'), ctx);
    assert.equal(vm.runInContext('animOpeningSequence()', ctx), true);
    timers.shift()();   // the brand ends: the rest is decided
    return { html: splash.children[0] ? splash.children[0].innerHTML : '', attributes };
  };
  const place = run({ pos: at(AC) });
  assert.match(place.html, /od-seq-over">Welcome to</); assert.match(place.html, /od-seq-place">Alpha City</);
  assert.match(place.html, /od-seq-origin">The Alpha City waterfront</, 'a full scene names its site');
  assert.equal(place.attributes['data-od-scene'], 'toy-north/alpha-city-skyline');
  const unit = run({ pos: at(BB) });
  assert.match(unit.html, /od-seq-place">Bland</); assert.match(unit.html, /od-seq-origin">Toyland · Lighthouse, Bland</, 'a small item is captioned with the region\'s "over"');
  assert.equal(unit.attributes['data-od-scene'], 'toy-north/bb-lighthouse');
  const elsewhere = run({ pos: at(DP) });
  assert.match(elsewhere.html, /Welcome back/); assert.doesNotMatch(elsewhere.html, /Toyland/);
  const away = run({ pos: { lat: 51.5, lon: -0.12 } });
  assert.match(away.html, /Welcome back/); assert.ok(!/^toy-/.test(away.attributes['data-od-scene']));
  const xmas = run({ dayStr: '2026-12-25', pos: at(AC) });
  assert.doesNotMatch(xmas.html, /Welcome to/, 'a festival (priority 2+) wins the day: the pick is not the region\'s, so there is no regional welcome');
  assert.match(xmas.attributes['data-od-scene'], /^seasons\//);
  assert.equal((src('78-anim-wire.js').match(/animRegionWhere\(/g) || []).length, 1, 'one generic branch');
  assert.ok(!/usWhere|asiaWhere/.test(src('78-anim-wire.js').replace(/\/\/.*$/gm, '')), 'no per-region branches left in the wiring');
});

test('the US and Asia are regions too: defined by config, every public name kept', () => {
  const us = R.animRegion('us'), asia = R.animRegion('asia');
  assert.deepEqual(us.check(), []); assert.deepEqual(asia.check(), []);
  assert.deepEqual([us.unitWord, us.over, us.keys.unit, us.fields.unit, us.tags.root], ['state', 'USA', 'state', 'usState', 'usa']);
  assert.deepEqual([asia.unitWord, asia.over, asia.keys.unit, asia.fields.unit, asia.tags.root], ['country', 'Asia', 'cc', 'asiaCc', 'asia']);
  assert.equal(us.places, R.US_PLACES); assert.equal(us.units, R.US_STATES); assert.equal(asia.places, R.ASIA_PLACES); assert.equal(asia.units, R.ASIA_COUNTRIES);
  assert.equal(R.US_SCENES, us.scenes); assert.equal(R.ASIA_SCENES, asia.scenes);
  assert.equal(Object.keys(R.US_SCENES).length, 88); assert.ok(Object.keys(R.ASIA_SCENES).length > 100);
  // the old names answer exactly like the region
  const SEA = { lat: 47.61, lon: -122.33 }, DC = { lat: 38.91, lon: -77.04 }, TX = { lat: 29.76, lon: -95.37 }, TOKYO = { lat: 35.68, lon: 139.69 };
  assert.deepEqual(R.usWhere(SEA), { stateName: 'Washington', id: 'seattle', name: 'Seattle', state: 'WA', kind: 'big' });
  assert.deepEqual(R.usWhere(DC), { id: 'washington', name: 'Washington, DC', state: 'DC', stateName: 'Washington, DC', kind: 'big' }, 'DC is a pseudo unit');
  assert.equal(R.usStateOf(TX), 'TX'); assert.equal(R.usWhere(TX), null, 'Texas has its own pack');
  assert.equal(R.usPlace({ city: 'new-york-us' }), null); assert.equal(R.usStateOf({ city: 'new-york-us' }), '', 'a trip to New York is the world pack\'s');
  assert.equal(R.usPlace({ city: 'denver-us' }).id, 'denver', 'the default travel id is <place id>-<region id>');
  assert.deepEqual(R.asiaWhere(TOKYO), { countryName: 'Japan', id: 'tokyo', name: 'Tokyo', cc: 'JP', kind: 'big' });
  for (const c of ['tokyo-jp', 'dubai-ae', 'singapore-sg']) assert.equal(R.asiaCountryOf({ city: c }), '', c);
  assert.equal(R.asiaPlace({ city: 'seoul-kr' }).id, 'seoul', 'Asia\'s travel id is <place id>-<country code>');
  assert.equal(R.animRegionWhere(DC).over, 'USA'); assert.equal(R.animRegionWhere(TX), null);
  // builders: the US one has state(), the Asia one scenes() and element()
  const ub = R.usBuilder('northeast'), ab = R.asiaBuilder('east');
  for (const k of ['items', 'state', 'place', 'pack']) assert.ok(k in ub, 'usBuilder.' + k);
  for (const k of ['items', 'scenes', 'element', 'place', 'pack']) assert.ok(k in ab, 'asiaBuilder.' + k);
  assert.throws(() => ub.state('CA', 'signature', { id: 'x', label: 'X' }), /us pack northeast: CA is not a northeast state/);
  assert.throws(() => ab.element('FR', { id: 'x', label: 'X' }), /asia pack east: FR is not a east country/);
  assert.throws(() => ab.place('tokyo', { id: 'x', label: 'X' }), /asia pack: tokyo is not a small art place/);
  // the shared kit: the old names are aliases of the framework's
  assert.equal(R.usSceneCss(), R.animSceneCss()); assert.match(R.animSceneCss(), /x-usdrift/); assert.match(R.animSceneCss(), /\.us-tint/);
  const k1 = R.usSceneKit(), k2 = R.animSceneKit();
  assert.deepEqual(Object.keys(k1), Object.keys(k2)); assert.equal(k1.U(), 'us1'); assert.equal(k2.U(), 'us1');
  assert.equal(k1.sun(800, 300, 40, '#fff', '#fe9'), k2.sun(800, 300, 40, '#fff', '#fe9'), 'the same drawing from either name');
  // the full-screen upgrade is the one the packs already had: a US state signature is a scene, Asia's scenes became items
  const ny = R.animItem('us-northeast/ny-statue');
  assert.deepEqual([ny.full, ny.usKind, ny.usState, ny.usSignature, ny.slot, ny.priority, ny.region, ny.country, ny.state], [true, 'state', 'NY', true, 'opening', 1, ['US'], 'US', 'NY']);
  assert.ok(ny.tags.slice(0, 5).join() === 'usa,us-state,new york,ny,signature');
  assert.ok(R.animItems({ slot: 'opening' }).filter(i => i.asiaKind === 'country').every(i => i.full && i.asiaSignature && i.key === undefined), 'Asia\'s country signatures are the registered scenes');
});
