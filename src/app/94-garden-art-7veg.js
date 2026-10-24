/* ============================================================
   GARDEN ART, the veg patch and fruit (2.18, agent 'garden-art'). Veg: the
   forms root (radish, beetroot), root-frilly (carrot, parsnip), head (lettuce,
   cabbage), bushy (potato), bulb (onion, garlic), leek, stalk (sweetcorn),
   pole (runner bean), vine-pod (pea), vine-fruit (tomato), sprawl (courgette),
   pumpkin (pumpkin, lantern pumpkin, squash), melon, bush-fruit (chilli,
   aubergine), floret (broccoli), frilly-tall (kale). Fruit: low-fruit
   (strawberry), cane (raspberry), berry-bush (blueberry, blackcurrant,
   gooseberry), big-leaf (rhubarb), bramble, vine-grape (grapevine). PURE.
   Stage 4 is 'ready': the crop shows plainly (a shoulder above the soil, fruit
   hanging) so a glance says what to harvest. Anchor: the foot at (0, 0).
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const colOf = (o, c) => o.col || A.tone3(c);
  const snowFoot = (w) => A.P(PAL.snow, `M${-w} 0.6q${f1(w * 0.45)}-3 ${w}-2.4q${f1(w * 0.55)}-0.6 ${w} 2.4z`, 0.95);
  /** A ring of earth at the foot (a crop sits in the soil). */
  const earth = (w) => A.P(PAL.soil[1], `M${-w} 0.5Q0 ${f1(-w * 0.28)} ${w} 0.5z`) + A.P(PAL.soil[2], `M${-w * 0.8} 0Q${-w * 0.3} ${f1(-w * 0.24)} 0 ${f1(-w * 0.2)}`, 0.6);
  /** A trifoliate or compound leaf spray along a rib from (x, y). */
  function spray(F, x, y, a, len, n, w) { for (let k = 1; k <= n; k++) { const p = A.at(x, y, a, len * k / (n + 0.5)); F.leaf(p[0], p[1], a - 1.0, w * 2.6, w, { light: k % 2 === 0 }).leaf(p[0], p[1], a + 1.0, w * 2.6, w, { light: false }); } const tp = A.at(x, y, a, len); F.leaf(tp[0], tp[1], a, w * 2.8, w * 1.1); }

  /* ---------- root (radish, beetroot): leaves on a round shoulder sitting proud of the soil ---------- */
  gartDefine('form:root', {
    box: [32, 30],
    draw(o, r) {
      const beet = o.id === 'beetroot', col = colOf(o, beet ? '#8e1d4c' : '#e0465a'), s = o.s5, L = gartPerennialLeaf(o);
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(beet ? L.map(c => A.shift(c, 4, 0.9, -0.04)) : L);
      let stalks = '', veins = '';
      const n = s === 1 ? 2 : s === 2 ? 5 : 7, len = s === 1 ? 6 : s === 2 ? 13 : 18;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.8 + rr(r, -0.08, 0.08), st = A.stem(0, -3, a, len * 0.4, rr(r, -1, 1)), l2 = len * 0.62 * rr(r, 0.85, 1.05);
        stalks += st.d;
        F.leaf(st.tip[0], st.tip[1], a, l2, l2 * (beet ? 0.34 : 0.4), { bulge: beet ? 0.45 : 0.6 });
        if (beet) { const [ex, ey] = A.at(st.tip[0], st.tip[1], a, l2 * 0.85); veins += `M${f1(st.tip[0])} ${f1(st.tip[1])}L${f1(ex)} ${f1(ey)}`; }
      }
      let root = '';
      if (s >= 3) {
        const R = s === 3 ? 3.2 : beet ? 5.6 : 4.8;
        // the shoulder: most of it showing at 'ready', with a highlight, a tail into the soil and the root hairs
        root = A.P(col[1], A.ell(0, -R * 0.55, R, R * 0.9)) + A.P(col[0], `M${f1(R * 0.2)} ${f1(-R * 1.3)}A${f1(R)} ${f1(R * 0.9)} 0 0 1 ${f1(R * 0.4)} ${f1(R * 0.3)}Q${f1(R * 0.8)} ${f1(-R * 0.4)} ${f1(R * 0.2)} ${f1(-R * 1.3)}z`, 0.7)
          + A.P(col[2], A.ell(-R * 0.4, -R * 0.85, R * 0.32, R * 0.42), 0.8) + (beet ? '' : A.P('#fbf6f0', A.ell(0, R * 0.05, R * 0.6, R * 0.32)));
      }
      return A.shadow(9 + s * 1.6, 2) + earth(9) + root + gartSway(o, r, A.S(beet ? '#b02a4a' : L[1], 1.1, stalks) + F.out() + A.S('#b02a4a', 0.5, veins, 0.85)) + (o.season === 'winter' ? snowFoot(9) : '');
    },
  });

  /* ---------- root-frilly (carrot, parsnip): feathery fronds over an orange or cream shoulder ---------- */
  gartDefine('form:root-frilly', {
    box: [34, 40],
    draw(o, r) {
      const parsnip = o.id === 'parsnip', col = colOf(o, parsnip ? '#efe3c2' : '#f28a1a'), s = o.s5, L = gartPerennialLeaf(o);
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      let fr = '', fr2 = '', stalks = '';
      const n = s === 1 ? 3 : s === 2 ? 6 : 8, len = s === 1 ? 8 : s === 2 ? 20 : 30;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.3 + rr(r, -0.06, 0.06), st = A.stem(rr(r, -1, 1), -2, a, len * rr(r, 0.75, 1), rr(r, -2, 2));
        stalks += st.d;
        // feathery: forked fine leaflets all along the frond (parsnip: broader, celery-like)
        for (let k = 2; k <= 6; k++) {
          const t = k / 6.5, p = st.pt(t), g = st.ang(t), lw = (1 - t * 0.5) * (parsnip ? 4.6 : 3.8);
          const d = parsnip ? A.leaf(p[0], p[1], g - 0.9, lw, lw * 0.4) + A.leaf(p[0], p[1], g + 0.9, lw, lw * 0.4) : `M${f1(p[0])} ${f1(p[1])}l${f1(Math.sin(g - 0.8) * lw)} ${f1(-Math.cos(g - 0.8) * lw)}M${f1(p[0])} ${f1(p[1])}l${f1(Math.sin(g + 0.8) * lw)} ${f1(-Math.cos(g + 0.8) * lw)}`;
          (k % 2 ? (fr += d) : (fr2 += d));
        }
      }
      let root = '';
      if (s >= 3) {
        const w = s === 3 ? 2.4 : 3.6, h = s === 3 ? 2 : 5;
        root = A.P(col[1], `M${-w} ${-h}Q${-w} ${f1(-h - 1.6)} 0 ${f1(-h - 1.8)}Q${w} ${f1(-h - 1.6)} ${w} ${-h}L${f1(w * 0.6)} 1L${f1(-w * 0.6)} 1z`) + A.P(col[2], A.rect(-w * 0.75, -h - 0.6, w * 0.4, h), 0.6) + A.S(col[0], 0.5, `M${-w * 0.8} ${f1(-h * 0.4)}h${f1(w * 0.6)}M${f1(w * 0.1)} ${f1(-h * 0.7)}h${f1(w * 0.6)}`, 0.6);
      }
      const leafy = parsnip ? A.P(L[1], fr2) + A.P(L[2], fr) : A.S(L[1], 1.1, fr2) + A.S(L[2], 1, fr);
      return A.shadow(8 + s * 1.6, 2) + earth(8) + root + gartSway(o, r, A.S(L[1], 0.9, stalks) + leafy) + (o.season === 'winter' ? snowFoot(8) : '');
    },
  });

  /* ---------- head (lettuce, cabbage): a rosette of frilled leaves; a cabbage's round, veined heart ---------- */
  gartDefine('form:head', {
    box: [38, 24],
    draw(o, r) {
      const cabbage = o.id === 'cabbage', base = o.main || (cabbage ? '#7da35b' : '#8bc34a'), s = o.s5, win = o.season === 'winter';
      const L = A.leaf4(base);
      if (s === 0) return gartSeed(o, A, 'seed', base);
      const W = s === 1 ? 5 : s === 2 ? 11 : 16;
      let outer = '', outerL = '', veins = '', heart = '', heartL = '';
      const n = s === 1 ? 3 : s === 2 ? 6 : 9;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.9, len = W * rr(r, 0.8, 1.05);
        outer += cabbage ? A.leaf(0, -1, a, len, len * 0.5, 0.62) : A.blob(r, ...A.at(0, -1, a, len * 0.55), len * 0.5, len * 0.36, 9, 0.55);
        outerL += A.halfLeaf(0, -1, a, len * 0.9, len * 0.4, gartLit(a), 0.62);
        const [ex, ey] = A.at(0, -1, a, len * 0.85); veins += `M0 -1L${f1(ex)} ${f1(ey)}`;
      }
      if (s >= 3) {
        const R = s === 3 ? W * 0.36 : W * 0.5;
        if (cabbage) { heart = A.ell(0, -R * 0.9, R, R * 0.86); heartL = A.ell(-R * 0.3, -R * 1.2, R * 0.5, R * 0.42); veins += `M${f1(-R * 0.8)} ${f1(-R * 0.6)}Q0 ${f1(-R * 1.6)} ${f1(R * 0.8)} ${f1(-R * 0.6)}M${f1(-R * 0.4)} ${f1(-R * 0.3)}Q${f1(R * 0.2)} ${f1(-R * 1.3)} ${f1(R * 0.6)} ${f1(-R * 1.5)}`; }
        else { for (let k = 0; k < 5; k++) heart += A.blob(r, (k - 2) * R * 0.32, -R * 0.9 - (k % 2) * R * 0.25, R * 0.5, R * 0.56, 8, 0.5); heartL = A.blob(r, -R * 0.3, -R * 1.25, R * 0.4, R * 0.32, 7, 0.5); }
      }
      let body = A.P(L[0], outer) + A.P(L[2], outerL, 0.7) + A.P(L[1], heart) + A.P(L[3], heartL, 0.75) + A.S(cabbage ? L[3] : L[0], 0.6, veins, 0.6);
      if (win && s >= 2) body += A.P(PAL.frost, outerL, 0.35) + gartSnowCap(A, 0, -W * 0.7, W * 1.2, 0.8);
      return A.shadow(W + 2, 2.2) + body;
    },
  });

  /* ---------- bushy (potato): a leafy bush of compound leaves, white stars; potatoes peek out at 'ready' ---------- */
  gartDefine('form:bushy', {
    box: [42, 38],
    draw(o, r) {
      const col = colOf(o, '#c9a26a'), fl = gartC2(o, '#f4f0f7'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'tuber', col[1]);
      const F = gartFoliage(L);
      const n = s === 1 ? 2 : s === 2 ? 5 : 8, H = s === 1 ? 8 : s === 2 ? 20 : 30;
      let stems = '', stars = '';
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n - 1) - 0.5) * 1.6, st = A.stem(rr(r, -2, 2), 0, a, H * rr(r, 0.7, 1), rr(r, -2, 2));
        stems += st.d;
        spray(F, ...st.pt(0.45), a + (i % 2 ? 0.8 : -0.8), 9, 3, 1.5);
        spray(F, st.tip[0], st.tip[1], a, 7, 2, 1.4);
        if (s >= 3 && !win && i % 2 === 0) stars += A.star(st.tip[0], st.tip[1] - 3, 5, 2.4, 1.1, r());
      }
      let tubers = '';
      if (s === 4) tubers = A.P(col[1], A.ell(-7, -1.2, 3.4, 2.4) + A.ell(6, -1, 3, 2.1) + A.ell(0, 0, 2.4, 1.7)) + A.P(col[2], A.ell(-8, -2, 1.2, 0.8) + A.ell(5.2, -1.8, 1, 0.7), 0.8) + A.P(col[0], A.circ(-6, -1, 0.4) + A.circ(7, -0.4, 0.4), 0.8);
      let body = A.S(L[0], 1, stems) + F.out() + A.P(fl, stars);
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.85, 26, 1);
      return A.shadow(16, 3) + earth(14) + gartSway(o, r, body) + tubers;
    },
  });

  /* ---------- bulb (onion, garlic): hollow tubes (onion) or flat straps (garlic) over a round papery bulb ---------- */
  gartDefine('form:bulb', {
    box: [30, 36],
    draw(o, r) {
      const garlic = o.id === 'garlic', col = colOf(o, garlic ? '#f2ece0' : '#d9a066'), s = o.s5, L = gartPerennialLeaf(o).map(c => A.shift(c, 8, 0.85, 0.02));
      if (s === 0) return gartSeed(o, A, 'bulb', col[1]);
      let tubes = '', tubes2 = '', scape = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 6, H = s === 1 ? 8 : s === 2 ? 22 : 30, ripe = s === 4 && !garlic;
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n - 1) - 0.5) * (ripe ? 1.5 : 0.9), h = H * rr(r, 0.75, 1) * (ripe ? 0.85 : 1), st = A.stem(0, -4, a, h, (a > 0 ? 1 : -1) * (ripe ? 4 : 2));
        (i % 2 ? (tubes += st.d) : (tubes2 += st.d));
      }
      if (garlic && s === 4) { const st = A.stem(0, -3, 0.1, H, 2); scape = st.d + `a3.4 3.4 0 1 1 -4 2`; }
      let bulb = '';
      if (s >= 3) {
        const R = s === 3 ? 3.6 : 6.4;
        bulb = A.P(col[1], `M0 ${f1(-R * 2.1)}Q${f1(-R * 0.3)} ${f1(-R * 1.6)} ${f1(-R)} ${f1(-R * 0.8)}Q${f1(-R * 1.2)} ${f1(R * 0.2)} 0 ${f1(R * 0.25)}Q${f1(R * 1.2)} ${f1(R * 0.2)} ${f1(R)} ${f1(-R * 0.8)}Q${f1(R * 0.3)} ${f1(-R * 1.6)} 0 ${f1(-R * 2.1)}z`)
          + A.S(col[0], 0.5, `M0 ${f1(-R * 1.9)}Q${f1(-R * 0.6)} ${f1(-R)} ${f1(-R * 0.3)} 0M0 ${f1(-R * 1.9)}Q${f1(R * 0.6)} ${f1(-R)} ${f1(R * 0.3)} 0`, 0.6) + A.P(col[2], A.ell(-R * 0.45, -R * 0.9, R * 0.25, R * 0.45), 0.8);
      }
      const tw = garlic ? 1.6 : 1.3, c1 = ripe ? '#c8b45a' : L[1], c2 = ripe ? '#a8a04a' : L[2];
      return A.shadow(8 + s * 1.4, 2) + earth(8) + bulb + gartSway(o, r, A.S(c1, tw, tubes2) + A.S(c2, tw * 0.9, tubes) + A.S(L[1], 0.9, scape)) + (o.season === 'winter' ? snowFoot(8) : '');
    },
  });

  /* ---------- leek: a tall white shank, a fan of folded blue-green leaves ---------- */
  gartDefine('form:leek', {
    box: [30, 52],
    draw(o, r) {
      const col = colOf(o, '#f1efe2'), s = o.s5, L = gartLeafSeason((o.look && o.look.leaf) || '#5f8f7a', 'summer', 'perennial');
      if (s === 0) return gartSeed(o, A, 'seed', '#5f8f7a');
      const sh = s === 1 ? 3 : s === 2 ? 10 : s === 3 ? 16 : 20, sw = s === 1 ? 1 : s === 2 ? 2 : 2.8;
      const F = gartFoliage(L);
      const n = s === 1 ? 2 : 6, len = s === 1 ? 7 : s === 2 ? 16 : 24;
      // the fan: flat leaves alternating left and right in one plane, folding over at the tips
      for (let i = 0; i < n; i++) { const side = i % 2 ? 1 : -1, a = side * (0.25 + i * 0.12), y = -sh - i * 1.4; F.leaf(0, y, a, len * (1 - i * 0.06), 2.2, { bulge: 0.35, vein: true }); }
      const shank = A.P(col[1], A.rect(-sw, -sh, sw * 2, sh)) + A.P(col[2], A.rect(-sw, -sh, sw * 0.7, sh), 0.8) + A.P(A.mix(col[1], L[2], 0.5), A.rect(-sw, -sh - 2, sw * 2, 3));
      return A.shadow(8, 2) + earth(7) + gartSway(o, r, shank + F.out()) + (o.season === 'winter' ? snowFoot(8) : '');
    },
  });

  /* ---------- stalk (sweetcorn): a tall stalk, arching straps, cobs in husks with silk, a tassel on top ---------- */
  gartDefine('form:stalk', {
    box: [40, 128],
    draw(o, r) {
      const corn = colOf(o, '#f5d76e'), silk = gartC2(o, '#c9a26a'), s = o.s5, L = gartPerennialLeaf(o).map(c => A.shift(c, 4, 1, 0.02));
      if (s === 0) return gartSeed(o, A, 'seed', corn[1]);
      const F = gartFoliage(L);
      const H = s === 1 ? 14 : s === 2 ? 44 : s === 3 ? 96 : 118;
      const st = A.stem(0, 0, rr(r, -0.03, 0.03), H, rr(r, -2, 2));
      const nl = s === 1 ? 2 : s === 2 ? 5 : 9;
      for (let i = 0; i < nl; i++) { const t = 0.1 + i / nl * 0.8, p = st.pt(t), side = i % 2 ? 1 : -1, len = (s === 1 ? 10 : 30) * (1 - t * 0.4); F.leaf(p[0], p[1], side * (0.9 + t * 0.3), len, 2.4, { bulge: 0.32, vein: true }); }
      let extra = '';
      if (s >= 3) {
        // the tassel
        const [tx, ty] = st.tip; let ts = ''; for (let k = 0; k < 6; k++) ts += `M${f1(tx)} ${f1(ty)}q${f1((k - 2.5) * 2)} -4 ${f1((k - 2.5) * 3.4)} -2`; extra += A.S('#d8c07a', 0.9, ts);
        // the cobs: a husk wrapped round a golden cob (showing at 'ready'), silk at the tip
        [[0.42, 1], [0.58, -1]].slice(0, s === 4 ? 2 : 1).forEach(([t, side]) => {
          const p = st.pt(t), cx = p[0] + side * 3.6, cy = p[1] - 4;
          extra += A.P(L[1], A.leaf(p[0], p[1] + 4, side * 0.35, 22, 4.2, 0.5));
          if (s === 4) extra += A.P(corn[1], A.leaf(cx + side * 1.4, cy + 6, side * 0.35, 17, 3, 0.5)) + A.P(corn[2], A.leaf(cx + side * 0.8, cy + 5, side * 0.35, 14, 1.1, 0.5), 0.8) + A.S(corn[0], 0.5, `M${f1(cx + side * 1.5 - 1.6)} ${f1(cy - 1)}h3M${f1(cx + side * 2 - 1.4)} ${f1(cy - 4.6)}h3M${f1(cx + side * 2.6 - 1.2)} ${f1(cy - 8)}h2.6`, 0.6);
          extra += A.P(L[2], A.leaf(p[0] + side, p[1] + 4, side * 0.22, 17, 2.2, 0.5), 0.9);
          const [sx, sy] = A.at(cx + side * 1.4, cy + 6, side * 0.35, s === 4 ? 17 : 16); extra += A.S(silk, 0.7, `M${f1(sx)} ${f1(sy)}q${side * 2} -2 ${side * 1} -4M${f1(sx)} ${f1(sy)}q${side * 3} 0 ${side * 3.6} -2`);
        });
      }
      return A.shadow(12, 2.6) + earth(8) + gartSway(o, r, A.S(L[1], 2.6, st.d) + A.S(L[2], 0.9, st.d, 0.5) + F.out() + extra) + (o.season === 'winter' ? snowFoot(9) : '');
    },
  });

  /* ---------- pole (runner bean): a wigwam of canes, heart-leaved vines, scarlet flowers, long hanging pods ---------- */
  gartDefine('form:pole', {
    box: [40, 116],
    draw(o, r) {
      const fl = colOf(o, '#e2442b'), pod = gartC2(o, '#5d9e3c'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', fl[1]);
      const F = gartFoliage(L);
      const H = 112, climb = s === 1 ? 0.12 : s === 2 ? 0.4 : s === 3 ? 0.8 : 0.95;
      let canes = A.S('#c8a86a', 1.8, `M-14 0L-1 ${-H}M14 0L1 ${-H}`) + A.S('#e8d8b0', 1, `M-3 ${-H + 6}h6`), vines = '', flw = '', pods = '';
      for (const [bx, ex] of [[-14, -1], [14, 1]]) {
        let d = `M${bx} 0`;
        for (let i = 1; i <= 10; i++) {
          const y = -H * climb * i / 10, x = bx + (ex - bx) * (-y / H) + (i % 2 ? 2.2 : -2.2);
          d += `L${f1(x)} ${f1(y)}`;
          if (win) continue;
          const side = (i % 2 ? 1 : -1) * Math.sign(bx);
          F.leaf(x, y, side * 1.1, 7, 3, { bulge: 0.35 }).leaf(x, y, side * 0.4, 6, 2.6, { bulge: 0.35 });
          if (s >= 3 && i % 3 === 1) flw += A.circ(x - side * 3, y - 2, 1.5) + A.circ(x - side * 4.4, y - 0.6, 1.3) + A.circ(x - side * 3.2, y + 0.8, 1.2);
          if (s === 4 && i % 3 === 2) pods += `M${f1(x + side * 2)} ${f1(y)}q${f1(side * 1.6)} 7 ${f1(side * 0.6)} 15q${f1(side * -1)} -8 ${f1(side * -0.4)} -15z`;
        }
        vines += d;
      }
      return A.shadow(16, 3) + canes + gartSway(o, r, A.S(win ? '#8a8a5a' : L[1], 0.9, vines) + F.out() + A.P(pod, pods) + A.P(s === 3 ? A.mix(fl[1], L[2], 0.3) : fl[1], flw)) + (win ? snowFoot(15) : '');
    },
  });

  /* ---------- vine-pod (pea): twiggy pea sticks, tendrils, white flowers, plump pods ---------- */
  gartDefine('form:vine-pod', {
    box: [40, 64],
    draw(o, r) {
      const pod = colOf(o, '#7cc35a'), fl = gartC2(o, '#f7f5f0'), s = o.s5, L = gartPerennialLeaf(o).map(c => A.shift(c, -6, 0.9, 0.05)), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', pod[1]);
      const F = gartFoliage(L);
      const H = 60, climb = s === 1 ? 0.18 : s === 2 ? 0.5 : s === 3 ? 0.85 : 1;
      // pea sticks: forked hazel twigs pushed into the soil
      let sticks = A.S('#8a6a4a', 1, A.twigs(r, [[-8, 0, -0.1, 22], [8, 0, 0.12, 22]], 2, 0.35)), vines = '', tend = '', flw = '', pods = '';
      for (let v = 0; v < 3; v++) {
        let d = `M${(v - 1) * 6} 0`;
        for (let i = 1; i <= 8; i++) {
          const y = -H * climb * i / 8, x = (v - 1) * 6 + Math.sin(i * 1.3 + v) * 4;
          d += `L${f1(x)} ${f1(y)}`;
          if (win) continue;
          F.leaf(x, y, (i % 2 ? 1 : -1) * 1.0, 4.4, 2, { bulge: 0.55 });
          if (i % 2 && o.lod) tend += `M${f1(x)} ${f1(y)}q${i % 4 ? 3 : -3} -1 ${i % 4 ? 2.4 : -2.4} -3.6a1 1 0 1 1 ${i % 4 ? -1 : 1} 0.4`;
          if (s >= 3 && i % 3 === 2) flw += A.circ(x + 2.6, y - 1, 1.8) + A.ell(x + 2.6, y + 0.8, 1.2, 0.9);
          if (s === 4 && i % 3 === 0) pods += `M${f1(x - 1)} ${f1(y)}q-3 5-1.4 10q3.4-4 1.4-10z`;
        }
        vines += d;
      }
      return A.shadow(14, 2.8) + sticks + gartSway(o, r, A.S(win ? '#8a8a5a' : L[1], 0.8, vines) + F.out() + A.S(L[2], 0.5, tend) + A.P(pod[1], pods) + A.P(pod[2], pods.replace(/q-3 5-1\.4 10/g, 'q-1.4 3-0.8 6'), 0.7) + A.P(fl, flw)) + (win ? snowFoot(13) : '');
    },
  });

  /* ---------- vine-fruit (tomato): a plant tied to a cane, toothed leaves, trusses of round fruit ---------- */
  gartDefine('form:vine-fruit', {
    box: [40, 78],
    draw(o, r) {
      const col = colOf(o, '#e0392b'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const H = s === 1 ? 10 : s === 2 ? 34 : s === 3 ? 62 : 72;
      const st = A.stem(1, 0, 0.02, H, 2);
      let cane = s >= 2 ? A.S('#c8a86a', 1.6, `M-1.6 1L-1.6 ${-H - 2}`) : '', ties = '', fruit = '', fruitL = '', calyx = '';
      for (let k = 0; k < (s >= 2 ? 3 : 0); k++) { const p = st.pt(0.25 + k * 0.28); ties += `M-2.6 ${f1(p[1])}l4 -1`; }
      const nl = s === 1 ? 2 : s === 2 ? 4 : 7;
      for (let i = 0; i < nl; i++) { const t = 0.15 + i / nl * 0.8, p = st.pt(t), side = i % 2 ? 1 : -1; spray(F, p[0], p[1], side * (1.0 + rr(r, -0.1, 0.2)), 11 - t * 3, 3, 1.6); }
      if (s >= 3 && !win) {
        // trusses: a little bunch of fruit on a crooked stalk; green and small at stage 3, ripe colours at 4
        for (let k = 0; k < 3; k++) {
          const p = st.pt(0.3 + k * 0.22), side = k % 2 ? 1 : -1;
          for (let j = 0; j < 3; j++) { const x = p[0] + side * (4 + j * 2.8), y = p[1] + 3 + (j % 2) * 2.4, R = s === 3 ? 1.8 : 2.8 - j * 0.2; fruit += A.circ(x, y, R); fruitL += A.circ(x - R * 0.35, y - R * 0.35, R * 0.35); calyx += A.star(x, y - R * 0.9, 5, R * 0.6, R * 0.22); }
        }
      }
      const fc = s === 3 ? ['#5a8a3a', '#8ab84a', '#c4dc8a'] : col;
      return A.shadow(12, 2.6) + earth(8) + cane + gartSway(o, r, A.S(L[0], 1.4, st.d) + F.out() + A.P(fc[1], fruit) + A.P(fc[2], fruitL, 0.85) + A.P(L[0], calyx)) + A.S('#e8d8b0', 0.8, ties) + (win ? snowFoot(10) : '');
    },
  });

  /* ---------- sprawl (courgette): huge lobed leaves, yellow trumpets, glossy courgettes underneath ---------- */
  const bigLobed = (r, x, y, a, R) => A.blob(r, ...A.at(x, y, a, R * 0.8), R, R * 0.82, 7, 0.55);
  gartDefine('form:sprawl', {
    box: [56, 36],
    draw(o, r) {
      const col = colOf(o, '#2f7a31'), fl = gartC2(o, '#f7c331'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', fl);
      const n = s === 1 ? 2 : s === 2 ? 5 : 8, R0 = s === 1 ? 4 : s === 2 ? 8 : 11;
      let lv = '', lvL = '', ribs = '', stalks = '', fruit = '', flw = '';
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.6 + rr(r, -0.1, 0.1), R = R0 * rr(r, 0.8, 1.05), st = A.stem(0, -2, a, R * 0.8, rr(r, -2, 2));
        stalks += st.d;
        lv += bigLobed(r, st.tip[0], st.tip[1], a, R); lvL += A.ell(...A.at(st.tip[0], st.tip[1], a - 0.3, R * 0.6), R * 0.4, R * 0.3);
        for (const k of [-0.6, 0, 0.6]) { const [ex, ey] = A.at(st.tip[0], st.tip[1], a + k, R * 1.4); ribs += `M${f1(st.tip[0])} ${f1(st.tip[1])}L${f1(ex)} ${f1(ey)}`; }
      }
      if (s >= 3 && !win) {
        flw = A.P(fl, `M-2 -14l-3-6q3 1 5 0q2 1 5 0l-3 6z`) + A.P(A.lt(fl, 0.3), 'M0 -14l-1.4-5 1.4 0.6 1.4-0.6z', 0.8);
        if (s === 4) fruit = A.P(col[1], 'M-20 -1q2-4 14-2q2 2 0 3.4q-12 1.4-14-1.4z' + 'M8 0q3-3.6 13-1.4q1.4 2-0.6 3.2q-10 0.6-12.4-1.8z') + A.S(col[2], 0.8, 'M-17-2.4q5-1.4 10-0.6M10-1q5-1.2 9-0.2', 0.8) + A.P('#a8c06a', A.circ(-6, -1.6, 1) + A.circ(20.4, -0.4, 0.9));
      }
      let body = A.S(L[0], 1.2, stalks) + A.P(L[1], lv) + A.P(L[2], lvL, 0.6) + A.S(L[3], 0.6, ribs, 0.55) + flw;
      if (win && s >= 2) body = A.P('#7a6a4a', A.blob(r, 0, -2, R0, 3, 7, 0.4)) + A.P('#9a8a5a', A.blob(r, -3, -3, R0 * 0.5, 2, 6, 0.4), 0.8) + gartSnowCap(A, 0, -4, R0 * 2.2, 0.8);
      return A.shadow(22, 3) + gartSway(o, r, body) + fruit;
    },
  });

  /* ---------- pumpkin (pumpkin, lantern pumpkin, squash): big leaves on a curling vine, a ribbed fruit ---------- */
  gartDefine('form:pumpkin', {
    box: [56, 38],
    draw(o, r) {
      const lantern = o.id === 'lantern-pumpkin', squash = o.id === 'squash';
      const col = colOf(o, '#ef7f1a'), flc = gartC2(o, '#f7c331'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      let lv = '', lvL = '', vine = 'M-24 -2', tend = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const x = -22 + i * (44 / Math.max(1, n - 1)), y = -4 - (i % 2) * 3, R = (s === 1 ? 4 : 7.6) * rr(r, 0.85, 1.05);
        vine += `Q${f1(x - 3)} ${f1(y + 4)} ${f1(x)} ${f1(y + 1)}`;
        if (!win) { lv += bigLobed(r, x, y, (i % 2 ? 0.5 : -0.5), R); lvL += A.ell(x - R * 0.3, y - R * 0.9, R * 0.35, R * 0.25); }
        if (o.lod && i % 2) tend += `M${f1(x)} ${f1(y + 1)}q3 -4 6 -2a1.6 1.6 0 1 0 -1.6 1.8`;
      }
      let fruit = '';
      if (s >= 3) {
        const R = s === 3 ? 5 : 12, fc = s === 3 && !lantern ? ['#4a7a2a', '#6a9a3a', '#9aca5a'] : col;
        if (squash && s === 4) {
          // butternut: a long neck and a round bottom
          fruit = A.P(fc[1], `M-4 -22q-3 0-3 5v6q-6 2-6 7q0 5 9 5q9 0 9-5q0-5-6-7v-6q0-5-3-5z`) + A.S(fc[2], 1.6, 'M-4.4-19v7q-5 2-5 6', 0.7) + A.P('#6a4a2a', A.rect(-1.2, -25, 2.4, 3.4));
        } else {
          // the pumpkin: three or five ribbed lobes, a thick curly stalk
          fruit = A.P(fc[0], A.ell(-R * 0.55, -R * 0.62, R * 0.6, R * 0.6) + A.ell(R * 0.55, -R * 0.62, R * 0.6, R * 0.6)) + A.P(fc[1], A.ell(0, -R * 0.64, R * 0.62, R * 0.64)) + A.P(fc[2], A.ell(-R * 0.62, -R * 0.75, R * 0.22, R * 0.36) + A.ell(-R * 0.12, -R * 0.8, R * 0.16, R * 0.38), 0.7)
            + A.S(fc[0], 0.7, `M${f1(-R * 0.3)} ${f1(-R * 1.15)}Q${f1(-R * 0.45)} ${f1(-R * 0.6)} ${f1(-R * 0.3)} ${f1(-R * 0.05)}M${f1(R * 0.3)} ${f1(-R * 1.15)}Q${f1(R * 0.45)} ${f1(-R * 0.6)} ${f1(R * 0.3)} ${f1(-R * 0.05)}`, 0.6)
            + A.S('#5a6a2a', R * 0.18, `M0 ${f1(-R * 1.2)}q0.6 ${f1(-R * 0.3)} ${f1(R * 0.25)} ${f1(-R * 0.35)}`);
          if (lantern && s === 4) {
            // the lantern pumpkin: a friendly carved face, lit from inside (it glows at dusk and night)
            const g = o.night || o.dusk ? '#ffe070' : '#f8b040';
            fruit += gartHalo(o, r, 0, -R * 0.6, R * 1.8, '#ffc860') + A.P(g, `M${f1(-R * 0.45)} ${f1(-R * 0.85)}l${f1(R * 0.18)} ${f1(-R * 0.25)} ${f1(R * 0.18)} ${f1(R * 0.25)}zM${f1(R * 0.1)} ${f1(-R * 0.85)}l${f1(R * 0.18)} ${f1(-R * 0.25)} ${f1(R * 0.18)} ${f1(R * 0.25)}zM${f1(-R * 0.5)} ${f1(-R * 0.45)}q${f1(R * 0.5)} ${f1(R * 0.4)} ${f1(R)} 0l${f1(-R * 0.12)} ${f1(R * 0.1)}l${f1(-R * 0.12)} ${f1(-R * 0.08)}l${f1(-R * 0.14)} ${f1(R * 0.12)}l${f1(-R * 0.14)} ${f1(-R * 0.1)}l${f1(-R * 0.14)} ${f1(R * 0.1)}z`);
          }
        }
        if (s === 3 && !win) fruit += A.P(flc, `M10 -16l-3-5q3 1 5 0q2 1 4 0l-3 5z`);
      }
      let body = A.S(L[0], 1.3, vine) + A.P(L[1], lv) + A.P(L[2], lvL, 0.6) + A.S(L[2], 0.6, tend);
      if (win) body = A.S('#8a7a4a', 1.2, vine) + snowFoot(22);
      return A.shadow(24, 3) + gartSway(o, r, body) + fruit;
    },
  });

  /* ---------- melon: a straw mat, vine leaves, a netted melon ---------- */
  gartDefine('form:melon', {
    box: [52, 30],
    draw(o, r) {
      const col = colOf(o, '#f2c66b'), rind = gartC2(o, '#9fc35a'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      let straw = '';
      for (let i = 0; i < 14; i++) { const x = rr(r, -20, 20), a = rr(r, -0.4, 0.4) + Math.PI / 2; straw += `M${f1(x)} ${f1(-rr(r, 0, 2))}l${f1(Math.sin(a) * 5)} ${f1(-Math.cos(a) * 1.2)}`; }
      let lv = '', vine = 'M-22 -2';
      const n = s === 1 ? 2 : 5;
      for (let i = 0; i < n; i++) { const x = -20 + i * (40 / Math.max(1, n - 1)), y = -5 - (i % 2) * 3; vine += `Q${f1(x - 3)} ${f1(y + 3)} ${f1(x)} ${f1(y)}`; if (!win) lv += A.blob(r, x, y - 4, s === 1 ? 3 : 6, s === 1 ? 2.6 : 5, 7, 0.5); }
      let fruit = '';
      if (s >= 3) {
        const R = s === 3 ? 4.4 : 9;
        let net = '';
        for (let k = -2; k <= 2; k++) net += `M${f1(-R * 0.9)} ${f1(-R + k * R * 0.32)}q${f1(R * 0.9)} ${f1(R * 0.24)} ${f1(R * 1.8)} 0M${f1(k * R * 0.32)} ${f1(-R * 1.85)}q${f1(R * 0.2)} ${f1(R * 0.85)} 0 ${f1(R * 1.7)}`;
        fruit = A.P(s === 3 ? '#8ab84a' : rind, A.ell(2, -R * 0.95, R * 1.1, R)) + A.P(A.lt(s === 3 ? '#8ab84a' : rind, 0.25), A.ell(-R * 0.3 + 2, -R * 1.3, R * 0.5, R * 0.4), 0.7) + A.S(s === 3 ? '#b8d880' : col[2], 0.6, net, 0.7) + A.S('#6a7a2a', 1.2, `M2 ${f1(-R * 1.95)}q1-2 3-2`);
      }
      return A.shadow(22, 3) + A.S('#e0c87a', 1.2, straw, 0.9) + gartSway(o, r, A.S(L[0], 1.1, vine) + A.P(L[1], lv) + A.P(L[2], lv.replace(/M([-\d.]+) ([-\d.]+)/g, (m, x, y) => `M${f1(+x - 1)} ${f1(+y - 1)}`), 0.35)) + fruit + (win ? snowFoot(20) : '');
    },
  });

  /* ---------- bush-fruit (chilli, aubergine): a little bush, hanging glossy fruit with green caps ---------- */
  gartDefine('form:bush-fruit', {
    box: [40, 48],
    draw(o, r) {
      const aub = o.id === 'aubergine', col = colOf(o, aub ? '#4a2a5e' : '#d7261e'), flc = gartC2(o, aub ? '#a68ad8' : '#f4f2ea'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(aub ? L.map(c => A.shift(c, 0, 0.75, 0.04)) : L);
      const H = s === 1 ? 9 : s === 2 ? 24 : 38, n = s === 1 ? 2 : 5;
      let stems = '', fruit = '', fruitL = '', caps = '', flw = '';
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n - 1) - 0.5) * 1.3, st = A.stem(rr(r, -1.5, 1.5), 0, a, H * rr(r, 0.7, 1), rr(r, -2, 2));
        stems += st.d;
        for (let k = 0; k < 3; k++) { const p = st.pt(0.35 + k * 0.25); F.leaf(p[0], p[1], a + (k % 2 ? 1 : -1) * 1.1, aub ? 8 : 6, aub ? 3 : 1.8, { bulge: 0.45, vein: aub }); }
        if (s >= 3 && !win) {
          const p = st.pt(0.6), side = i % 2 ? 1 : -1, x = p[0] + side * 3, y = p[1] + 1;
          if (s === 3) { flw += A.star(x, y + 2, 5, 1.8, 0.8); continue; }
          if (aub) { fruit += A.leaf(x, y, Math.PI + side * 0.2, 11, 3.2, 0.62); fruitL += A.leaf(x - 1, y + 2, Math.PI + side * 0.2, 7, 0.9, 0.6); caps += A.star(x, y + 0.6, 5, 2.6, 1); }
          else { fruit += A.leaf(x, y, Math.PI + side * 0.35, 8, 1.6, 0.25); fruitL += A.leaf(x - 0.5, y + 1, Math.PI + side * 0.35, 5, 0.5, 0.3); caps += A.ell(x, y, 1.4, 1); }
        }
      }
      return A.shadow(12, 2.6) + earth(8) + gartSway(o, r, A.S(L[0], 1, stems) + F.out() + A.P(flc, flw) + A.P(col[1], fruit) + A.P(col[2], fruitL, 0.85) + A.P('#4a7a2a', caps)) + (win ? snowFoot(10) : '');
    },
  });

  /* ---------- floret (broccoli): big blue-green leaves, a domed head of tight florets ---------- */
  gartDefine('form:floret', {
    box: [44, 38],
    draw(o, r) {
      const col = colOf(o, '#3f7d3a'), s = o.s5, L = gartLeafSeason((o.look && o.look.leaf) || '#6a9a8a', o.season, 'perennial'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const n = s === 1 ? 3 : 7, len = s === 1 ? 7 : s === 2 ? 15 : 19;
      for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 2.6, st = A.stem(0, -1, a, len * 0.35, 0); F.leaf(st.tip[0], st.tip[1], a, len * 0.75, len * 0.24, { bulge: 0.55, vein: true }); }
      let head = '';
      if (s >= 3) {
        const R = s === 3 ? 4 : 8, y = -len * 0.62;
        let fl = '', fl2 = '';
        for (let k = 0; k < 11; k++) { const a = Math.PI + k / 10 * Math.PI, q = R * 0.62; (k < 5 ? (fl2 += A.circ(Math.cos(a) * q, y + Math.sin(a) * q * 0.7, R * 0.34)) : (fl += A.circ(Math.cos(a) * q, y + Math.sin(a) * q * 0.7, R * 0.34))); }
        head = A.P(col[0], A.ell(0, y, R, R * 0.7)) + A.P(col[1], fl) + A.P(col[2], fl2) + A.P(col[2], A.circ(-R * 0.15, y - R * 0.3, R * 0.3), 0.8);
      }
      let body = F.out() + head;
      if (win && s >= 2) body += gartSnowCap(A, 0, -len * 0.75, len * 1.2, 0.9);
      return A.shadow(16, 3) + gartSway(o, r, body);
    },
  });

  /* ---------- frilly-tall (kale): a tall stem, a palm of deeply ruffled leaves (green or purple) ---------- */
  gartDefine('form:frilly-tall', {
    box: [40, 46],
    draw(o, r) {
      const base = o.main || (o.look && o.look.leaf) || '#4b6d4a', L = A.leaf4(base), s = o.s5, win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', base);
      const H = s === 1 ? 6 : s === 2 ? 14 : 22;
      const st = A.stem(0, 0, 0, H, 0.5);
      let lv = '', lvL = '', ribs = '';
      const n = s === 1 ? 3 : s === 2 ? 6 : 10;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.4, p = st.pt(0.55 + (i % 3) * 0.2), len = (s === 1 ? 6 : 14) * rr(r, 0.8, 1.05);
        // a ruffled kale leaf: a wavy outline, many small lobes along the edge
        lv += A.blob(r, ...A.at(p[0], p[1], a, len * 0.55), len * 0.32, len * 0.55, 12, 0.75);
        lvL += A.ell(...A.at(p[0], p[1], a - 0.2, len * 0.5), len * 0.12, len * 0.24);
        const [ex, ey] = A.at(p[0], p[1], a, len * 0.95); ribs += `M${f1(p[0])} ${f1(p[1])}L${f1(ex)} ${f1(ey)}`;
      }
      let body = A.S(L[0], 2, st.d) + A.P(L[1], lv) + A.P(L[3], lvL, 0.5) + A.S(L[3], 0.7, ribs, 0.7);
      if (win && s >= 2) body += A.P(PAL.frost, lv, 0.25) + gartSnowCap(A, 0, -H - 10, 16, 0.8);
      return A.shadow(12, 2.6) + earth(7) + gartSway(o, r, body);
    },
  });

  /* ================= fruit ================= */
  /* ---------- low-fruit (strawberry): toothed trefoils on straw, white flowers, berries hanging over the edge ---------- */
  gartDefine('form:low-fruit', {
    box: [42, 22],
    draw(o, r) {
      const col = colOf(o, '#e2273b'), fl = gartC2(o, '#fbfbf6'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      let straw = '';
      for (let i = 0; i < 12; i++) { const x = rr(r, -18, 18); straw += `M${f1(x)} ${f1(-rr(r, 0, 1.6))}l${f1(rr(r, 3, 5) * (i % 2 ? 1 : -1))} ${f1(rr(r, -1, 1))}`; }
      const F = gartFoliage(L);
      let stalks = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 6;
      for (let i = 0; i < n; i++) { const a = (i / Math.max(1, n - 1) - 0.5) * 2.2, st = A.stem(0, 0, a, s === 1 ? 5 : 10, rr(r, -1, 1)); stalks += st.d; for (const k of [-0.7, 0, 0.7]) F.leaf(st.tip[0], st.tip[1], a + k, 4.6, 2, { bulge: 0.6, vein: true }); }
      let fruit = '', seeds = '', caps = '', flw = '';
      if (s >= 3 && !win) {
        for (let i = 0; i < (s === 3 ? 3 : 5); i++) {
          const x = (i / 4 - 0.5) * 30 + rr(r, -1, 1), y = -rr(r, 1, 4);
          if (s === 3 || i === 2) { flw += A.P(fl, A.star(x, y - 6, 5, 2.4, 1.6, r())) + A.P('#f2c21e', A.circ(x, y - 6, 0.8)); continue; }
          fruit += `M${f1(x - 2.4)} ${f1(y - 3)}q0-1 2.4-1q2.4 0 2.4 1q0 3-2.4 5.4q-2.4-2.4-2.4-5.4z`;
          seeds += A.circ(x - 1, y - 1.6, 0.3) + A.circ(x + 1, y - 1.4, 0.3) + A.circ(x, y, 0.3) + A.circ(x - 0.4, y - 2.8, 0.3);
          caps += A.star(x, y - 4, 5, 1.8, 0.7);
        }
      }
      return A.shadow(18, 2.4) + A.S('#e0c87a', 1.1, straw, 0.9) + gartSway(o, r, A.S(L[1], 0.7, stalks) + F.out() + flw) + A.P(col[1], fruit) + A.P('#f6e8a0', seeds, 0.9) + A.P(L[1], caps) + (win ? snowFoot(16) : '');
    },
  });

  /* ---------- cane (raspberry): upright canes on a wire, compound leaves, berries (red or golden) ---------- */
  gartDefine('form:cane', {
    box: [44, 76],
    draw(o, r) {
      const col = colOf(o, '#d62e5b'), s = o.s5, L = gartSeasonLeaf(o, 'deciduous'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const F = gartFoliage(L);
      const H = s === 1 ? 12 : s === 2 ? 40 : 70;
      let canes = '', berries = '', berriesL = '', posts = s >= 2 ? A.S('#8a6a4a', 1.6, `M-18 0v${-H * 0.85}M18 0v${-H * 0.85}`) + A.S('#9aa0a6', 0.5, `M-18 ${f1(-H * 0.5)}H18M-18 ${f1(-H * 0.8)}H18`, 0.9) : '';
      const n = s === 1 ? 2 : 5;
      for (let i = 0; i < n; i++) {
        const x = (i / Math.max(1, n - 1) - 0.5) * 24, st = A.stem(x, 0, rr(r, -0.08, 0.08), H * rr(r, 0.82, 1), rr(r, -2, 2));
        canes += st.d;
        if (win) continue;
        for (let k = 0; k < (o.lod ? 3 : 2); k++) { const p = st.pt(0.3 + k * 0.24); spray(F, p[0], p[1], (k % 2 ? 1 : -1) * 1.1, 8, 2, 1.6); }
        if (s === 4) for (let k = 0; k < 3; k++) { const p = st.pt(0.35 + k * 0.22), bx = p[0] + (k % 2 ? 3 : -3), by = p[1] + 3; let b = ''; for (let j = 0; j < 5; j++) b += A.circ(bx + (j % 2 ? 0.8 : -0.8), by + Math.floor(j / 2) * 1.1, 0.95); berries += b; berriesL += A.circ(bx - 0.6, by - 0.4, 0.6); }
      }
      return A.shadow(20, 3) + posts + gartSway(o, r, A.S(win ? '#8a5a4a' : '#7a6a3a', 1.2, canes) + F.out() + A.P(col[1], berries) + A.P(col[2], berriesL, 0.8)) + (win ? snowFoot(18) : '');
    },
  });

  /* ---------- berry-bush (blueberry, blackcurrant, gooseberry): a rounded bush with clusters of berries ---------- */
  gartDefine('form:berry-bush', {
    box: [48, 46],
    draw(o, r) {
      const kind = o.id === 'gooseberry' ? 'goose' : o.id === 'blackcurrant' ? 'currant' : 'blue';
      const col = colOf(o, kind === 'goose' ? '#a7c957' : kind === 'currant' ? '#2b2140' : '#4b5fb3'), s = o.s5, win = o.season === 'winter';
      const L = kind === 'blue' && o.season === 'autumn' ? ['#6a1a14', '#b8341e', '#e0643a', '#f4a070'] : gartSeasonLeaf(o, 'deciduous');
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 13 : 19, H = s === 1 ? 8 : s === 2 ? 22 : 34;
      let stems = '';
      for (let i = 0; i < (s === 1 ? 2 : 6); i++) { const a = (i / 5 - 0.5) * 1.4, st = A.stem(rr(r, -2, 2), 0, a, H * rr(r, 0.75, 1), rr(r, -2, 2)); stems += st.d; }
      if (!win) {
        if (s >= 2) F.add('back', A.blob(r, 0, -H * 0.55, W, H * 0.45, 10, 0.32));
        for (let i = 0; i < (s === 1 ? 3 : 18); i++) {
          const x = rr(r, -W * 0.8, W * 0.8), y = -rr(r, H * 0.2, H * 0.95), a = (x > 0 ? 0.6 : -0.6) + rr(r, -0.6, 0.6);
          if (kind === 'blue') F.leaf(x, y, a, 5, 1.7, { bulge: 0.45 });
          else F.add('base', A.blob(r, ...A.at(x, y, a, 2.4), 2.8, 2.4, 6, 0.6)).add('light', A.ell(...A.at(x, y, a - 0.3, 2), 1, 0.8));
        }
      }
      let berries = '', bloom = '', marks = '';
      if (s >= 3 && !win) {
        const n = s === 3 ? 4 : 9;
        for (let i = 0; i < n; i++) {
          const x = rr(r, -W * 0.75, W * 0.75), y = -rr(r, H * 0.25, H * 0.8);
          if (s === 3) { berries += A.circ(x, y, 1); continue; }
          if (kind === 'goose') { berries += A.ell(x, y, 2.2, 2.6); marks += `M${f1(x)} ${f1(y - 2.4)}v4.8M${f1(x - 1.2)} ${f1(y - 2)}q-0.6 2 0 4M${f1(x + 1.2)} ${f1(y - 2)}q0.6 2 0 4`; }
          else if (kind === 'currant') { for (let j = 0; j < 4; j++) berries += A.circ(x + j * 0.6, y + j * 2.2, 1.3); marks += `M${f1(x)} ${f1(y - 1.6)}q1 3 1.8 7`; }
          else { for (let j = 0; j < 3; j++) { berries += A.circ(x + (j - 1) * 2.2, y + (j % 2) * 1.6, 1.6); bloom += A.circ(x + (j - 1) * 2.2 - 0.5, y + (j % 2) * 1.6 - 0.5, 0.7); } }
        }
      }
      const bc = s === 3 ? (kind === 'goose' ? '#c8e08a' : '#a8c86a') : col[1];
      let body = A.S('#6a5a3a', 1, stems) + F.out() + A.S(kind === 'currant' ? L[1] : col[2], 0.5, marks, 0.8) + A.P(bc, berries) + A.P('#c8d8f4', bloom, 0.7);
      if (win && s >= 2) body += A.S('#6a4a3a', 0.8, A.twigs(r, [[0, -H * 0.5, -0.5, 8], [0, -H * 0.5, 0.5, 8]], 2, 0.5)) + gartSnowCap(A, 0, -H * 0.95, W, 0.9);
      return A.shadow(W + 3, 3) + gartSway(o, r, body);
    },
  });

  /* ---------- big-leaf (rhubarb): giant crinkled leaves on thick pink-red stalks ---------- */
  gartDefine('form:big-leaf', {
    box: [52, 40],
    draw(o, r) {
      const col = colOf(o, '#d04a5c'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'tuber', col[1]);
      const n = s === 1 ? 2 : s === 2 ? 4 : 6, len = s === 1 ? 8 : s === 2 ? 18 : 26;
      let stalks = '', lv = '', lvL = '', veins = '';
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2 + rr(r, -0.08, 0.08), st = A.stem(rr(r, -2, 2), 0, a, len * 0.62, (a > 0 ? 1 : -1) * 2);
        stalks += st.d;
        if (win) continue;
        const R = len * 0.42;
        lv += A.blob(r, ...A.at(st.tip[0], st.tip[1], a, R * 0.7), R, R * 0.72, 9, 0.5);
        lvL += A.blob(r, ...A.at(st.tip[0], st.tip[1], a - 0.3, R * 0.6), R * 0.45, R * 0.3, 7, 0.4);
        for (const k of [-0.7, -0.25, 0.25, 0.7]) { const [ex, ey] = A.at(st.tip[0], st.tip[1], a + k, R * 1.4); veins += `M${f1(st.tip[0])} ${f1(st.tip[1])}L${f1(ex)} ${f1(ey)}`; }
      }
      let body = A.S(col[1], s >= 3 ? 2.8 : 1.6, stalks) + A.S(col[2], 0.8, stalks, 0.6) + A.P(L[1], lv) + A.P(L[2], lvL, 0.6) + A.S(L[0], 0.6, veins, 0.55);
      if (win) body += A.P('#7a5a4a', A.blob(r, 0, -2, 8, 3, 7, 0.4)) + gartSnowCap(A, 0, -4, 18, 0.8);
      return A.shadow(20, 3) + gartSway(o, r, body);
    },
  });

  /* ---------- bramble: arching thorny canes, white flowers, blackberries ripening red to black ---------- */
  gartDefine('form:bramble', {
    box: [56, 52],
    draw(o, r) {
      const col = colOf(o, '#2a1f3d'), fl = gartC2(o, '#f7f0f4'), s = o.s5, L = gartSeasonLeaf(o, 'deciduous'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const F = gartFoliage(L);
      const H = s === 1 ? 10 : s === 2 ? 28 : 44;
      let canes = '', thorns = '', berries = '', red = '', flw = '';
      const n = s === 1 ? 2 : 5;
      for (let i = 0; i < n; i++) {
        const dir = i % 2 ? 1 : -1, x0 = rr(r, -3, 3), reach = H * (0.5 + i * 0.1) * rr(r, 0.9, 1.1), cx = x0 + dir * reach * 0.25, cy = -H * rr(r, 1.15, 1.35), ex = x0 + dir * reach, ey = -H * rr(r, 0.25, 0.45);
        const st = { d: `M${f1(x0)} 0Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)}`, pt: t => { const u = 1 - t; return [u * u * x0 + 2 * u * t * cx + t * t * ex, 2 * u * t * cy + t * t * ey]; } };
        st.ang = t => { const p = st.pt(Math.max(0, t - 0.02)), q = st.pt(Math.min(1, t + 0.02)); return Math.atan2(q[0] - p[0], p[1] - q[1]); };
        canes += st.d;
        for (let k = 1; k < 6; k++) { const p = st.pt(k / 6); thorns += `M${f1(p[0])} ${f1(p[1])}l${dir * 1.2} -1.2`; }
        if (win) continue;
        for (let k = 0; k < 3; k++) { const p = st.pt(0.3 + k * 0.22); for (const q of [-0.8, 0, 0.8]) F.leaf(p[0], p[1], st.ang(0.3 + k * 0.22) + dir * 1.1 + q * 0.5, 5, 1.9, { light: q === 0 }); }
        if (s >= 3) { const p = st.pt(0.78); if (s === 3 || i === 0) flw += A.P(fl, A.star(p[0], p[1] - 2, 5, 2.6, 1.6, r())) + A.P('#f2d070', A.circ(p[0], p[1] - 2, 0.7)); else { for (let j = 0; j < 6; j++) (j < 4 ? (berries += A.circ(p[0] + (j % 2 ? 0.9 : -0.9), p[1] + Math.floor(j / 2) * 1.2, 1)) : (red += A.circ(p[0] + 4 + (j % 2) * 0.9, p[1] + 2, 1))); } }
      }
      let body = A.S(win ? '#6a3a4a' : '#7a4a4a', 1.3, canes) + A.S('#b08080', 0.6, thorns, 0.8) + F.out() + flw + A.P(col[1], berries) + A.P('#c8202a', red);
      if (win) body += gartSnowCap(A, 0, -H * 0.7, 26, 0.8);
      return A.shadow(22, 3) + gartSway(o, r, body);
    },
  });

  /* ---------- vine-grape (grapevine): posts and wires, a gnarled trunk, palmate leaves, hanging bunches ---------- */
  gartDefine('form:vine-grape', {
    box: [56, 90],
    draw(o, r) {
      const col = colOf(o, '#6d3a8c'), s = o.s5, L = o.season === 'autumn' ? ['#6a2a14', '#b8541e', '#e09a3a', '#f4cc7a'] : gartSeasonLeaf(o, 'deciduous'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const F = gartFoliage(L);
      const H = 84;
      let frame = A.S('#8a6a4a', 2, `M-24 0V${-H}M24 0V${-H}`) + A.S('#9aa0a6', 0.5, `M-24 ${-H * 0.55}H24M-24 ${-H * 0.85}H24`, 0.9);
      const grow = s === 1 ? 0.2 : s === 2 ? 0.55 : 1;
      const trunk = A.limb(0, 0, 0.05, H * 0.55 * Math.max(0.4, grow), 4, 2.6, 3);
      let arms = '', bunches = '', bunchL = '', lvs = '';
      if (s >= 2) for (const dir of [-1, 1]) arms += `M${f1(trunk.tip[0])} ${f1(trunk.tip[1])}Q${f1(dir * 10)} ${f1(-H * 0.55 - 2)} ${f1(dir * 22 * grow)} ${f1(-H * 0.55)}`;
      if (!win) {
        const pts = s === 1 ? [trunk.tip] : [];
        if (s >= 2) for (let k = 0; k < 10; k++) { const dir = k % 2 ? 1 : -1, x = dir * (3 + Math.floor(k / 2) * 4.6) * grow + rr(r, -1.5, 1.5), y = -H * 0.55 - 5 - (k % 3) * 8 - rr(r, 0, 4); pts.push([x, y]); }
        pts.forEach(p => { for (let k = -2; k <= 2; k++) F.leaf(p[0], p[1], k * 0.55 + rr(r, -0.15, 0.15), 8.4 - Math.abs(k) * 1.5, 2.8, { light: k === 0 }); });
        if (s >= 3) for (let k = 0; k < (s === 3 ? 2 : 4); k++) {
          const dir = k % 2 ? 1 : -1, x = dir * (6 + Math.floor(k / 2) * 9), y = -H * 0.55 + 3;
          for (let j = 0; j < 9; j++) { const row = Math.floor(Math.sqrt(j * 2)), bx = x + (j - row * (row + 1) / 2 - row / 2) * 2.2, by = y + row * 2; bunches += A.circ(bx, by, s === 3 ? 0.9 : 1.3); bunchL += A.circ(bx - 0.4, by - 0.4, 0.45); }
        }
      }
      const bc = s === 3 ? ['#6a9a3a', '#9ac85a', '#d0e8a0'] : col;
      return A.shadow(22, 3) + frame + A.P('#6a4a32', trunk.d) + A.S('#6a4a32', 1.6, arms) + gartSway(o, r, F.out() + A.P(bc[1], bunches) + A.P(bc[2], bunchL, 0.7)) + (win ? A.S(PAL.snow, 1.4, `M-24 ${-H * 0.55 - 0.8}H24`, 0.9) + snowFoot(20) : '');
    },
  });
})();
