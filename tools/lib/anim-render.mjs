// Loading the animation registry and rendering its items, for the animation tools (tools/anim-pack.mjs).
// Node >= 20, no dependencies: the headless Chrome driver is the repo's own (tools/release-chrome.mjs).
//
//   const reg = loadRegistry(root, { extraFiles, omit })   the pure registry the build would assemble (memoised unless extraFiles / omit; omit = file names left out)
//   reg.items()                                      every item {ref, pack, id, slot, full, item, packObj}
//   reg.packs()                                      the registered packs (id, css, items ...)
//   reg.html(item, opts)                             animItemHtml (default: live, full scenes 'fill', small items 'hero')
//   reg.classesFor(packObj)                          the css classes defined by the app css and the pack css
//   reg.pageCss()                                    the css a rendered page needs (tokens, animation library, scene sizes, swatches)
//   reg.limits                                       {item, scene, rich}: the registry's byte budgets
//   reg.R                                            the evaluated registry functions (animPacks, animItemHtml ...) and the regions (ANIM_REGIONS, animRegion);
//                                                    reg.R.get(name) reads ANY top-level name of the bundle (the scene engine's sceneCompile, sceneObjs ...; undefined when absent)
//   skyFor(reg, item, { at, location, tz })          o.sky for a live-sky render: almSceneLight at the ISO time `at`, at `location` [lat, lon] or the item's own liveSky place
//   registrySources(root, extraFiles, omit)          the source files in build order, extra files placed where their name sorts
//   findBrowser()                                    Chrome / Edge / Chromium: CHROME_PATH, PATH, Playwright's folders
//   itemPage(reg, entry, {mode, at, still, sky, season}) the HTML page for one item, animations paused at `at` ms (still: animations OFF, the rest frame reduced motion shows);
//                                                    sky / season are passed to animItemHtml (o.sky: the live sky and the retrofit overlay; o.season)
//   sizesPage(reg, entry, {mode, at, still})         a strip of a small item at SIZES (28, 40, 64, 128 px): "does it read at 28 px?"
//   renderItems(reg, entries, { mode, outDir, crop, still, at, sizes, ... }) PNGs: scenes 1600 x 900 paused at `at` (default 6.5 s), small items 512 x 512 (+ a sizes strip);
//                                                    crop 'square' | 'phone' shows what a square tile (the central 900 x 900) or a portrait phone (the central 420 x 900) shows of a scene
//   contactPage(rendered, { columns, mode, sizes }) / contactSheet(rendered, { file, ... })   a grid of rendered PNGs in one PNG, on a page that matches the mode (a light render never sits on a dark page)
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { animRegistryFiles } from './anim-sources.mjs';
import { launchChrome, findChrome } from '../release-chrome.mjs';
import { cssClasses } from './anim-quality.mjs';

export const repoRoot = () => resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/* ---------------------------------------------------------------------------------------------
   The registry
   --------------------------------------------------------------------------------------------- */

/**
 * The source files a registry load needs, in build order (one list sorted by name), with `extraFiles` (paths) placed where their name sorts.
 * `omit` (file names) leaves registered files out: the baseline for "what does this file add?" when the file is already in src/app.
 */
export function registrySources(root, extraFiles = [], omit = []) {
  const app = join(root, 'src', 'app');
  if (!existsSync(app)) throw new Error(`no src/app folder under ${root}: run the tool in the repository root (or give --root <a checkout of the repo>)`);
  const files = new Map(animRegistryFiles(app).filter(f => !omit.includes(f)).map(f => [f, join(app, f)]));
  for (const p of extraFiles) {
    const abs = resolve(p), name = basename(abs);
    if (!existsSync(abs)) throw new Error(`no such file: ${p}`);
    files.set(name, abs);   // a file of the same name replaces the registered one
  }
  return [...files.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([name, path]) => ({ name, path }));
}

const NAMES = ['animPacks', 'animPack', 'animItem', 'animItems', 'animItemHtml', 'animValidatePack', 'ANIM_ITEM_MAX_BYTES', 'ANIM_FULL_ITEM_MAX_BYTES', 'ANIM_REGIONS', 'animRegion', 'almSceneLight'];

const _registries = new Map();
/**
 * Evaluate the registry the way the build concatenates it (one scope). Throws with the culprit file on a syntax error.
 * A load without extra files is memoised per root for the life of the process (the sources do not change under a running tool);
 * pass `fresh: true` to read the files again.
 */
