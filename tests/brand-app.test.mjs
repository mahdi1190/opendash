// OpenDash branding in the app itself: the built page's title and inlined
// favicons, the sidebar / welcome logo mark, the package and licence identity,
// the start-opendash.* launchers with their start-dashboard.* shims, and the
// third-party credits. The compatibility ids that stay "dashboard" are checked
// by tests/release-community.test.mjs (the keep-list) and the feature tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { buildHtml, faviconLinks, FAVICON_FILES } from '../build.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

test('the built page is titled OpenDash and carries the favicons as data: URLs', () => {
  const html = buildHtml(ROOT);
  const head = html.slice(0, html.indexOf('</head>'));
  assert.match(head, /<title>OpenDash<\/title>/);
  assert.doesNotMatch(head, /<title>Dashboard/);
  assert.deepEqual(FAVICON_FILES.map(f => f.file), ['assets/brand/favicon.ico', 'assets/brand/favicon.svg']);
  for (const f of FAVICON_FILES) {
    const b64 = readFileSync(join(ROOT, f.file)).toString('base64');
    assert.ok(head.includes(`<link rel="icon" ${f.attrs} href="data:${f.type};base64,${b64}">`), f.file);
  }
  // The SVG comes last, so browsers that can use it prefer it over the .ico.
  assert.ok(head.indexOf('image/svg+xml;base64') > head.indexOf('image/x-icon;base64'));
  assert.ok(!head.includes('href="data:,"'), 'no empty placeholder icon');
});

test('without the brand files the build still works, with an empty icon', () => {
  const dir = mkdtempSync(join(tmpdir(), 'brand-app-'));
  try { assert.equal(faviconLinks(dir), '<link rel="icon" href="data:,">'); } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the user-facing name is OpenDash: window title, sidebar, welcome, About', () => {
  assert.match(read('src/app/00-core-config.js'), /function appTitle\(\) \{ return userName\(\) \? `\$\{userName\(\)\}'s OpenDash` : 'OpenDash'; \}/);
  assert.match(read('src/body.html'), /<span class="sb-ws-name" id="brand-name">OpenDash<\/span>/);
  assert.match(read('src/app/99-boot.js'), /userName\(\) \|\| 'OpenDash'/);
  const ob = read('src/app/59-onboarding.js');
  assert.match(ob, /'Welcome to OpenDash'/);
  assert.match(ob, /setBrandMark\(mark, d\.userName\)/);
  const settings = read('src/app/57-settings.js');
  assert.match(settings, /<span class="set-ver">OpenDash<\/span> · MIT licence/);
  assert.match(settings, /'OpenDash ' \+ j\.version/);
  assert.match(settings, /href="https:\/\/github\.com\/mahdi1190\/opendash"/);
  assert.match(read('src/sw.js'), /<title>OpenDash - server not running<\/title>/);
});

/** The non-comment lines of a page source file, as [line number, text]. Whole-line
 *  `//` comments and block comments that start a line are left out. */
function codeLines(src) {
  const out = []; let inBlock = false;
  src.split(/\r?\n/).forEach((line, i) => {
    let s = line;
    if (inBlock) { const end = s.indexOf('*/'); if (end < 0) return; s = s.slice(end + 2); inBlock = false; }
    const t = s.trim();
    if (!t || t.startsWith('//')) return;
    if (t.startsWith('/*')) { if (!t.includes('*/')) inBlock = true; if (inBlock || t.endsWith('*/')) return; }
    out.push([i + 1, s]);
  });
  return out;
}

test('page messages name the OpenDash server and launcher, never the old "dashboard" ones', () => {
  // R1, R3 and R4 of docs/dev/BRANDING_PLAN.md, in every page file (Finances, Home
  // and the stories included). Storage keys and other ids are not matched here.
  const OLD = [/\bdashboard server\b/i, /\bstart-dashboard\b/, /\bDashboard shortcut\b/i, /\brestart the dashboard\b/i, /\bThis dashboard has\b/, /['"`]Dashboard['"`]/];
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = dir + '/' + e.name;
      if (e.isDirectory()) walk(rel); else if (/\.(js|html)$/.test(e.name)) files.push(rel);
    }
  };
  walk('src');
  assert.ok(files.includes('src/finance/10-shell.js') && files.includes('src/app/79-story-engine.js'), 'the walk found the page sources');
  const hits = [];
  for (const f of files) {
    for (const [n, s] of codeLines(read(f))) if (OLD.some(re => re.test(s))) hits.push(`${f}:${n}`);
  }
  assert.deepEqual(hits, []);
  // The comment filter does not hide real strings.
  assert.deepEqual(codeLines("/* a\n the dashboard server */\nx('The dashboard server');\n// the dashboard server").map(l => l[0]), [3]);
});

/** brandLogoSrc + setBrandMark from 14-shell.js, run against a tiny fake DOM. */
function brandMarkApi(iconHref) {
  const src = read('src/app/14-shell.js');
  const start = src.indexOf('/** The OpenDash logo as an image URL');
  const end = src.indexOf('/** Repaint the chrome.');
  assert.ok(start > 0 && end > start, 'the helpers are where this test expects them');
  const el = () => {
    const e = { dataset: {}, children: [], textContent: '', className: '', classes: new Set() };
    e.classList = { toggle: (c, on) => { if (on) e.classes.add(c); else e.classes.delete(c); } };
    e.replaceChildren = (...kids) => { e.children = kids; e.textContent = ''; };
    e.removeAttribute = name => { delete e[name]; };
    return e;
  };
  const document = {
    querySelector: (sel) => (sel === 'link[rel="icon"][type="image/svg+xml"]' && iconHref ? { getAttribute: () => iconHref } : null),
    createElement: () => el(),
  };
  const box = { document };
  vm.createContext(box);
  vm.runInContext(src.slice(start, end) + '\nthis.setBrandMark = setBrandMark;', box);
  return { setBrandMark: box.setBrandMark, el };
}

