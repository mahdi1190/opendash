// What a kit pick may hand to a scene that did not ask for it (CI 15 Oct 2026): the objects drawn for ONE place's views stay out of
// every generic pool (the Blackbushe hangar had joined the far buildings of an Armenian plain, the Sheffield hills those of the New
// York skyline, a Sheffield tram the vehicles of London), and the walking people keep the hooks the archetypes filter by.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const E = new Proxy({}, { get: (_, n) => REG.R.get(n) });
const PLACE = REG.R.get('SCENE_PLACE_PREFIXES');
const placeId = (id) => PLACE.some(p => new RegExp('^[a-z]+\.' + p.replace(/[-]/g, '\-') + '-').test(id));

test('a kit pick never returns an object drawn for one place (named with its place prefix) unless its own weight says so', () => {
  assert.ok(Array.isArray(PLACE) && PLACE.length >= 8 && Object.isFrozen(PLACE));
  const roles = ['tree', 'ground', 'shrub', 'edge', 'street', 'building-far', 'building-mid', 'building-near', 'vehicle', 'boat', 'bird', 'walker', 'animal', 'rock', 'landmark', 'prop'];
  const kits = [['temperate'], ['urban'], ['temperate', 'urban', 'people', 'birds', 'water', 'vehicles', 'boats'], ['london', 'urban'], ['vehicles', 'urban', 'london']];
  let checked = 0;
  for (const kit of kits) for (const role of roles) for (const id of Object.keys(E.sceneKitPick(kit, role, {}))) {
    checked++;
    const d = E.sceneObj(id);
    if (placeId(id)) assert.ok(d.weight > 0, `${id} (place prefix) is in the ${kit.join('+')} ${role} pool with no weight of its own`);
  }
  assert.ok(checked > 200, `${checked} picks looked at`);
  // the ones that leaked
  for (const [id, kit, role] of [['building.yc-hangar', ['temperate', 'alpine'], 'building-far'], ['building.yc-terminal', ['temperate'], 'building-far'], ['building.shc-hills', ['urban'], 'building-far'],
    ['vehicle.shc-supertram', ['vehicles', 'urban', 'london'], 'vehicle'], ['vehicle.shc-supertram-front', ['vehicles', 'urban', 'london'], 'vehicle'], ['vehicle.yc-helicopter', ['vehicles'], 'vehicle'],
    ['plant.yc-cotton-grass', ['temperate'], 'ground'], ['tree.yc-birch-bough', ['temperate'], 'tree']]) {
    assert.ok(E.sceneObj(id), `${id} exists`);
    assert.equal(id in E.sceneKitPick(kit, role, {}), false, `${id} is not in the ${kit.join('+')} ${role} pool`);
  }
  // a scene still gets such an object by naming it
  const named = E.sceneCompile({ id: 'kp-named', v: 2, view: { lat: 51.3, lon: -0.8 }, camera: { eye: 1.65, fov: 66, horizon: 470, heading: 180 }, season: 'summer', cover: false,
    surfaces: [{ id: 'land', kind: 'grass', rest: true }], water: [], place: [{ obj: 'plant.yc-cotton-grass', at: [0, 20], k: 1 }], scatter: [] }, { season: 'summer', lod: 1 });
  assert.ok(named.items.some(i => i.o === 'plant.yc-cotton-grass'), 'a scene that names the object has it');
});

test('the walking people have their walk hook for the archetypes (it moved from def.anim to the build\'s $anim), and other categories read def.anim only', () => {
  const has = E.sceneObjHasHook;
  for (const id of ['person.walker', 'person.jogger', 'person.dog-walker']) { assert.ok(E.sceneObj(id), id); assert.equal(has(id, 'walk'), true, `${id} walks`); }
  assert.equal(has('person.walker', 'flap'), false);
  assert.equal(has('no.such-object', 'walk'), false);
  // a bird with its hook in def.anim; a kit adapter's $anim never counted and still does not (the compiled scenes stay as they were)
  const birds = Object.keys(E.sceneKitPick(['birds'], 'bird', {})).filter(id => E.sceneObj(id).anim && E.sceneObj(id).anim.flap);
  assert.ok(birds.length > 0 && birds.every(id => has(id, 'flap')));
  const adapters = E.sceneObjs().filter(d => d.category !== 'person' && !d.anim);
  assert.ok(adapters.length > 0 && adapters.every(d => has(d.id, 'walk') === false && has(d.id, 'flap') === false));
});

test('tile budget: a bare winter crown and a fern keep their fine strokes as detail, so a tile (LOD < 0.5) does not pay for them', () => {
  const tile = (id, season) => {
    let bytes = 0, full = 0, n = 0;
    for (let v = 0; v < Math.min(3, E.sceneObj(id).variants || 1); v++) {
      const sh = E.sceneObjShapes(id, v, season); if (!sh) continue; n++;
      for (const p of Object.keys(sh.parts)) for (const s of sh.parts[p]) { const l = (s.d || '').length; full += l; if (!s.detail) bytes += l; }
    }
    return { tile: bytes / n, full: full / n };
  };
  // the non-detail path bytes per symbol in winter (the figures measured on 15 Oct, a few per cent of room): they were 12 K, 9 K and
  // 11 K before the twig haze was split into a core and a detail part (sceneDraw.twigHazeLod)
  for (const [id, season, max] of [['tree.distant', 'winter', 5500], ['tree.bank-oak', 'winter', 6500], ['tree.bank-alder', 'winter', 6500], ['tree.bank-birch', 'winter', 6500],
    ['tree.pond-wood', 'winter', 5500], ['tree.woods-edge', 'winter', 5500], ['tree.birch-heath', 'winter', 5500], ['tree.far-broad', 'winter', 1500], ['tree.far-birch', 'winter', 1500], ['plant.fern', 'summer', 4000]]) {
    const t = tile(id, season);
    assert.ok(t.tile <= max, `${id} ${season}: ${Math.round(t.tile)} B of tile path data (at most ${max})`);
    assert.ok(t.full > t.tile, `${id}: the fine strokes are still drawn at full size (${Math.round(t.full)} B)`);
  }
  assert.equal(typeof REG.R.get('sceneDraw').twigHazeLod, 'function');
  const rnd = (() => { let s = 7; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); })();
  const h = REG.R.get('sceneDraw').twigHazeLod(rnd, 0, -100, 60, 50, 12);
  assert.ok(h.core.length > 0 && h.fine.length > 0 && h.core.length < h.fine.length * 1.2, 'about a third of the sprays are the core');
});
