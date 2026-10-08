/* ============================================================
   SCENE LIBRARY: landmark.devon-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Devon Energy Center tower, downtown Oklahoma City (50 storeys, the city's tallest). Drawn by
   hand after its form:
   - a slender prism of pale blue-grey glass: the lit broad face and a narrow shaded side, slim
     vertical mullions and the floor lines, the sky's light sliding down the glass
   - the crown: the faces lean in over the top floors and the glass rises past the roof as a
     screen of fins, cut on a slant (higher on the right)
   - at the foot the glass rotunda (a drum under a shallow dome) on the left and the low podium
     on the right
   - night: floors lit in seeded groups (coarse ribbons, glow); the 'lit' part: the crown's
     light, the slanted top edge, the rotunda's warm glass and the aviation lights
   No text, no logos. Anchor: the ground at the middle of the tower's broad face.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const L = -46, M = 40, R = 58, Y0 = -470;       // the broad face from L to M, the side to R, where the crown begins
  const TL = [-36, -522], TR = [36, -552];        // the slanted top, left and right
  const topY = x => f1(TL[1] + (TR[1] - TL[1]) * (x - TL[0]) / (TR[0] - TL[0]));
  define({
    id: 'landmark.devon-tower', category: 'landmark', size: [240, 560], box: [-122, -560, 126, 2], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#b4cfe2', '#86aac6', '#5c82a4', '#3e6284'], side: ['#6a8aa6', '#4a6a88', '#33506c'], mull: ['#dceaf4', '#9ab4c8'],
      base: ['#c8ccd0', '#9aa0a6', '#6a7076'], rot: ['#9cc0d8', '#6a92b2'], crown: '#e8f4ff', warm: '#ffdca0', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#fff0c8' }, on: 0.55 },
    shadow: { rx: 90, ry: 6, h: 90 },
    reflect: true,
    tags: ['landmark', 'place:us/place:oklahoma-city', 'us', 'us-mountain', 'skyline', 'skyscraper'],
    credit: 'native, drawn for the composed oklahoma-city-skyline-wheel scene (after the hand-drawn art)',
    build(v, r) {
      const body = [], lit = [];
      // the broad face and the shaded side, crown included (one shape each for the tile)
      const face = `M${L} 0V${Y0}Q${L} -500 ${TL[0]} ${TL[1]}L${TR[0]} ${TR[1]}Q${M} -500 ${M} ${Y0}V0z`;
      body.push({ f: { lin: [[0, '@glass.0'], [0.45, '@glass.1'], [1, '@glass.2']], x1: 0, y1: TR[1], x2: 0, y2: 0 }, d: face });
      body.push({ f: { lin: [[0, '@side.0'], [1, '@side.2']], x1: 0, y1: TR[1], x2: 0, y2: 0 }, d: `M${M} 0V${Y0}Q${M} -500 ${TR[0]} ${TR[1]}L${R - 6} -546Q${R} -500 ${R} ${Y0}V0z` });
      // the glass in vertical strips between the mullions, each its own (the light plays on them a little differently)
      for (let x = L + 4, k = 0; x < M - 4; x += 6, k++) {
        const top = x < TL[0] ? -500 : Math.min(-480, topY(x) + 6);
        body.push({ f: k % 3 === 1 ? '@glass.3' : '@glass.2', d: rect(x, top, 2.4, -top - 46), op: 0.22 + (k % 4) * 0.05, detail: k % 2 === 1 });
      }
      for (let x = M + 3, k = 0; x < R - 2; x += 5, k++) body.push({ f: '@side.2', d: rect(x, -490, 2, 444), op: 0.4, detail: true });
      // the floor lines, the spandrel bands every few floors, the lit corner
      let fl = '', fs = '';
      for (let y = -56; y > -476; y -= 10.5) { fl += `M${L} ${f1(y)}H${M}`; fs += `M${M} ${f1(y)}H${R}`; }
      body.push({ s: '@mull.1', w: 0.5, op: 0.45, d: fl, detail: true }, { s: '@side.0', w: 0.5, op: 0.35, d: fs, detail: true });
      for (const y of [-140, -248, -356, -458]) body.push(['@mull.0', rect(L, y, M - L, 2.4), 0.5]);
      body.push(['@mull.0', rect(L, -500, 2.6, 454), 0.75], ['@side.2', rect(R - 2, -490, 2, 444), 0.7], ['@mull.1', rect(M - 1.5, -490, 2, 444), 0.6]);
      // the sky's light sliding down the glass
      body.push(['@mull.0', poly([[L, -420], [-8, -500], [6, -500], [L, -380]]), 0.18], ['@mull.0', poly([[L, -250], [M, -330], [M, -300], [L, -220]]), 0.12]);
      // the crown: the screen of fins rising past the roof, the leaning faces' edges
      for (let x = TL[0] + 6, k = 0; x < TR[0]; x += 8, k++) body.push({ s: k % 2 ? '@mull.1' : '@mull.0', w: 1.4, op: 0.8, d: `M${x} ${topY(x)}V${f1(topY(x) + 34)}`, detail: true });
      body.push({ s: '@mull.0', w: 1.8, d: `M${TL[0]} ${TL[1]}L${TR[0]} ${TR[1]}` }, { s: '@mull.1', w: 1, op: 0.8, d: `M${L} ${Y0}Q${L} -500 ${TL[0]} ${TL[1]}M${M} ${Y0}Q${M} -500 ${TR[0]} ${TR[1]}`, detail: true });
      body.push({ s: '@side.0', w: 0.8, op: 0.6, d: `M${L} -476H${M}`, detail: true }, ['@glass.0', poly([[TL[0], TL[1]], [TR[0], TR[1]], [TR[0] - 2, TR[1] + 10], [TL[0] + 2, TL[1] + 8]]), 0.5]);
      // the foot: the podium (right), the glass rotunda with its shallow dome (left), the entrance canopy
      body.push(['@base.1', rect(M, -44, 82, 44)], ['@base.0', rect(M, -48, 84, 5)], ['@base.2', rect(M + 78, -44, 6, 44), 0.6]);
      body.push(['@side.2', rect(M + 6, -38, 70, 10) + rect(M + 6, -22, 70, 10), 0.8], { s: '@base.2', w: 0.8, op: 0.5, d: `M${M + 20} -44V0M${M + 40} -44V0M${M + 60} -44V0`, detail: true });
      body.push({ f: { lin: [[0, '@rot.0'], [1, '@rot.1']], x1: 0, y1: -60, x2: 0, y2: 0 }, d: rect(-118, -58, 76, 58) }, ['@base.0', 'M-122 -58Q-80 -82 -38 -58z'], ['@base.1', rect(-122, -60, 84, 3)]);
      let rib = ''; for (let x = -112; x < -42; x += 8) rib += `M${x} -57V0`;
      body.push({ s: '@base.0', w: 0.8, op: 0.7, d: rib, detail: true }, { s: '@base.1', w: 0.6, op: 0.6, d: 'M-118 -40H-42M-118 -20H-42M-110 -64Q-80 -78 -50 -64', detail: true });
      body.push(['@base.2', rect(-30, -14, 50, 14), 0.8], ['@base.0', rect(-34, -18, 58, 4)], ['@base.0', rect(-124, -3, 250, 3)]);
      // night: floors lit in seeded groups (coarse ribbons, a row every 14 units), the rotunda and the podium
      const cells = [], cellsS = [];
      for (let y = -60; y > -470; y -= 14) { for (let x = L + 3; x < M - 8; x += 12) cells.push([x, y, 10, 2.6]); cellsS.push([M + 3, y, 6, 2.6], [M + 11, y, 5, 2.6]); }
      sceneDraw.winGroups(r, cells, 14).forEach(d => body.push({ f: '@glass.3', d, op: 0.3, glow: 'window', detail: true }));
      sceneDraw.winGroups(r, cellsS, 5).forEach(d => body.push({ f: '@side.2', d, op: 0.3, glow: 'window', detail: true }));
      body.push({ f: '@side.2', d: rect(M + 6, -38, 70, 10) + rect(-112, -50, 64, 44), op: 0.3, glow: 'window' });
      // the lit part: the crown's light, the slanted edge, the rotunda's warm glass, the aviation lights
      lit.push({ f: { lin: [[0, '@crown', 0.75], [1, '@crown', 0.1]], x1: 0, y1: TR[1], x2: 0, y2: -470 }, d: `M${L} -470Q${L} -500 ${TL[0]} ${TL[1]}L${TR[0]} ${TR[1]}Q${M} -500 ${M} -470z` });
      lit.push({ s: '@crown', w: 2.2, op: 0.95, d: `M${TL[0]} ${TL[1]}L${TR[0]} ${TR[1]}` }, { s: '@crown', w: 9, op: 0.18, d: `M${TL[0]} ${TL[1]}L${TR[0]} ${TR[1]}` });
      lit.push({ f: { lin: [[0, '@warm', 0.2], [1, '@warm', 0.6]], x1: 0, y1: -60, x2: 0, y2: 0 }, d: rect(-118, -58, 76, 58) });
      lit.push(['@beacon', ell(TR[0] - 2, TR[1] - 3, 2.2, 2.2) + ell(TL[0] + 2, TL[1] - 3, 1.8, 1.8), 0.95], { f: { rad: [[0, '@beacon', 0.45], [1, '@beacon', 0]], cx: TR[0] - 2, cy: TR[1] - 3, r: 10 }, d: rect(TR[0] - 12, TR[1] - 13, 20, 20) });
      return { body, lit };
    },
  });
})();
