/* ============================================================
   SCENE LIBRARY: landmark.marina-bay-sands (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Started from `scene upgrade asia-southeast/singapore-skyline --box 470,200,1110,645` (the old art's
   31 shapes gave the silhouette and the proportions), then REDRAWN and refined:
   - the real structure, seen from the bay (the west): three 55-storey hotel towers, each a pair
     of legs that stand together above the middle floors and splay apart below; the SkyPark, a
     long deck with a curved hull underside spanning all three towers, cantilevered at its
     north end (left, from the bay); the low podium along the waterfront; the lotus-shaped
     museum on its own platform in front of the left tower
   - floor bands and window strips on every leg, the rear leg in shade (the sun on the left),
     edge highlights on the lit edges, planting and the pool edge along the SkyPark
   - night: window strips lit in seeded groups (glow), plus the 'lit' part: the SkyPark's LED
     underside line, washes up the tower seams, a warm glow along the podium and the museum's
     white uplight
   No text, no logos. Anchor: the waterline at the middle tower.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  define({
    id: 'landmark.marina-bay-sands', category: 'landmark', size: [760, 420], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      face: ['#e4eaf1', '#cdd6e1', '#f6f9fb'], rear: ['#aab6c6', '#8e9bb0'], band: ['#7f95ad', '#5f7590'], gap: ['#4a5670', '#36405a'],
      deck: ['#eef2f6', '#c4ccd8', '#9aa4b4'], tree: ['#5f8a54', '#3f6a40'], pool: '#7ec4dc', podium: ['#c8d2de', '#9aa8ba', '#6f7f96'],
      lotus: ['#f2f2ee', '#c8ccd0', '#9aa0a8'], led: '#d6f0ff', wash: '#ffe6b8', warm: '#ffcf86',
    } },
    night: { glow: { window: '#ffdc98', lamp: '#fff0c8' }, on: 0.5 },
    shadow: { rx: 120, ry: 5, h: 30 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:singapore', 'asia', 'asia-southeast', 'skyline', 'hotel', 'signature'],
    credit: 'native (scene engine pilot), after the hand-drawn singapore-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const T = -372, J = -205;                     // tower top, the floor where the legs part
      const towers = [-200, -10, 180];
      // the podium along the waterfront (behind the towers' feet): stepped glass roofs
      body.push(['@podium.1', 'M-330 0V-30Q-280 -44 -230 -30Q-170 -46 -110 -30Q-40 -46 30 -30Q100 -46 170 -30Q240 -44 330 -30V0z']);
      body.push(['@podium.0', 'M-330 -30Q-280 -44 -230 -30Q-170 -46 -110 -30Q-40 -46 30 -30Q100 -46 170 -30Q240 -44 330 -30V-26H-330z'], { s: '@podium.2', w: 1, op: 0.45, d: 'M-330 -16H330M-330 -8H330' });
      let pw = ''; for (let x = -324; x < 324; x += 14) pw += rect(x, -22, 9, 7);
      body.push({ f: '@band.1', d: pw, op: 0.75, glow: 'lamp' });
      // three towers, each two legs
      const legEdge = (top, base, y) => (y <= J ? top : top + (base - top) * Math.pow((y - J) / (0 - J), 1.35));

      towers.forEach((cx, ti) => {
        const A = { tl: cx - 44, tr: cx - 1, bl: cx - 68, br: cx - 8 }, B = { tl: cx + 1, tr: cx + 44, bl: cx + 6, br: cx + 66 };
        const legPath = L => `M${f1(L.tl)} ${T}H${f1(L.tr)}V${J}Q${f1(L.tr)} ${f1(J * 0.45)} ${f1(L.br)} 0H${f1(L.bl)}Q${f1(L.tl)} ${f1(J * 0.45)} ${f1(L.tl)} ${J}z`;
        // the gap between the legs below the join (the atrium glass, in shade)
        body.push(['@gap.0', `M${f1(cx - 1)} ${J}Q${f1(cx - 1)} ${f1(J * 0.45)} ${f1(cx - 8)} 0H${f1(cx + 6)}Q${f1(cx + 1)} ${f1(J * 0.45)} ${f1(cx + 1)} ${J}z`]);
        body.push(['@rear.0', legPath(B)], ['@rear.1', `M${f1(B.tr - 9)} ${T}H${f1(B.tr)}V${J}Q${f1(B.tr)} ${f1(J * 0.45)} ${f1(B.br)} 0H${f1(B.br - 12)}Q${f1(B.tr - 9)} ${f1(J * 0.45)} ${f1(B.tr - 9)} ${J}z`, 0.7]);
        body.push(['@face.0', legPath(A)], ['@face.2', `M${f1(A.tl)} ${T}h5V${J}Q${f1(A.tl + 5)} ${f1(J * 0.45)} ${f1(A.bl + 6)} 0h-6Q${f1(A.tl)} ${f1(J * 0.45)} ${f1(A.tl)} ${J}z`, 0.9]);
        body.push(['@face.1', `M${f1(A.tr - 6)} ${T}H${f1(A.tr)}V${J}Q${f1(A.tr)} ${f1(J * 0.45)} ${f1(A.br)} 0h-7Q${f1(A.tr - 6)} ${f1(J * 0.45)} ${f1(A.tr - 6)} ${J}z`, 0.6]);
        // floor bands (day: glass strips; night: lit in groups), every leg
        // each leg's glass strips in three seeded groups: the day glass, and at real dusk each group lights or not
        const grp = [['', '', ''], ['', '', '']];
        for (let y = T + 8; y < -36; y += 8.4) {
          for (const [L, k] of [[A, 0], [B, 1]]) {
            const x0 = legEdge(L.tl, L.bl, y + 3) + 2.5, x1 = legEdge(L.tr, L.br, y + 3) - 2.5;
            if (x1 - x0 < 4) continue;
            grp[k][Math.floor(r() * 3)] += rect(x0, y, x1 - x0, 2.2);
          }
        }
        grp[0].forEach(d => body.push({ f: '@band.0', d, op: 0.55, glow: 'window', detail: true }));
        grp[1].forEach(d => body.push({ f: '@band.1', d, op: 0.6, glow: 'window', detail: true }));
        // a tile shows the legs' floor rhythm as three faint bands (cheap), the detail strips at full size
        body.push(['@band.0', rect(A.tl + 3, T + 60, A.tr - A.tl - 6, 2) + rect(A.tl + 3, T + 140, A.tr - A.tl - 6, 2) + rect(A.tl + 3, J + 30, A.tr - A.tl - 6, 2), 0.35]);
        // vertical mullion lines on the lit leg, fine detail
        let mul = ''; for (let i = 1; i < 5; i++) { const t = i / 5; mul += `M${f1(A.tl + (A.tr - A.tl) * t)} ${T}V${J}`; }
        body.push({ s: '@face.1', w: 0.6, op: 0.6, d: mul, detail: true });
        // the roof plant under the deck and the crown band
        body.push(['@deck.2', rect(cx - 42, T - 4, 86, 5)]);
        // night: a soft wash up the seam of each tower
        lit.push({ f: { lin: [[0, '@wash', 0], [1, '@wash', 0.42]], x1: 0, y1: T, x2: 0, y2: 0 }, d: `M${f1(cx - 10)} ${T}H${f1(cx + 10)}V${J}L${f1(cx + 20)} 0H${f1(cx - 22)}L${f1(cx - 10)} ${J}z` });
      });

      // the SkyPark: a long deck with a hull underside, the cantilever (left, north) lifting at its tip
      const D0 = -312, D1 = 268, top = T - 18;
      body.push(['@deck.1', `M${D0} ${f1(top + 4)}Q${D0 + 30} ${f1(top + 30)} ${D0 + 96} ${f1(top + 22)}L${D1 - 10} ${f1(top + 22)}Q${D1} ${f1(top + 20)} ${D1 + 4} ${f1(top + 12)}V${f1(top + 6)}z`]);
      body.push(['@deck.0', `M${D0 - 6} ${f1(top - 6)}L${D1 + 6} ${f1(top - 2)}V${f1(top + 8)}L${D0 + 4} ${f1(top + 6)}Q${D0 - 4} ${f1(top + 2)} ${D0 - 6} ${f1(top - 6)}z`]);
      body.push(['@deck.2', `M${D0 + 4} ${f1(top + 6)}L${D1 + 6} ${f1(top + 8)}V${f1(top + 10)}L${D0 + 8} ${f1(top + 8)}z`, 0.8]);
      body.push({ s: '@deck.2', w: 0.7, op: 0.5, d: Array.from({ length: 16 }, (_, i) => { const x = D0 + 70 + i * 32; return `M${x} ${f1(top + 9)}L${x + 6} ${f1(top + 21)}`; }).join(''), detail: true });
      // the pool edge (left half) and rooftop planting, pavilions on the deck
      body.push(['@pool', rect(D0 + 40, top - 8, 210, 2.6)], { s: '@deck.0', w: 0.8, d: `M${D0 + 40} ${f1(top - 8)}h210` });
      let trees = ''; for (let i = 0; i < 26; i++) { const x = D0 + 270 + i * 11 + r() * 5; trees += sceneDraw.blob(r, x, top - 9, 5 + r() * 2, 3.6 + r(), 6, 0.3); }
      body.push(['@tree.1', `M${D0 + 268} ${f1(top - 6)}Q${D0 + 420} ${f1(top - 16)} ${D1 - 20} ${f1(top - 6)}z`], { f: '@tree.1', d: trees, detail: true }, { f: '@tree.0', d: trees.split('z').filter((_, i) => i % 2).join('z') + 'z', op: 0.8, detail: true });
      body.push(['@deck.1', rect(D0 + 270, top - 14, 26, 8)], ['@deck.0', rect(D0 + 268, top - 16, 30, 2.5)], ['@deck.1', rect(D1 - 70, top - 13, 40, 7)], ['@deck.0', rect(D1 - 72, top - 15, 44, 2.5)]);
      lit.push({ s: '@led', w: 2.4, op: 0.95, d: `M${D0 + 4} ${f1(top + 7)}L${D1 + 6} ${f1(top + 9)}` }, { s: '@led', w: 6, op: 0.25, d: `M${D0 + 4} ${f1(top + 8)}L${D1 + 6} ${f1(top + 10)}` }, ['@pool', rect(D0 + 40, top - 9, 210, 3.5), 0.9]);
      // the lotus museum in front of the left tower: ten petals rising from a round base, on its platform
      const mx = -390;
      body.push(['@podium.1', rect(mx - 60, -10, 120, 10)], ['@lotus.2', `M${mx - 30} -10Q${mx} -30 ${mx + 30} -10z`]);
      const petals = [[-52, -62, 0.8], [-36, -86, 1], [-16, -100, 0.9], [6, -104, 1], [26, -94, 0.95], [44, -76, 0.85], [58, -56, 0.8]];
      petals.forEach(([dx, dy, k], i) => {
        const bx = mx + dx * 0.25, tipx = mx + dx, tipy = dy;
        body.push([i % 2 ? '@lotus.1' : '@lotus.0', `M${f1(bx - 9)} -20Q${f1(tipx - 12 * k)} ${f1(tipy * 0.55)} ${f1(tipx)} ${f1(tipy)}Q${f1(tipx + 8 * k)} ${f1(tipy * 0.5)} ${f1(bx + 9)} -20z`]);
        body.push({ s: '@lotus.2', w: 0.7, op: 0.5, d: `M${f1(bx)} -22Q${f1((bx + tipx) / 2)} ${f1(tipy * 0.6)} ${f1(tipx)} ${f1(tipy)}`, detail: true });
      });
      body.push(['@lotus.1', `M${mx - 34} -14Q${mx} -42 ${mx + 34} -14z`, 0.9]);
      lit.push({ f: { rad: [[0, '@led', 0.55], [1, '@led', 0]], cx: mx, cy: -50, r: 62 }, d: rect(mx - 70, -120, 140, 120) }, { f: { lin: [[0, '@warm', 0.0], [1, '@warm', 0.5]], x1: 0, y1: -46, x2: 0, y2: 0 }, d: 'M-330 0V-30Q-280 -44 -230 -30Q-170 -46 -110 -30Q-40 -46 30 -30Q100 -46 170 -30Q240 -44 330 -30V0z' });
      // the waterfront promenade edge
      body.push(['@podium.2', rect(-440, -3, 780, 3)]);
      return { body, lit };
    },
  });
})();
