/* Painted terrain: the High orchard's landmarks in the terraces' honey limestone (C:/tmp/regions/orchard.md), added
 * to GardenPaintedMarks (94-garden-paint-terrain-2marks.js) so they replace the small classic drawings: the orchard
 * wall with its bee boles, straw skeps and Hollin's coiled rope on an iron ring; the folly, a round tower with a
 * slate cap; the treehouse in a big sweet chestnut, standing on its own grassy root bank above the beach; the apple
 * clamp under straw; the cider barrels. Each draws within its saved footprint's width, so what blocks the feet is
 * what is drawn. Only rendering; nothing runs at load. */
(function () {
  'use strict';
  if (!window.GardenPaintedMarks) return;
  const ART = GardenPaintedMarks.ART, KIT = () => window.GardenPaintTerrainKit;
  const LIME = { rock: '#c9b994', rockLo: '#a8956c', rockHi: '#e4d8b6', rockDk: '#7d6a48', lichen: '#e0c76a' };
  const PALE = { rock: '#d8ccb0', rockLo: '#b6a988', rockHi: '#eee6d0', rockDk: '#7a6e58', lichen: '#d8c86a' };
  // a rounded rectangle as path data (the terrain brush has no rounded box)
  const rr = (x, y, w, h, q) => { q = Math.min(q, w / 2, h / 2); return `M${x + q} ${y}H${x + w - q}Q${x + w} ${y} ${x + w} ${y + q}V${y + h - q}Q${x + w} ${y + h} ${x + w - q} ${y + h}H${x + q}Q${x} ${y + h} ${x} ${y + h - q}V${y + q}Q${x} ${y} ${x + q} ${y}Z`; };
  const leafOf = s => s === 'autumn' ? ['#7a4a1e', '#b8672a', '#d89038', '#ecc060'] : s === 'winter' ? null : s === 'spring' ? ['#3e6a32', '#5a8c40', '#86b25a', '#b8d482'] : ['#355a2c', '#4e7a38', '#76a04e', '#a2c06a'];
  // dry-stone courses: flat stones laid in rows, each lit on its upper face, a darker joint under every course
  function courses(B, r, x0, x1, y0, y1, S, moss) {
    for (let y = y1, row = 0; y > y0 + 2; y -= 6.2, row++) {
      for (let x = x0 + (row & 1) * 4; x < x1 - 2; ) { const w = 7 + r() * 7, ww = Math.min(w, x1 - x); B.f(B.rect(x, y - 6, ww - 1, 5.4), r() < .5 ? S.rock : S.rockLo).f(B.rect(x, y - 6, ww - 1, 1.5), S.rockHi, .7); if (moss && r() < .12) B.f(B.ell(x + ww / 2, y - 5, ww / 2.4, 1.4), moss, .6); x += ww; }
      B.f(B.rect(x0, y - .8, x1 - x0, .8), S.rockDk, .35);
    }
  }
  // a straw skep: coiled bands of straw, a dark door at the foot, a bee or two
  function skep(B, x, y, k, bees) {
    for (let i = 0; i < 6; i++) B.f(B.ell(x, y - 2.6 * k - i * 3.2 * k, (10 - i * 1.4) * k, 2.6 * k), i % 2 ? '#c8a050' : '#ddb968');
    B.f(B.ell(x, y - 21 * k, 2.4 * k, 1.6 * k), '#b08840').f(B.ell(x - 1, y - 1.8 * k, 2.6 * k, 1.5 * k), '#3a2a18');
    if (bees) for (const [dx, dy] of bees) B.f(B.ell(x + dx, y + dy, 1.3, .9), '#3a2c18').f(B.ell(x + dx - .4, y + dy - .9, .9, .5), '#f4f0e0', .8);
  }

  // The orchard wall: the bee wall running on east of the bee boles, the same height, courses and cope (fix round 1: it
  // stood apart as a second, taller block with two more boles of its own), Hollin's rope on its iron ring in the middle,
  // ivy down its east end where it meets the terrace wall again.
  ART['ld-orchard-wall'] = { box: [-76, -64, 78, 10], draw(B, o) {
    const r = KIT().rng(71), s = o.season, winter = s === 'winter', x0 = -72, x1 = 72, top = -48;
    B.shadow(4, 3, 74, 7, .3);
    B.f(B.rect(x0, top, x1 - x0, -top), LIME.rockLo);
    courses(B, r, x0, x1, top, 0, LIME, winter ? null : '#7a8a4a');
    for (let x = x0; x < x1; x += 5 + r() * 2) B.f(B.rect(x, top - 6, 4.6, 7), r() < .5 ? LIME.rock : LIME.rockLo).f(B.rect(x, top - 6, 1.4, 7), LIME.rockHi, .7);
    if (!winter) for (let k = 0; k < 7; k++) B.f(B.blob(r, x0 + 8 + r() * (x1 - x0 - 16), top - 7, 6 + r() * 6, 2, 6, .5), r() < .5 ? '#7c9a4e' : '#a2b45e', .9);
    else B.f(B.rect(x0, top - 8, x1 - x0, 3), '#f4f6f2', .9);
    for (let k = 0; k < 8; k++) B.f(B.blob(r, x0 + 6 + r() * (x1 - x0 - 12), top + 4 + r() * 38, 3 + r() * 3, 1.6 + r(), 6, .5), winter ? '#d8dccf' : LIME.lichen, .55);
    const ivy = winter ? '#4e5e4a' : '#3f5e34';
    for (let k = 0; k < 13; k++) B.f(B.blob(r, x1 - 8 + r() * 9, top - 4 + k * 3.8, 3.6, 2.6, 6, .5), k % 3 ? ivy : '#5f8446', .9);
    // Hollin's rope: an iron ring leaded into a dressed stone, a weathered coil hanging from it, worn shiny where it is held
    B.f(B.rect(-9, -40, 18, 12), LIME.rockHi).f(B.rect(-9, -40, 18, 2), '#f0ead8', .7);
    B.s(B.ell(0, -33, 3.6, 3.6), '#2f3336', 1.8).f(B.circ(0, -37.4, 1.6), '#2f3336');
    for (let i = 0; i < 4; i++) B.s(B.ell(0, -19 + i * .8, 9 - i * .6, 10 - i * .5), i % 2 ? '#a8905c' : '#c9b07a', 2.4, .95);
    B.s('M0 -30Q3 -24 -1 -12', '#b29a64', 2.2).s('M-1 -12q-3 6 1 11', '#b29a64', 1.8);
    // a worn bench stone at its foot, and lavender
    B.f(B.rect(-30, -4, 22, 4), LIME.rock).f(B.rect(-30, -4, 22, 1.2), LIME.rockHi);
    if (!winter) for (let k = 0; k < 8; k++) { const x = x0 + 4 + r() * (x1 - x0 - 8); if (Math.abs(x) < 14) continue; B.tufts(r, x, 2, 6, 5, s === 'summer' ? ['#8a7ab8', '#a898d0', '#6a7a4a'] : ['#7c9a4e', '#8a9a5a'], 5); }
  } };

  // The folly: a round tower of pale stone on the ridge, a slate cap and a weathervane; a studded door kept locked,
  // and the camera obscura's high window under the cap.
  // (round 3 layouts) drawn at the size standard on its 3 x 2 footprint on the ridge: about 2.5 H across and 7 H to the vane
  // (the same drawing, scaled: 1.9 across, 1.6 up), so it stands over the orchard and what you click is the tower
  ART['ld-folly'] = { box: [-88, -282, 92, 20], draw(B, o) {
    B.cx.scale(1.9, 1.6);
    const r = KIT().rng(73), s = o.season, R = 26, top = -128;
    B.shadow(8, 2, 44, 9, .34);
    // the drum: shaded round, lit from the upper left
    B.f(`M${-R} 0L${-R} ${top}L${R} ${top}L${R} 0Q0 8 ${-R} 0Z`, PALE.rockLo);
    B.f(B.rect(-R, top, R * 2, -top), B.lin(-R, 0, R, 0, [[0, PALE.rockHi], [.35, PALE.rock], [.75, PALE.rockLo], [1, PALE.rockDk]]));
    for (let y = -6, row = 0; y > top + 4; y -= 7.4, row++) { B.s(`M${-R} ${y}Q0 ${y + 4} ${R} ${y}`, PALE.rockDk, .8, .3); for (let x = -R + (row & 1) * 5; x < R - 3; x += 9 + r() * 4) B.s(`M${x} ${y + 1.6}l0 ${-5.8}`, PALE.rockDk, .6, .25); }
    // a string course and a corbelled lip under the cap
    B.f(B.rect(-R - 2, top - 4, R * 2 + 4, 6), PALE.rockLo).f(B.rect(-R - 2, top - 4, R * 2 + 4, 2), PALE.rockHi);
    for (let x = -R; x < R; x += 6) B.f(B.rect(x, top + 2, 4, 4), PALE.rockDk, .4);
    // the slate cap: a cone, banded courses of slate, a lead ridge and the weathervane
    B.f(`M${-R - 6} ${top - 2}L0 ${top - 40}L${R + 6} ${top - 2}Q0 ${top + 4} ${-R - 6} ${top - 2}Z`, '#5f6670');
    B.f(`M${-R - 6} ${top - 2}L0 ${top - 40}L-4 ${top - 2}Z`, '#7c848e', .7);
    for (let k = 1; k < 5; k++) { const y = top - 2 - k * 7.6, w = (R + 6) * (1 - k / 5.3); B.s(`M${-w} ${y}Q0 ${y + 2.4} ${w} ${y}`, '#454b54', .9, .7); }
    B.s(`M0 ${top - 40}V${top - 50}`, '#2f3336', 1.4).s(`M-6 ${top - 47}H8`, '#2f3336', 1.2).f(`M8 ${top - 47}l-4 -2.6v5.2z`, '#2f3336');
    if (s === 'winter') B.f(`M${-R - 4} ${top - 4}L0 ${top - 38}L-6 ${top - 4}Z`, '#f4f6f2', .8);
    // the camera's high window, a slit below it, the locked door with iron studs and a worn step
    B.f(rr(-6, top + 10, 12, 16, 6), '#3a3a44').f(rr(-6, top + 10, 12, 4, 2), '#7a6e58', .5).s(rr(-7, top + 9, 14, 18, 7), PALE.rockHi, 1.4, .8);
    B.f(rr(-2.4, -84, 4.8, 13, 2), '#3a3a44');
    // (fix round 1) the door at the size standard: 1.25 H high, about half a figure wide (it was a figure wide and heavy)
    B.f('M-6.5 0V-24Q-6.5 -31 0 -31Q6.5 -31 6.5 -24V0Z', '#6a4e30').f('M-6.5 0V-24Q-6.5 -31 0 -31L0 0Z', '#8a6a44', .6).s('M-7.5 -24Q-7.5 -32.5 0 -32.5Q7.5 -32.5 7.5 -24', PALE.rockHi, 1.6);
    for (const [x, y] of [[-3.4, -21], [3.4, -21], [-3.4, -11], [3.4, -11]]) B.f(B.circ(x, y, .7), '#2f3336');
    B.f(B.rect(-10, -2, 20, 4), PALE.rockLo).f(B.rect(-10, -2, 20, 1.4), PALE.rockHi);
    // lichen and a skirt of long ridge grass round the foot
    for (let k = 0; k < 7; k++) B.f(B.blob(r, -R + 4 + r() * (R * 2 - 8), -20 - r() * 90, 3 + r() * 3, 1.6, 6, .5), s === 'winter' ? '#dfe2da' : PALE.lichen, .5);
    B.tufts(r, -R, 2, 18, 8, ['#8a9a52', '#a8a860'], 9).tufts(r, R, 2, 18, 8, ['#8a9a52', '#a8a860'], 9);
  } };

  // The treehouse: a big sweet chestnut on its own bank of grass and roots at the top of the beach, a plank house in
  // its fork, a ladder that has lost its bottom rungs and a rope swing.
  ART['ld-treehouse'] = { box: [-170, -262, 112, 4],   // (layfix east: the crown's west lobes reach 176 px out; a box at -118 cut them off in a ruled vertical edge)
   draw(B, o) {
    B.cx.translate(0, -12);   // (round 3 layouts: the root bank's foot on the footprint's front edge; it lay 12 px below it, where the feet could stand on it)
    const r = KIT().rng(79), s = o.season, leaf = leafOf(s), tx = -16;
    // the root bank: turf over the sand, roots running out, a few stones
    B.shadow(tx + 10, 4, 92, 12, .3);
    B.f(B.blob(r, tx + 4, 2, 70, 13, 12, .25), s === 'winter' ? '#a6b29a' : s === 'autumn' ? '#9aa65a' : '#8fb05e');
    B.f(B.blob(r, tx + 2, -1, 58, 8, 10, .25), s === 'winter' ? '#bcc5b0' : '#a9bf6c', .7);
    for (let k = 0; k < 6; k++) { const a = Math.PI * (.1 + k / 5 * .8), l = 26 + r() * 30; B.s(`M${tx + Math.cos(a) * 10} -2Q${tx + Math.cos(a) * l * .6} ${2 + Math.sin(a) * 4} ${tx + Math.cos(a) * l} ${4 + Math.sin(a) * 5}`, '#5a4232', 4 - k % 2, .85); }
    B.tufts(r, tx - 40, 6, 24, 8, ['#7c9a4e', '#a9bf6c'], 8).tufts(r, tx + 46, 6, 24, 8, ['#7c9a4e', '#a9bf6c'], 8);
    // the trunk: broad, spiral-furrowed bark, forking into three limbs
    B.f(`M${tx - 17} 0Q${tx - 12} -50 ${tx - 9} -96L${tx + 9} -96Q${tx + 12} -50 ${tx + 19} 0Z`, '#5a4232');
    B.f(`M${tx - 15} 0Q${tx - 10} -50 ${tx - 7} -96L${tx - 1} -96Q${tx - 4} -50 ${tx - 6} 0Z`, '#7a5c44', .7);
    for (let k = 0; k < 7; k++) B.s(`M${tx - 14 + k * 4} -4Q${tx - 6 + k * 3} -40 ${tx + 4 + k * 2} -90`, '#3e2e22', .9, .5);
    for (const [dx, dy, w] of [[-84, -148, 9], [-22, -180, 8], [24, -150, 7]]) B.s(`M${tx} -92Q${tx + dx * .4} ${-92 + (dy + 92) * .6} ${tx + dx} ${dy}`, '#5a4232', w);
    // the crown (bare branches in winter), drawn before the house so the house sits in the fork
    if (leaf) {
      // (fix round 2) the crown spreads west over the mother walk and stops short of the cliff steps east of it: spread evenly
      // round the fork, it stood over the cliff gate, which then showed ghosted through the faded leaves
      const lobes = []; for (let i = 0; i < 13; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()), rx = 30 + r() * 14; lobes.push([Math.min(tx - 22 + Math.cos(a) * 62 * d, tx + 24 - rx), -160 + Math.sin(a) * 48 * d, rx, 22 + r() * 9]); }   // (layfix east: a rounder crown over its own trunk, not spread west over the Mother tree's)
      for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x + 4, y + 5, rx, ry, 9, .35), leaf[0]);
      for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x, y, rx * .86, ry * .84, 9, .35), leaf[1]);
      for (const [x, y, rx, ry] of lobes) if (x < tx + 10 || y < -170) B.f(B.blob(r, x - rx * .25, y - ry * .3, rx * .5, ry * .44, 8, .4), leaf[2], .9);
      for (let i = 0; i < 9; i++) B.f(B.blob(r, tx - 66 + r() * 60, -198 + r() * 30, 7, 5, 6, .5), leaf[3], .85);
      if (s === 'summer') for (let i = 0; i < 20; i++) B.s(`M${tx - 100 + r() * 110} ${-190 + r() * 70}l${(r() - .5) * 4} 7`, '#f0e2a0', 1.4, .9);   // chestnut catkins
      if (s === 'autumn') for (let i = 0; i < 9; i++) B.f(B.circ(tx - 50 + r() * 100, -150 + r() * 40, 2.4), '#9ab040').f(B.circ(tx - 60 + r() * 120, 4 + r() * 6, 1.8), '#7a4a24', .9);
    } else for (let i = 0; i < 16; i++) { const a = -Math.PI * (.15 + r() * .7), l = 40 + r() * 46; B.s(`M${tx} -120l${Math.cos(a) * l} ${Math.sin(a) * l * .9}`, '#6a5444', 2, .8); }
    // the house: a plank platform on the fork, crooked walls, a felt roof, a window with a curtain
    B.f(B.rect(tx - 40, -108, 80, 6), '#6e5438').f(B.rect(tx - 40, -108, 80, 2), '#c4a478', .8);
    for (const x of [-34, 30]) B.s(`M${tx + x} -102L${tx + x * .4} -86`, '#4a3a2c', 3);
    B.f(B.poly([[tx - 28, -108], [tx - 27, -140], [tx + 26, -142], [tx + 28, -108]]), '#9a7a54');
    for (let x = tx - 26; x < tx + 26; x += 7) B.s(`M${x} -108L${x + .6} -140`, '#6e5438', .9, .7);
    B.f(B.poly([[tx - 34, -138], [tx + 1, -162], [tx + 34, -140]]), '#5a4a3e').f(B.poly([[tx - 34, -138], [tx + 1, -162], [tx - 2, -138]]), '#74624e', .7);
    B.f(B.rect(tx - 16, -132, 12, 11), '#3a2a1a').f(B.rect(tx - 16, -132, 5, 11), '#c84a3a', .8).f(B.rect(tx + 6, -128, 12, 20), '#4a3826');
    B.s(`M${tx - 40} -108H${tx + 40}`, '#4a3a2c', 1.2, .8);
    // the ladder (its two bottom rungs gone) and the rope swing from the west limb
    B.s(`M${tx + 30} -104L${tx + 34} -2M${tx + 40} -104L${tx + 44} -2`, '#7a5c3c', 2.2);
    for (let y = -96; y < -24; y += 10) B.s(`M${tx + 31 + (-y) * -.04} ${y}H${tx + 41.5 + (-y) * -.04}`, '#9a7a54', 1.8);
    B.s(`M${tx - 52} -138V-30M${tx - 40} -136V-30`, '#c9b07a', 1.2).f(B.rect(tx - 56, -31, 20, 4), '#8a6a44');
  } };

  // The clamp: a long low mound of straw over the stored apples, turf laid on the ends to hold it down; in winter
  // it is opened and the apples show.
  ART['ld-clamp'] = { box: [-46, -34, 46, 8], draw(B, o) {
    const r = KIT().rng(83), s = o.season;
    // (fix round 2) its yard: earth trodden bare round it from the pass path, loose straw blown about, a crate and a fork
    // left against it, nettles at its back (alone on the grass, it read as a mound set down at the verge)
    B.f(B.blob(r, -2, -2, 42, 4, 10, .3), s === 'winter' ? '#a39a86' : '#a08c62', .4).f(B.blob(r, -6, -2, 32, 3, 9, .3), '#b8a478', .3);   // (faint, and no lower than the mound's own foot: what the feet meet is the mound)
    for (let k = 0; k < 26; k++) { const x = -44 + r() * 88, y = -5 + r() * 5; B.s(`M${x} ${y}l${(r() - .5) * 8} ${(r() - .5) * 2}`, r() < .6 ? '#e0c070' : '#b8924a', .8, .8); }
    if (s !== 'winter') B.tufts(r, -20, -22, 26, 8, ['#4e6a34', '#6a8a44'], 8).tufts(r, 22, -16, 20, 7, ['#4e6a34', '#6a8a44'], 7);
    B.shadow(4, 2, 44, 7, .3);
    B.f('M-40 0Q-38 -22 -10 -26Q20 -28 38 -14Q42 -6 40 0Z', '#b08a44');
    B.f('M-40 0Q-38 -22 -10 -26Q4 -27 10 -24Q-14 -18 -20 0Z', '#d8b468', .9);
    for (let k = 0; k < 40; k++) { const x = -36 + r() * 72, y = -2 - r() * 20 * (1 - Math.abs(x) / 44); B.s(`M${x} ${y}l${(r() - .5) * 10} ${(r() - .5) * 3}`, r() < .6 ? '#e8c878' : '#9a7434', .9, .85); }
    for (const x of [-34, 32]) B.f(B.blob(r, x, -6, 10, 6, 7, .4), '#6a7a3c').f(B.blob(r, x - 2, -8, 7, 3, 6, .4), '#8a9a52', .9);
    B.s('M-24 -18Q0 -30 26 -14', '#7a5a2c', 1.2, .6);
    B.f(rr(30, -10, 16, 11, 1.5), '#9a7448').f(B.rect(30, -10, 16, 2), '#c49a62').s('M30 -5h16', '#6a4e30', .8);   // an apple crate
    if (s === 'autumn' || s === 'summer') for (let k = 0; k < 4; k++) B.f(B.circ(33 + k * 3.4, -11, 2), k % 2 ? '#c8442e' : '#d8b040');
    B.s('M-40 -1L-28 -26', '#6e5438', 2.2).s('M-29 -26l-3 -6M-29 -26l1 -7M-29 -26l4 -5', '#5a5a5e', 1.2);   // a fork against it
    if (s === 'winter') { B.f('M-6 -24Q4 -30 16 -22L10 -12Q2 -16 -6 -14Z', '#6a4e2a'); for (let k = 0; k < 6; k++) B.f(B.circ(-2 + k * 3, -18 + (k % 2) * 2, 2.2), k % 2 ? '#c8442e' : '#e0b23a'); B.f(B.blob(r, -6, -26, 22, 3, 7, .4), '#f4f6f2', .8); }
    else if (s === 'autumn') for (let k = 0; k < 4; k++) B.f(B.circ(30 + k * 3, 2, 2), k % 2 ? '#c8442e' : '#e0b23a', .9);
  } };

  // The cider barrels: three oak casks stacked by the press, iron hoops, a spigot and a drip on the setts.
  ART['ld-barrels'] = { box: [-62, -86, 50, 8], draw(B, o) {   // (fix round 2: two cells wide, the lamp on the west one)
    const r = KIT().rng(89);
    B.shadow(15, 2, 32, 6, .32);
    const cask = (x, y, k) => {
      B.f(rr(x - 13 * k, y - 26 * k, 26 * k, 26 * k, 8 * k), '#7a5434').f(rr(x - 13 * k, y - 26 * k, 10 * k, 26 * k, 6 * k), '#9a7048', .8);
      for (let i = 0; i < 4; i++) B.s(`M${x - 8 * k + i * 5.5 * k} ${y - 25 * k}V${y - 1}`, '#5a3c24', .7, .6);
      for (const h of [.18, .5, .82]) B.f(B.rect(x - 13.4 * k, y - 26 * k * h - 1.6, 26.8 * k, 2.6), '#3a3a3c').f(B.rect(x - 13.4 * k, y - 26 * k * h - 1.6, 26.8 * k, .9), '#7a7c80', .8);
    };
    cask(-2, 0, 1); cask(26, 0, 1); cask(12, -24, .95);
    B.f(B.rect(22, -12, 5, 3), '#4a3a2a').f(B.ell(25, 3, 4, 1.3), '#c8a050', .6);
    for (let k = 0; k < 4; k++) B.f(B.blob(r, -26 + r() * 52, 2 + r() * 4, 3, 1.2, 5, .5), '#8a6a3a', .35);
    // the square's lantern post: an oak post, an iron arm, a pierced tin lantern (lit at night: LIGHTS below)
    // (fix round 2) on the square's side of the stack, a clear stride from the casks (its pole rose out of the barrels), on a
    // stone footing, 1.9 H to the lantern
    B.f(B.ell(-38, 1, 9, 2.6), '#22301a', .28).f(rr(-45, -5, 14, 6, 2), '#a8956c').f(B.rect(-45, -5, 14, 1.6), '#e4d8b6');
    B.f(B.rect(-40, -78, 4, 74), '#6e5438').f(B.rect(-40, -78, 1.4, 74), '#9a7a54', .8).s('M-38 -74H-50', '#2f3336', 1.6).s('M-48 -74V-70', '#2f3336', 1);
    B.f(B.rect(-53, -70, 9, 11), '#f2e2a8').f(B.poly([[-54, -70], [-48.5, -75], [-43, -70]]), '#2f3336').f(B.rect(-53, -60, 9, 1.6), '#2f3336').s('M-50.5 -69V-61M-46.5 -69V-61', '#2f3336', .7, .7);
  } };

  // (round 3 layouts) the High orchard's new places, at the size standard (H, the player after the 0.8 change, about 40 px):
  // the bee boles in the bee wall, the cider press and the orchard bell on the square, the cider board, the cliff pippin.
  // The bee boles: six arched alcoves in a stretch of the bee wall (1.2 H), a straw skep in each, the middle one with a
  // slate where "tell the bees" is scratched, lavender and thyme at the foot.
  ART['ld-bee-boles'] = { box: [-100, -64, 100, 10], draw(B, o) {
    const r = KIT().rng(97), s = o.season, winter = s === 'winter', x0 = -94, x1 = 94, top = -48;
    B.shadow(4, 3, 96, 7, .3);
    B.f(B.rect(x0, top, x1 - x0, -top), LIME.rockLo);
    courses(B, r, x0, x1, top, 0, LIME, winter ? null : '#7a8a4a');
    // the cope: flat stones on edge, turf and stonecrop on top
    for (let x = x0; x < x1; x += 5 + r() * 2) B.f(B.rect(x, top - 6, 4.6, 7), r() < .5 ? LIME.rock : LIME.rockLo).f(B.rect(x, top - 6, 1.4, 7), LIME.rockHi, .7);
    if (!winter) for (let k = 0; k < 9; k++) B.f(B.blob(r, x0 + 8 + r() * (x1 - x0 - 16), top - 7, 6 + r() * 6, 2, 6, .5), r() < .5 ? '#7c9a4e' : '#a2b45e', .9);
    else B.f(B.rect(x0, top - 8, x1 - x0, 3), '#f4f6f2', .9);
    // six alcoves, round headed, with a skep sitting on each sill
    for (let i = 0; i < 6; i++) {
      const cx = x0 + 16 + i * 32.4, sill = -12;
      B.f(`M${cx - 11} ${sill}V${sill - 18}Q${cx - 11} ${sill - 30} ${cx} ${sill - 30}Q${cx + 11} ${sill - 30} ${cx + 11} ${sill - 18}V${sill}Z`, '#3a2e22');
      B.f(`M${cx - 11} ${sill}V${sill - 18}Q${cx - 11} ${sill - 30} ${cx} ${sill - 30}L${cx} ${sill}Z`, '#4a3c2c', .7);
      B.s(`M${cx - 12.5} ${sill}V${sill - 18}Q${cx - 12.5} ${sill - 31.5} ${cx} ${sill - 31.5}Q${cx + 12.5} ${sill - 31.5} ${cx + 12.5} ${sill - 18}V${sill}`, LIME.rockHi, 2, .9);
      B.f(B.rect(cx - 13, sill, 26, 3.4), LIME.rockHi).f(B.rect(cx - 13, sill + 3.4, 26, 1.2), LIME.rockDk, .5);
      skep(B, cx, sill, .82, !winter && (s === 'spring' || s === 'summer') ? [[-9, -22], [8, -18], [12, -26]] : null);
      if (i === 2) B.f(B.rect(cx - 7, sill - 41, 14, 7), '#4a4e56').s(`M${cx - 4.5} ${sill - 37.5}h9`, '#c8ccd0', .8, .8);
    }
    // a worn bench stone under the middle alcoves, and lavender and thyme at the foot
    B.f(B.rect(-22, -4, 44, 4), LIME.rock).f(B.rect(-22, -4, 44, 1.2), LIME.rockHi);
    if (!winter) for (let k = 0; k < 14; k++) { const x = x0 + 4 + r() * (x1 - x0 - 8); if (Math.abs(x) < 24) continue; B.tufts(r, x, 2, 6, 5, s === 'summer' ? ['#8a7ab8', '#a898d0', '#6a7a4a'] : ['#7c9a4e', '#8a9a5a'], 5); }
  } };

  // The cider press (fix round 1: two posts and a slatted cheese against the cottage read as a porch): a free-standing
  // screw press on the square, a heavy oak beam on two posts, the great wooden screw rising through it with its thread cut
  // deep and a long capstan bar through its head, the cheese of pomace in straw under the board, on a round stone bed
  // with a lip and a spout to a tub; baskets of apples waiting beside it. About 2.4 H to the bar.
  ART['ld-press'] = { box: [-26, -104, 50, 8], draw(B, o) {
    const r = KIT().rng(101), s = o.season, X = 10;   // (fix round 2: a stride clear of the cottage's gable; it stood hard against it)
    B.shadow(X + 3, 2, 34, 7, .34);
    B.cx.save(); B.cx.translate(X, 0);
    // the round stone bed, its lip and spout, the tub under the spout
    B.f(B.ell(0, -4, 22, 7), '#8c8270').f(B.ell(0, -7, 22, 7), '#b9ad8f').f(B.ell(0, -7.6, 18, 5), '#9a8e70').f(B.ell(-4, -9, 10, 2.6), '#ddd2b4', .5);
    B.f(B.poly([[20, -6], [30, -3], [30, -1], [20, -3]]), '#8c8270');
    B.f(rr(25, -10, 12, 10, 2), '#7a5434').f(B.rect(24.6, -7.6, 12.8, 1.5), '#3a3a3c').f(B.ell(31, -9.6, 4.6, 1.3), s === 'autumn' || s === 'summer' ? '#c89a3a' : '#5a4a32', .95);
    // the cheese: layers of pomace and straw under the board
    for (let k = 0; k < 4; k++) B.f(rr(-15, -14 - k * 5.4, 30, 4.4, 1.6), s === 'autumn' ? '#a8703a' : '#94703e').f(B.rect(-16, -10.2 - k * 5.4, 32, 1.4), '#e0c070');
    B.f(B.rect(-17, -38, 34, 4.6), '#7a5a38').f(B.rect(-17, -38, 34, 1.4), '#a8865c');
    // two posts and the great beam, pegged through
    for (const x of [-20, 14]) B.f(B.rect(x, -74, 7, 74), '#5e4428').f(B.rect(x, -74, 2.4, 74), '#8e6e48', .85).f(B.rect(x - 1, -2, 9, 3), '#4a3622', .7);
    B.f(B.rect(-24, -80, 48, 10), '#5a4028').f(B.rect(-24, -80, 48, 3), '#8a6a44', .9).f(B.rect(-24, -71, 48, 1.6), '#3a2a18', .6);
    for (const x of [-16.5, 17.5]) B.f(B.circ(x, -75, 1.6), '#2a1e12');
    // the screw: a thick wooden thread from the board up through the beam to its head
    B.f(B.rect(-4.6, -96, 9.2, 58), '#8a6a44').f(B.rect(-4.6, -96, 3, 58), '#b08a5c', .8);
    for (let y = -95; y < -40; y += 4.2) B.s(`M-4.6 ${y}L4.6 ${y + 3}`, '#4a3622', 1.3, .85).s(`M-4.6 ${y + .9}L4.6 ${y + 3.9}`, '#c8a070', .6, .6);
    // its head and the capstan bar through it, worn pale at the ends where hands push
    B.f(rr(-7, -100, 14, 7, 2), '#6a4e30').f(rr(-7, -100, 14, 2.4, 1), '#9a7a54', .9);
    B.s('M-24 -97L28 -95', '#6a4e30', 3.4).s('M-24 -98L28 -96', '#a8865c', 1.1, .8).f(B.circ(-24, -97, 2.4), '#c8a878').f(B.circ(28, -95, 2.4), '#c8a878');
    B.cx.restore();

    // (fix round 2: no baskets beside it: there is no room between the bed, the tub and the gable)
    B.tufts(r, -16, 2, 8, 5, ['#7c9a4e', '#9a9a52'], 5).tufts(r, X + 30, 2, 6, 4, ['#7c9a4e', '#9a9a52'], 4);
  } };

  // The orchard bell: an oak post on a stone footing at the top of the stair, a little shingled hood over a bronze bell,
  // its rope looped on a cleat. About 2 H.
  ART['ld-bell'] = { box: [-26, -92, 26, 8], draw(B, o) {
    const r = KIT().rng(103), s = o.season;
    B.shadow(3, 2, 18, 5, .3);
    B.f(rr(-11, -6, 22, 7, 2), LIME.rockLo).f(B.rect(-11, -6, 22, 2), LIME.rockHi);
    B.f(B.rect(-3, -78, 6, 72), '#6a4e30').f(B.rect(-3, -78, 2, 72), '#9a7a54', .8);
    B.s('M3 -40l5 0', '#3a2e22', 2).s('M3 -36l5 0', '#3a2e22', 2);
    B.f(B.poly([[-20, -70], [0, -86], [20, -70], [16, -68], [0, -80], [-16, -68]]), '#5a4434');
    B.f(B.poly([[-20, -70], [0, -86], [0, -80], [-16, -68]]), '#7a6250', .8);
    for (let k = 0; k < 3; k++) B.s(`M${-17 + k * 3} ${-69 - k * 3.6}L${-3} ${-79 - k * 1.6}`, '#3e2e22', .7, .5);
    B.f('M-9 -50Q-9 -66 0 -67Q9 -66 9 -50L11 -48H-11Z', '#9a7432').f('M-9 -50Q-9 -66 0 -67L-2 -50Z', '#d8b45a', .8).f(B.rect(-11, -49.4, 22, 1.6), '#6a4e22');
    B.f(B.circ(0, -46, 2.2), '#5a4420');
    B.s('M7 -58Q12 -48 7 -38Q4 -30 7 -24', '#c8b07a', 1.4).s('M7 -24q3 6 -1 9', '#c8b07a', 1.2, .9);
    if (s === 'winter') B.f(B.poly([[-20, -71], [0, -87], [20, -71], [0, -83]]), '#f4f6f2', .9);
    else B.tufts(r, -12, 1, 7, 5, ['#7c9a4e', '#9a9a52'], 5).tufts(r, 12, 1, 7, 5, ['#7c9a4e', '#a8a860'], 5);
  } };

  // The cider board: two posts and a little roof over a board of pinned notes, this year's fair chalked large.
  ART['ld-cider-board'] = { box: [-28, -66, 28, 8], draw(B, o) {
    const r = KIT().rng(107), s = o.season;
    B.shadow(3, 2, 24, 5, .3);
    for (const x of [-19, 15]) B.f(B.rect(x, -54, 4, 54), '#6a4e30').f(B.rect(x, -54, 1.3, 54), '#9a7a54', .8);
    B.f(rr(-23, -3, 46, 5, 2), LIME.rockLo).f(B.rect(-23, -3, 46, 1.4), LIME.rockHi);   // (a stone kerb the posts are set in: its foot is the board's foot)
    B.f(B.poly([[-26, -52], [0, -62], [26, -52], [24, -49], [-24, -49]]), '#5a4434').f(B.poly([[-26, -52], [0, -62], [0, -58], [-24, -49]]), '#7a6250', .8);
    B.f(B.rect(-17, -48, 34, 28), '#7a5a3a').f(B.rect(-15.5, -46.5, 31, 25), '#2f3a34');
    B.s('M-12 -41h14M-12 -36h10', '#e8e4d8', 1.2, .85).f(B.circ(8, -39, 3), '#d0a040', .9);
    for (const [x, y, w, h, c] of [[-13, -31, 9, 9, '#efe6cc'], [-2, -32, 8, 10, '#f4e9a8'], [8, -30, 7, 8, '#f0dede']]) { B.f(B.rect(x, y, w, h), c).f(B.circ(x + w / 2, y + 1.2, .9), '#a03a2a'); B.s(`M${x + 1.4} ${y + 3.4}h${w - 3}M${x + 1.4} ${y + 5.6}h${w - 4}`, '#6a6050', .6, .7); }
    if (s === 'winter') B.f(B.poly([[-26, -53], [0, -63], [26, -53], [0, -59]]), '#f4f6f2', .9);
    else B.tufts(r, -18, -1, 6, 4, ['#7c9a4e', '#9a9a52'], 5).tufts(r, 18, -1, 6, 4, ['#7c9a4e', '#9a9a52'], 5);
  } };

  // The cliff pippin: a small wild apple (2.2 H) leaning out to sea from a knuckle of rock and thrift at the cliff top.
  ART['ld-pippin'] = { box: [-70, -116, 76, 12], draw(B, o) {
    const r = KIT().rng(109), s = o.season, T = window.GardenPaintTrees, H = 88;
    B.f(B.blob(r, -4, 1, 24, 6, 9, .3), LIME.rockLo).f(B.blob(r, -8, -1, 15, 4, 8, .3), LIME.rock).f(B.blob(r, -12, -3, 7, 2, 6, .3), LIME.rockHi, .8);
    if (s !== 'winter') for (let k = 0; k < 8; k++) B.f(B.circ(-24 + r() * 44, 2 + r() * 3, 1.3), '#e0a0b8', .9);
    if (!T || !T.canvas) { B.f(B.rect(-3, -50, 6, 50), '#5a4232').f(B.blob(r, 8, -66, 34, 26, 10, .3), leafOf(s) ? leafOf(s)[1] : '#6a5a4a'); return; }
    const m = T.canvas({ species: 'apple', season: s, v: 1, h: H }); if (!m) return;
    T.groundShadow(B.cx, 2, 0, H, { species: 'apple', season: s });
    B.cx.save(); B.cx.rotate(.16);
    B.cx.drawImage(m.c, -m.ox / m.k, -m.oy / m.k, m.c.width / m.k, m.c.height / m.k);
    B.cx.restore();
  } };

  // Lit at night, as world point lights (94-garden-native-world.js reads a painted handle's lights): [dx, dy, radius] from the foot.
  const LIGHTS = { 'ld-barrels': [[-48, -64, 96]], 'ld-folly': [[0, -180, 90]], 'ld-treehouse': [[-26, -126, 64]] };
  const landmark = GardenPaintedMarks.landmark;
  GardenPaintedMarks.landmark = function (scene, prop, sc, element, W) {
    const h = landmark.apply(this, arguments), list = h && prop && LIGHTS[prop.id];
    if (list) h.lights = list.map(([dx, dy, radius]) => ({ x: h.foot.x + dx, y: h.foot.y + dy, radius }));
    return h;
  };
})();
