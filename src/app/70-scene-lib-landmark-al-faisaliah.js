/* ============================================================
   SCENE LIBRARY: landmark.al-faisaliah (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the globe-topped tower beside the sky-bridge tower in the hand-drawn riyadh-skyline
   art (a block with a sphere on its roof), redrawn by hand:
   - the real structure: the 267 m Al Faisaliah Tower in Riyadh, a slender four-sided tower that
     tapers to a point, seen corner-on: two glass faces between the corner columns, banded every few
     floors by its horizontal louvres; above the top floor the corner legs bow out round the gold
     glass globe and meet again in the needle spire; a low podium at its foot
   - lit from the left: the left face in light, the right face in shade, the globe's facets and a
     highlight; the glazing as ribbon windows between the bands
   - night: the globe glowing gold, the spire and the corner edges picked out (the 'lit' part), the
     windows (glow), the aviation light on the spire
   No text, no logos. Anchor: the ground at the corner nearest the viewer.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const H = 267, T = 180, GY = 203, GR = 12, SP = 234;   // the spire tip, the top floor, the globe's centre and radius, the foot of the spire
  const hw = h => 27 - 18 * h / T;   // the half-width of the tower seen corner-on (the corner nearest the viewer at x 0)
  const Z = [0, 30, 60, 90, 120, 150, T];
  define({
    id: 'landmark.al-faisaliah', category: 'landmark', size: [100, 269], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#aabcc0', '#7d959a', '#53686d', '#d2dfe0'], metal: ['#e2e4e2', '#a9adab', '#737977'], gold: ['#ffe39a', '#e0b048', '#a8741e', '#fff6d6'],
      pod: ['#d6ccbc', '#b0a594', '#887e6e'], dark: '#32444a', glowGold: '#ffd070', led: '#f4f0ff', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe6b0' }, on: 0.8 },
    shadow: { rx: 34, ry: 4, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:riyadh', 'asia', 'asia-west', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn riyadh-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const cells = [];
      // the two faces, full height (what a small still keeps): the lit left face and the shaded right face
      body.push({ f: { lin: [[0, '@glass.3'], [1, '@glass.0']], x1: -27, y1: 0, x2: 0, y2: 0 }, d: poly([[-27, 0], [-hw(T), -T], [0, -T], [0, 0]]) },
        { f: { lin: [[0, '@glass.1'], [1, '@glass.2']], x1: 0, y1: 0, x2: 27, y2: 0 }, d: poly([[0, 0], [0, -T], [hw(T), -T], [27, 0]]) });
      for (let i = 0; i < Z.length - 1; i++) {
        const a = Z[i], b = Z[i + 1];
        // each zone's two faces (the glass reflects the sky a little differently zone by zone), their mullions
        body.push({ f: i % 2 ? '@glass.3' : '@glass.0', d: poly([[-hw(a), -a], [-hw(b), -b], [0, -b], [0, -a]]), op: 0.85, detail: true });
        body.push({ f: '@glass.2', d: poly([[0, -a], [0, -b], [hw(b), -b], [hw(a), -a]]), op: i % 2 ? 0.8 : 0.95, detail: true });
        let mu = ''; for (let k = 1; k < 4; k++) { const t = k / 4; mu += `M${f1(-hw(a) * t)} ${-a - 1}L${f1(-hw(b) * t)} ${-b + 1}M${f1(hw(a) * t)} ${-a - 1}L${f1(hw(b) * t)} ${-b + 1}`; }
        body.push({ s: '@glass.2', w: 0.5, op: 0.4, d: mu, detail: true });
        // the sky's reflection on the lit face, a soft streak per zone
        body.push({ f: { lin: [[0, '@glass.3', 0], [0.5, '@glass.3', 0.6], [1, '@glass.3', 0]], x1: -22, y1: 0, x2: -4, y2: 0 }, d: poly([[-hw(a) * 0.78, -a - 1], [-hw(b) * 0.78, -b + 1], [-hw(b) * 0.3, -b + 1], [-hw(a) * 0.3, -a - 1]]), detail: true });
        // the louvre bands every 10 floors-worth, and the ribbon windows between them
        let band = ''; for (let h = a + 10; h <= b; h += 10) band += `M${f1(-hw(h))} ${-h}H${f1(hw(h))}`;
        body.push({ s: '@metal.0', w: 1.6, op: 0.85, d: band, detail: true });
        body.push({ s: '@metal.2', w: 0.6, op: 0.5, d: band.replace(/ (-\d+(?:\.\d+)?)H/g, (_, y) => ` ${f1(+y + 1.4)}H`), detail: true });
        for (let h = a + 5; h < b; h += 10) { const w = hw(h); for (let x = -w + 1.6; x < w - 4; x += 7.4) if (Math.abs(x + 2.5) > 1.6) cells.push([x, -h - 1.3, 5, 2.6]); }
      }
      sceneDraw.winGroups(r, cells, 10).forEach(d => body.push({ f: '@glass.2', d, op: 0.3, glow: 'window', detail: true }));
      // the corner columns: the near corner (in the light), the two outer corners
      body.push(['@metal.0', poly([[-1.4, 0], [-0.8, -T], [0.8, -T], [1.4, 0]]), 0.9]);
      body.push(['@metal.0', poly([[-27, 0], [-hw(T), -T], [-hw(T) + 1.6, -T], [-24.6, 0]])], ['@metal.2', poly([[27, 0], [hw(T), -T], [hw(T) - 1.6, -T], [24.6, 0]])]);
      // the top floor's crown: the observation level under the globe, its glazing
      body.push(['@metal.1', rect(-10, -T - 4, 20, 4)], ['@metal.0', rect(-10.6, -T - 4.8, 21.2, 1.4)], { f: '@dark', d: rect(-8.6, -T - 3.2, 17.2, 1.8), glow: 'window' });
      // the four legs bowing out round the globe and meeting at the spire (two seen), with their inner faces and a brace
      const leg = (sg, k) => `M${f1(sg * 9 * k)} ${-T}Q${f1(sg * 15.5 * k)} ${-GY + 8} ${f1(sg * 14 * k)} ${-GY}Q${f1(sg * 12.5 * k)} ${-GY - 14} ${f1(sg * 1.4 * k)} ${-SP}`;
      body.push({ s: '@metal.2', w: 2.6, d: leg(1, 1) }, { s: '@metal.0', w: 2.6, d: leg(-1, 1) });
      body.push({ s: '@metal.1', w: 1.2, op: 0.8, d: leg(-1, 0.6) });
      body.push({ s: '@metal.1', w: 0.8, op: 0.7, d: `M-12 ${-GY - 9}L12 ${-GY - 9}M-13 ${-GY + 8}L13 ${-GY + 8}`, detail: true });
      // the globe: gold glass, its shaded side, the facets (latitude rings and meridians), the equator band and a highlight
      body.push({ f: { rad: [[0, '@gold.3'], [0.45, '@gold.0'], [1, '@gold.2']], cx: -4, cy: -GY - 4, r: 16 }, d: ell(0, -GY, GR, GR) });
      body.push(['@gold.2', `M0 ${-GY - GR}A${GR} ${GR} 0 0 1 0 ${-GY + GR}A${GR * 0.55} ${GR} 0 0 0 0 ${-GY - GR}z`, 0.45]);
      let lat = ''; for (const k of [-0.66, -0.33, 0.33, 0.66]) { const y = -GY + k * GR, w = GR * Math.sqrt(1 - k * k); lat += `M${f1(-w)} ${f1(y)}Q0 ${f1(y + 1.6)} ${f1(w)} ${f1(y)}`; }
      body.push({ s: '@gold.2', w: 0.5, op: 0.6, d: lat, detail: true });
      let mer = ''; for (const k of [-0.6, -0.25, 0.25, 0.6]) mer += `M0 ${-GY - GR}Q${f1(k * GR * 1.3)} ${-GY} 0 ${-GY + GR}`;
      body.push({ s: '@gold.2', w: 0.5, op: 0.5, d: mer, detail: true });
      body.push({ s: '@gold.1', w: 1.2, op: 0.9, d: `M${-GR} ${-GY}Q0 ${-GY + 2.4} ${GR} ${-GY}` }, ['@gold.3', ell(-4.6, -GY - 5, 3.2, 2.2), 0.7]);
      // the needle spire, its shaded side, the aviation light
      body.push(['@metal.0', poly([[-1.6, -SP], [-0.3, -H], [0.3, -H], [1.6, -SP]])], ['@metal.2', poly([[0, -SP], [0.3, -H], [1.6, -SP]]), 0.6], ['@beacon', ell(0, -H + 6, 0.8, 0.8)]);
      // the podium: a low block either side of the tower's foot, its glazing and the entrance canopy
      body.push(['@pod.1', rect(-48, -12, 21, 12)], ['@pod.2', rect(27, -10, 22, 10)], ['@pod.0', rect(-50, -13.4, 24, 2)], ['@pod.1', rect(26, -11.4, 25, 2)]);
      const pod = []; for (let x = -46; x < -29; x += 4.4) pod.push([x, -9, 3, 4.4]); for (let x = 29; x < 47; x += 4.4) pod.push([x, -7.6, 3, 4]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@dark', d, glow: 'window' }));
      body.push(['@metal.1', rect(-12, -7, 24, 1.6)], ['@dark', rect(-9, -5.4, 18, 5.4), 0.75]);
      // night: the globe aglow, a halo round it, the spire and the corner edges picked out, the crown lit, the aviation light
      lit.push({ f: { rad: [[0, '@gold.3', 0.95], [0.7, '@glowGold', 0.85], [1, '@glowGold', 0.4]], cx: -2, cy: -GY - 2, r: 14 }, d: ell(0, -GY, GR, GR) });
      lit.push({ f: { rad: [[0, '@glowGold', 0.4], [1, '@glowGold', 0]], cx: 0, cy: -GY, r: 28 }, d: ell(0, -GY, 28, 28) });
      lit.push({ s: '@led', w: 1.2, op: 0.75, d: `M-1.2 ${-SP}L0 ${-H + 2}L1.2 ${-SP}` }, { s: '@led', w: 1, op: 0.55, d: `M-27 -2L${-hw(T)} ${-T}M27 -2L${hw(T)} ${-T}M0 -2V${-T}` });
      lit.push({ f: '@led', d: rect(-8.6, -T - 3.2, 17.2, 1.8), op: 0.8 }, { f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -H + 6, r: 3.6 }, d: ell(0, -H + 6, 3.6, 3.6) });
      return { body, lit };
    },
  });
})();
