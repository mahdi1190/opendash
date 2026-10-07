// The animation source files in BUILD order, shared by the tests and the animation tools.
// The browser build concatenates src/app/*.js in NAME order (readdirSync(...).sort(), build.mjs concatDir) into ONE
// script scope, so the order matters for top-level const/let: a file may call another file's functions (hoisted) at
// any time, but may only touch its consts after that file has loaded. animRegistryFiles() therefore returns ONE sorted
// list of the animation files, exactly as the build sorts them (not a hand-made order): a region config or scene file
// that touches a registry const at load fails the tests the way it fails the app. In that order:
//   71-anim-0region.js, 71-anim-almanac.js, 71-anim-asia*.js, 71-anim-library.js, 71-anim-region-*.js (a new region's
//   scenes then its config), 71-anim-registry.js, 71-anim-texas-scenes.js, 71-anim-uk-*.js (scene kits),
//   71-anim-us*.js, 71-delight-library.js, 71-uk-counties.js, then every 72-anim-pack-*.js. So region configs and scene files load before the registry
//   (the US, which sorts after it, is the exception: never rely on it).
//
// Region files (the US and Asia packs, and every region made with tools/anim-pack.mjs):
//   71-anim-0region.js            the region framework (sorts first among them: it owns the registries)
//   71-anim-region-<id>.js        a region's config (tables and wrappers)
//   71-anim-region-<id>-scenes-N.js   a region's full-screen scenes
//   (legacy names, kept so refs and history stay: 71-anim-us*.js, 71-anim-asia*.js)
import { readdirSync } from 'node:fs';

export const REGION_FILE_RE = /^71-anim-(0region|region-|us2?[-.]|asia2?[-.])/;
/** The fixed animation files outside the region and pack families: the almanac, the libraries, the registry, the Texas scenes, the UK table. */
export const ANIM_BASE_FILES = ['71-anim-almanac.js', '71-anim-library.js', '71-anim-registry.js', '71-anim-texas-scenes.js', '71-delight-library.js', '71-uk-counties.js'];
/** Shared scene-kit files (the object library the rich scenes draw from): 71-anim-uk-nature-kit.js and any later
 *  71-anim-uk-*.js / 71-anim-kit-*.js. They sort after the registry and before
 *  the packs that use them; at load they only define functions and consts. */
export const KIT_FILE_RE = /^71-anim-(uk|kit)-[a-z0-9-]+\.js$/;
export function kitSourceFiles(app) {
  return readdirSync(app).filter(f => KIT_FILE_RE.test(f)).sort();
}
/** Region-related source files (framework, region configs, scenes), sorted as the build sorts them. */
export function regionSourceFiles(app) {
  return readdirSync(app).filter(f => REGION_FILE_RE.test(f) && f.endsWith('.js')).sort();
}
/** Every animation pack file (72-anim-pack-*.js), sorted. */
export function packSourceFiles(app) {
  return readdirSync(app).filter(f => /^72-anim-pack-[a-z0-9-]+\.js$/.test(f)).sort();
}
/**
 * The files a pure registry load needs, in the order the build concatenates them: ONE list sorted by name (the same
 * sort build.mjs uses), made of the fixed animation files, the kit files, the region files and the pack files. `extra` adds other src/app
 * file names that must be in the load (a test that needs 71-anim-sanitize.js or 69-travel-data.js): they are sorted into place.
 */
export function animRegistryFiles(app, extra = []) {
  return [...new Set([...ANIM_BASE_FILES, ...kitSourceFiles(app), ...regionSourceFiles(app), ...packSourceFiles(app), ...extra])].sort();
}
