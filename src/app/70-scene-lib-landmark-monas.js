/* ============================================================
   SCENE LIBRARY: landmark.monas (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   The National Monument of Jakarta, refined from the hand-drawn jakarta-skyline art
   (`scene upgrade asia-southeast/jakarta-skyline --box 680,140,920,700 --slug monas`; the
   extraction only gave the proportions, the monument is REDRAWN):
   - the real structure (132 m, 4 units a metre): a low square terrace at the foot; the broad
     square "cup" (45 m wide, 17 m high) whose marble walls flare outward to a parapet; the
     white obelisk, square and tapering, in marble courses, from the cup to 113 m; the small
     flared platform at the top with the glazed observation room and its roof; a short
     pedestal; and the bronze flame clad in gold leaf, 14 m tall, its tongues rising to a point
   - white marble lit on the left and shaded on the right, one light direction
   - night: the shaft and the cup washed white from below, the parapet and the platform
     traced in warm light, the gilded flame glowing (the 'lit' part); the observation room's
     windows and the courtyard lamps (glow)
   No text, no logos, no flags or emblems. Anchor: the ground at the middle of the terrace.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const Y0 = -76, Y1 = -440;                                  // the shaft: from the cup's terrace (19 m) to the platform (110 m)
  const hw = y => 21 - (Y0 - y) / (Y0 - Y1) * 10;             // its half-width, 10.5 m at the foot to 5.5 m at the top
  const rid = y => f1(hw(y) * 0.22);                          // the corner between the lit face and the shaded face
  define({
    id: 'landmark.monas', category: 'landmark', size: [244, 528], variants: 1, seasonal: false, flippable: false,
    parts: ['body', 'lit'],
    palette: { base: {
      marble: ['#f6f2ea', '#e6e0d5', '#cbc3b6', '#a79e91'], stone: ['#d6cec1', '#b5ab9c', '#8c8274'],
      gold: ['#ffe79a', '#f4bd3c', '#c98b1c', '#8c5c12'], glass: ['#56677a', '#3b4757'], metal: '#5f5b55',
      lightW: '#fff7e6', lightG: '#ffd46e',
    } },
    night: { glow: { window: '#ffe2a8', lamp: '#fff0c4' }, on: 0.8 },
    shadow: { rx: 124, ry: 6, h: 60 },
    reflect: true,
    tags: ['landmark', 'place:asia/place:jakarta', 'asia', 'asia-southeast', 'monument', 'obelisk'],
    credit: 'native (scene engine upgrade), after the hand-drawn jakarta-skyline art',
    build(v, r) {
      const body = [], lit = [];
      const xg = (x0, x1, a, b, c, d) => ({ lin: [[0, a], [0.35, b], [0.7, c], [1, d]], x1: x0, y1: 0, x2: x1, y2: 0 });
      // the terrace at the foot: its face and coping, the stair in the middle, the shadow of the cup on it
      body.push(['@stone.1', rect(-122, -8, 244, 8)], ['@stone.0', rect(-123, -9.4, 246, 1.8)], ['@stone.2', rect(-26, -8, 52, 8)]);
      body.push({ s: '@stone.0', w: 0.7, op: 0.8, d: 'M-26 -2H26M-26 -4H26M-26 -6H26', detail: true }, ['@stone.2', rect(-64, -9.4, 128, 1.4), 0.6]);
      let rail = 'M-121 -16H121';
      for (let x = -120; x <= 120; x += 6) rail += `M${x} -9.4V-16`;
      body.push({ s: '@metal', w: 0.6, op: 0.7, d: rail, detail: true });
      // four lamp posts on the terrace, their lanterns (glow)
      let posts = '', heads = '';
      for (const x of [-112, -78, 78, 112]) { posts += rect(x - 0.6, -26, 1.2, 16.6); heads += ell(x, -27.5, 2.2, 2.6); }
      body.push(['@metal', posts], { f: '@marble.0', d: heads, glow: 'lamp' });
      // the cup: marble walls flaring out to the parapet, lit on the left; its plinth; the panels of the cladding
      const cup = 'M-60 -10C-61 -28 -72 -52 -90 -66L-92 -70H92L90 -66C72 -52 61 -28 60 -10Z';
      body.push({ f: xg(-92, 92, '@marble.1', '@marble.0', '@marble.2', '@marble.3'), d: cup }, ['@stone.0', rect(-62, -11.5, 124, 3)]);
      for (let k = -5; k <= 6; k++) {   // the panel joints: each casts a thin shade on the right (12 panels)
        const xb = (k - 0.5) * 10, xt = (k - 0.5) * 15.1;
        body.push({ s: k > 1 ? '@marble.3' : '@marble.2', w: 0.8, op: 0.55, d: `M${f1(xb)} -11.5C${f1(xb * 1.02)} -30 ${f1(xt * 0.82)} -52 ${f1(xt)} -66`, detail: true });
      }
      body.push(['@marble.0', rect(-94, -74, 188, 4.4)], ['@marble.3', rect(-91, -69.6, 182, 1.4), 0.6], ['@marble.2', rect(-94, -70.6, 188, 0.9), 0.7]);
      let pp = 'M-93 -78.5H93';
      for (let x = -92; x <= 92; x += 4.6) pp += `M${f1(x)} -74V-78.5`;
      body.push({ s: '@metal', w: 0.5, op: 0.6, d: pp, detail: true });
      // the obelisk: one lit face and one shaded face for the tile, then the marble courses (detail)
      body.push({ f: '@marble.1', d: poly([[-hw(Y0), Y0], [rid(Y0), Y0], [rid(Y1), Y1], [-hw(Y1), Y1]]) });
      body.push({ f: '@marble.2', d: poly([[rid(Y0), Y0], [hw(Y0), Y0], [hw(Y1), Y1], [rid(Y1), Y1]]) });
      const N = 13;
      for (let i = 0; i < N; i++) {
        const a = Y0 + (Y1 - Y0) * i / N, b = Y0 + (Y1 - Y0) * (i + 1) / N;
        body.push({ f: '@marble.0', d: poly([[-hw(a), a], [rid(a), a], [rid(b), b], [-hw(b), b]]), op: i % 2 ? 0.45 : 0.2, detail: true });
        body.push({ f: '@marble.3', d: poly([[rid(a), a], [hw(a), a], [hw(b), b], [rid(b), b]]), op: i % 2 ? 0.22 : 0.08, detail: true });
      }
      let courses = '';
      for (let i = 1; i < N; i++) { const y = Y0 + (Y1 - Y0) * i / N; courses += `M${f1(-hw(y))} ${f1(y)}H${f1(hw(y))}`; }
      body.push({ s: '@marble.3', w: 0.5, op: 0.45, d: courses, detail: true });
      body.push({ s: '@lightW', w: 1.1, op: 0.9, d: `M${f1(-hw(Y0))} ${Y0}L${f1(-hw(Y1))} ${Y1}` }, { s: '@marble.3', w: 1, op: 0.8, d: `M${f1(hw(Y0))} ${Y0}L${f1(hw(Y1))} ${Y1}` });
      body.push({ s: '@marble.2', w: 0.6, op: 0.7, d: `M${rid(Y0)} ${Y0}L${rid(Y1)} ${Y1}`, detail: true });
      body.push(['@marble.1', rect(-24, -78.5, 48, 4)], ['@marble.0', rect(-24, -78.5, 18, 4)]);
      // the platform at the top: a small flared cup, the deck, the glazed observation room, its roof
      const top = `M${f1(-hw(Y1))} ${Y1}C-12 -444 -17 -448 -22 -451L-23.5 -453H23.5L22 -451C17 -448 12 -444 ${f1(hw(Y1))} ${Y1}Z`;
      body.push({ f: xg(-23.5, 23.5, '@marble.1', '@marble.0', '@marble.2', '@marble.3'), d: top });
      body.push({ s: '@marble.2', w: 0.5, op: 0.6, d: 'M-7 -441L-14 -452M0 -441V-452M7 -441L14 -452M-3.5 -441L-7 -452M3.5 -441L7 -452', detail: true });
      body.push(['@marble.0', rect(-24.5, -456, 49, 3)], ['@glass.0', rect(-20, -463.5, 40, 7.5)], ['@glass.1', rect(4, -463.5, 16, 7.5), 0.7]);
      let mull = '';
      for (let x = -20; x <= 20; x += 4) mull += `M${x} -456V-463.5`;
      body.push({ s: '@marble.1', w: 0.6, op: 0.8, d: mull, detail: true });
      body.push({ f: '@glass.0', d: rect(-18.5, -462.5, 37, 2.6) + rect(-18.5, -459.2, 37, 2.2), op: 0.6, glow: 'window', detail: true });
      body.push(['@marble.0', rect(-22.5, -466.5, 45, 3)], ['@marble.3', rect(-22.5, -463.7, 45, 0.6), 0.7]);
      // the pedestal, its ring, and the bowl the flame stands in
      body.push({ f: xg(-12, 12, '@marble.1', '@marble.0', '@marble.2', '@marble.3'), d: poly([[-12, -466.5], [12, -466.5], [8.5, -473], [-8.5, -473]]) });
      body.push(['@marble.0', rect(-9.5, -474.4, 19, 1.6)], ['@gold.3', 'M-8.5 -474.4C-9 -477 -7 -478.6 -5 -479H5C7 -478.6 9 -477 8.5 -474.4Z']);
      // the gilded flame: the body lit on the left, its side tongues, the bright core, the grooves between the tongues
      const flame = 'M-6 -479C-12.5 -484 -13 -493 -10 -500C-7.5 -506 -6 -510 -3.5 -516C-2 -520 -0.5 -524 0.6 -528C2.6 -523 5 -518 7 -512C9.5 -505 13 -495 11 -488C10 -484 8.5 -481 6 -479Z';
      body.push({ f: xg(-13, 13, '@gold.1', '@gold.0', '@gold.2', '@gold.3'), d: flame });
      body.push(['@gold.2', 'M-9.5 -484C-14.5 -490 -15 -499 -12.5 -506C-12 -500 -10.5 -494 -6.5 -489Z'], ['@gold.3', 'M9 -486C14 -492 15.5 -502 12.6 -510C11.6 -503 9.5 -497 5.6 -492Z']);
      body.push(['@gold.1', 'M-4.6 -497C-8 -503 -7.6 -510 -5.6 -515C-5 -510 -3.6 -506 -1.6 -503Z'], ['@gold.2', 'M4 -500C7.6 -506 8.2 -513 6.4 -519C5.4 -513 4 -509 1.6 -505Z']);
      body.push(['@gold.0', 'M-3.6 -480C-7 -488 -5 -497 -0.6 -506C3 -497 5 -488 3.6 -480Z'], ['@lightW', 'M-1.6 -482C-3 -488 -2.2 -494 -0.4 -499C1.2 -494 2 -488 1.4 -482Z', 0.7]);
      body.push({ s: '@gold.3', w: 0.6, op: 0.7, d: 'M-6.6 -489Q-4.6 -496 -2.4 -502M6.6 -490Q4.2 -497 2.6 -503M-1.4 -506Q0 -514 0.4 -522', detail: true });
      body.push({ s: '@gold.0', w: 0.6, op: 0.8, d: 'M-10.4 -490Q-11.4 -496 -9 -502M-7 -506Q-5.6 -512 -3.6 -517', detail: true });
      // night: the shaft and cup washed from below, the parapet and platform traced in warm light, the flame aglow
      lit.push({ f: { lin: [[0, '@lightW', 0.6], [0.55, '@lightW', 0.25], [1, '@lightW', 0.12]], x1: 0, y1: Y0, x2: 0, y2: Y1 }, d: poly([[-hw(Y0), Y0], [hw(Y0), Y0], [hw(Y1), Y1], [-hw(Y1), Y1]]) });
      lit.push({ f: { lin: [[0, '@lightW', 0.55], [1, '@lightW', 0.2]], x1: 0, y1: -10, x2: 0, y2: -70 }, d: cup });
      lit.push({ f: '@lightG', d: rect(-94, -74, 188, 1.6), op: 0.85 }, { f: '@lightG', d: rect(-24.5, -456, 49, 1.4), op: 0.85 }, { f: '@lightW', d: rect(-18.5, -462.5, 37, 5.8), op: 0.35 });
      lit.push({ f: { rad: [[0, '@lightG', 0.65], [1, '@lightG', 0]], cx: 0, cy: -500, r: 44 }, d: ell(0, -500, 44, 44) });
      lit.push({ f: '@lightG', d: flame, op: 0.5 }, { f: '@lightW', d: 'M-3.6 -480C-7 -488 -5 -497 -0.6 -506C3 -497 5 -488 3.6 -480Z', op: 0.6 });
      return { body, lit };
    },
  });
})();
