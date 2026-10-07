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
