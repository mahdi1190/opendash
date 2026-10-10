// The acceptance suite (docs/dev/WORLD_ENGINE_REQUIREMENTS.md section 16; docs/dev/WORLD_ENGINE.md 16.3, 16.5): the proof that the
// engine works first time. Every adversarial scene loads (worldAdd never refuses it), builds, simulates 120 s with ZERO invariant
// violations and carries a load log that explains every fix; the test scenes are at least as rich as their originals and run the
// V7 matrix with zero violations. These tests judge the WHOLE engine: a failure names the package that owns the fix
// (tools/lib/world/adversarial.mjs OWNERS). The browser parts (renders, perf gates F1, F2, Z1) run only with WORLD_BROWSER=1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadEngine, resolveRef, WORLD_TEST_REFS, WORLD_ALIASES } from '../tools/lib/world/convert.mjs';
import { adversarialFixtures, adversarialRun, adversarialText, worldInvariantRun, worldMatrixCells, OWNERS } from '../tools/lib/world/adversarial.mjs';
import { criticOfRef } from '../tools/lib/world/critic.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = loadEngine({ root: ROOT });
const BROWSER = process.env.WORLD_BROWSER === '1';
const SECONDS = Number(process.env.WORLD_ADV_SECONDS) || 120;
const fixtures = adversarialFixtures(ROOT);
const why = (r) => `\n${adversarialText([r])}\n(owners: ${r.owners.join('; ') || 'none'})`;

test('there are 14 adversarial fixtures (16.3)', () => {
  assert.equal(fixtures.length, 14);
});

for (const fx of fixtures) {
  test(`adversarial: ${fx.title} (${fx.req.join(', ')}): loads, builds, a log entry per fix, ${SECONDS} s with zero violations`, () => {
    const r = adversarialRun(E, fx, { seconds: SECONDS, hz: 5 });
    assert.notEqual(r.registered, false, 'worldAdd registered it (bad input makes a scene plainer, never refused)' + why(r));
    assert.ok(r.built, 'worldBuild did not throw (G8)' + why(r));
    assert.ok(!r.run.error, 'the life sim and the runner did not throw: ' + r.run.error + why(r));
    assert.deepEqual(r.missing.map(m => `${m.any.join('|')} ${m.id || m.match || ''} (found ${m.found})`), [], 'the load log explains every fix (U2, 12.5)' + why(r));
    assert.deepEqual(Object.entries(r.run.counts).map(([k, n]) => `${k} x${n} [${OWNERS[k] || '?'}]: ${r.run.first[k].msg}`), [], 'zero invariant violations' + why(r));
  });
}

test('the test scenes are at least as rich as their originals (16.4, P7: the critic)', () => {
  const bad = [];
  for (const r of WORLD_TEST_REFS) {
    const v3 = criticOfRef(E, 'world-test/' + r + '-w3', {}, resolveRef), src = criticOfRef(E, WORLD_ALIASES[r], {}, resolveRef);
    if (v3.score + 0.5 < src.score) bad.push(`${r}-w3: ${v3.score} < the original's ${src.score} [kb (fill), the scene's converter]`);
  }
  assert.deepEqual(bad, []);
});

test('V7: every test scene at every cell of the matrix (4 seasons x 5 times x 3 weathers) with zero invariant violations', () => {
  const seconds = Number(process.env.WORLD_MATRIX_SECONDS) || 2, bad = [];
  for (const r of WORLD_TEST_REFS) {
    const spec = E.worldHostSpec(resolveRef(E, 'world-test/' + r + '-w3').item);
    for (const c of worldMatrixCells(spec)) {
      const run = worldInvariantRun(E, spec, { ms: c.ms, wx: c.wx, seconds, hz: 1 });
      if (run.uniq || run.error) bad.push(`${r} ${c.season} ${c.moment} ${c.wx}: ${run.error || Object.entries(run.counts).map(([k, n]) => `${k} x${n} [${OWNERS[k] || '?'}]`).join(', ')}`);
    }
  }
  assert.deepEqual(bad.slice(0, 40), [], `${bad.length} matrix cell(s) with violations`);
});

test('browser: every adversarial scene renders plain-but-sensible (no page error, a picture) (WORLD_BROWSER=1)', { skip: !BROWSER && 'set WORLD_BROWSER=1' }, async () => {
  const { launchChrome } = await import('../tools/release-chrome.mjs');
  const { worldPageOpen, WORLD_SIZES } = await import('../tools/lib/world/sheet.mjs');
  const chrome = await launchChrome();
  const bad = [];
  try {
    for (const fx of fixtures) {
      try {
        const page = await worldPageOpen(chrome, { spec: fx.spec, id: 'adv-' + fx.id }, { size: WORLD_SIZES.tile, root: ROOT, at: '2026-07-15T12:00:00Z' });
        const png = await page.png(), errs = await page.errors();
        if (errs.length) bad.push(`${fx.id}: ${errs.join('; ')}`);
        if (!(png.length > 1500)) bad.push(`${fx.id}: an empty picture`);
      } catch (e) { bad.push(`${fx.id}: ${e.message}`); }
    }
  } finally { await chrome.close(); }
  assert.deepEqual(bad, []);
});

test('browser: the performance gates F1, F2, Z1 at both sizes and both extremes, GPU on, throttle 4 (WORLD_BROWSER=1)', { skip: !BROWSER && 'set WORLD_BROWSER=1' }, async () => {
  const { launchChrome } = await import('../tools/release-chrome.mjs');
  const { worldPerfMatrix } = await import('../tools/lib/world/perf.mjs');
  const chrome = await launchChrome({ extraArgs: ['--enable-gpu', '--ignore-gpu-blocklist'] });
  const bad = [];
  try {
    for (const r of WORLD_TEST_REFS) {
      const spec = E.worldHostSpec(resolveRef(E, 'world-test/' + r + '-w3').item);
      for (const m of await worldPerfMatrix(chrome, spec, { id: r, seconds: 3 })) {
        // each value is a median (or the first bake) judged at 1.2x its budget, so a loaded machine does not fail it
        if (!m.check.ok) bad.push(`${r} ${m.size} ${m.extreme}: ${m.check.error || m.check.lines.filter(l => l.status === 'fail').map(l => `${l.item} ${l.value}${l.unit} > 1.2 x ${l.budget}`).join(', ')}`);
      }
    }
  } finally { await chrome.close(); }
  assert.deepEqual(bad, []);
});
