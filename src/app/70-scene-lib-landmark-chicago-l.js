/* ============================================================
   SCENE LIBRARY: landmark.chicago-l (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   After the elevated truss in the hand-drawn chicago-l-train art (the L crossing the water with
   a train on it), redrawn by hand as the L crossing the Chicago River (after the double-deck
   bascule bridges at Wells and Lake Streets):
   - the real structure: a double-leaf bascule span of riveted steel trusses (parallel chords,
     verticals and Pratt diagonals, the two leaves meeting mid-river), the roadway on the lower
     deck through the trusses and the L's tracks on the upper deck on top of them; the stone
     bascule piers with a small classical bridge-tender's house on each; then the elevated
     structure itself: plate girders on single steel columns with lattice lacing and curved knee
     braces, standing on concrete footings (drawn in the water for the view)
   - the open track deck: ties, the running rail and the timber third-rail cover, the walkway
     railing on the near edge
   - lit from the left; the steel a weathered dark grey-green, the piers and houses pale stone
   - night: the tenders' windows and the roadway lamps (glow), the red and green channel lights
     (the 'lit' part)
   No text, no logos, no line colours or maps. Anchor: the waterline at the middle of the river
   span (the bascule piers at x +-135; the track's rail head at y -48.4).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const PX = 135, PW = 38, END = 440;   // the bascule piers' channel face, the pier width, the box edge
  const TT = -46, TB = -17, RD = -21;   // the truss's top chord (the track deck), its bottom chord, the roadway
  const GB = -39;                       // the approach girders' bottom flange (their top is the track deck)
  const BENTS = [196, 240, 284, 328, 372, 416];
  define({
    id: 'landmark.chicago-l', category: 'landmark', size: [880, 54], box: [-440, -53, 440, 1], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#66726c', '#4a5652', '#353f3c', '#252c2a'], stone: ['#c8c0b0', '#a29a8a', '#7a7466', '#e2dccc'], roof: ['#5a6a64', '#3e4a46'],
      tie: '#3a2e26', rail: ['#b8bcc0', '#6a5040'], road: ['#5a5e62', '#8a8e92'], glass: '#2e3640', lamp: '#ffe2a0', red: '#ff4a3a', green: '#4aff8a', flood: '#ffe6b0',
    } },
    night: { glow: { window: '#ffe1a0', lamp: '#ffe6b0' }, on: 0.9 },
    tags: ['landmark', 'place:us/place:chicago', 'us', 'us-midwest', 'bridge', 'elevated-railway', 'bascule-bridge'],
    credit: 'native (scene engine upgrade), after the hand-drawn chicago-l-train art (the L and its train over the water)',
    build() {
      const body = [], lit = [];
      const sides = [-1, 1];
      // the approach girders on both sides (from the piers to the box edges), their shaded web and the stiffeners
      for (const sg of sides) {
        const a = sg < 0 ? -END : PX, w = END - PX;
        body.push(['@steel.1', rect(a, TT, w, GB - TT)], ['@steel.2', rect(a, GB - 2.2, w, 2.2), 0.9]);
        let st = ''; for (let x = PX + 6; x < END; x += 7) st += `M${sg * x} ${TT + 1}V${GB - 1}`;
        body.push({ s: '@steel.3', w: 0.5, op: 0.6, d: st, detail: true });
      }
      // the bents: a laced column, its shaded side, the curved knee braces into the girder, the footing in the water
      for (const sg of sides) for (const b of BENTS) {
        const x = sg * b;
        body.push(['@steel.1', rect(x - 1.8, GB, 3.6, -5 - GB)], ['@steel.3', rect(x + 0.4, GB, 1.4, -5 - GB), 0.8]);
        body.push({ s: '@steel.2', w: 1.1, d: `M${x - 1.8} ${GB + 9}Q${x - 2} ${GB + 1} ${x - 10} ${GB}M${x + 1.8} ${GB + 9}Q${x + 2} ${GB + 1} ${x + 10} ${GB}` });
        let lc = ''; for (let y = GB + 2; y < -8; y += 3.4) lc += `M${x - 1.6} ${f1(y)}L${x + 1.6} ${f1(y + 1.7)}`;
        body.push({ s: '@steel.0', w: 0.35, op: 0.6, d: lc, detail: true });
        body.push(['@stone.1', rect(x - 4.5, -6, 9, 6)], ['@stone.2', rect(x + 1, -6, 3.5, 6), 0.7]);
      }
      // the far truss, seen through the near one (fainter, a little to the right)
      const pts = []; for (let k = 0; k <= 10; k++) pts.push(-PX + k * 27);
      let far = '';
      for (let k = 0; k < 10; k++) { const [x0, x1] = k < 5 ? [pts[k], pts[k + 1]] : [pts[k + 1], pts[k]]; far += `M${x0 + 4} ${TT + 2}L${x1 + 4} ${TB}`; }
      body.push({ s: '@steel.0', w: 1, op: 0.45, d: far, detail: true }, { s: '@steel.0', w: 1.2, op: 0.4, d: `M${-PX + 4} ${TB - 1}H${PX + 4}`, detail: true });
      // the roadway through the trusses: the deck's edge, its railing, the lamp standards
      body.push(['@road.0', rect(-PX, RD, 2 * PX, 3.4)], ['@road.1', rect(-PX, RD, 2 * PX, 1), 0.8]);
      let rp = ''; for (let x = -PX + 3; x < PX; x += 5) rp += `M${x} ${RD}v-3`;
      body.push({ s: '@road.1', w: 0.4, op: 0.7, d: rp + `M${-PX} ${RD - 3}H${PX}`, detail: true });
      const lampX = [-98, -34, 34, 98];
      body.push({ s: '@steel.2', w: 0.7, d: lampX.map(x => `M${x} ${RD}v-10h2.2`).join('') });
      lampX.forEach(x => body.push({ f: '@road.1', d: ell(x + 2.6, RD - 10.2, 1.3, 0.8), glow: 'lamp' }));
      // the near truss: the chords (lit tops, shaded undersides), the end posts, the verticals and the Pratt diagonals
      body.push(['@steel.1', rect(-PX, TT, 2 * PX, 3.6)], ['@steel.0', rect(-PX, TT, 2 * PX, 1.2), 0.8], ['@steel.1', rect(-PX, TB - 2.6, 2 * PX, 2.6)], ['@steel.3', rect(-PX, TB - 0.8, 2 * PX, 0.8), 0.8]);
      let vert = '', diag = '';
      for (let k = 1; k < 10; k++) vert += `M${pts[k]} ${TT + 3}V${TB - 2}`;
      for (let k = 0; k < 10; k++) { const [x0, x1] = k < 5 ? [pts[k], pts[k + 1]] : [pts[k + 1], pts[k]]; diag += `M${x0} ${TT + 3}L${x1} ${TB - 2}`; }
      body.push({ s: '@steel.1', w: 1.5, d: vert }, { s: '@steel.2', w: 1.3, d: diag });
      body.push(['@steel.2', rect(-PX - 1, TT, 4, TB - TT) + rect(PX - 3, TT, 4, TB - TT)], ['@steel.0', rect(-PX - 1, TT, 1.2, TB - TT), 0.7]);
      // gusset plates at the panel points, and the joint where the two leaves meet
      let gus = ''; for (let k = 1; k < 10; k++) gus += rect(pts[k] - 2, TT + 3, 4, 3) + rect(pts[k] - 2, TB - 5, 4, 3);
      body.push({ f: '@steel.2', d: gus, op: 0.9, detail: true }, { s: '@steel.3', w: 0.7, d: `M0 ${TT}V${TB}` });
      // the track deck along the whole length: the stringer cap, the ties, the running rail, the third-rail cover, the walkway railing
      body.push(['@steel.2', rect(-END, TT - 1.4, 2 * END, 1.4)]);
      let ties = ''; for (let x = -END + 1; x < END; x += 3.2) ties += `M${f1(x)} ${TT - 1.4}v-0.9`;
      body.push({ s: '@tie', w: 1.2, d: ties, detail: true }, { s: '@rail.0', w: 0.8, d: `M${-END} ${TT - 2.4}H${END}` }, { s: '@rail.1', w: 0.9, op: 0.9, d: `M${-END} ${TT - 1.9}H${END}`, detail: true });
      let posts = ''; for (let x = -END + 2; x < END; x += 6) posts += `M${x} ${TT - 1.4}v-4.4`;
      body.push({ s: '@steel.2', w: 0.5, op: 0.8, d: posts, detail: true }, { s: '@steel.1', w: 0.7, d: `M${-END} ${TT - 5.8}H${END}M${-END} ${TT - 3.6}H${END}` });
      // the bascule piers (stone, the coping, the shaded side, the timber fender at the waterline) and the tenders' houses
      for (const sg of sides) {
        const x0 = sg < 0 ? -PX - PW : PX, cx = sg * (PX + PW / 2);
        body.push(['@stone.0', rect(x0, -15, PW, 15)], ['@stone.2', rect(sg < 0 ? -PX - 8 : PX + PW - 8, -15, 8, 15), 0.7], ['@stone.3', rect(x0 - 1.5, -16.4, PW + 3, 2)]);
        body.push({ s: '@tie', w: 1.4, op: 0.8, d: `M${x0} -2H${x0 + PW}`, detail: true });
        // the house: stone walls with a plinth and a cornice, a hipped copper roof, two tall windows and a door
        body.push(['@stone.0', rect(cx - 12, -34, 24, 18)], ['@stone.1', rect(cx + 5, -34, 7, 18), 0.8], ['@stone.3', rect(cx - 13.5, -35.6, 27, 1.8)], ['@stone.1', rect(cx - 13, -17.6, 26, 1.6)]);
        body.push(['@roof.0', poly([[cx - 13, -35.6], [cx - 7, -42], [cx + 7, -42], [cx + 13, -35.6]])], ['@roof.1', poly([[cx + 2, -35.6], [cx + 5, -42], [cx + 7, -42], [cx + 13, -35.6]]), 0.8]);
        body.push({ f: '@glass', d: rect(cx - 9, -31, 4, 8) + rect(cx + 5, -31, 4, 8), glow: 'window' }, ['@steel.3', rect(cx - 2, -27, 4, 9.4)]);
        body.push({ s: '@stone.2', w: 0.4, op: 0.6, d: `M${cx - 12} -25H${cx + 12}M${cx - 7} -31v8M${cx + 7} -31v8`, detail: true });
        // night: the channel's green light on the pier's corner, the window light spilling on the stone
        const gx = sg * PX;
        body.push(['@green', ell(gx, -16.6, 0.8, 0.8)]);
        lit.push({ f: { rad: [[0, '@green', 0.75], [1, '@green', 0]], cx: gx, cy: -16.6, r: 4 }, d: ell(gx, -16.6, 4, 4) });
        lit.push({ f: { lin: [[0, '@flood', 0.35], [1, '@flood', 0]], x1: 0, y1: -23, x2: 0, y2: -16 }, d: rect(cx - 12, -23, 24, 7) });
      }
      // night: the red lights at the leaves' joint, the lamps' pool on the roadway
      body.push(['@red', ell(0, TB - 1, 0.8, 0.8)]);
      lit.push({ f: { rad: [[0, '@red', 0.8], [1, '@red', 0]], cx: 0, cy: TB - 1, r: 4 }, d: ell(0, TB - 1, 4, 4) });
      lit.push({ f: { lin: [[0, '@lamp', 0], [1, '@lamp', 0.3]], x1: 0, y1: RD - 9, x2: 0, y2: RD }, d: rect(-PX, RD - 9, 2 * PX, 9) });
      return { body, lit };
    },
  });
})();
