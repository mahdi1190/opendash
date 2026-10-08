/* ============================================================
   SCENE LIBRARY: landmark.burj-khalifa (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the tapering tower in the hand-drawn dubai-skyline art
   (`scene upgrade asia-west/dubai-skyline --box 800,10,920,645`):
   - the real structure: the 828 m tower on its Y-shaped plan, three wings round a central core
     that step back one after another as it rises, so each side of the silhouette steps in at
     its own heights (the setbacks spiral up the tower); the occupied shaft ends near 600 m and
     a slender tapering spire with small rings carries it to the tip; a low podium at its foot
   - silver glass and steel: the vertical fins of the cladding, the front wing's nose as a pale
     band up the middle, lit to the left, turning into shade to the right; ledges at each setback
   - night: the setbacks traced in white light, pale light strips up the cladding, the spire
     aglow and the aviation beacon at the tip (the 'lit' part); the windows (glow)
   No text, no logos, no screen images. Anchor: the ground at the middle of the front. 1 unit = 1 m.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // the tiers of each side [from, to, half-width]: the two sides step in at different heights (the spiral of setbacks)
  const TL = [[0, 150, 62], [150, 225, 57], [225, 295, 51], [295, 362, 45], [362, 425, 39], [425, 482, 33], [482, 532, 27], [532, 575, 21], [575, 606, 15], [606, 640, 10]];
  const TR = [[0, 118, 60], [118, 190, 55], [190, 262, 49], [262, 330, 43], [330, 395, 37], [395, 455, 31], [455, 508, 25], [508, 555, 19], [555, 592, 13], [592, 640, 9]];
  const hwAt = (T, h) => { for (const t of T) if (h >= t[0] && h < t[1]) return t[2]; return 8; };
  const side = (T, k) => { const o = []; for (const t of T) o.push([k * t[2], -t[0]], [k * t[2], -t[1]]); return o; };   // the stepped outline, bottom to top
  const nose = h => Math.min(7, hwAt(TL, h) * 0.45);                                                                // the front wing's half-width
  define({
    id: 'landmark.burj-khalifa', category: 'landmark', size: [124, 828], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#e2e9ef', '#b7c5d2', '#8496aa', '#5d6e83'], fin: '#f2f6f9', spire: ['#d4dce4', '#909eae'],
      base: ['#cdbfa8', '#9d9180'], dark: '#3c4858', lightW: '#f6faff', blue: '#cfe2ff', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#fff1d6' }, on: 0.8 },
    shadow: { rx: 70, ry: 5, h: 120 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:dubai', 'asia', 'asia-west', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn dubai-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const L = side(TL, -1), Rt = side(TR, 1);
      // the whole height in two faces (what a small still keeps): the lit left and the shaded right
      body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -62, y1: 0, x2: 0, y2: 0 }, d: poly([[0, 0]].concat(L, [[0, -640]])) },
        { f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: 0, y1: 0, x2: 60, y2: 0 }, d: poly([[0, 0]].concat(Rt, [[0, -640]])) });
      // each tier of each side: its own face, the steel fins and the ledge at its top
      for (const [T, k] of [[TL, -1], [TR, 1]]) {
        T.forEach(([a, b, w], i) => {
          const lin = k < 0 ? [[0, '@glass.0'], [0.7, '@glass.1'], [1, '@glass.2']] : [[0, '@glass.2'], [0.5, '@glass.3'], [1, '@glass.2']];
          body.push({ f: { lin, x1: k * w, y1: 0, x2: 0, y2: 0 }, d: rect(Math.min(0, k * w), -b, w, b - a), detail: true });
          let fins = '';
          for (let x = 3.5; x < w - 1; x += 4.5) fins += `M${f1(k * x)} ${-a - 1}V${-b + 1}`;
          body.push({ s: k < 0 ? '@fin' : '@glass.1', w: 0.7, op: k < 0 ? 0.55 : 0.3, d: fins, detail: true });
          const next = T[i + 1];
          if (next) body.push({ s: k < 0 ? '@fin' : '@glass.1', w: 1.4, op: 0.9, d: `M${f1(k * w)} ${-b}H${f1(k * next[2])}`, detail: true });
        });
      }
      // the front wing's nose: a pale band up the middle with its shadow line
      const ns = []; for (let h = 0; h <= 640; h += 20) ns.push(h);
      body.push(['@glass.0', poly(ns.map(h => [-nose(h), -h]).concat(ns.slice().reverse().map(h => [nose(h) * 0.4, -h]))), 0.75]);
      body.push({ s: '@glass.3', w: 1.1, op: 0.7, d: 'M' + ns.map(h => f1(nose(h) * 0.4) + ' ' + -h).join('L') });
      // the edges: sunlit left, shaded right
      body.push({ s: '@fin', w: 1, op: 0.85, d: 'M' + L.map(p => f1(p[0]) + ' ' + p[1]).join('L') }, { s: '@glass.3', w: 1, op: 0.9, d: 'M' + Rt.map(p => f1(p[0]) + ' ' + p[1]).join('L') });
      // the windows: ribbon rows across the shaft (a few cells per row, so the tile stays light)
      const cells = [];
      for (let h = 10; h < 630; h += 16) { const wl = hwAt(TL, h), wr = hwAt(TR, h); for (let x = -wl + 3; x < wr - 9; x += 13) cells.push([x, -h - 3, 9, 2.6]); }
      sceneDraw.winGroups(r, cells, 8).forEach(d => body.push({ f: '@dark', d, op: 0.32, glow: 'window', detail: true }));
      // the spire: a tapering needle from the top of the shaft, its rings, the beacon
      body.push(['@spire.0', poly([[-8, -640], [-0.7, -828], [0, -828], [0, -640]])], ['@spire.1', poly([[0, -640], [0, -828], [0.7, -828], [8, -640]])]);
      let rings = '';
      for (const h of [662, 690, 718, 746, 772]) { const w = 8 - (h - 640) * 7.3 / 188; rings += `M${f1(-w - 0.6)} ${-h}H${f1(w + 0.6)}`; }
      body.push({ s: '@spire.1', w: 1.3, op: 0.9, d: rings, detail: true }, { s: '@fin', w: 0.6, op: 0.8, d: 'M-6 -650L-0.8 -800', detail: true });
      body.push(['@beacon', ell(0, -829, 1.2, 1.2)]);
      // the podium at the foot: a low pale stone block, its shaded side and a row of openings
      body.push(['@base.0', rect(-78, -14, 156, 14)], ['@base.1', rect(10, -14, 68, 14), 0.85], ['@glass.0', rect(-78, -15.5, 156, 1.5)]);
      const pod = []; for (let x = -74; x < 74; x += 6) pod.push([x, -10, 3.4, 6]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@dark', d, op: 0.8, glow: 'window' }));
      // night: the setbacks traced in white, pale strips of light up the cladding, the spire aglow, the beacon
      let ledges = '';
      for (const T of [TL, TR]) { const k = T === TL ? -1 : 1; T.forEach(([a, b, w], i) => { if (T[i + 1]) ledges += `M${f1(k * w)} ${-b}H${f1(k * T[i + 1][2])}`; }); }
      lit.push({ s: '@lightW', w: 1.6, op: 0.95, d: ledges });
      for (const [T, k] of [[TL, -1], [TR, 1]]) T.forEach(([a, b, w]) => {
        let st = ''; for (let x = 6; x < w - 2; x += 9) st += `M${f1(k * x)} ${-a - 2}V${-b + 2}`;
        lit.push({ s: k < 0 ? '@lightW' : '@blue', w: 0.9, op: k < 0 ? 0.55 : 0.4, d: st, detail: true });
      });
      lit.push({ f: { lin: [[0, '@blue', 0.05], [0.7, '@blue', 0.35], [1, '@lightW', 0.6]], x1: 0, y1: 0, x2: 0, y2: -640 }, d: poly([[0, 0]].concat(L, Rt.slice().reverse())) });
      lit.push({ f: { lin: [[0, '@lightW', 0.85], [1, '@blue', 0.3]], x1: 0, y1: -640, x2: 0, y2: -828 }, d: poly([[-8.5, -640], [0, -830], [8.5, -640]]) });
      lit.push({ f: { rad: [[0, '@beacon', 0.85], [1, '@beacon', 0]], cx: 0, cy: -829, r: 6 }, d: ell(0, -829, 6, 6) });
      return { body, lit };
    },
  });
})();
