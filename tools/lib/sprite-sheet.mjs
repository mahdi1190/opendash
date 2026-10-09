// The object SPRITE-SHEET template and its importer (docs/dev/OBJECT_IMPORT.md, "Sprite sheets"). Node >= 20, no dependencies.
// An AI image tool (Gemini, ChatGPT) draws ONE image per object that fills this exact grid; `object import-sheet` slices it.
//
//   SHEET                          the template: cell 256 x 256 px, gutters 32 px, margins (top 56, left 112, right 32, bottom 32),
//                                  6 columns spring | summer | autumn | winter | night | lit (at dusk, windows and lamps on),
//                                  one row per variant, then an optional FRAMES row (2 to 6 animation frames, summer look),
//                                  a flat #FF00FF background (or a transparent one), the object standing on the cell's
//                                  baseline (16 px above the cell's bottom), centred, no labels, no grid lines, no text
//   sheetSize(rows, frames)        -> { width, height }      cellRect(row, col) -> [x, y, w, h]
//   templateHtml(rows, frames, { labels, cells })  the page that draws the template (labels in the margins) or an example
//   sliceSheet(img, { rows, frames })  -> { rows: [[cell | null x 6]], frames: [cell], bg, notes }
//        cell = { img (trimmed RGBA), box: [x0, y0, x1, y1] in the sheet, area }. It finds the background (transparency, else the
//        border's flat colour, removed globally for a chroma key and by flood fill otherwise), the marks (connected components;
//        specks dropped), the row bands from the marks' vertical extents (label-sized bands dropped, merged or split to the
//        expected count), then per row the column groups the same way, assigned to the column centres of the complete rows,
//        so a slightly misaligned or missing cell lands in the right column
//   alignSheet(sliced)             -> { rows: [{ spring, ..., lit }], frames: [img], size: [w, h], scale, report }
//        every cell of a row scaled to the row's reference (summer) height when within 20 %, placed bottom-centre on one canvas,
//        then shifted (at most 4 % of the size) to the best mask overlap with the reference; the frames use row 0's canvas
//   lintSheet(sliced, aligned, { category })  -> [{ severity: 'fail' | 'warn', row, col, rule, message }]: a missing cell, size drift, position
//        drift, a cell whose shape differs from the reference, too few frames
import { removeBackground, borderColour, alphaStats, isChroma, crop, resize, blank, paste, trimBox, alignOffset, shift, maskIou } from './raster-image.mjs';

export const SHEET = Object.freeze({
  cell: 256, gutter: 32, margin: Object.freeze({ top: 56, left: 112, right: 32, bottom: 32 }), baseline: 16,
  columns: Object.freeze(['spring', 'summer', 'autumn', 'winter', 'night', 'lit']), background: '#ff00ff', maxFrames: 6,
});
export function sheetSize(rows, frames = 0) {
  const R = rows + (frames ? 1 : 0), C = SHEET.columns.length, { cell, gutter, margin } = SHEET;
  return { width: margin.left + C * cell + (C - 1) * gutter + margin.right, height: margin.top + R * cell + (R - 1) * gutter + margin.bottom };
}
export function cellRect(row, col) {
  const { cell, gutter, margin } = SHEET;
  return [margin.left + col * (cell + gutter), margin.top + row * (cell + gutter), cell, cell];
}
const escH = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/**
 * The page of a template or an example sheet. labels: draw the column and row labels in the margins and the cell outlines
 * (the blank template); cells: { 'r,c': '<svg ...>' } markup placed in a cell (an example). The page is exactly the sheet size.
 */
