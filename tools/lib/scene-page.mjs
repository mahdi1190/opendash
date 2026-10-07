// The scene engine's page harness (docs/dev/SCENE_ENGINE.md 10.1; builder B). Node >= 20, no dependencies.
//
//   sceneSourceFiles(root, { browser, fixtures })   the src/app files a scene page (or a Node load) needs, in build order:
//                                                   the animation registry files + 70-scene-* + 71-scene-* (+ 78-scene-* in the browser).
//                                                   Without the core (70-scene-0core.js not merged yet) tests/fixtures/scene-core-shim.js
//                                                   stands in for it; fixtures: true adds the test objects and test scenes.
//   loadScenes(root, { fixtures, extra })           evaluate those files in Node the way the build does (one scope) -> the scene names (sceneSvg ...)
//   scenePageHtml({ root, refs | data, size: { w, h }, dpr, mode, at, location, season, still, renderer, upgrades, compare, fixtures })
//                                                   a self-contained page: the sources above + the app css the scenes need + 76-scene.css;
//                                                   mounts each scene in a box of `size`; window.__sceneReady resolves after the first bake.
//                                                   data: scene data (or a source string evaluated in the page, e.g. 'sceneTestDense()')
//                                                   upgrades: a DRAFT upgrade's composed scene (item.upgrade.scene) instead of the legacy art
//                                                   compare: per ref TWO boxes side by side (old: the legacy art through animItemHtml with the retrofit
//                                                   overlay at the same sky; new: the composed scene on the canvas renderer), each with a caption
//   sceneRenderPng(chrome, opts, file)              renders the page, waits for __sceneReady, writes the PNG
//   scenePerf(chrome, opts)                         renders the page, runs `seconds` of rAF, returns window.__sceneStats()[0]
//                                                   { drawMs, dynMs: { median, p95, max, n }, firstBakeMs, bakeMs, sprites, spriteBytes, bitmaps, blitPx, animatedDraws, actors }
// Chrome: tools/release-chrome.mjs launchChrome() (DevTools over a pipe, so no debug port is used). Callers close it in a finally.
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { animRegistryFiles } from './anim-sources.mjs';

export const repoRoot = () => resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SCENE_SRC_RE = /^7[01]-scene-[a-z0-9-]+\.js$/, SCENE_BROWSER_RE = /^78-scene-[a-z0-9-]+\.js$/;
const FIXTURES = ['scene-test-objects.js', 'scene-test-scenes.js'];

/** The source files (absolute paths), in build order. */
export function sceneSourceFiles(root = repoRoot(), { browser = false, fixtures = false } = {}) {
  const app = join(root, 'src', 'app'), names = readdirSync(app);
  const list = [...new Set([...animRegistryFiles(app), ...names.filter(f => SCENE_SRC_RE.test(f)), ...(browser ? names.filter(f => SCENE_BROWSER_RE.test(f)) : [])])].sort();
  const paths = list.map(f => join(app, f));
  if (!names.includes('70-scene-0core.js')) {
    // the core is not merged yet: the shim takes its place in the order (before every other 70-scene file)
    const i = list.findIndex(f => f >= '70-scene-0core.js');
    paths.splice(i < 0 ? paths.length : i, 0, join(root, 'tests', 'fixtures', 'scene-core-shim.js'));
  }
  if (fixtures) for (const f of FIXTURES) paths.push(join(root, 'tests', 'fixtures', f));
  return paths;
}

const NAMES = ['sceneSvg', 'sceneRendererFor', 'sceneHostAttrs', 'sceneSvgCss', 'sceneLodFor', 'sceneLightKey', 'sceneSpriteKey', 'sceneAnimPose', 'sceneActorAt', 'sceneFlockAt',
  'sceneParticleSet', 'sceneParticleAt', 'sceneBakePlan', 'sceneFrameDraws', 'scenePathBox', 'sceneSignLayout', 'sceneCompile', 'sceneLight', 'sceneObjShapes', 'sceneObjDefine', 'sceneObj',
  'sceneItem', 'sceneData', 'sceneSeason', 'sceneColour', 'sceneSignText', 'sceneScaleBucket', 'animItemHtml', 'animRegisterPack', 'animItem', 'almSceneLight',
  'SCENE_TEST_TINY', 'sceneTestDense', 'SCENE_SVG_FILL_MAX_BYTES', 'SCENE_SVG_TILE_MAX_BYTES', 'SCENE_DRAW_BUDGET', 'SCENE_MAX_BITMAPS'];
