// lib/sync/manifest.mjs classifies every top-level state key as synced,
// device-local or derived; only the synced ones are ever read for sync.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MANIFEST, classOf, syncedKeys, isPreference } from '../lib/sync/manifest.mjs';
import { SYNC_KEYS } from '../lib/sync/model.mjs';
import { UI_STATE_KEYS, SHARED_UI_KEYS, BOOKKEEPING_KEYS } from '../lib/state-keys.mjs';
import { buildFakeData } from '../tools/make-fake-data.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('every key the page sets up is classified (src/app/05-core-state-init.js)', () => {
  const src = readFileSync(join(ROOT, 'src', 'app', '05-core-state-init.js'), 'utf8');
  const body = src.slice(src.indexOf('function ensureStateDefaults'), src.indexOf('let state = ensureStateDefaults'));
  const keys = [...new Set([...body.matchAll(/\bs\.([A-Za-z_]+)\s*=/g)].map(m => m[1]))];
  assert.ok(keys.length >= 40, `found ${keys.length} keys`);
  for (const k of keys) assert.ok(MANIFEST[k], `${k} is not in lib/sync/manifest.mjs`);
});

test('UI keys sync exactly when they are preferences; bookkeeping is device-local; keys the actions layer touches are classified', () => {
  for (const k of SHARED_UI_KEYS) assert.ok(UI_STATE_KEYS.includes(k), `${k} is a UI key`);
  for (const k of UI_STATE_KEYS) {
    if (SHARED_UI_KEYS.includes(k)) { assert.equal(classOf(k), 'synced', k); assert.ok(isPreference(k), `${k} is a preference`); }
    else assert.notEqual(classOf(k), 'synced', k);   // device-local, or a cache (derived)
  }
  for (const k of BOOKKEEPING_KEYS) assert.equal(classOf(k), 'device-local', k);
  const touched = new Set();
  for (const f of readdirSync(join(ROOT, 'server', 'actions'))) {
    for (const m of readFileSync(join(ROOT, 'server', 'actions', f), 'utf8').matchAll(/touch\('key:([A-Za-z]+)'\)/g)) touched.add(m[1]);
  }
  for (const k of touched) assert.ok(MANIFEST[k], `actions touch ${k}`);
  for (const k of Object.keys(buildFakeData({ tasks: 3 }).state)) assert.ok(MANIFEST[k], `demo data key ${k}`);
});

test('the synced keys are exactly the keys the sync model knows how to merge', () => {
  assert.deepEqual([...syncedKeys()].sort(), [...SYNC_KEYS].sort());
  assert.equal(classOf('someFutureKey'), 'device-local', 'an unknown key is never synced');
  for (const k of ['emailTriage', 'autolink', 'calCache', 'peopleEmailCache', 'suggest', 'taskChat']) assert.equal(classOf(k), 'derived', k);
  for (const [k, [cls, why]] of Object.entries(MANIFEST)) assert.ok(['synced', 'device-local', 'derived'].includes(cls) && why, k);
});

test('preferences follow the person; only one screen or moment stays on the computer', () => {
  // The product rule (docs/dev/SYNC_FORMAT.md section 9): every preference syncs...
  for (const k of ['theme', 'autoTheme', 'density', 'calPrefs', 'taskViewPrefs', 'peopleView', 'sortBy', 'groupBy', 'homeUI', 'sidebarLists',
    'openItemsIn', 'itemHero', 'animPrefs', 'achievements', 'viewFilter', 'collapsedSidebar']) {
    assert.equal(classOf(k), 'synced', k);
    assert.ok(isPreference(k), `${k}: a clash is not reported`);
  }
  // ...and what belongs to one screen or moment stays.
  for (const k of ['view', 'viewMode', 'selectedTaskId', 'calMonth', 'weekBarOffset', '_snappedFor', 'personEditMode', 'focus',
    'paneSizes', 'sidebarCollapsed', 'lastReviewPrompt', '_lastBackup', 'env', 'travel', 'suggestStats', '_lastSave', '_saveCount', '_localDirty']) {
    assert.equal(classOf(k), 'device-local', k);
    assert.ok(!isPreference(k), k);
  }
  // Data is synced but not a "preference": its clashes are still reported.
  for (const k of ['custom', 'people', 'home', 'calendarSettings']) assert.ok(classOf(k) === 'synced' && !isPreference(k), k);
});
