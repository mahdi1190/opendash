/* Painted decorations, fences and hedges: every one has a front view and a
 * view along the run (rot 1 and 3: the fence goes up the screen, a back post
 * higher than the front one), so a turned fence still reads as a fence and
 * joins its neighbours. Front views overhang their cell a little so a row of
 * them meets. The family look: weathered timber and stone lit from the upper
 * left, grass tufts at every foot. Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('fences', (function () {
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], HAZEL = ['#9a7a4e', '#6a4e2e', '#c0a070', '#4a3420'];
  const STONE = ['#c9c1aa', '#a89f88', '#e4ddc8', '#867d69'], RUIN = ['#c4bca4', '#a39a82', '#ddd6c0', '#7e7662'], MOSS = ['#7d8f4e', '#a3b06a', '#5f723c'];
  const IRON = ['#2f3438', '#1e2224', '#5a6066'], DARK = ['#3a3a42', '#22222a', '#5a5a66'];
  const D = 28;                                     // how far up the screen the far end of a turned run sits (one cell deep)
  // the side view's frame: posts at the near and far end; f(t) gives the point t (0 near .. 1 far) along the run
  const run = t => [0, -t * D];
  const sidePosts = (B, h, pal, w) => { B.post(0, -D - h, -D, w * .85, pal).post(0, -h, 0, w, pal); };
  const tuftsAlong = (B, r, o, n) => { for (let i = 0; i < (n || 3); i++) B.tufts(r, (r() - .5) * 8, -i * D / ((n || 3) - 1) + 1, 8, 3, o.season); };
  const sideShadow = (B) => { B.shadow(2, -D / 2, 9, D / 2 + 4, .18); };
  const PICKET = [['#f4f0e4', '#cfc8b4', '#ffffff'], ['#a8c8e0', '#7a9ab8', '#d0e4f0'], ['#b4c8a8', '#8aa080', '#d4e2c8']];
  return {
    'picket-fence': { v: 3, box: [-28, -40, 28, 6], draw(B, o) {
      const p = PICKET[o.v], r = o.r; B.shadow(0, 1, 26, 3, .2).beam(-26, -26, 52, 3, p).beam(-26, -12, 52, 3, p);
      for (let x = -23; x <= 23; x += 7.6) B.f(B.poly([[x - 2.6, 0], [x - 2.6, -30], [x, -34], [x + 2.6, -30], [x + 2.6, 0]]), p[0]).f(B.rect(x + 1, -30, 1.6, 30), p[1], .7).f(B.rect(x - 2.6, -30, .9, 30), p[2], .7);
      B.tufts(r, 0, 1, 52, 9, o.season);
    }, side: { box: [-12, -D - 40, 12, 6], draw(B, o) {
      const p = PICKET[o.v], r = o.r; sideShadow(B);
      for (const y of [-26, -12]) B.s(`M0 ${y}L0 ${y - D}`, p[1], 3);
      for (let i = 0; i <= 4; i++) { const t = 1 - i / 4, y = -t * D, hh = 34 - t * 2; B.f(B.poly([[-2.4, y], [-2.4, y - hh + 4], [0, y - hh], [2.4, y - hh + 4], [2.4, y]]), p[0]).f(B.rect(.8, y - hh + 4, 1.6, hh - 4), p[1], .7); }
      tuftsAlong(B, r, o);
    } } },
    'wattle-fence': { box: [-28, -40, 28, 6], draw(B, o) {
      const r = o.r; B.shadow(0, 1, 26, 3, .2); for (const x of [-22, -7, 8, 23]) B.post(x, -34, 0, 3, WOOD);
      for (let i = 0; i < 6; i++) B.s(`M-25 ${-6 - i * 4.6}q12 ${i & 1 ? 2 : -2} 25 0q12 ${i & 1 ? -2 : 2} 25 0`, i & 1 ? WOOD[0] : WOOD[2], 3.4).s(`M-25 ${-4.8 - i * 4.6}q12 ${i & 1 ? 2 : -2} 25 0q12 ${i & 1 ? -2 : 2} 25 0`, WOOD[1], 1, .5);
      B.tufts(r, 0, 1, 52, 9, o.season);
    }, side: { box: [-12, -D - 40, 12, 6], draw(B, o) {
      const r = o.r; sideShadow(B); B.post(0, -D - 34, -D, 3, WOOD).post(0, -D / 2 - 34, -D / 2, 3, WOOD);
      for (let i = 0; i < 6; i++) B.s(`M${i & 1 ? 1.4 : -1.4} ${-6 - i * 4.6}L${i & 1 ? -1.4 : 1.4} ${-6 - i * 4.6 - D}`, i & 1 ? WOOD[0] : WOOD[2], 4.4).s(`M2 ${-5 - i * 4.6}L2 ${-5 - i * 4.6 - D}`, WOOD[1], 1, .4);
      B.post(0, -34, 0, 3.4, WOOD); tuftsAlong(B, r, o);
    } } },
    'stone-wall': { box: [-28, -30, 28, 6], draw(B, o) { drywall(B, o, STONE); }, side: { box: [-14, -D - 30, 14, 6], draw(B, o) { drywallSide(B, o, STONE); } } },
    'dc-old-wall': { box: [-28, -34, 28, 6], draw(B, o) { drywall(B, o, RUIN, true); }, side: { box: [-14, -D - 34, 14, 6], draw(B, o) { drywallSide(B, o, RUIN, true); } } },
    'iron-railings': { box: [-28, -44, 28, 6], draw(B, o) {
      const r = o.r; B.shadow(0, 1, 26, 3, .2).s('M-25 -30h50M-25 -6h50', IRON[0], 2).s('M-25 -31h50', IRON[2], .6, .7);
      for (let x = -23; x <= 23; x += 5) { B.s(`M${x} 0v-34`, IRON[0], 1.4).s(`M${x - .4} 0v-34`, IRON[2], .4, .6).f(B.poly([[x - 1.8, -34], [x, -39], [x + 1.8, -34]]), IRON[1]).f(B.circ(x, -34, 1.1), IRON[0]); }
      for (let x = -20.5; x <= 20; x += 10) B.s(`M${x} -30q2.5 -5 5 0`, IRON[0], .9);
      B.tufts(r, 0, 1, 52, 8, o.season);
    }, side: { box: [-10, -D - 44, 10, 6], draw(B, o) {
      const r = o.r; sideShadow(B); B.s(`M0 -30L0 ${-30 - D}M0 -6L0 ${-6 - D}`, IRON[0], 2);
      for (let i = 0; i <= 6; i++) { const y = -(1 - i / 6) * D; B.s(`M0 ${y}v-34`, IRON[0], 1.4).f(B.poly([[-1.6, y - 34], [0, y - 38.4], [1.6, y - 34]]), IRON[1]); }
      tuftsAlong(B, r, o);
    } } },
    'box-hedge': { box: [-30, -40, 30, 6], draw(B, o) {
      const r = o.r, L = o.K.leafOf(o.season); B.shadow(0, 1, 28, 4, .26);
      // clipped box: a flat-topped block of small leaves, lit top, darker face and base
      B.f(B.rr(-27, -34, 54, 34, 6), L[0]).f(B.rr(-27, -36, 54, 14, 6), L[1]);
      for (let i = 0; i < 40; i++) { const x = -25 + r() * 50, y = -34 + r() * 32; B.f(o.D.blob(r, x, y, 3.4, 2.4, 5, .5), y < -24 ? L[2] : r() < .5 ? L[1] : L[0], .85); }
      B.f(B.rr(-26, -37, 52, 5, 3), L[2], .7).f(B.rect(-27, -8, 54, 8), 'rgba(30,40,20,.22)');
      if (o.season === 'winter') B.f(o.D.blob(r, 0, -36, 26, 3, 9, .3), '#f4f8fa', .9);
      B.tufts(r, 0, 1, 56, 8, o.season);
    }, side: { box: [-16, -D - 40, 16, 6], draw(B, o) {
      const r = o.r, L = o.K.leafOf(o.season); sideShadow(B);
      B.f(`M-12 0v-30l3 ${-D - 4}h18l3 ${D + 4}v30z`, L[0]).f(`M-12 -30l3 ${-D - 4}h18l3 ${D + 4}z`, L[1]);
      for (let i = 0; i < 26; i++) { const t = r(), x = (r() - .5) * 20, y = -t * D - r() * 30; B.f(o.D.blob(r, x, y, 3, 2.2, 5, .5), y < -30 - t * D + 10 ? L[2] : L[r() < .5 ? 1 : 0], .85); }
      if (o.season === 'winter') B.f(`M-12 -30l3 ${-D - 4}h18l3 ${D + 4}z`, '#f4f8fa', .85);
      tuftsAlong(B, r, o);
    } } },
    'bamboo-screen': { box: [-30, -64, 30, 6], draw(B, o) {
      const r = o.r; B.shadow(0, 1, 28, 3.4, .22);
      // canes lashed side by side, nodes picked out, cord ties, a few leaves at the top
      for (let i = 0; i < 9; i++) { const x = -26 + i * 6.5, h = 50 + (i % 3) * 3 + r() * 2, c = ['#c9b36a', '#b8a058', '#d8c47c'][i % 3];
        B.f(B.rr(x - 3, -h, 6, h, 2.4), c).f(B.rect(x - 3, -h, 1.6, h), '#ece0a0', .6).f(B.rect(x + 1.6, -h, 1.4, h), '#8f7a3a', .5);
        for (const t of [.3, .62, .9]) B.f(B.rect(x - 3.2, -h * t, 6.4, 1.6), '#8f7a3a', .8).f(B.rect(x - 3.2, -h * t - .6, 6.4, .6), '#f0e4b0', .6);
        B.f(B.ell(x, -h, 3, 1.2), '#e8dca0'); }
      for (const y of [-14, -40]) H_cord(B, `M-30 ${y}h60`);
      for (let i = 0; i < 5; i++) { const x = -22 + r() * 44, y = -54 - r() * 4; B.f(`M${x} ${y}q6 -4 12 -2q-6 3 -12 2z`, o.season === 'autumn' ? '#c8a050' : '#6a9a4a', .9); }
      B.tufts(r, 0, 1, 56, 9, o.season);
    }, side: { box: [-10, -D - 64, 10, 6], draw(B, o) {
      const r = o.r; sideShadow(B);
      for (let i = 0; i <= 5; i++) { const y = -(1 - i / 5) * D, h = 50 + (i % 3) * 3, c = ['#c9b36a', '#b8a058', '#d8c47c'][i % 3]; B.f(B.rr(-3, y - h, 6, h, 2.4), c).f(B.rect(-3, y - h, 1.6, h), '#ece0a0', .6); for (const t of [.3, .62, .9]) B.f(B.rect(-3.2, y - h * t, 6.4, 1.4), '#8f7a3a', .8); }
      tuftsAlong(B, r, o);
    } } },
    'rw-fence-hurdle': { box: [-30, -38, 30, 6], draw(B, o) {
      const r = o.r; B.shadow(0, 1, 28, 3, .22);
      // a hazel hurdle: split rods woven round upright sails, the ends twisted back
      for (let x = -24; x <= 24; x += 8) B.post(x, -32, 1, 2.4, HAZEL);
      for (let i = 0; i < 6; i++) { const y = -4 - i * 5; B.s(`M-28 ${y}q7 ${i & 1 ? 2 : -2} 14 0q7 ${i & 1 ? -2 : 2} 14 0q7 ${i & 1 ? 2 : -2} 14 0q7 ${i & 1 ? -2 : 2} 14 0`, i & 1 ? HAZEL[0] : HAZEL[2], 4).s(`M-28 ${y + 1.4}q14 ${i & 1 ? 2 : -2} 28 0q14 ${i & 1 ? -2 : 2} 28 0`, HAZEL[1], .9, .5); }
      B.s('M-28 -6q-4 -6 0 -12M28 -14q4 -6 0 -12', HAZEL[2], 2.4);
      B.post(-29, -36, 2, 3.6, HAZEL).post(29, -36, 2, 3.6, HAZEL);
      B.tufts(r, 0, 1, 56, 8, o.season);
    }, side: { box: [-12, -D - 38, 12, 6], draw(B, o) {
      const r = o.r; sideShadow(B); B.post(0, -D - 36, -D + 2, 3.2, HAZEL);
      for (let i = 0; i < 6; i++) B.s(`M${i & 1 ? 1 : -1} ${-4 - i * 5}L${i & 1 ? -1 : 1} ${-4 - i * 5 - D}`, i & 1 ? HAZEL[0] : HAZEL[2], 4.4);
      B.post(0, -36, 2, 3.6, HAZEL); tuftsAlong(B, r, o);
    } } },
    'rw-fence-kerb': { box: [-30, -18, 30, 6], draw(B, o) {
      const r = o.r; B.shadow(0, 1, 28, 3, .2);
      // a low line of set stones, each lit on top, moss in the joints
      for (let i = 0; i < 6; i++) { const x = -25 + i * 10, h = 8 + (i * 7 % 3); B.f(B.rr(x - 4.6, -h, 9.2, h, 2.2), [STONE[1], STONE[0]][i % 2]).f(B.rr(x - 4.6, -h, 9.2, 2.4, 1.2), STONE[2], .9).f(B.rect(x + 2.6, -h + 2, 2, h - 2), STONE[3], .35); }
      for (let i = 0; i < 4; i++) B.f(o.D.blob(r, -20 + i * 12 + r() * 4, -1, 3.4, 1.4, 5, .5), MOSS[1], .8);
      B.tufts(r, 0, 2, 58, 9, o.season);
    }, side: { box: [-10, -D - 18, 10, 6], draw(B, o) {
      const r = o.r; for (let i = 0; i < 4; i++) { const y = -(1 - i / 3) * D, h = 8 + (i % 2) * 2; B.f(B.rr(-5, y - h, 10, h, 2.2), [STONE[1], STONE[0]][i % 2]).f(B.rr(-5, y - h, 10, 2.4, 1.2), STONE[2], .9); }
      tuftsAlong(B, r, o);
    } } },
    'rw-fence-rope': { box: [-30, -38, 30, 6], draw(B, o) {
      const r = o.r; B.shadow(0, 1, 28, 3, .2);
      B.post(-26, -32, 1, 5, WOOD).post(26, -32, 1, 5, WOOD).f(B.ell(-26, -32, 2.6, 1.2), WOOD[2]).f(B.ell(26, -32, 2.6, 1.2), WOOD[2]);
      H_cord(B, 'M-24 -27Q0 -15 24 -27'); H_cord(B, 'M-24 -15Q0 -5 24 -15');
      for (const x of [-26, 26]) B.s(`M${x - 3} -27.6h6M${x - 3} -15.6h6`, '#a8946a', 1.6);
      B.tufts(r, -26, 1, 12, 4, o.season).tufts(r, 26, 1, 12, 4, o.season);
    }, side: { box: [-10, -D - 38, 10, 6], draw(B, o) {
      const r = o.r; sideShadow(B); B.post(0, -D - 32, -D + 1, 4.4, WOOD);
      H_cord(B, `M0 -27L0 ${-27 - D}`); H_cord(B, `M0 -15L0 ${-15 - D}`); B.post(0, -32, 1, 5, WOOD); tuftsAlong(B, r, o);
    } } },
    'dc-cottage-gate': { box: [-34, -62, 34, 6], draw(B, o) {
      const r = o.r, P = ['#efe8d8', '#cfc6b0', '#ffffff']; B.shadow(0, 1, 30, 3.4, .22);
      // white pickets between two oak gateposts with ball tops, left just ajar, a rose climbing one post
      B.post(-28, -54, 1, 6, OAK()).post(28, -54, 1, 6, OAK()).f(B.circ(-28, -56, 4), '#8a6642').f(B.circ(28, -56, 4), '#8a6642').f(B.circ(-29.4, -57.4, 1.6), '#b08c5e').f(B.circ(26.6, -57.4, 1.6), '#b08c5e');
      B.beam(-24, -34, 46, 3.4, P).beam(-24, -14, 46, 3.4, P).s('M-22 -12L18 -32', P[1], 2.4);
      for (let x = -21; x <= 19; x += 8) { const h = 44 - Math.abs(x + 1) * .3; B.f(`M${x} 0V${-h}l3 -4l3 4V0z`, P[0]).f(B.rect(x + 4.4, -h, 1.6, h), P[1], .7); }
      B.f(B.rect(22, -24, 4, 3), '#3a3a3a');
      for (let i = 0; i < 6; i++) { const y = -8 - i * 8; B.f(o.D.blob(r, -28 + (i % 2 ? 3 : -3), y, 4, 3, 6, .5), '#4f7a3c'); if (i % 2 === 0 && o.season !== 'winter') B.f(B.circ(-28 + (i % 4 ? 3 : -3), y - 1, 1.8), '#c8352a').f(B.circ(-28.4 + (i % 4 ? 3 : -3), y - 1.4, .7), '#f08a90'); }
      B.tufts(r, 0, 1, 64, 10, o.season);
    }, side: { box: [-12, -D - 62, 12, 6], draw(B, o) {
      const r = o.r, P = ['#efe8d8', '#cfc6b0', '#ffffff']; sideShadow(B);
      B.post(0, -D - 54, -D + 1, 5, OAK()).f(B.circ(0, -D - 56, 3.4), '#8a6642');
      for (let i = 1; i <= 4; i++) { const y = -(1 - i / 5) * D; B.f(`M-2 ${y}v-40l2 -3l2 3v40z`, P[0]).f(B.rect(.6, y - 40, 1.4, 40), P[1], .7); }
      B.post(0, -54, 1, 6, OAK()).f(B.circ(0, -56, 4), '#8a6642'); tuftsAlong(B, r, o);
    } } },
    'dc-crooked-fence': { box: [-34, -56, 34, 6], draw(B, o) {
      const r = o.r; B.shadow(0, 1, 30, 3, .22);
      B.s('M-30 -30Q0 -38 30 -28M-30 -14Q0 -18 30 -12', DARK[0], 2.4).s('M-30 -31Q0 -39 30 -29', DARK[2], .6, .7);
      for (const [x, y, l] of [[-28, -42, -2], [-16, -38, 3], [-5, -46, -3], [7, -36, 2], [18, -44, -1], [28, -38, 4]]) { B.s(`M${x} 0L${x + l} ${y}`, DARK[0], 3).s(`M${x - .8} 0L${x + l - .8} ${y}`, DARK[2], .7, .6).f(`M${x + l - 3.4} ${y}L${x + l} ${y - 8}L${x + l + 3.4} ${y}z`, DARK[1]); }
      for (let i = 0; i < 4; i++) B.s(`M${-26 + i * 16} -2q${(r() - .5) * 6} -10 ${(r() - .5) * 8} -18`, '#4a5a3a', 1, .8);
      B.tufts(r, 0, 1, 64, 10, o.season === 'summer' ? 'autumn' : o.season);
    }, side: { box: [-10, -D - 56, 10, 6], draw(B, o) {
      const r = o.r; sideShadow(B); B.s(`M0 -30L1 ${-30 - D}M0 -14L-1 ${-14 - D}`, DARK[0], 2.4);
      for (let i = 0; i <= 3; i++) { const y = -(1 - i / 3) * D, l = [2, -3, 3, -1][i]; B.s(`M0 ${y}L${l} ${y - 40}`, DARK[0], 3).f(`M${l - 3} ${y - 40}L${l} ${y - 47}L${l + 3} ${y - 40}z`, DARK[1]); }
      tuftsAlong(B, r, o);
    } } },
  };
  function OAK() { return ['#6a4a2a', '#4e3620', '#8a6642', '#3a2814']; }
  function H_cord(B, d) { B.s(d, '#8a7650', 2.6, .9).s(d, '#d8c48e', 1.8).s(d, '#f0e0b0', .5, .7); }
  function drywall(B, o, st, ruin) {
    const r = o.r; B.shadow(0, 1, 27, 4, .22);
    for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) { if (ruin && row === 3 && (i === 0 || i > 3)) continue; const x = -25 + i * 9.6 + (row & 1) * 4, y = -4 - row * 5.6; B.f(o.D.blob(r, x, y + 1.2, 5.4, 3.2, 6, .3), st[3], .5).f(o.D.blob(r, x, y, 5.4, 3.2, 6, .3), r() < .5 ? st[0] : st[1]).f(o.D.blob(r, x - 1.4, y - 1, 3, 1.4, 6, .3), st[2], .6); }
    if (o.season === 'winter') B.f(o.D.blob(r, -4, -24, 24, 2.6, 9, .4), '#f4f8fa', .9);
    else B.f(o.D.blob(r, -12, -24, 10, 3, 7, .5), MOSS[0], .75).f(o.D.blob(r, 10, -24, 7, 2.4, 7, .5), MOSS[1], .7);
    if (ruin) B.s('M-26 -2q-2 -10 2 -22', '#5e8a44', 1.2, .9).f(o.D.blob(r, -24, -22, 4, 3, 6, .5), '#5e8a44', .9);
    B.tufts(r, 0, 2, 54, 9, o.season);
  }
  function drywallSide(B, o, st, ruin) {
    const r = o.r; sideShadow(B);
    for (let i = 0; i < 4; i++) for (let row = 0; row < 4; row++) { if (ruin && row === 3 && i === 1) continue; const y = -(1 - i / 3) * D - 4 - row * 5.6, x = (row & 1) * 1.6 - .8; B.f(o.D.blob(r, x, y + 1.2, 7, 3.2, 6, .3), st[3], .5).f(o.D.blob(r, x, y, 7, 3.2, 6, .3), r() < .5 ? st[0] : st[1]).f(o.D.blob(r, x - 2, y - 1, 3.6, 1.4, 6, .3), st[2], .6); }
    if (o.season !== 'winter') B.f(o.D.blob(r, 0, -24 - D / 2, 4, D / 2, 7, .5), MOSS[0], .6);
    tuftsAlong(B, r, o);
  }
})());
