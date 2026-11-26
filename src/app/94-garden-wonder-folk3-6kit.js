/* ============================================================
   THE DAY'S KIT (the folk3 plan, steps 6 and 7): what the vale sets out on a day something is on, placed BY KIND round "the village
   plaza" and painted in the cast's hand, so any layout gets its market and its fair with no code change (rule 17).
   - The village plaza is found by data: the plaza in open land with the most homes within 14 cells, then the largest, then the one nearest
     the arrival point. Its ring is its own route when that is a closed loop, else its outline.
   - Pieces stand where a thing you put down could stand and more: free ground, never on a lawn or a bed, never on a lane (a route's own
     width kept clear), one step clear of everything drawn (its picture's height behind it too), never in front of a door. A piece that does
     not fit is left out; a layout with no plaza has no kit, and the day is an ordinary day.
   - Market day: up to four stalls (Quince's honey, Bramble's maps, Pip's river stones, Perpetua's stamps). Card evening: a folding table
     and two stools by the lamp nearest the plaza. The Frost Fair: two stalls, a brazier, lantern posts round the ring lit at dusk, bunting
     strung between them, and places to stand and watch.
   - The folk find their places like any bench's: every place on a piece (behind the counter, at its corners, a stool, round the brazier)
     is a thing of a kit kind with its own stand point (gardenKitThings, read by the runner's place finder), so the planner books them
     (94-garden-folk3-2week.js valeWeekBlock). Walking stops at a counter you can see (gardenKitSolids, the collision view names it).
   - Built one piece a frame when first needed, at most 24 still sprites, freed when the day's row is over. It runs in a friend's garden
     too: worked out on each screen from the day and the host's layout; the folk come from the host.
     gardenVillagePlaza()        { id, x, y, ring: [{x, y}], half (the ring lane's half width), poly (its lawn), shape } or null
     gardenKitToday(m)           the row on today (VALE_YEAR_ROWS) and its placed pieces: { row, pieces, spots, marks } or null
     gardenKitThings()           kit places for the folk's place finder (the runner's ctx, hook in _vfrCtx)
     gardenKitSolids()           the counters, the brazier and the posts, for the walker (hook K2)
     gardenKitMark(name)         a named mark ('middle': the plaza's middle, on free ground) for moments
     gardenKitDev()              console: what was placed and what was left out, and why
   ============================================================ */
