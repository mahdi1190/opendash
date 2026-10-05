// Loading the animation registry and rendering its items, for the animation tools (tools/anim-pack.mjs).
// Node >= 20, no dependencies: the headless Chrome driver is the repo's own (tools/release-chrome.mjs).
//
//   const reg = loadRegistry(root, { extraFiles, omit })   the pure registry the build would assemble (memoised unless extraFiles / omit; omit = file names left out)
//   reg.items()                                      every item {ref, pack, id, slot, full, item, packObj}
//   reg.packs()                                      the registered packs (id, css, items ...)
//   reg.html(item, opts)                             animItemHtml (default: live, full scenes 'fill', small items 'hero')
//   reg.classesFor(packObj)                          the css classes defined by the app css and the pack css
//   reg.pageCss()                                    the css a rendered page needs (tokens, animation library, scene sizes, swatches)
//   reg.limits                                       {item, scene}: the registry's byte budgets
//   reg.R                                            the evaluated registry functions (animPacks, animItemHtml ...) and the regions (ANIM_REGIONS, animRegion)
//   registrySources(root, extraFiles, omit)          the source files in build order, extra files placed where their name sorts
//   findBrowser()                                    Chrome / Edge / Chromium: CHROME_PATH, PATH, Playwright's folders
//   itemPage(reg, entry, {mode, at})                 the HTML page for one item, animations paused at `at` ms
//   renderItems(reg, entries, { mode, outDir, ... }) PNGs: scenes 1600 x 900 paused at 6.5 s, small items 512 x 512
//   contactSheet(rendered, { file, columns })        a grid of rendered PNGs in one PNG
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, basename, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
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
  const files = new Map(animRegistryFiles(app).filter(f => !omit.includes(f)).map(f => [f, join(app, f)]));
  for (const p of extraFiles) {
    const abs = resolve(p), name = basename(abs);
    if (!existsSync(abs)) throw new Error(`no such file: ${p}`);
    files.set(name, abs);   // a file of the same name replaces the registered one
  }
  return [...files.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map(([name, path]) => ({ name, path }));
}

const NAMES = ['animPacks', 'animPack', 'animItem', 'animItems', 'animItemHtml', 'animValidatePack', 'ANIM_ITEM_MAX_BYTES', 'ANIM_FULL_ITEM_MAX_BYTES', 'ANIM_REGIONS', 'animRegion'];

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
function loadRegistryUncached(root, extraFiles, omit = []) {
  const list = registrySources(root, extraFiles, omit);
  const texts = list.map(f => readFileSync(f.path, 'utf8'));
  let R;
  try {
    // eslint-disable-next-line no-new-func
    R = new Function(texts.join('\n;\n') + `\nreturn { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`)();
  } catch (e) {
    for (let i = 0; i < list.length; i++) {
      try { new Function(texts[i]); } catch (se) { throw new Error(`${list[i].name}: ${se.message}`); }   // compile only: names the file with the syntax error
    }
    throw e;
  }
  const styles = join(root, 'src', 'styles');
  const cssFiles = existsSync(styles) ? readdirSync(styles).filter(f => f.endsWith('.css')).sort() : [];
  let appCss = null;
  const appCssText = () => appCss || (appCss = cssFiles.map(f => readFileSync(join(styles, f), 'utf8')).join('\n'));
  let appClasses = null;
  const reg = {
    root, files: list.map(f => f.name), R,
    packs: () => R.animPacks(),
    items() {
      const out = [];
      for (const p of R.animPacks()) for (const it of p.items) out.push({ ref: it.ref, pack: p.id, id: it.id, slot: it.slot, full: !!it.full, item: it, packObj: p });
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
    limits: { item: R.ANIM_ITEM_MAX_BYTES || 14000, scene: R.ANIM_FULL_ITEM_MAX_BYTES || 32000 },
  };
  return reg;
}

/* ---------------------------------------------------------------------------------------------
   Rendering
   --------------------------------------------------------------------------------------------- */
/** Chrome, Edge or Chromium: CHROME_PATH, then PATH and the usual install folders, then Playwright's browser folders. */
export function findBrowser(env = process.env) {
  const direct = findChrome(env);
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

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The page for one item: the app's theme variables and animation css, the pack's css, the animations paused at `at` ms. */
export function itemPage(reg, entry, { mode = 'light', at = 6500 } = {}) {
  const full = entry.full;
  let html = reg.html(entry.item, { live: true, size: full ? 'fill' : 'hero' });
  if (mode === 'night') html = html.replace('class="anim-scene', 'class="anim-scene tod-night');
  else if (mode === 'dusk') html = html.replace('class="anim-scene', 'class="anim-scene tod-dusk');
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
 * Render items to PNG files: <outDir>/<ref with / as __>-<mode>.png. Returns [{ref, file, full}].
 * `chrome` may be passed in to share one browser between calls.
 */
export async function renderItems(reg, entries, { mode = 'light', outDir, chrome, executable = findBrowser(), at = 6500, onProgress } = {}) {
  if (!entries.length) return [];
  mkdirSync(outDir, { recursive: true });
  const own = !chrome;
  if (own) {
    if (!executable) throw new Error('No Chrome, Edge or Chromium found. Set CHROME_PATH to its executable (or PLAYWRIGHT_BROWSERS_PATH to a Playwright browsers folder).');
    chrome = await launchChrome({ executable });
  }
  const out = [];
  try {
    for (const e of entries) {
      const file = join(outDir, `${e.ref.replace(/\//g, '__')}-${mode}.png`);
      const png = await chrome.screenshot({ html: itemPage(reg, e, { mode, at }), width: e.full ? 1600 : 512, height: e.full ? 900 : 512, transparent: false });
      writeFileSync(file, png);
      out.push({ ref: e.ref, file, full: e.full });
      if (onProgress) onProgress(out.length, entries.length, e.ref);
    }
  } finally { if (own) await chrome.close(); }
  return out;
}

/** A grid of rendered PNGs (with their refs) in one PNG. `rendered` is renderItems' result. */
export async function contactSheet(rendered, { file, columns = 4, chrome, executable = findBrowser() } = {}) {
  const own = !chrome;
  if (own) chrome = await launchChrome({ executable });
  try {
    const cells = rendered.map(r => `<figure class="${r.full ? 'w' : ''}"><img src="${pathToFileURL(r.file).href}"><figcaption>${esc(r.ref)}</figcaption></figure>`).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#17232b;color:#fff;font:13px system-ui}main{display:grid;grid-template-columns:repeat(${columns},1fr);gap:10px}figure{margin:0}img{display:block;width:100%;height:auto}figcaption{padding:4px 0}</style></head><body><main>${cells}</main></body></html>`;
    const png = await chrome.screenshot({ html, width: 1600, height: 'auto', transparent: false });
    writeFileSync(file, png);
    return file;
  } finally { if (own) await chrome.close(); }
}
