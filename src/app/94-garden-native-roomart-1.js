/* Painted rooms, part one: the den, the drowned cellar, the barn loft, the
 * boat loft and the lamplighter's cupboard. Each keeps its room's layout (the
 * games' boards, wires and hulls sit where they always did) and its own light. */

/* The den: one green-shaded lamp in the corner, sepia paper on every wall, low black beams, a warm rug. */
GRA_ROOMS.den = {
  plate: '#20140a', ambient: .72,
  lights: [{ id: 'den-desk-lamp', x: 846, y: 350, radius: 240, height: 90, color: '#ffdda0', intensity: .8 }],
  fx: { motes: [{ x0: 640, x1: 940, y0: 180, y1: 420, n: 16, c: '#ffe2a0', a: .55 }], flicker: [{ x: 846, y: 344, r: 110, c: '#ffcf80', a: .08, amt: .08 }] },
  *paint(T) {
    const { cx } = T;
    // panelled wall, oak below a dado, old distemper above, browned by the lamp
    T.plaster(0, 0, 960, 300, '#6e5434', { cracks: 6 });
    T.rect(0, 0, 960, 300, T.lin(0, 0, 0, 300, [[0, '#120a04', .55], [1, '#120a04', 0]]));
    yield;
    T.planksV(0, 296, 960, 396, { base: '#4a301a', w: 60, wMax: 70, var: .12 });
    T.rect(0, 290, 960, 10, '#2e1c0e'); T.rect(0, 290, 960, 2.5, '#8a6440', .6);
    for (let x = 30; x < 960; x += 120) { T.rect(x, 312, 96, 66, '#000', .12); T.rect(x + 2, 312, 92, 3, '#a07850', .25); }
    yield;
    // low beams, adzed
    for (const [y, h] of [[0, 30], [44, 16]]) { T.rect(0, y, 960, h, '#22140a'); T.grain(0, y, 960, h, '#0e0804', .5, false, 4); T.rect(0, y + h - 3, 960, 3, '#000', .35); T.rect(0, y, 960, 2, '#6a4a2c', .35); }
    for (const x of [90, 300, 660, 870]) { T.poly([[x - 24, 0], [x + 24, 0], [x + 15, 64], [x - 15, 64]], '#1c1006'); T.grain(x - 24, 0, 48, 64, '#000', .4, true, 5); T.rect(x - 15, 62, 30, 6, '#000', .3); }
    yield;
    // charts pinned all over, each its own, the lamp side lit
    const chart = (x, y, w, h, rot, kind) => {
      cx.save(); cx.translate(x + w / 2, y + h / 2); cx.rotate(rot * Math.PI / 180); cx.translate(-w / 2, -h / 2);
      T.soft(w / 2 + 4, h / 2 + 6, w * .62, h * .6, .4);
      T.rect(0, 0, w, h, T.lin(0, 0, w, h, [[0, '#d8c69c'], [1, '#ecdcb4']]));
      T.rect(0, 0, w, h, T.rad(w * .2, h * .2, w, [[0, '#fff8e0', 0], [1, '#8a6a3a', .35]]));
      T.poly([[w, h], [w - 16, h], [w, h - 14]], '#b8a27a');
      if (kind === 0) { T.stroke(`M12 ${h * .75}Q${w * .3} 8 ${w * .55} ${h * .6}T${w - 12} 22`, '#5a84a0', 4, .85); T.stroke(`M20 24h26M30 40h40M26 ${h - 18}h60`, '#7a6a4a', 1.6, .7); }
      if (kind === 1) { for (let i = 1; i < 6; i++) { cx.strokeStyle = 'rgba(150,100,60,.7)'; cx.lineWidth = 1.1; cx.beginPath(); cx.ellipse(w / 2, h / 2, i * 11, i * 9, 0, 0, 6.3); cx.stroke(); } T.ell(w / 2, h / 2, 3, 3, '#a83a2a'); }
      if (kind === 2) { for (let i = 0; i < 9; i++) T.stroke(`M${8 + i * 22} 8V${h - 8}M8 ${8 + i * 15}H${w - 8}`, '#a8987a', .7, .7); T.stroke(`M18 ${h - 18}L70 58L120 70L${w - 22} 22`, '#b04434', 2.4); T.ell(w - 22, 22, 4, 4, '#b04434'); }
      if (kind === 3) { T.fill(`M16 ${h - 14}l28 -44l22 26l26 -52l34 70z`, '#7a8a62', .85); T.fill(`M44 ${h - 58}l8 12l-14 0z`, '#efe6cc', .8); T.stroke(`M16 ${h - 14}H${w - 14}`, '#6a5a3a', 2); }
      T.ell(w / 2 + 1, 9, 4.4, 4.4, '#7a2018'); T.ell(w / 2, 8, 3.6, 3.6, '#c84a3a'); T.ell(w / 2 - 1, 7, 1.2, 1.2, '#ffd8c8');
      cx.restore();
    };
    chart(92, 86, 170, 120, -3, 0); chart(120, 226, 130, 58, 2, 1); chart(676, 74, 190, 132, 2, 2); chart(700, 222, 150, 62, -2, 3);
    for (const [a, b, c, d] of [[178, 92, 352, 138], [770, 80, 620, 130], [186, 232, 350, 262]]) { T.stroke(`M${a} ${b}Q${(a + c) / 2} ${(b + d) / 2 + 10} ${c} ${d}`, '#3a0e08', 2, .35); T.stroke(`M${a} ${b}Q${(a + c) / 2} ${(b + d) / 2 + 8} ${c} ${d}`, '#c43a2a', 1.4, .9); }
    yield;
    // the big cork board where the torn map goes, on two legs
    T.soft(500, 360, 190, 30, .45);
    T.rrect(346, 108, 298, 244, 4, '#3a2410'); T.grain(346, 108, 298, 244, '#1a0e06', .5, false, 6);
    T.rect(354, 116, 282, 228, '#8a6a44'); for (let i = 0; i < 380; i++) T.ell(354 + T.r() * 282, 116 + T.r() * 228, .8 + T.r() * 1.6, .8 + T.r() * 1.2, T.r() < .5 ? '#6a4a2c' : '#a8845a', .5);
    T.rect(354, 116, 282, 228, T.lin(354, 116, 636, 344, [[0, '#000', .25], [1, '#ffd890', .12]]));
    T.rect(360, 352, 16, 40, '#2a1a0c'); T.rect(614, 352, 16, 40, '#2a1a0c');
    yield;
    // the floor: wide old boards, a red Turkey rug, the lamp's pool on it
    T.floorBoards(392, 600, { base: '#5a3e24', n: 15, vx: 520 });
    T.skirt(394, .5);
    cx.save(); cx.translate(480, 494); cx.scale(1, .26);
    for (const [rr, c] of [[262, '#5a1a14'], [250, '#8a2e22'], [222, '#a8482e'], [180, '#7a2a20'], [150, '#c8844a'], [118, '#8a2e22']]) T.ell(0, 0, rr, rr, c);
    for (let i = 0; i < 24; i++) { const a = i / 24 * 6.283; T.ell(Math.cos(a) * 200, Math.sin(a) * 200, 10, 10, '#e0b070', .7); T.ell(Math.cos(a) * 135, Math.sin(a) * 135, 6, 6, '#3a1810', .6); }
    cx.restore();
    T.ell(480, 494, 262, 68, T.rad(480, 470, 262, [[0, '#fff0c8', .08], [1, '#000', .25]]));
    yield;
    // the theodolite on its tripod, brass catching the lamp
    T.soft(262, 474, 50, 10, .45);
    T.stroke('M232 472L262 330L292 472M262 330V472', '#2a1a0c', 6); T.stroke('M234 470L262 334', '#6a4a2a', 2, .6);
    T.rrect(236, 304, 54, 24, 6, T.lin(0, 304, 0, 328, [[0, '#d8b45a'], [1, '#7a5a20']])); T.ell(290, 316, 9, 9, '#3a5a6a'); T.ell(290, 316, 6, 6, '#8ac8e8'); T.ell(288, 313, 2, 2, '#fff'); T.rect(258, 294, 8, 12, '#8a6a30');
    // rolls of plans standing in a basket
    for (let i = 0; i < 6; i++) { cx.save(); cx.translate(176 + i * 12, 540); cx.rotate((i - 2.5) * .08); T.rrect(-5, -72 + (i % 2) * 8, 11, 72, 4, T.lin(-5, 0, 6, 0, [[0, '#f0e2bc'], [1, '#b8a478']])); T.ell(.5, -72 + (i % 2) * 8, 5.5, 2.4, '#9a8a68'); cx.restore(); }
    T.poly([[152, 566], [162, 512], [238, 512], [248, 566]], '#6a4a28'); for (let y = 518; y < 566; y += 8) T.stroke(`M${156 + (566 - y) * .18} ${y}H${244 - (566 - y) * .18}`, '#3a2612', 2, .6);
    T.rect(152, 512, 96, 54, T.lin(152, 0, 248, 0, [[0, '#000', .3], [1, '#ffd890', .1]]));
    yield;
    // the chair, still warm, and the desk with its lamp
    T.soft(636, 506, 50, 9, .45); T.rrect(600, 450, 74, 12, 3, '#6a3e20'); T.rect(606, 462, 8, 44, '#3a2210'); T.rect(658, 462, 8, 44, '#3a2210'); T.rrect(598, 394, 10, 60, 3, '#4a2c14'); T.rrect(598, 394, 66, 9, 3, '#5a3418'); T.rect(608, 404, 50, 40, '#7a2a20', .85); T.rect(608, 404, 50, 6, '#a84a34', .5);
    T.soft(792, 484, 120, 12, .5);
    T.rrect(684, 394, 216, 16, 3, T.lin(0, 394, 0, 410, [[0, '#8a5a30'], [1, '#4a2c14']])); T.grain(684, 394, 216, 16, '#2a160a', .4, false, 4);
    T.rect(696, 410, 12, 72, '#3a2210'); T.rect(876, 410, 12, 72, '#3a2210'); T.rect(708, 412, 168, 26, '#2a180c', .7);
    T.rect(720, 378, 58, 18, '#efe2c0'); T.rect(724, 374, 50, 5, '#d8c8a0'); T.stroke('M726 386h46M726 390h40', '#8a7a5a', 1, .6);
    cx.save(); cx.translate(846, 396);
    T.rrect(-14, -7, 28, 7, 2, '#2a2a1a'); T.stroke('M0 -6V-58', '#8a7a3a', 3); T.stroke('M-1 -6V-58', '#d8c070', 1, .6);
    T.fill('M-32 -58Q-28 -88 0 -92Q28 -88 32 -58Z', T.lin(-30, -90, 30, -58, [[0, '#4a9a6a'], [.5, '#2f6a4a'], [1, '#163a26']])); T.fill('M-24 -66Q-18 -84 -4 -88', 'none'); T.stroke('M-22 -64Q-16 -82 -2 -86', '#9ae0b0', 2, .5);
    T.ell(0, -58, 32, 6, '#fff2c0');
    cx.restore();
    T.glow(846, 370, 260, '#ff9a40', .2); T.glow(846, 352, 120, '#ffd890', .22); T.ell(846, 398, 70, 8, '#fff0c0', .25);
    // a chain across the floor
    for (let i = 0; i < 14; i++) T.ell(364 + i * 18, 546 + Math.sin(i * .7) * 8, 7, 4, '#8a8070', .85, i % 2 ? .4 : -.4);
    // the trap overhead and its ladder
    T.rect(22, 40, 84, 16, '#160c04'); T.rect(28, 56, 72, 12, '#fff0c0', .85); T.glow(64, 60, 90, '#ffd890', .6);
    T.poly([[100, 56], [130, 12], [130, 26], [100, 68]], '#6a4a2c');
    for (const dx of [26, 72]) { T.rect(14 + dx - 3, 64, 7, 496, T.lin(0, 0, 7, 0, [[0, '#8a6a44'], [1, '#4a3018']])); }
    for (let y = 96; y < 556; y += 40) { T.rect(38, y, 52, 7, '#7a5634'); T.rect(38, y + 5, 52, 2, '#000', .3); }
    T.shaft([[30, 64], [98, 64], [150, 400], [-10, 400]], '#ffe0a0', .18, 64, 400);
    yield;
    T.finish({ vignette: .6 });
  },
};

