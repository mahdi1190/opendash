/* Painted rooms, part three: the very small parlour, the shepherd's hut, the
 * treehouse, the ice house, the old hothouse and the windmill's cap. */

/* The parlour: a mouse family's home in a stump. Everything is something you know at the wrong size; candle-orange, polished wood. */
GRA_ROOMS.parlour = {
  plate: '#3a2010', ambient: .78,
  lights: [{ x: 837, y: 220, radius: 360, height: 120, color: '#ffc06a', intensity: .5 }, { x: 480, y: 160, radius: 240, height: 140, color: '#d8f0ff', intensity: .17 }],
  fx: { flicker: [{ x: 837, y: 214, r: 150, c: '#ffb050', a: .28, amt: .25 }], motes: [{ x0: 640, x1: 940, y0: 120, y1: 400, n: 12, c: '#ffd890', a: .5 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#2a160a');
    // the hollow: grain going round, polished by years of small sleeves
    const hollow = 'M0 392V120Q200 10 480 10Q760 10 960 120V392Z';
    T.fill(hollow, T.lin(0, 0, 0, 392, [[0, '#6a3e1c'], [1, '#b8783a']]));
    T.clip(hollow, () => {
      for (let i = 0; i < 70; i++) { const x = T.rnd(-40, 1000), c = T.pick(['#4a2810', '#8a5428', '#c88a48']); T.stroke(`M${x} 0q${T.rnd(-30, 30)} 196 ${T.rnd(-20, 20)} 400`, c, T.rnd(1, 4), .25); }
      T.ell(480, 200, 420, 190, T.rad(480, 180, 420, [[0, '#ffd090', .18], [1, '#000', .35]]));
    });
    T.fill('M0 120Q40 300 0 392H60Q90 260 40 90Z', '#2a160a'); T.fill('M960 120Q920 300 960 392H900Q870 260 920 90Z', '#2a160a');
    T.stroke('M40 90Q90 260 60 392', '#8a5428', 3, .5); T.stroke('M920 90Q870 260 900 392', '#5a3418', 3, .5);
    yield;
    // a postage stamp in a frame
    T.soft(214, 172, 70, 80, .45); T.rect(150, 92, 118, 148, '#efe0b8');
    cx.save(); cx.strokeStyle = '#c8a860'; cx.lineWidth = 5; cx.setLineDash([6, 5]); cx.strokeRect(150, 92, 118, 148); cx.restore();
    T.rect(164, 106, 90, 120, T.lin(0, 106, 0, 226, [[0, '#5a88b8'], [1, '#3a6898']])); T.ell(209, 158, 22, 22, '#f4d478'); T.ell(203, 152, 8, 8, '#fff0b0', .6);
    cx.fillStyle = '#efe0b8'; cx.font = '700 13px Georgia, serif'; cx.textAlign = 'center'; cx.fillText('1d', 209, 218);
    // a ruler shelf, cotton reels, a thimble-lid mirror
    T.soft(790, 140, 110, 8, .5); T.rect(690, 126, 200, 14, T.lin(0, 126, 0, 140, [[0, '#f4dc8a'], [1, '#c8a850']])); for (let i = 0; i < 10; i++) T.rect(696 + i * 20, 126, 1.5, i % 5 ? 5 : 9, '#3a2a14');
    for (const [x, w, h, c] of [[712, 26, 40, '#c8483a'], [744, 18, 30, '#3f7486']]) { T.rrect(x, 126 - h, w, h, 3, T.lin(x, 0, x + w, 0, [[0, T.shade(c, .2)], [1, T.shade(c, -.4)]])); T.rect(x - 2, 126 - h, w + 4, 4, '#d8b880'); T.rect(x - 2, 122, w + 4, 4, '#d8b880'); }
    T.ell(810, 108, 16, 16, '#b8c8d0'); T.ell(810, 108, 12, 12, T.lin(798, 96, 822, 120, [[0, '#f4f8ff'], [1, '#8aa0b0']]));
    yield;
    // the round window, tall grass going by outside
    T.ell(480, 136, 90, 90, '#4a2a10'); T.ell(480, 136, 82, 82, '#8a5428');
    T.clip(new Path2D('M556 136A76 76 0 1 1 404 136A76 76 0 1 1 556 136Z'), () => {
      T.rect(404, 60, 152, 152, T.lin(0, 60, 0, 212, [[0, '#a8dcf0'], [1, '#e8f4d8']]));
      for (let i = 0; i < 9; i++) { const x = T.rnd(400, 560); T.stroke(`M${x} 214Q${x + T.rnd(-14, 14)} 140 ${x + T.rnd(-30, 30)} ${T.rnd(60, 110)}`, T.pick(['#5a9a3a', '#6aaa48', '#4a8a30']), T.rnd(8, 14)); }
      T.glow(520, 90, 60, '#fffbe0', .5);
    });
    T.stroke('M480 60V212M404 136H556', '#5a3418', 6); T.stroke('M480 60V212', '#a87040', 1.5, .4);
    yield;
    // the candle end, far too big, its light on everything
    T.soft(837, 394, 60, 10, .55);
    T.rrect(806, 240, 62, 152, 6, T.lin(806, 0, 868, 0, [[0, '#fff6dc'], [.55, '#efe3c4'], [1, '#b8a888']]));
    T.fill('M806 240q14 28 26 8q10 24 36 -8z', '#f8ecd0'); T.fill('M812 244q-4 50 4 70q6 -40 2 -70z', '#fff8e8', .6);
    T.stroke('M837 240v-8', '#2a1a10', 2); T.flame(837, 236, 2.4);
    T.glow(837, 210, 280, '#ff9a40', .22); T.glow(837, 210, 110, '#ffd890', .3);
    // the floor: polished, a tea-cosy carpet
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#b8884a'], [1, '#6a4422']]));
    T.floorBoards(392, 600, { base: '#9a6a38', n: 12, spread: 3 });
    T.skirt(394, .45);
    cx.save(); cx.translate(480, 492); cx.scale(1, 84 / 390);
    for (const [rr, c] of [[392, '#7a2424'], [380, '#a83a3a'], [352, '#c8584a'], [300, '#e0a858'], [262, '#c8584a'], [200, '#e0a858']]) T.ell(0, 0, rr, rr, c);
    for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283; T.ell(Math.cos(a) * 326, Math.sin(a) * 326, 12, 12, '#f0c878', .8); T.ell(Math.cos(a) * 230, Math.sin(a) * 230, 8, 8, '#7a2424', .6); }
    cx.restore();
    T.ell(480, 492, 392, 84, T.rad(700, 420, 500, [[0, '#ffd890', .14], [1, '#000', .25]]));
    yield;
    // the matchbox table (the cups and pot are the game's own), thimble stools, the mice
    T.soft(470, 466, 210, 12, .5);
    T.rrect(280, 388, 380, 16, 3, T.lin(0, 388, 0, 404, [[0, '#e8c070'], [1, '#a07a3a']])); T.rect(280, 388, 380, 6, '#d84a3a'); T.rect(280, 388, 380, 1.5, '#ff8a6a', .6);
    T.rect(300, 404, 16, 60, '#8a6430'); T.rect(624, 404, 16, 60, '#8a6430');
    const mouse = (x, y, k, c) => {
      cx.save(); cx.translate(x, y); cx.scale(k, k); T.soft(0, 2, 26, 5, .4);
      T.stroke('M18 -6q26 4 22 -18', '#c8a8a0', 2.6); T.ell(0, -24, 20, 26, T.lin(-20, 0, 20, 0, [[0, T.shade(c, .15)], [1, T.shade(c, -.3)]])); T.ell(0, -18, 12, 16, T.shade(c, .3), .6);
      T.ell(0, -58, 16, 16, T.lin(-16, 0, 16, 0, [[0, T.shade(c, .15)], [1, T.shade(c, -.25)]])); T.ell(-13, -70, 10, 10, '#c8988e'); T.ell(13, -70, 10, 10, '#c8988e'); T.ell(-13, -70, 6, 6, '#e8b8b0'); T.ell(13, -70, 6, 6, '#e8b8b0');
      T.ell(-5, -60, 2.2, 2.2, '#1a1a1a'); T.ell(5, -60, 2.2, 2.2, '#1a1a1a'); T.ell(-4.4, -60.8, .7, .7, '#fff'); T.ell(5.6, -60.8, .7, .7, '#fff'); T.ell(0, -53, 2.2, 2, '#d87a7a');
      T.stroke('M-4 -52l-14 -2M-4 -51l-13 3M4 -52l14 -2M4 -51l13 3', '#f0e8e0', .8, .7);
      cx.restore();
    };
    cx.save(); cx.translate(236, 452); T.soft(0, 0, 34, 6, .4); T.fill('M-30 0L-24 -46H24L30 0Z', T.lin(-30, 0, 30, 0, [[0, '#e8ecf0'], [.6, '#b8bcc4'], [1, '#7a7e88']])); for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) T.ell(-20 + j * 7, -38 + i * 9, 1.4, 1.4, '#6a6e78', .6); cx.restore();
    mouse(236, 408, 1.05, '#9a8a7a');
    cx.save(); cx.translate(790, 470); T.soft(0, 0, 36, 6, .4); T.rrect(-30, -44, 60, 44, 3, '#efe6d8'); for (const y of [-34, -24, -14]) T.rect(-30, y, 60, 3, '#3f7486'); T.ell(-30, -22, 4, 22, '#d8ccb8'); cx.restore();
    mouse(790, 428, .88, '#a89a8a'); mouse(734, 474, .54, '#b8a898');
    // door: a small round mouse door with a brass knob
    T.ell(64, 520, 44, 46, '#2a160a'); T.ell(64, 524, 38, 40, T.lin(26, 0, 102, 0, [[0, '#a8603a'], [1, '#5a2a14']])); for (let i = -2; i <= 2; i++) T.stroke(`M${64 + i * 13} 486V562`, '#3a1a0a', 1.5, .5);
    T.ell(88, 528, 4, 4, '#e8c050'); T.ell(64, 566, 46, 6, '#000', .3);
    T.finish({ vignette: .5, vcol: '#140804' });
  },
};

