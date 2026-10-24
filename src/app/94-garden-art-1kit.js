/* ============================================================
   GARDEN ART, the plant kit (2.18, agent 'garden-art'): the shared brushes the
   species files draw with. PURE, nothing drawn at load.

     gartLit(a)                    which half of a leaf at angle a faces the light (upper left): -1 | 1
     gartFoliage(pal)              an accumulator: .leaf(x, y, a, len, w, o) .back(...) .vein(d) .out()
                                   (every leaf of a plant in three or four paths, whatever the count)
     gartSeed(o, A, kind, col)     stage 0: a tilled mound, the seed or bulb peeking, a marker stake
                                   kind 'seed' | 'bulb' | 'striped' | 'acorn' | 'pip' | 'tuber' | 'cone' | 'spore' | 'cutting'
     gartSnowCap(A, x, y, w)       a soft cap of snow on a head or a crown (winter rest)
     gartFrost(A, d)               a frosty edge stroke over shapes (winter)
     gartFallen(A, r, w, cols, n)  a few fallen leaves at the foot (autumn)
     gartDew(A, r, pts)            dew sparkles (spring mornings)
     gartSeasonLeaf(o, kind)       the leaf palette of a plant for the season ('deciduous' | 'evergreen' | 'silver' | 'succulent' | 'herb')
     gartPick(list, o)             the main colour's tones [deep, base, light]: the catalogue's, else the list's by variant
     gartC2(o, fallback)           the second colour (centres, eyes, blossom)
     gartSway(o, r, inner)         the plant's sway about its foot (the engine's gda-sway, a seeded delay)
     gartHalo(o, r, x, y, R, col)  a glow behind lights and glowing plants at dusk and night (gda-glow)
   ============================================================ */
function gartLit(a) { return (0.6 * Math.cos(a) + 0.8 * Math.sin(a)) > 0 ? -1 : 1; }

function gartFoliage(pal, A) {
  A = A || GART;
  const acc = { back: '', base: '', light: '', vein: '', deep: '' };
  return {
    /** A leaf in front: the base tone, its lit half in the light tone, a midrib (o.vein false: none). */
    leaf(x, y, a, len, w, o) {
      o = o || {};
      const b = o.bulge;
      acc.base += A.leaf(x, y, a, len, w, b);
      if (o.light !== false) acc.light += A.halfLeaf(x, y, a, len, w, gartLit(a), b);
      if (o.vein && len > 6) { const [tx, ty] = A.at(x, y, a, len * 0.82); acc.vein += `M${A.f1(x)} ${A.f1(y)}L${A.f1(tx)} ${A.f1(ty)}`; }
      return this;
    },
    /** A leaf behind the plant (the deep tone, no light). */
    back(x, y, a, len, w, b) { acc.back += A.leaf(x, y, a, len, w, b); return this; },
    /** Any extra path in a tone ('back' | 'base' | 'light' | 'deep'). */
    add(tone, d) { acc[tone] = (acc[tone] || '') + d; return this; },
    vein(d) { acc.vein += d; return this; },
    out(o) {
      o = o || {};
      return A.P(pal[0], acc.back, o.backOp == null ? 0.95 : o.backOp) + A.P(pal[1], acc.base) + A.P(pal[2], acc.light, o.lightOp == null ? 0.85 : o.lightOp)
        + A.P(pal[0], acc.deep, 0.55) + (acc.vein ? A.S(pal[0], o.veinW || 0.6, acc.vein, 0.45) : '');
    },
  };
}

