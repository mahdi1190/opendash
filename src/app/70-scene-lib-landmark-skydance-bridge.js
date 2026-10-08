/* ============================================================
   SCENE LIBRARY: landmark.skydance-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Skydance Bridge, Oklahoma City: the long pedestrian bridge over the interstate between the
   two halves of Scissortail Park, its white sculpture after the state bird's forked tail. Drawn by
   hand after its form:
   - the long, slim deck on its piers, with its railing
   - the sculpture: two white tubular spines springing from one end of the deck and sweeping up
     and over it, parting at the top like the two long tail feathers; triangulated white struts
     between them and slim hangers carrying the deck
   - light from the left: the spines' lit upper edges
   - night: the spines' light (the 'lit' part), the deck's lamps (glow)
   No text, no logos. Anchor: the ground under the middle of the deck.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const DY = -46, X0 = -270, X1 = 270;            // the deck's top and its ends
  // the two spines as quadratics from one root at the left end of the deck
  const A = [[-206, DY], [-60, -236], [196, -296]], B = [[-196, DY], [40, -170], [262, -206]];
  const at = (q, t) => { const u = 1 - t; return [u * u * q[0][0] + 2 * u * t * q[1][0] + t * t * q[2][0], u * u * q[0][1] + 2 * u * t * q[1][1] + t * t * q[2][1]]; };
  const qd = q => `M${q[0][0]} ${q[0][1]}Q${q[1][0]} ${q[1][1]} ${q[2][0]} ${q[2][1]}`;
  define({
    id: 'landmark.skydance-bridge', category: 'landmark', size: [560, 304], box: [-280, -304, 282, 2], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      white: ['#ffffff', '#e6eaf0', '#b8c0cc', '#8a94a4'], deck: ['#d8dce2', '#a8b0bc', '#6e7886'], pier: ['#c4c8cc', '#8e949a'],
      rail: '#6a7480', led: '#cfe2ff', glow: '#9ec4ff', lamp: '#fff0c8',
    } },
    night: { glow: { lamp: '#fff0c8' }, on: 0.6 },
    shadow: { rx: 250, ry: 5, h: 40 },
    reflect: true,
    tags: ['landmark', 'place:us/place:oklahoma-city', 'us', 'us-mountain', 'bridge'],
    credit: 'native, drawn for the composed oklahoma-city-skyline-wheel scene (after the hand-drawn art)',
    build() {
      const body = [], lit = [];
      // the piers and the ramps at the ends
      for (const x of [-150, -30, 90, 200]) body.push(['@pier.0', rect(x - 4, DY + 8, 8, -DY - 8)], { f: '@pier.1', d: rect(x + 2, DY + 8, 2, -DY - 8), detail: true });
      body.push(['@pier.0', poly([[X0, DY + 8], [X0 + 30, DY + 8], [X0 + 10, 0], [X0 - 10, 0]])], ['@pier.0', poly([[X1 - 30, DY + 8], [X1, DY + 8], [X1 + 10, 0], [X1 - 10, 0]])]);
      // the deck: its fascia, the shadowed underside, the railing
      body.push(['@deck.0', rect(X0, DY, X1 - X0, 6)], ['@deck.2', rect(X0, DY + 6, X1 - X0, 3)]);
      let posts = ''; for (let x = X0 + 4; x < X1; x += 9) posts += `M${x} ${DY}v-7`;
      body.push({ s: '@rail', w: 0.7, op: 0.75, d: posts, detail: true }, { s: '@rail', w: 0.9, d: `M${X0} ${DY - 7}H${X1}` }, { s: '@deck.1', w: 0.6, op: 0.6, d: `M${X0} ${DY + 3}H${X1}`, detail: true });
      // the hangers: from the lower spine (and the upper one beyond it) down to the deck
      for (let i = 1; i <= 18; i++) {
        const p = at(B, 0.04 + i * 0.05);
        if (p[0] < X1 - 8 && p[1] < DY - 10) body.push({ s: '@white.3', w: 0.8, op: 0.8, d: `M${f1(p[0])} ${f1(p[1])}V${DY - 1}`, detail: i % 2 === 0 });
      }
      for (let i = 0; i < 8; i++) { const p = at(A, 0.1 + i * 0.06); body.push({ s: '@white.3', w: 0.6, op: 0.6, d: `M${f1(p[0])} ${f1(p[1])}V${DY - 1}`, detail: true }); }
      // the spines: shade, body and lit edge
      body.push({ s: '@white.3', w: 8.5, d: qd(A) }, { s: '@white.1', w: 6.5, d: qd(A) }, { s: '@white.0', w: 2.2, d: qd(A.map(p => [p[0] - 1.5, p[1] - 2])) });
      body.push({ s: '@white.3', w: 7, d: qd(B) }, { s: '@white.1', w: 5.2, d: qd(B) }, { s: '@white.0', w: 1.8, d: qd(B.map(p => [p[0] - 1.2, p[1] - 1.6])) });
      // the triangulated struts between the spines: the feather vanes
      for (let i = 0; i < 18; i++) {
        const t = 0.1 + i * 0.05, a = at(A, t), b = at(B, Math.min(1, t + 0.02)), b2 = at(B, Math.min(1, t + 0.07));
        body.push({ s: i % 2 ? '@white.2' : '@white.1', w: 1.6, d: `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}L${f1(at(A, t + 0.05)[0])} ${f1(at(A, t + 0.05)[1])}`, detail: i % 3 !== 0 });
        if (i % 2 === 0) body.push({ s: '@white.3', w: 0.8, op: 0.7, d: `M${f1(a[0])} ${f1(a[1])}L${f1(b2[0])} ${f1(b2[1])}`, detail: true });
      }
      // the two tips: the tail's points, a little finer
      body.push(['@white.0', poly([[190, -288], [204, -304], [200, -282]])], ['@white.0', poly([[256, -200], [272, -214], [266, -196]])]);
      // the root at the deck: the base plate where both spines spring
      body.push(['@white.2', poly([[-222, DY], [-206, DY - 12], [-186, DY - 8], [-180, DY]])], ['@deck.2', rect(-226, DY, 50, 4)]);
      // night: the deck's lamps along the railing (glow)
      let lamps = ''; for (let x = X0 + 20; x < X1; x += 36) lamps += ell(x, DY - 8, 1.6, 1.6);
      body.push({ f: '@deck.1', d: lamps, glow: 'lamp' });
      // the lit part: the spines in white-blue light, a soft halo along each
      lit.push({ s: '@glow', w: 16, op: 0.22, d: qd(A) }, { s: '@led', w: 3.4, op: 0.9, d: qd(A) });
      lit.push({ s: '@glow', w: 13, op: 0.2, d: qd(B) }, { s: '@led', w: 2.8, op: 0.85, d: qd(B) });
      lit.push({ f: { lin: [[0, '@lamp', 0.5], [1, '@lamp', 0]], x1: 0, y1: DY, x2: 0, y2: DY - 14 }, d: rect(X0, DY - 14, X1 - X0, 14) });
      return { body, lit };
    },
  });
})();
