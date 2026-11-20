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
  function wayCairn(B, r, h, snowy) {
    B.shadow(4, 1, 16, 4, .32);
    const rows = 4, base = 13;
    for (let row = 0; row < rows; row++) { const y = -3 - row * (h / rows), half = base * (1 - row / (rows + .6)); for (let x = -half; x <= half + .1; x += 6.5 + r() * 2) B.stone(r, x + (r() - .5) * 2, y + (r() - .5) * 1.5, 3.8 + r() * 1.8, 2.6 + r() * 1, STONE, snowy && r() < .5 ? 'snow' : r() < .3 ? STONE.lichen : null); }
    B.f(B.blob(r, 0, -h - 1, 4.4, 2, 6, .2), STONE.rockLo).f(B.blob(r, -.6, -h - 1.8, 3.6, 1.4, 6, .2), snowy ? STONE.snow : STONE.rockHi);
    if (!snowy) B.tufts(r, 0, 1, 34, 9, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
  }
  function bench(B, r, snowy) {
    // a plank seat on two stone legs, worn pale on top; turf round the legs
    const seat = -H * .3, w = 30;
    B.shadow(2, 1, 30, 5, .3);
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
  // a Scots pine on the fell (the plan's groups: the Moor Pines, the pair above the Edge, the one behind Wick's hut): a
  // straight bole, grey-brown and furrowed low, warm orange where it climbs into the crown; a broad, uneven crown of
  // dark needle masses over the top half, lit on their upper left, leaning a little with the wind
  function scotsPine(B, r, h, wpx, lean, snowy) {
    const tw = Math.max(5, h * .045), top = -h, cb = -h * .58, lx = lean * h * .05;
    B.shadow(8, 2, wpx * .42, 7, .3);
    B.f(B.poly([[-tw, 0], [tw, 0], [lx + tw * .5, top * .9], [lx - tw * .5, top * .9]]), B.lin(0, 0, 0, top, [[0, '#4e4034'], [.3, '#6a5038'], [.5, '#9a5e3e'], [1, '#b8744a']]));
    for (let y = -6; y > cb; y -= 7 + r() * 5) B.s(`M${-tw * .6 + lx * y / top} ${y}l${tw * .5} ${-3 - r() * 3}`, '#3a2e24', 1, .5);
    B.f(B.ell(0, -1, tw * 1.7, 2.6), '#3e3228', .8);
    // the crown: an umbrella of flat, tufted needle clouds over the top, wider than deep, the bole showing between them
    const n = 9, masses = [];
    for (let k = 0; k < n; k++) { const t = r(), y = cb + (top - cb) * (.15 + t * .85), spread = .5 - Math.abs(t - .55) * .45, x = lx * (.5 + t * .5) + (r() - .5) * 2 * wpx * spread * .7, rx = wpx * (.17 + r() * .1); masses.push({ x, y, rx, ry: rx * (.42 + r() * .1) }); }
    masses.sort((a, b) => b.y - a.y);
    const dark = snowy ? '#2c3e34' : '#1a2c24', body = snowy ? '#3e5446' : '#28432f', mid = snowy ? '#4e6656' : '#3a5a3c', lit = snowy ? '#f4f6f2' : '#6e8c52';
    for (const m of masses) B.f(B.blob(r, m.x + 3, m.y + 4, m.rx, m.ry, 9, .4), dark, .9);
    for (const m of masses) B.f(B.blob(r, m.x, m.y, m.rx * .96, m.ry * .92, 9, .4), body);
    for (const m of masses) B.f(B.blob(r, m.x - m.rx * .14, m.y - m.ry * .22, m.rx * .7, m.ry * .6, 8, .45), mid, .95);
    for (const m of masses) B.f(B.blob(r, m.x - m.rx * .3, m.y - m.ry * .42, m.rx * .38, m.ry * .3, 7, .5), lit, snowy ? .95 : .8);
    if (!snowy) B.tufts(r, 0, 1, tw * 6, 6, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
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
    if (way && way.points && way.points.length > 1) {
      const rib = V.routeRibbon(L, way, false), bb = kit.bboxOf(rib, 8), seed = kit.hashStr('cloudbreak-way');
      C.add(bb, seed, (B, r, cb) => { const path = new Path2D(B.poly(rib)), box = within(bb, cb, 30); if (!box) return; B.cx.save(); B.cx.clip(path); B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), snowy ? '#c8ccc4' : '#6e6b5a');
        slabs(B, box, { s: 24, cover: .99, salt: seed, tones: GREY, snowy, org: bb }); B.cx.restore(); B.s(path, '#4e4a40', 1.6, .45); });
    }
    // the other ways each in their own ground, so the fells are not one web of the same beige ribbon: the turf trails
    // (the Edge walk, Skylark path, the cove cliff path) a trodden line in the grass, the moor road dark peat with heather
    // at its edges, the stony lanes and trails scattered with fell stones
    const SURF = { turf: { base: '#a6b066', mid: '#c2b27e', a: .9 }, peat: { base: '#7a644a', mid: '#94785a', a: .85 } };
    for (const a of (L.D.routes || [])) {
      if (a.zone !== 5 || a.tier === 'plaza' || !a.points || a.points.length < 2 || a.id === 'pass-summit') continue;
      const o = SURF[a.surface], rib = V.routeRibbon(L, a, false), bb = kit.bboxOf(rib, 8), seed = kit.hashStr('way|' + a.id);
      C.add(bb, seed, (B, r, cb) => { const box = within(bb, cb, 20); if (!box) return; const path = new Path2D(B.poly(rib)); B.cx.save(); B.cx.clip(path);
        const K = KIT();
        if (o && !snowy) {
          B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), o.base, o.a);
          K.tiles(box, 40, 0, seed + 3, (tx, ty, rr) => { for (let k = 0; k < 5; k++) { const x = tx + rr() * 40, y = ty + rr() * 40; if (a.surface === 'turf') B.tufts(rr, x, y, 10, 4, ['#8c9a5e', '#b8c07a', '#7d8f4e'], 4); else B.f(B.blob(rr, x, y, 5 + rr() * 6, 1.6 + rr(), 6, .5), rr() < .5 ? '#5e4a36' : '#8e7458', .7); } });
          // the worn line feet keep to, down the middle
          const mid = new Path2D(B.poly(V.routeRibbon(L, Object.assign({}, a, { widths: a.widths.map(w => w * .38) }), false))); B.f(mid, o.mid, .75);
        }
        if (a.surface === 'stony') K.tiles(box, 34, 0, seed + 5, (tx, ty, rr) => { for (let k = 0; k < 2; k++) { const x = tx + rr() * 34, y = ty + rr() * 34, w = 3 + rr() * 5; B.f(B.ell(x + .8, y + 1.2, w, w * .5), '#4e4a40', .35).f(B.ell(x, y, w, w * .5), GREY[Math.floor(rr() * GREY.length)], .95).f(B.ell(x - w * .25, y - w * .15, w * .45, w * .2), '#e8e4d8', .4); } });
        B.cx.restore(); });
    }
    const TOP = { 'summit-cairn': { s: 40, cover: .86, base: '#8a9458' }, 'long-view': { s: 46, cover: .95, base: '#6e6b5a' }, 'falls-top': { s: 36, cover: .9, wet: true, base: '#5e5c50' }, 'wick-yard': { s: 22, cover: .99, base: '#6e6b5a' }, 'cloudbreak-col': { s: 24, cover: .99, base: '#6e6b5a' }, 'moor-end': { s: 30, cover: .7, base: '#7a6a4e', peat: true }, 'cove-shingle': null };
    for (const pz of L.pres.plazas || []) {
      const o = TOP[pz.id]; if (!o || !Array.isArray(pz.shape)) continue;
      const loop = V.shapeLoop(L, pz.shape), bb = kit.bboxOf(loop, 10), seed = kit.hashStr('top|' + pz.id);
      C.add(bb, seed, (B, r, cb) => { const path = new Path2D(B.poly(loop)), box = within(bb, cb, 30); if (!box) return; B.cx.save(); B.cx.clip(path);
        B.f(B.rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), snowy ? '#e8ece6' : o.base);
        if (!snowy) for (let k = 0; k < (bb[2] - bb[0]) * (bb[3] - bb[1]) / 1400; k++) B.tufts(r, bb[0] + r() * (bb[2] - bb[0]), bb[1] + r() * (bb[3] - bb[1]), 14, 5, o.peat ? ['#8a6a8a', '#7d8f4e'] : ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
        slabs(B, box, { s: o.s, cover: o.cover, salt: seed, tones: o.wet ? WET : o.peat ? PEAT : GREY, snowy, org: bb });
        B.cx.restore(); B.s(path, '#4e4a40', 1.6, .4); });
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
    if (mg) for (const [r0, r1, endFace] of [[1, mg.y, true], [mg.y + mg.h, 19, true]]) {
      const len = (r1 - r0) * L.ch, p = L.cpt(mg.x + .25, r1);
      thing({ key: 'moor-wall-' + r0 + '|' + C.season, x: p.x, y: p.y, K: 1.25, box: [-14, -len - H9 - 6, 24, 8], foot: [-10, 10, len], draw: B => wallRun(B, kit.rng(970 + r0), 20, Math.max(0, len - H9), H9, snowy) });
    }
    // the march wall along the fells' north edge (row 0): you stop at an old boundary wall, not in the sky's haze. One
    // picture and one foot along the whole run of fell land at the top of the map.
    // (feat/art3-highlands paints its own march wall in the fells painter; when that lands, this run is dropped: set window.__fellsMarchWall)
    if (!window.__fellsMarchWall) {
      let x0 = null, x1 = null; for (let x = 0; x < W_COLS(C); x++) { const b = L.base(x + .5, 0); const ok2 = b && b.land && !b.freshwater && (b.zone === undefined || b.zone === 5); if (ok2) { if (x0 === null) x0 = x; x1 = x + 1; } else if (x0 !== null) break; }
      if (x0 !== null) { const wpx = (x1 - x0) * L.cw, p = L.cpt((x0 + x1) / 2, .55);
        thing({ key: 'march-wall|' + C.season, x: p.x, y: p.y, K: 1, box: [-wpx / 2 - 4, -H9 - 6, wpx / 2 + 6, 8], foot: [-wpx / 2, wpx / 2, 14], draw: B => wallRun(B, kit.rng(990), wpx, 0, H9, snowy) }); }
    }
    // the plan's Scots pines, in their groups (each moved to open turf if the layout put it on a path or a plot)
    (M.trees || []).forEach((t, i) => {
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
  if (V && V.parts) V.parts.push({ id: 'cloudbreak', compose });

  // with painting off, the classic drawings stand in (the woodcutter's hut, the market cross, a gate): never an empty block
  if (typeof _GLD_PROP_ART !== 'undefined') { const A = _GLD_PROP_ART; if (A.smoke && !A.bothy) A.bothy = A.smoke; if (A.cross && !A.toposcope) A.toposcope = A.cross; if (A.gate && !A.moorgate) A.moorgate = A.gate; }
  /* ---------- the three new landmarks (GardenPaintedMarks' table) ---------- */
  const MK = window.GardenPaintedMarks; if (!MK || !MK.ART) return;
  // the bothy: a roofless shepherds' shelter of fell stone, two gable ends standing, the side walls broken down to waist
  // height, a doorway in the front with a lintel, a hearth stone and a few roof slates in the grass
  MK.ART['ld-bothy'] = { box: [-78, -186, 78, 10], door: { dx: 0, dy: 0 }, draw(B, o) {
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
    for (let k = 0; k < 5; k++) B.f(B.poly([[0, 0], [9, -1], [10, 3], [1, 4]].map(([x, y]) => [x - w - 6 + r() * (w * 2 + 6), y - 3 + r() * 3])), '#5a6268', .9);
    for (let k = 0; k < 4; k++) B.stone(r, -w - 8 + r() * (w * 2 + 16), -2 + r() * 3, 3 + r() * 2.4, 2 + r(), STONE, snowy ? 'snow' : null);
    if (!snowy) B.tufts(r, 0, 1, w * 2 + 24, 10, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 7);
  } };
  // Cloudbreak's landmarks at the sizes rule 14 asks, measured against H: the hut's ridge 3.2 H, the standing stones 2.2 H,
  // the cairn 2.6 H, the beacon 3.4 H (their pictures are GardenPaintedMarks' own, grown here from the foot up, kept within
  // their footprints across); the warren's bank drawn on its own cell, not hanging below it
  const GROW = { 'ld-hut': [1.18, 1.34], 'ld-stones': [1, 2], 'ld-cairn': [1.12, 1.85], 'ld-beacon': [1.2, 1.48], 'ld-warren': [1, 1, -10] };
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
  MK.ART['ld-moor-gate'] = { box: [-30, -110, 34, 10], draw(B, o) {
    const kit = KIT(), r = kit.rng(79), snowy = o.season === 'winter', postTop = -H * 1.3, gateTop = -H * 1.1;
    B.shadow(2, 0, 26, 7, .3);
    // the gateposts: squared stone, lit on the west face
    // (seen a little from the east, so its bars read as a gate across the gap, not as one line)
    const posts = [[-16, -50], [8, -4]];
    B.f(B.poly([[posts[0][0], posts[0][1]], [posts[1][0], posts[1][1]], [posts[1][0] + 8, posts[1][1] + 3], [posts[0][0] + 8, posts[0][1] + 3]]), '#2e3420', .25);   // the gate's shadow on the road's end
    const post = ([x, y]) => B.f(B.rect(x - 6, y + postTop, 12, -postTop), '#a49a86').f(B.rect(x - 6, y + postTop, 3.6, -postTop), '#d6ccb6', .85).f(B.rect(x + 3, y + postTop, 3, -postTop), '#5e584c', .85).f(B.ell(x, y + postTop, 7, 2.6), '#8a806e').f(B.ell(x - 1, y + postTop - .8, 5, 1.6), snowy ? STONE.snow : '#b4aa94');
    post(posts[0]);
    // the gate: five bars and a brace hung between the posts, seen side on (it runs down the slope toward you)
    const gx0 = -11, gy0 = -48, gx1 = 4, gy1 = -6;   // (the gate fills the gap in the last wall, post to post)
    for (let k = 0; k < 5; k++) { const h = 4 + k * (-gateTop - 6) / 4; B.s(`M${gx0} ${gy0 - h}L${gx1} ${gy1 - h}`, '#3a2e22', 4.4, .7).s(`M${gx0} ${gy0 - h}L${gx1} ${gy1 - h}`, k === 4 ? '#e0cca0' : '#c4a878', 3, 1); }
    B.s(`M${gx0} ${gy0 - 4}L${gx1} ${gy1 + gateTop + 2}`, '#8a7050', 2.6, .95);
    for (const t of [.06, .94]) { const x = gx0 + (gx1 - gx0) * t, y = gy0 + (gy1 - gy0) * t; B.s(`M${x} ${y - 4}v${gateTop + 2}`, '#a88c62', 3, 1); }   // the gate's two stiles
    post(posts[1]);
    // the fingerpost by the gate's foot, one arm pointing west, on into the hills: THE LONG ROAD
    const fx = 14, fTop = -H * 1.9;
    B.f(B.rect(fx - 2.4, fTop, 4.8, -fTop), WOOD[0]).f(B.rect(fx - 2.4, fTop, 1.4, -fTop), WOOD[2], .7).f(B.ell(fx, 0, 5, 1.6), '#5e584c', .5);
    const arm = [[fx + 2, fTop + 6], [fx - 40, fTop + 6], [fx - 46, fTop + 11.5], [fx - 40, fTop + 17], [fx + 2, fTop + 17]];
    B.f(B.poly(arm), '#ece2c8').s(B.poly(arm), '#5e4a34', 1, .8);
    B.text('THE LONG ROAD', fx - 20, fTop + 11.8, 6, '#3a2c1e');
    if (snowy) B.f(B.rect(fx - 42, fTop + 4.4, 44, 2), STONE.snow, .95);
    if (!snowy) B.tufts(r, -2, 0, 40, 14, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6);
  } };
})();
