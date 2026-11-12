/* Painted decorations with styles: the earlier painted ones drew one look
 * whatever style you picked, so these rows paint each style (the gnome's four
 * poses, the bench's three paints, the letterbox's three colours, the barrow,
 * the arch, the pots and the planter). Same size as before (scale 1).
 * Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('variants', (function () {
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], IRON = ['#2a2e30', '#4a5054', '#1a1c1e'];
  const leaf = o => o.K.leafOf(o.season);
  return {
    gnome: { v: 4, scale: 1, box: [-22, -50, 26, 6], draw(B, o) {
      const { r, H } = o, pose = o.v; B.shadow(1, 1, 12, 3.4, .26);
      const coat = pose === 1 ? ['#3f8f5a', '#2a6a40'] : pose === 3 ? ['#9a5ac8', '#6a3a98'] : ['#5a8ac8', '#3a5a90'];
      if (pose === 2) {
        // napping: sat down against a stone, hat flopped forward, a little z
        B.stone(r, 10, -5, 9, 6, ['#a8a090', '#868070', '#c8c2b0'], null);
        B.f(B.rr(-12, -4, 8, 4, 1.6), '#4a3a2c').f(B.rr(-4, -4, 8, 4, 1.6), '#4a3a2c');
        B.f('M-8 -2q-2 -12 8 -14q8 2 8 14z', B.lin(-8, 0, 8, 0, [[0, coat[0]], [1, coat[1]]]));
        B.f('M-6 -13q6 10 12 0q-2 -5 -6 -5q-4 0 -6 5z', '#f4f2ec').f(B.circ(0, -18, 5), '#f0c8a8').s('M-3 -18.6q1 .8 2 0M1.2 -18.6q1 .8 2 0', '#3a2a20', .6);
        B.f('M-7 -20q10 -10 16 -2q3 6 6 10q-6 -6 -10 -6q-6 -2 -12 -2z', '#c8402e').f(B.ell(0, -20.4, 7, 2), '#a8342a');
        B.text('z', 12, -28, 6, '#5a6a8a', 'Georgia, serif', 'bold').text('z', 16, -33, 4.4, '#5a6a8a', 'Georgia, serif', 'bold');
        B.tufts(r, 0, 2, 22, 6, o.season); return;
      }
      B.f(B.rr(-7, -4, 6, 4, 1.6), '#4a3a2c').f(B.rr(1, -4, 6, 4, 1.6), '#4a3a2c');
      B.f('M-8 -4q0 -12 8 -14q8 2 8 14z', B.lin(-8, 0, 8, 0, [[0, coat[0]], [1, coat[1]]])).f(B.rect(-8, -8, 16, 2), '#6a4a2a');
      B.f('M-6 -15q6 12 12 0q-2 -6 -6 -6q-4 0 -6 6z', '#f4f2ec').f(B.circ(0, -21, 5), '#f0c8a8').f(B.circ(0, -19.6, 1.4), '#e09a8a');
      B.f('M-7 -23q7 -26 9 -20q5 5 5 2q-6 -4 -14 18z', '#c8402e').f('M-7 -23q4 -14 7 -19l1 2q-3 6 -5 17z', '#e0624a', .8).f(B.ell(0, -23, 7.4, 2), '#a8342a');
      B.f(B.circ(-2, -21.6, .7), '#3a2a20').f(B.circ(2, -21.6, .7), '#3a2a20');
      if (pose === 0) B.s('M7 -13l7 -11', coat[0], 3).f(B.circ(14.6, -25, 2), '#f0c8a8');   // waving
      if (pose === 1) { B.s('M6 -11l6 -3', coat[0], 3).s('M11 -14l14 -30', '#8a6a46', 1.2).s('M25 -44q2 18 -1 38', '#e8e4dc', .5, .9).f(B.circ(24, -6, 1.4), '#d8453a'); }   // fishing
      if (pose === 3) { B.f('M-7 -10l7 2l7 -2v-6l-7 2l-7 -2z', '#c8483a').f('M-6 -10.6l6 1.6v-5.4l-6 -1.6z', '#f6f0e0').f('M6 -10.6l-6 1.6v-5.4l6 -1.6z', '#ece2c8'); }   // reading
      B.tufts(r, 0, 2, 18, 6, o.season);
    } },
    letterbox: { v: 3, scale: 1, box: [-20, -66, 24, 8], draw(B, o) {
      const { r, H } = o, col = ['#c03a2e', '#3f6fa8', '#3f8f5a'][o.v], p = H.pal(col); B.shadow(2, 1, 14, 4, .28);
      // a post box on a timber post: a rounded steel box, the flag up, a letter in the slot
      B.post(0, -44, 0, 4.4, WOOD).f(B.rect(-6, -46, 12, 3), WOOD[1]);
      B.f(B.rr(-13, -62, 26, 17, 8), B.lin(-13, 0, 13, 0, [[0, p[2]], [.4, col], [1, p[3]]])).f(B.rr(-13, -62, 26, 5, 4), p[2], .5);
      B.f(B.rr(-12, -51, 24, 5, 1.6), p[1]).f(B.rect(-8, -55, 9, 1.4), '#2a1a16').f(B.poly([[-6, -55], [2, -57.6], [3, -55]]), '#fbf6ea');
      B.s('M13 -60v-11', '#e8e4dc', 1.6).f(B.rect(13, -72, 7, 4.4), '#f2c432').f(B.rect(13, -72, 7, 1.2), '#ffe680');
      B.f(B.rect(-11, -60, 2.4, 13), '#ffffff', .25);
      B.tufts(r, 0, 1, 24, 8, o.season).flowers(r, 6, 0, 14, 4, ['#f4c040', '#ffffff']);
    } },
    wheelbarrow: { v: 2, scale: 1, box: [-30, -36, 30, 6], draw(B, o) {
      const { r, H } = o, col = ['#5a8a6a', '#c8453a'][o.v], p = H.pal(col); B.shadow(0, 1, 24, 4, .26);
      B.f(B.circ(-16, -6, 6), '#3a3e40').f(B.circ(-16, -6, 2.4), '#8a9094').f(B.circ(-17, -7.4, 1), '#c8ccd0');
      B.s('M-10 -10L24 -4M24 -4l4 -2', WOOD[1], 2.6).s('M8 -10v10M14 -9v9', IRON[1], 1.6);
      B.f('M-22 -24h34l-6 14h-24z', B.lin(-22, 0, 12, 0, [[0, p[2]], [.4, col], [1, p[3]]])).f('M-22 -24h34l-1 3h-33z', p[2]).f(B.ell(-5, -24, 16, 3), '#6a5034');
      H.blooms(B, r, -6, -28, 26, 9, ['#f6c445', '#e0566e', '#9b7fd1', '#ffffff'], o.season);
    } },
    'rose-arch': { v: 3, scale: 1, box: [-56, -110, 56, 8], draw(B, o) {
      const r = o.r, col = [['#f4f1ea', '#cfc8b4', '#ffffff'], ['#3f5a4a', '#2a4034', '#5f7a6a'], ['#2f3438', '#1e2224', '#5a6066']][o.v];
      B.shadow(0, 2, 48, 6, .24);
      B.s('M-38 0v-62q0 -36 38 -36q38 0 38 36v62', col[1], 4.6).s('M-38 0v-62q0 -36 38 -36q38 0 38 36v62', col[0], 3.4).s('M-39 0v-62q0 -37 39 -37', col[2], .9, .7);
      B.s('M-32 0v-62q0 -30 32 -30q32 0 32 30v62', col[0], 1.4, .8);
      for (let y = -12; y > -62; y -= 12) B.s(`M-38 ${y}h6M32 ${y}h6`, col[0], 1.2);
      const L = leaf(o);
      for (let i = 0; i < 18; i++) { const t = i / 17, a = Math.PI * (1 - t), x = Math.cos(a) * 38, y = t < .2 || t > .8 ? -8 - (t < .2 ? t : 1 - t) * 270 : -62 - Math.sin(a) * 36; B.f(o.D.blob(r, x, y, 9, 7, 7, .5), L[0], .95).f(o.D.blob(r, x - 2, y - 2, 6, 4, 6, .5), L[1], .95).f(o.D.blob(r, x - 3, y - 3, 3, 2, 6, .5), L[2], .9); if (o.season !== 'winter' && i % 2 === 0) B.f(B.circ(x + 3, y + 1, 2.6), i % 4 ? '#d8405a' : '#f4c0d0').f(B.circ(x + 2.4, y + .4, 1), '#fff0f4', .7); }
      B.tufts(r, -38, 2, 14, 5, o.season).tufts(r, 38, 2, 14, 5, o.season);
    } },
    'terracotta-pots': { v: 3, scale: 1, box: [-28, -40, 28, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 24, 4, .26);
      // three clay pots of herbs and flowers, each a little worn, moss at one rim
      for (const [x, y, k, i] of [[-13, 0, 1, 0], [12, 0, .82, 1], [-1, 4, .66, 2]]) {
        const fl = [['#e0566e', '#f6c445', '#9b7fd1'], ['#5aa64a', '#f29ac4', '#ffffff'], ['#f29ac4', '#e0566e', '#f6c445']][(o.v + i) % 3];
        H.blooms(B, r, x, y - 22 * k, 20 * k, 12 * k, fl, o.season);
        B.f(`M${x - 9 * k} ${y}L${x - 11 * k} ${y - 16 * k}H${x + 11 * k}L${x + 9 * k} ${y}Z`, B.lin(x - 11 * k, 0, x + 11 * k, 0, [[0, '#e88a5a'], [.45, '#c8693a'], [1, '#8a4424']])).f(B.rr(x - 12 * k, y - 19 * k, 24 * k, 4 * k, 1), '#d87a4a').f(B.rect(x - 12 * k, y - 19 * k, 24 * k, 1.2 * k), '#f0a070', .8);
        if (i === 0) B.f(o.D.blob(r, x - 8, y - 4, 3, 2, 5, .5), '#7d8f4e', .8);
      }
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'planter-box': { v: 3, scale: 1, box: [-60, -46, 60, 6], draw(B, o) {
      const { r, H } = o, fl = [['#f6c445', '#ffffff', '#f08a3a'], ['#e0566e', '#ffffff', '#f29ac4'], ['#7fb3f0', '#ffffff', '#9b7fd1']][o.v];
      B.shadow(0, 1, 54, 5, .26);
      H.blooms(B, r, -28, -24, 54, 18, fl, o.season); H.blooms(B, r, 26, -25, 56, 18, fl, o.season);
      B.f(B.rr(-56, -22, 112, 22, 2), WOOD[1]); for (let i = 0; i < 3; i++) H.plank(B, -56, -22 + i * 7.3, 112, 6.6, WOOD, r);
      for (const x of [-54, 50]) B.f(B.rect(x, -22, 4, 22), WOOD[3], .6);
      B.tufts(r, 0, 2, 110, 10, o.season);
    } },
    bench: { v: 3, scale: 1, box: [-50, -50, 50, 8], draw(B, o) {
      const { r, H } = o, col = ['#9a6a3a', '#3f6f5a', '#5a7f9a'][o.v], p = H.pal(col); B.shadow(0, 2, 46, 6, .26);
      // a slatted garden bench: cast-iron ends with scrolled arms, painted slats lit along their tops
      for (const s of [-1, 1]) { B.s(`M${s * 40} 0q${s * -2} -10 ${s * -1} -22M${s * 36} 0q${s * 3} -8 ${s * 2} -22`, IRON[0], 2.6).s(`M${s * 43} -22q${s * 4} -8 ${s * -2} -12q${s * -6} 0 ${s * -4} 5`, IRON[0], 2.2).s(`M${s * 38} -22v-22`, IRON[0], 2.6); }
      for (let i = 0; i < 3; i++) H.plank(B, -42, -46 + i * 6, 84, 4.4, p, r);
      for (let i = 0; i < 3; i++) H.plank(B, -44, -24 + i * 3.8, 88, 3.4, p, r);
      B.f(B.rect(-44, -13, 88, 2), 'rgba(40,30,20,.2)');
      B.tufts(r, -40, 2, 12, 5, o.season).tufts(r, 40, 2, 12, 5, o.season);
    } },
  };
})());
