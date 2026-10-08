/* ============================================================
   SCENE LIBRARY: landmark.petronas-towers (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the twin towers in the hand-drawn kuala-lumpur-skyline art
   (`scene upgrade asia-southeast/kuala-lumpur-skyline --box 620,60,980,705`):
   - the real structure: two identical 452 m towers about 46 m across, 58 m apart, each on the
     plan of an eight-pointed star with round lobes between the points (so the faces read as
     many narrow vertical facets); the shaft rises straight to its first setback and then steps in
     five more times before the roof; on the top a pinnacle of stacked drums, a ring ball, a mast
     ball and the needle; the two-storey sky bridge 170 m up, carried by a two-hinged arch whose
     legs bear on the towers lower down
   - the facade of stainless steel and ribbon glass: a floor-by-floor band pattern, the round
     towers lit on the left and turning into shade on the right
   - night: the towers floodlit silver-white, the facets traced in light, the pinnacles bright,
     the bridge glowing (the 'lit' part); the windows (glow); the red lights on the needles
   No text, no logos. Anchor: the ground at the middle, between the towers.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const CX = [-52, 52];
  // the tiers: [from, to, half-width]; the roof at 377 m, the needle's tip at 452 m
  const TIERS = [[0, 252, 23], [252, 307, 20.5], [307, 345, 17.5], [345, 357, 14.5], [357, 368, 12], [368, 377, 9.5]];
  const FACETS = 8;
  define({
    id: 'landmark.petronas-towers', category: 'landmark', size: [150, 452], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#eef2f6', '#c8d0da', '#97a3b1', '#6c7887'], glass: ['#5c6a7c', '#3e4a5a'], pin: ['#e4e9ef', '#a9b3bf'],
      lightW: '#f6f9ff', lightC: '#d8e4ff', beacon: '#ff4636',
    } },
    night: { glow: { window: '#fff2d2' }, on: 0.8 },
    shadow: { rx: 80, ry: 6, h: 90 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:kuala-lumpur', 'asia', 'asia-southeast', 'skyscraper', 'twin'],
    credit: 'native (scene engine upgrade), after the hand-drawn kuala-lumpur-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      // a round tier as a face: lit at a third from the left, dark at the right edge
      const shade = (cx, hw) => ({ lin: [[0, '@steel.1'], [0.3, '@steel.0'], [0.72, '@steel.2'], [1, '@steel.3']], x1: cx - hw, y1: 0, x2: cx + hw, y2: 0 });
      for (const cx of CX) {
        TIERS.forEach(([a, b, hw], ti) => {
          // the tier's face, its top rim a shallow arc (seen from below)
          body.push({ f: shade(cx, hw), d: `M${f1(cx - hw)} ${-a}V${-b}Q${cx} ${f1(-b - hw * 0.14)} ${f1(cx + hw)} ${-b}V${-a}z` });
          // the facets of the star plan: edges bunching towards the sides of the round tower, alternate facets shaded
          let edges = '', dark = '';
          for (let k = 1; k < FACETS * 2; k++) {
            const x = cx - hw * Math.cos(Math.PI * k / (FACETS * 2)), x2 = cx - hw * Math.cos(Math.PI * (k + 1) / (FACETS * 2));
            edges += `M${f1(x)} ${-a}V${-b}`;
            if (k % 2 && k < FACETS * 2 - 1) dark += rect(x, -b, x2 - x, b - a);
          }
          body.push({ s: '@steel.3', w: 0.6, op: 0.55, d: edges, detail: true }, { f: '@steel.2', d: dark, op: 0.28, detail: true });
          // the floor bands (stainless sunshades over ribbon glass), every two floors
          let bands = '';
          for (let h = a + 8.4; h < b - 2; h += 8.4) bands += `M${f1(cx - hw + 0.6)} ${f1(-h)}H${f1(cx + hw - 0.6)}`;
          body.push({ s: '@glass.0', w: 1.4, op: 0.42, d: bands, detail: true });
          // the setback ledge at the tier's top, with its row of small pinnacles
          if (ti > 0) {
            const lw = TIERS[ti - 1][2] + 0.8;
            body.push(['@pin.0', rect(cx - lw, -a - 1.8, 2 * lw, 2.2)]);
            let sp = '';
            for (let x = cx - lw + 1.5; x < cx + lw - 1; x += 3.4) sp += `M${f1(x)} ${f1(-a - 1.8)}L${f1(x + 0.6)} ${f1(-a - 6.5)}L${f1(x + 1.2)} ${f1(-a - 1.8)}z`;
            body.push({ f: '@pin.1', d: sp, detail: true });
          }
          // the ribbon windows: each row in three runs across the face (one glow group each)
          for (let h = a + 7; h < b - 4; h += 14) for (let k = 0; k < 3; k++) cells.push([cx - hw + 2 + k * (2 * hw - 4) / 3, -h - 2.6, (2 * hw - 4) / 3 - 1.2, 2.6]);
          lit.push({ f: { lin: [[0, '@lightW', 0.55], [0.4, '@lightC', 0.3], [1, '@lightW', 0.12]], x1: cx - hw, y1: 0, x2: cx + hw, y2: 0 }, d: rect(cx - hw, -b, 2 * hw, b - a) });
          lit.push({ s: '@lightW', w: 0.6, op: 0.5, d: edges, detail: true });
        });
        // the edges of the shaft: a bright rim on the sunlit left, a dark one on the right
        body.push({ s: '@steel.0', w: 1.2, op: 0.8, d: `M${cx - 23} 0V-252` }, { s: '@steel.3', w: 1.2, op: 0.8, d: `M${cx + 23} 0V-252` });
        // the pinnacle: two drums, the spire's base, the ring ball, the mast ball and the needle
        body.push(['@pin.0', rect(cx - 7, -384, 7, 7)], ['@pin.1', rect(cx, -384, 7, 7)], ['@pin.0', rect(cx - 5, -391, 5, 7)], ['@pin.1', rect(cx, -391, 5, 7)]);
        body.push(['@pin.0', rect(cx - 7.8, -385, 15.6, 1.4)], ['@pin.0', rect(cx - 5.8, -392, 11.6, 1.4)]);
        let ribs = '';
        for (let x = cx - 6; x <= cx + 6; x += 2) ribs += `M${x} -377.4V-383.6`;
        for (let x = cx - 4; x <= cx + 4; x += 2) ribs += `M${x} -384.4V-390.6`;
        body.push({ s: '@steel.2', w: 0.6, op: 0.8, d: ribs, detail: true });
        body.push(['@pin.0', poly([[cx - 3, -391], [cx, -391], [cx, -404], [cx - 2.2, -404]])], ['@pin.1', poly([[cx, -391], [cx + 3, -391], [cx + 2.2, -404], [cx, -404]])]);
        body.push({ s: '@pin.0', w: 1.1, d: ell(cx, -405, 4.4, 1.5) }, ['@pin.0', poly([[cx - 1.6, -404], [cx + 1.6, -404], [cx + 0.35, -452], [cx - 0.35, -452]])], ['@pin.1', poly([[cx, -404], [cx + 1.6, -404], [cx + 0.35, -452], [cx, -452]])]);
        body.push(['@pin.0', ell(cx, -418, 2.7, 2.7)], ['@pin.1', `M${cx} -420.7a2.7 2.7 0 0 1 0 5.4z`, 0.9], { s: '@pin.1', w: 0.7, d: `M${cx - 1.2} -431H${cx + 1.2}M${cx - 0.9} -440H${cx + 0.9}` });
        body.push(['@beacon', ell(cx, -452.4, 0.8, 0.8)], ['@beacon', ell(cx, -379, 0.8, 0.8), 0.9]);
        // night: the pinnacle floodlit, the needle and the beacons
        lit.push({ f: '@lightW', d: rect(cx - 7, -391, 14, 14), op: 0.75 }, { s: '@lightW', w: 1.3, op: 0.9, d: `M${cx} -391V-450` + ell(cx, -405, 4.4, 1.5) }, ['@lightW', ell(cx, -418, 2.7, 2.7), 0.9]);
        lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx, cy: -452.4, r: 4.5 }, d: ell(cx, -452.4, 4.5, 4.5) });
      }
      sceneDraw.winGroups(r, cells, 12).forEach(d => body.push({ f: '@glass.1', d, op: 0.35, glow: 'window', detail: true }));
      // the sky bridge (two storeys, 170 m up) and its arch: the legs meet under the middle and bear on the towers below
      body.push({ s: '@steel.2', w: 2.6, d: 'M-29 -124L0 -168.5L29 -124' }, { s: '@steel.0', w: 1, op: 0.8, d: 'M-28 -125L0 -168L28 -125', detail: true });
      body.push(['@steel.1', rect(-29.5, -181, 59, 11)], ['@steel.2', rect(-29.5, -172.5, 59, 2.5)], ['@pin.0', rect(-30.5, -182.4, 61, 1.8)]);
      body.push(['@glass.0', rect(-28, -179.5, 56, 3)], ['@glass.0', rect(-28, -175.5, 56, 2.6)], ['@steel.2', ell(0, -168.5, 1.6, 1.6)]);
      let mul = ''; for (let x = -26; x < 27; x += 3.5) mul += `M${x} -179.5V-172.9`;
      body.push({ s: '@steel.1', w: 0.6, d: mul, detail: true });
      lit.push({ f: '@lightW', d: rect(-28, -179.5, 56, 7), op: 0.85 }, { s: '@lightC', w: 1.4, op: 0.75, d: 'M-29 -124L0 -168.5L29 -124' });
      // the podium between the feet of the towers
      body.push(['@steel.2', rect(-60, -12, 120, 12)], ['@steel.1', rect(-60, -13.6, 120, 1.8)], ['@glass.1', rect(-26, -10, 52, 6), 0.9]);
      return { body, lit };
    },
  });
})();
