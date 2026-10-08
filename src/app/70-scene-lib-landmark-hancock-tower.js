/* ============================================================
   SCENE LIBRARY: landmark.hancock-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   200 Clarendon Street (the former John Hancock Tower), Back Bay, Boston. Drawn by hand (the box
   extraction of the hand-drawn boston-charles art was only a reference):
   - the real form: a sheer 60-storey slab on a rhomboid plan, clad top to bottom in reflective
     blue glass with almost no visible frame; seen at an angle from across the Charles, the broad
     face takes the sky and the narrow end on the right is in shade, split from top to bottom by
     the deep V-notch that runs up each narrow end; a flat roof, the dark lobby glazing at the foot
   - the curtain wall's panel columns and floor lines, the sky's clouds sliding across the
     broad face, the neighbours' darker reflections low down
   - night: floors lit in seeded groups (glow); the 'lit' part: the red aviation lights at the
     roof corners, the roofline catching the city glow and the lit lobby
   No text, no logos. Anchor: the ground at the middle of the slab.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const T = -430, L = -80, M = 48, R = 82, N = 64;   // roof, the broad face from L to M, the narrow end from M to R with its notch at N
  define({
    id: 'landmark.hancock-tower', category: 'landmark', size: [164, 432], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#a8cce6', '#6a9cc4', '#40688e', '#dcefff', '#2a4a6a'], end: ['#557fa4', '#34587c', '#22405e'], frame: ['#1e3248', '#8aa8c0'],
      cloud: '#eef7ff', lightW: '#f4f8ff', beacon: '#ff4a3a', lobby: '#ffe6b0',
    } },
    night: { glow: { window: '#e6eeff' }, on: 0.55 },
    shadow: { rx: 80, ry: 6, h: 90 },
    reflect: true,
    tags: ['landmark', 'place:us/place:boston', 'us', 'us-northeast', 'skyline', 'skyscraper', 'glass-tower'],
    credit: 'native, drawn for the composed boston-charles scene (after the hand-drawn art)',
    build(v, r) {
      const body = [], lit = [];
      // the broad face: the sky in the glass, lighter towards the top
      body.push({ f: { lin: [[0, '@glass.0'], [0.45, '@glass.1'], [1, '@glass.2']], x1: 0, y1: T, x2: 0, y2: 0 }, d: rect(L, T, M - L, -T) });
      // the narrow end in shade, the V-notch splitting it (its lit flank, its dark depth)
      body.push({ f: { lin: [[0, '@end.0'], [1, '@end.2']], x1: 0, y1: T, x2: 0, y2: 0 }, d: rect(M, T, R - M, -T) });
      body.push(['@end.2', poly([[N - 5, T], [N + 4, T], [N + 4, 0], [N - 5, 0]])], ['@end.0', rect(N - 5, T, 2.2, -T), 0.9], ['@frame.0', rect(N + 1, T, 3, -T), 0.6]);
      body.push(['@glass.4', rect(M - 1, T, 2, -T), 0.5]);
      // the notch's depth darkening towards the street, the sky caught high on the narrow end
      body.push({ f: { lin: [[0, '@end.1', 0], [1, '@frame.0', 0.5]], x1: 0, y1: T, x2: 0, y2: 0 }, d: rect(N - 3, T, 7, -T) });
      body.push({ f: { lin: [[0, '@glass.0', 0.45], [1, '@glass.0', 0]], x1: 0, y1: T, x2: 0, y2: T + 120 }, d: rect(M, T, N - 5 - M, 120) });
      // the lobby: its mullions, the entrance canopy and the glints in the street-level glass
      body.push({ s: '@frame.1', w: 0.6, op: 0.5, d: 'M-70 -13v12M-56 -13v12M-42 -13v12M-28 -13v12M-14 -13v12M0 -13v12M14 -13v12M28 -13v12', detail: true });
      body.push(['@frame.1', rect(-20, -16, 30, 2.4), 0.8], ['@glass.3', poly([[L + 6, -2], [L + 12, -12], [L + 15, -12], [L + 9, -2]]), 0.35]);
      // clouds and sky sliding across the broad face (lit side), a darker band of the sky lower down
      for (const [y, h, op] of [[-404, 22, 0.32], [-376, 8, 0.2], [-352, 14, 0.24], [-326, 6, 0.16], [-300, 30, 0.2], [-262, 8, 0.14], [-238, 12, 0.18], [-212, 6, 0.12], [-186, 20, 0.14]]) body.push(['@cloud', poly([[L, y + h], [L, y + 4], [L + 60, y - 6], [M, y - 18], [M, y - 18 + h * 0.6], [L + 50, y + h * 0.4]]), op]);
      body.push(['@glass.2', poly([[L, -120], [M, -150], [M, -100], [L, -80]]), 0.25]);
      // the neighbours reflected low on the broad face (darker blocks), and the lobby glazing at the foot
      for (const [x, y, w] of [[L, -58, 30], [L + 34, -40, 26], [L + 70, -70, 22]]) body.push({ f: '@glass.4', d: rect(x, y, w, -14 - y), op: 0.28, detail: true });
      // the sun's glint down the lit edge, and the brighter sky in the top floors
      body.push(['@glass.3', poly([[L, T + 40], [L + 10, T + 30], [L + 10, T + 120], [L, T + 140]]), 0.25], ['@glass.3', poly([[L + 14, T + 60], [L + 18, T + 56], [L + 18, T + 100], [L + 14, T + 106]]), 0.18]);
      body.push({ f: { lin: [[0, '@glass.3', 0.5], [1, '@glass.3', 0]], x1: 0, y1: T, x2: 0, y2: T + 90 }, d: rect(L, T, M - L, 90) });
      body.push(['@frame.0', rect(L, -14, R - L, 14)], ['@glass.2', rect(L + 2, -12, M - L - 4, 10), 0.8]);
      // the curtain wall: panel columns, each catching the light a little differently, and the floor lines
      for (let x = L + 8, k = 0; x < M - 2; x += 8, k++) body.push({ f: k % 3 ? '@glass.0' : '@glass.3', d: rect(x, T + 2, 1, -T - 16), op: 0.12 + (k % 4) * 0.05, detail: true });
      for (let x = M + 4; x < R; x += 6) if (Math.abs(x - N) > 6) body.push({ f: '@end.0', d: rect(x, T + 2, 0.8, -T - 16), op: 0.3, detail: true });
      let fl = '', fe = '';
      for (let y = T + 7; y < -14; y += 7) { fl += `M${L} ${y}H${M}`; fe += `M${M} ${y}H${R}`; }
      body.push({ s: '@glass.4', w: 0.4, op: 0.22, d: fl, detail: true }, { s: '@frame.0', w: 0.4, op: 0.3, d: fe, detail: true });
      // the roof: a dark parapet line, the lit edge of the broad face, the mechanical floor band just under it
      body.push(['@frame.0', rect(L, T, R - L, 3)], ['@glass.3', rect(L, T + 3, M - L, 1.6), 0.8], ['@frame.1', rect(L, T + 10, M - L, 5), 0.3], ['@end.2', rect(M, T + 10, R - M, 5), 0.5]);
      body.push(['@glass.3', rect(L, T, 2, -T), 0.6]);
      // night: floors lit in seeded groups, coarse ribbons (a row every 14 units) so the tile stays light
      const cells = [], cellsE = [];
      for (let y = T + 18; y < -20; y += 14) { for (let x = L + 3; x < M - 9; x += 12) cells.push([x, y, 10, 2.6]); cellsE.push([M + 4, y, 8, 2.6], [N + 6, y, 10, 2.6]); }
      sceneDraw.winGroups(r, cells, 16).forEach(d => body.push({ f: '@glass.1', d, op: 0.12, glow: 'window', detail: true }));
      sceneDraw.winGroups(r, cellsE, 6).forEach(d => body.push({ f: '@end.1', d, op: 0.15, glow: 'window', detail: true }));
      // the lit part: aviation lights, the roofline in the city's glow, the lobby
      lit.push(['@beacon', ell(L + 4, T - 2, 2.4, 2.4) + ell(R - 4, T - 2, 2.4, 2.4), 0.95], { s: '@lightW', w: 1.2, op: 0.45, d: `M${L} ${T + 1}H${R}` });
      lit.push({ f: { rad: [[0, '@beacon', 0.4], [1, '@beacon', 0]], cx: L + 4, cy: T - 2, r: 10 }, d: rect(L - 6, T - 12, 20, 20) }, { f: { rad: [[0, '@beacon', 0.4], [1, '@beacon', 0]], cx: R - 4, cy: T - 2, r: 10 }, d: rect(R - 14, T - 12, 20, 20) });
      lit.push({ f: { lin: [[0, '@lobby', 0.1], [1, '@lobby', 0.6]], x1: 0, y1: -14, x2: 0, y2: 0 }, d: rect(L + 2, -13, R - L - 4, 12) });
      return { body, lit };
    },
  });
})();
