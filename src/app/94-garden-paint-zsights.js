/* Sights, round 2, the rest: the everyday fixtures of the village (the post box, the notice board, the field journal,
 * the crafting bench, the sundial, the lake board, the camera, the mooring post, the smoker), the lamps, benches and
 * way posts, and the sights that still had a flat older drawing (the milk stand, the frog stone, the grotto's mouth in its
 * rock face, the hill stones, the beacon, the cairn), painted in the same brush as 94-garden-paint-terrain-5sights.js and
 * sized against H (docs/dev/PAINT_KIT.md, "Scale"). The file sorts after every painter that registers a sight
 * (the coast and orchard painters among them), so these rows win. Each keeps its footprint, its door and what blocks
 * walking; each stands in its own seat (GardenPaintSeat). Nothing runs at load. */
(function () {
  'use strict';
  const M = window.GardenPaintedMarks; if (!M || !M.ART || !M.SIGHT_KIT) return;
  const KIT = () => window.GardenPaintTerrainKit;
  const { ashlar, mossOn, ivy, windowLit, leaf, grass, sz, STONE, MOSSY, OAK, WOOD, IRON, rubble, arch, ferns } = M.SIGHT_KIT;
  const A = M.ART;
  const H = typeof GARDEN_H !== 'undefined' ? GARDEN_H : 41;
  const SLATE = ['#5d666c', '#4a5258', '#7d878c', '#363e44'];
  const FELL = { rock: '#a29a88', rockLo: '#7a7264', rockHi: '#cdc4ae', rockDk: '#46423a', lichen: '#cfc78a', snow: '#fbfbf7' };
  const lichenDots = (B, r, x, y, w, h, n, s) => { for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, k = .8 + r() * 1.8, c = s === 'winter' ? '#e8ece6' : r() < .55 ? '#c4bc84' : '#98a474'; B.f(B.blob(r, px, py, k * 1.5, k, 6, .55), c, .42).f(B.blob(r, px - k * .3, py - k * .2, k * .6, k * .4, 5, .5), '#e4dcb0', .3); } };
  // a shingled pitch between two eaves points and a ridge point, mossed a little, lit from the west
  function shingleRoof(B, r, x0, x1, eave, ridge, s, o) {
    o = o || {}; const mid = (x0 + x1) / 2, tone = o.tone || ['#6e5440', '#4e3a2a', '#9a7656', '#2e2218'];
    B.f(B.poly([[x0 - 3, eave + 2], [mid, ridge], [x1 + 3, eave + 2], [x1, eave + 4], [x0, eave + 4]]), tone[3]);
    B.f(B.poly([[x0, eave], [mid, ridge + 1], [mid, eave + 1]]), tone[2]).f(B.poly([[x1, eave], [mid, ridge + 1], [mid, eave + 1]]), tone[0]);
    for (let k = 1; k < 6; k++) { const t = k / 6, y = eave + (ridge - eave) * t; B.s(`M${x0 + (mid - x0) * t} ${y}L${mid} ${y + (eave - ridge) * .04}`, tone[1], .7, .55).s(`M${x1 - (x1 - mid) * t} ${y}L${mid} ${y + (eave - ridge) * .04}`, tone[1], .7, .55); for (let x = x0 + (mid - x0) * t; x < x1 - (x1 - mid) * t; x += 3.4 + r() * 2) B.s(`M${x} ${y}l0 ${(eave - ridge) / 6}`, tone[1], .4, .3); }
    if (s !== 'winter') for (let i = 0; i < (o.moss || 3); i++) B.f(B.blob(r, x0 + 6 + r() * (x1 - x0 - 12), eave - 2 - r() * (eave - ridge) * .5, 3 + r() * 3, 1.4, 6, .5), '#7d8f4e', .7);
    else B.f(B.poly([[x0 + 2, eave - 1], [mid, ridge + 1], [x1 - 2, eave - 1], [mid, ridge + 5]]), '#f4f6f2', .9);
    B.s(`M${x0 - 3} ${eave + 2}L${mid} ${ridge}L${x1 + 3} ${eave + 2}`, tone[2], 1.2, .8);
  }
  // a cylinder's light: lit to the west, deep on the east
  const drum = (B, x0, x1, c) => B.lin(x0, 0, x1, 0, [[0, c[0]], [.2, c[1]], [.55, c[2]], [.85, c[3]], [1, c[4]]]);

  /* ---------- the post box: a cast-iron pillar box at a little over the player's height, sunk in its flags ---------- */
  A['post-box'] = { box: [-18, -56, 24, 6], seat: { kind: 'flags', w: 22, front: 14 }, draw(B, o) {
    const r = KIT().rng(401), s = o.season, top = -H * 1.08, RED = ['#e47a62', '#d24c3a', '#b4342a', '#8a2219', '#5a140e'];
    // the plinth: a flared iron foot let into the flags, dark with grime
    B.f(`M-11 1L-10 -5H10L11 1Z`, IRON[0]).f(B.rect(-10, -6, 20, 1.4), IRON[1]);
    // the drum, its band, the door's outline and keyhole
    B.f(B.rect(-8.5, top + 10, 17, -top - 15), drum(B, -8.5, 8.5, RED));
    B.f(B.rect(-9.4, -10, 18.8, 4), drum(B, -9.4, 9.4, ['#c45a48', '#a83a2e', '#8e2a20', '#6a1c14', '#46100a']));
    B.s(`M-6.2 -12V${top + 26}H6.2V-12`, '#6e1a12', .6, .7).f(B.circ(4.4, -18, .7), '#2a0e0a');
    // the collar, the domed cap and its knob
    B.f(B.rect(-9.6, top + 7, 19.2, 3.6), drum(B, -9.6, 9.6, RED)).f(B.rect(-9.6, top + 10.4, 19.2, .8), '#5a140e', .7);
    B.f(`M-9.6 ${top + 7}Q-9.6 ${top - 1} 0 ${top - 1.6}Q9.6 ${top - 1} 9.6 ${top + 7}Z`, B.rad(-3, top + 1, 13, [[0, '#f09a80'], [.35, '#d4503c'], [1, '#7a1e16']]));
    B.f(B.ell(0, top - 1.8, 2.2, 1.2), '#a42c22').f(B.ell(-.6, top - 2.2, 1, .5), '#f4a890', .8);
    // the slot under its hood, the enamel plate of collection times
    B.f(B.rr(-6.2, top + 14, 12.4, 3.4, 1), '#8a2219').f(B.rr(-5.4, top + 15.4, 10.8, 1.6, .6), '#1a0a08');
    B.f(B.rr(-4.4, top + 20, 8.8, 6.4, .8), '#f2ecdc').s(`M-2.8 ${top + 22}h5.6M-2.8 ${top + 24}h4`, '#7a7466', .5);
    // years of paint: a lit streak, chips, a rust run under the slot, grime at the foot
    B.f(B.rect(-7.2, top + 11, 1.8, -top - 18), '#ffb8a0', .3);
    for (let i = 0; i < 7; i++) B.f(B.circ(-6 + r() * 12, top + 12 + r() * (-top - 20), .45), '#f4c8b8', .6);
    B.s(`M2 ${top + 17.6}q.4 4 -.2 7`, '#6a2a1a', .7, .5).f(B.rect(-8.5, -12, 17, 6), B.lin(0, -12, 0, -6, [[0, 'rgba(40,24,16,0)'], [1, 'rgba(40,24,16,.45)']]));
    // a dandelion and grass at its foot, a fallen letter's corner under it
    B.tufts(r, -11, 1, 6, 5, grass(s), 6).tufts(r, 12, 1, 6, 6, grass(s), 7);
    if (s !== 'winter') B.s('M14 1q1 -6 0 -10', '#5e8a3e', .8).f(B.circ(14, -10, 2), s === 'autumn' ? '#f2eee2' : '#f2c63a');
  } };

  /* ---------- the notice board: oak posts on stone pads, a shingled hood, a cork full of notes ---------- */
  A['notice-board'] = { box: [-56, -116, 56, 8], seat: { kind: 'earth', w: 84, front: 18 }, draw(B, o) {
    const r = KIT().rng(411), s = o.season, top = -96;
    // the stone pads the posts stand on, the posts themselves (split, weathered, lit on the west)
    for (const x of [-38, 38]) { B.stone(r, x, -1, 8, 3.4, STONE, null); B.post(x, top + 8, -2, 7, OAK).s(`M${x - 1} ${top + 12}v${-top - 18}`, OAK[3], .5, .45); }
    // the board: an oak frame, a cork face mottled and pinned, light falling across it from the upper west
    B.f(B.rect(-45, -82, 90, 56), OAK[1]).f(B.rect(-45, -82, 90, 2.4), OAK[2], .8).f(B.rect(-45, -28.4, 90, 2.4), OAK[3], .55);
    B.f(B.rect(-41, -78, 82, 48), '#b4906a');
    for (let i = 0; i < 70; i++) B.f(B.circ(-40 + r() * 80, -77 + r() * 46, .5 + r() * .5), r() < .5 ? '#8a6a46' : '#cfa880', .45);
    const notes = [[-36, -74, 21, 17, '#f6efdc', -4], [-12, -76, 17, 22, '#dfe8ee', 2], [9, -73, 23, 15, '#f3dcdc', -2], [-33, -52, 19, 18, '#eef0d8', 5], [-8, -50, 24, 16, '#f6efdc', -1], [20, -54, 16, 20, '#e8e0f0', 3]];
    for (const [x, y, w, h, c, a] of notes) {
      const cx = B.cx; if (cx) { cx.save(); cx.translate(x + w / 2, y + h / 2); cx.rotate(a * Math.PI / 180); }
      const X = cx ? -w / 2 : x, Y = cx ? -h / 2 : y;
      B.f(B.rect(X + 1, Y + 1.6, w, h), 'rgba(40,30,20,.24)').f(B.rect(X, Y, w, h), c).f(B.poly([[X + w - 4, Y + h], [X + w, Y + h - 4], [X + w, Y + h]]), '#d8cfb8');
      for (let i = 0; i < 3; i++) B.s(`M${X + 3} ${Y + 5.4 + i * 3.6}h${w - 7 - (i === 2 ? 5 : 0)}`, '#8e887c', .7);
      B.f(B.circ(X + w / 2, Y + 2, 1.4), ['#c84a3a', '#3a7ac0', '#e0b040'][Math.floor(r() * 3)]).f(B.circ(X + w / 2 - .4, Y + 1.6, .5), '#ffffff', .7);
      if (cx) cx.restore();
    }
    B.f(B.circ(32, -38, 5), '#3a6ab0').f(B.circ(32, -38, 3), '#e0c050').f(B.poly([[29, -34], [27, -26], [31, -29]]), '#3a6ab0').f(B.poly([[35, -34], [37, -26], [33, -29]]), '#3a6ab0');
    B.f(B.rect(-41, -78, 82, 48), B.lin(-41, -78, 41, -30, [[0, 'rgba(255,240,210,.16)'], [.6, 'rgba(255,240,210,0)'], [1, 'rgba(50,34,20,.16)']]));
    // the header plank under the hood, painted by hand
    B.f(B.rr(-18, -25, 36, 9, 1.5), '#e8dcbc').f(B.rect(-18, -25, 36, 1.2), '#fff6e0', .8).f(B.rect(-18, -17, 36, 1), '#8a7a5a', .5).text('Notices', 0, -20.4, 7, '#4a3b26');
    // the hood: two pitches of oak shingles on a ridge, moss in the laps, a finial
    shingleRoof(B, r, -52, 52, -84, -108, s, { moss: 5 });
    B.f(B.rect(-1.6, -114, 3.2, 7), OAK[1]).f(B.circ(0, -114, 2.2), OAK[2]);
    // ivy up the east post, a pail of flowers at the west, long grass round the pads
    ivy(B, r, 41, -2, -60, s);
    B.f('M-52 0L-53 -10H-43L-44 0Z', B.lin(-53, 0, -43, 0, [[0, '#a8b0b4'], [1, '#5e686c']])).f(B.ell(-48, -10, 5, 1.6), '#4e585c');
    if (s !== 'winter') for (let i = 0; i < 7; i++) B.f(B.circ(-52 + r() * 8, -13 - r() * 6, 1.6), ['#e8c84a', '#f2f0e8', '#c86aa0', '#9a7ad0'][i % 4], .95);
    B.tufts(r, -38, 1, 14, 7, grass(s), 7).tufts(r, 38, 1, 14, 7, grass(s), 7);
  } };

  /* ---------- the field journal: an oak book stand under a little shingled hood, the journal open on a fish and a beetle ---------- */
  A['field-journal'] = { box: [-26, -78, 30, 6], seat: { kind: 'flags', w: 28, front: 14 }, draw(B, o) {
    const r = KIT().rng(421), s = o.season, desk = -H * .92;
    // the back post that carries the hood, a stone block foot, the turned column of the stand
    B.post(9, -70, -2, 4, OAK);
    B.f(B.rr(-9, -6, 18, 7, 1.5), STONE.rockLo).f(B.rr(-9, -6, 18, 2, 1), STONE.rockHi);
    B.f(`M-3 -6Q-5 -12 -3 -16Q-5 ${desk + 12} -2.4 ${desk + 4}H2.4Q5 ${desk + 12} 3 -16Q5 -12 3 -6Z`, drum(B, -5, 5, ['#c8a478', '#a07c52', '#7e5e3c', '#5a4028', '#3e2c1c']));
    // the sloping desk and the open book: two pages bowed, a sketch on each, a ribbon, a quill in its pot
    B.f(B.poly([[-20, desk + 4], [20, desk + 4], [16, desk - 8], [-16, desk - 8]]), OAK[1]).f(B.poly([[-20, desk + 4], [20, desk + 4], [19.4, desk + 2], [-19.4, desk + 2]]), OAK[2], .8);
    B.f(`M-17 ${desk + 1}Q-9 ${desk - 2} 0 ${desk + 1.4}V${desk - 11}Q-9 ${desk - 14} -15 ${desk - 12}Z`, '#f7f0dc').f(`M17 ${desk + 1}Q9 ${desk - 2} 0 ${desk + 1.4}V${desk - 11}Q9 ${desk - 14} 15 ${desk - 12}Z`, '#ebe1c6');
    B.s(`M0 ${desk + 1.4}V${desk - 11}`, '#b8ab8a', .8);
    B.s(`M-13 ${desk - 6}q4 -3 8 0q-4 3 -8 0zM-5 ${desk - 6}l3 -2v4z`, '#5e7e8e', .8).f(B.circ(-11, desk - 6.4, .5), '#2a2e30');
    for (let i = 0; i < 3; i++) B.s(`M-13 ${desk - 2 + i * 1.6}l9 .5`, '#a8a08a', .5, .8);
    B.f(B.ell(8, desk - 6, 3.6, 2), '#6a4a2a').s(`M5 ${desk - 6}l-2 -2M5 ${desk - 6}l-2 2M11 ${desk - 6}l2 -2M11 ${desk - 6}l2 2M6 ${desk - 4.6}l-2 2M10 ${desk - 4.6}l2 2`, '#4a3220', .5);
    B.s(`M4 ${desk - 1}l8 .4M4 ${desk + .6}l6 .3`, '#a8a08a', .5, .8).s(`M1 ${desk + 1}l-1 7`, '#b83a2e', 1.2);
    B.f(B.rr(18, desk - 1, 6, 6, 1.4), '#5a6a70').s(`M21 ${desk - 1}q3 -8 7 -12`, '#f6f1e4', 1.8).s(`M21 ${desk - 1}q3 -8 7 -12`, '#cfc6b0', .5);
    // the hood: a little gable on its bracket, keeping the rain off the pages
    B.s(`M9 -60L-4 -66`, OAK[1], 1.8);
    shingleRoof(B, r, -22, 26, -62, -76, s, { moss: 2 });
    // creeping thyme in the joints, a tuft each side
    if (s !== 'winter') for (let i = 0; i < 6; i++) B.f(B.circ(-14 + r() * 28, 2 + r() * 3, 1.1), '#b88ac8', .85);
    B.tufts(r, -12, 1, 8, 5, grass(s), 6).tufts(r, 14, 1, 8, 5, grass(s), 6);
  } };

  /* ---------- the crafting bench: a lean-to of oak posts and shingles over a heavy bench, the tools hung on the back boards ---------- */
  A['craft-bench'] = { box: [-62, -120, 62, 10], seat: { kind: 'earth', w: 100, front: 20 }, lit: true, lights: [[0, -70, 90]], draw(B, o) {
    const r = KIT().rng(431), s = o.season, top = -H * .6, eaveF = -H * 2.1, eaveB = -H * 2.55;
    // the back boards between the rear posts, weathered and lit to the west
    B.f(B.rect(-50, eaveB + 2, 100, -eaveB - 4), B.lin(-50, 0, 50, 0, [[0, '#b0906a'], [.3, '#9a7a54'], [1, '#6e5438']]));
    for (let x = -50; x < 50; x += 6.4) B.s(`M${x} ${eaveB + 2}v${-eaveB - 4}`, '#5a4430', .6, .5);
    for (let i = 0; i < 6; i++) B.f(B.rect(-48 + r() * 92, eaveB + 6 + r() * 40, 4, 10 + r() * 16), '#c4a478', .2);
    // the tools on their pegs: a saw, a mallet, shears, a plane, a coil of twine, a row of chisels
    B.f(B.poly([[-40, -86], [-26, -86], [-26, -62], [-40, -67]]), '#b4bec2').f(B.rect(-41, -89, 16, 4), OAK[0]).s('M-38 -72l2 -2l2 2l2 -2l2 2l2 -2l2 2', '#6e787c', .6);
    B.s('M-14 -88v18', '#6a5034', 2.2).f(B.rr(-19, -72, 10, 7, 1), '#8a949a');
    B.s('M2 -88q-5 7 0 14M10 -88q5 7 0 14', '#5e6a70', 1.4).f(B.circ(2, -73, 2.4), '#c04a3a').f(B.circ(10, -73, 2.4), '#c04a3a');
    for (let i = 0; i < 5; i++) B.s(`M${20 + i * 3.4} -88v10`, '#8a949a', 1).s(`M${20 + i * 3.4} -88v-4`, OAK[1], 1.6);
    B.f(B.ell(41, -80, 6, 6), '#d7c294').s('M36 -82q5 -4 10 0M36 -78q5 -4 10 0', '#a88a54', .7);
    // the bench: a thick oak top on four legs, a stretcher, a vice at the west end, a planed board and shavings on it
    for (const [x, w] of [[-44, 6], [44, 6], [-30, 4.6], [30, 4.6]]) B.post(x, top + 4, 0, w, OAK);
    B.beam && B.beam(-46, -9, 92, 3.4, OAK);
    B.f(B.rect(-50, top - 4, 100, 9), OAK[1]).f(B.rect(-50, top - 6, 100, 3), '#c8a878').f(B.rect(-50, top - 6, 100, 1), '#e4caa0').f(B.rect(-50, top + 3, 100, 2), OAK[3], .45);
    B.f(B.rect(-56, top - 10, 9, 13), '#5a6a70').f(B.rect(-56, top - 10, 9, 2), '#8a9aa0').s(`M-58 ${top - 4}h-4`, '#3a4448', 2);
    B.f(B.poly([[-20, top - 7], [14, top - 9], [16, top - 5.4], [-18, top - 4]]), '#e2c996').f(B.poly([[-20, top - 7], [14, top - 9], [14, top - 8], [-20, top - 6]]), '#f4e2b8');
    B.f(B.rr(26, top - 18, 8, 12, 2), '#c06a3a').f(B.rect(26, top - 18, 8, 2.2), '#d88a5a');
    for (const [dx, c] of [[-2, '#e8c84a'], [1, '#5a8ac0'], [4, '#c85a5a']]) B.s(`M${30 + dx * .5} ${top - 18}l${dx} -8`, '#8b6a44', 1).f(B.circ(30 + dx * 1.5, top - 26, 1.3), c);
    for (let i = 0; i < 12; i++) B.s(`M${-46 + r() * 92} ${-1 + r() * 4}q2 -3 4 0`, '#e4caa0', 1.1, .9);
    // a willow basket under it and a sawhorse beside
    B.f(B.ell(-12, -5, 10, 5), '#a8844e').s('M-21 -7q9 4 18 0M-21 -4q9 4 18 0', '#7a5a30', .8);
    // the lean-to: front posts, the roof sloping back, its shingles, a lantern on the beam
    for (const x of [-54, 54]) B.post(x, eaveF, 0, 5, OAK);
    B.f(B.poly([[-60, eaveF + 2], [60, eaveF + 2], [58, eaveB - 6], [-58, eaveB - 6]]), '#4e3a2a');
    B.f(B.poly([[-60, eaveF], [60, eaveF], [58, eaveB - 8], [-58, eaveB - 8]]), B.lin(0, eaveB - 8, 0, eaveF, [[0, '#7a5e44'], [1, '#9a7656']]));
    for (let k = 1; k < 5; k++) { const y = eaveF + (eaveB - 8 - eaveF) * k / 5; B.s(`M-59 ${y}H59`, '#5a4430', .7, .6); for (let x = -58 + r() * 4; x < 58; x += 4 + r() * 2) B.s(`M${x} ${y}v${(eaveF - eaveB) / 5}`, '#5a4430', .4, .35); }
    B.s(`M-60 ${eaveF}H60`, '#c49a6a', 1.2, .8);
    if (s === 'winter') B.f(B.poly([[-58, eaveF - 2], [58, eaveF - 2], [57, eaveB - 7], [-57, eaveB - 7]]), '#f2f4f0', .85);
    else for (let i = 0; i < 5; i++) B.f(B.blob(r, -50 + r() * 100, eaveF - 4 - r() * 8, 4, 1.4, 6, .5), '#7d8f4e', .7);
    B.s(`M0 ${eaveF + 2}v6`, IRON[0], .8).f(B.rr(-3.4, eaveF + 8, 6.8, 9, 1.4), IRON[0]).f(B.rect(-2.4, eaveF + 9.4, 4.8, 6), o.night ? '#ffd88a' : '#9ab0b0', .95);
    // a hand-painted sign on the post, grass and a few nettles round the foot
    B.f(B.rr(40, eaveF + 10, 22, 9, 1.4), '#e8dcbc').text('Craft', 51, eaveF + 14.6, 6.6, '#4a3b26');
    B.tufts(r, -56, 2, 10, 7, grass(s), 8).tufts(r, 56, 2, 10, 7, grass(s), 8);
  } };

  /* ---------- the sundial: a bronze dial on a stone baluster, two round steps worn hollow in the middle ---------- */
  A['sundial'] = { box: [-24, -40, 24, 6], seat: { kind: 'flags', w: 30, front: 14 }, draw(B, o) {
    const r = KIT().rng(441), s = o.season, top = -H * .72;
    B.f(B.ell(0, 0, 17, 5), STONE.rockLo).f(B.ell(0, -2, 17, 5), STONE.rock).f(B.ell(-3, -3, 9, 2, 0), STONE.rockHi, .6);
    B.f(B.ell(0, -4, 12, 3.6), STONE.rockLo).f(B.ell(0, -6, 12, 3.6), STONE.rock).f(B.ell(-2, -6.6, 6, 1.4), STONE.rockHi, .6);
    B.f(`M-5 -6Q-7 -10 -4 -14Q-7 ${top + 10} -3 ${top + 4}H3Q7 ${top + 10} 4 -14Q7 -10 5 -6Z`, drum(B, -6, 6, [STONE.rockHi, STONE.rock, STONE.rockLo, '#6e6656', '#4e483e']));
    B.f(B.ell(0, top + 3, 11, 3.2), STONE.rockLo).f(B.ell(0, top + 1.4, 11, 3.2), STONE.rock).f(B.ell(0, top + 1, 8.6, 2.4), '#9a7a44').f(B.ell(-2, top + .4, 5, 1.2), '#d4b070', .7);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B.f(B.circ(Math.cos(a) * 7, top + 1 + Math.sin(a) * 2, .4), '#5a4020'); }
    B.f(B.poly([[0, top + 1], [5.4, top + .6], [0, top - 5]]), '#7a5a2c').f(B.poly([[0, top + 1], [1.4, top + .9], [0, top - 5]]), '#c8a464').f(B.poly([[0, top + 1], [8, top + 2.4], [7.4, top + 3]]), 'rgba(50,34,16,.4)');
    lichenDots(B, r, -5, top + 6, 10, -top - 14, 4, s);
    if (s !== 'winter') { B.f(B.blob(r, -10, -1, 4, 1.6, 6, .5), '#7d8f4e', .8); for (let i = 0; i < 5; i++) B.f(B.circ(-17 + r() * 6, -1 - r() * 4, 1.2), ['#e8c84a', '#f2f0e8', '#c86aa0'][i % 3], .9); for (let i = 0; i < 4; i++) B.f(B.circ(13 + r() * 6, -1 - r() * 4, 1.2), ['#9a7ad0', '#f2f0e8'][i % 2], .9); }
    B.tufts(r, -15, 2, 8, 6, grass(s), 6).tufts(r, 16, 2, 8, 6, grass(s), 6);
  } };

  /* ---------- the lake board: a slate in an oak frame on two legs under a strip of tin, the day's lake in chalk ---------- */
  A['lake-board'] = { box: [-26, -64, 26, 6], seat: { kind: 'flags', w: 30, front: 12 }, draw(B, o) {
    const r = KIT().rng(451), s = o.season, t0 = -H * 1.3, t1 = -H * .5;
    for (const x of [-15, 15]) B.post(x, t0 + 2, 0, 3.6, OAK);
    B.f(B.rect(-19, t0, 38, t1 - t0), OAK[1]).f(B.rect(-19, t0, 38, 1.6), OAK[2], .8).f(B.rect(-16, t0 + 3, 32, t1 - t0 - 6), '#34423e');
    B.f(B.rect(-16, t0 + 3, 32, t1 - t0 - 6), B.lin(-16, t0, 16, t1, [[0, 'rgba(255,255,255,.1)'], [1, 'rgba(0,0,0,.12)']]));
    const c = '#eef0ea', y = t0 + 3;
    B.f(B.circ(-9, y + 7, 2.8), '#f2e6a8', .85); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.s(`M${-9 + Math.cos(a) * 4.2} ${y + 7 + Math.sin(a) * 4.2}l${Math.cos(a) * 1.6} ${Math.sin(a) * 1.6}`, '#f2e6a8', .6, .85); }
    B.f(B.blob(r, 5, y + 7, 6, 2.6, 6, .3), c, .75);
    B.s(`M-11 ${y + 17}q7 -5 14 0q-7 5 -14 0zM3 ${y + 17}l4 -3v6z`, c, .8, .9).f(B.circ(-8, y + 16.4, .5), c);
    B.s(`M-12 ${y + 23}q3 -1.6 6 0t6 0t6 0t6 0`, '#a8c8d0', .6, .8);
    for (let i = 0; i < 4; i++) B.s(`M${6 + i * 2.4} ${y + 13}v4`, c, .6, .8);
    B.s(`M3 ${y + 15}l10 2.4`, c, .5, .7);
    // a strip of tin over it, a chalk ledge, a stub of chalk
    B.f(B.poly([[-22, t0 - 1], [22, t0 - 1], [20, t0 - 6], [-20, t0 - 6]]), B.lin(-22, 0, 22, 0, [[0, '#b8c0c4'], [1, '#6e787c']])).s(`M-22 ${t0 - 1}H22`, '#4e585c', .8);
    B.f(B.rect(-18, t1, 36, 2.6), OAK[1]).f(B.rect(-5, t1 - 1, 5, 1.6), '#f2f0e8');
    B.f(B.ell(12, -3, 5, 2), '#9aa0a4').f(B.rect(7, -9, 10, 6), B.lin(7, 0, 17, 0, [[0, '#a8b0b4'], [1, '#5e686c']])).f(B.ell(12, -9, 5, 1.6), '#4e585c');
    B.tufts(r, -16, 1, 8, 6, grass(s), 6).tufts(r, 18, 1, 8, 5, grass(s), 6);
  } };

  /* ---------- the camera: a mahogany and brass field camera on its tripod, the dark cloth over its back ---------- */
  A['camera-tripod'] = { box: [-22, -52, 24, 6], seat: { kind: 'earth', w: 26, front: 12, way: false, stones: 0 }, draw(B, o) {
    const r = KIT().rng(461), s = o.season, head = -H * .92;
    B.s(`M0 ${head + 4}L-14 1`, WOOD[1], 2.4).s(`M0 ${head + 4}L14 1`, WOOD[0], 2.4).s(`M0 ${head + 4}L3 2`, WOOD[3], 2.2).s(`M-.6 ${head + 5}L-13.6 0`, WOOD[2], .7, .8);
    for (const [x, y] of [[-14, 1], [14, 1], [3, 2]]) B.f(B.circ(x, y, 1.2), '#b89a58');
    B.f(B.rect(-5, head + 2, 10, 3), '#b89a58').f(B.rect(-5, head + 2, 10, 1), '#e8d49a');
    // the box and its pleated bellows out to the brass lens
    B.f(B.rr(-12, head - 13, 12, 15, 1.4), '#6a3a22').f(B.rr(-12, head - 13, 12, 3, 1.4), '#8e5232').f(B.rect(-12, head - 1.4, 12, 1.4), '#b89a58');
    B.f(B.poly([[0, head - 11], [9, head - 9], [9, head - 1], [0, head + 1]]), '#2a2420'); for (let x = 1.6; x < 9; x += 1.8) B.s(`M${x} ${head - 10.6 + x * .22}v${10.6 - x * .4}`, '#4a3e34', .6);
    B.f(B.rect(9, head - 10, 3, 10), '#6a3a22').f(B.circ(14, head - 5, 3.6), '#b89a58').f(B.circ(14, head - 5, 2.4), '#22282c').f(B.circ(13.4, head - 5.6, .9), '#e8f2f6', .9);
    // the dark cloth thrown over the back, a box of plates at the foot
    B.f(`M-14 ${head - 14}Q-8 ${head - 17} -2 ${head - 13}L-3 ${head + 6}Q-9 ${head + 9} -15 ${head + 4}Z`, '#26242a').f(`M-14 ${head - 14}Q-10 ${head - 16} -7 ${head - 14}L-9 ${head + 6}Q-12 ${head + 7} -15 ${head + 4}Z`, '#3e3a44', .8);
    B.f(B.rr(8, -7, 12, 7, 1), WOOD[1]).f(B.rect(8, -7, 12, 1.4), WOOD[2]);
    B.tufts(r, -14, 1, 6, 5, grass(s), 6).tufts(r, 14, 1, 6, 5, grass(s), 6);
  } };

  /* ---------- the mooring post: an oak pile with an iron band, a coil of rope, weed and barnacles where the water reaches ---------- */
  A['jetty-post'] = { box: [-14, -36, 16, 6], seat: false, draw(B, o) {
    const r = KIT().rng(471), top = -H * .72;
    B.f(B.ell(0, 1, 9, 2.6), 'rgba(30,48,46,.45)');
    B.f(`M-5.6 1V${top + 2}Q0 ${top - 1.4} 5.6 ${top + 2}V1Z`, drum(B, -5.6, 5.6, ['#a8906a', '#8a7050', '#6a5238', '#4a3826', '#2e2218']));
    B.f(B.ell(0, top + 1.6, 5.6, 1.8), '#b8a07a').f(B.ell(-1, top + 1.2, 3, .8), '#d4c09a', .8);
    for (let i = 0; i < 4; i++) B.s(`M${-3 + i * 2} ${top + 5}v${-top * (.3 + r() * .4)}`, '#4a3826', .5, .5);
    B.f(B.rect(-5.8, top + 8, 11.6, 2.4), IRON[1]).f(B.rect(-5.8, top + 8, 11.6, .8), '#7a8084');
    // the rope: a coil round the post, its tail hanging
    for (let k = 0; k < 3; k++) B.s(`M-6 ${top + 14 + k * 2.4}q6 2.6 12 0`, k % 2 ? '#c8a874' : '#a88a54', 1.8);
    B.s(`M5.4 ${top + 18}q5 4 3 12`, '#a88a54', 1.6);
    // green weed and barnacles at the foot
    B.f(B.rect(-5.6, -7, 11.2, 8), B.lin(0, -7, 0, 1, [[0, 'rgba(70,96,50,0)'], [1, 'rgba(70,96,50,.8)']]));
    for (let i = 0; i < 8; i++) B.f(B.circ(-4.6 + r() * 9.2, -5 + r() * 5, .7), '#d8d4c4', .85);
  } };

  /* ---------- the smoker: a squat brick smokehouse with a tin roof, its chimney breathing, eels hung under the eave ---------- */
  A['smoker'] = { box: [-30, -94, 32, 8], seat: { kind: 'earth', w: 40, front: 14 }, lit: true, lights: [[0, -14, 50]],
    // smoking (the catch's smoker state 1): the curl of smoke and the glow under the door; otherwise cold
    state: () => { try { const ca = typeof gardenCatchHere === 'function' ? gardenCatchHere() : null; return Number(ca && ca.sm) === 1 ? 'on' : 'cold'; } catch (e) { return 'cold'; } }, draw(B, o) {
    const on = o.state === 'on';
    const r = KIT().rng(481), s = o.season, eave = -H * 1.25, BR = ['#a65a3e', '#8e4a33', '#c07656', '#6e3a28'];
    M.SIGHT_KIT.brick(B, r, -20, eave, 40, -eave - 2, BR);
    ashlar(B, r, -21, -6, 42, 6, STONE, 4);
    B.f(B.rr(-7, -30, 14, 24, 1.5), '#3a2a20').f(B.rect(-6, -29, 12, 3), '#5a3e30').f(B.circ(5, -17, 1), '#c8a464');
    if (on) B.f(B.rect(-6, -10, 12, 4), '#e89a4a', o.night ? .8 : .45);
    B.f(B.rect(-7, -6, 14, 2), '#2a1e16', .6);
    // the chimney up the east end, the tin roof, a curl of smoke
    B.post(12, eave - 22, eave + 4, 8, ['#8e4a36', '#6e382a', '#b0664e']).f(B.rect(10, eave - 25, 12, 3.4), '#5a3428');
    B.f(B.poly([[-26, eave + 2], [0, eave - 16], [26, eave + 2], [24, eave + 5], [-24, eave + 5]]), '#5e686c').f(B.poly([[-26, eave + 2], [0, eave - 16], [0, eave + 4]]), '#9aa6aa').f(B.poly([[26, eave + 2], [0, eave - 16], [0, eave + 4]]), '#7a858a');
    for (let i = -3; i <= 3; i++) B.s(`M${i * 7.4} ${eave + 3}L0 ${eave - 16}`, '#5a6468', .5, .55);
    B.f(B.blob(r, -14, eave - 2, 5, 1.6, 6, .5), '#a0623a', .4);
    if (on) for (let i = 0; i < 4; i++) B.f(B.blob(r, 17 + i * 3.4, eave - 30 - i * 6, 4.4 + i * 1.8, 3 + i, 7, .4), '#e8e6e0', .48 - i * .1);
    // eels and a pair of fish on the rail under the eave, a stack of oak chips, a split log seat
    B.s(`M-22 ${eave + 8}h-6`, OAK[1], 1.6);
    for (let i = 0; i < 2; i++) B.s(`M${-25 + i * 3} ${eave + 8}q-1 6 1 12`, '#6a5a3a', 1.8);
    B.f(B.ell(-25, -2, 6, 3), '#c49a66').f(B.ell(-25, -4, 4, 2), '#e0b880');
    B.tufts(r, -20, 1, 10, 7, grass(s), 7).tufts(r, 24, 1, 10, 7, grass(s), 7);
  } };

  /* ---------- the milk stand: a slab of stone on two stone piers at cart height, three churns waiting on it ---------- */
  A['ld-churn'] = { box: [-34, -56, 34, 6], seat: { kind: 'flags', w: 50, front: 14 }, draw(B, o) {
    const r = KIT().rng(491), s = o.season, slab = -H * .62;
    for (const x of [-18, 18]) { ashlar(B, r, x - 7, slab + 3, 14, -slab - 3, MOSSY, 4.4); }
    B.f(B.rect(-30, slab - 1, 60, 5), MOSSY.rockLo).f(B.rect(-30, slab - 1, 60, 1.6), MOSSY.rockHi).f(B.rect(-30, slab + 4, 60, 1), '#2e2c24', .45);
    mossOn(B, r, -28, slab + 4, 56, 4, s);
    // the churns: galvanised, a shoulder and neck, a lid, two handles, a dent, a painted number
    const GAL = ['#eef2f2', '#cfd6d8', '#a2acb0', '#727c80', '#4a5256'];
    for (const [x, h, w] of [[-17, 22, 8], [0, 24, 8.6], [16, 20, 7.6]]) {
      const b = slab - 1, sh = b - h * .7, nk = b - h * .86, lid = b - h;
      B.f(`M${x - w} ${b}V${sh + 3}Q${x - w} ${sh} ${x - w * .5} ${nk}V${lid + 2}H${x + w * .5}V${nk}Q${x + w} ${sh} ${x + w} ${sh + 3}V${b}Z`, drum(B, x - w, x + w, GAL));
      B.f(B.ell(x, lid + 2, w * .62, 1.6), '#8a9498').f(B.rr(x - w * .55, lid - 1, w * 1.1, 3.4, 1.4), drum(B, x - w * .55, x + w * .55, GAL)).f(B.circ(x, lid - 1.6, 1.2), '#727c80');
      for (const y of [b - 3, sh + 4]) B.f(B.rect(x - w, y, w * 2, 1.4), '#8a9498', .7);
      B.s(`M${x - w - 2} ${sh + 6}q-2 2 0 4M${x + w + 2} ${sh + 6}q2 2 0 4`, '#5a6468', 1);
      B.f(B.ell(x + w * .4, b - h * .35, 1.6, 2.4), '#5a6468', .3);
    }
    B.text && B.text('3', 0, slab - 9, 5, '#8a3a2e');
    // nettles and cow parsley round the piers
    if (s !== 'winter') { for (let i = 0; i < 8; i++) { const x = -30 + r() * 60; B.s(`M${x} 1q${(r() - .5) * 2} -6 ${(r() - .5) * 3} -${8 + r() * 6}`, leaf(s)[1], 1.1, .9); } for (let i = 0; i < 3; i++) { const x = -28 + i * 26 + r() * 4; for (let k = 0; k < 5; k++) B.f(B.circ(x + (r() - .5) * 6, -12 - r() * 4, 1.2), '#f6f2e6', .9); } }
    B.tufts(r, -18, 1, 16, 8, grass(s), 7).tufts(r, 18, 1, 16, 8, grass(s), 7);
  } };

  /* ---------- the frog stone: a round boulder that sits like a frog, two lichen knobs for eyes, a crack of a mouth, a real
     frog on its back and a rain puddle at its feet ---------- */
  A['ld-frog'] = { box: [-44, -54, 46, 10], seat: { kind: 'moss', w: 58, front: 12, stones: 0, way: false }, draw(B, o) { B.cx.save(); B.cx.scale(1.25, 1.25); try { frog(B, o); } finally { B.cx.restore(); } } };
  function frog(B, o) {
    const r = KIT().rng(501), s = o.season, P = { rock: '#9c9484', rockLo: '#746c5e', rockHi: '#cbc2ac', rockDk: '#3a342c' };
    B.f(B.ell(-20, 4, 10, 2.6), '#5a7a84', .55).f(B.ell(-22, 3.4, 5, 1), '#b8d4dc', .6);
    // the body: a broad low boulder, lit west, the haunch on the east
    B.f(B.blob(r, 2, -12, 28, 13, 12, .12), P.rockLo);
    B.f(`M-26 -2Q-30 -16 -16 -24Q0 -30 16 -24Q28 -18 26 -4Q10 -1 -26 -2Z`, B.lin(-28, -26, 26, 0, [[0, P.rockHi], [.4, P.rock], [1, P.rockLo]]));
    B.f(B.blob(r, 16, -10, 11, 8, 9, .2), P.rockLo).f(B.blob(r, 14, -12, 8, 5, 8, .2), P.rock, .8);
    // the two eye knobs and the crack of a mouth along the front
    for (const x of [-12, 2]) { B.f(B.blob(r, x, -27, 6, 4.4, 8, .2), P.rock).f(B.blob(r, x - 1.4, -28.4, 3.6, 2.4, 7, .3), P.rockHi, .9).f(B.circ(x + .4, -27, 1.6), P.rockDk, .7); }
    B.s('M-24 -10Q-10 -6 6 -9', P.rockDk, 1.1, .7).s('M-24 -9.4Q-10 -5.4 6 -8.4', P.rockHi, .5, .5);
    // lichen and moss on its back, a little green frog sat on it
    lichenDots(B, r, -20, -22, 36, 10, 8, s);
    if (s !== 'winter') { B.f(B.blob(r, 8, -22, 9, 3, 7, .5), '#7d8f4e', .85).f(B.blob(r, -18, -3, 8, 2.4, 7, .5), '#6f8446', .8);
      B.f(B.ell(20, -22, 3.4, 2.2), '#5e9a3e').f(B.circ(22.4, -23.6, 1.3), '#6eac46').f(B.circ(22.6, -24, .5), '#1e2a14').f(B.ell(18, -20.6, 1.6, .8), '#4a7a30'); }
    else B.f(B.blob(r, -2, -26, 18, 3, 8, .3), '#f4f6f2', .9);
    B.tufts(r, -26, 2, 8, 6, grass(s), 6).tufts(r, 28, 2, 8, 6, grass(s), 7);
  }

  /* ---------- the grotto: a mouth in a face of mossed gritstone under the Horn, ledges and a hanging garden of ferns over it,
     a trickle from its lip into a pool on the threshold; the mouth is the way in ---------- */
  A['ld-grotto'] = { box: [-82, -128, 84, 14], door: { dx: 0, dy: 0 }, seat: { kind: 'moss', w: 104, front: 16, stones: 0, extra(B, r) {
      // (the spring's pool and the stepping stones out of the mouth lie in the ground, under every actor: round 3)
      B.f(B.blob(r, 2, 4, 20, 4, 9, .3), '#3e6a6e', .9).f(B.blob(r, -2, 3, 13, 2, 8, .3), '#9ccad0', .55);
      for (let k = 0; k < 7; k++) B.stone(r, -24 + k * 8 + (r() - .5) * 3, 7 + (k % 2) * 2, 3.4 + r() * 2, 2, { rock: '#7f8a86', rockLo: '#5e6662', rockHi: '#a8b4b0', rockDk: '#3a403e' }, r() < .4 ? '#7d8f4e' : null);
    } }, draw(B, o) {
    const r = KIT().rng(511), s = o.season, snowy = s === 'winter', L = leaf(s), G = { rock: '#9a907c', rockLo: '#736a58', rockHi: '#c6ba9e', rockDk: '#3a342c', lichen: '#c9c48a', snow: '#fbfbf7' };
    const mh = H * 1.5, mw = 46, turf = snowy ? G.snow : s === 'autumn' ? '#9a9450' : '#7d8f4e', turfHi = snowy ? '#ffffff' : s === 'autumn' ? '#b8ac62' : '#9aae5e';
    // the knoll: rounded masses of gritstone heaped back to front, each lit on its west shoulder, bedding cracks across them,
    // turf and heather grown over the tops
    const masses = [[-44, -92, 32, 26], [2, -104, 36, 26], [44, -88, 30, 24], [-62, -56, 26, 24], [-30, -64, 28, 24], [32, -66, 28, 24], [62, -52, 24, 22], [-66, -18, 20, 18], [-42, -26, 22, 20], [42, -26, 22, 20], [66, -18, 18, 16]];
    for (const [x, y, rx, ry] of masses) {
      const east = x > 18;
      B.f(B.blob(r, x + 4, y + 5, rx, ry, 11, .16), G.rockDk, .9);
      B.f(B.blob(r, x, y, rx, ry, 11, .16), east ? G.rockLo : G.rock);
      B.f(B.blob(r, x - rx * .28, y - ry * .3, rx * .62, ry * .46, 9, .22), G.rockHi, east ? .3 : .6);
      for (let k = 0; k < 3; k++) { const yy = y - ry * .35 + k * ry * .36; B.s(`M${x - rx * (.75 - r() * .2)} ${yy}q${rx * .7} ${1.5 + r() * 2} ${rx * (1.3 + r() * .2)} ${(r() - .5) * 3}`, G.rockDk, .9, .38); }
      if (r() < .6) B.s(`M${x + (r() - .5) * rx} ${y - ry * .5}l${(r() - .5) * 3} ${ry * .7}`, G.rockDk, .8, .35);
    }
    for (const [x, y, rx, ry] of masses.slice(0, 7)) { B.f(B.blob(r, x - 2, y - ry * .72, rx * .86, ry * .3, 9, .45), turf, .95); B.f(B.blob(r, x - rx * .3, y - ry * .82, rx * .4, ry * .14, 7, .5), turfHi, .8); if (!snowy && r() < .7) for (let i = 0; i < 4; i++) B.f(B.circ(x + (r() - .5) * rx, y - ry * .78 + (r() - .5) * 3, 1.3), s === 'autumn' ? '#8a5a6a' : '#9a6a9a', .8); }
    // the mouth: a ragged dark opening under a lip of rock, its throat going back into green dark
    const lip = [], hole = [];
    for (let i = 0; i <= 18; i++) { const a = Math.PI * (1 + i / 18), j = 1 + (r() - .5) * .12; lip.push([Math.cos(a) * (mw / 2 + 7) * j, 3 + Math.sin(a) * (mh + 6) * j]); hole.push([Math.cos(a) * mw / 2 * j, 3 + Math.sin(a) * mh * j]); }
    B.f(B.poly(lip), G.rockLo).f(B.poly(lip.slice(0, 10).concat([[0, -mh * .6], [-mw * .3, 3]])), G.rock, .8);
    B.f(B.poly(hole), B.rad(0, -mh * .45, mh, [[0, '#2a3c30'], [.45, '#16201a'], [1, '#080c0a']]));
    B.f(B.blob(r, -3, -mh * .32, mw * .22, mh * .3, 8, .2), 'rgba(110,170,130,.14)');
    B.s(B.line(lip.slice(1, 10)), G.rockHi, 1.6, .55);
    // ferns hanging over the lip, ivy down the flanks, the drip and the pool on the threshold
    if (!snowy) { for (let k = 2; k < 17; k += 2) { const [x, y] = lip[k]; for (let jj = 0; jj < 3; jj++) B.s(`M${x} ${y}q${(jj - 1) * 3} 3 ${(jj - 1) * 4.6} ${7 + r() * 7}`, jj % 2 ? L[1] : L[2], 1.2, .9); }
      ferns(B, r, -56, -36, 18, 5, s); ferns(B, r, 56, -34, 16, 4, s); ferns(B, r, -24, -88, 20, 4, s); ferns(B, r, 30, -90, 16, 3, s); ivy(B, r, -70, -4, -40, s); ivy(B, r, 70, -6, -34, s); }
    else for (let k = 0; k < 9; k++) { const x = -mw / 2 + 5 + k * 4.4; B.f(`M${x - 1.2} ${-mh + 8}l1.2 ${6 + r() * 9}l1.2 ${-6 - r() * 9}z`, '#e6f3f8', .9); }
    B.s(`M7 ${-mh + 6}q1 ${mh * .4} -1 ${mh - 8}`, '#bfe0e4', 1, .55);
    B.boulder(r, -66, 1, 18, 13, G, snowy); B.boulder(r, 68, 1, 15, 10, G, snowy);
    lichenDots(B, r, -64, -110, 128, 90, 16, s);
  } };

  /* ---------- the hill stones: four tall standing stones in a row on the headland, older than anyone, leaning,
     lichened, grass grown long round their feet ---------- */
  function slab(B, r, x, h, w, lean, s, P) {
    const tx = x + lean * h, top = -h;
    const pts = [[x - w, 0], [x - w * 1.06, -h * .4], [tx - w * .82, top + h * .1], [tx - w * .3, top], [tx + w * .4, top + h * .05], [x + w * .96, -h * .45], [x + w, 0]];
    B.f(B.poly(pts), P.rockLo);
    B.f(B.poly([[x - w, 0], [x - w * 1.06, -h * .4], [tx - w * .82, top + h * .1], [tx - w * .3, top], [tx + w * .02, top + h * .45], [x - w * .1, 0]]), B.lin(x - w, 0, x + w * .2, 0, [[0, P.rockHi], [1, P.rock]]));
    B.f(B.poly([[tx - w * .82, top + h * .1], [tx - w * .3, top], [tx + w * .4, top + h * .05], [tx, top + h * .12]]), P.rockHi, .8);
    for (let k = 0; k < 5; k++) { const sx = x - w * .7 + r() * w * 1.5; B.s(`M${sx + lean * h * .8} ${-h * .85}q${(r() - .5) * 2} ${h * .3} ${(r() - .5) * 3} ${h * (.45 + r() * .3)}`, P.rockDk, 1.4 + r(), .12); }
    B.f(B.poly([[x + w * .2, 0], [x + w, 0], [x + w * .96, -h * .45], [tx + w * .4, top + h * .05], [tx + w * .1, top + h * .3]]), P.rockDk, .22);
    for (let k = 0; k < 4; k++) { const y = -h * (.15 + k * .2); B.s(`M${x - w * (.8 - r() * .3) + lean * -y} ${y}l${w * (.4 + r() * .6)} ${(r() - .5) * 3}`, P.rockDk, .7, .35); }
    B.s(`M${x + w * .3 + lean * h * .6} ${-h * .6}l${-1 + r() * 2} ${h * .3}`, P.rockDk, .9, .45);
    lichenDots(B, r, x - w * .9, -h * .85, w * 1.8, h * .7, Math.round(h / 8), s);
    if (s === 'winter') B.f(B.blob(r, tx - w * .3, top + 2, w * .7, 2.4, 6, .4), '#fbfbf7', .95);
    else { B.f(B.blob(r, x - w * .3, -2, w * .9, 2.4, 7, .5), '#6f8446', .85); }
    B.tufts(r, x, 1, w * 2.6, 10, s === 'autumn' ? ['#a89a52', '#c4b46a', '#8a8a44'] : ['#8c9a5e', '#b4bc7e', '#7d8f4e'], 9);
  }
  A['ld-stones'] = { box: [-112, -104, 118, 12], seat: { kind: 'turf', w: 180, front: 12, back: 6, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(521), s = o.season;
    const GRIT = { rock: '#8f887a', rockLo: '#68625a', rockHi: '#b4ac9a', rockDk: '#3a362e' };
    [[-74, H * 1.7, 11, -.1], [-26, H * 2.3, 14, .04], [24, H * 1.9, 12, -.07], [72, H * 1.4, 10, .16]].forEach(([x, h, w, lean]) => slab(B, r, x, h, w, lean, s, GRIT));
    // a fallen fifth lying in the grass between the second and third
    B.f(B.blob(r, 0, -3, 12, 4, 8, .2), FELL.rockLo).f(B.blob(r, -1, -4.4, 10, 2.6, 8, .2), FELL.rock).f(B.blob(r, -4, -5, 5, 1.2, 6, .3), FELL.rockHi, .7);
    B.tufts(r, 0, 1, 30, 8, ['#8c9a5e', '#b4bc7e'], 7);
  } };

  /* ---------- the beacon: an iron fire basket on a tall post, stood in a round plinth of fell stone with a cope, the
     next fire laid ready in it; steps worn into the plinth's side ---------- */
  A['ld-beacon'] = { box: [-34, -134, 36, 10], seat: { kind: 'turf', w: 44, front: 14 }, draw(B, o) {
    const r = KIT().rng(531), s = o.season, snowy = s === 'winter', plinth = -H * .7, bask = -H * 2.8;
    rubble(B, r, -24, 24, 0, () => plinth, ['#a29a88', '#958d7c', '#b0a894', '#8a8270'], { course: 5, mortar: '#5a5446' });
    B.f(B.ell(0, plinth + 1, 26, 5.4), FELL.rockLo).f(B.ell(0, plinth - .6, 25, 4.6), snowy ? FELL.snow : '#cfc6b0').f(B.ell(-6, plinth - 1.4, 11, 1.6), '#e6dec8', .6);
    // the post: a timber baulk banded in iron, an iron ladder of rungs up it
    B.f(B.rect(-3.4, bask + 10, 6.8, plinth - bask - 10), drum(B, -3.4, 3.4, ['#8a7456', '#6a5640', '#4e3e2c', '#3a2e20', '#241c14']));
    for (let y = plinth - 10; y > bask + 14; y -= 14) B.f(B.rect(-3.8, y, 7.6, 2), IRON[1]);
    for (let y = plinth - 6; y > bask + 16; y -= 7) B.s(`M3.4 ${y}h4`, IRON[0], 1.2);
    // the basket: iron straps flaring out, a rim, the split logs and tarred faggots laid in it
    B.f(`M-16 ${bask}H16L10 ${bask + 14}H-10Z`, '#2a2420', .9);
    for (let i = 0; i < 7; i++) { const x = -12 + i * 4; B.f(B.ell(x, bask - 1 - (i % 2) * 2, 2.6, 2.6), '#8a6440').f(B.ell(x, bask - 1 - (i % 2) * 2, 1.6, 1.6), '#c49a66'); }
    for (let i = 0; i < 5; i++) B.s(`M${-13 + i * 6} ${bask - 2}l${(r() - .5) * 4} -6`, '#5a4028', 1.4);
    for (const x of [-16, -8, 0, 8, 16]) B.s(`M${x} ${bask}L${x * .62} ${bask + 14}`, IRON[0], 1.8);
    B.s(`M-17 ${bask}H17M-13 ${bask + 7}H13M-10 ${bask + 14}H10`, IRON[0], 1.8).s(`M-17 ${bask - .8}H17`, '#5a6064', .8, .7);
    if (snowy) B.f(B.ell(0, bask - 4, 14, 2.4), FELL.snow, .95);
    // stone steps up the plinth's west side, heather and bilberry round its foot
    for (let k = 0; k < 3; k++) B.f(B.rr(-34 + k * 4, -4 - k * 7, 12, 4, 1), FELL.rock).f(B.rect(-34 + k * 4, -4 - k * 7, 12, 1.2), FELL.rockHi, .8);
    if (!snowy) for (let i = 0; i < 10; i++) B.f(B.blob(r, -30 + r() * 60, 1 + r() * 4, 3.4, 1.8, 6, .4), r() < .5 ? '#7a5a74' : '#6a7a44', .85);
    B.tufts(r, 0, 2, 56, 10, ['#8c9a5e', '#b4bc7e'], 6);
  } };

  /* ---------- the cairn: a broad cone of fell stones higher than the player, a cap stone, lichen; snow on the ledges ---------- */
  A['ld-cairn'] = { box: [-42, -96, 46, 12], seat: { kind: 'turf', w: 56, front: 12, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(541), snowy = o.season === 'winter', h = H * 2.1;
    for (let row = 0; row < 12; row++) { const y = -3 - row * h / 12.6, half = 34 * (1 - row / 13.4); for (let x = -half; x <= half; x += 7 + r() * 4) { const k = (x + half) / (half * 2 || 1); B.stone(r, x + (r() - .5) * 3, y + (r() - .5) * 2, 4.6 + r() * 3, 3 + r() * 1.6, k > .7 ? Object.assign({}, FELL, { rock: FELL.rockLo, rockHi: FELL.rock }) : FELL, snowy && r() < .5 ? 'snow' : r() < .3 ? FELL.lichen : null); } }
    B.f(B.blob(r, 0, -h - 1, 9, 3.4, 7, .2), FELL.rockLo).f(B.blob(r, -1, -h - 2.6, 8, 2.4, 7, .2), snowy ? FELL.snow : FELL.rockHi);
    B.f(B.poly([[16, -4], [36, -2], [20, -h * .5], [8, -h * .8]]), FELL.rockDk, .16);
    B.tufts(r, 0, 2, 70, 12, ['#8c9a5e', '#b4bc7e'], 6);
  } };

  /* ---------- the lamps: a fluted cast-iron post on a dressed stone foot, a ladder bar, a glazed lantern under its cap;
     a soft warm lamp at dusk and night (the old lamp by the square keeps the lamplighter's little cupboard in its foot) ---------- */
  const lampArt = cupboard => ({ box: [-16, -92, 18, 6], seat: { kind: 'flags', w: 16, front: 10, stones: 2, way: false }, lit: true, lights: [[0, -H * 1.75, 130]], draw(B, o) {
    const r = KIT().rng(cupboard ? 551 : 553), s = o.season, top = -H * 1.95, lan = top + 16;
    B.f(B.rr(-7, -8, 14, 9, 1.4), STONE.rockLo).f(B.rr(-7, -8, 14, 2.6, 1.2), STONE.rockHi).f(B.rect(3, -6, 4, 7), STONE.rockDk, .25);
    // the column: a fluted shaft tapering up from a moulded base, a collar, the ladder bar
    B.f(`M-4.6 -8Q-5 -14 -3 -16L-2 ${lan + 8}H2L3 -16Q5 -14 4.6 -8Z`, drum(B, -5, 5, ['#5e6a6c', '#3e4648', '#2a3032', '#1e2224', '#14181a']));
    for (const x of [-1, .6]) B.s(`M${x} -16V${lan + 10}`, '#6e7a7c', .4, .45);
    B.f(B.rect(-3.4, lan + 10, 6.8, 2.4), '#2a3032').f(B.rect(-3.4, lan + 10, 6.8, .8), '#6e7a7c', .8);
    B.s(`M-8 ${lan + 14}H8`, '#2a3032', 1.6).f(B.circ(-8, lan + 14, 1.2), '#2a3032').f(B.circ(8, lan + 14, 1.2), '#2a3032');
    if (cupboard) B.f(B.rr(-2.4, -15, 4.8, 6.4, .6), '#1e2224').s('M-2.4 -15h4.8', '#6e7a7c', .4).f(B.circ(1, -11.6, .5), '#c8a23a');
    // the lantern: four panes in iron astragals, wider at the top, the cap and finial
    const g = o.night ? B.rad(0, lan, 9, [[0, '#fffbe6'], [.5, '#ffe08a'], [1, '#e8a44a']]) : B.lin(-6, 0, 6, 0, [[0, '#cfe0e0'], [.45, '#7e9a9c'], [1, '#3e5254']]);
    B.f(`M-4 ${lan + 9}L-6.4 ${lan - 6}H6.4L4 ${lan + 9}Z`, '#1e2224').f(`M-3.2 ${lan + 8}L-5.4 ${lan - 5}H5.4L3.2 ${lan + 8}Z`, g);
    B.s(`M0 ${lan + 8}V${lan - 5}`, '#1e2224', .8);
    if (!o.night) B.f(`M-4.6 ${lan - 4}L-3 ${lan + 6}h1.4L-3.2 ${lan - 4}Z`, '#ffffff', .4);
    B.f(`M-8 ${lan - 6}Q0 ${lan - 15} 8 ${lan - 6}Z`, '#2a3032').f(`M-8 ${lan - 6}Q-4 ${lan - 12} 0 ${lan - 11}V${lan - 6}Z`, '#5e6a6c', .7).f(B.circ(0, lan - 13, 1.6), '#2a3032').s(`M0 ${lan - 14}v-4`, '#2a3032', .9);
    if (s === 'winter') B.f(`M-7 ${lan - 7}Q0 ${lan - 14} 7 ${lan - 7}Q0 ${lan - 10} -7 ${lan - 7}Z`, '#f4f6f2', .9);
    B.tufts(r, -8, 1, 5, 4, grass(s), 5).tufts(r, 9, 1, 5, 4, grass(s), 5);
  } });
  A['ld-lamp-a'] = lampArt(true); A['ld-lamp-b'] = lampArt(false); A['lf-lamps'] = lampArt(false);

  /* ---------- the benches: oak slats on cast-iron scroll ends, the seat at a third of the player's height, a brass plate on
     the back rail, the grass in front worn to earth by feet ---------- */
  const benchArt = seed => ({ box: [-44, -40, 44, 6], foot: [[-38, 40, 10]], seat: { kind: 'earth', w: 72, front: 16, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(seed), s = o.season, seat = -H * .3, back = -H * .78, OAKB = ['#a07a52', '#7e5e3c', '#c8a070', '#4a3624'];
    // the far iron end, the back slats, then the seat slats coming toward us, the near end over them
    const end = (x, near) => { const c = near ? '#22282a' : '#3a4244'; B.s(`M${x} 0Q${x - 3} ${seat * .5} ${x + 1} ${seat}L${x - 1} ${back}`, c, 2.4).s(`M${x + 1} ${seat}Q${x + 7} ${seat * .6} ${x + 6} 0`, c, 2).f(B.circ(x - 1, back, 1.8), c); if (near) B.s(`M${x - .6} ${seat * .6}q3 -3 1 -6`, '#5e6a6c', .7, .6); };
    end(36, false);
    for (let k = 0; k < 3; k++) { const y = back + 2 + k * 5.6; B.f(B.rr(-37, y, 74, 4, 1), k === 0 ? OAKB[2] : OAKB[0]).f(B.rect(-37, y + 3, 74, 1), OAKB[3], .5); for (let i = 0; i < 4; i++) B.s(`M${-34 + r() * 68} ${y + 1.4}h${4 + r() * 8}`, OAKB[1], .4, .5); }
    B.f(B.rr(-6, back + 3, 12, 3, .6), '#c8a23a').f(B.rect(-5, back + 3.6, 10, .7), '#f2dc8a', .8);
    for (let k = 0; k < 3; k++) { const y = seat - 4 + k * 3.2; B.f(B.rr(-39, y, 78, 2.8, .8), k === 0 ? OAKB[2] : OAKB[0]).f(B.rect(-39, y + 2, 78, .8), OAKB[3], .55); }
    B.f(B.rect(-39, seat + 5.6, 78, 1.6), OAKB[3], .5);
    end(-36, true);
    // a fallen leaf or two on the seat, daisies in the grass at each end, the earth worn bare in front
    if (s === 'autumn') for (let i = 0; i < 4; i++) B.f(B.ell(-30 + r() * 60, seat - 2 + r() * 4, 1.8, 1), ['#c45a26', '#e0a040'][i % 2]);
    if (s === 'winter') B.f(B.rr(-38, seat - 5, 76, 2, 1), '#f4f6f2', .9);
    if (s !== 'winter') for (let i = 0; i < 6; i++) B.f(B.circ((i < 3 ? -42 : 40) + r() * 4, -1 - r() * 3, 1), '#f6f2e6', .9);
    B.tufts(r, -42, 1, 6, 6, grass(s), 6).tufts(r, 42, 1, 6, 6, grass(s), 6);
  } });
  A['ld-bench-a'] = benchArt(561); A['ld-bench-b'] = benchArt(563);

  /* ---------- the way posts: an oak fingerpost with a cap, three arms with their words cut in and picked out, a stone
     at its foot to keep the mower off ---------- */
  const postArt = seed => ({ box: [-36, -88, 38, 6], seat: { kind: 'turf', w: 18, front: 10, stones: 3 }, draw(B, o) {
    const r = KIT().rng(seed), s = o.season, top = -H * 1.9;
    B.stone(r, -6, -1, 6, 3, MOSSY, s === 'winter' ? null : '#7d8f4e');
    B.post(0, top + 4, 0, 6, OAK).s(`M-1.4 ${top + 8}V-4`, OAK[3], .5, .5);
    B.f(B.rect(-4, top, 8, 4.6), OAK[1]).f(`M-4.4 ${top}L0 ${top - 4.4}L4.4 ${top}Z`, OAK[2]).f(`M0 ${top - 4.4}L4.4 ${top}H0Z`, OAK[0], .7);
    for (const [y, dir, w] of [[top + 10, 1, 31], [top + 20, -1, 29], [top + 30, 1, 25]]) {
      const x0 = dir * 3, x1 = x0 + dir * w, tip = x1 - dir * 5;
      B.f(B.poly([[x0, y - 4], [tip, y - 4], [x1, y], [tip, y + 4], [x0, y + 4]]), '#e8dcbc').f(B.poly([[x0, y + 2.6], [tip, y + 2.6], [x1 - dir * .8, y + .6], [x1, y], [tip, y + 4], [x0, y + 4]]), '#bcae8a', .8);
      B.f(B.rect(Math.min(x0, tip), y - 4, Math.abs(tip - x0), 1), '#fff6e0', .8);
      for (let i = 0; i < 3; i++) B.s(`M${x0 + dir * (4 + i * (w - 12) / 3)} ${y}h${dir * ((w - 14) / 3 - 1.6)}`, '#5a4a32', .9, .75);
    }
    if (s !== 'winter') { ivy(B, r, 1, -2, top + 40, s); }
    B.tufts(r, 0, 1, 16, 8, grass(s), 8);
  } });
  ['lf-post-lane', 'lf-post-field', 'lf-post-hill', 'lf-post-marsh', 'lf-post-grove'].forEach((id, i) => { A[id] = postArt(571 + i); });

  /* ---------- the village fountain: a round basin of dressed stone with a moulded rim, a bowl on a column at its heart,
     water falling from the bowl's lip into the basin, moss in the joints ---------- */
  A['lf-fountain'] = { box: [-54, -100, 54, 12], seat: { kind: 'flags', w: 92, front: 16 }, draw(B, o) {
    const r = KIT().rng(581), s = o.season, rim = -H * .5, bowl = -H * 1.6, frozen = s === 'winter';
    // the basin wall: courses of dressed stone round an ellipse, a moulded cope, the water inside
    B.f(B.ell(0, -2, 44, 12), STONE.rockLo).f(B.rect(-44, rim, 88, -rim - 2), STONE.rockLo);
    for (let row = 0; row < 3; row++) { const y = -4 - row * (-rim - 4) / 3; for (let a = 0; a < 12; a++) { const t = (a + (row & 1) * .5) / 12, x = -44 + t * 88, w = 7.6, k = Math.abs(x) / 44, bot = y + Math.sqrt(Math.max(0, 1 - k * k)) * 10; B.f(B.rr(x - w / 2 + .4, bot - (-rim - 4) / 3 + .8, w - .8, (-rim - 4) / 3 - 1, 1), x < -16 ? STONE.rockHi : x > 20 ? STONE.rockLo : STONE.rock, .95); } }
    B.f(B.ell(0, rim, 46, 13), STONE.rockLo).f(B.ell(0, rim - 1.6, 46, 12.4), STONE.rock).f(B.ell(-12, rim - 4, 22, 4), STONE.rockHi, .6);
    B.f(B.ell(0, rim - 1, 39, 9.6), frozen ? '#d8e6ec' : B.lin(0, rim - 10, 0, rim + 8, [[0, '#6e9aa4'], [1, '#3e6a74']]));
    if (!frozen) { for (let k = 0; k < 3; k++) B.s(B.ell(0, rim - 1, 10 + k * 8, 2.4 + k * 2), '#cfe6ea', .7, .5 - k * .12); B.f(B.ell(-14, rim - 4, 12, 2), '#e8f4f2', .45); }
    // the column and its bowl, a pineapple finial, the water falling in four threads
    B.f(`M-5 ${rim - 2}Q-8 ${rim - 8} -4 ${rim - 14}L-3 ${bowl + 6}H3L4 ${rim - 14}Q8 ${rim - 8} 5 ${rim - 2}Z`, drum(B, -8, 8, [STONE.rockHi, STONE.rock, STONE.rockLo, '#6e6656', '#4e483e']));
    B.f(`M-18 ${bowl}Q-16 ${bowl + 8} 0 ${bowl + 9}Q16 ${bowl + 8} 18 ${bowl}Z`, drum(B, -18, 18, [STONE.rockHi, STONE.rock, STONE.rockLo, '#6e6656', '#4e483e']));
    B.f(B.ell(0, bowl, 18, 4.4), STONE.rock).f(B.ell(0, bowl - .4, 15, 3.2), frozen ? '#d8e6ec' : '#6e9aa4');
    B.f(`M-3 ${bowl - 1}Q-5 ${bowl - 8} 0 ${bowl - 14}Q5 ${bowl - 8} 3 ${bowl - 1}Z`, drum(B, -5, 5, [STONE.rockHi, STONE.rock, STONE.rockLo, '#6e6656', '#4e483e'])).f(B.circ(0, bowl - 15, 2), STONE.rock);
    if (!frozen) for (const x of [-16, -6, 7, 16]) { const y0 = bowl + 2; B.s(`M${x} ${y0}q${x * .14} ${(rim - y0) * .4} ${x * .2} ${rim - 4 - y0}`, '#e4f2f4', 1.4, .55).s(`M${x} ${y0}q${x * .14} ${(rim - y0) * .4} ${x * .2} ${rim - 4 - y0}`, '#ffffff', .5, .6); B.f(B.ell(x * 1.2, rim - 3, 3.6, 1.2), '#ffffff', .5); }
    else for (const x of [-14, 0, 14]) B.f(`M${x - 1.2} ${bowl + 3}l1.2 ${8 + r() * 6}l1.2 ${-8 - r() * 6}z`, '#e6f3f8', .9);
    mossOn(B, r, -40, -6, 80, 6, s);
    if (s !== 'winter') for (let i = 0; i < 8; i++) B.f(B.circ(-50 + r() * 8 + (i % 2) * 92, -2 - r() * 5, 1.3), ['#e8c84a', '#f2f0e8', '#c86aa0'][i % 3], .9);
    B.tufts(r, -48, 2, 8, 6, grass(s), 6).tufts(r, 48, 2, 8, 6, grass(s), 6);
  } };
  /* ---------- the rowing boat at its mooring: a clinker-built boat of painted planks, two thwarts, the oars shipped along
     her, a painter rope up to the oak mooring post on the bank (the post is drawn with her: it has no drawing of its own);
     she rides the water a little ---------- */
  A['boat'] = { box: [-42, -64, 44, 12], seat: false, bob: 1.1, shade: false, state: () => { try { return typeof gardenWorkOwned === 'function' && gardenWorkOwned('rowing-boat') ? 'own' : ''; } catch (e) { return ''; } }, draw(B, o) {
    const r = KIT().rng(591), s = o.season, px = 30, py = -28, top = py - H * .62;
    // the post on the bank behind her, then the rope from her bow ring up to it
    B.f(`M${px - 5} ${py}V${top + 2}Q${px} ${top - 1.2} ${px + 5} ${top + 2}V${py}Z`, drum(B, px - 5, px + 5, ['#a8906a', '#8a7050', '#6a5238', '#4a3826', '#2e2218']));
    B.f(B.ell(px, top + 1.6, 5, 1.6), '#b8a07a').f(B.rect(px - 5.2, top + 7, 10.4, 2), IRON[1]);
    for (let k = 0; k < 2; k++) B.s(`M${px - 5.4} ${top + 12 + k * 2.2}q5.4 2.4 10.8 0`, k ? '#c8a874' : '#a88a54', 1.6);
    B.s(`M28 -6Q${px - 6} ${py - 2} ${px - 4} ${top + 13}`, '#b8a074', 1.1);
    // the water round her: a dark contact, a ring of ripples
    B.f(B.ell(0, 2, 38, 6.4), 'rgba(16,40,56,.32)').s(B.ell(0, 2.4, 40, 7.4), '#e8f4f4', .8, .45);
    // the hull: painted planks below the gunwale in laps, a white strake, tar at the waterline; bow to the east
    const hull = 'M-34 -6Q-36 2 -24 5Q0 9 24 5Q34 2 38 -8Q20 -4 0 -4Q-20 -4 -34 -6Z';
    B.f(hull, B.lin(0, -8, 0, 8, [[0, '#3e6e74'], [.55, '#2e5258'], [1, '#1e3438']]));
    for (let k = 1; k < 3; k++) B.s(`M${-34 + k} ${-6 + k * 3.4}Q0 ${-1 + k * 3.6} ${37 - k * 1.6} ${-8 + k * 3.6}`, '#1e3438', .7, .6);
    B.s('M-34 -6Q-20 -3.6 0 -3.6Q20 -3.6 38 -8', '#f2ece0', 1.6);
    B.f('M-24 5Q0 9 24 5Q20 7.6 0 8.4Q-20 7.6 -24 5Z', '#1a1a16', .7);
    // inside: the bottom boards lit, the gunwale's far edge, two thwarts and the stern seat, the oars shipped
    B.f('M-32 -7Q-22 -16 0 -16Q24 -16 37 -9Q20 -5 0 -5Q-20 -5 -32 -7Z', '#c49a66').f('M-32 -7Q-22 -16 0 -16Q24 -16 37 -9Q22 -12 0 -12Q-20 -12 -32 -7Z', '#8a6a44', .8);
    B.s('M-32 -7Q-22 -16 0 -16Q24 -16 37 -9', '#5a4028', 1.4);
    for (const x of [-10, 12]) B.f(B.rr(x - 3, -15, 6, 10, 1), '#a87a4e').f(B.rect(x - 3, -15, 6, 1.4), '#d8b080', .8);
    B.f('M-30 -8Q-26 -13 -20 -13V-6Q-26 -6 -30 -8Z', '#a87a4e');
    for (const [y, c] of [[-10, '#d4b07a'], [-8, '#b48a58']]) { B.s(`M-28 ${y}L30 ${y - 2}`, c, 1.6); B.f(B.ell(30 + (y + 10) * 2, y - 2, 4, 1.6), c); }
    B.f(B.circ(37, -9, 1.2), IRON[1]);
    // yours: a red pennant on a staff at her bow
    if (o.state === 'own') { B.s('M34 -9V-32', '#6e4c2a', 1.4).f('M34 -32l12 3.4l-12 3.6z', '#d8452a').f('M34 -32l12 3.4l-12 .8z', '#f06a4a', .7); }
    if (s === 'winter') B.f('M-28 -9Q0 -15 32 -10Q0 -11 -28 -8Z', '#f4f6f2', .8);
    if (s === 'autumn') for (let i = 0; i < 3; i++) B.f(B.ell(-18 + r() * 40, -9 + r() * 3, 1.6, .9), ['#c45a26', '#e0a040'][i % 2]);
  } };
  /* ---------- the apple clamp: a long mound of thatched straw over the stored apples, turf laid on its ends, a rope net over
     it weighted with stones; opened in winter, the apples showing red in the straw ---------- */
  A['ld-clamp'] = { box: [-52, -44, 66, 8], seat: { kind: 'earth', w: 84, front: 12, stones: 0, way: false }, draw(B, o) {
    const r = KIT().rng(601), s = o.season, h = H * .9, STRAW = ['#d8b860', '#c4a04a', '#a8843a', '#e8cc7a'];
    const mound = `M-46 0Q-48 -${h * .7} -24 -${h}Q0 -${h * 1.06} 24 -${h}Q48 -${h * .7} 46 0Z`;
    B.f(mound, B.lin(-46, -h, 46, 0, [[0, STRAW[3]], [.4, STRAW[0]], [1, STRAW[2]]]));
    for (let i = 0; i < 90; i++) { const x = -42 + r() * 84, k = 1 - Math.abs(x) / 46, y = -2 - r() * h * Math.sqrt(Math.max(0, k)) * .98; B.s(`M${x} ${y}l${(r() - .5) * 2} ${2.4 + r() * 3}`, STRAW[1 + Math.floor(r() * 3)], .7, .8); }
    // turf on each end, cut in blocks
    for (const sd of [-1, 1]) { for (let k = 0; k < 4; k++) B.f(B.rr(sd * 36 - 8 + (sd < 0 ? 0 : 2), -6 - k * 6, 14, 6, 1.4), k % 2 ? '#6e7a3e' : '#5e6a34').f(B.rect(sd * 36 - 8 + (sd < 0 ? 0 : 2), -6 - k * 6, 14, 1.4), '#8e9a54', .8); }
    // the rope net and its stone weights
    for (let x = -30; x <= 30; x += 12) B.s(`M${x} -${h * (1 - Math.abs(x) / 70)}Q${x * 1.2} -${h * .4} ${x * 1.32} -4`, '#8a7450', .8, .85);
    B.s(`M-40 -${h * .45}Q0 -${h * .78} 40 -${h * .45}`, '#8a7450', .8, .85);
    for (const x of [-38, -14, 14, 38]) B.s(`M${x} -6v4`, '#8a7450', .7).f(B.blob(r, x, 0, 3.4, 2.4, 6, .3), STONE.rockLo).f(B.blob(r, x - .8, -.8, 2, 1.2, 6, .3), STONE.rockHi, .8);
    if (s === 'winter') { B.f(`M-40 -${h * .5}Q-20 -${h * 1.04} 0 -${h * 1.02}Q20 -${h * 1.04} 40 -${h * .5}Q0 -${h * .82} -40 -${h * .5}Z`, '#f4f6f2', .92); B.f(B.blob(r, 4, -8, 12, 6, 8, .4), '#3a2a18'); for (let i = 0; i < 8; i++) B.f(B.circ(-4 + r() * 16, -10 + r() * 6, 2), i % 3 ? '#c83a2a' : '#d8a030'); }
    else B.f(B.blob(r, 6, -6, 7, 3, 7, .4), '#5a4024', .6).f(B.circ(4, -6, 1.8), '#c83a2a').f(B.circ(8, -5.4, 1.8), '#d8a030');
    // (it read as a flat straw sticker with no apples: hunter, round 3) the far side in shade, earth banked at its foot,
    // the near end opened where the apples are taken from, a full basket waiting beside it
    B.f(`M8 -${h * 1.02}Q40 -${h * .9} 46 0H20Q30 -${h * .5} 8 -${h * 1.02}Z`, STRAW[2], .42).f(B.rr(-46, -4, 92, 4, 2), '#6a5232', .55);
    if (s !== 'winter') {
      B.f(`M-12 0Q-13 -${h * .5} 0 -${h * .58}Q13 -${h * .5} 12 0Z`, '#3a2a18').f(`M-10 0Q-10 -${h * .42} 0 -${h * .5}Q10 -${h * .42} 10 0Z`, '#2a1e12');
      for (let i = 0; i < 9; i++) { const x = -7 + (i % 4) * 4.4 + (i > 3 ? 2 : 0), y = -2.4 - Math.floor(i / 4) * 3.6; B.f(B.circ(x, y, 2.1), i % 3 ? '#c8402a' : '#d8a030').f(B.circ(x - .6, y - .7, .7), '#ffe8c0', .6); }
      B.s(`M-12 0Q-13 -${h * .5} 0 -${h * .58}Q13 -${h * .5} 12 0`, STRAW[3], 1.4, .8);
      // the basket: wicker, two handles, heaped with red and gold
      B.f(B.poly([[46, -1], [62, -1], [64, -11], [44, -11]]), '#9a7440').s('M45 -8h18M45.5 -4.4h17', '#6e5028', .7, .8).s('M48 -11q6 -8 12 0', '#7a5a30', 1.2);
      for (let i = 0; i < 6; i++) B.f(B.circ(47 + i * 3, -12 - (i % 2) * 1.6, 2), i % 2 ? '#d8a030' : '#c8402a');
    }
    B.tufts(r, -48, 1, 8, 7, grass(s), 7).tufts(r, 40, 1, 6, 4, grass(s), 6);
  } };

  /* ---------- cider square: three oak casks on a stillage beside the twin-screw press, its slatted cheese and tray, a basket
     of windfalls; a drip from the spigot darkens the setts ---------- */
  A['ld-barrels'] = { box: [-42, -84, 56, 8], seat: { kind: 'flags', w: 56, front: 14 }, draw(B, o) {
    const r = KIT().rng(611), s = o.season, OAKC = ['#b08456', '#8a6440', '#d4aa74', '#4e3824'];
    // the press, behind and to the east: two posts, a beam, the screws, the cheese of pomace in its slats, the tray
    const px = 34, beam = -H * 1.7;
    for (const x of [px - 14, px + 14]) B.post(x, beam - 4, 0, 5, OAK);
    B.f(B.rect(px - 18, beam - 8, 36, 7), OAK[1]).f(B.rect(px - 18, beam - 8, 36, 2), OAK[2], .9);
    for (const x of [px - 7, px + 7]) { B.f(B.rect(x - 1.6, beam - 18, 3.2, 12), IRON[1]); for (let y = beam - 17; y < beam - 6; y += 2.4) B.s(`M${x - 1.6} ${y}l3.2 1`, IRON[0], .6); B.s(`M${x - 6} ${beam - 18}h12`, IRON[0], 1.4); }
    B.f(B.rect(px - 11, beam + 10, 22, 6), OAK[0]);
    B.f(B.rect(px - 11, beam + 16, 22, -beam - 30), '#b8803e'); for (let x = px - 10; x < px + 11; x += 3.6) B.s(`M${x} ${beam + 16}v${-beam - 30}`, OAK[1], 1.3);
    B.f(B.rect(px - 16, -14, 32, 5), OAK[1]).f(B.rect(px - 16, -14, 32, 1.4), OAK[2]).s(`M${px + 16} -11l4 3`, OAK[1], 1.6).f(B.ell(px + 21, -7, 3, 1.2), '#c8a050', .8);
    // the stillage and the casks, ends toward us: staves, two iron hoops, a chalked mark, a spigot on the bottom pair
    B.f(B.rect(-36, -10, 50, 4), OAK[1]).f(B.rect(-36, -10, 50, 1.2), OAK[2]); for (const x of [-32, 10]) B.f(B.rr(x - 4, -6, 8, 6, 1), STONE.rockLo).f(B.rect(x - 4, -6, 8, 1.4), STONE.rockHi);
    const cask = (x, y, R) => { B.f(B.circ(x + 1.2, y + 1.2, R), OAKC[3], .6).f(B.circ(x, y, R), B.rad(x - R * .35, y - R * .35, R * 1.4, [[0, OAKC[2]], [.6, OAKC[0]], [1, OAKC[1]]])); for (let k = -2; k <= 2; k++) { const yy = y + k * R * .36, w = Math.sqrt(Math.max(0, R * R - (k * R * .36) ** 2)); B.s(`M${x - w} ${yy}h${w * 2}`, OAKC[1], .6, .7); } B.s(B.circ(x, y, R - .8), IRON[1], 1.6).s(B.circ(x, y, R * .62), IRON[1], 1, .7).f(B.ell(x - R * .3, y - R * .5, R * .3, R * .12), '#ffffff', .2); };
    cask(-24, -20, 11); cask(0, -20, 11); cask(-12, -38, 10);
    for (const x of [-24, 0]) B.f(B.rect(x - 1.4, -14, 2.8, 4), '#8a8478').f(B.rect(x - 2.6, -12, 5.2, 1.6), '#b4ac98');
    B.s('M-6 -48l6 2M-16 -42l3 -3', '#f2f0e8', .7, .8);
    B.f(B.ell(-24, -1, 3, 1), '#6a3a2a', .5).f(B.circ(-24, -6, .8), '#c8a050', .9);
    // a basket of windfalls by the press, a few apples rolled away
    B.f(B.ell(16, -3, 8, 4), '#a8844e').s('M8 -4q8 3 16 0', '#7a5a30', .8); for (let i = 0; i < 6; i++) B.f(B.circ(11 + r() * 10, -6 - r() * 3, 2), i % 2 ? '#c83a2a' : '#9ab83a');
    for (let i = 0; i < 3; i++) B.f(B.circ(-38 + r() * 10, 1 + r() * 3, 1.8), '#c8a030');
    B.tufts(r, -38, 1, 6, 5, grass(s), 6).tufts(r, 52, 1, 6, 5, grass(s), 6);
  } };
  Object.assign(M.SIGHT_KIT, { shingleRoof, drum, SLATE, lichenDots });
})();
