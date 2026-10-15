// World engine, package kb (docs/dev/WORLD_ENGINE.md 1.3, 15.3; requirements K1-K9, S1, S4, V3): the knowledge base the
// engine reads. One case per K rule, the when / state rules across a year at Fleet and at Sheffield, and every library object.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const W = loadWorld(ROOT);
const FLEET = { lat: 51.2905, lon: -0.8228, region: 'hampshire' };
const SHEFFIELD = { lat: 53.3911, lon: -1.4702, region: 'south-yorkshire' };
const MANCHESTER = { lat: 53.4794, lon: -2.2453, region: 'greater-manchester' };
const LONDON = { lat: 51.5074, lon: -0.1278 };

/** A literal WorldTimeCtx (WORLD_ENGINE.md 11.11) at an ISO time and a place: a rough sun, UK monthly temperatures, clear sky. */
function ctxAt(iso, place, o = {}) {
  const d = new Date(iso), y0 = Date.UTC(d.getUTCFullYear(), 0, 1), doy = Math.floor((d.getTime() - y0) / 86400000) + 1;
  const month = d.getUTCMonth() + 1, hour = d.getUTCHours() + d.getUTCMinutes() / 60, dow = d.getUTCDay(), lat = place.lat, lon = place.lon;
  const decl = 23.44 * Math.sin(2 * Math.PI * (284 + doy) / 365) * Math.PI / 180, ha = ((hour + lon / 15) - 12) * 15 * Math.PI / 180, la = lat * Math.PI / 180;
  const alt = Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha)) * 180 / Math.PI;
  const mean = [5, 5, 7, 9, 12, 15, 17, 17, 14, 11, 8, 5][month - 1] - (lat - 51.5) * 0.6, temp = mean + 4 * Math.sin((hour - 9) / 24 * 2 * Math.PI);
  const season = month <= 2 || month === 12 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn';
  return Object.assign({ ms: d.getTime(), lat, lon, month, doy, hour, dow, weekend: dow === 0 || dow === 6, season, weather: 'clear', cover: 0.2, temp,
    snowDay: false, snowing: false, frost: false, wind: { dir: 240, s: 3 }, sun: { az: 180, alt }, moon: { az: 0, alt: -10, illum: 0.5 }, dark: alt < -4 }, o);
}
const probe = (kind, extra) => Object.assign({ kind, tags: W.worldKbSurfaceTags(kind) }, extra || {});

test('the kb interface is loaded and every world class has a descriptor', () => {
  for (const n of ['worldKb', 'worldKbClassOf', 'worldKbSurfaceTags', 'worldKbHabitatOk', 'worldKbOrient', 'worldKbWhen', 'worldKbState', 'worldKbDensity',
    'worldKbSize', 'worldKbVariant', 'worldKbRegionOk', 'worldKbCare', 'worldKbParentOk', 'worldKbAreas']) assert.equal(typeof W[n], 'function', n);
  assert.ok(Array.isArray(W.WORLD_KB_TAGS) && W.WORLD_KB_TAGS.includes('water-margin') && W.WORLD_KB_TAGS.includes('grass-edge'));
  // every class of the core's _wcClass, plus the attached, seasonal and transport classes of the brief
  const need = ['person', 'cyclist', 'boat', 'train', 'tram', 'vehicle', 'bird-air', 'kingfisher', 'heron', 'swan', 'goose', 'coot', 'grebe', 'duck', 'gull', 'dog',
    'grazer', 'fish', 'bird', 'animal', 'air', 'tree', 'reed', 'hedge', 'shrub', 'cover', 'rock', 'walkway', 'rail-kit', 'weir', 'gate', 'fence', 'structure',
    'landmark', 'building', 'bench', 'lamp', 'post', 'street', 'bough', 'frond', 'lead', 'mooring-line', 'smoke', 'washing-line', 'window-light', 'flower',
    'insect', 'lily', 'fish-ring', 'market-stall', 'cafe-table', 'umbrella', 'picnic', 'car', 'van', 'bus', 'signage'];
  const SOL = ['solid', 'walkable', 'water', 'passable', 'overhead'];
  for (const c of need) {
    const d = W.WORLD_KB_CLASSES[c];
    assert.ok(d, 'no class ' + c);
    assert.ok(d.habitat && Array.isArray(d.habitat.on) && d.habitat.on.length, c + ' habitat');
    for (const t of d.habitat.on.concat(d.habitat.avoid || [])) assert.ok(W.WORLD_KB_TAGS.includes(t), `${c}: unknown tag ${t}`);
    assert.ok(['disc', 'box'].includes(d.foot), c + ' foot');
    assert.ok(SOL.includes(d.solidity), c + ' solidity');
    assert.ok(typeof d.clearance === 'number' && d.clearance >= 0, c + ' clearance');
    assert.ok(['bank', 'lane', 'rail', 'path', 'view', 'street', 'fence', 'free'].includes(d.orient), c + ' orient');
    assert.ok(d.group && typeof d.group.kind === 'string', c + ' group');
    assert.ok(d.anim && Array.isArray(d.anim.clips) && typeof d.anim.stiffness === 'number', c + ' anim');
    const k = W.worldKb(c);
    assert.ok(k && k.cls === c, 'worldKb of the class name ' + c);
  }
  for (const a of ['lead', 'mooring-line', 'smoke', 'washing-line', 'window-light', 'bough', 'frond']) assert.ok(W.WORLD_KB_CLASSES[a].parent, a + ' needs a parent');
});

