/* ============================================================
   SCENE LIBRARY: landmark.kl-tower (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the telecommunications tower in the hand-drawn kuala-lumpur-skyline art
   (`scene upgrade asia-southeast/kuala-lumpur-skyline --box 200,180,300,705`):
   - the real structure: the 421 m concrete telecommunications tower on its forest hill, a slim
     shaft that tapers a little to the head; the head (about 250 to 320 m) a ribbed bowl
     underneath, two glazed rings (the observation deck and, above it, the revolving restaurant)
     under a shallow ribbed roof, then a cylindrical crown, the antenna's cone and the mast
     with its small platforms; a low entrance hall at the foot with a row of arched windows
   - pale concrete, lit on the left and shaded on the right
   - night: the shaft washed in light from below, the head's rings bright, its underside and roof
     traced in violet and blue, the mast in white (the 'lit' part); the windows (glow); the beacon
   No text, no logos. Anchor: the ground at the middle of the foot.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const hw = h => 9.5 - (h - 16) / 232 * 2.6;   // the shaft's half-width from the hall (16 m) to the head (248 m)
  define({
    id: 'landmark.kl-tower', category: 'landmark', size: [90, 421], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      conc: ['#eceae6', '#cfcbc4', '#a29d96', '#7a766f'], glass: ['#4f6178', '#34425a', '#6f88a6'], roof: ['#dfe3e8', '#a9b2bd'],
      led: ['#9a7cff', '#5ab0ff'], lightW: '#f6f8ff', lightS: '#ffe6bc', beacon: '#ff4636',
    } },
    night: { glow: { window: '#ffe9be' }, on: 0.82 },
    shadow: { rx: 34, ry: 4, h: 70 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:kuala-lumpur', 'asia', 'asia-southeast', 'tower'],
    credit: 'native (scene engine upgrade), after the hand-drawn kuala-lumpur-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      const cyl = (x0, x1) => ({ lin: [[0, '@conc.1'], [0.3, '@conc.0'], [0.75, '@conc.2'], [1, '@conc.3']], x1: x0, y1: 0, x2: x1, y2: 0 });
      // the entrance hall: a low block with its row of arched windows, a canopy over the door
      body.push(['@conc.1', rect(-44, -9, 12, 9)], ['@conc.2', rect(32, -9, 12, 9)]);
      body.push(['@conc.1', rect(-34, -15, 34, 15)], ['@conc.2', rect(0, -15, 34, 15)], ['@conc.0', rect(-35.5, -17, 71, 2.2)]);
      let arches = '';
      for (let x = -30; x < 30; x += 7.5) arches += `M${x} -3V-9.5a2.4 2.4 0 0 1 4.8 0V-3z`;
      body.push({ f: '@glass.0', d: arches, glow: 'window' }, ['@conc.3', rect(-9, -4, 18, 4)], ['@conc.0', rect(-11, -5.2, 22, 1.3)]);
      // the shaft, in bands (construction lifts), lit on the left
      const S = [16, 64, 112, 160, 208, 248];
      for (let i = 0; i < S.length - 1; i++) {
        const a = S[i], b = S[i + 1];
        body.push({ f: cyl(-hw(a), hw(a)), d: poly([[-hw(a), -a], [hw(a), -a], [hw(b), -b], [-hw(b), -b]]) });
        body.push({ s: '@conc.2', w: 0.5, op: 0.5, d: `M${f1(-hw(b))} ${-b}H${f1(hw(b))}`, detail: true });
      }
      // the lift windows: a narrow glazed slot up the shaft's lit side
      body.push({ f: '@glass.1', d: poly([[-4.6, -18], [-2.4, -18], [-2.2, -246], [-4, -246]]), op: 0.7 }, { s: '@conc.0', w: 0.5, op: 0.8, d: 'M-4.8 -18L-4.2 -246', detail: true });
      for (let h = 30; h < 244; h += 14) cells.push([-4.4, -h - 2, 1.8, 2]);
      body.push({ s: '@conc.0', w: 1, op: 0.8, d: `M${f1(-hw(16))} -16L${f1(-hw(248))} -248` }, { s: '@conc.3', w: 1, op: 0.8, d: `M${f1(hw(16))} -16L${f1(hw(248))} -248` });
      // the head: the ribbed bowl underneath (248 to 270 m)
      const bowl = 'M-6.9 -248C-12 -252 -20 -260 -24.5 -270H24.5C20 -260 12 -252 6.9 -248z';
      body.push({ f: { lin: [[0, '@conc.1'], [0.3, '@conc.0'], [0.7, '@conc.2'], [1, '@conc.3']], x1: -24.5, y1: 0, x2: 24.5, y2: 0 }, d: bowl });
      let ribs = '';
      for (let k = -5; k <= 5; k++) { const u = k / 5.5; ribs += `M${f1(u * 6.9)} -248Q${f1(u * 15)} -256 ${f1(u * 24.5)} -270`; }
      body.push({ s: '@conc.3', w: 0.7, op: 0.75, d: ribs });
      // the rim, the observation deck's glazed ring, the band between, the restaurant's ring
      const ring = (a, b, w0, w1, f, op) => body.push([f, poly([[-w0, -a], [w0, -a], [w1, -b], [-w1, -b]]), op]);
      ring(270, 273, 25.5, 25.5, '@conc.0'); ring(273, 281, 24.5, 25.8, '@glass.0', 1); ring(281, 283.5, 26.4, 26.4, '@conc.1'); ring(283.5, 291.5, 25.8, 24, '@glass.1', 1); ring(291.5, 293.5, 24.6, 24.6, '@conc.1');
      body.push(['@glass.2', poly([[-24.5, -273], [-8, -273], [-8.5, -281], [-25.8, -281]]), 0.45], ['@glass.2', poly([[-25.8, -283.5], [-8.5, -283.5], [-8, -291.5], [-24, -291.5]]), 0.4]);
      let mull = '';
      for (let x = -22; x <= 22; x += 4) mull += `M${x} -273.3V-280.7M${f1(x * 0.97)} -283.8V-291.2`;
      body.push({ s: '@conc.2', w: 0.6, op: 0.7, d: mull, detail: true });
      for (let x = -23; x < 21; x += 6) cells.push([x, -279.6, 4.4, 5], [x + 1.5, -290, 4.4, 5]);
      // the roof: a shallow ribbed cone up to the crown, the crown's drum, the antenna's cone and the mast
      body.push({ f: { lin: [[0, '@roof.0'], [0.7, '@roof.1']], x1: -24, y1: 0, x2: 24, y2: 0 }, d: 'M-24 -293.5C-18 -298 -12 -301 -8 -304H8C12 -301 18 -298 24 -293.5z' });
      let rr = '';
      for (let k = -4; k <= 4; k++) rr += `M${f1(k * 5.8)} -293.6L${f1(k * 1.9)} -303.8`;
      body.push({ s: '@roof.1', w: 0.6, op: 0.8, d: rr, detail: true });
      body.push(['@conc.1', rect(-7.5, -320, 7.5, 16)], ['@conc.2', rect(0, -320, 7.5, 16)], ['@conc.0', rect(-8.5, -321.5, 17, 1.8)], ['@conc.0', rect(-8.5, -305.5, 17, 1.6)]);
      let sl = ''; for (let x = -6; x <= 5; x += 2.4) sl += rect(x, -317, 1, 9);
      body.push({ f: '@glass.1', d: sl, op: 0.85 });
      // the microwave dishes on the crown, two a side
      for (const [x, y, k] of [[-9.6, -309, -1], [-9.2, -315.5, -1], [9.6, -309, 1], [9.2, -315.5, 1]]) body.push([k < 0 ? '@roof.0' : '@roof.1', ell(x, y, 1.6, 2.4)]);
      // the collar where the shaft meets the head, and the shadow under the rim
      body.push(['@conc.2', rect(-7.6, -251, 15.2, 3)], ['@conc.3', rect(-25.5, -270.6, 51, 0.9), 0.7]);
      body.push(['@roof.0', poly([[-5.5, -321.5], [0, -321.5], [0, -338], [-2.6, -338]])], ['@roof.1', poly([[0, -321.5], [5.5, -321.5], [2.6, -338], [0, -338]])]);
      const MS = [[338, 366, 2.2, 1.8], [366, 392, 1.7, 1.3], [392, 410, 1.2, 0.9], [410, 421, 0.8, 0.4]];
      MS.forEach(([a, b, w0, w1]) => {
        body.push(['@roof.0', poly([[-w0, -a], [0, -a], [0, -b], [-w1, -b]])], ['@roof.1', poly([[0, -a], [w0, -a], [w1, -b], [0, -b]])]);
        body.push(['@conc.2', rect(-w0 - 1.6, -a - 1, 2 * w0 + 3.2, 1.2)]);
      });
      let tick = ''; for (let h = 342; h < 408; h += 6) tick += `M-1.8 ${-h}H1.8`;
      body.push({ s: '@roof.1', w: 0.5, op: 0.8, d: tick, detail: true });
      body.push(['@beacon', ell(0, -421.4, 0.8, 0.8)], ['@beacon', ell(0, -338.8, 0.8, 0.8), 0.9]);
      sceneDraw.winGroups(r, cells, 8).forEach(d => body.push({ f: '@glass.1', d, op: 0.5, glow: 'window', detail: true }));
      // night: the shaft washed from below, the head's rings bright, its ribs in violet and blue, the mast in white, the beacon
      lit.push({ f: { lin: [[0, '@lightS', 0.55], [0.5, '@lightW', 0.25], [1, '@lightW', 0.12]], x1: 0, y1: -16, x2: 0, y2: -248 }, d: poly([[-hw(16), -16], [hw(16), -16], [hw(248), -248], [-hw(248), -248]]) });
      lit.push({ s: '@led.0', w: 1, op: 0.85, d: ribs }, { s: '@led.1', w: 0.9, op: 0.8, d: rr }, { f: '@led.0', d: poly([[-25.5, -270], [25.5, -270], [25.5, -273], [-25.5, -273]]), op: 0.9 }, { f: '@led.1', d: rect(-24.6, -293.5, 49.2, 2), op: 0.9 });
      lit.push({ f: '@lightW', d: poly([[-24.5, -273], [24.5, -273], [25.8, -281], [-25.8, -281]]), op: 0.55 }, { f: '@lightS', d: poly([[-25.8, -283.5], [25.8, -283.5], [24, -291.5], [-24, -291.5]]), op: 0.5 });
      lit.push({ f: '@led.1', d: rect(-7.5, -320, 15, 16), op: 0.45 }, { s: '@lightW', w: 1.2, op: 0.85, d: 'M0 -322V-419' });
      lit.push({ f: { rad: [[0, '@beacon', 0.7], [1, '@beacon', 0]], cx: 0, cy: -421.4, r: 4.5 }, d: ell(0, -421.4, 4.5, 4.5) }, ['@beacon', ell(0, -421.4, 1.3, 1.3)]);
      return { body, lit };
    },
  });
})();