/** The leaf palette for a season. kind: 'deciduous' (autumn colour, winter brown), 'evergreen', 'silver', 'succulent', 'herb'. */
function gartSeasonLeaf(o, kind) {
  const P = GART_PAL, s = o.season;
  if (o.look && o.look.leaf) return gartLeafSeason(o.look.leaf, s, kind === 'silver' || kind === 'herb' ? 'perennial' : kind, o.autumnCol);
  if (kind === 'evergreen') return s === 'winter' ? ['#23402e', '#355c40', '#527a56', '#86a684'] : s === 'spring' ? ['#2a5232', '#3f7044', '#64985a', '#9cc480'] : P.evergreen;
  if (kind === 'silver') return s === 'winter' ? ['#56645c', '#76887e', '#9aaca0', '#c6d2ca'] : P.silver;
  if (kind === 'succulent') return s === 'autumn' ? ['#5a5a3a', '#8a8a5a', '#b4b07a', '#dcd8a8'] : P.succulent;
  if (kind === 'herb') return s === 'autumn' ? ['#4a5a2a', '#6a7a34', '#90a04a', '#c0c87a'] : s === 'winter' ? P.leaf.winter : s === 'spring' ? P.leaf.spring : P.leaf.summer;
  return P.leaf[s] || P.leaf.summer;
}
/** A soft leaf palette for perennials in autumn: still mostly green, warming at the tips (nothing looks dead). */
function gartPerennialLeaf(o) {
  if (o.look && o.look.leaf) return gartLeafSeason(o.look.leaf, o.season, 'perennial');
  if (o.season === 'autumn') return ['#4a5a26', '#748a34', '#a4ae4a', '#d8c870'];
  if (o.season === 'winter') return ['#3a4a36', '#56684a', '#7a8a64', '#aab696'];
  return GART_PAL.leaf[o.season] || GART_PAL.leaf.summer;
}
/** The main colour's tones: the catalogue's (look.v[variant] or look.c) when there is one, else the list's. */
function gartPick(list, o) {
  if (o && o.col) return o.col;
  return list[(o ? o.variant : 0) % list.length];
}
/** The second colour (centres, eyes, blossom): the catalogue's look.c2, else the fallback hex. */
function gartC2(o, fallback) { return o && o.col2 ? o.col2[1] : fallback; }

/** Stage 0: a tilled mound with the seed peeking out, and a little marker stake with a tag in the plant's colour. */
function gartSeed(o, A, kind, col) {
  const S = GART_PAL.soil, r = A.rng(A.hash('seed|' + kind + '|' + o.variant));
  const w = 13 + r() * 3;
  let s = A.shadow(w + 2, 3.2, 0.8);
  s += A.P(S[1], `M${-w} 0Q${-w * 0.55} -7 0 -7.4Q${w * 0.6} -7 ${w} 0z`);
  s += A.P(S[2], `M${-w * 0.85} -1Q${-w * 0.5} -6.4 -1 -6.6Q${-w * 0.35} -4 ${-w * 0.85} -1z`, 0.8);
  // the tilled crumbs
  let cr = '';
  for (let i = 0; i < 5; i++) cr += A.circ(-w * 0.7 + i * w * 0.34 + r() * 2, -1.5 - r() * 3.5, 0.7 + r() * 0.6);
  s += A.P(S[0], cr, 0.6);
  const x = (r() - 0.5) * 4, y = -6.4;
  if (kind === 'bulb') s += A.P('#c8a070', `M${x - 4} ${y + 2}q0-6 4-7q4 1 4 7z`) + A.P('#e6c896', `M${x - 2.6} ${y + 1}q0-4 2.4-5.4q-0.6 3 0 5.4z`, 0.9) + A.S('#8a6a44', 0.7, `M${x} ${y - 5}l0.6-2.4`);
  else if (kind === 'striped') s += A.P('#3a3430', A.leaf(x - 2, y + 1, 0.5, 6, 1.8)) + A.S('#e8e0d0', 0.5, `M${x - 1.6} ${y + 0.4}l2.6-3.6`, 0.9);
  else if (kind === 'acorn') s += A.P('#9a6a34', A.ell(x, y - 1.6, 2.6, 3)) + A.P('#6a4a2a', `M${x - 3} ${y - 2.6}q3-3.4 6 0z`) + A.S('#5a3a20', 0.8, `M${x} ${y - 4}l0.4-1.4`);
  else if (kind === 'pip') s += A.P('#5a3a24', A.leaf(x, y + 1, -0.3, 4.4, 1.4)) + A.P('#5a3a24', A.leaf(x + 3, y + 1, 0.4, 4, 1.3));
  else if (kind === 'tuber') s += A.P('#b48a5a', A.ell(x, y, 4.2, 2.8)) + A.P('#7a9a4a', A.leaf(x + 1, y - 2, 0.3, 3.4, 1));
  else if (kind === 'cone') s += A.P('#8a5a30', `M${x - 2.4} ${y}l2.4-6 2.4 6z`) + A.S('#5a3a20', 0.6, `M${x - 1.6} ${y - 2}h3.2M${x - 1} ${y - 4}h2`);
  else if (kind === 'spore') s += A.P('#d8d0c0', A.circ(x - 2, y - 0.6, 1.4) + A.circ(x + 1.4, y - 1, 1.1) + A.circ(x + 3.2, y + 0.2, 0.9), 0.9);
  else if (kind === 'cutting') s += A.S('#6a5030', 1.4, `M${x} ${y + 1}l-0.6-7`) + A.P(GART_PAL.leaf.spring[1], A.leaf(x - 0.6, y - 5.6, -0.8, 4, 1.4) + A.leaf(x - 0.6, y - 5.6, 0.7, 3.6, 1.3));
  else s += A.P('#7a5a34', A.leaf(x - 1, y + 1, 0.4, 5, 1.8)) + A.P('#a8845a', A.halfLeaf(x - 1, y + 1, 0.4, 5, 1.8, -1), 0.8);
  // a marker stake with a tag in the plant's colour (a seed packet's promise)
  if (col) {
    const sx = w * 0.62 + r() * 2;
    s += A.S('#b08a5a', 1.3, `M${A.f1(sx)} -2L${A.f1(sx + 0.8)} -15`) + A.P('#f4ecd8', A.rrect(sx - 3.4, -21, 8.4, 6.4, 1.2)) + A.P(col, A.circ(sx + 0.8, -17.8, 1.9));
  }
  if (o.season === 'winter') s += A.P(GART_PAL.snow, `M${-w * 0.8} -2.2Q${-w * 0.4} -8.2 0 -8Q${w * 0.5} -7.6 ${w * 0.8} -2.2Q${w * 0.3} -5 0 -5Q${-w * 0.4} -5 ${-w * 0.8} -2.2z`, 0.95);
  return s;
}