export function loadRegistry(root = repoRoot(), { extraFiles = [], omit = [], fresh = false } = {}) {
  const plain = !extraFiles.length && !omit.length;
  if (plain && !fresh && _registries.has(root)) return _registries.get(root);
  const reg = loadRegistryUncached(root, extraFiles, omit);
  if (plain) _registries.set(root, reg);
  return reg;
}
const BUNDLE = 'anim-registry-bundle.js';
/**
 * Evaluate the animation files the way the build does: ONE function body (one scope, hoisting across files, a top-level const is shared). The bundle is compiled
 * with a file name, so a syntax error (a top-level const declared twice: a scene file without its IIFE) and a runtime throw carry a line number, which is mapped
 * back to the FILE and the line in it. Returns the names the registry exposes.
 */
function evalRegistry(list, texts) {
  // get(name): any top-level name of the bundle (the scene engine's functions and consts), read after the whole bundle has run
  const head = '(function () {\n', tail = `\nreturn { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')}, get: function (n) { if (!/^[A-Za-z_$][\\w$]*$/.test(n)) return undefined; try { return eval('typeof ' + n + " === 'undefined' ? undefined : " + n); } catch (e) { return undefined; } } };\n})`;
  const spans = []; let line = 2;   // the first file starts on line 2 of the bundle; the separator "\n;\n" adds the line of the ";"
  texts.forEach((t, i) => { const n = t.split('\n').length; spans.push({ name: list[i].name, from: line, to: line + n - 1 }); line += n + 1; });
  const where = (e) => {
    const m = new RegExp(BUNDLE.replace(/\./g, '\\.') + ':(\\d+)').exec(String((e && e.stack) || ''));
    const at = m && spans.find(sp => +m[1] >= sp.from && +m[1] <= sp.to + 1);
    return at ? { name: at.name, line: +m[1] - at.from + 1 } : null;
  };
  try {
    const fn = new vm.Script(head + texts.join('\n;\n') + tail, { filename: BUNDLE }).runInThisContext();
    return fn();
  } catch (e) {
    const at = where(e);
    if (!at) {
      for (let i = 0; i < list.length; i++) {
        try { new vm.Script(`(function () {\n${texts[i]}\n})`, { filename: list[i].name }); } catch (se) { throw new Error(`${list[i].name}: ${se.message}`); }   // compile only: names a file with a syntax error
      }
      throw e;
    }
    let extra = '';
    const dup = /Identifier '([^']+)' has already been declared/.exec(e.message);
    if (dup) {   // name the file that declared it first
      const re = new RegExp(`^(?:const|let|class|function)\\s+${dup[1].replace(/[$]/g, '\\$&')}\\b|^(?:const|let)\\s*[{\\[][^=\\n]*\\b${dup[1].replace(/[$]/g, '\\$&')}\\b`, 'm');
      const first = list.findIndex((f, i) => list[i].name !== at.name && i < list.findIndex(x => x.name === at.name) && re.test(texts[i]));
      extra = first >= 0 ? ` (first declared in ${list[first].name}; every file shares one scope: wrap a scene file in an IIFE, (function () { ... })();)` : ' (every file shares one scope: wrap a scene file in an IIFE, (function () { ... })();)';
    }
    const err = new Error(`${at.name}:${at.line}: ${e.name === 'SyntaxError' || e.name === 'ReferenceError' || e.name === 'TypeError' ? e.name + ': ' : ''}${e.message}${extra}`);
    err.file = at.name; err.line = at.line; err.cause = e;
    throw err;
  }
}