/* The shepherd's hut: a real wind outside and a warm stove in. Curved tin roof, grey-green hills through the window, a coat that smells of sheep. */
GRA_ROOMS.hut = {
  plate: '#222822', ambient: .72,
  lights: [{ x: 480, y: 340, radius: 300, height: 60, color: '#ff9a4a', intensity: .44 }, { x: 274, y: 166, radius: 260, height: 140, color: '#e8f0f8', intensity: .25 }],
  fx: { flicker: [{ x: 480, y: 372, r: 160, c: '#ff8a3a', a: .22, amt: .3 }], motes: [{ x0: 180, x1: 520, y0: 120, y1: 400, n: 14, c: '#f0f4ff', a: .4 }], drift: [{ x: 240, y: 132, r: 30, c: '#ffffff', a: .55, dx: 40, dy: 2, sp: .15, depth: 1 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#1e241e');
    // curved tin roof inside: matchboard painted sage, ribs, the curve's shadow
    const shell = 'M0 392V120Q480 -60 960 120V392Z';
    T.fill(shell, '#6e7c64');
    T.clip(shell, () => { T.planksV(0, 0, 960, 392, { base: '#76866c', w: 22, wMax: 24, var: .08, gap: .3, grainA: .15 }); T.rect(0, 0, 960, 392, T.lin(0, 0, 0, 392, [[0, '#0c100c', .55], [.4, '#0c100c', .1], [1, '#0c100c', .25]])); });
    for (let i = 0; i < 9; i++) { const x = i * 120, top = 130 - Math.sin(i / 8 * 3.1416) * 100; T.stroke(`M${x} ${top}V392`, '#3a4636', 6, .6); T.stroke(`M${x + 3} ${top}V392`, '#a8b89a', 1.4, .3); }
    T.fill('M0 120Q480 -60 960 120V100Q480 -84 0 100Z', '#2e382c'); T.fill('M0 0H960V100Q480 -84 0 100Z', '#181e18');
    yield;
    // window on the hill, a cloud going over, sheep
    T.soft(278, 252, 110, 12, .5); T.rect(176, 92, 196, 150, '#3a2a18'); T.grain(176, 92, 196, 150, '#1a1008', .5, false, 5);
    T.clipRect(186, 102, 176, 130, () => {
      T.rect(186, 102, 176, 130, T.lin(0, 102, 0, 232, [[0, '#a8c8dc'], [1, '#e8ecdc']]));
      T.blob(320, 124, 30, 9, '#ffffff', .8);
      T.fill('M186 200Q240 150 300 186T362 170V232H186Z', '#8aa86a'); T.fill('M186 220Q250 190 310 214T362 206V232H186Z', '#6a8e4e');
      for (const [x, y] of [[232, 196], [246, 202], [300, 204], [318, 210]]) { T.ell(x, y, 4, 3, '#f4f4ec'); T.ell(x + 3, y - 1, 1.4, 1.4, '#3a3a3a'); }
      T.stroke('M190 214l20 -6l22 4l30 -8', '#5a7048', 1.5, .6);
    });
    T.rect(186, 102, 176, 130, T.lin(186, 102, 362, 232, [[0, '#ffffff', .18], [.4, '#ffffff', 0]]));
    T.stroke('M274 102V232M186 166H362', '#3a2a18', 5); T.rect(176, 240, 196, 8, '#2e2014');
    T.shaft([[186, 232], [362, 232], [460, 600], [150, 600]], '#e8f0f8', .1, 232, 600);
    yield;
    // the coat on its peg, the crook, the calendar with a sheep
    T.ell(560, 112, 4, 4, '#2a2018');
    T.fill('M530 130Q560 104 590 130L600 280Q560 296 520 280Z', T.lin(520, 0, 600, 0, [[0, '#7a5c40'], [.5, '#6a5038'], [1, '#3a2a1a']]));
    T.stroke('M560 124V284', '#3a2a18', 2); T.stroke('M538 150L534 270M582 150L588 270', '#4a3624', 2, .5); T.rect(540, 200, 14, 18, '#4a3624', .6); T.soft(564, 296, 40, 6, .3);
    T.stroke('M900 392V110Q900 84 874 90', '#5a3a1e', 6); T.stroke('M898 392V110', '#a8784a', 1.5, .4);
    T.soft(684, 214, 46, 8, .35); T.rect(640, 104, 80, 104, '#efe6cc'); T.rect(640, 104, 80, 16, '#a83a2a'); T.blob(680, 160, 18, 13, '#f4f4ec'); T.ell(696, 152, 7, 7, '#3a3a3a');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) T.rect(648 + j * 10, 180 + i * 6, 6, 3, '#8a8070', .5);
    // the bunk with its blanket
    T.soft(95, 396, 70, 8, .5); T.rect(40, 300, 110, 94, '#3a2c18'); T.grain(40, 300, 110, 94, '#1a1008', .4, false, 6);
    T.cloth(40, 290, 110, 30, '#a84a3a', { folds: 5, flare: 2, hem: 4 }); for (let i = 0; i < 4; i++) T.rect(40, 296 + i * 6, 110, 2, '#e8d0a0', .35);
    T.rrect(50, 270, 40, 22, 8, '#e8e0cc'); T.ell(66, 276, 14, 5, '#ffffff', .5);
    yield;
    // floor, the stove's glow on the boards, a rag rug, the dog's bowl
    T.floorBoards(392, 600, { base: '#6a4c30', n: 14 });
    T.skirt(394, .45);
    T.ell(480, 440, 260, 70, T.rad(480, 420, 260, [[0, '#ff9a4a', .3], [1, '#ff9a4a', 0]]));
    cx.save(); cx.translate(250, 500); cx.scale(1, 38 / 110); for (const [rr, c] of [[110, '#5a6a7a'], [96, '#a8604a'], [78, '#c8b078'], [58, '#6a7a8a'], [40, '#a8604a'], [20, '#c8b078']]) T.ell(0, 0, rr, rr, c, .9); cx.restore();
    T.soft(800, 504, 40, 8, .4); T.ell(800, 500, 34, 10, '#6a2218'); T.ell(800, 495, 26, 7, '#a83a2a'); T.ell(800, 493, 19, 5, '#2a120a'); T.ell(790, 492, 6, 2, '#ffffff', .3);
    // door: a plain latch door, the wind under it
    T.rect(14, 396, 92, 164, '#141810'); T.rect(21, 403, 78, 154, T.lin(21, 0, 99, 0, [[0, '#6a7a5a'], [1, '#3a4a32']])); T.grain(21, 403, 78, 154, '#1a2214', .35, true, 6);
    T.stroke('M21 420L99 540', '#2a3424', 6, .8); T.rect(21, 418, 78, 6, '#2a3424'); T.rect(21, 536, 78, 6, '#2a3424');
    T.stroke('M80 470h16', '#1a1a1a', 3); T.ell(96, 470, 3, 3, '#3a3a3a'); T.rect(14, 556, 92, 4, '#e8f0f8', .6);
    T.finish({ vignette: .5, vcol: '#080a08' });
  },
};

/* The treehouse: a child built it. Dappled green light, crooked planks in a hundred browns, the trunk coming up through the floor. */
GRA_ROOMS.treehouse = {
  plate: '#3f7a38', ambient: .92,
  lights: [{ x: 480, y: 120, radius: 520, height: 220, color: '#fff8d0', intensity: .33 }],
  fx: { drift: [{ x: 200, y: 280, r: 60, c: '#fff8c0', a: .18, dx: 30, sp: .3 }, { x: 420, y: 330, r: 50, c: '#fff8c0', a: .15, dx: 24, sp: .25 }, { x: 640, y: 300, r: 70, c: '#fff8c0', a: .15, dx: 30, sp: .2 }, { x: 300, y: 480, r: 80, c: '#fff8c0', a: .14, dx: 40, sp: .18 }, { x: 680, y: 500, r: 70, c: '#fff8c0', a: .13, dx: 30, sp: .22 }], motes: [{ x0: 0, x1: 960, y0: 20, y1: 380, n: 16, c: '#fffbe0', a: .5, rise: -2, wind: 6 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, T.lin(0, 0, 0, 600, [[0, '#a8e0f0'], [1, '#e8f4d8']]));
    // the canopy all round: leaf clumps in layers, sun through the gaps
    for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 22; i++) { const x = T.rnd(-40, 1000), y = T.rnd(0, 200 - layer * 30), rx = T.rnd(60, 120), c = ['#2f6a30', '#3f7a38', '#55984a', '#6ab058'][Math.min(3, layer + Math.floor(T.r() * 2))]; T.blob(x, y + rx * .2, rx, rx * .56, T.shade(c, -.25), .9, 11, .45); T.blob(x - rx * .1, y, rx * .85, rx * .48, c, 1, 11, .45); T.blob(x - rx * .3, y - rx * .18, rx * .4, rx * .24, T.shade(c, .25), .8, 9, .5); }
    for (let i = 0; i < 40; i++) { const x = T.rnd(0, 960), y = T.rnd(0, 190); T.ell(x, y, T.rnd(2, 6), T.rnd(2, 5), '#fff8c0', .8); T.glow(x, y, 14, '#fff8c0', .3); }
    yield;
    // the walls: planks, every one a different plank, not reaching the top
    for (let x = -6; x < 960;) {
      const w = 40 + T.r() * 34, top = 166 + T.r() * 44, lean = (T.r() - .5) * 8, c = T.pick(['#a07a4a', '#8e6a3e', '#b48a54', '#7e5c34', '#9a7040']);
      T.poly([[x, 392], [x + lean, top], [x + w + lean, top], [x + w, 392]], T.lin(x, 0, x + w, 0, [[0, T.shade(c, .12)], [1, T.shade(c, -.2)]]));
      cx.save(); cx.beginPath(); cx.moveTo(x, 392); cx.lineTo(x + lean, top); cx.lineTo(x + w + lean, top); cx.lineTo(x + w, 392); cx.closePath(); cx.clip(); T.grain(x - 6, top, w + 12, 392 - top, T.shade(c, -.45), .35, true, 5); cx.restore();
      T.stroke(`M${x + w} 392L${x + w + lean} ${top}`, '#3a2612', 2, .7); T.ell(x + w / 2 + lean / 2, top + 14, 2, 2, '#3a3a3a', .8); T.ell(x + w / 2, 370, 2, 2, '#3a3a3a', .8);
      x += w - 2;
    }
    T.rect(0, 160, 960, 232, T.lin(0, 160, 0, 392, [[0, '#000', 0], [1, '#000', .2]]));
    // dapples on the planks
    for (let i = 0; i < 40; i++) T.blob(T.rnd(0, 960), T.rnd(190, 390), T.rnd(10, 30), T.rnd(6, 16), '#fff4c0', .14, 8, .5);
    yield;
    // the trunk coming up through the floor, a branch through the window-hole
    const trunk = 'M566 392Q590 260 560 120Q540 40 600 0H744Q700 60 736 160Q760 280 770 392Z';
    T.fill(trunk, T.lin(560, 0, 770, 0, [[0, '#8a6440'], [.4, '#6a4a2a'], [1, '#3a2614']]));
    T.clip(trunk, () => { for (let i = 0; i < 18; i++) { const x = T.rnd(560, 770); T.stroke(`M${x} 400Q${x + T.rnd(-20, 20)} 200 ${x + T.rnd(-30, 30)} 0`, T.pick(['#4a3018', '#9a7450']), T.rnd(1.5, 4), .5); } });
    T.fill('M740 214Q830 186 950 204L960 226Q840 214 748 240Z', '#6a4a2a'); T.blob(900, 196, 56, 30, '#4f9a46'); T.blob(890, 186, 30, 14, '#7ac066', .8);
    // KEEP OUT, comics, a crate of club things, a very serious flag
    cx.save(); cx.translate(188, 244); cx.rotate(-.05); T.soft(4, 6, 104, 46, .3); T.rrect(-98, -44, 196, 88, 2, T.lin(0, -44, 0, 44, [[0, '#f4ecd4'], [1, '#d8ccac']]));
    cx.fillStyle = '#a83a2a'; cx.font = '800 26px Georgia, serif'; cx.textAlign = 'center'; cx.fillText('KEEP OUT', 0, -6); cx.fillStyle = '#3a3a3a'; cx.font = '700 13px Georgia, serif'; cx.fillText('THIS MEANS YOU', 2, 24); cx.restore();
    cx.save(); cx.translate(835, 291); cx.rotate(.12); T.soft(2, 4, 50, 34, .3); T.rect(-45, -31, 90, 62, '#ffffff'); T.rect(-39, -23, 36, 46, '#e8504a'); T.rect(3, -23, 36, 46, '#4a90d8'); T.ell(-21, -2, 10, 10, '#ffe08a'); T.poly([[12, 16], [21, -8], [30, 16]], '#ffffff', .8); cx.restore();
    T.soft(105, 396, 60, 8, .4); T.rrect(50, 340, 110, 54, 3, '#3f6a86'); T.rrect(58, 322, 76, 20, 2, '#c8483a'); T.rrect(64, 306, 52, 16, 2, '#e8c04a');
    T.stroke('M380 110V176', '#3a2612', 4); T.fill('M380 112L430 124L380 140Z', '#c8483a'); cx.fillStyle = '#fff'; cx.font = '800 11px sans-serif'; cx.fillText('X', 392, 131);
    yield;
    // the floor: boards with gaps, sky showing under them
    T.floorBoards(392, 600, { base: '#8a6440', n: 12, spread: 2.2, seam: .1 });
    for (let i = 0; i < 9; i++) T.rect(i * 110 + 30, 392, 4 + (i % 3), 208, '#b8e4f0', .5);
    T.skirt(394, .35);
    for (let i = 0; i < 14; i++) T.blob(T.rnd(0, 960), T.rnd(420, 590), T.rnd(20, 60), T.rnd(6, 14), '#fff4c0', .14, 8, .5);
    // a jar with a frog in it, marbles, pencils
    T.soft(790, 470, 40, 8, .35); T.rrect(770, 430, 40, 40, 6, '#c8e4d8', .55); T.rect(772, 424, 36, 8, '#8a6a3a'); T.ell(790, 460, 11, 7, '#5fa83a'); T.ell(786, 454, 2, 2, '#fff'); T.rect(774, 434, 4, 30, '#ffffff', .4);
    for (const [x, y, c] of [[300, 500, '#4a90d8'], [330, 520, '#e8504a'], [280, 540, '#f4c84a']]) { T.soft(x + 2, y + 5, 8, 2, .4); T.ell(x, y, 6, 6, c); T.ell(x - 2, y - 2, 1.6, 1.6, '#fff'); }
    T.stroke('M420 548l50 -16', '#e8c04a', 4); T.stroke('M430 560l40 -6', '#4a90d8', 4); T.stroke('M466 533l6 -2', '#3a3a3a', 3);
    // door: the rope ladder going down through the floor hole
    T.ell(64, 530, 56, 22, '#2a1a0c'); T.ell(64, 532, 48, 17, T.lin(0, 515, 0, 549, [[0, '#4a8a3a'], [1, '#a8d8a0']]));
    T.stroke('M42 400V530M86 400V530', '#c8a870', 3); for (let y = 412; y < 530; y += 22) T.stroke(`M42 ${y}h44`, '#a07a44', 5);
    T.finish({ vignette: .28, vcol: '#1a3a14' });
  },
};

/* Down the ice house: a brick dome going up to one small round of daylight; blue on everything, straw on the floor. */
GRA_ROOMS.icehouse = {
  plate: '#16222c', ambient: .78,
  lights: [{ x: 480, y: 200, radius: 420, height: 260, color: '#e8f8ff', intensity: .33 }],
  fx: { motes: [{ x0: 300, x1: 660, y0: 60, y1: 400, n: 22, c: '#ffffff', a: .6, rise: -3 }], glints: [{ x0: 40, x1: 920, y0: 260, y1: 400, n: 12, c: '#ffffff', a: .9 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#121c24');
    const dome = 'M30 392Q30 0 480 0Q930 0 930 392Z';
    T.fill(dome, '#3e5a6c');
    // the dome's brick rings, each course a ring of bricks (three rings a step)
    for (let i0 = 1; i0 < 10; i0 += 3) { T.clip(dome, () => { for (let i = i0; i < Math.min(10, i0 + 3); i++) {
        const rx = 30 + i * 48, ry = 22 + i * 44, n = 10 + i * 6;
        for (let k = 0; k < n; k++) { const a0 = Math.PI + k / n * Math.PI, a1 = Math.PI + (k + .92) / n * Math.PI, c = T.shade('#6a8a9c', (T.r() - .5) * .3 - i * .02); cx.beginPath(); cx.ellipse(480, 392, rx, ry, 0, a0, a1); cx.ellipse(480, 392, rx + 44, ry + 42, 0, a1, a0, true); cx.closePath(); cx.fillStyle = c; cx.fill(); }
      } }); yield; }
    T.clip(dome, () => {
      T.rect(30, 0, 900, 392, T.rad(480, 40, 560, [[0, '#f0faff', .45], [.4, '#a8d0e4', .12], [1, '#0a1820', .7]]));
    });
    yield;
    // the round of daylight, and what it does
    T.ell(480, 36, 56, 26, '#2e4a5c'); T.ell(480, 36, 50, 22, '#ffffff'); T.glow(480, 40, 140, '#ffffff', .35);
    T.shaft([[440, 50], [520, 50], [680, 400], [280, 400]], '#ffffff', .2, 50, 400);
    // icicles round the top, frost feathers on the brick
    for (let i = 0; i < 30; i++) { const a = Math.PI * (i + .5) / 30, x = 480 - Math.cos(a) * 430, y = 392 - Math.sin(a) * 380, l = 22 + (i * 7) % 34; T.poly([[x - 6, y], [x, y + l], [x + 6, y]], T.lin(0, y, 0, y + l, [[0, '#ffffff'], [1, '#bfe6f4', .6]])); T.stroke(`M${x - 2} ${y}l1.5 ${l * .7}`, '#ffffff', 1, .8); }
    for (const [x, y, k] of [[140, 250, 1], [800, 210, 1.2], [260, 150, .8], [690, 120, .7]]) { cx.save(); cx.translate(x, y); cx.scale(k, k); for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; T.stroke(`M0 0L${Math.cos(a) * 34} ${Math.sin(a) * 34}M${Math.cos(a) * 18} ${Math.sin(a) * 18}l${Math.cos(a + .7) * 11} ${Math.sin(a + .7) * 11}M${Math.cos(a) * 18} ${Math.sin(a) * 18}l${Math.cos(a - .7) * 11} ${Math.sin(a - .7) * 11}`, '#ffffff', 1.6, .6); } cx.restore(); }
    yield;
    // stacked blocks round the wall, straw between; the saw and tongs hanging
    for (const [x, y, w] of [[60, 332, 150], [84, 278, 110], [750, 332, 160], [786, 278, 96], [216, 350, 70], [684, 350, 60]]) {
      T.soft(x + w / 2, y + 58, w * .6, 8, .4);
      T.rrect(x, y, w, 56, 4, T.lin(x, y, x + w, y + 56, [[0, '#eef8fc', .95], [.5, '#bfe2f0', .9], [1, '#7aaac0', .9]])); T.poly([[x, y], [x + 10, y - 8], [x + w + 10, y - 8], [x + w, y]], '#f8feff');
      T.rect(x + 8, y + 7, w * .4, 6, '#ffffff', .8); T.stroke(`M${x + w * .6} ${y + 10}l18 26M${x + w * .3} ${y + 30}l10 14`, '#ffffff', 1.4, .6); T.ell(x + w * .7, y + 40, w * .2, 6, '#5a8aa0', .25);
    }
    for (let i = 0; i < 160; i++) { const x = T.pick([T.rnd(50, 300), T.rnd(680, 910)]), y = T.rnd(380, 398); T.stroke(`M${x} ${y}l${T.rnd(-10, 10)} ${T.rnd(-6, 0)}`, T.pick(['#d8c070', '#b89a4a']), 1.2, .8); }
    T.stroke('M204 140q-6 60 4 110', '#6a7a84', 3); T.rrect(170, 244, 72, 11, 2, '#7a8a94'); for (let i = 0; i < 9; i++) T.poly([[172 + i * 8, 255], [176 + i * 8, 261], [180 + i * 8, 255]], '#7a8a94'); T.rect(236, 240, 10, 22, '#6e4a2a');
    yield;
    // the floor: straw on stone, the cold box's patch in the middle
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#a8c4d0'], [1, '#4e6a7a']]));
    T.flags(394, 600, { base: '#7a96a4', mortar: '#4a6270', h: 15, w: 150, var: .12 });
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#e8f8ff', .25], [1, '#0a1820', .4]]));
    T.ell(480, 396, 450, 16, '#2e4a5c', .35); T.skirt(396, .4, '#0a1820');
    cx.lineCap = 'round'; for (let i = 0; i < 400; i++) { const x = T.r() < .6 ? T.rnd(40, 340) : T.rnd(620, 920), y = T.rnd(404, 596), a = (T.r() - .5) * 1.4, l = 6 + T.r() * 12; cx.strokeStyle = T.pick(['#e8d080', '#c8a850', '#a8883a']); cx.globalAlpha = .75; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * .4); cx.stroke(); } T.alpha(1);
    T.ell(480, 470, 240, 60, '#ffffff', .1);
    // door: the heavy ice-house door, frosted, the day behind it
    T.rect(14, 396, 96, 164, '#1e2c36'); T.rect(20, 402, 84, 154, T.lin(20, 0, 104, 0, [[0, '#8aa8b8'], [1, '#4a6878']])); T.grain(20, 402, 84, 154, '#2e4452', .3, true, 6);
    T.rect(20, 430, 84, 8, '#2e4452'); T.rect(20, 520, 84, 8, '#2e4452'); T.rect(20, 402, 84, 30, '#ffffff', .35); T.ell(92, 480, 5, 5, '#c8d4dc');
    T.finish({ vignette: .45, vcol: '#06101a' });
  },
};

/* The old hothouse: green, wet and too warm. White-and-rust ironwork, sun through old glass, palms pressing on the roof, steam. */
GRA_ROOMS.hothouse = {
  plate: '#2e2a1e', ambient: .9,
  lights: [{ x: 320, y: 60, radius: 620, height: 260, color: '#fff8c8', intensity: .33 }],
  fx: { drift: [{ x: 160, y: 404, r: 90, c: '#ffffff', a: .2, dx: 50, sp: .12 }, { x: 460, y: 400, r: 110, c: '#ffffff', a: .18, dx: 60, sp: .1 }, { x: 780, y: 404, r: 90, c: '#ffffff', a: .2, dx: 50, sp: .14 }], motes: [{ x0: 100, x1: 700, y0: 60, y1: 400, n: 22, c: '#fffbe0', a: .5, rise: 5 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, T.lin(0, 0, 0, 400, [[0, '#e8f6dc'], [.6, '#a8d4ac'], [1, '#6a9e7c']]));
    T.glow(320, 40, 520, '#fff8c8', .35, 'source-over');
    // far jungle through the glass, hazy
    for (let i = 0; i < 30; i++) { const x = T.rnd(-60, 1020), y = T.rnd(260, 380), rx = T.rnd(60, 120), c = T.pick(['#3f8a5a', '#2f7a4e', '#55a06a']); T.blob(x, y, rx, rx * .6, c, .5, 11, .45); T.blob(x - rx * .2, y - rx * .2, rx * .5, rx * .3, T.shade(c, .2), .4, 9, .5); }
    T.rect(0, 0, 960, 396, '#e8f6dc', .14); T.rect(0, 0, 960, 396, T.lin(0, 0, 960, 0, [[0, '#1a3a24', 0], [.6, '#1a3a24', .05], [1, '#1a3a24', .3]]));
    yield;
    // two palms and a banana up against the glass
    const palm = (x, k, c1, c2) => {
      cx.save(); cx.translate(x, 410); cx.scale(k, k);
      T.stroke('M0 0Q-8 -130 6 -240', '#5a4a2e', 14); T.stroke('M-3 0Q-11 -130 3 -240', '#8a7a52', 3, .5); for (let y = -30; y > -240; y -= 22) T.stroke(`M-6 ${y}h14`, '#3a2e1a', 3, .7);
      for (let a = 0; a < 11; a++) { const ang = -Math.PI / 2 + (a - 5) * .3, f = sceneDraw.frond(4, -240, ang, 150 + (5 - Math.abs(a - 5)) * 14, 50 + Math.abs(a - 5) * 12, 34, 12); T.stroke(f.rib, T.shade(c1, -.3), 2.4); T.fill(f.blades, a % 2 ? c1 : c2); }
      cx.restore();
    };
    palm(170, 1, '#2f7a4e', '#3f9a5e'); palm(800, 1.2, '#2a6e46', '#469e60'); palm(500, .82, '#3a8a54', '#58ac6a');
    yield;
    // the ironwork: a bowed roof, ribs, little panes, rust runs
    for (let i = 0; i < 9; i++) { T.stroke(`M${i * 120} 392V96Q${i * 120 + 60} 14 ${i * 120 + 120} 96`, '#f4f4ec', 7); T.stroke(`M${i * 120 + 3} 392V96`, '#a8a89c', 2, .5); }
    T.rect(0, 92, 960, 8, '#f4f4ec'); T.rect(0, 240, 960, 6, '#f4f4ec', .85); T.fill('M0 0H960V24Q480 -10 0 24Z', '#d8d8cc');
    for (let i = 0; i < 40; i++) T.stroke(`M${(i * 24) % 960} ${(i * 37) % 2 ? 100 : 246}v${150 - (i % 3) * 20}`, '#f4f4ec', 1.5, .5);
    for (const [x, y] of [[66, 100], [186, 246], [546, 100], [786, 246], [426, 246], [306, 100]]) T.rect(x - 1.5, y, 3, T.rnd(20, 50), T.lin(0, y, 0, y + 50, [[0, '#a8603a', .8], [1, '#a8603a', 0]]));
    for (const [x, y, w] of [[200, 110, 60], [640, 120, 90], [380, 260, 40]]) T.rect(x, y, w, 90, '#ffffff', .25);
    for (let i = 0; i < 18; i++) T.ell(T.rnd(0, 960), T.rnd(100, 380), T.rnd(2, 5), T.rnd(3, 6), '#ffffff', .35);
    T.stroke('M0 180Q120 120 240 180T480 150T720 190T960 140', '#2f7a3a', 4);
    for (let i = 0; i < 26; i++) { const x = i * 38 + T.rnd(-8, 8), y = 168 + Math.sin(i * .8) * 18; T.fill(sceneDraw.leaf(x, y, T.rnd(.6, 2.4), T.rnd(14, 22), 6), T.pick(['#4f9a56', '#3f8a4a', '#6ab060'])); }
    yield;
    // the bed: brick, then pots, orchids in flower
    T.bricks(0, 368, 960, 396, { base: '#9a5a3a', mortar: '#c8a888', h: 14, w: 36 }); T.rect(0, 368, 960, 4, '#c8845a');
    for (const [x, c] of [[86, '#d88ac0'], [300, '#f4dc6a'], [420, '#e86a8a'], [620, '#d88ac0'], [900, '#f4a84a']]) {
      cx.save(); cx.translate(x, 368); T.soft(0, 0, 24, 4, .3); T.fill('M-20 -28L-14 0H14L20 -28Z', T.lin(-20, 0, 20, 0, [[0, '#d0784a'], [1, '#8a4a28']])); T.rrect(-22, -32, 44, 7, 2, '#c8724a');
      T.stroke('M0 -32Q-14 -70 6 -96M0 -32Q12 -56 22 -66', '#3f8a4a', 3); T.fill(sceneDraw.leaf(0, -32, -2.6, 30, 8), '#3f8a4a'); T.fill(sceneDraw.leaf(0, -32, -.5, 26, 7), '#4f9a56');
      for (const [px, py] of [[6, -100], [22, -70]]) for (let p = 0; p < 5; p++) { const a = p / 5 * 6.283; T.ell(px + Math.cos(a) * 6, py + Math.sin(a) * 6, 6, 3.4, c, 1, a); } T.ell(6, -100, 2.4, 2.4, '#fff4b0'); T.ell(22, -70, 2, 2, '#fff4b0');
      cx.restore();
    }
    yield;
    // the pipes and the wet tiled floor, steam coming off
    T.rect(0, 396, 960, 204, T.lin(0, 396, 0, 600, [[0, '#6e5a42'], [1, '#2a261c']]));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) { const x = c * 100 - (r % 2) * 50, y = 446 + r * 38; T.poly([[x, y], [x + 50, y - 14], [x + 100, y], [x + 50, y + 14]], (r + c) % 2 ? '#8a7454' : '#5a4e3c', .75); T.stroke(`M${x + 4} ${y - 1}l44 -12`, '#d8c8a0', 1, .25); }
    T.rect(0, 396, 960, 204, T.lin(0, 396, 0, 600, [[0, '#fff8d0', .18], [1, '#000', .25]]));
    T.rect(0, 410, 960, 12, T.lin(0, 410, 0, 422, [[0, '#d8d8d0'], [1, '#7a7a74']])); T.rect(0, 428, 960, 7, T.lin(0, 428, 0, 435, [[0, '#b8b8b0'], [1, '#5a5a54']]));
    for (let x = 60; x < 960; x += 180) { T.rect(x, 406, 10, 20, '#6a6a64'); T.rect(x, 406, 10, 3, '#e8e8e0', .5); }
    T.skirt(398, .3);
    for (let i = 0; i < 12; i++) T.ell(T.rnd(40, 920), T.rnd(450, 590), T.rnd(30, 70), T.rnd(4, 8), '#e8f6dc', .2);
    cx.save(); cx.translate(700, 520); T.soft(0, 2, 34, 6, .4); T.rrect(-22, -30, 44, 30, 5, T.lin(-22, 0, 22, 0, [[0, '#7aaac0'], [1, '#3a6a80']])); T.stroke('M22 -24L50 -40', '#5a8aa0', 6); T.stroke('M-22 -24q-16 -4 -14 16', '#3f6a80', 4); T.rect(46, -46, 12, 10, '#3f6a80'); cx.restore();
    // sun through the old glass, grime at the panes' feet, condensation running
    T.shaft([[200, 0], [360, 0], [560, 400], [300, 400]], '#fff8c8', .2, 0, 400); T.shaft([[600, 0], [700, 0], [820, 400], [640, 400]], '#fff8c8', .14, 0, 400);
    for (let x = 0; x < 960; x += 24) T.rect(x, 200, 24, 46, T.lin(0, 200, 0, 246, [[0, '#5a6a3a', 0], [1, '#5a6a3a', .22]]));
    for (let i = 0; i < 40; i++) { const x = T.rnd(0, 960), y = T.rnd(100, 300); T.stroke(`M${x} ${y}q${T.rnd(-2, 2)} ${T.rnd(10, 30)} ${T.rnd(-1, 1)} ${T.rnd(30, 60)}`, '#ffffff', 1, .35); }
    // big leaves hanging into the room at the corners, in shadow, close to you
    for (const [x, y, a0, flip] of [[-20, -10, .5, 1], [980, -20, 2.6, -1]]) for (let i = 0; i < 7; i++) { const ang = a0 + i * .16 * flip, len = T.rnd(160, 240); T.fill(sceneDraw.leaf(x, y, ang, len, len * .16), T.pick(['#1e4a2a', '#24583a', '#183e22']), .95); T.stroke(`M${x} ${y}L${x + Math.cos(ang) * len * .9} ${y + Math.sin(ang) * len * .9}`, '#3a7a4a', 1.5, .5); }
    T.soft(480, 404, 520, 14, .45);
    // door: the glass door, misted, the garden behind
    T.rect(14, 396, 96, 164, '#e8e8dc'); T.rect(22, 404, 80, 148, T.lin(0, 404, 0, 552, [[0, '#c8e8c8'], [1, '#88b890']])); T.stroke('M62 404V552M22 470H102', '#e8e8dc', 5);
    T.blob(50, 520, 24, 14, '#5a9a5a', .7); T.rect(22, 404, 80, 148, '#ffffff', .25); T.ell(96, 480, 3, 3, '#8a6a3a');
    T.finish({ vignette: .42, vcol: '#0e1a0a' });
  },
};

/* Up in the windmill's cap: all machine. Great timbers, the brake wheel taller than you, flour hanging in a bar of light from the slit. */
GRA_ROOMS.capfloor = {
  plate: '#1a1006', ambient: .66,
  lights: [{ x: 855, y: 220, radius: 420, height: 160, color: '#fff4d0', intensity: .39 }],
  fx: { motes: [{ x0: 560, x1: 950, y0: 140, y1: 520, n: 46, c: '#fff8e0', a: .7, rise: 2, wind: -3 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#1e1208');
    // the cap's boarded walls, lit from the slit on the right
    T.planksV(0, 100, 960, 396, { base: '#5a3e22', w: 46, wMax: 60, var: .2 });
    T.rect(0, 100, 960, 296, T.lin(0, 0, 960, 0, [[0, '#0a0604', .75], [.6, '#0a0604', .25], [1, '#0a0604', .1]]));
    // the cap roof: ribs meeting overhead
    T.rect(0, 0, 960, 100, '#140c04');
    for (let i = 0; i < 9; i++) { T.stroke(`M${i * 120} 0Q${480 + (i - 4) * 40} 80 ${i * 120} 120`, '#0e0804', 9); T.stroke(`M${i * 120 + 3} 0Q${483 + (i - 4) * 40} 78 ${i * 120 + 3} 118`, '#8a6a40', 1.5, .25); }
    T.rect(0, 88, 960, 22, '#1a1006'); T.rect(0, 100, 960, 4, '#c8a060', .3);
    yield;
    // the huge windshaft across the room, iron-banded
    T.soft(480, 262, 500, 12, .5); T.rect(0, 212, 960, 44, T.lin(0, 212, 0, 256, [[0, '#7a5430'], [.3, '#5a3c1e'], [1, '#2a1a0c']])); T.grain(0, 212, 960, 44, '#1a0e06', .5, false, 5);
    for (const x of [80, 560, 720, 880]) { T.rect(x, 208, 14, 52, T.lin(x, 0, x + 14, 0, [[0, '#5a5650'], [.4, '#9a948a'], [1, '#2a2824']])); for (const y of [216, 248]) T.ell(x + 7, y, 2, 2, '#1a1a1a'); }
    // the slit, and a sail's shadow
    T.rect(820, 130, 70, 150, T.lin(0, 130, 0, 280, [[0, '#a8d0e8'], [1, '#e8f0ec']])); T.blob(860, 170, 20, 6, '#ffffff', .8);
    T.stroke('M820 130H890V280H820Z', '#2a1c0e', 6); T.glow(855, 200, 120, '#fff8e0', .4);
    T.shaft([[820, 280], [890, 280], [1000, 600], [620, 600]], '#fff4d0', .3, 280, 600);
    T.shaft([[820, 150], [820, 270], [600, 330], [600, 160]], '#fff4d0', .12, 150, 330);
    yield;
    // the great post, sacks of flour, the stones and hopper
    T.rect(600, 110, 34, 290, T.lin(600, 0, 634, 0, [[0, '#2a1a0c'], [.6, '#5a3e22'], [1, '#7a5634']])); T.grain(600, 110, 34, 290, '#140a04', .5, true, 5); T.stroke('M600 180H634M600 300H634', '#140a04', 3);
    for (const [x, y, k] of [[726, 392, 1], [798, 392, 1.06], [760, 340, .92]]) { cx.save(); cx.translate(x, y); cx.scale(k, k); T.soft(0, 2, 40, 6, .45); T.fill('M-34 0Q-42 -44 -24 -66L24 -66Q42 -44 34 0Z', T.lin(-34, 0, 34, 0, [[0, '#f4e8cc'], [.6, '#e0d0ac'], [1, '#a8987a']])); T.fill('M-20 -66L0 -80L20 -66Z', '#c8b488'); T.stroke('M-20 -66H20', '#8a7450', 2.4); T.stroke('M-24 -40q24 8 48 0', '#b8a47a', 1.6); T.ell(-12, -30, 8, 14, '#ffffff', .25); cx.restore(); }
    T.soft(90, 512, 84, 12, .5); T.ell(90, 500, 74, 22, '#5e5a50'); T.ell(90, 488, 74, 22, T.rad(70, 480, 80, [[0, '#a8a498'], [1, '#6e6a60']])); T.ell(90, 488, 20, 6, '#3a3630'); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; T.stroke(`M${90 + Math.cos(a) * 24} ${488 + Math.sin(a) * 7}L${90 + Math.cos(a) * 70} ${488 + Math.sin(a) * 20}`, '#4a4640', 1.5, .5); }
    yield;
    // floor: boards dusted with flour, footprints
    T.floorBoards(392, 600, { base: '#7a5a38', n: 15 });
    T.skirt(394, .5);
    for (let i = 0; i < 26; i++) T.ell(T.rnd(440, 940), T.rnd(410, 590), T.rnd(30, 90), T.rnd(5, 12), '#fff8e0', .14);
    for (let i = 0; i < 6; i++) { const x = 470 + i * 46, y = 540 - (i % 2) * 14; T.ell(x, y, 7, 3.4, '#2a1c0e', .4); T.ell(x + 4, y - 1, 2, 1.4, '#2a1c0e', .4); }
    // door: the trap at the top of the ladder
    T.ell(64, 532, 56, 24, '#140c04'); T.ell(64, 532, 48, 19, T.rad(64, 540, 48, [[0, '#d8a860'], [1, '#5a3a1a']]));
    T.rect(40, 420, 7, 112, '#7a5634'); T.rect(82, 420, 7, 112, '#7a5634'); for (let y = 440; y < 530; y += 24) T.rect(40, y, 49, 6, '#6a4a2a');
    T.finish({ vignette: .55, vcol: '#0a0603' });
  },
};
