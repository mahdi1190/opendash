/* ============================================================
   SCENE LIBRARY: landmark.willis-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   After the Willis Tower in the hand-drawn chicago-l-train art (its bundled tubes and two
   antennas), redrawn by hand:
   - the real structure: nine square tubes in a three by three bundle (each a third of the
     width), seen from the north as three columns: two tubes end at floor 50, two at 66, three
     at 90, and the last two (the centre and the west-centre) rise to the roof at floor 108,
     so the left (east) column stops at 90 while the centre and right columns run to the top;
     the setback ledges where a column's front tube ends and the one behind carries on
   - black aluminium and bronze-tinted glass: fine vertical mullions, the four dark louvred
     mechanical belts (floors 29-32, 64-66, 88-90, 104-106); the two white antennas on the roof
   - lit from the left: a sheen down each column's left side, the ledges catching the light
   - night: the office windows (glow), the white-lit antennas with their red beacons and a pale
     wash on the crown (the 'lit' part)
   No text, no logos, nothing on the roof but the antennas. Anchor: the ground at the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const F = n => f1(n * 4.47);   // the top of floor n (a floor is 4.47 units: the tubes are 25 wide)
  const X = [-37.5, -12.5, 12.5, 37.5];   // the column edges: east (left), centre, west (right)
  // per column: the top of its front (north) tube, then of the tube behind it
  const COL = [[F(66), F(90)], [F(90), F(108)], [F(50), F(108)]];
  const ROOF = F(108);
  const BELTS = [[29, 32], [64, 66], [88, 90], [104, 106]];
  define({
    id: 'landmark.willis-tower', category: 'landmark', size: [78, 587], box: [-39, -587, 39, 1], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#4e5868', '#363e4c', '#232a36', '#161b24'], sheen: '#8a96aa', belt: '#0e1218', mull: '#0b0e14', ledge: ['#9aa2ae', '#5c6470'],
      base: ['#3c424c', '#272c34', '#6a707a'], mast: ['#eef0f2', '#aab0ba', '#7a808a'], flood: '#eef2ff', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe9bc' }, on: 0.8 },
    reflect: true,
    tags: ['landmark', 'place:us/place:chicago', 'us', 'us-midwest', 'skyscraper', 'signature'],
    credit: 'native (scene engine upgrade), after the hand-drawn chicago-l-train art (its bundled tubes and antennas)',
    build(v, r) {
      const body = [], lit = [], cells = [];
      const top = i => COL[i][1];
      // the whole silhouette (what a small still keeps): the black glass, darker to the right, and the sheen on the left
      const sil = poly([[X[0], 0], [X[0], -top(0)], [X[1], -top(0)], [X[1], -ROOF], [X[3], -ROOF], [X[3], 0]]);
      body.push({ f: { lin: [[0, '@glass.1'], [1, '@glass.3']], x1: X[0], y1: 0, x2: X[3], y2: 0 }, d: sil });
      body.push({ f: { lin: [[0, '@sheen', 0.34], [1, '@sheen', 0]], x1: 0, y1: 0, x2: 9, y2: 0 }, d: [0, 1, 2].map(i => rect(X[i], -top(i), 9, top(i))).join('') });
      // each column's two faces (the front tube, then the one behind above its setback): a vertical sky gradient, lighter above
      [0, 1, 2].forEach(i => {
        const [a, b] = COL[i], x0 = X[i];
        body.push({ f: { lin: [[0, '@glass.0'], [0.5, '@glass.1'], [1, '@glass.2']], x1: 0, y1: -a, x2: 0, y2: 0 }, d: rect(x0, -a, 25, a), detail: true });
        body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.2']], x1: 0, y1: -b, x2: 0, y2: -a }, d: rect(x0 + 0.6, -b, 24.4, b - a), detail: true });
        body.push({ f: { lin: [[0, '@sheen', 0.3], [1, '@sheen', 0]], x1: x0, y1: 0, x2: x0 + 7, y2: 0 }, d: rect(x0, -b, 7, b), detail: true });
        // the column joint: a dark line where two columns meet, and the shaded right edge
        body.push({ s: '@mull', w: 0.8, op: 0.8, d: `M${x0 + 24.6} ${f1(-b)}V0`, detail: true }, { f: '@glass.3', d: rect(x0 + 20, -b, 4.6, b), op: 0.45, detail: true });
        // the spandrels: a faint dark line at every second floor
        let sp = ''; for (let y = 8.9; y < b - 2; y += 8.94) sp += `M${x0} ${f1(-y)}h25`;
        body.push({ s: '@mull', w: 0.4, op: 0.3, d: sp, detail: true });
        // fine vertical mullions (the black aluminium fins)
        let mu = ''; for (let x = x0 + 2.5; x < x0 + 25; x += 2.5) mu += `M${f1(x)} ${f1(-b + 1)}V-8`;
        body.push({ s: '@mull', w: 0.32, op: 0.45, d: mu, detail: true });
        // the setback ledge: the front tube's roof in the light, its parapet and its shadow on the face behind
        body.push(['@ledge.0', rect(x0, -a - 1.4, 25, 1.4)], { f: '@glass.3', d: rect(x0 + 0.6, -a - 5, 24.4, 3.6), op: 0.5, detail: true });
        // ribbon windows: two cells per column on rows every 14 units, below the column's top
        for (let y = 20; y < b - 8; y += 14) { if (BELTS.some(([p, q]) => y > F(p) - 4 && y < F(q) + 4)) continue; cells.push([x0 + 2, -y - 1.3, 10, 2.6], [x0 + 13, -y - 1.3, 10, 2.6]); }
      });
      // the mechanical belts: dark louvre bands across every column still standing at that height, with a fine louvre line
      let belt = '';
      for (const [p, q] of BELTS) {
        let louv = '';
        for (let i = 0; i < 3; i++) if (top(i) >= F(q)) { belt += rect(X[i], -F(q), 25, F(q) - F(p)); for (let y = F(p) + 2.2; y < F(q) - 1; y += 2.2) louv += `M${X[i]} ${f1(-y)}h25`; }
        body.push({ s: '@ledge.1', w: 0.35, op: 0.45, d: louv, detail: true });
      }
      body.splice(body.length - BELTS.length, 0, ['@belt', belt]);
      sceneDraw.winGroups(r, cells, 14).forEach(d => body.push({ f: '@glass.3', d, op: 0.35, glow: 'window', detail: true }));
      // the glass ledges of the observation deck (floor 103) standing out from the west face, at the right edge
      body.push({ f: '@glass.0', d: rect(X[3], -F(103) - 1, 1.6, 5) + rect(X[3], -F(103) + 6, 1.6, 5), op: 0.8, detail: true });
      // the roof: the parapet, the plant housings between the antennas (plain, no lettering)
      body.push(['@ledge.1', rect(X[1], -ROOF - 2, 50, 2)], ['@base.1', rect(X[1] + 6, -ROOF - 7, 10, 5) + rect(X[1] + 30, -ROOF - 6, 8, 4)], ['@ledge.1', rect(X[0], -top(0) - 1.6, 25, 1.6)], ['@ledge.0', rect(X[1], -ROOF - 2, 50, 0.6)]);
      // the two antennas over the two last tubes: tapered masts in sections, the east one a little shorter
      for (const [ax, h] of [[0, 92], [25, 96]]) {
        const y0 = -ROOF - 2, yt = y0 - h;
        body.push({ f: { lin: [[0, '@mast.0'], [1, '@mast.2']], x1: ax - 2, y1: 0, x2: ax + 2, y2: 0 }, d: poly([[ax - 2.2, y0], [ax + 2.2, y0], [ax + 0.5, yt], [ax - 0.5, yt]]) });
        body.push(['@mast.1', rect(ax - 3.4, y0 - 3, 6.8, 3)], ['@mast.2', rect(ax + 0.4, y0 - 3, 3, 3), 0.6], { s: '@mast.2', w: 0.5, op: 0.8, d: `M${ax - 1.8} ${f1(y0 - h * 0.25)}h3.6M${ax - 1.3} ${f1(y0 - h * 0.5)}h2.6M${ax - 0.9} ${f1(y0 - h * 0.75)}h1.8`, detail: true });
        // the mast's broad lower section and the shaded right side of the whole mast
        body.push(['@mast.1', poly([[ax - 2.2, y0], [ax + 2.2, y0], [ax + 1.6, y0 - h * 0.3], [ax - 1.6, y0 - h * 0.3]]), 0.6], { f: '@mast.2', d: poly([[ax, y0], [ax + 2.2, y0], [ax + 0.5, yt], [ax, yt]]), op: 0.5, detail: true });
        body.push(['@beacon', ell(ax, yt - 0.6, 0.9, 0.9)]);
        // night: the mast lit white, the beacon's glow
        lit.push({ s: '@flood', w: 1.6, op: 0.75, d: `M${ax} ${f1(y0 - 2)}V${f1(yt + 2)}` });
        lit.push({ f: { rad: [[0, '@beacon', 0.8], [1, '@beacon', 0]], cx: ax, cy: yt - 0.6, r: 5 }, d: ell(ax, yt - 0.6, 5, 5) });
      }
      // the base: the lobby's dark glass and its canopy, the plaza step
      body.push(['@base.1', rect(X[0] - 1, -16, 77, 16)], ['@base.2', rect(X[0] - 1, -17.4, 77, 1.4)], ['@base.0', rect(X[0] + 4, -13, 22, 13) + rect(X[2] + 4, -13, 22, 13)]);
      body.push(['@base.2', rect(X[0] + 2, -14.4, 26, 1.2) + rect(X[2] + 2, -14.4, 26, 1.2)], ['@base.1', rect(X[0] - 1, -1.6, 77, 1.6), 0.8]);
      body.push({ s: '@mull', w: 0.4, op: 0.6, d: (() => { let d = ''; for (let x = X[0] + 2; x < X[3]; x += 4) d += `M${x} -15V0`; return d; })(), detail: true });
      cells.length = 0;
      for (let x = X[0] + 3; x < X[3] - 3; x += 7) cells.push([x, -11, 4.4, 9]);
      sceneDraw.winGroups(r, cells, 3).forEach(d => body.push({ f: '@base.0', d, op: 0.6, glow: 'window', detail: true }));
      // night: a pale wash on the crown (the top floors and the parapet)
      lit.push({ f: { lin: [[0, '@flood', 0.3], [1, '@flood', 0]], x1: 0, y1: -ROOF, x2: 0, y2: -F(100) }, d: rect(X[1], -ROOF, 50, ROOF - F(100)) });
      lit.push({ s: '@flood', w: 0.8, op: 0.6, d: `M${X[1]} ${f1(-ROOF - 1)}H${X[3]}` });
      return { body, lit };
    },
  });
})();
