/* Sights, side places and the things a player is given: painted into the place they stand in, not set down on it
 * (the owner, 19 Nov 2026: "all of the unlockable objects and random side stuff ... are sort of just placed in the
 * world and need to be drawn in"). docs/dev/PAINT_KIT.md has the rules; sizes come from gardenSizePx.
 *
 *  GardenPaintSeat.add(scene, layer, prop, W, o)   the ground a thing stands in, as one picture under every actor and
 *      under the shadows (depth -9345): trodden earth or laid flags round its foot, foundation stones, a dark contact
 *      along the foot, grass grown in over the edges, and a worn way from its door to the nearest path of the layout.
 *      o: { kind: 'flags' | 'earth' | 'moss' | 'sand' | 'turf', w (the width that stands, px), front, back (px),
 *           way (false: none), hatch / pool / maze (a way in or a flat sight laid in the ground), x, foot, season }
 *  GardenPaintedMarks.ART['ld-*']                  the sights that still had a flat classic drawing, painted in the
 *      fells' brush (94-garden-paint-terrain-0kit.js): each keeps its footprint, door and collision. Its base meets
 *      the ground at y = 0; no shadow is painted inside a standing picture (the shared light lays its silhouette).
 * Nothing runs at load. */
window.GardenPaintSeat = (function () {
  'use strict';
  const KIT = () => window.GardenPaintTerrainKit;
  const DEPTH = -9345;   // over every region's ground (-9600 to -9350), under the shadow layer (-9340) and every actor
  const SEAT = {
    flags: { earth: '#a89474', earthLo: '#7c6a50', flag: '#c9bea2', flagLo: '#a39778', flagHi: '#e4dbc2', joint: '#6f6448' },
    earth: { earth: '#9c8460', earthLo: '#6e5a3e', flag: '#a8987a', flagLo: '#857660', flagHi: '#c8baa0', joint: '#5a4a34' },
    moss: { earth: '#6e6a48', earthLo: '#4c4a32', flag: '#9a9680', flagLo: '#77735e', flagHi: '#bab49a', joint: '#3e3c2a' },
    sand: { earth: '#d6c294', earthLo: '#b49c6e', flag: '#cfc6b0', flagLo: '#a89e88', flagHi: '#ece4d0', joint: '#8a7c60' },
    turf: { earth: '#8a8a52', earthLo: '#66683c', flag: '#a8a08a', flagLo: '#857e6a', flagHi: '#c8c0a8', joint: '#55573a' },
  };
  const GRASS = { summer: ['#5f8a3e', '#7ba24c', '#97b85e'], spring: ['#5e9040', '#7eac50', '#a2c86a'], autumn: ['#7e8a42', '#9a9a50', '#b8a25a'], winter: ['#7e8a74', '#98a48c', '#b8c0ae'] };
  const STONES = { rock: '#a8a08a', rockLo: '#857c68', rockHi: '#cfc7b0', rockDk: '#4e483c' };
  /** The nearest point of a layout path to a cell point, and how far its edge is (cells). */
  function nearestRoute(cx, cy) {
    const D = typeof GardenIslandLayout !== 'undefined' && GardenIslandLayout.data; if (!D) return null;
    let best = null;
    const test = (pts, half) => { for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / l2)), px = ax + dx * t, py = ay + dy * t, d = Math.hypot(cx - px, cy - py) - half; if (!best || d < best.gap) best = { x: px, y: py, gap: d, half }; } };
    for (const r of D.routes || []) if (r.points && r.points.length > 1) test(r.points, (r.widthCells || 1.5) / 2);
    for (const p of (D.presentation && D.presentation.plazas) || []) { const poly = p.polygon || p.points; if (Array.isArray(poly) && poly.length > 2) test(poly.concat([poly[0]]), 0); }
    return best;
  }
  function drawSeat(B, o) {
    const kit = KIT(), r = kit.rng(o.seed), P = SEAT[o.kind] || SEAT.earth, G = GRASS[o.season] || GRASS.summer, w = o.w, f = o.front, bk = o.back, snowy = o.season === 'winter';
    // the worn way to the path: soft trodden earth thinning out as it meets the path
    if (o.way) {
      const [ex, ey] = o.way, sx = o.door ? o.door[0] : 0, sy = o.door ? o.door[1] : f * .5, len = Math.hypot(ex - sx, ey - sy), n = Math.max(4, Math.round(len / 5)), nx = -(ey - sy) / (len || 1), ny = (ex - sx) / (len || 1), bend = (r() - .5) * len * .18;
      for (let i = 0; i <= n; i++) { const t = i / n, k = Math.sin(t * Math.PI) * bend, x = sx + (ex - sx) * t + nx * k, y = sy + (ey - sy) * t + ny * k, wide = 9 - t * 2.5; B.f(B.blob(r, x, y, wide, wide * .55, 8, .5), P.earth, .2 + (1 - t) * .12); if (i % 2) B.f(B.blob(r, x + (r() - .5) * 4, y + (r() - .5) * 2, wide * .5, wide * .28, 7, .5), P.earthLo, .14); }
      for (let i = 0; i < n; i++) { const t = (i + .5) / n, x = sx + (ex - sx) * t, y = sy + (ey - sy) * t; for (const side of [-1, 1]) if (r() < .7) B.tufts(r, x + nx * side * 9, y + ny * side * 9, 6, 3, G, 4.5); }
    }
    // the trodden apron: broken soft layers, palest where feet stop in front of the door
    for (let k = 0; k < 5; k++) B.f(B.blob(r, (r() - .5) * w * .12, f * .2 - bk * .2 + (r() - .5) * 3, w * .5 + f * .55 - k * 3.5, (f + bk) * .5 - k * 1.8, 11, .4), k < 2 ? P.earthLo : P.earth, .1 + k * .045);
    if (o.door) B.f(B.blob(r, o.door[0], o.door[1], 12, 5, 8, .5), P.flagHi, .28);
    // laid flags round the base (a threshold, an apron of stone), joints of earth and moss
    if (o.kind === 'flags' || o.flags) {
      const rows = [[3, w * .5 + 8], [11, w * .5 + 3]];
      for (const [y, half] of rows) for (let x = -half; x < half;) { const fw = 9 + r() * 8, fh = 5.5 + r() * 2; if (r() < .1) { x += fw * .6; continue; } const pts = [[x + r(), y - fh / 2 + r()], [x + fw - r(), y - fh / 2 + r() * .8], [x + fw - r() * 1.4, y + fh / 2 - r()], [x + r() * 1.2, y + fh / 2 - r() * .6]]; B.f(B.poly(pts.map(([a, b]) => [a + .6, b + .7])), P.joint, .45).f(B.poly(pts), r() < .3 ? P.flagLo : P.flag).f(B.poly([pts[0], pts[1], [pts[1][0] - 1, pts[1][1] + 1.4], [pts[0][0] + 1, pts[0][1] + 1.4]]), P.flagHi, .55); if (r() < .25) B.f(B.blob(r, x + fw * .7, y + fh * .3, 2.4, 1.2, 6, .5), snowy ? '#eef2ee' : G[0], .6); x += fw + .8; }
    }
    // foundation stones along the foot, lit from the upper left
    const nStones = o.stones == null ? Math.round(w / 9) : o.stones;
    for (let i = 0; i < nStones; i++) { const x = -w * .5 + (i + .5) * w / Math.max(1, nStones) + (r() - .5) * 3; kit.brush && B.stone(r, x, 1.5 + r() * 1.5, 3 + r() * 2.2, 1.8 + r() * .9, STONES, r() < .35 ? '#9aa86a' : null); }
    // the contact: dark where it meets the ground, exactly as wide as what stands there
    B.shadow(1, 1, w * .56 + 4, 4.5, .3, '#2a2a1a');
    // grass grown in over the apron's edge, weeds at the corners, a few flowers; leaves in autumn, frost in winter
    for (let i = 0; i < 18 + w / 5; i++) { const a = r() * Math.PI * 2, rx = w * .5 + f * .5, ry = (f + bk) * .45, x = Math.cos(a) * rx * (.9 + r() * .25), y = f * .2 - bk * .2 + Math.sin(a) * ry * (.9 + r() * .25); B.tufts(r, x, y, 7, 3 + Math.floor(r() * 3), G, 4 + r() * 3); }
    for (const side of [-1, 1]) { B.tufts(r, side * (w * .5 + 2), 1, 8, 6, G, 7); if (!snowy && r() < .7) B.f(B.circ(side * (w * .5 + 3) + (r() - .5) * 4, -3 - r() * 3, 1.3), ['#f4f0e2', '#e8c84a', '#c86aa0', '#9a7ad0'][Math.floor(r() * 4)], .9); }
    if (o.season === 'autumn') for (let i = 0; i < 10; i++) B.f(B.ell((r() - .5) * (w + f), (r() - .3) * (f + bk) * .6, 1.8, 1.1), ['#c45a26', '#e0a040', '#8e6a2c'][i % 3], .85);
    if (snowy) for (let i = 0; i < 6; i++) B.f(B.blob(r, (r() - .5) * (w + f), (r() - .3) * f * .5, 6 + r() * 5, 2 + r() * 1.5, 7, .5), '#eef2f0', .6);
    if (o.extra) o.extra(B, r, P, G);
  }
  /** Stand a seat under a thing. Returns the image (its depth is under every actor), or null. */
  function add(scene, layer, prop, W, o) {
    const kit = KIT(); if (!kit || !layer || !prop) return null;
    const kind = o.kind || 'earth', w = o.w || Math.max(20, (prop.w || 1) * W.cellW * .82), front = o.front || 20, back = o.back || 9, x = o.x, foot = o.foot;
    const door = prop.door ? [((prop.door.x + .5) * W.cellW - x), Math.max(6, W.sky + (prop.door.y + .5) * W.cellH - foot)] : null;
    let way = null;
    if (o.way !== false && door) {
      const c = nearestRoute(prop.door.x + .5, prop.door.y + .5);
      if (c && c.gap > .35 && c.gap < 6) { const len = Math.hypot(c.x - prop.door.x - .5, c.y - prop.door.y - .5) || 1, ux = (c.x - prop.door.x - .5) / len, uy = (c.y - prop.door.y - .5) / len, ex = (c.x - ux * c.half * .6) * W.cellW - x, ey = W.sky + (c.y - uy * c.half * .6) * W.cellH - foot; way = [ex, ey]; }
    }
    const pts = [[-w / 2 - front - 14, -back - 10], [w / 2 + front + 14, front + 22]]; if (way) { pts.push([way[0] - 16, way[1] - 12], [way[0] + 16, way[1] + 12]); }
    if (o.box) pts.push([o.box[0], o.box[1]], [o.box[2], o.box[3]]);
    const box = [Math.floor(Math.min(...pts.map(p => p[0]))), Math.floor(Math.min(...pts.map(p => p[1]))), Math.ceil(Math.max(...pts.map(p => p[0]))), Math.ceil(Math.max(...pts.map(p => p[1])))];
    const season = o.season || 'summer', seed = kit.hashStr(prop.id + ':' + Math.round(x) + ',' + Math.round(foot));
    const key = 'gps|' + prop.id + '|' + season + '|' + Math.round(x) + ',' + Math.round(foot) + (way ? '|' + way.map(Math.round).join(',') : '');
    const spec = Object.assign({}, o, { kind, w, front, back, door, way, seed, season });
    const im = kit.sprite(scene, layer, key, box, B => drawSeat(B, spec), x, foot, 1.5, false); if (!im) return null;
    im.setDepth(DEPTH); return im;
  }
  return { add, nearestRoute, SEAT, DEPTH };
})();

