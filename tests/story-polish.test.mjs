// Story polish (evening + weekly): short names keep "1:1" / "10:30" whole, and slip
// reasons read as proper English in the weekly narration.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shortTitle } from '../lib/story-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const model = new Function(`${readFileSync(join(ROOT, 'src', 'app', '79-story-weekly-model.js'), 'utf8')}\nreturn { stwShortTitle, stwBecause };`)();

test('a colon between digits is part of a short name', () => {
  assert.equal(shortTitle('Weekly 1:1 with Priya'), 'Weekly 1:1 with Priya');
  assert.equal(shortTitle('Standup at 10:30: notes and actions'), 'Standup at 10:30');
  assert.equal(shortTitle('Launch plan: budget, risks; sign-off'), 'Launch plan');
  assert.equal(model.stwShortTitle('Weekly 1:1 with Priya'), 'Weekly 1:1 with Priya');
  assert.equal(model.stwShortTitle('Paper review: round two'), 'Paper review');
});

test('slip reasons read as a clause', () => {
  assert.equal(model.stwBecause('Too big'), 'because they were too big');
  assert.equal(model.stwBecause('No time'), 'because there was no time');
  assert.equal(model.stwBecause('Blocked.'), 'because they were blocked');
  assert.equal(model.stwBecause('Not important'), 'because they mattered less');
  assert.equal(model.stwBecause('Waiting for data'), 'because of waiting for data');
  assert.equal(model.stwBecause(''), '');
});
