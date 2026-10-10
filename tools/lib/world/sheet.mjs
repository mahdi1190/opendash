// World sheets (docs/dev/WORLD_ENGINE.md 15.5, 16.4; requirements U3, V6, V7, R3). Node >= 20, no dependencies; Chrome through
// tools/release-chrome.mjs (DevTools over a pipe: no port). Never touches the user's live server.
//
//   WORLD_SIZES                                  the frame sizes of R3: 21:9 (3440 x 1440), 4K (3840 x 2160), 16:9 (1600 x 900), phone (390 x 844), tile (320 x 180)
//   worldPageOpen(chrome, src, o)                -> Page { set({ at, wx, season }), ready(), png(), frameAt(t), stats(), errors(), size }
//                                                   loads ONE scene page (a registered ref, or a v3 spec through worldHostData) and keeps it;
//                                                   every cell after the first is a re-light (sceneHostSet), not a reload
//   worldSheetPlan(spec, o)                      -> [{ row, col, label, at, wx, size }]: the cells of a sheet (o.matrix: 4 seasons x 5 times
//                                                   x 3 weathers; else 3 dates x 5 times, plus a row of sizes at summer noon)
//   worldSheet(chrome, src, o)                   -> { sheet, cells: [{ ..., file }], errors }: renders the cells and composes the sheet PNG
//   worldReviewChecklist(kind)                   -> the fresh reviewer's checklist (V7 and 16.6) printed beside every sheet
//   composeSheet(chrome, cells, o)               -> PNG buffer of captioned thumbnails in a grid (also used by capture and compare)
// src: { spec, id } (a v3 spec: a world-test item's spec, an adversarial fixture) or { ref } (a v1 / v2 animation item: the originals).
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { scenePageHtml } from '../scene-page.mjs';
import { worldMomentsOf, worldMatrixCells, WORLD_DATES3 } from './adversarial.mjs';
import { seasonDates } from '../scene-times.mjs';

export const WORLD_SIZES = Object.freeze({
  '21:9': { w: 3440, h: 1440 }, '4k': { w: 3840, h: 2160 }, '16:9': { w: 1600, h: 900 }, phone: { w: 390, h: 844 }, tile: { w: 320, h: 180 },
});
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fileSafe = (s) => String(s).replace(/[^a-z0-9._-]+/gi, '_');

/** The page source of a scene: a registered ref, or a v3 spec through the host (the same data expression `world render` uses). */
function pageSource(src) {
  // a v3 spec always goes through the host (world-test items live in the scene packs, which the page's animItem does not list);
  // a ref is for the v1 / v2 animation items (the originals in compare)
  if (!src.spec && src.ref) return { refs: [src.ref] };
  const id = src.id || (src.ref ? src.ref.split('/').pop() : 'world');
  return { data: `worldHostData(${JSON.stringify(src.spec)}, { id: ${JSON.stringify(id)}, sync: true })` };
}
const placeOf = (src) => { const P = (src.spec && src.spec.place) || {}; return Number.isFinite(P.lat) ? [P.lat, P.lon] : null; };

/**
 * Open a scene page and keep it. o: { size: { w, h }, dpr, at, wx, still (default true), root }.
 * Page.set re-lights the mounted host (sceneHostSet: a moment, a weather, a season) and waits for the re-bake.
 */