(function () {
  'use strict';
  const M = window.GardenPaintedMarks; if (!M || !M.ART) return;
  const KIT = () => window.GardenPaintTerrainKit;
  const H = typeof GARDEN_H !== 'undefined' ? GARDEN_H : 41;   // the player's height (94-garden-0camera.js)
  const sz = (n, t) => typeof gardenSizePx === 'function' ? gardenSizePx(n, t) : H;
  const STONE = { rock: '#b4ab94', rockLo: '#8c8470', rockHi: '#d8d0b8', rockDk: '#4e483e' }, MOSSY = { rock: '#9e9a84', rockLo: '#77735f', rockHi: '#c2bea6', rockDk: '#46443a' };
  const OAK = ['#8a6a46', '#6a5034', '#b08c5e', '#3e3022'], WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], IRON = ['#2c3032', '#4c5256', '#16181a'];
  const leaf = s => ({ summer: ['#3e6a34', '#557f3e', '#76a04c', '#9cc066'], spring: ['#44723a', '#5f8f46', '#84b456', '#b4d47c'], autumn: ['#7a5a2c', '#a8662a', '#cf8c3a', '#e6b856'], winter: ['#5a6a58', '#728274', '#90a090', '#bcc8bc'] }[s] || ['#3e6a34', '#557f3e', '#76a04c', '#9cc066']);
  const grass = s => ({ autumn: ['#7e8a42', '#9a9a50', '#b8a25a'], winter: ['#7e8a74', '#98a48c', '#b8c0ae'] }[s] || ['#5f8a3e', '#7ba24c', '#97b85e']);
  // dressed stone courses over a box, each block its own tone, lit from the upper left
  function ashlar(B, r, x, y, w, h, P, course) {
    course = course || 7; B.f(B.rect(x, y, w, h), P.rockLo);
    for (let yy = y, row = 0; yy < y + h - .5; yy += course, row++) for (let xx = x - (row & 1) * course * .7; xx < x + w; ) { const bw = course * (1.2 + r() * .9), x0 = Math.max(x, xx), x1 = Math.min(x + w, xx + bw), hh = Math.min(course, y + h - yy); if (x1 - x0 > 1) { B.f(B.rect(x0 + .4, yy + .4, x1 - x0 - .8, hh - .8), r() < .25 ? P.rockHi : r() < .6 ? P.rock : P.rockLo, .95); B.f(B.rect(x0 + .4, yy + .4, x1 - x0 - .8, 1), P.rockHi, .5); } xx += bw; }
    B.f(B.rect(x, y, w * .16, h), '#ffffff', .07).f(B.rect(x + w * .8, y, w * .2, h), P.rockDk, .18);
  }
  function mossOn(B, r, x, y, w, n, s) { const L = leaf(s); for (let i = 0; i < n; i++) B.f(B.blob(r, x + r() * w, y + (r() - .5) * 2, 2.4 + r() * 3.4, 1.2 + r() * 1.2, 6, .5), s === 'winter' ? '#e8eeea' : i % 2 ? L[2] : '#7d8f4e', .8); }
  function ivy(B, r, x, y0, y1, s) { const L = leaf(s); let px = x; for (let y = y0; y > y1; y -= 3) { px += (r() - .5) * 3; B.f(B.blob(r, px, y, 2.6, 2, 5, .5), r() < .5 ? L[0] : L[1], .95); if (r() < .4) B.f(B.blob(r, px - 1, y - 1, 1.4, 1, 5, .5), L[3], .8); } }
  function shingles(B, r, pts, tone) { B.f(B.poly(pts), tone[0]); const [a, b, c] = pts, ys = Math.min(a[1], b[1], c[1]), ye = Math.max(a[1], c[1]); for (let y = ye - 3; y > ys + 2; y -= 3.4) B.s(`M${a[0] + (b[0] - a[0]) * (ye - y) / (ye - ys)} ${y}H${c[0] - (c[0] - b[0]) * (ye - y) / (ye - ys)}`, tone[1], .7, .6); B.f(B.poly([a, b, [b[0] + 3, b[1] + 2], [a[0] + 6, a[1]]]), tone[2], .4); }
  function windowLit(B, x, y, w, h, lit, frame) { B.f(B.rect(x - 1.4, y - 1.4, w + 2.8, h + 2.8), frame || '#e8dcc0').f(B.rect(x, y, w, h), lit ? B.lin(0, y, 0, y + h, [[0, '#ffe6a6'], [1, '#e8a85a']]) : B.lin(0, y, 0, y + h, [[0, '#55686a'], [1, '#2e3a3c']])).s(`M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}`, frame || '#e8dcc0', .9); if (!lit) B.f(B.rect(x + 1, y + 1, w * .3, h * .35), '#a8c0c2', .4); }
  const A = M.ART;

  /* ---------- the wishing well: a round head of dressed stone at leaning height, an oak frame with a shingled cap, the windlass and bucket, coins in the dark water ---------- */
  A['ld-wish'] = { box: [-36, -96, 36, 6], seat: { kind: 'flags', w: 46, front: 20 }, draw(B, o) {
    const r = KIT().rng(71), s = o.season, wall = sz('well') * 1.1, top = -wall - 5, post = sz('lamp', 0) * .98;
    // the far rim and the dark water inside, a glint and three coins
    B.f(B.ell(0, top, 21, 7), '#6f6754').f(B.ell(0, top + .6, 17.4, 5.4), B.rad(-3, top, 17, [[0, '#2e4a50'], [.7, '#16262a'], [1, '#0e1618']])).f(B.ell(-5, top - 1, 6, 1.4), '#9cc4c8', .45);
    for (const [cx, cy] of [[4, top + 1.2], [-2, top + 2], [8, top - .4]]) B.f(B.ell(cx, cy, 1.6, .8), '#e8c45a', .9);
    // the head: two courses of curved stone, darker to the east, moss on the coping
    for (let row = 0; row < 3; row++) { const y0 = top + row * (wall / 3); for (let i = 0; i < 7; i++) { const a0 = Math.PI * (i / 7), a1 = Math.PI * ((i + 1) / 7), x0 = -Math.cos(a0) * 21, x1 = -Math.cos(a1) * 21, mid = (x0 + x1) / 2, sag = Math.sin((a0 + a1) / 2) * 7; const tone = mid < -8 ? STONE.rockHi : mid > 9 ? STONE.rockLo : STONE.rock; B.f(B.poly([[x0, y0 + Math.sin(a0) * 7], [x1, y0 + Math.sin(a1) * 7], [x1, y0 + wall / 3 + Math.sin(a1) * 7 - .6], [x0, y0 + wall / 3 + Math.sin(a0) * 7 - .6]]), tone).s(`M${x0} ${y0 + Math.sin(a0) * 7}L${x1} ${y0 + Math.sin(a1) * 7}`, STONE.rockDk, .6, .45); void sag; } }
    B.f(`M-21 ${top}A21 7 0 0 0 21 ${top}L21 ${top + 2}A21 7 0 0 1 -21 ${top + 2}Z`, STONE.rockHi, .9);
    B.f(`M9 ${top + 4}Q21 ${top + 1} 21 ${top}L21 ${-1}Q15 4 6 6Z`, STONE.rockDk, .22);
    mossOn(B, KIT().rng(72), -20, top + 6, 18, 6, s);
    // the oak frame: two posts set into the head, a windlass with its crank, rope down to a bucket at the rim
    for (const x of [-18, 18]) B.post(x, -post, top + 6, 4.2, OAK);
    B.s(`M-19 ${-post * .62}H19`, OAK[1], 4.4).s(`M-19 ${-post * .62 - 1.2}H19`, OAK[2], 1.2, .7);
    B.s(`M19 ${-post * .62}h6v6`, IRON[0], 1.6);
    B.s(`M2 ${-post * .62 + 2}V${top - 10}`, '#c8b48a', 1.1).f(B.rr(-3, top - 11, 10, 7, 1.4), WOOD[1]).f(B.rect(-3, top - 11, 10, 1.4), WOOD[2]).s(`M-3 ${top - 9}h10`, IRON[1], .7);
    // the cap: a little shingled gable with a ridge board
    shingles(B, r, [[-28, -post + 12], [0, -post - 10], [28, -post + 12]], ['#8a5e3e', '#6a4428', '#b88a5e']);
    B.f(B.poly([[-28, -post + 12], [28, -post + 12], [26, -post + 15], [-26, -post + 15]]), '#4e3420', .85).s(`M-2 ${-post - 10}h4`, '#4e3420', 2);
    // ferns and long grass at its foot (in front of the stone), a dropped coin
    const G = grass(s); B.tufts(r, -14, 6, 14, 7, G, 8).tufts(r, 15, 6, 12, 6, G, 7);
    if (s !== 'winter') for (let k = 0; k < 5; k++) { const x = -22 + k * 2.4; B.s(`M${x} 5q-4 -6 -7 -10`, '#5f7a3c', 1.1, .9); }
  } };

  /* ---------- the sunken pool: a stone-lined pool let into the ground, three steps down on the near side (and, if you keep going, a fourth: the cellar) ---------- */
  A['ld-sunk'] = { box: [-56, -40, 56, 10], shade: false, flat: true, seat: { kind: 'flags', w: 92, front: 14, back: 30, stones: 0 }, draw(B, o) {
    const r = KIT().rng(73), s = o.season, L = leaf(s);
    // the kerb all round, sunk to the turf, and the water a step down inside it
    B.f(B.blob(r, 0, -16, 52, 20, 12, .12), STONE.rockDk, .55);
    B.f(B.rr(-48, -34, 96, 34, 10), STONE.rockLo).f(B.rr(-44, -31, 88, 28, 8), STONE.rock);
    for (let x = -46; x < 46; x += 9 + r() * 3) B.s(`M${x} -34v4M${x + 3} -3v3`, STONE.rockDk, .6, .5);
    B.f(B.rr(-40, -28, 80, 22, 6), STONE.rockDk).f(B.rr(-38, -26, 76, 19, 5), B.lin(0, -26, 0, -7, [[0, '#23383c'], [.6, '#2e4a4e'], [1, '#3c5c5c']]));
    B.f(B.ell(-12, -20, 16, 2), '#a8c8c8', .35).f(B.ell(14, -13, 9, 1.4), '#c8e0dc', .3);
    if (s !== 'winter') for (const [x, y, k] of [[18, -20, 1], [26, -15, .8], [-26, -12, .9]]) { B.f(B.ell(x, y, 5 * k, 2.4 * k), L[1]).f(`M${x} ${y}l${4 * k} ${-1.4 * k}l0 ${1.6 * k}z`, '#2e4a4e'); if (k === 1) B.f(B.circ(x - 1, y - 1, 1.4), '#f4e2ea'); }
    else B.f(B.rr(-38, -26, 76, 19, 5), '#dfe9ee', .7);
    // three steps down at the near left, worn in the middle, and a dark gap under the third
    for (let i = 0; i < 3; i++) { const y = -6 - i * 5.5, x0 = -34 + i * 1.4, wd = 22 - i * 2.4; B.f(B.rect(x0, y - 4, wd, 4.6), i % 2 ? STONE.rock : STONE.rockHi).f(B.rect(x0, y + .6, wd, 1.2), STONE.rockDk, .6).f(B.ell(x0 + wd / 2, y - 2, wd * .25, 1), '#ffffff', .12); }
    B.f(B.rect(-30, -24, 16, 2.4), '#0e1a1c', .85);
    // the near coping stands a hand above the turf: the only part that stands
    B.f(B.rr(-50, -6, 100, 8, 3), STONE.rockLo).f(B.rr(-50, -6, 100, 3, 2), STONE.rockHi, .85);
    for (let x = -50; x < 50; x += 11 + r() * 4) B.s(`M${x} -6v8`, STONE.rockDk, .7, .5);
    mossOn(B, r, -48, -5, 96, 9, s);
    B.tufts(r, -46, 3, 10, 5, grass(s), 6).tufts(r, 46, 3, 10, 5, grass(s), 6);
  } };

  /* ---------- the market cross: three octagonal steps, a tapering shaft worn smooth, a lantern head ---------- */
  A['ld-cross'] = { box: [-34, -120, 36, 6], seat: { kind: 'flags', w: 50, front: 18 }, draw(B, o) {
    const r = KIT().rng(79), s = o.season, top = -sz('lamp', .5) * 1.35;
    const step = (y, half, h) => { B.f(B.poly([[-half, y], [-half * .7, y - h * .4], [-half * .7, y - h], [half * .7, y - h], [half * .7, y - h * .4], [half, y]]), STONE.rockLo); B.f(B.poly([[-half * .7, y - h], [half * .7, y - h], [half * .78, y - h + 2], [-half * .78, y - h + 2]]), STONE.rockHi); B.f(B.poly([[-half, y], [-half * .7, y - h * .4], [-half * .7, y - h], [-half * .4, y - h], [-half * .5, y]]), STONE.rock, .9); B.f(B.poly([[half * .45, y], [half * .7, y - h], [half * .7, y - h * .4], [half, y]]), STONE.rockDk, .3); };
    step(0, 28, 7); step(-6, 21, 6.5); step(-12, 14, 6);
    B.f(B.rect(-3, -9, 6, 2.4), '#2a261e', .8);   // the slot in the base
    // the shaft: octagonal, tapering, lit west face, lichen; the head a little gabled lantern with a cross
    const sh = [[-6, -18], [-4.2, top + 14], [4.2, top + 14], [6, -18]];
    B.f(B.poly(sh), STONE.rock).f(B.poly([[-6, -18], [-4.2, top + 14], [-1.6, top + 14], [-2.4, -18]]), STONE.rockHi, .85).f(B.poly([[2.6, -18], [1.8, top + 14], [4.2, top + 14], [6, -18]]), STONE.rockLo, .8);
    B.f(B.rr(-8, top + 4, 16, 11, 2), STONE.rock).f(B.rect(-6, top + 6, 4, 7), STONE.rockDk, .7).f(B.rect(2, top + 6, 4, 7), STONE.rockDk, .7);
    B.f(B.poly([[-10, top + 5], [0, top - 2], [10, top + 5]]), STONE.rockLo).f(B.poly([[-10, top + 5], [0, top - 2], [0, top + 1], [-7, top + 5]]), STONE.rockHi, .7);
    B.f(B.rect(-1.4, top - 12, 2.8, 11), STONE.rock).f(B.rect(-4.4, top - 9, 8.8, 2.6), STONE.rock).f(B.rect(-1.4, top - 12, 1.2, 11), STONE.rockHi, .8);
    for (let i = 0; i < 5; i++) B.f(B.blob(r, (r() - .5) * 8, -24 - r() * 50, 1.4 + r() * 1.6, 1 + r(), 6, .5), r() < .6 ? '#c9c48a' : '#9aa86a', .7);
    mossOn(B, r, -26, -1, 18, 4, s); B.tufts(r, -24, 2, 10, 6, grass(s), 6).tufts(r, 25, 2, 10, 6, grass(s), 6);
  } };

  /* ---------- the signpost: an oak finger post in a stone collar, four arms (one blank), a cap ---------- */
  A['ld-sign-c'] = { box: [-50, -100, 50, 6], seat: { kind: 'turf', w: 22, front: 12, back: 6, stones: 3, way: false }, draw(B, o) {
    const r = KIT().rng(83), s = o.season, top = -sz('lamp', .4) * 1.02;
    B.post(0, top, 0, 6, OAK).f(B.rect(-3, top, 6, 2), OAK[3], .5);
    B.f(B.poly([[-5, top], [0, top - 6], [5, top]]), OAK[1]).f(B.poly([[-5, top], [0, top - 6], [0, top]]), OAK[2], .7);
    const arm = (y, dir, len, word, lean) => { const x0 = dir > 0 ? 3 : -3, x1 = x0 + dir * len, tip = x1 + dir * 6; B.f(B.poly([[x0, y - 4 + lean], [x1, y - 4], [tip, y], [x1, y + 4], [x0, y + 4 + lean]]), '#efe6cc').s(B.line([[x0, y + 4 + lean], [x1, y + 4], [tip, y]]), '#a8987a', .8, .8).f(B.poly([[x0, y - 4 + lean], [x1, y - 4], [x1, y - 2.6], [x0, y - 2.6 + lean]]), '#ffffff', .5); if (word) B.text(word, x0 + dir * len * .52, y + .4, 4.4, '#3e3426'); };
    arm(top + 9, -1, 30, 'Hill', .6); arm(top + 9, 1, 30, 'Orchards', -.6); arm(top + 21, -1, 26, 'Fields', 0); arm(top + 21, 1, 26, '', .4);
    // the collar of stones, long grass and cow parsley round the post
    for (let i = 0; i < 5; i++) B.stone(r, -8 + i * 4, -1 + (i % 2), 3.4, 2.4, STONE, i === 1 ? '#9aa86a' : null);
    const G = grass(s); B.tufts(r, 0, 3, 22, 14, G, 9);
    if (s === 'summer' || s === 'spring') for (let i = 0; i < 4; i++) { const x = -9 + i * 6; B.s(`M${x} 2q-1 -8 ${(r() - .5) * 3} -14`, '#6a8a44', .9).f(B.circ(x, -13, 2.2), '#f4f0e2', .9); }
  } };

  /* ---------- an upturned boat: a clinker hull, tarred, up on two stones; a door cut in its side, nets and floats ---------- */
  A['ld-hull'] = { box: [-60, -58, 62, 8], seat: { kind: 'sand', w: 92, front: 16 }, lit: true, lights: [[-4, -18, 70]], draw(B, o) {
    const r = KIT().rng(89), hullTop = -sz('door', .5) * .9;
    for (const x of [-34, 30]) B.stone(r, x, -1, 8, 4, STONE, null);
    // the keel line arched along the top, strakes overlapping down to the gunwale resting on the stones
    const hull = `M-50 -4Q-52 ${hullTop * .7} -30 ${hullTop}Q0 ${hullTop - 6} 32 ${hullTop}Q54 ${hullTop * .7} 52 -4Z`;
    B.f(hull, '#2f3a36');
    for (let k = 1; k < 6; k++) { const y = -4 + (hullTop + 4) * (k / 6); B.s(`M${-50 + k * 3} ${y}Q0 ${y - 5 + k * .4} ${52 - k * 3} ${y}`, '#4e5a52', 1.2, .8).s(`M${-50 + k * 3} ${y + 1.4}Q0 ${y - 3.6 + k * .4} ${52 - k * 3} ${y + 1.4}`, '#1c2420', .8, .6); }
    B.f(`M-30 ${hullTop}Q0 ${hullTop - 6} 32 ${hullTop}Q0 ${hullTop - 3} -30 ${hullTop + 3}Z`, '#6a7a70', .55);
    B.s(`M-50 -4H52`, '#7a5a3a', 2.4).s(`M-50 -5H52`, '#a88454', .8, .8);
    // the door cut in its side, a little window, a stovepipe
    B.f(B.rr(-12, -30, 16, 26, 3), '#3e2c1e').f(B.rr(-10.5, -28.5, 13, 23, 2.4), B.lin(-10, 0, 3, 0, [[0, '#8a6a46'], [1, '#6a5034']])).f(B.circ(0, -16, 1), '#c8a23a');
    windowLit(B, 14, -28, 9, 8, o.night, '#a88454');
    B.f(B.rect(34, hullTop - 14, 4, 16), IRON[0]).f(B.rect(32.5, hullTop - 16, 7, 2.4), IRON[0]);
    // nets drying over the stern, cork floats, a lobster pot and a coil of rope
    B.s(`M-48 -6Q-54 ${hullTop * .5} -42 ${hullTop * .9}`, '#8a8a6a', 1, .7); for (let i = 0; i < 6; i++) B.s(`M${-50 + i * 2.4} -6l${-3 + i} ${hullTop * .7}`, '#9a9878', .5, .6);
    for (const [x, y] of [[-44, -18], [-40, -26], [-47, -12]]) B.f(B.circ(x, y, 1.8), '#e0782a');
    B.f(B.rr(40, -12, 16, 12, 5), '#8a6a3e').s('M42 -10h12M42 -6h12M48 -12v12', '#5a4024', .8); B.s(B.ell(-26, -2, 6, 2.4), '#c8b48a', 1.4);
    B.tufts(r, -56, 4, 8, 6, ['#a8a868', '#c8c080'], 7).tufts(r, 56, 4, 8, 5, ['#a8a868', '#c8c080'], 6);
  } };

  /* ---------- the milestone: a squat stone, a carved 0, lichen; the iron ring of the den's hatch in the flags behind it ---------- */
  A['ld-mile'] = { box: [-22, -40, 22, 6], seat: { kind: 'earth', w: 30, front: 14, back: 26, flags: true, extra(B, r, P) {
      // the hatch, laid flat behind the stone: an oak trap in a stone frame, an iron ring, a little worn
      B.f(B.rr(-17, -24, 30, 13, 2), P.joint, .8).f(B.rr(-15, -23, 26, 11, 1.6), '#6a5034').s('M-9 -23v11M-3 -23v11M3 -23v11', '#4a3622', .8, .8).f(B.rr(-15, -23, 26, 2, 1), '#9a7a54', .7);
      B.s(B.ell(-2, -17, 3, 1.6), '#2c3032', 1.4).s(B.ell(-2.4, -17.4, 3, 1.6), '#7a8084', .6, .8);
    } }, draw(B, o) {
    const r = KIT().rng(97), s = o.season, h = sz('wall', .2) * .72;
    const pts = [[-12, 0], [-12.6, -h * .55], [-9, -h * .94], [0, -h * 1.04], [9, -h * .94], [12.6, -h * .55], [12, 0]];
    B.f(B.poly(pts), MOSSY.rockLo).f(B.poly([[-12, 0], [-12.6, -h * .55], [-9, -h * .94], [-2, -h], [-3, 0]]), MOSSY.rock).f(B.poly([[-10.5, -h * .55], [-8, -h * .86], [-3, -h * .92], [-5, -h * .5]]), MOSSY.rockHi, .6);
    B.text('0', 0, -h * .52, 9, '#4a463a'); B.text('0', -.6, -h * .53, 9, 'rgba(255,255,255,.18)');
    for (let i = 0; i < 4; i++) B.f(B.blob(r, -8 + r() * 16, -h * (.2 + r() * .7), 1.6 + r() * 2, 1 + r(), 6, .5), r() < .5 ? '#c9c48a' : '#9aa86a', .75);
    B.tufts(r, 0, 3, 28, 12, grass(s), 7);
  } };

  /* ---------- the great stump: an old oak cut long ago, roots gripping the ground, moss, bracket fungus, a very small door with a lit window ---------- */
  A['ld-stump'] = { box: [-50, -70, 52, 8], seat: { kind: 'moss', w: 70, front: 16, stones: 0 }, lit: true, lights: [[12, -16, 50]], draw(B, o) {
    const r = KIT().rng(101), s = o.season, L = leaf(s), top = -sz('wall', 1) * 1.15, bark = ['#6e5a42', '#4e3e2c', '#8e785a', '#2e2418'];
    // roots: buttresses flaring into the ground on both sides
    for (const [x, d] of [[-30, -1], [-20, -1], [26, 1], [34, 1], [-6, 0]]) B.f(`M${x - 6} -2Q${x + d * 6} -18 ${x + d * 2} -26L${x + 8} -22Q${x + 10 + d * 4} -10 ${x + 10 + d * 10} 1Z`, bark[d < 0 ? 0 : 1]);
    // the bole: wide, fluted, lit on the west; the cut top a pale ring
    B.f(`M-30 0Q-34 ${top * .5} -28 ${top}H28Q34 ${top * .5} 30 0Z`, bark[0]);
    B.f(`M-30 0Q-34 ${top * .5} -28 ${top}H-10Q-14 ${top * .5} -12 0Z`, bark[2], .7).f(`M12 0Q16 ${top * .5} 12 ${top}H28Q34 ${top * .5} 30 0Z`, bark[1], .8);
    for (let i = 0; i < 9; i++) { const x = -24 + i * 6 + (r() - .5) * 2; B.s(`M${x} -2Q${x + (r() - .5) * 4} ${top * .5} ${x + (r() - .5) * 3} ${top + 2}`, bark[3], .8, .45); }
    B.f(B.ell(0, top, 28, 7), '#b49a70').f(B.ell(0, top, 24, 5.6), '#cdb488');
    for (let k = 1; k < 6; k++) B.s(B.ell(-1 + k * .3, top + .2, 24 - k * 4, 5.6 - k * .9), '#a08460', .6, .7);
    B.f(B.ell(-8, top - 1, 10, 2.4), '#e4d0a4', .5);
    mossOn(B, r, -26, top + 2, 30, 8, s); for (let i = 0; i < 5; i++) B.f(B.blob(r, -28 + r() * 4, top * (.2 + r() * .6), 4, 2, 6, .5), s === 'winter' ? '#e8eeea' : '#6f8446', .85);
    // bracket fungi on the shaded side
    for (const [x, y] of [[24, top * .55], [27, top * .42], [22, top * .3]]) B.f(`M${x - 5} ${y}q5 -4 10 0z`, '#c89a5a').f(`M${x - 5} ${y}h10`, '#8a6438');
    // the very small door: round-topped, green, with a step and a window that glows at night
    B.f(`M4 0V-12a6 6 0 0 1 12 0V0Z`, '#2e2418').f(`M5.4 0V-11.6a4.6 4.6 0 0 1 9.2 0V0Z`, '#4e7a4a').f(B.circ(12.8, -6, .8), '#e8c45a');
    B.f(B.rr(2, -1, 16, 2.6, 1), STONE.rock);
    B.f(B.circ(-6, -14, 3), '#3a2c1e').f(B.circ(-6, -14, 2.2), o.night ? '#ffd27a' : '#3e4e52').s('M-6 -16.2v4.4M-8.2 -14h4.4', '#8a6a46', .5);
    if (s !== 'winter') for (let i = 0; i < 4; i++) B.f(B.circ(-12 + i * 3, -2, 1.2), ['#f4f0e2', '#e8c84a'][i % 2]);
    B.tufts(r, -40, 4, 10, 6, grass(s), 7).tufts(r, 42, 4, 10, 6, grass(s), 7);
    void L;
  } };

  /* ---------- the hollow oak: an ancient pollard, its bole split open at the foot (the way in), an owl hole above, a few living limbs ---------- */
  A['ld-hollow'] = { box: [-78, -196, 80, 8], seat: { kind: 'moss', w: 74, front: 18, stones: 0 }, draw(B, o) {
    const r = KIT().rng(103), s = o.season, L = leaf(s), top = -sz('tree', .2) * .86, bark = ['#6a5a46', '#4a3e30', '#8e7c62', '#2a221a'];
    // roots
    for (const [x, d] of [[-36, -1], [-26, -1], [30, 1], [38, 1]]) B.f(`M${x - 7} -1Q${x + d * 8} -22 ${x + d * 2} -34L${x + 9} -28Q${x + 11 + d * 4} -12 ${x + 12 + d * 12} 2Z`, bark[d < 0 ? 0 : 1]);
    // the bole, broad and leaning a little, to a broken crown of pollard knuckles
    B.f(`M-34 0Q-40 ${top * .4} -30 ${top * .8}Q-26 ${top} -12 ${top - 4}Q4 ${top - 10} 18 ${top - 2}Q30 ${top * .8} 32 ${top * .45}Q36 ${top * .2} 34 0Z`, bark[0]);
    B.f(`M-34 0Q-40 ${top * .4} -30 ${top * .8}Q-24 ${top * .9} -16 ${top * .86}Q-22 ${top * .5} -16 0Z`, bark[2], .7).f(`M14 0Q20 ${top * .5} 18 ${top - 2}Q30 ${top * .8} 32 ${top * .45}Q36 ${top * .2} 34 0Z`, bark[1], .8);
    for (let i = 0; i < 12; i++) { const x = -30 + i * 5.4; B.s(`M${x} -2Q${x + (r() - .5) * 6} ${top * .5} ${x * .8 + (r() - .5) * 4} ${top * .85}`, bark[3], .9, .4); }
    // living limbs from the knuckles, with leafy sprays (not a full crown: the old tree's head was cut long ago)
    const limbs = [[-20, top - 2, -48, top - 44], [2, top - 8, 6, top - 62], [16, top - 4, 46, top - 40]];
    for (const [x0, y0, x1, y1] of limbs) B.s(`M${x0} ${y0}Q${(x0 + x1) / 2} ${y0 - 14} ${x1} ${y1}`, bark[1], 6).s(`M${x0} ${y0}Q${(x0 + x1) / 2} ${y0 - 14} ${x1} ${y1}`, bark[2], 1.6, .6);
    if (s !== 'winter') for (const [x1, y1] of limbs.map(l => [l[2], l[3]])) { for (let k = 0; k < 7; k++) { const px = x1 + (r() - .5) * 34, py = y1 + (r() - .5) * 20; B.f(B.blob(r, px + 3, py + 3, 13, 9, 8, .4), L[0], .95); } for (let k = 0; k < 6; k++) B.f(B.blob(r, x1 + (r() - .6) * 26, y1 + (r() - .7) * 16, 9, 6, 7, .45), L[2], .9); for (let k = 0; k < 3; k++) B.f(B.blob(r, x1 - 6 + r() * 8, y1 - 8 + r() * 6, 4, 3, 6, .5), L[3], .8); }
    // the hollow at the foot: a tall split, dark inside, lit lip; the owl hole up the trunk
    B.f(`M-12 0Q-15 -26 -4 -46Q4 -40 8 -26Q10 -12 10 0Z`, bark[3]).f(`M-9 0Q-11 -24 -3 -40Q3 -34 6 -24Q7 -12 7 0Z`, B.lin(0, -40, 0, 0, [[0, '#120c08'], [1, '#2a1e14']]));
    B.s(`M-12 0Q-15 -26 -4 -46`, bark[2], 2, .8);
    B.f(B.ell(-4, top * .62, 6, 7), bark[3]).f(B.ell(-4, top * .62 + 1, 4.4, 5.4), '#140e0a').s(B.ell(-4.6, top * .62, 6, 7), bark[2], 1, .6);
    mossOn(B, r, -32, top * .3, 20, 7, s); for (let i = 0; i < 4; i++) B.f(B.blob(r, 26 + r() * 6, top * (.3 + r() * .4), 3, 4, 6, .5), s === 'winter' ? '#dfe8e4' : '#6f8446', .8);
    for (let i = 0; i < 6; i++) { const x = -24 + r() * 50; B.s(`M${x} 4q-5 -7 -8 -14`, '#5f7a3c', 1.1, .9); }
    B.tufts(r, -46, 4, 10, 6, grass(s), 7).tufts(r, 48, 4, 10, 6, grass(s), 7);
  } };

  /* ---------- the pump: a cast-iron village pump, painted dark green, on a stone trough, setts round it ---------- */
  A['ld-pump'] = { box: [-40, -82, 40, 6], seat: { kind: 'flags', w: 54, front: 18 }, draw(B, o) {
    const r = KIT().rng(107), s = o.season, top = -sz('lamp', .3) * .95, green = ['#2e4a3a', '#1e3428', '#4e6e58'];
    // the trough: a long stone box, water in it, moss
    B.f(B.rr(-34, -18, 52, 18, 2), STONE.rockLo).f(B.rect(-34, -18, 52, 3.4), STONE.rockHi).f(B.rect(-31, -16.5, 46, 4), '#2e4a4e').f(B.ell(-14, -15, 9, 1), '#a8c8c8', .5);
    B.f(B.rect(-34, -14, 10, 14), STONE.rock, .8); mossOn(B, r, -34, -1, 52, 6, s);
    // the pump: a fluted column with a cap and finial, the handle up, the spout over the trough
    B.f(B.rect(14, top + 10, 12, -top - 10), green[0]).f(B.rect(14, top + 10, 3.4, -top - 10), green[2], .8).f(B.rect(23, top + 10, 3, -top - 10), green[1], .8);
    for (const y of [top + 18, -24, -6]) B.f(B.rect(12.6, y, 14.8, 3), green[1]).f(B.rect(12.6, y, 14.8, 1), green[2], .7);
    B.f(B.ell(20, top + 10, 8, 3), green[1]).f(B.circ(20, top + 4, 4.4), green[0]).f(B.circ(18.6, top + 2.6, 1.4), green[2], .8).f(B.rect(19, top - 3, 2, 4), green[1]);
    B.s(`M14 ${top + 24}Q6 ${top + 26} 4 ${top + 30}L-2 ${top + 34}`, green[0], 4).f(B.circ(-2, top + 35, 2.2), green[1]);
    B.s(`M26 ${top + 16}L38 ${top + 2}`, green[0], 3).f(B.circ(38, top + 2, 2.4), green[1]);
    B.s(`M-2 ${top + 37}v${-top - 37 - 18}`, '#a8c8d0', .9, .5);
    B.tufts(r, -36, 3, 8, 5, grass(s), 6).tufts(r, 32, 3, 10, 6, grass(s), 6);
  } };

  /* ---------- the old gardener: a stone man with a stone trowel on a plinth, mossy, ivy up the plinth ---------- */
  A['ld-statue'] = { box: [-32, -118, 34, 6], seat: { kind: 'moss', w: 40, front: 16 }, draw(B, o) {
    const r = KIT().rng(109), s = o.season, plinth = sz('wall', .4) * .9, fig = sz('door', 0) * 1.25, P = MOSSY, y0 = -plinth;
    ashlar(B, r, -16, y0, 32, plinth, P, 6); B.f(B.rect(-19, y0 - 4, 38, 5), P.rockHi).f(B.rect(-19, y0 + 1, 38, 1.4), P.rockDk, .5).f(B.rect(-19, -4, 38, 4), P.rockLo);
    ivy(B, r, -12, -2, y0 + 4, s); ivy(B, r, -6, -2, y0 + 10, s);
    // the figure: boots, coat to the knee, a hat, one arm out with the trowel, the other on a spade's handle
    const g = (d, t) => B.f(d, t === 0 ? P.rock : t === 1 ? P.rockHi : P.rockLo);
    g(`M-9 ${y0 - 4}l2 ${-fig * .12}h6l1 ${fig * .12}z`, 2); g(`M1 ${y0 - 4}l1 ${-fig * .12}h6l2 ${fig * .12}z`, 2);
    g(`M-11 ${y0 - 4 - fig * .1}L-9 ${y0 - fig * .7}Q0 ${y0 - fig * .76} 9 ${y0 - fig * .7}L11 ${y0 - 4 - fig * .1}Z`, 0);
    g(`M-11 ${y0 - 4 - fig * .1}L-9 ${y0 - fig * .7}Q-4 ${y0 - fig * .73} -2 ${y0 - fig * .72}L-3 ${y0 - 4 - fig * .1}Z`, 1);
    B.f(B.circ(0, y0 - fig * .8, 5.6), P.rock).f(B.circ(-1.6, y0 - fig * .82, 3), P.rockHi, .7);
    g(`M-9 ${y0 - fig * .86}h18l-3 -2.4h-12z`, 2); g(`M-5 ${y0 - fig * .88}q5 -8 10 0z`, 0);
    B.s(`M-8 ${y0 - fig * .62}L-20 ${y0 - fig * .48}`, P.rock, 4.4).f(`M-20 ${y0 - fig * .5}l-7 -3l2 6z`, P.rockLo);
    B.s(`M9 ${y0 - fig * .6}L14 ${y0 - fig * .4}`, P.rock, 4).s(`M15 ${y0 - fig * .7}V${y0 - 4}`, P.rockLo, 2.4).f(B.rect(12.4, y0 - 12, 5.2, 8), P.rockLo);
    for (let i = 0; i < 7; i++) B.f(B.blob(r, (r() - .5) * 18, y0 - fig * (.2 + r() * .7), 1.6 + r() * 2.2, 1 + r(), 6, .5), r() < .5 ? '#c9c48a' : '#8a9a5a', .7);
    mossOn(B, r, -18, y0 - 4, 34, 6, s); B.tufts(r, 0, 3, 40, 12, grass(s), 8);
  } };

  /* ---------- the summer house: an eight-sided timber house on a stone plinth, windows all round, a shingled roof with a finial ---------- */
  A['ld-house'] = { box: [-62, -140, 64, 8], seat: { kind: 'flags', w: 88, front: 18 }, lit: true, lights: [[-14, -46, 90], [18, -46, 90]], draw(B, o) {
    const r = KIT().rng(113), s = o.season, eaves = sz('eaves', .5), ridge = sz('ridge', .3), paint = ['#e8e0c8', '#c8bea2', '#fff8e6'];
    ashlar(B, r, -44, -8, 88, 8, STONE, 4);
    // three faces seen: the west face lit, the front, the east face in shade
    const face = (x0, x1, lean, tone) => { B.f(B.poly([[x0, -8], [x0 + lean, -eaves], [x1 - lean, -eaves], [x1, -8]]), tone); };
    face(-44, -24, 0, paint[2]); face(-24, 24, 0, paint[0]); face(24, 44, 0, paint[1]);
    for (const [x0, x1] of [[-42, -26], [-20, -4], [4, 20], [26, 42]]) windowLit(B, x0 + 2, -eaves + 10, x1 - x0 - 4, eaves * .45, o.night, '#f8f2e0');
    for (const x of [-44, -24, 24, 44]) B.post(x, -eaves, -8, 3, ['#d8ceb4', '#b0a688', '#fffaf0']);
    B.f(B.rect(-44, -eaves * .38, 88, 3), paint[1]).f(B.rect(-44, -12, 88, 4), '#b8ae94');
    // the roof: an eight-sided cone in shingles to a lead finial
    shingles(B, r, [[-52, -eaves + 2], [0, -ridge], [52, -eaves + 2]], ['#6a7a6a', '#4e5c50', '#8ea08c']);
    B.f(B.poly([[-52, -eaves + 2], [52, -eaves + 2], [48, -eaves + 6], [-48, -eaves + 6]]), '#3e4a40', .85);
    B.f(B.rect(-1.6, -ridge - 12, 3.2, 12), '#4a5054').f(B.circ(0, -ridge - 13, 2.4), '#5a6064');
    // roses up the west corner, pots by the steps
    const L = leaf(s); for (let i = 0; i < 10; i++) { B.f(B.blob(r, -46 + (r() - .5) * 6, -8 - i * 6, 4, 3, 6, .5), L[i % 2], .95); if (s === 'summer' && i % 3 === 0) B.f(B.circ(-46 + (r() - .5) * 6, -10 - i * 6, 1.8), '#d86a7a'); }
    for (const x of [-30, 34]) B.f(B.rr(x - 5, -8, 10, 8, 2), '#b86a4a').f(B.blob(r, x, -10, 6, 4, 7, .5), L[2]);
    B.tufts(r, -56, 4, 10, 6, grass(s), 7).tufts(r, 58, 4, 10, 6, grass(s), 7);
  } };

  /* ---------- the old house (Mother Thistle's, once): a small stone cottage, a mossy slate roof, a green door, a rose by it ---------- */
  A['ld-oldhouse'] = { box: [-64, -146, 64, 8], seat: { kind: 'earth', w: 90, front: 18 }, lit: true, lights: [[-22, -34, 80]], draw(B, o) {
    const r = KIT().rng(127), s = o.season, eaves = sz('eaves', .4), ridge = sz('ridge', .4), L = leaf(s);
    ashlar(B, r, -46, -eaves, 92, eaves, MOSSY, 7);
    for (let y = -eaves; y < 0; y += 9) for (const x of [-46, 40]) B.f(B.rect(x, y, 6, 4.6), MOSSY.rockHi, .8);
    // a chimney on the east gable, the roof of slate with moss and a sagging ridge
    B.f(B.rect(26, -ridge + 4, 12, ridge - eaves + 4), MOSSY.rockLo).f(B.rect(26, -ridge + 4, 4, ridge - eaves + 4), MOSSY.rock).f(B.rect(24, -ridge + 1, 16, 4), MOSSY.rockHi);
    B.f(B.poly([[-54, -eaves + 3], [-30, -ridge], [32, -ridge + 2], [54, -eaves + 3]]), '#56605e');
    for (let y = -eaves - 1; y > -ridge + 2; y -= 4.2) { const k = (-eaves + 3 - y) / (ridge - eaves + 3), a = -54 + 24 * k, b = 54 - 22 * k; B.s(`M${a} ${y}H${b}`, '#3e4644', .7, .6); }
    B.f(B.poly([[-54, -eaves + 3], [-30, -ridge], [-22, -ridge], [-44, -eaves + 3]]), '#7a8684', .45).s(`M-30 ${-ridge}L32 ${-ridge + 2}`, '#2e3432', 2);
    for (let i = 0; i < 9; i++) B.f(B.blob(r, -44 + r() * 90, -eaves - r() * (ridge - eaves) * .8, 5 + r() * 6, 2, 7, .5), s === 'winter' ? '#e8eeea' : i % 2 ? '#7d8f4e' : '#93a660', .85);
    // the door (east of middle), a window each side, the step
    B.f(B.rr(10, -sz('door', .2), 16, sz('door', .2), 1.4), '#2e2418').f(B.rr(11.4, -sz('door', .2) + 1.4, 13.2, sz('door', .2) - 1.4, 1), B.lin(11, 0, 25, 0, [[0, '#5a7a54'], [1, '#3e5a3a']])).f(B.circ(22, -24, 1), '#c8a23a');
    B.f(B.rr(7, -2, 22, 3, 1), STONE.rockHi);
    windowLit(B, -34, -eaves + 14, 14, 14, o.night, '#d8ccb0'); windowLit(B, -12, -eaves + 14, 14, 14, o.night, '#d8ccb0');
    // a climbing rose by the door, a water butt, herbs gone wild at the foot
    for (let i = 0; i < 12; i++) { B.f(B.blob(r, 30 + (r() - .5) * 6, -4 - i * 5, 4, 3, 6, .5), L[i % 2], .95); if ((s === 'summer' || s === 'spring') && i % 3 === 1) B.f(B.circ(30 + (r() - .5) * 6, -6 - i * 5, 1.8), '#e88aa0'); }
    B.f(B.rr(-58, -20, 12, 20, 3), '#5a6a54').s('M-58 -14h12M-58 -6h12', '#3e4a3a', .8);
    for (let i = 0; i < 8; i++) B.f(B.blob(r, -40 + r() * 46, -2, 5, 4, 7, .5), L[1 + (i % 2)], .9);
    B.tufts(r, -50, 4, 10, 6, grass(s), 7).tufts(r, 52, 4, 10, 6, grass(s), 7);
  } };

  /* ---------- the ice house: a turf mound, a brick portal set into its face, steps going down to a door left ajar ---------- */
  A['ld-icehouse'] = { box: [-66, -84, 66, 8], seat: { kind: 'earth', w: 40, front: 16, stones: 0 }, draw(B, o) {
    const r = KIT().rng(131), s = o.season, top = -sz('ridge', 0) * .62, G = grass(s), L = leaf(s);
    // the mound: turf over a buried dome, light on its west shoulder, a hawthorn on top
    B.f(B.blob(r, 0, top * .5, 62, -top * .56, 12, .12), s === 'winter' ? '#cfd8d0' : '#5e7a3c').f(B.blob(r, -12, top * .6, 44, -top * .4, 11, .16), s === 'winter' ? '#e8eeea' : '#76944a', .9).f(B.blob(r, -22, top * .72, 22, -top * .16, 9, .3), s === 'winter' ? '#f6f8f6' : '#94b060', .7);
    for (let i = 0; i < 30; i++) { const a = Math.PI * (.05 + r() * .9), x = -Math.cos(a) * 58, y = top * .5 - Math.sin(a) * -top * .5; B.tufts(r, x, y + 2, 6, 3, G, 5); }
    B.s(`M30 ${top * .96}q2 -16 -4 -26`, '#4e3a2a', 2.4); for (let k = 0; k < 6; k++) B.f(B.blob(r, 24 + (r() - .5) * 20, top * .96 - 24 + (r() - .5) * 12, 8, 6, 7, .45), L[k % 3], .95);
    // the portal: brick arch in a stone face, a keystone, steps going down into the dark, the door open a crack
    B.f(B.poly([[-26, 0], [-24, -40], [24, -40], [26, 0]]), STONE.rockLo); ashlar(B, r, -24, -40, 48, 40, STONE, 6.5);
    B.f(`M-14 0V-22a14 14 0 0 1 28 0V0Z`, '#8e4a33'); for (let a = 0; a <= 8; a++) { const t = Math.PI * (1 - a / 8); B.s(`M${Math.cos(t) * 11} ${-22 - Math.sin(t) * 11}L${Math.cos(t) * 14} ${-22 - Math.sin(t) * 14}`, '#5e2e20', .7, .8); }
    B.f(B.poly([[-3, -37], [3, -37], [2, -33], [-2, -33]]), STONE.rockHi);
    B.f(`M-11 0V-22a11 11 0 0 1 22 0V0Z`, B.lin(0, -33, 0, 0, [[0, '#0c1012'], [1, '#26302e']]));
    for (let i = 0; i < 4; i++) B.f(B.rect(-10 + i, -4 - i * 4, 20 - i * 2, 3), i % 2 ? '#5a5a50' : '#6e6e62', .9);
    B.f(B.poly([[4, 0], [4, -30], [10, -27], [10, 0]]), '#6a5034').s('M4 -24h6M4 -10h6', '#3e2e1e', .8);
    B.f(B.blob(r, 0, -2, 9, 1.6, 6, .5), '#c8e4ec', .35);
    for (const x of [-26, 26]) B.tufts(r, x, 1, 10, 6, G, 7);
  } };

  /* ---------- the bee boles: a stretch of dry-stone wall with three arched recesses, a straw skep in each ---------- */
  A['ld-boles'] = { box: [-44, -60, 46, 6], seat: { kind: 'earth', w: 70, front: 14 }, draw(B, o) {
    const r = KIT().rng(137), s = o.season, h = sz('wall', .9) * 1.05;
    for (let row = 0, y = -4; y > -h; row++, y -= 6) for (let x = -36 + (row & 1) * 4; x < 36; x += 8 + r() * 3) B.stone(r, x, y, 4.4 + r() * 1.6, 3, MOSSY, r() < .25 ? '#9aa86a' : null);
    B.f(B.rr(-38, -h - 4, 76, 6, 2), MOSSY.rockLo).f(B.rr(-38, -h - 4, 76, 2.6, 1.4), MOSSY.rockHi);
    for (const x of [-22, 0, 22]) {
      B.f(`M${x - 9} ${-h * .32}V${-h * .62}a9 9 0 0 1 18 0V${-h * .32}Z`, '#2a261e');
      for (let i = 0; i < 4; i++) B.f(B.ell(x, -h * .34 - i * 3.6, 7.4 - i * 1.3, 2.4), i % 2 ? '#c8a050' : '#dcb868');
      B.f(B.ell(x, -h * .34 - 1, 1.6, 1), '#3a2a14');
      B.f(B.rr(x - 10, -h * .32, 20, 3, 1), MOSSY.rockHi);
    }
    if (s === 'summer' || s === 'spring') for (let i = 0; i < 7; i++) B.f(B.circ(-30 + r() * 60, -h - 6 - r() * 14, .9), '#3a2a14');
    mossOn(B, r, -36, -h - 3, 72, 9, s); B.tufts(r, -38, 3, 10, 6, grass(s), 7).tufts(r, 40, 3, 10, 6, grass(s), 7);
  } };

  /* ---------- the driftwood arch: two bleached trunks leaned together on the shingle, lashed, floats and a bell hung from it ---------- */
  A['ld-driftwood'] = { box: [-60, -104, 60, 8], seat: { kind: 'sand', w: 84, front: 14, stones: 4 }, draw(B, o) {
    const r = KIT().rng(139), top = -sz('door', 1) * 1.6, bone = ['#d8cfbc', '#a8a08e', '#f0eadc', '#7a7466'];
    for (const [x0, x1] of [[-40, 6], [40, -6]]) { B.s(`M${x0} 0Q${x0 * .6} ${top * .6} ${x1} ${top}`, bone[3], 9).s(`M${x0} 0Q${x0 * .6} ${top * .6} ${x1} ${top}`, bone[1], 7).s(`M${x0 - 2} 0Q${x0 * .6 - 2} ${top * .6} ${x1 - 1} ${top + 1}`, bone[2], 2, .7); for (let k = 0; k < 3; k++) B.s(`M${x0 * (.8 - k * .2)} ${top * (.2 + k * .25)}q${x0 > 0 ? 6 : -6} -3 ${x0 > 0 ? 9 : -9} -10`, bone[1], 2.4); }
    B.s(`M-6 ${top + 4}l12 4M-6 ${top + 8}l12 -4`, '#8a7a58', 1.6);
    B.s(`M0 ${top + 6}v14`, '#8a7a58', .8).f(`M-3 ${top + 20}h6l1 6h-8z`, '#b8862a').f(B.circ(0, top + 27, 1.2), '#5a4018');
    for (const [x, y, c] of [[-26, top * .4, '#e0782a'], [-30, top * .3, '#f4f0e6'], [28, top * .45, '#3f7486']]) B.s(`M${x} ${y}v6`, '#8a7a58', .6).f(B.circ(x, y + 8, 2.6), c);
    for (let i = 0; i < 8; i++) B.f(B.ell(-30 + r() * 60, 2 + r() * 2, 1.6, 1), ['#f4ece0', '#e8c8b8', '#d8d0c0'][i % 3]);
    B.tufts(r, -46, 3, 10, 5, ['#a8a868', '#c8c080'], 8).tufts(r, 46, 3, 10, 5, ['#a8a868', '#c8c080'], 8);
  } };

  /* ---------- the old watchtower: half a round tower of rubble stone standing in the wood, a stair winding up inside it, arrow slits, ivy ---------- */
  A['ld-tower'] = { box: [-84, -250, 86, 8], seat: { kind: 'moss', w: 116, front: 16 }, draw(B, o) {
    const r = KIT().rng(149), s = o.season, top = -sz('tower', .1), P = MOSSY;
    // the far half's broken stub, the floor inside, then the near half standing, broken off in a jagged line
    B.f(B.poly([[-56, -6], [-56, top * .35], [-40, top * .38], [-20, top * .3], [0, top * .34], [20, top * .28], [40, top * .32], [56, top * .3], [56, -6]]), P.rockDk);
    ashlar(B, r, -56, top * .3, 112, -top * .3 - 6, Object.assign({}, P, { rock: '#7a7664', rockHi: '#8e8a76', rockLo: '#5e5a4c' }), 7);
    // the stair inside, climbing the west wall
    for (let i = 0; i < 10; i++) { const x = -48 + i * 5, y = -14 - i * 9; B.f(B.rect(x, y, 14, 3.4), P.rockHi).f(B.rect(x, y + 3.4, 14, 4), P.rockLo); }
    // the near (west and south) half: rubble courses, standing tall on the west, broken down to the east
    const edge = [[-62, 0], [-62, top * .96], [-52, top], [-44, top * .92], [-36, top * .8], [-24, top * .74], [-14, top * .6], [-2, top * .55], [10, top * .4], [24, top * .3], [36, top * .18], [48, top * .1], [62, -4], [62, 0]];
    B.f(B.poly(edge), P.rockLo);
    for (let y = -4; y > top; y -= 6.5) for (let x = -62 + ((y / 6.5) & 1) * 4; x < 62; x += 7 + r() * 4) { const lim = edge.find((p, i) => i > 0 && p[0] >= x) || edge[edge.length - 1]; if (y < lim[1] + 3) continue; const sx = (x + 62) / 124; B.stone(r, x, y, 3.8 + r() * 1.4, 2.8, { rock: sx < .3 ? P.rockHi : P.rock, rockLo: P.rockLo, rockHi: sx < .3 ? '#d8d4bc' : P.rockHi, rockDk: P.rockDk }, null); }
    B.f(B.poly([[30, 0], [36, top * .18], [48, top * .1], [62, -4], [62, 0]]), P.rockDk, .25);
    // arrow slits and a doorway at the foot (dark), the string course
    for (const [x, y] of [[-40, top * .7], [-14, top * .45], [-44, top * .35]]) B.f(B.rr(x - 1.8, y, 3.6, 14, 1.6), '#16140e');
    B.f(`M-12 0V-${sz('door', .4) - 6}a8 8 0 0 1 16 0V0Z`, '#1a1610');
    B.f(B.rect(-62, top * .5, 74, 3), P.rockHi, .6);
    // ivy up the west, moss on the broken tops, ferns at the foot
    ivy(B, r, -56, -2, top * .9, s); ivy(B, r, -48, -2, top * .6, s); ivy(B, r, 44, -2, top * .08, s);
    mossOn(B, r, -60, top + 4, 20, 6, s); mossOn(B, r, -20, top * .6, 30, 6, s);
    for (let i = 0; i < 8; i++) { const x = -60 + r() * 124; B.s(`M${x} 4q-5 -7 -8 -14`, '#5f7a3c', 1.1, .9); }
  } };

  /* ---------- the turf labyrinth: a round of close turf with the maze's worn paths in it, a stone at the heart (all of it lies in the ground) ---------- */
  A['ld-labyrinth'] = { box: [-74, -66, 76, 10], shade: false, flat: true, seat: { kind: 'turf', w: 40, front: 10, back: 54, stones: 0, way: true }, draw(B, o) {
    const r = KIT().rng(151), s = o.season, G = grass(s);
    B.f(B.ell(0, -26, 70, 30), s === 'winter' ? '#c8d0c4' : '#6e8a44', .9).f(B.ell(-8, -30, 50, 20), s === 'winter' ? '#dfe6dc' : '#86a256', .55);
    for (let k = 0; k < 6; k++) { const rx = 62 - k * 10, ry = 26 - k * 4.2, gap = (k % 2 ? .3 : -.3); B.s(`M${Math.cos(gap + .2) * rx} ${-26 + Math.sin(gap + .2) * ry}A${rx} ${ry} 0 1 1 ${Math.cos(gap - .2) * rx} ${-26 + Math.sin(gap - .2) * ry}`, s === 'winter' ? '#a8a294' : '#a8946a', 3.4, .85); }
    B.stone(r, 0, -26, 6, 4, STONE, '#9aa86a');
    B.tufts(r, -68, -24, 6, 5, G, 5).tufts(r, 70, -24, 6, 5, G, 5);
  } };
})();
