// The upgrade pilot (docs/dev/SCENE_ENGINE.md 16 and 17): three hand-drawn region scenes upgraded to composed scenes
// (Singapore and New York on skyline-water, Japan's Fuji and pagoda on temple-mountain). Checks the data, the bar, the
// variety and the care rules (perf needs Chrome: `scene lint <ref> --upgrades --perf`), the landmarks' object lint and
// that the upgrade keeps the legacy entry's identity (its key and caption stay with the region scene).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRegistry } from '../tools/lib/anim-render.mjs';
import { engineOf, lintScene, lintObject } from '../tools/lib/scene-lint.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TH = JSON.parse(readFileSync(join(ROOT, 'tools', 'anim-quality.json'), 'utf8'));
const REG = loadRegistry(ROOT);
const E = engineOf(REG);
const g = (n) => REG.R.get(n);
const PILOT = [
  { region: 'asia', key: 'place:singapore', arch: 'skyline-water', landmarks: ['landmark.marina-bay-sands', 'landmark.singapore-flyer', 'landmark.supertrees'] },
  { region: 'us', key: 'place:new-york', arch: 'skyline-water', landmarks: ['landmark.brooklyn-bridge', 'landmark.one-wtc', 'landmark.empire-state', 'landmark.chrysler'] },
  { region: 'asia', key: 'country:JP', arch: 'temple-mountain', landmarks: ['landmark.mount-fuji', 'landmark.chureito-pagoda'] },
];
const skip = E.ready ? false : 'the scene engine is not in this checkout';

for (const p of PILOT) {
  test(`pilot upgrade ${p.region} ${p.key}: registered on ${p.arch}, its scene passes the composed data, bar, variety and care rules`, { skip }, () => {
    const up = (g('_ANIM_REGION_UPGRADES') || {})[p.region][p.key];
    assert.ok(up, 'the upgrade is registered');
    assert.ok(['draft', 'live'].includes(up.state));
    assert.equal(up.archetype, p.arch);
    assert.deepEqual([...up.landmarks].sort(), [...p.landmarks].sort());
    const data = up.scene();
    assert.equal(data.arch && data.arch.id, p.arch, 'built from its archetype');
    assert.deepEqual(g('sceneValidate')(data), []);
    const res = lintScene(data, TH, { E, ref: p.key });
    assert.deepEqual(res.failures.map(f => f.name || f), [], 'no failing rule');
    assert.equal(res.pass, true);
    // the scene places every landmark it names
    const C = g('sceneCompile')(data, { lod: 1 });
    for (const id of p.landmarks) assert.ok(C.items.some(it => it.o === id), id + ' is placed');
  });
  test(`pilot upgrade ${p.region} ${p.key}: its landmarks pass the object lint (80+ shapes, a night look)`, { skip }, () => {
    for (const id of p.landmarks) {
      const r = lintObject(id, { E, thresholds: TH });
      assert.equal(r.pass, true, id + ': ' + r.rules.filter(x => !x.ok).map(x => x.name).join(', '));
    }
  });
}

test('pilot upgrades keep the legacy identity: the region scene entry, its key and caption are untouched', { skip }, () => {
  const src = (f) => readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
  assert.match(src('71-anim-asia2-scenes-11.js'), /key: 'place:singapore', label: 'Bay skyline and supertrees at dusk', site: 'Marina Bay at dusk'/);
  assert.match(src('71-anim-us2-scenes-2.js'), /key: 'place:new-york', label: 'Brooklyn Bridge and the skyline', site: 'Manhattan from the Brooklyn Bridge'/);
  assert.match(src('71-anim-asia2-scenes-7.js'), /key: 'country:JP', label: 'Mount Fuji at dawn', site: 'Mount Fuji, a pagoda and cherry blossom'/);
});
