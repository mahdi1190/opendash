/* ============================================================
   SCENE LIBRARY: landmark.prudential-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Prudential Tower ("the Pru"), Back Bay, Boston. Drawn by hand after its form:
   - a plain 52-storey box of the 1960s: a grid of slim vertical aluminium piers and dark glass
     strips, the floors marked by spandrel lines; the lit face and the shaded side
   - the two top floors (the observatory and the restaurant) in a darker band of glass, the
     stepped penthouse above the roof, and the tall lattice mast with its platforms
   - the low podium of the centre's shops and halls at the foot
   - night: floors lit in seeded groups (glow); the 'lit' part: the crown band washed in light,
     the penthouse glow and the mast's red beacons
   No text, no logos. Anchor: the ground at the middle of the tower's lit face.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const T = -400, L = -42, M = 42, R = 64;   // roof, the lit face from L to M, the shaded side from M to R
  define({
    id: 'landmark.prudential-tower', category: 'landmark', size: [140, 506], box: [-70, -515, 80, 2], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      clad: ['#c2c8cc', '#9aa2aa', '#7a838c', '#e0e6ea'], glass: ['#4e5e70', '#38485a', '#64788c'], side: ['#7c858e', '#5e6770', '#4a525a'],
      mast: ['#9aa0a6', '#6a7076'], podium: ['#b8ada0', '#968b7e', '#5e5650'],
      crown: '#dff0ff', warm: '#ffe2a8', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe6b4' }, on: 0.6 },
    shadow: { rx: 60, ry: 5, h: 80 },
    reflect: true,
    tags: ['landmark', 'place:us/place:boston', 'us', 'us-northeast', 'skyline', 'skyscraper'],
    credit: 'native, drawn for the composed boston-charles scene (after the hand-drawn art)',
    build(v, r) {
      const body = [], lit = [];
      // the podium at the foot (shops and halls), lit face and shade
      body.push(['@podium.0', rect(-66, -34, 132, 34)], ['@podium.1', rect(66, -30, 12, 30)], ['@podium.2', rect(-66, -20, 132, 8), 0.5], ['@podium.0', rect(-68, -36, 136, 3)]);
      body.push({ s: '@podium.2', w: 0.6, op: 0.4, d: 'M-60 -28h120M-60 -8h120', detail: true }, { s: '@podium.1', w: 1.2, op: 0.6, d: 'M-50 -34v34M-20 -34v34M20 -34v34M50 -34v34', detail: true }, ['@podium.1', rect(-24, -12, 48, 12), 0.5]);
      // the tower: the lit face and the shaded side
      body.push({ f: { lin: [[0, '@clad.0'], [1, '@clad.1']], x1: 0, y1: T, x2: 0, y2: 0 }, d: rect(L, T, M - L, -T - 34) });
      body.push({ f: { lin: [[0, '@side.0'], [1, '@side.2']], x1: 0, y1: T, x2: 0, y2: 0 }, d: rect(M, T, R - M, -T - 34) });
      // the dark glass strips between the aluminium piers, each its own (the light plays on them a little differently)
      for (let x = L + 3, k = 0; x < M - 2; x += 6, k++) body.push({ f: k % 2 ? '@glass.0' : '@glass.1', d: rect(x, T + 18, 3, -T - 54), op: 0.62 + (k % 3) * 0.08, detail: k % 2 === 1 });
      for (let x = M + 2, k = 0; x < R - 1; x += 5, k++) body.push({ f: '@glass.1', d: rect(x, T + 18, 2.4, -T - 54), op: 0.55, detail: k % 2 === 1 });
      let sp = '', ss = '';
      for (let y = T + 24; y < -38; y += 7.5) { sp += `M${L} ${f1(y)}H${M}`; ss += `M${M} ${f1(y)}H${R}`; }
      body.push({ s: '@clad.3', w: 0.7, op: 0.5, d: sp, detail: true }, { s: '@side.0', w: 0.6, op: 0.4, d: ss, detail: true });
      // the corner piers and the lit edge
      body.push(['@clad.3', rect(L, T, 3, -T - 34), 0.8], ['@clad.2', rect(M - 3, T, 3, -T - 34), 0.6], ['@side.2', rect(R - 2, T, 2, -T - 34), 0.7]);
      // the crown: the top floors' darker glass band under the roof's edge
      body.push(['@glass.1', rect(L, T + 4, M - L, 13)], ['@side.2', rect(M, T + 4, R - M, 13)], ['@glass.2', rect(L, T + 6, M - L, 3), 0.6]);
      body.push({ s: '@clad.2', w: 0.6, op: 0.6, d: `M${L} ${T + 11}H${R}`, detail: true });
      body.push(['@clad.3', rect(L - 1, T, M - L + 2, 4)], ['@side.1', rect(M, T, R - M + 1, 4)]);
      // the stepped penthouse, then the lattice mast with its two platforms
      body.push(['@clad.1', rect(-30, T - 22, 60, 22)], ['@side.1', rect(30, T - 22, 14, 22)], ['@glass.1', rect(-26, T - 16, 52, 6), 0.7]);
      body.push(['@clad.1', rect(-17, T - 38, 34, 16)], ['@side.1', rect(17, T - 38, 8, 16)], ['@clad.3', rect(-17, T - 38, 34, 2), 0.8]);
      body.push({ s: '@clad.2', w: 0.5, op: 0.5, d: `M-28 ${T - 6}h56M-28 ${T - 3}h56`, detail: true });
      const MT = T - 106;
      body.push(['@mast.1', poly([[-6, T - 38], [-1.2, MT], [1.2, MT], [6, T - 38]])]);
      let lat = ''; for (let y = T - 44; y > MT + 6; y -= 6) { const t = (T - 38 - y) / (T - 38 - MT), w = 6 - 4.8 * t, w2 = 6 - 4.8 * ((T - 38 - y + 6) / (T - 38 - MT)); lat += `M${f1(-w)} ${y}L${f1(w2)} ${y - 6}M${f1(w)} ${y}L${f1(-w2)} ${y - 6}`; }
      body.push({ s: '@mast.0', w: 0.6, op: 0.8, d: lat, detail: true }, ['@mast.0', poly([[-6, T - 38], [-1.2, MT], [-0.2, MT], [-3, T - 38]]), 0.8]);
      body.push(['@mast.1', rect(-7, T - 62, 14, 3)], ['@mast.1', rect(-5, T - 86, 10, 2.4)], ['@mast.0', rect(-7, T - 62, 7, 1.2), 0.8], ['@mast.0', rect(-0.6, MT - 6, 1.2, 6)]);
      // night: floors lit in seeded groups (coarse ribbons, a row every 14 units)
      const cells = [], cellsS = [];
      for (let y = T + 26; y < -44; y += 14) { for (let x = L + 3; x < M - 8; x += 12) cells.push([x, y, 10, 2.6]); cellsS.push([M + 3, y, 8, 2.6], [M + 13, y, 7, 2.6]); }
      sceneDraw.winGroups(r, cells, 16).forEach(d => body.push({ f: '@glass.1', d, op: 0.3, glow: 'window', detail: true }));
      sceneDraw.winGroups(r, cellsS, 6).forEach(d => body.push({ f: '@side.2', d, op: 0.3, glow: 'window', detail: true }));
      body.push({ f: '@podium.2', d: rect(-60, -18, 40, 5) + rect(-14, -18, 30, 5) + rect(22, -18, 38, 5), glow: 'window' });
      // the lit part: the crown band washed in light, the penthouse, the mast's beacons
      lit.push({ f: { lin: [[0, '@crown', 0.75], [1, '@crown', 0.35]], x1: 0, y1: T + 4, x2: 0, y2: T + 17 }, d: rect(L, T + 4, R - L, 13) });
      lit.push({ f: { rad: [[0, '@crown', 0.35], [1, '@crown', 0]], cx: 10, cy: T + 10, r: 70 }, d: rect(-60, T - 60, 140, 110) });
      lit.push(['@warm', rect(-26, T - 16, 52, 6), 0.7], ['@beacon', ell(0, MT - 6, 2.2, 2.2) + ell(0, T - 62, 1.8, 1.8) + ell(0, T - 86, 1.8, 1.8), 0.95]);
      lit.push({ f: { rad: [[0, '@beacon', 0.45], [1, '@beacon', 0]], cx: 0, cy: MT - 6, r: 10 }, d: rect(-10, MT - 16, 20, 20) });
      return { body, lit };
    },
  });
})();
