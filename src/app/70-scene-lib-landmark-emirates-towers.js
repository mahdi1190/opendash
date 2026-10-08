/* ============================================================
   SCENE LIBRARY: landmark.emirates-towers (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the two angled prisms in the hand-drawn dubai-skyline art
   (`scene upgrade asia-west/dubai-skyline --box 1025,280,1170,645 --dry-run`: 13 shapes, a reference):
   - the real structure: the twin towers on Sheikh Zayed Road, the taller office tower (355 m)
     and the hotel tower (309 m), each on a triangular plan, so a corner faces the viewer and
     splits two faces; each top is cut on a slant up to a sharp point with its pinnacle; the
     low podium that joins them
   - silver aluminium spandrels and bronze glass in horizontal ribbons; the faces lit from the
     left, the right faces in shade
   - night: the slanted tops, the corners and the pinnacles traced in white light (the 'lit'
     part); the windows (glow)
   No text, no logos. Anchor: the ground at the middle of the front. 1 unit = 1 m.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // x0, corner x, x1, the top at x0 and at x1, the pinnacle's tip [x, y]: the office tower slopes up to the right, the hotel up to the left
  const TW = [
    { x0: -104, xc: -79, x1: -44, h0: 296, h1: 334, tip: [-46, 355] },
    { x0: 40, xc: 62, x1: 96, h0: 288, h1: 258, tip: [42, 309] },
  ];
  const topAt = (t, x) => t.h0 + (t.h1 - t.h0) * (x - t.x0) / (t.x1 - t.x0);
  const Z = [0, 48, 96, 144, 192, 240];
  define({
    id: 'landmark.emirates-towers', category: 'landmark', size: [216, 355], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      alu: ['#e4e8ec', '#c2cad2', '#98a2ad'], glass: ['#9a8f88', '#6e6a6c', '#4e4e58'], pod: ['#cfc4b2', '#a59a88'],
      dark: '#3a3e48', lightW: '#f4f8ff', warm: '#ffe2b0', beacon: '#ff4a3a',
    } },
    night: { glow: { window: '#ffe6bf' }, on: 0.8 },
    shadow: { rx: 110, ry: 5, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:dubai', 'asia', 'asia-west', 'skyscraper'],
    credit: 'native (scene engine upgrade), after the hand-drawn dubai-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      for (const t of TW) {
        const hc = topAt(t, t.xc);
        // the two faces whole (what a small still keeps): the lit left face, the right face in shade
        body.push({ f: { lin: [[0, '@alu.0'], [1, '@alu.1']], x1: t.x0, y1: 0, x2: t.xc, y2: 0 }, d: poly([[t.x0, 0], [t.x0, -t.h0], [t.xc, -hc], [t.xc, 0]]) },
          { f: { lin: [[0, '@alu.2'], [1, '@glass.2']], x1: t.xc, y1: 0, x2: t.x1, y2: 0 }, d: poly([[t.xc, 0], [t.xc, -hc], [t.x1, -t.h1], [t.x1, 0]]) });
        // zones of each face: the glass ribbons between the aluminium spandrels
        for (let i = 0; i < Z.length; i++) {
          const a = Z[i] + 6, b = i + 1 < Z.length ? Z[i + 1] : Math.min(t.h0, t.h1) - 10;
          if (b - a < 12) continue;
          body.push({ f: { lin: [[0, '@glass.0'], [1, '@glass.1']], x1: t.x0, y1: 0, x2: t.xc, y2: 0 }, d: rect(t.x0 + 1.5, -b, t.xc - t.x0 - 3, b - a), op: 0.55, detail: true },
            { f: { lin: [[0, '@glass.1'], [1, '@glass.2']], x1: t.xc, y1: 0, x2: t.x1, y2: 0 }, d: rect(t.xc + 1.5, -b, t.x1 - t.xc - 3, b - a), op: 0.6, detail: true });
          let bands = '', bandsR = '';
          for (let h = a + 3; h < b; h += 5.5) { bands += `M${f1(t.x0 + 1.5)} ${f1(-h)}H${f1(t.xc - 1.5)}`; bandsR += `M${f1(t.xc + 1.5)} ${f1(-h)}H${f1(t.x1 - 1.5)}`; }
          body.push({ s: '@alu.0', w: 1.6, op: 0.75, d: bands, detail: true }, { s: '@alu.2', w: 1.6, op: 0.6, d: bandsR, detail: true });
          for (let h = a + 4; h < b - 2; h += 14) for (let x = t.x0 + 3; x < t.x1 - 8; x += 12) if (Math.abs(x - t.xc) > 3) cells.push([x, -h - 2.6, 8, 2.4]);
        }
        // the slanted top: its cut face, the edge in light, the pinnacle rising from the high corner
        const hi = t.h1 > t.h0 ? [t.x1, t.h1] : [t.x0, t.h0];
        body.push(['@alu.1', poly([[t.x0, -t.h0], [t.xc, -hc], [t.x1, -t.h1], [t.xc + (t.x1 - t.xc) * 0.3, -hc + 4], [t.x0 + 4, -t.h0 + 3]]), 0.95]);
        body.push({ s: '@alu.0', w: 1.6, d: `M${t.x0} ${-t.h0}L${t.xc} ${f1(-hc)}L${t.x1} ${-t.h1}` });
        body.push(['@alu.0', poly([[hi[0] - 4 * Math.sign(hi[0] - t.xc), -hi[1]], [t.tip[0], -t.tip[1]], [hi[0], -hi[1]]])]);
        body.push({ s: '@alu.2', w: 0.8, op: 0.9, d: `M${t.tip[0]} ${-t.tip[1]}L${hi[0]} ${-hi[1]}`, detail: true });
        body.push(['@beacon', ell(t.tip[0], -t.tip[1] - 1, 1.1, 1.1)]);
        // the corner (a crisp lit edge), the outer edges, the vertical mullions
        body.push({ s: '@alu.0', w: 1.4, d: `M${t.xc} 0V${f1(-hc)}` }, { s: '@glass.2', w: 0.9, op: 0.8, d: `M${t.x1} 0V${-t.h1}M${t.x0} 0V${-t.h0}`, detail: true });
        let mu = ''; for (let x = t.x0 + 6; x < t.x1 - 3; x += 6) if (Math.abs(x - t.xc) > 2) mu += `M${f1(x)} -4V${f1(-Math.min(t.h0, t.h1) + 12)}`;
        body.push({ s: '@alu.1', w: 0.5, op: 0.35, d: mu, detail: true });
        // night: the slanted top, the corner and the pinnacle in light
        lit.push({ s: '@lightW', w: 1.8, op: 0.95, d: `M${t.x0} ${-t.h0}L${t.xc} ${f1(-hc)}L${t.x1} ${-t.h1}` },
          { s: '@lightW', w: 1.2, op: 0.7, d: `M${t.xc} -2V${f1(-hc)}` },
          { f: { lin: [[0, '@lightW', 0.9], [1, '@lightW', 0.2]], x1: 0, y1: -t.tip[1], x2: 0, y2: -hi[1] }, d: poly([[hi[0] - 4 * Math.sign(hi[0] - t.xc), -hi[1]], [t.tip[0], -t.tip[1]], [hi[0], -hi[1]]]) },
          { f: { lin: [[0, '@warm', 0.05], [1, '@warm', 0.3]], x1: 0, y1: 0, x2: 0, y2: -hc }, d: poly([[t.x0, 0], [t.x0, -t.h0], [t.xc, -hc], [t.x1, -t.h1], [t.x1, 0]]) },
          { f: { rad: [[0, '@beacon', 0.85], [1, '@beacon', 0]], cx: t.tip[0], cy: -t.tip[1] - 1, r: 5 }, d: ell(t.tip[0], -t.tip[1] - 1, 5, 5) });
      }
      sceneDraw.winGroups(r, cells, 8).forEach(d => body.push({ f: '@dark', d, op: 0.3, glow: 'window', detail: true }));
      // the podium that joins the two towers: a low pale block with a glazed band and its shaded side
      body.push(['@pod.0', rect(-112, -16, 216, 16)], ['@pod.1', rect(30, -16, 74, 16), 0.8], ['@alu.0', rect(-112, -17.5, 216, 1.5)]);
      const pod = []; for (let x = -108; x < 100; x += 7) pod.push([x, -11, 4, 6]);
      sceneDraw.winGroups(r, pod, 2).forEach(d => body.push({ f: '@dark', d, op: 0.8, glow: 'window' }));
      lit.push({ s: '@warm', w: 1.4, op: 0.8, d: 'M-112 -17H104' });
      return { body, lit };
    },
  });
})();
