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
  function openAt(L, x, y) {
    const b = L.base(Math.floor(x), Math.floor(y));
    if (!b || !b.land || b.freshwater || b.route || b.solid || b.landformId || b.staticId || b.beach) return false;
    return !L.plot(x, y);
  }
  /** The nearest spot to (x, y) whose foot (half width hw, cells) stands on open turf, within about a cell and a half. */
  function settle(L, x, y, hw) {
    const fits = (px, py) => openAt(L, px, py) && openAt(L, px - hw, py) && openAt(L, px + hw, py) && openAt(L, px, py - .3);
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
    for (const x of [-w + 6, w - 6]) { B.f(B.rect(x - 4, seat, 8, -seat), '#8a8272').f(B.rect(x - 4, seat, 2.4, -seat), '#b4ac98', .8).f(B.rect(x + 2, seat, 2, -seat), '#5e584c', .7); }
    B.f(B.rr(-w, seat - 4, w * 2, 5, 1.6), WOOD[0]).f(B.rect(-w + 1, seat - 4, w * 2 - 2, 1.4), snowy ? STONE.snow : WOOD[2], .9).f(B.rect(-w, seat, w * 2, 1.4), WOOD[1], .8);
    if (!snowy) B.tufts(r, 0, 1, 70, 10, ['#8c9a5e', '#c2c78e'], 5);
  }
  function picnicRock(B, r, snowy) {
    B.boulder(r, 0, 0, 46, 15, STONE, snowy);
    if (!snowy) B.tufts(r, 0, 1, 56, 10, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6);
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
      const rock = /rock/.test(s.what), at = settle(L, s.at[0], s.at[1], rock ? .5 : .65); if (!at) return;
      const p = L.cpt(at[0], at[1]);
      thing({ key: 'fell-seat-' + i + '|' + C.season, x: p.x, y: p.y, box: rock ? [-30, -24, 32, 8] : [-36, -H * .3 - 12, 38, 8], foot: rock ? [-22, 22, 8] : [-30, 30, 6], draw: B => (rock ? picnicRock : bench)(B, kit.rng(950 + i), snowy) });
    });
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
  MK.ART['ld-bothy'] = { box: [-84, -124, 84, 12], door: { dx: 0, dy: 0 }, draw(B, o) {
    const kit = KIT(), r = kit.rng(71), snowy = o.season === 'winter', eaves = -H * 1.5, ridge = -H * 2.6;
    B.shadow(6, 2, 82, 12, .34);
    const course = (x0, x1, top, base, tone) => { for (let y = base - 5; y > top; y -= 6) for (let x = x0 + ((Math.round(y) / 6) % 2 ? 4 : 0); x < x1 - 2; x += 8 + r() * 4) { const w = Math.min(8 + r() * 4, x1 - x); B.f(B.rr(x, y - 5, w - 1, 5.2, 1.6), tone[Math.floor(r() * tone.length)]); } };
    const tones = ['#9c927f', '#8a806e', '#aaa08c', '#7c7364'], shade = ['#7a7162', '#6a6254', '#857b6a'];
    // the back wall (seen over the broken front), the far gable
    B.f(B.rect(-70, eaves - 6, 140, 30), '#6a6254', .9); course(-70, 70, eaves - 6, eaves + 24, shade);
    // the west and east gables, end on: triangles of coursed stone with a shadowed inner face
    for (const sgn of [-1, 1]) {
      const x0 = sgn < 0 ? -76 : 62, x1 = x0 + 14;
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
    for (let k = 0; k < 5; k++) B.f(B.poly([[0, 0], [9, -1], [10, 3], [1, 4]].map(([x, y]) => [x - 70 + r() * 140, y + 4 + r() * 4])), '#5a6268', .9);
    for (let k = 0; k < 4; k++) B.stone(r, -74 + r() * 148, 4 + r() * 4, 3 + r() * 2.4, 2 + r(), STONE, snowy ? 'snow' : null);
    if (!snowy) B.tufts(r, 0, 2, 170, 26, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 7);
  } };
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
  MK.ART['ld-moor-gate'] = { box: [-58, -96, 58, 10], draw(B, o) {
    const kit = KIT(), r = kit.rng(79), snowy = o.season === 'winter', postTop = -H * 1.3, gateTop = -H * 1.1;
    B.shadow(4, 2, 50, 8, .3);
    // the wall: rough coursed stones running up and down the slope behind and in front of the posts, a cope of on-edge stones
    const wall = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 7); for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; for (let k = 0; k < 4; k++) B.stone(r, x + (r() - .5) * 3, y - 4 - k * 6.5, 4 + r() * 1.6, 3 + r() * .8, STONE, snowy && k === 3 ? 'snow' : k === 3 && r() < .4 ? STONE.lichen : null); } };
    wall(-8, -40, -6, -30); wall(-4, 4, 0, 10);
    // the gateposts: squared stone, lit on the west face
    for (const [x, y] of [[-10, -26], [-2, 2]]) { B.f(B.rect(x - 4, y + postTop, 8, -postTop), '#a49a86').f(B.rect(x - 4, y + postTop, 2.6, -postTop), '#d0c6b0', .8).f(B.rect(x + 2, y + postTop, 2, -postTop), '#6a6254', .8).f(B.ell(x, y + postTop, 4.6, 1.8), '#8a806e'); }
    // the gate: five bars and a brace, hung between the posts, seen side on (it runs down the slope toward you)
    const gx0 = -8, gy0 = -24, gx1 = -4, gy1 = 0;
    for (let k = 0; k < 5; k++) { const h = 4 + k * (-gateTop - 6) / 4; B.s(`M${gx0} ${gy0 - h}L${gx1} ${gy1 - h}`, k === 4 ? WOOD[2] : WOOD[0], 2.2, .98); }
    B.s(`M${gx0} ${gy0 - 4}L${gx1} ${gy1 + gateTop + 2}`, WOOD[1], 1.8, .9).s(`M${gx0 + 1} ${gy0 - 4}V${gy0 + gateTop + 2}M${gx1 - 1} ${gy1 - 4}V${gy1 + gateTop + 2}`, WOOD[1], 2, .9);
    // the fingerpost on the near side, one arm pointing west: THE LONG ROAD
    const fx = 26, fTop = -H * 1.9;
    B.f(B.rect(fx - 2.4, fTop, 4.8, -fTop), WOOD[0]).f(B.rect(fx - 2.4, fTop, 1.4, -fTop), WOOD[2], .7);
    B.f(B.poly([[fx + 2, fTop + 6], [fx - 44, fTop + 6], [fx - 50, fTop + 11.5], [fx - 44, fTop + 17], [fx + 2, fTop + 17]]), '#ece2c8').s(B.poly([[fx + 2, fTop + 6], [fx - 44, fTop + 6], [fx - 50, fTop + 11.5], [fx - 44, fTop + 17], [fx + 2, fTop + 17]]), '#5e4a34', 1, .8);
    B.text('THE LONG ROAD', fx - 22, fTop + 11.8, 6.4, '#3a2c1e');
    if (snowy) B.f(B.rect(fx - 46, fTop + 4.4, 48, 2), STONE.snow, .95);
    if (!snowy) B.tufts(r, 0, 2, 100, 18, ['#8c9a5e', '#c2c78e', '#7d8f4e'], 6);
  } };
})();
