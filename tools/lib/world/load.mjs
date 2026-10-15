// The world engine's Node loader (docs/dev/WORLD_ENGINE.md 6, 8.1). Node >= 20, no dependencies.
//
//   worldSourceFiles(root, { fixtures, browser })   the scene sources (tools/lib/scene-page.mjs sceneSourceFiles) + every
//                                                   src/app/79-world-*.js, in build (name) order
//   loadWorld(root, { fixtures, browser, extra })   evaluate them in one scope, as the build concatenates them -> an object with
//                                                   every top-level world* function and WORLD_* constant of the 79-world files,
//                                                   plus the scene names the world modules lean on (sceneObj, sceneProject ...)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { sceneSourceFiles, repoRoot } from '../scene-page.mjs';
import { readRasterAsset } from '../raster-assets.mjs';

export const WORLD_FILE_RE = /^79-world-[a-z0-9-]+\.js$/;
const SCENE_NAMES = ['sceneObj', 'sceneObjs', 'sceneObjDefine', 'sceneObjReal', 'sceneObjClass', 'sceneMoverSize', 'sceneObjShapes', 'scenePathBox',
  'sceneCamera', 'sceneGroundHeight', 'sceneProject', 'sceneUnproject', 'sceneAdd', 'sceneItems', 'sceneItem', 'sceneRasterSource',
  'sceneRenderPassDefine', 'sceneRenderPasses', 'sceneWaterMoverReflect', 'sceneLightV2', 'sceneSeason', 'sceneSnowCover', 'sceneFrostAt', 'almSunPosition',
  'almMoonPosition', 'almSceneLight', 'sceneWind', 'sceneShadowSun', 'sceneShadowTip', 'sceneSvg', 'sceneCompile', 'sceneData'];

export function worldSourceFiles(root = repoRoot(), { fixtures = false, browser = false } = {}) {
  const app = join(root, 'src', 'app');
  const world = readdirSync(app).filter(f => WORLD_FILE_RE.test(f)).sort().map(f => join(app, f));
  // scene-page.mjs may already list the 79-world files (the integrator's hook): keep each file once, in name order
  const base = sceneSourceFiles(root, { fixtures, browser });
  const out = [...base.filter(f => !WORLD_FILE_RE.test(f.split(/[\\/]/).pop())), ...world];
  const fx = out.filter(f => /[\\/]tests[\\/]fixtures[\\/]/.test(f)), src = out.filter(f => !fx.includes(f));
  return [...src.sort((a, b) => (a.split(/[\\/]/).pop() < b.split(/[\\/]/).pop() ? -1 : 1)), ...fx];
}

/** The world* / WORLD_* names declared at the top level of the 79-world sources (tools/lib/world/convert.mjs loadEngine uses them too). */
export function worldNames(paths) {
  const out = new Set();
  for (const p of paths) {
    if (!WORLD_FILE_RE.test(p.split(/[\\/]/).pop())) continue;
    const src = readFileSync(p, 'utf8');
    for (const m of src.matchAll(/^(?:async\s+)?function\s+(world[A-Za-z0-9_]*)\s*\(/gm)) out.add(m[1]);
    for (const m of src.matchAll(/^(?:const|let|var)\s+(WORLD_[A-Z0-9_]+|world[A-Za-z0-9_]*)\s*=/gm)) out.add(m[1]);
  }
  return [...out];
}

export function loadWorld(root = repoRoot(), { fixtures = false, browser = false, extra = '' } = {}) {
  const files = worldSourceFiles(root, { fixtures, browser });
  const names = [...new Set([...SCENE_NAMES, ...worldNames(files)])];
  const body = files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + '\n;\n' + extra;
  const tail = `\nreturn { ${names.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
  const W = new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'world-bundle.js' }).runInThisContext()();
  if (typeof W.sceneRasterSource === 'function') W.sceneRasterSource((key) => readRasterAsset(root, key));
  return W;
}