export function templateHtml(rows, frames = 0, { labels = true, cells = {}, title = '' } = {}) {
  const { width, height } = sheetSize(rows, frames), { cell, baseline, margin } = SHEET;
  let body = '';
  const R = rows + (frames ? 1 : 0);
  for (let r = 0; r < R; r++) {
    const isFrames = frames && r === rows, C = isFrames ? frames : SHEET.columns.length;
    for (let c = 0; c < C; c++) {
      const [x, y] = cellRect(r, c), k = `${r},${c}`;
      if (labels) body += `<div class="cell" style="left:${x}px;top:${y}px"><div class="base" style="top:${cell - baseline}px"></div><div class="mid"></div></div>`;
      if (cells[k]) body += `<div class="art" style="left:${x}px;top:${y}px">${cells[k]}</div>`;
    }
    if (labels) body += `<div class="rl" style="top:${cellRect(r, 0)[1] + cell / 2 - 18}px">${isFrames ? 'frames<br><small>(summer, in motion)</small>' : `variant ${r + 1}`}</div>`;
  }
  if (labels) SHEET.columns.forEach((name, c) => { body += `<div class="cl" style="left:${cellRect(0, c)[0]}px">${escH(name === 'lit' ? 'lit (dusk, lights on)' : name)}</div>`; });
  if (labels && title) body += `<div class="tt">${escH(title)}</div>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;width:${width}px;height:${height}px;overflow:hidden;background:${SHEET.background}}
.cell{position:absolute;width:${cell - 2}px;height:${cell - 2}px;border:1px dashed rgba(255,255,255,.75)}
.base{position:absolute;left:0;right:0;height:0;border-top:2px solid rgba(255,255,255,.9)}
.mid{position:absolute;left:${cell / 2 - 1}px;top:${cell * 0.55}px;width:0;height:${cell * 0.45 - baseline}px;border-left:1px dotted rgba(255,255,255,.8)}
.art{position:absolute;width:${cell}px;height:${cell}px}.art svg{display:block}
.cl{position:absolute;top:${margin.top - 30}px;width:${cell}px;text-align:center;font:600 17px system-ui,sans-serif;color:#fff}
.rl{position:absolute;left:8px;width:${margin.left - 16}px;font:600 15px system-ui,sans-serif;color:#fff;line-height:1.2}
.rl small{font-weight:400;font-size:11px}
.tt{position:absolute;left:8px;top:6px;font:600 13px system-ui,sans-serif;color:#fff}
</style></head><body>${body}</body></html>`;
}