test('every library object with a real size resolves to a class and a descriptor; overrides name real objects', () => {
  const objs = W.sceneObjs();
  assert.ok(objs.length > 500);
  let n = 0;
  for (const o of objs) {
    const real = W.sceneObjReal(o.id);
    if (!(real && real.h > 0 && real.src !== 'class')) continue;
    n++;
    const cls = W.worldKbClassOf(o.id), kb = W.worldKb(o.id);
    assert.ok(cls && W.WORLD_KB_CLASSES[cls], `${o.id}: no class (${cls})`);
    assert.ok(kb && kb.cls === cls && kb.id === o.id, `${o.id}: no descriptor`);
    assert.ok(Array.isArray(kb.size.h) && kb.size.h[0] > 0 && kb.size.h[0] <= kb.size.h[1], `${o.id}: size range`);
    assert.ok(kb.size.l > 0 && kb.size.w > 0, `${o.id}: footprint size`);
    assert.ok(kb.material && Object.keys(kb.material).length, `${o.id}: no material map`);
    assert.ok(Object.isFrozen(kb) && Object.isFrozen(kb.habitat), `${o.id}: not frozen`);
    assert.equal(W.worldKb(o.id), kb, 'memoised');
  }
  assert.ok(n > 500, `${n} objects`);
  for (const k of Object.keys(W.WORLD_KB_OBJECTS)) assert.ok(W.sceneObj(k), `override for a missing object ${k}`);
});

test('pure and safe: junk input never throws', () => {
  for (const x of [null, undefined, 42, {}, [], 'nope.nothing', '']) {
    assert.equal(W.worldKb(x), null);
    assert.equal(W.worldKbClassOf(x), null);
    assert.equal(W.worldKbHabitatOk(x, null).ok, false);
    assert.equal(typeof W.worldKbOrient(x, null), 'object');
    assert.deepEqual(W.worldKbWhen(x, null), { ok: true, share: 1, why: '' });
    assert.equal(typeof W.worldKbState(x, ctxAt('2026-07-01T12:00:00Z', FLEET), 'k'), 'object');
    assert.equal(typeof W.worldKbDensity(x, null, 'park'), 'number');
    assert.equal(typeof W.worldKbSize(x), 'number');
    assert.equal(W.worldKbVariant(x, FLEET, 0.3), 0);
    assert.equal(typeof W.worldKbRegionOk(x, FLEET).ok, 'boolean');
    assert.equal(typeof W.worldKbCare(x).ok, 'boolean');
  }
  assert.deepEqual([...W.worldKbSurfaceTags('towpath')], ['walk', 'path']);
  assert.ok(W.worldKbSurfaceTags(null).includes('soil') && W.worldKbSurfaceTags('bare').includes('grass'));
  assert.ok(W.worldKbSurfaceTags('lawn').includes('grass'), 'a v2 kind');
});

test('K1 habitat: boats on water (whole footprint, inset), ducks and swans on water or grazing the bank, vehicles in lanes, trams and trains on rails', () => {
  const boat = W.worldKb('boat.narrowboat');
  assert.equal(W.worldKbHabitatOk(boat, probe('towpath')).ok, false, 'a boat on the towpath');
  assert.equal(W.worldKbHabitatOk(boat, probe('water', { bankDist: 4 })).ok, true, 'mid channel');
  assert.equal(W.worldKbHabitatOk(boat, probe('water', { bankDist: 0.6, anchor: true })).ok, false, 'anchor too near the bank for half the beam');
  assert.equal(W.worldKbHabitatOk(boat, probe('water', { bankDist: 0.3 })).ok, true, 'a hull corner keeps the inset only');
  assert.equal(W.worldKbHabitatOk(boat, probe('water', { bankDist: 0.1 })).ok, false, 'a hull corner on the bank line');
  assert.equal(W.worldKbHabitatOk(boat, [probe('water', { bankDist: 0.3 }), probe('water', { bankDist: 2.4 }), probe('grass'), probe('water', { bankDist: 2 })]).ok, false, 'one corner on land');
  assert.equal(W.worldKbHabitatOk(boat, [probe('water', { bankDist: 0.3 }), probe('water', { bankDist: 2.4 }), probe('water', { bankDist: 0.4 }), probe('water', { bankDist: 2.5 })]).ok, true, 'the whole hull inside the water');
  assert.equal(W.worldKbHabitatOk(boat, probe('water', { bankDist: 4.5, moored: true })).ok, false, 'a moored boat lies alongside the bank');
  assert.equal(W.worldKbHabitatOk(boat, probe('water', { bankDist: 1.6, moored: true })).ok, true);
  const duck = W.worldKb('bird.mallard'), swan = W.worldKb('bird.swan');
  for (const k of [duck, swan]) {
    assert.equal(W.worldKbHabitatOk(k, probe('water', { bankDist: 3 })).ok, true);
    assert.equal(W.worldKbHabitatOk(k, probe('grass', { tags: ['grass', 'soil', 'bank'], pose: 'graze' })).ok, true, 'grazing the bank');
    assert.equal(W.worldKbHabitatOk(k, probe('grass', { tags: ['grass', 'soil', 'bank'] })).ok, false, 'not swimming on grass');
    assert.equal(W.worldKbHabitatOk(k, probe('rooftop')).ok, false, 'a duck on a roof');
  }
  assert.equal(W.worldKbHabitatOk(W.worldKb('vehicle.car'), probe('road')).ok, true);
  assert.equal(W.worldKbHabitatOk(W.worldKb('vehicle.car'), probe('path')).ok, false);
  assert.equal(W.worldKbHabitatOk(W.worldKb('vehicle.bus-double-decker'), probe('road')).ok, true);
  assert.equal(W.worldKbHabitatOk(W.worldKb('vehicle.supertram'), probe('tram')).ok, true);
  assert.equal(W.worldKbHabitatOk(W.worldKb('vehicle.supertram'), probe('grass')).ok, false);
  assert.equal(W.worldKbHabitatOk(W.worldKb('rail.train'), probe('rail')).ok, true);
  assert.equal(W.worldKbHabitatOk(W.worldKb('rail.train'), probe('road')).ok, false, 'a train off its rails');
});

