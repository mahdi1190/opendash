/* ============================================================
   SCENE LIBRARY: area-sheffield2, street furniture (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else.
   structure.sheffield2-shelter: a glazed stop shelter with a flat canopy, a
   bench and a lit back panel (tram stops on West Street, bus stops on Ecclesall
   Road). No text, no signs, no logos.
   Lit from the LEFT. Check with: node tools/anim-pack.mjs object lint <id>.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = (n) => Math.round(n * 10) / 10;
  const R = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const NIGHT = { glow: { window: '#f6d48a', lamp: '#ffe6a8' }, on: 0.7 };

  sceneObjDefine({
    id: 'structure.sheffield2-shelter', category: 'structure', size: [220, 130], variants: 1, seasonal: false, flippable: true, weight: 0,
    palette: { base: {
      dark: ['#2e3236', '#44484d', '#5a5f64'], glass: ['#3a4c58', '#6a8494', '#a4bcc8'], warm: ['#f0c070'], seat: ['#7a5a3a', '#5a4228'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 100, ry: 8, h: 120 }, reflect: false,
    tags: ['structure', 'street', 'urban', 'place:uk/sheffield', 'uk', 'sheffield', 'shelter', 'transport', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (a glazed stop shelter, no lettering)',
    build() {
      const b = [];
      b.push(['@dark.0', R(0, 0, 220, 14)], ['@dark.1', R(0, 14, 220, 4)]);
      b.push(['@dark.0', R(4, 18, 5, 112)], ['@dark.0', R(211, 18, 5, 112)]);
      b.push({ f: '@glass.0', d: R(12, 22, 196, 84), glow: 'window' });
      for (let k = 0; k < 7; k++) b.push(['@dark.1', R(12 + k * 32, 22, 2.5, 84)]);
      b.push({ s: '@glass.2', w: 1.2, d: 'M14 30L72 30M14 46L72 46' });
      b.push(['@seat.0', R(60, 96, 100, 6)], ['@seat.1', R(60, 102, 100, 2)]);
      b.push(['@dark.0', R(64, 102, 4, 14)], ['@dark.0', R(150, 102, 4, 14)]);
      b.push(['@dark.1', R(200, 40, 3, 90)]);
      const lit = [{ f: '@warm', d: R(12, 22, 196, 84), op: 0.2 }];
      return { body: b, lit };
    },
  });
})();

/* Division Street: the corner block at the end of the street (a generic Victorian corner, no name, no lettering). */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = (n) => Math.round(n * 10) / 10;
  const R = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const P = (pts) => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  const NIGHT = { glow: { window: '#f6d48a', lamp: '#ffe6a8' }, on: 0.7 };
  sceneObjDefine({
    id: 'landmark.sheffield2-division-corner', category: 'landmark', size: [300, 300], variants: 1, seasonal: false, flippable: true,
    palette: { base: {
      brick: ['#8a4a3a', '#6e3a2e', '#a25a46'], stone: ['#c8c0ae', '#a69e8c', '#ddd6c6'], dark: ['#2e3236', '#44484d'],
      glass: ['#3a4c58', '#6a8494', '#a4bcc8'], warm: ['#f0c070'], roof: ['#4a4e54', '#383c42'],
    } },
    night: NIGHT, parts: ['body', 'lit'], shadow: { rx: 130, ry: 12, h: 280 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'sheffield', 'corner', 'victorian', 'division-street', 'kit:urban'],
    credit: 'drawn for the Sheffield area scenes (a generic Victorian corner block closing the end of a street)',
    build() {
      const b = [];
      b.push(['@brick.0', R(0, 70, 300, 230)], ['@brick.1', R(0, 70, 8, 230)]);
      b.push(['@stone.1', R(-6, 60, 312, 12)], ['@stone.0', R(-4, 226, 308, 6)]);
      b.push(['@stone.0', R(220, 0, 70, 64)], ['@roof.0', P([[214, 2], [296, 2], [255, -46]])], ['@stone.1', R(218, 56, 74, 12)]);
      const lit = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
        const x = 22 + c * 66, y = 92 + r * 44;
        if (c === 3 && r === 1) continue;
        b.push(['@stone.1', R(x - 3, y - 3, 40, 34)]);
        b.push({ f: '@glass.' + ((r + c) % 2), d: R(x, y, 34, 28), glow: 'window' });
      }
      b.push(['@dark.0', R(0, 236, 300, 64)]);
      for (let k = 0; k < 4; k++) b.push({ f: '@glass.0', d: R(12 + k * 72, 246, 56, 42), glow: 'lamp' });
      b.push(['@stone.0', R(0, 230, 300, 4)]);
      lit.push({ f: '@warm', d: R(0, 236, 300, 64), op: 0.22 });
      return { body: b, lit };
    },
  });
})();
