/* ============================================================
   SCENE LIBRARY: landmark.jin-mao (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the stepped tower in the hand-drawn shanghai-skyline art
   (`scene upgrade asia-east/shanghai-skyline --box 600,180,740,645`):
   - the real structure: the 421 m tower of Lujiazui, modelled on a pagoda: a square shaft
     that steps in through a run of setbacks, each tier shorter than the one below with a
     flared ledge at its top, rising into a stepped crown and a slender spire
   - silver-grey metal lattice cladding over grey-green glass, a dense run of vertical fins;
     seen corner-on: the left face in the sun, the right in shade
   - night: the ledges and the crown lit gold-white, the spire's light (the 'lit' part); the
     windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // the tiers: [from, to, half-width at the foot, at the top]; each one shorter and narrower than the last
  const T = [[0, 100, 34, 33], [100, 172, 32, 31], [172, 232, 30, 29], [232, 282, 27.5, 26.5], [282, 322, 25, 24], [322, 352, 22, 21],
    [352, 372, 18.5, 17.5], [372, 386, 15, 14], [386, 396, 11.5, 10.5], [396, 404, 8, 7]];
  define({
    id: 'landmark.jin-mao', category: 'landmark', size: [80, 421], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      metal: ['#d4d8dc', '#a3abb4', '#6e7782'], glass: ['#62727f', '#46535f'], ledge: ['#eef0f2', '#b0b8c0'], base: ['#c2c6ca', '#8e959c'],
      gold: '#ffd890', lightW: '#fff6e0', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe9c0' }, on: 0.78 },
    shadow: { rx: 40, ry: 4, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:shanghai', 'asia', 'asia-east', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn shanghai-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const cells = [];
      // the whole stepped shaft in two faces (what a small still keeps); each tier's own faces carry the detail
      const sun = T.map(([a, b, w0, w1]) => poly([[-w0, -a], [-0.22 * w0, -a], [-0.22 * w1, -b], [-w1, -b]])).join(''), shade = T.map(([a, b, w0, w1]) => poly([[-0.22 * w0, -a], [w0, -a], [w1, -b], [-0.22 * w1, -b]])).join('');
      body.push({ f: { lin: [[0, '@metal.0'], [1, '@glass.0']], x1: -34, y1: 0, x2: -7, y2: 0 }, d: sun }, { f: { lin: [[0, '@glass.1'], [1, '@metal.2']], x1: -7, y1: 0, x2: 34, y2: 0 }, d: shade });
      for (const [a, b, w0, w1] of T) {
        const c0 = -0.22 * w0, c1 = -0.22 * w1, small = a >= 352;
        // the two faces: the sunlit left glass and fins, the shaded right
        body.push({ f: { lin: [[0, '@metal.0'], [1, '@glass.0']], x1: -w0, y1: 0, x2: c0, y2: 0 }, d: poly([[-w0, -a], [c0, -a], [c1, -b], [-w1, -b]]), detail: true });
        body.push({ f: { lin: [[0, '@glass.1'], [1, '@metal.2']], x1: c0, y1: 0, x2: w0, y2: 0 }, d: poly([[c0, -a], [w0, -a], [w1, -b], [c1, -b]]), detail: true });
        // the vertical fins of the cladding (fine: dropped from small stills)
        let fins = '';
        for (let k = 1; k < (small ? 4 : 9); k++) { const t = k / (small ? 4 : 9); fins += `M${f1(-w0 + (w0 + c0) * t)} ${-a - 2}L${f1(-w1 + (w1 + c1) * t)} ${-b + 3}M${f1(c0 + (w0 - c0) * t)} ${-a - 2}L${f1(c1 + (w1 - c1) * t)} ${-b + 3}`; }
        body.push({ s: '@metal.1', w: small ? 0.8 : 1, op: 0.75, d: fins, detail: true });
        // the flared ledge at the tier's top, lit and shaded halves
        const lw = w1 + (small ? 2 : 3);
        body.push(['@ledge.0', poly([[-w1, -b + 2], [c1, -b + 2], [c1, -b - 1.6], [-lw, -b - 1.6]])], ['@ledge.1', poly([[c1, -b + 2], [w1, -b + 2], [lw, -b - 1.6], [c1, -b - 1.6]])]);
        lit.push({ s: '@gold', w: small ? 1.6 : 1.4, op: 0.9, d: `M${f1(-lw)} ${f1(-b - 0.8)}H${f1(lw)}` });
        if (!small) for (let y = a + 7; y < b - 4; y += 14) for (let x = -w0 + 3; x < w0 - 7; x += 9.5) cells.push([x, -y - 3, 7, 2.6]);
      }
      sceneDraw.winGroups(r, cells, 10).forEach(d => body.push({ f: '@glass.0', d, op: 0.35, glow: 'window', detail: true }));
      // the corner: a sunlit edge on the left, the crease between the faces
      body.push({ s: '@ledge.0', w: 1.2, op: 0.7, d: 'M-34 0L-33 -100L-31 -172L-29 -232L-26.5 -282L-24 -322L-21 -352' }, { s: '@metal.2', w: 0.9, op: 0.7, d: 'M-7.5 0L-6.2 -232L-4.6 -352' });
      // the crown: stepped rings above the last tier, then the spire with its own small ledges
      body.push(['@metal.0', rect(-5.6, -410, 8.4, 6)], ['@metal.2', rect(2.8, -410, 2.8, 6)], ['@ledge.0', rect(-7, -411.6, 14, 1.8)]);
      body.push({ f: { lin: [[0, '@ledge.0'], [1, '@metal.2']], x1: -3, y1: 0, x2: 3, y2: 0 }, d: poly([[-3, -411.6], [3, -411.6], [0.5, -421], [-0.5, -421]]) });
      body.push(['@ledge.1', rect(-2.6, -415, 5.2, 1)], ['@beacon', ell(0, -421, 0.9, 0.9)]);
      // the base: the lobby's glass and a low canopy
      body.push(['@base.0', rect(-38, -16, 30, 16)], ['@base.1', rect(-8, -16, 46, 16)], ['@ledge.1', rect(-40, -18, 80, 2.4)]);
      const lob = []; for (let x = -36; x < 36; x += 4) lob.push([x, -13, 3, 9]);
      sceneDraw.winGroups(r, lob, 2).forEach(d => body.push({ f: '@glass.1', d, glow: 'window' }));
      // night: the crown's gold glow, the spire's light, the corner picked out
      lit.push({ f: { rad: [[0, '@gold', 0.55], [1, '@gold', 0]], cx: 0, cy: -392, r: 30 }, d: ell(0, -392, 30, 34) }, { f: '@lightW', d: poly([[-18.5, -352], [-7, -404], [7, -404], [18.5, -352]]), op: 0.3 });
      lit.push({ s: '@lightW', w: 1.4, op: 0.9, d: 'M0 -404V-421' }, { s: '@gold', w: 1, op: 0.35, d: 'M-7.5 -18L-6.2 -232L-4.6 -352' }, { f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -421, r: 4 }, d: ell(0, -421, 4, 4) });
      return { body, lit };
    },
  });
})();
