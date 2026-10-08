/* ============================================================
   SCENE LIBRARY: landmark.great-american-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Great American Tower at Queen City Square, Cincinnati (2011), seen from across the Ohio.
   Drawn by hand after its form:
   - a slender glass tower whose top floors curve in at the shoulders, crowned by its open steel
     tiara: a fan of slender ribs rising off the roof, tallest in the middle and falling away to
     each side in a smooth arc, braced by light rings; the broad south face takes the sky, the
     narrow end on the right is in shade; the low podium at its foot
   - the curtain wall's mullions and floor lines, a sky band sliding across the glass
   - night: floors lit in seeded groups (glow); the 'lit' part: the tiara lit white, the red
     aviation light and the lit lobby
   No text, no logos. Anchor: the ground at the middle of the tower.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const L = -44, M = 30, R = 52, T = -400, S = -350, TT = -500, TE = -452;   // the broad face from L to M, the narrow end to R; the roof, the shoulders, the tiara's crown and its ends
  // the tiara's top edge: a smooth arc from TE at the ends to TT in the middle
  const arcY = x => TE + (TT - TE) * (1 - Math.pow((x - (L + R) / 2) / ((R - L) / 2 + 6), 2));
  define({
    id: 'landmark.great-american-tower', category: 'landmark', size: [128, 510], box: [-64, -508, 64, 2], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#a6c8d8', '#6c98b2', '#43708e', '#dcf0f8', '#2c4c62'], end: ['#5a8098', '#3a5a72', '#28425a'], steel: ['#d8dee2', '#9aa6ae', '#6a7680'],
      pod: ['#8a949a', '#646e76'], cloud: '#eef8ff', tiara: '#f4f8ff', beacon: '#ff4a3a', lobby: '#ffe6b0',
    } },
    night: { glow: { window: '#e8f0ff' }, on: 0.55 },
    shadow: { rx: 70, ry: 6, h: 100 },
    reflect: true,
    tags: ['landmark', 'place:us/place:cincinnati', 'us', 'us-midwest', 'skyline', 'skyscraper', 'glass-tower'],
    credit: 'native, drawn for the composed cincinnati-flying-pig scene',
    build(v, r) {
      const body = [], lit = [];
      // the shaft outline: straight sides up to the shoulders, then curving in to the roof
      const face = `M${L} 0V${S}Q${L} ${T + 12} ${L + 12} ${T}H${M}V0Z`, end = `M${M} 0V${T}H${R - 12}Q${R} ${T + 12} ${R} ${S}V0Z`;
      body.push({ f: { lin: [[0, '@glass.3'], [0.18, '@glass.0'], [0.6, '@glass.1'], [1, '@glass.2']], x1: 0, y1: T, x2: 0, y2: 0 }, d: face });
      body.push({ f: { lin: [[0, '@end.0'], [1, '@end.2']], x1: 0, y1: T, x2: 0, y2: 0 }, d: end });
      body.push(['@glass.4', rect(M - 1, T, 2, -T), 0.5], ['@glass.3', `M${L} 0V${S}Q${L} ${T + 12} ${L + 12} ${T}h3Q${L + 3} ${T + 14} ${L + 3} ${S}V0Z`, 0.5]);
      // the sky sliding across the broad face, the brighter top floors, a darker band low down
      for (const [y, h, op] of [[-372, 16, 0.3], [-336, 6, 0.18], [-300, 22, 0.22], [-252, 8, 0.15], [-214, 14, 0.16], [-170, 6, 0.12]]) body.push(['@cloud', poly([[L, y + h], [L, y + 4], [M, y - 12], [M, y - 12 + h * 0.6]]), op]);
      body.push(['@glass.2', poly([[L, -110], [M, -136], [M, -90], [L, -70]]), 0.22]);
      // the mullions (panel columns) and the floor lines, the shaded end's columns
      for (let x = L + 7, k = 0; x < M - 2; x += 7, k++) body.push({ f: k % 3 ? '@glass.0' : '@glass.3', d: rect(x, T + 14, 0.9, -T - 54), op: 0.12 + (k % 4) * 0.05, detail: true });
      for (let x = M + 5; x < R - 2; x += 6) body.push({ f: '@end.0', d: rect(x, T + 14, 0.8, -T - 54), op: 0.3, detail: true });
      let fl = '', fe = '';
      for (let y = T + 10; y < -40; y += 9) { fl += `M${L} ${y}H${M}`; fe += `M${M} ${y}H${R}`; }
      body.push({ s: '@glass.4', w: 0.4, op: 0.2, d: fl, detail: true }, { s: '@end.2', w: 0.4, op: 0.3, d: fe, detail: true });
      // the roof: the parapet, the mechanical band under it
      body.push(['@steel.2', rect(L + 10, T - 3, R - L - 20, 4)], ['@end.2', rect(L + 2, T + 16, R - L - 4, 4), 0.35]);
      // the podium at the foot: its glass, its lit edge, the lobby mullions
      body.push(['@pod.1', rect(-62, -40, 124, 40)], ['@pod.0', rect(-62, -40, 70, 40), 0.8], ['@steel.0', rect(-62, -42, 124, 2.4)], ['@glass.2', rect(-56, -30, 112, 20), 0.6]);
      body.push({ s: '@steel.1', w: 0.6, op: 0.5, d: 'M-48 -30v20M-36 -30v20M-24 -30v20M-12 -30v20M0 -30v20M12 -30v20M24 -30v20M36 -30v20M48 -30v20', detail: true });
      // the tiara: the far ribs (behind, darker), the near ribs fanning off the roof, the rings bracing them, the lit crown edge
      const ribs = [];
      for (let i = 0; i <= 10; i++) { const x0 = L + 10 + i * (R - L - 20) / 10, x1 = L + i * (R - L) / 10; ribs.push([x0, x1]); }
      let farR = '', nearR = '';
      ribs.forEach(([x0, x1], i) => { const d = `M${f1(x0)} ${T}L${f1(x1)} ${f1(arcY(x1))}`; if (i % 2) farR += d; else nearR += d; });
      body.push({ s: '@steel.2', w: 1.6, op: 0.8, d: farR }, { s: '@steel.0', w: 2.2, d: nearR });
      let rings = '';
      for (const t of [0.35, 0.7]) { rings += 'M'; ribs.forEach(([x0, x1], i) => { const y = T + (arcY(x1) - T) * t; rings += `${i ? 'L' : ''}${f1(x0 + (x1 - x0) * t)} ${f1(y)}`; }); }
      body.push({ s: '@steel.1', w: 1, op: 0.75, d: rings });
      let edge = `M${f1(ribs[0][1])} ${f1(arcY(ribs[0][1]))}`;
      for (let x = ribs[0][1] + 6; x <= ribs[10][1]; x += 6) edge += `L${f1(x)} ${f1(arcY(x))}`;
      body.push({ s: '@steel.0', w: 1.4, d: edge }, { s: '@steel.2', w: 0.6, op: 0.5, d: edge.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${x} ${f1(+y + 3)}`), detail: true });
      // the rib tips catch the sun on the left; each rib's lit flank (fine detail)
      body.push(['@steel.0', ribs.slice(0, 5).map(([, x1]) => ell(x1, arcY(x1), 1.2, 1.2)).join(''), 0.9]);
      ribs.forEach(([x0, x1]) => body.push({ s: '@glass.3', w: 0.6, op: 0.6, d: `M${f1(x0 - 0.8)} ${T}L${f1(x1 - 0.8)} ${f1(arcY(x1) + 1)}`, detail: true }));
      // the mechanical floors (darker bands of louvres), the base ring of the tiara, the lobby canopy, a glint on the shaded end
      for (const y of [-110, -210, -310]) body.push({ f: '@end.2', d: rect(L, y, M - L, 5), op: 0.3, detail: true }, { f: '@end.2', d: rect(M, y, R - M, 5), op: 0.4, detail: true });
      body.push(['@steel.1', rect(L + 8, T - 6, R - L - 16, 3), 0.9], ['@steel.0', rect(-20, -44, 40, 3)], ['@glass.0', poly([[M, T + 30], [R - 4, T + 20], [R - 4, T + 60], [M, T + 70]]), 0.18]);
      // night: floors lit in seeded groups (coarse ribbons so the tile stays light)
      const cells = [], cellsE = [];
      for (let y = T + 24; y < -50; y += 14) { for (let x = L + 3; x < M - 9; x += 12) cells.push([x, y, 10, 2.6]); cellsE.push([M + 4, y, 8, 2.6], [M + 13, y, 6, 2.6]); }
      sceneDraw.winGroups(r, cells, 14).forEach(d => body.push({ f: '@glass.1', d, op: 0.12, glow: 'window', detail: true }));
      sceneDraw.winGroups(r, cellsE, 5).forEach(d => body.push({ f: '@end.1', d, op: 0.15, glow: 'window', detail: true }));
      // the lit part: the tiara in white light, the aviation light, the lobby
      lit.push({ s: '@tiara', w: 2.2, op: 0.85, d: nearR }, { s: '@tiara', w: 1.6, op: 0.6, d: farR + rings }, { s: '@tiara', w: 1.8, op: 0.9, d: edge });
      lit.push({ f: { rad: [[0, '@tiara', 0.3], [1, '@tiara', 0]], cx: (L + R) / 2, cy: T - 50, r: 70 }, d: rect(-62, -506, 124, 108) });
      lit.push(['@beacon', ell((L + R) / 2, TT - 3, 2.4, 2.4), 0.95], { f: { lin: [[0, '@lobby', 0.1], [1, '@lobby', 0.6]], x1: 0, y1: -30, x2: 0, y2: -10 }, d: rect(-56, -30, 112, 20) });
      return { body, lit };
    },
  });
})();
