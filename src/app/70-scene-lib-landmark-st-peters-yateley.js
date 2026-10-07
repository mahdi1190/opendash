/* ============================================================
   SCENE LIBRARY: landmark-st-peters-yateley (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint landmark.st-peters-yateley,
   LOOK with: node tools/anim-pack.mjs object sheet landmark.st-peters-yateley --mode night.

   St Peter's Church, Church End, Yateley (seen across Yateley Green): a long
   stone-and-flint nave and a lower chancel under clay-tile roofs, a timber
   south porch, and the 15th-century timber-framed west tower: a red-painted,
   weatherboarded lower stage under a tiled pentice, a dark boarded belfry with
   louvres and a clock on a diamond board, and a shingled pyramid spire with a
   weathercock. The same form as the nature kit's K.stPeters (the rich Yateley
   Green views), refined: buttresses, lancet windows with tracery, tile courses,
   board joints, shingle courses, a churchyard with headstones and a yew, and a
   night look (lit lancets, the porch lamp, a soft floodlight on the tower).
   Lit from the LEFT. Variant 0: the tower on the right (seen from the south-west,
   looking east); variant 1: the same church mirrored in plan for views looking
   west (the tower on the left). Never flipped by a scene (flippable: false).
   Drawn in the kit's units and scaled by 1.5 (the anchor: the foot of the tower).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const K = 1.5;
  const f1 = (n) => Math.round(n * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  /** A lancet window: dressed-stone surround, glass that lights at dusk, the mullion and a little tracery. */
  const lancet = (x, y, w, h) => [
    ['@dress', `M${f1(x - 1.4)} ${f1(y + h + 1)}V${f1(y + w * .4)}Q${f1(x + w / 2)} ${f1(y - w * .9)} ${f1(x + w + 1.4)} ${f1(y + w * .4)}V${f1(y + h + 1)}z`],
    { f: '@glass.0', d: `M${f1(x)} ${f1(y + h)}V${f1(y + w * .45)}Q${f1(x + w / 2)} ${f1(y - w * .6)} ${f1(x + w)} ${f1(y + w * .45)}V${f1(y + h)}z`, glow: 'window' },
    ['@glass.1', `M${f1(x)} ${f1(y + h * .55)}V${f1(y + w * .45)}Q${f1(x + w * .3)} ${f1(y - w * .1)} ${f1(x + w * .5)} ${f1(y - w * .05)}z`, .45],
    { s: '@dress', w: .7, d: `M${f1(x + w / 2)} ${f1(y + w * .1)}V${f1(y + h)}M${f1(x)} ${f1(y + h * .55)}h${f1(w)}` },
  ];

  sceneObjDefine({
    id: 'landmark.st-peters-yateley',
    category: 'landmark',
    size: [410, 245],
    variants: 2,
    seasonal: false,
    flippable: false,
    palette: {
      base: {
        wall: ['#d3c39c', '#b5a37a', '#e6dab8'], flint: ['#7a7468', '#5e584e'], dress: ['#e9e0c8'],
        roof: ['#7a4634', '#5c3326', '#94604a'], moss: ['#6b7a44'],
        red: ['#a8432e', '#7e2c1e', '#c25a40'], board: ['#5a4a40', '#43372f', '#74645a'], louvre: ['#cbbfa9', '#5a4a40'],
        spire: ['#4e443e', '#3a322e', '#6a5e56'], clock: ['#2c3448', '#d8b84a'],
        timber: ['#4a3a2e', '#efe6d4'], door: ['#3a2a22'], glass: ['#3e4a58', '#a8b8c8'],
        stone: ['#a8a294', '#8a8478', '#c4beb0'], yew: ['#24402c', '#2f5236', '#3e6844'], flood: ['#ffe2a8'],
      },
    },
    night: { glow: { window: '#f4c674', lamp: '#ffe2a0' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 150, ry: 14, h: 220 },
    reflect: true,
    tags: ['landmark', 'signature', 'place:uk/yateley-green', 'uk', 'yateley', 'church', 'village', 'kit:temperate'],
    credit: 'refined from the nature kit K.stPeters (the rich Yateley Green views)',
    build(v) {
      const b = [];
      const push = (...s) => b.push(...s);
      // the churchyard: a yew behind the chancel, headstones in the grass (detail)
      push(['@yew.0', 'M-214 0C-232-6-236-34-224-52C-214-70-196-74-186-60C-176-46-178-12-190 0z'],
        ['@yew.1', 'M-210-8C-224-16-224-38-214-50C-206-60-196-60-192-50C-188-38-192-18-200-8z'],
        ['@yew.2', 'M-206-30C-210-40-206-50-200-52C-196-48-196-38-200-32z', .8]);
      for (const [x, h] of [[-196, 9], [-184, 7], [-60, 8], [-46, 10], [40, 9], [52, 7]]) push({ f: '@stone.0', d: `M${x} 0V${-h + 2}q3.5-4 7 0V0z`, detail: true }, { f: '@stone.1', d: `M${x + 5} 0V${-h + 2}q1.5-2 2-1.2V0z`, op: .7, detail: true });
      // the chancel (east end, lower), then the nave
      push(['@wall.1', 'M-206 0V-26H-172V0z'], ['@roof.1', 'M-210-24L-196-46H-170L-170-24z'], ['@roof.0', 'M-204-24L-192-42H-172L-172-24z']);
      push(...lancet(-196, -21, 7, 14));
      push(['@wall.0', 'M-172 0V-34H-14V0z'], ['@wall.1', 'M-172-8H-14V0H-172z', .55], ['@wall.2', 'M-172-34H-14V-31H-172z', .8]);
      // flint and rubble courses (one path each row), lit from the left
      for (let r = 0; r < 4; r++) push({ f: '@flint.' + (r % 2), op: .32, detail: true, d: Array.from({ length: 14 }, (_, i) => ell(-166 + i * 11 + (r % 2) * 5, -6 - r * 7, 2.2, 1.3)).join('') });
      // buttresses
      for (const x of [-170, -128, -58, -16]) push(['@wall.2', `M${x} 0V-22l3-4h5V0z`], ['@wall.1', `M${x + 5} 0V-26h3V0z`, .9]);
      // the nave roof: clay tiles in courses, the far slope in shade, moss on the north side, the ridge
      push(['@roof.0', 'M-178-32L-150-70H-20L-8-32z'], ['@roof.1', 'M-178-32L-150-70L-138-32z', .65], ['@roof.2', 'M-150-70H-20L-22-66H-148z', .9]);
      for (let i = 0; i < 6; i++) push({ s: '@roof.1', w: .9, op: .5, d: `M${-176 + i * 4.6} ${-37 - i * 6}H${-10 - i * 2}` });
      push({ f: '@moss', d: 'M-120-44q8-3 14 0q-6 3-14 0zM-70-52q10-3 16 0q-8 3-16 0z', op: .55, detail: true });
      // nave windows
      for (const wx of [-162, -88, -44]) push(...lancet(wx, -27, 8, 17));
      // the timber south porch: posts, braces and bargeboards, a dark doorway, the lamp over it
      push(['@timber.1', 'M-114 0V-21H-88V0z'], ['@door', 'M-106 0V-13q5-6 10 0V0z'], { s: '@timber.0', w: 1.4, d: 'M-114 0V-21M-88 0V-21M-114-21H-88M-114-11L-108-21M-88-11L-94-21' });
      push(['@roof.0', 'M-119-19L-101-38L-83-19z'], ['@roof.1', 'M-101-38L-83-19H-92z', .7], { s: '@timber.0', w: 1.6, d: 'M-118-20L-101-36L-84-20' });
      push({ f: '#3a3530', d: rect(-102.6, -27, 3.2, 4) }, { f: '@glass.1', d: rect(-102, -26.4, 2, 2.8), glow: 'lamp' });
      // the tower, lower stage: red-painted weatherboarding, its joints, the west door, shade on the right
      push(['@red.0', 'M-28 0V-32H28V0z'], ['@red.1', 'M10 0V-32H28V0z', .55], ['@red.2', 'M-28-32H-10V-29H-28z', .5]);
      push({ s: '@red.1', w: .9, op: .6, d: Array.from({ length: 7 }, (_, i) => `M-28 ${-4 - i * 4}H28`).join('') });
      push(['@door', 'M-7 0V-15q7-7 14 0V0z'], { s: '#c28a3a', w: .6, d: 'M0-20V0' }, ['@timber.0', rect(-9, -16, 18, 2)]);
      // the pentice: a tiled skirt roof round the tower
      push(['@roof.0', 'M-38-28L-21-48H21L38-28z'], ['@roof.1', 'M21-48L38-28H22z', .7], { s: '@roof.1', w: .8, op: .5, d: 'M-34-32H34M-29-38H29M-25-43H25' });
      // the belfry: dark boarding with joints, corner posts, the louvres, the clock on its diamond board
      push(['@board.0', 'M-19-44V-104H19V-44z'], ['@board.1', 'M5-44V-104H19V-44z', .75], ['@board.2', 'M-19-104H-12V-44H-19z', .45]);
      push({ s: '@board.2', w: .8, op: .5, d: Array.from({ length: 6 }, (_, i) => `M-19 ${-50 - i * 8}H19`).join('') });
      push({ s: '@timber.0', w: 1.8, d: 'M-19-44V-104M19-44V-104' });
      push(['@louvre.0', 'M-16-102H16V-88H-16z'], { s: '@louvre.1', w: 1.1, d: 'M-12-102V-88M-6-102V-88M0-102V-88M6-102V-88M12-102V-88' }, ['@board.1', 'M-16-89H16V-88H-16z']);
      push(['@clock.0', 'M0-80L9-71L0-62L-9-71z'], ['@dress', ell(0, -71, 4.6, 4.6)], { f: '@glass.1', d: ell(0, -71, 3.6, 3.6), glow: 'lamp' }, { s: '@clock.1', w: 1.1, cap: 'round', d: 'M0-71V-74.6M0-71h2.8' });
      // the shingled pyramid spire: lit face, shaded face, shingle courses, the finial and the weathercock
      push(['@spire.0', 'M-23-103L0-146L23-103z'], ['@spire.1', 'M0-146L23-103H5z']);
      for (let i = 1; i < 7; i++) { const y = -103 - i * 6, hw = 23 * (1 - i * 6 / 43); push({ s: '@spire.2', w: .7, op: .55, d: `M${f1(-hw)} ${y}H${f1(hw)}` }); }
      push({ s: '@spire.1', w: 1.4, d: 'M0-146V-156' }, ['@spire.1', ell(0, -152, 1.6, 1.6)], ['@spire.1', 'M-6-158h9l3-2-3-2h-9l2 2z'], { s: '@spire.1', w: .8, d: 'M-4-163V-156M-6-159h4' });
      // night: a soft floodlight on the tower and the spire (only after real dusk; never graded)
      const lit = [
        { f: { rad: [[0, '@flood', .34], [1, '@flood', 0]], cx: 0, cy: -60, r: 90 }, d: 'M-30 0V-104L0-150L30-104V0z' },
        { f: { rad: [[0, '@flood', .16], [1, '@flood', 0]], cx: -90, cy: -20, r: 90 }, d: 'M-176 0V-36H-14V0z' },
      ];
      // to world units: x1.5 (the variant 1 mirror in plan)
      const fx = v === 1 ? -K : K;
      const to = (s) => { const o = Array.isArray(s) ? { f: s[0], d: s[1], op: s[2] } : Object.assign({}, s); o.m = [fx, 0, 0, K, 0, 0]; if (o.s && !o.f && !o.glow && (o.w || 0) <= 1) o.detail = true; return o; };   // hairlines (joints, courses, tracery) are detail: fill / hero only
      return { body: b.map(to), lit: lit.map(to) };
    },
  });
})();
