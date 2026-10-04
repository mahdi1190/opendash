// The Finances view (src/finance/*.js + *.css parts, src/app/65-finance-view.js)
// sits on the design system: icons from the sprite, colours from tokens,
// currency and locale from config, no emoji, nothing personal, and the bank
// sync is gated on the bank connection while CSV import never is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { financeSources } from '../build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
// The view as build.mjs puts it in the page: the parts in name order.
const { js: JS, css: CSS } = financeSources(ROOT);
const SECTION = read('src/app/65-finance-view.js');
const noComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

test('every icon the Finances view names is in the sprite', () => {
  const sprite = new Set([...read('vendor/icons/lucide-sprite.svg').matchAll(/id="i-([a-z0-9-]+)"/g)].map(m => m[1]));
  const used = new Set();
  for (const m of JS.matchAll(/\bic\(\s*'([a-z0-9-]+)'/g)) used.add(m[1]);
  for (const m of JS.matchAll(/\bic\([^)]*\?\s*'([a-z0-9-]+)'\s*:\s*(?:[^)]*?\?\s*'([a-z0-9-]+)'\s*:\s*)?'([a-z0-9-]+)'/g)) [m[1], m[2], m[3]].filter(Boolean).forEach(n => used.add(n));
  for (const m of JS.matchAll(/\bicon:\s*'([a-z0-9-]+)'/g)) used.add(m[1]);
  for (const m of JS.matchAll(/\[\s*'([a-z0-9-]+)'\s*,\s*'(?:Export|Import|Explore)'/g)) used.add(m[1]);
  for (const m of SECTION.matchAll(/icon:\s*'([a-z0-9-]+)'/g)) used.add(m[1]);
  assert.ok(used.size >= 20, `found ${used.size}`);
  assert.deepEqual([...used].filter(n => !sprite.has(n)), []);
});

test('no emoji or glyph icons, no hard-coded currency or locale, nothing personal', () => {
  const code = noComments(JS);
  assert.doesNotMatch(code, /[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B06\u2B07\u21B6\u2913]/u, 'emoji or glyph icon in finance.js');
  assert.doesNotMatch(code, /£/, 'currency symbol hard-coded (use APP_CONFIG.currency)');
  assert.doesNotMatch(code, /'en-GB'\s*,\s*\{|toLocaleDateString\('en-GB'/, 'locale hard-coded (use APP_CONFIG.locale)');
  assert.match(code, /APP_CONFIG/);
  for (const s of ['Barclays', 'spend.py', 'C:/Users', 'C:\\\\Users']) assert.ok(!JS.includes(s), s);
  assert.doesNotMatch(SECTION, /[\u{1F300}-\u{1FAFF}]/u);
});

test('styles use the design tokens (no private palette)', () => {
  const css = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const hex = [...css.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map(m => m[0].toLowerCase()).filter(h => h !== '#fff');
  assert.deepEqual(hex, [], 'raw colours in finance.css');
  assert.doesNotMatch(css, /font-family:(?!\s*var\(--font)/, 'fonts come from --font-sans');
  for (const t of ['--accent', '--surface', '--border', '--fg-muted', '--radius-lg', '--space-4', '--text-sm', '--shadow-xs']) assert.ok(css.includes(`var(${t})`), t);
  // The charts read the same tokens.
  for (const t of ['--fg', '--fg-muted', '--border', '--surface', '--accent', '--border-subtle', '--success-ink', '--danger-ink']) assert.ok(JS.includes(`'${t}'`), `chart token ${t}`);
});

test('chart palettes: 7 categorical slots per theme, accent first, no red', () => {
  const pal = /const PALETTE = \{\s*light: \[([^\]]+)\],\s*dark: \[([^\]]+)\]/.exec(JS);
  assert.ok(pal);
  const tokens = read('src/styles/00-tokens.css');
  for (const [i, list] of [[1, pal[1]], [2, pal[2]]]) {
    const cols = [...list.matchAll(/'(#[0-9a-f]{6})'/gi)].map(m => m[1].toLowerCase());
    assert.equal(cols.length, 7);
    assert.equal(new Set(cols).size, 7);
    for (const red of ['#e5484d', '#ff6369']) assert.ok(!cols.includes(red), 'red is reserved for over budget');
    if (i === 1) assert.match(tokens, new RegExp(`--accent:\\s*${cols[0]}`, 'i'), 'slot 0 is the light accent');
  }
});

test('bank sync is gated on the bank connection; CSV import never is', () => {
  const sync = /H\.sync = h\('button', \{([^}]*)\}/.exec(JS);
  assert.ok(sync && /'data-requires': 'bank'/.test(sync[1]), 'Sync bank needs the bank');
  const imp = /H\.imp = h\('button', \{([^}]*)\}/.exec(JS);
  assert.ok(imp && !/data-requires/.test(imp[1]), 'Import CSV is always available');
  assert.match(JS, /fv-req-bank[\s\S]*setAttribute\('data-requires', 'bank'\)/, 'bank menu items gated');
  assert.ok(!/class: 'fv-split'/.test(JS), 'the old .fv-split auto-gate would also lock the menu caret');
});

test('the section registers through the shell and cleans up', () => {
  assert.match(SECTION, /registerSection\('finance',\s*\{/);
  assert.match(SECTION, /layout: 'wide'/);
  assert.match(SECTION, /unmount\(\)/);
  assert.match(JS, /function teardown\(\)[\s\S]*R\.head\.el\.remove\(\)/, 'header actions removed on leave');
  assert.doesNotMatch(SECTION, /\bon[a-z]+\s*=\s*["']/i, 'no inline handlers');
});
