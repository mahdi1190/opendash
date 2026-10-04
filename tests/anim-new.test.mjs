// "New in 2.2: animations" card planner (src/app/78-anim-new.js, animNewPlan). Pure.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(ROOT, 'src', 'app', '78-anim-new.js'), 'utf8');
// eslint-disable-next-line no-new-func
const { animNewPlan } = new Function(`${code}\nreturn { animNewPlan };`)();

test('shown once, never during the first-run set-up', () => {
  assert.equal(animNewPlan({}).show, true);
  assert.equal(animNewPlan({ seen: true }).show, false);
  assert.equal(animNewPlan({ firstRun: true }).show, false);
});

test('offers the fix for whatever silences animations', () => {
  const p = animNewPlan({ osReduced: true, level: 'off', scenesOn: false, inUK: true, ukOn: false });
  assert.deepEqual(p.actions, ['anyway', 'level', 'scenes', 'uk', 'play', 'settings']);
  assert.equal(p.reasons.length, 3);
  const q = animNewPlan({ osReduced: true, osOverride: true, level: 'standard', scenesOn: true, inUK: true, ukOn: true });
  assert.deepEqual(q.actions, ['play', 'settings']);
  assert.equal(q.reasons.length, 0);
  assert.ok(!animNewPlan({ inUK: false }).actions.includes('uk'));
});
