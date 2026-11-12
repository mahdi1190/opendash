/* Painted decorations, water features: the cast-iron pump, the sprinkler, the
 * little pond (the family look: deep green-blue water with a pale lip and a
 * bright streak to the upper left, wet dark stone, reeds and moss at the
 * edge). The bird bath, fountain, well and water butt are in
 * 94-garden-native-painted-props.js. Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('water', (function () {
  const STONE = ['#b4ae9c', '#8e8878', '#d6d0c0', '#6a655a'], MOSSP = ['#7d8f4e', '#a3b06a', '#5f723c'];
  const whole = rows => rows;   // the kit paints the moving parts into the icons itself
  const water = (B, d, x0, x1, y0, y1) => B.f(d, B.lin(x0, y0, x1, y1, [[0, '#8cc0c8'], [.35, '#5f98a6'], [1, '#3e6e7c']]));
  return whole({
    'water-pump': { box: [-30, -66, 32, 8], draw(B, o) {
      const { H, r } = o, G = ['#3f6f5a', '#2c5040', '#6a9a82', '#1e3a2c']; B.shadow(4, 1, 24, 6, .28);
      // a stone sink below the spout, wet inside
      B.f(B.rr(4, -14, 26, 13, 3), STONE[1]).f(B.rr(4, -15, 26, 5, 2.4), STONE[0]).f(B.ell(17, -12.6, 10, 2.4), '#4e7e8c').f(B.ell(14, -13, 4, .8), '#cfe6ea', .8).f(B.rect(4, -10, 5, 9), STONE[2], .5);
      // the cast-iron column: a fluted body, a domed cap with a knob, a curved spout, the long handle
      B.f(B.rr(-9, -4, 18, 5, 1.6), G[1]).f(B.rr(-7, -48, 14, 45, 2), H.lit(B, -7, 7, G[0]));
      for (const x of [-3.4, 0, 3.4]) B.s(`M${x} -44v38`, G[3], .6, .5);
      B.f(B.rect(-8, -26, 16, 3), G[1]).f(B.rect(-8, -26, 16, 1), G[2], .7);
      B.f('M-8 -48q0 -9 8 -9q8 0 8 9z', H.lit(B, -8, 8, G[0])).f(B.circ(0, -59, 2.6), G[1]).f(B.circ(-.8, -59.8, 1), G[2]);
      B.f('M6 -38h10q4 0 4 4v6h-4v-5h-10z', G[0]).f('M6 -38h10q2 0 3 1h-13z', G[2], .7).f(B.ell(18, -27.6, 2, .8), G[3]);
      B.s('M-6 -52L-26 -62', G[3], 3.4).s('M-6 -52L-26 -62', G[0], 2.2).s('M-7 -53L-25 -62', G[2], .6, .7).f(B.circ(-26, -62, 2.4), G[1]);
      B.f(B.circ(-6, -52, 2.2), G[1]);
      // a drip, moss at the foot, a tin cup on the sink edge
      B.f(B.ell(18, -23, .9, 1.6), '#cfe6ea', .9).f(B.rr(23, -20, 5, 5, 1), '#a8b0b4').f(B.rect(23, -20, 1.4, 5), '#e0e6e8', .7);
      B.f(o.D.blob(r, -4, -1, 10, 2.4, 7, .5), MOSSP[0], .8).tufts(r, -10, 2, 16, 6, o.season);
    } },
    sprinkler: { box: [-34, -40, 34, 6], draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 12, 3, .22);
      // wet dark grass in a ring, a spike, a yellow body and a green hose curling away
      B.f(B.ell(0, -2, 30, 7), 'rgba(40,70,40,.22)').f(B.ell(-4, -3, 18, 3.4), 'rgba(200,230,236,.25)');
      H.cord(B, 'M4 -2q14 4 22 -1q8 -4 6 3', 2.2, '#4a8a4a');
      B.f(B.rr(-1.4, -12, 2.8, 12, 1), '#8a9094').f(B.rect(-1.4, -12, 1, 12), '#c8ccd0', .7);
      B.f('M-6 -10q0 -7 6 -7q6 0 6 7z', H.lit(B, -6, 6, '#e8c33a')).f(B.rect(-6.4, -11, 12.8, 2.4), '#b8941a').f(B.ell(-2, -15, 2.4, 1.2), '#fff0a8', .7);
      B.tufts(r, -16, 1, 12, 5, o.season).tufts(r, 18, 1, 10, 4, o.season);
    }, anim: [{ id: 'arm', x: 0, y: -18, kind: 'spin', speed: 2.4, box: [-18, -6, 18, 6], draw(B) {
      // the spinning arm and the spray it throws
      B.f(B.rr(-15, -1.4, 30, 2.8, 1.2), '#e8c33a').f(B.rr(-15, -1.4, 30, 1, .5), '#fff0a8', .8).f(B.circ(0, 0, 2.4), '#b8941a');
      for (const s of [-1, 1]) for (let i = 0; i < 4; i++) B.f(B.circ(s * (15 + i * 1.2), s * (-1.6 - i * 1.1), .9 - i * .12), '#e4f4f6', .85 - i * .15);
    } }] },
    'mini-pond': { box: [-62, -66, 62, 8], draw(B, o) {
      const { H, r } = o, L = o.K.leafOf(o.season), winter = o.season === 'winter';
      B.shadow(0, -26, 60, 26, .18);
      // the bank: a dark damp rim, then the water, deeper in the middle, the sky's light upper left
      B.f(o.D.blob(r, 0, -28, 58, 25, 14, .18), '#5a5a3e').f(o.D.blob(r, 0, -29, 54, 22, 14, .16), '#3e5a50');
      water(B, o.D.blob(r, 0, -29, 50, 19, 14, .14), -50, 50, -48, -10);
      if (winter) B.f(o.D.blob(r, -2, -30, 46, 16, 12, .14), '#dfeef2', .78).s('M-30 -34l14 6l10 -8M10 -26l18 -4', '#ffffff', .7, .8);
      B.f(B.ell(-18, -38, 22, 4), '#cfe6ea', .4).f(B.ell(-24, -40, 9, 1.4), '#ffffff', .5);
      // lily pads with a flower or two
      if (!winter) for (const [x, y, rr] of [[14, -24, 6], [24, -30, 4.6], [-6, -20, 4.4], [30, -21, 3.6]]) { B.f(`M${x} ${y}m-${rr} 0a${rr} ${rr * .5} 0 1 0 ${rr * 2} 0a${rr} ${rr * .5} 0 1 0 -${rr * 2} 0zM${x} ${y}l${rr} -${rr * .2}l0 ${rr * .3}z`, L[1]).f(B.ell(x - rr * .3, y - rr * .15, rr * .5, rr * .2), L[3], .55); }
      if (o.season === 'summer' || o.season === 'spring') B.f(B.circ(14, -26, 2.2), '#f4c4d8').f(B.circ(14, -26.4, 1), '#fff4c0').f(B.circ(-6, -21.6, 1.8), '#ffffff').f(B.circ(-6, -21.8, .8), '#f4d040');
      // stones round the edge, front ones larger and lit; reeds at the back right
      const ring = 18; for (let i = 0; i < ring; i++) { const a = Math.PI * 2 * i / ring, x = Math.cos(a) * 54, y = -28 + Math.sin(a) * 23; if (Math.sin(a) < 0) B.stone(r, x, y, 7 + r() * 3, 4 + r() * 2, STONE, r() < .5 ? MOSSP : null); }
      for (let i = 0; i < 9; i++) { const x = 30 + r() * 20, h = 18 + r() * 16; B.s(`M${x} ${-46 + r() * 6}q${(r() - .5) * 4} ${-h * .5} ${(r() - .3) * 6} ${-h}`, i % 2 ? L[1] : L[0], 1.6); if (i % 3 === 0 && !winter) B.f(B.rr(x - 1.4, -46 - h * .8, 2.8, 7, 1.4), '#7a5030'); }
      for (let i = 0; i < ring; i++) { const a = Math.PI * 2 * i / ring, x = Math.cos(a) * 54, y = -28 + Math.sin(a) * 23; if (Math.sin(a) >= 0) B.stone(r, x, y + 2, 8 + r() * 4, 5 + r() * 2, STONE, i % 3 === 0 ? MOSSP : null); }
      B.tufts(r, -40, 0, 20, 7, o.season).tufts(r, 34, 1, 18, 6, o.season).flowers(r, -46, -6, 12, 4, ['#f4f0e0', '#e8c840']);
    }, anim: [{ id: 'ripple', x: -10, y: -30, kind: 'flicker', speed: 1.4, box: [-22, -8, 22, 8], draw(B, o) {
      if (o.season !== 'winter') B.s(B.ell(0, 0, 14, 4.4), '#e4f2f2', .9, .7).s(B.ell(0, 0, 8, 2.4), '#e4f2f2', .7, .55);
    } }] },
  });
})());
