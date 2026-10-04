// Design system + app shell (A2): vendored assets are inlined, every icon the
// app names exists in the sprite, tokens and legacy aliases are defined for
// both themes, the shell files carry no emoji and no personal data, and the
// shell's registries / palette helpers behave (loaded into a VM with a stub DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { buildHtml, FONT_FILES, ICON_SPRITE } from '../build.mjs';
import { ICONS, spriteIds } from '../tools/build-icon-sprite.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const APP = join(ROOT, 'src', 'app');
const STY = join(ROOT, 'src', 'styles');
const read = (p) => readFileSync(p, 'utf8');

// Files the shell/design role owns (or created as section placeholders).
// Home is split into a core and one file per widget (12-home*.js, 13-home*.css): all of them.
const HOME_JS = readdirSync(APP).filter(n => /^12-home.*\.js$/.test(n));
const HOME_CSS = readdirSync(STY).filter(n => /^13-home.*\.css$/.test(n));
const SHELL_JS = ['11-ui-kit.js', ...HOME_JS, '14-shell.js', '15-nav-sidebar.js', '16-command-palette.js',
  '26-tags-section.js', '41-calendar-section.js', '51-people-section.js', '56-connections.js', '57-settings.js', '90-wiring.js'];
const SHELL_CSS = ['00-tokens.css', '01-components.css', '02-base.css', '05-layout.css', '10-sidebar.css', '12-command-palette.css',
  ...HOME_CSS, '20-main-tasks.css', '56-connections.css', '57-settings.css'];

test('vendored font and icon sprite exist with their licences', () => {
  for (const f of FONT_FILES) assert.ok(existsSync(join(ROOT, f.file)), f.file);
  assert.ok(existsSync(join(ROOT, 'vendor', 'fonts', 'Inter-OFL.txt')), 'Inter licence');
  assert.ok(existsSync(join(ROOT, ICON_SPRITE)), 'sprite');
  assert.ok(existsSync(join(ROOT, 'vendor', 'icons', 'Lucide-LICENSE.txt')), 'Lucide licence');
  assert.match(read(join(ROOT, 'vendor', 'fonts', 'Inter-OFL.txt')), /SIL Open Font License/);
  assert.match(read(join(ROOT, 'vendor', 'icons', 'Lucide-LICENSE.txt')), /ISC License/);
});