/** Evaluate the scene sources in Node (one function scope, as the build concatenates them). */
export function loadScenes(root = repoRoot(), { fixtures = true, extra = '' } = {}) {
  const files = sceneSourceFiles(root, { fixtures });
  const body = files.map(f => readFileSync(f, 'utf8')).join('\n;\n') + '\n;\n' + extra;   // extra: test-only source (a stub sceneCanvasSupported ...)
  const tail = `\nreturn { ${NAMES.map(n => `${n}: typeof ${n} === 'undefined' ? undefined : ${n}`).join(', ')} };`;
  return new vm.Script('(function () {\n' + body + tail + '\n})', { filename: 'scene-bundle.js' }).runInThisContext()();
}

const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** The css a scene page needs: the app's tokens, the animation library, the scene sizes, 76-scene.css. */
function pageCss(root) {
  const styles = join(root, 'src', 'styles');
  if (!existsSync(styles)) return '';
  const files = readdirSync(styles).filter(f => f.endsWith('.css')).sort();
  const want = files.filter(f => ['00-tokens.css', '03-motion-tokens.css', '76-scenes.css', '76-scene.css'].includes(f) || /anim/.test(f));
  return want.map(f => readFileSync(join(styles, f), 'utf8')).join('\n');
}

/**
 * The page. opts: { root, refs: ['pack/id', ...] | data: object | string (a JS expression evaluated in the page), size: { w, h } (1600 x 900),
 * dpr (1), mode 'light' | 'dark', at (ISO), location ([lat, lon]), season, still, renderer 'canvas' | 'svg', upgrades, compare, fixtures, flush }
 * flush: perf pages read one pixel back after each frame (getImageData), so the measured time includes the rasterisation, not
 * just the recording of the draw calls (Chrome defers 2D canvas work until the frame is presented).
 */
