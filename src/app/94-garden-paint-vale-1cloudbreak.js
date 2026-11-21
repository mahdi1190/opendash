/* Painted vale: Cloudbreak's own small things, from the hand-authored mountain layout (assets/garden/vale-mountains.json,
 * presentation.mountains in the layout). Only what no other painter draws:
 *   the way cairns       fifteen knee-high piles of fell stones beside the forks, for cloud days
 *   the seats            the Long View bench, the summit bench by the toposcope, Wick's bench, the picnic rock
 *   the standing stones' feet: the four stones are the landmark's own picture (94-garden-paint-terrain-2marks.js); the
 *                        rectangle they stand in is open summit, so only each stone's foot stops you (an empty thing with a foot)
 * and three landmarks in the fells' house style, which join GardenPaintedMarks' table: the bothy (a roofless shepherds'
 * shelter, 2.6 H to its gable tops), the toposcope (a brass plate on a stone pillar) and the moor's end gate (a five-bar
 * gate between stone posts in the last dry-stone wall, the fingerpost to the Long Road beside it).
 * Each standing thing is baked once into a sprite on its foot, with a contact shadow and turf round its base, and says
 * where its foot is (GardenPaintVale.feet), so walking stops where the stones are drawn. A spot that the layout puts on a
 * path or a plot is moved to the nearest open turf (a cell or so), so nothing stands on a path. Nothing runs at load. */
