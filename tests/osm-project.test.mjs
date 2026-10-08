// The OpenStreetMap import (docs/dev/SCENE_ENGINE_V2.md 17, 27.5; builder E): projection, classification, clipping, simplification,
// the budget, re-import, no names on signs, building styles, landmarks, the fetch etiquette and cache, and the credits.
// No network: fetch is injected and the data is tests/fixtures/osm-sample.json, a SYNTHETIC answer hand-made in local metres
// (a crossroads, a tram line, a canal with its towpath, a park, a terrace of six, a church, trees, a fountain, a statue).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { osmProject, osmMerge, osmCamera, osmHeadings, osmPreviewScene, entryHash, stripEdges } from '../tools/lib/osm-project.mjs';
import { osmFetch, osmQuery, nominatimSearch } from '../tools/lib/osm-fetch.mjs';
import { classifyWay, buildingStyle, buildingHeight, shopOf, landmarkKind, treeObjectFor, sidewalkSides, roadWidth, startYear } from '../tools/lib/osm-tags.mjs';
import { simplify } from '../tools/lib/geo.mjs';
import osmCmd from '../tools/lib/scene-cmd/osm.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = JSON.parse(readFileSync(join(ROOT, 'tests', 'fixtures', 'osm-sample.json'), 'utf8'));
const CAM = { lat: 52.5, lon: -1.25, heading: 0 };
const LIB = [
  { id: 'landmark.example-church', category: 'landmark', tags: ['landmark', 'place:uk/example'] },
  { id: 'landmark.other-tower', category: 'landmark', tags: ['landmark', 'place:uk/other'] },
  { id: 'tree.oak', category: 'tree', tags: [] }, { id: 'tree.birch', category: 'tree', tags: [] }, { id: 'tree.pine', category: 'tree', tags: [] },
];
const run = (o = {}) => osmProject(DATA, Object.assign({}, CAM, o.cam || {}), Object.assign({ library: LIB }, o));
const byId = (list, id) => list.find(e => e.id === id);

test('kinds, widths and pavements beside the roads', () => {
  const { sections: S } = run();
  const roads = S.surfaces.filter(s => s.kind === 'road' && !s.crossing);
  assert.equal(roads.length, 2, 'the street (two ways chained into one) and the cross road');
  const street = roads.find(r => r.path[0][1] < 5), cross = roads.find(r => r !== street);
  assert.equal(street.width, 6, 'residential: 6 m'); assert.equal(cross.width, 6.4, 'tertiary with lanes=2: 2 x 3.2 m');
  assert.equal(street.markings, 'centre');
  for (const side of ['left', 'right']) {
    const p = S.surfaces.find(s => s.kind === 'pavement' && s.beside === street.id && s.side === side);
    assert.ok(p, `the street has a ${side} pavement (urban roads default to both)`); assert.equal(p.width, 2); assert.equal(p.kerb, 0.12);
  }
  assert.ok(!S.surfaces.some(s => s.beside === cross.id), 'the cross road 150 m away gets none: a 2 m strip across the view there is under half a unit');
  const x = S.surfaces.find(s => s.crossing);
  assert.ok(x && x.kind === 'road' && x.markings === 'zebra', 'the zebra crossing is a road strip people may stand on');
  assert.ok(S.surfaces.indexOf(x) > S.surfaces.indexOf(street), 'crossings paint after the roads');
  assert.equal(S.surfaces[0].rest, true, 'a rest surface first (no holes)');
  assert.equal(S.surfaces[0].kind, 'garden', 'built up with houses: the rest is garden (trees may stand in unmapped gardens)');
  assert.equal(osmProject(DATA, CAM, { urban: false }).sections.surfaces[0].kind, 'grass', 'open country: grass');
  const tram = S.surfaces.find(s => s.kind === 'tramway');
  assert.ok(tram && tram.embedded === true, 'the tram line down the street is embedded in it');
  assert.ok(S.surfaces.indexOf(tram) > S.surfaces.indexOf(street), 'the tram rails paint over the road');
  for (const s of S.surfaces) assert.match(s.id, /^[a-z0-9-]{1,30}$/);
  assert.equal(new Set(S.surfaces.map(s => s.id)).size, S.surfaces.length, 'ids are unique');
  for (const k of ['park', 'wood', 'field']) assert.ok(S.surfaces.some(s => s.kind === k && s.poly), k);
  const areas = S.surfaces.filter(s => s.poly), strips = S.surfaces.filter(s => s.path);
  assert.ok(S.surfaces.indexOf(areas[areas.length - 1]) < S.surfaces.indexOf(strips[0]), 'areas paint before strips');
});