export async function worldPageOpen(chrome, src, o = {}) {
  const size = o.size || WORLD_SIZES['16:9'];
  const opts = Object.assign({ root: o.root, size, dpr: o.dpr || 1, still: o.still !== false, renderer: 'canvas', at: o.at || null, location: o.location || placeOf(src) }, pageSource(src));
  if (o.wx) opts.wx = o.wx;
  if (chrome.emulateMedia) await chrome.emulateMedia([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  const t0 = Date.now();
  await chrome.screenshot({ html: scenePageHtml(opts), width: size.w, height: size.h, scale: opts.dpr, transparent: false });
  const ok = await chrome.evaluate('Promise.race([window.__sceneReady, new Promise(r => setTimeout(() => r("timeout"), 30000))])');
  if (ok !== true) throw new Error('the scene page did not get ready: ' + ok + ' ' + JSON.stringify(await chrome.evaluate('window.__sceneErrors')));
  const loadMs = Date.now() - t0;
  const waitBake = `(async () => { const rec = typeof _schHosts !== 'undefined' ? [..._schHosts.values()].find(r => r.r) : null; if (!rec) return (typeof _schHosts !== 'undefined' && [..._schHosts.values()].some(r => r.fallback)) || document.querySelector('.sp-box svg') ? 'svg' : 'no scene host: ' + JSON.stringify(window.__sceneErrors);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); const t0 = performance.now();
      while (performance.now() - t0 < 30000) { const r = rec.r; if (r.ready && !r.baking && !r.waiting) break; await new Promise(r => setTimeout(r, 40)); }
      return true; })()`;
  const page = {
    size, loadMs, src,
    /** Waits for the (re-)bake. A host that fell back to the SVG still (no canvas) is ready as it is: page.svg is set. */
    async ready() { const r = await chrome.evaluate(waitBake); if (r === 'svg') { page.svg = true; return true; } if (r !== true) throw new Error(String(r)); return true; },
    /** Re-light: o.at (ISO or ms), o.wx (a weather kind or null), o.season. Waits for the re-bake. */
    async set(s) {
      const r = await chrome.evaluate(`(() => { const el = document.querySelector('.sp-box .anim-scene'); if (!el || typeof sceneHostSet !== 'function') return 'no host'; sceneHostSet(el, ${JSON.stringify(s)}); return true; })()`);
      if (r !== true) throw new Error('sceneHostSet: ' + r);
      return page.ready();
    },
    /** The frame at scene time t (seconds): the host's clock is stopped and the world's life advanced to t, deterministically. */
    async frameAt(t) {
      const id = src.spec ? (src.id || (src.ref ? src.ref.split('/').pop() : 'world')) + '~w3' : null;
      return chrome.evaluate(`(() => { const rec = [..._schHosts.values()].find(r => r.r); if (!rec) return false; rec.still = true; rec.r.stop();
        if (typeof window.__worldSetTime === 'function') { window.__worldSetTime(${t}); rec.r.frame(${t}); return true; }
        const ids = ${JSON.stringify(id)} ? [${JSON.stringify(id)}] : (typeof _wh5Live !== 'undefined' ? [..._wh5Live.keys()] : []);
        for (const k of ids) { const live = typeof worldHostLive === 'function' ? worldHostLive(k) : null; if (live && live.sim && live.sim.to) { live.simAt = 0; live.sim.to(live.sim.base + ${t}, 1e6); } }
        rec.r.frame(${t}); return true; })()`);
    },
    png() { return chrome.capture({ width: size.w, height: size.h, scale: 1 }); },
    stats() { return chrome.evaluate('window.__sceneStats ? window.__sceneStats()[0] : null'); },
    errors() { return chrome.evaluate('window.__sceneErrors || []'); },
  };
  await page.ready();
  return page;
}

/** The cells of a sheet. o: { matrix, sizes: [names], dates }. */
export function worldSheetPlan(spec, o = {}) {
  const cells = [];
  if (o.matrix) {
    const list = worldMatrixCells(spec);
    const rows = [...new Set(list.map(c => c.season + ' / ' + c.wx))];
    for (const c of list) cells.push({ row: rows.indexOf(c.season + ' / ' + c.wx), rowLabel: c.season + ' / ' + c.wx, col: ['dawn', 'noon', 'golden', 'dusk', 'night'].indexOf(c.moment), label: `${c.season} ${c.moment} ${c.wx}`, at: c.at, wx: c.wx, season: c.season, moment: c.moment, size: '16:9' });
    return cells;
  }
  const moments = worldMomentsOf(spec, o.dates || WORLD_DATES3);
  const dates = [...new Set(moments.map(m => m.date))];
  for (const m of moments) cells.push({ row: dates.indexOf(m.date), rowLabel: m.date, col: ['dawn', 'noon', 'golden', 'dusk', 'night'].indexOf(m.moment), label: `${m.date} ${m.moment}`, at: m.at, wx: null, moment: m.moment, size: '16:9' });
  if (o.sizes !== false) {
    const lat = spec && spec.place && Number.isFinite(spec.place.lat) ? spec.place.lat : 51.5;
    const summer = seasonDates(lat).find(d => d.season === 'summer').date, noon = worldMomentsOf(spec, [summer]).find(m => m.moment === 'noon');
    const names = Array.isArray(o.sizes) ? o.sizes : Object.keys(WORLD_SIZES);
    names.forEach((n, i) => cells.push({ row: dates.length, rowLabel: 'sizes (summer noon)', col: i, label: n + ' ' + WORLD_SIZES[n].w + 'x' + WORLD_SIZES[n].h, at: noon ? noon.at : null, wx: null, size: n }));
  }
  return cells;
}

/** The reviewer's checklist (16.6 and V7): what a fresh pair of eyes must look for in every sheet, matrix and strip. */
export function worldReviewChecklist(kind = 'sheet') {
  const base = ['green deciduous trees in December-February, bare trees in summer', 'lit windows or street lamps at noon', 'sun shadows at night, shadows in two directions',
    'snow lying or falling in May-September', 'reflections outside water, doubled or offset reflections, gaps or black holes in the water',
    'anything floating, sunk through the ground, standing in water that should not (boats on land, ducks on roofs)', 'boughs or fronds hanging from nothing',
    'giants near the lens, half people at the frame edges, a big thing cut by the frame', 'bare ground over 15 % of the frame, an empty horizon',
    'rows and grids, clones walking or bobbing in step', 'cars on the right, trains off the rails', 'a landmark hidden or cropped, a blurry or stretched frame at this size'];
  if (kind === 'capture') base.push('popping in or out mid-frame, walking on the spot, sliding feet, a visible restart at the loop seam');
  if (kind === 'compare') base.push('the world version emptier or poorer than the original (P7, U4)', 'anything the original shows that the world version lost');
  return base;
}

/** A sheet of captioned thumbnails. cells: [{ row, col, label, file, rowLabel }]. o: { title, thumb: { w, h }, notes: [] }. */
export async function composeSheet(chrome, cells, o = {}) {
  const thumb = o.thumb || { w: 320, h: 180 };
  const rows = Math.max(...cells.map(c => c.row)) + 1, cols = Math.max(...cells.map(c => c.col)) + 1;
  const rowLabels = []; for (const c of cells) rowLabels[c.row] = c.rowLabel || '';
  let html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:10px;background:#1b1f26;color:#e8ecf2;font:12px system-ui,sans-serif}
h1{font-size:15px;margin:0 0 8px}.g{display:grid;grid-template-columns:120px repeat(${cols},${thumb.w}px);gap:6px;align-items:start}
.rl{font-weight:600;padding-top:4px}figure{margin:0}img{display:block;width:${thumb.w}px;height:${thumb.h}px;object-fit:contain;background:#000}figcaption{padding:2px 0;opacity:.85}
ul{margin:10px 0 0;padding-left:18px;columns:2;max-width:${120 + cols * (thumb.w + 6)}px}li{margin:1px 0}.bad{color:#ff8080}</style></head><body><h1>${esc(o.title || 'world sheet')}</h1><div class="g">`;
  for (let r = 0; r < rows; r++) {
    html += `<div class="rl">${esc(rowLabels[r] || '')}</div>`;
    for (let c = 0; c < cols; c++) {
      const cell = cells.find(x => x.row === r && x.col === c);
      html += cell && cell.file ? `<figure><img src="${pathToFileURL(cell.file).href}"><figcaption class="${cell.bad ? 'bad' : ''}">${esc(cell.label)}${cell.note ? ' - ' + esc(cell.note) : ''}</figcaption></figure>` : '<div></div>';
    }
  }
  html += '</div>';
  if (o.notes && o.notes.length) html += `<ul>${o.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
  html += '</body></html>';
  return chrome.screenshot({ html, width: 140 + cols * (thumb.w + 6), height: 'auto', transparent: false });
}

/**
 * Render a sheet. src: { ref } | { spec, id }. o: { matrix, sizes, dates, dir, root, title, onCell }.
 * Each 16:9 cell is a re-light of one page; each other size opens its own page (R3: rendered at its real size, never scaled up).
 */
export async function worldSheet(chrome, src, o = {}) {
  const spec = src.spec || {};
  const cells = worldSheetPlan(spec, o), dir = o.dir || join(tmpdir(), 'opendash-world', 'sheet'), name = fileSafe(src.ref || src.id || 'world');
  mkdirSync(dir, { recursive: true });
  const errors = [];
  let page = null;
  for (const c of cells.filter(x => x.size === '16:9')) {
    try {
      if (!page) page = await worldPageOpen(chrome, src, { size: WORLD_SIZES['16:9'], at: c.at, wx: c.wx, root: o.root });
      await page.set({ at: c.at, wx: c.wx || null });
      c.file = join(dir, `${name}--${fileSafe(c.label)}.png`);
      writeFileSync(c.file, await page.png());
      if (o.onCell) o.onCell(c);
    } catch (e) { errors.push(`${c.label}: ${e.message}`); c.note = 'failed'; c.bad = true; }
  }
  for (const c of cells.filter(x => x.size !== '16:9')) {
    try {
      const p = await worldPageOpen(chrome, src, { size: WORLD_SIZES[c.size], at: c.at, root: o.root });
      c.file = join(dir, `${name}--${fileSafe(c.label)}.png`);
      writeFileSync(c.file, await p.png());
      if (o.onCell) o.onCell(c);
    } catch (e) { errors.push(`${c.label}: ${e.message}`); c.note = 'failed'; c.bad = true; }
  }
  if (page) for (const e of await page.errors()) errors.push('page: ' + e);
  const sheet = join(dir, `${name}--${o.matrix ? 'matrix' : 'sheet'}.png`);
  writeFileSync(sheet, await composeSheet(chrome, cells, { title: (o.title || src.ref || src.id) + (o.matrix ? ': 4 seasons x 5 times x 3 weathers' : ': 3 dates x 5 times, and sizes'),
    notes: ['Reviewer: look for each of these and list every one you see (the list must be empty):', ...worldReviewChecklist('sheet')] }));
  return { sheet, cells, errors };
}