test('K1 habitat: people walk, furniture on paving or grass edge never on the walking line, trees on soil (paving only in a pit), reeds in the margin, lilies and rings on calm water', () => {
  const person = W.worldKb('person.walker');
  assert.equal(W.worldKbHabitatOk(person, probe('towpath')).ok, true);
  assert.equal(W.worldKbHabitatOk(person, probe('water')).ok, false);
  assert.equal(W.worldKbHabitatOk(person, probe('hedge')).ok, false, 'inside a hedge');
  const bench = W.worldKb('street.bench');
  assert.equal(W.worldKbHabitatOk(bench, probe('pavement')).ok, true);
  assert.equal(W.worldKbHabitatOk(bench, probe('grass', { tags: ['grass', 'soil', 'grass-edge'] })).ok, true);
  assert.equal(W.worldKbHabitatOk(bench, probe('towpath', { tags: ['walk', 'path', 'walkline'] })).ok, false, 'a bench across the path');
  assert.equal(W.worldKbHabitatOk(bench, probe('towpath', { tags: ['walk', 'paving', 'path', 'path-line'] })).ok, false, "the core's name for the walking line");
  assert.equal(W.worldKbHabitatOk(bench, probe('road')).ok, false);
  const tree = W.worldKb('tree.bank-oak');
  assert.equal(W.worldKbHabitatOk(tree, probe('grass')).ok, true);
  assert.equal(W.worldKbHabitatOk(tree, probe('plaza')).ok, false, 'a tree on paving');
  assert.equal(W.worldKbHabitatOk(tree, probe('plaza', { pit: true })).ok, true, 'a tree in a pit');
  assert.equal(W.worldKbHabitatOk(tree, probe('water')).ok, false);
  const reed = W.worldKb('plant.reed');
  assert.equal(W.worldKbHabitatOk(reed, probe('water', { tags: ['water', 'water-margin'], bankDist: 0.3 })).ok, true);
  assert.equal(W.worldKbHabitatOk(reed, probe('water', { bankDist: 6 })).ok, false, 'reeds in open water');
  assert.equal(W.worldKbHabitatOk(reed, probe('pavement')).ok, false);
  const lily = W.worldKb('water.lily'), ring = W.worldKb('water.fish-ring');
  assert.equal(W.worldKbHabitatOk(lily, probe('water', { bankDist: 2 })).ok, true);
  assert.equal(W.worldKbHabitatOk(lily, probe('grass')).ok, false);
  assert.equal(W.worldKbHabitatOk(ring, probe('water', { bankDist: 3, calm: false })).ok, false, 'rings only where calm');
  assert.equal(W.worldKbHabitatOk(W.worldKb('plant.canal-view-bough'), probe('water')).ok, true, 'attached things are judged by their parent');
});

test('K2 footprint, solidity and clearance', () => {
  const boat = W.worldKb('boat.narrowboat');
  assert.equal(boat.foot, 'box'); assert.equal(boat.solidity, 'solid'); assert.ok(boat.floats && boat.sink > 0 && boat.sink < 0.5);
  const tree = W.worldKb('tree.bank-oak');
  assert.equal(tree.foot, 'disc'); assert.equal(tree.solidity, 'solid'); assert.ok(tree.r >= 0.2 && tree.r < 1, 'a trunk disc, not the crown');
  assert.equal(W.worldKb('structure.bridge-brick').solidity, 'overhead', 'a bridge blocks nothing beneath it');
  assert.equal(W.worldKb('structure.boardwalk').solidity, 'walkable');
  assert.equal(W.worldKb('water.lily').solidity, 'water');
  assert.equal(W.worldKb('person.walker').solidity, 'passable');
  assert.ok(W.worldKb('street.bench').clearance >= 0.5);
  assert.ok(W.worldKb('structure.field-gate').clearance >= 1);
  const bough = W.worldKb('plant.canal-view-bough');
  assert.ok(bough.hang && bough.art[1] < 0, 'a framing bough hangs below its anchor');
  const t = W.worldKb('tree.bank-oak');
  assert.ok(!t.hang && t.art[3] > 10, 'a tree stands above its anchor');
});

