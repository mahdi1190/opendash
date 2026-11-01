/* ============================================================
   GARDEN ART, the sprawling veg (2.18, agent 'garden-art'): the forms head (lettuce, cabbage), bushy (potato), leek, sprawl (courgette), pumpkin
   (pumpkin, lantern pumpkin, squash), melon, floret (broccoli), frilly-tall (kale), low-fruit (strawberry), big-leaf (rhubarb). The rest of the veg and
   fruit are rows in 94-garden-art-j-bloom.js. PURE. Stage 4 is 'ready': the crop shows plainly. Anchor: the foot at (0, 0). Light from the left.
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


})();
