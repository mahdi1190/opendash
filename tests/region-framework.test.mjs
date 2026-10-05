// The generic region framework (src/app/71-anim-0region.js): a region is a CONFIG of data tables, not code.
// A TOY region (2 groups, 4 units, 6 places, a travel mapping, a skip list, scenes) is defined through the framework
// exactly as a real region's config file would be, and everything the US and Asia need is proved on it: the lookups
// (nearest row, place radius, travel, outside = empty), the builder (items, ids, labels, tags, slots, priorities,
// full flags, when rules), the scene upgrade and the scene items, animRegionWhere and the opening sequence's one
// generic branch. Then the US and Asia, defined the same way, keep every public name. Rules that hold for EVERY region
// (ANIM_REGIONS: sound tables, no region claims another's rows, packs named <id>-*, the world pack's cities, the travel
// ids) are loops over the registry, so a new region is gated without copying a test. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { animRegistryFiles, regionSourceFiles, packSourceFiles, ANIM_BASE_FILES, REGION_FILE_RE } from '../tools/lib/anim-sources.mjs';
import { concatDir } from '../build.mjs';
import { RESERVED_UNIT_WORDS } from '../tools/lib/anim-region.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const BODY = animRegistryFiles(APP).map(src).join('\n;\n');   // the animation files in the order the build concatenates them
const NAMES = ['ANIM_REGIONS', 'animRegion', 'animRegionDefine', 'animRegionWhere', 'animRegionsWhere', 'animRegionOwns', 'animRegionSceneAdd', 'animSceneKit', 'animSceneCss',
  'animRegisterPack', 'animPack', 'animPacks', 'animItem', 'animItems', 'animItemHtml', 'animSpecialPick', 'animDailyPick',
  'usPlace', 'usStateOf', 'usWhere', 'usBuilder', 'usSceneAdd', 'usSceneKit', 'usSceneCss', 'US_SCENES', 'US_STATES', 'US_PLACES',
  'asiaPlace', 'asiaCountryOf', 'asiaWhere', 'asiaBuilder', 'asiaSceneAdd', 'ASIA_SCENES', 'ASIA_COUNTRIES', 'ASIA_PLACES',
  'US_STATE_KM', 'US_PLACE_KM', 'ASIA_COUNTRY_KM', 'ASIA_PLACE_KM'];

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
_toyScene('place:charlie-port', { id: 'quay', label: 'Charlie Port quay', site: 'The old quay' });   // registered out of key order: B.scenes() sorts
_toyScene('island:AA', { label: 'Harbour at dawn', site: 'Aland harbour' });
_toyScene('place:alpha-city', { label: 'Alpha City skyline', site: 'The Alpha City waterfront' });
_toyScene('island:CC', { label: 'Cland ridge', site: 'The Cland ridge' });
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
const nonStarter = (list) => list.filter(m => !/^starter:/.test(m));   // the scaffold's placeholder country is starter data: the coverage tests own it
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
  assert.deepEqual(R.ANIM_REGIONS.map(r => r.id).filter(id => ['asia', 'us', 'toy'].includes(id)), ['asia', 'us', 'toy'], 'the two first regions and the toy one, in definition order (a region added since sits among them: that is fine)');
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
  assert.deepEqual(w, { region: 'toy', over: 'Toyland', km: 0, id: 'charlie-port', name: 'Charlie Port', unit: 'CC', unitName: 'Cland', kind: 'big' }, 'km: the distance to the nearest row');
  assert.deepEqual(TOY.locate(at(CP)), { km: 0, where: TOY.where(at(CP)) });
  assert.equal(TOY.locate(north(CP, 10)).km.toFixed(3), '10.000'); assert.equal(TOY.locate({ city: 'charlie-port~CC' }).km, 0, 'a travel match is 0 km');
  assert.deepEqual(TOY.locate(at(DP)), { km: 0, where: null }, 'a unit with art elsewhere still claims the position (locate), but opens nothing (where)');
  assert.equal(TOY.locate({ lat: 0, lon: 0 }), null);
  assert.equal(R.animRegionWhere({ lat: 0, lon: 0 }), null); assert.equal(R.animRegionWhere(null), null);
  assert.equal(R.animRegionWhere({ lat: 47.61, lon: -122.33 }).region, 'us', 'the other regions answer through the same call');
  assert.equal(R.animRegionWhere({ lat: 35.68, lon: 139.69 }).region, 'asia');
  assert.ok(R.animRegionOwns('toy', 'toy-north') && R.animRegionOwns('toy', 'toy') && !R.animRegionOwns('toy', 'toyland-x') && !R.animRegionOwns('toy', 'us-pacific'));
});

