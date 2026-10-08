/* ============================================================
   SCENE LIBRARY: landmark.wheeler-wheel (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The Ferris wheel of the Wheeler District on the Oklahoma River, Oklahoma City (the old pier wheel
   moved inland). Drawn by hand after its form:
   - a white wheel: a double rim joined by a zigzag truss, paired tubular spokes to the hub, and
     20 open gondolas in four colours round the rim
   - held from both sides by A-frame legs of white tube (the far pair a shade darker), cross
     braced, on a boarding platform with a canopy
   - the wheel turns slowly (a 'spin' hook on the 'wheel' part: one turn in 4 minutes); the legs
     and the platform stay put. The gondolas are round, so they read right at any angle
   - night: the gondolas lit (glow); the 'lit' part: the rim's coloured LED rings (round, so
     they need not turn), the hub light and the platform's warm glow
   No text, no logos. Anchor: the ground at the middle of the platform.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, define } = sceneDraw;
  const R = 148, HY = -196, N = 20;               // rim radius, hub height, gondolas
  define({
    id: 'landmark.wheeler-wheel', category: 'landmark', size: [324, 360], box: [-164, -360, 164, 2], variants: 1, seasonal: false, flippable: false,
    parts: ['legs', 'wheel', 'base', 'lit'],
    palette: { base: {
      steel: ['#ffffff', '#dfe4ea', '#b4bcc8', '#8a94a4'], cab: ['#e8453a', '#f2c230', '#3a9ae0', '#4ab86a'], roof: '#f4f4f0',
      base: ['#d8d2c6', '#aaa294', '#6e675c'], led: ['#ff6ab4', '#6ad8ff', '#ffe27a'], hub: '#ffffff', warm: '#ffd08a',
    } },
    night: { glow: { lamp: '#ffe8b0' }, on: 0.7 },
    anim: { spin: { part: 'wheel', pivot: [0, HY], period: 240 } },
    shadow: { rx: 110, ry: 5, h: 40 },
    reflect: true,
    tags: ['landmark', 'place:us/place:oklahoma-city', 'us', 'us-mountain', 'wheel'],
    credit: 'native, drawn for the composed oklahoma-city-skyline-wheel scene (after the hand-drawn art)',
    build() {
      const legs = [], wheel = [], base = [], lit = [];
      // the far A-frame (a shade darker), then the near one, with their cross braces
      legs.push({ s: '@steel.3', w: 6, d: `M-82 -14L-6 ${HY}M86 -14L6 ${HY}` }, { s: '@steel.2', w: 2, d: 'M-56 -80H58M-34 -134H36', detail: true });
      legs.push({ s: '@steel.2', w: 8, d: `M-100 -14L-4 ${HY}M100 -14L4 ${HY}` }, { s: '@steel.0', w: 3.4, d: `M-100 -14L-4 ${HY}M100 -14L4 ${HY}` });
      legs.push({ s: '@steel.1', w: 3, d: 'M-74 -80H74M-48 -134H48' }, { s: '@steel.2', w: 1.2, op: 0.8, d: 'M-74 -80L-48 -134M74 -80L48 -134M-48 -134L0 -80L48 -134', detail: true });
      legs.push(['@base.2', rect(-108, -16, 18, 8) + rect(90, -16, 18, 8)], ['@steel.1', ell(0, HY, 9, 9)]);
      // the rim: two rings joined by a zigzag truss
      wheel.push({ s: '@steel.0', w: 3.6, d: ell(0, HY, R, R) }, { s: '@steel.1', w: 2.4, d: ell(0, HY, R - 10, R - 10) });
      let z = '';
      for (let i = 0; i < 80; i++) { const a = i / 80 * Math.PI * 2, rr = i % 2 ? R : R - 10; z += (i ? 'L' : 'M') + f1(Math.cos(a) * rr) + ' ' + f1(HY + Math.sin(a) * rr); }
      wheel.push({ s: '@steel.2', w: 0.9, op: 0.85, d: z + 'z', detail: true });
      // the spokes: a pair to each gondola, each pair its own (the near tube lit, the far one in shade)
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2, b = a + 0.05, c = a - 0.05;
        wheel.push({ s: i % 2 ? '@steel.1' : '@steel.0', w: 1.4, d: `M${f1(Math.cos(b) * 12)} ${f1(HY + Math.sin(b) * 12)}L${f1(Math.cos(a) * (R - 10))} ${f1(HY + Math.sin(a) * (R - 10))}` });
        wheel.push({ s: '@steel.3', w: 0.9, op: 0.8, d: `M${f1(Math.cos(c) * 12)} ${f1(HY + Math.sin(c) * 12)}L${f1(Math.cos(a) * (R - 10))} ${f1(HY + Math.sin(a) * (R - 10))}`, detail: true });
      }
      wheel.push({ s: '@steel.2', w: 1.2, op: 0.8, d: ell(0, HY, 46, 46), detail: true }, ['@steel.1', ell(0, HY, 14, 14)], ['@steel.0', ell(-2, HY - 2, 8, 8)]);
      // the gondolas: round open cabs in four colours, each with its pale canopy and its glow at dusk
      for (let i = 0; i < N; i++) {
        const a = (i + 0.5) / N * Math.PI * 2, cx = Math.cos(a) * (R + 3), cy = HY + Math.sin(a) * (R + 3);
        wheel.push(['@cab.' + (i % 4), ell(cx, cy, 8.5, 8.5)]);
        wheel.push({ f: '@steel.3', d: ell(cx, cy, 3.6, 3.6), op: 0.45, glow: 'lamp', detail: i % 2 === 1 });
      }
      // the boarding platform with its canopy and steps
      base.push(['@base.1', rect(-52, -20, 104, 20)], ['@base.0', rect(-58, -24, 116, 5)], ['@base.2', rect(-52, -12, 104, 3), 0.6]);
      base.push(['@roof', 'M-40 -40L-30 -48H30L40 -40z'], { s: '@base.2', w: 1.4, d: 'M-34 -40V-24M34 -40V-24' }, { s: '@base.2', w: 0.8, op: 0.6, d: 'M60 0l8-8h10l8-8M-60 0l-8-8h-10l-8-8', detail: true });
      base.push({ f: '@base.2', d: rect(-30, -18, 60, 8), op: 0.5, glow: 'lamp' });
      // the lit part: the rim's LED rings (round), the hub, the platform's warm glow
      lit.push({ s: '@led.0', w: 2.4, op: 0.9, d: ell(0, HY, R, R) }, { s: '@led.0', w: 9, op: 0.16, d: ell(0, HY, R, R) });
      lit.push({ s: '@led.1', w: 2, op: 0.85, d: ell(0, HY, R - 10, R - 10) }, { s: '@led.2', w: 1.6, op: 0.75, d: ell(0, HY, 46, 46) });
      lit.push(['@hub', ell(0, HY, 5, 5), 0.95], { f: { rad: [[0, '@hub', 0.5], [1, '@hub', 0]], cx: 0, cy: HY, r: 22 }, d: rect(-22, HY - 22, 44, 44) });
      lit.push({ f: { lin: [[0, '@warm', 0.1], [1, '@warm', 0.55]], x1: 0, y1: -40, x2: 0, y2: 0 }, d: rect(-52, -40, 104, 40) });
      return { legs, wheel, base, lit };
    },
  });
})();
