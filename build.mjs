// build.mjs - builds the single self-contained index.html from src/.
//
//   <head>  <link rel="icon"> assets/brand/favicon.ico + favicon.svg (data: URLs)
//           <style> @font-face (vendor/fonts, as data: URIs), src/styles/*.css
//                  (sorted by name), then the extra CSS files </style>
//           <script id="dashboard-config" type="application/json">{}</script>
//                (serve.mjs swaps the {} for the public part of data/config.json)
//   <body>  vendor/icons/lucide-sprite.svg (hidden <symbol>s for icon())
//           src/body.html
//           <script type="application/octet-stream" data-scene-raster="<key>"> raster object images (assets/objects,
//                base64; never run, decoded lazily when a scene draws them: tools/lib/raster-assets.mjs)
//           <script> vendor libraries </script>           one block each
//           <script> src/app/*.js (sorted by name) </script>  ONE block, the app
//           <script> src/motion.js </script>
//           <script> src/finance/*.js (sorted by name) in ONE IIFE </script>
//
// The Finances view is split into ordered parts (src/finance/NN-*.js and
// NN-*.css). The JS parts share one closure, exactly like the old single
// src/finance.js: build wraps their concatenation in FINANCE_IIFE. The CSS
// parts are concatenated in name order after motion.css. See MODULES.md.
//
// Each extra JS file gets its own <script> block so a syntax error in one cannot
// take the others down, and "</script" inside a vendored library cannot end the
// block. Everything is inlined: no network fetches at runtime.
//
// The app modules in src/app/ share ONE classic-script scope, exactly like the
// old single script.js: top-level const/let/function in one file is visible to
// every later file. Order is the file-name order. See MODULES.md.
//
// Usage:
//   node build.mjs              build index.html
//   node build.mjs --check      build, exit 1 if index.html changed (CI-style)
//   node build.mjs --syntax     syntax-check every JS block (node --check), no write
//   node build.mjs --out <f>    write somewhere else (tests)
//   node build.mjs --root <dir> build from another checkout (tests)

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { rasterAssetBlocks } from './tools/lib/raster-assets.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// The page asks for its config through this exact tag; server/http.mjs
// (CONFIG_TAG) must match it byte for byte. tests/build.test.mjs checks that.
export const CONFIG_TAG = '<script id="dashboard-config" type="application/json">{}</script>';

// Optional extras, appended in this order when present. A folder (trailing
// '/') stands for its parts: its .css or .js files in name order, the JS
// wrapped in that folder's FOLDER_WRAP so they share one scope.
const EXTRA_CSS = ['src/motion.css', 'src/finance/'];
const EXTRA_JS_BEFORE = ['vendor/echarts.min.js'];        // libraries, before the app
const EXTRA_JS_AFTER = ['src/motion.js', 'src/finance/'];
export const FINANCE_IIFE = ["(function () {\n  'use strict';\n  if (window.FinanceView) return;\n", '})();\n'];
const FOLDER_WRAP = { 'src/finance/': FINANCE_IIFE };

// Design assets (vendor/, licences alongside), inlined so index.html stays one
// offline file: the Inter variable font becomes a data: URI @font-face put in
// front of all CSS, the Lucide <symbol> sprite goes straight after <body>.
export const FONT_FILES = [
  { family: 'Inter', file: 'vendor/fonts/InterVariable-latin.woff2', weight: '100 900', style: 'normal' },
];
export const ICON_SPRITE = 'vendor/icons/lucide-sprite.svg';
// The OpenDash favicon (assets/brand/): the SVG, plus the .ico for browsers
// without SVG icons, both as data: URLs. The page reuses the SVG one for the
// logo in the sidebar and the welcome (setBrandMark in src/app/14-shell.js).
export const FAVICON_FILES = [
  { file: 'assets/brand/favicon.ico', type: 'image/x-icon', attrs: 'sizes="32x32"' },
  { file: 'assets/brand/favicon.svg', type: 'image/svg+xml', attrs: 'type="image/svg+xml"' },
];

/** @font-face rules for the vendored fonts ('' when a file is missing). */
export function fontFaceCss(root = HERE) {
  return FONT_FILES.filter(f => existsSync(join(root, f.file))).map(f => {
    const b64 = readFileSync(join(root, f.file)).toString('base64');
    return `@font-face{font-family:"${f.family}";font-style:${f.style};font-weight:${f.weight};font-display:swap;`
      + `src:url(data:font/woff2;base64,${b64}) format("woff2")}\n`;
  }).join('');
}
/** The icon sprite markup ('' when missing). */
export function iconSprite(root = HERE) {
  const p = join(root, ICON_SPRITE);
  return existsSync(p) ? readFileSync(p, 'utf8').trim() + '\n' : '';
}
/** <link rel="icon"> tags for the favicons (an empty icon when none is there). */
export function faviconLinks(root = HERE) {
  const links = FAVICON_FILES.filter(f => existsSync(join(root, f.file))).map(f =>
    `<link rel="icon" ${f.attrs} href="data:${f.type};base64,${readFileSync(join(root, f.file)).toString('base64')}">`);
  return links.length ? links.join('\n') : '<link rel="icon" href="data:,">';
}

