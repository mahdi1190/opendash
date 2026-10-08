/* ============================================================
   SCENE LIBRARY: landmark.flame-towers (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the three flame shapes in the hand-drawn baku-skyline art
   (`scene upgrade asia-west/baku-skyline --box 930,200,1340,595`):
   - the real structure: the three towers on the hill above Baku Bay, each a tall curved glass
     form on a rounded-triangle plan that swells and then tapers to a point like a flame; the
     tallest stands in front (towards the bay) with the two lower ones behind it on either side;
     the green hillside of the upland park below them with its terraces and pines
   - blue-silver glass in fine horizontal floor bands; each tower lit on its left facet,
     turning into shade on its right one, a bright edge where the two facets meet
   - night: the glass becomes a screen of light showing rising flames (red at the foot, orange
     and gold tongues climbing towards the tips): a pattern of light, never text, emblems or
     images (the 'lit' part); the aviation lights at the tips, the hillside lamps (glow)
   No text, no logos, no flags. Anchor: the foot of the hill at the middle of the front. 1 unit = 1 m.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, ell, poly, blob, define } = sceneDraw;
  const HILL = 62;
  // the towers back to front: centre x, half-width at the foot, height above the hilltop, the lean of the tip
  const TOW = [{ cx: -50, w: 32, h: 158, lean: -14 }, { cx: 54, w: 30, h: 148, lean: 13 }, { cx: 2, w: 36, h: 182, lean: 6 }];
  const hw = (T, t) => T.w * (1 - t) * (1 + 1.6 * t - 0.45 * t * t);        // swelling above the foot, then the long curved taper to the point
  const cx = (T, t) => T.cx + T.lean * t * t * t;
  const xL = (T, t) => cx(T, t) - hw(T, t) * (1 + 0.1 * Math.sin(Math.PI * t));
  const xR = (T, t) => cx(T, t) + hw(T, t) * (1 - 0.06 * Math.sin(Math.PI * t));
  const xM = (T, t) => cx(T, t) + hw(T, t) * 0.18;                                       // where the two facets meet
  const yOf = (T, t) => -HILL - T.h * t;
  const ts = (a, b, n) => { const o = []; for (let i = 0; i <= n; i++) o.push(a + (b - a) * i / n); return o; };
  const edge = (T, f, a, b) => ts(a, b, Math.max(3, Math.round((b - a) * 16))).map(t => [f(T, t), yOf(T, t)]);
  const Z = [0, 0.17, 0.34, 0.5, 0.66, 0.82, 1];
  define({
    id: 'landmark.flame-towers', category: 'landmark', size: [300, 244], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      glass: ['#d2deec', '#a4b8d0', '#7088aa', '#4a5d80'], band: '#6a7f9f', hill: ['#5f7347', '#46583a', '#33452e'],
      stone: ['#c2ae8e', '#9c8a6e'], dark: '#2e3a52',
      red: '#e8321c', orange: '#ff7a1e', gold: '#ffc23a', core: '#fff0a8', lamp: '#ffd98a', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffd8a0', lamp: '#ffe2a0' }, on: 0.8 },
    shadow: { rx: 150, ry: 6, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:baku', 'asia', 'asia-west', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn baku-skyline art',
    build(v, r) {
      const body = [], lit = [];
      // the hill: its green slope, the shaded right flank, terraces of stone and pines
      // (the upland is the edge of a plateau: it runs on to the left and falls in a long terraced slope to the shore on the right)
      body.push({ f: { lin: [[0, '@hill.0'], [1, '@hill.1']], x1: 0, y1: -HILL, x2: 0, y2: 0 }, d: 'M-150 0C-146 -22 -132 -52 -110 -60L-60 -63Q0 -66 56 -62C84 -56 102 -42 120 -24C132 -12 141 -5 150 0Z' },
        ['@hill.2', 'M56 -62C84 -56 102 -42 120 -24C132 -12 141 -5 150 0H88Q84 -32 56 -62Z', 0.5]);
      body.push({ s: '@stone.0', w: 2.2, op: 0.9, d: 'M-128 -40Q-40 -50 40 -48Q78 -44 100 -38M-142 -14Q-40 -22 52 -20Q110 -16 138 -8', detail: true },
        { s: '@stone.1', w: 1.2, op: 0.8, d: 'M128 -4L70 -46M70 -46L52 -56', detail: true });
      // the park's pines: loose clumps of small crowns down the slope (seeded), denser low on the flanks
      const slope = x => (x < -110 ? -60 * (x + 150) / 40 : x < 56 ? -62 : -62 * (1 - Math.pow((x - 56) / 94, 1.4)));
      let pines = '', pinesD = '', pinesL = '';
      for (let i = 0; i < 46; i++) {
        const x = -140 + r() * 280, top = slope(x), y = Math.min(-3, top + 6 + r() * Math.max(2, -top - 10)), s = 2.2 + r() * 2.4;
        if (i % 3 === 0) pinesL += blob(r, x - 0.8, y - 0.8, s * 0.8, s * 0.6, 5, 0.3); else if (i % 3 === 1) pines += blob(r, x, y, s * 1.2, s, 6, 0.4); else pinesD += blob(r, x, y, s * 1.2, s, 6, 0.4);
      }
      body.push({ f: '@hill.2', d: pines, op: 0.85 }, { f: '@hill.2', d: pinesD, op: 0.8, detail: true }, { f: '@hill.0', d: pinesL, op: 0.9, detail: true });
      // the towers, back to front
      for (const T of TOW) {
        const L = edge(T, xL, 0, 1), M = edge(T, xM, 0, 1), Rr = edge(T, xR, 0, 1);
        // the two facets whole (what a small still keeps)
        body.push({ f: { lin: [[0, '@glass.0'], [0.55, '@glass.1'], [1, '@glass.2']], x1: T.cx - T.w, y1: 0, x2: T.cx + 6, y2: 0 }, d: poly(L.concat(M.slice().reverse())) },
          { f: { lin: [[0, '@glass.2'], [1, '@glass.3']], x1: T.cx, y1: 0, x2: T.cx + T.w, y2: 0 }, d: poly(M.concat(Rr.slice().reverse())) });
        // zones of each facet: the sky moving over the curved glass, the floor bands across it
        for (let i = 0; i < Z.length - 1; i++) {
          const a = Z[i], b = Z[i + 1], la = edge(T, xL, a, b), ma = edge(T, xM, a, b), ra = edge(T, xR, a, b);
          body.push({ f: { lin: [[0, '@glass.0'], [1, i % 2 ? '@glass.1' : '@glass.0', 0.6]], x1: xL(T, a), y1: 0, x2: xM(T, a), y2: 0 }, d: poly(la.concat(ma.slice().reverse())), op: 0.6, detail: true },
            { f: { lin: [[0, '@glass.2', 0.7], [1, '@glass.3']], x1: xM(T, a), y1: 0, x2: xR(T, a), y2: 0 }, d: poly(ma.concat(ra.slice().reverse())), op: 0.6, detail: true });
          let fl = '', fr = '';
          for (let t = a + 0.022; t < b - 0.004 && t < 0.96; t += 0.022) {
            const y = f1(yOf(T, t));
            fl += `M${f1(xL(T, t) + 0.8)} ${y}H${f1(xM(T, t) - 0.6)}`; fr += `M${f1(xM(T, t) + 0.6)} ${y}H${f1(xR(T, t) - 0.8)}`;
          }
          body.push({ s: '@band', w: 0.7, op: 0.45, d: fl, detail: true }, { s: '@glass.3', w: 0.7, op: 0.5, d: fr, detail: true });
        }
        // the edges: the bright edge where the facets meet, the lit left rim, the dark right rim
        const line = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L');
        body.push({ s: '@glass.0', w: 1.4, op: 0.95, d: line(M) }, { s: '@glass.0', w: 1, op: 0.8, d: line(L), detail: true }, { s: '@dark', w: 1, op: 0.7, d: line(Rr), detail: true });
        body.push(['@beacon', ell(cx(T, 1), yOf(T, 1) - 1, 1, 1)]);
        // the foot: a glazed lobby band on the hilltop
        body.push(['@dark', poly([[xL(T, 0), -HILL], [xL(T, 0.03), yOf(T, 0.03)], [xR(T, 0.03), yOf(T, 0.03)], [xR(T, 0), -HILL]]), 0.7]);
        // night: the screen of flames, red at the foot, tongues of orange and gold rising to the tip
        const out = L.concat(Rr.slice().reverse());
        lit.push({ f: { lin: [[0, '@red', 0.85], [0.45, '@orange', 0.75], [0.8, '@gold', 0.6], [1, '@core', 0.5]], x1: 0, y1: -HILL, x2: 0, y2: -HILL - T.h }, d: poly(out) });
        const tongues = [[-0.62, 0.52, 0.2], [-0.28, 0.78, 0.24], [0.06, 0.95, 0.26], [0.4, 0.7, 0.22], [0.7, 0.46, 0.16]];
        tongues.forEach(([u, th, tw], k) => {
          const up = [], dn = [];
          for (const t of ts(0, th, 14)) {
            const q = t / th, wob = Math.sin((q * 3.2 + k * 1.7) * Math.PI) * 0.09 * (1 - q), c = cx(T, t) + (u + wob) * hw(T, t) * 0.92, half = tw * hw(T, t) * Math.pow(1 - q, 0.7);
            up.push([c - half, yOf(T, t)]); dn.push([c + half, yOf(T, t)]);
          }
          lit.push({ f: { lin: [[0, '@orange', 0.85], [0.6, '@gold', 0.9], [1, '@core', 0.8]], x1: 0, y1: -HILL, x2: 0, y2: yOf(T, th) }, d: poly(up.concat(dn.reverse())), op: 0.85, detail: true });
        });
        lit.push({ f: { rad: [[0, '@beacon', 0.85], [1, '@beacon', 0]], cx: cx(T, 1), cy: yOf(T, 1) - 1, r: 4.5 }, d: ell(cx(T, 1), yOf(T, 1) - 1, 4.5, 4.5) });
      }
      // (no window cells: at night the glass is one screen of light, the windows do not read through it)
      // the hillside lamps along the terraces (glow at night)
      let lamps = '';
      for (let x = -112; x < 116; x += 19) lamps += ell(x, -22 - 4 * Math.cos(x / 70) - 2.5, 0.9, 0.9);
      for (let x = -86; x < 92; x += 22) lamps += ell(x, -44 - 2 * Math.cos(x / 60), 0.8, 0.8);
      body.push({ f: '@lamp', d: lamps, op: 0.5, glow: 'lamp' });
      return { body, lit };
    },
  });
})();