test('toy builder: items, ids, labels, tags, slots, priorities, full flags and when rules', () => {
  const N = R.animPack('toy-north'), S = R.animPack('toy-south');
  assert.deepEqual(N.items.map(i => i.id), ['aa-harbour', 'aa-gull', 'bb-lighthouse', 'bb-buoy', 'alpha-city-skyline', 'alpha-cove-boat']);
  assert.deepEqual(S.items.map(i => i.id), ['cc-signature', 'charlie-port-quay', 'cc-palm', 'charlie-camp-tent'], 'scenes first (sorted by key: island:CC before place:charlie-port, though registered the other way round), then the hand-made items');
  assert.deepEqual(Object.keys(TOY.scenes).slice(0, 2), ['place:charlie-port', 'island:AA'], 'the registry keeps the registration order; only the builder sorts');
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
    /BB: no place row/, /CC: no place row/, /CC: a unit is \[name, group\]/, /elsewhere QQ is not in units/, /worldTravel ghost-broken: no place has that travel id/, /a1: travel id a1-aa is also a1/,
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

/** Run the real animOpeningSequence() (78-anim-wire.js) in a vm with `extraSrc` (a region's config and packs) loaded after the framework. */
function openingRun({ dayStr = day, pos, extraSrc = TOY_SRC, block = [] }) {
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
    animEnabled: () => true, animLook: () => ({ opening: 'daily', block, packsOff: [] }), esc: s => String(s),
    animUkWhere: () => null, _AUK_KEY: 'synthetic-county',
  });
  for (const f of ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-uk-counties.js', '71-anim-0region.js', '72-anim-pack-seasons.js']) vm.runInContext(src(f), ctx);
  vm.runInContext(extraSrc, ctx);
  vm.runInContext("function animToday(slot) { return animDailyPick(slot, todayStr(), animLook(), animCtx()); }", ctx);
  vm.runInContext(src('78-anim-wire.js'), ctx);
  assert.equal(vm.runInContext('animOpeningSequence()', ctx), true);
  timers.shift()();   // the brand ends: the rest is decided
  return { html: splash.children[0] ? splash.children[0].innerHTML : '', attributes };
}

test('the opening sequence has ONE generic branch: a toy region reaches it, a festival still wins, outside nothing', () => {
  const run = (o) => openingRun(o);
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
  const wire = src('78-anim-wire.js').replace(/\/\/.*$/gm, '');
  assert.match(wire, /animRegionsWhere\(animCtx\(\)\)/, 'the wiring asks the one generic lookup');
  assert.ok(!/usWhere|asiaWhere/.test(wire), 'no per-region branches left in the wiring');
});

/* Two regions whose reaches overlap, as the opening sees them. 'aaa' has one row 150 km north of the user (reach 190 km),
   'bbb' a big city exactly at the user (reach 100 km): bbb's art plays and the welcome must name bbb, not the region that
   happens to sort first by name. */
const U = { lat: -30, lon: -10 };
const OVERLAP_SRC = `
const _ovIcon = (x) => () => '<circle class="c x-pulse" cx="' + x + '" cy="32" r="8"/>';
const AAA = animRegionDefine({ id: 'aaa', name: 'Aaa land', over: 'Aaa', unitWord: 'zone', unitKm: 190, units: { AA: ['Aland', 'g'] },
  places: [['a-row', 'A Row', 'AA', ${U.lat} + 150 / ${KM}, ${U.lon}, '']] });
const BBB = animRegionDefine({ id: 'bbb', name: 'Bbb land', over: 'Bbb', unitWord: 'zone', unitKm: 100, units: { BB: ['Bland', 'g'] },
  places: [['b-city', 'B City', 'BB', ${U.lat}, ${U.lon}, 'big']] });
(function () { const B = AAA.builder('g'); B.unit('AA', 'signature', { id: 'sig', label: 'A signature', colour: 'blue', svg: _ovIcon(10) });
  animRegisterPack(B.pack({ id: 'aaa-g', name: 'Aaa', description: 'Overlap test.' })); })();
(function () { const B = BBB.builder('g'); B.place('b-city', { id: 'sky', label: 'B skyline', colour: 'amber', svg: _ovIcon(20) });
  animRegisterPack(B.pack({ id: 'bbb-g', name: 'Bbb', description: 'Overlap test.' })); })();
`;

test('overlapping regions: the welcome names the region that owns the picked opening, found among every matching region', () => {
  const nearer = openingRun({ pos: U, extraSrc: OVERLAP_SRC });
  assert.match(nearer.html, /od-seq-over">Welcome to</, 'bbb is not the first region by name, yet its opening still gets the regional welcome');
  assert.match(nearer.html, /od-seq-place">B City</); assert.equal(nearer.attributes['data-od-scene'], 'bbb-g/b-city-sky');
  // the city item blocked: aaa's signature is the pick, and the welcome names aaa's match
  const farther = openingRun({ pos: U, extraSrc: OVERLAP_SRC, block: ['bbb-g/b-city-sky'] });
  assert.equal(farther.attributes['data-od-scene'], 'aaa-g/aa-sig');
  assert.match(farther.html, /od-seq-over">Welcome to</); assert.match(farther.html, /od-seq-place">Aland</); assert.match(farther.html, /Aaa · A signature, Aland/);
});

test('the US and Asia are regions too: defined by config, every public name kept', () => {
  const us = R.animRegion('us'), asia = R.animRegion('asia');
  assert.deepEqual(us.check(), []); assert.deepEqual(asia.check(), []);
  assert.deepEqual([us.unitWord, us.over, us.keys.unit, us.fields.unit, us.tags.root], ['state', 'USA', 'state', 'usState', 'usa']);
  assert.deepEqual([asia.unitWord, asia.over, asia.keys.unit, asia.fields.unit, asia.tags.root], ['country', 'Asia', 'cc', 'asiaCc', 'asia']);
  assert.equal(us.places, R.US_PLACES); assert.equal(us.units, R.US_STATES); assert.equal(asia.places, R.ASIA_PLACES); assert.equal(asia.units, R.ASIA_COUNTRIES);
  assert.equal(R.US_SCENES, us.scenes); assert.equal(R.ASIA_SCENES, asia.scenes);
  for (const r of [us, asia]) {   // every unit that opens and every big place has its full-screen scene: a count derived from the tables, never a literal
    const opens = Object.keys(r.units).filter(u => !r.elsewhere.includes(u)).length, bigs = r.places.filter(p => p[5] === 'big').length;
    assert.ok(opens > 0 && bigs > 0);
    assert.equal(Object.keys(r.scenes).length, opens + bigs, `${r.id}: a scene per unit that opens (${opens}) and per big place (${bigs})`);
  }
  // the old names answer exactly like the region
  const SEA = { lat: 47.61, lon: -122.33 }, DC = { lat: 38.91, lon: -77.04 }, TX = { lat: 29.76, lon: -95.37 }, TOKYO = { lat: 35.68, lon: 139.69 };
  assert.deepEqual(R.usWhere(SEA), { stateName: 'Washington', id: 'seattle', name: 'Seattle', state: 'WA', kind: 'big' });
  assert.deepEqual(R.usWhere(DC), { id: 'washington', name: 'Washington, DC', state: 'DC', stateName: 'Washington, DC', kind: 'big' }, 'DC is a pseudo unit');
  assert.equal(R.usStateOf(TX), 'TX'); assert.equal(R.usWhere(TX), null, 'Texas has its own pack');
  assert.equal(R.usPlace({ city: 'new-york-us' }), null); assert.equal(R.usStateOf({ city: 'new-york-us' }), '', 'a trip to New York is the world pack\'s');
  assert.equal(R.usPlace({ city: 'denver-us' }).id, 'denver', 'the default travel id is <place id>-<country code>');
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

/* ---------- build order ---------- */
const byName = (a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
/** Evaluate the animation files in the build's order (sorted by name, joined byte for byte as build.mjs joins them), with `virtual` {name: text} files sorted in among them. */
const evalBuildOrder = (virtual = {}) => {
  const all = [...animRegistryFiles(APP).map(f => [f, src(f)]), ...Object.entries(virtual)].sort(byName);
  return new Function(`"use strict";\n${all.map(x => x[1]).join('')}\nreturn { ANIM_REGIONS, animRegion };`)();
};

test('build order: animRegistryFiles() lists the animation files exactly as build.mjs concatenates them', () => {
  const build = concatDir(APP, '.js').files, files = animRegistryFiles(APP);
  assert.deepEqual(files, build.filter(f => files.includes(f)), 'the same relative order as the build (one sorted list, not a hand-made one)');
  for (const f of [...ANIM_BASE_FILES, ...regionSourceFiles(APP), ...packSourceFiles(APP)]) assert.ok(files.includes(f), f);
  assert.deepEqual(animRegistryFiles(APP, ['71-anim-sanitize.js', '69-travel-data.js']).filter(f => /sanitize|travel-data/.test(f)), ['69-travel-data.js', '71-anim-sanitize.js'], 'extra files are sorted into place');
  // where the region files land (the rule the docs give): the framework first; asia* and region-* BEFORE the registry; us* after it
  assert.deepEqual(['71-anim-registry.js', '71-anim-library.js', '71-anim-0region.js', '71-anim-asia.js', '71-anim-region-x.js', '71-anim-region-x-scenes-1.js', '71-anim-us.js', '71-anim-almanac.js'].sort(),
    ['71-anim-0region.js', '71-anim-almanac.js', '71-anim-asia.js', '71-anim-library.js', '71-anim-region-x-scenes-1.js', '71-anim-region-x.js', '71-anim-registry.js', '71-anim-us.js']);
});

test('the animation files evaluate in build order: a config that touches a registry const at load fails here as it fails the app', () => {
  assert.deepEqual(evalBuildOrder().ANIM_REGIONS.map(r => r.id).filter(id => ['asia', 'us'].includes(id)), ['asia', 'us'], 'a region added since is loaded too: only the first two are pinned');
  // a new region's config (71-anim-region-*) and an Asia-style file (71-anim-asia*) both load BEFORE the registry: its consts are in the dead zone
  assert.throws(() => evalBuildOrder({ '71-anim-region-zzbo.js': 'const _x = Object.keys(ANIM_SLOTS);\n' }), /ANIM_SLOTS|before initialization/);
  assert.throws(() => evalBuildOrder({ '71-anim-asia-zzbo.js': 'const _y = ANIM_SLOT_IDS.length;\n' }), ReferenceError);
  // every file shares one scope: scene files without an IIFE clash, with one they load (scenes first, then the config: '-' sorts before '.')
  const scene = (key, code, wrap) => (wrap ? '(function () { ' : '') + `const K = animSceneKit(); animRegionSceneAdd('zzbo', { key: '${key}', label: 'x', svg: () => K.full('#fff') });` + (wrap ? ' })();' : '') + '\n';
  assert.throws(() => evalBuildOrder({ '71-anim-region-zzbo-scenes-1.js': scene('unit:ZA'), '71-anim-region-zzbo-scenes-2.js': scene('unit:ZB') }), /already been declared/);
  const L = evalBuildOrder({
    '71-anim-region-zzbo-scenes-1.js': scene('unit:ZA', 0, true), '71-anim-region-zzbo-scenes-2.js': scene('unit:ZB', 0, true),
    '71-anim-region-zzbo.js': "const ZZBO = animRegionDefine({ id: 'zzbo', unitKm: 50, units: { ZA: ['Za', 'g'], ZB: ['Zb', 'g'] }, places: [['za', 'Za', 'ZA', 0, 0, ''], ['zb', 'Zb', 'ZB', 0, 2, '']] });\n",
  });
  assert.deepEqual(Object.keys(L.animRegion('zzbo').scenes), ['unit:ZA', 'unit:ZB']); assert.deepEqual(L.animRegion('zzbo').check(), []);
});

/* ---------- overlapping regions ---------- */
const KMN = (pt, km) => ({ lat: pt.lat + km / KM, lon: pt.lon });   // km due north
const zone = (id, units, places, extra) => ({ id, unitWord: 'zone', unitKm: 190, units: Object.fromEntries(units.map(u => [u, [u + 'land', 'g']])), places, ...extra });
const cfgA = zone('aaa', ['AA'], [['a-row', 'A Row', 'AA', U.lat + 150 / KM, U.lon, '']]);                 // one row 150 km north of the user, reach 190 km
const cfgB = zone('bbb', ['BB'], [['b-city', 'B City', 'BB', U.lat, U.lon, 'big']], { unitKm: 100 });       // a big city exactly at the user, reach 100 km

test('overlapping regions: the nearest row wins whatever the definition order, ties go to the region defined first', () => {
  for (const order of [[cfgA, cfgB], [cfgB, cfgA]]) {
    const L = load(false); order.forEach(c => L.animRegionDefine(c));
    const tag = order.map(c => c.id).join(',');
    assert.deepEqual(L.animRegionsWhere(U).map(m => [m.region, m.id, Math.round(m.km)]), [['bbb', 'b-city', 0], ['aaa', '', 150]], tag);
    assert.equal(L.animRegionWhere(U).region, 'bbb', tag + ': the nearest region, not the first by name or by definition');
    assert.deepEqual(L.animRegionsWhere(KMN(U, 80)).map(m => [m.region, Math.round(m.km)]), [['aaa', 70], ['bbb', 80]], tag + ': 80 km north the aaa row is the nearer one');
    assert.equal(L.animRegionWhere(KMN(U, 80)).region, 'aaa', tag);
    assert.deepEqual(L.animRegionsWhere(KMN(U, 250)).map(m => m.region), ['aaa'], tag + ': beyond bbb\'s reach only aaa matches');
    assert.deepEqual(L.animRegionsWhere({ lat: 0, lon: 0 }), []); assert.equal(L.animRegionWhere({ lat: 0, lon: 0 }), null);
    assert.equal(L.animRegionWhere({ lat: 47.61, lon: -122.33 }).region, 'us', 'the real regions answer through the same call');
  }
  // equal distances (rows at the same spot): the region defined first
  const t1 = zone('ttt', ['TA'], [['t1', 'T1', 'TA', 10, 10, 'big']]), t2 = zone('uuu', ['UA'], [['u1', 'U1', 'UA', 10, 10, 'big']]);
  for (const order of [[t1, t2], [t2, t1]]) {
    const L = load(false); order.forEach(c => L.animRegionDefine(c));
    assert.deepEqual(L.animRegionsWhere({ lat: 10, lon: 10 }).map(m => [m.region, m.km]), order.map(c => [c.id, 0]), 'a tie: definition order');
    assert.equal(L.animRegionWhere({ lat: 10, lon: 10 }).region, order[0].id);
  }
});

test('overlapping regions: a unit with art elsewhere still claims its position, so a farther region cannot take it', () => {
  const V = { lat: -35, lon: -30 };
  const eee = zone('eee', ['EE'], [['e-row', 'E Row', 'EE', V.lat, V.lon, '']], { elsewhere: ['EE'] });
  const fff = zone('fff', ['FF'], [['f-row', 'F Row', 'FF', V.lat + 80 / KM, V.lon, '']]);
  for (const order of [[eee, fff], [fff, eee]]) {
    const L = load(false); const [r1, r2] = order.map(c => L.animRegionDefine(c)); const F = order[0] === fff ? r1 : r2;
    assert.ok(F.where(V), 'fff alone answers at V');
    assert.deepEqual(L.animRegionsWhere(V), [], 'the nearer row belongs to eee (art elsewhere): nothing opens here'); assert.equal(L.animRegionWhere(V), null);
    assert.deepEqual(L.animRegionsWhere(KMN(V, 60)).map(m => m.region), ['fff'], 'nearer to the fff row: fff answers');
  }
});

/* ---------- the travel id ---------- */
test('the default travel id is <place id>-<country code>, the country read the way the items read it', () => {
  const L = load(false);
  const eu = L.animRegionDefine({ id: 'eu', unitWord: 'country', unitKm: 100, units: { FR: ['France', 'west'], DE: ['Germany', 'west'] },
    places: [['paris', 'Paris', 'FR', 48.86, 2.35, 'big'], ['berlin', 'Berlin', 'DE', 52.52, 13.4, 'big'], ['lyon', 'Lyon', 'FR', 45.76, 4.84, 'small']] });
  assert.deepEqual(eu.places.map(p => eu.travelId(p)), ['paris-fr', 'berlin-de', 'lyon-fr'], 'the unit code is the country: the travel tables\' ids');
  assert.equal(eu.unitOf({ city: 'paris-fr' }), 'FR'); assert.equal(eu.place({ city: 'berlin-de' }).id, 'berlin'); assert.equal(eu.travelRow('lyon-fr')[0], 'lyon');
  assert.equal(eu.unitOf({ city: 'paris-eu' }), '', 'the region id is no part of a travel id (it used to be: "paris-eu" matched, "paris-fr" did not)');
  const gb = L.animRegionDefine({ id: 'gbx', unitWord: 'county', unitKm: 100, country: 'GB', units: { KT: ['Kent', 'g'] }, places: [['dover', 'Dover', 'KT', 51.13, 1.31, 'small']] });
  assert.equal(gb.travelId(gb.places[0]), 'dover-gb', 'a constant country');
  const hk = L.animRegionDefine({ id: 'nord', unitWord: 'zone', unitKm: 100, country: (u) => ({ N1: 'NO', N2: 'SE' })[u], units: { N1: ['One', 'g'], N2: ['Two', 'g'] }, places: [['a', 'A', 'N1', 60, 10, ''], ['b', 'B', 'N2', 59, 18, '']] });
  assert.deepEqual(hk.places.map(p => hk.travelId(p)), ['a-no', 'b-se'], 'a country hook');
  assert.equal(L.animRegionDefine({ id: 'hooked', unitWord: 'zone', unitKm: 100, travelId: (p) => p[0] + '~', units: { AA: ['A', 'g'] }, places: [['a', 'A', 'AA', 1, 1, '']] }).travelId(['a']), 'a~', 'an explicit hook still wins');
  // the US and Asia: the ids they always had, from the one default (Asia's own override is gone)
  const us = R.animRegion('us'), asia = R.animRegion('asia');
  for (const p of R.US_PLACES) assert.equal(us.travelId(p), p[0] + '-us', p[0]);
  for (const p of R.ASIA_PLACES) assert.equal(asia.travelId(p), p[0] + '-' + p[2].toLowerCase(), p[0]);
  assert.equal(us.travelId(R.US_PLACES.find(p => p[0] === 'seattle')), 'seattle-us'); assert.equal(asia.travelId(R.ASIA_PLACES.find(p => p[0] === 'tokyo')), 'tokyo-jp');
  assert.ok(!/travelId\s*:/.test(src('71-anim-asia.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'Asia\'s config no longer overrides travelId');
});

test('a travelId hook (or country hook) that throws on a malformed row never breaks defining: check() names the row, the lookups skip it', () => {
  const L = load(false);
  const viaHook = L.animRegionDefine({ id: 'hooky', unitWord: 'zone', unitKm: 100, units: { AA: ['A', 'g'] }, travelId: (p) => p[0].toLowerCase() + '-x',
    places: [['ok-row', 'Ok', 'AA', 1, 1, 'big'], [null, 'No id', 'AA', 2, 2, '']] });
  assert.ok(viaHook.check().some(m => /no travel id/.test(m)), viaHook.check().join('\n'));
  assert.equal(viaHook.unitOf({ city: 'ok-row-x' }), 'AA'); assert.equal(viaHook.unitOf({ lat: 1, lon: 1 }), 'AA');
  const viaDefault = L.animRegionDefine({ id: 'defaulty', unitWord: 'zone', unitKm: 100, units: { AA: ['A', 'g'] }, places: [['x1', 'X1', null, 1, 1, ''], ['x2', 'X2', 'AA', 2, 2, '']] });
  assert.ok(viaDefault.check().some(m => /x1: no travel id/.test(m)), viaDefault.check().join('\n'));
  assert.equal(viaDefault.travelId(['x1', 'X1', null, 1, 1, '']), ''); assert.equal(viaDefault.unitOf({ city: 'x2-aa' }), 'AA');
});

test('the travel ids of the big places against the travel tables (a warning list, not a failure)', (t) => {
  const T = new Function(`${src('69-travel-data.js')}\nreturn trPlaceTables();`)();
  assert.ok(T.byId instanceof Map && T.byId.size > 1000);
  for (const r of R.ANIM_REGIONS.filter(x => x !== TOY)) {
    const dead = (rows) => rows.filter(p => !T.byId.has(r.travelId(p))).map(p => r.travelId(p));
    const big = r.places.filter(p => p[5] === 'big'), small = r.places.filter(p => p[5] === 'small'), deadBig = dead(big);
    // today's behaviour, reported and not changed: a place whose travel id the travel tables lack is reached by the home weather town only
    t.diagnostic(`${r.id}: ${deadBig.length} of ${big.length} big places have a travel id the travel tables do not have${deadBig.length ? ': ' + deadBig.join(' ') : ''}; small places: ${dead(small).length} of ${small.length}`);
  }
});

/* ---------- the world pack's cities ---------- */
const WORLD_CITIES = [...new Set(R.animPack('world').items.map(i => i.city))];

test('worldTravel is exposed, and every city the world pack draws that a region maps to a row is listed (every region)', () => {
  assert.ok(WORLD_CITIES.length >= 12 && WORLD_CITIES.includes('paris-fr') && WORLD_CITIES.includes('tokyo-jp'));
  for (const r of R.ANIM_REGIONS) {
    assert.ok(Array.isArray(r.worldTravel) && Object.isFrozen(r.worldTravel), r.id);
    for (const c of WORLD_CITIES) {
      const row = r.places.find(p => r.travelId(p) === c);
      if (row) assert.ok(r.worldTravel.includes(c), `${r.id}: ${c} (row ${row[0]}) is drawn by the world pack, so it belongs in worldTravel`);
    }
    for (const c of r.worldTravel) { assert.equal(r.travelRow(c), null, `${r.id}: ${c} matches nothing while travelling`); assert.equal(r.where({ city: c }), null); }
    assert.deepEqual(nonStarter(r.check({ worldCities: WORLD_CITIES })), [], r.id);
  }
  assert.deepEqual(R.animRegion('us').worldTravel, ['new-york-us']); assert.deepEqual(R.animRegion('asia').worldTravel, ['tokyo-jp', 'dubai-ae', 'singapore-sg']);
  assert.deepEqual(TOY.worldTravel, ['alpha-cove~AA']); assert.equal(TOY.travelId(CV), 'alpha-cove~AA'); assert.deepEqual(TOY.elsewhere, ['DD']);
});

test('a region that forgets worldTravel: check() says so, and a traveller in Paris would get the region\'s art, not the world pack\'s landmark', () => {
  const cfg = (worldTravel) => ({ id: 'eu', unitWord: 'country', unitKm: 100, worldTravel, units: { FR: ['France', 'west'] }, places: [['paris', 'Paris', 'FR', 48.86, 2.35, 'big']] });
  const pickIn = (worldTravel) => {
    const L = load(false), eu = L.animRegionDefine(cfg(worldTravel)), B = eu.builder('west');
    B.place('paris', { id: 'sky', label: 'Paris skyline', colour: 'indigo', svg: () => '<circle class="c x-pulse" cx="32" cy="32" r="8"/>' });
    assert.equal(L.animRegisterPack(B.pack({ id: 'eu-west', name: 'EU', description: 'x' })).ok, true);
    return { eu, pick: L.animSpecialPick('opening', day, {}, { city: 'paris-fr' }) };
  };
  const forgot = pickIn([]), listed = pickIn(['paris-fr']);
  assert.ok(forgot.eu.check({ worldCities: WORLD_CITIES }).some(m => /paris-fr/.test(m) && /worldTravel/.test(m)), forgot.eu.check({ worldCities: WORLD_CITIES }).join('\n'));
  assert.equal(forgot.pick.pack, 'eu-west', 'the bug the check prevents');
  assert.deepEqual(listed.eu.check({ worldCities: WORLD_CITIES }), []);
  assert.equal(listed.pick.pack, 'world', 'listed: the world pack\'s landmark plays for the traveller');
});

/* ---------- the builder ---------- */
test('B.pack() throws unless the pack id is <region id>-<group>: a region owns exactly the packs it names', () => {
  const B = TOY.builder('north');
  for (const bad of ['toy', 'toyland-north', 'toy-south', 'north', 'europe-west', '', undefined]) assert.throws(() => B.pack({ id: bad, name: 'x', description: 'x' }), /pack id must be "toy-north"/, String(bad));
  assert.throws(() => B.pack(), /pack id must be "toy-north"/);
  assert.equal(B.pack({ id: 'toy-north', name: 'x', description: 'x' }).id, 'toy-north');
  assert.ok(R.animRegionOwns('toy', 'toy-north'));
  // the failure the check prevents: an owned name is what the opening's "Welcome to" looks the pick's pack up by
  assert.ok(!R.animRegionOwns('toy', 'toyland-north'));
});

test('B.unit / B.place / B.scenes throw at the call on a duplicate item id (a pack that fails to register fails silently)', () => {
  const icon = () => '<circle class="c x-pulse" cx="32" cy="32" r="8"/>';
  const N = TOY.builder('north');
  N.unit('AA', 'element', { id: 'gull', label: 'Gull', svg: icon }); N.place('alpha-city', { id: 'sky', label: 'Sky', svg: icon });
  assert.throws(() => N.unit('AA', 'element', { id: 'gull', label: 'Gull again', svg: icon }), /toy pack north: duplicate item id "aa-gull"/);
  assert.throws(() => N.unit('AA', 'signature', { id: 'gull', label: 'Gull again', svg: icon }), /duplicate item id "aa-gull"/);
  assert.throws(() => N.place('alpha-city', { id: 'sky', label: 'Sky again', svg: icon }), /duplicate item id "alpha-city-sky"/);
  assert.equal(N.items.length, 2, 'a refused call adds nothing');
  const S = TOY.builder('south'); S.scenes();
  const n = S.items.length;
  assert.throws(() => S.scenes(), /duplicate item id "cc-signature"/, 'the same scenes twice');
  assert.throws(() => S.unit('CC', 'signature', { id: 'signature', label: 'Sig', svg: icon }), /duplicate item id "cc-signature"/, 'a hand-made id that a registered scene already made');
  assert.throws(() => S.place('charlie-port', { id: 'quay', label: 'Quay', svg: icon }), /duplicate item id "charlie-port-quay"/);
  S.unit('CC', 'element', { id: 'palm', label: 'Palm', svg: icon });
  assert.equal(S.items.length > n, true);
});

/* ---------- every region ---------- */
/* Two kinds of rule. STRUCTURAL ones (sound tables, no overlap, unique travel ids, pack names, no dead art, no duplicate scene) always run and always fail hard.
   COVERAGE ones (a pack for every group that opens, no starter data left) fail hard once the region says `complete` (the US, Asia and any region whose config says
   complete: true) and are reported as todo until: a scaffolded region being drawn is not a red repo. Each loop iteration is its own test, so one region's failure
   never hides another's (the old single test stopped at the first missing pack). */
const coverageOpts = (r) => (r.complete ? {} : { todo: `${r.id} is not declared complete (complete: false in its config): reported, not failing; node tools/anim-pack.mjs status ${r.id} is the progress bar` });

test('every region: the flag is a boolean, the tables are sound and no scene key is registered twice (structural: always hard)', () => {
  assert.ok(R.ANIM_REGIONS.length >= 3);
  for (const r of R.ANIM_REGIONS) {
    assert.equal(typeof r.complete, 'boolean', r.id + ': complete');
    assert.deepEqual(nonStarter(r.check({ worldCities: WORLD_CITIES })), [], r.id + ': check() is empty (the scaffold\'s starter notes aside)');
    assert.deepEqual(r.sceneDuplicates(), [], r.id + ': no scene key is registered twice (the last registration would silently hide the other)');
    assert.ok(r.groups.length > 0, r.id);
  }
});

test('every region: no row inside another region\'s reach, and no other region\'s row inside this one\'s (overlap: its own test, so it runs while the art is still missing)', () => {
  for (const r of R.ANIM_REGIONS) for (const o of R.ANIM_REGIONS) if (o !== r) {
    assert.ok(!r.owns(o.id) && !o.owns(r.id), `${r.id} and ${o.id}: pack names must not collide`);
    for (const p of r.places) assert.equal(o.unitOf({ lat: p[3], lon: p[4] }), '', `${r.id} row ${p[0]} sits inside ${o.id}'s reach: regions must not overlap (lower one unitKm, or drop the row)`);
  }
  for (const r of R.ANIM_REGIONS) assert.deepEqual(r.check({ worldCities: WORLD_CITIES }).filter(m => /^overlap:/.test(m)), [], r.id + ': check() names no overlap');
});

test('every region: unique travel ids, packs named <id>-<group> that hold only the region\'s items (structural: always hard)', () => {
  const owner = new Map();
  for (const r of R.ANIM_REGIONS) {
    for (const p of r.places) { const t = r.travelId(p); assert.ok(!owner.has(t), `${t} is the travel id of ${r.id}/${p[0]} and of ${owner.get(t)}`); owner.set(t, r.id + '/' + p[0]); }
    // a pack that carries this region's items is named <id>-<group>; a pack that is registered holds items (an empty pack is not registered at all)
    for (const p of R.animPacks()) {
      const mine = p.items.filter(i => i[r.fields.kind] != null);
      if (mine.length) {
        assert.ok(r.owns(p.id), `${p.id} carries ${r.id} items: a region's packs are named ${r.id}-<group>`);
        assert.equal(mine.length, p.items.length, `${p.id}: only ${r.id} items`);
        assert.ok(r.groups.includes(p.id.slice(r.id.length + 1)), `${p.id}: named after a group of ${r.id} (${r.groups.join(', ')})`);
      }
      if (r.owns(p.id)) assert.ok(mine.length > 0, `${p.id} is named for ${r.id} but holds none of its items`);
    }
  }
});

for (const r of R.ANIM_REGIONS) {
  test(`${r.id}: a pack exactly when a group has units that open, and no starter data left (coverage: hard when the region is complete, else todo)`, coverageOpts(r), () => {
    for (const g of r.groups) {
      const opens = Object.keys(r.units).filter(u => r.units[u][1] === g && !r.elsewhere.includes(u)).length;
      assert.equal(!!R.animPack(r.id + '-' + g), opens > 0, `${r.id}-${g}: a pack exactly when the group has units that open (${opens})   (node tools/anim-pack.mjs status ${r.id})`);
    }
    assert.deepEqual(r.check({ worldCities: WORLD_CITIES }).filter(m => /^starter:/.test(m)), [], `${r.id}: starter data left (set country, replace the example rows)`);
    assert.deepEqual(r.places.filter(p => /^example-/.test(p[0])).map(p => p[0]), [], `${r.id}: example rows left in the tables`);
  });
}

test('the complete flag: default true (a config that does not say is finished: the US, Asia), false while a region is drawn, anything else is refused', () => {
  const L = load(false), cfg = { unitKm: 100, units: { AA: ['A', 'g'] }, places: [['a-town', 'A Town', 'AA', 1, 1, 'big']] };
  assert.equal(L.animRegionDefine({ ...cfg, id: 'dflt' }).complete, true);
  assert.equal(L.animRegionDefine({ ...cfg, id: 'done', complete: true }).complete, true);
  assert.equal(L.animRegionDefine({ ...cfg, id: 'wip', complete: false }).complete, false);
  for (const bad of ['no', 0, 1, 'false']) assert.throws(() => L.animRegionDefine({ ...cfg, id: 'bad' + String(bad).replace(/\W/g, ''), complete: bad }), /complete: true or false/, String(bad));
  assert.equal(R.animRegion('us').complete, true); assert.equal(R.animRegion('asia').complete, true);
  assert.match(src('71-anim-0region.js'), /complete {4}true \| false/, 'the header documents the flag');
});

test('the region exposes unitKm and placeKm (the radii the config set), countryOf and nearestRow', () => {
  const us = R.animRegion('us'), asia = R.animRegion('asia');
  assert.deepEqual([us.unitKm, us.placeKm, asia.unitKm, asia.placeKm], [R.US_STATE_KM, R.US_PLACE_KM, R.ASIA_COUNTRY_KM, R.ASIA_PLACE_KM]);
  assert.ok(Object.isFrozen(us.placeKm), 'the radii cannot be changed after the region is defined (the lookups work on their snapshot)');
  assert.deepEqual([TOY.unitKm, TOY.placeKm], [80, { big: 50, small: 30 }]);
  assert.equal(TOY.countryOf('AA'), 'AA'); assert.equal(us.countryOf('WA'), 'US'); assert.equal(asia.countryOf('JP'), 'JP');
  assert.deepEqual(TOY.nearestRow(at(AC)), { id: 'alpha-city', unit: 'AA', km: 0 });
  assert.equal(TOY.nearestRow(north(AC, -55)).id, 'alpha-city'); assert.equal(TOY.nearestRow(north(AC, -57)).id, 'bravo-bay');
  assert.equal(TOY.nearestRow(north(AC, 90)), null, 'beyond unitKm: no row'); assert.equal(TOY.nearestRow(null), null); assert.equal(TOY.nearestRow({}), null);
  assert.deepEqual(TOY.nearestRow({ city: 'charlie-camp~CC' }), { id: 'charlie-camp', unit: 'CC', km: 0 }, 'a travel match is 0 km');
});

test('overlap: check() names a row inside another region\'s reach with the ways out (the border case: a town just across a border from a neighbour\'s row)', () => {
  const asia = R.ASIA_PLACES.find(p => p[0] === 'jayapura');
  assert.ok(asia, 'the border case is real: Asia\'s Jayapura row');
  const unit = (id, unitKm, rows) => ({ id, unitWord: 'country', unitKm, units: { PG: ['Neighbour land', 'g'] }, places: rows });
  const town = (lat, lon) => ['border-town', 'Border Town', 'PG', lat, lon, ''], cap = ['capital', 'Capital', 'PG', -9.48, 147.15, 'big'];
  const near = [asia[3] - 0.15, asia[4] + 0.6];   // about 70 km east of Asia's row: a town on the far side of the border
  // both reaches contain the other row: ONE entry, seen from either side
  const L = load(false), png = L.animRegionDefine(unit('neigh', 250, [town(...near), cap]));
  const found = png.check({ worldCities: [] }).filter(m => /^overlap:/.test(m));
  assert.equal(found.length, 1, found.join('\n'));
  for (const re of [/^overlap: border-town \(PG, /, /and asia's row jayapura are \d+ km apart/, /each inside the other's reach \(asia 300 km, this region 250 km\)/, /BORDER CASE/, /move or drop one of the two rows/, /lower asia's unitKm or neigh's \(then run the tests of both regions\)/, /add it to asia's own tables/]) assert.match(found[0], re);
  assert.ok(/\b(6\d|7\d) km apart/.test(found[0]), 'the distance is in the message: ' + found[0]);
  const [v] = png.overlaps();
  assert.deepEqual([v.direction, v.other, v.row, v.otherRow, v.reach, v.myReach], ['both', 'asia', 'border-town', 'jayapura', 300, 250]);
  const back = L.animRegion('asia').check({ worldCities: [] }).filter(x => /^overlap:/.test(x));
  assert.equal(back.length, 1, 'Asia sees the same overlap, once'); assert.match(back[0], /^overlap: jayapura \(ID, .*and neigh's row border-town are \d+ km apart/);
  // only the neighbour's reach contains my row (my reach is short): "in"
  const inOnly = load(false).animRegionDefine(unit('inonly', 40, [town(...near), cap])).check({ worldCities: [] }).filter(m => /^overlap:/.test(m));
  assert.equal(inOnly.length, 1); for (const re of [/^overlap: border-town \(PG, .* km from asia's row jayapura, inside its reach of 300 km, so asia claims/, /move or drop the row/, /lower asia's unitKm \(then run the tests of both regions\)/, /add it to asia's own tables/]) assert.match(inOnly[0], re);
  // only my reach contains the neighbour's row (my row is outside its reach): "out"
  const far = [asia[3] - 0.15, asia[4] + 3.4];   // about 380 km east
  const outOnly = load(false).animRegionDefine(unit('outonly', 420, [town(...far), cap])).check({ worldCities: [] }).filter(m => /^overlap:/.test(m));
  assert.equal(outOnly.length, 1); for (const re of [/^overlap: asia's row jayapura \(ID, .* km from this region's row border-town, inside its reach of 420 km/, /lower outonly's unitKm \(now 420; then run the tests of both regions\), or move or drop border-town/]) assert.match(outOnly[0], re);
  // away from every other region the region is clean again; a clean real region reports nothing
  assert.deepEqual(load(false).animRegionDefine(unit('far', 250, [cap])).check({ worldCities: [] }), []);
  assert.deepEqual(R.animRegion('asia').check({ worldCities: WORLD_CITIES }).filter(x => /^overlap:/.test(x)), []);
});

test('region.check() reads the world pack\'s cities live when it is given none; { worldCities: [...] } still decides (and [] skips the check)', () => {
  const L = load(false), eu = L.animRegionDefine({ id: 'eu', unitWord: 'country', unitKm: 100, units: { FR: ['France', 'west'] }, places: [['paris', 'Paris', 'FR', 48.86, 2.35, 'big']] });
  assert.ok(eu.check().some(m => /paris-fr/.test(m) && /worldTravel/.test(m)), 'no argument: the live world pack says paris-fr is drawn: ' + eu.check().join('\n'));
  assert.deepEqual(eu.check({ worldCities: [] }), [], 'an explicit list wins');
  assert.ok(eu.check({ worldCities: ['paris-fr'] }).some(m => /paris-fr/.test(m)));
  const ok = load(false).animRegionDefine({ id: 'eu2', unitWord: 'country', unitKm: 100, worldTravel: ['paris-fr'], units: { FR: ['France', 'west'] }, places: [['paris', 'Paris', 'FR', 48.86, 2.35, 'big']] });
  assert.deepEqual(ok.check(), [], 'listed: nothing to say');
  for (const r of R.ANIM_REGIONS) assert.deepEqual(nonStarter(r.check()), [], r.id + ': every region is clean against the live world pack too');
});

/* ---------- radii: the shipped values are pinned at both sides of each edge ---------- */
const kmBetween = (a, b) => { const q = Math.PI / 180, dl = (b[0] - a[0]) * q, dg = (b[1] - a[1]) * q, h = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * q) * Math.cos(b[0] * q) * Math.sin(dg / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };
const nearestRow = (rows, pt) => rows.reduce((b, p) => { const d = kmBetween([pt.lat, pt.lon], [p[3], p[4]]); return d < b.d ? { p, d } : b; }, { p: null, d: Infinity });
const PINNED = { us: { unitKm: 190, big: 50, small: 30 }, asia: { unitKm: 300, big: 50, small: 30 } };
/** A row and two points straight north or south of it, 1 km inside and 1 km outside `reach`, chosen by an oracle that uses the pinned radii (no other row or place in the way). */
function unitProbe(region, reach) {
  for (const row of region.places) for (const dir of [1, -1]) {
    const inside = { lat: row[3] + dir * (reach - 1) / KM, lon: row[4] }, outside = { lat: row[3] + dir * (reach + 1) / KM, lon: row[4] };
    if (Math.abs(inside.lat) > 85 || Math.abs(outside.lat) > 85) continue;
    if (nearestRow(region.places, inside).p === row && nearestRow(region.places, outside).d >= reach + 0.5) return { row, inside, outside };
  }
  return null;
}
function placeProbe(region, kind, pin) {
  const art = region.places.filter(p => p[5]), reaching = (pt) => art.filter(p => kmBetween([pt.lat, pt.lon], [p[3], p[4]]) <= pin[p[5]]);
  for (const row of region.places.filter(p => p[5] === kind)) for (const dir of [1, -1]) {
    const inside = { lat: row[3] + dir * (pin[kind] - 1) / KM, lon: row[4] }, outside = { lat: row[3] + dir * (pin[kind] + 1) / KM, lon: row[4] };
    if (Math.abs(inside.lat) > 85 || Math.abs(outside.lat) > 85) continue;
    const a = reaching(inside), b = reaching(outside);
    if (a.length === 1 && a[0] === row && b.length === 0) return { row, inside, outside };
  }
  return null;
}

test('radii: the US and Asia radii are pinned at both edges (a swapped or shifted radius fails)', () => {
  assert.deepEqual([R.US_STATE_KM, R.US_PLACE_KM], [PINNED.us.unitKm, { big: PINNED.us.big, small: PINNED.us.small }]);
  assert.deepEqual([R.ASIA_COUNTRY_KM, R.ASIA_PLACE_KM], [PINNED.asia.unitKm, { big: PINNED.asia.big, small: PINNED.asia.small }]);
  for (const id of ['us', 'asia']) {
    const region = R.animRegion(id), pin = PINNED[id];
    const u = unitProbe(region, pin.unitKm); assert.ok(u, `${id}: a row with open ground on one side`);
    assert.equal(region.unitOf(u.inside), u.row[2], `${id}: ${pin.unitKm - 1} km from ${u.row[0]} is in ${u.row[2]}`);
    assert.equal(region.unitOf(u.outside), '', `${id}: ${pin.unitKm + 1} km from ${u.row[0]} is in no ${region.unitWord}`);
    for (const kind of ['big', 'small']) {
      const q = placeProbe(region, kind, pin); assert.ok(q, `${id}: a ${kind} place with nothing else in reach`);
      assert.equal((region.place(q.inside) || {}).id, q.row[0], `${id}: ${pin[kind] - 1} km from the ${kind} place ${q.row[0]} is in it`);
      assert.equal(region.place(q.outside), null, `${id}: ${pin[kind] + 1} km from the ${kind} place ${q.row[0]} is not`);
      const near = nearestRow(region.places, q.outside);
      assert.equal(region.unitOf(q.outside), near.d < pin.unitKm ? near.p[2] : '', `${id}: outside the place radius the nearest row still decides the ${region.unitWord}`);
    }
  }
});

/* ---------- tables are read once ---------- */
test('the tables are read once, when the region is defined: a later edit changes no lookup and check() says so', () => {
  const L = load(false), places = [['p1', 'P1', 'AA', 10, 10, 'big']];
  const r = L.animRegionDefine({ id: 'snap', unitKm: 100, units: { AA: ['A', 'g'] }, places });
  assert.deepEqual(r.check(), []);
  places.push(['p2', 'P2', 'AA', 40, 40, 'big']);
  assert.equal(r.unitOf({ lat: 40, lon: 40 }), '', 'the lookups keep the table as it was defined');
  assert.ok(r.check().some(m => /changed after animRegionDefine \(1 rows then, 2 now\)/.test(m)), r.check().join('\n'));
  places.pop(); places[0] = ['p1', 'P1', 'AA', 11, 11, 'big'];
  assert.ok(r.check().some(m => /changed after animRegionDefine/.test(m)), 'a replaced row is noticed too');
});

test('check() also rejects a scene stored under a malformed key (set directly on the registry)', () => {
  const L = load(false), r = L.animRegionDefine({ id: 'keys', unitKm: 100, units: { AA: ['A', 'g'] }, places: [['a', 'A', 'AA', 1, 1, 'big']] });
  r.scenes['nocolon'] = { label: 'x' }; r.scenes['a:b:c'] = { label: 'x' };
  assert.ok(r.check().some(m => /nocolon: a scene key is/.test(m)) && r.check().some(m => /a:b:c: a scene key is/.test(m)), r.check().join('\n'));
});

test('a unit may not be called by one of the framework\'s own kinds (city and place name places, big and small the place kinds): the coverage would count a place as a unit', () => {
  const L = load(false);
  const ok = { id: 'okay', unitKm: 100, units: { AA: ['A', 'g'] }, places: [['a-town', 'A Town', 'AA', 1, 1, 'big']] };
  assert.deepEqual(RESERVED_UNIT_WORDS, ['place', 'city', 'big', 'small', 'signature', 'element']);
  const m = /_AR_RESERVED_WORDS = \[([^\]]*)\]/.exec(src('71-anim-0region.js'));
  assert.ok(m); assert.deepEqual(RESERVED_UNIT_WORDS, m[1].split(',').map(x => x.trim().replace(/'/g, '')).filter(Boolean), 'the tools repeat the framework\'s list');
  for (const w of RESERVED_UNIT_WORDS) assert.throws(() => L.animRegionDefine({ ...ok, id: 'w' + w, unitWord: w }), /unitWord.*not one of place, city, big, small, signature, element/, w);
  for (const w of ['country', 'state', 'province', 'county', 'town', 'municipality', 'unit']) assert.equal(L.animRegionDefine({ ...ok, id: 'w' + w, unitWord: w }).unitWord, w, w);
});

test('a scene key registered twice is recorded: check() names it with its count (the last registration wins and silently hides the earlier scene)', () => {
  const L = load(false);
  const r = L.animRegionDefine({ id: 'dupe', unitKm: 100, units: { AA: ['A', 'g'] }, places: [['a-town', 'A Town', 'AA', 1, 1, 'big']] });
  const add = (key, label) => L.animRegionSceneAdd('dupe', { key, label, svg: () => '' });
  add('unit:AA', 'first'); add('place:a-town', 'only once');
  assert.deepEqual(r.sceneDuplicates(), []); assert.deepEqual(r.check(), []);
  add('unit:AA', 'second');
  assert.deepEqual(r.sceneDuplicates(), [['unit:AA', 2]]);
  assert.match(r.check().join('\n'), /^DUPLICATE SCENE KEY unit:AA \(registered 2 times; the last registration wins/);
  add('unit:AA', 'third'); r.sceneAdd({ key: 'place:a-town', label: 'again', svg: () => '' });
  assert.deepEqual(r.sceneDuplicates(), [['unit:AA', 3], ['place:a-town', 2]]);
  assert.equal(r.scenes['unit:AA'].label, 'third', 'the last one wins, which is why it must be reported');
  assert.equal(r.check().filter(p => /DUPLICATE SCENE KEY/.test(p)).length, 2);
});

test('the scaffold\'s placeholder country XX is starter data: check() reports it (a region of states has no country code), and a travel id ending -xx too', () => {
  const L = load(false);
  const states = { unitWord: 'state', unitKm: 100, units: { AA: ['A', 'g'] }, places: [['a-town', 'A Town', 'AA', 1, 1, 'big']] };
  const bad = L.animRegionDefine({ ...states, id: 'plc', country: 'XX' });
  assert.match(bad.check().join('\n'), /^starter: the country is still the placeholder XX \(1 of the travel ids end in -xx, for example a-town-xx\): set country: '<ISO 3166-1 alpha-2 code>'/);
  assert.equal(bad.travelId(bad.places[0]), 'a-town-xx');
  // one region per context: two regions on the same coordinates would overlap, which check() now reports
  assert.deepEqual(load(false).animRegionDefine({ ...states, id: 'real', country: 'ZZ' }).check(), [], 'a real code clears it');
  const viaHook = load(false).animRegionDefine({ ...states, id: 'hook', country: 'ZZ', travelId: (p) => p[0] + '-xx' });
  assert.match(viaHook.check().join('\n'), /^starter: .*end in -xx/, 'a travel id ending -xx is flagged whatever made it');
  assert.deepEqual(load(false).animRegionDefine({ id: 'cty', unitWord: 'country', unitKm: 100, units: { FR: ['France', 'g'] }, places: [['paris', 'Paris', 'FR', 48.86, 2.35, 'big']] }).check({ worldCities: [] }), [], 'a region of countries: the unit code is the country');
  assert.match(load(false).animRegionDefine({ id: 'fn', unitWord: 'zone', unitKm: 100, country: () => 'XX', units: { AA: ['A', 'g'] }, places: [['a', 'A', 'AA', 1, 1, '']] }).check().join('\n'), /placeholder XX/, 'a country hook that returns XX');
});
