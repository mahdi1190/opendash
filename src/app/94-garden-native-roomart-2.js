/* Painted rooms, part two: nowhere in particular, the hollow oak, the grotto,
 * behind the falls, the lamp room and the ringing chamber. */

/* Nowhere: no walls, no floor you could swear to. Pearl, lilac and a warm white where the sun ought to be. */
GRA_ROOMS.nowhere = {
  plate: '#c4bedc', ambient: .95,
  lights: [{ x: 600, y: 240, radius: 520, height: 200, color: '#fff8f0', intensity: .5 }],
  fx: { drift: [{ x: 200, y: 180, r: 260, c: '#ffffff', a: .14, dx: 80, sp: .05 }, { x: 700, y: 120, r: 300, c: '#fff8ff', a: .18, dx: 90, sp: .04 }, { x: 480, y: 330, r: 340, c: '#ffffff', a: .16, dx: 60, sp: .06 }], motes: [{ x0: 0, x1: 960, y0: 60, y1: 560, n: 18, c: '#ffffff', a: .5, rise: 2, wind: 3 }] },
  *paint(T) {
    T.rect(0, 0, 960, 600, T.lin(0, 0, 0, 600, [[0, '#f2f0f8'], [.45, '#dcd6ec'], [.75, '#cbc2de'], [1, '#bab0d2']]));
    T.glow(600, 250, 420, '#fffaf0', .3, 'source-over');
    yield;
    // banks of cloud, lobed, lit from the upper right
    for (let i = 0; i < 26; i++) { const x = T.rnd(-80, 1040), y = T.rnd(60, 420), rx = T.rnd(90, 220), ry = rx * T.rnd(.18, .3), tone = T.mix('#f4f0fa', '#b8aed0', y / 480); T.blob(x, y + ry * .3, rx, ry, T.shade(tone, -.12), .35, 11, .5); T.blob(x + rx * .08, y, rx * .9, ry * .85, tone, .55, 11, .5); T.blob(x + rx * .2, y - ry * .25, rx * .5, ry * .45, '#ffffff', .35, 9, .5); }
    yield;
    // far signposts going off, fainter and fainter, their shadows on nothing
    for (const [x, y, k, o] of [[120, 338, .5, .32], [310, 300, .36, .22], [760, 288, .32, .18], [880, 360, .6, .3], [560, 276, .24, .14], [40, 300, .3, .16]]) {
      T.cx.save(); T.cx.translate(x, y); T.cx.scale(k, k); T.alpha(1);
      T.soft(0, 2, 40, 6, o * .6, '#6a6078'); T.rect(-4, -120, 8, 120, '#6a6078', o); T.poly([[0, -112], [54, -112], [66, -100], [54, -88], [0, -88]], '#7a7088', o); T.poly([[0, -80], [-46, -80], [-56, -70], [-46, -60], [0, -60]], '#7a7088', o * .8);
      T.cx.restore();
    }
    yield;
    // a ground that is only a darker kind of mist
    T.ell(480, 540, 760, 170, T.rad(480, 520, 760, [[0, '#b0a6cc', .55], [1, '#b0a6cc', 0]]));
    T.ell(420, 470, 520, 64, '#ffffff', .15);
    for (let i = 0; i < 14; i++) T.blob(T.rnd(0, 960), T.rnd(430, 590), T.rnd(80, 180), T.rnd(10, 22), T.pick(['#d8d0ea', '#c8bedc', '#a89ec4']), .35, 11, .5);
    T.rect(0, 400, 960, 200, T.lin(0, 400, 0, 600, [[0, '#9a90b8', 0], [1, '#8a80a8', .45]]));
    // YOU ARE HERE, somebody's idea of a joke
    T.soft(191, 412, 34, 6, .35, '#5a5070'); T.rect(186, 240, 10, 172, T.lin(186, 0, 196, 0, [[0, '#9a8a74'], [1, '#5a4a3a']]));
    T.cx.save(); T.cx.translate(191, 258); T.cx.rotate(-.07);
    T.soft(4, 6, 80, 14, .25, '#5a5070'); T.rrect(-75, -14, 150, 28, 3, T.lin(0, -14, 0, 14, [[0, '#f8f0dc'], [1, '#dccfae']])); T.grain(-75, -14, 150, 28, '#a89070', .3, false, 4);
    T.cx.fillStyle = '#5a4a3a'; T.cx.font = '700 13px Georgia, serif'; T.cx.textAlign = 'center'; T.cx.fillText('YOU ARE HERE', 0, 5);
    T.cx.restore();
    // door: a thin place in the mist between two old stones
    T.glow(64, 470, 110, '#fff4c8', .6, 'source-over');
    for (const [x, w] of [[22, 26], [94, 28]]) { T.soft(x, 562, 30, 6, .35, '#5a5070'); T.blob(x, 500, w / 2, 64, T.lin(x - w, 0, x + w, 0, [[0, '#a8a0b8'], [1, '#6a6078']]), 1, 9, .15); T.blob(x - 4, 470, w / 4, 30, '#d8d2e4', .5, 7, .3); }
    T.ell(60, 486, 22, 66, '#fffbe8', .8);
    T.finish({ vignette: .3, vcol: '#7a7098', dabs: 300 });
  },
};

