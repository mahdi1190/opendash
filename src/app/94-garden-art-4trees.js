/* ============================================================
   GARDEN ART, trees (2.18, agent 'garden-art'): the forms fruit-tree (apple),
   fruit-tree-tall (pear), oak (the old heart oak), birch, blossom-tree
   (magnolia), lace-tree (Japanese maple), weeping (willow), olive, conifer
   (fir), potted-tree (lemon), cone-tree (holly), round-tree (maple), bush-tree
   (hazel), fig, bonsai; and the cherry, sakura and plum. PURE. Each tree has its own trunk, limbs and crown layout (not a
   recoloured lollipop): the crown is clumps with gaps where the limbs show,
   lit from the left, and it breathes (CSS .gart-crown) while the trunk stays.
   Stages: 0 the seed (acorn, pip, cone), 1 a seedling, 2 a staked sapling,
   3 a young tree, 4 the grown tree in blossom (spring) or fruit (summer,
   autumn). Winter: deciduous trees go bare with snow along the limbs;
   evergreens keep their crowns under caps of snow.
   Anchor: the foot of the trunk at (0, 0).
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;

  /**
   * A crown (2.23): one puffy silhouette in the deep tone, then soft rounded volumes in the base tone, each with a lit cap at its upper left.
   * Clumps [{x, y, rx, ry, front}] in a palette [deep, base, light, glint]; returns {back, front} markup.
   */
  function crown(r, clumps, pal, o) {
    o = o || {};
    let bk = '', fb = '', fl = '', tex = '';
    const puff = (x, y, rx, ry, k) => gartScallop(x, y, rx, Math.max(6, Math.round(5 + rx / 3.4)), k || 1.17, ry / rx);
    for (const c of clumps) {
      bk += puff(c.x + c.rx * 0.05, c.y + c.ry * 0.07, c.rx, c.ry);
      if (!c.front) continue;
      fb += puff(c.x - c.rx * 0.05, c.y - c.ry * 0.07, c.rx * 0.84, c.ry * 0.8, 1.2);
      fl += puff(c.x - c.rx * 0.26, c.y - c.ry * 0.32, c.rx * 0.44, c.ry * 0.36, 1.24);
      // a little leaf-mark or two: the crown's only texture
      if (o.tex !== false && c.rx > 7) { const a = rr(r, Math.PI * 1.05, Math.PI * 1.5), q = rr(r, 0.5, 0.74); tex += `M${f1(c.x + Math.cos(a) * c.rx * q - 2.6)} ${f1(c.y + Math.sin(a) * c.ry * q)}q2.6-2.8 5.2 0`; }
    }
    return {
      back: A.P(pal[0], bk),
      front: A.P(pal[1], fb) + A.P(pal[2], fl, 0.88) + (tex ? A.S(pal[3], 1.1, tex, 0.7) : ''),
    };
  }
  /** Limbs from a trunk: list of [x, y, a, len, w0, w1, bend]; bark [deep, base, light]; returns markup and the tips. */
  function limbs(list, bark) {
    let d = '', lit = '', dark = '';
    const tips = [];
    for (const L of list) {
      const b = A.limb(L[0], L[1], L[2], L[3], L[4] * 1.34, L[5] * 1.3, L[6] || 0);
      d += b.d; tips.push(b.tip);
      // the lit left edge of each limb
      const p0 = b.pt(0.05), p1 = b.pt(0.85), g = b.ang(0.4), off = -L[4] * 0.34;
      lit += `M${f1(p0[0] + Math.cos(g) * off)} ${f1(p0[1] + Math.sin(g) * off)}L${f1(p1[0] + Math.cos(g) * off * 0.5)} ${f1(p1[1] + Math.sin(g) * off * 0.5)}`;
      if (L[4] > 3.4) dark += `M${f1(p0[0] - Math.cos(g) * off)} ${f1(p0[1] - Math.sin(g) * off)}L${f1(p1[0] - Math.cos(g) * off * 0.5)} ${f1(p1[1] - Math.sin(g) * off * 0.5)}`;
    }
    return { m: A.P(bark[1], d) + (dark ? A.S(bark[0], 1.5, dark, 0.45) : '') + A.S(bark[2], 1.2, lit, 0.7), tips };
  }
  /** Snow lying along the upper side of limbs (winter). */
  function limbSnow(list) {
    let d = '';
    for (const L of list) { const s = A.stem(L[0], L[1], L[2], L[3] * 0.9, L[6] || 0), w = L[4] * 0.5; if (Math.abs(L[2]) < 0.15) continue; const p0 = s.pt(0.25), p1 = s.pt(0.9); d += `M${f1(p0[0])} ${f1(p0[1] - w)}Q${f1((p0[0] + p1[0]) / 2)} ${f1((p0[1] + p1[1]) / 2 - w - 0.6)} ${f1(p1[0])} ${f1(p1[1] - w * 0.6)}`; }
    return A.S(PAL.snow, 1.8, d, 0.95);
  }
  /** Dots spread over clumps (blossom, fruit): returns a path of shapes made by mk(x, y). */
  function overClumps(r, clumps, n, mk, onlyFront) {
    let d = '';
    const cs = clumps.filter(c => !onlyFront || c.front);
    for (let i = 0; i < n; i++) { const c = cs[i % cs.length], a = r() * Math.PI * 2, q = Math.sqrt(r()) * 0.82; d += mk(c.x + Math.cos(a) * c.rx * q, c.y + Math.sin(a) * c.ry * q, i); }
    return d;
  }
  /** Blossom you can see from across the garden: little five-lobed flowers, a soft centre in each. */
  const flowers = (r, cl, n, col, eye, R) => { let d = '', e = ''; const list = cl.filter(c => c.front); for (let i = 0; i < n; i++) { const c = list[i % list.length], a = r() * Math.PI * 2, q = Math.sqrt(r()) * 0.74, x = c.x + Math.cos(a) * c.rx * q, y = c.y + Math.sin(a) * c.ry * q; d += gartScallop(x, y, R || 2.6, 5, 1.6); e += A.circ(x, y, (R || 2.6) * 0.34); } return A.P(col, d) + A.P(eye, e, 0.9); };
  /** Fruit: round, glossy and big enough to want to pick. */
  const fruits = (r, cl, n, R, T) => { let d = '', g = '', sh = ''; const list = cl.filter(c => c.front); for (let i = 0; i < n; i++) { const c = list[i % list.length], a = r() * Math.PI * 2, q = Math.sqrt(r()) * 0.7, x = c.x + Math.cos(a) * c.rx * q, y = c.y + Math.sin(a) * c.ry * q; d += A.circ(x, y, R); sh += A.ell(x + R * 0.3, y + R * 0.32, R * 0.56, R * 0.5); g += A.ell(x - R * 0.34, y - R * 0.36, R * 0.26, R * 0.2); } return A.P(T[1], d) + A.P(T[0], sh, 0.45) + A.P('#fffdf0', g, 0.85); };
  const stake = (h) => A.S('#b08a5a', 1.6, `M3.4 0.4L3.8 ${-h}`) + A.S('#5a8a4a', 1.1, `M0.6 ${f1(-h * 0.62)}l3.4 0.6`);

  /** The common tree builder. spec(o, r) returns {box, bark, trunk: [limb...], limbs: [limb...], clumps, pal, ...}. */
  function treeDraw(o, r, spec) {
    const s = o.s5, win = o.season === 'winter';
    if (s === 0) return gartSeed(o, A, spec.seed || 'acorn', spec.tag || '#6a9a4a');
    const pal = spec.palette(o);
    if (s === 1) {
      // a seedling: a twig with its first leaves (evergreens: a tiny tuft)
      const L = gartFoliage(pal);
      const st = A.stem(0, 0, 0.04, 13, 1);
      if (spec.needles) { let n = ''; for (let i = 0; i < 9; i++) { const p = st.pt(0.4 + i * 0.06); n += `M${f1(p[0])} ${f1(p[1])}l${i % 2 ? 4 - i * 0.3 : -4 + i * 0.3} ${f1(1.6)}`; } return A.shadow(7, 2) + A.S('#7a5a3a', 1.4, st.d) + A.S(pal[1], 1, n) + (win ? gartSnowCap(A, st.tip[0], st.tip[1] + 1, 6, 0.6) : ''); }
      if (!win) L.leaf(st.tip[0], st.tip[1], -0.8, 6, 2.4, { vein: true }).leaf(st.tip[0], st.tip[1], 0.7, 6.4, 2.6, { vein: true }).leaf(st.pt(0.6)[0], st.pt(0.6)[1], -1.2, 4.4, 1.8);
      return A.shadow(7, 2) + A.P(PAL.soil[1], 'M-6 0.6q6-3 12 0z') + gartSway(o, r, A.S('#7a5a3a', 1.4, st.d) + L.out(), 'stiff') + (win ? A.P(PAL.snow, 'M-7 0.4q7-3 14 0z', 0.9) : '');
    }
    const T = spec.build(o, r, pal);
    for (const c of T.clumps || []) { c.rx *= 1.12; c.ry *= 1.12; }
    const k = s === 2 ? 0.42 : s === 3 ? 0.72 : 1;
    const bare = win && !spec.evergreen;
    let back = '', front = '', extra = '', fx = '', out = A.shadow(T.shadow || 26, (T.shadow || 26) * 0.2);
    const tr = limbs(T.trunk.concat(T.limbs || []), spec.bark || PAL.bark);
    if (bare) {
      // bare: the limbs, then twigs forking from every tip, then snow along the limbs
      const all = T.trunk.concat(T.limbs || []), starts = tr.tips.map((p, i) => [p[0], p[1], all[i][2] * 0.8, T.twig || 9]);
      fx = A.S(spec.twig || (spec.bark || PAL.bark)[1], 0.9, A.twigs(r, starts, s === 2 ? 2 : 3, 0.5), 0.85) + limbSnow(all);
      if (T.berries) fx += T.berries;
    } else {
      const cr = crown(r, T.clumps, pal, spec.crownOpts);
      back = cr.back; front = cr.front;
      if (win) front += T.clumps.filter(c => c.front && c.y < (T.top || -60) * 0.5).map(c => gartSnowCap(A, c.x, c.y - c.ry * 0.78, c.rx * 1.3, 1.1)).join('');
    }
    if (s === 4 && !bare && T.bloom) extra += T.bloom;
    if (s >= 3 && T.always) extra += T.always;
    if (o.season === 'autumn' && !spec.evergreen) out += gartFallen(A, r, (T.shadow || 26) * 0.8, [pal[1], pal[2], pal[0]], 4);
    const t0 = T.trunk[0], fw = t0[4] * 0.95, bk0 = spec.bark || PAL.bark;
    const flare = T.trunk.length > 2 ? '' : A.P(bk0[1], `M${f1(t0[0] - fw * 1.3)} 0.8Q${f1(t0[0] - fw * 0.66)} -1.6 ${f1(t0[0] - fw * 0.5)} -9H${f1(t0[0] + fw * 0.5)}Q${f1(t0[0] + fw * 0.66)} -1.6 ${f1(t0[0] + fw * 1.3)} 0.8Q${f1(t0[0])} 2.4 ${f1(t0[0] - fw * 1.3)} 0.8z`);
    const body = back + flare + tr.m + fx + (o.anim && !bare ? `<g class="gart-crown" style="${A.T(r, 6, 9)}">${front + extra}</g>` : front + extra);
    const scaled = k === 1 ? body : `<g transform="scale(${k})">${body}</g>`;
    return out + (T.ground || '') + scaled + (s === 2 ? stake(26) : '');
  }
  const autumn = (o, cols) => o.season === 'autumn' ? cols : null;

  /* ---------- apple: a short trunk forking into a wide, low dome ---------- */
  gartDefine('form:fruit-tree', {
    box: [80, 92],
    draw(o, r) {
      return treeDraw(o, r, {
        seed: 'pip', tag: '#d83a2a',
        palette: o2 => autumn(o2, ['#6a4a1a', '#a8862a', '#d8a83a', '#f2d070']) || gartSeasonLeaf(o2, 'deciduous'),
        build(o2, r2, pal) {
          const lean = rr(r2, -0.06, 0.06);
          const trunk = [[0, 0, lean, 30, 8, 5.4, rr(r2, -2, 2)]], top = A.at(0, 0, lean, 29);
          const lim = [[top[0], top[1], -0.75 + rr(r2, -0.1, 0.1), 22, 4.6, 1.6, -2], [top[0], top[1], 0.7 + rr(r2, -0.1, 0.1), 22, 4.6, 1.6, 2], [top[0], top[1], 0.05, 18, 3.6, 1.4, 1]];
          const cl = [
            { x: -2, y: -66, rx: 26, ry: 16 }, { x: -22, y: -52, rx: 14, ry: 12, front: 1 }, { x: 22, y: -52, rx: 15, ry: 12, front: 1 },
            { x: -10, y: -68, rx: 15, ry: 12, front: 1 }, { x: 12, y: -70, rx: 15, ry: 12, front: 1 }, { x: 0, y: -55, rx: 12, ry: 9, front: 1 },
          ].map(c => Object.assign(c, { x: c.x + rr(r2, -2, 2), y: c.y + rr(r2, -2, 2) }));
          let bloom = '';
          if (o2.season === 'spring') bloom = flowers(r2, cl, 14, gartC2(o2, '#f6d8e2'), '#e888a8');
          else {
            bloom = fruits(r2, cl, 8, 4, o2.col || ['#a82a24', '#c02a1e', '#ec5a3a']);
          }
          const fc = o2.col || ['#a82a24', '#c02a1e', '#ec5a3a'], ground = o2.season === 'autumn' && o2.s5 === 4 ? A.P(fc[1], A.circ(-14, -2, 2.6) + A.circ(10, -1.6, 2.4)) + A.P(fc[2], A.circ(-14.6, -2.6, 1.1), 0.8) : '';
          return { trunk, limbs: lim, clumps: cl, bloom, shadow: 30, ground, top: -80, twig: 9 };
        },
      });
    },
  });

  /* ---------- cherry: a vase of limbs, a wide flat umbrella of blossom ---------- */
  const cherryDraw = {
    box: [100, 92],
    draw(o, r) {
      const sakura = o.id === 'sakura', bc = sakura ? (o.main || '#f7b6cc') : gartC2(o, '#f8c6d6');
      const pink = [A.shift(bc, 6, 1.1, -0.2), bc, A.lt(bc, 0.45), '#ffffff'];
      const bloomy = o.season === 'spring' || (sakura && o.season === 'summer');
      return treeDraw(o, r, {
        seed: 'pip', tag: '#f0a8c8', bark: ['#3a2a2a', '#5a3a36', '#7a5a52'],
        palette: o2 => bloomy ? pink : autumn(o2, ['#7a2a14', '#c0441c', '#e8782a', '#f6b45a']) || gartSeasonLeaf(o2, 'deciduous'),
        build(o2, r2, pal) {
          const trunk = [[0, 0, rr(r2, -0.05, 0.05), 24, 7, 5, 1]], top = A.at(0, 0, 0, 23);
          const lim = [[top[0], top[1], -1.0, 30, 4.4, 1.4, -4], [top[0], top[1], 0.95, 32, 4.4, 1.4, 4], [top[0], top[1], -0.35, 26, 3.6, 1.2, -2], [top[0], top[1], 0.4, 24, 3.4, 1.2, 2]];
          const cl = [
            { x: 0, y: -58, rx: 40, ry: 13 }, { x: -32, y: -50, rx: 15, ry: 10, front: 1 }, { x: 32, y: -52, rx: 16, ry: 10, front: 1 },
            { x: -14, y: -60, rx: 17, ry: 11, front: 1 }, { x: 14, y: -62, rx: 18, ry: 11, front: 1 }, { x: 0, y: -52, rx: 12, ry: 8, front: 1 },
          ].map(c => Object.assign(c, { x: c.x + rr(r2, -2, 2), y: c.y + rr(r2, -1.5, 1.5) }));
          let bloom = '', ground = '';
          if (bloomy) {
            bloom = flowers(r2, cl, 16, '#fff4f6', pink[0], 2.5);
            ground = A.P(pink[1], A.ell(-20, -0.5, 1.4, 0.7) + A.ell(8, -0.3, 1.3, 0.6) + A.ell(26, -0.6, 1.2, 0.6) + A.ell(-6, -0.2, 1.2, 0.6));
          } else if (o2.season === 'summer') bloom = fruits(r2, cl, 10, 2.8, o2.col || ['#6a0e16', '#a8141e', '#e2404a']);
          // the bark's lenticels: short dark bands across the trunk
          const always = A.S('#2a1a1a', 0.7, 'M-2.4-6h3.6M-2-12h4M-2.2-18h3.8', 0.6);
          return { trunk, limbs: lim, clumps: cl, bloom, shadow: 38, ground, always, top: -70, twig: 10 };
        },
      });
    },
  };
  gartDefine('plant:cherry', cherryDraw);
  gartDefine('plant:sakura', cherryDraw);

  /* ---------- oak: a thick gnarled trunk, great spreading limbs, a towering cumulus crown ---------- */
  gartDefine('form:oak', {
    box: [108, 116],
    draw(o, r) {
      // the old oak grows with everything you ever finished: variant 0..6 is its size (the 2.16 tree)
      if (o.id === 'heart-oak') return heartOak(o, r);
      return treeDraw(o, r, {
        seed: 'acorn', tag: '#7a5a2a',
        palette: o2 => autumn(o2, ['#5a3414', '#94561e', '#c08032', '#e0b060']) || (o2.season === 'summer' ? ['#24401f', '#38602c', '#5a8a3c', '#8cb458'] : gartSeasonLeaf(o2, 'deciduous')),
        build(o2, r2) {
          const trunk = [[0, 0, rr(r2, -0.04, 0.04), 40, 13, 8, rr(r2, -2, 2)]], top = A.at(0, 0, 0, 38);
          const lim = [[top[0] - 2, top[1] + 6, -1.05, 34, 6, 1.8, -4], [top[0] + 2, top[1] + 4, 1.0, 36, 6, 1.8, 4], [top[0], top[1], -0.4, 30, 5, 1.6, -3], [top[0], top[1], 0.35, 32, 5, 1.6, 3], [top[0], top[1], 0, 26, 4, 1.4, 1]];
          const cl = [
            { x: 0, y: -84, rx: 42, ry: 26, n: 11 }, { x: -36, y: -66, rx: 16, ry: 13, front: 1 }, { x: 36, y: -68, rx: 17, ry: 13, front: 1 },
            { x: -20, y: -88, rx: 19, ry: 15, front: 1 }, { x: 18, y: -92, rx: 20, ry: 15, front: 1 }, { x: -2, y: -102, rx: 16, ry: 11, front: 1 },
            { x: 0, y: -70, rx: 15, ry: 11, front: 1 }, { x: -42, y: -78, rx: 10, ry: 9, front: 1 }, { x: 42, y: -82, rx: 10, ry: 9, front: 1 },
          ].map(c => Object.assign(c, { x: c.x + rr(r2, -2.5, 2.5), y: c.y + rr(r2, -2, 2) }));
          let bloom = '';
          if (o2.season === 'autumn' || o2.season === 'summer') bloom = fruits(r2, cl, 8, 2.6, ['#6a4a1e', '#a8843a', '#d8b860']);
          // a knot hole in the trunk, and roots flaring at the foot
          const always = A.P('#3a2618', A.ell(2.4, -18, 1.6, 2.4)) + A.P('#6a4a32', 'M-10 0q4-5 5-10l2 10zM10 0q-4-5-5-10l-2 10z');
          return { trunk, limbs: lim, clumps: cl, bloom, shadow: 44, always, top: -110, twig: 12 };
        },
      });
    },
  });

  /* ---------- birch: slender white stems with dark marks, an airy crown of small clumps ---------- */
  gartDefine('form:birch', {
    box: [62, 118],
    draw(o, r) {
      return treeDraw(o, r, {
        seed: 'cone', tag: '#e8c43a', bark: ['#a8a49a', '#ece8de', '#ffffff'], twig: '#5a3a3a',
        palette: o2 => autumn(o2, ['#8a6a14', '#d0a420', '#f0cc40', '#fae890']) || (o2.season === 'spring' ? ['#4a7a2a', '#76a83a', '#a8d05a', '#d4ec90'] : gartSeasonLeaf(o2, 'deciduous')),
        crownOpts: { rag: 0.42 },
        build(o2, r2) {
          const two = o2.variant % 3 !== 2;
          const trunk = [[0, 0, -0.02, 96, 6, 2.4, rr(r2, -2, 2)]];
          if (two) trunk.push([1.6, 0, 0.16, 76, 3.8, 1.4, 2]);
          const lim = [[A.at(0, 0, 0, 52)[0], -52, -0.8, 14, 1.6, 0.6, -2], [A.at(0, 0, 0, 64)[0], -64, 0.75, 13, 1.4, 0.6, 2]];
          const cl = [];
          for (let i = 0; i < 10; i++) { const t = i / 9, y = -42 - t * 64, w = 18 * Math.sin(Math.PI * (0.25 + t * 0.7)); cl.push({ x: (i % 2 ? 1 : -1) * w * rr(r2, 0.4, 0.9) + (two ? 4 : 0), y: y + rr(r2, -3, 3), rx: 7 + rr(r2, 0, 4), ry: 6 + rr(r2, 0, 3), front: i > 0 ? 1 : 0, n: 7 }); }
          cl.unshift({ x: 2, y: -76, rx: 18, ry: 34, n: 10 });
          // the black lenticel marks and diamonds on the white bark
          const always = A.S('#2a2622', 1.1, 'M-2.4-12h3M-1.6-26h2.6M-2.2-38h3.4M-1.4-56h2.2M-1-72h1.8', 0.85) + (two ? A.S('#2a2622', 0.9, 'M4-18h2.6M6-34h2.2M7.4-50h1.8', 0.8) : '') + A.P('#3a3430', 'M-2.6-4l2.6-3 2.6 3z', 0.7);
          // catkins in spring, hanging twig tips in summer
          let bloom = '';
          if (o2.season === 'spring') bloom = A.S('#c8a43a', 1.4, overClumps(r2, cl, 10, (x, y) => `M${f1(x)} ${f1(y)}l0.4 4`, true));
          return { trunk, limbs: lim, clumps: cl, bloom, always, shadow: 22, top: -110, twig: 8 };
        },
      });
    },
  });

  /* ---------- pear: a straight trunk, a tall narrow crown, hanging pears ---------- */
  gartDefine('form:fruit-tree-tall', {
    box: [60, 104],
    draw(o, r) {
      return treeDraw(o, r, {
        seed: 'pip', tag: '#b8c83a',
        palette: o2 => autumn(o2, ['#6a2a14', '#a8441a', '#d8742a', '#f2b04a']) || gartSeasonLeaf(o2, 'deciduous'),
        build(o2, r2) {
          const trunk = [[0, 0, 0, 48, 6.4, 2.4, rr(r2, -1, 1)]];
          const lim = [[0, -30, -0.55, 18, 3, 1, -1], [0, -36, 0.5, 18, 3, 1, 1], [0, -46, -0.3, 14, 2.4, 0.8, 0]];
          const cl = [{ x: 0, y: -66, rx: 20, ry: 32, n: 10 }, { x: -11, y: -50, rx: 11, ry: 10, front: 1 }, { x: 11, y: -54, rx: 12, ry: 11, front: 1 }, { x: -6, y: -72, rx: 11, ry: 11, front: 1 }, { x: 7, y: -80, rx: 11, ry: 11, front: 1 }, { x: 0, y: -94, rx: 8, ry: 8, front: 1 }];
          cl.forEach(c => { c.x += rr(r2, -1.5, 1.5); c.y += rr(r2, -1.5, 1.5); });
          let bloom = '';
          if (o2.season === 'spring') bloom = flowers(r2, cl, 13, gartC2(o2, '#ffffff'), '#c8a0b0');
          else {
            const pc = o2.col ? (o2.season === 'autumn' ? [A.mix(o2.col[1], '#c8862a', 0.4), o2.col[2]] : [o2.col[1], o2.col[2]]) : o2.season === 'autumn' ? ['#b8862a', '#e0b84a'] : ['#8aa82a', '#c8d85a'];
            bloom = A.P(pc[0], overClumps(r2, cl, 7, (x, y) => `M${f1(x)} ${f1(y - 5)}q-2.2 0-1.9 3.8q-2.5 2.5-1 5.4q2.9 1.9 5.8 0q1.5-2.9-1-5.4q0.3-3.8-1.9-3.8z`, true)) + A.P(pc[1], overClumps(A.rng(A.hash('pr' + o2.variant)), cl, 7, (x, y) => A.ell(x - 1.2, y + 1, 1.1, 1.7), true), 0.85);
          }
          return { trunk, limbs: lim, clumps: cl, bloom, shadow: 22, top: -100, twig: 7 };
        },
      });
    },
  });

  /* ---------- plum: a small rounded crown leaning on a crooked trunk, dusky plums ---------- */
  gartDefine('plant:plum', {
    box: [74, 86],
    draw(o, r) {
      return treeDraw(o, r, {
        seed: 'pip', tag: '#6a2a6a', bark: ['#2a2020', '#4a3632', '#6a544c'],
        palette: o2 => autumn(o2, ['#5a2a1a', '#8a4a24', '#b8742e', '#dcac5a']) || (o2.season === 'summer' ? ['#2a3a24', '#3e5a30', '#628a44', '#98b868'] : gartSeasonLeaf(o2, 'deciduous')),
        build(o2, r2) {
          const lean = 0.14 * (o2.variant % 2 ? -1 : 1);
          const trunk = [[0, 0, lean, 26, 6, 4, -3 * Math.sign(lean)]], top = A.at(0, 0, lean, 25);
          const lim = [[top[0], top[1], -0.8, 18, 3.6, 1.2, -2], [top[0], top[1], 0.6, 20, 3.6, 1.2, 2], [top[0], top[1], 0.05, 16, 3, 1, 0]];
          const cx = top[0];
          const cl = [{ x: cx, y: -54, rx: 26, ry: 18 }, { x: cx - 16, y: -46, rx: 12, ry: 10, front: 1 }, { x: cx + 16, y: -48, rx: 12, ry: 10, front: 1 }, { x: cx - 6, y: -60, rx: 13, ry: 10, front: 1 }, { x: cx + 9, y: -62, rx: 12, ry: 9, front: 1 }];
          let bloom = '';
          if (o2.season === 'spring') bloom = flowers(r2, cl, 14, gartC2(o2, '#ffffff'), '#e8b0c0');
          else bloom = fruits(r2, cl, 8, 3.4, o2.col || ['#2a0e2a', '#4a1a4a', '#8a5aa0']);
          return { trunk, limbs: lim, clumps: cl, bloom, shadow: 26, top: -70, twig: 8 };
        },
      });
    },
  });

  /* ---------- magnolia: open grey limbs, great goblet flowers before the leaves ---------- */
  gartDefine('form:blossom-tree', {
    box: [86, 88],
    draw(o, r) {
      const fl = o.main ? [A.shift(o.main, 4, 1.1, -0.12), A.lt(o.main, 0.3), gartC2(o, '#c0507a')] : o.variant % 3 === 1 ? ['#f2eef0', '#ffffff', '#c8a0b8'] : o.variant % 3 === 2 ? ['#7a1a4a', '#b8407a', '#e8a8c8'] : ['#e6b8cc', '#fbe6ee', '#c0507a'];
      return treeDraw(o, r, {
        seed: 'cone', tag: fl[2], bark: ['#5a5a58', '#8a8a86', '#b4b4ae'],
        palette: o2 => autumn(o2, ['#6a4a1a', '#a8742a', '#d8a84a', '#f0d080']) || gartSeasonLeaf(o2, 'deciduous'),
        build(o2, r2) {
          const trunk = [[0, 0, 0, 16, 6, 4.6, 0]];
          const lim = [[0, -15, -0.9, 32, 3.6, 1.2, -5], [0, -15, 0.85, 34, 3.6, 1.2, 5], [0, -15, -0.3, 34, 3, 1, -3], [0, -15, 0.25, 30, 3, 1, 3], [0, -15, 0.02, 24, 2.6, 0.9, 0]];
          const spring = o2.season === 'spring';
          const tips = lim.map(L => A.at(L[0], L[1], L[2], L[3]));
          // spring: no leaf crown at all; the flowers sit on the bare limbs (the magnolia's whole charm)
          const cl = spring ? [] : [{ x: 0, y: -48, rx: 36, ry: 18 }, { x: -24, y: -42, rx: 13, ry: 10, front: 1 }, { x: 26, y: -44, rx: 13, ry: 10, front: 1 }, { x: -10, y: -54, rx: 14, ry: 11, front: 1 }, { x: 12, y: -52, rx: 14, ry: 10, front: 1 }];
          let bloom = '';
          if (spring) {
            const pts = tips.concat(lim.map(L => A.at(L[0], L[1], L[2], L[3] * 0.6)));
            let base = '', lit = '', blush = '';
            pts.forEach((p, i) => { const R = i < tips.length ? 4.6 : 3.4; base += gartCupPath(p[0], p[1], R); lit += A.leaf(p[0] - R * 0.2, p[1], -0.2, R * 1.6, R * 0.32); blush += A.ell(p[0], p[1] - R * 0.15, R * 0.5, R * 0.3); });
            bloom = A.P(fl[0], base) + A.P(fl[1], lit, 0.9) + A.P(fl[2], blush, 0.55);
          }
          return { trunk, limbs: lim, clumps: cl, bloom, shadow: 32, top: -60, twig: 8, always: spring && o2.s5 >= 3 ? A.S('#8a8a86', 0.8, A.twigs(r2, tips.map((p, i) => [p[0], p[1], lim[i][2], 5]), 1, 0.5), 0.8) : '' };
        },
      });
    },
  });
  function gartCupPath(x, y, R) { return `M${f1(x - R * 0.7)} ${f1(y)}Q${f1(x - R)} ${f1(y - R * 1.5)} ${f1(x - R * 0.2)} ${f1(y - R * 1.7)}L${f1(x)} ${f1(y - R * 1.1)}L${f1(x + R * 0.25)} ${f1(y - R * 1.75)}Q${f1(x + R)} ${f1(y - R * 1.5)} ${f1(x + R * 0.7)} ${f1(y)}Q${f1(x)} ${f1(y + R * 0.4)} ${f1(x - R * 0.7)} ${f1(y)}z`; }

  /* ---------- Japanese maple: layered tiers of fine red leaves on a low, twisting trunk ---------- */
  gartDefine('form:lace-tree', {
    box: [86, 70],
    draw(o, r) {
      const red = o.main ? A.leaf4(o.main) : o.variant % 3 === 1 ? ['#3a1a24', '#6a2234', '#94384a', '#c0687a'] : o.variant % 3 === 2 ? ['#3a5a1a', '#5a8a2a', '#8ab846', '#c4e080'] : ['#5a1414', '#8e2018', '#c03a22', '#e8744a'];
      return treeDraw(o, r, {
        seed: 'pip', tag: red[2], bark: ['#3a2a2a', '#5a4040', '#7a6060'],
        palette: o2 => o2.season === 'autumn' ? ['#8a1a10', '#d0301a', '#f0602a', '#fca060'] : o2.season === 'spring' ? red.map(c => A.mix(c, '#d8604a', 0.2)) : red,
        crownOpts: { rag: 0.5 },
        build(o2, r2) {
          const trunk = [[0, 0, 0.12, 14, 5, 3.6, 2]], top = A.at(0, 0, 0.12, 13);
          const lim = [[top[0], top[1], -1.2, 30, 2.8, 1, -4], [top[0], top[1], 1.1, 30, 2.8, 1, 4], [top[0], top[1], -0.2, 24, 2.4, 0.9, -2]];
          // tiers: wide, flat layers like a pagoda of lace
          const cl = [{ x: 0, y: -36, rx: 38, ry: 12, n: 12 }];
          [[-24, -26, 16, 6], [22, -28, 16, 6], [-10, -38, 18, 7], [14, -40, 16, 6], [0, -50, 16, 7], [-28, -36, 10, 5], [30, -38, 10, 5]].forEach(t => cl.push({ x: t[0] + rr(r2, -2, 2), y: t[1] + rr(r2, -1, 1), rx: t[2], ry: t[3], front: 1, n: 10 }));
          // the lace: tiny star-shaped leaves along each tier's top edge
          const always = A.P('#fca060', overClumps(r2, cl, o2.season === 'winter' ? 0 : 18, (x, y) => A.star(x, y - 2, 5, 2, 0.8, r2()), true), 0.55);
          return { trunk, limbs: lim, clumps: cl, always, shadow: 34, top: -56, twig: 7 };
        },
      });
    },
  });

  /* ---------- willow: a dome over a curtain of hanging strands ---------- */
  gartDefine('form:weeping', {
    box: [100, 100],
    draw(o, r) {
      const s = o.s5, win = o.season === 'winter';
      if (s <= 1) return treeDraw(o, r, { seed: 'cutting', tag: '#a8c84a', palette: o2 => o2.season === 'spring' ? ['#5a8a2a', '#8ab83a', '#bcdc6a', '#e4f2a8'] : gartSeasonLeaf(o2, 'deciduous') });
      const pal = o.season === 'autumn' ? ['#8a7a1a', '#c4a42a', '#e8cc4a', '#f6e890'] : o.season === 'spring' ? ['#5a8a2a', '#8ab83a', '#bcdc6a', '#e4f2a8'] : win ? ['#8a6a2a', '#b8943a', '#d8b85a', '#f0dc8a'] : ['#3a6a2a', '#5a8a34', '#86b44a', '#b8d878'];
      const k = s === 2 ? 0.45 : s === 3 ? 0.74 : 1;
      const trunk = A.limb(0, 0, 0.05, 40, 13, 8, 2), lim = [A.limb(1, -38, -0.7, 22, 5, 1.6, -3), A.limb(1, -38, 0.75, 24, 5, 1.6, 3), A.limb(1, -38, 0, 18, 4, 1.4, 0)];
      let strands = ['', '', ''], dome = '';
      if (!win) dome = gartScallop(0, -60, 43, 12, 1.12, 0.46);
      // the curtain: strands falling from the dome's rim almost to the ground
      for (let i = 0; i < 26; i++) {
        const t = i / 25, x0 = -42 + t * 84 + rr(r, -2, 2), y0 = -60 - Math.sin(Math.PI * t) * 14 + rr(r, 0, 4), len = 34 + Math.sin(Math.PI * t) * 20 + rr(r, -4, 6);
        strands[i % 3] += `M${f1(x0)} ${f1(y0)}Q${f1(x0 + (x0 < 0 ? -4 : 4))} ${f1(y0 + len * 0.4)} ${f1(x0 + (x0 < 0 ? -2 : 2) + rr(r, -2, 2))} ${f1(y0 + len)}`;
      }
      const bark = PAL.bark;
      let body = (dome ? A.P(pal[0], dome) : '') + A.P(bark[1], trunk.d + lim.map(l => l.d).join('')) + A.S(bark[2], 1, 'M-3-4L-2-34', 0.5);
      const curtain = A.S(pal[0], win ? 1.4 : 4, strands[0], win ? 0.8 : 1) + A.S(pal[1], win ? 1.4 : 3.6, strands[1]) + A.S(pal[2], win ? 1.2 : 3, strands[2]) + (win ? '' : A.P(pal[1], gartScallop(-4, -66, 34, 11, 1.14, 0.42)) + A.P(pal[2], gartScallop(-14, -71, 17, 7, 1.18, 0.42), 0.85));
      body += o.anim ? `<g class="gart-weep" style="${A.T(r, 5, 8)}">${curtain}</g>` : curtain;
      if (win) body += A.S(PAL.snow, 2, 'M-22-60q20-14 44 0', 0.9);
      let out = A.shadow(42, 8);
      if (o.season === 'autumn') out += gartFallen(A, r, 30, [pal[1], pal[2]], 4);
      return out + (k === 1 ? body : `<g transform="scale(${k})">${body}</g>`) + (s === 2 ? stake(26) : '');
    },
  });

  /* ---------- olive: a twisted silver trunk, an airy grey-green crown, black olives ---------- */
  gartDefine('form:olive', {
    box: [76, 86],
    draw(o, r) {
      return treeDraw(o, r, {
        seed: 'pip', tag: '#5a6a3a', evergreen: true, bark: ['#4a4a40', '#7a7666', '#a8a492'],
        palette: o2 => gartSeasonLeaf(o2, 'silver'),
        crownOpts: { rag: 0.55 },
        build(o2, r2) {
          // the trunk twists: two strands wound round each other, and a hollow
          const trunk = [[-2, 0, -0.18, 30, 6, 3.4, 4], [2, 0, 0.2, 28, 5.4, 3, -4]];
          const lim = [[-5, -27, -0.8, 20, 3, 1, -2], [5, -26, 0.7, 22, 3, 1, 2], [0, -28, 0.1, 18, 2.6, 0.9, 1]];
          const cl = [{ x: 0, y: -56, rx: 30, ry: 18 }, { x: -6, y: -60, rx: 14, ry: 10, front: 1 }, { x: 8, y: -52, rx: 13, ry: 9, front: 1 }];
          for (let i = 0; i < 8; i++) { const a = (i / 7) * Math.PI; cl.push({ x: -Math.cos(a) * 26 + rr(r2, -2, 2), y: -46 - Math.sin(a) * 18 + rr(r2, -2, 2), rx: 8 + rr(r2, 0, 3), ry: 6 + rr(r2, 0, 2), front: 1, n: 8 }); }
          const bloom = o2.season === 'autumn' || o2.season === 'winter' ? fruits(r2, cl, 9, 2, ['#1a1420', '#2a2430', '#5a5468']) : fruits(r2, cl, 9, 2, o2.col || ['#4a5a1e', '#7a8a3a', '#a8b868']);
          const always = A.P('#3a3a30', A.ell(0, -12, 1.4, 3.4), 0.8);
          return { trunk, limbs: lim, clumps: cl, bloom, always, shadow: 28, top: -70, twig: 6 };
        },
      });
    },
  });

  /* ---------- fir: a cone of drooping tiers; snow sits on every tier in winter ---------- */
  gartDefine('form:conifer', {
    box: [62, 112],
    draw(o, r) {
      const s = o.s5, win = o.season === 'winter';
      const pal = gartSeasonLeaf(o, 'evergreen');
      if (s <= 1) return treeDraw(o, r, { seed: 'cone', tag: '#2f5a3a', needles: true, evergreen: true, palette: () => pal });
      const k = s === 2 ? 0.42 : s === 3 ? 0.72 : 1, H = 102, W = 32;
      let tiers = ['', '', ''], snow = '', lit = '';
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), y = -16 - t * (H - 26), w = W * (1 - t * 0.78) + rr(r, -1, 1), h = 20 - t * 6;
        // a tier: a skirt with a scalloped, drooping hem
        let d = `M0 ${f1(y - h)}`;
        const segs = 5;
        for (let j = 0; j <= segs; j++) { const u = j / segs, x = -w + u * w * 2; d += j === 0 ? `L${f1(x)} ${f1(y + 2)}` : `Q${f1(x - w / segs)} ${f1(y + 5)} ${f1(x)} ${f1(y + 2)}`; }
        d += 'z';
        tiers[i % 2 ? 1 : 0] += d;
        lit += `M0 ${f1(y - h)}L${f1(-w * 0.86)} ${f1(y + 1.5)}Q${f1(-w * 0.5)} ${f1(y + 4)} ${f1(-w * 0.2)} ${f1(y + 2)}z`;
        if (win) snow += `M${f1(-w * 0.85)} ${f1(y + 0.6)}Q${f1(-w * 0.4)} ${f1(y - h * 0.4)} 0 ${f1(y - h * 0.98)}Q${f1(w * 0.4)} ${f1(y - h * 0.4)} ${f1(w * 0.85)} ${f1(y + 0.6)}Q${f1(w * 0.4)} ${f1(y - h * 0.22)} 0 ${f1(y - h * 0.62)}Q${f1(-w * 0.4)} ${f1(y - h * 0.22)} ${f1(-w * 0.85)} ${f1(y + 0.6)}z`;
      }
      let body = A.P(PAL.bark[1], A.rrect(-4.4, -18, 8.8, 18.6, 1.6)) + A.P(pal[0], tiers[0]) + A.P(pal[1], tiers[1]) + A.P(pal[2], lit, 0.75) + A.P(PAL.snow, snow, 0.95);
      // cones hanging under the tiers
      if (s === 4 && !win) body += A.P('#8a5a2e', A.ell(-13, -30, 2.2, 3.4) + A.ell(10, -50, 2, 3.2) + A.ell(-7, -64, 1.8, 2.8));
      // winter: a few baubles in the catalogue's colour and a star on top (a fir in the garden is for December)
      if (s === 4 && win) { const bc = o.col || ['#a82a24', '#e2442b', '#f27a62']; body += A.P(bc[1], A.circ(-14, -26, 2.2) + A.circ(12, -38, 2) + A.circ(-6, -54, 1.9) + A.circ(7, -68, 1.7) + A.circ(-3, -80, 1.5)) + A.P(bc[2], A.circ(-14.7, -26.7, 0.8) + A.circ(11.3, -38.7, 0.7) + A.circ(-6.6, -54.6, 0.7), 0.9) + A.P('#f6d040', A.star(0, -H + 1, 5, 4.4, 1.9)); }
      let out = A.shadow(26, 5);
      return out + `<g${k === 1 ? '' : ` transform="scale(${k})"`}>${o.anim ? `<g class="gart-crown" style="${A.T(r, 7, 10)}">${body}</g>` : body}</g>` + (s === 2 ? stake(24) : '');
    },
  });

  /* ---------- pine: a tall bare orange trunk, flat clouds of needles on top ---------- */
  gartDefine('plant:pine', {
    box: [80, 124],
    draw(o, r) {
      return treeDraw(o, r, {
        seed: 'cone', tag: '#c8743a', evergreen: true, needles: true, bark: ['#6a3a1e', '#b8642e', '#e09a5a'],
        palette: o2 => o2.season === 'winter' ? ['#1f3a30', '#2f5240', '#4a6e54', '#7a9a80'] : ['#1f3a2c', '#2f5438', '#4a7448', '#7ea270'],
        crownOpts: { rag: 0.2, tex: false },
        build(o2, r2) {
          const lean = rr(r2, -0.08, 0.08);
          const trunk = [[0, 0, lean, 92, 6.4, 2.4, rr(r2, -4, 4)]], tp = A.at(0, 0, lean, 80);
          const lim = [[tp[0], tp[1] + 16, -1.1, 22, 2.4, 1, -3], [tp[0], tp[1] + 8, 1.0, 24, 2.4, 1, 3], [tp[0], tp[1], -0.6, 16, 2, 0.8, -2]];
          // flat-bottomed clouds, wider than tall, at the ends of the limbs
          const cl = [{ x: tp[0] - 20, y: tp[1] - 2, rx: 14, ry: 6, front: 1 }, { x: tp[0] + 22, y: tp[1] - 10, rx: 15, ry: 6, front: 1 }, { x: tp[0] - 6, y: tp[1] - 20, rx: 18, ry: 7, front: 1 }, { x: tp[0] + 8, y: tp[1] - 30, rx: 14, ry: 6, front: 1 }, { x: tp[0] - 2, y: tp[1] - 14, rx: 26, ry: 10 }];
          return { trunk, limbs: lim, clumps: cl, shadow: 22, top: -120, twig: 6, bloom: A.P('#7a4a24', A.ell(tp[0] - 14, tp[1] + 4, 1.3, 2.2) + A.ell(tp[0] + 18, tp[1] - 4, 1.3, 2.2)), always: A.S('#5a2e14', 0.7, 'M-1.6-10h3M-1.4-30h2.6M-0.6-52h2.4', 0.6) };
        },
      });
    },
  });

  /* ---------- lemon: a little evergreen in a terracotta pot, bright lemons, white blossom ---------- */
  gartDefine('form:potted-tree', {
    box: [46, 66],
    draw(o, r) {
      const s = o.s5, win = o.season === 'winter';
      const pot = A.P('#a8542e', 'M-12-16h24l-3 16h-18z') + A.P('#c86a3e', A.rect(-13.4, -19, 26.8, 4.4)) + A.P('#e08a5a', 'M-10-14h3l-1.6 13h-2z', 0.5) + A.P('#8a3e22', 'M-13.4-14.6h26.8v1h-26.8z', 0.5);
      const fruit = o.col ? [o.col[1], o.col[2]] : o.variant % 3 === 1 ? ['#e8801a', '#f8b04a'] : o.variant % 3 === 2 ? ['#8ab82a', '#c4e05a'] : ['#e8c01a', '#fae46a'];
      if (s === 0) return gartSeed(o, A, 'pip', fruit[0]);
      const pal = gartSeasonLeaf(o, 'evergreen').map(c => A.mix(c, '#4a8a3a', 0.25));
      const k = s === 1 ? 0.4 : s === 2 ? 0.6 : s === 3 ? 0.82 : 1;
      const trunk = A.limb(0, -18, 0.02, 20, 2.6, 1.6, 0.5);
      const cl = [{ x: 0, y: -46, rx: 15, ry: 13 }, { x: -8, y: -42, rx: 8, ry: 7, front: 1 }, { x: 8, y: -44, rx: 8, ry: 7, front: 1 }, { x: -3, y: -52, rx: 9, ry: 7, front: 1 }, { x: 5, y: -54, rx: 7, ry: 6, front: 1 }];
      const cr = crown(r, cl, pal, { tex: true });
      let fx = '';
      if (s === 4) fx = fruits(r, cl, 5, 3.2, o.col || [A.dk(fruit[0], 0.2), fruit[0], fruit[1]]) + (o.season === 'spring' ? flowers(r, cl, 5, gartC2(o, '#ffffff'), '#f2c21e', 2) : '');
      let tree = cr.back + A.P(PAL.bark[1], trunk.d) + (o.anim ? `<g class="gart-crown" style="${A.T(r, 6, 9)}">${cr.front + fx}</g>` : cr.front + fx);
      if (win) tree += gartSnowCap(A, 0, -57, 18, 1);
      // the tree grows in the pot: scale about the pot's rim
      const grown = k === 1 ? tree : `<g transform="translate(0 -18) scale(${k}) translate(0 18)">${tree}</g>`;
      return A.shadow(15, 3) + pot + A.P(PAL.soil[0], A.ell(0, -18.6, 11, 1.6)) + grown;
    },
  });

  /* ---------- holly: a dark glossy cone with prickly edges; red berries in autumn and winter ---------- */
  gartDefine('form:cone-tree', {
    box: [58, 86],
    draw(o, r) {
      const s = o.s5, win = o.season === 'winter';
      const pal = o.look && o.look.leaf ? gartLeafSeason(o.look.leaf, 'summer', 'evergreen').map((c, i) => i === 0 ? A.dk(c, 0.2) : c) : ['#14301f', '#1f4a2c', '#2f6a3c', '#6aa070'];
      if (s <= 1) return treeDraw(o, r, { seed: 'pip', tag: '#c8201a', evergreen: true, palette: () => pal });
      const k = s === 2 ? 0.45 : s === 3 ? 0.75 : 1, H = 80, W = 24;
      // the silhouette: a cone whose edge is a run of prickly points
      let edge = 'M0 -' + H;
      const n = 14;
      for (let i = 1; i <= n; i++) { const t = i / n, y = -H + t * (H - 10), w = W * Math.pow(t, 0.75); edge += `L${f1(w + (i % 2 ? 3 : 0))} ${f1(y)}`; }
      edge += 'L6 -8L-6 -8';
      for (let i = n; i >= 1; i--) { const t = i / n, y = -H + t * (H - 10), w = W * Math.pow(t, 0.75); edge += `L${f1(-w - (i % 2 ? 3 : 0))} ${f1(y)}`; }
      edge += 'z';
      let glossy = '';
      for (let i = 0; i < 16; i++) { const t = rr(r, 0.15, 0.95), y = -H + t * (H - 10), x = rr(r, -1, 0.5) * W * Math.pow(t, 0.75) * 0.8; glossy += A.leaf(x, y, rr(r, -2, 2), 5, 1.8); }
      let body = A.P(PAL.bark[1], A.rect(-2.6, -10, 5.2, 10)) + A.P(pal[0], edge) + A.P(pal[1], A.blob(r, -3, -H * 0.42, W * 0.7, H * 0.36, 9, 0.3)) + A.P(pal[2], glossy, 0.9);
      if (s === 4 && (o.season === 'autumn' || win || o.variant % 2)) { let b = ''; for (let i = 0; i < 14; i++) { const t = rr(r, 0.2, 0.92), y = -H + t * (H - 10), x = rr(r, -0.8, 0.8) * W * Math.pow(t, 0.75) * 0.85; b += A.circ(x, y, 2.2) + A.circ(x + 3, y + 0.8, 2); } body += A.P(o.col ? o.col[1] : '#c8201a', b) + A.P(o.col ? o.col[2] : '#ff6a4a', b.replace(/a([\d.]+) ([\d.]+)/g, (m, a2, b2) => `a${f1(a2 * 0.4)} ${f1(b2 * 0.4)}`), 0.6); }
      if (win) body += gartSnowCap(A, 0, -H + 4, 10, 1) + A.P(PAL.snow, `M${-W * 0.6} -30q${W * 0.3} -6 ${W * 0.6} -2q${W * 0.3} -4 ${W * 0.6} 2q${-W * 0.6} -2 ${-W * 1.2} 0z`, 0.9);
      return A.shadow(24, 5) + `<g${k === 1 ? '' : ` transform="scale(${k})"`}>${body}</g>` + (s === 2 ? stake(22) : '');
    },
  });
  /* ---------- the old heart oak: the 2.16 tree, sized by everything you ever finished (variant 0..6) ---------- */
  const OAK_SPEC = {
    seed: 'acorn', tag: '#7a5a2a',
    palette: o2 => autumn(o2, ['#5a3414', '#94561e', '#c08032', '#e0b060']) || (o2.season === 'summer' && !(o2.look && o2.look.leaf) ? ['#24401f', '#38602c', '#5a8a3c', '#8cb458'] : gartSeasonLeaf(o2, 'deciduous')),
    build(o2, r2) {
      const trunk = [[0, 0, rr(r2, -0.04, 0.04), 40, 13, 8, rr(r2, -2, 2)]], top = A.at(0, 0, 0, 38);
      const lim = [[top[0] - 2, top[1] + 6, -1.05, 34, 6, 1.8, -4], [top[0] + 2, top[1] + 4, 1.0, 36, 6, 1.8, 4], [top[0], top[1], -0.4, 30, 5, 1.6, -3], [top[0], top[1], 0.35, 32, 5, 1.6, 3], [top[0], top[1], 0, 26, 4, 1.4, 1]];
      const cl = [
        { x: 0, y: -84, rx: 42, ry: 26, n: 11 }, { x: -36, y: -66, rx: 16, ry: 13, front: 1 }, { x: 36, y: -68, rx: 17, ry: 13, front: 1 },
        { x: -20, y: -88, rx: 19, ry: 15, front: 1 }, { x: 18, y: -92, rx: 20, ry: 15, front: 1 }, { x: -2, y: -102, rx: 16, ry: 11, front: 1 },
        { x: 0, y: -70, rx: 15, ry: 11, front: 1 }, { x: -42, y: -78, rx: 10, ry: 9, front: 1 }, { x: 42, y: -82, rx: 10, ry: 9, front: 1 },
      ].map(c => Object.assign(c, { x: c.x + rr(r2, -2.5, 2.5), y: c.y + rr(r2, -2, 2) }));
      const acorn = o2.col2 ? o2.col2[1] : '#8a6a2a';
      let bloom = '';
      if (o2.season === 'autumn' || o2.season === 'summer') bloom = fruits(r2, cl, 8, 2.6, ['#6a4a1e', acorn, '#d8b860']);
      const always = A.P('#3a2618', A.ell(2.4, -18, 1.6, 2.4)) + A.P('#6a4a32', 'M-10 0q4-5 5-10l2 10zM10 0q-4-5-5-10l-2 10z');
      return { trunk, limbs: lim, clumps: cl, bloom, shadow: 44, always, top: -110, twig: 12 };
    },
  };
  function heartOak(o, r) {
    // the engine passes the size as o.heart (0..6); the contract's first draft said variant: take either
    const v = Math.max(0, Math.min(6, (o.heart != null && isFinite(+o.heart) ? +o.heart : o.variant) | 0));
    if (v === 0) return treeDraw(Object.assign({}, o, { s5: 2, stage: 2 }), r, OAK_SPEC);
    const k = [0.42, 0.56, 0.66, 0.76, 0.85, 0.93, 1][v];
    let body = treeDraw(Object.assign({}, o, { s5: 4, stage: 4 }), r, OAK_SPEC);
    // older oaks earn small stories: a heart carved in the bark, a rope swing, a fairy door at the roots
    let extra = '';
    if (v >= 3) extra += A.S('#3a2618', 1.1, 'M-1.6-27c-2.4-2.4-4.6 0.6-2.4 2.8l2.4 2.4 2.4-2.4c2.2-2.2 0-5.2-2.4-2.8z', 0.85);
    if (v >= 5) extra += A.S('#c8b48a', 1, 'M24-44l3 34M34-48l-1 38') + A.P('#8a5a34', A.rrect(22, -11.5, 14, 3, 1)) + A.P('#b07c4c', A.rect(22.6, -11.4, 12.8, 1), 0.8);
    if (v >= 6) extra += A.P('#6a3a5a', 'M-12 0v-6q0-4 3.4-4t3.4 4v6z') + A.P('#f6d040', A.circ(-6.6, -3.4, 0.7)) + A.P('#8a5a3a', A.rect(-13, -0.6, 8.2, 1.2));
    return `<g transform="scale(${k})">${body + extra}</g>`;
  }

  /* ---------- round-tree (maple): a straight trunk under a big, dense, round crown; winged seeds in autumn ---------- */
  gartDefine('form:round-tree', {
    box: [100, 116],
    draw(o, r) {
      const autumnCol = o.main || '#d9462b';
      return treeDraw(o, r, {
        seed: 'pip', tag: autumnCol,
        palette: o2 => o2.season === 'autumn' ? GART.leaf4(autumnCol).map((c, i) => i === 3 ? '#f6c060' : c) : gartSeasonLeaf(o2, 'deciduous'),
        build(o2, r2) {
          const trunk = [[0, 0, 0, 46, 9, 6, rr(r2, -1.5, 1.5)]], top = A.at(0, 0, 0, 44);
          const lim = [[top[0], top[1] + 8, -0.8, 26, 4.6, 1.4, -3], [top[0], top[1] + 6, 0.75, 28, 4.6, 1.4, 3], [top[0], top[1], -0.2, 26, 4, 1.2, -1], [top[0], top[1], 0.25, 24, 4, 1.2, 1]];
          // the round crown: a ring of clumps round a big back mass, almost a circle
          const cl = [{ x: 0, y: -80, rx: 44, ry: 36, n: 12 }];
          for (let i = 0; i < 9; i++) { const a = -Math.PI * 0.05 - (i / 8) * Math.PI * 1.1, q = 0.62; cl.push({ x: Math.cos(a) * 44 * q + rr(r2, -2, 2), y: -80 + Math.sin(a) * 36 * q + rr(r2, -2, 2), rx: 15 + rr(r2, 0, 3), ry: 13 + rr(r2, 0, 2), front: 1 }); }
          cl.push({ x: -4, y: -78, rx: 16, ry: 13, front: 1 }, { x: 14, y: -70, rx: 13, ry: 11, front: 1 });
          let bloom = '';
          if (o2.season === 'spring') bloom = A.P('#d8e070', overClumps(r2, cl, 18, (x, y) => A.circ(x, y, 1.4) + A.circ(x + 1.6, y + 1, 1.1), true), 0.9);
          if (o2.season === 'autumn') bloom = A.P('#b07a3a', overClumps(r2, cl, 9, (x, y) => A.leaf(x, y, -0.9, 4.4, 1.2) + A.leaf(x, y, 0.9, 4.4, 1.2), true));
          return { trunk, limbs: lim, clumps: cl, bloom, shadow: 46, top: -116, twig: 11 };
        },
      });
    },
  });

  /* ---------- bush-tree (hazel): many thin stems from one stool; lamb's-tail catkins, nuts in frilly husks ---------- */
  gartDefine('form:bush-tree', {
    box: [74, 92],
    draw(o, r) {
      const nut = o.main || '#a8743a', catkin = gartC2(o, '#e8d36a');
      return treeDraw(o, r, {
        seed: 'acorn', tag: catkin, bark: ['#4a3324', '#7a5a3e', '#a8865e'],
        palette: o2 => autumn(o2, ['#7a5a14', '#c09a2a', '#e8c84a', '#f6e490']) || gartSeasonLeaf(o2, 'deciduous'),
        build(o2, r2) {
          // the coppice stool: six or seven stems fanning out, no single trunk
          const trunk = [];
          for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 0.9 + rr(r2, -0.05, 0.05); trunk.push([rr(r2, -4, 4), 0, a, 60 + rr(r2, -6, 10) - Math.abs(a) * 14, 3.2, 1.2, rr(r2, -3, 3)]); }
          const tips = trunk.map(L => A.at(L[0], L[1], L[2], L[3]));
          const cl = [{ x: 0, y: -60, rx: 32, ry: 26, n: 10 }];
          tips.forEach((p, i) => cl.push({ x: p[0] + rr(r2, -3, 3), y: p[1] + 8 + rr(r2, 0, 6), rx: 11 + rr(r2, 0, 3), ry: 10 + rr(r2, 0, 2), front: 1 }));
          cl.push({ x: -10, y: -46, rx: 12, ry: 10, front: 1 }, { x: 12, y: -44, rx: 12, ry: 10, front: 1 });
          let bloom = '', berries = '';
          if (o2.season === 'autumn' || o2.season === 'summer') bloom = A.P('#8ab04a', overClumps(r2, cl, 7, (x, y) => A.star(x, y + 1, 6, 3.2, 1.8, r2()), true)) + A.P(nut, overClumps(A.rng(A.hash('hz' + o2.variant)), cl, 7, (x, y) => A.ell(x, y, 1.9, 2.2), true));
          // the catkins: pale yellow tails hanging from the bare stems (late winter), still a few in spring
          if (o2.season === 'winter' || o2.season === 'spring') { let d = ''; tips.forEach(p => { for (let j = 0; j < 3; j++) { const x = p[0] + rr(r2, -8, 8), y = p[1] + 10 + rr(r2, 0, 14); d += `M${f1(x)} ${f1(y)}q0.8 3 0.2 6`; } }); berries = A.S(catkin, 1.8, d); }
          return { trunk, limbs: [], clumps: cl, bloom: bloom + (o2.season === 'spring' ? berries : ''), berries, shadow: 32, top: -86, twig: 6 };
        },
      });
    },
  });

  /* ---------- fig: a low, smooth grey trunk and big hand-shaped leaves; purple figs ---------- */
  function figLeaf(x, y, a, L) {
    // three to five lobes: a palm and fingers, the fig's signature
    let d = '';
    for (const k of [-0.9, -0.42, 0, 0.42, 0.9]) d += A.leaf(x, y, a + k, L * (k === 0 ? 1 : Math.abs(k) < 0.5 ? 0.86 : 0.62), L * 0.2, 0.55);
    return d;
  }
  gartDefine('form:fig', {
    box: [70, 90],
    draw(o, r) {
      const s = o.s5, win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'cutting', o.main || '#5c3a5e');
      const L = o.season === 'autumn' ? ['#6a5a1a', '#a89a2a', '#d0c04a', '#ecdc8a'] : gartSeasonLeaf(o, 'deciduous');
      const k = s === 1 ? 0.3 : s === 2 ? 0.48 : s === 3 ? 0.76 : 1;
      const bark = ['#5a5a54', '#8a8a82', '#b0b0a6'];
      // a few smooth grey stems from the ground (figs grow as a shrubby tree), opening into a rounded crown
      const stems = [[-2, 0, -0.22, 40, 5.4, 2.2, -2], [2, 0, 0.2, 42, 5.4, 2.2, 2], [0, 0, 0.02, 36, 4.6, 2, 0], [-1, -18, -0.9, 20, 2.8, 1.2, -2], [1, -20, 0.85, 20, 2.8, 1.2, 2]];
      const tr = limbs(stems, bark);
      let back = '', leaves = '', lit = '', veins = '', figs = '';
      const cx = 0, cy = -56, RX = 25, RY = 20;
      if (!win) {
        back = A.blob(r, cx, cy, RX * 1.05, RY * 1.05, 11, 0.35);
        // hand-shaped leaves all over the crown, the top ones lit
        for (let i = 0; i < 14; i++) {
          const a0 = r() * Math.PI * 2, q = Math.sqrt(r()) * 0.85, x = cx + Math.cos(a0) * RX * q, y = cy + Math.sin(a0) * RY * q;
          const a = Math.atan2(x - cx, -(y - cy + 12)) + rr(r, -0.3, 0.3), Lf = 12 + rr(r, -1, 3);
          leaves += figLeaf(x, y + 4, a, Lf);
          if (y < cy) lit += A.leaf(x, y + 4, a - 0.42, Lf * 0.7, Lf * 0.13);
          const [vx, vy] = A.at(x, y + 4, a, Lf * 0.8); veins += `M${f1(x)} ${f1(y + 4)}L${f1(vx)} ${f1(vy)}`;
        }
        if (s === 4 && o.season !== 'spring') { const fc = o.col || ['#3a1a3a', '#5c3a5e', '#8a5a8a']; for (let i = 0; i < 7; i++) { const a0 = rr(r, 0.2, Math.PI - 0.2), x = cx + Math.cos(a0) * RX * 0.7, y = cy + Math.sin(a0) * RY * 0.6; figs += `M${f1(x)} ${f1(y - 3)}q-3.4 0-3.2 4q0.4 3 3.2 3q2.8 0 3.2-3q0.2-4-3.2-4z`; } figs = A.P(fc[1], figs) + A.P(fc[2], figs.replace(/q-3\.4 0-3\.2 4/g, 'q-1.6 0-1.8 2.4'), 0.5) + A.P('#f4b0a0', figs.replace(/M([-\d.]+) ([-\d.]+)q[^z]*z/g, (m, x, y) => A.circ(+x, +y + 5.4, 0.7)), 0.7); }
      }
      let body = tr.m + A.P(L[0], back) + A.P(L[1], leaves) + A.P(L[2], lit, 0.8) + A.S(L[0], 0.6, veins, 0.6) + figs;
      if (win) body += A.S(bark[1], 0.9, A.twigs(r, tr.tips.map((p, i) => [p[0], p[1], stems[i][2], 7]), 2, 0.5), 0.9) + limbSnow(stems);
      const crownWrap = o.anim && !win ? `<g class="gda-sway" style="${A.T(r, 0, 6)}">${body}</g>` : body;
      return A.shadow(26, 5) + (k === 1 ? crownWrap : `<g transform="scale(${k})">${crownWrap}</g>`);
    },
  });

  /* ---------- bonsai: a little world in a shallow glazed tray: an S-curved trunk, cloud pads, moss ---------- */
  gartDefine('form:bonsai', {
    box: [52, 46],
    draw(o, r) {
      const s = o.s5, win = o.season === 'winter';
      const glaze = o.variant % 3 === 1 ? ['#5a3a2a', '#7a5040', '#9a6a52'] : o.variant % 3 === 2 ? ['#2a4a52', '#3e6a74', '#5a8a92'] : ['#3a4a6a', '#4f6488', '#7088aa'];
      let pot = A.P(glaze[0], 'M-22-9h44l-3 8h-38z') + A.P(glaze[1], A.rrect(-23.5, -11, 47, 3.4, 1)) + A.P(glaze[2], 'M-20-7.4h12l-0.6 5h-10.8z', 0.6) + A.P(glaze[0], A.rect(-17, -1, 4, 1) + A.rect(13, -1, 4, 1));
      pot += A.P('#5a7a3a', A.ell(0, -11.2, 19, 1.8)) + A.P('#7a9a4a', A.ell(-6, -11.8, 7, 1.3) + A.ell(8, -11.6, 5, 1.1), 0.9) + A.P('#a8a49a', A.ell(12, -12, 1.8, 1.1) + A.ell(14.6, -11.6, 1.2, 0.8));
      if (s === 0) return A.shadow(24, 3) + pot + A.S('#6a4a32', 1.4, 'M-2-11l0.4-5') + A.P('#6a9a4a', A.leaf(-1.6, -15.6, -0.7, 3, 1) + A.leaf(-1.6, -15.6, 0.7, 3, 1));
      const L = gartSeasonLeaf(o, 'evergreen');
      const k = s === 1 ? 0.4 : s === 2 ? 0.62 : s === 3 ? 0.82 : 1;
      // the trunk: an S that leans, thick at the root flare, with a jin (a bleached dead branch)
      const tr = A.limb(-2, -11, -0.35, 14, 6, 3.6, -3), t2 = A.limb(tr.tip[0], tr.tip[1], 0.55, 12, 3.6, 2, 3), t3 = A.limb(t2.tip[0], t2.tip[1], -0.4, 9, 2.2, 1, -1);
      const br = A.limb(tr.tip[0], tr.tip[1] + 2, -1.25, 13, 2.2, 0.8, 1);
      const pads = [[br.tip[0] - 2, br.tip[1] - 1, 10, 4], [t2.tip[0] + 6, t2.tip[1] + 2, 9, 3.6], [t3.tip[0], t3.tip[1] - 2, 9, 4.2]];
      let pd = '', pl = '', snow = '';
      pads.forEach(p => { pd += A.blob(r, p[0], p[1], p[2], p[3], 9, 0.3); pl += A.blob(r, p[0] - p[2] * 0.2, p[1] - p[3] * 0.35, p[2] * 0.66, p[3] * 0.5, 7, 0.3); if (win) snow += A.ell(p[0] - 1, p[1] - p[3] * 0.7, p[2] * 0.7, 1.2); });
      let tree = A.P('#6a4a32', tr.d + t2.d + t3.d + br.d) + A.S('#a8865e', 0.8, 'M-4-12q-2-5 0-10', 0.6) + A.S('#e6e0d4', 0.9, `M${f1(t3.tip[0])} ${f1(t3.tip[1])}l3-4`, 0.9) + A.P(L[0], pd) + A.P(L[2], pl, 0.9) + A.P(PAL.snow, snow);
      if (s === 4 && o.season === 'spring') tree += A.P('#f6c0d0', pads.map(p => A.circ(p[0] - 2, p[1] - 2, 0.9) + A.circ(p[0] + 3, p[1] - 1, 0.8)).join(''));
      const grown = k === 1 ? tree : `<g transform="translate(0 -11) scale(${k}) translate(0 11)">${tree}</g>`;
      return A.shadow(24, 3) + pot + grown;
    },
  });

})();