test('the brand mark is the OpenDash logo with no name set, the initial with one', () => {
  const { setBrandMark, el } = brandMarkApi('data:image/svg+xml;base64,AAAA');
  const m = el();
  setBrandMark(m, '');
  assert.equal(m.children.length, 1);
  assert.equal(m.children[0].className, 'brand-logo');
  assert.equal(m.children[0].src, 'data:image/svg+xml;base64,AAAA');
  assert.equal(m.children[0].alt, '');
  assert.ok(m.classes.has('has-logo'));
  const img = m.children[0];
  setBrandMark(m, '  ');
  assert.equal(m.children[0], img, 'nothing is rebuilt when nothing changed');
  setBrandMark(m, 'alex');
  assert.equal(m.textContent, 'A');
  assert.ok(!m.classes.has('has-logo'));
  setBrandMark(m, '');
  assert.equal(m.children[0].className, 'brand-logo', 'back to the logo when the name is cleared');
  // A build without the favicon: a plain letter, never an empty tile.
  const bare = brandMarkApi('');
  const b = bare.el();
  bare.setBrandMark(b, '');
  assert.equal(b.textContent, 'O');
  bare.setBrandMark(b, null);
  bare.setBrandMark(null, 'Sam');   // no element: nothing happens
});

test('package.json names the OpenDash project, and its test script needs no shell glob', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.name, 'opendash');
  assert.match(pkg.description, /^OpenDash/);
  assert.equal(pkg.repository, 'github:mahdi1190/opendash');
  assert.equal(pkg.license, 'MIT');
  // The author is the LICENSE holder (the name itself is not repeated in tests).
  const holder = /^Copyright \(c\) 2026 (.+)$/m.exec(read('LICENSE'));
  assert.ok(holder, 'LICENSE has a copyright line');
  assert.equal(pkg.author, holder[1]);
  assert.equal(pkg.private, true, 'blocks an accidental npm publish');
  assert.deepEqual(pkg.dependencies, undefined);
  assert.deepEqual(pkg.devDependencies, undefined);
  // Node 20 does not expand globs and Node 22+ does not take a folder: plain
  // `node --test` finds tests/*.test.mjs on both, on every OS.
  assert.equal(pkg.scripts.test, 'node --test');
});

test('LICENSE is MIT with the full holder name (first and last name)', () => {
  const lic = read('LICENSE').replace(/\r\n/g, '\n');
  assert.match(lic, /^MIT License\n\nCopyright \(c\) 2026 [A-Z][a-z]+ [A-Z][a-z]+\n\nPermission is hereby granted, free of charge/);
});

test('start-opendash.* are the launchers; start-dashboard.* only call them', () => {
  const bat = read('start-opendash.bat'), sh = read('start-opendash.sh');
  assert.match(bat, /^title OpenDash$/m);
  assert.match(bat, /Starting OpenDash\.\.\./);
  assert.doesNotMatch(bat, /[Tt]he dashboard/);
  assert.match(sh, /^#!\/bin\/sh\n/);
  assert.match(sh, /Starting OpenDash\.\.\./);
  assert.doesNotMatch(sh, /[Tt]he dashboard/);
  const shimBat = read('start-dashboard.bat'), shimSh = read('start-dashboard.sh');
  assert.match(shimBat, /call "%~dp0start-opendash\.bat" %\*\r?\nexit \/b %ERRORLEVEL%/);
  assert.doesNotMatch(shimBat, /node /, 'the shim does nothing itself');
  assert.match(shimSh, /^#!\/bin\/sh\n/);
  assert.match(shimSh, /exec sh "\$here\/start-opendash\.sh" "\$@"/);
  assert.doesNotMatch(shimSh, /node /);
});

test('the hidden start-up script prefers the new launcher and falls back to the old one', () => {
  assert.match(read('tools/start-hidden.mjs'), /BATS = Object\.freeze\(\['start-opendash\.bat', 'start-dashboard\.bat'\]\)/);
});

test('third-party credits: ECharts (Apache-2.0), Inter (OFL-1.1), Lucide (ISC), with their licence files', () => {
  const n = read('THIRD_PARTY_NOTICES.md');
  for (const [name, spdx, file, marker] of [
    ['Apache ECharts', 'Apache-2.0', 'vendor/echarts.LICENSE', /Apache License\s+Version 2\.0/],
    ['Inter', 'OFL-1.1', 'vendor/fonts/Inter-OFL.txt', /SIL OPEN FONT LICENSE Version 1\.1/],
    ['Lucide', 'ISC', 'vendor/icons/Lucide-LICENSE.txt', /ISC License/],
  ]) {
    assert.ok(n.includes(name) && n.includes(`\`${spdx}\``) && n.includes(`\`${file}\``), name);
    assert.ok(existsSync(join(ROOT, file)), file);
    assert.match(read(file), marker, file);
  }
  assert.ok(existsSync(join(ROOT, 'vendor/echarts.NOTICE')));
});

test('.gitignore keeps the data protections and leaves the built page out', () => {
  const lines = read('.gitignore').split(/\r?\n/);
  for (const must of ['/data/', 'data/', 'state/', 'secrets/', '.env', 'dashboard-backup-*.json', 'opendash-backup-*.json', 'opendash-data-*.zip', '/index.html']) {
    assert.ok(lines.includes(must), must);
  }
});
