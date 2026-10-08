/* ============================================================
   SCENE LIBRARY: landmark.macau-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Drawn by hand after the observation tower in the hand-drawn macau-skyline art (its slim shaft,
   the bowl of a head and the mast; `scene upgrade asia-east/macau-skyline --dry-run` cannot parse
   that art, so nothing was extracted):
   - the real structure: the 338 m concrete observation tower at the south-west tip of the Macau
     peninsula; the low podium of its convention centre at the foot, the slim shaft (the lift
     glazing up its face), the pod at about 215 to 265 m: a flared underside, the outdoor walkway
     ring with the jump platform's arm, two glazed rings (the observation decks and the
     restaurant) under a shallow roof, an upper drum with its own crown; then the steel mast
     with two small platforms and the aviation light
   - pale concrete, lit from the left and shaded on the right
   - night: the shaft washed in light from the foot, the pod's rings bright, its roof and
     underside traced in coloured LED light, the mast picked out in white (the 'lit' part); the
     windows (glow); the beacon
   No text, no logos. Anchor: the ground at the middle of the foot. 1 unit = 1 m.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const hw = h => 8.4 - (h - 26) / 186 * 2.2;   // the shaft's half-width from the podium (26 m) to the pod (212 m)
  define({
    id: 'landmark.macau-tower', category: 'landmark', size: [96, 340], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      conc: ['#f0ede6', '#d2cdc3', '#a8a298', '#7c776f'], glass: ['#56687e', '#3a485c', '#7a92ae'], roof: ['#e2e4e6', '#aab0b8'],
      mast: ['#eef0f2', '#a8aeb6'], led: ['#c86adf', '#5aa8ff'], lightW: '#f6f8ff', lightS: '#ffe6bc', beacon: '#ff4636',
    } },
    night: { glow: { window: '#ffe9be' }, on: 0.82 },
    shadow: { rx: 44, ry: 5, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:macau', 'asia', 'asia-east', 'tower', 'observation-tower'],
    credit: 'native (scene engine upgrade), after the hand-drawn macau-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      const cyl = (x0, x1) => ({ lin: [[0, '@conc.1'], [0.3, '@conc.0'], [0.75, '@conc.2'], [1, '@conc.3']], x1: x0, y1: 0, x2: x1, y2: 0 });
      // the podium: two stepped blocks with a glazed band, the entrance canopy, the roof terrace's rail
      body.push(['@conc.1', rect(-48, -14, 30, 14)], ['@conc.2', rect(18, -14, 30, 14)], ['@conc.1', rect(-30, -26, 30, 26)], ['@conc.2', rect(0, -26, 30, 26)]);
      body.push(['@conc.0', rect(-49, -15.5, 98, 1.6)], ['@conc.0', rect(-31, -27.5, 62, 1.8)], ['@glass.1', rect(-47, -11, 94, 5), 0.9], ['@glass.0', rect(-29, -23, 58, 6), 0.9]);
      body.push(['@glass.2', rect(-47, -11, 28, 5), 0.4], ['@conc.3', rect(-8, -6, 16, 6)], ['@conc.0', rect(-11, -7.4, 22, 1.4)]);
      let mp = ''; for (let x = -44; x < 46; x += 5) mp += `M${x} -11v5`;
      for (let x = -27; x < 29; x += 4) mp += `M${x} -23v6`;
      body.push({ s: '@conc.2', w: 0.5, op: 0.7, d: mp, detail: true });
      for (let x = -45; x < 44; x += 5) cells.push([x, -10.4, 3.4, 3.8]);
      for (let x = -28; x < 27; x += 4) cells.push([x, -22.4, 2.6, 4.6]);
      // the shaft in bands (its construction lifts), lit on the left; the lift glazing up its face
      const S = [26, 70, 114, 158, 212];
      for (let i = 0; i < S.length - 1; i++) {
        const a = S[i], b = S[i + 1];
        body.push({ f: cyl(-hw(a), hw(a)), d: poly([[-hw(a), -a], [hw(a), -a], [hw(b), -b], [-hw(b), -b]]) });
        body.push({ s: '@conc.2', w: 0.5, op: 0.5, d: `M${f1(-hw(b))} ${-b}H${f1(hw(b))}`, detail: true });
      }
      body.push({ f: '@glass.1', d: poly([[-3.2, -28], [-0.6, -28], [-0.6, -210], [-2.8, -210]]), op: 0.75 }, { s: '@conc.0', w: 0.5, op: 0.8, d: 'M-3.4 -28L-3 -210', detail: true });
      for (let h = 40; h < 206; h += 12) cells.push([-2.9, -h - 2, 1.9, 2.2]);
      body.push({ s: '@conc.0', w: 1, op: 0.8, d: `M${f1(-hw(26))} -26L${f1(-hw(212))} -212` }, { s: '@conc.3', w: 1, op: 0.8, d: `M${f1(hw(26))} -26L${f1(hw(212))} -212` });
      body.push({ s: '@conc.2', w: 0.5, op: 0.45, d: `M2.6 -26L2 -212M5 -26L4.2 -212`, detail: true });
      // the pod: the collar, the flared underside, the walkway ring with its rail and the jump platform's arm
      body.push(['@conc.2', rect(-6.8, -216, 13.6, 4)]);
      const under = 'M-6.6 -216C-12 -218 -22 -221 -29 -224H29C22 -221 12 -218 6.6 -216z';
      body.push({ f: { lin: [[0, '@conc.1'], [0.3, '@conc.0'], [0.7, '@conc.2'], [1, '@conc.3']], x1: -29, y1: 0, x2: 29, y2: 0 }, d: under });
      let ribs = ''; for (let k = -5; k <= 5; k++) { const u = k / 5.5; ribs += `M${f1(u * 6.6)} -216Q${f1(u * 17)} -219.5 ${f1(u * 29)} -224`; }
      body.push({ s: '@conc.3', w: 0.6, op: 0.7, d: ribs, detail: true });
      body.push(['@conc.0', rect(-30, -226, 60, 2)], { s: '@conc.3', w: 0.5, op: 0.8, d: 'M-30 -228.4H30', detail: true });
      let rail = ''; for (let x = -29; x <= 29; x += 2.4) rail += `M${f1(x)} -226v-2.4`;
      body.push({ s: '@conc.3', w: 0.4, op: 0.6, d: rail, detail: true });
      body.push(['@conc.2', poly([[28, -226], [40, -227], [40, -225.4], [28, -224.6]])], ['@conc.3', rect(38.6, -231, 1.2, 4)]);
      // the two glazed rings (the observation decks, the restaurant) and the band between them
      const ring = (a, b, w0, w1, f, op) => body.push([f, poly([[-w0, -a], [w0, -a], [w1, -b], [-w1, -b]]), op]);
      ring(226, 234, 26.5, 27.5, '@glass.0', 1); ring(234, 236.5, 28.4, 28.4, '@conc.1'); ring(236.5, 244, 27.5, 25.8, '@glass.1', 1); ring(244, 246, 26.4, 26.4, '@conc.1');
      body.push(['@glass.2', poly([[-26.5, -226], [-9, -226], [-9.4, -234], [-27.5, -234]]), 0.45], ['@glass.2', poly([[-27.5, -236.5], [-9.4, -236.5], [-9, -244], [-25.8, -244]]), 0.4]);
      body.push(['@conc.0', rect(-28.4, -236.5, 12, 2.5), 0.9], ['@conc.3', rect(-29, -226.6, 58, 0.8), 0.7]);
      let mull = ''; for (let x = -24; x <= 24; x += 4) mull += `M${x} -226.3V-233.7M${f1(x * 0.97)} -236.8V-243.7`;
      body.push({ s: '@conc.2', w: 0.6, op: 0.7, d: mull, detail: true });
      for (let x = -25; x < 23; x += 6) cells.push([x, -232.6, 4.4, 5], [x + 1.5, -242.4, 4.4, 5]);
      // the roof: a shallow ribbed cone, the upper drum with its slot windows and its crown
      body.push({ f: { lin: [[0, '@roof.0'], [0.7, '@roof.1']], x1: -26, y1: 0, x2: 26, y2: 0 }, d: 'M-26.4 -246C-20 -249.5 -14 -252 -10 -254H10C14 -252 20 -249.5 26.4 -246z' });
      let rr = ''; for (let k = -4; k <= 4; k++) rr += `M${f1(k * 6.2)} -246.2L${f1(k * 2.3)} -253.8`;
      body.push({ s: '@roof.1', w: 0.6, op: 0.8, d: rr, detail: true });
      body.push(['@conc.1', rect(-10, -264, 10, 10)], ['@conc.2', rect(0, -264, 10, 10)], ['@conc.0', rect(-11, -265.6, 22, 1.8)], ['@conc.0', rect(-11, -255.4, 22, 1.4)]);
      let sl = ''; for (let x = -8; x <= 7; x += 3) sl += rect(x, -262, 1.4, 5.6);
      body.push({ f: '@glass.1', d: sl, op: 0.85 });
      body.push(['@roof.0', poly([[-10, -265.6], [0, -265.6], [0, -270], [-5.4, -270]])], ['@roof.1', poly([[0, -265.6], [10, -265.6], [5.4, -270], [0, -270]])]);
      // the mast: tapering steel sections, two small platforms, the tip and its beacon
      const MS = [[270, 296, 2.8, 2.2], [296, 318, 2.2, 1.5], [318, 332, 1.5, 0.9], [332, 339, 0.9, 0.4]];
      MS.forEach(([a, b, w0, w1]) => {
        body.push(['@mast.0', poly([[-w0, -a], [0, -a], [0, -b], [-w1, -b]])], ['@mast.1', poly([[0, -a], [w0, -a], [w1, -b], [0, -b]])]);
      });
      body.push(['@conc.2', rect(-5.4, -297.2, 10.8, 1.4)], ['@conc.2', rect(-3.6, -319, 7.2, 1.2)], { s: '@mast.1', w: 0.4, op: 0.8, d: 'M-5 -297.2v-2.2M5 -297.2v-2.2M-3.4 -319v-1.8M3.4 -319v-1.8M-5 -299.4H5M-3.4 -320.8H3.4', detail: true });
      let tick = ''; for (let h = 274; h < 330; h += 5) tick += `M-1.6 ${-h}H1.6`;
      body.push({ s: '@mast.1', w: 0.4, op: 0.7, d: tick, detail: true });
      body.push(['@beacon', ell(0, -339.4, 0.8, 0.8)], ['@beacon', ell(0, -270.6, 0.7, 0.7), 0.9]);
      sceneDraw.winGroups(r, cells, 6).forEach(d => body.push({ f: '@glass.1', d, op: 0.5, glow: 'window', detail: true }));
      // night: the shaft washed from the foot, the rings bright, the underside and roof traced in violet and blue, the mast in white
      lit.push({ f: { lin: [[0, '@lightS', 0.55], [0.5, '@lightW', 0.25], [1, '@lightW', 0.12]], x1: 0, y1: -26, x2: 0, y2: -212 }, d: poly([[-hw(26), -26], [hw(26), -26], [hw(212), -212], [-hw(212), -212]]) });
      lit.push({ s: '@led.0', w: 1, op: 0.85, d: ribs }, { s: '@led.1', w: 0.9, op: 0.8, d: rr }, { f: '@led.0', d: rect(-30, -226, 60, 2), op: 0.9 }, { f: '@led.1', d: rect(-28.4, -246, 56.8, 2), op: 0.9 });
      lit.push({ f: '@lightW', d: poly([[-26.5, -226], [26.5, -226], [27.5, -234], [-27.5, -234]]), op: 0.55 }, { f: '@lightS', d: poly([[-27.5, -236.5], [27.5, -236.5], [25.8, -244], [-25.8, -244]]), op: 0.5 });
      lit.push({ f: '@led.1', d: rect(-10, -264, 20, 10), op: 0.4 }, { s: '@lightW', w: 1.1, op: 0.85, d: 'M0 -271V-337' }, { f: '@lightS', d: rect(-30, -24, 60, 8), op: 0.35 });
      lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -339.4, r: 4.5 }, d: ell(0, -339.4, 4.5, 4.5) }, ['@beacon', ell(0, -339.4, 1.3, 1.3)]);
      return { body, lit };
    },
  });
})();
