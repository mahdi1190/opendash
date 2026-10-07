/* ============================================================
   SCENE LIBRARY: animals and insects (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   After the nature kit (K.deer, K.rabbit, K.squirrel, K.butterfly,
   K.dragonfly, K.bee) and the Yateley Common grazing cattle, redrawn with
   more modelling. Every animal FACES RIGHT. Anchor: the feet on the ground
   (insects: the body centre). Light from the LEFT: lit backs, shaded
   bellies.

   Quadrupeds walk with the 'walk' hook on two leg sets (near pair and far
   pair) about the body centre: a small scissor that reads as a trot at
   scene sizes. Grazers turn their heads (graze and look up).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const eye = (x, y, r) => [['#141010', circ(x, y, r)], ['#ffffff', circ(x - r * .35, y - r * .35, r * .35), .85]];
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  /** A coat slot set [base, shade, light, belly-dark] from one colour. */
  const coat = c => [c, mix(c, '#000000', .3), mix(c, '#ffffff', .22), mix(c, '#000000', .5)];

  /* ---------- animal.cattle: conservation grazers; v0 red Sussex, v1 black Angus, v2 Belted Galloway, v3 shaggy Highland ---------- */
  defineObj({
    id: 'animal.cattle', category: 'animal', size: [177, 99], variants: 4, seasonal: false, flippable: true, parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'],
    palette: { base: { c0: coat('#7a3f22'), c1: coat('#26221f'), c2: coat('#24211e'), c3: coat('#b0642e'), belt: ['#f2ede2', '#d4cec0'], hoof: '#2a221c', nose: ['#c89a8a', '#5a4a46'], horn: '#e8dcc0' } },
    anim: { turn: { part: 'head', pivot: [44, -54], deg: 16, period: 11, hold: .7 }, sway: { part: 'tail', pivot: [-56, -56], deg: 9 } },
    shadow: { rx: 70, ry: 8, h: 80 },
    tags: ['uk', 'heath', 'common', 'farm', 'cattle', 'cow', 'belted-galloway', 'grazing', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: 'the Yateley Common view art (conservation-grazing cattle), redrawn',
    build(v) {
      const c = `@c${v}`, shaggy = v === 3;
      const leg = x => `M${x - 4.5} -30q-1 16 0 30h9q1-14 0-30z`;
      const legsFar = [[`${c}.1`, leg(-36) + leg(34)], ['@hoof', 'M-41 -2h9v3h-9zM29 -2h9v3h-9z']];
      const legsNear = [[`${c}.0`, leg(-46) + leg(24)], [`${c}.1`, 'M-49-20h3v18h-3zM21-20h3v18h-3z', .5], ['@hoof', 'M-51-2h10v4h-10zM19-2h10v4h-10z']];
      const body = [[`${c}.0`, 'M-56-44q-4-22 20-26h62q26 0 28 22 2 22-12 28l-14 2H-38q-18-4-18-26z']];
      if (v === 2) body.push(['@belt.0', 'M-12-70h28q5 26-2 51h-24q-6-25-2-51z'], ['@belt.1', 'M-10-24h22q-1 4-3 5h-17z', .8]);
      body.push([`${c}.2`, 'M-46-60q30-13 80-7-30 5-80 7z', .5], [`${c}.1`, 'M-50-28q40 10 96 2-6 8-16 8H-38q-10-2-12-10z', .45], [`${c}.3`, 'M-30-18q20 3 40 0-4 4-20 4z', .4]);
      body.push(['@nose.0', 'M-4-18q8 6 16 0-4 8-8 8t-8-8z']);   // udder
      if (shaggy) body.push({ s: `${c}.2`, w: 2, op: .6, d: 'M-50-56l-4 8M-40-60l-4 9M-28-62l-3 9M-16-62l-3 9M-4-62l-3 9M8-62l-3 9M20-62l-3 9M32-60l-3 9M-52-36l-3 8M44-40l2 9' }, { s: `${c}.1`, w: 2, op: .5, d: 'M-46-30l-2 9M-30-24l-2 8M-12-22l-1 8M6-22l-1 8M24-24l-1 8' });
      const tail = [{ s: `${c}.1`, w: 3, d: 'M-56-56q-8 14-6 36' }, [`${c}.3`, 'M-66-22q4-6 8 0l-2 9h-4z']];
      const head = [[`${c}.0`, 'M40-62q14-8 22 4l14 10q8 8 0 14l-10 4q-8 0-12-8l-16-12z'], [`${c}.2`, 'M44-60q10-4 16 2l-14 4z', .5], ['@nose.1', 'M70-40q8 4 4 10l-8 2q-4-6 4-12z'], ...eye(62, -50, 2),
        [`${c}.1`, 'M52-64l-6-10 10 6zM60-62l8-8-2 10z']];
      if (v === 2) head.push(['@belt.0', 'M62-44q6-2 10 2-4 2-10-2z', .5]);
      if (shaggy) head.push({ s: '@horn', w: 3.2, d: 'M54-66q-10-10 0-20M60-64q14-6 22 2' }, [`${c}.2`, 'M48-66q8-8 18-2-8 6-18 2z', .9]);
      const hm = [1.3, 0, 0, 1.3, 44 - 44 * 1.3, -54 + 54 * 1.3 + 4];   // a heavier head, a touch lower
      return { legsFar, tail, body, legsNear, head: head.map(sh => Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2], m: hm } : Object.assign({}, sh, { m: hm })) };
    },
  });

  /* ---------- animal.deer: a roe deer (red-brown in summer, grey-brown in winter); v0 a doe, v1 a buck with antlers ---------- */
  defineObj({
    id: 'animal.deer', category: 'animal', size: [106, 108], variants: 2, seasonal: true, flippable: true, parts: ['legs', 'body', 'head'],
    palette: Object.assign({ base: { rump: '#f2ead8', nose: '#1f1a18', antler: '#c8b48a' } }, bySeason({
      coat: { spring: coat('#9a5a34'), summer: coat('#a8643a'), autumn: coat('#8a5a3a'), winter: coat('#7d6a58') },
    })),
    anim: { turn: { part: 'head', pivot: [36, -74], deg: -14, period: 9, hold: .6 } },
    shadow: { rx: 46, ry: 6, h: 90 },
    tags: ['uk', 'woodland', 'heath', 'deer', 'roe-deer', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: "the nature kit's K.deer, redrawn",
    build(v) {
      return {
        legs: [{ s: '@coat.1', w: 4, d: 'M-26-30l-3 30M-18-30l2 30M18-30l-3 30M26-30l3 30' }, { s: '@coat.3', w: 2, d: 'M-29-6l0 6M16-6l0 6M-16-6l0 6M29-6l0 6' }],
        body: [['@coat.0', 'M-34-38q2-18 28-18h26q16 2 16 18-4 14-18 14h-34q-20-2-18-14z'], ['@coat.2', 'M-28-52q20-6 44-2-20 2-44 2z', .55], ['@coat.1', 'M-32-30q24 8 50 4-6 4-14 4h-24q-10-2-12-8z', .5],
          ['@rump', 'M-36-40q-6 6-2 14l6-4z'], ['@coat.0', 'M20-52q8-16 16-26l11 5-5 27z'], ['@coat.2', 'M28-66q4-6 8-10l3 2-6 9z', .6]],
        head: [['@coat.0', 'M34-88q4-10 14-8l16 8q2 6-6 8l-18-2z'], ['@coat.2', 'M38-92q6-4 12-2l-12 3z', .6], ['@nose', circ(64, -84, 2.4)], ...eye(48, -88, 1.6),
          ['@coat.1', 'M38-94l-6-12 10 8zM44-96l2-13 6 11z'], v ? { s: '@antler', w: 2.4, d: 'M42-96l-2-16m1 7l-5-3M46-96l2-15m-1 6l5-4' } : null].filter(Boolean)
          .map(sh => Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2], m: [1, 0, 0, 1, -3, 10] } : Object.assign({}, sh, { m: [1, 0, 0, 1, -3, 10] })),
      };
    },
  });

  /* ---------- animal.rabbit: sitting up (v0), or nibbling low (v1) ---------- */
  defineObj({
    id: 'animal.rabbit', category: 'animal', size: [44, 48], variants: 2, seasonal: false, flippable: true, parts: ['body', 'ears'],
    palette: { base: { fur: coat('#8a7660'), tail: '#f4f0e6', eye: '#1a1410', inner: '#c8a090' } },
    anim: { turn: { part: 'ears', pivot: [8, -22], deg: 10, period: 2.8, hold: .3 } },
    shadow: { rx: 18, ry: 3, h: 30 },
    tags: ['uk', 'heath', 'common', 'field', 'rabbit', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: "the nature kit's K.rabbit, redrawn",
    build(v) {
      const dy = v ? 5 : 0, m = v ? [1, 0, 0, 1, 2, dy] : undefined;
      const S = (f, d, op) => (m ? { f, d, op, m } : [f, d, op]);
      return {
        body: [S('@fur.0', 'M-16 0q-6-20 10-22 14-2 18 12l-2 10z'), S('@fur.2', 'M-12-16q8-6 18-4-10 2-18 4z', .6), S('@fur.1', 'M-14-2q10 3 24 0l-2 2h-20z', .6), S('@tail', circ(-15, -8, 3.6)),
          S('@fur.0', 'M6-16q2-12 12-10 8 4 4 14l-10 4z'), S('@fur.3', 'M0-2h10l2 2H-2z'), S('@eye', circ(16, -17, 1.4)), S('#ffffff', circ(15.6, -17.5, .5)), S('@inner', circ(21, -12, 1.2))],
        ears: v ? [S('@fur.1', 'M6-20q-12-6-16-2 4 4 16 6zM8-22q-12-10-15-6 4 4 15 9z')] : [S('@fur.1', 'M8-24q-4-16 2-18 4 2 2 18zM12-24q2-15 8-15 2 4-4 16z'), S('@inner', 'M9-26q-2-10 1-13 2 2 1 13z', .7)],
      };
    },
  });

  /* ---------- animal.squirrel: a grey squirrel sitting up, nibbling, tail curled ---------- */
  defineObj({
    id: 'animal.squirrel', category: 'animal', size: [54, 48], variants: 1, seasonal: true, flippable: true, parts: ['tail', 'body', 'head'],
    palette: Object.assign({ base: { belly: '#ece6da', nut: '#7a5a34', eye: '#141010' } }, bySeason({ fur: { spring: coat('#8a847c'), summer: coat('#8e7e6c'), autumn: coat('#8a847c'), winter: coat('#868480') } })),
    anim: { sway: { part: 'tail', pivot: [-8, -4], deg: 6 }, turn: { part: 'head', pivot: [6, -24], deg: 8, period: 1.6, hold: .2 } },
    shadow: { rx: 16, ry: 3, h: 34 },
    tags: ['uk', 'woodland', 'park', 'green', 'squirrel', 'grey-squirrel', 'kit:animals', 'kit:temperate', 'kit:urban', 'role:animal'],
    credit: "the nature kit's K.squirrel, redrawn",
    build() {
      return {
        tail: [['@fur.0', 'M-8-4q-24-4-22-26 2-18 16-14 8 4 2 12-8-6-8 4 0 12 14 18z'], ['@fur.2', 'M-24-28q2-12 12-10-8 2-12 10z', .7], { s: '@belly', w: 1.6, op: .6, d: 'M-26-26q2-12 12-10' }],
        body: [['@fur.0', 'M-8 0q-4-22 8-26 12 0 10 18l-4 8z'], ['@belly', 'M2-20q6 6 2 18h-4z'], ['@fur.1', 'M-8 0q2-4 10-2l-2 2z', .7], ['@fur.1', 'M-6-2l-6 2h8z']],
        head: [['@fur.0', 'M2-24q0-12 10-10 6 4 2 12z'], ['@fur.1', 'M4-33l2-5 3 5z'], ...eye(10, -29, 1.3), ['@nut', circ(14, -22, 2.6)], ['@fur.0', 'M10-22q4-2 4 2l-3 1z']],
      };
    },
  });

  /* ---------- animal.dog: walking; v0 black labrador, v1 springer spaniel, v2 terrier ---------- */
  defineObj({
    id: 'animal.dog', category: 'animal', size: [71, 46], variants: 3, seasonal: false, flippable: true, parts: ['legsFar', 'tail', 'body', 'legsNear', 'head'],
    palette: { base: { lab: coat('#24201e'), spaniel: coat('#6a3a22'), white: coat('#f2ece2'), terrier: coat('#a87a4a'), nose: '#141010', tongue: '#d86a6a', collar: ['#c83a2a', '#2a6ac8', '#e0a82a'] } },
    anim: { walk: { parts: ['legsNear', 'legsFar'], pivot: [0, -16], deg: 14, period: .55, bob: 1.2 }, sway: { part: 'tail', pivot: [-18, -22], deg: 14 } },
    shadow: { rx: 22, ry: 3, h: 30 },
    tags: ['uk', 'path', 'park', 'common', 'dog', 'pet', 'kit:animals', 'kit:people', 'kit:temperate', 'kit:urban', 'role:animal'],
    credit: "the nature kit's walker's dog, redrawn as an animal of its own",
    build(v) {
      const c = ['@lab', '@spaniel', '@terrier'][v], wh = v === 1 ? '@white' : c;
      const legs = (x1, x2, slot) => [{ s: slot + '.0', w: 4, d: `M${x1}-16l-1 16M${x2}-16l1 16` }, { s: slot + '.1', w: 4, d: `M${x1 - 1.5}-1h3M${x2 - .5}-1h3` }];
      const body = [[c + '.0', 'M-18-24q2-6 10-6h20q8 0 10 6 0 8-6 10h-28q-8-2-6-10z'], [c + '.2', 'M-14-28q12-4 26-1-12 2-26 1z', .6], [c + '.1', 'M-16-16q14 3 30 0-2 2-6 3h-20z', .5]];
      if (v === 1) body.push([wh + '.0', 'M-4-29q8-2 14 2 2 6-4 10-8 2-10-4z'], [wh + '.0', 'M8-18q6 0 8 4h-8z']);
      const ear = v === 2 ? [c + '.1', 'M18-36l2-6 3 6z'] : [c + '.1', 'M16-34q-2 8 3 12 4-2 2-10z'];
      return {
        legsFar: legs(-12, 10, c),
        tail: v === 2 ? [{ s: c + '.0', w: 3, d: 'M-18-24l-6-10' }] : [{ s: c + '.0', w: 3.4, d: 'M-18-24q-10 0-14-8' }],
        body,
        legsNear: legs(-16, 14, wh),
        head: [{ s: '@collar.' + v, w: 2.6, d: 'M12-28q3 4 8 4' }, [c + '.0', 'M12-28q0-10 10-10 8 0 10 6l4 4q0 4-6 4h-12z'], [c + '.2', 'M16-36q6-2 10 1-6 0-10-1z', .6], ['@nose', circ(35, -28, 1.6)], ...eye(24, -33, 1.4), ear, v === 0 ? ['@tongue', 'M28-24q2 4 5 2l-1-3z'] : null].filter(Boolean),
      };
    },
  });

  /* ---------- insects (anchor: the body centre); seasonal: false, scenes show them in the warm months ---------- */
  const BUTTERFLY = [['brimstone', '#f1e45a', '#d9c63a', '#e8a838'], ['admiral', '#24242a', '#d8402a', '#f4f0e8'], ['peacock', '#9a2a24', '#3a5aa8', '#f2d050'], ['blue', '#7a9fe6', '#c9d8f6', '#f4f4fa'], ['orangetip', '#f6f4ee', '#ef8a2a', '#8a9a6a'], ['tortoiseshell', '#e2742a', '#2a2a2e', '#f2d050']];
  defineObj({
    id: 'animal.butterfly', category: 'animal', size: [29, 39], variants: BUTTERFLY.length, seasonal: false, flippable: true, parts: ['wings', 'body'],
    palette: { base: Object.assign({ body: '#2a2422' }, ...BUTTERFLY.map(([k, a, b, c]) => ({ [k]: [a, b, c] }))) },
    anim: { flap: { part: 'wings', pivot: [0, -1], sy: [-.5, 1], period: .34 } },
    tags: ['uk', 'meadow', 'heath', 'garden', 'butterfly', 'insect', 'summer', 'kit:animals', 'kit:temperate', 'kit:urban', 'role:animal'],
    credit: "the nature kit's K.butterfly (brimstone, red admiral, peacock, common blue, orange-tip, small tortoiseshell)",
    build(v) {
      const k = '@' + BUTTERFLY[v][0];
      // seen from the side, wings held up over the body: the flap folds them down through the body line
      return {
        wings: [[k + '.0', 'M1-1q-4-24 14-26 6 12-14 26zM-1-1q-16-16-10-22 10 2 10 22z'], [k + '.1', ell(10, -20, 3, 3) + ell(-7, -14, 2.4, 2.4)], [k + '.2', ell(5, -11, 2.2, 1.6), .8]],
        body: [{ s: '@body', w: 2, d: 'M-7 0h12' }, ['@body', ell(6, -.5, 2, 2)], { s: '@body', w: .8, d: 'M7-2l4-6M7-2l5-4' }],
      };
    },
  });
  defineObj({
    id: 'animal.dragonfly', category: 'animal', size: [40, 48], variants: 2, seasonal: false, flippable: true, parts: ['body', 'wings'],
    palette: { base: { body: ['#2f8ac6', '#c43a2a'], dark: ['#1f5a82', '#8a2a1e'], wing: '#e6f6fa' } },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [.2, 1], period: .12 } },
    tags: ['uk', 'pond', 'waterside', 'dragonfly', 'insect', 'summer', 'kit:animals', 'kit:temperate', 'kit:water', 'role:animal'],
    credit: "the nature kit's K.dragonfly (a blue hawker, a common darter)",
    build(v) {
      // seen from above, body pointing right (as it darts): long abdomen behind
      return {
        body: [{ s: `@body.${v}`, w: 3, d: 'M2 0h-30' }, { s: `@dark.${v}`, w: 3, op: .7, d: 'M-6 0h2M-12 0h2M-18 0h2M-24 0h2' }, [`@dark.${v}`, ell(5, 0, 4, 3.2)], [`@body.${v}`, ell(9, 0, 2.6, 2.6)]],
        wings: [['@wing', 'M2-2q-2-14 6-22 4 8-6 22zM-2-2q-6-14-2-22 8 8 2 22zM2 2q-2 14 6 22 4-8-6-22zM-2 2q-6 14-2 22 8-8 2-22z', .7]],
      };
    },
  });
  defineObj({
    id: 'animal.bee', category: 'animal', size: [18, 15], variants: 1, seasonal: false, flippable: true, parts: ['body', 'wings'],
    palette: { base: { body: '#2a2420', band: '#f2c23a', tail: '#f6f2ea', wing: '#eef8fa' } },
    anim: { flap: { part: 'wings', pivot: [0, -4], sy: [.2, 1], period: .1 } },
    tags: ['uk', 'meadow', 'garden', 'heath', 'bee', 'bumblebee', 'insect', 'summer', 'kit:animals', 'kit:temperate', 'kit:urban', 'role:animal'],
    credit: "the nature kit's K.bee",
    build() {
      return {
        body: [['@body', ell(0, 0, 7.5, 5.5)], { s: '@band', w: 2.6, d: 'M-2-5v10M3-5v10' }, ['@tail', 'M-7.5 0q-2-3 1-5l1 5z'], ['@body', ell(7, -1, 3, 3)]],
        wings: [['@wing', ell(-2, -6.5, 4.4, 2.4) + ell(3, -7, 4.4, 2.4), .8]],
      };
    },
  });
})();
