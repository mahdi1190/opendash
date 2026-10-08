/* ============================================================
   SCENE LIBRARY: landmark.kingdom-centre (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the slab tower with the sky bridge in the hand-drawn riyadh-skyline art
   (`scene upgrade asia-west/riyadh-skyline --box 975,40,1180,705`), redrawn by hand:
   - the real structure: the 302 m Kingdom Centre tower in Riyadh, an elliptical tower whose broad
     face narrows a little towards the top, its upper third cut through by a large opening shaped
     like a hanging chain (a U, rounded at the bottom, widening upwards), the two horns either
     side of it joined at the top by the enclosed sky bridge (the hand-drawn art had the opening
     upside down); a low podium at its foot
   - silver-blue glass, lit from the left: the curved face shades to the right, the mullions
     close up towards the edges (the curve), floors as fine lines, ribbon windows, the inner wall
     of the opening catching the light
   - night: the outline of the opening, the sky bridge and the tower's edges in LED light (the
     'lit' part), the windows (glow), the red aviation lights on the two tips
   No text, no logos. Anchor: the ground at the middle of the tower's face.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const H = 302, V = 196, TOP = 296;   // the tip height, the bottom of the opening, the top of the opening (under the bridge)
  // the half-width of the face (narrowing a little, then curving in towards the tips) and of the opening (a U from V up)
  const wo = h => 38 - 3 * h / H - (h > 200 ? 5 * Math.pow((h - 200) / (H - 200), 2) : 0);
  const wi = h => (h <= V ? 0 : 26 * Math.sqrt(Math.min(1.06, (h - V) / (TOP - V))));
  const Z = [0, 40, 80, 120, 160, V];   // the zones of the full face (the horns above V are zoned on their own)
  const HZ = [V, 232, 266, H];
  define({
    id: 'landmark.kingdom-centre', category: 'landmark', size: [168, 304], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#d2dce4', '#97a9b8', '#6a7e90', '#eaf1f6'], metal: ['#e4e8ec', '#a6b0ba', '#6e7a86'], pod: ['#d8cebe', '#b2a796', '#8a8070'],
      dark: '#33465a', edge: '#b8c8ff', led: '#d8e2ff', bridge: '#fff3d8', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe6b0' }, on: 0.8 },
    shadow: { rx: 50, ry: 5, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:riyadh', 'asia', 'asia-west', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn riyadh-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const side = (f, a, b, n) => { const o = []; for (let k = 0; k <= n; k++) { const h = a + (b - a) * k / n; o.push([f(h), -h]); } return o; };
      const L = h => -wo(h), R = h => wo(h), IL = h => -wi(h), IR = h => wi(h);
      // the whole tower in one face (what a small still keeps): up the left edge, round the U, down the right edge
      const outline = side(L, 0, H, 16).concat(side(IL, H, V, 12), side(IR, V, H, 12).slice(1), side(R, H, 0, 16));
      body.push({ f: { lin: [[0, '@glass.3'], [0.35, '@glass.0'], [1, '@glass.2']], x1: -38, y1: 0, x2: 38, y2: 0 }, d: poly(outline) });
      // the shaded right third of the curved face, full height (the curve turning away from the light)
      body.push(['@glass.2', poly(side(h => wo(h) * 0.42, 0, V, 8).concat(side(R, V, 0, 8))), 0.55]);
      const cells = [];
      // the full face in zones: the glass reflects the sky a little differently zone by zone; spandrel bands between them
      for (let i = 0; i < Z.length - 1; i++) {
        const a = Z[i], b = Z[i + 1];
        body.push({ f: { lin: [[0, i % 2 ? '@glass.3' : '@glass.0'], [0.4, '@glass.0'], [1, '@glass.1']], x1: -38, y1: 0, x2: 38, y2: 0 }, d: poly(side(L, a, b, 3).concat(side(R, b, a, 3))), detail: true });
        body.push({ f: '@glass.2', d: poly(side(h => wo(h) * 0.42, a, b, 2).concat(side(R, b, a, 2))), op: i % 2 ? 0.5 : 0.62, detail: true });
        let fl = ''; for (let h = a + 4; h < b - 1; h += 4) fl += `M${f1(L(h))} ${-h}H${f1(R(h))}`;
        body.push({ s: '@glass.2', w: 0.5, op: 0.4, d: fl, detail: true });
        if (i) body.push(['@metal.1', rect(L(a), -a - 1, 2 * wo(a), 2), 0.6]);
        // the sky's reflection, a soft vertical streak on the lit side of the curve
        body.push({ f: { lin: [[0, '@glass.3', 0], [0.5, '@glass.3', 0.55], [1, '@glass.3', 0]], x1: -30, y1: 0, x2: -12, y2: 0 }, d: poly(side(h => -wo(h) * 0.8, a + 2, b - 2, 2).concat(side(h => -wo(h) * 0.34, b - 2, a + 2, 2))), detail: true });
        for (let h = a + 7; h < b - 3; h += 14) for (let k = -5; k <= 3; k++) { const x = wo(h) * Math.sin(k / 6.2 * Math.PI / 2); cells.push([x - 2.6, -h - 1.3, 5.2, 2.6]); }
      }
      // the mullions close up towards the edges (the elliptical face turning away), the full height in one stroke
      let mu = ''; for (let k = -7; k <= 7; k++) { const t = Math.sin(k / 7.6 * Math.PI / 2); mu += `M${f1(t * wo(2))} -2L${f1(t * wo(V))} ${-V}`; }
      body.push({ s: '@glass.3', w: 0.6, op: 0.35, d: mu, detail: true });
      // the two horns either side of the opening, in zones, with their floors and windows
      for (const sg of [-1, 1]) for (let i = 0; i < HZ.length - 1; i++) {
        const a = HZ[i], b = HZ[i + 1], out = h => sg * wo(h), inn = h => sg * wi(h);
        const face = poly(side(out, a, b, 4).concat(side(inn, b, a, 4)));
        body.push({ f: sg < 0 ? (i % 2 ? '@glass.3' : '@glass.0') : '@glass.2', d: face, op: sg < 0 ? 1 : 0.9, detail: true });
        let fl = ''; for (let h = a + 4; h < b - 1; h += 4) fl += `M${f1(out(h))} ${-h}H${f1(inn(h))}`;
        body.push({ s: sg < 0 ? '@glass.2' : '@glass.1', w: 0.5, op: 0.4, d: fl, detail: true });
        for (let h = a + 7; h < b - 3; h += 14) { const x0 = Math.min(out(h), inn(h)) + 1.4, x1 = Math.max(out(h), inn(h)) - 1.4; if (x1 - x0 > 4) cells.push([x0, -h - 1.3, x1 - x0, 2.6]); }
      }
      sceneDraw.winGroups(r, cells, 12).forEach(d => body.push({ f: '@glass.2', d, op: 0.3, glow: 'window', detail: true }));
      // the opening: the sunlit inner wall on the right, the shaded one on the left, the edge of the U
      body.push(['@metal.0', poly(side(IR, V + 2, TOP, 8).concat(side(h => wi(h) - 2.6, TOP, V + 6, 8))), 0.9]);
      body.push(['@dark', poly(side(IL, V + 2, TOP, 8).concat(side(h => -wi(h) + 1.4, TOP, V + 6, 8))), 0.55]);
      const uD = side(IL, H, V, 14).concat(side(IR, V, H, 14).slice(1)).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('');
      body.push({ s: '@metal.0', w: 1.2, op: 0.85, d: uD });
      // the sky bridge across the top of the opening: the enclosed walkway, its glazing and its soffit
      body.push(['@metal.0', rect(-27, -TOP - 1, 54, 7)], ['@metal.2', rect(-27, -TOP + 4, 54, 2), 0.8], { f: '@dark', d: rect(-24, -TOP + 0.4, 48, 2.4), glow: 'window' });
      let ribs = ''; for (let x = -24; x <= 24; x += 4) ribs += `M${x} ${-TOP - 1}v6`;
      body.push({ s: '@metal.1', w: 0.5, op: 0.6, d: ribs, detail: true });
      // the edges: the sunlit left edge, the shaded right edge, the caps of the horns
      body.push({ s: '@glass.3', w: 1.4, op: 0.9, d: side(L, 0, H, 16).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') });
      body.push({ s: '@glass.2', w: 1.2, op: 0.9, d: side(R, 0, H, 16).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') });
      body.push(['@metal.0', poly([[L(H), -H], [IL(H), -H], [IL(H) + 0.3, -H + 1.6], [L(H) + 0.3, -H + 1.6]])], ['@metal.1', poly([[IR(H), -H], [R(H), -H], [R(H) - 0.3, -H + 1.6], [IR(H) - 0.3, -H + 1.6]])]);
      // the podium: low wings either side of the tower, their glazing and the entrance canopy
      body.push(['@pod.1', rect(-82, -16, 46, 16)], ['@pod.2', rect(36, -13, 48, 13)], ['@pod.0', rect(-84, -18, 50, 2.4)], ['@pod.1', rect(34, -15, 52, 2.4)]);
      const pod = []; for (let x = -80; x < -40; x += 10) pod.push([x, -12, 8.6, 5]); for (let x = 39; x < 82; x += 10) pod.push([x, -10, 8.6, 4.4]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@dark', d, glow: 'window' }));
      body.push(['@metal.1', rect(-16, -9, 32, 2)], ['@dark', rect(-12, -7, 24, 7), 0.7]);
      // the red aviation lights on the two tips
      for (const sg of [-1, 1]) { const x = sg * (wo(H) + wi(H)) / 2; body.push(['@beacon', ell(x, -H - 1.2, 1, 1)]); lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: x, cy: -H - 1.2, r: 4 }, d: ell(x, -H - 1.2, 4, 4) }); }
      // night: the opening outlined in LED light with a soft wash inside it, the sky bridge lit, the tower's outline
      lit.push({ s: '@edge', w: 2.2, op: 0.95, d: uD }, { f: { lin: [[0, '@edge', 0.32], [1, '@edge', 0]], x1: 0, y1: -V, x2: 0, y2: -H }, d: poly(side(IL, H, V, 10).concat(side(IR, V, H, 10).slice(1))) });
      lit.push({ f: '@bridge', d: rect(-24, -TOP + 0.4, 48, 2.4), op: 0.95 }, { s: '@led', w: 1, op: 0.8, d: `M-27 ${-TOP - 1}H27M-27 ${-TOP + 6}H27` });
      lit.push({ s: '@edge', w: 1.2, op: 0.6, d: side(L, 18, H, 14).concat(side(R, H, 18, 14)).map((p, i) => (i ? 'L' : 'M') + f1(p[0]) + ' ' + f1(p[1])).join('') });
      lit.push({ s: '@led', w: 0.8, op: 0.5, d: `M-84 -18H-34M34 -15H86` });
      return { body, lit };
    },
  });
})();