/** A soft cap of snow sitting on top of a head or crown at (x, y), w wide. */
function gartSnowCap(A, x, y, w, k) {
  k = k || 1;
  return A.P(GART_PAL.snow, `M${A.f1(x - w / 2)} ${A.f1(y + 1.2 * k)}Q${A.f1(x - w * 0.42)} ${A.f1(y - 2.6 * k)} ${A.f1(x)} ${A.f1(y - 3 * k)}Q${A.f1(x + w * 0.44)} ${A.f1(y - 2.4 * k)} ${A.f1(x + w / 2)} ${A.f1(y + 1.2 * k)}Q${A.f1(x + w * 0.2)} ${A.f1(y)} ${A.f1(x)} ${A.f1(y + 0.6 * k)}Q${A.f1(x - w * 0.2)} ${A.f1(y + 1.4 * k)} ${A.f1(x - w / 2)} ${A.f1(y + 1.2 * k)}z`)
    + A.P(GART_PAL.snowShade, `M${A.f1(x - w * 0.1)} ${A.f1(y + 0.6 * k)}Q${A.f1(x + w * 0.25)} ${A.f1(y - 0.6 * k)} ${A.f1(x + w / 2)} ${A.f1(y + 1.2 * k)}Q${A.f1(x + w * 0.2)} ${A.f1(y + 0.2 * k)} ${A.f1(x - w * 0.1)} ${A.f1(y + 0.6 * k)}z`, 0.8);
}
function gartFrost(A, d, w) { return A.S(GART_PAL.frost, w || 1.2, d, 0.75); }
/** A few fallen leaves at the foot (autumn), in the given colours. */
function gartFallen(A, r, w, cols, n) {
  let s = '';
  n = n || 3;
  for (let i = 0; i < n; i++) { const x = (r() - 0.5) * w * 2, a = (r() - 0.5) * 2.6 + (x > 0 ? 1.4 : -1.4); s += A.P(cols[i % cols.length], A.leaf(x, -0.6 + r() * 1.2, a, 3.6 + r() * 1.6, 1.3)); }
  return s;
}
/** Dew sparkles (spring): tiny white glints at the given points. */
function gartDew(A, pts) { let d = ''; for (const p of pts) d += A.circ(p[0], p[1], 0.7); return A.P('#ffffff', d, 0.85); }
/** A small four-point sparkle (blooming plants on a streak). */
function gartSpark(A, x, y, s, cls) { return `<path class="${cls || 'gda-blink'}" fill="#fff6c8" d="M${A.f1(x)} ${A.f1(y - s)}l${A.f1(s * 0.28)} ${A.f1(s * 0.72)} ${A.f1(s * 0.72)} ${A.f1(s * 0.28)} ${A.f1(-s * 0.72)} ${A.f1(s * 0.28)} ${A.f1(-s * 0.28)} ${A.f1(s * 0.72)} ${A.f1(-s * 0.28)} ${A.f1(-s * 0.72)} ${A.f1(-s * 0.72)} ${A.f1(-s * 0.28)} ${A.f1(s * 0.72)} ${A.f1(-s * 0.28)}z"/>`; }
/** Wrap a plant's moving part: a sway about its foot (CSS .gart-sway; timing from the seed). */
function gartSway(o, r, inner) {
  if (!o.anim || !inner) return inner;
  return `<g class="gda-sway" style="${GART.T(r, 0, 5)}">${inner}</g>`;
}
/** Flower heads are not animated on their own (a garden draws a plant up to 250 times): the plant sways. */
function gartNod(o, r, inner) { return inner; }
/** A soft halo behind glowing things at dusk and night (the engine's gda-glow pulses it). */
function gartHalo(o, r, x, y, R, col) {
  const A = GART;
  if (!(o.night || o.dusk) || o.silhouette) return '';
  const c = col || GART_PAL.glow;
  return `<g class="gda-glow" style="${A.T(r, 0, 3)}">${A.P(c, A.circ(x, y, R), o.night ? 0.22 : 0.12) + A.P(c, A.circ(x, y, R * 0.6), o.night ? 0.3 : 0.16)}</g>`;
}