test('the canal is a channel with a towpath; the pond is a polygon', () => {
  const { sections: S } = run();
  const canal = S.water.find(w => w.kind === 'canal');
  assert.ok(canal && canal.path && canal.width === 12 && canal.edge === 'coping', 'a canal strip from its centreline, 12 m, coping edges');
  const tp = S.surfaces.find(s => s.kind === 'towpath');
  assert.ok(tp, 'the path along the canal became a towpath');
  assert.ok(Math.abs(tp.path[0][0] - canal.path[0][0]) < 15, 'beside the canal');
  const pond = S.water.find(w => w.kind === 'pond');
  assert.ok(pond && pond.poly.length >= 4);
});

test('everything is clipped to the view wedge', () => {
  const { sections: S, camera } = run({ range: 400 });
  const t = Math.tan(camera.fov / 2 * Math.PI / 180) * 1.2;
  const inside = (p, m) => p[1] >= 0.5 - 1e-9 && p[1] <= 400 + 1e-6 && Math.abs(p[0]) <= p[1] * t + m + 0.15;
  for (const s of S.surfaces.concat(S.water)) {
    for (const p of s.poly || []) assert.ok(inside(p, 0), `${s.id} ${p}`);
    for (const p of s.path || []) assert.ok(inside(p, s.width / 2 + 1), `${s.id} ${p}`);
  }
  assert.ok(!S.surfaces.some(s => s.kind === 'field'), 'the farmland starts beyond 380 m and is cut at 400');
  assert.ok(!S.buildings.some(b => b.foot.some(p => p[0] < -300)), 'the house outside the fov is not imported');
  assert.ok(!S.buildings.some(b => b.foot.some(p => p[1] > 1000)), 'the house 2 km away is not imported');
  for (const p of S.place) assert.ok(inside(p.at, 0), p.obj);
});

test('the simplification tolerance grows with depth', () => {
  // a zigzag of 0.6 m: kept near the camera (1.5 units at 10 m is 0.012 m), smoothed away far off (at 2000 m it is 2.4 m)
  const f = osmCamera(CAM).f, zig = (d0) => Array.from({ length: 21 }, (_, i) => [i % 2 ? 0.6 : 0, d0 + i * 2]);
  const tol = (p) => 1.5 * p[1] / f;
  assert.equal(simplify(zig(10), tol).length, 21, 'near: every vertex kept');
  assert.equal(simplify(zig(2000), tol).length, 2, 'far: a straight line');
  // and in a projection: the far reach of the canal has fewer points per metre than the near one
  const { sections: S } = run();
  assert.ok(S.water.find(w => w.kind === 'canal').path.length <= 3);
});

test('the data budget is respected: tolerance up, far features dropped first', () => {
  const full = run();
  const small = run({ budget: 2600 });
  assert.ok(full.report.bytes > 2600, 'the fixture is bigger than the small budget');
  assert.ok(small.report.bytes <= 2600, `fits: ${small.report.bytes}`);
  assert.ok(small.report.rounds > 0 && small.report.dCut < 700);
  assert.ok(small.report.problems.some(p => p.rule === 'budget'));
  const nearest = (S) => Math.min(...S.buildings.map(b => Math.min(...b.foot.map(p => p[1]))));
  assert.equal(nearest(small.sections), nearest(full.sections), 'the near terrace survives');
  assert.ok(small.sections.buildings.length < full.sections.buildings.length);
});

