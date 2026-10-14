// World engine, package kb: the STYLE KITS (docs/dev/WORLD_ENGINE.md 12.3 'Style kits'; requirements N1, N2, N3). Every kit names
// only real, approved library objects; weak objects (blob, lollipop and stacked-ball trees, placeholder planks) never appear;
// dome trees only in the distant band; the fill draws from the kit by default and never falls back to a stand-in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const SETTINGS = ['canal', 'pond', 'heath', 'woodland', 'village-green', 'river-city', 'civic-square', 'quayside', 'terraced-street', 'park', 'moor', 'coast'];

test('the twelve settings of N1 each have a kit; every kit is sound (no missing, weak, dome, trunk, wrong-class, foreign or careless object)', () => {
  for (const n of ['worldKit', 'worldKitIds', 'worldKitCheck', 'worldKitFillStyle']) assert.equal(typeof W[n], 'function', n);
  for (const k of SETTINGS) assert.ok(W.worldKit(k), 'a kit for ' + k);
  const problems = W.worldKitCheck();
  assert.deepEqual(problems.map(p => p.msg), [], 'every kit entry is a real, approved library object');
  // every kit dresses the surfaces the fill needs, frames, and knows its backdrop, sky share, depth layers and life
  for (const k of SETTINGS) {
    const K = W.worldKit(k);
    for (const g of ['grass', 'paving', 'path', 'water']) assert.ok(K.fill[g], `${k} dresses ${g}`);
    assert.ok(Array.isArray(K.frame) && K.frame.length >= 2, k + ' has at least two framing options');
    assert.ok(W.WORLD_BACKDROP_STYLES[K.backdrop], k + ' backdrop ' + K.backdrop);
    assert.ok(Array.isArray(K.sky) && K.sky[0] < K.sky[1] && K.layers >= 5, k + ' composition targets');
    assert.ok(K.life && K.life.walk && K.life.walk.who, k + ' has people');
    assert.ok(W.worldKitIds(k).length >= 25, k + ' is a curated set, not a token list: ' + W.worldKitIds(k).length);
  }
});

test('the check fails LOUDLY on every class of bad kit entry (the baseline bug: a style named plant.rph-hazel-coppice, which does not exist)', () => {
  const bad = { place: 'park', backdrop: 'woodland', fill: { grass: { near: [['plant.rph-hazel-coppice', 1], ['tree.pond-oak', 1], ['tree.bank-oak', 1], ['tree.shp-trunk', 1], ['boat.narrowboat', 1], ['tree.texas-live-oak', 1]] },
    paving: {}, path: {}, water: { calm: [['plant.reed', 1]] } }, edges: {}, frame: [{ kind: 'bough', bough: 'plant.reed', trunk: 'tree.oak' }] };
  const rules = W.worldKitCheck({ kits: { bad } }).map(p => p.rule + ':' + p.id);
  for (const r of ['kitMissing:plant.rph-hazel-coppice', 'kitWeak:tree.pond-oak', 'kitDome:tree.bank-oak', 'kitTrunk:tree.shp-trunk', 'kitClass:boat.narrowboat', 'kitRegion:tree.texas-live-oak', 'kitClass:plant.reed'])
    assert.ok(rules.includes(r), r + ' in ' + rules.join(' '));
  // the lesson's weak trees are on the excluded list
  for (const id of ['tree.pond-wood', 'tree.pond-oak', 'tree.pool-oak', 'tree.birch-heath', 'ground.log']) assert.ok(W.WORLD_KIT_WEAK[id], id + ' is excluded');
});

test('the fill styles ARE the kits: every legacy style name maps to a kit, and the fill names no object the kit does not', () => {
  for (const [k, st] of Object.entries(W.WORLD_FILL_STYLES)) {
    assert.ok(st.kit && W.WORLD_STYLE_KITS[st.kit], k + ' comes from a kit');
    const kitIds = new Set(W.worldKitIds(st.kit).map(s => s.id));
    const walk = (o, path) => {
      if (Array.isArray(o)) { if (o.length === 2 && typeof o[0] === 'string' && typeof o[1] === 'number') assert.ok(kitIds.has(o[0]), `${k} ${path}: ${o[0]} is not in kit ${st.kit}`); else o.forEach((x, i) => walk(x, path + '[' + i + ']')); }
      else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, path + '.' + kk);
    };
    walk({ fill: st.fill, edges: st.edges, rich: st.rich }, k);
  }
  for (const legacy of ['canal-wooded', 'pond', 'woodland', 'heath', 'downs', 'farmland', 'coast', 'park', 'town-low', 'city-victorian', 'city-sheffield-hills', 'city-manchester-towers'])
    assert.ok(W.WORLD_FILL_STYLES[legacy], legacy + ' still resolves');
});

test('a world filled by default uses only its kit objects (and the author\'s): a new place inherits gold-standard parts', () => {
  const spec = { v: 3, place: { lat: 51.29, lon: -0.82, region: 'hampshire', style: 'canal' }, camera: { eye: 1.65, fov: 62, horizon: 470, heading: 200, water: -0.4 },
    surfaces: [{ id: 'land', kind: 'grass', poly: [[-300, 1], [300, 1], [300, 400], [-300, 400]] }, { id: 'cut', kind: 'water', water: 'canal', poly: [[-12, 1], [-3, 1], [-1, 400], [-10, 400]] },
      { id: 'tow', kind: 'towpath', path: [[0.5, 1], [2, 200], [3, 400]], width: 2.6 }], seed: 5 };
  const world = W.worldBuild(spec, { validate: false });
  const kitIds = new Set(W.worldKitIds('canal').map(s => s.id));
  const auto = world.entities.filter(e => e.auto);
  assert.ok(auto.length > 80, 'filled: ' + auto.length);
  const foreign = [...new Set(auto.filter(e => !kitIds.has(e.obj)).map(e => e.obj))];
  assert.deepEqual(foreign, [], 'every auto object comes from the canal kit');
  for (const e of auto) assert.ok(!W.WORLD_KIT_WEAK[e.obj], 'no weak object: ' + e.obj);
  // dome trees only beyond the far band
  for (const e of auto) if (W.WORLD_KIT_DISTANT_ONLY.includes(e.obj) && (W.worldKb(e.obj) || {}).cls === 'tree') assert.ok(e.z >= 110, `${e.obj} at ${e.z} m (distant only)`);
});

test('a kit entry for a missing object is skipped and logged, never replaced by a weaker stand-in', () => {
  const st = W.WORLD_FILL_STYLES.canal;
  // a world whose style names a missing object: the fill logs kitMissing and places none of it
  const fake = JSON.parse(JSON.stringify(st));
  fake.fill.grass.near = [['plant.no-such-thing', 5]];
  const spec = { v: 3, place: { lat: 51.29, lon: -0.82, region: 'hampshire' }, camera: { eye: 1.65, fov: 62, horizon: 470, heading: 0 },
    surfaces: [{ id: 'land', kind: 'grass', poly: [[-300, 1], [300, 1], [300, 400], [-300, 400]] }], seed: 2 };
  const world = W.worldBuild(spec, { validate: false, fill: false });
  const log = W.worldFill(world, { styleRecord: fake });
  assert.ok(log.some(l => l.rule === 'kitMissing' && /plant\.no-such-thing/.test(l.reason)), 'logged');
  assert.equal(world.entities.filter(e => e.obj === 'plant.no-such-thing').length, 0);
});
