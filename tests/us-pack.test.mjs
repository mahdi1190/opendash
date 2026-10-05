// The US animation packs (src/app/71-anim-us.js, 72-anim-pack-us-*.js): every state has a
// signature and an element, every art place has an item, they play only where the user is
// (the travel city or the home weather town), and Texas stays the Texas pack's. Synthetic data only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regionSourceFiles } from '../tools/lib/anim-sources.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app');
const src = (f) => readFileSync(join(APP, f), 'utf8');
const PACK_FILES = readdirSync(APP).filter(f => /^72-anim-pack-[a-z0-9-]+\.js$/.test(f)).sort();
const NAMES = ['US_STATES', 'US_PLACES', 'usPlace', 'usStateOf', 'usWhere', 'animPacks', 'animSpecialPick', 'animDailyPick', 'animItems'];
const body = ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-delight-library.js', '71-uk-counties.js', '71-anim-texas-scenes.js', ...regionSourceFiles(APP), ...PACK_FILES].map(src).join('\n;\n');
// eslint-disable-next-line no-new-func
const R = new Function(`"use strict";\n${body}\nreturn { ${NAMES.join(', ')} };`)();

const usItems = R.animPacks().filter(p => /^us-/.test(p.id)).flatMap(p => p.items);
const day = '2026-10-05';   // a Monday: no festival

test('us packs: 49 states (Texas has its own pack) each have a signature opening and an element', () => {
  const states = Object.keys(R.US_STATES).filter(s => s !== 'TX');
  assert.equal(states.length, 49);
  for (const st of states) {
    const mine = usItems.filter(i => i.usKind === 'state' && i.usState === st);
    assert.ok(mine.some(i => i.slot === 'opening' && i.usSignature), `${st}: a signature opening`);
    assert.ok(mine.some(i => i.slot === 'symbol' && !i.usSignature), `${st}: an element`);
  }
  assert.ok(R.animPacks().some(p => p.id === 'texas'), 'Texas keeps its own pack');
});

test('us packs: every art place has an item, big = opening, small = symbol', () => {
  for (const p of R.US_PLACES.filter(x => x[5])) {
    const mine = usItems.filter(i => i.usKind === 'city' && i.usPlace === p[0]);
    assert.equal(mine.length, 1, `${p[0]}: one item`);
    assert.equal(mine[0].slot, p[5] === 'big' ? 'opening' : 'symbol', p[0]);
  }
});

test('us packs: items are unique, animated, US-only and gated by a when() rule', () => {
  assert.ok(usItems.length >= 200, `${usItems.length} items`);
  const refs = new Set(), svgs = new Set();
  for (const it of usItems) {
    assert.equal(typeof it.when, 'function', it.ref);
    assert.deepEqual(it.region, ['US'], it.ref);
    assert.ok(!refs.has(it.ref), `dup ${it.ref}`); refs.add(it.ref);
    const s = it.svg({});
    assert.ok(!svgs.has(s), `${it.ref} draws the same as another item`); svgs.add(s);
    assert.match(s, /class="[^"]*\bx-[a-z]/, `${it.ref} moves`);
  }
});

test('us packs: where the user is decides what plays', () => {
  const SEATTLE = { lat: 47.61, lon: -122.33 }, DENVER = { lat: 39.74, lon: -104.99 }, LEAVEN = { lat: 47.6, lon: -120.66 }, HOUSTON = { lat: 29.76, lon: -95.37 }, LONDON = { lat: 51.5, lon: -0.12 };
  assert.equal(R.usStateOf(SEATTLE), 'WA'); assert.equal(R.usStateOf(DENVER), 'CO'); assert.equal(R.usStateOf(HOUSTON), 'TX');
  assert.equal(R.usStateOf(LONDON), ''); assert.equal(R.usStateOf({}), ''); assert.equal(R.usStateOf(null), '');
  assert.equal(R.usPlace(SEATTLE).id, 'seattle'); assert.equal(R.usPlace(LEAVEN).id, 'leavenworth');
  assert.equal(R.usPlace({ lat: 46.0, lon: -119.0 }), null, 'open country is a state, not a place');
  assert.equal(R.animSpecialPick('opening', day, {}, SEATTLE).usPlace, 'seattle', 'a big city wins the opening');
  assert.equal(R.animSpecialPick('symbol', day, {}, SEATTLE).usState, 'WA', 'a big city has no symbol: the state element plays');
  assert.equal(R.animSpecialPick('symbol', day, {}, LEAVEN).usPlace, 'leavenworth', 'a small town wins the symbol');
  assert.equal(R.animSpecialPick('opening', day, {}, LEAVEN).usState, 'WA', 'and the state signature the opening');
  assert.equal(R.animSpecialPick('opening', day, {}, { city: 'denver-us' }).usPlace, 'denver', 'travel to a US city');
  assert.equal(R.animSpecialPick('opening', day, {}, { ...HOUSTON }).pack, 'texas', 'Texas is the Texas pack');
  assert.equal(R.animSpecialPick('opening', day, {}, { ...LONDON }), null);
  assert.equal(R.animSpecialPick('opening', day, { packsOff: ['us-pacific'] }, SEATTLE), null, 'switched off: nothing');
  for (let i = 0; i < 40; i++) {
    const d = `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + i % 28).padStart(2, '0')}`;
    for (const slot of ['opening', 'symbol']) {
      const it = R.animDailyPick(slot, d, {}, { ...LONDON });
      assert.ok(!it || !/^us-/.test(it.pack), `${d} ${slot}: no US item away from the US`);
    }
  }
});

test('us places table: unique ids, real states, coordinates in range, every state has an anchor', () => {
  const ids = new Set();
  for (const [id, name, st, lat, lon, kind] of R.US_PLACES) {
    assert.ok(!ids.has(id), `dup ${id}`); ids.add(id);
    assert.ok(R.US_STATES[st] || st === 'DC', `${id}: state ${st}`);
    assert.ok(name && lat > 18 && lat < 72 && lon < -66 && lon > -170, `${id}: position`);
    assert.ok(['', 'big', 'small'].includes(kind), id);
  }
  for (const st of Object.keys(R.US_STATES)) assert.ok(R.US_PLACES.some(p => p[2] === st), `${st} has a row`);
});
