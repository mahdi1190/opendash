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

  // The orchard wall: a tall old wall at the top of the bee bank, two square boles with skeps, the rope on its ring.
  ART['ld-orchard-wall'] = { box: [-56, -66, 58, 10], draw(B, o) {
    const r = KIT().rng(71), s = o.season, winter = s === 'winter';
    B.shadow(6, 2, 56, 7, .32);
    B.f('M-50 0L-50 -48Q-50 -52 -46 -52L46 -53Q50 -53 50 -49L50 0Z', LIME.rockDk, .9);
    courses(B, r, -50, 50, -50, 0, LIME, '#8a9a4e');
    // the coping: rough stones set on edge along the top
    for (let x = -50; x < 50; x += 4.4 + r() * 1.4) B.f(B.rect(x, -58 + r() * 1.5, 3.8, 7.5), r() < .5 ? LIME.rockLo : LIME.rock).f(B.rect(x, -58, 1.2, 7), LIME.rockHi, .6);
    B.f(B.rect(-51, -51, 102, 2), LIME.rockDk, .45);
    // two bee boles: deep square niches with a lintel stone, a skep in each (empty in winter: the bees are wrapped indoors)
    for (const bx of [-28, 22]) {
      B.f(B.rect(bx - 12, -40, 24, 24), '#4a3c28').f(B.rect(bx - 12, -40, 24, 5), '#2e2418', .6).f(B.rect(bx - 15, -45, 30, 6), LIME.rockLo).f(B.rect(bx - 15, -45, 30, 2), LIME.rockHi, .8);
      B.f(B.rect(bx - 14, -17, 28, 4), LIME.rockHi).f(B.rect(bx - 14, -14, 28, 1.4), LIME.rockDk, .5);
      if (!winter) skep(B, bx, -17, .95, s === 'summer' || s === 'spring' ? [[14, -26], [-15, -30], [9, -36]] : [[12, -24]]);
      else B.f(B.ell(bx, -19, 9, 2), '#d8dee2', .7);
    }
    // lichen, ivy down the east end, a flower or two in the joints
    for (let k = 0; k < 9; k++) B.f(B.blob(r, -46 + r() * 92, -50 + r() * 44, 3 + r() * 3, 1.6 + r(), 6, .5), winter ? '#d8dccf' : LIME.lichen, .55);
    const ivy = winter ? '#4e5e4a' : '#3f5e34';
    for (let k = 0; k < 14; k++) B.f(B.blob(r, 42 + r() * 10, -54 + k * 3.8, 3.6, 2.6, 6, .5), k % 3 ? ivy : '#5f8446', .9);
    if (s === 'spring' || s === 'summer') for (let k = 0; k < 6; k++) B.f(B.circ(-44 + r() * 30, -6 - r() * 10, 1.4), s === 'spring' ? '#f0d24a' : '#c79ac0', .9);
    // Hollin's rope: an iron ring leaded into the face, a weathered coil hanging from it
    B.s(B.ell(2, -40, 3.4, 3.4), '#2f3336', 1.6).f(B.circ(2, -44, 1.6), '#2f3336');
    for (let i = 0; i < 4; i++) B.s(B.ell(2, -27 + i * .8, 8 - i * .6, 9 - i * .5), i % 2 ? '#a8905c' : '#c9b07a', 2.2, .95);
    B.s('M2 -37Q4 -30 0 -20', '#b29a64', 2);
    // tufts at the foot
    B.tufts(r, -40, 0, 20, 6, ['#7c9a4e', '#9a9a52'], 7).tufts(r, 36, 0, 20, 6, ['#7c9a4e', '#9a9a52'], 7);
  } };

  // The folly: a round tower of pale stone on the ridge, a slate cap and a weathervane; a studded door kept locked,
  // and the camera obscura's high window under the cap.
  // (foot: the tower's drum and the growth at its foot; its two layout cells shut a third of a cell of plain grass either side)
  ART['ld-folly'] = { box: [-46, -176, 48, 12], foot: [[-31, 33, 0]], draw(B, o) {
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
    B.f('M-11 0V-28Q-11 -38 0 -38Q11 -38 11 -28V0Z', '#6a4e30').f('M-11 0V-28Q-11 -38 0 -38L0 0Z', '#8a6a44', .6).s('M-11 -28Q-11 -38 0 -38Q11 -38 11 -28', PALE.rockHi, 2.4);
    for (const [x, y] of [[-6, -26], [6, -26], [-6, -14], [6, -14], [-6, -4], [6, -4]]) B.f(B.circ(x, y, 1), '#2f3336');
    B.f(B.rect(-14, -2, 28, 4), PALE.rockLo).f(B.rect(-14, -2, 28, 1.4), PALE.rockHi);
    // lichen and a skirt of long ridge grass round the foot
    for (let k = 0; k < 7; k++) B.f(B.blob(r, -R + 4 + r() * (R * 2 - 8), -20 - r() * 90, 3 + r() * 3, 1.6, 6, .5), s === 'winter' ? '#dfe2da' : PALE.lichen, .5);
    B.tufts(r, -R, 2, 18, 8, ['#8a9a52', '#a8a860'], 9).tufts(r, R, 2, 18, 8, ['#8a9a52', '#a8a860'], 9);
  } };

  // The treehouse: a big sweet chestnut on its own bank of grass and roots at the top of the beach, a plank house in
  // its fork, a ladder that has lost its bottom rungs and a rope swing.
  ART['ld-treehouse'] = { box: [-118, -232, 112, 14], draw(B, o) {
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
    for (const [dx, dy, w] of [[-58, -150, 9], [6, -176, 8], [58, -146, 8]]) B.s(`M${tx} -92Q${tx + dx * .4} ${-92 + (dy + 92) * .6} ${tx + dx} ${dy}`, '#5a4232', w);
    // the crown (bare branches in winter), drawn before the house so the house sits in the fork
    if (leaf) {
      const lobes = []; for (let i = 0; i < 13; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()); lobes.push([tx + Math.cos(a) * 74 * d, -158 + Math.sin(a) * 46 * d, 30 + r() * 14, 22 + r() * 9]); }
      for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x + 4, y + 5, rx, ry, 9, .35), leaf[0]);
      for (const [x, y, rx, ry] of lobes) B.f(B.blob(r, x, y, rx * .86, ry * .84, 9, .35), leaf[1]);
      for (const [x, y, rx, ry] of lobes) if (x < tx + 10 || y < -170) B.f(B.blob(r, x - rx * .25, y - ry * .3, rx * .5, ry * .44, 8, .4), leaf[2], .9);
      for (let i = 0; i < 9; i++) B.f(B.blob(r, tx - 50 + r() * 60, -196 + r() * 30, 7, 5, 6, .5), leaf[3], .85);
      if (s === 'summer') for (let i = 0; i < 20; i++) B.s(`M${tx - 60 + r() * 120} ${-190 + r() * 70}l${(r() - .5) * 4} 7`, '#f0e2a0', 1.4, .9);   // chestnut catkins
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
  ART['ld-clamp'] = { box: [-46, -30, 46, 8], draw(B, o) {
    const r = KIT().rng(83), s = o.season;
    B.shadow(4, 2, 44, 7, .3);
    B.f('M-40 0Q-38 -22 -10 -26Q20 -28 38 -14Q42 -6 40 0Z', '#b08a44');
    B.f('M-40 0Q-38 -22 -10 -26Q4 -27 10 -24Q-14 -18 -20 0Z', '#d8b468', .9);
    for (let k = 0; k < 40; k++) { const x = -36 + r() * 72, y = -2 - r() * 20 * (1 - Math.abs(x) / 44); B.s(`M${x} ${y}l${(r() - .5) * 10} ${(r() - .5) * 3}`, r() < .6 ? '#e8c878' : '#9a7434', .9, .85); }
    for (const x of [-34, 32]) B.f(B.blob(r, x, -6, 10, 6, 7, .4), '#6a7a3c').f(B.blob(r, x - 2, -8, 7, 3, 6, .4), '#8a9a52', .9);
    B.s('M-24 -18Q0 -30 26 -14', '#7a5a2c', 1.2, .6);
    if (s === 'winter') { B.f('M-6 -24Q4 -30 16 -22L10 -12Q2 -16 -6 -14Z', '#6a4e2a'); for (let k = 0; k < 6; k++) B.f(B.circ(-2 + k * 3, -18 + (k % 2) * 2, 2.2), k % 2 ? '#c8442e' : '#e0b23a'); B.f(B.blob(r, -6, -26, 22, 3, 7, .4), '#f4f6f2', .8); }
    else if (s === 'autumn') for (let k = 0; k < 4; k++) B.f(B.circ(30 + k * 3, 2, 2), k % 2 ? '#c8442e' : '#e0b23a', .9);
  } };

  // The cider barrels: three oak casks stacked by the press, iron hoops, a spigot and a drip on the setts.
  ART['ld-barrels'] = { box: [-34, -72, 50, 8], draw(B, o) {
    const r = KIT().rng(89);
    B.shadow(3, 2, 32, 6, .32);
    const cask = (x, y, k) => {
      B.f(rr(x - 13 * k, y - 26 * k, 26 * k, 26 * k, 8 * k), '#7a5434').f(rr(x - 13 * k, y - 26 * k, 10 * k, 26 * k, 6 * k), '#9a7048', .8);
      for (let i = 0; i < 4; i++) B.s(`M${x - 8 * k + i * 5.5 * k} ${y - 25 * k}V${y - 1}`, '#5a3c24', .7, .6);
      for (const h of [.18, .5, .82]) B.f(B.rect(x - 13.4 * k, y - 26 * k * h - 1.6, 26.8 * k, 2.6), '#3a3a3c').f(B.rect(x - 13.4 * k, y - 26 * k * h - 1.6, 26.8 * k, .9), '#7a7c80', .8);
    };
    cask(-14, 0, 1); cask(14, 0, 1); cask(0, -24, .95);
    B.f(B.rect(10, -12, 5, 3), '#4a3a2a').f(B.ell(13, 3, 4, 1.3), '#c8a050', .6);
    for (let k = 0; k < 4; k++) B.f(B.blob(r, -26 + r() * 52, 2 + r() * 4, 3, 1.2, 5, .5), '#8a6a3a', .35);
    // the square's lantern post: an oak post, an iron arm, a pierced tin lantern (lit at night: LIGHTS below)
    B.f(B.rect(26, -66, 4, 66), '#6e5438').f(B.rect(26, -66, 1.4, 66), '#9a7a54', .8).s('M28 -62H42', '#2f3336', 1.6).s('M40 -62V-58', '#2f3336', 1);
    B.f(B.rect(36, -58, 9, 11), '#f2e2a8').f(B.poly([[35, -58], [40.5, -63], [46, -58]]), '#2f3336').f(B.rect(36, -48, 9, 1.6), '#2f3336').s('M38.5 -57V-49M42.5 -57V-49', '#2f3336', .7, .7);
  } };

  // Lit at night, as world point lights (94-garden-native-world.js reads a painted handle's lights): [dx, dy, radius] from the foot.
  const LIGHTS = { 'ld-barrels': [[40, -52, 96]], 'ld-folly': [[0, -112, 70]], 'ld-treehouse': [[-26, -126, 64]] };
  const landmark = GardenPaintedMarks.landmark;
  GardenPaintedMarks.landmark = function (scene, prop, sc, element, W) {
    const h = landmark.apply(this, arguments), list = h && prop && LIGHTS[prop.id];
    if (list) h.lights = list.map(([dx, dy, radius]) => ({ x: h.foot.x + dx, y: h.foot.y + dy, radius }));
    return h;
  };
})();
