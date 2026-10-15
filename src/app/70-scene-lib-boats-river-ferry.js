/* ============================================================
   SCENE LIBRARY: the river passenger ferry (a generic double-ended ferry for any port, estuary or big river; docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per variant.

   boat.river-ferry       a double-ended passenger ferry about 48 m long: a white hull on a dark lower hull with a coloured band, an open
                          main deck at both ends, two enclosed decks of windows (lit at dusk), a wheelhouse and two tall funnels, a mast
                          with a masthead light (3 liveries: blue, green, red bands). It names its end view in `views`, so the world's
                          hull-in-perspective draws a real bow and stern when the ferry runs along the line of sight, never a flat slab.
   boat.river-ferry-end   the same ferry seen from either end (it is double-ended: one drawing serves bow and stern)
   Side view faces RIGHT, anchor the waterline at the middle, lit from the LEFT. Unbranded: no names, numbers, flags or liveries of a
   real operator.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  const PAL = {
    hull: ['#f2f4f4', '#eee8d6', '#f0f2f2'], hullS: ['#d2d8dc', '#d2ccb8', '#d0d6da'], low: ['#27384a', '#2c3a2c', '#2a2a30'], lowS: ['#1a2736', '#1e2a1e', '#1c1c21'],
    band: ['#2a5a8a', '#2e7a5a', '#b6382c'], bandD: ['#1c3e60', '#1e5640', '#842820'], funnel: ['#2a5a8a', '#2e7a5a', '#b6382c'], funnelD: ['#1c3e60', '#1e5640', '#842820'],
    top: '#1c1e22', glass: ['#3a4a5a', '#56687a'], rail: '#e8ecee', roof: ['#c4ccd2', '#8e9aa4'], mast: '#6a7680', beacon: '#ffe6a0', ring: '#d8442e', wake: '#f4fbfc',
  };
  const night = { glow: { window: '#ffe0a0', lamp: '#fff2c8' }, on: 0.85 };
  const TAGS = ['uk', 'harbour', 'ferry', 'river', 'estuary', 'boat', 'city', 'kit:boats', 'kit:towers', 'kit:temperate', 'kit:water', 'role:boat'];

  define({
    id: 'boat.river-ferry', category: 'boat', size: [490, 160], variants: 3, seasonal: false, flippable: true, parts: ['body'],
    real: { h: 16, l: 49, w: 12 },
    views: { front: 'boat.river-ferry-end', back: 'boat.river-ferry-end' },
    palette: { base: PAL }, night, anim: { bob: { part: '*', dy: 1.4, period: 5.2 } }, reflect: true,
    tags: TAGS, credit: 'native (world engine: a generic river passenger ferry)',
    build(v) {
      const b = [], P = (...s) => b.push(...s);
      P({ s: '@wake', w: 2, op: 0.5, d: 'M-250 3h500M-216 8h70M80 8h130' });
      // the double-ended hull: dark lower hull, white topsides, the coloured band, raked at both ends
      P([`@low.${v}`, poly([[-246, -30], [246, -30], [238, -8], [226, 10], [-226, 10], [-238, -8]])], [`@lowS.${v}`, poly([[-238, -8], [238, -8], [226, 10], [-226, 10]]), 0.5]);
      P([`@hull.${v}`, poly([[-246, -30], [246, -30], [239, -10], [-239, -10]])], [`@hullS.${v}`, poly([[-243, -16], [243, -16], [239, -10], [-239, -10]])], [`@band.${v}`, poly([[-241, -15], [241, -15], [239.5, -10], [-239.5, -10]])]);
      // the main deck house and the upper deck, windows in rows (seeded into glow groups by their position)
      P([`@hull.${v}`, rect(-208, -58, 416, 28)], [`@hullS.${v}`, rect(-208, -34, 416, 4)], ['@roof.0', rect(-212, -60, 424, 3)]);
      P([`@hull.${v}`, rect(-152, -80, 304, 22)], ['@roof.0', rect(-156, -82, 312, 3)]);
      for (let row = 0; row < 2; row++) {
        const y = row ? -76 : -54, h = row ? 11 : 13, x0 = row ? -144 : -200, x1 = row ? 138 : 192, step = row ? 17 : 18;
        let a = '', c = '';
        for (let x = x0, i = 0; x < x1; x += step, i++) { if (i % 3 === 1) c += rect(x, y, step - 6, h); else a += rect(x, y, step - 6, h); }
        P({ f: '@glass.0', d: a, glow: 'window' }, { f: '@glass.1', d: c, glow: 'window' });
      }
      // the wheelhouse, with its glazing across the front and sides
      P([`@hull.${v}`, rect(-36, -100, 72, 20)], ['@roof.1', rect(-40, -102, 80, 3)], { f: '@glass.0', d: rect(-31, -96, 62, 10), glow: 'window' }, { s: `@hullS.${v}`, w: 1.4, d: 'M-10 -96V-86M10 -96V-86' });
      // two tall funnels in the band colour with black tops and a white band
      for (const x of [-82, 64]) P([`@funnel.${v}`, poly([[x - 16, -80], [x + 16, -80], [x + 12, -132], [x - 12, -132]])], [`@funnelD.${v}`, poly([[x + 6, -80], [x + 16, -80], [x + 12, -132], [x + 4, -132]]), 0.55], ['@top', rect(x - 12.8, -138, 25.6, 8)], [`@hull.${v}`, rect(x - 14.4, -106, 28.8, 6)]);
      // rails round the open ends, lifebuoys on the upper deck, the mast and its light
      P({ s: '@rail', w: 1.1, d: 'M-244 -40H-208M-244 -30V-40M-228 -30V-40M-212 -30V-40M244 -40H208M244 -30V-40M228 -30V-40M212 -30V-40' }, { s: '@rail', w: 1, d: 'M-150 -86H150M-150 -80V-86M-110 -80V-86M-70 -80V-86M-20 -80V-86M20 -80V-86M70 -80V-86M110 -80V-86M150 -80V-86' });
      P(['@ring', ell(-122, -69, 5.2, 5.2), 0.9], ['@hull.0', ell(-122, -69, 2.4, 2.4)], ['@ring', ell(118, -69, 5.2, 5.2), 0.9], ['@hull.0', ell(118, -69, 2.4, 2.4)]);
      P({ s: '@mast', w: 1.8, d: 'M0 -102V-150M-13 -138H13' }, { f: '@beacon', d: ell(0, -151, 2.6, 2.6), glow: 'lamp' });
      return { body: b };
    },
  });

  define({
    id: 'boat.river-ferry-end', category: 'boat', size: [124, 160], variants: 3, seasonal: false, flippable: false, weight: 0, parts: ['body'],
    real: { h: 16, l: 12, w: 49 },
    palette: { base: PAL }, night, anim: { bob: { part: '*', dy: 1.4, period: 5.2 } }, reflect: true,
    tags: TAGS.concat(['view']), credit: 'native (world engine: the river ferry seen from its bow or stern)',
    build(v) {
      const b = [], P = (...s) => b.push(...s);
      // the funnel standing up behind the wheelhouse, the mast
      P([`@funnel.${v}`, rect(-16, -134, 32, 56)], [`@funnelD.${v}`, rect(5, -134, 11, 56), 0.55], ['@top', rect(-13.6, -140, 27.2, 8)], [`@hull.${v}`, rect(-16, -108, 32, 6)]);
      P({ s: '@mast', w: 1.8, d: 'M0 -102V-150M-12 -138H12' }, { f: '@beacon', d: ell(0, -151, 2.6, 2.6), glow: 'lamp' });
      // the hull end: flared topsides on the dark lower hull, the band
      P([`@low.${v}`, poly([[-60, -30], [60, -30], [52, -8], [42, 10], [-42, 10], [-52, -8]])], [`@hull.${v}`, poly([[-60, -30], [60, -30], [53, -10], [-53, -10]])], [`@band.${v}`, poly([[-54, -15], [54, -15], [53, -10], [-53, -10]])]);
      // the main deck house with its windows, the upper deck, the wheelhouse
      P([`@hull.${v}`, rect(-54, -58, 108, 28)], ['@roof.0', rect(-57, -60, 114, 3)]);
      P({ f: '@glass.0', d: rect(-44, -54, 14, 13) + rect(-22, -54, 14, 13) + rect(8, -54, 14, 13), glow: 'window' }, { f: '@glass.1', d: rect(30, -54, 14, 13), glow: 'window' });
      P([`@hull.${v}`, rect(-44, -80, 88, 22)], ['@roof.0', rect(-47, -82, 94, 3)]);
      P({ f: '@glass.0', d: rect(-36, -76, 15, 11) + rect(-13, -76, 15, 11) + rect(10, -76, 15, 11), glow: 'window' }, { f: '@glass.1', d: rect(26, -76, 10, 11), glow: 'window' });
      P([`@hull.${v}`, rect(-27, -100, 54, 20)], ['@roof.1', rect(-30, -102, 60, 3)], { f: '@glass.0', d: rect(-23, -96, 46, 10), glow: 'window' });
      P({ s: '@rail', w: 1.1, d: 'M-60 -40H-54M60 -40H54' });
      return { body: b };
    },
  });
})();
