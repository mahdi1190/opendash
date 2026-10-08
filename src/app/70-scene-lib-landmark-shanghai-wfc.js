/* ============================================================
   SCENE LIBRARY: landmark.shanghai-wfc (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the slab tower with the opening at its top in the hand-drawn shanghai-skyline art
   (`scene upgrade asia-east/shanghai-skyline --box 790,175,885,645`):
   - the real structure: the 492 m Shanghai World Financial Center, a square prism cut by two
     sweeping arcs so its plan narrows to a line at the flat top, with the trapezoidal opening
     through the top (wider above) and the observation bridge across its foot
   - seen from the Bund: the broad face in blue-grey glass, the arc face narrowing to nothing at
     the top on the right, mechanical floors as bands, a low podium
   - night: the opening outlined in light, the edges and the bands picked out (the 'lit' part);
     the windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const H = 492;
  const xl = h => -29 + 2 * h / H, xc = h => 21 + 6 * Math.pow(h / H, 0.8), xr = h => 29 - 2 * h / H;   // left edge, crease, right edge
  const Z = [0, 62, 124, 186, 248, 310, 372, 434, H];
  const AP = [[-20, -484], [20, -484], [13, -446], [-13, -446]];   // the opening (wound against the face, so it is a hole)
  define({
    id: 'landmark.shanghai-wfc', category: 'landmark', size: [64, 492], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#c4d2de', '#8ea4ba', '#62788f', '#e2eaf2'], metal: ['#d6dce2', '#97a3b0', '#6a7684'], base: ['#c8ccd0', '#90979e'],
      dark: '#3e4c5c', lightW: '#eaf4ff', blue: '#8cc8ff', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#f0f4ff' }, on: 0.8 },
    shadow: { rx: 34, ry: 4, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:shanghai', 'asia', 'asia-east', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn shanghai-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const pts = (f, a, b) => { const o = []; for (let h = a; h <= b + 0.01; h += (b - a) / 4) o.push([f(h), -h]); return o; };
      const cells = [];
      // the whole height in two faces (what a small still keeps); the zones over them carry the detail
      body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -29, y1: 0, x2: 27, y2: 0 }, d: poly(pts(xl, 0, H).concat(pts(xc, 0, H).reverse())) + poly(AP.slice().reverse()) },
        ['@glass.2', poly(pts(xc, 0, H).concat(pts(xr, 0, H).reverse()))]);
      for (let i = 0; i < Z.length - 1; i++) {
        const a = Z[i], b = Z[i + 1], top = i === Z.length - 2;
        // the broad face (the sky reflected a little differently zone by zone), with the opening cut through the top zone
        const face = poly(pts(xl, a, b).concat(pts(xc, a, b).reverse())) + (top ? poly(AP.slice().reverse()) : '');
        body.push({ f: { lin: [[0, i % 2 ? '@glass.3' : '@glass.0'], [1, '@glass.1']], x1: -29, y1: 0, x2: 27, y2: 0 }, d: face, detail: true });
        // the arc face on the right, narrowing upwards
        body.push({ f: '@glass.2', d: poly(pts(xc, a, b).concat(pts(xr, a, b).reverse())), op: i % 2 ? 0.9 : 1, detail: true });
        // floor lines and mullions (fine)
        let fl = '', mu = '';
        for (let h = a + 4.5; h < b - 1; h += 4.5) if (!(top && h > 444 && h < 486)) fl += `M${f1(xl(h))} ${f1(-h)}H${f1(xc(h))}`;
        for (let x = -24; x < 21; x += 6) mu += `M${x} ${-a - 2}V${-b + (top ? 50 : 2)}`;
        body.push({ s: '@glass.2', w: 0.6, op: 0.45, d: fl, detail: true }, { s: '@glass.3', w: 0.6, op: 0.35, d: mu, detail: true });
        if (i) body.push(['@metal.1', rect(xl(a), -a - 1.6, xc(a) - xl(a), 3.2)], ['@metal.2', rect(xc(a), -a - 1.6, xr(a) - xc(a), 3.2)]);
        if (i) lit.push({ s: '@lightW', w: 1, op: 0.55, d: `M${f1(xl(a))} ${f1(-a)}H${f1(xr(a))}` });
        for (let h = a + 7; h < b - 3; h += 14) if (!(top && h > 440)) for (let x = xl(h) + 2; x < xc(h) - 8; x += 11.5) cells.push([x, -h - 3, 9, 2.4]);
      }
      sceneDraw.winGroups(r, cells, 12).forEach(d => body.push({ f: '@glass.2', d, op: 0.3, glow: 'window', detail: true }));
      // the opening: its ceiling in shade, the sunlit right-hand inner wall, the observation bridge across its foot, a steel frame
      body.push(['@dark', poly([[-20, -484], [20, -484], [19, -481], [-19, -481]]), 0.8], ['@metal.0', poly([[20, -484], [13, -446], [11, -447], [17.4, -481]]), 0.9]);
      body.push(['@metal.1', rect(-13, -448.5, 26, 3)], { f: '@dark', d: rect(-12, -451, 24, 2.4), glow: 'window' }, { s: '@metal.0', w: 1.4, d: poly(AP) });
      // the flat top's parapet, the sunlit left edge, the crease between the faces
      body.push(['@metal.0', rect(-27, -H - 1, 54, 3)], ['@metal.2', rect(14, -H - 1, 13, 3), 0.6]);
      body.push({ s: '@glass.3', w: 1.2, op: 0.8, d: `M${f1(xl(0))} 0L${f1(xl(H))} ${-H}` }, { s: '@glass.2', w: 1, op: 0.8, d: pts(xc, 0, H).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') });
      // the podium: a low block, its glazing and canopy
      body.push(['@base.0', rect(-42, -22, 40, 22)], ['@base.1', rect(-2, -22, 44, 22)], ['@metal.0', rect(-44, -24, 88, 2.4)]);
      const pod = []; for (let x = -40; x < 40; x += 5) { pod.push([x, -19, 3.4, 6]); pod.push([x, -10, 3.4, 6]); }
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@dark', d, glow: 'window' }));
      // night: the opening outlined in blue-white light, the bridge lit, the parapet, the edges, the corner beacons
      lit.push({ s: '@blue', w: 2.2, op: 0.95, d: poly(AP) }, { f: { lin: [[0, '@blue', 0], [1, '@blue', 0.45]], x1: 0, y1: -484, x2: 0, y2: -446 }, d: poly([[-20, -484], [20, -484], [13, -446], [-13, -446]]) });
      lit.push({ f: '@lightW', d: rect(-12, -451, 24, 2.4), op: 0.9 }, { s: '@lightW', w: 1.4, op: 0.85, d: `M-27 ${-H + 0.5}H27` }, { s: '@blue', w: 1.2, op: 0.7, d: `M${f1(xl(0))} -24L${f1(xl(H))} ${-H}` });
      lit.push({ s: '@lightW', w: 1, op: 0.6, d: pts(xc, 24, H).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') });
      for (const x of [-26, 26]) { body.push(['@beacon', ell(x, -H - 2, 1, 1)]); lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: x, cy: -H - 2, r: 4 }, d: ell(x, -H - 2, 4, 4) }); }
      return { body, lit };
    },
  });
})();
