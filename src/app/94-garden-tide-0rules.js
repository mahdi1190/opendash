/* ============================================================
   THE TIDE (FUN-ROADMAP phase 2, "The tide comes in"). The rules, pure: nothing here touches the page at load, so Node can
   evaluate it with the layout (a small Node script can print a day's tide table and the shore's counts from it).

   A CLOCK, NOT A SIMULATION (the owner chose a simple tide): low water at 07:30 and 19:30, high water at 01:30 and 13:30, every
   day, in the garden owner's own time (a friend's screen uses the owner's time zone from the snapshot, as the light does). The
   real moon makes a big tide near full and new moon (it reaches higher, rarer things wash up) and a small one at half moon.

   THE AUTHORED COAST IS THE LOW-WATER LINE. The tide only ever covers the lower part of the beach band; walking, collision,
   routes, fishing water, the layout and saved gardens never change. At high water you paddle in shallow water over the lower
   sand; the drop-off at the authored coast keeps its line of breaking waves, so you can see why you stop.

   BY KIND, NEVER BY PLACE (rule 17). Tidal ground is every beach cell, plus the banks of any river that meets the sea. Rocky
   shore is tidal ground near a solid rock landform, near fallen masonry, or near a thing of a kind that stands on rock (the
   lighthouse); estuary ground is near a river mouth; sand is the rest. Paths, plazas and the layout's standing things stay dry
   (the water bends round them) unless their kind belongs in the water (a pier, a boat, a post, a rock). No names, no cells.

   EVERYTHING IS DERIVED from the clock, the moon, the layout and the garden's own number (the strand's seed), so a host and
   every friend see the same tide and the same glints with no messages.

     gardenTideNow(o?)        {level 0..1, reach px, line px, wet px, rising, low, w (the low water's number), kind, moon, ...}
     gardenTideTable(o?)      today's low and high waters, for the tide card
     gardenTideShore()        the shore table: per cell 0 none, 1 sand, 2 rocky, 3 estuary; stretches, boards, pools
     gardenTideField()        the flood height of every 6 px of the shore (built in short slices the first time it is asked)
     gardenTideH(x, y)        the flood height (px above low water) at a point in cells, or Infinity where no tide comes
     GARDEN_SHORE_FINDS       what the shore gives (shells, sea glass, driftwood, stones, the storm set)
     gardenTideFindDef(id) / gardenTideFindSvg(id, px)
     gardenTideScatter(w)     the glints of one low water
     gardenTideWire()         the snapshot's `ti`
     window.GardenTide        the facade the painters and the walk ask
   ============================================================ */
const GARDEN_TIDE = Object.freeze({
  lowMin: 450, period: 720,               // low water at 07:30 (and 12 hours on); high water half way between
  reach: Object.freeze({ small: 34, usual: 44, big: 58 }),   // px inland from the authored coast at high water
  lowLevel: 0.32,                         // below this the water is "low": about 05:15 to 09:45 and 17:15 to 21:45
  wetMin: 90,                             // the sand stays wet this long behind a falling tide
  estuaryK: 0.6,                          // a river's banks flood to this share of the reach, near its mouth
  rich: 3,                                // missed low waters make the next one richer, up to this
  px: 6,                                  // the flood field's step (world px)
  hMax: 80,                               // flood heights at or above this are never wet
  ramp: 2,                                // how steeply the ground rises towards a path or a standing thing (px of height a px)
});
// kinds of thing whose foot belongs in the water: the tide comes up round them (the rest keep their ground dry)
const GT_WET_FOOT = new Set(['pier', 'boat', 'post', 'lighthouse', 'scenery', 'person', 'bridge']);
const GT_WET_WORDS = /(^|-)(pier|jetty|boat|hull|wreck|buoy|groyne|post|angler|lighthouse|rock|boulder|stone)(-|$)/;
// the surfaces of a route that are shore themselves (the cold cove's shingle): the tide covers them like the sand
const GT_SHORE_SURFACE = new Set(['shingle', 'sand', 'beach']);
const _gtd = { lay: null, shore: null, field: null, job: null, now: null, nowKey: '', scatter: new Map(), storm: null };

/* ---------- the clock ---------- */
/** Minutes since 1970 on the garden's own clock: yours, or a friend's by their time zone's offset (minutes east of UTC). */
function gardenTideLocalMin(now, tz) {
  const t = Number.isFinite(now) ? now : _gtdNowMs();
  let off = 0;
  if (Number.isFinite(tz)) off = tz;
  else { try { off = typeof Clock !== 'undefined' ? Clock.offset(t) : -new Date(t).getTimezoneOffset(); } catch (e) { off = 0; } }   // clock-ok: the garden's own offset
  return t / 60000 + off;
}
function _gtdNowMs() { return typeof _gdNow === 'function' ? _gdNow() : Date.now(); }   // clock-ok: Node fallback
/** How high the water is: 0 at low water (07:30, 19:30), 1 at high water (01:30, 13:30). */
function gardenTideLevel(localMin) { return 0.5 - 0.5 * Math.cos(2 * Math.PI * (localMin - GARDEN_TIDE.lowMin) / GARDEN_TIDE.period); }
/** The low water's own number: each one owns the 12 hours centred on it (the seed of what it leaves on the sand). */
function gardenTideWindow(localMin) { return Math.floor((localMin - (GARDEN_TIDE.lowMin - GARDEN_TIDE.period / 2)) / GARDEN_TIDE.period); }
/** The local minute of window w's low water. */
function gardenTideWindowLow(w) { return w * GARDEN_TIDE.period + GARDEN_TIDE.lowMin; }
/** The moon's tide for a day: big near full and new moon, small at half moon. */
function gardenTideMoon(iso) {
  const SYN = 29.530588853;
  let age = 0; try { age = typeof wdMoonAge === 'function' ? wdMoonAge(iso) : ((Date.parse(iso + 'T12:00:00Z') - Date.UTC(2000, 0, 6, 18, 14)) / 86400000 % SYN + SYN) % SYN; } catch (e) { age = 0; }   // clock-ok: the age of the moon on an ISO day
  const k = Math.min(age, SYN - age, Math.abs(age - SYN / 2)), full = Math.abs(age - SYN / 2) < Math.min(age, SYN - age);
  const kind = k <= 1.5 ? 'big' : Math.abs(k - 7.4) <= 1.5 ? 'small' : 'usual';
  const words = kind === 'big' ? (full ? 'A big tide (full moon)' : 'A big tide (new moon)') : kind === 'small' ? 'A small tide (half moon)' : 'An ordinary tide';
  return { age, kind, full, words };
}
function _gtdIso(localMin) { const d = new Date(Math.floor(localMin / 1440) * 86400000); return d.toISOString().slice(0, 10); }   // clock-ok: a local day from local minutes
/** The tide at a moment. o: {now, tz} (a friend's garden: their offset). Cached for a second. */
function gardenTideNow(o) {
  o = o || {};
  const now = Number.isFinite(o.now) ? o.now : _gtdNowMs(), tz = Number.isFinite(o.tz) ? o.tz : o.own ? undefined : _gtdTz();
  const key = Math.floor(now / 1000) + '|' + (Number.isFinite(tz) ? tz : 'own');
  if (_gtd.now && _gtd.nowKey === key && !o.now) return _gtd.now;
  const lm = gardenTideLocalMin(now, tz), iso = _gtdIso(lm), moon = gardenTideMoon(iso), reach = GARDEN_TIDE.reach[moon.kind] || GARDEN_TIDE.reach.usual;
  const level = gardenTideLevel(lm), line = level * reach;
  let wet = line; for (let k = 1; k <= 6; k++) wet = Math.max(wet, gardenTideLevel(lm - k * GARDEN_TIDE.wetMin / 6) * reach);   // the highest the water stood in the last hour and a half
  const rising = gardenTideLevel(lm + 1) > level, w = gardenTideWindow(lm), phase = ((lm - GARDEN_TIDE.lowMin) % GARDEN_TIDE.period + GARDEN_TIDE.period) % GARDEN_TIDE.period;
  const nextLow = now + ((GARDEN_TIDE.period - phase) % GARDEN_TIDE.period) * 60000, nextHigh = now + (((GARDEN_TIDE.period / 2 - phase) % GARDEN_TIDE.period + GARDEN_TIDE.period) % GARDEN_TIDE.period) * 60000;
  const out = Object.freeze({ now, lm, iso, level, reach, line, wet, rising, low: level < GARDEN_TIDE.lowLevel, w, kind: moon.kind, moon, nextLow, nextHigh, tz });
  if (!o.now) { _gtd.now = out; _gtd.nowKey = key; }
  return out;
}
/** Whose clock the tide follows here: a friend's offset on a visit, else yours (undefined). */
function _gtdTz() {
  try { const m = typeof gardenVisitOn === 'function' && gardenVisitOn() && typeof gardenHere === 'function' ? gardenHere() : null; const s = m && m.visit && m.visit.snap; if (s && Number.isFinite(s.tz)) return s.tz; } catch (e) { /* your own */ }
  return undefined;
}
/** Today's tide for the tide card: the low and high waters (local minutes of the day) and what the water is doing now. */
function gardenTideTable(o) {
  const T = gardenTideNow(o), day0 = Math.floor(T.lm / 1440) * 1440, list = [];
  for (let k = -1; k <= 3; k++) { const low = (Math.floor(day0 / GARDEN_TIDE.period) + k) * GARDEN_TIDE.period + GARDEN_TIDE.lowMin; for (const [t, m] of [['low', low], ['high', low + GARDEN_TIDE.period / 2]]) if (m >= day0 && m < day0 + 1440) list.push({ t, min: m - day0 }); }
  list.sort((a, b) => a.min - b.min);
  const fmt = (min) => { const h = Math.floor(min / 60), mi = Math.round(min % 60); return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); };
  return { tide: T, list: list.map(r => Object.assign(r, { at: fmt(r.min) })), doing: T.low ? (T.rising ? 'The water is low and starting to come in.' : 'The water is low.') : T.level > 0.9 ? 'The water is high.' : T.rising ? 'The tide is coming in.' : 'The tide is going out.' };
}

