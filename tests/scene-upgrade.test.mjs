// The upgrade registry (docs/dev/SCENE_ENGINE.md 16.2), with a fake region and inline test objects: a draft keeps the legacy item and adds
// `upgrade`; a live upgrade becomes a composed item with the SAME identity plus legacySvg, and is not retrofitted; an orphan upgrade is
// reported by region.check(); nothing is built at load.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const G = loadRegistry(ROOT).R.get;
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
G('sceneObjDefine')({ id: 'landmark.uptest', category: 'landmark', size: [200, 380], variants: 1, seasonal: false, flippable: false, tags: ['landmark', 'place:uptest/place:big-town'],
  build: () => ({ body: [['#667788', rect(-100, -380, 200, 380)]] }) });
let built = 0;
const sceneOf = () => { built++; return { v: 1, id: 'uptest', view: { horizon: 500 }, place: [{ obj: 'landmark.uptest', x: 800, y: 700, layer: 'mid' }] }; };
const svgOld = () => '<rect class="old"/>';
G('animRegionSceneAdd')('uptest', { key: 'place:big-town', label: 'Big Town skyline', site: 'the harbour', colour: 'blue', mood: 'calm', tags: ['harbour'], svg: svgOld });
G('animRegionSceneAdd')('uptest', { key: 'unit:BB', label: 'Bee land', site: 'the hills', colour: 'green', mood: 'calm', tags: ['hills'], svg: svgOld });
G('animRegionSceneUpgrade')('uptest', 'place:big-town', { state: 'live', archetype: 'basic', landmarks: ['landmark.uptest'], scene: sceneOf });
G('animRegionSceneUpgrade')('uptest', 'unit:BB', { state: 'draft', archetype: 'basic', landmarks: [], scene: sceneOf });
G('animRegionSceneUpgrade')('uptest', 'place:nowhere', { state: 'draft', archetype: 'basic', scene: sceneOf });
const R = G('animRegionDefine')({ id: 'uptest', name: 'Up test', unitKm: 50, units: { AA: ['Ay', 'g'], BB: ['Bee', 'g'] }, country: 'XY',
  places: [['big-town', 'Big Town', 'AA', 12, 30, 'big'], ['bee-row', 'Bee Row', 'BB', 13, 31, ''], ['bee-row2', 'Bee Row 2', 'BB', 13.2, 31.2, '']] });
const B = R.builder('g');
B.scenes();
const byId = Object.fromEntries(B.items.map(i => [i.id, i]));

test('nothing is built at load; the live upgrade keeps the identity and becomes composed, with legacySvg and no retrofit', () => {
  assert.equal(built, 0, 'upgrade thunks run only when shown or linted');
  const it = byId['big-town-skyline'];
  assert.ok(it, Object.keys(byId).join(','));
  assert.equal(it.composed, true); assert.equal(it.full, true); assert.equal(it.rich, true);
  assert.equal(it.label, 'Big Town skyline, Big Town'); assert.equal(it.site, 'the harbour'); assert.ok(it.tags.includes('harbour'));
  assert.equal(it.uptestPlace, 'big-town'); assert.equal(it.uptestKind, 'city'); assert.equal(typeof it.when, 'function');
  assert.equal(it.legacySvg, svgOld); assert.equal(it.retro, undefined, 'a live upgrade is not retrofitted');
  assert.deepEqual(it.upgrade, { state: 'live', archetype: 'basic', landmarks: ['landmark.uptest'] });
  assert.deepEqual(it.liveSky, { lat: 12, lon: 30 });
  const data = G('sceneData')(it);
  assert.equal(built, 1); assert.deepEqual([data.view.lat, data.view.lon], [12, 30], 'view lat / lon default to the row');
  assert.match(it.svg({ size: 'fill', lighting: false }), /<g class="sc-svg">/);
  const v = G('animValidatePack')(B.pack({ id: 'uptest-g', name: 'Up test' }));
  assert.equal(v.ok, true, v.errors.join('; '));
});

test('a draft keeps the legacy (retrofitted) item and adds upgrade; liveSky is the mean of a unit\'s rows without a big row', () => {
  const it = byId['bb-signature'];
  assert.ok(it && !it.composed);
  assert.equal(it.upgrade.state, 'draft'); assert.equal(typeof it.upgrade.scene, 'function');
  assert.equal(it.svg({ size: 'fill' }), '<rect class="old"/>', 'byte-identical without a live sky');
  assert.deepEqual(it.liveSky, { lat: 13.1, lon: 31.1 });
  assert.deepEqual(R.upgrades().map(u => u.key + ':' + u.state), ['place:big-town:live', 'place:nowhere:draft', 'unit:BB:draft']);
});

test('region.check() reports an upgrade with no scene entry, and a duplicate upgrade', () => {
  G('animRegionSceneUpgrade')('uptest', 'unit:BB', { state: 'draft', scene: sceneOf });
  const out = R.check({ worldCities: [] });
  assert.ok(out.some(x => /^upgrade place:nowhere: no scene entry/.test(x)), out.join('\n'));
  assert.ok(out.some(x => /DUPLICATE UPGRADE unit:BB/.test(x)));
  assert.throws(() => G('animRegionSceneUpgrade')('uptest', 'bad key', { state: 'live', scene: sceneOf }), /key/);
  assert.throws(() => G('animRegionSceneUpgrade')('uptest', 'place:x', { state: 'maybe', scene: sceneOf }), /draft or live/);
});

