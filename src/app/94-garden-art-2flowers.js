/* ============================================================
   GARDEN ART, flowers I (2.18, agent 'garden-art'): the forms cup (tulip,
   rainbow tulip), sunflower (and the golden one), rose (frost, sunrise), daisy,
   spike (lavender), poppy. PURE. Colours come from the catalogue (look.v /
   look.c / look.c2 / look.leaf); the lists here are only the fallbacks. Each species has its own silhouette at every
   stage (0 seed, 1 sprout, 2 young, 3 mature with buds, 4 in flower), its own
   seasons (spring fresh, summer full, autumn warm leaves and seed heads, winter
   resting under snow: nothing ever wilts) and seeded variety (height, lean,
   head count and the species' own colours) so a bed never looks cloned.
   Anchor: the foot at (0, 0). Light from the left.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL, FL = PAL.fl;
  const { f1, rr } = A;

  /* ---------- tulip: strap leaves, one tall stem, a cup ---------- */
  const RAINBOW = ['#e0393e', '#f28a1a', '#f6c445', '#4fae5a', '#4a6fe3', '#8e5bc8'];
  const TULIP = [FL.red, FL.yellow, FL.pink, FL.white, FL.purple, FL.orange, ['#c02a1e', '#e8442c', '#f6d040'], FL.blush];
  gartDefine('form:cup', {
    box: [44, 62],
    draw(o, r) {
      const rainbow = o.id === 'rainbow-tulip';
      const col = gartPick(TULIP, o), L = gartPerennialLeaf(o), s = o.s5, win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'bulb', col[1]);
      const F = gartFoliage(L);
      let out = A.shadow(12 + s * 2, 3), stems = '', heads = '';
      if (s === 1) {
        F.leaf(-1, 0, -0.08, 9, 1.7, { bulge: 0.55 }).leaf(1.4, 0, 0.22, 6, 1.5, { bulge: 0.55 });
        return out + A.P(PAL.soil[1], 'M-7 0.6q7-3.6 14 0z') + gartSway(o, r, F.out(), 'stiff');
      }
      const n = s <= 2 ? 1 : 1 + (o.variant % 3 === 0 ? 0 : o.variant % 3 === 1 ? 1 : 2);
      for (let i = 0; i < n; i++) {
        const x = n === 1 ? 0 : (i - (n - 1) / 2) * 8 + rr(r, -1.5, 1.5), lean = rr(r, -0.12, 0.12) + x * 0.012;
        const lh = (win ? 12 : 17) + rr(r, 0, 5);
        F.back(x, 0, lean - 0.55 - rr(r, 0, 0.2), lh, 2.9, 0.4);
        F.leaf(x, 0, lean + 0.42 + rr(r, 0, 0.2), lh * 0.92, 3.1, { bulge: 0.38 });
        if (s === 2) continue;
        const h = (win ? 20 : 30) + rr(r, -3, 6) - i * 2;
        const st = A.stem(x, 0, lean, h, rr(r, -1.5, 1.5));
        stems += st.d;
        const [hx, hy] = st.tip;
        const hc = rainbow ? A.tone3(RAINBOW[(i + o.variant) % RAINBOW.length]) : col;
        if (s === 3 || win) heads += gartCupHead(A, hx, hy + 1, 6.4, 9, win ? [A.dk(col[0], 0.15), A.mix(col[1], '#8a9a6a', 0.45), A.mix(col[2], '#c8d0b8', 0.5)] : [L[0], A.mix(L[1], col[1], 0.3), A.mix(L[2], col[2], 0.5)], 0.05) + (win ? gartSnowCap(A, hx, hy - 8.6, 7.4, 0.8) : '');
        else heads += gartNod(o, r, gartCupHead(A, hx, hy + 1, 9.4, 11, hc, o.night ? 0.02 : o.season === 'spring' ? 0.25 : o.season === 'summer' ? 0.5 : 0.85)
          + (rainbow ? A.S(A.tone3(RAINBOW[(i + o.variant + 2) % RAINBOW.length])[1], 1.3, `M${f1(hx - 2.6)} ${f1(hy - 1)}q-0.4-4 0.6-8M${f1(hx + 2.4)} ${f1(hy - 1)}q0.6-4-0.4-8`, 0.9) : '')
          + (col === TULIP[6] ? A.S('#f6d040', 0.9, `M${f1(hx - 3)} ${f1(hy - 9)}q1 4 0 8M${f1(hx + 2.4)} ${f1(hy - 9.6)}q-0.6 4 0.4 8`, 0.85) : ''));
      }
      let body = F.out() + A.S(A.dk(L[1], 0.1), 1.5, stems) + heads;
      if (o.season === 'spring' && s >= 3) body += gartDew(A, [[-6, -10], [5, -7]]);
      if (o.season === 'autumn') out += gartFallen(A, r, 9, ['#c8862a', '#a8542a'], 2);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- sunflower: one tall hairy stem, heart leaves, a great head that follows the sun ---------- */
  const SUN = [[FL.yellow, '#5a3a1e'], [FL.yellow, '#3a2a1a'], [FL.lemon, '#4a4a26'], [['#8a2a14', '#c0441c', '#e0742a'], '#2a1a12'], [FL.orange, '#4a2a16']];
  gartDefine('form:sunflower', {
    box: [54, 96],
    draw(o, r) {
      const col = gartPick(SUN.map(x => x[0]), o), disc = gartC2(o, SUN[o.variant % SUN.length][1]), golden = o.id === 'golden-sunflower', s = o.s5, L = o.season === 'winter' ? ['#6a5a3a', '#8a7a52', '#a8946a', '#c8b48a'] : o.season === 'autumn' ? ['#5a5a26', '#7a7a30', '#a8a044', '#d0c070'] : PAL.leaf[o.season];
      if (s === 0) return gartSeed(o, A, 'striped', col[1]);
      const F = gartFoliage(L);
      let out = A.shadow(8 + s * 3, 3), head = '';
      if (s === 1) {
        const st = A.stem(0, 0, 0.05, 9, 0.6);
        F.leaf(st.tip[0], st.tip[1], -1.25, 6.4, 3.2, { bulge: 0.5 }).leaf(st.tip[0], st.tip[1], 1.2, 6.4, 3.2, { bulge: 0.5 }).leaf(st.tip[0], st.tip[1], 0.1, 3.4, 1.4);
        return out + gartSway(o, r, A.S(L[0], 1.6, st.d) + F.out(), 'stiff');
      }
      const H = s === 2 ? 26 : s === 3 ? 62 : 74 + rr(r, -4, 8), lean = rr(r, -0.05, 0.08);
      const st = A.stem(0, 0, lean, H, rr(r, -2, 2.5));
      const nl = s === 2 ? 4 : 7;
      for (let i = 0; i < nl; i++) {
        const t = 0.14 + (i / nl) * 0.78, p = st.pt(t), side = i % 2 ? 1 : -1, len = (s === 2 ? 11 : 15) * (1 - t * 0.45) + rr(r, -1, 2);
        const a = side * (1.0 + rr(r, -0.15, 0.25)) + (o.season === 'winter' ? side * 0.9 : 0);
        F.leaf(p[0], p[1], a, len, len * 0.36, { bulge: 0.34, vein: true });
      }
      const [hx, hy] = st.tip;
      if (s === 2) F.leaf(hx, hy, -0.5, 5, 2).leaf(hx, hy, 0.5, 5, 2);
      else if (s === 3) head = A.P(L[0], A.star(hx, hy - 3, 9, 5.6, 2.6, 0.2)) + A.P(L[1], A.circ(hx, hy - 3, 3.4)) + A.P(col[1], A.circ(hx - 0.6, hy - 3.6, 1.6), 0.8);
      else {
        // the head: faces the viewer in summer, droops heavy with seed in autumn and winter
        const droop = o.season === 'autumn' ? 0.7 : o.season === 'winter' ? 1.25 : 0, R = 12.5 + rr(r, -1, 2);
        const cx = hx + Math.sin(droop) * 4, cy = hy - 6 + droop * 4;
        const pc = o.season === 'winter' ? ['#7a5a2a', '#9a7a3a', '#b89a5a'] : o.season === 'autumn' ? [A.dk(col[0], 0.1), A.mix(col[1], '#d07a1a', 0.3), col[1]] : col;
        let h = '';
        if (o.season !== 'winter') {
          h += gartDaisyHead(A, cx, cy, { n: 22, L: R, W: 2.2, rc: R * 0.5, tilt: 0.92 - droop * 0.4, back: pc[0], front: pc[1], inner: pc[2], disc: disc, discDark: A.dk(disc, 0.4), shape: 'pointed', twist: 0.1 });
          // the seed spiral: a ring of dots on the disc
          let dots = '';
          for (let i = 0; i < 14; i++) { const a = i * 2.4, q = Math.sqrt(i / 14) * R * 0.38; dots += A.circ(cx + Math.cos(a) * q, cy + Math.sin(a) * q * (0.92 - droop * 0.4), 0.65); }
          h += A.P('#c8a060', dots, 0.55);
        } else {
          h += A.P('#5a3a1e', A.ell(cx, cy, R * 0.62, R * 0.4)) + A.P('#7a5a32', A.ell(cx - 1, cy - 1, R * 0.45, R * 0.24), 0.8) + A.S('#8a6a3a', 1.2, `M${f1(cx - R * 0.7)} ${f1(cy)}q${f1(R * 0.7)} ${f1(R * 0.5)} ${f1(R * 1.4)} 0`) + gartSnowCap(A, cx, cy - R * 0.38, R * 1.25, 1.1);
        }
        head = droop ? `<g transform="rotate(${f1(droop * 30)} ${f1(hx)} ${f1(hy)})">${h}</g>` : h;
        // a second, smaller head on a side branch (some plants)
        if (o.variant % 3 === 1 && o.season !== 'winter') {
          const p = st.pt(0.66), bx = p[0] + 9, by = p[1] - 6;
          head = A.S(L[0], 1.3, `M${f1(p[0])} ${f1(p[1])}q5 -1 ${f1(bx - p[0])} ${f1(by - p[1])}`) + gartDaisyHead(A, bx, by, { n: 14, L: 6.4, W: 1.5, rc: 3, tilt: 0.85, back: pc[0], front: pc[1], disc, discDark: A.dk(disc, 0.4), shape: 'pointed' }) + head;
        }
      }
      let body = A.S(L[0], s >= 3 ? 2.6 : 1.8, st.d) + A.S(L[2], 0.8, st.d, 0.35) + F.out() + head;
      if (golden && s === 4) { body = gartHalo(Object.assign({}, o, { dusk: true }), r, st.tip[0], st.tip[1] - 6, 22, '#ffe48a') + body + A.P('#fff8d0', A.star(st.tip[0] - 8, st.tip[1] - 14, 4, 3, 0.8) + A.star(st.tip[0] + 9, st.tip[1] - 2, 4, 2.4, 0.7), 0.9); }
      if (o.season === 'autumn' && o.lod) out += gartFallen(A, r, 10, ['#b8862a', '#8a6a2a'], 3);
      return out + gartSway(o, r, body, 'soft');
    },
  });

  /* ---------- rose: a bush of canes and leaf sprays, swirled blooms ---------- */
  const ROSE = [FL.red, FL.pink, FL.white, FL.yellow, FL.apricot, FL.wine, FL.coral];
  gartDefine('form:rose', {
    box: [58, 60],
    draw(o, r) {
      const frost = o.id === 'frost-rose', sunrise = o.id === 'sunrise-rose';
      const col = gartPick(ROSE, o), s = o.s5, win = o.season === 'winter' && !frost;
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const L = o.season === 'spring' ? ['#3a5a2a', '#5a8a3a', '#86b456', '#b8d880'] : o.season === 'autumn' ? ['#3a4a22', '#5e7a2e', '#a49a3a', '#e0b050'] : o.season === 'winter' ? ['#3a3a2a', '#5a5a3a', '#7a7a54', '#9a9a74'] : ['#24442a', '#3a6a34', '#5e8e48', '#9cc070'];
      const F = gartFoliage(L), cane = win ? '#7a4a34' : '#5a6a2a';
      let out = A.shadow(10 + s * 3.4, 3.4), canes = '', flowers = '', hips = '', snow = '';
      // winter: pruned back to a low vase of red-brown canes, hips at the tips, snow on each
      const W = s === 1 ? 4 : s === 2 ? 13 : 20, H = (s === 1 ? 10 : s === 2 ? 26 : 40 + rr(r, -3, 4)) * (win ? 0.62 : 1);
      const nc = s === 1 ? 1 : s === 2 ? 3 : 5;
      const tips = [];
      for (let i = 0; i < nc; i++) {
        const a = nc === 1 ? 0.05 : (i / (nc - 1) - 0.5) * 1.2 + rr(r, -0.1, 0.1), len = H * (1 - Math.abs(a) * 0.32) * rr(r, 0.85, 1.05);
        const c = A.stem(rr(r, -2, 2), 0, a, len, rr(r, -3, 3));
        canes += c.d;
        tips.push(c);
        if (win && s >= 2) continue;
        // leaf sprays: five small serrated leaflets along each cane
        for (let k = 0; k < (s === 1 ? 2 : 4); k++) {
          const t = 0.35 + k * 0.17, p = c.pt(t), side = k % 2 ? 1 : -1, g = c.ang(t) + side * 1.05;
          F.leaf(p[0], p[1], g, 6.6, 2.4, { bulge: 0.45 });
          const q = A.at(p[0], p[1], g, 4.2);
          F.leaf(q[0], q[1], g - 0.6, 4.6, 1.8).leaf(q[0], q[1], g + 0.6, 4.6, 1.8);
        }
      }
      if (s >= 2 && !win) F.add('back', A.blob(r, 0, -H * 0.45, W * 0.92, H * 0.42, 9, 0.35));
      if (s >= 3) {
        const nb = win ? 0 : s === 3 ? 3 : o.season === 'autumn' ? 2 : 3 + (o.variant % 2);
        for (let i = 0; i < tips.length; i++) {
          const [tx, ty] = tips[i].tip;
          if (win || (o.season === 'autumn' && i % 2)) { hips += A.ell(tx, ty - 1.6, 1.8, 2.2); if (win) snow += A.ell(tx - 0.2, ty - 3.8, 1.9, 0.9); continue; }
          const rc = sunrise && o.col2 ? A.tone3(A.mix(col[1], o.col2[1], i / Math.max(1, nb - 1))) : col;
          if (i < nb) flowers += gartRoseHead(A, tx, ty - 2, s === 3 ? 3 : 4.4 + rr(r, -0.4, 0.8), rc, s === 3 ? 0.2 : (i === nb - 1 && i > 1 ? 0.25 : 1));
          else flowers += gartRoseHead(A, tx, ty - 1, 3, col, 0.2);
        }
      }
      let body = A.S(cane, 1.4, canes) + F.out({ backOp: 0.9 }) + A.P('#c8442a', hips) + (hips ? A.P('#f08a5a', hips.replace(/a([\d.]+) ([\d.]+)/g, (m, a, b) => `a${f1(a * 0.5)} ${f1(b * 0.5)}`), 0.5) : '') + flowers;
      if (win && s >= 2) { body += A.P(PAL.snow, snow) + A.S(PAL.frost, 0.7, canes, 0.3); out += A.P(PAL.snow, `M${-W * 0.9} 0.4q${W * 0.5}-3.4 ${W * 0.9}-2.6q${W * 0.6}-0.8 ${W * 0.9} 2.6z`, 0.95); }
      if (frost && s >= 3) body = gartHalo(Object.assign({}, o, { dusk: true }), r, 0, -H * 0.8, 26, '#d8f0ff') + body + A.P('#ffffff', A.star(-W * 0.7, -H, 4, 2.6, 0.6) + A.star(W * 0.6, -H * 0.7, 4, 2.2, 0.6) + A.star(0, -H * 1.15, 4, 1.8, 0.5), 0.95);
      if (o.season === 'autumn' && o.lod) out += gartFallen(A, r, 14, ['#c89a3a', '#a8642a'], 3);
      return out + gartSway(o, r, body, 'stiff');
    },
  });

  /* ---------- daisy: a rosette of spoon leaves, white heads on wiry stems at every angle ---------- */
  const DAISY = [[FL.white, '#f2c21e'], [['#d8a8b8', '#fbf2f4', '#ffffff'], '#f2c21e'], [FL.white, '#e8a81a'], [['#c86a8a', '#f6c8d8', '#fde8f0'], '#f2c21e']];
  gartDefine('form:daisy', {
    box: [46, 44],
    draw(o, r) {
      const col = gartPick(DAISY.map(x => x[0]), o), disc = gartC2(o, DAISY[o.variant % DAISY.length][1]), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', disc);
      const F = gartFoliage(L);
      const nl = s === 1 ? 3 : 8;
      for (let i = 0; i < nl; i++) {
        const a = (i / nl - 0.5) * 2.6 + rr(r, -0.15, 0.15), len = (s === 1 ? 5 : 8) + rr(r, 0, 3);
        (Math.abs(a) > 0.9 ? F.back(rr(r, -2, 2), 0, a, len, 2.4, 0.7) : F.leaf(rr(r, -2, 2), 0, a, len, 2.4, { bulge: 0.7 }));
      }
      let out = A.shadow(9 + s * 2.4, 2.6), stems = '', heads = '';
      if (s >= 3) {
        const n = win ? 1 : s === 3 ? 3 : 4 + (o.variant % 3);
        for (let i = 0; i < n; i++) {
          const a = (n === 1 ? 0 : (i / (n - 1) - 0.5) * 1.1) + rr(r, -0.12, 0.12), h = 13 + rr(r, 0, 15) - Math.abs(a) * 6;
          const st = A.stem(rr(r, -3, 3), -1, a, h, rr(r, -2, 2));
          stems += st.d;
          const [hx, hy] = st.tip;
          if (s === 3 || win) heads += A.P(L[1], A.ell(hx, hy, 2, 1.8)) + A.P(win ? '#e8e2d8' : col[2], A.ell(hx - 0.4, hy - 0.8, 1.3, 1), 0.9) + (win ? gartSnowCap(A, hx, hy - 1.6, 4, 0.5) : '');
          else if (o.night) heads += A.P(col[0], A.leaf(hx, hy + 1, 0, 5, 1.8, 0.5)) + A.P(col[1], A.leaf(hx - 0.4, hy + 1, -0.12, 4.6, 1.1, 0.5)) + A.P(L[1], A.ell(hx, hy + 1, 1.6, 1.2));
          else heads += gartNod(o, r, gartDaisyHead(A, hx, hy, { n: 13, L: 5 + rr(r, -0.4, 0.8), W: 1.05, rc: 1.7, tilt: 0.55 + rr(r, 0, 0.4), back: col[0], front: col[1], disc, discDark: A.dk(disc, 0.25), twist: r() }));
        }
      }
      let body = F.out() + A.S(A.dk(L[1], 0.05), 0.9, stems) + heads;
      if (win) body += gartSnowCap(A, 0, -4, 16, 0.9);
      if (o.season === 'spring' && s >= 2) body += gartDew(A, [[-5, -5], [4, -3]]);
      return out + gartSway(o, r, body, 'soft');
    },
  });

  /* ---------- lavender: a silver mound of needles, a fountain of bead spikes ---------- */
  const LAV = [['#5a4a9a', '#8a72c8', '#b4a2e2'], ['#3a2a7a', '#5e46a8', '#8a74cc'], ['#a85a9a', '#d08ac0', '#ecbadc'], ['#b8b0c8', '#e6e2ee', '#ffffff']];
  gartDefine('form:spike', {
    box: [54, 50],
    draw(o, r) {
      let col = gartPick(LAV, o);
      const s = o.s5, L = gartSeasonLeaf(o, 'silver'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      if (o.season === 'autumn') col = [A.mix(col[0], '#7a6a6a', 0.35), A.mix(col[1], '#9a8a8a', 0.35), A.mix(col[2], '#b8acac', 0.35)];
      if (win) col = ['#7a7066', '#9a8e80', '#b8ac9a'];
      const W = s === 1 ? 6 : s === 2 ? 14 : 20, Hm = s === 1 ? 6 : s === 2 ? 12 : 15;
      let out = A.shadow(W + 3, 3), needles = ['', ''], spikes = ['', '', ''], stems = '';
      // the mound: short needles fanning up and out
      const nn = s === 1 ? 10 : s === 2 ? 26 : 34;
      for (let i = 0; i < nn; i++) {
        const a = (r() - 0.5) * 2.6, bx = rr(r, -W * 0.6, W * 0.6), len = Hm * (0.55 + r() * 0.5) * (1 - Math.abs(a) * 0.2);
        const [tx, ty] = A.at(bx, 0, a, len);
        needles[i % 2] += `M${f1(bx)} ${f1(-Hm * 0.15)}Q${f1(bx + (tx - bx) * 0.2)} ${f1(ty * 0.6)} ${f1(tx)} ${f1(ty - Hm * 0.25)}`;
      }
      // a loose cushion, not a dome: a ragged blob whose foot is cut flat, a lighter top-left
      const mb = A.blob(r, 0, -Hm * 0.42, W * 0.95, Hm * 0.62, 11, 0.45);
      let mound = A.P(L[0], mb, 0.85) + A.P(L[1], A.blob(r, -W * 0.18, -Hm * 0.62, W * 0.62, Hm * 0.4, 8, 0.5), 0.75);
      if (s >= 3) {
        const n = win ? 9 : s === 3 ? 10 : 14 + (o.variant % 3) * 2;
        for (let i = 0; i < n; i++) {
          const a = (i / (n - 1) - 0.5) * 1.5 + rr(r, -0.06, 0.06), len = Hm + 12 + rr(r, 0, 12) - Math.abs(a) * 8, bx = rr(r, -W * 0.3, W * 0.3);
          const st = A.stem(bx, -Hm * 0.5, a, len, rr(r, -1.2, 1.2));
          stems += st.d;
          // the spike: a column of beads along the last third (round caps)
          const k = s === 3 ? 0.78 : 0.62;
          for (let j = 0; j < 6; j++) {
            const t = k + (1 - k) * (j / 5), p = st.pt(t);
            spikes[j % 3] += `M${f1(p[0] - 0.5)} ${f1(p[1])}h1`;
          }
        }
      }
      const spikeCols = s === 3 ? [L[1], L[2], A.mix(L[2], col[1], 0.4)] : [col[0], col[1], col[2]];
      let body = mound + A.S(L[1], 1.3, needles[0]) + A.S(L[3], 1, needles[1], 0.9) + A.S(win ? '#9a9a7a' : L[1], 0.7, stems)
        + A.S(spikeCols[0], 2.8, spikes[0]) + A.S(spikeCols[1], 2.6, spikes[1]) + A.S(spikeCols[2], 2, spikes[2]);
      if (win) body += gartSnowCap(A, 0, -Hm * 1.05, W * 1.6, 1.3);
      return out + gartSway(o, r, body, 'soft');
    },
  });

  /* ---------- poppy: feathery leaves, wiry hairy stems, nodding buds, papery cups ---------- */
  const POPPY = [[FL.scarlet, '#1a1418'], [FL.orange, '#3a2a1a'], [FL.pink, '#3a1a2a'], [FL.white, '#2a2a3a'], [['#4a2a6a', '#8a4aa0', '#b47ac4'], '#1a1020'], [['#c87a1a', '#f2a62a', '#fbd06a'], '#3a2a14']];
  gartDefine('form:poppy', {
    box: [46, 60],
    draw(o, r) {
      const col = gartPick(POPPY.map(x => x[0]), o), eye = gartC2(o, POPPY[o.variant % POPPY.length][1]), s = o.s5, L = gartSeasonLeaf(o, 'silver'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'pip', col[1]);
      const F = gartFoliage(L);
      // feathery basal leaves: a midrib with notched leaflets
      const nl = s === 1 ? 3 : 6;
      let ribs = '';
      for (let i = 0; i < nl; i++) {
        const a = (i / (nl - 1) - 0.5) * 2.4 + rr(r, -0.1, 0.1), len = (s === 1 ? 6 : 11) + rr(r, 0, 3), [tx, ty] = A.at(0, 0, a, len);
        ribs += `M0 0L${f1(tx)} ${f1(ty)}`;
        for (let k = 1; k <= 3; k++) { const p = A.at(0, 0, a, len * k / 4); F.leaf(p[0], p[1], a - 0.9, len * 0.32, 1.1, { light: k % 2 === 0 }).leaf(p[0], p[1], a + 0.9, len * 0.3, 1.1, { light: false }); }
      }
      let out = A.shadow(8 + s * 2.6, 2.8), stems = '', heads = '', pods = '';
      if (s >= 3) {
        const n = s === 3 ? 3 : 3 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const a = (i / (n - 1) - 0.5) * 0.8 + rr(r, -0.1, 0.1), h = 30 + rr(r, 0, 16) - Math.abs(a) * 6;
          const bud = s === 3 || (i === n - 1 && !win && o.season !== 'autumn');
          if (bud) {
            // the nodding bud: the stem hooks over at the top
            const st = A.stem(rr(r, -2, 2), 0, a, h - 6, rr(r, -2, 2)), [tx, ty] = st.tip, dir = a >= 0 ? 1 : -1;
            stems += st.d + `Q${f1(tx + dir * 1)} ${f1(ty - 5)} ${f1(tx + dir * 4)} ${f1(ty - 3)}`;
            heads += A.P(L[1], A.ell(tx + dir * 4.6, ty, 2.4, 3.2)) + A.P(L[2], A.ell(tx + dir * 4, ty - 0.8, 1.1, 2), 0.8) + (s === 4 ? A.P(col[1], `M${f1(tx + dir * 4.6 - 1)} ${f1(ty + 2.8)}q1 1.6 2 0z`) : '');
            continue;
          }
          const st = A.stem(rr(r, -2, 2), 0, a, h, rr(r, -2.5, 2.5)), [tx, ty] = st.tip;
          stems += st.d;
          if (win || (o.season === 'autumn' && i % 2 === 0)) {
            // the pepper-pot seed pod with its flat crown
            pods += `M${f1(tx - 2.6)} ${f1(ty)}q0-4.6 2.6-4.8q2.6 0.2 2.6 4.8q-2.6 1.4-5.2 0z`;
            pods += `M${f1(tx - 3.2)} ${f1(ty - 4.8)}h6.4l-0.6 1.2h-5.2z`;
            if (win) heads += gartSnowCap(A, tx, ty - 5.4, 6.4, 0.5);
            continue;
          }
          const R = 6.4 + rr(r, -0.6, 1), tilt = 0.55 + rr(r, 0, 0.25);
          let hh = '';
          // two big back petals, two front petals: a papery cup seen from a little above
          hh += A.P(col[0], A.petal(tx, ty, -0.95, R, R * 0.62) + A.petal(tx, ty, 0.95, R, R * 0.62));
          hh += A.P(col[1], A.petal(tx, ty + 0.6, -0.45, R * 1.02, R * 0.64) + A.petal(tx, ty + 0.6, 0.5, R * 1.02, R * 0.64));
          hh += A.P(col[1], `M${f1(tx - R * 0.9)} ${f1(ty)}Q${f1(tx)} ${f1(ty + R * 0.9 * tilt)} ${f1(tx + R * 0.9)} ${f1(ty)}Q${f1(tx)} ${f1(ty + R * 0.3)} ${f1(tx - R * 0.9)} ${f1(ty)}z`);
          hh += A.P(col[2], A.petal(tx, ty + 0.6, -0.45, R * 0.8, R * 0.3), 0.6);
          hh += A.P(eye, A.ell(tx, ty - R * 0.35, R * 0.34, R * 0.24)) + A.P('#8a9a6a', A.ell(tx, ty - R * 0.42, R * 0.17, R * 0.12));
          heads += gartNod(o, r, hh);
        }
      }
      let body = A.S(L[0], 0.7, ribs, 0.6) + F.out({ lightOp: 0.7 }) + A.S(win ? '#8a8060' : L[1], 0.9, stems) + A.P(win ? '#7a6a4a' : '#9aa070', pods) + heads;
      if (win) body += gartSnowCap(A, 0, -3, 18, 0.8);
      return out + gartSway(o, r, body, 'soft');
    },
  });
})();