test('the build inlines the font as a data URI and the sprite right after <body>', () => {
  const html = buildHtml(ROOT);
  const style = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  assert.match(style, /@font-face\{font-family:"Inter";[^}]*src:url\(data:font\/woff2;base64,[A-Za-z0-9+/=]{1000,}\) format\("woff2"\)\}/);
  assert.ok(style.indexOf('@font-face') < style.indexOf(':root'), 'font face comes before the tokens');
  const BODY_OPEN = '</head>\n<body>';   // (a CSS comment elsewhere mentions "<body>")
  const body = html.slice(html.indexOf(BODY_OPEN) + BODY_OPEN.length).trimStart();
  assert.ok(body.startsWith('<svg xmlns="http://www.w3.org/2000/svg" id="icon-sprite"'), 'sprite first in body');
  assert.ok(!/url\(["']?https?:/i.test(html), 'no remote url() in CSS');
  assert.equal((html.match(/id="icon-sprite"/g) || []).length, 1);
});

test('the sprite holds every icon in the generator list', () => {
  const have = spriteIds();
  const missing = ICONS.filter(n => !have.has(n));
  assert.deepEqual(missing, []);
});

/** Every icon name the app code or markup refers to. */
function iconNamesUsed() {
  const names = new Set();
  const notIcons = /^(i-|subtle$|chk$|sep$)/;
  for (const f of readdirSync(APP).filter(n => n.endsWith('.js'))) {
    const src = read(join(APP, f));
    for (const m of src.matchAll(/\bicon(?:El)?\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)) {
      // literals in the arguments, except comparison operands (x === 'task' ? ...)
      for (const s of m[1].matchAll(/(===|!==)?\s*'([a-z][a-z0-9-]*)'/g)) if (!s[1] && !notIcons.test(s[2])) names.add(s[2]);
    }
    for (const m of src.matchAll(/\bicon:\s*'([a-z][a-z0-9-]*)'/g)) names.add(m[1]);
  }
  // The palette's [view, label, icon] table and the settings segment options
  for (const f of ['16-command-palette.js', '57-settings.js']) {
    for (const m of read(join(APP, f)).matchAll(/\[\s*'[a-z-]+'\s*,\s*'[^']+'\s*,\s*'([a-z][a-z0-9-]*)'\s*\]/g)) names.add(m[1]);
  }
  const shell = read(join(APP, '14-shell.js')) + read(join(APP, '15-nav-sidebar.js'));
  for (const block of shell.matchAll(/const _(?:GROUP_ICON|FIN_SECTION_ICONS) = \{([^}]*)\}/g)) for (const m of block[1].matchAll(/:\s*'([a-z][a-z0-9-]*)'/g)) names.add(m[1]);
  for (const m of read(join(ROOT, 'src', 'body.html')).matchAll(/href="#i-([a-z0-9-]+)"/g)) names.add(m[1]);
  return names;
}
test('every icon the app names exists in the sprite', () => {
  const have = spriteIds();
  const used = iconNamesUsed();
  assert.ok(used.size > 60, `found ${used.size} icon names`);
  const missing = [...used].filter(n => !have.has(n));
  assert.deepEqual(missing, [], 'add them to tools/build-icon-sprite.mjs and rebuild the sprite');
});

test('tokens: both themes define the palette, and the legacy names map onto it', () => {
  const css = read(join(STY, '00-tokens.css'));
  const light = css.slice(css.indexOf(':root {'), css.indexOf('[data-theme="dark"] {'));
  const dark = css.slice(css.indexOf('[data-theme="dark"] {'));
  const themed = ['--bg', '--bg-subtle', '--bg-muted', '--bg-emphasis', '--surface', '--surface-raised', '--overlay', '--fg', '--fg-muted',
    '--fg-subtle', '--fg-disabled', '--border-subtle', '--border', '--border-strong', '--accent', '--accent-hover', '--accent-soft',
    '--accent-soft-2', '--accent-ink', '--focus-ring', '--success', '--warning', '--danger', '--info', '--p0', '--p1', '--p2', '--p3',
    '--sw-indigo', '--sw-slate', '--shadow-xs', '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-drag'];
  for (const t of themed) {
    assert.match(light, new RegExp(`${t}:`), `light ${t}`);
    assert.match(dark, new RegExp(`${t}:`), `dark ${t}`);
  }
  for (const t of ['--font-sans', '--text-sm', '--lh-sm', '--space-4', '--radius-md', '--topbar-h', '--sidebar-w', '--detail-w', '--z-modal', '--z-palette', '--z-toast']) {
    assert.match(light, new RegExp(`${t}:`), t);
  }
  // Older feature CSS and the Finances charts read these names.
  const base = read(join(STY, '02-base.css'));
  for (const [legacy, token] of [['--card', '--surface'], ['--text', '--fg'], ['--text-muted', '--fg-muted'], ['--text-dim', '--fg-subtle'],
    ['--hover', '--bg-muted'], ['--selected', '--accent-soft'], ['--done', '--success'], ['--doing', '--warning']]) {
    assert.match(base, new RegExp(`${legacy}: var\\(${token}\\);`), legacy);
  }
  // Nothing else redefines the core tokens later in the cascade (motion.css owns --m-*).
  for (const f of readdirSync(STY).filter(n => n.endsWith('.css') && n !== '00-tokens.css')) {
    assert.ok(!/^\s*--(bg|fg|accent|surface):/m.test(read(join(STY, f))), `${f} redefines a core token`);
  }
});

test('shell files: no emoji, no inline handlers, no personal names or stream ids', () => {
  // The words are kept as (truncated) SHA-256 hashes, so this file, which
  // ships in every copy of the app, does not name them itself. The public
  // repository's address (github.com/<owner>/opendash, About) is meant to be there.
  const PERSONAL_SHA = new Set(['2e0af263c88c69ec', '2863229379aa76de', '6996738f81e01bef', '8551b6c38a90509c', 'd2dae6d1b4625413', 'e5c7c23397fbfcdd', '71f566aba763fb76']);
  const personal = { test: (src) => (String(src).toLowerCase().replace(/github\.com\/[a-z0-9-]+\/opendash\b/g, '').match(/[a-z]{4,}/g) || []).some(w => PERSONAL_SHA.has(createHash('sha256').update(w).digest('hex').slice(0, 16))) };
  for (const f of SHELL_JS) {
    const src = read(join(APP, f));
    assert.ok(!/\p{Extended_Pictographic}/u.test(src.replace(/\\u[0-9a-f]{4}/gi, '')), `${f} has an emoji`);
    assert.ok(!/\son[a-z]+=["'\\]/.test(src), `${f} builds an inline handler`);
    assert.ok(!personal.test(src), `${f} mentions personal data`);
  }
  for (const f of SHELL_CSS) assert.ok(!personal.test(read(join(STY, f))), `${f} mentions personal data`);
  const body = read(join(ROOT, 'src', 'body.html'));
  assert.ok(!/\p{Extended_Pictographic}/u.test(body), 'body.html has an emoji');
  assert.ok(!/\son[a-z]+=/i.test(body), 'body.html has an inline handler');
  assert.ok(!personal.test(body), 'body.html mentions personal data');
});

test('the old top-bar ids the modules still look up are present', () => {
  const body = read(join(ROOT, 'src', 'body.html'));
  for (const id of ['sidebar', 'main', 'main-body', 'content', 'detail-pane', 'view-title', 'view-subtitle', 'search-input',
    'theme-toggle', 'folder-btn', 'countdowns', 'brand-name', 'sidebar-toggle', 'import-file', 'save-toast', 'toast-host',
    'ctx-menu', 'modal-overlay', 'modal-card', 'date-picker', 'debug-banner', 'debug-title', 'debug-body', 'debug-copy',
    'bulk-bar', 'kb-overlay', 'kb-card', 'section-switcher', 'crumb', 'tb-widgets', 'more-btn', 'palette-btn', 'display-btn', 'new-task-btn']) {
    assert.ok(body.includes(`id="${id}"`), `#${id}`);
  }
});

/* ---------- behaviour, in a VM with a stub DOM ---------- */
function loadShell() {
  const listeners = [];
  const el = () => ({ style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, setAttribute() {}, appendChild() {}, querySelector: () => null, querySelectorAll: () => [] });
  const box = {
    console, setTimeout, clearTimeout,
    document: { addEventListener: (...a) => listeners.push(a), getElementById: () => null, createElement: el, querySelector: () => null, querySelectorAll: () => [] },
    window: { addEventListener() {}, matchMedia: () => ({ matches: false }) },
    location: { hash: '' }, history: { replaceState() {} },
  };
  box.globalThis = box;
  vm.createContext(box);
  const files = ['00-core-config.js', '00-core-constants.js', '11-ui-kit.js', '12-home.js', '14-shell.js', '15-nav-sidebar.js',
    '16-command-palette.js', '26-tags-section.js', '41-calendar-section.js', '51-people-section.js', '56-connections.js', '57-settings.js'];
  for (const f of files) vm.runInContext(read(join(APP, f)), box, { filename: f });
  vm.runInContext('var HAS_COWORK = false; var state = { view: "home", people: [{ id: "p1", name: "Sam" }], custom: [] }; applyStreams(state);', box);
  return box;
}

test('section groups: every view lights the right tile', () => {
  const box = loadShell();
  const g = (v) => vm.runInContext(`shellGroupFor(${JSON.stringify(v)})`, box);
  assert.equal(g('home'), 'home');
  for (const v of ['today', 'week', 'all', 'no-date', 'completed', 'wins', 'triage', 'stream:work', 'tag:x', 'day:2026-01-01', 'person:p1', 'people', 'tags']) assert.equal(g(v), 'tasks', v);
  assert.equal(g('calendar'), 'calendar');
  assert.equal(g('finance'), 'finance');
  for (const v of ['settings', 'connections', 'bin']) assert.equal(g(v), 'system', v);
  const tiles = vm.runInContext('SHELL_TILES.map(t => t.id).join(",")', box);
  assert.equal(tiles, 'home,tasks,calendar,finance');
});

test('a tile whose feature is switched off in config disappears', () => {
  const box = loadShell();
  const on = vm.runInContext(`SHELL_TILES.filter(_tileEnabled).map(t => t.id).join(',')`, box);
  assert.equal(on, 'home,tasks,calendar,finance');
  const off = vm.runInContext(`APP_CONFIG.features.finance = false; APP_CONFIG.features.calendar = false; SHELL_TILES.filter(_tileEnabled).map(t => t.id).join(',')`, box);
  assert.equal(off, 'home,tasks');
});

test('hash routing accepts the new sections and rejects unknown ones', () => {
  const box = loadShell();
  const h = (s) => vm.runInContext(`_viewFromHash(${JSON.stringify(s)})`, box);
  for (const v of ['home', 'today', 'calendar', 'finance', 'people', 'tags', 'settings', 'connections', 'bin', 'person:p1']) assert.equal(h('#view=' + v), v);
  assert.equal(h('#view=person:nobody'), null);
  assert.equal(h('#view=board:b1'), null, 'boards were retired: an old board link opens Home');
  assert.equal(h('#view=%3Cscript%3E'), null);
  assert.equal(h('#view=nope'), null);
});

test('registries: same id replaces, order sorts, menu bands get separators', () => {
  const box = loadShell();
  const r = vm.runInContext(`(() => {
    registerSidebarBlock('calendar', { id: 'x-test', order: 5, render() {} });
    registerSidebarBlock(['calendar', 'home'], { id: 'x-test', order: 99, render() {} });
    const blocks = SIDEBAR_BLOCKS.filter(b => b.id === 'x-test');
    const calOrder = SIDEBAR_BLOCKS.filter(b => b.groups.includes('calendar')).map(b => b.id);
    registerTopbarWidget({ id: 'w', order: 2, render() {} }); registerTopbarWidget({ id: 'w', order: 1, render() {} });
    registerMoreItem({ id: 'hidden-one', label: 'Hidden', order: 15, hidden: () => true, run() {} });
    const more = shellMenuItems('more').map(i => i === 'sep' ? '|' : i.id);
    const ws = shellMenuItems('workspace').map(i => i === 'sep' ? '|' : i.id);
    return { n: blocks.length, groups: blocks[0].groups, last: calOrder[calOrder.length - 1], widgets: TOPBAR_WIDGETS.filter(w => w.id === 'w').length, more, ws };
  })()`, box);
  assert.equal(r.n, 1);
  assert.deepEqual([...r.groups], ['calendar', 'home']);
  assert.equal(r.last, 'x-test');
  assert.equal(r.widgets, 1);
  assert.ok(!r.more.includes('hidden-one'));
  assert.ok(!r.more.includes('briefing'), 'cowork-only item hidden outside Cowork');
  assert.ok(r.more.indexOf('|') > 0 && !r.more.join(',').includes('|,|'), 'single separators between bands');
  assert.deepEqual([...r.ws], ['backup', 'restore', 'export', 'print', '|', 'settings', 'connections', 'shortcuts']);
  assert.throws(() => vm.runInContext(`registerSidebarBlock('tasks', { id: 'bad' })`, box));
});

test('escaping: icon names, empty states and palette highlights never pass markup through', () => {
  const box = loadShell();
  const ic = vm.runInContext(`icon('x" onload="alert(1)', 'a"b')`, box);
  assert.ok(!/"\s*onload/.test(ic) && !ic.includes('a"b'), ic);
  const es = vm.runInContext(`emptyStateHtml({ icon: 'tags', title: '<img src=x onerror=alert(1)>', text: '"&<>' })`, box);
  assert.ok(!es.includes('<img') && es.includes('&lt;img') && es.includes('&quot;&amp;&lt;&gt;'));
  const hl = vm.runInContext(`_palHighlight('<b>Thing</b> plan', 'thing')`, box);
  assert.equal(hl, '&lt;b&gt;<mark>Thing</mark>&lt;/b&gt; plan');
});

test('palette scoring prefers prefix and word starts over mid-word hits', () => {
  const box = loadShell();
  const s = (t, q) => vm.runInContext(`_palScore(${JSON.stringify(t)}, ${JSON.stringify(q)})`, box);
  assert.ok(s('Upcoming', 'up') > s('Set up the build', 'up'));
  assert.ok(s('Set up the build', 'up') > s('Cup holder', 'up'));
  assert.equal(s('Calendar', 'zz'), 0);
  assert.ok(s('write the intro draft', 'intro write') > 0, 'all words present');
});
