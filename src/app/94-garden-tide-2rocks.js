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
    const d = Math.max(gardenIslandCoastDistance(c.x + .5, c.y + .5), gardenTideRaiseAt(c.x + .5, c.y + .5)); if (d < 8 || d > 66) continue;   // (low enough on the shore that the sea fills it: the lower ones go under at high water, the upper ones only at a big tide or in a storm)
    cands.push({ x: c.x, y: c.y, d, zone: c.zone, h: gardenHash('tide-pool|' + c.x + ',' + c.y) });
  }
  cands.sort((a, b) => a.h - b.h);
  for (const c of cands) {
    if (out.some(p => Math.hypot(p.x - c.x - .5, (p.y - c.y - .5) * 1.3) < 2.6)) continue;
    const r = gardenRand(c.h), x = c.x + .5 + (r() - .5) * .36, y = c.y + .5 + (r() - .5) * .24;
    // the way to the sea from here (a few coast distances round it): the shelf leans that way, the weed is on that side
    const e = .4, gx = gardenIslandCoastDistance(x + e, y) - gardenIslandCoastDistance(x - e, y), gy = gardenIslandCoastDistance(x, y + e) - gardenIslandCoastDistance(x, y - e), gl = Math.hypot(gx, gy) || 1;
    out.push(Object.freeze({ id: 'tp' + c.x + '-' + c.y, n: out.length, x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, rx: 19 + r() * 8, seed: c.h, zone: c.zone, d: c.d, sx: -gx / gl, sy: -gy / gl, stones: 1 + (c.h % 3 === 0 ? 1 : 0) }));
    if (out.length >= 24) break;
  }
  _gtp.key = S.lay; _gtp.list = out;
  return out;
}
/** The rock shelf and its pool, into a 2D context at world px (B: the paint kit's brush). */
function _gtpPaint(B, kit, p, W) {
  const cx = p.x * W.cellW, cy = W.sky + p.y * W.cellH, r = kit.rng(p.seed), P = GT_ROCK, rx = p.rx, ry = rx * .5, sx = p.sx, sy = p.sy;
  const clip = (d, fn) => { B.cx.save(); B.cx.clip(typeof d === 'string' ? new Path2D(d) : d); fn(); B.cx.restore(); };
  // 1. a low shelf of rock the pool lies in: its shadow on the sand, a broad lobed body lit from the upper left, the sea side wet
  B.shadow(cx + 5, cy + ry * 1.05, rx * 2.15, ry * 1.55, .22, '#3a3428');
  const shelf = B.blob(r, cx, cy + ry * .12, rx * 1.72, ry * 1.62, 13, .3);
  B.f(B.blob(r, cx + 2.5, cy + ry * .42, rx * 1.74, ry * 1.6, 13, .28), P.rockDk, .7);
  B.f(shelf, P.rockLo);
  clip(shelf, () => {
    B.f(B.blob(r, cx - rx * .18, cy - ry * .3, rx * 1.55, ry * 1.3, 12, .3), P.rock, .95);
    for (let i = 0; i < 3; i++) B.f(B.blob(r, cx - rx * (.55 + r() * .5), cy - ry * (.5 + r() * .5), rx * (.35 + r() * .2), ry * (.22 + r() * .1), 8, .35), P.rockHi, .6);
    B.f(B.ell(cx + sx * rx * 1.35, cy + sy * ry * 1.4 + ry * .35, rx * 1.25, ry * .95), P.wet, .6);   // (the sea side: wet, darker)
    for (let k = 0; k < 6; k++) { const a = r() * Math.PI * 2, d = 1.15 + r() * .35; B.s('M' + (cx + Math.cos(a) * rx * d) + ' ' + (cy + Math.sin(a) * ry * d) + 'l' + ((r() - .5) * 9) + ' ' + ((r() - .5) * 4), P.rockDk, .9, .35); }   // (cracks)
  });
  // 2. the pool, sunk in the rock: the lip's shadow along its far side, a deep middle, the shallows over pale rock at the near edge
  const pool = B.blob(r, cx, cy, rx, ry, 13, .34);
  B.f(B.blob(r, cx, cy - 1.8, rx * 1.08, ry * 1.16, 13, .3), P.rockDk, .75);
  B.f(pool, P.pool);
  clip(pool, () => {
    B.f(B.ell(cx + rx * .05, cy + ry * .55, rx * 1.05, ry * .7), '#88aca8', .55);   // (shallow over rock at the near edge)
    for (let k = 0; k < 9; k++) B.f(B.ell(cx + (r() - .5) * rx * 1.6, cy + ry * (.15 + r() * .6), 2 + r() * 2.6, 1.1 + r() * 1.1), ['#8c8a76', '#a09680', '#76786a'][k % 3], .55);
    B.f(B.ell(cx - rx * .05, cy - ry * .05, rx * .62, ry * .48), P.poolDk, .55);   // (deep)
    B.f(B.ell(cx - rx * .3, cy - ry * .15, rx * .55, ry * .3), P.sky, .42);   // (the sky in it)
    B.f(B.ell(cx - rx * .42, cy - ry * .28, rx * .2, ry * .09), '#ffffff', .5);
    B.f(B.ell(cx, cy - ry * 1.02, rx * 1.15, ry * .5), P.rockDk, .38);   // (the far lip's shadow on the water)
    for (let k = 0; k < 4; k++) { const x0 = cx + (r() - .5) * rx * 1.3, y0 = cy + ry * (.2 + r() * .45); B.s('M' + x0 + ' ' + y0 + 'q' + ((r() - .5) * 5) + ' ' + (-3 - r() * 3) + ' ' + ((r() - .5) * 4) + ' ' + (-6 - r() * 4), P.weed[k % 3], 1.3, .8); }
    // anemones, a little closed, one open; now and then a starfish
    for (let k = 0, n = 2 + Math.floor(r() * 2); k < n; k++) { const ax = cx + rx * (r() - .5) * 1.2, ay = cy + ry * (.25 + r() * .4), z = k ? 1.3 : 2; B.f(B.circ(ax, ay, z), P.anem, .85).f(B.circ(ax - .4, ay - .4, z * .4), P.anemHi, .9); }
    if (r() < .6) { const x0 = cx + rx * (r() - .5) * .9, y0 = cy + ry * .35, a0 = r() * 6; let d = ''; for (let j = 0; j < 10; j++) { const a = a0 + j / 10 * Math.PI * 2, rad = j % 2 ? 1.3 : 3.6; d += (j ? 'L' : 'M') + (x0 + Math.cos(a) * rad).toFixed(1) + ' ' + (y0 + Math.sin(a) * rad * .7).toFixed(1); } B.f(d + 'Z', P.star, .8); }
  });
  B.s(B.blob(r, cx, cy + .6, rx * .99, ry * .98, 13, .3), '#e6e0cc', 1, .35);   // (a wet lip of light round the water)
  // 3. stones round the shelf, standing out of it; barnacles, limpets and a fringe of weed on the sea side
  for (let i = 0, n = 2 + Math.floor(r() * 2); i < n; i++) {
    const a = Math.PI * (.85 + i * .55 + r() * .3), x = cx + Math.cos(a) * rx * (1.25 + r() * .25), y = cy + Math.abs(Math.sin(a)) * ry * 1.1 + ry * .2, w = 7 + r() * 6;
    B.stone(r, x, y, w, w * .62, P, P.lichen);
  }
  for (let k = 0, n = 10 + Math.floor(r() * 8); k < n; k++) { const a = r() * Math.PI * 2, d = 1.12 + r() * .45; B.f(B.circ(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, .6 + r() * .6), P.barn, .8); }
  for (let k = 0; k < 2; k++) { const a = r() * Math.PI * 2, lx = cx + Math.cos(a) * rx * 1.25, ly = cy + Math.sin(a) * ry * 1.2; B.f(B.ell(lx + .5, ly + .8, 2.8, 1.2), P.rockDk, .4).f('M' + (lx - 2.8) + ' ' + (ly + .6) + 'Q' + lx + ' ' + (ly - 3.2) + ' ' + (lx + 2.8) + ' ' + (ly + .6) + 'Z', '#c8bca0', .95); }
  for (let k = 0; k < 12; k++) { const t = (k / 11 - .5) * 1.6, ex = cx + (sx * Math.cos(t) - sy * Math.sin(t)) * rx * 1.55, ey = cy + (sx * Math.sin(t) + sy * Math.cos(t)) * ry * 1.45 + ry * .3; B.s('M' + ex + ' ' + ey + 'q' + ((r() - .5) * 4) + ' ' + (2 + r() * 3) + ' ' + ((r() - .5) * 6) + ' ' + (4 + r() * 4), P.weed[k % 3], 1.5 + r(), .85); }
}
if (window.GardenPaintVale) GardenPaintVale.parts.push({ id: 'tide-rocks', compose(C) {
  const pools = gardenTidePools(); if (!pools.length) return;
  const W = C.W, kit = C.kit;
  for (const p of pools) {
    const cx = p.x * W.cellW, cy = W.sky + p.y * W.cellH, R = p.rx * 2.4;
    C.add([cx - R, cy - R * .8, cx + R, cy + R * .8], 41, (B) => _gtpPaint(B, kit, p, W));
  }
} });
