/* ============================================================
   GARDEN ART, flowers III (2.18, agent 'garden-art'): the forms star
   (cornflower), goblet (crocus), spike-cup (hollyhock; snapdragon), peony,
   dahlia (and zinnia), iris (and the yellow flag), cluster (forget-me-not),
   daisy-tall (ox-eye daisy; cosmos), daisy-cloud (Michaelmas daisy), hosta,
   rose-bush (camellia), the Christmas rose, climber (sweet pea), moon-trumpet
   (moonflower). PURE. Colours from the catalogue (look.v / c / c2 / leaf).
   Anchor: the foot at (0, 0). Light from the left.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const strap = (F, r, n, len, w, spread, o) => { for (let i = 0; i < n; i++) { const a = (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) + rr(r, -0.08, 0.08), l = len * rr(r, 0.8, 1.1); (i % 2 ? F.back(rr(r, -1.5, 1.5), 0, a, l, w, 0.5) : F.leaf(rr(r, -1.5, 1.5), 0, a, l, w, Object.assign({ bulge: 0.5 }, o || {}))); } };
  const snowFoot = (w) => A.P(PAL.snow, `M${-w} 0.6q${f1(w * 0.45)}-3 ${w}-2.4q${f1(w * 0.55)}-0.6 ${w} 2.4z`, 0.95);
  const fallbackCol = (o, c) => o.col || A.tone3(c);

  /* ---------- star (cornflower): grey-green wiry stems, ragged blue stars of fringed florets ---------- */
  gartDefine('form:star', {
    box: [42, 52],
    draw(o, r) {
      const col = fallbackCol(o, '#4a6fe3'), s = o.s5, L = gartSeasonLeaf(o, 'silver'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      strap(F, r, s === 1 ? 3 : 6, s === 1 ? 6 : 12, 1.1, 1.8);
      let out = A.shadow(8 + s * 2, 2.6), stems = '', heads = '';
      if (s >= 3) {
        const n = win ? 2 : s === 3 ? 3 : 4 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const a = (i / Math.max(1, n - 1) - 0.5) * 0.9 + rr(r, -0.06, 0.06), h = 26 + rr(r, 0, 16) - Math.abs(a) * 8;
          const st = A.stem(rr(r, -2, 2), 0, a, h, rr(r, -2, 2)), [tx, ty] = st.tip;
          stems += st.d;
          const p = st.pt(0.55); F.leaf(p[0], p[1], (i % 2 ? 1 : -1) * 0.8, 7, 1);
          // the bud: a scaly green knob (the cornflower's bract cup); winter keeps it, frosted
          heads += A.P(L[1], A.ell(tx, ty + 1.6, 2.2, 2.6)) + A.S(L[3], 0.5, `M${f1(tx - 1.4)} ${f1(ty + 1)}h2.8M${f1(tx - 1.2)} ${f1(ty + 2.6)}h2.4`, 0.8);
          if (s === 3 || win) { heads += A.P(win ? '#a8a8b8' : col[1], A.ell(tx, ty - 0.6, 1.4, 1)) + (win ? gartSnowCap(A, tx, ty - 1, 4.6, 0.4) : ''); continue; }
          // the ragged star: fringed outer florets, a darker inner tuft
          const R = 5.4 + rr(r, -0.4, 0.6);
          heads += A.P(col[0], A.star(tx, ty - 1.4, 9, R, R * 0.55, r())) + A.P(col[1], A.star(tx - 0.4, ty - 1.8, 9, R * 0.86, R * 0.42, r())) + A.P(col[2], A.star(tx - 1, ty - 2.4, 5, R * 0.42, R * 0.2, r()), 0.8) + A.P(A.dk(col[0], 0.35), A.circ(tx, ty - 1.6, R * 0.22));
        }
      }
      let body = F.out({ lightOp: 0.7 }) + A.S(L[1], 0.9, stems) + heads;
      if (win) out += snowFoot(10);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- goblet (crocus): low goblets on white tubes, grass leaves with a silver stripe ---------- */
  gartDefine('form:goblet', {
    box: [30, 24],
    draw(o, r) {
      const col = fallbackCol(o, '#a678de'), s = o.s5, L = gartPerennialLeaf(o), stig = gartC2(o, '#f39c12');
      if (s === 0) return gartSeed(o, A, 'bulb', col[1]);
      const F = gartFoliage(L);
      let stripe = '';
      const nl = s === 1 ? 3 : 7;
      for (let i = 0; i < nl; i++) { const a = (i / (nl - 1) - 0.5) * 1.6 + rr(r, -0.1, 0.1), l = (s === 1 ? 6 : 12) * rr(r, 0.8, 1.1); F.leaf(rr(r, -2, 2), 0, a, l, 0.9, { light: false, bulge: 0.5 }); const [tx, ty] = A.at(0, 0, a, l * 0.8); stripe += `M0 0L${f1(tx)} ${f1(ty)}`; }
      let out = A.shadow(7 + s * 1.6, 2.2), cups = '';
      if (s >= 3) {
        const n = s === 3 ? 2 : 3 + (o.variant % 2), open = s === 4 && !o.night && o.season !== 'winter';
        for (let i = 0; i < n; i++) {
          const x = (i / Math.max(1, n - 1) - 0.5) * 14 + rr(r, -1, 1), h = 8 + rr(r, 0, 4);
          cups += A.P('#f4f0e8', A.rect(x - 0.9, -h, 1.8, h));
          if (s === 3) { cups += gartCupHead(A, x, -h + 1, 4.4, 7, [L[0], A.mix(L[1], col[1], 0.4), A.mix(L[2], col[2], 0.5)], 0); continue; }
          cups += gartCupHead(A, x, -h + 1, 6.2, 9, col, open ? 0.75 : 0.05);
          if (open) cups += A.S(stig, 0.9, `M${f1(x)} ${f1(-h - 1)}l-1.2-3.6M${f1(x)} ${f1(-h - 1)}l0.2-4M${f1(x)} ${f1(-h - 1)}l1.4-3.4`);
          cups += A.S(A.dk(col[0], 0.2), 0.5, `M${f1(x - 1.2)} ${f1(-h - 1)}q0.4-3 1.2-5.4`, 0.5);
        }
      }
      let body = F.out() + A.S('#f4f2ea', 0.4, stripe, 0.7) + cups;
      if (o.season === 'winter') out += snowFoot(10);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- spike-cup (hollyhock): a tall spire of open saucers above big round crinkled leaves ---------- */
  const roundLeaf = (x, y, a, R, r) => A.blob(r, ...A.at(x, y, a, R * 0.8), R * 0.8, R * 0.7, 7, 0.32);
  gartDefine('form:spike-cup', {
    box: [44, 104],
    draw(o, r) {
      if (o.id === 'snapdragon') return snapdragon(o, r);
      const col = fallbackCol(o, '#f08fb0'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      let lv = '', lvl = '', out = A.shadow(10 + s * 2, 3);
      const nl = s === 1 ? 2 : 5;
      for (let i = 0; i < nl; i++) { const a = (i / (nl - 1) - 0.5) * 2.4, R = (s === 1 ? 4 : 8) + rr(r, 0, 2); lv += roundLeaf(0, -1, a, R, r); lvl += A.ell(...A.at(0, -1, a, R * 0.7), R * 0.32, R * 0.24); }
      let stems = '', cups = '', eyes = '', buds = '', rib = '';
      if (s >= 3) {
        const n = o.variant % 3 === 1 && s === 4 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const H = (win ? 46 : s === 3 ? 70 : 92) - k * 18 + rr(r, -4, 4), st = A.stem(k ? 7 : rr(r, -1, 1), -2, k ? 0.12 : rr(r, -0.04, 0.04), H, rr(r, -2, 2));
          stems += st.d;
          for (let j = 0; j < 3; j++) { const p = st.pt(0.15 + j * 0.12); lv += roundLeaf(p[0], p[1], (j % 2 ? 1 : -1) * 1.2, 5.6 - j, r); }
          const nf = s === 3 || win ? 0 : 7;
          for (let j = 0; j < nf; j++) {
            const t = 0.36 + j * 0.075, p = st.pt(t), side = j % 2 ? 1 : -1, R = 5.6 - j * 0.32, cx = p[0] + side * R * 0.55, cy = p[1];
            // an open saucer facing out: a scalloped disc squashed sideways, a dark eye with rays
            let sc = '';
            for (let q = 0; q < 5; q++) { const a = q / 5 * Math.PI * 2 + 0.3; sc += A.circ(cx + Math.cos(a) * R * 0.45 * 0.8, cy + Math.sin(a) * R * 0.45, R * 0.52); }
            cups += sc;
            eyes += A.circ(cx + side * R * 0.08, cy, R * 0.26);
            rib += `M${f1(cx)} ${f1(cy)}l${f1(side * R * 0.2 - R * 0.5)} ${f1(-R * 0.4)}M${f1(cx)} ${f1(cy)}l${f1(side * R * 0.2 + R * 0.4)} ${f1(-R * 0.45)}M${f1(cx)} ${f1(cy)}l${f1(side * R * 0.2)} ${f1(R * 0.6)}`;
          }
          for (let j = 0; j < 6; j++) { const t = (nf ? 0.86 : 0.55) + j * (nf ? 0.025 : 0.07), p = st.pt(Math.min(1, t)); buds += A.ell(p[0] + (j % 2 ? 1.4 : -1.4), p[1], 1.9 - j * 0.15, 2.3 - j * 0.15); }
        }
      }
      let body = A.P(L[0], lv) + A.P(L[2], lvl, 0.6) + A.S(L[0], 1.8, stems) + A.P(s === 3 || win ? L[2] : A.mix(col[1], L[2], 0.5), buds) + A.P(col[1], cups) + A.S(col[0], 0.6, rib, 0.6) + A.P(col[0], eyes) + A.P('#f6e8a0', eyes.replace(/a([\d.]+) ([\d.]+)/g, (m, a, b) => `a${f1(a * 0.4)} ${f1(b * 0.4)}`), 0.8);
      if (win) out += snowFoot(12);
      return out + gartSway(o, r, body);
    },
  });
  /** Snapdragon: a dense spike of two-lipped 'dragon mouths' with a yellow throat. */
  function snapdragon(o, r) {
    const col = fallbackCol(o, '#f6c445'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
    if (s === 0) return gartSeed(o, A, 'seed', col[1]);
    const F = gartFoliage(L);
    let out = A.shadow(9 + s * 2, 2.6), stems = '', up = '', low = '', throat = '', buds = '';
    const n = s <= 2 ? 1 : 2 + (o.variant % 2);
    for (let k = 0; k < n; k++) {
      const H = (s === 1 ? 10 : s === 2 ? 24 : win ? 30 : 48) - k * 8 + rr(r, -3, 4), st = A.stem((k - (n - 1) / 2) * 6, 0, (k - (n - 1) / 2) * 0.16, H, rr(r, -1.5, 1.5));
      stems += st.d;
      for (let j = 0; j < 4; j++) { const p = st.pt(0.1 + j * 0.13), side = j % 2 ? 1 : -1; F.leaf(p[0], p[1], side * 0.9, 7 - j, 1.4); }
      if (s < 3) continue;
      const nf = s === 3 || win ? 0 : 6;
      for (let j = 0; j < nf; j++) {
        const t = 0.42 + j * 0.085, p = st.pt(t), side = j % 2 ? 1 : -1, z = 3.6 - j * 0.2, cx = p[0] + side * z * 0.8, cy = p[1];
        up += A.circ(cx - z * 0.32, cy - z * 0.5, z * 0.5) + A.circ(cx + z * 0.32, cy - z * 0.55, z * 0.5);
        low += A.ell(cx, cy + z * 0.32, z * 0.82, z * 0.52);
        throat += A.ell(cx + side * z * 0.15, cy + z * 0.1, z * 0.32, z * 0.2);
      }
      for (let j = 0; j < 5; j++) { const p = st.pt(Math.min(1, (nf ? 0.9 : 0.6) + j * (nf ? 0.025 : 0.08))); buds += A.ell(p[0] + (j % 2 ? 1 : -1), p[1], 1.4, 1.9); }
    }
    let body = F.out() + A.S(L[1], 1.1, stems) + A.P(s === 3 || win ? L[2] : A.mix(col[1], L[2], 0.45), buds) + A.P(col[0], up) + A.P(col[1], low) + A.P('#f8d84a', throat);
    if (win) out += snowFoot(10);
    // the hollyhock's box is twice a snapdragon's height: draw it at double size
    return `<g transform="scale(1.85)">${out + gartSway(o, r, body)}</g>`;
  }

  /* ---------- peony: a mound of deeply cut leaves, round fat buds, great ruffled bowls ---------- */
  function peonyBowl(x, y, R, col, r) {
    let outer = '', mid = '', inner = '';
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.05 + i / 6 * 0.9) + Math.PI; outer += A.circ(x + Math.cos(a) * R * 0.66, y + Math.sin(a) * R * 0.42 + R * 0.12, R * 0.44); }
    for (let i = 0; i < 5; i++) { const a = Math.PI + Math.PI * (0.12 + i / 4 * 0.76); mid += A.circ(x + Math.cos(a) * R * 0.38, y + Math.sin(a) * R * 0.3 - R * 0.05, R * 0.36); }
    for (let i = 0; i < 4; i++) inner += A.circ(x - R * 0.2 + i * R * 0.14, y - R * 0.32 - (i % 2) * R * 0.1, R * 0.2);
    const cup = `M${f1(x - R)} ${f1(y - R * 0.1)}Q${f1(x - R * 0.9)} ${f1(y + R * 0.75)} ${f1(x)} ${f1(y + R * 0.7)}Q${f1(x + R * 0.9)} ${f1(y + R * 0.75)} ${f1(x + R)} ${f1(y - R * 0.1)}z`;
    return A.P(col[0], outer) + A.P(col[1], cup) + A.P(col[1], mid) + A.P(col[2], inner, 0.85) + A.S(col[0], R * 0.07, `M${f1(x - R * 0.5)} ${f1(y + R * 0.2)}q${f1(R * 0.5)} ${f1(R * 0.25)} ${f1(R)} 0M${f1(x - R * 0.3)} ${f1(y - R * 0.05)}q${f1(R * 0.3)} ${f1(R * 0.18)} ${f1(R * 0.6)} 0`, 0.5);
  }
  gartDefine('form:peony', {
    box: [56, 52],
    draw(o, r) {
      const col = fallbackCol(o, '#f4a6c0'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'tuber', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 6 : s === 2 ? 16 : 22, H = s === 1 ? 8 : s === 2 ? 20 : 30;
      // red-flushed stems, leaves cut into three pointed lobes
      let stems = '';
      const nl = s === 1 ? 3 : s === 2 ? 8 : 12;
      for (let i = 0; i < nl; i++) {
        const a = (i / (nl - 1) - 0.5) * 2.2 + rr(r, -0.1, 0.1), len = H * rr(r, 0.55, 0.85), st = A.stem(rr(r, -2, 2), 0, a, len, rr(r, -2, 2)), [tx, ty] = st.tip;
        stems += st.d;
        if (win && s >= 3 && i % 2) continue;
        for (const k of [-0.6, 0, 0.6]) F.leaf(tx, ty, a + k, 6.4 - Math.abs(k) * 1.6, 1.7, { vein: true });
      }
      let out = A.shadow(W + 4, 3.4), heads = '';
      if (s >= 3) {
        const n = win ? 0 : s === 3 ? 3 : 2 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const hx = (i / Math.max(1, n - 1) - 0.5) * W * 1.2 + rr(r, -2, 2), hy = -H * 0.95 - rr(r, 0, 4);
          if (s === 3) { heads += A.P('#8a3a3a', A.circ(hx, hy, 3.2)) + A.P(col[1], A.circ(hx - 0.4, hy - 0.6, 2.4)) + A.P(col[2], A.circ(hx - 1, hy - 1.2, 1), 0.8); continue; }
          heads += peonyBowl(hx, hy, 8 + rr(r, -0.6, 1.2), col, r);
        }
        if (s === 4) heads += A.P('#8a3a3a', A.circ(W * 0.9, -H * 0.7, 2.6)) + A.P(col[1], A.circ(W * 0.9 - 0.3, -H * 0.7 - 0.5, 1.8));
      }
      let body = A.S('#8a4a3a', 1.1, stems, 0.9) + F.out() + heads;
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.62, W * 1.3, 1);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- dahlia: dark foliage, geometric heads of pointed petals in perfect rings (zinnia: flat, rounded) ---------- */
  function dahliaHead(x, y, R, col, tilt, zinnia) {
    let s = '';
    const rings = zinnia ? [[12, 1, 0.42, col[0]], [9, 0.74, 0.36, col[1]]] : [[12, 1, 0.26, col[0]], [10, 0.76, 0.24, col[1]], [7, 0.5, 0.22, col[2]]];
    rings.forEach(([n, k, w, c], ri) => {
      let d = '';
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + ri * 0.3, ex = Math.cos(a) * R * k, ey = Math.sin(a) * R * k * tilt, ang = Math.atan2(ex, -ey), len = Math.hypot(ex, ey);
        d += zinnia ? A.petal(x, y, ang, len * 0.95, R * w * (0.6 + 0.4 * len / (R * k))) : A.leaf(x, y, ang, len, R * w * (0.5 + 0.5 * len / (R * k)), 0.5);
      }
      s += A.P(c, d);
    });
    if (zinnia) { let st = ''; for (let i = 0; i < 5; i++) { const a = i / 7 * Math.PI * 2; st += A.star(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2 * tilt, 5, R * 0.1, R * 0.04); } s += A.P('#5a2a14', A.ell(x, y, R * 0.26, R * 0.26 * tilt)) + A.P('#f6c445', st); }
    else s += A.P(A.lt(col[2], 0.3), A.ell(x - R * 0.06, y - R * 0.04, R * 0.14, R * 0.12 * tilt + 0.3));
    return s;
  }
  gartDefine('form:dahlia', {
    box: [52, 60],
    draw(o, r) {
      const zinnia = o.id === 'zinnia';
      const col = fallbackCol(o, '#e0566e'), s = o.s5, L = zinnia ? gartPerennialLeaf(o) : gartPerennialLeaf(o).map(c => A.shift(c, 6, 0.9, -0.05)), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, zinnia ? 'seed' : 'tuber', col[1]);
      const F = gartFoliage(L);
      const H = s === 1 ? 10 : s === 2 ? 26 : 42, n = s <= 2 ? 3 : zinnia ? 4 : 3;
      let stems = '', heads = '', out = A.shadow(10 + s * 2.6, 3);
      for (let i = 0; i < n + 2; i++) {
        const a = (i / (n + 1) - 0.5) * 1.3 + rr(r, -0.06, 0.06), h = H * rr(r, 0.7, 1) - Math.abs(a) * 6, st = A.stem(rr(r, -2, 2), 0, a, h, rr(r, -2, 2)), [tx, ty] = st.tip;
        stems += st.d;
        for (let j = 0; j < 2; j++) { const p = st.pt(0.3 + j * 0.25); F.leaf(p[0], p[1], a + (j % 2 ? 0.9 : -0.9), zinnia ? 6 : 8, zinnia ? 1.8 : 2.4, { vein: !zinnia }); }
        if (s < 3 || i >= n) continue;
        if (s === 3 || win) { heads += A.P(L[1], A.circ(tx, ty, 2.8)) + A.P(win ? '#9a8a7a' : col[1], A.ell(tx, ty - 1.6, 1.8, 1)) + (win ? gartSnowCap(A, tx, ty - 2.6, 6, 0.5) : ''); continue; }
        heads += dahliaHead(tx, ty, (zinnia ? 6.4 : 8.4) + rr(r, -0.5, 0.8), col, zinnia ? 0.62 : 0.82, zinnia);
      }
      let body = F.out() + A.S(L[0], 1.3, stems) + heads;
      if (o.season === 'autumn' && o.lod) out += gartFallen(A, r, 12, ['#a8842a', '#7a6a2a'], 2);
      if (win) out += snowFoot(12);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- iris: a fan of grey-green swords; standards up, falls down, a bright beard ---------- */
  function irisHead(x, y, R, col, beard) {
    const falls = A.petal(x, y, -2.2, R * 1.05, R * 0.42) + A.petal(x, y, 2.2, R * 1.05, R * 0.42) + A.petal(x, y + 0.5, Math.PI, R * 0.9, R * 0.44);
    const stds = A.petal(x, y, -0.42, R, R * 0.34) + A.petal(x, y, 0.42, R, R * 0.34) + A.petal(x, y, 0, R * 1.08, R * 0.36);
    const br = A.leaf(x, y + 0.6, -2.2, R * 0.55, R * 0.08) + A.leaf(x, y + 0.6, 2.2, R * 0.55, R * 0.08) + A.leaf(x, y + 0.6, Math.PI, R * 0.5, R * 0.08);
    const veins = `M${f1(x)} ${f1(y + 1)}l${f1(-R * 0.6)} ${f1(R * 0.5)}M${f1(x)} ${f1(y + 1)}l${f1(R * 0.6)} ${f1(R * 0.5)}`;
    return A.P(col[0], falls) + A.P(col[2], stds) + A.P(col[1], A.petal(x, y, 0, R * 0.9, R * 0.26), 0.7) + A.S(A.dk(col[0], 0.3), 0.5, veins, 0.6) + A.P(beard, br);
  }
  gartDefine('form:iris', {
    box: [40, 62],
    draw(o, r) {
      const col = fallbackCol(o, '#5d4fc4'), beard = gartC2(o, '#f7d33c'), s = o.s5, win = o.season === 'winter';
      const L = gartLeafSeason((o.look && o.look.leaf) || '#5a8f6a', o.season === 'winter' ? 'winter' : 'summer', 'perennial');
      if (s === 0) return gartSeed(o, A, 'tuber', col[1]);
      const F = gartFoliage(L);
      // the fan: stiff swords overlapping like a hand of cards
      const nl = s === 1 ? 3 : 7;
      for (let i = 0; i < nl; i++) { const a = (i / (nl - 1) - 0.5) * 0.9, l = (s === 1 ? 9 : s === 2 ? 26 : 34) * (1 - Math.abs(a) * 0.4) * rr(r, 0.88, 1.05); F.leaf((i - nl / 2) * 0.8, 0, a, l, 1.9, { bulge: 0.35 }); }
      let out = A.shadow(9 + s * 2, 2.6), stems = '', heads = '';
      if (o.id === 'yellow-flag') out += A.P('#7cb6dc', A.ell(0, 0.4, 16, 2.4), 0.55);
      if (s >= 3) {
        const n = s === 3 ? 1 : 1 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const st = A.stem(i ? 4 : -2, 0, i ? 0.18 : -0.04, (win ? 34 : 46) - i * 8 + rr(r, -3, 3), rr(r, -1, 1)), [tx, ty] = st.tip;
          stems += st.d;
          if (s === 3 || win) { heads += A.P(L[1], A.leaf(tx, ty + 6, 0, 9, 1.8, 0.6)) + A.P(win ? '#b0a8b8' : col[1], A.leaf(tx, ty + 3, 0, 5, 1, 0.6), 0.85) + (win ? gartSnowCap(A, tx, ty - 3, 4, 0.4) : ''); continue; }
          heads += irisHead(tx, ty + 4, 7.6 + rr(r, -0.4, 0.6), col, beard);
        }
      }
      let body = F.out({ lightOp: 0.6 }) + A.S(L[0], 1.2, stems) + heads;
      if (win) out += snowFoot(10);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- cluster (forget-me-not): a low haze of tiny sky-blue flowers with yellow eyes ---------- */
  gartDefine('form:cluster', {
    box: [44, 26],
    draw(o, r) {
      const col = fallbackCol(o, '#7fb3f0'), eye = gartC2(o, '#f7e15b'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 14 : 18;
      const nl = s === 1 ? 3 : 10;
      for (let i = 0; i < nl; i++) F.leaf(rr(r, -W * 0.6, W * 0.6), 0, (r() - 0.5) * 2.6, 5 + rr(r, 0, 3), 1.5, { bulge: 0.6 });
      let out = A.shadow(W + 3, 2.4), fl = '', fl2 = '', eyes = '', stems = '';
      if (s >= 3 && !win) {
        const n = Math.round((s === 3 ? 12 : 28) * o.dn);
        for (let i = 0; i < n; i++) {
          const x = rr(r, -W, W), y = -rr(r, 6, 13) + Math.abs(x) * 0.2, R = 1.3 + rr(r, 0, 0.4);
          if (i % 3 === 0) stems += `M${f1(x * 0.5)} 0Q${f1(x * 0.8)} ${f1(y * 0.5)} ${f1(x)} ${f1(y)}`;
          if (s === 3) { fl += A.circ(x, y, 0.9); continue; }
          let p5 = '';
          for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; p5 += A.circ(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.62, R * 0.5); }
          (x < -W * 0.2 ? (fl2 += p5) : (fl += p5));
          eyes += A.circ(x, y, R * 0.3);
        }
      }
      let body = F.out() + A.S(L[1], 0.6, stems) + A.P(s === 3 ? '#e8a0b8' : col[1], fl) + A.P(col[2], fl2) + A.P(eye, eyes);
      if (win && s >= 2) body += gartSnowCap(A, 0, -6, W * 1.5, 0.7);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- daisy-tall: the ox-eye daisy (tall, many white rays), cosmos (feathery threads, eight broad petals) ---------- */
  gartDefine('form:daisy-tall', {
    box: [46, 72],
    draw(o, r) {
      const cosmos = o.id === 'cosmos';
      const col = fallbackCol(o, '#fcfcf7'), disc = gartC2(o, '#f4c430'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      let threads = '', stems = '', heads = '', out = A.shadow(9 + s * 2.4, 2.8);
      const H = s === 1 ? 10 : s === 2 ? 28 : 60;
      const n = s <= 2 ? 3 : cosmos ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n - 1) - 0.5) * 0.9 + rr(r, -0.05, 0.05), h = H * rr(r, 0.75, 1) - Math.abs(a) * 6, st = A.stem(rr(r, -2, 2), 0, a, h, rr(r, -2.5, 2.5)), [tx, ty] = st.tip;
        stems += st.d;
        // leaves: cosmos threads (fine forked lines); ox-eye toothed spoons low down
        for (let j = 0; j < 3; j++) {
          const p = st.pt(0.18 + j * 0.2), side = j % 2 ? 1 : -1;
          if (cosmos) { const [ex, ey] = A.at(p[0], p[1], side * 1.0, 8); threads += `M${f1(p[0])} ${f1(p[1])}L${f1(ex)} ${f1(ey)}M${f1((p[0] + ex) / 2)} ${f1((p[1] + ey) / 2)}l${f1(side * 1.5)} -3.4M${f1((p[0] + ex) / 2)} ${f1((p[1] + ey) / 2)}l${f1(side * 3)} 1`; }
          else F.leaf(p[0], p[1], side * 0.9, 7 - j * 1.4, 1.6, { bulge: 0.6 });
        }
        if (s < 3) continue;
        if (s === 3 || win) { heads += A.P(L[1], A.circ(tx, ty, 2.2)) + A.P(win ? '#c8c0b0' : col[1], A.ell(tx, ty - 1.4, 1.4, 0.8)) + (win ? gartSnowCap(A, tx, ty - 2, 5, 0.4) : ''); continue; }
        heads += cosmos
          ? gartDaisyHead(A, tx, ty, { n: 8, L: 7, W: 2.6, rc: 1.8, tilt: 0.6 + rr(r, 0, 0.35), back: col[0], front: col[1], inner: col[0], disc, discDark: A.dk(disc, 0.3), twist: r() })
          : gartDaisyHead(A, tx, ty, { n: 18, L: 6.4, W: 0.95, rc: 2, tilt: 0.55 + rr(r, 0, 0.4), back: col[0], front: col[1], disc, discDark: A.dk(disc, 0.25), twist: r() });
      }
      let body = F.out() + A.S(L[1], 0.9, stems) + (threads ? A.S(L[1], 0.7, threads) : '') + heads;
      if (win) out += snowFoot(10);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- daisy-cloud (Michaelmas daisy): a dome sprinkled with little lilac stars ---------- */
  gartDefine('form:daisy-cloud', {
    box: [52, 54],
    draw(o, r) {
      const col = fallbackCol(o, '#9d7be0'), disc = gartC2(o, '#f4c430'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 14 : 21, H = s === 1 ? 8 : s === 2 ? 22 : 40;
      let stems = '';
      for (let i = 0; i < (s === 1 ? 2 : 7); i++) { const a = (i / 6 - 0.5) * 1.2, st = A.stem(rr(r, -3, 3), 0, a, H * rr(r, 0.7, 0.95), rr(r, -2, 2)); stems += st.d; for (let j = 0; j < 3; j++) { const p = st.pt(0.25 + j * 0.22); F.leaf(p[0], p[1], a + (j % 2 ? 1 : -1), 5, 1.1); } }
      if (s >= 2) F.add('light', A.blob(r, 0, -H * 0.6, W * 0.9, H * 0.36, 10, 0.4));
      let out = A.shadow(W + 3, 3), fl = '', fl2 = '', eyes = '';
      if (s >= 3 && !win) {
        const n = Math.round((s === 3 ? 14 : 40) * o.dn);
        for (let i = 0; i < n; i++) {
          const a = rr(r, Math.PI * 1.02, Math.PI * 1.98), q = 0.35 + Math.sqrt(r()) * 0.7, x = Math.cos(a) * W * q, y = -H * 0.45 + Math.sin(a) * H * 0.55 * q, R = 2.6 + rr(r, 0, 0.8);
          if (s === 3) { fl += A.circ(x, y, 1); continue; }
          const d = A.star(x, y, 7, R, R * 0.45, r());
          (x < 0 && y < -H * 0.5 ? (fl2 += d) : (fl += d));
          eyes += A.circ(x, y, R * 0.3);
        }
      }
      let body = A.S(L[0], 0.8, stems) + F.out({ lightOp: 0.45 }) + A.P(s === 3 ? L[2] : col[1], fl) + A.P(col[2], fl2) + A.P(disc, eyes);
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.95, W * 1.4, 1);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- hosta: a mound of big ribbed leaves (the variants are leaf colours), lilac bells on spikes ---------- */
  gartDefine('form:hosta', {
    box: [58, 36],
    draw(o, r) {
      const s = o.s5, win = o.season === 'winter';
      const leafC = o.main || (o.look && o.look.leaf) || '#4f8a64';
      const L = gartLeafSeason(leafC, o.season, 'perennial'), fc = A.tone3((o.look && o.look.c) || '#c9b8ec');
      if (s === 0) return gartSeed(o, A, 'tuber', fc[1]);
      const W = s === 1 ? 6 : s === 2 ? 16 : 24;
      let lv = '', lvL = '', edge = '', ribs = '', stems = '', bells = '';
      const nl = s === 1 ? 3 : s === 2 ? 7 : 11, variegated = o.variant === 1;
      for (let i = 0; i < nl; i++) {
        const a = (i / (nl - 1) - 0.5) * 2.6 + rr(r, -0.1, 0.1), len = (s === 1 ? 6 : 13) + rr(r, 0, 4) - Math.abs(a) * 2, x0 = rr(r, -2, 2), y0 = -1;
        const d = A.leaf(x0, y0, a, len, len * 0.36, 0.38);
        if (variegated) edge += d; else lv += d;
        lvL += A.halfLeaf(x0, y0, a, len * 0.95, len * 0.34, gartLit(a), 0.38);
        if (variegated) lv += A.leaf(x0, y0, a, len * 0.86, len * 0.27, 0.38);
        // the hosta's signature: curved parallel ribs
        for (const k of [-0.5, 0.5]) { const [mx, my] = A.at(x0, y0, a + k * 0.25, len * 0.55), [ex, ey] = A.at(x0, y0, a + k * 0.08, len * 0.9); ribs += `M${f1(x0)} ${f1(y0)}Q${f1(mx)} ${f1(my)} ${f1(ex)} ${f1(ey)}`; }
      }
      if (s === 4 && !win && o.season !== 'spring') {
        for (let i = 0; i < 2; i++) { const st = A.stem(i ? 5 : -4, -4, i ? 0.12 : -0.1, 26, 1); stems += st.d; for (let j = 0; j < 5; j++) { const p = st.pt(0.5 + j * 0.1), sd = j % 2 ? 1 : -1; bells += A.leaf(p[0], p[1], sd * 2.3, 3.4, 1.2, 0.7); } }
      }
      let body = A.S(L[1], 0.9, stems) + A.P(fc[1], bells) + (variegated ? A.P('#e8eaa8', edge) : '') + A.P(L[1], lv) + A.P(L[2], lvL, 0.55) + A.S(L[0], 0.6, ribs, 0.55);
      if (win && s >= 2) { let fold = ''; for (let i = 0; i < 6; i++) fold += A.leaf(rr(r, -W * 0.5, W * 0.5), 0, (i / 5 - 0.5) * 2.4, 7 + rr(r, 0, 3), 2.2, 0.4); body = A.P('#a8a070', fold) + A.P('#c8c090', A.blob(r, -2, -3, W * 0.4, 2.6, 7, 0.3), 0.8) + gartSnowCap(A, 0, -6, W * 1.1, 0.9); }
      return A.shadow(W + 3, 3) + gartSway(o, r, body);
    },
  });

  /* ---------- rose-bush (camellia): a glossy evergreen bush, formal rosettes of rounded petals ---------- */
  function camelliaHead(x, y, R, col) {
    let o1 = '', o2 = '', o3 = '';
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; o1 += A.ell(x + Math.cos(a) * R * 0.62, y + Math.sin(a) * R * 0.52, R * 0.42, R * 0.36); }
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.4; o2 += A.ell(x + Math.cos(a) * R * 0.34, y + Math.sin(a) * R * 0.28, R * 0.32, R * 0.27); }
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.2; o3 += A.circ(x + Math.cos(a) * R * 0.12, y + Math.sin(a) * R * 0.1, R * 0.17); }
    return A.P(col[0], o1) + A.P(col[1], o2) + A.P(col[2], o3);
  }
  gartDefine('form:rose-bush', {
    box: [52, 66],
    draw(o, r) {
      const col = fallbackCol(o, '#e14b6b'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 13 : 20, H = s === 1 ? 10 : s === 2 ? 28 : 54;
      if (s >= 2) F.add('back', A.blob(r, 0, -H * 0.5, W, H * 0.5, 10, 0.3)).add('base', A.blob(r, -W * 0.2, -H * 0.58, W * 0.62, H * 0.34, 8, 0.3));
      const nl = s === 1 ? 4 : s === 2 ? 12 : 22;
      let gloss = '';
      for (let i = 0; i < nl; i++) {
        const x = rr(r, -W * 0.8, W * 0.8), y = -rr(r, H * 0.1, H * 0.95) * (1 - Math.abs(x) / W * 0.3), a = (x > 0 ? 0.6 : -0.6) + rr(r, -0.8, 0.8), len = 6 + rr(r, 0, 2);
        F.leaf(x, y, a, len, len * 0.3, { bulge: 0.45, light: i % 3 === 0 });
        gloss += A.leaf(...A.at(x, y, a, len * 0.25), a, len * 0.5, len * 0.07);
      }
      let heads = '', out = A.shadow(W + 3, 3.4);
      if (s >= 3) {
        // camellias flower in winter and spring: the season's star, snow and all
        const n = s === 3 ? 4 : o.season === 'summer' || o.season === 'autumn' ? 3 : 6;
        for (let i = 0; i < n; i++) {
          const x = rr(r, -W * 0.75, W * 0.75), y = -rr(r, H * 0.3, H * 0.9);
          heads += s === 3 ? A.P(L[1], A.circ(x, y, 2.4)) + A.P(col[1], A.ell(x - 0.4, y - 1, 1.4, 1)) : camelliaHead(x, y, 5.4 + rr(r, -0.4, 0.8), col);
        }
      }
      let body = F.out() + A.P('#ffffff', gloss, 0.35) + heads;
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.98, W * 1.2, 1.1);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- the Christmas rose (hellebore): leathery hands of leaves, nodding saucers that flower in the snow ---------- */
  gartDefine('plant:christmas-rose', {
    box: [44, 30],
    draw(o, r) {
      const col = fallbackCol(o, '#f5f0f7'), eye = gartC2(o, '#c7d36b'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen');
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      let stalks = '';
      const nl = s === 1 ? 2 : 5;
      for (let i = 0; i < nl; i++) {
        const a = (i / Math.max(1, nl - 1) - 0.5) * 2.2, st = A.stem(rr(r, -2, 2), 0, a, (s === 1 ? 5 : 11) + rr(r, 0, 3), rr(r, -1, 1)), [tx, ty] = st.tip;
        stalks += st.d;
        // a hand: seven narrow leathery fingers from one point
        for (let k = 0; k < 7; k++) F.leaf(tx, ty, a + (k / 6 - 0.5) * 2.4, 5.4 - Math.abs(k - 3) * 0.5, 1.2, { bulge: 0.5 });
      }
      let out = A.shadow(8 + s * 2.4, 2.6), heads = '';
      if (s >= 3) {
        const n = s === 3 ? 2 : o.season === 'winter' ? 5 : 3;
        for (let i = 0; i < n; i++) {
          const x = (i / Math.max(1, n - 1) - 0.5) * 22 + rr(r, -1.5, 1.5), y = -12 - rr(r, 0, 6) + Math.abs(x) * 0.15, dir = x < 0 ? -1 : 1;
          stalks += `M${f1(x * 0.3)} 0Q${f1(x * 0.8)} ${f1(y * 0.6)} ${f1(x)} ${f1(y)}`;
          if (s === 3) { heads += A.P(A.mix(col[1], L[2], 0.4), A.ell(x, y + 1.6, 2, 2.6)); continue; }
          // a nodding saucer of five broad petals, its green-gold heart showing
          let pt = '';
          for (let k = 0; k < 5; k++) { const a = Math.PI * 0.45 + k / 5 * Math.PI * 2 + dir * 0.3; pt += A.petal(x, y + 2, a, 4.4, 2); }
          heads += A.P(col[0], pt) + A.P(col[1], A.ell(x, y + 2.4, 3.8, 2.6)) + A.P(eye, A.circ(x + dir * 0.4, y + 3.2, 1.3)) + A.P('#f0e070', A.circ(x + dir * 0.4 - 0.6, y + 2.6, 0.5) + A.circ(x + dir * 0.4 + 0.7, y + 2.8, 0.5), 0.9);
        }
      }
      let body = F.out() + A.S('#6a4a3a', 0.8, stalks) + heads;
      if (o.season === 'winter') out += snowFoot(13) + A.P(PAL.snow, A.circ(-9, -14, 0.7) + A.circ(10, -18, 0.6) + A.circ(2, -22, 0.6), 0.9);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- climber (sweet pea): a bamboo wigwam, tendrils, frilly winged flowers ---------- */
  gartDefine('form:climber', {
    box: [40, 84],
    draw(o, r) {
      const col = fallbackCol(o, '#d58ae0'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const H = 80;
      // three canes tied at the top with twine (always there: the frame is part of the planting)
      let canes = A.S('#c8a86a', 1.6, `M-13 0L-1 ${-H}M13 0L1 ${-H}M0 2L0 ${-H - 2}`) + A.S('#8a6a3a', 0.6, `M-13 0L-1 ${-H}M13 0L1 ${-H}`, 0.5) + A.S('#e8d8b0', 1, `M-3 ${-H + 5}h6M-2.4 ${-H + 7}l4.8-1.6`);
      const climb = s === 1 ? 0.14 : s === 2 ? 0.45 : s === 3 ? 0.82 : 0.95;
      let vines = '', tendr = '', flw = '', wings = '', keel = '';
      for (let v = 0; v < 3; v++) {
        const bx = [-12, 12, 0][v], ex = [-1, 1, 0][v], top = -H * climb;
        let d = `M${bx} 0`;
        const N = 8;
        for (let i = 1; i <= N; i++) {
          const t = i / N, y = top * t, x = bx + (ex - bx) * (y / -H) + (i % 2 ? 2.4 : -2.4);
          d += `L${f1(x)} ${f1(y)}`;
          if (win) continue;
          F.leaf(x, y, (i % 2 ? 1 : -1) * 1.1, 5, 1.6).leaf(x, y, (i % 2 ? 1 : -1) * 0.6, 4, 1.3);
          if (i % 3 === 0 && o.lod) tendr += `M${f1(x)} ${f1(y)}q${i % 2 ? 4 : -4} -2 ${i % 2 ? 3 : -3} -5a1.4 1.4 0 1 1 ${i % 2 ? -1.6 : 1.6} 0.6`;
          if (s >= 3 && i > 2 && i % 2 === 0) {
            const fx = x + (i % 4 ? 4 : -4), fy = y - 1;
            if (s === 3) { flw += A.ell(fx, fy, 1.3, 1.8); continue; }
            // a sweet pea: a big round standard, two wings, a little keel
            flw += A.circ(fx, fy - 1.2, 3);
            wings += A.ell(fx - 1.8, fy + 1.4, 1.9, 1.4) + A.ell(fx + 1.8, fy + 1.4, 1.9, 1.4);
            keel += A.ell(fx, fy + 2.2, 0.9, 0.7);
          }
        }
        vines += d;
      }
      let body = canes + A.S(win ? '#8a8a5a' : L[1], 0.9, vines) + F.out() + A.S(L[2], 0.5, tendr, 0.9) + (s === 3 ? A.P(L[2], flw) : A.P(col[1], flw) + A.P(col[2], wings) + A.P(col[0], keel));
      let out = A.shadow(15, 3);
      if (win) out += snowFoot(14) + A.P(PAL.snow, A.ell(0, -H - 1.4, 2.6, 1));
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- moon-trumpet (moonflower): heart leaves on a twining vine; white trumpets that open at night and glow ---------- */
  gartDefine('form:moon-trumpet', {
    box: [44, 76],
    draw(o, r) {
      const col = fallbackCol(o, '#f5f7ff'), glow = gartC2(o, '#d9e4ff'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -10, 1, 0.04));
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const H = 72, climb = s === 1 ? 0.15 : s === 2 ? 0.5 : s === 3 ? 0.85 : 1;
      let pole = A.S('#7a6a5a', 1.4, `M0 1L0 ${-H}`) + A.P('#c8b88a', A.circ(0, -H, 1.6));
      // the vine twines round the pole in a spiral (front loops in the stem colour, back loops darker)
      let front = '', back = '';
      for (let i = 0; i < 9 * climb; i++) { const y0 = -i * 8, y1 = y0 - 4, y2 = y0 - 8; front += `M-3 ${y0}Q0 ${y1 + 1} 3 ${y1}`; back += `M3 ${y1}Q0 ${y2 + 1} -3 ${y2}`; const side = i % 2 ? 1 : -1; F.leaf(side * 3, y1, side * 1.1, 7.4, 3.2, { bulge: 0.32, vein: true }); }
      let fl = '', folds = '', buds = '', halo = '';
      if (s >= 3) {
        const pts = [[-9, -H * 0.82], [10, -H * 0.62], [-8, -H * 0.4], [9, -H * 0.92]].slice(0, s === 3 ? 2 : 4);
        const open = s === 4 && (o.night || o.dusk);
        pts.forEach(([x, y]) => {
          if (!open) { buds += `M${f1(x)} ${f1(y + 5)}q-1.6-4 0-9q1.6 5 0 9z`; folds += `M${f1(x - 0.6)} ${f1(y + 3)}l1.2-2.4M${f1(x - 0.6)} ${f1(y)}l1.2-2.4`; return; }
          // a flat white trumpet face: a pentagon of folds round a pale throat
          fl += A.circ(x, y, 6.2);
          for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; folds += `M${f1(x)} ${f1(y)}L${f1(x + Math.sin(a) * 6)} ${f1(y - Math.cos(a) * 6)}`; }
          halo += gartHalo(o, r, x, y, 13, glow);
        });
      }
      let body = A.S(L[0], 1, back) + pole + halo + F.out() + A.S(L[1], 1.1, front) + A.P(col[1], fl) + A.S(glow, 0.8, folds, 0.9) + A.P(A.mix(col[1], L[2], 0.35), buds) + (fl ? A.P('#f0f4c8', fl.replace(/a([\d.]+) ([\d.]+)/g, (m, a, b) => `a${f1(a * 0.25)} ${f1(b * 0.25)}`), 0.9) : '');
      let out = A.shadow(12, 2.6);
      if (o.season === 'winter') out += snowFoot(12);
      return out + gartSway(o, r, body);
    },
  });
})();
