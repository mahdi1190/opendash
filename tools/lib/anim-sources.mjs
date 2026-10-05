// The animation source files in load order, shared by the tests and the animation tools.
// The browser build concatenates src/app/*.js in NAME order into one script scope (build.mjs), so the
// order matters only for top-level const/let: a file may call another file's functions (hoisted) at any
// time, but may only touch its consts after that file has loaded.
//
// Region files (the US and Asia packs, and every region made with tools/anim-pack.mjs):
//   71-anim-0region.js            the region framework (sorts first among them: it owns the registries)
//   71-anim-region-<id>.js        a region's config (tables and wrappers)
//   71-anim-region-<id>-scenes-N.js   a region's full-screen scenes
//   (legacy names, kept so refs and history stay: 71-anim-us*.js, 71-anim-asia*.js)
import { readdirSync } from 'node:fs';

export const REGION_FILE_RE = /^71-anim-(0region|region-|us2?[-.]|asia2?[-.])/;
/** Region-related source files (framework, region configs, scenes), sorted as the build sorts them. */
export function regionSourceFiles(app) {
  return readdirSync(app).filter(f => REGION_FILE_RE.test(f) && f.endsWith('.js')).sort();
}
/** Every animation pack file (72-anim-pack-*.js), sorted. */
export function packSourceFiles(app) {
  return readdirSync(app).filter(f => /^72-anim-pack-[a-z0-9-]+\.js$/.test(f)).sort();
}
/** The files a pure registry load needs, in build order: almanac, libraries, registry, delight, UK table, Texas scenes, regions, packs. */
export function animRegistryFiles(app) {
  return ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-delight-library.js', '71-uk-counties.js', '71-anim-texas-scenes.js', ...regionSourceFiles(app), ...packSourceFiles(app)];
}
