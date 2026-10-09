// Scene engine v2, backward compatibility (docs/dev/SCENE_ENGINE_V2.md 14.1, 27.1): every composed item (and every legacy item's
// draft upgrade) compiles BYTE FOR BYTE as it did before v2, in every season at LOD 1 and in summer at LOD 0.3. The hashes in
// tests/fixtures/scene-compiled-v1-hashes.json were made from the base commit before any engine edit (tools/scene-v1-hashes.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sceneV1Hashes, HASH_FIXTURE, HASH_CASES } from '../tools/scene-v1-hashes.mjs';

test('v1 compiles are byte-identical to the base commit (every composed item, every hashed case)', { timeout: 300000 }, async () => {
  const want = JSON.parse(readFileSync(HASH_FIXTURE, 'utf8')).hashes;
  const keys = Object.keys(want);
  // v2.11 retired 346 previously hashed UK/demo refs. Coverage remains exhaustive for the active registry.
  assert.ok(keys.length >= 100 * HASH_CASES.length, 'the active fixture covers at least 100 composed/draft scenes: ' + keys.length);
  const now = await sceneV1Hashes();
  assert.deepEqual(Object.keys(now).sort(), [...keys].sort(), 'every active composed/draft scene and every case must have a baseline; an intentional addition or retirement needs an explicit fixture refresh');
  const differ = keys.filter(k => now[k] !== want[k]);
  assert.deepEqual(differ.slice(0, 20), [], `${differ.length} v1 compiles changed`);
});
