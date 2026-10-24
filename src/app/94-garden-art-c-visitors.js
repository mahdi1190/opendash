/* ============================================================
   GARDEN ART, the visitors (2.18, agent 'garden-art'): insects (honeybee,
   bumblebee, cabbage white, peacock, red admiral, ladybird, dragonfly,
   glow-worms, moth), a snail, birds (robin, blue tit, blackbird, wren,
   goldfinch, wood pigeon, tawny owl, grey heron, kingfisher, mallard), pond
   life (frog, newt) and mammals (hedgehog, fox, squirrel, rabbit, roe deer,
   pipistrelle, next door's cat). PURE.
   Drawn in art units facing RIGHT, the anchor at the feet (fliers: the bottom
   of the body), sized to read beside the plants rather than to scale. The
   engine moves them about (gdv-buzz, -hop, -walk...); the art adds only small
   life in place: wings (gda-flutter), a peck, a wag, an ear twitch, breathing,
   a blink, a glow. Colours from the catalogue's look (c, c2) where it has them.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1 } = A;
  const lc = (o, fb) => (o.look && o.look.c) || fb;
  const lc2 = (o, fb) => (o.look && o.look.c2) || fb;
  const cls = (o, r, c, inner, style) => (o.anim && inner ? `<g class="${c}" style="${style ? style + ';' : ''}${A.T(r, 0, 4)}">${inner}</g>` : inner);
  const eye = (x, y, R) => A.P('#1a1410', A.circ(x, y, R)) + A.P('#ffffff', A.circ(x + R * 0.3, y - R * 0.3, R * 0.35), 0.9);
  const legs = (pts, col, w) => A.S(col, w || 0.9, pts.map(([x, y, dx, dy]) => `M${f1(x)} ${f1(y)}l${f1(dx)} ${f1(dy)}`).join(''));

  /* ================= insects ================= */
  gartDefine('visitor:honeybee', {
    box: [20, 16], fit: 'none',
    draw(o, r) {
      const band = lc(o, '#f2b01e'), body = lc2(o, '#2a2a2a');
      const wings = A.P('#e8f6fa', A.ell(-1.6, -9.6, 3.4, 2) + A.ell(1.8, -10, 3.8, 2.2), 0.85) + A.S('#a8c8d4', 0.3, A.ell(1.8, -10, 3.8, 2.2), 0.7);
      return A.P(band, A.ell(0, -5, 6, 3.6)) + A.S(body, 1.4, 'M-2.4 -8.4v6.8M1 -8.6v7.2') + A.P(body, 'M-6 -5q-2-1 -3 0q1 1 3 0z') + A.P(body, A.circ(5.6, -5.4, 2.4)) + eye(6.6, -5.8, 0.6) + A.S(body, 0.4, 'M7 -7.4l2-2M6.4 -7.6l1-2.4') + legs([[-1, -2, -1, 2], [1.4, -1.8, 0.6, 2], [3.4, -2.2, 1.4, 1.8]], body, 0.5) + cls(o, r, 'gda-flutter', wings);
    },
  });
  gartDefine('visitor:bumblebee', {
    box: [24, 20], fit: 'none',
    draw(o, r) {
      const band = lc(o, '#f2c43a'), body = lc2(o, '#2a2a2a');
      const wings = A.P('#e8f6fa', A.ell(-1.6, -13, 4, 2.4) + A.ell(2.6, -13.4, 4.4, 2.6), 0.8);
      // round and furry: a fuzzy outline of little bumps, a white tail
      let fuzz = '';
      for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; fuzz += A.circ(Math.cos(a) * 7, -6.4 + Math.sin(a) * 5.6, 1.2); }
      return A.P(body, fuzz) + A.P(body, A.ell(0, -6.4, 7, 5.6)) + A.P(band, A.rect(-1.6, -12, 4, 11.4)) + A.P(band, A.rect(4.2, -11, 1.6, 9.4), 0.9) + A.P('#f6f2ea', A.ell(-6.4, -6, 2, 3.4)) + A.P(body, A.circ(7.6, -6.6, 3)) + eye(8.8, -7.2, 0.7) + legs([[-2, -1.4, -1, 2], [1, -1, 0.4, 2], [4, -1.6, 1.4, 1.8]], body, 0.7) + cls(o, r, 'gda-flutter', wings);
    },
  });
  /** A butterfly seen from the side-front with its wings open; colours: [fore, hind, marks]. */
  function butterfly(o, r, fore, hind, marks, extra) {
    const wings = A.P(fore, 'M0 -8Q-4 -22 -14 -20Q-16 -12 -2 -6z' + 'M0 -8Q4 -22 14 -20Q16 -12 2 -6z') + A.P(hind, 'M0 -6Q-12 -2 -9 4Q-3 4 0 -4z' + 'M0 -6Q12 -2 9 4Q3 4 0 -4z') + (marks || '') + (extra || '');
    return cls(o, r, 'gda-flutter', wings) + A.S('#2a2420', 2, 'M0 -10V-1') + A.P('#2a2420', A.circ(0, -11, 1.4)) + A.S('#2a2420', 0.5, 'M0 -12l-2-4M0 -12l2-4');
  }
  gartDefine('visitor:cabbage-white', {
    box: [30, 26], fit: 'none',
    draw(o, r) { const c = lc(o, '#f7f5ee'), m = lc2(o, '#3a3a3a'); return butterfly(o, r, c, A.mix(c, '#e8e4c8', 0.4), A.P(m, 'M-14 -20q-2 2-1 5l3-1zM14 -20q2 2 1 5l-3-1z') + A.P(m, A.circ(-7, -14, 1.3) + A.circ(7, -14, 1.3))); },
  });
  gartDefine('visitor:peacock-butterfly', {
    box: [30, 26], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#b83a2a'), blue = lc2(o, '#3a4fa8');
      // the four eyes: blue, yellow-ringed, near each wing tip
      const eyes = A.P('#f2d050', A.circ(-10, -17, 3.2) + A.circ(10, -17, 3.2)) + A.P(blue, A.circ(-10, -17, 2.2) + A.circ(10, -17, 2.2)) + A.P('#1a1a2a', A.circ(-10, -17, 1) + A.circ(10, -17, 1)) + A.P(blue, A.circ(-6, 0, 1.6) + A.circ(6, 0, 1.6));
      return butterfly(o, r, c, A.dk(c, 0.3), eyes);
    },
  });
  gartDefine('visitor:red-admiral', {
    box: [30, 26], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#2a2a2a'), band = lc2(o, '#e2442b');
      return butterfly(o, r, c, c, A.P(band, 'M-3 -10Q-8 -16 -11 -14l1 2Q-6 -12 -3 -8zM3 -10Q8 -16 11 -14l-1 2Q6 -12 3 -8z' + 'M-8 2q2-2 6-1l-1 1q-3 0-5 1zM8 2q-2-2-6-1l1 1q3 0 5 1z') + A.P('#ffffff', A.circ(-11, -18, 1) + A.circ(-12.6, -16, 0.7) + A.circ(11, -18, 1) + A.circ(12.6, -16, 0.7)));
    },
  });
  gartDefine('visitor:ladybird', {
    box: [14, 10], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#d8202b'), dk = lc2(o, '#1a1a1a');
      const body = A.P(dk, A.circ(4.4, -3, 2)) + A.P(c, 'M-5 0Q-5 -8 0 -8Q5 -8 5 0z') + A.S(dk, 0.6, 'M0 -8V0') + A.P(dk, A.circ(-2.4, -4.6, 1) + A.circ(2.4, -4.6, 1) + A.circ(-2.6, -1.8, 0.8) + A.circ(2.6, -1.8, 0.8) + A.circ(0, -6.6, 0.7)) + A.P('#ffffff', A.ell(-2, -6.4, 1.2, 0.7), 0.6) + A.P('#ffffff', A.circ(5, -3.6, 0.5) + A.circ(5.4, -2.6, 0.4)) + legs([[-3, 0, -1, 1], [0, 0, 0, 1.2], [3, 0, 1, 1]], dk, 0.5);
      return cls(o, r, 'gart-creep', body);
    },
  });
  gartDefine('visitor:dragonfly', {
    box: [34, 22], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#3ab4c4'), wingC = lc2(o, '#cfeff4');
      const wings = A.P(wingC, A.ell(-2, -14, 3, 9) + A.ell(3, -14, 3, 9) + A.ell(-4, -6, 2.6, 8) + A.ell(5, -6, 2.6, 8), 0.6) + A.S('#a8d8e0', 0.3, 'M-2 -6v-16M3 -6v-16', 0.8);
      return A.S(c, 2.2, 'M0 -10H-22') + A.S(A.dk(c, 0.3), 2.2, 'M-6 -10h-1.4M-11 -10h-1.4M-16 -10h-1.4', 0.7) + A.P(A.dk(c, 0.25), A.ell(1, -10, 4, 2.6)) + A.P(c, A.circ(6, -10, 2.4)) + A.P('#1a3a4a', A.circ(7, -10.6, 1)) + cls(o, r, 'gda-flutter', `<g transform="translate(0 -10) scale(1 0.55) translate(0 10)">${wings}</g>`);
    },
  });
  gartDefine('visitor:firefly', {
    box: [40, 24], fit: 'none',
    draw(o, r) {
      const glowC = lc(o, '#d8ff7a');
      // glow-worms: little green-gold lights low in the grass (and a few lifting), each blinking on its own
      let s = '';
      [[-12, -4, 1], [-3, -9, 0.8], [7, -3, 1], [13, -12, 0.7], [-16, -14, 0.6], [2, -18, 0.6]].forEach(([x, y, k], i) => {
        const dot = A.P(glowC, A.circ(x, y, 5 * k), 0.2) + A.P(glowC, A.circ(x, y, 2.6 * k), 0.4) + A.P('#fbffd0', A.circ(x, y, 1.1 * k));
        s += o.anim ? `<g class="gda-glow" style="animation-delay:-${f1((i * 1.37) % 3.2)}s">${dot}</g>` : dot;
      });
      return s + A.S('#6a8a4a', 0.8, 'M-14 0l-1-5M-12 0l1-6M6 0l-1-5M9 0l1-4', 0.8);
    },
  });
  gartDefine('visitor:moth', {
    box: [26, 20], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c9b89a'), c2 = lc2(o, '#8a7a5a');
      const wings = A.P(c, 'M0 -8Q-6 -18 -12 -14Q-14 -6 -1 -4z' + 'M0 -8Q6 -18 12 -14Q14 -6 1 -4z') + A.S(c2, 0.6, 'M-2 -8q-4-4-8-4M2 -8q4-4 8-4M-2 -6q-5-1-9 0M2 -6q5-1 9 0', 0.7) + A.P(c2, A.circ(-7, -11, 1) + A.circ(7, -11, 1));
      return cls(o, r, 'gda-flutter', wings) + A.P(A.dk(c, 0.25), A.ell(0, -7, 1.6, 4.6)) + A.S(c2, 0.5, 'M0 -11l-3-4q-1 1 0 2M0 -11l3-4q1 1 0 2');
    },
  });
  gartDefine('visitor:snail', {
    box: [24, 14], fit: 'none',
    draw(o, r) {
      const shell = lc(o, '#c9a26a'), body = lc2(o, '#8a8a7a');
      const horns = A.S(body, 0.9, 'M8 -4l2-5M9.4 -3.6l3.4-3.6') + A.P('#3a3a3a', A.circ(10, -9, 0.7) + A.circ(12.8, -7.2, 0.7));
      return A.S('#e8eef0', 1.2, 'M-14 -0.4h6', 0.6) + A.P(body, 'M-8 0Q-8 -3 0 -3H8Q12 -3 12 0z') + A.P(A.dk(shell, 0.25), A.circ(-1, -7, 6)) + A.P(shell, A.circ(-1.4, -7.4, 5.4)) + A.S(A.dk(shell, 0.35), 0.9, 'M-1.4 -7.4a1.4 1.4 0 1 1 1.6 1.4a3 3 0 1 1 -3.6 -3.4a4.4 4.4 0 1 1 6 5.6') + A.P('#ffffff', A.ell(-4, -10, 1.4, 0.8), 0.5) + cls(o, r, 'gart-ear', horns);
    },
  });

  /* ================= birds ================= */
  /** A small songbird standing, facing right: cols {back, breast, belly, cap?, wing, bill, leg}; o.peck adds a peck. */
  function songbird(o, r, c, k) {
    k = k || 1;
    const sc = v => f1(v * k);
    const head = A.P(c.back, `M${sc(4)} ${sc(-15)}a${sc(5)} ${sc(5)} 0 1 1 ${sc(4)} ${sc(6)}l${sc(-6)} 0z`) + (c.cap ? A.P(c.cap, `M${sc(4.4)} ${sc(-16)}a${sc(5)} ${sc(4.4)} 0 0 1 ${sc(9)} ${sc(-1)}q${sc(-4)} ${sc(-3)} ${sc(-9)} ${sc(1)}z`) : '') + (c.face ? A.P(c.face, A.ell(10 * k, -13.4 * k, 2.6 * k, 2.2 * k)) : '') + A.P(c.bill, `M${sc(13)} ${sc(-14)}l${sc(4)} ${sc(1)} ${sc(-4)} ${sc(1.2)}z`) + eye(10.4 * k, -15 * k, 0.9 * k);
    const body = A.P(c.back, `M${sc(-10)} ${sc(-6)}Q${sc(-8)} ${sc(-16)} ${sc(4)} ${sc(-15)}Q${sc(12)} ${sc(-12)} ${sc(9)} ${sc(-4)}Q${sc(4)} ${sc(1)} ${sc(-4)} ${sc(-1)}z`) + A.P(c.breast, `M${sc(3)} ${sc(-13)}Q${sc(12)} ${sc(-11)} ${sc(8)} ${sc(-3)}Q${sc(2)} ${sc(-2)} ${sc(1)} ${sc(-7)}z`) + A.P(c.belly, `M${sc(-2)} ${sc(-2)}Q${sc(4)} 0 ${sc(7)} ${sc(-3)}Q${sc(3)} ${sc(-4)} ${sc(-2)} ${sc(-2)}z`, 0.9) + A.P(c.wing, `M${sc(-9)} ${sc(-8)}Q${sc(-4)} ${sc(-15)} ${sc(4)} ${sc(-11)}Q${sc(-2)} ${sc(-5)} ${sc(-9)} ${sc(-8)}z`) + A.S(A.dk(c.wing, 0.3), 0.5 * k, `M${sc(-6)} ${sc(-9)}l${sc(6)} ${sc(-2)}M${sc(-5)} ${sc(-7.4)}l${sc(6)} ${sc(-2)}`, 0.6);
    const tail = A.P(c.tail || c.back, `M${sc(-9)} ${sc(-7)}l${sc(-8)} ${sc(-3)}l${sc(1)} ${sc(4)}z`);
    return legs([[-1 * k, -1.4 * k, -0.6 * k, 1.4 * k], [2 * k, -1.6 * k, 0.6 * k, 1.6 * k]], c.leg || '#5a4a3a', 0.8 * k) + cls(o, r, 'gart-flick', tail) + body + (o.peck ? cls(o, r, 'gart-peck', head) : head);
  }
  gartDefine('visitor:robin', {
    box: [26, 22], fit: 'none',
    draw(o, r) { return songbird(Object.assign({}, o, { peck: 1 }), r, { back: '#8a6a4e', breast: lc(o, '#e2662b'), belly: '#efe6d4', wing: '#7a5a40', bill: '#3a2e24', face: lc(o, '#e2662b') }, o.season === 'winter' ? 1.08 : 1); },
  });
  gartDefine('visitor:blue-tit', {
    box: [24, 20], fit: 'none',
    draw(o, r) { return songbird(o, r, { back: '#7a9a5a', breast: lc2(o, '#f2d33a'), belly: '#f2d33a', wing: lc(o, '#4a8fd8'), tail: lc(o, '#4a8fd8'), cap: lc(o, '#4a8fd8'), face: '#ffffff', bill: '#2a2a2a', leg: '#6a7a8a' }, 0.88); },
  });
  gartDefine('visitor:blackbird', {
    box: [30, 24], fit: 'none',
    draw(o, r) { const c = lc(o, '#1f1f1f'); return songbird(Object.assign({}, o, { peck: 1 }), r, { back: c, breast: A.lt(c, 0.08), belly: A.lt(c, 0.12), wing: A.lt(c, 0.06), bill: lc2(o, '#f2a02b'), leg: '#3a2a1a' }, 1.22) + A.P(lc2(o, '#f2a02b'), A.circ(12.6, -18.4, 1.3), 0.9); },
  });
  gartDefine('visitor:wren', {
    box: [20, 18], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a5a3a'), c2 = lc2(o, '#c9a26a');
      // the wren: tiny, round, its tail cocked straight up
      return legs([[-0.4, -1.2, -0.4, 1.2], [1.6, -1.2, 0.4, 1.2]], '#6a4a3a', 0.6) + cls(o, r, 'gart-flick', A.P(c, 'M-5 -7l-3-8l3 1l2 6z')) + A.P(c, A.ell(0, -6, 6, 4.6)) + A.P(c2, A.ell(1.4, -4.4, 4, 2.6), 0.9) + A.S(A.dk(c, 0.3), 0.5, 'M-4 -8l3-1M-3 -6l3-1M-3.4 -4l2.6-0.6', 0.7) + A.P(c, A.circ(5, -9, 3.2)) + A.S('#f4ecd8', 0.6, 'M3.4 -10.6l4 0.4') + A.P('#3a2a1a', 'M8 -9.6l3 0.4-3 0.8z') + eye(6, -9.6, 0.6);
    },
  });
  gartDefine('visitor:goldfinch', {
    box: [24, 20], fit: 'none',
    draw(o, r) {
      const gold = lc(o, '#e2b02b'), red = lc2(o, '#d83a3a');
      return songbird(Object.assign({}, o, { peck: 1 }), r, { back: '#c8a46a', breast: '#d8b88a', belly: '#f4ecd8', wing: '#1a1a1a', tail: '#1a1a1a', cap: '#1a1a1a', face: red, bill: '#e8d8b8', leg: '#8a7a6a' }, 0.9) + A.P(gold, 'M-7 -9q4-3 8-2l-1 2q-4-1-7 0z') + A.P('#ffffff', A.circ(9.4, -11.4, 1.6), 0.9);
    },
  });
  gartDefine('visitor:wood-pigeon', {
    box: [34, 28], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#9aa0aa'), pink = lc2(o, '#d8b8c8');
      const head = A.P(c, A.circ(10, -20, 3.6)) + A.S('#ffffff', 1.4, 'M7.6 -16.6q2.4 1.6 4.6 0') + A.P('#f2c04a', 'M13.4 -20l3 0.6-3 0.8z') + A.P('#e8f0c8', A.circ(11, -21, 1)) + A.P('#1a1a1a', A.circ(11.2, -21, 0.5));
      return legs([[-1, -2, -0.6, 2], [3, -2, 0.6, 2]], '#d86a7a', 1) + A.P(A.dk(c, 0.2), 'M-13 -10l-7 -2 2 5z') + A.P(c, 'M-13 -8Q-12 -20 6 -18Q14 -14 10 -6Q4 0 -6 -1z') + A.P(pink, 'M4 -17Q13 -14 10 -7Q5 -6 3 -10z') + A.P(A.lt(c, 0.15), 'M-12 -10Q-6 -18 4 -14Q-2 -8 -12 -10z') + A.P('#ffffff', A.ell(-3, -13.4, 3.6, 1), 0.8) + A.S('#5a5f6a', 0.7, 'M-10 -9l8-2M-9 -7.4l8-2', 0.6) + cls(o, r, 'gart-peck', head);
    },
  });
  gartDefine('visitor:tawny-owl', {
    box: [30, 36], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a6a4a'), face = lc2(o, '#e2c48a');
      // sitting on a short branch: round body, a pale heart of a face, big dark eyes that blink
      const eyes = A.P('#1a1410', A.circ(-3.4, -26, 2.6) + A.circ(3.4, -26, 2.6)) + A.P('#ffffff', A.circ(-2.6, -26.8, 0.7) + A.circ(4.2, -26.8, 0.7), 0.9);
      let marks = '';
      for (let i = 0; i < 6; i++) marks += `M${f1(-6 + (i % 3) * 5)} ${f1(-16 + Math.floor(i / 3) * 5)}l1 2.4`;
      return A.S('#5a3a20', 3, 'M-14 0Q0 -2 14 1') + A.P(A.dk(c, 0.2), A.ell(0, -14, 10, 13)) + A.P(c, A.ell(-0.6, -15, 9, 12)) + A.P(A.lt(c, 0.2), A.ell(0, -10, 6, 8), 0.7) + A.S(A.dk(c, 0.4), 0.8, marks, 0.7) + A.P(c, A.circ(0, -25, 8)) + A.P(face, 'M0 -21Q-8 -22 -7 -28Q-4 -32 0 -29Q4 -32 7 -28Q8 -22 0 -21z') + cls(o, r, 'gart-blink', eyes) + A.P('#c8a43a', 'M-1 -24l1 3 1-3z') + A.S('#c8a43a', 1, 'M-4 -1l-1 2M-2 -1v2M2 -1v2M4 -1l1 2');
    },
  });
  gartDefine('visitor:grey-heron', {
    box: [40, 60], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#b8bec4'), dk = lc2(o, '#3a3a3a');
      // standing perfectly still at the water's edge: long legs, an S neck, a dagger bill, a black plume
      return A.S('#c8a46a', 1.2, 'M-2 0V-20M3 0L1 -20') + A.P(c, 'M-12 -20Q-14 -34 2 -36Q10 -34 8 -24Q4 -18 -6 -19z') + A.P(A.dk(c, 0.2), 'M-12 -21Q-8 -30 4 -30Q0 -22 -12 -21z') + A.P(dk, 'M-14 -22l-8 3 7 0z', 0.8) + A.S(c, 3, 'M4 -34Q0 -42 6 -46Q10 -50 6 -54') + A.S('#ffffff', 1.2, 'M5 -38q-2-4 1-7', 0.7) + A.P(c, A.ell(7, -55, 3.4, 2.6)) + A.P(dk, 'M4 -56q-6 0-10 2q5-3 10-4z') + A.P('#e8c84a', 'M10 -56l12 1.6-12 1.4z') + eye(8, -55.6, 0.6) + A.S(dk, 0.7, 'M4 -40l1 4M3.6 -44l1 3', 0.7) + A.P('#7cb6dc', A.ell(0, 0.4, 12, 2), 0.5);
    },
  });
  gartDefine('visitor:kingfisher', {
    box: [26, 22], fit: 'none',
    draw(o, r) {
      const blue = lc(o, '#1f8fd8'), orange = lc2(o, '#f28a2b');
      return A.S('#5a3a20', 2, 'M-12 0q12-2 22 0') + A.P(blue, 'M-6 -2Q-6 -12 4 -13Q10 -12 9 -5Q6 -1 -2 -1z') + A.S('#7fd0ff', 1, 'M-4 -7q4-4 9-4', 0.8) + A.P(blue, 'M-6 -3l-6 -1 6 3z') + A.P(orange, 'M2 -9Q9 -8 8 -3Q4 -1 1 -4z') + A.P(blue, A.circ(5, -14, 4)) + A.P(orange, A.ell(7, -13, 2, 1.3)) + A.P('#ffffff', A.ell(6, -11.6, 1.6, 0.8)) + A.P('#2a2a2a', 'M8.6 -14.6l9 1.4-9 1z') + eye(6.4, -14.6, 0.7) + A.S('#e85a2a', 0.8, 'M0 -1v2M2 -1v2');
    },
  });
  gartDefine('visitor:mallard', {
    box: [36, 22], fit: 'none',
    draw(o, r) {
      const green = lc(o, '#2f8f4a'), brown = lc2(o, '#a87c4f');
      // swimming: a waterline under the body, ripples, the green head and white collar of the drake
      const duck = A.P('#e8e4dc', 'M-14 -4Q-14 -12 0 -12Q10 -12 12 -6Q8 0 -6 0Q-12 0 -14 -4z') + A.P('#9a9488', 'M-14 -4Q-6 -9 4 -8Q-4 -4 -14 -4z', 0.8) + A.P(brown, 'M2 -12Q10 -12 11 -6Q6 -4 2 -6z') + A.P('#4a4a8a', A.rect(-6, -8, 5, 2.4)) + A.P('#1a1a1a', 'M-14 -6l-4 -3 3 4z') + A.S('#ffffff', 1.2, 'M8 -13.6q2-1 3 1') + A.P(green, A.ell(11, -16, 4, 3.6)) + A.P(A.lt(green, 0.3), A.ell(10, -17, 1.6, 1.2), 0.6) + A.P('#f2c43a', 'M14 -16q4 0 5 1.4q-1 1-5 0z') + eye(12, -17, 0.6);
      return cls(o, r, 'gda-bob', duck) + A.S('#7cb6dc', 1, 'M-18 1q6-1.6 12 0M4 1q6-1.6 12 0', 0.8) + A.S('#ffffff', 0.7, 'M-20 2.4q4-1 8 0', 0.6);
    },
  });

  /* ================= pond life ================= */
  gartDefine('visitor:frog', {
    box: [22, 16], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#5f9f3a'), belly = lc2(o, '#d8c86a');
      const throat = A.P(belly, A.ell(4, -5, 3.4, 2.4));
      return A.P(A.dk(c, 0.25), 'M-8 0q-4-1 -2-4l4 1zM8 0q4-1 2-4l-4 1z') + A.P(c, 'M-9 -1Q-10 -9 0 -10Q9 -10 9 -2Q6 1 0 0Q-6 1 -9 -1z') + A.P(A.lt(c, 0.25), 'M-7 -5Q-2 -9 4 -8Q-2 -6 -7 -5z', 0.7) + A.P(A.dk(c, 0.3), A.circ(-4, -5, 1) + A.circ(1, -7, 0.9) + A.circ(-1, -3, 0.8), 0.6) + cls(o, r, 'gart-breathe', throat) + A.P(c, A.circ(1, -10, 2.6) + A.circ(6, -10, 2.6)) + eye(1.4, -10.4, 1.3) + eye(6.4, -10.4, 1.3) + A.S(A.dk(c, 0.35), 0.6, 'M3 -6.6q2 1 4 0') + A.P(A.dk(c, 0.15), A.ell(-6, -0.6, 3, 1.2) + A.ell(6, -0.6, 3, 1.2));
    },
  });
  gartDefine('visitor:newt', {
    box: [30, 10], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a6a3a'), belly = lc2(o, '#f28a2b');
      return A.P(c, 'M-14 -2Q-6 -4 2 -4Q8 -4 11 -2.4Q9 0 2 -0.6Q-6 0 -14 -2z') + A.P(belly, 'M-6 -1Q2 0 8 -1.4Q2 -1.6 -6 -1z') + A.P(A.dk(c, 0.3), A.circ(-4, -3, 0.6) + A.circ(0, -3.4, 0.6) + A.circ(4, -3.2, 0.5) + A.circ(-8, -2.4, 0.5)) + legs([[-3, -1.4, -2, 1.6], [-3, -1.4, 1, 1.6], [5, -1.6, -1, 1.6], [5, -1.6, 2, 1.4]], c, 0.7) + eye(9, -3, 0.6);
    },
  });

  /* ================= mammals ================= */
  gartDefine('visitor:hedgehog', {
    box: [28, 18], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a6a4a'), face = lc2(o, '#c9a26a');
      // a dome of spines (short strokes), a pointed snout, little feet that patter
      let sp = '', sp2 = '';
      for (let i = 0; i < 26; i++) { const a = Math.PI * (1.02 + (i % 13) / 12 * 0.96), q = i < 13 ? 1 : 0.68, x = -2 + Math.cos(a) * 11 * q, y = -6 + Math.sin(a) * 8 * q, [ex, ey] = A.at(x, y, Math.atan2(Math.cos(a), -Math.sin(a)) - 0.5, 3.6); (i % 2 ? (sp += `M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}`) : (sp2 += `M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}`)); }
      const feet = cls(o, r, 'gart-step', A.P('#4a3a2a', A.ell(-6, -0.6, 1.6, 1) + A.ell(5, -0.6, 1.6, 1)));
      const body = A.P(A.dk(c, 0.3), 'M-13 -2Q-14 -15 -2 -15Q9 -15 10 -4Q4 -1 -13 -2z') + A.S(A.dk(c, 0.45), 1.2, sp2) + A.S(A.lt(c, 0.35), 1, sp) + A.P(face, 'M7 -3Q7 -9 11 -8Q15 -6 17 -3Q12 -1 7 -3z') + A.P('#1a1410', A.circ(17, -3.4, 1)) + eye(11.6, -6, 0.7);
      return feet + cls(o, r, 'gda-bob', body);
    },
  });
  gartDefine('visitor:fox', {
    box: [50, 34], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#d8642b'), white = lc2(o, '#f7f1ea');
      const legBack = cls(o, r, 'gart-step', A.S(A.dk(c, 0.3), 2.6, 'M-12 -12l-2 12M-6 -12l1 12') + A.P('#2a1a12', A.ell(-14, -0.6, 2, 1) + A.ell(-5, -0.6, 2, 1)));
      const legFront = `<g${o.anim ? ` class="gart-step" style="animation-delay:-0.3s"` : ''}>${A.S(c, 2.6, 'M8 -12l-1 12M13 -12l1 12') + A.P('#2a1a12', A.ell(7, -0.6, 2, 1) + A.ell(14, -0.6, 2, 1))}</g>`;
      const tail = A.P(c, 'M-15 -16Q-28 -18 -32 -8Q-26 -6 -20 -10Q-16 -12 -14 -13z') + A.P(white, 'M-32 -8Q-30 -12 -27 -12Q-28 -8 -32 -8z');
      const head = A.P(c, 'M12 -20Q14 -27 20 -26L28 -21Q26 -18 20 -17Q14 -16 12 -20z') + A.P(white, 'M18 -19L28 -21Q26 -18 20 -17z') + A.P('#1a1410', A.circ(28, -21, 1)) + A.P(c, 'M14 -24l1-7 4 5zM18 -25l3-6 2 6z') + A.P('#2a1a12', 'M15 -25l0.6-4 2 3z', 0.6) + eye(20, -22.6, 0.8);
      return legBack + cls(o, r, 'gart-wag', tail) + A.P(c, 'M-16 -12Q-14 -22 0 -21Q12 -22 16 -16Q14 -10 0 -10Q-12 -9 -16 -12z') + A.P(white, 'M8 -12Q12 -12 15 -15Q14 -10 8 -11z') + legFront + cls(o, r, 'gart-ear', head);
    },
  });
  gartDefine('visitor:squirrel', {
    box: [28, 26], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#a8643a'), belly = lc2(o, '#e8c8a8');
      // sitting up with a nut, the great plume of a tail curled behind
      const tail = A.P(A.dk(c, 0.1), 'M-4 -2Q-16 -2 -14 -14Q-12 -26 -2 -24Q-8 -20 -8 -14Q-8 -8 -2 -6z') + A.S(A.lt(c, 0.3), 0.8, 'M-12 -12q0-8 6-10', 0.6);
      return cls(o, r, 'gart-wag', tail) + A.P(c, 'M-4 0Q-8 -10 -2 -16Q6 -18 7 -10Q8 -2 2 0z') + A.P(belly, 'M1 -2Q5 -6 4 -12Q1 -8 0 -3z') + A.P(c, A.circ(3, -18, 4.4)) + A.P(c, 'M0 -21l0-4 2 3zM3 -22l2-4 1 4z') + A.P('#1a1410', A.circ(7.4, -17.6, 0.6)) + eye(4.6, -19, 0.8) + A.P('#8a5a2a', A.ell(5, -11, 2, 2.4)) + A.P(c, A.ell(4, -11, 1.4, 1)) + A.P(A.dk(c, 0.2), A.ell(0, -0.6, 4, 1.2));
    },
  });
  gartDefine('visitor:rabbit', {
    box: [28, 24], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#b89a7a'), tail = lc2(o, '#f7f1ea');
      const ears = A.P(c, 'M5 -16Q2 -27 5 -28Q9 -24 8 -16z') + A.P('#e8b8a8', 'M5.4 -17Q4 -24 5.4 -26Q7.4 -22 7 -17z', 0.8) + A.P(A.dk(c, 0.1), 'M8 -16Q8 -26 11 -26Q13 -22 10 -16z');
      return A.P(A.dk(c, 0.2), A.ell(-6, -2, 4, 2)) + A.P(c, 'M-10 -2Q-13 -12 -4 -14Q4 -15 6 -10Q8 -2 0 -1z') + A.P(tail, A.circ(-11, -6, 2.6)) + A.P(A.lt(c, 0.2), A.ell(-3, -10, 4, 2.4), 0.6) + A.P(c, A.ell(8, -13, 5, 4)) + cls(o, r, 'gart-ear', ears) + A.P('#e8a0a0', A.circ(12.6, -12.6, 0.8)) + eye(10, -14, 0.9) + A.P(A.dk(c, 0.15), A.ell(5, -0.8, 3, 1));
    },
  });
  gartDefine('visitor:roe-deer', {
    box: [46, 52], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#a8743a'), rump = lc2(o, '#f7f1ea');
      // at the meadow's edge at dawn: slim legs, a white rump, big ears, small antlers, head up and listening
      const head = A.P(c, 'M10 -36Q12 -46 18 -44Q22 -42 22 -38Q20 -35 16 -35z') + A.P('#1a1410', A.circ(22, -38.6, 1)) + A.P('#f4ece0', A.ell(19.4, -36.4, 2, 1), 0.8) + eye(17, -41, 0.9) + A.P(c, 'M12 -44l-5-5 6 1zM16 -45l2-6 2 5z') + A.S('#6a4a2a', 1, 'M14 -46l-1-8M13.4 -52l-2-2M16 -46l2-7M17.6 -51l2-1');
      return A.S(A.dk(c, 0.25), 2, 'M-12 -20l-1 20M-7 -20l1 20M8 -20l-1 20M12 -20l1 20') + A.P('#2a1a12', A.ell(-13, -0.6, 1.4, 0.8) + A.ell(-6, -0.6, 1.4, 0.8) + A.ell(7, -0.6, 1.4, 0.8) + A.ell(13, -0.6, 1.4, 0.8)) + A.P(c, 'M-16 -20Q-16 -32 -2 -31Q10 -32 14 -26Q14 -18 2 -18Q-12 -17 -16 -20z') + A.P(rump, A.ell(-15, -25, 3, 4)) + A.S(A.lt(c, 0.2), 1, 'M-12 -28Q0 -32 10 -28', 0.6) + A.P(c, 'M9 -27Q8 -34 12 -38L16 -36Q14 -30 14 -26z') + cls(o, r, 'gart-ear', head);
    },
  });
  gartDefine('visitor:pipistrelle', {
    box: [26, 16], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#4a3a3a'), c2 = lc2(o, '#8a6a6a');
      const wings = A.P(c, 'M0 -8Q-6 -14 -13 -11Q-10 -8 -11 -5Q-7 -7 -5 -4Q-3 -6 0 -5z' + 'M0 -8Q6 -14 13 -11Q10 -8 11 -5Q7 -7 5 -4Q3 -6 0 -5z') + A.S(c2, 0.4, 'M0 -7l-11-3M0 -7l-7 2M0 -7l11-3M0 -7l7 2', 0.7);
      return cls(o, r, 'gda-flutter', wings) + A.P(c2, A.ell(0, -7, 2, 3)) + A.P(c, 'M-1.6 -10l0.6-2.4 1 1.6 1-1.6 0.6 2.4z') + A.P('#f2d070', A.circ(-0.8, -9, 0.4) + A.circ(0.8, -9, 0.4));
    },
  });
  gartDefine('visitor:garden-cat', {
    box: [40, 22], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#e8a05a'), white = lc2(o, '#f7f1ea');
      // next door's cat, curled up asleep (it breathes, its tail tip twitches)
      let stripes = '';
      for (let i = 0; i < 4; i++) stripes += `M${-8 + i * 5} -14q1 3 0 6`;
      const body = A.P(c, 'M-16 0Q-18 -14 -4 -15Q10 -16 14 -8Q16 0 6 0z') + A.S(A.dk(c, 0.2), 1.4, stripes, 0.6) + A.P(white, 'M4 -2Q10 -3 13 -7Q14 -1 8 0z');
      const tailTip = A.P(c, 'M-16 -2Q-20 2 -10 2Q-4 2 -2 0Q-10 0 -16 -2z') + A.P(A.dk(c, 0.2), A.ell(-14, 0.4, 2, 1.2));
      const head = A.P(c, A.ell(12, -7, 6.4, 5.4)) + A.P(c, 'M8 -11l1-5 3 4zM14 -12l3-4 1 5z') + A.P('#e8a0a0', 'M9 -12l0.6-2.4 1.4 2zM15 -12.4l1.6-2 0.4 2.4z', 0.8) + A.S('#3a2a1a', 0.7, 'M9.6 -7q1.4 1 2.6 0M14 -7q1.4 1 2.6 0') + A.P('#e88a8a', 'M12.4 -5l1 0.6 1-0.6z') + A.S('#f4ecd8', 0.3, 'M16 -5l4-1M16 -4.4l4 0.4', 0.8) + A.P(white, A.ell(13, -4, 3, 1.6), 0.8);
      return A.shadow(18, 3) + cls(o, r, 'gart-breathe', body + head) + cls(o, r, 'gart-wag', tailTip);
    },
  });
})();
