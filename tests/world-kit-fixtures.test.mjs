// The no-example path (docs/dev/WORLD_ENGINE.md 12.3 'Style kits'; requirements N1-N4): one short, plain spec per setting of N1
// (tests/fixtures/world/kits/<kit>.json: a camera, two to four surfaces, a building or two, the life the author would name). Each
// validates clean, is filled from its kit alone, passes the whole critic (the strict measure included) in summer and winter, and
// runs a minute of life with zero invariant violations. A new place should look finished from a spec this short.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadWorld } from '../tools/lib/world/load.mjs';
import { worldCritic } from '../tools/lib/world/critic.mjs';
import { runCells } from '../tools/lib/world/cells.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'tests', 'fixtures', 'world', 'kits');
const W = loadWorld(ROOT);
const SETTINGS = ['canal', 'pond', 'heath', 'woodland', 'village-green', 'river-city', 'civic-square', 'quayside', 'terraced-street', 'old-town-lane', 'park', 'moor', 'coast', 'waterfront-city', 'dale'];
const files = readdirSync(DIR).filter(f => f.endsWith('.json')).sort();
const specOf = (f) => JSON.parse(readFileSync(join(DIR, f), 'utf8'));
const SECONDS = Number(process.env.WORLD_KIT_SECONDS) || 60;
const CELLS = Number(process.env.WORLD_CELLS) || 2;

test('one fixture per setting of N1: a short plain spec that names its kit and validates clean', () => {
  assert.deepEqual(files.map(f => f.replace(/\.json$/, '')), SETTINGS.slice().sort());
  for (const f of files) {
    const s = specOf(f), key = f.replace(/\.json$/, '');
    assert.equal(s.v, 3, f);
    assert.equal(s.place && s.place.style, key, f + ' names its kit in place.style');
    assert.ok(W.worldKit(key), f + ': a kit');
    assert.ok((s.surfaces || []).length <= 6 && (s.entities || []).length <= 4 && (s.buildings || []).length <= 2, f + ' is short: the kit does the dressing');
    const v = W.worldValidate(JSON.parse(JSON.stringify(s)));
    assert.deepEqual((v.errors || []).map(e => `${e.rule} ${e.path}: ${e.msg}`), [], f + ' validates clean');
  }
});

for (const f of files) {
  const key = f.replace(/\.json$/, '');
  test(`${key}: filled from its kit, the critic passes (strict included) in summer and winter`, () => {
    for (const season of ['summer', 'winter']) {
      const c = worldCritic(W, specOf(f), { season });
      assert.ok(c.strict, 'the strict measure ran');
      assert.equal(c.strict.kit, key, `${key} ${season}: the fill used the ${key} kit`);
      assert.deepEqual(c.problems, [], `${key} ${season}: no critic problem`);
    }
  });
}

test(`every fixture runs ${SECONDS} s of life with zero invariant violations`, async () => {
  const res = await runCells(files.map(f => ({ op: 'inv', spec: specOf(f), seconds: SECONDS, hz: 2 })), { root: ROOT, concurrency: CELLS });
  const bad = [];
  res.forEach((r, i) => {
    if (!r || r.error) { bad.push(`${files[i]}: ${r ? r.error : 'no result'}`); return; }
    for (const [k, n] of Object.entries(r.counts || {})) bad.push(`${files[i]}: ${k} x${n}: ${r.first[k].msg}`);
  });
  assert.deepEqual(bad, []);
});