test('re-import with --into keeps hand entries and hand edits', () => {
  const imp = run();
  const first = osmMerge({ id: 'x', surfaces: [{ id: 'my-lawn', kind: 'lawn', poly: [[0, 5], [2, 5], [2, 8]] }], place: [{ obj: 'street.bench', at: [1, 9] }] }, imp);
  const s1 = first.scene;
  assert.equal(s1.surfaces[0].rest, true, 'the rest surface stays first');
  assert.ok(byId(s1.surfaces, 'my-lawn'), 'the hand surface is kept');
  assert.ok(s1.place.some(p => p.obj === 'street.bench' && !p.src), 'the hand placement is kept');
  assert.equal(s1.source.osm.own.length, first.stats.added);
  // the author edits one imported entry, then imports again
  const road = s1.surfaces.find(s => s.kind === 'road' && !s.crossing); road.width = 7.5;
  const second = osmMerge(s1, imp).scene;
  const edited = second.surfaces.filter(s => s.id === road.id);
  assert.equal(edited.length, 1, 'no duplicate id');
  assert.equal(edited[0].src, 'osm*', 'the hand-edited import is kept and marked');
  assert.equal(edited[0].width, 7.5);
  assert.ok(byId(second.surfaces, 'my-lawn'));
  // an untouched import is replaced, not duplicated
  const n = (sc) => sc.surfaces.filter(s => s.kind === 'pavement').length;
  assert.equal(n(second), n(s1));
  assert.equal(second.buildings.length, s1.buildings.length);
  assert.equal(second.place.length, s1.place.length);
  // a third import changes nothing more
  assert.deepEqual(osmMerge(second, imp).scene, second);
  // a hand rest surface wins over the imported one
  const withRest = osmMerge({ surfaces: [{ id: 'ground', kind: 'grass', rest: true }] }, imp).scene;
  assert.equal(withRest.surfaces.filter(s => s.rest).length, 1); assert.equal(withRest.surfaces[0].id, 'ground');
  assert.equal(entryHash('surfaces', road), entryHash('surfaces', Object.assign({}, road, { src: 'x' })), 'src is not part of the hash');
});

test('no name, brand or operator text reaches the recipe (signs carry generic words only)', () => {
  const { sections: S, report } = run();
  const text = JSON.stringify(S);
  for (const name of ['Example Street', 'Cross Road', 'MegaMart', 'BeanCo', 'Bean There', 'Crusty', 'Example Rail', 'St Example', 'Example Park', 'Example Canal', 'Example Tram', 'The Example Statue', 'Q0'])
    assert.ok(!text.includes(name), `"${name}" is not in the sections`);
  const shops = S.buildings.filter(b => b.shop);
  assert.deepEqual(shops.find(b => b.shop.kind === 'bakery').shop, { kind: 'bakery', sign: 'Bakery' }, 'a generic word from the table');
  assert.equal(shops.find(b => b.shop.kind === 'convenience').shop.sign, false, 'branded: no sign at all');
  assert.equal(shops.find(b => b.shop.kind === 'cafe').shop.sign, false, 'a branded cafe node inside a footprint: no sign');
  assert.ok(report.named.some(n => n.name === 'Example Street'), 'names live in the report only');
  assert.deepEqual(shopOf({ shop: 'bakery', name: 'Real Name Ltd' }), { kind: 'bakery', sign: 'Bakery' });
  assert.equal(shopOf({ shop: 'tattoo' }).sign, false, 'no generic word: no sign');
});

