/* ============================================================
   SCENE LIBRARY: boats, the TROPICAL kit (docs/dev/SCENE_ENGINE.md 2.7).
   PURE: sceneObjDefine calls only, built lazily per variant.

   boat.bumboat   the river and bay tour boat of Singapore after the old lighters: a long,
                  low wooden hull with a sheer that rises to the bow, a painted gunwale band,
                  a flat canopy roof on slim posts over the benches, a row of paper-style
                  lanterns under the eaves (lit at real dusk), a small helm at the stern
                  (3 variants: red, teal and brown hulls). No painted eyes, names or text.
   It FACES RIGHT (the bow on the right). Anchor: the waterline at the middle. Lit from the LEFT.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { rect, ell, define } = sceneDraw;
  define({
    id: 'boat.bumboat', category: 'boat', size: [190, 70], variants: 3, seasonal: false, flippable: true, parts: ['body'],
    palette: { base: {
      hull: ['#a8382a', '#2a6e6a', '#7a4a2a'], hullD: ['#6e2018', '#1a4644', '#4e2e1a'], band: ['#e8c050', '#e8d8b0', '#d8a040'], wood: ['#c89a62', '#8a6440'],
      canopy: ['#d8cdb4', '#b8ac92', '#f0e8d4'], post: '#3a2e26', bench: '#6a4a30', lantern: ['#e0503a', '#f0c040'], wake: '#f4fbfc', rope: '#d8cdb8',
    } },
    night: { glow: { lamp: '#ffcf80', window: '#ffe0a0' }, on: 1 },
    anim: { bob: { part: '*', dy: 1.6, period: 4.2 } },
    reflect: true,
    tags: ['singapore', 'river', 'bumboat', 'boat', 'tour-boat', 'harbour', 'kit:boats', 'kit:tropical', 'kit:shophouse', 'kit:water', 'role:boat'],
    credit: 'native (scene engine pilot)',
    build(v) {
      const body = [];
      body.push({ s: '@wake', w: 2, op: 0.55, d: 'M-100 3h60M-20 5h50M60 3h40' });
      // the hull: a sheer line rising to the bow, the dark lower strake, the painted band and rubbing strake
      body.push([`@hull.${v}`, 'M-92-16Q0-12 82-20Q94-24 98-30L92-14Q88-2 76 2H-82Q-92-4-92-16z'], [`@hullD.${v}`, 'M-88-4H86Q82 0 76 2H-82z']);
      body.push({ s: `@band.${v}`, w: 2.4, d: 'M-90-14Q0-10 84-18Q92-22 96-27' }, { s: '@wood.1', w: 1, op: 0.7, d: 'M-88-8Q0-5 84-11' });
      // benches and a few seated shapes are NOT drawn (no people in the boat): the benches only
      body.push(['@bench', rect(-62, -24, 110, 4)], ['@wood.0', rect(-60, -30, 4, 6) + rect(-30, -30, 4, 6) + rect(0, -30, 4, 6) + rect(30, -30, 4, 6)]);
      // the canopy on posts, its fringe and the lanterns under the eaves
      body.push({ s: '@post', w: 2, d: 'M-66-16V-46M-34-14V-46M-2-13V-46M30-14V-46M58-16V-46' });
      body.push(['@canopy.0', 'M-74-46Q-4-52 66-46L70-50Q-4-58-78-50z'], ['@canopy.1', 'M-74-46Q-4-52 66-46L66-43Q-4-49-74-43z'], ['@canopy.2', 'M-76-50Q-4-57 68-50L70-51Q-4-59-78-51z', 0.8]);
      let red = '', gold = '';
      for (let i = 0; i < 6; i++) { const x = -60 + i * 24, d = ell(x, -38, 3.6, 4.4); if (i % 2) gold += d; else red += d; }
      body.push({ f: '@lantern.0', d: red, glow: 'lamp' }, { f: '@lantern.1', d: gold, glow: 'lamp' }, { s: '@post', w: 0.8, d: 'M-60-43v1M-36-43v1M-12-43v1M12-43v1M36-43v1M60-43v1' });
      // the helm at the stern, a coil of rope at the bow, a fender
      body.push(['@wood.1', 'M-90-16V-34H-78V-16z'], ['@canopy.1', rect(-92, -36, 16, 3)], { f: '@band.0', d: rect(-88, -31, 8, 5), glow: 'window' });
      body.push({ s: '@rope', w: 2.2, d: 'M84-20q8-6 2-10' }, [`@hullD.${v}`, ell(-50, -10, 3, 4) + ell(20, -9, 3, 4)]);
      return { body };
    },
  });
})();
