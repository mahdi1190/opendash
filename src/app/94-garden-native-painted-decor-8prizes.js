/* Painted decorations won or brought home: the pet course's rosettes, the
 * dig's skeletons, the cooking pot and the marble jar (the 'play' family),
 * the prize stall's fairground things (glossy, bright, a little silly) and
 * the souvenirs a pet brings home from a journey (each with the same brown
 * luggage tag tied on). Registry: 94-garden-native-painted-decor-0kit.js. */
GardenPaintedDecor.add('play', (function () {
  const BONE = ['#ece3cf', '#c8bca2', '#fbf6ea', '#9a8e74'], SAND = ['#b8a688', '#9a8a6c', '#d4c6a8', '#7a6c54'];
  // a skeleton bone: a soft shade under, the pale bone, a lit edge
  const bone = (B, d, w) => B.s(d, BONE[3], w + 1.2, .55).s(d, BONE[0], w).s(d, BONE[2], Math.max(.6, w * .32), .8);
  // the dig's plinth: a low block of sandstone with chisel marks and a brass plate
  const plinth = (B, r, w, season) => {
    B.shadow(0, 1, w + 6, 6, .28);
    B.f(`M${-w} 0l3 -9h${2 * w - 6}l3 9z`, SAND[1]).f(`M${-w + 3} -9h${2 * w - 6}l1.4 3h${-(2 * w - 3.2)}z`, SAND[2]).f(B.rect(-w, -2, 2 * w, 2), SAND[3], .5);
    for (let i = 0; i < 6; i++) B.s(`M${-w + 8 + r() * (2 * w - 16)} ${-6 + r() * 4}l${2 + r() * 3} ${-1 + r()}`, SAND[3], .5, .5);
    B.f(B.rr(-9, -7, 18, 4.4, 1), '#b8904a').f(B.rect(-8, -7, 16, 1.2), '#e0c07a', .8);
    B.tufts(r, -w + 4, 2, 10, 4, season).tufts(r, w - 4, 2, 10, 4, season);
  };
  // a rosette on a stake: pleats, a centre with a star, two notched tails
  const rosette = (B, r, o, cols, hh, R) => {
    const [c0, c1, c2, c3] = cols, y = -hh; B.shadow(1, 1, 8, 2.6, .26);
    B.post(0, y + 4, 0, 3, ['#8a6a46', '#6a5034', '#b08c5e']);
    for (const s of [-1, 1]) B.f(`M${s * 2} ${y + 4}l${s * 6} ${R * 1.5}l${-s * 3} -2.4l${-s * 3} 3.6l${s * -1} ${-R * 1.4}z`, s < 0 ? c1 : c0);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, a2 = (i + 1) / 18 * Math.PI * 2; B.f(B.poly([[0, y], [Math.cos(a) * R, y + Math.sin(a) * R], [Math.cos(a2) * R * .96, y + Math.sin(a2) * R * .96]]), i % 2 ? c0 : c1); }
    B.f(B.circ(0, y, R), B.rad(-R * .4, y - R * .4, R * 1.4, [[0, 'rgba(255,255,255,.35)'], [1, 'rgba(0,0,0,.18)']]));
    B.f(B.circ(0, y, R * .55), c2).f(B.circ(0, y, R * .46), c3);
    const st = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * .14 : R * .32; st.push([Math.cos(a) * rr, y + Math.sin(a) * rr]); } B.f(B.poly(st), c2).f(B.ell(-R * .2, y - R * .24, R * .16, R * .1), '#ffffff', .6);
    B.tufts(r, 0, 2, 16, 6, o.season);
  };
  // the souvenirs' shared luggage tag on its string
  const tag = (B, x, y, ang) => { B.cx.save(); B.cx.translate(x, y); B.cx.rotate(ang || .3); B.s('M0 0q2 -3 5 -4', '#c8b48a', .7).f('M4 -6l8 -1.4l1.2 5.6l-8 1.4l-2.2 -2.4z', '#c49a62').f('M4 -6l8 -1.4l.3 1.4l-8 1.4z', '#dcb880', .8).f(B.circ(5.6, -4.2, .7), '#6a4a2c').s('M7.4 -3.6l3.4 -.6M7.6 -2.2l2.6 -.4', '#6a4a2c', .4, .7); B.cx.restore(); };
  const gloss = (B, x, y, rx, ry) => B.f(B.ell(x, y, rx, ry), '#ffffff', .55).f(B.ell(x + rx * .2, y + ry * .1, rx * .45, ry * .4), '#ffffff', .5);
  const ground = (B, r, w, o) => { B.shadow(0, 1, w, w * .28, .26); B.tufts(r, 0, 2, w * 1.6, 5, o.season); };
  return {
    /* ---------- the play things ---------- */
    'play-pot': { box: [-28, -50, 28, 6], draw(B, o) {
      const { r, H } = o; B.shadow(0, 1, 24, 5, .28);
      // a black iron pot on three stones over a small fire, a ladle, steam
      for (const [x, y] of [[-14, -2], [14, -2], [0, 1]]) B.stone(r, x, y, 7, 4.4, ['#a8a090', '#868070', '#c8c2b0'], null);
      B.f(B.ell(0, -6, 9, 3), '#4a3a2c'); for (const [x, a] of [[-5, -.5], [0, 0], [5, .5]]) B.s(`M${x - 4} -4l${8} ${a * 2}`, '#7a5a3a', 2);
      H.flame(B, 0, -6, .8, .9);
      B.f('M-17 -26q0 18 17 18q17 0 17 -18z', B.lin(-17, 0, 17, 0, [[0, '#5a6066'], [.35, '#3a3f46'], [1, '#1e2226']])).f(B.ell(0, -26, 17, 4.4), '#2a2e32').f(B.ell(0, -26, 14, 3.2), '#b86a2c').f(B.ell(-4, -27, 6, 1.2), '#e8a050', .8);
      B.f(B.ell(-9, -18, 2.4, 5), '#8a9298', .35);
      B.s('M6 -27l10 -16', '#6a5034', 2).f(B.ell(5, -26, 3.4, 1.6), '#7a8288');
      for (let i = 0; i < 3; i++) B.f(sceneDraw.blob(r, -6 + i * 6, -36 - i * 4, 5 - i, 3.4 - i * .6, 6, .5), '#ffffff', .35 - i * .08);
    } },
    'play-jar': { v: 7, box: [-20, -52, 20, 6], draw(B, o) {
      const { r } = o, n = (o.icon && !o.v ? 2 : o.v) * 3, cols = ['#e8843c', '#3aa8c8', '#d8405a', '#7fbf5a', '#f2c21e', '#8a5ac8']; B.shadow(1, 1, 15, 4, .26);
      // a big glass sweet jar with a wooden lid; it fills with the marbles found
      const body = 'M-14 0q-4 -16 0 -36h28q4 20 0 36z';
      B.f(body, 'rgba(196,226,232,.42)');
      for (let i = 0; i < n; i++) { const row = Math.floor(i / 3), x = -7 + (i % 3) * 7 + (row % 2 ? 2 : -1), y = -4.6 - row * 5.6, c = cols[i % cols.length]; B.f(B.circ(x, y, 3.2), B.rad(x - 1, y - 1, 4, [[0, '#ffffff'], [.3, c], [1, sceneDraw ? c : c]])).f(B.circ(x - 1, y - 1.1, .9), '#ffffff', .8); }
      B.f('M-14 0q-4 -16 0 -36h4q-3 18 0 36z', '#ffffff', .18).s('M-9 -30q-2 10 0 22', '#ffffff', 2, .6).f(B.ell(0, -1, 13, 2), '#a8c4c8', .4);
      B.f(B.rr(-12, -42, 24, 6, 2), '#8a5e36').f(B.rr(-12, -42, 24, 2, 1), '#b08050').f(B.rr(-9, -46, 18, 4, 1.6), '#a87244').f(B.rect(-14, -36.6, 28, 1.6), '#cfe6ee', .6);
      B.tufts(r, 0, 2, 26, 6, o.season);
    } },
    'play-fos-raptor': { box: [-56, -78, 64, 8], draw(B, o) {
      const { r } = o; plinth(B, r, 48, o.season);
      bone(B, 'M-4 -9V-26M-4 -9l-5 0M12 -9V-24M12 -9l5 0', 3.6);
      bone(B, 'M-34 -36c10 -12 32 -14 46 -6c8 4 14 8 18 14', 4.2);
      bone(B, 'M-34 -36c-10 2 -18 8 -26 3', 3.2);
      for (const x of [-18, -10, -2, 6, 13]) bone(B, `M${x} ${-42 + Math.abs(x + 4) * .12}q2 8 -1 16`, 1.8);
      bone(B, 'M22 -30l4 8l-4 4M24 -27l6 5', 1.6);
      B.f('M28 -30c8 -16 24 -18 30 -8c2 6 -6 12 -22 10z', BONE[0]).f('M30 -32c6 -10 18 -12 24 -6c-6 -2 -16 0 -24 6z', BONE[2], .9).f('M36 -22c8 1 16 0 20 -4l1 3c-6 4 -14 5 -22 4z', BONE[1]);
      B.f(B.circ(46, -33, 2.6), '#4a3a2a'); for (let i = 0; i < 5; i++) B.f(B.poly([[38 + i * 3.6, -24.5], [39.6 + i * 3.6, -21], [41 + i * 3.6, -24.5]]), BONE[2]);
    } },
    'play-fos-turtle': { box: [-56, -50, 60, 8], draw(B, o) {
      const { r } = o; plinth(B, r, 48, o.season);
      // the great shell, its plates picked out, flippers and a beaked skull
      bone(B, 'M-26 -12l-12 4M22 -12l12 4', 4);
      B.f('M-32 -11c0 -32 64 -32 64 0z', BONE[1]).f('M-30 -12c0 -28 58 -28 58 0z', B.lin(-30, 0, 28, 0, [[0, BONE[2]], [.5, BONE[0]], [1, BONE[1]]]));
      B.s('M-16 -13c2 -10 8 -16 16 -16s14 6 16 16M0 -30v17M-9 -26l-7 13M9 -26l7 13M-24 -18h48', BONE[3], 1.4, .6);
      B.f('M28 -18c10 -8 22 -5 22 3c0 6 -14 6 -22 2z', BONE[0]).f('M30 -19c8 -6 16 -4 18 0c-6 -2 -12 -1 -18 0z', BONE[2]).f(B.circ(42, -15, 1.8), '#4a3a2a');
    } },
    'play-fos-mammoth': { box: [-58, -112, 66, 8], draw(B, o) {
      const { r } = o; plinth(B, r, 52, o.season);
      for (const [x, s] of [[-28, 1], [-14, 1], [16, -1], [28, -1]]) bone(B, `M${x} -9V-50M${x} -9l${s * 4} 0`, 5);
      bone(B, 'M-36 -54c12 -18 48 -20 64 -6', 6);
      for (const x of [-24, -14, -4, 6, 16]) bone(B, `M${x} ${-62 + Math.abs(x + 4) * .1}q-3 12 1 22`, 2.6);
      bone(B, 'M-36 -54c-6 0 -10 4 -12 10', 3);
      B.f('M26 -64c8 -20 30 -18 32 -2c1 12 -14 18 -28 12z', BONE[0]).f('M28 -66c6 -14 22 -14 26 -4c-8 -4 -18 -2 -26 4z', BONE[2]).f(B.circ(44, -60, 3), '#4a3a2a');
      B.s('M46 -50c16 14 8 32 -8 34', '#e8dcc0', 5).s('M46 -50c16 14 8 32 -8 34', '#fbf6ea', 1.6, .8).s('M50 -52c10 12 6 24 -4 28', BONE[1], 3.4, .8);
    } },
    'play-ros-bronze': { box: [-18, -66, 18, 6], draw(B, o) { rosette(B, o.r, o, ['#c8803c', '#a6602a', '#e8b07a', '#f4e6d0'], 46, 13); } },
    'play-ros-silver': { box: [-18, -68, 18, 6], draw(B, o) { rosette(B, o.r, o, ['#c8d0d8', '#9aa6b2', '#eef2f6', '#f4f6f8'], 47, 14); } },
    'play-ros-gold': { box: [-20, -78, 20, 6], draw(B, o) { rosette(B, o.r, o, ['#f2c21e', '#d09a10', '#ffe68a', '#fff4c8'], 54, 15.5); } },

    /* ---------- the prize stall ---------- */
    'play-pz-gnome': { box: [-26, -56, 34, 6], draw(B, o) {
      const { r } = o; ground(B, r, 14, o);
      // a plastic gnome on a toadstool, fishing rod out over nothing
      B.f('M-9 -2q-1 -9 2 -12h14q3 3 2 12z', '#f2ecd8').f(B.ell(0, -14, 13, 4.6), '#d8453a').f(B.ell(-4, -16, 5, 1.6), '#f08070', .8);
      for (const [x, y] of [[-6, -14], [3, -16], [7, -13]]) B.f(B.circ(x, y, 1.3), '#ffffff');
      B.f(B.rr(-7, -30, 14, 14, 5), B.lin(-7, 0, 7, 0, [[0, '#5a8ac8'], [1, '#2a4a80']])).f(B.rr(-8, -20, 16, 2.4, 1), '#6a4a2a');
      B.f('M-6 -28q6 12 12 0q-2 -6 -6 -6q-4 0 -6 6z', '#fbf8f0').f(B.circ(0, -33, 5), '#f4d0b0').f(B.circ(1.8, -32, 1.4), '#e8a090');
      B.f('M-6 -35q5 -20 9 -16q4 3 3 1q-5 -2 -12 15z', '#d8453a').f(B.ell(0, -35.6, 6.4, 1.8), '#b03a2e').f(B.circ(-2, -33.6, .7), '#3a2a20').f(B.circ(2, -33.6, .7), '#3a2a20');
      B.s('M5 -26l25 -22', '#8a6a46', 1.4).s('M30 -48q2 16 -2 34', '#e8e4dc', .5, .9).f(B.circ(28, -14, 1.6), '#d8453a');
      gloss(B, -4, -27, 1.4, 3);
    } },
    'play-pz-flamingo': { box: [-22, -70, 24, 6], draw(B, o) {
      const { r } = o; ground(B, r, 10, o);
      // a plastic lawn flamingo: wire legs, a fat pink body, the bent neck
      B.s('M-2 0v-26M2 0l1 -12l-3 -4', '#2a2622', 1.2);
      B.f('M-14 -36q2 -12 16 -10q12 2 10 12q-6 6 -18 4z', B.lin(-14, -44, 12, -28, [[0, '#f8a8c8'], [1, '#d8608c']])).f('M-12 -37q8 -4 14 0q-6 -1 -14 2z', '#c84a7a', .7);
      B.f('M-14 -36l-6 2l4 -6z', '#e07aa0');
      B.s('M8 -40q6 -8 2 -16q-4 -8 2 -12', '#f08ab0', 4.2).s('M8 -40q6 -8 2 -16q-4 -8 2 -12', '#fbc0d8', 1.2, .8);
      B.f(B.ell(13, -68, 5, 3.6), '#f08ab0').f('M16 -67l6 4l-2 1l-5 -2z', '#2a2622').f('M16 -67l3 2l-3 0z', '#f4f0e8').f(B.circ(13, -69, .9), '#2a2622');
      gloss(B, -6, -42, 3, 1.2);
    } },
    'play-pz-trophy': { box: [-26, -66, 26, 6], draw(B, o) {
      const { r } = o; ground(B, r, 14, o);
      // a wonky gold cup far too big for its plinth, with a rosette ribbon
      B.f(B.rr(-13, -10, 26, 10, 1.6), '#7a5a3a').f(B.rect(-13, -10, 26, 2.4), '#9a7a54').f(B.rr(-7, -7, 14, 4, 1), '#e0c070');
      B.f('M-4 -10l1 -10h6l1 10z', '#d8a818').f(B.ell(0, -20, 6, 2), '#f2c21e');
      const gold = B.lin(-18, 0, 18, 0, [[0, '#fff0a0'], [.3, '#f2c21e'], [1, '#a87808']]);
      B.f('M-17 -50q0 26 17 30q17 -4 17 -30z', gold).f(B.ell(0, -50, 17, 4.4), '#c89a10').f(B.ell(0, -50, 14, 3.2), '#8a6608');
      for (const s of [-1, 1]) B.s(`M${s * 16} -46q${s * 10} 2 ${s * 6} 12q${s * -2} 4 ${s * -8} 4`, '#e0b018', 3);
      gloss(B, -9, -38, 2.4, 6);
      B.f(B.circ(0, -34, 5), '#d8405a').f(B.circ(0, -34, 2.6), '#fbe8ec').f('M-3 -30l-3 8l3 -2l2 3z', '#d8405a').f('M3 -30l3 8l-3 -2l-2 3z', '#b8304a');
    } },
    'play-pz-balloon': { box: [-20, -90, 20, 6], draw(B, o) { const { r } = o; ground(B, r, 6, o); B.f(B.circ(0, -2, 2.4), '#8a8a8a').s('M0 -2q-3 -20 1 -38q3 -14 0 -20', '#9a9a9a', .7); },
      anim: [{ id: 'balloon', x: 0, y: -60, kind: 'bob', speed: 1.1, amp: 2.4, box: [-17, -36, 17, 4], draw(B) {
        B.f('M0 0q-15 -6 -15 -20q0 -14 15 -14q15 0 15 14q0 14 -15 20z', B.rad(-5, -24, 22, [[0, '#9ac0f4'], [.5, '#5a8fe0'], [1, '#2e5aa8']])).f('M-2 0l2 3l2 -3z', '#3a6ab8');
        B.f(B.ell(-6, -24, 3.4, 5.4), '#ffffff', .55).f(B.circ(-3, -29, 1.4), '#ffffff', .7);
      } }] },
    'play-pz-marble': { box: [-24, -44, 24, 6], draw(B, o) {
      const { r } = o; B.shadow(2, 1, 18, 5, .32);
      // a giant glass marble: deep colour, a twist of white inside, a window highlight
      B.f(B.circ(0, -19, 18), B.rad(-6, -26, 26, [[0, '#9ae0f0'], [.45, '#3aa8c8'], [1, '#1a5a78']]));
      for (const [d, c, w] of [['M-14 -14q8 -2 12 -12q4 -8 12 -6', '#f4f6f8', 2.6], ['M-8 -4q4 -8 14 -8q6 0 10 -6', '#e8f2f4', 2], ['M-12 -26q6 4 12 2', '#ffffff', 1.4]]) B.s(d, c, w, .55);
      B.f(B.ell(-6, -27, 5, 3.4), '#ffffff', .8).f(B.ell(7, -9, 6, 2.4), '#bfeaf4', .4);
      B.tufts(r, 0, 2, 40, 7, o.season);
    } },

    /* ---------- souvenirs from journeys ---------- */
    'play-sv-sea': { box: [-22, -36, 22, 6], draw(B, o) {
      const { r } = o; ground(B, r, 14, o);
      // a scallop shell, fluted, with a cowrie beside it
      const fan = []; for (let i = 0; i <= 12; i++) { const a = Math.PI * (1.08 + i / 12 * .84); fan.push([Math.cos(a) * 15, -4 + Math.sin(a) * 18]); }
      B.f(B.poly([[0, -2], ...fan]), B.lin(-14, -20, 14, -2, [[0, '#fbe0d0'], [1, '#e08a7a']]));
      for (let i = 1; i < 12; i++) { const a = Math.PI * (1.08 + i / 12 * .84); B.s(`M0 -2L${Math.cos(a) * 15} ${-4 + Math.sin(a) * 18}`, '#c86a62', .7, .6); }
      B.f('M-5 -2l5 4l5 -4z', '#e8a090').f(B.ell(-4, -15, 4, 2), '#ffffff', .4);
      B.f(B.ell(13, -3, 5, 3), '#f4e0c8').s('M9 -3h8', '#a87a5a', .7).f(B.ell(12, -4.6, 2, 1), '#ffffff', .6);
      tag(B, -12, -6, -.5);
    } },
    'play-sv-harbour': { box: [-22, -46, 24, 6], draw(B, o) {
      const { r } = o; ground(B, r, 14, o);
      // a little anchor propped up, a red float on its rope
      const iron = ['#5a6a78', '#3e4a56', '#8a9aa8'];
      B.s('M0 -2v-30', iron[1], 4.4).s('M-1 -2v-30', iron[2], 1.2, .7).s('M-14 -12q14 14 28 0', iron[0], 4).f(B.poly([[-16, -16], [-12, -8], [-18, -10]]), iron[0]).f(B.poly([[16, -16], [12, -8], [18, -10]]), iron[0]);
      B.s('M-8 -26h16', iron[0], 3.4).s(B.circ(0, -36, 4), iron[0], 2.4);
      B.s('M3 -36q10 6 8 20', '#d8c48e', 1.2).f(B.circ(12, -14, 4.4), '#c8453a').f(B.rect(8, -15, 8, 1.8), '#f4f0e8').f(B.circ(10.6, -16, 1.2), '#ffffff', .7);
      tag(B, -6, -24, -.4);
    } },
    'play-sv-market': { box: [-22, -40, 22, 6], draw(B, o) {
      const { r } = o; ground(B, r, 16, o);
      // a wicker basket of greens, a red apple, a loaf poking out
      B.f(sceneDraw.blob(r, -6, -16, 7, 6, 7, .4), '#5f9a44').f(sceneDraw.blob(r, -7, -18, 4, 3, 6, .4), '#8fc06a').f(B.circ(6, -17, 5.4), '#d8453a').f(B.ell(4.4, -19, 1.8, 1.2), '#ffffff', .5).s('M6 -22l1 -3', '#6a4a2c', .9);
      B.f(B.rr(-3, -26, 6, 14, 3), '#d8a868').f(B.rect(-2, -24, 4, 1), '#a87a3a');
      B.f('M-15 -12h30l-3 12h-24z', '#b08a58').f('M-15 -12h30l-.6 2.4h-28.8z', '#d0aa74');
      for (let i = 0; i < 3; i++) B.s(`M-14 ${-8 + i * 3}h28`, '#8a6a3a', .6, .7); for (let i = 0; i < 8; i++) B.s(`M${-12 + i * 3.4} -11v10`, '#8a6a3a', .5, .5);
      B.s('M-12 -12q12 -20 24 0', '#8a6a3a', 1.8);
      tag(B, 12, -10, .2);
    } },
    'play-sv-farm': { box: [-22, -40, 22, 6], draw(B, o) {
      const { r } = o; ground(B, r, 16, o);
      // a tiny haystack, straws sticking out, a pitchfork leaning
      B.f('M-16 0q-2 -16 6 -24q10 -10 20 0q8 8 6 24z', B.lin(-16, 0, 16, 0, [[0, '#f0d880'], [.5, '#e0c060'], [1, '#b89038']])).f('M-8 -26q8 -10 16 0q-8 -4 -16 0z', '#b89038');
      for (let i = 0; i < 16; i++) { const x = -14 + r() * 28, y = -2 - r() * 22; B.s(`M${x} ${y}l${(r() - .5) * 4} ${-2 - r() * 3}`, r() < .5 ? '#f8e8a8' : '#a88030', .6, .8); }
      B.s('M14 0l4 -34', '#8a6a46', 1.4).s('M16 -34l1 -6M18 -34l1 -6M20 -33l1 -6M16 -34h5', '#8a9298', .8);
      tag(B, -12, -8, -.3);
    } },
    'play-sv-hills': { box: [-22, -34, 22, 6], draw(B, o) {
      const { r } = o; ground(B, r, 16, o);
      // a smooth grey pebble with a blue painted hill-and-sun on it
      B.f(sceneDraw.blob(r, 0, -10, 15, 10, 9, .15), '#9aa6ae').f(sceneDraw.blob(r, -3, -12, 11, 7, 8, .15), '#b4bec4').f(B.ell(-7, -15, 4, 2), '#dce2e6', .7);
      B.f('M-9 -6q5 -8 9 -4q4 -5 9 2z', '#5a8fe0').f(B.circ(6, -13, 2.4), '#f2c21e').f('M-9 -6q5 -8 9 -4q-4 -1 -9 4z', '#86b0f0', .8);
      tag(B, 12, -6, .4);
    } },
    'play-sv-island': { box: [-22, -38, 22, 6], draw(B, o) {
      const { r } = o; ground(B, r, 16, o);
      // a coconut, hairy husk, the three eyes; a paper umbrella stuck in it
      B.f(B.circ(0, -12, 12), B.rad(-4, -16, 16, [[0, '#8a6a46'], [1, '#4a3220']]));
      for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, rr = 6 + r() * 6; B.s(`M${Math.cos(a) * rr} ${-12 + Math.sin(a) * rr}l${(r() - .5) * 3} ${(r() - .5) * 3}`, '#a8865a', .6, .7); }
      for (const [x, y] of [[-3, -16], [3, -16], [0, -11]]) B.f(B.circ(x, y, 1.6), '#2a1a10');
      B.s('M4 -20l6 -12', '#f4ead8', .8).f('M2 -32q8 -8 16 2z', '#d8405a').f('M2 -32q4 -4 8 -2l2 3z', '#f4ead8', .6);
      tag(B, -12, -6, -.3);
    } },
    'play-sv-forest': { box: [-20, -48, 22, 6], draw(B, o) {
      const { r } = o; ground(B, r, 13, o);
      // a giant pine cone, scales in rows lit from the upper left
      for (let row = 0; row < 9; row++) { const y = -4 - row * 4.2, w = Math.sin((row + 1) / 10 * Math.PI) * 10 + 2; for (let i = -1; i <= 1; i++) { const x = i * w * .55 + (row % 2) * 1.6; B.f(`M${x - 3.6} ${y}q3.6 4 7.2 0q-1 -4 -3.6 -4q-2.6 0 -3.6 4z`, i < 0 ? '#9a6a3a' : i > 0 ? '#5a3a20' : '#7a5230').f(B.ell(x - .6, y - 1.6, 1.6, .7), '#c8986a', .6); } }
      B.s('M1 -42l-1 -4', '#5a3a20', 1.6);
      tag(B, 10, -8, .3);
    } },
    'play-sv-mountain': { box: [-22, -56, 26, 6], draw(B, o) {
      const { r } = o; ground(B, r, 14, o);
      // a summit stone with a little pennant on a pole
      B.stone(r, 0, -6, 14, 8, ['#9aa6ae', '#7a868e', '#c0cad0'], o.season === 'winter' ? null : ['#7d8f4e', '#a3b06a']);
      B.post(0, -48, -8, 2.4, ['#8a6a46', '#6a5034', '#b08c5e']);
      B.f(B.circ(0, -49, 1.6), '#e0c070');
    }, anim: [{ id: 'flag', x: 1, y: -46, kind: 'flutter', speed: 4, amp: .1, box: [0, -2, 22, 12], draw(B) { B.f('M0 0q11 -2 20 3q-9 3 -20 7z', '#d8405a').f('M0 0q11 -2 20 3l-20 1z', '#f07a8a', .7).f(B.circ(7, 4, 1.6), '#ffffff'); } }] },
    'play-sv-castle': { box: [-24, -44, 26, 6], draw(B, o) {
      const { r } = o; ground(B, r, 16, o);
      // a toy fort: a wall, two round towers with blue caps, a little door
      const st = ['#c9c1aa', '#a89f88', '#e4ddc8'];
      B.f(B.rect(-14, -20, 28, 20), st[0]).f(B.rect(-14, -20, 28, 3), st[2]); for (let i = 0; i < 4; i++) B.f(B.rect(-12 + i * 7, -24, 4, 4), st[0]);
      for (const x of [-15, 15]) { B.f(B.rect(x - 5, -30, 10, 30), H_lit(B, x - 5, x + 5, st[0])).f(B.poly([[x - 6.4, -30], [x, -40], [x + 6.4, -30]]), '#5a78c8').f(B.poly([[x - 6.4, -30], [x, -40], [x - 1, -30]]), '#7a98e0', .8).f(B.rr(x - 1.4, -24, 2.8, 5, 1.4), '#3a3a3a'); }
      B.f('M-4 0v-8q4 -5 8 0v8z', '#6a4a2c').s('M-12 -12h24', st[1], .7, .7);
      B.s('M15 -40v-6', '#6a5034', .7).f('M15 -46l5 1.6l-5 1.6z', '#d8405a');
      tag(B, -20, -6, -.2);
    } },
    'play-sv-fair': { box: [-20, -66, 22, 6], draw(B, o) { const { r } = o; ground(B, r, 8, o); B.f(B.circ(0, -2, 2.2), '#c8a050').s('M0 -2q-2 -16 0 -32', '#9a9a9a', .7); tag(B, 0, -4, .5); },
      anim: [{ id: 'balloon', x: 0, y: -34, kind: 'bob', speed: 1.3, amp: 2, box: [-15, -30, 15, 3], draw(B) {
        // a heart-shaped fairground balloon, foil-bright
        B.f('M0 0c-10 -8 -15 -14 -13 -21c2 -7 10 -8 13 -2c3 -6 11 -5 13 2c2 7 -3 13 -13 21z', B.rad(-4, -20, 20, [[0, '#f8a0b0'], [.5, '#d8405a'], [1, '#a02040']])).f(B.ell(-6, -19, 2.6, 4), '#ffffff', .55).f(B.circ(5, -18, 2.4), '#f2c21e', .9).f(B.circ(5, -18, 1), '#fff4c8');
      } }] },
    'play-sv-station': { box: [-20, -60, 22, 6], draw(B, o) {
      const { r, H } = o, lit = o.night; ground(B, r, 10, o);
      // a railway lamp: a black iron post, a glass lantern with a tin hood
      B.f(B.rr(-5, -4, 10, 4, 1), '#3a4048').post(0, -40, -3, 3, ['#3a4048', '#262a2e', '#5a626a']);
      B.f(B.rr(-6, -52, 12, 12, 1.4), lit ? '#ffe08a' : '#cfd8d4').f(B.rect(-6, -52, 12, 12), B.lin(-6, 0, 6, 0, [[0, 'rgba(255,255,255,.4)'], [1, 'rgba(0,0,0,.18)']])).s('M0 -52v12M-6 -46h12', '#3a4048', 1);
      if (lit) H.bulb(B, 0, -46, 2.6, '#ffe08a', true);
      B.f(B.poly([[-8, -52], [0, -58], [8, -52]]), '#3a4048').f(B.circ(0, -59, 1.4), '#3a4048').f(B.rect(-6.4, -40.4, 12.8, 2), '#3a4048');
      tag(B, 3, -28, .5);
    }, glow: { w: 50, halo: -46, radius: 60 } },
    'play-sv-snow': { box: [-20, -44, 20, 6], draw(B, o) {
      const { r } = o; ground(B, r, 13, o);
      // a snow globe: a wooden base, a little house and fir inside, snow drifting
      B.f('M-12 0l2 -7h20l2 7z', '#6a4a2c').f(B.rect(-10, -7, 20, 1.6), '#8a6a46');
      B.f(B.circ(0, -20, 14), B.rad(-5, -26, 20, [[0, 'rgba(240,250,255,.85)'], [1, 'rgba(160,200,224,.55)']]));
      B.f(B.ell(0, -10, 11, 3), '#ffffff').f(B.rect(-6, -16, 7, 6), '#d8453a').f(B.poly([[-7, -16], [-2.5, -20], [2, -16]]), '#f4f6f8').f(B.rect(-4, -14, 2, 2), '#ffe08a');
      B.f(B.poly([[5, -10], [9, -10], [7, -22]]), '#3a7a42').f(B.poly([[5.6, -13], [8.4, -13], [7, -20]]), '#5a9a5a', .8);
      for (let i = 0; i < 10; i++) B.f(B.circ(-9 + r() * 18, -30 + r() * 18, .8), '#ffffff', .9);
      B.f(B.ell(-6, -27, 3, 4.4), '#ffffff', .6);
      tag(B, 10, -6, .3);
    } },
  };
  function H_lit(B, x0, x1, c) { return GardenPaintedDecor.opts ? B.lin(x0, 0, x1, 0, [[0, '#e8e2d0'], [.4, c], [1, '#8e8670']]) : c; }
})());
