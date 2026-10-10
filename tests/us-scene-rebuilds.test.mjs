// Completion contract for the American opening rebuilds. The separate live-upgrade
// suite checks the exact original identity and the composed quality/care rules.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REG = loadRegistry(ROOT);
const AMERICAN = REG.items().filter(e => e.full && (/^us-/.test(e.pack) || e.pack === 'texas'));

test('American openings: every full-screen location uses the new scene engine', () => {
  // The release starts with 88 US regional openings and nine Texas openings.
  // Coverage tests pin the states/cities; these floors also catch dropped art.
  assert.ok(AMERICAN.filter(e => /^us-/.test(e.pack)).length >= 88);
  assert.ok(AMERICAN.filter(e => e.pack === 'texas').length >= 9);
  for (const e of AMERICAN) {
    assert.equal(e.composed, true, e.ref + ' uses the new technique');
    assert.equal(e.item.upgrade?.state, 'live', e.ref + ' is available in the app');
    assert.equal(typeof e.item.scene, 'function', e.ref + ' has a composed recipe');
    assert.equal(typeof e.item.legacySvg, 'function', e.ref + ' retains the original for comparison');
    assert.equal(e.item.reduced, 'static', e.ref + ' supports reduced motion');
  }
});