/* The drowned cellar: underwater light from the pool above, wet brick vaults going back, a flood on the floor. */
GRA_ROOMS.cellar = {
  plate: '#071c24', ambient: .6,
  lights: [{ x: 480, y: 300, radius: 380, height: 140, color: '#a8ffe8', intensity: .7 }],
  fx: {
    motes: [{ x0: 120, x1: 860, y0: 60, y1: 390, n: 22, c: '#c8fff0', a: .45, rise: 10 }],
    drift: [{ x: 150, y: 250, r: 120, c: '#a8ffe8', a: .07, dx: 30, sp: .2 }, { x: 480, y: 260, r: 160, c: '#a8ffe8', a: .08, dx: 40 }, { x: 800, y: 250, r: 120, c: '#a8ffe8', a: .07, dx: 30, sp: .15 }],
    glints: [{ x0: 360, x1: 880, y0: 456, y1: 548, n: 12, c: '#e8fff8', a: .8, inside: (x, y) => ((x - 620) / 280) ** 2 + ((y - 500) / 56) ** 2 < 1 }],
  },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, T.lin(0, 0, 0, 600, [[0, '#2f7c7c'], [.35, '#16444e'], [1, '#08202a']]));
    yield;
    // wet brick on both side walls, darker as it goes up into the water
    T.bricks(0, 20, 300, 396, { base: '#1e5560', mortar: '#0c2a32', h: 30, w: 58, var: .35 });
    T.bricks(660, 20, 960, 396, { base: '#1e5560', mortar: '#0c2a32', h: 30, w: 58, var: .35 });
    for (let i = 0; i < 26; i++) { const x = T.pick([T.rnd(0, 300), T.rnd(660, 960)]), y = T.rnd(30, 120), l = T.rnd(80, 300); T.rect(x, y, T.rnd(6, 22), l, T.lin(0, y, 0, y + l, [[0, '#4a9a7a', .22], [1, '#4a9a7a', 0]])); }
    for (const x of [0, 660]) T.rect(x, 20, 300, 376, T.lin(x, 0, x + 300, 0, x ? [[0, '#06161c', .2], [1, '#06161c', .6]] : [[0, '#06161c', .6], [1, '#06161c', .2]]));
    yield;
    // three vaults going back into the green, the far one lit
    const vault = (x0, x1, top, c) => `M${x0} 392V${top + (x1 - x0) * .4}Q${x0} ${top} ${(x0 + x1) / 2} ${top}Q${x1} ${top} ${x1} ${top + (x1 - x0) * .4}V392Z`;
    T.fill(vault(250, 710, 60), '#0a2a32'); T.clip(vault(250, 710, 60), () => T.bricks(250, 60, 710, 392, { base: '#174a52', mortar: '#0a2228', h: 26, w: 50 }));
    T.clip(vault(320, 640, 110), () => { T.bricks(320, 110, 640, 392, { base: '#1d6068', mortar: '#0f3a40', h: 22, w: 44 }); T.rect(320, 110, 320, 282, '#04141a', .25); });
    T.fill(vault(250, 710, 60), T.lin(250, 0, 710, 0, [[0, '#04141a', .55], [.2, '#04141a', 0], [.8, '#04141a', 0], [1, '#04141a', .55]]));
    T.fill(vault(385, 575, 165), T.lin(0, 165, 0, 392, [[0, '#3aa0a0'], [1, '#1f6a70']]));
    T.glow(480, 300, 150, '#b8fff0', .45);
    yield;
    // the arch rings, lit on top
    for (const [x0, x1, top, w] of [[250, 710, 60, 16], [320, 640, 110, 12], [385, 575, 165, 8]]) { T.stroke(vault(x0, x1, top).replace(/V392Z$/, '').replace(/^M[\d.]+ 392V/, `M${x0} 392V`), '#0a1e24', w); T.stroke(`M${x0} ${top + (x1 - x0) * .4}Q${x0} ${top} ${(x0 + x1) / 2} ${top}Q${x1} ${top} ${x1} ${top + (x1 - x0) * .4}`, '#6ac8c0', 2, .35); }
    // the pool overhead: a rippling ceiling of light
    T.fill('M0 0H960V44Q720 30 480 70Q240 30 0 44Z', '#0a2830');
    for (let i = 0; i < 40; i++) { const x = T.r() * 960, w = 30 + T.r() * 60, y = 6 + T.r() * 34; T.stroke(`M${x} ${y}q${w / 2} ${4 + T.r() * 6} ${w} 0`, '#c0fff0', 2 + T.r() * 2, .25 + T.r() * .3); }
    for (const [x, w] of [[150, 70], [480, 110], [800, 80]]) T.shaft([[x - w / 3, 30], [x + w / 3, 30], [x + w, 392], [x - w, 392]], '#a8ffe8', .22, 30, 392);
    yield;
    // shelves of jars in the far vault, roots through the brick
    for (const y of [236, 356]) { T.soft(480, y + 18, 230, 10, .5); T.rect(256, y, 452, 11, '#3a2c1c'); T.grain(256, y, 452, 11, '#1a120a', .5, false, 3); T.rect(256, y, 452, 2, '#8a7a5a', .4); T.rect(262, y + 11, 8, 26, '#2a2014'); T.rect(694, y + 11, 8, 26, '#2a2014'); }
    for (const [x, l] of [[120, 110], [212, 74], [776, 120], [860, 60], [560, 50]]) { T.stroke(`M${x} 30q-12 ${l / 2} 6 ${l}q6 18 -3 34`, '#1a2414', 6); T.stroke(`M${x - 1} 30q-12 ${l / 2} 5 ${l}`, '#4a5a34', 2, .6); }
    // weed on the brick, swaying in the light
    for (let i = 0; i < 18; i++) { const x = T.pick([20, 60, 100, 860, 900, 940, 280, 680]) + T.rnd(-14, 14), l = 30 + T.r() * 50; T.stroke(`M${x} 396q${T.rnd(-10, 10)} -${l / 2} ${T.rnd(-6, 6)} -${l}`, T.pick(['#2a6a4a', '#3a8a5a', '#1e5a3e']), 3, .8); }
    yield;
    // the flood on the floor: stone flags under water, the pool where things swim
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#14505a'], [1, '#07202a']]));
    T.stones(0, 400, 960, 600, { base: '#1a4a52', mortar: '#123a42', h: 30, w: 110, var: .1 });
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#2a8a8a', .45], [1, '#06161c', .35]]));
    T.skirt(394, .45, '#031014');
    T.soft(620, 502, 330, 76, .5, '#020c10');
    cx.save(); cx.translate(620, 498); cx.scale(1, 60 / 288); T.ell(0, 0, 288, 288, T.rad(-20, -60, 300, [[0, '#7ad0c6'], [.55, '#3a9a9c'], [.9, '#1a5a64'], [1, '#0e3a44']])); cx.restore();
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, x = 620 + Math.cos(a) * 292, y = 500 + Math.sin(a) * 62; T.blob(x, y, 26, 10, i % 2 ? '#1e4a50' : '#28565c', .9, 7, .3); T.ell(x - 6, y - 4, 12, 3, '#6ac8c0', .25); }
    T.ell(590, 478, 170, 16, '#e0fff6', .3); T.ell(700, 520, 120, 10, '#bff0e8', .14);
    yield;
    // a half-sunk barrel, a stool, the steps you came down
    cx.save(); cx.translate(826, 452); cx.rotate(-.21); T.soft(0, 20, 50, 10, .4); T.ell(0, 0, 40, 26, T.lin(-40, 0, 40, 0, [[0, '#3a2412'], [.4, '#7a5432'], [1, '#2a1a0c']])); T.stroke('M-38 -10Q0 -30 38 -10M-40 8Q0 -12 40 8', '#1a1006', 3); T.ell(34, -4, 7, 24, '#8a6a42'); cx.restore();
    T.ell(826, 476, 52, 8, '#9ee4e4', .25);
    T.soft(236, 456, 30, 6, .4); T.rrect(214, 420, 44, 10, 3, '#4a3420'); T.rect(220, 430, 6, 26, '#3a2818'); T.rect(246, 430, 6, 26, '#3a2818');
    // door: wet stone steps up to green light
    T.rect(14, 386, 106, 174, '#0a2a32');
    T.rect(20, 392, 84, 40, '#b8fff0', .7); T.glow(62, 410, 80, '#b8fff0', .5);
    for (let i = 0; i < 7; i++) { const y = 540 - i * 18, w = 100 - i * 6; T.rrect(14 + i * 2, y, w, 20, 2, i % 2 ? '#4a6068' : '#5a7078'); T.rect(14 + i * 2, y, w, 3, '#a8e8e0', .4); T.rect(14 + i * 2, y + 16, w, 4, '#000', .35); }
    yield;
    T.finish({ vignette: .55, vcol: '#02080c' });
  },
};