test('building styles from start_date, material, type and region', () => {
  const { sections: S } = run();
  const st = (x0, d0) => S.buildings.find(b => b.foot.some(p => p[0] === x0 && p[1] === d0)).style;
  assert.equal(st(9, 40), 'victorian-terrace', 'terrace, 1885');
  assert.equal(st(25, 180), 'brutalist', '1965, concrete');
  assert.equal(st(-40, 175), 'norfolk-flint', 'flint');
  assert.equal(st(30, 330), 'modern-glass', '2004');
  assert.equal(buildingStyle({ building: 'house', start_date: '1760' }), 'georgian');
  assert.equal(buildingStyle({ building: 'house', start_date: '1910' }), 'edwardian');
  assert.equal(buildingStyle({ building: 'semidetached_house', start_date: '1934' }), '1930s-semi');
  assert.equal(buildingStyle({ building: 'retail', start_date: '1930' }), 'interwar-shops');
  assert.equal(buildingStyle({ building: 'warehouse', start_date: '1870' }), 'mill');
  assert.equal(buildingStyle({ building: 'train_station' }), 'station');
  assert.equal(buildingStyle({ building: 'house' }, { lat: 52.63, lon: 1.3 }), 'norfolk-flint', 'Norfolk leans flint');
  assert.equal(buildingStyle({ building: 'house' }, { lat: 53.35, lon: -1.8 }), 'stone-cottage', 'the Pennines lean stone');
  assert.equal(startYear('C19'), 1850); assert.equal(startYear('~1930'), 1930);
  const t = S.buildings.find(b => b.foot.some(p => p[0] === 9 && p[1] === 40));
  assert.equal(t.storeys, 2); assert.ok(t.h > 6 && t.h < 10); assert.equal(t.roof, 'gable');
  assert.equal(t.front, t.foot.findIndex((p, i) => p[0] === 9 && t.foot[(i + 1) % t.foot.length][0] === 9), 'the door faces the street');
  assert.equal(S.buildings.find(b => b.h === 36).storeys, 12, 'height tag: 36 m');
  assert.equal(buildingHeight({ building: 'yes', 'building:levels': '4', 'roof:shape': 'flat' }).h, 12);
  for (const b of S.buildings) { assert.ok(b.seed >= 1 && b.seed <= 9973); assert.ok(b.foot.length >= 3 && b.foot.length <= 24); }
});

test('landmarks are matched in the library or listed as missing', () => {
  const { sections: S, report } = run();
  const church = S.place.find(p => p.obj === 'landmark.example-church');
  assert.ok(church && church.fix === true, 'the church matched its library landmark by name; fix: never snapped');
  assert.ok(Math.abs(church.at[0] + 50) < 1 && Math.abs(church.at[1] - 220) < 1, 'at its real position');
  assert.ok(!S.buildings.some(b => b.foot.some(p => p[0] === -60 && p[1] === 200)), 'its footprint is not drawn twice');
  assert.ok(report.missing.some(m => m.kind === 'fountain' && /fountain, 1\d\d m/.test(m.msg)), 'the fountain is missing');
  assert.ok(report.missing.some(m => m.kind === 'statue'), 'the statue is missing');
  assert.equal(S.place.find(p => p.at[0] === -30 && p.at[1] === 50).obj, 'tree.birch', 'genus Betula');
  assert.equal(S.place.find(p => p.at[0] === -35).obj, 'tree.oak', 'species Quercus robur');
  assert.equal(S.place.find(p => p.at[0] === -200).obj, 'tree.pine', 'needle-leaved');
  assert.ok(S.scatter.some(r => r.on === byId(S.surfaces, r.on).id && byId(S.surfaces, r.on).kind === 'wood' && r.dist === 'ground'), 'the wood gets a tree scatter rule on it');
  // without a library: kinds only, nothing invented
  const bare = osmProject(DATA, CAM, {});
  assert.ok(!bare.sections.place.some(p => p.obj.startsWith('landmark.')));
  assert.equal(landmarkKind({ amenity: 'place_of_worship' }), 'church');
  assert.equal(landmarkKind({ amenity: 'townhall', name: 'X' }), 'townhall');
  assert.equal(treeObjectFor({ species: 'Platanus x hispanica' }), 'tree.plane');
});