test('K3 orientation: boats along the bank, cars on the LEFT, trains on rails, benches face the path, buildings their street, gates in their fence line', () => {
  const b = W.worldKbOrient(W.worldKb('boat.narrowboat'), { bankDir: 30 });
  assert.equal(b.facing, 30); assert.equal(b.either, true);
  const car = W.worldKb('vehicle.car');
  assert.equal(W.worldKbOrient(car, { roadDir: 0, roadSide: -1 }).facing, 0, 'left of the centre line: away from the camera');
  assert.equal(W.worldKbOrient(car, { roadDir: 0, roadSide: 1 }).facing, 180, 'right of the centre line: towards the camera');
  assert.equal(W.worldKbOrient(car, { roadDir: 0, roadSide: -1, place: { lat: 48.85, lon: 2.35 } }).facing, 180, 'France drives on the right');
  assert.equal(W.worldKbOrient(car, { laneDir: 75 }).facing, 75);
  assert.equal(W.worldKbOrient(car, {}).facing, null);
  const tr = W.worldKbOrient(W.worldKb('rail.train'), { railDir: 100 });
  assert.equal(tr.facing, 100); assert.equal(tr.either, true);
  const bench = W.worldKbOrient(W.worldKb('street.bench'), { toPath: 270, pathDir: 0 });
  assert.equal(bench.facing, 270, 'the front looks at the path'); assert.equal(bench.along, 0);
  assert.equal(W.worldKbOrient(W.worldKb('building.terrace-northern'), { toRoad: 180 }).facing, 180);
  const gate = W.worldKbOrient(W.worldKb('structure.field-gate'), { fenceDir: 45 });
  assert.equal(gate.facing, 45); assert.equal(gate.either, true);
  assert.equal(W.worldKbOrient(W.worldKb('tree.bank-oak'), {}).rule, 'free');
});

test('K4 parents: boughs need a tree on the same side within reach, fronds a willow; leads, mooring lines, smoke, washing and window lights their hosts', () => {
  const bough = W.worldKb('plant.canal-view-bough'), frond = W.worldKb('plant.fpv-willow-fronds');
  const tree = { x: -9, y: 0, z: 12, obj: 'tree.bank-oak', height: 16 }, child = { x: -7, y: 6, z: 11 };
  assert.equal(W.worldKbParentOk(bough, child, null).ok, false, 'a bough with no tree');
  assert.equal(W.worldKbParentOk(bough, child, tree).ok, true);
  assert.equal(W.worldKbParentOk(bough, child, { x: -9, z: 12, obj: 'street.lamppost' }).ok, false, 'a bough on a lamp post');
  assert.equal(W.worldKbParentOk(bough, { x: 7, y: 6, z: 11 }, tree).ok, false, 'opposite sides');
  assert.equal(W.worldKbParentOk(bough, { x: -9, y: 6, z: 60 }, tree).ok, false, 'out of reach');
  assert.equal(W.worldKbParentOk(bough, { x: -8, y: 0.2, z: 12 }, tree).ok, false, 'not at a plausible height');
  const cam = W.sceneCamera({ camera: { eye: 1.65, fov: 62, horizon: 455 } });
  assert.equal(W.worldKbParentOk(bough, { x: -60, y: 8, z: 12 }, { x: -62, y: 0, z: 12, obj: 'tree.bank-oak' }, { cam }).ok, false, 'the trunk far outside the frame');
  assert.equal(W.worldKbParentOk(frond, child, tree).ok, false, 'fronds need a willow');
  assert.equal(W.worldKbParentOk(frond, child, Object.assign({}, tree, { obj: 'tree.bank-willow' })).ok, true);
  assert.deepEqual([...W.worldKb('lead').parent.cls], ['dog', 'person']);
  assert.ok(W.worldKb('mooring-line').parent.cls.includes('boat'));
  assert.equal(W.worldKb('smoke').parent.anchor, 'chimney');
  assert.equal(W.worldKb('washing-line').parent.anchor, 'two');
  assert.ok(W.worldKb('window-light').parent.cls.includes('building'));
  assert.equal(W.worldKbParentOk(W.worldKb('street.lamppost'), { x: 1, z: 5 }, null).ok, true, 'a lamp post is its own post');
  assert.equal(W.worldKb('street.lamppost').parent, undefined, 'a standing lamp declares no parent (its mount rule is for walls)');
  assert.ok(W.worldKb('street.lamppost').mount.cls.includes('building'));
});

test('K5 grouping: ducks loose, swans in pairs, trees in clumps, reeds in stands, people mixed, cars in traffic, boats nose to tail', () => {
  const g = id => W.worldKb(id).group.kind;
  assert.equal(g('bird.mallard'), 'loose');
  assert.equal(g('bird.swan'), 'pair');
  assert.equal(g('tree.bank-oak'), 'clump');
  assert.equal(g('plant.reed'), 'stand');
  assert.equal(g('person.walker'), 'mixed');
  assert.equal(g('vehicle.car'), 'traffic');
  assert.equal(g('boat.narrowboat'), 'nose-tail');
  assert.ok(W.worldKb('vehicle.car').group.gap >= 5, 'cars keep gaps');
});

