// The Asia animation packs (src/app/71-anim-asia.js, 72-anim-pack-asia-*.js, 71-anim-asia2-scenes-*.js): every country has a
// full-screen signature and an element, every big city a full-screen opening, every small city an element; they play only where the
// user is (the travel city or the home weather town); nothing leaks elsewhere. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regionSourceFiles } from '../tools/lib/anim-sources.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const PACK_FILES = readdirSync(APP).filter(f => /^72-anim-pack-[a-z0-9-]+\.js$/.test(f)).sort();
const NAMES = ['ASIA_COUNTRIES', 'ASIA_PLACES', 'asiaPlace', 'asiaCountryOf', 'asiaWhere', 'animPacks', 'animSpecialPick', 'animDailyPick'];
const body = ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-delight-library.js', '71-uk-counties.js', '71-anim-texas-scenes.js', ...regionSourceFiles(APP), ...PACK_FILES].map(src).join('\n;\n');
// eslint-disable-next-line no-new-func
const R = new Function(`"use strict";\n${body}\nreturn { ${NAMES.join(', ')} };`)();

const items = R.animPacks().filter(p => /^asia-/.test(p.id)).flatMap(p => p.items);
const day = '2026-10-05';   // a Monday: no festival

test('asia packs: every country has a full-screen signature opening and an element', () => {
  const ccs = Object.keys(R.ASIA_COUNTRIES);
  assert.ok(ccs.length >= 50, `${ccs.length} countries`);
  for (const cc of ccs) {
    const mine = items.filter(i => i.asiaKind === 'country' && i.asiaCc === cc);
    assert.ok(mine.some(i => i.slot === 'opening' && i.asiaSignature && i.full), `${cc}: a full-screen signature opening`);
    assert.ok(mine.some(i => i.slot === 'symbol' && !i.asiaSignature), `${cc}: an element`);
  }
});

test('asia packs: every big city has a full-screen opening, every small city an element', () => {
  for (const p of R.ASIA_PLACES.filter(x => x[5])) {
    const mine = items.filter(i => i.asiaKind === 'city' && i.asiaPlace === p[0]);
    assert.equal(mine.length, 1, `${p[0]}: one item`);
    assert.equal(mine[0].slot, p[5] === 'big' ? 'opening' : 'symbol', p[0]);
    assert.equal(!!mine[0].full, p[5] === 'big', `${p[0]}: only big cities are full screen`);
  }
});

test('asia packs: items are unique, animated and gated by a when() rule', () => {
  assert.ok(items.length >= 250, `${items.length} items`);
  const refs = new Set(), svgs = new Set();
  for (const it of items) {
    assert.equal(typeof it.when, 'function', it.ref);
    assert.ok(it.region.length === 1 && /^[A-Z]{2}$/.test(it.region[0]), it.ref);
    assert.ok(!refs.has(it.ref), `dup ${it.ref}`); refs.add(it.ref);
    const s = it.svg({});
    assert.ok(!svgs.has(s), `${it.ref} draws the same as another item`); svgs.add(s);
    assert.match(s, /class="[^"]*\b(x-[a-z]|x-us)/, `${it.ref} moves`);
  }
});

test('asia packs: where the user is decides what plays', () => {
  const TOKYO = { lat: 35.68, lon: 139.69 }, KYOTO = { lat: 35.01, lon: 135.77 }, SEOUL = { lat: 37.57, lon: 126.98 }, PARIS = { lat: 48.85, lon: 2.35 }, CAIRO = { lat: 30.04, lon: 31.24 };
  assert.equal(R.asiaCountryOf(TOKYO), 'JP'); assert.equal(R.asiaCountryOf(SEOUL), 'KR'); assert.equal(R.asiaCountryOf(PARIS), ''); assert.equal(R.asiaCountryOf(CAIRO), '');
  assert.equal(R.asiaCountryOf({}), ''); assert.equal(R.asiaCountryOf(null), '');
  assert.equal(R.asiaPlace(TOKYO).id, 'tokyo'); assert.equal(R.asiaPlace(KYOTO).id, 'kyoto');
  assert.equal(R.asiaPlace({ lat: 36.5, lon: 138.0 }), null, 'open country is a country, not a place');
  assert.equal(R.asiaWhere(TOKYO).name, 'Tokyo'); assert.equal(R.asiaWhere({ lat: 36.5, lon: 138.0 }).name, 'Japan');
  assert.equal(R.animSpecialPick('opening', day, {}, TOKYO).asiaPlace, 'tokyo', 'a big city wins the opening');
  assert.equal(R.animSpecialPick('symbol', day, {}, TOKYO).asiaCc, 'JP', 'a big city has no symbol: the country element plays');
  assert.equal(R.animSpecialPick('symbol', day, {}, KYOTO).asiaPlace, 'kyoto', 'a small city wins the symbol');
  assert.equal(R.animSpecialPick('opening', day, {}, KYOTO).asiaCc, 'JP', 'and the country signature the opening');
  assert.equal(R.animSpecialPick('opening', day, {}, { city: 'seoul-kr' }).asiaPlace, 'seoul', 'travel to an Asian city');
  assert.equal(R.animSpecialPick('opening', day, {}, PARIS), null);
  assert.equal(R.animSpecialPick('opening', day, { packsOff: ['asia-east'] }, TOKYO), null, 'switched off: nothing');
  for (let i = 0; i < 40; i++) {
    const d = `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`;
    for (const slot of ['opening', 'symbol']) {
      const it = R.animDailyPick(slot, d, {}, { ...PARIS });
      assert.ok(!it || !/^asia-/.test(it.pack), `${d} ${slot}: no Asian item away from Asia`);
    }
  }
});

test('asia places table: unique ids, real countries, coordinates in range, every country has a row', () => {
  const ids = new Set();
  for (const [id, name, cc, lat, lon, kind] of R.ASIA_PLACES) {
    assert.ok(!ids.has(id), `dup ${id}`); ids.add(id);
    assert.ok(R.ASIA_COUNTRIES[cc], `${id}: country ${cc}`);
    assert.ok(name && lat > -12 && lat < 75 && lon > 25 && lon < 180, `${id}: position`);
    assert.ok(['', 'big', 'small'].includes(kind), id);
  }
  for (const cc of Object.keys(R.ASIA_COUNTRIES)) assert.ok(R.ASIA_PLACES.some(p => p[2] === cc), `${cc} has a row`);
});

test('asia packs: travel to a city the world pack draws (Tokyo, Dubai, Singapore) is the world pack\'s', () => {
  for (const city of ['tokyo-jp', 'dubai-ae', 'singapore-sg']) {
    assert.equal(R.asiaCountryOf({ city }), '', city);
    assert.equal(R.asiaPlace({ city }), null, city);
    assert.equal(R.animSpecialPick('opening', day, {}, { city }).pack, 'world', city);
  }
  assert.equal(R.asiaPlace({ lat: 35.68, lon: 139.69 }).id, 'tokyo', 'at home in Tokyo the full scene plays');
});
