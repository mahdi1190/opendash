/* ============================================================
   SCENE LIBRARY: landmark.two-ifc (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the tall crowned tower in the hand-drawn hong-kong-skyline art (its `tower` at
   x 640 to 704; the box extraction cannot parse that art, so the geometry was read from its source):
   - the real structure: the 412 m tower on the Central waterfront, a square shaft with notched
     corners rising straight for most of its height, then stepping in through four setbacks to
     the crown, an open ring of tall fins, the middle ones highest
   - blue-grey glass behind dense pale mullions (the fine vertical pinstripes of its skin); seen
     corner-on: the left face in the sun, the right in shade; a low podium at its foot
   - night: the crown's fins and the setback edges in white light (the 'lit' part); the windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // the shaft and its setbacks: [from, to, half-width]
  const T = [[0, 290, 28.5], [290, 318, 26.5], [318, 342, 24], [342, 362, 21], [362, 378, 18]];
  const K = 0.12;   // the crease between the sunlit face (left) and the shaded face (right), as a share of the half-width
  // the crown's fins: x and the top of each (the middle ones highest)
  const FINS = [-16, -12, -8, -4, 0, 4, 8, 12, 16].map(x => [x, 412 - 0.075 * x * x]);
  define({
    id: 'landmark.two-ifc', category: 'landmark', size: [70, 412], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#b4c4d2', '#8098ae', '#5a7088', '#3c4e64'], mull: ['#eef2f5', '#c2ccd6'], notch: '#2c3a4c', base: ['#c8ccd0', '#959ca4'],
      crown: ['#dfe6ec', '#a4b2c0'], lightW: '#f4f8ff', lightB: '#cfe4ff', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#f2f0e4' }, on: 0.8 },
    shadow: { rx: 40, ry: 4, h: 70 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:hong-kong', 'asia', 'asia-east', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn hong-kong-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      const faces = (a, b, w) => [rect(-w, -b, w + K * w, b - a), rect(K * w, -b, w - K * w, b - a)];
      // the whole height in two faces (what a small still keeps); each tier's own faces carry the detail
      body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -28, y1: 0, x2: 4, y2: 0 }, d: T.map(t => faces(...t)[0]).join('') },
        { f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 4, y1: 0, x2: 28, y2: 0 }, d: T.map(t => faces(...t)[1]).join('') });
      T.forEach(([a, b, w], i) => {
        const [l, rr] = faces(a, b, w);
        body.push({ f: { lin: [[0, '@glass.0'], [0.6, '@glass.1'], [1, '@glass.2']], x1: 0, y1: -b, x2: 0, y2: -a }, d: l, detail: true },
          { f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 0, y1: -b, x2: 0, y2: -a }, d: rr, detail: true });
        // the pinstripes: dense pale mullions, fewer on the narrow shaded face
        let mu = '';
        for (let x = -w + 2; x < K * w - 1; x += 2.6) mu += `M${f1(x)} ${-a}V${-b}`;
        body.push({ s: '@mull.0', w: 0.45, op: 0.55, d: mu, detail: true });
        let ms = ''; for (let x = K * w + 2; x < w - 1; x += 3.2) ms += `M${f1(x)} ${-a}V${-b}`;
        body.push({ s: '@mull.1', w: 0.45, op: 0.35, d: ms, detail: true });
        // the notched corners: a shadowed strip at the left edge and at the crease
        body.push({ s: '@notch', w: 1.5, op: 0.6, d: `M${f1(-w + 2.4)} ${-a}V${-b}M${f1(K * w + 1)} ${-a}V${-b}`, detail: true });
        // the ledge at the top of each tier (a setback): pale, the shaded half darker; lit at night
        body.push(['@mull.0', rect(-w - 0.4, -b - 1, w + K * w + 0.4, 2)], ['@mull.1', rect(K * w, -b - 1, w - K * w + 0.4, 2)]);
        if (i) lit.push({ s: '@lightW', w: 1.1, op: 0.85, d: `M${f1(-w)} ${f1(-b)}H${f1(w)}` });
        // ribbon windows
        for (let y = a + 24; y < b - 5; y += 14) for (let x = -w + 3; x < w - 9; x += 12.5) cells.push([x, -y - 1.3, 9, 2.6]);
      });
      sceneDraw.winGroups(r, cells, 12).forEach(d => body.push({ f: '@glass.3', d, op: 0.3, glow: 'window', detail: true }));
      // the crown: a dark core behind an open ring of fins, the middle ones highest; at night they shine
      body.push(['@notch', rect(-15, -400, 30, 22), 0.7], ['@glass.3', rect(-17, -380, 34, 2)]);
      FINS.forEach(([x, top], i) => {
        const fill = x < 0 ? '@crown.0' : x > 4 ? '@crown.1' : '@crown.0';
        body.push([fill, poly([[x - 1.1, -378], [x + 1.1, -378], [x + 0.7, -top], [x - 0.7, -top + 2]])]);
        lit.push({ s: i % 2 ? '@lightB' : '@lightW', w: 1.2, op: 0.9, d: `M${f1(x)} -380L${f1(x)} ${f1(-top + 1)}` });
      });
      body.push({ s: '@crown.1', w: 0.6, op: 0.7, d: 'M-16 -388H16M-15 -396H15', detail: true });
      lit.push({ f: { rad: [[0, '@lightB', 0.55], [1, '@lightB', 0]], cx: 0, cy: -394, r: 26 }, d: ell(0, -394, 26, 22) }, ['@beacon', ell(0, -412.5, 0.9, 0.9)]);
      // the sunlit edge of the left face, stepping in at the setbacks
      body.push({ s: '@glass.0', w: 1, op: 0.8, d: T.map(([a, b, w]) => `M${f1(-w)} ${-a}V${-b}`).join('') });
      // the podium: the low mall at its foot, its glass and canopy
      body.push(['@base.0', rect(-48, -16, 52, 16)], ['@base.1', rect(4, -16, 44, 16)], ['@mull.0', rect(-50, -17.6, 100, 2)]);
      const pod = []; for (let x = -46; x < 46; x += 4.4) pod.push([x, -12, 3, 8]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@glass.3', d, glow: 'window' }));
      return { body, lit };
    },
  });
})();
