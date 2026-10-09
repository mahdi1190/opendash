// Real terrain and horizons (tools/lib/terrain.mjs, scene-cmd/terrain.mjs; docs/dev/SCENE_ENGINE_V2.md 18, 27.5; builder E).
// No network: the terrarium tile is tests/fixtures/terrarium-sample.png, a SYNTHETIC gradient (100 m + 2 m per pixel east + 0.5 m per
// pixel south), served by an injected fetch; the ridge test uses a synthetic cone; os50 uses a hand-written .asc grid.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { terrariumHeight, decodeTerrarium, terrariumSource, os50Source, curvatureDrop, terrainRidges, terrainRelief, terrainSample, terrainArea } from '../tools/lib/terrain.mjs';
import { tileXY, tileLatLon, groundOf, wgs84ToBng } from '../tools/lib/geo.mjs';
import terrainCmd, { terrainMerge } from '../tools/lib/scene-cmd/terrain.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PNG = readFileSync(join(ROOT, 'tests', 'fixtures', 'terrarium-sample.png'));
const close = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg || ''} ${a} vs ${b} (eps ${eps})`);
const pngAnswer = () => ({ status: 200, ok: true, arrayBuffer: async () => PNG.buffer.slice(PNG.byteOffset, PNG.byteOffset + PNG.length) });

test('a synthetic terrarium tile decodes to the right heights', () => {
  assert.equal(terrariumHeight(128, 0, 0), 0);
  assert.equal(terrariumHeight(128, 100, 128), 100.5);
  const t = decodeTerrarium(PNG);
  assert.equal(t.width, 256); assert.equal(t.height, 256);
  const at = (x, y) => t.h[y * 256 + x];
  assert.equal(at(0, 0), 100); assert.equal(at(10, 20), 130); assert.equal(at(255, 255), 737.5); assert.equal(at(3, 1), 106.5);
});

test('the terrarium source: tiles fetched once, cached, bilinear heights, --offline', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'terrain-cache-'));
  try {
    const urls = [];
    const fetch = async (u) => { urls.push(u); return pngAnswer(); };
    const src = terrariumSource({ fetch, cacheDir: dir });
    const z = 12, T = tileXY(53.35, -1.81, z), tx = Math.floor(T.x), ty = Math.floor(T.y);
    const [la, lo] = tileLatLon(tx + 10.5 / 256, ty + 20.5 / 256, z);   // the centre of pixel (10, 20)
    await src.ensure([[la, lo]], z);
    assert.ok(urls.some(u => u === `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/12/${tx}/${ty}.png`));
    close(src.heightAt(la, lo, z), 130, 1e-6, 'a pixel centre');
    const [lb, lp] = tileLatLon(tx + 11 / 256, ty + 20.5 / 256, z);   // half way to the next pixel east: +1 m
    close(src.heightAt(lb, lp, z), 131, 1e-6, 'bilinear');
    assert.ok(existsSync(join(dir, 'terrain', 'terrarium', '12', String(tx), ty + '.png')), 'cached under .anim-ref/cache/terrain/');
    const n = urls.length;
    const again = terrariumSource({ fetch, cacheDir: dir, offline: true });
    await again.ensure([[la, lo]], z);
    assert.equal(urls.length, n, 'the second source reads the cache');
    close(again.heightAt(la, lo, z), 130, 1e-6);
    await assert.rejects(terrariumSource({ fetch, cacheDir: dir, offline: true }).ensure([[10, 10]], z), /--offline/);
    assert.equal(terrainArea(53.35, -1.81), 'gb'); assert.equal(terrainArea(48.85, 2.35), 'eu'); assert.equal(terrainArea(35.6, 139.7), 'world');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the curvature and refraction drop at 20 km is about 27.3 m', () => {
  close(curvatureDrop(20000), 27.3, 0.05);
  assert.equal(curvatureDrop(0), 0);
});

/** A cone 300 m high, 2 km in radius, 5 km ahead of a camera at sea level looking north. */
function cone(cam, { d0 = 5000, x0 = 0, H = 300, R = 2000 } = {}) {
  const g = groundOf(cam);
  return (lat, lon) => { const [x, d] = g.toGround(lat, lon), r = Math.hypot(x - x0, d - d0); return r < R ? H * (1 - r / R) : 0; };
}
test('ridges over a synthetic cone: one silhouette, at the expected rows', () => {
  const cam = { lat: 53, lon: -1.5, heading: 0, fov: 66, eye: 1.65, horizon: 470 }, f = 800 / Math.tan(33 * Math.PI / 180);
  const r = terrainRidges(cone(cam), cam, { range: 25000, alt: 0 });
  assert.equal(r.ridges.length, 1, JSON.stringify(r.ridges.map(x => x.band)));
  const R = r.ridges[0];
  assert.equal(R.band, 'mid', 'the 2 to 6 km band');
  assert.ok(R.d > 3000 && R.d < 6000);
  assert.ok(R.pts.length <= 60 && R.pts.length >= 3);
  const peak = R.pts.reduce((a, b) => (b[1] < a[1] ? b : a));
  const expect = 470 - f * (300 - 1.65 - curvatureDrop(5000)) / 5000;
  close(peak[0], 800, 4, 'the peak column'); close(peak[1], expect, 1.5, 'the peak row');
  for (const p of R.pts) { assert.ok(Number.isInteger(p[0]) && Number.isInteger(p[1])); }
  const left = R.pts[0];
  assert.ok(left[1] > 470, 'beyond the cone the band is flat ground just below eye level');
  assert.equal(r.alt, 0); close(r.eyeAlt, 1.7, 0.06);
  // the skyline is the overall maximum
  close(Math.min(...r.skyline.map(p => p[1])), expect, 1.5);
  // flat land everywhere: no ridges at all
  assert.equal(terrainRidges(() => 0, cam, { range: 8000, alt: 0 }).ridges.length, 0);
  // from a summit everything lies below eye level and still reads as layers
  const hill = terrainRidges((la, lo) => cone(cam)(la, lo) + 200, Object.assign({}, cam), { range: 25000, alt: 600 });
  assert.ok(hill.ridges.length >= 1 && hill.ridges.every(x => x.pts.every(p => p[1] > 470)));
});

test('a relief grid of 7 x 9 relative to the camera\'s ground', () => {
  const cam = { lat: 53, lon: -1.5, heading: 90 }, g = groundOf(cam);
  const slope = (lat, lon) => { const [, d] = g.toGround(lat, lon); return 50 + d / 5; };
  const rel = terrainRelief(slope, cam);
  assert.equal(rel.nx, 7); assert.equal(rel.nd, 9); assert.equal(rel.h.length, 63); assert.equal(rel.src, 'terrain');
  close(rel.h[0], 1, 0.15, 'd = 5 m: 1 m up'); close(rel.h[62], 240, 0.6, 'd = 1200 m: 240 m up');
  close(rel.h[3 * 7], rel.h[3 * 7 + 6], 0.2, 'no cross slope');
});

test('terrainSample gives the recipe sections; the command writes them (injected fetch)', async () => {
  const cam = { lat: 53, lon: -1.5, heading: 0, fov: 66, eye: 1.65, horizon: 470 };
  const h = cone(cam);
  const fake = { name: 'terrarium', fetched: '2026-10-08', tiles: new Map(), area: terrainArea, async ensure() { return 1; }, heightAt: (la, lo) => h(la, lo) };
  const s = await terrainSample(cam, { source: fake, relief: true });
  assert.equal(s.terrain.src, 'terrarium'); assert.equal(s.terrain.ridges.length, 1);
  assert.equal(s.camera.alt, 0); assert.deepEqual(s.source.terrain, { src: 'terrarium', fetched: '2026-10-08', area: 'gb' });
  assert.equal(s.ground.relief.h.length, 63);
  const merged = terrainMerge({ id: 'x', camera: { eye: 1.7 }, ground: [], source: { osm: { hash: 'a' } } }, s);
  assert.equal(merged.camera.alt, 0); assert.equal(merged.camera.eye, 1.7);
  assert.ok(merged.source.osm && merged.source.terrain); assert.ok(merged.ground.relief);
  const dir = mkdtempSync(join(tmpdir(), 'terrain-cmd-'));
  try {
    const lines = [];
    const ctx = { root: ROOT, positionals: [], out: (x) => lines.push(x), err: () => {}, cacheDir: dir, fetch: async () => pngAnswer() };
    assert.equal(await terrainCmd.run({ at: '53.35,-1.81', heading: '65', range: '3000', out: join(dir, 't.json') }, ctx), 0);
    const o = JSON.parse(readFileSync(join(dir, 't.json'), 'utf8'));
    assert.ok(o.terrain && Array.isArray(o.terrain.ridges) && Number.isFinite(o.camera.alt) && o.source.terrain.src === 'terrarium');
    assert.ok(lines.some(l => /credit:/.test(l)));
    await assert.rejects(terrainCmd.run({ at: '53.35,-1.81' }, ctx), /--heading/);
    await assert.rejects(terrainCmd.run({ at: '53.35,-1.81', heading: '0', dem: 'srtm' }, ctx), /--dem/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('os50: a local ASCII grid in the British National Grid', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'os50-'));
  try {
    const lat = 53.349, lon = -1.81, [e, n] = wgs84ToBng(lat, lon);
    const xll = Math.floor(e / 50) * 50 - 100, yll = Math.floor(n / 50) * 50 - 100;   // a 5 x 5 grid of 50 m cells round the point
    const rows = []; for (let r = 0; r < 5; r++) { const cy = yll + (5 - r - 0.5) * 50; rows.push(Array.from({ length: 5 }, (_, c) => (400 + (xll + (c + 0.5) * 50 - xll) * 0.1 + (cy - yll) * 0.2).toFixed(1)).join(' ')); }
    mkdirSync(join(dir, 'sk'));
    writeFileSync(join(dir, 'sk', 'SK18.asc'), `ncols 5\nnrows 5\nxllcorner ${xll}\nyllcorner ${yll}\ncellsize 50\nNODATA_value -9999\n${rows.join('\n')}\n`);
    const src = os50Source({ dir });
    assert.equal(src.tiles.length, 1);
    const plane = (E, N) => 400 + (E - xll) * 0.1 + (N - yll) * 0.2;
    close(src.atGrid(xll + 125, yll + 125), plane(xll + 125, yll + 125), 1e-3, 'a cell centre');
    close(src.atGrid(xll + 150, yll + 140), plane(xll + 150, yll + 140), 1e-3, 'bilinear between centres');
    close(src.heightAt(lat, lon), plane(e, n), 1e-3, 'from WGS84 through the grid');
    assert.ok(Number.isNaN(src.atGrid(0, 0)), 'outside every tile');
    assert.throws(() => os50Source({ dir: join(dir, 'nope') }), /no such folder/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
