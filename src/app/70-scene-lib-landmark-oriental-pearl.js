/* ============================================================
   SCENE LIBRARY: landmark.oriental-pearl (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the sphere tower in the hand-drawn shanghai-skyline art
   (`scene upgrade asia-east/shanghai-skyline --box 380,105,530,645`):
   - the real structure: the 468 m television tower of Lujiazui: three tall columns, three
     raking legs to the ground, the large lower sphere, the row of five small spheres between
     the columns, the upper sphere, the slim shaft to the small top sphere and the mast
   - the spheres clad in rose-pink glass in horizontal facets, lit from the left
   - night: the spheres glowing pink, the columns and legs picked out in white light, the
     observation decks' windows (glow) and the mast's beacon (the 'lit' part)
   No text, no logos. Anchor: the ground at the middle of the base.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  define({
    id: 'landmark.oriental-pearl', category: 'landmark', size: [116, 470], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      pink: ['#f294bf', '#d9578f', '#a8336a', '#ffd6e8'], col: ['#dfe3ea', '#aab2c0', '#7a8496'], base: ['#c9ced6', '#959dab'],
      glass: ['#5a3a5e', '#3c2a48'], glowP: '#ff7ab8', lightW: '#f4f0ff', beacon: '#ff3b3b',
    } },
    night: { glow: { window: '#ffe4f0' }, on: 0.85 },
    shadow: { rx: 56, ry: 5, h: 70 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:shanghai', 'asia', 'asia-east', 'tower'],
    credit: 'native (scene engine upgrade), after the hand-drawn shanghai-skyline art',
    build(v, r) {
      const body = [], lit = [];
      // a column or a leg from (x0, y0) to (x1, y1), w wide: the shaded body and its sunlit left edge
      const bar = (x0, y0, x1, y1, w, tone) => {
        const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l * w / 2, ny = dx / l * w / 2;
        body.push([tone ? '@col.2' : '@col.1', poly([[x0 - nx, y0 - ny], [x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny]])]);
        body.push({ s: '@col.0', w: w * 0.32, op: tone ? 0.5 : 0.9, d: `M${f1(x0 - nx * 0.55)} ${f1(y0 - ny * 0.55)}L${f1(x1 - nx * 0.55)} ${f1(y1 - ny * 0.55)}` });
      };
      // a sphere: horizontal glass facets darkening downwards, the deck's windows at its waist, a rim of light, a highlight
      const sphere = (cy, R, deck) => {
        const bands = 6;
        // the whole sphere (what a small still keeps); the facet bands over it carry the detail
        body.push({ f: { rad: [[0, '@pink.0'], [0.55, '@pink.1'], [1, '@pink.2']], cx: -R * 0.35, cy: cy - R * 0.35, r: R * 1.5 }, d: ell(0, cy, R, R) });
        for (let i = 0; i < bands; i++) {
          const a = -R + 2 * R * i / bands, b = a + 2 * R / bands, wa = Math.sqrt(Math.max(0, R * R - a * a)), wb = Math.sqrt(Math.max(0, R * R - b * b));
          const tone = i < 2 ? '@pink.0' : i < 4 ? '@pink.1' : '@pink.2';
          body.push({ f: { lin: [[0, tone], [1, '@pink.2']], x1: -R, y1: 0, x2: R * 1.3, y2: 0 }, d: `M${f1(-wa)} ${f1(cy + a)}A${R} ${R} 0 0 0 ${f1(-wb)} ${f1(cy + b)}L${f1(wb)} ${f1(cy + b)}A${R} ${R} 0 0 0 ${f1(wa)} ${f1(cy + a)}z`, detail: true });
        }
        let fac = '';
        for (let k = -2; k <= 2; k++) { const x = k * R * 0.36; fac += `M${f1(x)} ${f1(cy - Math.sqrt(R * R - x * x))}Q${f1(x * 1.35)} ${f1(cy)} ${f1(x)} ${f1(cy + Math.sqrt(R * R - x * x))}`; }
        body.push({ s: '@pink.3', w: 0.7, op: 0.45, d: fac, detail: true });
        if (deck) {
          const g = [];
          for (let x = -R + 3; x < R - 4; x += 3.2) g.push([x, cy - 4, 2.2, 3.6]);
          body.push(['@glass.0', rect(-R + 1, cy - 5, 2 * R - 2, 6), 0.9]);
          sceneDraw.winGroups(r, g, 3).forEach(d => body.push({ f: '@glass.1', d, glow: 'window', detail: true }));
        }
        body.push({ s: '@pink.3', w: 1.2, op: 0.55, d: `M${f1(-R * 0.9)} ${f1(cy - R * 0.42)}A${R} ${R} 0 0 1 ${f1(R * 0.2)} ${f1(cy - R * 0.98)}` }, ['@pink.3', ell(-R * 0.42, cy - R * 0.5, R * 0.18, R * 0.12), 0.6]);
        lit.push({ f: { rad: [[0, '@glowP', 0.55], [0.7, '@glowP', 0.35], [1, '@glowP', 0]], cx: 0, cy, r: R * 1.5 }, d: ell(0, cy, R * 1.5, R * 1.5) }, { s: '@lightW', w: 1.2, op: 0.7, d: ell(0, cy, R - 0.6, R - 0.6) });
      };
      // the base hall and the three raking legs
      body.push(['@base.0', rect(-56, -10, 64, 10)], ['@base.1', rect(8, -10, 48, 10)], ['@col.0', rect(-57, -11.5, 114, 2)]);
      bar(-50, -10, -13, -74, 7.5, 0); bar(50, -10, 13, -74, 7.5, 1); bar(5, -10, 2, -70, 8, 0);
      // the three columns (the back one darker), the ring beams between them
      bar(0, -10, 0, -252, 9, 1); bar(-12.5, -10, -12.5, -252, 9, 0); bar(12.5, -10, 12.5, -252, 9, 1);
      body.push(['@col.1', rect(-17, -133, 34, 3)], ['@col.1', rect(-17, -178, 34, 3)], ['@col.1', rect(-17, -222, 34, 3)]);
      // the lower sphere (50 m) with its deck, then the five small spheres between the columns
      sphere(-93, 25, true);
      for (let i = 0; i < 5; i++) { const cy = -134 - i * 21.5; body.push({ f: { rad: [[0, '@pink.0'], [1, '@pink.2']], cx: -2, cy: cy - 2, r: 8 }, d: ell(0, cy, 6, 6) }, ['@pink.3', ell(-2, cy - 2.2, 1.6, 1.2), 0.7]); }
      // collars where the columns meet the spheres
      for (const [y, w] of [[-120, 19], [-250, 19], [-296, 7], [-358, 5]]) body.push(['@col.1', rect(-w, y - 1.6, w * 2, 3.2)]);
      // the upper sphere (45 m) with its deck, the shaft, the top sphere, the mast and its rings
      sphere(-272, 22.5, true);
      body.push({ f: { lin: [[0, '@col.0'], [1, '@col.2']], x1: -5, y1: 0, x2: 5, y2: 0 }, d: rect(-4.6, -346, 9.2, 52) }, ['@col.0', rect(-8, -322, 16, 2.4)], ['@col.1', rect(-8, -320, 16, 1.4), 0.8]);
      body.push({ f: { rad: [[0, '@pink.0'], [1, '@pink.2']], cx: -2.5, cy: -352.5, r: 10 }, d: ell(0, -350, 7.5, 7.5) }, ['@glass.0', rect(-7, -351.5, 14, 2.6), 0.85], { f: '@glass.1', d: rect(-6, -351, 12, 1.6), glow: 'window' });
      body.push({ f: { lin: [[0, '@col.0'], [1, '@col.2']], x1: -3, y1: 0, x2: 3, y2: 0 }, d: poly([[-3.2, -357], [3.2, -357], [0.9, -466], [-0.9, -466]]) });
      for (const [y, w] of [[-378, 4.2], [-396, 3.6], [-414, 3], [-432, 2.4], [-448, 1.9]]) body.push(['@col.1', rect(-w, y, w * 2, 2.2)]);
      body.push(['@beacon', ell(0, -467, 1.2, 1.2)]);
      // night: the columns and legs in white light, the small spheres, the shaft and mast, the beacon's glow
      lit.push({ s: '@lightW', w: 1.6, op: 0.75, d: 'M-12.5 -10V-74M12.5 -10V-74M0 -10V-68M-12.5 -116V-252M12.5 -116V-252' }, { s: '@lightW', w: 1.4, op: 0.7, d: 'M-50 -10L-13 -74M50 -10L13 -74' });
      lit.push({ f: '@glowP', d: [0, 1, 2, 3, 4].map(i => ell(0, -134 - i * 21.5, 5, 5)).join(''), op: 0.85 }, { s: '@lightW', w: 1.4, op: 0.8, d: 'M0 -294V-466' });
      lit.push({ f: { rad: [[0, '@glowP', 0.6], [1, '@glowP', 0]], cx: 0, cy: -350, r: 14 }, d: ell(0, -350, 14, 14) }, { f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -467, r: 5 }, d: ell(0, -467, 5, 5) });
      return { body, lit };
    },
  });
})();