/** Concatenate every file with `ext` in `dir`, sorted by name, byte for byte. */
export function concatDir(dir, ext) {
  if (!existsSync(dir)) throw new Error(`missing source folder: ${dir}`);
  const files = readdirSync(dir).filter(f => f.endsWith(ext)).sort();
  if (!files.length) throw new Error(`no ${ext} files in ${dir}`);
  return { files, text: files.map(f => readFileSync(join(dir, f), 'utf8')).join('') };
}

/** One extra as text: a file, or a folder's parts (JS wrapped); null when missing. */
export function readExtra(root, rel, ext) {
  const p = join(root, rel);
  if (!existsSync(p)) return null;
  if (!rel.endsWith('/')) return readFileSync(p, 'utf8');
  const { text } = concatDir(p, ext);
  const wrap = ext === '.js' ? (FOLDER_WRAP[rel] || ['', '']) : ['', ''];
  return wrap[0] + text + wrap[1];
}
/** The Finances view as built: { js (one IIFE), css, jsParts, cssParts }. */
export function financeSources(root = HERE) {
  const dir = join(root, 'src', 'finance');
  return {
    js: readExtra(root, 'src/finance/', '.js'), css: readExtra(root, 'src/finance/', '.css'),
    jsParts: concatDir(dir, '.js').files, cssParts: concatDir(dir, '.css').files,
  };
}
const readExtras = (root, list, ext) => list.map(rel => readExtra(root, rel, ext)).filter(s => s != null);
const scriptBlock = (code) => `<script>\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>\n`;

/** Everything build needs, as strings, without writing anything. */
export function collectSources(root = HERE) {
  const app = concatDir(join(root, 'src', 'app'), '.js');
  const styles = concatDir(join(root, 'src', 'styles'), '.css');
  return {
    appFiles: app.files,
    styleFiles: styles.files,
    appJs: app.text,
    css: [fontFaceCss(root) + styles.text, ...readExtras(root, EXTRA_CSS, '.css')].join('\n'),
    sprite: iconSprite(root),
    body: readFileSync(join(root, 'src', 'body.html'), 'utf8'),
    raster: rasterAssetBlocks(root),
    beforeJs: readExtras(root, EXTRA_JS_BEFORE, '.js'),
    afterJs: readExtras(root, EXTRA_JS_AFTER, '.js'),
  };
}

export function buildHtml(root = HERE) {
  const s = collectSources(root);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenDash</title>
${faviconLinks(root)}
${CONFIG_TAG}
<style>
${s.css}
</style>
</head>
<body>
${s.sprite}${s.body}${s.raster}${s.beforeJs.map(scriptBlock).join('')}<script>
${s.appJs.replace(/<\/script/gi, '<\\/script')}
</script>
${s.afterJs.map(scriptBlock).join('')}</body>
</html>
`;
}

/** node --check on the app bundle and every extra script; returns failures. */
export function syntaxCheck(root = HERE) {
  const s = collectSources(root);
  const dir = mkdtempSync(join(tmpdir(), 'dash-syntax-'));
  const blocks = [['src/app/*.js (bundle)', s.appJs],
    ...EXTRA_JS_AFTER.map(r => [r.endsWith('/') ? r + '*.js (one IIFE)' : r, readExtra(root, r, '.js')]).filter(b => b[1] != null)];
  const failures = [];
  try {
    blocks.forEach(([name, code], i) => {
      const f = join(dir, `block-${i}.js`);
      writeFileSync(f, code);
      const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
      if (r.status !== 0) failures.push({ name, error: (r.stderr || '').replace(new RegExp(f.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&'), 'g'), name) });
    });
  } finally { rmSync(dir, { recursive: true, force: true }); }
  return failures;
}

function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const root = resolve(arg('--root') || HERE);
  if (argv.includes('--syntax')) {
    const fails = syntaxCheck(root);
    for (const f of fails) console.error(`[build --syntax] ${f.name}\n${f.error}`);
    if (fails.length) process.exit(1);
    console.log('[build --syntax] all script blocks parse');
    return;
  }
  const out = resolve(arg('--out') || join(root, 'index.html'));
  const html = buildHtml(root);
  const before = existsSync(out) ? readFileSync(out, 'utf8') : '';
  writeFileSync(out, html);
  const changed = before !== html;
  console.log(`[build] wrote ${out} (${html.length} bytes, ${changed ? 'changed' : 'unchanged'})`);
  if (argv.includes('--check') && changed) {
    console.error('[build --check] index.html changed; rebuild before shipping');
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main(process.argv.slice(2));
