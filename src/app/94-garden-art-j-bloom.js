/* ============================================================
   GARDEN ART, the bloom kit (2.23, agent 'garden-art'). The owner, 30 Oct 2026: "better SVGs", cosy and hand-illustrated, readable at game size.
   Every flower is now one row: a head from the library, a kind of leaf, how many, how tall. The builder does the rest: all five growth stages,
   the four seasons, the winter rest, seeded variety, sway, and one path per tone however many heads there are.

     gartBloom('form:poppy', { box: [52, 56], head: 'poppy', R: 10, n: [2, 3], tall: [30, 42], leaf: 'lobed', ln: 6, ll: 15, seed: 'seed' })

   spec: box [w, h] (the drawing's own units; look.h fits it to the cell), head (a name from GART_HEADS), R (its size), n (heads, by variant),
   tall [min, max] (stem height), spread (between the heads), lean (the fan of the stems), sw (stem width), leaf + ln, ll, lw (the leaves at the foot),
   fan (how wide they open), sl + slk, sll (leaves up the stem), mound [w, h] (a leafy dome behind everything), dome (heads sit on the mound),
   seed (gartSeed's kind), q (extra options for the head), pool (stands in water), snow (how high the snow lies).
   look.mix in a catalogue row gives each head its own colour. A plant whose catalogue seasons include winter keeps flowering in winter;
   the rest rest under snow. PURE: nothing drawn at load.

     gartHead(name, draw)   add a head: draw(H, x, y, R, q). H collects paths by tone (below), so 12 heads cost the same nodes as one.
                            H.u deep under-shape, H.b base, H.s shade wash, H.l light wash, H.w crease lines, H.k dark marks,
                            H.c centre, H.d centre shade, H.g glint, H.st stems, q.F the plant's foliage.
   ============================================================ */
