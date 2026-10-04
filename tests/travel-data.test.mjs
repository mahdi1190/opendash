// The offline place tables (travel spec 3.4, 4.6, 4.8, 4.9): every zone the
// browser can report maps to a country (or is UTC/Etc), every airport's city
// exists, every country has a place kind, the generated file stays small and
// pure, the page and Node agree on city ids, greetings and flags are well formed,
// and the generator works on a synthetic download set. All data is synthetic or
// public reference data; no user data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { places as P, loadTravelData, PLACE_FILES } from '../lib/travel-data.mjs';
import { travelIndex } from '../lib/travel-logic.mjs';
import { buildTravelData, renderTravelData, readRaw, OUT_FILE } from '../tools/build-travel-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = P.trPlaceTables();
const KINDS = ['towers', 'oldtown', 'coastal', 'mountain', 'desert', 'tropical', 'nordic', 'lowlands'];

test('every zone the browser can report maps to a country, or is UTC / Etc', () => {
  const zones = Intl.supportedValuesOf('timeZone');
  assert.ok(zones.length > 300);
  for (const z of zones) {
    const i = P.trZoneInfo(z);
    assert.ok(i, `zone ${z} is not in the table`);
    if (!i.etc) assert.match(i.cc, /^[A-Z]{2}$/, z);
  }
  for (const z of ['UTC', 'Etc/UTC', 'Etc/GMT-9', 'GMT']) { assert.equal(P.trZoneInfo(z).etc, true, z); assert.equal(P.trZoneCountry(z), '', `${z} is never a place`); }
  assert.equal(P.trZoneLabel('Etc/GMT-9'), 'UTC+9');
  assert.equal(P.trZoneLabel('Etc/GMT+5'), 'UTC−5');
  assert.equal(P.trZoneInfo('Mars/Olympus_Mons'), null);
});

test('old zone names resolve to today\'s (a rename never looks like a trip)', () => {
  for (const [old, now, cc] of [['Asia/Calcutta', 'Asia/Kolkata', 'IN'], ['Europe/Kiev', 'Europe/Kyiv', 'UA'], ['Asia/Saigon', 'Asia/Ho_Chi_Minh', 'VN'],
    ['Asia/Katmandu', 'Asia/Kathmandu', 'NP'], ['America/Buenos_Aires', 'America/Argentina/Buenos_Aires', 'AR']]) {
    const i = P.trZoneInfo(old);
    assert.equal(i.zone, now, old);
    assert.equal(i.cc, cc, old);
  }
  assert.equal(P.trZoneLabel('Asia/Tokyo'), 'Tokyo');
  assert.equal(P.trZoneLabel('Europe/Tirane'), 'Tirana', 'the zone\'s own city, by position');
  assert.equal(P.trZoneInfo('Asia/Singapore').single, true, 'a city state: the zone is the city');
});

test('every airport\'s city exists, and the common ones are right', () => {
  const n = Object.keys(T.airports).length;
  assert.ok(n >= 500, `about 600 airports (${n})`);
  for (const [code, id] of Object.entries(T.airports)) {
    assert.match(code, /^[A-Z]{3}$/);
    assert.ok(T.byId.get(id), `${code} -> ${id} is not a city`);
  }
  const want = { LHR: 'London', LGW: 'London', HND: 'Tokyo', NRT: 'Tokyo', JFK: 'New York', EWR: 'New York', CDG: 'Paris', LIS: 'Lisbon', DXB: 'Dubai',
    KEF: 'Reykjavík', SIN: 'Singapore', DPS: 'Denpasar', SYD: 'Sydney', EDI: 'Edinburgh', ZRH: 'Zürich' };
  for (const [code, name] of Object.entries(want)) assert.equal(P.trAirportCity(code)?.name, name, code);
  assert.equal(P.trAirportCity('ZZZ'), null);
});