/* ---------- the shore table: tidal ground by kind, from the layout's cells ---------- */
function _gtdLayKey() { try { return (typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.fingerprint) || 'v'; } catch (e) { return 'v'; } }
function _gtdRocky(form) { return !!form && form.col === 'full' && /rock|cliff|scarp|mountain|outcrop|stack/i.test((form.kind || '') + ' ' + (form.id || '')); }
function _gtdRuin(form) { return !!form && form.col === 'full' && /ruin/i.test((form.kind || '') + ' ' + (form.id || '')); }
/** The river mouths: any fresh water whose edge comes within 1.5 cells of the coast. [{id, x, y (cells), basin}] */
function _gtdMouths(D, W) {
  const out = [], seaNear = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const c = gardenIslandBaseCell(ix + dx, iy + dy); if (c && c.ocean) return true; } return false; };
  for (const f of D.freshwater || []) {
    if (!Array.isArray(f.boundary) || f.boundary.length < 3) continue;
    let best = null; for (let i = 0; i < f.boundary.length; i += 2) { const p = f.boundary[i]; if (!seaNear(p[0], p[1])) continue; const d = gardenIslandCoastDistance(p[0], p[1]); if (!best || d < best.d) best = { d, x: p[0], y: p[1] }; }
    if (best && best.d < 1.5 * W.cellW) out.push({ id: f.id, x: best.x, y: best.y, basin: f });
  }
  return out;
}
/** What stands on the shore and keeps its ground dry, and what may stand in the water, by kind. */
function _gtdThingKind(row) {
  try { if (typeof gardenKindOf === 'function') return gardenKindOf({ id: row.id, art: row.art || '', kind: row.kind || '' }) || ''; } catch (e) { /* by its words */ }
  return '';
}
function _gtdWetFoot(row) { const k = _gtdThingKind(row); return GT_WET_FOOT.has(k) || GT_WET_WORDS.test(String(row.id || '')) || GT_WET_WORDS.test(String(row.art || '')); }
function gardenTideShore() {
  const lay = _gtdLayKey();
  if (_gtd.shore && _gtd.shore.lay === lay) return _gtd.shore;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const W = GARDEN_WORLD, D = gardenIslandData(), N = W.cols * W.rows, cells = new Uint8Array(N), list = [];
  const forms = new Map((D.landforms || []).map(f => [f.id, f])), rock = new Uint8Array(N), ruin = new Uint8Array(N);
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) { const c = gardenIslandBaseCell(x, y), f = c && c.landformId ? forms.get(c.landformId) : null; if (!f) continue; if (_gtdRocky(f)) rock[y * W.cols + x] = 1; else if (_gtdRuin(f)) ruin[y * W.cols + x] = 1; }
  // things of a kind that stands on rock (any lighthouse): read when the kinds table is there (the page), else by the id's words (Node)
  const rockFeet = [];
  for (const s of D.static || []) {
    let on = false;
    try { const k = _gtdThingKind(s), K = k && typeof GARDEN_KINDS !== 'undefined' ? GARDEN_KINDS[k] : null; on = K ? !!K.rockFoot : /lighthouse/.test(s.id); } catch (e) { on = /lighthouse/.test(s.id); }
    if (on) rockFeet.push({ x: s.x + (s.w || 1) / 2, y: s.y + (s.h || 1) });
  }
  const mouths = _gtdMouths(D, W);
  const near = (mask, x, y, rx, ry, test) => { for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) { const qx = x + dx, qy = y + dy; if (qx < 0 || qy < 0 || qx >= W.cols || qy >= W.rows || !mask[qy * W.cols + qx]) continue; if (!test || test(dx, dy)) return true; } return false; };
  for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) {
    const c = gardenIslandBaseCell(x, y); if (!c || !c.land || c.freshwater || c.solid) continue;
    const cx = x + .5, cy = y + .5, mouth = mouths.find(m => Math.hypot(cx - m.x, (cy - m.y) * 1.3) < 6);
    // a river's bank near its mouth floods too, though it is not beach
    let bank = false; if (mouth && !c.beach) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const q = gardenIslandBaseCell(x + dx, y + dy); if (q && q.freshwater) { bank = true; break; } } }
    if (!c.beach && !bank) continue;
    const rocky = near(rock, x, y, 3, 3) || near(ruin, x, y, 3, 4, (dx, dy) => dx * dx + dy * dy <= 20.25) || rockFeet.some(p => Math.hypot(cx - p.x, (cy - p.y) * 1.3) < 3.2);
    const k = mouth ? 3 : rocky ? 2 : 1;
    cells[y * W.cols + x] = k; list.push({ x, y, k, zone: c.regionZone || 0, region: c.region || '' });
  }
  // connected stretches of tidal ground (four-way), each with its middle, for the tide cards
  const seen = new Int32Array(N).fill(-1), stretches = [];
  for (const s of list) {
    const i0 = s.y * W.cols + s.x; if (seen[i0] >= 0) continue;
    const id = stretches.length, q = [i0], members = []; seen[i0] = id;
    while (q.length) { const i = q.pop(), x = i % W.cols, y = (i - x) / W.cols; members.push(i); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const qx = x + dx, qy = y + dy; if (qx < 0 || qy < 0 || qx >= W.cols || qy >= W.rows) continue; const j = qy * W.cols + qx; if (cells[j] && seen[j] < 0) { seen[j] = id; q.push(j); } } }
    stretches.push({ id, cells: members, n: members.length });
  }
  _gtd.shore = { lay, cells, list, stretches, stretchOf: seen, mouths, rockFeet, ms: Math.round(((typeof performance !== 'undefined' ? performance.now() : 0) - t0) * 10) / 10, counts: { sand: list.filter(s => s.k === 1).length, rocky: list.filter(s => s.k === 2).length, estuary: list.filter(s => s.k === 3).length } };
  return _gtd.shore;
}
function gardenTideKindAt(x, y) { const S = gardenTideShore(), W = GARDEN_WORLD, ix = Math.floor(x), iy = Math.floor(y); if (ix < 0 || iy < 0 || ix >= W.cols || iy >= W.rows) return ''; return ['', 'sand', 'rocky', 'estuary'][S.cells[iy * W.cols + ix]] || ''; }

/* ---------- the flood field: how high each 6 px of the shore stands above low water ---------- */
/* H (Uint8): (height + 24) x 2, so -24..103 px; 255 dry land, 0 open sea. K (Uint8): 0 none, 1 sand, 2 rocky, 3 estuary.
 * Built once per layout, in slices of a few milliseconds (step(until)), from the coast's own outline: the distance inland from
 * the coast, the distance up a river bank near its mouth, and the ground rising towards a path, a plaza, a building's footing
 * or a solid landform (the water bends round them and never covers them). Nothing here re-bakes for the time of day. */