/* Inside the hollow oak: everything curves, rings on the wall, a moon through a knot-hole, one candle and old books. */
GRA_ROOMS.owl = {
  plate: '#140a04', ambient: .62,
  lights: [{ x: 759, y: 320, radius: 260, height: 80, color: '#ffcf80', intensity: .9 }, { x: 490, y: 220, radius: 260, height: 160, color: '#b8c8f0', intensity: .35 }],
  fx: { motes: [{ x0: 340, x1: 640, y0: 120, y1: 390, n: 16, c: '#ffe2a0', a: .45 }], flicker: [{ x: 759, y: 326, r: 90, c: '#ffbe6a', a: .3, amt: .25 }, { x: 250, y: 138, r: 26, c: '#e8f07a', a: .4, amt: .5 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#140a04');
    T.ell(480, 250, 520, 350, T.rad(480, 220, 520, [[0, '#9a6a3a'], [.55, '#5e3c1e'], [1, '#22140a']]));
    // growth rings round you, each a little band of wood
    for (let i = 0; i < 14; i++) { cx.strokeStyle = i % 3 ? 'rgba(46,28,14,.45)' : 'rgba(180,130,80,.18)'; cx.lineWidth = i % 2 ? 2.5 : 5 + T.r() * 3; cx.beginPath(); const rx = 50 + i * 38 + T.rnd(-4, 4); cx.ellipse(480 + T.rnd(-6, 6), 230, rx, rx * .72, 0, 0, 6.3); cx.stroke(); }
    // radial checks in the wood
    for (let i = 0; i < 12; i++) { const a = T.rnd(0, 6.28), r0 = T.rnd(80, 200), r1 = r0 + T.rnd(60, 160); T.stroke(`M${480 + Math.cos(a) * r0} ${230 + Math.sin(a) * r0 * .72}L${480 + Math.cos(a) * r1} ${230 + Math.sin(a) * r1 * .72}`, '#1e1006', 2, .45); }
    yield;
    // the curved wall closing in, bark-dark, with vertical fibre
    const wall = 'M0 0H960V600H860Q960 300 760 60H200Q0 300 100 600H0Z';
    T.fill(wall, '#1e1006'); T.clip(wall, () => { T.grain(0, 0, 960, 600, '#3a2412', .5, true, 7); T.rect(0, 0, 960, 600, T.lin(0, 0, 960, 0, [[0, '#000', .5], [.25, '#000', 0], [.75, '#000', 0], [1, '#000', .5]])); });
    T.stroke('M100 600Q0 300 200 60', '#5a3a1e', 10); T.stroke('M104 600Q6 300 204 62', '#8a5a2e', 2, .5); T.stroke('M860 600Q960 300 760 60', '#3a2412', 10);
    T.fill('M100 392H860L900 600H60Z', T.lin(0, 392, 0, 600, [[0, '#5a3a1e'], [1, '#22140a']]));
    // the floor: the heartwood, worn smooth, rings showing
    T.clip('M100 392H860L900 600H60Z', () => { for (let i = 0; i < 9; i++) { cx.strokeStyle = 'rgba(30,16,6,.35)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(480, 600, 80 + i * 60, 30 + i * 26, 0, Math.PI, 2 * Math.PI); cx.stroke(); } T.ell(480, 470, 260, 50, '#ffcf80', .08); });
    T.skirt(394, .45);
    yield;
    // the moon through a knot-hole
    T.ell(480, 92, 60, 52, '#120804'); T.ell(480, 92, 46, 40, T.lin(0, 52, 0, 132, [[0, '#0c1630'], [1, '#203a64']])); T.ell(494, 84, 24, 24, '#f4eec8'); T.ell(486, 76, 5, 5, '#d8d0a8'); T.ell(500, 92, 4, 4, '#d8d0a8', .7);
    T.glow(494, 84, 70, '#dce4ff', .45); T.stroke('M434 92a46 40 0 0 1 92 0', '#6a4422', 3, .6);
    T.shaft([[452, 118], [528, 118], [620, 392], [340, 392]], '#c8d4f4', .16, 118, 392);
    yield;
    // shelves that follow the curve, stuffed with books
    const col = ['#8a3a2a', '#3a5a7a', '#6a7a3a', '#c8984a', '#5a3a6a', '#a8603a', '#2a4a3a'];
    const shelf = (x0, x1, y0, y1) => {
      T.soft((x0 + x1) / 2, (y0 + y1) / 2 + 16, (x1 - x0) * .55, 10, .5);
      for (let x = x0 + 8; x < x1 - 14;) {
        const w = 9 + Math.floor(T.r() * 9), h = 26 + Math.floor(T.r() * 26), t = (x - x0) / (x1 - x0), y = y0 + (y1 - y0) * t + 6 * 4 * t * (1 - t) - 5, c = T.pick(col), lean = T.r() < .12 ? T.rnd(-.25, .25) : 0;
        cx.save(); cx.translate(x + w / 2, y); cx.rotate(lean); T.rect(-w / 2, -h, w, h, T.lin(-w / 2, 0, w / 2, 0, [[0, T.shade(c, .15)], [.5, c], [1, T.shade(c, -.4)]])); T.rect(-w / 2, -h + 5, w, 2, '#e8c870', .55); T.rect(-w / 2, -9, w, 2, '#e8c870', .4); cx.restore();
        x += w + 1;
      }
      T.stroke(`M${x0} ${y0}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + 12} ${x1} ${y1}`, '#1e1006', 10); T.stroke(`M${x0} ${y0 - 4}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + 8} ${x1} ${y1 - 4}`, '#8a5a2e', 2, .5);
    };
    shelf(170, 340, 170, 150); shelf(150, 320, 276, 266); shelf(620, 800, 150, 170); shelf(640, 810, 266, 276);
    yield;
    // the owl's perch, the desk, paper, the candle, a lantern of fireflies
    T.soft(480, 344, 110, 8, .5); T.rrect(380, 330, 200, 9, 4, T.lin(0, 330, 0, 339, [[0, '#7a5030'], [1, '#3a2412']])); T.stroke('M400 338L420 392M560 338L540 392', '#2a180a', 7);
    T.soft(717, 470, 90, 10, .5); T.rrect(642, 380, 150, 12, 3, T.lin(0, 380, 0, 392, [[0, '#6a4426'], [1, '#2a180a']])); T.rect(650, 392, 10, 70, '#2a180a'); T.rect(774, 392, 10, 70, '#2a180a');
    T.rect(670, 370, 60, 10, '#ecdcb4'); T.stroke('M676 375h48', '#8a7a5a', 1.2); T.ell(716, 378, 9, 3, '#3a2a1a', .5);
    T.candle(759, 380, 14, 44); T.glow(759, 330, 150, '#ff9a40', .28); T.glow(759, 330, 60, '#ffd890', .3);
    T.stroke('M250 60V120', '#3a2412', 2); T.ell(250, 138, 18, 22, '#2a2a1a', .6); T.ell(250, 138, 14, 18, '#e8f07a', .2); for (let i = 0; i < 7; i++) T.ell(T.rnd(240, 260), T.rnd(126, 150), 1.6, 1.6, '#f0ff9a', .9); T.glow(250, 138, 40, '#e8f07a', .35);
    // toadstools by the roots
    for (const [x, y, k] of [[180, 470, 1], [214, 482, .7], [790, 500, .9], [168, 486, .5]]) { cx.save(); cx.translate(x, y); cx.scale(k, k); T.soft(0, 2, 18, 4, .4); T.rrect(-5, -18, 10, 20, 3, '#e8dcc0'); T.fill('M-20 -16Q-18 -40 0 -42Q18 -40 20 -16Z', T.lin(0, -42, 0, -16, [[0, '#d85a44'], [1, '#8a2a1a']])); T.ell(-6, -28, 2.8, 2.4, '#f4efe0'); T.ell(7, -24, 2, 1.8, '#f4efe0'); T.ell(1, -34, 1.6, 1.4, '#f4efe0'); cx.restore(); }
    // door: the split in the bark, dusk outside
    T.fill('M30 560Q20 470 62 368Q104 470 96 560Z', T.lin(0, 368, 0, 560, [[0, '#27496e'], [.55, '#d87a54'], [1, '#f4c07a']])); T.glow(62, 520, 70, '#f4c07a', .4);
    T.stroke('M30 560Q20 470 62 368Q104 470 96 560', '#2a180a', 7);
    T.finish({ vignette: .6, vcol: '#0a0402' });
  },
};

/* The back of the grotto: black-green rock, glow-worms for a sky, one shaft of day, a pool deeper than it should be. */
GRA_ROOMS.grotto = {
  plate: '#050d0a', ambient: .5,
  lights: [{ x: 330, y: 300, radius: 260, height: 200, color: '#e8ffd8', intensity: .6 }, { x: 630, y: 470, radius: 300, height: 60, color: '#62e0c0', intensity: .35 }],
  fx: { motes: [{ x0: 200, x1: 440, y0: 40, y1: 410, n: 22, c: '#e8ffd0', a: .55, rise: 4 }], glints: [{ x0: 360, x1: 900, y0: 438, y1: 552, n: 10, c: '#c8fff0', a: .7, inside: (x, y) => ((x - 630) / 272) ** 2 + ((y - 494) / 60) ** 2 < 1 }, { x0: 70, x1: 900, y0: 30, y1: 190, n: 14, c: '#7ff0d0', a: .9 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, T.lin(0, 0, 0, 600, [[0, '#040a08'], [.6, '#0e2219'], [1, '#16301f']]));
    // glow-worms on the roof, a faint green sky of them
    T.ell(620, 110, 320, 100, T.rad(620, 110, 320, [[0, '#62e0c0', .22], [1, '#62e0c0', 0]]));
    for (let i = 0; i < 160; i++) { const x = T.rnd(60, 920), y = T.rnd(14, 200); T.ell(x, y, 1 + T.r() * 1.2, 1 + T.r() * 1.2, '#8ff8dc', .5 + T.r() * .5); if (T.r() < .2) T.glow(x, y, 8, '#62e0c0', .5); T.stroke(`M${x} ${y}v${T.rnd(4, 14)}`, '#8ff8dc', .5, .25); }
    yield;
    // the far wall: layers of rock, each a little lighter, lobed and wet
    T.fill('M0 392V210Q90 130 200 170Q300 90 440 130Q560 60 690 140Q820 90 960 200V392Z', '#13281e');
    for (let i = 0; i < 40; i++) T.blob(T.rnd(0, 960), T.rnd(150, 380), T.rnd(30, 80), T.rnd(18, 40), T.pick(['#1b3628', '#0e1e16', '#24402e']), .55, 8, .4);
    T.fill('M0 392V290Q120 220 250 262Q380 190 500 240Q650 170 780 240Q880 220 960 280V392Z', '#1b3628');
    for (let i = 0; i < 30; i++) { const x = T.rnd(0, 960), y = T.rnd(260, 380); T.blob(x, y, T.rnd(26, 60), T.rnd(12, 26), T.pick(['#22402f', '#162c20']), .7, 8, .4); T.ell(x - 8, y - 8, T.rnd(10, 22), 3, '#7ac8a0', .12); }
    yield;
    // the shaft of day from a crack
    T.fill('M172 0Q206 26 248 0Z', '#e8ffd8', .9); T.glow(210, 8, 60, '#e8ffd8', .6);
    T.shaft([[180, 0], [240, 0], [430, 420], [230, 420]], '#e8ffd8', .5, 0, 420); T.ell(330, 420, 130, 26, T.rad(330, 420, 130, [[0, '#d8ffd0', .35], [1, '#d8ffd0', 0]]));
    // the bare rock that wants moss: faceted, lit on its sunward side
    T.soft(310, 400, 180, 16, .55);
    T.fill('M146 396L168 304L214 236L286 196L366 214L420 270L452 340L470 396Z', '#34443a');
    T.fill('M190 396L206 312L250 256L300 232L352 252L392 306L410 396Z', '#465849'); T.fill('M214 236L286 196L300 232L250 256Z', '#6a806c'); T.fill('M366 214L420 270L392 306L352 252Z', '#26342c'); T.fill('M250 256L300 232L352 252L332 302L268 308Z', '#566a58');
    T.fill('M168 304L214 236L250 256L206 312Z', '#5a7060', .8); T.fill('M410 396L392 306L420 270L452 340L470 396Z', '#1e2a24', .8);
    for (const [x, y, r] of [[230, 352, 5], [316, 346, 4], [378, 356, 6], [280, 268, 3]]) T.ell(x, y, r, r * .8, '#8a9a7a', .5);
    yield;
    // ferns and hart's-tongue, roots coming down
    const fern = (x, y, k, c, flip) => { cx.save(); cx.translate(x, y); cx.scale(flip ? -k : k, k); for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .32, f = sceneDraw.frond(0, 0, a, 60 + (3 - Math.abs(i - 3)) * 12, 14, 12, 8); T.stroke(f.rib, T.shade(c, -.3), 1.6); T.fill(f.blades, i % 2 ? c : T.shade(c, .15)); } cx.restore(); };
    fern(90, 402, 1.1, '#3f7a44'); fern(150, 412, .8, '#2f6a3a', 1); fern(900, 396, 1.15, '#3f7a44', 1); fern(840, 408, .7, '#4a8a4e'); fern(470, 400, .6, '#2f6a3a');
    for (const [x, l] of [[60, 120], [860, 150], [760, 90]]) { T.stroke(`M${x} 0q10 ${l / 2} -6 ${l}`, '#1a2414', 6); T.stroke(`M${x + 12} 0q-8 ${l / 3} 4 ${l * .7}`, '#2a3a1e', 3); }
    yield;
    // the floor: damp stone and moss, the pool in a stone lip
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#24402c'], [1, '#0c1a12']]));
    T.flags(396, 600, { base: '#26402e', mortar: '#0e1c14', h: 14, w: 140, var: .2 });
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#0c1a12', .2], [1, '#000', .4]]));
    for (let i = 0; i < 30; i++) { const x = T.rnd(0, 960), y = T.rnd(400, 590); if (((x - 630) / 310) ** 2 + ((y - 494) / 82) ** 2 > 1) T.blob(x, y, T.rnd(10, 30), T.rnd(4, 9), T.pick(['#3f6a40', '#568a50', '#2e5030']), .75, 8, .5); }
    T.skirt(396, .5, '#020604');
    T.soft(630, 500, 320, 84, .6, '#020604');
    cx.save(); cx.translate(630, 494); cx.scale(1, 70 / 290); T.ell(0, 0, 290, 290, T.rad(0, -40, 300, [[0, '#5ad0c0'], [.5, '#2f9a98'], [.85, '#145a60'], [1, '#0a2e30']])); cx.restore();
    T.ell(630, 470, 240, 20, '#c8fff0', .12); T.ell(620, 84 + 400, 40, 6, '#c8fff0', .1);
    for (const [x, y, l] of [[430, 440, 60], [560, 428, 40], [740, 432, 58], [840, 460, 40]]) T.poly([[x - 9, y], [x, y + l], [x + 9, y]], '#0e3a3a', .3);
    for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283, x = 630 + Math.cos(a) * 292, y = 496 + Math.sin(a) * 72; T.blob(x, y, 30, 13, i % 2 ? '#2e3c32' : '#3a4a3e', 1, 7, .3); T.ell(x - 8, y - 5, 14, 3.5, '#8ab89a', .25); }
    // door: the rock mouth you came in by, daylight far along it
    T.blob(64, 470, 74, 120, '#26342c', 1, 10, .14); T.fill('M20 560Q16 412 64 390Q108 412 104 560Z', '#0a1610'); T.ell(64, 500, 22, 50, T.rad(64, 500, 50, [[0, '#d8ffd0', .7], [1, '#d8ffd0', 0]]));
    T.finish({ vignette: .6, vcol: '#010402' });
  },
};

/* Behind the falls: the whole back wall is moving water lit gold by the low sun, everything wet and shining. */
GRA_ROOMS.falls = {
  plate: '#10181c', ambient: .82,
  lights: [{ x: 120, y: 120, radius: 520, height: 200, color: '#ffe0a0', intensity: .7 }],
  fx: { streaks: [{ x: 110, y: 30, w: 740, h: 362, a: .2, speed: 220, tint: '#d8f0ff' }, { x: 110, y: 30, w: 740, h: 362, a: .12, speed: 120 }], motes: [{ x0: 90, x1: 880, y0: 300, y1: 400, n: 30, c: '#ffffff', a: .6, rise: 14 }], glints: [{ x0: 40, x1: 920, y0: 410, y1: 590, n: 14, c: '#ffffff', a: .7 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#1e2a30');
    const sheet = 'M90 392V30Q480 -20 880 30V392Z';
    T.fill(sheet, T.lin(0, 0, 0, 392, [[0, '#b8dcea'], [.45, '#5e9ab8'], [1, '#2e6680']]));
    T.clip(sheet, () => {
      T.rect(90, 0, 790, 392, T.lin(90, 0, 880, 0, [[0, '#ffd27a', .35], [.45, '#ffd27a', .08], [1, '#1a3a50', .25]]));
      for (let i = 0; i < 70; i++) { const x = T.rnd(80, 890), w = T.rnd(2, 12); T.rect(x, -40, w, 470, T.lin(0, 0, 0, 400, [[0, '#e8f6fa', T.rnd(.06, .22)], [.7, '#e8f6fa', T.rnd(.1, .3)], [1, '#ffffff', .05]])); }
      for (let i = 0; i < 50; i++) T.rect(T.rnd(80, 890), -40, T.rnd(3, 10), 470, '#1a4a64', T.rnd(.08, .22));
      T.glow(110, 60, 260, '#fff0b8', .28);
      for (let i = 0; i < 46; i++) T.blob(T.rnd(90, 880), T.rnd(366, 404), T.rnd(18, 44), T.rnd(6, 14), T.pick(['#ffffff', '#d8eef6']), .45, 9, .6);
    });
    yield;
    // the mouth of the ledge: wet black rock, sheen running down it
    const rockL = 'M0 0H118Q86 60 100 120Q70 180 92 250Q60 320 80 392H0Z', rockR = 'M960 0H850Q884 70 872 140Q904 210 882 280Q912 340 896 392H960Z', lip = 'M0 0H960V30Q860 50 760 28Q640 46 520 22Q400 44 280 24Q170 46 80 30Q30 40 0 32Z';
    for (const d of [rockL, rockR, lip]) { T.fill(d, T.lin(0, 0, 0, 392, [[0, '#0e1418'], [1, '#1a252a']])); T.clip(d, () => { for (let i = 0; i < 24; i++) { const x = T.rnd(0, 960), y = T.rnd(0, 380); T.stroke(`M${x} ${y}q${T.rnd(-8, 8)} 30 ${T.rnd(-4, 4)} ${T.rnd(40, 90)}`, '#a8d4e8', T.rnd(1, 2.5), T.rnd(.12, .3)); } for (let i = 0; i < 14; i++) T.blob(T.rnd(0, 960), T.rnd(0, 390), T.rnd(20, 40), T.rnd(16, 30), '#26343a', .5, 7, .35); }); }
    T.stroke('M118 0Q86 60 100 120Q70 180 92 250Q60 320 80 392', '#ffe0a0', 2.5, .4); T.stroke('M850 0Q884 70 872 140Q904 210 882 280Q912 340 896 392', '#a8d4e8', 2, .25);
    yield;
    // the ledge, shining with spray, puddles holding the sky
    T.flags(392, 600, { base: '#46565c', mortar: '#1a2226', h: 16, w: 150 });
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#a8dcf0', .25], [.4, '#000', .05], [1, '#000', .35]]));
    T.rect(0, 388, 960, 12, '#10181c');
    for (let i = 0; i < 12; i++) { const x = 60 + i * 80, y = 420 + (i * 37) % 150, w = 30 + (i % 3) * 18; T.ell(x, y, w, 5, '#cfeaf4', .35); T.ell(x - w * .3, y - 1, w * .3, 1.5, '#ffffff', .5); }
    for (const [x, y, a, b] of [[840, 500, 60, 26], [120, 550, 40, 16], [720, 572, 80, 22]]) { T.soft(x + 6, y + b * .6, a * 1.1, b * .5, .45); T.blob(x, y, a, b, '#2e3a40', 1, 8, .3); T.ell(x - a * .2, y - b * .4, a * .4, 3, '#a8dcf0', .45); }
    T.skirt(394, .4, '#05080a');
    // the low sun's light through the water onto the ledge
    T.shaft([[90, 40], [0, 0], [0, 240], [300, 600], [520, 600]], '#fff0b8', .14, 0, 600);
    // door: a parting in the water, light on the far side
    T.fill('M18 560V420Q64 370 110 420V560Z', T.lin(0, 380, 0, 560, [[0, '#a8d4e8'], [1, '#3e7a98']])); T.glow(64, 470, 70, '#fff0c8', .25);
    for (let i = 0; i < 10; i++) T.rect(T.rnd(18, 108), 400, 2, 160, '#ffffff', .4);
    T.finish({ vignette: .45, vcol: '#04080a' });
  },
};

/* The lamp room: the top of the world at night, all glass and brass round the great lamp, the black lake below. */
GRA_ROOMS.lamproom = {
  plate: '#050a1e', ambient: .6,
  lights: [{ x: 480, y: 270, radius: 360, height: 120, color: '#fff2c0', intensity: .7 }],
  fx: { glints: [{ x0: 0, x1: 960, y0: 6, y1: 280, n: 18, c: '#ffffff', a: .9 }, { x0: 0, x1: 960, y0: 310, y1: 388, n: 10, c: '#a8c8f0', a: .6 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, T.lin(0, 0, 0, 392, [[0, '#040818'], [.7, '#14264e'], [1, '#2a4470']]));
    // the milky way and the stars
    cx.save(); cx.translate(480, 140); cx.rotate(-.25); T.ell(0, 0, 620, 50, T.rad(0, 0, 620, [[0, '#6a7ab8', .25], [1, '#6a7ab8', 0]])); cx.restore();
    for (let i = 0; i < 320; i++) { const x = T.r() * 960, y = T.r() * 290; T.ell(x, y, .5 + T.r() * 1.1, .5 + T.r() * 1.1, T.pick(['#ffffff', '#fff4d8', '#d8e4ff']), .4 + T.r() * .6); }
    T.ell(800, 80, 28, 28, '#f4eec8'); T.ell(790, 72, 5, 5, '#d8d0a8'); T.ell(810, 90, 4, 4, '#d8d0a8', .7); T.glow(800, 80, 110, '#e0e8ff', .35);
    yield;
    // the lake, a far light or two, the far shore, the moon's road
    T.rect(0, 300, 960, 92, T.lin(0, 300, 0, 392, [[0, '#14304a'], [1, '#050e1e']]));
    for (let i = 0; i < 30; i++) { const w = T.rnd(10, 40) * (1 - i / 40); T.rect(800 - w / 2 + T.rnd(-10, 10), 304 + i * 2.8, w, 1.6, '#f4eec8', .5); }
    T.fill('M0 300Q200 286 380 298T700 292T960 298V304H0Z', '#03060f');
    for (const x of [190, 660, 420]) { T.ell(x, 296, 1.6, 1.6, '#ffd97a'); T.glow(x, 296, 10, '#ffd97a', .6); }
    yield;
    // the panes, bent round you: brass astragals closer at the sides, glass catching the lamp
    for (const x of [14, 96, 220, 360, 600, 740, 864, 946]) { T.rect(x - 5, 22, 10, 370, T.lin(x - 5, 0, x + 5, 0, [[0, '#6a6458'], [.4, '#e8e0c8'], [1, '#5a544a']])); }
    for (const [a, b] of [[96, 220], [220, 360], [600, 740], [740, 864]]) T.poly([[a + 10, 30], [a + 40, 30], [b - 20, 380], [b - 50, 380]], '#ffffff', .03);
    T.fill('M0 0H960V24Q480 52 0 24Z', T.lin(0, 0, 0, 40, [[0, '#c84a3a'], [1, '#7a2a20']])); T.fill('M0 24Q480 52 960 24V30Q480 58 0 30Z', '#5a1a14');
    // the gallery rail and the parapet
    T.fill('M0 330Q480 368 960 330V392H0Z', '#262c3c', .9); T.stroke('M0 330Q480 368 960 330', '#d8d0bc', 5); T.stroke('M0 328Q480 366 960 328', '#ffffff', 1, .4); T.stroke('M0 356Q480 386 960 356', '#8a8678', 3);
    yield;
    // the floor is round: iron plate radiating from the lamp, rivets, a tin of polish, a rag
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#8a8478'], [1, '#34302a']]));
    for (let i = 0; i < 9; i++) T.stroke(`M480 396L${i * 137 - 70} 600`, '#000', 2, .25);
    for (let ring = 0; ring < 3; ring++) { cx.strokeStyle = 'rgba(0,0,0,.2)'; cx.lineWidth = 2; cx.beginPath(); cx.ellipse(480, 396, 200 + ring * 230, 50 + ring * 70, 0, 0, Math.PI); cx.stroke(); }
    for (let i = 0; i < 40; i++) { const x = T.rnd(20, 940), y = T.rnd(410, 590); T.ell(x, y, 2.4, 1.8, '#2a2620'); T.ell(x - .6, y - .6, 1, .8, '#c8c0b0', .5); }
    T.ell(480, 404, 470, 22, '#000', .28); T.ell(480, 430, 300, 50, '#fff2c0', .1);
    T.soft(822, 488, 30, 6, .45); T.rrect(800, 460, 44, 26, 4, T.lin(800, 0, 844, 0, [[0, '#e8c050'], [1, '#8a6a20']])); T.ell(822, 460, 22, 6, '#f4d870'); T.blob(870, 490, 26, 10, '#d8d0c0', 1, 8, .5);
    // door: the top of the spiral stairs, an iron rail curling down
    T.ell(64, 528, 60, 30, '#b8b4a8'); T.ell(64, 528, 52, 25, '#14120e'); for (let i = 0; i < 5; i++) { const k = 1 - i * .17; T.ell(64, 528 + i * 3, 50 * k, 24 * k, T.mix('#5a564c', '#14120e', i / 5), .9); }
    T.stroke('M20 528Q14 470 40 430Q60 410 90 420', '#2a2a2a', 4); T.glow(64, 530, 50, '#ffd890', .2);
    T.finish({ vignette: .5, vcol: '#01030a' });
  },
};

/* The ringing chamber: tall, cold and holy. Everything points up into the dark; the only colour is the window, and it stains the dust. */
GRA_ROOMS.ringers = {
  plate: '#050508', ambient: .6,
  lights: [{ x: 480, y: 220, radius: 360, height: 200, color: '#ffe2b0', intensity: .55 }],
  fx: { motes: [{ x0: 300, x1: 660, y0: 140, y1: 560, n: 30, c: '#ffe8c0', a: .55, rise: 3 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#0a0a0e');
    // dressed stone in tall courses, paler where the window reaches
    T.stones(0, 40, 960, 396, { base: '#4a4a54', mortar: '#1a1a20', h: 34, w: 80, var: .2 });
    T.rect(0, 0, 960, 396, T.lin(0, 0, 0, 396, [[0, '#050508', .85], [.45, '#050508', .35], [1, '#050508', .2]]));
    T.rect(0, 0, 960, 396, T.lin(0, 0, 960, 0, [[0, '#050508', .55], [.35, '#050508', 0], [.65, '#050508', 0], [1, '#050508', .55]]));
    yield;
    // two great arches into blackness, the bell's shape overhead
    for (const x of [140, 820]) { const d = `M${x - 80} 392V150Q${x - 80} 60 ${x} 30Q${x + 80} 60 ${x + 80} 150V392Z`; T.fill(d, '#06060a'); T.stroke(`M${x - 80} 392V150Q${x - 80} 60 ${x} 30Q${x + 80} 60 ${x + 80} 150V392`, '#3a3a44', 8); T.stroke(`M${x - 84} 392V150Q${x - 84} 56 ${x} 26`, '#8a8a94', 1.5, .3); }
    T.rect(0, 0, 960, 44, '#020204'); T.fill('M400 42Q430 8 480 8Q530 8 560 42Q572 74 596 92H364Q388 74 400 42Z', '#0c0c12'); T.stroke('M402 42Q432 10 480 10', '#5a5040', 2, .4); T.ell(480, 98, 12, 12, '#0c0c12');
    yield;
    // the window: deep reveal, leaded lights (its colours are the game's own chart, over this)
    T.fill('M346 306V116Q346 36 480 36Q614 36 614 116V306Z', '#2a2620'); T.fill('M360 300V116Q360 48 480 48Q600 48 600 116V300Z', '#1a1612');
    T.glow(480, 170, 200, '#ffe2b0', .28);
    T.shaft([[384, 300], [576, 300], [720, 600], [240, 600]], '#ffe2b0', .22, 300, 600);
    // the coloured light on the floor
    for (const [pts, c] of [[[[268, 600], [350, 440], [390, 440], [330, 600]], '#c8483a'], [[[394, 600], [420, 440], [470, 440], [460, 600]], '#d8a83a'], [[[500, 600], [490, 440], [540, 440], [566, 600]], '#4a7ab8'], [[[630, 600], [560, 440], [610, 440], [692, 600]], '#5a9a5a']]) { cx.save(); cx.globalCompositeOperation = 'lighter'; T.poly(pts, c, .18); cx.restore(); }
    yield;
    // the floor, worn in four places under the ropes
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#4a4a50'], [1, '#18181e']]));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { const x = c * 124 - (r % 2) * 62, y = 400 + r * 52, tone = T.shade('#5a5a62', (T.r() - .5) * .25); T.rrect(x + 2, y, 120, 48, 3, tone, .55); T.rect(x + 4, y + 2, 116, 2, '#a8a8b0', .15); }
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#000', .3], [1, '#000', .2]]));
    for (const x of [180, 300, 680, 800]) T.soft(x, 448, 50, 13, .35);
    T.skirt(394, .55);
    yield;
    // the ringers' board, a bench, a jug, a rope's sally hung up
    T.soft(142, 300, 46, 8, .5); T.rrect(106, 196, 66, 96, 2, T.lin(106, 0, 172, 0, [[0, '#4a3420'], [1, '#2a1c0e']])); for (let i = 0; i < 6; i++) T.stroke(`M116 ${212 + i * 13}h${T.rnd(26, 46)}`, '#d8c88a', 1.8, .6);
    T.soft(873, 500, 64, 8, .5); T.rrect(820, 452, 106, 12, 3, '#3a2a18'); T.rect(830, 464, 10, 36, '#2a1c0e'); T.rect(906, 464, 10, 36, '#2a1c0e'); T.fill('M880 452V428Q892 420 904 428V452Z', T.lin(880, 0, 904, 0, [[0, '#a8a8b0'], [1, '#5a5a62']]));
    // door: a pointed door with iron straps
    T.fill('M14 560V446Q18 402 63 374Q108 402 112 446V560Z', '#5a564c'); T.fill('M24 560V450Q28 412 63 390Q98 412 102 450V560Z', T.lin(24, 0, 102, 0, [[0, '#6a4a2c'], [1, '#3a2814']]));
    T.grain(24, 390, 78, 170, '#1a1006', .4, true, 6); for (const y of [430, 490, 540]) T.rect(24, y, 78, 6, '#1e1e22');
    T.ell(88, 500, 4, 4, '#8a8a92');
    T.finish({ vignette: .6, vcol: '#020204' });
  },
};
