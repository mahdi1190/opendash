/* ============================================================
   YOUR OWN HOUSE, the room's picture (the Painted village's room style: 94-garden-native-roomart-0kit.js, matched to its hut and
   treehouse). One painter for every house, in room units (960 x 600), from what the house is: its look (thatch, stone, timber:
   from its home word), the finishes on its walls and floor (GARDEN_DECOR rows with `finish`), and the light outside (the time of
   day, the season and the weather: the window shows them). The same things always paint the same picture (the kit's random
   stream is seeded by the room), so a friend sees your room exactly as you do.

     houseShellSpec(P)   P = { look, wall, floor, tod, season, wx }  ->  a GRA_ROOMS painter { plate, ambient, lights, fx, *paint }
     houseShellKey(P)    the key the picture is baked under (GardenRoomArt keeps the last few, so walking back in is instant)

   Functions only: nothing runs at load (the kit's file loads after this one; the painter is registered when a room is entered).
   ============================================================ */
const HOUSE_TOD = Object.freeze(['dawn', 'day', 'dusk', 'night']);
/** The look of each look: the ceiling, the beams and the hearth's stone. */
const HOUSE_LOOK_PAL = Object.freeze({
  thatch: Object.freeze({ beam: '#3e2a1a', beamLit: '#6a4a30', ceil: '#d8c8a8', ceilDark: '#6a5640', hearth: '#b0a898', brick: '#8a4a32', door: '#6a4a2e', plate: '#2a1c12', skirt: '#4a3220' }),
  stone: Object.freeze({ beam: '#4a3a2c', beamLit: '#7a6450', ceil: '#e8e0d0', ceilDark: '#9a907c', hearth: '#c8beac', brick: '#7a4a3a', door: '#3a4a5a', plate: '#262420', skirt: '#3a3632' }),
  timber: Object.freeze({ beam: '#5a3c22', beamLit: '#8a6440', ceil: '#a8805a', ceilDark: '#5a3e26', hearth: '#9a6a4a', brick: '#8a5a3a', door: '#5a6a4a', plate: '#24180e', skirt: '#4a3018' }),
});
/** Wall finishes: each paints the back wall's band (x0..x1, y0..y1). */
const HOUSE_WALLS = Object.freeze({
  'hfw-limewash': (T, b) => { T.plaster(b.x0, b.y0, b.x1, b.y1, '#ece2cc', { var: .14, damp: 46 }); for (const [x, y] of [[132, 210], [868, 232]]) { let d = `M${x} ${y}`, px = x, py = y; for (let k = 0; k < 5; k++) { px += T.rnd(-8, 8); py += T.rnd(6, 12); d += `L${px} ${py}`; } T.stroke(d, '#8a7a60', .8, .3); } },
  'hfw-rose-sprig': (T, b) => {
    T.plaster(b.x0, b.y0, b.x1, b.y1, '#f2e6d2', { var: .06 });
    for (let x = b.x0; x < b.x1; x += 80) T.rect(x, b.y0, 1.2, b.y1 - b.y0, '#c8b496', .35);   // the paper's seams
    for (let row = 0, y = b.y0 + 14; y < b.y1; y += 34, row++) for (let x = b.x0 + (row % 2) * 20; x < b.x1; x += 40) {
      const rx = x + T.rnd(-2, 2), ry = y + T.rnd(-2, 2);
      T.stroke(`M${rx} ${ry + 7}q2 -6 1 -11`, '#7a9a5a', 1.2, .8); T.ell(rx - 3, ry + 1, 3.2, 1.6, '#8aaa6a', .8, -.6); T.ell(rx + 3.5, ry - 1, 3, 1.5, '#8aaa6a', .8, .6);
      T.ell(rx + 1, ry - 4.5, 3.4, 3.2, '#d8687a'); T.ell(rx + .4, ry - 5.2, 1.6, 1.4, '#f4a0ac'); T.ell(rx + 1.6, ry - 4, .9, .9, '#a83a4a', .7);
    }
  },
  'hfw-sage-stripe': (T, b) => {
    T.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, '#e8ecd8');
    for (let x = b.x0; x < b.x1; x += 48) { T.rect(x, b.y0, 22, b.y1 - b.y0, '#b4c49c'); T.rect(x + 22, b.y0, 2, b.y1 - b.y0, '#8a9e74', .5); T.rect(x + 33, b.y0, 1.5, b.y1 - b.y0, '#b4c49c', .8); }
    for (let i = 0; i < 40; i++) T.blob(T.rnd(b.x0, b.x1), T.rnd(b.y0, b.y1), T.rnd(30, 70), T.rnd(16, 34), T.r() < .5 ? '#ffffff' : '#3a4a2a', .04, 8, .5);
  },
  'hfw-matchboard': (T, b) => {
    T.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, '#9ab8b4');
    for (let x = b.x0; x < b.x1; x += 15) { T.rect(x, b.y0, 15, b.y1 - b.y0, T.shade('#9ab8b4', (T.r() - .5) * .08)); T.rect(x + 13, b.y0, 2, b.y1 - b.y0, '#5e7a76', .55); T.rect(x + 1, b.y0, 1.5, b.y1 - b.y0, '#d8ecea', .4); }
    T.rect(b.x0, b.y0 + 90, b.x1 - b.x0, 7, '#7a9a96'); T.rect(b.x0, b.y0 + 90, b.x1 - b.x0, 2, '#d0e4e2', .7);   // the picture rail
  },
  'hfw-willow-tile': (T, b) => {
    T.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, '#d8dce0');
    for (let y = b.y0; y < b.y1; y += 30) for (let x = b.x0; x < b.x1; x += 30) {
      T.rrect(x + 1, y + 1, 28, 28, 2, T.shade('#f4f6f8', (T.r() - .5) * .06));
      const k = T.r(); T.stroke(`M${x + 6} ${y + 22}q8 -${4 + k * 6} 18 0`, '#3a64a8', 1.4, .8); T.ell(x + 15, y + 11, 4, 3, '#3a64a8', .55);
      if (k > .5) T.stroke(`M${x + 9} ${y + 8}l12 0`, '#5a84c0', 1, .6); else T.ell(x + 22, y + 8, 2, 2, '#5a84c0', .6);
      T.rect(x + 3, y + 3, 10, 2, '#ffffff', .5);
    }
  },
  'hfw-night-stars': (T, b) => {
    T.rect(b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, T.lin(0, b.y0, 0, b.y1, [[0, '#1e2e58'], [1, '#2c4478']]));
    for (let i = 0; i < 160; i++) { const x = T.rnd(b.x0, b.x1), y = T.rnd(b.y0, b.y1), k = T.r(); if (k > .86) { const s = 3 + T.r() * 3; T.poly([[x, y - s], [x + s * .3, y - s * .3], [x + s, y], [x + s * .3, y + s * .3], [x, y + s], [x - s * .3, y + s * .3], [x - s, y], [x - s * .3, y - s * .3]], '#f4d878', .9); } else T.ell(x, y, .9 + k, .9 + k, '#f4e8b0', .5 + k * .4); }
    for (let x = b.x0; x < b.x1; x += 80) T.rect(x, b.y0, 1.2, b.y1 - b.y0, '#0e1a38', .4);
  },
});
/** Floor finishes: each paints the floor from y0 (where it meets the wall) to y1, in perspective. */
const HOUSE_FLOORS = Object.freeze({
  'hff-boards': (T, y0, y1) => { T.rect(0, y0, 960, y1 - y0, '#7a5434'); T.floorBoards(y0, y1, { base: '#8a5e38', n: 15, spread: 2.5, wear: [420, 520, 300, 46] }); },
  'hff-flags': (T, y0, y1) => { T.flags(y0, y1, { base: '#a8a296', mortar: '#6a645a', h: 16, w: 150, var: .2 }); },
  'hff-red-tiles': (T, y0, y1) => {
    T.rect(0, y0, 960, y1 - y0, '#5a2a1e');
    const cols = 16, at = (x, k) => 480 + (x - 480) * (1 / 2.4 + (1 - 1 / 2.4) * k); let y = y0, h = 11;
    while (y < y1) {
      const k0 = (y - y0) / (y1 - y0), k1 = Math.min(1, (y + h - y0) / (y1 - y0));
      for (let c = -3; c < cols + 3; c++) { const xa = c / cols * 960, xb = (c + 1) / cols * 960, col = T.shade('#b8583a', (T.r() - .5) * .24); T.poly([[at(xa, k0) + 1, y + 1], [at(xb, k0) - 1, y + 1], [at(xb, k1) - 1.4, y + h - 1], [at(xa, k1) + 1.4, y + h - 1]], col); T.poly([[at(xa, k0) + 2, y + 1.5], [at(xb, k0) - 2, y + 1.5], [at(xb, k0) - 2, y + 1.5 + h * .14], [at(xa, k0) + 2, y + 1.5 + h * .14]], T.shade(col, .28), .45); }
      y += h; h *= 1.18;
    }
    T.rect(0, y0, 960, y1 - y0, T.lin(0, y0, 0, y1, [[0, '#000', .32], [.4, '#000', .08], [1, '#000', .12]]));
    T.soft(470, 520, 260, 40, .12, '#fff0e0');
  },
  'hff-rush-matting': (T, y0, y1) => {
    T.rect(0, y0, 960, y1 - y0, '#b89a62');
    let y = y0, h = 9, row = 0;
    while (y < y1) { const c = T.shade('#c8ac72', (row % 2 ? .06 : -.06) + (T.r() - .5) * .06); T.rect(0, y, 960, h, c); for (let x = (row % 2) * 7; x < 960; x += 14) T.stroke(`M${x} ${y + 1}l7 ${h - 2}`, T.shade(c, -.3), .9, .45); T.rect(0, y + h - 1, 960, 1, T.shade(c, -.35), .5); y += h; h *= 1.1; row++; }
    for (let x = 0; x < 960; x += 120) T.stroke(`M${480 + (x - 480) / 2.6} ${y0}L${x} ${y1}`, '#8a6e40', 1.4, .35);
    T.rect(0, y0, 960, y1 - y0, T.lin(0, y0, 0, y1, [[0, '#000', .3], [.35, '#000', .06], [1, '#000', .1]]));
  },
  'hff-chequer': (T, y0, y1) => {
    T.rect(0, y0, 960, y1 - y0, '#20242c');
    const rows = 9, cols = 14; let y = y0, h = 12;
    for (let r = 0; r < rows && y < y1; r++) {
      const k0 = (y - y0) / (y1 - y0), k1 = Math.min(1, (y + h - y0) / (y1 - y0));
      for (let c = -2; c < cols + 2; c++) {
        const xa = c / cols * 960, xb = (c + 1) / cols * 960, at = (x, k) => 480 + (x - 480) * (1 / 2.4 + (1 - 1 / 2.4) * k);
        T.poly([[at(xa, k0), y], [at(xb, k0), y], [at(xb, k1), y + h], [at(xa, k1), y + h]], (r + c) % 2 ? T.shade('#2e3440', (T.r() - .5) * .1) : T.shade('#efe9de', (T.r() - .5) * .06));
      }
      y += h; h *= 1.2;
    }
    T.rect(0, y0, 960, y1 - y0, T.lin(0, y0, 0, y1, [[0, '#000', .3], [.4, '#000', .06], [1, '#000', .12]]));
    T.soft(480, 520, 300, 46, .1, '#ffffff');
  },
});
/** The light outside, by the time of day: the sky's two colours, the light it throws in, how bright the room is. */
const HOUSE_SKY = Object.freeze({
  dawn: Object.freeze({ top: '#c8a8c8', low: '#f8d8b0', sun: '#ffe0a8', shaft: '#ffe0c0', shaftA: .12, amb: .76, win: .18 }),
  day: Object.freeze({ top: '#8ec0e4', low: '#dcecf0', sun: '#fffbe8', shaft: '#f4f8ff', shaftA: .16, amb: .88, win: .28 }),
  dusk: Object.freeze({ top: '#6a5a8a', low: '#f0a070', sun: '#ffb070', shaft: '#ffc890', shaftA: .1, amb: .68, win: .14 }),
  night: Object.freeze({ top: '#0c1630', low: '#22345a', sun: '#c8d8ff', shaft: '#a8b8e8', shaftA: .035, amb: .52, win: .05 }),
});
function houseShellKey(P) { return ['hs', P.look, P.wall, P.floor, P.tod, P.season, P.wx || 0].join('|'); }

