/* ============================================================
   GARDEN ART, the things you carry (2.18, agent 'garden-art'): crops (what
   you harvest from each plant), seed packets, tools and bouquets. PURE.
   Drawn in art units inside the engine's icon cell (x -32..32, y -60..6,
   the anchor at the bottom centre). Crops are the plant's own produce, not a
   generic dot: a bunch of the flower tied with twine (its own head: a cup, a
   trumpet, a rose...), herbs in a sprig, every vegetable and fruit drawn as
   itself. A seed packet is a paper packet with the plant's own picture in the
   window, a band in the rarity's colour and a few seeds spilling out.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const colOf = (o, c) => o.col || A.tone3(c);
  const twine = (x, y) => A.S('#c8a46a', 1.6, `M${f1(x - 4)} ${f1(y)}h8`) + A.S('#c8a46a', 1, `M${f1(x + 1)} ${f1(y)}q3 3 1 6M${f1(x + 1)} ${f1(y)}q5 1 6 5`);
  /** Strip classes and styles: an icon is still. */
  const still = s => s.replace(/ class="[^"]*"/g, '').replace(/ style="[^"]*"/g, '');

  /* ---------- small flower heads for bunches and bouquets (each form its own head) ---------- */
  function head(form, x, y, R, col, c2, r) {
    const C = col, d2 = c2 || '#f4c430';
    switch (form) {
      case 'cup': case 'cup-small': case 'goblet': return gartCupHead(A, x, y + R, R * 1.4, R * 1.7, C, 0.4);
      case 'trumpet': { let p = ''; for (let k = 0; k < 6; k++) p += A.leaf(x, y, k / 6 * Math.PI * 2, R, R * 0.3, 0.5); return A.P(C[1], p) + A.P(A.tone3(d2)[1], A.circ(x, y, R * 0.42)) + A.P(A.tone3(d2)[0], A.circ(x, y, R * 0.24)); }
      case 'rose': case 'rose-bush': case 'peony': return gartRoseHead(A, x, y, R, C, 1);
      case 'sunflower': return gartDaisyHead(A, x, y, { n: 16, L: R, W: R * 0.18, rc: R * 0.5, tilt: 0.95, back: C[0], front: C[1], disc: d2, discDark: A.dk(d2, 0.3), shape: 'pointed' });
      case 'spike': case 'spike-bell': case 'spike-cup': case 'orchid-spike': { let b = ''; for (let k = 0; k < 6; k++) b += A.ell(x + (k % 2 ? 0.8 : -0.8), y + k * R * 0.32 - R, R * 0.32, R * 0.26); return A.P(C[1], b) + A.P(C[2], A.ell(x - 0.6, y - R, R * 0.2, R * 0.16), 0.8); }
      case 'bell': case 'bell-arch': case 'bell-cluster': return A.P(C[1], `M${f1(x - R * 0.6)} ${f1(y + R * 0.6)}Q${f1(x - R * 0.6)} ${f1(y - R * 0.6)} ${f1(x)} ${f1(y - R * 0.7)}Q${f1(x + R * 0.6)} ${f1(y - R * 0.6)} ${f1(x + R * 0.6)} ${f1(y + R * 0.6)}l-${f1(R * 0.3)} -${f1(R * 0.3)}-${f1(R * 0.3)} ${f1(R * 0.3)}-${f1(R * 0.3)} -${f1(R * 0.3)}z`) + A.P(C[0], A.ell(x, y + R * 0.4, R * 0.3, R * 0.15), 0.7);
      case 'pompom': case 'dahlia': case 'mophead': case 'clover': case 'cluster': case 'daisy-cloud': { let p = ''; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p += A.circ(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62, R * 0.42); } return A.P(C[0], p) + A.P(C[1], A.circ(x, y, R * 0.66)) + A.P(C[2], A.circ(x - R * 0.2, y - R * 0.2, R * 0.3), 0.8); }
      case 'poppy': return A.P(C[1], A.petal(x, y, -0.9, R, R * 0.6) + A.petal(x, y, 0.9, R, R * 0.6) + A.petal(x, y, Math.PI - 0.6, R * 0.9, R * 0.6) + A.petal(x, y, Math.PI + 0.6, R * 0.9, R * 0.6)) + A.P(d2, A.circ(x, y, R * 0.3));
      case 'iris': return A.P(C[0], A.petal(x, y, 2.2, R, R * 0.4) + A.petal(x, y, -2.2, R, R * 0.4)) + A.P(C[2], A.petal(x, y, 0, R, R * 0.36)) + A.P(d2, A.leaf(x, y, 2.2, R * 0.5, R * 0.08) + A.leaf(x, y, -2.2, R * 0.5, R * 0.08));
      case 'lily': case 'moon-trumpet': case 'hibiscus': case 'passion': case 'lotus': case 'lily-pad': { let p = ''; for (let k = 0; k < (form === 'hibiscus' ? 5 : 6); k++) p += A.leaf(x, y, k / 6 * Math.PI * 2 + 0.3, R * 1.1, R * 0.26, 0.45); return A.P(C[1], p) + A.P(A.tone3(d2)[1], A.circ(x, y, R * 0.24)); }
      case 'pansy': return A.P(C[0], A.circ(x - R * 0.35, y - R * 0.4, R * 0.5) + A.circ(x + R * 0.35, y - R * 0.4, R * 0.5)) + A.P(A.tone3(d2)[1], A.ell(x, y + R * 0.2, R * 0.7, R * 0.55)) + A.P('#2a1a3a', A.ell(x, y, R * 0.3, R * 0.25), 0.8);
      case 'umbel': { let p = ''; for (let k = 0; k < 9; k++) p += A.circ(x + (k % 3 - 1) * R * 0.5, y + (Math.floor(k / 3) - 1) * R * 0.3, R * 0.22); return A.P(C[1], p); }
      case 'thistle': return A.P('#7a9a6a', A.ell(x, y + R * 0.4, R * 0.5, R * 0.5)) + A.S(C[1], R * 0.18, `M${f1(x)} ${f1(y)}l-${f1(R * 0.5)} -${f1(R * 0.8)}M${f1(x)} ${f1(y)}v-${f1(R)}M${f1(x)} ${f1(y)}l${f1(R * 0.5)} -${f1(R * 0.8)}`);
      case 'bird-paradise': return A.P('#5a6a4a', A.leaf(x - R, y, 1.6, R * 2, R * 0.3)) + A.P(C[1], A.leaf(x, y - 1, -0.3, R * 1.2, R * 0.2) + A.leaf(x, y - 1, 0.3, R * 1.1, R * 0.2)) + A.P(A.tone3(d2)[1], A.leaf(x, y, 0.9, R, R * 0.16));
      case 'orchid': return A.P(C[1], A.ell(x - R * 0.5, y, R * 0.55, R * 0.5) + A.ell(x + R * 0.5, y, R * 0.55, R * 0.5) + A.leaf(x, y, 0, R, R * 0.25)) + A.P(A.tone3(d2)[1], A.ell(x, y + R * 0.35, R * 0.3, R * 0.28));
      case 'star': case 'star-small': return A.P(C[1], A.star(x, y, 8, R, R * 0.5)) + A.P(C[0], A.circ(x, y, R * 0.3));
      case 'flat': return A.P(C[1], A.star(x, y, 5, R, R * 0.7)) + A.P(d2, A.circ(x, y, R * 0.3));
      default: return gartDaisyHead(A, x, y, { n: 12, L: R, W: R * 0.18, rc: R * 0.32, tilt: 0.9, back: C[0], front: C[1], disc: d2, discDark: A.dk(d2, 0.25) });
    }
  }
  /** A bunch of three to five stems of one flower, tied with twine. */
  function bunch(o, r, n) {
    const col = colOf(o, '#e0566e'), c2 = o.look.c2, leaf = (o.look && o.look.leaf) || '#4f8a3a', form = o.look.form || 'daisy';
    n = n || 3;
    let stems = '', heads = '', leaves = '';
    for (let i = 0; i < n; i++) {
      const a = (i / Math.max(1, n - 1) - 0.5) * 0.7, [tx, ty] = A.at(0, -6, a, 40 - Math.abs(i - (n - 1) / 2) * 4);
      stems += `M0 -4L${f1(tx)} ${f1(ty)}`;
      if (i % 2 === 0) leaves += A.leaf(tx * 0.4, -18, a + (i ? 0.8 : -0.8), 9, 2.4);
      heads += head(form, tx, ty, form === 'sunflower' ? 9 : 7, col, c2, r);
    }
    return A.S(A.dk(leaf, 0.1), 1.6, stems) + A.P(leaf, leaves) + heads + twine(0, -12);
  }
  /** A sprig of herb leaves tied together. */
  function sprig(o, r) {
    const leaf = (o.look && o.look.v && o.look.v[o.variant]) || (o.look && o.look.leaf) || '#4f8a3a', L = A.leaf4(leaf), form = o.look.form;
    let st = '', lv = '', lvL = '';
    for (let i = 0; i < 4; i++) {
      const a = (i / 3 - 0.5) * 0.6, s2 = A.stem(0, -4, a, 38 - Math.abs(i - 1.5) * 5, (i - 1.5) * 1.6);
      st += s2.d;
      for (let k = 0; k < 5; k++) {
        const t = 0.3 + k * 0.16, p = s2.pt(t), g = s2.ang(t);
        if (form === 'needle-bush' || form === 'grass-flower') { const [e1x, e1y] = A.at(p[0], p[1], g - 0.7, 5), [e2x, e2y] = A.at(p[0], p[1], g + 0.7, 5); lv += `M${f1(p[0])} ${f1(p[1])}L${f1(e1x)} ${f1(e1y)}M${f1(p[0])} ${f1(p[1])}L${f1(e2x)} ${f1(e2y)}`; }
        else if (form === 'frilly' || form === 'mat') lv += A.blob(r, ...A.at(p[0], p[1], g + (k % 2 ? 0.9 : -0.9), 2.4), 2.6, 2.2, 6, 0.6);
        else { lv += A.leaf(p[0], p[1], g - 1, 6, 2.4) + A.leaf(p[0], p[1], g + 1, 6, 2.4); lvL += A.halfLeaf(p[0], p[1], g - 1, 6, 2.4, -1); }
      }
    }
    const needles = form === 'needle-bush' || form === 'grass-flower';
    let s = A.S(A.dk(L[0], 0.1), 1.2, st) + (needles ? A.S(L[1], 1.4, lv) : A.P(L[1], lv) + A.P(L[3], lvL, 0.6));
    if (form === 'grass-flower' || form === 'leafy-soft' || form === 'daisy-small') s += A.P(colOf(o, '#b77fd1')[1], A.circ(-4, -40, 2.6) + A.circ(4, -38, 2.4));
    return s + twine(0, -10);
  }

  /* ---------- produce: every vegetable and fruit drawn as itself ---------- */
  const shine = (x, y, rx, ry) => A.P('#ffffff', A.ell(x, y, rx, ry), 0.45);
  const PRODUCE = {
    radish: (o, C) => A.P('#5a9a4a', A.leaf(-2, -26, -0.6, 14, 4) + A.leaf(2, -26, 0.5, 14, 4)) + A.P(C[1], A.circ(0, -16, 9)) + A.P('#fbf6f0', 'M-5 -9q5 4 10 0q-2 6-5 9q-3-3-5-9z') + shine(-3, -19, 2.4, 3),
    beetroot: (o, C) => A.P('#3a6a3a', A.leaf(-2, -28, -0.5, 14, 4) + A.leaf(2, -28, 0.4, 15, 4)) + A.S('#b02a4a', 1.4, 'M-1 -24l-2-6M1 -24l3-6') + A.P(C[1], A.circ(0, -16, 10)) + A.S(C[1], 1.2, 'M0 -6q1 4 0 8') + shine(-4, -20, 2.4, 3),
    carrot: (o, C) => A.S('#4fa64a', 1.2, 'M0 -44l-4 -10M0 -44l0 -12M0 -44l4 -10') + A.P(C[1], 'M-5 -44q-1 20 5 42q6-22 5-42z') + A.S(C[0], 0.7, 'M-4 -36h3M2 -28h3M-3 -20h3', 0.7) + A.S(C[2], 1, 'M-3 -42q0 10 1 18', 0.6),
    parsnip: (o, C) => A.S('#6fa64a', 1.4, 'M0 -44l-4-10M0 -44l0-12M0 -44l4-10') + A.P(C[1], 'M-7 -44q-1 18 7 42q8-24 7-42z') + A.S(C[0], 0.7, 'M-5 -34h4M2 -24h4', 0.7),
    lettuce: (o, C) => A.P(C[0], A.blob(A.rng(1), 0, -16, 18, 13, 11, 0.4)) + A.P(C[1], A.blob(A.rng(2), -1, -18, 13, 10, 9, 0.4)) + A.P(C[2], A.blob(A.rng(3), -3, -21, 7, 5, 7, 0.4), 0.8),
    cabbage: (o, C) => A.P(C[0], A.leaf(0, -4, -1.3, 20, 7) + A.leaf(0, -4, 1.3, 20, 7)) + A.P(C[1], A.circ(0, -18, 13)) + A.S(C[2], 1, 'M-10 -14Q0 -32 10 -14M-6 -10Q2 -28 8 -26', 0.7) + shine(-5, -24, 4, 3),
    kale: (o, C) => A.P(C[1], A.blob(A.rng(4), -6, -26, 9, 18, 14, 0.7) + A.blob(A.rng(5), 6, -24, 9, 17, 14, 0.7)) + A.S(C[2], 1, 'M-6 -6L-6 -40M6 -6L6 -38', 0.7),
    potato: (o, C) => A.P(C[1], A.ell(-7, -10, 10, 7.4) + A.ell(8, -9, 8, 6) + A.ell(1, -18, 8, 5.6)) + A.P(C[0], A.circ(-9, -10, 0.8) + A.circ(-3, -7, 0.7) + A.circ(10, -10, 0.7) + A.circ(2, -19, 0.6), 0.8) + shine(-10, -13, 3, 2),
    tomato: (o, C) => A.S('#3f7a3a', 1.6, 'M-12 -30q12-8 24 0') + A.P(C[1], A.circ(-8, -16, 8.4) + A.circ(8, -14, 9)) + A.P('#3f7a3a', A.star(-8, -24, 5, 3.4, 1.2) + A.star(8, -23, 5, 3.6, 1.2)) + shine(-11, -19, 2.4, 2) + shine(5, -18, 2.6, 2),
    pea: (o, C) => A.P(C[1], 'M-20 -14q20-14 40-6q-20 10-40 6z') + A.P(C[2], A.circ(-10, -14, 2.6) + A.circ(-3, -15, 2.8) + A.circ(4, -14, 2.8) + A.circ(11, -12, 2.4)) + A.S(C[0], 0.8, 'M-20 -14q20-14 40-6') + A.S('#5a9a4a', 1, 'M-20 -14l-4-2'),
    'runner-bean': (o) => { const g = o.col2 || A.tone3('#5d9e3c'); return A.P(g[1], 'M-22 -8q20-20 44-10l0 3q-24-8-44 10z' + 'M-18 -20q18-16 40-8l0 3q-22-6-40 8z') + A.S(g[0], 0.6, 'M-14 -10l2 1M-4 -16l2 1M8 -18l2 1', 0.7); },
    courgette: (o, C) => A.P(C[1], 'M-22 -10q4-10 36-10q8 2 8 6q-4 6-36 8q-8 0-8-4z') + A.S(C[2], 1, 'M-14 -14q16-4 28-4', 0.6) + A.P('#a8c06a', A.ell(22, -15, 2, 3)) + A.P('#f7c331', 'M-22 -10l-6-4q2 6 6 6z'),
    pumpkin: (o, C) => A.P(C[0], A.ell(-9, -16, 10, 13) + A.ell(9, -16, 10, 13)) + A.P(C[1], A.ell(0, -16, 10, 14)) + A.P(C[2], A.ell(-11, -19, 3, 6) + A.ell(-1, -20, 2.4, 7), 0.6) + A.S('#5a6a2a', 3, 'M0 -30q1-6 5-7'),
    'lantern-pumpkin': (o, C) => A.P(C[0], A.ell(-9, -16, 10, 13) + A.ell(9, -16, 10, 13)) + A.P(C[1], A.ell(0, -16, 10, 14)) + A.P(o.col2 ? o.col2[1] : '#ffd34d', 'M-9 -20l3-4 3 4zM3 -20l3-4 3 4zM-8 -10q8 6 16 0l-3 1-2-1-2 1-2-1-2 1-2-1z') + A.S('#5a6a2a', 3, 'M0 -30q1-6 5-7'),
    squash: (o, C) => A.P(C[1], 'M-3 -40q-4 0-4 6v10q-8 3-8 11q0 10 13 10q13 0 13-10q0-8-8-11v-10q0-6-4-6z') + A.S(C[2], 2, 'M-3 -36v10q-7 3-7 9', 0.6) + A.P('#6a4a2a', A.rect(-1.4, -44, 2.8, 5)),
    onion: (o, C) => A.P(C[1], 'M0 -40q-3 8-12 16q-6 10 2 18q10 6 20 0q8-8 2-18q-9-8-12-16z') + A.S(C[0], 0.8, 'M0 -38q-8 14-6 32M0 -38q8 14 6 32', 0.6) + shine(-6, -18, 2, 5) + A.S('#c8b48a', 1, 'M-2 -6l-2 4M0 -6v4M2 -6l2 4'),
    garlic: (o, C) => A.P(C[1], 'M0 -38q-2 8-10 14q-8 10 0 18q10 6 20 0q8-8 0-18q-8-6-10-14z') + A.S(A.dk(C[1], 0.25), 0.9, 'M0 -34q-6 12-4 28M0 -34q6 12 4 28M0 -34v28', 0.7) + A.S('#c8b48a', 1, 'M-2 -6l-2 4M2 -6l2 4'),
    leek: (o, C) => A.P(C[1], A.rect(-4, -26, 8, 24)) + A.P('#5f8f7a', 'M-4 -26l-8-22 6 2 3 20zM4 -26l8-22-6 2-3 20zM-2 -26l1-26 2 0 1 26z') + A.S('#c8b48a', 1, 'M-3 -2l-2 4M0 -2v4M3 -2l2 4'),
    sweetcorn: (o, C) => A.P('#6fae4a', 'M-12 -4q2-28 12-40q-4 16-4 40zM12 -4q-2-28-12-40q4 16 4 40z') + A.P(C[1], A.ell(0, -22, 6, 17)) + A.S(C[0], 0.6, 'M-4 -32h8M-5 -26h10M-5 -20h10M-5 -14h10M-4 -8h8M0 -38v32', 0.6) + A.S(o.col2 ? o.col2[1] : '#c9a26a', 0.9, 'M0 -40q-3-6-2-10M0 -40q2-6 4-8'),
    chilli: (o, C) => A.P(C[1], 'M-4 -38q-8 14 0 34q2-18 6-30z' + 'M6 -36q-2 16 10 30q-4-18-4-28z') + A.P('#4f7a3a', A.ell(-1, -38, 3, 1.6) + A.ell(8, -37, 3, 1.6)) + A.S('#4f7a3a', 1.4, 'M-1 -38l1-6M8 -37l-1-6') + shine(-3, -26, 1, 4),
    aubergine: (o, C) => A.P(C[1], 'M-2 -34q-14 8-10 24q4 10 14 6q8-6 6-18q-2-10-10-12z') + A.P('#4f7a3a', A.star(0, -33, 5, 6, 2)) + A.S('#4f7a3a', 1.6, 'M0 -36l1-6') + shine(-6, -20, 1.6, 5),
    broccoli: (o, C) => A.P('#8aae7a', 'M-4 -2l2-18h4l2 18z') + A.P(C[0], A.circ(-8, -24, 7) + A.circ(8, -24, 7) + A.circ(0, -30, 8)) + A.P(C[1], A.circ(-7, -26, 4.6) + A.circ(7, -26, 4.6) + A.circ(0, -32, 5.4)) + A.P(C[2], A.circ(-2, -34, 2), 0.7),
    strawberry: (o, C) => A.P(C[1], 'M-14 -26q0-4 7-4q7 0 7 4q0 9-7 16q-7-7-7-16zM2 -22q0-4 7-4q7 0 7 4q0 9-7 16q-7-7-7-16z') + A.P('#f6e8a0', A.circ(-9, -22, 0.7) + A.circ(-5, -20, 0.7) + A.circ(-7, -16, 0.7) + A.circ(7, -18, 0.7) + A.circ(11, -16, 0.7) + A.circ(9, -12, 0.7)) + A.P('#4f8f3a', A.star(-7, -30, 6, 4, 1.4) + A.star(9, -26, 6, 4, 1.4)),
    raspberry: (o, C) => { let b = ''; for (let i = 0; i < 12; i++) b += A.circ(-4 + (i % 3) * 3.6 + (Math.floor(i / 3) % 2) * 1.8, -30 + Math.floor(i / 3) * 4, 2.2); return A.P(C[1], b) + A.P(C[2], b.replace(/a2\.2 2\.2/g, 'a0.8 0.8'), 0.6) + A.P('#5a8f4a', A.star(0, -33, 5, 4, 1.4)); },
    blueberry: (o, C) => { let b = ''; [[-8, -10], [2, -10], [-3, -18], [8, -16], [-10, -20], [4, -24]].forEach(([x, y]) => { b += A.circ(x, y, 5); }); return A.P(C[1], b) + A.P('#c8d8f4', b.replace(/a5 5/g, 'a2 2'), 0.5) + A.P(C[0], [[-8, -10], [2, -10], [-3, -18]].map(([x, y]) => A.star(x + 1.6, y - 2, 5, 1.2, 0.5)).join('')); },
    blackcurrant: (o, C) => { let b = ''; for (let i = 0; i < 8; i++) b += A.circ(-10 + i * 3, -34 + i * 3.6 + Math.sin(i) * 2, 3.2); return A.S('#5a6a3a', 1, 'M-12 -38q8 6 12 28') + A.P(C[1], b) + A.P('#ffffff', b.replace(/a3\.2 3\.2/g, 'a0.9 0.9'), 0.5); },
    gooseberry: (o, C) => A.P(C[1], A.ell(-6, -14, 7, 8) + A.ell(7, -18, 6.4, 7.4)) + A.S(C[2], 0.8, 'M-6 -21v14M-9 -20q-1 6 0 12M-3 -20q1 6 0 12M7 -24v12M4 -23q-1 5 0 10M10 -23q1 5 0 10', 0.7) + A.S('#6a5a3a', 1, 'M-6 -22l-1-4M7 -25l1-4'),
    rhubarb: (o, C) => A.P(C[1], 'M-10 -4l4-36h4l-2 36zM-2 -4l3-38h4l-3 38zM6 -4l5-34h4l-4 34z') + A.P(C[2], 'M-9 -6l3.4-32h1l-3 32z', 0.6) + A.P('#5c8f3a', A.blob(A.rng(6), 0, -46, 14, 6, 9, 0.5)),
    bramble: (o, C) => { let b = ''; for (let i = 0; i < 9; i++) b += A.circ(-3 + (i % 3) * 3, -26 + Math.floor(i / 3) * 3.4, 2); return A.P(C[1], b) + A.P('#5a4a7a', b.replace(/a2 2/g, 'a0.7 0.7'), 0.7) + A.P('#5a8f4a', A.star(0, -29, 5, 3.6, 1.2)) + A.P(A.tone3(o.look.c2 || '#f7f0f4')[1], A.star(12, -16, 5, 4, 2.4)); },
    grapevine: (o, C) => { let b = ''; const rows = [4, 3, 3, 2, 1]; rows.forEach((n, j) => { for (let i = 0; i < n; i++) b += A.circ((i - (n - 1) / 2) * 5, -34 + j * 5, 2.8); }); return A.S('#6a4a2a', 1.4, 'M0 -38q2-6 6-6') + A.P('#5a8f3a', A.leaf(4, -40, 1.2, 10, 4)) + A.P(C[1], b) + A.P(C[2], b.replace(/a2\.8 2\.8/g, 'a1 1'), 0.6); },
    melon: (o, C) => A.P(o.col2 ? o.col2[1] : '#9fc35a', A.circ(0, -18, 16)) + A.S(C[2], 0.8, 'M-14 -12q14 4 28 0M-14 -24q14 4 28 0M-6 -32q-2 14 0 28M6 -32q2 14 0 28', 0.7) + A.P('#ffffff', A.ell(-6, -26, 4, 3), 0.4) + A.S('#6a7a2a', 1.6, 'M0 -34q1-4 4-4'),
    apple: (o, C) => A.P(C[1], 'M0 -30q-8-4 -12 2q-4 10 2 18q4 6 10 2q6 4 10-2q6-8 2-18q-4-6-12-2z') + A.S('#5a3a1a', 1.6, 'M0 -30q0-6 2-8') + A.P('#5a9a3a', A.leaf(2, -36, 1.2, 9, 3)) + shine(-6, -22, 2.4, 4),
    pear: (o, C) => A.P(C[1], 'M0 -38q-5 0-5 8q0 4-4 10q-4 10 9 14q13-4 9-14q-4-6-4-10q0-8-5-8z') + A.S('#5a3a1a', 1.4, 'M0 -38l1-5') + A.P('#5a9a3a', A.leaf(1, -42, 1.1, 8, 2.6)) + shine(-5, -18, 2, 4),
    cherry: (o, C) => A.S('#5a4a2a', 1.2, 'M-6 -14Q-2 -34 4 -42M8 -12Q6 -32 4 -42') + A.P(C[1], A.circ(-7, -11, 6) + A.circ(9, -10, 6)) + shine(-9, -13, 1.6, 1.6) + shine(7, -12, 1.6, 1.6) + A.P('#5a9a3a', A.leaf(4, -42, 1.3, 10, 3)),
    plum: (o, C) => A.P(C[1], A.ell(-6, -14, 8, 9.4) + A.ell(8, -16, 7.4, 8.6)) + A.S(C[0], 0.8, 'M-6 -23q-2 8 0 18M8 -24q-2 8 0 16', 0.6) + A.P('#d8c8e8', A.ell(-9, -17, 2, 3) + A.ell(5, -19, 1.8, 2.6), 0.4),
    fig: (o, C) => A.P(C[1], 'M-6 -36q-2 6-8 12q-6 12 6 20q8 2 12-6q4-10-4-20q-4-4-4-8z' + 'M10 -30q0 6 4 12q4 10-6 14q-6 0-6-8q0-8 6-12z') + A.P('#f4b0a0', A.ell(-4, -12, 3, 2), 0.7) + A.S('#5a6a2a', 1.4, 'M-6 -36l1-4M10 -30l1-4'),
    lemon: (o, C) => A.P(C[1], A.ell(-4, -16, 11, 8)) + A.P(C[1], 'M-16 -16l-3 0 3-2zM8 -16l3 0-3 2z') + A.P(C[1], A.ell(8, -28, 7, 5)) + shine(-8, -19, 3, 2) + A.P('#4f8a3a', A.leaf(10, -34, 0.8, 10, 3)),
    olive: (o, C) => A.S('#6a6a4a', 1.2, 'M-16 -30q16-6 30 4') + A.P('#8a9a7a', A.leaf(-8, -32, -0.6, 12, 2.4) + A.leaf(4, -30, 0.8, 12, 2.4) + A.leaf(-2, -32, 0.1, 10, 2)) + A.P(C[1], A.ell(-10, -22, 3, 4) + A.ell(2, -20, 3, 4) + A.ell(10, -22, 3, 4)) + shine(-11, -24, 0.8, 1.2) + shine(1, -22, 0.8, 1.2),
    holly: (o, C) => { const L = '#1f5b34'; let lv = ''; for (const a of [-1.1, 0, 1.1]) lv += A.leaf(0, -16, a, 18, 5); return A.P(L, lv) + A.S('#3f7a4a', 0.7, 'M0 -16l-14-8M0 -16v-17M0 -16l14-8', 0.6) + A.P(C[1], A.circ(-3, -16, 3.2) + A.circ(3, -15, 3.2) + A.circ(0, -20, 3.2)) + shine(-4, -17, 1, 1); },
    hazel: (o, C) => A.P('#8ab04a', A.star(-7, -18, 7, 8, 4) + A.star(8, -14, 7, 7, 3.4)) + A.P(C[1], A.ell(-7, -14, 5, 6) + A.ell(8, -10, 4.6, 5.4)) + A.P(C[2], A.ell(-9, -17, 1.6, 2) + A.ell(6, -12, 1.4, 1.8), 0.7),
    'prickly-pear': (o) => { const C = o.col2 || A.tone3('#c2185b'); return A.P(C[1], A.ell(-6, -16, 7, 10) + A.ell(8, -14, 6, 9)) + A.P('#f6e8c0', A.circ(-8, -20, 0.6) + A.circ(-4, -14, 0.6) + A.circ(6, -18, 0.6) + A.circ(10, -12, 0.6)) + A.P('#6a9f5a', A.ell(-6, -26, 3, 1.6) + A.ell(8, -23, 3, 1.6)); },
    banana: (o, C) => { let b = ''; for (let i = 0; i < 4; i++) b += `M${-10 + i * 4} -40q-8 18 8 34q-4-16 2-34z`; return A.P(C[1], b) + A.S(C[0], 0.8, b, 0.5) + A.P('#6a5a3a', A.rect(-6, -44, 10, 5)); },
    'passion-flower': (o) => A.P('#5a3a5a', A.circ(-6, -16, 10)) + A.P('#8a5a8a', A.circ(-9, -19, 3), 0.6) + A.P('#f2d070', 'M8 -10a9 9 0 0 1 16 0z') + A.P('#f6e8a0', A.circ(16, -11, 6)) + A.P('#5a3a2a', A.circ(14, -12, 0.8) + A.circ(17, -10, 0.8) + A.circ(18, -13, 0.8)),
    honey: () => A.P('#f2b01e', A.rrect(-14, -36, 28, 34, 6)) + A.P('#a87c4f', A.rrect(-15, -42, 30, 8, 2)) + A.P('#c98a12', 'M-14 -36q4 6 8 0q4 6 8 0q4 6 8 0q3 4 4 0v6h-28z') + A.P('#ffffff', A.ell(-6, -20, 3, 6), 0.35) + A.P('#f4efe2', A.rrect(-8, -26, 16, 10, 2)) + A.P('#f2b01e', 'M0 -21l-3-2v-2l3-2 3 2v2z'),
  };
  const PRODUCE_CAT = { veg: 'potato', fruit: 'blueberry', tree: 'apple' };

  /* ---------- crops ---------- */
  gartDefine('crop:_any', {
    box: [56, 56], fit: 'none',
    draw(o, r) {
      const id = o.id, cat = o.cat ? o.cat.cat : '', form = o.look && o.look.form;
      const C = colOf(o, '#e0566e');
      let s = '';
      if (PRODUCE[id]) s = PRODUCE[id](o, C, r);
      else if (cat === 'herb' || id === 'water-mint') s = sprig(o, r);
      else if (['flower', 'wild', 'water', 'exotic'].includes(cat)) s = bunch(o, r, form === 'sunflower' ? 3 : form === 'spike' || form === 'spike-bell' ? 4 : 3 + (o.variant % 2));
      else if (form && /tree/.test(form) && PRODUCE.apple) s = PRODUCE.apple(o, C, r);
      else s = (PRODUCE[PRODUCE_CAT[cat]] || PRODUCE.potato)(o, C, r);
      return A.shadow(18, 3) + still(s);
    },
  });
  // items that are not plants: the engine asks for them as crops or tools
  gartDefine('crop:honey', { box: [56, 56], fit: 'none', draw: () => A.shadow(16, 3) + PRODUCE.honey() });

  /* ---------- seed packets: the plant's own picture in the window, the rarity's colour on the band ---------- */
  gartDefine('seed', {
    box: [48, 64], fit: 'none',
    draw(o, r) {
      const def = o.cat || {}, rar = (typeof GARDEN_RARITY !== 'undefined' && GARDEN_RARITY[def.rarity]) || { col: '#7c8b6f' };
      const main = (def.look && ((def.look.v && def.look.v[0]) || def.look.c || def.look.leaf)) || '#8ab84a';
      // the paper packet with a folded top and a soft shadow; the window tinted with the plant's colour
      let s = A.shadow(20, 3) + A.P('#d8ccb0', 'M-19 -1L-20 -56H20L19 -1z') + A.P('#f4efe2', 'M-18 -2L-19 -55H19L18 -2z') + A.P(rar.col, 'M-19 -55H19L19 -48H-19z') + A.P(A.dk(rar.col, 0.2), 'M-19 -48H19v1.4H-19z', 0.6);
      s += A.P('#ffffff', A.rect(-14, -45, 28, 31)) + A.P(A.mix(main, '#ffffff', 0.78), A.rect(-14, -45, 28, 31)) + A.P(A.mix(main, '#ffffff', 0.6), 'M-14 -20q14-4 28 0v6h-28z', 0.7);
      // the picture: this plant in flower or fruit, in its season, drawn small and still
      const season = (def.seasons && def.seasons[0]) || 'summer';
      let pic = '';
      try { pic = typeof gardenArt === 'function' && o.id ? gardenArt(o.id, { kind: 'plant', stage: 4, season, variant: 0, size: 's', t: 0.5, tod: 'day' }) : ''; } catch (e) { pic = ''; }
      if (pic) {
        // fit the plant's own drawn size (its box after the catalogue's height) into the window; tall ones may peep over the top
        const pd = _gartFind('plant', o.id, def), kf = pd ? _gartFit(pd, { kind: 'plant', cat: def, look: def.look || {} }) : 1;
        const dw = pd ? pd.box[0] * kf : 64, dh = pd ? pd.box[1] * kf : 64, k = Math.min(33 / dh, 27 / dw);
        pic = `<g transform="translate(0 -16) scale(${Math.round(k * 1000) / 1000})">${still(pic)}</g>`;
      }
      s += pic + A.S('#a89a80', 1.2, 'M-13 -9H13') + A.S('#c8bca4', 0.8, 'M-13 -5.6H6', 0.8);
      // a few seeds spilling from the corner
      s += A.P('#7a5a34', A.leaf(20, -6, 1.8, 3.4, 1.2) + A.leaf(23, -3, 1.2, 3, 1.1) + A.leaf(18, -1.6, 2.4, 3, 1.1), 0.9);
      return s;
    },
  });

  /* ---------- tools ---------- */
  function can(col, k, spout) {
    const C = A.tone3(col);
    return A.shadow(22, 3) + A.P(C[0], 'M-18 -4V-30H10V-4z') + A.P(C[1], 'M-17 -4V-30H8V-4z') + A.P(C[2], 'M-14 -6V-28h4V-6z', 0.6) + A.P(C[0], A.rect(-18, -24, 28, 2.4)) + A.S(C[0], 3, 'M8 -22L26 -40') + A.P(C[1], `M23 -44l${spout ? 9 : 7} 0l-1 ${spout ? 9 : 7}z`) + A.S(C[0], 2.6, 'M-18 -30Q-4 -48 10 -30') + (k ? A.P('#ffffff', A.star(-9, -38, 4, 3, 0.9), 0.9) : '');
  }
  gartDefine('tool:can', { box: [56, 56], fit: 'none', draw: () => can('#7a9a8a', 0) });
  gartDefine('tool:can-2', { box: [56, 56], fit: 'none', draw: () => can('#3f8f5a', 0, 1) + A.P('#2f6a44', A.rect(-17, -16, 25, 2.4)) });
  gartDefine('tool:can-3', { box: [56, 56], fit: 'none', draw: () => can('#c8743a', 1, 1) + A.S('#e8a46a', 0.8, 'M-16 -12h24M-16 -18h24', 0.6) });
  gartDefine('tool:can-4', { box: [56, 56], fit: 'none', draw: (o, r) => can('#e0b43a', 1, 1) + A.P('#fff4c0', A.star(14, -10, 4, 3.4, 1) + A.star(-24, -16, 4, 2.4, 0.8)) + A.S('#a87c1a', 0.8, 'M-16 -12h24', 0.6) });
  gartDefine('tool:hose', {
    box: [56, 56], fit: 'none',
    draw() {
      return A.shadow(22, 3) + A.P('#5a6a5a', A.rrect(-6, -46, 12, 42, 2)) + A.S('#2f6a44', 4.4, 'M0 -26a14 9 0 1 1 -0.1 0') + A.S('#4fa66a', 4.4, 'M0 -18a10 6.4 0 1 1 -0.1 0') + A.S('#6ac08a', 1.2, 'M-10 -30q6-6 14-4', 0.6) + A.S('#3f8f5a', 4.4, 'M12 -16Q24 -8 22 -2') + A.P('#e8c33a', A.rrect(18, -4, 8, 6, 1.4)) + A.S('#a8d4ec', 0.9, 'M27 -2l6-4M27 0h7M27 2l6 3', 0.8);
    },
  });
  gartDefine('tool:golden-shears', {
    box: [56, 56], fit: 'none',
    draw() {
      return A.shadow(16, 3) + A.P('#c98a12', 'M-2 -24L-22 -50l5 -2L2 -27z') + A.P('#f2d070', 'M2 -24L22 -50l-5 -2L-2 -27z') + A.P('#ffe8a0', 'M-20 -49l3-1 14 18z', 0.7) + A.S('#a86a1a', 3.6, A.ell(-8, -14, 6, 5.4)) + A.S('#a86a1a', 3.6, A.ell(8, -14, 6, 5.4)) + A.P('#5a3a1a', A.circ(0, -25, 2)) + A.P('#fff4c0', A.star(18, -38, 4, 3.4, 1));
    },
  });
  gartDefine('tool:fertiliser', {
    box: [56, 56], fit: 'none',
    draw() {
      return A.shadow(18, 3) + A.P('#8a6a4a', 'M-16 -2L-18 -40H18L16 -2z') + A.P('#a87c4f', 'M-15 -3L-17 -39H17L15 -3z') + A.P('#7a5a3a', 'M-18 -40L-12 -46L-6 -42L0 -46L6 -42L12 -46L18 -40z') + A.P('#f4efe2', A.rrect(-10, -30, 20, 18, 2)) + A.P('#4fa64a', A.leaf(0, -16, -0.5, 10, 3.4) + A.leaf(0, -16, 0.6, 9, 3)) + A.S('#3f7a3a', 1, 'M0 -14v-4') + A.P('#5a3a20', A.circ(-6, -1, 1) + A.circ(12, -1.4, 0.8), 0.7);
    },
  });
  gartDefine('tool:honey', { box: [56, 56], fit: 'none', draw: () => A.shadow(16, 3) + PRODUCE.honey() });
  gartDefine('tool:clover', {
    box: [56, 56], fit: 'none',
    draw() {
      // the lucky four-leaf clover, pressed like a keepsake
      let lv = '';
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; lv += `M0 -26C${f1(Math.sin(a - 0.5) * 16)} ${f1(-26 - Math.cos(a - 0.5) * 16)} ${f1(Math.sin(a + 0.5) * 16)} ${f1(-26 - Math.cos(a + 0.5) * 16)} 0 -26z`; }
      return A.shadow(14, 3) + A.S('#3f8f4a', 2, 'M0 -26q2 12-4 22') + A.P('#3f9a54', lv) + A.S('#a8e0b0', 0.8, 'M0 -26l-6-6M0 -26l6-6M0 -26l-6 6M0 -26l6 6', 0.7) + A.P('#fff4c0', A.star(14, -40, 4, 3, 0.9));
    },
  });

  /* ---------- bouquets: nine styles, each its own arrangement ---------- */
  function arrangement(r, list, n, spread, cx, cy) {
    // list: [[form, colour, c2]...]; heads fan out from (cx, cy) up and out
    let stems = '', heads = '', leaves = '';
    for (let i = 0; i < n; i++) {
      const [form, col, c2] = list[i % list.length], a = (i / Math.max(1, n - 1) - 0.5) * spread + rr(r, -0.06, 0.06), len = 30 + rr(r, -3, 5) - Math.abs(a) * 6, [tx, ty] = A.at(cx, cy, a, len);
      stems += `M${f1(cx)} ${f1(cy)}L${f1(tx)} ${f1(ty)}`;
      if (i % 2) leaves += A.leaf(...A.at(cx, cy, a, len * 0.6), a + (a > 0 ? 0.9 : -0.9), 8, 2.4);
      heads += head(form, tx, ty, form === 'sunflower' ? 8 : 6, A.tone3(col), c2, r);
    }
    return { stems, heads, leaves };
  }
  const wrap = (c1, c2) => A.P(c1, 'M-18 -40L0 -4L18 -40Q0 -32 -18 -40z') + A.P(c2, 'M-18 -40L0 -4L-4 -4L-20 -36z', 0.7) + A.P(A.lt(c1, 0.3), 'M-6 -36L0 -10L6 -36z', 0.5);
  const ribbon = (c) => A.P(c, 'M-6 -16l-8-6 2 9zM6 -16l8-6-2 9z') + A.P(c, A.rect(-6, -18, 12, 4)) + A.P(A.dk(c, 0.2), A.circ(0, -16, 2.2));
  const BQ = {
    'rose-bouquet': r => { const a = arrangement(r, [['rose', '#d2283c'], ['rose', '#f29bb6'], ['rose', '#fbf5ee']], 7, 1.6, 0, -24); return wrap('#f4efe2', '#d8ccb0') + A.S('#3f7a3e', 1.4, a.stems) + A.P('#3f7a3e', a.leaves) + a.heads + ribbon('#c83a5a'); },
    'sunflower-bunch': r => { const a = arrangement(r, [['sunflower', '#f6b40e', '#6b3e1e'], ['sunflower', '#f3d34a', '#6b3e1e'], ['sunflower', '#d9671c', '#4a2a16']], 3, 1, 0, -14); return A.S('#4e8f3a', 2.4, a.stems) + A.P('#4e8f3a', a.leaves + A.leaf(-2, -22, -1, 12, 4) + A.leaf(2, -24, 1, 12, 4)) + a.heads + twine(0, -10); },
    'wildflower-posy': r => { const a = arrangement(r, [['cup-small', '#f7d417'], ['star-small', '#e05a8a'], ['daisy', '#fbfbf2', '#f4c430'], ['bell-arch', '#8aa0e8'], ['umbel', '#fbfbf2']], 7, 1.5, 0, -22); return A.S('#5f8a4a', 1, a.stems) + a.heads + A.P('#e8f2f8', A.rrect(-11, -24, 22, 22, 4), 0.75) + A.P('#a8d4ec', A.rect(-10, -14, 20, 11), 0.6) + A.S('#ffffff', 1, 'M-8 -20v14', 0.6) + A.S('#c8a46a', 1.4, 'M-11 -22h22'); },
    'winter-wreath': r => {
      let lv = '', berries = '';
      for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, x = Math.cos(a) * 18, y = -28 + Math.sin(a) * 18; lv += A.leaf(x, y, a + 1.6, 9, 3); if (i % 3 === 0) berries += A.circ(x + 2, y, 2) + A.circ(x - 1, y + 2, 2); }
      return A.S('#5a3a20', 5, A.ell(0, -28, 18, 18)) + A.P('#1f5b34', lv) + A.P('#2f7a44', lv.split('z').filter((d, i) => i % 2).join('z') + 'z', 0.8) + A.P('#d0202b', berries) + A.P('#7a5a3a', A.ell(12, -40, 3, 4) + A.ell(-14, -16, 3, 4)) + ribbon('#d0202b').replace(/-16/g, '-10').replace(/-18/g, '-12') + A.P('#f5f0f7', A.star(-16, -38, 6, 2.6, 1));
    },
    'pond-posy': r => { const a = arrangement(r, [['lily-pad', '#f7c5d8', '#f6c445'], ['iris', '#f5d02c', '#7a4a2a'], ['spike', '#6c7fd8']], 5, 1.2, 0, -20); return A.S('#4f8f5a', 1.2, a.stems + 'M-4 -20l-6-24M4 -20l8-22') + A.P('#7a4b2a', A.rrect(-11, -46, 3, 7, 1.4) + A.rrect(10, -44, 3, 6, 1.4)) + a.heads + A.P('#5f8faa', 'M-12 -22h24l-3 20h-18z') + A.P('#7cb6dc', 'M-10 -20h20l-0.6 4h-18.8z', 0.8) + A.P('#ffffff', A.ell(-6, -12, 1.6, 4), 0.4); },
    'rainbow-bouquet': r => { const a = arrangement(r, [['cup', '#e0393e'], ['pompom', '#f39c12'], ['daisy', '#f6c445', '#c0561a'], ['rose', '#4fa64a'], ['star', '#4a6fe3'], ['cup', '#8e5bc8']], 6, 1.6, 0, -24); return wrap('#fbf6ee', '#e8dccc') + A.S('#4f8a3a', 1.4, a.stems) + a.heads + ribbon('#8e5bc8'); },
    'grand-bouquet': r => { const a = arrangement(r, [['peony', '#f4a6c0'], ['rose', '#d2283c'], ['lily', '#fbe0e6', '#e85d75'], ['mophead', '#7aa2e8'], ['daisy', '#fbfbf6', '#f4c430'], ['spike', '#9b7fd1']], 9, 1.9, 0, -22); return wrap('#3a5a4a', '#2a4a3a') + A.S('#3f7a3e', 1.4, a.stems) + A.P('#3f7a3e', a.leaves) + a.heads + ribbon('#f2c21e'); },
    'hand-tied': r => { const a = arrangement(r, [['daisy', '#f29ac4', '#f4c430'], ['cup', '#f6c445'], ['star', '#9b7fd1'], ['pompom', '#fbf6f8']], 5, 1.3, 0, -14); return A.S('#4f8a3a', 1.6, a.stems + 'M0 -14L-2 -2M0 -14L2 -2M0 -14v12') + A.P('#4f8a3a', a.leaves) + a.heads + twine(0, -14); },
    'posy': r => { const a = arrangement(r, [['flat', '#f8e58c', '#f39c12'], ['cluster', '#7fb3f0'], ['daisy', '#fbfbf6', '#f4c430']], 3, 1.1, 0, -10); return A.S('#4f8a3a', 1.4, a.stems + 'M0 -10l-1 8M0 -10l1 8') + a.heads + A.P('#f4efe2', 'M-6 -12l6 6 6-6-6 4z', 0.9) + twine(0, -8); },
  };
  for (const id of Object.keys(BQ)) gartDefine('bouquet:' + id, { box: [56, 60], fit: 'none', draw: (o, r) => A.shadow(16, 3) + BQ[id](r) });
})();
