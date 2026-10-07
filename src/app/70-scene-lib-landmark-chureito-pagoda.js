/* ============================================================
   SCENE LIBRARY: landmark.chureito-pagoda (one landmark per file; docs/dev/SCENE_ENGINE.md 2.1, 16.3).
   Started from `scene upgrade asia-east/jp-signature --box 1040,480,1210,782` (the old art's
   pagoda: five red tiers, dark roofs), then REDRAWN and refined:
   - the real structure: a five-storied pagoda on a stone platform on the hillside above the
     town: vermilion pillars, beams and balcony rails, white plaster panels, five dark tiled
     roofs with deep eaves that sweep up at the corners (each tier a little narrower), bracket
     sets under every eave, and the spire (the bronze finial with its nine rings and flame)
   - lit from the left: the right-hand bays in shade, the eaves' undersides dark
   - seasons: snow on the five roofs and the platform in winter; the low shrubs round the
     platform green, red-brown in autumn, fresh in spring (shapeBySeason)
   - night: the 'lit' part floodlights it warm orange from below; the lattice windows of
     every tier glow (glow 'window'), the lanterns on the platform (glow 'lamp')
   No text, no emblems. Anchor: the ground at the middle of the platform.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;   // the engine core is not in this build
  const { f1, rect, ell, poly, define, seasons } = sceneDraw;
  define({
    id: 'landmark.chureito-pagoda', category: 'landmark', size: [170, 290], variants: 1, seasonal: true, shapeBySeason: true, flippable: false, parts: ['body', 'lit'],
    palette: Object.assign({ base: {
      red: ['#c8402c', '#9a2c20', '#e06048'], white: ['#efe6d6', '#c8bca8'], roof: ['#3a3a40', '#26262c', '#5a5a64'], bronze: ['#8a7a4a', '#5e5232', '#c0a868'],
      stone: ['#a8a090', '#7a7266', '#c8c0b0'], lattice: ['#5a2a20', '#f2c070'], snow: ['#f4f8fc', '#d4dee8'], flood: '#ffb070', lantern: '#ffd690',
    } }, seasons({
      shrub: { spring: ['#6a9a48', '#9ac060'], summer: ['#3e6a34', '#5a8a40'], autumn: ['#9a4a28', '#c06a30'], winter: ['#4a5440', '#5e6450'] },
    })),
    night: { glow: { window: '#ffcf80', lamp: '#ffe0a0' }, on: 0.9 },
    shadow: { rx: 70, ry: 6, h: 120 },
    reflect: true,
    tags: ['landmark', 'place:asia/country:JP', 'asia', 'asia-east', 'pagoda', 'temple', 'signature'],
    credit: 'native (scene engine pilot), after the hand-drawn jp-signature art',
    build(v, r, ctx) {
      const body = [], lit = [], winter = ctx.season === 'winter';
      // the stone platform with its steps
      body.push(['@stone.1', rect(-86, -12, 172, 12)], ['@stone.0', rect(-86, -12, 120, 12)], ['@stone.2', rect(-88, -14, 176, 3)], { s: '@stone.1', w: 0.6, op: 0.6, d: 'M-86 -6H86M-60 -12v12M-30 -12v12M0 -12v12M30 -12v12M60 -12v12' });
      if (winter) body.push(['@snow.0', 'M-88 -14Q-60 -18 -20 -16Q20 -19 60 -16Q80 -18 88 -14V-11H-88z']);
      // the five tiers, bottom up: body width, body height, roof width
      let y = -14;
      const tiers = [[96, 30, 168], [86, 24, 150], [78, 23, 136], [70, 22, 122], [62, 21, 108]];
      tiers.forEach(([bw, bh, rw], i) => {
        const x0 = -bw / 2, top = y - bh;
        // the balcony rail (tiers 2 to 5) under the body
        if (i > 0) body.push(['@red.1', rect(x0 - 5, y - 4, bw + 10, 4)], { s: '@red.0', w: 0.8, d: Array.from({ length: Math.floor((bw + 10) / 6) }, (_, k) => `M${f1(x0 - 4 + k * 6)} ${y - 4}v-5`).join('') + `M${x0 - 5} ${y - 9}h${bw + 10}` });
        // the body: plaster panels between red pillars, the right bays in shade
        body.push(['@white.0', rect(x0, top, bw, bh)], ['@white.1', rect(x0 + bw * 0.66, top, bw * 0.34, bh), 0.6]);
        const n = 5;
        let pil = '';
        for (let k = 0; k <= n; k++) pil += rect(x0 + k * (bw - 4) / n, top, 4, bh);
        body.push(['@red.0', pil], ['@red.0', rect(x0, top, bw, 3.5)], ['@red.1', rect(x0 + bw * 0.66, top, bw * 0.34, 3.5), 0.7]);
        // the lattice windows (and the doors of the first tier): glow at night
        const wy = top + 7, wh = bh - 11;
        body.push({ f: '@lattice.0', d: rect(x0 + (bw - 4) / n + 6, wy, (bw - 4) / n - 8, wh) + rect(x0 + 3 * (bw - 4) / n + 6, wy, (bw - 4) / n - 8, wh), glow: 'window' });
        body.push({ s: '@red.1', w: 0.6, op: 0.8, d: `M${f1(x0 + (bw - 4) / n + 6)} ${f1(wy + wh / 2)}h${f1((bw - 4) / n - 8)}M${f1(x0 + 3 * (bw - 4) / n + 6)} ${f1(wy + wh / 2)}h${f1((bw - 4) / n - 8)}`, detail: true });
        // the bracket sets under the eave (a row of dark blocks), then the roof sweeping up at the corners
        const ry = top - 2, rh = 13 - i * 0.5, half = rw / 2;
        let br = ''; for (let k = 0; k < 9; k++) br += rect(-bw / 2 - 2 + k * (bw + 4) / 9, ry - 3, (bw + 4) / 9 - 2, 4);
        body.push(['@red.1', rect(-bw / 2 - 3, ry - 4, bw + 6, 5)], ['@roof.1', br, 0.9]);
        const roof = `M${f1(-half - 6)} ${f1(ry - rh - 6)}Q${f1(-half + 8)} ${f1(ry - 4)} ${f1(-half * 0.45)} ${f1(ry - 3)}H${f1(half * 0.45)}Q${f1(half - 8)} ${f1(ry - 4)} ${f1(half + 6)} ${f1(ry - rh - 6)}Q${f1(half * 0.55)} ${f1(ry - rh - 2)} ${f1(half * 0.32)} ${f1(ry - rh - 12)}H${f1(-half * 0.32)}Q${f1(-half * 0.55)} ${f1(ry - rh - 2)} ${f1(-half - 6)} ${f1(ry - rh - 6)}z`;
        body.push(['@roof.0', roof], ['@roof.1', `M${f1(half * 0.1)} ${f1(ry - rh - 12)}H${f1(half * 0.32)}Q${f1(half * 0.55)} ${f1(ry - rh - 2)} ${f1(half + 6)} ${f1(ry - rh - 6)}Q${f1(half - 8)} ${f1(ry - 4)} ${f1(half * 0.45)} ${f1(ry - 3)}H${f1(half * 0.1)}z`, 0.6]);
        body.push({ s: '@roof.2', w: 0.7, op: 0.6, d: Array.from({ length: 11 }, (_, k) => { const t = -1 + k * 0.2; return `M${f1(t * half * 0.32)} ${f1(ry - rh - 11)}L${f1(t * half * 0.62)} ${f1(ry - 4)}`; }).join(''), detail: true });
        body.push({ s: '@bronze.2', w: 1, d: `M${f1(-half - 6)} ${f1(ry - rh - 6)}l-3 -3M${f1(half + 6)} ${f1(ry - rh - 6)}l3 -3` });
        if (winter) body.push(['@snow.0', `M${f1(-half - 4)} ${f1(ry - rh - 7)}Q${f1(-half * 0.55)} ${f1(ry - rh - 4)} ${f1(-half * 0.32)} ${f1(ry - rh - 13)}H${f1(half * 0.32)}Q${f1(half * 0.55)} ${f1(ry - rh - 4)} ${f1(half + 4)} ${f1(ry - rh - 7)}L${f1(half * 0.4)} ${f1(ry - rh - 8)}Q${f1(0)} ${f1(ry - rh - 6)} ${f1(-half * 0.4)} ${f1(ry - rh - 8)}z`], ['@snow.1', rect(-half * 0.3, ry - rh - 9, half * 0.6, 2), 0.8]);
        y = ry - rh - 12;
      });
      // the finial: a base, the nine rings on a bronze pole, the flame-shaped top
      body.push(['@roof.0', rect(-10, y - 6, 20, 6)], ['@bronze.0', rect(-2, y - 66, 4, 62)], ['@bronze.1', rect(0.6, y - 66, 1.4, 62), 0.7]);
      let rings = ''; for (let k = 0; k < 9; k++) rings += ell(0, y - 14 - k * 5.4, 6 - k * 0.25, 1.4);
      body.push(['@bronze.2', rings], ['@bronze.0', `M-3 ${y - 66}Q0 ${y - 80} 3 ${y - 66}z`], ['@bronze.0', ell(0, y - 10, 5, 3)]);
      // two lanterns on the platform (glow lamps)
      for (const lx of [-74, 74]) body.push(['@stone.0', rect(lx - 2, -32, 4, 18)], ['@stone.2', poly([[lx - 7, -32], [lx, -38], [lx + 7, -32]])], { f: '@stone.1', d: rect(lx - 4, -30, 8, 6), glow: 'lamp' });
      // shrubs round the platform, by season
      let sh0 = '', sh1 = '';
      for (let k = 0; k < 12; k++) { const x = -84 + k * 15 + r() * 6, d = sceneDraw.blob(r, x, -4, 7 + r() * 3, 5 + r() * 2, 7, 0.35); if (k % 2) sh0 += d; else sh1 += d; }
      body.push(['@shrub.0', sh0], ['@shrub.1', sh1]);
      if (winter) body.push(['@snow.0', sh1, 0.7]);
      // night: an orange floodlight up the pagoda
      lit.push({ f: { lin: [[0, '@flood', 0.05], [1, '@flood', 0.5]], x1: 0, y1: -230, x2: 0, y2: -14 }, d: poly([[-50, -14], [-44, -230], [44, -230], [50, -14]]) });
      return { body, lit };
    },
  });
})();
