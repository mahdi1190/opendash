/* ============================================================
   GARDEN ART, wildflowers and herbs (2.18, agent 'garden-art'). Wild: the
   forms cup-small (buttercup), clover (and the four-leaf clover), bell-cluster
   (cowslip), star-small (red campion), umbel (cow parsley), orchid-spike (bee
   orchid), flat (primrose), thistle, grass (meadow grass), fern; the harebell
   and the chrysanthemum. Herbs: leafy (basil, mint, water mint), leafy-soft
   (sage), frilly (parsley, coriander), needle-bush (rosemary), mat (thyme),
   grass-flower (chives), daisy-small (chamomile). PURE.
   Anchor: the foot at (0, 0). Light from the left.
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const snowFoot = (w) => A.P(PAL.snow, `M${-w} 0.6q${f1(w * 0.45)}-3 ${w}-2.4q${f1(w * 0.55)}-0.6 ${w} 2.4z`, 0.95);
  const colOf = (o, c) => o.col || A.tone3(c);
  /** Five rounded petals round (x, y), seen a little from above (tilt), with an eye; notch draws heart-shaped petals. */
  function five(x, y, R, col, eye, tilt, notch, rot) {
    let p = '', n = '';
    for (let k = 0; k < 5; k++) {
      const a = (rot || 0) + k / 5 * Math.PI * 2, px = x + Math.cos(a) * R * 0.55, py = y + Math.sin(a) * R * 0.55 * (tilt || 1);
      p += A.ell(px, py, R * 0.5, R * 0.5 * (tilt || 1));
      if (notch) n += `M${f1(x + Math.cos(a) * R * 1.04)} ${f1(y + Math.sin(a) * R * 1.04 * (tilt || 1))}L${f1(x + Math.cos(a) * R * 0.78)} ${f1(y + Math.sin(a) * R * 0.78 * (tilt || 1))}`;
    }
    return A.P(col[1], p) + (notch ? A.S(col[0], R * 0.16, n, 0.7) : '') + A.P(col[2], A.ell(x - R * 0.35, y - R * 0.3 * (tilt || 1), R * 0.3, R * 0.22 * (tilt || 1)), 0.7) + (eye ? A.P(eye, A.ell(x, y, R * 0.28, R * 0.28 * (tilt || 1))) : '');
  }

  /* ---------- cup-small (buttercup): branching wiry stems, glossy little gold cups, cut leaves ---------- */
  gartDefine('form:cup-small', {
    box: [40, 34],
    draw(o, r) {
      const col = colOf(o, '#f7d417'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      for (let i = 0; i < (s === 1 ? 3 : 7); i++) { const a = (i / 6 - 0.5) * 2.6, p = A.at(0, 0, a, 4); for (const k of [-0.5, 0, 0.5]) F.leaf(p[0], p[1], a + k, 4, 1.5); }
      let stems = '', cups = '', gloss = '', out = A.shadow(7 + s * 2, 2.2);
      if (s >= 3 && !win) {
        const n = s === 3 ? 3 : 6;
        for (let i = 0; i < n; i++) {
          const a = (i / (n - 1) - 0.5) * 1.3, h = 14 + rr(r, 0, 12), st = A.stem(rr(r, -2, 2), 0, a, h, rr(r, -2, 2)), [tx, ty] = st.tip;
          stems += st.d;
          if (s === 3) { cups += A.circ(tx, ty, 1.3); continue; }
          // the cup: a bowl of overlapping petals seen from the side, the shine of a buttercup under your chin
          cups += `M${f1(tx - 3.4)} ${f1(ty - 2.4)}Q${f1(tx - 3.4)} ${f1(ty + 2.2)} ${f1(tx)} ${f1(ty + 2.2)}Q${f1(tx + 3.4)} ${f1(ty + 2.2)} ${f1(tx + 3.4)} ${f1(ty - 2.4)}q-1.7 0.6-3.4 0q-1.7 0.6-3.4 0z`;
          gloss += A.ell(tx - 1.6, ty - 0.4, 0.9, 1.4);
        }
      }
      let body = F.out() + A.S(L[1], 0.7, stems) + A.P(s === 3 ? L[2] : col[1], cups) + A.P('#fffbe0', gloss, 0.8);
      if (win) out += snowFoot(9);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- clover: a mat of trefoils with pale chevrons, round pom-pom heads (the lucky one has four leaves) ---------- */
  gartDefine('form:clover', {
    box: [40, 22],
    draw(o, r) {
      const lucky = o.id === 'four-leaf-clover';
      const col = colOf(o, '#e8a7c8'), s = o.s5, L = gartPerennialLeaf(o);
      if (s === 0) return gartSeed(o, A, 'seed', lucky ? '#4fb36a' : col[1]);
      let lf = '', chev = '', stalk = '', heads = '', heads2 = '';
      const n = s === 1 ? 2 : s === 2 ? 6 : 9;
      for (let i = 0; i < n; i++) {
        const x = (i / Math.max(1, n - 1) - 0.5) * 30 + rr(r, -2, 2), y = -rr(r, 3, 9), k = lucky && i === Math.floor(n / 2) ? 4 : 3, R = 2.6 + rr(r, 0, 0.6);
        stalk += `M${f1(x * 0.4)} 0Q${f1(x * 0.8)} ${f1(y * 0.5)} ${f1(x)} ${f1(y)}`;
        for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2 - Math.PI / 2 + (k === 3 ? 0 : Math.PI / 4), lx = x + Math.cos(a) * R * 0.75, ly = y + Math.sin(a) * R * 0.6; lf += A.ell(lx, ly, R * 0.62, R * 0.5); chev += `M${f1(lx - R * 0.3)} ${f1(ly)}l${f1(R * 0.3)} ${f1(-R * 0.15)}l${f1(R * 0.3)} ${f1(R * 0.15)}`; }
      }
      if (s >= 3 && !lucky) {
        for (let i = 0; i < (s === 3 ? 2 : 4); i++) {
          const x = (i - 1.5) * 8 + rr(r, -1.5, 1.5), y = -12 - rr(r, 0, 4);
          stalk += `M${f1(x * 0.6)} 0L${f1(x)} ${f1(y)}`;
          if (s === 3) { heads += A.circ(x, y, 1.6); continue; }
          // a pom-pom: a ball of tiny upturned florets
          for (let j = 0; j < 9; j++) { const a = j / 9 * Math.PI * 2; heads += A.ell(x + Math.cos(a) * 2, y + Math.sin(a) * 2.2, 1.2, 1.5); }
          heads2 += A.circ(x - 0.6, y - 0.8, 1.5);
        }
      }
      let body = A.S(L[1], 0.6, stalk) + A.P(L[0], lf.replace(/a([\d.]+) ([\d.]+)/g, (m, a, b) => `a${f1(+a + 0.3)} ${f1(+b + 0.3)}`), 0.8) + A.P(lucky ? '#3f9a54' : L[1], lf) + A.S(L[3], 0.5, chev, 0.75) + A.P(s === 3 ? L[2] : col[1], heads) + A.P(col[2], heads2, 0.9);
      if (lucky && s === 4) body += gartSpark(A, 9, -14, 3) + gartSpark(A, -10, -10, 2.2);
      let out = A.shadow(16, 2);
      if (o.season === 'winter') body += A.P(PAL.snow, A.ell(-6, -6, 4, 1.2) + A.ell(7, -5, 3.4, 1), 0.9);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- bell-cluster (cowslip): a rosette of crinkled leaves, a stalk crowned with nodding yellow bells ---------- */
  gartDefine('form:bell-cluster', {
    box: [36, 36],
    draw(o, r) {
      const col = colOf(o, '#f2cf3a'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      for (let i = 0; i < (s === 1 ? 3 : 7); i++) { const a = (i / 6 - 0.5) * 2.8; F.leaf(rr(r, -1, 1), 0, a, (s === 1 ? 5 : 9) + rr(r, 0, 2), 2.6, { bulge: 0.6, vein: true }); }
      let stems = '', bells = '', calyx = '', out = A.shadow(8 + s * 1.8, 2.4);
      if (s >= 3) {
        const n = s === 3 || win ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const st = A.stem(i ? 4 : -2, 0, i ? 0.2 : -0.08, 22 - i * 4, rr(r, -1, 1)), [tx, ty] = st.tip;
          stems += st.d;
          for (let j = 0; j < 6; j++) {
            const a = (j / 5 - 0.5) * 2.2 + (i ? 0.4 : -0.2), [bx, by] = A.at(tx, ty, a, 4.4);
            stems += `M${f1(tx)} ${f1(ty)}L${f1(bx)} ${f1(by)}`;
            calyx += A.leaf(bx, by, a + Math.PI, 3.2, 1.1, 0.6);
            if (s === 4 && !win) bells += A.ell(...A.at(bx, by, a + Math.PI * 0.85, 3.6), 1.7, 1.5);
          }
        }
      }
      let body = F.out() + A.S(L[1], 0.8, stems) + A.P(L[2], calyx) + A.P(col[1], bells) + A.P('#e8902a', bells.replace(/a([\d.]+) ([\d.]+)/g, (m, a, b) => `a${f1(a * 0.35)} ${f1(b * 0.35)}`), 0.7);
      if (win) out += snowFoot(10);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- star-small (red campion): hairy forking stems, small pink stars with notched petals ---------- */
  gartDefine('form:star-small', {
    box: [40, 52],
    draw(o, r) {
      const col = colOf(o, '#e05a8a'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      for (let i = 0; i < (s === 1 ? 2 : 5); i++) F.leaf(rr(r, -2, 2), 0, (i / 4 - 0.5) * 2.4, (s === 1 ? 5 : 9) + rr(r, 0, 2), 2, { bulge: 0.55 });
      let stems = '', fl = '', calyx = '', out = A.shadow(8 + s * 2, 2.4);
      if (s >= 3) {
        // the stems fork in pairs: a little candelabra
        const st = A.stem(0, 0, rr(r, -0.05, 0.05), 24, 1), [tx, ty] = st.tip;
        stems += st.d;
        F.leaf(...st.pt(0.4), -0.9, 6, 1.6).leaf(...st.pt(0.4), 0.9, 6, 1.6);
        const ends = [];
        for (const k of [-1, 1]) { const b = A.stem(tx, ty, k * 0.55, 12, k), [bx, by] = b.tip; stems += b.d; ends.push([bx, by]); for (const k2 of [-1, 1]) { const c = A.stem(bx, by, k * 0.4 + k2 * 0.35, 8, 0); stems += c.d; ends.push(c.tip); } }
        ends.forEach(([x, y], i) => {
          calyx += A.ell(x, y + 1.6, 1.3, 2);
          if (s === 3 || win || i % 3 === 2) return;
          fl += five(x, y - 0.6, 3.6, col, A.lt(col[2], 0.4), 0.85, true, r());
        });
      }
      let body = F.out() + A.S(L[1], 0.9, stems) + A.P('#8a4a5a', calyx, 0.85) + fl;
      if (win) out += snowFoot(9);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- umbel (cow parsley): tall hollow stems, ferny leaves, flat lacy white umbrellas ---------- */
  gartDefine('form:umbel', {
    box: [48, 78],
    draw(o, r) {
      const col = colOf(o, '#fbfbf2'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      // ferny leaves: a rib with many tiny leaflets
      for (let i = 0; i < (s === 1 ? 2 : 5); i++) { const a = (i / 4 - 0.5) * 2.2, len = (s === 1 ? 7 : 14) + rr(r, 0, 3); for (let k = 1; k <= 5; k++) { const p = A.at(0, 0, a, len * k / 6); F.leaf(p[0], p[1], a - 0.9, 3, 1.2, { light: k % 2 === 0 }).leaf(p[0], p[1], a + 0.9, 3, 1.2, { light: false }); } }
      let stems = '', rays = '', lace = '', out = A.shadow(10 + s * 2, 2.8);
      if (s >= 3) {
        const n = s === 3 ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const st = A.stem((i - 1) * 6, 0, (i - 1) * 0.16 + rr(r, -0.04, 0.04), (win ? 46 : 66) - Math.abs(i - 1) * 10 + rr(r, -3, 3), rr(r, -2, 2)), [tx, ty] = st.tip;
          stems += st.d;
          // the umbrella: rays fanning up to a flat top of florets
          const R = 11 - Math.abs(i - 1) * 2;
          for (let k = 0; k < 7; k++) {
            const u = (k / 6 - 0.5) * 2, ex = tx + u * R, ey = ty - 5 + u * u * 2;
            rays += `M${f1(tx)} ${f1(ty)}L${f1(ex)} ${f1(ey)}`;
            if (s === 4 && !win) for (let j = 0; j < (o.lod ? 3 : 2); j++) lace += A.circ(ex + rr(r, -1.8, 1.8), ey - rr(r, 0, 2), 1);
            else if (win || s === 3) lace += A.circ(ex, ey - 0.6, 0.7);
          }
        }
      }
      let body = F.out({ lightOp: 0.6 }) + A.S(win ? '#9a8a5a' : L[1], 1, stems) + A.S(win ? '#9a8a5a' : L[1], 0.5, rays) + A.P(win ? '#7a6a4a' : s === 3 ? L[3] : col[1], lace);
      if (win) out += snowFoot(12);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- orchid-spike (bee orchid): a slender spike of pink-winged flowers with a velvety 'bee' lip ---------- */
  gartDefine('form:orchid-spike', {
    box: [30, 46],
    draw(o, r) {
      const col = colOf(o, '#d79ad6'), bee = gartC2(o, '#7a4a2a'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'spore', col[1]);
      const F = gartFoliage(L);
      for (let i = 0; i < (s === 1 ? 2 : 4); i++) F.leaf(rr(r, -1, 1), 0, (i / 3 - 0.5) * 2, (s === 1 ? 5 : 9) + rr(r, 0, 2), 2.2, { bulge: 0.5 });
      let stems = '', wings = '', lips = '', marks = '', out = A.shadow(7 + s * 1.4, 2);
      if (s >= 3) {
        const st = A.stem(0, 0, rr(r, -0.04, 0.04), 36, rr(r, -1.5, 1.5));
        stems = st.d;
        const nf = s === 3 || win ? 0 : 3;
        for (let j = 0; j < nf; j++) {
          const p = st.pt(0.55 + j * 0.15), side = j % 2 ? 1 : -1, x = p[0] + side * 3.4, y = p[1];
          // three pink sepals like wings, the brown furry lip below: a bee visiting a flower that is itself
          wings += A.leaf(x, y, -1.0, 4.4, 1.3) + A.leaf(x, y, 1.0, 4.4, 1.3) + A.leaf(x, y, 0, 4.6, 1.3);
          lips += A.ell(x, y + 2.6, 2.1, 2.7);
          marks += `M${f1(x - 1.2)} ${f1(y + 2)}q1.2-1 2.4 0M${f1(x - 1.2)} ${f1(y + 3.4)}q1.2-0.8 2.4 0`;
        }
        for (let j = 0; j < 3; j++) { const p = st.pt(0.9 + j * 0.035); F.leaf(p[0], p[1], (j % 2 ? 1 : -1) * 0.4, 3, 1.1, { light: false }); }
      }
      let body = F.out() + A.S(L[1], 0.9, stems) + A.P(col[1], wings) + A.P(bee, lips) + A.S('#f2d870', 0.6, marks, 0.85);
      if (win) out += snowFoot(8);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- flat (primrose): a rosette of crinkled leaves, flat pale flowers nestled in it ---------- */
  gartDefine('form:flat', {
    box: [36, 22],
    draw(o, r) {
      const col = colOf(o, '#f8e58c'), eye = gartC2(o, '#f39c12'), s = o.s5, L = gartPerennialLeaf(o);
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      let crink = '';
      for (let i = 0; i < (s === 1 ? 3 : 8); i++) { const a = (i / 7 - 0.5) * 2.9, l = (s === 1 ? 6 : 11) + rr(r, 0, 2); F.leaf(rr(r, -1, 1), 0, a, l, 3, { bulge: 0.62, vein: true }); for (let k = 1; k < 3; k++) { const p = A.at(0, 0, a, l * k / 3); crink += `M${f1(p[0] - Math.cos(a) * 1.6)} ${f1(p[1] - Math.sin(a) * 1.6)}l${f1(Math.cos(a) * 3.2)} ${f1(Math.sin(a) * 3.2)}`; } }
      let fl = '', out = A.shadow(9 + s * 2, 2.2);
      if (s >= 3) {
        const n = s === 3 ? 2 : 4 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const x = (i / Math.max(1, n - 1) - 0.5) * 20 + rr(r, -1, 1), y = -7 - rr(r, 0, 4) + Math.abs(x) * 0.15;
          fl += s === 3 ? A.P(A.mix(L[2], col[1], 0.5), A.ell(x, y, 1.6, 2.2)) : five(x, y, 3.8, col, eye, 0.8, true, 0.3);
        }
      }
      let body = F.out() + A.S(L[0], 0.4, crink, 0.4) + fl;
      if (o.season === 'winter') out += snowFoot(10);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- thistle: spiny grey leaves, a purple shaving brush on a spiny green bulb ---------- */
  gartDefine('form:thistle', {
    box: [44, 70],
    draw(o, r) {
      const col = colOf(o, '#a65fc6'), s = o.s5, L = gartSeasonLeaf(o, 'silver'), win = o.season === 'winter' || o.season === 'autumn';
      if (s === 0) return gartSeed(o, A, 'spore', col[1]);
      // a spiny leaf: a jagged edge of points
      const spinyLeaf = (x, y, a, len) => { const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6, w = Math.sin(t * Math.PI) * len * 0.26 * (i % 2 ? 1.3 : 0.7); pts.push(A.at(...A.at(x, y, a, len * t), a - Math.PI / 2, w)); } for (let i = 6; i >= 0; i--) { const t = i / 6, w = Math.sin(t * Math.PI) * len * 0.26 * (i % 2 ? 1.3 : 0.7); pts.push(A.at(...A.at(x, y, a, len * t), a + Math.PI / 2, w)); } return A.poly(pts); };
      let lv = '', stems = '', heads = '', bulbs = '', spines = '', out = A.shadow(10 + s * 2, 2.8);
      for (let i = 0; i < (s === 1 ? 3 : 6); i++) lv += spinyLeaf(rr(r, -1, 1), 0, (i / 5 - 0.5) * 2.6, (s === 1 ? 7 : 13) + rr(r, 0, 3));
      if (s >= 3) {
        const n = s === 3 ? 2 : 3;
        for (let i = 0; i < n; i++) {
          const st = A.stem((i - 1) * 5, 0, (i - 1) * 0.25, 44 + rr(r, -4, 8) - Math.abs(i - 1) * 8, rr(r, -2, 2)), [tx, ty] = st.tip;
          stems += st.d;
          const p = st.pt(0.45); lv += spinyLeaf(p[0], p[1], (i % 2 ? 1 : -1) * 1, 8);
          bulbs += A.ell(tx, ty, 3.2, 3.6);
          spines += `M${f1(tx - 3)} ${f1(ty + 1)}l-2 1.4M${f1(tx + 3)} ${f1(ty + 1)}l2 1.4M${f1(tx - 2)} ${f1(ty + 3)}l-1.4 2M${f1(tx + 2)} ${f1(ty + 3)}l1.4 2`;
          if (s === 4) {
            // the brush: purple in flower; silky thistledown (a soft white puff) in autumn and winter
            if (win) heads += A.P('#f4f2ec', A.circ(tx, ty - 5, 4.6), 0.85) + A.P('#ffffff', A.circ(tx - 1.2, ty - 6.2, 2.4), 0.9);
            else { let br = '', br2 = ''; for (let k = 0; k < 9; k++) { const a = (k / 8 - 0.5) * 1.7; (k % 2 ? (br2 += `M${f1(tx)} ${f1(ty - 2)}l${f1(Math.sin(a) * 3.8)} ${f1(-Math.cos(a) * 5)}`) : (br += `M${f1(tx)} ${f1(ty - 2)}l${f1(Math.sin(a) * 4.4)} ${f1(-Math.cos(a) * 5.6)}`)); } heads += A.S(col[1], 1.5, br) + A.S(col[2], 1.2, br2); }
          }
        }
      }
      let body = A.P(L[1], lv) + A.S(L[3], 0.4, lv, 0.6) + A.S(L[1], 1.4, stems) + A.P(L[2], bulbs) + A.S(L[0], 0.7, spines) + heads;
      if (o.season === 'winter') out += snowFoot(11);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- grass (meadow grass): a fountain of blades with nodding seed heads ---------- */
  gartDefine('form:grass', {
    box: [40, 54],
    draw(o, r) {
      const col = colOf(o, '#d4c27a'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      let b1 = '', b2 = '', heads = '', out = A.shadow(8 + s * 2, 2.4);
      const n = s === 1 ? 5 : s === 2 ? 11 : 16, H = s === 1 ? 8 : s === 2 ? 22 : 34;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.6 + rr(r, -0.1, 0.1), h = H * rr(r, 0.7, 1.05), bx = rr(r, -3, 3), [tx, ty] = A.at(bx, 0, a * 1.3, h), w = rr(r, 0.8, 1.4);
        const d = `M${f1(bx - w)} 0Q${f1(bx + (tx - bx) * 0.2)} ${f1(ty * 0.6)} ${f1(tx)} ${f1(ty)}Q${f1(bx + (tx - bx) * 0.2 + w)} ${f1(ty * 0.6)} ${f1(bx + w)} 0z`;
        (i % 2 ? (b1 += d) : (b2 += d));
      }
      if (s >= 3) {
        for (let i = 0; i < 5; i++) {
          const a = (i / 4 - 0.5) * 1.1, st = A.stem(rr(r, -2, 2), 0, a, H + 10 + rr(r, 0, 8), (a > 0 ? 1 : -1) * 3), [tx, ty] = st.tip;
          heads += st.d;
          for (let k = 0; k < 4; k++) heads += `M${f1(tx)} ${f1(ty + k * 2.4)}l${f1((k % 2 ? 1 : -1) * 2.6)} ${f1(1.8)}`;
        }
      }
      let body = A.P(win ? '#8a8a6a' : L[1], b2) + A.P(win ? '#b0a87a' : L[2], b1) + A.S(s === 4 ? col[1] : L[3], 0.9, heads);
      if (win) out += snowFoot(10);
      return out + gartSway(o, r, body);
    },
  });

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

  /* ---------- the harebell: hair-fine stems, one nodding pale-blue bell each ---------- */
  gartDefine('plant:harebell', {
    box: [32, 36],
    draw(o, r) {
      const col = colOf(o, '#8aa0e8'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      let stems = '', bells = '', inner = '', fine = '', out = A.shadow(7 + s * 1.6, 2);
      for (let i = 0; i < (s === 1 ? 3 : 8); i++) { const a = (i / 7 - 0.5) * 1.8, [x, y] = A.at(0, 0, a, (s === 1 ? 4 : 8) + rr(r, 0, 3)); fine += `M0 0L${f1(x)} ${f1(y)}`; }
      if (s >= 3) {
        const n = s === 3 || win ? 3 : 5;
        for (let i = 0; i < n; i++) {
          const a = (i / (n - 1) - 0.5) * 0.9, h = 20 + rr(r, 0, 10), st = A.stem(rr(r, -2, 2), 0, a, h, (a > 0 ? 1 : -1) * 2), [tx, ty] = st.tip, dir = a >= 0 ? 1 : -1;
          stems += st.d + `q${dir * 2} -1.6 ${dir * 2.8} 0.8`;
          const bx = tx + dir * 2.8, by = ty + 1.6;
          if (s === 3 || win) { bells += A.leaf(bx, by, Math.PI, 3, 1); continue; }
          bells += `M${f1(bx - 2.8)} ${f1(by + 4)}Q${f1(bx - 2.6)} ${f1(by - 0.6)} ${f1(bx)} ${f1(by - 0.8)}Q${f1(bx + 2.6)} ${f1(by - 0.6)} ${f1(bx + 2.8)} ${f1(by + 4)}l-1-0.8-0.9 0.9-0.9-0.9-0.9 0.9-0.9-0.9z`;
          inner += A.ell(bx - 0.8, by + 1.6, 0.7, 1.6);
        }
      }
      let body = A.S(L[1], 0.7, fine) + A.S(L[1], 0.6, stems) + A.P(s === 3 || win ? L[2] : col[1], bells) + A.P(col[2], inner, 0.6);
      if (win) out += snowFoot(8);
      return out + gartSway(o, r, body);
    },
  });

  /* ---------- the chrysanthemum: autumn's pompoms, bigger than a marigold's, with quilled petals ---------- */
  gartDefine('plant:chrysanthemum', {
    box: [46, 44],
    draw(o, r) {
      const col = colOf(o, '#e9893a'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -10, 1, 0.04)), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 13 : 18, H = s === 1 ? 8 : s === 2 ? 18 : 28;
      if (s >= 2) F.add('back', A.blob(r, 0, -H * 0.45, W, H * 0.45, 10, 0.3));
      for (let i = 0; i < Math.round((s === 1 ? 3 : 12) * Math.max(0.6, o.dn)); i++) { const x = rr(r, -W * 0.8, W * 0.8), y = -rr(r, 2, H * 0.8), a = (x > 0 ? 0.6 : -0.6) + rr(r, -0.6, 0.6); for (const k of [-0.5, 0, 0.5]) F.leaf(x, y, a + k, 4, 1.4, { light: k === 0 }); }
      let heads = '', out = A.shadow(W + 3, 3);
      if (s >= 3) {
        const n = s === 3 ? 4 : 4 + (o.variant % 2);
        for (let i = 0; i < n; i++) {
          const x = (i / (n - 1) - 0.5) * W * 1.6 + rr(r, -1.5, 1.5), y = -H * 0.9 - rr(r, 0, 5) + Math.abs(i / (n - 1) - 0.5) * 8, R = s === 3 ? 2 : 5 + rr(r, -0.4, 0.6);
          if (s === 3) { heads += A.P(L[1], A.circ(x, y, R)) + A.P(col[1], A.ell(x, y - R * 0.6, R * 0.6, R * 0.4)); continue; }
          // incurved quills: three rings of narrow petals curling to the middle
          let q1 = '', q2 = '', q3 = '';
          for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; q1 += A.leaf(x, y, a, R, R * 0.22, 0.55); }
          for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + 0.3; q2 += A.leaf(x, y - R * 0.12, a, R * 0.7, R * 0.2, 0.55); }
          for (let k = 0; k < 5; k++) { const a = k / 6 * Math.PI * 2; q3 += A.leaf(x, y - R * 0.2, a, R * 0.4, R * 0.16, 0.55); }
          heads += A.P(col[0], q1) + A.P(col[1], q2) + A.P(col[2], q3);
          if (win) heads += gartSnowCap(A, x, y - R * 0.8, R * 1.8, 0.5);
        }
      }
      let body = F.out() + heads;
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

  /* ---------- leafy-soft (sage): velvety grey-green ovals with a pebbled texture, violet hooded spikes ---------- */
  gartDefine('form:leafy-soft', {
    box: [44, 40],
    draw(o, r) {
      const col = colOf(o, '#9b7fd1'), s = o.s5, L = gartSeasonLeaf(o, 'silver'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const F = gartFoliage(L);
      const W = s === 1 ? 5 : s === 2 ? 13 : 18, H = s === 1 ? 7 : s === 2 ? 16 : 22;
      let pebble = '', stems = '', spikes = '';
      const nl = s === 1 ? 4 : s === 2 ? 10 : 16;
      for (let i = 0; i < nl; i++) {
        const x = rr(r, -W * 0.7, W * 0.7), y = -rr(r, 1, H * 0.85) * (1 - Math.abs(x) / W * 0.4), a = (x > 0 ? 0.7 : -0.7) + rr(r, -0.6, 0.6), len = 6.6 + rr(r, 0, 2);
        F.leaf(x, y, a, len, len * 0.3, { bulge: 0.5, vein: true });
        const [px, py] = A.at(x, y, a, len * 0.55); pebble += A.circ(px - 0.8, py, 0.4) + A.circ(px + 0.8, py + 0.6, 0.35);
      }
      if (s === 4 && !win) for (let i = 0; i < 3; i++) { const st = A.stem((i - 1) * 7, -H * 0.6, (i - 1) * 0.3, 16, 0); stems += st.d; for (let k = 0; k < 4; k++) { const p = st.pt(0.4 + k * 0.18); spikes += A.leaf(p[0], p[1], (k % 2 ? 1 : -1) * 1.2, 3, 1.2, 0.6); } }
      let body = A.S(L[1], 0.8, stems) + F.out({ lightOp: 0.7 }) + A.P(L[3], pebble, 0.6) + A.P(col[1], spikes);
      if (win && s >= 2) body += gartSnowCap(A, 0, -H * 0.9, W * 1.3, 0.9);
      return A.shadow(W + 3, 2.6) + gartSway(o, r, body);
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

  /* ---------- needle-bush (rosemary): upright woody wands of dark needles, pale blue flowers ---------- */
  gartDefine('form:needle-bush', {
    box: [40, 50],
    draw(o, r) {
      const col = colOf(o, '#7aa0d8'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen'), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'cutting', col[1]);
      let wands = '', n1 = '', n2 = '', fl = '';
      const n = s === 1 ? 2 : s === 2 ? 5 : 9, H = s === 1 ? 10 : s === 2 ? 26 : 44;
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(1, n - 1) - 0.5) * 0.9 + rr(r, -0.05, 0.05), st = A.stem(rr(r, -2, 2), 0, a, H * rr(r, 0.75, 1), rr(r, -2, 2));
        wands += st.d;
        for (let k = 0; k < 9; k++) { const t = 0.2 + k * 0.09, p = st.pt(t), g = st.ang(t), side = k % 2 ? 1 : -1, [ex, ey] = A.at(p[0], p[1], g + side * 0.7, 3.4); (side > 0 ? (n1 += `M${f1(p[0])} ${f1(p[1])}L${f1(ex)} ${f1(ey)}`) : (n2 += `M${f1(p[0])} ${f1(p[1])}L${f1(ex)} ${f1(ey)}`)); if (s === 4 && !win && k % 3 === 1) fl += A.ell(ex, ey - 0.4, 1.1, 0.9); }
      }
      let body = A.S('#6a5a3a', 0.7, wands) + A.S(L[1], 1.6, n1) + A.S(L[2], 1.4, n2) + A.P(col[1], fl);
      if (win && s >= 2) body += A.P(PAL.snow, A.ell(-4, -H * 0.9, 4, 1.2) + A.ell(5, -H * 0.8, 3.6, 1.1), 0.95);
      return A.shadow(10 + s * 1.6, 2.6) + gartSway(o, r, body);
    },
  });

  /* ---------- mat (thyme): a low creeping cushion of tiny leaves, a haze of pink flowers ---------- */
  gartDefine('form:mat', {
    box: [46, 18],
    draw(o, r) {
      const col = colOf(o, '#c49ad8'), s = o.s5, L = gartSeasonLeaf(o, 'evergreen').map(c => A.shift(c, -12, 0.85, 0.06)), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', col[1]);
      const W = s === 1 ? 6 : s === 2 ? 14 : 20, H = s === 1 ? 4 : s === 2 ? 7 : 9;
      let dots = '', dots2 = '', fl = '';
      for (let i = 0; i < (s === 1 ? 12 : 46); i++) { const x = rr(r, -W, W), y = -rr(r, 0.6, H) * (1 - (x / W) ** 2 * 0.7); (x < 0 && y < -H * 0.5 ? (dots2 += A.ell(x, y, 1.1, 0.8)) : (dots += A.ell(x, y, 1.1, 0.8))); }
      if (s === 4 && !win) for (let i = 0; i < 26; i++) { const x = rr(r, -W * 0.9, W * 0.9), y = -rr(r, H * 0.5, H * 1.15) * (1 - (x / W) ** 2 * 0.7); fl += A.circ(x, y, 0.95); }
      let body = A.P(L[0], A.blob(r, 0, -H * 0.42, W * 0.95, H * 0.5, 10, 0.3)) + A.P(L[1], dots) + A.P(L[3], dots2) + A.P(col[1], fl) + A.P(col[2], fl.replace(/a0\.9[5]? 0\.9[5]?/g, 'a0.4 0.4'), 0.8);
      if (win) body += gartSnowCap(A, 0, -H * 0.9, W * 1.5, 0.8);
      return A.shadow(W + 2, 2) + body;
    },
  });

  /* ---------- grass-flower (chives): a clump of hollow tubes, round lilac pompoms on top ---------- */
  gartDefine('form:grass-flower', {
    box: [32, 40],
    draw(o, r) {
      const col = colOf(o, '#b77fd1'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'bulb', col[1]);
      let t1 = '', t2 = '', heads = '', heads2 = '';
      const n = s === 1 ? 4 : s === 2 ? 9 : 14, H = s === 1 ? 8 : s === 2 ? 20 : 28;
      for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 0.7 + rr(r, -0.05, 0.05), h = H * rr(r, 0.75, 1.05) * (win ? 0.6 : 1), [tx, ty] = A.at(rr(r, -2, 2), 0, a, h); (i % 2 ? (t1 += `M${f1(tx - Math.sin(a) * h)} 0L${f1(tx)} ${f1(ty)}`) : (t2 += `M${f1(tx - Math.sin(a) * h)} 0L${f1(tx)} ${f1(ty)}`)); }
      if (s >= 3 && !win) for (let i = 0; i < (s === 3 ? 3 : 5); i++) {
        const x = (i / 4 - 0.5) * 14 + rr(r, -1, 1), y = -H - 3 - rr(r, 0, 4);
        t1 += `M${f1(x * 0.5)} 0L${f1(x)} ${f1(y)}`;
        if (s === 3) { heads += A.leaf(x, y + 1, 0, 4, 1.4); continue; }
        let p = '';
        for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; p += A.star(x + Math.cos(a) * 1.8, y - 2 + Math.sin(a) * 1.8, 5, 1.2, 0.5); }
        heads += A.circ(x, y - 2, 2.8) + p; heads2 += A.circ(x - 0.8, y - 2.8, 1.3);
      }
      let body = A.S(L[0], 1.6, t2) + A.S(L[2], 1.4, t1) + A.P(s === 3 ? L[2] : col[1], heads) + A.P(col[2], heads2, 0.8);
      if (win) body += A.P(PAL.snow, 'M-9 0.6q4-3 9-2.4q5-0.6 9 2.4z', 0.95);
      return A.shadow(8 + s, 2) + gartSway(o, r, body);
    },
  });

  /* ---------- daisy-small (chamomile): feathery threads, tiny daisies with domed golden middles ---------- */
  gartDefine('form:daisy-small', {
    box: [40, 32],
    draw(o, r) {
      const col = colOf(o, '#fcfcf5'), disc = gartC2(o, '#f4c430'), s = o.s5, L = gartPerennialLeaf(o), win = o.season === 'winter';
      if (s === 0) return gartSeed(o, A, 'seed', disc);
      let threads = '', stems = '', heads = '';
      const n = s === 1 ? 4 : s === 2 ? 9 : 12, H = s === 1 ? 7 : s === 2 ? 16 : 24;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 1.3, st = A.stem(rr(r, -2, 2), 0, a, H * rr(r, 0.7, 1), rr(r, -2, 2)), [tx, ty] = st.tip;
        stems += st.d;
        for (let k = 0; k < 3; k++) { const p = st.pt(0.25 + k * 0.2); threads += `M${f1(p[0])} ${f1(p[1])}l${(k % 2 ? 1 : -1) * 3} -2.4M${f1(p[0])} ${f1(p[1])}l${(k % 2 ? 1 : -1) * 2} 1`; }
        if (s < 3 || i % 2) continue;
        if (s === 3 || win) { heads += A.P(L[2], A.circ(tx, ty, 1.4)); continue; }
        heads += gartDaisyHead(A, tx, ty, { n: 11, L: 3.2, W: 0.75, rc: 1.3, tilt: 0.7, back: col[0], front: col[1], disc, discDark: A.dk(disc, 0.2), cone: true, twist: r() });
      }
      let body = A.S(L[1], 0.7, stems) + A.S(L[2], 0.6, threads) + heads;
      if (win) body += A.P(PAL.snow, 'M-10 0.6q5-3 10-2.4q5-0.6 10 2.4z', 0.95);
      return A.shadow(9 + s * 1.6, 2.2) + gartSway(o, r, body);
    },
  });
})();
