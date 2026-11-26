/* ============================================================
   ROCK POOLS, DRAWN (the tide, phase 2). On any rocky shore (94-garden-tide-0rules.js: tidal ground near rock, fallen masonry
   or anything that stands on rock), pools sit in shelves of rock in the lower half of the beach: under the water at high tide,
   left full and still at low water. Chosen by rule from the shore table, never by place: a new rocky shore gets its pools with
   no code.
     gardenTidePools()   [{id, n, x, y (cells), rx (px), seed, zone, stones}] the same on every screen
   The picture is a part of the painted vale (GardenPaintVale.parts): baked into the vale's ground with the beach, under the
   tide's water, in the opening scenes' style (lobed slabs lit from the upper left, no outlines): a shelf of weathered rock,
   barnacles and a limpet or two, a fringe of weed on the sea side, and the pool itself with the sky in it, a red anemone, a
   few pebbles on its floor. The stones that wobble at low water are live sprites (94-garden-tide-4pools.js).
   ============================================================ */
const _gtp = { key: '', list: [] };
const GT_ROCK = Object.freeze({ rockDk: '#5e584c', rockLo: '#857c6a', rock: '#a49b88', rockHi: '#cbc4b0', lichen: '#b8b46a', wet: '#6a6458', weed: ['#4f6a34', '#6a7e3e', '#8a8a4a'], pool: '#5f9296', poolDk: '#3e6e76', sky: '#d6ecea', anem: '#c8484a', anemHi: '#f08a7a', star: '#e0885a', barn: '#ece6d6' });
/** Where the pools are: rocky tidal cells in the lower half of the beach, clear of paths and standing things, a few cells apart. */
function gardenTidePools() {
  let S = null; try { S = gardenTideShore(); } catch (e) { return []; }
  if (_gtp.key === S.lay) return _gtp.list;
  const W = GARDEN_WORLD, D = gardenIslandData(), statics = D.static || [], cands = [], out = [];
  for (const c of S.list) {
    if (c.k !== 2) continue;
    const b = gardenIslandBaseCell(c.x, c.y); if (!b || b.route || b.staticId || b.reserved || b.solid) continue;
    if (statics.some(s => c.x + .5 > s.x - .9 && c.x + .5 < s.x + (s.w || 1) + .9 && c.y + .5 > s.y - .7 && c.y + .5 < s.y + (s.h || 1) + .7)) continue;
    let near = false; for (const [dx, dy] of [[1, 0], [-1, 0]]) { const q = gardenIslandBaseCell(c.x + dx, c.y + dy); if (q && q.staticId) near = true; } if (near) continue;
    const d = gardenIslandCoastDistance(c.x + .5, c.y + .5); if (d < 7 || d > 46) continue;
    cands.push({ x: c.x, y: c.y, d, zone: c.zone, h: gardenHash('tide-pool|' + c.x + ',' + c.y) });
  }
  cands.sort((a, b) => a.h - b.h);
  for (const c of cands) {
    if (out.some(p => Math.hypot(p.x - c.x - .5, (p.y - c.y - .5) * 1.3) < 2.6)) continue;
    const r = gardenRand(c.h), x = c.x + .5 + (r() - .5) * .36, y = c.y + .5 + (r() - .5) * .24;
    // the way to the sea from here (a few coast distances round it): the shelf leans that way, the weed is on that side
    const e = .4, gx = gardenIslandCoastDistance(x + e, y) - gardenIslandCoastDistance(x - e, y), gy = gardenIslandCoastDistance(x, y + e) - gardenIslandCoastDistance(x, y - e), gl = Math.hypot(gx, gy) || 1;
    out.push(Object.freeze({ id: 'tp' + c.x + '-' + c.y, n: out.length, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, rx: 15 + r() * 7, seed: c.h, zone: c.zone, d: c.d, sx: -gx / gl, sy: -gy / gl, stones: 1 + (c.h % 3 === 0 ? 1 : 0) }));
    if (out.length >= 24) break;
  }
  _gtp.key = S.lay; _gtp.list = out;
  return out;
}
/** The rock shelf and its pool, into a 2D context at world px (B: the paint kit's brush). */
function _gtpPaint(B, kit, p, W) {
  const cx = p.x * W.cellW, cy = W.sky + p.y * W.cellH, r = kit.rng(p.seed), P = GT_ROCK, rx = p.rx, ry = rx * .46, sx = p.sx, sy = p.sy;
  // the shelf: three to five slabs round the pool, the lowest on the sea side, wet and dark where the water reaches
  B.shadow(cx + 3, cy + ry * .9, rx * 1.9, ry * 1.3, .16, '#3a3428');
  const slabs = 3 + Math.floor(r() * 3);
  for (let i = 0; i < slabs; i++) {
    const a = (i / slabs) * Math.PI * 2 + r() * .8, d = rx * (.82 + r() * .3), x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * .5, w = rx * (.5 + r() * .35), h = w * (.42 + r() * .12), sea = Math.cos(a) * sx + Math.sin(a) * sy;
    B.f(B.blob(r, x + 1.5, y + h * .35, w, h * .9, 8, .3), P.rockDk, .5);
    B.f(B.blob(r, x, y, w, h, 8, .32), sea > .3 ? P.wet : P.rockLo);
    B.f(B.blob(r, x - w * .14, y - h * .22, w * .8, h * .66, 8, .3), sea > .3 ? P.rockLo : P.rock);
    B.f(B.blob(r, x - w * .32, y - h * .4, w * .4, h * .26, 6, .3), P.rockHi, sea > .3 ? .45 : .8);
    // barnacles and a limpet on the dry top
    for (let k = 0, n = 3 + Math.floor(r() * 5); k < n; k++) B.f(B.circ(x + (r() - .5) * w * 1.1, y + (r() - .6) * h * .9, .7 + r() * .6), P.barn, .8);
    if (r() < .5) { const lx = x + (r() - .5) * w * .6, ly = y - h * .1; B.f(B.ell(lx + .5, ly + .7, 2.6, 1.2), P.rockDk, .4).f(`M${lx - 2.6} ${ly + .6}Q${lx} ${ly - 3} ${lx + 2.6} ${ly + .6}Z`, '#c8bca0', .95).s(`M${lx - 1.4} ${ly}L${lx} ${ly - 2}M${lx + 1.4} ${ly}L${lx} ${ly - 2}`, '#8a7a5a', .4, .7); }
    if (sea > .2) for (let k = 0; k < 5; k++) { const wx = x + (r() - .5) * w * 1.2, wy = y + h * (.3 + r() * .4); B.s(`M${wx} ${wy}q${(r() - .5) * 4} ${2 + r() * 3} ${(r() - .5) * 6} ${4 + r() * 3}`, P.weed[k % 3], 1.4 + r(), .85); }
  }
  // the pool: dark at its rim, the sky in it, a pebbly floor showing through near the edge
  const pool = B.blob(r, cx, cy, rx, ry, 10, .22);
  B.f(B.blob(r, cx + 1, cy + 1.6, rx * 1.08, ry * 1.12, 10, .2), P.rockDk, .55);
  B.f(pool, P.pool);
  B.cx.save(); B.cx.clip(typeof pool === 'string' ? new Path2D(pool) : pool);
  for (let k = 0; k < 7; k++) B.f(B.ell(cx + (r() - .5) * rx * 1.5, cy + (r() - .3) * ry * 1.2, 2 + r() * 2.4, 1.2 + r() * 1.2), ['#8a8a78', '#9a927c', '#7a7a6c'][k % 3], .5);
  B.f(B.ell(cx - rx * .18, cy - ry * .3, rx * .8, ry * .5), P.sky, .5);
  B.f(B.ell(cx - rx * .34, cy - ry * .44, rx * .32, ry * .16), '#ffffff', .45);
  B.s(B.blob(r, cx, cy - ry * .15, rx * .96, ry * .9, 10, .2), P.poolDk, 2.2, .35);
  // a red anemone, now and then a starfish on the floor
  { const ax = cx + rx * (.35 - r() * .2), ay = cy + ry * (.15 + r() * .2); B.f(B.circ(ax, ay, 2.4), P.anem, .9).f(B.circ(ax - .6, ay - .6, 1), P.anemHi, .9); }
  if (r() < .55) { const x0 = cx - rx * (.25 + r() * .3), y0 = cy + ry * .1, a0 = r() * 6; let d = ''; for (let j = 0; j < 10; j++) { const a = a0 + j / 10 * Math.PI * 2, rad = j % 2 ? 1.4 : 3.8; d += (j ? 'L' : 'M') + (x0 + Math.cos(a) * rad).toFixed(1) + ' ' + (y0 + Math.sin(a) * rad * .7).toFixed(1); } B.f(d + 'Z', P.star, .85); }
  B.cx.restore();
  // a bright lip of wet rock along the pool's near edge
  B.s(`M${cx - rx * .8} ${cy + ry * .55}Q${cx} ${cy + ry * 1.15} ${cx + rx * .85} ${cy + ry * .5}`, '#d8d2c0', 1.1, .55);
}
if (window.GardenPaintVale) GardenPaintVale.parts.push({ id: 'tide-rocks', compose(C) {
  const pools = gardenTidePools(); if (!pools.length) return;
  const W = C.W, kit = C.kit;
  for (const p of pools) {
    const cx = p.x * W.cellW, cy = W.sky + p.y * W.cellH, R = p.rx * 2.2;
    C.add([cx - R, cy - R * .7, cx + R, cy + R * .7], 41, (B) => _gtpPaint(B, kit, p, W));
  }
} });
