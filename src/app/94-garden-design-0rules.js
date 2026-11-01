/* ============================================================
   GARDEN DESIGNER, the rules (no DOM: the friends' server and the assistant's engine read this file too). The owner, 1 Nov 2026:
   "be able to customize everything, add our own decorations, paths, move stuff around, customize where things are like shops,
   among the plaza etc", "doing our own garden design and plotting stuff".

   A DESIGN {p, g, m, c} is the same on disk and on the wire, and holds no names but what you wrote on a sign:
     p  paths: [style, x, y, dx, dy, dx, dy...], tenths of a cell, each point after the first as the step from the last one
     g  ground: [style, start, length, start, length...], cells numbered row by row
     m  fixed things moved: [id, x, y, door dx, door dy]. Only rows that differ from the table
     c  things you made: [kind, x, y, colour a, colour b, pattern or pose, words]. Words only on a sign, at most GDZ_LIMITS.text

   THE GARDEN ON SCREEN. Like gardenLandSet, one design is on screen at a time (yours, your draft, or the friend's you are visiting), and gardenDesignShow
   puts it there: it moves the rows of GARDEN_PROPS and the land's tables themselves, so everything that reads a row (the walls, the doors, the clicks, the
   drawings, the fading) follows without knowing about designs. Friends: gardenDesignClean, GARDEN_SCHEMA `dz` in lib/friends/garden.mjs, GARDEN_TOGETHER.md section 24.
   Saved at g.dz: {cur: id, lay: {id: {n: name, d: design}}}. A friend's design is only ever held in memory: it never goes in g.

   NOTHING AT THE TOP OF THIS FILE RUNS ANYTHING: 94-garden-lands-* sort after it, so every table of theirs is read inside a function, and the shared state lives on a function so no call can meet a const too early.
   Style numbers are what goes on the wire: add rows at the end, never reorder or reuse one.
   ============================================================ */
const GDZ_LIMITS = Object.freeze({ paths: 40, pts: 60, paint: 900, moved: 130, made: 24, layouts: 4, text: 24, wire: 6000, door: 6 });