/* Up in the barn: afternoon gold, heavy A-frames, sun pouring from the high door onto the hay. */
GRA_ROOMS.barnloft = {
  plate: '#2a180c', ambient: .8,
  lights: [{ x: 480, y: 300, radius: 420, height: 160, color: '#ffe8b0', intensity: .85 }],
  fx: { motes: [{ x0: 260, x1: 720, y0: 180, y1: 520, n: 40, c: '#fff0b8', a: .7, rise: 3, wind: 4 }] },
  *paint(T) {
    const { cx } = T;
    // weatherboard walls, gaps of light between some
    T.rect(0, 0, 960, 600, '#3a220e');
    T.planksV(0, 0, 960, 396, { base: '#6a4424', w: 40, wMax: 56, var: .25, gap: .6 });
    for (let i = 0; i < 6; i++) { const x = T.rnd(40, 920); T.rect(x, T.rnd(40, 200), 1.6, T.rnd(40, 120), '#ffe8a0', .5); }
    T.rect(0, 0, 960, 396, T.lin(0, 0, 0, 396, [[0, '#120804', .6], [.6, '#120804', .15], [1, '#120804', .3]]));
    yield;
    // the high door, sky and sun
    T.rect(404, 42, 152, 134, T.lin(0, 42, 0, 176, [[0, '#9ad0ec'], [.5, '#d8ecf0'], [1, '#fff4c8']]));
    T.blob(450, 88, 30, 10, '#fff', .9); T.blob(520, 70, 22, 8, '#fff', .8);
    T.fill('M404 176L404 150Q440 136 480 146Q520 132 556 148V176Z', '#8ab060'); T.fill('M404 176V160Q460 150 556 162V176Z', '#6a9048');
    T.glow(480, 110, 160, '#fff0c0', .6);
    T.rect(404, 42, 152, 134, T.lin(404, 0, 556, 0, [[0, '#000', .15], [.5, '#000', 0], [1, '#000', .15]]));
    T.stroke('M480 42V176M404 110H556', '#2a180c', 6); T.rect(394, 34, 172, 10, '#2a180c'); T.rect(394, 176, 172, 10, '#2a180c');
    yield;
    // great A-frames going back, the near one with adze marks
    for (const [k, o] of [[.55, .55], [.78, .78], [1, 1]]) {
      cx.save(); cx.translate(480, 392); cx.scale(k, k); T.alpha(1);
      const c = T.mix('#2a180c', '#6a4a2a', 1 - o);
      T.stroke('M-560 -20L0 -420L560 -20', c, 26, 1, 'butt'); T.stroke('M-330 -180H330', c, 20, 1, 'butt'); T.stroke('M-60 -378V-180M60 -378V-180', c, 11, 1, 'butt'); T.stroke('M-250 -240L-100 -180M250 -240L100 -180', c, 10, 1, 'butt');
      T.stroke('M-556 -30L-4 -424', '#c89a5a', 2.5, .25 * o); T.stroke('M-330 -189H330', '#c89a5a', 2, .3 * o);
      cx.restore();
    }
    yield;
    // the cartwheel, the trunk, a ladder, lanterns: what was kept
    cx.save(); cx.translate(112, 300); T.soft(6, 68, 70, 10, .45);
    cx.strokeStyle = '#3a2414'; cx.lineWidth = 10; cx.beginPath(); cx.arc(0, 0, 58, 0, 6.3); cx.stroke(); cx.strokeStyle = '#8a6438'; cx.lineWidth = 3; cx.globalAlpha = .5; cx.beginPath(); cx.arc(0, 0, 60, 3.4, 5.2); cx.stroke(); cx.globalAlpha = 1;
    for (let a = 0; a < 6; a++) { cx.save(); cx.rotate(a * Math.PI / 6); T.rect(-3, -56, 6, 112, '#4a2e18'); cx.restore(); } T.ell(0, 0, 12, 12, '#2a180c'); T.ell(-2, -2, 6, 6, '#6a4a2a');
    cx.restore();
    T.soft(115, 404, 90, 10, .5); T.rrect(40, 362, 150, 42, 4, T.lin(0, 362, 0, 404, [[0, '#7a4e28'], [1, '#3a2210']])); T.grain(40, 362, 150, 42, '#1a0e06', .4, false, 4); T.rrect(60, 340, 90, 24, 3, '#4a2e18'); T.rect(170, 300, 10, 100, '#6e4a2a'); T.poly([[160, 300], [190, 300], [184, 270], [166, 270]], '#c8a858');
    T.soft(845, 404, 80, 10, .5); T.rrect(780, 330, 130, 72, 4, T.lin(0, 330, 0, 402, [[0, '#8a5a30'], [1, '#4a2c14']])); T.fill('M776 330Q845 288 914 330Z', '#5a3a20'); T.rect(780, 350, 130, 6, '#2e1c0e'); T.rrect(836, 340, 18, 22, 2, '#c8a03a');
    T.rect(720, 130, 8, 270, '#7a5a34'); T.rect(752, 130, 8, 270, '#7a5a34'); for (let y = 150; y < 390; y += 30) T.rect(720, y, 40, 6, '#7a5a34');
    T.stroke('M240 100q20 60 0 120', '#c8b488', 2); cx.save(); cx.translate(240, 226); T.fill('M-14 0h28l6 40h-40z', '#9a6a2a'); T.ell(0, 0, 14, 5, '#ffcf7a'); cx.restore();
    // swallows' nest, the hen on the box
    T.blob(640, 118, 22, 13, '#7a6a4a'); T.ell(636, 112, 10, 4, '#a89878', .6);
    cx.save(); cx.translate(838, 332); cx.scale(.9, .9); T.ell(0, -14, 18, 13, '#b8743a'); T.ell(-4, -18, 10, 6, '#d8944a', .6); T.ell(15, -28, 7, 7, '#b8743a'); T.fill('M21 -28l7 2l-7 3z', '#e8a83a'); T.fill('M14 -36l2 5l3 -5z', '#c8483a'); T.ell(17, -30, 1.1, 1.1, '#1a1a1a'); cx.restore();
    yield;
    // the floor is boards under hay, sun lying across it
    T.floorBoards(392, 600, { base: '#7a5a30', n: 14 });
    T.rect(0, 392, 960, 208, T.lin(0, 392, 0, 600, [[0, '#c8a050', .55], [1, '#8a6a30', .4]]));
    cx.lineCap = 'round';
    for (let i = 0; i < 1400; i++) { const x = T.r() * 960, y = 396 + T.r() * 204, l = 6 + T.r() * 14, a = (T.r() - .5) * 1.2; cx.strokeStyle = T.pick(['#e8c870', '#b8903a', '#f4dc90', '#8a6428']); cx.globalAlpha = .55; cx.lineWidth = .9 + T.r(); cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l * .4); cx.stroke(); }
    T.alpha(1); T.skirt(396, .45);
    T.shaft([[404, 176], [556, 176], [764, 600], [196, 600]], '#fff0b8', .32, 176, 600);
    T.ell(480, 520, 260, 60, '#fff4c8', .12);
    yield;
    // door: a hole in the boards, the ladder top and light from below
    T.ell(64, 526, 60, 30, '#2a180c'); T.ell(64, 528, 50, 24, T.rad(64, 530, 50, [[0, '#fff0b8'], [1, '#c89a4a']])); T.glow(64, 520, 80, '#ffd890', .5);
    T.rect(39, 410, 7, 116, '#8a6238'); T.rect(83, 410, 7, 116, '#8a6238'); for (let y = 430; y < 520; y += 26) T.rect(39, y, 51, 6, '#7a5230');
    T.finish({ vignette: .5, vcol: '#120804' });
  },
};

