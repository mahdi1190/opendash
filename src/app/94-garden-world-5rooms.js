/* ============================================================
   THE HIDDEN ROOMS, one row each (engine: 94-garden-world-4rooms.js). A room's door is `at`, a row of GARDEN_LAND_SIGHTS or GARDEN_LAND_FEATURES, the world cells tables: move that row and the door goes with it. No position is written here.
   Its reach is the land's: a door you cannot walk to is a door you cannot use. The first five need nothing at all: they stand on land a new garden can already walk to.

     id, at, name, verb (the row in the bubble), say (on the way in), how (what to do, in plain words), door (a drawing in 94-garden-world-6doors.js), shut(m): why not now, or ''
     art(): the room, drawn for its own mood: no two share a shell, a shape or a palette. bg: the colour round it. floor: where you can walk. front(): anything in front of the people. play: a kind in GRM_PLAY, and what that kind needs
     water: the real fishing game (94-garden-world-4rooms3water.js). gift: a day's gift through _grGive. Ids are stable: marks and ledger keys are built from them.
   ============================================================ */
const _GRM_Q = _grmA;
const _grmTod = (m, list) => list.includes(m.tod);
function _grmBook(c) { const A = _GRM_Q; return A.r(-34, -74, 68, 74, '#5a3c22') + A.r(-38, -78, 76, 7, '#7a5634') + A.p('M-26 -78L0 -84L26 -78L24 -90L0 -96L-24 -90z', '#f2e6c8') + A.p('M0 -84V-96', c || '#8a7a5a'); }
const _grmDefs = (s) => `<defs>${s}</defs>`;
const _grmFloorY = (A, y, c) => A.r(0, y, 960, 600 - y, c);

