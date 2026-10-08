/* ============================================================
   SCENE LIBRARY: landmark.reunion-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The observation tower at the west edge of downtown Dallas (1978), drawn by hand for the
   composed dallas-skyline scene (the hand-drawn art's ball on a column was only a reference):
   - the real structure: about 171 m; a shaft of concrete cylinders (a central one with the
     outer ones either side of it) on a low round entrance hall, the collar where the shaft
     meets the head, and the head itself: a geodesic sphere about 36 m across, a lattice of
     triangles over the glazed observation levels in its lower part
   - pale concrete and silver lattice lit from the left, shaded on the right
   - night: the sphere's lattice of LED points (the 'lit' part) in cool white with a soft halo,
     the shaft washed from below, the glazed levels warm (glow), the beacon on the crown
   No text, no logos. Anchor: the ground at the middle of the foot (1 unit = 1 m).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const CY = -153, R = 18, NECK = -134;   // the sphere's centre and radius; the top of the shaft
  const TILT = 0.16;                      // the latitude rings seen from below: their near arcs sag by this share of their half-width
  /** A point on the sphere's near side at latitude lat and longitude lon (degrees; lon 0 faces the viewer). */
  const pt = (lat, lon) => { const a = lat * Math.PI / 180, o = lon * Math.PI / 180, w = R * Math.cos(a); return [w * Math.sin(o), CY - R * Math.sin(a) + TILT * w * Math.cos(o)]; };
  /** A band of the sphere between two latitudes: its outline as a polygon (the near arcs sag as the rings do). */
  const band = (a, b) => { const pts = []; for (let o = -90; o <= 90; o += 15) pts.push(pt(a, o)); for (let o = 90; o >= -90; o -= 15) pts.push(pt(b, o)); return poly(pts); };
  define({
    id: 'landmark.reunion-tower', category: 'landmark', size: [40, 172], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      conc: ['#ece8e0', '#d2cdc4', '#a8a299', '#7c776f'], lat: ['#eef2f6', '#c4ccd6', '#8e98a4', '#646e7a'], glass: ['#3c4a5c', '#2a3546', '#6c84a0'],
      led: '#eaf6ff', ledHalo: '#b8dcff', wash: '#ffe8c4', beacon: '#ff4636',
    } },
    night: { glow: { window: '#ffe2b0' }, on: 0.85 },
    shadow: { rx: 22, ry: 3, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:texas/place:dallas', 'texas', 'tower', 'observation-tower'],
    credit: 'native (scene engine upgrade), after the hand-drawn dallas-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      const cyl = (x0, x1, k) => ({ lin: [[0, '@conc.1'], [0.3, '@conc.0'], [0.72, '@conc.2'], [1, '@conc.3']].map(([t, c]) => [t, c, k]), x1: x0, y1: 0, x2: x1, y2: 0 });
      // the entrance hall: a plinth, a low round drum with its glazed band, its flat roof
      body.push(['@conc.2', rect(-17, -2.4, 34, 2.4)]);
      body.push({ f: { lin: [[0, '@conc.1'], [0.35, '@conc.0'], [0.8, '@conc.2'], [1, '@conc.3']], x1: -14, y1: 0, x2: 14, y2: 0 }, d: rect(-14, -9, 28, 6.6) });
      body.push({ f: '@glass.0', d: rect(-13.6, -7.4, 27.2, 3.2), glow: 'window' }, ['@conc.0', rect(-14.8, -10.2, 29.6, 1.4)]);
      let mh = ''; for (let x = -12; x <= 12; x += 3) mh += `M${x} -7.4V-4.2`;
      body.push({ s: '@conc.3', w: 0.35, op: 0.7, d: mh, detail: true });
      // the shaft: the two outer cylinders behind, then the central one in front; construction joints every 12 m
      body.push({ f: cyl(-7.4, -2.2), d: rect(-7.4, NECK, 5.2, -NECK - 10) }, { f: cyl(2.2, 7.4), d: rect(2.2, NECK, 5.2, -NECK - 10) });
      body.push({ f: cyl(-3.8, 3.8), d: rect(-3.8, NECK, 7.6, -NECK - 10) });
      body.push({ s: '@conc.3', w: 0.45, op: 0.6, d: 'M-3.8 -10V' + NECK + 'M3.8 -10V' + NECK });
      let joints = ''; for (let y = -22; y > NECK + 4; y -= 12) joints += `M-7.4 ${y}H7.4`;
      body.push({ s: '@conc.2', w: 0.3, op: 0.5, d: joints, detail: true });
      // the lift windows: a narrow glazed slot up the central cylinder's lit side
      body.push({ f: '@glass.1', d: rect(-2.6, NECK + 2, 1.5, -NECK - 14), op: 0.75, detail: true });
      for (let y = -18; y > NECK + 6; y -= 10) cells.push([-2.5, y, 1.3, 1.6]);
      // the edge light and the shaded flank
      body.push({ s: '@conc.0', w: 0.6, op: 0.8, d: `M-7.2 -10V${NECK}` }, { s: '@conc.3', w: 0.6, op: 0.7, d: `M7.2 -10V${NECK}` });
      // the collar under the head
      body.push({ f: cyl(-8.6, 8.6), d: poly([[-7.6, NECK], [7.6, NECK], [8.6, NECK - 3], [-8.6, NECK - 3]]) }, ['@conc.3', rect(-8.6, NECK - 3.6, 17.2, 0.6), 0.6]);
      // the head: the sphere, shaded as a ball lit from the upper left
      body.push({ f: { rad: [[0, '@lat.0'], [0.55, '@lat.1'], [0.85, '@lat.2'], [1, '@lat.3']], cx: -6, cy: CY - 7, r: 26 }, d: ell(0, CY, R, R) });
      // the glazed observation levels in the lower part of the sphere, and the band between them
      body.push({ f: '@glass.0', d: band(-38, -26) }, { f: '@lat.2', d: band(-26, -22) }, { f: '@glass.1', d: band(-22, -12) });
      body.push({ f: '@glass.2', d: band(-37, -27), op: 0.35, detail: true }, { f: '@glass.2', d: band(-21, -13), op: 0.3, detail: true });
      for (let o = -75; o <= 75; o += 15) { const p = pt(-32, o), q = pt(-17, o); cells.push([f1(p[0] - 1.1), f1(p[1] - 1.4), 2.2, 2.6], [f1(q[0] - 1.2), f1(q[1] - 1.6), 2.4, 3]); }
      // the lattice: latitude rings and the triangles between them (the geodesic grid), lighter over the open upper dome
      const lats = [-48, -38, -22, -12, 0, 12, 24, 36, 48, 60, 72];
      const rows = lats.map((a, i) => { const pts = []; const off = i % 2 ? 7.5 : 0; for (let o = -90 + off; o <= 90; o += 15) pts.push(pt(a, Math.min(90, o))); return pts; });
      rows.forEach((pts, i) => body.push({ s: i < 4 ? '@lat.3' : '@lat.2', w: 0.32, op: 0.75, d: 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L'), detail: i > 1 && i < 9 ? false : true }));
      // the struts between two rings: the rising ones and the falling ones (two families, the falling ones in shade)
      for (let i = 0; i < rows.length - 1; i++) {
        let up = '', down = '';
        const A = rows[i], B = rows[i + 1];
        for (let j = 0; j < Math.min(A.length, B.length); j++) {
          up += `M${f1(A[j][0])} ${f1(A[j][1])}L${f1(B[j][0])} ${f1(B[j][1])}`;
          if (A[j + 1]) down += `M${f1(B[j][0])} ${f1(B[j][1])}L${f1(A[j + 1][0])} ${f1(A[j + 1][1])}`;
        }
        body.push({ s: i < 3 ? '@lat.3' : '@lat.2', w: 0.28, op: 0.65, d: up, detail: true }, { s: '@lat.3', w: 0.26, op: 0.55, d: down, detail: true });
      }
      // the glazed levels' mullions and their edges
      for (const [a, b] of [[-38, -26], [-22, -12]]) {
        let m = ''; for (let o = -82.5; o <= 82.5; o += 7.5) { const p = pt(a, o), q = pt(b, o); m += `M${f1(p[0])} ${f1(p[1])}L${f1(q[0])} ${f1(q[1])}`; }
        body.push({ s: '@lat.2', w: 0.22, op: 0.7, d: m, detail: true });
        for (const e of [a, b]) { const pts = []; for (let o = -90; o <= 90; o += 15) pts.push(pt(e, o)); body.push({ s: '@lat.1', w: 0.3, op: 0.8, d: 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L'), detail: true }); }
      }
      // the outer cylinders' lit edges and shaded edges, the hall's doors and the steps up to it, the plaza ring
      body.push({ s: '@conc.0', w: 0.4, op: 0.7, d: `M-6.6 -10V${NECK}`, detail: true }, { s: '@conc.3', w: 0.4, op: 0.6, d: `M-4.2 -10V${NECK}`, detail: true });
      body.push({ s: '@conc.1', w: 0.4, op: 0.6, d: `M4.2 -10V${NECK}`, detail: true }, { s: '@conc.3', w: 0.45, op: 0.7, d: `M6.6 -10V${NECK}`, detail: true });
      body.push(['@glass.1', rect(-2.4, -6.8, 4.8, 4.4)], { f: '@conc.1', d: 'M-6 -2.4h12l1.6 2.4h-15.2z', detail: true }, { f: '@conc.3', d: rect(-20, -0.6, 40, 0.6), op: 0.6, detail: true });
      body.push({ f: '@conc.2', d: poly([[-8.2, -10], [8.2, -10], [7.4, -13], [-7.4, -13]]), detail: true });
      // the crown: the lattice's top ring, a small cap and the beacon
      body.push({ f: '@lat.1', d: ell(0, CY - R + 0.6, 4, 1.2) }, ['@lat.2', rect(-0.5, CY - R - 1.6, 1, 1.8)], ['@beacon', ell(0, CY - R - 1.9, 0.6, 0.6)]);
      // the sphere's rim light on the left and its shade on the right
      body.push({ s: '@lat.0', w: 0.7, op: 0.85, d: `M${f1(pt(48, -90)[0])} ${f1(pt(48, -90)[1])}A${R} ${R} 0 0 0 ${f1(pt(-30, -90)[0])} ${f1(pt(-30, -90)[1])}` });
      body.push({ s: '@lat.3', w: 0.9, op: 0.6, d: `M${f1(pt(40, 90)[0])} ${f1(pt(40, 90)[1])}A${R} ${R} 0 0 1 ${f1(pt(-44, 90)[0])} ${f1(pt(-44, 90)[1])}` });
      sceneDraw.winGroups(r, cells, 6).forEach(d => body.push({ f: '@glass.2', d, op: 0.55, glow: 'window', detail: true }));
      // night: the shaft washed from below, a halo round the head, the lattice's LED points, the beacon
      lit.push({ f: { lin: [[0, '@wash', 0.5], [0.6, '@wash', 0.18], [1, '@wash', 0.06]], x1: 0, y1: -10, x2: 0, y2: NECK }, d: rect(-7.4, NECK, 14.8, -NECK - 10) });
      lit.push({ f: { rad: [[0, '@ledHalo', 0.32], [0.7, '@ledHalo', 0.14], [1, '@ledHalo', 0]], cx: 0, cy: CY, r: 30 }, d: ell(0, CY, 30, 30) });
      let leds = '';
      rows.forEach((pts, i) => { if (i < 4) return; for (const p of pts) leds += ell(p[0], p[1], 0.55, 0.55); });
      lit.push({ f: '@led', d: leds, op: 0.95 }, { s: '@ledHalo', w: 0.35, op: 0.5, d: rows.slice(4).map(pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L')).join('') });
      lit.push({ f: '@wash', d: band(-37, -27), op: 0.35 }, { f: '@wash', d: band(-21, -13), op: 0.3 }, { f: '@ledHalo', d: rect(-8.6, NECK - 3.6, 17.2, 0.8), op: 0.7 });
      lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: CY - R - 1.9, r: 3 }, d: ell(0, CY - R - 1.9, 3, 3) });
      return { body, lit };
    },
  });
})();