/* ---------- flower heads ---------- */
/**
 * A daisy-type head at (x, y): n petals of length L round a disc of radius rc, squashed to tilt (1 face on, 0.4 seen
 * from the side), rotated rot. cols {back, front, disc, discDark}. Returns markup (back petals, front petals, disc).
 */
function gartDaisyHead(A, x, y, o) {
  const n = o.n || 12, L = o.L || 6, W = o.W || 1.3, rc = o.rc || 1.8, tilt = o.tilt == null ? 0.75 : o.tilt, rot = o.rot || 0;
  let back = '', front = '', ins = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (o.twist || 0);
    // the petal tip on a tilted disc: x = cos, y = sin * tilt
    const ex = Math.cos(a) * L, ey = Math.sin(a) * L * tilt, ang = Math.atan2(ex, -ey), len = Math.hypot(ex, ey);
    const bx = x + Math.cos(a) * rc * 0.6, by = y + Math.sin(a) * rc * 0.6 * tilt;
    const d = o.shape === 'pointed' ? A.leaf(bx, by, ang, len, W * (0.6 + 0.4 * len / L), 0.5) : A.petal(bx, by, ang, len * 0.92, W * (0.55 + 0.45 * len / L));
    if (Math.sin(a) < -0.15) back += d; else front += d;
    if (o.inner && i % 2 === 0) ins += A.petal(bx, by, ang, len * 0.55, W * 0.6);
  }
  const rotT = rot ? ` transform="rotate(${A.f1(rot / A.D)} ${A.f1(x)} ${A.f1(y)})"` : '';
  let s = A.P(o.back, back) + A.P(o.front, front);
  if (ins) s += A.P(o.inner, ins, 0.9);
  if (o.cone) s += A.P(o.disc, `M${A.f1(x - rc)} ${A.f1(y)}Q${A.f1(x - rc)} ${A.f1(y - rc * 1.9)} ${A.f1(x)} ${A.f1(y - rc * 2)}Q${A.f1(x + rc)} ${A.f1(y - rc * 1.9)} ${A.f1(x + rc)} ${A.f1(y)}z`) + A.P(o.discDark, A.ell(x + rc * 0.3, y - rc * 0.9, rc * 0.5, rc * 0.9), 0.5);
  else s += A.P(o.disc, A.ell(x, y, rc, rc * Math.max(0.55, tilt))) + (o.discDark ? A.P(o.discDark, A.ell(x + rc * 0.25, y + rc * 0.15 * tilt, rc * 0.6, rc * 0.55 * Math.max(0.55, tilt)), 0.55) : '');
  return rotT ? `<g${rotT}>${s}</g>` : s;
}
/** A cup (tulip-like) head at (x, y), w wide, h tall, cols [deep, base, light]; open 0 (closed bud) .. 1 (wide open). */
function gartCupHead(A, x, y, w, h, cols, open) {
  open = open == null ? 0.4 : open;
  const hw = w / 2, sp = hw * (1 + open * 0.5);
  const back = `M${A.f1(x - hw * 0.3)} ${A.f1(y)}Q${A.f1(x - hw * 0.2)} ${A.f1(y - h * 1.02)} ${A.f1(x + hw * 0.3)} ${A.f1(y - h * 0.98)}Q${A.f1(x + hw * 0.5)} ${A.f1(y - h * 0.5)} ${A.f1(x + hw * 0.3)} ${A.f1(y)}z`;
  const left = `M${A.f1(x)} ${A.f1(y + h * 0.04)}Q${A.f1(x - hw * 1.1)} ${A.f1(y - h * 0.15)} ${A.f1(x - sp)} ${A.f1(y - h * 0.92)}Q${A.f1(x - hw * 0.2)} ${A.f1(y - h * 0.82)} ${A.f1(x + hw * 0.15)} ${A.f1(y - h * 0.3)}z`;
  const right = `M${A.f1(x)} ${A.f1(y + h * 0.04)}Q${A.f1(x + hw * 1.1)} ${A.f1(y - h * 0.15)} ${A.f1(x + sp)} ${A.f1(y - h * 0.92)}Q${A.f1(x + hw * 0.2)} ${A.f1(y - h * 0.82)} ${A.f1(x - hw * 0.15)} ${A.f1(y - h * 0.3)}z`;
  const mid = `M${A.f1(x - hw * 0.62)} ${A.f1(y - h * 0.1)}Q${A.f1(x - hw * 0.7)} ${A.f1(y - h * 0.8)} ${A.f1(x)} ${A.f1(y - h * (1.04 - open * 0.1))}Q${A.f1(x + hw * 0.7)} ${A.f1(y - h * 0.8)} ${A.f1(x + hw * 0.62)} ${A.f1(y - h * 0.1)}Q${A.f1(x)} ${A.f1(y + h * 0.12)} ${A.f1(x - hw * 0.62)} ${A.f1(y - h * 0.1)}z`;
  const glint = `M${A.f1(x - hw * 0.42)} ${A.f1(y - h * 0.2)}Q${A.f1(x - hw * 0.5)} ${A.f1(y - h * 0.7)} ${A.f1(x - hw * 0.1)} ${A.f1(y - h * 0.86)}Q${A.f1(x - hw * 0.28)} ${A.f1(y - h * 0.5)} ${A.f1(x - hw * 0.2)} ${A.f1(y - h * 0.16)}z`;
  return A.P(cols[0], back) + A.P(cols[0], right, 0.9) + A.P(cols[1], left) + A.P(cols[1], mid) + A.P(cols[2], glint, 0.75);
}
/** A rose: a swirl of petals at (x, y), radius R, cols [deep, base, light]; o.open 0 bud .. 1 full. */
function gartRoseHead(A, x, y, R, cols, open) {
  open = open == null ? 1 : open;
  if (open < 0.35) return A.P(cols[1], `M${A.f1(x - R * 0.5)} ${A.f1(y)}Q${A.f1(x - R * 0.55)} ${A.f1(y - R * 1.3)} ${A.f1(x)} ${A.f1(y - R * 1.5)}Q${A.f1(x + R * 0.55)} ${A.f1(y - R * 1.3)} ${A.f1(x + R * 0.5)} ${A.f1(y)}z`) + A.P(cols[2], `M${A.f1(x - R * 0.3)} ${A.f1(y - R * 0.2)}Q${A.f1(x - R * 0.35)} ${A.f1(y - R)} ${A.f1(x)} ${A.f1(y - R * 1.4)}Q${A.f1(x - R * 0.1)} ${A.f1(y - R * 0.8)} ${A.f1(x - R * 0.3)} ${A.f1(y - R * 0.2)}z`, 0.7)
    + A.P(GART_PAL.leaf.summer[1], `M${A.f1(x - R * 0.6)} ${A.f1(y + R * 0.1)}l${A.f1(R * 0.3)} ${A.f1(-R * 0.7)} ${A.f1(R * 0.3)} ${A.f1(R * 0.5)} ${A.f1(R * 0.3)} ${A.f1(-R * 0.5)} ${A.f1(R * 0.3)} ${A.f1(R * 0.7)}z`);
  const outer = A.ell(x, y, R, R * 0.86);
  // the outer petals' scalloped rim
  let rim = '';
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.4; rim += A.circ(x + Math.cos(a) * R * 0.72, y + Math.sin(a) * R * 0.62, R * 0.42); }
  // the swirl: three nested arcs, the rose's signature
  const sw = `M${A.f1(x - R * 0.55)} ${A.f1(y + R * 0.05)}Q${A.f1(x - R * 0.5)} ${A.f1(y - R * 0.62)} ${A.f1(x + R * 0.12)} ${A.f1(y - R * 0.5)}Q${A.f1(x + R * 0.58)} ${A.f1(y - R * 0.3)} ${A.f1(x + R * 0.3)} ${A.f1(y + R * 0.2)}`
    + `M${A.f1(x - R * 0.28)} ${A.f1(y + R * 0.1)}Q${A.f1(x - R * 0.3)} ${A.f1(y - R * 0.3)} ${A.f1(x + R * 0.08)} ${A.f1(y - R * 0.25)}Q${A.f1(x + R * 0.3)} ${A.f1(y - R * 0.1)} ${A.f1(x + R * 0.05)} ${A.f1(y + R * 0.12)}`;
  return A.P(cols[0], rim) + A.P(cols[1], outer) + A.P(cols[2], A.ell(x - R * 0.3, y - R * 0.28, R * 0.42, R * 0.32), 0.55) + A.S(cols[0], Math.max(0.6, R * 0.13), sw, 0.8);
}
/** Hanging bells along an arching stem: count n from (x, y); returns {stem, bells, inner}. */
function gartBellRow(A, x, y, a, L, bend, n, size) {
  const s = A.stem(x, y, a, L, bend);
  let bells = '', inner = '', ped = '';
  for (let i = 0; i < n; i++) {
    const t = 0.45 + (i / Math.max(1, n - 1)) * 0.5, p = s.pt(t), g = s.ang(t), side = bend > 0 ? 1 : -1, sz = size * (1 - i * 0.06);
    const bx = p[0] + Math.cos(g) * side * 2.4, by = p[1] + Math.sin(g) * side * 2.4 + 2.2;
    ped += `M${A.f1(p[0])} ${A.f1(p[1])}Q${A.f1(bx)} ${A.f1(by - 2.4)} ${A.f1(bx)} ${A.f1(by - 1.4)}`;
    bells += `M${A.f1(bx - sz * 0.55)} ${A.f1(by + sz * 0.9)}Q${A.f1(bx - sz * 0.6)} ${A.f1(by - sz * 0.3)} ${A.f1(bx)} ${A.f1(by - sz * 0.4)}Q${A.f1(bx + sz * 0.6)} ${A.f1(by - sz * 0.3)} ${A.f1(bx + sz * 0.55)} ${A.f1(by + sz * 0.9)}l${A.f1(-sz * 0.25)} ${A.f1(-sz * 0.25)}l${A.f1(-sz * 0.3)} ${A.f1(sz * 0.3)}l${A.f1(-sz * 0.3)} ${A.f1(-sz * 0.3)}z`;
    inner += A.ell(bx - sz * 0.18, by + sz * 0.15, sz * 0.18, sz * 0.5);
  }
  return { stem: s.d + ped, bells, inner, tip: s.tip };
}
