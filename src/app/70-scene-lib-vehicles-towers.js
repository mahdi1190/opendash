/* ============================================================
   SCENE LIBRARY: vehicles, the TOWERS kit (big-city streets and bridges; docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per variant.

   vehicle.car    a small saloon seen side on: a body in one of 5 colours, glass with a pillar,
                  door lines, wheels with hubs; head and tail lights that glow at real dusk
   vehicle.taxi   a city cab: a yellow saloon with a roof light box, a checker-free plain side
                  (no text, no numbers, no livery) (2 variants: saloon, people-carrier)
   Both FACE RIGHT (the front on the right). Anchor: the road under the middle. Lit from the LEFT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { rect, ell, define } = sceneDraw;
  const wheels = (xs, r) => xs.map(x => ell(x, -r, r, r)).join('');
  const hubs = (xs, r) => xs.map(x => ell(x, -r, r * 0.45, r * 0.45)).join('');
  define({
    id: 'vehicle.car', category: 'vehicle', size: [92, 34], variants: 5, seasonal: false, flippable: true, parts: ['body', 'wheels'],
    palette: { base: {
      paint: ['#c8d0d8', '#2a3a5a', '#8a2a2a', '#3a3e42', '#f0f0ec'], paintD: ['#8e98a2', '#1c2840', '#5e1c1c', '#24272a', '#c4c8cc'],
      glass: ['#2e3a46', '#5a6e80'], tyre: '#1a1c1e', hub: '#a8b0b6', head: '#fff4d0', tail: '#e03a2a', trim: '#1e2226',
    } },
    night: { glow: { lamp: '#fff2c8', tail: '#ff5a40' }, on: 1 },
    anim: { bob: { part: 'body', dy: 0.5, period: 0.9 } },
    shadow: { rx: 40, ry: 3, h: 22 },
    tags: ['car', 'road', 'city', 'traffic', 'kit:vehicles', 'kit:towers', 'kit:urban', 'role:vehicle'],
    credit: 'native (scene engine pilot)',
    build(v) {
      const body = [
        [`@paint.${v}`, 'M-44-8Q-44-16-36-17L-22-18L-12-28H16L28-18L40-16Q46-14 46-8V-5H-44z'],
        [`@paintD.${v}`, 'M-44-10H46V-5H-44z'],
        { f: '@glass.0', d: 'M-18-18L-10-26H2V-18zM6-18V-26H14L24-18z' }, ['@glass.1', 'M-14-19L-9-24H-4L-9-19z', 0.7],
        { s: '@trim', w: 0.8, op: 0.6, d: 'M4-18V-7M-20-17V-8M26-16V-8' },
        { f: '@head', d: rect(42, -14, 4, 3), glow: 'lamp' }, { f: '@head', d: rect(43, -9.5, 3, 1.6), glow: 'lamp' }, { f: '@tail', d: rect(-45, -14, 3, 3), glow: 'tail' }, { f: '@tail', d: rect(-45, -9.5, 2.4, 1.4), glow: 'tail' },
        ['@trim', rect(-30, -8, 8, 1.4) + rect(8, -8, 8, 1.4)],
      ];
      return { body, wheels: [['@tyre', wheels([-28, 30], 6)], ['@hub', hubs([-28, 30], 6)]] };
    },
  });
  define({
    id: 'vehicle.taxi', category: 'vehicle', size: [96, 40], variants: 2, seasonal: false, flippable: true, parts: ['body', 'wheels'],
    palette: { base: { paint: '#f2c230', paintD: '#c89818', glass: ['#2e3a46', '#5a6e80'], tyre: '#1a1c1e', hub: '#a8b0b6', head: '#fff4d0', tail: '#e03a2a', trim: '#1e2226', sign: '#fff6d8' } },
    night: { glow: { lamp: '#fff2c8', tail: '#ff5a40', sign: '#fff2c0' }, on: 1 },
    anim: { bob: { part: 'body', dy: 0.5, period: 0.8 } },
    shadow: { rx: 42, ry: 3, h: 24 },
    tags: ['taxi', 'cab', 'road', 'city', 'traffic', 'kit:vehicles', 'kit:towers', 'kit:urban', 'role:vehicle'],
    credit: 'native (scene engine pilot)',
    build(v) {
      const body = v === 0 ? [
        ['@paint', 'M-46-8Q-46-16-38-17L-24-18L-14-28H16L28-18L42-16Q48-14 48-8V-5H-46z'], ['@paintD', 'M-46-10H48V-5H-46z'],
        { f: '@glass.0', d: 'M-20-18L-12-26H0V-18zM4-18V-26H14L24-18z' }, { s: '@trim', w: 0.8, op: 0.6, d: 'M2-18V-7M-22-17V-8M26-16V-8' },
        { f: '@sign', d: rect(-8, -33, 14, 5), glow: 'sign' }, ['@trim', rect(-9, -28.4, 16, 1)],
      ] : [
        ['@paint', 'M-46-8V-22Q-46-30-36-30H18Q28-30 34-20L44-16Q48-14 48-8V-5H-46z'], ['@paintD', 'M-46-10H48V-5H-46z'],
        { f: '@glass.0', d: 'M-40-20V-27H-22V-20zM-18-20V-27H2V-20zM6-20V-27H18L28-20z' }, { s: '@trim', w: 0.8, op: 0.6, d: 'M-20-20V-7M4-20V-7' },
        { f: '@sign', d: rect(-12, -35, 14, 5), glow: 'sign' }, ['@trim', rect(-13, -30.4, 16, 1)],
      ];
      body.push({ f: '@head', d: rect(44, -14, 4, 3), glow: 'lamp' }, { f: '@head', d: rect(45, -9.5, 3, 1.6), glow: 'lamp' }, { f: '@tail', d: rect(-47, -14, 3, 3), glow: 'tail' }, ['@trim', rect(-32, -8, 8, 1.4) + rect(8, -8, 8, 1.4)]);
      return { body, wheels: [['@tyre', wheels([-30, 32], 6.4)], ['@hub', hubs([-30, 32], 6.4)]] };
    },
  });
})();
