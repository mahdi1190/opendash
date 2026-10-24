/* ============================================================
   GARDEN ART, succulents, the pond and the greenhouse exotics (2.18, agent
   'garden-art'). Succulents: aloe, rosette (echeveria), spiky-rosette (zebra
   haworthia), jade, barrel, pads (prickly pear), saguaro, trailing (string of
   pearls). Pond: lily-pad (water lily), lotus, reed (bulrush), papyrus.
   Exotics: orchid, bird-paradise, flytrap, pitcher, passion, hibiscus, banana,
   mushroom (the glowcap), titan (the titan arum). PURE.
   Anchor: the foot at (0, 0). Light from the left.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const colOf = (o, c) => o.col || A.tone3(c);
  /** A little terracotta pot (succulents, orchids) of width w; returns [markup, rimY]. */
  function pot(w, h, glaze) {
    const T = glaze || PAL.terracotta, hw = w / 2;
    return [A.P(T[1], `M${f1(-hw * 0.88)} ${f1(-h)}h${f1(w * 0.88)}l${f1(-w * 0.1)} ${f1(h)}h${f1(-w * 0.68)}z`) + A.P(T[2], A.rrect(-hw, -h - 3, w, 3.6, 0.8)) + A.P(T[3], `M${f1(-hw * 0.7)} ${f1(-h + 1)}h${f1(w * 0.14)}l-0.6 ${f1(h - 2)}h${f1(-w * 0.1)}z`, 0.5) + A.P(T[0], A.rect(-hw, -h + 0.6, w, 0.9), 0.5), -h - 3];
  }
  /** Water under a pond plant: a flat ellipse with a ripple ring (gda-ripple) and a glint. */
  function pondWater(o, r, w) {
    const W = PAL.water;
    let s = A.P(W[1], A.ell(0, 0, w, w * 0.28)) + A.P(W[2], A.ell(-w * 0.2, -w * 0.06, w * 0.6, w * 0.13), 0.6) + A.S(W[3], 0.8, `M${f1(-w * 0.6)} ${f1(w * 0.05)}q${f1(w * 0.3)} -1.4 ${f1(w * 0.6)} 0`, 0.7);
    if (o.season === 'winter') s += A.P('#e4eef4', A.ell(0, 0, w * 0.96, w * 0.26), 0.7) + A.S('#ffffff', 0.6, `M${f1(-w * 0.5)} ${f1(-w * 0.04)}l${f1(w * 0.3)} ${f1(w * 0.08)}M${f1(w * 0.1)} ${f1(-w * 0.08)}l${f1(w * 0.3)} ${f1(w * 0.1)}`, 0.8);
    else if (o.anim) s += `<g class="gda-ripple" style="${A.T(r, 0, 4)}">${A.S(W[3], 0.7, A.ell(w * 0.35, -w * 0.02, w * 0.18, w * 0.06), 0.8)}</g>`;
    return s;
  }

  /* ================= succulents ================= */
  /* ---------- aloe: a fountain of thick toothed spears, an orange torch of flowers ---------- */
  gartDefine('form:aloe', {
    box: [40, 42],
    draw(o, r) {
      const fl = colOf(o, '#f28a3a'), s = o.s5, L = gartSeasonLeaf(o, 'succulent');
      if (s === 0) return gartSeed(o, A, 'cutting', fl[1]);
      let lv = '', lvL = '', teeth = '', spots = '';
      const n = s === 1 ? 3 : s === 2 ? 7 : 11, len = s === 1 ? 8 : s === 2 ? 16 : 22;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.4 + rr(r, -0.06, 0.06), l = len * (1 - Math.abs(a) * 0.22) * rr(r, 0.9, 1.05);
        lv += A.leaf(0, 0, a, l, l * 0.13, 0.3); lvL += A.halfLeaf(0, 0, a, l, l * 0.12, gartLit(a), 0.3);
        for (let k = 1; k < 5; k++) { const p = A.at(0, 0, a, l * k / 5), side = gartLit(a) * -1, [tx, ty] = A.at(p[0], p[1], a + side * 1.3, l * 0.1); teeth += `M${f1(p[0])} ${f1(p[1])}L${f1(tx)} ${f1(ty)}`; if (k % 2) spots += A.ell(...A.at(0, 0, a, l * k / 5 + 1), 0.6, 0.4); }
      }
      let spike = '';
      if (s === 4) { const st = A.stem(2, -6, 0.12, 30, 1); spike = A.S('#8a7a5a', 1.2, st.d); for (let k = 0; k < 9; k++) { const p = st.pt(0.55 + k * 0.05); spike += A.P(k < 5 ? fl[1] : fl[2], A.leaf(p[0], p[1], Math.PI + (k % 2 ? 0.5 : -0.5), 3.6, 0.8)); } }
      return A.shadow(16, 2.6) + gartSway(o, r, spike) + A.P(L[1], lv) + A.P(L[2], lvL, 0.8) + A.S(L[3], 0.5, teeth) + A.P(L[3], spots, 0.7);
    },
  });

  /* ---------- rosette (echeveria): a perfect rose of plump leaves with blushing tips, seen from above ---------- */
  gartDefine('form:rosette', {
    box: [36, 22],
    draw(o, r) {
      const base = o.main || (o.look && o.look.leaf) || '#9fc3b0', L = A.leaf4(base), tip = (o.look && o.look.c) || '#e8a0a8', s = o.s5;
      if (s === 0) return gartSeed(o, A, 'cutting', base);
      const R = s === 1 ? 5 : s === 2 ? 9 : 14;
      let rings = '';
      // three rings of fat pointed leaves, the inner ones smaller and paler, tips touched with pink
      [[1, 10, L[0]], [0.72, 8, L[1]], [0.44, 6, L[2]]].forEach(([k, n, c], ri) => {
        let d = '', tips = '';
        for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + ri * 0.4, ex = Math.cos(a) * R * k, ey = Math.sin(a) * R * k * 0.5 - R * 0.35 - ri * 1.2, ang = Math.atan2(ex, -(ey + R * 0.35 + ri * 1.2)), len = Math.hypot(ex, ey + R * 0.35 + ri * 1.2);
          d += A.leaf(0, -R * 0.35 - ri * 1.2, ang, len, len * 0.3, 0.55);
          tips += A.circ(ex, ey, Math.max(0.5, R * 0.05));
        }
        rings += A.P(c, d) + (s >= 3 ? A.P(tip, tips, 0.85) : '');
      });
      let fl = '';
      if (s === 4) { const st = A.stem(R * 0.5, -R * 0.4, 0.6, 16, -3); fl = A.S('#c88a6a', 1, st.d) + A.P(tip, A.star(st.tip[0], st.tip[1], 5, 2.2, 1) + A.star(st.tip[0] - 2.4, st.tip[1] + 3, 5, 1.8, 0.8)); }
      return A.shadow(R + 2, 2.2) + rings + A.P(L[3], A.ell(-R * 0.1, -R * 0.75, R * 0.2, R * 0.12), 0.8) + fl;
    },
  });

  /* ---------- spiky-rosette (zebra haworthia): stiff dark spears banded with white stripes ---------- */
  gartDefine('form:spiky-rosette', {
    box: [30, 28],
    draw(o, r) {
      const L = A.leaf4((o.look && o.look.leaf) || '#3f6e4a'), stripe = o.main || '#f4f6f2', s = o.s5;
      if (s === 0) return gartSeed(o, A, 'cutting', L[1]);
      let lv = '', lvL = '', bands = '';
      const n = s === 1 ? 4 : s === 2 ? 9 : 14, len = s === 1 ? 6 : s === 2 ? 12 : 18;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2 + rr(r, -0.08, 0.08), l = len * (1 - Math.abs(a) * 0.25) * rr(r, 0.88, 1.05);
        lv += A.leaf(0, 0, a, l, l * 0.12, 0.3); lvL += A.halfLeaf(0, 0, a, l, l * 0.11, gartLit(a), 0.3);
        for (let k = 1; k < 6; k++) { const p = A.at(0, 0, a, l * k / 6.5), w = l * 0.1 * (1 - k / 7); bands += `M${f1(p[0] - Math.cos(a) * w)} ${f1(p[1] - Math.sin(a) * w)}L${f1(p[0] + Math.cos(a) * w)} ${f1(p[1] + Math.sin(a) * w)}`; }
      }
      return A.shadow(10, 2) + A.P(L[0], lv) + A.P(L[1], lvL) + A.S(stripe, 0.7, bands, 0.85);
    },
  });

  /* ---------- jade: a little tree of thick stems and round, shiny, fleshy leaves ---------- */
  gartDefine('form:jade', {
    box: [40, 44],
    draw(o, r) {
      const fl = colOf(o, '#f7f0f4'), s = o.s5, L = gartSeasonLeaf(o, 'succulent');
      if (s === 0) return gartSeed(o, A, 'cutting', L[1]);
      const k = s === 1 ? 0.35 : s === 2 ? 0.6 : s === 3 ? 0.85 : 1;
      const tr = A.limb(0, 0, 0.04, 16, 4.4, 3, 1), b1 = A.limb(tr.tip[0], tr.tip[1], -0.7, 12, 2.8, 1.6, -1), b2 = A.limb(tr.tip[0], tr.tip[1], 0.6, 13, 2.8, 1.6, 1), b3 = A.limb(tr.tip[0], tr.tip[1], 0.02, 10, 2.4, 1.4, 0);
      let lv = '', lvL = '', edge = '';
      [b1, b2, b3].forEach(b => { for (let i = 0; i < 6; i++) { const [x, y] = A.at(b.tip[0], b.tip[1], (i / 5 - 0.5) * 2.6, 3.4 + (i % 2) * 2); lv += A.ell(x, y, 2.6, 2); lvL += A.ell(x - 0.7, y - 0.6, 1.1, 0.8); edge += A.ell(x, y, 2.6, 2); } });
      let flw = '';
      if (s === 4) [b1, b2, b3].forEach(b => { flw += A.star(b.tip[0], b.tip[1] - 6, 5, 1.8, 0.7) + A.star(b.tip[0] + 2, b.tip[1] - 5, 5, 1.6, 0.6); });
      const tree = A.P('#7a6a4a', tr.d + b1.d + b2.d + b3.d) + A.S('#a8946a', 0.7, 'M-1-1L-0.6-14', 0.6) + A.P(L[1], lv) + A.S('#c86a6a', 0.5, edge, 0.5) + A.P(L[3], lvL, 0.8) + A.P(fl[1], flw);
      return A.shadow(14, 2.4) + `<g transform="scale(${k})">${tree}</g>`;
    },
  });

  /* ---------- barrel: a round ribbed cactus, spines in rows, a crown of flowers ---------- */
  gartDefine('form:barrel', {
    box: [36, 34],
    draw(o, r) {
      const fl = colOf(o, '#f05a7e'), s = o.s5, L = gartSeasonLeaf(o, 'succulent');
      if (s === 0) return gartSeed(o, A, 'spore', fl[1]);
      const R = s === 1 ? 4 : s === 2 ? 8 : s === 3 ? 11 : 12;
      let ribs = '', spines = '';
      for (let k = -2; k <= 2; k++) { const x = k * R * 0.36; ribs += `M${f1(x * 0.6)} ${f1(-R * 1.85)}Q${f1(x * 1.25)} ${f1(-R)} ${f1(x * 0.8)} 0`; for (let j = 1; j < 5; j++) { const t = j / 5, px = x * (0.6 + Math.sin(t * Math.PI) * 0.6), py = -R * 1.85 * (1 - t); spines += `M${f1(px)} ${f1(py)}l-1.2-1.2M${f1(px)} ${f1(py)}l1.2-1.2M${f1(px)} ${f1(py)}l0-1.6`; } }
      let crown = '';
      if (s === 4) { for (let i = 0; i < 5; i++) { const x = (i - 2) * 2.6, y = -R * 1.85 - 1 - (i % 2) * 1.4; crown += A.P(fl[1], A.star(x, y, 6, 2.6, 1.2, i)) + A.P(fl[2], A.circ(x, y, 0.8)); } }
      return A.shadow(R + 2, 2.4) + A.P(L[1], A.ell(0, -R * 0.92, R, R * 0.95)) + A.P(L[0], `M${f1(R * 0.2)} ${f1(-R * 1.85)}A${f1(R)} ${f1(R * 0.95)} 0 0 1 ${f1(R * 0.5)} 0Q${f1(R)} ${f1(-R)} ${f1(R * 0.2)} ${f1(-R * 1.85)}z`, 0.5) + A.P(L[3], A.ell(-R * 0.4, -R * 1.2, R * 0.25, R * 0.45), 0.5) + A.S(L[0], 0.8, ribs, 0.7) + A.S('#f4ecd0', 0.5, spines, 0.9) + crown;
    },
  });

  /* ---------- pads (prickly pear): flat oval pads stacked on pads, dots of spines, yellow flowers, red fruit ---------- */
  gartDefine('form:pads', {
    box: [46, 56],
    draw(o, r) {
      const fl = colOf(o, '#f4c430'), fruit = gartC2(o, '#c2185b'), s = o.s5, L = gartSeasonLeaf(o, 'succulent');
      if (s === 0) return gartSeed(o, A, 'cutting', fl[1]);
      const pads = [[0, 0, 0, 13]];
      if (s >= 2) pads.push([0, -24, -0.5, 10], [0, -24, 0.55, 10]);
      if (s >= 3) pads.push([-10, -40, -0.3, 8], [11, -41, 0.35, 8], [0, -24, 0.02, 9]);
      let P0 = '', P1 = '', dots = '', lit = '', top = [];
      pads.forEach(([x, y, a, R], i) => {
        const [cx, cy] = A.at(x, y, a, R);
        const d = `M${f1(x)} ${f1(y)}C${f1(x - R * 0.9)} ${f1(y - R * 0.2)} ${f1(cx - R * 0.8)} ${f1(cy - R * 1.2)} ${f1(cx + Math.sin(a) * R * 0.2)} ${f1(cy - R * 1.05)}C${f1(cx + R * 0.8)} ${f1(cy - R * 1.2)} ${f1(x + R * 0.9)} ${f1(y - R * 0.2)} ${f1(x)} ${f1(y)}z`;
        (i % 2 ? (P1 += d) : (P0 += d));
        lit += A.ell(cx - R * 0.32, cy - R * 0.55, R * 0.22, R * 0.38);
        for (let j = 0; j < 5; j++) dots += A.circ(cx + rr(r, -R * 0.5, R * 0.5), cy - R * 0.3 + rr(r, -R * 0.4, R * 0.5), 0.5);
        top.push([cx + Math.sin(a) * R * 0.2, cy - R * 1.05]);
      });
      let crown = '';
      if (s === 4) top.slice(-3).forEach(([x, y], i) => { crown += i === 1 ? A.P(fruit, A.ell(x, y - 2, 2.2, 3)) : A.P(fl[1], A.circ(x - 1.4, y - 2.4, 2) + A.circ(x + 1.4, y - 2.4, 2) + A.circ(x, y - 3.6, 2)) + A.P(fl[0], A.circ(x, y - 2.4, 1)); });
      return A.shadow(16, 2.6) + A.P(L[0], P0) + A.P(L[1], P1) + A.P(L[3], lit, 0.5) + A.P('#f6e8c0', dots, 0.9) + crown;
    },
  });

  /* ---------- saguaro: the desert sentinel: a tall ribbed column, two arms raised, white flowers on top ---------- */
  gartDefine('form:saguaro', {
    box: [40, 110],
    draw(o, r) {
      const fl = colOf(o, '#fbfbf6'), s = o.s5, L = gartSeasonLeaf(o, 'succulent');
      if (s === 0) return gartSeed(o, A, 'spore', L[1]);
      const H = s === 1 ? 10 : s === 2 ? 34 : s === 3 ? 74 : 100, W = s === 1 ? 3 : s === 2 ? 4.6 : 6;
      const col = (x, y, h, w) => `M${f1(x - w)} ${f1(y)}V${f1(y - h + w)}A${f1(w)} ${f1(w)} 0 0 1 ${f1(x + w)} ${f1(y - h + w)}V${f1(y)}z`;
      let body = col(0, 0, H, W), arms = '';
      if (s >= 3) {
        // the arms: out, then up
        arms += `M${-W} ${f1(-H * 0.42)}h${f1(-W * 1.4)}q-2.4 0-2.4 -2.4V${f1(-H * 0.7)}a${f1(W * 0.75)} ${f1(W * 0.75)} 0 0 1 ${f1(W * 1.5)} 0V${f1(-H * 0.42 - W * 1.5)}h${f1(W * 0.6)}z`;
        arms += `M${W} ${f1(-H * 0.56)}h${f1(W * 1.3)}q2.4 0 2.4 -2.4V${f1(-H * 0.82)}a${f1(W * 0.75)} ${f1(W * 0.75)} 0 0 0 ${f1(-W * 1.5)} 0V${f1(-H * 0.56 - W * 1.5)}h${f1(-W * 0.6)}z`;
      }
      let ribs = `M${f1(-W * 0.35)} -1V${f1(-H + W * 1.2)}M${f1(W * 0.4)} -1V${f1(-H + W * 1.2)}`;
      let crown = '';
      if (s === 4) for (let i = 0; i < 4; i++) crown += A.P(fl[1], A.star((i - 1.5) * 3, -H - 1 - (i % 2), 6, 2.4, 1.2, i)) + A.P('#f2d070', A.circ((i - 1.5) * 3, -H - 1 - (i % 2), 0.7));
      return A.shadow(14, 2.6) + A.P(L[1], body + arms) + A.P(L[0], `M${f1(W * 0.3)} 0V${f1(-H + W)}A${f1(W)} ${f1(W)} 0 0 1 ${f1(W)} ${f1(-H + W)}V0z`, 0.5) + A.S(L[0], 0.7, ribs, 0.6) + A.P(L[3], A.rect(-W * 0.85, -H + W, W * 0.35, H - W - 2), 0.4) + crown;
    },
  });

  /* ---------- trailing (string of pearls): a pot spilling strands of little green beads ---------- */
  gartDefine('form:trailing', {
    box: [36, 36],
    draw(o, r) {
      const s = o.s5, L = A.leaf4((o.look && o.look.leaf) || '#7fbf7a');
      const [potM, rim] = pot(18, 11);
      // raised on a little stand so the strands can hang
      const stand = A.P('#8a6a4a', A.rect(-7, -6, 2, 6) + A.rect(5, -6, 2, 6) + A.rect(-9, -8, 18, 2.4));
      if (s === 0) return A.shadow(10, 2) + stand + `<g transform="translate(0 -8)">${potM + A.P(PAL.soil[1], A.ell(0, rim + 0.6, 7.6, 1.4))}</g>`;
      let beads = '', beadsL = '', strands = '';
      const n = s === 1 ? 3 : s === 2 ? 5 : 7, drop = s === 1 ? 5 : s === 2 ? 12 : s === 3 ? 20 : 26;
      for (let i = 0; i < n; i++) {
        // each strand rises from the soil, spills over the rim and hangs down outside the pot
        const sx = i % 2 ? 1 : -1, x0 = sx * (2 + (i >> 1) * 2.2), len = drop * rr(r, 0.6, 1.1), top = rim - 8 - 1.6;
        let px = x0, py = top;
        strands += `M${f1(x0 * 0.4)} ${f1(top + 2)}`;
        for (let k = 0; k < len / 2.6; k++) { const out = Math.min(1, k / 3); px = x0 + sx * (out * (10 - Math.abs(x0) * 0.4)) + Math.sin(k * 0.9 + i) * 0.5; py = top + (k < 3 ? -Math.sin(k / 3 * Math.PI) * 1.6 : (k - 2) * 2.6); strands += `L${f1(px)} ${f1(py)}`; beads += A.circ(px, py, 0.95); beadsL += A.circ(px - 0.3, py - 0.3, 0.35); }
      }
      return A.shadow(12, 2) + stand + `<g transform="translate(0 -8)">${potM}</g>` + A.S(L[0], 0.4, strands) + A.P(L[1], beads) + A.P(L[3], beadsL, 0.85);
    },
  });

  /* ================= the pond ================= */
  /* ---------- lily-pad (water lily): round notched pads on the water, a star of pointed petals ---------- */
  gartDefine('form:lily-pad', {
    box: [46, 20],
    draw(o, r) {
      const col = colOf(o, '#f7c5d8'), eye = gartC2(o, '#f6c445'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -8, 1, 0.06)), win = o.season === 'winter';
      let out = pondWater(o, r, 22);
      if (s === 0) return out + A.P('#8a6a4a', A.ell(0, -0.4, 2.4, 1)) + A.S('#d8ecf6', 0.6, A.ell(0, 0, 4, 1.3), 0.8);
      let pads = '', padsL = '', notches = '';
      const n = s === 1 ? 1 : s === 2 ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const x = [-6, 8, -12, 12][i] + rr(r, -1, 1), y = [-1, 0.5, 1.4, -1.6][i], R = (s === 1 ? 4 : 7) * rr(r, 0.85, 1.1), a = rr(r, 0, 6.28);
        // a pad: a flat disc with its V-shaped notch
        pads += `M${f1(x)} ${f1(y)}L${f1(x + Math.cos(a) * R)} ${f1(y + Math.sin(a) * R * 0.38)}A${f1(R)} ${f1(R * 0.38)} 0 1 1 ${f1(x + Math.cos(a + 0.5) * R)} ${f1(y + Math.sin(a + 0.5) * R * 0.38)}z`;
        padsL += A.ell(x - R * 0.3, y - R * 0.08, R * 0.4, R * 0.12);
      }
      let flw = '';
      if (s >= 3 && !win) {
        const x = 2, y = -2;
        if (s === 3) flw = A.P(L[1], A.leaf(x, y + 1, 0, 6, 2.2, 0.5)) + A.P(col[1], A.leaf(x, y, 0, 3.4, 1, 0.5), 0.8);
        else {
          let back = '', front = '', inner = '';
          for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, ex = Math.cos(a) * 7, ey = Math.sin(a) * 2.6, ang = Math.atan2(ex, -ey); (Math.sin(a) < 0 ? (back += A.leaf(x, y, ang, Math.hypot(ex, ey) * 1.1 + 1.6, 1.4, 0.5)) : (front += A.leaf(x, y, ang, Math.hypot(ex, ey) + 1.2, 1.4, 0.5))); }
          for (let k = 0; k < 6; k++) inner += A.leaf(x, y, (k / 5 - 0.5) * 1.8, 5.2, 1.2, 0.5);
          flw = A.P(col[0], back) + A.P(col[1], inner) + A.P(col[2], front) + A.P(eye, A.ell(x, y - 0.8, 1.6, 1));
        }
      }
      return out + A.P(L[0], pads.replace(/A([\d.]+) ([\d.]+)/g, (m, a, b) => `A${a} ${b}`)) + A.P(L[1], pads) + A.P(L[3], padsL, 0.55) + flw;
    },
  });

  /* ---------- lotus: round pads raised on stalks, a great pink cup, a seed pod like a shower head ---------- */
  gartDefine('form:lotus', {
    box: [44, 58],
    draw(o, r) {
      const col = colOf(o, '#f49ac1'), eye = gartC2(o, '#f6d34a'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -14, 0.8, 0.08)), win = o.season === 'winter';
      let out = pondWater(o, r, 21);
      if (s === 0) return out + A.P('#a8846a', A.ell(0, -0.6, 3, 1.4));
      let stalks = '', pads = '', padsL = '';
      const n = s === 1 ? 1 : s === 2 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const x = [-9, 10, -2][i], h = [12, 20, 30][i] * (s === 1 ? 0.5 : 1), R = s === 1 ? 4 : 8;
        stalks += `M${f1(x * 0.3)} 0Q${f1(x)} ${f1(-h * 0.5)} ${f1(x)} ${f1(-h)}`;
        if (win && i > 0) continue;
        // a shallow bowl of a leaf, seen from the side
        pads += `M${f1(x - R)} ${f1(-h - 1)}Q${f1(x)} ${f1(-h + R * 0.45)} ${f1(x + R)} ${f1(-h - 1.6)}Q${f1(x)} ${f1(-h - R * 0.2)} ${f1(x - R)} ${f1(-h - 1)}z`;
        padsL += A.ell(x - R * 0.3, -h - 0.4, R * 0.4, R * 0.1);
      }
      let flw = '';
      if (s >= 3 && !win) {
        const x = 3, y = -40;
        stalks += `M1 0Q4 -20 ${x} ${y}`;
        if (s === 3) flw = A.P(col[1], A.leaf(x, y + 2, 0, 9, 3, 0.45)) + A.P(col[2], A.leaf(x - 1, y + 1, -0.1, 6, 1.2, 0.45), 0.8);
        else {
          let back = '', mid = '', front = '';
          for (const a of [-1.2, -0.6, 0, 0.6, 1.2]) back += A.leaf(x, y + 2, a, 10, 2.4, 0.45);
          for (const a of [-0.8, -0.25, 0.3, 0.85]) mid += A.leaf(x, y + 3, a, 9, 2.4, 0.45);
          for (const a of [-0.4, 0.45]) front += A.leaf(x, y + 4, a, 7.6, 2.6, 0.45);
          flw = A.P(col[0], back) + A.P(col[1], mid) + A.P(eye, `M${f1(x - 2.6)} ${f1(y - 2)}h5.2l-0.8 2.6h-3.6z`) + A.P(col[2], front);
        }
      }
      if (win) flw = A.P('#8a7a5a', `M${f1(-1.6)} -26h5l-0.6 3h-3.8z`) + A.S('#7a6a4a', 0.8, 'M0 0Q2 -12 1 -24');
      return out + A.S(L[0], 1, stalks) + A.P(L[1], pads) + A.P(L[3], padsL, 0.55) + flw;
    },
  });

  /* ---------- reed (bulrush): tall straps from the water, velvet brown cattails ---------- */
  gartDefine('form:reed', {
    box: [36, 90],
    draw(o, r) {
      const head = colOf(o, '#7a4b2a'), s = o.s5, L = gartSeasonLeaf(o, 'perennial'), win = o.season === 'winter';
      let out = pondWater(o, r, 17);
      if (s === 0) return out + A.S(L[2], 1.2, 'M-1 0l0.4-5M2 0l-0.2-4');
      let straps = '', straps2 = '', stems = '', heads = '', fluff = '';
      const n = s === 1 ? 3 : s === 2 ? 6 : 9, H = s === 1 ? 14 : s === 2 ? 44 : 78;
      for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 0.7, h = H * rr(r, 0.7, 1), st = A.stem(rr(r, -4, 4), 0, a, h, (a > 0 ? 1 : -1) * rr(r, 2, 6)), w = 1.4; const d = `M${f1(st.pt(0)[0] - w)} 0Q${f1(st.pt(0.5)[0])} ${f1(st.pt(0.5)[1])} ${f1(st.tip[0])} ${f1(st.tip[1])}Q${f1(st.pt(0.5)[0] + w)} ${f1(st.pt(0.5)[1])} ${f1(st.pt(0)[0] + w)} 0z`; (i % 2 ? (straps += d) : (straps2 += d)); }
      if (s >= 3) for (let i = 0; i < (s === 3 ? 2 : 3); i++) {
        const x = (i - 1) * 5, h = H * 0.95 - Math.abs(i - 1) * 8;
        stems += `M${f1(x * 0.6)} 0L${f1(x)} ${f1(-h - 8)}`;
        heads += A.rrect(x - 2.2, -h + 1, 4.4, s === 3 ? 7 : 13, 2.2);
        if (win) fluff += A.circ(x + 2, -h - 1, 2.2) + A.circ(x + 3.6, -h + 2, 1.6);
      }
      return out + A.P(win ? '#a8946a' : L[1], straps2) + A.P(win ? '#c8b48a' : L[2], straps) + A.S(win ? '#a8946a' : L[1], 1, stems) + A.P(head[1], heads) + A.P(head[2], heads.replace(/M([-\d.]+) ([-\d.]+)h([\d.]+)/g, (m, x, y, w) => `M${x} ${y}h${f1(w * 0.4)}`), 0.5) + A.P('#f4efe4', fluff, 0.9);
    },
  });

  /* ---------- papyrus: tall green stems, each crowned by a starburst of fine threads ---------- */
  gartDefine('form:papyrus', {
    box: [48, 100],
    draw(o, r) {
      const s = o.s5, L = gartSeasonLeaf(o, 'perennial').map(c => A.shift(c, -6, 1, 0.04)), win = o.season === 'winter';
      let out = pondWater(o, r, 18);
      if (s === 0) return out + A.S(L[2], 1.2, 'M0 0l0-5');
      let stems = '', burst = '', burst2 = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 6, H = s === 1 ? 14 : s === 2 ? 50 : 88;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 0.8, st = A.stem(rr(r, -3, 3), 0, a, H * rr(r, 0.75, 1), rr(r, -3, 3)), [tx, ty] = st.tip;
        stems += st.d;
        const R = s === 1 ? 4 : 13;
        for (let k = 0; k < 16; k++) { const g = (k / 15 - 0.5) * 3.6 + a, [ex, ey] = A.at(tx, ty, g, R * rr(r, 0.8, 1.1)); const d = `M${f1(tx)} ${f1(ty)}Q${f1((tx + ex) / 2)} ${f1(Math.min(ty, ey) - 3)} ${f1(ex)} ${f1(ey + 2)}`; (k % 2 ? (burst += d) : (burst2 += d)); }
      }
      return out + A.S(L[1], 1.3, stems) + A.S(win ? '#b8a87a' : L[1], 0.7, burst2) + A.S(win ? '#d8c89a' : L[2], 0.6, burst);
    },
  });

  /* ================= greenhouse exotics ================= */
  /* ---------- orchid: a moth orchid in a pot, broad leaves, an arching spray of flat flowers ---------- */
  gartDefine('form:orchid', {
    box: [40, 52],
    draw(o, r) {
      const col = colOf(o, '#f2a7d8'), lip = gartC2(o, '#c4507a'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen');
      const [potM, rim] = pot(16, 12, ['#5a7a8a', '#7a9aaa', '#a8c4d0', '#d0e4ec']);
      let out = A.shadow(10, 2) + potM;
      if (s === 0) return out + A.P(PAL.soil[2], A.ell(0, rim + 0.6, 7, 1.4)) + A.P('#a8846a', A.ell(-2, rim, 1.4, 0.9) + A.ell(2, rim - 0.4, 1.2, 0.8));
      const F = gartFoliage(L);
      for (let i = 0; i < (s === 1 ? 2 : 4); i++) F.leaf(0, rim + 1, (i % 2 ? 1 : -1) * (1.1 + i * 0.1), (s === 1 ? 7 : 12) - i, 3, { bulge: 0.5, vein: true });
      let spike = '', flw = '';
      if (s >= 3) {
        const st = A.stem(1, rim, 0.25, 32, -8);
        spike = st.d;
        const nf = s === 3 ? 0 : 5;
        for (let k = 0; k < nf; k++) {
          const p = st.pt(0.5 + k * 0.12), R = 4 - k * 0.3;
          // a flat moth flower: two wide petals, three sepals, a curled lip
          flw += A.P(col[0], A.leaf(p[0], p[1], -0.1, R * 1.4, R * 0.3) + A.leaf(p[0], p[1], 2.4, R * 1.2, R * 0.3) + A.leaf(p[0], p[1], -2.4, R * 1.2, R * 0.3))
            + A.P(col[1], A.ell(p[0] - R * 0.7, p[1] + 0.2, R * 0.75, R * 0.6) + A.ell(p[0] + R * 0.7, p[1] + 0.2, R * 0.75, R * 0.6)) + A.P(lip, A.ell(p[0], p[1] + R * 0.45, R * 0.4, R * 0.36)) + A.P('#f6d040', A.circ(p[0], p[1] + 0.1, R * 0.15));
        }
        if (s === 3) for (let k = 0; k < 5; k++) { const p = st.pt(0.55 + k * 0.1); flw += A.P(L[2], A.circ(p[0], p[1] + 1, 1.2)); }
      }
      return out + A.S('#6a5a4a', 0.9, spike) + F.out() + flw;
    },
  });

  /* ---------- bird-paradise: paddle leaves on long stalks, an orange-and-blue bird's head flower ---------- */
  gartDefine('form:bird-paradise', {
    box: [48, 84],
    draw(o, r) {
      const orange = colOf(o, '#f68b1f'), blue = gartC2(o, '#3b5bdb'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -4, 0.85, 0.04));
      if (s === 0) return gartSeed(o, A, 'seed', orange[1]);
      let stalks = '', lv = '', lvL = '', ribs = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 6, H = s === 1 ? 14 : s === 2 ? 40 : 66;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.1, st = A.stem(rr(r, -2, 2), 0, a, H * rr(r, 0.5, 0.7), rr(r, -2, 2)), l = H * 0.42;
        stalks += st.d;
        lv += A.leaf(st.tip[0], st.tip[1], a * 1.3, l, l * 0.2, 0.45); lvL += A.halfLeaf(st.tip[0], st.tip[1], a * 1.3, l, l * 0.19, gartLit(a * 1.3), 0.45);
        const [ex, ey] = A.at(st.tip[0], st.tip[1], a * 1.3, l * 0.95); ribs += `M${f1(st.tip[0])} ${f1(st.tip[1])}L${f1(ex)} ${f1(ey)}`;
      }
      let bird = '';
      if (s >= 3) {
        const st = A.stem(2, 0, 0.18, H * 0.75, -2), [tx, ty] = st.tip;
        stalks += st.d;
        // the beak (a green-purple sheath) pointing sideways; orange crests rising from it, a blue tongue
        bird = A.P('#5a6a4a', `M${f1(tx - 3)} ${f1(ty)}Q${f1(tx + 6)} ${f1(ty - 3)} ${f1(tx + 15)} ${f1(ty + 1)}Q${f1(tx + 5)} ${f1(ty + 2.6)} ${f1(tx - 3)} ${f1(ty)}z`);
        if (s === 4) bird += A.P(orange[1], A.leaf(tx + 4, ty - 1.5, -0.3, 10, 1.6) + A.leaf(tx + 5, ty - 1.5, 0.1, 9, 1.5) + A.leaf(tx + 6, ty - 1.5, 0.5, 8, 1.4)) + A.P(orange[2], A.leaf(tx + 4, ty - 1.5, -0.3, 7, 0.6), 0.8) + A.P(blue, A.leaf(tx + 5, ty - 1.4, 1.0, 9, 1.2));
        else bird += A.P(orange[0], A.leaf(tx + 4, ty - 1.4, 0.4, 4, 1), 0.8);
      }
      return A.shadow(14, 2.6) + gartSway(o, r, A.S(L[0], 1.2, stalks) + A.P(L[1], lv) + A.P(L[2], lvL, 0.6) + A.S(L[0], 0.5, ribs, 0.6) + bird);
    },
  });

  /* ---------- flytrap: a rosette of hinged traps, red inside, lined with teeth ---------- */
  gartDefine('form:flytrap', {
    box: [40, 24],
    draw(o, r) {
      const red = colOf(o, '#d94a3a'), s = o.s5, L = gartSeasonLeaf(o, 'succulent').map(c => A.shift(c, -20, 1.1, 0.04));
      if (s === 0) return gartSeed(o, A, 'spore', red[1]);
      let stalks = '', outer = '', inner = '', teeth = '';
      const n = s === 1 ? 3 : s === 2 ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.8, len = (s === 1 ? 5 : s === 2 ? 9 : 12) * rr(r, 0.85, 1.05), [tx, ty] = A.at(0, 0, a, len);
        stalks += A.leaf(0, 0, a, len, 1.2, 0.6);
        if (s < 2) continue;
        // a trap: two lobes open like a clam, teeth on the rims
        const R = s === 2 ? 2.6 : 3.8, g = a;
        const up = A.at(tx, ty, g - 0.9, R), dn = A.at(tx, ty, g + 0.9, R);
        outer += `M${f1(tx)} ${f1(ty)}Q${f1(up[0])} ${f1(up[1])} ${f1(A.at(tx, ty, g, R * 1.5)[0])} ${f1(A.at(tx, ty, g, R * 1.5)[1])}Q${f1(dn[0])} ${f1(dn[1])} ${f1(tx)} ${f1(ty)}z`;
        inner += A.ell(...A.at(tx, ty, g, R * 0.75), R * 0.5, R * 0.35);
        for (let k = 0; k < 5; k++) { const p = A.at(tx, ty, g - 0.6 + k * 0.3, R * 1.3); teeth += `M${f1(p[0])} ${f1(p[1])}l${f1(Math.sin(g - 0.6 + k * 0.3) * 1.6)} ${f1(-Math.cos(g - 0.6 + k * 0.3) * 1.6)}`; }
      }
      return A.shadow(12, 2) + A.P(L[1], stalks) + A.P(L[2], outer) + A.P(red[1], inner) + A.S(L[3], 0.5, teeth);
    },
  });

  /* ---------- pitcher: tall veined pitchers with lids, rising from a rosette ---------- */
  gartDefine('form:pitcher', {
    box: [40, 52],
    draw(o, r) {
      const col = colOf(o, '#a3243a'), green = gartC2(o, '#9fc35a'), s = o.s5, L = gartSeasonLeaf(o, 'perennial');
      if (s === 0) return gartSeed(o, A, 'spore', col[1]);
      let tubes = '', tubesL = '', mouths = '', lids = '', veins = '', base = '';
      const n = s === 1 ? 2 : s === 2 ? 3 : 5;
      for (let i = 0; i < n; i++) {
        const x = (i / Math.max(1, n - 1) - 0.5) * 30, h = (s === 1 ? 10 : s === 2 ? 26 : 42) * (1 - Math.abs(x) / 40) * rr(r, 0.8, 1.05), w = h * 0.07 + 1.3;
        tubes += `M${f1(x - w * 0.5)} 0Q${f1(x - w * 1.1)} ${f1(-h * 0.6)} ${f1(x - w)} ${f1(-h)}H${f1(x + w)}Q${f1(x + w * 1.1)} ${f1(-h * 0.6)} ${f1(x + w * 0.5)} 0z`;
        mouths += A.ell(x, -h, w, w * 0.4);
        tubesL += A.rect(x - w * 0.82, -h * 0.92, w * 0.38, h * 0.7);
        lids += `M${f1(x - w * 0.6)} ${f1(-h - w * 0.3)}Q${f1(x + w * 0.4)} ${f1(-h - w * 2.2)} ${f1(x + w * 1.6)} ${f1(-h - w * 0.8)}Q${f1(x + w * 0.4)} ${f1(-h - w * 0.6)} ${f1(x - w * 0.6)} ${f1(-h - w * 0.3)}z`;
        veins += `M${f1(x - w * 0.5)} ${f1(-h * 0.2)}q${f1(w * 0.2)} ${f1(-h * 0.4)} 0 ${f1(-h * 0.7)}M${f1(x + w * 0.3)} ${f1(-h * 0.25)}q${f1(w * 0.2)} ${f1(-h * 0.4)} 0 ${f1(-h * 0.65)}`;
        base += A.leaf(x * 0.3, 0, (x < 0 ? -1 : 1) * 1.2, 7, 2);
      }
      return A.shadow(14, 2.4) + A.P(L[1], base) + A.P(green, tubes) + A.S(col[1], 0.8, veins, 0.85) + A.P(col[0], mouths) + A.P(col[1], lids) + A.P(A.lt(green, 0.4), tubesL, 0.55);
    },
  });

  /* ---------- passion: a vine on a fan trellis, the clockwork flower with its purple crown of filaments ---------- */
  gartDefine('form:passion', {
    box: [46, 76],
    draw(o, r) {
      const corona = colOf(o, '#8f7be8'), petal = gartC2(o, '#f7f5f0'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -6, 1, 0.04));
      if (s === 0) return gartSeed(o, A, 'seed', corona[1]);
      const F = gartFoliage(L);
      const H = 72, climb = s === 1 ? 0.15 : s === 2 ? 0.5 : s === 3 ? 0.85 : 1;
      let trellis = A.S('#b08a5a', 1.2, `M0 0L-18 ${-H}M0 0L-6 ${-H}M0 0L6 ${-H}M0 0L18 ${-H}M-14 ${-H * 0.5}H14M-17 ${-H * 0.8}H17`), vine = 'M0 0';
      const pts = [];
      for (let i = 1; i <= 9 * climb; i++) { const y = -i * 8, x = Math.sin(i * 1.4) * 10 * (i / 9); vine += `L${f1(x)} ${f1(y)}`; pts.push([x, y]); F.leaf(x, y, (i % 2 ? 1 : -1) * 0.9, 6, 1.6).leaf(x, y, (i % 2 ? 1 : -1) * 0.9 - 0.6, 5, 1.4).leaf(x, y, (i % 2 ? 1 : -1) * 0.9 + 0.6, 5, 1.4); }
      let flw = '';
      if (s >= 3) pts.filter((p, i) => i % 3 === 2).forEach(([x, y]) => {
        const fx = x + 6, fy = y + 2;
        if (s === 3) { flw += A.P(L[2], A.ell(fx, fy, 1.8, 2.6)); return; }
        let fil = '';
        for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; fil += `M${f1(fx + Math.cos(a) * 1.4)} ${f1(fy + Math.sin(a) * 1.1)}L${f1(fx + Math.cos(a) * 5.2)} ${f1(fy + Math.sin(a) * 4)}`; }
        flw += A.P(petal, A.star(fx, fy, 10, 6.6, 4, 0.2)) + A.S(corona[1], 0.6, fil) + A.P(corona[0], A.circ(fx, fy, 1.6)) + A.S('#6a8a3a', 0.8, `M${f1(fx - 2)} ${f1(fy - 1.6)}l4 0M${f1(fx)} ${f1(fy - 3)}l0 2.6`);
      });
      return A.shadow(12, 2.4) + trellis + gartSway(o, r, A.S(L[1], 1, vine) + F.out() + flw);
    },
  });

  /* ---------- hibiscus: a glossy bush, huge five-petal saucers with a long beaded stamen ---------- */
  gartDefine('form:hibiscus', {
    box: [48, 54],
    draw(o, r) {
      const col = colOf(o, '#e8344e'), stam = gartC2(o, '#f6d34a'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen');
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 14 : 20, H = s === 1 ? 9 : s === 2 ? 26 : 44;
      if (s >= 2) F.add('back', A.blob(r, 0, -H * 0.5, W, H * 0.48, 10, 0.3));
      for (let i = 0; i < (s === 1 ? 3 : 18); i++) { const x = rr(r, -W * 0.8, W * 0.8), y = -rr(r, H * 0.15, H * 0.95), a = (x > 0 ? 0.6 : -0.6) + rr(r, -0.7, 0.7); F.leaf(x, y, a, 6, 2.4, { vein: true }); }
      let flw = '';
      if (s >= 3) for (let i = 0; i < (s === 3 ? 3 : 4); i++) {
        const x = (i / 3 - 0.5) * W * 1.4 + rr(r, -2, 2), y = -H * (0.55 + (i % 2) * 0.3);
        if (s === 3) { flw += A.P(col[1], A.leaf(x, y + 2, 0.3, 6, 1.8, 0.55)) + A.P(L[1], A.leaf(x, y + 3, 0.3, 3, 1.8)); continue; }
        let p5 = '';
        for (let k = 0; k < 5; k++) p5 += A.petal(x, y, k / 5 * Math.PI * 2 + 0.3, 6.4, 3.4);
        const [sx, sy] = A.at(x, y, 0.9, 7);
        flw += A.P(col[1], p5) + A.P(col[0], A.circ(x, y, 2)) + A.S(col[0], 0.5, p5.replace(/C[^z]*z/g, ''), 0.4) + A.S(stam, 0.9, `M${f1(x)} ${f1(y)}L${f1(sx)} ${f1(sy)}`) + A.P(stam, A.circ(sx, sy, 1) + A.circ(sx - 1, sy + 1, 0.7));
      }
      return A.shadow(W + 3, 3) + gartSway(o, r, F.out() + flw);
    },
  });

  /* ---------- banana: a tall soft trunk, huge torn paddle leaves, a hanging bunch and its purple bell ---------- */
  gartDefine('form:banana', {
    box: [64, 140],
    draw(o, r) {
      const fruit = colOf(o, '#f6e049'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -12, 0.95, 0.08));
      if (s === 0) return gartSeed(o, A, 'cutting', L[1]);
      const H = s === 1 ? 16 : s === 2 ? 50 : s === 3 ? 96 : 116, tw = s === 1 ? 2 : s === 2 ? 4 : 6;
      const trunk = A.limb(0, 0, 0.02, H * 0.62, tw * 2, tw * 1.4, 1);
      let lv = '', lvL = '', tears = '', ribs = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 7;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.8 + rr(r, -0.08, 0.08), st = A.stem(trunk.tip[0], trunk.tip[1], a * 0.5, H * 0.12, 0), l = H * 0.42 * rr(r, 0.85, 1.05), g = a + (a > 0 ? 0.25 : -0.25);
        lv += A.leaf(st.tip[0], st.tip[1], g, l, l * 0.16, 0.5); lvL += A.halfLeaf(st.tip[0], st.tip[1], g, l, l * 0.15, gartLit(g), 0.5);
        const [ex, ey] = A.at(st.tip[0], st.tip[1], g, l * 0.96); ribs += `M${f1(st.tip[0])} ${f1(st.tip[1])}L${f1(ex)} ${f1(ey)}`;
        // the wind-torn edges: short gaps cut across the blade
        for (let k = 1; k < 4; k++) { const p = A.at(st.tip[0], st.tip[1], g, l * k / 4.5), sd = gartLit(g); tears += `M${f1(p[0])} ${f1(p[1])}l${f1(Math.cos(g) * l * 0.16 * sd)} ${f1(Math.sin(g) * l * 0.16 * sd)}`; }
      }
      let bunch = '';
      if (s >= 3) {
        const [bx, by] = A.at(trunk.tip[0], trunk.tip[1], 0.6, 6), st = A.stem(bx, by, 2.4, 16, 3);
        bunch = A.S('#6a7a3a', 1.6, st.d);
        if (s === 4) { let b = '', bl = ''; for (let k = 0; k < 4; k++) { const p = st.pt(0.2 + k * 0.18); for (let j = 0; j < 3; j++) { b += A.leaf(p[0] - 1, p[1], -0.9 - j * 0.35, 7, 1.4, 0.5); bl += A.leaf(p[0] - 1, p[1], -0.9 - j * 0.35, 5, 0.4, 0.5); } } bunch += A.P(fruit[1], b) + A.P(fruit[2], bl, 0.7); }
        bunch += A.P('#7a2a4a', A.leaf(st.tip[0], st.tip[1] - 1, Math.PI, 7, 2.6, 0.45)) + A.P('#a8406a', A.leaf(st.tip[0] - 0.6, st.tip[1], Math.PI, 5, 0.9, 0.45), 0.7);
      }
      return A.shadow(20, 3) + A.P('#8a9a5a', trunk.d) + A.S('#6a7a3a', 0.8, `M${-tw * 0.4} -2V${f1(-H * 0.55)}M${tw * 0.5} -4V${f1(-H * 0.5)}`, 0.6) + gartSway(o, r, A.P(L[1], lv) + A.P(L[2], lvL, 0.6) + A.S(L[0], 0.7, ribs, 0.7) + A.S('#f2f6e8', 0.7, tears, 0.8) + bunch);
    },
  });

  /* ---------- mushroom (the glowcap): a ring of little caps on pale stems that glow teal in the dark ---------- */
  gartDefine('form:mushroom', {
    box: [40, 24],
    draw(o, r) {
      const glow = colOf(o, '#7ef0d0'), stemC = gartC2(o, '#f4f0e6'), s = o.s5, dark = o.night || o.dusk;
      if (s === 0) return gartSeed(o, A, 'spore', glow[1]);
      let stems = '', caps = '', capsL = '', gills = '', halo = '', spots = '';
      const n = s === 1 ? 2 : s === 2 ? 3 : s === 3 ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const x = (i / Math.max(1, n - 1) - 0.5) * 26 + rr(r, -1.5, 1.5), h = (s <= 2 ? 4 : 6) + rr(r, 0, 9) - Math.abs(x) * 0.15, R = (s <= 2 ? 3 : 4.6) * rr(r, 0.8, 1.15);
        stems += `M${f1(x - R * 0.24)} 0Q${f1(x - R * 0.34)} ${f1(-h * 0.5)} ${f1(x - R * 0.18)} ${f1(-h)}H${f1(x + R * 0.18)}Q${f1(x + R * 0.34)} ${f1(-h * 0.5)} ${f1(x + R * 0.24)} 0z`;
        caps += `M${f1(x - R)} ${f1(-h)}Q${f1(x - R)} ${f1(-h - R * 1.1)} ${f1(x)} ${f1(-h - R * 1.1)}Q${f1(x + R)} ${f1(-h - R * 1.1)} ${f1(x + R)} ${f1(-h)}z`;
        capsL += A.ell(x - R * 0.4, -h - R * 0.6, R * 0.3, R * 0.2);
        gills += A.ell(x, -h, R * 0.95, R * 0.18);
        spots += A.circ(x + R * 0.3, -h - R * 0.7, R * 0.12) + A.circ(x - R * 0.1, -h - R * 0.9, R * 0.1);
        if (dark && s >= 3) halo += A.circ(x, -h - R * 0.5, R * 2.6);
      }
      const capCol = dark ? glow[2] : glow[1];
      return A.shadow(16, 2) + (halo ? `<g class="gda-glow" style="${A.T(r, 0, 3)}">${A.P(glow[1], halo, 0.22)}</g>` : '') + A.P(dark ? '#e8fff8' : stemC, stems) + A.P(A.dk(glow[1], 0.2), gills, 0.8) + A.P(capCol, caps) + A.P('#ffffff', capsL, dark ? 0.8 : 0.5) + A.P('#ffffff', spots, 0.7);
    },
  });

  /* ---------- titan (the titan arum): one giant umbrella leaf most of the time; the rare bloom, a frilled wine-red spathe ---------- */
  gartDefine('form:titan', {
    box: [64, 150],
    draw(o, r) {
      const wine = colOf(o, '#7a1a3a'), spadix = gartC2(o, '#e6d36a'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen');
      if (s === 0) return gartSeed(o, A, 'tuber', wine[1]);
      if (s < 4) {
        // the leaf: a single mottled stalk like a sapling, an umbrella of cut leaflets on top
        const H = s === 1 ? 20 : s === 2 ? 60 : 110, st = A.stem(0, 0, 0.02, H, 2);
        let lv = '', lvL = '', mott = '';
        for (let i = 0; i < 9; i++) { const a = (i / 8 - 0.5) * 3.2, l = H * 0.3; lv += A.leaf(st.tip[0], st.tip[1], a, l, l * 0.2, 0.45); lvL += A.halfLeaf(st.tip[0], st.tip[1], a, l, l * 0.18, gartLit(a), 0.45); }
        for (let k = 0; k < 6; k++) { const p = st.pt(0.1 + k * 0.14); mott += A.ell(p[0] + (k % 2 ? 0.8 : -0.8), p[1], 1, 1.6); }
        return A.shadow(16, 3) + A.S('#6a7a5a', s === 1 ? 2 : 4, st.d) + A.P('#e6ead8', mott, 0.6) + gartSway(o, r, A.P(L[1], lv) + A.P(L[2], lvL, 0.6));
      }
      // the bloom: a tall pale spadix rising out of a frilled cup, dark wine inside, green outside
      const H = 140;
      let s1 = A.P('#5a7a4a', `M-26 -10Q-30 -50 -22 -70Q-10 -58 0 -60Q12 -58 22 -72Q30 -50 26 -10Q0 4 -26 -10z`);
      s1 += A.P(wine[1], `M-22 -16Q-26 -48 -20 -64Q-8 -54 0 -56Q10 -54 20 -66Q26 -46 22 -16Q0 -6 -22 -16z`) + A.P(wine[0], `M0 -56Q10 -54 20 -66Q26 -46 22 -16Q10 -12 2 -12z`, 0.6) + A.S(wine[2], 1, 'M-18 -60q8 6 18 4q10 2 18-6', 0.7);
      s1 += A.P(spadix, `M-5 -40Q-6 -100 -2 ${-H}Q0 ${-H - 4} 2 ${-H}Q6 -100 5 -40z`) + A.P(A.lt(spadix, 0.35), `M-3.6 -44Q-4.4 -96 -1.6 ${-H + 4}Q-1.6 -96 -1 -44z`, 0.8);
      return A.shadow(28, 4) + s1 + A.P('#5a7a4a', 'M-26 -10Q0 4 26 -10L22 0H-22z');
    },
  });
  /* ---------- the pickerel weed: glossy arrow-heart leaves standing out of the water, a spike of blue ---------- */
  gartDefine('plant:pickerel-weed', {
    box: [40, 50],
    draw(o, r) {
      const col = colOf(o, '#6c7fd8'), s = o.s5, L = gartSeasonLeaf(o, 'perennial'), win = o.season === 'winter';
      let out = pondWater(o, r, 18);
      if (s === 0) return out + A.S(L[2], 1.2, 'M0 0l0.4-5');
      let stalks = '', lv = '', lvL = '', spikes = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 6, H = s === 1 ? 10 : s === 2 ? 22 : 30;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1, st = A.stem(rr(r, -3, 3), 0, a, H * rr(r, 0.75, 1), rr(r, -2, 2)), [tx, ty] = st.tip, R = s === 1 ? 3 : 6;
        stalks += st.d;
        if (win) continue;
        // an arrow-shaped heart, pointing up, glossy
        lv += `M${f1(tx)} ${f1(ty + R * 0.3)}C${f1(tx - R * 1.3)} ${f1(ty + R * 0.6)} ${f1(tx - R)} ${f1(ty - R * 1.2)} ${f1(tx)} ${f1(ty - R * 1.8)}C${f1(tx + R)} ${f1(ty - R * 1.2)} ${f1(tx + R * 1.3)} ${f1(ty + R * 0.6)} ${f1(tx)} ${f1(ty + R * 0.3)}z`;
        lvL += A.ell(tx - R * 0.35, ty - R * 0.6, R * 0.22, R * 0.6);
      }
      if (s >= 3 && !win) for (let i = 0; i < (s === 3 ? 1 : 3); i++) {
        const x = (i - 1) * 7, st = A.stem(x * 0.5, 0, x * 0.02, H + 8, 0), [tx, ty] = st.tip;
        stalks += st.d;
        for (let k = 0; k < 9; k++) spikes += A.circ(tx + (k % 2 ? 1.1 : -1.1), ty + k * 1.3, 1.3 - k * 0.04);
      }
      return out + A.S(win ? '#a8946a' : L[1], 1.1, stalks) + A.P(L[1], lv) + A.P('#ffffff', lvL, 0.35) + A.P(s === 3 ? L[2] : col[1], spikes) + A.P(col[2], spikes.replace(/a([\d.]+) ([\d.]+)/g, (m, a2, b2) => `a${f1(a2 * 0.4)} ${f1(b2 * 0.4)}`), 0.8);
    },
  });

  /* ---------- the marsh marigold: a cushion of glossy round leaves at the water's edge, shining gold cups ---------- */
  gartDefine('plant:marsh-marigold', {
    box: [40, 26],
    draw(o, r) {
      const col = colOf(o, '#f6c90e'), s = o.s5, L = gartSeasonLeaf(o, 'perennial'), win = o.season === 'winter';
      let out = pondWater(o, r, 18);
      if (s === 0) return out + A.P('#8a6a4a', A.ell(0, -0.4, 2.4, 1));
      let lv = '', lvL = '', cups = '', gloss = '', stalks = '';
      const n = s === 1 ? 3 : s === 2 ? 6 : 9;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1) - 0.5) * 24 + rr(r, -1.5, 1.5), y = -rr(r, 3, 9), R = (s === 1 ? 2.6 : 4.4) * rr(r, 0.85, 1.1);
        stalks += `M${f1(x * 0.5)} 0Q${f1(x * 0.9)} ${f1(y * 0.5)} ${f1(x)} ${f1(y)}`;
        // a round kidney leaf with its notch, glossy
        lv += `M${f1(x)} ${f1(y + R * 0.2)}A${f1(R)} ${f1(R * 0.8)} 0 1 1 ${f1(x + R * 0.5)} ${f1(y + R * 0.7)}z`;
        lvL += A.ell(x - R * 0.35, y - R * 0.3, R * 0.3, R * 0.2);
      }
      if (s >= 3 && !win) for (let i = 0; i < (s === 3 ? 3 : 6); i++) {
        const x = (i / 5 - 0.5) * 22 + rr(r, -1, 1), y = -12 - rr(r, 0, 4);
        stalks += `M${f1(x * 0.6)} -3L${f1(x)} ${f1(y)}`;
        if (s === 3) { cups += A.circ(x, y, 1.4); continue; }
        cups += `M${f1(x - 3)} ${f1(y - 2)}Q${f1(x - 3)} ${f1(y + 2)} ${f1(x)} ${f1(y + 2)}Q${f1(x + 3)} ${f1(y + 2)} ${f1(x + 3)} ${f1(y - 2)}q-1.5 0.6-3 0q-1.5 0.6-3 0z`;
        gloss += A.ell(x - 1.4, y - 0.2, 0.8, 1.2);
      }
      return out + A.S(L[1], 0.8, stalks) + A.P(L[1], lv) + A.P('#ffffff', lvL, 0.35) + A.P(s === 3 ? L[2] : col[1], cups) + A.P('#fffbe0', gloss, 0.85);
    },
  });

})();
