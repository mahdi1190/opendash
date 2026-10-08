/* ============================================================
   SCENE LIBRARY: landmark.nashville-twin-spires (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The twin-spired tower of downtown Nashville (333 Commerce Street, 1994), the tallest building of
   the skyline, seen from across the Cumberland. Drawn by hand (the box extraction of the
   hand-drawn nashville-music-city-skyline art was only a reference):
   - the real form: a slender granite-and-glass tower; a tall central bay of dark glass between
     pale granite piers carried up to the crown; at the top the two tall slender pointed spires
     on the front corners and, between them, the steep glazed gable of the crown; the shaded
     side on the right; the setback shoulders under the crown
   - the floor lines of the glass bay, the punched windows of the piers, the stone's lit edges
   - night: floors lit in seeded groups (glow); the 'lit' part: the crown glazing lit, a soft
     light on the spires and the red aviation lights on their tips
   No text, no logos. Anchor: the ground at the middle of the tower.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const W = 46, SD = 60, G = 20, T = -352, SH = -330, SP = -470, GP = -420, EV = -372;   // half width, the shaded side's edge, the glass bay's half width, the wall top, the shoulders, the spire tips, the gable peak, its eaves
  define({
    id: 'landmark.nashville-twin-spires', category: 'landmark', size: [124, 472], box: [-60, -472, 64, 2], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#c4c2bc', '#9a9894', '#e0deda', '#6e6c6a'], glass: ['#5a7088', '#3a4e66', '#8aa2b8', '#26364a'], side: ['#7e7c78', '#5a5856'],
      spire: ['#8e9296', '#626870', '#b8bcc0'], crown: '#ffe6b8', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe8c0' }, on: 0.6 },
    shadow: { rx: 64, ry: 6, h: 90 },
    reflect: true,
    tags: ['landmark', 'place:us/place:nashville', 'us', 'us-southeast', 'skyline', 'skyscraper'],
    credit: 'native, drawn for the composed nashville-music-city-skyline scene (after the hand-drawn art)',
    build(v, r) {
      const body = [], lit = [];
      // the shaded side on the right, then the front: the stone piers (lit from the left), the dark glass bay between them
      body.push({ f: { lin: [[0, '@side.0'], [1, '@side.1']], x1: 0, y1: T, x2: 0, y2: 0 }, d: poly([[W, 0], [W, SH], [SD - 4, SH + 6], [SD, SH + 14], [SD, 0]]) });
      body.push({ f: { lin: [[0, '@stone.2'], [0.35, '@stone.0'], [1, '@stone.1']], x1: -W, y1: 0, x2: W, y2: 0 }, d: rect(-W, T, W * 2, -T) });
      body.push({ f: { lin: [[0, '@glass.2'], [0.5, '@glass.0'], [1, '@glass.3']], x1: 0, y1: T, x2: 0, y2: 0 }, d: rect(-G, T + 6, G * 2, -T - 20) });
      body.push(['@stone.2', rect(-W, T, 2.4, -T), 0.8], ['@stone.3', rect(W - 6, T, 6, -T), 0.35], ['@glass.3', rect(G - 4, T + 6, 4, -T - 20), 0.5]);
      // the glass bay's floor lines and its two mullions, the sky caught high in the glass
      let fl = ''; for (let y = T + 14; y < -16; y += 10) fl += `M${-G} ${y}H${G}`;
      body.push({ s: '@glass.3', w: 0.5, op: 0.35, d: fl, detail: true }, { s: '@glass.3', w: 0.8, op: 0.5, d: `M${-G / 3} ${T + 6}V-14M${G / 3} ${T + 6}V-14` });
      body.push({ f: { lin: [[0, '@glass.2', 0.5], [1, '@glass.2', 0]], x1: 0, y1: T, x2: 0, y2: T + 120 }, d: rect(-G, T + 6, G * 2, 120) });
      for (const [y, h, op] of [[-300, 14, 0.18], [-250, 6, 0.12], [-200, 18, 0.14], [-140, 6, 0.1]]) body.push(['@glass.2', poly([[-G, y + h], [-G, y + 2], [G, y - 10], [G, y - 10 + h * 0.6]]), op]);
      // the piers' punched windows (dark by day), the stone courses, the setbacks of the shoulders
      for (const sg of [-1, 1]) {
        let pw = ''; const x0 = sg < 0 ? -W + 6 : G + 6;
        for (let y = T + 16; y < -20; y += 12) pw += `M${x0} ${y}h7v4h-7zM${x0 + 10} ${y}h7v4h-7z`;
        body.push({ f: '@glass.3', d: pw, op: 0.4, detail: true });
        // the pier's spandrel lines and the stone jamb along the glass bay (lit on the left of each)
        let sp = ''; for (let y = T + 22; y < -20; y += 12) sp += `M${x0 - 2} ${y}h21`;
        body.push({ s: '@stone.3', w: 0.4, op: 0.25, d: sp, detail: true }, { f: sg < 0 ? '@stone.3' : '@stone.2', d: rect(sg * G - (sg < 0 ? 3 : 0), T + 6, 3, -T - 20), op: 0.5, detail: true });
      }
      // the sky caught on the shaded side, the setback shoulders' blocks, the crown's transom, the steps at the foot
      body.push(['@side.0', poly([[W, -260], [SD, -270], [SD, -250], [W, -238]]), 0.25], ['@side.0', poly([[W, -150], [SD, -158], [SD, -148], [W, -138]]), 0.18]);
      body.push(['@stone.1', rect(-W - 4, SH + 3, 8, 26), 0.9], ['@side.1', rect(W - 2, SH + 3, 6, 26), 0.9], { s: '@stone.0', w: 0.6, op: 0.6, d: `M${-W + 16} ${EV + 14}H${W - 16}`, detail: true }, ['@stone.1', rect(-W - 6, -4, W * 2 + 14, 4)]);
      let cs = ''; for (let y = T + 40; y < -10; y += 40) cs += `M${-W} ${y}H${-G}M${G} ${y}H${W}`;
      body.push({ s: '@stone.3', w: 0.6, op: 0.35, d: cs, detail: true });
      body.push(['@stone.0', rect(-W - 2, SH, 6, 3)], ['@stone.1', rect(W - 4, SH, 6, 3)], ['@stone.3', rect(-W, T, W * 2, 2), 0.5]);
      // the base: the lobby's dark glass and its canopy
      body.push(['@glass.3', rect(-W + 4, -18, W * 2 - 8, 18)], ['@stone.2', rect(-W, -20, W * 2, 2.4)], { s: '@stone.1', w: 0.6, op: 0.5, d: 'M-34 -16v14M-22 -16v14M-10 -16v14M2 -16v14M14 -16v14M26 -16v14M38 -16v14', detail: true });
      // the crown: the glazed gable between the spires, its stone frame, its mullions
      body.push(['@stone.1', poly([[-W + 12, T], [-W + 12, EV], [0, GP], [W - 12, EV], [W - 12, T]])]);
      body.push({ f: { lin: [[0, '@glass.2'], [1, '@glass.1']], x1: 0, y1: GP, x2: 0, y2: T }, d: poly([[-W + 16, T + 2], [-W + 16, EV + 2], [0, GP + 7], [W - 16, EV + 2], [W - 16, T + 2]]) });
      body.push({ s: '@stone.0', w: 0.8, op: 0.7, d: `M-12 ${T}V${GP + 18}M0 ${T}V${GP + 7}M12 ${T}V${GP + 18}M${-W + 16} ${T - 10}H${W - 16}` }, ['@stone.2', poly([[-W + 12, EV], [0, GP], [0, GP + 3], [-W + 12, EV + 3]]), 0.9]);
      // the spires: each a slender four-sided spike on its corner pier, lit on the left face, shaded on the right
      for (const sg of [-1, 1]) {
        const cx = sg * (W - 7), b = 7;
        body.push(['@spire.1', poly([[cx - b, T], [cx - b, EV + 2], [cx, SP], [cx + b, EV + 2], [cx + b, T]])]);
        body.push(['@spire.2', poly([[cx - b, T], [cx - b, EV + 2], [cx, SP], [cx - 1, EV + 2], [cx - 1, T]]), 0.85], ['@spire.0', rect(cx - b - 1, EV + 2, b * 2 + 2, 3)]);
        body.push({ s: '@spire.1', w: 0.5, op: 0.5, d: `M${cx - b} ${T - 12}H${cx + b}M${cx - b} ${T - 26}H${cx + b}`, detail: true });
        // the spire's ridge (the arris between its lit and shaded faces), its finial, the corner pier's lit edge and parapet
        body.push({ s: '@spire.2', w: 0.6, op: 0.7, d: `M${cx} ${SP}L${cx - 1} ${EV + 2}`, detail: true }, ['@spire.0', rect(cx - 0.6, SP - 8, 1.2, 8)], ['@stone.2', rect(cx - b - 1, T - 2, b * 2 + 2, 3)]);
        body.push({ s: '@stone.3', w: 0.6, op: 0.35, d: `M${cx - 3} ${T}V-20M${cx + 3} ${T}V-20`, detail: true });
        lit.push(['@beacon', ell(cx, SP - 2, 2.2, 2.2), 0.95], { f: { rad: [[0, '@beacon', 0.4], [1, '@beacon', 0]], cx, cy: SP - 2, r: 9 }, d: rect(cx - 10, SP - 12, 20, 20) });
        lit.push({ f: { lin: [[0, '@crown', 0.05], [1, '@crown', 0.4]], x1: 0, y1: SP, x2: 0, y2: T }, d: poly([[cx - b, T], [cx - b, EV + 2], [cx, SP], [cx + b, EV + 2], [cx + b, T]]) });
      }
      // night: floors lit in seeded groups (coarse ribbons so the tile stays light)
      const cells = [], cellsP = [], cellsS = [];
      for (let y = T + 18; y < -24; y += 14) { for (let x = -G + 2; x < G - 8; x += 12) cells.push([x, y, 10, 2.6]); cellsP.push([-W + 6, y, 17, 2.6], [G + 6, y, 17, 2.6]); cellsS.push([W + 3, y, 9, 2.6]); }
      sceneDraw.winGroups(r, cells, 10).forEach(d => body.push({ f: '@glass.1', d, op: 0.12, glow: 'window', detail: true }));
      sceneDraw.winGroups(r, cellsP, 8).forEach(d => body.push({ f: '@stone.1', d, op: 0.15, glow: 'window', detail: true }));
      sceneDraw.winGroups(r, cellsS, 4).forEach(d => body.push({ f: '@side.1', d, op: 0.15, glow: 'window', detail: true }));
      // the lit part: the crown's glass aglow
      lit.push({ f: { lin: [[0, '@crown', 0.75], [1, '@crown', 0.3]], x1: 0, y1: GP, x2: 0, y2: T }, d: poly([[-W + 16, T + 2], [-W + 16, EV + 2], [0, GP + 7], [W - 16, EV + 2], [W - 16, T + 2]]) });
      lit.push({ s: '@crown', w: 1, op: 0.6, d: `M${-W + 12} ${EV}L0 ${GP}L${W - 12} ${EV}` });
      return { body, lit };
    },
  });
})();
