/* ============================================================
   SCENE LIBRARY: landmark.margaret-hunt-hill-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The white arch bridge over the Trinity at Dallas (2012), seen broadside. Drawn by hand for the
   composed dallas-skyline scene (the hand-drawn art's arch and cables were only a reference):
   - the real structure: one tall white steel arch (about 122 m over the deck) springing from the
     middle of the deck at both ends of the main span, its box section thickest at the feet; the
     58 stay cables in pairs from each node of the arch to the two edges of the deck, so seen from
     the side each pair splays (the twisted fan); the deck's white edge girder, its parapet and
     lamps; heavy piers under the arch's feet and lighter ones under the approach viaduct
   - white steel lit from the left, the deck's underside in shade, a waterline stain on the piers
   - night: the arch floodlit (the 'lit' part, a cool white with a soft halo), the cables catching
     the light, the deck lamps (glow)
   No text. Anchor: the waterline under the middle of the arch; the deck runs on to x = -430 and
   x = 830 (stylised: the viaduct crosses the whole view).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const DECK = -17.5, SOFF = -12, A = 168, RISE = 122, X0 = -430, X1 = 830;   // deck top and underside, the arch's half-span and rise, the deck's ends
  const arch = x => DECK - RISE * (1 - (x / A) * (x / A));                     // the arch's centreline
  const NODES = 29, NODE = k => -156.8 + 11.2 * k;                              // the 29 nodes of the arch, each anchoring a pair of the 58 cables
  const half = x => 2.2 + 2 * Math.pow(Math.abs(x) / A, 2);                  // half its depth: thickest at the feet
  define({
    id: 'landmark.margaret-hunt-hill-bridge', category: 'landmark', size: [1260, 142], box: [X0, -142, X1, 2], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#f6f7f8', '#dfe3e6', '#b8bfc6', '#8c949c'], conc: ['#d6d2ca', '#b2ada4', '#8a857c', '#5e5a54'], cable: ['#e8ecf0', '#a8b0b8'],
      stain: '#4c5a50', flood: '#f4f8ff', floodHalo: '#c8dcff', lamp: '#ffe6b0',
    } },
    night: { glow: { lamp: '#ffe2a0' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:texas/place:dallas', 'texas', 'bridge', 'arch-bridge', 'river'],
    credit: 'native, drawn for the composed dallas-skyline scene (after the hand-drawn art)',
    build() {
      const body = [], lit = [];
      // the piers: the approach viaduct's (lighter, every 60 m) and the heavy ones under the arch's feet, each with its cap
      const piers = [];
      for (let x = -A - 60; x > X0 + 10; x -= 60) piers.push(x);
      for (let x = A + 60; x < X1 - 10; x += 60) piers.push(x);
      for (const x of piers) body.push({ f: { lin: [[0, '@conc.1'], [0.4, '@conc.0'], [1, '@conc.2']], x1: x - 3, y1: 0, x2: x + 3, y2: 0 }, d: poly([[x - 2.4, 0], [x + 2.4, 0], [x + 3.2, SOFF], [x - 3.2, SOFF]]) });
      body.push({ f: '@conc.3', d: piers.map(x => rect(x - 4, SOFF - 0.2, 8, 1.4)).join(''), op: 0.8 });
      for (const sg of [-1, 1]) {
        const x = sg * A;
        body.push({ f: { lin: [[0, '@conc.1'], [0.35, '@conc.0'], [1, '@conc.3']], x1: x - 7, y1: 0, x2: x + 7, y2: 0 }, d: poly([[x - 5.5, 0], [x + 5.5, 0], [x + 7, SOFF], [x - 7, SOFF]]) });
        body.push({ f: '@conc.3', d: rect(x - 7.8, SOFF - 0.4, 15.6, 1.8), op: 0.85 }, { f: '@conc.3', d: rect(x + 2.2, -10.5, 4.6, 10.5), op: 0.35, detail: true });
      }
      body.push({ f: '@stain', d: piers.concat([-A, A]).map(x => rect(x - (Math.abs(x) === A ? 5.6 : 2.5), -1.8, Math.abs(x) === A ? 11.2 : 5, 1.8)).join(''), op: 0.45, detail: true });
      // the cables, behind the arch: from each node a pair splays down to the two edges of the deck (the far edge's cable
      // leans in, the near edge's leans out), so the pairs cross into the twisted fan
      for (let k = 0; k < NODES; k++) {
        const x = NODE(k);
        const y = f1(arch(x) + half(x)), far = f1(x * 0.84), near = f1(x * 1.14);
        body.push({ s: k % 2 ? '@cable.1' : '@cable.0', w: 0.45, op: 0.75, d: `M${f1(x)} ${y}L${far} ${DECK - 1}M${f1(x)} ${y}L${near} ${DECK - 0.6}` });
      }
      // the deck: the underside in shade, the edge girder, the parapet and the barrier between the lanes and the walk
      body.push({ f: '@conc.3', d: rect(X0, SOFF - 1, X1 - X0, 2.2), op: 1 });
      body.push({ f: { lin: [[0, '@steel.0'], [0.6, '@steel.1'], [1, '@steel.2']], x1: 0, y1: DECK, x2: 0, y2: SOFF }, d: rect(X0, DECK, X1 - X0, DECK * -1 + SOFF) });
      body.push({ f: '@steel.0', d: rect(X0, DECK - 1.2, X1 - X0, 1.2) }, { s: '@steel.2', w: 0.3, op: 0.7, d: `M${X0} ${DECK - 2.6}H${X1}`, detail: true });
      let rail = ''; for (let x = X0 + 2; x < X1; x += 3) rail += `M${x} ${DECK - 1.2}V${DECK - 2.6}`;
      body.push({ s: '@steel.2', w: 0.2, op: 0.55, d: rail, detail: true });
      let joints = ''; for (const x of piers.concat([-A, A])) joints += `M${x} ${DECK}V${SOFF}`;
      body.push({ s: '@steel.3', w: 0.3, op: 0.6, d: joints, detail: true });
      // the arch: its box section (thick at the feet), the light on its left flank and outer edge, the shade on its inner edge
      const outer = [], inner = [];
      for (let x = -A; x <= A + 0.01; x += 6) { outer.push([x, arch(x) - half(x)]); inner.push([x, arch(x) + half(x)]); }
      body.push({ f: { lin: [[0, '@steel.0'], [0.5, '@steel.1'], [1, '@steel.2']], x1: -A, y1: 0, x2: A, y2: 0 }, d: poly(outer.concat(inner.slice().reverse())) });
      body.push({ s: '@steel.0', w: 0.8, op: 0.95, d: 'M' + outer.filter(p => p[0] <= 30).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') });
      body.push({ s: '@steel.3', w: 1.4, op: 0.85, d: 'M' + inner.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') });
      body.push({ s: '@steel.2', w: 0.7, op: 0.6, d: 'M' + outer.filter(p => p[0] >= 60).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') });
      // the welded segments of the arch, the cable anchors along its underside and along the deck edge
      let seg = ''; for (let x = -A + 15; x < A; x += 15) seg += `M${f1(x)} ${f1(arch(x) - half(x))}L${f1(x)} ${f1(arch(x) + half(x))}`;
      body.push({ s: '@steel.2', w: 0.25, op: 0.6, d: seg, detail: true });
      let anc = ''; for (let k = 0; k < NODES; k++) { const x = NODE(k); anc += ell(x, arch(x) + half(x) + 0.3, 0.6, 0.4) + rect(x * 1.14 - 0.4, DECK - 1.6, 0.8, 1) + rect(x * 0.84 - 0.4, DECK - 1.4, 0.8, 0.8); }
      body.push({ f: '@steel.3', d: anc, op: 0.8, detail: true });
      // the arch's feet: the nodes where it lands on the deck, and the floodlight housings beside them
      for (const sg of [-1, 1]) body.push({ f: sg < 0 ? '@steel.1' : '@steel.2', d: poly([[sg * (A + 6), DECK], [sg * (A - 6), DECK], [sg * (A - 4), DECK - 8], [sg * (A + 1), DECK - 6]]) }, { f: '@conc.3', d: rect(sg * A - 3 - sg * 9, DECK - 1.8, 6, 1.8), detail: true });
      // the deck lamps along the walk (their heads lit at dusk in three groups)
      let poles = ''; const heads = ['', '', ''], pools = ['', '', ''];
      for (let x = X0 + 18, i = 0; x < X1; x += 36, i++) { if (Math.abs(Math.abs(x) - A) < 12) continue; poles += `M${x} ${DECK - 1}V${DECK - 9}h1.4`; heads[i % 3] += ell(x + 1.6, DECK - 9.2, 0.9, 0.6); pools[i % 3] += ell(x + 1.6, DECK - 9.2, 2.6, 1.8); }
      // the barrier between the lanes and the walk, and the sun catching the crown of the arch
      body.push({ s: '@steel.1', w: 0.5, op: 0.8, d: `M${X0} ${DECK - 0.8}H${X1}`, detail: true });
      body.push({ s: '#ffffff', w: 1, op: 0.6, d: 'M' + [-40, -24, -8, 8].map(x => f1(x) + ' ' + f1(arch(x) - half(x) + 0.2)).join('L'), detail: true });
      body.push({ s: '@conc.3', w: 0.35, op: 0.8, d: poles, detail: true });
      heads.forEach(h => body.push({ f: '@lamp', d: h, glow: 'lamp', op: 0.9 }));
      // night: the arch floodlit from its feet (a halo and the bright section), the cables catching the light, the deck's edge lit
      const centre = []; for (let x = -A; x <= A + 0.01; x += 8) centre.push([x, arch(x)]);
      const cl = 'M' + centre.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
      lit.push({ s: '@floodHalo', w: 12, op: 0.16, d: cl }, { s: '@flood', w: 3.6, op: 0.75, d: cl });
      let cab = ''; for (let k = 0; k < NODES; k++) { const x = NODE(k), y = f1(arch(x) + half(x)); cab += `M${f1(x)} ${y}L${f1(x * 0.84)} ${DECK - 1}M${f1(x)} ${y}L${f1(x * 1.14)} ${DECK - 0.6}`; }
      lit.push({ s: '@floodHalo', w: 0.5, op: 0.45, d: cab }, { f: '@lamp', d: rect(X0, DECK - 0.6, X1 - X0, 0.8), op: 0.35 });
      // the floodlights at the arch's feet, and the deck lamps' pools of light
      for (const sg of [-1, 1]) lit.push({ f: { rad: [[0, '@flood', 0.8], [1, '@floodHalo', 0]], cx: sg * (A - 9), cy: DECK - 2, r: 6 }, d: ell(sg * (A - 9), DECK - 2, 6, 4) });
      pools.forEach(h => lit.push({ f: '@lamp', d: h, op: 0.22 }));
      return { body, lit };
    },
  });
})();
