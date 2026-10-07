/* ============================================================
   SCENE LIBRARY: landmark.singapore-flyer (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The great observation wheel by the bay, refined from the hand-drawn singapore-skyline art:
   - the real structure: a 150 m wheel with a tubular truss rim and cable spokes, 28 glazed
     capsules mounted OUTSIDE the rim, held from one side by a splayed pair of tubular legs to
     the hub, on a three-storey terminal building
   - the wheel turns, very slowly (a 'spin' hook on the 'wheel' part: one turn in 15 minutes);
     the legs and the terminal stay put
   - night: capsules lit (glow, in seeded groups), the 'lit' part: the rim's LED ring, the hub
     light and the terminal's warm glass
   No text, no logos. Anchor: the ground at the middle of the terminal.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, define } = sceneDraw;
  const R = 140, HY = -182;                         // rim radius, hub height
  define({
    id: 'landmark.singapore-flyer', category: 'landmark', size: [320, 340], box: [-168, -340, 168, 4], variants: 1, seasonal: false, flippable: false,
    parts: ['legs', 'wheel', 'base', 'lit'],
    palette: { base: {
      steel: ['#eef1f5', '#b8c0cc', '#8a94a4'], cable: '#c8d0dc', cap: ['#dfe8f0', '#6a8aa8', '#2e4a66'], base: ['#d8dee6', '#a8b2c0', '#5a6a80'],
      glass: ['#7a9ab8', '#3e5a78'], led: '#bfe6ff', hub: '#ffffff', warm: '#ffd08a', tree: '#4f7a46',
    } },
    night: { glow: { window: '#fff2cc', lamp: '#ffe8b0' }, on: 0.8 },
    anim: { spin: { part: 'wheel', pivot: [0, HY], period: 900 } },
    shadow: { rx: 60, ry: 4, h: 30 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:singapore', 'asia', 'asia-southeast', 'wheel'],
    credit: 'native (scene engine pilot), after the hand-drawn singapore-skyline art',
    build() {
      const legs = [], wheel = [], base = [], lit = [];
      // the support: two splayed tubular legs from the ground to the hub, a cross-brace
      legs.push({ s: '@steel.1', w: 7, d: `M-70 -38L-4 ${HY}M64 -38L4 ${HY}` }, { s: '@steel.0', w: 3, d: `M-70 -38L-4 ${HY}` }, { s: '@steel.2', w: 2.4, d: `M-46 -90L42 -90M-28 -130L26 -130` });
      // the rim: a double ring joined by a zigzag truss
      wheel.push({ s: '@steel.0', w: 3, d: ell(0, HY, R, R) }, { s: '@steel.1', w: 2, d: ell(0, HY, R - 7, R - 7) });
      let z = '';
      for (let i = 0; i < 112; i++) { const a = i / 112 * Math.PI * 2, rr = i % 2 ? R : R - 7; z += (i ? 'L' : 'M') + f1(Math.cos(a) * rr) + ' ' + f1(HY + Math.sin(a) * rr); }
      wheel.push({ s: '@steel.2', w: 0.8, op: 0.8, d: z + 'z', detail: true });
      // cable spokes, two sets crossing at the hub
      let sp = '';
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, b = a + 0.07; sp += `M${f1(Math.cos(a) * 9)} ${f1(HY + Math.sin(a) * 9)}L${f1(Math.cos(b) * (R - 7))} ${f1(HY + Math.sin(b) * (R - 7))}`; }
      wheel.push({ s: '@cable', w: 0.7, op: 0.85, d: sp });
      wheel.push(['@steel.1', ell(0, HY, 12, 12)], ['@steel.0', ell(-2, HY - 2, 7, 7)]);
      // the capsules: outside the rim, a glazed pod with a frame; lit in four groups
      // each of the 28 capsules on its own (a shell, its glazing that lights at dusk, the mounting arm), so the night
      // ring is a real pattern of lit and dark pods rather than four blocks
      let arms = '';
      for (let i = 0; i < 28; i++) {
        const a = i / 28 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), cx = c * (R + 9), cy = HY + sn * (R + 9);
        arms += `M${f1(c * R)} ${f1(HY + sn * R)}L${f1(c * (R + 4))} ${f1(HY + sn * (R + 4))}`;
        wheel.push({ f: '@cap.0', d: ell(cx, cy, 7.5, 5.2), detail: true }, { f: '@glass.0', d: ell(cx, cy - 0.4, 5.6, 3.4), glow: 'window' });
      }
      wheel.push({ s: '@steel.1', w: 1.4, d: arms }, { s: '@steel.2', w: 1, op: 0.7, d: ell(0, HY, 20, 20) });
      // the terminal: three storeys of glass and white frame, a curving roof
      base.push(['@base.1', 'M-120 0V-30Q-60 -42 0 -40Q60 -42 120 -30V0z'], ['@base.0', 'M-120 -30Q-60 -42 0 -40Q60 -42 120 -30V-27Q60 -38 0 -36Q-60 -38 -120 -27z']);
      let win = ['', '', ''];
      for (let row = 0; row < 3; row++) for (let x = -114; x < 112; x += 12) win[(row + Math.floor((x + 120) / 36)) % 3] += rect(x, -26 + row * 8, 9, 5);
      win.forEach(d => base.push({ f: '@glass.1', d, glow: 'window' }));
      base.push(['@base.2', rect(-120, -2, 240, 2)], { s: '@base.2', w: 0.6, op: 0.5, d: 'M-120 -18H120M-120 -10H120' });
      // the roof garden along the terminal and the plinths of the two legs
      base.push(['@tree', 'M-96 -38Q-60 -50 -20 -41Q20 -50 60 -42Q90 -48 108 -36L100 -34Q60 -40 20 -38Q-20 -40-60 -40Q-80 -38-96 -34z'], ['@base.0', rect(-78, -42, 18, 4) + rect(56, -42, 18, 4)], { s: '@base.2', w: 0.8, op: 0.6, d: 'M-118 -30Q-60 -41 0 -39Q60 -41 118 -30' });
      // night: the LED ring on the rim, the hub, the terminal's warm wash
      lit.push({ s: '@led', w: 2, op: 0.9, d: ell(0, HY, R - 3.5, R - 3.5) }, { s: '@led', w: 7, op: 0.18, d: ell(0, HY, R - 3.5, R - 3.5) }, ['@hub', ell(0, HY, 5, 5), 0.9],
        { f: { lin: [[0, '@warm', 0.1], [1, '@warm', 0.55]], x1: 0, y1: -40, x2: 0, y2: 0 }, d: 'M-120 0V-30Q-60 -42 0 -40Q60 -42 120 -30V0z' });
      return { legs, wheel, base, lit };
    },
  });
})();