function _gtdSegBuckets(segs, W, margin) {
  const map = new Map();
  segs.forEach((s, i) => {
    const x0 = Math.floor((Math.min(s.ax, s.bx) - margin) / W.cellW), x1 = Math.floor((Math.max(s.ax, s.bx) + margin) / W.cellW);
    const y0 = Math.floor((Math.min(s.ay, s.by) - margin - W.sky) / W.cellH), y1 = Math.floor((Math.max(s.ay, s.by) + margin - W.sky) / W.cellH);
    for (let y = Math.max(-2, y0); y <= Math.min(W.rows + 1, y1); y++) for (let x = Math.max(-2, x0); x <= Math.min(W.cols + 1, x1); x++) { const k = y * 4096 + x; let l = map.get(k); if (!l) map.set(k, l = []); l.push(i); }
  });
  return map;
}
function _gtdSegDist(px, py, s) { const dx = s.bx - s.ax, dy = s.by - s.ay, t = Math.max(0, Math.min(1, ((px - s.ax) * dx + (py - s.ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - s.ax - dx * t, py - s.ay - dy * t); }
function _gtdLoopSegs(loop, W, cells, extra) { const out = [], pt = p => Array.isArray(p) ? { x: p[0], y: p[1] } : p; for (let i = 0; i < loop.length; i++) { const a = pt(loop[i]), b = pt(loop[(i + 1) % loop.length]); out.push(Object.assign({ ax: a.x * W.cellW, ay: W.sky + a.y * W.cellH, bx: b.x * W.cellW, by: W.sky + b.y * W.cellH }, extra || {})); } return out; }
function gardenTideField() {
  const lay = _gtdLayKey();
  if (_gtd.field && _gtd.field.lay === lay) return _gtd.field;
  if (_gtd.job && _gtd.job.lay === lay) return null;
  _gtd.job = _gtdFieldJob(lay);
  return null;
}
/** Work on the field for at most ms milliseconds now (the painter calls this between frames). True when it is ready. */
function gardenTideFieldStep(ms) {
  if (gardenTideField()) return true;
  const J = _gtd.job; if (!J) return false;
  const until = (typeof performance !== 'undefined' ? performance.now() : 0) + (ms || 4);
  let done = false; try { done = J.step(until); } catch (e) { J.error = String(e && e.stack || e); _gtd.job = null; return false; }
  if (done) { _gtd.field = J.out; _gtd.job = null; _gtd.scatter.clear(); }
  return done;
}
/** Build the field now, in one go (Node, and a page that needs it at once). */
function gardenTideFieldNow() { for (let i = 0; i < 4000 && !gardenTideFieldStep(50); i++) { /* slices */ } return _gtd.field; }
/** Fill a texel mask (value v) inside closed loops of cell points, by scanlines through each texel row's middle. */
function _gtdScanFill(loops, F, W, mask, v) {
  const P = F.P;
  for (let ty = F.y0 || 0; ty < (F.y1 == null ? F.FH : F.y1); ty++) {
    const wy = (ty + .5) * P, cy = (wy - W.sky) / W.cellH, xs = [];
    for (const loop of loops) for (let i = 0, j = loop.length - 1; i < loop.length; j = i++) { const a = loop[i], b = loop[j], ay = Array.isArray(a) ? a[1] : a.y, by = Array.isArray(b) ? b[1] : b.y, ax = Array.isArray(a) ? a[0] : a.x, bx = Array.isArray(b) ? b[0] : b.x; if ((ay > cy) !== (by > cy)) xs.push((bx - ax) * (cy - ay) / (by - ay) + ax); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const x0 = Math.max(0, Math.ceil(xs[k] * W.cellW / P - .5)), x1 = Math.min(F.FW - 1, Math.floor(xs[k + 1] * W.cellW / P - .5)); for (let x = x0; x <= x1; x++) mask[ty * F.FW + x] = v; }
  }
}
function _gtdCellBuckets(items, W, box) {
  const map = new Map();
  items.forEach((it, i) => { const b = box(it), x0 = Math.floor(b[0] / W.cellW), x1 = Math.floor(b[2] / W.cellW), y0 = Math.floor((b[1] - W.sky) / W.cellH), y1 = Math.floor((b[3] - W.sky) / W.cellH); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const k = y * 4096 + x; let l = map.get(k); if (!l) map.set(k, l = []); l.push(i); } });
  return map;
}
function _gtdFieldJob(lay) {
  const W = GARDEN_WORLD, D = gardenIslandData(), P = GARDEN_TIDE.px, FW = Math.ceil(W.cols * W.cellW / P), FH = Math.ceil((W.sky + W.rows * W.cellH) / P);
  const H = new Uint8Array(FW * FH), K = new Uint8Array(FW * FH), LAND = new Uint8Array(FW * FH), shore = gardenTideShore(), now = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  const J = { lay, out: null, error: null, ms: 0, step: null };
  let stage = 0, i = 0, cand = null, coast = null, cb = null, block = null, bb = null, rb = null, pb = null, want = null, nearWant = null;
  const rivers = [], polys = [], rects = [];
  const t0 = now();
  J.step = (until) => {
    if (stage === 0) {
      // the coast's own outline, texel by texel: land inside it, the open sea outside (a band of rows at a time)
      for (; i < FH; i += 32) { _gtdScanFill(gardenIslandGeometry().land, { P, FW, FH, y0: i, y1: Math.min(FH, i + 32) }, W, LAND, 1); if (now() > until) { i += 32; return false; } }
      i = 0; stage = .5; if (now() > until) return false;
    }
    if (stage === .5) {
      for (let k = 0; k < FW * FH; k++) H[k] = LAND[k] ? 255 : 0;
      for (let k = 0; k < FW * Math.ceil(W.sky / P) && k < H.length; k++) H[k] = 255;   // (the sky over the map's top edge)
      // the texels to measure: every tidal cell and the cells round it (the sea's margin and the dry ground behind)
      want = new Uint8Array(W.cols * W.rows);
      for (const s of shore.list) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = s.x + dx, y = s.y + dy; if (x >= 0 && y >= 0 && x < W.cols && y < W.rows) want[y * W.cols + x] = 1; }
      cand = []; for (let y = 0; y < W.rows; y++) for (let x = 0; x < W.cols; x++) if (want[y * W.cols + x]) cand.push(y * W.cols + x);
      const near = (s, m) => { const x0 = Math.max(0, Math.floor((Math.min(s.ax, s.bx) - m) / W.cellW)), x1 = Math.min(W.cols - 1, Math.floor((Math.max(s.ax, s.bx) + m) / W.cellW)), y0 = Math.max(0, Math.floor((Math.min(s.ay, s.by) - m - W.sky) / W.cellH)), y1 = Math.min(W.rows - 1, Math.floor((Math.max(s.ay, s.by) + m - W.sky) / W.cellH)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (want[y * W.cols + x]) return true; return false; };
      nearWant = near;
      coast = []; for (const loop of gardenIslandGeometry().land) for (const sg of _gtdLoopSegs(loop, W)) if (near(sg, GARDEN_TIDE.hMax + 8)) coast.push(sg);
      cb = _gtdSegBuckets(coast, W, GARDEN_TIDE.hMax + 8);
      stage = 1; if (now() > until) return false;
    }
    if (stage === 1) {
      // what keeps its ground dry: paths (their ribbon), plazas (their shape), the layout's standing things (their footprint and
      // apron) unless their kind stands in the water, and solid landforms (their outline)
      block = [];
      for (const r of D.routes || []) {
        if (!r.points || r.points.length < 2 || GT_SHORE_SURFACE.has(r.surface)) continue;
        const pts = gardenIslandRoutePath(r).points, hw = (x, y) => (typeof gardenIslandRouteWidthAt === 'function' ? gardenIslandRouteWidthAt(r, x, y) : r.widthCells || 2) * .5;
        for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], sg = { ax: a.x * W.cellW, ay: W.sky + a.y * W.cellH, bx: b.x * W.cellW, by: W.sky + b.y * W.cellH, hw: 0 }; if (!nearWant(sg, 90)) continue; sg.hw = hw((a.x + b.x) / 2, (a.y + b.y) / 2) * (W.cellW + W.cellH) / 2; block.push(sg); }
        if (r.shape && r.shape.length > 2) { const segs = _gtdLoopSegs(r.shape, W, null, { hw: 0 }).filter(sg => nearWant(sg, 60)); if (segs.length) { polys.push(r.shape.map(p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH }))); block.push(...segs); } }
      }
      for (const s of D.static || []) {
        if (_gtdWetFoot(s)) continue;
        for (const b of [s, s.apron].filter(Boolean)) rects.push({ x0: b.x * W.cellW, y0: W.sky + b.y * W.cellH, x1: (b.x + (b.w || 1)) * W.cellW, y1: W.sky + (b.y + (b.h || 1)) * W.cellH });
      }
      for (const f of D.landforms || []) if (f.col === 'full' && f.polygon && f.polygon.length > 2) { const segs = _gtdLoopSegs(f.polygon, W, null, { hw: 0 }).filter(sg => nearWant(sg, 60)); if (segs.length) { polys.push(f.polygon.map(p => ({ x: p[0] * W.cellW, y: W.sky + p[1] * W.cellH }))); block.push(...segs); } }
      for (const R of rects) block.push({ ax: R.x0, ay: R.y0, bx: R.x1, by: R.y0, hw: 0 }, { ax: R.x1, ay: R.y0, bx: R.x1, by: R.y1, hw: 0 }, { ax: R.x1, ay: R.y1, bx: R.x0, by: R.y1, hw: 0 }, { ax: R.x0, ay: R.y1, bx: R.x0, by: R.y0, hw: 0 });
      stage = 1.5; if (now() > until) return false;
    }
    if (stage === 1.5) {
      bb = _gtdSegBuckets(block, W, 52);
      stage = 1.7; if (now() > until) return false;
    }
    if (stage === 1.7) {
      rb = _gtdCellBuckets(rects, W, R => [R.x0, R.y0, R.x1, R.y1]);
      pb = _gtdCellBuckets(polys, W, Q => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of Q) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); } return [x0, y0, x1, y1]; });
      // the river mouths: their basin's own outline (a bank floods up to estuaryK of the reach, less further up the river)
      for (const m of shore.mouths) { const segs = _gtdLoopSegs(m.basin.boundary, W).filter(sg => Math.hypot((sg.ax - m.x * W.cellW) / W.cellW, (sg.ay - W.sky - m.y * W.cellH) / W.cellH * 1.3) < 9); rivers.push({ m, segs, sb: _gtdSegBuckets(segs, W, 3 * W.cellW), mx: m.x * W.cellW, my: W.sky + m.y * W.cellH }); }
      stage = 2; i = 0; if (now() > until) return false;
    }
    if (stage === 2) {
      const cpx = W.cellW / P, cpy = W.cellH / P, sky = W.sky / P;
      for (; i < cand.length; i++) {
        if (now() > until) return false;
        const ci = cand[i], cx = ci % W.cols, cy = (ci - cx) / W.cols, base = gardenIslandBaseCell(cx, cy), kind = shore.cells[ci], bk = cy * 4096 + cx;
        const tx0 = Math.floor(cx * cpx), tx1 = Math.ceil((cx + 1) * cpx), ty0 = Math.floor(sky + cy * cpy), ty1 = Math.ceil(sky + (cy + 1) * cpy);
        const segs = cb.get(bk) || [], blk = bb.get(bk) || [], inR = rb.get(bk) || [], inP = pb.get(bk) || [];
        const nearFresh = !!(base && (base.freshwater || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const q = gardenIslandBaseCell(cx + dx, cy + dy); return q && q.freshwater; })));
        // the kind a sea-margin texel takes: the nearest tidal cell's
        let k0 = kind; if (!k0) { let bd = 9; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= W.cols || y >= W.rows) continue; const k = shore.cells[y * W.cols + x], d = dx * dx + dy * dy * 1.7; if (k && d < bd) { bd = d; k0 = k; } } }
        for (let ty = ty0; ty < ty1; ty++) for (let tx = tx0; tx < tx1; tx++) {
          if (tx < 0 || ty < 0 || tx >= FW || ty >= FH) continue;
          const at = ty * FW + tx, wx = (tx + .5) * P, wy = (ty + .5) * P;
          if (wy < W.sky) continue;
          let d = Infinity; for (const s of segs) { const v = _gtdSegDist(wx, wy, coast[s]); if (v < d) d = v; }
          if (d > GARDEN_TIDE.hMax + 8) continue;   // (the plain answer stands)
          const land = !!LAND[at];
          if (land && nearFresh && gardenIslandFreshwaterContains(wx / W.cellW, (wy - W.sky) / W.cellH)) { H[at] = 255; K[at] = 0; continue; }
          let h = land ? d : -d;
          // up a river's bank near its mouth: measured from the river's own edge
          if (land) for (const R of rivers) { const dm = Math.hypot(wx - R.mx, (wy - R.my) * 1.3) / W.cellW; if (dm > 6) continue; let dr = 3 * W.cellW; for (const s of R.sb.get(bk) || []) { const v = _gtdSegDist(wx, wy, R.segs[s]); if (v < dr) dr = v; } const kk = GARDEN_TIDE.estuaryK * (1 - Math.max(0, Math.min(1, (dm - 1.5) / 4.5))); if (kk > .05) h = Math.min(h, dr / kk); }
          // the ground rises towards what stays dry
          if (land && (blk.length || inR.length || inP.length)) {
            let db = Infinity; for (const s of blk) { const b = block[s], v = _gtdSegDist(wx, wy, b) - b.hw; if (v < db) db = v; }
            for (const k of inR) { const R = rects[k]; if (wx >= R.x0 && wx <= R.x1 && wy >= R.y0 && wy <= R.y1) { db = -1; break; } }
            if (db < 60) for (const k of inP) if (gardenIslandInPolygon(wx, wy, polys[k])) { db = -1; break; }
            if (db < 60) h = Math.max(h, GARDEN_TIDE.hMax - GARDEN_TIDE.ramp * (db - 6));
          }
          if (land && h >= GARDEN_TIDE.hMax) { H[at] = 255; K[at] = 0; continue; }
          H[at] = Math.max(0, Math.min(254, Math.round((h + 24) * 2)));
          K[at] = h > -24 ? k0 : 0;
        }
      }
      stage = 3; i = 0; if (now() > until) return false;
    }
    if (stage === 3) {
      // the bounds that hold any tide (for the painter's quad and its chunk test) and the low band's ground for glints
      let x0 = FW, y0 = FH, x1 = -1, y1 = -1; const band = [], chunks = new Set(), bandZ = new Map();
      for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) { const v = H[y * FW + x]; if (v === 255 || v === 0) continue; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; chunks.add(Math.floor(x * P / 256) + ',' + Math.floor(y * P / 256)); const h = v / 2 - 24; if (h >= 4 && h <= 52 && K[y * FW + x] && (x + y * 3) % 2 === 0) { const c = gardenIslandBaseCell(x * P / W.cellW, ((y + .5) * P - W.sky) / W.cellH), z = c && c.land ? c.regionZone || 0 : -1; if (z >= 0) { band.push(y * FW + x); let l = bandZ.get(z); if (!l) bandZ.set(z, l = []); l.push(y * FW + x); } } }
      J.ms = Math.round(now() - t0);
      J.out = Object.freeze({ lay, H, K, FW, FH, P, bounds: x1 < 0 ? null : { x: x0 * P, y: y0 * P, w: (x1 - x0 + 1) * P, h: (y1 - y0 + 1) * P }, chunks, band, bandZ, ms: J.ms, rev: (_gtd.field ? _gtd.field.rev : 0) + 1 });
      return true;
    }
    return true;
  };
  return J;
}
/** How much the ground rises at one point (cells) towards a path, a plaza, a standing thing or a solid landform: the same rule as the
 *  field, asked for one point (the pools are placed by it before the field is built). The flood height there is at least this. */
