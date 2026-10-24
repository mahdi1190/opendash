/* ============================================================
   GARDEN ART, flowers II (2.18, agent 'garden-art'): the forms trumpet
   (daffodil), bell-arch (bluebell), spike-bell (foxglove), mophead (hydrangea),
   bell (snowdrop), pompom (marigold), pansy, lily; plus allium and coneflower.
   PURE. Same rules as flowers I: own silhouette per stage, own seasons, seeded
   variety. Anchor: the foot at (0, 0). Light from the left.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL, FL = PAL.fl;
  const { f1, rr } = A;
  const strap = (F, r, n, len, w, spread, o) => { for (let i = 0; i < n; i++) { const a = (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread) + rr(r, -0.08, 0.08), l = len * rr(r, 0.8, 1.1); (i % 2 ? F.back(rr(r, -1.5, 1.5), 0, a, l, w, 0.5) : F.leaf(rr(r, -1.5, 1.5), 0, a, l, w, Object.assign({ bulge: 0.5 }, o || {}))); } };

  /* ---------- daffodil: upright straps, a six-pointed star with a trumpet, facing sideways ---------- */
  const DAFF = [[FL.yellow, FL.yellow], [FL.white, FL.yellow], [FL.white, FL.orange], [FL.lemon, FL.orange], [FL.yellow, ['#c8701a', '#ec9a2a', '#f8c46a']]];
  function daffHead(x, y, dir, R, per, cup) {
    let back = '', front = '';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + 0.3, ex = Math.cos(a) * R * 0.55 * dir, ey = Math.sin(a) * R, ang = Math.atan2(ex, -ey);
      const d = A.leaf(x, y, ang, Math.hypot(ex, ey), R * 0.24, 0.5);
      if (Math.cos(a) * dir < -0.2) back += d; else front += d;
    }
    const tx = x + dir * R * 0.75, rim = A.ell(tx, y, R * 0.18, R * 0.42);
    const tube = `M${f1(x)} ${f1(y - R * 0.3)}L${f1(tx)} ${f1(y - R * 0.42)}L${f1(tx)} ${f1(y + R * 0.42)}L${f1(x)} ${f1(y + R * 0.3)}z`;
    return A.P(per[0], back) + A.P(per[1], front) + A.P(per[2], A.leaf(x, y, -0.4, R * 0.85, R * 0.12), 0.6) + A.P(cup[1], tube) + A.P(cup[0], rim) + A.P(cup[2], A.ell(tx - dir * R * 0.05, y - R * 0.1, R * 0.08, R * 0.24), 0.6);
  }
  gartDefine('form:trumpet', {
    box: [42, 52],
    draw(o, r) {
      const per = gartPick(DAFF.map(x => x[0]), o), cup = o.col2 || DAFF[o.variant % DAFF.length][1], s = o.s5, L = o.season === 'autumn' ? ['#4a5a2a', '#6a8a3a', '#a8ac4a', '#d8c870'] : gartSeasonLeaf(o, 'silver').map((c, i) => A.mix(c, PAL.leaf.spring[i], 0.55)), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'bulb', per[1] === FL.white[1] ? cup[1] : per[1]);
      const F = gartFoliage(L);
      if (s === 1) { strap(F, r, 3, 7, 1.4, 0.4); return A.shadow(8, 2.4) + A.P(PAL.soil[1], 'M-7 0.6q7-3.6 14 0z') + gartSway(o, r, F.out(), 'stiff'); }
      strap(F, r, s === 2 ? 4 : 6, s === 2 ? 20 : 26, 1.8, 0.7);
      let stems = '', heads = '', out = A.shadow(10 + s * 2, 2.8);
      if (s >= 3) {
        const n = s === 3 ? 2 : 2 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const a = (i / Math.max(1, n - 1) - 0.5) * 0.5 + rr(r, -0.05, 0.05), h = 30 + rr(r, 0, 9), dir = i % 2 ? -1 : 1;
          const st = A.stem(rr(r, -2, 2), 0, a, h, dir * 1.4), [tx, ty] = st.tip;
          // the neck bends the flower sideways; a papery spathe behind it
          stems += st.d + `Q${f1(tx + dir * 2)} ${f1(ty - 1)} ${f1(tx + dir * 3.4)} ${f1(ty + 1.2)}`;
          heads += A.P('#c8b88a', A.leaf(tx, ty, -dir * 0.6, 4, 0.9), 0.9);
          if (s === 3 || win) heads += A.P(L[1], A.leaf(tx + dir * 3, ty + 1.4, dir * 1.9, 7, 1.8)) + A.P(win ? '#d8d0a0' : per[1], A.leaf(tx + dir * 4, ty + 1.6, dir * 1.9, 5, 1.2), 0.8) + (win ? gartSnowCap(A, tx + dir * 4, ty - 0.4, 5, 0.5) : '');
          else heads += gartNod(o, r, daffHead(tx + dir * 3.6, ty + 2.4, dir, 6.6 + rr(r, -0.4, 0.6), per, cup));
        }
      }
      let body = F.out() + A.S(L[0], 1.2, stems) + heads;
      if (o.season === 'spring' && s >= 3) body += gartDew(A, [[-4, -14], [5, -9]]);
      if (win) out += A.P(PAL.snow, 'M-11 0.4q5-3 11-2.6q6-0.6 11 2.6z', 0.95);
      return out + gartSway(o, r, body, 'stiff');
    },
  });

  /* ---------- bluebell: strap leaves, arching stems, bells hanging on one side ---------- */
  const BELL = [['#3a3a9a', '#5a62d0', '#8a92e6'], ['#4a3a8a', '#7a5ac8', '#a88ae0'], FL.white, FL.blush];
  gartDefine('form:bell-arch', {
    box: [40, 40],
    draw(o, r) {
      const col = gartPick(BELL, o), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'bulb', col[1]);
      const F = gartFoliage(L);
      strap(F, r, s === 1 ? 3 : 7, s === 1 ? 7 : 15, 1.7, 1.9);
      let out = A.shadow(8 + s * 2.2, 2.6), stems = '', bells = ['', ''];
      if (s >= 3) {
        const n = win ? 1 : s === 3 ? 2 : 3 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const a = (i / Math.max(1, n - 1) - 0.5) * 0.7 + rr(r, -0.06, 0.06), bend = (i % 2 ? -1 : 1) * rr(r, 3, 5);
          const b = gartBellRow(A, rr(r, -2, 2), 0, a, 20 + rr(r, 0, 9), bend, s === 3 || win ? 4 : 5 + (i % 2), s === 3 || win ? 2 : 3.1);
          stems += b.stem;
          bells[0] += b.bells; bells[1] += b.inner;
        }
      }
      const bc = s === 3 || win ? [L[1], A.mix(L[2], col[2], 0.5)] : [col[1], col[0]];
      let body = F.out() + A.S(L[0], 0.9, stems) + A.P(bc[0], bells[0]) + A.P(bc[1], bells[1], 0.55);
      if (win) body += gartSnowCap(A, 0, -6, 18, 0.8);
      return out + gartSway(o, r, body, 'soft');
    },
  });

  /* ---------- foxglove: a rosette of big soft leaves, a tall spike of speckled bells ---------- */
  const FOX = [[['#8a2a6a', '#c8509a', '#e88ac0'], '#5a1a3a'], [['#b8a8bc', '#f2ecf2', '#ffffff'], '#7a4a6a'], [FL.apricot, '#8a4a2a'], [FL.lilac, '#4a2a5a']];
  gartDefine('form:spike-bell', {
    box: [42, 88],
    draw(o, r) {
      const col = gartPick(FOX.map(x => x[0]), o), spot = o.col ? A.dk(o.col[0], 0.45) : FOX[o.variant % FOX.length][1], s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const nl = s === 1 ? 3 : 7;
      for (let i = 0; i < nl; i++) { const a = (i / (nl - 1) - 0.5) * 2.6 + rr(r, -0.1, 0.1), len = (s === 1 ? 7 : 14) + rr(r, 0, 3); (Math.abs(a) > 1.1 ? F.back(0, 0, a, len, len * 0.3, 0.5) : F.leaf(0, 0, a, len, len * 0.3, { bulge: 0.5, vein: true })); }
      let out = A.shadow(10 + s * 2.4, 3), spikes = '', bells = '', inner = '', dots = '', buds = '';
      if (s >= 3) {
        const n = o.variant % 3 === 2 && s === 4 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const H = (win ? 34 : s === 3 ? 56 : 72) - k * 14 + rr(r, -4, 6), st = A.stem(k ? 7 : rr(r, -1, 1), -2, k ? 0.16 : rr(r, -0.05, 0.05), H, rr(r, -2, 2));
          spikes += st.d;
          // leaves climbing the stem, getting smaller
          for (let j = 0; j < 3; j++) { const p = st.pt(0.12 + j * 0.13), side = j % 2 ? 1 : -1; F.leaf(p[0], p[1], side * 1.0, 8 - j * 1.8, 2.2 - j * 0.4); }
          const nb = s === 3 || win ? 0 : 9;
          for (let j = 0; j < nb; j++) {
            const t = 0.38 + j * 0.06, p = st.pt(t), side = j % 3 === 1 ? -1 : 1, sz = 10.6 - j * 0.6;
            // a fat tubular bell hanging out and down from the spike, its open speckled mouth at the end
            const ang = side * (2.25 + rr(r, -0.12, 0.12)), [mx, my] = A.at(p[0], p[1], ang, sz * 0.96);
            bells += A.leaf(p[0], p[1], ang, sz * 1.06, sz * 0.4, 0.8);
            inner += A.ell(mx, my, sz * 0.32, sz * 0.24);
            dots += A.circ(mx - side * 0.5, my - 0.9, 0.42) + A.circ(mx + side * 0.4, my - 1.6, 0.36) + A.circ(mx, my - 2.2, 0.32);
          }
          // the buds up the tip: small, closed, paler, getting tiny
          for (let j = 0; j < 7; j++) { const t = (s === 3 || win ? 0.5 : 0.94) + j * (s === 3 || win ? 0.07 : 0.01), p = st.pt(Math.min(1, t)); buds += A.ell(p[0] + (j % 2 ? 1 : -1) * 1.1, p[1], 1.5 - j * 0.12, 1.9 - j * 0.12); }
        }
      }
      const budCol = s === 3 || win ? L[2] : A.mix(col[1], L[2], 0.45);
      let body = F.out() + A.S(L[0], 1.6, spikes) + A.P(budCol, buds) + A.P(col[1], bells) + A.P(col[0], inner, 0.85) + A.P(spot, dots, 0.9);
      if (win) body += gartSnowCap(A, 0, -9, 22, 1);
      return out + gartSway(o, r, body, 'soft');
    },
  });

  /* ---------- hydrangea: big oval leaves, mophead domes of tiny four-petal florets ---------- */
  const HYD = [[FL.sky, FL.blue], [FL.pink, FL.rose], [FL.white, ['#a8c08a', '#c8dca8', '#e8f2d8']], [FL.lilac, FL.violet], [['#a8b46a', '#d0dc96', '#eef2c8'], ['#7a8a4a', '#a8b46a', '#d0dc96']]];
  gartDefine('form:mophead', {
    box: [62, 54],
    draw(o, r) {
      let col = gartPick(HYD.map(x => x[0]), o), edge = o.col ? A.tone3(A.shift(o.col[1], 8, 1.1, -0.08)) : HYD[o.variant % HYD.length][1];
      const s = o.s5, win = o.season === 'winter', L = o.season === 'autumn' ? ['#3a4a22', '#5e7a2e', '#9a9a3a', '#d8b050'] : gartSeasonLeaf(o, 'deciduous');
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      if (o.season === 'autumn') { col = [A.mix(col[0], '#8a4a5a', 0.45), A.mix(col[1], '#c48a8a', 0.45), A.mix(col[2], '#e0c0b0', 0.45)]; edge = [A.mix(edge[0], '#6a7a4a', 0.5), A.mix(edge[1], '#9aa06a', 0.5), edge[2]]; }
      if (win) { col = ['#7a6248', '#a08868', '#c4ac8a']; edge = col; }
      const F = gartFoliage(L);
      const W = s === 1 ? 6 : s === 2 ? 16 : 25, H = s === 1 ? 10 : s === 2 ? 22 : 36;
      let out = A.shadow(W + 4, 3.4), canes = '', heads = '';
      if (!win || s < 3) {
        if (s >= 2) F.add('back', A.blob(r, 0, -H * 0.42, W * 0.95, H * 0.44, 9, 0.3));
        const nl = Math.round((s === 1 ? 3 : s === 2 ? 9 : 14) * Math.max(0.6, o.dn));
        for (let i = 0; i < nl; i++) {
          const a = (r() - 0.5) * 2.4, bx = rr(r, -W * 0.55, W * 0.55), by = -rr(r, H * 0.12, H * 0.62), len = 7 + rr(r, 0, 3);
          F.leaf(bx, by, a + (bx > 0 ? 0.4 : -0.4), len, len * 0.38, { bulge: 0.42, vein: true });
        }
      }
      if (win && s >= 2) for (let i = 0; i < 5; i++) canes += A.stem(rr(r, -4, 4), 0, (i / 4 - 0.5) * 1.1, H * 0.85, rr(r, -2, 2)).d;
      if (s >= 3) {
        const n = s === 3 ? 3 : 3 + (o.variant % 3 === 0 ? 1 : 0);
        for (let i = 0; i < n; i++) {
          const hx = (n === 1 ? 0 : (i / (n - 1) - 0.5) * W * 1.2) + rr(r, -2, 2), hy = -H * (0.7 + rr(r, 0, 0.22)) - (i % 2 ? 0 : 4), R = s === 3 ? 4.2 : 7.2 + rr(r, -0.6, 1.2);
          if (s === 3) { heads += A.P(A.mix(L[2], col[1], 0.3), A.blob(r, hx, hy, R, R * 0.85, 7, 0.2)) + A.P(L[3], A.ell(hx - 1, hy - 1, R * 0.5, R * 0.35), 0.6); continue; }
          // the dome, its shade, then the florets (light, then the left lit side)
          let fl = '', fl2 = '';
          for (let j = 0; j < Math.round(12 * o.dn); j++) { const a = r() * Math.PI * 2, q = Math.sqrt(r()) * R * 0.86, fx = hx + Math.cos(a) * q, fy = hy + Math.sin(a) * q * 0.82; (fx < hx - R * 0.1 && fy < hy + R * 0.2 ? (fl2 += A.star(fx, fy, 4, 1.6, 0.7, a)) : (fl += A.star(fx, fy, 4, 1.5, 0.65, a))); }
          heads += A.P(edge[0], A.blob(r, hx, hy, R, R * 0.86, 9, 0.18)) + A.P(col[1], A.blob(r, hx - R * 0.08, hy - R * 0.1, R * 0.86, R * 0.74, 8, 0.2)) + A.P(col[2], fl) + A.P(win ? col[2] : A.lt(col[2], 0.35), fl2);
          if (win) heads += gartSnowCap(A, hx, hy - R * 0.72, R * 1.5, 0.9);
        }
      }
      let body = A.S(win ? '#8a6a4a' : L[0], 1.4, canes) + F.out() + heads;
      if (o.season === 'autumn') out += gartFallen(A, r, 16, ['#c8862a', '#a8542a', '#8a8a3a'], 3);
      return out + gartSway(o, r, body, 'stiff');
    },
  });

  /* ---------- allium: tall bare stems, a perfect sphere of tiny stars ---------- */
  const ALL = [FL.purple, FL.violet, FL.white, FL.sky, FL.lilac];
  gartDefine('plant:allium', {
    box: [36, 76],
    draw(o, r) {
      let col = gartPick(ALL, o);
      const s = o.s5, win = o.season === 'winter', L = o.season === 'summer' || o.season === 'autumn' ? ['#5a6a2a', '#8a9a3a', '#b8b860', '#e0d890'] : gartPerennialLeaf(o);
      if (s === 0) return gartSeed(o, A, 'bulb', col[1]);
      if (o.season === 'autumn') col = [A.mix(col[0], '#6a5a3a', 0.35), A.mix(col[1], '#9a8a6a', 0.35), A.mix(col[2], '#c4b49a', 0.35)];
      if (win) col = ['#7a6a4a', '#a8946a', '#cab894'];
      const F = gartFoliage(L);
      strap(F, r, s === 1 ? 2 : 4, s === 1 ? 8 : 14, 2, 1.8);
      let out = A.shadow(8 + s * 1.6, 2.4), stems = '', heads = '';
      if (s >= 3) {
        const n = s === 3 ? 1 : 1 + (o.variant % 3 ? 1 : 2);
        for (let i = 0; i < n; i++) {
          const a = (n === 1 ? 0 : (i / (n - 1) - 0.5) * 0.4) + rr(r, -0.04, 0.04), H = (s === 3 ? 44 : 58) - i * 9 + rr(r, -3, 4);
          const st = A.stem(rr(r, -1, 1), 0, a, H, rr(r, -1, 1)), [tx, ty] = st.tip;
          stems += st.d;
          const R = s === 3 ? 3.4 : 8.6 - i * 0.8;
          if (s === 3) { heads += A.P(L[2], A.leaf(tx, ty + 2, 0, 8, 2.6, 0.6)); continue; }
          let st1 = '', st2 = '';
          for (let j = 0; j < 22; j++) { const a2 = r() * Math.PI * 2, q = Math.sqrt(r()) * R * 0.92, fx = tx + Math.cos(a2) * q, fy = ty - R + Math.sin(a2) * q; (fx < tx && fy < ty - R ? (st2 += A.star(fx, fy, 5, 1.3, 0.5, a2)) : (st1 += A.star(fx, fy, 5, 1.2, 0.5, a2))); }
          heads += A.P(col[0], A.circ(tx, ty - R, R)) + A.P(col[1], A.circ(tx - R * 0.12, ty - R * 1.1, R * 0.84)) + A.P(col[2], st1, 0.9) + A.P(A.lt(col[2], 0.4), st2);
          if (win) heads += gartSnowCap(A, tx, ty - R * 1.85, R * 1.5, 0.9);
        }
      }
      return out + gartSway(o, r, F.out() + A.S(L[0], 1.3, stems) + heads, 'soft');
    },
  });

  /* ---------- snowdrop: the winter flower: narrow grey leaves, white drops nodding on fine stems ---------- */
  gartDefine('form:bell', {
    box: [30, 30],
    draw(o, r) {
      const s = o.s5, L = o.look && o.look.leaf ? gartLeafSeason(o.look.leaf, o.season === 'winter' ? 'summer' : o.season, 'perennial') : ['#3e5a4a', '#5a7a68', '#86a28e', '#b8ccbc'], petal = o.main || '#ffffff', tip = gartC2(o, '#5a9a4a');
      if (s === 0) return gartSeed(o, A, 'bulb', '#ffffff');
      const F = gartFoliage(L);
      strap(F, r, s === 1 ? 2 : 5, s === 1 ? 6 : 12, 1.2, 1.1);
      let out = A.shadow(6 + s * 1.6, 2), stems = '', drops = '', green = '';
      if (s >= 3) {
        const n = s === 3 ? 2 : 3 + (o.variant % 2) * 2;
        for (let i = 0; i < n; i++) {
          const a = (i / Math.max(1, n - 1) - 0.5) * 0.9 + rr(r, -0.05, 0.05), h = 14 + rr(r, 0, 6), dir = a >= 0 ? 1 : -1;
          const st = A.stem(rr(r, -1.5, 1.5), 0, a, h, dir), [tx, ty] = st.tip;
          stems += st.d + `Q${f1(tx + dir * 2)} ${f1(ty - 1.6)} ${f1(tx + dir * 3)} ${f1(ty + 0.6)}`;
          const dx = tx + dir * 3, dy = ty + 1;
          green += A.ell(dx, dy - 0.4, 0.9, 0.8);
          if (s === 3) { drops += A.leaf(dx, dy, Math.PI, 3.6, 1); continue; }
          // three outer tepals: the drop, and a tiny green-tipped inner cup peeking out
          drops += A.leaf(dx, dy, Math.PI, 5.6, 1.7, 0.55) + A.leaf(dx, dy, Math.PI - 0.5, 5, 1.2, 0.55) + A.leaf(dx, dy, Math.PI + 0.5, 5, 1.2, 0.55);
          green += A.ell(dx, dy + 4.6, 0.8, 0.5);
        }
      }
      let body = F.out() + A.S(L[1], 0.8, stems) + A.P(petal, drops) + A.P(tip, green);
      if (o.season === 'winter') out += A.P(PAL.snow, 'M-11 0.6q5-3 11-2.4q6-0.6 11 2.4z', 0.95);
      return out + gartSway(o, r, body, 'soft');
    },
  });

  /* ---------- coneflower: reflexed petals hanging round a spiky cone ---------- */
  const CONE = [[FL.pink, '#c8641a'], [FL.white, '#c8961a'], [FL.orange, '#7a3a14'], [FL.yellow, '#5a3a1a'], [FL.magenta, '#a8541a']];
  gartDefine('plant:coneflower', {
    box: [46, 58],
    draw(o, r) {
      const col = gartPick(CONE.map(x => x[0]), o), cone = gartC2(o, CONE[o.variant % CONE.length][1]), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const nl = s === 1 ? 3 : 6;
      for (let i = 0; i < nl; i++) { const a = (i / (nl - 1) - 0.5) * 2.2, len = (s === 1 ? 6 : 12) + rr(r, 0, 3); F.leaf(0, 0, a, len, len * 0.22, { vein: true }); }
      let out = A.shadow(9 + s * 2.4, 2.8), stems = '', heads = '';
      if (s >= 3) {
        const n = s === 3 ? 2 : 3 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const a = (i / Math.max(1, n - 1) - 0.5) * 0.9 + rr(r, -0.06, 0.06), h = 30 + rr(r, 0, 14) - Math.abs(a) * 8;
          const st = A.stem(rr(r, -2, 2), 0, a, h, rr(r, -2, 2)), [tx, ty] = st.tip;
          stems += st.d;
          const p = st.pt(0.5); F.leaf(p[0], p[1], (i % 2 ? 1 : -1) * 0.9, 8, 1.8);
          if (s === 3) { heads += A.P(L[1], A.star(tx, ty, 8, 3.6, 1.6)) + A.P(cone, A.ell(tx, ty - 1.4, 1.8, 1.6)); continue; }
          if (win || (o.season === 'autumn' && i % 2)) { heads += A.P('#4a2a1a', A.ell(tx, ty - 2, 2.6, 3.2)) + (win ? gartSnowCap(A, tx, ty - 4.6, 5.4, 0.5) : ''); continue; }
          // the petals hang down and out like a shuttlecock; the cone stands up proud
          // the petals splay out and droop like a skirt; the cone is a low, spiky dome on top
          let pet = '', pet2 = '';
          for (let j = 0; j < 12; j++) { const u = j / 11, ang = -1.6 - u * (2 * Math.PI - 3.2), d = A.leaf(tx + Math.sin(ang) * 1.6, ty - 0.6, ang + rr(r, -0.08, 0.08), 8 + rr(r, -0.6, 0.8) - Math.abs(u - 0.5) * 1.6, 1.55, 0.5); pet += d; if (j % 3 === 1) pet2 += A.leaf(tx, ty - 1, ang + 0.26, 6.4, 1.3, 0.5); }
          let spikes = '';
          for (let j = 0; j < 7; j++) { const sx = tx - 3 + j, sy = ty - 1.2 - Math.sin(j / 6 * Math.PI) * 3.4; spikes += `M${f1(sx)} ${f1(sy)}l${f1((j - 3) * 0.2)} -1`; }
          heads += gartNod(o, r, A.P(col[0], pet2) + A.P(col[1], pet) + A.P(cone, `M${f1(tx - 3.6)} ${f1(ty)}Q${f1(tx - 3.6)} ${f1(ty - 4.6)} ${f1(tx)} ${f1(ty - 4.8)}Q${f1(tx + 3.6)} ${f1(ty - 4.6)} ${f1(tx + 3.6)} ${f1(ty)}Q${f1(tx)} ${f1(ty + 1)} ${f1(tx - 3.6)} ${f1(ty)}z`) + A.P(A.lt(cone, 0.3), A.ell(tx - 1.4, ty - 2.6, 1.2, 1.4), 0.7) + A.S(A.dk(cone, 0.3), 0.7, spikes));
        }
      }
      let body = F.out() + A.S(L[0], 1, stems) + heads;
      if (win) body += gartSnowCap(A, 0, -5, 20, 0.8);
      return out + gartSway(o, r, body, 'soft');
    },
  });

  /* ---------- marigold: a compact mound of feathery leaves, ruffled pompoms ---------- */
  const MARI = [[FL.orange, FL.yellow], [FL.yellow, FL.lemon], [['#7a1a14', '#b0341c', '#d8642a'], FL.yellow], [FL.apricot, FL.orange]];
  gartDefine('form:pompom', {
    box: [42, 36],
    draw(o, r) {
      const col = gartPick(MARI.map(x => x[0]), o), rim = o.col ? A.tone3(A.shift(o.col[1], -14, 1, 0.08)) : MARI[o.variant % MARI.length][1], s = o.s5, L = o.season === 'autumn' ? ['#2f4a24', '#4a6a2e', '#7a8a3a', '#a8a850'] : PAL.leaf[o.season === 'spring' ? 'spring' : 'summer'], win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 12 : 16, H = s === 1 ? 6 : s === 2 ? 12 : 15;
      if (s >= 2) F.add('back', A.blob(r, 0, -H * 0.45, W, H * 0.52, 10, 0.4));
      const nl = Math.round((s === 1 ? 4 : 12) * Math.max(0.6, o.dn));
      for (let i = 0; i < nl; i++) {
        const a = (r() - 0.5) * 2.8, bx = rr(r, -W * 0.6, W * 0.6), by = -rr(r, 1, H * 0.7), len = 5 + rr(r, 0, 2.6);
        // a feathery leaf: a row of tiny leaflets
        for (let k = 0; k < (o.lod ? 3 : 2); k++) { const p = A.at(bx, by, a, len * k / 3); F.leaf(p[0], p[1], a - 0.8, 2.4, 0.8, { light: k === 1 }).leaf(p[0], p[1], a + 0.8, 2.4, 0.8, { light: false }); }
      }
      let out = A.shadow(W + 3, 2.6), heads = '';
      if (s >= 3) {
        const n = s === 3 ? 3 : 4 + (o.variant % 3);
        for (let i = 0; i < n; i++) {
          const hx = (i / Math.max(1, n - 1) - 0.5) * W * 1.5 + rr(r, -1.5, 1.5), hy = -H * 0.9 - rr(r, 0, 5) + Math.abs(i / Math.max(1, n - 1) - 0.5) * 6, R = s === 3 ? 2 : 4 + rr(r, -0.4, 0.8);
          if (s === 3 || win) { heads += A.P(L[1], A.ell(hx, hy, R, R * 1.1)) + A.P(win ? '#c89a5a' : col[1], A.ell(hx, hy - R * 0.7, R * 0.6, R * 0.4)) + (win ? gartSnowCap(A, hx, hy - R, R * 2.4, 0.5) : ''); continue; }
          // the pompom: ruffled rings, a darker heart
          let ruf = '';
          for (let j = 0; j < 8; j++) { const a = j / 8 * Math.PI * 2; ruf += A.circ(hx + Math.cos(a) * R * 0.72, hy + Math.sin(a) * R * 0.6, R * 0.4); }
          let ruf2 = '';
          for (let j = 0; j < 5; j++) { const a = j / 5 * Math.PI * 2 + 0.4; ruf2 += A.circ(hx + Math.cos(a) * R * 0.38, hy - R * 0.1 + Math.sin(a) * R * 0.3, R * 0.3); }
          heads += A.P(rim[1], ruf) + A.P(col[0], A.ell(hx, hy, R * 0.8, R * 0.66)) + A.P(col[1], ruf2) + A.P(col[2], A.ell(hx - R * 0.3, hy - R * 0.32, R * 0.3, R * 0.2), 0.8);
        }
      }
      let body = F.out() + heads;
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.95, W * 1.8, 1.1);
      return out + gartSway(o, r, body, 'stiff');
    },
  });

  /* ---------- pansy: a low clump; flat faces looking straight at you ---------- */
  const PANSY = [[FL.violet, FL.yellow, '#2a1a3a'], [FL.blue, FL.white, '#1a1a3a'], [FL.orange, FL.yellow, '#5a2a14'], [FL.wine, FL.wine, '#2a0a14'], [FL.yellow, FL.yellow, '#3a2a14'], [FL.white, FL.lilac, '#3a2a5a']];
  function pansyFace(x, y, R, top, low, blot) {
    // two upper petals behind, two side petals, the big lower lip, then the face blotch and the yellow eye
    return A.P(top[0], A.circ(x - R * 0.42, y - R * 0.55, R * 0.58) + A.circ(x + R * 0.42, y - R * 0.6, R * 0.58))
      + A.P(low[1], A.circ(x - R * 0.62, y + R * 0.05, R * 0.5) + A.circ(x + R * 0.62, y + R * 0.05, R * 0.5))
      + A.P(low[1], A.ell(x, y + R * 0.42, R * 0.66, R * 0.56))
      + A.P(top[1], A.circ(x - R * 0.46, y - R * 0.62, R * 0.42), 0.8)
      + A.P(blot, `M${f1(x - R * 0.55)} ${f1(y + 0.1)}Q${f1(x)} ${f1(y - R * 0.5)} ${f1(x + R * 0.55)} ${f1(y + 0.1)}Q${f1(x + R * 0.3)} ${f1(y + R * 0.75)} ${f1(x)} ${f1(y + R * 0.7)}Q${f1(x - R * 0.3)} ${f1(y + R * 0.75)} ${f1(x - R * 0.55)} ${f1(y + 0.1)}z`, 0.85)
      + A.P('#f6d040', A.ell(x, y + R * 0.02, R * 0.16, R * 0.12));
  }
  gartDefine('form:pansy', {
    box: [40, 28],
    draw(o, r) {
      const P0 = PANSY[o.variant % PANSY.length], top = o.col || P0[0], low = o.col ? (o.main && A.hsl(o.main)[2] > 0.8 ? A.tone3(gartC2(o, '#f7d33c')) : A.tone3(A.shift(o.col[1], 0, 1, 0.12))) : P0[1], blot = o.col ? A.dk(o.col[0], 0.55) : P0[2], s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', top[1]);
      const F = gartFoliage(L);
      const nl = s === 1 ? 3 : 9;
      for (let i = 0; i < nl; i++) { const a = (i / (nl - 1) - 0.5) * 2.8 + rr(r, -0.1, 0.1), len = (s === 1 ? 5 : 8) + rr(r, 0, 2.4); F.leaf(rr(r, -2, 2), 0, a, len, len * 0.36, { bulge: 0.6, vein: true }); }
      let out = A.shadow(8 + s * 2.4, 2.4), heads = '', stems = '';
      if (s >= 3) {
        const n = s === 3 ? 2 : 3 + (o.variant % 3);
        for (let i = 0; i < n; i++) {
          const hx = (i / Math.max(1, n - 1) - 0.5) * 22 + rr(r, -1.5, 1.5), hy = -11 - rr(r, 0, 6) + Math.abs(hx) * 0.18;
          stems += `M${f1(hx * 0.3)} 0Q${f1(hx * 0.6)} ${f1(hy * 0.5)} ${f1(hx)} ${f1(hy + 3)}`;
          if (s === 3) { heads += A.P(L[1], A.leaf(hx, hy + 3, 0.2, 5, 1.6)) + A.P(top[1], A.leaf(hx + 0.4, hy + 0.6, 0.2, 2.6, 1), 0.8); continue; }
          heads += gartNod(o, r, pansyFace(hx, hy, 4.4 + rr(r, -0.3, 0.5), top, low, blot));
          if (win && i % 2 === 0) heads += gartSnowCap(A, hx, hy - 5.6, 6.4, 0.5);
        }
      }
      let body = F.out() + A.S(L[1], 0.8, stems) + heads;
      if (win) out += A.P(PAL.snow, 'M-14 0.6q7-3.2 14-2.6q7-0.6 14 2.6z', 0.95);
      return out + gartSway(o, r, body, 'stiff');
    },
  });

  /* ---------- lily: a tall leafy stem, big recurved stars with long stamens ---------- */
  const LILY = [[['#d8d0b0', '#fbf8ee', '#e8f0c0'], '#c8961a', null], [FL.orange, '#5a2a14', '#5a2a14'], [['#b02a6a', '#e05a9a', '#fbe0ec'], '#8a2a14', '#9a1a4a'], [FL.yellow, '#8a4a14', '#a8541a'], [FL.peach, '#a8541a', null]];
  function lilyHead(x, y, dir, R, col, anth, spots) {
    // six pointed petals curling back from a trumpet: three behind, three in front, stamens arching out
    let back = '', front = '', sp = '', stam = '', an = '';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.25, ex = Math.cos(a) * R, ey = Math.sin(a) * R * 0.72, ang = Math.atan2(ex, -ey) + dir * 0.1;
      const d = A.leaf(x, y, ang, Math.hypot(ex, ey) * 1.08, R * 0.27, 0.42);
      if (Math.sin(a) < 0) back += d; else front += d;
      if (spots && i % 2 === 0) { const p = A.at(x, y, ang, R * 0.45); sp += A.circ(p[0], p[1], 0.45); }
    }
    for (let i = 0; i < 5; i++) { const ang = (i / 4 - 0.5) * 1.3 - 0.2 * dir, [ax, ay] = A.at(x, y, ang, R * 0.9); stam += `M${f1(x)} ${f1(y)}Q${f1((x + ax) / 2 + Math.cos(ang) * 1.4)} ${f1((y + ay) / 2)} ${f1(ax)} ${f1(ay)}`; an += A.ell(ax, ay, 0.9, 0.5); }
    return A.P(col[0], back) + A.P(col[1], front) + A.P(col[2], A.ell(x, y, R * 0.28, R * 0.2), 0.9) + A.P(spots || col[0], sp, 0.9) + A.S('#9ab060', 0.45, stam) + A.P(anth, an);
  }
  gartDefine('form:lily', {
    box: [44, 74],
    draw(o, r) {
      const L0 = LILY[o.variant % LILY.length], col = o.col ? (A.hsl(o.col[1])[2] > 0.85 ? [A.mix(o.col[1], '#c8b890', 0.45), o.col[1], o.col2 ? o.col2[2] : '#ffffff'] : o.col) : L0[0], anth = '#8a3a14', spots = o.col2 ? o.col2[0] : L0[2], s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'bulb', col[1]);
      const F = gartFoliage(L);
      let out = A.shadow(8 + s * 2, 2.6), stems = '', heads = '';
      const n = s <= 2 ? 1 : 1 + (o.variant % 2);
      for (let k = 0; k < n; k++) {
        const H = (s === 1 ? 10 : s === 2 ? 28 : win ? 36 : 54) - k * 10 + rr(r, -3, 4), st = A.stem(k ? 5 : rr(r, -1, 1), 0, k ? 0.12 : rr(r, -0.05, 0.05), H, rr(r, -1.5, 1.5));
        stems += st.d;
        // narrow leaves whorled all the way up the stem
        const nl = s === 1 ? 3 : 9;
        for (let j = 0; j < nl; j++) { const t = 0.08 + j / nl * 0.82, p = st.pt(t), side = j % 2 ? 1 : -1; F.leaf(p[0], p[1], side * (0.7 + t * 0.4) + rr(r, -0.1, 0.1), 7 - t * 3, 1.3); }
        if (s < 3) continue;
        const [tx, ty] = st.tip, nh = s === 3 || win ? 2 : 2 + (o.variant % 3 === 0 ? 1 : 0);
        for (let j = 0; j < nh; j++) {
          const dir = j % 2 ? -1 : 1, hx = tx + dir * (j ? 6 : 1), hy = ty + j * 4;
          stems += `M${f1(tx)} ${f1(ty + 3)}Q${f1(hx)} ${f1(hy)} ${f1(hx + dir * 1.5)} ${f1(hy - 1)}`;
          if (s === 3 || win) heads += A.P(win ? '#a89a6a' : A.mix(L[2], col[1], 0.35), A.leaf(hx + dir * 1.5, hy - 1, dir * 0.5, 9, 2, 0.55)) + (win ? gartSnowCap(A, hx + dir * 4, hy - 8, 4, 0.5) : '');
          else heads += gartNod(o, r, lilyHead(hx + dir * 2.4, hy - 3, dir, 10.4 + rr(r, -0.6, 1), col, anth, spots));
        }
      }
      let body = A.S(L[0], 1.5, stems) + F.out() + heads;
      if (win) out += A.P(PAL.snow, 'M-11 0.6q5-3 11-2.4q6-0.6 11 2.4z', 0.95);
      return out + gartSway(o, r, body, 'soft');
    },
  });
})();