/* earn: what opens it. `rw` is the row of GR_DESIGN it goes with (docs/dev/REWARDS.md): when that table is in the build, gardenDesignRows decides, and otherwise `open` here says the same thing. No earn: free. */
const _gdzE = (says, open, rw) => Object.freeze({ says, open, rw: rw || '' });
/* layers: [colour, width, dash, cap], drawn in order along one line */
const GDZ_PATHS = Object.freeze([
  { id: 'stone', name: 'Flagstones', layers: [['#8d8677', 27], ['#c9c2b1', 23, '15 3', 'butt']] },
  { id: 'cobble', name: 'Cobbles', layers: [['#77726a', 25], ['#aaa59a', 21, '6 3', 'butt'], ['#c2bdb2', 7, '5 7', 'round']] },
  { id: 'plank', name: 'Planks', layers: [['#5e4128', 28, '', 'butt'], ['#a67c4e', 26, '10 2', 'butt']] },
  { id: 'step', name: 'Stepping stones', layers: [['#7f7a6e', 19, '0.1 31', 'round'], ['#c4beb0', 16, '0.1 31', 'round']] },
  { id: 'gravel', name: 'Gravel', layers: [['#b4a88f', 25], ['#cfc5ad', 23, '2 3', 'butt']] },
  { id: 'bark', name: 'Bark', layers: [['#5a3f28', 25], ['#7c5a3a', 22, '4 5', 'butt']] },
  { id: 'sleeper', name: 'Old sleepers', earn: _gdzE('Own 3 pieces of land', c => c.sections >= 3, 'rw-path-sleeper'), layers: [['#3d3128', 30, '', 'butt'], ['#6b5a48', 28, '13 4', 'butt']] },
  { id: 'brick', name: 'Red brick', earn: _gdzE('Finish 25 tasks', c => c.tasks >= 25), layers: [['#7a3f2c', 26], ['#b5614a', 24, '9 2', 'butt']] },
  { id: 'shell', name: 'Shell path', earn: _gdzE('Catch 10 kinds of fish', c => c.fish >= 10, 'rw-path-shell'), layers: [['#d7cdb8', 25], ['#f2ecdf', 22, '3 4', 'butt']] },
  { id: 'moon', name: 'Moon stones', earn: _gdzE('Finish 100 tasks', c => c.tasks >= 100), layers: [['#4a5a78', 20, '0.1 30', 'round'], ['#c9d8ee', 16, '0.1 30', 'round']] },
].map(Object.freeze));
/* area: on the mown green, plants grow here as in that area of GARDEN_AREAS. dots: flecks on top, by colour. rows: lines of soil. */
const GDZ_GROUND = Object.freeze([
  { id: 'grass', name: 'Grass', c: '#7fb257' },
  { id: 'flowers', name: 'Flowers', c: '#86b862', dots: Object.freeze(['#f7d417', '#fbfbf6', '#e05a8a', '#8aa0e8']) },
  { id: 'bed', name: 'Flower bed', c: '#6b4a30', area: 'bed', rows: '#58391f' },
  { id: 'veg', name: 'Veg bed', c: '#5d4128', area: 'veg', rows: '#46301c' },
  { id: 'bark', name: 'Bark chips', c: '#6e4f33', dots: Object.freeze(['#8a6a48']) },
  { id: 'sand', name: 'Pale sand', c: '#e4d6ae', earn: _gdzE('Catch 10 kinds of bug', c => c.bugs >= 10, 'rw-ground-sand') },
  { id: 'moss', name: 'Moss', c: '#5f8a45', dots: Object.freeze(['#7ba85a']), earn: _gdzE('Own 8 pieces of land', c => c.sections >= 8, 'rw-ground-moss') },
  { id: 'clover', name: 'Clover lawn', c: '#6fa85c', dots: Object.freeze(['#e8e4f2']), earn: _gdzE('Win 1 ribbon', c => c.ribbons >= 1, 'rw-ground-clover') },
  { id: 'slate', name: 'Slate chips', c: '#6f7780', dots: Object.freeze(['#8a939c']), earn: _gdzE('Build 5 things on your land', c => c.built >= 5, 'rw-ground-slate') },
].map(Object.freeze));
const GDZ_COLOURS = Object.freeze([
  { n: 'Cream', c: '#f2e8cf' }, { n: 'Red', c: '#c8452f' }, { n: 'Yellow', c: '#eeb92e' }, { n: 'Green', c: '#4f8f46' }, { n: 'Blue', c: '#3f73b5' }, { n: 'Purple', c: '#7a4f9c' }, { n: 'Stone', c: '#a9a498' }, { n: 'Wood', c: '#8a6240' },
  { n: 'Gold', c: '#d9a520', earn: _gdzE('Finish 50 tasks', c => c.tasks >= 50) }, { n: 'Night blue', c: '#1f2d55', earn: _gdzE('Reach garden level 8', c => c.level >= 8) },
].map(Object.freeze));
const GDZ_MADE = Object.freeze([
  { id: 'sign', name: 'Sign', tall: 1.5 },
  { id: 'flag', name: 'Flag', tall: 2 },
  { id: 'statue', name: 'Statue', tall: 1.9, earn: _gdzE('Reach garden level 3', c => c.level >= 3) },
].map(Object.freeze));
const GDZ_FLAGS = Object.freeze([
  { id: 'plain', name: 'Plain' }, { id: 'stripes', name: 'Stripes' }, { id: 'cross', name: 'Cross' }, { id: 'split', name: 'Halves' },
  { id: 'dots', name: 'Dots', earn: _gdzE('Finish 10 tasks', c => c.tasks >= 10) }, { id: 'sun', name: 'Sun', earn: _gdzE('Catch 5 kinds of fish', c => c.fish >= 5) },
].map(Object.freeze));
/* arms in degrees from hanging straight down */
const GDZ_POSES = Object.freeze([
  { id: 'stand', name: 'Standing', a: Object.freeze([8, 8]) }, { id: 'wave', name: 'Waving', a: Object.freeze([10, 150]) }, { id: 'hurrah', name: 'Hurrah', a: Object.freeze([150, 150]) }, { id: 'point', name: 'Pointing', a: Object.freeze([10, 90]) },
  { id: 'fish', name: 'The big one', a: Object.freeze([90, 90]), earn: _gdzE('Catch 25 kinds of fish', c => c.fish >= 25) },
].map(Object.freeze));
/* Fixed things that stay: they are part of the water or the land itself. Everything else with a place on the map can be moved. */
const GDZ_FIXED = Object.freeze(['pier', 'pier-2', 'pier-3', 'boat', 'jetty-post', 'reed-bank', 'ld-bridge', 'ld-rope', 'ld-falls', 'ld-sunk', 'lf-maze', 'lf-lamps', 'land-finds']);

