/* ============================================================
   GARDEN ART, the visitors (2.18, redrawn 2.23, agent 'garden-art'): insects, a snail, birds, pond life and mammals.
   PURE. Drawn in art units facing RIGHT, the anchor at the feet (fliers: the bottom of the body), sized to read beside the plants, not to scale.
   They are chubby and big-eyed on purpose: round bodies, big heads, short legs, a face you can see at game size. Two builders (bird, butterfly)
   and a few small helpers do most of it, so a new creature is usually a few lines (or one catalogue row with kit parts, 94-garden-art-i-kit.js).
   The engine moves them about (gdv-buzz, -hop, -walk...); the art adds only small life in place: wings (gda-flutter), a peck, a wag, an ear twitch,
   breathing, a glow. Colours from the catalogue's look (c, c2) where it has them.
   ============================================================ */
(function () {
  const A = GART;
  const { f1 } = A;
  const lc = (o, fb) => (o.look && o.look.c) || fb;
  const lc2 = (o, fb) => (o.look && o.look.c2) || fb;
  const cls = (o, r, c, inner, style) => (o.anim && inner ? `<g class="${c}" style="${style ? style + ';' : ''}${A.T(r, 0, 4)}">${inner}</g>` : inner);
  const eye = (x, y, R) => A.P('#1a1410', A.circ(x, y, R)) + A.P('#ffffff', A.circ(x + R * 0.34, y - R * 0.36, R * 0.36), 0.95);
  const shut = (x, y, R, c) => A.S(c || '#3a2a20', 1, `M${f1(x - R)} ${f1(y)}q${f1(R)} ${f1(R * 0.9)} ${f1(R * 2)} 0`);
  const nose = (x, y, R, c) => A.P(c || '#2a1f1c', A.ell(x, y, R, R * 0.8));
  const blush = (x, y, R) => A.P('#f08a8a', A.ell(x, y, R, R * 0.66), 0.45);
  const lit = (x, y, rx, ry, o) => A.P('#ffffff', A.ell(x, y, rx, ry), o == null ? 0.32 : o);
  const legs = (d, col, w) => A.S(col, w || 1.7, d);

  /* ================= insects ================= */
  gartDefine('visitor:honeybee', {
    box: [20, 16], fit: 'none',
    draw(o, r) {
      const band = lc(o, '#f2b01e'), body = lc2(o, '#2a2a2a'), T = A.tone3(band);
      const wings = A.P('#e8f6fa', A.ell(-2.4, -13.4, 3.6, 4.4) + A.ell(2.4, -14, 4, 4.8), 0.92);
      return legs('M-3 -2v2.4M1 -2v2.4M4 -2v2.4', body, 1.3) + A.P(body, 'M-8 -6.6l-3.4 0.8 3.4 1.4z') + A.P(band, A.ell(-1, -6.6, 7.6, 5.8)) + A.S(body, 2.8, 'M-4 -11.6v10M0.6 -12v10.8') + lit(-3, -9.6, 2.8, 1.3) + A.P(body, A.circ(6.8, -7.4, 4.2)) + eye(8.2, -8.2, 1.6) + A.S(body, 1.1, 'M8 -11l2-3M6 -11.2l0.6-3') + cls(o, r, 'gda-flutter', wings);
    },
  });
  gartDefine('visitor:bumblebee', {
    box: [24, 20], fit: 'none',
    draw(o, r) {
      const band = lc(o, '#f2c43a'), body = lc2(o, '#2a2a2a');
      const wings = A.P('#e8f6fa', A.ell(-2.8, -17, 4.4, 5) + A.ell(2.6, -17.6, 4.8, 5.4), 0.9);
      return legs('M-4 -2v2.6M1 -2v2.6M5 -2v2.6', body, 1.5) + A.P(body, gartScallop(0, -8.4, 8.6, 11, 1.16, 0.86)) + A.P(band, A.rrect(-3, -15, 5.4, 13.4, 2)) + A.P('#f6f2ea', A.ell(-7.4, -8, 2.8, 4.4)) + lit(-3.6, -12, 3, 1.3, 0.28) + A.P(body, A.circ(8.6, -9, 4.6)) + eye(10.2, -9.8, 1.7) + A.S(body, 1.1, 'M10 -13l2-3M8 -13.2l0.4-3') + cls(o, r, 'gda-flutter', wings);
    },
  });
  /** A butterfly from the front with its wings open. Colours: fore, hind; marks in its own coordinates. */
  function butterfly(o, r, fore, hind, marks, q) {
    const body = (q && q.body) || '#2a2420';
    const wings = A.P(hind, 'M0 -7C-9 -7 -15 -2 -12 3.4C-8 6.4 -2 1 0 -4zM0 -7C9 -7 15 -2 12 3.4C8 6.4 2 1 0 -4z') + A.P(fore, 'M0 -9C-4 -24 -19 -27 -19 -15C-19 -8 -7 -6 0 -8zM0 -9C4 -24 19 -27 19 -15C19 -8 7 -6 0 -8z') + (marks || '') + lit(-12, -18, 3.4, 2.2, 0.3);
    return cls(o, r, 'gda-flutter', wings) + A.P(body, A.rrect(-2, -12, 4, 12.4, 2)) + A.P(body, A.circ(0, -14, 3)) + A.P('#fbf8ee', A.circ(-1.3, -14.4, 1.05) + A.circ(1.3, -14.4, 1.05)) + A.P('#1a1410', A.circ(-1.2, -14.3, 0.62) + A.circ(1.4, -14.3, 0.62)) + A.S(body, 1.1, 'M-1 -16.6q-1-3-3.4-4M1 -16.6q1-3 3.4-4') + A.P(body, A.circ(-4.4, -20.8, 0.95) + A.circ(4.4, -20.8, 0.95));
  }
  gartDefine('visitor:cabbage-white', {
    box: [30, 26], fit: 'none',
    draw(o, r) { const c = lc(o, '#f7f5ee'), m = lc2(o, '#3a3a3a'); return butterfly(o, r, c, A.mix(c, '#e8e4c8', 0.5), A.P(m, 'M-19 -15C-19 -21 -15 -23 -12 -22.4Q-14 -18 -18.4 -13zM19 -15C19 -21 15 -23 12 -22.4Q14 -18 18.4 -13z') + A.P(m, A.circ(-9, -14, 1.7) + A.circ(9, -14, 1.7))); },
  });
  gartDefine('visitor:peacock-butterfly', {
    box: [30, 26], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#b83a2a'), blue = lc2(o, '#3a4fa8');
      const eyes = A.P('#f2d050', A.circ(-12, -17, 4.4) + A.circ(12, -17, 4.4)) + A.P(blue, A.circ(-12, -17, 3) + A.circ(12, -17, 3)) + A.P('#1a1a2a', A.circ(-12, -17, 1.4) + A.circ(12, -17, 1.4)) + A.P(blue, A.circ(-8, -0.6, 2) + A.circ(8, -0.6, 2));
      return butterfly(o, r, c, A.dk(c, 0.3), eyes);
    },
  });
  gartDefine('visitor:red-admiral', {
    box: [30, 26], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#2a2a2a'), red = lc2(o, '#e2442b');
      return butterfly(o, r, c, c, A.S(red, 3.2, 'M-5 -11Q-11 -13 -15 -19M5 -11Q11 -13 15 -19M-4 -3Q-8 -1 -10 2M4 -3Q8 -1 10 2') + A.P('#f7f5ee', A.circ(-15, -21.4, 1.5) + A.circ(15, -21.4, 1.5) + A.circ(-17, -15, 1.3) + A.circ(17, -15, 1.3)), { body: '#1a1410' });
    },
  });
  gartDefine('visitor:ladybird', {
    box: [14, 10], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#d8202b'), m = lc2(o, '#1a1a1a');
      return legs('M-4-1.4v2M0-1.4v2M4-1.4v2', m, 1.2) + A.P(m, A.circ(7.6, -4.6, 3.8)) + eye(8.8, -5.2, 1.3) + A.P(c, 'M-8.4-1Q-8.4-10.6 0.4-10.6Q8.4-10.6 8.4-1z') + A.S(m, 1.1, 'M0.4-10.4V-1') + A.P(m, A.circ(-3.6, -6.4, 1.6) + A.circ(4, -7.2, 1.5) + A.circ(-4.8, -2.8, 1.2) + A.circ(4.4, -3.2, 1.2)) + lit(-2.6, -9, 3, 1, 0.5);
    },
  });
  gartDefine('visitor:dragonfly', {
    box: [34, 18], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#3ab4c4'), w = lc2(o, '#cfeff4'), T = A.tone3(c);
      const wings = A.P(w, A.ell(-2, -15, 4, 8.6) + A.ell(3.4, -15.4, 4.2, 9), 0.85);
      return cls(o, r, 'gda-flutter', wings) + A.P(c, A.rrect(-20, -8.4, 20, 3.8, 1.9)) + A.S(T[0], 2, 'M-15-6.4h2M-9-6.4h2M-3-6.4h2', 0.7) + A.P(T[1], A.ell(2, -6.6, 5, 3.8)) + A.P(T[2], A.circ(8, -6.8, 4.2)) + eye(9.4, -7.6, 2);
    },
  });
  gartDefine('visitor:firefly', {
    box: [30, 30], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#d8ff7a'), dark = lc2(o, '#3a3a2a');
      let s = '';
      for (const [x, y, k] of [[-9, -12, 1], [7, -20, 0.86], [11, -6, 0.76], [-3, -25, 0.66]]) {
        const fl = `<g class="gda-glow" style="${A.T(r, 0, 3)}">${A.P(c, A.circ(x, y, 9 * k), 0.14) + A.P(c, A.circ(x, y, 5.4 * k), 0.26)}</g>`;
        s += fl + A.P(c, A.circ(x, y, 2.6 * k)) + A.P(dark, A.ell(x + 2.6 * k, y - 1, 2.1 * k, 1.8 * k)) + A.P('#ffffff', A.circ(x - 0.8 * k, y - 0.8 * k, 0.8 * k), 0.9);
      }
      return s;
    },
  });
  gartDefine('visitor:moth', {
    box: [30, 22], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c9b89a'), m = lc2(o, '#8a7a5a'), body = A.lt(c, 0.25);
      const wings = A.P(A.mix(c, m, 0.3), 'M0 -7C-8 -7 -15 -4 -13 1C-9 4 -3 0 0 -4zM0 -7C8 -7 15 -4 13 1C9 4 3 0 0 -4z') + A.P(c, 'M0 -9C-5 -21 -20 -22 -19 -11C-16 -6 -6 -6 0 -8zM0 -9C5 -21 20 -22 19 -11C16 -6 6 -6 0 -8z') + A.P(m, A.circ(-11, -14, 2.2) + A.circ(11, -14, 2.2)) + A.S(m, 1.4, 'M-16 -9Q-10 -11 -5 -8M16 -9Q10 -11 5 -8', 0.7);
      return cls(o, r, 'gda-flutter', wings) + A.P(body, A.ell(0, -6, 3.2, 6.2)) + A.P(body, A.circ(0, -13, 3.8)) + A.P('#1a1410', A.circ(-1.6, -13.4, 1) + A.circ(1.6, -13.4, 1)) + A.S(m, 1.6, 'M-1.4 -16q-2-3.4-5-3.4M1.4 -16q2-3.4 5-3.4');
    },
  });
  gartDefine('visitor:snail', {
    box: [22, 16], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c9a26a'), b = lc2(o, '#8a8a7a'), T = A.tone3(c);
      const foot = A.mix(b, '#e8dcc0', 0.5);
      const body = legs('M8.6 -4Q9-9 8-12M12.4 -4Q14-9 14-12', foot, 1.6) + A.P(foot, 'M-12 0Q-12.8 -2.8 -8 -3H9Q10 -6 13 -5.6Q16 -4.4 14.6 -1.4Q13.6 0 10 0z') + A.P('#fbf8ee', A.circ(8, -13, 1.9) + A.circ(14, -13, 1.9)) + A.P('#1a1410', A.circ(8.4, -13, 1.1) + A.circ(14.4, -13, 1.1)) + A.P(T[1], A.circ(-2, -8.6, 8)) + A.S(T[0], 1.7, 'M-2 -8.6m-5 0a5 5 0 1 1 8 3.4a3 3 0 1 1 -4 -2.6') + lit(-5, -13, 3, 1.5, 0.5);
      return cls(o, r, 'gart-creep', body);
    },
  });

  /* ================= birds ================= */
  /**
   * A chubby bird, facing right, on two short legs. q: back, belly, head (default back), cap, mask (markup after the head),
   * beak, bl (beak length), tail ('up' | 'long' | 'short'), k (size), wingBar, hop (little life).
   */
  function bird(o, r, q) {
    const B = A.tone3(q.back), Be = A.tone3(q.belly), H = A.tone3(q.head || q.back), bl = q.bl || 4, leg = q.leg || '#a86a3a';
    const tail = q.tail === 'up' ? `M-9 -11L-15 -20Q-11 -21.4 -9.4 -19L-4 -13z` : q.tail === 'short' ? 'M-9 -9L-14.4 -10.6Q-15 -7 -12 -5.6L-8 -6z' : 'M-9 -10L-19 -9.4Q-20 -5.6 -17 -4.6L-8 -6z';
    const head = A.P(H[1], A.circ(7.2, -18.6, 7.6)) + (q.cap ? A.P(q.cap, `M0.6 -21.4Q2.4 -26.6 7.6 -26.4Q12.6 -26.4 14.2 -21.6Q7.4 -24 0.6 -21.4z`) : '') + (q.mask || '') + A.P(q.beak || '#f2a832', `M13.6 -20.4L${f1(14.4 + bl)} -18.4L13.6 -16.6z`) + eye(9.8, -19.8, 2) + blush(7.4, -15.6, 1.9);
    const wing = A.P(B[0], 'M-8.4 -10.6Q-6 -17.4 1.4 -15Q3.8 -9.6 -1 -5.8Q-7.4 -5.2 -8.4 -10.6z') + (q.wingBar ? A.S(q.wingBar, 1.9, 'M-5.4 -11.6Q-1.8 -13 1.2 -11') : '') + lit(-3, -13.4, 2.6, 1.2, 0.3);
    const body = legs(`M-2.4 -3.4V0h2.4M3 -3.4V0h2.4`, leg, 1.6) + cls(o, r, 'gart-wag', A.P(B[0], tail)) + A.P(B[1], A.ell(0, -11, 11, 9.4)) + A.P(Be[1], A.ell(4.4, -8.8, 7, 6.6)) + A.P(Be[2], A.ell(2.8, -9.4, 3.4, 2.8), 0.6) + wing + cls(o, r, 'gart-peck', head);
    return q.k && q.k !== 1 ? `<g transform="scale(${q.k})">${body}</g>` : body;
  }
  gartDefine('visitor:robin', { box: [30, 26], fit: 'none', draw(o, r) { const c = lc(o, '#e2662b'), b = lc2(o, '#8a6a4a'); return bird(o, r, { back: b, belly: c, beak: '#3a2a20', bl: 3, tail: 'short', mask: A.P(c, 'M3.8 -13.4Q0.4 -16.6 3.6 -19.4Q7.6 -21 11.6 -19Q15 -15.6 11 -12.6z') }); } });
  gartDefine('visitor:blue-tit', { box: [30, 26], fit: 'none', draw(o, r) { const c = lc(o, '#4a8fd8'), y = lc2(o, '#f2d33a'); return bird(o, r, { back: A.mix(c, '#6a9a6a', 0.3), belly: y, head: '#f7f5ee', cap: c, wingBar: '#f7f5ee', beak: '#3a3a3a', bl: 2.6, tail: 'short', mask: A.S('#2a3a5a', 1.5, 'M1.4 -19Q7 -21 13.6 -18.6') }); } });
  gartDefine('visitor:blackbird', { box: [34, 26], fit: 'none', draw(o, r) { const c = lc(o, '#1f1f1f'), y = lc2(o, '#f2a02b'); return bird(o, r, { back: '#2e2c30', belly: '#3c3a3e', beak: y, tail: 'long', leg: '#3a2a20', mask: A.P(y, A.circ(9.8, -19.8, 3), 0.95) }); } });
  gartDefine('visitor:wren', { box: [22, 18], fit: 'none', draw(o, r) { const c = lc(o, '#8a5a3a'), b = lc2(o, '#c9a26a'); return bird(o, r, { back: c, belly: b, beak: '#4a3a2a', bl: 3.4, tail: 'up', k: 0.76, mask: A.S(A.lt(b, 0.4), 1.4, 'M2 -21Q8 -23.4 13.6 -21') }); } });
  gartDefine('visitor:goldfinch', { box: [30, 22], fit: 'none', draw(o, r) { const c = lc(o, '#e0a93a'), m = lc2(o, '#d8342a'); return bird(o, r, { back: '#b8946a', belly: '#f2e6cc', head: '#f7f5ee', cap: '#2a2420', wingBar: c.startsWith('#') ? '#f2c21e' : c, beak: '#e8d8b8', bl: 3, tail: 'short', mask: A.P('#d8342a', 'M11 -24Q15.4 -22 14.6 -15.4Q10 -14.6 9.4 -19Q9.4 -22 11 -24z') }); } });
  gartDefine('visitor:wood-pigeon', { box: [38, 30], fit: 'none', draw(o, r) { const c = lc(o, '#9aa0aa'), b = lc2(o, '#d8b8c8'); return bird(o, r, { back: c, belly: b, head: A.mix(c, '#6a7a9a', 0.3), beak: '#f2c21e', bl: 2.6, tail: 'long', leg: '#c8605a', k: 1.14, mask: A.P('#f7f5ee', A.ell(2.6, -14.6, 2.6, 1.6)) }); } });
  gartDefine('visitor:tawny-owl', {
    box: [28, 38], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a6a4a'), b = lc2(o, '#e2c48a'), T = A.tone3(c), Be = A.tone3(b);
      let flecks = '';
      for (const [x, y] of [[-3, -14], [3, -14], [0, -10], [-4.6, -9], [4.6, -9], [0, -17]]) flecks += `M${x - 1.6} ${y}q1.6 1.8 3.2 0`;
      const face = A.P(Be[2], A.circ(-4.4, -25.4, 5.6) + A.circ(4.4, -25.4, 5.6)) + eye(-4.2, -25.4, 3.2) + eye(4.6, -25.4, 3.2) + A.P('#f2a832', 'M-1.6 -22L0 -18.6L1.6 -22z');
      return A.S('#6a4a30', 3.4, 'M-14 0.8Q0 -1.4 14 0.8') + A.S(b, 1.8, 'M-5 -2.4v3M-2 -2.4v3M2 -2.4v3M5 -2.4v3') + A.P(T[1], A.ell(0, -13, 11, 12.4)) + A.P(Be[1], A.ell(0, -11, 7, 8.8)) + A.S(T[0], 1.3, flecks, 0.75) + A.P(T[0], 'M-11 -17Q-14 -8 -8.4 -3Q-6 -8 -7.6 -15zM11 -17Q14 -8 8.4 -3Q6 -8 7.6 -15z') + cls(o, r, 'gart-breathe', A.P(T[1], A.circ(0, -25, 10.4)) + A.P(T[0], 'M-9 -32L-7.6 -36.4L-3.4 -33.6zM9 -32L7.6 -36.4L3.4 -33.6z') + face);
    },
  });
  gartDefine('visitor:grey-heron', {
    box: [30, 58], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#b8bec4'), d = lc2(o, '#3a3a3a'), T = A.tone3(c);
      const head = A.P(T[2], A.ell(4.4, -46, 6.2, 5)) + A.P(d, 'M-1 -48.6Q4.4 -52.4 10 -48.4Q4.4 -49.6 -1 -46.4z') + A.P('#f2a832', 'M9.6 -47.6L22 -45L9.6 -43.6z') + eye(6.4, -46.4, 1.7);
      return legs('M-3 -14V0h4M3 -14V0h4', '#c8a050', 2.2) + A.P(T[0], 'M-9 -20L-18 -13L-8.6 -13.4z') + A.P(T[1], A.ell(-1, -21, 10.4, 9.4)) + A.P(T[0], 'M-10 -23Q-4 -28 4 -24Q2 -15 -5 -13.6Q-10 -16 -10 -23z') + A.S(T[0], 8.2, 'M4 -24Q-3 -32 2 -44') + A.S(T[2], 6.2, 'M4 -24Q-3 -32 2 -44') + cls(o, r, 'gart-peck', head);
    },
  });
  gartDefine('visitor:kingfisher', { box: [32, 26], fit: 'none', draw(o, r) { const c = lc(o, '#1f8fd8'), b = lc2(o, '#f28a2b'); return bird(o, r, { back: c, belly: b, beak: '#2a2420', bl: 9, tail: 'short', leg: '#d8542a', k: 1, wingBar: A.lt(c, 0.5), mask: A.P(b, A.ell(8, -15.6, 4.6, 2.6)) + A.P('#f7f5ee', A.ell(2.6, -15.8, 2.2, 1.7)) }); } });
  gartDefine('visitor:mallard', {
    box: [38, 22], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#2f8f4a'), b = lc2(o, '#a87c4f'), W = GART_PAL.water;
      const duck = A.P('#f4f0e6', 'M-9 -6L-20 -9Q-20 -3 -13 -1z') + A.P('#efe8d8', 'M-15 -1Q-17 -10 -6 -11.6H6Q12 -10 12 -3Q10 0 2 0H-11Q-14 0 -15 -1z') + A.P(b, 'M4 -11.6Q12.4 -11 12.4 -4Q11 0 4 0Q6 -6 4 -11.6z') + A.P('#a8a498', 'M-11 -7Q-4 -11 3 -7Q1 -2.6 -6 -2.6Q-10 -3.4 -11 -7z') + A.P('#4a5ab0', A.rrect(-8, -6.6, 5.4, 2.6, 1)) + A.P(A.tone3(c)[1], A.circ(9, -15.4, 6.6)) + A.P('#f7f5ee', A.ell(7, -9.6, 5.4, 1.5)) + A.P('#f2c21e', 'M14.6 -16.4Q20 -16.4 20.6 -14.4Q19.6 -12.4 14.4 -13.2z') + eye(11, -16.8, 1.8) + lit(6.6, -18.8, 2.4, 1.1, 0.35);
      return A.P(W[2], A.ell(-1, 0.4, 21, 2.8), 0.7) + A.S('#ffffff', 1, 'M-20 2.2q7 1.4 14 0M4 2.2q6 1 13 0', 0.75) + cls(o, r, 'gart-breathe', duck);
    },
  });

  /* ================= pond life ================= */
  gartDefine('visitor:frog', {
    box: [26, 20], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#5f9f3a'), b = lc2(o, '#d8c86a'), T = A.tone3(c);
      const body = A.P(T[0], 'M-12.4 -1.6Q-14 -6.4 -9.6 -7.4Q-6.6 -4 -6.4 0H-11.6Q-12.2 -0.6 -12.4 -1.6zM12.4 -1.6Q14 -6.4 9.6 -7.4Q6.6 -4 6.4 0H11.6Q12.2 -0.6 12.4 -1.6z') + A.P(T[1], A.ell(0, -8, 10.6, 8)) + A.P(b, A.ell(0, -4.6, 6.6, 4.4)) + A.P(T[1], A.circ(-6, -14.4, 4) + A.circ(6, -14.4, 4)) + A.P('#fbf8ee', A.circ(-6, -14.8, 2.9) + A.circ(6, -14.8, 2.9)) + A.P('#1a1410', A.circ(-5.6, -14.6, 1.8) + A.circ(6.4, -14.6, 1.8)) + A.P('#ffffff', A.circ(-5, -15.4, 0.7) + A.circ(7, -15.4, 0.7)) + A.S(T[0], 1.2, 'M-5 -8.6Q0 -5.8 5 -8.6') + blush(-7.6, -8.6, 1.7) + blush(7.6, -8.6, 1.7);
      return cls(o, r, 'gart-breathe', body);
    },
  });
  gartDefine('visitor:newt', {
    box: [30, 10], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a6a3a'), b = lc2(o, '#f28a2b'), T = A.tone3(c);
      const body = legs('M-5 -2l-2.4 2.2M-3 -2l1.4 2.2M6 -2l-1.4 2.2M8 -2l1.6 2.2', T[0], 1.8) + A.P(T[1], 'M-20 -2Q-12 -7 -2 -6.8H8Q13 -9.6 16 -6.4Q17.6 -3.6 13.4 -2.4Q6 -1 -2 -1.4Q-12 -1.4 -20 -2z') + A.S(b, 1.8, 'M-14 -2.4Q-2 -1.6 8 -2.4') + eye(12.2, -6.2, 1.8) + lit(-2, -5.4, 5, 1, 0.32);
      return cls(o, r, 'gart-creep', body);
    },
  });

  /* ================= mammals ================= */
  gartDefine('visitor:hedgehog', {
    box: [30, 20], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#8a6a4a'), b = lc2(o, '#c9a26a'), T = A.tone3(c), Be = A.tone3(b);
      // the prickles: a spiky dome, three tones
      const spiky = (x, y, R, n, k) => { const pts = []; for (let i = 0; i <= n; i++) { const a = -Math.PI * 1.04 + i / n * Math.PI * 1.08, q = i % 2 ? 1 : k; pts.push([x + Math.cos(a) * R * 1.08 * q, y + Math.sin(a) * R * q]); } return A.poly(pts); };
      const body = legs('M-5 -2v2M3 -2v2', T[0], 2.2) + A.P(Be[1], 'M2 -1.4Q10 -1 15.4 -3.8Q16.4 -5.6 13.6 -7Q9.6 -10 4 -8z') + A.P(T[0], spiky(-3, -1.6, 11.4, 22, 0.82)) + A.P(T[1], spiky(-3.6, -1.6, 9.2, 16, 0.84), 0.92) + A.P(T[2], spiky(-5.4, -3, 5, 8, 0.8), 0.7) + nose(15.6, -4.4, 1.5) + eye(10.4, -6, 1.5) + blush(10, -3.4, 1.5);
      return cls(o, r, 'gart-shuffle', body);
    },
  });
  gartDefine('visitor:fox', {
    box: [46, 30], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#d8642b'), w = lc2(o, '#f7f1ea'), T = A.tone3(c), dk = '#3a2a24';
      const tail = A.P(T[1], 'M-13 -12Q-24 -14 -27 -6Q-27 -1.4 -22 -1.4Q-15 -2.6 -11 -7.4z') + A.P(w, 'M-27 -6Q-27 -1.4 -22 -1.4Q-20.4 -3 -21.4 -6.6Q-24 -8.6 -27 -6z');
      const head = A.P(T[1], 'M7.6 -22L7 -31.4L12 -27.6H17L21.6 -31.4L21.4 -22Q23 -16 14.4 -12.6Q6 -16 7.6 -22z') + A.P(T[0], 'M8.6 -28.4L8.6 -25.4L10.6 -26.4zM20.4 -28.4L20.4 -25.4L18.4 -26.4z') + A.P(w, 'M7.6 -20Q11 -18.4 14.4 -15.4Q18 -18.4 21.4 -20Q22 -15.6 14.4 -12.6Q7 -15.6 7.6 -20z') + nose(14.4, -14.8, 1.5) + eye(10.8, -21, 1.8) + eye(18, -21, 1.8);
      return legs('M-8 -5V0M-3 -5V0M5 -5V0M9.6 -5V0', dk, 3) + cls(o, r, 'gart-wag', tail) + A.P(T[1], A.rrect(-13, -14.6, 25, 10.8, 5.4)) + A.P(w, A.ell(4, -6.4, 7, 2.8)) + lit(-4, -12.4, 6.4, 1.5, 0.28) + cls(o, r, 'gart-ear', head);
    },
  });
  gartDefine('visitor:squirrel', {
    box: [28, 28], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#a8643a'), b = lc2(o, '#e8c8a8'), T = A.tone3(c);
      const tail = A.P(T[0], 'M-3 -2Q-16 -1 -16 -14Q-16 -26 -6 -27Q0 -27 0 -22Q-1 -18 -6 -18Q-9 -14 -7 -10Q-4 -6 -3 -2z') + A.P(T[1], 'M-5 -5Q-13 -6 -13 -14Q-13 -23 -6 -24.4Q-3 -24.6 -3 -22.4Q-8 -22 -9 -16Q-10 -11 -5 -5z', 0.9);
      const head = A.P(T[1], A.circ(5.8, -19.4, 6.8)) + A.P(T[1], 'M1 -24L1.6 -29L5.4 -25.4zM7 -26L10 -29.4L11 -24z') + A.P(b, A.ell(8, -17, 3.8, 3)) + eye(8, -20.6, 1.9) + nose(11.8, -18, 1) + blush(5.4, -16.6, 1.5);
      return cls(o, r, 'gart-wag', tail) + A.P(T[1], A.ell(2.4, -7.4, 7.6, 7.4)) + A.P(b, A.ell(4.4, -6.4, 4.4, 5.4)) + A.P('#8a5a2a', A.ell(8.4, -9.6, 2.2, 2.6)) + A.P('#5a3a1e', A.ell(8.4, -11.4, 2.4, 1.2)) + legs('M-1 -1.2h4M5 -1.2h4', T[0], 2.4) + cls(o, r, 'gart-peck', head);
    },
  });
  gartDefine('visitor:rabbit', {
    box: [28, 30], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#b89a7a'), b = lc2(o, '#f7f1ea'), T = A.tone3(c);
      const ears = A.P(T[1], 'M1.4 -22Q-2 -33 1.4 -35Q5 -33 5 -22zM7 -22Q7 -33 11 -34.6Q14 -32 11 -21z') + A.P('#f2b8b0', 'M2.4 -23Q0.6 -30 1.8 -32Q3.8 -30 3.8 -23zM8.4 -22.6Q8.8 -30 10.8 -31.6Q12 -29 10 -22z', 0.9);
      const head = A.P(T[1], A.ell(6.6, -17.6, 7, 6.4)) + A.P(b, A.ell(9.4, -15, 3.4, 2.6)) + nose(11.4, -16.4, 1, '#d87a7a') + eye(8.2, -19, 1.9) + blush(5, -15, 1.6);
      return A.P(b, A.circ(-9.4, -6.4, 3.6)) + A.P(T[1], A.ell(-1, -7.4, 9.4, 7.8)) + lit(-4, -11, 4, 1.8, 0.28) + A.P(T[0], A.ell(-3, -1.6, 5, 2)) + A.P(T[1], A.ell(5.4, -1.4, 3.6, 1.6)) + cls(o, r, 'gart-ear', ears) + head;
    },
  });
  gartDefine('visitor:roe-deer', {
    box: [40, 46], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#a8743a'), w = lc2(o, '#f7f1ea'), T = A.tone3(c), dk = A.dk(c, 0.45);
      const head = A.S(dk, 1.8, 'M9 -39.6L7.6 -44.4M7.6 -44.4l-2 -2M7.6 -44.4l1.4 -2.2M13.4 -39.6L15 -44.4M15 -44.4l-1.4 -2.2M15 -44.4l2 -2') + A.P(T[1], 'M4.6 -37Q0.4 -40 0.6 -35.6Q2 -33.4 5.6 -33.6zM18 -37Q22.2 -40 22 -35.6Q20.6 -33.4 17 -33.6z') + A.P(T[1], A.ell(11.4, -34.4, 7, 6.2)) + A.P(w, A.ell(13.4, -30.4, 4.2, 3)) + nose(16, -31.4, 1.3) + eye(9.2, -35, 1.9) + eye(15, -35, 1.9);
      return legs('M-9 -14V0M-4 -14V0M6 -14V0M10 -14V0', dk, 3) + A.P(w, A.circ(-13.4, -19, 3.8)) + A.P(T[1], A.rrect(-14, -26, 28, 14, 7)) + A.P(w, A.ell(-1, -13.4, 9, 2)) + A.P(w, A.circ(-8, -21.4, 1.3) + A.circ(-3, -23, 1.2) + A.circ(2, -21, 1.1), 0.9) + A.P(T[1], 'M4 -24Q5 -30 7 -33H14Q15 -28 13 -20z') + lit(-5, -23.4, 6, 1.4, 0.26) + cls(o, r, 'gart-ear', head);
    },
  });
  gartDefine('visitor:pipistrelle', {
    box: [30, 18], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#4a3a3a'), b = lc2(o, '#8a6a6a'), T = A.tone3(c);
      const wings = A.P(T[1], 'M-3 -12Q-11 -18 -20 -13Q-19 -8 -16 -5Q-14 -8 -11 -6Q-9 -9 -6 -5zM3 -12Q11 -18 20 -13Q19 -8 16 -5Q14 -8 11 -6Q9 -9 6 -5z') + A.S(T[2], 1.1, 'M-4 -11Q-11 -13 -16 -6M4 -11Q11 -13 16 -6', 0.6);
      return cls(o, r, 'gda-flutter', wings) + A.P(b, A.ell(0, -8.4, 5.4, 6.4)) + A.P(T[1], 'M-5 -14L-5.4 -20L-1.4 -16.4zM5 -14L5.4 -20L1.4 -16.4z') + A.P(b, A.circ(0, -13, 5)) + eye(-2, -13.4, 1.6) + eye(2, -13.4, 1.6) + A.S('#3a2a2a', 0.9, 'M-1.2 -10.6Q0 -9.6 1.2 -10.6');
    },
  });
  gartDefine('visitor:garden-cat', {
    box: [42, 22], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#e8a05a'), w = lc2(o, '#f7f1ea'), T = A.tone3(c);
      const stripes = A.S(T[0], 2, 'M-11 -14q2 3 1 6M-5 -15.6q2 3 1 6.6M1 -15.4q1.6 3 0.6 6.4', 0.7);
      const head = A.P(T[1], 'M7.6 -14L7 -22.6L11.6 -19H16L20.6 -22.6L20 -14Q21 -7.4 14 -6.4Q6.6 -7.4 7.6 -14z') + A.P('#f2b8b0', 'M8.4 -20.4L8.6 -18L10 -19zM19.4 -20.4L19.2 -18L17.8 -19z', 0.9) + A.P(w, A.ell(14, -9.2, 4.2, 2.6)) + nose(14, -10.4, 0.9, '#d87a7a') + shut(10, -13.4, 1.8) + shut(16.2, -13.4, 1.8) + blush(9.4, -10.4, 1.6) + blush(18.6, -10.4, 1.6);
      const sleep = A.P(T[1], 'M-17 -3Q-22 -1 -18 0.4H6Q0 -1 -6 -1.4Q-13 -1 -17 -3z') + A.P(T[1], 'M-18 -1Q-20 -16 -6 -17.4H4Q14 -16.4 15 -6Q14 0 6 0H-14Q-17.6 0 -18 -1z') + stripes + lit(-8, -14, 5, 1.5, 0.3) + A.P(w, A.ell(6, -2.2, 5, 1.8));
      return cls(o, r, 'gart-breathe', sleep + head);
    },
  });
})();