const _vk = { key: '', plan: null, why: [], S: new Map(), queue: [], lit: null, row: null, glowT: 0, replanAsked: '' };
function _vkM() { try { return gardenHere(); } catch (e) { return null; } }
function _vkOpen(x, y, m) { try { const z = gardenIslandZoneAt(Math.floor(x), Math.floor(y)); return !z || ((m && m.areas) || []).includes('zn-' + z); } catch (e) { return true; } }
function _vkPolyArea(P) { let a = 0; for (let i = 0, j = P.length - 1; i < P.length; j = i++) a += (P[j][0] + P[i][0]) * (P[j][1] - P[i][1]); return Math.abs(a / 2); }
function _vkIn(P, x, y) { let inn = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inn = !inn; } return inn; }
function _vkSegD(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy; let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (ax + dx * t), py - (ay + dy * t)); }
/** The village plaza, found by data (cached per layout and opened land). */
function gardenVillagePlaza() {
  let D = null; try { D = gardenIslandData(); } catch (e) { return null; }
  const m = _vkM(), key = (D && D.id) + '|' + ((m && m.areas) || []).length;
  if (_vk.pzKey === key) return _vk.pz;
  _vk.pzKey = key; _vk.pz = null;
  const P = ((D && D.presentation) || {}).plazas || []; if (!P.length) return null;
  const st = (D.anchors || {}).start || GARDEN_WORLD.start || { x: GARDEN_WORLD.cols / 2, y: GARDEN_WORLD.rows / 2 };
  let things = []; try { things = gardenAffordThings(); } catch (e) { things = []; }
  const homes = things.filter(t => typeof valeFolkHomeOf === 'function' && valeFolkHomeOf(t) && valeFolkHomeOf(t) !== 'postbox');
  const rows = [];
  for (const pz of P) {
    if (!Number.isFinite(pz.x) || !Number.isFinite(pz.y) || !_vkOpen(pz.x, pz.y, m)) continue;
    const shape = Array.isArray(pz.shape) && pz.shape.length > 2 ? pz.shape : null, lawn = Array.isArray(pz.lawn) && pz.lawn.length > 2 ? pz.lawn : null;
    const area = shape ? _vkPolyArea(shape) : lawn ? _vkPolyArea(lawn) + (Array.isArray(pz.square) ? _vkPolyArea(pz.square) : 0) : Number.isFinite(pz.rx) ? Math.PI * pz.rx * (pz.ry || pz.rx) : 0;
    const nHome = homes.filter(t => Math.hypot(t.x - pz.x, t.y - pz.y) <= 14).length;
    rows.push({ pz, shape, lawn, area, nHome, d: Math.hypot(pz.x - st.x, pz.y - st.y) });
  }
  if (!rows.length) return null;
  // (the homes round it count most; a plaza big enough for a fair and the one you arrive at, the village's heart, count too)
  for (const r of rows) r.score = Math.min(4, r.nHome) + (r.area >= 60 ? 3 : r.area >= 35 ? 1 : 0) + (r.d < 10 ? 3 : r.d < 18 ? 1 : 0);
  rows.sort((a, b) => b.score - a.score || b.area - a.area || a.d - b.d);
  _vk.pzRows = rows.slice(0, 6).map(r => [r.pz.id, r.nHome, Math.round(r.area), Math.round(r.d), r.score]);
  const R = rows[0], pz = R.pz;
  if (R.area < 12) return null;   // (a corner of flags is no village plaza)
  // the ring: its own route when that is a closed loop round it, else its outline, else the ellipse
  let ring = null, half = 1;
  try {
    const rt = (D.routes || []).find(r => r.id === pz.route), pts = rt && Array.isArray(rt.points) ? rt.points : null;
    if (pts && pts.length >= 8 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 2.5) { ring = pts.map(p => ({ x: p[0], y: p[1] })); half = (Number(rt.widthCells) || 2) / 2; }
  } catch (e) { ring = null; }
  if (!ring && R.shape) { ring = R.shape.map(p => ({ x: pz.x + (p[0] - pz.x) * 0.84, y: pz.y + (p[1] - pz.y) * 0.84 })); half = 0.8; }
  if (!ring && Number.isFinite(pz.rx)) { ring = []; for (let k = 0; k < 32; k++) { const a = k / 32 * Math.PI * 2; ring.push({ x: pz.x + Math.cos(a) * pz.rx, y: pz.y + Math.sin(a) * (pz.ry || pz.rx) }); } half = 1; }
  if (!ring) return null;
  const cx = ring.reduce((s, p) => s + p.x, 0) / ring.length, cy = ring.reduce((s, p) => s + p.y, 0) / ring.length;
  _vk.pz = { id: pz.id, x: pz.x, y: pz.y, cx, cy, ring, half, lawn: R.lawn, shape: R.shape, square: Array.isArray(pz.square) ? pz.square : null, route: pz.route || '' };
  return _vk.pz;
}
/* ---------- the pieces: sizes in cells (a cell is 48 by 30 px; H, the player's height, about 41 px) ---------- */
const VK_PIECES = Object.freeze({
  stall: Object.freeze({ hw: 0.98, dp: 0.34, rise: 2.7, name: 'the market stall' }),
  table: Object.freeze({ hw: 1.32, dp: 0.32, rise: 1.5, name: 'the card table' }),
  brazier: Object.freeze({ hw: 0.42, dp: 0.3, rise: 1.6, name: 'the brazier' }),
  lantern: Object.freeze({ hw: 0.22, dp: 0.2, rise: 2.8, name: 'the lantern post' }),
});
/** Every place a piece offers the folk: relative to its foot (dx, dy cells), the act, the way they face (a point relative to the foot). */
const VK_SPOTS = Object.freeze({
  stall: Object.freeze([{ k: 'keep', dx: 0, dy: -0.62, look: [0, 2], act: 'keep' }, { k: 'browse', dx: -1.32, dy: 0.42, look: [0, 0], act: 'browse' }, { k: 'browse', dx: 1.32, dy: 0.42, look: [0, 0], act: 'browse' }]),
  table: Object.freeze([{ k: 'stool', dx: -0.92, dy: 0.06, look: [0, 0], act: 'sit', seat: 0.3 }, { k: 'stool', dx: 0.92, dy: 0.06, look: [0, 0], act: 'sit', seat: 0.3 }]),
  brazier: Object.freeze([{ k: 'warm', dx: -1.15, dy: 0.1, look: [0, 0], act: 'warm' }, { k: 'warm', dx: 1.15, dy: 0.1, look: [0, 0], act: 'warm' }, { k: 'warm', dx: -0.95, dy: 0.95, look: [0, 0], act: 'warm' }, { k: 'warm', dx: 0.95, dy: 0.95, look: [0, 0], act: 'warm' }]),
});
function _vkThings() { let L = []; try { L = gardenAffordThings(); } catch (e) { L = []; } return L; }
function _vkFlat(t) { const K = (t && typeof GARDEN_KINDS !== 'undefined' && GARDEN_KINDS[t.kind]) || {}; return !t.kind || K.solid === 'free' || /^(pier|bridge|fishing-bank|ball|leaf-pile|log$|stepping|road|plaza|path|field|plot|pond|crossing|ford|basket|finds|water-edge|open-grass|sand|snow|slope|puddle|deep|person)/.test(t.kind); }
/** Can a piece stand with its foot middle at x, y? '' or why not (kept for gardenKitDev). own: pieces already placed today. */
function _vkFits(kind, x, y, ctx, own) {
  const P = VK_PIECES[kind], m = ctx.m;
  // its base: free to walk on now (or under a piece of today's own), open land, no water, no lawn or bed
  for (let px = x - P.hw; px <= x + P.hw + 1e-6; px += Math.max(0.2, P.hw / 2)) for (const py of [y - P.dp, y - P.dp / 2, y]) {
    if (!ctx.free(px, py)) return 'blocked';
    const tr = typeof gardenTerrainAt === 'function' ? gardenTerrainAt(px, py) : 'path'; if (!/^(path|open-grass|ground|snow)$/.test(tr)) return 'ground:' + tr;
    if (typeof _vfpBedAt === 'function' && _vfpBedAt(px, py)) return 'lawn or bed';
    if (!_vkOpen(px, py, m)) return 'closed land';
  }
  if (typeof _vfp !== 'undefined' && Array.isArray(_vfp.beds)) for (const b of _vfp.beds) if (x + P.hw > b.x0 && x - P.hw < b.x1 && y - P.rise + 0.4 < b.y1 && y > b.y0 - 0.2) return 'over a bed';
  // the folk's places on it, and room to stand there
  for (const s of VK_SPOTS[kind] || []) { const sx = x + s.dx, sy = y + s.dy; if (!ctx.free(sx, sy) || !ctx.free(sx - 0.25, sy) || !ctx.free(sx + 0.25, sy)) return 'no room for ' + s.k; if (typeof _vfpBedAt === 'function' && _vfpBedAt(sx, sy)) return 'a place on the lawn'; }
  // never on a lane: each route's own width kept clear (the ring's too: the walk round the plaza stays a walk)
  const onPlaza = ctx.onPlaza(x, y - P.dp / 2);
  for (const r of ctx.routes) { const h = (onPlaza || r.ring ? Math.min(r.half, 0.8) : r.half) + (kind === 'lantern' ? 0.05 : 0.2), S = r.segs; for (let i = 0; i < S.length; i += 4) { if (Math.abs(S[i] - x) > 9 && Math.abs(S[i + 2] - x) > 9) continue; if (_vkSegD(x, y - P.dp / 2, S[i], S[i + 1], S[i + 2], S[i + 3]) < h || _vkSegD(x - P.hw, y - P.dp / 2, S[i], S[i + 1], S[i + 2], S[i + 3]) < h || _vkSegD(x + P.hw, y - P.dp / 2, S[i], S[i + 1], S[i + 2], S[i + 3]) < h) return 'on a lane'; } }
  // one step clear of everything drawn, its picture's height behind it included (rule 12), and never in front of a door
  const x0 = x - P.hw - 0.5, x1 = x + P.hw + 0.5, y0 = y - P.rise - 0.7, y1 = y + 0.9;
  for (const t of ctx.things) {
    if (_vkFlat(t) || t.kit) continue;
    let B = t; try { B = ctx.base(t); } catch (e) { B = t; }
    const tree = /tree|oak|trunk/.test(t.kind), bw = tree ? 0.5 : Math.max(0.4, B.w || t.w || 1), bh = tree ? 1.6 : Math.max(1, B.h || 1.2);
    if (B.x + bw / 2 > x0 && B.x - bw / 2 < x1 && B.y > y0 && B.y - bh < y1) return 'by ' + (t.kind || 'something');
  }
  for (const d of ctx.doors) if (Math.abs(d.x - x) < P.hw + 1.1 && d.y - y < 2.2 && y - d.y < 1.2) return 'a doorway';
  for (const q of own) { const Q = VK_PIECES[q.kind]; if (Math.abs(q.x - x) < Q.hw + P.hw + (q.kind === 'lantern' || kind === 'lantern' ? 0.8 : 1.5) && Math.abs(q.y - y) < 2.4) return 'by today’s ' + q.kind; }
  return '';
}
function _vkCtx(m, P) {
  // only what is round the plaza (its ring's box, and a margin) is looked at: every route and thing in the vale was a 100 ms task
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const p of (P && P.ring) || []) { bx0 = Math.min(bx0, p.x); by0 = Math.min(by0, p.y); bx1 = Math.max(bx1, p.x); by1 = Math.max(by1, p.y); }
  for (const poly of [P && P.square, P && P.shape]) if (poly) for (const q of poly) { bx0 = Math.min(bx0, q[0]); by0 = Math.min(by0, q[1]); bx1 = Math.max(bx1, q[0]); by1 = Math.max(by1, q[1]); }
  const M = 9, inBox = (x, y) => x > bx0 - M && x < bx1 + M && y > by0 - M && y < by1 + M + 2;
  const things = _vkThings().filter(t => inBox(t.x, t.y)), routes = [], doors = [];
  try { for (const r of gardenIslandData().routes || []) { if (!Array.isArray(r.points) || r.points.length < 2) continue; const segs = []; for (let i = 1; i < r.points.length; i++) { const a = r.points[i - 1], b = r.points[i]; if (inBox(a[0], a[1]) || inBox(b[0], b[1])) segs.push(a[0], a[1], b[0], b[1]); } if (segs.length) routes.push({ id: r.id, segs, half: (Number(r.widthCells) || 2) / 2, ring: !!P && r.id === P.route }); } } catch (e) { /* none */ }
  try { for (const p of typeof gardenPropsNow === 'function' ? gardenPropsNow() : GARDEN_PROPS) if (p && p.door && Number.isFinite(p.door.x) && inBox(p.door.x, p.door.y)) doors.push({ x: p.door.x + 0.5, y: p.door.y + 0.5 }); } catch (e) { /* none */ }
  const own = _vk.plan ? _vk.plan.pieces : [];
  const mine = (x, y) => own.some(q => { const Q = VK_PIECES[q.kind]; return Math.abs(q.x - x) <= Q.hw + 0.05 && y <= q.y + 0.05 && y >= q.y - Q.dp - 0.05; });
  const baseMemo = new Map();
  const polys = [P && P.square, P && P.shape].filter(Boolean);
  return { m, things, routes, doors, onPlaza: (x, y) => polys.some(q => _vkIn(q, x, y)),
    free: (x, y) => (typeof _gwFree !== 'function' || _gwFree(x, y)) || mine(x, y),
    base(t) { if (!baseMemo.has(t.id)) { let B = { x: t.x, y: t.y, w: t.w || 1 }; try { if (typeof gardenAffordDrawnBase === 'function') B = gardenAffordDrawnBase(t); } catch (e) { /* the plan's */ } let h = 1.2; try { const w = window.GardenNative && GardenNative.world(), rec = w && w.entities instanceof Map ? w.entities.get('prop:' + t.id) : null; if (rec && rec.bounds && rec.bounds.height) h = rec.bounds.height / GARDEN_WORLD.cellH; } catch (e) { /* not drawn yet */ } baseMemo.set(t.id, Object.assign({}, B, { h: Math.min(8, h) })); } return baseMemo.get(t.id); } };
}
/** Places along the ring, every `step` cells: each with the way out from the plaza (nx, ny) and how far along the ring it is. */
function _vkRingWalk(P, step) {
  const R = P.ring, out = []; let acc = 0, run = 0;
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1], b = R[i], L = Math.hypot(b.x - a.x, b.y - a.y); if (!L) continue;
    let tx = (b.x - a.x) / L, ty = (b.y - a.y) / L, nx = ty, ny = -tx;
    if (nx * ((a.x + b.x) / 2 - P.cx) + ny * ((a.y + b.y) / 2 - P.cy) < 0) { nx = -nx; ny = -ny; }   // (out, away from the middle)
    while (acc <= L) { out.push({ x: a.x + tx * acc, y: a.y + ty * acc, nx, ny, s: run + acc }); acc += step; }
    acc -= L; run += L;
  }
  return out;
}
/** Candidate feet for a piece round the ring: on the verge outside the walk first, then just inside it, then the plaza's own paving
 *  (its shape or square) near its edges. Ordered from the arrival side round, so every screen picks the same. */
