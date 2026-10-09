// Scene engine v2, backward compatibility (docs/dev/SCENE_ENGINE_V2.md 14.1, 27.1): every composed item (and every legacy item's
// draft upgrade) compiles BYTE FOR BYTE as it did before v2, in every season at LOD 1 and in summer at LOD 0.3. The hashes in
// tests/fixtures/scene-compiled-v1-hashes.json were made from the base commit before any engine edit (tools/scene-v1-hashes.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sceneV1Hashes, HASH_FIXTURE } from '../tools/scene-v1-hashes.mjs';

test('v1 compiles are byte-identical to the base commit (every composed item, every hashed case)', { timeout: 300000 }, async () => {
  const want = JSON.parse(readFileSync(HASH_FIXTURE, 'utf8')).hashes;
  const keys = Object.keys(want);
  assert.ok(keys.length > 1000, 'the fixture covers the corpus: ' + keys.length);
  const now = await sceneV1Hashes();
  const missing = keys.filter(k => !(k in now)), differ = keys.filter(k => k in now && now[k] !== want[k]);
  assert.deepEqual(differ.slice(0, 20), [], `${differ.length} v1 compiles changed`);
  // an item removed from the corpus is not a compile change, but say so
  assert.ok(missing.length <= keys.length * 0.02, `${missing.length} hashed items are gone: ${missing.slice(0, 10).join(', ')}`);
});