function gardenTideRaiseAt(x, y) {
  const W = GARDEN_WORLD, D = gardenIslandData(), wx = x * W.cellW, wy = W.sky + y * W.cellH;
  let db = Infinity;
  for (const r of D.routes || []) {
    if (!r.points || r.points.length < 2 || GT_SHORE_SURFACE.has(r.surface)) continue;
    if (r.shape && r.shape.length > 2 && gardenIslandInPolygon(x, y, r.shape.map(q => ({ x: q[0], y: q[1] })))) return GARDEN_TIDE.hMax;
    const pts = gardenIslandRoutePath(r).points, hw = (typeof gardenIslandRouteWidthAt === 'function' ? gardenIslandRouteWidthAt(r, x, y) : r.widthCells || 2) * .5 * (W.cellW + W.cellH) / 2;
    for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k]; if (Math.abs(a.x - x) > 4 && Math.abs(b.x - x) > 4) continue; const v = _gtdSegDist(wx, wy, { ax: a.x * W.cellW, ay: W.sky + a.y * W.cellH, bx: b.x * W.cellW, by: W.sky + b.y * W.cellH }) - hw; if (v < db) db = v; }
  }
  for (const s of D.static || []) {
    if (_gtdWetFoot(s)) continue;
    for (const b of [s, s.apron].filter(Boolean)) { const x0 = b.x * W.cellW, y0 = W.sky + b.y * W.cellH, x1 = (b.x + (b.w || 1)) * W.cellW, y1 = W.sky + (b.y + (b.h || 1)) * W.cellH, dx = Math.max(x0 - wx, 0, wx - x1), dy = Math.max(y0 - wy, 0, wy - y1); db = Math.min(db, Math.hypot(dx, dy)); }
  }
  for (const f of D.landforms || []) if (f.col === 'full' && f.polygon && f.polygon.length > 2) {
    const loop = f.polygon.map(q => ({ x: q[0], y: q[1] })); if (gardenIslandInPolygon(x, y, loop)) return GARDEN_TIDE.hMax;
    for (const sg of _gtdLoopSegs(f.polygon, W)) { const v = _gtdSegDist(wx, wy, sg); if (v < db) db = v; }
  }
  return db < 60 ? Math.max(0, GARDEN_TIDE.hMax - GARDEN_TIDE.ramp * (db - 6)) : 0;
}
/** The flood height (px above low water) at (x, y) in cells, bilinear: Infinity where no tide ever comes, -Infinity out at sea. */
function gardenTideH(x, y) {
  const F = _gtd.field; if (!F) return Infinity;
  const W = GARDEN_WORLD, fx = x * W.cellW / F.P - .5, fy = (W.sky + y * W.cellH) / F.P - .5, ix = Math.floor(fx), iy = Math.floor(fy);
  if (ix < 0 || iy < 0 || ix >= F.FW - 1 || iy >= F.FH - 1) return Infinity;
  const u = fx - ix, v = fy - iy, at = (a, b) => F.H[b * F.FW + a];
  const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
  if (a === 255 && b === 255 && c === 255 && d === 255) return Infinity;
  if (a === 0 && b === 0 && c === 0 && d === 0) return -Infinity;
  return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) / 2 - 24;
}
function gardenTideFieldKind(x, y) { const F = _gtd.field; if (!F) return 0; const W = GARDEN_WORLD, tx = Math.floor(x * W.cellW / F.P), ty = Math.floor((W.sky + y * W.cellH) / F.P); return tx < 0 || ty < 0 || tx >= F.FW || ty >= F.FH ? 0 : F.K[ty * F.FW + tx]; }
/** Is the tide over (x, y) now (shallow water over the sand: you paddle)? */
function gardenTideShallows(x, y) { const F = _gtd.field; if (!F) return false; const h = gardenTideH(x, y); if (!Number.isFinite(h) || h < 0) return false; return h < gardenTideNow().line - 1.5; }
/** Is (x, y) wet sand the falling tide has just left? */
function gardenTideWetAt(x, y) { const F = _gtd.field; if (!F) return false; const h = gardenTideH(x, y); if (!Number.isFinite(h) || h < 0) return false; const T = gardenTideNow(); return h >= T.line - 1.5 && h < T.wet + 2; }
/** Along a coast walk point (world px, unit tangent: landward is (-ty, tx)): how far inland the water's edge is for a waterline
 *  (px of flood height). The samples are kept on the point. Used by the shore's live swash so its foam rides the tide. */
function gardenTideRunAt(q, line) {
  if (!(line > .5) || !_gtd.field) return 0;
  const F = _gtd.field;
  if (!q._gtr || q._gtrRev !== F.rev) {
    const W = GARDEN_WORLD, s = new Float32Array(15); for (let k = 0; k < 15; k++) { const d = k * 6, x = q.x - q.ty * d, y = q.y + q.tx * d, h = gardenTideH(x / W.cellW, (y - W.sky) / W.cellH); s[k] = Number.isFinite(h) ? h : h > 0 ? 999 : -999; }
    q._gtr = s; q._gtrRev = F.rev;
  }
  const s = q._gtr; if (s[0] >= line) return 0;
  for (let k = 1; k < s.length; k++) if (s[k] >= line) { const a = s[k - 1], b = s[k]; return (k - 1 + (line - a) / Math.max(.001, b - a)) * 6; }
  return (s.length - 1) * 6;
}

/* ---------- what the shore gives ---------- */
/* id, name, what (shell, glass, wood, stone, storm, pool), how rare (c, u, r), which shores (s sand, r rocky, e estuary), the
 * look (shape and colours, for gardenTideFindSvg), and a plain line for the journal. Big tides bring the rarer ones further up;
 * a storm brings the storm set. Items are 'sh:<id>' in your bag; nothing here is sold, they are kept, made into things or given. */