function _vkCands(P, kind) {
  const piece = VK_PIECES[kind], out = [], dIn = piece.dp + 0.35, edge = Math.max(0.85, P.half - 0.55);
  if (kind !== 'lantern') {
    // every half cell round the plaza (its ring's box and three and a half cells more), so whatever free ground it has is found
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of P.ring) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    for (const poly of [P.square, P.shape]) if (poly) for (const q of poly) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    for (let y = Math.floor(y0 - 3) + 0.5; y <= y1 + 3.5; y += 0.5) for (let x = Math.floor(x0 - 3.5); x <= x1 + 3.5; x += 0.5) out.push({ x, y, s: 0 });
  } else
  for (const q of _vkRingWalk(P, 0.6)) for (const off of [edge + 0.15, edge + 0.45, P.half + 0.9, P.half + 1.5, -(P.half + dIn), -(P.half + dIn + 0.6)]) out.push({ x: q.x + q.nx * off, y: q.y + q.ny * off + (q.ny > 0.3 && off > 0 ? piece.dp : 0), s: q.s, out: off > 0 });
  if (kind === 'lantern') for (const poly of [P.square, P.shape]) if (poly) { const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length, cy = poly.reduce((s, p) => s + p[1], 0) / poly.length; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; for (let t = 0.15; t < 1; t += 0.2) for (const k of [0.78, 0.62]) { const x = cx + (a[0] + (b[0] - a[0]) * t - cx) * k, y = cy + (a[1] + (b[1] - a[1]) * t - cy) * k; if (_vkIn(poly, x, y)) out.push({ x, y, s: 1000 + i * 5 + t, sq: 1 }); } } }
  // (from the plaza's front: its square's middle when it has one, else where you arrive if that is by it, else its middle)
  const F = P.square ? { x: P.square.reduce((t, p) => t + p[0], 0) / P.square.length, y: P.square.reduce((t, p) => t + p[1], 0) / P.square.length } : P.front || { x: P.cx, y: P.cy };
  for (const c of out) c.f = Math.hypot(c.x - F.x, (c.y - F.y) * 1.3);
  return out.sort((a, b) => a.f - b.f);
}
/** Lay out a row's kit on this layout (deterministic: the same on every screen). A generator: stepped a few ms a frame (_vkStep), so
 *  laying out a fair never holds a frame up; run whole by the console's gardenKitDev. */