function loadRegistryUncached(root, extraFiles, omit = []) {
  const list = registrySources(root, extraFiles, omit);
  const texts = list.map(f => readFileSync(f.path, 'utf8'));
  const R = evalRegistry(list, texts);
  const styles = join(root, 'src', 'styles');
  const cssFiles = existsSync(styles) ? readdirSync(styles).filter(f => f.endsWith('.css')).sort() : [];
  let appCss = null;
  const appCssText = () => appCss || (appCss = cssFiles.map(f => readFileSync(join(styles, f), 'utf8')).join('\n'));
  let appClasses = null;
  const reg = {
    root, files: list.map(f => f.name), sources: list.map((f, i) => ({ name: f.name, path: f.path, text: texts[i] })), R,
    packs: () => R.animPacks(),
    items() {
      const out = [];
      for (const p of R.animPacks()) for (const it of p.items) out.push({ ref: it.ref, pack: p.id, id: it.id, slot: it.slot, full: !!it.full, rich: !!(it.full && it.rich), composed: !!(it.full && it.composed), item: it, packObj: p });
      return out;
    },
    html: (it, o) => R.animItemHtml(it, o || { live: true, size: it.full ? 'fill' : 'hero' }),
    classesFor(packObj) {
      appClasses = appClasses || cssClasses(appCssText());
      return new Set([...appClasses, ...cssClasses((packObj && packObj.css) || '')]);
    },
    /** The css a rendered page needs: tokens, the animation library, the registry's themes, the scene sizes. */
    pageCss() {
      const want = ['00-tokens.css', '03-motion-tokens.css', '76-scenes.css'];
      const anim = cssFiles.filter(f => /anim/.test(f));
      const text = [...new Set([...want.filter(f => cssFiles.includes(f)), ...anim])].map(f => readFileSync(join(styles, f), 'utf8')).join('\n');
      // the swatch classes (.c-indigo { --c: ... }) tint a small item: they live with the shared components
      const sw = cssFiles.includes('01-components.css') ? (readFileSync(join(styles, '01-components.css'), 'utf8').match(/^\.c-[a-z]+ \{ --c:.*$/gm) || []).join('\n') : '';
      return text + '\n' + sw;
    },
    limits: { item: R.ANIM_ITEM_MAX_BYTES || 14000, scene: R.ANIM_FULL_ITEM_MAX_BYTES || 32000, rich: R.ANIM_RICH_ITEM_MAX_BYTES || 1000000 },
  };
  return reg;
}

/**
 * o.sky for a live-sky render (the tools' --at / --location): the registry's almSceneLight at the ISO time `at` (or ms), at `location`
 * [lat, lon], else the item's own liveSky place. Returns null when there is no time or no place.
 */
export function skyFor(reg, item, { at, location = null, tz = 'UTC' } = {}) {
  if (at == null || at === '') return null;
  const ms = typeof at === 'number' ? at : Date.parse(at);
  if (!Number.isFinite(ms)) throw new Error(`--at must be an ISO time such as 2026-10-07T21:30:00Z, got "${at}"`);
  const ls = item && item.liveSky;
  const lat = location ? location[0] : ls && Number.isFinite(ls.lat) ? ls.lat : null, lon = location ? location[1] : ls && Number.isFinite(ls.lon) ? ls.lon : null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || typeof reg.R.almSceneLight !== 'function') return null;
  return reg.R.almSceneLight(ms, lat, lon, tz);
}
/** --location lat,lon -> [lat, lon] (null when not given). */
export function parseLocation(v) {
  if (v == null || v === '') return null;
  const m = String(v).split(',').map(Number);
  if (m.length !== 2 || !m.every(Number.isFinite) || Math.abs(m[0]) > 90 || Math.abs(m[1]) > 180) throw new Error(`--location must be lat,lon (for example 43.66,-70.26), got "${v}"`);
  return m;
}

/* ---------------------------------------------------------------------------------------------
   Rendering
   --------------------------------------------------------------------------------------------- */
/** Chrome, Edge or Chromium: CHROME_PATH, then PATH and the usual install folders, then Playwright's browser folders. */
export function findBrowser(env = process.env, platform = process.platform) {
  const direct = findChrome(env, platform);
  if (direct) return direct;
  const roots = [env.PLAYWRIGHT_BROWSERS_PATH, join(homedir(), '.cache', 'ms-playwright'), join(env.LOCALAPPDATA || '', 'ms-playwright'), join(homedir(), 'Library', 'Caches', 'ms-playwright'), '/opt/pw-browsers'].filter(Boolean);
  const exe = ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium', 'chrome'];
  for (const r of roots) {
    if (!existsSync(r)) continue;
    let dirs = [];
    try { dirs = readdirSync(r).filter(d => /^chromium(-\d+)?$/.test(d)).sort().reverse(); } catch { /* unreadable */ }
    for (const d of dirs) {
      const p = join(r, d);
      try { if (statSync(p).isFile()) return p; } catch { continue; }
      for (const e of exe) if (existsSync(join(p, e))) return join(p, e);
    }
  }
  return null;
}

/**
 * What a scene shows on a narrower screen: the scene is cut with preserveAspectRatio "xMidYMid slice" (it fills the screen, centred), so a screen of height 900 units and
 * width W shows the central W units of the 1600. A square tile shows 900, a portrait phone about 420 (a 9:19 phone) to 506 (a 9:16 phone): 420 is the narrowest.
 */
