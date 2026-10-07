/* ============================================================
   SCENE LIBRARY: boats, the TOWERS kit (big-city harbours; docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per variant.

   boat.ferry        a harbour commuter ferry: a long white hull with a coloured rubbing band,
                     two enclosed decks of windows (lit at real dusk), an open top deck with a
                     rail, a wheelhouse and a stub mast with a masthead light (2 variants)
   boat.tug          a harbour tug: a deep hull, a fendered bow, a stepped house with a tall
                     wheelhouse, a stack; red, black or green (3 variants)
   boat.water-taxi   a small fast launch: a low white hull, a glazed cabin, a bow wave (3 variants)
   All FACE RIGHT (the bow on the right). Anchor: the waterline at the middle. Lit from the
   LEFT. Unbranded: no names, numbers, flags or liveries.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, define } = sceneDraw;

  /* ---------- boat.ferry ---------- */
  define({
    id: 'boat.ferry', category: 'boat', size: [220, 78], variants: 2, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: {
      hull: ['#f2f4f4', '#d2d8dc', '#a8b2ba'], band: ['#2a5a8a', '#2e7a5a'], bandD: ['#1c3e60', '#1e5640'], glass: ['#3a4a5a', '#56687a'],
      rail: '#e8ecee', roof: ['#c4ccd2', '#8e9aa4'], keel: '#24303a', wake: '#f4fbfc', mast: '#6a7680', beacon: '#ffe6a0',
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 0.85 },
    anim: { bob: { part: '*', dy: 1.4, period: 4.6 } },
    reflect: true,
    tags: ['harbour', 'ferry', 'boat', 'city', 'kit:boats', 'kit:towers', 'kit:water', 'role:boat'],
    credit: 'native (scene engine pilot)',
    build(v) {
      const body = [];
      body.push({ s: '@wake', w: 2, op: 0.55, d: 'M-118 3h236M-100 7h40M40 7h70' });
      // hull: a raked bow, a squared stern; the shaded lower strake and the keel line
      body.push(['@hull.1', 'M-108-24H96Q112-24 116-14L104 2H-104z'], ['@hull.2', 'M-104-6H110L104 2H-104z'], ['@keel', 'M-104 0H104v2H-104z']);
      body.push([`@band.${v}`, 'M-108-20H112l-2 5H-108z'], [`@bandD.${v}`, 'M-108-15H110l-1 2H-108z']);
      // main deck house and the upper deck: windows in two rows, seeded into glow groups
      body.push(['@hull.0', 'M-96-24V-44H84Q96-44 98-34L100-24z'], ['@hull.1', 'M-96-28H100v4H-96z'], ['@roof.0', 'M-98-46H86l3 2H-98z']);
      body.push(['@hull.0', 'M-74-46V-62H52Q62-62 64-54L66-46z'], ['@roof.0', 'M-76-64H54l3 2H-76z']);
      for (let row = 0; row < 2; row++) {
        const y = row ? -58 : -40, x0 = row ? -70 : -90, x1 = row ? 56 : 88;
        let a = '', b = '';
        for (let x = x0, i = 0; x < x1; x += 13, i++) { if (i % 3 === 1) b += rect(x, y, 9, 9); else a += rect(x, y, 9, 9); }
        body.push({ f: '@glass.0', d: a, glow: 'window' }, { f: '@glass.1', d: b, glow: 'window' });
      }
      // the top deck rail, the wheelhouse, mast and masthead light
      body.push({ s: '@rail', w: 1, d: 'M-70-64V-70H40V-64M-60-64V-70M-40-64V-70M-20-64V-70M0-64V-70M20-64V-70' });
      body.push(['@hull.0', rect(40, -76, 22, 12)], ['@glass.0', rect(46, -73, 14, 5)], ['@roof.1', rect(38, -78, 26, 2)]);
      body.push({ s: '@mast', w: 1.6, d: 'M30-78V-90' }, { f: '@beacon', d: ell(30, -91, 1.8, 1.8), glow: 'lamp' });
      body.push({ s: '@hull.2', w: 1, op: 0.5, d: 'M-96-30H98' });
      return { body };
    },
  });

  /* ---------- boat.tug ---------- */
  define({
    id: 'boat.tug', category: 'boat', size: [130, 74], variants: 3, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: {
      hull: ['#b0332a', '#2a2c30', '#2e5a3e'], hullD: ['#7a2018', '#16181a', '#1c3a28'], house: ['#f0ebe0', '#e8e2d2', '#f2efe6'], houseD: ['#c8c0ae', '#bcb4a2', '#cac6ba'],
      fender: '#2a2420', glass: ['#2a3440', '#46566a'], stack: ['#2a2a2c', '#c8402a', '#e0b030'], wake: '#f4fbfc', mast: '#3a3e42', lamp: '#fff0c0',
    } },
    night: { glow: { window: '#ffd890', lamp: '#fff0c0' }, on: 0.9 },
    anim: { bob: { part: '*', dy: 1.8, period: 3.8 } },
    reflect: true,
    tags: ['harbour', 'tug', 'boat', 'city', 'kit:boats', 'kit:towers', 'kit:water', 'role:boat'],
    credit: 'native (scene engine pilot)',
    build(v) {
      const body = [];
      body.push({ s: '@wake', w: 2, op: 0.55, d: 'M-64 3h40M30 4h40' });
      body.push([`@hull.${v}`, 'M-60-22H40Q62-26 66-14L56 2H-56Q-62-8-60-22z'], [`@hullD.${v}`, 'M-58-6H62L56 2H-56z']);
      body.push({ s: '@fender', w: 4, d: 'M-60-20H44Q60-22 64-14' }, ['@fender', ell(66, -12, 4, 6)]);
      body.push(['@house.0', 'M-40-22V-38H26V-22z'], ['@houseD.0', 'M10-38H26V-22H10z'], ['@house.0', 'M-18-38V-56H18V-38z'], ['@houseD.0', 'M8-56H18V-38H8z']);
      body.push({ f: '@glass.0', d: rect(-14, -52, 8, 7) + rect(-3, -52, 8, 7), glow: 'window' }, { f: '@glass.1', d: rect(-34, -33, 7, 6) + rect(-22, -33, 7, 6) + rect(-10, -33, 7, 6), glow: 'window' });
      body.push(['@houseD.0', rect(-20, -58, 40, 2)], [`@stack.${v}`, 'M-36-38L-34-60H-24L-24-38z'], ['@stack.0', rect(-35, -62, 11, 3)]);
      body.push({ s: '@mast', w: 1.4, d: 'M2-58V-72M-4-66H8' }, { f: '@lamp', d: ell(2, -73, 1.6, 1.6), glow: 'lamp' });
      body.push({ s: '@fender', w: 1, op: 0.6, d: 'M-44-22H34' });
      return { body };
    },
  });

  /* ---------- boat.water-taxi ---------- */
  define({
    id: 'boat.water-taxi', category: 'boat', size: [110, 40], variants: 3, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: {
      hull: ['#f4f6f6', '#d8dee2', '#a8b4bc'], band: ['#e0a020', '#2a6a9a', '#c8402a'], glass: ['#2e3e4e', '#5a7084'], roof: '#e8ecee', wake: '#f4fbfc', lamp: '#fff0c0',
    } },
    night: { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 0.85 },
    anim: { bob: { part: '*', dy: 1.2, period: 2.6 } },
    reflect: true,
    tags: ['harbour', 'launch', 'boat', 'city', 'kit:boats', 'kit:towers', 'kit:water', 'role:boat'],
    credit: 'native (scene engine pilot)',
    build(v) {
      const body = [];
      body.push({ s: '@wake', w: 2, op: 0.6, d: 'M-70 2Q-60-2-50 2M-80 6h50' }, { s: '@wake', w: 1.6, op: 0.7, d: 'M52-6Q60 0 70 2' });
      body.push(['@hull.1', 'M-52-12H34Q52-12 58-6L50 2H-50z'], ['@hull.2', 'M-50-2H54L50 2H-50z'], [`@band.${v}`, 'M-52-10H44l2 3H-52z']);
      body.push(['@hull.0', 'M-36-12V-24H12Q22-24 26-12z'], ['@roof', 'M-38-26H14l2 2H-38z']);
      body.push({ f: '@glass.0', d: rect(-32, -22, 10, 7) + rect(-18, -22, 10, 7), glow: 'window' }, { f: '@glass.1', d: 'M-4-22H12L18-15H-4z', glow: 'window' });
      body.push({ s: '@hull.2', w: 1, op: 0.5, d: 'M-50-12H40' }, { f: '@lamp', d: ell(-30, -28, 1.4, 1.4), glow: 'lamp' });
      return { body };
    },
  });
})();