function* _vkPlanGen(row, m) {
  const P = gardenVillagePlaza(); if (!P || !row) return { pieces: [], why: ['no village plaza'] };
  yield;
  const ctx = _vkCtx(m, P), pieces = [], why = [], tally = new Map();
  yield;
  const place = function* (kind, cands, o) {
    o = o || {}; let n = 0;
    for (const c of cands) { if (++n % 16 === 0) yield; if (o.near && Math.hypot(c.x - o.near.x, c.y - o.near.y) > (o.nearR || 99)) continue; if (o.apart && pieces.some(q => q.kind === kind && Math.hypot(q.x - c.x, q.y - c.y) < o.apart)) continue; const w = _vkFits(kind, c.x, c.y, ctx, pieces); if (w) { const k = kind + ': ' + w.replace(/^by today’s .*/, 'by another piece'); tally.set(k, (tally.get(k) || 0) + 1); } if (!w) { const q = Object.assign({ kind, x: Math.round(c.x * 20) / 20, y: Math.round(c.y * 20) / 20, s: c.s }, o.extra || {}); pieces.push(q); return q; } }
    if (!o.quiet) why.push(kind + (o.extra && o.extra.who ? ':' + o.extra.who : '') + ' did not fit'); return null;
  };
  if (row.kit === 'market' || row.kit === 'fair') {
    const C = _vkCands(P, 'stall');
    // (a market keeps together: after the first stall, the next go as near the others as they fit)
    for (const [who, look] of row.keepers || []) { const st = pieces.filter(q => q.kind === 'stall'), cen = st.length ? { x: st.reduce((t, q) => t + q.x, 0) / st.length, y: st.reduce((t, q) => t + q.y, 0) / st.length } : null; yield* place('stall', cen ? C.slice().sort((a, b) => Math.hypot(a.x - cen.x, (a.y - cen.y) * 1.3) - Math.hypot(b.x - cen.x, (b.y - cen.y) * 1.3)) : C, { apart: 3.3, extra: { who, look } }); }
  }
  if (row.kit === 'fair') {
    const C = _vkCands(P, 'brazier');
    // the brazier near the middle of the fair: by the stalls, on the plaza's own side
    const st = pieces.filter(q => q.kind === 'stall'), mid = st.length ? { x: st.reduce((s, q) => s + q.x, 0) / st.length, y: st.reduce((s, q) => s + q.y, 0) / st.length } : { x: P.cx, y: P.cy };
    yield* place('brazier', C.slice().sort((a, b) => Math.hypot(a.x - mid.x, a.y - mid.y) - Math.hypot(b.x - mid.x, b.y - mid.y)), {});
    // lantern posts round the ring on the verge, each four to six cells on from the last, then bunting between neighbours
    const L = _vkCands(P, 'lantern').filter(c => c.out && !c.sq).sort((a, b) => a.s - b.s); let lastS = -99, n = 0;
    for (const c of L) { if (n >= 8) break; if (c.s - lastS < 4.2) continue; const q = yield* place('lantern', [c], { quiet: 1 }); if (q) { lastS = c.s; n++; } }
    // places to stand and watch: on the walk's inner edge, facing the middle
    for (const q of _vkRingWalk(P, 2.6)) { const x = q.x - q.nx * (P.half - 0.35), y = q.y - q.ny * (P.half - 0.35); if (!ctx.free(x, y) || (typeof _vfpBedAt === 'function' && _vfpBedAt(x, y)) || pieces.some(p => Math.hypot(p.x - x, p.y - y) < 1.8)) continue; pieces.push({ kind: 'watch', x, y, s: q.s, look: { x: P.cx, y: P.cy } }); if (pieces.filter(p => p.kind === 'watch').length >= 6) break; }
  }
  if (row.kit === 'cards') {
    // by the lamp nearest the plaza (a lamp of any kind within 12 cells of its middle), else round the ring
    const lamps = ctx.things.filter(t => t.kind === 'lamp' && Math.hypot(t.x - P.cx, t.y - P.cy) < 12 && _vkOpen(t.x, t.y, m)).sort((a, b) => Math.hypot(a.x - P.cx, a.y - P.cy) - Math.hypot(b.x - P.cx, b.y - P.cy));
    let got = null;
    for (const L of lamps) { const C = []; for (const [dx, dy] of [[2.2, 0.9], [-2.2, 0.9], [2.6, 1.6], [-2.6, 1.6], [0, 2.1], [3, 0.4], [-3, 0.4], [1.6, 2.4], [-1.6, 2.4]]) C.push({ x: L.x + dx, y: L.y + dy, s: 0 }); got = yield* place('table', C, { extra: { lamp: { x: L.x, y: L.y } } }); if (got) break; why.pop(); }
    if (!got) yield* place('table', _vkCands(P, 'table'), {});
  }
  // the plaza's middle, for a moment's opening: free ground nearest it
  let mid = null; for (let r = 0; r <= 4 && !mid; r += 0.5) for (let k = 0; k < (r ? 12 : 1); k++) { const a = k / 12 * Math.PI * 2, x = P.cx + Math.cos(a) * r, y = P.cy + 0.4 + Math.sin(a) * r * 0.7; if (ctx.free(x, y) && !pieces.some(p => Math.hypot(p.x - x, p.y - y) < 1.6)) { mid = { x, y }; break; } }
  return { pieces, why: why.concat([...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => k + ' x' + n)), mid, plaza: P.id };
}
/* ---------- today ---------- */
function _vkSouth(m) { return !!(m && m.south); }
function _vkRowNow(m) { if (!m || typeof valeYearToday !== 'function') return null; return valeYearToday(m.today, _vkSouth(m)); }
function _vkKey(m, row) {
  let id = ''; try { id = gardenIslandData().id; } catch (e) { id = ''; }
  // (not what is put down: the kit's own counters stop a thing being put down on them, and a re-lay-out each time you placed something
  // would rebuild every piece)
  return [row ? row.id : '-', m.today, id, (m.areas || []).length, m.visit ? 'v' + (m.visit.fid || '') : 'me'].join('|');
}
/** Today's kit, placed (cached by the day, the layout, the land and what is put down). null on an ordinary day or with no plaza. */
function gardenKitToday(m) {
  m = m || _vkM(); if (!m) return null;
  const row = _vkRowNow(m); if (!row) { if (_vk.plan || _vk.job) { _vk.plan = null; _vk.key = ''; _vk.job = null; _vk.things = null; _vk.solids = null; _vkSolidsChanged(); } return null; }
  if (typeof _gw === 'undefined' || !_gw.solids || !_gw.grid) return null;   // (walking is not known yet: placed once it is)
  const key = _vkKey(m, row);
  if (_vk.key !== key && (!_vk.job || _vk.job.key !== key)) _vk.job = { key, row, gen: _vkPlanGen(row, m), t0: performance.now() };   // (laid out over the next frames: _vkStep)
  return _vk.plan && _vk.plan.pieces.length && _vk.row && _vk.row.id === row.id && (_vk.key === key || _vk.job) ? { row: _vk.row, pieces: _vk.plan.pieces, mid: _vk.plan.mid } : null;   // (while a new lay-out is worked out, the one standing stays)
}
/** A few ms a frame of laying out the day's kit; when it is done, it is today's (and the walker's solids are read again). */
function _vkStep(budget) {
  const J = _vk.job; if (!J) return;
  const t0 = performance.now(); let r = null;
  try { do { r = J.gen.next(); } while (!r.done && performance.now() - t0 < budget); } catch (e) { console.error('[kit]', e); r = { done: true, value: { pieces: [], why: ['error'] } }; }
  if (!r.done) return;
  _vk.job = null; _vk.key = J.key; _vk.row = J.row; _vk.plan = r.value; _vk.why = r.value.why; _vk.ms = Math.round(performance.now() - J.t0); _vk.things = null; _vk.solids = null; _vkSolidsChanged();
}
function _vkPlanNow(row, m) { const g = _vkPlanGen(row, m); let r; do { r = g.next(); } while (!r.done); return r.value; }
function gardenKitMark(name) { if (!_vk.plan) return null; if (name === 'middle') return _vk.plan.mid || null; return null; }
/** The kit's places for the folk's place finder: one thing a place, each with its own stand (so the booking puts one villager on each),
 *  and each drawn piece as a thing too (nobody else stands in it). */