const _gsf = (id, name, what, rar, shores, look, line, more) => Object.freeze(Object.assign({ id, name, what, rar, shores, look: Object.freeze(look), line }, more || {}));
const GARDEN_SHORE_FINDS = Object.freeze([
  // shells (about forty looks: some come in two or three colours)
  _gsf('cockle', 'Cockle shell', 'shell', 'c', 'se', { s: 'fan', c: '#e8dcc4', c2: '#b8a07a' }, 'Ribbed like a little fan. There are always cockles.'),
  _gsf('cockle-pink', 'Pink cockle', 'shell', 'u', 'se', { s: 'fan', c: '#f0c8c0', c2: '#c88a80' }, 'A cockle blushing pink.'),
  _gsf('whelk', 'Whelk shell', 'shell', 'c', 'sr', { s: 'spire', c: '#d8c8a8', c2: '#9a8462' }, 'A whelk’s spiral. Hold it to your ear.'),
  _gsf('whelk-white', 'White whelk', 'shell', 'u', 'sr', { s: 'spire', c: '#f4f0e6', c2: '#c8bea8' }, 'Bleached white by the sea.'),
  _gsf('limpet', 'Limpet shell', 'shell', 'c', 'r', { s: 'cone', c: '#c8bca0', c2: '#8a7a5a' }, 'A little hat a limpet left behind.'),
  _gsf('limpet-blue', 'Blue-rayed limpet', 'shell', 'r', 'r', { s: 'cone', c: '#9ab4c4', c2: '#3a6a9a' }, 'Fine blue lines that shine like oil on water.'),
  _gsf('mussel', 'Mussel shell', 'shell', 'c', 're', { s: 'mussel', c: '#3a3c52', c2: '#7a86b0' }, 'Blue-black outside, pearl inside.'),
  _gsf('razor', 'Razor shell', 'shell', 'c', 's', { s: 'razor', c: '#d8c8a0', c2: '#a08a60' }, 'Long and straight, like an old razor.'),
  _gsf('periwinkle', 'Periwinkle', 'shell', 'c', 're', { s: 'round', c: '#6a5a4a', c2: '#a8927a' }, 'A tiny round snail shell.'),
  _gsf('periwinkle-yellow', 'Yellow periwinkle', 'shell', 'u', 'r', { s: 'round', c: '#f0c84a', c2: '#c89a2a' }, 'Bright as a buttercup.'),
  _gsf('periwinkle-orange', 'Orange periwinkle', 'shell', 'u', 'r', { s: 'round', c: '#f09a4a', c2: '#c8702a' }, 'An orange one, like a sweet.'),
  _gsf('topshell', 'Painted top shell', 'shell', 'u', 'r', { s: 'top', c: '#e8b8a8', c2: '#a8706a' }, 'Striped like a spinning top.'),
  _gsf('topshell-grey', 'Grey top shell', 'shell', 'c', 'r', { s: 'top', c: '#b8b4ac', c2: '#7a766e' }, 'A grey top shell with a mother-of-pearl tip.'),
  _gsf('scallop', 'Scallop shell', 'shell', 'u', 's', { s: 'scallop', c: '#e8a878', c2: '#b87048' }, 'The shell on every seaside sign.'),
  _gsf('scallop-queen', 'Queen scallop', 'shell', 'r', 's', { s: 'scallop', c: '#d86a6a', c2: '#a84040' }, 'A red queen of a scallop.'),
  _gsf('scallop-white', 'White scallop', 'shell', 'u', 's', { s: 'scallop', c: '#f2ece0', c2: '#c8bca4' }, 'White as a cloud, with fine ridges.'),
  _gsf('tellin', 'Pink tellin', 'shell', 'u', 'se', { s: 'oval', c: '#f4b8c4', c2: '#d88a9a' }, 'Thin as a petal and pink as sunrise.'),
  _gsf('tellin-gold', 'Golden tellin', 'shell', 'r', 's', { s: 'oval', c: '#f2d07a', c2: '#c8a04a' }, 'A little gold coin of a shell.'),
  _gsf('oyster', 'Oyster shell', 'shell', 'c', 'e', { s: 'oyster', c: '#c8c0b0', c2: '#8a8272' }, 'Rough and grey outside, smooth as milk inside.'),
  _gsf('cowrie', 'Cowrie', 'shell', 'r', 'sr', { s: 'cowrie', c: '#f2dcc4', c2: '#b88a6a' }, 'A tiny cowrie. People used to wish on these.'),
  _gsf('cowrie-spotted', 'Spotted cowrie', 'shell', 'r', 'r', { s: 'cowrie', c: '#e8c8a0', c2: '#7a4a3a', spots: 1 }, 'Three dark spots on its back, like a ladybird.'),
  _gsf('auger', 'Auger shell', 'shell', 'u', 's', { s: 'auger', c: '#d8c0a0', c2: '#9a7a5a' }, 'A long thin spire, wound tight.'),
  _gsf('necklace', 'Necklace shell', 'shell', 'u', 's', { s: 'round', c: '#e8d8c0', c2: '#b89a78' }, 'A round shell with a little hole in it.'),
  _gsf('slipper', 'Slipper limpet', 'shell', 'c', 'se', { s: 'slipper', c: '#e0d4bc', c2: '#a8987a' }, 'Shaped like a little slipper, with a shelf inside.'),
  _gsf('trough', 'Trough shell', 'shell', 'c', 's', { s: 'fan', c: '#ece2cc', c2: '#c4b498' }, 'Smooth and pale, with faint rings.'),
  _gsf('otter-shell', 'Otter shell', 'shell', 'u', 'e', { s: 'oval', c: '#e8dcc0', c2: '#a8946a' }, 'Big, thin and creamy. It lives in the mud.'),
  _gsf('urchin', 'Sea urchin shell', 'shell', 'r', 'r', { s: 'urchin', c: '#c8a0b8', c2: '#8a6a8a' }, 'A round shell dotted all over, light as paper.'),
  _gsf('sand-dollar', 'Sand dollar', 'shell', 'r', 's', { s: 'dollar', c: '#ece4d4', c2: '#b8ac94' }, 'A flat round shell with a five-petal flower on it.'),
  _gsf('cuttlebone', 'Cuttlebone', 'shell', 'u', 's', { s: 'cuttle', c: '#f6f2ea', c2: '#d4ccbc' }, 'White and chalky. Birds love it.'),
  _gsf('mermaid-purse', 'Mermaid’s purse', 'shell', 'u', 'sr', { s: 'purse', c: '#3a3a2a', c2: '#6a6a4a' }, 'A little black case with curly corners. A ray hatched from it.'),
  _gsf('crab-shell', 'Crab’s old shell', 'shell', 'c', 'sr', { s: 'crab', c: '#d8845a', c2: '#a8583a' }, 'A crab grew out of it and left it here.'),
  // sea glass, worn smooth by the sea: green, brown and clear, now and then blue, very rarely red
  _gsf('glass-green', 'Green sea glass', 'glass', 'c', 'sr', { s: 'glass', c: '#8ac4a0', c2: '#5a9a74' }, 'A bottle’s green, frosted soft by the sea.'),
  _gsf('glass-brown', 'Brown sea glass', 'glass', 'c', 'sr', { s: 'glass', c: '#c8925a', c2: '#9a6a3a' }, 'Amber like old honey.'),
  _gsf('glass-clear', 'Clear sea glass', 'glass', 'c', 'sre', { s: 'glass', c: '#e4eeee', c2: '#b4c8c8' }, 'Frosted like breath on a window.'),
  _gsf('glass-blue', 'Blue sea glass', 'glass', 'r', 'sr', { s: 'glass', c: '#6a9ad8', c2: '#3a68b0' }, 'Cobalt blue. Somebody’s old medicine bottle, long ago.', { big: 1 }),
  _gsf('glass-red', 'Red sea glass', 'glass', 'r', 'sr', { s: 'glass', c: '#d85a5a', c2: '#a83030' }, 'The rarest colour of all. Keep it safe.', { big: 2 }),
  // driftwood
  _gsf('driftwood', 'Driftwood', 'wood', 'c', 'se', { s: 'stick', c: '#c4b498', c2: '#8a7a5e' }, 'Silver-grey and smooth. It has been far.'),
  _gsf('driftwood-twist', 'Twisted driftwood', 'wood', 'u', 'sr', { s: 'twist', c: '#cab89a', c2: '#8a785a' }, 'Twisted like a corkscrew.'),
  _gsf('driftwood-knot', 'Knotted driftwood', 'wood', 'u', 'se', { s: 'knot', c: '#bca888', c2: '#7a6a4e' }, 'A knot in the middle like an eye.'),
  _gsf('driftwood-root', 'Driftwood root', 'wood', 'r', 's', { s: 'root', c: '#c8b894', c2: '#8a7a56' }, 'A whole root, its fingers worn smooth.', { big: 1 }),
  // stones
  _gsf('slate', 'Thin slate', 'stone', 'c', 'r', { s: 'slate', c: '#6a7480', c2: '#4a525c' }, 'Flat and thin. It would skim beautifully.'),
  _gsf('pebble-banded', 'Banded pebble', 'stone', 'c', 'sr', { s: 'pebble', c: '#b8b0a4', c2: '#f4f0e8', band: 1 }, 'A grey pebble with a white band all the way round. Lucky, they say.'),
  _gsf('pebble-green', 'Green pebble', 'stone', 'u', 'sr', { s: 'pebble', c: '#7a9a84', c2: '#a8c4b0' }, 'Smooth and green as a frog.'),
  _gsf('pebble-holed', 'Holed stone', 'stone', 'r', 'sr', { s: 'pebble', c: '#a8a098', c2: '#d8d0c4', hole: 1 }, 'A hag stone, with a hole worn right through. Look through it.'),
  // the storm set: only after a rough night
  _gsf('lobster-pot', 'Lobster pot', 'storm', 'u', 'sre', { s: 'pot', c: '#9a7a52', c2: '#5a4430' }, 'Torn off its rope in the storm. The fisher will be glad.', { storm: 1 }),
  _gsf('whale-bone', 'Whale bone', 'storm', 'r', 's', { s: 'bone', c: '#f0e8d8', c2: '#c4b8a0' }, 'A great curved bone, worn white. From very far out.', { storm: 1 }),
  _gsf('ship-bottle', 'Ship in a bottle', 'storm', 'r', 'sr', { s: 'shipbottle', c: '#a8d4c4', c2: '#7a5a3a' }, 'A whole little ship in a bottle. How did it get in there?', { storm: 1 }),
  _gsf('glass-float', 'Glass float', 'storm', 'u', 'sr', { s: 'float', c: '#7ac4b4', c2: '#3a8a7a' }, 'A green glass ball from an old fishing net.', { storm: 1 }),
  _gsf('rope-tangle', 'Tangle of rope', 'storm', 'c', 'sre', { s: 'rope', c: '#c8a870', c2: '#8a6a40' }, 'Good rope, only tangled. It counts as timber.', { storm: 1 }),
  _gsf('storm-chest', 'Sea chest', 'storm', 'r', 'sre', { s: 'chest', c: '#8a6038', c2: '#4a3018' }, 'An old sea chest, brought in by the storm.', { storm: 1, chest: 1 }),
  _gsf('bottle-note', 'Message in a bottle', 'storm', 'u', 'sre', { s: 'bottle', c: '#9cc8b8', c2: '#f4ecd8' }, 'A villager’s note, rolled up tight inside.', { storm: 1, chest: 1 }),
]);
const _GSF_BY = new Map(GARDEN_SHORE_FINDS.map(f => [f.id, f]));
function gardenTideFindDef(id) { return _GSF_BY.get(String(id || '').replace(/^sh:/, '')) || null; }
const GT_RAR_W = Object.freeze({ c: 10, u: 3, r: 1 });
/** A find for a glint: from the shore's kind, the tide (a big tide brings the rarer ones), and a seeded number. */
function gardenTideFindPick(shoreKind, rnd, big, storm) {
  const s = shoreKind === 2 ? 'r' : shoreKind === 3 ? 'e' : 's';
  const rows = GARDEN_SHORE_FINDS.filter(f => !f.chest && f.shores.includes(s) && (storm ? f.storm : !f.storm) && (!f.big || big >= f.big));
  let tot = 0; for (const f of rows) tot += (GT_RAR_W[f.rar] || 1) * (f.storm ? 3 : 1) * (big && f.rar !== 'c' ? 1.6 : 1);
  let v = rnd() * tot; for (const f of rows) { v -= (GT_RAR_W[f.rar] || 1) * (f.storm ? 3 : 1) * (big && f.rar !== 'c' ? 1.6 : 1); if (v <= 0) return f; }
  return rows[0] || GARDEN_SHORE_FINDS[0];
}
/** The SVG of a find, about px wide (the journal, the catch moment, a friend's screen). Painted flat, lit from the upper left. */
function gardenTideFindSvg(id, px) {
  const d = gardenTideFindDef(id); if (!d) return '';
  px = px || 32;
  return `<svg viewBox="-16 -16 32 32" width="${px}" height="${px}" aria-hidden="true">${gardenTideFindArt(d)}</svg>`;
}
/** The find's own picture in a 32 x 32 box centred on 0,0 (an SVG fragment). */
function gardenTideFindArt(d) {
  const L = d.look, c = L.c, c2 = L.c2, sh = '<ellipse cx="1.4" cy="9.4" rx="10" ry="2.4" fill="#2a2418" opacity="0.18"/>';
  const ribs = (n, r, y0) => { let s = ''; for (let i = 0; i < n; i++) { const a = Math.PI * (0.12 + 0.76 * i / (n - 1)); s += `<path d="M0 ${y0}L${(-Math.cos(a) * r).toFixed(1)} ${(y0 - Math.sin(a) * r).toFixed(1)}" stroke="${c2}" stroke-width="0.8" opacity="0.7"/>`; } return s; };
  switch (L.s) {
    case 'fan': return sh + `<path d="M0 7L-10 -1Q-9 -9 0 -10Q9 -9 10 -1Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/>${ribs(7, 9.6, 7)}<path d="M-3 7h6l-1 2h-4z" fill="${c2}"/><path d="M-6 -6Q-2 -9 3 -8" stroke="#fff" stroke-width="1" opacity="0.55" fill="none"/>`;
    case 'scallop': return sh + `<path d="M0 6L-10 -2Q-8 -10 0 -11Q8 -10 10 -2Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/>${ribs(9, 10.4, 6)}<path d="M-5 6h10v3h-10z" fill="${c2}" opacity="0.9"/><path d="M-6 -7Q-2 -10 3 -9" stroke="#fff" stroke-width="1" opacity="0.5" fill="none"/>`;
    case 'spire': return sh + `<path d="M-2 8Q-9 4 -6 -2Q-3 -9 6 -11Q4 -4 7 1Q8 7 -2 8Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-5 0Q1 -2 6 -6M-4 4Q2 2 7 -1M-1 7Q3 5 6 3" stroke="${c2}" stroke-width="0.8" fill="none"/><ellipse cx="-1.6" cy="4" rx="2.6" ry="3" fill="${c2}" opacity="0.55"/><path d="M-4 -3Q0 -7 4 -9" stroke="#fff" stroke-width="0.9" opacity="0.55" fill="none"/>`;
    case 'auger': return sh + `<path d="M-3 8L-1 -11L3 8Z" fill="${c}" stroke="${c2}" stroke-width="0.7"/>${[6, 2, -2, -6].map(y => `<path d="M${-2.4 + (8 - y) * .05} ${y}L${2.4 - (8 - y) * .05} ${y - 1.2}" stroke="${c2}" stroke-width="0.7"/>`).join('')}`;
    case 'cone': return sh + `<path d="M-10 6Q-6 -8 0 -9Q6 -8 10 6Q0 9 -10 6Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/>${[-6, -3, 0, 3, 6].map(x => `<path d="M0 -8.4L${x * 1.4} 6.6" stroke="${c2}" stroke-width="0.8" opacity="0.75"/>`).join('')}<path d="M-5 -2Q-2 -7 1 -8" stroke="#fff" stroke-width="1" opacity="0.5" fill="none"/>`;
    case 'mussel': return sh + `<path d="M-11 3Q-9 -6 2 -7Q11 -7 11 -1Q9 6 -2 6Q-10 7 -11 3Z" fill="${c}" stroke="#1a1c2a" stroke-width="0.8"/><path d="M-8 1Q0 -4 9 -3" stroke="${c2}" stroke-width="1.2" fill="none" opacity="0.8"/><path d="M-6 3Q1 0 8 1" stroke="${c2}" stroke-width="0.7" fill="none" opacity="0.6"/>`;
    case 'razor': return sh + `<path d="M-13 1Q-13 -2 -10 -2L12 -4Q14 -2 12 0L-10 3Q-13 3 -13 1Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-10 0L11 -2" stroke="${c2}" stroke-width="0.6" opacity="0.7"/><path d="M-9 -1.4L8 -3" stroke="#fff" stroke-width="0.7" opacity="0.5"/>`;
    case 'round': return sh + `<circle cx="0" cy="0" r="8" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M0 0m-5 0a5 5 0 1 0 5 -5a3 3 0 1 0 -3 3" stroke="${c2}" stroke-width="1" fill="none"/><ellipse cx="3" cy="4" rx="2.6" ry="2" fill="${c2}" opacity="0.6"/><path d="M-5 -4Q-2 -7 2 -7" stroke="#fff" stroke-width="1" opacity="0.5" fill="none"/>`;
    case 'top': return sh + `<path d="M-9 6L0 -10L9 6Q0 9 -9 6Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/>${[2, -2, -6].map(y => `<path d="M${-6.6 + (6 - y) * .4} ${y + 2}Q0 ${y + 4} ${6.6 - (6 - y) * .4} ${y + 2}" stroke="${c2}" stroke-width="0.9" fill="none"/>`).join('')}<circle cx="0" cy="-9" r="1.2" fill="#e8eef4"/>`;
    case 'oval': return sh + `<ellipse cx="0" cy="0" rx="10" ry="6.6" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-6 0a6 4 0 0 1 12 0M-3 1a3 2.4 0 0 1 6 0" stroke="${c2}" stroke-width="0.6" fill="none" opacity="0.7"/><path d="M-6 -3Q-2 -6 3 -5.4" stroke="#fff" stroke-width="1" opacity="0.6" fill="none"/>`;
    case 'oyster': return sh + `<path d="M-10 3Q-11 -6 -2 -8Q7 -10 10 -3Q11 5 2 7Q-8 9 -10 3Z" fill="${c}" stroke="${c2}" stroke-width="0.9"/><path d="M-7 1Q-3 -5 4 -5M-6 4Q0 -1 7 0M-3 6Q2 3 7 3" stroke="${c2}" stroke-width="0.8" fill="none" opacity="0.8"/>`;
    case 'cowrie': return sh + `<ellipse cx="0" cy="0" rx="9" ry="6.4" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-6 1.6Q0 3.4 6 1.6" stroke="${c2}" stroke-width="1.2" fill="none"/>${L.spots ? '<circle cx="-3" cy="-2.4" r="1.4" fill="' + c2 + '"/><circle cx="1" cy="-3.2" r="1.4" fill="' + c2 + '"/><circle cx="4.4" cy="-1.6" r="1.3" fill="' + c2 + '"/>' : ''}<path d="M-5 -3.4Q-1 -6 3 -5.4" stroke="#fff" stroke-width="1" opacity="0.6" fill="none"/>`;
    case 'slipper': return sh + `<path d="M-10 3Q-9 -6 0 -7Q9 -6 10 2Q0 7 -10 3Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-7 2Q0 -1 7 1.4" stroke="${c2}" stroke-width="1" fill="none"/>`;
    case 'urchin': { let s = sh + `<circle cx="0" cy="0" r="9" fill="${c}" stroke="${c2}" stroke-width="0.8"/>`; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; s += `<path d="M0 0L${(Math.cos(a) * 8.4).toFixed(1)} ${(Math.sin(a) * 8.4).toFixed(1)}" stroke="${c2}" stroke-width="1.6" stroke-dasharray="1 1.6" opacity="0.8"/>`; } return s + '<path d="M-5 -5Q-1 -8 3 -7" stroke="#fff" stroke-width="1" opacity="0.5" fill="none"/>'; }
    case 'dollar': { let s = sh + `<circle cx="0" cy="0" r="9.4" fill="${c}" stroke="${c2}" stroke-width="0.8"/>`; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 - Math.PI / 2; s += `<ellipse cx="${(Math.cos(a) * 3.6).toFixed(1)}" cy="${(Math.sin(a) * 3.6).toFixed(1)}" rx="1" ry="2.6" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${(Math.cos(a) * 3.6).toFixed(1)} ${(Math.sin(a) * 3.6).toFixed(1)})" fill="${c2}"/>`; } return s; }
    case 'cuttle': return sh + `<path d="M-11 0Q-8 -6 4 -5Q12 -3 12 0Q12 3 4 5Q-8 6 -11 0Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-7 0Q2 -2 10 0" stroke="${c2}" stroke-width="0.7" fill="none"/>`;
    case 'purse': return sh + `<path d="M-7 -5Q0 -7 7 -5L7 5Q0 7 -7 5Z" fill="${c}" stroke="#1a1a10" stroke-width="0.8"/><path d="M-7 -5Q-11 -9 -9 -12M7 -5Q11 -9 9 -12M-7 5Q-11 9 -9 12M7 5Q11 9 9 12" stroke="${c}" stroke-width="1.2" fill="none"/><path d="M-4 -3Q0 -4.4 4 -3" stroke="${c2}" stroke-width="0.8" fill="none"/>`;
    case 'crab': return sh + `<path d="M-9 2Q-9 -7 0 -7Q9 -7 9 2Q0 6 -9 2Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-9 0l-4 -3M-9 2l-4 0M9 0l4 -3M9 2l4 0M-6 -6l-3 -4M6 -6l3 -4" stroke="${c2}" stroke-width="1.2"/><circle cx="-3" cy="-3" r="1" fill="${c2}"/><circle cx="3" cy="-3" r="1" fill="${c2}"/>`;
    case 'glass': return sh + `<path d="M-7 -3Q-5 -8 2 -7Q8 -6 8 0Q7 6 0 6Q-8 6 -7 -3Z" fill="${c}" stroke="${c2}" stroke-width="0.8" opacity="0.92"/><path d="M-3 -4Q1 -6 4 -3" stroke="#fff" stroke-width="1.6" opacity="0.6" fill="none"/><ellipse cx="2" cy="2" rx="3" ry="2" fill="${c2}" opacity="0.35"/>`;
    case 'stick': return sh + `<path d="M-13 3Q-6 -1 2 0Q9 1 13 -3L13 0Q9 4 2 3Q-6 2 -13 6Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-9 3Q0 0 10 -1" stroke="#fff" stroke-width="0.7" opacity="0.45" fill="none"/>`;
    case 'twist': return sh + `<path d="M-13 2Q-9 -4 -4 1Q1 6 5 0Q9 -6 13 -1" stroke="${c2}" stroke-width="4.4" fill="none" stroke-linecap="round"/><path d="M-13 2Q-9 -4 -4 1Q1 6 5 0Q9 -6 13 -1" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    case 'knot': return sh + `<path d="M-13 2Q-4 -2 13 -1L13 2Q-4 3 -13 5Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><ellipse cx="1" cy="1" rx="3.4" ry="2.2" fill="${c2}"/><ellipse cx="1" cy="1" rx="1.6" ry="1" fill="#3a2e1e"/>`;
    case 'root': return sh + `<path d="M-2 6Q-2 -2 2 -10M-2 2Q-8 -2 -12 -1M-1 0Q-6 -6 -8 -11M1 2Q7 -2 12 -4M0 4Q8 3 12 6" stroke="${c2}" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M-2 6Q-2 -2 2 -10M-2 2Q-8 -2 -12 -1M-1 0Q-6 -6 -8 -11M1 2Q7 -2 12 -4M0 4Q8 3 12 6" stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case 'slate': return sh + `<path d="M-11 2L-6 -5L10 -4L11 3L-4 6Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-7 -3L9 -2" stroke="#9aa4b0" stroke-width="0.8" opacity="0.7"/>`;
    case 'pebble': return sh + `<ellipse cx="0" cy="0" rx="9.6" ry="7" fill="${c}" stroke="#5a564e" stroke-width="0.6"/>${L.band ? `<path d="M-9 1Q0 -2 9 1" stroke="${c2}" stroke-width="2" fill="none"/>` : ''}${L.hole ? '<ellipse cx="1" cy="0" rx="2.6" ry="2" fill="#3a362e"/><ellipse cx="1.4" cy="0.4" rx="1.6" ry="1.1" fill="#7a9ab0" opacity="0.8"/>' : ''}<path d="M-6 -3Q-2 -6 3 -5" stroke="#fff" stroke-width="1.2" opacity="0.45" fill="none"/>`;
    case 'pot': return sh + `<path d="M-10 6L-10 -2Q-10 -9 0 -9Q10 -9 10 -2L10 6Z" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M-10 6H10M-6 6V-7M0 6V-9M6 6V-7M-10 0H10" stroke="${c}" stroke-width="1.2"/><path d="M-10 6H10" stroke="${c2}" stroke-width="2.4"/><ellipse cx="0" cy="-2" rx="3" ry="2.4" fill="none" stroke="${c2}" stroke-width="1"/>`;
    case 'bone': return sh + `<path d="M-12 4Q-6 -10 10 -8Q13 -7 12 -5Q-2 -6 -8 6Q-10 7 -12 4Z" fill="${c}" stroke="${c2}" stroke-width="0.8"/><path d="M-8 2Q-3 -6 8 -6" stroke="#fff" stroke-width="0.9" opacity="0.5" fill="none"/>`;
    case 'shipbottle': return sh + `<path d="M-11 -4Q-11 -7 -6 -7L6 -7Q9 -7 10 -4L12 -3V3L10 4Q9 7 6 7L-6 7Q-11 7 -11 4Z" fill="${c}" opacity="0.55" stroke="#5a8a7a" stroke-width="0.8"/><path d="M12 -2h3v4h-3z" fill="#9a7a4a"/><path d="M-6 3Q0 5 6 3L5 5H-5Z" fill="${c2}"/><path d="M-1 3V-5M-1 -5L4 1H-1M-1 -4L-5 1H-1" stroke="#f4f0e4" stroke-width="0.8" fill="#f4f0e4"/><path d="M-8 -5Q-2 -6 4 -6" stroke="#fff" stroke-width="1" opacity="0.6" fill="none"/>`;
    case 'float': return sh + `<circle cx="0" cy="-1" r="9" fill="${c}" opacity="0.88" stroke="${c2}" stroke-width="0.8"/><path d="M-9 -1H9M0 -10V8" stroke="#8a6a40" stroke-width="1" opacity="0.8"/><path d="M-5 -6Q-2 -9 2 -8" stroke="#fff" stroke-width="1.6" opacity="0.6" fill="none"/>`;
    case 'rope': return sh + `<path d="M-10 2Q-12 -6 -4 -6Q4 -7 2 0Q0 6 8 4Q13 2 10 -4Q8 -8 2 -8" stroke="${c2}" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M-10 2Q-12 -6 -4 -6Q4 -7 2 0Q0 6 8 4Q13 2 10 -4Q8 -8 2 -8" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="2 1"/>`;
    case 'bottle': return sh + `<path d="M-11 2Q-12 -4 -6 -5L5 -5Q8 -5 9 -3L12 -2.4V1.6L9 2Q8 5 4 5L-6 5Q-11 6 -11 2Z" fill="${c}" opacity="0.7" stroke="#4a7a6a" stroke-width="0.8"/><path d="M12 -2.4h3v4h-3z" fill="#a07a4a"/><rect x="-7" y="-2.6" width="11" height="5" rx="2.4" fill="${c2}" stroke="#c8b890" stroke-width="0.5"/><path d="M-8 -3.6Q-2 -4.6 4 -4.4" stroke="#fff" stroke-width="1" opacity="0.6" fill="none"/>`;
    case 'chest': return sh + `<path d="M-11 -2H11V8H-11Z" fill="${c}" stroke="${c2}" stroke-width="0.9"/><path d="M-11 -2Q-11 -10 0 -10Q11 -10 11 -2Z" fill="${c}" stroke="${c2}" stroke-width="0.9"/><path d="M-11 -2H11M-6 -9.4V8M6 -9.4V8" stroke="#c8a04a" stroke-width="1.4"/><rect x="-1.6" y="-3.4" width="3.2" height="4" fill="#e0b84a" stroke="#8a6a20" stroke-width="0.5"/>`;
    default: return sh + `<circle r="7" fill="${c}" stroke="${c2}"/>`;
  }
}