test('every country has a kind, a currency and parsed facts; the kinds are the spec\'s eight', () => {
  const cs = Object.values(T.countries);
  assert.ok(cs.length >= 240, `about 250 countries (${cs.length})`);
  for (const c of cs) {
    assert.ok(KINDS.includes(c.kind), `${c.cc}: kind ${c.kind}`);
    assert.ok(Array.isArray(c.weekend) && c.weekend.length >= 1, c.cc);
  }
  for (const c of T.cities) assert.ok(KINDS.includes(c.kind), `${c.id}: kind ${c.kind}`);
  const kind = (name, cc) => P.trPlaceKind({ cityId: P.trCityFind(name, { cc })?.id });
  const spec = { towers: ['Tokyo|JP', 'New York|US', 'Singapore|SG', 'Hong Kong|HK'], oldtown: ['Paris|FR', 'Prague|CZ', 'Kraków|PL', 'Edinburgh|GB'],
    coastal: ['Lisbon|PT', 'Barcelona|ES', 'Naples|IT'], mountain: ['Zürich|CH', 'Innsbruck|AT', 'Kathmandu|NP'], desert: ['Dubai|AE', 'Marrakesh|MA', 'Doha|QA'],
    tropical: ['Denpasar|ID', 'Phuket|TH', 'Cancún|MX'], nordic: ['Reykjavík|IS', 'Tromsø|NO'], lowlands: ['Amsterdam|NL', 'Bruges|BE'] };
  for (const [k, list] of Object.entries(spec)) for (const key of list) { const [n, cc] = key.split('|'); assert.equal(kind(n, cc), k, key); }
  assert.equal(P.trPlaceKind({ cc: 'JP' }), 'towers');
  assert.equal(P.trPlaceKind({}), 'oldtown', 'unknown: a safe default');
  const jp = P.trCountry('jp');
  assert.equal(jp.name, 'Japan', 'names come from Intl');
  assert.equal(jp.ccy, 'JPY');
  assert.equal(P.trCountry('BG').ccy, 'EUR', 'Bulgaria joined the euro in 2026');
  assert.equal(P.trCurrencyInfo('JP').symbol, '¥');
  assert.equal(P.trPlugAdvice('GB', 'JP').text, 'Type A/B plugs');
  assert.equal(P.trPlugAdvice('GB', 'IE'), null, 'same plug: no advice');
  assert.equal(P.trCountry('XX'), null);
});

test('cities: about 1,200, lookups by name and alias, nearest city within 50 km only', () => {
  assert.ok(T.cities.length >= 1000 && T.cities.length <= 1600, `${T.cities.length} cities`);
  assert.equal(P.trCityFind('Lisboa').id, 'lisbon-pt');
  assert.equal(P.trCityFind('Muenchen').name, 'Munich');
  assert.equal(P.trCityFind('Bombay').name, 'Mumbai');
  assert.equal(P.trCityFind('Brugge').name, 'Bruges');
  assert.equal(P.trCityFind('Montreal').lang, 'fr', 'a city\'s own language');
  assert.equal(P.trCityFind('Paris', { cc: 'US', strict: true }), null);
  const near = P.trNearestCity(35.66, 139.7);
  assert.equal(near.city.id, 'tokyo-jp');
  assert.ok(near.km < 50);
  assert.equal(P.trNearestCity(0, -30), null, 'mid-Atlantic: no city');
  assert.equal(P.trNearestCountry(0, -30), '');
  assert.equal(P.trNearestCountry(36.2, 138.2), 'JP');
});

test('the page and Node agree on city ids (the trips engine indexes the same tables)', () => {
  const idx = travelIndex();
  assert.equal(idx.cities.size, T.cities.length);
  for (const c of T.cities) {
    assert.match(c.id, /^[a-z0-9-]{2,80}$/, c.id);
    assert.ok(c.id.endsWith('-' + c.cc.toLowerCase()) || /-[a-z0-9]+$/.test(c.id), c.id);
    assert.equal(idx.cities.get(c.id)?.name, c.name, c.id);
  }
  assert.equal(new Set(T.cities.map(c => c.id)).size, T.cities.length, 'ids are unique');
  assert.equal(idx.zones.get('Asia/Calcutta')?.cc, 'IN', 'old zone names reach the trips engine too');
  assert.equal(idx.airports.get('HND')?.cityId, 'tokyo-jp');
});

test('the generated file is at most 140 KB, pure, and in step with its parser', () => {
  const size = statSync(PLACE_FILES.data).size;
  assert.ok(size <= 140 * 1024, `69-travel-data.js is ${size} bytes`);
  // PLACES' whole share of the page bundle (spec 7.4: growth at most 140 KB).
  const share = [PLACE_FILES.data, PLACE_FILES.places, PLACE_FILES.holidays, join(ROOT, 'src', 'styles', '69-travel-places.css')].reduce((a, f) => a + statSync(f).size, 0);
  assert.ok(share <= 140 * 1024, `the place files add ${share} bytes`);
  for (const f of [PLACE_FILES.data, PLACE_FILES.places, PLACE_FILES.holidays]) {
    const src = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
    assert.doesNotMatch(src, /\b(document|window|localStorage|sessionStorage|navigator|fetch|XMLHttpRequest)\b/, `${f} touches the page or the network`);
    assert.doesNotMatch(src, /\bnew Date\(\s*\)|\.get(Hours|Date|Day|Month|FullYear)\(\)/, `${f} reads the local clock`);
  }
  assert.equal(renderTravelData(readRaw(OUT_FILE)), readFileSync(OUT_FILE, 'utf8'), 'run: node tools/build-travel-data.mjs --relink');
  const fresh = loadTravelData();
  assert.notEqual(fresh, P, 'a fresh copy');
  assert.equal(fresh.trZoneCountry('Asia/Tokyo'), 'JP');
});

