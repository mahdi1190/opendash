/* ============================================================
   SCENE LIBRARY: landmark.st-pauls-facade (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Drawn by hand after the old facade on its hill in the hand-drawn macau-skyline art (its tiers,
   arched openings and pediment over a stair; `scene upgrade asia-east/macau-skyline --dry-run`
   cannot parse that art, so nothing was extracted):
   - the real structure: the granite facade that stands alone above its long stone stair in the
     old town of Macau, all that remains of the church behind it; five tiers that narrow upwards:
     two full-width tiers with columns (three doorways, then three windows and side niches), a
     narrower third tier with small obelisks on the cornice, a fourth with scrolls at its sides,
     and the triangular pediment; the stair below in three flights with landings and side walls
   - drawn as ARCHITECTURE ONLY, respectfully: the niches are empty, there are no statues,
     reliefs, inscriptions or symbols, and the pediment carries a plain finial. The doorways and
     windows are open to the sky (holes in the stone), as at the real facade
   - weathered granite lit from the left: the columns' lit faces, the cornices' shadow lines
   - night: the facade floodlit warm from below, the stair's edges and the side walls' lamps
     (the 'lit' part and glow)
   No text, no figures, no emblems. Anchor: the foot of the stair at its middle. 4 units = 1 m.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // openings as holes: wound against the tier's outline (rect() is clockwise), so the sky shows through
  const arch = (x, yb, w, h) => `M${f1(x - w / 2)} ${f1(yb)}h${f1(w)}v${f1(-(h - w / 2))}a${f1(w / 2)} ${f1(w / 2)} 0 0 0 ${f1(-w)} 0z`;
  const box = (x, yb, w, h) => `M${f1(x - w / 2)} ${f1(yb)}h${f1(w)}v${f1(-h)}h${f1(-w)}z`;
  const archF = (x, yb, w, h) => `M${f1(x - w / 2)} ${f1(yb)}v${f1(-(h - w / 2))}a${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(w)} 0v${f1(h - w / 2)}z`;   // a filled arch (a niche)
  define({
    id: 'landmark.st-pauls-facade', category: 'landmark', size: [140, 152], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#dccfb6', '#c0b195', '#9c8e74', '#6e6450'], deep: ['#4c443a', '#302b25'], step: ['#d2c5ac', '#ad9f86', '#887c68'],
      wash: '#ffd9a0', lamp: '#ffe4b0',
    } },
    night: { glow: { lamp: '#ffe4b0' }, on: 0.85 },
    shadow: { rx: 70, ry: 4, h: 40 },
    reflect: false,
    tags: ['landmark', 'place:asia/place:macau', 'asia', 'asia-east', 'facade', 'architecture', 'old-town'],
    credit: 'native (scene engine upgrade), after the hand-drawn macau-skyline art',
    build() {
      const body = [], lit = [];
      // the stair: three flights and two landings, the steps' nosings in the light, the side walls stepping down
      const F = [[0, -11, 66, 61], [-13, -22, 58, 54], [-23.5, -30, 52, 49]], LND = [[-11, -13, 61, 58], [-22, -23.5, 54, 52]];
      F.forEach(([y0, y1, w0, w1]) => {
        body.push(['@step.1', poly([[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]])]);
        let st = ''; const n = Math.round((y0 - y1) / 1.9);
        for (let i = 1; i <= n; i++) { const y = y0 + (y1 - y0) * i / n, w = w0 + (w1 - w0) * i / n; st += `M${f1(-w)} ${f1(y)}H${f1(w)}`; }
        body.push({ s: '@step.0', w: 0.7, op: 0.9, d: st }, { s: '@step.2', w: 0.5, op: 0.6, d: st, m: [1, 0, 0, 1, 0, 0.8], detail: true });
      });
      LND.forEach(([y0, y1, w0, w1]) => body.push(['@step.0', poly([[-w0, y0], [w0, y0], [w1, y1], [-w1, y1]])]));
      const wall = sg => poly([[sg * 66, 0], [sg * 72, 0], [sg * 72, -6], [sg * 63, -12], [sg * 60, -14], [sg * 60, -18], [sg * 56, -24], [sg * 55, -27], [sg * 55, -32], [sg * 50, -32], [sg * 52, -23.5], [sg * 54, -22], [sg * 58, -13], [sg * 61, -11]]);
      body.push(['@stone.1', wall(-1)], ['@stone.2', wall(1)]);
      body.push({ s: '@stone.0', w: 0.8, op: 0.8, d: 'M-72 -6L-63 -12L-60 -14V-18L-56 -24L-55 -27V-32' }, { s: '@stone.3', w: 0.8, op: 0.7, d: 'M72 -6L63 -12L60 -14V-18L56 -24L55 -27V-32' });
      // the balustrades along the side walls (fine), the lamps on their posts (glow)
      let bal = ''; for (const sg of [-1, 1]) for (let k = 0; k < 7; k++) { const x = sg * (70 - k * 2.6), y = -6 - k * 3.6; bal += `M${f1(x)} ${f1(y + 2)}v-3`; }
      body.push({ s: '@stone.2', w: 0.6, op: 0.7, d: bal, detail: true });
      body.push(['@deep.0', rect(-71, -14, 1.2, 8) + rect(69.8, -14, 1.2, 8) + rect(-56.6, -38, 1.2, 6) + rect(55.4, -38, 1.2, 6)]);
      body.push({ f: '@stone.3', d: ell(-70.4, -14.6, 1.6, 1.2) + ell(70.4, -14.6, 1.6, 1.2) + ell(-56, -38.6, 1.5, 1.1) + ell(56, -38.6, 1.5, 1.1), glow: 'lamp' });
      // the terrace in front of the facade, its plinth
      body.push(['@step.0', rect(-50, -32, 100, 2)], ['@stone.2', rect(-47.5, -35, 95, 3)], ['@stone.0', rect(-47.5, -35, 95, 0.9)]);
      // tier 1: the wall with three doorways (open), ten columns
      const T1 = rect(-46, -61, 92, 26) + arch(0, -35, 13, 22) + box(-22, -35, 9, 17) + box(22, -35, 9, 17);
      body.push(['@stone.1', T1], ['@stone.0', rect(-46, -61, 30, 26) + box(-22, -35, 9, 17), 0.35]);
      // tier 2: three windows (open), two empty niches, ten columns
      const T2 = rect(-46, -88, 92, 24) + arch(0, -67, 11, 16) + arch(-22, -68, 8, 13) + arch(22, -68, 8, 13);
      body.push(['@stone.1', T2], ['@stone.0', rect(-46, -88, 30, 24) + arch(-22, -68, 8, 13), 0.35]);
      body.push(['@deep.1', archF(-39, -70, 5, 12) + archF(39, -70, 5, 12)], ['@deep.0', archF(-39, -70, 5, 12), 0.6]);
      // tier 3 (narrower): two windows (open), the empty central niche, eight columns
      const T3 = rect(-34, -111, 68, 20) + arch(-21, -94, 7, 12) + arch(21, -94, 7, 12);
      body.push(['@stone.1', T3], ['@stone.0', rect(-34, -111, 22, 20) + arch(-21, -94, 7, 12), 0.35], ['@deep.1', archF(0, -94, 9, 14)]);
      // tier 4 (narrower still): the empty central niche, plain panels, the scrolls at its sides
      body.push(['@stone.1', rect(-21, -129, 42, 15.5)], ['@stone.0', rect(-21, -129, 14, 15.5), 0.35], ['@deep.1', archF(0, -116, 8, 11)]);
      body.push(['@stone.2', rect(-16, -126, 6, 9) + rect(10, -126, 6, 9), 0.55]);
      for (const sg of [-1, 1]) {
        body.push([sg < 0 ? '@stone.1' : '@stone.2', `M${sg * 21} -128Q${sg * 23} -117 ${sg * 30} -114H${sg * 21}z`]);
        body.push({ s: '@stone.3', w: 0.7, op: 0.8, d: `M${sg * 21} -128Q${sg * 23} -117 ${sg * 30} -114`, detail: true }, [sg < 0 ? '@stone.0' : '@stone.2', ell(sg * 29, -115.6, 1.6, 1.6)]);
      }
      // the pediment: the triangle, its recessed field, the plain finial and the corner balls
      body.push(['@stone.1', poly([[-23, -131], [0, -147], [23, -131]])], ['@stone.2', poly([[-17, -132.4], [0, -143.6], [17, -132.4]]), 0.6], ['@stone.0', poly([[-23, -131], [0, -147], [-1.5, -146]]), 0.6]);
      body.push(['@stone.2', rect(-1.4, -151, 2.8, 4)], ['@stone.1', ell(0, -151.4, 1.6, 1.6)], ['@stone.1', ell(-22, -132.6, 1.4, 1.4) + ell(22, -132.6, 1.4, 1.4)]);
      // the cornices (lit tops, shadow lines under)
      const CO = [[-64, 48, 3], [-91, 48, 3], [-113.5, 36, 2.5], [-131, 23, 2]];
      CO.forEach(([y, w, h]) => { body.push(['@stone.0', rect(-w, y, 2 * w, h)], ['@stone.3', rect(-w + 1, y + h, 2 * w - 2, 1), 0.6]); });
      // the columns: lit faces, shaded edges, bases and capitals (one path each per tier)
      const cols = (xs, y0, y1, w) => {
        let a = '', b = '', c = '';
        for (const x of xs) { a += rect(x - w / 2, y1, w, y0 - y1); b += rect(x + w / 6, y1, w / 3, y0 - y1); c += rect(x - w / 2 - 0.7, y0 - 1.4, w + 1.4, 1.4) + rect(x - w / 2 - 0.9, y1, w + 1.8, 1.6); }
        body.push(['@stone.0', a], { f: '@stone.2', d: b, op: 0.8, detail: true }, { f: '@stone.2', d: c, detail: true });
      };
      const X1 = [-44, -34, -30, -14, -10, 10, 14, 30, 34, 44];
      cols(X1, -35, -61, 2.8); cols(X1, -64, -88, 2.6); cols([-32, -28, -12, -8, 8, 12, 28, 32], -91, -111, 2.4); cols([-19, -6, 6, 19], -113.5, -129, 2);
      // the obelisks on the second and third cornices, with their ball tips
      const ob = (x, y, h, w) => { body.push(['@stone.2', rect(x - w * 0.6, y - 2.4, w * 1.2, 2.4)], [x < 0 ? '@stone.0' : '@stone.1', poly([[x - w / 2, y - 2.4], [x, y - 2.4 - h], [x + w / 2, y - 2.4]])], { f: '@stone.2', d: poly([[x, y - 2.4 - h], [x + w / 2, y - 2.4], [x + w * 0.1, y - 2.4]]), op: 0.7, detail: true }, ['@stone.1', ell(x, y - 3.4 - h, 1, 1)]); };
      ob(-42, -91, 13, 5); ob(42, -91, 13, 5); ob(-32, -113.5, 9, 4); ob(32, -113.5, 9, 4);
      // weathering: dark streaks below the cornices and round the openings (fine), the openings' reveals
      let wx = ''; for (const [x, y, h] of [[-38, -61, 9], [-6, -61, 6], [26, -61, 11], [-25, -88, 7], [17, -88, 5], [40, -88, 8], [-28, -111, 6], [9, -111, 5]]) wx += rect(x, y, 1.6, h);
      body.push({ f: '@stone.3', d: wx, op: 0.3, detail: true }, { s: '@deep.0', w: 0.9, op: 0.55, d: arch(0, -35, 13, 22) + box(-22, -35, 9, 17) + box(22, -35, 9, 17) + arch(0, -67, 11, 16) + arch(-22, -68, 8, 13) + arch(22, -68, 8, 13) + arch(-21, -94, 7, 12) + arch(21, -94, 7, 12), detail: true });
      let jt = ''; for (const [y0, y1, w] of [[-35, -61, 46], [-64, -88, 46], [-91, -111, 34]]) for (let y = y0 - 5; y > y1; y -= 5) jt += `M${-w} ${y}H${w}`;
      body.push({ s: '@stone.2', w: 0.4, op: 0.45, d: jt, detail: true });
      // night: the facade floodlit warm from below (stronger low down), the cornices' edges, the stair's nosings
      const face = rect(-46, -61, 92, 26) + rect(-46, -88, 92, 24) + rect(-34, -111, 68, 20) + rect(-21, -129, 42, 15.5) + poly([[-23, -131], [0, -147], [23, -131]]);
      lit.push({ f: { lin: [[0, '@wash', 0.5], [0.6, '@wash', 0.26], [1, '@wash', 0.14]], x1: 0, y1: -35, x2: 0, y2: -150 }, d: face + arch(0, -35, 13, 22) + box(-22, -35, 9, 17) + box(22, -35, 9, 17) + arch(0, -67, 11, 16) + arch(-22, -68, 8, 13) + arch(22, -68, 8, 13) + arch(-21, -94, 7, 12) + arch(21, -94, 7, 12) });
      lit.push({ s: '@wash', w: 0.9, op: 0.75, d: CO.map(([y, w]) => `M${-w} ${y}H${w}`).join('') }, { s: '@wash', w: 0.7, op: 0.5, d: [-44, -34, -30, -14, -10, 10, 14, 30, 34, 44].map(x => `M${x - 1.2} -36V-87`).join('') });
      lit.push({ s: '@lamp', w: 0.8, op: 0.55, d: 'M-49 -30H49M-52 -23.5H52M-58 -13H58' });
      return { body, lit };
    },
  });
})();