/* ---------- the parts ---------- */
function* _hsPaintCeiling(T, P, L) {
  const top = 150;
  // the ceiling seen from below: plaster (or boards) between beams running across the room, each nearer one bigger,
  // with short joists between them going back to the wall
  if (P.look === 'timber') { T.rect(0, 0, 960, top, L.ceilDark); for (let x = -20; x < 980; x += 26) { const c = T.shade(L.ceil, (T.r() - .5) * .2); T.rect(x, 0, 26, top, T.lin(0, 0, 0, top, [[0, T.shade(c, -.25)], [1, c]])); T.rect(x + 24, 0, 2, top, '#000', .3); } }
  else { T.rect(0, 0, 960, top, T.lin(0, 0, 0, top, [[0, T.shade(L.ceil, -.3)], [1, L.ceil]])); T.plaster(0, 0, 960, top, T.shade(L.ceil, -.08), { var: .14 }); }
  T.ell(724, 60, 280, 110, T.rad(724, 60, 280, [[0, L.ceilDark, .5], [1, L.ceilDark, 0]]));   // smoke over the years, darker over the fire
  const rows = P.look === 'stone' ? [[52, 26]] : [[106, 13], [64, 18], [10, 27]];
  let farY = top - 16;
  for (const [y, h] of rows) {
    if (P.look === 'thatch') T.rect(0, y + h, 960, Math.max(0, farY - y - h), T.lin(0, y + h, 0, farY, [[0, '#000', .16], [.3, '#000', 0], [1, '#000', .08]]));   // the plaster between the beams, in their shadow
    T.soft(480, y + h + 3, 520, 5, .35);
    T.rect(0, y, 960, h, T.lin(0, y, 0, y + h, [[0, T.shade(L.beam, -.35)], [.55, L.beam], [1, L.beamLit]])); T.grain(0, y, 960, h, '#120a04', .4, false, 4);
    T.rect(0, y + h - 2, 960, 2, '#fff0d0', .12);
    for (let x = 40 + (y % 3) * 30; x < 960; x += 180) { T.ell(x, y + h * .5, 2, 2, '#140c06', .55); T.stroke(`M${x + 30} ${y + h * .3}l40 ${h * .15}`, '#140c06', 1, .35); }
    farY = y;
  }
  yield;
  // the wall plate: the beam the ceiling rests on, along the top of the wall
  T.rect(0, top - 16, 960, 20, T.lin(0, top - 16, 0, top + 4, [[0, L.beamLit], [.35, L.beam], [1, T.shade(L.beam, -.45)]]));
  T.grain(0, top - 16, 960, 20, '#120a04', .45, false, 4);
  for (let x = 30; x < 960; x += 150) { T.ell(x, top - 6, 2.4, 2.4, '#140c06', .7); T.ell(x - .6, top - 6.6, .9, .9, L.beamLit, .6); }
  T.rect(0, top + 4, 960, 10, T.lin(0, top + 4, 0, top + 14, [[0, '#000', .32], [1, '#000', 0]]));
  if (P.look === 'thatch') {   // bunches of herbs drying from the beam, and a string of onions
    for (const [x, c, n] of [[178, '#6a8a4a', 7], [214, '#8a9a5a', 6], [846, '#7a7a3e', 6]]) {
      T.stroke(`M${x} ${top - 4}v12`, '#c8b088', 1.2, .9);
      for (let i = 0; i < n; i++) { const a = (i - n / 2) * .16, l = 22 + T.r() * 8; T.stroke(`M${x} ${top + 8}q${Math.sin(a) * 6} ${l * .5} ${Math.sin(a) * 9} ${l}`, T.shade(c, (T.r() - .5) * .4), 2.2, .95); T.ell(x + Math.sin(a) * 9, top + 8 + l, 2.4, 3.2, T.shade(c, -.2), .9); }
      T.rect(x - 3, top + 6, 6, 4, '#a87850');
    }
    T.stroke(`M884 ${top - 4}q6 40 2 70`, '#c8b088', 1.2, .9);
    for (let i = 0; i < 6; i++) { const y = top + 14 + i * 10, x = 886 + Math.sin(i * 1.7) * 3; T.ell(x, y, 6.5, 6, T.rad(x - 2, y - 2, 7, [[0, '#e8c08a'], [.7, '#b8783a'], [1, '#7a4a22']])); T.stroke(`M${x} ${y - 6}l0 -3`, '#8a6a3a', 1, .8); }
  }
}
function _hsPaintWall(T, P, L) {
  const b = { x0: 0, x1: 960, y0: 150, y1: 400 }, paint = HOUSE_WALLS[P.wall] || HOUSE_WALLS['hfw-limewash'];
  paint(T, b);
  // the room's corners fall into shadow; the light comes from the window and the fire
  T.rect(0, 150, 960, 250, T.lin(0, 0, 960, 0, [[0, '#0a0604', .42], [.16, '#0a0604', .08], [.5, '#0a0604', 0], [.86, '#0a0604', .06], [1, '#0a0604', .36]]));
  T.rect(0, 150, 960, 250, T.lin(0, 150, 0, 400, [[0, '#0a0604', .22], [.3, '#0a0604', 0], [1, '#0a0604', .12]]));
  if (P.look === 'timber') { for (const x of [150, 560, 900]) { T.rect(x - 9, 150, 18, 250, T.lin(x - 9, 0, x + 9, 0, [[0, L.beamLit], [.4, L.beam], [1, T.shade(L.beam, -.4)]])); T.grain(x - 9, 150, 18, 250, '#140a04', .45, true, 4); } }
  if (P.look === 'stone') { T.rect(0, 292, 960, 8, T.lin(0, 292, 0, 300, [[0, '#f4ece0'], [1, '#a89a84']])); T.rect(0, 300, 960, 3, '#000', .2); }   // the dado rail
}
function* _hsPaintWindow(T, P, L) {
  const W = HOUSE_SHELL.window, S = HOUSE_SKY[P.tod] || HOUSE_SKY.day, gx0 = W.x0 + 12, gx1 = W.x1 - 12, gy0 = W.y0 + 10, gy1 = W.y1 - 14;
  const season = P.season || 'summer', rain = P.wx === 1, snow = P.wx === 2;
  // the reveal: the wall is thick, and lit from outside
  T.soft((W.x0 + W.x1) / 2, W.y1 + 6, (W.x1 - W.x0) * .62, 10, .4);
  T.rect(W.x0, W.y0, W.x1 - W.x0, W.y1 - W.y0, T.shade(L.hearth, -.2));
  T.poly([[W.x0, W.y0], [gx0, gy0], [gx0, gy1], [W.x0, W.y1]], T.shade(L.hearth, .05));
  T.poly([[W.x1, W.y0], [gx1, gy0], [gx1, gy1], [W.x1, W.y1]], T.shade(L.hearth, -.35));
  T.poly([[W.x0, W.y0], [W.x1, W.y0], [gx1, gy0], [gx0, gy0]], T.shade(L.hearth, -.45));
  T.clipRect(gx0, gy0, gx1 - gx0, gy1 - gy0, () => {
    T.rect(gx0, gy0, gx1 - gx0, gy1 - gy0, T.lin(0, gy0, 0, gy1, [[0, rain ? T.mix(S.top, '#8a949c', .6) : S.top], [1, rain ? T.mix(S.low, '#b8c0c4', .6) : S.low]]));
    if (P.tod === 'night') { for (let i = 0; i < 26; i++) T.ell(T.rnd(gx0, gx1), T.rnd(gy0, gy0 + 60), .8 + T.r() * .9, .8 + T.r() * .9, '#fff8e0', .5 + T.r() * .5); if (!rain) { T.ell(gx1 - 34, gy0 + 22, 9, 9, '#f8f4e0'); T.glow(gx1 - 34, gy0 + 22, 30, '#c8d8ff', .3); } }
    else if (!rain) { T.glow(gx0 + 40, gy0 + 20, 60, S.sun, .5); T.blob(gx1 - 40, gy0 + 22, 26, 7, '#ffffff', P.tod === 'dusk' ? .45 : .8); T.blob(gx0 + 30, gy0 + 34, 18, 5, '#ffffff', .6); }
    else for (let i = 0; i < 5; i++) T.blob(T.rnd(gx0, gx1), T.rnd(gy0, gy0 + 40), T.rnd(30, 50), T.rnd(10, 16), '#9aa4ac', .7);
    // the hills, then the garden outside the window
    const hills = { spring: ['#7aa860', '#5a9048'], summer: ['#6a9a4e', '#4a823a'], autumn: ['#a89a4e', '#8a7a3a'], winter: ['#b8c4cc', '#9aa8b4'] }[season] || ['#6a9a4e', '#4a823a'];
    const dim = P.tod === 'night' ? -.62 : P.tod === 'dusk' ? -.25 : P.tod === 'dawn' ? -.12 : 0;
    T.fill(`M${gx0} ${gy0 + 66}Q${gx0 + 40} ${gy0 + 46} ${gx0 + 90} ${gy0 + 60}T${gx1} ${gy0 + 52}V${gy1}H${gx0}Z`, T.shade(hills[0], dim - .05));
    T.fill(`M${gx0} ${gy0 + 82}Q${gx0 + 60} ${gy0 + 66} ${gx0 + 110} ${gy0 + 80}T${gx1} ${gy0 + 74}V${gy1}H${gx0}Z`, T.shade(hills[1], dim));
    if (season === 'winter' || snow) { T.fill(`M${gx0} ${gy0 + 66}Q${gx0 + 40} ${gy0 + 46} ${gx0 + 90} ${gy0 + 60}T${gx1} ${gy0 + 52}V${gy0 + 60}Q${gx0 + 90} ${gy0 + 66} ${gx0} ${gy0 + 72}Z`, '#ffffff', P.tod === 'night' ? .3 : .75); }
    // the hedge and the flowers under the window
    const hedge = { spring: '#4a8a3a', summer: '#3f7a32', autumn: '#7a7030', winter: '#5a6650' }[season] || '#3f7a32';
    for (let i = 0; i < 10; i++) T.blob(gx0 + i * 17, gy1 - 6, 14, 10, T.shade(hedge, dim + (T.r() - .5) * .2), 1, 8, .4);
    const fl = { spring: ['#f4d8e0', '#fff4f4', '#f8e070'], summer: ['#e84a5a', '#f4c040', '#c870d8', '#ffffff'], autumn: ['#e8803a', '#c84a2a', '#f4b040'], winter: [] }[season] || [];
    for (let i = 0; i < (fl.length ? 18 : 0); i++) T.ell(T.rnd(gx0, gx1), T.rnd(gy1 - 16, gy1 - 4), 2, 2, T.shade(fl[i % fl.length], dim * .8), .95);
    if (season === 'winter') for (let i = 0; i < 10; i++) T.blob(gx0 + i * 17, gy1 - 12, 9, 3, '#ffffff', P.tod === 'night' ? .35 : .85, 7, .4);
    // a branch across the top corner, in the season's leaf
    T.stroke(`M${gx1 + 4} ${gy0 + 8}Q${gx1 - 40} ${gy0 + 16} ${gx1 - 70} ${gy0 + 4}`, T.shade('#4a3826', dim), 3.5);
    const leaf = { spring: '#f4c8d4', summer: '#5a9a44', autumn: '#d88a2a', winter: '' }[season];
    if (leaf) for (let i = 0; i < 14; i++) { const t = i / 13, x = gx1 + 4 - t * 74, y = gy0 + 8 + Math.sin(t * 3) * 6; T.ell(x + T.rnd(-4, 4), y + T.rnd(-3, 6), 4, 2.6, T.shade(leaf, dim + (T.r() - .5) * .2), .95, T.rnd(-1, 1)); }
    if (snow) for (let i = 0; i < 40; i++) T.ell(T.rnd(gx0, gx1), T.rnd(gy0, gy1), 1.2, 1.2, '#ffffff', .8);
    if (rain) for (let i = 0; i < 30; i++) { const x = T.rnd(gx0, gx1), y = T.rnd(gy0, gy1); T.stroke(`M${x} ${y}l-2 8`, '#e8f0f4', .8, .5); }
    if (P.tod === 'night') T.rect(gx0, gy0, gx1 - gx0, gy1 - gy0, '#0a1430', .35);
    // the glass: a sheen, and the old panes' ripples
    T.rect(gx0, gy0, gx1 - gx0, gy1 - gy0, T.lin(gx0, gy0, gx1, gy1, [[0, '#ffffff', P.tod === 'night' ? .04 : .2], [.35, '#ffffff', 0], [.7, '#ffffff', .05], [1, '#ffffff', 0]]));
  });
  yield;
  // the frame and the glazing bars: leaded diamonds in the thatched cottage, six panes in the stone house, four in the timber one
  const frame = P.look === 'stone' ? '#f0ebe2' : P.look === 'timber' ? '#6a7a5a' : '#5a3e26', frameSh = T.shade(frame, -.35);
  if (P.look === 'thatch') {
    T.clipRect(gx0, gy0, gx1 - gx0, gy1 - gy0, () => { for (let k = -12; k < 16; k++) { T.stroke(`M${gx0 + k * 16} ${gy0}l${(gy1 - gy0) * .55} ${gy1 - gy0}`, '#3a3a40', 1.3, .75); T.stroke(`M${gx0 + k * 16} ${gy1}l${(gy1 - gy0) * .55} ${-(gy1 - gy0)}`, '#3a3a40', 1.3, .75); } });
    T.stroke(`M${(gx0 + gx1) / 2} ${gy0}V${gy1}`, frame, 7); T.stroke(`M${(gx0 + gx1) / 2 + 2} ${gy0}V${gy1}`, frameSh, 2, .7);
  } else {
    const cols = P.look === 'stone' ? 3 : 2, rows = 2;
    for (let i = 1; i < cols; i++) { const x = gx0 + (gx1 - gx0) * i / cols; T.stroke(`M${x} ${gy0}V${gy1}`, frame, 4); T.stroke(`M${x + 1.5} ${gy0}V${gy1}`, frameSh, 1.2, .7); }
    for (let j = 1; j < rows; j++) { const y = gy0 + (gy1 - gy0) * j / rows; T.stroke(`M${gx0} ${y}H${gx1}`, frame, P.look === 'stone' ? 6 : 4); T.stroke(`M${gx0} ${y + 2}H${gx1}`, frameSh, 1.2, .7); }
  }
  T.rect(gx0 - 6, gy0 - 6, gx1 - gx0 + 12, 6, frame); T.rect(gx0 - 6, gy1, gx1 - gx0 + 12, 4, frameSh); T.rect(gx0 - 6, gy0, 6, gy1 - gy0, frame); T.rect(gx1, gy0, 6, gy1 - gy0, frameSh);
  // the sill, deep enough for a pot, worn at the front edge
  T.soft((W.x0 + W.x1) / 2, W.y1 + 3, (W.x1 - W.x0) * .58, 7, .5);
  T.rect(W.x0 - 10, W.y1 - 14, W.x1 - W.x0 + 20, 14, T.lin(0, W.y1 - 14, 0, W.y1, [[0, T.shade(frame === '#f0ebe2' ? '#e8e0d0' : '#8a6a44', .15)], [1, T.shade(frame === '#f0ebe2' ? '#c8bca8' : '#6a4a2c', -.1)]]));
  T.rect(W.x0 - 10, W.y1 - 14, W.x1 - W.x0 + 20, 2.5, '#ffffff', .35);
  // curtains on a pole, tied back
  const cur = P.look === 'stone' ? '#8a4a5a' : P.look === 'timber' ? '#4a6a8a' : '#a85a3a';
  T.rect(W.x0 - 30, W.y0 - 18, W.x1 - W.x0 + 60, 5, '#3a2818'); T.ell(W.x0 - 32, W.y0 - 15.5, 5, 5, '#6a4a2a'); T.ell(W.x1 + 32, W.y0 - 15.5, 5, 5, '#6a4a2a');
  for (const [x0, dir] of [[W.x0 - 30, 1], [W.x1 + 30, -1]]) {
    const w = 46, x = dir > 0 ? x0 : x0 - w, h = W.y1 - W.y0 + 34;
    T.cloth(x, W.y0 - 14, w, h, cur, { folds: 4, flare: 4, hem: 8 });
    T.fill(`M${x + (dir > 0 ? w : 0)} ${W.y0 + 64}q${-dir * 12} 8 ${-dir * 4} 18q${dir * 10} 2 ${dir * 6} -16z`, T.shade(cur, -.3));
    T.rect(x, W.y0 + 70, w, 5, '#e8c878', .8);
    for (let i = 0; i < 5; i++) T.ell(x + 6 + i * 9, W.y0 + 20 + (i % 2) * 40, 3, 3, T.shade(cur, .3), .45);   // a small woven pattern
  }
  // the light the window throws: a pale beam on to the floor (by day), the wall lit round it
  if (S.shaftA > .05) { T.shaft([[gx0 + 6, gy1 + 2], [gx1 - 6, gy1 + 2], [gx1 + 190, 600], [gx0 + 60, 600]], S.shaft, S.shaftA * .8, gy1, 600); T.ell((gx0 + gx1) / 2 + 110, 520, 150, 34, T.rad((gx0 + gx1) / 2 + 110, 520, 150, [[0, S.shaft, S.shaftA * 1.2], [1, S.shaft, 0]])); }
}
function* _hsPaintHearth(T, P, L) {
  const H = HOUSE_SHELL.hearth, F = HOUSE_SHELL.fire, cxm = (H.x0 + H.x1) / 2, night = P.tod === 'night' || P.tod === 'dusk';
  // the chimney breast stands out from the wall: its face, and its sides in shadow
  T.soft(cxm, 404, (H.x1 - H.x0) * .62, 12, .5);
  const face = P.look === 'stone' ? null : P.look === 'timber' ? L.brick : L.hearth;
  if (face) {
    if (P.look === 'thatch') T.plaster(H.x0, H.y0, H.x1, H.y1, T.shade(L.hearth, .05), { var: .2, cracks: 3 });
    else T.bricks(H.x0, H.y0, H.x1, H.y1, { base: L.brick, mortar: '#b8a088', h: 15, w: 36 });
  } else T.plaster(H.x0, H.y0, H.x1, H.y1, '#e4dccc', { var: .1 });
  T.rect(H.x0 - 10, H.y0, 12, H.y1 - H.y0, T.lin(H.x0 - 10, 0, H.x0 + 2, 0, [[0, '#000', .05], [1, '#000', .3]]));
  T.rect(H.x1 - 2, H.y0, 14, H.y1 - H.y0, T.lin(H.x1 - 2, 0, H.x1 + 12, 0, [[0, '#000', .4], [1, '#000', .08]]));
  T.rect(H.x0, H.y0, H.x1 - H.x0, H.y1 - H.y0, T.lin(H.x0, 0, H.x1, 0, [[0, '#fff4e0', .08], [.6, '#000', 0], [1, '#000', .2]]));
  yield;
  // soot over the opening; the opening itself, deep and dark
  T.ell(cxm, F.y0 - 30, 110, 60, T.rad(cxm, F.y0 - 20, 110, [[0, '#1a1008', .45], [1, '#1a1008', 0]]));
  const ox0 = P.look === 'thatch' ? F.x0 - 18 : F.x0, ox1 = P.look === 'thatch' ? F.x1 + 18 : F.x1;
  T.rect(ox0, F.y0, ox1 - ox0, F.y1 - F.y0, '#140a06');
  T.bricks(ox0 + 10, F.y0 + 6, ox1 - 10, F.y1, { base: '#4a2418', mortar: '#2a1810', h: 12, w: 28, var: .4 });
  T.rect(ox0 + 10, F.y0 + 6, ox1 - ox0 - 20, F.y1 - F.y0 - 6, T.lin(0, F.y0, 0, F.y1, [[0, '#000', .75], [.6, '#000', .4], [1, '#2a0a00', .2]]));
  T.poly([[ox0, F.y0], [ox0 + 10, F.y0 + 6], [ox0 + 10, F.y1], [ox0, F.y1]], '#2a1810'); T.poly([[ox1, F.y0], [ox1 - 10, F.y0 + 6], [ox1 - 10, F.y1], [ox1, F.y1]], '#1a0e08');
  if (P.look === 'stone') {   // a black range: two oven doors, the fire in the middle, a brass rail
    T.rrect(F.x0 + 4, F.y0 + 14, F.x1 - F.x0 - 8, F.y1 - F.y0 - 14, 3, T.lin(F.x0, 0, F.x1, 0, [[0, '#2a2a2e'], [.5, '#3e3e44'], [1, '#1a1a1e']]));
    for (const ox of [F.x0 + 10, F.x1 - 46]) { T.rrect(ox, F.y0 + 34, 36, 50, 3, '#26262a'); T.rrect(ox + 3, F.y0 + 37, 30, 44, 2, '#323238'); T.ell(ox + 28, F.y0 + 58, 2.5, 2.5, '#d8b45a'); }
    const fx0 = F.x0 + 52, fx1 = F.x1 - 52; T.rect(fx0, F.y0 + 40, fx1 - fx0, 40, '#0a0604'); for (let i = 0; i < 5; i++) T.rect(fx0, F.y0 + 44 + i * 8, fx1 - fx0, 2, '#3a3a40');
    for (let i = 0; i < 7; i++) T.ell(T.rnd(fx0 + 4, fx1 - 4), T.rnd(F.y0 + 60, F.y0 + 76), 5, 3, T.pick(['#ff8a3a', '#ffc860', '#d84a1a']), .9);
    T.glow((fx0 + fx1) / 2, F.y0 + 64, 40, '#ff9a4a', .5);
    T.rect(F.x0 - 2, F.y0 + 12, F.x1 - F.x0 + 4, 4, T.lin(0, F.y0 + 12, 0, F.y0 + 16, [[0, '#f4d88a'], [1, '#a87a2a']]));
    T.rect(F.x0, F.y1 - 8, F.x1 - F.x0, 8, '#1a1a1e');
  } else if (P.look === 'timber') {   // a pot-bellied stove in its alcove, its pipe up through the ceiling
    const sx = (F.x0 + F.x1) / 2, sy = F.y1 - 6;
    T.rect(sx - 6, 0, 12, sy - 74, T.lin(sx - 6, 0, sx + 6, 0, [[0, '#4a4a50'], [.4, '#2a2a2e'], [1, '#101012']]));
    for (const y of [60, 190]) T.rect(sx - 8, y, 16, 5, '#3a3a40');
    T.soft(sx, sy + 2, 40, 6, .6);
    for (const dx of [-24, 24]) T.rect(sx + dx - 3, sy - 10, 6, 12, '#141416');
    T.ell(sx, sy - 40, 34, 36, T.lin(sx - 34, 0, sx + 34, 0, [[0, '#5a5a62'], [.25, '#2e2e34'], [.7, '#18181c'], [1, '#08080a']]));
    T.ell(sx - 14, sy - 52, 6, 14, '#8a8a94', .35);
    T.rrect(sx - 24, sy - 80, 48, 12, 3, T.lin(0, sy - 80, 0, sy - 68, [[0, '#4a4a52'], [1, '#1a1a1e']])); T.rect(sx - 20, sy - 84, 40, 5, '#2a2a30');
    T.rrect(sx - 13, sy - 52, 26, 20, 3, '#0a0604'); T.rrect(sx - 11, sy - 50, 22, 16, 2, T.rad(sx, sy - 42, 16, [[0, '#ffe8a0'], [.5, '#ff8a3a'], [1, '#7a1a08']]));
    for (let i = 1; i < 4; i++) T.rect(sx - 11 + i * 5.5, sy - 50, 1.4, 16, '#1a0a04', .8);
    T.glow(sx, sy - 40, 26, '#ff9a4a', .35);
  } else {   // the inglenook: logs on firedogs, the flames, a kettle hanging from the crane
    const fx = (F.x0 + F.x1) / 2, fy = F.y1 - 8;
    for (const dx of [-42, 42]) { T.rect(fx + dx - 3, fy - 22, 6, 22, '#2a2a2e'); T.ell(fx + dx, fy - 24, 5, 5, '#3a3a40'); }
    T.soft(fx, fy + 2, 70, 6, .6);
    for (const [x, y, w, r] of [[fx - 6, fy - 12, 74, -.08], [fx + 8, fy - 20, 66, .12], [fx - 2, fy - 28, 56, -.04]]) { const cx = T.cx; cx.save(); cx.translate(x, y); cx.rotate(r); T.rrect(-w / 2, -7, w, 14, 6, T.lin(0, -7, 0, 7, [[0, '#8a5a32'], [.5, '#5a3a20'], [1, '#2a1a0e']])); T.ell(w / 2 - 2, 0, 5, 7, '#c8a070'); T.ell(w / 2 - 2, 0, 2.6, 4, '#8a6040'); cx.restore(); }
    T.glow(fx, fy - 30, 70, '#ff9a3a', .55); for (const [x, k] of [[fx - 20, 1.4], [fx + 4, 2], [fx + 26, 1.2]]) T.flame(x, fy - 26, k);
    T.ell(fx, fy - 4, 46, 6, '#ff8a2a', .5);
    // the crane and the kettle
    T.stroke(`M${F.x0 - 6} ${F.y0 + 4}V${F.y0 + 40}H${fx + 20}`, '#26262a', 3.5); T.stroke(`M${fx + 20} ${F.y0 + 40}v10`, '#3a3a40', 2);
    T.ell(fx + 20, F.y0 + 64, 15, 12, T.lin(fx + 5, 0, fx + 35, 0, [[0, '#3a3a40'], [.4, '#6a6a70'], [1, '#1a1a1e']])); T.stroke(`M${fx + 8} ${F.y0 + 54}q12 -10 24 0`, '#26262a', 2); T.stroke(`M${fx + 33} ${F.y0 + 60}l9 -5`, '#3a3a40', 3);
  }
  yield;
  // the beam or mantel over the fire, the hearthstone in front
  if (P.look === 'thatch') {
    T.soft(cxm, F.y0 + 4, 120, 8, .5); T.rect(ox0 - 16, F.y0 - 26, ox1 - ox0 + 32, 28, T.lin(0, F.y0 - 26, 0, F.y0 + 2, [[0, L.beamLit], [.3, L.beam], [1, T.shade(L.beam, -.45)]])); T.grain(ox0 - 16, F.y0 - 26, ox1 - ox0 + 32, 28, '#120a04', .5, false, 4);
    T.stroke(`M${ox0 + 20} ${F.y0 - 14}l26 -2M${ox1 - 60} ${F.y0 - 8}l18 1`, '#1a0e06', 1.4, .6);   // old cuts in the beam
  }
  const my = P.look === 'thatch' ? F.y0 - 40 : F.y0 - 14;
  T.soft(cxm, my + 12, 130, 6, .45);
  T.rect(H.x0 + 14, my, H.x1 - H.x0 - 28, 12, T.lin(0, my, 0, my + 12, [[0, P.look === 'stone' ? '#f4ece0' : L.beamLit], [1, P.look === 'stone' ? '#b8ac98' : L.beam]]));
  T.rect(H.x0 + 14, my, H.x1 - H.x0 - 28, 2, '#ffffff', .3);
  // the warm light of the fire on the breast and on the floor in front of it (a stove keeps its light behind its little door)
  if (P.look !== 'timber') T.glow((F.x0 + F.x1) / 2, F.y1 - 20, night ? 260 : 190, '#ff9a4a', night ? .32 : .2);
}
function _hsPaintDoor(T, P, L) {
  const D = HOUSE_SHELL.door, w = D.x1 - D.x0, h = D.y1 - D.y0, col = L.door;
  T.soft((D.x0 + D.x1) / 2, D.y1 + 4, w * .7, 8, .5);
  // the frame and lintel, set deep in the wall
  T.rect(D.x0 - 10, D.y0 - 14, w + 20, h + 14, T.shade(L.hearth, -.25));
  T.rect(D.x0 - 14, D.y0 - 20, w + 28, 12, T.lin(0, D.y0 - 20, 0, D.y0 - 8, [[0, L.beamLit], [1, L.beam]])); T.grain(D.x0 - 14, D.y0 - 20, w + 28, 12, '#120a04', .4, false, 4);
  T.rect(D.x0 - 4, D.y0 - 6, w + 8, h + 6, '#120c08');
  if (P.look === 'stone') {   // a panelled door with a fanlight
    T.rect(D.x0, D.y0, w, h, T.lin(D.x0, 0, D.x1, 0, [[0, T.shade(col, .15)], [1, T.shade(col, -.3)]]));
    T.rect(D.x0 + 6, D.y0 + 4, w - 12, 16, '#c8d8e0'); T.stroke(`M${D.x0 + w / 2} ${D.y0 + 4}v16`, col, 2);
    for (const [px, py, pw, ph] of [[8, 26, 34, 34], [w - 42, 26, 34, 34], [8, 66, 34, 46], [w - 42, 66, 34, 46]]) { T.rect(D.x0 + px, D.y0 + py, pw, ph, T.shade(col, -.2)); T.rect(D.x0 + px, D.y0 + py, pw, 2, '#ffffff', .15); }
  } else {   // a ledged plank door, a latch, the day's light under it
    T.planksV(D.x0, D.y0, D.x1, D.y1, { base: col, w: 18, wMax: 24, var: .14, gap: .5, grainA: .4 });
    for (const y of [D.y0 + 16, D.y1 - 28]) { T.rect(D.x0 + 2, y, w - 4, 9, T.shade(col, -.25)); T.rect(D.x0 + 2, y, w - 4, 2, T.shade(col, .2), .6); }
    T.stroke(`M${D.x0 + 6} ${D.y1 - 28}L${D.x1 - 6} ${D.y0 + 26}`, T.shade(col, -.3), 7, .9);
  }
  T.ell(D.x1 - 14, D.y0 + h * .52, 4, 4, '#2a2a2e'); T.stroke(`M${D.x1 - 30} ${D.y0 + h * .52}h16`, '#2a2a2e', 3.2); T.ell(D.x1 - 14.6, D.y0 + h * .52 - .8, 1.4, 1.4, '#8a8a90', .8);
  const S = HOUSE_SKY[P.tod] || HOUSE_SKY.day; T.rect(D.x0 + 2, D.y1 - 3, w - 4, 3, S.low, P.tod === 'night' ? .25 : .7);
  // a coat on a peg beside the door
  T.ell(D.x1 + 34, D.y0 + 18, 3, 3, '#3a2818');
  T.fill(`M${D.x1 + 22} ${D.y0 + 24}Q${D.x1 + 34} ${D.y0 + 14} ${D.x1 + 46} ${D.y0 + 24}L${D.x1 + 50} ${D.y0 + 96}Q${D.x1 + 34} ${D.y0 + 104} ${D.x1 + 18} ${D.y0 + 96}Z`, T.lin(D.x1 + 18, 0, D.x1 + 50, 0, [[0, '#5a6a4a'], [.5, '#4a5a3c'], [1, '#2a3422']]));
  T.stroke(`M${D.x1 + 34} ${D.y0 + 22}V${D.y0 + 100}`, '#2a3422', 1.5, .8); T.soft(D.x1 + 36, D.y0 + 104, 20, 4, .25);
}
function _hsPaintFloor(T, P, L) {
  const paint = HOUSE_FLOORS[P.floor] || HOUSE_FLOORS['hff-boards'];
  paint(T, 400, 600);
  T.skirt(402, .5);
  // the skirting board along the foot of the wall
  T.rect(0, 388, 960, 13, T.lin(0, 388, 0, 401, [[0, T.shade(L.skirt, .25)], [1, L.skirt]])); T.rect(0, 388, 960, 2, '#ffffff', .18);
  const H = HOUSE_SHELL.hearth, F = HOUSE_SHELL.fire;
  // the hearthstone: big flags in front of the fire, scorched near it
  T.poly([[H.x0 + 8, 400], [H.x1 - 8, 400], [H.x1 + 6, 446], [H.x0 - 6, 446]], '#6a645a');
  for (let i = 0; i < 5; i++) { const a = H.x0 + 8 + (H.x1 - H.x0 - 16) * i / 5, b = H.x0 + 8 + (H.x1 - H.x0 - 16) * (i + 1) / 5, c = T.shade('#9a948a', (T.r() - .5) * .2); T.poly([[a + 2, 402], [b - 2, 402], [b + (b - 480) * .03 - 2, 444], [a + (a - 480) * .03 + 2, 444]], c); T.rect(a + 4, 403, b - a - 8, 2, '#ffffff', .2); }
  T.ell((F.x0 + F.x1) / 2, 408, 70, 10, '#1a1008', .45);
  T.rect(H.x0 - 6, 444, H.x1 - H.x0 + 12, 4, '#3a342c', .7);
  // a doormat inside the front door
  const D = HOUSE_SHELL.door; T.soft((D.x0 + D.x1) / 2 + 4, 426, 56, 8, .4);
  T.poly([[D.x0 - 4, 408], [D.x1 + 10, 408], [D.x1 + 18, 434], [D.x0 - 10, 434]], '#8a6a3a');
  for (let i = 0; i < 12; i++) { const x = D.x0 - 4 + i * 10; T.stroke(`M${x} 409l${2 + i * .6} 24`, '#6a4e28', 1.2, .6); }
  T.poly([[D.x0 - 4, 408], [D.x1 + 10, 408], [D.x1 + 11, 411], [D.x0 - 5, 411]], '#b8945a', .7);
  // the warm pool of the fire on the floor, the cool pool of the window
  const night = P.tod === 'night' || P.tod === 'dusk';
  T.ell((F.x0 + F.x1) / 2, 470, 300, 70, T.rad((F.x0 + F.x1) / 2, 450, 300, [[0, '#ff9a4a', night ? .22 : .12], [1, '#ff9a4a', 0]]));
}