test('greetings: every language has hello and thanks; the slot follows the local hour', () => {
  for (const [lang, g] of Object.entries(P.TR_GREET)) {
    assert.ok(Array.isArray(g.h) && g.h[0], `${lang}: hello`);
    assert.ok(Array.isArray(g.thanks) && g.thanks[0], `${lang}: thanks`);
    for (const k of ['m', 'a', 'e', 'h', 'thanks']) {
      if (!g[k]) continue;
      const nonLatin = /[^\p{Script=Latin}\p{P}\s]/u.test(g[k][0]);
      if (nonLatin) assert.ok(g[k][1], `${lang}.${k}: a romanisation for a non-Latin script`);
    }
  }
  assert.ok(Object.keys(P.TR_GREET).length >= 45, 'about 45 languages');
  assert.deepEqual([4, 5, 11, 12, 16, 17, 21, 22, 23, 0].map(P.trGreetSlot), ['h', 'm', 'm', 'a', 'a', 'e', 'e', 'h', 'h', 'h']);
  const g = (o) => P.trGreeting(o);
  assert.deepEqual([g({ cc: 'JP', hour: 8 }).text, g({ cc: 'JP', hour: 8 }).roman], ['おはようございます', 'Ohayō gozaimasu']);
  assert.equal(g({ cc: 'JP', hour: 23 }).text, 'こんばんは', 'late: not "good night" (a farewell)');
  assert.equal(g({ cc: 'PT', hour: 14 }).text, 'Boa tarde');
  assert.equal(g({ cc: 'BR', hour: 9 }).lang, 'pt');
  assert.equal(g({ cc: 'AU', hour: 9 }).text, "G'day");
  assert.equal(g({ cc: 'NZ', hour: 9 }).text, 'Kia ora');
  assert.equal(g({ cc: 'CH', hour: 9 }).text, 'Grüezi');
  assert.equal(g({ cc: 'CA', cityId: P.trCityFind('Montreal').id, hour: 9 }).lang, 'fr', 'countries with several languages take the city\'s');
  assert.equal(g({ cc: 'HK', hour: 9 }).lang, 'yue');
  const th = g({ cc: 'TH', hour: 20 });
  assert.deepEqual([th.text, th.meaning], ['สวัสดี', 'hello'], 'an all-day greeting means hello');
  assert.equal(g({ cc: 'ZZ', hour: 9 }).text, 'Good morning', 'unknown: English');
  assert.equal(P.trThanks({ cc: 'JP' }).roman, 'Arigatō');
  for (const cc of Object.keys(T.countries)) assert.ok(P.TR_GREET[P.trGreetLang(cc)], `${cc}: a greeting language`);
});

