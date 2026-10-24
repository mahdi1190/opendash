/* ============================================================
   GARDEN ART, the ground (2.18, agent 'garden-art'): the tiles (grass, soil,
   tilled rows, orchard grass, meadow, pond water and edge, greenhouse floor,
   wild ground) and the ground-layer decorations (stepping stones, gravel,
   brick in herringbone or basket weave, flagstones, mossy stones, a
   boardwalk that turns with r, a sunburst mosaic). PURE.
   Seen from above in the contract's tile box: x -32..32, y -40..0 (the
   renderer squeezes it into a 48 x 30 cell). Texture stays off the edges or
   wraps, so cells tile without seams; marks are seeded by t, so neighbours
   differ. Colours from the catalogue's tile rows (c, c2, autumn, winter).
   ============================================================ */
(function () {
  const A = GART, PAL = GART_PAL;
  const { f1, rr } = A;
  const X0 = -32, Y0 = -40, TW = 64, TH = 40;
  const cell = c => A.P(c, A.rect(X0, Y0, TW, TH));
  const tileCol = (o, id, fb) => { const t = (typeof gardenTile === 'function' && gardenTile(id)) || null; if (!t) return fb; return o.season === 'winter' ? t.winter : o.season === 'autumn' ? t.autumn : t.c; };
  const tileC2 = (o, id, fb) => { const t = (typeof gardenTile === 'function' && gardenTile(id)) || null; return (t && t.c2) || fb; };
  /** n random points inside the tile, kept m units off the edges. */
  const pts = (r, n, m) => { const out = []; for (let i = 0; i < n; i++) out.push([X0 + m + r() * (TW - 2 * m), Y0 + m + r() * (TH - 2 * m)]); return out; };
  const tuft = (x, y, h) => `M${f1(x)} ${f1(y)}l${f1(-h * 0.35)} ${f1(-h)}M${f1(x)} ${f1(y)}l0 ${f1(-h * 1.1)}M${f1(x)} ${f1(y)}l${f1(h * 0.4)} ${f1(-h * 0.9)}`;

  /* ---------- tiles ---------- */
  gartDefine('tile:grass', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'grass', '#8cc25a'), dk = A.shift(c, 6, 1, -0.1), lt = A.shift(c, -8, 0.95, 0.08);
      let t1 = '', t2 = '', extra = '';
      pts(r, o.lod ? 14 : 7, 3).forEach(([x, y], i) => { (i % 2 ? (t1 += tuft(x, y, 3.4)) : (t2 += tuft(x, y, 2.8))); });
      if (o.season === 'spring' && r() < 0.6) { const [x, y] = pts(r, 1, 6)[0]; extra += A.P('#ffffff', A.star(x, y, 6, 2, 1)) + A.P('#f2c21e', A.circ(x, y, 0.8)); }
      if (o.season === 'autumn') pts(r, 2, 5).forEach(([x, y], i) => { extra += A.P(['#d9671c', '#e8a23a'][i], A.leaf(x, y, r() * 6, 4, 1.4)); });
      if (o.season === 'winter') extra += A.S('#ffffff', 0.8, t1, 0.6);
      return cell(c) + A.S(dk, 0.9, t1, 0.75) + A.S(lt, 0.8, t2, 0.8) + extra;
    },
  });
  gartDefine('tile:orchard-grass', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'orchard-grass', '#9ac46a'), dk = A.shift(c, 6, 1, -0.12), lt = A.shift(c, -8, 0.95, 0.1);
      let t1 = '', t2 = '', clover = '', extra = '';
      pts(r, o.lod ? 12 : 6, 3).forEach(([x, y], i) => { (i % 2 ? (t1 += tuft(x, y, 5)) : (t2 += tuft(x, y, 4))); });
      if (r() < 0.7) { const [x, y] = pts(r, 1, 6)[0]; for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; clover += A.ell(x + Math.cos(a) * 1.6, y + Math.sin(a) * 1.2, 1.5, 1.2); } }
      if (o.season === 'autumn' && r() < 0.6) { const [x, y] = pts(r, 1, 6)[0]; extra += A.P('#c0392b', A.circ(x, y, 2.4)) + A.P('#ec6a4a', A.circ(x - 0.8, y - 0.8, 0.9)) + A.S('#5a3a1a', 0.6, `M${f1(x)} ${f1(y - 2.4)}l0.6-1.6`); }
      return cell(c) + A.P(dk, clover, 0.8) + A.S(dk, 1, t1, 0.75) + A.S(lt, 0.9, t2, 0.8) + extra;
    },
  });
  gartDefine('tile:long-grass', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'long-grass', '#a8c86a'), c2 = tileC2(o, 'long-grass', '#c4cf7a'), dk = A.shift(c, 8, 1, -0.14);
      let blades = '', blades2 = '', heads = '', fl = '';
      pts(r, o.lod ? 16 : 8, 4).forEach(([x, y], i) => { const lean = rr(r, -2, 2); const d = `M${f1(x - 2)} ${f1(y)}q${f1(lean)} -5 ${f1(lean * 1.5)} -9M${f1(x)} ${f1(y)}q${f1(lean * 0.5)} -6 ${f1(lean)} -11M${f1(x + 2)} ${f1(y)}q${f1(-lean)} -4 ${f1(-lean * 0.6)} -8`; (i % 2 ? (blades += d) : (blades2 += d)); if (i % 3 === 0) heads += `M${f1(x + lean)} ${f1(y - 11)}l0.4-3`; });
      if (o.season === 'summer' || o.season === 'spring') pts(r, 3, 6).forEach(([x, y], i) => { fl += A.P(['#f7d417', '#fbfbf6', '#e05a8a', '#8aa0e8'][(i + Math.floor(o.t * 8)) % 4], A.circ(x, y - 6, 1.5)); });
      return cell(c) + A.P(c2, A.blob(r, 0, -20, 22, 12, 9, 0.5), 0.35) + A.S(dk, 0.9, blades) + A.S(A.lt(c, 0.2), 0.8, blades2) + A.S(o.season === 'winter' ? '#b0a080' : '#c8b46a', 1.4, heads) + fl;
    },
  });
  gartDefine('tile:wild-ground', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'wild-ground', '#9aa86a'), dk = A.shift(c, 8, 1, -0.16);
      let weeds = '', leaves = '', clock = '';
      pts(r, o.lod ? 9 : 5, 4).forEach(([x, y], i) => { weeds += tuft(x, y, 4 + (i % 3)); if (i % 3 === 0) leaves += A.leaf(x + 3, y, 1.2, 4, 1.4) + A.leaf(x + 3, y, -1.4, 4, 1.4); });
      if (r() < 0.5) { const [x, y] = pts(r, 1, 8)[0]; clock = A.S(dk, 0.6, `M${f1(x)} ${f1(y)}v-8`) + (o.season === 'summer' || o.season === 'spring' ? A.P('#f2c21e', A.circ(x, y - 8, 1.8)) : A.P('#f4f2ea', A.circ(x, y - 8, 2.2), 0.9)); }
      return cell(c) + A.P(A.lt(c, 0.12), A.blob(r, -8, -22, 14, 8, 8, 0.6), 0.5) + A.S(dk, 1, weeds) + A.P(dk, leaves, 0.8) + clock;
    },
  });
  gartDefine('tile:soil', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'soil', '#8a5a3a'), c2 = tileC2(o, 'soil', '#74482c');
      let dark = '', light = '', stones = '';
      pts(r, o.lod ? 20 : 10, 2).forEach(([x, y], i) => { (i % 2 ? (dark += A.ell(x, y, 1.4, 0.9)) : (light += A.ell(x, y, 1, 0.6))); });
      pts(r, 2, 5).forEach(([x, y]) => { stones += A.ell(x, y, 1.8, 1.1); });
      let s = cell(c) + A.P(c2, dark, 0.8) + A.P(A.lt(c, 0.22), light, 0.7) + A.P('#b8ab98', stones) + A.P('#d8ccb8', stones.replace(/a([\d.]+) ([\d.]+)/g, (m, a2, b2) => `a${f1(a2 * 0.5)} ${f1(b2 * 0.5)}`), 0.8);
      if (o.season === 'winter') s += A.P('#f2f4f6', A.blob(r, -10, -24, 10, 4, 7, 0.5) + A.blob(r, 14, -10, 8, 3, 7, 0.5), 0.75);
      return s;
    },
  });
  gartDefine('tile:tilled', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'tilled', '#7a4a2e'), c2 = tileC2(o, 'tilled', '#5f3822');
      // two ridges per cell: a lit crest, a shaded furrow, crumbs on top
      let ridges = '', crests = '', crumbs = '';
      for (let k = 0; k < 2; k++) { const y = Y0 + 10 + k * 20; ridges += `M${X0} ${y + 6}Q0 ${y + 4} ${X0 + TW} ${y + 6}V${y + 9}H${X0}z`; crests += `M${X0} ${y - 2}Q0 ${y - 4} ${X0 + TW} ${y - 2}V${y + 1}Q0 ${y - 1} ${X0} ${y + 1}z`; for (let i = 0; i < (o.lod ? 8 : 4); i++) crumbs += A.ell(X0 + 3 + r() * (TW - 6), y - 1 + r() * 2, 1, 0.6); }
      let s = cell(c) + A.P(c2, ridges) + A.P(A.lt(c, 0.2), crests, 0.8) + A.P(A.lt(c, 0.35), crumbs, 0.8);
      if (o.season === 'winter') s += A.P('#f2f4f6', crests, 0.65);
      return s;
    },
  });
  gartDefine('tile:pond-water', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'pond-water', '#5f9fc4'), c2 = tileC2(o, 'pond-water', '#4f8ab0');
      let s = cell(c) + A.P(c2, A.blob(r, 6, -16, 22, 10, 9, 0.4), 0.6);
      if (o.season === 'winter') return s + A.P('#e8f2f8', A.rect(X0, Y0, TW, TH), 0.55) + A.S('#ffffff', 0.8, `M${-20 + r() * 8} -30l10 6 4 10M${4 + r() * 6} -34l-4 12 10 8`, 0.7);
      const [x, y] = pts(r, 1, 12)[0];
      s += A.S('#ffffff', 1, `M${f1(x - 8)} ${f1(y)}q8-2 16 0`, 0.45) + A.S('#ffffff', 0.8, `M${f1(-x - 6)} ${f1(-y - 40 - 4)}q6-1.4 12 0`, 0.35);
      if (o.anim) s += `<g class="gda-ripple" style="${A.T(r, 0, 4)}">${A.S('#ffffff', 0.9, A.ell(x * 0.5, y + 6, 6, 2), 0.6)}</g>`;
      return s;
    },
  });
  gartDefine('tile:pond-edge', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'pond-edge', '#9aa88a'), dk = A.shift(c, 8, 1, -0.14);
      let pebbles = '', pebL = '', reeds = '';
      pts(r, 6, 4).forEach(([x, y]) => { pebbles += A.ell(x, y, 2.4 + r() * 1.6, 1.4 + r()); pebL += A.ell(x - 0.6, y - 0.5, 1, 0.5); });
      pts(r, 2, 6).forEach(([x, y]) => { reeds += `M${f1(x)} ${f1(y)}l-1.4-9M${f1(x + 1)} ${f1(y)}l0.6-11M${f1(x + 2)} ${f1(y)}l2-8`; });
      return cell(c) + A.P(dk, A.blob(r, -6, -20, 16, 8, 8, 0.5), 0.35) + A.P('#a49e92', pebbles) + A.P('#d0cabe', pebL, 0.8) + A.S(o.season === 'winter' ? '#b0a080' : '#5f8a4a', 1.1, reeds);
    },
  });
  gartDefine('tile:glasshouse', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const c = tileCol(o, 'glasshouse', '#c9b8a0'), c2 = tileC2(o, 'glasshouse', '#b0a088');
      // square terracotta-and-stone floor tiles, a trug of compost spilled on one now and then
      let s = cell(c2);
      const q = [[X0 + 1, Y0 + 1], [X0 + 33, Y0 + 1], [X0 + 1, Y0 + 21], [X0 + 33, Y0 + 21]];
      q.forEach(([x, y], i) => { s += A.P(i % 3 === 0 ? c : A.shift(c, 6, 1, -0.04), A.rrect(x, y, 30, 18, 1.4)) + A.P(A.lt(c, 0.25), A.rect(x + 1.4, y + 1.2, 12, 2), 0.6); });
      if (r() < 0.35) s += A.P('#7a5a3a', A.blob(r, 8, -10, 5, 2.4, 7, 0.5), 0.8);
      return s;
    },
  });

  /* ---------- ground-layer decorations (paths) ---------- */
  const decorC = (o, fb) => [(o.look && o.look.c) || fb[0], (o.look && o.look.c2) || fb[1]];
  gartDefine('decor:stepping-stones', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = decorC(o, ['#b9b2a4', '#8f877a']);
      let s = '';
      [[-15, -27, 10, 6.4], [12, -20, 11, 7], [-6, -8, 9, 5.6]].forEach(([x, y, rx, ry]) => {
        x += rr(r, -2, 2); y += rr(r, -1.5, 1.5);
        s += A.P(c2, A.blob(r, x + 0.6, y + 1.2, rx, ry, 9, 0.18)) + A.P(c, A.blob(r, x, y, rx * 0.94, ry * 0.9, 9, 0.18)) + A.P(A.lt(c, 0.3), A.ell(x - rx * 0.3, y - ry * 0.3, rx * 0.4, ry * 0.3), 0.6);
      });
      if (o.season === 'winter') s += A.P('#ffffff', A.ell(-15, -28, 6, 3) + A.ell(12, -21, 7, 3.4), 0.7);
      return s;
    },
  });
  gartDefine('decor:gravel-path', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = decorC(o, ['#d6cdb8', '#b0a58c']);
      let a = '', b = '', l = '';
      for (let i = 0; i < (o.lod ? 46 : 22); i++) { const x = X0 + 1.5 + r() * (TW - 3), y = Y0 + 1.5 + r() * (TH - 3), rx = 0.8 + r() * 1.2; (i % 3 === 0 ? (l += A.ell(x, y, rx, rx * 0.7)) : i % 3 === 1 ? (a += A.ell(x, y, rx, rx * 0.7)) : (b += A.ell(x, y, rx, rx * 0.7))); }
      let s = cell(c) + A.P(c2, a) + A.P(A.dk(c2, 0.2), b, 0.7) + A.P('#f4f0e6', l, 0.8);
      if (o.season === 'winter') s += A.P('#ffffff', A.blob(r, 0, -20, 22, 10, 9, 0.5), 0.45);
      return s;
    },
  });
  gartDefine('decor:brick-path', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = decorC(o, ['#b5573a', '#8a3f2a']), mortar = '#d8ccb8';
      let bricks = '', bricksL = '';
      // bricks are axis-aligned rectangles clipped to the cell by arithmetic (no clipPath: the photo mode and every
      // renderer draw the same thing)
      const clip = (x, y, w, h) => { const x0 = Math.max(X0, x), y0 = Math.max(Y0, y), x1 = Math.min(X0 + TW, x + w), y1 = Math.min(0, y + h); return x1 - x0 > 0.4 && y1 - y0 > 0.4 ? A.rect(x0, y0, x1 - x0, y1 - y0) : ''; };
      if (o.variant % 2 === 0) {
        // herringbone: staircases of a long brick then a standing one, repeated every (2, -2) units (u = 4.4)
        const u = 4.4, g = 0.55;
        for (let k = -14; k <= 14; k++) for (let n = -14; n <= 14; n++) {
          const ox = X0 + (n + 2 * k) * u, oy = Y0 + (n - 2 * k) * u;
          bricks += clip(ox + g / 2, oy + g / 2, 2 * u - g, u - g);
          bricksL += clip(ox + 2 * u + g / 2, oy - u + g / 2, u - g, 2 * u - g);
        }
      } else {
        // basket weave: squares of two bricks, turning by halves
        for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
          const x = X0 + col * 13, y = Y0 + row * 13.4, turn = (row + col) % 2;
          for (let k = 0; k < 2; k++) (turn ? (bricks += clip(x + 0.6 + k * 6.3, y + 0.6, 5.7, 12)) : (bricksL += clip(x + 0.6, y + 0.6 + k * 6.5, 12, 5.9)));
        }
      }
      return cell(mortar) + A.P(c, bricks) + A.P(A.shift(c, 4, 1, -0.06), bricksL) + (o.season === 'winter' ? A.P('#ffffff', A.blob(r, 6, -24, 12, 5, 8, 0.5), 0.55) : '');
    },
  });
  gartDefine('decor:flagstones', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = decorC(o, ['#c7c2b8', '#9d968a']);
      let slabs = '', slabsD = '', lit = '';
      const j = () => rr(r, -1.6, 1.6);
      [[X0 + 1, Y0 + 1, 34, 18], [X0 + 37, Y0 + 1, 26, 22], [X0 + 1, Y0 + 21, 22, 18], [X0 + 25, Y0 + 25, 38, 14]].forEach(([x, y, w, h], i) => {
        const p = A.poly([[x + j() + 1, y + j() + 1], [x + w + j() - 1, y + j() + 1], [x + w + j() - 1, y + h + j() - 1], [x + j() + 1, y + h + j() - 1]]);
        (i % 2 ? (slabsD += p) : (slabs += p));
        lit += A.rect(x + 3, y + 2.4, w * 0.4, 1.4);
      });
      return cell(c2) + A.P(c, slabs) + A.P(A.shift(c, 0, 1, -0.05), slabsD) + A.P('#ffffff', lit, 0.35) + (o.season === 'winter' ? A.P('#ffffff', A.blob(r, -10, -30, 10, 4, 8, 0.5), 0.6) : '');
    },
  });
  gartDefine('decor:moss-stones', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, moss] = decorC(o, ['#a9a99a', '#6f9a4a']);
      let st = '', stL = '', ms = '';
      for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
        const x = X0 + 6.4 + col * 13 + (row % 2) * 6, y = Y0 + 7 + row * 13;
        if (x > X0 + TW - 4) continue;
        st += A.blob(r, x, y, 5.6, 5, 8, 0.25); stL += A.ell(x - 1.6, y - 1.6, 2, 1.4);
        if (r() < 0.6) ms += A.blob(r, x + rr(r, -4, 4), y + 4.6, 3.6, 1.6, 7, 0.5);
      }
      return cell(A.dk(moss, 0.2)) + A.P(c, st) + A.P(A.lt(c, 0.3), stL, 0.6) + A.P(o.season === 'winter' ? '#8a9a7a' : moss, ms) + A.P(A.lt(moss, 0.3), ms.replace(/M([-\d.]+) ([-\d.]+)/g, (m, x, y) => `M${f1(+x - 0.5)} ${f1(+y - 0.5)}`), 0.4);
    },
  });
  gartDefine('decor:boardwalk', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = decorC(o, ['#a87c4f', '#7a5636']);
      const across = o.r % 2 === 1;
      let planks = '', planksL = '', nails = '', grain = '';
      if (!across) for (let k = 0; k < 5; k++) { const y = Y0 + k * 8 + 0.6; planks += A.rect(X0, y, TW, 6.8); planksL += A.rect(X0, y, TW, 1.4); nails += A.circ(X0 + 4, y + 3.4, 0.6) + A.circ(X0 + TW - 4, y + 3.4, 0.6); grain += `M${X0 + 8 + r() * 20} ${f1(y + 3 + r() * 2)}h${f1(10 + r() * 12)}`; }
      else for (let k = 0; k < 6; k++) { const x = X0 + k * 10.67 + 0.6; planks += A.rect(x, Y0, 9.4, TH); planksL += A.rect(x, Y0, 1.6, TH); nails += A.circ(x + 4.7, Y0 + 3, 0.6) + A.circ(x + 4.7, -3, 0.6); grain += `M${f1(x + 3 + r() * 4)} ${Y0 + 6 + r() * 10}v${f1(8 + r() * 10)}`; }
      return cell(c2) + A.P(c, planks) + A.P(A.lt(c, 0.25), planksL, 0.7) + A.S(c2, 0.6, grain, 0.6) + A.P('#4a3a2a', nails) + (o.season === 'winter' ? A.P('#ffffff', planksL, 0.7) : '');
    },
  });
  gartDefine('decor:mosaic-path', {
    box: [64, 40], fit: 'none',
    draw(o, r) {
      const [c, c2] = decorC(o, ['#3a7fc4', '#f2b33a']);
      const third = ['#f4efe4', '#e05a4a', '#4fae6a'][o.variant % 3];
      // a sunburst: rings of tiny square tesserae round a golden sun
      let t1 = '', t2 = '', t3 = '';
      for (let ring = 1; ring < 7; ring++) {
        const n = ring * 7, R = ring * 3.6;
        for (let k = 0; k < n; k++) {
          const a = k / n * Math.PI * 2, x = Math.cos(a) * R, y = -20 + Math.sin(a) * R * 0.66;
          if (x < X0 + 1.5 || x > X0 + TW - 1.5 || y < Y0 + 1.5 || y > -1.5) continue;
          const d = A.rect(x - 1.2, y - 1.2, 2.4, 2.4), ray = k % ring === 0;
          (ring <= 2 || ray ? (t2 += d) : ring % 2 ? (t1 += d) : (t3 += d));
        }
      }
      return cell('#e8e0d0') + A.P(c, t1) + A.P(third, t3) + A.P(c2, t2) + A.P(c2, A.circ(0, -20, 3.4)) + A.P('#fff4c0', A.circ(-1, -21, 1.2), 0.8);
    },
  });
})();
