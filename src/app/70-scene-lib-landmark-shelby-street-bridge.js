/* ============================================================
   SCENE LIBRARY: landmark.shelby-street-bridge (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Shelby Street Bridge over the Cumberland in Nashville (1909), a pedestrian bridge since
   2003 (the John Seigenthaler Pedestrian Bridge), seen broadside. Drawn by hand after its form:
   - three steel through trusses over the river, the middle one the longest, each a camelback
     (polygonal top chord) with its inclined end posts, verticals and diagonals; the concrete
     piers between them; the run of open-spandrel concrete arches carrying the walkway on over
     the east bank (right) and the short arched approach on the downtown side (left)
   - the walkway's railing and lamp standards; the steel lit from the left
   - night: the lamps (glow) and the 'lit' part: the lights along the trusses' top chords and the
     lamplight on the walkway
   No text, no flags. Anchor: the waterline at the middle of the central truss.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const D = -44, X0 = -560, X1 = 760;   // the deck (the trusses' bottom chord), the ends
  // the trusses: [from, to, end height, middle height, panels]
  const TR = [[-400, -160, 30, 46, 8], [-160, 160, 36, 62, 10], [160, 400, 30, 46, 8]];
  // the concrete arches: [from, to]; the left approach and the run over the east bank
  const AR = [[-560, -480], [-480, -400], [400, 472], [472, 544], [544, 616], [616, 688], [688, 760]];
  define({
    id: 'landmark.shelby-street-bridge', category: 'landmark', size: [1324, 110], box: [-562, -108, 762, 2], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      steel: ['#55626c', '#3c4650', '#7e8c98', '#262e36'], conc: ['#cfc8b8', '#a9a292', '#e4dece', '#7a7466'], dark: '#2e3236',
      flood: '#ffe2a8', lampL: '#fff2cc',
    } },
    night: { glow: { lamp: '#ffe1a0' }, on: 0.9 },
    reflect: true,
    tags: ['landmark', 'place:us/place:nashville', 'us', 'us-southeast', 'bridge', 'truss-bridge', 'river'],
    credit: 'native, drawn for the composed nashville-music-city-skyline scene (after the hand-drawn art)',
    build() {
      const body = [], lit = [];
      // the arches: the barrel (lit face, shaded soffit line), the spandrel columns, the piers between them
      let barrel = '', soffit = '', cols = '';
      for (const [a, b] of AR) {
        const m = (a + b) / 2, sp = -6, cr = -34;
        barrel += `M${a} 0V${sp}Q${a} ${cr} ${m} ${cr}Q${b} ${cr} ${b} ${sp}V0H${b - 5}V${sp}Q${b - 5} ${cr + 5} ${m} ${cr + 5}Q${a + 5} ${cr + 5} ${a + 5} ${sp}V0Z`;
        soffit += `M${a + 5} ${sp}Q${a + 5} ${cr + 5} ${m} ${cr + 5}Q${b - 5} ${cr + 5} ${b - 5} ${sp}`;
        for (let x = a + 12; x < b - 6; x += 12) { const t = (x - m) / ((b - a) / 2); cols += `M${x} ${f1(cr + (sp - cr) * t * t - 2)}V${D + 4}`; }
      }
      body.push({ s: '@conc.1', w: 2.4, op: 0.85, d: cols }, ['@conc.0', barrel], { s: '@conc.3', w: 1, op: 0.5, d: soffit });
      body.push({ f: '@conc.2', d: AR.map(([a]) => rect(a - 3, -40, 6, 40)).join('') + rect(X1 - 3, -40, 6, 40), op: 0.9 });
      body.push({ f: '@dark', d: AR.map(([a]) => rect(a - 3, -4, 6, 4)).join(''), op: 0.3, detail: true });
      // the river piers: concrete, lit on the left, the waterline stain, the cutwater cap
      for (const x of [-400, -160, 160, 400]) {
        body.push(['@conc.1', rect(x - 9, D, 18, -D)], ['@conc.2', rect(x - 9, D, 7, -D), 0.8], ['@conc.3', rect(x + 4, D, 5, -D), 0.4], ['@dark', rect(x - 9, -5, 18, 5), 0.35]);
        body.push(['@conc.2', rect(x - 11, D - 1, 22, 4)]);
      }
      // the deck: the concrete walkway slab over the arches, the steel deck through the trusses, the fascia and its lit edge
      body.push(['@conc.1', rect(X0, D, X1 - X0, 6)], ['@conc.2', rect(X0, D, X1 - X0, 1.6)], ['@steel.3', rect(-400, D + 1, 800, 6), 0.9]);
      // the trusses: the far truss (behind, lighter), the bottom chord, the near truss with its members
      for (const [a, b, he, hm, n] of TR) {
        const pw = (b - a) / n, top = i => { const t = (i * pw) / (b - a) - 0.5; return D - (hm - (hm - he) * Math.pow(Math.abs(t) * 2, 1.6)); };
        let chord = `M${a} ${D}`, verts = '', diags = '';
        for (let i = 1; i < n; i++) chord += `L${f1(a + i * pw)} ${f1(top(i))}`;
        chord += `L${b} ${D}`;
        for (let i = 1; i < n; i++) verts += `M${f1(a + i * pw)} ${D}V${f1(top(i))}`;
        // Pratt diagonals: in each half they slope down towards the middle of the span
        for (let i = 1; i < n - 1; i++) { const toMid = i < n / 2; diags += toMid ? `M${f1(a + i * pw)} ${f1(top(i))}L${f1(a + (i + 1) * pw)} ${D}` : `M${f1(a + (i + 1) * pw)} ${f1(top(i + 1))}L${f1(a + i * pw)} ${D}`; }
        body.push({ s: '@steel.2', w: 2, op: 0.55, d: chord.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${f1(+x + 4)} ${f1(+y - 2)}`) });
        // the far truss's web seen through the near one (fine, light), the sway bracing struts between the two trusses
        body.push({ s: '@steel.2', w: 0.7, op: 0.4, d: (verts + diags).replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${f1(+x + 4)} ${f1(+y - 2)}`), detail: true });
        let sway = ''; for (let i = 2; i < n - 1; i += 2) sway += `M${f1(a + i * pw)} ${f1(top(i) + 3)}l4 -2`;
        body.push({ s: '@steel.3', w: 1, op: 0.6, d: sway, detail: true });
        body.push({ s: '@steel.1', w: 1.1, op: 0.85, d: diags }, { s: '@steel.0', w: 1.4, d: verts });
        body.push({ s: '@steel.0', w: 3, d: chord }, { s: '@steel.2', w: 0.8, op: 0.7, d: chord.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_, x, y) => `${x} ${f1(+y - 1.2)}`), detail: true });
        // the gusset plates at the top panel points
        let gus = ''; for (let i = 1; i < n; i++) gus += rect(a + i * pw - 1.6, top(i) - 1, 3.2, 3.2);
        body.push({ f: '@steel.3', d: gus, op: 0.8, detail: true });
        // the lights along the top chord at night
        lit.push({ s: '@lampL', w: 1.8, op: 0.75, d: chord });
        let bulbs = ''; for (let i = 1; i < n; i++) bulbs += ell(a + i * pw, top(i) - 1, 2, 2);
        lit.push(['@lampL', bulbs]);
      }
      // the walkway railing, the lamp standards (their heads light at dusk in three groups)
      let rail = ''; for (let x = X0 + 2; x < X1; x += 5) rail += `M${x} ${D - 1}V${D - 5}`;
      body.push({ s: '@steel.3', w: 0.5, op: 0.5, d: rail, detail: true }, ['@steel.3', rect(X0, D - 6, X1 - X0, 1.2), 0.8]);
      let poles = ''; const heads = ['', '', ''];
      for (let x = X0 + 30, i = 0; x < X1; x += 52, i++) { poles += `M${x} ${D - 1}V${D - 13}`; heads[i % 3] += ell(x, D - 14.5, 1.5, 1.9); }
      body.push({ s: '@steel.3', w: 0.9, d: poles });
      heads.forEach(d => body.push({ f: '@steel.2', d, glow: 'lamp' }));
      // the concrete approach's parapet panels and the arch keystones
      let kp = ''; for (const [a, b] of AR) kp += rect((a + b) / 2 - 2, -36, 4, 5);
      body.push({ f: '@conc.2', d: kp, op: 0.9, detail: true }, { s: '@conc.3', w: 0.6, op: 0.45, d: `M${X0} ${D + 6}H-400M400 ${D + 6}H${X1}`, detail: true });
      // each arch ring's lit crown and shaded haunch (fine detail), the abutments at both ends, the piers' cap shadows
      for (const [a, b] of AR) { const m = (a + b) / 2; body.push({ s: '@conc.2', w: 1, op: 0.6, d: `M${a + 2} -10Q${a + 2} -33 ${m} -33`, detail: true }, { s: '@conc.3', w: 0.8, op: 0.35, d: `M${m} -33Q${b - 2} -33 ${b - 2} -10`, detail: true }); }
      body.push(['@conc.1', rect(X0 - 2, D - 2, 10, -D + 2)], ['@conc.1', rect(X1 - 8, D - 2, 10, -D + 2)], ['@conc.3', rect(X1 - 3, D - 2, 5, -D + 2), 0.5]);
      body.push({ f: '@dark', d: [-400, -160, 160, 400].map(x => rect(x - 9, D + 3, 18, 2)).join(''), op: 0.3, detail: true });
      // night: the walkway in the lamplight
      lit.push({ f: { lin: [[0, '@flood', 0.3], [1, '@flood', 0]], x1: 0, y1: D - 14, x2: 0, y2: D + 6 }, d: rect(X0, D - 14, X1 - X0, 20) });
      return { body, lit };
    },
  });
})();
