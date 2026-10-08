/* ============================================================
   SCENE LIBRARY: landmark.bank-of-china (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the faceted tower in the hand-drawn hong-kong-skyline art (its `feat` tower at
   x 880 to 976; the box extraction cannot parse that art, so the geometry was read from its source):
   - the real structure: the 367 m Bank of China Tower in Central, a 52 m square divided along
     its diagonals into four triangular shafts that stop at different heights, each under a
     sloping glass roof; seen from the harbour the front shaft's roof is a glass gable, the side
     shafts' roofs climb to the centre in steps, and the last shaft ends in a pointed top with
     its two masts
   - the cross-bracing: great white X frames, one per 52 m module, so the faces read as diamonds
     and triangles of blue glass; the corner columns; the sunlit facets on the left
   - night: the frames traced in white light, the masts lit (the 'lit' part); the windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const W = 26;
  // the four shafts' roof heights at the centre (front, right, left, top); each roof falls 26 to the outer corner
  const HN = 132, HE = 186, HW = 240, HS = 315;
  define({
    id: 'landmark.bank-of-china', category: 'landmark', size: [80, 367], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#9fb4ca', '#6e86a2', '#4a6080', '#2e4060'], sky: ['#c6d6e6', '#94aac2'], frame: ['#f2f5f8', '#c4ccd6'],
      base: ['#b8b2aa', '#8a857e', '#64605a'], mast: '#d8dde2', lightW: '#f6faff', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#eef2ff' }, on: 0.8 },
    shadow: { rx: 44, ry: 4, h: 70 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:hong-kong', 'asia', 'asia-east', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn hong-kong-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      // the whole height in two halves (what a small still keeps): the sunlit left, the shaded right, the pointed top
      body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -W, y1: 0, x2: 0, y2: 0 }, d: poly([[-W, 0], [0, 0], [0, -HS], [-W, -HS + W]]) },
        { f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 0, y1: 0, x2: W, y2: 0 }, d: poly([[0, 0], [W, 0], [W, -HS + W], [0, -HS]]) });
      // the facets (detail): the front shaft's face and its glass gable; above it the left and right shafts' faces up to
      // their roofs; above those the top shaft's two faces up to its point
      body.push({ f: { lin: [[0, '@glass.1'], [1, '@glass.2']], x1: -W, y1: 0, x2: W, y2: 0 }, d: rect(-W, -HN + W, 2 * W, HN - W), detail: true });
      body.push({ f: { lin: [[0, '@sky.0'], [1, '@sky.1']], x1: 0, y1: -HN, x2: 0, y2: -HN + W }, d: poly([[-W, -HN + W], [W, -HN + W], [0, -HN]]), detail: true });
      body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -W, y1: 0, x2: 0, y2: 0 }, d: poly([[-W, -HN + W], [0, -HN], [0, -HW], [-W, -HW + W]]), detail: true });
      body.push({ f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 0, y1: 0, x2: W, y2: 0 }, d: poly([[0, -HN], [W, -HN + W], [W, -HE + W], [0, -HE]]), detail: true });
      body.push({ f: { lin: [[0, '@sky.1'], [1, '@glass.0']], x1: -W, y1: 0, x2: 0, y2: 0 }, d: poly([[-W, -HW + W], [0, -HW], [0, -HS], [-W, -HS + W]]), detail: true });
      body.push({ f: { lin: [[0, '@glass.1'], [1, '@glass.3']], x1: 0, y1: 0, x2: W, y2: 0 }, d: poly([[0, -HE], [W, -HE + W], [W, -HS + W], [0, -HS]]), detail: true });
      // the X modules: each 52 m module's four triangles shaded a little apart, so the faces break into diamonds
      for (let i = 0; i < 5; i++) {
        const y0 = 52 * i, y1 = y0 + 52, c = [0, -y0 - 26];
        body.push(['@frame.0', poly([[-W, -y0], [-W, -y1], c]), 0.1], ['@glass.3', poly([[W, -y0], [W, -y1], c]), 0.16]);
        body.push(['@glass.3', poly([[-W, -y0], [W, -y0], c]), 0.08], ['@frame.0', poly([[-W, -y1], [W, -y1], c]), 0.07]);
        // the windows: ribbons in the module
        for (const y of [y0 + 10, y0 + 24, y0 + 38]) for (let x = -W + 3; x < W - 9; x += 12.5) cells.push([x, -y - 1.3, 9, 2.6]);
      }
      for (const y of [270, 284]) for (let x = -W + 3; x < W - 9; x += 12.5) cells.push([x, -y - 1.3, 9, 2.6]);
      // the sky caught on the sunlit facets: a soft streak per module
      for (let i = 0; i < 5; i++) body.push({ s: '@sky.0', w: 2.4, op: 0.22, d: `M-23 ${-52 * i - 8}L-9 ${-52 * i - 40}`, detail: true });
      sceneDraw.winGroups(r, cells, 16).forEach(d => body.push({ f: '@glass.3', d, op: 0.3, glow: 'window', detail: true }));
      // the mullions and spandrels (fine)
      let mu = '', mr = ''; for (let x = -W + 4.3; x < W; x += 4.3) { const top = HS - Math.abs(x), m = `M${f1(x)} 0V${f1(-Math.min(top, HS - W) + 1)}`; if (x < 0) mu += m; else mr += m; }
      let sp = ''; for (let y = 14; y < HS - W; y += 14) sp += `M${-W} ${-y}H${W}`;
      body.push({ s: '@frame.0', w: 0.4, op: 0.4, d: mu, detail: true }, { s: '@frame.1', w: 0.4, op: 0.35, d: mr + sp, detail: true });
      // the corner columns (sunlit on the left, shaded on the right) and the centre column above the front shaft
      body.push(['@frame.0', rect(-W, -HS + W, 2.6, HS - W), 0.75], ['@glass.3', rect(W - 2.6, -HS + W, 2.6, HS - W), 0.6], { f: '@frame.1', d: rect(-1.2, -HS + 3, 2.4, HS - HN - 3), op: 0.5, detail: true });
      // the sloping glass roofs of the side shafts, seen edge-on: a bright rim along each
      body.push({ s: '@sky.0', w: 2, op: 0.7, d: `M${-W} ${-HW + W + 1.5}L0 ${-HW + 1.5}`, detail: true }, { s: '@sky.1', w: 2, op: 0.6, d: `M0 ${-HE + 1.5}L${W} ${-HE + W + 1.5}`, detail: true });
      // the bracing: the X diagonals of each module, the module belts, the corner columns, the roof edges and the centre edge
      let x = '';
      for (let i = 0; i < 5; i++) x += `M${-W} ${-52 * i}L${W} ${-52 * i - 52}M${W} ${-52 * i}L${-W} ${-52 * i - 52}`;
      x += `M${-W} -260L14.5 -300.5M${W} -260L-14.5 -300.5`;
      let belts = ''; for (let i = 1; i <= 5; i++) belts += `M${-W} ${-52 * i}H${W}`;
      const edges = `M${-W} 0V${-HS + W}L0 ${-HS}L${W} ${-HS + W}V0M${-W} ${-HN + W}L0 ${-HN}L${W} ${-HN + W}M${-W} ${-HW + W}L0 ${-HW}M0 ${-HE}L${W} ${-HE + W}M0 ${-HN}V${-HS}`;
      body.push({ s: '@frame.0', w: 1.5, op: 0.95, d: x }, { s: '@frame.1', w: 1, op: 0.75, d: belts, detail: true }, { s: '@frame.0', w: 1.3, op: 0.9, d: edges });
      // the masts, side by side on the point, a little apart in height, each with its light
      body.push({ s: '@mast', w: 1.4, d: `M-3 ${-HS + 4}V-367M3 ${-HS + 4}V-358` }, { s: '@mast', w: 0.7, op: 0.8, d: 'M-4.5 -335H-1.5M-4 -350H-2M1.5 -332H4.5M2 -346H4', detail: true });
      body.push(['@beacon', ell(-3, -367.5, 0.9, 0.9)], ['@beacon', ell(3, -358.5, 0.8, 0.8)]);
      // the granite podium with its glazed entrance
      body.push(['@base.0', rect(-42, -18, 46, 18)], ['@base.1', rect(4, -18, 38, 18)], ['@base.2', rect(-44, -19.6, 88, 2)]);
      body.push({ s: '@base.2', w: 0.6, op: 0.5, d: 'M-42 -6H42M-42 -12H42', detail: true });
      // the podium's plinth steps and the canopy over the entrance
      body.push(['@base.1', rect(-46, -2, 92, 2)], ['@base.0', rect(-45, -3.6, 90, 1.6)], ['@base.2', rect(-17, -16, 34, 1.6)]);
      const pod = []; for (let px = -14; px < 14; px += 4) pod.push([px, -14, 3, 13]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@glass.3', d, glow: 'window' }));
      // night: the frames in white light, the masts and their lights
      lit.push({ s: '@lightW', w: 1.3, op: 0.95, d: x }, { s: '@lightW', w: 1.2, op: 0.9, d: edges }, { s: '@lightW', w: 0.9, op: 0.55, d: belts });
      lit.push({ s: '@lightW', w: 1, op: 0.8, d: `M-3 ${-HS + 4}V-366M3 ${-HS + 4}V-357` });
      // the floodlit foot of the tower and the glazed entrance
      lit.push({ f: { lin: [[0, '@lightW', 0], [1, '@lightW', 0.3]], x1: 0, y1: -60, x2: 0, y2: -18 }, d: rect(-W, -60, 2 * W, 42) }, { f: '@lightW', d: rect(-15, -14, 30, 13), op: 0.35 });
      lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: -3, cy: -367.5, r: 4 }, d: ell(-3, -367.5, 4, 4) }, { f: { rad: [[0, '@beacon', 0.6], [1, '@beacon', 0]], cx: 3, cy: -358.5, r: 3.4 }, d: ell(3, -358.5, 3.4, 3.4) });
      return { body, lit };
    },
  });
})();