/* ---------- slicing ---------- */
/** Label every connected mark (4-neighbour) of a mask: { labels: Int32Array, comps: [{ id, n, x0, y0, x1, y1 }] }. */
function label(mask, W, H) {
  const labels = new Int32Array(W * H), comps = [];
  let id = 0;
  const st = new Int32Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!mask[s] || labels[s]) continue;
    id++;
    let top = 0; st[top++] = s; labels[s] = id;
    const c = { id, n: 0, x0: W, y0: H, x1: 0, y1: 0 };
    while (top) {
      const p = st[--top], x = p % W, y = (p / W) | 0;
      c.n++;
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      if (x > 0 && mask[p - 1] && !labels[p - 1]) { labels[p - 1] = id; st[top++] = p - 1; }
      if (x < W - 1 && mask[p + 1] && !labels[p + 1]) { labels[p + 1] = id; st[top++] = p + 1; }
      if (y > 0 && mask[p - W] && !labels[p - W]) { labels[p - W] = id; st[top++] = p - W; }
      if (y < H - 1 && mask[p + W] && !labels[p + W]) { labels[p + W] = id; st[top++] = p + W; }
    }
    comps.push(c);
  }
  return { labels, comps };
}
/** Group intervals [a, b, weight, item] into bands (overlapping or within `gap`): [{ a, b, w, items }]. */
function bands(list, gap) {
  const s = list.slice().sort((p, q) => p[0] - q[0]), out = [];
  for (const [a, b, w, it] of s) {
    const last = out[out.length - 1];
    if (last && a <= last.b + gap) { last.b = Math.max(last.b, b); last.w += w; last.items.push(it); }
    else out.push({ a, b, w, items: [it] });
  }
  return out;
}
/** Bring a band list to n bands: merge the closest neighbours, or split the widest band at its emptiest line (profile). */
function toCount(bs, n, profile) {
  bs = bs.map(b => ({ ...b, items: b.items.slice() }));
  while (bs.length > n && bs.length > 1) {
    let k = 0, best = Infinity;
    for (let i = 0; i < bs.length - 1; i++) { const g = bs[i + 1].a - bs[i].b; if (g < best) { best = g; k = i; } }
    const a = bs[k], b = bs[k + 1];
    bs.splice(k, 2, { a: a.a, b: Math.max(a.b, b.b), w: a.w + b.w, items: a.items.concat(b.items), merged: true });
  }
  let guard = 0;
  while (bs.length < n && guard++ < 12 && profile) {
    let k = 0;
    for (let i = 1; i < bs.length; i++) if (bs[i].b - bs[i].a > bs[k].b - bs[k].a) k = i;
    const b = bs[k], lo = b.a + Math.round((b.b - b.a) * 0.25), hi = b.b - Math.round((b.b - b.a) * 0.25);
    let cut = -1, min = Infinity;
    for (let y = lo; y <= hi; y++) if (profile[y] < min) { min = profile[y]; cut = y; }
    if (cut < 0 || hi - lo < 4) break;
    bs.splice(k, 1, { a: b.a, b: cut, w: b.w / 2, items: [], split: true }, { a: cut + 1, b: b.b, w: b.w / 2, items: [], split: true });
  }
  return bs;
}
export function sliceSheet(img, { rows, frames = null } = {}) {
  if (!(rows >= 1 && rows <= 16)) throw new Error('import-sheet needs --rows N: the number of variant rows (1 to 16), not counting the frames row');
  const { width: W, height: H } = img, notes = [];
  const st = alphaStats(img);
  let clean, bg;
  if (st.transparent > 0.2) { clean = img; bg = 'transparent'; }
  else {
    const bc = borderColour(img);
    if (!bc.rgb || bc.share < 0.6) throw new Error(`the sheet has no transparent or flat background (the border's commonest colour covers only ${Math.round((bc.share || 0) * 100)} % of it): ask for a flat #FF00FF background`);
    clean = removeBackground(img, { rgb: bc.rgb, tol: 60, soft: 40, mode: isChroma(bc.rgb) ? 'global' : 'flood' });
    bg = '#' + bc.rgb.map(v => v.toString(16).padStart(2, '0')).join('');
  }
  const mask = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) if (clean.data[p * 4 + 3] > 40) mask[p] = 1;
  const { labels, comps: all } = label(mask, W, H);
  const cellGuess = Math.min(W / SHEET.columns.length, H / (rows + (frames ? 1 : 0))) * 0.8;
  const speck = Math.max(6, cellGuess * cellGuess * 0.0008);
  const comps = all.filter(c => c.n >= speck);
  if (!comps.length) throw new Error('the sheet is empty: no marks found on the background');
  // rows: the marks' vertical extents; bands far smaller than the largest are labels or stray marks
  let rb = bands(comps.map(c => [c.y0, c.y1, c.n, c]), Math.max(2, Math.round(cellGuess * 0.02)));
  const maxW = Math.max(...rb.map(b => b.w));
  const small = rb.filter(b => b.w < maxW * 0.06);
  if (small.length) notes.push(`${small.length} small mark band(s) ignored (labels or specks)`);
  rb = rb.filter(b => b.w >= maxW * 0.06);
  const wantFrames = frames == null ? (rb.length >= rows + 1 ? 1 : 0) : (frames ? 1 : 0);
  const R = rows + wantFrames;
  const yprof = new Float32Array(H);
  for (let p = 0; p < W * H; p++) if (mask[p]) yprof[(p / W) | 0]++;
  if (rb.length !== R) notes.push(`found ${rb.length} row band(s) for ${R} row(s): ${rb.length > R ? 'merged the closest' : 'split the tallest'}`);
  rb = toCount(rb, R, yprof);
  // each component belongs to the row band its centre falls in (bands widened to the midpoints between them)
  const rowOf = (c) => { const cy = (c.y0 + c.y1) / 2; let k = 0, best = Infinity; rb.forEach((b, i) => { const d = cy < b.a ? b.a - cy : cy > b.b ? cy - b.b : 0; if (d < best) { best = d; k = i; } }); return k; };
  const perRow = rb.map(() => []);
  for (const c of comps) perRow[rowOf(c)].push(c);
  const C = SHEET.columns.length;
  const groupsOf = (list, n) => {
    let g = bands(list.map(c => [c.x0, c.x1, c.n, c]), Math.max(2, Math.round(cellGuess * 0.02)));
    const mx = Math.max(1, ...g.map(b => b.w));
    g = g.filter(b => b.w >= mx * 0.04);
    if (n && g.length > n) g = toCount(g, n, null);
    return g;
  };
  // the column centres, from the variant rows that have all six groups (else six equal parts of the marks' width)
  const full = [];
  for (let r = 0; r < rows; r++) { const g = groupsOf(perRow[r], C); if (g.length === C) full.push(g.map(b => (b.a + b.b) / 2)); }
  let centres;
  if (full.length) centres = Array.from({ length: C }, (_, i) => full.reduce((n, f) => n + f[i], 0) / full.length);
  else {
    const x0 = Math.min(...comps.map(c => c.x0)), x1 = Math.max(...comps.map(c => c.x1)), w = (x1 - x0) / C;
    centres = Array.from({ length: C }, (_, i) => x0 + w * (i + 0.5));
    notes.push('no row had all six cells: the columns were placed by dividing the marks\' width in six');
  }
  const cellFrom = (items) => {
    const ids = new Set(items.map(c => c.id));
    const x0 = Math.min(...items.map(c => c.x0)), y0 = Math.min(...items.map(c => c.y0)), x1 = Math.max(...items.map(c => c.x1)) + 1, y1 = Math.max(...items.map(c => c.y1)) + 1;
    const out = crop(clean, x0, y0, x1 - x0, y1 - y0);
    // only this cell's marks (a neighbour's stray edge inside the box is cleared)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (!ids.has(labels[y * W + x])) out.data[((y - y0) * (x1 - x0) + (x - x0)) * 4 + 3] = 0;
    return { img: out, box: [x0, y0, x1, y1], area: items.reduce((n, c) => n + c.n, 0) };
  };
  const out = { rows: [], frames: [], bg, notes, centres: centres.map(Math.round), rowBands: rb.map(b => [b.a, b.b]) };
  for (let r = 0; r < rows; r++) {
    const cells = new Array(C).fill(null), g = groupsOf(perRow[r], 0);
    const byCol = Array.from({ length: C }, () => []);
    for (const b of g) {
      const cx = (b.a + b.b) / 2;
      let k = 0;
      centres.forEach((c, i) => { if (Math.abs(c - cx) < Math.abs(centres[k] - cx)) k = i; });
      byCol[k].push(...b.items);
    }
    byCol.forEach((items, k) => { if (items.length) cells[k] = cellFrom(items); });
    out.rows.push(cells);
  }
  if (wantFrames) {
    const g = groupsOf(perRow[rows], frames || SHEET.maxFrames);
    out.frames = g.map(b => cellFrom(b.items));
  }
  return out;
}

