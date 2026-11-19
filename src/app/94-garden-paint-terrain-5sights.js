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
      for (const [y, half] of rows) for (let x = -half + r() * 3; x < half;) { const fw = 7 + r() * 7, fh = 3.6 + r() * 2.2, cx = x + fw / 2, cy = y + (r() - .5) * 2.4, edge = Math.abs(cx) / half; if (r() < .12 + edge * .3) { x += fw * .7; continue; } const k = 1 - edge * .35; B.f(B.blob(r, cx + .7, cy + .8, fw * .5 * k, fh * .5 * k, 7, .28), P.joint, .4).f(B.blob(r, cx, cy, fw * .5 * k, fh * .5 * k, 7, .28), r() < .3 ? P.flagLo : P.flag, .92).f(B.blob(r, cx - fw * .12, cy - fh * .16, fw * .3 * k, fh * .22 * k, 6, .3), P.flagHi, .5); if (r() < .3) B.f(B.blob(r, cx + fw * .45, cy + fh * .2, 2.2, 1, 6, .5), snowy ? '#eef2ee' : G[0], .7); x += fw + .6 + r() * 1.4; }
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
    // (a door listed far from its thing, as the wishing well's is, is where you stand to look at it: the way starts at the thing)
    const near = prop.door && prop.door.x >= prop.x - 2 && prop.door.x <= prop.x + (prop.w || 1) + 1 && prop.door.y >= prop.y - 2 && prop.door.y <= prop.y + (prop.h || 1) + 1;
    const door = near ? [((prop.door.x + .5) * W.cellW - x), Math.max(6, W.sky + (prop.door.y + .5) * W.cellH - foot)] : prop.door ? [0, 10] : null;
    let way = null;
    if (o.way !== false && door) {
      const dx0 = (x + door[0]) / W.cellW, dy0 = (foot + door[1] - W.sky) / W.cellH, c = nearestRoute(dx0, dy0);
      if (c && c.gap > .35 && c.gap < 5) { const len = Math.hypot(c.x - dx0, c.y - dy0) || 1, ux = (c.x - dx0) / len, uy = (c.y - dy0) / len, ex = (c.x - ux * c.half * .6) * W.cellW - x, ey = W.sky + (c.y - uy * c.half * .6) * W.cellH - foot; way = [ex, ey]; }
    }
    const pts = [[-w / 2 - front - 14, -back - 10], [w / 2 + front + 14, front + 22]]; if (way) { pts.push([way[0] - 16, way[1] - 12], [way[0] + 16, way[1] + 12]); }
    if (o.box) pts.push([o.box[0], o.box[1]], [o.box[2], o.box[3]]);
    const box = [Math.floor(Math.min(...pts.map(p => p[0]))), Math.floor(Math.min(...pts.map(p => p[1]))), Math.ceil(Math.max(...pts.map(p => p[0]))), Math.ceil(Math.max(...pts.map(p => p[1])))];
    const season = o.season || 'summer', seed = kit.hashStr(prop.id + ':' + Math.round(x) + ',' + Math.round(foot));
    const key = 'gps|' + prop.id + '|' + season + '|' + Math.round(x) + ',' + Math.round(foot) + (way ? '|' + way.map(Math.round).join(',') : '');
    const spec = Object.assign({}, o, { kind, w, front, back, door, way, seed, season });
    const make = () => { const im = kit.sprite(scene, layer, key, box, B => drawSeat(B, spec), x, foot, 1.5, false); if (im) im.setDepth(DEPTH); return im; };
    if (scene.textures.exists(key)) return make();   // (painted already: only a picture to stand)
    // A seat takes 5 to 10 ms to paint, and a whole garden has about a hundred: they are painted a few at a time, nearest
    // the camera first, on a timer outside the frame, so opening the garden or walking never waits for them all.
    const job = { scene, x, y: foot, make, im: null, dead: false, vis: true, alpha: 1 };
    queue.push(job); if (!timer) timer = setInterval(pump, 34);
    return { destroy() { job.dead = true; if (job.im) job.im.destroy(); job.im = null; }, setVisible(v) { job.vis = v; if (job.im) job.im.setVisible(v); return this; }, setAlpha(a) { job.alpha = a; if (job.im) job.im.setAlpha(a); return this; } };
  }
  const queue = []; let timer = null, pumped = 0, pumpWorst = 0;
  function pump() {
    const t0 = performance.now();
    while (queue.length && performance.now() - t0 < 8) {
      let best = 0, bd = Infinity;
      for (let i = 0; i < queue.length; i++) { const j = queue[i], cam = j.scene && j.scene.cameras && j.scene.cameras.main, v = cam && cam.worldView; const d = v ? Math.hypot(j.x - v.centerX, j.y - v.centerY) : 0; if (j.dead) { best = i; bd = -1; break; } if (d < bd) { bd = d; best = i; } }
      const j = queue.splice(best, 1)[0]; if (j.dead || !j.scene || !j.scene.sys || !j.scene.textures) continue;
      try { j.im = j.make(); if (j.im) { j.im.setVisible(j.vis); j.im.setAlpha(j.alpha); } } catch (e) { /* the scene went while it waited */ }
      pumped++;
    }
    pumpWorst = Math.max(pumpWorst, performance.now() - t0);
    if (!queue.length) { clearInterval(timer); timer = null; }
  }
  const status = () => ({ waiting: queue.length, painted: pumped, worstTickMs: Math.round(pumpWorst) });
  return { add, nearestRoute, status, SEAT, DEPTH };
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
    // the head: courses of rough dressed stone round the drum, each block its own tone, dark mortar, lit to the west
    const WS = ['#b8ae96', '#a39a82', '#8e8670', '#c9c0a8', '#9a927c'], courses = 4, ch = (wall + 5) / courses;
    B.f(`M-21 ${top}A21 7 0 0 0 21 ${top}L21 ${top + wall + 5}A21 7 0 0 1 -21 ${top + wall + 5}Z`, '#6e6654');
    for (let row = 0; row < courses; row++) { const y0 = top + row * ch, n = 6 + (row & 1); let a = (row & 1) * .22;
      for (let i = 0; i < n; i++) { const a0 = Math.PI * a / 1, span = (1 - (row & 1) * .22 / n) / n; let a1 = Math.min(1, a + span * (.8 + r() * .4)); if (i === n - 1) a1 = 1; const p0 = -Math.cos(Math.PI * a), p1 = -Math.cos(Math.PI * a1), s0 = Math.sin(Math.PI * a) * 7, s1 = Math.sin(Math.PI * a1) * 7, x0 = p0 * 21 + .5, x1 = p1 * 21 - .5, mid = (x0 + x1) / 2;
        let tone = WS[Math.floor(r() * WS.length)]; if (mid < -10) tone = r() < .6 ? '#d4ccb4' : tone; if (mid > 11) tone = r() < .6 ? '#7e7662' : tone;
        B.f(B.poly([[x0, y0 + s0 + .5], [x1, y0 + s1 + .5], [x1, y0 + ch + s1 - .5], [x0, y0 + ch + s0 - .5]]), tone).f(B.poly([[x0, y0 + s0 + .5], [x1, y0 + s1 + .5], [x1, y0 + s1 + 1.6], [x0, y0 + s0 + 1.6]]), '#ffffff', mid < 6 ? .22 : .08);
        a = a1; void a0; if (a >= 1) break; } }
    B.f(`M8 ${top + 3}Q21 ${top + 1} 21 ${top}L21 ${top + wall + 5}Q14 ${top + wall + 11} 4 ${top + wall + 12}Z`, '#2a281e', .22);
    // the coping: a ring of flat capstones round the mouth, lit on top
    B.s(B.ell(0, top, 20, 6.6), '#7a7260', 4.4).s(B.ell(0, top - .8, 20, 6.4), '#d8d0b8', 2, .9);
    for (let i = 0; i < 10; i++) { const t = i / 10 * Math.PI * 2; B.s(`M${Math.cos(t) * 17.6} ${top + Math.sin(t) * 5.4}L${Math.cos(t) * 22.4} ${top + Math.sin(t) * 7.6}`, '#5e5848', .7, .7); }
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
  A['ld-sunk'] = { box: [-56, -42, 56, 10], shade: false, flat: true, door: { dx: -30, dy: -8 }, seat: { kind: 'flags', w: 96, front: 12, back: 30, stones: 0 }, draw(B, o) {
    // The drowned cellar's way in, let into the ground: a square stone tank with a flight of steps going down into it at
    // the near west end, and under its far wall a round-headed doorway half drowned, the cellar beyond it in the dark.
    // (It read as a small round pond with a stone rim: nothing said it was a way in. Art director and hunter, round 3.)
    const r = KIT().rng(73), s = o.season, L = leaf(s), snowy = s === 'winter';
    // the sunk hollow's shade round the kerb, then the kerb itself: a ring of dressed coping slabs lit from the upper left
    B.f(B.rr(-50, -40, 100, 39, 8), STONE.rockDk, .45);
    B.f(B.rr(-47, -38, 94, 35, 6), STONE.rockLo).f(B.rr(-46, -38, 92, 32, 6), STONE.rock);
    for (let x = -44; x < 44; ) { const w = 9 + r() * 6; B.s(`M${x + w} -37.4v4`, STONE.rockDk, .7, .55); B.s(`M${x + w} -9v4.4`, STONE.rockDk, .7, .55); x += w; }
    for (let y = -33; y < -8; y += 7 + r() * 3) { B.s(`M-46 ${y}h5`, STONE.rockDk, .7, .55); B.s(`M41 ${y}h5`, STONE.rockDk, .7, .55); }
    B.f(B.rr(-46, -38, 92, 2.4, 1.2), STONE.rockHi, .8).f(B.rect(-46, -38, 2.4, 32), STONE.rockHi, .45);
    // the tank: its far wall's face (you look down on to it), coursed stone, darker towards the water
    B.f(B.rr(-39, -32, 78, 25, 2.5), '#1a2628');
    ashlar(B, r, -38, -31, 76, 12, STONE, 4);
    B.f(B.rect(-38, -24, 76, 5), '#1e2a2c', .45);
    // the doorway under the far wall: a round head of voussoirs and a keystone, black inside, the water running in under it
    const dx0 = 4, dx1 = 24, spring = -24, top = -31;
    B.f(`M${dx0} -19V${spring}A${(dx1 - dx0) / 2} ${spring - top} 0 0 1 ${dx1} ${spring}V-19Z`, '#06100f');
    for (let i = 0; i <= 8; i++) { const a = Math.PI - i / 8 * Math.PI, rx = (dx1 - dx0) / 2 + 1.6, cx = (dx0 + dx1) / 2, x = cx + Math.cos(a) * rx, y = spring - Math.sin(a) * (spring - top + 1.2); B.f(B.circ(x, y, i === 4 ? 2.1 : 1.6), i === 4 ? STONE.rockHi : i % 2 ? STONE.rock : STONE.rockLo); }
    B.s(`M${dx0 - 1} -19V${spring}M${dx1 + 1} -19V${spring}`, STONE.rockHi, 1.2, .7);
    B.f(B.circ(dx1 + 5, -27, 1.3), '#2c3032').s(B.ell(dx1 + 5, -24.8, 1.6, 2), '#4a5054', .8);   // an iron ring by the door
    // the water, a step down: dark and still, the doorway's reflection, the light along its near edge, lilies at the far end
    B.f(B.rr(-38, -19.4, 76, 12.4, 2), B.lin(0, -19, 0, -7, [[0, '#1c3034'], [.6, '#2a464a'], [1, '#3a5a5a']]));
    B.f(B.rect(dx0, -19, dx1 - dx0, 5), '#081414', .55).s(`M${dx0 + 2} -16.5h${dx1 - dx0 - 4}`, '#4e6e70', .7, .4);
    B.s('M-20 -11h44', '#a8c8c8', .8, .35).s('M-8 -14.6h20', '#c8e0dc', .6, .3);
    if (!snowy) for (const [x, y, k] of [[30, -13, 1], [34, -9.6, .8]]) { B.f(B.ell(x, y, 4.4 * k, 1.9 * k), L[1]).f(`M${x} ${y}l${3.6 * k} ${-1.1 * k}l0 ${1.3 * k}z`, '#2a464a'); if (k === 1) B.f(B.circ(x - 1, y - .8, 1.2), '#f4e2ea'); }
    else B.f(B.rr(-37, -19, 74, 11, 2), '#dfe9ee', .7);
    // the steps down at the near west end, each tread lit, each riser in shade, the third going under the water
    for (let i = 0; i < 4; i++) { const y = -8 - i * 3.6, x0 = -38, w = 15 - i * .4, under = i >= 3;
      B.f(B.rect(x0, y - 3.4, w, 3.6), under ? '#3e5a5c' : i % 2 ? STONE.rock : STONE.rockHi, under ? .8 : 1).f(B.rect(x0, y - .9, w, 1), STONE.rockDk, under ? .35 : .7);
      if (!under) B.f(B.ell(x0 + w * .55, y - 2.2, w * .22, .7), '#ffffff', .14); }
    B.f(B.rect(-38, -22, 15, 3), '#2a464a', .5);
    // moss and ferns at the corners, a tuft at the top of the steps
    mossOn(B, r, -46, -36, 30, 6, s); mossOn(B, r, 18, -36, 26, 5, s); mossOn(B, r, -46, -6, 18, 3, s);
    if (!snowy) for (const [x, y, d] of [[46, -30, 1], [-47, -30, -1], [46, -8, 1]]) for (let k = 0; k < 4; k++) B.s(`M${x} ${y}q${d * (3 + k * 2)} -4 ${d * (6 + k * 2)} ${-1 - k * 2}`, '#5f7a3c', 1, .9);
    B.tufts(r, -46, 3, 10, 5, grass(s), 6).tufts(r, 46, 3, 10, 5, grass(s), 6).tufts(r, -30, -2, 8, 3, grass(s), 4);
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
  A['ld-sign-c'] = { box: [-50, -100, 50, 6], door: { dx: 26, dy: 2 }, seat: { kind: 'turf', w: 22, front: 12, back: 6, stones: 3, way: false }, draw(B, o) {
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
  A['ld-mile'] = { box: [-24, -50, 64, 8], door: { dx: 30, dy: -2 }, seat: { kind: 'earth', w: 30, front: 14, back: 26, flags: true, box: [-20, -40, 60, 10], extra(B, r, P) {
      for (const [x, y] of [[8, -6], [50, -8], [30, 2]]) B.f(B.blob(r, x, y, 3, 1.4, 6, .5), '#6f8446', .7);
    } }, draw(B, o) {
    // The measurer's den: cellar doors let into the foot of a turf bank behind the milestone, two oak leaves sloping in a
    // stone kerb, strap hinges and the iron ring, a worn step in front. (It was a small flat plank box on the forest floor
    // that did not read as a way in: art director and hunter, round 3.)
    const r = KIT().rng(97), s = o.season, h = sz('wall', .2) * .72, G = grass(s), snowy = s === 'winter';
    // the bank the den is dug into, rising behind the doors, turf and a few stones over its back
    B.f(B.blob(r, 32, -18, 30, 16, 12, .2), s === 'autumn' ? '#7a7a40' : snowy ? '#c8d0c8' : '#5e7a3a').f(B.blob(r, 28, -24, 22, 9, 10, .25), s === 'autumn' ? '#9a9450' : snowy ? '#e8eeea' : '#78964a', .9);
    for (let i = 0; i < 5; i++) B.stone(r, 12 + r() * 40, -30 + r() * 12, 2.6 + r() * 2, 1.6 + r(), MOSSY, r() < .5 ? '#9aa86a' : null);
    B.tufts(r, 32, -30, 40, 12, G, 6);
    // the stone kerb round the doors, lit on its top edge
    B.f(B.poly([[13, -2], [47, -2], [45, -21], [15, -21]]), MOSSY.rockLo).f(B.poly([[15, -21], [45, -21], [44.4, -19], [15.6, -19]]), MOSSY.rockHi, .85);
    for (const x of [16, 22, 29, 36, 42]) B.s(`M${x} -21.4v2.2`, MOSSY.rockDk, .6, .6);
    // the two doors, sloping down to you, planked, the one on the left a little lit
    for (const [pts, tone] of [[[[16, -3.5], [30, -3.5], [30, -19], [17, -19]], '#7a5c3c'], [[[30, -3.5], [44, -3.5], [43, -19], [30, -19]], '#684c30']]) B.f(B.poly(pts), tone);
    for (const x of [20.5, 25, 34.5, 39]) B.s(`M${x} -18.6L${x - (x < 30 ? .6 : -.4)} -4`, '#4a3622', .6, .7);
    B.s('M30 -19V-3.5', '#2e2014', 1.1).f(B.poly([[16, -19], [30, -19], [30, -17.4], [16.4, -17.4]]), '#a8865a', .6);
    for (const y of [-15, -7.4]) B.s(`M17 ${y}h9M34 ${y}h9`, '#2c3032', 1.2).f(B.circ(26.4, y, .8), '#5a5e60').f(B.circ(33.6, y, .8), '#5a5e60');
    B.s(B.ell(30, -11, 2.6, 1.6), '#2c3032', 1.4).s(B.ell(29.6, -11.4, 2.6, 1.6), '#8a9094', .5, .8);
    // a worn step of stone in front of them
    B.f(B.rr(18, -3, 24, 4.4, 1.6), MOSSY.rock).f(B.rr(19, -3, 22, 1.4, .7), MOSSY.rockHi, .8);
    // the milestone, its face to the road: 0
    const pts = [[-12, 0], [-12.6, -h * .55], [-9, -h * .94], [0, -h * 1.04], [9, -h * .94], [12.6, -h * .55], [12, 0]];
    B.f(B.poly(pts), MOSSY.rockLo).f(B.poly([[-12, 0], [-12.6, -h * .55], [-9, -h * .94], [-2, -h], [-3, 0]]), MOSSY.rock).f(B.poly([[-10.5, -h * .55], [-8, -h * .86], [-3, -h * .92], [-5, -h * .5]]), MOSSY.rockHi, .6);
    B.text('0', 0, -h * .52, 9, '#4a463a'); B.text('0', -.6, -h * .53, 9, 'rgba(255,255,255,.18)');
    for (let i = 0; i < 4; i++) B.f(B.blob(r, -8 + r() * 16, -h * (.2 + r() * .7), 1.6 + r() * 2, 1 + r(), 6, .5), r() < .5 ? '#c9c48a' : '#9aa86a', .75);
    B.tufts(r, 0, 3, 28, 12, G, 7).tufts(r, 50, 2, 14, 6, G, 6).tufts(r, 12, 1, 6, 3, G, 5);
    if (!snowy) for (let k = 0; k < 4; k++) B.s(`M${52 + k * 2} 0q${3 + k} -6 ${6 + k * 2} -9`, '#5f7a3c', 1.1, .9);   // a fern at the bank's end
  } };

  /* ---------- the great stump: an old oak cut long ago, roots gripping the ground, moss, bracket fungus, a very small door with a lit window ---------- */
  A['ld-stump'] = { box: [-50, -70, 52, 8], door: { dx: 10, dy: 0 }, seat: { kind: 'moss', w: 70, front: 16, stones: 0 }, lit: true, lights: [[12, -16, 50]], draw(B, o) {
    const r = KIT().rng(101), s = o.season, L = leaf(s), top = -sz('wall', 1) * 1.15, bark = ['#6e5a42', '#4e3e2c', '#8e785a', '#2e2418'];
    // roots: buttresses flaring into the ground on both sides
    for (const [x, d] of [[-30, -1], [-20, -1], [26, 1], [34, 1], [-6, 0]]) B.f(`M${x - 6} -2Q${x + d * 6} -18 ${x + d * 2} -26L${x + 8} -22Q${x + 10 + d * 4} -10 ${x + 10 + d * 10} 1Z`, bark[d < 0 ? 0 : 1]);
    // the bole: wide, fluted, lit on the west; the cut top a pale ring
    B.f(`M-24 0Q-30 ${top * .5} -27 ${top}H27Q30 ${top * .5} 24 0Z`, bark[0]);
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
    for (const [x, d] of [[-30, -1], [-22, -1], [22, 1], [28, 1]]) B.f(`M${x - 7} 1Q${x + d * 6} -10 ${x + d * 2} -18L${x + 9} -14Q${x + 11 + d * 4} -6 ${x + 12 + d * 10} 2Z`, bark[d < 0 ? 0 : 1]);
    // the bole, broad and leaning a little, to a broken crown of pollard knuckles
    B.f(`M-26 0Q-32 ${top * .4} -28 ${top * .8}Q-26 ${top} -12 ${top - 4}Q4 ${top - 10} 18 ${top - 2}Q30 ${top * .8} 30 ${top * .45}Q28 ${top * .2} 26 0Z`, bark[0]);
    B.f(`M-26 0Q-32 ${top * .4} -28 ${top * .8}Q-24 ${top * .9} -16 ${top * .86}Q-20 ${top * .5} -14 0Z`, bark[2], .7).f(`M12 0Q18 ${top * .5} 18 ${top - 2}Q30 ${top * .8} 30 ${top * .45}Q28 ${top * .2} 26 0Z`, bark[1], .8);
    for (let i = 0; i < 12; i++) { const x = -30 + i * 5.4; B.s(`M${x} -2Q${x + (r() - .5) * 6} ${top * .5} ${x * .8 + (r() - .5) * 4} ${top * .85}`, bark[3], .9, .4); }
    // living limbs from the knuckles, with leafy sprays (not a full crown: the old tree's head was cut long ago)
    const limbs = [[-20, top - 2, -48, top - 44], [2, top - 8, 6, top - 62], [16, top - 4, 46, top - 40]];
    for (const [x0, y0, x1, y1] of limbs) B.s(`M${x0} ${y0}Q${(x0 + x1) / 2} ${y0 - 14} ${x1} ${y1}`, bark[1], 6).s(`M${x0} ${y0}Q${(x0 + x1) / 2} ${y0 - 14} ${x1} ${y1}`, bark[2], 1.6, .6);
    if (s !== 'winter') for (const [x1, y1] of limbs.map(l => [l[2], l[3]])) { for (let k = 0; k < 7; k++) { const px = x1 + (r() - .5) * 34, py = y1 + (r() - .5) * 20; B.f(B.blob(r, px + 3, py + 3, 13, 9, 8, .4), L[0], .95); } for (let k = 0; k < 6; k++) B.f(B.blob(r, x1 + (r() - .6) * 26, y1 + (r() - .7) * 16, 9, 6, 7, .45), L[2], .9); for (let k = 0; k < 3; k++) B.f(B.blob(r, x1 - 6 + r() * 8, y1 - 8 + r() * 6, 4, 3, 6, .5), L[3], .8); }
    // the hollow at the foot: a tall split, dark inside, lit lip; the owl hole up the trunk
    B.f(`M-12 0Q-15 -26 -4 -46Q4 -40 8 -26Q10 -12 10 0Z`, bark[3]).f(`M-9 0Q-11 -24 -3 -40Q3 -34 6 -24Q7 -12 7 0Z`, B.lin(0, -40, 0, 0, [[0, '#120c08'], [1, '#2a1e14']]));
    B.s(`M-12 0Q-15 -26 -4 -46`, bark[2], 2, .8);
    // someone large and feathered at home in the dark of it: two round eyes, a glint in each
    for (const ex of [-4.4, 2.2]) B.f(B.circ(ex, -27, 2.5), '#e8b830').f(B.circ(ex + .3, -27, 1.2), '#1a1208').f(B.circ(ex - .5, -27.8, .55), '#fff8e0');
    B.f(`M-3 -23.6l2 2.2l2 -2.2z`, '#8a6a3a');
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
  A['ld-statue'] = { box: [-32, -118, 58, 6], door: { dx: 40, dy: 0 }, seat: { kind: 'moss', w: 40, front: 16 }, draw(B, o) {
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
    // the way in to the old hothouse: its iron doorway still standing in a low brick sill, a few panes left, ivy through it
    B.f(B.rect(28, -5, 26, 5), '#8e4a33').f(B.rect(28, -5, 26, 1.4), '#b86a4a');
    B.s(`M30 -5V-46Q41 -58 52 -46V-5`, '#2e3a36', 2).s(`M41 -54V-5M30 -26H52`, '#2e3a36', 1.1);
    B.f(`M31 -26V-45Q35.5 -50 40 -52V-26Z`, '#cfe4e0', .42).f(`M42 -26V-52Q47 -50 51 -45V-26Z`, '#cfe4e0', .25).f(B.rect(31, -25, 9, 19), '#16201c', .55).f(B.rect(42, -25, 9, 19), '#16201c', .7);
    ivy(B, r, 31, -4, -40, s); ivy(B, r, 51, -4, -30, s);
    mossOn(B, r, -18, y0 - 4, 34, 6, s); B.tufts(r, 0, 3, 40, 12, grass(s), 8).tufts(r, 41, 3, 26, 8, grass(s), 7);
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
  A['ld-icehouse'] = { box: [-66, -84, 66, 8], door: { dx: 0, dy: 0 }, seat: { kind: 'earth', w: 40, front: 16, stones: 0 }, draw(B, o) {
    const r = KIT().rng(131), s = o.season, top = -sz('ridge', 0) * .62, G = grass(s), L = leaf(s);
    // the mound: turf over a buried dome, light on its west shoulder, a hawthorn on top
    // (in the colours of the turf round it, lit softly on the west shoulder: no bright lump laid on top)
    B.f(B.blob(r, 2, top * .5 + 2, 63, -top * .56, 12, .12), s === 'winter' ? '#b8c4bc' : '#4e6a34', .9).f(B.blob(r, 0, top * .5, 61, -top * .55, 12, .12), s === 'winter' ? '#cfd8d0' : '#64803e');
    for (let k = 0; k < 7; k++) B.f(B.blob(r, -34 + k * 6, top * (.62 + k * .02), 30 - k * 3, -top * (.3 - k * .03), 10, .2), s === 'winter' ? '#e2e9e4' : k < 3 ? '#6e8c46' : '#7a9a4e', .22);
    for (let i = 0; i < 40; i++) { const x = (r() - .5) * 110, y = top * .5 + (r() - .3) * -top * .8; if (Math.abs(x) < 26 && y > -44) continue; B.s(`M${x} ${y}l${(r() - .5) * 2} -${2 + r() * 3}`, s === 'winter' ? '#f4f6f4' : r() < .5 ? '#86a456' : '#4e6a34', .9, .7); }
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
    // rubble courses: every stone its own size and weather, dark mortar between, the round of the tower lit on the west and
    // turning into shade on the east, a band of bigger quoins every few courses (never one pebble stamped over a wall)
    const tones = ['#a8a490', '#9a9682', '#8c8874', '#b8b49e', '#7e7a68', '#a09a7e'];
    B.f(B.poly(edge), '#55534a');
    for (let y = -3, row = 0; y > top; row++) { const ch = row % 5 === 4 ? 7.5 : 4.6 + r() * 2.4; for (let x = -62 - r() * 6; x < 62;) { const sw = (row % 5 === 4 ? 10 : 5) + r() * (row % 5 === 4 ? 6 : 8), cx = x + sw / 2, cy = y - ch / 2, lim = edge.find((p, i) => i > 0 && p[0] >= cx) || edge[edge.length - 1]; x += sw + .9; if (cy - ch / 2 < lim[1] + 1) continue; const round = Math.cos((cx / 62) * 1.25), lit = Math.max(0, Math.min(1, .62 - cx / 140)); let tone = tones[Math.floor(r() * tones.length)]; B.f(B.blob(r, cx, cy, sw * .5, ch * .48, 7, .16), tone).f(B.blob(r, cx - sw * .12, cy - ch * .2, sw * .32, ch * .2, 6, .3), '#e4dfc8', .18 + lit * .4).f(B.blob(r, cx + sw * .1, cy + ch * .22, sw * .4, ch * .16, 6, .3), '#3a382e', .2 + (1 - round) * .3); } y -= ch + .9; }
    B.f(B.poly([[-62, 0], [-62, top * .96], [-40, top * .9], [-40, 0]]), '#ffffff', .06);
    B.f(B.poly([[30, 0], [36, top * .18], [48, top * .1], [62, -4], [62, 0]]), P.rockDk, .25);
    // arrow slits and a doorway at the foot (dark), the string course
    for (const [x, y] of [[-40, top * .7], [-14, top * .45], [-44, top * .35]]) B.f(B.rr(x - 1.8, y, 3.6, 14, 1.6), '#16140e');
    B.f(`M-12 0V-${sz('door', .4) - 6}a8 8 0 0 1 16 0V0Z`, '#1a1610');
    B.f(B.rect(-62, top * .5, 62, 3), P.rockHi, .5);
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

  /* ---------- the old barn: weatherboarded oxblood walls on a stone plinth, a great slate roof (four times the player), the doors open on the hay, a loft door and hoist in the gable, a lean-to ---------- */
  A['ld-barn'] = { box: [-92, -176, 96, 10], door: { dx: 14, dy: 0 }, seat: { kind: 'earth', w: 140, front: 22 }, lit: true, lights: [[14, -26, 90]], draw(B, o) {
    const r = KIT().rng(283), s = o.season, wall = sz('eaves', 1) * 1.08, ridge = sz('hall', .45) * .98, red = ['#8e3428', '#6e261e', '#ac4e3e', '#4e1812'], L = leaf(s);
    // the lean-to on the east end, under its own lower roof
    B.f(B.rect(56, -wall * .62, 16, wall * .62), red[1]); for (let x = 56; x < 72; x += 5) B.s(`M${x} ${-wall * .62}v${wall * .62}`, red[3], .6, .5);
    B.f(B.poly([[54, -wall * .6], [54, -wall * .86], [76, -wall * .6]]), '#5d6366').s(`M54 ${-wall * .86}L76 ${-wall * .6}`, '#3c4244', 1.4);
    for (let i = 0; i < 3; i++) B.f(B.rr(58 + i * 4.4, -10, 4, 10, 1), WOOD[i % 2], .95);
    // the plinth and the walls: vertical boards, each its own weather, lit to the west
    ashlar(B, r, -64, -9, 120, 9, STONE, 4.5);
    B.f(B.rect(-64, -wall, 120, wall - 9), red[0]);
    for (let x = -64; x < 56; x += 5.6) { B.s(`M${x} ${-wall}v${wall - 9}`, red[3], .7, .5); if (r() < .4) B.f(B.rect(x + .6, -wall + r() * wall * .5, 4.4, wall * (.2 + r() * .3)), r() < .5 ? red[2] : red[1], .35); }
    B.f(B.rect(-64, -wall, 26, wall - 9), '#ffffff', .07).f(B.rect(36, -wall, 20, wall - 9), '#000000', .16);
    // the roof: a broad gable in old slates, mossed, a ridge of clay tiles, the gable's barge boards
    B.f(B.poly([[-72, -wall + 3], [-40, -ridge], [32, -ridge], [64, -wall + 3]]), '#585e60');
    for (let y = -wall - 1; y > -ridge + 2; y -= 4.6) { const k = (-wall + 3 - y) / (ridge - wall + 3), a0 = -72 + 32 * k, b0 = 64 - 32 * k; B.s(`M${a0} ${y}H${b0}`, '#454a4c', .8, .6); for (let x = a0 + r() * 6; x < b0; x += 6 + r() * 3) B.s(`M${x} ${y}v-4.6`, '#454a4c', .5, .35); }
    B.f(B.poly([[-74, -wall + 3], [-40, -ridge], [-30, -ridge], [-62, -wall + 3]]), '#7d8588', .4);
    for (let x = -38; x < 32; x += 6) B.f(B.rr(x, -ridge - 3, 6.4, 4, 2), x % 4 ? '#9a5a3e' : '#8a4a32');
    for (let i = 0; i < 9; i++) B.f(B.blob(r, -58 + r() * 116, -wall - 4 - r() * (ridge - wall - 10), 6 + r() * 7, 2, 7, .5), s === 'winter' ? '#eef2ee' : i % 2 ? '#7d8f4e' : '#93a660', .75);
    // the great doors: one standing open on the dark and the hay, the other shut, a cart track worn to them
    const dh = sz('door', 1) * 1.45, dx0 = -6;
    B.f(B.rect(dx0 - 2, -9 - dh - 2, 44, dh + 2), '#e4d6b8');
    B.f(B.rect(dx0, -9 - dh, 20, dh), red[1]).s(`M${dx0} ${-9 - dh}l20 ${dh}M${dx0 + 20} ${-9 - dh}l-20 ${dh}`, '#e8dcc0', 1.4, .9).s(`M${dx0} ${-9 - dh / 2}h20`, '#e8dcc0', 1.2, .9);
    B.f(B.rect(dx0 + 20, -9 - dh, 20, dh), '#24180f').f(B.rect(dx0 + 20, -9 - dh, 20, dh * .3), '#140c08', .6);
    B.f(B.poly([[dx0 + 20, -9], [dx0 + 24, -9 - dh * .4], [dx0 + 34, -9 - dh * .5], [dx0 + 40, -9 - dh * .32], [dx0 + 42, -9]]), '#d8b860').f(B.poly([[dx0 + 22, -9], [dx0 + 26, -9 - dh * .28], [dx0 + 34, -9 - dh * .34], [dx0 + 38, -9]]), '#ecd27a', .85);
    for (let i = 0; i < 12; i++) B.s(`M${dx0 + 20 + r() * 22} -9l${(r() - .5) * 8} ${-2 - r() * 5}`, '#e8cc78', .8, .9);
    B.f(B.poly([[dx0 + 42, -9], [dx0 + 52, -9 - dh * .94], [dx0 + 54, -9 - dh * .9], [dx0 + 45, -9]]), red[1]);   // the open leaf, swung back
    // the loft door high in the wall under a hoist beam with its pulley and rope
    B.f(B.rect(-44, -wall + 10, 20, 18), '#24180f').s(`M-44 ${-wall + 10}h20v18h-20z`, '#e8dcc0', 1.2);
    B.s(`M-34 ${-wall + 4}V${-wall - 6}`, OAK[1], 3).s(`M-34 ${-wall - 4}h-14`, OAK[1], 3).f(B.circ(-46, -wall - 2, 2), IRON[1]).s(`M-46 ${-wall}V${-wall + 30}`, '#c8b48a', .9);
    B.f(B.rr(-52, -wall + 28, 12, 10, 3), '#d9caa0');
    // a ladder against the wall, swallows' nests under the eaves, a water butt and nettles at the foot
    B.s(`M-58 -9L-52 ${-wall + 4}M-50 -9L-44 ${-wall + 4}`, OAK[1], 1.8); for (let k = 1; k < 7; k++) { const y = -9 - k * (wall - 13) / 7; B.s(`M${-58 + k * .9} ${y}h8`, OAK[1], 1.4); }
    for (const x of [-20, 30]) B.f(B.ell(x, -wall + 2, 3.4, 2.2), '#8a7454');
    B.f(B.rr(40, -22, 12, 22, 3), '#5a6a54').s('M40 -16h12M40 -8h12', '#3e4a3a', .8);
    if (o.night) B.f(B.rect(dx0 + 20, -9 - dh, 20, dh), 'rgba(255,200,110,.28)');
    for (let i = 0; i < 12; i++) { const x = (i < 6 ? -70 : 60) + r() * 14; B.s(`M${x} 2q${(r() - .5) * 3} -7 ${(r() - .5) * 4} -${9 + r() * 8}`, L[1], 1.3, .85); }
    B.tufts(r, -66, 4, 12, 7, grass(s), 8).tufts(r, 90, 4, 10, 6, grass(s), 7);
  } };

  /* ======== what is built for the lake (work:*), by the pier: in the water or on its planks, so no seat of grass ======== */
  const ripples = (B, r, w) => { for (let k = 0; k < 3; k++) B.s(B.ell(0, 1 + k * .6, w * (.5 + k * .35), 1.6 + k * .9), '#e8f4f2', .8, .5 - k * .14); };
  A['work:fish-feeder'] = { box: [-26, -66, 26, 8], seat: false, draw(B, o) {
    const r = KIT().rng(301), top = -sz('door', 1) * 1.2;
    ripples(B, r, 12); B.s('M0 2V' + (top + 14), OAK[1], 3.4).s('M-1 2V' + (top + 14), OAK[2], 1, .7).f(B.rect(-2.2, -4, 4.4, 6), '#3e5a5e', .5);
    B.f(`M-11 ${top + 14}V${top + 2}Q0 ${top - 2} 11 ${top + 2}V${top + 14}Q0 ${top + 18} -11 ${top + 14}Z`, B.lin(-11, 0, 11, 0, [[0, '#c4ccd0'], [.4, '#9aa4a8'], [1, '#5e686c']]));
    for (const y of [top + 4, top + 10]) B.s(`M-11 ${y}Q0 ${y + 4} 11 ${y}`, '#4e585c', .8, .7);
    B.f(B.ell(0, top + 2, 11, 3), '#6e787c').f(B.ell(0, top + 1.4, 9, 2.2), '#8a6a3e');
    B.f(B.ell(0, top + 18, 7, 1.6), '#4e585c').s(`M-6 ${top + 19}l-4 3M6 ${top + 19}l4 3`, '#8a6a3e', .8, .8);
    for (let i = 0; i < 9; i++) B.f(B.circ(-16 + r() * 32, -3 + r() * 6, .8), '#a8844a', .9);
  } };
  A['work:reed-beds'] = { box: [-30, -40, 30, 8], seat: false, draw(B, o) {
    const r = KIT().rng(307), s = o.season, G = s === 'winter' ? ['#9a9a78', '#b8b090'] : s === 'autumn' ? ['#a89a54', '#c8b064'] : ['#4f8a3f', '#6aa04a', '#3f7a35'];
    ripples(B, r, 20);
    for (let i = 0; i < 22; i++) { const x = -20 + r() * 40, h = 12 + r() * 16, lean = (r() - .5) * 6; B.s(`M${x} 2Q${x + lean * .4} ${-h * .5} ${x + lean} ${-h}`, G[i % G.length], 1.2 + r() * .8, .95); if (r() < .3) B.f(B.ell(x + lean, -h + 3, 1.6, 5), '#6a4a2a'); }
    if (s === 'summer' || s === 'spring') { B.f(B.ell(16, 0, 6, 2.2), '#4a7a3a').f(B.circ(15, -1, 1.6), '#f4e8ec'); }
  } };
  A['work:fishing-station'] = { box: [-26, -40, 28, 6], seat: false, draw(B, o) {
    const r = KIT().rng(311);
    B.f(B.rr(-16, -14, 22, 14, 2), WOOD[1]).f(B.rr(-16, -14, 22, 3, 1.4), WOOD[2]).f(B.rr(-15, -18, 20, 5, 2.4), '#3f7a8a').f(B.rr(-15, -18, 20, 1.6, 1), '#6aa0ae');
    for (const x of [10, 20]) B.s(`M${x} 0L${x} -18M${x - 3} -21L${x} -18L${x + 3} -21`, '#5a3e22', 1.4);
    B.s('M8 -20L26 -36', '#2a2a2a', 1.2).f(B.circ(12, -21, 2), '#8a8a8a');
    B.f(B.rr(-24, -12, 6, 12, 2), '#b84a2a').f(B.rect(-24, -13, 6, 2), '#5a5a5a').f(B.rr(-6, -4, 5, 4, 1), '#efe6cc');
  } };
  A['work:night-lantern'] = { box: [-18, -96, 18, 6], seat: false, lit: true, lights: [[0, -74, 120]], draw(B, o) {
    const top = -sz('lamp', .5) * 1.05;
    B.f(B.rr(-5, -4, 10, 5, 1.4), IRON[0]).s(`M0 -3V${top + 14}`, IRON[0], 2.6).s(`M-.8 -3V${top + 14}`, IRON[1], .8, .7).s(`M0 ${top + 14}q8 0 8 -6`, IRON[0], 1.6);
    B.f(B.poly([[3, top + 6], [13, top + 6], [12, top - 6], [4, top - 6]]), o.night ? '#ffd27a' : '#d8e0d8').s(B.line([[3, top + 6], [13, top + 6], [12, top - 6], [4, top - 6], [3, top + 6]]), IRON[0], 1.2).s(`M8 ${top - 6}v12`, IRON[0], .7);
    B.f(B.poly([[2, top - 6], [8, top - 11], [14, top - 6]]), IRON[0]);
    if (o.night) B.f(B.circ(8, top, 9), 'rgba(255,214,140,.35)');
  } };
  A['work:pier-2'] = { box: [-10, -32, 10, 4], seat: false, draw(B) { B.post(0, -22, 0, 5, OAK).f(B.ell(0, -22, 3, 1.4), OAK[2]).s('M-3 -14q3 2 6 0', '#e8dcb0', 1.2); } };
  A['work:pier-3'] = { box: [-6, -66, 26, 4], seat: false, draw(B) { const top = -sz('lamp', .5) * .75; B.s(`M0 0V${top}`, OAK[1], 2.2); B.f(`M1 ${top + 1}Q10 ${top - 2} 20 ${top + 3}Q12 ${top + 7} 20 ${top + 11}Q10 ${top + 8} 1 ${top + 11}Z`, '#d8452a').f(`M1 ${top + 4}h10v3h-10z`, '#fbf5e6'); } };
  A['work:pool-stock'] = { box: [-16, -24, 16, 4], seat: false, draw(B) { B.f('M-9 0L-10 -12H10L9 0Z', B.lin(-10, 0, 10, 0, [[0, '#c4ccd0'], [1, '#6e787c']])).f(B.ell(0, -12, 10, 3), '#5e686c').f(B.ell(0, -12, 8.4, 2.2), '#4e7a7e').f(B.ell(-2, -12.4, 2.4, .9), '#e8a04a').s('M-9 -12Q0 -24 9 -12', IRON[1], 1); } };

  /* ======== not built yet: where a work for the lake will stand, marked out (plot:*) ========
     The not-built state was simply absent: plain water at the pier's end, empty grass where the smoker goes (art
     director, round 3). Each is a deliberate start: piles driven for a pier, a stake and a rag in the water, a chalked
     square with planks stacked on the deck, pegs and string round a square of bare earth with bricks waiting. */
  A['plot:water'] = { box: [-24, -50, 26, 8], seat: false, shade: false, draw(B, o) {
    const r = KIT().rng(331);
    ripples(B, r, 14);
    B.s('M0 2V-34', OAK[1], 3).s('M-.8 2V-34', OAK[2], .9, .7).f(B.ell(0, -34, 1.6, .7), OAK[2]);
    B.f('M1 -32q8 1 11 -3q-2 5 -10 7z', '#c8402e').f('M1 -32q5 .4 7 -1.6', '#e8705a', .7);   // a rag tied on: here it goes
    B.s('M0 -14q7 4 11 13', '#d8c08a', .8).f(B.ell(12, 0, 3.4, 1.8), '#e8e0cc').f(B.ell(12, -.6, 3.4, 1), '#c8402e');   // and a float on a cord
  } };
  A['plot:deck'] = { box: [-30, -26, 30, 8], seat: false, shade: false, draw(B, o) {
    const r = KIT().rng(337);
    // a square chalked on the planks, a stack of new boards, a coil of rope and a box of nails
    B.s('M-20 -2h30v-12h-30z', '#f4f0e2', .8, .45).s('M-18 -4l26 -8M-18 -12l26 8', '#f4f0e2', .5, .25);
    for (let i = 0; i < 3; i++) B.f(B.rr(12, -4 - i * 3, 16, 3, .8), ['#d8b884', '#c8a472', '#e0c494'][i]).s(`M12.5 ${-2.6 - i * 3}h15`, '#8a6a46', .4, .6);
    for (let i = 0; i < 3; i++) B.s(B.ell(-24, -3 - i * 1.2, 5 - i, 2 - i * .3), i % 2 ? '#d8c08a' : '#b89a6a', 1.3);
    B.f(B.rr(2, -9, 7, 5, 1), '#6a4a2e').f(B.rr(2, -9, 7, 1.4, .6), '#8a6a46').f(B.circ(5.5, -8.6, .6), '#8a8e90');
  } };
  A['plot:land'] = { box: [-34, -30, 36, 10], seat: { kind: 'earth', w: 44, front: 14, back: 10, stones: 0, way: false }, shade: false, draw(B, o) {
    const r = KIT().rng(341);
    // four pegs and a string round a square of bare earth, bricks stacked and a bucket of mortar waiting
    const pegs = [[-20, -14], [20, -14], [22, 2], [-22, 2]];
    B.f(B.poly(pegs), '#8c7454', .35);
    B.s(B.line(pegs.concat([pegs[0]])), '#f2ecd8', .7, .85);
    for (const [x, y] of pegs) B.s(`M${x} ${y + 1}v-7`, OAK[1], 1.8).f(B.ell(x, y - 6, .9, .5), OAK[2]);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 3 - row; i++) B.f(B.rr(24 + i * 4.6 + row * 2.3, -4 - row * 2.8, 4.4, 2.8, .5), ['#b05a3c', '#a04e34', '#c06a48'][(row + i) % 3]).s(`M${24 + i * 4.6 + row * 2.3} ${-4 - row * 2.8 + 2.8}h4.4`, '#6e3a26', .4, .6);
    B.f('M-30 0L-29 -8H-22L-23 0Z', '#6a6e70').f(B.ell(-25.5, -8, 3.6, 1.2), '#c8c0b0').s('M-29 -8q3.5 -6 7 0', IRON[0], .7);
    B.tufts(r, -26, 4, 10, 4, grass(o.season), 5).tufts(r, 28, 4, 8, 3, grass(o.season), 5);
  } };
  A['plot:pier'] = { box: [-76, -150, 76, 10], seat: false, shade: false, draw(B, o) {
    const r = KIT().rng(347), W = GARDEN_WORLD, p = o.prop || { w: 3, h: 4 }, hx = p.w * W.cellW / 2 - 6, top = -p.h * W.cellH;
    // the next stretch of pier begun: its piles driven into the water two by two, a rope along their heads, a marker float at the end
    const ys = [top + 16, top + 56, top + 96].filter(y => y < -8);
    for (const y of ys) for (const x of [-hx, hx]) { B.s(B.ell(x, y + 2, 7, 2), '#e8f4f2', .8, .55); B.f(B.rect(x - 3, y - 22, 6, 24), OAK[1]).f(B.rect(x - 3, y - 22, 2, 24), OAK[2], .6).f(B.ell(x, y - 22, 3, 1.2), OAK[2]).f(B.rect(x - 3, y - 4, 6, 4), '#2e4a4e', .45); }
    for (const x of [-hx, hx]) B.s(`M${x} ${ys[0] - 20}` + ys.slice(1).map(y => `Q${x + 4} ${y - 30} ${x} ${y - 20}`).join(''), '#d8c08a', 1.1, .9);
    const yE = ys[ys.length - 1]; B.s(`M${-hx} ${yE - 18}Q0 ${yE - 8} ${hx} ${yE - 18}`, '#d8c08a', 1, .85);
    B.f(B.ell(0, yE + 14, 4.4, 2.2), '#e8e0cc').f(B.ell(0, yE + 13.2, 4.4, 1.2), '#c8402e').s(B.ell(0, yE + 15, 8, 2), '#e8f4f2', .7, .5);
  } };

  /* ======== what a player builds or wins (lf-*): set out anywhere, so each brings its own seat ======== */
  // the village well is the wishing well's sister: the same head and frame, no coins in it
  A['lf-well'] = Object.assign({}, A['ld-wish']);
  // a flag on a pole in a stone socket, its cloth lifting (the region prizes)
  const flag = (cols, emblem) => ({ box: [-20, -118, 40, 6], seat: { kind: 'turf', w: 18, front: 12, stones: 4, way: false }, draw(B, o) {
    const r = KIT().rng(157 + cols[0].length), top = -sz('lamp', 1) * 1.3;
    B.f(B.rr(-7, -6, 14, 7, 2), STONE.rockLo).f(B.rr(-7, -6, 14, 2.6, 1.4), STONE.rockHi);
    B.s(`M0 -5V${top}`, '#6a5034', 2.6).s(`M-.7 -5V${top}`, '#b08c5e', .8, .8).f(B.circ(0, top - 1.6, 2), '#c8a23a');
    B.f(`M1 ${top + 2}Q14 ${top - 1} 30 ${top + 3}Q24 ${top + 10} 30 ${top + 17}Q14 ${top + 14} 1 ${top + 19}Z`, cols[0]).f(`M1 ${top + 2}Q14 ${top - 1} 30 ${top + 3}L28 ${top + 6}Q14 ${top + 3} 1 ${top + 6}Z`, cols[1], .9).f(`M1 ${top + 14}Q14 ${top + 11} 29 ${top + 15}L30 ${top + 17}Q14 ${top + 14} 1 ${top + 19}Z`, 'rgba(0,0,0,.18)');
    if (emblem) emblem(B, 15, top + 10);
    B.tufts(r, 0, 3, 20, 10, grass(o.season), 7);
  } });
  A['lf-rg-garden'] = flag(['#3f7a4a', '#5e9a5e'], (B, x, y) => B.f(B.circ(x, y, 3.4), '#f2d04a').f(B.circ(x, y, 1.6), '#c8741a'));
  A['lf-rg-hill'] = flag(['#3f6486', '#5e86a8'], (B, x, y) => B.f(B.poly([[x - 6, y + 4], [x, y - 5], [x + 6, y + 4]]), '#eef2f4'));
  /* the anglers' board: a slate on two posts under a little roof, the year's best catch chalked up, a brass fish on top */
  const board = (title, art) => ({ box: [-34, -92, 34, 6], seat: { kind: 'earth', w: 50, front: 16 }, draw(B, o) {
    const r = KIT().rng(163 + title.length), post = sz('lamp', .2) * .92;
    for (const x of [-22, 22]) B.post(x, -post, 0, 4.2, OAK);
    B.f(B.rr(-26, -post + 10, 52, 34, 2), OAK[1]).f(B.rr(-23, -post + 13, 46, 28, 1.4), art === 'slate' ? '#2e3a3c' : '#e8dcc0');
    shingles(B, r, [[-32, -post + 10], [0, -post - 6], [32, -post + 10]], ['#5a6a5e', '#3e4a40', '#7e8e80']);
    if (art === 'slate' && title === 'stars') { for (let i = 0; i < 5; i++) { const cx = -16 + i * 8, cy = -post + 24; B.f(B.poly([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? 1.5 : 3.4; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; })), i < 3 ? '#f2d04a' : '#6a7a7c'); } B.s(`M-18 ${-post + 33}h30`, '#c8d0cc', .8, .8); }
    else if (art === 'slate') { B.s(`M-18 ${-post + 22}q10 -6 22 0q-4 4 -10 3`, '#eef2ee', 1.1, .9).s(`M-18 ${-post + 30}h30M-18 ${-post + 35}h22`, '#c8d0cc', .8, .8); B.f(`M8 ${-post - 4}q6 -3 10 0l3 -2v4l-3 -2q-4 3 -10 0z`, '#c8a23a'); }
    else for (let i = 0; i < 3; i++) { const x = -16 + i * 14; B.f(B.rect(x - 5, -post + 17 + (i % 2) * 3, 11, 13), ['#f4eee0', '#efe2c4', '#f8f0dc'][i]).s(`M${x - 3} ${-post + 22 + (i % 2) * 3}h7M${x - 3} ${-post + 25 + (i % 2) * 3}h5`, '#8a8478', .6).f(B.circ(x, -post + 17 + (i % 2) * 3, .9), '#b84a3a'); }
    B.tufts(r, -22, 3, 10, 6, grass(o.season), 7).tufts(r, 22, 3, 10, 6, grass(o.season), 7);
  } });
  A['lf-rg-lake'] = board('anglers', 'slate');
  A['lf-help'] = board('help', 'notes');
  A['lf-stars'] = board('stars', 'slate');
  /* the corn stook (the fields' prize): sheaves leaned together, tied, a scarecrow's hat on top */
  A['lf-rg-fields'] = { box: [-30, -76, 30, 6], seat: { kind: 'earth', w: 40, front: 14, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(167), top = -sz('door', 1) * 1.3;
    for (let i = 0; i < 7; i++) { const x = -18 + i * 6, lean = (x) * -.35; B.f(`M${x - 5} 0L${x + lean - 2} ${top + 6}L${x + lean + 2} ${top + 6}L${x + 5} 0Z`, i % 2 ? '#c8a050' : '#dcb868'); for (let k = 0; k < 4; k++) B.s(`M${x + lean + (k - 1.5)} ${top + 6}l${(k - 1.5) * 1.4} -6`, '#e8cc78', .8); }
    B.s(`M-14 ${top * .45}Q0 ${top * .45 + 4} 14 ${top * .45}`, '#9a7a3a', 1.6).f(B.ell(0, top + 2, 9, 2.4), '#6a5034').f(`M-5 ${top + 2}q5 -9 10 0z`, '#7a5e40');
    B.tufts(r, 0, 3, 40, 12, grass(o.season), 6);
  } };
  /* the heron post (the marsh's prize): an oak post in the reeds with a carved heron on it */
  A['lf-rg-marsh'] = { box: [-30, -100, 30, 6], seat: { kind: 'moss', w: 22, front: 12, stones: 3, way: false }, draw(B, o) {
    const r = KIT().rng(173), top = -sz('lamp', .5) * .95;
    B.post(0, top, 0, 6, OAK);
    B.s(`M-2 ${top}q-2 -14 6 -22`, '#9aa0a4', 3).f(B.ell(6, top - 24, 4, 3), '#9aa0a4').s(`M9 ${top - 24}l9 2`, '#c8a23a', 1.4).f(B.ell(-1, top - 6, 10, 6), '#8a9094').f(B.ell(-3, top - 8, 7, 3.4), '#b8bec2').s(`M-8 ${top - 4}l-8 4`, '#6a7074', 2);
    for (let i = 0; i < 10; i++) { const x = -22 + r() * 44, h = 16 + r() * 18; B.s(`M${x} 3q${(r() - .5) * 4} ${-h / 2} ${(r() - .5) * 6} ${-h}`, '#7a9a4a', 1.2, .9); if (r() < .4) B.f(B.ell(x, 3 - h, 1.4, 4), '#6a4a2a'); }
  } };
  /* the cider press (the orchards' prize): an oak screw press with its tray and a tub of apples */
  A['lf-rg-orchards'] = { box: [-34, -76, 36, 6], seat: { kind: 'earth', w: 46, front: 16 }, draw(B, o) {
    const r = KIT().rng(179), top = -sz('door', 1) * 1.25;
    for (const x of [-18, 18]) B.post(x, top, 0, 5, OAK);
    B.f(B.rect(-22, top, 44, 6), OAK[1]).f(B.rect(-22, top, 44, 2), OAK[2]).s(`M0 ${top + 6}v14`, IRON[1], 3).s(`M-12 ${top + 2}h24`, IRON[0], 2);
    B.f(B.rect(-14, top + 20, 28, 6), OAK[0]).f(B.rr(-20, -14, 40, 10, 2), OAK[1]).f(B.rect(-16, -18, 32, 5), '#c8a050', .9).f(B.rect(-22, -4, 44, 4), OAK[3]);
    B.f(B.rr(22, -12, 12, 12, 3), WOOD[1]); for (let i = 0; i < 5; i++) B.f(B.circ(24 + (i % 3) * 3.4, -12 - Math.floor(i / 3) * 3, 2), i % 2 ? '#c8442a' : '#9aaa3a');
    B.tufts(r, -26, 3, 8, 5, grass(o.season), 6).tufts(r, 32, 3, 8, 5, grass(o.season), 6);
  } };
  /* the rain barrel: an oak butt on a stone stand under a little spout, a tap and a dipper */
  A['lf-barrel'] = { box: [-22, -54, 22, 6], seat: { kind: 'earth', w: 30, front: 14, way: false }, draw(B, o) {
    const r = KIT().rng(181), h = sz('well') * 1.7;
    B.f(B.rr(-14, -5, 28, 5, 1.4), STONE.rockLo).f(B.rect(-14, -5, 28, 1.6), STONE.rockHi);
    B.f(`M-11 -5Q-14 ${-5 - h / 2} -11 ${-5 - h}H11Q14 ${-5 - h / 2} 11 -5Z`, B.lin(-13, 0, 13, 0, [[0, '#b08c5e'], [.4, '#8a6a46'], [1, '#5a4430']]));
    for (const y of [-8, -5 - h * .5, -2 - h]) B.s(`M-12.6 ${y}h25.2`, IRON[0], 1.6);
    B.f(B.ell(0, -5 - h, 11, 3), '#5a4430').f(B.ell(0, -5 - h + .4, 9, 2.2), '#3a5a5e').f(B.ell(-3, -5 - h, 3, .8), '#a8c8c8', .6);
    B.s(`M8 ${-5 - h}V${-14 - h}h-10`, '#5a6064', 1.6).f(B.rect(10, -10, 3, 3), IRON[1]);
    B.tufts(r, -14, 3, 8, 5, grass(o.season), 6).tufts(r, 15, 3, 8, 5, grass(o.season), 6);
  } };
  /* the lucky stone: a round worn boulder with a hole through it, lichen, coins in the hole */
  A['lf-stone'] = { box: [-26, -40, 26, 6], seat: { kind: 'moss', w: 36, front: 12, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(191), h = sz('boulder', .2);
    B.f(B.blob(r, 0, -h / 2, 18, h / 2, 9, .2), MOSSY.rockLo).f(B.blob(r, -3, -h * .58, 14, h * .38, 9, .2), MOSSY.rock).f(B.blob(r, -7, -h * .72, 7, h * .18, 7, .3), MOSSY.rockHi, .8);
    B.f(B.ell(2, -h * .5, 5, 4.4), '#2a261e').f(B.ell(3, -h * .46, 3.4, 3), '#16140e').f(B.ell(3, -h * .38, 1.6, .9), '#e8c45a');
    mossOn(B, r, -16, -h * .9, 28, 5, o.season); B.tufts(r, 0, 3, 36, 10, grass(o.season), 6);
  } };
  /* the dew stone and the moon stone: a flat-topped stone with a hollow that holds water (pale and silvered for the moon's) */
  const bowl = (moon) => ({ box: [-26, -36, 26, 6], seat: { kind: 'moss', w: 36, front: 12, stones: 0, way: false }, lit: moon, lights: moon ? [[0, -20, 60]] : null, draw(B, o) {
    const r = KIT().rng(moon ? 193 : 197), h = sz('well') * .95, P = moon ? { rock: '#b8bcc4', rockLo: '#8e929a', rockHi: '#dfe2e8', rockDk: '#4e5258' } : MOSSY;
    B.f(B.blob(r, 0, -h / 2, 19, h / 2, 9, .15), P.rockLo).f(B.blob(r, -2, -h * .6, 16, h * .34, 9, .15), P.rock);
    B.f(B.ell(0, -h + 2, 15, 4.4), P.rockHi).f(B.ell(1, -h + 2.4, 10, 2.8), moon ? (o.night ? '#e8f0ff' : '#9cb0c8') : '#7aa0a4').f(B.ell(-2, -h + 1.8, 4, .8), '#ffffff', .6);
    if (moon) for (const [x, y] of [[-12, -h * .5], [10, -h * .4]]) B.s(`M${x} ${y}a3 3 0 1 0 3 -3a2.2 2.2 0 1 1 -3 3`, '#5e626a', .8, .8);
    mossOn(B, r, -16, -4, 30, 4, o.season); B.tufts(r, 0, 3, 36, 10, grass(o.season), 6);
  } });
  A['lf-dew'] = bowl(false); A['lf-moon'] = bowl(true);
  /* the worm bin: a slatted wooden box with a lid propped, dark compost, a trowel */
  A['lf-worms'] = { box: [-26, -40, 26, 6], seat: { kind: 'earth', w: 38, front: 14, way: false }, draw(B, o) {
    const r = KIT().rng(199), h = sz('well') * 1.1;
    B.f(B.rect(-17, -h, 34, h), WOOD[1]); for (let y = -h; y < 0; y += 5) B.f(B.rect(-17, y + .6, 34, 3.6), y % 2 ? WOOD[0] : WOOD[2], .9);
    B.f(B.rect(-17, -h, 5, h), '#ffffff', .1).f(B.rect(12, -h, 5, h), '#000000', .15);
    B.f(B.ell(0, -h, 17, 3.6), '#3a2a1a').f(B.blob(r, 0, -h - 1, 14, 2.4, 7, .4), '#5a4028');
    B.f(B.poly([[-18, -h - 1], [18, -h - 1], [14, -h - 13], [-14, -h - 10]]), WOOD[0]).s(`M-18 ${-h - 1}L18 ${-h - 1}`, WOOD[3], .8);
    B.s(`M20 -2L28 -14`, WOOD[1], 1.6).f(`M27 -15l4 -5l2 2z`, IRON[1]);
    B.tufts(r, -18, 3, 8, 5, grass(o.season), 6).tufts(r, 18, 3, 8, 5, grass(o.season), 6);
  } };
  /* the scarecrow: a cross of poles, an old coat stuffed with straw, a hat, a crow on the arm */
  A['lf-scarecrow'] = { box: [-36, -86, 36, 6], seat: { kind: 'earth', w: 18, front: 12, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(211), top = -sz('door', .3) * 1.4;
    B.s(`M0 0V${top}`, OAK[1], 3).s(`M-28 ${top + 18}H28`, OAK[1], 2.6);
    B.f(`M-24 ${top + 14}L-8 ${top + 12}L-10 ${top + 44}L10 ${top + 44}L8 ${top + 12}L24 ${top + 14}L22 ${top + 22}L9 ${top + 22}L11 ${top + 46}L-11 ${top + 46}L-9 ${top + 22}L-22 ${top + 22}Z`, '#5a6a8a').f(`M-9 ${top + 22}L-11 ${top + 46}L-3 ${top + 46}L-3 ${top + 14}Z`, '#7a8aa8', .6);
    for (const [x, y] of [[-26, top + 18], [26, top + 18], [-6, top + 48], [6, top + 48]]) for (let k = 0; k < 4; k++) B.s(`M${x} ${y}l${(r() - .5) * 6} ${3 + r() * 4}`, '#e0c068', 1, .9);
    B.f(B.rect(-4, top + 26, 8, 8), '#b84a3a', .9);
    B.f(B.circ(0, top + 6, 7), '#e8d4a0').f(B.circ(-2, top + 5, 1), '#3a2a1a').f(B.circ(3, top + 5, 1), '#3a2a1a').s(`M-3 ${top + 9}q3 2 6 0`, '#8a5a3a', .8);
    B.f(B.ell(0, top, 12, 2.6), '#4a3a2a').f(`M-6 ${top}q6 -12 12 0z`, '#5a4634').f(B.rect(-6, top - 3, 12, 2), '#b84a3a');
    B.f(B.ell(20, top + 13, 4, 3), '#1e1e22').f(B.circ(23, top + 10, 2.2), '#1e1e22').s(`M25 ${top + 10}l3 1`, '#c8a23a', 1);
    B.tufts(r, 0, 3, 20, 8, grass(o.season), 7);
  } };
  /* the seasons arch: a willow arch over the way, wound with whatever the season has (blossom, roses, hips, holly) */
  A['lf-arch'] = { box: [-56, -104, 56, 6], seat: { kind: 'turf', w: 80, front: 10, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(223), s = o.season, top = -sz('door', 1) * 1.65, L = leaf(s), bloom = { spring: ['#f4d8e0', '#fff4f4'], summer: ['#d8607a', '#f2a0b0'], autumn: ['#c8442a', '#e08a3a'], winter: ['#b82a2a', '#2e5a34'] }[s] || ['#d8607a', '#f2a0b0'];
    for (const x of [-38, 38]) { B.s(`M${x} 0V${top * .55}`, OAK[1], 4); }
    B.s(`M-38 ${top * .55}Q-38 ${top} 0 ${top}Q38 ${top} 38 ${top * .55}`, OAK[1], 4).s(`M-34 ${top * .55}Q-34 ${top + 4} 0 ${top + 4}Q34 ${top + 4} 34 ${top * .55}`, OAK[2], 1.4, .7);
    for (let i = 0; i < 34; i++) { const t = i / 33, a = Math.PI * t, x = i < 8 ? -38 + (r() - .5) * 6 : i > 25 ? 38 + (r() - .5) * 6 : -Math.cos(a) * 38, y = i < 8 ? -i * 7 : i > 25 ? -(33 - i) * 7 : top * .55 - Math.sin(a) * (-top * .45); B.f(B.blob(r, x, y, 5, 4, 6, .5), L[i % 3], .95); if (r() < .45) B.f(B.circ(x + (r() - .5) * 4, y + (r() - .5) * 3, 1.8), bloom[i % 2]); }
    B.tufts(r, -38, 3, 10, 6, grass(s), 7).tufts(r, 38, 3, 10, 6, grass(s), 7);
  } };
  /* the bee skeps: three straw skeps on an oak bench, bees about them */
  A['lf-skeps'] = { box: [-30, -50, 30, 6], seat: { kind: 'earth', w: 46, front: 14, way: false }, draw(B, o) {
    const r = KIT().rng(227), seat = sz('seat') * 1.3;
    for (const x of [-20, 20]) B.post(x, -seat, 0, 3.6, OAK);
    B.f(B.rect(-26, -seat - 3, 52, 4), OAK[0]).f(B.rect(-26, -seat - 3, 52, 1.4), OAK[2]);
    for (const x of [-15, 0, 15]) { for (let i = 0; i < 5; i++) B.f(B.ell(x, -seat - 5 - i * 4, 8 - i * 1.3, 2.6), i % 2 ? '#c8a050' : '#dcb868'); B.f(B.ell(x, -seat - 5, 1.8, 1.2), '#3a2a14'); }
    if (o.season !== 'winter') for (let i = 0; i < 6; i++) B.f(B.circ(-24 + r() * 48, -seat - 26 - r() * 12, .9), '#3a2a14');
    B.tufts(r, -24, 3, 8, 5, grass(o.season), 6).tufts(r, 24, 3, 8, 5, grass(o.season), 6);
  } };
  /* stout boots: a boot scraper by a mounting block, a good pair of boots standing on it */
  A['lf-boots'] = { box: [-26, -36, 26, 6], seat: { kind: 'flags', w: 34, front: 12, way: false }, draw(B, o) {
    const r = KIT().rng(229), h = sz('seat') * 1.6;
    ashlar(B, r, -16, -h, 32, h, STONE, 5);
    for (const x of [-8, 5]) B.f(`M${x - 4} ${-h}V${-h - 11}h7v7h5v4z`, '#5a3e26').f(B.rect(x - 4, -h - 1.6, 12, 1.6), '#2e2014').f(B.rect(x - 4, -h - 11, 7, 2), '#7a5a3a');
    B.s(`M18 0V-10M24 0V-10M17 -8h8`, IRON[0], 1.4);
    B.tufts(r, -16, 3, 8, 5, grass(o.season), 6).tufts(r, 20, 3, 8, 5, grass(o.season), 6);
  } };
  /* the bandstand: an eight-sided stage on a stone base, slim iron columns, a green and cream roof to a finial, bunting */
  A['lf-bandstand'] = { box: [-62, -156, 64, 8], seat: { kind: 'flags', w: 92, front: 18 }, lit: true, lights: [[0, -60, 110]], draw(B, o) {
    const r = KIT().rng(233), eaves = sz('eaves', 1) * 1.05, ridge = sz('hall', .2) * .95, base = sz('seat') * 1.5;
    ashlar(B, r, -46, -base, 92, base, STONE, 5); B.f(B.rect(-48, -base - 3, 96, 4), STONE.rockHi);
    for (const x of [-20, -10, 0, 10, 20]) B.f(B.rect(x - 4, -base + 2, 8, 3), STONE.rockDk, .25);
    for (const x of [-44, -26, -9, 9, 26, 44]) B.s(`M${x} ${-base - 3}V${-eaves}`, '#2e4a3a', 2.4).s(`M${x - .7} ${-base - 3}V${-eaves}`, '#5e7e68', .7, .8);
    B.s(`M-44 ${-base - 14}H44`, '#2e4a3a', 1.2).s(`M-44 ${-base - 10}H44`, '#2e4a3a', .8);
    for (let x = -42; x < 44; x += 4) B.s(`M${x} ${-base - 14}v4`, '#2e4a3a', .7);
    if (o.night) B.f(B.rect(-44, -eaves, 88, eaves - base - 3), 'rgba(255,210,130,.22)');
    B.f(B.poly([[-56, -eaves + 2], [0, -ridge], [56, -eaves + 2]]), '#3e6a52'); for (let i = -4; i <= 4; i++) B.s(`M${i * 13} ${-eaves + 2}L0 ${-ridge}`, i % 2 ? '#e8e0c8' : '#2e5240', 3.4, .7);
    B.f(B.poly([[-56, -eaves + 2], [0, -ridge], [-6, -ridge + 4], [-48, -eaves + 2]]), '#ffffff', .12);
    for (let x = -54; x < 54; x += 6) B.f(B.poly([[x, -eaves + 2], [x + 3, -eaves + 6], [x + 6, -eaves + 2]]), '#e8e0c8');
    B.f(B.rect(-1.4, -ridge - 12, 2.8, 12), '#2e4a3a').f(B.circ(0, -ridge - 13, 2.6), '#c8a23a');
    for (let i = 0; i < 12; i++) { const x = -50 + i * 9, y = -eaves + 9 + Math.sin(i / 11 * Math.PI) * 5; B.f(B.poly([[x, y], [x + 4, y + 6], [x + 8, y]]), ['#c84a3a', '#f2d04a', '#3f7486'][i % 3]); }
    B.tufts(r, -50, 4, 10, 6, grass(o.season), 7).tufts(r, 52, 4, 10, 6, grass(o.season), 7);
  } };
  /* the jam kettle: a copper pan on an iron trivet over a little brick hearth, jars cooling on a crate */
  A['lf-kettle'] = { box: [-30, -54, 32, 6], seat: { kind: 'earth', w: 46, front: 14, way: false }, lit: true, lights: [[-2, -10, 60]], draw(B, o) {
    const r = KIT().rng(239);
    B.f(B.rr(-20, -12, 32, 12, 2), '#8e4a33'); for (let y = -9; y < 0; y += 4) B.s(`M-20 ${y}h32`, '#5e2e20', .6, .7);
    B.f(B.rr(-12, -10, 16, 8, 3), '#1a1410').f(B.ell(-4, -4, 5, 2.4), o.night ? '#ffb04a' : '#c86a2a', .9);
    for (const x of [-16, 8]) B.s(`M${x} -12L${x + 2} -22`, IRON[0], 1.6);
    B.f(`M-18 -22Q-18 -36 -4 -36Q10 -36 10 -22Z`, B.lin(-18, 0, 10, 0, [[0, '#e09a5a'], [.4, '#c87a3a'], [1, '#8a4a22']])).f(B.ell(-4, -36, 14, 3), '#7a3a1a').f(B.ell(-4, -36, 11, 2), '#a02a3a');
    B.s(`M-18 -30q-6 -2 -8 2`, '#8a4a22', 1.6);
    if (o.season !== 'winter') B.s(`M-6 -40q-3 -5 1 -9M0 -40q3 -6 0 -11`, '#f4f0e6', 1, .45);
    B.f(B.rect(14, -10, 16, 10), WOOD[1]).f(B.rect(14, -10, 16, 2), WOOD[2]); for (const x of [17, 22, 27]) B.f(B.rr(x - 2, -17, 4.4, 7, 1), '#b8304a').f(B.rect(x - 2.2, -18, 4.8, 1.8), '#e8dcc0');
    B.tufts(r, -24, 3, 8, 5, grass(o.season), 6).tufts(r, 30, 3, 8, 5, grass(o.season), 6);
  } };
  /* the drying rack: an oak frame with bunches of herbs hung head down, a basket below */
  A['lf-rack'] = { box: [-30, -74, 30, 6], seat: { kind: 'earth', w: 46, front: 14, way: false }, draw(B, o) {
    const r = KIT().rng(241), top = -sz('door', .5) * 1.2;
    for (const x of [-22, 22]) B.post(x, top, 0, 3.6, OAK);
    for (const y of [top + 4, top + 22]) { B.s(`M-24 ${y}H24`, OAK[1], 2.4); for (let x = -18; x <= 18; x += 6) { B.s(`M${x} ${y}v4`, '#c8b48a', .7); for (let k = 0; k < 5; k++) B.s(`M${x} ${y + 4}l${(k - 2) * 1.2} ${8 + r() * 4}`, ['#6a8a44', '#8a9a5a', '#a88aa8', '#7a9a6a'][(x + 18 + k) % 4], 1.2); } }
    B.f(B.ell(0, -2, 12, 3), WOOD[1]).f(`M-12 -2Q-12 -10 0 -10Q12 -10 12 -2Z`, '#b08c5e').s(`M-12 -6h24`, WOOD[1], .8);
    B.tufts(r, -24, 3, 8, 5, grass(o.season), 6).tufts(r, 24, 3, 8, 5, grass(o.season), 6);
  } };
  /* the seed swap shelf: a little roofed cupboard on a post, its door open on packets and jars */
  A['lf-swap'] = { box: [-26, -80, 26, 6], seat: { kind: 'earth', w: 24, front: 14, stones: 3 }, draw(B, o) {
    const r = KIT().rng(251), top = -sz('lamp', .2) * .95;
    B.post(0, top + 28, 0, 5, OAK);
    B.f(B.rect(-17, top + 6, 34, 26), OAK[1]).f(B.rect(-15, top + 8, 30, 22), '#3a2c1e');
    for (const y of [top + 18]) B.s(`M-15 ${y}H15`, OAK[2], 1.2);
    for (let i = 0; i < 6; i++) { const x = -13 + i * 4.6, y = i < 3 ? top + 10 : top + 20; B.f(B.rect(x, y, 3.8, 7), ['#e8c84a', '#c86a5a', '#8aa86a', '#e8dcc0', '#6a8ab8', '#d8a04a'][i]); }
    B.f(B.poly([[17, top + 6], [26, top + 9], [26, top + 33], [17, top + 32]]), OAK[0]);
    shingles(B, r, [[-22, top + 7], [0, top - 6], [22, top + 7]], ['#8a5e3e', '#6a4428', '#b88a5e']);
    B.tufts(r, 0, 3, 22, 10, grass(o.season), 7);
  } };
  /* the spring rill: water rising in a ring of mossy stones and running off in a little stony channel (it lies in the ground) */
  A['lf-rill'] = { box: [-34, -26, 34, 12], shade: false, flat: true, seat: { kind: 'moss', w: 30, front: 12, back: 14, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(257), winter = o.season === 'winter';
    B.f(B.blob(r, 0, -8, 16, 8, 9, .3), '#2e4a4e').f(B.blob(r, -2, -9, 12, 5.4, 8, .3), winter ? '#cfe0e8' : '#4e7a7e').f(B.ell(-4, -10, 4, 1.2), '#c8e4e8', .7);
    B.f(`M10 -4Q20 0 30 6L26 9Q18 4 8 1Z`, '#3e6a6e').s(`M12 -2Q20 1 28 7`, '#a8d0d4', .8, .7);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B.stone(r, Math.cos(a) * 17, -8 + Math.sin(a) * 9, 3.6, 2.4, MOSSY, i % 3 ? null : '#9aa86a'); }
    if (!winter) for (let i = 0; i < 5; i++) B.s(`M${-14 + i * 7} -18q-2 -6 -5 -9`, '#5f7a3c', 1, .9);
  } };
  /* the little museum: a stone building with a pediment and two columns, a brass plate, a lamp each side */
  A['lf-museum'] = { box: [-62, -150, 64, 8], seat: { kind: 'flags', w: 90, front: 20 }, lit: true, lights: [[-20, -40, 90], [20, -40, 90]], draw(B, o) {
    const r = KIT().rng(263), eaves = sz('eaves', 1) * 1.1, ridge = sz('hall', 0) * .9;
    ashlar(B, r, -46, -eaves, 92, eaves, STONE, 6.5);
    B.f(B.rect(-50, -8, 100, 8), STONE.rockLo).f(B.rect(-50, -8, 100, 2), STONE.rockHi).f(B.rect(-52, -2, 104, 4), STONE.rock);
    B.f(B.poly([[-54, -eaves], [0, -ridge], [54, -eaves]]), STONE.rock).f(B.poly([[-44, -eaves - 3], [0, -ridge + 8], [44, -eaves - 3]]), STONE.rockLo).f(B.rect(-56, -eaves - 1, 112, 5), STONE.rockHi);
    B.f(B.circ(0, -eaves - 12, 6), STONE.rockHi).f(B.circ(0, -eaves - 12, 4), '#c8a23a', .8);
    for (const x of [-18, 18]) { B.f(B.rect(x - 5, -eaves + 4, 10, eaves - 12), STONE.rockHi).f(B.rect(x + 1, -eaves + 4, 4, eaves - 12), STONE.rockLo, .7); B.f(B.rect(x - 7, -eaves + 2, 14, 3), STONE.rock).f(B.rect(x - 7, -11, 14, 3), STONE.rock); }
    B.f(B.rr(-10, -sz('door', .6) - 8, 20, sz('door', .6), 2), '#2e2418').f(B.rr(-8.6, -sz('door', .6) - 6.6, 17.2, sz('door', .6) - 1.4, 1.6), B.lin(-8, 0, 9, 0, [[0, '#6a4a30'], [1, '#4a3220']]));
    windowLit(B, -40, -eaves + 14, 12, 18, o.night, '#e8dcc0'); windowLit(B, 28, -eaves + 14, 12, 18, o.night, '#e8dcc0');
    B.f(B.rect(-12, -eaves + 2, 24, 6), '#c8a23a').text('MUSEUM', 0, -eaves + 5.2, 4.4, '#4a3a1a');
    B.tufts(r, -52, 4, 10, 6, grass(o.season), 7).tufts(r, 54, 4, 10, 6, grass(o.season), 7);
  } };
  /* the lookout tower: a tall timber tower on stone feet, a ladder stair, a railed top under a little roof (five times the player) */
  A['lf-lookout'] = { box: [-50, -236, 52, 8], seat: { kind: 'earth', w: 70, front: 16 }, draw(B, o) {
    const r = KIT().rng(269), top = -sz('tower', 0) * 1.02;
    for (const x of [-30, 30]) { B.stone(r, x, -2, 7, 4, STONE, null); B.s(`M${x} -4L${x * .6} ${top + 26}`, OAK[1], 5).s(`M${x - 1.4} -4L${x * .6 - 1.4} ${top + 26}`, OAK[2], 1.4, .7); }
    for (let k = 1; k < 6; k++) { const y = -4 + (top + 30) * k / 6, hw = 30 - 12 * k / 6; B.s(`M${-hw} ${y}H${hw}`, OAK[1], 2.4); if (k < 5) B.s(`M${-hw} ${y}L${hw - 2} ${y + (top + 30) / 6}M${hw} ${y}L${-hw + 2} ${y + (top + 30) / 6}`, OAK[0], 1.4, .8); }
    for (let y = -6; y > top + 30; y -= 8) B.s(`M-6 ${y}h12`, WOOD[0], 1.6); B.s(`M-6 -4V${top + 30}M6 -4V${top + 30}`, WOOD[1], 1.6);
    B.f(B.rect(-24, top + 22, 48, 6), OAK[1]).f(B.rect(-24, top + 22, 48, 2), OAK[2]);
    for (let x = -22; x <= 22; x += 6) B.s(`M${x} ${top + 22}v-12`, OAK[1], 1.4); B.s(`M-24 ${top + 10}H24`, OAK[1], 2);
    for (const x of [-22, 22]) B.s(`M${x} ${top + 10}V${top - 6}`, OAK[1], 2);
    shingles(B, r, [[-30, top - 4], [0, top - 22], [30, top - 4]], ['#8a5e3e', '#6a4428', '#b88a5e']);
    B.f(B.rect(10, top - 40, 1.6, 20), '#6a5034').f(`M11.6 ${top - 40}l12 3l-12 3z`, '#c84a3a');
    B.tufts(r, -38, 4, 10, 6, grass(o.season), 7).tufts(r, 38, 4, 10, 6, grass(o.season), 7);
  } };
  /* the savings oak: a young oak in its prime (four times the player), a little iron-bound box half buried in its roots */
  A['lf-oak'] = { box: [-74, -184, 76, 8], seat: { kind: 'moss', w: 26, front: 14, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(271), s = o.season, L = leaf(s), H0 = sz('tree', .1), bark = ['#6a5a46', '#4a3e30', '#8e7c62'];
    for (const [x, d] of [[-12, -1], [12, 1]]) B.f(`M${x - 4} 0Q${x + d * 4} -10 ${x} -18L${x + 6} -14Q${x + 7} -6 ${x + 8 + d * 6} 1Z`, bark[d < 0 ? 0 : 1]);
    B.f(`M-10 0Q-12 ${-H0 * .3} -6 ${-H0 * .5}L6 ${-H0 * .5}Q12 ${-H0 * .3} 10 0Z`, bark[0]).f(`M-10 0Q-12 ${-H0 * .3} -6 ${-H0 * .5}L-2 ${-H0 * .5}Q-4 ${-H0 * .3} -3 0Z`, bark[2], .7);
    for (const [x1, y1] of [[-36, -H0 * .62], [34, -H0 * .6], [0, -H0 * .8]]) B.s(`M0 ${-H0 * .48}Q${x1 * .4} ${-H0 * .56} ${x1} ${y1}`, bark[1], 5);
    if (s !== 'winter') { for (let k = 0; k < 14; k++) B.f(B.blob(r, (r() - .5) * 110, -H0 * .72 + (r() - .5) * H0 * .36, 26, 18, 9, .35), L[0], .96); for (let k = 0; k < 12; k++) B.f(B.blob(r, (r() - .6) * 96, -H0 * .76 + (r() - .65) * H0 * .3, 18, 12, 8, .4), L[1], .95); for (let k = 0; k < 10; k++) B.f(B.blob(r, (r() - .7) * 80, -H0 * .82 + (r() - .7) * H0 * .2, 10, 7, 7, .45), L[2], .9); for (let k = 0; k < 6; k++) B.f(B.blob(r, -30 + r() * 30, -H0 * .9 + r() * 14, 5, 4, 6, .5), L[3], .8); }
    else for (let k = 0; k < 10; k++) { const a = -Math.PI * (.15 + r() * .7), l = 30 + r() * 30; B.s(`M0 ${-H0 * .55}l${Math.cos(a) * l} ${Math.sin(a) * l}`, bark[1], 2); }
    B.f(B.rr(10, -8, 14, 9, 1.4), '#7a5a3a').s(`M10 -5h14M17 -8v9`, IRON[1], .9).f(B.circ(17, -4, 1.2), '#c8a23a');
    B.tufts(r, -16, 3, 10, 6, grass(s), 7).tufts(r, 26, 3, 10, 6, grass(s), 7);
  } };
  /* the observatory: a round stone drum with a copper dome, its slit open on the sky, a little door */
  A['lf-observatory'] = { box: [-60, -164, 62, 8], seat: { kind: 'flags', w: 86, front: 18 }, lit: true, lights: [[0, -40, 80]], draw(B, o) {
    const r = KIT().rng(277), drum = sz('eaves', .8) * 1.05, dome = sz('ridge', 1) * 1.08;
    ashlar(B, r, -42, -drum, 84, drum, STONE, 7);
    B.f(`M-42 0Q0 8 42 0V-4Q0 4 -42 -4Z`, STONE.rockDk, .25);
    B.f(`M-46 ${-drum}Q-46 ${-dome} 0 ${-dome}Q46 ${-dome} 46 ${-drum}Z`, B.lin(-46, 0, 46, 0, [[0, '#8ec8b0'], [.4, '#6aa890'], [1, '#3e7a64']]));
    for (let k = -3; k <= 3; k++) B.s(`M${k * 13} ${-drum}Q${k * 11} ${-dome + 6} 0 ${-dome}`, '#4e8a74', .8, .7);
    B.f(`M-6 ${-drum - 2}L-5 ${-dome + 2}H5L6 ${-drum - 2}Z`, o.night ? '#1a2440' : '#26302e'); if (o.night) for (let i = 0; i < 4; i++) B.f(B.circ(-3 + r() * 6, -dome + 8 + r() * 20, .7), '#fff8e0');
    B.f(B.rect(-48, -drum - 2, 96, 4), STONE.rockHi);
    B.f(B.rr(-9, -sz('door', .5), 18, sz('door', .5), 1.6), '#2e2418').f(B.rr(-7.6, -sz('door', .5) + 1.4, 15.2, sz('door', .5) - 1.4, 1.2), '#5a6a7a');
    windowLit(B, -32, -drum + 14, 10, 12, o.night, '#e8dcc0'); windowLit(B, 22, -drum + 14, 10, 12, o.night, '#e8dcc0');
    B.tufts(r, -48, 4, 10, 6, grass(o.season), 7).tufts(r, 50, 4, 10, 6, grass(o.season), 7);
  } };
  /* the stone circle: a ring of grey stones, the near ones standing taller, worn turf inside */
  // (the stones were knee high and read as teeth, far too small for 2400 coins: art director, round 3. Now they stand
  // waist to shoulder high to a figure, broad slabs in a wider ring, the tallest at the back)
  A['lf-circle'] = { box: [-92, -96, 94, 16], shade: false, flat: true, seat: { kind: 'turf', w: 140, front: 12, back: 40, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(281), s = o.season, n = 11;
    const order = [...Array(n).keys()].map(i => { const a = -Math.PI / 2 + i / n * Math.PI * 2; return { x: Math.cos(a) * 76, y: -26 + Math.sin(a) * 22, a }; }).sort((p, q) => p.y - q.y);
    for (const p of order) { const h = sz('door', 0) * (.42 + (-p.y - 4) / 48 * .3) + r() * 6, w = 8 + r() * 4; B.f(B.poly([[p.x - w, p.y], [p.x - w * 1.05, p.y - h * .5], [p.x - w * .6, p.y - h], [p.x + w * .5, p.y - h * .94], [p.x + w, p.y - h * .4], [p.x + w, p.y]]), '#857c6e').f(B.poly([[p.x - w, p.y], [p.x - w * 1.05, p.y - h * .5], [p.x - w * .6, p.y - h], [p.x - w * .1, p.y - h * .5], [p.x - w * .2, p.y]]), '#b0a690'); B.f(B.blob(r, p.x - w * .3, p.y - h * .6, 2, 1.6, 6, .5), s === 'winter' ? '#f4f6f2' : '#c9c48a', .7); B.tufts(r, p.x, p.y + 1, w * 2.4, 5, grass(s), 5); }
  } };
  // (the brushwork above, for the next file of sights: 94-garden-paint-terrain-6sights.js)
  M.SIGHT_KIT = { ashlar, mossOn, ivy, shingles, windowLit, leaf, grass, sz, STONE, MOSSY, OAK, WOOD, IRON };
})();
