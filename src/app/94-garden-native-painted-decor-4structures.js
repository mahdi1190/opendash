/* Painted decorations, garden structures: pergola, gazebo, potting shed, cold
 * frame, obelisk, windmill, weather vane, dovecote, the old mill, the tiny
 * bandstand, the beach hut, the little lighthouse, the washing line, the clay
 * oven (the family look: painted boards with a lit left face and a shaded
 * right, roofs darker on the far slope, climbers in the scene's three greens,
 * tufts at the foot). Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('structures', (function () {
  const WOOD = ['#9a7a54', '#7a5e40', '#c4a478', '#4a3a2c'], OAK = ['#8a6a46', '#6a5034', '#b08c5e', '#3e3022'];
  const WHITE = ['#f4f1ea', '#d4cfc2', '#ffffff', '#a8a294'], IRONP = ['#2f3438', '#1e2224', '#4e565c'];
  const STONE = ['#c9c1aa', '#a89f88', '#e4ddc8', '#867d69'], MOSSP = ['#7d8f4e', '#a3b06a', '#5f723c'];
  const ROOF = ['#7a5a46', '#5a4032', '#9a7a62'], TILE = ['#a8583e', '#7a3a2a', '#c8785a'];
  const whole = rows => rows;   // the kit paints the moving parts into the icons itself
  // a vine climbing a line of points: leaves in three tones, flowers if in season
  const vine = (B, o, pts, n, flowers) => {
    const L = o.K.leafOf(o.season), r = o.r;
    for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1), k = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))), f = t * (pts.length - 1) - k, x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f + (r() - .5) * 6, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f + (r() - .5) * 5;
      if (o.season === 'winter' && r() < .55) continue;
      B.f(o.D.blob(r, x, y, 5.4, 4.2, 6, .5), L[0], .95).f(o.D.blob(r, x - 1.4, y - 1.2, 3.6, 2.6, 6, .5), L[1]).f(o.D.blob(r, x - 2, y - 2, 1.6, 1.2, 5, .5), L[2], .85);
      if (flowers && o.season !== 'winter' && o.season !== 'autumn' && i % 3 === 0) B.f(B.circ(x + 2, y + 1, 1.8), flowers[i % flowers.length]).f(B.circ(x + 1.5, y + .5, .7), '#ffffff', .6); }
  };
  const boardsH = (B, H, x, y, w, h, c, n) => { B.f(B.rect(x, y, w, h), B.lin(x, 0, x + w, 0, [[0, H.shade(c, .14)], [.5, c], [1, H.shade(c, -.22)]])); for (let i = 1; i < n; i++) B.s(`M${x} ${y + i * h / n}h${w}`, H.shade(c, -.25), .6, .7).s(`M${x} ${y + i * h / n + .7}h${w}`, H.shade(c, .2), .4, .5); };
  return whole({
    pergola: { box: [-68, -130, 68, 8], draw(B, o) {
      const { H, r } = o; B.shadow(0, -14, 64, 20, .2);
      // a floor of worn flagstones under it, grass in the joints
      B.f(o.D.blob(r, 0, -18, 60, 16, 12, .2), STONE[1], .35);
      for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { const x = -48 + i * 19 + (j & 1) * 8, y = -28 + j * 10; if (Math.abs(x) > 56 - j * 2) continue; B.f(B.rr(x - 8, y - 2.4, 15 + r() * 2, 5, 2), r() < .5 ? STONE[0] : STONE[1], .9).f(B.rect(x - 7, y - 2.4, 9, 1), STONE[2], .6); }
      // four posts in depth: the back pair higher on the screen, then crossbeams and rafters
      const P = ['#a87c4f', '#7a5636', '#c8a070', '#4a3420'];
      for (const x of [-48, 48]) B.post(x, -116, -30, 5, [P[1], P[3], P[0]]);
      B.beam(-60, -118, 120, 5, P);
      for (const x of [-52, 52]) B.post(x, -108, 0, 6, P);
      B.beam(-64, -110, 128, 6, P);
      for (let i = 0; i < 7; i++) { const x = -54 + i * 18; B.f(B.poly([[x - 2.4, -108], [x + 2.4, -108], [x + 5, -120], [x, -120]]), P[0]).f(B.poly([[x - 2.4, -108], [x - .6, -108], [x + 1.6, -120], [x, -120]]), P[2], .6); }
      // a vine up the left post and over the top, wisteria-like drops
      vine(B, o, [[-52, -2], [-52, -60], [-50, -108], [-10, -114], [30, -112], [54, -106], [52, -60]], 30, ['#b48ad8', '#9a6ac8', '#d8c0f0']);
      if (o.season === 'spring' || o.season === 'summer') for (let i = 0; i < 6; i++) { const x = -40 + i * 15 + r() * 4; for (let j = 0; j < 4; j++) B.f(B.ell(x, -102 + j * 3.4, 2.4 - j * .4, 1.8), ['#b48ad8', '#9a6ac8', '#c8a8e8'][j % 3], .95); }
      vine(B, o, [[52, -2], [53, -50], [50, -104]], 10, ['#f4b8c8', '#ffffff']);
      // a bench at the back in the dappled shade, a pot of lavender
      B.f(B.rr(-30, -44, 60, 4, 1.4), '#c8a070').f(B.rr(-30, -54, 60, 4, 1.4), '#b08c5e').s('M-26 -40v8M26 -40v8', '#7a5636', 2);
      B.f('M36 -20h10l-1.6 10h-6.8z', '#c8693a').f(B.rect(35.4, -21, 11.2, 2.4), '#e08a5a'); o.H.blooms(B, r, 41, -26, 12, 9, ['#a88ad8', '#8a6ac8'], o.season);
      // a little table and two chairs in the shade
      B.f(B.ell(0, -20, 14, 4), '#efe8d8').f(B.ell(0, -21, 14, 3.6), '#ffffff').s('M0 -20v16', '#c8c0b0', 2).f(B.circ(-3, -24, 2.2), '#f6f2ea').f(B.circ(4, -24, 1.8), '#e86a6a');
      B.tufts(r, -52, 2, 14, 6, o.season).tufts(r, 52, 2, 14, 6, o.season);
    } },
    gazebo: { box: [-68, -142, 68, 10], draw(B, o) {
      const { H, r } = o, roof = ['#5a7f9a', '#3e5a70', '#7aa0ba', '#2a3e50']; B.shadow(0, 2, 62, 10, .24);
      // a round stone floor, slender white columns, a balustrade, an ogee roof with a finial
      B.f(B.ell(0, -6, 60, 13), STONE[3]).f(B.ell(0, -8, 58, 12), STONE[1]).f(B.ell(0, -10, 56, 10), STONE[0]).f(B.ell(-14, -12, 26, 4), STONE[2], .5);
      for (const x of [-30, 30]) B.post(x, -96, -16, 4, WHITE);
      B.f(B.rr(-26, -60, 52, 30, 2), 'rgba(40,50,60,.18)');
      B.f(B.rr(-14, -40, 28, 3, 1), '#c8a878').s('M-10 -38v14M10 -38v14', '#a07a52', 1.6);
      for (const x of [-52, 52, -18, 18]) B.post(x, -94, -6, 5, WHITE);
      for (let i = 0; i < 13; i++) { const x = -50 + i * 8.3; if (Math.abs(x) < 14) continue; B.s(`M${x} -10v-22`, i % 2 ? WHITE[1] : WHITE[0], 2); }
      B.beam(-54, -36, 108, 3, WHITE).beam(-56, -98, 112, 4, WHITE);
      for (let i = 0; i < 8; i++) { const x = -48 + i * 13.7; B.f(`M${x} -94q6.8 6 13.7 0z`, WHITE[0]); }
      B.f('M-62 -98q20 -6 30 -22q14 -14 32 -18q18 4 32 18q10 16 30 22z', B.lin(-62, 0, 62, 0, [[0, roof[2]], [.45, roof[0]], [1, roof[3]]]));
      for (const x of [-34, -12, 12, 34]) B.s(`M${x * 1.6} -98Q${x * .7} -120 0 -138`, roof[1], .8, .6);
      B.f(B.rect(-63, -100, 126, 3), roof[1]).f('M0 -138q-4 -6 0 -10q4 4 0 10z', '#c9a24a').s('M0 -148v-6', '#c9a24a', 1.2);
      vine(B, o, [[-52, -6], [-54, -50], [-50, -94], [-36, -100]], 12, ['#f4b8c8', '#ffffff']);
      B.tufts(r, -58, 0, 12, 5, o.season).tufts(r, 58, 0, 12, 5, o.season);
    } },
    'potting-shed': { v: 3, box: [-64, -124, 64, 8], draw(B, o) {
      const { H, r } = o, wall = ['#6f8f6a', '#a87c4f', '#7a9fb8'][o.v]; B.shadow(2, 1, 60, 8, .28);
      // clapboard walls, a felt roof, a door ajar, a window with seed trays, pots and a fork outside
      boardsH(B, H, -52, -74, 104, 72, wall, 9);
      B.f(B.rect(-52, -74, 4, 72), H.shade(wall, .3), .5).f(B.rect(48, -74, 4, 72), H.shade(wall, -.35), .5);
      B.f('M-62 -72L0 -110L62 -72z', ROOF[0]).f('M0 -110L62 -72H40z', ROOF[1], .7).f('M-62 -72L0 -110L-4 -104L-54 -72z', ROOF[2], .6).f(B.rect(-64, -73, 128, 3), ROOF[1]);
      B.f(B.rect(-56, -71, 112, 2), 'rgba(30,24,18,.3)');
      B.f(B.rr(-8, -98, 16, 10, 1), '#3a3a30').f(B.rect(-7, -97, 14, 8), o.night ? '#ffd890' : '#a8c8d0').s('M0 -97v8M-7 -93h14', WHITE[0], 1);
      // the door, opened a crack onto a dark inside
      B.f(B.rect(-38, -56, 24, 54), '#2a241c').f('M-38 -56h20l3 2v52l-3 2h-20z', H.shade(wall, -.12)).f(B.rect(-38, -56, 2, 54), H.shade(wall, .3), .6).f(B.circ(-20, -28, 1.4), '#c9a24a');
      for (const y of [-50, -14]) B.f(B.rect(-38, y, 20, 2.4), H.shade(wall, -.3), .6);
      // a window with a sill box of flowers
      B.f(B.rect(6, -58, 34, 26), WHITE[0]).f(B.rect(8, -56, 30, 22), o.night ? '#ffd890' : '#7aa0b0').f(B.poly([[10, -36], [16, -36], [26, -56], [20, -56]]), '#ffffff', o.night ? .15 : .35).s('M23 -56v22M8 -45h30', WHITE[0], 1.6);
      B.f(B.rect(4, -32, 38, 6), WOOD[1]).f(B.rect(4, -32, 38, 1.6), WOOD[2]); H.blooms(B, r, 23, -35, 36, 9, ['#e86a8a', '#f4c040', '#ffffff', '#b06ad8'], o.season);
      // terracotta pots, a fork leaning, a watering can
      for (const [x, s] of [[-50, 1], [-58, .8], [56, .9]]) { B.f(`M${x - 5 * s} -${10 * s}h${10 * s}l${-1.4 * s} ${10 * s}h${-7.2 * s}z`, '#c8693a').f(B.rect(x - 5.6 * s, -11 * s, 11.2 * s, 2.4 * s), '#e08a5a'); B.crown(r, x, -14 * s, 5 * s, 4 * s, o.season, 3); }
      B.s('M48 -2l-6 -40', WOOD[1], 1.6).s('M41 -42l-2 -6M43 -42l0 -6M45 -42l2 -6', IRONP[2], 1);
      B.tufts(r, -30, 2, 60, 9, o.season).tufts(r, 40, 2, 30, 6, o.season);
    } },
    'cold-frame': { box: [-56, -42, 56, 6], draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 52, 6, .24);
      // a low timber box, higher at the back, a glazed lid propped open
      B.f('M-50 0V-18L50 -26V0z', H.lit(B, -50, 50, '#a87c4f')).s('M-50 -9L50 -13', '#7a5636', .7, .7).f(B.rect(-50, -2, 100, 2), '#6a4a2c', .7);
      const L = o.K.leafOf(o.season);
      for (let i = 0; i < 8; i++) { const x = -42 + i * 11.6, y = -18 - i * .8; B.f(o.D.blob(r, x, y, 5, 3.4, 6, .5), L[1]).f(o.D.blob(r, x - 1, y - 1.4, 2.6, 1.6, 5, .5), L[3], .8); }
      B.f('M-50 -18L50 -26L50 -30L-50 -22z', '#7a5636').f('M-48 -20L48 -28', '#c8a070', .6);
      B.f('M-50 -22L-4 -38L46 -42L50 -30z', 'rgba(206,232,236,.45)').f('M-50 -22L-4 -38L46 -42L50 -30z', 'rgba(255,255,255,0)');
      B.s('M-50 -22L-4 -38L46 -42L50 -30', '#a87c4f', 2).s('M-27 -30L24 -36', '#a87c4f', 1.2).f(B.poly([[-38, -26], [-30, -29], [-6, -37], [-14, -34]]), '#ffffff', .5);
      B.s('M30 -28l2 -12', '#7a5636', 1.6);
      B.tufts(r, -54, 2, 8, 4, o.season).tufts(r, 52, 2, 8, 4, o.season);
    } },
    obelisk: { box: [-22, -100, 22, 6], draw(B, o) {
      const { H, r } = o, G = ['#3f5a4a', '#2c4034', '#6a8a74']; B.shadow(0, 1, 14, 4, .24);
      // a painted trellis spire, cross rails, a ball finial, sweet peas climbing it
      B.f(o.D.blob(r, 0, -2, 14, 4, 8, .4), '#6a5034', .7);
      for (const [x1, x2] of [[-11, -1.6], [11, 1.6], [-5, -.8], [5, .8]]) B.s(`M${x1} 0L${x2} -86`, x1 < 0 ? G[2] : G[0], x1 % 2 ? 2.2 : 1.6);
      for (const y of [-14, -32, -50, -68]) { const w = 11 * (1 + y / 92); B.s(`M${-w} ${y}h${w * 2}`, G[0], 1.4).s(`M${-w} ${y - .6}h${w}`, G[2], .6, .7); }
      vine(B, o, [[-8, -4], [6, -22], [-5, -40], [4, -58], [-2, -76]], 14, ['#f4a8c8', '#c88ae0', '#ffffff', '#e86a8a']);
      B.f(B.circ(0, -90, 4), H.lit(B, -4, 4, '#c9a24a')).f(B.circ(-1.4, -91.4, 1.2), '#fff0b0', .8);
      B.tufts(r, 0, 2, 22, 6, o.season);
    } },
    windmill: { v: 2, box: [-18, -66, 18, 6], draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 10, 3, .24);
      // a painted pole and a little white mill house with a red cap
      B.s('M0 0v-46', '#7a6a5a', 2.6).s('M-.6 0v-46', '#a89a8a', .8, .7);
      B.f('M-9 -42v-14l9 -8l9 8v14z', H.lit(B, -9, 9, WHITE[0])).f('M-11 -55l11 -10l11 10l-2 1l-9 -8l-9 8z', '#d83a3a').f(B.rr(-3, -50, 6, 8, 2), '#3a6fc4').f(B.rect(-9, -43, 18, 2), '#a8a294');
      B.tufts(r, 0, 2, 16, 6, o.season);
    }, anim: [{ id: 'sails', x: 6, y: -54, kind: 'spin', speed: 1.8, box: [-20, -20, 20, 20], draw(B, o) {
      const blue = ['#3a6fc4', '#f2b33a'][o.v];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; B.cx.save(); B.cx.rotate(a); B.f('M0 -1.2L17 -2.4L17 4.6L3 3z', i % 2 ? '#d83a3a' : blue).f('M0 -1.2L17 -2.4L17 -.6L1 0z', '#ffffff', .4); B.cx.restore(); }
      B.f(B.circ(0, 0, 2.6), '#2f3438').f(B.circ(-.6, -.6, .9), '#8a9094');
    } }] },
    'weather-vane': { box: [-24, -104, 24, 6], draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 10, 3, .24);
      // a black iron post on a stone, the compass arms with their letters
      B.stone(r, 0, -2, 10, 5, STONE, MOSSP);
      B.s('M0 -4v-88', IRONP[0], 2.4).s('M-.7 -4v-88', IRONP[2], .7, .7);
      B.s('M-16 -72h32M0 -80v16', IRONP[0], 1.4).f(B.circ(0, -72, 2.2), IRONP[0]);
      B.text('W', -19, -72, 6, IRONP[0], 'Georgia, serif', 'bold').text('E', 19, -72, 6, IRONP[0], 'Georgia, serif', 'bold');
      B.f(B.circ(0, -88, 2), '#c98a12');
      B.tufts(r, 0, 2, 20, 6, o.season);
    }, anim: [{ id: 'cock', x: 0, y: -90, kind: 'sway', speed: .7, amp: .12, box: [-20, -18, 20, 2], draw(B) {
      // a gilded cockerel on its arrow, lit upper left
      const G = ['#c98a12', '#9a6a0e', '#f0c060'];
      B.s('M-18 -1h34', G[1], 1.4).f('M16 -1l-5 -3v6z', G[0]).f('M-18 -1l-3 -3h4l2 3l-2 3h-4z', G[0]);
      B.f('M-8 -2q-2 -8 4 -10q-1 -4 3 -5q3 0 3 3l3 1l-3 1q2 4 0 8q4 0 7 -6q2 6 -2 10z', G[0]).f('M-6 -4q-1 -6 3 -8q-1 -3 2 -4q1 3 -1 6q-3 2 -4 6z', G[2], .8).f(B.circ(1, -14.6, .7), '#3a2a10');
      B.f('M-1 -18l1 -2l1 2l1 -2l1 2z', '#d83a3a');
    } }] },
    dovecote: { box: [-30, -126, 30, 6], draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 14, 4, .24);
      // a tall post, a white tower of little arched doors, a shingled roof, doves on the ledges
      B.post(0, -62, 0, 5, OAK).f(o.D.blob(r, 0, -1, 10, 3, 7, .4), '#6a5034', .6);
      for (const s of [-1, 1]) B.s(`M${s * 2} -50l${s * 9} -10`, OAK[0], 2);
      B.f(B.rect(-19, -106, 38, 46), H.lit(B, -19, 19, WHITE[0])).f(B.rect(-21, -62, 42, 3), OAK[1]).f(B.rect(-21, -84, 42, 2.6), OAK[0]).f(B.rect(-21, -84, 42, .8), OAK[2]);
      for (const [x, y] of [[-9, -96], [9, -96], [-9, -71], [9, -71]]) { B.f(`M${x - 4.6} ${y + 6}v-6a4.6 4.6 0 0 1 9.2 0v6z`, '#3a3028').f(B.rect(x - 6, y + 6, 12, 1.6), OAK[0]); }
      B.f('M-26 -104L0 -124L26 -104z', B.lin(-26, 0, 26, 0, [[0, ROOF[2]], [.5, '#7a5636'], [1, ROOF[1]]])).f(B.rect(-27, -105, 54, 3), ROOF[1]);
      for (let i = 0; i < 3; i++) B.s(`M${-20 + i * 6} ${-108 - i * 4.4}h${40 - i * 12}`, ROOF[1], .6, .6);
      B.f('M0 -124v-6', IRONP[0]).s('M0 -124v-6', IRONP[0], 1.2);
      const dove = (x, y, s) => B.f(B.ell(x, y, 4.4 * s, 2.8 * s), '#f2f0ea').f(B.circ(x + 3.6 * s, y - 2.4 * s, 2 * s), '#f6f4ee').f(B.poly([[x + 5.4 * s, y - 2.6 * s], [x + 7 * s, y - 2.2 * s], [x + 5.4 * s, y - 1.8 * s]]), '#e0a080').f(B.ell(x - 1 * s, y - .6 * s, 2.6 * s, 1.2 * s), '#c8c4ba', .8).f(B.circ(x + 4 * s, y - 2.8 * s, .4 * s), '#2a2a2a');
      dove(-12, -87, 1); dove(14, -63.4, .9);
      B.tufts(r, 0, 2, 22, 6, o.season);
    }, anim: [{ id: 'dove', x: 6, y: -108, kind: 'bob', speed: 1.1, amp: .8, box: [-8, -6, 8, 3], draw(B) {
      B.f(B.ell(0, 0, 4.4, 2.8), '#f2f0ea').f(B.circ(-3.6, -2.4, 2), '#f6f4ee').f(B.poly([[-5.4, -2.6], [-7, -2.2], [-5.4, -1.8]]), '#e0a080').f(B.ell(1, -.6, 2.6, 1.2), '#c8c4ba', .8).f(B.circ(-4, -2.8, .4), '#2a2a2a');
    } }] },
    'play-mill': { v: 6, box: [-62, -136, 66, 12], draw(B, o) {
      const { H, r } = o, v = o.v, M = ['#a89a84', '#847664', '#c8bca4', '#655a4a']; B.shadow(4, 2, 58, 9, .28);
      // a stone mill house: coursed stone, a corner shade; broken gable until the roof is mended
      B.f(B.rect(-46, -72, 60, 72), H.lit(B, -46, 14, M[0])).f(B.rect(14, -72, 8, 72), M[3]);
      for (let y = -8; y > -72; y -= 9) for (let x = -46 + ((y / 9) & 1) * 7; x < 12; x += 14) B.f(B.rr(x + 1, y - 7.4, 12, 7.4, 1.6), r() < .5 ? M[0] : M[2], .55).f(B.rect(x + 1, y - .8, 12, .8), M[1], .6);
      if (v < 2) { B.f('M-46 -72l10 -8l8 9l12 -12l12 7l8 -7l18 11H-46z', M[0]).f('M-34 -78l7 13l-15 6z', M[1]); for (let i = 0; i < 4; i++) B.s(`M${-40 + i * 14} -72l${4 + i} -${10 + i * 3}`, '#4a3020', 2.2); }
      else { B.f('M-54 -70L-16 -112L30 -70z', B.lin(-54, 0, 30, 0, [[0, '#a8604a'], [.5, TILE[1]], [1, '#5a2a1e']])).f('M-54 -70L-16 -112L-13 -108L-46 -70z', TILE[2], .6); for (let i = 1; i < 5; i++) B.s(`M${-54 + i * 7.6} ${-70 - i * 8.4}h${84 - i * 15.2}`, '#6a2a1e', .7, .6); }
      if (v < 2) { B.f(o.D.blob(r, -40, -70, 10, 6, 7, .5), o.K.leafOf(o.season)[1], .9); B.s('M-46 -20q-6 -30 2 -50', o.K.leafOf(o.season)[0], 1.6); }
      // the door: boarded up, then a proper door
      if (v >= 3) B.f('M-28 0v-24q0 -9 9 -9q9 0 9 9v24z', '#6a4426').s('M-19 -32v32', '#4a2e18', .8).f(B.circ(-13, -12, 1.4), '#e8c33a');
      else B.f('M-28 0v-24q0 -9 9 -9q9 0 9 9v24z', '#2a2622').s('M-30 -8h22M-29 -20l18 8', '#6a4a2c', 2.4);
      // the window: dark, then lit and glazed
      B.f(B.rect(-40, -54, 13, 13), v >= 4 ? (o.night ? '#ffe08a' : '#a8c8d0') : '#2a2622'); if (v >= 4) B.s('M-33.5 -54v13M-40 -47.5h13', '#5a4028', 1.4);
      // the race and the wheel: lying broken in the stream, then back up (turning once mended)
      if (v >= 5) B.f('M8 4q24 6 52 0v6H8z', '#6aa8b8').f(B.ell(34, 6, 18, 2), '#cfe6ea', .6);
      else B.f(B.ell(36, 4, 22, 4), '#5a7a6a', .6);
      if (v === 0) { B.f(B.poly([[14, -2], [44, -18], [47, -14], [18, 3]]), '#6a4a2c'); for (let i = 0; i < 5; i++) B.f(B.rr(18 + i * 6, -6 - i * 3, 3, 8, 1), '#7a5a3a'); }
      else if (v < 5) millWheel(B, 32, -30);
      B.f(B.rect(22, -38, 6, 4), '#4a3420');
      B.tufts(r, -50, 2, 14, 6, o.season).tufts(r, 0, 2, 20, 6, o.season);
    }, anim: [{ id: 'wheel', x: 32, y: -30, kind: 'spin', speed: .9, box: [-28, -28, 28, 28], draw(B, o) { if (o.v >= 5) millWheel(B, 0, 0); } }] },
    'play-pz-stand': { box: [-50, -84, 50, 8], draw(B, o) {
      const { H, r } = o, RED = ['#c8453a', '#8e2a22', '#e8705a']; B.shadow(0, 1, 46, 6, .24);
      // a round painted stage on a plinth, three white columns, a red and white striped roof with a pennant
      B.f(B.ell(0, -4, 40, 7), WHITE[3]).f(B.rect(-40, -10, 80, 6), H.lit(B, -40, 40, WHITE[0])).f(B.ell(0, -10, 40, 7), WHITE[1]).f(B.ell(-8, -11, 22, 3.4), '#ffffff', .5);
      for (let i = 0; i < 9; i++) B.s(`M${-36 + i * 9} -4v-4`, WHITE[3], 1, .6);
      for (const x of [-30, 0, 30]) B.post(x, -52, -10, 3.6, WHITE);
      B.s('M-30 -24h60', WHITE[1], 1.2);
      H.stripes(B, 'M-44 -52L0 -76L44 -52z', -44, -76, 44, -52, '#f4f2e8', RED[0], 6);
      B.f(B.rect(-46, -54, 92, 3.4), RED[1]); for (let i = 0; i < 12; i++) B.f(`M${-46 + i * 7.66} -51q3.8 4 7.66 0z`, i % 2 ? RED[0] : '#f4f2e8');
      B.s('M0 -76v-8', IRONP[0], 1).f('M0 -84l7 2l-7 2z', '#f2c21e');
      // a music stand and a tiny drum
      B.s('M-10 -12v-12M-14 -26h8', IRONP[0], 1).f(B.rect(-15, -30, 10, 5), '#fbf6ea');
      B.f(B.ell(12, -14, 6, 2), RED[0]).f(B.rect(6, -20, 12, 6), RED[0]).f(B.ell(12, -20, 6, 2), '#f4f2e8').s('M7 -19l10 5M17 -19l-10 5', '#f2c21e', .6);
      B.tufts(r, 0, 2, 90, 9, o.season);
    } },
    'dc-beach-hut': { box: [-36, -98, 36, 6], draw(B, o) {
      const { H, r } = o; B.shadow(2, 1, 32, 6, .26);
      // blue and white boards, a red roof, a yellow door, a deck with a towel; sand round the foot
      B.f(o.D.blob(r, 0, -1, 34, 6, 9, .4), '#e4d6ae', .9);
      B.f(B.rect(-26, -62, 52, 58), '#fbf5ec'); for (let i = 0; i < 4; i++) B.f(B.rect(-26 + i * 13, -62, 6.5, 58), '#3a8ac4');
      B.f(B.rect(-26, -62, 52, 58), B.lin(-26, 0, 26, 0, [[0, 'rgba(255,255,255,.18)'], [.5, 'rgba(255,255,255,0)'], [1, 'rgba(20,30,50,.22)']]));
      B.f('M-33 -60L0 -88L33 -60z', B.lin(-33, 0, 33, 0, [[0, '#e8604a'], [.5, '#d8452a'], [1, '#922a1a']])).f(B.rect(-34, -61, 68, 3), '#a83a22');
      B.f(B.rect(-5, -78, 10, 7), '#fbf5ec').f(B.rect(-4, -77, 8, 5), o.night ? '#ffe08a' : '#7ab0c8');
      B.f(B.rr(-10, -42, 20, 38, 2), H.lit(B, -10, 10, '#f2c432')).s('M0 -42v38', '#a8841a', .9).f(B.circ(5, -22, 1.4), '#6a4a2a');
      B.f(B.rect(-32, -6, 64, 5), H.lit(B, -32, 32, '#c8a46a')).s('M-32 -4h64', '#9a7a48', .5);
      B.f('M14 -6l12 -1l2 -10l-12 1z', '#e86a8a', .95).f('M14 -6l12 -1l.4 -2l-12 1z', '#ffffff', .6);
      B.f(B.ell(-28, -1, 4, 1.4), '#f0c8b0').f(B.ell(-23, 0, 2.4, 1), '#e8b8b0');
    } },
    'dc-lighthouse': { box: [-26, -128, 26, 6], glow: { w: 90, halo: -104, radius: 160 }, draw(B, o) {
      const { H, r } = o, RED = ['#d8352a', '#a02a20', '#ee6a50']; B.shadow(2, 1, 20, 5, .28);
      B.stone(r, -12, -2, 10, 5, STONE, null).stone(r, 12, -2, 9, 4.6, STONE, MOSSP);
      // a tapering white tower with two red bands, a black gallery, the lamp room and a red cap
      B.f('M-17 -2L-11 -86H11L17 -2z', H.lit(B, -17, 17, '#fbf5ec'));
      for (const [y1, y2] of [[-24, -44], [-62, -80]]) B.f(`M${-16.4 + (-y1) * .07} ${y1}L${-15 + (-y2) * .05} ${y2}H${15 - (-y2) * .05}L${16.4 - (-y1) * .07} ${y1}z`, H.lit(B, -16, 16, RED[0]));
      B.f(B.rr(-4, -16, 8, 14, 3), '#3a5a70').f(B.rr(-3, -54, 6, 8, 3), o.night ? '#ffe08a' : '#3a5a70');
      B.f(B.rect(-15, -90, 30, 4), IRONP[0]).s('M-15 -94h30', IRONP[0], .8); for (let i = 0; i < 7; i++) B.s(`M${-14 + i * 4.6} -90v-4`, IRONP[0], .7);
      if (o.night) B.f(B.circ(0, -104, 22), B.rad(0, -104, 22, [[0, 'rgba(255,230,150,.7)'], [1, 'rgba(255,230,150,0)']]));
      B.f(B.rect(-8, -110, 16, 18), o.night ? '#ffe9a8' : '#bfe0f0').f(B.poly([[-6, -94], [-3, -94], [1, -110], [-2, -110]]), '#ffffff', .5).s('M-8 -110v18M0 -110v18M8 -110v18', IRONP[0], 1);
      B.f('M-12 -110L0 -124L12 -110z', B.lin(-12, 0, 12, 0, [[0, RED[2]], [1, RED[1]]])).f(B.circ(0, -125, 1.6), IRONP[0]);
    }, anim: [{ id: 'beam', x: 0, y: -102, kind: 'flicker', speed: 1.2, box: [-70, -14, 70, 14], draw(B, o) {
      if (!o.night) return; B.f('M8 0L68 -12V12z', B.lin(8, 0, 68, 0, [[0, 'rgba(255,236,170,.55)'], [1, 'rgba(255,236,170,0)']])).f('M-8 0L-68 -12V12z', B.lin(-8, 0, -68, 0, [[0, 'rgba(255,236,170,.4)'], [1, 'rgba(255,236,170,0)']]));
    } }] },
    'dc-washing-line': { box: [-66, -84, 66, 6], draw(B, o) {
      const { H, r } = o; B.shadow(0, 1, 58, 5, .2);
      for (const s of [-1, 1]) { B.post(s * 56, -74, 0, 4.4, OAK).f(B.rect(s * 56 - 5, -74, 10, 2.4), OAK[1]); B.tufts(r, s * 56, 1, 12, 5, o.season); }
      H.cord(B, 'M-54 -70Q0 -60 54 -70', .8, '#e8e4d8');
      B.f(B.rr(-60, -14, 14, 12, 3), '#c8b090').f(B.rr(-58, -16, 10, 3, 1.4), '#e8d8b8');   // a peg basket
      B.tufts(r, 0, 2, 60, 8, o.season);
    }, anim: [
      { id: 'pink', x: -38, y: -64, kind: 'sway', speed: 1.3, amp: .07, box: [-8, -2, 9, 28], draw(B, o) { const { H } = o; B.f('M-7 0L8 -1L10 26L-8 24z', H.lit(B, -8, 10, '#e8607a')).f(B.rect(-6, 3, 15, 2), '#ffffff', .6).f(B.rr(-2, -2, 2, 4, .6), '#c8a070').f(B.rr(5, -2, 2, 4, .6), '#c8a070'); } },
      { id: 'shirt', x: -12, y: -62, kind: 'sway', speed: 1.1, amp: .06, box: [-14, -2, 14, 38], draw(B, o) { const { H } = o; B.f('M-12 0L12 0L13 12L7 12L7 36L-7 36L-7 12L-13 12z', H.lit(B, -13, 13, '#fbf5ec')).s('M0 2v34', '#d8d0c0', .6).f(B.rr(-5, -2, 2, 4, .6), '#c8a070').f(B.rr(4, -2, 2, 4, .6), '#c8a070'); } },
      { id: 'trousers', x: 14, y: -61, kind: 'sway', speed: 1.25, amp: .05, box: [-12, -2, 12, 32], draw(B, o) { const { H } = o; B.f('M-10 0H10L11 30H3L0 12L-3 30H-11z', H.lit(B, -11, 11, '#3a7ac4')).f(B.rect(-10, 0, 20, 3), '#2a5a9a').f(B.rr(-6, -2, 2, 4, .6), '#c8a070').f(B.rr(4, -2, 2, 4, .6), '#c8a070'); } },
      { id: 'socks', x: 38, y: -64, kind: 'sway', speed: 1.5, amp: .09, box: [-10, -2, 12, 22], draw(B, o) { B.f('M-8 0h5v14l3 2v3h-8z', '#f2c432').f('M3 0h5v14l3 2v3h-8z', '#e86a4a').f(B.rect(-8, 0, 5, 2), '#ffffff', .6).f(B.rect(3, 0, 5, 2), '#ffffff', .6).f(B.rr(-6.4, -2, 2, 4, .6), '#c8a070').f(B.rr(4.6, -2, 2, 4, .6), '#c8a070'); } },
    ] },
    'dc-clay-oven': { box: [-36, -66, 36, 6], glow: { w: 80, halo: -22, radius: 100 }, draw(B, o) {
      const { H, r } = o, C = ['#c8855a', '#9a5a38', '#e4a878', '#6a3a24']; B.shadow(2, 1, 32, 6, .28);
      // a stone plinth, a clay dome with a lit left flank and cracks, a dark mouth, a little chimney
      for (let i = 0; i < 5; i++) B.f(B.rr(-31 + i * 12.4, -15, 12, 7.4, 1.6), i % 2 ? STONE[1] : STONE[0]).f(B.rr(-29 + i * 12.4, -8, 12, 7.4, 1.6), i % 2 ? STONE[0] : STONE[1]);
      B.f(B.rect(-31, -15, 62, 1.6), STONE[2], .7);
      B.f('M-27 -14Q-27 -56 0 -56Q27 -56 27 -14z', B.lin(-27, 0, 27, 0, [[0, C[2]], [.45, C[0]], [1, C[1]]])).f('M-22 -16Q-20 -46 -4 -50Q-14 -36 -14 -16z', C[2], .45);
      B.s('M8 -46l4 6l-2 6M-18 -30l5 3', C[3], .7, .6);
      B.f('M8 -54h7v-10h-7z', C[1]).f(B.rect(8, -64, 7, 2), C[3]);
      B.f('M-12 -14Q-12 -34 0 -34Q12 -34 12 -14z', C[3]).f('M-10 -14Q-10 -31 0 -31Q10 -31 10 -14z', o.night ? '#ff9a3a' : '#2a1810');
      if (o.night) B.f(B.ell(0, -18, 14, 10), B.rad(0, -18, 14, [[0, 'rgba(255,230,140,.8)'], [1, 'rgba(255,160,60,0)']]));
      // a loaf on a peel, a few logs stacked by it
      B.s('M14 -10l18 -6', OAK[1], 1.6).f(B.ell(30, -17, 6, 2.6), '#d8a050').f(B.ell(29, -18, 3.6, 1.2), '#f0c070', .8);
      for (const [x, y] of [[-34, -3], [-28, -3], [-31, -8]]) B.f(B.circ(x, y, 3), WOOD[1]).f(B.circ(x, y, 2.2), '#d8b888');
      B.tufts(r, 0, 2, 66, 9, o.season);
    }, anim: [{ id: 'fire', x: 0, y: -15, kind: 'flicker', speed: 6, box: [-12, -16, 12, 2], draw(B, o) { if (o.night || o.icon) { o.H.flame(B, -3, 0, .55); o.H.flame(B, 3, 0, .5); } else B.f(B.ell(0, -1, 6, 1.6), '#e8742a', .5); } }] },
  });
  function millWheel(B, x, y) {
    B.s(B.circ(x, y, 22), '#5a3a20', 4.4).s(B.circ(x, y, 22), '#8a6a46', 2.2).s(B.circ(x, y, 10), '#6a4a2c', 2);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, cx = Math.cos(a), sy = Math.sin(a); B.s(`M${x + cx * 4} ${y + sy * 4}L${x + cx * 22} ${y + sy * 22}`, '#7a5a3a', 2.4); B.cx.save(); B.cx.translate(x + cx * 24, y + sy * 24); B.cx.rotate(a); B.f(B.rect(-2, -4, 4, 8), '#6a4a2c'); B.cx.restore(); }
    B.f(B.circ(x, y, 3.6), '#3a2818').f(B.circ(x - 1, y - 1, 1.2), '#a08060');
  }
})());