/** The state: on a function, so nothing that runs early can meet a const that is not there yet. */
function _gdzHold() { return _gdzHold.s || (_gdzHold.s = { rev: 0, sig: 'null', shown: null, base: null, rows: null, bed: new Map(), madeRows: [], draftOf: null, trim: null }); }
function gardenDesignRev() { return _gdzHold().rev; }
function gardenDesignShown() { return _gdzHold().shown; }
function gardenDesignBedAt(x, y) { const H = _gdzHold(); return H.bed.size ? H.bed.get(y * GARDEN_WORLD.cols + x) || '' : ''; }
function gardenDesignLandProps() { return _gdzHold().madeRows; }
function gardenDesignEmpty() { return { p: [], g: [], m: [], c: [] }; }
function _gdzIsEmpty(d) { return !d || !((d.p && d.p.length) || (d.g && d.g.length) || (d.m && d.m.length) || (d.c && d.c.length)); }

/* ---------- what can be moved ---------- */
function _gdzRows() {
  const H = _gdzHold();
  if (H.rows) return H.rows;
  const map = new Map(), base = new Map();
  const add = (r) => { if (r && r.x != null && !map.has(r.id)) { map.set(r.id, r); base.set(r.id, { x: r.x, y: r.y, door: r.door || null }); } };
  for (const r of GARDEN_PROPS) add(r);
  if (typeof GARDEN_LAND_OFFICE !== 'undefined') { add(GARDEN_LAND_OFFICE); add(GARDEN_LAND_FINDS); for (const r of GARDEN_LAND_SIGHTS) add(r); for (const r of GARDEN_LAND_FEATURES) add(r); }
  H.rows = map; H.base = base;
  return map;
}
function gardenDesignRow(id) { return _gdzRows().get(String(id)) || null; }
function gardenDesignBase(id) { _gdzRows(); return _gdzHold().base.get(String(id)) || null; }
function gardenDesignMovable(id) { const r = gardenDesignRow(id); return !!r && !GDZ_FIXED.includes(r.id); }

