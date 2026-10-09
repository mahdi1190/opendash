// The auto-composer (docs/dev/SCENE_ENGINE_V2.md 20.3; builder G): the brief parser, the OSM layout, the viewpoint search and the
// draft recipe, on a SYNTHETIC fixture (tests/fixtures/scene-compose-osm.json: hand-made geometry and made-up names, not OSM data).
// No network: the composer gets the Overpass JSON as data. Builder E's projection is not used here (the lite one is), so the test
// also covers "callee absent".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  parseBrief, layoutFromOsm, findSubject, searchViewpoints, occlusion, quickFrame, standable, projectLite, clipWedge, simplifyRing, compose, styleOf, gazetteer, enu,
} from '../tools/lib/scene-compose.mjs';
import { cameraModule } from '../tools/lib/scene-composition.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OSM = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'scene-compose-osm.json'), 'utf8'));
const PLACES = [{ name: 'Example Town', lat: 53.39, lon: -1.47 }, { name: 'Kelham Island', lat: 53.389, lon: -1.471 }, { name: 'Fleet Pond', lat: 51.29, lon: -0.83 }, { name: 'Winchester', lat: 51.06, lon: -1.31 }];
const L = layoutFromOsm(OSM, { lat: 53.39, lon: -1.47 });

test('the brief parser: places, moments, presets, weather, seasons, subjects and unknown words (20 briefs)', () => {
  const cases = [
    ['Kelham Island, golden hour, across the river', { place: 'Kelham Island', at: 'golden', preset: 'across-water' }],
    ['Example Town church at dusk in the rain', { place: 'Example Town', at: 'dusk', weather: 'rain', subject: 'church' }],
    ['Fleet Pond, snow, dawn', { place: 'Fleet Pond', weather: 'snow', at: 'dawn' }],
    ['Winchester cathedral through the trees in autumn', { place: 'Winchester', subject: 'cathedral', preset: 'through-arch', season: 'autumn' }],
    ['Example Town, the mill, down the canal at night', { subject: 'mill', preset: 'down-street', at: 'night' }],
    ['Example Town from the hill, sunset', { preset: 'from-hill', at: 'sunset' }],
    ['Example Town station, morning, fog', { subject: 'station', at: 'morning', weather: 'fog' }],
    ['Example Town market square, noon, summer', { subject: 'market', at: 'noon', season: 'summer' }],
    ['Example Town bridge from the bridge', { subject: 'bridge', preset: 'raised' }],
    ['Example Town, a panorama of the skyline at twilight', { preset: 'panorama', at: 'dusk' }],
    ['Example Town castle, close up, frosty winter morning', { subject: 'castle', preset: 'close-up', weather: 'frost', season: 'winter', at: 'morning' }],
    ['Example Town, along the towpath, misty spring dawn', { preset: 'down-street', weather: 'mist', season: 'spring', at: 'dawn' }],
    ['Example Town town hall in the square, evening, drizzle', { subject: 'hall', preset: 'street', at: 'dusk', weather: 'drizzle' }],
    ['Example Town windmill across the broad at golden hour', { subject: 'windmill', preset: 'across-water', at: 'golden' }],
    ['Example Town, the pub, overcast afternoon', { subject: 'pub', weather: 'cloudy', at: 'afternoon' }],
    ['Example Town lighthouse, stormy night', { subject: 'lighthouse', weather: 'thunder', at: 'night' }],
    ['Example Town, under the arch, sunny midday', { preset: 'through-arch', weather: 'clear', at: 'noon' }],
    ['Example Town fountain, blossom, spring', { subject: 'fountain', season: 'spring', unknown: ['blossom'] }],
    ['Example Town, over the valley, autumn sunrise', { preset: 'from-hill', season: 'autumn', at: 'dawn' }],
    ['Somewhere Unlisted, the abbey, golden hour, with balloons', { place: 'somewhere unlisted', subject: 'church', at: 'golden', unknown: ['balloons'] }],
  ];
  assert.equal(cases.length, 20);
  for (const [text, want] of cases) {
    const b = parseBrief(text, { places: PLACES });
    if (want.place) assert.equal(b.place && b.place.name.toLowerCase(), want.place.toLowerCase(), text);
    for (const k of ['at', 'preset', 'weather', 'season']) if (want[k] !== undefined) assert.equal(b[k], want[k], `${text}: ${k}`);
    if (want.subject) assert.equal(b.subject && b.subject.kind, want.subject, `${text}: subject`);
    assert.deepEqual(b.unknown, want.unknown || [], `${text}: unknown words`);
  }
  // a gazetteer place carries its position; a brief place does not
  assert.equal(parseBrief('Kelham Island, noon', { places: PLACES }).place.lat, 53.389);
  assert.equal(parseBrief('Nowhere Special, noon', { places: PLACES }).place.lat, null);
  assert.throws(() => parseBrief('  '), /needs a brief/);
});