export function scenePageHtml(opts = {}) {
  const root = opts.root || repoRoot(), size = opts.size || { w: 1600, h: 900 };
  const fixtures = opts.fixtures != null ? opts.fixtures : (opts.data != null);
  const src = sceneSourceFiles(root, { browser: true, fixtures }).map(f => readFileSync(f, 'utf8')).join('\n;\n');
  const cfg = { refs: opts.refs || [], size, at: opts.at || null, location: opts.location || null, season: opts.season || null, still: !!opts.still, renderer: opts.renderer || 'canvas',
    upgrades: !!opts.upgrades, compare: !!opts.compare, mode: opts.mode || 'light', flush: opts.flush || false, profile: !!opts.profile };
  const dataExpr = opts.data == null ? 'null' : typeof opts.data === 'string' ? opts.data : JSON.stringify(opts.data);
  const dark = cfg.mode === 'dark' || cfg.mode === 'night';
  const boxCss = cfg.compare
    ? `.sp-row{display:flex;gap:8px;margin:0 0 8px}.sp-cell{display:flex;flex-direction:column;gap:4px}.sp-cap{font:600 13px system-ui,sans-serif;color:${dark ? '#dde' : '#223'}}`
    : '.sp-row{display:flex;flex-wrap:wrap;gap:0}.sp-cap{display:none}';
  return `<!doctype html><html data-theme="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"><style>${pageCss(root)}
html,body{margin:0;background:${dark ? '#16171a' : '#f4f4f6'};overflow:hidden}
.sc-canvas{transition:none!important}
.sp-box{position:relative;width:${size.w}px;height:${size.h}px;overflow:hidden}
.sp-box>.anim-scene{position:absolute;inset:0;width:100%;height:100%;border-radius:0;--as-size:100%}
.sp-box>.anim-scene>svg{width:100%;height:100%;display:block}
${boxCss}</style></head><body><div id="sp-root">${scenePageRows(opts)}</div>
<script>window.__sceneErrors=[];addEventListener('error',e=>window.__sceneErrors.push(String(e.message)));window.__sceneOpts=${JSON.stringify(cfg)};</script>
<script>${src}
;(function () {
  const cfg = window.__sceneOpts, rootEl = document.getElementById('sp-root');
  // the live sky for 'at' / 'location' (the same o.sky animItemHtml builds), else the authored moment
  const skyFor = (lat, lon) => { if (!cfg.at) return null; const loc = cfg.location || [lat, lon]; return almSceneLight(Date.parse(cfg.at), loc[0], loc[1], 'UTC'); };
  window.__sceneSkyFor = skyFor;
  const items = [];
  const data = ${dataExpr};
  if (data) {
    const it = sceneItem({ id: 'scene-page', label: 'Scene page', site: 'test', tags: ['test'], mood: 'calm', colour: 'blue', when: () => false }, data);
    animRegisterPack({ id: 'scene-page', name: 'Scene page', items: [it] });
    items.push('scene-page/scene-page');
  }
  for (const r of cfg.refs) items.push(r);
  const hostHtml = (it, o) => {
    const html = typeof animItemHtml === 'function' ? animItemHtml(it, o) : '';
    if (/ap-composed/.test(html) || cfg.renderer === 'svg' || !it.composed) return html;
    // the core's composed branch in animItemHtml (builder A) is not merged yet: the same markup by hand
    const cls = ['anim-scene', 'ap-art', 'c-' + (it.colour || 'blue'), 'sz-' + (o.size || 'fill'), 'ap-' + (it.slot || 'opening'), 'ap-full', 'ap-rich', 'ap-composed'];
    if (o.reduced) cls.push('ap-still'); else if (o.live) cls.push('is-live');
    return '<span class="' + cls.join(' ') + '" data-anim="' + it.ref + '"' + sceneHostAttrs(it, o) + '><canvas class="sc-canvas" aria-hidden="true"></canvas></span>';
  };
  const optsFor = (it) => {
    const lat = it.liveSky ? it.liveSky.lat : 51.5, lon = it.liveSky ? it.liveSky.lon : 0, sky = skyFor(lat, lon);
    const o = { size: 'fill', live: !cfg.still, reduced: cfg.still, renderer: cfg.renderer };
    if (sky) { o.sky = sky; o.tod = sky.tod; } else o.lighting = false;
    if (cfg.season) o.season = cfg.season;
    return o;
  };
  // the packs' own css (hand-drawn scenes style their tints, lamps and motion classes there)
  const pcss = [...new Set(items.map(r => r.split('/')[0]))].map(id => (typeof animPack === 'function' && animPack(id) && animPack(id).css) || '').join(' ');
  if (pcss) { const st = document.createElement('style'); st.textContent = pcss; document.head.appendChild(st); }
  // fill the boxes the page was written with (scenePageRows): one per ref, or old | new per ref with compare
  for (const ref of items) {
    let it = animItem(ref);
    const box = (side) => rootEl.querySelector('.sp-box[data-ref="' + CSS.escape(ref) + '"][data-side="' + side + '"]');
    if (!it) { const b = box(cfg.compare ? 'new' : 'one'); if (b) b.textContent = 'unknown: ' + ref; continue; }
    const draft = it.upgrade && it.upgrade.scene ? it.upgrade.scene : null;
    const composedOf = () => it.composed ? it : (draft ? Object.assign({}, it, { composed: true, rich: true, full: true, scene: draft, svg: (o) => sceneSvg(draft, o), ref: it.ref + '#upgrade' }) : null);
    if (cfg.compare) {
      const neu = composedOf();
      let old = it.composed && it.legacySvg ? Object.assign({}, it, { composed: false, svg: it.legacySvg, reduced: 'static' }) : (it.composed ? null : it);
      if (old && it.composed && typeof sceneRetrofit === 'function') { try { old = sceneRetrofit(old, it.retro || {}); } catch (e) { /* the plain legacy art */ } }
      if (neu) window.__sceneItems = Object.assign(window.__sceneItems || {}, { [neu.ref]: neu });
      box('old').innerHTML = old ? hostHtml(old, Object.assign(optsFor(it), { renderer: 'svg' })) : '';
      box('new').innerHTML = neu ? hostHtml(neu, optsFor(neu)) : '<div class="sp-cap">no composed scene yet</div>';
      continue;
    }
    if (cfg.upgrades && !it.composed) { const neu = composedOf(); if (neu) { it = neu; window.__sceneItems = Object.assign(window.__sceneItems || {}, { [neu.ref]: neu }); } }
    box('one').innerHTML = hostHtml(it, optsFor(it));
  }
  window.__sceneReady = (typeof sceneHostScan === 'function' ? (sceneHostScan(document), sceneHostReady()) : Promise.resolve()).then(() => true);
})();
</script></body></html>`;
}

/**
 * The page's boxes (filled by the page script): per ref (and 'scene-page/scene-page' for opts.data) one .sp-box, or with
 * compare two captioned boxes side by side, "old: hand-drawn (legacy)" | "new: composed".
 */
