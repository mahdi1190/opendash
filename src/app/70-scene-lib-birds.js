/* ============================================================
   SCENE LIBRARY: birds (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   After the nature kit's water birds (K.duck, K.heron, K.robin, K.flock)
   and the Fleet Pond and Yateley Common view art (grebe, kingfisher,
   stonechat), redrawn with more modelling: a lit back, a shaded belly, eye
   glints, feather marks. Every bird FACES RIGHT (flip a placement or an
   actor to face left). Anchor: the waterline (swimmers), the feet (perched
   and standing birds), the body centre (birds in flight).

   Parts and hooks: swimmers have 'body' and 'head' (paddle: the whole bird
   bobs and rocks; turn: the head dips or looks). Perched birds have 'body',
   'tail' and 'head'. Birds in flight have 'body' and 'wings' (flap).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const eye = (x, y, r, ring) => [ring ? ['@' + ring, circ(x, y, r + .9)] : null, ['#101414', circ(x, y, r)], ['#ffffff', circ(x - r * .35, y - r * .35, r * .35), .9]].filter(Boolean);
  const water = (w, k) => [{ s: '@wake', w: 1.4, op: .55, d: `M${f1(-w)} 2.5h${f1(w * 1.7)}` }, { s: '@wake', w: 1.2, op: .35, d: `M${f1(-w * 1.05)} 3q${f1(-w * .7)} 2 ${f1(-w * 1.4 * (k || 1))} 7` }];
  const swimmer = (o) => defineObj(Object.assign({
    category: 'bird', seasonal: false, flippable: true, parts: ['body', 'head'], reflect: true,
    anim: { paddle: { dy: 1.2, deg: 1.5, period: 2.8 }, turn: { part: 'head', pivot: o.neck, deg: 16, period: 7, hold: .6 } },
  }, o));

  /* ---------- bird.mallard: v0 drake, v1 duck ---------- */
  swimmer({
    id: 'bird.mallard', size: [119, 55], variants: 2, neck: [14, -14],
    palette: { base: { wake: '#f2fbf6', flank: ['#cfc7b4', '#e8e2d2', '#a8a090'], breast: '#6b4632', stern: '#2e2e30', head: ['#1f5a3e', '#2f8a5a'], ring: '#f6f2e6', bill: ['#e8c24a', '#c89a2a'], speculum: ['#3f5fb0', '#ffffff'], back: ['#8b8270', '#6a6252'], hen: ['#a3825c', '#c4a47c', '#6e5232', '#8a6a46'], henBill: '#d9883a' } },
    tags: ['uk', 'pond', 'canal', 'duck', 'mallard', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: "the nature kit's mallard (K.duck), redrawn",
    build(v) {
      const hull = 'M-30 0c-4-11 4-19 18-19l25 2c11 0 17 8 15 17z';
      if (v === 1) return {
        body: [...water(30), ['@hen.0', hull], ['@hen.1', 'M-26-12q14-8 36-6 4 2 2 5-18-2-38 1z', .8], ['@hen.2', 'M-29-1q20 3 56 0-3 3-8 3h-40z', .5],
          { s: '@hen.2', w: 1.6, d: 'M-24-9l4-2M-16-9l4-2M-8-9l4-2M0-9l4-2M8-8l4-2M-20-4l4-2M-12-4l4-2M-4-4l4-2M4-4l4-2M12-4l4-2' },
          ['@speculum.0', 'M-12-12h14l-3 5h-12z'], { s: '@speculum.1', w: 1, d: 'M-12-12.5h14M-15-6.5h12' }, ['@hen.3', 'M-31-6l-8-6 2 9z']],
        head: [['@hen.0', 'M12-15q-2-20 10-22 10 0 8 12l-6 12z'], ['@hen.1', 'M14-26q2-9 9-10 5 1 6 6z', .7], { s: '@hen.2', w: 2, d: 'M16-30l12 0' }, ['@henBill', 'M29-28l11 3-11 3z'], { s: '#5a3a1a', w: 1, d: 'M31-26.5l8 1.5' }, ...eye(24, -30.5, 1.6)],
      };
      return {
        body: [...water(30), ['@flank.0', hull], ['@flank.1', 'M-24-15q16-6 36-3l2 4q-18-1-38 2z', .7], ['@flank.2', 'M-29-1q20 3 56 0-3 3-8 3h-40z', .55],
          ['@breast', 'M14-17c8 2 14 8 14 17h-16z'], ['@stern', 'M-30 0c-8-4-10-12-4-16l6 6z'], ['@stern', 'M-33-15q-2-6 3-7 1 4-1 7z'], { s: '@ring', w: 1.6, d: 'M-33-15q-4-4 0-8' },
          ['@back.0', 'M-22-14q16-9 34-2-15 8-34 2z'], ['@speculum.0', 'M-12-12h14l-3 5h-12z'], { s: '@speculum.1', w: 1, d: 'M-12-12.5h14M-15-6.5h12' }, { s: '@back.1', w: 1.2, d: 'M-18-13q10-4 22-3M-14-15q8-2 16-1' }],
        head: [['@head.0', 'M12-15q-2-20 10-22 10 0 8 12l-6 12z'], ['@head.1', 'M15-28q2-7 8-8 4 1 4 5-6-1-12 3z', .65], { s: '@ring', w: 2.4, d: 'M13-16h12' }, ['@bill.0', 'M29-28l11 3-11 3z'], { s: '@bill.1', w: 1, d: 'M31-26.5l8 1.5' }, ...eye(25, -29, 1.6)],
      };
    },
  });

  /* ---------- bird.swan: v0 adult mute swan, v1 grey-brown cygnet ---------- */
  swimmer({
    id: 'bird.swan', size: [189, 83], variants: 2, neck: [22, -14],
    palette: { base: { wake: '#f2fbf6', white: ['#fbfbf6', '#e4e6de', '#c8ccc4'], cyg: ['#a89c8c', '#c4b8a6', '#857a6c'], bill: ['#e07a2a', '#1f1f22'], cygBill: '#5a5450' } },
    tags: ['uk', 'pond', 'canal', 'lake', 'swan', 'mute-swan', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: "the nature kit's swan (K.duck), redrawn",
    build(v) {
      const c = v ? '@cyg' : '@white';
      return {
        body: [...water(44, 1.3), [c + '.0', 'M-44 0c-8-12-2-26 16-28 10-12 30-8 40 2 12 6 18 16 14 26z'],
          [c + '.1', 'M-34-6q20-16 46-12-14 14-46 12z'], [c + '.1', 'M-40-18q2-14 18-16 10-10 24-6-14 2-20 10-12-2-22 12z', .9],
          { s: c + '.2', w: 1.2, op: .7, d: 'M-30-20q12-6 24-4M-26-14q14-6 30-4M-20-9q14-4 28-3' }, [c + '.2', 'M-44 0q30 5 70 0-4 3-10 3h-56z', .6]],
        head: [{ s: c + '.0', w: 9, d: 'M20-8q14-10 6-30-6-14 6-22' }, { s: c + '.2', w: 2, op: .5, d: 'M24-10q12-10 5-28' },
          [c + '.0', 'M26-62q8-6 14 0l-2 6h-12z'], ['@' + (v ? 'cygBill' : 'bill.0'), 'M38-60l12 7-12 1z'], v ? null : ['@bill.1', 'M36-61l4-1v6h-4z'], ...eye(34, -59, 1.4)].filter(Boolean),
      };
    },
  });

  /* ---------- bird.coot and bird.moorhen ---------- */
  swimmer({
    id: 'bird.coot', size: [104, 50], variants: 1, neck: [12, -14],
    palette: { base: { wake: '#f2fbf6', body: ['#2b2e33', '#4a4f58', '#1a1c20'], shield: '#f4f2ec', eye: '#b02a2a' } },
    tags: ['uk', 'pond', 'lake', 'coot', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: "the nature kit's coot (K.duck), redrawn",
    build() {
      return {
        body: [...water(26), ['@body.0', 'M-26 0c-4-13 5-20 18-20l20 2c10 1 14 9 12 18z'], ['@body.1', 'M-20-15q12-6 30-3-14 2-30 3z', .8], ['@body.2', 'M-26-1q20 3 50 0-3 3-8 3h-36z', .6], { s: '@body.1', w: 1, op: .6, d: 'M-18-10q14-3 26-1' }],
        head: [['@body.0', 'M10-14q-2-18 9-19 10 0 9 11l-6 9z'], ['@body.1', 'M13-28q3-5 8-5 3 1 3 4z', .7], ['@shield', 'M26-28l10 4-10 3q-3-4 0-7z'], ['@shield', 'M24-31q3-4 5 1l-3 3z'], ...eye(22, -26, 1.6, 'eye')],
      };
    },
  });
  swimmer({
    id: 'bird.moorhen', size: [97, 48], variants: 1, neck: [11, -13],
    palette: { base: { wake: '#f2fbf6', body: ['#3a3f4a', '#5a5248', '#22252c'], white: '#f4f2ec', bill: ['#d0302a', '#f0c23a'] } },
    tags: ['uk', 'pond', 'canal', 'moorhen', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: "the nature kit's moorhen (K.duck), redrawn",
    build() {
      return {
        body: [...water(24), ['@body.0', 'M-24 0c-4-12 4-18 16-18l18 2c9 1 13 8 11 16z'], ['@body.1', 'M-20-13q14-7 30-2-14 3-30 2z'], ['@body.2', 'M-24-1q18 3 46 0-3 3-8 3h-34z', .6],
          { s: '@white', w: 1.1, d: 'M-14-8h6M-6-8.5h7M3-8h4' }, ['@white', 'M-28-12l6 2-5 3z'], ['@white', 'M-30-8l6 1-5 3z', .8]],
        head: [['@body.0', 'M9-13q-2-17 8-18 9 0 8 10l-5 8z'], ['@bill.0', 'M23-26l8 3-8 3q-2-3 0-6z'], ['@bill.0', 'M20-29q3-2 4 2l-2 2z'], ['@bill.1', 'M30-23.6l4 1-4 1z'], ...eye(20, -24, 1.4)],
      };
    },
  });

  /* ---------- bird.grebe: great crested grebe; crest and chestnut ruff in spring and summer ---------- */
  swimmer({
    id: 'bird.grebe', size: [104, 65], variants: 1, seasonal: true, shapeBySeason: true, neck: [9, -10],
    palette: { base: { wake: '#f2fbf6', back: ['#5d5448', '#8b7a62', '#3e3830'], neck: ['#f4efe6', '#d8d0c4'], cap: '#2a2522', ruff: ['#b4552c', '#d07a3a'], bill: '#d07a6a', eye: '#a0201a' } },
    tags: ['uk', 'lake', 'pond', 'grebe', 'great-crested-grebe', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: 'the Fleet Pond view art (grebe), redrawn',
    build(v, r, ctx) {
      const breeding = ctx.season === 'spring' || ctx.season === 'summer';
      const head = [['@back.0', 'M2-6q2-14 5-24 3-8 9-7 5 2 4 8l-6 23z'], ['@neck.0', 'M8-6q3-12 5-24 2-6 6-5 4 2 3 7-3 12-6 22z'], ['@neck.1', 'M12-9q3-10 4-20 2 0 2 2-1 10-4 18z', .7], ['@neck.0', 'M10-36q3-6 9-4 3 3 1 7l-9 2z'], ['@cap', 'M9-35q4-8 11-4l-1 4q-5-2-10 1z']];
      if (breeding) head.push(['@cap', 'M10-37l-6-7 8 3zM13-39l-2-9 5 7z'], ['@ruff.0', 'M10-31q-9 2-7 11l9-4zM19-31q6 4 2 11l-4-4z'], ['@ruff.1', 'M9-30q-6 2-5 7l5-2z', .8]);
      head.push(['@bill', 'M19-33l12 2-12 2z'], ...eye(16, -33, 1.2, 'eye'));
      return {
        body: [...water(26), ['@back.0', 'M-24 0c-2-8 5-12 16-12l14 2c7 1 9 6 7 10z'], ['@back.1', 'M-18-7q14-6 26-1-12 4-26 1z'], ['@back.2', 'M-24-1q18 3 44 0-2 2-6 3h-32z', .6], ['@neck.0', 'M10-6q6 1 8 6h-8z', .9]],
        head,
      };
    },
  });

  /* ---------- bird.goose: Canada goose; v0 swimming, v1 grazing on the bank ---------- */
  defineObj({
    id: 'bird.goose', category: 'bird', size: [143, 70], variants: 2, seasonal: false, flippable: true, parts: ['body', 'head'], reflect: true,
    palette: { base: { wake: '#f2fbf6', body: ['#8a7a66', '#a8987e', '#5e5244', '#6a5a48'], white: '#f2efe6', black: '#1f1f22', leg: '#2a2622' } },
    anim: { paddle: { dy: 1, deg: 1.2, period: 3.2 }, turn: { part: 'head', pivot: [18, -14], deg: 12, period: 8, hold: .7 } },
    tags: ['uk', 'lake', 'pond', 'green', 'goose', 'canada-goose', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: "the nature kit's goose (K.duck), redrawn",
    build(v) {
      const m = v ? [1, 0, 0, 1, 0, -14] : null;   // grazing: the body stands on legs, 14 units up
      const body = [];
      if (!v) body.push(...water(34, 1.2));
      else body.push({ s: '@leg', w: 2.6, d: 'M-4-14l-2 14M6-14l2 14' }, { s: '@leg', w: 2, d: 'M-9 0h6M5 0h7' });
      body.push({ f: '@body.0', d: 'M-34 0c-6-12 2-22 18-22l26 2c12 1 18 10 16 20z', m }, { f: '@body.1', d: 'M-28-16q16-8 34-4-16 4-34 4z', op: .8, m },
        { f: '@body.2', d: 'M-34-1q24 3 60 0-3 3-8 3h-46z', op: .6, m }, { s: '@body.3', w: 1.6, d: 'M-26-10h34M-22-15h26M-18-5h30', op: .8, m },
        { f: '@white', d: 'M-38-6l9 2-9 4z', m }, { f: '@black', d: 'M-38-6q-4-4-2-8l6 4z', m });
      const head = v
        ? [{ s: '@black', w: 7, d: 'M18-26q14 6 16 24' }, { f: '@black', d: 'M30 2q4-6 10-2l4 6-12 0z' }, { f: '@white', d: 'M33-1q4 3 6 0l-3-4z' }, { f: '@black', d: 'M42 4l6 2-6 1z' }]
        : [{ s: '@black', w: 7, d: 'M18-14q8-16 6-30' }, { f: '@black', d: 'M18-46q4-8 12-4l8 5-12 3z' }, { f: '@white', d: 'M21-46q3 5 8 3l-3-6z' }, ...eye(27, -48, 1.2)];
      return { body, head };
    },
  });

  /* ---------- bird.goose-flight: a Canada goose in flight (for V skeins) ---------- */
  defineObj({
    id: 'bird.goose-flight', category: 'bird', size: [80, 58], variants: 1, seasonal: false, flippable: true, parts: ['wingFar', 'body', 'wings'],
    palette: { base: { body: ['#8a7a66', '#a8987e', '#5e5244'], wing: ['#6e6050', '#4a4036'], white: '#f2efe6', black: '#1f1f22' } },
    anim: { flap: { part: 'wings', pivot: [0, -2], sy: [-.7, 1], period: .7 } },
    tags: ['uk', 'sky', 'goose', 'canada-goose', 'flight', 'kit:birds', 'kit:temperate', 'role:bird'],
    credit: "the nature kit's K.flock (V formation), redrawn",
    build() {
      return {
        wingFar: [['@wing.1', 'M-4-3q6-14 18-20 2 10-8 22z', .9]],
        body: [['@body.0', 'M-26 0q2-6 14-7l18-1q8 0 10 6-4 6-14 6l-18 1q-8 0-10-5z'], ['@body.2', 'M-24 1q16 4 34 0-6 4-16 4z', .7], ['@white', 'M-26 0l-6-1 2 4z'], ['@black', 'M-30-1l-6-2 1 5z'],
          { s: '@black', w: 5.5, d: 'M12-4q10-3 19-3' }, ['@black', 'M29-10q6-2 10 1l5 2-6 2h-9z'], ['@white', 'M31-7q3 2 5 0l-2-3z']],
        wings: [['@wing.0', 'M-6-6q-2-20 6-30 8 6 10 14l2 14z'], { s: '@wing.1', w: 1.2, d: 'M-2-10q2-12 4-20M2-9q4-8 6-14' }],
      };
    },
  });

  /* ---------- bird.heron: a grey heron in the shallows; v0 upright, v1 hunched ---------- */
  defineObj({
    id: 'bird.heron', category: 'bird', size: [106, 163], variants: 2, seasonal: false, flippable: true, parts: ['body', 'head'], reflect: true,
    palette: { base: { grey: ['#9aa4ac', '#c0c8cc', '#5d6870', '#3a4048'], white: ['#e8ecee', '#dfe4e6'], bill: '#e6b84a', leg: '#c9b06a', black: '#20262c', ripple: '#e8fbf4' } },
    anim: { turn: { part: 'head', pivot: [10, -84], deg: 10, period: 12, hold: .7 } },
    shadow: { rx: 26, ry: 4, h: 150 },
    tags: ['uk', 'pond', 'lake', 'canal', 'heron', 'grey-heron', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: "the nature kit's K.heron, redrawn",
    build(v) {
      const body = [{ s: '@ripple', w: 1.4, op: .6, d: ell(0, 2, 26, 4) }, { s: '@leg', w: 3, d: 'M-4 0v-52M6 0l-2-52' }, ['@grey.0', 'M-26-58q4-30 30-34 22 0 20 22l-6 18q-20 10-44-6z'],
        ['@grey.1', 'M-20-74q10-16 26-16 12 2 14 10-18-4-40 6z', .8], ['@grey.2', 'M-30-62q6-18 22-22-4 22-22 22z'], ['@grey.3', 'M-32-58l-12 8 14-2z'], { s: '@grey.3', w: 1.2, op: .6, d: 'M-22-64q8-6 18-8M-18-58q10-4 22-6' },
        ['@white.0', 'M14-62q8 4 10 12l-6 2q-2-8-8-10z', .9], { s: '@black', w: 1, op: .5, d: 'M16-58l4 6M19-60l3 7' }];
      const head = v
        ? [{ s: '@white.1', w: 7, d: 'M12-84q10-6 6-14' }, ['@white.0', 'M14-106q8-8 16 0l-2 8h-12z'], ['@bill', 'M28-104l24 6-24 2z'], { s: '@black', w: 2.4, d: 'M18-106l-14 6' }, ...eye(23, -104, 1.6)]
        : [{ s: '@white.1', w: 7, d: 'M12-84q10-20-2-36q-8-12 6-24' }, { s: '@grey.1', w: 2, op: .6, d: 'M15-88q8-16-2-30' }, { s: '@black', w: 1.4, op: .7, d: 'M18-92l-2 4M16-100l-2 4M12-108l-2 4' },
          ['@white.0', 'M10-150q8-8 16 0l-2 8h-12z'], ['@bill', 'M24-148l26 4-26 4z'], { s: '@black', w: 2.4, d: 'M14-150l-14 6' }, ...eye(19, -148, 1.6)];
      return { body, head };
    },
  });

  /* ---------- bird.kingfisher: perched on a twig over the water (v0) or on a post (v1) ---------- */
  defineObj({
    id: 'bird.kingfisher', category: 'bird', size: [42, 44], variants: 2, seasonal: false, flippable: true, parts: ['perch', 'body', 'head'],
    palette: { base: { blue: ['#1e8fc4', '#3fb0e0', '#155f8a', '#7fd8f4'], orange: ['#e0742a', '#f29a4a'], white: '#f6f2ea', bill: '#1a1a1a', twig: ['#4a3a2c', '#6a5440'], post: ['#6a5440', '#8f7656'] } },
    anim: { turn: { part: 'head', pivot: [4, -16], deg: 14, period: 5, hold: .5 } },
    tags: ['uk', 'canal', 'pond', 'river', 'kingfisher', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: 'the Fleet Pond view art (kingfisher), redrawn perched',
    build(v) {
      const perch = v ? [['@post.0', 'M-7 0h14v18h-14z'], ['@post.1', 'M-7 0h5v18h-5z', .8], ['@post.1', ell(0, 0, 7, 2)]] : [{ s: '@twig.0', w: 2.4, d: 'M-20 2q14-4 34 0' }, { s: '@twig.1', w: 1.4, d: 'M2 1l8-6' }];
      return {
        perch,
        body: [['@blue.2', 'M-11-4l-7 7 3 2 7-6z'], ['@orange.0', 'M-8 0q-4-10 4-16 8-2 10 4 2 8-4 13z'], ['@orange.1', 'M0-6q3 2 2 6l-3 1z', .8], ['@blue.0', 'M-12-4q-2-10 8-14 6 0 4 6-6 6-12 8z'], ['@blue.1', 'M-8-10q4-6 10-6-2 4-10 6z'], ['@blue.3', 'M-10-6l14-6-1 2z', .9],
          { s: '#2a2420', w: 1.2, d: 'M-2 0v2M2 0v2' }],
        head: [['@blue.0', 'M-2-16q2-10 10-8 6 2 4 8l-6 4z'], ['@blue.1', 'M0-21q4-4 8-2-4 0-8 2z'], ['@orange.0', 'M4-18q4-1 6 1l-4 2z'], ['@white', 'M5-14q4-1 5 2l-4 1z'], ['@bill', 'M11-18.6l9 2-9 1.4z'], ...eye(6, -19, 1.2)],
      };
    },
  });

  /* ---------- bird.kingfisher-flight: the blue flash darting low along the bank ---------- */
  defineObj({
    id: 'bird.kingfisher-flight', category: 'bird', size: [44, 13], variants: 1, seasonal: false, flippable: true, parts: ['body', 'wings'],
    palette: { base: { blue: ['#1e8fc4', '#3fb0e0', '#2a6f9e'], orange: '#e0742a', bill: '#1a1a1a' } },
    anim: { flap: { part: 'wings', pivot: [-2, -4], sy: [-.6, 1], period: .16 } },
    tags: ['uk', 'canal', 'pond', 'kingfisher', 'flight', 'kit:birds', 'kit:temperate', 'kit:water', 'role:bird'],
    credit: 'the Fleet Pond view art (kingfisher)',
    build() {
      return {
        body: [['@blue.0', 'M-14-2q8-8 18-5l6 4-6 4q-10 2-18-3z'], ['@blue.1', 'M-10-4q8-4 14-2', .8], ['@orange', 'M-6 0q6 4 12 1-6-1-12-1z'], ['@blue.2', 'M-16-2l-8-2 8 4z'], ['@bill', 'M10-4l10 1-10 2z'], ...eye(7, -4, .9)],
        wings: [['@blue.1', 'M-6-5q4-10 10-2z'], ['@blue.2', 'M-4-5q2-5 5-2z', .7]],
      };
    },
  });

  /* ---------- perched songbirds: bird.robin and bird.stonechat (v0 male, v1 female) ---------- */
  defineObj({
    id: 'bird.robin', category: 'bird', size: [38, 45], variants: 2, seasonal: false, flippable: true, parts: ['perch', 'tail', 'body', 'head'],
    palette: { base: { brown: ['#8a6a4e', '#a8886a', '#6a4e38'], red: ['#e2643a', '#f08a5a'], belly: '#efe6d4', bill: '#3a2e24', leg: '#5a4a3a', post: ['#6a5440', '#8f7656'], twig: '#4a3a2c' } },
    anim: { turn: { part: 'head', pivot: [2, -14], deg: 12, period: 4, hold: .4 } },
    tags: ['uk', 'garden', 'woodland', 'robin', 'kit:birds', 'kit:temperate', 'kit:urban', 'role:bird'],
    credit: "the nature kit's K.robin, redrawn",
    build(v) {
      return {
        perch: v ? [{ s: '@twig', w: 2.2, d: 'M-16 4q12-3 30 0' }] : [['@post.0', 'M-8 4h16v16h-16z'], ['@post.1', 'M-8 4h5v16h-5z', .8], ['@post.1', ell(0, 4, 8, 2)]],
        tail: [['@brown.2', 'M-11-5l-8 3 8 2z']],
        body: [{ s: '@leg', w: 1.4, d: 'M-3 0v4M3 0v4' }, ['@brown.0', 'M-12-2q-6-16 8-20 14-2 16 12l-4 10z'], ['@brown.1', 'M-8-14q6-6 14-6-4 4-14 6z', .8], ['@red.0', 'M2-18q10 2 8 14-8 4-12-6z'], ['@red.1', 'M4-15q4 1 4 5z', .7], ['@belly', 'M-4-2q8 2 12-4-4 6-12 4z'], { s: '@brown.2', w: .9, op: .6, d: 'M-8-10l6-2M-7-7l6-2' }],
        head: [['@red.0', 'M2-18q4-6 10-2-2 4-10 2z'], ['@brown.0', 'M-2-20q4-6 10-3l-4 3z'], ...eye(6, -18, 1.3), ['@bill', 'M12-17l5 1-5 2z']],
      };
    },
  });
  defineObj({
    id: 'bird.stonechat', category: 'bird', size: [36, 30], variants: 2, seasonal: false, flippable: true, parts: ['perch', 'tail', 'body', 'head'],
    palette: { base: { back: ['#4a3c32', '#6a5442'], breast: ['#e07a3a', '#c99266'], cap: ['#1c1a1a', '#6a5442'], white: '#f4f0e8', bill: '#1a1a1a', twig: '#5a4a3a', gorse: ['#3f6338', '#f3c21c'] } },
    anim: { turn: { part: 'tail', pivot: [-8, -6], deg: 18, period: 1.6, hold: .3 } },
    tags: ['uk', 'heath', 'stonechat', 'kit:birds', 'kit:temperate', 'role:bird'],
    credit: 'the Yateley Common view art (stonechat), redrawn',
    build(v) {
      const f = v === 1;
      return {
        perch: [{ s: '@twig', w: 2, d: 'M-14 6q10-4 22-2M0 5l6-10' }, ['@gorse.0', 'M4-4q2-4 6-2 0 4-6 2z'], ['@gorse.1', circ(8, -6, 1.8)]],
        tail: [['#2a2420', 'M-8-5l-9 7 3 2 8-6z']],
        body: [{ s: '#2a2420', w: 1.2, d: 'M-2 0v6M2 0v6' }, ['@back.0', 'M-10-4q-2-12 10-14 10-1 12 8l-4 10q-12 4-18-4z'], ['@back.1', 'M-6-14q6-4 12-3-4 3-12 3z', .8], ['@breast.' + (f ? 1 : 0), 'M4-12q8 2 8 10-4 6-10 4z'], ['@white', 'M-6-8l6-2v3z', .8]],
        head: [['@cap.' + (f ? 1 : 0), 'M0-16q2-10 10-8 4 4 2 8z'], f ? null : ['@white', 'M2-14q4 0 6 4l-6 0z'], ...eye(8, -19, 1.2), ['@bill', 'M12-19l4 1-4 1z']].filter(Boolean),
      };
    },
  });

  /* ---------- bird.small-flight: a small bird in flight (finch, sparrow, swallow): for flocks ---------- */
  defineObj({
    id: 'bird.small-flight', category: 'bird', size: [30, 23], variants: 3, seasonal: false, flippable: true, parts: ['body', 'wings'],
    palette: { base: { bird: ['#3a3430', '#5a4a3e', '#1e2a3a'], light: ['#8a7a6a', '#c8b8a0', '#e8e4dc'], red: '#b8402a' } },
    anim: { flap: { part: 'wings', pivot: [0, -1], sy: [-.8, 1], period: .3 } },
    tags: ['uk', 'sky', 'songbird', 'finch', 'swallow', 'flight', 'kit:birds', 'kit:temperate', 'kit:urban', 'role:bird'],
    credit: "the nature kit's K.flock, redrawn",
    build(v) {
      if (v === 2) return {   // a swallow: forked tail, long swept wings
        body: [['@bird.2', 'M-8 0q4-3 12-2l4 2-4 2q-8 1-12-2z'], ['@bird.2', 'M-8 0l-10-4 4 4-4 3z'], ['@light.2', 'M-4 1q6 2 10 0-4 2-10 0z'], ['@red', 'M6-1l3 1-3 1z']],
        wings: [['@bird.2', 'M-2-1q-6-8-14-12 8 2 16 10z'], ['@bird.2', 'M0-1q2-8 8-13-2 8-6 13z', .9]],
      };
      const c = v ? 1 : 0;
      return {
        body: [[`@bird.${c}`, 'M-8 0q2-5 10-5 6 0 7 4l3 1-3 1q-4 3-12 2z'], [`@bird.${c}`, 'M-8-1l-6-1 1 3 5 0z'], ['@light.' + c, 'M-5 1q6 2 11-1-5 3-11 1z']],
        wings: [[`@bird.${c}`, 'M-4-2q-2-9 6-12 0 7-2 12z'], ['@light.' + c, 'M-2-4q0-5 3-7-1 5-3 7z', .5]],
      };
    },
  });
})();
