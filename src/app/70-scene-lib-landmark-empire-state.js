/* ============================================================
   SCENE LIBRARY: landmark.empire-state (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the tower in the hand-drawn new-york-skyline art:
   - the real structure: the five-storey base, the wide lower block with its wings, the long
     shaft with its pale stone piers and dark window spandrels running unbroken up the
     facade, the central projecting bay, setbacks at the 72nd, 81st and 85th floors, the
     mooring mast (a fluted drum with a small dome) and the antenna
   - lit from the left: the right-hand faces of every block in shade, highlights on the piers
   - night: windows lit in seeded groups (glow); the 'lit' part floodlights the top in warm
     white from the 72nd floor up, a glow round the mast and the red aircraft light
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  define({
    id: 'landmark.empire-state', category: 'landmark', size: [130, 420], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      stone: ['#d8d0bc', '#b4aa94', '#efe8d8', '#8a8070'], span: ['#5a6070', '#3e4452'], metal: ['#c8ccd0', '#8a9098', '#f0f2f4'],
      flood: '#fff2d0', beacon: '#ff4030',
    } },
    night: { glow: { window: '#ffd690' }, on: 0.6 },
    shadow: { rx: 50, ry: 5, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:us/place:new-york', 'us', 'us-northeast', 'skyline', 'skyscraper', 'art-deco'],
    credit: 'native (scene engine pilot), after the hand-drawn new-york-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      // blocks from the ground up: [halfWidth, y0, y1]
      // the real massing: the five-storey base, the setbacks of the 6th, 21st, 25th and 30th floors, the long shaft to
      // the 72nd, then the 81st, 85th and 86th (the observation terrace) under the mast
      const blocks = [[64, 0, -24], [54, -24, -62], [47, -62, -84], [42, -84, -98], [38, -98, -276], [29, -276, -294], [21, -294, -308], [15, -308, -316]];
      blocks.forEach(([hw, y0, y1], i) => {
        const h = y0 - y1, side = Math.min(10, hw * 0.25);
        body.push(['@stone.1', poly([[hw, y0], [hw, y1], [hw + side, y1 - side * 0.3], [hw + side, y0]])]);
        body.push(['@stone.0', rect(-hw, y1, hw * 2, h)], ['@stone.3', rect(hw * 0.55, y1, hw * 0.45, h), 0.3], ['@stone.2', rect(-hw, y1, 2, h), 0.9], ['@stone.2', rect(-hw - 1, y1 - 2, hw * 2 + side + 1, 2.4)]);
        // piers and spandrels: the dark window columns between pale piers
        const cols = Math.max(3, Math.round(hw / 4.6)), bw = hw * 2 / cols;
        let sp = '';
        for (let c = 0; c < cols; c++) { const x = -hw + c * bw + bw * 0.28; sp += rect(x, y1 + 4, bw * 0.44, h - 7); }
        body.push(['@span.0', sp, 0.75], { s: '@stone.3', w: 0.8, op: 0.45, d: `M${f1(-hw)} ${f1(y1 + 3)}h${f1(hw * 2)}`, detail: true });
        for (let y = y1 + 5; y < y0 - 4; y += 6.5) for (let c = 0; c < cols; c++) cells.push([-hw + c * bw + bw * 0.3, y, bw * 0.4, 3.2]);
        if (i === 4) {
          // the central projecting bay up the shaft, lighter, with its own pier shade
          body.push(['@stone.2', rect(-11, y1, 22, h), 0.4], ['@stone.1', rect(8, y1, 3, h), 0.7]);
          body.push({ s: '@stone.3', w: 0.6, op: 0.4, d: `M${-hw} ${y1 + 60}h${hw * 2}M${-hw} ${y1 + 130}h${hw * 2}`, detail: true });
        }
      });
      // the windows over the spandrels (full size only), in 14 seeded groups that light at real dusk
      const g = sceneDraw.winGroups(r, cells, 14);
      g.forEach(d => { if (d) body.push({ f: '@span.1', d, op: 0.45, glow: 'window', detail: true }); });
      // the 86th-floor observation terrace and the 102nd-floor deck: railings round the setbacks
      body.push({ s: '@metal.2', w: 1, d: 'M-29 -297h58M-21 -311h42', op: 0.9 }, { s: '@metal.1', w: 0.6, op: 0.7, d: 'M-27 -297v-3M-18 -297v-3M-9 -297v-3M0 -297v-3M9 -297v-3M18 -297v-3M27 -297v-3', detail: true });
      // the mast: fluted drum, a ring, the small dome, the antenna
      body.push(['@metal.1', rect(-9, -350, 18, 34)], ['@metal.0', rect(-9, -350, 9, 34)], { s: '@metal.1', w: 0.8, d: 'M-6 -348v30M-3 -348v30M3 -348v30M6 -348v30' }, ['@metal.2', rect(-11, -334, 22, 2.4)]);
      body.push(['@metal.0', 'M-7 -350Q0 -364 7 -350z'], ['@metal.1', rect(-2.6, -372, 5.2, 14)], ['@metal.1', poly([[-1.2, -372], [0, -418], [1.2, -372]])], ['@beacon', ell(0, -418, 1.6, 1.6)]);
      // the ground floor: shopfronts, a lit band
      body.push({ f: '@span.1', d: rect(-58, -10, 116, 7), glow: 'window' });
      // night: the floodlit top (72nd floor up), mast glow, the beacon
      lit.push({ f: { lin: [[0, '@flood', 0.75], [1, '@flood', 0.05]], x1: 0, y1: -372, x2: 0, y2: -250 }, d: 'M-29 -250V-294H-21V-308H-15V-316H-9V-350Q0 -364 9 -350V-316H15V-308H21V-294H29V-250z' },
        { f: { rad: [[0, '@flood', 0.5], [1, '@flood', 0]], cx: 0, cy: -340, r: 40 }, d: rect(-40, -380, 80, 80) }, ['@beacon', ell(0, -418, 3.4, 3.4), 0.9],
        // the crown's tiered lights: each setback edge and the mast's rings picked out
        { s: '@flood', w: 1.4, op: 0.9, d: 'M-29 -294h58' }, { s: '@flood', w: 1.2, op: 0.9, d: 'M-21 -308h42' }, { s: '@flood', w: 1, op: 0.9, d: 'M-15 -316h30' }, { s: '@flood', w: 0.8, op: 0.8, d: 'M-9 -340h18M-9 -330h18' });
      return { body, lit };
    },
  });
})();
