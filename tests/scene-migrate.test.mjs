// scene migrate (docs/dev/SCENE_ENGINE_V2.md 16.4 and 27.4; builder D): the pure conversion on a crafted v1 scene (camera, surfaces,
// a canal, ground placements, pinned skyline, scatter and actor paths), then the command on three real v1 scenes with --dry-run:
// every placement converted or pinned, the screen place and scale kept (1.5 units, 3 %), the defects listed, nothing written.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { migrateScene, unprojectPoly, fitChannel } from '../tools/lib/scene-cmd/migrate.mjs';
import { inferCamera } from '../tools/lib/scene-sanity.mjs';
import { main } from '../tools/anim-pack.mjs';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { engineOf } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const temps = [];
after(() => { for (const d of temps) rmSync(d, { recursive: true, force: true }); });
const rect = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}z`;
const DEFS = {
  'vehicle.car': { id: 'vehicle.car', category: 'vehicle', size: [92, 34], real: { h: 1.5 }, tags: [] },
  'tree.t': { id: 'tree.t', category: 'tree', size: [200, 300], real: { h: 15 }, tags: [] },
  'person.w': { id: 'person.w', category: 'person', size: [20, 64], real: { h: 1.72 }, tags: [] },
  'building.far': { id: 'building.far', category: 'building', size: [300, 150], real: { h: 9 }, tags: [] },
  'plant.g': { id: 'plant.g', category: 'plant', size: [40, 40], real: { h: 0.4 }, tags: [] },
  'thing.x': { id: 'thing.x', category: 'prop', size: [10, 10], tags: [] },
};
const E = { ready: true, obj: (id) => DEFS[id] || null, shapes: () => null };

test('migrate: the camera is fitted to the depth ladder; a rectangle unprojects to ground metres; a long channel is a canal', () => {
  const cam = inferCamera({ view: { horizon: 500, fov: 80 } }, {});
  const g = unprojectPoly([[-160, 600], [1760, 600], [1760, 900], [-160, 900]], cam);
  assert.equal(g.length, 4);
  const ds = g.map(p => p[1]);
  assert.ok(Math.abs(Math.max(...ds) - cam.f * cam.eye / 100) < 0.1 && Math.abs(Math.min(...ds) - cam.f * cam.eye / 400) < 0.1, 'rows 600 and 900 at the right depths');
  assert.equal(unprojectPoly([[0, 300], [100, 300], [100, 400]], cam), null, 'all above the horizon: nothing');
  // a channel 9 m wide from 10 m to 300 m, as a screen polygon
  const P = (x, d) => [cam.x0 + cam.f * x / d, cam.horizon + cam.f * cam.eye / d], L = [], R = [];
  for (let d = 10; d <= 300; d *= 1.15) { L.push(P(-4.5 + d * 0.02, d)); R.push(P(4.5 + d * 0.02, d)); }
  const ch = fitChannel(unprojectPoly(L.concat(R.reverse()), cam));
  assert.ok(ch.aspect > 6, `aspect ${ch.aspect}`); assert.ok(Math.abs(ch.width - 9) < 1.2, `width ${ch.width}`);
  const pond = fitChannel(unprojectPoly([P(-30, 40), P(30, 40), P(30, 70), P(-30, 70)], cam));
  assert.ok(pond.aspect < 6, 'a pond is not a canal');
});

test('migrate: a crafted v1 scene: surfaces by slot, a canal, ground placements (at, k), the skyline pinned, scatter and actors on the ground', () => {
  const H = 500, cam = inferCamera({ view: { horizon: H, fov: 80 } }, {});
  const P = (x, d) => [cam.x0 + cam.f * x / d, H + cam.f * cam.eye / d], L = [], R = [];
  for (let d = 12; d <= 400; d *= 1.2) { L.push(P(20 - 4, d)); R.push(P(20 + 4, d)); }
  const canal = 'M' + L.concat(R.reverse()).map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';
  const data = { id: 'crafted', view: { lat: 51, lon: -1, horizon: H, fov: 80, heading: 200 }, at: 'noon', season: 'auto', setting: 'urban', palette: { base: { lawn: '#5a7a3a' } },
    ground: [{ layer: 'horizon', d: 'M-160 480Q800 440 1760 480V900H-160Z', fill: '@hills' }, { layer: 'far', d: 'M-160 505H1760V900H-160Z', fill: '@lawn.0' }, { layer: 'near', d: rect(-160, 700, 1920, 60), fill: { lin: [[0, '@road'], [1, '#444']] } }],
    water: [{ layer: 'mid', d: canal, y0: 505, y1: 900, reflect: true }],
    place: [{ obj: 'vehicle.car', x: 400, y: 730, s: 2 }, { obj: 'building.far', x: 900, y: 498, s: 0.3, layer: 'horizon' }, { obj: 'tree.t', x: 1200, y: 640, s: 0.5, seed: 77 }, { obj: 'thing.x', x: 100, y: 800, s: 1 }],
    scatter: [{ obj: { 'plant.g': 2 }, layer: 'near', area: { rect: [-160, 780, 1760, 900] }, n: 200, s: [0.8, 1.2], seed: 4 }],
    actors: [{ obj: 'person.w', layer: 'near', path: [[-60, 800], [1660, 820]], speed: 30, loop: 'pingpong' }, { obj: 'person.w', layer: 'far', path: [[0, 400], [100, 420]], speed: 10 }] };
  const C = { layers: ['horizon', 'far', 'mid', 'near', 'fore', 'front'].map((id, i) => ({ id, i })), ground: data.ground.map((g, i) => ({ layer: [0, 1, 3][i], d: g.d })), water: [], view: data.view };
  const { rec, report } = migrateScene(data, C, { E, pack: 'zz', meta: { id: 'crafted', label: 'Crafted', when: () => false } });
  assert.equal(rec.v, 2); assert.equal(rec.pack, 'zz'); assert.equal(rec.meta.when, undefined, 'functions do not go into a recipe');
  assert.deepEqual(rec.scene.camera, { eye: Math.round(cam.eye * 100) / 100, fov: 80, horizon: 500, heading: 200 });
  assert.ok(rec.scene.surfaces[0].rest); assert.equal(report.kept.ground, 1, 'the hills stay a pixel band');
  assert.equal(rec.scene.ground[0].fill, '@hills');
  assert.ok(rec.scene.surfaces.some(s => s.kind === 'grass' && s.poly) && rec.scene.surfaces.some(s => s.kind === 'road' && s.poly));
  assert.equal(rec.scene.water[0].kind, 'canal'); assert.ok(Math.abs(rec.scene.water[0].width - 8) < 1.5, `width ${rec.scene.water[0].width}`);
  const car = rec.scene.place[0];
  assert.ok(Array.isArray(car.at) && car.k > 0, 'the car on the ground'); assert.ok(Number.isInteger(car.seed), 'its v1 seed kept');
  const d = car.at[1], X = 800 + cam.f * car.at[0] / d, Y = H + cam.f * cam.eye / d, s = car.k * cam.f / d * 1.5 / 34;
  assert.ok(Math.abs(X - 400) <= 1.5 && Math.abs(Y - 730) <= 1.5 && Math.abs(s / 2 - 1) <= 0.03, 'the same screen place and size');
  assert.equal(rec.scene.place[1].pin, true, 'on the horizon: pinned'); assert.equal(rec.scene.place[2].seed, 77);
  assert.ok(rec.scene.place[3].x === 100 && !rec.scene.place[3].at, 'no real size: kept in pixels'); assert.deepEqual(report.noReal, ['thing.x']);
  assert.deepEqual(report.placements, { ground: 2, pinned: 1, pixel: 1 });
  const sc = rec.scene.scatter[0];
  assert.equal(sc.dist, 'screen'); assert.ok(sc.d[0] < sc.d[1] && sc.x[0] < sc.x[1] && sc.k[0] > 0); assert.equal(sc.n, 200); assert.equal(sc.seed, 4);
  assert.ok(Array.isArray(rec.scene.actors[0].ground) && rec.scene.actors[0].speedM > 0); assert.equal(rec.scene.actors[1].ground, undefined, 'a path into the sky stays in pixels');
  assert.ok(report.check.maxDX <= 1.5 && report.check.maxDY <= 1.5 && report.check.maxDS <= 0.03);
});

const REFS = ['uk-area-woking-b/surrey-woking-commercial-way', 'uk-area-yateley/hampshire-yateley-green-1', 'uk-area-fleet/hampshire-fleet-pond-1'];
const REG = loadRegistry(ROOT), E_REAL = engineOf(REG);
const HAVE = E_REAL.ready && REFS.every(r => REG.items().some(e => e.ref === r)) ? false : 'the engine or the sample scenes are not in this checkout';
test('migrate (CLI): three real v1 scenes, --dry-run: converted or pinned, the place and scale kept, the defects listed, nothing written', { skip: HAVE, timeout: 300000 }, async () => {
  const app = join(ROOT, 'src', 'app'), before = readdirSync(app).sort().join('|');
  const out = [], err = [], dir = mkdtempSync(join(tmpdir(), 'migrate-')); temps.push(dir);
  const code = await main(['scene', 'migrate', REFS.join(','), '--dry-run', '--report', '--out', dir, '--json'], { out: (s) => out.push(s), err: (s) => err.push(s) });
  assert.equal(code, 0, err.join('\n'));
  const j = JSON.parse(out.filter(s => s.startsWith('{')).join('\n'));
  assert.equal(j.dryRun, true); assert.equal(j.scenes.length, 3);
  for (const r of j.scenes) {
    assert.equal(r.placements.ground + r.placements.pinned + r.placements.pixel, (E_REAL.data(REG.items().find(e => e.ref === r.ref).item).place || []).length, `${r.ref}: every placement accounted for`);
    assert.equal(r.placements.pixel, r.noReal.length ? r.placements.pixel : 0, `${r.ref}: a pixel placement only for an object without a real size`);
    assert.ok(r.check.maxDX <= 1.5 && r.check.maxDY <= 1.5 && r.check.maxDS <= 0.03, `${r.ref}: ${JSON.stringify(r.check)}`);
    if (r.compiled) assert.ok(r.compiled.maxDX <= 1.5 && r.compiled.maxDY <= 1.5 && r.compiled.maxDS <= 0.03, `${r.ref} compiled by A: ${JSON.stringify(r.compiled)}`);
    assert.ok(r.sanityBefore && Number.isFinite(r.sanityBefore.errors), 'the v1 sanity findings are in the report');
    assert.equal(r.file, undefined, 'dry run');
  }
  assert.equal(readdirSync(app).sort().join('|'), before, 'nothing written to src/app');
  for (const p of ['uk-area-woking-b', 'uk-area-yateley', 'uk-area-fleet']) assert.ok(existsSync(join(dir, `migrate-${p}.json`)), `--report: migrate-${p}.json`);
  const rep = JSON.parse(readFileSync(join(dir, 'migrate-uk-area-woking-b.json'), 'utf8'));
  assert.equal(rep.pack, 'uk-area-woking-b'); assert.equal(rep.scenes[0].ref, REFS[0]);
});