/* ---------- alignment ---------- */
const REF_ORDER = ['summer', 'spring', 'autumn', 'winter', 'lit', 'night'];
export function alignSheet(sliced) {
  const C = SHEET.columns, report = [];
  const rows = sliced.rows.map((cells, r) => {
    const named = Object.fromEntries(C.map((n, i) => [n, cells[i]]));
    const refName = REF_ORDER.find(n => named[n]);
    if (!refName) return null;
    const ref = named[refName];
    const refH = ref.img.height;
    const scaled = {};
    for (const n of C) {
      const c = named[n];
      if (!c) continue;
      const ratio = refH / c.img.height;
      const s = Math.abs(1 - ratio) <= 0.2 ? ratio : 1;
      scaled[n] = { img: s === 1 ? c.img : resize(c.img, c.img.width * s, c.img.height * s), s, ratio };
    }
    return { refName, scaled };
  });
  // one canvas for every row (the widest and tallest cell, plus 4 %), so variants share a size and an anchor
  let cw = 0, ch = 0;
  for (const row of rows) if (row) for (const n of Object.keys(row.scaled)) { cw = Math.max(cw, row.scaled[n].img.width); ch = Math.max(ch, row.scaled[n].img.height); }
  const frames0 = (sliced.frames || []).map(f => f.img);
  const r0 = rows.find(Boolean);
  const fScale = r0 ? r0.scaled[r0.refName].img.height / Math.max(1, ...frames0.map(f => f.height)) : 1;
  const framesScaled = frames0.map(f => (Math.abs(1 - fScale) <= 0.25 ? resize(f, f.width * fScale, f.height * fScale) : f));
  for (const f of framesScaled) { cw = Math.max(cw, f.width); ch = Math.max(ch, f.height); }
  cw = Math.ceil(cw * 1.04); ch = Math.ceil(ch * 1.02);
  const place = (img) => paste(blank(cw, ch), img, Math.round((cw - img.width) / 2), ch - img.height);
  const maxShift = Math.max(2, Math.round(Math.max(cw, ch) * 0.04));
  const outRows = rows.map((row, r) => {
    if (!row) return null;
    const ref = place(row.scaled[row.refName].img), o = {};
    for (const n of C) {
      if (!row.scaled[n]) continue;
      let im = place(row.scaled[n].img);
      if (n !== row.refName) {
        const a = alignOffset(ref, im, maxShift);
        if (a.dx || a.dy) im = shift(im, a.dx, a.dy);
        report.push({ row: r, col: n, dx: a.dx, dy: a.dy, iou: a.iou, scale: Math.round(row.scaled[n].s * 1000) / 1000, ratio: Math.round(row.scaled[n].ratio * 1000) / 1000 });
      }
      o[n] = im;
    }
    o.$ref = row.refName;
    return o;
  });
  const frames = framesScaled.map(place);
  return { rows: outRows, frames, size: [cw, ch], report };
}