/* The boat loft: dark tarred roof, a dusk slot of sky at the gable end, nets and floats, rope on the boards. */
GRA_ROOMS.boatloft = {
  plate: '#101820', ambient: .68,
  lights: [{ x: 480, y: 280, radius: 360, height: 160, color: '#f4c07a', intensity: .7 }],
  fx: { motes: [{ x0: 300, x1: 660, y0: 120, y1: 460, n: 18, c: '#f8d8a0', a: .45, rise: 4 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, T.lin(0, 0, 0, 600, [[0, '#0c141c'], [.65, '#24323e'], [1, '#141a20']]));
    // tarred weatherboard, horizontal
    for (let y = 70, i = 0; y < 396; y += 26, i++) { const c = T.shade('#26323c', (T.r() - .5) * .2); T.rect(0, y, 960, 26, c); T.grain(0, y, 960, 26, '#0a1016', .35, false, 6); T.rect(0, y + 22, 960, 4, '#05080c', .55); T.rect(0, y, 960, 1.5, '#5a6a74', .25); }
    T.rect(0, 0, 960, 396, T.lin(0, 0, 960, 0, [[0, '#05080c', .55], [.4, '#05080c', 0], [.6, '#05080c', 0], [1, '#05080c', .55]]));
    yield;
    // the gable and its slot of evening sky over the water
    T.fill('M390 392V90L480 30L570 90V392Z', T.lin(0, 30, 0, 392, [[0, '#27496e'], [.55, '#d87a54'], [.8, '#f4c07a'], [1, '#f8d8a0']]));
    T.ell(500, 250, 16, 16, '#fff0c8'); T.glow(500, 250, 90, '#ffd090', .6);
    T.fill('M390 300Q440 292 480 298Q530 290 570 300V392H390Z', '#2a4a66'); for (let i = 0; i < 10; i++) T.rect(400 + T.r() * 160, 306 + T.r() * 80, 10 + T.r() * 30, 1.6, '#f8c88a', .6);
    T.fill('M390 296Q450 286 500 294Q540 288 570 294V302H390Z', '#1a2a3a');
    T.stroke('M390 90V392M570 90V392', '#0a0e12', 12, 1, 'butt'); T.stroke('M480 30V392M390 200H570', '#0a0e12', 7, 1, 'butt'); T.stroke('M390 90L480 30L570 90', '#0a0e12', 10);
    yield;
    // roof trusses
    for (const [a, b] of [[0, 300], [960, 660]]) for (let i = 0; i < 5; i++) { T.stroke(`M${a} ${i * 40 - 10}L${b + (a ? i * 12 : -i * 12)} ${40 + i * 8}`, '#080c10', 9, 1, 'butt'); T.stroke(`M${a} ${i * 40 - 13}L${b + (a ? i * 12 : -i * 12)} ${37 + i * 8}`, '#4a5a64', 1.5, .3); }
    T.rect(0, 62, 960, 16, '#080c10'); T.rect(0, 62, 960, 2, '#5a6a74', .3); T.stroke('M0 180H390M570 180H960', '#0c141a', 6);
    // nets in swags, cork floats, oars
    for (const x0 of [40, 92, 144]) { T.stroke(`M${x0} 90Q${x0 + 30} 200 ${x0 + 6} 330`, '#a8a080', 2.2, .45); for (let k = 0; k < 12; k++) T.stroke(`M${x0 + k * 2} ${100 + k * 18}l26 ${-6}`, '#a8a080', .8, .3); }
    for (let i = 0; i < 6; i++) { const x = 70 + (i * 22) % 110, y = 170 + i * 30, c = ['#d8603a', '#e8c04a', '#f4efe0'][i % 3]; T.ell(x, y, 10, 13, c); T.ell(x - 3, y - 4, 4, 5, '#fff', .35); T.ell(x + 3, y + 4, 6, 7, '#000', .2); }
    for (const [x, rot, c] of [[870, .14, '#c8603a'], [800, -.1, '#3f7486']]) { cx.save(); cx.translate(x, 200); cx.rotate(rot); T.soft(10, 20, 20, 120, .3); T.rrect(-4, -114, 8, 240, 3, T.lin(-4, 0, 4, 0, [[0, '#a87a48'], [1, '#5a3a1c']])); T.ell(0, 134, 16, 36, c); T.ell(-5, 124, 5, 18, '#fff', .2); cx.restore(); }
    yield;
    T.floorBoards(392, 600, { base: '#4a3828', n: 16 });
    T.skirt(394, .5);
    T.shaft([[390, 392], [570, 392], [810, 600], [150, 600]], '#f4c07a', .2, 392, 600);
    // rope coil, paint tins, a tar bucket
    T.soft(860, 506, 56, 12, .5); for (let k = 0; k < 5; k++) { T.ell(860, 500 - k * 6, 46 - k * 6, 18 - k * 2, k % 2 ? '#a8966a' : '#8a7a50'); T.stroke(`M${820 + k * 6} ${498 - k * 6}q40 -10 80 0`, '#6a5a38', 1.2, .5); } T.ell(860, 474, 12, 5, '#3a2c18');
    T.soft(200, 508, 50, 8, .5); T.rrect(170, 470, 32, 36, 3, T.lin(170, 0, 202, 0, [[0, '#e07a4a'], [1, '#8a3a1a']])); T.rrect(208, 482, 26, 26, 3, T.lin(208, 0, 234, 0, [[0, '#5a94a8'], [1, '#24485a']])); T.ell(186, 470, 16, 4, '#5a2a10'); T.ell(221, 482, 13, 3, '#1a3440');
    // a swallow on the tie-beam
    T.fill('M710 62q8 -9 14 0q4 -7 14 -5q-8 4 -12 8l-6 3z', '#1a242e');
    // door: a plank door, the evening under it
    T.rect(14, 396, 92, 164, '#141008'); T.rect(21, 403, 78, 154, T.lin(21, 0, 99, 0, [[0, '#7a5c3e'], [1, '#4a3420']]));
    for (const x of [20, 38, 56, 74]) T.rect(14 + x, 404, 2, 152, '#2a1c10', .7); T.grain(21, 403, 78, 154, '#2a1a0c', .4, true, 5);
    T.rect(21, 430, 78, 8, '#3a2814'); T.rect(21, 510, 78, 8, '#3a2814'); T.ell(88, 480, 4, 4, '#c8a050');
    T.rect(14, 556, 92, 4, '#f4c07a', .8); T.glow(60, 560, 60, '#f4c07a', .4);
    yield;
    T.finish({ vignette: .55, vcol: '#04070a' });
  },
};

/* The lamplighter's cupboard: narrow and black, a moon in a slot, brass catching what light there is. */
GRA_ROOMS.lampcup = {
  plate: '#05060e', ambient: .5,
  lights: [{ x: 480, y: 110, radius: 260, height: 120, color: '#d8e0ff', intensity: .55 }],
  fx: { motes: [{ x0: 300, x1: 660, y0: 70, y1: 390, n: 14, c: '#dce4ff', a: .4, rise: 3 }] },
  *paint(T) {
    const { cx } = T;
    T.rect(0, 0, 960, 600, '#04050c');
    // the two walls close in: rough limewash gone blue in the dark
    T.plaster(170, 0, 790, 392, '#2a2c48', { cracks: 5 });
    T.fill('M0 0H170L220 392H0Z', '#0c0e1e'); T.fill('M960 0H790L740 392H960Z', '#0c0e1e');
    T.planksV(0, 0, 214, 392, { base: '#1a1c30', w: 44, var: .15 }); T.fill('M170 0H214V392H220Z', '#0c0e1e');
    cx.save(); cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(170, 0); cx.lineTo(220, 392); cx.lineTo(0, 392); cx.closePath(); cx.clip(); T.planksV(0, 0, 230, 392, { base: '#1c1e34', w: 46, var: .15 }); T.rect(0, 0, 230, 392, T.lin(0, 0, 230, 0, [[0, '#000', .6], [1, '#000', .1]])); cx.restore();
    cx.save(); cx.beginPath(); cx.moveTo(960, 0); cx.lineTo(790, 0); cx.lineTo(740, 392); cx.lineTo(960, 392); cx.closePath(); cx.clip(); T.planksV(730, 0, 960, 392, { base: '#1c1e34', w: 46, var: .15 }); T.rect(730, 0, 230, 392, T.lin(730, 0, 960, 0, [[0, '#000', .1], [1, '#000', .6]])); cx.restore();
    yield;
    // a slit of window, the moon in it, its cold light on the plaster
    T.rrect(455, 34, 50, 118, 25, T.lin(0, 34, 0, 152, [[0, '#0a1440'], [1, '#1c2c60']]));
    for (let i = 0; i < 10; i++) T.ell(462 + T.r() * 36, 44 + T.r() * 100, .8, .8, '#fff', .8);
    T.ell(480, 76, 15, 15, '#f4eec8'); T.ell(475, 72, 4, 4, '#d8d0a8', .8); T.glow(480, 76, 50, '#e8e8ff', .5);
    T.stroke('M480 34V152M455 104H505', '#14142a', 4); T.stroke('M455 34h50', '#000', 2, .4);
    T.glow(480, 130, 230, '#a8b8ff', .22); T.shaft([[460, 150], [500, 150], [620, 392], [340, 392]], '#c8d0ff', .12, 150, 392);
    yield;
    // shelves: boxes of wicks, oil cans, a brass funnel
    T.soft(480, 214, 250, 8, .6); T.rect(238, 196, 484, 10, '#3a2a20'); T.rect(238, 196, 484, 2, '#8a7050', .4); T.rect(238, 206, 484, 4, '#000', .5);
    for (const [x, w, h, c] of [[250, 56, 34, '#6a4a2a'], [312, 44, 26, '#7a5a34'], [366, 60, 40, '#5a3e22'], [590, 58, 28, '#7a5a34'], [654, 54, 38, '#5a3e22']]) { T.rrect(x, 196 - h, w, h, 2, T.lin(x, 0, x + w, 0, [[0, T.shade(c, .1)], [1, T.shade(c, -.35)]])); T.rect(x + 6, 196 - h + 6, w - 12, 10, '#e4d8b0', .55); T.stroke(`M${x + 10} ${196 - h + 11}h${w - 24}`, '#5a4a30', 1, .6); }
    const brass = T.lin(0, 160, 0, 200, [[0, '#f0d070'], [.5, '#b8903a'], [1, '#6a4a18']]);
    T.fill('M450 196V164H474V196Z', brass); T.fill('M474 170L492 158L490 166L474 178Z', brass); T.fill('M520 196L528 174H556L564 196Z', brass); T.rect(452, 166, 4, 28, '#fff4c0', .4);
    // a ladder up the side, cans on the floor
    T.stroke('M200 392V80M250 392V80', '#5a4228', 8); T.stroke('M202 392V80M252 392V80', '#a8865a', 1.5, .35); for (let y = 110; y < 392; y += 38) { T.rect(200, y, 50, 7, '#5a4228'); T.rect(200, y, 50, 1.5, '#a8865a', .3); }
    yield;
    // the long wire bench, sagging, with its ugly join
    T.soft(480, 352, 260, 10, .6); T.rrect(232, 332, 496, 14, 2, T.lin(0, 332, 0, 346, [[0, '#8a5e36'], [1, '#4a2e18']])); T.grain(232, 332, 496, 14, '#2a1808', .4, false, 3); T.rect(232, 346, 496, 5, '#000', .5);
    T.stroke('M240 262Q480 286 720 262', '#5a5a68', 3); T.stroke('M240 261Q480 285 720 261', '#c8c8d8', 1, .6); T.stroke('M470 272l20 8M478 266l6 20', '#c8c8d8', 2.4);
    T.floorBoards(392, 600, { base: '#2a2030', n: 10, vx: 480, spread: 4 });
    T.fill('M0 392H220L60 600H0Z', '#06060e', .85); T.fill('M960 392H740L900 600H960Z', '#06060e', .85);
    T.skirt(394, .55);
    for (const x of [746, 796]) { T.soft(x + 17, 404, 26, 6, .5); T.rrect(x, 346, 34, 56, 4, T.lin(x, 0, x + 34, 0, [[0, '#8a8c98'], [.4, '#5e6068'], [1, '#2a2c34']])); T.stroke(`M${x + 34} 358l20 -16`, '#5e6068', 5); T.ell(x + 17, 346, 17, 5, '#9a9ca8'); }
    // door: the small iron door in the post, ajar, night outside
    T.rrect(34, 426, 66, 134, 8, T.lin(0, 426, 0, 560, [[0, '#0a1440'], [1, '#1a2a5a']])); T.ell(58, 458, 1.8, 1.8, '#fff'); T.ell(76, 486, 1.4, 1.4, '#fff'); T.ell(64, 510, 1.2, 1.2, '#fff', .7);
    T.poly([[34, 426], [14, 420], [14, 566], [34, 560]], T.lin(14, 0, 34, 0, [[0, '#2a3040'], [1, '#4a5468']]));
    T.rect(48, 470, 8, 90, '#3a4254'); T.ell(52, 464, 9, 9, '#ffe28a', .9); T.glow(52, 464, 40, '#ffe28a', .5);
    yield;
    T.finish({ vignette: .65, vcol: '#020208' });
  },
};
