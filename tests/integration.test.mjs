// Cross-area contracts found while integrating the 2.0 builders. Each test
// guards a seam between two areas that their own suites do not see.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { financeSources } from '../build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const appFiles = readdirSync(APP).filter(f => f.endsWith('.js')).sort();
const src = (f) => readFileSync(join(APP, f), 'utf8');

test('src/app shares one script scope: no top-level name is declared twice', () => {
  const seen = new Map();
  const dupes = [];
  for (const f of appFiles) {
    src(f).split('\n').forEach((l, i) => {
      const m = /^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(|^(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/.exec(l);
      if (!m) return;
      const name = m[1] || m[2];
      if (seen.has(name)) dupes.push(`${name}: ${seen.get(name)} and ${f}:${i + 1}`);
      else seen.set(name, `${f}:${i + 1}`);
    });
  }
  // A second `function x` silently replaces the first one for every caller.
  assert.deepEqual(dupes, []);
});

test('palette commands and More-menu items: an id registered in two files is a known, deliberate override', () => {
  const KNOWN = new Set(['registerMoreItem:bulk-add']);   // 23-quick-add-dialog replaces the shell's bulk import with its multi-line dialog
  const where = new Map();
  for (const f of appFiles) {
    for (const m of src(f).matchAll(/(registerCommand|registerMoreItem|registerTopbarWidget|registerTile)\(\{\s*id:\s*'([^']+)'/g)) {
      const k = `${m[1]}:${m[2]}`;
      if (!where.has(k)) where.set(k, new Set());
      where.get(k).add(f);
    }
  }
  const clashes = [...where].filter(([k, fs]) => fs.size > 1 && !KNOWN.has(k)).map(([k, fs]) => `${k} in ${[...fs].join(', ')}`);
  assert.deepEqual(clashes, []);
});

test('unlinking a person anywhere is remembered (people rule), so a tag cannot re-link them', () => {
  // The tasks picker and the detail chips used to drop the id from task.people
  // only: a person linked through a tag (blocked-sam) could not be unlinked.
  const picker = src('32-tasks-ui.js');
  assert.match(picker, /removePersonFromTask\(id, r\.p\.id\)/);
  assert.match(picker, /addPersonToTask\(id, r\.p\.id\)/);
  assert.match(picker, /effPeople\(item\)/, 'the picker ticks everyone linked, also through a tag');
  assert.doesNotMatch(src('60-task-detail.js'), /setOverride\(id, 'people', explicit\.filter/);
});

test("assistant Apply/Undo in this tab does not also raise the live-sync toast", () => {
  const asst = src('72-assistant.js'), live = src('86-live-sync.js');
  assert.match(asst, /let _asstOwnWrites = 0;/);
  assert.match(asst, /client: 'dashboard assistant'/);
  assert.match(live, /d\.client === 'dashboard assistant' && typeof _asstOwnWrites === 'number' && _asstOwnWrites > 0/);
});

test('migration 045 run after 030/040/050 does not date tasks by the migration run', async () => {
  const { activityLogger } = await import('../tools/migrations/_plans.mjs');
  const { upgradeTasks } = await import('../tools/migrations/045-tasks-fields.mjs');
  const st = { custom: [{ id: 'seed-x', title: 'x' }, { id: 'seed-y', title: 'y' }], taskActivity: { 'seed-y': [{ type: 'date', ts: 1000 }] } };
  // What 040-tags does to a re-tagged task: a dated history entry stamped with its id.
  const log = activityLogger(st, '040-tags');
  log('seed-x', { type: 'tags', text: 'Re-tagged' });
  log('seed-y', { type: 'tags', text: 'Re-tagged' });
  const r = upgradeTasks(st);
  assert.equal(st.custom[0].createdAt, undefined, 'only a migration touched it: no trace of when it was made');
  assert.equal(st.custom[1].createdAt, 1000, 'its own (older) history still counts');
  assert.equal(r.createdMissing, 1);
});

test('finance view: the range row wraps at phone widths instead of overflowing', () => {
  const css = financeSources(ROOT).css;   // src/finance/*.css in name order
  assert.match(css, /\.fv-filters \{ display: grid; grid-template-columns: minmax\(0, 1fr\);/);
  // The phone rule sits ABOVE the base `.fv-bar-r { flex-wrap: nowrap }`, so it needs the
  // extra `.fv-bar` in its selector to win (with plain `.fv-bar-r` Reset was cut off at 390 px).
  const m = css.match(/@container main \(max-width: 560px\) \{[\s\S]*?\n\}/);
  assert.ok(m, 'phone container rule exists');
  assert.match(m[0], /\.fv-bar \.fv-bar-l, \.fv-bar \.fv-bar-r \{ flex-wrap: wrap; \}/);
  assert.match(m[0], /\.fv-bar \.fv-bar-r \{ margin-left: 0; \}/);
});