test('K6 when: insects, picnics, swallows, markets, umbrellas, cafe tables and flowers by month, hour, weather and date', () => {
  const jan = ctxAt('2026-01-17T13:00:00Z', FLEET), jul = ctxAt('2026-07-18T14:00:00Z', FLEET, { temp: 23 }), julNight = ctxAt('2026-07-18T23:30:00Z', FLEET);
  for (const id of ['animal.butterfly', 'animal.bee', 'animal.dragonfly', 'insect']) {
    assert.equal(W.worldKbWhen(W.worldKb(id), jan).ok, false, id + ' in January');
    assert.equal(W.worldKbWhen(W.worldKb(id), julNight).ok, false, id + ' at night');
    assert.equal(W.worldKbWhen(W.worldKb(id), jul).ok, true, id + ' on a July afternoon');
  }
  const picnic = W.worldKb('person.picnicker');
  assert.equal(W.worldKbWhen(picnic, jan).ok, false, 'no picnics in January');
  assert.equal(W.worldKbWhen(picnic, jul).ok, true);
  assert.equal(W.worldKbWhen(picnic, Object.assign({}, jul, { weather: 'rain' })).ok, false, 'no picnics in the rain');
  assert.equal(W.worldKbWhen(W.worldKb('bird.wp-swallow'), jan).ok, false, 'swallows come in summer');
  assert.equal(W.worldKbWhen(W.worldKb('bird.wp-swallow'), jul).ok, true);
  const market = W.worldKb('structure.mcr-market-chalet');
  assert.equal(W.worldKbWhen(market, ctxAt('2026-12-05T12:00:00Z', MANCHESTER)).ok, true, 'the Christmas market');
  assert.equal(W.worldKbWhen(market, ctxAt('2026-06-05T12:00:00Z', MANCHESTER)).ok, false, 'no market in June');
  const umbrella = W.worldKb('umbrella');
  assert.equal(W.worldKbWhen(umbrella, Object.assign({}, jul, { weather: 'rain' })).ok, true, 'umbrellas in rain');
  assert.equal(W.worldKbWhen(umbrella, jul).ok, false);
  const cafe = W.worldKb('person.cafe-goer');
  assert.equal(cafe.cls, 'cafe-table');
  assert.equal(W.worldKbWhen(cafe, ctxAt('2026-06-13T13:00:00Z', MANCHESTER, { temp: 19 })).ok, true, 'cafe tables in fine weather');
  assert.equal(W.worldKbWhen(cafe, ctxAt('2026-06-13T13:00:00Z', MANCHESTER, { temp: 19, weather: 'rain' })).ok, false, 'not in rain');
  assert.equal(W.worldKbWhen(cafe, ctxAt('2026-01-13T13:00:00Z', MANCHESTER)).ok, false, 'not in January');
  assert.equal(W.worldKbWhen(W.worldKb('plant.bluebells'), ctxAt('2026-04-28T12:00:00Z', FLEET)).ok, true);
  assert.equal(W.worldKbWhen(W.worldKb('plant.bluebells'), jul).ok, false, 'bluebells bloom in spring');
  assert.equal(W.worldKbWhen(W.worldKb('plant.wildflowers'), ctxAt('2026-07-01T12:00:00Z', FLEET, { snowDay: true })).ok, false, 'no flowers in snow');
  // the share of a population ramps (a cool picnic day is quieter)
  const cool = W.worldKbWhen(picnic, Object.assign({}, jul, { temp: 16 })), warm = W.worldKbWhen(picnic, Object.assign({}, jul, { temp: 25 }));
  assert.ok(cool.ok && warm.ok && cool.share < warm.share);
});

test('K7 region and liveries: no palms in Sheffield, no US school buses in Manchester, Metrolink in Manchester, Supertram in Sheffield', () => {
  assert.ok(W.worldKbAreas(SHEFFIELD).includes('sheffield') && W.worldKbAreas(SHEFFIELD).includes('uk'));
  assert.ok(W.worldKbAreas(MANCHESTER).includes('manchester'));
  assert.ok(W.worldKbAreas({ region: 'hampshire' }).includes('uk'));
  for (const palm of ['plant.palm-coconut', 'plant.palm-royal', 'tree.us-la-fan-palm']) assert.equal(W.worldKbRegionOk(W.worldKb(palm), SHEFFIELD).ok, false, palm);
  W.sceneObjDefine({ id: 'vehicle.test-school-bus', category: 'vehicle', size: [100, 40], variants: 1, seasonal: false, tags: ['us', 'school-bus', 'bus', 'role:vehicle'],
    real: { h: 3.2, l: 11, w: 2.5 }, build: () => ({ body: [['#e8b020', 'M-50 0V-40H50V0z']] }) });
  assert.equal(W.worldKbClassOf('vehicle.test-school-bus'), 'bus');
  assert.equal(W.worldKbRegionOk(W.worldKb('vehicle.test-school-bus'), MANCHESTER).ok, false, 'a US school bus in Manchester');
  assert.equal(W.worldKbRegionOk(W.worldKb('vehicle.metrolink-m5000'), MANCHESTER).ok, true);
  const s = W.worldKbRegionOk(W.worldKb('vehicle.metrolink-m5000'), SHEFFIELD);
  assert.equal(s.ok, false); assert.equal(s.swap, 'vehicle.supertram', 'swap to the local tram');
  assert.equal(W.worldKbRegionOk(W.worldKb('vehicle.supertram'), SHEFFIELD).ok, true);
  assert.equal(W.worldKbRegionOk(W.worldKb('vehicle.supertram'), MANCHESTER).swap, 'vehicle.metrolink-m5000');
  assert.equal(W.worldKbRegionOk(W.worldKb('rail.train-tube'), SHEFFIELD).ok, false, 'tube trains stay in London');
  assert.equal(W.worldKbRegionOk(W.worldKb('rail.train-tube'), LONDON).ok, true);
  assert.equal(W.worldKbRegionOk(W.worldKb('tree.bank-oak'), SHEFFIELD).ok, true);
  assert.equal(W.worldKbRegionOk(W.worldKb('tree.bank-oak'), {}).ok, true, 'an unknown place is not judged');
  // liveries: Metrolink is yellow and grey; the heritage London bus stays in London
  assert.ok(/yellow and grey/.test(W.worldKb('vehicle.metrolink-m5000').liveries.names.join(' ')));
  for (let i = 0; i < 20; i++) assert.notEqual(W.worldKbVariant(W.worldKb('vehicle.bus-double-decker'), SHEFFIELD, i / 20), 1);
  const lv = new Set(Array.from({ length: 20 }, (_, i) => W.worldKbVariant(W.worldKb('vehicle.bus-double-decker'), LONDON, i / 20)));
  assert.ok(lv.has(1), 'London has the heritage bus');
  // a variant whose own `when` fails is avoided (the commuter's umbrella up only in rain)
  const dry = ctxAt('2026-07-01T09:00:00Z', MANCHESTER), wet = Object.assign({}, dry, { weather: 'rain' });
  for (let i = 0; i < 20; i++) assert.notEqual(W.worldKbVariant(W.worldKb('person.commuter'), MANCHESTER, i / 20, { ctx: dry }), 1);
  assert.ok(Array.from({ length: 40 }, (_, i) => W.worldKbVariant(W.worldKb('person.commuter'), MANCHESTER, i / 40, { ctx: wet })).includes(1));
});

