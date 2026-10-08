/* ============================================================
   SCENE LIBRARY: landmark.space-needle (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Drawn by hand after the observation tower in the hand-drawn seattle-needle-ferry art (its waisted
   legs and the saucer of a top house; `scene upgrade us-pacific/seattle-needle-ferry --box 230,190,570,810`
   gave only the old art's flat pieces, so nothing extracted was kept):
   - the real structure: the 184 m Space Needle (Seattle Center), in elevation; three legs, each a
     pair of steel columns tied together, sweep in from a wide base to a narrow waist at about 96 m
     and flare out again to carry the top house (two of them in front, the third hidden behind the
     core); the central core with its elevator cars running up the outside; the ring of the
     SkyLine level at 30 m; the top house: the ribbed underside, the restaurant ring (150 m), the
     observation level with its open deck and tall glass barriers (156 m), the broad halo roof
     (its top in Galaxy Gold), the lantern and the mast to 184 m with its light; the low curved
     pavilion at the foot
   - white steel, lit from the left: the left leg and the core's left side in the light
   - night: the legs and the core washed in white light from the foot, the top house's glass
     glowing (glow), the halo's rim and underside lit, the mast and its light (the 'lit' part)
   No text, no logos. Anchor: the ground at the middle of the foot. 2 units = 1 m.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const K = 2, Y = z => -K * z;   // metres to units (up is negative)
  // a leg's distance from the axis at height z: wide at the foot, the waist at 96 m, flaring to the top house's ring at 147 m
  const rad = z => z <= 96 ? 4.6 + 13 * Math.pow((96 - z) / 96, 1.5) : 4.6 + 8.6 * Math.pow((z - 96) / 51, 1.7);
  const ZS = []; for (let z = 0; z <= 147; z += 7) ZS.push(z); ZS.push(147);
  define({
    id: 'landmark.space-needle', category: 'landmark', size: [114, 376], box: [-57, -376, 57, 1], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#f4f5f4', '#d4d8da', '#aab0b4', '#868d92'], core: ['#e6e8e8', '#b8bec2'], glass: ['#5d7286', '#3c4c5e', '#8aa2b8'],
      gold: ['#d98a3a', '#b0682a'], roof: ['#eef0f0', '#c4cacc'], white: '#f6f8ff', warm: '#ffe6bc', beacon: '#fff4d8', red: '#ff4636',
    } },
    night: { glow: { window: '#ffe2b0' }, on: 0.85 },
    shadow: { rx: 60, ry: 6, h: 90 },
    reflect: true,
    tags: ['landmark', 'place:us/place:seattle', 'us', 'us-pacific', 'tower', 'observation-tower'],
    credit: 'native (scene engine upgrade), after the hand-drawn seattle-needle-ferry art (its waisted legs and saucer)',
    build(v, r) {
      const body = [], lit = [], cells = [];
      // a column of a leg: the leg's centre line at x = side * 0.87 * rad(z) (+ dx for the pair's second column), w metres wide
      const col = (side, dx, w, z0 = 0, z1 = 147) => {
        const zs = [z0].concat(ZS.filter(z => z > z0 && z < z1), [z1]);
        const L = zs.map(z => [K * (side * 0.87 * rad(z) + dx - w / 2), Y(z)]), R = zs.map(z => [K * (side * 0.87 * rad(z) + dx + w / 2), Y(z)]);
        return poly(L.concat(R.reverse()));
      };
      // the core: a white cylinder lit from the left, its shaded right side, the floor bands and the elevator rails (detail)
      body.push({ f: { lin: [[0, '@core.1'], [0.25, '@core.0'], [0.7, '@core.1'], [1, '@steel.3']], x1: -7, y1: 0, x2: 7, y2: 0 }, d: rect(-7, Y(149), 14, K * 149 - 10) });
      let bands = ''; for (let z = 12; z < 146; z += 12) bands += `M-7 ${Y(z)}H7`;
      body.push({ s: '@steel.2', w: 0.5, op: 0.5, d: bands, detail: true }, { s: '@steel.2', w: 0.5, op: 0.6, d: `M-3 -10V${Y(148)}M3 -10V${Y(148)}`, detail: true });
      // the three glass elevator cars on the core: the car, its roof, the lit cab (glow)
      for (const [x, z] of [[-6.4, 52], [-1.6, 84], [3.4, 118]]) { body.push(['@glass.0', rect(x, Y(z + 3), 3.2, 6)], ['@steel.0', rect(x - 0.3, Y(z + 3) - 0.6, 3.8, 0.8)]); cells.push([x + 0.4, Y(z + 3) + 0.8, 2.4, 4]); }
      // the third leg, behind the core: only its flare under the top house shows
      body.push(['@steel.2', poly([[-3, Y(118)], [3, Y(118)], [5, Y(146)], [-5, Y(146)]])]);
      // the two front legs: each a pair of columns (the outer one in front) in three lengths (the flare's underside in shade),
      // the ties between them (detail)
      for (const side of [-1, 1]) {
        const lt = side < 0 ? '@steel.0' : '@steel.1', dk = side < 0 ? '@steel.1' : '@steel.2', sh = side < 0 ? '@steel.1' : '@steel.2';
        for (const [z0, z1, f0, f1c] of [[0, 60, dk, lt], [60, 110, dk, lt], [110, 147, '@steel.3', sh]]) body.push([f0, col(side, -side * 1.1, 1.2, z0, z1)], [f1c, col(side, side * 0.5, 1.5, z0, z1)]);
        let ties = ''; for (let z = 10; z < 146; z += 9) { const x = side * 0.87 * rad(z); ties += `M${f1(K * (x - 1.7))} ${f1(Y(z))}H${f1(K * (x + 1.3))}`; }
        body.push({ s: dk, w: 0.9, op: 0.9, d: ties, detail: true });
        body.push({ s: '@steel.0', w: 0.6, op: 0.8, d: 'M' + ZS.map(z => f1(K * (side * 0.87 * rad(z) + side * 0.5 - side * 0.7)) + ' ' + f1(Y(z))).join('L'), detail: true });
      }
      // the waist: a collar where the legs pass closest to the core, its lit top edge
      const wx = K * (0.87 * rad(96) + 1.4);
      body.push(['@steel.1', rect(-wx, Y(97), 2 * wx, 3)], ['@steel.0', rect(-wx, Y(97), 2 * wx, 0.9)]);
      // the pavilion at the foot, in front of the legs' feet: a low curved glass hall, its white roof edge and entrance canopy
      body.push(['@glass.1', 'M-54 0V-9Q-27 -14.6 0 -14.6Q27 -14.6 54 -9V0z'], ['@glass.2', 'M-54 0V-9Q-40 -12.6 -24 -13.8V0z', 0.5], ['@roof.0', 'M-56 -8.4Q-28 -14.2 0 -14.2Q28 -14.2 56 -8.4V-10.6Q28 -16.8 0 -16.8Q-28 -16.8 -56 -10.6z']);
      body.push(['@roof.1', rect(-10, -5.4, 20, 1.6)], ['@steel.3', rect(-8, -3.8, 16, 3.8), 0.8]);
      let pm = ''; for (let x = -48; x <= 48; x += 8) pm += `M${x} 0V${f1(-9 - 5 * (1 - Math.pow(x / 54, 2)))}`;
      body.push({ s: '@steel.2', w: 0.6, op: 0.7, d: pm, detail: true });
      for (let x = -50; x < 44; x += 16) cells.push([x, -8.6, 12, 5]);
      // the SkyLine level: a glazed ring round the core and the legs at 30 m, its roof and floor edges
      body.push(['@glass.0', rect(-22, Y(33), 44, 8)], ['@glass.2', rect(-22, Y(33), 14, 8), 0.4], ['@roof.0', rect(-24, Y(33) - 1.6, 48, 2)], ['@steel.2', rect(-23, Y(29), 46, 1.4)]);
      cells.push([-20, Y(32.4), 18, 4.6], [2, Y(32.4), 18, 4.6]);
      let sm = ''; for (let x = -18; x <= 18; x += 6) sm += `M${x} ${Y(33)}V${Y(29)}`;
      body.push({ s: '@steel.2', w: 0.5, op: 0.6, d: sm, detail: true });
      // the top house: the ribbed underside spreading from the legs' ring
      body.push({ f: { lin: [[0, '@steel.1'], [0.4, '@steel.0'], [1, '@steel.3']], x1: -40, y1: 0, x2: 40, y2: 0 }, d: `M-26 ${Y(146)}L26 ${Y(146)}L39 ${Y(150.5)}H-39z` });
      let ribs = ''; for (let k = -6; k <= 6; k++) ribs += `M${f1(k * 4.2)} ${Y(146)}L${f1(k * 6.4)} ${f1(Y(150.4))}`;
      body.push({ s: '@steel.2', w: 0.6, op: 0.8, d: ribs, detail: true });
      // the restaurant ring, the floor slab, the observation level behind its open deck and glass barriers
      const ring = (z0, z1, w0, w1, fill, op) => body.push([fill, poly([[-w0, Y(z0)], [w0, Y(z0)], [w1, Y(z1)], [-w1, Y(z1)]]), op]);
      ring(150.5, 154.5, 39, 39.6, '@glass.1', 1); ring(154.5, 155.6, 41, 41, '@roof.1'); ring(155.6, 159.6, 37, 37, '@glass.0', 1);
      body.push(['@glass.2', poly([[-39, Y(150.5)], [-14, Y(150.5)], [-14.4, Y(154.5)], [-39.6, Y(154.5)]]), 0.45], ['@glass.2', rect(-37, Y(159.6), 22, 8), 0.4]);
      body.push({ f: '@glass.2', d: poly([[-41, Y(155.6)], [41, Y(155.6)], [42.4, Y(158.6)], [-42.4, Y(158.6)]]), op: 0.3 }, { s: '@roof.0', w: 0.6, op: 0.85, d: `M-42.4 ${Y(158.6)}H42.4` });
      let mull = ''; for (let x = -36; x <= 36; x += 4) mull += `M${x} ${Y(150.6)}V${Y(154.4)}M${f1(x * 1.06)} ${Y(155.7)}V${Y(158.5)}`;
      body.push({ s: '@steel.2', w: 0.5, op: 0.7, d: mull, detail: true });
      // the open deck's tall glass barriers, leaning out, their joints (detail) and the deck's edge
      let gb = ''; for (let x = -40; x <= 40; x += 5) gb += `M${x} ${Y(155.6)}L${f1(x * 1.035)} ${Y(158.6)}`;
      body.push({ s: '@roof.1', w: 0.4, op: 0.7, d: gb, detail: true }, ['@steel.3', rect(-41.6, Y(155.6), 83.2, 0.8), 0.8]);
      cells.push([-37, Y(154), 30, 6], [-5, Y(154), 30, 6], [-35, Y(159.2), 30, 6.4], [-3, Y(159.2), 30, 6.4]);
      // the halo: the broad thin roof, its rim in the light, its top in Galaxy Gold rising to the lantern, the gold's ribs
      body.push(['@roof.1', poly([[-37, Y(159.6)], [37, Y(159.6)], [46, Y(160.6)], [-46, Y(160.6)]])], { f: { lin: [[0, '@roof.0'], [0.7, '@roof.0'], [1, '@roof.1']], x1: -46, y1: 0, x2: 46, y2: 0 }, d: rect(-46.4, Y(162), 92.8, 2.8) });
      body.push({ f: { lin: [[0, '@gold.0'], [0.6, '@gold.0'], [1, '@gold.1']], x1: -44, y1: 0, x2: 44, y2: 0 }, d: `M-45 ${Y(162)}Q-26 ${Y(164.4)} -10 ${Y(166)}H10Q26 ${Y(164.4)} 45 ${Y(162)}z` });
      let gr = ''; for (let k = -4; k <= 4; k++) gr += `M${f1(k * 9.6)} ${f1(Y(162.1))}L${f1(k * 2.2)} ${f1(Y(165.9))}`;
      body.push({ s: '@gold.1', w: 0.6, op: 0.8, d: gr, detail: true });
      // the lantern on the roof and its cap, the mast in tapering sections, its small platform and the light
      body.push(['@roof.0', rect(-9, Y(170), 9, K * 4)], ['@roof.1', rect(0, Y(170), 9, K * 4)], ['@roof.0', poly([[-10, Y(170)], [10, Y(170)], [5, Y(172)], [-5, Y(172)]])]);
      body.push(['@glass.1', rect(-7.4, Y(169.2), 14.8, 4.6), 0.85]);
      for (const [z0, z1, w0, w1] of [[172, 177, 1.8, 1.4], [177, 181, 1.4, 0.9], [181, 184, 0.9, 0.4]]) body.push(['@steel.0', poly([[-w0, Y(z0)], [0, Y(z0)], [0, Y(z1)], [-w1, Y(z1)]])], ['@steel.2', poly([[0, Y(z0)], [w0, Y(z0)], [w1, Y(z1)], [0, Y(z1)]])]);
      body.push(['@steel.2', rect(-3.4, Y(177.4), 6.8, 1)], ['@steel.2', rect(-2.4, Y(181.3), 4.8, 0.8)], ['@red', ell(0, Y(184.4), 0.9, 0.9)]);
      sceneDraw.winGroups(r, cells, 4).forEach(d => body.push({ f: '@glass.1', d, op: 0.5, glow: 'window' }));
      // night: the legs and the core washed in white from the foot, the underside and the halo's rim lit, the lantern, the mast, its light
      const wash = (y0, y1) => ({ lin: [[0, '@white', 0.6], [0.5, '@white', 0.28], [1, '@white', 0.1]], x1: 0, y1: y0, x2: 0, y2: y1 });
      for (const side of [-1, 1]) lit.push({ f: wash(-20, Y(146)), d: col(side, side * 0.5, 1.5) }, { f: wash(-20, Y(146)), op: 0.6, d: col(side, -side * 1.1, 1.2) });
      lit.push({ f: '@warm', op: 0.45, d: poly([[-39, Y(150.5)], [39, Y(150.5)], [39.6, Y(154.5)], [-39.6, Y(154.5)]]) + rect(-37, Y(159.6), 74, 8) });
      lit.push({ f: wash(-20, Y(148)), d: rect(-7, Y(148), 14, K * 148 - 20) });
      lit.push({ f: '@warm', op: 0.55, d: `M-26 ${Y(146)}L26 ${Y(146)}L39 ${Y(150.5)}H-39z` }, { f: '@white', op: 0.9, d: rect(-46.4, Y(162), 92.8, 1.2) }, { f: '@warm', op: 0.5, d: rect(-7.4, Y(169.2), 14.8, 4.6) });
      lit.push({ f: '@warm', op: 0.35, d: rect(-24, Y(33), 48, 8) }, { s: '@white', w: 1, op: 0.8, d: `M0 ${Y(172)}V${Y(184)}` });
      lit.push({ f: { rad: [[0, '@beacon', 0.85], [1, '@beacon', 0]], cx: 0, cy: Y(184.4), r: 6 }, d: ell(0, Y(184.4), 6, 6) });
      return { body, lit };
    },
  });
})();
