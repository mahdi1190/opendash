/* ============================================================
   GARDEN ART, decorations I (2.18, agent 'garden-art'): fences (picket, woven
   willow, box hedge, dry stone wall, iron railings, bamboo screen), seats
   (bench, stone bench, swing seat, hammock, deckchair, picnic blanket, bistro
   set), water (bird bath, fountain, pump, water butt, sprinkler, little pond,
   wishing well) and lights (lantern, string lights, solar stakes, fire pit,
   toadstool lamps, paper lanterns). PURE.
   Drawn in art units (64 = one cell; a footprint of w cells spans -32w..32w),
   the anchor at the front edge of the footprint, standing up from y = 0 in a
   gentle three-quarter view (fronts, and a little of the tops). r turns things
   that face (fences 0 / 2 run left to right, 1 / 3 front to back); variant is
   the style. Lights are lit at dusk and night (gda-glow, gda-flicker).
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const lc = (o, fb) => (o.look && o.look.c) || fb;
  const lc2 = (o, fb) => (o.look && o.look.c2) || fb;
  const lit = o => o.night || o.dusk;
  const snowLine = (x0, x1, y, w) => A.P(PAL.snow, `M${f1(x0)} ${f1(y + 0.6)}Q${f1((x0 + x1) / 2)} ${f1(y - (w || 2.4))} ${f1(x1)} ${f1(y + 0.6)}z`, 0.95);
  /** A glowing light: halo (gda-glow) + a bright core. */
  const glow = (o, r, x, y, R, col) => (lit(o) ? `<g class="gda-glow" style="${A.T(r, 0, 3)}">${A.P(col, A.circ(x, y, R), o.night ? 0.24 : 0.14) + A.P(col, A.circ(x, y, R * 0.55), o.night ? 0.32 : 0.18)}</g>` : '');
  /** Run a fence left-right (r 0/2) or front-back (r 1/3): front-back fences step their parts back up the cell. */
  function fence(o, part, n) {
    let s = '';
    if (o.r % 2 === 0) { for (let i = 0; i < n; i++) s += part(-32 + (i + 0.5) * 64 / n, 0, i, 1); return s; }
    for (let i = n - 1; i >= 0; i--) s += part(0, -i * 40 / n, i, 0);
    return s;
  }
  const PICKET = [['#f4f1ea', '#cfc8b8'], ['#a8c4dc', '#7a98b4'], ['#b4c8a8', '#869a7a']];

  /* ================= fences ================= */
  gartDefine('decor:picket-fence', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = PICKET[o.variant % 3];
      const ew = o.r % 2 === 0;
      let rails = '', pk = '', pkS = '', snow = '';
      if (ew) rails = A.rect(-32, -24, 64, 3) + A.rect(-32, -11, 64, 3);
      else rails = A.poly([[-1.5, -24], [1.5, -24 - 40 + 3], [1.5, -24 - 40 + 6], [-1.5, -21]]) + A.poly([[-1.5, -11], [1.5, -11 - 40 + 3], [1.5, -11 - 40 + 6], [-1.5, -8]]);
      pk = fence(o, (x, y, i, front) => { const w = front ? 6.4 : 4.4; pkS += A.rect(x + w * 0.2, y - 33, w * 0.3, 33); if (o.season === 'winter') snow += A.ell(x, y - 34, w * 0.55, 1.4); return `M${f1(x - w / 2)} ${f1(y)}V${f1(y - 31)}L${f1(x)} ${f1(y - 35)}L${f1(x + w / 2)} ${f1(y - 31)}V${f1(y)}z`; }, ew ? 6 : 5);
      return A.P(c2, rails) + A.P(c, pk) + A.P(c2, pkS, 0.55) + A.P(PAL.snow, snow);
    },
  });
  gartDefine('decor:wattle-fence', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#9a7448'), c2 = lc2(o, '#6f5232');
      if (o.r % 2 === 1) {
        // seen end-on: a narrow woven band stepping back up the cell
        let s = '';
        for (let i = 4; i >= 0; i--) { const y = -i * 8; s += A.P(c, A.rect(-2.6, y - 34, 5.2, 34)) + A.S(c2, 0.8, `M-2.6 ${y - 28}h5.2M-2.6 ${y - 20}h5.2M-2.6 ${y - 12}h5.2`, 0.8); }
        return s + A.P(c2, A.rect(-1, -34 - 33, 2, 36));
      }
      // stakes, and willow rods woven over and under them
      let stakes = '', rods = '', rodsL = '';
      for (let i = 0; i < 6; i++) stakes += A.rect(-30 + i * 12, -36, 2.6, 36);
      for (let k = 0; k < 7; k++) { const y = -4 - k * 4.6; let d = `M-32 ${f1(y)}`; for (let i = 0; i < 6; i++) d += `Q${f1(-30 + i * 12 + 1.3)} ${f1(y + ((i + k) % 2 ? 1.8 : -1.8))} ${f1(-24 + i * 12)} ${f1(y)}`; (k % 2 ? (rods += d) : (rodsL += d)); }
      let s = A.P(c2, stakes) + A.S(c, 3.6, rods) + A.S(A.lt(c, 0.25), 3.4, rodsL) + A.S(c2, 0.5, rods, 0.6);
      if (o.season === 'winter') s += snowLine(-32, 32, -36, 3);
      return s;
    },
  });
  gartDefine('decor:box-hedge', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const L = A.leaf4(lc(o, '#3f7a3a'));
      const ew = o.r % 2 === 0;
      const body = ew ? A.rrect(-32, -30, 64, 30, 6) : A.poly([[-12, 0], [12, 0], [12, -70], [-12, -70]]);
      let tex = '', lit2 = '';
      for (let i = 0; i < (o.lod ? 26 : 12); i++) { const x = ew ? rr(r, -30, 30) : rr(r, -10, 10), y = ew ? rr(r, -28, -3) : rr(r, -68, -3); tex += A.ell(x, y, 2.2, 1.6); if (y < (ew ? -18 : -40) && x < 6) lit2 += A.ell(x, y, 2, 1.4); }
      let s = A.shadow(ew ? 34 : 14, 4) + A.P(L[0], body) + A.P(L[1], ew ? A.rrect(-32, -30, 64, 12, 6) : A.rect(-12, -70, 24, 26)) + A.P(L[1], tex, 0.9) + A.P(L[3], lit2, 0.75);
      if (o.season === 'winter') s += ew ? snowLine(-31, 31, -29, 3) : A.P(PAL.snow, A.rect(-11, -71, 22, 4), 0.9);
      if (o.season === 'spring') s += A.P(L[3], A.rect(ew ? -30 : -10, ew ? -30 : -70, ew ? 60 : 20, 3), 0.6);
      return s;
    },
  });
  gartDefine('decor:stone-wall', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#b0a898'), c2 = lc2(o, '#8a8274');
      const ew = o.r % 2 === 0;
      let st = '', stD = '', stL = '';
      if (ew) {
        for (let row = 0; row < 4; row++) { let x = -32 + (row % 2) * 5; while (x < 32) { const w = 8 + r() * 7, y = -row * 7 - 7; const d = A.rrect(Math.max(-32, x), y, Math.min(w, 32 - x), 6.4, 2.2); ((row + Math.round(x)) % 3 ? (st += d) : (stD += d)); stL += A.rect(Math.max(-31, x + 1.2), y + 0.8, Math.min(w * 0.5, 31 - x), 1.2); x += w + 0.8; } }
        st += A.rrect(-32, -33, 64, 5, 2);
        return A.shadow(34, 3) + A.P(A.dk(c2, 0.3), A.rect(-32, -33, 64, 33)) + A.P(c, st) + A.P(c2, stD) + A.P('#ffffff', stL, 0.3) + A.P('#7a9a5a', A.ell(rr(r, -20, 20), -2, 5, 1.6), 0.7) + (o.season === 'winter' ? snowLine(-32, 32, -33, 3) : '');
      }
      for (let i = 5; i >= 0; i--) { const y = -i * 8; st += A.rrect(-9, y - 30, 18, 30, 2.4); stD += A.rect(-9, y - 30, 18, 4); }
      return A.P(c2, st) + A.P(c, stD) + (o.season === 'winter' ? A.P(PAL.snow, A.rect(-9, -71, 18, 3)) : '');
    },
  });
  gartDefine('decor:iron-railings', {
    box: [64, 46], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#2f3438'), c2 = lc2(o, '#5a6066');
      const ew = o.r % 2 === 0;
      let bars = '', tops = '', curls = '';
      const n = ew ? 9 : 6;
      const s0 = fence(o, (x, y) => { bars += `M${f1(x)} ${f1(y)}V${f1(y - 42)}`; tops += `M${f1(x - 1.6)} ${f1(y - 41)}L${f1(x)} ${f1(y - 46)}L${f1(x + 1.6)} ${f1(y - 41)}z`; curls += `M${f1(x)} ${f1(y - 34)}a2.4 2.4 0 1 1 ${ew ? 3.4 : 1.6} 2`; return ''; }, n);
      const rails = ew ? A.rect(-32, -38, 64, 2) + A.rect(-32, -6, 64, 2) : A.poly([[-1, -38], [1, -76], [1, -74], [-1, -36]]) + A.poly([[-1, -6], [1, -44], [1, -42], [-1, -4]]);
      return s0 + A.P(c, rails) + A.S(c, 1.6, bars) + A.S(c2, 0.6, bars, 0.6) + A.P(c, tops) + A.S(c, 1, curls) + (o.season === 'winter' ? A.P(PAL.snow, tops, 0.9) : '');
    },
  });
  gartDefine('decor:bamboo-screen', {
    box: [64, 56], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c9b36a'), c2 = lc2(o, '#8f7a3a');
      const ew = o.r % 2 === 0;
      let canes = '', nodes = '', lit2 = '';
      if (ew) for (let i = 0; i < 14; i++) { const x = -31 + i * 4.6, h = 54 + (i % 3) * 1.4; canes += A.rrect(x, -h, 4.2, h, 1.2); lit2 += A.rect(x + 0.6, -h + 1, 1, h - 2); for (let k = 1; k < 4; k++) nodes += `M${f1(x)} ${f1(-k * 14 - (i % 2) * 3)}h4.2`; }
      else for (let i = 7; i >= 0; i--) { const y = -i * 5; canes += A.rrect(-2.4, y - 54, 4.8, 54, 1.2); nodes += `M-2.4 ${y - 18}h4.8M-2.4 ${y - 36}h4.8`; }
      return A.P(c, canes) + A.P(A.lt(c, 0.3), lit2, 0.6) + A.S(c2, 0.9, nodes) + (ew ? A.S('#6a5a3a', 1.2, 'M-32 -20h64M-32 -42h64', 0.8) : '');
    },
  });

  /* ================= seats ================= */
  const BENCH = [null, ['#7a9a7a', '#5a7a5a'], ['#4a6a9a', '#34507a']];
  gartDefine('decor:bench', {
    box: [128, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = BENCH[o.variant % 3] || [lc(o, '#9a6a3a'), lc2(o, '#6f4a28')];
      const side = o.r % 2 === 1, back = o.r === 2;
      if (side) {
        // seen from the end: the seat in profile, the back leaning, two legs
        const k = o.r === 3 ? -1 : 1;
        return A.shadow(20, 4) + A.P(c2, A.rect(-14 * k, -18, 3 * k, 18) + A.rect(10 * k, -18, 3 * k, 18)) + A.P(c, A.poly([[-16 * k, -18], [14 * k, -18], [14 * k, -22], [-16 * k, -22]])) + A.P(c, A.poly([[-16 * k, -22], [-12 * k, -22], [-18 * k, -42], [-22 * k, -42]])) + A.P(A.lt(c, 0.25), A.rect(-16 * k, -22, 30 * k, 1.2), 0.7);
      }
      let slats = '', lit2 = '';
      for (let k = 0; k < 3; k++) { slats += A.rect(-50, -23 + k * 2.4 - 6, 100, 2); lit2 += A.rect(-50, -23 + k * 2.4 - 6, 100, 0.6); }
      let backS = '';
      for (let k = 0; k < 3; k++) backS += A.rect(-50, -44 + k * 5, 100, 3.6);
      const legs = A.rect(-46, -20, 4, 20) + A.rect(42, -20, 4, 20) + A.rect(-44, -46, 3, 26) + A.rect(41, -46, 3, 26);
      const arms = A.rrect(-54, -32, 8, 3, 1.4) + A.rrect(46, -32, 8, 3, 1.4) + A.rect(-52, -32, 2.6, 14) + A.rect(49.4, -32, 2.6, 14);
      let s = A.shadow(56, 7) + A.P(c2, legs);
      s += back ? A.P(c, slats) + A.P(c, backS) + A.P(A.lt(c, 0.25), backS.replace(/v3\.6/g, 'v1'), 0.6) + A.P(c2, arms) : A.P(c, backS) + A.P(A.dk(c, 0.15), slats) + A.P(A.lt(c, 0.3), lit2, 0.7) + A.P(c2, arms);
      if (o.season === 'winter') s += snowLine(-50, 50, -44, 2.6) + snowLine(-50, 50, back ? -23 : -27, 2);
      if (o.season === 'autumn') s += A.P('#d9671c', A.leaf(-20, -27, 1.4, 5, 1.6)) + A.P('#e8a23a', A.leaf(14, -27, -1.2, 4.4, 1.4));
      return s;
    },
  });
  gartDefine('decor:stone-bench', {
    box: [128, 34], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c7c2b8'), c2 = lc2(o, '#9d968a');
      if (o.r % 2 === 1) return A.shadow(20, 4) + A.P(c2, A.rect(-6, -16, 12, 16)) + A.P(c, A.rrect(-16, -22, 32, 6, 2)) + A.P(A.lt(c, 0.3), A.rect(-15, -22, 30, 1.4), 0.7);
      // a slab on two carved scroll legs, lichen and moss
      let s = A.shadow(56, 6) + A.P(c2, `M-44 0v-12q0-4 4-4h6q4 0 4 4v12zM30 0v-12q0-4 4-4h6q4 0 4 4v12z`) + A.S(A.dk(c2, 0.2), 1, 'M-41-8a3 3 0 1 1 5 0M33-8a3 3 0 1 1 5 0', 0.6);
      s += A.P(c2, A.rrect(-54, -24, 108, 9, 3)) + A.P(c, A.rrect(-54, -26, 108, 6, 3)) + A.P(A.lt(c, 0.35), A.rect(-50, -25.4, 60, 1.2), 0.7);
      s += A.P('#9aa86a', A.ell(-36, -24.6, 5, 1.2) + A.ell(24, -24.4, 3, 1), 0.7) + A.P('#d8c87a', A.circ(30, -21, 1.6), 0.6);
      if (o.season === 'winter') s += snowLine(-54, 54, -26, 3);
      return s;
    },
  });
  gartDefine('decor:swing-seat', {
    box: [128, 84], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#f4f1ea'), c2 = lc2(o, '#7a9fb8');
      // an A-frame, a canopy, a cushioned seat hanging on chains (it swings: gart-swing)
      const frame = A.S('#8a6a4a', 4, 'M-56 0L-46 -80M-36 0L-46 -80M56 0L46 -80M36 0L46 -80') + A.P('#8a6a4a', A.rect(-48, -82, 96, 4));
      const canopy = A.P(c2, 'M-54 -86Q0 -98 54 -86L50 -78Q0 -88 -50 -78z') + A.S(A.lt(c2, 0.35), 1, 'M-48 -86Q0 -96 48 -86', 0.7);
      let fringe = '';
      for (let i = 0; i < 12; i++) fringe += `M${f1(-48 + i * 8.7)} ${f1(-79 - Math.sin(i / 11 * Math.PI) * 6)}l2 4l2-4z`;
      const seat = A.S('#9aa0a6', 1, 'M-36 -78V-34M36 -78V-34') + A.P(c, A.rrect(-40, -36, 80, 8, 3)) + A.P(c, A.rrect(-40, -56, 80, 20, 4)) + A.P(c2, A.rect(-36, -52, 72, 4) + A.rect(-36, -44, 72, 4), 0.6) + A.P(A.lt(c, 0.3), A.rect(-38, -55, 40, 1.4), 0.7);
      const swing = o.anim ? `<g class="gart-swing" style="${A.T(r, 0, 4)}">${seat}</g>` : seat;
      let s = A.shadow(60, 7) + frame + swing + canopy + A.P(c2, fringe);
      if (o.season === 'winter') s += snowLine(-54, 54, -92, 3);
      return s;
    },
  });
  const STRIPES = [['#e8b46a', '#c4507a', '#f4efe4'], ['#4a7ab8', '#f4efe4', '#f2c21e'], ['#5a9a6a', '#f4efe4', '#e8846a']];
  gartDefine('decor:hammock', {
    box: [128, 58], fit: 'none',
    draw(o, r) {
      const st = STRIPES[o.variant % 3];
      const posts = A.P('#7a5636', A.rect(-58, -56, 5, 56) + A.rect(53, -56, 5, 56)) + A.P('#a87c4f', A.rect(-58, -56, 1.6, 56) + A.rect(53, -56, 1.6, 56), 0.7);
      // the cloth sags between the posts; stripes follow the curve
      let cloth = '', stripes = ['', ''];
      cloth = 'M-50 -48Q0 -4 50 -48L50 -42Q0 4 -50 -42z';
      for (let k = 0; k < 4; k++) { const y0 = -47 + k * 1.6; stripes[k % 2] += `M-48 ${f1(y0)}Q0 ${f1(-4 + k * 1.6)} 48 ${f1(y0)}`; }
      const ropes = A.S('#d8c8a0', 0.8, 'M-53 -52L-50 -46M-53 -52L-50 -42M53 -52L50 -46M53 -52L50 -42');
      const hang = A.P(st[0], cloth) + A.S(st[1], 2, stripes[0]) + A.S(st[2], 1.6, stripes[1]) + A.S('#ffffff', 0.6, 'M-40 -38Q0 -6 40 -38', 0.4);
      let s = A.shadow(56, 6) + posts + ropes + (o.anim ? `<g class="gart-swing" style="${A.T(r, 0, 4)}">${hang}</g>` : hang);
      if (o.season === 'winter') s += snowLine(-30, 30, -24, 2);
      return s;
    },
  });
  const DECK = [['#e04a3a', '#f4f1ea'], ['#3a6fc4', '#f4f1ea'], ['#2f9a6a', '#f6d34a'], ['#f2a7c8', '#f4f1ea']];
  gartDefine('decor:deckchair', {
    box: [64, 44], fit: 'none',
    draw(o, r) {
      const [a, b] = DECK[o.variant % 4];
      const wood = '#c8a46a';
      if (o.r % 2 === 1) {
        // the famous zig-zag profile, the canvas sagging between
        const k = o.r === 3 ? -1 : 1;
        return A.shadow(20, 4) + A.S(wood, 2.4, `M${-14 * k} 0L${10 * k} -36M${-6 * k} -16L${14 * k} 0M${-12 * k} -14L${8 * k} -12`) + A.P(a, `M${-10 * k} -14Q${0} -8 ${8 * k} -32L${10 * k} -36Q${2 * k} -12 ${-11 * k} -12z`);
      }
      let stripes = '';
      for (let i = 0; i < 4; i++) stripes += A.rect(-14 + i * 7, -40, 3.5, 26);
      const frame = A.S(wood, 2.6, 'M-16 0L-14 -42M16 0L14 -42M-18 -16H18');
      const canvas = o.r === 2 ? A.P(A.dk(a, 0.15), A.rect(-14, -40, 28, 26)) : A.P(b, 'M-14 -40H14V-14Q0 -10 -14 -14z') + A.P(a, stripes) + A.S('#ffffff', 0.6, 'M-12 -38v20', 0.5);
      let s = A.shadow(22, 4) + frame + canvas;
      if (o.season === 'winter') s += snowLine(-15, 15, -42, 2);
      return s;
    },
  });
  const GINGHAM = [['#d83a3a', '#f4f1ea'], ['#3a6fc4', '#f4f1ea'], ['#3f7a3a', '#f2c21e']];
  gartDefine('decor:picnic-blanket', {
    box: [128, 40], fit: 'none',
    draw(o, r) {
      const [a, b] = GINGHAM[o.variant % 3];
      // a blanket on the grass (from above, a little skewed), a basket, sandwiches and a jug
      const quad = [[-54, -4], [50, -2], [56, -34], [-48, -36]];
      const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
      let checks = '';
      for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2 === 0) { const p0 = lerp(lerp(quad[0], quad[3], j / 4), lerp(quad[1], quad[2], j / 4), i / 8), p1 = lerp(lerp(quad[0], quad[3], j / 4), lerp(quad[1], quad[2], j / 4), (i + 1) / 8), p2 = lerp(lerp(quad[0], quad[3], (j + 1) / 4), lerp(quad[1], quad[2], (j + 1) / 4), (i + 1) / 8), p3 = lerp(lerp(quad[0], quad[3], (j + 1) / 4), lerp(quad[1], quad[2], (j + 1) / 4), i / 8); checks += A.poly([p0, p1, p2, p3]); }
      let s = A.P(b, A.poly(quad)) + A.P(a, checks, 0.85) + A.P(a, A.poly([[-54, -4], [50, -2], [50, 0], [-54, -2]]), 0.6);
      s += A.P('#b08a5a', A.rrect(18, -26, 20, 12, 2)) + A.P('#8a6a3a', A.rect(18, -26, 20, 2.4)) + A.S('#8a6a3a', 1.6, 'M20 -26Q28 -36 36 -26');
      s += A.P('#f4e8c8', 'M-30 -18l10 -3 -2 7z') + A.P('#f2e4b0', 'M-26 -24l8 -2 -1 5z') + A.P('#e8f2f8', A.rrect(-6, -30, 6, 10, 2), 0.9) + A.P('#f2c21e', A.rect(-5.4, -24, 4.8, 3.4), 0.8);
      if (o.season === 'winter') s += A.P(PAL.snow, A.blob(r, 0, -18, 30, 8, 9, 0.4), 0.7);
      return s;
    },
  });
  const BISTRO = [['#3f6fa8', '#2f3438'], ['#3f8a5a', '#2f3438'], ['#c84a3a', '#2f3438']];
  gartDefine('decor:bistro-set', {
    box: [128, 46], fit: 'none',
    draw(o, r) {
      const [c, c2] = BISTRO[o.variant % 3];
      const chair = (x, k) => A.S(c, 1.8, `M${x - 6 * k} 0L${x - 5 * k} -16M${x + 6 * k} 0L${x + 5 * k} -16M${x - 6 * k} -16V-34`) + A.P(c, A.ell(x, -16, 8, 2.4)) + A.S(c, 1.4, `M${x - 6 * k} -34Q${x} -40 ${x + 4 * k} -32M${x - 6 * k} -26Q${x} -30 ${x + 4 * k} -24`);
      const table = A.S(c, 2.2, 'M0 -2V-26M-8 0L0 -6L8 0') + A.P(c, A.ell(0, -27, 18, 4.4)) + A.P(A.lt(c, 0.3), A.ell(-4, -28, 10, 2), 0.6);
      const cups = A.P('#f4f1ea', A.rect(-8, -34, 5, 5) + A.rect(4, -34, 5, 5)) + A.S('#f4f1ea', 1, 'M-3 -32a1.4 1.4 0 1 1 0 2M9 -32a1.4 1.4 0 1 1 0 2') + A.P('#e86a8a', A.circ(-1, -36, 1.6) + A.circ(1, -37, 1.4), 0.9) + A.S('#5a8a3a', 0.6, 'M0 -34v-3');
      let s = A.shadow(54, 6) + chair(-34, 1) + chair(34, -1) + table + cups;
      if (o.season === 'winter') s += snowLine(-18, 18, -28, 2);
      return s;
    },
  });

  /* ================= water ================= */
  gartDefine('decor:bird-bath', {
    box: [64, 48], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#c7c2b8'), w = lc2(o, '#7fb3d8');
      let s = A.shadow(16, 4) + A.P(A.dk(c, 0.15), 'M-10 0h20l-2-4h-16z') + A.P(c, 'M-4 -4q-2-14 -3-24h14q-1 10-3 24z') + A.P(A.lt(c, 0.3), 'M-3 -6q-1.4-12 -2-21h3q0 10 0.6 21z', 0.6);
      s += A.P(A.dk(c, 0.1), A.ell(0, -30, 20, 6)) + A.P(c, A.ell(0, -32, 20, 5.6)) + A.P(o.season === 'winter' ? '#e4eef4' : w, A.ell(0, -33, 16, 3.6)) + A.P('#ffffff', A.ell(-6, -34, 5, 1), 0.6);
      if (o.season !== 'winter' && o.anim) s += `<g class="gda-ripple" style="${A.T(r, 0, 4)}">${A.S('#ffffff', 0.7, A.ell(4, -33, 5, 1.4), 0.8)}</g>`;
      if (o.season === 'winter') s += A.S('#ffffff', 0.6, 'M-8 -34l6 1.6M2 -33.4l6-1', 0.8) + snowLine(-20, -8, -36, 2);
      return s;
    },
  });
  gartDefine('decor:fountain', {
    box: [128, 92], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#d3cec4'), w = lc2(o, '#7fb3d8'), ice = o.season === 'winter';
      // a round pool, a pedestal, two tiers, water falling from bowl to bowl, a jet on top
      let s = A.shadow(56, 9) + A.P(A.dk(c, 0.18), A.ell(0, -12, 54, 14)) + A.P(c, A.ell(0, -15, 54, 13)) + A.P(ice ? '#e4eef4' : w, A.ell(0, -16, 46, 9.6)) + A.P(A.lt(w, 0.3), A.ell(-14, -18, 16, 3), ice ? 0 : 0.6);
      s += A.P(c, A.rect(-6, -54, 12, 40)) + A.P(A.lt(c, 0.3), A.rect(-5, -52, 2.4, 36), 0.6);
      s += A.P(A.dk(c, 0.12), A.ell(0, -50, 30, 7)) + A.P(c, A.ell(0, -52, 30, 6.4)) + A.P(ice ? '#e4eef4' : w, A.ell(0, -53, 24, 4.4));
      s += A.P(c, A.rect(-3.6, -76, 7.2, 22)) + A.P(A.dk(c, 0.12), A.ell(0, -74, 14, 3.6)) + A.P(c, A.ell(0, -75.6, 14, 3)) + A.P(c, A.circ(0, -80, 3));
      if (!ice) {
        const water = A.S(w, 1.4, 'M-13 -75Q-17 -66 -22 -54M13 -75Q17 -66 22 -54M-28 -51Q-34 -36 -40 -18M28 -51Q34 -36 40 -18', 0.85) + A.S('#ffffff', 0.8, 'M0 -83Q-2 -90 0 -94Q2 -90 0 -83', 0.9);
        s += o.anim ? `<g class="gda-bob" style="${A.T(r, 0, 2)}">${water}</g>` + `<g class="gda-ripple" style="${A.T(r, 0, 3)}">${A.S('#ffffff', 0.9, A.ell(-30, -15, 8, 2) + A.ell(30, -15, 8, 2), 0.7)}</g>` : water;
      } else s += A.S('#ffffff', 1, 'M-20 -18l14 2M8 -15l16-2', 0.8) + snowLine(-30, 30, -53, 2.4) + A.P(PAL.snow, A.ell(0, -77, 12, 2));
      return s;
    },
  });
  gartDefine('decor:water-pump', {
    box: [64, 60], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#3f6f5a'), c2 = lc2(o, '#2f3438');
      let s = A.shadow(18, 4) + A.P('#9a9488', A.rrect(-16, -8, 32, 8, 2)) + A.P('#b4aea2', A.rect(-15, -8, 30, 2), 0.6);
      s += A.P(c, A.rrect(-6, -50, 12, 42, 3)) + A.P(A.lt(c, 0.25), A.rect(-5, -48, 2.6, 38), 0.7) + A.P(c, A.ell(0, -51, 7, 2.6)) + A.P(c2, A.circ(0, -55, 3));
      s += A.P(c, 'M6 -38h10q3 0 3 3v3h-4v-2h-9z') + A.S(c2, 2.6, 'M-4 -48L-18 -62') + A.P(c2, A.circ(-18, -62, 2.4));
      s += A.P('#8a6a4a', A.rrect(8, -18, 18, 10, 2)) + A.P(o.season === 'winter' ? '#e4eef4' : '#7fb3d8', A.ell(17, -18, 8, 1.6));
      if (o.season !== 'winter') s += o.anim ? `<g class="gda-bob" style="${A.T(r, 0, 2)}">${A.P('#a8d4ec', A.leaf(17, -26, Math.PI, 3, 1), 0.9)}</g>` : '';
      else s += A.P(PAL.snow, A.ell(0, -53, 6, 1.6));
      return s;
    },
  });
  gartDefine('decor:water-butt', {
    box: [64, 54], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#4f6f3a'), c2 = lc2(o, '#3a4f2a');
      let s = A.shadow(18, 4) + A.P('#8a8478', A.rect(-14, -6, 28, 6)) + A.P(c2, 'M-14 -6Q-16 -28 -13 -50h26q3 22 1 44z') + A.P(c, 'M-12 -6Q-14 -28 -11 -50h22q3 22 1 44z');
      s += A.S(c2, 1.6, 'M-13 -18q13 2 26 0M-13 -38q13 2 26 0') + A.P(A.lt(c, 0.25), 'M-9 -8Q-10 -28 -8 -48h3q-2 20-1 40z', 0.6) + A.P(c2, A.ell(0, -50, 13, 3)) + A.P(c, A.ell(0, -51, 12, 2.4));
      s += A.P('#c8b45a', A.rect(-2, -14, 6, 3)) + A.P('#a8943a', A.rect(2, -13, 3, 4));
      // a downpipe from the roof above, ending over the lid
      s += A.S('#6a6e72', 3, 'M10 -60V-52');
      if (o.season === 'winter') s += A.P(PAL.snow, A.ell(0, -52, 11, 2));
      return s;
    },
  });
  gartDefine('decor:sprinkler', {
    box: [64, 30], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#e8c33a'), w = lc2(o, '#7fb3d8');
      let s = A.shadow(12, 2.6) + A.P('#5a5f64', A.rrect(-8, -6, 16, 6, 2)) + A.P(c, A.rect(-1.6, -14, 3.2, 8)) + A.P(c, A.ell(0, -15, 6, 2)) + A.S('#4a8a4a', 2, 'M8 -3Q20 -2 30 -6');
      if (o.season !== 'winter' && !o.night) {
        const spray = A.S(w, 1, 'M0 -16Q-12 -30 -26 -8M0 -16Q-6 -32 -14 -6M0 -16Q6 -32 14 -6M0 -16Q12 -30 26 -8', 0.75) + A.P('#ffffff', A.circ(-20, -18, 0.8) + A.circ(18, -20, 0.8) + A.circ(-8, -26, 0.7) + A.circ(10, -24, 0.7), 0.9);
        s += o.anim ? `<g class="gda-flicker" style="${A.T(r, 0, 2)}">${spray}</g>` : spray;
      }
      return s;
    },
  });
  gartDefine('decor:mini-pond', {
    box: [128, 80], fit: 'none',
    draw(o, r) {
      const w = lc(o, '#5f9fc4'), stone = lc2(o, '#a9a99a'), ice = o.season === 'winter';
      // a kidney-shaped pond across the 2 x 2 footprint, ringed with stones, a lily pad, a few reeds
      const shape = 'M-48 -40Q-56 -66 -24 -72Q4 -76 30 -68Q56 -60 50 -36Q46 -12 14 -10Q-16 -8 -34 -16Q-44 -22 -48 -40z';
      let stones = '', stonesL = '';
      for (let i = 0; i < 18; i++) { const t = i / 18 * Math.PI * 2, x = Math.cos(t) * 52, y = -40 + Math.sin(t) * 31; stones += A.ell(x, y, 6 + (i % 3), 4); stonesL += A.ell(x - 1.4, y - 1.2, 2.4, 1.2); }
      let s = A.P(A.dk(w, 0.3), A.blob(r, 0, -40, 50, 30, 10, 0.12)) + A.P(ice ? '#dceaf2' : w, shape);
      s += A.S(ice ? '#ffffff' : A.lt(w, 0.35), 1.4, 'M-30 -58q14-6 30-4M6 -28q12-2 22-8', 0.6);
      s += A.P(stone, stones) + A.P(A.lt(stone, 0.35), stonesL, 0.8);
      if (!ice) {
        s += A.P('#3f8f5a', 'M10 -40l8-5a8 3 0 1 1 -6 6z') + A.P('#f7c5d8', A.star(16, -44, 6, 3, 1.4));
        if (o.anim) s += `<g class="gda-ripple" style="${A.T(r, 0, 4)}">${A.S('#ffffff', 0.9, A.ell(-16, -36, 9, 2.6), 0.7)}</g>`;
      } else s += A.S('#ffffff', 0.9, 'M-20 -50l10 6 4 10M14 -56l-6 12', 0.8);
      s += A.S(ice ? '#b0a080' : '#5f8a4a', 1.4, 'M40 -50l-2-18M43 -50l1-16M46 -52l4-14') + A.P('#7a4b2a', A.rrect(37, -72, 3, 7, 1.4) + A.rrect(43.4, -70, 3, 6, 1.4));
      return s;
    },
  });
  gartDefine('decor:wishing-well', {
    box: [128, 92], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#a9a29a'), wood = lc2(o, '#8a5a3a');
      // a round stone well, a little shingled roof on two posts, a winch and a bucket
      let stones = '', stonesL = '';
      for (let row = 0; row < 4; row++) for (let i = 0; i < 6; i++) { const x = -30 + i * 10 + (row % 2) * 5, y = -8 - row * 7; if (x > 28) continue; stones += A.rrect(x, y - 6, 9.4, 6.4, 2); stonesL += A.rect(x + 1, y - 5.4, 4, 1); }
      let s = A.shadow(40, 8) + A.P(A.dk(c, 0.25), A.rect(-32, -36, 64, 36)) + A.P(c, stones) + A.P('#ffffff', stonesL, 0.3) + A.P(A.dk(c, 0.15), A.ell(0, -36, 33, 7)) + A.P('#1a2430', A.ell(0, -36, 27, 5));
      s += A.P(wood, A.rect(-30, -84, 4.4, 50) + A.rect(25.6, -84, 4.4, 50)) + A.P(A.dk(wood, 0.2), A.rect(-30, -62, 60, 3));
      s += A.P('#7a4a3a', 'M-42 -78L0 -98L42 -78L38 -74L0 -92L-38 -74z') + A.P('#a85a42', 'M-38 -80L0 -96L0 -92L-36 -76z', 0.8) + A.S('#5a3428', 0.8, 'M-30 -82L0 -96M-20 -86l20-10M-10 -90l10-5', 0.5);
      s += A.S('#c8b48a', 0.8, 'M0 -61V-44') + A.P('#8a6a4a', A.rrect(-5, -46, 10, 8, 1.4)) + A.P('#6a4a2e', A.rect(-5, -46, 10, 1.6)) + A.S('#4a3a2a', 2, 'M30 -61h6v6');
      if (o.season === 'winter') s += A.P(PAL.snow, 'M-40 -80L0 -99L40 -80L36 -79L0 -96L-36 -79z') + snowLine(-33, 33, -38, 3);
      else s += A.P('#6a9a4a', A.ell(-26, -10, 6, 3) + A.ell(24, -24, 4, 2.4), 0.8);
      return s;
    },
  });

  /* ================= lights ================= */
  gartDefine('decor:fire-pit', {
    box: [128, 46], fit: 'none',
    draw(o, r) {
      const c = lc(o, '#5a5f64'), flame = lc2(o, '#ff8a3a'), on = lit(o) || o.season === 'winter' || o.season === 'autumn';
      // a ring of stones round a bowl, logs inside, a fire at dusk and night (and on any cold evening)
      let ring = '', ringB = '', ringL = '';
      for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2, x = Math.cos(t) * 34, y = -14 + Math.sin(t) * 10; (Math.sin(t) < 0 ? (ringB += A.ell(x, y, 8, 5.4)) : (ring += A.ell(x, y, 8, 5.4))); ringL += A.ell(x - 2, y - 1.6, 3, 1.4); }
      let s = A.shadow(44, 8) + A.P(A.dk(c, 0.1), ringB) + A.P(A.dk(c, 0.2), A.ell(0, -14, 30, 9)) + A.P('#2a2420', A.ell(0, -15, 24, 6.4)) + A.P('#7a5236', 'M-16 -12l28 -8 2 4 -28 8zM-14 -20l26 6 -1 4 -26 -6z') + A.P('#a87c4f', 'M-16 -12l28 -8 0.6 1.4 -28 8z', 0.7);
      if (on) s += glow(o, r, 0, -24, 40, flame) + `<g class="gda-flicker" style="${A.T(r, 0, 1.5)}">${A.P(flame, 'M-12 -16Q-14 -32 -4 -44Q-6 -32 2 -28Q4 -40 12 -36Q14 -24 8 -16z') + A.P('#ffd36a', 'M-6 -16Q-6 -26 0 -32Q2 -24 6 -16z') + A.P('#fff4c8', 'M-2 -16q0-6 2-9q2 5 1 9z')}</g>`;
      s += A.P(c, ring) + A.P(A.lt(c, 0.3), ringL, 0.6);
      return s;
    },
  });
  gartDefine('decor:toadstool-lamps', {
    box: [64, 30], fit: 'none',
    draw(o, r) {
      const cap = lc(o, '#e04a3a'), warm = lc2(o, '#fff1c8'), on = lit(o);
      let s = A.shadow(22, 3);
      [[-14, 12, 7], [6, 18, 9], [18, 9, 5.4]].forEach(([x, h, R]) => {
        s += glow(o, r, x, -h, R * 2.4, '#ffd88a') + A.P(on ? warm : '#f4efe4', `M${x - R * 0.3} 0Q${x - R * 0.4} ${-h * 0.6} ${x - R * 0.25} ${-h}H${x + R * 0.25}Q${x + R * 0.4} ${-h * 0.6} ${x + R * 0.3} 0z`);
        s += A.P(cap, `M${x - R} ${-h}Q${x - R} ${-h - R * 1.2} ${x} ${-h - R * 1.2}Q${x + R} ${-h - R * 1.2} ${x + R} ${-h}z`) + A.P('#ffffff', A.circ(x - R * 0.4, -h - R * 0.6, R * 0.16) + A.circ(x + R * 0.3, -h - R * 0.85, R * 0.13) + A.circ(x + R * 0.55, -h - R * 0.35, R * 0.11), 0.95);
        if (on) s += A.P('#fff8d8', A.ell(x, -h, R * 0.8, R * 0.2), 0.9);
      });
      return s + (o.season === 'winter' ? A.P(PAL.snow, A.ell(6, -18 - 10.4, 6, 1.6)) : '');
    },
  });
})();
