/* ============================================================
   SCENE LIBRARY: landmark.shanghai-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the tallest, curving tower in the hand-drawn shanghai-skyline art
   (`scene upgrade asia-east/shanghai-skyline --box 915,60,1070,645`):
   - the real structure: the 632 m Shanghai Tower, a rounded-triangle glass tower whose floor
     plates turn as it rises, so the notch in its skin spirals up the face and the silhouette
     tapers in a smooth curve; nine zones divided by the refuge floors (bands in the glass),
     the open crown at the top with its sloping edge, a low podium
   - pale silver-blue glass: lit to the left of the spiral notch, turning away into shade to
     its right
   - night: the notch and the zone bands traced in white light, the crown aglow, the beacon
     (the 'lit' part); the windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const hw = h => (h <= 560 ? 41 - 19 * Math.pow(h / 560, 1.25) : 22 - (h - 560) * 0.05);   // the half-width: a convex taper, then the crown
  const nu = h => -0.35 + 1.2 * Math.min(1, h / 600);                                      // the notch, as a share of the half-width
  const nx = h => nu(h) * hw(h);
  const Z = [0, 72, 135, 196, 256, 315, 372, 428, 482, 535];
  define({
    id: 'landmark.shanghai-tower', category: 'landmark', size: [84, 632], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#dbe6ee', '#a8bacb', '#7a90a7', '#f0f6fa'], notch: '#46586c', base: ['#c6ccd2', '#8e98a2'], crown: ['#c4d2de', '#9aaec0'],
      lightW: '#f2faff', blue: '#a4d4ff', beacon: '#ff4a3a', dark: '#40505f',
    } },
    night: { glow: { window: '#eef6ff' }, on: 0.8 },
    shadow: { rx: 44, ry: 4, h: 70 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:shanghai', 'asia', 'asia-east', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn shanghai-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const hs = (a, b) => { const n = Math.max(2, Math.ceil((b - a) / 14)), o = []; for (let i = 0; i <= n; i++) o.push(a + (b - a) * i / n); return o; };
      const line = f => (a, b) => hs(a, b).map(h => [f(h), -h]);
      const L = line(h => -hw(h)), N = line(nx), Rt = line(h => hw(h));
      const cells = [];
      // the whole height in two faces (what a small still keeps); the zones over them carry the detail
      body.push({ f: { lin: [[0, '@glass.3'], [0.6, '@glass.0'], [1, '@glass.1']], x1: -41, y1: 0, x2: 10, y2: 0 }, d: poly(L(0, 535).concat(N(0, 535).reverse())) },
        { f: { lin: [[0, '@glass.1'], [1, '@glass.2']], x1: -10, y1: 0, x2: 41, y2: 0 }, d: poly(N(0, 535).concat(Rt(0, 535).reverse())) });
      for (let i = 0; i < Z.length - 1; i++) {
        const a = Z[i], b = Z[i + 1];
        // the lit glass left of the notch, the shaded glass right of it
        body.push({ f: { lin: [[0, '@glass.3'], [0.6, '@glass.0'], [1, '@glass.1']], x1: -hw(a), y1: 0, x2: nx(a), y2: 0 }, d: poly(L(a, b).concat(N(a, b).reverse())), detail: true });
        body.push({ f: { lin: [[0, '@glass.1'], [1, '@glass.2']], x1: nx(a), y1: 0, x2: hw(a), y2: 0 }, d: poly(N(a, b).concat(Rt(a, b).reverse())), detail: true });
        // the curtain wall's mullions (curving with the face) and a streak of sky reflection
        let mu = '';
        for (let k = 1; k < 8; k++) { const u = -1 + 2 * k / 8; mu += `M${f1(u * hw(a))} ${-a - 3}L${f1(u * hw(b))} ${-b + 3}`; }
        body.push({ s: '@glass.2', w: 0.6, op: 0.35, d: mu, detail: true }, { s: '@glass.3', w: 2.2, op: 0.35, d: `M${f1(-hw(a) * 0.7)} ${-a - 4}L${f1(-hw(b) * 0.55)} ${-b + 4}`, detail: true });
        // the refuge floor at the zone's top: a band in the glass (lit in a white line at night)
        body.push({ s: '@glass.2', w: 2.4, op: 0.75, d: `M${f1(-hw(b))} ${-b}H${f1(hw(b))}` });
        lit.push({ s: '@lightW', w: 1.2, op: 0.7, d: `M${f1(-hw(b))} ${-b}H${f1(hw(b))}` });
        for (let h = a + 7; h < b - 4; h += 14) for (let x = -hw(h) + 3; x < hw(h) - 9; x += 13) cells.push([x, -h - 3, 10, 2.6]);
      }
      sceneDraw.winGroups(r, cells, 12).forEach(d => body.push({ f: '@glass.2', d, op: 0.3, glow: 'window', detail: true }));
      // the spiral notch: a shadowed groove with its lit lip
      const groove = N(0, 535).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('');
      body.push({ s: '@notch', w: 3.4, op: 0.95, d: groove }, { s: '@glass.3', w: 1.3, op: 0.95, d: N(0, 535).map((p, i) => (i ? 'L' : 'M') + f1(p[0] - 2.4) + ' ' + f1(p[1])).join('') });
      // the edges: the sunlit left, the right turning into shade
      body.push({ s: '@glass.3', w: 1.1, op: 0.8, d: L(0, 535).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') }, { s: '@glass.2', w: 1.1, op: 0.8, d: Rt(0, 535).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') });
      // the crown: an open frame (its inside darker), its edge sloping up to the right, the frame's ribs
      const c0 = 535, top = h => [[-hw(c0) + 1, -614], [hw(632) - 0.5, -632]];
      body.push(['@crown.1', poly([[-hw(c0), -c0], [hw(c0), -c0], [hw(632), -632], [-hw(612), -612]])]);
      body.push(['@dark', poly([[-hw(c0) + 4, -c0 - 6], [hw(c0) - 4, -c0 - 6], [hw(630) - 3, -626], [-hw(612) + 4, -610]]), 0.3]);
      let ribs = ''; for (let k = 0; k <= 6; k++) { const u = -1 + 2 * k / 6, yt = -612 - 20 * (u + 1) / 2; ribs += `M${f1(u * hw(c0))} ${-c0}L${f1(u * hw(620))} ${f1(yt)}`; }
      for (let h = c0 + 14; h < 612; h += 14) ribs += `M${f1(-hw(h))} ${-h}H${f1(hw(h))}`;
      body.push({ s: '@crown.0', w: 1, op: 0.85, d: ribs }, { s: '@glass.3', w: 1.8, d: `M${f1(top()[0][0])} ${top()[0][1]}L${f1(top()[1][0])} ${top()[1][1]}` });
      body.push(['@beacon', ell(hw(632) - 2, -633.5, 1.1, 1.1)]);
      // the podium: a low, curving glass base
      body.push(['@base.0', 'M-56 0V-14Q-30 -20 0 -20Q30 -20 56 -14V0z'], ['@base.1', 'M8 0V-20Q32 -20 56 -14V0z', 0.9], ['@glass.3', 'M-56 -14Q-30 -20 0 -20Q30 -20 56 -14V-12.5Q30 -18.5 0 -18.5Q-30 -18.5 -56 -12.5z']);
      const pod = []; for (let x = -52; x < 52; x += 4.5) pod.push([x, -11, 3, 7]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@dark', d, glow: 'window' }));
      // night: the notch in light, the crown glowing, the edges and the beacon
      lit.push({ s: '@blue', w: 1.8, op: 0.95, d: groove }, { f: { lin: [[0, '@blue', 0.15], [1, '@lightW', 0.6]], x1: 0, y1: -c0, x2: 0, y2: -632 }, d: poly([[-hw(c0), -c0], [hw(c0), -c0], [hw(632), -632], [-hw(612), -612]]) });
      lit.push({ s: '@lightW', w: 1, op: 0.7, d: ribs, detail: true }, { s: '@blue', w: 1, op: 0.55, d: L(0, 612).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') });
      lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: hw(632) - 2, cy: -633.5, r: 4.5 }, d: ell(hw(632) - 2, -633.5, 4.5, 4.5) });
      return { body, lit };
    },
  });
})();
