#!/usr/bin/env node
// Scene engine v2, backward compatibility (docs/dev/SCENE_ENGINE_V2.md section 14.1): the sha1 of
// JSON.stringify(sceneCompile(data, { season, lod })) for every composed item (and every legacy item's draft upgrade),
// in every season at LOD 1 and in summer at LOD 0.3. Generated ONCE from the base commit, before any v2 engine edit,
// into tests/fixtures/scene-compiled-v1-hashes.json; tests/scene-compat.test.mjs recomputes and compares every hash, so a
// v1 scene compiles byte for byte as it did before v2.
//
//   node tools/scene-v1-hashes.mjs            write the fixture
//   node tools/scene-v1-hashes.mjs --check    compare with the fixture; exit 1 on a difference (lists the refs)
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HASH_FIXTURE = join(ROOT, 'tests', 'fixtures', 'scene-compiled-v1-hashes.json');
/** The compile options hashed per item: every season at LOD 1, and summer at the tile LOD. */
export const HASH_CASES = [['spring', 1], ['summer', 1], ['autumn', 1], ['winter', 1], ['summer', 0.3]];

/** { '<ref>|<season>|<lod>': sha1 } for every composed item and draft upgrade of the registry at `root`. */
export async function sceneV1Hashes(root = ROOT, { only = null } = {}) {
  const { loadRegistry } = await import(pathToFileURL(join(root, 'tools', 'lib', 'anim-render.mjs')).href);
  const reg = loadRegistry(root, { fresh: true });
  const G = reg.R.get, compile = G('sceneCompile'), dataOf = G('sceneData');
  const out = {};
  for (const e of reg.items()) {
    const it = e.item;
    let mk = null;
    if (it.composed) mk = () => dataOf(it);
    else if (it.upgrade && typeof it.upgrade.scene === 'function') mk = () => it.upgrade.scene();
    if (!mk || (only && !only.has(e.ref))) continue;
    for (const [season, lod] of HASH_CASES) {
      let s;
      try { s = JSON.stringify(compile(mk(), { season, lod })); } catch (err) { s = 'THROWS ' + String(err && err.message); }
      out[`${e.ref}|${season}|${lod}`] = createHash('sha1').update(s).digest('hex');
    }
  }
  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  const t0 = Date.now();
  const now = await sceneV1Hashes();
  if (check) {
    if (!existsSync(HASH_FIXTURE)) { console.error('no fixture: run without --check first'); process.exit(1); }
    const was = JSON.parse(readFileSync(HASH_FIXTURE, 'utf8')).hashes;
    const bad = Object.keys(was).filter(k => now[k] !== was[k]);
    console.log(`scene v1 hashes: ${Object.keys(was).length} checked, ${bad.length} differ (${Date.now() - t0} ms)`);
    for (const k of bad.slice(0, 50)) console.log('  differs: ' + k);
    process.exit(bad.length ? 1 : 0);
  }
  mkdirSync(dirname(HASH_FIXTURE), { recursive: true });
  writeFileSync(HASH_FIXTURE, JSON.stringify({ note: 'sha1 of JSON.stringify(sceneCompile(data, {season, lod})) per composed item, from the base commit before the v2 engine (SCENE_ENGINE_V2.md 14.1). Regenerate only for an intended v1 change.', cases: HASH_CASES, hashes: now }, null, 0) + '\n');
  console.log(`scene v1 hashes: ${Object.keys(now).length} written to ${HASH_FIXTURE} (${Date.now() - t0} ms)`);
}