(function () {
  'use strict';
  const V = window.GardenPaintVale;
  const KIT = () => window.GardenPaintTerrainKit;
  const H = typeof GARDEN_H !== 'undefined' ? GARDEN_H : 41;   // the player's height after the size change (rule 14)
  const STONE = { rock: '#a69c8a', rockLo: '#7c7366', rockHi: '#d0c6b0', rockDk: '#4a443c', lichen: '#c9c48a', snow: '#fbfbf7', snowSh: '#c8d6e6' };
  const WOOD = ['#8a7050', '#5e4a34', '#b49a72'];

  /** Open fell turf: land in the mountains, no path, water, building, rock or plot. */
  // the fells' open tops and yards (a seat stands on its rock or flags, as a bench on the Long View should)
  const TOPS = new Set(['summit-cairn', 'cloudbreak-col', 'wick-yard', 'long-view', 'falls-top', 'moor-end', 'cove-shingle']);
  const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  const LAID = new Set(['cloudbreak-col', 'wick-yard']);   // laid with the Way, one surface (compose)
  const onTop = (L, x, y) => (L.pres.plazas || []).some(pz => TOPS.has(pz.id) && Array.isArray(pz.shape) && inPoly(x, y, pz.shape));
  function openAt(L, x, y, top) {
    const b = L.base(Math.floor(x), Math.floor(y));
    if (!b || !b.land || b.freshwater || b.solid || b.landformId || b.staticId || b.beach) return false;
    if (b.route && !(top && onTop(L, x, y))) return false;
    return !L.plot(x, y);
  }
  /** The nearest spot to (x, y) whose foot (half width hw, cells) stands on open turf (or, for a seat, on its top), within about a cell and a half. */
  function settle(L, x, y, hw, top) {
    const fits = (px, py) => openAt(L, px, py, top) && openAt(L, px - hw, py, top) && openAt(L, px + hw, py, top) && openAt(L, px, py - .3, top);
    if (fits(x, y)) return [x, y];
    for (let d = .25; d <= 1.6; d += .25) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * Math.PI * 2) * d, py = y + Math.sin(a / 16 * Math.PI * 2) * d * .8; if (fits(px, py)) return [px, py]; }
    return null;
  }
  // a flat fell stone laid in a course, seen from the front: a slab wider than it is deep, its own grey, lit along its
  // top, a dark joint under it, lichen now and then
  const SLAB = ['#a49a86', '#b4aa94', '#9a907c', '#aca28c', '#8e8472', '#bcb29c'];
  function slab(B, r, x, y, w, h, snowy) {
    const k = w * .12, pts = [[x - w / 2, y], [x - w / 2 - k * (r() - .3), y - h * (.45 + r() * .2)], [x - w / 2 + k + r() * k, y - h], [x + w / 2 - k - r() * k, y - h - r() * h * .15], [x + w / 2 + k * (r() - .3), y - h * (.4 + r() * .2)], [x + w / 2, y]];
    B.f(B.poly(pts.map(([px, py]) => [px + 1, py + 1.6])), '#3a352c', .55);
    B.f(B.poly(pts), snowy && r() < .3 ? '#e4e6e2' : SLAB[Math.floor(r() * SLAB.length)]);
    B.f(B.poly([pts[1], pts[2], pts[3], pts[4], [pts[4][0] - 1, pts[4][1] + h * .18], [pts[1][0] + 1, pts[1][1] + h * .18]]), snowy ? STONE.snow : '#e2d8c0', snowy ? .9 : .35);
    B.f(B.poly([[x + w * .18, y], [pts[4][0], pts[4][1]], pts[5]]), '#5a5244', .3);
    if (!snowy && r() < .3) B.f(B.blob(r, x + (r() - .5) * w * .5, y - h * .5, 2 + r() * 3, 1.2, 6, .4), r() < .5 ? STONE.lichen : '#9aa65a', .7);
  }
  // a cairn: courses of flat slabs, staggered and narrowing to a capstone, the east side in shade, a few stones fallen at
  // its foot and turf round it (a heap of round balls looked cheap)
  function cairnPile(B, r, h, half, snowy) {
    B.shadow(half * .25, 2, half * 1.35, Math.max(4, half * .3), .34);
    // a rubble skirt wider than the pile, then courses on a rounded (not stepped) profile, each slab its own size
    for (let k = 0; k < 9; k++) { const a = (k / 9 - .5) * 2.6; slab(B, r, Math.sin(a) * half * 1.1, 2 + Math.cos(a) * 2 + r() * 2, 6 + r() * 8, 2.6 + r() * 2, snowy); }
    // the heap: a rounded silhouette in shade, then stones of every size laid into it from the top down, so the lower ones
    // overlap those above (a heap, not courses in steps)
    const prof = y => half * Math.pow(Math.max(0, 1 - Math.pow(-y / h, 1.25)), .85);
    { const pts = []; for (let k = 0; k <= 16; k++) { const y = -h * k / 16; pts.push([prof(y) + 1, y]); } for (let k = 16; k >= 0; k--) { const y = -h * k / 16; pts.unshift([-prof(y) - 1, y]); } B.f(B.poly(pts), '#8a8272'); }
    const n = Math.round(h * half / 17), st = []; for (let k = 0; k < n; k++) { const y = -h * Math.pow(r(), .9) * .97, w = prof(y); st.push([(r() * 2 - 1) * w, y]); }
    st.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of st) { const sz = 1 - (-y / h) * .45; slab(B, r, x, y + 3, (7 + r() * 9) * sz, (3.2 + r() * 3.4) * sz, snowy); }
    const rh = 7;
    slab(B, r, (r() - .5) * 2, -h + rh * .4, Math.max(8, half * .5), rh * 1.3, snowy);   // the capstone
    B.f(B.poly([[half * .15, 0], [half, 0], [half * .3, -h * .95], [half * .12, -h * .6]]), STONE.rockDk, .16);   // the east side in shade
    for (let k = 0; k < 4; k++) { const sg = k % 2 ? 1 : -1; slab(B, r, sg * (half + 2 + r() * half * .4), 2 + r() * 2, 5 + r() * 5, 2.4 + r() * 1.6, snowy); }
    if (!snowy) B.tufts(r, 0, 2, half * 2.6, 12, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6);
  }
  function wayCairn(B, r, h, snowy) { cairnPile(B, r, h, 13, snowy); }
  function bench(B, r, snowy) {
    // a plank seat on two stone legs, worn pale on top; turf round the legs
    const seat = -H * .3, w = 30;
    B.shadow(3, 1.5, 38, 7, .46);   // (layout fix, north: on flags the bench read as floating)
    for (const x of [-w + 6, w - 6]) B.f(B.ell(x + 1.5, 0, 7, 2.2), '#2e2a24', .45);
    B.f(B.rect(-w + 2, -3, w * 2 - 4, 3), '#6a6254').f(B.rect(-w + 2, -3, w * 2 - 4, 1), '#8a8272', .8);   // the footing stones, the length of the seat
    for (const x of [-w + 6, w - 6]) { B.f(B.rect(x - 4, seat, 8, -seat - 2), '#8a8272').f(B.rect(x - 4, seat, 2.4, -seat - 2), '#b4ac98', .8).f(B.rect(x + 2, seat, 2, -seat - 2), '#5e584c', .7); }
    B.f(B.rr(-w, seat - 4, w * 2, 5, 1.6), WOOD[0]).f(B.rect(-w + 1, seat - 4, w * 2 - 2, 1.4), snowy ? STONE.snow : WOOD[2], .9).f(B.rect(-w, seat, w * 2, 1.4), WOOD[1], .8);
    if (!snowy) B.tufts(r, 0, -1, 70, 10, ['#8c9a5e', '#c2c78e'], 5);
  }
  function picnicRock(B, r, snowy) {
    B.boulder(r, 0, 0, 46, 15, STONE, snowy);
    if (!snowy) B.tufts(r, 0, 1, 56, 10, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6);
  }

  // a dry-stone wall: rough courses of fell stone, each lit on its top, a turf cope, a shadow on the ground behind it
  function wallRun(B, r, w, len, h, snowy) {   // w: px across the screen, len: px of ground it runs up the screen (0 for an east-west run)
    if (len > 0) return wallRunNS(B, r, w, len, h, snowy);
    B.f(B.rect(-w / 2 + 4, -len - 1, w + (len ? 5 : 0), len + 5), '#2e3420', .2);
    B.f(B.rr(-w / 2, -len - h, w, len + h, 2), '#5a544a');
    const tones = ['#a49a86', '#8a806e', '#b4aa94', '#7c7364', '#9c927f', '#aca48e'];
    for (let y = -1, row = 0; y > -len - h + 3; row++) {
      const rh = 3.2 + r() * 2.4;
      for (let x = -w / 2 + .5 - (row % 2) * 3; x < w / 2 - .5; ) { const sw = 5 + r() * 7, x0 = Math.max(-w / 2 + .6, x), x1 = Math.min(w / 2 - .6, x + sw); if (x1 - x0 > 1.6) B.f(B.rr(x0, y - rh + .4, x1 - x0 - .8, rh - .7, 1.2), snowy ? '#e6eae8' : tones[Math.floor(r() * tones.length)]).f(B.rect(x0 + .6, y - rh + .5, Math.max(0, x1 - x0 - 2), .9), '#ddd3bb', .4); x += sw; }
      y -= rh;
    }
    // the cope: a row of stones set on edge along the top, turf and moss on it
    for (let x = -w / 2 + 1; x < w / 2 - 1; x += 3 + r() * 1.5) B.f(B.rr(x, -len - h - 3.5, 2.6, 4.5, .8), snowy ? STONE.snow : tones[Math.floor(r() * 3)]);
    if (!snowy) for (let k = 0; k < Math.max(2, (w + len) / 16); k++) B.f(B.blob(r, -w / 2 + r() * w, -len - h - 1 + (len ? r() * -0 : 0), 3 + r() * 4, 1.4, 6, .5), k % 2 ? '#7d8f4e' : '#a9b86a', .85);
    if (!snowy) B.tufts(r, 0, 1, w + 8, 5, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
  }
  // a north-south run seen from the south: the ground it stands on runs up the screen, so what shows is its top (the cope,
  // rounded stones set on edge with moss and turf between, seen from above) the length of the run, raised by its height,
  // its east side as a thin shaded strip, its shadow on the turf to the east, and only its south end as a face of courses
  // (drawn in courses its whole length it read as a tall brick pillar)
  function wallRunNS(B, r, w, len, h, snowy) {
    const top = -h, tones = ['#a49a86', '#8a806e', '#b4aa94', '#9c927f', '#aca48e'];
    B.f(B.poly([[w / 2 - 2, -len], [w / 2 + 9, -len + 4], [w / 2 + 9, 4], [w / 2 - 2, 2]]), '#2e3420', .22);   // its shadow on the turf, east
    // the body behind the cope, its sides wandering a little as dry stone does (a ruled strip read as a brick pillar)
    const lft = [], rgt = []; for (let y = -len + top; y <= 2; y += 6) { lft.push([-w / 2 - 1 + (r() - .5) * 3, y]); rgt.push([w / 2 + 1 + (r() - .5) * 3, y]); }
    B.f(B.poly(lft.concat(rgt.reverse())), '#4e483e');
    B.f(B.poly([[w / 2 - 3, -len + top], [w / 2 + 2, -len + top], [w / 2 + 2, top], [w / 2 - 3, top]]), '#3e3a32', .6);   // the east side in shade
    // the cope from above: rounded stones of every size jostled along it, moss in the gaps, lit on their west
    for (let y = -len + top + 3; y < top - 2; ) { const sh = 4 + r() * 5; let x = -w / 2 + .5 + (r() - .5) * 2; while (x < w / 2 - 2) { const sw = 4 + r() * 7, cxs = x + sw / 2, cys = y + sh / 2 + (r() - .5) * 1.6;
        B.f(B.blob(r, cxs + .6, cys + 1, sw / 2, sh / 2, 7, .3), '#2e2a24', .45).f(B.blob(r, cxs, cys, sw / 2, sh / 2, 7, .3), snowy ? '#e6eae8' : tones[Math.floor(r() * tones.length)]).f(B.blob(r, cxs - sw * .15, cys - sh * .18, sw * .26, sh * .2, 6, .4), '#e2d8c0', .45); x += sw - .5; } y += sh - .4; }
    if (!snowy) for (let y = -len + top + 4; y < top; y += 9 + r() * 12) B.f(B.blob(r, (r() - .5) * w * .6, y, 3 + r() * 3, 1.6 + r(), 6, .5), r() < .5 ? '#7d8f4e' : '#a9b86a', .85);
    // the south end: the face in courses, its height
    for (let y = -1, row = 0; y > top + 1; row++) { const rh = 3.4 + r() * 2.2; for (let x = -w / 2 + .5 - (row % 2) * 3; x < w / 2 - .5; ) { const sw = 5 + r() * 6, x0 = Math.max(-w / 2 + .5, x), x1 = Math.min(w / 2 - .5, x + sw); if (x1 - x0 > 1.6) B.f(B.rr(x0, y - rh + .4, x1 - x0 - .8, rh - .7, 1.2), snowy ? '#e6eae8' : tones[Math.floor(r() * tones.length)]); x += sw; } y -= rh; }
    B.f(B.rect(-w / 2, top - 1, w, 2.4), '#d6ccb4', .4);
    if (!snowy) { B.tufts(r, 0, 1, w + 10, 6, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6); for (let y = -len + 6; y < -4; y += 14 + r() * 10) B.tufts(r, w / 2 + 3, y, 6, 2, ['#8c9a5e', '#7d8f4e'], 5); }
  }
  // a Scots pine on the fell (the plan's groups: the Moor Pines, the pair above the Edge, the one behind Wick's hut): a
  // straight bole, grey-brown and furrowed low, warm orange where it climbs into the crown; a broad, uneven crown of
  // dark needle masses over the top half, lit on their upper left, leaning a little with the wind
  function scotsPine(B, r, h, wpx, lean, snowy) {
    const tw = Math.max(5, h * .04), top = -h, cb = -h * .5, lx = lean * h * .05;
    B.shadow(8, 2, wpx * .42, 7, .3);
    B.f(B.poly([[-tw, 0], [tw, 0], [lx + tw * .5, top * .9], [lx - tw * .5, top * .9]]), B.lin(0, 0, 0, top, [[0, '#4a3e34'], [.45, '#5e4a3a'], [.7, '#8a5a3e'], [1, '#a8704a']]));
    for (let y = -6; y > cb; y -= 7 + r() * 5) B.s(`M${-tw * .6 + lx * y / top} ${y}l${tw * .5} ${-3 - r() * 3}`, '#3a2e24', 1, .5);
    B.f(B.ell(0, -1, tw * 1.7, 2.6), '#3e3228', .8);
    // the crown: an umbrella of flat, tufted needle clouds over the top, wider than deep, the bole showing between them
    const n = 14, masses = [];
    for (let k = 0; k < n; k++) { const t = k / (n - 1) * .9 + r() * .1, y = cb + (top - cb) * (.05 + t * .9), spread = .62 - Math.abs(t - .45) * .5, x = lx * (.5 + t * .5) + (r() - .5) * 2 * wpx * spread * .72, rx = wpx * (.2 + r() * .12) * (1.1 - t * .35); masses.push({ x, y, rx, ry: rx * (.46 + r() * .12) }); }
    // a few bare side branches reaching out to the lower masses
    for (const m of masses.slice(0, 5)) B.s(`M${lx * .5} ${m.y + m.ry * .6}L${m.x} ${m.y + m.ry * .2}`, '#4a3a2e', 1.6, .8);
    masses.sort((a, b) => b.y - a.y);
    const dark = snowy ? '#2c3e34' : '#1a2c24', body = snowy ? '#3e5446' : '#28432f', mid = snowy ? '#4e6656' : '#3a5a3c', lit = snowy ? '#f4f6f2' : '#6e8c52';
    for (const m of masses) B.f(B.blob(r, m.x + 3, m.y + 4, m.rx, m.ry, 9, .4), dark, .9);
    for (const m of masses) B.f(B.blob(r, m.x, m.y, m.rx * .96, m.ry * .92, 9, .4), body);
    for (const m of masses) B.f(B.blob(r, m.x - m.rx * .14, m.y - m.ry * .22, m.rx * .7, m.ry * .6, 8, .45), mid, .95);
    for (const m of masses) B.f(B.blob(r, m.x - m.rx * .3, m.y - m.ry * .42, m.rx * .38, m.ry * .3, 7, .5), lit, snowy ? .95 : .8);
    if (!snowy) B.tufts(r, 0, 1, tw * 6, 6, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
  }
  // the moor's end gate's two posts, px from the gate's foot (the middle of its cells' foot): the walls run from them
  const MOOR_POSTS = [[4, -58], [20, -2]];
  function rowan(B, r, h, wpx, season) {
    const bare = season === 'winter', leaf = season === 'autumn' ? ['#b4502e', '#d4783a', '#e8a04a'] : ['#4e7a36', '#6e9a48', '#9cc068'];
    B.shadow(6, 2, wpx * .4, 6, .28);
    B.f(B.poly([[-3.4, 0], [3.4, 0], [2, -h * .42], [-1.6, -h * .42]]), B.lin(-3, 0, 3, 0, [[0, '#8a8478'], [1, '#5e5a52']]));
    for (const [dx, dy] of [[-wpx * .22, -h * .78], [wpx * .2, -h * .82], [0, -h * .95]]) B.s(`M0 ${-h * .4}Q${dx * .4} ${-h * .55} ${dx} ${dy}`, '#6a665c', 2.4, .95);
    if (!bare) { const n = 22; for (let k = 0; k < n; k++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), x = Math.cos(a) * wpx * .44 * d, y = -h * .74 + Math.sin(a) * h * .26 * d, rx = 5 + r() * 6;
      B.f(B.blob(r, x + 2, y + 2, rx, rx * .55, 7, .5), '#2e4426', .5).f(B.blob(r, x, y, rx, rx * .55, 7, .5), leaf[k % 2]).f(B.blob(r, x - 1.5, y - 1.5, rx * .5, rx * .26, 6, .5), leaf[2], .7); } }
    if (season !== 'spring') for (let k = 0; k < 7; k++) { const x = (r() - .5) * wpx * .7, y = -h * (.6 + r() * .3); for (let j = 0; j < 5; j++) B.f(B.circ(x + (r() - .5) * 4, y + r() * 3, 1.4), j % 2 ? '#c8282a' : '#e04a2a'); }
    if (season !== 'winter') B.tufts(r, 0, 1, 18, 6, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
  }
  const W_COLS = C => (C.W && C.W.cols) || 96;
  const GREY = ['#b4ad9c', '#a59e8c', '#c2bba8', '#9a9484', '#bab3a0', '#aaa494'], WET = ['#8e8a80', '#7e7b72', '#a09b8e', '#6f6c64'], PEAT = ['#9c927f', '#8a806e', '#a8a08c', '#7c7364'];
  // flat stones laid on a jittered grid, each an irregular six-sided slab with its own grey, a shadow at its foot, lit along
  // its top edge, lichen now and then; o.s the slab's size (px), o.cover the share of the ground laid (the rest stays turf)
  // the part of a ground item's box a chunk shows (pad: px either side, so a slab across the chunk's edge is drawn whole)
  const within = (bb, cb, pad) => { if (!cb) return bb; const b = [Math.max(bb[0], cb[0] - pad), Math.max(bb[1], cb[1] - pad), Math.min(bb[2], cb[2] + pad), Math.min(bb[3], cb[3] + pad)]; return b[2] > b[0] && b[3] > b[1] ? b : null; };
  function slabs(B, bb, o) {
    // the grid is fixed to the world (o.org, the whole item's box), so two chunks lay the same slabs along their seam
    const K = KIT(), s = o.s, sy = s * .6, org = o.org || bb, r0 = Math.floor((bb[1] - sy - org[1]) / sy), r1 = Math.ceil((bb[3] + sy - org[1]) / sy);
    for (let row = r0; row <= r1; row++) for (let c = Math.floor((bb[0] - s * 1.5 - org[0]) / s), c1 = Math.ceil((bb[2] + s - org[0]) / s); c <= c1; c++) {
      const y = org[1] + row * sy, x = org[0] + c * s + (((row % 2) + 2) % 2) * s * .5;
      const rr = K.rng(K.hash(c, row, o.salt)); if (rr() > o.cover) continue;
      const w = s * (.96 + rr() * .3), h = sy * (.94 + rr() * .3), cx = x + (rr() - .5) * s * .3, cy = y + (rr() - .5) * sy * .3, pts = [], n = 5 + Math.floor(rr() * 3), a0 = rr() * 6.3;
      for (let k = 0; k < n; k++) { const a = a0 + (k + (rr() - .5) * .6) / n * Math.PI * 2, f = .66 + rr() * .4; pts.push([cx + Math.cos(a) * w / 2 * f, cy + Math.sin(a) * h / 2 * f]); }
      B.f(B.poly(pts.map(([px, py]) => [px + .8, py + 1.6])), '#3e3a32', .4);
      B.f(B.poly(pts), o.snowy ? '#eef0ec' : o.tones[Math.floor(rr() * o.tones.length)]);
      B.f(B.poly(pts.map(([px, py]) => [cx + (px - cx) * .8, cy + (py - cy) * .8 - h * .12])), '#fff', .1);
      if (!o.snowy && rr() < .25) B.f(B.ell(cx + (rr() - .5) * w * .5, cy + (rr() - .5) * h * .4, 2 + rr() * 3, 1.2 + rr() * 1.4), rr() < .5 ? '#c9c48a' : '#9aa65a', .6);
    }
  }
  function compose(C) {
    const { L, kit, thing } = C, M = (L.pres && L.pres.mountains) || null; if (!M) return;
    const snowy = C.season === 'winter';
    (M.wayCairns || []).forEach((c, i) => {
      const at = settle(L, c[0], c[1], .3); if (!at) return;
      const p = L.cpt(at[0], at[1]), h = H * (.5 + (i % 3) * .08);
      thing({ key: 'way-cairn-' + i + '|' + C.season, x: p.x, y: p.y, box: [-22, -h - 10, 24, 8], foot: [-12, 12, 8], draw: B => wayCairn(B, kit.rng(900 + i), h, snowy) });
    });
    (M.seats || []).forEach((s, i) => {
      const rock = /rock/.test(s.what), at = settle(L, s.at[0], s.at[1], rock ? .5 : .65, true); if (!at) return;
      const p = L.cpt(at[0], at[1]);
      thing({ key: 'fell-seat-' + i + '|' + C.season, x: p.x, y: p.y, box: rock ? [-30, -24, 32, 8] : [-36, -H * .3 - 12, 38, 8], foot: rock ? [-20, 20, 8] : [-28, 28, 6], draw: B => (rock ? picnicRock : bench)(B, kit.rng(950 + i), snowy) });
    });
    // the Cloudbreak Way is laid fell stone, the one road up here: irregular grey flags, turf in the joints, a worn line up
    // the middle; the open tops are rock and turf (the summit, the Long View, the falls top), Wick's yard is close flags
    const way = L.routes.get('pass-summit');
    // (layout fix, north) the Way, the col and Wick's yard are one laid surface: one grid of flags over all three, so no two
    // pavings overlap with a seam between them (the col's blob lay over the Way's end), and its edge grown in with turf
    // and a few strayed flags, not cut sharp on the grass
    if (way && way.points && way.points.length > 1) {
      const loops = [V.routeRibbon(L, way, false)].concat((L.pres.plazas || []).filter(pz => LAID.has(pz.id) && Array.isArray(pz.shape)).map(pz => V.shapeLoop(L, pz.shape)));
      const bb = kit.bboxOf(loops.flat(), 8), seed = kit.hashStr('cloudbreak-way');
      C.add(bb, seed, (B, r, cb) => { const box = within(bb, cb, 30); if (!box) return; const lps = loops.map(lp => new Path2D(B.poly(lp)));
        // each shape in turn on the same grid of flags, so where two overlap the same flags are laid twice (one surface; a
        // union of the shapes in one path left a hole where their windings cancelled)
        for (const q of lps) { B.cx.save(); B.cx.clip(q); B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), snowy ? '#c8ccc4' : '#6e6b5a');
          slabs(B, box, { s: 24, cover: .99, salt: seed, tones: GREY, snowy, org: bb }); B.cx.restore(); }
        // the edge: turf creeping over the outer flags, tufts, and the odd flag lying loose in the grass
        const K = KIT(), M2 = B.cx.getTransform(); for (const lp of loops) for (let i = 0; i < lp.length; i += 2) { const p = lp[i]; if (p.x < box[0] - 30 || p.x > box[2] + 30 || p.y < box[1] - 30 || p.y > box[3] + 30) continue;
          const rr = K.rng(K.hash(Math.round(p.x), Math.round(p.y), 23)); let inside = false; for (let j = 0; j < loops.length; j++) if (loops[j] !== lp && B.cx.isPointInPath(lps[j], M2.a * p.x + M2.c * p.y + M2.e, M2.b * p.x + M2.d * p.y + M2.f)) { inside = true; break; } if (inside) continue;
          if (!snowy) B.f(B.blob(rr, p.x + (rr() - .5) * 6, p.y + (rr() - .5) * 4, 6 + rr() * 8, 3 + rr() * 3, 7, .5), rr() < .5 ? '#8c9a5e' : '#9aa866', .9);
          if (!snowy && rr() < .6) B.tufts(rr, p.x, p.y + 2, 10, 4, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
          if (rr() < .12) { const ox = (rr() - .5) * 26, oy = (rr() - .5) * 16; B.f(B.blob(rr, p.x + ox + .8, p.y + oy + 1.4, 7, 4, 6, .3), '#3e3a32', .35).f(B.blob(rr, p.x + ox, p.y + oy, 7, 4, 6, .3), snowy ? '#eef0ec' : GREY[Math.floor(rr() * GREY.length)]); } } });
    }
    // the other ways each in their own ground, so the fells are not one web of the same beige ribbon: the turf trails
    // (the Edge walk, Skylark path, the cove cliff path) a trodden line in the grass, the moor road dark peat with heather
    // at its edges, the stony lanes and trails scattered with fell stones
    // Where two ways meet, the lesser stops at the edge of the one it joins (the Way first, then the open tops, then the
    // lanes and trails in the order below), so no two surfaces lie on top of each other with a straight cut across them
    // (the moor road's end lay over the tarn path). A turf trail is a worn earth line with grass to either side, edged
    // darker, so it reads as a path from across the screen.
    const SURF = { turf: { base: '#97a35a', mid: '#b09868', a: .95, edge: '#5e6a34' }, peat: { base: '#7a644a', mid: '#94785a', a: .85, edge: '#4e3e2c' } };
    const RANK = ['pass-summit', 'tarn-shore', 'summit-tarn', 'gorge-trail', 'cold-cove', 'edge-walk', 'skylark-path', 'lip-stones', 'cove-cliff', 'moor-trail'];
    const tops = (L.pres.plazas || []).filter(pz => TOPS.has(pz.id) && Array.isArray(pz.shape)).map(pz => V.shapeLoop(L, pz.shape));
    const ribOf = new Map(); for (const id of RANK) { const a = L.routes.get(id); if (a && a.points && a.points.length > 1) ribOf.set(id, V.routeRibbon(L, a, false)); }
    for (const a of (L.D.routes || [])) {
      if (a.zone !== 5 || a.tier === 'plaza' || !a.points || a.points.length < 2 || a.id === 'pass-summit') continue;
      const o = SURF[a.surface], rib = ribOf.get(a.id) || V.routeRibbon(L, a, false), bb = kit.bboxOf(rib, 8), seed = kit.hashStr('way|' + a.id);
      const rank = RANK.indexOf(a.id), over = [...RANK.slice(0, rank < 0 ? RANK.length : rank).map(id => ribOf.get(id)).filter(Boolean), ...tops]
        .filter(lp => { const b2 = kit.bboxOf(lp, 0); return b2[0] < bb[2] && b2[2] > bb[0] && b2[1] < bb[3] && b2[3] > bb[1]; });
      C.add(bb, seed, (B, r, cb) => { const box = within(bb, cb, 20); if (!box) return; const path = new Path2D(B.poly(rib)); B.cx.save(); B.cx.clip(path);
        // (each cut its own clip: added into one even-odd path, two cuts that overlapped (the Way and the col) cancelled, and a wedge of trail showed on the col's flags)
        for (const lp of over) { const cut = new Path2D(B.rect(box[0] - 40, box[1] - 40, box[2] - box[0] + 80, box[3] - box[1] + 80)); cut.addPath(new Path2D(B.poly(lp))); B.cx.clip(cut, 'evenodd'); }
        const K = KIT();
        if (o && !snowy) {
          B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), o.base, o.a);
          K.tiles(box, 40, 0, seed + 3, (tx, ty, rr) => { for (let k = 0; k < 5; k++) { const x = tx + rr() * 40, y = ty + rr() * 40; if (a.surface === 'turf') B.tufts(rr, x, y, 10, 4, ['#8c9a5e', '#b8c07a', '#7d8f4e'], 4); else B.f(B.blob(rr, x, y, 5 + rr() * 6, 1.6 + rr(), 6, .5), rr() < .5 ? '#5e4a36' : '#8e7458', .7); } });
          // the worn line feet keep to, down the middle
          const mid = new Path2D(B.poly(V.routeRibbon(L, Object.assign({}, a, { widths: a.widths.map(w => w * (a.surface === 'turf' ? .5 : .38)) }), false))); B.f(mid, o.mid, a.surface === 'turf' ? .9 : .75);
          if (a.surface === 'turf') K.tiles(box, 30, 0, seed + 7, (tx, ty, rr) => { for (let k = 0; k < 3; k++) B.f(B.ell(tx + rr() * 30, ty + rr() * 30, 1.6 + rr() * 2.4, 1 + rr()), rr() < .5 ? '#8a7448' : '#c8b488', .7); });
          B.s(path, o.edge, 2.4, .32);
        }
        if (a.surface === 'stony') K.tiles(box, 34, 0, seed + 5, (tx, ty, rr) => { for (let k = 0; k < 2; k++) { const x = tx + rr() * 34, y = ty + rr() * 34, w = 3 + rr() * 5; B.f(B.ell(x + .8, y + 1.2, w, w * .5), '#4e4a40', .35).f(B.ell(x, y, w, w * .5), GREY[Math.floor(rr() * GREY.length)], .95).f(B.ell(x - w * .25, y - w * .15, w * .45, w * .2), '#e8e4d8', .4); } });
        B.cx.restore(); });
    }
    const TOP = { 'summit-cairn': { s: 40, cover: .86, base: '#8a9458' }, 'long-view': { s: 28, cover: .86, base: '#7a7a5e' }, 'falls-top': { s: 24, cover: .88, wet: true, base: '#5e5c50' }, 'wick-yard': { s: 22, cover: .99, base: '#6e6b5a' }, 'cloudbreak-col': { s: 24, cover: .99, base: '#6e6b5a' }, 'moor-end': { s: 30, cover: .7, base: '#7a6a4e', peat: true }, 'cove-shingle': null };
    for (const pz of L.pres.plazas || []) {
      const o = TOP[pz.id]; if (!o || !Array.isArray(pz.shape) || LAID.has(pz.id)) continue;
      const loop = V.shapeLoop(L, pz.shape), bb = kit.bboxOf(loop, 10), seed = kit.hashStr('top|' + pz.id);
      C.add(bb, seed, (B, r, cb) => { const path = new Path2D(B.poly(loop)), box = within(bb, cb, 30); if (!box) return; B.cx.save(); B.cx.clip(path);
        B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), snowy ? '#e8ece6' : o.base);
        if (!snowy) for (let k = 0; k < (bb[2] - bb[0]) * (bb[3] - bb[1]) / 1400; k++) B.tufts(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 14, 5, o.peat ? ['#8a6a8a', '#7d8f4e'] : ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
        slabs(B, box, { s: o.s, cover: o.cover, salt: seed, tones: o.wet ? WET : o.peat ? PEAT : GREY, snowy, org: bb });
        B.cx.restore(); });
    }
    // Cold cove's shingle: the cove's floor of grey pebbles, wet and darker toward the sea, where the cove walk and Wick's steps end
    const cove = (L.pres.plazas || []).find(pz => pz.id === 'cove-shingle');
    if (cove && Array.isArray(cove.shape)) {
      const loop = V.shapeLoop(L, cove.shape), bb = kit.bboxOf(loop, 8), seed = kit.hashStr('cove-shingle');
      C.add(bb, seed, (B, r) => { const path = new Path2D(B.poly(loop)); B.cx.save(); B.cx.clip(path); B.f(B.rect(bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]), '#a39d90');
        for (let k = 0; k < (bb[2] - bb[0]) * (bb[3] - bb[1]) / 26; k++) { const x = bb[0] + r() * (bb[2] - bb[0]), y = bb[1] + r() * (bb[3] - bb[1]), t = r(); B.f(B.ell(x + .6, y + .8, 2 + r() * 2.2, 1.2 + r()), '#5e5a50', .35).f(B.ell(x, y, 1.8 + r() * 2.2, 1.1 + r() * .9), t < .3 ? '#8a8478' : t < .7 ? '#b4ae9f' : '#cfc9ba', .95); }
        for (let k = 0; k < 6; k++) B.f(B.blob(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 14 + r() * 16, 3 + r() * 3, 7, .5), '#e4ddc8', .3);
        B.cx.restore(); B.s(path, '#6e6a5c', 1.6, .45); });
    }
    // the last wall: where the moor runs out west you come to a dry-stone wall running the length of the fell edge, and
    // the moor road ends at its gate (ld-moor-gate); you stop at the stones, not in open heather at the map's edge. Each
    // run is one picture with one foot its whole length (north of the gate, and south of it to the Edge), so what stops
    // you is exactly the wall drawn. (Seen from the south a north-south wall shows its top running up the slope and its
    // end where it stops: at the gate and at the Edge.)
    const H9 = H * .9, mg = L.stat('ld-moor-gate');
    if (mg) for (const [r0, r1, wx] of [[1, mg.y, MOOR_POSTS[0][0]], [mg.y + mg.h, 19, MOOR_POSTS[1][0]]]) {
      const len = (r1 - r0) * L.ch, p = L.cpt(mg.x + mg.w / 2 + wx / L.cw, r1);
      thing({ key: 'moor-wall-' + r0 + '|' + C.season, x: p.x, y: p.y, K: 1.25, box: [-14, -len - H9 - 6, 24, 8], foot: [-10, 10, len], draw: B => wallRun(B, kit.rng(970 + r0), 20, Math.max(0, len - H9), H9, snowy) });
    }
    // (layout fix, north: no march wall ruled along the north edge any more; the range closes it,
    // 94-garden-paint-vale-1cloudbreak-relief.js)
    // Wick's steps (the plan's shortcut B): a flight of rough rock steps where the cove path drops to the shingle, the
    // bottom three slabs slipped and lying askew on the shingle
    const cc = L.routes.get('cove-cliff');
    if (cc && cc.points && cc.points.length > 1) {
      const top = L.cpt(76.9, 12.9), bot = L.cpt(77, 11.2), n = 6, bb = [Math.min(top.x, bot.x) - 50, bot.y - 16, Math.max(top.x, bot.x) + 50, top.y + 16];
      C.add(bb, kit.hashStr('wicks-steps'), (B, r) => {
        for (let k = 0; k < n; k++) { const t = k / (n - 1), x = top.x + (bot.x - top.x) * t, y = top.y + (bot.y - top.y) * t, w = 40 - k * .6, slip = k >= n - 3, a = slip ? (r() - .5) * .5 : 0, dx = slip ? (r() - .5) * 16 : 0;
          const pts = [[-w / 2, -3.2], [w / 2, -3.6], [w / 2 + 1, 3], [-w / 2 - 1, 3.4]].map(([px, py]) => [x + dx + px * Math.cos(a) - py * Math.sin(a), y + px * Math.sin(a) + py]);
          B.f(B.poly(pts.map(([px, py]) => [px + 1, py + 3.4])), '#3a362e', .55).f(B.poly(pts), snowy ? '#e6e8e4' : GREY[k % GREY.length]).f(B.poly([pts[0], pts[1], [pts[1][0], pts[1][1] + 1.6], [pts[0][0], pts[0][1] + 1.6]]), '#e8e2d0', .45);
          if (!snowy && !slip) B.tufts(r, x - w / 2 - 3, y + 2, 6, 3, ['#8c9a5e', '#7d8f4e'], 5);
          if (!slip) for (const sg of [-1, 1]) B.stone(r, x + sg * (w / 2 + 6 + r() * 3), y + 1, 7 + r() * 4, 4.5 + r() * 2, { rock: '#9a958c', rockLo: '#6e6a62', rockHi: '#c8c2b4', rockDk: '#3e3c38' }, snowy ? 'snow' : r() < .3 ? '#c9c48a' : null); }   // (rock cheeks: the flight is cut into the bank)
      });
    }
    // the bothy's door path: a worn line of bare earth and a few flags from its doorstep down to the tarn path
    const bo = L.stat('ld-bothy'), tp = L.routes.get('summit-tarn');
    if (bo && bo.door && tp && tp.points && tp.points.length > 1) {
      const d0 = L.cpt(bo.door.x + .5, bo.door.y + .05), pts = tp.points.map(q => L.cpt(q[0] != null ? q[0] : q.x, q[1] != null ? q[1] : q.y)), near = pts.reduce((a, q) => Math.hypot(q.x - d0.x, q.y - d0.y) < Math.hypot(a.x - d0.x, a.y - d0.y) ? q : a, pts[0]);
      const end = { x: d0.x + (near.x - d0.x) * .85, y: d0.y + (near.y - d0.y) * .85 }, way = [d0, { x: (d0.x + end.x) / 2 - 4, y: (d0.y + end.y) / 2 }, end], bb = [Math.min(d0.x, end.x) - 30, d0.y - 10, Math.max(d0.x, end.x) + 30, Math.max(d0.y, end.y) + 14];
      C.add(bb, kit.hashStr('bothy-path'), (B, r) => { if (snowy) return; V.strokePts(B, way, '#6a5a3e', 28, .28); V.strokePts(B, way, '#9a8460', 20, .7); V.strokePts(B, way, '#b49c72', 9, .5);
        for (let k = 0; k < 4; k++) { const t = (k + .5) / 4, x = d0.x + (end.x - d0.x) * t + (r() - .5) * 6, y = d0.y + (end.y - d0.y) * t; B.f(B.blob(r, x + 1, y + 1.4, 7, 3.4, 6, .3), '#3e3a32', .35).f(B.blob(r, x, y, 7, 3.4, 6, .3), GREY[k % GREY.length]); } });
    }
    // the plan's Scots pines, in their groups (each moved to open turf if the layout put it on a path or a plot)
    (M.trees || []).forEach((t, i) => {
      if (t.kind === 'rowan') { const at = settle(L, t.at[0], t.at[1], .2); if (!at) return; const p = L.cpt(at[0], at[1]), h = H * t.h, wpx = t.w * L.cw * .8;
        thing({ key: 'fell-rowan-' + i + '|' + C.season, x: p.x, y: p.y, box: [-wpx * .55 - 8, -h - 12, wpx * .55 + 10, 10], foot: [-5, 5, 8], draw: B => rowan(B, kit.rng(1300 + i), h, wpx, C.season) }); return; }
      if (t.kind !== 'pine') return;
      const at = settle(L, t.at[0], t.at[1], .3); if (!at) return;
      const p = L.cpt(at[0], at[1]), h = H * t.h, wpx = t.w * L.cw * .8, tw = Math.max(6, h * .055);
      thing({ key: 'fell-pine-' + i + '|' + C.season, x: p.x, y: p.y, box: [-wpx * .62 - 10, -h - wpx * .3 - 10, wpx * .62 + 14, 10], foot: [-tw - 2, tw + 2, 8], draw: B => scotsPine(B, kit.rng(1200 + i), h, wpx, t.lean ? 1 : 0, snowy) });
    });
    // the west peak's foot: the fells painter draws its scree skirt about 0.4 of a row below the peak's outline, so the
    // feet stop at that drawn foot along its whole width (a block of its own, not a landform reaching past the drawing)
    { const p = L.cpt(12.85, 10.86), hw = 2.45 * L.cw; thing({ key: 'west-peak-foot', x: p.x, y: p.y - 2, box: [-2, -2, 2, 2], foot: [-hw, hw, .78 * L.ch], draw: () => {} }); }
    // the standing stones: each stone's foot, where 94-garden-paint-terrain-2marks.js draws it (the picture is the landmark's)
    (M.stones || []).forEach((s, i) => { const p = L.cpt(s[0], s[1]), hw = s[2] * L.cw; thing({ key: 'stone-foot-' + i, x: p.x, y: p.y - 2, box: [-2, -2, 2, 2], foot: [-hw, hw, 8], draw: () => {} }); });
  }
  const lvNow = () => { try { return gardenModel().level.level; } catch (e) { return 1; } };
  const STAIR_LV = 18, LIP_LV = 6; window.__gardenLevelSteps = (window.__gardenLevelSteps || []).concat([STAIR_LV, LIP_LV]);   // (vf-perf: levels where the land changes, gardenLevelLandSig)   // shortcut C (the falls cave stair) and shortcut A (the lip stones: one has rolled out of the line)
  if (V && V.groundSigs) V.groundSigs.push(() => (lvNow() >= STAIR_LV ? 'cs1' : 'cs0') + (lvNow() >= LIP_LV ? 'la1' : 'la0'));
  window.gardenCloudbreakLipGap = () => lvNow() < LIP_LV;
  function ropeLine(B, r, a, b, snowy) {
    const np = Math.max(2, Math.round(Math.abs(b.x - a.x) / 44)) + 1, posts = []; for (let i = 0; i < np; i++) posts.push({ x: a.x + (b.x - a.x) * i / (np - 1), y: a.y + (b.y - a.y) * i / (np - 1) + (i % 2 ? 2 : 0) });
    B.shadow((a.x + b.x) / 2 + 3, (a.y + b.y) / 2 + 2, Math.abs(b.x - a.x) / 2 + 8, 4, .25);
    for (let i = 0; i < np - 1; i++) { const p = posts[i], q = posts[i + 1]; B.s(`M${p.x} ${p.y - 22}Q${(p.x + q.x) / 2} ${(p.y + q.y) / 2 - 14} ${q.x} ${q.y - 22}`, '#6a5434', 2.6, .9).s(`M${p.x} ${p.y - 22.6}Q${(p.x + q.x) / 2} ${(p.y + q.y) / 2 - 14.6} ${q.x} ${q.y - 22.6}`, '#d8c08a', 1.2, .9); }
    for (const p of posts) B.f(B.ell(p.x + 1, p.y, 4.4, 1.6), '#2e3420', .35).f(B.rect(p.x - 2.4, p.y - 25, 4.8, 25), '#7a6248').f(B.rect(p.x - 2.4, p.y - 25, 1.6, 25), '#a88c62', .8).f(B.ell(p.x, p.y - 25, 2.6, 1), snowy ? STONE.snow : '#5e4a34');
    const m = posts[Math.floor(np / 2)], tx = 'Lv ' + STAIR_LV; B.f(B.rr(m.x - 12, m.y - 40, 24, 11, 2), '#c9a876').s(B.rr(m.x - 12, m.y - 40, 24, 11, 2), '#6e5434', .8, .9); B.text(tx, m.x, m.y - 34.2, 7, '#3e2c1a');
  }
  function stairRopes(C) {
    const { L, kit } = C, fl = L.pres && L.pres.falls; if (!fl || !fl.caveStair || lvNow() >= STAIR_LV) return;
    const snowy = C.season === 'winter', [sx, sy] = fl.caveStair;
    for (const [x0, x1, y] of STAIR_ROPES(sx, sy)) { const a = L.cpt(x0, y), b = L.cpt(x1, y);
      C.add([a.x - 14, a.y - 44, b.x + 14, b.y + 8], kit.hashStr('stair-rope|' + y), B => ropeLine(B, kit.rng(55), a, b, snowy)); }
  }
  // the ropes, cells: [x0, x1, y] (the same lines block the walk, gardenCloudbreakStairShut)
  const STAIR_ROPES = (sx, sy) => [[sx - 1.65, sx + 1.75, sy + 1.25]];   // (from the rock tor west of the stair to the falls' spray: the stair's foot is a wide apron of turf)
  window.gardenCloudbreakStairShut = function () { try { const d = gardenIslandActive() && gardenIslandData(), fl = d && d.presentation && d.presentation.falls; if (!fl || !fl.caveStair || !(d.presentation.mountains) || lvNow() >= STAIR_LV) return []; return STAIR_ROPES(fl.caveStair[0], fl.caveStair[1]); } catch (e) { return []; } };
  // shortcut A: below level 6 the middle lip stone has rolled away, and the gap in the line stops you (the painter leaves it out)
  window.gardenCloudbreakLipShut = function () { try { const d = gardenIslandActive() && gardenIslandData(), c = d && d.presentation && (d.presentation.crossings || []).find(q => q.id === 'lip-stones'); if (!c || lvNow() >= LIP_LV) return []; return [[c.x - .42, c.y - .36, c.x + .42, c.y + .36]]; } catch (e) { return []; } };
  // (vale layouts merge) shortcut A shut: where the stone has rolled out of the line the stream pours through the gap, white
  // water standing over it as far as the feet are stopped (gardenCloudbreakLipShut), so you see why you cannot step there
  // (the gap was only foam laid flat on the ground: the stop read as an invisible wall)
  function lipWater(C) {
    const { L, kit, thing } = C; if (lvNow() >= LIP_LV) return;
    const c = (L.pres && L.pres.crossings || []).find(q => q.id === 'lip-stones'); if (!c) return;
    const p = L.cpt(c.x, c.y + .36), hw = .46 * L.cw, ht = .78 * L.ch, snowy = C.season === 'winter';
    // (vale final, fix 1 north: the gap was a white rectangle of wave stripes pasted over the stones.) The stream pours
    // through the gap in the line: a tongue of dark, fast water the width of the missing stone, its edges rounded where it
    // breaks round the stones either side, a white lip of foam where it drops in on the upstream side and a fan of white
    // water and spray below; drawn along the stream's own direction, so it is part of the brook, not laid on it.
    const riv = L.pres.rivers && L.pres.rivers[c.over]; let tx = .7, ty = .7;
    if (riv && riv.line && riv.line.length > 1) { let bi = 1, bd = 1e9; for (let i = 1; i < riv.line.length; i++) { const m = [(riv.line[i][0] + riv.line[i - 1][0]) / 2, (riv.line[i][1] + riv.line[i - 1][1]) / 2], d = Math.hypot(m[0] - c.x, m[1] - c.y); if (d < bd) { bd = d; bi = i; } }
      const a = riv.line[bi - 1], b = riv.line[bi], dx = (b[0] - a[0]) * L.cw, dy = (b[1] - a[1]) * L.ch, n = Math.hypot(dx, dy) || 1; tx = dx / n; ty = dy / n; }
    thing({ key: 'lip-gap-water|' + C.season, x: p.x, y: p.y, box: [-hw * 2 - 10, -ht * 2 - 14, hw * 2 + 10, 10], draw: B => { const r = kit.rng(611), cy = -ht * .55;
      const pt = (u, v) => [u * tx - v * ty, cy + u * ty + v * tx];   // u along the stream (down it), v across
      const lobe = (u0, u1, v0, k) => { const pts = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2, u = (u0 + u1) / 2 + Math.cos(a) * (u1 - u0) / 2, v = Math.sin(a) * v0 * (1 + (k ? (r() - .5) * k : 0)); pts.push(pt(u, v)); } return B.poly(pts); };
      const L0 = ht * 1.25, V0 = hw * .95;
      B.f(lobe(-L0 * .8, L0 * .8, V0 * .8, .12), snowy ? '#56727a' : '#3a6c74', .35);                                  // the tongue of faster, darker water (the stream itself runs under, in the channel)
      B.f(lobe(-L0 * .5, L0 * .6, V0 * .4, .1), snowy ? '#6c8a90' : '#5a9298', .3);
      for (let k = 0; k < 7; k++) { const v = (r() - .5) * V0 * 1.2, u = -L0 * .6 + r() * L0 * 1.2, a = pt(u, v), b = pt(u + 7 + r() * 8, v + (r() - .5) * 2);
        B.s(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, '#cfe2e2', 1 + r() * .8, .55 + r() * .3); }                                   // streaks running down it
      { const pts = []; for (let i = 0; i <= 10; i++) { const v = (i / 10 - .5) * V0 * 2.1; pts.push(pt(-L0 * .78 + Math.cos(i / 10 * Math.PI - Math.PI / 2) * -3 + (r() - .5) * 2, v)); }
        B.s(B.line(pts.map(([x, y]) => ({ x, y }))), '#f4f8f4', 1.6, .55); for (const [x, y] of pts) if (r() < .6) B.f(B.blob(r, x, y, 2 + r() * 2.5, 1.2 + r(), 6, .5), '#f4f8f4', .8); }                                                    // the white lip where it drops in
      for (let k = 0; k < 9; k++) { const a = pt(L0 * (.35 + r() * .55), (r() - .5) * V0 * 1.7); B.f(B.blob(r, a[0], a[1], 2.5 + r() * 3.5, 1.4 + r() * 1.6, 6, .5), '#eef4f0', .75 + r() * .2); }   // white water below
      for (let k = 0; k < 6; k++) { const a = pt(-L0 * .2 + r() * L0, (r() - .5) * V0 * 1.6); B.f(B.circ(a[0], a[1] - 3 - r() * 6, .8 + r() * 1.1), '#ffffff', .7); }   // spray standing off it
    } });
  }
  // (layout fix, north) a pass gate, once open, keeps its story: the rope you tied runs as a handline up the steep bit beside
  // the way, from a post at the foot to a post at the top, and a fingerpost at the top names the pass. For any gate of the
  // pass kind, placed from the gate's own line and door on open turf beside the way (none of it on the way).
  const passOpen = g => { try { return typeof _GD_LAND !== 'undefined' && _GD_LAND.has('zn-' + g.n); } catch (e) { return false; } };
  const passGates = () => { try { return ((gardenIslandData() || {}).gates || []).filter(g => g.kind === 'pass' && g.door); } catch (e) { return []; } };
  if (V && V.groundSigs) V.groundSigs.push(() => passGates().map(g => passOpen(g) ? 'p1' : 'p0').join(''));
  function passRope(C) {
    const { L, kit, thing } = C, snowy = C.season === 'winter';
    for (const g of passGates()) {
      if (!passOpen(g)) continue;
      const span = g.crossSpan || [[g.x - 2, g.y + .5], [g.x + 2, g.y + .5]], wx = Math.min(span[0][0], span[1][0]) + 1.6, y0 = span[0][1] + .9, y1 = g.door.y - .1;
      const top = settle(L, wx, y0, .12), foot = settle(L, wx - .1, y1, .12); if (!top || !foot) continue;
      const a = L.cpt(top[0], top[1]), b = L.cpt(foot[0], foot[1]), ox = b.x, oy = b.y, A = { x: a.x - ox, y: a.y - oy };
      thing({ key: 'pass-rope-' + g.id + '|' + C.season, x: ox, y: oy, box: [Math.min(A.x, 0) - 40, A.y - 70, Math.max(A.x, 0) + 44, 10], foot: [-4, 4, 6], draw: B => { const r = kit.rng(77);
        const post = (x, y, h) => { B.shadow(x + 2, y + 1, 7, 2.4, .4); B.f(B.rect(x - 3, y - h, 6, h), '#6e5638').f(B.rect(x - 3, y - h, 2, h), '#9c7e56', .85).f(B.ell(x, y - h, 3, 1.2), snowy ? '#fbfbf7' : '#4e3c28'); if (!snowy) B.tufts(r, x, y + 1, 12, 5, ['#8c9a5e', '#c2c78e'], 5); };
        post(A.x, A.y, 30); post(0, 0, 30);
        // the handline, sagging between the posts, lashed round each with a few turns, its tail coiled at the foot
        const mx = A.x / 2 - 3, my = A.y / 2 - 12; B.s(`M${A.x} ${A.y - 24}Q${mx} ${my} 0 -24`, '#5e4a2c', 3, .95).s(`M${A.x} ${A.y - 24.8}Q${mx} ${my - .8} 0 -24.8`, '#d8c08a', 1.2, .95);
        for (const [x, y] of [[A.x, A.y - 24], [0, -24]]) for (let k = 0; k < 3; k++) B.s(`M${x - 3.4} ${y - 2 + k * 1.6}l6.8 1`, '#c8ae78', 1.3, .95);
        B.s('M0 -22q6 8 2 20', '#5e4a2c', 2.4, .9); B.f(B.ell(7, 0, 8, 3), '#5e4a2c', .9).f(B.ell(7, -.6, 5.4, 1.8), '#c8ae78', .9).f(B.ell(7, -.6, 2.4, .8), '#5e4a2c', .9);
        // the fingerpost at the top: one arm up the way to the col
        const fx = A.x - 14, fy = A.y + 2; B.shadow(fx + 2, fy + 1, 6, 2, .4); B.f(B.rect(fx - 2.2, fy - 50, 4.4, 50), '#7a6248').f(B.rect(fx - 2.2, fy - 50, 1.4, 50), '#a88c62', .8);
        B.f(B.poly([[fx - 2, fy - 47], [fx + 34, fy - 47], [fx + 40, fy - 42.5], [fx + 34, fy - 38], [fx - 2, fy - 38]]), '#c9a876').s(B.poly([[fx - 2, fy - 47], [fx + 34, fy - 47], [fx + 40, fy - 42.5], [fx + 34, fy - 38], [fx - 2, fy - 38]]), '#6e5434', .8, .9);
        B.text('Cloudbreak', fx + 18, fy - 40.6, 6.4, '#3e2c1a'); if (snowy) B.f(B.rect(fx - 2, fy - 49, 36, 2), '#fbfbf7', .9);
      } });
    }
  }
  if (V && V.parts) V.parts.push({ id: 'cloudbreak', compose(C) { compose(C); stairRopes(C); lipWater(C); passRope(C); } });

  // with painting off, the classic drawings stand in (the woodcutter's hut, the market cross, a gate): never an empty block
  if (typeof _GLD_PROP_ART !== 'undefined') { const A = _GLD_PROP_ART; if (A.smoke && !A.bothy) A.bothy = A.smoke; if (A.cross && !A.toposcope) A.toposcope = A.cross; if (A.gate && !A.moorgate) A.moorgate = A.gate; }
  /* ---------- the three new landmarks (GardenPaintedMarks' table) ---------- */
  const MK = window.GardenPaintedMarks; if (!MK || !MK.ART) return;
  // the bothy: a roofless shepherds' shelter of fell stone, two gable ends standing, the side walls broken down to waist
  // height, a doorway in the front with a lintel, a hearth stone and a few roof slates in the grass
  MK.ART['ld-bothy'] = { box: [-84, -186, 84, 16], door: { dx: 0, dy: 0 }, draw(B, o) {
    // seen gable end on (its ridge runs north, away from you): the front gable whole, with the doorway and a window hole;
    // the side walls running back from its corners, their heads broken and turfed; the back gable's peak standing behind
    // the empty roof space. Eaves 1.8 H, the gables' peaks 3.2 H (rule 14), on its three cells.
    const kit = KIT(), r = kit.rng(71), snowy = o.season === 'winter', eaves = -H * 1.8, ridge = -H * 3.2, w = 64, D = 34;
    const tones = ['#a49a86', '#9c927f', '#aaa08c', '#8e8472'], shade = ['#7a7162', '#6a6254', '#857b6a', '#726a5c'];
    const course = (clip, x0, x1, top, base, tone) => { B.cx.save(); B.cx.clip(new Path2D(B.poly(clip))); B.f(B.poly(clip), tone[1]);
      for (let y = base, row = 0; y > top; row++) { const rh = 4.2 + r() * 2; for (let x = x0 - (row % 2) * 4; x < x1; ) { const sw = 7 + r() * 6; B.f(B.rr(x + .4, y - rh + .4, sw - .9, rh - .8, 1.4), tone[Math.floor(r() * tone.length)]).f(B.rect(x + 1, y - rh + .5, Math.max(0, sw - 3), .9), '#ddd3bb', .3); x += sw; } y -= rh; }
      B.cx.restore(); };
    B.shadow(4, 2, w + 12, 12, .34);
    // the back gable, in shade, seen over the roofless middle
    const back = [[-w + 4, eaves - D], [0, ridge - D], [w - 4, eaves - D], [w - 4, eaves - D + 26], [-w + 4, eaves - D + 26]];
    course(back, -w, w, ridge - D, eaves - D + 26, shade);
    // the side walls' heads running back from the front corners to the back gable, turf on them
    for (const sg of [-1, 1]) { const x = sg * (w - 6); const band = [[x - 6, eaves + 2], [x + 6, eaves + 2], [x + 6 - sg * 2, eaves - D + 2], [x - 6 - sg * 2, eaves - D + 2]];
      course(band, x - 8, x + 8, eaves - D, eaves + 2, sg < 0 ? tones : shade); if (!snowy) B.f(B.blob(r, x, eaves - D / 2, 6, D / 2, 7, .5), '#7d8f4e', .55); }
    // the inside, dark, seen through the doorway and above the front wall's broken middle
    B.f(B.poly([[-w + 10, eaves], [0, ridge + 10], [w - 10, eaves], [w - 10, eaves + 10], [-w + 10, eaves + 10]]), '#4a443a', .5);
    // the front gable
    const front = [[-w, 0], [-w, eaves], [-4, ridge], [4, ridge], [w, eaves], [w, 0]];
    course(front, -w, w, ridge, 0, tones);
    B.s(B.poly([[-w, eaves], [-4, ridge], [4, ridge], [w, eaves]]), '#d6ccb4', 1.6, .55);
    for (const [x, y] of [[-w, eaves], [w - 8, eaves]]) B.f(B.rr(x, y - 3, 8, 6, 1), '#b4aa94');   // kneelers
    // the doorway with its lintel, the hearth's glow inside; a small window hole up in the gable
    const dh = H * 1.25;
    B.f(B.rect(-14, -dh, 28, dh), '#2a2620').f(B.rect(-9, -12, 18, 12), '#4a3e30', .8).f(B.rect(-5, -9, 10, 4), '#9a4a2a', .3);
    B.f(B.rr(-19, -dh - 8, 38, 9, 2), '#b4aa94').f(B.rect(-18, -dh - 8, 36, 2), '#e0d6be', .7);
    B.f(B.rect(-7, eaves - 22, 14, 14), '#2a2620').f(B.rr(-9, eaves - 10, 18, 4, 1), '#b4aa94');
    // turf and moss on the gable's shoulders, fallen slates and stones in the grass, a rowan seedling by the door
    if (!snowy) for (let k = 0; k < 6; k++) { const t = r(), sg = k % 2 ? -1 : 1; B.f(B.blob(r, sg * (w - t * w), eaves + (ridge - eaves) * t - 1, 5 + r() * 5, 1.8, 6, .5), k % 3 ? '#7d8f4e' : '#93a660', .85); }
    else B.s(B.poly([[-w, eaves], [-4, ridge], [4, ridge], [w, eaves]]), STONE.snow, 3, .9);
    // the foot: big footing stones along the wall's base, set into the ground (a dark line where they meet the turf)
    for (let x = -w - 2; x < w; ) { const sw = 9 + r() * 8; if (x + sw < -16 || x > 14) slab(B, r, x + sw / 2, 2, sw, 5 + r() * 2, snowy); x += sw; }
    B.f(B.blob(r, 0, 4, w + 10, 3.4, 9, .3), '#3a3a2c', .22);
    // nettles and fern in the angles of the walls, a worn hollow at the door, a few fallen slates lying flat at angles
    if (!snowy) for (const sg of [-1, 1]) { const x0 = sg * (w + 4); for (let k = 0; k < 7; k++) { const x = x0 + (r() - .5) * 14, hh = 8 + r() * 10; B.s('M' + x + ' 3q' + sg * 2 + ' ' + (-hh * .6) + ' ' + sg * 4 + ' ' + (-hh), k % 2 ? '#4e6a32' : '#6a8a40', 1.4, .9); B.f(B.ell(x + sg * 4, 3 - hh, 3, 1.3), '#5e7e3a', .9); } }
    B.f(B.ell(0, 4, 18, 4), '#6a5a42', .45).f(B.ell(0, 3.6, 12, 2.4), '#8a7656', .4);
    for (let k = 0; k < 4; k++) { const x = (k < 2 ? -1 : 1) * (24 + r() * 30), y = 7 + r() * 4, a = (r() - .5) * .8, c = Math.cos(a), sn = Math.sin(a), tr = ([px, py]) => [x + px * c - py * sn, y + px * sn * .4 + py];
      B.f(B.poly([[-6, -2], [6, -2.6], [6.6, 2], [-5.4, 2.4]].map(tr)), '#5a6268', .85).f(B.poly([[-6, -2], [6, -2.6], [6, -1.4], [-6, -.8]].map(tr)), '#8a949a', .7); }
    if (!snowy) B.tufts(r, 0, 4, w * 2 + 30, 16, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 8);
  } };
  // Cloudbreak's landmarks at the sizes rule 14 asks, measured against H: the hut's ridge 3.2 H, the standing stones 2.2 H,
  // the cairn 2.6 H, the beacon 3.4 H (their pictures are GardenPaintedMarks' own, grown here from the foot up, kept within
  // their footprints across); the warren's bank drawn on its own cell, not hanging below it
  const GROW = { 'ld-hut': [1.18, 1.34], 'ld-stones': [1, 2], 'ld-beacon': [1.2, 1.48], 'ld-warren': [1, 1, -10] };
  if (MK.ART['ld-cairn']) MK.ART['ld-cairn'] = { box: [-50, -H * 2.6 - 16, 54, 14], draw(B, o) { cairnPile(B, KIT().rng(31), H * 2.6, 40, o.season === 'winter'); } };
  for (const [id, [sx, sy, dy]] of Object.entries(GROW)) {
    const a = MK.ART[id]; if (!a || a._grown) continue;
    const d = a.draw, up = dy || 0;
    a.box = [a.box[0] * sx, a.box[1] * sy + up, a.box[2] * sx, a.box[3] * sy + up];
    if (a.door) a.door = { dx: a.door.dx * sx, dy: a.door.dy };
    a.draw = function (B, o) { B.cx.save(); B.cx.translate(0, up); B.cx.scale(sx, sy); d.call(this, B, o); B.cx.restore(); };
    a._grown = true;
  }
  // the toposcope: a round stone pillar at waist height, a brass plate on top engraved with the view, a little verdigris
  MK.ART['ld-toposcope'] = { box: [-24, -50, 26, 10], draw(B, o) {
    const kit = KIT(), r = kit.rng(73), snowy = o.season === 'winter', top = -H * .8;
    B.shadow(4, 2, 20, 5, .32);
    B.f(B.rect(-11, top + 4, 22, -top - 4), B.lin(-11, 0, 11, 0, [[0, '#c6bca6'], [.5, '#a49a86'], [1, '#7a7162']]));
    for (let y = -6; y > top + 6; y -= 7) B.s(`M-11 ${y}h22`, '#6a6254', .7, .5);
    B.f(B.ell(0, top + 4, 15, 4.6), '#8a806e').f(B.ell(0, top + 2.6, 14, 4), snowy ? STONE.snow : '#c8a24a').f(B.ell(-3, top + 2, 7, 1.6), '#ecd27a', .7);
    if (!snowy) { B.s(`M-9 ${top + 2.6}h18M0 ${top - .8}v6.8`, '#7a5a1a', .6, .7); B.f(B.blob(r, 7, top + 3.6, 4, 1.2, 6, .4), '#5aa08a', .55); }
    B.tufts(r, 0, 1, 34, 8, ['#8c9a5e', '#c2c78e'], 5);
  } };
  // the moor's end gate: two stone gateposts in the last dry-stone wall, a weathered five-bar gate shut between them (seen
  // a little side on), the wall running off north and south, and the fingerpost: "The Long Road", pointing on west
  MK.ART['ld-moor-gate'] = { box: [-24, -122, 76, 12], draw(B, o) {
    const kit = KIT(), r = kit.rng(79), snowy = o.season === 'winter', postTop = -H * 1.3, gateTop = -H * 1.1;
    B.shadow(2, 0, 26, 7, .3);
    // the gateposts: squared stone, lit on the west face
    // (seen a little from the east, so its bars read as a gate across the gap, not as one line)
    const posts = MOOR_POSTS;
    B.f(B.poly([[posts[0][0], posts[0][1]], [posts[1][0], posts[1][1]], [posts[1][0] + 8, posts[1][1] + 3], [posts[0][0] + 8, posts[0][1] + 3]]), '#2e3420', .25);   // the gate's shadow on the road's end
    const post = ([x, y]) => B.f(B.rect(x - 6, y + postTop, 12, -postTop), '#a49a86').f(B.rect(x - 6, y + postTop, 3.6, -postTop), '#d6ccb6', .85).f(B.rect(x + 3, y + postTop, 3, -postTop), '#5e584c', .85).f(B.ell(x, y + postTop, 7, 2.6), '#8a806e').f(B.ell(x - 1, y + postTop - .8, 5, 1.6), snowy ? STONE.snow : '#b4aa94');
    post(posts[0]);
    // the gate: five bars and a brace hung between the posts, seen side on (it runs down the slope toward you)
    const gx0 = posts[0][0] + 5, gy0 = posts[0][1] + 2, gx1 = posts[1][0] - 4, gy1 = posts[1][1] - 2;   // (the gate fills the gap in the last wall, post to post: shut)
    for (let k = 0; k < 5; k++) { const h = 4 + k * (-gateTop - 6) / 4; B.s(`M${gx0} ${gy0 - h}L${gx1} ${gy1 - h}`, '#3a2e22', 5.6, .7).s(`M${gx0} ${gy0 - h}L${gx1} ${gy1 - h}`, k === 4 ? '#ecdcb0' : '#d4b888', 4, 1); }
    B.s(`M${gx0} ${gy0 - 4}L${gx1} ${gy1 + gateTop + 2}`, '#8a7050', 2.6, .95);
    for (const t of [.06, .94]) { const x = gx0 + (gx1 - gx0) * t, y = gy0 + (gy1 - gy0) * t; B.s(`M${x} ${y - 4}v${gateTop + 2}`, '#a88c62', 3, 1); }   // the gate's two stiles
    // shut and tied: a loop of rope from the gate's end stile round the front post, and a latch bar
    B.s(`M${gx1 - 1} ${gy1 + gateTop * .55}q5 3 9 -1q-4 -5 -9 -2`, '#c8b078', 1.8, 1).f(B.rect(gx1 - 3, gy1 + gateTop * .7, 7, 2.4), '#3a3a38', .9);
    post(posts[1]);
    // the fingerpost on the moor side, east of the gate and clear of its posts, one arm pointing west: THE LONG ROAD
    const fx = 62, fTop = -H * 2.2;   // (its arm above the gate's top rail, not across it)
    B.f(B.rect(fx - 2.4, fTop, 4.8, -fTop), WOOD[0]).f(B.rect(fx - 2.4, fTop, 1.4, -fTop), WOOD[2], .7).f(B.ell(fx, 0, 5, 1.6), '#5e584c', .5);
    const arm = [[fx + 3, fTop + 6], [fx - 26, fTop + 6], [fx - 31, fTop + 11.5], [fx - 26, fTop + 17], [fx + 3, fTop + 17]];
    B.f(B.poly(arm), '#ece2c8').s(B.poly(arm), '#5e4a34', 1, .8);
    B.text('THE LONG ROAD', fx - 13, fTop + 11.8, 4.6, '#3a2c1e');
    if (snowy) B.f(B.rect(fx - 27, fTop + 4.4, 30, 2), STONE.snow, .95);
    if (!snowy) B.tufts(r, -2, 0, 40, 14, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6);
  } };
})();