test('the layout: the synthetic Overpass JSON in local metres; buildings, water, ways, areas and features', () => {
  assert.equal(L.water.filter(w => w.poly).length, 1);
  assert.ok(L.water.some(w => w.line && w.kind === 'river' && w.width === 30));
  assert.ok(L.buildings.length >= 30);
  const church = L.features.find(f => f.kind === 'church');
  assert.ok(church && church.name === 'St Example Church' && church.h === 34);
  assert.ok(Math.abs(church.e - -150) < 1 && Math.abs(church.n - 127) < 1, `the church centroid at ${church.e}, ${church.n}`);
  assert.ok(L.ways.some(w => w.kind === 'road' && w.cls === 'tertiary'));
  assert.ok(L.ways.some(w => w.bridge));
  assert.equal(L.areas.find(a => a.kind === 'park').poly.length, 4);
  assert.equal(L.features.filter(f => f.kind === 'tree').length, 8);
  // the equirectangular ENU of V2 17.3 round-trips
  const P = enu(53.39, -1.47), [la, lo] = P.from(...P.to(53.391, -1.468));
  assert.ok(Math.abs(la - 53.391) < 1e-9 && Math.abs(lo - -1.468) < 1e-9);
  // the style guess (17.4)
  assert.equal(styleOf(L.buildings.find(b => b.name === 'Example Mill')), 'mill');
  assert.equal(styleOf({ kind: 'terrace', tags: { start_date: '1885' } }), 'victorian-terrace');
  assert.equal(styleOf({ kind: 'house', tags: { 'building:material': 'flint' } }), 'norfolk-flint');
});

test('subjects, standing ground and occlusion', () => {
  assert.equal(findSubject(L, parseBrief('Example Town church', { places: PLACES })).name, 'St Example Church');
  assert.equal(findSubject(L, parseBrief('Example Town mill', { places: PLACES })).name, 'Example Mill');
  assert.equal(findSubject(L, parseBrief('Example Town castle', { places: PLACES })), null);
  assert.ok(findSubject(L, parseBrief('Example Town', { places: PLACES })), 'without a subject word: the most notable feature');
  assert.equal(standable(L, 0, 0).ok, false, 'in the river');
  assert.equal(standable(L, -40, 0).ok, true, 'on the footbridge');
  assert.equal(standable(L, -150, 127).ok, false, 'inside the church');
  assert.equal(standable(L, 0, -100).on, 'park');
  assert.equal(standable(L, -40, -27, 'raised').ok, true, 'raised: the bridge');
  // the terrace (8 m) hides the church from the lane just in front of it
  const church = findSubject(L, parseBrief('Example Town church', { places: PLACES }));
  const behind = occlusion(L, church, { e: -260, n: 62, eye: 1.6 });
  const open = occlusion(L, church, { e: -60, n: -60, eye: 1.6 });
  assert.ok(behind.share > open.share, `${behind.share} > ${open.share}`);
});