test('a pack that is not a region (16.2, last bullet) registers under its pack id and applies its upgrade with animSceneUpgradeFinish, as a region does', () => {
  const fin = G('animSceneUpgradeFinish');
  assert.equal(typeof fin, 'function', 'the registry has animSceneUpgradeFinish');
  let retros = 0;
  const retro = (x) => { retros++; return Object.assign(x, { retro: {} }); };
  const item = (id) => ({ id, full: true, label: id + ' skyline', site: 'the river', tags: ['river'], svg: svgOld, liveSky: { lat: 32.8, lon: -96.8 } });
  G('animRegionSceneUpgrade')('uppack', 'place:live-town', { state: 'live', archetype: 'basic', landmarks: ['landmark.uptest'], scene: sceneOf });
  G('animRegionSceneUpgrade')('uppack', 'place:draft-town', { state: 'draft', archetype: 'basic', landmarks: [], scene: sceneOf });
  // no upgrade for the key: only the pack's own retrofit
  const plain = fin('uppack', 'place:other-town', item('a'), null, retro);
  assert.equal(retros, 1); assert.equal(plain.upgrade, undefined); assert.deepEqual(plain.retro, {});
  // a draft: the retrofitted hand-drawn item, plus item.upgrade for the tools (--upgrades)
  const draft = fin('uppack', 'place:draft-town', item('b'), null, retro);
  assert.equal(retros, 2); assert.ok(!draft.composed); assert.equal(draft.svg, svgOld);
  assert.equal(draft.upgrade.state, 'draft'); assert.equal(draft.upgrade.scene, sceneOf); assert.deepEqual(draft.retro, {});
  // live: composed, the same identity, the art kept as legacySvg, never retrofitted; nothing built until shown; view lat / lon from the sky
  const n = built, live = fin('uppack', 'place:live-town', item('c'), { lat: 32.8, lon: -96.8 }, retro);
  assert.equal(retros, 2, 'a live upgrade is not retrofitted'); assert.equal(built, n, 'nothing is built until shown');
  assert.equal(live.composed, true); assert.equal(live.full, true); assert.equal(live.id, 'c'); assert.equal(live.label, 'c skyline'); assert.equal(live.site, 'the river');
  assert.equal(live.legacySvg, svgOld); assert.equal(live.retro, undefined); assert.equal(live.reduced, 'static');
  assert.deepEqual(live.upgrade, { state: 'live', archetype: 'basic', landmarks: ['landmark.uptest'] });
  const data = G('sceneData')(live);
  assert.deepEqual([data.view.lat, data.view.lon], [32.8, -96.8]);
});

test('texas/dallas-skyline: its upgrade registers under the texas pack id and the Texas pack applies it, keeping the item\'s identity', () => {
  const REG = loadRegistry(ROOT), R = REG.R.get;
  const LEGACY = loadRegistry(ROOT, { omit: REG.files.filter(f => /^71-scene-upgrade-/.test(f)) });
  const up = (R('_ANIM_REGION_UPGRADES').texas || {})['place:dallas'];
  assert.ok(up, 'registered as animRegionSceneUpgrade(\'texas\', \'place:dallas\', ...)');
  assert.equal(up.archetype, 'skyline-water');
  const entry = REG.items().find(e => e.ref === 'texas/dallas-skyline'), old = LEGACY.items().find(e => e.ref === 'texas/dallas-skyline');
  assert.ok(entry && old && entry.full && old.full);
  const it = entry.item;
  if (up.state === 'live') {
    assert.equal(it.composed, true); assert.equal(typeof it.legacySvg, 'function'); assert.equal(it.retro, undefined, 'a live upgrade is not retrofitted');
  } else {
    assert.ok(!it.composed, 'a draft: the app keeps the hand-drawn art'); assert.ok(it.retro && typeof it.retro === 'object', 'still retrofitted');
    assert.equal(it.upgrade && it.upgrade.state, 'draft', 'the Texas pack applied its draft upgrade'); assert.equal(typeof it.upgrade.scene, 'function');
    assert.equal(it.svg({ size: 'fill' }), old.item.svg({ size: 'fill' }), 'the same hand-drawn art without a live sky');
  }
  // the identity: id, label, site, tags, rotation and the Texas place fields are the item built without any upgrade file
  const id = (x) => Object.fromEntries(['id', 'label', 'site', 'tags', 'priority', 'slot', 'region', 'colour', 'mood', 'texasKind', 'txTown', 'worldKind', 'liveSky'].map(k => [k, x[k]]).concat([['when', String(x.when)]]));
  assert.deepEqual(id(it), id(old.item));
  // the composed scene: built on its archetype, valid, and it places the landmarks it names
  const data = up.state === 'live' ? it.scene() : it.upgrade.scene();
  assert.equal(data.arch && data.arch.id, 'skyline-water');
  assert.deepEqual(R('sceneValidate')(data), []);
  const C = R('sceneCompile')(data, { lod: 1 });
  for (const lm of up.landmarks) assert.ok(C.items.some(x => x.o === lm), lm + ' is placed');
  assert.deepEqual(up.landmarks, ['landmark.bank-of-america-plaza', 'landmark.reunion-tower', 'landmark.margaret-hunt-hill-bridge']);
});
