/* ============================================================
   GARDEN ART, decorations III (2.23, agent 'garden-art'): the ones that were all thin lines (lights on strings, posts with things on, vanes, signs),
   redrawn chunky from kit parts. Each is a short list of parts, the same format a catalogue row's look.parts uses (94-garden-art-i-kit.js),
   so any of these parts can be used by a new row with no drawing of its own. Parts first: they are general (a string of anything, a little house, a sign).
   Drawn in art units, anchor at the front of the footprint. PURE.
   ============================================================ */
(function () {
  const A = GART;
  const { f1 } = A;
  const winter = o => o.season === 'winter';
  const snowOn = (o, x, y, w, k) => (winter(o) ? gartSnowCap(A, x, y, w, k || 1) : '');
  const litNow = o => o.night || o.dusk;

  /* ---------- parts ---------- */
  /** A string between two points, sagging, hung with beads: 'bulb' 'paper' 'flag' 'holly'. x0, y0, x1, y1, sag, n, bead; c the cord, c2 the beads, cols several. */
  gartPart('string', (p, T, T2, An, o, r) => {
    const x0 = p.x0 == null ? -52 : p.x0, x1 = p.x1 == null ? 52 : p.x1, y0 = p.y0 == null ? -60 : p.y0, y1 = p.y1 == null ? y0 : p.y1, sag = p.sag == null ? 12 : p.sag, n = p.n || 6, bead = p.bead || 'bulb', cols = Array.isArray(p.cols) && p.cols.length ? p.cols : [T2[1]];
    const pt = t => { const u = 1 - t, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + sag * 2; return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1]; };
    const cord = `M${f1(x0)} ${f1(y0)}Q${f1((x0 + x1) / 2)} ${f1((y0 + y1) / 2 + sag * 2)} ${f1(x1)} ${f1(y1)}`;
    const by = cols.map(() => ''), lites = cols.map(() => '');
    let halo = '', hang = '', caps = '';
    for (let i = 0; i < n; i++) {
      const [x, y] = pt((i + 0.5) / n), k = i % cols.length;
      if (bead === 'flag') by[k] += `M${f1(x - 4.6)} ${f1(y - 0.4)}H${f1(x + 4.6)}L${f1(x)} ${f1(y + 9.6)}z`;
      else if (bead === 'paper') { hang += `M${f1(x)} ${f1(y)}v2.4`; by[k] += An.ell(x, y + 7.4, 5.8, 5.4); lites[k] += An.ell(x - 1.8, y + 5.8, 1.7, 2.2); caps += An.rrect(x - 2.6, y + 1.6, 5.2, 1.6, 0.6) + An.rrect(x - 2.6, y + 11.6, 5.2, 1.6, 0.6); if (litNow(o)) halo += An.circ(x, y + 7.4, 10); }
      else if (bead === 'holly') { by[k] += An.leaf(x, y, -1.2, 7, 2.6, 0.5) + An.leaf(x, y, 1.2, 7, 2.6, 0.5); caps += An.circ(x, y + 1.4, 2); if (litNow(o)) halo += An.circ(x, y + 1, 7); }
      else { hang += `M${f1(x)} ${f1(y)}v1.6`; by[k] += An.ell(x, y + 4.6, 3, 3.6); lites[k] += An.ell(x - 0.9, y + 3.6, 0.9, 1.3); if (litNow(o)) halo += An.circ(x, y + 4.6, 8); }
    }
    let s = An.S(T[0], 1.7, cord) + (hang ? An.S(T[0], 1.3, hang) : '');
    if (halo) s += `<g class="gda-glow" style="${An.T(r, 0, 3)}">${An.P(cols[0], halo, o.night ? 0.3 : 0.18)}</g>`;
    cols.forEach((c, k) => { s += An.P(c, by[k]) + An.P(An.lt(c, 0.6), lites[k], 0.9); });
    if (caps) s += An.P(bead === 'holly' ? '#d8302a' : T[0], caps);
    return s;
  });
  /** A sign: a board at (x, y) (its middle), w wide, h tall; point -1 / 1 makes it an arrow. */
  gartPart('board', (p, T, T2, An, o) => {
    const w = p.w || 30, h = p.h || 12, x = p.x || 0, y = p.y || -30, pt = p.point || 0, hw = w / 2, hh = h / 2;
    const d = pt ? (pt > 0 ? `M${f1(x - hw)} ${f1(y - hh)}H${f1(x + hw - 5)}L${f1(x + hw + 2)} ${f1(y)}L${f1(x + hw - 5)} ${f1(y + hh)}H${f1(x - hw)}z` : `M${f1(x + hw)} ${f1(y - hh)}H${f1(x - hw + 5)}L${f1(x - hw - 2)} ${f1(y)}L${f1(x - hw + 5)} ${f1(y + hh)}H${f1(x + hw)}z`) : An.rrect(x - hw, y - hh, w, h, 2.6);
    return An.P(T[1], d) + An.P(T[2], An.rrect(x - hw + 2, y - hh + 1.4, w - 6, Math.max(1.6, h * 0.22), 0.8), 0.8) + An.P(T[0], An.rect(x - hw + 2, y + hh - 2.2, w - 5, 1.2), 0.45) + snowOn(o, x, y - hh, w * 0.9, 0.7);
  });
  /** A little house on top of something: x, y (its floor), w, h, n holes, a roof in c2, a perch. */
  gartPart('birdhouse', (p, T, T2, An, o) => {
    const w = p.w || 18, h = p.h || 16, x = p.x || 0, y = p.y || -40, n = p.n || 1, hw = w / 2;
    let holes = '', perch = '';
    for (let i = 0; i < n; i++) { const hx = x + (n === 1 ? 0 : (i - (n - 1) / 2) * w * 0.32), hy = y - h * 0.56, R = Math.min(w * (n > 1 ? 0.11 : 0.17), 3.6); holes += An.circ(hx, hy, R); perch += An.rrect(hx - 1.8, hy + R + 0.8, 3.6, 1.5, 0.7); }
    return An.P(T[1], An.rrect(x - hw, y - h, w, h, 1.6)) + An.P(T[2], An.rrect(x - hw + 1.4, y - h + 1, w * 0.24, h - 2, 1), 0.72) + An.P(T[0], An.rect(x + hw * 0.42, y - h + 1, hw * 0.46, h - 2), 0.4) + An.P('#2a1f1c', holes) + An.P(T[0], perch)
      + An.P(T2[1], `M${f1(x - hw - 3.4)} ${f1(y - h + 1)}L${f1(x)} ${f1(y - h - w * 0.6)}L${f1(x + hw + 3.4)} ${f1(y - h + 1)}Q${f1(x)} ${f1(y - h + 3)} ${f1(x - hw - 3.4)} ${f1(y - h + 1)}z`) + An.P(T2[2], `M${f1(x - hw - 1)} ${f1(y - h + 0.4)}L${f1(x - 1)} ${f1(y - h - w * 0.5)}L${f1(x - hw * 0.2)} ${f1(y - h + 0.6)}z`, 0.7) + snowOn(o, x, y - h - w * 0.5, w * 0.8, 0.9);
  });
  /** Four paddles round a hub; give it clip: 'spin'. */
  gartPart('sails', (p, T, T2, An) => {
    const R = p.r || 16, x = p.x || 0, y = p.y || -48;
    let a0 = '', a1 = '';
    [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((a, i) => { const pad = An.petal(x, y, a + 0.3, R, R * 0.2); if (i % 2) a1 += pad; else a0 += pad; });
    return An.P(T[1], a0) + An.P(T2[1], a1) + An.P(T[0], An.circ(x, y, R * 0.16));
  });
  /** A wooden tripod with a vine going up it. */
  gartPart('obelisk', (p, T, T2, An, o, r) => {
    const h = p.h || 76, w = p.w || 15, L = gartSeasonLeaf(o, 'herb'), F = gartFoliage(L);
    const rings = [0.34, 0.62].map(t => An.ell(0, -h * t, w * (1 - t) * 1.04, w * (1 - t) * 0.28));
    let flowers = '';
    for (let i = 0; i < 10; i++) { const t = 0.1 + i * 0.085, side = i % 2 ? 1 : -1, x = side * w * (1 - t) * 0.72 + (r() - 0.5) * 3, y = -h * t; F.leaf(x, y, side * (0.8 + r() * 0.4), 8, 3.2); if (i % 3 === 1 && !winter(o)) flowers += gartScallop(x + side * 2, y - 2.6, 2.6, 5, 1.5); }
    return An.S(T[0], 3.4, `M${-w} 0L0 ${-h}M${w} 0L0 ${-h}M0 1L0 ${-h}`) + An.S(T[2], 1.3, `M${-w + 0.6} 0L0.4 ${-h}M0.5 1L0.5 ${-h}`, 0.8) + rings.map(d => An.S(T[0], 2.2, d)).join('') + F.out() + An.P(T2[1], flowers) + An.P(T[1], An.circ(0, -h - 2, 3)) + snowOn(o, 0, -h - 4, 8, 0.8);
  });
  /** A weather vane's top: an arrow and a shape on a post: shape 'cock' | 'fish' (x, y: the top of the post). */
  gartPart('vane', (p, T, T2, An, o) => {
    const x = p.x || 0, y = p.y || -72;
    const arrow = An.P(T[1], `M${f1(x - 20)} ${f1(y - 1.1)}H${f1(x + 15)}L${f1(x + 15)} ${f1(y - 3.8)}L${f1(x + 22)} ${f1(y)}L${f1(x + 15)} ${f1(y + 3.8)}V${f1(y + 1.1)}H${f1(x - 20)}z`) + An.P(T[1], `M${f1(x - 20)} ${f1(y - 3.8)}H${f1(x - 15)}L${f1(x - 13)} ${f1(y)}L${f1(x - 15)} ${f1(y + 3.8)}H${f1(x - 20)}L${f1(x - 18)} ${f1(y)}z`);
    const top = y - 2;
    let fig;
    if (p.shape === 'fish') fig = An.P(T2[0], `M${f1(x - 11)} ${f1(top - 8)}L${f1(x - 18)} ${f1(top - 13)}Q${f1(x - 16)} ${f1(top - 8)} ${f1(x - 18)} ${f1(top - 3)}z`) + An.P(T2[1], An.ell(x, top - 8, 12, 6.4)) + An.P(T2[2], An.ell(x - 1, top - 10, 7, 2.2), 0.8) + An.P('#fbf8ee', An.circ(x + 7, top - 9.4, 2.1)) + An.P('#1a1410', An.circ(x + 7.5, top - 9.4, 1.2));
    else fig = An.P(T2[0], `M${f1(x - 6)} ${f1(top - 6)}Q${f1(x - 17)} ${f1(top - 10)} ${f1(x - 15)} ${f1(top - 21)}Q${f1(x - 9)} ${f1(top - 18)} ${f1(x - 6)} ${f1(top - 12)}z`) + An.P(T2[1], An.ell(x - 1, top - 8, 9, 7.4)) + An.P(T2[1], An.circ(x + 6.6, top - 15, 4.8)) + An.P('#d8342a', `M${f1(x + 3)} ${f1(top - 19)}Q${f1(x + 5)} ${f1(top - 24)} ${f1(x + 7)} ${f1(top - 20)}Q${f1(x + 9)} ${f1(top - 23)} ${f1(x + 10)} ${f1(top - 18)}z`) + An.P('#f2a832', `M${f1(x + 11)} ${f1(top - 16.4)}L${f1(x + 15.4)} ${f1(top - 15)}L${f1(x + 11)} ${f1(top - 13.4)}z`) + An.P('#1a1410', An.circ(x + 8, top - 15.6, 1.2)) + An.P(T2[2], An.ell(x - 3, top - 10, 4, 2.4), 0.8);
    return arrow + fig + An.P(T[1], An.circ(x, y, 2.6));
  });
  /** A shepherd's hook: a post that curls over at the top. x, h; the end comes to x + 12. */
  gartPart('hook', (p, T, T2, An, o) => {
    const x = p.x || -8, h = p.h || 74, d = `M${x} 0V${-h + 8}Q${x} ${-h} ${x + 7} ${-h}Q${x + 13} ${-h} ${x + 13} ${-h + 6}`;
    return An.S(T[0], 4, d) + An.S(T[1], 2.6, d) + An.S(T[2], 1, `M${x - 0.6} -2V${-h + 10}`, 0.8) + An.P(T[1], An.ell(x, 0, 4, 1.6)) + snowOn(o, x + 6, -h - 1, 8, 0.6);
  });
  /** Chimes: tubes hanging from a disc. x, y (the top); give it clip: 'swing'. */
  gartPart('chimes', (p, T, T2, An) => {
    const x = p.x || 5, y = p.y || -64;
    let tubes = '', lit2 = '';
    [-6, -2, 2, 6].forEach((dx, i) => { const L = 20 + (i % 2 ? 5 : 0) + i; tubes += An.rrect(x + dx - 1.6, y + 4, 3.2, L, 1.4); lit2 += An.rect(x + dx - 1, y + 5, 0.9, L - 2); });
    return An.S(T[0], 1.3, `M${x} ${y - 5}V${y}`) + An.P(T2[1], An.ell(x, y + 1.6, 9.4, 3)) + An.P(T[1], tubes) + An.P(T[2], lit2, 0.8) + An.P(T2[1], An.circ(x, y + 26, 2.4));
  });
  /** A basket on a chain, full of flowers. x, y (the top); clip: 'swing'. */
  gartPart('basket', (p, T, T2, An, o, r) => {
    const x = p.x || 5, y = p.y || -66, L = gartSeasonLeaf(o, 'herb'), F = gartFoliage(L), w = 15;
    let fl = '', eye2 = '';
    if (!winter(o)) for (let i = 0; i < 6; i++) { const fx = x + (i - 2.5) * 5 + (r() - 0.5) * 2, fy = y + 13 + (i % 2 ? -3 : 1.4) + r(); fl += gartScallop(fx, fy, 3.4, 5, 1.5); eye2 += An.circ(fx, fy, 1.1); }
    F.add('back', gartScallop(x, y + 16, w * 0.92, 9, 1.2, 0.5));
    F.add('base', An.petal(x - w * 0.7, y + 20, 3.5, 13, 3) + An.petal(x + w * 0.7, y + 20, 2.8, 13, 3));
    return An.S(T[0], 1.4, `M${x} ${y}L${x - 11} ${y + 18}M${x} ${y}L${x + 11} ${y + 18}`) + F.out() + An.P('#b88a52', `M${x - w * 0.8} ${y + 18}Q${x} ${y + 36} ${x + w * 0.8} ${y + 18}z`) + An.S('#8a6238', 1.2, `M${x - w * 0.56} ${y + 22}Q${x} ${y + 27} ${x + w * 0.56} ${y + 22}M${x - w * 0.3} ${y + 27}Q${x} ${y + 30} ${x + w * 0.3} ${y + 27}`, 0.8) + An.P(T2[1], fl) + An.P('#f6d040', eye2);
  });
  /** A round-topped letterbox on its post, with a flag. y is its floor. */
  gartPart('mailbox', (p, T, T2, An, o) => {
    const y = p.y || -40, w = p.w || 24, x = p.x || 0, hw = w / 2, h = w * 0.62;
    return An.P(T[1], `M${f1(x - hw)} ${f1(y)}V${f1(y - h * 0.55)}Q${f1(x - hw)} ${f1(y - h)} ${f1(x - hw * 0.42)} ${f1(y - h)}H${f1(x + hw * 0.42)}Q${f1(x + hw)} ${f1(y - h)} ${f1(x + hw)} ${f1(y - h * 0.55)}V${f1(y)}z`) + An.P(T[2], An.rrect(x - hw + 2, y - h + 1.6, w * 0.6, h * 0.24, 1), 0.7) + An.P(T[0], An.rect(x + hw * 0.62, y - h * 0.82, hw * 0.3, h * 0.78), 0.4) + An.S(T2[0], 1.8, `M${f1(x + hw + 2)} ${f1(y - 1)}V${f1(y - h - 1)}`) + An.P('#f2c21e', `M${f1(x + hw + 2)} ${f1(y - h - 1.6)}h6.4v4.4h-6.4z`) + snowOn(o, x, y - h, w * 0.9, 0.8);
  });
  /** A glass ball with a window of light in it. */
  gartPart('ball', (p, T, T2, An) => {
    const R = p.r || 11, x = p.x || 0, y = p.y || -34;
    return An.P(T[1], An.circ(x, y - R, R)) + An.P(T[0], `M${f1(x + R * 0.1)} ${f1(y)}A${f1(R)} ${f1(R)} 0 0 0 ${f1(x + R)} ${f1(y - R)}Q${f1(x + R * 0.5)} ${f1(y - R * 0.3)} ${f1(x + R * 0.1)} ${f1(y)}z`, 0.55) + An.P(T[2], An.ell(x - R * 0.2, y - R * 1.2, R * 0.6, R * 0.5), 0.5) + An.P('#ffffff', An.ell(x - R * 0.36, y - R * 1.46, R * 0.28, R * 0.2), 0.95);
  });

  /* ---------- the decorations ---------- */
  /** An item as a short list of parts: [shadow half-width, parts], c and c2 from the catalogue row. */
  function asParts(id, box, fn) {
    gartDefine('decor:' + id, {
      box, fit: 'none',
      draw(o, r) {
        const look = o.look || {}, c0 = GART.HEX.test(String(look.c)) ? look.c : '#a87c4f', c20 = GART.HEX.test(String(look.c2)) ? look.c2 : A.lt(c0, 0.3);
        const [foot, parts, extra] = fn(o, r);
        return A.shadow(foot, foot * 0.2) + gartPartsDraw(parts, o, r, A, c0, c20) + (extra || '');
      },
    });
  }
  const WOOD = '#8a6238', twoPosts = (h, w) => [['post', { x: -(w || 52), h, c: WOOD }], ['post', { x: w || 52, h, c: WOOD }]];
  const GLOWS = [['#ffe08a'], ['#ffb86a', '#ffe08a', '#a8e0ff'], ['#ff7a7a', '#ffd36a', '#8ae08a', '#7ab4ff']];
  asParts('lantern', [30, 56], o => [9, [['stone', { w: 20 }], ['post', { h: 36, w: 5.4 }], ['lantern', { y: -36, r: 10.5 }]]]);
  asParts('string-lights', [120, 80], o => [54, [...twoPosts(64), ['string', { y0: -60, sag: 9, n: 10, bead: 'bulb', c: '#4a4a4a', cols: GLOWS[o.variant % 3] }]]]);
  asParts('solar-lights', [50, 30], () => [18, [['post', { x: -14, h: 15, w: 3.6 }], ['lantern', { x: -14, y: -15, r: 6 }], ['post', { x: 0, h: 21, w: 3.6 }], ['lantern', { x: 0, y: -21, r: 6 }], ['post', { x: 14, h: 13, w: 3.6 }], ['lantern', { x: 14, y: -13, r: 6 }]]]);
  asParts('paper-lanterns', [120, 88], o => [54, [...twoPosts(70), ['string', { y0: -66, sag: 8, n: 6, bead: 'paper', c: '#4a4a4a', cols: [o.look.c, '#ffd36a', '#f28a6a', o.look.c].slice(0, 2 + o.variant % 3) }]]]);
  asParts('windmill', [50, 80], o => { const look = o.look || {}; return [9, [['post', { h: 50, w: 5, c: WOOD }], ['block', { y: -44, w: 11, h: 9, c: look.c }], ['sails', { y: -52, r: 19, clip: 'spin' }]]]; });
  asParts('obelisk', [38, 92], () => [16, [['obelisk', { h: 80, w: 15, c: '#8a6238', c2: '#d87ac8' }]]]);
  asParts('weather-vane', [52, 102], () => [9, [['stone', { w: 18 }], ['post', { h: 72, w: 4.4 }], ['vane', { y: -72, shape: 'cock' }]]]);
  asParts('fish-weathervane', [52, 92], () => [9, [['stone', { w: 18 }], ['post', { h: 64, w: 4.4 }], ['vane', { y: -64, shape: 'fish' }]]]);
  asParts('dovecote', [40, 112], o => { const look = o.look || {}; return [10, [['post', { h: 62, w: 6.4, c: look.c2 }], ['birdhouse', { y: -62, w: 26, h: 28, n: 3, c: look.c, c2: look.c2 }], ['birdhouse', { y: -80, w: 15, h: 13, n: 1, c: look.c, c2: look.c2 }]]]; });
  asParts('bird-feeder', [40, 72], o => [10, [['post', { h: 44, w: 5.4 }], ['block', { y: -42, w: 34, h: 4.6, c: '#a87c4f' }], ['post', { x: -13, y: -44, h: 14, w: 2.6 }], ['post', { x: 13, y: -44, h: 14, w: 2.6 }], ['roof', { y: -56, w: 40, h: 14, c: o.look.c }]], A.P(o.look.c2, gartScallop(0, -47.6, 8, 7, 1.3, 0.34))]);
  asParts('bird-box', [32, 78], o => [9, [['post', { h: 46, w: 5.4 }], ['birdhouse', { y: -46, w: 21, h: 21 }]]]);
  asParts('wind-chimes', [36, 84], o => [8, [['hook', { h: 76, c: '#2f3438' }], ['chimes', { y: -66, c: o.look.c, c2: o.look.c2, clip: 'swing' }]]]);
  asParts('signpost', [56, 72], () => [8, [['post', { h: 56, w: 5.6 }], ['board', { y: -45, w: 34, h: 11, x: 3, point: 1, c: '#f4f1ea' }], ['board', { y: -30, w: 30, h: 11, x: -3, point: -1, c: '#f2e6c8' }]]]);
  asParts('welcome-sign', [50, 54], o => [18, [['post', { x: -13, h: 26, w: 4.6 }], ['post', { x: 13, h: 26, w: 4.6 }], ['board', { y: -28, w: 38, h: 22 }], ['bush', { x: -17, w: 10 }], ['bush', { x: 17, w: 10 }]], A.P(o.look.c2, 'M0 -21.4C-10 -28 -6 -36 0 -31.4C6 -36 10 -28 0 -21.4z') + A.P('#ffffff', A.ell(-3, -31, 1.3, 1), 0.8)]);
  asParts('letterbox', [40, 66], o => [9, [['post', { h: 40, w: 5.4, c: WOOD }], ['mailbox', { y: -38, w: 26, c: ['#d83a3a', '#3a8a5a', '#3a6fc4'][o.variant % 3], c2: '#2f3438' }], ['bush', { x: 11, w: 8 }]]]);
  asParts('hanging-basket', [40, 92], o => [8, [['hook', { h: 84, c: '#2f3438' }], ['basket', { y: -74, c: '#2f3438', c2: ['#f27aa8', '#f2c21e', '#a87ad8'][o.variant % 3], clip: 'swing' }]]]);
  asParts('festive-lights', [120, 80], o => [54, [...twoPosts(64), ['string', { y0: -60, sag: 9, n: 13, bead: 'holly', c: '#2f5f2e', cols: ['#2f7a3a'] }], ['string', { y0: -60, sag: 9, n: 7, bead: 'bulb', c: '#2f5f2e', cols: ['#ffd36a', '#ff7a7a'] }]]]);
  asParts('bunting', [120, 84], o => [54, [...twoPosts(66), ['string', { y0: -62, sag: 8, n: 10, bead: 'flag', c: '#6a5a4a', cols: [o.look.c, '#f2c21e', o.look.c2, '#f7f5ee'] }]]]);
  asParts('gazing-ball', [32, 50], o => [11, [['block', { y: -1, w: 22, h: 5, c: '#c7c2b8' }], ['block', { y: -6, w: 12, h: 18, c: '#d8d4ca' }], ['block', { y: -23, w: 18, h: 3.6, c: '#c7c2b8' }], ['ball', { y: -26, r: 11, c: ['#5aa0d8', '#c86ab0', '#e8b43a'][o.variant % 3] }]]]);
  gartDefine('decor:flamingo', {
    box: [36, 60], fit: 'none',
    draw(o) {
      const T = A.tone3(o.look.c), d = o.look.c2 || '#2f3438';
      return A.shadow(9, 2.4) + A.S('#d8688a', 2, 'M-1 -22V-1h3.4M4 -22L3 -13L5 -8L3 -1h3.4') + A.P(T[0], 'M-13 -28L-19 -35L-13 -33z') + A.P(T[1], A.ell(-3, -29, 12, 9)) + A.P(A.mix(T[0], T[1], 0.55), 'M-13 -31Q-6 -36 3 -32Q2 -24 -5 -22Q-11 -25 -13 -31z') + A.S(T[0], 6.6, 'M8 -30Q14 -38 7 -44Q2 -49 8 -54') + A.S(T[1], 4.8, 'M8 -30Q14 -38 7 -44Q2 -49 8 -54') + A.P(T[1], A.circ(9, -56, 5.4)) + A.P('#f7f5ee', `M13 -58Q19 -58 20 -54L14 -52.4Q12 -54 13 -58z`) + A.P(d, 'M17.6 -56Q20.6 -55 20.4 -52L17 -53z') + A.P('#1a1410', A.circ(9.6, -57, 1.5)) + A.P('#ffffff', A.circ(10.1, -57.5, 0.5));
    },
  });
})();
