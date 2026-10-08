/* ============================================================
   SCENE LIBRARY: landmark.taipei-101 (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the stacked tower in the hand-drawn taipei-skyline art
   (`scene upgrade asia-east/taipei-skyline --box 720,10,880,725`; the extraction was only a reference):
   - the real structure: the 508 m tower of Xinyi, a square tower seen corner-on: the base, a
     truncated pyramid that tapers as it rises, a round ornament on its face; then EIGHT stacked
     sections of eight floors each, every one flaring outwards towards its top (wider at the top
     than at the foot, so each sits on the one below with a step in); above them the narrower
     top floors in three steps, the pinnacle's base and the slender spire
   - blue-green glass with pale mullions and a band at each section's top, the double-notched
     corners as a shadowed strip; the left face in the sun, the right in shade; a low podium
   - night: the sections washed in light from their bands upwards, the bands and the spire
     lit (the 'lit' part); the windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // the eight sections: from y 100 to 372, 34 m each; each flares from a half-width of 21.5 at its foot to 26 at its top
  const S = [];
  for (let i = 0; i < 8; i++) S.push([100 + i * 34, 134 + i * 34, 21.5, 26]);
  // the top floors above the sections: [from, to, half-width]
  const TOP = [[372, 394, 19], [394, 414, 15.5], [414, 432, 12]];
  const K = 0.18;   // the crease between the sunlit face (left) and the shaded face (right), as a share of the half-width
  define({
    id: 'landmark.taipei-101', category: 'landmark', size: [66, 508], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#9cc9cc', '#6fa6ac', '#4a8088', '#2f5c66'], band: ['#dfe9e6', '#a9bdbb'], notch: '#26474f', base: ['#b8c6c6', '#8a9c9e', '#5f7276'],
      spire: ['#e4e8ec', '#a8b0b8'], coin: ['#c9d6d2', '#7e9694'], lightW: '#fff4dc', lightG: '#ffe6a8', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#fff0cc' }, on: 0.8 },
    shadow: { rx: 40, ry: 4, h: 70 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:taipei', 'asia', 'asia-east', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn taipei-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      // one tier as two faces: the sunlit left of the crease, the shaded right
      const faces = (a, b, w0, w1) => [poly([[-w0, -a], [K * w0, -a], [K * w1, -b], [-w1, -b]]), poly([[K * w0, -a], [w0, -a], [w1, -b], [K * w1, -b]])];
      // the whole height in two faces (what a small still keeps): the base, the sections and the top floors
      const all = [[0, 100, 31, 25.5]].concat(S, TOP.map(([a, b, w]) => [a, b, w, w]));
      body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -26, y1: 0, x2: 4, y2: 0 }, d: all.map(t => faces(...t)[0]).join('') },
        { f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 4, y1: 0, x2: 26, y2: 0 }, d: all.map(t => faces(...t)[1]).join('') });
      // the base: a truncated pyramid, its corner notches and floor lines, the round ornament on its face
      const [bl, br] = faces(0, 100, 31, 25.5);
      body.push({ f: { lin: [[0, '@base.0'], [1, '@glass.1']], x1: -31, y1: 0, x2: 5, y2: 0 }, d: bl, detail: true }, { f: { lin: [[0, '@glass.2'], [1, '@base.2']], x1: 5, y1: 0, x2: 31, y2: 0 }, d: br, detail: true });
      let fl = '';
      for (let y = 12; y < 98; y += 8.6) { const w = 31 - 5.5 * y / 100; fl += `M${f1(-w)} ${f1(-y)}H${f1(w)}`; }
      body.push({ s: '@band.1', w: 0.5, op: 0.45, d: fl, detail: true });
      body.push({ s: '@notch', w: 1.6, op: 0.7, d: `M${f1(-28)} 0L${f1(-23)} -100M${f1(K * 31 + 1)} 0L${f1(K * 25.5 + 1)} -100`, detail: true });
      const cx = -11.5, cy = -88;
      body.push(['@coin.1', ell(cx, cy, 6.4, 6.4)], ['@coin.0', ell(cx, cy, 5.2, 5.2) + rect(cx - 1.6, cy - 1.6, 3.2, 3.2)], { s: '@coin.1', w: 0.7, d: ell(cx, cy, 3.6, 3.6), detail: true });
      // the eight sections: two faces each (detail), mullions and floor lines, the notch, the band at the top
      S.forEach(([a, b, w0, w1], i) => {
        const [l, rr] = faces(a, b, w0, w1);
        body.push({ f: { lin: [[0, '@glass.0'], [0.7, '@glass.1'], [1, '@glass.2']], x1: 0, y1: -b, x2: 0, y2: -a }, d: l, detail: true },
          { f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 0, y1: -b, x2: 0, y2: -a }, d: rr, detail: true });
        let mu = '';
        for (let k = 1; k < 7; k++) { const t = k / 7; mu += `M${f1(-w0 + (K * w0 + w0) * t)} ${-a - 1}L${f1(-w1 + (K * w1 + w1) * t)} ${-b + 1}`; }
        for (let k = 1; k < 4; k++) { const t = k / 4; mu += `M${f1(K * w0 + (w0 - K * w0) * t)} ${-a - 1}L${f1(K * w1 + (w1 - K * w1) * t)} ${-b + 1}`; }
        let fy = ''; for (let k = 1; k < 8; k++) { const y = a + k * 4.25, w = w0 + (w1 - w0) * k / 8; fy += `M${f1(-w)} ${f1(-y)}H${f1(w)}`; }
        body.push({ s: '@band.1', w: 0.5, op: 0.45, d: mu + fy, detail: true });
        // the double-notched corners: a shadowed strip at the left edge and at the crease
        body.push({ s: '@notch', w: 1.4, op: 0.65, d: `M${f1(-w0 + 2.6)} ${-a}L${f1(-w1 + 2.6)} ${-b}M${f1(K * w0 + 1)} ${-a}L${f1(K * w1 + 1)} ${-b}`, detail: true });
        // the band at the section's top: a pale ledge (lit and shaded halves); at night a line of light and a wash up the section
        body.push(['@band.0', poly([[-w1 - 0.6, -b + 1.8], [K * w1, -b + 1.8], [K * w1, -b - 0.8], [-w1 - 0.6, -b - 0.8]])], ['@band.1', poly([[K * w1, -b + 1.8], [w1 + 0.6, -b + 1.8], [w1 + 0.6, -b - 0.8], [K * w1, -b - 0.8]])]);
        lit.push({ s: '@lightG', w: 1.3, op: 0.9, d: `M${f1(-w1 - 0.6)} ${f1(-b + 0.5)}H${f1(w1 + 0.6)}` });
        lit.push({ f: { lin: [[0, '@lightG', 0.34], [1, '@lightG', 0]], x1: 0, y1: -b, x2: 0, y2: -a }, d: poly([[-w0, -a], [w0, -a], [w1, -b], [-w1, -b]]), detail: i % 2 === 1 });
        // ribbon windows: two rows per section
        for (const y of [a + 9, a + 23]) { const w = w0 + (w1 - w0) * (y - a) / 34; for (let x = -w + 3; x < w - 9; x += 12.5) cells.push([x, -y - 1.3, 9, 2.6]); }
      });
      sceneDraw.winGroups(r, cells, 10).forEach(d => body.push({ f: '@glass.3', d, op: 0.3, glow: 'window', detail: true }));
      // the top floors in three steps, each with its ledge, then the pinnacle's base and the spire
      TOP.forEach(([a, b, w]) => {
        const [l, rr] = faces(a, b, w, w);
        body.push({ f: '@glass.1', d: l, detail: true }, { f: '@glass.3', d: rr, detail: true });
        body.push(['@band.0', rect(-w - 0.6, -b - 0.8, w + K * w + 0.6, 2.4)], ['@band.1', rect(K * w, -b - 0.8, w - K * w + 0.6, 2.4)]);
        body.push({ s: '@band.1', w: 0.5, op: 0.45, d: `M${f1(-w)} ${f1(-a - (b - a) / 2)}H${f1(w)}M${f1(-w / 3)} ${-a}V${-b}M${f1(-2 * w / 3)} ${-a}V${-b}`, detail: true });
        lit.push({ s: '@lightG', w: 1.1, op: 0.85, d: `M${f1(-w - 0.6)} ${f1(-b + 0.4)}H${f1(w + 0.6)}` });
      });
      body.push({ f: { lin: [[0, '@spire.0'], [1, '@spire.1']], x1: -9, y1: 0, x2: 9, y2: 0 }, d: poly([[-9, -432], [9, -432], [4.5, -449], [-4.5, -449]]) });
      body.push(['@spire.1', poly([[1.5, -432], [9, -432], [4.5, -449], [0.8, -449]]), 0.6], { s: '@spire.1', w: 0.5, op: 0.6, d: 'M-7 -437H7M-5.8 -442H5.8', detail: true });
      body.push({ f: { lin: [[0, '@spire.0'], [1, '@spire.1']], x1: -2, y1: 0, x2: 2, y2: 0 }, d: poly([[-2, -449], [2, -449], [0.6, -506], [-0.6, -506]]) });
      body.push({ s: '@spire.1', w: 0.5, op: 0.7, d: 'M-1.7 -462H1.7M-1.4 -476H1.4M-1.1 -490H1.1', detail: true }, ['@beacon', ell(0, -507, 0.9, 0.9)]);
      // the podium: a low block with its lobby glass and canopy
      body.push(['@base.1', rect(-44, -14, 50, 14)], ['@base.2', rect(6, -14, 38, 14)], ['@band.0', rect(-46, -15.6, 92, 2)]);
      const pod = []; for (let x = -42; x < 42; x += 4.2) pod.push([x, -11, 3, 7]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@glass.3', d, glow: 'window' }));
      // the sunlit edge of the left face
      body.push({ s: '@glass.0', w: 1, op: 0.8, d: 'M-31 0L-25.5 -100' + S.map(([a, b, w0, w1]) => `M${f1(-w0)} ${-a}L${f1(-w1)} ${-b}`).join('') });
      // night: the spire and its base in white light, the beacon
      lit.push({ f: { lin: [[0, '@lightW', 0.25], [1, '@lightW', 0.7]], x1: 0, y1: -432, x2: 0, y2: -449 }, d: poly([[-9, -432], [9, -432], [4.5, -449], [-4.5, -449]]) });
      lit.push({ s: '@lightW', w: 1.2, op: 0.85, d: 'M0 -449V-505' }, { f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -507, r: 4 }, d: ell(0, -507, 4, 4) });
      lit.push({ f: { rad: [[0, '@lightG', 0.5], [1, '@lightG', 0]], cx: cx, cy: cy, r: 9 }, d: ell(cx, cy, 9, 9) });
      return { body, lit };
    },
  });
})();