function gardenKitThings() {
  const K = gardenKitToday(); if (!K) return [];
  if (_vk.things && _vk.thingsKey === _vk.key) return _vk.things;
  const out = [], day = K.row.id;
  K.pieces.forEach((q, i) => {
    if (q.kind === 'watch') { out.push({ id: 'vk-w' + i, kind: 'vk-watch', x: q.x, y: q.y, w: 0.5, kit: true, flat: true, kitDay: day, spots: [{ act: 'watch', stand: { x: q.x, y: q.y }, deg: 90, kit: true, look: q.look }] }); return; }
    const P = VK_PIECES[q.kind]; if (!P) return;
    out.push({ id: 'vk-p' + i, kind: 'vk-piece', x: q.x, y: q.y, w: P.hw * 2, h: P.rise, kit: true, kitDay: day, name: P.name });
    (VK_SPOTS[q.kind] || []).forEach((s, j) => {
      const kind = s.k === 'keep' ? 'vk-keep-' + q.who : 'vk-' + s.k, x = q.x + s.dx, y = q.y + s.dy;
      out.push({ id: 'vk-s' + i + '-' + j, kind, x, y, w: 0.5, kit: true, flat: true, kitDay: day, piece: i, spots: [{ act: s.act, stand: { x, y }, deg: 90, seat: s.seat, kit: true, look: { x: q.x + s.look[0], y: q.y + s.look[1] - 0.3 } }] });
    });
  });
  _vk.things = out; _vk.thingsKey = _vk.key;
  return out;
}
function gardenKitSpots(t) { return t && Array.isArray(t.spots) ? t.spots : []; }
/** What stops your feet: a stall's counter (the front strip: its keeper stands behind it), the brazier, the table, a lantern's post. */
function gardenKitSolids() {
  if (!_vk.plan || !_vk.plan.pieces.length) return [];
  if (_vk.solids) return _vk.solids;
  const out = [];
  for (const q of _vk.plan.pieces) {
    const P = VK_PIECES[q.kind]; if (!P) continue;
    if (q.kind === 'stall') out.push({ x0: q.x - P.hw + 0.1, y0: q.y - 0.36, x1: q.x + P.hw - 0.1, y1: q.y + 0.02, src: 'festival stall' });
    else if (q.kind === 'table') out.push({ x0: q.x - 0.45, y0: q.y - 0.3, x1: q.x + 0.45, y1: q.y + 0.02, src: 'card table' });
    else if (q.kind === 'brazier') out.push({ x0: q.x - 0.38, y0: q.y - 0.32, x1: q.x + 0.38, y1: q.y + 0.04, src: 'the brazier' });
    else if (q.kind === 'lantern') out.push({ x0: q.x - 0.16, y0: q.y - 0.14, x1: q.x + 0.16, y1: q.y + 0.04, src: 'lantern post' });
  }
  _vk.solids = out; return out;
}
/** The walker's solids are rebuilt when the scan's revision moves: the kit coming or going is such a change. */
function _vkSolidsChanged() { try { if (typeof _gks !== 'undefined') _gks.rev = (_gks.rev || 0) + 1; } catch (e) { /* walking will catch up */ } }
/* ---------- painting (the cast's hand: a shade side, the lit side toward the upper left, a glaze, no outlines; a contact shadow and wear
   round every foot, rule 13). Sizes against H (GARDEN_H, about 41 px): a stall 2.2 H, the table 0.55 H, the brazier 0.9 H, a lantern
   post 1.9 H (rule 14). ---------- */