test('classification details', () => {
  assert.equal(classifyWay({ highway: 'residential', tunnel: 'yes' }), null, 'tunnels are not drawn');
  assert.equal(classifyWay({ highway: 'path', layer: '-1' }).kind, 'path', 'layer -1 alone is not underground (a towpath under a bridge)');
  assert.equal(classifyWay({ railway: 'rail', tracks: '2' }).width, 7);
  assert.equal(classifyWay({ railway: 'abandoned' }), null);
  assert.equal(classifyWay({ waterway: 'river' }).width, 25);
  assert.equal(classifyWay({ natural: 'water', water: 'reservoir' }, { closed: true }).kind, 'lake');
  assert.equal(classifyWay({ leisure: 'park' }, { closed: true }).kind, 'park');
  assert.equal(classifyWay({ highway: 'footway', footway: 'sidewalk' }).kind, 'pavement');
  assert.equal(classifyWay({ highway: 'primary', bridge: 'yes' }).bridge, true);
  assert.equal(roadWidth({ highway: 'primary', width: '12 m' }), 12);
  assert.deepEqual(sidewalkSides({ highway: 'residential' }, false), []);
  assert.deepEqual(sidewalkSides({ highway: 'residential', 'sidewalk:right': 'yes' }, true), ['right']);
  assert.deepEqual(sidewalkSides({ highway: 'residential', sidewalk: 'separate' }, true), []);
});

test('headings without --heading, and the v1 preview', () => {
  const dirs = osmHeadings(DATA, { lat: 52.5, lon: -1.25, range: 700 });
  assert.equal(dirs.length, 8);
  assert.ok(dirs[0].features.some(f => f.name === 'Example Street'), 'north: the street');
  const imp = run();
  const v1 = osmPreviewScene(Object.assign({ camera: imp.camera }, imp.sections), { sizeOf: () => [100, 100], realOf: () => 10 });
  assert.equal(v1.v, 1);
  assert.ok(v1.ground.length > 20 && v1.water.length >= 2);
  for (const g of v1.ground) assert.match(g.d, /^M-?[\d.]+ -?[\d.]+( L-?[\d.]+ -?[\d.]+)+ Z$/);
  const { L, R } = stripEdges([[0, 10], [0, 20]], 4);
  assert.deepEqual(L[0], [-2, 10]); assert.deepEqual(R[0], [2, 10]);
});