test('K8 real size ranges by pose and age', () => {
  const r = i => (i + 0.5) / 30, sizes = (kb, pose, age) => Array.from({ length: 30 }, (_, i) => W.worldKbSize(kb, pose, age, r(i)));
  const person = W.worldKb('person.walker');
  for (const h of sizes(person, 'stand', 'adult')) assert.ok(h >= 1.6 && h <= 1.9, 'adult ' + h);
  for (const h of sizes(person, 'stand', 'child')) assert.ok(h >= 1.0 && h <= 1.4, 'child ' + h);
  for (const h of sizes(person, 'sit', 'adult')) assert.ok(h >= 1.2 && h <= 1.4, 'seated ' + h);
  const near = (a, b, t) => Math.abs(a - b) <= t;
  assert.ok(near(W.worldKbSize(W.worldKb('person.bench-sitter'), null, null, 0.5), 1.3, 0.1), 'a bench sitter is seated by default');
  assert.ok(near(W.worldKbSize(W.worldKb('person.child-ball'), null, null, 0.5), 1.2, 0.2), 'a child by default');
  for (const h of sizes(W.worldKb('animal.dog'))) assert.ok(h >= 0.3 && h <= 0.7, 'dog ' + h);
  assert.ok(near(W.worldKbSize(W.worldKb('bird.mallard'), null, null, 0.5), 0.35, 0.04), 'duck');
  assert.ok(near(W.worldKbSize(W.worldKb('bird.swan'), 'swim', null, 0.5), 0.6, 0.05), 'swan on water');
  assert.ok(near(W.worldKbSize(W.worldKb('bird.heron'), null, null, 0.5), 0.9, 0.08), 'heron');
  assert.ok(near(W.worldKbSize(W.worldKb('animal.cattle'), null, null, 0.5), 1.4, 0.1), 'cow');
  const nb = W.worldKb('boat.narrowboat');
  assert.ok(near(nb.size.w, 2.1, 0.06), 'narrowboat beam'); assert.deepEqual([...nb.size.lRange], [15, 21]); assert.ok(nb.size.l >= 15 && nb.size.l <= 21);
  assert.ok(near(W.worldKbSize(W.worldKb('vehicle.car'), null, null, 0.5), 1.5, 0.05), 'car');
  // the descriptor's own h0 sits in its pose range (people use the shared figure's metric, not the 1.7 m mover class)
  assert.ok(W.worldKb('person.bench-sitter').size.h0 <= 1.4 * 1.05);
  assert.ok(W.worldKb('person.child-ball').size.h0 <= 1.4);
});

test('K9 care flags: anonymous people only, no readable text, flags or symbols; hand-drawn shadow parts are ignored', () => {
  const people = W.sceneObjs().filter(o => o.category === 'person');
  for (const o of people) {
    const c = W.worldKbCare(o.id);
    if ((o.tags || []).includes('anonymous') || (o.tags || []).includes('silhouette')) assert.equal(c.faces, false, o.id);
    else assert.equal(c.ok, false, o.id + ' is not tagged anonymous');
  }
  assert.equal(W.worldKbCare('street.station-nameboard').ok, true, 'a blank name board');
  W.sceneObjDefine({ id: 'street.test-flag', category: 'street', size: [20, 60], variants: 1, seasonal: false, tags: ['flag'], real: { h: 4 }, build: () => ({ body: [['#c00', 'M0 0V-60H20V-40H2V0z']] }) });
  assert.equal(W.worldKbCare('street.test-flag').ok, false);
  assert.equal(W.worldKbCare('street.test-flag').flags, true);
  W.sceneObjDefine({ id: 'street.test-shadowed', category: 'street', size: [20, 20], variants: 1, seasonal: false, parts: ['body', 'shadow'], tags: [], real: { h: 1 },
    build: () => ({ body: [['#888', 'M0 0V-20H20V0z']], shadow: [['#000', 'M0 0H30V4H0z']] }) });
  assert.deepEqual([...W.worldKbCare('street.test-shadowed').ignoreParts], ['shadow']);
  for (const id of ['tree.bank-oak', 'boat.narrowboat', 'person.walker', 'bird.mallard']) assert.equal(W.worldKb(id).care.ok, true, id);
});