export const CROPS = Object.freeze({ square: 900, phone: 420 });
/** The pixel sizes of the `sheet --sizes` strip of a small item: the smallest real use (28), a list row (40), the gallery (64), the hero tile (128). */
export const SIZES = Object.freeze([28, 40, 64, 128]);
/** Where animations are paused, in ms (a scene's sun takes 9 s to rise, so a mid-motion PNG is not the rest frame: --still shows that). */
export const DEFAULT_AT = 6500;

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The page for one item: the app's theme variables and animation css, the pack's css, the animations paused at `at` ms (still: animations off, the reduced-motion rest frame). */
export function itemPage(reg, entry, { mode = 'light', at = DEFAULT_AT, still = false, sky = null, season = null } = {}) {
  const full = entry.full;
  const extra = Object.assign({}, sky ? { sky } : null, season ? { season } : null);
  let html = reg.html(entry.item, Object.assign(still ? { reduced: true, size: full ? 'fill' : 'hero' } : { live: true, size: full ? 'fill' : 'hero' }, extra));
  if (!sky && mode === 'night') html = html.replace('class="anim-scene', 'class="anim-scene tod-night');   // with a live sky the registry sets tod-* from the real sun
  else if (!sky && mode === 'dusk') html = html.replace('class="anim-scene', 'class="anim-scene tod-dusk');
  const dark = mode === 'dark' || mode === 'night';
  const tile = full ? '' : `.anim-scene:not(.ap-full){position:absolute;inset:48px;width:auto;height:auto;--as-size:416px;border-radius:64px}
  .anim-scene:not(.ap-full) svg{width:84%;height:84%}`;
  return `<!doctype html><html data-theme="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><style>${reg.pageCss()}
${(entry.packObj && entry.packObj.css) || ''}
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${full ? '#233d46' : dark ? '#16171a' : '#f4f4f6'};--ap-speed:1;--ap-ease:ease-in-out}
  .anim-scene.ap-full{position:absolute;inset:0;width:100%;height:100%;border-radius:0;background:none;--as-size:100%;filter:none}
  .anim-scene.ap-full svg{width:100%;height:100%;filter:none}
  ${tile}</style></head><body>${html}<script>for(const a of document.getAnimations()){a.pause();a.currentTime=${at}}</script></body></html>`;
}

/**
 * A strip of a small item at SIZES px (the app draws it at 28 px in a list row and 128 px on a hero tile): the same tile the app uses (`.anim-scene`, its theme, its
 * background), sized by --as-size, each with its size under it. The PNG is at 1x, so 28 px IS 28 pixels: look at it at its real size.
 */
export function sizesPage(reg, entry, { mode = 'light', at = DEFAULT_AT, still = false, sizes = SIZES } = {}) {
  const dark = mode === 'dark' || mode === 'night';
  const sizeClass = (px) => (px <= 28 ? 'xs' : px <= 44 ? 'sm' : px <= 70 ? 'lg' : 'hero');   // the app's own tile classes: they also set the svg's share of the tile (92 % at xs, 84 % above)
  const tiles = sizes.map(px => {
    let html = reg.html(entry.item, still ? { reduced: true, size: sizeClass(px) } : { live: true, size: sizeClass(px) });
    if (mode === 'night') html = html.replace('class="anim-scene', 'class="anim-scene tod-night');
    return `<figure><div class="t" style="width:${px}px;height:${px}px">${html}</div><figcaption>${px} px</figcaption></figure>`;
  }).join('');
  const width = sizes.reduce((n, px) => n + px, 0) + sizes.length * 28 + 28, height = Math.max(...sizes) + 28 + 36;
  const css = `${reg.pageCss()}
${(entry.packObj && entry.packObj.css) || ''}
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${dark ? '#16171a' : '#f4f4f6'};--ap-speed:1;--ap-ease:ease-in-out;font:11px system-ui,sans-serif;color:${dark ? '#aab' : '#556'}}
  body{display:flex;align-items:flex-end;gap:28px;padding:14px 0 14px 28px;box-sizing:border-box}
  figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
  .t .anim-scene.anim-scene.anim-scene{--as-size:100%;width:100%;height:100%}`;
  return { html: `<!doctype html><html data-theme="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><style>${css}</style></head><body>${tiles}<script>for(const a of document.getAnimations()){a.pause();a.currentTime=${at}}</script></body></html>`, width, height };
}

