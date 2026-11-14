// Renders of many world scenes in one Chrome, and the contact sheets of the scene factory (docs/dev/SCENE_FACTORY.md). Node >= 20,
// no dependencies; Chrome through tools/release-chrome.mjs (DevTools over a pipe: no port, never the live server).
//
//   FACTORY_MOMENTS                         the review moments: summer noon, autumn golden hour, winter night (solar times at the place)
//   factoryMomentAt(spec, key)              -> ISO time of a moment key ('summer-noon' ...) at the spec's place
//   renderWorlds(chrome, list, o)           -> [{ id, moment, file, ms, error }]: each scene's page is opened once and re-lit per moment.
//                                              list: [{ id, spec }]; o: { dir, moments: [keys], root, cache (reuse a PNG newer than
//                                              o.since), onCell }
//   contactSheet(chrome, rows, o)           -> PNG buffer: one row a scene (or a grid of tiles), captioned, with notes under each tile
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { worldPageOpen, WORLD_SIZES, fileSafe } from './sheet.mjs';
import { worldMomentsOf } from './adversarial.mjs';

export const FACTORY_MOMENTS = Object.freeze([
  { key: 'summer-noon', date: '07-15', moment: 'noon', label: 'summer noon' },
  { key: 'autumn-golden', date: '10-15', moment: 'golden', label: 'autumn golden hour' },
  { key: 'winter-night', date: '01-15', moment: 'night', label: 'winter night' },
]);
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The ISO time of a moment key at the spec's place (the solar noon, golden hour or night of that date). */
export function factoryMomentAt(spec, key) {
  const m = FACTORY_MOMENTS.find(x => x.key === key);
  if (!m) return key;   // already a time
  const hit = worldMomentsOf(spec, [m.date]).find(x => x.moment === m.moment);
  return hit ? hit.at : null;
}

/**
 * Render scenes at moments. One page load a scene (the 30 MB app parses once), then a re-light per moment (no reload).
 * A cached PNG (o.cache) newer than o.since (ms) is reused: the gold renders of a review sheet are drawn once.
 */
export async function renderWorlds(chrome, list, o = {}) {
  const dir = o.dir, moments = o.moments || ['summer-noon'], out = [];
  mkdirSync(dir, { recursive: true });
  for (const sc of list) {
    let page = null;
    for (const key of moments) {
      const file = join(dir, `${fileSafe(sc.id)}--${fileSafe(key)}.png`);
      const cell = { id: sc.id, moment: key, file, ms: 0, error: null, cached: false };
      if (o.cache && existsSync(file) && statSync(file).mtimeMs > (o.since || 0)) { cell.cached = true; out.push(cell); if (o.onCell) o.onCell(cell); continue; }
      const t0 = Date.now();
      try {
        const at = factoryMomentAt(sc.spec, key);
        if (!page) page = await worldPageOpen(chrome, { spec: sc.spec, id: sc.id }, { size: WORLD_SIZES['16:9'], at, root: o.root });
        else await page.set({ at, wx: null });
        writeFileSync(file, await page.png());
      } catch (e) { cell.error = String(e && e.message || e).slice(0, 300); }
      cell.ms = Date.now() - t0;
      out.push(cell);
      if (o.onCell) o.onCell(cell);
    }
  }
  return out;
}

/**
 * A contact sheet. tiles: [{ file, title, lines: [string], bad, group }] laid out o.cols a row, each tile o.thumb wide (16:9), its
 * title and its note lines under it (a 'bad' tile is captioned in red). o: { title, cols, thumb, notes, mark: { [title]: 'gold' } }.
 */
export async function contactSheet(chrome, tiles, o = {}) {
  const cols = o.cols || 4, w = o.thumb || 400, h = Math.round(w * 9 / 16);
  let html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:12px;background:#15181e;color:#e8ecf2;font:12px system-ui,sans-serif}
h1{font-size:16px;margin:0 0 4px}.sub{opacity:.75;margin:0 0 10px}.g{display:grid;grid-template-columns:repeat(${cols},${w}px);gap:10px 8px;align-items:start}
figure{margin:0}img{display:block;width:${w}px;height:${h}px;object-fit:cover;background:#000;border:2px solid transparent;box-sizing:border-box}
.gold img{border-color:#e6c25a}.bad img{border-color:#d24b4b}.ok img{border-color:#4fae6a}
figcaption{padding:3px 0 0;line-height:1.3}.t{font-weight:650}.bad .t{color:#ff9b9b}.gold .t{color:#f3d77e}.ok .t{color:#9fe0ae}.l{opacity:.82;font-size:11px}
.grp{grid-column:1/-1;font-weight:700;font-size:13px;margin:6px 0 0;border-bottom:1px solid #333;padding-bottom:2px}
ul{margin:12px 0 0;padding-left:18px;max-width:${cols * (w + 8)}px}li{margin:2px 0}</style></head><body><h1>${esc(o.title || 'contact sheet')}</h1>${o.sub ? `<div class="sub">${esc(o.sub)}</div>` : ''}<div class="g">`;
  let grp = null;
  for (const t of tiles) {
    if (t.group && t.group !== grp) { grp = t.group; html += `<div class="grp">${esc(grp)}</div>`; }
    const cls = t.cls || (t.bad ? 'bad' : '');
    html += `<figure class="${cls}">${t.file && existsSync(t.file) ? `<img src="${pathToFileURL(t.file).href}">` : `<div style="width:${w}px;height:${h}px;background:#300;display:flex;align-items:center;justify-content:center">no render</div>`}`
      + `<figcaption><div class="t">${esc(t.title || '')}</div>${(t.lines || []).map(l => `<div class="l">${esc(l)}</div>`).join('')}</figcaption></figure>`;
  }
  html += '</div>';
  if (o.notes && o.notes.length) html += `<ul>${o.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`;
  html += '</body></html>';
  return chrome.screenshot({ html, width: 24 + cols * (w + 8), height: 'auto', transparent: false });
}