test('the viewpoint search: across the river, the subject visible and on a third; deterministic', () => {
  const church = findSubject(L, parseBrief('Example Town church', { places: PLACES }));
  const run = () => searchViewpoints(L, church, 'across-water', { candidates: 12, cameraModule: cameraModule(ROOT) });
  const a = run(), b = run();
  assert.deepEqual(a.map(c => [c.e, c.n, c.heading, c.score]), b.map(c => [c.e, c.n, c.heading, c.score]), 'deterministic');
  const best = a[0];
  assert.ok(best.occ.share <= 0.3, `visible (occlusion ${best.occ.share})`);
  assert.ok(best.frame.water, 'water between the camera and the subject');
  assert.ok(best.n < -15, 'it stands on the far (south) bank');
  assert.ok(Math.min(Math.abs(best.frame.xFrac - 1 / 3), Math.abs(best.frame.xFrac - 2 / 3)) < 0.03, `on a third (${best.frame.xFrac})`);
  assert.ok(best.frame.sky >= 0.22 && best.frame.sky <= 0.45, `sky ${best.frame.sky}`);
  // distinct candidates
  for (let i = 1; i < a.length; i++) assert.ok(a.slice(0, i).every(k => Math.hypot(k.e - a[i].e, k.n - a[i].n) >= 12 || Math.abs(((k.heading - a[i].heading + 540) % 360) - 180) >= 15));
  // a sibling with the same preset, heading class and third makes the same view score lower on uniqueness
  const sib = { fp: { preset: 'across-water', horizonBucket: Math.round(best.horizon / 50), headingClass: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(best.heading / 45) % 8], third: best.side < 0 ? 'L' : 'R' } };
  const c = searchViewpoints(L, church, 'across-water', { candidates: 40, siblings: [sib], cameraModule: cameraModule(ROOT) });
  const same = c.find(x => x.e === best.e && x.n === best.n && x.side === best.side);
  assert.ok(!same || same.parts.uniqueness < 0.1);
  // down the street: a way runs away from the camera
  const mill = findSubject(L, parseBrief('Example Town mill', { places: PLACES }));
  const d = searchViewpoints(L, mill, 'down-street', { candidates: 5, cameraModule: cameraModule(ROOT) })[0];
  assert.ok(d.parts.needs >= 0.5 && d.frame.lines.length, JSON.stringify(d.notes));
});

test('the lite projection: the wedge clip, ring simplification, unique ids, no names or brands in drawn data', () => {
  assert.deepEqual(clipWedge([[-10, -10], [10, -10], [10, 10], [-10, 10]], { dNear: 0.5, range: 700, k: 0.8 }).length >= 3, true);
  assert.equal(clipWedge([[-10, -50], [10, -50], [10, -40]], { dNear: 0.5, range: 700, k: 0.8 }).length, 0, 'behind the camera');
  assert.equal(simplifyRing([[0, 0], [5, 0.01], [10, 0], [10, 10], [0, 10]], 0.5).length, 4);
  const S = projectLite(L, { e: -60, n: -60, heading: 330 }, { fov: 66 });
  const ids = S.surfaces.map(s => s.id).concat(S.water.map(w => w.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9-]{1,30}$/);
  assert.ok(S.surfaces.some(s => s.kind === 'pavement' && s.beside), 'pavements beside the urban roads');
  assert.ok(S.buildings.length && S.buildings.every(b => b.foot.length >= 3 && b.src === 'osm'));
  const text = JSON.stringify(S);
  assert.ok(!/Some Brand|bakery/i.test(text), 'no brand or shop name in the drawn data');
});