/**
 * Render items to PNG files: <outDir>/<ref with / as __>-<mode>[-<crop>][-still | -t<ms>].png. Returns [{ref, file, full, crop, still, at, sizesFile}].
 *   still   animations OFF (the rest frame: what reduced motion shows; a scene's rising sun is at its place, a falling leaf is not mid-air)
 *   at      the time the animations are paused at, in ms (default 6.5 s); ignored with `still`
 *   sizes   also write <...>-sizes.png for every SMALL item: the item at 28, 40, 64 and 128 px (a scene has no strip)
 * `chrome` may be passed in to share one browser between calls.
 */
export async function renderItems(reg, entries, { mode = 'light', outDir, chrome, executable = findBrowser(), at = DEFAULT_AT, crop = '', still = false, sizes = false, onProgress, sky = null, season = null, tag: extraTag = '' } = {}) {
  if (!entries.length) return [];
  if (crop && !CROPS[crop]) throw new Error(`--crop must be one of ${Object.keys(CROPS).join(', ')}`);
  mkdirSync(outDir, { recursive: true });
  const own = !chrome;
  if (own) {
    if (!executable) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable (or PLAYWRIGHT_BROWSERS_PATH to a Playwright browsers folder).');
    chrome = await launchChrome({ executable });
  }
  const tag = (still ? '-still' : at !== DEFAULT_AT ? `-t${at}` : '') + extraTag;
  const out = [];
  try {
    for (const e of entries) {
      const cropped = crop && e.full;   // a small item is never cropped
      const stem = join(outDir, `${e.ref.replace(/\//g, '__')}-${mode}${cropped ? '-' + crop : ''}${tag}`);
      const file = stem + '.png';
      const eSky = typeof sky === 'function' ? sky(e) : sky;   // sky(entry): a live sky per item (its own place)
      const png = await chrome.screenshot({ html: itemPage(reg, e, { mode, at, still, sky: eSky, season }), width: e.full ? (cropped ? CROPS[crop] : 1600) : 512, height: e.full ? 900 : 512, transparent: false });
      writeFileSync(file, png);
      let sizesFile = '';
      if (sizes && !e.full) {
        const page = sizesPage(reg, e, { mode, at, still });
        sizesFile = stem + '-sizes.png';
        writeFileSync(sizesFile, await chrome.screenshot({ html: page.html, width: page.width, height: page.height, transparent: false }));
      }
      out.push({ ref: e.ref, file, full: e.full, crop: cropped ? crop : '', still, at: still ? null : at, sizesFile });
      if (onProgress) onProgress(out.length, entries.length, e.ref);
    }
  } finally { if (own) await chrome.close(); }
  return out;
}

/**
 * The page of a contact sheet: a grid of rendered PNGs (with their refs). `mode` picks the page: a dark page for dark and night renders, a LIGHT page for light ones (a small
 * light tile on a dark page is judged against the wrong background). `sizes: true` lays out the sizes strips (`sizesFile`) of the small items instead, at their real pixel size.
 */
export function contactPage(rendered, { columns = 4, mode = 'light', sizes = false } = {}) {
  const dark = mode === 'dark' || mode === 'night';
  const list = sizes ? rendered.filter(r => r.sizesFile).map(r => ({ ...r, file: r.sizesFile, full: false })) : rendered;
  const cells = list.map(r => `<figure class="${r.full ? 'w' : ''}"><img src="${pathToFileURL(r.file).href}"><figcaption>${esc(r.ref)}</figcaption></figure>`).join('');
  const bg = dark ? '#17232b' : '#eceef2', fg = dark ? '#fff' : '#1b2430';
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:${bg};color:${fg};font:13px system-ui}main{display:grid;grid-template-columns:repeat(${columns},${sizes ? 'max-content' : '1fr'});gap:10px}figure{margin:0}img{display:block;${sizes ? '' : 'width:100%;'}height:auto}figcaption{padding:4px 0}</style></head><body><main>${cells}</main></body></html>`;
}

/** A contact sheet in one PNG (contactPage rendered). `rendered` is renderItems' result. */
export async function contactSheet(rendered, { file, columns = 4, chrome, executable = findBrowser(), mode = 'light', sizes = false } = {}) {
  const own = !chrome;
  if (own) chrome = await launchChrome({ executable });
  try {
    const png = await chrome.screenshot({ html: contactPage(rendered, { columns, mode, sizes }), width: 1600, height: 'auto', transparent: false });
    writeFileSync(file, png);
    return file;
  } finally { if (own) await chrome.close(); }
}
