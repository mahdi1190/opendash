/* ============================================================
   SCENE LIBRARY: landmark.supertrees (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Supertree Grove of the bay gardens, refined from the hand-drawn singapore-skyline art:
   - the real structure: tall planted columns (a concrete core clad in planting panels, inside
     a steel frame) that flare at the top into wide open canopies, the canopy a lattice of ribs
     and rings; a high walkway slung between two of the tallest
   - seven trees of the grove's different heights, the planting panels in greens and violets,
     the steel lattice in grey, shaded on the right (the sun on the left)
   - night: the 'lit' part: the canopies and trunks glow violet, magenta and teal, the walkway
     carries a line of lights; small lamps along the canopy rims are glow shapes
   No text, no logos. Anchor: the ground at the middle of the grove.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, define } = sceneDraw;
  define({
    id: 'landmark.supertrees', category: 'landmark', size: [380, 190], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#8a7f9a', '#5e5670', '#b8b0c8'], plant: ['#4f7a4a', '#7a9a50', '#8a5a9a', '#3a5a3a'], core: ['#6a6278', '#4a4458'],
      canopy: ['#7a6a92', '#4e4466'], walk: ['#d8d4e0', '#9a94a8'], glowV: '#c070ff', glowM: '#ff5ab4', glowT: '#40e0d0', lamp: '#ffd6f4',
    } },
    night: { glow: { lamp: '#ffd0f0', window: '#ffe0a0' }, on: 0.85 },
    shadow: { rx: 80, ry: 4, h: 30 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:singapore', 'asia', 'asia-southeast', 'garden', 'supertrees'],
    credit: 'native (scene engine pilot), after the hand-drawn singapore-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const trees = [[-160, 118], [-104, 150], [-40, 188], [24, 132], [78, 176], [130, 104], [172, 140]];
      const glows = ['@glowV', '@glowM', '@glowT'];
      let lamps = ['', '', ''];
      // the high walkway between the two tallest, drawn behind them
      const wy = -112;
      body.push({ s: '@walk.1', w: 3, d: `M-40 ${wy}Q19 ${wy + 12} 78 ${wy - 2}` }, { s: '@walk.0', w: 1.2, d: `M-40 ${wy - 3}Q19 ${wy + 9} 78 ${wy - 5}` }, { s: '@walk.1', w: 0.6, op: 0.7, d: Array.from({ length: 9 }, (_, i) => { const x = -34 + i * 13; return `M${x} ${f1(wy + 4)}v-5`; }).join('') });
      lit.push({ s: '@lamp', w: 1.6, op: 0.9, d: `M-40 ${wy - 1}Q19 ${wy + 11} 78 ${wy - 3}` });
      trees.forEach(([x, h], i) => {
        const cw = h * 0.5, ct = -h, cb = -h * 0.66, tw = 4 + h * 0.025;
        // the trunk: a slightly tapering column with planting panels and a diagonal steel lattice
        body.push(['@core.0', `M${f1(x - tw)} 0L${f1(x - tw * 0.7)} ${f1(cb)}H${f1(x + tw * 0.7)}L${f1(x + tw)} 0z`]);
        let panels = ['', '', ''];
        for (let y = -6; y > cb + 6; y -= 7) for (let k = 0; k < 2; k++) panels[Math.floor(r() * 3)] += ell(x - tw * 0.4 + k * tw * 0.8 + (r() - 0.5) * 2, y + r() * 3, 1.8 + r(), 2.6 + r());
        body.push({ f: '@plant.0', d: panels[0], detail: true }, { f: '@plant.1', d: panels[1], detail: true }, { f: '@plant.2', d: panels[2], detail: true });
        let lat = '';
        for (let y = 0; y > cb; y -= 10) lat += `M${f1(x - tw)} ${f1(y)}L${f1(x + tw)} ${f1(y - 10)}M${f1(x + tw)} ${f1(y)}L${f1(x - tw)} ${f1(y - 10)}`;
        body.push({ s: '@steel.0', w: 0.7, op: 0.85, d: lat, detail: true }, ['@core.1', `M${f1(x + tw * 0.2)} 0L${f1(x + tw * 0.14)} ${f1(cb)}H${f1(x + tw * 0.7)}L${f1(x + tw)} 0z`, 0.55]);
        // the canopy: a flared funnel (filled faintly, it is an open frame), ribs and rings, the rim seen from below
        const funnel = `M${f1(x - tw * 0.7)} ${f1(cb)}Q${f1(x - cw * 0.25)} ${f1(cb - h * 0.12)} ${f1(x - cw)} ${f1(ct)}Q${f1(x)} ${f1(ct + h * 0.06)} ${f1(x + cw)} ${f1(ct)}Q${f1(x + cw * 0.25)} ${f1(cb - h * 0.12)} ${f1(x + tw * 0.7)} ${f1(cb)}z`;
        body.push(['@canopy.0', funnel, 0.55], ['@canopy.1', `M${f1(x)} ${f1(cb)}Q${f1(x + cw * 0.25)} ${f1(cb - h * 0.12)} ${f1(x + cw)} ${f1(ct)}Q${f1(x + cw * 0.5)} ${f1(ct + h * 0.05)} ${f1(x)} ${f1(ct + h * 0.06)}z`, 0.45]);
        let ribs = '';
        for (let k = -4; k <= 4; k++) { const t = k / 4; ribs += `M${f1(x + t * tw * 0.6)} ${f1(cb)}Q${f1(x + t * cw * 0.35)} ${f1(cb - h * 0.14)} ${f1(x + t * cw)} ${f1(ct + Math.abs(t) * 0 + h * 0.06 * (1 - t * t))}`; }
        body.push({ s: '@steel.0', w: 0.8, d: ribs, detail: true }, { s: '@steel.0', w: 0.9, d: `M${f1(x)} ${f1(cb)}L${f1(x - cw * 0.8)} ${f1(ct + h * 0.03)}M${f1(x)} ${f1(cb)}L${f1(x + cw * 0.8)} ${f1(ct + h * 0.03)}` });
        const rings = [0.45, 0.75].map(k => { const yy = cb + (ct - cb) * k, rx = tw + (cw - tw) * Math.pow(k, 1.6); return ell(x, yy, rx, rx * 0.08); }).join('');
        body.push({ s: '@steel.2', w: 0.8, op: 0.7, d: rings, detail: true }, { s: '@steel.2', w: 1.4, d: ell(x, ct + h * 0.03, cw, cw * 0.08) });
        // planting spilling over the rim
        let rim = ''; for (let k = 0; k < 7; k++) { const t = -0.9 + k * 0.3; rim += sceneDraw.blob(r, x + t * cw, ct + h * 0.03 + Math.abs(t) * -1, 3 + r() * 2, 2.4 + r(), 6, 0.35); }
        body.push({ f: '@plant.3', d: rim, detail: true }, { s: '@plant.3', w: 3, d: `M${f1(x - cw * 0.95)} ${f1(ct + h * 0.03)}Q${f1(x)} ${f1(ct + h * 0.08)} ${f1(x + cw * 0.95)} ${f1(ct + h * 0.03)}` }, { f: '@plant.0', d: rim.split('z').filter((_, j) => j % 2).join('z') + 'z', op: 0.8, detail: true });
        // rim lamps (glow): six points round the canopy edge, in three groups
        for (let k = 0; k < 6; k++) { const a = (k + 0.5) / 6 * Math.PI; lamps[k % 3] += ell(x - Math.cos(a) * cw * 0.95, ct + h * 0.03 + Math.sin(a) * cw * 0.07, 1.1, 1.1); }
        // night: the canopy and trunk glow in one of three colours
        const gc = glows[i % 3];
        lit.push({ f: { rad: [[0, gc, 0.75], [1, gc, 0.12]], cx: x, cy: ct + h * 0.1, r: cw }, d: funnel }, { s: gc, w: 1.6, op: 0.95, d: ell(x, ct + h * 0.03, cw, cw * 0.08) },
          { f: { lin: [[0, gc, 0.6], [1, gc, 0.15]], x1: 0, y1: cb, x2: 0, y2: 0 }, d: `M${f1(x - tw)} 0L${f1(x - tw * 0.7)} ${f1(cb)}H${f1(x + tw * 0.7)}L${f1(x + tw)} 0z` });
      });
      lamps.forEach(d => body.push({ f: '@walk.0', d, op: 0.5, glow: 'lamp' }));
      // the garden floor: low planting along the base
      let floor = ''; for (let x = -190; x < 200; x += 9) floor += sceneDraw.blob(r, x + r() * 4, -3, 6 + r() * 3, 4 + r() * 2, 6, 0.4);
      body.push({ f: '@plant.3', d: floor, detail: true }, ['@plant.3', 'M-196 0V-5Q0 -9 200 -5V0z'], ['@plant.0', rect(-196, -2, 396, 2)]);
      return { body, lit };
    },
  });
})();
