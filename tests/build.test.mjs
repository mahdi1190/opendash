// build.mjs and the module layout: the app bundle is the src/app files in name
// order, every script block parses, the config tag matches the server's, and
// the page/server UI-key lists agree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { concatDir, buildHtml, syntaxCheck, CONFIG_TAG as BUILD_TAG } from '../build.mjs';
import { CONFIG_TAG as SERVER_TAG } from '../server/http.mjs';
import { UI_STATE_KEYS, BOOKKEEPING_KEYS, RETIRED_STATE_KEYS } from '../lib/state-keys.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('app modules are named NN-area.js and concatenate in name order', () => {
  const files = readdirSync(join(ROOT, 'src', 'app')).filter(f => f.endsWith('.js'));
  for (const f of files) assert.match(f, /^\d{2}-[a-z0-9-]+\.js$/, f);
  const { files: order, text } = concatDir(join(ROOT, 'src', 'app'), '.js');
  assert.deepEqual(order, [...files].sort());
  assert.equal(text, order.map(f => readFileSync(join(ROOT, 'src', 'app', f), 'utf8')).join(''));
  for (const f of order) assert.ok(readFileSync(join(ROOT, 'src', 'app', f), 'utf8').endsWith('\n'), `${f} ends with a newline`);
  assert.equal(order[0], '00-core-config.js');
  assert.equal(order[order.length - 1], '99-boot.js');
});

test('styles are named NN-area.css', () => {
  for (const f of readdirSync(join(ROOT, 'src', 'styles'))) assert.match(f, /^\d{2}-[a-z0-9-]+\.css$/, f);
});

test('every script block parses', () => {
  assert.deepEqual(syntaxCheck(ROOT), []);
});

test('the built page has one config tag in <head>, one app block, motion and finance after it', () => {
  const html = buildHtml(ROOT);
  const head = html.slice(0, html.indexOf('</head>'));
  assert.equal(head.split(BUILD_TAG).length - 1, 1);
  const app = html.indexOf('function render()');
  assert.ok(app > 0);
  assert.ok(html.indexOf('window.Motion = {') > app, 'motion block after the app');
  assert.ok(html.indexOf('window.FinanceView = {') > app, 'finance block after the app');
  assert.ok(!/src=["']https?:/i.test(html), 'no network resources');
});

test('build and server agree on the config tag', () => {
  assert.equal(BUILD_TAG, SERVER_TAG);
});

test('the page and the server agree on which state keys are UI-only', () => {
  const src = readFileSync(join(ROOT, 'src', 'app', '01-core-state.js'), 'utf8');
  const grab = (name) => {
    const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`).exec(src);
    return m[1].match(/'[^']+'/g).map(s => s.slice(1, -1));
  };
  assert.deepEqual(grab('UI_STATE_KEYS'), [...UI_STATE_KEYS]);
  assert.deepEqual(grab('BOOKKEEPING_KEYS'), [...BOOKKEEPING_KEYS]);
  assert.deepEqual(grab('RETIRED_STATE_KEYS'), [...RETIRED_STATE_KEYS]);
});

test('no inline event-handler strings are built in app code', () => {
  for (const f of readdirSync(join(ROOT, 'src', 'app'))) {
    const t = readFileSync(join(ROOT, 'src', 'app', f), 'utf8');
    assert.ok(!/onerror=["'\\]/.test(t), `${f} builds an inline onerror`);
  }
});
