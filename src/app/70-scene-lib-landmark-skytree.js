/* ============================================================
   SCENE LIBRARY: landmark.skytree (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the tall tower in the hand-drawn tokyo-skyline art
   (`scene upgrade asia-east/tokyo-skyline --box 1130,70,1310,780`):
   - the real structure: a 634 m broadcasting tower whose steel lattice (a diagrid in pale
     blue-white) flares out to a tripod at the foot and tapers up round a concrete core
     column; the three-storey Tembo Deck at 350 m, the slimmer Tembo Galleria at 450 m with
     its sloping glass corridor, then the antenna section with its platforms
   - round in plan above the foot: shaded across from the sunlit left to the right
   - night: the pale blue lighting of the shaft from inside, the decks' white light rings and
     the aviation lights (the 'lit' part); the decks' windows (glow)
   No text, no logos. Anchor: the ground at the middle of the foot.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // the half-width by height (units; 700 = 634 m): the flared foot, the long taper, the decks, the antenna
  const P = [[0, 38], [25, 32], [60, 27.5], [120, 24], [200, 21.5], [300, 19.5], [362, 18.3], [402, 17.5], [486, 15.4], [503, 15], [549, 12.6]];
  const hw = h => { for (let i = 1; i < P.length; i++) if (h <= P[i][0]) { const [a, wa] = P[i - 1], [b, wb] = P[i]; return wa + (wb - wa) * (h - a) / (b - a); } return P[P.length - 1][1]; };
  define({
    id: 'landmark.skytree', category: 'landmark', size: [96, 700], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#f3f6f9', '#c7d2de', '#8e9fb4'], core: ['#a7b1bd', '#76828f'], glass: ['#40506a', '#2c3a4e'], frame: ['#e6ebf1', '#aab6c4'],
      red: '#e8463a', iki: '#9ad8ff', white: '#f2fbff',
    } },
    night: { glow: { window: '#e8f4ff' }, on: 0.85 },
    shadow: { rx: 44, ry: 5, h: 120 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:tokyo', 'asia', 'asia-east', 'tower', 'lattice'],
    credit: 'native (scene engine upgrade), after the hand-drawn tokyo-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const hs = (a, b) => { const n = Math.max(1, Math.ceil((b - a) / 14)), o = []; for (let i = 0; i <= n; i++) o.push(a + (b - a) * i / n); return o; };
      const shaft = (a, b, k = 1) => poly(hs(a, b).map(h => [-hw(h) * k, -h]).concat(hs(a, b).reverse().map(h => [hw(h) * k, -h])));
      const across = (h0, h1, c0, c1) => ({ lin: [[0, c0], [0.42, c1], [1, '@steel.2']], x1: -hw(h0), y1: 0, x2: hw(h0), y2: 0 });
      // the core column, seen through the lattice
      body.push({ f: { lin: [[0, '@core.0'], [1, '@core.1']], x1: -10, y1: 0, x2: 10, y2: 0 }, d: poly([[-11, 0], [-8.5, -549], [8.5, -549], [11, 0]]) });
      // the lattice in five lengths (between the foot, the decks and the top): the face, the diagrid (lit and shaded halves), the rings
      const LEN = [[0, 120], [120, 240], [240, 362], [402, 486], [503, 549]];
      let litDg = '';
      for (const [a, b] of LEN) {
        body.push({ f: across(a, b, '@steel.0', '@steel.1'), op: 0.8, d: shaft(a, b) });
        const rows = Math.max(1, Math.round((b - a) / 20)), m = 4;
        const dg = ['', ''];
        let rings = '';
        for (let i = 0; i < rows; i++) {
          const p = a + (b - a) * i / rows, q = a + (b - a) * (i + 1) / rows, wp = hw(p), wq = hw(q);
          for (let k = 0; k < m; k++) {
            const u0 = -1 + 2 * k / m, u1 = -1 + 2 * (k + 1) / m;
            dg[k < m / 2 ? 0 : 1] += `M${f1(u0 * wp)} ${f1(-p)}L${f1(u1 * wq)} ${f1(-q)}M${f1(u1 * wp)} ${f1(-p)}L${f1(u0 * wq)} ${f1(-q)}`;
          }
          if (i) rings += `M${f1(-wp)} ${f1(-p)}H${f1(wp)}`;
        }
        body.push({ s: '@steel.2', w: 1, op: 0.75, d: dg[0], detail: true }, { s: '@core.1', w: 1, op: 0.85, d: dg[1], detail: true });
        litDg += dg[0] + dg[1];
        if (rings) body.push({ s: '@steel.1', w: 0.8, op: 0.7, d: rings, detail: true });
      }
      // the edges: the sunlit left, the shaded right; the tripod's three legs at the foot
      const edge = s => { let d = ''; for (const h of hs(0, 549)) d += (h ? 'L' : 'M') + f1(s * hw(h)) + ' ' + f1(-h); return d; };
      body.push({ s: '@steel.0', w: 1.4, op: 0.9, d: edge(-1) }, { s: '@steel.2', w: 1.4, op: 0.9, d: edge(1) });
      body.push(['@steel.1', poly([[-40, 0], [-31, 0], [-22, -60], [-26, -60]])], ['@steel.2', poly([[31, 0], [40, 0], [26, -60], [22, -60]])], ['@steel.1', poly([[-4, 0], [5, 0], [3, -70], [-2, -70]]), 0.9]);
      body.push(['@frame.1', rect(-44, -3, 88, 3)], ['@frame.0', rect(-20, -14, 40, 11)], ['@glass.0', rect(-16, -11, 32, 6), 0.8]);
      // the Tembo Deck: a bowl under it, three storeys of glass in white frames, a roof ring
      const dw = 25.5;
      body.push(['@frame.1', poly([[-18.3, -362], [18.3, -362], [dw, -370], [-dw, -370]])], ['@steel.2', poly([[4, -362], [18.3, -362], [dw, -370], [8, -370]]), 0.6]);
      const g = [];
      for (let k = 0; k < 3; k++) {
        const y = -370 - k * 10;
        body.push(['@frame.0', rect(-dw, y - 10, dw * 2, 10)], { f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -dw, y1: 0, x2: dw, y2: 0 }, d: rect(-dw + 1, y - 8.6, dw * 2 - 2, 7) });
        for (let x = -dw + 2; x < dw - 3; x += 3) g.push([x, y - 8, 2, 5.8]);
      }
      sceneDraw.winGroups(r, g, 4).forEach(d => body.push({ f: '@glass.1', d, glow: 'window', detail: true }));
      body.push(['@frame.0', rect(-dw + 1.5, -404, dw * 2 - 3, 4)], ['@frame.1', rect(4, -404, dw - 5.5, 4), 0.8], ['@steel.2', rect(-dw, -372, dw * 2, 1.4), 0.6]);
      // the Tembo Galleria: a slim ring of glass with the corridor sloping round it
      const gw = 19.5;
      body.push(['@frame.1', poly([[-15.4, -484], [15.4, -484], [gw, -488], [-gw, -488]])], ['@frame.0', rect(-gw, -503, gw * 2, 15)], { f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: -gw, y1: 0, x2: gw, y2: 0 }, d: rect(-gw + 1, -500, gw * 2 - 2, 9) });
      body.push({ s: '@frame.0', w: 1.6, d: `M${-gw + 1} -492L${gw - 1} -499` }, ['@frame.0', rect(-gw + 1, -507, gw * 2 - 2, 4)]);
      const g2 = []; for (let x = -gw + 2; x < gw - 2; x += 2.8) g2.push([x, -499, 1.8, 6.6]);
      sceneDraw.winGroups(r, g2, 2).forEach(d => body.push({ f: '@glass.1', d, glow: 'window', detail: true }));
      // the top of the lattice and the antenna: a banded lattice tube, two platforms, the mast and the tip
      body.push(['@frame.0', rect(-13.5, -553, 27, 4)], ['@frame.1', rect(2, -553, 11.5, 4), 0.8]);
      body.push({ f: { lin: [[0, '@steel.0'], [1, '@steel.2']], x1: -6, y1: 0, x2: 6, y2: 0 }, d: poly([[-6, -553], [6, -553], [4.4, -612], [-4.4, -612]]) });
      let tube = ''; for (let h = 556; h < 610; h += 6) tube += `M${f1(-6 + (h - 553) * 0.027)} ${-h}L${f1(6 - (h - 553 + 6) * 0.027)} ${-h - 6}`;
      body.push({ s: '@steel.2', w: 0.7, op: 0.8, d: tube, detail: true });
      for (const [h, w] of [[574, 7.4], [598, 6.4]]) body.push(['@frame.0', rect(-w, -h - 2.4, w * 2, 2.4)], ['@steel.2', rect(-w + 0.5, -h, w * 2 - 1, 1), 0.7]);
      body.push(['@steel.1', poly([[-3, -612], [3, -612], [1.4, -690], [-1.4, -690]])], ['@steel.0', poly([[-3, -612], [0, -612], [0, -690], [-1.4, -690]])]);
      for (const h of [630, 650, 670]) body.push(['@steel.2', rect(-2.6, -h - 1.4, 5.2, 1.4), 0.9]);
      body.push({ s: '@steel.1', w: 0.9, d: 'M0 -690V-699' });
      for (const [x, h] of [[-dw, 404], [dw, 404], [-gw, 507], [gw, 507], [0, 699]]) body.push(['@red', ell(x, -h, 1.3, 1.3)]);
      // night, the pale blue 'iki' lighting: the shaft lit from inside, the diagrid and core in light, white deck rings, the beacons
      for (const [a, b] of LEN) lit.push({ f: { lin: [[0, '@iki', 0.5], [1, '@iki', 0.22]], x1: 0, y1: -a, x2: 0, y2: -b }, d: shaft(a, b) });
      lit.push({ s: '@iki', w: 0.9, op: 0.6, d: litDg, detail: true }, { s: '@white', w: 2, op: 0.3, d: 'M0 -20V-549' }, { s: '@iki', w: 1.4, op: 0.9, d: edge(-1) }, { s: '@iki', w: 1.4, op: 0.75, d: edge(1) });
      lit.push({ f: '@white', d: rect(-dw, -401, dw * 2, 1.8), op: 0.95 }, { f: '@white', d: rect(-dw, -371, dw * 2, 1.6), op: 0.85 }, { f: '@white', d: rect(-gw, -504, gw * 2, 1.6), op: 0.95 }, { s: '@white', w: 1.4, op: 0.9, d: `M${-gw + 1} -492L${gw - 1} -499` });
      lit.push({ f: { lin: [[0, '@iki', 0.6], [1, '@iki', 0.1]], x1: 0, y1: -553, x2: 0, y2: -690 }, d: poly([[-6, -553], [6, -553], [1.4, -690], [-1.4, -690]]) });
      for (const [x, h] of [[-dw, 404], [dw, 404], [0, 699]]) lit.push({ f: { rad: [[0, '@red', 0.8], [1, '@red', 0]], cx: x, cy: -h, r: 5 }, d: ell(x, -h, 5, 5) });
      return { body, lit };
    },
  });
})();