/* ---------- a low water's glints ---------- */
/** The strand's own number (the same glints on every screen): a friend's from their snapshot, yours from your lake's seed. */
function gardenTideSeed() {
  try { const m = typeof gardenVisitOn === 'function' && gardenVisitOn() && typeof gardenHere === 'function' ? gardenHere() : null; const s = m && m.visit && m.visit.snap; if (s) return s.ti && Number.isInteger(s.ti.sd) ? s.ti.sd : s.ca && Number.isInteger(s.ca.sd) ? s.ca.sd : gardenHash('tide|' + (typeof _gdv !== 'undefined' ? _gdv.fid : '')) % 9999; } catch (e) { /* yours */ }
  try { return typeof gardenLakeSeed === 'function' ? gardenLakeSeed() : 1; } catch (e) { return 1; }
}
/** The day number (days since 1970, local) of the last storm night before window w's low water, or -1. */
function gardenTideStormFor(w, s) { const day = Math.floor(gardenTideWindowLow(w) / 1440); return Number.isInteger(s) && s >= 0 && day === s + 1 ? s : -1; }   // (the morning and the evening low water after a rough night)
/**
 * The glints window w leaves on the sand: [{i, x, y (cells), h (px), find, k (shore kind), zone}]. Seeded by the strand's number and
 * the window, so every screen has the same. rich 0..3 adds a few (low waters the owner missed); storm (a day number, or -1) adds the
 * storm set; big (0 usual, 1 big, 2 a full-moon big tide) lets the rarer glass up the beach. The open zones filter what you can reach.
 */