const GART_HEADS = Object.create(null);
let gartBloomForm = null, gartPoolAt = null;   // (set below) the builder and the pond plants' water, for the other art files
function gartHead(name, draw) { if (name && typeof draw === 'function') GART_HEADS[name] = draw; }
/** A scalloped ring: n bumps round (x, y); k how far they stand out; tl squashes it. */
function gartScallop(x, y, r, n, k, tl) {
  const f1 = GART.f1, K = k || 1.28, Y = tl || 1;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2, px = x + Math.sin(a) * r, py = y - Math.cos(a) * r * Y;
    if (!i) { d = `M${f1(px)} ${f1(py)}`; continue; }
    const m = (i - 0.5) / n * Math.PI * 2;
    d += `Q${f1(x + Math.sin(m) * r * K)} ${f1(y - Math.cos(m) * r * K * Y)} ${f1(px)} ${f1(py)}`;
  }
  return d + 'z';
}
/** Which way a petal faces: above 0 it catches the light (upper left). */
function gartLitBy(a) { return 0.6 * Math.cos(a) - 0.8 * Math.sin(a); }
/** A leaf in a named shape, into a gartFoliage accumulator. */
const GART_LEAVES = Object.create(null);
function gartLeafKind(name, draw) { if (name && typeof draw === 'function') GART_LEAVES[name] = draw; }
(function () {
  const A = GART, TAU = Math.PI * 2;
  const { f1 } = A;
  const ringOf = (n, rot, fn) => { for (let i = 0; i < n; i++) fn(i / n * TAU + (rot || 0), i); };
  const disc = (H, x, y, rc, tl) => { const t = tl || 1; H.c += A.ell(x, y, rc, rc * t); H.d += A.ell(x + rc * 0.24, y + rc * 0.28 * t, rc * 0.68, rc * 0.6 * t); H.g += A.ell(x - rc * 0.34, y - rc * 0.38 * t, rc * 0.26, rc * 0.2); };

  /* ---------- faces, seen from the front ---------- */
  gartHead('daisy', (H, x, y, R, q) => {
    const n = q.n || 10, tl = q.tilt || 0.9, rc = R * (q.rc || 0.33), W = R * (q.W || 0.25);
    H.u += A.ell(x + 0.5, y + 0.6, R * 0.82, R * 0.82 * tl);
    ringOf(n, q.twist, a0 => {
      const ex = Math.sin(a0) * R, ey = -Math.cos(a0) * R * tl, a = Math.atan2(ex, -ey), L = Math.hypot(ex, ey), sx = x + Math.sin(a0) * rc * 0.6, sy = y - Math.cos(a0) * rc * 0.6 * tl;
      H.b += A.petal(sx, sy, a, L * 0.88, W);
      if (gartLitBy(a) > 0.2) H.l += A.petal(sx, sy, a, L * 0.68, W * 0.55);
    });
    disc(H, x, y, rc, tl);
  });
  gartHead('sunflower', (H, x, y, R) => {
    const n = 15, rc = R * 0.46;
    ringOf(n, 0, a => {
      const b = a + Math.PI / n, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      H.u += A.leaf(x + sb * rc * 0.8, y - cb * rc * 0.8, b, R * 0.74, R * 0.14, 0.45);
      H.b += A.leaf(x + sa * rc * 0.8, y - ca * rc * 0.8, a, R * 0.68, R * 0.15, 0.45);
      if (gartLitBy(a) > 0.1) H.l += A.leaf(x + sa * rc * 0.9, y - ca * rc * 0.9, a, R * 0.44, R * 0.07, 0.45);
    });
    H.c += A.circ(x, y, rc);
    H.d += A.circ(x + rc * 0.12, y + rc * 0.14, rc * 0.68);
    let dots = '';
    for (let i = 0; i < 7; i++) { const a = -0.3 - i * 0.42; dots += A.circ(x + Math.sin(a) * rc * 0.78, y - Math.cos(a) * rc * 0.78, R * 0.04); }
    H.g += dots + A.ell(x - rc * 0.26, y - rc * 0.3, rc * 0.2, rc * 0.14);
  });
  gartHead('trumpet', (H, x, y, R) => {
    ringOf(6, 0.26, a => {
      H.b += A.leaf(x, y, a, R, R * 0.36, 0.55);
      if (gartLitBy(a) > 0) H.l += A.halfLeaf(x, y, a, R * 0.94, R * 0.32, gartLit(a), 0.55);
      else H.s += A.halfLeaf(x, y, a, R * 0.94, R * 0.3, -gartLit(a), 0.55);
    });
    const c = R * 0.46;
    H.c += gartScallop(x, y, c * 0.9, 7, 1.26);
    H.d += A.circ(x + c * 0.08, y + c * 0.12, c * 0.54);
    H.g += A.ell(x - c * 0.42, y - c * 0.46, c * 0.24, c * 0.16);
  });
  gartHead('poppy', (H, x, y, R) => {
    H.u += gartScallop(x + 0.5, y + 0.7, R * 0.8, 5, 1.32);
    H.b += A.circ(x - R * 0.42, y - R * 0.36, R * 0.58) + A.circ(x + R * 0.44, y - R * 0.34, R * 0.56) + A.circ(x - R * 0.38, y + R * 0.4, R * 0.54) + A.circ(x + R * 0.4, y + R * 0.38, R * 0.54);
    H.l += A.ell(x - R * 0.5, y - R * 0.46, R * 0.32, R * 0.26) + A.ell(x + R * 0.3, y - R * 0.56, R * 0.2, R * 0.14);
    H.s += A.ell(x + R * 0.5, y + R * 0.48, R * 0.36, R * 0.3);
    H.c += A.circ(x, y, R * 0.3);
    let dots = '';
    ringOf(8, 0, a => { dots += A.circ(x + Math.sin(a) * R * 0.2, y - Math.cos(a) * R * 0.2, R * 0.04); });
    H.g += dots;
  });
  gartHead('star', (H, x, y, R) => {
    H.u += A.star(x + 0.4, y + 0.5, 8, R, R * 0.64, 0.2);
    H.b += A.star(x, y, 8, R * 0.9, R * 0.5, 0.2);
    H.l += A.star(x - R * 0.06, y - R * 0.08, 8, R * 0.6, R * 0.3, 0.2);
    H.c += A.circ(x, y, R * 0.24);
    H.g += A.circ(x - R * 0.08, y - R * 0.08, R * 0.08);
  });
  gartHead('pompom', (H, x, y, R) => {
    H.u += gartScallop(x + 0.4, y + 0.5, R * 0.86, 11, 1.2);
    H.b += gartScallop(x, y, R * 0.7, 9, 1.26);
    H.l += gartScallop(x - R * 0.08, y - R * 0.1, R * 0.42, 7, 1.3);
    H.c += A.circ(x, y, R * 0.13);
  });
  gartHead('dahlia', (H, x, y, R) => {
    ringOf(11, 0, a => { H.u += A.leaf(x, y, a, R, R * 0.2, 0.55); });
    ringOf(9, 0.3, a => { H.b += A.leaf(x, y, a, R * 0.74, R * 0.18, 0.55); });
    ringOf(6, 0.1, a => { H.l += A.leaf(x, y, a, R * 0.46, R * 0.13, 0.55); });
    H.c += A.circ(x, y, R * 0.1);
  });
  gartHead('rose', (H, x, y, R) => {
    H.u += gartScallop(x + 0.4, y + 0.5, R * 0.94, 6, 1.2);
    H.b += A.ell(x, y, R * 0.8, R * 0.74);
    H.l += A.ell(x - R * 0.28, y - R * 0.3, R * 0.4, R * 0.28);
    H.w += `M${f1(x - R * 0.56)} ${f1(y + R * 0.06)}Q${f1(x - R * 0.5)} ${f1(y - R * 0.56)} ${f1(x + R * 0.12)} ${f1(y - R * 0.48)}Q${f1(x + R * 0.56)} ${f1(y - R * 0.28)} ${f1(x + R * 0.28)} ${f1(y + R * 0.22)}Q${f1(x)} ${f1(y + R * 0.46)} ${f1(x - R * 0.24)} ${f1(y + R * 0.16)}Q${f1(x - R * 0.28)} ${f1(y - R * 0.16)} ${f1(x + R * 0.04)} ${f1(y - R * 0.16)}Q${f1(x + R * 0.22)} ${f1(y - R * 0.04)} ${f1(x + R * 0.06)} ${f1(y + R * 0.1)}`;
    H.vw = Math.max(0.8, R * 0.11);
  });
  gartHead('peony', (H, x, y, R) => {
    H.u += gartScallop(x + 0.4, y + 0.5, R * 0.88, 9, 1.2);
    H.b += gartScallop(x, y, R * 0.68, 8, 1.26);
    H.l += gartScallop(x - R * 0.1, y - R * 0.14, R * 0.38, 6, 1.32);
    H.s += gartScallop(x + R * 0.02, y + R * 0.04, R * 0.16, 5, 1.4);
  });
  gartHead('pansy', (H, x, y, R, q) => {
    H.u += A.circ(x - R * 0.42, y - R * 0.44, R * 0.56) + A.circ(x + R * 0.42, y - R * 0.44, R * 0.56);
    H.b += A.circ(x - R * 0.56, y + R * 0.14, R * 0.48) + A.circ(x + R * 0.56, y + R * 0.14, R * 0.48) + A.ell(x, y + R * 0.5, R * 0.56, R * 0.48);
    H.l += A.ell(x - R * 0.68, y + R * 0.02, R * 0.22, R * 0.18) + A.ell(x - R * 0.56, y - R * 0.66, R * 0.2, R * 0.14);
    H.k += A.ell(x, y + R * 0.1, R * 0.38, R * 0.32);
    H.c += A.circ(x, y + R * 0.02, R * 0.15);
  });
  gartHead('blossom', (H, x, y, R, q) => {
    const n = q.n || 5;
    ringOf(n, q.twist, a => { const px = x + Math.sin(a) * R * 0.56, py = y - Math.cos(a) * R * 0.56; H.b += A.circ(px, py, R * 0.46); if (gartLitBy(a) > 0.2) H.l += A.circ(px - R * 0.08, py - R * 0.1, R * 0.22); });
    H.u += A.circ(x + 0.4, y + 0.5, R * 0.78);
    H.c += A.circ(x, y, R * 0.26);
    H.g += A.circ(x - R * 0.08, y - R * 0.09, R * 0.08);
  });
  gartHead('campion', (H, x, y, R) => {
    ringOf(5, 0, a => {
      const p = A.petal(x, y, a, R * 0.92, R * 0.3);
      H.b += p;
      if (gartLitBy(a) > 0.2) H.l += A.petal(x, y, a, R * 0.62, R * 0.17);
      const [nx, ny] = A.at(x, y, a, R * 1.03), [mx, my] = A.at(x, y, a, R * 0.66);
      H.w += `M${f1(nx)} ${f1(ny)}L${f1(mx)} ${f1(my)}`;
    });
    H.vw = 0.9;
    H.c += A.circ(x, y, R * 0.2);
  });
  gartHead('iris', (H, x, y, R) => {
    H.u += A.petal(x, y - R * 0.1, -1.95, R * 0.95, R * 0.38) + A.petal(x, y - R * 0.1, 1.95, R * 0.95, R * 0.38) + A.petal(x, y, Math.PI, R * 0.72, R * 0.36);
    H.b += A.petal(x, y, -0.42, R * 1.02, R * 0.32) + A.petal(x, y, 0.42, R * 1.02, R * 0.32) + A.petal(x, y, 0, R * 1.12, R * 0.34);
    H.l += A.petal(x - R * 0.04, y - R * 0.1, -0.42, R * 0.7, R * 0.15) + A.petal(x, y - R * 0.2, 0, R * 0.74, R * 0.14);
    H.c += A.leaf(x - R * 0.12, y + R * 0.06, -1.95, R * 0.56, R * 0.11) + A.leaf(x + R * 0.12, y + R * 0.06, 1.95, R * 0.56, R * 0.11) + A.leaf(x, y + R * 0.1, Math.PI, R * 0.4, R * 0.11);
  });
  gartHead('lily', (H, x, y, R) => {
    ringOf(6, 0, a => {
      H.b += A.leaf(x, y, a, R, R * 0.3, 0.46);
      if (gartLitBy(a) > 0) H.l += A.halfLeaf(x, y, a, R * 0.9, R * 0.26, gartLit(a), 0.46);
      const [sx, sy] = A.at(x, y, a, R * 0.46);
      H.k += A.circ(sx, sy, R * 0.035) + A.circ(...A.at(x, y, a + 0.12, R * 0.34), R * 0.03);
    });
    H.c += A.circ(x, y, R * 0.2);
    ringOf(5, 0.5, a => { const [sx, sy] = A.at(x, y, a, R * 0.42); H.w += `M${f1(x)} ${f1(y)}L${f1(sx)} ${f1(sy)}`; H.g += A.circ(sx, sy, R * 0.055); });
    H.vw = 0.7;
  });
  gartHead('hibiscus', (H, x, y, R) => {
    H.u += gartScallop(x + 0.4, y + 0.5, R * 0.86, 5, 1.26);
    ringOf(5, 0.2, a => { const px = x + Math.sin(a) * R * 0.5, py = y - Math.cos(a) * R * 0.5; H.b += A.circ(px, py, R * 0.5); if (gartLitBy(a) > 0.1) H.l += A.ell(px - R * 0.1, py - R * 0.12, R * 0.24, R * 0.18); else H.s += A.ell(px + R * 0.1, py + R * 0.12, R * 0.28, R * 0.2); });
    H.k += A.star(x, y, 5, R * 0.3, R * 0.14, 0.2);
    H.c += A.leaf(x, y, 0.8, R * 0.92, R * 0.07, 0.5);
    H.g += A.circ(...A.at(x, y, 0.8, R * 0.9), R * 0.08) + A.circ(...A.at(x, y, 0.72, R * 0.68), R * 0.06) + A.circ(...A.at(x, y, 0.9, R * 0.7), R * 0.06);
  });
  gartHead('passion', (H, x, y, R) => {
    ringOf(10, 0, a => { H.b += A.petal(x, y, a, R * 0.9, R * 0.19); if (gartLitBy(a) > 0.2) H.l += A.petal(x, y, a, R * 0.66, R * 0.1); });
    ringOf(12, 0.1, a => { H.k += A.leaf(x, y, a, R * 0.56, R * 0.04); });
    H.c += A.circ(x, y, R * 0.2);
  });
  gartHead('orchid', (H, x, y, R) => {
    H.u += A.petal(x, y, 0, R, R * 0.28) + A.petal(x, y, -2.25, R * 0.92, R * 0.26) + A.petal(x, y, 2.25, R * 0.92, R * 0.26);
    H.b += A.petal(x, y, -1.15, R * 0.98, R * 0.42) + A.petal(x, y, 1.15, R * 0.98, R * 0.42);
    H.l += A.petal(x - R * 0.04, y - R * 0.05, -1.15, R * 0.62, R * 0.22);
    H.c += `M${f1(x - R * 0.26)} ${f1(y)}Q${f1(x)} ${f1(y - R * 0.3)} ${f1(x + R * 0.26)} ${f1(y)}Q${f1(x + R * 0.3)} ${f1(y + R * 0.46)} ${f1(x)} ${f1(y + R * 0.52)}Q${f1(x - R * 0.3)} ${f1(y + R * 0.46)} ${f1(x - R * 0.26)} ${f1(y)}z`;
    H.g += A.circ(x - R * 0.08, y + R * 0.04, R * 0.06);
  });

  /* ---------- from the side ---------- */
  gartHead('cup', (H, x, y, R, q) => {
    const w = R * (q.w || 0.86), h = R * (q.h || 1.82), o = q.open == null ? 0.18 : q.open, hw = w * (1 + o * 0.5);
    H.b += `M${f1(x - w * 0.92)} ${f1(y - h * 0.2)}C${f1(x - w * 1.12)} ${f1(y - h * 0.62)} ${f1(x - hw)} ${f1(y - h * 0.84)} ${f1(x - hw * 0.84)} ${f1(y - h * 1.02)}Q${f1(x - w * 0.44)} ${f1(y - h * 0.84)} ${f1(x)} ${f1(y - h * 1.08)}Q${f1(x + w * 0.44)} ${f1(y - h * 0.84)} ${f1(x + hw * 0.84)} ${f1(y - h * 1.02)}C${f1(x + hw)} ${f1(y - h * 0.84)} ${f1(x + w * 1.12)} ${f1(y - h * 0.62)} ${f1(x + w * 0.92)} ${f1(y - h * 0.2)}Q${f1(x + w * 0.6)} ${f1(y + h * 0.04)} ${f1(x)} ${f1(y + h * 0.04)}Q${f1(x - w * 0.6)} ${f1(y + h * 0.04)} ${f1(x - w * 0.92)} ${f1(y - h * 0.2)}z`;
    H.s += `M${f1(x + w * 0.2)} ${f1(y + h * 0.02)}Q${f1(x + w * 0.62)} ${f1(y - h * 0.46)} ${f1(x + hw * 0.84)} ${f1(y - h * 1.02)}C${f1(x + hw)} ${f1(y - h * 0.84)} ${f1(x + w * 1.12)} ${f1(y - h * 0.62)} ${f1(x + w * 0.92)} ${f1(y - h * 0.2)}Q${f1(x + w * 0.6)} ${f1(y + h * 0.04)} ${f1(x + w * 0.2)} ${f1(y + h * 0.02)}z`;
    H.l += `M${f1(x - w * 0.64)} ${f1(y - h * 0.22)}Q${f1(x - w * 0.78)} ${f1(y - h * 0.66)} ${f1(x - w * 0.5)} ${f1(y - h * 0.82)}Q${f1(x - w * 0.24)} ${f1(y - h * 0.5)} ${f1(x - w * 0.34)} ${f1(y - h * 0.16)}z`;
    H.w += `M${f1(x)} ${f1(y - h * 1.02)}Q${f1(x - w * 0.14)} ${f1(y - h * 0.62)} ${f1(x - w * 0.04)} ${f1(y - h * 0.26)}`;
    H.vw = Math.max(0.7, R * 0.08);
    if (q.stamen) H.c += A.ell(x, y - h * 0.8, R * 0.18, R * 0.36);
  });
  gartHead('lotus', (H, x, y, R) => {
    for (let i = 0; i < 5; i++) H.u += A.leaf(x, y, (i - 2) * 0.5, R * 1.16, R * 0.26, 0.5);
    for (let i = 0; i < 4; i++) { const a = (i - 1.5) * 0.46; H.b += A.leaf(x, y, a, R * 1.02, R * 0.26, 0.5); if (a < 0.2) H.l += A.halfLeaf(x, y, a, R * 0.9, R * 0.22, -1, 0.5); }
    H.c += A.ell(x, y - R * 0.5, R * 0.26, R * 0.18);
    for (let i = 0; i < 3; i++) H.b += A.leaf(x, y + R * 0.05, (i - 1) * 0.72, R * 0.68, R * 0.24, 0.5);
    H.l += A.halfLeaf(x, y + R * 0.05, -0.72, R * 0.6, R * 0.2, -1, 0.5);
  });
  /** A bell hanging from (x, y): the dome, a scalloped hem, lit from the left. */
  const bell = (H, x, y, R, c2) => {
    const w = R * 0.64, h = R * 1.3;
    H.b += `M${f1(x - w)} ${f1(y + h * 0.86)}Q${f1(x - w * 0.98)} ${f1(y + h * 0.02)} ${f1(x)} ${f1(y)}Q${f1(x + w * 0.98)} ${f1(y + h * 0.02)} ${f1(x + w)} ${f1(y + h * 0.86)}Q${f1(x + w * 0.66)} ${f1(y + h * 1.14)} ${f1(x + w * 0.34)} ${f1(y + h * 0.9)}Q${f1(x)} ${f1(y + h * 1.18)} ${f1(x - w * 0.34)} ${f1(y + h * 0.9)}Q${f1(x - w * 0.66)} ${f1(y + h * 1.14)} ${f1(x - w)} ${f1(y + h * 0.86)}z`;
    H.l += A.ell(x - w * 0.44, y + h * 0.4, w * 0.24, h * 0.3);
    H.s += A.ell(x + w * 0.56, y + h * 0.56, w * 0.26, h * 0.32);
    if (c2) H.c += A.ell(x, y + h * 0.86, w * 0.46, h * 0.12);
  };
  gartHead('bell', (H, x, y, R, q) => bell(H, x, y, R, q.c2));
  /** A stalk with its bells: n of them, along an arching stem from (x, y) (the tip), hanging to one side. */
  gartHead('bell-arch', (H, x, y, R, q) => {
    const n = q.n || 4, side = q.side || 1;
    for (let i = 0; i < n; i++) { const t = i / Math.max(1, n - 1), bx = x + side * (i * R * 1.1), by = y + i * i * R * 0.1 + i * R * 0.1, k = 1 - i * 0.04; H.st += `M${f1(bx)} ${f1(by - R * 0.5)}V${f1(by)}`; bell(H, bx, by, R * k, q.c2); }
  });
  /** Bells round the top of one stem, drooping both ways (the cowslip). */
  gartHead('bell-drop', (H, x, y, R, q) => {
    const n = q.n || 4;
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.2, bx = x + Math.sin(a) * R * 1.7, by = y - Math.cos(a) * R * 0.3 + 0.6 + Math.abs(a) * R * 0.3; H.st += `M${f1(x)} ${f1(y)}L${f1(bx)} ${f1(by)}`; bell(H, bx, by, R * 0.86, q.c2); }
  });
  gartHead('tower-bell', (H, x, y, R, q) => {
    const n = q.n || 7, len = q.len || R * 5;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), k = 0.46 + 0.62 * t, side = i % 2 ? 1 : -1; bell(H, x + side * R * k * 0.5, y + t * len, R * k, q.c2); }
    H.b += A.ell(x, y - 1, R * 0.26, R * 0.36);
  });
  gartHead('tower-disc', (H, x, y, R, q) => {
    const n = q.n || 5, len = q.len || R * 5;
    H.b += A.ell(x, y - R * 0.3, R * 0.28, R * 0.42);
    H.b += A.ell(x + 0.8, y + R * 0.5, R * 0.34, R * 0.4);
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n, k = 0.56 + 0.56 * t, side = i % 2 ? 1 : -1, cx = x + side * R * k * 0.72, cy = y + R * 0.8 + t * len, Q = R * k;
      H.b += A.circ(cx, cy, Q * 0.9);
      H.l += A.ell(cx - Q * 0.32, cy - Q * 0.36, Q * 0.34, Q * 0.26);
      H.s += A.ell(cx + Q * 0.36, cy + Q * 0.4, Q * 0.34, Q * 0.28);
      H.c += A.circ(cx, cy, Q * 0.26);
      H.g += A.circ(cx - Q * 0.08, cy - Q * 0.09, Q * 0.08);
    }
  });
  gartHead('tower-bud', (H, x, y, R, q) => {
    const n = q.n || 6, len = q.len || R * 4;
    for (let i = 0; i < n; i++) { const t = i / (n - 1), k = 0.72 + 0.4 * t, py = y + t * len; H.b += A.ell(x - R * 0.56 * k, py, R * 0.56 * k, R * 0.48 * k) + A.ell(x + R * 0.56 * k, py, R * 0.56 * k, R * 0.48 * k); H.l += A.ell(x - R * 0.72 * k, py - R * 0.16, R * 0.24 * k, R * 0.18 * k); H.s += A.ell(x + R * 0.72 * k, py + R * 0.14, R * 0.26 * k, R * 0.2 * k); }
    H.b += A.ell(x, y - R * 0.5, R * 0.42, R * 0.6);
    H.l += A.ell(x - R * 0.1, y - R * 0.66, R * 0.14, R * 0.2);
  });
  gartHead('mophead', (H, x, y, R) => {
    H.u += gartScallop(x + 0.4, y + 0.5, R * 0.92, 10, 1.16);
    H.b += gartScallop(x - 0.2, y - 0.3, R * 0.78, 9, 1.2);
    const r2 = A.rng(A.hash('mop' + Math.round(x) + Math.round(y)));
    for (let i = 0; i < 9; i++) { const a = r2() * TAU, q = Math.sqrt(r2()) * 0.74, px = x + Math.sin(a) * R * q, py = y - Math.cos(a) * R * q, lit = gartLitBy(a) * q > -0.08; const m = gartScallop(px, py, R * 0.11, 4, 1.5); if (lit) H.l += m; else H.s += m; }
  });
  gartHead('umbel', (H, x, y, R) => {
    const n = 9;
    for (let i = 0; i < n; i++) {
      const t = (i - (n - 1) / 2) / ((n - 1) / 2), px = x + t * R, py = y - (1 - t * t) * R * 0.34 + (i % 2) * R * 0.1;
      H.st += `M${f1(x)} ${f1(y + R * 0.7)}L${f1(px)} ${f1(py)}`;
      H.b += A.circ(px, py, R * 0.24);
      if (t < 0.2) H.l += A.circ(px - R * 0.05, py - R * 0.06, R * 0.11);
    }
    H.b += A.ell(x, y - R * 0.3, R * 0.4, R * 0.2);
  });
  gartHead('thistle', (H, x, y, R, q) => {
    for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.34; H.b += A.leaf(x, y, a, R * 1.2, R * 0.2, 0.55); if (i < 2) H.l += A.leaf(x, y, a, R * 0.86, R * 0.09, 0.55); }
    if (q.F) { q.F.add('base', A.star(x, y + R * 0.5, 9, R * 0.68, R * 0.5, 0.1)); q.F.add('light', A.ell(x - R * 0.2, y + R * 0.3, R * 0.2, R * 0.2)); }
  });
  gartHead('clover', (H, x, y, R) => {
    H.u += gartScallop(x + 0.3, y + 0.4, R * 0.86, 8, 1.2);
    H.b += gartScallop(x, y, R * 0.72, 7, 1.24);
    H.l += A.ell(x - R * 0.26, y - R * 0.3, R * 0.3, R * 0.22);
  });
  gartHead('bud', (H, x, y, R, q) => {
    H.b += `M${f1(x - R * 0.42)} ${f1(y + R * 0.3)}Q${f1(x - R * 0.5)} ${f1(y - R * 0.46)} ${f1(x)} ${f1(y - R * 0.9)}Q${f1(x + R * 0.5)} ${f1(y - R * 0.46)} ${f1(x + R * 0.42)} ${f1(y + R * 0.3)}z`;
    H.l += A.ell(x - R * 0.16, y - R * 0.3, R * 0.12, R * 0.3);
    if (q.F) { q.F.add('base', `M${f1(x - R * 0.5)} ${f1(y + R * 0.52)}Q${f1(x - R * 0.58)} ${f1(y - R * 0.1)} ${f1(x - R * 0.3)} ${f1(y - R * 0.3)}L${f1(x)} ${f1(y)}L${f1(x + R * 0.3)} ${f1(y - R * 0.3)}Q${f1(x + R * 0.58)} ${f1(y - R * 0.1)} ${f1(x + R * 0.5)} ${f1(y + R * 0.52)}z`); }
  });

  /* ---------- fruit and roots ---------- */
  gartHead('berry', (H, x, y, R) => { H.b += A.circ(x, y, R); H.s += A.ell(x + R * 0.28, y + R * 0.3, R * 0.6, R * 0.52); H.g += A.ell(x - R * 0.34, y - R * 0.36, R * 0.26, R * 0.2); });
  gartHead('tomato', (H, x, y, R, q) => {
    H.b += A.ell(x, y, R, R * 0.9); H.s += A.ell(x + R * 0.3, y + R * 0.3, R * 0.58, R * 0.48); H.g += A.ell(x - R * 0.36, y - R * 0.34, R * 0.26, R * 0.2);
    if (q.F) q.F.add('base', A.star(x, y - R * 0.82, 5, R * 0.5, R * 0.16, 0.1));
  });
  gartHead('pod', (H, x, y, R, q) => {
    const d = q.side > 0 ? 0.16 : -0.16;
    H.b += A.leaf(x, y - R * 0.6, Math.PI + d, R * 3, R * 0.46, 0.5);
    H.l += A.ell(x - R * 0.22 - d * R, y + R * 0.5, R * 0.2, R * 0.64);
    H.s += A.circ(x + d * R * 1.4, y + R * 0.1, R * 0.26) + A.circ(x + d * R * 2.6, y + R * 0.9, R * 0.26);
  });
  gartHead('cob', (H, x, y, R) => {
    H.b += A.ell(x, y, R * 0.56, R * 1.3);
    H.l += A.ell(x - R * 0.18, y - R * 0.3, R * 0.14, R * 0.56);
    H.w += `M${f1(x - R * 0.34)} ${f1(y - R * 0.6)}L${f1(x + R * 0.34)} ${f1(y - R * 0.6)}M${f1(x - R * 0.46)} ${f1(y)}L${f1(x + R * 0.46)} ${f1(y)}M${f1(x - R * 0.36)} ${f1(y + R * 0.6)}L${f1(x + R * 0.36)} ${f1(y + R * 0.6)}`;
    H.vw = 0.7;
  });
  gartHead('grapes', (H, x, y, R) => {
    const rows = [3, 3, 2, 1];
    rows.forEach((n, j) => { for (let i = 0; i < n; i++) { const px = x + (i - (n - 1) / 2) * R * 0.86, py = y + j * R * 0.76; H.b += A.circ(px, py, R * 0.52); if (j < 2 && i === 0) H.g += A.circ(px - R * 0.14, py - R * 0.16, R * 0.11); } });
    H.l += A.ell(x - R * 0.42, y + R * 0.16, R * 0.26, R * 0.3);
  });
  gartHead('raspberry', (H, x, y, R) => {
    H.b += gartScallop(x, y, R * 0.76, 7, 1.34);
    H.s += A.circ(x + R * 0.32, y + R * 0.34, R * 0.3) + A.circ(x - R * 0.2, y + R * 0.46, R * 0.22);
    H.l += A.circ(x - R * 0.3, y - R * 0.28, R * 0.24) + A.circ(x + R * 0.2, y - R * 0.34, R * 0.16);
  });
  /* a fruit that hangs: fat at the bottom (aubergine), or long and thin (q.thin, the chilli) */
  gartHead('drop', (H, x, y, R, q) => {
    const w = R * (q.thin ? 0.46 : 0.8), h = R * (q.thin ? 2 : 1.7), d = q.side > 0 ? 1 : -1;
    H.b += `M${f1(x - w * 0.5)} ${f1(y)}Q${f1(x)} ${f1(y - R * 0.3)} ${f1(x + w * 0.5)} ${f1(y)}C${f1(x + w * 1.2)} ${f1(y + h * 0.5)} ${f1(x + w * 1.1)} ${f1(y + h)} ${f1(x + d * R * 0.1)} ${f1(y + h)}C${f1(x - w * 1.1)} ${f1(y + h)} ${f1(x - w * 1.2)} ${f1(y + h * 0.5)} ${f1(x - w * 0.5)} ${f1(y)}z`;
    H.s += A.ell(x + w * 0.42, y + h * 0.62, w * 0.46, h * 0.28);
    H.g += A.ell(x - w * 0.4, y + h * 0.4, w * 0.2, h * 0.16);
    if (q.F) q.F.add('base', A.star(x, y + 0.2, 5, R * 0.46, R * 0.2, 0.1));
  });
  /* a fan of long leaves at the top of a stem (papyrus); q.F draws them in the plant's own green */
  gartHead('tuft', (H, x, y, R, q) => {
    const n = q.n || 11;
    for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.6, L = R * (0.84 + (1 - Math.abs(a) / 1.3) * 0.26); q.F.leaf(x, y, a, L, R * 0.1, { bulge: 0.5, light: i % 2 === 0 }); }
    H.b += A.ell(x, y + 0.4, R * 0.12, R * 0.12);
  });
  /* a banana: great leaves from the top of the trunk, a hand of fruit under them */
  gartHead('palm', (H, x, y, R, q) => {
    const k = q.fruit === false ? 0.7 : 1;
    for (const a of [-1.86, 1.86, -1.26, 1.26, -0.62, 0.62, 0]) q.F.leaf(x, y, a, R * k * (1.02 - Math.abs(a) * 0.06), R * k * 0.2, { bulge: 0.44, vein: true });
    for (let i = 0; i < 4; i++) { const px = x + 3 + i * R * 0.1; H.b += A.leaf(px, y + R * 0.08, Math.PI - 0.28 + i * 0.05, R * 0.34, R * 0.05, 0.5); }
  });

  /* the bird of paradise: a beak, an orange crest and a blue tongue, facing right */
  gartHead('paradise', (H, x, y, R, q) => {
    H.c += `M${f1(x - R * 0.9)} ${f1(y + R * 0.1)}Q${f1(x)} ${f1(y - R * 0.34)} ${f1(x + R * 1.3)} ${f1(y - R * 0.22)}Q${f1(x + R * 0.2)} ${f1(y + R * 0.46)} ${f1(x - R * 0.9)} ${f1(y + R * 0.1)}z`;
    for (const a of [-0.62, -0.18, 0.26, 0.7]) { H.b += A.leaf(x - R * 0.14, y - R * 0.04, a, R * 1.28, R * 0.2, 0.46); if (a < 0) H.l += A.leaf(x - R * 0.14, y - R * 0.04, a, R * 0.92, R * 0.09, 0.46); }
  });
  /* a flytrap's jaws: two lobes, open, with soft teeth */
  gartHead('trap', (H, x, y, R, q) => {
    const side = q.side > 0 ? 0.24 : -0.24;
    H.b += A.petal(x, y, side - 0.62, R * 1.3, R * 0.44) + A.petal(x, y, side + 0.62, R * 1.3, R * 0.44);
    H.s += A.petal(x, y, side + 0.66, R * 1, R * 0.24);
    H.l += A.petal(x, y, side - 0.66, R * 1, R * 0.22);
    for (const a of [-0.98, -0.72, -0.46, 0.46, 0.72, 0.98]) { const [tx, ty] = A.at(x, y, side + a, R * 1.32); H.g += A.circ(tx, ty, R * 0.1); }
  });

  /* the part of a root that shows above the soil: (x, y) is the ground */
  gartHead('rootball', (H, x, y, R) => { H.b += A.ell(x, y - R * 0.5, R, R * 0.92); H.s += A.ell(x + R * 0.34, y - R * 0.3, R * 0.56, R * 0.56); H.l += A.ell(x - R * 0.36, y - R * 0.84, R * 0.34, R * 0.22); H.g += A.ell(x - R * 0.42, y - R * 0.9, R * 0.14, R * 0.09); });
  gartHead('shoulder', (H, x, y, R) => { H.b += `M${f1(x - R)} ${f1(y)}Q${f1(x - R * 1.08)} ${f1(y - R * 0.9)} ${f1(x)} ${f1(y - R * 1.12)}Q${f1(x + R * 1.08)} ${f1(y - R * 0.9)} ${f1(x + R)} ${f1(y)}z`; H.s += A.ell(x + R * 0.48, y - R * 0.36, R * 0.42, R * 0.4); H.l += A.ell(x - R * 0.42, y - R * 0.66, R * 0.26, R * 0.2); });
  gartHead('onion', (H, x, y, R) => {
    H.b += `M${f1(x - R)} ${f1(y - R * 0.5)}Q${f1(x - R)} ${f1(y - R * 1.3)} ${f1(x - R * 0.14)} ${f1(y - R * 1.86)}L${f1(x + R * 0.14)} ${f1(y - R * 1.86)}Q${f1(x + R)} ${f1(y - R * 1.3)} ${f1(x + R)} ${f1(y - R * 0.5)}Q${f1(x + R)} ${f1(y + R * 0.1)} ${f1(x)} ${f1(y + R * 0.1)}Q${f1(x - R)} ${f1(y + R * 0.1)} ${f1(x - R)} ${f1(y - R * 0.5)}z`;
    H.s += A.ell(x + R * 0.46, y - R * 0.5, R * 0.42, R * 0.52);
    H.l += A.ell(x - R * 0.44, y - R * 0.76, R * 0.24, R * 0.42);
    H.w += `M${f1(x - R * 0.12)} ${f1(y - R * 1.6)}Q${f1(x - R * 0.6)} ${f1(y - R * 0.6)} ${f1(x - R * 0.2)} ${f1(y - R * 0.04)}M${f1(x + R * 0.14)} ${f1(y - R * 1.6)}Q${f1(x + R * 0.6)} ${f1(y - R * 0.6)} ${f1(x + R * 0.24)} ${f1(y - R * 0.04)}`;
    H.vw = 0.7;
  });

  /* ---------- leaves ---------- */
  gartLeafKind('strap', (F, x, y, a, L, W) => F.leaf(x, y, a, L, W, { bulge: 0.34 }));
  gartLeafKind('oval', (F, x, y, a, L, W) => F.leaf(x, y, a, L, W, { bulge: 0.46, vein: true }));
  gartLeafKind('blade', (F, x, y, a, L, W) => F.leaf(x, y, a, L, W * 0.55, { bulge: 0.3 }));
  gartLeafKind('round', (F, x, y, a, L, W) => { F.add('base', A.petal(x, y, a, L * 0.86, W)); F.add('light', A.petal(x + Math.sin(a - 0.9) * W * 0.2, y - Math.cos(a - 0.9) * W * 0.2, a, L * 0.6, W * 0.5)); });
  gartLeafKind('lobed', (F, x, y, a, L, W) => {
    F.add('base', A.petal(x, y, a, L * 0.9, W * 0.74) + A.petal(x, y, a - 0.62, L * 0.7, W * 0.62) + A.petal(x, y, a + 0.62, L * 0.7, W * 0.62));
    F.add('light', A.petal(x, y, a - 0.1, L * 0.62, W * 0.34) + A.petal(x, y, a - 0.66, L * 0.48, W * 0.26));
  });
  gartLeafKind('feather', (F, x, y, a, L, W) => {
    const [tx, ty] = A.at(x, y, a, L);
    F.vein(`M${f1(x)} ${f1(y)}L${f1(tx)} ${f1(ty)}`);
    for (let i = 1; i < 4; i++) { const t = i / 4, [px, py] = A.at(x, y, a, L * t), l = L * (0.54 - t * 0.28); F.add('base', A.leaf(px, py, a - 0.85, l, W * 0.15, 0.5) + A.leaf(px, py, a + 0.85, l, W * 0.15, 0.5)); F.add('light', A.leaf(px, py, a - 0.85, l * 0.7, W * 0.07, 0.5)); }
    F.add('base', A.leaf(tx, ty, a, L * 0.2, W * 0.15, 0.5));
  });
  /** A heart-shaped leaf, the round ones with a notch. */
  gartLeafKind('heart', (F, x, y, a, L, W) => {
    F.add('base', A.petal(x, y, a - 0.32, L * 0.86, W * 0.62) + A.petal(x, y, a + 0.32, L * 0.86, W * 0.62));
    F.add('light', A.petal(x, y, a - 0.36, L * 0.56, W * 0.32));
  });
  const leafy = (F, kind, x, y, a, L, W) => (GART_LEAVES[kind] || GART_LEAVES.oval)(F, x, y, a, L, W);

  /* ---------- the builder ---------- */
  const newH = () => ({ u: '', b: '', s: '', l: '', w: '', k: '', c: '', d: '', g: '', st: '', vw: 0.9 });
  const inHead = (H, T, C, kc) => A.P(T[0], H.u) + A.P(T[1], H.b) + A.P(T[0], H.s, 0.42) + A.P(T[2], H.l, 0.86) + (H.w ? A.S(T[0], H.vw, H.w, 0.62) : '') + A.P(kc, H.k, 0.88) + A.P(C[1], H.c) + A.P(C[0], H.d, 0.6) + A.P('#fffdf0', H.g, 0.85);
  function clump(F, sp, stage, r, y0) {
    const n = sp.ln == null ? 5 : sp.ln, k = stage <= 2 ? 0.72 : 1, L0 = (sp.ll || 14) * k, W0 = (sp.lw || L0 * 0.32), fan = sp.fan == null ? 1.15 : sp.fan, kind = sp.leaf || 'oval', count = stage <= 2 ? Math.max(3, Math.round(n * 0.7)) : n;
    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) * 2 - 1, a = t * fan + (r() - 0.5) * 0.14, L = L0 * (1 - Math.abs(t) * 0.14) * (0.92 + r() * 0.16), x = t * (sp.foot == null ? 2 : sp.foot);
      if (i % 2 && kind !== 'feather' && kind !== 'lobed' && kind !== 'round' && kind !== 'heart') F.back(x, y0 || 0, a + 0.1, L * 1.04, W0 * 0.96, 0.4);
      else leafy(F, kind, x, y0 || 0, a, L, W0);
    }
  }
  function mound(F, sp, stage, r) {
    const k = stage <= 2 ? 0.62 : stage === 3 ? 0.86 : 1, w = sp.mound[0] * k, h = sp.mound[1] * k, y0 = -(sp.moundY || 0) * k;
    F.add('back', gartScallop(0.6, y0 - h * 0.47, w * 0.9, 10, 1.14, h * 0.56 / w));
    F.add('base', gartScallop(-w * 0.05, y0 - h * 0.55, w * 0.78, 9, 1.16, h * 0.48 / w));
    F.add('light', gartScallop(-w * 0.26, y0 - h * 0.72, w * 0.36, 6, 1.2, h * 0.46 / w));
    // leaf marks: little scallops, light on the lit side, deep on the other, so a dome reads as leaves and not as a boulder
    const n = Math.round(4 + w / 5);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, q = 0.3 + r() * 0.55, px = Math.cos(a) * w * q * 0.84 - w * 0.06, py = y0 - h * 0.56 + Math.sin(a) * h * q * 0.42, leaf = A.leaf(px, py, 2.6 + r() * 1, 4.6, 1.9, 0.5);
      if (px - (py - y0) * 0.2 < -h * 0.02) F.add('light', leaf); else F.add('deep', leaf);
    }
    return h + (sp.moundY || 0) * k;
  }
  /** Register a flower: gartBloom('form:name', spec). */
  function gartBloom(key, sp) {
    gartDefine(key, {
      box: sp.box,
      draw(o, r) {
        const s = o.s5, win = o.season === 'winter';
        const T = o.col || A.tone3(sp.c || '#e86aa6'), C = o.col2 || A.tone3(sp.c2 || A.shift(T[1], 0, 0.9, -0.2));
        if (s === 0) return gartSeed(o, A, sp.seed || 'seed', T[1]);
        const L = sp.leafPal ? sp.leafPal(o) : sp.evergreen ? gartSeasonLeaf(o, 'evergreen') : gartPerennialLeaf(o), F = gartFoliage(L);
        const w0 = sp.mound ? sp.mound[0] : (sp.box[0] * 0.36);
        const pool = (sp.pool || (o.cat && o.cat.cat === 'water')) ? gartPool(o, r, sp.pool || Math.max(14, w0 + 2)) : '';
        let out = pool || A.shadow(s === 1 ? 8 : w0 + 2, 3);
        if (s === 1) {
          const kind = sp.leaf || 'oval', L0 = sp.l1 || 11;
          leafy(F, kind, -1, 0, -0.42, L0, L0 * 0.34); leafy(F, kind, 1, 0, 0.42, L0 * 0.92, L0 * 0.34);
          if (sp.ln == null || sp.ln > 2) leafy(F, kind, 0, 0, 0.04, L0 * 0.7, L0 * 0.26);
          return out + gartSway(o, r, F.out());
        }
        const flowersInWinter = !!(o.cat && (Array.isArray(o.cat.seasons) ? o.cat.seasons.includes('winter') : o.cat.seasons === 'all'));
        const rest = win && !flowersInWinter;
        let top = 0;
        if (sp.mound) top = mound(F, sp, rest ? 2 : s, r);
        const baseK = sp.base ? (s === 2 ? 0.55 : s === 3 ? 0.8 : 1) : 0, y0 = sp.base ? -(sp.baseH || 0) * baseK : 0;
        if (sp.ln !== 0) { clump(F, sp, rest ? 2 : s, r, y0); top = Math.max(top, (sp.ll || 14) * (rest || s <= 2 ? 0.66 : 0.9)); }
        const heads = [];
        let St = '';
        const q = Object.assign({}, sp.q || {}, { F, c2: sp.throat ? 1 : 0 });
        if (!rest && s >= 3) {
          const v = o.variant, list = sp.n || [1], n = list[v % list.length], hsc = s === 4 ? 1 : 0.62, tall = sp.tall || [28, 36], kTall = s === 4 ? 1 : 0.74;
          for (let i = 0; i < n; i++) {
            const c = n === 1 ? 0 : i / (n - 1) * 2 - 1;
            const hgt = (tall[0] + (tall[1] - tall[0]) * (1 - Math.abs(c)) * 0.8 + r() * (tall[1] - tall[0]) * 0.2) * kTall;
            const sprd = sp.spread == null ? 9 : sp.spread, tx = c * sprd * (n - 1) * 0.5 + (r() - 0.5) * 1.6;
            const x0 = c * (sp.foot == null ? 1.6 : sp.foot), ty = sp.headY ? -sp.headY * kTall + (r() - 0.5) * 3 + Math.abs(c) * 3 : sp.dome ? -(top * (0.62 + (1 - Math.abs(c)) * 0.34)) - r() * 2 : -hgt;
            if (!sp.dome) {
              const bend = (tx - x0) * 0.1 + (r() - 0.5) * 2.4, cx = x0 + (tx - x0) * 0.36 + bend, cy = ty * 0.52;
              St += `M${f1(x0)} 0Q${f1(cx)} ${f1(cy)} ${f1(tx)} ${f1(ty)}`;
              for (let j = 0; j < (sp.sl || 0); j++) {
                const t = 0.26 + j * (0.5 / Math.max(1, sp.sl)), u = 1 - t, px = u * u * x0 + 2 * u * t * cx + t * t * tx, py = 2 * u * t * cy + t * t * ty, side = (j + i) % 2 ? 1 : -1;
                leafy(F, sp.slk || 'oval', px, py, side * (0.95 + r() * 0.2), (sp.sll || 8) * (1 - j * 0.1), (sp.sll || 8) * 0.34);
              }
            }
            if (sp.along) {
              for (let j = 0; j < sp.along; j++) {
                const t = 0.42 + (j + 0.5) / sp.along * 0.54, u = 1 - t, bend = (tx - x0) * 0.1, cx = x0 + (tx - x0) * 0.36 + bend, cy = ty * 0.52, px = u * u * x0 + 2 * u * t * cx + t * t * tx, py = 2 * u * t * cy + t * t * ty, side = (j + i) % 2 ? 1 : -1;
                heads.push({ x: px + side * (sp.off == null ? 4 : sp.off), y: py + (sp.drop || 0), k: (0.9 + r() * 0.2) * (s === 4 ? 1 : 0.7), side, i: i + j });
              }
            } else heads.push({ x: tx, y: ty, k: (0.92 + r() * 0.14) * hsc, side: c >= 0 ? 1 : -1, i });
          }
        }
        // heads: all of one colour share their paths; look.mix gives each its own
        const mix = Array.isArray(o.look.mix) ? o.look.mix : null;
        const groups = new Map();
        for (const h of heads) {
          const key2 = mix ? h.i % mix.length : 0;
          if (!groups.has(key2)) groups.set(key2, newH());
          const shut = s === 4 && o.cat && o.cat.night && o.tod === 'day', Hh = groups.get(key2), name = (s === 4 && !shut) || sp.green ? sp.head : (sp.budHead || 'bud');
          (GART_HEADS[name] || GART_HEADS.daisy)(Hh, h.x, h.y, (sp.R || 8) * h.k * (s === 4 || sp.green || sp.budHead ? 1 : 1.36), Object.assign({}, q, { side: h.side, twist: h.i * 0.3 }));
          St += Hh.st; Hh.st = '';
        }
        // a stem: its deep edge, then its core
        const sw = sp.sw || 1.9, stemC = sp.stemC || A.mix(L[1], L[0], 0.2);
        let body = '';
        if (sp.frame && s >= 2) body += sp.frame(o, A, s, r);
        body += F.out({ lightOp: 0.82, veinW: 0.7 });
        if (St) body += A.S(L[0], sw + 0.9, St) + A.S(stemC, sw, St);
        if (sp.base && s >= 2) { const Hb = newH(); GART_HEADS[sp.base](Hb, 0, 0, sp.baseR * baseK, q); body += inHead(Hb, T, C, A.dk(T[0], 0.3)); }
        if (sp.trunk && s >= 2) { const hT = sp.trunk * (s === 2 ? 0.5 : s === 3 ? 0.8 : 1), bk = GART_PAL.bark; body = A.P(bk[1], `M-${f1(sp.trunkW)} 0.6Q-${f1(sp.trunkW * 0.56)} ${f1(-hT * 0.5)} -${f1(sp.trunkW * 0.5)} ${f1(-hT)}H${f1(sp.trunkW * 0.5)}Q${f1(sp.trunkW * 0.56)} ${f1(-hT * 0.5)} ${f1(sp.trunkW)} 0.6z`) + A.P(bk[2], `M-${f1(sp.trunkW * 0.62)} 0Q-${f1(sp.trunkW * 0.34)} ${f1(-hT * 0.5)} -${f1(sp.trunkW * 0.28)} ${f1(-hT)}H${f1(-sp.trunkW * 0.04)}Q${f1(-sp.trunkW * 0.1)} ${f1(-hT * 0.5)} ${f1(-sp.trunkW * 0.1)} 0z`, 0.7) + body; }
        const unripe = sp.green && s === 3 ? [L[1], L[2], L[3]] : null;
        for (const [k, Hh] of groups) { const TT = unripe || (mix ? A.tone3(mix[k]) : T); body += inHead(Hh, TT, C, sp.kc || A.dk(T[0], 0.35)); }
        if (rest) body += gartSnowCap(A, 0, -top - 0.6, (sp.mound ? sp.mound[0] * 1.2 : Math.max(12, top * 1.1)), 1.1);
        if (o.season === 'spring' && s >= 3 && !rest) body += gartDew(A, [[-w0 * 0.5, -top * 0.5], [w0 * 0.4, -top * 0.34]]);
        if (o.cat && o.cat.glow && s === 4 && heads.length) body += gartSpark(A, heads[0].x + (sp.R || 8) * 0.8, heads[0].y - (sp.R || 8) * 0.8, 3.2) + gartSpark(A, heads[0].x - (sp.R || 8) * 0.9, heads[0].y + (sp.R || 8) * 0.3, 2.2);
        if (o.cat && o.cat.glow && s >= 3 && (o.night || o.dusk)) body = gartHalo(o, r, heads.length ? heads[0].x : 0, heads.length ? heads[0].y : -top, 26) + body;
        if (o.season === 'autumn' && !pool) out += gartFallen(A, r, w0 + 2, ['#c8862a', '#a8542a'], 2);
        return out + gartSway(o, r, body);
      },
    });
  }
  /** Still water at the foot of a pond plant. */
  function gartPool(o, r, w) {
    const W = GART_PAL.water, frozen = o.season === 'winter';
    let s = A.P(W[0], A.ell(0.4, 0.5, w * 1.04, w * 0.3)) + A.P(frozen ? '#c8dcea' : W[1], A.ell(0, 0, w, w * 0.27)) + A.P(frozen ? '#eaf2f6' : W[2], A.ell(-w * 0.22, -w * 0.06, w * 0.56, w * 0.13), 0.7);
    if (!frozen && o.anim) s += `<g class="gda-ripple" style="${A.T(r, 0, 4)}">${A.S(W[3], 0.9, A.ell(w * 0.36, -w * 0.02, w * 0.2, w * 0.07), 0.8)}</g>`;
    return s;
  }
  gartBloomForm = gartBloom; gartPoolAt = gartPool;

  /* ---------- the flowers: one row each ---------- */
  gartBloom('form:daisy', { box: [58, 42], head: 'daisy', R: 10, n: [3, 3, 2, 3], dome: true, mound: [20, 22], spread: 13, leaf: 'lobed', ln: 3, ll: 13, seed: 'seed' });
  gartBloom('form:cup', { box: [50, 52], head: 'cup', R: 8.6, n: [1, 2, 3], tall: [30, 38], spread: 11, leaf: 'strap', ln: 4, ll: 24, lw: 3.8, fan: 0.74, seed: 'bulb', q: { open: 0.14 } });
  gartBloom('form:trumpet', { box: [50, 52], head: 'trumpet', R: 10.5, n: [1, 2, 2], tall: [32, 40], spread: 13, leaf: 'strap', ln: 5, ll: 26, lw: 2.8, fan: 0.6, seed: 'bulb' });
  gartBloom('form:sunflower', { box: [60, 120], head: 'sunflower', R: 21, n: [1], tall: [96, 100], sw: 3.4, leaf: 'heart', ln: 3, ll: 22, lw: 14, fan: 1.2, sl: 3, slk: 'heart', sll: 20, seed: 'striped' });
  gartBloom('form:spike', { box: [56, 48], head: 'tower-bud', R: 3.5, n: [5, 6, 7], tall: [30, 38], spread: 7.4, sw: 1.3, mound: [17, 14], leaf: 'blade', ln: 0, seed: 'seed', q: { n: 5, len: 9 }, budHead: 'tower-bud' });
  gartBloom('form:poppy', { box: [58, 56], head: 'poppy', R: 10, n: [2, 3, 2], tall: [32, 44], spread: 21, sw: 1.5, leaf: 'lobed', ln: 4, ll: 15, lw: 6, seed: 'seed', kc: '#2a1f22' });
  gartBloom('form:star', { box: [48, 52], head: 'star', R: 9.5, n: [3, 3, 2], tall: [32, 42], spread: 13, sw: 1.5, leaf: 'blade', ln: 6, ll: 22, lw: 3.8, fan: 0.7, sl: 1, slk: 'blade', sll: 11, seed: 'seed' });
  gartBloom('form:pompom', { box: [58, 40], head: 'pompom', R: 10.5, n: [3, 3, 2], dome: true, mound: [21, 22], spread: 14, leaf: 'lobed', ln: 3, ll: 12, seed: 'seed' });
  gartBloom('form:pansy', { box: [58, 36], head: 'pansy', R: 9.4, n: [2, 3, 2], dome: true, mound: [20, 16], spread: 21, leaf: 'round', ln: 4, ll: 14, lw: 6, seed: 'seed' });
  gartBloom('form:bell', { box: [42, 40], head: 'bell-arch', R: 6.2, n: [2, 3], tall: [25, 30], spread: 9, sw: 1.4, leaf: 'strap', ln: 4, ll: 17, lw: 3, fan: 0.6, seed: 'bulb', q: { n: 1, c2: 1 }, throat: 1 });
  gartBloom('form:goblet', { box: [46, 38], head: 'cup', R: 6.8, n: [3, 3, 2], tall: [17, 22], spread: 10, sw: 2.6, stemC: '#f2ecd8', leaf: 'blade', ln: 6, ll: 18, lw: 3.6, fan: 0.8, seed: 'bulb', q: { w: 0.7, h: 2, open: 0.4, stamen: 1 } });
  gartBloom('form:bell-arch', { box: [50, 44], head: 'bell-arch', R: 5, n: [2, 3], tall: [28, 34], spread: 10, sw: 1.5, leaf: 'strap', ln: 5, ll: 21, lw: 3, fan: 0.66, seed: 'bulb', q: { n: 4, c2: 1 } });
  gartBloom('form:spike-bell', { box: [46, 96], head: 'tower-bell', R: 8, n: [1, 2], tall: [86, 92], spread: 16, sw: 2.4, leaf: 'oval', ln: 5, ll: 24, lw: 8, seed: 'seed', q: { n: 8, len: 46, c2: 1 }, throat: 1, budHead: 'tower-bud' });
  gartBloom('form:spike-cup', { box: [50, 100], head: 'tower-disc', R: 8, n: [1, 2], tall: [84, 96], spread: 22, sw: 2.4, leaf: 'round', ln: 4, ll: 20, lw: 9, seed: 'seed', q: { n: 5, len: 44 }, budHead: 'tower-bud' });
  gartBloom('form:peony', { box: [62, 52], head: 'peony', R: 12.5, n: [2, 2, 3], tall: [30, 38], spread: 25, sw: 1.9, mound: [20, 20], leaf: 'lobed', ln: 3, ll: 13, seed: 'seed' });
  gartBloom('form:rose', { box: [62, 60], head: 'rose', R: 10.5, n: [3, 2, 3], dome: true, mound: [24, 44], spread: 19, leaf: 'oval', ln: 0, seed: 'cutting' });
  gartBloom('form:dahlia', { box: [56, 58], head: 'dahlia', R: 12, n: [2, 3, 2], tall: [36, 46], spread: 17, sw: 2, leaf: 'oval', ln: 5, ll: 20, lw: 7, sl: 1, sll: 12, seed: 'tuber' });
  gartBloom('form:mophead', { box: [64, 54], head: 'mophead', R: 11.5, n: [3, 2, 3], dome: true, mound: [25, 38], spread: 21, leaf: 'oval', ln: 3, ll: 18, lw: 8, fan: 1.3, seed: 'cutting' });
  gartBloom('form:iris', { box: [46, 60], head: 'iris', R: 12, n: [1, 2, 1], tall: [46, 52], spread: 14, sw: 2, leaf: 'strap', ln: 6, ll: 36, lw: 4, fan: 0.42, seed: 'bulb' });
  gartBloom('form:lily', { box: [50, 72], head: 'lily', R: 13, n: [2, 2, 3], tall: [58, 66], spread: 15, sw: 1.9, leaf: 'oval', ln: 3, ll: 16, lw: 4.6, sl: 3, slk: 'oval', sll: 13, seed: 'bulb' });
  gartBloom('form:cluster', { box: [56, 30], head: 'blossom', R: 5.5, n: [6, 7, 6], dome: true, mound: [21, 15], spread: 6.4, leaf: 'round', ln: 3, ll: 10, seed: 'seed' });
  gartBloom('form:daisy-tall', { box: [52, 70], head: 'daisy', R: 11, n: [3, 2, 3], tall: [52, 62], spread: 15, sw: 1.5, leaf: 'feather', ln: 4, ll: 24, lw: 12, sl: 1, slk: 'feather', sll: 14, seed: 'seed' });
  gartBloom('form:daisy-cloud', { box: [62, 56], head: 'daisy', R: 7.5, n: [6, 7, 6], dome: true, mound: [24, 36], spread: 8, leaf: 'oval', ln: 0, seed: 'seed', q: { n: 8 } });
  gartBloom('form:hosta', { box: [60, 44], head: 'bell-arch', R: 4.6, n: [2, 1], tall: [36, 42], spread: 13, sw: 1.6, leaf: 'oval', ln: 7, ll: 24, lw: 9.5, fan: 1.3, seed: 'tuber', q: { n: 3 } });
  gartBloom('form:rose-bush', { box: [58, 64], head: 'rose', R: 9.5, n: [3, 2, 3], dome: true, mound: [24, 54], spread: 19, ln: 0, evergreen: true, seed: 'cutting' });
  gartBloom('plant:christmas-rose', { box: [50, 38], head: 'blossom', R: 9, n: [2, 3], dome: true, mound: [19, 17], spread: 18, leaf: 'oval', ln: 4, ll: 15, lw: 6, evergreen: true, seed: 'seed' });
  gartBloom('form:cup-small', { box: [50, 34], head: 'blossom', R: 7.6, n: [3, 3, 2], tall: [19, 25], spread: 11, sw: 1.4, leaf: 'lobed', ln: 3, ll: 13, seed: 'seed', q: { n: 5 } });
  gartBloom('form:clover', { box: [50, 28], head: 'clover', R: 6.4, n: [3, 2, 3], dome: true, mound: [20, 12], spread: 12, leaf: 'heart', ln: 5, ll: 11, lw: 6.5, fan: 1.3, seed: 'seed' });
  gartBloom('form:bell-cluster', { box: [42, 40], head: 'bell-drop', R: 5.4, n: [1, 2], tall: [26, 31], spread: 13, sw: 1.8, leaf: 'oval', ln: 5, ll: 14, lw: 5.5, fan: 1.25, seed: 'seed' });
  gartBloom('form:star-small', { box: [46, 50], head: 'campion', R: 8.4, n: [3, 3, 2], tall: [32, 44], spread: 12, sw: 1.4, leaf: 'oval', ln: 4, ll: 15, lw: 5, sl: 1, sll: 10, seed: 'seed' });
  gartBloom('form:umbel', { box: [50, 76], head: 'umbel', R: 11, n: [3, 2, 3], tall: [58, 68], spread: 15, sw: 1.5, leaf: 'feather', ln: 4, ll: 24, lw: 13, seed: 'seed' });
  gartBloom('form:orchid-spike', { box: [36, 42], head: 'orchid', R: 6.6, n: [2, 2, 3], tall: [28, 36], spread: 9, sw: 1.5, leaf: 'strap', ln: 3, ll: 15, lw: 4, fan: 0.9, seed: 'seed', kc: '#4a2a1a' });
  gartBloom('form:flat', { box: [46, 26], head: 'blossom', R: 7.2, n: [3, 3, 2], dome: true, mound: [17, 11], spread: 12, leaf: 'round', ln: 4, ll: 11, lw: 5.4, fan: 1.3, seed: 'seed' });
  gartBloom('form:thistle', { box: [46, 66], head: 'thistle', R: 9, n: [3, 2, 3], tall: [44, 56], spread: 13, sw: 1.9, leaf: 'blade', ln: 6, ll: 24, lw: 9, fan: 1.1, sl: 1, slk: 'blade', sll: 13, seed: 'seed' });
  gartBloom('form:moon-trumpet', { box: [50, 72], head: 'hibiscus', R: 11, n: [3, 2], tall: [46, 62], spread: 15, sw: 1.7, leaf: 'heart', ln: 3, ll: 15, lw: 9, sl: 2, slk: 'heart', sll: 12, seed: 'seed' });
  gartBloom('form:passion', { box: [52, 70], head: 'passion', R: 12, n: [2, 3], tall: [44, 60], spread: 14, sw: 1.6, leaf: 'lobed', ln: 3, ll: 15, sl: 2, slk: 'lobed', sll: 12, seed: 'seed' });
  gartBloom('form:hibiscus', { box: [62, 54], head: 'hibiscus', R: 11.5, n: [3, 2, 3], dome: true, mound: [25, 40], spread: 21, ln: 0, evergreen: true, seed: 'cutting' });
  gartBloom('form:daisy-small', { box: [50, 34], head: 'daisy', R: 7.4, n: [4, 3, 4], tall: [20, 27], spread: 8.4, sw: 1.3, leaf: 'feather', ln: 4, ll: 15, lw: 9, seed: 'seed', q: { n: 9, rc: 0.38 } });
  gartBloom('form:grass-flower', { box: [38, 40], head: 'clover', R: 6, n: [3, 2, 3], tall: [28, 33], spread: 8, sw: 1.3, leaf: 'blade', ln: 7, ll: 26, lw: 3.6, fan: 0.5, seed: 'bulb' });
  /* a wigwam of three canes for a climber to go up, tied at the top */
  const wigwam = (h, w) => (o, A2, s) => { const H2 = h * (s === 2 ? 0.6 : s === 3 ? 0.84 : 1), W2 = w; return A2.S('#7a5a38', 2.1, `M${-W2} 0L1 ${f1(-H2)}M${W2} 0L-1 ${f1(-H2)}M0 1L0 ${f1(-H2 - 2)}`) + A2.S('#b89468', 1, `M${-W2 + 0.6} 0L1.6 ${f1(-H2)}M0.5 1L0.5 ${f1(-H2 - 2)}`, 0.9) + A2.S('#e8dcb8', 1.1, `M-2.4 ${f1(-H2 + 3)}L2.4 ${f1(-H2 + 4)}M-2.4 ${f1(-H2 + 5)}L2.4 ${f1(-H2 + 4)}`); };
  /* two canes and a rail for a vine */
  const rails = (h, w) => (o, A2, s) => { const H2 = h * (s === 2 ? 0.68 : s === 3 ? 0.86 : 1); return A2.S('#7a5a38', 2.4, `M${-w} 0V${f1(-H2)}M${w} 0V${f1(-H2)}M${-w - 2} ${f1(-H2 + 3)}H${w + 2}M${-w - 1} ${f1(-H2 * 0.56)}H${w + 1}`) + A2.S('#b89468', 1, `M${-w - 0.6} 0V${f1(-H2)}M${w - 0.6} 0V${f1(-H2)}M${-w - 2} ${f1(-H2 + 2.4)}H${w + 2}`, 0.9); };
  gartBloom('form:climber', { box: [46, 84], head: 'blossom', R: 6.6, n: [3], tall: [66, 78], spread: 7, along: 3, off: 8, sw: 1.5, frame: wigwam(78, 15), leaf: 'heart', ln: 4, ll: 16, lw: 9, sl: 4, slk: 'heart', sll: 11, seed: 'seed' });
  gartBloom('form:vine-fruit', { box: [48, 78], head: 'tomato', R: 6.2, n: [2], tall: [62, 72], spread: 12, along: 3, off: 7, sw: 2, green: 1, frame: wigwam(72, 12), leaf: 'lobed', ln: 3, ll: 15, sl: 5, slk: 'lobed', sll: 13, seed: 'seed' });
  gartBloom('form:vine-pod', { box: [48, 66], head: 'pod', R: 4, n: [2], tall: [48, 58], spread: 12, along: 3, off: 7, sw: 1.7, green: 1, frame: rails(58, 15), leaf: 'round', ln: 3, ll: 13, lw: 6, sl: 4, slk: 'round', sll: 11, seed: 'seed' });
  gartBloom('form:pole', { box: [48, 116], head: 'pod', R: 4.4, n: [2], tall: [96, 108], spread: 14, along: 5, off: 7, sw: 1.7, green: 1, frame: wigwam(112, 13), leaf: 'heart', ln: 3, ll: 15, lw: 9, sl: 6, slk: 'heart', sll: 12, seed: 'seed' });
  gartBloom('form:stalk', { box: [50, 124], head: 'cob', R: 8, n: [1, 2], tall: [104, 116], spread: 16, along: 2, off: 8, sw: 3.8, green: 1, leaf: 'strap', ln: 6, ll: 46, lw: 4.4, fan: 0.82, sl: 4, slk: 'strap', sll: 30, seed: 'seed' });
  gartBloom('form:bush-fruit', { box: [56, 54], head: 'drop', R: 6.4, n: [3, 3, 4], dome: true, mound: [23, 38], spread: 13, ln: 0, green: 1, seed: 'seed', q: {} });
  gartBloom('form:cane', { box: [56, 76], head: 'raspberry', R: 4.6, n: [3], tall: [60, 72], spread: 15, along: 3, off: 6, sw: 2.2, stemC: '#8a5a3a', green: 1, leaf: 'oval', ln: 3, ll: 15, lw: 6, sl: 4, slk: 'oval', sll: 13, seed: 'cutting' });
  gartBloom('form:berry-bush', { box: [58, 50], head: 'raspberry', R: 6, n: [5, 6], dome: true, mound: [24, 38], spread: 9, ln: 0, green: 1, seed: 'cutting' });
  gartBloom('form:bramble', { box: [60, 52], head: 'raspberry', R: 6, n: [5, 4], dome: true, mound: [26, 34], spread: 10, ln: 0, green: 1, seed: 'cutting' });
  gartBloom('form:vine-grape', { box: [62, 88], head: 'grapes', R: 5.8, n: [3], dome: true, headY: 48, mound: [27, 26], moundY: 50, trunk: 54, trunkW: 3.4, spread: 15, ln: 0, green: 1, frame: rails(74, 22), seed: 'cutting' });
  gartBloom('form:root', { box: [40, 34], base: 'rootball', baseR: 9.5, baseH: 8, head: 'clover', n: [0], leaf: 'oval', ln: 5, ll: 20, lw: 6, fan: 0.9, seed: 'seed' });
  gartBloom('form:root-frilly', { box: [42, 42], base: 'shoulder', baseR: 8.4, baseH: 7, head: 'clover', n: [0], leaf: 'feather', ln: 5, ll: 28, lw: 15, fan: 0.74, seed: 'seed' });
  gartBloom('form:bulb', { box: [34, 42], base: 'onion', baseR: 9, baseH: 12, head: 'clover', n: [0], leaf: 'blade', ln: 5, ll: 26, lw: 5, fan: 0.42, seed: 'bulb' });
  gartBloom('form:mat', { box: [60, 22], head: 'blossom', R: 3.8, n: [8, 7, 8], dome: true, mound: [25, 13], spread: 6, ln: 0, seed: 'seed' });
  gartBloom('form:needle-bush', { box: [46, 52], head: 'blossom', R: 3.4, n: [5, 6, 5], tall: [28, 38], spread: 6, sw: 1.3, leaf: 'blade', ln: 13, ll: 36, lw: 5.4, fan: 0.8, foot: 4, evergreen: true, seed: 'cutting' });
  gartBloom('form:leafy-soft', { box: [50, 42], head: 'tower-bud', R: 3.4, n: [3, 2, 3], tall: [34, 40], spread: 12, sw: 1.5, leaf: 'oval', ln: 7, ll: 21, lw: 8, fan: 1.25, seed: 'seed', q: { n: 4, len: 8 }, budHead: 'tower-bud' });
  gartBloom('form:grass', { box: [50, 56], c: '#d4c27a', head: 'tower-bud', R: 2.5, n: [5, 6, 5], tall: [42, 54], spread: 7, sw: 1.1, leaf: 'blade', ln: 11, ll: 38, lw: 5, fan: 0.74, foot: 3, seed: 'seed', q: { n: 3, len: 5 }, budHead: 'tower-bud' });
  gartBloom('form:lotus', { box: [50, 56], head: 'lotus', R: 12, n: [1, 2, 1], tall: [34, 44], spread: 16, sw: 1.8, leaf: 'round', ln: 3, ll: 15, lw: 9, fan: 1.32, seed: 'tuber', pool: 22 });
  gartBloom('form:papyrus', { box: [52, 100], c: '#8fc04a', head: 'tuft', R: 15, n: [3, 3, 2], tall: [68, 92], spread: 13, sw: 1.8, leaf: 'blade', ln: 4, ll: 18, lw: 4, fan: 0.5, seed: 'tuber', pool: 20, budHead: 'tuft' });
  gartBloom('form:jade', { box: [50, 46], head: 'blossom', R: 3.6, n: [4, 5, 4], dome: true, mound: [22, 24], moundY: 16, trunk: 20, trunkW: 3.6, spread: 8, ln: 0, leafPal: o => gartSeasonLeaf(o, 'succulent'), seed: 'cutting' });
  gartBloom('form:bird-paradise', { box: [58, 84], c: '#f68b1f', c2: '#3b5bdb', head: 'paradise', R: 12, n: [2, 2, 3], tall: [58, 72], spread: 14, sw: 2.3, leaf: 'oval', ln: 7, ll: 46, lw: 10, fan: 0.94, foot: 3, evergreen: true, seed: 'seed', budHead: 'bud' });
  gartBloom('form:flytrap', { box: [50, 28], head: 'trap', R: 7.4, n: [4, 5, 4], tall: [13, 18], spread: 8.4, sw: 1.8, leaf: 'blade', ln: 6, ll: 14, lw: 5, fan: 1.2, foot: 3, seed: 'seed', budHead: 'trap' });
  gartBloom('form:reed', { box: [42, 88], c: '#7a4b2a', head: 'cob', R: 6.6, n: [2, 3, 2], tall: [64, 82], spread: 8, sw: 2, leaf: 'strap', ln: 7, ll: 58, lw: 3.8, fan: 0.42, foot: 3, seed: 'tuber', pool: 18, budHead: 'cob' });
  gartBloom('form:banana', { box: [78, 136], head: 'palm', c: '#f6e049', R: 40, n: [1], tall: [86, 90], sw: 7, stemC: '#a8a862', leaf: 'oval', ln: 2, ll: 18, lw: 6, seed: 'tuber', budHead: 'palm', q: {} });
})();