/* ---------- fetching: an injected fetch, the cache, --offline, a 429 retried once ---------- */
const answer = (status, body) => ({ status, ok: status >= 200 && status < 300, statusText: '', json: async () => body, text: async () => JSON.stringify(body) });
test('fetch: one request, the cache on the second run, --offline, a 429 retried once', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'osm-cache-'));
  try {
    const bbox = [52.49, -1.26, 52.51, -1.24];
    const calls = [];
    const fetch = async (url, init) => { calls.push({ url, init }); return answer(200, DATA); };
    const t0 = Date.parse('2026-10-08T12:00:00Z');
    const a = await osmFetch({ bbox, fetch, cacheDir: dir, now: () => t0 });
    assert.equal(calls.length, 1); assert.equal(a.cached, false); assert.equal(a.fetched, '2026-10-08'); assert.match(a.hash, /^[0-9a-f]{6}$/);
    assert.equal(calls[0].init.method, 'POST');
    assert.match(calls[0].init.headers['User-Agent'], /^OpenDash scene tool \(https:\/\/github\.com\/mahdi1190\/opendash\)$/);
    assert.ok(!('Accept' in calls[0].init.headers), 'no Accept header (Overpass answers 504 to application/json)');
    assert.match(decodeURIComponent(calls[0].init.body.slice(5)), /\[out:json\]\[timeout:60\]\[bbox:52\.49,-1\.26,52\.51,-1\.24\];[\s\S]*out geom;/);
    const b = await osmFetch({ bbox, fetch, cacheDir: dir, now: () => t0 + 86400000 });
    assert.equal(calls.length, 1, 'the second run reads the cache'); assert.equal(b.cached, true); assert.equal(b.hash, a.hash);
    const inner = await osmFetch({ bbox: [52.495, -1.255, 52.505, -1.245], fetch, cacheDir: dir, now: () => t0 });
    assert.equal(calls.length, 1, 'a bbox inside a cached one is served from the cache'); assert.equal(inner.cached, true);
    assert.ok(readdirSync(join(dir, 'osm')).some(f => /^[0-9a-f]{40}\.json$/.test(f)));
    await osmFetch({ bbox, fetch, cacheDir: dir, now: () => t0 + 31 * 86400000 });
    assert.equal(calls.length, 2, 'older than 30 days: fetched again');
    await assert.rejects(osmFetch({ bbox: [1, 1, 2, 2], fetch, cacheDir: dir, offline: true }), /--offline/);
    assert.equal(calls.length, 2, '--offline never fetches');
    // 429 then 200: one wait of 30 s and one retry
    const seq = [answer(429, {}), answer(200, DATA)], slept = [];
    const r = await osmFetch({ bbox: [3, 3, 4, 4], fetch: async () => seq.shift(), cacheDir: dir, sleep: async (ms) => { slept.push(ms); } });
    assert.deepEqual(slept, [30000]); assert.equal(r.data.elements.length, DATA.elements.length);
    // busy twice: a clear failure, no third request
    let n = 0;
    await assert.rejects(osmFetch({ bbox: [5, 5, 6, 6], fetch: async () => { n++; return answer(504, {}); }, cacheDir: dir, sleep: async () => {} }), /busy/);
    assert.equal(n, 2);
    assert.throws(() => osmQuery([2, 2, 1, 1]), /bad bbox/);
    // geocoding: cached, at most one request per second
    let g = 0;
    const gfetch = async () => { g++; return answer(200, [{ lat: '52.5', lon: '-1.25', display_name: 'Somewhere', type: 'town' }]); };
    const hits = await nominatimSearch('Somewhere', { fetch: gfetch, cacheDir: dir, sleep: async () => {} });
    assert.deepEqual(hits[0], { lat: 52.5, lon: -1.25, label: 'Somewhere', type: 'town', cls: '' });
    await nominatimSearch('somewhere', { fetch: gfetch, cacheDir: dir, sleep: async () => {} });
    assert.equal(g, 1, 'the second lookup is cached');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the command: --out and --dry-run with an injected fetch (no network)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'osm-cmd-'));
  try {
    const lines = [];
    const ctx = { root: ROOT, positionals: [], out: (s) => lines.push(s), err: () => {}, cacheDir: dir, fetch: async () => answer(200, DATA), library: { objs: LIB, realOf: () => null, sizeOf: () => null } };
    assert.equal(await osmCmd.run({ at: '52.5,-1.25', heading: '0', out: join(dir, 'o.json') }, ctx), 0);
    const o = JSON.parse(readFileSync(join(dir, 'o.json'), 'utf8'));
    assert.ok(o.camera && o.surfaces.length && o.water.length && o.buildings.length && o.source.osm.hash);
    assert.ok(lines.some(l => /credit: \(c\) OpenStreetMap contributors, ODbL 1\.0/.test(l)));
    lines.length = 0;
    assert.equal(await osmCmd.run({ at: '52.5,-1.25', heading: '0', 'dry-run': true, offline: true, out: join(dir, 'never.json') }, ctx), 0);
    assert.ok(!existsSync(join(dir, 'never.json')), '--dry-run writes nothing');
    lines.length = 0;
    assert.equal(await osmCmd.run({ at: '52.5,-1.25' }, ctx), 0);
    assert.ok(lines.some(l => /^\s+0\s+N\s+.*Example Street/.test(l)), 'no --heading: the 8 directions');
    await assert.rejects(osmCmd.run({ at: '95,1', heading: '0' }, ctx), /lat,lon/);
    for (const k of ['at', 'heading', 'fov', 'eye', 'horizon', 'range', 'place', 'into', 'out', 'refresh', 'offline', 'dry-run', 'json']) assert.ok(osmCmd.options[k], k);
    assert.equal(typeof osmCmd.summary, 'string'); assert.equal(typeof osmCmd.usage, 'string');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ---------- credits (17.6) ---------- */
function loadCredit() {
  const ctx = { sceneData: (it) => (typeof it.scene === 'function' ? it.scene() : it.scene) };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(join(ROOT, 'src', 'app', '70-scene-1credit.js'), 'utf8') + '\n;this.sceneCredits = sceneCredits; this.sceneCreditAboutHtml = sceneCreditAboutHtml;', ctx);
  return ctx;
}
test('sceneCredits lists OpenStreetMap and the terrain source from scene.source; the About row', () => {
  const K = loadCredit();
  const C = (x) => [...K.sceneCredits(x)];
  assert.deepEqual(C({ id: 'x' }), []);
  assert.deepEqual(C({ source: { osm: { fetched: '2026-10-08' } } }), ['© OpenStreetMap contributors']);
  const both = C({ scene: () => ({ source: { osm: { hash: 'abc' }, terrain: { src: 'terrarium', area: 'gb' } } }), composed: true });
  assert.equal(both.length, 2);
  assert.match(both[1], /Terrain Tiles/); assert.match(both[1], /Environment Agency/); assert.match(both[1], /SRTM/);
  assert.deepEqual(C({ v: 2, pack: 'p', scene: { source: { terrain: { src: 'os50' } } } }), ['Contains OS data © Crown copyright and database right']);
  assert.ok(!/Environment Agency/.test(K.sceneCredits({ source: { terrain: { src: 'terrarium', area: 'world' } } })[0]));
  const row = K.sceneCreditAboutHtml();
  assert.match(row, /^<dt>Maps<\/dt><dd>Scene layouts from OpenStreetMap, © OpenStreetMap contributors \(ODbL 1\.0, <a href="https:\/\/www\.openstreetmap\.org\/copyright" target="_blank" rel="noopener noreferrer">/);
  assert.match(row, /terrain from the sources in THIRD_PARTY_NOTICES\.md<\/dd>$/);
  const settings = readFileSync(join(ROOT, 'src', 'app', '57-settings.js'), 'utf8');
  assert.match(settings, /typeof sceneCreditAboutHtml === 'function' \? sceneCreditAboutHtml\(\) : ''/, 'Settings > About shows the row');
  const notices = readFileSync(join(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  assert.match(notices, /Open Database License/); assert.match(notices, /openstreetmap\.org\/copyright/); assert.match(notices, /Environment Agency copyright and\/or database right\s+2015/);
});

test('--into: a new recipe through scene-recipe.mjs (header credit line), then a re-import that keeps a hand edit', async (t) => {
  let R;
  try { R = await import('../tools/lib/scene-recipe.mjs'); } catch { t.skip('tools/lib/scene-recipe.mjs (builder D) is not there'); return; }
  const root = mkdtempSync(join(tmpdir(), 'osm-into-'));
  try {
    const ctx = { root, positionals: [], out: () => {}, err: () => {}, cacheDir: join(root, 'cache'), fetch: async () => answer(200, DATA), library: { objs: LIB, realOf: () => null, sizeOf: () => null } };
    assert.equal(await osmCmd.run({ at: '52.5,-1.25', heading: '0', into: 'e-test/osm-demo' }, ctx, { recipes: R }), 0);
    const file = join(root, 'src', 'app', '71-scene-e-test-r-osm-demo.js');
    const text = readFileSync(file, 'utf8');
    assert.match(text, /Contains OpenStreetMap data, \(c\) OpenStreetMap contributors, ODbL 1\.0/);
    const r1 = R.readRecipe(root, 'e-test/osm-demo');
    assert.equal(r1.rec.scene.camera.heading, 0); assert.ok(r1.rec.scene.source.osm.own.length > 10);
    assert.ok(r1.rec.scene.surfaces.length && r1.rec.scene.buildings.length && r1.rec.scene.place.length);
    // the author widens a road and adds a bench by hand
    const rec = r1.rec, road = rec.scene.surfaces.find(s => s.kind === 'road' && !s.crossing);
    road.width = 8; rec.scene.place.push({ obj: 'street.bench', at: [1, 12] });
    R.writeRecipe(root, rec, { version: r1.version });
    assert.equal(await osmCmd.run({ at: '52.5,-1.25', heading: '0', into: 'e-test/osm-demo' }, ctx, { recipes: R }), 0);
    const r2 = R.readRecipe(root, 'e-test/osm-demo').rec.scene;
    const kept = r2.surfaces.find(s => s.id === road.id);
    assert.equal(kept.width, 8); assert.equal(kept.src, 'osm*');
    assert.ok(r2.place.some(p => p.obj === 'street.bench' && !p.src));
    assert.equal(r2.surfaces.filter(s => s.id === road.id).length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
