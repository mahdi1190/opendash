#!/usr/bin/env node
// Scene engine v2, backward compatibility (docs/dev/SCENE_ENGINE_V2.md section 14.1): the sha1 of
// JSON.stringify(sceneCompile(data, { season, lod })) for every composed item (and every legacy item's draft upgrade),
// in every season at LOD 1 and in summer at LOD 0.3. Generated ONCE from the base commit, before any v2 engine edit,
// into tests/fixtures/scene-compiled-v1-hashes.json; tests/scene-compat.test.mjs recomputes and compares every hash, so a
// v1 scene compiles byte for byte as it did before v2.
//
//   node tools/scene-v1-hashes.mjs            write the initial fixture
//   node tools/scene-v1-hashes.mjs --check    compare with the fixture; exit 1 on a difference (lists the refs)
//   node tools/scene-v1-hashes.mjs --refresh <refs> --reason <why> [--retire-removed <release>]
// An intentional refresh updates only named refs and archives the old hashes; an unrelated difference still fails.
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const check = process.argv.includes('--check');
  const t0 = Date.now();
  const now = await sceneV1Hashes();
  if (check) {
    if (!existsSync(HASH_FIXTURE)) { console.error('no fixture: run without --check first'); process.exit(1); }
    const was = JSON.parse(readFileSync(HASH_FIXTURE, 'utf8')).hashes;
    const bad = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter(k => now[k] !== was[k]);
    console.log(`scene v1 hashes: ${Object.keys(was).length} checked, ${bad.length} differ (${Date.now() - t0} ms)`);
    for (const k of bad.slice(0, 50)) console.log('  differs: ' + k);
    process.exit(bad.length ? 1 : 0);
  }
  const arg = (name) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : null; };
  let fixture = { note: 'sha1 of JSON.stringify(sceneCompile(data, {season, lod})) per composed item, from the base commit before the v2 engine (SCENE_ENGINE_V2.md 14.1). Intentional updates retain their previous hashes in history.', cases: HASH_CASES, hashes: now };
  if (existsSync(HASH_FIXTURE)) {
    const refs = new Set((arg('--refresh') || '').split(',').filter(Boolean)), reason = arg('--reason'), retiredIn = arg('--retire-removed');
    if (!refs.size || !reason || reason.length < 20) { console.error('An existing baseline requires --refresh <comma-separated refs> and --reason <documented intended change>; --retire-removed <release> archives intentionally removed items.'); process.exit(1); }
    const was = JSON.parse(readFileSync(HASH_FIXTURE, 'utf8'));
    const removed = Object.keys(was.hashes).filter(k => !(k in now));
    const changed = Object.keys(now).filter(k => now[k] !== was.hashes[k]);
    const unexpected = changed.filter(k => !refs.has(k.split('|')[0]));
    if (unexpected.length || (removed.length && !retiredIn)) { console.error(JSON.stringify({ unexpected, removed: removed.length, message: 'Every changed/new ref must be explicitly named; retirements need --retire-removed.' })); process.exit(1); }
    const before = Object.fromEntries([...removed, ...changed.filter(k => k in was.hashes)].map(k => [k, was.hashes[k]]));
    fixture = { ...was, cases: HASH_CASES, hashes: now, history: [...(was.history || []), { reason, ...(retiredIn ? { retiredIn } : {}), updatedRefs: [...new Set(changed.map(k => k.split('|')[0]))], added: changed.filter(k => !(k in was.hashes)), before }] };
  }
  mkdirSync(dirname(HASH_FIXTURE), { recursive: true });
  writeFileSync(HASH_FIXTURE, JSON.stringify(fixture, null, 0) + '\n');
  console.log(`scene v1 hashes: ${Object.keys(now).length} written to ${HASH_FIXTURE} (${Date.now() - t0} ms)`);
}