/* ---------- a friend's, or anybody's, checked ---------- */
/** Words as they may be shown: one short line with no control, direction or invisible marks. Set with textContent, always. */
function gardenDesignText(s) {
  if (typeof s !== 'string') return '';
  return (s.normalize ? s.normalize('NFC') : s).replace(/[\u0000-\u001f\u007f-\u00a0\u00ad\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, GDZ_LIMITS.text);
}
/** Everything a design may say, in bounds, or null when nothing is left. Called by gardenSnapshotClean and on anything read back from a save. */
function gardenDesignClean(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const L = GDZ_LIMITS, W = GARDEN_WORLD, N = W.cols * W.rows, int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null), out = gardenDesignEmpty();
  if (Array.isArray(raw.p)) for (const r of raw.p.slice(0, L.paths)) {
    if (!Array.isArray(r) || r.length < 5 || int(r[0], 0, 31) === null) continue;
    let x = 0, y = 0, n = 0; const row = [r[0]];
    for (let i = 1; i + 1 < r.length && n < L.pts; i += 2, n++) { const dx = int(r[i], -600, 600), dy = int(r[i + 1], -600, 600); if (dx === null || dy === null) break; x += dx; y += dy; if (x < 0 || y < 0 || x > W.cols * 10 || y > W.rows * 10) break; row.push(dx, dy); }
    if (row.length >= 5) out.p.push(row);
  }
  if (Array.isArray(raw.g)) { let left = L.paint; for (const r of raw.g.slice(0, 12)) {
    if (!Array.isArray(r) || int(r[0], 0, 31) === null) continue;
    const row = [r[0]];
    for (let i = 1; i + 1 < r.length && left > 0; i += 2) { const s = int(r[i], 0, N - 1), l = int(r[i + 1], 1, N); if (s === null || l === null || s + l > N) continue; const k = Math.min(l, left); row.push(s, k); left -= k; }
    if (row.length >= 3) out.g.push(row);
  } }
  if (Array.isArray(raw.m)) for (const r of raw.m.slice(0, L.moved)) {
    if (!Array.isArray(r) || typeof r[0] !== 'string' || !gardenDesignMovable(r[0])) continue;
    const x = int(r[1], 0, W.cols - 1), y = int(r[2], 0, W.rows - 1), dx = int(r[3], -L.door, L.door), dy = int(r[4], -L.door, L.door);
    if (x === null || y === null || dx === null || dy === null || out.m.some(q => q[0] === r[0])) continue;
    out.m.push([r[0], x, y, dx, dy]);
  }
  if (Array.isArray(raw.c)) for (const r of raw.c.slice(0, L.made)) {
    if (!Array.isArray(r)) continue;
    const k = int(r[0], 0, 15), x = int(r[1], 0, W.cols - 1), y = int(r[2], 0, W.rows - 1), a = int(r[3], 0, 31), b = int(r[4], 0, 31), pat = int(r[5], 0, 15);
    if (k === null || x === null || y === null || a === null || b === null || pat === null) continue;
    out.c.push([k, x, y, a, b, pat, k === 0 ? gardenDesignText(r[6]) : '']);
  }
  return _gdzIsEmpty(out) ? null : out;
}

/* ---------- putting one on screen ---------- */
/** Bring the rows of the world to this design (null: everything where the tables say). Cheap when nothing changed. */
function gardenDesignShow(d) {
  const H = _gdzHold(), sig = d ? JSON.stringify(d) : 'null';
  if (sig === H.sig) return false;
  const rows = _gdzRows();
  for (const [id, r] of rows) { const b = H.base.get(id); if (r.x !== b.x || r.y !== b.y) { r.x = b.x; r.y = b.y; if (b.door) r.door = b.door; } }
  H.bed = new Map(); H.madeRows = [];
  if (d) {
    for (const [id, x, y, dx, dy] of d.m || []) { const r = rows.get(id); if (!r) continue; r.x = x; r.y = y; if (r.door) r.door = Object.freeze({ x: x + dx, y: y + dy }); }
    for (const row of d.g || []) { const st = GDZ_GROUND[row[0]]; if (!st || !st.area) continue; for (let i = 1; i + 1 < row.length; i += 2) for (let c = row[i]; c < row[i] + row[i + 1]; c++) H.bed.set(c, st.area); }
    (d.c || []).forEach((c, i) => { const def = GDZ_MADE[c[0]]; if (def) H.madeRows.push({ id: gardenDesignMadeKey(c, i), name: def.id === 'sign' ? 'Your sign' : def.id === 'flag' ? 'Your flag' : 'Your statue', x: c[1], y: c[2], w: 1, h: 1, col: 'soft', walk: 0, tall: def.tall, dz: def.id }); });
  }
  H.sig = sig; H.shown = d || null; H.rev++;
  if (typeof gardenLandPropsReset === 'function') gardenLandPropsReset();
  return true;
}
/** A thing you made, by a key its drawing and its row share: it changes when the thing does, so the stage redraws just that. */
function gardenDesignMadeKey(c, i) { return 'dzc' + i + '-' + gardenHash(JSON.stringify(c)).toString(36); }
/** Your own saved design (the one in use), or null. */
function gardenDesignSaved(g) {
  const z = g && g.dz, l = z && z.lay && z.lay[z.cur];
  return l && l.d ? gardenDesignClean(l.d) : null;
}
/** What your own garden shows now: the draft while you are in the designer, else what is saved. */
function gardenDesignOwn(g) { const H = _gdzHold(); return H.draftOf ? H.draftOf() : gardenDesignSaved(g); }

