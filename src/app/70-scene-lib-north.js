/* ============================================================
   SCENE LIBRARY: the North (Sheffield and Manchester): landmarks and town objects
   (docs/dev/SCENE_ENGINE.md, section 2). PURE: sceneObjDefine calls inside this IIFE and
   nothing else; every build runs lazily, once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint <id>; LOOK with: object sheet <id> --mode night.

   Landmarks (one real place each, never mirrored, a lit part for the night):
     landmark.sheffield-arts-tower-glass    the University's 1965 curtain-wall slab (v0 face-on, v1 three-quarter)
     landmark.sheffield-winter-garden-arches the laminated-larch glasshouse (v0 long side, v1 parabolic end)
     landmark.peace-gardens-fountains the jets in a curve and the stepped stone cascades (jets flicker, spray bobs)
     landmark.sheffield-town-hall-tower     the 1897 stone town hall, its corner tower and the figure on top (clock spins)
     landmark.park-hill-flats         the deck-access slab on its hill (v0 refurbished colour panels, v1 the brick infill)
     landmark.kelham-island           red-brick works, a square chimney and the goit with its weir
     landmark.manchester-town-hall-front    Waterhouse's Gothic front on Albert Square, its clock tower (clock spins)
     landmark.beetham-tower-blade           the slim glass tower, the cantilever at the middle and the lit blade
     landmark.castlefield-viaducts    castellated piers, cream lattice girders, the brick arches, the canal basin
   Town objects (kit and role tags, lit windows):
     building.mill-red-brick (4), building.warehouse-canal (3), building.media-block (4), building.stadium (4),
     building.terrace-northern (4), vehicle.supertram (2), vehicle.metrolink-m5000 (2)
   No lettering, no logos, no crests. Lit from the LEFT. Anchor: the middle of the frontage at the ground.
   Every object draws four seasons: verges and planters change colour and snow lies on roofs in winter.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1, rect = SD.rect, ell = SD.ell, poly = SD.poly;
  const NIGHT = { glow: { window: '#ffd98a', lamp: '#ffe6a8' }, on: 0.75 };
  const SNOW = '#eef2f6';
  /** The seasonal greens every object carries (verges, ivy, planters, street trees). */
  const GREEN = {
    veg: { spring: ['#6f9a4a', '#4f7a36', '#9cc06a'], summer: ['#4a7a34', '#365e28', '#74a04a'], autumn: ['#a07a36', '#7a5628', '#c89a48'], winter: ['#66705e', '#4e5648', '#848c7a'] },
    bloom: { spring: ['#e8d870'], summer: ['#c86aa0'], autumn: ['#c8642c'], winter: ['#8a8478'] },
  };
  const pal = (base, extra) => Object.assign({ base }, SD.seasons(Object.assign({}, GREEN, extra || {})));
  const define = def => SD.define(Object.assign({ night: NIGHT, seasonal: true, shapeBySeason: true }, def));
  const wash = (cx, cy, r, d, op, col) => ({ f: { rad: [[0, col || '@flood', op], [1, col || '@flood', 0]], cx, cy, r }, d });
  const snow = (season, d, op) => (season === 'winter' ? { f: SNOW, d, op: op || 0.95 } : null);
  /** A grass verge with low shrubs from x0 to x1 (seasonal). */
  function verge(b, r, x0, x1, h) {
    h = h || 5;
    b.push(['@veg.1', rect(x0, -h, x1 - x0, h)]);
    for (let x = x0 + 8; x < x1 - 8; x += 26 + r() * 30) { const w = 7 + r() * 9; b.push(['@veg.' + (r() < 0.5 ? 0 : 2), SD.blob(r, x, -h - w * 0.3, w, w * 0.6, 7, 0.3)]); }
  }
  /** Window rows: per row a glow shape split over n groups (a seeded share lit at dusk), plus a day reflection. */
  function winRows(b, r, x0, y0, cols, rows, w, h, gx, gy, n, opt) {
    opt = opt || {};
    for (let j = 0; j < rows; j++) {
      const g = Array.from({ length: n }, () => ''); let refl = '', frame = '';
      for (let i = 0; i < cols; i++) {
        const x = x0 + i * (w + gx), y = y0 + j * (h + gy);
        if (opt.skip && opt.skip(i, j)) continue;
        const d = opt.arch ? `M${f1(x)} ${f1(y + h)}V${f1(y + w * 0.5)}Q${f1(x + w / 2)} ${f1(y - w * (opt.arch === 'point' ? 0.55 : 0.15))} ${f1(x + w)} ${f1(y + w * 0.5)}V${f1(y + h)}z` : rect(x, y, w, h);
        g[Math.floor(r() * n) % n] += d;
        if (opt.frame) frame += rect(x - 1.2, y - (opt.arch ? w * 0.3 : 1.2), w + 2.4, h + (opt.arch ? w * 0.3 : 1.2) + 2.2);
        refl += rect(x + 0.6, y + 0.6, w * 0.38, h * 0.45);
      }
      if (frame) b.push({ f: opt.frame, d: frame });
      for (const d of g) if (d) b.push({ f: opt.glass || '@glass.0', d, glow: 'window' });
      if (refl) b.push({ f: '@glass.2', d: refl, op: 0.3, detail: true });
    }
  }
  const courses = (x0, y0, w, h, step) => Array.from({ length: Math.max(0, Math.floor(h / step)) }, (_, i) => `M${f1(x0)} ${f1(y0 + (i + 1) * step)}h${f1(w)}`).join('');
  const glint = (x, y, h) => ({ f: '#ffffff', d: `M${f1(x)} ${f1(y)}l${f1(h * 0.18)} 0l${f1(-h * 0.5)} ${f1(h)}l${f1(-h * 0.18)} 0z`, op: 0.35 });

  /* =======================================================================================
     landmark.sheffield-arts-tower: a 20-storey curtain-wall slab on a recessed glazed
     ground floor, thin dark spandrels, aluminium mullions, a solid plant-room crown.
     ======================================================================================= */
  define({
    id: 'landmark.sheffield-arts-tower-glass', category: 'landmark', size: [300, 420], variants: 2, flippable: false,
    palette: pal({ glass: ['#3c4c58', '#5a7080', '#a8bccb'], frame: ['#2c3238', '#9aa2a8'], stone: ['#c8c4b8', '#9a968c'], dark: ['#1e2428'], flood: '#ffe6b0' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.2, 1], period: 5 } },
    shadow: { rx: 120, ry: 12, h: 420 }, reflect: false,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'university', 'modernist', 'tower', 'kit:urban'],
    credit: 'native: the Arts Tower, University of Sheffield (stylised, no lettering)',
    build(v, r, ctx) {
      const b = [], W = 56, base = -26, fh = 19, n = 19, top = base - n * fh, side = v === 1 ? 46 : 0;
      verge(b, r, -150, 150 + side, 5);
      b.push(['@dark.0', rect(-W + 6, base, 2 * W - 12 + side, 22)]);
      for (let i = 0; i < 8; i++) b.push(['@frame.1', rect(-W + 4 + i * (2 * W - 8) / 7 - 2, base, 4, 22)]);
      b.push({ f: '@glass.2', d: rect(-W + 10, base + 4, 2 * W - 20, 14), op: 0.35, glow: 'lamp' });
      if (side) {
        b.push(['@glass.0', poly([[W, top], [W + side, top + 6], [W + side, base + 2], [W, base]])]);
        for (let i = 0; i <= n; i++) { const y = base - i * fh; b.push({ s: '@frame.0', w: 2.6, d: `M${W} ${y}L${W + side} ${f1(y + 6 * (1 - (y - top) / (base - top)) + 2 * ((y - top) / (base - top)))}` }); }
        b.push({ f: '@stone.1', d: poly([[W + 1, top - 26], [W + side, top - 20], [W + side, top + 6], [W + 1, top]]) });
      }
      b.push({ f: { lin: [[0, '@glass.2'], [0.5, '@glass.1'], [1, '@glass.0']], x1: -W, y1: top, x2: W, y2: base }, d: rect(-W, top, 2 * W, base - top) });
      for (let i = 0; i < n; i++) {
        const y = base - (i + 1) * fh;
        b.push(['@frame.0', rect(-W, y + fh - 5, 2 * W, 5)]);
      }
      winRows(b, r, -W + 0.8, base - n * fh + 1, 16, n, 5.4, fh - 7, 1.6, 7, 2, { glass: '@glass.0' });
      b.push({ s: '@frame.1', w: 0.6, op: 0.7, detail: true, d: Array.from({ length: 17 }, (_, i) => `M${f1(-W + i * 7)} ${top}V${base}`).join('') });
      b.push({ f: '@dark.0', d: rect(W - 16, top, 16, base - top), op: 0.2 });
      b.push(['@stone.0', rect(-W - 1, top - 26, 2 * W + 2, 26)], ['@stone.1', rect(-W - 1, top - 3, 2 * W + 2, 3)], ['@frame.0', rect(-W - 2, top - 28, 2 * W + 4, 3)]);
      b.push({ s: '@stone.1', w: 0.8, op: 0.6, detail: true, d: Array.from({ length: 22 }, (_, i) => `M${f1(-W + 3 + i * 5)} ${top - 22}v16`).join('') });
      b.push(snow(ctx.season, rect(-W - 2, top - 31, 2 * W + 4 + side, 3)));
      const glintP = [glint(-30, top + 40, 60), glint(10, top + 150, 50), glint(-20, top + 260, 40)];
      const lit = [wash(0, base, 110, rect(-W - 30, base - 60, 2 * W + 60 + side, 62), 0.4), wash(0, top - 14, 70, rect(-W, top - 28, 2 * W, 28), 0.25)];
      return { body: b, glint: glintP, lit };
    },
  });

  /* =======================================================================================
     landmark.sheffield-winter-garden: a long glasshouse on laminated larch arches; tall
     plants inside; lit warm at night.
     ======================================================================================= */
  define({
    id: 'landmark.sheffield-winter-garden-arches', category: 'landmark', size: [420, 150], variants: 2, flippable: false,
    palette: pal({ glass: ['#6a8494', '#9fb6c4', '#d8e6ee'], timber: ['#b98a52', '#8a6038', '#d8b07a'], stone: ['#c8c0b0', '#9a9284'], plant: ['#2e6a3a', '#4a8a46', '#1e4a2a', '#7aa85a'], flood: '#ffd890' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.15, 1], period: 6 } },
    shadow: { rx: 200, ry: 10, h: 130 },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'glasshouse', 'garden', 'kit:urban'],
    credit: 'native: the Sheffield Winter Garden (stylised)',
    build(v, r, ctx) {
      const b = [], lit = [], g = [];
      if (v === 0) {
        const L = 190, H = x => 62 + 66 * Math.pow(Math.cos(Math.PI * x / (2 * L + 10)), 2);
        const prof = []; for (let x = -L; x <= L; x += 10) prof.push([x, -H(x)]);
        const out = 'M' + -L + ' 0' + prof.map(p => 'L' + f1(p[0]) + ' ' + f1(p[1])).join('') + 'L' + L + ' 0z';
        // plants inside (tropical: green all year)
        for (let i = 0; i < 16; i++) { const x = -L + 18 + i * 23 + r() * 8, hh = 30 + r() * 60; b.push(['@plant.' + (i % 4), SD.blob(r, x, -hh * 0.6, 12 + r() * 10, hh * 0.5, 8, 0.4)]); }
        b.push({ f: '@plant.2', d: 'M-30 0V-80q4-14 8 0V0zM60 0V-70q4-12 8 0V0z' });
        b.push({ f: { lin: [[0, '@glass.2', 0.7], [1, '@glass.0', 0.45]], x1: 0, y1: -130, x2: 0, y2: 0 }, d: out });
        // bays between ribs (lit at dusk)
        const ribs = []; for (let x = -L; x <= L + 0.1; x += 380 / 17) ribs.push(x);
        for (let i = 0; i < ribs.length - 1; i++) { const a = ribs[i], c = ribs[i + 1]; b.push({ f: '@glass.1', d: poly([[a, 0], [a, -H(a)], [c, -H(c)], [c, 0]]), op: 0.2, glow: 'window' }); }
        for (const x of ribs) b.push({ s: '@timber.0', w: 2.6, d: `M${f1(x)} 0V${f1(-H(x))}` });
        for (let k = 1; k <= 5; k++) { const y = -k * 22; let d = ''; let on = false; for (let x = -L; x <= L; x += 10) { if (H(x) > -y) { d += (on ? 'L' : 'M') + f1(x) + ' ' + y; on = true; } else on = false; } b.push({ s: '@timber.1', w: 0.9, op: 0.8, d }); }
        b.push({ s: '@timber.2', w: 3, d: 'M' + prof.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') });
        for (let k = 1; k <= 3; k++) b.push({ s: '@timber.1', w: 1.2, op: 0.7, d: 'M' + prof.map(p => f1(p[0] * (1 - k * 0.05)) + ' ' + f1(p[1] + k * 6)).join('L') });
        b.push(snow(ctx.season, 'M' + prof.map(p => f1(p[0]) + ' ' + f1(p[1] - 2)).join('L') + 'L' + prof.slice().reverse().map(p => f1(p[0]) + ' ' + f1(p[1] + 2)).join('L') + 'z', 0.85));
        b.push(['@stone.0', rect(-L - 6, -6, 2 * L + 12, 6)], ['@stone.1', rect(-24, -34, 48, 28)], { f: '@glass.2', d: rect(-20, -30, 18, 24), glow: 'lamp' }, { f: '@glass.2', d: rect(2, -30, 18, 24), glow: 'lamp' });
        verge(b, r, -L - 20, -30, 4); verge(b, r, 30, L + 20, 4);
        g.push(glint(-120, -100, 60), glint(20, -118, 70), glint(130, -90, 50));
        lit.push(wash(0, -50, 230, out, 0.45));
      } else {
        const Wd = 110, Ht = 132, P = x => -Ht * (1 - Math.pow(x / Wd, 2));
        const arc = (k) => { const pts = []; for (let x = -Wd * k; x <= Wd * k + 0.1; x += Wd * k / 10) pts.push([x, P(x / k) * k + 0]); return pts; };
        const outer = arc(1), outD = 'M' + outer.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
        for (let i = 0; i < 10; i++) { const x = -90 + i * 20 + r() * 6, hh = 30 + r() * 60; b.push(['@plant.' + (i % 4), SD.blob(r, x, -hh * 0.6, 14, hh * 0.5, 8, 0.4)]); }
        b.push({ f: { lin: [[0, '@glass.2', 0.7], [1, '@glass.0', 0.45]], x1: 0, y1: -Ht, x2: 0, y2: 0 }, d: outD });
        for (let x = -Wd; x < Wd; x += 14) { const a = x, c = x + 14; b.push({ f: '@glass.1', d: poly([[a, 0], [a, P(a)], [c, P(c)], [c, 0]]), op: 0.2, glow: 'window' }); b.push({ s: '@timber.1', w: 1.1, d: `M${f1(a)} 0V${f1(P(a))}` }); }
        for (let k = 1; k <= 6; k++) { const y = -k * 20; const xx = Wd * Math.sqrt(Math.max(0, 1 + y / Ht)); b.push({ s: '@timber.1', w: 0.9, op: 0.8, d: `M${f1(-xx)} ${y}H${f1(xx)}` }); }
        for (const k of [1, 0.9, 0.8]) b.push({ s: k === 1 ? '@timber.0' : '@timber.2', w: k === 1 ? 5 : 2.4, op: k === 1 ? 1 : 0.7, d: 'M' + arc(k).map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') });
        b.push(snow(ctx.season, 'M' + outer.slice(3, 18).map(p => f1(p[0]) + ' ' + f1(p[1] - 2)).join('L') + 'L' + outer.slice(3, 18).reverse().map(p => f1(p[0]) + ' ' + f1(p[1] + 3)).join('L') + 'z', 0.85));
        b.push(['@stone.0', rect(-Wd - 6, -6, 2 * Wd + 12, 6)], ['@stone.1', rect(-20, -40, 40, 34)], { f: '@glass.2', d: rect(-16, -36, 32, 30), glow: 'lamp' });
        verge(b, r, -Wd - 30, -24, 4); verge(b, r, 24, Wd + 30, 4);
        g.push(glint(-50, -90, 50), glint(40, -70, 40));
        lit.push(wash(0, -50, 150, outD, 0.5));
      }
      return { body: b, glint: g, lit };
    },
  });

  /* =======================================================================================
     landmark.peace-gardens-fountains: jets rising from the paving in a long curve, stone
     cascades stepping down at the sides, lawns; the jets flicker and their spray bobs.
     ======================================================================================= */
  define({
    id: 'landmark.peace-gardens-fountains', category: 'landmark', size: [660, 120], variants: 2, flippable: false,
    palette: pal({ pave: ['#cfc4b0', '#b0a690', '#e2d8c4'], stone: ['#c8b890', '#9a8a68', '#e0d2ae'], water: ['#7aa8c4', '#c8e2f0', '#f4fbff'], lamp: ['#3a3a38'], flood: '#cfe8ff' }),
    parts: ['body', 'jets', 'spray', 'lit'], anim: { flicker: { part: 'jets', op: [0.6, 1], period: 1.7 }, bob: { part: 'spray', dy: 3, period: 1.3 } },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'fountain', 'square', 'water', 'kit:urban'],
    credit: 'native: the Peace Gardens fountains and cascades, Sheffield (stylised)',
    build(v, r, ctx) {
      const b = [], jets = [], spray = [], lit = [];
      b.push(['@pave.0', rect(-330, -26, 660, 26)], ['@pave.1', rect(-330, -4, 660, 4)]);
      b.push({ s: '@pave.1', w: 0.6, op: 0.6, detail: true, d: courses(-330, -26, 660, 24, 6) + Array.from({ length: 33 }, (_, i) => `M${-330 + i * 20} -26v22`).join('') });
      // lawns either side with their stone edging
      for (const s of [-1, 1]) { const x0 = s < 0 ? -330 : 230; b.push(['@veg.1', `M${x0} -26C${x0 + 20} -34 ${x0 + 80} -34 ${x0 + 100} -26z`], ['@veg.0', rect(x0, -26, 100, 6)], ['@stone.1', rect(x0, -21, 100, 2)]); }
      // the cascades: stepped stone channels, water sheeting over each lip (v1: from the other side, shallower)
      for (const s of [-1, 1]) for (let k = 0; k < 5; k++) {
        const x = s * (175 + k * 11), y = -26 - (4 - k) * 5 - 6, w = 11;
        b.push(['@stone.' + (k % 2 ? 0 : 2), rect(x - w / 2, y, w, -y - 20)], ['@stone.1', rect(x - w / 2, y, w, 2)]);
        jets.push({ f: { lin: [[0, '@water.2', 0.9], [1, '@water.0', 0.6]], x1: 0, y1: y, x2: 0, y2: y + 6 }, d: rect(x - w / 2 + 1, y + 1, w - 2, 5) });
      }
      // the jets in a long, shallow curve (heights vary; v1 low evening setting)
      const N = 30;
      for (let i = 0; i < N; i++) {
        const a = Math.PI * (0.08 + 0.84 * i / (N - 1)), x = -150 * Math.cos(a), y0 = -26 + 10 - 12 * Math.sin(a) + 2;
        const hh = (v === 1 ? 28 : 48) * (0.75 + 0.35 * Math.sin(i * 1.7) * Math.sin(i * 0.6) + r() * 0.2);
        b.push({ f: '@stone.1', d: ell(x, y0, 2.6, 0.9), op: 0.8 });
        jets.push({ f: { lin: [[0, '@water.2', 0.95], [1, '@water.0', 0.5]], x1: 0, y1: y0 - hh, x2: 0, y2: y0 }, d: `M${f1(x - 1.3)} ${f1(y0)}Q${f1(x - 0.7)} ${f1(y0 - hh * 0.6)} ${f1(x)} ${f1(y0 - hh)}Q${f1(x + 0.7)} ${f1(y0 - hh * 0.6)} ${f1(x + 1.3)} ${f1(y0)}z` });
        spray.push({ f: '@water.1', d: SD.blob(r, x, y0 - hh, 3.4, 2.4, 6, 0.5), op: 0.6 });
        b.push({ f: '@water.0', d: ell(x, y0, 4, 1), op: 0.5, detail: true });
        lit.push(wash(x, y0 - hh * 0.4, hh * 0.6, rect(x - 6, y0 - hh - 4, 12, hh + 6), 0.35, '@flood'));
      }
      // the wet sheen on the paving
      b.push({ f: '@water.0', d: ell(0, -14, 160, 7), op: 0.25 });
      // low bollard lights round the edge
      for (let i = 0; i < 8; i++) { const x = -300 + i * 86; b.push(['@lamp.0', rect(x - 2, -18, 4, 14)], { f: '@water.2', d: rect(x - 1.5, -17, 3, 3), glow: 'lamp' }); }
      for (const x of [-260, 260]) b.push(snow(ctx.season, `M${x - 70} -26C${x - 50} -33 ${x + 10} -34 ${x + 30} -26z`));
      return { body: b, jets, spray, lit };
    },
  });

  /* =======================================================================================
     landmark.sheffield-town-hall: a long stone front of two tall storeys under a slate roof
     with gables and dormers; the corner tower with its clock, an open belfry, a cupola and
     a small bronze figure on top. The clock hands turn.
     ======================================================================================= */
  define({
    id: 'landmark.sheffield-town-hall-tower', category: 'landmark', size: [470, 470], variants: 1, flippable: false,
    palette: pal({ stone: ['#d4c29a', '#b29e74', '#e8dab8', '#8a7a58'], roof: ['#56606a', '#3e464e', '#76808a'], glass: ['#3a4652', '#6a7c8c', '#c8d6e0'], bronze: ['#5a5a3e', '#7a7a54'], clock: ['#f0ead8', '#2a2a2a'], door: ['#3a2a20'], flood: '#ffe4b0' }),
    parts: ['body', 'hands', 'lit'], anim: { spin: { part: 'hands', pivot: [150, -330], period: 60 } },
    shadow: { rx: 230, ry: 12, h: 300 },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'civic', 'victorian', 'clock-tower', 'kit:urban'],
    credit: 'native: Sheffield Town Hall (stylised; no lettering or arms)',
    build(v, r, ctx) {
      const b = [], X0 = -270, X1 = 122, H = 124;
      verge(b, r, X0 - 10, X1, 4);
      // main block, rustication, string courses
      b.push(['@stone.0', rect(X0, -H, X1 - X0, H)], ['@stone.1', rect(X0, -40, X1 - X0, 40)]);
      b.push({ s: '@stone.3', w: 0.6, op: 0.45, detail: true, d: courses(X0, -40, X1 - X0, 40, 6) });
      b.push(['@stone.2', rect(X0, -44, X1 - X0, 4)], ['@stone.2', rect(X0, -H - 4, X1 - X0, 6)], ['@stone.1', rect(X0, -H + 2, X1 - X0, 2)]);
      // windows, two floors, arched heads
      winRows(b, r, X0 + 12, -96, 13, 1, 14, 40, 16, 0, 2, { arch: 'round', frame: '@stone.2' });
      winRows(b, r, X0 + 12, -34, 13, 1, 14, 26, 16, 0, 2, { frame: '@stone.2' });
      for (let i = 0; i < 13; i++) { const x = X0 + 19 + i * 30; b.push({ s: '@stone.2', w: 1, d: `M${x} -96V-56M${x} -34V-8`, detail: true }); }
      // pilasters
      for (let i = 0; i <= 13; i++) b.push(['@stone.2', rect(X0 + 2 + i * 30, -H, 4, H - 44)]);
      // balustrade and finials
      b.push(['@stone.2', rect(X0, -H - 14, X1 - X0, 3)], { s: '@stone.1', w: 1.4, d: Array.from({ length: 40 }, (_, i) => `M${X0 + 5 + i * 10} -${H + 11}v8`).join('') });
      for (let i = 0; i <= 8; i++) b.push(['@stone.2', `M${X0 + i * 49} -${H + 4}v-14l2.5-6 2.5 6v14z`]);
      // the slate roof, dormers, gables
      b.push(['@roof.0', poly([[X0 + 6, -H - 14], [X0 + 30, -H - 52], [X1 - 30, -H - 52], [X1 - 6, -H - 14]])], ['@roof.1', poly([[X1 - 70, -H - 52], [X1 - 30, -H - 52], [X1 - 6, -H - 14], [X1 - 50, -H - 14]]), 0.6]);
      b.push({ s: '@roof.2', w: 0.6, op: 0.5, detail: true, d: courses(X0 + 20, -H - 52, X1 - X0 - 40, 36, 5) });
      for (const gx of [-232, -110, 20]) {
        b.push(['@stone.0', `M${gx - 26} -${H + 4}V-${H + 40}L${gx - 18} -${H + 48}L${gx} -${H + 74}L${gx + 18} -${H + 48}L${gx + 26} -${H + 40}V-${H + 4}z`]);
        b.push(['@stone.2', `M${gx - 28} -${H + 40}L${gx} -${H + 78}L${gx + 28} -${H + 40}L${gx + 25} -${H + 40}L${gx} -${H + 73}L${gx - 25} -${H + 40}z`]);
        b.push({ f: '@glass.0', d: `M${gx - 10} -${H + 10}V-${H + 34}Q${gx} -${H + 46} ${gx + 10} -${H + 34}V-${H + 10}z`, glow: 'window' }, { s: '@stone.2', w: 1, d: `M${gx} -${H + 10}V-${H + 40}` });
        b.push(['@stone.2', `M${gx - 1.5} -${H + 74}v-10h3v10z`]);
        b.push(snow(ctx.season, `M${gx - 28} -${H + 40}L${gx} -${H + 78}L${gx + 28} -${H + 40}L${gx + 22} -${H + 40}L${gx} -${H + 70}L${gx - 22} -${H + 40}z`, 0.8));
      }
      for (const dx of [-172, -50, 80]) b.push(['@roof.2', `M${dx - 7} -${H + 24}v-12l7-7 7 7v12z`], { f: '@glass.0', d: rect(dx - 4, -H - 34, 8, 9), glow: 'window' });
      b.push(snow(ctx.season, poly([[X0 + 8, -H - 16], [X0 + 30, -H - 52], [X1 - 30, -H - 52], [X1 - 8, -H - 16], [X1 - 18, -H - 16], [X1 - 34, -H - 46], [X0 + 34, -H - 46], [X0 + 18, -H - 16]]), 0.7));
      // the entrance porch under the tower
      const TX = 150, TW = 30;
      b.push(['@stone.0', rect(TX - TW, -300, 2 * TW, 300)], ['@stone.1', rect(TX + TW - 12, -300, 12, 300), 0.7]);
      b.push({ s: '@stone.3', w: 0.6, op: 0.4, detail: true, d: courses(TX - TW, -300, 2 * TW, 300, 8) });
      b.push(['@stone.2', rect(TX - TW - 3, -300, 6, 300)], ['@stone.2', rect(TX + TW - 3, -300, 6, 300)]);
      b.push(['@stone.2', `M${TX - 20} 0V-44Q${TX} -70 ${TX + 20} -44V0z`], ['@door', `M${TX - 14} 0V-42Q${TX} -60 ${TX + 14} -42V0z`]);
      for (const y of [-120, -190, -250]) b.push({ f: '@glass.0', d: `M${TX - 8} ${y + 34}V${y + 6}Q${TX} ${y - 4} ${TX + 8} ${y + 6}V${y + 34}z`, glow: 'window' }, ['@stone.2', rect(TX - TW, y + 38, 2 * TW, 3)]);
      // the clock stage
      b.push(['@stone.2', rect(TX - TW - 4, -304, 2 * TW + 8, 6)], ['@stone.0', rect(TX - TW + 2, -358, 2 * TW - 4, 54)]);
      b.push(['@stone.2', ell(TX, -330, 18, 18)], { f: '@clock.0', d: ell(TX, -330, 15, 15), glow: 'lamp' });
      b.push({ s: '@clock.1', w: 0.8, d: Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M${f1(TX + Math.cos(a) * 12)} ${f1(-330 + Math.sin(a) * 12)}L${f1(TX + Math.cos(a) * 14)} ${f1(-330 + Math.sin(a) * 14)}`; }).join('') });
      // the open belfry: columns and arches
      b.push(['@stone.2', rect(TX - TW - 2, -364, 2 * TW + 4, 6)], ['@roof.1', rect(TX - TW + 4, -398, 2 * TW - 8, 34)]);
      for (let i = 0; i < 4; i++) b.push(['@stone.0', rect(TX - TW + 2 + i * 18, -398, 5, 34)]);
      b.push(['@stone.2', rect(TX - TW - 2, -404, 2 * TW + 4, 6)]);
      // the cupola, lantern and the figure on top
      b.push(['@roof.0', `M${TX - 26} -404Q${TX - 24} -432 ${TX} -446Q${TX + 24} -432 ${TX + 26} -404z`], ['@roof.1', `M${TX} -446Q${TX + 24} -432 ${TX + 26} -404H${TX + 6}z`, 0.6]);
      b.push({ s: '@roof.2', w: 0.7, op: 0.6, d: `M${TX - 12} -404Q${TX - 10} -432 ${TX} -446M${TX + 12} -404Q${TX + 10} -432 ${TX} -446`, detail: true });
      b.push(snow(ctx.season, `M${TX - 22} -418Q${TX - 14} -436 ${TX} -446Q${TX + 14} -436 ${TX + 22} -418Q${TX} -428 ${TX - 22} -418z`, 0.85));
      b.push(['@stone.2', rect(TX - 5, -456, 10, 10)]);
      b.push(['@bronze.0', `M${TX - 2.4} -456l-0.6-9 -1.5-6 1-5h6l1 5-1.5 6-0.6 9z`], ['@bronze.0', ell(TX, -479, 2.6, 3)], { s: '@bronze.1', w: 1.6, d: `M${TX + 2} -474l5-8` }, { s: '@bronze.0', w: 1.2, d: `M${TX - 2} -474l-4 6` });
      const hands = [{ s: '@clock.1', w: 1.4, d: `M${TX} -330V-342` }, { s: '@clock.1', w: 1.8, d: `M${TX} -330h7` }];
      const lit = [wash(-80, -60, 260, rect(X0, -H - 80, X1 - X0, H + 80), 0.3), wash(TX, -260, 200, `M${TX - 34} 0V-404L${TX} -480L${TX + 34} -404V0z`, 0.4)];
      return { body: b, hands, lit };
    },
  });

  /* =======================================================================================
     landmark.park-hill-flats: the long concrete-frame slab on its hill: a level roofline over
     falling ground, deck-access "streets" every third floor, and infill panels: v0 the
     refurbished bright anodised colours; v1 the original brick graded dark to light.
     ======================================================================================= */
  define({
    id: 'landmark.park-hill-flats', category: 'landmark', size: [900, 300], variants: 2, flippable: false,
    palette: pal({ concrete: ['#c8c6be', '#a09e96', '#e0ded6', '#7a7870'], panel: ['#e0482c', '#f08a2c', '#f4c43a', '#9ac43c'], brick: ['#5e3226', '#8a4a32', '#b07a52', '#d8b88a'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], ground: ['#6a6a5a'], flood: '#fff0c8' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.2, 1], period: 7 } },
    shadow: { rx: 440, ry: 12, h: 280 },
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'brutalist', 'housing', 'kit:urban'],
    credit: 'native: Park Hill, Sheffield (stylised)',
    build(v, r, ctx) {
      const b = [], X0 = -450, X1 = 450, ROOF = -290, fh = 17, bay = 18;
      const gy = x => -((x - X0) / (X1 - X0)) * 140;   // the hill rises to the right; the roofline stays level
      b.push(['@veg.1', `M${X0 - 10} 0L${X0 - 10} ${f1(gy(X0))}L${X1 + 10} ${f1(gy(X1) - 4)}L${X1 + 10} 0z`]);
      for (let x = X0; x < X1; x += 40 + r() * 30) b.push(['@veg.' + (r() < 0.5 ? 0 : 2), SD.blob(r, x, gy(x) + 4, 14 + r() * 10, 9, 7, 0.3)]);
      const nf = Math.floor((-ROOF) / fh);
      b.push(['@concrete.1', poly([[X0, ROOF], [X1, ROOF], [X1, gy(X1)], [X0, gy(X0)]])]);
      // per floor: the infill panels (by colour group) and the window band (glow)
      for (let j = 0; j < nf; j++) {
        const y = ROOF + j * fh, groups = ['', '', '', ''], win = ['', ''];
        for (let x = X0; x < X1; x += bay) {
          if (y + fh > gy(x + bay) - 2) continue;
          const k = v === 0 ? Math.min(3, Math.max(0, Math.floor(((x - X0) / (X1 - X0)) * 4 + (r() - 0.5) * 0.6))) : Math.min(3, Math.floor(j / nf * 4));
          groups[k] += rect(x + 2, y + 9, bay - 4, fh - 11);
          win[r() < 0.5 ? 0 : 1] += rect(x + 2, y + 2, bay - 4, 6);
        }
        groups.forEach((d, k) => d && b.push({ f: (v === 0 ? '@panel.' : '@brick.') + k, d }));
        win.forEach(d => d && b.push({ f: '@glass.0', d, glow: 'window' }));
      }
      // the frame: columns and floor slabs, the deck-access streets every third floor (deeper shadow)
      b.push({ s: '@concrete.2', w: 2.2, d: Array.from({ length: Math.floor((X1 - X0) / bay) + 1 }, (_, i) => { const x = X0 + i * bay; return `M${x} ${ROOF}V${f1(gy(x))}`; }).join('') });
      for (let j = 0; j <= nf; j++) {
        const y = ROOF + j * fh; let xe = X1; while (xe > X0 && gy(xe) < y) xe -= bay;
        if (xe <= X0) continue;
        const deck = j % 3 === 2;
        b.push({ f: deck ? '@concrete.3' : '@concrete.2', d: rect(X0, y - (deck ? 3 : 1.5), xe - X0, deck ? 5 : 2.4) });
        if (deck) b.push({ s: '@concrete.2', w: 0.8, op: 0.8, d: `M${X0} ${y - 5}H${xe}`, detail: true });
      }
      b.push(['@concrete.0', rect(X0 - 2, ROOF - 6, X1 - X0 + 4, 7)], { f: '@concrete.3', d: rect(X1 - 30, ROOF, 30, gy(X1) - ROOF), op: 0.25 });
      b.push(snow(ctx.season, rect(X0 - 2, ROOF - 9, X1 - X0 + 4, 3)));
      const g = [glint(-300, ROOF + 40, 40), glint(-60, ROOF + 60, 50), glint(200, ROOF + 30, 40)];
      const lit = [];
      for (let j = 2; j < nf; j += 3) { const y = ROOF + j * fh; lit.push({ f: '@flood', d: rect(X0, y - 2.5, Math.max(0, (X1 - X0) * Math.min(1, (y - ROOF) / 300 + 0.25)), 2), op: 0.55 }); }
      return { body: b, glint: g, lit };
    },
  });

  /* =======================================================================================
     landmark.kelham-island: a long two-storey works with arched windows, a three-storey
     block with loading doors, the square brick chimney, and the goit and weir in front.
     ======================================================================================= */
  define({
    id: 'landmark.kelham-island', category: 'landmark', size: [620, 340], variants: 2, flippable: false,
    palette: pal({ brick: ['#9a4a32', '#7a3624', '#b8664a', '#5e2a1c'], stone: ['#d0c4a8', '#a89a7c'], roof: ['#4e565e', '#3a4046', '#6a727a'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], water: ['#4a6a74', '#7a9aa4', '#d0e4ea'], door: ['#2e4a3a', '#3a2a22'], flood: '#ffd890' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.3, 1], period: 1.4 } },
    shadow: { rx: 300, ry: 12, h: 200 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/sheffield', 'uk', 'uk-yorkshire', 'sheffield', 'industrial', 'brick', 'river', 'kit:urban'],
    credit: 'native: Kelham Island, Sheffield (stylised industrial quarter)',
    build(v, r, ctx) {
      const b = [], m = v === 1 ? -1 : 1, X = x => x * m;
      // the goit, the weir and the river wall
      b.push(['@stone.1', rect(-310, -16, 620, 6)], ['@water.0', rect(-310, -10, 620, 10)], ['@water.1', rect(-310, -10, 620, 2), 0.7]);
      b.push({ f: '@water.2', d: poly([[X(-60), -10], [X(-40), -10], [X(-46), 0], [X(-66), 0]]), op: 0.7 });
      // the long works (arched windows)
      const a0 = -290, a1 = 0, aH = 92;
      b.push(['@brick.0', rect(Math.min(X(a0), X(a1)), -16 - aH, Math.abs(a1 - a0), aH)]);
      b.push({ s: '@brick.3', w: 0.5, op: 0.35, detail: true, d: courses(Math.min(X(a0), X(a1)), -16 - aH, Math.abs(a1 - a0), aH, 4) });
      b.push(['@roof.0', poly([[X(a0 - 4), -16 - aH], [X(a0 + 20), -16 - aH - 34], [X(a1 - 20), -16 - aH - 34], [X(a1 + 4), -16 - aH]])]);
      b.push(snow(ctx.season, poly([[X(a0), -16 - aH - 4], [X(a0 + 20), -16 - aH - 34], [X(a1 - 20), -16 - aH - 34], [X(a1), -16 - aH - 4], [X(a1 - 10), -16 - aH - 4], [X(a1 - 24), -16 - aH - 28], [X(a0 + 24), -16 - aH - 28], [X(a0 + 10), -16 - aH - 4]]), 0.75));
      const arow = (y, h) => { for (let i = 0; i < 9; i++) { const x = X(a0 + 14 + i * 31) - (m < 0 ? 16 : 0); b.push(['@brick.2', `M${f1(x - 2)} ${y + h}V${y + 6}Q${f1(x + 8)} ${y - 6} ${f1(x + 18)} ${y + 6}V${y + h}z`]); b.push({ f: '@glass.0', d: `M${f1(x)} ${y + h}V${y + 7}Q${f1(x + 8)} ${y - 2} ${f1(x + 16)} ${y + 7}V${y + h}z`, glow: 'window' }); b.push({ s: '@stone.0', w: 0.8, d: `M${f1(x + 8)} ${y + 2}V${y + h}M${f1(x)} ${y + h * 0.55}h16`, detail: true }); } };
      arow(-96, 30); arow(-56, 30);
      b.push(['@stone.0', rect(Math.min(X(a0), X(a1)), -62, Math.abs(a1 - a0), 3)]);
      // the three-storey block with loading doors and a hoist beam
      const c0 = 12, c1 = 220, cH = 150;
      b.push(['@brick.1', rect(Math.min(X(c0), X(c1)), -16 - cH, c1 - c0, cH)]);
      b.push({ s: '@brick.3', w: 0.5, op: 0.35, detail: true, d: courses(Math.min(X(c0), X(c1)), -16 - cH, c1 - c0, cH, 4) });
      b.push(['@roof.1', poly([[X(c0 - 4), -16 - cH], [X(c0 + 26), -16 - cH - 28], [X(c1 - 26), -16 - cH - 28], [X(c1 + 4), -16 - cH]])]);
      b.push(snow(ctx.season, poly([[X(c0 + 4), -18 - cH], [X(c0 + 26), -16 - cH - 28], [X(c1 - 26), -16 - cH - 28], [X(c1 - 4), -18 - cH], [X(c1 - 14), -18 - cH], [X(c1 - 30), -16 - cH - 22], [X(c0 + 30), -16 - cH - 22], [X(c0 + 14), -18 - cH]]), 0.75));
      for (let j = 0; j < 3; j++) winRows(b, r, Math.min(X(c0), X(c1)) + 12, -16 - cH + 14 + j * 46, 6, 1, 18, 26, 13, 0, 2, { arch: 'round', frame: '@stone.0' });
      const dx = Math.min(X(c0), X(c1)) + (c1 - c0) / 2 - 10;
      b.push({ s: '@roof.1', w: 2.4, d: `M${f1(dx + 10)} ${-16 - cH - 6}v-10h${f1(14 * m)}` });
      // the square chimney with its corbelled cap
      const kx = X(258), kw = 22;
      b.push(['@brick.1', poly([[kx - kw / 2 - 4, -16], [kx - kw / 2, -330], [kx + kw / 2, -330], [kx + kw / 2 + 4, -16]])], ['@brick.3', poly([[kx + 2, -16], [kx + 4, -330], [kx + kw / 2, -330], [kx + kw / 2 + 4, -16]]), 0.4]);
      b.push({ s: '@brick.3', w: 0.6, op: 0.4, detail: true, d: courses(kx - kw / 2 - 2, -330, kw + 4, 314, 5) });
      for (const y of [-330, -322, -100]) b.push(['@brick.2', rect(kx - kw / 2 - 3, y, kw + 6, 4)]);
      b.push(['@stone.0', rect(kx - kw / 2 - 4, -336, kw + 8, 6)]);
      b.push(snow(ctx.season, rect(kx - kw / 2 - 4, -339, kw + 8, 3)));
      verge(b, r, -310, -296, 4); verge(b, r, 224, 310, 4);
      const g = [{ f: '@water.2', d: ell(X(-120), -5, 22, 1.2), op: 0.6 }, { f: '@water.2', d: ell(X(60), -6, 30, 1.2), op: 0.6 }, { f: '@water.2', d: ell(X(-52), -2, 14, 2), op: 0.8 }];
      const lit = [wash(X(-140), -40, 180, rect(-300, -110, 300 + 230, 110), 0.25), { f: '@flood', d: Array.from({ length: 13 }, (_, i) => ell(X(-280 + i * 40), -110, 1.6, 1.6)).join(''), op: 0.9 }];
      return { body: b, glint: g, lit };
    },
  });

  /* =======================================================================================
     landmark.manchester-town-hall: Waterhouse's Gothic front: three storeys of pointed
     windows, a steep roof with pinnacles and gables, and the central clock tower and spire.
     ======================================================================================= */
  define({
    id: 'landmark.manchester-town-hall-front', category: 'landmark', size: [580, 540], variants: 1, flippable: false,
    palette: pal({ stone: ['#b4a684', '#8e8062', '#cfc2a2', '#6a5e46'], roof: ['#4a5258', '#363c42', '#66707a'], glass: ['#2e3842', '#5a6a78', '#c0ccd6'], clock: ['#e8e0c8', '#222222', '#c8a040'], door: ['#2e2620'], flood: '#ffe2a8' }),
    parts: ['body', 'hands', 'lit'], anim: { spin: { part: 'hands', pivot: [0, -352], period: 60 } },
    shadow: { rx: 280, ry: 12, h: 360 },
    tags: ['landmark', 'signature', 'place:uk/manchester', 'uk', 'uk-north-west', 'manchester', 'civic', 'gothic', 'clock-tower', 'kit:urban'],
    credit: 'native: Manchester Town Hall on Albert Square (stylised; no lettering or arms)',
    build(v, r, ctx) {
      const b = [], W = 280, H = 150;
      verge(b, r, -W - 10, W + 10, 4);
      b.push(['@stone.0', rect(-W, -H, 2 * W, H)], { s: '@stone.3', w: 0.5, op: 0.35, detail: true, d: courses(-W, -H, 2 * W, H, 6) });
      for (const y of [-54, -102, -H]) b.push(['@stone.2', rect(-W, y - 2, 2 * W, 4)]);
      for (let i = 0; i <= 12; i++) { const x = -W + i * (2 * W / 12); b.push(['@stone.1', rect(x - 3, -H, 6, H)]); }
      winRows(b, r, -W + 14, -44, 12, 1, 18, 34, 28.7, 0, 2, { arch: 'point', frame: '@stone.2' });
      winRows(b, r, -W + 14, -94, 12, 1, 18, 34, 28.7, 0, 2, { arch: 'point', frame: '@stone.2' });
      winRows(b, r, -W + 16, -140, 12, 1, 14, 28, 32.7, 0, 2, { arch: 'point', frame: '@stone.2' });
      for (let i = 0; i < 12; i++) { const x = -W + 23 + i * 46.7; b.push({ s: '@stone.2', w: 1, d: `M${f1(x)} -44V-10M${f1(x)} -94V-60`, detail: true }); }
      // steep roof, gables at both ends, pinnacles along the parapet, dormers
      b.push(['@roof.0', poly([[-W + 4, -H], [-W + 40, -H - 70], [W - 40, -H - 70], [W - 4, -H]])], ['@roof.1', poly([[W - 90, -H - 70], [W - 40, -H - 70], [W - 4, -H], [W - 60, -H]]), 0.6]);
      b.push({ s: '@roof.2', w: 0.6, op: 0.5, detail: true, d: courses(-W + 30, -H - 70, 2 * W - 60, 66, 6) });
      b.push(snow(ctx.season, poly([[-W + 8, -H - 2], [-W + 40, -H - 70], [W - 40, -H - 70], [W - 8, -H - 2], [W - 20, -H - 2], [W - 46, -H - 62], [-W + 46, -H - 62], [-W + 20, -H - 2]]), 0.7));
      for (const s of [-1, 1]) {
        const gx = s * (W - 30);
        b.push(['@stone.0', `M${gx - 30} -${H}V-${H + 30}L${gx} -${H + 92}L${gx + 30} -${H + 30}V-${H}z`], { f: '@glass.0', d: `M${gx - 12} -${H + 6}V-${H + 34}Q${gx} -${H + 58} ${gx + 12} -${H + 34}V-${H + 6}z`, glow: 'window' });
        b.push({ s: '@stone.2', w: 1, d: `M${gx} -${H + 6}V-${H + 50}M${gx - 12} -${H + 30}h24` }, ['@stone.2', `M${gx - 2} -${H + 92}v-14l2-6 2 6v14z`]);
      }
      for (let i = 0; i < 15; i++) { const x = -W + 10 + i * 40; b.push(['@stone.2', `M${x - 2} -${H}v-16l2-7 2 7v16z`]); }
      for (const dx of [-170, -110, 110, 170]) b.push(['@stone.0', `M${dx - 9} -${H + 10}v-22l9-12 9 12v22z`], { f: '@glass.0', d: `M${dx - 4} -${H + 12}v-14q4-6 8 0v14z`, glow: 'window' });
      // the central tower
      const TW = 36;
      b.push(['@stone.0', rect(-TW, -400, 2 * TW, 400)], ['@stone.1', rect(TW - 14, -400, 14, 400), 0.6]);
      b.push({ s: '@stone.3', w: 0.5, op: 0.4, detail: true, d: courses(-TW, -400, 2 * TW, 400, 8) });
      for (const x of [-TW - 4, TW - 4]) b.push(['@stone.2', rect(x, -410, 8, 410)]);
      b.push(['@stone.2', `M-26 0V-58Q0 -96 26 -58V0z`], ['@door', `M-20 0V-56Q0 -88 20 -56V0z`]);
      for (const y of [-180, -240, -290]) b.push({ f: '@glass.0', d: `M-10 ${y + 40}V${y + 10}Q0 ${y - 8} 10 ${y + 10}V${y + 40}z`, glow: 'window' }, { s: '@stone.2', w: 1, d: `M0 ${y + 40}V${y + 4}` }, ['@stone.2', rect(-TW, y + 44, 2 * TW, 3)]);
      // clock stage, belfry, pinnacled spire
      b.push(['@stone.2', rect(-TW - 6, -330, 2 * TW + 12, 4)], ['@stone.2', ell(0, -352, 22, 22)], { f: '@clock.0', d: ell(0, -352, 18, 18), glow: 'lamp' }, { s: '@clock.2', w: 1.2, d: ell(0, -352, 19.5, 19.5) });
      b.push({ s: '@clock.1', w: 0.8, d: Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `M${f1(Math.cos(a) * 14.5)} ${f1(-352 + Math.sin(a) * 14.5)}L${f1(Math.cos(a) * 17)} ${f1(-352 + Math.sin(a) * 17)}`; }).join('') });
      b.push(['@roof.1', rect(-TW + 4, -440, 2 * TW - 8, 40)]);
      for (let i = 0; i < 3; i++) b.push(['@stone.0', `M${-TW + 4 + i * 24} -400v-34q10-14 20 0v34h4v-40h-28v40z`]);
      b.push(['@stone.2', rect(-TW - 6, -446, 2 * TW + 12, 6)]);
      for (const x of [-TW - 2, TW + 2]) b.push(['@stone.2', `M${x - 5} -446v-24l5-18 5 18v24z`]);
      b.push(['@roof.0', `M-26 -446L0 -536L26 -446z`], ['@roof.1', `M0 -536L26 -446H6z`, 0.6], { s: '@roof.2', w: 0.7, op: 0.6, detail: true, d: courses(-20, -520, 40, 70, 7) });
      b.push(['@clock.2', `M-1 -536v-10h2v10z`], ['@clock.2', ell(0, -548, 2.5, 2.5)]);
      b.push(snow(ctx.season, `M-14 -488L0 -536L14 -488L8 -490L0 -520L-8 -490z`, 0.8));
      const hands = [{ s: '@clock.1', w: 1.5, d: 'M0 -352V-366' }, { s: '@clock.1', w: 2, d: 'M0 -352h9' }];
      const lit = [wash(0, -80, 320, rect(-W, -H - 70, 2 * W, H + 70), 0.3), wash(0, -380, 220, `M-40 -130V-446L0 -540L40 -446V-130z`, 0.42)];
      return { body: b, hands, lit };
    },
  });

  /* =======================================================================================
     landmark.beetham-tower: a slim glass tower; the upper floors cantilever out on one side
     from the middle; a glass blade above the roof, lit at night.
     ======================================================================================= */
  define({
    id: 'landmark.beetham-tower-blade', category: 'landmark', size: [140, 670], variants: 1, flippable: false,
    palette: pal({ glass: ['#41566a', '#6a8aa4', '#c4d8e6'], frame: ['#2a3440', '#8a98a4'], stone: ['#a8aca8'], flood: '#cfe6ff', led: '#bfe4ff' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.15, 1], period: 6 } },
    shadow: { rx: 60, ry: 8, h: 660 },
    tags: ['landmark', 'signature', 'place:uk/manchester', 'uk', 'uk-north-west', 'manchester', 'skyscraper', 'glass', 'kit:towers'],
    credit: 'native: Beetham Tower, Manchester (stylised)',
    build(v, r, ctx) {
      const b = [], L0 = -34, L1 = 34, U1 = 48, CANT = -300, TOP = -612, fh = 13;
      verge(b, r, -70, 70, 4);
      b.push(['@stone.0', rect(L0 - 6, -24, L1 - L0 + 12, 24)], { f: '@glass.2', d: rect(L0 - 2, -20, L1 - L0 + 4, 16), glow: 'lamp', op: 0.5 });
      b.push({ f: { lin: [[0, '@glass.2'], [0.45, '@glass.1'], [1, '@glass.0']], x1: L0, y1: 0, x2: L1, y2: 0 }, d: rect(L0, CANT, L1 - L0, -24 - CANT) });
      b.push({ f: { lin: [[0, '@glass.2'], [0.45, '@glass.1'], [1, '@glass.0']], x1: L0, y1: 0, x2: U1, y2: 0 }, d: rect(L0, TOP, U1 - L0, CANT - TOP) });
      b.push(['@frame.0', poly([[L1, CANT], [U1, CANT], [U1, CANT - 4], [L1, CANT - 10]])], { f: '@glass.0', d: poly([[L1, CANT - 2], [U1, CANT - 2], [U1, CANT - 8]]), op: 0.6 });
      for (let y = -24 - fh; y > TOP; y -= fh) { const w = (y < CANT ? U1 : L1) - L0; b.push({ f: '@frame.0', d: rect(L0, y + fh - 2, w, 2), op: 0.75 }); }
      winRows(b, r, L0 + 1, CANT + 1, 9, Math.floor((-24 - CANT) / fh), 6, fh - 4, 1.4, 4, 2);
      winRows(b, r, L0 + 1, TOP + 1, 11, Math.floor((CANT - TOP) / fh), 6, fh - 4, 1.4, 4, 2);
      b.push({ s: '@frame.1', w: 0.4, op: 0.5, detail: true, d: Array.from({ length: 12 }, (_, i) => `M${f1(L0 + i * 7.4)} ${TOP}V${i * 7.4 + L0 > L1 ? CANT : -24}`).join('') });
      b.push(['@frame.0', rect(L0 - 1, TOP - 4, U1 - L0 + 2, 4)]);
      b.push({ f: '@glass.2', d: poly([[U1 - 30, TOP - 4], [U1 - 24, TOP - 4], [U1 - 24, TOP - 54], [U1 - 28, TOP - 58]]), op: 0.85 }, ['@frame.0', rect(U1 - 31, TOP - 58, 1.4, 54)]);
      b.push(snow(ctx.season, rect(L0 - 1, TOP - 7, U1 - L0 + 2, 3)), snow(ctx.season, rect(L1, CANT - 13, U1 - L1, 3)));
      const g = [glint(-14, TOP + 60, 70), glint(4, TOP + 240, 60), glint(-10, CANT + 120, 60)];
      const lit = [{ f: '@led', d: poly([[U1 - 30, TOP - 4], [U1 - 24, TOP - 4], [U1 - 24, TOP - 54], [U1 - 28, TOP - 58]]), op: 0.95 }, wash(U1 - 26, TOP - 30, 50, rect(U1 - 70, TOP - 70, 90, 80), 0.4, '@led'), { f: '@flood', d: rect(L0, TOP + 2, U1 - L0, 6), op: 0.6 }, { f: '@flood', d: rect(L0, CANT - 12, U1 - L0, 4), op: 0.45 }];
      return { body: b, glint: g, lit };
    },
  });

  /* =======================================================================================
     landmark.castlefield-viaducts: castellated brick piers carrying cream lattice girders
     over the canal basin; a red-brick arched viaduct behind (v0). v1 a closer crop with a
     canal warehouse at the left.
     ======================================================================================= */
  define({
    id: 'landmark.castlefield-viaducts', category: 'landmark', size: [920, 280], variants: 2, flippable: false,
    palette: pal({ brick: ['#8e4432', '#6e3222', '#ae6248', '#4e2418'], iron: ['#e2dcc8', '#b8b09a', '#8a826e'], stone: ['#b4aa94', '#8a806c'], water: ['#3e5a5e', '#6a8a8c', '#c8dcdc'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], lamp: ['#2a2a2a'], flood: '#ffd890' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.25, 1], period: 2.2 } },
    shadow: { rx: 440, ry: 10, h: 220 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/manchester', 'uk', 'uk-north-west', 'manchester', 'castlefield', 'viaduct', 'canal', 'kit:urban', 'kit:water'],
    credit: 'native: the Castlefield viaducts and canal basin, Manchester (stylised)',
    build(v, r, ctx) {
      const b = [], g = [], lit = [], X0 = v === 0 ? -460 : -300, X1 = v === 0 ? 460 : 300;
      // the brick arched viaduct behind
      if (v === 0) {
        const y = -170;
        b.push(['@brick.1', rect(X0, y, X1 - X0, -y - 20)]);
        let arches = '';
        for (let x = X0 + 10; x < X1 - 30; x += 64) arches += `M${x} -20V${y + 60}Q${x + 26} ${y + 24} ${x + 52} ${y + 60}V-20z`;
        b.push({ f: '@brick.3', d: arches, op: 0.85 }, ['@brick.2', rect(X0, y - 8, X1 - X0, 8)], { s: '@brick.3', w: 0.5, op: 0.35, detail: true, d: courses(X0, y, X1 - X0, 120, 5) });
        b.push(snow(ctx.season, rect(X0, y - 11, X1 - X0, 3)));
      }
      // the towpath and the canal basin
      b.push(['@stone.0', rect(X0, -30, X1 - X0, 10)], ['@stone.1', rect(X0, -21, X1 - X0, 2)], ['@water.0', rect(X0, -20, X1 - X0, 20)], ['@water.1', rect(X0, -20, X1 - X0, 3), 0.6]);
      // the castellated piers and the lattice spans
      const piers = v === 0 ? [-380, -130, 120, 370] : [-220, 40, 260];
      const deck = -128;
      for (let i = 0; i < piers.length - 1; i++) {
        const a = piers[i] + 22, c = piers[i + 1] - 22;
        b.push(['@iron.1', rect(a, deck - 26, c - a, 26)], ['@iron.0', rect(a, deck - 26, c - a, 4)], ['@iron.0', rect(a, deck - 4, c - a, 4)]);
        let lat = ''; for (let x = a; x < c - 12; x += 13) lat += `M${f1(x)} ${deck - 22}L${f1(x + 13)} ${deck - 4}M${f1(x + 13)} ${deck - 22}L${f1(x)} ${deck - 4}`;
        b.push({ s: '@iron.0', w: 1.6, d: lat }, { s: '@iron.2', w: 0.6, op: 0.6, d: `M${a} ${deck - 13}H${c}`, detail: true });
        b.push(snow(ctx.season, rect(a, deck - 29, c - a, 3)));
      }
      for (const px of piers) {
        b.push(['@brick.0', rect(px - 22, deck - 4, 44, -deck - 26)], ['@brick.3', rect(px + 8, deck - 4, 14, -deck - 26), 0.35]);
        b.push({ s: '@brick.3', w: 0.5, op: 0.35, detail: true, d: courses(px - 22, deck - 4, 44, -deck - 26, 5) });
        // two round turrets with battlements and arrow slits
        for (const s of [-1, 1]) {
          const tx = px + s * 18;
          b.push(['@brick.2', rect(tx - 8, deck - 60, 16, 56)], ['@brick.1', rect(tx + (s > 0 ? 0 : -8), deck - 60, 8, 56), 0.5]);
          b.push(['@brick.2', `M${tx - 10} ${deck - 60}v-8h4v4h4v-4h4v4h4v-4h4v8z`]);
          b.push({ f: '@glass.0', d: rect(tx - 1.2, deck - 48, 2.4, 10), glow: 'window' }, { f: '@glass.0', d: rect(tx - 1.2, deck - 28, 2.4, 10), glow: 'window' });
          b.push(snow(ctx.season, rect(tx - 10, deck - 71, 20, 3)));
        }
        b.push({ f: '@brick.3', d: `M${px - 9} ${deck - 30}V${deck - 44}q9-10 18 0V${deck - 30}z`, op: 0.8 });
        b.push(['@veg.1', SD.blob(r, px - 14, -34, 16, 12, 8, 0.4)], ['@veg.0', SD.blob(r, px + 12, -40, 12, 16, 8, 0.4)], ['@veg.2', SD.blob(r, px - 18, deck + 4, 6, 14, 7, 0.4)], ['@bloom.0', SD.blob(r, px + 14, -54, 5, 4, 6, 0.4)]);
        g.push({ f: '@water.2', d: ell(px + 30, -9, 20, 1.2), op: 0.6 });
      }
      // the canal warehouse (v1)
      if (v === 1) {
        const wx = -300, ww = 70, wh = 200;
        b.push(['@brick.1', rect(wx - 10, -30 - wh, ww, wh)], { s: '@brick.3', w: 0.5, op: 0.35, detail: true, d: courses(wx - 10, -30 - wh, ww, wh, 5) });
        winRows(b, r, wx - 4, -30 - wh + 14, 3, 6, 10, 18, 9, 14, 2, { arch: 'round', frame: '@stone.0' });
        b.push(['@brick.3', poly([[wx - 14, -30 - wh], [wx + 25, -30 - wh - 24], [wx + 64, -30 - wh]])]);
      }
      // lamps along the towpath
      for (let x = X0 + 40; x < X1; x += 120) b.push(['@lamp.0', rect(x - 1.2, -64, 2.4, 34)], ['@lamp.0', rect(x - 4, -68, 8, 4)], { f: '@iron.0', d: rect(x - 3, -66, 6, 3), glow: 'lamp' });
      g.push({ f: '@water.2', d: ell(-40, -12, 40, 1.2), op: 0.5 }, { f: '@water.2', d: ell(210, -6, 30, 1.2), op: 0.5 });
      verge(b, r, X0, X1, 3);
      for (let x = X0 + 40; x < X1; x += 120) lit.push(wash(x, -66, 34, rect(x - 34, -100, 68, 70), 0.5));
      for (let i = 0; i < piers.length - 1; i++) lit.push(wash((piers[i] + piers[i + 1]) / 2, deck - 2, 120, rect(piers[i] + 22, deck - 2, piers[i + 1] - piers[i] - 44, 40), 0.3));
      return { body: b, glint: g, lit };
    },
  });

  /* =======================================================================================
     Town objects: red-brick mills, canal warehouses, modern media blocks, a stadium,
     northern terraces, and the two tram systems.
     ======================================================================================= */
  const BRICKS = [['#9a4a32', '#7a3624', '#b8664a', '#5e2a1c'], ['#8a4a36', '#6a3626', '#a8664a', '#4e2a1c'], ['#a85a3a', '#86442c', '#c47a56', '#64301e'], ['#7e463a', '#603428', '#9c6252', '#46261c']];

  /* building.mill-red-brick: v0 six storeys, a stair tower with a water tank and a round chimney; v1 four
     storeys, plain parapet; v2 converted (big glazing, balconies); v3 five storeys with an engine house and a square chimney */
  define({
    id: 'building.mill-red-brick', category: 'building', size: [420, 330], variants: 4, flippable: true,
    palette: pal({ brick: BRICKS[0], stone: ['#d0c4a8', '#a89a7c'], roof: ['#4e565e', '#3a4046', '#6a727a'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], rail: ['#2a2e32'] }),
    parts: ['body', 'glint'], anim: { flicker: { part: 'glint', op: [0.2, 1], period: 5 } },
    shadow: { rx: 180, ry: 12, h: 260 },
    tags: ['uk', 'north', 'mill', 'industrial', 'brick', 'victorian', 'kit:urban', 'role:building-mid'],
    credit: 'native: a generic northern textile mill',
    build(v, r, ctx) {
      const b = [], floors = [6, 4, 5, 5][v], bays = [12, 10, 11, 12][v], fh = 34, bw = 26, W = bays * bw + 12, x0 = -W / 2, H = floors * fh + 16;
      const col = BRICKS[v];
      b.push({ f: col[0], d: rect(x0, -H, W, H) }, { s: col[3], w: 0.5, op: 0.3, detail: true, d: courses(x0, -H, W, H, 4) });
      b.push({ f: col[3], d: rect(x0 + W - 30, -H, 30, H), op: 0.25 });
      for (let j = 0; j < floors; j++) {
        const y = -H + 12 + j * fh;
        if (v === 2) winRows(b, r, x0 + 8, y + 2, bays, 1, bw - 6, fh - 8, 6, 0, 2, { frame: '#2a2e32' });
        else winRows(b, r, x0 + 10, y + 4, bays, 1, bw - 10, fh - 14, 10, 0, 2, { arch: 'round', frame: '@stone.0' });
        b.push({ f: '@stone.0', d: rect(x0, y + fh - 4, W, 2), op: 0.8 });
        if (v === 2 && j > 0) b.push({ s: '@rail.0', w: 0.8, d: Array.from({ length: Math.floor(bays / 3) }, (_, k) => `M${f1(x0 + 8 + k * 3 * bw)} ${y + fh - 10}h${bw * 1.5}v7h-${bw * 1.5}`).join('') });
      }
      b.push({ f: '@stone.0', d: rect(x0 - 2, -H - 6, W + 4, 6) });
      b.push(snow(ctx.season, rect(x0 - 2, -H - 9, W + 4, 3)));
      if (v === 0) {   // stair tower with a water tank and pyramid cap; a round chimney behind
        const tx = x0 + W - 10;
        b.push({ f: col[1], d: rect(tx - 16, -H - 50, 32, H + 50) }, { f: '@stone.0', d: rect(tx - 18, -H - 54, 36, 6) }, ['@roof.0', `M${tx - 18} ${-H - 54}L${tx} ${-H - 74}L${tx + 18} ${-H - 54}z`]);
        for (let j = 0; j < floors; j++) b.push({ f: '@glass.0', d: rect(tx - 3, -H + 10 + j * fh, 6, 14), glow: 'window' });
        b.push(snow(ctx.season, `M${tx - 14} ${-H - 58}L${tx} ${-H - 74}L${tx + 14} ${-H - 58}z`, 0.8));
        const cx = x0 + 40;
        b.push({ f: col[1], d: poly([[cx - 12, -H], [cx - 7, -H - 120], [cx + 7, -H - 120], [cx + 12, -H]]) }, { f: col[2], d: rect(cx - 9, -H - 128, 18, 8) });
      }
      if (v === 3) {   // engine house with a tall arched window and a square chimney
        const ex = x0 - 50;
        b.push({ f: col[1], d: rect(ex, -110, 52, 110) }, ['@roof.0', `M${ex - 4} -110L${ex + 26} -132L${ex + 56} -110z`]);
        b.push({ f: '@glass.0', d: `M${ex + 16} -20V-80Q${ex + 26} -96 ${ex + 36} -80V-20z`, glow: 'window' }, { s: '@stone.0', w: 1, d: `M${ex + 26} -20V-88M${ex + 16} -50h20` });
        b.push({ f: col[1], d: poly([[ex - 18, 0], [ex - 14, -300], [ex + 2, -300], [ex + 6, 0]]) }, { f: col[2], d: rect(ex - 17, -306, 20, 8) });
        b.push(snow(ctx.season, rect(ex - 17, -309, 20, 3)));
      }
      if (v === 1) b.push({ f: col[2], d: rect(-40, -H - 22, 80, 18) }, { f: '@stone.0', d: rect(-44, -H - 24, 88, 3) });
      b.push({ f: '#2e2620', d: rect(-12, -30, 24, 30) });
      verge(b, r, x0 - 10, x0 + W + 10, 4);
      const g = [glint(x0 + 60, -H + 30, 20), glint(x0 + W - 80, -H + 70, 20)];
      return { body: b, glint: g };
    },
  });

  /* building.warehouse-canal: a tall canal warehouse: stacked loading doors under a hoist gable, small arched
     windows and a shipping arch at the waterline (v1 sandstone, v2 converted with glazing in the doors) */
  define({
    id: 'building.warehouse-canal', category: 'building', size: [260, 300], variants: 3, flippable: true,
    palette: pal({ brick: BRICKS[1], sand: ['#c8a878', '#a4865a', '#e0c49a', '#7a6040'], stone: ['#d0c4a8', '#a89a7c'], roof: ['#4e565e', '#3a4046', '#6a727a'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], door: ['#3a4a3a', '#2a2420'], water: ['#3e5a5e'] }),
    parts: ['body', 'glint'], anim: { flicker: { part: 'glint', op: [0.2, 1], period: 5 } },
    shadow: { rx: 120, ry: 10, h: 280 }, reflect: true,
    tags: ['uk', 'north', 'warehouse', 'canal', 'industrial', 'brick', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'native: a generic canal warehouse',
    build(v, r, ctx) {
      const b = [], W = 240, H = 250, x0 = -W / 2, c = v === 1 ? '@sand.' : '@brick.';
      b.push({ f: c + 0, d: rect(x0, -H, W, H) }, { s: c + 3, w: 0.5, op: 0.3, detail: true, d: courses(x0, -H, W, H, v === 1 ? 7 : 4) });
      b.push({ f: c + 3, d: rect(x0 + W - 26, -H, 26, H), op: 0.25 });
      b.push({ f: c + 0, d: poly([[-50, -H], [0, -H - 40], [50, -H]]) }, ['@roof.0', poly([[x0 - 4, -H], [-50, -H], [0, -H - 44], [50, -H], [x0 + W + 4, -H], [x0 + W + 4, -H - 4], [x0 - 4, -H - 4]])]);
      b.push(snow(ctx.season, poly([[-52, -H - 2], [0, -H - 46], [52, -H - 2], [44, -H - 2], [0, -H - 38], [-44, -H - 2]]), 0.8));
      for (let j = 0; j < 6; j++) {
        const y = -H + 12 + j * 38;
        winRows(b, r, x0 + 14, y + 4, 2, 1, 14, 20, 22, 0, 1, { arch: 'round', frame: '@stone.0' });
        winRows(b, r, x0 + W - 66, y + 4, 2, 1, 14, 20, 22, 0, 1, { arch: 'round', frame: '@stone.0' });
        if (j < 5) b.push(v === 2 ? { f: '@glass.0', d: rect(-12, y + 2, 24, 28), glow: 'window' } : ['@door.0', rect(-12, y + 2, 24, 28)], ['@stone.0', rect(-14, y + 30, 28, 3)]);
      }
      b.push({ s: '@door.1', w: 2.4, d: `M0 ${-H - 18}v-8h18v12` });
      b.push(['@stone.0', `M-34 0V-30Q0 -66 34 -30V0z`], ['@water.0', `M-28 0V-30Q0 -60 28 -30V0z`]);
      verge(b, r, x0 - 10, -36, 3); verge(b, r, 36, x0 + W + 10, 3);
      return { body: b, glint: [glint(x0 + 30, -H + 50, 18), glint(x0 + W - 40, -H + 120, 18)] };
    },
  });

  /* building.media-block: generic modern waterside blocks: v0 a glass box behind a diagonal frame, v1 a grid of
     coloured panels, v2 a stepped slab with a lit crown, v3 a curved glass front */
  define({
    id: 'building.media-block', category: 'building', size: [300, 320], variants: 4, flippable: true,
    palette: pal({ glass: ['#3a5068', '#6a8aa4', '#c8dcea'], frame: ['#e8eaea', '#9aa0a4', '#3a4046'], panel: ['#5a8ab4', '#e0e2e0', '#e8a83a', '#7aa04a'], stone: ['#b8b6b0'], led: '#9ad8ff' }),
    parts: ['body', 'glint', 'lit'], anim: { flicker: { part: 'glint', op: [0.15, 1], period: 6 } },
    shadow: { rx: 140, ry: 10, h: 300 },
    tags: ['uk', 'north', 'modern', 'office', 'media', 'glass', 'kit:towers', 'kit:urban', 'role:building-mid'],
    credit: 'native: generic modern waterside office blocks',
    build(v, r, ctx) {
      const b = [], lit = [], W = [240, 200, 260, 220][v], H = [220, 260, 300, 200][v], x0 = -W / 2, fh = 18, n = Math.floor((H - 20) / fh);
      b.push({ f: { lin: [[0, '@glass.2'], [0.5, '@glass.1'], [1, '@glass.0']], x1: x0, y1: -H, x2: x0 + W, y2: 0 }, d: v === 3 ? `M${x0} 0V${-H + 30}Q0 ${-H - 30} ${-x0} ${-H + 30}V0z` : rect(x0, -H, W, H) });
      if (v === 1) {
        for (let j = 0; j < n; j++) { const y = -H + 10 + j * fh, cols = Math.floor(W / 20); const gp = ['', '', '', '']; for (let i = 0; i < cols; i++) gp[Math.floor(r() * 4)] += rect(x0 + i * 20 + 1, y, 9, fh - 2); gp.forEach((d, k) => d && b.push({ f: '@panel.' + k, d })); }
        winRows(b, r, x0 + 11, -H + 12, Math.floor(W / 20), n, 8, fh - 6, 12, 6, 2);
      } else {
        winRows(b, r, x0 + 3, -H + (v === 3 ? 34 : 10), Math.floor((W - 6) / 12), v === 3 ? n - 2 : n, 10, fh - 5, 2, 5, 2);
        for (let j = 0; j <= n; j++) b.push({ f: '@frame.1', d: rect(x0, -H + 8 + j * fh, W, 2), op: 0.6 });
      }
      if (v === 0) { let d = ''; for (let k = -6; k < 10; k++) d += `M${f1(x0 + k * 40)} 0L${f1(x0 + k * 40 + H * 0.5)} ${-H}`; b.push({ s: '@frame.0', w: 5, d: d + `M${x0} 0V${-H}H${x0 + W}V0` }); }
      if (v === 2) { b.push(['@frame.0', rect(x0 + W * 0.6, -H - 40, W * 0.4, 40)], ['@frame.0', rect(x0, -H, W, 6)]); lit.push({ f: '@led', d: rect(x0 + W * 0.6, -H - 40, W * 0.4, 5), op: 0.95 }, wash(x0 + W * 0.8, -H - 20, 90, rect(x0 + W * 0.5, -H - 70, W * 0.6, 80), 0.35, '@led')); }
      b.push({ f: '@frame.2', d: rect(x0, -16, W, 16), op: 0.85 }, { f: '@glass.2', d: rect(x0 + 10, -14, W - 20, 12), op: 0.5, glow: 'lamp' });
      b.push(snow(ctx.season, v === 3 ? `M${x0 + 20} ${-H + 18}Q0 ${-H - 34} ${-x0 - 20} ${-H + 18}Q0 ${-H - 26} ${x0 + 20} ${-H + 18}z` : rect(x0, -H - 3, W, 3)));
      verge(b, r, x0 - 20, x0 + W + 20, 4);
      lit.push(wash(0, -8, W * 0.7, rect(x0 - 20, -50, W + 40, 50), 0.3));
      return { body: b, glint: [glint(x0 + 40, -H + 40, 50), glint(x0 + W - 60, -H + 120, 40)], lit };
    },
  });

  /* building.stadium: a generic football ground seen from outside: clad stands, a cantilever roof on trusses and
     corner floodlight pylons (lit at night). Club colours by variant (red, sky blue, royal blue, white); no crests. */
  define({
    id: 'building.stadium', category: 'building', size: [820, 260], variants: 4, flippable: true,
    palette: pal({ clad: ['#b8302a', '#86c0e0', '#2a58a8', '#e8e8e4'], dark: ['#3a3e44', '#24282c'], roof: ['#d8dcdc', '#9aa0a4'], steel: ['#5a6066', '#c8ccd0'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], beam: '#f4f8ff' }),
    parts: ['body', 'flags', 'lit'], anim: { sway: { part: 'flags', pivot: [0, -170], deg: 4 } },
    shadow: { rx: 400, ry: 12, h: 160 },
    tags: ['uk', 'north', 'stadium', 'football', 'sport', 'kit:urban', 'role:building-far'],
    credit: 'native: a generic football stadium (no crests or lettering)',
    build(v, r, ctx) {
      const b = [], lit = [], flags = [], W = 380, H = 120, clad = '@clad.' + v;
      // the far stands showing over the near one
      b.push(['@dark.1', poly([[-W + 30, -H], [-W + 70, -H - 34], [W - 70, -H - 34], [W - 30, -H]])], { f: clad, d: poly([[-W + 70, -H - 34], [W - 70, -H - 34], [W - 70, -H - 28], [-W + 70, -H - 28]]), op: 0.8 });
      // the near stand: concourse, cladding bands, entrances
      b.push({ f: clad, d: rect(-W, -H, 2 * W, H) }, ['@dark.0', rect(-W, -30, 2 * W, 30)]);
      b.push({ s: '@steel.1', w: 0.8, op: 0.5, detail: true, d: courses(-W, -H, 2 * W, 88, 8) });
      for (let i = 0; i < 16; i++) { const x = -W + 22 + i * 48; b.push(['@dark.1', rect(x, -24, 18, 24)], { f: '@glass.0', d: rect(x + 2, -22, 14, 6), glow: 'window' }); }
      winRows(b, r, -W + 30, -H + 20, 20, 1, 18, 8, 18, 0, 3);
      // the cantilever roof and its trusses
      b.push(['@roof.0', poly([[-W - 10, -H - 6], [W + 10, -H - 6], [W + 4, -H - 24], [-W - 4, -H - 24]])], ['@roof.1', rect(-W - 10, -H - 8, 2 * W + 20, 3)]);
      let tr = ''; for (let x = -W; x < W; x += 24) tr += `M${x} ${-H - 24}L${x + 12} ${-H - 44}L${x + 24} ${-H - 24}`;
      b.push({ s: '@steel.0', w: 1.4, d: tr + `M${-W} ${-H - 44}H${W}` });
      b.push(snow(ctx.season, rect(-W - 4, -H - 27, 2 * W + 8, 3)));
      // the corner floodlight pylons
      for (const s of [-1, 1]) {
        const px = s * (W + 30);
        b.push({ s: '@steel.0', w: 3, d: `M${px - 8} 0L${px - 2} -230M${px + 8} 0L${px + 2} -230` }, { s: '@steel.0', w: 0.8, d: Array.from({ length: 10 }, (_, i) => `M${f1(px - 8 + i * 0.6)} ${-i * 23}L${f1(px + 8 - (i + 1) * 0.6)} ${-(i + 1) * 23}`).join('') });
        b.push(['@dark.0', rect(px - 24, -262, 48, 32)]);
        for (let k = 0; k < 4; k++) b.push({ f: '@steel.1', d: rect(px - 21, -259 + k * 7.5, 42, 5), glow: 'lamp' });
        lit.push({ f: { lin: [[0, '@beam', 0.4], [1, '@beam', 0]], x1: px, y1: -245, x2: -s * 200 + px, y2: -60 }, d: `M${px - 22} -258L${px + 22} -232L${px - s * 260} -40L${px - s * 380} -120z` });
      }
      // flags on the roof
      for (const fx of [-200, 0, 200]) { b.push({ s: '@steel.0', w: 1.2, d: `M${fx} ${-H - 44}v-26` }); flags.push({ f: clad, d: `M${fx} ${-H - 70}l18 4 -18 5z` }); }
      verge(b, r, -W - 60, W + 60, 4);
      return { body: b, flags, lit };
    },
  });

  /* building.terrace-northern: a row of red-brick two-up two-down houses: slate roof, chimney stacks with pots,
     stone sills and lintels, bright doors. v1 and v3 step up a hill; v2 ends in a corner shop (no lettering). */
  define({
    id: 'building.terrace-northern', category: 'building', size: [380, 170], variants: 4, flippable: true,
    palette: pal({ brick: BRICKS[2], stone: ['#d8ccb0', '#a89a7c'], roof: ['#4a525a', '#363c42', '#66707a'], glass: ['#2e3a44', '#5a6a78', '#b8c8d4'], door: ['#2a4a7a', '#a8302a', '#2e5a3e', '#3a3a3a', '#e8e2d2', '#c8a03a'], pot: ['#a8603a'], smoke: '#c8ccd0' }),
    parts: ['body', 'smoke'], anim: { bob: { part: 'smoke', dy: 4, period: 4 } },
    shadow: { rx: 180, ry: 10, h: 150 },
    tags: ['uk', 'north', 'terrace', 'victorian', 'brick', 'street', 'kit:urban', 'role:building-mid'],
    credit: 'native: a northern brick terrace',
    build(v, r, ctx) {
      const b = [], smoke = [], n = 6, hw = 58, x0 = -n * hw / 2, step = v === 1 || v === 3 ? 9 : 0, H = 104;
      const brick = BRICKS[[2, 0, 1, 3][v]];
      for (let i = 0; i < n; i++) {
        const x = x0 + i * hw, base = -i * step, top = base - H;
        b.push({ f: brick[0], d: rect(x, top, hw + 0.5, H - base + 0) }, { s: brick[3], w: 0.5, op: 0.3, detail: true, d: courses(x, top, hw, H, 4) });
        if (step) b.push({ f: brick[1], d: rect(x, base, hw, -base + 0.1) });
        b.push(['@roof.0', poly([[x - 1, top], [x + 4, top - 26], [x + hw + 4, top - 26], [x + hw + 1, top]])]);
        b.push(snow(ctx.season, poly([[x, top - 2], [x + 4, top - 26], [x + hw + 4, top - 26], [x + hw, top - 2], [x + hw - 6, top - 2], [x + hw - 2, top - 20], [x + 8, top - 20], [x + 6, top - 2]]), 0.85));
        const shop = v === 2 && i === n - 1;
        if (shop) { b.push({ f: '@door.' + (i % 6), d: rect(x + 4, base - 52, hw - 8, 8) }, { f: '@glass.0', d: rect(x + 6, base - 42, hw - 22, 34), glow: 'window' }, ['@door.3', rect(x + hw - 14, base - 42, 10, 42)]); }
        else {
          b.push({ f: '@door.' + Math.floor(r() * 6), d: rect(x + 6, base - 38, 13, 38) }, ['@stone.0', rect(x + 4, base - 41, 17, 3)], ['@stone.0', rect(x + 3, base - 2, 19, 2)], { f: '@glass.1', d: rect(x + 8, base - 36, 9, 5), glow: 'window' });
          b.push({ f: '@glass.0', d: rect(x + 28, base - 36, 22, 26), glow: 'window' }, ['@stone.0', rect(x + 26, base - 39, 26, 3)], ['@stone.0', rect(x + 26, base - 10, 26, 3)]);
        }
        b.push({ f: '@glass.0', d: rect(x + 10, top + 18, 18, 24), glow: 'window' }, { f: '@glass.0', d: rect(x + 34, top + 18, 18, 24), glow: 'window' });
        b.push(['@stone.0', rect(x + 8, top + 15, 22, 3)], ['@stone.0', rect(x + 32, top + 15, 22, 3)], ['@stone.0', rect(x + 8, top + 42, 22, 3)], ['@stone.0', rect(x + 32, top + 42, 22, 3)]);
        b.push({ s: '@stone.0', w: 1, d: `M${x + 19} ${top + 18}v24M${x + 43} ${top + 18}v24M${x + 10} ${top + 30}h18M${x + 34} ${top + 30}h18`, detail: true });
        // the chimney stack on the party wall, its pots
        const cx = x + hw;
        if (i < n - 1 || v === 0) {
          b.push({ f: brick[1], d: rect(cx - 7, top - 44, 14, 22) }, ['@stone.0', rect(cx - 8, top - 46, 16, 3)], ['@pot', rect(cx - 6, top - 53, 4, 7)], ['@pot', rect(cx + 1, top - 52, 4, 6)]);
          if ((i + v) % 2 === 0) smoke.push({ f: '@smoke', d: SD.blob(r, cx - 2, top - 64, 6, 4, 6, 0.4), op: 0.4 }, { f: '@smoke', d: SD.blob(r, cx + 4, top - 76, 8, 5, 6, 0.4), op: 0.25 });
        }
      }
      if (v === 3) for (let i = 0; i < n; i++) b.push({ s: '#e8e4dc', w: 0.6, d: `M${x0 + i * hw + 4} ${-i * step - 64}h50`, detail: true });
      return { body: b, smoke };
    },
  });

  /* vehicle.supertram: the Sheffield tram, three sections: v0 the white tram with blue skirt and orange and red
     stripes, v1 the dark blue tram-train with yellow doors. Faces right; anchor: the rail. */
  function tram(v, r, o) {
    const b = [], wheels = [], { secs, L, H } = o, total = secs * L, x0 = -total / 2;
    for (let s = 0; s < secs; s++) {
      const x = x0 + s * L + (s ? 3 : 0), w = L - (s ? 3 : 0), last = s === secs - 1, first = s === 0;
      const body = last ? `M${x} -16V${-H}H${x + w - 26}Q${x + w} ${-H + 4} ${x + w} ${-H + 40}V-16z` : first ? `M${x + w} -16V${-H}H${x + 26}Q${x} ${-H + 4} ${x} ${-H + 40}V-16z` : rect(x, -H, w, H - 16);
      b.push({ f: o.body, d: body }, { f: o.skirt, d: rect(x + (first ? 2 : 0), -40, w - (first || last ? 2 : 0), 24) });
      if (o.stripe) b.push({ f: o.stripe[0], d: rect(x + (first ? 3 : 0), -46, w - (first || last ? 3 : 0), 5) }, { f: o.stripe[1], d: rect(x + (first ? 4 : 0), -52, w - (first || last ? 4 : 0), 4) });
      b.push({ f: '@win.1', d: rect(x + (first ? 30 : 6), -H + 14, w - (first || last ? 36 : 12), 38) });
      winRows(b, r, x + (first ? 32 : 8), -H + 16, Math.floor((w - (first || last ? 40 : 16)) / 22), 1, 18, 34, 4, 0, 2, { glass: '@win.0' });
      for (const dx of [0.28, 0.72]) b.push({ f: o.door, d: rect(x + w * dx - 9, -H + 12, 18, H - 28) }, { f: '@win.0', d: rect(x + w * dx - 7, -H + 16, 6, 36), glow: 'window' }, { f: '@win.0', d: rect(x + w * dx + 1, -H + 16, 6, 36), glow: 'window' });
      if (s < secs - 1) b.push(['@dark.0', rect(x + w - 1, -H + 6, 5, H - 22)]);
      wheels.push(['@dark.0', rect(x + 24, -16, 50, 12)], ['@dark.0', rect(x + w - 74, -16, 50, 12)]);
      for (const wx of [x + 34, x + 64, x + w - 64, x + w - 34]) wheels.push(['@dark.1', ell(wx, -7, 7, 7)]);
    }
    const mid = x0 + Math.floor(secs / 2) * L + L / 2;
    b.push(['@dark.0', rect(mid - 30, -H - 6, 60, 6)], { s: '@dark.0', w: 1.6, d: `M${mid - 20} ${-H - 6}L${mid + 6} ${-H - 26}L${mid - 12} ${-H - 44}M${mid - 24} ${-H - 44}h24` });
    b.push({ f: '@win.0', d: `M${x0 + total - 2} ${-H + 44}V${-H + 12}Q${x0 + total - 12} ${-H + 6} ${x0 + total - 24} ${-H + 8}V${-H + 44}z`, glow: 'window' });
    b.push({ f: '@lamp.0', d: ell(x0 + total - 6, -30, 3.4, 2.4), glow: 'lamp' }, { f: '@lamp.1', d: ell(x0 + 6, -30, 3, 2), glow: 'lamp' });
    return { body: b, wheels };
  }
  define({
    id: 'vehicle.supertram', category: 'vehicle', size: [720, 130], variants: 2, seasonal: false, shapeBySeason: false, flippable: true,
    palette: { base: { white: ['#f2f2ee'], blue: ['#1e3e8a', '#16306a'], orange: ['#f08a1c'], red: ['#d8302a'], yellow: ['#f4c41c'], win: ['#22303c', '#3a4a58'], dark: ['#2a2e32', '#1a1c1e'], lamp: ['#fff6d8', '#e83a2a'] } },
    parts: ['body', 'wheels'], anim: { bob: { part: 'body', dy: 0.6, period: 0.8 } },
    shadow: { rx: 340, ry: 8, h: 60 },
    tags: ['uk', 'north', 'sheffield', 'tram', 'transport', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
    credit: 'native: the Sheffield Supertram (generic livery, no logos)',
    build(v, r) { return tram(v, r, v === 0 ? { secs: 3, L: 238, H: 116, body: '@white.0', skirt: '@blue.0', stripe: ['@orange.0', '@red.0'], door: '@blue.1' } : { secs: 3, L: 226, H: 118, body: '@blue.0', skirt: '@blue.1', stripe: ['@white.0', '@yellow.0'], door: '@yellow.0' }); },
  });
  define({
    id: 'vehicle.metrolink-m5000', category: 'vehicle', size: [660, 125], variants: 2, seasonal: false, shapeBySeason: false, flippable: true,
    palette: { base: { yellow: ['#f2c81a', '#d8a810'], silver: ['#c8ccd0', '#9aa0a6'], black: ['#1e2226'], win: ['#22303c', '#3a4a58'], dark: ['#2a2e32', '#1a1c1e'], lamp: ['#fff6d8', '#e83a2a'] } },
    parts: ['body', 'wheels'], anim: { bob: { part: 'body', dy: 0.6, period: 0.8 } },
    shadow: { rx: 320, ry: 8, h: 60 },
    tags: ['uk', 'north', 'manchester', 'tram', 'transport', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
    credit: 'native: the Manchester Metrolink tram (generic yellow and silver, no logos)',
    build(v, r) {
      const o = tram(v, r, { secs: v === 0 ? 2 : 4, L: v === 0 ? 320 : 160, H: 112, body: '@silver.0', skirt: '@yellow.0', stripe: ['@black.0', '@yellow.1'], door: '@yellow.0' });
      return o;
    },
  });
})();