test('S1 leaves across a year at Fleet and Sheffield: bare in January, budding in spring, full in summer, turning unevenly in autumn; evergreens stay', () => {
  const trees = ['tree.bank-oak', 'tree.bank-birch', 'tree.bank-willow', 'tree.bank-alder', 'tree.hawthorn', 'tree.horse-chestnut', 'tree.plane', 'plant.canal-view-bough'];
  const keys = Array.from({ length: 40 }, (_, i) => 'tree-' + i);
  for (const place of [FLEET, SHEFFIELD]) {
    for (const day of ['2026-01-03', '2026-01-15', '2026-01-30', '2026-02-20']) {
      const c = ctxAt(day + 'T12:00:00Z', place);
      for (const id of trees) for (const k of keys) assert.equal(W.worldKbState(W.worldKb(id), c, k).leaf, 'bare', `${id} ${k} on ${day}`);
    }
    const jul = ctxAt('2026-07-15T12:00:00Z', place);
    for (const id of trees) for (const k of keys) assert.equal(W.worldKbState(W.worldKb(id), jul, k).leaf, 'full', `${id} in July`);
    for (const id of ['tree.pine', 'tree.proof-yew', 'plant.holly', 'plant.gorse']) {
      assert.equal(W.worldKb(id).evergreen, true, id);
      assert.equal(W.worldKbState(W.worldKb(id), ctxAt('2026-01-15T12:00:00Z', place), 'k').leaf, 'full', id + ' stays green');
    }
    // spring: some budding by mid April
    const apr = ctxAt('2026-04-18T12:00:00Z', place), aprLeaf = keys.map(k => W.worldKbState(W.worldKb('tree.bank-birch'), apr, k).leaf);
    assert.ok(aprLeaf.includes('bud'), 'budding in April');
  }
  // uneven turning in autumn: the same species, different entities
  const oct = ctxAt('2026-10-20T12:00:00Z', FLEET), st = keys.map(k => W.worldKbState(W.worldKb('tree.bank-oak'), oct, k));
  const turns = st.map(s => s.turn), spread = Math.max(...turns) - Math.min(...turns);
  assert.ok(spread > 0.25, 'uneven turning ' + spread);
  assert.ok(new Set(st.map(s => s.leaf)).size >= 2, 'some still full, some turning');
  // the north leafs out later on average
  const mean = (place) => keys.reduce((a, k) => { let d = 60; while (d < 180 && W.worldKbState(W.worldKb('tree.bank-oak'), { doy: d, lat: place.lat }, k).leaf === 'bare') d++; return a + d; }, 0) / keys.length;
  assert.ok(mean(SHEFFIELD) > mean(FLEET) + 2, 'Sheffield leafs out later than Fleet');
});

test('V3 state: flowers bloom in their months, snow only on snow days, windows light by sun elevation per window, lamps at dusk', () => {
  const bb = W.worldKb('plant.bluebells');
  assert.ok(W.worldKbState(bb, ctxAt('2026-05-01T12:00:00Z', FLEET), 'a').bloom > 0.3);
  assert.equal(W.worldKbState(bb, ctxAt('2026-07-15T12:00:00Z', FLEET), 'a').bloom, 0);
  assert.equal(W.worldKbState(bb, ctxAt('2026-07-15T12:00:00Z', FLEET), 'a').present, false);
  assert.ok(W.worldKbState(W.worldKb('tree.hawthorn'), ctxAt('2026-05-15T12:00:00Z', FLEET), 'h').bloom > 0.3, 'hawthorn blossom in May');
  const snowDay = ctxAt('2026-01-20T10:00:00Z', SHEFFIELD, { snowDay: true, weather: 'snow' }), dry = ctxAt('2026-01-20T10:00:00Z', SHEFFIELD);
  assert.ok(W.worldKbState(W.worldKb('building.terrace-northern'), snowDay, 'b').snow > 0.5, 'snow on roofs on a snow day');
  assert.equal(W.worldKbState(W.worldKb('building.terrace-northern'), dry, 'b').snow, 0);
  assert.equal(W.worldKbState(W.worldKb('building.terrace-northern'), ctxAt('2026-07-20T10:00:00Z', SHEFFIELD), 'b').snow, 0, 'no snow in July');
  const terr = W.worldKb('building.terrace-northern');
  assert.equal(terr.lit, 'window');
  const noon = ctxAt('2026-07-20T12:00:00Z', SHEFFIELD), dusk = ctxAt('2026-12-15T16:30:00Z', SHEFFIELD), night = ctxAt('2026-12-15T20:00:00Z', SHEFFIELD);
  const lit = c => Array.from({ length: 200 }, (_, i) => W.worldKbState(terr, c, 'w' + i).lit).filter(Boolean).length;
  assert.equal(lit(noon), 0, 'no lit windows at noon');
  const n = lit(night);
  assert.ok(n > 60 && n < 180, 'some windows lit at night, not all at once: ' + n);
  assert.ok(lit(dusk) <= n + 20);
  const lamp = W.worldKb('street.lamppost');
  assert.equal(W.worldKbState(lamp, noon, 'l').lit, false);
  assert.equal(W.worldKbState(lamp, night, 'l').lit, true);
});

