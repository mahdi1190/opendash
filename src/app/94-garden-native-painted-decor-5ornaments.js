/* Painted decorations: ornaments (carved, mossy garden stone; painted tin and
 * wood), planters (weathered timber, terracotta, flowers spilling over) and
 * wildlife homes (rough timber, bark, straw). Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('ornaments', (function () {
  // one carved garden stone for every statue: pale face upper left, deep shade right, moss in the hollows
  const ST = ['#bdb7a8', '#99927f', '#dcd6c6', '#736c5c'], MOSS = ['#7d8f4e', '#a3b06a', '#5f723c'], WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'];
  const stoneBody = (B, d, x0, x1) => B.f(d, B.lin(x0, 0, x1, 0, [[0, ST[2]], [.45, ST[0]], [1, ST[3]]]));
  const moss = (B, r, x, y, rx, ry, season) => { if (season === 'winter') { B.f(sceneDraw.blob(r, x, y, rx, ry * .8, 7, .4), '#f4f6f8', .9); return; } B.f(sceneDraw.blob(r, x, y, rx, ry, 7, .45), MOSS[0], .85).f(sceneDraw.blob(r, x - rx * .25, y - ry * .25, rx * .5, ry * .45, 6, .45), MOSS[1], .8); };
  const plinth = (B, w, h) => { B.f(B.rr(-w / 2, -h, w, h, 1.6), ST[1]).f(B.rect(-w / 2, -h, w, 1.6), ST[2]).f(B.rect(w / 2 - w * .28, -h + 1.6, w * .28, h - 1.6), ST[3], .45); };
  return {
    scarecrow: { box: [-40, -104, 40, 8], draw(B, o) {
      const { r, H } = o; B.shadow(2, 1, 22, 5, .26);
      B.post(0, -84, 0, 4, WOOD); B.beam(-30, -64, 60, 3.4, WOOD);
      // a patched coat on the cross, straw at the cuffs and hem
      B.f('M-28 -66h56l-6 34h-44z', H.lit(B, -28, 28, '#3f6fa8')).f('M-6 -66h12l-2 34h-8z', '#2f5a8c', .5);
      B.f(B.rr(-14, -52, 9, 8, 1), '#d83a3a', .85).s('M-13 -51l7 6M-6 -51l-7 6', '#f4e4d0', .5).f(B.rr(8, -44, 8, 7, 1), '#e8c33a', .85);
      for (const s of [-1, 1]) for (let i = 0; i < 5; i++) B.s(`M${s * 28} ${-64 + i * 1.4}l${s * (4 + r() * 4)} ${(r() - .5) * 6}`, i % 2 ? '#e8cc78' : '#c9a24a', 1.1);
      for (let i = 0; i < 9; i++) B.s(`M${-20 + i * 5} -32l${(r() - .5) * 3} ${5 + r() * 4}`, i % 2 ? '#e8cc78' : '#c9a24a', 1.1);
      B.f(B.rect(-2, -32, 4, 32), WOOD[1]);
      // a sacking face and a battered hat
      B.f(B.circ(0, -74, 10), '#e8d6a0').f(B.circ(-3, -77, 5), '#f4e6be', .7).f(B.circ(-3.4, -75, 1.3), '#4a3a2c').f(B.circ(3.4, -75, 1.3), '#4a3a2c').s('M-4 -70q4 3 8 0', '#8a5a3a', 1).s('M-5 -70.4l-1 1M5 -70.4l1 1', '#8a5a3a', .6);
      B.f(B.ell(0, -82, 17, 3.4), '#5a4a3e').f('M-9 -82q0 -14 9 -14q9 0 9 14z', '#6a584a').f(B.rect(-9, -86, 18, 2.4), '#b8463a').f(B.ell(-4, -92, 3, 2), '#8a7868', .6);
      B.f(B.ell(20, -60, 4, 2.6), '#2a2622').f(B.circ(23, -62, 2), '#2a2622').f(B.poly([[25, -62], [28, -61], [25, -60.6]]), '#e0a040');   // a crow, unimpressed
      B.tufts(r, 0, 2, 22, 7, o.season);
    } },
    'stone-frog': { box: [-22, -30, 22, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 18, 4, .28);
      stoneBody(B, 'M-17 0q-4 -12 4 -18q13 -6 26 0q8 6 4 18z', -18, 18);
      B.f('M-18 0q-2 -6 4 -7l4 4l-2 3zM18 0q2 -6 -4 -7l-4 4l2 3z', ST[1]);
      for (const s of [-1, 1]) B.f(B.circ(s * 7, -19, 5.2), ST[s < 0 ? 2 : 0]).f(B.circ(s * 7, -19.4, 2.4), ST[3]).f(B.circ(s * 7 - .8, -20.2, .8), '#ffffff', .6);
      B.s('M-8 -9q8 5 16 0', ST[3], 1.2).f(B.ell(-6, -14, 5, 2), ST[2], .6);
      moss(B, r, 10, -7, 7, 2.6, o.season); moss(B, r, -12, -4, 5, 2, o.season); B.tufts(r, 0, 2, 34, 7, o.season);
    } },
    'stone-owl': { box: [-20, -56, 20, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 16, 4, .28); plinth(B, 26, 8);
      stoneBody(B, 'M-12 -8q-3 -20 2 -34q-2 -6 -2 -10l6 4q6 -2 12 0l6 -4q0 4 -2 10q5 14 2 34z', -13, 13);
      B.f('M-12 -10q-2 -16 4 -26q-4 14 -2 26z', ST[1], .8).f('M12 -10q2 -16 -4 -26q4 14 2 26z', ST[3], .6);
      for (const s of [-1, 1]) B.f(B.circ(s * 5, -38, 5), ST[2]).f(B.circ(s * 5, -38, 2.6), ST[3]).f(B.circ(s * 5 - .7, -38.8, .8), '#ffffff', .5);
      B.f(B.poly([[-1.6, -34], [1.6, -34], [0, -30]]), ST[3]);
      for (let i = 0; i < 4; i++) B.s(`M-4 ${-24 + i * 4}q4 2 8 0`, ST[1], .9, .8);
      moss(B, r, -6, -46, 6, 2.6, o.season); moss(B, r, 8, -9, 6, 2.4, o.season); B.tufts(r, 0, 2, 30, 6, o.season);
    } },
    flamingo: { box: [-20, -66, 22, 6], draw(B, o) {
      const { r, H } = o; B.shadow(2, 1, 12, 3, .22);
      B.s('M-1 0v-30M4 0l-1 -12l-4 -4', '#2f3438', 1.3).s('M-1 -30v-0', '#2f3438', 1.3);
      B.f(B.ell(2, -36, 13, 7.4), H.lit(B, -11, 15, '#f27aa8')).f('M-10 -36q-6 -3 -8 2q6 2 10 0z', '#e05a90').f(B.ell(-2, -39, 6, 2.4), '#f8b0cc', .8);
      B.s('M11 -40Q19 -56 10 -61Q3 -63 6 -55', '#f27aa8', 3.8).s('M11 -40Q18 -55 10 -60', '#f8b0cc', 1.2, .7);
      B.f(B.circ(8, -59, 3.2), '#f27aa8').f(B.poly([[6, -57], [2, -52], [4, -56.6]]), '#2f3438').f(B.poly([[7.4, -57.6], [4.6, -55], [6, -58]]), '#f4f1ea').f(B.circ(9, -60, .7), '#2a2622');
      B.tufts(r, 0, 2, 22, 7, o.season);
    } },
    'topiary-peacock': { box: [-40, -96, 40, 8], draw(B, o) {
      const { r, H } = o, L = o.K.leafOf(o.season); B.shadow(2, 1, 32, 6, .26);
      B.f('M-14 0l-3 -14h34l-3 14z', H.lit(B, -17, 17, '#c8693a')).f(B.rect(-18, -16, 36, 3.4), '#d8875a').f(B.rect(-14, -6, 28, 1.4), '#a8502a', .6);
      // clipped box: a tall fanned tail behind, cut into ridges with a row of rounded 'eyes', a plump body, a long neck and a crest
      const fx = -4, fy = -34;
      B.f(`M${fx - 34} ${fy}A34 40 0 0 1 ${fx + 30} ${fy - 8}L${fx + 8} ${fy + 8}z`, L[0]);
      B.f(`M${fx - 30} ${fy - 2}A30 35 0 0 1 ${fx + 24} ${fy - 12}L${fx + 6} ${fy + 4}z`, L[1]);
      for (let i = 0; i < 9; i++) { const a = Math.PI * (1.02 + i / 8 * .78); B.s(`M${fx + 6} ${fy + 4}L${fx + Math.cos(a) * 33} ${fy + Math.sin(a) * 38}`, L[0], 1.4, .8); }
      for (let i = 0; i < 8; i++) { const a = Math.PI * (1.08 + i / 7 * .7), x = fx + Math.cos(a) * 27, y = fy + Math.sin(a) * 31; B.f(B.circ(x, y, 3.6), L[0]).f(B.circ(x - .8, y - .8, 2.4), L[2]).f(B.circ(x - 1, y - 1.2, 1), L[3] || L[2], .8); }
      B.f(sceneDraw.blob(r, fx - 22, fy - 20, 6, 5, 6, .3), L[2], .5);
      B.f(sceneDraw.blob(r, 10, -24, 14, 11, 10, .18), L[0]).f(sceneDraw.blob(r, 8, -26, 11, 8.4, 9, .18), L[1]).f(sceneDraw.blob(r, 4, -29, 5, 3.4, 6, .2), L[2], .85);
      B.s('M17 -30q6 -14 2 -30', L[0], 6).s('M16 -30q5 -12 2 -28', L[1], 3).f(sceneDraw.blob(r, 19, -62, 5.6, 5, 7, .2), L[1]).f(B.circ(17.6, -63.6, 2), L[2]);
      for (const dx of [-3, 0, 3]) B.s(`M19 -66l${dx} -7`, L[0], 1.1).f(B.circ(19 + dx, -73.6, 1.5), L[2]);
      B.f(B.poly([[24, -62], [28, -61], [24, -60]]), '#6a5034');
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'hare-statue': { box: [-24, -82, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(2, 1, 20, 5, .28); plinth(B, 32, 10);
      // a hare sitting up, gazing at the moon: long ears laid back, a pale chest
      stoneBody(B, 'M-14 -10q-6 -18 2 -30q8 -10 14 -4q6 8 4 22q4 6 4 12z', -15, 15);
      B.f('M-10 -10q-2 -6 4 -7q6 1 4 7z', ST[1]).f('M2 -40q4 4 4 12q-6 2 -8 -6z', ST[2], .7);
      B.f(B.ell(6, -50, 7.4, 8.4), ST[0]).f(B.ell(4, -52, 4.6, 5), ST[2], .7).f('M10 -46l5 -1l-1 3z', ST[1]);
      B.f('M2 -57Q-6 -76 -2 -80Q4 -72 6 -57z', ST[0]).f('M3 -58Q-2 -72 0 -77Q3 -70 5 -58z', ST[2], .6).f('M8 -57Q12 -76 18 -78Q16 -66 11 -56z', ST[1]).f('M9 -58Q12 -72 16 -75Q14 -66 10.6 -57z', ST[0], .7);
      B.f(B.circ(9, -51, 1.2), ST[3]).f(B.circ(14.6, -46.6, .9), ST[3]);
      moss(B, r, -10, -12, 7, 2.4, o.season); moss(B, r, 4, -76, 3, 1.6, o.season); B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'gazing-ball': { v: 3, box: [-18, -54, 18, 6], draw(B, o) {
      const { r, H } = o, col = ['#5aa0d8', '#c45fa0', '#d9a03a'][o.v]; B.shadow(1, 1, 12, 3.4, .26);
      stoneBody(B, 'M-9 0q2 -6 4 -8q-2 -10 0 -18h10q2 8 0 18q2 2 4 8z', -9, 9); B.f(B.ell(0, -26, 8, 2.4), ST[0]).f(B.ell(0, -26.6, 6.6, 1.8), ST[2]);
      // the mirror ball: the sky above, the garden curved below, a window of light
      const y = -38; B.f(B.circ(0, y, 12), B.rad(-4, y - 5, 16, [[0, H.shade(col, .55)], [.45, col], [1, H.shade(col, -.45)]]));
      B.f(`M-12 ${y}a12 12 0 0 0 24 0q-12 4 -24 0z`, '#4a7a3a', .4).f(B.ell(-4, y - 5, 4.4, 3), '#ffffff', .75).f(B.ell(5, y + 6, 3, 1.4), '#ffffff', .25);
      B.tufts(r, 0, 2, 22, 6, o.season);
    } },
    'wind-chimes': { box: [-12, -96, 30, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 8, 2.6, .22);
      B.post(-2, -88, 0, 3.2, WOOD).s('M-2 -86q10 -4 20 0', WOOD[1], 2.4).s('M-2 -86q10 -4 20 0', WOOD[2], .8, .7);
      B.tufts(r, -2, 2, 16, 6, o.season);
    }, anim: [{ id: 'chimes', x: 17, y: -85, kind: 'sway', speed: 1.7, amp: .09, box: [-10, -2, 10, 40], draw(B) {
      // a brass ring, five tubes of different lengths, a wooden striker and a sail
      B.s('M0 0v6', '#8a7a60', .6).f(B.ell(0, 7, 8, 2), '#a87c4f').f(B.ell(0, 6.6, 8, 1.4), '#c8a070');
      for (let i = 0; i < 5; i++) { const x = -6 + i * 3, l = 14 + (i % 3) * 5; B.s(`M${x} 8v2`, '#8a7a60', .4).f(B.rr(x - 1, 10, 2, l, .8), '#c98a12').f(B.rect(x - 1, 10, .7, l), '#f0c860', .8); }
      B.s('M0 8v20', '#8a7a60', .4).f(B.circ(0, 22, 2.2), '#a87c4f').f(B.poly([[-3, 30], [3, 30], [2, 38], [-2, 38]]), '#c8a070');
    } }] },
    'welcome-sign': { box: [-30, -60, 30, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 22, 4, .24);
      B.post(-14, -40, 0, 3.4, WOOD).post(14, -40, 0, 3.4, WOOD);
      B.f(B.rr(-25, -56, 50, 22, 4), WOOD[1]).f(B.rr(-24, -57, 48, 21, 4), '#c4a074').f(B.rect(-22, -56, 44, 2), '#e0c498', .8);
      B.text('Welcome', 0, -46.4, 9, '#5a3a2a', 'Georgia, serif', 'italic');
      for (const [x, y, c] of [[-19, -38, '#f2a7c8'], [-15, -37, '#ffffff'], [16, -38, '#f2a7c8'], [20, -37.6, '#f6c445'], [-21, -52, '#f2a7c8'], [20, -53, '#ffffff']]) B.f(B.circ(x, y, 2), c).f(B.circ(x, y, .7), '#e8b040');
      B.s('M-24 -36q4 -3 9 -1M24 -36q-5 -3 -9 -1', '#5e8a44', 1.2);
      B.tufts(r, -14, 2, 12, 5, o.season).tufts(r, 14, 2, 12, 5, o.season).flowers(r, 0, 1, 30, 5, ['#f2a7c8', '#ffffff']);
    } },
    'dc-sleeping-cat': { box: [-28, -26, 28, 6], draw(B, o) {
      const { r, H } = o, c = '#e8903a'; B.shadow(0, 1, 24, 4, .26);
      // a curled ginger cat in painted stone, a cream chest, its tail round its nose
      B.f('M-22 0Q-26 -18 -4 -19Q18 -20 22 -6Q23 0 16 0z', H.lit(B, -24, 22, c));
      B.f('M-6 -18q12 -2 20 6', '#f2b070', .6);
      for (const x of [-2, 6, 13]) B.s(`M${x} -18q2 6 -1 12`, '#c8742a', 1, .6);
      B.f(B.ell(-15, -8, 9, 8), c).f(B.ell(-17, -10, 5, 4), '#f6c088', .7).f('M-22 -13L-21 -21L-16 -15zM-13 -15L-9 -22L-7 -13z', c).f('M-20.6 -15L-20.4 -19L-17.6 -15.6z', '#f4b0a0');
      B.s('M-19 -8q2 1 3 0M-13 -8q2 1 3 0', '#5a3a1a', .9).f(B.circ(-15, -5.6, .9), '#c86a6a');
      B.f('M-24 -2q4 -4 10 -3q10 1 16 -1q-6 5 -16 5q-8 0 -10 -1z', '#d07a2a').f('M-24 -2q2 -2 5 -2l-1 3z', '#fbf5ec');
      B.f(B.ell(4, -2, 8, 2), '#fbf5ec', .8); B.tufts(r, 0, 2, 50, 7, o.season);
    } },
  };
})());

GardenPaintedDecor.add('planters', (function () {
  // weathered timber, terracotta, galvanised tin; flowers spill over the edges
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], OLD = ['#a86a3a', '#80502a', '#c88a58', '#4a2e18'], TERRA = ['#c8693a', '#a04e28', '#e08a5a', '#6a3018'];
  const ST = ['#b5ad9e', '#918a7c', '#d4cebf', '#6f685c'];
  return {
    'hanging-basket': { v: 3, box: [-14, -100, 44, 6], draw(B, o) {
      const { r, H } = o, fl = ['#f27aa8', '#9b7fd1', '#f6c445'][o.v]; B.shadow(4, 1, 12, 3, .22);
      B.f(B.rect(-2.4, -94, 4.8, 94), '#3a4044').f(B.rect(-2.4, -94, 1.4, 94), '#5a6266').f(B.circ(0, -95, 3), '#2f3438');
      B.s('M0 -88h22q4 0 4 4', '#2f3438', 2).s('M2 -84q6 -8 14 -4', '#2f3438', 1.2);
      H.cord(B, 'M24 -84l-12 20M24 -84l12 20M24 -84v20', .5, '#8a8a8a');
      // a wire basket lined with moss, trailing petunias and ivy
      B.f('M8 -64a16 11 0 0 0 32 0z', '#6a5a3a').f('M8 -64a16 11 0 0 0 32 0z', B.lin(8, 0, 40, 0, [[0, '#8a7a50'], [1, '#4a4028']])).f(B.ell(24, -64, 16, 3.4), '#5e7a3c');
      for (let i = 0; i < 5; i++) B.s(`M${10 + i * 7} -64q${(i - 2) * 1.4} 8 ${(i - 2) * 2.6} 10`, '#3a3428', .5, .6);
      for (let i = 0; i < 4; i++) { const x = 9 + i * 10, l = 10 + r() * 14; B.s(`M${x} -60q${(r() - .5) * 8} ${l / 2} ${(r() - .5) * 6} ${l}`, '#4d7a3c', 1.2); B.f(B.circ(x + (r() - .5) * 4, -60 + l, 2), fl).f(B.circ(x, -60 + l * .6, 1.6), fl, .9); }
      H.blooms(B, r, 24, -68, 34, 14, [fl, H.shade(fl, .4), '#ffffff', fl], o.season);
      B.tufts(r, 0, 2, 16, 6, o.season);
    } },
    'old-watering-can': { box: [-24, -40, 32, 6], draw(B, o) {
      const { r, H } = o, c = '#7a9a8a'; B.shadow(2, 1, 20, 4, .26);
      // a dented green can, the spout up and its rose rusty, full of marigolds
      B.s('M10 -14L26 -30', H.shade(c, -.25), 4.4).s('M10 -15L25 -30', H.shade(c, .2), 1.2, .8).f(B.ell(27, -31, 3.2, 4.2), '#a86a3a').f(B.ell(26.4, -31.6, 1.6, 2.4), '#c88a58');
      B.f('M-15 0v-22q12 -3 25 0v22z', H.lit(B, -15, 10, c)).f(B.ell(-2.5, -22, 12.5, 3), H.shade(c, -.3)).f(B.rect(-15, -9, 25, 2), H.shade(c, -.2));
      B.f(B.ell(4, -12, 3, 4), H.shade(c, -.3), .4).f(B.ell(-8, -6, 4, 2), '#a86a3a', .45);
      B.s('M-14 -20q-6 -2 -7 -8q2 -8 8 -6', H.shade(c, -.25), 2.4);
      H.blooms(B, r, -2, -27, 26, 12, ['#f6c445', '#e8903a', '#f6c445', '#f8dc80'], o.season);
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'flower-barrow': { box: [-52, -54, 50, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 44, 6, .26);
      // a wooden flower barrow, parked for good: a spoked wheel, legs, two handles, a load of flowers
      B.s('M-30 -12L-48 -24M-30 -6L-48 -18', OLD[1], 2.6).s('M-30 -12L-48 -24', OLD[2], .8, .7);
      B.post(-24, -10, 0, 3, OLD);
      B.f('M-32 -30h58l-4 22h-50z', OLD[1]);
      for (let i = 0; i < 3; i++) B.beam(-32 + i * 1.3, -30 + i * 7.4, 58 - i * 2.6, 6.4, OLD);
      B.f(B.rect(-30, -30, 3, 22), OLD[3], .4).f(B.rect(22, -30, 3, 22), OLD[3], .4);
      B.f(B.circ(18, -6, 9), '#3a3a3a').f(B.circ(18, -6, 7.4), OLD[0]).f(B.circ(18, -6, 2), '#3a3a3a');
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI; B.s(`M${18 - Math.cos(a) * 7} ${-6 - Math.sin(a) * 7}L${18 + Math.cos(a) * 7} ${-6 + Math.sin(a) * 7}`, OLD[1], .9); }
      H.blooms(B, r, -16, -36, 30, 18, ['#e87a9a', '#f4b0c4', '#ffffff', '#e87a9a'], o.season);
      H.blooms(B, r, 10, -37, 26, 16, ['#f6c445', '#e87a9a', '#9b7fd1'], o.season);
      B.tufts(r, -10, 2, 60, 9, o.season);
    } },
    'dc-lavender-tub': { box: [-26, -56, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 20, 5, .26);
      // a half barrel: staves, two iron hoops, a crown of lavender spikes
      B.f('M-18 0q-3 -12 -1 -24h38q2 12 -1 24z', B.lin(-19, 0, 19, 0, [[0, '#c4946a'], [.4, '#a87c4f'], [1, '#6a4a2c']]));
      for (let i = 1; i < 6; i++) B.s(`M${-18 + i * 6.2} -24q${(i - 3) * .4} 12 0 24`, '#6a4a2c', .6, .7);
      for (const y of [-20, -5]) B.f(B.rect(-19, y, 38, 2.4), '#4a4448').f(B.rect(-19, y, 38, .8), '#7a7478');
      B.f(B.ell(0, -24, 19, 4), '#5a3e28').f(B.ell(0, -24.4, 16, 3), '#4a3a2a');
      const L = o.K.leafOf(o.season);
      for (let i = 0; i < 22; i++) { const x = (r() - .5) * 32, h = 14 + r() * 16, lean = (x / 16) * 4; B.s(`M${x * .7} -25q${lean / 2} ${-h / 2} ${lean} ${-h}`, L[1], .9, .9); if (o.season !== 'winter') for (let k = 0; k < 4; k++) B.f(B.ell(x * .7 + lean * (.7 + k * .1), -25 - h * (.7 + k * .1), 1.3, 1.9), k % 2 ? '#8a6ac8' : '#a88ae0'); }
      B.f(sceneDraw.blob(r, 0, -27, 18, 4, 9, .4), L[0], .9);
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'herb-rack': { box: [-26, -54, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 22, 4, .24);
      B.post(-17, -46, 0, 3.6, WOOD).post(17, -46, 0, 3.6, WOOD).beam(-23, -48, 46, 3.6, WOOD).beam(-19, -18, 38, 2.4, WOOD);
      // bunches of herbs hung upside down: sage, thyme, lavender, rosemary, tied with string
      const bunch = (x, cols, l) => { B.s(`M${x} -45v4`, '#d8c8a0', .6); B.f(B.rect(x - 1.6, -42, 3.2, 2), '#c8a878'); for (let i = 0; i < 7; i++) { const dx = (i - 3) * 1.2; B.s(`M${x} -40q${dx} ${l / 2} ${dx * 2.2} ${l}`, cols[i % cols.length], 1.4); B.f(B.ell(x + dx * 2.2, -40 + l, 1.4, 2.2), cols[(i + 1) % cols.length]); } };
      bunch(-12, ['#7aa45a', '#5f8a44'], 16); bunch(-3, ['#9a8ad0', '#6a8a50'], 14); bunch(6, ['#8aa880', '#6a8a6a'], 17); bunch(14, ['#4d7a3c', '#6a9a4a'], 13);
      B.f(B.rr(-14, -24, 8, 6, 1.2), '#c8693a').f(B.rr(6, -24, 7, 6, 1.2), '#e4d8b8').f(sceneDraw.blob(r, -10, -26, 5, 3, 6, .4), '#5e8a44');
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'apple-crate': { box: [-24, -34, 24, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 20, 4, .26);
      // a slatted crate heaped with red and russet apples
      B.f(B.rect(-17, -18, 34, 18), WOOD[3]);
      for (let i = 0; i < 3; i++) B.beam(-17, -18 + i * 6.2, 34, 4.8, ['#b08a58', '#8a6a40', '#d0aa78']);
      B.f(B.rect(-17, -18, 3, 18), '#8a6a40').f(B.rect(14, -18, 3, 18), '#6a5034').text('APPLES', 0, -9.6, 4.2, '#5a3a20', 'Georgia, serif', 'bold');
      const ap = (x, y, c) => B.f(B.circ(x, y, 4.6), c).f(B.circ(x - 1.4, y - 1.6, 1.8), '#ffffff', .3).s(`M${x} ${y - 4}l.6 -2`, '#4a3a2c', .8);
      for (const [x, y, c] of [[-11, -20, '#c8382e'], [-3, -21, '#d8453a'], [5, -20, '#a8902e'], [12, -20, '#c8382e'], [-7, -25, '#d84a3a'], [2, -26, '#c8382e'], [9, -25, '#e0603a'], [-2, -30, '#d8453a']]) ap(x, y, c);
      B.f(B.ell(5, -30, 2.6, 1.2), '#5e8a44'); ap(20, -2, '#c8382e');
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'rw-orn-marker': { box: [-20, -60, 26, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 16, 4, .26);
      B.stone(r, -9, -3, 7, 5, ST, ['#7d8f4e', '#a3b06a']).stone(r, 9, -2, 6, 4, ST, null);
      B.post(0, -46, 0, 7, ['#8a6642', '#6a4a2c', '#b08a5e']);
      B.f(B.poly([[-3.5, -46], [0, -50], [3.5, -46]]), '#b08a5e').s('M-2 -30h4M-2 -26h4', '#4a3420', .8);
      B.tufts(r, 0, 2, 30, 7, o.season);
    }, anim: [{ id: 'flag', x: 3.5, y: -44, kind: 'flutter', speed: 5, amp: .1, box: [0, -2, 22, 12], draw(B) { B.f('M0 0q10 -2 20 1l-3 4.4l3 4.4q-10 -2 -20 0z', '#d8453a').f('M0 0q10 -2 20 1l-1 1q-10 -2 -19 0z', '#f07a60', .7); } }] },
    'rw-orn-sheaf': { box: [-24, -54, 24, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 20, 4, .26);
      // three sheaves of reed stood up to dry, bound with twine, seed heads at the top
      const sheaf = (x, h, w) => { for (let i = 0; i < 14; i++) { const dx = (i / 13 - .5) * w, top = -h + Math.abs(dx) * .8; B.s(`M${x + dx * .6} 0q${dx * .2} ${top / 2} ${x + dx - x - dx * .6 + dx * .4} ${top}`, i % 3 ? '#c9b870' : '#a8984e', 1.3); }
        for (let i = 0; i < 6; i++) B.f(B.ell(x + (i - 2.5) * w / 6, -h + 1 + Math.abs(i - 2.5) * .8, 1.2, 3), '#8a6a3a'); B.f(B.rect(x - w * .32, -h * .42, w * .64, 2.6), '#7a5636'); };
      sheaf(-11, 34, 10); sheaf(11, 32, 10); sheaf(0, 42, 12);
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },
    'rw-orn-urn': { box: [-22, -60, 22, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 16, 4, .26);
      B.f(B.rr(-12, -6, 24, 6, 1.2), ST[1]).f(B.rect(-12, -6, 24, 1.4), ST[2]).f(B.rect(-4, -14, 8, 8), ST[1]).f(B.ell(0, -14, 6, 1.6), ST[0]);
      B.f('M-14 -32q0 14 8 18h12q8 -4 8 -18z', B.lin(-14, 0, 14, 0, [[0, ST[2]], [.45, ST[0]], [1, ST[3]]])).f(B.ell(0, -32, 15, 3.4), ST[0]).f(B.ell(0, -32, 12, 2.4), '#4a3a2a');
      for (let i = 0; i < 4; i++) B.s(`M${-9 + i * 6} -28q1 6 0 10`, ST[1], .7, .7);
      B.crown(r, 0, -38, 12, 9, o.season, 5);
      B.tufts(r, 0, 2, 30, 6, o.season);
    } },
    'rw-yard': { box: [-48, -40, 48, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 44, 6, .26);
      // your timber, stone and pegs: a plank stack, a heap of stones, a bundle of stakes
      const plank = ['#8a6642', '#6a4a2c', '#b08a5e'];
      for (let i = 0; i < 3; i++) { const w = 38 - i * 6, x = -40 + i * 2; B.beam(x, -8 - i * 7, w, 6.6, i % 2 ? ['#a87c4f', '#8a6640', '#c89a68'] : plank); B.f(B.ell(x + w, -4.7 - i * 7, 1.6, 3.3), '#d8bd8e').s(`M${x + w} ${-5.6 - i * 7}a1 1.2 0 1 0 .1 0`, '#a88a5a', .4); }
      B.stone(r, 12, -5, 11, 6, ST, null).stone(r, 24, -6, 8, 5, ST, ['#7d8f4e', '#a3b06a']).stone(r, 18, -13, 7, 4.4, ST, null);
      for (let i = 0; i < 5; i++) { const x = 34 + i * 2.2; B.post(x, -26 + (i % 2) * 3, 0, 2.4, ['#c9a26a', '#a8824a', '#e0c08a']).f(B.poly([[x - 1.2, 0], [x + 1.2, 0], [x, 2.4]]), '#a8824a'); }
      B.s('M33 -12h12', '#7a5a3a', 1.2);
      B.tufts(r, 0, 2, 90, 10, o.season);
    } },
  };
})());

GardenPaintedDecor.add('wildlife', (function () {
  // rough timber, bark and straw; something living is always near
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], BARK = ['#7a5636', '#5a3e26', '#9a7448', '#3a2818'];
  return {
    'bug-hotel': { box: [-28, -70, 28, 6], draw(B, o) {
      const { r } = o; B.shadow(1, 1, 24, 5, .26);
      B.f('M-22 0V-44L0 -60L22 -44V0z', WOOD[1]).f('M-20 -2V-43L0 -57L20 -43V-2z', '#3a2a1c');
      B.f(B.poly([[-27, -42], [0, -64], [27, -42], [24, -40], [0, -59], [-24, -40]]), '#6a5034').f(B.poly([[-27, -42], [0, -64], [0, -60], [-24, -40]]), '#8a6a46');
      // rooms of hollow stems, drilled logs, pine cones, bark, straw and terracotta
      const rooms = [[-19, -42, 38, 10], [-19, -31, 18, 13], [1, -31, 18, 13], [-19, -17, 12, 15], [-6, -17, 12, 15], [7, -17, 12, 15]];
      B.f(B.rect(-20, -44, 40, 1.6), WOOD[2]).f(B.rect(-20, -32, 40, 1.4), WOOD[0]).f(B.rect(-20, -18, 40, 1.4), WOOD[0]); B.f(B.rect(-1, -31, 2, 13), WOOD[0]).f(B.rect(-7, -17, 1.4, 15), WOOD[0]).f(B.rect(6, -17, 1.4, 15), WOOD[0]);
      B.cx.save(); B.cx.clip(new Path2D('M0 -56L-19 -43h38z')); for (let i = 0; i < 9; i++) B.f(B.circ(-12 + (i % 5) * 6 + (i > 4 ? 3 : 0), -47 + (i > 4 ? 0 : 3), 2.4), '#c9a26a').f(B.circ(-12 + (i % 5) * 6 + (i > 4 ? 3 : 0), -47 + (i > 4 ? 0 : 3), 1), '#3a2a1c'); B.cx.restore();
      for (let i = 0; i < 8; i++) B.f(B.circ(-15 + (i % 4) * 4, -27 + Math.floor(i / 4) * 5, 1.9), '#d8b878').f(B.circ(-15 + (i % 4) * 4, -27 + Math.floor(i / 4) * 5, .8), '#2a1e14');
      B.f(B.rect(1, -31, 18, 13), '#a87c4f'); for (const [x, y] of [[5, -27], [11, -25], [15, -28], [8, -21]]) B.f(B.circ(x, y, 1.2), '#2a1e14');
      for (let i = 0; i < 3; i++) B.f(B.ell(-13, -13 + i * 4.6, 4, 2.2), '#8a5a2a').s(`M-16 ${-13 + i * 4.6}h6`, '#5a3a1a', .6);
      for (let i = 0; i < 9; i++) B.s(`M-6 ${-16 + i * 1.6}h12`, i % 2 ? '#e0c470' : '#c8a850', 1);
      B.f(B.rect(7, -17, 12, 15), '#c8693a'); for (let i = 0; i < 3; i++) B.f(B.circ(10 + (i % 2) * 6, -13 + i * 4, 2), '#4a2410');
      B.f(B.ell(9, -36, 2.4, 1.8), '#d83a2a').f(B.circ(9.6, -36.4, .5), '#1a1a1a').f(B.circ(8.4, -35.6, .5), '#1a1a1a');   // a ladybird, checking in
      B.tufts(r, 0, 2, 44, 8, o.season);
    } },
    'hedgehog-house': { box: [-30, -32, 30, 6], draw(B, o) {
      const { r, H } = o; B.shadow(1, 1, 28, 5, .26);
      // a dome of woven twigs heaped with dry leaves, a dark round door
      B.f('M-26 0A26 24 0 0 1 26 0z', H.lit(B, -26, 26, '#7a5636'));
      for (let i = 0; i < 9; i++) B.s(`M${-24 + i * 6} 0q${(i - 4) * -.6} -14 ${(i - 4) * -1.8} ${-18 + Math.abs(i - 4) * 2.4}`, i % 2 ? '#c9a26a' : '#5a3e26', 1.4, .9);
      for (let i = 0; i < 4; i++) B.s(`M-24 ${-4 - i * 5}q24 ${-8 + i} 48 0`, '#9a7448', 1, .8);
      const lv = o.season === 'winter' ? ['#f4f6f8', '#e4eaee'] : ['#c86a2a', '#d89a3a', '#a8502a', '#8a8a3a'];
      for (let i = 0; i < 16; i++) { const a = Math.PI * (1.05 + r() * .9), rr = 20 + r() * 6; B.f(B.ell(Math.cos(a) * rr, -2 + Math.sin(a) * rr * .92, 3.6, 1.8), lv[i % lv.length], .95); }
      B.f('M-8 0a8 8 0 0 1 16 0z', '#2a2018').f('M-7 0a7 6 0 0 1 4 -5.6', '#4a3a2a', .5);
      B.tufts(r, 0, 2, 60, 9, o.season);
    } },
    'play-coop': { box: [-50, -66, 50, 8], draw(B, o) {
      const { r, H } = o; B.shadow(0, 2, 46, 6, .26);
      const T = ['#b5763e', '#8a5428', '#d09a60', '#5a3418'];
      B.post(-27, -10, 0, 4, T).post(27, -10, 0, 4, T);
      // a timber coop on legs, a red roof, a ramp, a nest-box window with an egg
      B.f(B.rect(-31, -38, 62, 30), T[1]); for (let i = 0; i < 5; i++) B.beam(-31, -38 + i * 6, 62, 5.4, T);
      B.f(B.rr(-21, -26, 14, 16, 1.2), '#3a2c20').f(B.rect(-21, -26, 14, 3), '#2a2018');
      B.f(B.rr(8, -32, 16, 10, 1.2), '#3a2c20').f(B.ell(16, -24.6, 3, 2.2), '#f4e6b0').f(B.ell(15, -25.4, 1.2, .8), '#ffffff', .7);
      B.f('M-38 -36l38 -22l38 22z', '#a8342a').f('M-38 -36l38 -22l0 4l-34 20z', '#d8453a').f(B.rect(-38, -38, 76, 3), '#8a2a22');
      for (let i = 0; i < 4; i++) B.s(`M${-28 + i * 6} ${-38 - i * 3.4}l${32 - i * 4} 0`, '#8a2a22', .5, .5);
      B.s('M-21 -8L-40 6', T[1], 4).s('M-21 -9L-40 5', T[2], 1.2, .8); for (let i = 0; i < 4; i++) B.s(`M${-25 - i * 4} ${-5 + i * 3}l2 2`, T[3], .8);
      // a hen pottering at the foot
      B.f(B.ell(34, -6, 7, 5.4), '#c87a3a').f(B.circ(39, -12, 3.2), '#c87a3a').f(B.poly([[42, -12], [45, -11], [42, -10]]), '#e8b040').f('M38 -15q1 -3 3 -1q1 -2 2 0', '#d8453a').f('M27 -8q-3 -6 2 -6l3 3z', '#8a4a2a').s('M33 -1v3M36 -1v3', '#e8b040', .9);
      B.tufts(r, 0, 2, 90, 10, o.season);
    } },
    'butterfly-bush': { box: [-30, -76, 30, 6], draw(B, o) {
      const { r } = o, L = o.K.leafOf(o.season); B.shadow(1, 1, 24, 5, .26);
      // a buddleia: arching stems behind, each ending in a long purple cone that leans out, a leafy mound over their feet
      const tips = [[-26, -46, -1.1], [-17, -60, -.6], [-5, -66, -.2], [8, -64, .25], [19, -56, .7], [27, -42, 1.15]];
      for (const [x, y, a] of tips) {
        B.s(`M${x * .2} -24Q${x * .5} ${y - 6} ${x} ${y}`, L[0], 1.6).f(sceneDraw.blob(r, x * .7, y + 8, 5, 2.4, 6, .3), L[1], .9);
        if (o.season === 'winter') { B.f(B.ell(x, y, 1.6, 3), '#8a7a5a'); continue; }
        const dx = Math.sin(a), dy = -Math.cos(a);
        for (let m = 0; m < 7; m++) { const t = m / 6, px = x + dx * m * 2.2, py = y + dy * m * 2.2, rr = 3.2 - t * 2; B.f(B.circ(px + 1, py + 1, rr), '#6a3a9a').f(B.circ(px, py, rr), m % 2 ? '#a86ad8' : '#9454cc'); }
        B.f(B.circ(x - .8, y - .8, 1.2), '#e0c8f4', .8);
      }
      B.f(sceneDraw.blob(r, 0, -20, 24, 18, 12, .45), L[0]).f(sceneDraw.blob(r, -3, -24, 19, 14, 11, .45), L[1]).f(sceneDraw.blob(r, -9, -30, 9, 6, 8, .45), L[2], .85);
      for (let i = 0; i < 10; i++) { const a = r() * Math.PI * 2, x = Math.cos(a) * 18, y = -22 + Math.sin(a) * 13; B.f(sceneDraw.blob(r, x, y, 5, 2, 5, .3), r() < .5 ? L[2] : L[0], .8); }
      if (o.season === 'summer' || o.season === 'spring') for (const [x, y, c] of [[-24, -64, '#e8803a'], [22, -70, '#f4f0e0']]) B.f(B.ell(x - 2.4, y, 2.6, 3.4), c).f(B.ell(x + 2.4, y, 2.6, 3.4), c).f(B.ell(x - 2, y + 2.6, 1.6, 2), c, .9).f(B.ell(x + 2, y + 2.6, 1.6, 2), c, .9).s(`M${x} ${y - 3}v6`, '#2a2622', .8);
      B.tufts(r, 0, 2, 40, 8, o.season);
    } },
    'moth-sheet': { glow: { w: 80, halo: -64, radius: 100 }, box: [-34, -82, 34, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 30, 5, .24);
      // a white sheet hung between two poles, a lamp above it; moths settle on the cloth at night
      B.post(-26, -70, 0, 3, WOOD).post(26, -70, 0, 3, WOOD); B.s('M-26 -66h52', '#8a7a5a', .9);
      B.f('M-24 -66h48q2 30 -1 58q-12 3 -23 0q-12 4 -23 0q-3 -28 -1 -58z', o.night ? '#fffbe8' : '#f4f0e6').f('M-24 -66h10q-2 30 0 58h-9q-3 -28 -1 -58z', '#ffffff', .5);
      for (let i = 0; i < 4; i++) B.s(`M${-14 + i * 9} -64q1 26 -1 54`, '#d8d0bc', .7, .7);
      B.s('M26 -70q-8 -8 -22 -4', '#4a4a4a', 1.4).f(B.rr(-1, -78, 8, 8, 2), '#3a3a3a');
      H_bulb(B, 3, -70, o.night);
      const moths = o.night ? 7 : 2;
      for (let i = 0; i < moths; i++) { const x = -18 + r() * 36, y = -58 + r() * 40; B.f(B.ell(x - 2.2, y, 2.6, 1.8), '#8a6a3a').f(B.ell(x + 2.2, y, 2.6, 1.8), '#9a7a4a').f(B.ell(x, y, .8, 2), '#5a4228'); }
      B.tufts(r, -26, 2, 12, 5, o.season).tufts(r, 26, 2, 12, 5, o.season);
    } },
    'dc-milk-churns': { box: [-30, -44, 30, 6], draw(B, o) {
      const { r } = o; B.shadow(0, 1, 26, 5, .26);
      // three galvanised churns, waiting for a cart that has stopped coming
      const churn = (x, h, s) => {
        B.f(`M${x - 8 * s} 0v${-h * .55}q${-1 * s} ${-h * .2} ${3 * s} ${-h * .3}h${10 * s}q${4 * s} ${h * .1} ${3 * s} ${h * .3}v${h * .55}z`, B.lin(x - 8 * s, 0, x + 8 * s, 0, [[0, '#dce2e6'], [.35, '#b8c0c6'], [1, '#7a8288']]));
        B.f(B.rect(x - 8 * s, -h * .55, 16 * s, 2), '#8a9298').f(B.rect(x - 8 * s, -4, 16 * s, 2), '#8a9298');
        B.f(B.ell(x, -h * .85, 5.4 * s, 1.6), '#9aa2a8').f(B.rr(x - 4.4 * s, -h - 2, 8.8 * s, 3, 1), '#c8d0d4').f(B.rr(x - 1.6, -h - 4, 3.2, 2.4, 1), '#8a9298');
        B.s(`M${x - 8 * s} ${-h * .5}q${-4 * s} 2 0 5M${x + 8 * s} ${-h * .5}q${4 * s} 2 0 5`, '#7a8288', 1.2);
        B.f(B.ell(x + 3 * s, -h * .3, 2, 4), '#a8a090', .35);
      };
      churn(-14, 34, 1); churn(14, 30, .95); churn(0, 38, 1.05);
      B.tufts(r, 0, 2, 56, 9, o.season);
    } },
  };
  function H_bulb(B, x, y, lit) { if (lit) B.f(B.circ(x, y, 10), B.rad(x, y, 10, [[0, 'rgba(255,236,170,.8)'], [1, 'rgba(255,226,150,0)']])); B.f(B.circ(x, y, 2.6), lit ? '#fff4c8' : '#e8e4d8').f(B.circ(x - .8, y - .8, 1), '#ffffff', .8); }
})());