test('compose: a whole draft from a brief (deterministic; the callee-absent notes)', async () => {
  const opts = { pack: 'v2-g-test', places: PLACES, osm: OSM, cameraModule: cameraModule(ROOT), date: '2026-10-08' };
  const { recipe, report } = await compose('Example Town church, golden hour, across the river', opts);
  const again = await compose('Example Town church, golden hour, across the river', opts);
  assert.equal(JSON.stringify(recipe), JSON.stringify(again.recipe), 'deterministic');
  const sc = recipe.scene;
  assert.equal(recipe.v, 2);
  assert.equal(recipe.pack, 'v2-g-test');
  assert.match(recipe.meta.id, /^[a-z0-9-]+$/);
  assert.ok(recipe.meta.tags.length >= 2 && recipe.meta.tags.length <= 6);
  assert.ok(['calm', 'cheerful', 'proud', 'cosy', 'focused', 'dreamy', 'energetic', 'neutral'].includes(recipe.meta.mood), 'a registry mood (ANIM_MOODS)');
  assert.ok(['blue', 'indigo', 'violet', 'pink', 'red', 'orange', 'amber', 'green', 'teal', 'slate'].includes(recipe.meta.colour), 'a swatch');
  assert.equal(sc.camera.preset, 'across-water');
  assert.equal(sc.camera.eye, 1.7);
  assert.ok(Number.isFinite(sc.camera.lat) && Number.isFinite(sc.camera.heading));
  assert.equal(sc.at, 'golden');
  assert.equal(sc.weather, 'live');
  assert.equal(sc.atmos, 'auto');
  assert.ok(sc.surfaces[0].rest && sc.water.length >= 1);
  assert.ok(sc.flows.some(f => f.kind === 'walk') && sc.flows.some(f => f.kind === 'boat'));
  assert.ok(sc.buildings.some(b => b.subject), 'the church footprint is the subject');
  assert.ok(report.bytes < 24000);
  assert.equal(report.subject.name, 'St Example Church');
  assert.equal(report.alternatives.length, 2);
  assert.ok(report.notes.some(n => /osm-project/.test(n)), 'says that the lite projection stood in for E\'s');
  JSON.parse(JSON.stringify(recipe));   // strict JSON: no undefined, no functions
  assert.ok(!/Infinity|NaN/.test(JSON.stringify(recipe)));
  // a fixed weather and season from the brief
  const r2 = await compose('Example Town mill, down the street, snow, winter', opts);
  assert.deepEqual(r2.recipe.scene.weather, { kind: 'snow' });
  assert.equal(r2.recipe.scene.season, 'winter');
  assert.equal(r2.recipe.scene.camera.preset, 'down-street');
  // E's projection, when there, replaces the lite one
  let called = 0;
  const r3 = await compose('Example Town church, across the river', Object.assign({}, opts, { project: (resp, cam) => { called++; assert.ok(cam.heading >= 0 && cam.range === 700); return { surfaces: [{ id: 'x', kind: 'grass', poly: [[0, 5], [5, 5], [5, 9]] }], water: [], buildings: [], place: [] }; } }));
  assert.equal(called, 1);
  assert.deepEqual(r3.recipe.scene.surfaces.map(s => s.id), ['land', 'x']);
  // errors say what to do
  await assert.rejects(compose('Nowhere Special, noon', Object.assign({}, opts)), /--at lat,lon/);
  await assert.rejects(compose('Example Town castle', opts), /no castle found/);
  await assert.rejects(compose('Example Town church', Object.assign({}, opts, { osm: null })), /no OpenStreetMap data/);
});

test('the gazetteer: region places and the composed scenes\' sites (offline)', async () => {
  const { loadRegistry } = await import('../tools/lib/anim-render.mjs');
  const reg = loadRegistry(ROOT);
  const g = gazetteer(reg);
  assert.ok(g.length > 100);
  assert.ok(g.every(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && p.name));
  assert.ok(g.some(p => /^scene:uk-area-/.test(p.src)), 'composed scenes give their places');
});

test('the compose command: a dry run on the fixture prints the viewpoint and writes nothing', async () => {
  const cmd = (await import('../tools/lib/scene-cmd/compose.mjs')).default;
  const out = [], tmp = mkdtempSync(join(tmpdir(), 'g-compose-'));
  try {
    const code = await cmd.run({ pack: ['v2-g-test'], 'osm-file': join(ROOT, 'tests', 'fixtures', 'scene-compose-osm.json'), at: '53.39,-1.47', 'dry-run': true, out: tmp },
      { root: ROOT, out: (s) => out.push(s), err: () => {}, positionals: ['compose', 'Example Town church, golden hour, across the river'] }, null);
    assert.equal(code, 0);
    const text = out.join('\n');
    assert.match(text, /viewpoint: .* heading .* horizon/);
    assert.match(text, /preset across-water, golden/);
    assert.equal(readdirSync(tmp).length, 0, 'a dry run writes nothing');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