function _vkTone(c) { const A = GART; return [c, A.mix(c, '#2c3424', 0.32), A.mix(c, '#fff2d2', 0.34), A.mix(c, '#1c1a14', 0.55)]; }
function _vkFoot(w, seed, worn) {
  const A = GART, r = A.rng('vkf' + seed); let s = A.shadow(w * 0.62, w * 0.12) + (worn ? A.P('#7a6244', A.ell(0, 1, w * 0.52, w * 0.1), 0.22) : '');
  for (let i = 0; i < 7; i++) { const x = (r() - 0.5) * w * 1.1, h = 2.5 + r() * 3.4, c = r() < 0.5 ? '#5e7a40' : '#7a9a52'; s += A.S(c, 1, `M${x.toFixed(1)} 1.4q${(r() - 0.5).toFixed(1)} ${(-h * 0.6).toFixed(1)} ${(r() * 1.6 - 0.8).toFixed(1)} ${(-h).toFixed(1)}`, 0.8); }
  return s;
}
function _vkPole(x, top, c) { const A = GART, t = _vkTone(c || '#8a6a46'); return A.P(t[1], A.rect(x - 2.2, top, 4.4, -top)) + A.P(t[0], A.rect(x - 2.2, top, 2.8, -top)) + A.P(t[2], A.rect(x - 2.2, top, 1.1, -top), 0.7) + A.P(t[3], A.circ(x, top, 2.8)) + A.P(t[2], A.circ(x - 0.8, top - 0.8, 1.1), 0.8); }
function _vkGoods(kind, r) {
  const A = GART; let s = '';
  if (kind === 'honey' || kind === 'cakes') {
    for (let i = 0; i < 7; i++) {
      const x = -36 + i * 12, y = -31 + (i % 2) * 1.2;
      if (kind === 'honey') s += A.P('#8a5a18', A.rrect(x - 4.4, y - 9, 8.8, 10, 2.2)) + A.P('#e8a028', A.rrect(x - 3.8, y - 8.2, 7, 8.6, 2)) + A.P('#ffe08a', A.rrect(x - 2.8, y - 7, 2.2, 5.6, 1), 0.8) + A.P('#f4ecd8', A.rrect(x - 4.8, y - 11.2, 9.6, 3, 1)) + A.P('#c84a3a', A.rect(x - 4.8, y - 10.4, 9.6, 1), 0.7);
      else s += A.P('#e8e2d4', A.ell(x, y + 0.6, 6, 1.8)) + A.P('#a8642a', A.ell(x, y - 2.4, 5, 3.4)) + A.P('#d8963c', A.ell(x - 0.4, y - 3.2, 4.2, 2.4)) + A.P('#f2c46a', A.ell(x - 1.4, y - 4.2, 1.8, 0.8), 0.8) + A.P('#fff8e8', A.ell(x + 0.6, y - 5.2, 2.2, 0.7), 0.85);
    }
  } else if (kind === 'maps') {
    s += A.P('#e8dcb8', 'M-38 -34L-6 -36L-4 -24L-40 -22z') + A.S('#8a6a44', 0.7, 'M-34 -31q8 4 14 -2t12 2M-30 -27l6 -1', 0.7) + A.P('#5a8a5a', A.circ(-17, -29, 2.2), 0.6) + A.P('#4a7aa8', 'M-12 -33q3 4 0 8', 0.5);
    for (let i = 0; i < 5; i++) { const x = 4 + i * 8, h = 13 + (i % 3) * 3; s += A.P('#d8c8a0', A.rrect(x - 2.6, -24 - h, 5.2, h, 2.4)) + A.P('#f4ead2', A.rrect(x - 2, -24 - h + 0.6, 2.2, h - 1.2, 1), 0.8) + A.P('#a8442e', A.rect(x - 2.6, -30 - h * 0.3, 5.2, 1.4), 0.8); }
  } else if (kind === 'stones') {
    for (let i = 0; i < 3; i++) { const x = -30 + i * 30; s += A.P('#7a5a3a', A.rrect(x - 12, -28, 24, 5, 1.4)); for (let j = 0; j < 5; j++) { const c = ['#9aa4aa', '#b8b0a0', '#7a8a92', '#c8c0b0', '#8a948a'][(i * 5 + j) % 5], sx = x - 8 + j * 4 + (r() - 0.5) * 1.6, sy = -29 - (j % 2) * 1.6; s += A.P(A.mix(c, '#2a2a2a', 0.3), A.ell(sx + 0.4, sy + 0.5, 3, 1.9)) + A.P(c, A.ell(sx, sy, 2.8, 1.7)) + A.P('#ffffff', A.ell(sx - 0.8, sy - 0.6, 1, 0.5), 0.5); } }
  } else if (kind === 'stamps' || kind === 'cards') {
    for (let i = 0; i < 6; i++) { const x = -36 + i * 14, c = ['#c84a3a', '#3a6aa8', '#5a8a4a', '#d8a030', '#8a4a8a', '#3a8a8a'][i]; s += A.P('#3a2a1c', A.rect(x - 0.5, -38, 1, 12), 0.5) + A.P('#f8f2e4', A.rect(x - 5, -38, 10, kind === 'cards' ? 12 : 8)) + A.P(c, A.rect(x - 3.6, -36.6, 7.2, kind === 'cards' ? 5 : 5.2), 0.85); if (kind === 'cards') s += A.S('#fbf5ec', 0.8, `M${x - 2} -32.6l2 -2.4l2 2.4`, 0.9); }
  }
  return s;
}
/** A market stall: a striped awning on two posts, a counter with a cloth, the goods, a painted sign. About 2.2 H tall, 2.2 cells wide. */
function _vkStallSvg(look, seed) {
  const A = GART, r = A.rng('vks' + seed), W = 44, a = look.awning || ['#c8442e', '#fbf5ec'], ta = _vkTone(a[0]), tb = _vkTone(a[1]), wood = _vkTone('#8a6a46');
  let s = _vkFoot(W * 2.1, seed, true);
  // back posts and the back cloth, then the front posts
  s += A.P(wood[3], A.rect(-W + 3, -72, 3, 50), 0.8) + A.P(wood[3], A.rect(W - 6, -72, 3, 50), 0.8);
  s += A.P(A.mix(a[0], '#3a2a1c', 0.45), A.rect(-W + 5, -68, W * 2 - 10, 34), 0.5);
  // the counter: a box with a cloth over its top and front
  s += A.P(wood[1], A.rrect(-W, -27, W * 2, 27, 1.8)) + A.P(wood[0], A.rrect(-W, -27, W * 2 - 5, 24, 1.8)) + A.P(wood[2], A.rect(-W, -27, W * 2, 2.4), 0.7);
  s += A.S(wood[1], 1, `M${-W + 14} -22v20M${-W + 32} -22v20M${W - 32} -22v20M${W - 14} -22v20`, 0.5);
  s += A.P(tb[0], `M${-W - 1.5} -28h${W * 2 + 3}l-2 11h${-W * 2 + 1}z`) + A.P(tb[1], `M${-W - 1.5} -19h${W * 2 + 3}l-1 2.4h${-W * 2 + 1}z`, 0.8);
  for (let i = 0; i < 7; i++) { const x = -W + 5 + i * 12.6; s += A.P(i % 2 ? ta[0] : ta[1], `M${x} -17.4l5 0l-1 6h-3z`, 0.75); }
  s += _vkGoods(look.goods, r);
  // front posts
  s += _vkPole(-W + 2, -74, '#8a6a46') + _vkPole(W - 2, -74, '#8a6a46');
  // the awning: scalloped stripes, lit from the upper left
  const sl = -W - 7, sr = W + 7, top = -88, lo = -70;
  for (let i = 0; i < 8; i++) { const x0 = sl + i * (sr - sl) / 8, x1 = sl + (i + 1) * (sr - sl) / 8, t = i % 2 ? tb : ta; s += A.P(t[1], `M${x0} ${lo}L${x1} ${lo}L${x1 - 1.8} ${top}L${x0 + 1.8} ${top}z`) + A.P(t[0], `M${x0} ${lo}L${x1 - 2.4} ${lo}L${x1 - 3.4} ${top + 1}L${x0 + 1.8} ${top + 1}z`); s += A.P(t[0], `M${x0} ${lo}h${x1 - x0}l0 3.4q${-(x1 - x0) / 2} 6 ${-(x1 - x0)} 0z`) + A.P(t[1], `M${x0} ${lo + 2.6}q${(x1 - x0) / 2} 5.4 ${x1 - x0} 0`, 0.35); }
  s += A.P('#fff8e8', `M${sl + 3} ${top + 1}L${sl + 30} ${top + 1}L${sl + 24} ${lo}z`, 0.16) + A.P(ta[3], A.rect(sl, top - 2, sr - sl, 3), 0.8);
  // the sign on the awning's ridge
  if (look.sign) { const tw = Math.max(34, look.sign.length * 6.4 + 10); s += A.P(wood[1], A.rrect(-tw / 2, top - 18, tw, 15, 2.4)) + A.P('#f4ead2', A.rrect(-tw / 2 + 1.2, top - 17, tw - 2.4, 12.6, 1.8)) + `<text x="0" y="${top - 7.6}" text-anchor="middle" font-size="9" font-family="Georgia,serif" font-style="italic" font-weight="600" fill="#5a3a22">${esc(look.sign)}</text>` + A.S('#6a5034', 1, `M${-tw / 2 + 5} ${top - 18}l4 -6M${tw / 2 - 5} ${top - 18}l-4 -6`); }
  return s;
}
/** The brazier: an iron basket on three legs, coals and flames (lit at the fair's hours), a few logs beside it. About 0.9 H. */
function _vkBrazierSvg(lit) {
  const A = GART, iron = ['#3e4246', '#2a2c30', '#6a7078'];
  let s = A.P('#2a2018', A.ell(0, 1, 26, 5.4), 0.28) + A.P('#5a4a3a', A.ell(0, 0.6, 18, 3.4), 0.4) + _vkFoot(40, 'brz', false);
  s += A.S(iron[0], 2.6, 'M-11 0L-7 -18M11 0L7 -18M0 2L0 -16') + A.S(iron[2], 0.8, 'M-11.6 -1L-7.6 -17', 0.5);
  s += A.P(iron[1], 'M-15 -18Q-14 -34 0 -34Q14 -34 15 -18z') + A.P(iron[0], 'M-15 -18Q-14 -32 -2 -33.4L-3 -18z') + A.S(iron[2], 1, 'M-13 -22h26M-12 -27h24', 0.5) + A.S(iron[1], 1.6, 'M-15 -33.6h30');
  s += A.P(lit ? '#c8401e' : '#4a3a30', A.ell(0, -34, 14, 3.4)) + (lit ? A.P('#ff8a3a', A.ell(-2, -34.6, 9, 2), 0.8) : '');
  if (lit) s += `<g class="gl-glow-soft">${A.P('#e8602a', 'M-9 -34C-12 -44 -4 -48 -3 -58C3 -50 6 -54 8 -60C11 -50 13 -42 9 -34z')}${A.P('#ffb23a', 'M-5 -34C-6 -41 0 -44 0 -51C4 -45 6 -42 5 -34z')}${A.P('#fff2c0', A.ell(0, -38, 2.4, 3), 0.85)}</g>`;
  s += A.P('#6a4a2e', A.rrect(16, -6, 16, 5, 2.4)) + A.P('#8a6a46', A.rrect(18, -11, 14, 5, 2.4)) + A.P('#c8a878', A.circ(31, -3.5, 2.2) + A.circ(31, -8.5, 2.2), 0.9);
  return s;
}
/** A lantern post: a post with a crook and a paper lantern, lit at dusk. About 1.9 H. */
function _vkLanternSvg(c, lit) {
  const A = GART, t = _vkTone(c), H = 76;
  let s = _vkFoot(14, 'lan' + c, false) + _vkPole(0, -H, '#6a4a2e') + A.S('#4a3424', 2.6, `M0 ${-H}q0 -8 10 -8q5 0 5 5`) + A.S('#3a2a1c', 0.8, `M15 ${-H - 3}v5`);
  const y = -H + 2;
  s += A.P(t[1], A.ell(15, y + 8, 8, 9.6)) + A.P(lit ? A.mix(c, '#fff2c0', 0.5) : t[0], A.ell(14, y + 7.2, 6.6, 8.6)) + A.P(lit ? '#fff4c8' : t[2], A.ell(12.4, y + 4.6, 2.4, 3.6), lit ? 0.95 : 0.6);
  s += A.S(t[3], 0.6, `M10 ${y + 2}q5 5 0 11M15 ${y - 2}v18M20 ${y + 2}q-5 5 0 11`, 0.45) + A.P('#3a2a1c', A.rect(11, y - 2.6, 8, 2) + A.rect(11.6, y + 15.6, 7, 1.6));
  return s;
}
/** Bunting strung between two lantern posts' crooks: a sagging cord and pennants, in the fair's colours (no poles: the posts are). */
function _vkBuntingSvg(dx, dy, seed) {
  const A = GART, r = A.rng('vkb' + seed), cols = ['#d8352a', '#fbf5ec', '#3a6a4a', '#f2c43a', '#3f7fa8'], H = 73, W = GARDEN_WORLD;
  const x1 = dx * W.cellW, y1 = dy * W.cellH, L = Math.hypot(x1, y1), sag = Math.min(24, 6 + L * 0.07);
  const p = (t) => ({ x: x1 * t, y: -H + y1 * t + sag * 4 * t * (1 - t) });
  let s = A.S('#5a4630', 1.4, `M0 ${-H}Q${x1 / 2} ${-H + y1 / 2 + sag * 2} ${x1} ${-H + y1}`, 0.85);
  const n = Math.max(3, Math.floor(L / 17));
  for (let i = 0; i < n; i++) { const q = p((i + 0.5) / n), c = cols[i % cols.length], t = _vkTone(c), fw = 5.6, fh = 10 + r() * 2.4, lean = (r() - 0.5) * 2; s += A.P(t[1], `M${(q.x - fw).toFixed(1)} ${q.y.toFixed(1)}L${(q.x + fw).toFixed(1)} ${q.y.toFixed(1)}L${(q.x + lean).toFixed(1)} ${(q.y + fh).toFixed(1)}z`) + A.P(t[0], `M${(q.x - fw).toFixed(1)} ${q.y.toFixed(1)}L${(q.x + fw * 0.35).toFixed(1)} ${q.y.toFixed(1)}L${(q.x + lean - 0.6).toFixed(1)} ${(q.y + fh - 1).toFixed(1)}z`); }
  return s;
}
/** The card table: a folding table with a cloth, a hand of cards dealt, a jar lantern lit in the evening; two stools beside it. */
function _vkTableSvg(lit) {
  const A = GART, wood = _vkTone('#8a6a46'), cloth = _vkTone('#3a6a4a');
  let s = _vkFoot(120, 'tbl', true);
  for (const x of [-44, 44]) s += A.P('#2a2418', A.ell(x, 0.6, 9, 2.2), 0.25) + A.P(wood[1], A.rect(x - 7, -13, 2.6, 13) + A.rect(x + 4.4, -13, 2.6, 13)) + A.P(wood[0], A.rrect(x - 9, -16, 18, 4.4, 1.8)) + A.P(wood[2], A.rect(x - 9, -16, 18, 1.4), 0.7);
  s += A.S(wood[1], 2.4, 'M-14 0L10 -20M14 0L-10 -20') + A.S(wood[2], 0.8, 'M-14.6 -1L9.4 -21', 0.5);
  s += A.P(cloth[1], A.rrect(-20, -24, 40, 6, 1.6)) + A.P(cloth[0], A.rrect(-20, -24, 37, 5, 1.6)) + A.P(cloth[1], 'M-20 -19h40l-2 6h-36z', 0.9) + A.P(cloth[2], A.rect(-19, -24, 34, 1.2), 0.6);
  for (let i = 0; i < 5; i++) s += `<g transform="translate(${-11 + i * 2.6} -25) rotate(${-20 + i * 10})">${A.P('#f8f2e4', A.rect(-2.2, -5.4, 4.4, 6))}${A.P(i % 2 ? '#c84a3a' : '#3a4a6a', A.rect(-1.2, -4.4, 2.4, 2.2), 0.8)}</g>`;
  s += A.P('#f8f2e4', A.rect(4, -27, 6, 4)) + A.P('#3a4a6a', A.rect(5, -26.4, 4, 2.6), 0.6);
  s += A.P('#c8d8d0', A.rrect(12, -34, 7, 10, 2), 0.7) + A.P(lit ? '#ffe08a' : '#e8d8a8', A.ell(15.5, -28, 2, 3), lit ? 0.95 : 0.5) + A.P('#4a4e52', A.rect(12, -35.6, 7, 2));
  return s;
}
/* ---------- the sprites: built one a frame while the kit is out; lit and unlit swapped when the hour turns ---------- */
function _vkLit(m) { return !!m && (m.tod === 'dusk' || m.tod === 'night' || (m.tod === 'evening')); }
function _vkPieceSvg(q, i, lit) {
  if (q.kind === 'stall') return _vkStallSvg(VALE_STALLS[q.look] || {}, q.look + i);
  if (q.kind === 'brazier') return _vkBrazierSvg(true);
  if (q.kind === 'lantern') return _vkLanternSvg(['#d8352a', '#f2c43a', '#e8806a', '#f4e4a8'][i % 4], lit);
  if (q.kind === 'table') return _vkTableSvg(lit);
  return '';
}
function _vkUp(m) {
  const K = gardenKitToday(m), want = new Map();
  if (K) K.pieces.forEach((q, i) => { if (VK_PIECES[q.kind]) want.set('p' + i + '|' + _vk.key, { q, i }); });
  // bunting between neighbouring lantern posts (each span its own sprite, hung from the left post's crook)
  if (K && K.row.kit === 'fair') { const L = K.pieces.map((q, i) => ({ q, i })).filter(o => o.q.kind === 'lantern').sort((a, b) => a.q.s - b.q.s); for (let k = 1; k < L.length; k++) { const a = L[k - 1].q, b = L[k].q, d = Math.hypot(b.x - a.x, b.y - a.y); if (d > 2.4 && d < 8.5) want.set('b' + k + '|' + _vk.key, { bunting: [a, b], i: k }); } }
  for (const [k, S] of _vk.S) if (!want.has(k)) { try { S.remove(); } catch (e) { /* gone */ } _vk.S.delete(k); }
  _vk.queue = [...want.entries()].filter(([k]) => !_vk.S.has(k));
  const lit = _vkLit(m);
  if (_vk.lit !== lit) { _vk.lit = lit; for (const [k, S] of _vk.S) { const o = S._vk; if (o && o.q && (o.q.kind === 'lantern' || o.q.kind === 'table')) wdArt(S, _vkPieceSvg(o.q, o.i, lit)); } }
}
function _vkBuildOne() {
  const job = _vk.queue.shift(); if (!job) return;
  const [k, o] = job; if (_vk.S.has(k)) return;
  let S = null;
  if (o.bunting) { const [a, b] = o.bunting, l = a.x <= b.x ? a : b, r = l === a ? b : a; S = wdSprite({ id: 'vk-' + k.split('|')[0], x: l.x, y: Math.max(l.y, r.y) + 0.01, still: true, ground: true, hit: 0, svg: `<g transform="translate(0 ${((l.y - Math.max(l.y, r.y)) * GARDEN_WORLD.cellH).toFixed(1)})">${_vkBuntingSvg(r.x - l.x, r.y - l.y, o.i)}</g>`, lift: 0, update() { } }); }
  else { const q = o.q, P = VK_PIECES[q.kind]; const click = q.kind === 'stall' ? () => { if (typeof gardenYearStall === 'function') gardenYearStall(q, _vk.row); } : q.kind === 'brazier' ? () => { if (typeof gardenYearWarm === 'function') gardenYearWarm(q, _vk.row); } : q.kind === 'table' ? () => { if (typeof gardenYearCards === 'function') gardenYearCards(q, _vk.row); } : null;
    S = wdSprite(Object.assign({ id: 'vk-' + k.split('|')[0], x: q.x, y: q.y, still: true, ground: true, hit: q.kind === 'lantern' ? 0 : q.kind === 'stall' ? 1.05 : 0.55, hitUp: q.kind === 'stall' ? 40 : 16, label: q.kind === 'stall' ? ((VALE_STALLS[q.look] || {}).sign || 'Stall') : P.name.replace(/^the /, 'The '), svg: _vkPieceSvg(q, o.i, _vk.lit), lift: 0, update() { } }, click ? { cursor: 'hand', onClick: click } : {})); }
  if (S) { S._vk = o; _vk.S.set(k, S); }
}
function _vkGlows(m) {
  if (!_vk.plan || !_vk.lit) { for (const id of _vk.glowIds || []) wdGlowOff(id); _vk.glowIds = []; return; }
  const ids = [];
  _vk.plan.pieces.forEach((q, i) => {
    if (q.kind === 'lantern') { const id = 'vkg' + i; ids.push(id); wdGlow(id, '<circle cx="15" cy="-62" r="30" fill="#ffc768" opacity="0.2"/><circle cx="15" cy="-62" r="11" fill="#ffe2a0" opacity="0.42"/>', q.x, q.y); }
    else if (q.kind === 'brazier') { const id = 'vkg' + i; ids.push(id); wdGlow(id, '<circle cy="-40" r="44" fill="#ff9a3a" opacity="0.22"/><circle cy="-40" r="16" fill="#ffc768" opacity="0.45"/>', q.x, q.y); }
    else if (q.kind === 'table') { const id = 'vkg' + i; ids.push(id); wdGlow(id, '<circle cx="15" cy="-28" r="26" fill="#ffd27a" opacity="0.2"/>', q.x, q.y); }
  });
  for (const id of _vk.glowIds || []) if (!ids.includes(id)) wdGlowOff(id);
  _vk.glowIds = ids;
}
function _vkDown() { for (const S of _vk.S.values()) { try { S.remove(); } catch (e) { /* gone */ } } _vk.S.clear(); _vk.queue = []; for (const id of _vk.glowIds || []) wdGlowOff(id); _vk.glowIds = []; }
/** The runner planned the day before the kit could be placed (walking not known yet): it plans again once the kit is out. */
function _vkReplan(m) {
  if (typeof _vfr === 'undefined' || !_vfr.on || m.visit || !_vk.plan) return;
  const k = _vk.key; if (_vk.replanAsked === k) return;
  const has = _vfr.ctx && _vfr.ctx.things && _vfr.ctx.things.some(t => t.kit);
  _vk.replanAsked = k;
  if (!has && _vk.plan.pieces.length) _vfr.key = 'kit';   // (the runner's own tick plans again, when you are not walking)
}
/* ---------- your moves at the kit: the prompt's rows (asked through the games' rows) ---------- */
function gardenKitActRows(px, py) {
  const out = []; if (!_vk.plan || !_vk.plan.pieces.length) return out;
  const day = _vk.row;
  _vk.plan.pieces.forEach((q, i) => {
    const d = Math.hypot(q.x - px, (q.y + 0.4 - py) * 1.3);
    if (q.kind === 'stall' && d < 2.2) out.push({ key: 'vk-stall:' + i, act: 'kit', src: 'vk:' + i, run: () => { if (typeof gardenYearStall === 'function') gardenYearStall(q, day); }, words: 'Look at the ' + ((VALE_STALLS[q.look] || {}).sign || 'stall').toLowerCase(), x: q.x, y: q.y, promptY: q.y - 3.4, pri: 0.7 });
    else if (q.kind === 'brazier' && d < 2.0) out.push({ key: 'vk-brazier', act: 'kit', src: 'vk:' + i, run: () => { if (typeof gardenYearWarm === 'function') gardenYearWarm(q, day); }, words: 'Warm your hands', x: q.x, y: q.y, promptY: q.y - 2.2, pri: 0.7 });
    else if (q.kind === 'table' && d < 2.4) out.push({ key: 'vk-table', act: 'kit', src: 'vk:' + i, run: () => { if (typeof gardenYearCards === 'function') gardenYearCards(q, day); }, words: 'Sit in at cards', x: q.x, y: q.y, promptY: q.y - 1.8, pri: 0.7 });
  });
  return out;
}
/** For the console and the sandbox check: what was placed, and what was left out and why. */
function gardenKitDev(id) {
  const m = _vkM(); const P = gardenVillagePlaza();
  if (id) { const row = VALE_YEAR_ROW.get(id); const t0 = performance.now(), p = _vkPlanNow(row, m), ms = Math.round(performance.now() - t0); return JSON.stringify({ plaza: P && P.id, rows: _vk.pzRows, ring: P && P.ring.length, half: P && P.half, ms, pieces: p.pieces.map(q => [q.kind, q.who || '', +q.x.toFixed(2), +q.y.toFixed(2)]), why: p.why.filter((w, i, a) => a.indexOf(w) === i), mid: p.mid }); }
  const K = gardenKitToday(m); return JSON.stringify({ plaza: P && P.id, row: K && K.row.id, ms: _vk.ms, job: !!_vk.job, pieces: K ? K.pieces.map(q => [q.kind, q.who || '', q.x, q.y]) : [], why: _vk.why, sprites: _vk.S.size, queue: _vk.queue.length });
}
wdMod({
  id: 'vale-kit', pref: 'folk', visit: true,
  begin() { _vk.key = ''; _vk.lit = null; },
  frame() { if (_vk.job) { _vkStep(typeof wdWalkingLately === 'function' && wdWalkingLately() ? 2 : 5); return; } if (_vk.queue.length && !(typeof wdWalkingLately === 'function' && wdWalkingLately() && _vk.S.size)) { try { _vkBuildOne(); } catch (e) { console.error('[kit]', e); _vk.queue.shift(); } } },
  tick(m) {
    try {
      if (!(typeof gardenFolkLive === 'function' && (gardenFolkLive() || m.visit))) { if (_vk.S.size) _vkDown(); return; }
      _vkUp(m); _vkReplan(m);
      if (performance.now() - _vk.glowT > 1800) { _vk.glowT = performance.now(); _vkGlows(m); }
    } catch (e) { console.error('[kit]', e); }
  },
  end() { _vkDown(); _vk.job = null; if (_vk.plan) { _vk.plan = null; _vk.key = ''; _vk.things = null; _vk.solids = null; _vkSolidsChanged(); } },
});