export function scenePageRows(opts = {}) {
  const refs = (opts.data != null ? ['scene-page/scene-page'] : []).concat(opts.refs || []);
  return refs.map(ref => {
    const r = esc(ref);
    if (!opts.compare) return `<div class="sp-row"><div class="sp-box" data-ref="${r}" data-side="one" data-scene-key="${r}"></div></div>`;
    return `<div class="sp-row" data-ref="${r}"><div class="sp-cell"><div class="sp-cap">old: hand-drawn (legacy)</div><div class="sp-box" data-ref="${r}" data-side="old" data-scene-key="old-${r}"></div></div>`
      + `<div class="sp-cell"><div class="sp-cap">new: composed</div><div class="sp-box" data-ref="${r}" data-side="new" data-scene-key="new-${r}"></div></div></div>`;
  }).join('');
}
async function loadPage(chrome, opts) {
  const size = opts.size || { w: 1600, h: 900 };
  const cols = opts.compare ? 2 : 1, rows = Math.max(1, (opts.refs || []).length + (opts.data != null ? 1 : 0));
  const W = opts.compare ? size.w * 2 + 8 : size.w, H = opts.compare ? (size.h + 24) * rows : size.h * rows;
  // Stillness is decided by the page (data-sc-still), never by the machine. The Windows and macOS CI runners report the
  // OS setting "reduce animations", which parks the scene host: the dense-scene test saw 0 frames drawn on both.
  if (chrome.emulateMedia) await chrome.emulateMedia([{ name: 'prefers-reduced-motion', value: opts.reducedMotion ? 'reduce' : 'no-preference' }]);
  await chrome.screenshot({ html: scenePageHtml(opts), width: W, height: H, scale: opts.dpr || 1, transparent: false });
  const ok = await chrome.evaluate('Promise.race([window.__sceneReady, new Promise(r => setTimeout(() => r("timeout"), 20000))])');
  if (ok !== true) throw new Error('scene page did not get ready: ' + ok + ' ' + JSON.stringify(await chrome.evaluate('window.__sceneErrors')));
  return { W, H, cols };
}
/** Render a scene page to a PNG file (waits for the first bake). Returns the file path. */
export async function sceneRenderPng(chrome, opts, file) {
  const { W, H } = await loadPage(chrome, opts);
  // the page is ready: capture it again (the first capture may predate the first bake)
  const png = chrome.capture ? await chrome.capture({ width: W, height: H, scale: opts.dpr || 1 }) : await chrome.screenshot({ html: scenePageHtml(opts), width: W, height: H, scale: opts.dpr || 1, transparent: false });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, png);
  return file;
}
/**
 * Time a scene in the real renderer: `seconds` of animation frames, then the host's stats (the first mounted host).
 * opts.rebake: half way through, move the sky to another moment (opts.rebakeAt, ISO; default 9 hours after `at` or now),
 * so the light key changes and the renderer re-bakes in idle slices; the result gains rebake: { worstGapMs, worstDrawMs, bakes }.
 */
export async function scenePerf(chrome, opts = {}) {
  const seconds = opts.seconds || 3;
  const rebakeMs = opts.rebake ? (opts.rebakeAt ? Date.parse(opts.rebakeAt) : (opts.at ? Date.parse(opts.at) : Date.now()) + 9 * 3600000) : 0;
  await loadPage(chrome, Object.assign({}, opts, { flush: opts.flush === false ? false : opts.flush || true }));
  const r = await chrome.evaluate(`(async () => {
    await new Promise(r => setTimeout(r, 300));
    if (window.__sceneStatsReset) window.__sceneStatsReset();
    const t0 = performance.now(); let frames = 0, last = t0; const gaps = [];
    const rebakeMs = ${rebakeMs}; let forced = 0, worstGap = 0, worstDraw = 0;
    await new Promise(res => { const f = now => {
      frames++; const gap = now - last; gaps.push(gap); last = now;
      if (forced) { worstGap = Math.max(worstGap, gap); const s = window.__sceneStats()[0]; if (s) worstDraw = Math.max(worstDraw, s.drawMs.max); }
      if (rebakeMs && !forced && now - t0 > ${seconds * 500}) { forced = now; window.__sceneForceSky(rebakeMs); }
      if (now - t0 < ${seconds * 1000}) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    const st = window.__sceneStats ? window.__sceneStats() : [];
    gaps.shift(); gaps.sort((a, b) => a - b);
    const out = Object.assign({ rafFrames: frames, rafMedian: gaps[Math.floor(gaps.length / 2)] || 0 }, st[0] || {});
    if (rebakeMs) out.rebake = { worstGapMs: Math.round(worstGap * 10) / 10, worstDrawMs: worstDraw, bakes: st[0] ? st[0].bakes : 0, lightKey: st[0] ? st[0].lightKey : null };
    return out;
  })()`);
  return r;
}