test('S4 / A1 density by hour, weekday, season and weather; seasonal life follows K6', () => {
  const sunJul = ctxAt('2026-07-19T14:00:00Z', FLEET, { temp: 22 }), wedJul3am = ctxAt('2026-07-15T03:00:00Z', FLEET), wedJul14 = ctxAt('2026-07-15T14:00:00Z', FLEET, { temp: 22 });
  assert.ok(W.worldKbDensity('walkers', sunJul, 'park') > 1.2, 'a summer Sunday afternoon in the park');
  assert.ok(W.worldKbDensity('walkers', wedJul3am, 'park') < 0.1, 'few at 3 am');
  assert.ok(W.worldKbDensity('walkers', sunJul, 'park') > W.worldKbDensity('walkers', wedJul14, 'park'), 'more at weekends in parks');
  assert.ok(W.worldKbDensity('walkers', Object.assign({}, wedJul14, { weather: 'rain' }), 'park') < 0.5 * W.worldKbDensity('walkers', wedJul14, 'park'), 'rain empties parks');
  const rush = ctxAt('2026-03-11T08:15:00Z', MANCHESTER), mid = ctxAt('2026-03-11T10:30:00Z', MANCHESTER);
  assert.ok(W.worldKbDensity('crowd', rush, 'city-manchester-towers') > W.worldKbDensity('crowd', mid, 'city-manchester-towers'), 'rush hour in the city');
  assert.ok(W.worldKbDensity('cars', rush, 'city') > 1, 'traffic at rush hour');
  assert.equal(W.worldKbDensity('tram', ctxAt('2026-03-11T02:30:00Z', SHEFFIELD), 'city'), 0, 'no trams at 2:30 am');
  assert.ok(W.worldKbDensity('narrowboat-cruising', ctxAt('2026-01-11T12:00:00Z', FLEET), 'canal') < W.worldKbDensity('narrowboat-cruising', ctxAt('2026-07-11T12:00:00Z', FLEET), 'canal'));
  assert.equal(W.worldKbDensity('picnic', ctxAt('2026-01-18T13:00:00Z', FLEET), 'park'), 0, 'no picnics in January');
  assert.equal(W.worldKbDensity('animal.butterfly', ctxAt('2026-01-18T13:00:00Z', FLEET), 'park'), 0, 'no insects in January');
  assert.ok(W.worldKbDensity('animal.butterfly', ctxAt('2026-07-18T13:00:00Z', FLEET, { temp: 22 }), 'park') > 0.5);
  assert.equal(W.worldKbDensity('walkers', null, 'park'), 1, 'no context: the declared rate');
});

test('a year at Fleet and at Sheffield: no picnic or insects in January, cafe tables only in fine weather, no green deciduous tree in January', () => {
  for (const place of [FLEET, SHEFFIELD]) for (let m = 1; m <= 12; m++) {
    const iso = `2026-${String(m).padStart(2, '0')}-15T13:00:00Z`, c = ctxAt(iso, place, { temp: [5, 5, 7, 9, 13, 17, 21, 21, 16, 11, 8, 5][m - 1] });
    const pic = W.worldKbWhen(W.worldKb('picnic'), c).ok, ins = W.worldKbWhen(W.worldKb('animal.butterfly'), c).ok;
    if (m === 1 || m === 2 || m === 12) { assert.equal(pic, false, 'picnic month ' + m); assert.equal(ins, false, 'insects month ' + m); }
    if (m === 7) { assert.equal(pic, true, 'picnic July'); assert.equal(ins, true, 'insects July'); }
    const cafe = W.worldKb('cafe-table');
    assert.equal(W.worldKbWhen(cafe, Object.assign({}, c, { weather: 'rain' })).ok, false, 'cafe tables in rain, month ' + m);
    if (m === 1) for (const k of ['a', 'b', 'c']) assert.notEqual(W.worldKbState(W.worldKb('tree.bank-oak'), c, k).leaf, 'full');
  }
});

test('anim and materials for the other packages: stride in metres a cycle, stiffness, materials by part, perch points, evergreen flag', () => {
  const walker = W.worldKb('person.walker');
  assert.ok(walker.anim.stride > 1 && walker.anim.stride < 2, 'a walk cycle is two steps: ' + walker.anim.stride);
  assert.equal(walker.anim.gait.preset, 'stroll');
  assert.ok(W.worldKb('plant.reed').anim.stiffness < W.worldKb('tree.bank-oak').anim.stiffness, 'reeds sway more than trees');
  assert.equal(W.worldKb('street.bench').anim.stiffness, 1, 'statics never sway');
  assert.equal(W.worldKb('tree.bank-oak').material.trunk, 'bark');
  assert.equal(W.worldKb('tree.bank-oak').material.crown, 'leaf');
  assert.equal(W.worldKb('tree.pine').material.crown, 'needle');
  assert.ok(W.worldKb('building.terrace-northern').material['*']);
  assert.ok(W.worldKb('street.bollard').perch.length >= 1, 'a post is a perch');
  assert.ok(W.worldKb('tree.bank-oak').perch.length >= 2);
  assert.equal(W.worldKb('tree.pine').evergreen, true);
  assert.equal(W.worldKb('tree.bank-oak').evergreen, false);
  assert.equal(W.worldKb('street.mcr-tram-shelter').stop, 'tram');
  assert.equal(W.worldKb('ground.leaf-litter').decal, true, 'flat ground marks are decals (drawn under movers)');
  assert.equal(W.worldKb('plant.grass-long').decal, false);
  assert.equal(W.worldKb('vehicle.car').coreCls, 'vehicle', "the core's coarser class");
  assert.equal(W.worldKb('plant.canal-view-bough').coreCls, 'shrub');
});
