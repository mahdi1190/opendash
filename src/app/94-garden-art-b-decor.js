/* ============================================================
   GARDEN ART, decorations II (2.18, agent 'garden-art'): structures (rose
   arch, pergola, gazebo, potting shed, cold frame, obelisk, windmill, weather
   vane, sundial, dovecote, wheelbarrow), wildlife homes (bird feeder, bird
   box, bug hotel, hedgehog house, beehive, compost bin), ornaments (four
   gnomes: waving, fishing, napping, reading; scarecrow, stone frog, stone owl,
   flamingo, topiary peacock, stone hare, gazing ball, wind chimes, signpost,
   welcome sign, letterbox), planters (terracotta pots, hanging basket, wooden
   planter, old watering can, stone urn) and the seasonal things (jack-o'-
   lantern, leaf pile, hay bale, snowman, festive lights, bunting, painted
   eggs). PURE. No text anywhere: signs carry painted pictures.
   Art units, anchor at the front edge of the footprint; variant is the style.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const lc = (o, fb) => (o.look && o.look.c) || fb;
  const lc2 = (o, fb) => (o.look && o.look.c2) || fb;
  const lit = o => o.night || o.dusk;
  const snowLine = (x0, x1, y, w) => A.P(PAL.snow, `M${f1(x0)} ${f1(y + 0.6)}Q${f1((x0 + x1) / 2)} ${f1(y - (w || 2.4))} ${f1(x1)} ${f1(y + 0.6)}z`, 0.95);
  const glow = (o, r, x, y, R, col) => (lit(o) ? `<g class="gda-glow" style="${A.T(r, 0, 3)}">${A.P(col, A.circ(x, y, R), o.night ? 0.24 : 0.14) + A.P(col, A.circ(x, y, R * 0.55), o.night ? 0.32 : 0.18)}</g>` : '');
  /** A little cluster of flowers (rose arch, baskets, planters): n five-dot flowers in col over leaves. */
  function posy(r, cx, cy, w, h, n, col, leaf) {
    let lv = '', fl = '', eye = '';
    for (let i = 0; i < n; i++) { const x = cx + rr(r, -w, w), y = cy + rr(r, -h, h); lv += A.leaf(x, y + 2, rr(r, -2, 2), 4, 1.5); for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; fl += A.circ(x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5, 1.3); } eye += A.circ(x, y, 0.7); }
    return A.P(leaf || '#4f8a3a', lv) + A.P(col, fl) + A.P('#f6e070', eye);
  }
  const shingle = (x0, y0, x1, y1, n, c) => { let d = ''; for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; d += `M${f1(x0 + (x1 - x0) * t - 2)} ${f1(y0 + (y1 - y0) * t)}l4 0`; } return A.S(c, 0.8, d, 0.6); };

  /* ================= structures ================= */
  const ROSES = [['#a82a24', '#d2283c'], ['#d86a8a', '#f29bb6'], ['#e8e0d8', '#fbf5ee']];
  gartDefine('decor:rose-arch', {
    box: [128, 110], fit: 'none',
    draw(o, r) {
      const frame = lc(o, '#f4f1ea'), [rd, rc] = ROSES[o.variant % 3], win = o.season === 'winter';
      let s = A.shadow(46, 6) + A.S(A.dk(frame, 0.2), 4, 'M-40 0V-70Q-40 -106 0 -106Q40 -106 40 -70V0') + A.S(frame, 3, 'M-40 0V-70Q-40 -106 0 -106Q40 -106 40 -70V0') + A.S(frame, 1.4, 'M-40 -24h80M-40 -48h80M-36 -86h72', 0.5);
      // the climbing rose: leafy along both posts and over the top, roses scattered (hips in winter)
      let lv = '', roses = '', rosesD = '';
      for (let i = 0; i < 26; i++) {
        const t = i / 25, ang = Math.PI * t, x = t < 0.33 ? -40 : t > 0.66 ? 40 : -40 * Math.cos((t - 0.33) / 0.33 * Math.PI), y = t < 0.33 ? -t / 0.33 * 70 : t > 0.66 ? -(1 - t) / 0.34 * 70 : -70 - Math.sin((t - 0.33) / 0.33 * Math.PI) * 36;
        lv += A.blob(r, x + rr(r, -4, 4), y + rr(r, -3, 3), 6, 4.6, 7, 0.45);
        if (i % 2 === 0 && !win) { const rx = x + rr(r, -5, 5), ry = y + rr(r, -4, 4); rosesD += A.circ(rx, ry, 2.8); roses += A.circ(rx - 0.4, ry - 0.5, 1.8); }
        else if (win && i % 3 === 0) roses += A.ell(x + rr(r, -4, 4), y, 1.3, 1.6);
      }
      const L = win ? ['#5a5a3a', '#7a7a54'] : o.season === 'autumn' ? ['#4a5a26', '#7a8a34'] : ['#2f5a2a', '#4a7f34'];
      s += A.P(L[0], lv) + A.P(L[1], lv.replace(/M([-\d.]+) ([-\d.]+)/g, (m, x, y) => `M${f1(+x - 1)} ${f1(+y - 1.4)}`), 0.6) + A.P(win ? '#c8442a' : rd, rosesD) + A.P(win ? '#c8442a' : rc, roses);
      if (win) s += snowLine(-30, 30, -106, 4);
      return s;
    },
  });
  gartDefine('decor:pergola', {
    box: [128, 120], fit: 'none',
    draw(o, r) {
      const wood = lc(o, '#a87c4f'), vine = lc2(o, '#6fae4a'), dk = A.dk(wood, 0.25), win = o.season === 'winter';
      // four posts (two in front, two behind), beams and rafters on top, a vine trailing over
      let s = A.shadow(60, 10) + A.P(dk, A.rect(-46, -114, 5, 74) + A.rect(41, -114, 5, 74));
      s += A.P(wood, A.rect(-56, -110, 112, 5)) + A.P(dk, A.rect(-56, -105, 112, 1.6));
      let rafters = '';
      for (let i = 0; i < 7; i++) rafters += A.poly([[-50 + i * 16.6, -118], [-46 + i * 16.6, -118], [-48 + i * 16.6 + 4, -104], [-52 + i * 16.6 + 4, -104]]);
      s += A.P(A.lt(wood, 0.15), rafters);
      s += A.P(wood, A.rect(-56, -86, 112, 5)) + A.P(wood, A.rect(-54, -84, 6, 84) + A.rect(48, -84, 6, 84)) + A.P(A.lt(wood, 0.3), A.rect(-54, -84, 1.6, 84) + A.rect(48, -84, 1.6, 84), 0.6);
      let lv = '', grapes = '';
      if (!win) {
        for (let i = 0; i < 24; i++) { const x = rr(r, -54, 54), y = rr(r, -116, -82); lv += A.blob(r, x, y, 5, 3.6, 6, 0.5); }
        for (let i = 0; i < 6; i++) { const x = -50 + i * 2 + (i % 2) * 2, y = -80 + i * 10; lv += A.blob(r, x, y, 4.4, 3.4, 6, 0.5); }
        if (o.season === 'autumn' || o.season === 'summer') for (let k = 0; k < 3; k++) { const x = -30 + k * 26; for (let j = 0; j < 6; j++) grapes += A.circ(x + (j % 3 - 1) * 2, -80 + Math.floor(j / 3) * 2.4 + (j % 2), 1.3); }
      }
      const vc = o.season === 'autumn' ? '#c8742a' : vine;
      s += A.P(A.dk(vc, 0.2), lv) + A.P(A.lt(vc, 0.15), lv.replace(/M([-\d.]+) ([-\d.]+)/g, (m, x, y) => `M${f1(+x - 1)} ${f1(+y - 1)}`), 0.5) + A.P('#5a2a6a', grapes);
      if (win) s += snowLine(-56, 56, -118, 3);
      return s;
    },
  });
  gartDefine('decor:gazebo', {
    box: [128, 132], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#f4f1ea'), roof = lc2(o, '#5a7f9a'), dk = A.dk(c, 0.2), win = o.season === 'winter';
      // an octagonal summerhouse: a raised floor, slim posts with railings, an ogee roof and a finial
      let s = A.shadow(62, 10) + A.P(A.dk(c, 0.3), 'M-56 -8h112v-8h-112z') + A.P(c, 'M-58 -16h116l-6 -6h-104z') + A.P(dk, A.rect(-56, -8, 112, 8), 0.7);
      const posts = [-50, -18, 18, 50];
      // the shaded inside first, so the slim white posts and railings read against it
      s += A.P('#3a4a4a', A.rect(-50, -84, 100, 62), 0.22) + A.P(A.dk(roof, 0.3), A.rect(-50, -84, 100, 8), 0.3);
      posts.forEach(x => { s += A.P(dk, A.rect(x - 2.4, -84, 4.8, 62)) + A.P(c, A.rect(x - 2.4, -84, 3.2, 62)); });
      let rail = '';
      for (let i = 0; i < 3; i++) { const x0 = posts[i] + 2.4, x1 = posts[i + 1] - 2.4; if (i === 1) continue; for (let x = x0 + 3; x < x1; x += 5) rail += `M${f1(x)} -24v-14`; rail += `M${f1(x0)} -38h${f1(x1 - x0)}`; }
      s += A.S(dk, 1.8, rail) + A.S(c, 1.1, rail);
      s += A.P(roof, 'M-64 -84Q-40 -96 -18 -112Q0 -128 18 -112Q40 -96 64 -84z') + A.P(A.dk(roof, 0.2), 'M0 -126Q18 -112 40 -98Q52 -90 64 -84H0z', 0.5) + A.P(c, A.rect(-64, -86, 128, 3)) + A.P(dk, 'M-64 -83h128l-2 3h-124z');
      s += A.S(A.lt(roof, 0.35), 1, 'M-40 -92Q-20 -104 -8 -118M-20 -90Q-6 -104 -2 -122', 0.6) + A.P('#c9a24a', A.circ(0, -130, 2.6) + A.rect(-0.8, -136, 1.6, 6));
      if (lit(o)) s += glow(o, r, 0, -56, 30, '#ffd88a') + A.P('#ffe8a0', A.circ(0, -64, 3));
      if (win) s += A.P(PAL.snow, 'M-62 -86Q-40 -98 -18 -114Q0 -130 18 -114Q40 -98 62 -86Q40 -92 18 -106Q0 -120 -18 -106Q-40 -92 -62 -86z');
      return s;
    },
  });
  const SHED = [['#6f8f6a', '#a87c4f'], ['#6a8ab4', '#f4f1ea'], ['#a87c4f', '#7a5636']];
  gartDefine('decor:potting-shed', {
    box: [128, 104], fit: 'none',
    draw(o, r) {
      const [c, trim] = SHED[o.variant % 3], dk = A.dk(c, 0.22), win = o.season === 'winter';
      // clapboard walls, a door, a window full of seedlings, a pent roof, a rain barrel and pots outside
      let s = A.shadow(62, 9) + A.P(dk, A.rect(-52, -84, 104, 84)) + A.P(c, A.rect(-50, -82, 100, 82));
      let boards = '';
      for (let y = -78; y < 0; y += 6) boards += `M-50 ${y}h100`;
      s += A.S(dk, 0.7, boards, 0.6) + A.P(A.lt(c, 0.25), A.rect(-50, -82, 30, 82), 0.25);
      s += A.P(trim, A.rect(12, -58, 26, 58)) + A.P(A.dk(trim, 0.15), A.rect(14, -56, 22, 56)) + A.P('#c9a24a', A.circ(32, -28, 1.4)) + A.S(trim, 1.2, 'M14 -40h22', 0.6);
      s += A.P(trim, A.rect(-40, -62, 34, 26)) + A.P(lit(o) ? '#ffe8a0' : '#a8d0e0', A.rect(-37, -59, 28, 20)) + A.S(trim, 1.4, 'M-23 -59v20M-37 -49h28');
      s += A.P('#4f8a3a', A.ell(-32, -40, 3, 1.6) + A.ell(-24, -40, 3, 1.6) + A.ell(-16, -40, 3, 1.6)) + A.P('#c86a3e', A.rect(-35, -40, 6, 3) + A.rect(-27, -40, 6, 3) + A.rect(-19, -40, 6, 3));
      s += A.P('#5a4a3a', 'M-60 -82L-56 -98H60L58 -82z') + A.P('#7a6a5a', 'M-56 -98H60L59 -94H-57z') + shingle(-58, -96, 58, -96, 12, '#4a3a2a');
      s += A.P('#c86a3e', 'M-60 -10h8l-1 10h-6z') + A.P('#4f8a3a', A.blob(r, -56, -12, 5, 3.4, 6, 0.5)) + A.P('#e86a8a', A.circ(-56, -14, 1.4) + A.circ(-54, -12, 1.2));
      if (lit(o)) s += glow(o, r, -23, -49, 22, '#ffd88a');
      if (win) s += A.P(PAL.snow, 'M-60 -98L-56 -102H60L60 -98z') + A.P(PAL.snow, A.rect(-40, -63, 34, 2));
      return s;
    },
  });
  gartDefine('decor:cold-frame', {
    box: [128, 36], fit: 'none',
    draw(o, r) {
      const wood = lc(o, '#a87c4f'), glass = lc2(o, '#cfe6f2');
      // a low wooden box with a sloping glass lid propped open; seedlings inside
      let s = A.shadow(58, 5) + A.P(A.dk(wood, 0.2), 'M-54 0V-16L-50 -26H50L54 -16V0z') + A.P(wood, 'M-54 0V-14H54V0z') + A.S(A.dk(wood, 0.25), 0.8, 'M-54 -7h108', 0.6);
      s += A.P('#4f8a3a', A.ell(-36, -16, 4, 2) + A.ell(-20, -17, 4, 2.2) + A.ell(-4, -16, 4, 2) + A.ell(12, -17, 4, 2.2) + A.ell(28, -16, 4, 2));
      s += A.P(glass, 'M-52 -16L-46 -34H48L52 -16z', 0.55) + A.S('#ffffff', 1.2, 'M-40 -30L-30 -18M-6 -32L4 -18M26 -32L34 -20', 0.6) + A.S(wood, 1.6, 'M-52 -16L-46 -34H48L52 -16M0 -34V-16') + A.S(A.dk(wood, 0.2), 1.6, 'M44 -18L48 -34');
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-48 -33H46L46 -31H-48z', 0.9);
      return s;
    },
  });
  gartDefine('decor:sundial', {
    box: [64, 46], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c7c2b8'), brass = lc2(o, '#c98a12');
      let s = A.shadow(16, 4) + A.P(A.dk(c, 0.15), 'M-14 0h28l-2-5h-24z') + A.P(c, 'M-7 -5q-2-14 -3-28h20q-1 14-3 28z') + A.P(A.lt(c, 0.3), 'M-6 -7q-1.4-12-2-24h3q0 12 0.6 24z', 0.6) + A.S(A.dk(c, 0.15), 1, 'M-8 -18h16M-8 -24h16', 0.5);
      s += A.P(A.dk(c, 0.15), A.ell(0, -34, 16, 4.6)) + A.P(c, A.ell(0, -36, 16, 4)) + A.P(brass, A.ell(0, -36.6, 12, 3)) + A.S(A.dk(brass, 0.3), 0.6, 'M-10 -36.6h20M0 -39.4v5.6M-7 -38.6l14 4M-7 -34.6l14-4', 0.6);
      s += A.P(A.dk(brass, 0.2), 'M-1 -36.6L6 -48L6 -36.6z') + A.P(brass, 'M-1 -36.6L5 -47L5 -36.6z');
      // the shadow on the dial follows the light: none at night
      if (!o.night) s += A.S('#5a4a2a', 1.2, o.dusk ? 'M0 -36.6l-9 1' : 'M0 -36.6l-6 2.6', 0.6);
      if (o.season === 'winter') s += A.P(PAL.snow, A.ell(-6, -37.6, 6, 1.6), 0.9);
      return s;
    },
  });
  const BARROW = [['#3f7a5a', '#a87c4f'], ['#c84a3a', '#a87c4f']];
  gartDefine('decor:wheelbarrow', {
    box: [64, 34], fit: 'none',
    draw(o, r) {
      const [c, wood] = BARROW[o.variant % 2];
      const k = o.r === 2 ? -1 : 1;
      if (o.r % 2 === 1) {
        // seen end-on: the tray, the wheel in front, the handles behind
        return A.shadow(16, 3) + A.S(wood, 2, 'M-10 -16L-14 -30M10 -16L14 -30') + A.P(c, 'M-15 -26H15L11 -12H-11z') + A.P(A.dk(c, 0.2), 'M-15 -26H15L14 -24H-14z') + posy(r, 0, -28, 9, 2, 5, '#f39c12') + A.P('#3a3a3a', A.ell(0, -6, 3, 6)) + A.P('#9a9a9a', A.ell(0, -6, 1.2, 3));
      }
      // side view: a wheel at the front, a tilted tray full of marigolds, legs and handles
      let s = A.shadow(26, 3) + A.S(wood, 2.2, `M${-6 * k} -14L${-26 * k} -22M${-10 * k} -14V0`) + A.P(c, `M${-18 * k} -26H${16 * k}L${10 * k} -10H${-12 * k}z`) + A.P(A.dk(c, 0.2), `M${-18 * k} -26H${16 * k}L${15 * k} -23H${-17 * k}z`);
      s += posy(r, 0, -28, 13, 2.4, 7, ['#f39c12', '#e86a8a'][o.variant % 2]);
      s += A.P('#3a3a3a', A.circ(14 * k, -7, 7)) + A.P('#8a8a8a', A.circ(14 * k, -7, 2.6)) + A.S('#5a5a5a', 0.8, `M${14 * k} -14v14M${7 * k} -7h14`, 0.7);
      if (o.season === 'winter') s += snowLine(-17, 15, -29, 2.4);
      return s;
    },
  });

  gartDefine('decor:bug-hotel', {
    box: [64, 60], fit: 'none',
    draw(o, r) {
      const wood = lc(o, '#a87c4f'), fill = lc2(o, '#c9a26a');
      // a wooden house of compartments: pine cones, bamboo tubes, logs drilled with holes, straw
      let s = A.shadow(20, 3) + A.P(A.dk(wood, 0.3), A.rect(-18, -46, 36, 46)) + A.P('#7a4a3a', 'M-22 -44L0 -58L22 -44L20 -42L0 -55L-20 -42z');
      s += A.P(wood, A.rect(-18, -46, 36, 2) + A.rect(-18, -24, 36, 2) + A.rect(-1, -46, 2, 46) + A.rect(-18, -46, 2, 46) + A.rect(16, -46, 2, 46));
      let tubes = '', holes = '', cones = '', straw = '';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { tubes += A.circ(-13 + i * 3.4, -40 + j * 5.4, 1.6); holes += A.circ(-13 + i * 3.4, -40 + j * 5.4, 0.7); }
      for (let i = 0; i < 3; i++) cones += A.ell(5 + i * 4, -36 + (i % 2) * 6, 2.2, 3);
      for (let i = 0; i < 10; i++) straw += `M${-15 + i * 1.4} -4l1.6-16`;
      s += A.P('#d8c48a', tubes) + A.P('#3a2a1a', holes) + A.P('#7a5a34', cones) + A.S('#5a3a20', 0.5, cones, 0.8) + A.S('#e0c87a', 0.8, straw) + A.P('#8a6a4a', A.circ(9, -12, 6)) + A.P('#b08a5a', A.circ(9, -12, 4.6)) + A.P('#2a1a10', A.circ(7, -13, 0.8) + A.circ(11, -11, 0.8) + A.circ(9, -15, 0.7));
      if (o.season !== 'winter' && o.anim) s += `<g class="gda-bob" style="${A.T(r, 0, 3)}">${A.P('#d8202b', A.ell(14, -27, 1.8, 1.4)) + A.P('#1a1a1a', A.circ(13.4, -27.4, 0.4) + A.circ(14.8, -26.6, 0.4))}</g>`;
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-22 -44L0 -58L22 -44L19 -44L0 -55.6L-19 -44z');
      return s;
    },
  });
  gartDefine('decor:hedgehog-house', {
    box: [64, 32], fit: 'none',
    draw(o, r) {
      const wood = lc(o, '#7a5636'), straw = lc2(o, '#c9a26a');
      // a low wooden dome thatched with leaves, a round door, a tunnel entrance
      let s = A.shadow(26, 4) + A.P(A.dk(wood, 0.2), 'M-24 0Q-24 -28 0 -28Q24 -28 24 0z') + A.P(wood, 'M-22 0Q-22 -25 0 -25Q22 -25 22 0z');
      let slats = '';
      for (let i = -3; i <= 3; i++) slats += `M${i * 6} -1Q${i * 6.4} -14 ${i * 2} -24`;
      s += A.S(A.dk(wood, 0.25), 0.7, slats, 0.6) + A.P('#1a120a', 'M-6 0v-7a6 6 0 0 1 12 0v7z') + A.P(A.dk(wood, 0.35), 'M-7.4 0v-7a7.4 7.4 0 0 1 14.8 0v7h-1.4v-7a6 6 0 0 0 -12 0v7z');
      let leaves = '';
      for (let i = 0; i < 9; i++) leaves += A.leaf(rr(r, -18, 18), -rr(r, 14, 26), r() * 6, 5, 1.8);
      s += A.P(o.season === 'winter' ? '#9a8a6a' : o.season === 'autumn' ? '#d9671c' : straw, leaves, 0.9) + A.P('#a8542a', leaves.split('z').slice(0, 3).join('z') + (leaves ? 'z' : ''), 0.8);
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-20 -14Q-16 -30 0 -30Q16 -30 20 -14Q12 -24 0 -24Q-12 -24 -20 -14z');
      return s;
    },
  });
  gartDefine('decor:beehive', {
    box: [64, 62], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#f4f1ea'), honey = lc2(o, '#e8c33a');
      // a white stacked hive (three boxes) on legs, a gabled lid, the entrance with bees
      let s = A.shadow(18, 3) + A.P('#8a6a4a', A.rect(-14, -10, 3, 10) + A.rect(11, -10, 3, 10)) + A.P(A.dk(c, 0.15), A.rect(-16, -12, 32, 3));
      for (let k = 0; k < 3; k++) { const y = -12 - (k + 1) * 13; s += A.P(c, A.rect(-15, y, 30, 12.4)) + A.P(A.dk(c, 0.12), A.rect(-15, y + 11, 30, 1.4)) + A.P(A.dk(c, 0.1), A.rect(6, y, 9, 12.4), 0.6); }
      s += A.P(A.dk(c, 0.2), 'M-19 -51L0 -60L19 -51L17 -50L0 -57.6L-17 -50z') + A.P(c, 'M-17 -51L0 -58L17 -51z');
      s += A.P('#3a2a1a', A.rect(-6, -14.6, 12, 2)) + A.P(honey, A.rect(-15, -24, 6, 3), 0.8);
      if (o.season !== 'winter' && !o.night) { const bees = A.P('#2a2420', A.ell(-6, -18, 1.6, 1.1) + A.ell(5, -22, 1.6, 1.1) + A.ell(-12, -28, 1.6, 1.1)) + A.P('#f2c23a', A.rect(-6.4, -19, 0.8, 2) + A.rect(4.6, -23, 0.8, 2) + A.rect(-12.4, -29, 0.8, 2)) + A.P('#eef8fa', A.ell(-6, -19.6, 1.4, 0.8) + A.ell(5, -23.6, 1.4, 0.8) + A.ell(-12, -29.6, 1.4, 0.8), 0.85); s += o.anim ? `<g class="gart-buzz" style="${A.T(r, 0, 5)}">${bees}</g>` : bees; }
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-19 -51L0 -60L19 -51L16 -51L0 -58L-16 -51z');
      return s;
    },
  });
  gartDefine('decor:compost-bin', {
    box: [64, 54], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#3f5a3a'), c2 = lc2(o, '#6f5232');
      // a slatted wooden bay, peelings and grass clippings heaped inside, a little warm steam on cold days
      let s = A.shadow(22, 3) + A.P(A.dk(c2, 0.3), A.rect(-22, -42, 44, 42));
      s += A.P('#5a3a20', A.blob(r, 0, -38, 18, 8, 9, 0.4)) + A.P('#8ab84a', A.ell(-8, -42, 5, 2) + A.ell(6, -44, 4, 1.8), 0.9) + A.P('#f28a1a', A.leaf(-2, -42, 1.2, 4, 1.4)) + A.P('#e8c84a', A.leaf(10, -41, -1, 3.6, 1.2)) + A.P('#a8542a', A.ell(-14, -40, 2.4, 1.2));
      for (let k = 0; k < 5; k++) s += A.P(k % 2 ? c2 : A.lt(c2, 0.1), A.rect(-22, -8 - k * 7.6, 44, 6.6));
      s += A.P(c, A.rect(-24, -42, 4, 42) + A.rect(20, -42, 4, 42));
      if (o.season === 'winter' || o.season === 'autumn') s += A.S('#ffffff', 1.4, 'M-4 -46q-2-4 0-8q2-4 0-8M6 -46q2-4 0-7', 0.4);
      return s;
    },
  });

  /* ================= ornaments ================= */
  const GNOME = ['waving', 'fishing', 'napping', 'reading'];
  gartDefine('decor:gnome', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const hat = lc(o, '#d83a3a'), coat = lc2(o, '#3f6fa8'), pose = GNOME[o.variant % 4];
      const skin = '#f2c8a8', beard = '#f4f1ea', boots = '#5a3a20';
      let s = A.shadow(12, 2.6);
      if (pose === 'napping') {
        // lying on his side with his hat over his eyes, a little Zzz bubble
        s += A.P(coat, A.ell(0, -6, 14, 6)) + A.P(boots, A.ell(13, -3, 3.4, 2.4)) + A.P(skin, A.circ(-14, -8, 4.4)) + A.P(beard, 'M-18 -6q4 6 9 2q-3-1-4-4z') + A.P(hat, 'M-17 -12q-2-8 -14 -6q6 2 12 10z') + A.P('#ffffff', A.circ(-6, -22, 1.6) + A.circ(-2, -27, 1.2) + A.circ(1, -31, 0.9), 0.85);
        if (o.anim) s = `<g class="gda-bob" style="${A.T(r, 0, 3)}">${s}</g>`;
        return s;
      }
      const body = A.P(boots, A.ell(-4, -1.2, 3.6, 2) + A.ell(4, -1.2, 3.6, 2)) + A.P(coat, 'M-8 -2q-1-12 8-14q9 2 8 14z') + A.P('#3a2a1a', A.rect(-8, -7, 16, 1.8)) + A.P(skin, A.circ(0, -19, 4.6)) + A.P(beard, 'M-5 -18q0 9 5 10q5-1 5-10q-5 3-10 0z') + A.P('#e8806a', A.circ(0, -18.6, 1.4)) + A.P(hat, 'M-6 -21q2-14 10-18q-2 8-2 18z') + A.P(A.dk(hat, 0.2), 'M-6 -21h12l-1 2h-10z');
      s += body;
      if (pose === 'waving') s += A.P(coat, 'M6 -12l6-8 2 1.6-5 8z') + A.P(skin, A.circ(13.4, -21, 2));
      if (pose === 'fishing') s += A.P(coat, 'M6 -11l5-3 1 2-5 3z') + A.S('#7a5636', 1, 'M11 -14L26 -34') + A.S('#e8e4d8', 0.4, 'M26 -34Q28 -20 27 -6') + A.P('#d83a3a', A.circ(27, -6, 1.4)) + A.P('#7fb3d8', A.ell(26, -2, 8, 2), 0.7);
      if (pose === 'reading') s += A.P('#c84a3a', 'M-6 -13l6 2v8l-6-2z') + A.P('#3a6fc4', 'M6 -13l-6 2v8l6-2z') + A.P('#f4efe4', 'M-5 -12.4l5 1.6v6.6l-5-1.6zM5 -12.4l-5 1.6v6.6l5-1.6z', 0.9) + A.P(skin, A.circ(-6, -9, 1.6) + A.circ(6, -9, 1.6));
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-1 -37q3-2 4 1z') + A.P(PAL.snow, A.ell(0, -2, 9, 1.4), 0.9);
      return s;
    },
  });
  gartDefine('decor:scarecrow', {
    box: [64, 98], fit: 'none',
    draw(o, r) {
      const straw = lc(o, '#c9a26a'), shirt = lc2(o, '#3f6fa8');
      // a cross of poles, a checked shirt, a sack face with a stitched smile, a floppy hat, a crow friend
      let s = A.shadow(14, 3) + A.P('#7a5636', A.rect(-2, -84, 4, 84) + A.rect(-26, -62, 52, 3.6));
      s += A.P(shirt, 'M-24 -64h48l-4 8h-8v24h-24v-24h-8z') + A.S(A.dk(shirt, 0.3), 1, 'M-14 -60v28M-6 -60v28M2 -60v28M10 -60v28M-12 -50h24M-12 -40h24', 0.5) + A.P('#a83a2a', A.rect(-12, -34, 24, 4));
      s += A.P(straw, 'M-26 -60l-4 6 3-1 1 4 2-5 2 2z') + A.P(straw, 'M26 -60l4 6-3-1-1 4-2-5-2 2z') + A.P(straw, 'M-10 -30l-2 8 4-4 2 6 2-6 4 4-2-8z');
      s += A.P('#e8d4a8', A.circ(0, -72, 8)) + A.S('#5a3a20', 0.8, 'M-4 -69q4 3 8 0') + A.P('#3a2a1a', A.circ(-3, -74, 1) + A.circ(3, -74, 1)) + A.P('#e0602a', 'M0 -72l3 1-3 1z');
      s += A.P('#6a5a3a', A.ell(0, -79, 13, 2.6)) + A.P('#7a6a4a', 'M-7 -79q0-9 7-9q7 0 7 9z') + A.P('#c83a2a', A.rect(-7, -81, 14, 2));
      s += A.P('#1a1a1a', 'M18 -66q4-4 9-1l2 0-2 1q-3 2-9 0z') + A.P('#e8a02a', 'M28 -66l2 0.6-2 0.6z');
      if (o.season === 'winter') s += A.P(PAL.snow, A.ell(0, -88, 7, 1.6) + A.ell(-18, -65, 6, 1) + A.ell(18, -65, 6, 1));
      return s;
    },
  });
  gartDefine('decor:stone-frog', {
    box: [64, 22], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a9a7a'), c2 = lc2(o, '#5f6f4f');
      let s = A.shadow(12, 2.6) + A.P(c2, 'M-12 0q-2-10 8-12q10-2 14 4q4 6 2 8z') + A.P(c, 'M-10 -1q-1-9 7-10q8-1 11 4q2 5 1 6z');
      s += A.P(c, A.circ(-4, -12, 3.6) + A.circ(4, -12.4, 3.6)) + A.P('#2a2a2a', A.circ(-4, -12.4, 1.3) + A.circ(4, -12.8, 1.3)) + A.P('#ffffff', A.circ(-4.4, -13, 0.4) + A.circ(3.6, -13.4, 0.4)) + A.S(c2, 0.8, 'M-4 -6q4 3 8 0') + A.P(c2, A.ell(-11, -1, 4, 1.6) + A.ell(11, -1, 4, 1.6));
      s += A.P('#9ab06a', A.ell(-6, -4, 2, 1) + A.ell(6, -8, 1.6, 0.8), 0.7) + A.P('#d8c87a', A.circ(2, -3, 0.9), 0.6);
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-7 -14q4-3 7 0q4-3 7 0q-7 1-14 0z');
      return s;
    },
  });
  gartDefine('decor:stone-owl', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#a9a29a'), c2 = lc2(o, '#7a7268');
      let s = A.shadow(12, 2.6) + A.P(c2, A.rrect(-11, -6, 22, 6, 2)) + A.P(c, 'M-9 -6q-3-16 2-26l3 4h8l3-4q5 10 2 26z') + A.P(A.dk(c, 0.1), 'M2 -6q4-12 2-22l3-4q5 10 2 26z', 0.6);
      s += A.P(A.lt(c, 0.25), A.circ(-4, -24, 4.4) + A.circ(4, -24, 4.4)) + A.P(c2, A.circ(-4, -24, 2) + A.circ(4, -24, 2)) + A.P('#2a2a2a', A.circ(-4, -24, 1) + A.circ(4, -24, 1)) + A.P(c2, 'M-1 -21l1 3 1-3z');
      s += A.S(c2, 0.7, 'M-5 -14q1 2 2 0M0 -12q1 2 2 0M-4 -9q1 2 2 0M2 -16q1 2 2 0', 0.7) + A.P('#9ab06a', A.ell(5, -7, 3, 1.2), 0.6);
      // at night its eyes catch the light
      if (o.night) s += A.P('#f2d070', A.circ(-4, -24, 1) + A.circ(4, -24, 1));
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-7 -30q7-3 14 0l-3 2h-8z');
      return s;
    },
  });
  gartDefine('decor:topiary-peacock', {
    box: [64, 88], fit: 'none',
    draw(o, r) {
      const L = A.leaf4(lc(o, '#3f7a3a'));
      // a clipped box peacock on a round hedge plinth: the tail a great scalloped fan behind, the body upright, a crest
      let fan = 'M0 -30', scal = '';
      for (let k = 0; k <= 10; k++) { const a = -1.45 + k * 0.29, [x, y] = A.at(0, -30, a, 34); fan += `L${f1(x)} ${f1(y)}`; scal += A.circ(x, y, 4.4); }
      fan += 'z';
      let eyes = '';
      for (let k = 1; k < 10; k += 2) { const [x, y] = A.at(0, -30, -1.45 + k * 0.29, 26); eyes += A.ell(x, y, 2.4, 2); }
      let tex = '';
      for (let i = 0; i < 16; i++) { const a = rr(r, -1.4, 1.4), q = rr(r, 6, 30), [x, y] = A.at(0, -30, a, q); tex += A.ell(x, y, 1.6, 1.2); }
      let s = A.shadow(24, 4) + A.P('#a86a3e', A.rect(-14, -8, 28, 8)) + A.P('#c88a5e', A.rect(-14, -8, 28, 2));
      s += A.P(L[0], scal) + A.P(L[0], fan) + A.P(L[1], A.ell(0, -40, 26, 18), 0.5) + A.P(L[2], eyes, 0.7) + A.P(L[1], tex, 0.7);
      s += A.P(L[0], A.ell(0, -16, 18, 9)) + A.P(L[1], A.ell(-3, -18, 14, 6), 0.8);
      s += A.P(L[1], 'M-8 -22q-4-14 2-22q2-10 0-18q4-4 8 0q-2 8 0 16q6 10 2 24z') + A.P(L[2], 'M-6 -24q-2-12 2-18q1-8 0-14q2-1 3 0q-1 8 0 14q-2 8-2 18z', 0.6) + A.P(L[1], A.circ(2, -66, 4.2)) + A.P(L[3], A.ell(0.6, -67, 1.6, 1.2), 0.6) + A.S(L[1], 1.2, 'M1 -70l-2-6M2 -70l0-7M3 -70l2-6') + A.P(L[1], A.circ(-1, -76, 1) + A.circ(2, -77, 1) + A.circ(5, -76, 1)) + A.P('#5a4a2a', 'M6 -66l3 0.8-3 0.8z');
      if (o.season === 'winter') s += A.P(PAL.snow, A.ell(0, -62, 22, 2.4) + A.ell(0, -24, 14, 2) + A.ell(2, -70, 3, 1));
      if (o.season === 'spring') s += A.P(L[3], scal, 0.25);
      return s;
    },
  });
  gartDefine('decor:hare-statue', {
    box: [64, 68], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c7c2b8'), c2 = lc2(o, '#9d968a');
      // a stone hare sitting up on a plinth, gazing at the moon (its long ears back)
      let s = A.shadow(14, 3) + A.P(c2, A.rrect(-14, -12, 28, 12, 2)) + A.P(A.lt(c2, 0.2), A.rect(-14, -12, 28, 2.4));
      s += A.P(c, 'M-8 -12q-6-12 0-24q4-6 10-4q4 8 2 16q4 4 4 12z') + A.P(A.dk(c, 0.12), 'M4 -12q2-8-2-14q4 2 6 8q2 4 2 6z', 0.7);
      s += A.P(c, A.ell(4, -44, 5.6, 5)) + A.P(c, 'M2 -48q-6-14-2-20q4 4 4 18zM6 -48q2-14 8-18q0 8-6 18z') + A.P(A.dk(c, 0.15), 'M3 -50q-3-8-2-14q2 4 2 14z', 0.6) + A.P('#5a5a5a', A.circ(7, -45, 0.8)) + A.P(c2, A.ell(-8, -14, 4, 1.6));
      if (o.season === 'winter') s += A.P(PAL.snow, A.ell(0, -12.6, 13, 1.6) + A.ell(4, -49, 4, 1.2));
      return s;
    },
  });

  /* ================= planters ================= */
  const POTS = [['#e86a8a', '#4f8a3a'], ['#8aa0e8', '#5f8f6a'], ['#f6c445', '#4f8a3a']];
  gartDefine('decor:terracotta-pots', {
    box: [64, 30], fit: 'none',
    draw(o, r) {
      const T = PAL.terracotta, [fl, lf] = POTS[o.variant % 3];
      const pot = (x, w, h) => A.P(T[1], `M${f1(x - w * 0.45)} ${-h}h${f1(w * 0.9)}l${f1(-w * 0.1)} ${h}h${f1(-w * 0.7)}z`) + A.P(T[2], A.rrect(x - w / 2, -h - 3, w, 3.6, 0.8)) + A.P(T[3], A.rect(x - w * 0.36, -h + 1, w * 0.12, h - 2), 0.5);
      let s = A.shadow(26, 3) + pot(-14, 16, 12) + pot(8, 20, 14) + pot(22, 11, 8);
      // herbs: rosemary needles in one, a mound of thyme, a flowering one
      s += A.S('#3f6a4a', 1.2, 'M-18 -15l-2-10M-15 -15l0-12M-12 -15l2-9') + A.P(lf, A.blob(r, 8, -21, 9, 5, 9, 0.4)) + posy(r, 8, -24, 6, 2, 4, fl, lf) + A.P('#7a9a6a', A.blob(r, 22, -13, 5.4, 3, 7, 0.4)) + A.P('#c49ad8', A.circ(20, -15, 0.9) + A.circ(23, -16, 0.9) + A.circ(24, -13, 0.9));
      if (o.season === 'winter') s += A.P(PAL.snow, A.ell(8, -26, 8, 2) + A.ell(-14, -16, 6, 1.4));
      return s;
    },
  });
  const BEDDING = [['#f6c445', '#f28a1a'], ['#e86aa6', '#8a5ac8'], ['#e2443a', '#ffffff']];
  gartDefine('decor:planter-box', {
    box: [128, 36], fit: 'none',
    draw(o, r) {
      const wood = lc(o, '#a87c4f'), [a, b] = BEDDING[o.variant % 3];
      let s = A.shadow(54, 4) + A.P(A.dk(wood, 0.2), A.rect(-52, -20, 104, 20)) + A.P(wood, A.rect(-52, -20, 104, 6) + A.rect(-52, -12, 104, 5)) + A.S(A.dk(wood, 0.3), 0.6, 'M-52 -14h104M-52 -7h104', 0.6) + A.P(A.dk(wood, 0.35), A.rect(-52, -20, 4, 20) + A.rect(48, -20, 4, 20));
      if (o.season === 'winter') return s + A.P('#5a4a3a', A.rect(-48, -22, 96, 2)) + A.P('#2f5a3a', A.blob(r, -20, -24, 10, 4, 7, 0.4) + A.blob(r, 22, -24, 10, 4, 7, 0.4)) + A.P('#c8442a', A.circ(-18, -26, 1.4) + A.circ(24, -27, 1.4)) + A.P(PAL.snow, A.rect(-52, -21, 104, 2));
      s += A.P('#3f7a3a', A.blob(r, 0, -24, 48, 6, 14, 0.4));
      for (let i = 0; i < 11; i++) s += posy(r, -44 + i * 8.8, -26 - (i % 2) * 2, 2, 1, 1, i % 2 ? a : b, '#3f7a3a');
      return s;
    },
  });
  gartDefine('decor:old-watering-can', {
    box: [64, 30], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#7a9a8a'), fl = lc2(o, '#f6c445');
      // a dented old can lying on its side, marigolds spilling out of it
      let s = A.shadow(20, 3) + A.P(A.dk(c, 0.2), A.ell(-4, -10, 13, 9)) + A.P(c, A.ell(-5, -11, 12, 8.4)) + A.P(A.lt(c, 0.3), A.ell(-9, -15, 5, 2), 0.6) + A.S(c, 2, 'M-14 -20Q-6 -26 4 -18') + A.P(c, 'M6 -12L22 -22L23 -20L8 -9z') + A.P(A.dk(c, 0.15), A.ell(22.4, -21, 1.6, 2.4));
      s += A.P('#2a3a2a', A.ell(-15, -9, 3, 7)) + A.P('#4f8a3a', A.blob(r, -18, -10, 6, 5, 7, 0.5)) + posy(r, -19, -12, 4, 4, 4, fl, '#4f8a3a');
      if (o.season === 'winter') s += A.P(PAL.snow, A.ell(-5, -19, 9, 2));
      return s;
    },
  });
  gartDefine('decor:stone-urn', {
    box: [64, 66], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c7c2b8'), fl = lc2(o, '#9b7fd1');
      // a classical urn on a square plinth, a fountain of trailing flowers and ivy
      let s = A.shadow(18, 4) + A.P(A.dk(c, 0.15), A.rect(-12, -14, 24, 14)) + A.P(c, A.rect(-14, -16, 28, 3)) + A.P(c, 'M-4 -16q-2-6 -6-8h20q-4 2-6 8z');
      s += A.P(A.dk(c, 0.12), 'M-16 -26q-2 12 16 14q18-2 16-14z') + A.P(c, 'M-16 -26q0 9 16 11q16-2 16-11z') + A.P(c, A.rrect(-19, -32, 38, 6, 2)) + A.P(A.lt(c, 0.3), A.rect(-17, -31, 18, 1.4), 0.6) + A.S(A.dk(c, 0.2), 0.7, 'M-12 -24q12 6 24 0', 0.6);
      if (o.season === 'winter') return s + A.P('#3f5a3a', A.blob(r, 0, -36, 14, 5, 8, 0.4)) + A.P(PAL.snow, A.ell(0, -40, 14, 2.6));
      s += A.P('#3f7a3a', A.blob(r, 0, -40, 18, 10, 10, 0.4)) + A.S('#3f7a3a', 1.2, 'M-16 -32q-6 8-4 18M16 -32q6 8 4 16') + A.P('#5a9a4a', A.leaf(-20, -18, 3, 3, 1.2) + A.leaf(20, -20, 3, 3, 1.2));
      s += posy(r, 0, -44, 14, 6, 9, fl, '#3f7a3a') + A.P('#ffffff', A.circ(-6, -50, 1.2) + A.circ(8, -48, 1.2), 0.9);
      return s;
    },
  });

  /* ================= seasonal ================= */
  gartDefine('decor:carved-pumpkin', {
    box: [64, 30], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#ef7f1a'), warm = lc2(o, '#ffd36a'), face = o.variant % 3;
      const on = lit(o), inner = on ? warm : '#5a2a10';
      let s = A.shadow(16, 3) + glow(o, r, 0, -12, 24, '#ffb84a') + A.P(A.dk(c, 0.15), A.ell(-6, -11, 9, 10) + A.ell(6, -11, 9, 10)) + A.P(c, A.ell(0, -11, 9, 10.6)) + A.P(A.lt(c, 0.3), A.ell(-9, -14, 2.4, 4.6), 0.6) + A.S(A.dk(c, 0.2), 0.7, 'M-4 -20q-2 9 0 18M4 -20q2 9 0 18', 0.6) + A.P('#5a6a2a', 'M-1 -21q0-4 3-6l1 1q-2 2-2 5z');
      // three faces: the classic grin, a happy one, a surprised one (no scary ones in a calm garden)
      const eyes = face === 2 ? A.circ(-5, -14, 2.4) + A.circ(5, -14, 2.4) : face === 1 ? 'M-8 -13q3-4 6 0zM2 -13q3-4 6 0z' : 'M-8 -12l3-5 3 5zM2 -12l3-5 3 5z';
      const mouth = face === 2 ? A.ell(0, -6, 2.6, 3) : face === 1 ? 'M-7 -8q7 7 14 0q-7 3-14 0z' : 'M-8 -8q8 6 16 0l-2 2-2-1.4-2 2-2-2-2 2-2-2-2 1.4z';
      s += A.P(inner, eyes + mouth) + A.P(inner, 'M-1 -10l1-2.6 1 2.6z');
      if (on) s += `<g class="gda-flicker" style="${A.T(r, 0, 1.5)}">${A.P('#fff4c8', eyes + mouth, 0.5)}</g>`;
      return s;
    },
  });
  gartDefine('decor:leaf-pile', {
    box: [64, 22], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#d9671c'), c2 = lc2(o, '#a8432a');
      let back = '', mid = '', front = '';
      for (let i = 0; i < 26; i++) { const t = i / 25, x = rr(r, -20, 20) * (1 - t * 0.4), y = -rr(r, 0, 16) * (1 - Math.abs(x) / 24), a = r() * 6.28, d = A.leaf(x, y, a, 5 + r() * 2, 2); (i % 3 === 0 ? (back += d) : i % 3 === 1 ? (mid += d) : (front += d)); }
      let s = A.shadow(22, 3) + A.P(c2, A.blob(r, 0, -6, 20, 8, 9, 0.3)) + A.P(c2, back) + A.P(c, mid) + A.P('#e8a23a', front);
      // a hedgehog's nose poking out of the pile at dusk and night
      if (lit(o)) s += A.P('#8a6a4a', 'M14 -4q4-4 8 0z') + A.P('#2a2a2a', A.circ(21.6, -4, 0.8));
      if (o.season === 'winter') s += A.P(PAL.snow, A.blob(r, 0, -14, 14, 3, 8, 0.4), 0.95);
      return s;
    },
  });
  gartDefine('decor:hay-bale', {
    box: [64, 34], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#e8c96a'), c2 = lc2(o, '#c9a24a');
      let s = A.shadow(26, 4) + A.P(c2, A.rrect(-26, -30, 52, 30, 4)) + A.P(c, A.rrect(-26, -32, 52, 10, 4)) + A.P(c, A.rect(-26, -24, 52, 22), 0.5);
      let straws = '';
      for (let i = 0; i < 26; i++) straws += `M${f1(rr(r, -24, 22))} ${f1(rr(r, -30, -2))}l${f1(rr(r, 2, 5))} ${f1(rr(r, -1, 1))}`;
      s += A.S(A.dk(c2, 0.15), 0.6, straws, 0.7) + A.S('#a8743a', 1.6, 'M-10 -32V0M10 -32V0') + A.S(A.lt(c, 0.3), 0.8, 'M-24 -30h48', 0.7);
      s += A.S('#e8c96a', 0.8, 'M-26 -10l-4 2M-26 -20l-3-1M26 -14l4 1');
      if (o.season === 'winter') s += A.P(PAL.snow, A.rrect(-26, -34, 52, 5, 2.4));
      return s;
    },
  });
  const SCARF = [['#d83a3a', '#2f3438'], ['#3a6fc4', '#a83a2a'], ['#3f8a5a', '#e8c84a']];
  gartDefine('decor:snowman', {
    box: [64, 66], fit: 'none',
    draw(o, r) {
      const [scarf, hat] = SCARF[o.variant % 3], nose = lc2(o, '#ef7f1a'), white = '#fbfdff', shade = '#d4e0ea';
      let s = A.shadow(18, 4) + A.P(shade, A.circ(1.6, -14, 15)) + A.P(white, A.circ(0, -15, 14)) + A.P(shade, A.circ(1.2, -36, 10.4)) + A.P(white, A.circ(0, -37, 10)) + A.P(shade, A.circ(1, -53, 7.6)) + A.P(white, A.circ(0, -54, 7.2));
      s += A.P('#2a2a2a', A.circ(-2.6, -55.6, 1) + A.circ(2.6, -55.6, 1) + A.circ(0, -40, 1.2) + A.circ(0, -34, 1.2) + A.circ(0, -18, 1.4)) + A.P(nose, 'M0 -53l9 1.6-9 1.4z') + A.S('#2a2a2a', 0.8, 'M-3 -50q3 2 6 0', 0.8);
      s += A.P(scarf, A.rrect(-8, -48, 16, 4, 2)) + A.P(scarf, 'M4 -46l3 10h-4l-2-9z') + A.S('#ffffff', 0.6, 'M-6 -46h12', 0.5);
      s += o.variant % 3 === 1 ? A.P(hat, 'M-6 -60q0-8 6-8q6 0 6 8z') + A.P('#ffffff', A.circ(0, -69, 2)) : A.P(hat, A.rect(-8, -61, 16, 2) + A.rect(-5, -71, 10, 10)) + A.P(scarf, A.rect(-5, -64, 10, 2));
      s += A.S('#6a4a2a', 1.4, 'M-9 -38L-22 -44l-3-4M-22 -44l-4 1M9 -38L20 -32l4 1M20 -32l2 3');
      // the snowman is not at all sad about spring: he just grows a daisy in his hat brim and slowly smiles
      if (o.season !== 'winter') s += A.P('#ffffff', A.star(-5, -62, 6, 2, 1)) + A.P('#f2c21e', A.circ(-5, -62, 0.8));
      return s;
    },
  });
  gartDefine('decor:painted-eggs', {
    box: [64, 18], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#f2a7c8'), c2 = lc2(o, '#7fb3f0');
      // three painted eggs half hidden in the grass: stripes, dots, zig-zags
      let s = A.shadow(18, 2);
      const eggs = [[-12, c, 'stripe'], [2, c2, 'dots'], [14, '#f6d34a', 'zig']];
      eggs.forEach(([x, col, k]) => {
        s += A.P(col, A.ell(x, -6, 4.2, 5.6)) + A.P('#ffffff', A.ell(x - 1.4, -8.4, 1.2, 1.8), 0.6);
        if (k === 'stripe') s += A.S('#ffffff', 1, `M${x - 4} -6h8M${x - 3.4} -9h6.8`, 0.85);
        else if (k === 'dots') s += A.P('#ffffff', A.circ(x - 1.6, -5, 0.8) + A.circ(1.6 + x, -7, 0.8) + A.circ(x + 1, -3, 0.7), 0.9);
        else s += A.S('#e86a8a', 0.8, `M${x - 4} -6l2-1.6 2 1.6 2-1.6 2 1.6`);
      });
      s += A.S('#5f9a4a', 1, 'M-18 0l-2-6M-16 0l0-7M-6 0l-1-6M8 0l1-6M20 0l2-7M22 0l-1-5');
      return s;
    },
  });
})();
