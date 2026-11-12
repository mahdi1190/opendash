/* Painted pictures of what the crafting bench makes that is not a decoration
 * (things you wear, the music box, the sparkle gloves), so they read on the
 * paper of the bench panel. Same house style: lit from the upper left, soft
 * shade below, no outlines. Registry: 94-garden-native-painted-decor-0kit.js. */
(function () {
  const add = (id, box, draw) => GardenPaintedDecor.addIcon('craft:' + id, { box, draw });
  const daisy = (B, x, y, s, petal, mid) => { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; B.f(B.ell(x + Math.cos(a) * 3.4 * s, y + Math.sin(a) * 3.4 * s, 2.4 * s, 2.4 * s), petal || '#ffffff'); } B.f(B.circ(x, y, 2.2 * s), mid || '#f2b832').f(B.circ(x - .7 * s, y - .7 * s, .8 * s), '#fff0a0', .8); };
  const leaf = (B, x, y, a, l, c) => { const dx = Math.cos(a) * l, dy = Math.sin(a) * l, nx = -dy * .35, ny = dx * .35; B.f(`M${x} ${y}q${dx / 2 + nx} ${dy / 2 + ny} ${dx} ${dy}q${-dx / 2 + nx} ${-dy / 2 + ny} ${-dx} ${-dy}z`, c); };
  // a ring seen a little from above: a back half, then the front half over it
  const ring = (B, rx, ry, w, back, front) => { B.s(`M${-rx} 0a${rx} ${ry} 0 0 1 ${rx * 2} 0`, back, w).s(`M${-rx} 0a${rx} ${ry} 0 0 0 ${rx * 2} 0`, front, w); };
  const shadow = (B, rx) => B.shadow(0, 12, rx, 4, .22);
  add('flower-crown', [-34, -20, 34, 18], (B, o) => { shadow(B, 28); ring(B, 26, 9, 4, '#4f7a3c', '#5e8a44'); const r = o.r; for (let i = 0; i < 9; i++) { const a = Math.PI * (i / 8), x = -Math.cos(a) * 26, y = Math.sin(a) * 9; leaf(B, x, y, a + 1, 6, '#6a9a4a'); daisy(B, x, y - 1, .9 + r() * .2, i % 3 === 2 ? '#f4d040' : '#ffffff'); } });
  add('straw-hat', [-36, -30, 36, 14], (B) => { shadow(B, 30); B.f(B.ell(0, 0, 32, 10), '#d8b45a').f(B.ell(0, -1, 30, 8.6), '#e8c868'); for (let i = 0; i < 5; i++) B.s(B.ell(0, -1, 30 - i * 5, 8.6 - i * 1.4), '#c8a050', .6, .6); B.f('M-17 -2q-1 -22 17 -22q18 0 17 22q-17 5 -34 0z', B.lin(-17, 0, 17, 0, [[0, '#f4d888'], [.5, '#e8c868'], [1, '#b8903a']])); B.f('M-17 -6q17 5 34 0v-5q-17 5 -34 0z', '#c8483a').f('M-17 -6q17 5 34 0v-1.6q-17 5 -34 0z', '#e06a58', .8); daisy(B, 12, -8, .9); });
  add('herb-wreath', [-34, -20, 34, 18], (B, o) => { shadow(B, 28); ring(B, 25, 9, 5, '#4a6a3a', '#5a7a44'); const r = o.r; for (let i = 0; i < 16; i++) { const a = Math.PI * 2 * i / 16, x = Math.cos(a) * 25, y = Math.sin(a) * 9; leaf(B, x, y, a + 1.9, 7, ['#6a9a5a', '#8ab070', '#4f7a40'][i % 3]); leaf(B, x, y, a + 2.6, 5, '#a8c888'); } for (let i = 0; i < 4; i++) B.f(B.circ(-18 + i * 12, 6 + (i % 2) * 2, 1.6), '#9a6ac8'); });
  add('meadow-circlet', [-34, -20, 34, 18], (B, o) => { shadow(B, 28); ring(B, 25, 8, 2.6, '#6a8a4a', '#7a9a52'); const cols = ['#5a7ae0', '#e8483a', '#f4d040', '#ffffff', '#c86ad8']; for (let i = 0; i < 11; i++) { const a = Math.PI * 2 * i / 11, x = Math.cos(a) * 25, y = Math.sin(a) * 8; leaf(B, x, y, a + 2, 5, '#7aa058'); if (y > -3) daisy(B, x, y - 1, .7, cols[i % cols.length], '#f2c040'); } });
  add('beekeeper-hat', [-36, -40, 36, 18], (B) => { shadow(B, 30); B.f('M-30 4q0 12 30 12q30 0 30 -12l-6 -2q-24 8 -48 0z', 'rgba(240,240,232,.7)'); for (let i = 0; i < 12; i++) B.s(`M${-28 + i * 5} 2v12`, '#c8c8c0', .5, .7); B.f(B.ell(0, 0, 32, 9), '#efe8d4').f(B.ell(0, -1, 30, 7.6), '#f8f2e2'); B.f('M-16 -2q0 -26 16 -26q16 0 16 26q-16 4 -32 0z', B.lin(-16, 0, 16, 0, [[0, '#fffaf0'], [.5, '#f0e8d4'], [1, '#c8bca0']])).f('M-16 -6q16 4 32 0v-3q-16 4 -32 0z', '#e8b830'); B.f(B.ell(20, -16, 3.4, 2.4), '#f2b832').s('M18 -16h4M18.6 -14.6h3', '#2a2018', .7).f(B.ell(19, -18.6, 2.4, 1.4), '#dceaf4', .8); });
  add('gardener-scarf', [-30, -30, 30, 30], (B) => { shadow(B, 22); B.f('M-22 -18q22 10 44 0l-2 8q-20 9 -40 0z', '#4f8a5a').f('M-22 -18q22 10 44 0l-.6 2.4q-21 9 -42.6 0z', '#7ab088'); B.f('M6 -9l10 30l-9 1l-6 -28z', '#3a6a44').f('M8 -8l8 26l-3 .4z', '#7ab088', .6); for (let i = 0; i < 5; i++) B.s(`M${8 + i * 1.8} 21l.4 4`, '#f4e8d8', .8); B.s('M-20 -14q20 8 40 0', '#f4e8d8', 1.2, .8).s('M9 -4l7 22', '#f4e8d8', 1.2, .8); });
  add('daisy-chain', [-34, -22, 34, 22], (B, o) => { shadow(B, 28); B.s('M-28 -6q28 30 56 0', '#5e8a44', 1.6); for (let i = 0; i < 9; i++) { const t = i / 8, x = -28 + t * 56, y = -6 + Math.sin(t * Math.PI) * 15; leaf(B, x, y, -1 + t * 2, 5, '#6a9a4a'); daisy(B, x, y, 1.15); } });
  const badge = (B, rim, face) => { shadow(B, 16); B.f(B.circ(0, 0, 17), rim[1]).f(B.circ(0, -1, 17), rim[0]).f(B.circ(0, -1, 14), face).f(B.ell(-6, -8, 6, 3), '#ffffff', .35); };
  add('bee-badge', [-20, -20, 20, 20], (B) => { badge(B, ['#d8a838', '#9a7420'], '#fbf2d8'); B.f(B.ell(0, 1, 7, 5.4), '#f2b832').f(B.rect(-2.6, -4, 2, 10), '#2a2018').f(B.rect(2, -4, 2, 10), '#2a2018').f(B.circ(-8, 0, 3), '#2a2018').f(B.ell(-1, -6, 4, 2.4), '#dceaf4', .9).f(B.ell(4, -6, 4, 2.4), '#dceaf4', .9); });
  add('trowel-badge', [-20, -20, 20, 20], (B) => { badge(B, ['#b8c0c8', '#7a8288'], '#e8f0e0'); B.f('M-3 -3l9 -9q4 3 1 9l-6 4z', B.lin(-3, -12, 8, 1, [[0, '#e0e6ea'], [1, '#8a9298']])).s('M-3 -1l-8 8', '#a86a3a', 3.4).s('M-3.6 -1.6l-7 7', '#c88a5a', 1, .8); });
  add('sun-badge', [-20, -20, 20, 20], (B) => { badge(B, ['#e8a838', '#a87420'], '#fff4d8'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B.f(B.ell(Math.cos(a) * 6.4, -1 + Math.sin(a) * 6.4, 2.6, 2.6), '#f4c020'); } B.f(B.circ(0, -1, 4.4), '#7a4a1a').f(B.circ(-1, -2, 1.4), '#a86a2a'); });
  add('music-box', [-30, -40, 30, 18], (B) => { shadow(B, 26);
    // a little walnut box, lid open, a brass comb and drum, a tiny dancer, a key at the side, notes rising
    B.f('M-22 10h44v-18h-44z', B.lin(-22, 0, 22, 0, [[0, '#a86a3a'], [.5, '#8a5428'], [1, '#5a3418']])).f(B.rect(-22, -8, 44, 3), '#c08050').f(B.rect(-20, 4, 40, 1.4), '#e0b060', .8);
    B.f('M-22 -8l4 -22h40l-4 22z', '#7a4a24').f('M-20 -9l3.6 -19h36l-3.6 19z', '#b05a6a').f('M-18 -11l3 -15h31l-3 15z', '#d8909a', .5);
    B.f(B.rect(-14, -11, 20, 3), '#e0c070').f(B.ell(10, -10, 4, 2), '#c8a040').f(B.rect(-2, -20, 1.6, 9), '#8a7a6a').f('M-1.2 -26q-4 2 -5 6h10q-1 -4 -5 -6z', '#f4a8c0').f(B.circ(-1.2, -28, 1.8), '#f4d0b0');
    B.s('M22 0h6', '#c8a040', 2).f(B.ell(29, 0, 2, 4), '#e0c070');
    B.f(B.ell(-24, -30, 2.6, 2), '#4a3a6a').s('M-21.6 -30v-8', '#4a3a6a', 1).f(B.ell(-14, -36, 2.4, 1.8), '#4a3a6a').s('M-11.8 -36v-7l4 1', '#4a3a6a', 1); });
  add('jazz-hands', [-32, -30, 32, 20], (B) => { shadow(B, 26);
    // a pair of white gloves, glittering, with sparkles round them
    const glove = (x, m) => { B.f(`M${x - 8 * m} 12q-2 -14 0 -20l${-3 * m} -10q0 -3 ${3 * m} -2l${4 * m} 8l0 -12q1 -3 3.4 0l.4 12l2 -12q2 -2 3 0l-.4 13l3 -9q2 -2 3 1l-3 14q2 10 -2 15z`, '#fbf8f0').f(`M${x - 8 * m} 12q-2 -14 0 -20l${-3 * m} -10q0 -3 ${3 * m} -2l${1 * m} 3q-2 14 3 29z`, '#ffffff', .8).f(B.rect(x - 9 * m - (m < 0 ? 15 : 0), 9, 15, 4), '#d8405a'); for (let i = 0; i < 5; i++) B.f(B.circ(x - 4 * m + i * 2.4 * m, -4 + (i % 2) * 5, .9), '#e8c848'); };
    glove(-12, 1); glove(14, 1);
    const star = (x, y, s, c) => B.f(`M${x} ${y - s}q${s * .2} ${s * .8} ${s} ${s}q${-s * .8} ${s * .2} ${-s} ${s}q${-s * .2} ${-s * .8} ${-s} ${-s}q${s * .8} ${-s * .2} ${s} ${-s}z`, c);
    star(-26, -20, 5, '#f2c21e'); star(24, -24, 4, '#f2c21e'); star(0, -26, 3, '#ffe68a'); star(28, 2, 3, '#f8a0c0'); });
})();
