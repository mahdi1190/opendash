/* Painted decorations, garden furniture: seats, tables, blankets (the family
 * look: warm oiled timber, painted iron, cotton in soft stripes and checks,
 * a contact shadow and a few tufts at the foot). Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('furniture', (function () {
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], OAK = ['#8a6a46', '#6a5034', '#b08c5e', '#3e3022'], DRIFT = ['#b8ad98', '#8e8470', '#d8d0bc', '#6a6252'];
  const IRONP = ['#3a4044', '#262a2c', '#5a6266'];
  const leg = (B, x1, y1, x2, y2, w, c) => B.s(`M${x1} ${y1}L${x2} ${y2}`, c, w);
  return {
    'swing-seat': { box: [-58, -100, 58, 8], draw(B, o) {
      const { H, r } = o, frame = H.pal('#6f8fa8'); B.shadow(0, 1, 52, 7, .26);
      // the A-frames, back legs paler, a top beam and a striped canopy
      for (const s of [-1, 1]) { leg(B, s * 40, 0, s * 46, -82, 3.4, frame[1]); leg(B, s * 54, -2, s * 46, -82, 3.6, frame[0]); B.s(`M${s * 54} -2L${s * 46} -82`, frame[2], 1, .5); }
      B.beam(-50, -86, 100, 5, frame);
      H.stripes(B, 'M-56 -88l6 -12h100l6 12z', -56, -100, 56, -86, '#f4efe2', '#7a9fb8', 7).f(B.rect(-56, -89, 112, 2.4), '#5f8098', .8);
      for (let i = 0; i < 14; i++) B.f(`M${-56 + i * 8} -88q4 5 8 0z`, i % 2 ? '#7a9fb8' : '#f4efe2');
      B.tufts(r, -46, 2, 14, 5, o.season).tufts(r, 48, 2, 14, 5, o.season);
    }, anim: [{ id: 'seat', x: 0, y: -84, kind: 'sway', speed: 1.1, amp: .045, box: [-40, -2, 40, 60], draw(B) {
      // hung from the beam: chains, a slatted bench with cushions
      for (const s of [-1, 1]) B.s(`M${s * 32} 0v40`, '#8a9094', 1.2).s(`M${s * 32} 0v40`, '#c8ccd0', .5, .7);
      B.f(B.rr(-36, 22, 72, 6, 2), '#efe8d8').f(B.rect(-36, 22, 72, 1.6), '#ffffff', .8);
      B.f(B.rr(-35, 38, 70, 5, 2), '#e4dccb').f(B.rr(-36, 34, 72, 6, 2), '#7a9fb8').f(B.rect(-36, 34, 72, 1.6), '#a8c4d8');
      B.f(B.rr(-34, 26, 30, 10, 4), '#d8a8a0').f(B.rr(4, 26, 30, 10, 4), '#f0e0b8').f(B.ell(-24, 28, 7, 2), '#ffffff', .35).f(B.ell(14, 28, 7, 2), '#ffffff', .35);
      B.f(B.rect(-36, 43, 72, 2), '#a8a090', .6);
    } }] },
    hammock: { v: 3, box: [-58, -70, 58, 8], draw(B, o) {
      const { H, r } = o, col = ['#e8b46a', '#7fb3d8', '#9fc35a'][o.v], p = H.pal(col); B.shadow(0, 2, 48, 6, .24);
      for (const s of [-1, 1]) { B.post(s * 50, -62, 0, 5, WOOD); B.f(B.circ(s * 50, -62, 2.6), WOOD[2]); B.tufts(r, s * 50, 1, 12, 5, o.season); }
      H.cord(B, 'M-50 -52L-34 -40M50 -52L34 -40', 1.1, '#d8c8a0');
      // the hammock: a deep sling, its underside darker, fringe below
      B.f('M-36 -42Q0 -4 36 -42Q0 -18 -36 -42z', p[3]).f('M-36 -42Q0 -10 36 -42Q0 -26 -36 -42z', p[0]);
      H.stripes(B, 'M-36 -42Q0 -10 36 -42Q0 -26 -36 -42z', -36, -44, 36, -12, p[0], '#f4efe2', 6);
      for (let i = 0; i < 16; i++) { const t = i / 15, x = -34 + t * 68, y = -40 + Math.sin(t * Math.PI) * 28; B.s(`M${x} ${y}l${(r() - .5) * 2} 5`, '#f4efe2', .9, .9); }
      B.f(B.rr(-30, -40, 16, 7, 3.4), '#f4efe2').f(B.ell(-23, -39, 5, 1.6), '#ffffff', .6);
      B.f('M8 -30l10 -2l1 4l-10 1z', '#3a6aa8').f('M8 -30l10 -2l.4 1.4l-10 1z', '#ffffff', .5);   // a paperback left open
    } },
    deckchair: { v: 4, box: [-24, -50, 26, 6], draw(B, o) {
      const { H, r } = o, col = ['#e04a3a', '#3a6fc4', '#f2b33a', '#3f8f5a'][o.v]; B.shadow(2, 1, 20, 5, .26);
      leg(B, -14, 0, 8, -44, 3, WOOD[1]); leg(B, 14, 0, -4, -24, 3, WOOD[0]); leg(B, -2, -14, 18, -18, 2.4, WOOD[0]);
      H.stripes(B, 'M-10 -6L6 -42L13 -40L0 -6z', -10, -44, 13, -4, '#f4f1ea', col, 3);
      leg(B, -12, -2, 10, -46, 2.6, WOOD[0]); B.s('M-12 -2L10 -46', WOOD[2], .8, .7); leg(B, 16, -2, -2, -26, 2.6, WOOD[2]);
      B.f(B.rect(-15, -2, 30, 2), WOOD[3], .4);
      B.tufts(r, 0, 2, 26, 6, o.season);
    } },
    'picnic-blanket': { v: 3, box: [-60, -40, 60, 6], draw(B, o) {
      const { H, r } = o, col = ['#d83a3a', '#3a6fc4', '#3f8f5a'][o.v], cx = B.cx;
      B.shadow(0, 0, 58, 6, .14);
      // a gingham cloth laid on the grass in perspective, a little rumpled
      const quad = 'M-56 -2Q-30 0 0 -1Q30 -3 56 -2L44 -28Q10 -27 -44 -28z';
      cx.save(); cx.clip(new Path2D(quad)); B.f(B.rect(-60, -30, 120, 32), '#f6f0e4');
      for (let i = -8; i <= 8; i++) B.f(B.poly([[i * 7.4 - 3, -1], [i * 7.4 + 3, -1], [i * 6 + 2.4, -29], [i * 6 - 2.4, -29]]), col, .5);
      for (let j = 0; j < 5; j++) B.f(B.rect(-60, -28 + j * 6, 120, 3), col, .5);
      B.f(B.rect(-60, -30, 120, 32), B.lin(0, -28, 0, 0, [[0, 'rgba(255,255,255,.12)'], [1, 'rgba(60,40,30,.12)']])); cx.restore();
      B.f('M44 -28l12 26l-6 1z', H.shade(col, -.3), .6);
      // a wicker basket, a plate of sandwiches, a bottle
      B.f(B.rr(-36, -26, 22, 13, 2), '#b08850').f(B.rect(-36, -26, 22, 3), '#d0a868'); for (let i = 0; i < 4; i++) B.s(`M-36 ${-21 + i * 2.6}h22`, '#8a6a3a', .5, .7);
      B.s('M-33 -26q8 -12 16 0', '#8a6a3a', 1.6).f(B.rect(-30, -28, 9, 3), '#f4f1ea');
      B.f(B.ell(6, -12, 9, 3.2), '#f6f6f2').f(B.ell(6, -12.6, 6.6, 2), '#e4e0d8').f(B.poly([[1, -14], [8, -15.5], [6, -11]]), '#f0dca0').f(B.poly([[5, -13], [12, -15], [11, -11]]), '#e8d090');
      B.f(B.rr(24, -24, 4, 12, 1.6), '#5a8a6a').f(B.rect(25, -27, 2, 4), '#3a5a44').f(B.rect(24.6, -22, 1.2, 8), '#ffffff', .4);
      B.f(B.circ(-8, -22, 2.4), '#d84a3a').f(B.circ(-4, -21, 2.2), '#e8b040');
    } },
    'bistro-set': { v: 3, box: [-56, -50, 56, 6], draw(B, o) {
      const { H, r } = o, col = ['#3f6fa8', '#3f8f5a', '#d83a3a'][o.v], p = H.pal(col);
      B.shadow(0, 1, 50, 6, .24);
      const chair = (x, s) => { leg(B, x - 7, 0, x - 8, -18, 1.6, p[1]); leg(B, x + 7, 0, x + 8, -18, 1.6, p[0]); B.f(B.ell(x, -18, 11, 3.4), p[1]).f(B.ell(x, -19, 10, 3), p[0]).f(B.ell(x - 3, -19.6, 5, 1.2), p[2], .7);
        B.s(`M${x + s * 8} -19q${s * 2} -14 ${s * -2} -26M${x + s * 1} -19q0 -12 ${s * -2} -24`, p[0], 1.8).s(`M${x + s * 8} -40q${s * -6} -4 ${s * -10} 2`, p[0], 1.8).s(`M${x + s * 3} -30q${s * 3} -4 ${s * 5} 0`, p[2], 1, .8); };
      chair(-36, -1); chair(36, 1);
      // the round table: a lit top, one stem, three curled feet; two cups and a jam jar of flowers
      B.s('M0 -2v-28', IRONP[0], 2.4).s('M0 -4q-6 0 -9 4M0 -4q6 0 9 4M0 -4v4', IRONP[0], 1.6);
      B.f(B.ell(0, -30, 18, 5.4), p[3]).f(B.ell(0, -31.5, 18, 5), p[0]).f(B.ell(-5, -32.6, 9, 2), p[2], .7);
      for (const x of [-8, 7]) B.f(B.rr(x - 2.6, -38, 5.2, 5, 1.4), '#f6f2ea').f(B.ell(x, -38, 2.6, .9), '#7a5030').s(`M${x + 2.6} -36.4q2 .6 0 2`, '#f6f2ea', .9);
      B.f(B.rr(-2, -40, 4, 6, 1.2), 'rgba(206,232,236,.7)'); H.blooms(B, r, 0, -43, 9, 7, ['#f4c040', '#ffffff', '#e86a8a'], o.season);
      B.tufts(r, 0, 2, 90, 9, o.season);
    } },
    'play-chair': { box: [-26, -56, 26, 6], draw(B, o) {
      const { H, r } = o; B.shadow(2, 1, 22, 5, .26);
      // an old wooden armchair, the paint worn to the wood, a patched cushion
      const W2 = ['#8a5e36', '#6a4426', '#b08050', '#3e2a18'];
      B.post(-15, -50, 0, 4.4, W2).post(15, -50, 0, 4.4, W2).f(B.rr(-17, -54, 34, 6, 2.4), W2[0]).f(B.rect(-17, -54, 34, 1.6), W2[2]);
      for (const x of [-8, 0, 8]) B.post(x, -48, -22, 3, W2);
      B.f(B.rr(-20, -24, 40, 6, 2), W2[1]).f(B.rr(-20, -25, 40, 4, 2), W2[0]).f(B.rect(-20, -25, 40, 1.2), W2[2]);
      B.post(-18, -22, 0, 3.4, W2).post(18, -22, 0, 3.4, W2).s('M-18 -10h36', W2[1], 2);
      B.f(B.rr(-21, -36, 6, 3, 1.4), W2[0]).f(B.rr(15, -36, 6, 3, 1.4), W2[0]).post(-18, -34, -25, 2.4, W2).post(18, -34, -25, 2.4, W2);
      B.f(B.rr(-15, -31, 30, 8, 3.4), '#d8b070').f(B.rr(-15, -31, 30, 3, 2), '#ecd098').f(B.rr(2, -30, 8, 6, 1), '#a86a5a', .8).s('M3 -29.6l6 5M9 -29.6l-6 5', '#f4e4d0', .5);
      B.f(B.rect(-12, -46, 3, 18), '#d8c8a8', .25);
      B.tufts(r, 0, 2, 40, 8, o.season);
    } },
    'driftwood-seat': { box: [-54, -30, 54, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 46, 6, .26);
      B.stone(r, -30, -5, 13, 8, ['#a8a090', '#868070', '#c8c2b0'], o.season === 'winter' ? null : ['#7d8f4e', '#a3b06a']).stone(r, 30, -5, 13, 8, ['#a8a090', '#868070', '#c8c2b0'], null);
      // a bleached log, silvery grain, a knot and a broken branch end
      B.f('M-50 -14q-4 -6 2 -10l96 -2q6 4 2 10z', DRIFT[1]).f('M-50 -16q-3 -5 2 -8l96 -2q4 3 2 8z', DRIFT[0]).f('M-46 -22l90 -2q2 1 1 2l-90 2z', DRIFT[2], .9);
      for (let i = 0; i < 7; i++) B.s(`M${-44 + i * 13} ${-17 - (i % 2)}q6 ${(r() - .5) * 2} 12 0`, DRIFT[3], .5, .6);
      B.f(B.ell(12, -18, 3, 2), DRIFT[3], .6).f(B.ell(12, -18.4, 1.6, 1), DRIFT[2]).f('M40 -22l10 -8l2 2l-8 8z', DRIFT[0]).f(B.ell(-50, -18, 2.6, 4), DRIFT[2]);
      B.tufts(r, -30, 2, 20, 5, o.season).tufts(r, 30, 2, 20, 5, o.season);
    } },
    'dc-tea-table': { box: [-26, -46, 26, 6], draw(B, o) {
      const { H, r } = o; B.shadow(1, 1, 20, 5, .24);
      // a little white table with a lace cloth, a blue teapot, two cups and a cake
      for (const x of [-14, 14]) leg(B, x, 0, x * .9, -22, 2.4, '#e4dccb'); leg(B, -6, -1, -5, -22, 2, '#d0c8b4');
      B.f('M-22 -22q22 6 44 0l-3 -6h-38z', '#fbf5ec').f(B.ell(0, -27, 20, 4), '#ffffff');
      for (let i = 0; i < 9; i++) B.f(B.circ(-19 + i * 4.8, -21.4 + Math.sin(i / 8 * Math.PI) * 1.4, 1.6), '#fbf5ec');
      B.f(B.ell(-4, -33, 7, 6), H.lit(B, -11, 3, '#3a8ac4')).f(B.ell(-4, -38.6, 4, 1.4), '#2a6a9c').f(B.circ(-4, -40.6, 1.4), '#2a6a9c').s('M3 -34q4 -1 6 -5', '#3a8ac4', 1.6).s('M-11 -36q-4 2 -1 6', '#3a8ac4', 1.4).f(B.ell(-7, -35, 2, 1.4), '#ffffff', .6);
      for (const x of [8, 14]) B.f(B.rr(x - 2.4, -31, 4.8, 3.6, 1.2), '#ffffff').f(B.ell(x, -27.4, 3.6, .9), '#e0dcd0').f(B.rect(x - 2.4, -30, 4.8, .8), '#3a8ac4', .7);
      B.f(B.rr(-17, -31, 7, 4, 1), '#f0d0a0').f(B.rect(-17, -31, 7, 1.4), '#f6f2ea').f(B.circ(-13.4, -32, .9), '#d83a4a');
      B.tufts(r, 0, 2, 34, 7, o.season);
    } },
  };
})());
