/* ============================================================
   SCENE LIBRARY: road vehicles (docs/dev/SCENE_ENGINE.md 2.3, 2.7 kits london / vehicles).
   PURE: sceneObjDefine calls only. Generic liveries, no operator marks or lettering.
   Anchor: the middle of the wheelbase on the road. Faces RIGHT (actors flip for leftward travel).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;

  /* ---------- vehicle.bus: a double-deck bus (v0 red, v1 a second generic livery), lit saloon windows ---------- */
  sceneObjDefine({
    id: 'vehicle.bus', category: 'vehicle', size: [150, 66], variants: 2, seasonal: false, flippable: true,
    palette: { base: { body: ['#c8281e', '#2a5a8a'], shade: ['#8a1a14', '#1a3a5a'], band: '#e8e4dc', glass: ['#2a343e', '#9ab0c0'], tyre: '#1e2024', hub: '#8a8e92', lamp: '#fff4d0' } },
    night: { glow: { window: '#ffe6a8', lamp: '#fff0c0' }, on: 0.95 }, shadow: { rx: 76, ry: 6, h: 66 },
    anim: { bob: { part: 'body', dy: 0.7, period: 0.8 } }, parts: ['body', 'wheels'],
    tags: ['london', 'bus', 'road', 'kit:london', 'kit:vehicles', 'role:vehicle'],
    credit: 'native: a generic double-deck bus',
    build(v) {
      const b = `@body.${v}`, s = `@shade.${v}`, body = [];
      body.push([b, 'M-74 -8V-60Q-74 -66 -68 -66H66Q74 -66 74 -58V-8z'], [s, rect(-74, -14, 148, 6)], ['@band', rect(-74, -36, 148, 3)]);
      const up = [], low = [];
      for (let i = 0; i < 6; i++) up.push(rect(-64 + i * 21, -60, 17, 15));
      for (let i = 0; i < 5; i++) low.push(rect(-46 + i * 21, -31, 17, 14));
      body.push({ f: '@glass.0', d: up.slice(0, 3).join(''), glow: 'window' }, { f: '@glass.0', d: up.slice(3).join(''), glow: 'window' },
        { f: '@glass.0', d: low.slice(0, 3).join(''), glow: 'window' }, { f: '@glass.0', d: low.slice(3).join(''), glow: 'window' });
      body.push(['@glass.1', rect(62, -31, 10, 16), 0.9], ['@glass.0', rect(-70, -31, 18, 22)], { f: '@lamp', d: ell(71, -11, 2, 2), glow: 'lamp' });
      const wheels = [['@tyre', ell(-48, -6, 9, 9) + ell(48, -6, 9, 9)], ['@hub', ell(-48, -6, 3.5, 3.5) + ell(48, -6, 3.5, 3.5)]];
      return { body, wheels };
    },
  });
})();