test('flags: every spec draws well-formed SVG; no spec falls back to letters; no emoji', () => {
  const TAG = /<(\/?)([a-z]+)((?: [A-Za-z-]+="[^"<>]*")*)\s*(\/?)>/g;
  const wellFormed = (svg) => {
    if (!svg.startsWith('<svg viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">') || !svg.endsWith('</svg>')) return false;
    const stack = [];
    let m, at = 0;
    while ((m = TAG.exec(svg))) {
      if (m.index !== at) return false;   // text between tags
      at = TAG.lastIndex;
      const [, close, name, , self] = m;
      if (!['svg', 'g', 'rect', 'path', 'circle', 'ellipse'].includes(name)) return false;
      if (close) { if (stack.pop() !== name) return false; } else if (!self) stack.push(name);
    }
    return at === svg.length && stack.length === 0;
  };
  let drawn = 0;
  for (const c of Object.values(T.countries)) {
    if (!c.flag) continue;
    const svg = P.trFlagSvg(c.cc);
    assert.ok(wellFormed(svg), `${c.cc}: ${c.flag}`);
    assert.doesNotMatch(svg, /NaN|undefined|Infinity/, c.cc);
    assert.ok(svg.length < 2400, `${c.cc}: ${svg.length} bytes`);
    drawn++;
  }
  assert.ok(drawn >= 220, `${drawn} flags`);
  for (const cc of ['GB', 'US', 'JP', 'FR', 'DE', 'CH', 'SE', 'GR', 'CN', 'CA', 'PT', 'AE', 'IN', 'NP', 'TR', 'BR', 'AU', 'KR']) assert.ok(P.trFlagSvg(cc), cc);
  assert.equal(P.trFlagSvg({ spec: 'h:#000,#f00,#ff0' }).match(/<rect /g).length, 3);
  assert.equal(P.trFlagSvg({ spec: 'h:red,"><script>' }), '', 'bad colours draw nothing');
  assert.equal(P.trFlagSvg({ spec: 'dot:1,2,x,#fff' }), '');
  const chip = P.trFlagHtml('JP', { sheen: true });
  assert.match(chip, /^<span class="tr-flag is-sheen" role="img" aria-label="Flag of Japan" data-cc="JP"><svg /);
  const none = P.trFlagHtml('AQ');
  assert.match(none, /class="tr-flag is-cc"[^>]*>AQ<\/span>$/, 'no spec: the two letters');
  assert.doesNotMatch(P.trFlagHtml('<b>'), /<b>/);
  for (const f of [PLACE_FILES.places, PLACE_FILES.data]) assert.doesNotMatch(readFileSync(f, 'utf8'), /[\u{1F1E6}-\u{1F1FF}]/u, 'no emoji flags');
});

test('the generator builds the tables from a (synthetic) download set', () => {
  const dir = mkdtempSync(join(tmpdir(), 'trdata-'));
  try {
    writeFileSync(join(dir, 'countryInfo.txt'), [
      '#ISO\tISO3\tISO-Numeric\tfips\tCountry\tCapital\tArea\tPopulation\tContinent\ttld\tCurrencyCode\tCurrencyName\tPhone\tPostal\tPostalRe\tLanguages',
      'JP\tJPN\t392\tJA\tJapan\tTokyo\t377835\t1\tAS\t.jp\tJPY\tYen\t81\t\t\tja',
      'PT\tPRT\t620\tPO\tPortugal\tLisbon\t92391\t1\tEU\t.pt\tEUR\tEuro\t351\t\t\tpt-PT,mwl',
    ].join('\n'));
    writeFileSync(join(dir, 'zone.tab'), '# tzdata\nJP\t+353916+1394441\tAsia/Tokyo\nPT\t+3843-00908\tEurope/Lisbon\n');
    writeFileSync(join(dir, 'tzdata.zi'), 'L Asia/Tokyo Japan\n');
    const row = (gid, name, lat, lon, fcode, cc, pop, tz) => [gid, name, name, '', lat, lon, 'P', fcode, cc, '', '', '', '', '', pop, '', '', tz, '2020-01-01'].join('\t');
    writeFileSync(join(dir, 'cities15000.txt'), [row(1, 'Tokyo', 35.69, 139.69, 'PPLC', 'JP', 9733000, 'Asia/Tokyo'), row(2, 'Osaka', 34.69, 135.5, 'PPLA', 'JP', 2592000, 'Asia/Tokyo'),
      row(3, 'Lisbon', 38.72, -9.13, 'PPLC', 'PT', 517000, 'Europe/Lisbon')].join('\n') + '\n');
    writeFileSync(join(dir, 'airports.csv'), 'id,ident,type,name,latitude_deg,longitude_deg,elevation_ft,continent,iso_country,iso_region,municipality,scheduled_service,gps_code,iata_code\n'
      + '1,RJTT,large_airport,"Tokyo Haneda",35.55,139.78,0,AS,JP,JP-13,Tokyo,yes,RJTT,HND\n2,LPPT,large_airport,"Lisbon",38.77,-9.13,0,EU,PT,PT-11,Lisbon,yes,LPPT,LIS\n'
      + '3,XXXX,small_airport,"Strip",35,139,0,AS,JP,JP-13,Nowhere,no,,ZZZ\n');
    const { js, stats } = buildTravelData(dir);
    assert.deepEqual([stats.zones, stats.countries], [2, 2]);
    assert.ok(stats.cities >= 3, 'the three cities, plus any hand-placed tourist places nearby');
    const api = new Function(js + ';return {trPlaceTables};')();
    const t = api.trPlaceTables();
    assert.equal(t.zones['Asia/Tokyo'].city, 'tokyo-jp');
    assert.equal(t.countries.JP.kind, 'towers');
    assert.equal(t.countries.PT.capital, 'lisbon-pt');
    assert.equal(t.airports.HND, 'tokyo-jp');
    assert.equal(t.airports.LIS, 'lisbon-pt');
    assert.equal(t.airports.ZZZ, undefined, 'no scheduled service: left out');
    assert.equal(t.byId.get('lisbon-pt').kind, 'coastal');
    assert.throws(() => buildTravelData(join(dir, 'missing')), /missing countryInfo\.txt/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
