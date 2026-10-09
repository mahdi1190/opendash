/* ============================================================
   SCENE LIBRARY: proof-yateley-green (docs/dev/SCENE_ENGINE.md section 2;
   docs/dev/SCENE_ENGINE_V2.md). The parts the hand-composed Yateley Green
   proof scene (71-scene-proof-yateley-green.js) needs and the library lacked.
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

     bird.proof-heron-stalk   a grey heron wading in the hunting crouch, legs
                              stepping (walk hook): the stalking half
     bird.proof-heron-strike  the same heron standing still, the neck and bill
                              driving down into the water (turn hook): the stab
     water.proof-splash       the burst where the bill goes in: a crown of
                              drops and a ring
     bird.proof-duckling      a mallard duckling in spring and summer; the
                              same brood half-grown (hen plumage) in autumn
                              and winter
     prop.proof-ball          a tennis ball
     animal.proof-dog-ball    the library's dog (animal.dog) carrying the
                              ball home: its own shapes plus the ball
     tree.proof-yew           the old churchyard yew

   Every creature FACES RIGHT (flip to face left); light from the LEFT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const eye = (x, y, r) => [['#141414', circ(x, y, r)], ['#ffffff', circ(x - r * .35, y - r * .35, r * .38), .9]];
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const def = o => sceneObjDefine(Object.assign({}, o, { build: (v, r, ctx) => tidy(o.build(v, r, ctx)) }));
  /** An irregular leafy blob (a cluster of lobes) round (cx, cy): one closed path, seeded. */
  const blob = (rnd, cx, cy, rx, ry, n) => {
    let d = '';
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rnd() * 0.3, k = 0.78 + rnd() * 0.32; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = mx - cx, oy = my - cy, L = Math.hypot(ox, oy) || 1, bulge = 0.26 + rnd() * 0.22;
      d += (i ? '' : `M${f1(p[0])} ${f1(p[1])}`) + `Q${f1(mx + ox / L * rx * bulge)} ${f1(my + oy / L * ry * bulge)} ${f1(q[0])} ${f1(q[1])}`;
    });
    return d + 'z';
  };

  /* ---------- the heron: one drawing, two hooks (stalk: the legs; strike: the neck) ---------- */
  // Anchor: the waterline under the feet. The neck pivots at the shoulder (12, -50); the bill tip rests at (66, -60) and a
  // 78 degree turn puts it 0.7 below the waterline at x 33: the stab (the scene times the splash to the turn's peak).
  const HERON_PAL = { base: { grey: ['#8e99a2', '#b7c0c6', '#5f6b74', '#3b444c'], white: ['#eef1f2', '#d9dfe2'], streak: '#2a3036', bill: ['#e2b24a', '#b8862c'], leg: ['#8a7a4e', '#6a5c3a'], black: '#1c2228', ripple: '#eaf8f4', plume: '#c9d0d4' } };
  const heronLegs = (x0, x1) => [{ s: '@leg.0', w: 2.6, d: `M${x0} -34q1 9 2 18q1 9 2 16` }, { s: '@leg.1', w: 1.2, op: .7, d: `M${x0 + 1} -18l3-3` }, { s: '@leg.0', w: 2.4, d: `M${x1} -34q-1 9-2 18q-1 9-3 16` }];
  const heronBody = () => [
    { s: '@ripple', w: 1.3, op: .55, d: ell(0, 1.2, 15, 2.4) },
    ['@grey.0', 'M-33-40Q-26-61 0-61Q15-61 19-52Q21-42 8-36Q-12-30-33-40z'],
    ['@grey.1', 'M-26-50Q-14-60 2-60Q12-60 16-55Q0-57-26-50z', .85],
    ['@grey.2', 'M-33-40Q-18-34 6-36Q-6-42-26-45z'],
    ['@grey.3', 'M-34-41l-9 5 11-1z'],
    { s: '@grey.3', w: 1.1, op: .55, d: 'M-24-46q10-5 22-6M-18-41q12-3 22-3' },
    { s: '@plume', w: 1.2, op: .8, d: 'M14-44q2 6 0 11M17-45q3 5 2 10M11-43q1 5-1 9' },
    ['@grey.3', 'M-30-44q8-6 20-7-10 4-20 7z', .6],
  ];
  const heronNeck = () => [
    { s: '@white.1', w: 7.5, d: 'M11-49Q14-60 22-65Q30-69 41-67' },
    { s: '@white.0', w: 5, d: 'M12-51Q15-60 22-64Q30-67 40-66' },
    { s: '@streak', w: 1.1, op: .65, d: 'M17-55l2 3M20-59l2 3M24-63l2 2' },
    ['@white.0', 'M37-71Q44-75 49-69Q50-64 44-62Q38-62 37-71z'],
    ['@black', 'M38-70Q42-74 47-72Q41-71 30-69Q34-69 38-70z'],
    { s: '@black', w: 1.3, d: 'M38-70q-6 1-12 4' },
    ['@bill.0', 'M47-69L67-60L46-63z'], { s: '@bill.1', w: .8, d: 'M48-65L64-60.6' },
    ...eye(44.6, -68.4, 1.3),
  ];
  const heron = (id, anim, parts, credit) => def({
    id, category: 'bird', size: [100, 72], variants: 1, seasonal: false, flippable: true, parts, reflect: true, real: { h: 0.78, l: 1.05, w: 0.3 },
    palette: HERON_PAL, anim, shadow: { rx: 22, ry: 3, h: 70 },
    tags: ['uk', 'pond', 'heron', 'grey-heron', 'hunting', 'water', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit,
    build() {
      const legs = heronLegs(3, -3);
      if (parts[0] === 'legA') return { legA: [legs[0], legs[1]], legB: [legs[2]], body: heronBody(), neck: heronNeck() };
      return { legs, body: heronBody(), neck: heronNeck() };
    },
  });
  heron('bird.proof-heron-stalk', { walk: { parts: ['legA', 'legB'], pivot: [0, -34], deg: 9, period: 1.7, bob: .5 } }, ['legB', 'body', 'legA', 'neck'],
    'drawn for the Yateley Green proof: a wading grey heron in the hunting crouch, stepping');
  heron('bird.proof-heron-strike', { turn: { part: 'neck', pivot: [12, -50], deg: 78, period: 6, hold: .9 } }, ['legs', 'body', 'neck'],
    'drawn for the Yateley Green proof: the same heron, the neck driving down in a stab');

  /* ---------- water.proof-splash: a crown of drops and a ring where the bill went in ---------- */
  def({
    id: 'water.proof-splash', category: 'water', size: [44, 26], variants: 1, seasonal: false, flippable: true, real: { h: 0.26, l: 0.44, w: 0.3 },
    palette: { base: { foam: ['#f4fbfa', '#d6ebe8'], ring: '#e8f6f3', drop: '#ffffff' } },
    tags: ['uk', 'pond', 'water', 'splash', 'kit:water', 'kit:temperate', 'role:edge'],
    credit: 'drawn for the Yateley Green proof',
    build() {
      // mirror-symmetric, so it may jitter side to side (the scene's grow step) without a visible flip
      const drops = [[6, -21, 1.2], [11, -14, 1.3], [15, -7, 1], [2.5, -24, 1]];
      return {
        body: [
          { s: '@ring', w: 1.6, op: .75, d: ell(0, 0, 20, 3.4) }, { s: '@ring', w: 1, op: .45, d: ell(0, 0, 13, 2.2) },
          ['@foam.1', 'M-8 0q1-7 3-12 2 5 2 3 1-6 3-8 2 2 3 8 0-2 2-3 2 5 3 12z', .9], ['@foam.0', 'M-5 0q1-5 2-8 1 3 2 1 1-4 1-5 0 1 1 5 1 2 2-1 1 3 2 8z'],
          ...drops.flatMap(([x, y, r]) => [['@drop', circ(x, y, r)], ['@drop', circ(-x, y, r)]]),
        ],
      };
    },
  });

  /* ---------- bird.proof-duckling: a downy duckling (spring, summer); half-grown in hen plumage (autumn, winter) ---------- */
  def({
    id: 'bird.proof-duckling', category: 'bird', size: [40, 26], variants: 2, seasonal: true, shapeBySeason: true, flippable: true, reflect: true, real: { h: 0.16, l: 0.25, w: 0.12 },
    palette: { base: { wake: '#f2fbf6', down: ['#5e4a2e', '#7a6440', '#3e3020'], face: ['#e8cf6a', '#f2e090'], bill: '#3a3226', hen: ['#9a7a54', '#bfa07a', '#6a5034', '#84653f'], henBill: '#c97e36', speculum: '#4060b0' } },
    anim: { paddle: { dy: .8, deg: 2.4, period: 1.6 } },
    tags: ['uk', 'pond', 'duck', 'duckling', 'mallard', 'water', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: 'drawn for the Yateley Green proof (the brood of the green pond)',
    build(v, r, ctx) {
      const s = (ctx && ctx.season) || 'summer', young = s === 'spring' || s === 'summer';
      if (young) {
        const k = v ? 1.08 : 1;
        return {
          body: [{ s: '@wake', w: 1, op: .5, d: `M${-10 * k} 1.5h${18 * k}` }, ['@down.0', `M${-10 * k} 0q-2-8 6-10l9 1q6 2 5 9z`], ['@down.1', 'M-7-8q6-3 12-1-6 1-12 1z', .8], ['@face.0', 'M-4-5q4 2 9 0l1 4h-10z', .8], ['@down.2', 'M-11-4l-3-1 2 3z']],
          head: [['@down.0', 'M3-8q-1-9 6-9 6 1 5 7l-4 3z'], ['@face.0', 'M6-10q3-2 7 0l-1 3h-5z'], { s: '@down.2', w: 1, d: 'M6-13h7' }, ['@bill', 'M13-12l5 1.5-5 1.2z'], ...eye(10, -13, .9)],
        };
      }
      return {
        body: [{ s: '@wake', w: 1.2, op: .5, d: 'M-18 2h30' }, ['@hen.0', 'M-18 0c-3-9 3-14 12-14l16 1c7 0 11 6 10 13z'], ['@hen.1', 'M-15-9q9-5 22-4 3 1 1 3-12-1-23 1z', .8],
          { s: '@hen.2', w: 1.2, d: 'M-13-7l3-1.5M-7-7l3-1.5M-1-7l3-1.5M5-6.5l3-1.5M-10-3l3-1.5M-4-3l3-1.5M2-3l3-1.5' }, ['@speculum', 'M-7-9h8l-2 3h-7z'], ['@hen.3', 'M-19-4l-6-4 2 6z']],
        head: [['@hen.0', 'M8-11q-1-13 7-14 7 0 5 8l-4 7z'], { s: '@hen.2', w: 1.4, d: 'M9-19h9' }, ['@henBill', 'M19-20l8 2.2-8 1.8z'], ...eye(15, -21, 1.1)],
      };
    },
  });
  // the heads turn with the paddle; a small look-round on its own hook would cost a draw per bird: the brood stays at one hook

  /* ---------- prop.proof-ball: a tennis ball ---------- */
  def({
    id: 'prop.proof-ball', category: 'prop', size: [9, 9], variants: 1, seasonal: false, flippable: true, real: { h: 0.07, l: 0.07, w: 0.07 },
    palette: { base: { felt: ['#d8e84a', '#b4c43a', '#eef68a'], seam: '#f8f8f0' } },
    tags: ['uk', 'park', 'green', 'ball', 'dog', 'kit:temperate', 'kit:people', 'role:street'],
    credit: 'drawn for the Yateley Green proof',
    build() {
      return { body: [['@felt.1', circ(0, -4.5, 4.5)], ['@felt.0', circ(-.6, -5.1, 3.7)], ['@felt.2', circ(-1.8, -6.6, 1.4), .8], { s: '@seam', w: .8, d: 'M-3.4-7.4q3 2.6 0 6.2M3.2-7.6q-2.6 3 .2 6.4' }] };
    },
  });

  /* ---------- animal.proof-dog-ball: the library dog carrying the ball home ---------- */
  def({
    id: 'animal.proof-dog-ball', category: 'animal', size: [71, 46], variants: 3, seasonal: false, flippable: true, parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'], real: { h: 0.6, l: 0.9, w: 0.3 },
    palette: { base: { felt: ['#d8e84a', '#b4c43a', '#eef68a'], seam: '#f8f8f0' } },
    anim: { walk: { parts: ['legsNear', 'legsFar'], pivot: [0, -16], deg: 14, period: .55, bob: 1.2 }, sway: { part: 'tail', pivot: [-18, -22], deg: 14 } },
    shadow: { rx: 22, ry: 3, h: 30 },
    tags: ['uk', 'park', 'green', 'dog', 'pet', 'fetch', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: "the library's animal.dog with a tennis ball in its mouth (drawn for the Yateley Green proof)",
    build(v) {
      const base = typeof sceneObjShapes === 'function' ? sceneObjShapes('animal.dog', v, 'summer') : null;
      const out = {};
      for (const p of ['legsFar', 'tail', 'body', 'legsNear', 'head']) out[p] = base && base.parts[p] ? base.parts[p].map(sh => Object.assign({}, sh)) : [];
      out.head = out.head.filter((sh, i) => i < out.head.length).concat([['@felt.1', circ(34, -24.5, 4.2)], ['@felt.0', circ(33.4, -25.1, 3.4)], { s: '@seam', w: .7, d: 'M31-27.6q2.6 2.4 0 5.6' }]);
      return out;
    },
  });

  /* ---------- tree.proof-yew: the old churchyard yew, broad and dark ---------- */
  def({
    id: 'tree.proof-yew', category: 'tree', size: [220, 240], variants: 2, seasonal: false, flippable: true, parts: ['trunk', 'crown'], real: { h: 12, l: 11, w: 9 },
    palette: { base: { bark: ['#6a3e2a', '#4a2a1c'], yew: ['#1e3a26', '#294a30', '#36603c', '#152a1c'] } },
    anim: { sway: { part: 'crown', pivot: [0, -40], deg: .5 } },
    shadow: { rx: 90, ry: 12, h: 230 },
    tags: ['uk', 'churchyard', 'yew', 'evergreen', 'conifer', 'kit:temperate', 'role:tree'],
    credit: 'drawn for the Yateley Green proof (the churchyard yew of St Peter\'s)',
    build(v) {
      const rnd = sceneRnd(4410 + v * 17);
      const crown = [];
      [['@yew.3', 0, -110, 108, 112], ['@yew.0', -6, -118, 100, 104], ['@yew.1', -16, -132, 78, 86], ['@yew.2', -30, -150, 46, 52]].forEach(([f, cx, cy, rx, ry], j) => {
        let d = '';
        for (let i = 0; i < 5 + j; i++) d += blob(rnd, cx + (rnd() - .5) * rx * .9, cy + (rnd() - .5) * ry * .9, rx * (.45 + rnd() * .2), ry * (.4 + rnd() * .2), 8);
        crown.push({ f, d, op: j === 3 ? .7 : 1 });
      });
      return {
        trunk: [['@bark.0', 'M-16 0q-4-30 4-56h20q8 26 4 56z'], ['@bark.1', 'M4 0q2-28-2-56h8q6 26 4 56z', .8]],
        crown,
      };
    },
  });
})();