function gardenTideScatter(w, o) {
  o = o || {};
  const F = _gtd.field; if (!F || !F.band.length) return [];
  const seed = Number.isFinite(o.seed) ? o.seed : gardenTideSeed(), rich = Math.max(0, Math.min(GARDEN_TIDE.rich, o.rich | 0)), storm = Number.isInteger(o.storm) ? o.storm : -1;
  const key = [F.rev, seed, w, rich, storm].join('|'); if (_gtd.scatter.has(key)) return _gtd.scatter.get(key);
  const W = GARDEN_WORLD, iso = _gtdIso(gardenTideWindowLow(w)), moon = gardenTideMoon(iso), big = moon.kind === 'big' ? (moon.full ? 2 : 1) : 0, reachHigh = GARDEN_TIDE.reach[moon.kind] || 44;
  const out = [], zones = [...F.bandZ.keys()].sort((a, b) => a - b);
  // each stretch of the coast gets its share: about one glint to seven cells of shore, three to ten a region, a few more for a
  // missed low water or two, and the storm set after a rough night
  for (const z of zones) {
    const list = F.bandZ.get(z), r = gardenRand(gardenHash('tide|' + seed + '|' + w + '|' + z)), cells = list.length / 7;
    const n = Math.max(3, Math.min(10, Math.round(cells / 7))) + rich, ns = storm >= 0 ? 2 : 0, mine = [];
    for (let k = 0; k < Math.max(90, (n + ns) * 14) && mine.length < n + ns; k++) {
      const at = list[Math.floor(r() * list.length)], tx = at % F.FW, ty = (at - tx) / F.FW, x = ((tx + .5) * F.P + (r() - .5) * F.P) / W.cellW, y = ((ty + .5) * F.P + (r() - .5) * F.P - W.sky) / W.cellH;
      const h = gardenTideH(x, y); if (!(h >= 4 && h <= reachHigh * .9)) continue;
      if (mine.some(p => Math.hypot(p.x - x, (p.y - y) * 1.3) < 1.4) || !gardenTideOpenSand(x, y)) continue;
      const kind = F.K[at] || 1, stormy = mine.length >= n;
      mine.push({ x, y, h, kind, find: gardenTideFindPick(kind, r, big, stormy), ph: r() });
    }
    for (const g of mine) out.push(Object.freeze({ i: out.length, x: Math.round(g.x * 100) / 100, y: Math.round(g.y * 100) / 100, h: g.h, find: g.find, k: g.kind, zone: z, ph: g.ph }));
  }
  if (_gtd.scatter.size > 12) _gtd.scatter.clear();
  _gtd.scatter.set(key, out);
  return out;
}