/* ---------- what friends get ---------- */
/**
 * The design as it goes out, and what does not fit: {wire, dropped: {paths: [index in d.p], cells}}. What decides where you can walk (moved things) and what you made always goes;
 * ground goes first, then the newest paths. The designer shows what is left out, and says so.
 */
function gardenDesignWire(d) {
  if (_gdzIsEmpty(d)) return { wire: null, dropped: { paths: [], cells: 0 } };
  const wire = { p: d.p.slice(), g: d.g.slice(), m: d.m, c: d.c }, dropped = { paths: [], cells: 0 };
  const size = () => JSON.stringify(wire).length;
  while (size() > GDZ_LIMITS.wire && wire.g.length) { const r = wire.g.pop(); for (let i = 2; i < r.length; i += 2) dropped.cells += r[i]; }
  while (size() > GDZ_LIMITS.wire && wire.p.length) { wire.p.pop(); dropped.paths.push(wire.p.length); }
  return { wire, dropped };
}
function gardenDesignWireSaved() { try { return gardenDesignWire(gardenDesignSaved(_gdG())).wire; } catch (e) { return null; } }
/** The saved copy has less room than a live visit: before any decoration is left out, the design gives up its ground, then its paths. Says what went in _gdzHold().trim. */
function gardenDesignSnapTrim(body, limit) {
  const H = _gdzHold(); H.trim = null;
  if (!body || !body.dz || JSON.stringify(body).length <= limit) return body;
  const dz = body.dz = Object.assign({}, body.dz, { p: body.dz.p.slice(), g: body.dz.g.slice() }), t = { paths: 0, cells: 0 };
  while (JSON.stringify(body).length > limit && dz.g.length) { const r = dz.g.pop(); for (let i = 2; i < r.length; i += 2) t.cells += r[i]; }
  while (JSON.stringify(body).length > limit && dz.p.length) { dz.p.pop(); t.paths++; }
  H.trim = t;
  return body;
}

/* ---------- earning ---------- */
function gardenDesignCtx(m) {
  const g = _gdG();
  return { level: m.level.level, tasks: m.totalDone || 0, sections: GARDEN_LAND_SECTIONS.filter(s => m.areas.includes(s.id)).length, built: GARDEN_LAND_FEATURES.filter(f => gardenHas('feat:' + f.id) > 0).length, fish: Object.keys(g.fl || {}).length, bugs: Object.keys(g.bl || {}).length, ribbons: Object.keys(g.rib || {}).length };
}
/** Is this row (a style, a colour, a pattern) yours yet? `c` from gardenDesignCtx; `rw` from gardenDesignRows when that is in the build. */
function gardenDesignOpen(row, c, rw) {
  const e = row && row.earn; if (!e) return true;
  if (e.rw && rw) { const r = rw.find(q => q.id === e.rw); if (r) return !!r.isOpen; }
  return !!e.open(c);
}
