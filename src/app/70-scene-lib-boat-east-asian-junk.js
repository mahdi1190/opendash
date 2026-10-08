/* ============================================================
   SCENE LIBRARY: boat.junk (the EAST-ASIAN kit; docs/dev/SCENE_ENGINE.md 2.1, 2.7).
   A three-masted Chinese junk under sail, as the harbour junks of Hong Kong still sail:
   a wooden hull with a high, square stern and a low, rising bow; a deckhouse; battened
   lugsails peaked up aft (the yard's after end highest), the mainsail tallest amidships, the foresail raked forward, the small mizzen at
   the stern; the sails' bamboo battens and the sheets running aft. Red sails (0) or the old
   tan-brown (1). FACES RIGHT (the bow on the right). Anchor: the waterline at the middle.
   Lit from the LEFT. Unbranded: no names, numbers, flags or painted eyes.
   weight 0: never picked by a kit fill (8.6), so adding it moves no other scene; a scene
   places it by name (an actor), as the Hong Kong harbour does.
   Light: the battens, rigging and planking are detail (dropped from small stills).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define } = sceneDraw;
  // the sails: [mast x, foot height, head height, reach aft, rake of the mast (x per unit of height)]
  const SAILS = [[-78, 46, 104, 36, 0], [-4, 30, 152, 74, 0], [58, 30, 122, 54, 0.12]];
  define({
    id: 'boat.junk', category: 'boat', size: [196, 160], variants: 2, seasonal: false, flippable: true, parts: ['body'], weight: 0,
    palette: { base: {
      hull: ['#7a4a30', '#5a3424', '#3a2218'], rail: '#9a6a44', house: ['#9a6a42', '#6e4a2e'], glass: '#2a2018', mast: '#4a3020',
      sail: ['#d24a30', '#a4744a'], sailD: ['#a43422', '#7e5634'], batten: ['#5a2418', '#4a3422'], rope: '#3a2a20', wake: '#f4fbfc', lamp: '#ffe2a0',
    } },
    night: { glow: { window: '#ffd890', lamp: '#fff0c0' }, on: 0.85 },
    anim: { bob: { part: '*', dy: 1.6, period: 4.4 } },
    reflect: true,
    tags: ['junk', 'boat', 'sail', 'harbour-junk', 'kit:east-asian', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'native (scene engine upgrade, the Hong Kong harbour)',
    build(v) {
      const body = [];
      body.push({ s: '@wake', w: 2, op: 0.55, d: 'M-96 3h40M-30 4h60M70 2Q84-2 98 3' });
      // the sails first (the hull and deckhouse stand in front of their feet): each a fan with a curved leech, its shaded
      // lower panels, the battens, the mast and the sheets
      SAILS.forEach(([m, f, h, w, rk], i) => {
        const lx = y => m + 5 + rk * (y - f);   // the luff, just ahead of the (raked) mast
        const top = [lx(h - 16), -h + 16], hd = [m - w * 0.78, -h], lc = [m - w * 1.08, -(f + h) / 2], lf = [m - w * 0.92, -f];
        const sail = `M${f1(lx(f))} ${-f}L${f1(top[0])} ${f1(top[1])}L${f1(hd[0])} ${f1(hd[1])}Q${f1(lc[0])} ${f1(lc[1])} ${f1(lf[0])} ${f1(lf[1])}Z`;
        body.push({ s: '@mast', w: i === 1 ? 2.6 : 2, d: `M${f1(m - rk * f)} -12L${f1(m + rk * (h - 8 - f))} ${-h + 8}` });
        body.push([`@sail.${v}`, sail]);
        body.push([`@sailD.${v}`, `M${f1(lx(f))} ${-f}L${f1(lx(f + (h - f) * 0.4))} ${f1(-f - (h - f) * 0.4)}L${f1(m - w * 1.05)} ${f1(-f - (h - f) * 0.36)}Q${f1(m - w * 1.02)} ${f1(-f - (h - f) * 0.15)} ${f1(lf[0])} ${-f}Z`, 0.55]);
        // the battens: poles across the sail, their aft ends lifting more towards the head (the fan)
        let bt = '';
        for (let k = 1; k <= 6; k++) { const t = k / 7, y = f + (h - f) * t; bt += `M${f1(lx(y))} ${f1(-y)}L${f1(m - w * (0.92 + 0.14 * Math.sin(Math.PI * t)) + w * 0.2 * t * t)} ${f1(-y - 2 - 8 * t)}`; }
        body.push({ s: `@batten.${v}`, w: 1, op: 0.8, d: bt, detail: true });
        body.push({ s: `@batten.${v}`, w: 1.6, d: `M${f1(top[0])} ${f1(top[1])}L${f1(hd[0])} ${f1(hd[1])}` });
        // the sheets: from the batten ends down to the deck aft
        body.push({ s: '@rope', w: 0.5, op: 0.6, d: `M${f1(m - w * 0.95)} ${f1(-f - (h - f) * 0.3)}L${f1(m - w * 0.6)} -30M${f1(m - w * 1.0)} ${f1(-f - (h - f) * 0.6)}L${f1(m - w * 0.62)} -30`, detail: true });
      });
      // the hull: the high square stern on the left, the sheer dipping amidships and rising to the bow
      const hull = 'M-90 -44L-84 0H66Q84 -6 96 -30L92 -32Q60 -22 20 -20Q-30 -20 -60 -28Q-76 -34 -84 -44Z';
      body.push(['@hull.1', hull], ['@hull.2', 'M-86 -10L-84 0H66Q78 -4 86 -12Z'], ['@hull.0', 'M-90 -44L-88 -38Q-74 -30 -60 -26Q-30 -18 20 -18Q60 -20 92 -32L96 -30Q60 -22 20 -20Q-30 -20 -60 -28Q-76 -34 -84 -44Z', 0.9]);
      body.push({ s: '@hull.2', w: 0.7, op: 0.6, d: 'M-86 -30Q-40 -12 30 -12Q70 -14 92 -26M-85 -20Q-40 -6 40 -6Q72 -8 88 -18', detail: true });
      // the stern: the raised poop with its rail and the stern lantern
      body.push(['@hull.0', poly([[-92, -50], [-62, -42], [-62, -32], [-88, -40]])], { s: '@rail', w: 1, d: 'M-90 -56L-62 -48M-90 -56V-50M-80 -53V-47M-70 -51V-45', detail: true });
      body.push({ f: '@lamp', d: ell(-92, -58, 1.8, 2.2), glow: 'lamp' });
      // the deckhouse amidships-aft: its roof, windows (lit at dusk) and door
      body.push(['@house.0', rect(-56, -38, 50, 14)], ['@house.1', rect(-20, -38, 14, 14)], ['@hull.2', rect(-58, -40, 54, 2.4)]);
      body.push({ f: '@glass', d: rect(-50, -34, 6, 5) + rect(-40, -34, 6, 5) + rect(-30, -34, 6, 5), glow: 'window' }, { f: '@glass', d: rect(-16, -35, 6, 9), glow: 'window' });
      // the bow: a low rail, the windlass and the masthead light on the mainmast
      body.push({ s: '@rail', w: 1, d: 'M30 -26Q60 -28 92 -36', detail: true }, ['@hull.2', rect(74, -34, 6, 4)], { f: '@lamp', d: ell(-4, -146, 1.6, 1.6), glow: 'lamp' });
      return { body };
    },
  });
})();