/* ---------- each room's picture ---------- */
const GRM_ART = Object.freeze({
  /* The cellar: under water, looking up. Green-blue, wet brick vaults going back, a ceiling of moving light. Slow and hushed. */
  cellar() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('cw', [[0, '#3f8c8a'], [0.32, '#1a4a54'], [1, '#0a222c']]) + A.lin('cwa', [[0, '#16505a'], [1, '#07202a']]) + A.rad('cg', [[0, '#b8fff0', 0.55], [1, '#b8fff0', 0]]));
    s += A.r(0, 0, 960, 600, 'url(#cw)');
    // three vaults going back, the far one lit
    s += A.p('M250 392V190Q250 60 480 60Q710 60 710 190V392Z', '#0a2a32') + A.p('M320 392V215Q320 110 480 110Q640 110 640 215V392Z', '#134a54') + A.p('M385 392V240Q385 165 480 165Q575 165 575 240V392Z', '#1f6a70') + A.e(480, 330, 80, 70, 'url(#cg)');
    let bricks = ''; for (let r = 0; r < 11; r++) for (let c = 0; c < 8; c++) bricks += A.r(c * 34 - (r % 2) * 17 + 0, r * 34 + 20, 31, 30, '#1a5560', 0.34 + ((r * 7 + c * 3) % 5) * 0.06, 3);
    s += `<g>${bricks}</g><g transform="translate(960 0) scale(-1 1)">${bricks}</g>`;
    s += A.p('M0 0H960V40Q720 28 480 66Q240 28 0 40Z', '#071c24');
    // the pool above: light through it
    for (let i = 0; i < 16; i++) { const x = (i * 67) % 960, w = 34 + (i * 13) % 50; s += `<path class="grm-rip" style="animation-delay:-${i * 0.4}s" d="M${x} ${8 + (i % 3) * 8}q${w / 2} ${6 + i % 4} ${w} 0" fill="none" stroke="#c0fff0" stroke-width="3" opacity=".55"/>`; }
    for (const [x, w] of [[150, 70], [480, 110], [800, 80]]) s += `<path class="grm-ray" d="M${x - w / 3} 30L${x - w} 392H${x + w}L${x + w / 3} 30Z" fill="#a8ffe8" opacity=".12"/>`;
    // shelves round the back wall, roots coming through
    for (const y of [236, 356]) s += A.r(256, y, 452, 12, '#3a2c1c') + A.r(256, y + 12, 452, 4, '#000', 0.4) + A.r(262, y + 12, 8, 26, '#2a2014') + A.r(694, y + 12, 8, 26, '#2a2014');
    for (const [x, l] of [[120, 110], [212, 74], [776, 120], [860, 60]]) s += A.s(`M${x} 30q-12 ${l / 2} 6 ${l}q6 18 -3 34`, '#2c3a24', 4);
    // the flood on the floor
    s += _grmFloorY(A, 392, 'url(#cwa)') + A.r(0, 392, 960, 7, '#000', 0.35);
    s += A.e(620, 500, 300, 66, '#04161c') + A.e(620, 498, 286, 60, '#4aa4a4') + A.e(620, 506, 230, 42, '#6cc4bc', 0.5) + A.e(590, 480, 170, 18, '#d8fff4', 0.28);
    for (let i = 0; i < 7; i++) s += `<path class="grm-rip" style="animation-delay:-${i * 0.7}s" d="M${380 + i * 72} ${476 + (i * 19) % 50}q22 -5 44 0" fill="none" stroke="#9ee4e4" stroke-width="2" opacity=".45"/>`;
    // a half sunk barrel, a stool, bubbles
    s += `<g transform="translate(826 452) rotate(-12)">${A.e(0, 0, 40, 26, '#5a3e22')}${A.e(0, 0, 40, 26, 'none')}${A.s('M-38 -10Q0 -30 38 -10M-40 8Q0 -12 40 8', '#2a1c0e', 3)}${A.e(34, -4, 7, 24, '#8a6a42')}</g>`;
    s += A.r(214, 420, 44, 10, '#4a3420', null, 3) + A.r(220, 430, 6, 26, '#3a2818') + A.r(246, 430, 6, 26, '#3a2818');
    for (let i = 0; i < 10; i++) s += `<circle class="grm-bub" style="animation-delay:-${(i * 1.1).toFixed(1)}s" cx="${420 + i * 46}" cy="${524 - (i % 3) * 10}" r="${1.6 + i % 3}" fill="none" stroke="#c0fff0" stroke-width="1"/>`;
    return s;
  },
  /* The den: a man who never stopped measuring. Sepia lamplight from one green-shaded lamp, low beams, paper on every surface, red string between the pins. */
  den() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('dw', [[0, '#3a2a18'], [1, '#6e5030']]) + A.lin('df', [[0, '#5a4026'], [1, '#2e2012']]) + A.rad('dl', [[0, '#ffe2a0', 0.75], [1, '#ffcf80', 0]]));
    s += A.r(0, 0, 960, 392, 'url(#dw)') + A.planks(0, 392, '#1e140a', 0.42, 58) + _grmFloorY(A, 392, 'url(#df)') + A.planks(392, 600, '#1e140a', 0.5, 84) + A.r(0, 392, 960, 7, '#000', 0.4) + A.e(480, 492, 250, 62, '#7a2e24', 0.75) + A.e(480, 492, 226, 52, '#9a4a30', 0.7);
    // low beams
    for (const [y, h] of [[0, 34], [46, 16]]) s += A.r(0, y, 960, h, '#20140a');
    for (const x of [90, 300, 660, 870]) s += A.p(`M${x - 24} 0H${x + 24}L${x + 14} 62H${x - 14}Z`, '#1a1006');
    // charts pinned all over, each its own
    for (const [x, y, w, h, r, kind] of [[92, 86, 170, 120, -3, 0], [120, 226, 130, 118, 2, 1], [676, 74, 190, 132, 2, 2], [700, 222, 150, 96, -2, 3]]) {
      s += `<g transform="rotate(${r} ${x} ${y})">${A.r(x + 3, y + 4, w, h, '#000', 0.3)}${A.r(x, y, w, h, '#e4d4ac')}`;
      if (kind === 0) s += A.s(`M${x + 12} ${y + h * 0.75}Q${x + w * 0.3} ${y + 8} ${x + w * 0.55} ${y + h * 0.6}T${x + w - 12} ${y + 22}`, '#5a8aa8', 4) + A.s(`M${x + 20} ${y + 24}h26M${x + 30} ${y + 40}h40`, '#8a7a5a', 2);
      if (kind === 1) { for (let i = 1; i < 6; i++) s += `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${i * 11}" ry="${i * 9}" fill="none" stroke="#a87a4a" stroke-width="1.2"/>`; s += A.c(x + w / 2, y + h / 2, 3, '#a83a2a'); }
      if (kind === 2) { for (let i = 0; i < 8; i++) s += A.s(`M${x + 8 + i * 23} ${y + 8}V${y + h - 8}M${x + 8} ${y + 8 + i * 16}H${x + w - 8}`, '#a8987a', 0.8); s += A.s(`M${x + 18} ${y + h - 18}L${x + 70} ${y + 58}L${x + 120} ${y + 70}L${x + w - 22} ${y + 22}`, '#b84a3a', 2.4) + A.c(x + w - 22, y + 22, 4, '#b84a3a'); }
      if (kind === 3) s += A.p(`M${x + 16} ${y + h - 14}l28 -44l22 26l26 -52l34 70z`, '#7a8a6a') + A.s(`M${x + 16} ${y + h - 14}H${x + w - 14}`, '#6a5a3a', 2);
      s += A.c(x + w / 2, y + 7, 4, '#a8352a') + '</g>';
    }
    s += A.s('M178 92L352 138M770 80L620 130M186 232L350 262', '#b83a2a', 1.6, 0.8);
    // the big board where the torn map goes
    s += A.r(346, 108, 298, 244, '#2a1c0e', null, 4) + A.r(354, 116, 282, 228, '#3e2c18') + A.r(360, 352, 16, 40, '#2a1c0e') + A.r(614, 352, 16, 40, '#2a1c0e');
    // the desk with the lamp, the theodolite, the chair still warm
    s += A.r(684, 396, 216, 14, '#6e4a2a', null, 3) + A.r(696, 410, 12, 70, '#4a3018') + A.r(876, 410, 12, 70, '#4a3018') + A.r(720, 376, 58, 20, '#efe6cc') + A.r(724, 372, 50, 6, '#d8ccac');
    s += `<g transform="translate(846 396)">${A.r(-12, -6, 24, 6, '#3a3a2a')}${A.s('M0 -6V-58', '#7a6a3a', 3)}${A.p('M-30 -58Q0 -92 30 -58Z', '#2f6a4a')}${A.e(0, -58, 30, 6, '#ffeeb0')}</g>` + A.e(846, 370, 180, 130, 'url(#dl)');
    s += A.s('M232 472L262 330L292 472M262 330V472', '#2a1c0e', 6) + A.r(236, 306, 54, 22, '#a88a3a', null, 5) + A.c(290, 317, 8, '#6ab0d8') + A.r(258, 296, 8, 12, '#7a6a3a');
    s += A.r(600, 452, 72, 10, '#7a4a2a', null, 3) + A.r(606, 462, 8, 44, '#4a3018') + A.r(656, 462, 8, 44, '#4a3018') + A.r(600, 396, 9, 58, '#5a3a20') + A.r(600, 396, 62, 8, '#5a3a20');
    // rolls of paper, a chain on the floor
    for (let i = 0; i < 6; i++) s += `<g transform="rotate(${(i - 2.5) * 5} ${176 + i * 12} 540)">${A.r(170 + i * 12, 468 - (i % 2) * 8, 11, 72, '#e4d4ac', null, 5)}${A.e(175.5 + i * 12, 470 - (i % 2) * 8, 5.5, 2.4, '#a8987a')}</g>`;
    s += A.p('M152 566L162 512H238L248 566Z', '#7a5a34') + A.s('M160 526H240M157 540H243M154 554H246', '#4a3418', 2.4, 0.7);
    s += A.s('M360 540q40 16 80 0t80 0t80 0', '#a89a7a', 3, 0.8);
    return s;
  },
  /* The loft: a dusk-blue slot of sky at the far end, four bright hulls in the dark overhead, tar and rope. */
  boatloft() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('bw', [[0, '#141e26'], [1, '#2e3e4a']]) + A.lin('bf', [[0, '#5a4432'], [1, '#2c2018']]) + A.lin('bs', [[0, '#27496e'], [0.6, '#d87a54'], [1, '#f4c07a']]));
    s += A.r(0, 0, 960, 600, 'url(#bw)');
    // the gable and its slot of evening sky over the water
    s += A.p('M390 392V90L480 30L570 90V392Z', 'url(#bs)') + A.r(390, 310, 180, 82, '#27496e', 0.75) + A.s('M390 90V392M570 90V392', '#0c1218', 12) + A.s('M480 30V392M390 200H570', '#0c1218', 7);
    s += `<path class="grm-ray" d="M390 392L150 600H810L570 392Z" fill="#f4c07a" opacity=".1"/>`;
    // roof trusses in perspective
    for (const [a, b] of [[0, 300], [960, 660]]) for (let i = 0; i < 5; i++) s += A.s(`M${a} ${i * 40 - 10}L${b + (a ? i * 12 : -i * 12)} ${40 + i * 8}`, '#0c1218', 8, 0.8);
    s += A.r(0, 62, 960, 16, '#0a0e12') + A.s('M0 180H390M570 180H960', '#101820', 6);
    // nets, floats, oars on the wall
    s += A.s('M60 90Q90 200 66 330M110 90Q150 220 118 340M160 90Q190 190 170 320', '#a8a080', 2.4, 0.45);
    for (let i = 0; i < 6; i++) s += A.e(70 + (i * 22) % 110, 170 + i * 30, 10, 13, ['#d8603a', '#e8c04a', '#f4efe0'][i % 3]);
    s += `<g transform="rotate(8 870 200)">${A.r(866, 86, 8, 240, '#8a6238')}${A.e(870, 334, 16, 36, '#c8603a')}</g><g transform="rotate(-6 800 200)">${A.r(796, 90, 8, 220, '#8a6238')}${A.e(800, 318, 16, 36, '#3f7486')}</g>`;
    s += _grmFloorY(A, 392, 'url(#bf)') + A.planks(392, 600, '#141008', 0.5, 66) + A.r(0, 392, 960, 8, '#000', 0.4);
    for (let i = 0; i < 9; i++) s += A.r(120 + i * 84, 420 + (i % 3) * 44, 58, 3, '#f4c07a', 0.1);
    // rope coil, paint tins, a swallow on a beam
    s += A.e(860, 500, 46, 18, '#8a7a50') + A.e(860, 490, 40, 15, '#a8966a') + A.e(860, 482, 30, 11, '#8a7a50') + A.e(860, 476, 12, 5, '#3a2c18');
    s += A.r(170, 470, 32, 36, '#c8603a', null, 3) + A.r(208, 482, 26, 26, '#3f7486', null, 3) + A.s('M170 474H202M208 486H234', '#000', 2, 0.3);
    s += `<path class="grm-sway" d="M710 62q8 -9 14 0q4 -7 14 -5q-8 4 -12 8l-6 3z" fill="#141e26"/>`;
    return s;
  },
  /* The cupboard: tall, narrow, black: you can touch both walls. A moon in a slot, brass catching what light there is. Each wick you light pushes the dark back. */
  lampcup() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('lw', [[0, '#141a38'], [1, '#262038']]) + A.lin('lf', [[0, '#3a2c34'], [1, '#191420']]) + A.rad('lm', [[0, '#f4eec8', 0.6], [1, '#f4eec8', 0]]));
    s += A.r(0, 0, 960, 600, '#05060e');
    // the two walls close in: only the middle is room
    s += A.p('M170 0H790L740 392H220Z', 'url(#lw)') + _grmFloorY(A, 392, 'url(#lf)') + A.p('M0 392H220L60 600H0Z', '#0a0a16') + A.p('M960 392H740L900 600H960Z', '#0a0a16');
    s += A.p('M0 0H170L220 392H0Z', '#0c0e1e') + A.p('M960 0H790L740 392H960Z', '#0c0e1e');
    for (let y = 30; y < 380; y += 44) s += A.s(`M${170 + y * 0.13} ${y}L${5} ${y - 14}M${790 - y * 0.13} ${y}L955 ${y - 14}`, '#1a1e36', 3);
    // a slit of window, the moon in it
    s += A.r(455, 34, 50, 118, '#0a1a44', null, 25) + A.c(480, 76, 15, '#f4eec8') + A.s('M480 34V152M455 104H505', '#1a1a2c', 4) + A.e(480, 120, 130, 110, 'url(#lm)');
    // shelves above and below: boxes of wicks, oil cans, a brass funnel
    s += A.r(238, 196, 484, 10, '#3a2a20') + A.r(238, 206, 484, 4, '#000', 0.5);
    for (const [x, w, h, c] of [[250, 56, 34, '#6a4a2a'], [312, 44, 26, '#7a5a34'], [366, 60, 40, '#5a3e22'], [590, 58, 28, '#7a5a34'], [654, 54, 38, '#5a3e22']]) s += A.r(x, 196 - h, w, h, c, null, 2) + A.r(x + 6, 196 - h + 6, w - 12, 10, '#e4d8b0', 0.6);
    s += A.p('M450 196V164H474V196Z', '#b8903a') + A.p('M474 170L492 158L490 166L474 178Z', '#b8903a') + A.p('M520 196L528 174H556L564 196Z', '#a88a3a');
    // the long wire, sagging, with its ugly join in the middle
    s += A.r(232, 332, 496, 14, '#6e4a2a') + A.r(232, 346, 496, 5, '#000', 0.5) + A.s('M240 262Q480 286 720 262', '#9a9aa8', 2.4) + A.s('M470 272l20 8M478 266l6 20', '#c8c8d8', 2.4);
    s += A.s('M200 392V80M250 392V80', '#6e5236', 8); for (let y = 110; y < 392; y += 38) s += A.r(200, y, 50, 7, '#6e5236');
    for (const x of [746, 796]) s += A.r(x, 346, 34, 56, '#5e6068', null, 4) + A.s(`M${x + 34} 358l20 -16`, '#5e6068', 5) + A.e(x + 17, 346, 17, 5, '#7e8088');
    s += A.motes(14, 'lc', 260, 700, 70, 390, '#c8c0a0', 0.4);
    return s;
  },
  /* Nowhere: no walls at all, no floor you could swear to. White, lilac, soft. It should feel like the moment before you wake up. */
  nowhere() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('nw', [[0, '#eef0f8'], [0.55, '#dcd8ec'], [1, '#c4bedc']]) + A.rad('nh', [[0, '#fff', 0.95], [1, '#fff', 0]]));
    s += A.r(0, 0, 960, 600, 'url(#nw)') + A.e(600, 260, 480, 200, 'url(#nh)');
    for (let i = 0; i < 14; i++) s += `<ellipse class="grm-cloud" style="animation-delay:-${i * 3}s" cx="${(i * 173) % 960}" cy="${90 + (i * 83) % 340}" rx="${130 + (i * 29) % 110}" ry="${24 + (i % 3) * 10}" fill="#fff" opacity=".42"/>`;
    // far posts going off, fainter and fainter
    for (const [x, y, k, o] of [[120, 338, 0.5, 0.3], [310, 300, 0.36, 0.2], [760, 288, 0.32, 0.16], [880, 360, 0.6, 0.3], [560, 276, 0.24, 0.12]]) s += `<g opacity="${o}" transform="translate(${x} ${y}) scale(${k})">${A.r(-4, -120, 8, 120, '#6a6078')}${A.p('M0 -112H54L66 -100L54 -88H0Z', '#6a6078')}</g>`;
    // a ground that is only a darker kind of mist
    s += A.e(480, 520, 700, 150, '#b0a8cc', 0.5) + A.e(420, 470, 500, 60, '#fff', 0.3);
    // YOU ARE HERE, somebody's idea of a joke
    s += A.r(186, 240, 10, 170, '#7a6a58') + `<g transform="rotate(-4 191 258)">${A.r(116, 244, 150, 28, '#efe6cc', null, 2)}<text x="191" y="263" text-anchor="middle" font-size="13" font-weight="700" fill="#5a4a3a">YOU ARE HERE</text></g>` + A.e(191, 412, 24, 6, '#6a6078', 0.25);
    return s;
  },
  /* The oak: you are inside something alive. Everything curves. Rings on the wall, a spiral of shelves, a moon through a knot-hole, candle and old paper. */
  owl() {
    const A = _GRM_Q; let s = _grmDefs(A.rad('ow', [[0, '#8a5c32'], [0.6, '#5a3a1e'], [1, '#2a180a']], 0.5, 0.42, 0.7) + A.lin('of', [[0, '#5a3a1e'], [1, '#2a180a']]) + A.rad('oc', [[0, '#ffcf80', 0.6], [1, '#ffcf80', 0]]));
    s += A.r(0, 0, 960, 600, '#140a04') + A.e(480, 250, 500, 330, 'url(#ow)');
    for (let i = 0; i < 9; i++) s += `<ellipse cx="480" cy="230" rx="${60 + i * 56}" ry="${44 + i * 36}" fill="none" stroke="#2e1c0e" stroke-width="${i % 2 ? 3 : 5}" opacity=".45"/>`;
    // the curved wall closing in
    s += A.p('M0 0H960V600H860Q960 300 760 60H200Q0 300 100 600H0Z', '#1c0e06') + A.s('M100 600Q0 300 200 60', '#3a2412', 8) + A.s('M860 600Q960 300 760 60', '#3a2412', 8);
    s += A.p('M100 392H860L900 600H60Z', 'url(#of)');
    // moon through a knot-hole
    s += A.e(480, 92, 58, 50, '#1e120a') + A.e(480, 92, 46, 40, '#14203e') + A.c(494, 84, 24, '#f4eec8') + A.c(486, 76, 5, '#d8d0a8') + `<path class="grm-ray" d="M440 120L340 392H620L520 120Z" fill="#cfd8f0" opacity=".1"/>`;
    // shelves that follow the curve, stuffed with books
    const col = ['#8a3a2a', '#3a5a7a', '#6a7a3a', '#c8984a', '#5a3a6a', '#a8603a'];
    const shelf = (x0, x1, y0, y1, seed) => { let b = A.s(`M${x0} ${y0}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 + 12} ${x1} ${y1}`, '#1e1006', 10); const r = A.rng(seed); for (let x = x0 + 8; x < x1 - 14;) { const w = 9 + Math.floor(r() * 9), h = 26 + Math.floor(r() * 26), t = (x - x0) / (x1 - x0), y = y0 + (y1 - y0) * t + 12 * 4 * t * (1 - t) * 0.5 - 5; b += A.r(x, y - h, w, h, col[Math.floor(r() * col.length)], null, 1); x += w + 1; } return b; };
    s += shelf(170, 340, 170, 150, 'a') + shelf(150, 320, 276, 266, 'b') + shelf(620, 800, 150, 170, 'c') + shelf(640, 810, 266, 276, 'd');
    // the desk, paper, candle, spectacles; toadstools by the root; a lantern of fireflies
    s += A.r(642, 380, 150, 12, '#3a2412') + A.r(650, 392, 10, 70, '#2a180a') + A.r(774, 392, 10, 70, '#2a180a') + A.r(670, 368, 60, 12, '#e8dcb8') + A.s('M676 374h48', '#8a7a5a', 1.4) + A.r(752, 336, 14, 44, '#efe6cc') + A.flame(759, 336, 1.1) + A.e(759, 320, 110, 90, 'url(#oc)');
    for (const [x, y, k] of [[180, 470, 1], [214, 482, 0.7], [790, 500, 0.9]]) s += `<g transform="translate(${x} ${y}) scale(${k})">${A.r(-5, -18, 10, 20, '#e8dcc0')}${A.p('M-20 -16Q0 -42 20 -16Z', '#b84a3a')}${A.c(-6, -24, 2.6, '#f4efe0')}${A.c(7, -22, 2, '#f4efe0')}</g>`;
    s += A.s('M250 60V120', '#3a2412', 2) + A.e(250, 138, 18, 22, '#3a3a2a', 0.5) + A.twinkles(7, 'ow', 238, 262, 122, 154, '#e8f07a', 1.8);
    s += A.r(380, 330, 200, 8, '#3a2412', null, 4) + A.s('M400 338L420 392M560 338L540 392', '#2a180a', 7);
    s += A.motes(16, 'ow', 340, 620, 120, 390, '#ffe2a0', 0.4);
    return s;
  },
  /* The grotto: a held breath. Black-green rock, a sky of glow-worms, one shaft of daylight from somewhere, and a pool so still it looks like a hole. */
  grotto() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('gw', [[0, '#050d0a'], [0.6, '#10261d'], [1, '#1a3a2a']]) + A.lin('gf', [[0, '#26402c'], [1, '#0e1c14']]) + A.rad('gp', [[0, '#5ad0c0'], [0.55, '#2f9a98'], [1, '#14585e']], 0.5, 0.42, 0.62) + A.rad('gs', [[0, '#d8ffd0', 0.5], [1, '#d8ffd0', 0]]) + A.rad('gg', [[0, '#62e0c0', 0.5], [1, '#62e0c0', 0]]));
    s += A.r(0, 0, 960, 600, 'url(#gw)');
    // the far wall: layers of rock, each a little lighter
    s += A.p('M0 392V210Q90 130 200 170Q300 90 440 130Q560 60 690 140Q820 90 960 200V392Z', '#14291f') + A.p('M0 392V290Q120 220 250 262Q380 190 500 240Q650 170 780 240Q880 220 960 280V392Z', '#1b3628');
    // glow-worms on the roof
    s += A.twinkles(90, 'gr', 70, 900, 16, 190, '#7ff0d0', 1.5) + A.e(620, 110, 300, 90, 'url(#gg)');
    // the shaft of day from a crack
    s += `<path class="grm-ray" d="M180 0H240L430 420H230Z" fill="#e8ffd8" opacity=".16"/>` + A.e(330, 420, 120, 24, 'url(#gs)') + A.p('M172 0Q206 26 248 0Z', '#d8ffd0', 0.8);
    s += A.motes(24, 'gr', 220, 420, 40, 410, '#e8ffd0', 0.6);
    // the bare rock that wants moss
    s += A.p('M146 396L168 304L214 236L286 196L366 214L420 270L452 340L470 396Z', '#34443a') + A.p('M190 396L206 312L250 256L300 232L352 252L392 306L410 396Z', '#465849') + A.p('M214 236L286 196L300 232L250 256Z', '#5a6e5c') + A.p('M366 214L420 270L392 306L352 252Z', '#2c3a32') + A.p('M250 256L300 232L352 252L332 302L268 308Z', '#566a58') + A.p('M168 304L214 236L250 256L206 312Z', '#3e4f44') + A.s('M268 308L254 396M332 302L354 396M268 308L332 302', '#2a382e', 3, 0.55);
    for (const [x, y, r] of [[230, 352, 5], [316, 346, 4], [378, 356, 6], [280, 268, 3]]) s += A.c(x, y, r, '#7a8a6a', 0.5);
    // ferns, hart's-tongue, roots coming down
    s += A.fern(90, 402, 1.1, '#3f7a44') + A.fern(150, 412, 0.8, '#2f6a3a', 1) + A.fern(900, 396, 1.15, '#3f7a44', 1) + A.fern(840, 408, 0.7, '#4a8a4e') + A.fern(470, 400, 0.6, '#2f6a3a');
    for (const [x, l] of [[60, 120], [860, 150], [760, 90]]) s += A.s(`M${x} 0q10 ${l / 2} -6 ${l}`, '#1e2a18', 5) + A.s(`M${x + 12} 0q-8 ${l / 3} 4 ${l * 0.7}`, '#2a3a1e', 3);
    // the floor
    s += _grmFloorY(A, 392, 'url(#gf)') + A.p('M0 392Q240 372 480 392T960 388V404H0Z', '#1a3020');
    for (let i = 0; i < 26; i++) { const r = A.rng('gm' + i), x = r() * 960, y = 400 + r() * 190; if (Math.hypot((x - 630) / 310, (y - 494) / 82) > 1) s += A.e(x, y, 8 + r() * 22, 3 + r() * 5, i % 2 ? '#3f6a40' : '#568a50', 0.7); }
    // the pool: a stone lip, deep water, the roof's glow in it
    s += A.e(630, 498, 306, 80, '#16241c') + A.e(630, 494, 290, 70, 'url(#gp)') + A.e(630, 470, 240, 22, '#c8fff0', 0.12);
    s += A.twinkles(26, 'gr2', 420, 840, 446, 546, '#e8fff4', 1.2);
    for (const [x, y, l] of [[430, 440, 60], [560, 428, 40], [740, 432, 58], [840, 460, 40]]) s += A.p(`M${x - 9} ${y}L${x} ${y + l}L${x + 9} ${y}Z`, '#0e3a3a', 0.28);
    for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, x = 630 + Math.cos(a) * 296, y = 496 + Math.sin(a) * 76; s += A.blob(x, y, 28, 13, 'gp' + i, 0.35, i % 2 ? '#2e3c32' : '#3a4a3e'); }
    // one drip, always
    s += A.c(620, 74, 5, '#c8f0f0') + `<circle class="grm-drip" cx="620" cy="86" r="3.4" fill="#c8f0f0"/>` + `<ellipse class="grm-dripr" cx="620" cy="478" rx="26" ry="6" fill="none" stroke="#c8f0f0" stroke-width="1.5"/>`;
    return s;
  },
  /* Behind the falls: roar and white. The whole back of the room is moving water, gold from the low sun coming through it, everything wet and shining. */
  falls() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('fw', [[0, '#d8f0f8'], [0.5, '#7ec0dc'], [1, '#4a86a4']]) + A.lin('ff', [[0, '#5a6a70'], [1, '#1e262a']]) + A.lin('fg', [[0, '#ffd27a', 0.75], [1, '#ffd27a', 0]], 1, 0.3));
    s += A.r(0, 0, 960, 600, '#2a3a42') + A.p('M90 392V30Q480 -20 880 30V392Z', 'url(#fw)');
    let f = ''; for (let i = 0; i < 46; i++) { const x = 80 + i * 18 + (i % 3) * 3; f += A.r(x, -40, 5 + (i % 4) * 4, 470, '#f4fdff', 0.16 + (i % 3) * 0.12); } s += `<g class="grm-fall" clip-path="url(#fclip)">${f}</g><clipPath id="fclip"><path d="M90 392V30Q480 -20 880 30V392Z"/></clipPath>`;
    s += A.r(90, 0, 790, 392, 'url(#fg)') + `<path class="grm-ray" d="M90 40L0 0V240Z" fill="#fff0b8" opacity=".5"/>`;
    // the mouth of the ledge: wet black rock all round
    s += A.p('M0 0H110Q40 200 70 392H0Z', '#141c20') + A.p('M960 0H860Q940 200 900 392H960Z', '#141c20') + A.p('M0 0H960V34Q480 -14 0 34Z', '#10181c');
    for (const [x, y] of [[36, 120], [24, 260], [920, 150], [934, 290]]) s += A.blob(x, y, 30, 24, 'f' + x, 0.35, '#232e34');
    s += A.s('M60 40Q30 200 50 380M906 40Q940 220 916 380', '#a8dcf0', 2, 0.35);
    // the ledge, shining
    s += _grmFloorY(A, 392, 'url(#ff)') + A.r(0, 388, 960, 12, '#10181c');
    for (let i = 0; i < 12; i++) s += A.e(60 + i * 80, 420 + (i * 37) % 150, 30 + (i % 3) * 18, 5, '#cfeaf4', 0.2);
    for (let i = 0; i < 18; i++) s += `<circle class="grm-spray" style="animation-delay:-${(i * 0.31).toFixed(1)}s" cx="${100 + i * 44}" cy="${386}" r="${2 + i % 3}" fill="#f4fdff"/>`;
    for (const [x, y, a, b] of [[840, 500, 60, 26], [120, 550, 40, 16], [720, 572, 80, 22]]) s += A.blob(x, y, a, b, 'fl' + x, 0.3, '#2e3a40') + A.e(x - a * 0.2, y - b * 0.4, a * 0.4, 3, '#a8dcf0', 0.4);
    return s;
  },
  /* The lamp room: the top of the world at night. Round, all glass and brass, the black lake and more stars than you expected. */
  lamproom() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('ls', [[0, '#050a1e'], [0.7, '#14264e'], [1, '#26406a']]) + A.lin('lsw', [[0, '#14304a'], [1, '#050e1e']]) + A.lin('lfl', [[0, '#8a8478'], [1, '#3e3a34']]));
    s += A.r(0, 0, 960, 600, 'url(#ls)');
    const r = A.rng('lr'); for (let i = 0; i < 130; i++) { const x = r() * 960, y = r() * 280; s += i % 7 ? A.c(x.toFixed(0), y.toFixed(0), (0.5 + r() * 1.1).toFixed(1), '#fff', 0.8) : `<circle class="grm-tw" cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="1.7" fill="#fff" style="animation-delay:-${(i % 5)}s"/>`; }
    s += A.c(800, 80, 28, '#f4eec8', 0.9) + A.c(790, 72, 5, '#d8d0a8');
    // the lake, a far light or two, the far shore
    s += A.r(0, 300, 960, 92, 'url(#lsw)') + A.p('M0 300Q200 286 380 298T700 292T960 298V304H0Z', '#040814') + A.c(190, 296, 1.6, '#ffd97a') + A.c(660, 294, 1.4, '#ffd97a');
    for (let i = 0; i < 14; i++) s += `<path class="grm-rip" style="animation-delay:-${i * 0.5}s" d="M${(i * 71) % 900} ${316 + (i * 13) % 66}q14 -3 28 0" stroke="#7ea8d0" stroke-width="1.4" fill="none" opacity=".4"/>`;
    // the panes, bent round you: bars closer at the sides
    for (const x of [14, 96, 220, 360, 600, 740, 864, 946]) s += A.r(x - 5, 22, 10, 370, '#d8d4c8') + A.r(x - 2, 22, 2, 370, '#fff', 0.5);
    s += A.p('M0 0H960V24Q480 52 0 24Z', '#a83a2c') + A.p('M0 24Q480 52 960 24V30Q480 58 0 30Z', '#7a2a20');
    s += A.p('M0 330Q480 368 960 330V392H0Z', '#2a3040', 0.86) + A.s('M0 330Q480 368 960 330', '#b8b4a8', 5) + A.s('M0 356Q480 386 960 356', '#8a8678', 3);
    // the floor is round: iron plate, a hatch, a tin of polish, a rag
    s += A.p('M0 392H960V600H0Z', 'url(#lfl)') + A.e(480, 400, 470, 22, '#000', 0.25);
    for (let i = 0; i < 8; i++) s += A.s(`M480 396L${i * 137 - 10} 600`, '#000', 2, 0.18);
    for (let i = 0; i < 18; i++) s += A.c(40 + i * 52, 420 + (i % 3) * 56, 2.4, '#3a3630');
    s += A.r(800, 460, 44, 26, '#c8a03a', null, 4) + A.e(822, 460, 22, 6, '#e8c85a') + A.blob(870, 490, 26, 10, 'rag', 0.4, '#d8d0c0');
    return s;
  },
  /* The ringing chamber: tall and cold and religious. Everything points up into the dark; the only colour is the window, and it stains the dust. */
  ringers() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('rw', [[0, '#050508'], [0.4, '#22222c'], [1, '#3e3c44']]) + A.lin('rf', [[0, '#4a4a50'], [1, '#1c1c22']]));
    s += A.r(0, 0, 960, 600, 'url(#rw)');
    // tall stone coursing, narrowing upward
    for (let y = 40, r = 0; y < 390; y += 34, r++) for (let x = (r % 2) * -40; x < 960; x += 80) s += A.r(x + 2, y, 76, 31, '#50505a', 0.1 + ((x + y) % 7) * 0.02, 2);
    // two great arches and the black overhead with the bell's shape
    s += A.p('M60 392V150Q60 60 140 30Q220 60 220 150V392Z', '#0c0c12') + A.p('M740 392V150Q740 60 820 30Q900 60 900 150V392Z', '#0c0c12');
    s += A.r(0, 0, 960, 44, '#020204') + A.p('M400 42Q430 8 480 8Q530 8 560 42Q572 74 596 92H364Q388 74 400 42Z', '#0a0a10') + A.c(480, 98, 12, '#0a0a10');
    // the window: its own light down the floor
    s += A.p('M360 300V116Q360 48 480 48Q600 48 600 116V300Z', '#1e1a16');
    s += `<path class="grm-ray" d="M384 300L240 600H720L576 300Z" fill="#ffe2b0" opacity=".1"/>`;
    s += A.p('M268 600L350 440H390L330 600Z', '#c8483a', 0.16) + A.p('M394 600L420 440H470L460 600Z', '#d8a83a', 0.16) + A.p('M500 600L490 440H540L566 600Z', '#4a7ab8', 0.16) + A.p('M630 600L560 440H610L692 600Z', '#5a9a5a', 0.16);
    s += A.motes(26, 'rg', 340, 620, 150, 420, '#ffe8c0', 0.5);
    // the floor, worn in four places under the ropes
    s += _grmFloorY(A, 392, 'url(#rf)') + A.r(0, 392, 960, 7, '#000', 0.5);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) s += A.r(c * 124 - (r % 2) * 62, 400 + r * 52, 120, 48, '#5a5a62', 0.1 + (c + r) % 3 * 0.04, 2);
    for (const x of [180, 300, 680, 800]) s += A.e(x, 448, 44, 12, '#000', 0.25);
    // the ringers' board, a bench, a jug
    s += A.r(106, 196, 66, 96, '#3a2a18', null, 2) + A.s('M116 212h46M116 228h38M116 244h46M116 260h28', '#d8c88a', 2, 0.6);
    s += A.r(820, 452, 106, 12, '#3a2a18', null, 3) + A.r(830, 464, 10, 36, '#2a1c0e') + A.r(906, 464, 10, 36, '#2a1c0e') + A.p('M880 452V428Q892 420 904 428V452Z', '#8a8a92');
    return s;
  },
  /* The barn: straw-gold, afternoon, enormous. Heavy timber A-frames, sun through one high door, a hundred years of things nobody could throw away. */
  barnloft() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('kw', [[0, '#4a2c16'], [1, '#8a5a2c']]) + A.lin('kf', [[0, '#c8a858'], [1, '#7a6230']]) + A.lin('ks', [[0, '#fff0b8', 0.9], [1, '#fff0b8', 0]]));
    s += A.r(0, 0, 960, 600, 'url(#kw)') + A.planks(0, 392, '#2a180c', 0.32, 44);
    // great A-frames going back
    for (const [k, o] of [[0.55, 0.6], [0.78, 0.8], [1, 1]]) s += `<g opacity="${o}" transform="translate(480 392) scale(${k})">${A.s('M-560 -20L0 -420L560 -20', '#2a180c', 26)}${A.s('M-330 -180H330', '#2a180c', 20)}${A.s('M-60 -378V-180M60 -378V-180', '#2a180c', 11)}${A.s('M-250 -240L-100 -180M250 -240L100 -180', '#2a180c', 10)}</g>`;
    // the high door, sun pouring through it onto the hay
    s += A.p('M404 42H556V176H404Z', '#fff4c8') + A.p('M404 42H556V60H404Z', '#a8d8f0') + A.s('M480 42V176M404 110H556', '#2a180c', 6) + A.r(394, 34, 172, 10, '#2a180c') + A.r(394, 176, 172, 10, '#2a180c');
    s += `<path class="grm-ray" d="M404 176L196 600H764L556 176Z" fill="url(#ks)" opacity=".3"/>`;
    s += A.motes(40, 'kl', 240, 720, 180, 500, '#fff0b8', 0.75);
    // what is stacked along the walls
    s += `<g transform="translate(112 300)">${A.c(0, 0, 58, 'none')}<circle r="58" fill="none" stroke="#3a2414" stroke-width="9"/><circle r="10" fill="#3a2414"/>${[0, 45, 90, 135].map(a => `<rect x="-3" y="-58" width="6" height="116" fill="#3a2414" transform="rotate(${a})"/>`).join('')}</g>`;
    s += A.r(40, 362, 150, 42, '#5a3a20', null, 4) + A.r(60, 340, 90, 24, '#4a2e18', null, 3) + A.r(170, 300, 10, 100, '#6e4a2a') + A.p('M160 300h30l-6 -30h-18z', '#c8a858');
    s += A.r(780, 330, 130, 72, '#6e4a2a', null, 4) + A.p('M776 330Q845 288 914 330Z', '#5a3a20') + A.r(780, 350, 130, 6, '#2e1c0e') + A.r(836, 340, 18, 22, '#c8a03a', null, 2);
    s += A.r(720, 130, 8, 270, '#7a5a34') + A.r(752, 130, 8, 270, '#7a5a34'); for (let y = 150; y < 390; y += 30) s += A.r(720, y, 40, 6, '#7a5a34');
    s += A.s('M240 100q20 60 0 120', '#c8b488', 3) + `<g transform="translate(240 226)">${A.p('M-14 0h28l6 40h-40z', '#b8843a')}${A.e(0, 0, 14, 5, '#ffcf7a')}</g>`;
    // the swallows' mud nest, an old hen on the box
    s += A.e(640, 118, 22, 13, '#7a6a4a') + `<g transform="translate(838 332) scale(.9)">${A.e(0, -14, 18, 13, '#b8743a')}${A.c(15, -28, 7, '#b8743a')}${A.p('M21 -28l7 2l-7 3z', '#e8a83a')}${A.p('M14 -36l2 5l3 -5z', '#c8483a')}${A.c(17, -30, 1.1, '#1a1a1a')}</g>`;
    // the floor is hay
    s += _grmFloorY(A, 392, 'url(#kf)');
    const r = A.rng('kh'); let hy = ''; for (let i = 0; i < 90; i++) { const x = r() * 960, y = 396 + r() * 200; hy += `M${x.toFixed(0)} ${y.toFixed(0)}l${(8 + r() * 12).toFixed(0)} ${(-5 + r() * 8).toFixed(0)}`; } s += A.s(hy, '#6e5420', 1.6, 0.6);
    return s;
  },
  /* The parlour: a very small, very proud home. Everything is something you know, at the wrong size. Warm wood, candle-orange, a stamp for a painting. */
  parlour() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('pw', [[0, '#7a4a24'], [1, '#b8783a']]) + A.lin('pf', [[0, '#c89a5a'], [1, '#7a5230']]) + A.rad('pc', [[0, '#ffc06a', 0.6], [1, '#ffc06a', 0]]));
    s += A.r(0, 0, 960, 600, '#3a2010') + A.p('M0 392V120Q200 10 480 10Q760 10 960 120V392Z', 'url(#pw)');
    // a hollow in a stump: the grain goes round, roots hold up the roof
    for (let i = 0; i < 8; i++) s += A.s(`M${i * 130 + 30} 10q18 196 -6 382`, '#4a2c14', 3, 0.28);
    s += A.p('M0 120Q40 300 0 392H60Q90 260 40 90Z', '#3a2010') + A.p('M960 120Q920 300 960 392H900Q870 260 920 90Z', '#3a2010');
    // a postage stamp in a frame, a mirror that was a thimble-lid, a shelf made from a ruler
    s += A.r(150, 92, 118, 148, '#efe0b8') + `<path d="M150 92h118v148h-118z" fill="none" stroke="#c8a860" stroke-width="5" stroke-dasharray="6 5"/>` + A.r(164, 106, 90, 120, '#4a78a8') + A.c(209, 158, 22, '#f4d478') + `<text x="209" y="218" text-anchor="middle" font-size="13" font-weight="700" fill="#efe0b8">1d</text>`;
    s += A.r(690, 126, 200, 14, '#e8cf7a') + [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => A.r(696 + i * 20, 126, 1.5, i % 5 ? 5 : 9, '#3a2a14')).join('') + A.r(712, 86, 26, 40, '#c8483a', null, 3) + A.r(744, 96, 18, 30, '#3f7486', null, 3) + `<g transform="translate(796 126)">${A.r(-22, -38, 44, 38, '#e8e0d0', null, 4)}${A.s('M-22 -28H22M-22 -18H22M-22 -8H22', '#c8483a', 3)}${A.e(0, -38, 22, 5, '#b8a080')}</g>`;
    // window, tall blades of grass going by outside
    s += A.c(480, 136, 88, '#6e4a24') + A.c(480, 136, 76, '#a8dcf0') + `<g class="grm-sway">${A.s('M430 212Q424 130 446 74M470 212Q478 120 460 62M516 212Q512 150 540 88', '#5a9a3a', 12)}</g>` + A.s('M480 60V212M404 136H556', '#6e4a24', 6);
    // the candle end, far too big
    s += A.r(806, 240, 62, 152, '#efe6cc', null, 6) + A.p('M806 240q14 28 26 8q10 24 36 -8z', '#e0d4b0') + A.flame(837, 238, 2.6) + A.e(837, 200, 220, 170, 'url(#pc)');
    // the floor: a boot-sole? No: a very old carpet that was once a tea-cosy
    s += _grmFloorY(A, 392, 'url(#pf)') + A.e(480, 492, 390, 84, '#a83a3a') + A.e(480, 492, 362, 72, '#c8584a') + A.e(480, 492, 290, 52, '#e0a858');
    for (let i = 0; i < 28; i++) s += A.s(`M${(480 + Math.cos(i / 28 * 6.283) * 362).toFixed(0)} ${(492 + Math.sin(i / 28 * 6.283) * 72).toFixed(0)}l${(Math.cos(i / 28 * 6.283) * 18).toFixed(0)} ${(Math.sin(i / 28 * 6.283) * 8).toFixed(0)}`, '#e0a858', 2.4, 0.7);
    // matchbox table, thimble stools, cotton-reel: the family watching you pour
    s += A.r(280, 388, 380, 16, '#c8a05a', null, 3) + A.r(280, 388, 380, 6, '#e0584a') + A.r(300, 404, 16, 60, '#a07a3a') + A.r(624, 404, 16, 60, '#a07a3a');
    const mouse = (x, y, k, c) => `<g transform="translate(${x} ${y}) scale(${k})">${A.e(0, -24, 20, 26, c)}${A.c(0, -58, 16, c)}${A.c(-13, -70, 10, '#d8a8a0')}${A.c(13, -70, 10, '#d8a8a0')}${A.c(-5, -60, 2.2, '#1a1a1a')}${A.c(5, -60, 2.2, '#1a1a1a')}${A.c(0, -53, 2, '#d87a7a')}${A.s('M18 -6q26 4 22 -18', '#c8a8a0', 2.6)}${A.r(-16, -30, 32, 8, '#3f7486', null, 3)}</g>`;
    s += `<g transform="translate(236 452)">${A.p('M-30 0L-24 -46H24L30 0Z', '#c8ccd0')}${A.s('M-26 -30H26M-28 -16H28', '#9a9ea4', 2)}</g>` + mouse(236, 408, 1.05, '#9a8a7a');
    s += `<g transform="translate(790 470)">${A.r(-30, -44, 60, 44, '#e8e0d0', null, 3)}${A.s('M-30 -34H30M-30 -24H30M-30 -14H30', '#3f7486', 3)}</g>` + mouse(790, 428, 0.88, '#a89a8a') + mouse(734, 474, 0.54, '#b8a898');
    return s;
  },
  /* The hut: a real wind outside and a warm stove inside. Curved tin roof, grey-green hills through the window, a dog's bowl, a coat that still smells of sheep. */
  hut() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('hw', [[0, '#7a8870'], [1, '#55634e']]) + A.lin('hf', [[0, '#7a5c3a'], [1, '#3e2c1a']]) + A.lin('hs', [[0, '#b8d4e4'], [1, '#e8ecdc']]) + A.rad('hg', [[0, '#ff9a4a', 0.5], [1, '#ff9a4a', 0]]));
    s += A.r(0, 0, 960, 600, '#2a3028');
    // curved tin roof, ribs
    s += A.p('M0 392V120Q480 -60 960 120V392Z', 'url(#hw)') + A.planks(60, 392, '#2e3626', 0.26, 40);
    for (let i = 0; i < 9; i++) { const x = i * 120; s += A.s(`M${x} ${130 - Math.sin(i / 8 * 3.1416) * 100}V392`, '#3e4a38', 3, 0.5); }
    s += A.p('M0 120Q480 -60 960 120V100Q480 -84 0 100Z', '#3a4438') + A.p('M0 0H960V100Q480 -84 0 100Z', '#222822');
    // window on the hill, cloud moving
    s += A.r(176, 92, 196, 150, '#4a3a28') + A.r(186, 102, 176, 130, 'url(#hs)');
    s += `<g clip-path="url(#hclip)"><ellipse class="grm-cloud" cx="240" cy="134" rx="40" ry="11" fill="#fff" opacity=".9"/>${A.p('M186 200Q240 150 300 186T362 170V232H186Z', '#88a868')}${A.p('M186 220Q250 190 310 214T362 206V232H186Z', '#6e9050')}${A.c(232, 196, 3, '#f4f4ec')}${A.c(246, 202, 3, '#f4f4ec')}${A.c(300, 204, 3, '#f4f4ec')}</g><clipPath id="hclip"><rect x="186" y="102" width="176" height="130"/></clipPath>`;
    s += A.s('M274 102V232M186 166H362', '#4a3a28', 5) + A.r(176, 240, 196, 8, '#3a2c1c');
    // the coat on a peg, a crook, a lantern, a calendar with a sheep
    s += `<g class="grm-sway" style="transform-origin:560px 110px">${A.c(560, 112, 4, '#2a2018')}${A.p('M530 130Q560 104 590 130L600 280Q560 296 520 280Z', '#6a5038')}${A.s('M560 124V284', '#3a2a18', 2)}</g>`;
    s += A.s('M900 392V110Q900 84 874 90', '#6a4a2a', 6) + A.r(640, 104, 80, 104, '#efe6cc') + A.r(640, 104, 80, 16, '#a83a2a') + A.e(680, 160, 18, 13, '#f4f4ec') + A.c(696, 152, 7, '#3a3a3a');
    // the bunk with its blanket
    s += A.r(40, 300, 110, 94, '#4a3820') + A.r(40, 290, 110, 22, '#a84a3a', null, 5) + A.s('M40 300H150', '#7a2a20', 3) + A.r(50, 270, 40, 22, '#e8e0cc', null, 8);
    // floor
    s += _grmFloorY(A, 392, 'url(#hf)') + A.planks(392, 600, '#1e140a', 0.42, 72) + A.r(0, 392, 960, 7, '#000', 0.35);
    // the glow from the stove on the boards, a dog's bowl and a rag rug
    s += A.e(480, 440, 240, 60, 'url(#hg)') + A.e(250, 500, 110, 38, '#6a7a8a', 0.7) + A.e(250, 500, 86, 28, '#a8604a', 0.7) + A.e(250, 500, 56, 18, '#c8b078', 0.7);
    s += A.e(800, 500, 34, 10, '#7a2a20') + A.e(800, 495, 26, 7, '#a83a2a') + A.e(800, 493, 19, 5, '#3a1a10');
    return s;
  },
  /* The treehouse: a child built this. Bright, dappled, crooked planks in a hundred greens, nothing square, comics and pencil on everything. */
  treehouse() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('th', [[0, '#a8e0f0'], [1, '#e8f4d8']]) + A.lin('tf', [[0, '#a07a4a'], [1, '#5a3e22']]));
    s += A.r(0, 0, 960, 600, 'url(#th)');
    // leaves all round and over everything
    for (let i = 0; i < 26; i++) s += A.blob((i * 127) % 960, 30 + (i * 53) % 170, 80 + (i * 7) % 40, 44 + (i * 3) % 18, 'tl' + i, 0.4, ['#3f7a38', '#55984a', '#6ab058', '#2f6a30'][i % 4], 0.95);
    s += `<g class="grm-sway">${A.twinkles(40, 'th', 0, 960, 0, 190, '#fff8c0', 2.6)}</g>`;
    // the walls: planks, every one a different plank, not reaching the top
    const r = A.rng('tp'); for (let x = -6; x < 960;) { const w = 40 + Math.floor(r() * 34), top = 166 + Math.floor(r() * 44), lean = (r() - 0.5) * 8, c = ['#a07a4a', '#8e6a3e', '#b48a54', '#7e5c34'][Math.floor(r() * 4)]; s += A.p(`M${x} 392L${x + lean} ${top}H${x + w + lean}L${x + w} 392Z`, c) + A.s(`M${x + w} 392L${x + w + lean} ${top}`, '#3a2612', 2, 0.7) + A.c(x + w / 2 + lean / 2, top + 14, 2, '#2a1c0e') + A.c(x + w / 2, 372, 2, '#2a1c0e'); x += w; }
    // a window-hole with a branch through it, the trunk coming up through the floor
    s += A.p('M566 392Q590 260 560 120Q540 40 600 0H744Q700 60 736 160Q760 280 770 392Z', '#6a4a2a') + A.s('M600 392Q610 250 590 130M660 392Q670 240 650 110M720 392Q716 280 690 150', '#4a3018', 4, 0.7);
    s += A.p('M740 214Q830 186 950 204L960 226Q840 214 748 240Z', '#6a4a2a') + `<g class="grm-sway">${A.blob(900, 196, 56, 30, 'tb', 0.4, '#4f9a46')}</g>`;
    // KEEP OUT, comics, a jar with a frog in it, a very serious flag
    s += `<g transform="rotate(-3 180 250)">${A.r(90, 200, 196, 88, '#efe6cc', null, 2)}<text x="188" y="238" text-anchor="middle" font-size="26" font-weight="800" fill="#a83a2a">KEEP OUT</text><text x="188" y="270" text-anchor="middle" font-size="13" font-weight="700" fill="#3a3a3a">THIS MEANS YOU</text></g>`;
    s += `<g transform="rotate(7 800 300)">${A.r(790, 260, 90, 62, '#fff')}${A.r(796, 268, 36, 46, '#e8504a')}${A.r(838, 268, 36, 46, '#4a90d8')}</g>`;
    s += A.r(50, 340, 110, 54, '#3f6a86', null, 3) + A.r(58, 322, 76, 20, '#c8483a', null, 2) + A.r(64, 306, 52, 16, '#e8c04a', null, 2);
    s += A.p('M380 110V176', '#000') + A.s('M380 110V176', '#3a2612', 4) + `<path class="grm-sway" d="M380 112L430 124L380 140Z" fill="#c8483a"/>` + `<text x="396" y="130" font-size="11" fill="#fff" font-weight="800">X</text>`;
    // the floor, gaps with sky under them
    s += _grmFloorY(A, 392, 'url(#tf)');
    for (let i = 0; i < 9; i++) s += A.r(i * 110 + 30, 392, 4 + (i % 3), 208, '#b8e4f0', 0.45);
    s += A.e(790, 470, 40, 14, '#000', 0.2) + A.r(770, 430, 40, 40, '#c8e4d8', 0.6, 6) + A.r(772, 424, 36, 8, '#8a6a3a') + A.e(790, 460, 11, 7, '#5fa83a') + A.c(786, 454, 2, '#fff');
    // a rope going down, marbles, pencils
    s += [[300, 500, '#4a90d8'], [330, 520, '#e8504a'], [280, 540, '#f4c84a']].map(([x, y, c]) => A.c(x, y, 6, c) + A.c(x - 2, y - 2, 1.6, '#fff')).join('') + A.s('M420 548l50 -16M430 560l40 -6', '#e8c04a', 4);
    return s;
  },
  /* The ice house: round and cold. A brick dome going up to one small round of daylight, blue on everything. Your breath shows. */
  icehouse() {
    const A = _GRM_Q; let s = _grmDefs(A.rad('iw', [[0, '#e4f4fa'], [0.55, '#8ab4c8'], [1, '#2e4a5c']], 0.5, 0.14, 0.9) + A.lin('if', [[0, '#a8c4d0'], [1, '#4e6a7a']]) + A.rad('ii', [[0, '#fff', 0.85], [1, '#fff', 0]]));
    s += A.r(0, 0, 960, 600, '#16222c') + A.p('M30 392Q30 0 480 0Q930 0 930 392Z', 'url(#iw)');
    // the dome's brick rings
    for (let i = 1; i < 9; i++) s += `<ellipse cx="480" cy="392" rx="${40 + i * 50}" ry="${28 + i * 46}" fill="none" stroke="#3e5e70" stroke-width="2.5" opacity="${0.5 - i * 0.03}"/>`;
    for (let a = -8; a <= 8; a++) { const t = a * 0.18; s += A.s(`M${480 + Math.sin(t) * 40} ${392 - Math.cos(t) * 28}L${480 + Math.sin(t) * 430} ${392 - Math.cos(t) * 380}`, '#3e5e70', 1.5, 0.28); }
    // the round of daylight, and what it does
    s += A.e(480, 36, 52, 24, '#fff') + A.e(480, 36, 60, 28, 'none') + A.s('M422 36a58 26 0 0 1 116 0', '#2e4a5c', 7) + A.e(480, 60, 200, 110, 'url(#ii)') + `<path class="grm-ray" d="M440 50L280 400H680L520 50Z" fill="#fff" opacity=".2"/>`;
    s += A.motes(18, 'ic', 300, 660, 60, 400, '#fff', 0.8);
    // icicles round the top, frost feathers on the brick
    for (let i = 0; i < 26; i++) { const a = 3.14 * (i + 0.5) / 26, x = 480 - Math.cos(a) * 430, y = 392 - Math.sin(a) * 380, l = 26 + (i * 7) % 34; s += A.p(`M${(x - 7).toFixed(0)} ${y.toFixed(0)}L${x.toFixed(0)} ${(y + l).toFixed(0)}L${(x + 7).toFixed(0)} ${y.toFixed(0)}Z`, '#f4feff', 0.82); }
    for (const [x, y, k] of [[140, 250, 1], [800, 210, 1.2], [260, 150, 0.8]]) { let f = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; f += `M0 0L${(Math.cos(a) * 34).toFixed(0)} ${(Math.sin(a) * 34).toFixed(0)}M${(Math.cos(a) * 18).toFixed(0)} ${(Math.sin(a) * 18).toFixed(0)}l${(Math.cos(a + 0.7) * 11).toFixed(0)} ${(Math.sin(a + 0.7) * 11).toFixed(0)}`; } s += `<g transform="translate(${x} ${y}) scale(${k})">${A.s(f, '#f4feff', 1.8, 0.7)}</g>`; }
    // stacked blocks round the wall, straw between, saw and tongs hanging
    for (const [x, y, w] of [[60, 332, 150], [84, 278, 110], [750, 332, 160], [786, 278, 96], [216, 350, 70], [684, 350, 60]]) s += A.r(x, y, w, 56, '#d4ecf6', 0.88, 4) + A.p(`M${x} ${y}l10 -8h${w}l-10 8z`, '#f0fbff') + A.r(x + 8, y + 7, w * 0.4, 7, '#fff', 0.85) + A.s(`M${x + w * 0.6} ${y + 10}l18 26`, '#fff', 1.6, 0.6);
    s += A.s('M204 140q-6 60 4 110', '#6a7a84', 3) + A.r(170, 244, 72, 11, '#6a7a84', null, 2) + A.r(236, 240, 10, 22, '#6e4a2a');
    // the floor: straw on stone, the block game's own patch in the middle
    s += _grmFloorY(A, 392, 'url(#if)') + A.e(480, 396, 450, 16, '#2e4a5c', 0.35);
    const r = A.rng('is'); let st = ''; for (let i = 0; i < 40; i++) { const x = r() * 330, y = 410 + r() * 180; st += `M${x.toFixed(0)} ${y.toFixed(0)}l${(9 + r() * 12).toFixed(0)} -3`; } s += A.s(st, '#d8c070', 2, 0.7);
    return s;
  },
  /* The hothouse: green and wet and much too warm. Rust-and-white ironwork, sun through dirty glass, palms pressing on the roof, orchids and steam. */
  hothouse() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('ow2', [[0, '#e0f4d8'], [0.6, '#9fd0a8'], [1, '#5e9a78']]) + A.lin('of2', [[0, '#6e5a42'], [1, '#2e2a1e']]) + A.rad('os', [[0, '#fff8c8', 0.85], [1, '#fff8c8', 0]]) + A.rad('ost', [[0, '#fff', 0.85], [1, '#fff', 0]]));
    s += A.r(0, 0, 960, 600, 'url(#ow2)') + A.e(320, 40, 520, 240, 'url(#os)');
    // far jungle through the glass
    for (let i = 0; i < 18; i++) s += A.blob((i * 113) % 960, 300 + (i * 29) % 90, 90, 56, 'hf' + i, 0.4, ['#3f8a5a', '#2f7a4e', '#55a06a'][i % 3], 0.55);
    // the ironwork: a big bowed roof, ribs, little panes, rust
    for (let i = 0; i < 9; i++) s += A.s(`M${i * 120} 392V96Q${i * 120 + 60} 14 ${i * 120 + 120} 96`, '#f4f4ec', 7, 0.92);
    s += A.r(0, 92, 960, 8, '#f4f4ec', 0.92) + A.r(0, 240, 960, 6, '#f4f4ec', 0.75) + A.p('M0 0H960V24Q480 -10 0 24Z', '#d8d8cc');
    for (let i = 0; i < 40; i++) s += A.s(`M${(i * 24) % 960} ${(i * 37) % 2 ? 100 : 246}v${150 - (i % 3) * 20}`, '#f4f4ec', 1.5, 0.5);
    for (const [x, y] of [[66, 100], [186, 246], [546, 100], [786, 246], [426, 246]]) s += A.s(`M${x} ${y}q4 16 0 34`, '#a8603a', 3, 0.7);
    for (const [x, y, w] of [[200, 110, 60], [640, 120, 90]]) s += A.r(x, y, w, 90, '#fff', 0.35);
    // two palms up against the glass, a banana, a vine along the rib
    const palm = (x, k, c1, c2) => { let t = `<g transform="translate(${x} 410) scale(${k})">` + A.s('M0 0Q-8 -130 6 -240', '#6a5a3a', 13) + A.s('M-4 -70h14M-5 -120h14M-3 -170h13', '#4a3e28', 3); t += '<g class="grm-sway">'; for (let a = 0; a < 9; a++) { const dx = -190 + a * 47.5, tipY = -206 + Math.abs(a - 4) * 26 - (a === 4 ? 96 : 0), ctlY = -300 + Math.abs(a - 4) * 12; t += A.p(`M6 -240Q${(dx * 0.55).toFixed(0)} ${ctlY - 16} ${dx.toFixed(0)} ${tipY}Q${(dx * 0.5).toFixed(0)} ${ctlY + 22} 6 -232Z`, a % 2 ? c1 : c2); for (let q = 1; q < 6; q++) { const u = q / 6, x = 6 + (dx - 6) * u, y = -240 + (tipY + 240) * u * u + (ctlY + 240) * 2 * u * (1 - u); t += A.s(`M${x.toFixed(0)} ${y.toFixed(0)}l${(dx > 0 ? 9 : -9)} 20`, a % 2 ? c1 : c2, 3); } } return t + '</g></g>'; };
    s += palm(170, 1, '#2f7a4e', '#3f9a5e') + palm(800, 1.2, '#2a6e46', '#469e60') + palm(500, 0.82, '#3a8a54', '#58ac6a');
    s += A.s('M0 180Q120 120 240 180T480 150T720 190T960 140', '#3f8a4a', 4) + [40, 130, 220, 330, 430, 540, 660, 760, 870].map((x, i) => A.e(x, 170 - (i % 3) * 18, 15, 7, '#4f9a56')).join('');
    // the bed: brick, then pots, orchids in flower
    s += A.r(0, 368, 960, 28, '#8a5a3a') + A.r(0, 368, 960, 5, '#a8724a');
    for (const [x, c] of [[86, '#d88ac0'], [300, '#f4dc6a'], [420, '#e86a8a'], [620, '#d88ac0'], [900, '#f4a84a']]) s += `<g transform="translate(${x} 368)">${A.p('M-20 -28L-14 0H14L20 -28Z', '#b8623a')}${A.r(-22, -32, 44, 7, '#c8724a', null, 2)}${A.s('M0 -32Q-14 -70 6 -96M0 -32Q12 -56 22 -66', '#3f8a4a', 3)}${A.c(6, -100, 9, c)}${A.c(-3, -106, 7, c)}${A.c(14, -106, 7, c)}${A.c(6, -103, 3, '#fff4c8')}${A.c(23, -70, 7, c)}</g>`;
    // steam off the pipes, a watering can, wet floor
    s += _grmFloorY(A, 396, 'url(#of2)') + A.s('M0 416H960', '#b0b0a8', 9, 0.8) + A.s('M0 432H960', '#8a8a84', 5, 0.6);
    for (let i = 0; i < 8; i++) s += `<circle class="grm-steam" cx="${90 + i * 118}" cy="404" r="30" fill="url(#ost)" style="animation-delay:-${(i * 0.4).toFixed(1)}s"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) s += A.p(`M${c * 100 - (r % 2) * 50} ${446 + r * 38}l50 -14l50 14l-50 14z`, (r + c) % 2 ? '#7a6a50' : '#5a5040', 0.5);
    s += `<g transform="translate(700 520)">${A.r(-22, -30, 44, 30, '#5a8aa0', null, 5)}${A.s('M22 -24L50 -40', '#5a8aa0', 6)}${A.s('M-22 -24q-16 -4 -14 16', '#3f6a80', 4)}${A.r(46, -46, 12, 10, '#3f6a80')}</g>`;
    return s;
  },
  /* The cap: all machine. Great timbers and a wheel taller than you, flour hanging in a bar of light, the shadow of a sail going past the slit. It creaks. */
  capfloor() {
    const A = _GRM_Q; let s = _grmDefs(A.lin('cw2', [[0, '#2a1c0e'], [1, '#6e5230']]) + A.lin('cf', [[0, '#8a6e48'], [1, '#403020']]));
    s += A.r(0, 0, 960, 600, 'url(#cw2)') + A.planks(0, 392, '#1a1006', 0.4, 62);
    // the cap roof, ribs meeting overhead
    for (let i = 0; i < 9; i++) s += A.s(`M${i * 120} 0Q${480 + (i - 4) * 40} 80 ${i * 120} 120`, '#1a1006', 8, 0.8);
    s += A.r(0, 88, 960, 22, '#1a1006') + A.r(0, 100, 960, 5, '#a8884a', 0.3);
    // the huge windshaft across the room
    s += A.r(0, 212, 960, 44, '#3a2814') + A.r(0, 212, 960, 8, '#5a3e22') + [80, 560, 720, 880].map(x => A.r(x, 208, 14, 52, '#2a1c0e')).join('');
    // the slit, and a sail going by
    s += A.r(820, 130, 70, 150, '#c8e0ec') + `<g clip-path="url(#capc)"><g class="grm-sail" style="transform-origin:855px 205px">${A.p('M848 60h14V350h-14Z', '#3a2814')}${A.p('M60 198H1650v14H60Z', '#3a2814')}</g></g><clipPath id="capc"><rect x="820" y="130" width="70" height="150"/></clipPath>` + A.s('M820 130H890V280H820Z', '#1a1006', 7);
    s += `<path class="grm-ray" d="M820 280L620 600H1000L890 280Z" fill="#fff4d0" opacity=".16"/>`;
    s += A.motes(46, 'cp', 560, 950, 150, 500, '#fff8e0', 0.7);
    // the great post, sacks, the stones and the hopper on the right
    s += A.r(600, 110, 34, 290, '#3a2814') + A.s('M600 180H634M600 300H634', '#1a1006', 3);
    for (const [x, y, k] of [[726, 392, 1], [798, 392, 1.06], [760, 340, 0.92]]) s += `<g transform="translate(${x} ${y}) scale(${k})">${A.p('M-34 0Q-40 -44 -24 -66L24 -66Q40 -44 34 0Z', '#e6d8b8')}${A.p('M-20 -66L0 -80L20 -66Z', '#c8b488')}${A.s('M-20 -66H20', '#8a7450', 2.4)}${A.s('M-24 -40q24 8 48 0', '#c8b488', 1.6)}</g>`;
    s += A.e(90, 500, 74, 22, '#6e6a60') + A.e(90, 488, 74, 22, '#8e8a7e') + A.e(90, 488, 20, 6, '#3a3630') + A.s('M34 488q56 18 112 0M50 478q44 12 84 0', '#6e6a60', 2);
    // floor, flour on it, footprints
    s += _grmFloorY(A, 392, 'url(#cf)') + A.planks(392, 600, '#1a1006', 0.42, 80) + A.r(0, 392, 960, 8, '#000', 0.4);
    const r = A.rng('cf'); for (let i = 0; i < 16; i++) s += A.e(460 + r() * 460, 410 + r() * 180, 30 + r() * 60, 5 + r() * 8, '#fff8e0', 0.14);
    for (let i = 0; i < 6; i++) s += A.e(470 + i * 46, 540 - (i % 2) * 14, 7, 3.4, '#2a1c0e', 0.4);
    return s;
  },
});

/* ---------- the rooms ---------- */
const GRM_ROOMS = Object.freeze([
  /* ---------- open from the start, and hidden ---------- */
  { id: 'cellar', at: 'ld-sunk', name: 'The drowned cellar', verb: 'Feel for a fourth step', door: 'steps', bg: '#071c24', edge: ['#16505a', '#07202a'], say: 'There are three steps. Then, if you keep going, a fourth. Then a cellar nobody has needed for years, with the pool for a ceiling.', how: 'Open two jars at a time and find the pairs. Something swims in the flood too: click the water to cast.',
    art: GRM_ART.cellar, floor: { x0: 44, x1: 930, y0: 410, y1: 586 }, spawn: { x: 170, y: 490 },
    water: { room: 'cellar', cy: 10, kinds: ['jar-minnow', 'cellar-eel', 'barrel-carp'], e: [[620, 500, 290, 60]] },
    play: 'pairs', gift: { ticket: 1, 'mat:reed': 1 }, doneLine: 'You have sorted today’s jars. The water will have moved things by tomorrow.', gotLine: 'The last pair, and under the wax of the last jar, dry as the day it was sealed: a bundle of reeds and a ticket someone meant to use.',
    miss: ['Pickled something. It looks back.', 'Not a pair. Buttons, all of them odd.', 'A smell of 1911, and no match.', 'Sand. Just sand. You check twice.'],
    jars: [[320, 236], [428, 236], [536, 236], [644, 236], [320, 356], [428, 356], [536, 356], [644, 356]] },

  { id: 'den', furnish: true, at: 'ld-mile', name: 'The measurer’s den', verb: 'Lift the iron ring behind it', door: 'trap', bg: '#20140a', edge: ['#2a1c0e', '#2e2012'], say: 'Under the milestone, the den of whoever decided this was as far as anyone would measure. Maps on every wall, and a chair still warm, somehow.', how: 'The big map has been cut up. Click a piece, click another, and they swap. Get the river joined and the notebook opens at today’s page.',
    art: GRM_ART.den, floor: { x0: 44, x1: 916, y0: 404, y1: 576 },
    play: 'mapBook', tip: 'Read the notebook', gift: { 'mat:peg': 1, ticket: 1 }, after: { ticket: 1 }, doneLine: 'One page a day. He was a slow writer.',
    board: { x: 360, y: 122, w: 270, h: 216 },
    mapArt(h) {
      const A = _GRM_Q, a = 20 + h() * 40, b = 60 + h() * 70, c = 110 + h() * 60; let s = A.r(0, 0, 270, 216, '#e8dcbc');
      for (let i = 0; i < 5; i++) s += A.s(`M0 ${i * 48 + 10}H270M${i * 60 + 10} 0V216`, '#c8b88a', 0.8);
      s += A.blob(70, 50, 44, 28, 'mf1', 0.4, '#a8c088') + A.blob(214, 168, 54, 36, 'mf2', 0.4, '#a8c088') + A.p('M172 76l18 -30l18 30zM198 82l14 -24l14 24zM40 170l16 -28l16 28z', '#9a8a6a');
      s += A.s(`M-4 ${a}C60 ${b} 90 ${a + 40} 135 ${c}S220 ${b} 274 ${c + 40}`, '#4a8ab4', 8) + A.s(`M-4 ${a}C60 ${b} 90 ${a + 40} 135 ${c}S220 ${b} 274 ${c + 40}`, '#8ac0dc', 3);
      s += A.s(`M20 200L${70 + a} 130L150 ${60 + a / 2}L250 24`, '#b84a3a', 2.6, 0.9) + A.c(250, 24, 5, '#a83a2a') + A.c(20, 200, 5, '#a83a2a') + A.s('M30 30l10 -10M36 22l-10 -2', '#6a5a3a', 2);
      return s;
    },
    end: { items: { 'mat:peg': 3 }, say: 'Behind the last page, three good pegs, tied with string and a label: “For whoever carries on.”' },
    book: { x: 750, y: 396, art: () => { const A = _GRM_Q; return A.p('M-30 -20L0 -26L30 -20L28 -6L0 -12L-28 -6z', '#f2e6c8') + A.s('M0 -26V-12', '#8a7a5a', 2) + A.s('M-22 -18l16 -3M-22 -13l16 -3M8 -21l16 3M8 -16l16 3', '#a89a7a', 1); } },
    pages: ['“Day 1. Started at the stone. Measured to the first tree. It is further than it looks.”', '“Day 2. Measured back. It is nearer than it looks. There is a peg in this book for you. I keep finding them.”', '“Day 3. The lane is longer going home. I have written to someone about this.”', '“Day 4. No reply. A snail has been past. It may have been the reply.”', '“Day 5. There is more land than I was told. It will not stay measured. Pegs help.”', '“Day 6. Moved one hill. On paper. Felt good.”', '“Day 7. The lake is the size it is when you are not looking at it.”', '“Day 8. That is enough for one person. I have put a 0 on both sides of the stone, so nobody can say I got it wrong.”'] },

  { id: 'boatloft', at: 'ld-boathouse', name: 'The boat loft', verb: 'Follow the smell of boats', door: 'plank', bg: '#101820', edge: ['#141e26', '#2c2018'], say: 'Round the back, up behind the old nets: four hulls hung in the roof, and somebody’s chalk marks on the wall. Each hull has a note in it.', how: 'Knock on the hulls in the order of the chalk marks on the board.',
    art: GRM_ART.boatloft, floor: { x0: 44, x1: 916, y0: 404, y1: 576 },
    play: 'tune', tip: 'Knock on the hull', wave: 'triangle', len: 0.85, gift: { 'mat:reed': 1, ticket: 2 }, gotLine: 'The whole loft hums for a moment, and a bundle of reeds slides off a rafter. There is a new tune chalked up every day, and you never see who does it.', missLine: 'That is not the tune on the wall. A swallow gives you a look.', doneLine: 'You know today’s tune now. Play it if you like.',
    things: [['#b8623a', 262, 200, 200], ['#3f7486', 330, 360, 260], ['#d8b24a', 392, 610, 260], ['#6a9a5a', 523, 770, 200]].map(([c, f, x, y]) => ({ x, y, f, w: 130, h: 180, art: (hot) => { const A = _GRM_Q; return A.s(`M-44 ${-y + 70}V-66M44 ${-y + 70}V-66`, '#8a8066', 3) + `<g transform="translate(0 ${hot ? 8 : 0})">` + A.p('M-68 -66H68Q60 -18 0 -6Q-60 -18 -68 -66z', c) + A.p('M-68 -66H68L64 -56H-64z', '#000', 0.28) + A.s('M-58 -44Q0 -22 58 -44M-40 -24Q0 -12 40 -24', '#000', 1.6, 0.24) + A.r(-18, -72, 36, 7, '#6e4a2a') + (hot ? A.c(0, -34, 22, '#fff', 0.34) : '') + '</g>'; } })),
    chart: { x: 410, y: 366, art(seq, at) { const A = _GRM_Q, C = ['#b8623a', '#3f7486', '#d8b24a', '#6a9a5a']; let s = A.r(-30, -32, 220, 60, '#141c22', 0.94, 4) + A.s('M-30 -32H190V28H-30Z', '#6a5a3a', 3); (seq || []).forEach((k, i) => { s += A.c(10 + i * 48, -2, 16, C[k], i < at ? 0.2 : 1) + (i < at ? A.s(`M${i * 48 + 2} -2l6 7l10 -13`, '#f2ead8', 2.6) : ''); }); return s; } } },

  { id: 'lampcup', at: 'ld-lamp-a', name: 'The lamplighter’s cupboard', verb: 'Try the small door in the post', door: 'post', bg: '#05060e', edge: ['#05060e', '#05060e'], say: 'Somebody still comes and lights it, and this is where they keep the wicks. All on the one wire, which was somebody’s idea of saving money.', how: 'Touching a wick flips it and the two beside it. Get all five burning.',
    art: GRM_ART.lampcup, floor: { x0: 140, x1: 820, y0: 410, y1: 566 }, spawn: { x: 190, y: 500 },
    play: 'wicks', tip: 'Touch this wick', gift: { ticket: 2, 'mat:stone': 1 }, gotLine: 'All five, and the whole cupboard goes gold. A stone rolls out from under the shelf, for holding the door, and there is a ticket in the wax.', doneLine: 'All lit. Someone will have snuffed them by tomorrow, and rewired them too.',
    dim: (n) => `<rect x="130" width="830" height="600" fill="#02030c" opacity="${(0.46 - n * 0.092).toFixed(2)}"/>${n === 5 ? `<rect width="960" height="600" fill="#ffc86a" opacity=".14"/>` : ''}`,
    wick: (on) => { const A = _GRM_Q; return A.r(-14, -4, 28, 8, '#c8b488', null, 2) + A.r(-4, -54, 8, 50, '#efe6cc', null, 2) + (on ? A.flame(0, -54, 1.3) + A.glow(0, -68, 70, 0.42) : A.s('M0 -56q5 -6 0 -12', '#8a8a8a', 1.6, 0.6)); } },

  { id: 'nowhere', at: 'ld-sign-c', name: 'Nowhere in particular', verb: 'Go the way the blank arm points', door: 'mist', bg: '#c4bedc', edge: ['#eef0f8', '#c4bedc'], say: 'You walk the way nothing is written, and it works. Mist, and a very old guest book, if you can find it. Everyone who ever got here left a sign pointing home.', how: 'Follow the way the signs point. Walk until the book shows in the mist, and sign it.',
    art: GRM_ART.nowhere, floor: { x0: 44, x1: 916, y0: 410, y1: 566 },
    front() { const A = _GRM_Q; let s = '<g class="grm-front">'; for (let i = 0; i < 7; i++) s += `<ellipse class="grm-cloud" style="animation-delay:-${i * 5}s" cx="${(i * 211) % 960}" cy="${430 + (i * 37) % 150}" rx="${150 + (i * 37) % 90}" ry="${20 + (i % 3) * 6}" fill="#fff" opacity=".34"/>`; void A; return s + '</g>'; },
    play: 'mistway', tip: 'Sign the book', goal: 7, max: 12, gift: { ticket: 2 }, foundLine: 'There it is: the book, on a stand, as if it had been waiting.', doneLine: 'You have signed for today. Your sign will still be pointing tomorrow.', end: { items: { 'decor:rw-orn-marker': 1 }, say: 'Seven days, and there is a little way marker by the book with your name on. It is in your bag, for pointing at something at home.' },
    posts: [[300, 418], [560, 430], [790, 412]],
    lines: ['You sign the book. A sign you do not remember making goes up beside the post.', 'Your second sign. It points somewhere else. They do that.', 'Three signs. A very faint voice says “Oh, you again”, and it is pleased.', 'Four signs. Someone has signed under you: “Same.”', 'Five signs. The mist is getting used to you.', 'Six signs. There is a chair now. There was not a chair.', 'Seven signs, and somebody has started a little fence.', 'Another sign. You know the way by now.'],
    tend: { x: 700, y: 400, art: () => _GRM_Q.r(-40, -56, 80, 56, '#6e5a44') + _GRM_Q.r(-48, -62, 96, 8, '#8a7458') + _GRM_Q.p('M-30 -62L0 -68L30 -62L28 -72L0 -78L-28 -72z', '#fbf6e6') + _GRM_Q.s('M34 -60L46 -96', '#2a2a3a', 2.4) },
    grown(n) { const A = _GRM_Q, C = ['#b8623a', '#3f7486', '#6a9a5a', '#c8984a', '#8a5a9a', '#c85a6a', '#5a8ab8']; let s = ''; for (let i = 0; i < n; i++) { const x = 230 + (i * 149) % 640, y = 408 + (i % 3) * 8, d = i % 2 ? 1 : -1; s += A.r(x - 3, y - 110, 6, 110, '#7a6a58') + A.p(`M${x} ${y - 104}h${d * 50}l${d * 12} 10l${-d * 12} 10h${-d * 50}z`, C[i % C.length]); } if (n >= 6) s += A.r(620, 370, 40, 8, '#7a5a3a') + A.r(622, 378, 6, 44, '#7a5a3a') + A.r(654, 378, 6, 44, '#7a5a3a') + A.r(620, 326, 8, 50, '#7a5a3a'); return s; } },

  /* ---------- further out, or at the right hour, or with the right thing ---------- */
  { id: 'owl', at: 'ld-hollow', name: 'Inside the hollow oak', verb: 'Squeeze in behind the shelf', door: 'bark', bg: '#140a04', edge: ['#140a04', '#1c0e06'], say: 'Far bigger inside. The rings go round you like a clock. Someone large and feathered has been reading.', how: 'Go up to the owl. It asks one question a night, about what is out on your land.', shut: m => _grmTod(m, ['dusk', 'night']) ? '' : 'Something is asleep in there, and snoring. It sounds like it would rather you came at dusk.',
    art: GRM_ART.owl, floor: { x0: 130, x1: 840, y0: 410, y1: 580 }, spawn: { x: 210, y: 500 },
    play: 'quiz', tip: 'Speak to the owl', gift: { ticket: 3, 'mat:timber': 1 }, gotLine: '“Hm,” says the owl, which is high praise, and pushes a ticket off the perch. A good log comes down after it.', missLine: '“No,” says the owl. “Go and look. I will ask you something else tomorrow.”', doneLine: 'The owl has gone back to its book. One question a night.',
    who: { x: 480, y: 330, art: (rest) => { const A = _GRM_Q; return A.e(0, -50, 38, 50, '#8a6a46') + A.e(0, -36, 25, 34, '#d8c8a0') + [0, 1, 2].map(i => A.s(`M${-14 + i * 14} -46q3 4 6 0M${-14 + i * 14} -32q3 4 6 0`, '#8a6a46', 1.6)).join('') + A.c(-15, -74, 14, '#f4eec8') + A.c(15, -74, 14, '#f4eec8') + (rest ? A.s('M-24 -74q9 6 18 0M6 -74q9 6 18 0', '#2a1a10', 2.6) : A.c(-15, -74, 6.5, '#1a1a1a') + A.c(15, -74, 6.5, '#1a1a1a') + A.c(-13, -76, 2, '#fff') + A.c(17, -76, 2, '#fff')) + A.p('M-4 -64L4 -64L0 -56z', '#d89a3a') + A.p('M-34 -92L-20 -84L-28 -76zM34 -92L20 -84L28 -76z', '#6a4a2e') + A.s('M-27 -70q-14 26 -2 54M27 -70q14 26 2 54', '#6a4a2e', 6); } },
    qs: [{ q: '“How many stones stand on the hill, by daylight?”', a: ['Five', 'Six', 'Nine'] }, { q: '“What does the signpost’s blank arm say, in very small letters?”', a: ['You are here', 'Go home', 'Mind the step'] }, { q: '“What is written on both sides of the milestone?”', a: ['0', '7', '100'] }, { q: '“Whom does the stone gardener look at as if they owe him money?”', a: ['The greenhouse', 'The lake', 'The owl'] }, { q: '“How many warm days a year is the summer house built for?”', a: ['Three', 'Ten', 'Ninety'] }, { q: '“What did the wheel of the watermill do when the brook moved?”', a: ['It stopped', 'It sang', 'It left'] }] },

  { id: 'grotto', at: 'ld-grotto', name: 'The back of the grotto', verb: 'Go further in than your arm', door: 'cave', bg: '#050d0a', edge: ['#050d0a', '#0e1c14'], say: 'The cold breath comes from here: a low green room, one drip of water, and a pool that goes down further than it should. Shadows move in it. The bare rock would like some moss, too.', how: 'Click the pool near a shadow to cast, just as you would at the lake. Or pick up some moss and press it onto the rock.',
    art: GRM_ART.grotto, floor: { x0: 44, x1: 934, y0: 412, y1: 586 }, spawn: { x: 170, y: 500 },
    water: { room: 'cave', cy: 0, kinds: ['blind-loach', 'moss-chub', 'drip-pearl'], e: [[630, 494, 282, 66]] },
    front() { const A = _GRM_Q; let s = '<g class="grm-front">' + A.p('M0 0H960V36Q800 90 690 36Q600 70 500 30Q400 76 300 32Q180 84 90 34Q40 60 0 34Z', '#030806'); for (const [x, l, w] of [[60, 120, 34], [160, 70, 22], [310, 92, 26], [440, 60, 18], [540, 110, 28], [700, 78, 22], [820, 128, 36], [910, 76, 24]]) s += A.p(`M${x - w} 26Q${x - w * 0.3} ${l * 0.5} ${x} ${l}Q${x + w * 0.3} ${l * 0.5} ${x + w} 26Z`, '#040a08'); s += A.p('M0 600V540Q120 560 200 600Z', '#040a08') + A.p('M960 600V530Q860 570 780 600Z', '#040a08') + A.fern(40, 590, 1.1, '#17301f') + A.fern(930, 590, 1.2, '#17301f', 1); return s + '</g>'; },
    play: 'mossGrow', tip: 'Press on a tuft of moss', goal: 7, max: 14, gift: { 'mat:stone': 1, ticket: 1 }, holdLine: 'Tufts will come up on the rock. Press five of them in before they dry.', doneLine: 'Moss will only go so fast. Come back tomorrow, and it will have taken.', end: { items: { 'decor:rw-ground-moss': 4 }, say: 'The rock is green all over, and comes away in neat pieces at the edge. You take four squares for home.' },
    tufts: [[232, 342], [298, 286], [372, 340], [262, 262], [338, 250], [412, 322]],
    lines: ['You press the tufts into the bare rock. It is not much, yet.', 'Yesterday’s took. Another patch beside it.', 'It is starting to look deliberate.', 'Something very small has moved in.', 'A fern, that you did not plant.', 'The drip has changed its note. It likes this.', 'Nearly the whole rock now.', 'You press another tuft in. There is always a bare bit.'],
    tend: { x: 270, y: 452, art: () => _GRM_Q.e(0, 2, 40, 8, '#000', 0.3) + _GRM_Q.r(-34, -24, 68, 24, '#6a5a44', null, 6) + _GRM_Q.e(-10, -28, 22, 11, '#5a9a4e') + _GRM_Q.e(14, -30, 18, 10, '#6aaa56') },
    grown(n) { const A = _GRM_Q; let s = ''; for (let i = 0; i < n; i++) { const x = 232 + (i * 67) % 170, y = 258 + (i * 41) % 110; s += A.e(x, y, 42 + (i % 3) * 8, 19, i % 2 ? '#4f8a48' : '#609e58') + A.e(x - 10, y - 4, 16, 6, '#8acc78', 0.7); } if (n >= 5) s += A.fern(392, 300, 0.7, '#6eb060') ; return s; } },

  { id: 'falls', at: 'ld-falls', name: 'Behind the falls', verb: 'Walk through the water', door: 'water', bg: '#10181c', edge: ['#10181c', '#1e262a'], say: 'A dry ledge, the whole falls for a wall, and three old mirrors on posts. Somebody set them up to catch the first of the sun.', how: 'Click a mirror to turn it, and get the light all the way along.', shut: m => _grmTod(m, ['dawn']) ? '' : 'The water is too heavy to walk through. It looks thinner first thing in the morning.',
    art: GRM_ART.falls, floor: { x0: 44, x1: 916, y0: 404, y1: 580 },
    play: 'mirrors', tip: 'Turn this mirror', gift: { ticket: 2, 'mat:stone': 1 }, gotLine: 'The light goes all the way along and the falls turn into a rainbow, just for you, just for a minute. A wet stone and a ticket sit where it lands.', doneLine: 'The sun has moved on. It will be back at this time tomorrow, and it will want the mirrors differently.',
    at3: [{ x: 240, y: 390 }, { x: 490, y: 372 }, { x: 740, y: 390 }],
    mirror: (a) => { const A = _GRM_Q; return A.e(0, 2, 24, 5, '#000', 0.3) + A.r(-5, -66, 10, 66, '#3a2a1c') + `<g transform="translate(0 -92) rotate(${[-28, 0, 28][a]})">` + A.r(-30, -34, 60, 68, '#b8903a', null, 6) + A.r(-24, -28, 48, 56, '#e8f8fc', null, 3) + A.s('M-14 -14L6 -22', '#fff', 3, 0.9) + '</g>'; },
    ray(upto) { const A = _GRM_Q, pts = [[40, 60], [240, 298], [490, 280], [740, 298], [900, 110]]; let s = ''; for (let i = 0; i <= upto; i++) s += A.s(`M${pts[i][0]} ${pts[i][1]}L${pts[i + 1][0]} ${pts[i + 1][1]}`, '#fff2b0', 7, 0.8); if (upto >= 3) ['#e8504e', '#f0a03e', '#f4e04e', '#5ac06a', '#4a90d8', '#8a5ac0'].forEach((c, i) => { s += A.s(`M300 ${380 - i * 16}Q620 ${30 - i * 16} 900 ${320 - i * 16}`, c, 15, 0.5); }); return s; } },

  { id: 'lamproom', at: 'ld-lighthouse', name: 'The lamp room', verb: 'Climb all the way up', door: 'spiral', bg: '#050a1e', edge: ['#050a1e', '#3e3a34'], say: 'Far too small, and all window. Somewhere out on the dark lake tonight there is somebody who cannot find the way in.', how: 'Take hold of the lamp. Move the pointer, or the arrow keys, to swing the beam until you find the boat, and hold the light on it.', shut: m => _grmTod(m, ['night']) ? '' : 'The stairs are roped off and a card says LAMP LIT AT NIGHT. COME BACK THEN.',
    art: GRM_ART.lamproom, floor: { x0: 44, x1: 916, y0: 410, y1: 576 }, blocks: [[480, 410, 96, 26]],
    play: 'beam', gift: { 'mat:reed': 2, ticket: 2 }, holdLine: 'Swing the beam across the water. When you see the boat, stay on it.', gotLine: 'There. A small boat in the beam, and an arm waving. A bundle of reeds and a ticket come up on the hoist, by way of thanks.', doneLine: 'They are home. There will be someone else out there tomorrow night.',
    lamp: { x: 480, y: 392, sea: 346 } },

  { id: 'ringers', at: 'ld-chapel', name: 'The ringing chamber', verb: 'Try the low door behind the altar', door: 'gothic', bg: '#050508', edge: ['#050508', '#1c1c22'], say: 'The bell has not rung for a hundred years, but the ropes are all still here. The old window shows the order they rang them in. It changes with the light.', how: 'Pull the ropes in the order of the colours in the window, from left to right.', shut: () => gpGet('rm.k.iron') ? '' : 'A small door, and a very big lock. The key would have been put somewhere sensible, like an old barn, and forgotten.',
    art: GRM_ART.ringers, floor: { x0: 44, x1: 916, y0: 410, y1: 576 },
    play: 'tune', tip: 'Pull this rope', wave: 'sine', len: 1.4, gift: { 'mat:timber': 1, ticket: 3 }, gotLine: 'For the first time in a hundred years, and only down here, it rings out properly. Dust falls, with a bit of old beam and a ticket in it.', missLine: 'Wrong rope. A long dull clunk, somewhere up in the dark.', doneLine: 'You rang it true today. It takes a day for the dust to settle.',
    things: [['#c8483a', 196, 180], ['#d8a83a', 247, 300], ['#4a7ab8', 294, 680], ['#5a9a5a', 349, 800]].map(([c, f, x]) => ({ x, y: 448, f, w: 80, h: 440, art: (hot) => _GRM_Q.s(`M0 -450V${hot ? -36 : -60}`, '#d8c8a0', 6) + _GRM_Q.s(`M-1 -450V${hot ? -36 : -60}`, '#a8986a', 1.6, 0.8) + _GRM_Q.r(-11, hot ? -190 : -214, 22, 92, c, null, 10) + _GRM_Q.s(`M-11 ${hot ? -160 : -184}H11M-11 ${hot ? -130 : -154}H11`, '#000', 2, 0.25) + _GRM_Q.e(0, 0, 44, 12, '#000', 0.2) })),
    chart: { x: 480, y: 48, art(seq, at) { const A = _GRM_Q, C = ['#c8483a', '#d8a83a', '#4a7ab8', '#5a9a5a']; let s = ''; (seq || []).forEach((k, i) => { s += A.p(`M${-100 + i * 50} 40h48v196h-48z`, C[k], i < at ? 0.25 : 0.95) + A.p(`M${-92 + i * 50} 56h32v40h-32z`, '#fff', 0.16) + A.s(`M${-100 + i * 50} 40v196`, '#1e1a16', 5); }); return s + A.s('M-106 60Q0 -34 106 60V240H-106z', '#1e1a16', 11); } } },

  { id: 'barnloft', at: 'ld-barn', name: 'Up in the barn', verb: 'Climb over the first lot of things', door: 'barn', bg: '#2a180c', edge: ['#4a2c16', '#7a6230'], say: 'Full of things somebody will definitely need one day. Today, somebody is you. Dig in, and mind the rake.', how: 'Fork the heaps of hay. Yellow marks show how near you are: three means very near.',
    art: GRM_ART.barnloft, floor: { x0: 44, x1: 916, y0: 398, y1: 586 },
    play: 'fork', forks: 9, gift: { 'mat:timber': 2, ticket: 1 }, gotLine: 'Under it all, some good straight timber nobody will miss, and a ticket used as a bookmark in nothing.', doneLine: 'That is today’s heap. By tomorrow it will all have slid about again.',
    won(R) { if (!gpVisiting() && !gpGet('rm.k.iron')) { gpSet('rm.k.iron', _gdToday()); setTimeout(() => _grmSay('And hanging on the nail behind it, a great iron key with a little cross on the bow. That is not for any door in a barn.', 9000), 7000); } },
    miss: ['Eleven left boots.', 'A rake. You found it with your foot.', 'A box labelled STRING TOO SHORT TO USE. It is full.', 'A very old hen, who is fine, thanks.'],
    hay: { x0: 230, y0: 402, cw: 130, ch: 54, cols: 5, rows: 3 } },

  { id: 'parlour', at: 'ld-stump', name: 'The very small parlour', verb: 'Knock again, and wait', door: 'mouse', bg: '#3a2010', edge: ['#3a2010', '#7a5230'], say: 'You do not know how you fit. Thimble stools, a matchbox for a table, and a family of mice being extremely polite about it.', how: 'Hold the teapot to pour, and let go when the tea is between the two gold lines. Three cups.', shut: m => _grmTod(m, ['dusk']) ? '' : 'A very small voice says “not at this hour, thank you. We do visitors at dusk.”',
    art: GRM_ART.parlour, floor: { x0: 44, x1: 916, y0: 420, y1: 576 }, spawn: { x: 186, y: 530 },
    play: 'pourGive', gift: { ticket: 3 }, tip: 'Offer them something', spillLine: 'All over the matchbox. The mice mop it up, very politely, and you start that cup again.', gotLine: 'You pour for everyone and hand over some {crop}. There is a lot of bowing, and they press three tickets on you. They are the size of postage stamps, and quite good.', doneLine: 'They have eaten and are being polite about the time. Come back tomorrow at dusk.', emptyLine: 'They look hopefully at your pockets. Next time, bring something you have picked.', guestLine: 'They are your friend’s mice. They wave, and drink your tea.',
    pour: { cups: [350, 470, 590], y: 388 },
    who: { x: 470, y: 392, art: (full) => { const A = _GRM_Q; return A.e(0, -8, 40, 8, '#efe6d8') + A.e(0, -10, 30, 5, '#d8c8a8') + (full ? A.c(-8, -18, 10, '#c8483a') + A.c(8, -16, 8, '#e8a83a') : ''); } } },

  { id: 'hut', furnish: true, at: 'ld-hut', name: 'In the shepherd’s hut', verb: 'Try the door. It is only on a latch', door: 'latch', bg: '#222822', edge: ['#222822', '#3e2c1a'], say: 'A chair, a kettle, a dog’s bowl. Nobody home, but the stove is warm. It would be rude not to put the kettle on.', how: 'Pump the bellows to keep the needle in the green until the kettle sings. Too hot and it boils over.',
    art: GRM_ART.hut, floor: { x0: 44, x1: 916, y0: 404, y1: 576 }, blocks: [[480, 406, 90, 16]],
    play: 'stoke', gift: { ticket: 2 }, overLine: 'It boils over, hissing on the stove. Ease off, and bring it back to the green.', doneLine: 'You have had your tea. The kettle is cooling, and it will take a day.', gotLine: 'The kettle sings. A good strong cup, drunk looking at the view. A ticket has been left under the saucer, for the washing up.',
    won() { if (!gpVisiting() && !gpGet('rm.k.word')) { gpSet('rm.k.word', _gdToday()); setTimeout(() => _grmSay('On the saucer, in a child’s letters: “For the treehouse. The word is ONIONS. Do not tell Dad.”', 10000), 7000); } },
    stove: { x: 480, y: 392, art: (won) => { const A = _GRM_Q; return A.e(0, 2, 90, 10, '#000', 0.3) + A.r(-74, -126, 148, 126, '#2e2a26', null, 4) + A.r(-66, -30, 132, 8, '#46403a') + A.r(-50, -92, 100, 60, '#141210', null, 4) + `<g class="grm-fire" transform="translate(0 -24) scale(.8)">${A.flame(-22, 0, 1.4)}${A.flame(4, 0, 1.9)}${A.flame(26, 0, 1.2)}</g>` + A.s('M-50 -62H50M-20 -92V-32M20 -92V-32', '#3a342e', 3) + A.r(-82, -132, 164, 10, '#46403a') + A.s('M60 -132V-330', '#3a342e', 12) + A.p('M-34 -136Q-38 -172 0 -172Q38 -172 34 -136z', '#8a9a9e') + A.p('M34 -160L60 -174L56 -158L34 -148Z', '#8a9a9e') + A.s('M-24 -172Q0 -202 24 -172', '#3a3a3a', 3.6) + A.c(0, -176, 4, '#3a3a3a') + `<g class="grm-kettle-s" opacity="${won ? 1 : 0}"><circle class="grm-steam" cx="62" cy="-180" r="8" fill="#fff"/><circle class="grm-steam" cx="68" cy="-192" r="5" fill="#fff" style="animation-delay:-.9s"/><circle class="grm-steam" cx="58" cy="-196" r="6" fill="#fff" style="animation-delay:-1.6s"/></g>` + (won ? `<g transform="translate(-112 -2)">${A.p('M-12 -22L-9 0H9L12 -22Z', '#efe6d8')}${A.s('M12 -16q10 2 0 12', '#efe6d8', 2.6)}</g>` : ''); } } },

  { id: 'treehouse', furnish: true, at: 'ld-treehouse', name: 'The treehouse', verb: 'Say the password up the string', door: 'rope', bg: '#3f7a38', edge: ['#a8e0f0', '#5a3e22'], say: 'The string goes taut and a rope ladder comes down. KEEP OUT, it says, and under that, in other pencil: THIS MEANS YOU. Inside, the rules of a very serious club.', how: 'Listen at the tin, then knock the same knock on the hatch. The club will let you read today’s rule.', shut: () => gpGet('rm.k.word') ? '' : 'A tin comes down with a note: “password?” You do not know it. Whoever lived up on the hill might have. Their kettle is still there.',
    art: GRM_ART.treehouse, floor: { x0: 44, x1: 916, y0: 402, y1: 576 },
    play: 'knockBook', tip: 'Read the club rules', gift: { ticket: 2 }, after: { ticket: 1 }, doneLine: 'A rule a day. The club does not rush.', end: { items: { 'decor:rw-orn-logs': 1 }, say: 'You have read all the rules, so you must be a member. There is a stack of logs with your name on it. It is in your bag. That is the clubhouse fund.' },
    club: { can: [914, 392], sign: [322, 340], hatch: [470, 392] },
    book: { x: 470, y: 392, art: () => _grmBook('#a83a2a') },
    pages: ['“RULE 1. No grown ups. You have got this far, so we will assume you are not one.”', '“RULE 2. Tell no one about the club. There is a ticket for keeping quiet.”', '“RULE 3. Onions are not food. They are the password.”', '“RULE 4. If the ladder is up you are out. If the ladder is down you are also out, but less.”', '“RULE 5. Dad may come up on his birthday. He has to knock.”', '“RULE 6. Whoever reads this is in charge now. We have gone to the lake. We will be back for tea.”'] },

  { id: 'icehouse', at: 'ld-icehouse', name: 'Down the ice house', verb: 'Open the door all the way', door: 'ice', bg: '#16222c', edge: ['#16222c', '#4e6a7a'], say: 'A deep round room, straw on the floor, and cold you can lean on. There is an old cold box behind a block of ice. Whatever goes in tonight comes out fresh tomorrow, with a little thank you.', how: 'Push the block with the arrows. It only stops when it hits something. Get it onto the straw to free the cold box.',
    art: GRM_ART.icehouse, floor: { x0: 80, x1: 880, y0: 404, y1: 586 }, spawn: { x: 190, y: 500 },
    play: 'iceKeep', tip: 'Open the cold box', gift: { ticket: 1, 'mat:stone': 1 }, emptyLine: 'You have nothing to put in. Bring something you have picked.', guestLine: 'It is your friend’s cold box.', leftLine: 'You leave some {crop} in the cold. Come back tomorrow.', waitLine: 'It has not had a night yet. Tomorrow.', gotLine: 'Your {crop}, cold and perfect, and a chip of field stone and a ticket that you did not put in. Nobody knows.', doneLine: 'The box wants a rest. Bring something else tomorrow.',
    ice: { x0: 352, y0: 402, cw: 88, ch: 40 },
    box: { x: 480, y: 392, art: (full) => { const A = _GRM_Q; return A.r(-76, -80, 152, 80, '#6e8e9c', null, 4) + A.r(-80, -92, 160, 14, full ? '#a8c4d0' : '#3f5a66', null, 3) + A.s('M-60 -44H60M-60 -24H60', '#4a6470', 3) + (full ? A.c(0, -60, 7, '#fff4b8', 0.95) : ''); } } },

  { id: 'hothouse', furnish: true, at: 'ld-statue', name: 'The old hothouse', verb: 'Follow his stare, round the back', door: 'glass', bg: '#2e2a1e', edge: ['#e0f4d8', '#2e2a1e'], say: 'He has been glaring at it for years, and this is why: a whole glasshouse the greenhouse was built to replace. Still warm. It is always summer in here, and things live here that live nowhere else.', how: 'Click a bug and you creep up on it with your net, as outside. Run at it and it is gone.',
    art: GRM_ART.hothouse, floor: { x0: 44, x1: 916, y0: 404, y1: 586 },
    play: 'net', bugRoom: 'hothouse', tip: 'Net this one', kinds: ['jewel-beetle', 'orchid-hopper', 'old-vine-bee'], perch: [{ x: 300, y: 450 }, { x: 560, y: 480 }, { x: 800, y: 440 }], gift: { ticket: 2, 'mat:reed': 1 }, gotLine: 'A good one. There is reed cut for the taking along the pipes.', goneLine: 'That is everyone for today. There will be others in the morning.' },

  { id: 'capfloor', at: 'lf-windmill', name: 'Up in the windmill’s cap', verb: 'Climb up to the wheel', door: 'cap', bg: '#1a1006', edge: ['#2a1c0e', '#403020'], say: 'The great wheel turns in the dark, tooth by tooth. The brake is the old way of doing it: catch the mark as it comes under the pointer, three times running, and the stones grind true.', how: 'Pull the brake when the gold tooth comes under the gold pointer. Three times running.',
    art: GRM_ART.capfloor, floor: { x0: 44, x1: 916, y0: 404, y1: 576 },
    play: 'catchIt', tip: 'Pull the brake', gift: { 'mat:timber': 2, ticket: 1 }, gotLine: 'Three clean stops, and the whole mill settles to its work. A spare cog-tooth of good timber drops at your feet, and there is a ticket in the flour.', missLine: 'Too late, or too soon. The wheel goes on as if nothing happened. Start again.', doneLine: 'Grinding nicely now. It will have drifted by tomorrow.',
    lever: { x: 650, y: 392, art: (hits) => { const A = _GRM_Q; return A.r(-22, -14, 44, 14, '#3a2a18') + A.s('M0 -14L-20 -120', '#7a5634', 10) + A.c(-20, -124, 11, '#c8483a') + [0, 1, 2].map(i => A.c(24, -30 - i * 22, 7, i < hits ? '#ffd86a' : '#2a1a0c')).join(''); } },
    wheel: { x: 320, y: 240, art: (goal) => { const A = _GRM_Q; let t = ''; for (let i = 0; i < 16; i++) t += `<rect x="-11" y="-152" width="22" height="24" fill="#5a3e22" transform="rotate(${i * 22.5})"/>`; return A.s('M0 -168V-138', '#ffd86a', 7) + `<g transform="rotate(${(goal * 180 / Math.PI * -1).toFixed(1)})"><g class="grm-turn">${t}${A.c(0, 0, 134, '#7a5634')}${A.c(0, 0, 112, '#4e3620')}${A.s('M-112 0H112M0 -112V112M-80 -80L80 80M-80 80L80 -80', '#7a5634', 13)}${A.c(0, 0, 24, '#2e2010')}${A.p('M-12 -134h24v30h-24z', '#ffd86a')}</g></g>`; } } },
]);

/* ---------- Play, under Secrets: only what you have found, and never where the rest are ---------- */
function _grmFoundRows() { return GRM_ROOMS.filter(R => _grmG(R, 'f')); }
gardenPlayAdd({ id: 'rooms', name: 'Places you have been', icon: 'door-open', group: 'secret', verb: 'Look back', blurb: 'There is more to this land than the outside of it.', status: () => { const n = _grmFoundRows().length; return n ? `${n} found` : ''; },
  open() {
    gpStage('Places you have been', (el) => {
      const rows = _grmFoundRows();
      if (!rows.length) { el.appendChild(gpEl('p', 'muted', 'Nowhere yet. Go up to things, and try what they offer.')); return; }
      for (const R of rows) {
        const sight = gardenLandSight(R.at) || gardenLandFeature(R.at), d = gpEl('div', 'gp-row');
        d.appendChild(gpEl('b', null, R.name));
        d.appendChild(gpEl('div', 'muted', `${sight ? sight.name : ''}. ${_grmDone(R) ? 'Done for today: come back tomorrow.' : 'Something to do today.'} ${Number(_grmG(R, 'c', 0)) || 1} day${Number(_grmG(R, 'c', 0)) > 1 ? 's' : ''} here so far.`));
        el.appendChild(d);
      }
    });
  } });
