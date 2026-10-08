/* ============================================================
   SCENE LIBRARY: landmark.tokyo-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the lattice tower in the hand-drawn tokyo-skyline art
   (`scene upgrade asia-east/tokyo-skyline --box 380,100,740,775`):
   - the real structure: a square steel lattice tower (333 m) on four splayed legs with an arch between
     each pair, the low base building between the legs, the two-storey Main Deck at 150 m and the small
     Top Deck at 250 m, then the banded antenna; the profile curves in like its Paris model
   - painted in the aviation bands of international orange and white, orange at the foot and the tip
   - seen corner-on: the left face in the sun, the right in shade, the corner leg between them,
     X-bracing and girts on both faces (fine shapes are `detail`, so small stills stay light)
   - night: the warm floodlighting from inside the lattice and the lit decks (the 'lit' part), the
     deck and base windows (glow)
   No text, no logos. Anchor: the ground at the middle of the base.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const hw = h => 6.5 + 61.5 * Math.pow(Math.max(0, 1 - h / 356), 1.7);   // the lattice's half-width at height h
  const cx = h => -0.16 * hw(h);                                          // the corner leg, a little left of the centre
  // the lattice in its paint bands: [from, to, orange or white]
  const SEG = [[0, 74, 'o'], [74, 86, 'w'], [86, 150, 'o'], [150, 161, 'w'], [161, 245, 'o'], [245, 255, 'w'], [255, 291, 'o'], [291, 300, 'w'], [300, 352, 'o']];
  define({
    id: 'landmark.tokyo-tower', category: 'landmark', size: [140, 462], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      orange: ['#f26a32', '#c4502c', '#9c3a1e'], white: ['#f7f3ec', '#cfc8c0'], deck: ['#eeece8', '#b6b3b0', '#80838a'],
      glass: ['#4e5d72', '#34404f'], base: ['#dcd8d0', '#aca79e', '#7d7870'], lightW: '#ffae52', lightS: '#ffe4b4', beacon: '#ff3b2f',
    } },
    night: { glow: { window: '#ffe1a6' }, on: 0.82 },
    shadow: { rx: 72, ry: 6, h: 90 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:tokyo', 'asia', 'asia-east', 'tower', 'lattice'],
    credit: 'native (scene engine upgrade), after the hand-drawn tokyo-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const L = h => [-hw(h), -h], C = h => [cx(h), -h], Rt = h => [hw(h), -h];
      // a face between heights a and b, its edges following the curved profile
      const hs = (a, b) => { const n = Math.max(1, Math.ceil((b - a) / 12)), o = []; for (let i = 0; i <= n; i++) o.push(a + (b - a) * i / n); return o; };
      const face = (a, b, side) => { const e0 = side ? C : L, e1 = side ? Rt : C; return poly(hs(a, b).map(e0).concat(hs(a, b).reverse().map(e1))); };
      // the face of the legs: two legs and an arch between them (the sky shows through)
      const arch = (side, b) => {
        const x0 = side ? cx(0) : -hw(0), x1 = side ? hw(0) : cx(0), lw = (x1 - x0) * 0.2, up = hs(0, b).reverse().map(side ? C : L), dn = hs(0, b).map(side ? Rt : C);
        return { d: `M${f1(x0)} 0H${f1(x0 + lw)}Q${f1((x0 + x1) / 2)} -112 ${f1(x1 - lw)} 0H${f1(x1)}` + dn.slice(1).map(p => `L${f1(p[0])} ${f1(p[1])}`).join('') + up.map(p => `L${f1(p[0])} ${f1(p[1])}`).join('') + 'z', a: `M${f1(x0 + lw)} 0Q${f1((x0 + x1) / 2)} -112 ${f1(x1 - lw)} 0` };
      };
      // the base building between the legs (seen through the arches), its windows in three rows
      body.push(['@base.0', rect(-56, -27, 47, 27)], ['@base.1', rect(-9, -27, 65, 27)], ['@base.2', rect(-58, -29, 116, 2.4)]);
      const cells = [];
      for (let row = 0; row < 3; row++) for (let x = -52; x < 52; x += 6) cells.push([x, -23 + row * 7, 4, 3.4]);
      sceneDraw.winGroups(r, cells, 3).forEach(d => body.push({ f: '@glass.0', d, op: 0.8, glow: 'window', detail: true }));
      // the lattice, band by band: the two faces, X-bracing and girts on the orange bands
      for (const [a, b, k] of SEG) {
        const o = k === 'o';
        if (a === 0) {
          for (const side of [0, 1]) { const A = arch(side, b); body.push({ f: side ? '@orange.1' : '@orange.0', op: 0.95, d: A.d }, { s: '@orange.2', w: 1.6, op: 0.9, d: A.a }); }
          continue;
        }
        body.push([o ? '@orange.0' : '@white.0', face(a, b, 0), o ? 0.94 : 1], [o ? '@orange.1' : '@white.1', face(a, b, 1), o ? 0.94 : 1]);
        if (!o) continue;
        const n = Math.max(1, Math.round((b - a) / 24));
        for (const side of [0, 1]) {
          let x = '', g = '';
          for (let i = 0; i < n; i++) {
            const p = a + (b - a) * i / n, q = a + (b - a) * (i + 1) / n, lp = side ? C(p) : L(p), rp = side ? Rt(p) : C(p), lq = side ? C(q) : L(q), rq = side ? Rt(q) : C(q);
            x += `M${f1(lp[0])} ${f1(lp[1])}L${f1(rq[0])} ${f1(rq[1])}M${f1(rp[0])} ${f1(rp[1])}L${f1(lq[0])} ${f1(lq[1])}`;
            if (i) g += `M${f1(lp[0])} ${f1(lp[1])}L${f1(rp[0])} ${f1(rp[1])}`;
          }
          body.push({ s: '@orange.2', w: 1.1, op: side ? 0.9 : 0.75, d: x, detail: true });
          if (g) body.push({ s: '@orange.2', w: 1.4, op: 0.8, d: g, detail: true });
        }
      }
      // the three legs' edges: the sunlit left edge, the corner leg, the shaded right edge
      const edge = f => { let d = ''; for (let h = 0; h <= 352; h += 16) d += (h ? 'L' : 'M') + f1(f(h)[0]) + ' ' + f1(f(h)[1]); return d; };
      body.push({ s: '@white.0', w: 1.2, op: 0.55, d: edge(L) }, { s: '@orange.0', w: 2.2, op: 0.9, d: edge(C) }, { s: '@orange.2', w: 1.6, op: 0.8, d: edge(Rt) });
      // the Main Deck: two storeys of glass round the lattice, wider than it, a white roof slab and a shadow under it
      const deck = (y0, y1, ex, nw) => {
        const h = (y0 + y1) / 2, w = hw(h) + ex, c = cx(h) * 1.4;
        body.push(['@deck.0', rect(-w, -y1, w + c, y1 - y0)], ['@deck.1', rect(c, -y1, w - c, y1 - y0)]);
        body.push(['@orange.2', rect(-w + 2, -y0, w * 2 - 4, 2.4), 0.55], ['@white.0', rect(-w - 1.5, -y1 - 2.4, w * 2 + 3, 2.4)]);
        const lv = Math.max(1, Math.round((y1 - y0) / 9)), g = [];
        for (let k = 0; k < lv; k++) {
          const yb = -y0 - (y1 - y0) * k / lv - 2.6, hb = (y1 - y0) / lv - 4.2;
          body.push(['@glass.0', rect(-w + 1, yb - hb, w + c - 1, hb), 0.9], ['@glass.1', rect(c, yb - hb, w - c - 1, hb), 0.95]);
          for (let x = -w + 2; x < w - 3; x += 3.2) g.push([x, yb - hb + 0.6, 2.2, hb - 1.2]);
        }
        sceneDraw.winGroups(r, g, nw).forEach(d => body.push({ f: '@glass.0', d, glow: 'window', detail: true }));
        lit.push({ f: '@lightS', d: rect(-w + 1, -y1 + 1.5, w * 2 - 2, y1 - y0 - 3), op: 0.85 }, { s: '@lightW', w: 1.4, op: 0.9, d: `M${f1(-w - 1.5)} ${f1(-y1 - 1.2)}h${f1(w * 2 + 3)}` });
      };
      deck(197, 217, 7, 4);
      deck(337, 348, 4, 2);
      // the antenna: a narrow banded lattice, a platform, the banded mast and the beacon
      for (let i = 0; i < 6; i++) {
        const a = 352 + i * 7, b = a + 7, wa = 5.4 - i * 0.45, wb = wa - 0.45;
        body.push([i % 2 ? '@white.0' : '@orange.0', poly([[-wa, -a], [wa * 0.4, -a], [wb * 0.4, -b], [-wb, -b]])], [i % 2 ? '@white.1' : '@orange.1', poly([[wa * 0.4, -a], [wa, -a], [wb, -b], [wb * 0.4, -b]])]);
      }
      body.push(['@deck.2', rect(-4.4, -397, 8.8, 3)]);
      for (let i = 0; i < 7; i++) { const a = 397 + i * 8, w = 1.7 - i * 0.12; body.push([i % 2 ? '@white.0' : '@orange.0', rect(-w, -a - 8, w * 2, 8)]); }
      body.push({ s: '@deck.2', w: 0.8, d: 'M0 -453V-461' }, ['@beacon', ell(0, -460.5, 1.3, 1.3)], ['@beacon', ell(0, -398.5, 1, 1), 0.9]);
      // night: the floodlit lattice (a warm wash up each face), the bracing picked out in light, the edges, the mast and beacons
      // (the wash follows the faces and leaves the arches dark; the lit bracing is the body's own, in light)
      for (const side of [0, 1]) {
        lit.push({ f: { lin: [[0, '@lightW', side ? 0.42 : 0.58], [1, '@lightW', side ? 0.16 : 0.24]], x1: 0, y1: 0, x2: 0, y2: -352 }, d: arch(side, 74).d + face(74, 352, side) });
        let xs = '';
        for (const [a, b, k] of SEG) if (k === 'o' && a) { const n = Math.max(1, Math.round((b - a) / 24)); for (let i = 0; i < n; i++) { const p = a + (b - a) * i / n, q = a + (b - a) * (i + 1) / n, lp = side ? C(p) : L(p), rq = side ? Rt(q) : C(q), rp = side ? Rt(p) : C(p), lq = side ? C(q) : L(q); xs += `M${f1(lp[0])} ${f1(lp[1])}L${f1(rq[0])} ${f1(rq[1])}M${f1(rp[0])} ${f1(rp[1])}L${f1(lq[0])} ${f1(lq[1])}`; } }
        lit.push({ s: '@lightS', w: 0.9, op: side ? 0.4 : 0.55, d: xs, detail: true });
      }
      lit.push({ s: '@lightS', w: 1.4, op: 0.8, d: edge(L) }, { s: '@lightS', w: 1.4, op: 0.8, d: edge(C) }, { s: '@lightW', w: 1.4, op: 0.75, d: edge(Rt) });
      lit.push({ s: '@lightS', w: 1.4, op: 0.85, d: 'M0 -352V-453' }, { f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -460.5, r: 6 }, d: ell(0, -460.5, 6, 6) }, ['@beacon', ell(0, -460.5, 1.8, 1.8)],
        { f: { rad: [[0, '@lightW', 0.35], [1, '@lightW', 0]], cx: 0, cy: -8, r: 60 }, d: ell(0, -8, 60, 16) }, { f: '@lightS', d: rect(-55, -26, 110, 20), op: 0.3 });
      return { body, lit };
    },
  });
})();