/* ---------- the painter ---------- */
/** The room's painting and its light, for this house as it is now. */
function houseShellSpec(P) {
  P = Object.assign({ look: 'thatch', wall: HOUSE_WALL0, floor: HOUSE_FLOOR0, tod: 'day', season: 'summer', wx: 0 }, P || {});
  const L = HOUSE_LOOK_PAL[P.look] || HOUSE_LOOK_PAL.thatch, S = HOUSE_SKY[P.tod] || HOUSE_SKY.day, W = HOUSE_SHELL.window, F = HOUSE_SHELL.fire;
  const night = P.tod === 'night', rain = P.wx === 1, fireX = (F.x0 + F.x1) / 2;
  const fx = { flicker: [{ x: fireX, y: F.y1 - 30, r: 150, c: '#ff8a3a', a: night ? .34 : .24, amt: .32 }, { x: fireX, y: 470, r: 220, c: '#ff9a4a', a: night ? .14 : .08, amt: .22, depth: 60 }] };
  if (S.shaftA > .05 && !rain) fx.motes = [{ x0: W.x0 + 10, x1: W.x1 + 160, y0: W.y1, y1: 560, n: 16, c: '#fff6dc', a: .42, rise: 4 }];
  if (rain) fx.streaks = [{ x: W.x0 + 12, y: W.y0 + 10, w: W.x1 - W.x0 - 24, h: W.y1 - W.y0 - 24, a: .3, speed: 240 }];
  fx.motes = (fx.motes || []).concat([{ x0: fireX - 60, x1: fireX + 60, y0: F.y0 - 30, y1: F.y1 - 20, n: 6, c: '#ffc070', a: .5, rise: 26 }]);   // sparks going up the chimney
  return {
    plate: '#2a1c12', ambient: Math.max(.45, S.amb - (rain ? .08 : 0)),
    lights: [
      { id: 'hs-fire', x: fireX, y: F.y1 - 40, radius: night ? 380 : 320, height: 50, color: '#ff9a4a', intensity: night ? .6 : .42 },
      { id: 'hs-window', x: (W.x0 + W.x1) / 2, y: W.y1 - 30, radius: 300, height: 140, color: S.shaft, intensity: S.win * (rain ? .6 : 1) },
    ],
    fx,
    *paint(T) {
      T.rect(0, 0, 960, 600, L.plate);
      yield* _hsPaintCeiling(T, P, L); yield;
      _hsPaintWall(T, P, L); yield;
      yield* _hsPaintWindow(T, P, L); yield;
      yield* _hsPaintHearth(T, P, L); yield;
      _hsPaintDoor(T, P, L); yield;
      _hsPaintFloor(T, P, L); yield;
      if (P.tod === 'night' || P.tod === 'dusk') { const nt = P.tod === 'night'; T.rect(0, 0, 960, 600, nt ? '#0a0c1e' : '#1e1020', nt ? .36 : .14); T.glow(fireX, 390, nt ? 380 : 300, '#ff9a4a', nt ? .2 : .1); }
      T.finish({ vignette: .42, vcol: '#0a0604', dabs: 420 });
    },
  };
}
