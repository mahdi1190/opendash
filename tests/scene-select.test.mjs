// Selection rules per region (docs/dev/SCENE_ENGINE.md section 9): the dense rule (arrival by dwell or a fresh fix, journeys,
// weighted seeded rotation, fallbacks) and a fake dense region through region.select and its when() hooks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const G = loadRegistry(ROOT).R.get;
const sel = (input) => G('sceneSelect')('dense', input);
// a toy grid of stations about 600 m apart (0.0054 deg of latitude), an area and two units
const ST = [0, 1, 2, 3, 4, 5].map(i => ({ id: 's' + i, name: 'S' + i, kind: 'station', lat: 10 + i * 0.0054, lon: 20, unit: i < 3 ? 'AA' : 'BB' }));
const PLACES = ST.concat([{ id: 'area1', name: 'Area', kind: 'area', lat: 10.05, lon: 20, unit: 'BB' }]);
const NOW = Date.UTC(2026, 9, 7, 12);
const at = (lat, lon, ago, acc = 20) => ({ lat, lon, acc, at: NOW - ago * 60000 });

test('arrival: a dwell near a station, or a fresh accurate fix; the station just arrived at wins', () => {
  const dwell = sel({ now: NOW, places: PLACES, fix: at(10.0001, 20, 10), track: [at(10.0002, 20, 8), at(10.0001, 20, 4)], seen: {}, params: {}, seed: 1 });
  assert.equal(dwell.kind, 'arrival'); assert.equal(dwell.id, 's0');
  const fresh = sel({ now: NOW, places: PLACES, fix: at(10.0108, 20, 0.5), track: [], seen: {}, params: {}, seed: 1 });
  assert.deepEqual([fresh.kind, fresh.id], ['arrival', 's2']);
  const stale = sel({ now: NOW, places: PLACES, fix: at(10.0108, 20, 30), track: [], seen: {}, params: {}, seed: 1 });
  assert.notEqual(stale.kind, 'arrival', 'an old fix with no dwell is not an arrival');
  const coarse = sel({ now: NOW, places: PLACES, fix: { lat: 10.0108, lon: 20, acc: 1000, at: 0 }, track: [], seen: {}, params: {}, seed: 1 });
  assert.notEqual(coarse.kind, 'arrival', 'a coarse fix (at 0) is never an arrival');
});

test('journey after 4 stations in the window, in order', () => {
  const track = [0, 1, 2, 3, 4].map((i, k) => at(10 + i * 0.0054, 20, 40 - k * 5));
  const r = sel({ now: NOW, places: PLACES, fix: at(10.03, 20.01, 1, 400), track, seen: {}, params: {}, seed: 1 });
  assert.equal(r.kind, 'journey'); assert.deepEqual(r.ids, ['s0', 's1', 's2', 's3', 's4']); assert.equal(r.id, 's4');
});

test('rotation: commute stations less, new ones more, recent ones less; stable within a slot', () => {
  const fix = { lat: 10.0081, lon: 20.004, acc: 1000, at: 0 };   // between s1 and s2, not an arrival
  const base = { now: NOW, places: PLACES, fix, track: [], params: {} };
  const count = (seen) => { const c = {}; for (let i = 0; i < 400; i++) { const r = sel(Object.assign({}, base, { seen, seed: 'd:' + i })); c[r.id] = (c[r.id] || 0) + 1; } return c; };
  const even = count({ s0: { days30: 1, lastAt: NOW - 9e8 }, s1: { days30: 1, lastAt: NOW - 9e8 }, s2: { days30: 1, lastAt: NOW - 9e8 }, s3: { days30: 1, lastAt: NOW - 9e8 } });
  const commute = count({ s0: { days30: 1, lastAt: NOW - 9e8 }, s1: { days30: 20, lastAt: NOW - 9e8 }, s2: { days30: 1, lastAt: NOW - 9e8 }, s3: { days30: 1, lastAt: NOW - 9e8 } });
  assert.ok((commute.s1 || 0) < (even.s1 || 0) * 0.6, 'a commute station is picked less');
  const fresh = count({ s0: { days30: 1, lastAt: NOW - 9e8 }, s2: { days30: 1, lastAt: NOW - 9e8 }, s3: { days30: 1, lastAt: NOW - 9e8 } });
  assert.ok((fresh.s1 || 0) > (even.s1 || 0) * 1.25, 'a never-shown station is picked more');
  const recent = count({ s0: { days30: 1, lastAt: NOW - 9e8 }, s1: { days30: 1, lastAt: NOW - 3600000 }, s2: { days30: 1, lastAt: NOW - 9e8 }, s3: { days30: 1, lastAt: NOW - 9e8 } });
  assert.ok((recent.s1 || 0) < (even.s1 || 0) * 0.6, 'a station shown in the last day is picked less');
  const a = sel(Object.assign({}, base, { seen: {}, seed: 'x' })), b = sel(Object.assign({}, base, { seen: {}, seed: 'x' }));
  assert.equal(a.id, b.id, 'seeded: stable within a slot');
});

test('fallbacks: the area, then the borough, then the region; unknown rules run nearest', () => {
  assert.equal(sel({ now: NOW, places: PLACES, fix: { lat: 10.052, lon: 20, at: 0 }, track: [], seen: {}, params: {}, seed: 1 }).kind, 'area');
  const b = sel({ now: NOW, places: PLACES, fix: { lat: 10.2, lon: 20, at: 0 }, track: [], seen: {}, params: {}, seed: 1 });
  assert.equal(b.kind, 'borough');
  assert.equal(sel({ now: NOW, places: [], fix: { lat: 10.2, lon: 20, at: 0 }, track: [], seen: {}, params: {}, seed: 1 }).kind, 'region');
  assert.equal(sel({ now: NOW, places: PLACES, fix: null }).kind, 'region');
  assert.equal(G('sceneSelect')('no-such-rule', { places: PLACES, fix: { lat: 10.0001, lon: 20 }, params: { placeKm: 1 } }).id, 's0');
});

test('a fake dense region: select(ctx) and the when() hooks; regions without select are unchanged', () => {
  const R = G('animRegionDefine')({ id: 'densetoy', name: 'Dense toy', unitWord: 'borough', unitKm: 20, units: { AA: ['Alpha', 'g'], BB: ['Beta', 'g'] }, country: 'XY',
    places: ST.map(p => [p.id, p.name, p.unit, p.lat, p.lon, 'station']).concat([['area1', 'Area', 'BB', 10.05, 20, 'area'], ['anchor', 'Anchor', 'AA', 10.001, 20.001, 'big']]),
    select: { rule: 'dense', params: {}, kinds: ['station', 'area'] } });
  assert.deepEqual(R.check({ worldCities: [] }).filter(x => !/overlap|starter/.test(x)), []);
  const ctx = { now: NOW, fix: at(10.0108, 20, 0.5) };
  assert.equal(R.select(ctx).id, 's2'); assert.equal(R.select(ctx), R.select(ctx), 'cached per (ctx, minute)');
  const B = R.builder('g');
  B.place('anchor', { id: 'skyline', label: 'Anchor', colour: 'blue', tags: [], svg: () => '<rect/>' });
  const it = B.items[0];
  assert.equal(it.when('2026-10-07', ctx), false);
  assert.equal(it.when('2026-10-07', { now: NOW, fix: at(10.001, 20.001, 0.2) }), true, 'the anchor plays when it is the arrival');
  assert.equal(R.select({ lat: 0, lon: 0 }), null, 'outside the region: no selection');
});