const _gtdPlazas = { d: null, boxes: null };
/** Is (x, y) at the foot of a plaza's face (a quay's wall is painted down from its lowest edge, a cell deep, across its width)? */
function _gtdPlazaFace(x, y) {
  const D = gardenIslandData();
  if (_gtdPlazas.d !== D) { _gtdPlazas.d = D; _gtdPlazas.boxes = (D.routes || []).filter(r => r.tier === 'plaza' && !GT_SHORE_SURFACE.has(r.surface) && r.shape && r.shape.length > 2).map(r => { const xs = r.shape.map(q => q[0]), ys = r.shape.map(q => q[1]); return [Math.min(...xs), Math.max(...ys), Math.max(...xs)]; }); }
  for (const b of _gtdPlazas.boxes) if (x > b[0] - .4 && x < b[2] + .4 && y > b[1] - .4 && y < b[1] + 1.45) return true;
  return false;
}
/** Is (x, y) too close to a path, a standing thing, a plot or a painted thing's foot for something lying on the sand? */
function _gtdCrowded(x, y, wide) {
  const mx = wide ? .45 : .26, my = wide ? .35 : .2, hm = wide ? .5 : .22;
  if (!gardenIslandLandContains(x, y)) return true;
  for (const [dx, dy] of [[0, 0], [-mx, 0], [mx, 0], [0, -my], [0, my]]) { const c = gardenIslandBaseCell(x + dx, y + dy); if (!c || c.freshwater || c.route || c.staticId || c.solid || c.reservation === 'apron' || c.reservation === 'landform') return true; }   // (the sea's cells round the waterline, the space behind a building and a pier's future place are still open sand)
  try { const V = typeof GardenPaintVale !== 'undefined' && GardenPaintVale.feet ? GardenPaintVale.feet() : []; for (const f of V) if (x > f.x0 - mx && x < f.x1 + mx && y > f.y0 - my - .1 && y < f.y1 + my) return true; } catch (e) { /* no painted feet */ }
  // (below a plaza, a quay's wall face is painted down towards the water: nothing lies at its foot)
  if (_gtdPlazaFace(x, y)) return true;
  try { if (typeof gardenIslandHarbourThings === 'function') for (const t of gardenIslandHarbourThings()) { const f = t.foot; if (x > f[0] - hm && x < f[2] + hm && y > f[1] - hm - .15 && y < f[3] + hm) return true; } } catch (e) { /* no harbour */ }   // (the drying net, the boat on the sand, the crates: by the harbour's own rule, the same on every screen)
  return false;
}

/** Open beach at (x, y): clear of paths and standing things (_gtdCrowded), and the sand's own height there (not ground that rises
 *  to a quay or a path: a thing lying there would sit on a wall's face). Mud by a river mouth is measured from the river instead. */
function gardenTideOpenSand(x, y, wide) {
  if (_gtdCrowded(x, y, wide) || wide && (_gtdCrowded(x - .55, y, true) || _gtdCrowded(x + .55, y, true) || _gtdCrowded(x, y + .9, true))) return false;
  const h = gardenTideH(x, y); if (!Number.isFinite(h)) return false;
  return gardenTideFieldKind(x, y) === 3 || Math.abs(h - gardenIslandCoastDistance(x, y)) < (wide ? 14 : 22);
}

/* ---------- storms ---------- */
/** A rough night by the made-up sky (the same on every device, announced a day ahead): about one night in nine, in the cold half of
 *  the year a little more often. day: days since 1970 (local). The real weather adds its own (thunder, a gale) when the app sees it. */
function gardenTideStormy(day, seed) { const h = gardenHash('tide-storm|' + (seed || 0) + '|' + day), mo = new Date(day * 86400000).getUTCMonth(), cold = mo >= 9 || mo <= 2; return h % (cold ? 7 : 11) === 0; }   // clock-ok: a month from a day number

/* ---------- the snapshot's `ti` (friends see the same strand) ---------- */
/** What the shore's games add to `ti`: each module pushes fn(out) here at load (bottles `b`, spotter stamps `sp`, the league `sk`, lost things `lf`). */
const GT_WIRE = [];
/** {sd: the strand's number, r: how rich the next low water is, s: the day of the last storm} for gardenSnapshot. */
function gardenTideWire() {
  try {
    const g = typeof _gdG === 'function' ? _gdG() : null; if (!g || !g.wd) return null;
    const sd = Math.max(0, Math.min(9999, Math.floor(Number(typeof gardenLakeSeed === 'function' ? gardenLakeSeed() : 0)) || 0)), out = { sd };
    const r = typeof gardenTideRich === 'function' ? gardenTideRich() : 0; if (r > 0) out.r = Math.min(3, r);
    const s = typeof gardenTideLastStorm === 'function' ? gardenTideLastStorm() : -1; if (Number.isInteger(s) && s >= 0) out.s = Math.min(99999, s);
    if (typeof gardenTideCastleWire === 'function') { const c = gardenTideCastleWire(); if (c && c.length) out.c = c.slice(0, 6); }
    for (const fn of GT_WIRE) { try { fn(out); } catch (e) { /* that one says nothing */ } }   // the shore's games: bottles, the spotter card, the league, lost things (94-garden-tide-9bottle.js to -d-spot.js)
    return out;
  } catch (e) { return null; }
}

/* ---------- the facade the painters, the walk and other lanes ask ---------- */
if (typeof window !== 'undefined') window.GardenTide = Object.freeze({
  now: (o) => gardenTideNow(o),
  level: () => gardenTideNow().level,
  waterline: () => (_gtd.field ? gardenTideNow().line : 0),
  wetline: () => (_gtd.field ? gardenTideNow().wet : 0),
  lowNow: () => gardenTideNow().low,
  ready: () => !!_gtd.field,
  field: () => _gtd.field,
  h: (x, y) => gardenTideH(x, y),
  waterAt: (x, y) => gardenTideShallows(x, y),
  shallows: (x, y) => gardenTideShallows(x, y),
  wetAt: (x, y) => gardenTideWetAt(x, y),
  kindAt: (x, y) => gardenTideKindAt(x, y),
  table: (o) => gardenTideTable(o),
  runAt: (q, line) => gardenTideRunAt(q, line),
  shore: () => gardenTideShore(),
  step: (ms) => gardenTideFieldStep(ms),
});
