/* ============================================================
   GARDEN ART, succulents, the pond and the greenhouse exotics (2.18, agent 'garden-art'). Succulents: aloe, rosette (echeveria), spiky-rosette (zebra
   haworthia), barrel, pads (prickly pear), saguaro, trailing (string of pearls). Pond: lily-pad (water lily). Exotics: orchid, pitcher, mushroom (the glowcap),
   titan (the titan arum). The rest are rows in 94-garden-art-j-bloom.js. PURE. Anchor: the foot at (0, 0). Light from the left.
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
    box: [74, 26],
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


})();
