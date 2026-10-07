/* ============================================================
   SCENE LIBRARY: landmark.chrysler (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Refined from the crowned tower in the hand-drawn new-york-skyline art:
   - the real structure: a brick shaft over a wider stepped base, dark bands of windows
     between white brick, the corner ornaments at the setbacks, then the stainless steel crown
     of seven terraced arches, each pierced by triangular windows in a sunburst, and the needle
   - the steel crown catches the light on the left and falls to blue-grey on the right
   - night: windows lit in seeded groups (glow); the 'lit' part lights the crown's triangular
     windows white in their chevron rows, the famous night look
   No text, no logos. Anchor: the ground at the middle of the front.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  define({
    id: 'landmark.chrysler', category: 'landmark', size: [100, 410], variants: 1, seasonal: false, flippable: false, parts: ['body', 'lit'],
    palette: { base: {
      brick: ['#e2ddd2', '#b6b0a4', '#f4f1ea'], band: ['#3e4250', '#2c303c'], steel: ['#e6ecf2', '#a8b4c4', '#6e7c90', '#ffffff'],
      chevron: '#fffbe8', flood: '#e8f0ff',
    } },
    night: { glow: { window: '#ffd690' }, on: 0.55 },
    shadow: { rx: 44, ry: 5, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:us/place:new-york', 'us', 'us-northeast', 'skyline', 'skyscraper', 'art-deco'],
    credit: 'native (scene engine pilot), after the hand-drawn new-york-skyline art',
    build(v, r) {
      const body = [], lit = [], cells = [];
      const blocks = [[50, 0, -40], [42, -40, -96], [36, -96, -150], [30, -150, -262]];
      blocks.forEach(([hw, y0, y1]) => {
        const h = y0 - y1, side = Math.min(9, hw * 0.24);
        body.push(['@brick.1', poly([[hw, y0], [hw, y1], [hw + side, y1 - side * 0.3], [hw + side, y0]])]);
        body.push(['@brick.0', rect(-hw, y1, hw * 2, h)], ['@brick.2', rect(-hw, y1, 2, h)], ['@brick.1', rect(hw * 0.6, y1, hw * 0.4, h), 0.3]);
        // horizontal window bands (the tower reads as dark stripes on white brick)
        let bd = '';
        for (let y = y1 + 5; y < y0 - 4; y += 7) { bd += rect(-hw + 3, y, hw * 2 - 6, 3); for (let x = -hw + 3; x < hw - 6; x += 7) cells.push([x, y, 5.4, 3]); }
        body.push(['@band.0', bd, 0.82]);
        // the corner ornaments at each setback (steel)
        body.push(['@steel.1', poly([[-hw, y1], [-hw - 3, y1 - 6], [-hw + 6, y1]])], ['@steel.1', poly([[hw, y1], [hw + 3, y1 - 6], [hw - 6, y1]])]);
      });
      // the window bays over the dark bands (full size only), in 14 seeded groups that light at real dusk
      const g = sceneDraw.winGroups(r, cells, 14);
      g.forEach(d => { if (d) body.push({ f: '@band.1', d, op: 0.4, glow: 'window', detail: true }); });
      // the 31st-floor setback ornaments (winged radiator caps) and the 61st-floor eagle gargoyles, steel, at the corners
      body.push(['@steel.0', 'M-42 -96l-9 -3 3 -3 7 1zM42 -96l9 -3 -3 -3 -7 1z'], ['@steel.0', 'M-30 -262l-10 -2 2 -4 8 2zM30 -262l10 -2 -2 -4 -8 2z'], ['@steel.2', 'M-42 -96l-9 -3 3 -1zM30 -262l10 -2 -2 -1z', 0.7]);
      // the crown: seven terraced arches, narrowing upward, each with a row of triangular windows
      let y = -262, hw = 28, chev = '', tri = '';
      for (let i = 0; i < 7; i++) {
        const ah = 14 - i * 0.6, top = y - ah;
        const arch = `M${f1(-hw)} ${f1(y)}V${f1(top + ah * 0.35)}Q${f1(-hw)} ${f1(top - ah * 0.55)} 0 ${f1(top - ah * 0.6)}Q${f1(hw)} ${f1(top - ah * 0.55)} ${f1(hw)} ${f1(top + ah * 0.35)}V${f1(y)}z`;
        body.push(['@steel.0', arch], ['@steel.2', `M0 ${f1(top - ah * 0.6)}Q${f1(hw)} ${f1(top - ah * 0.55)} ${f1(hw)} ${f1(top + ah * 0.35)}V${f1(y)}H${f1(hw * 0.35)}z`, 0.55]);
        // the triangular windows round the arch (a sunburst)
        const n = 7 - Math.floor(i / 2);
        for (let k = 0; k < n; k++) {
          const a = Math.PI * (0.12 + 0.76 * (k + 0.5) / n), cx = -Math.cos(a) * hw * 0.72, cy = top + ah * 0.3 - Math.sin(a) * ah * 0.75;
          tri += poly([[cx - 2.4, cy + 3], [cx, cy - 3.2], [cx + 2.4, cy + 3]]);
        }
        // each tier's triangular windows: dark by day, the lit sunburst at night, tier by tier
        body.push(['@band.0', tri, 0.9]); lit.push(['@chevron', tri]); chev += tri; tri = '';
        body.push({ s: '@steel.3', w: 0.8, op: 0.8, d: `M${f1(-hw)} ${f1(top + ah * 0.35)}Q${f1(-hw)} ${f1(top - ah * 0.55)} 0 ${f1(top - ah * 0.6)}` });
        y = top + ah * 0.1; hw *= 0.8;
      }
      lit.push({ f: { rad: [[0, '@flood', 0.4], [1, '@flood', 0]], cx: 0, cy: -320, r: 50 }, d: rect(-50, -372, 100, 110) });
      // the needle
      body.push(['@steel.0', poly([[-2.6, y + 2], [0, -408], [2.6, y + 2]])], ['@steel.2', poly([[0, -408], [2.6, y + 2], [0.4, y + 2]]), 0.6]);
      body.push({ f: '@band.1', d: rect(-46, -12, 92, 8), glow: 'window' });
      return { body, lit };
    },
  });
})();
