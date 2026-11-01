/* ============================================================
   GARDEN ART, the leafy ones (2.18, agent 'garden-art'): the forms fern, leafy (basil, mint, water mint) and frilly (parsley, coriander).
   The flowers that used to live here are rows in 94-garden-art-j-bloom.js. PURE. Anchor: the foot at (0, 0). Light from the left.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;










  /* ---------- fern: arching fronds (fiddleheads in spring, bronze in autumn) ---------- */
  gartDefine('form:fern', {
    box: [56, 46],
    draw(o, r) {
      const s = o.s5, sp = o.season === 'spring';
      const L = o.season === 'autumn' ? ['#6a3a1a', '#a85a24', '#d8883a', '#f0b86a'] : gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -8, 1.05, 0.05));
      if (s === 0) return gartSeed(o, A, 'spore', L[2]);
      let rib = '', pin1 = '', pin2 = '', curls = '', out = A.shadow(10 + s * 3, 2.8);
      const n = s === 1 ? 2 : s === 2 ? 5 : 8;
      for (let f = 0; f < n; f++) {
        const dir = f % 2 ? 1 : -1, a = dir * (0.25 + (f / n) * 0.9) + rr(r, -0.1, 0.1), len = (s === 1 ? 8 : s === 2 ? 18 : 28) * rr(r, 0.85, 1.1);
        if ((sp || s === 1) && f % 3 === 0) { const [x, y] = A.at(0, 0, a * 0.5, len * 0.6); curls += `M0 0Q${f1(x * 0.5)} ${f1(y)} ${f1(x)} ${f1(y)}a2.6 2.6 0 1 1 ${f1(dir * 2.6)} 2.2`; continue; }
        // the frond arcs over: its tip droops below its middle
        const ex = Math.sin(a) * len * 1.05, ey = -Math.cos(a) * len * 0.6, cx = Math.sin(a) * len * 0.35, cy = -len * 0.95;
        rib += `M0 0Q${f1(cx)} ${f1(cy)} ${f1(ex)} ${f1(ey)}`;
        const np = o.lod ? 9 : 6;
        for (let k = 1; k < np; k++) {
          const t = k / np, u = 1 - t, px = 2 * u * t * cx + t * t * ex, py = 2 * u * t * cy + t * t * ey, tx = 2 * u * (cx) + 2 * t * (ex - cx), ty = 2 * u * (cy) + 2 * t * (ey - cy), g = Math.atan2(tx, -ty), pl = (1 - t * 0.7) * len * 0.22;
          pin1 += A.leaf(px, py, g - 1.25, pl, pl * 0.26); pin2 += A.leaf(px, py, g + 1.25, pl, pl * 0.26);
        }
      }
      let body = A.S(L[0], 0.9, rib) + A.P(L[1], pin1) + A.P(L[2], pin2) + A.S(L[2], 1.6, curls);
      if (o.season === 'winter') body += A.P(PAL.snow, A.ell(-8, -14, 5, 1.2) + A.ell(9, -12, 4, 1), 0.9);
      return out + gartSway(o, r, body);
    },
  });



  /* ================= herbs ================= */
  /* ---------- leafy (basil, mint, water mint): a bushy pile of soft leaves; mint has square stems and lilac whorls ---------- */
  gartDefine('form:leafy', {
    box: [40, 34],
    draw(o, r) {
      const mint = o.id === 'mint' || o.id === 'water-mint', water = o.id === 'water-mint';
      const leafC = o.main && o.id === 'basil' ? o.main : (o.look && o.look.leaf) || '#3f9b3a';
      const L = gartLeafSeason(leafC, o.season, 'perennial'), fc = A.tone3((o.look && o.look.c) || '#c7a6e0'), s = o.s5, win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', L[2]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 12 : 17, H = s === 1 ? 7 : s === 2 ? 18 : 28;
      let stems = '', fl = '';
      const n = s === 1 ? 2 : s === 2 ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n - 1) - 0.5) * 1.2, st = A.stem(rr(r, -2, 2), 0, a, H * rr(r, 0.75, 1), rr(r, -2, 2));
        stems += st.d;
        for (let k = 0; k < 4; k++) {
          const p = st.pt(0.3 + k * 0.2), g = st.ang(0.3 + k * 0.2), len = (mint ? 5.4 : 6.4) * (1 - k * 0.12);
          // pairs of opposite leaves, cupped (basil: glossy and puckered; mint: toothed and pointed)
          F.leaf(p[0], p[1], g - 1.15, len, len * (mint ? 0.32 : 0.42), { bulge: mint ? 0.4 : 0.5, vein: true }).leaf(p[0], p[1], g + 1.15, len, len * (mint ? 0.32 : 0.42), { bulge: mint ? 0.4 : 0.5, vein: true });
        }
        const [tx, ty] = st.tip;
        F.leaf(tx, ty, st.ang(1) - 0.4, 3.6, 1.4).leaf(tx, ty, st.ang(1) + 0.4, 3.6, 1.4);
        if (s === 4 && mint && !win) for (let k = 0; k < 3; k++) fl += A.ell(tx, ty - 1 - k * 2.4, 1.6 - k * 0.3, 1.1);
        if (s === 4 && !mint && !win && i % 2) for (let k = 0; k < 3; k++) fl += A.ell(tx + (k % 2 ? 1 : -1), ty - 1.6 - k * 2, 1.1, 0.8);
      }
      let body = A.S(L[0], 0.9, stems) + F.out() + A.P(mint ? fc[1] : '#f4f2ea', fl);
      let out = A.shadow(W + 3, 2.6);
      if (water) out += A.P('#7cb6dc', A.ell(0, 0.4, W + 6, 2.6), 0.6);
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.85, W * 1.4, 0.9);
      return out + gartSway(o, r, body);
    },
  });


  /* ---------- frilly (parsley, coriander): a frothy dome of curled or flat lacy leaves ---------- */
  gartDefine('form:frilly', {
    box: [38, 30],
    draw(o, r) {
      const cori = o.id === 'coriander', s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', L[2]);
      const W = s === 1 ? 5 : s === 2 ? 11 : 15, H = s === 1 ? 7 : s === 2 ? 15 : 22;
      let stems = '', curls = '', curls2 = '', lace = '';
      const n = s === 1 ? 3 : s === 2 ? 7 : 11;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.8, st = A.stem(rr(r, -1.5, 1.5), 0, a, H * rr(r, 0.7, 1), rr(r, -1.5, 1.5)), [tx, ty] = st.tip;
        stems += st.d;
        if (cori) { for (const k of [-0.7, 0, 0.7]) { const c = A.at(tx, ty, a + k, 2.6); lace += A.blob(r, c[0], c[1], 2.4, 2, 6, 0.6); if (k < 0) curls += A.ell(c[0] - 0.6, c[1] - 0.6, 1.1, 0.8); } }
        else { const c = A.blob(r, tx, ty, 3.4, 3, 8, 0.7); (i % 2 ? (curls += c) : (curls2 += c)); }
      }
      let body = A.S(L[1], 0.8, stems) + (cori ? A.P(L[1], lace) + A.P(L[3], curls, 0.7) : A.P(L[1], curls2) + A.P(L[2], curls) + A.S(L[0], 0.5, curls, 0.45));
      if (s === 4 && cori && !win) body += A.P('#f4f0f4', A.circ(-4, -H - 2, 1.4) + A.circ(-2.4, -H - 3, 1.2) + A.circ(3, -H - 1.4, 1.3));
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.9, W * 1.3, 0.8);
      return A.shadow(W + 3, 2.4) + gartSway(o, r, body);
    },
  });




})();
