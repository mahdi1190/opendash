// node tools/anim-pack.mjs scene terrain ...   real terrain and horizons (docs/dev/SCENE_ENGINE_V2.md 18; builder E)
//
//   scene terrain --at <lat,lon> --heading <deg> [--fov 66] [--eye 1.65] [--horizon 470] [--range 25000]
//                 [--dem terrarium | os50 --dem-dir <folder of OS Terrain 50 .asc tiles>] [--relief]
//                 [--into <pack>/<id> | --out file.json] [--refresh] [--offline] [--dry-run] [--json]
//
// Samples open elevation data along 161 rays across the view (every 30 m, with the earth's curvature and refraction), writes the
// hill silhouettes per depth band (ridges), the skyline, the camera's ground altitude and (--relief) a near relief grid as plain
// recipe data. Tiles are cached a year in .anim-ref/cache/terrain/ (git-ignored); the app never fetches. Credits: 70-scene-1credit.js
// and THIRD_PARTY_NOTICES.md (the Terrain Tiles attribution, verbatim; OS Terrain 50 under the OGL).
// Also runnable on its own: node tools/lib/scene-cmd/terrain.mjs --at ... (the same options).
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { terrariumSource, os50Source, terrainSample } from '../terrain.mjs';
import { cacheRoot } from '../osm-fetch.mjs';
import { numOpt, latLonOpt, openRecipe, saveRecipe } from './osm.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

/** Merge terrain sections into a recipe scene (terrain, camera.alt, ground.relief, source.terrain), replacing the previous import. */
export function terrainMerge(scene, t) {
  const s = JSON.parse(JSON.stringify(scene || {}));
  s.terrain = t.terrain;
  s.camera = Object.assign({}, s.camera || {}, t.camera);
  if (t.ground && t.ground.relief) s.ground = Object.assign({}, s.ground && !Array.isArray(s.ground) ? s.ground : {}, { relief: t.ground.relief });
  s.source = Object.assign({}, s.source || {}, { terrain: t.source.terrain });
  return s;
}

