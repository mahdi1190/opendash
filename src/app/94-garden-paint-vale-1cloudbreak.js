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
    B.f(B.rect(-w / 2 + 3, -len - 2, w + (len ? 6 : 0), len + 6), '#2e3420', .2);
    B.f(B.rect(-w / 2, -len - h, w, len + h), '#7c7366');
    for (let y = -2.5, row = 0; y > -len - h + 2; y -= 4.6, row++) for (let x = -w / 2 + 2 + (row % 2) * 3; x < w / 2 - 1; x += 6 + r() * 3) B.stone(r, x + (r() - .5), y + (r() - .5), 3.4 + r() * 1.8, 2.3 + r() * .5, STONE, snowy ? 'snow' : null);
    B.f(B.rect(-w / 2 - 1, -len - h - 1.5, w + 2, 3.2), snowy ? STONE.snow : '#8a9a52', .75);
    if (!snowy) for (let k = 0; k < Math.max(2, w / 14); k++) B.f(B.blob(r, -w / 2 + r() * w, -len - h, 3 + r() * 4, 1.4, 6, .5), k % 2 ? '#7d8f4e' : '#a9b86a', .9);
    if (!snowy) B.tufts(r, 0, 1, w + 8, 5, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 5);
  }
  const W_COLS = C => (C.W && C.W.cols) || 96;
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
    // the Cloudbreak Way is laid stone, the one road up here: broad flags, worn and mossed, a dark joint at its edge
    const way = L.routes.get('pass-summit');
    if (way && way.points && way.points.length > 1) {
      const rib = V.routeRibbon(L, way, false), bb = kit.bboxOf(rib, 8), seed = kit.hashStr('cloudbreak-way');
      const PS = Object.assign({}, C.P, { stone: '#b7b09e', stoneLo: '#9c9583', stoneHi: '#d2cbb6', grout: '#6e6a5c' });
      C.add(bb, seed, (B, r) => { const path = new Path2D(B.poly(rib)); B.cx.filter = 'blur(3px)'; B.f(path, '#2e3420', .2); B.cx.filter = 'none'; B.cx.save(); B.cx.clip(path); V.flags(B, r, PS, bb, { row: 13, w: 25, salt: seed, broken: .05, moss: .2 }); B.cx.restore(); B.s(path, '#5e5a4e', 2.2, .55); });
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
    // the moor road ends at its gate (ld-moor-gate); you stop at the stones, not in open heather at the map's edge
    const H9 = H * .9, mg = L.stat('ld-moor-gate');
    if (mg) for (let row = 0; row <= 18; row++) {
      if (row >= mg.y && row < mg.y + mg.h) continue;
      const b = L.base(1, row); if (!b || !b.land || b.freshwater) continue;
      const p = L.cpt(mg.x + .25, row + 1);
      thing({ key: 'moor-wall-' + row + '|' + C.season, x: p.x, y: p.y, box: [-14, -32 - H9 - 4, 22, 8], foot: [-10, 10, 30], draw: B => wallRun(B, kit.rng(970 + row), 18, 30, H9, snowy) });
    }
    // the march wall along the fells' north edge (row 0): you stop at an old boundary wall, not in the sky's haze.
    // (feat/art3-highlands paints its own march wall in the fells painter; when that lands, this run is dropped: set window.__fellsMarchWall)
    if (!window.__fellsMarchWall) for (let x = 0; x < W_COLS(C); x += 2) {
      const b = L.base(x + 1, 0); if (!b || !b.land || b.freshwater || (b.zone !== undefined && b.zone !== 5)) continue;
      const p = L.cpt(x + 1, .55);
      thing({ key: 'march-wall-' + x + '|' + C.season, x: p.x, y: p.y, box: [-52, -H9 - 6, 52, 8], foot: [-49, 49, 14], draw: B => wallRun(B, kit.rng(990 + x), 98, 0, H9, snowy) });
    }
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
  MK.ART['ld-bothy'] = { box: [-80, -150, 80, 10], door: { dx: 0, dy: 0 }, draw(B, o) {
    const kit = KIT(), r = kit.rng(71), snowy = o.season === 'winter', eaves = -H * 1.8, ridge = -H * 3.2;   // (rule 14: a cottage's eaves 1.8 H, its gables to 3.2 H)
    B.shadow(6, 2, 74, 10, .34);
    B.cx.save(); B.cx.scale(.9, 1);   // (the walls stand within the bothy's three cells, so its feet stop at the stone)
    const course = (x0, x1, top, base, tone) => { for (let y = base - 5; y > top; y -= 6) for (let x = x0 + ((Math.round(y) / 6) % 2 ? 4 : 0); x < x1 - 2; x += 8 + r() * 4) { const w = Math.min(8 + r() * 4, x1 - x); B.f(B.rr(x, y - 5, w - 1, 5.2, 1.6), tone[Math.floor(r() * tone.length)]); } };
    const tones = ['#9c927f', '#8a806e', '#aaa08c', '#7c7364'], shade = ['#7a7162', '#6a6254', '#857b6a'];
    // the back wall (seen over the broken front), the far gable
    B.f(B.rect(-70, eaves - 6, 140, 30), '#6a6254', .9); course(-70, 70, eaves - 6, eaves + 24, shade);
    // the west and east gables, end on: triangles of coursed stone with a shadowed inner face
    for (const sgn of [-1, 1]) {
      const x0 = sgn < 0 ? -76 : 62, x1 = x0 + 14;
      // the gable's side wall seen running back from it (its outer face, a band of coursed stone to the back wall), so the ends read as walls, not posts
      B.f(B.rect(sgn < 0 ? x1 : x0 - 10, eaves + 2, 10, -eaves - 2), sgn < 0 ? '#8e8472' : '#6e6658', .95); course(sgn < 0 ? x1 : x0 - 10, (sgn < 0 ? x1 : x0 - 10) + 10, eaves + 2, 0, shade);
      B.f(B.poly([[x0, 0], [x0, eaves], [sgn < 0 ? x1 : x0, ridge], [sgn < 0 ? x1 : x0 + 14, eaves], [x1, 0]]), sgn < 0 ? '#a49a86' : '#7e7566');
      course(x0, x1, ridge + 8, 0, sgn < 0 ? tones : shade);
      B.s(`M${x0} ${eaves}L${sgn < 0 ? x1 : x0} ${ridge}`, '#c6bca6', 1.4, .7);
    }
    // the front wall, broken down to waist height either side of the doorway
    const waist = -H * .55;
    B.f(B.poly([[-62, 0], [-62, waist - 4], [-48, waist + 2], [-30, waist - 6], [-14, waist], [-14, 0]]), '#a0967f'); course(-62, -14, waist - 6, 0, tones);
    B.f(B.poly([[14, 0], [14, waist - 2], [30, waist + 4], [46, waist - 4], [62, waist + 2], [62, 0]]), '#948a76'); course(14, 62, waist - 4, 0, shade);
    // the doorway: jambs and a lintel stone, the dark inside and the hearth glimpsed through it
    B.f(B.rect(-14, -H * 1.1, 28, H * 1.1), '#2e2a24').f(B.rect(-10, -14, 20, 14), '#4a3e30', .8).f(B.rect(-6, -10, 12, 4), '#9a4a2a', .25);
    B.f(B.rr(-18, -H * 1.1 - 7, 36, 8, 2), '#b4aa94').f(B.rect(-17, -H * 1.1 - 7, 34, 2), '#d6ccb4', .8);
    for (const x of [-16, 12]) B.f(B.rect(x, -H * 1.1, 4, H * 1.1), '#8a806e');
    // moss and turf on the wall heads, a few slates and stones fallen in the grass
    for (let k = 0; k < 8; k++) B.f(B.blob(r, -60 + r() * 120, waist - 4 + r() * 4, 6 + r() * 6, 2 + r() * 1.4, 6, .5), snowy ? STONE.snow : k % 2 ? '#7d8f4e' : '#93a660', .9);
    for (let k = 0; k < 5; k++) B.f(B.poly([[0, 0], [9, -1], [10, 3], [1, 4]].map(([x, y]) => [x - 70 + r() * 130, y - 5 + r() * 2])), '#5a6268', .9);
    for (let k = 0; k < 4; k++) B.stone(r, -70 + r() * 140, -3 + r() * 2, 3 + r() * 2.4, 2 + r(), STONE, snowy ? 'snow' : null);
    if (!snowy) B.tufts(r, 0, 0, 150, 26, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 7);
    B.cx.restore();
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
  MK.ART['ld-moor-gate'] = { box: [-30, -96, 30, 8], draw(B, o) {
    const kit = KIT(), r = kit.rng(79), snowy = o.season === 'winter', postTop = -H * 1.3, gateTop = -H * 1.1;
    B.shadow(2, 0, 26, 7, .3);
    // the last wall: rough coursed stones running up the slope (north) behind the gate and down to its foot in front
    const wall = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; for (let k = 0; k < 4; k++) B.stone(r, x + (r() - .5) * 2, y - 3 - k * 6.2, 3.8 + r() * 1.4, 2.8 + r() * .8, STONE, snowy && k === 3 ? 'snow' : k === 3 && r() < .4 ? STONE.lichen : null); } };
    wall(-14, -58, -10, -40);
    // the gateposts: squared stone, lit on the west face
    for (const [x, y] of [[-9, -36], [-3, -6]]) { B.f(B.rect(x - 4, y + postTop, 8, -postTop), '#a49a86').f(B.rect(x - 4, y + postTop, 2.6, -postTop), '#d0c6b0', .8).f(B.rect(x + 2, y + postTop, 2, -postTop), '#6a6254', .8).f(B.ell(x, y + postTop, 4.6, 1.8), '#8a806e'); }
    // the gate: five bars and a brace hung between the posts, seen side on (it runs down the slope toward you)
    const gx0 = -7, gy0 = -34, gx1 = -5, gy1 = -8;
    for (let k = 0; k < 5; k++) { const h = 4 + k * (-gateTop - 6) / 4; B.s(`M${gx0} ${gy0 - h}L${gx1} ${gy1 - h}`, k === 4 ? WOOD[2] : WOOD[0], 2.2, .98); }
    B.s(`M${gx0} ${gy0 - 4}L${gx1} ${gy1 + gateTop + 2}`, WOOD[1], 1.8, .9);
    wall(-4, -4, -2, 0);
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
