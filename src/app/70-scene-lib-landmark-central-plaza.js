/* ============================================================
   SCENE LIBRARY: landmark.central-plaza (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The tall tower on the Wan Chai waterfront, in place of the hand-drawn hong-kong-skyline art's
   flat-topped tower on the right (its `feat` block at x 1180 to 1290; the box extraction cannot
   parse that art). Seen from Tsim Sha Tsui, the tower that stands left of Central's towers.
   - the real structure: the 374 m tower, a triangular plan with cut corners: the broad face
     towards the harbour between narrow corner faces; a tall colonnade at its foot; a crown of
     lighter floors, then the glass pyramid and the long mast
   - gold and silver glass in horizontal bands with pale mullions; the left corner in the sun,
     the right in shade
   - night: the four light bars of the crown and the pyramid's edges (the 'lit' part); the windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const W = 25, C = 5;   // the half-width and the corner faces' width
  define({
    id: 'landmark.central-plaza', category: 'landmark', size: [70, 374], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      gold: ['#e8d4a2', '#c8ac72', '#9c824e', '#6e5a38'], silver: ['#eceae4', '#bdbab2'], crown: ['#d8dce0', '#a2a8b0'],
      base: ['#cfc8bc', '#9c9488', '#5e5850'], mast: '#d4d8dc', lightA: '#ffd68a', lightW: '#fff6e4', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe8bc' }, on: 0.8 },
    shadow: { rx: 40, ry: 4, h: 70 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:hong-kong', 'asia', 'asia-east', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn hong-kong-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      // the whole height in two faces (what a small still keeps): the broad face with the sunlit corner, the shaded corner
      body.push({ f: { lin: [[0, '@gold.0'], [0.5, '@gold.1'], [1, '@gold.2']], x1: -W, y1: 0, x2: W - C, y2: 0 }, d: rect(-W, -272, 2 * W - C, 272) + poly([[-23, -272], [18, -272], [18, -290], [-23, -290]]) },
        { f: { lin: [[0, '@gold.2'], [1, '@gold.3']], x1: W - C, y1: 0, x2: W, y2: 0 }, d: rect(W - C, -272, C, 272) + rect(18, -290, 5, 18) });
      // the shaft's faces (detail): the sunlit left corner, the broad face, the shaded right corner
      body.push({ f: { lin: [[0, '@silver.0'], [1, '@gold.0']], x1: -W, y1: 0, x2: -W + C, y2: 0 }, d: rect(-W, -272, C, 248), detail: true });
      body.push({ f: { lin: [[0, '@gold.0'], [0.55, '@gold.1'], [1, '@gold.2']], x1: 0, y1: -272, x2: 0, y2: -24 }, d: rect(-W + C, -272, 2 * W - 2 * C, 248), detail: true });
      body.push({ f: { lin: [[0, '@gold.2'], [1, '@gold.3']], x1: W - C, y1: 0, x2: W, y2: 0 }, d: rect(W - C, -272, C, 248), detail: true });
      // five zones between the refuge floors: each zone's faces catch the sky a little differently, a silver band at its top
      const Z = [24, 74, 124, 174, 224, 272];
      for (let i = 0; i < 5; i++) {
        const a = Z[i], b = Z[i + 1];
        body.push({ f: { lin: [[0, '@silver.0', 0.3], [1, '@gold.1', 0]], x1: 0, y1: -b, x2: 0, y2: -a }, d: rect(-W + C, -b, 2 * W - 2 * C, b - a), detail: true });
        body.push({ f: '@silver.0', d: rect(-W, -b, C, b - a), op: 0.12 + 0.05 * (i % 2), detail: true }, { f: '@gold.3', d: rect(W - C, -b, C, b - a), op: 0.12 + 0.05 * (i % 2), detail: true });
        body.push({ s: '@silver.0', w: 2.2, op: 0.22, d: `M${-W + C + 4} ${-a - 6}L${-W + C + 16} ${-b + 8}`, detail: true });
        if (i < 4) body.push(['@silver.0', rect(-W, -b - 1.4, 2 * W, 2.8), 0.9]);
      }
      // the banding: silver spandrels every floor group across the gold glass, fewer on the corners
      let bands = ''; for (let y = 32; y < 270; y += 8) bands += rect(-W + C, -y - 1.6, 2 * W - 2 * C, 1.6);
      body.push({ f: '@silver.0', d: bands, op: 0.55, detail: true });
      let cb = ''; for (let y = 32; y < 270; y += 16) cb += rect(-W, -y - 1.4, C, 1.4) + rect(W - C, -y - 1.4, C, 1.4);
      body.push({ f: '@silver.1', d: cb, op: 0.5, detail: true });
      let mu = ''; for (let x = -W + C + 3.3; x < W - C; x += 3.3) mu += `M${f1(x)} -24V-272`;
      body.push({ s: '@silver.1', w: 0.4, op: 0.4, d: mu, detail: true });
      // the corner edges: a sunlit line on the left, the creases
      body.push({ s: '@silver.0', w: 1, op: 0.85, d: `M${-W} -24V-272` }, { s: '@gold.3', w: 0.9, op: 0.6, d: `M${-W + C} -24V-272M${W - C} -24V-272`, detail: true });
      body.push({ s: '@gold.0', w: 0.6, op: 0.5, d: `M${W - C + 0.8} -24V-272`, detail: true });   // the far corner's edge catching the light
      // the windows: ribbons
      for (let y = 38; y < 266; y += 14) for (let x = -W + C + 2; x < W - C - 9; x += 12) cells.push([x, -y - 1.3, 9, 2.6]);
      sceneDraw.winGroups(r, cells, 16).forEach(d => body.push({ f: '@gold.3', d, op: 0.3, glow: 'window', detail: true }));
      // the colonnade at the foot: tall pale columns before the dark lobby
      body.push(['@base.2', rect(-W, -24, 2 * W, 24)], ['@base.0', rect(-W - 1, -26, 2 * W + 2, 2.4)]);
      let cols = ''; for (let x = -W; x <= W - 3; x += 7) cols += rect(x, -24, 3, 24);
      body.push({ f: '@base.0', d: cols }, { f: '@base.1', d: rect(W - 3, -24, 3, 24) });
      let cs = ''; for (let x = -W; x <= W - 3; x += 7) cs += rect(x + 2, -24, 1, 24);
      body.push({ f: '@base.1', d: cs, op: 0.7, detail: true }, ['@base.1', rect(-W - 3, -2, 2 * W + 6, 2)], ['@base.0', rect(-W - 2, -3.4, 2 * W + 4, 1.4)]);
      const lob = []; for (let x = -W + 4; x < W - 4; x += 7) lob.push([x, -18, 2.6, 14]);
      sceneDraw.winGroups(r, lob, 2).forEach(d => body.push({ f: '@gold.0', d, glow: 'window' }));
      // the crown: lighter floors carrying the four light bars, then the glass pyramid with its ribs
      body.push({ f: { lin: [[0, '@crown.0'], [1, '@crown.1']], x1: -23, y1: 0, x2: 23, y2: 0 }, d: rect(-23, -290, 46, 18), detail: true }, ['@silver.0', rect(-26, -273.4, 52, 2)]);
      let bars = ''; for (const y of [276, 280, 284, 288]) bars += `M-22 ${-y}H22`;
      body.push({ s: '@gold.3', w: 1.4, op: 0.75, d: bars });
      let cm = ''; for (let x = -20; x < 22; x += 5) cm += `M${x} -273V-290`;
      body.push({ s: '@crown.1', w: 0.5, op: 0.6, d: cm, detail: true }, ['@silver.0', rect(-24, -291.2, 48, 2)]);
      body.push({ f: { lin: [[0, '@crown.0'], [1, '@crown.1']], x1: -23, y1: 0, x2: 23, y2: 0 }, d: poly([[-23, -290], [23, -290], [3, -312], [-3, -312]]) }, ['@crown.1', poly([[0, -290], [23, -290], [3, -312], [0, -312]]), 0.55]);
      let ribs = ''; for (let k = 1; k < 6; k++) { const t = k / 6; ribs += `M${f1(-23 + 46 * t)} -290L${f1(-3 + 6 * t)} -312`; }
      body.push({ s: '@crown.1', w: 0.5, op: 0.7, d: ribs + 'M-17.5 -296H17.5M-12 -302H12M-6.5 -308H6.5', detail: true });
      // the mast with its rings
      body.push(['@crown.1', rect(-4, -314, 8, 2.4)], { s: '@crown.1', w: 0.8, op: 0.7, d: 'M0.8 -314V-344', detail: true }, { s: '@mast', w: 2, d: 'M0 -312V-345' }, { s: '@mast', w: 1.1, d: 'M0 -345V-373' }, { s: '@mast', w: 0.6, op: 0.8, d: 'M-2.4 -322H2.4M-2 -332H2M-1.6 -342H1.6', detail: true }, ['@beacon', ell(0, -373.5, 0.9, 0.9)]);
      // night: the four bars, the pyramid's edges, the mast and its light
      lit.push({ s: '@lightA', w: 1.6, op: 0.95, d: bars }, { f: { rad: [[0, '@lightA', 0.45], [1, '@lightA', 0]], cx: 0, cy: -282, r: 32 }, d: ell(0, -282, 32, 16) });
      lit.push({ f: { lin: [[0, '@lightW', 0.35], [1, '@lightW', 0.05]], x1: 0, y1: -312, x2: 0, y2: -290 }, d: poly([[-23, -290], [23, -290], [3, -312], [-3, -312]]) }, { s: '@lightW', w: 1, op: 0.8, d: 'M-23 -290L-3 -312H3L23 -290' }, { s: '@lightW', w: 0.9, op: 0.75, d: 'M0 -312V-372' });
      lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -373.5, r: 4 }, d: ell(0, -373.5, 4, 4) });
      return { body, lit };
    },
  });
})();