const cmd = {
  summary: 'terrain: real hill silhouettes (ridges by depth band), the skyline, the camera altitude and near relief from open elevation data, as recipe data',
  usage: 'scene terrain --at <lat,lon> --heading <deg> [--fov 66] [--eye 1.65] [--horizon 470] [--range 25000] [--dem terrarium | os50 --dem-dir <dir>] [--relief] [--into <pack>/<id> | --out file.json] [--refresh] [--offline] [--dry-run] [--json]',
  options: {
    at: { type: 'string', help: 'osm / terrain: the camera position, lat,lon (sheet / capture: an ISO moment)' },
    heading: { type: 'string', help: 'which way the view looks (degrees from north)' },
    fov: { type: 'string', help: 'osm / terrain: the horizontal field of view in degrees (default 66)' },
    eye: { type: 'string', help: 'osm / terrain: the eye height above the ground in metres (default 1.65)' },
    horizon: { type: 'string', help: 'osm / terrain: the screen row of eye level (default 470)' },
    range: { type: 'string', help: 'osm: how far to import in metres (default 700); terrain: how far to sample (default 25000)' },
    dem: { type: 'string', help: 'terrain: the elevation source: terrarium (default; the open Terrain Tiles, fetched and cached) or os50 (local OS Terrain 50 .asc tiles, Great Britain)' },
    'dem-dir': { type: 'string', help: 'terrain --dem os50: the folder of OS Terrain 50 ASCII-grid (.asc) tiles' },
    relief: { type: 'boolean', help: 'terrain: also a 7 x 9 near relief grid (x -300 to 300 m, d 5 to 1200 m) from zoom 14' },
    into: { type: 'string', help: 'osm / terrain: merge into the recipe <pack>/<id> (created when missing)' },
    out: { type: 'string', help: 'osm / terrain: write the sections as JSON to this file' },
    refresh: { type: 'boolean', help: 'osm / terrain: ignore the cache and fetch again' },
    offline: { type: 'boolean', help: 'osm / terrain: never fetch; use the cache' },
    'dry-run': { type: 'boolean', help: 'print the summary; write nothing' },
    json: { type: 'boolean', help: 'machine-readable output' },
  },
  notes: [
    'The default source is the Terrain Tiles dataset (AWS Open Data; SRTM, the Environment Agency in the UK, EU-DEM and others): zoom 12 for the skyline, zoom 14 for the camera altitude and the relief, cached a year in .anim-ref/cache/terrain/.',
    'Ridges are screen rows for the recipe\'s camera (horizon, fov, heading): re-run the command after changing the camera. The v2 compile paints them as layered hills with aerial perspective (V2 18.3).',
  ],
  async run(args, ctx, lib) {
    const root = ctx.root || ROOT, err = ctx.err || (() => {}), out = ctx.out;
    let target = null;
    if (args.into) target = await openRecipe(root, args.into, lib);
    const rc = target && target.rec.scene && (target.rec.scene.camera || {});
    let at = latLonOpt(args.at);
    if (!at && rc && Number.isFinite(rc.lat)) at = [rc.lat, rc.lon];
    if (!at && target && target.rec.scene.view && Number.isFinite(target.rec.scene.view.lat)) at = [target.rec.scene.view.lat, target.rec.scene.view.lon];
    if (!at) throw new Error('scene terrain needs --at lat,lon (or --into a recipe with a camera)');
    const heading = args.heading != null ? numOpt(args, 'heading', 0, { min: -360, max: 720 }) : rc && Number.isFinite(rc.heading) ? rc.heading : null;
    if (heading == null) throw new Error('scene terrain needs --heading <deg> (which way the view looks)');
    const cam = {
      lat: at[0], lon: at[1], heading: ((heading % 360) + 360) % 360,
      fov: numOpt(args, 'fov', rc && rc.fov || 66, { min: 20, max: 120 }),
      eye: numOpt(args, 'eye', rc && rc.eye || 1.65, { min: 0.3, max: 400 }),
      horizon: numOpt(args, 'horizon', rc && rc.horizon != null ? rc.horizon : 470, { min: 80, max: 860 }),
    };
    const range = numOpt(args, 'range', 25000, { min: 1000, max: 80000 });
    const dem = args.dem || 'terrarium';
    let source;
    if (dem === 'terrarium') source = terrariumSource({ fetch: ctx.fetch || globalThis.fetch, cacheDir: ctx.cacheDir || cacheRoot(root), refresh: args.refresh, offline: args.offline, log: err });
    else if (dem === 'os50') source = os50Source({ dir: args['dem-dir'] });
    else throw new Error('--dem must be terrarium or os50');
    const res = await terrainSample(cam, { source, range, relief: !!args.relief, z: dem === 'os50' ? 0 : 12, zNear: dem === 'os50' ? 0 : 14, log: err });
    if (args.json && !args.into && !args.out) out(JSON.stringify(res, null, 1));
    else {
      out(`Terrain: ${cam.lat.toFixed(5)},${cam.lon.toFixed(5)} looking ${Math.round(cam.heading)} deg, fov ${cam.fov}, horizon ${cam.horizon}, range ${Math.round(range / 1000)} km, source ${source.name}`);
      out(`  camera ground ${res.camera.alt} m above sea level (eye ${res.stats.eyeAlt} m); ${res.stats.samples} samples on ${res.stats.rays} rays; ${res.stats.tiles} tile(s), ${res.stats.requests} fetched`);
      for (const r of res.terrain.ridges) { const ys = r.pts.map(p => p[1]); out(`  ridge ${r.band.padEnd(4)} at about ${(r.d / 1000).toFixed(1)} km: ${r.pts.length} points, rows ${Math.min(...ys)} to ${Math.max(...ys)} (horizon ${cam.horizon})`); }
      const sy = res.terrain.skyline.map(p => p[1]); out(`  skyline: rows ${Math.min(...sy)} to ${Math.max(...sy)}`);
      if (res.ground) out(`  relief: ${res.ground.relief.nx} x ${res.ground.relief.nd}, heights ${Math.min(...res.ground.relief.h)} to ${Math.max(...res.ground.relief.h)} m`);
      out(`  credit: ${source.name === 'os50' ? 'Contains OS data (c) Crown copyright and database right' : 'Terrain Tiles (AWS Open Data); see THIRD_PARTY_NOTICES.md'}`);
    }
    if (args['dry-run']) return 0;
    const { stats, ...sections } = res;
    if (args.out) { mkdirSync(dirname(resolve(args.out)), { recursive: true }); writeFileSync(resolve(args.out), JSON.stringify(sections, null, 1) + '\n'); out(`wrote ${resolve(args.out)}`); }
    if (target) {
      target.rec.scene = terrainMerge(target.rec.scene, sections);
      target.rec.scene.camera = Object.assign({}, target.rec.scene.camera, { lat: cam.lat, lon: cam.lon, heading: cam.heading, fov: cam.fov, eye: cam.eye, horizon: cam.horizon });
      if (!target.rec.scene.view || !Number.isFinite(target.rec.scene.view.lat)) target.rec.scene.view = Object.assign({}, target.rec.scene.view || {}, { lat: cam.lat, lon: cam.lon });
      const file = await saveRecipe(root, target);
      out(`${target.isNew ? 'wrote' : 'updated'} ${args.into}${file ? ` (${file})` : ''}: terrain ${res.terrain.ridges.length} ridge(s), camera.alt ${res.camera.alt}`);
    }
    return 0;
  },
};
export default cmd;

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const { values, positionals } = parseArgs({ options: Object.fromEntries(Object.entries(cmd.options).map(([k, v]) => [k, { type: v.type }])), allowPositionals: true });
  cmd.run(values, { root: ROOT, positionals, out: (s) => process.stdout.write(s + '\n'), err: (s) => process.stderr.write(s + '\n') })
    .then(code => { process.exitCode = code || 0; }, e => { process.stderr.write('scene terrain: ' + e.message + '\n'); process.exitCode = 1; });
}