/* ---------- the consistency lint ---------- */
export function lintSheet(sliced, aligned, { category = '' } = {}) {
  // trees and plants lose their leaves: a bare winter (or a thin autumn) outline is expected to differ from the summer one
  const bare = (col) => ['tree', 'plant'].includes(category) && (col === 'winter' || col === 'autumn');
  const C = SHEET.columns, out = [];
  const add = (severity, row, col, rule, message) => out.push({ severity, row, col, rule, message });
  sliced.rows.forEach((cells, r) => {
    const named = Object.fromEntries(C.map((n, i) => [n, cells[i]]));
    if (!named.summer && !named.spring && !named.autumn && !named.winter) add('fail', r, 'summer', 'missing', `variant ${r + 1}: no season cell at all (the summer cell is the base image)`);
    else if (!named.summer) add('warn', r, 'summer', 'missing', `variant ${r + 1}: no summer cell: the ${aligned.rows[r] ? aligned.rows[r].$ref : 'first'} cell becomes the base`);
    for (const n of ['spring', 'autumn', 'winter']) if (!named[n]) add('warn', r, n, 'missing', `variant ${r + 1}: no ${n} cell: it will be DERIVED (a colour matrix${n === 'winter' ? ' and a snow cap' : ''})`);
    if (!named.night) add('warn', r, 'night', 'missing', `variant ${r + 1}: no night cell: the live grade darkens the base at night`);
    if (!named.lit) add('warn', r, 'lit', 'missing', `variant ${r + 1}: no lit cell: lit windows are auto-detected (buildings, vehicles, boats, structures, landmarks)`);
    // size drift (raw heights against the row's median) and position drift (bottoms and centres in the row band and column)
    const present = C.map((n, i) => [n, cells[i]]).filter(([, c]) => c);
    if (present.length >= 2) {
      const hs = present.map(([, c]) => c.img.height).sort((a, b) => a - b), med = hs[Math.floor(hs.length / 2)];
      for (const [n, c] of present) {
        const d = c.img.height / med - 1;
        if (Math.abs(d) > 0.2) add('fail', r, n, 'size', `variant ${r + 1} ${n}: ${Math.round(d * 100)} % taller than the row (more than 20 %: not normalised; redraw it at the same size)`);
        else if (Math.abs(d) > 0.08) add('warn', r, n, 'size', `variant ${r + 1} ${n}: ${d > 0 ? '+' : ''}${Math.round(d * 100)} % height drift (normalised to the reference)`);
      }
      const bottoms = present.map(([, c]) => c.box[3]), cell = SHEET.cell;
      const spread = Math.max(...bottoms) - Math.min(...bottoms);
      if (spread > cell * 0.06) add('warn', r, '*', 'position', `variant ${r + 1}: the objects stand at different heights (bottoms differ by ${spread} px): aligned to one baseline`);
    }
  });
  if (aligned) for (const a of aligned.report) {
    if (bare(a.col)) { if (a.iou < 0.12) add('warn', a.row, a.col, 'shape', `variant ${a.row + 1} ${a.col}: its outline overlaps the reference only ${Math.round(a.iou * 100)} %, even for a bare tree`); }
    else if (a.iou < 0.55 && a.col !== 'lit' && a.col !== 'night') add('warn', a.row, a.col, 'shape', `variant ${a.row + 1} ${a.col}: its outline overlaps the reference only ${Math.round(a.iou * 100)} %: is it the same object, the same view?`);
    else if (a.iou < 0.45) add('warn', a.row, a.col, 'shape', `variant ${a.row + 1} ${a.col}: its outline overlaps the reference only ${Math.round(a.iou * 100)} %`);
  }
  if (sliced.frames && sliced.frames.length === 1) add('fail', 'frames', '*', 'frames', 'the frames row has 1 frame: an animation needs 2 to 6');
  if (sliced.frames && sliced.frames.length > SHEET.maxFrames) add('fail', 'frames', '*', 'frames', `the frames row has ${sliced.frames.length} frames: at most ${SHEET.maxFrames}`);
  return out;
}
export { maskIou, trimBox };
