/* ============================================================
   SCENE LIBRARY: street furniture, the London station kit
   (docs/dev/SCENE_ENGINE.md, section 2; signage and the legal note,
   sections 8.3 and 8.4).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   At the scale of people (a person is about 58 units tall, about 33 units
   per metre, like street.lamp and street.bench). Anchor: the ground at the
   middle (a wall-mounted board: the foot of the wall below it).

   street.station-nameboard is a BLANK: the board, its frame and the
   line-colour bars, with NO text. The station name is drawn by the engine's
   sign primitive from data (8.3); each variant records its board rectangle
   in `signBoard` [cx, cy, w, h] so a scene can put the sign exactly on it.
   No circles, rings or discs on any board (8.4). The clock faces are plain
   filled discs with stroked hands: never a ring with a bar across it.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const lobed = (r, cx, cy, rx, ry, n, rag = .3) => {
    const ph = r() * 6.3, pts = [];
    for (let i = 0; i < n; i++) { const a = (i + rr(r, -.25, .25)) / n * Math.PI * 2, k = 1 + rag * .6 * Math.sin(3 * a + ph) + rr(r, -.08, .08), s = Math.sin(a); pts.push([cx + Math.cos(a) * rx * k, cy + (s > 0 ? s * .65 : s) * ry * k]); }
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 1; i <= n; i++) { const p = pts[i % n], q = pts[i - 1], lr = Math.max(1, f1(Math.hypot(p[0] - q[0], p[1] - q[1]) * .62)); d += `A${lr} ${lr} 0 0 1 ${f1(p[0])} ${f1(p[1])}`; }
    return d + 'z';
  };
  const wash = (cx, cy, rx, ry, op, slot) => ({ f: { rad: [[0, slot, op], [.5, slot, op * .45], [1, slot, 0]], cx, cy, r: Math.max(rx, ry) }, d: ell(cx, cy, rx, ry) });
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const LINE_COLOURS = ['#d03a2f', '#1f4f9e', '#00843d', '#f2c225', '#8b5a2b', '#ec93b0', '#7b2a7f', '#36a4dc', '#9ba3a8', '#2b2b2f', '#3fb0a4', '#ef7d22'];
  /** The bar sets of the eight name-board variants (indices into LINE_COLOURS). */
  const BARS = [[0], [1, 8], [2, 3, 6], [7], [4, 0], [5, 9, 1], [10], [11, 2]];
  /** Each variant's board: [cx, cy, w, h] (the sign primitive's rectangle) and its mount. */
  const BOARDS = [[0, -84, 120, 24, 'posts'], [0, -76, 150, 24, 'wall'], [0, -112, 40, 26, 'totem'], [0, -96, 104, 20, 'hung']];

  /* ---------- street.station-nameboard: a blank name board with line-colour bars; mounts by v % 4: two posts, a wall frame, a totem, hung from a canopy; bars by v (8 sets) ---------- */
  defineObj({
    id: 'street.station-nameboard', category: 'street', size: [170, 140], variants: 8, seasonal: false, flippable: false, parts: ['lit', 'body'],
    palette: { base: { line: LINE_COLOURS, board: ['#f4f1e8', '#d8d2c2'], frame: ['#2a2e32', '#4a5056', '#8a9096'], wall: ['#c8bfae', '#a89e8a'], halo: '#fff4d8' } },
    night: { glow: { lamp: '#fbf5e2' }, on: 1 },
    shadow: { rx: 60, ry: 4, h: 100 },
    tags: ['uk', 'london', 'station', 'sign', 'name-board', 'blank', 'kit:london', 'kit:urban', 'role:street'],
    credit: 'a plain name-board blank (8.3): the text comes from data through the sign primitive',
    signBoard: BOARDS.map(b => b.slice(0, 4)),
    build(v) {
      const [cx, cy, w, h, mount] = BOARDS[v % 4], bars = BARS[v], body = [], lit = [];
      const x0 = cx - w / 2, y0 = cy - h / 2;
      if (mount === 'posts') body.push(['@frame.0', rect(x0 + 10, y0, 4, -y0)], ['@frame.0', rect(x0 + w - 14, y0, 4, -y0)], ['@frame.1', rect(x0 + 10, y0, 1.4, -y0)], ['@frame.1', rect(x0 + w - 14, y0, 1.4, -y0)], ['@frame.0', rect(x0 + 7, -3, 10, 3)], ['@frame.0', rect(x0 + w - 17, -3, 10, 3)]);
      if (mount === 'wall') body.push(['@wall.0', rect(x0 - 10, y0 - 30, w + 20, -y0 + 30)], ['@wall.1', rect(x0 - 10, -6, w + 20, 6)], { s: '@wall.1', w: .5, op: .4, d: Array.from({ length: 30 }, (_, i) => `M${x0 - 10} ${f1(y0 - 30 + i * 4)}h${w + 20}`).join(''), detail: true });
      if (mount === 'totem') body.push(['@frame.0', rect(-3, y0, 6, -y0)], ['@frame.1', rect(-3, y0, 1.6, -y0)], ['@frame.0', rect(-8, -4, 16, 4)], ['@frame.0', rect(x0 - 3, y0 - 6, w + 6, 4)]);
      if (mount === 'hung') body.push({ s: '@frame.0', w: 1.4, d: `M${x0 + 12} ${y0}V${y0 - 30}M${x0 + w - 12} ${y0}V${y0 - 30}` }, ['@frame.0', rect(x0 + 4, y0 - 33, w - 8, 3)]);
      // the frame, the board (backlit after dusk), the bars: stripes above and below the board, never through a disc
      const bh = 4, nb = bars.length, top = y0 - (mount === 'totem' ? 0 : nb * bh);
      body.push(['@frame.0', rect(x0 - 3, top - 3, w + 6, cy + h / 2 - top + 6)]);
      bars.forEach((b, i) => body.push([`@line.${b}`, rect(x0, mount === 'totem' ? y0 + h - (i + 1) * bh : y0 - (i + 1) * bh, w, bh)]));
      body.push({ f: '@board.0', d: rect(x0, y0, w, mount === 'totem' ? h - nb * bh : h), glow: 'lamp' }, ['@board.1', rect(x0, y0 + (mount === 'totem' ? h - nb * bh : h) - 1.4, w, 1.4), .8]);
      lit.push(wash(cx, cy, w * .7, h * 1.4, .35, '@halo'));
      return { lit, body };
    },
  });

  /* ---------- street.station-clock: v0 a bracket clock off a wall, v1 a platform pillar clock, v2 a clock hung from a canopy; double-sided, lit at night; the second hand turns ---------- */
  const CLK = [[0, -100], [0, -100], [0, -100]];   // one face position, so the second hand's pivot serves every variant
  defineObj({
    id: 'street.station-clock', category: 'street', size: [70, 130], variants: 3, seasonal: false, flippable: true, parts: ['lit', 'body', 'hand'],
    palette: { base: { iron: ['#22282c', '#3e464c', '#5a646a'], face: ['#f6f2e6', '#d8d2c2'], hand: '#16181a', red: '#c0392b', brass: ['#c8a050', '#8a6a2a'], wall: ['#c8bfae', '#a89e8a'], halo: '#fff4d8' } },
    night: { glow: { lamp: '#fbf3dc' }, on: 1 },
    anim: { spin: { part: 'hand', pivot: [0, -100], period: 60 } },
    shadow: { rx: 14, ry: 3, h: 110 },
    tags: ['uk', 'london', 'station', 'clock', 'platform', 'kit:london', 'kit:urban', 'role:street'],
    credit: 'after the double-sided bracket and pillar clocks of London stations; generic',
    build(v) {
      const [cx, cy] = CLK[v], R = 14, body = [], lit = [];
      if (v === 0) {
        body.push(['@wall.0', rect(-56, -150, 16, 150)], ['@wall.1', rect(-43, -150, 3, 150), .6], ['@iron.0', rect(-42, cy - 22, 6, 30)], { s: '@iron.0', w: 2.6, d: `M-36 ${cy - 20}H${cx}` }, { s: '@iron.1', w: 1.2, d: `M-36 ${cy + 4}q16 -2 20 -22q4 6 12 2` }, { s: '@iron.0', w: 1.4, d: `M${cx} ${cy - 20}V${cy - R - 3}` });
      } else if (v === 1) {
        body.push(['@iron.0', `M-8 0v-6h16v6zM-5 -6l1.4 -10h7.2l1.4 10z`], { s: '@iron.0', w: 4.4, d: `M0 -16V${cy + R + 4}` }, { s: '@iron.2', w: 1.1, op: .7, d: `M-1.2 -18V${cy + R + 6}` }, ['@iron.0', rect(-5, -50, 10, 3)], ['@iron.0', rect(-6, cy + R + 2, 12, 4)]);
      } else {
        body.push({ s: '@iron.0', w: 1.6, d: `M0 -146V${cy - R}` }, ['@iron.0', rect(-10, -148, 20, 3)]);
      }
      // the case: a dark drum seen face on, a brass rim and the face, all filled discs (no stroked ring)
      body.push(['@iron.0', ell(cx, cy, R + 3, R + 3)], ['@brass.1', ell(cx, cy - .6, R + 1.4, R + 1.4), .9], { f: '@face.0', d: ell(cx, cy, R, R), glow: 'lamp' }, ['@face.1', `M${cx - R * .7} ${cy + R * .7}a${R} ${R} 0 0 0 ${R * 1.4} 0z`, .35]);
      let tk = ''; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6, l = i % 3 ? 1.6 : 3; tk += `M${f1(cx + Math.cos(a) * (R - 1.4))} ${f1(cy + Math.sin(a) * (R - 1.4))}L${f1(cx + Math.cos(a) * (R - 1.4 - l))} ${f1(cy + Math.sin(a) * (R - 1.4 - l))}`; }
      body.push({ s: '@hand', w: 1, d: tk }, { s: '@hand', w: 1.8, d: `M${cx} ${cy}l5 -4.4` }, { s: '@hand', w: 1.2, d: `M${cx} ${cy}l-2.6 -10` }, ['@hand', ell(cx, cy, 1.2, 1.2)]);
      if (v !== 1) body.push(['@iron.1', ell(cx, cy - R - 3, 2.4, 2)]);
      const hand = [{ s: '@red', w: .7, d: `M${cx} ${cy}V${cy - R + 3}` }];
      lit.push(wash(cx, cy, R * 2.6, R * 2.6, .4, '@halo'));
      return { lit, body, hand };
    },
  });
  /* ---------- street.station-entrance: a street entrance; v0 Victorian stairs down between stone piers under an iron arch, v1 modern stairs down with glass balustrades and a glass canopy, v2 steps up to a stone portal ---------- */
  defineObj({
    id: 'street.station-entrance', category: 'street', size: [170, 150], variants: 3, seasonal: true, shapeBySeason: true, flippable: false, parts: ['lit', 'body'],
    palette: Object.assign({ base: {
      stone: ['#d8d0be', '#b4ab96', '#ece6d6', '#8e8674'], iron: ['#22282c', '#3e464c'], dark: ['#2a2622', '#3e3832', '#5a524a', '#7a7064'], tile: ['#e8e2d0', '#c8c0aa'],
      glass: ['#8ab0c4', '#d4e6ee'], steel: ['#b8c0c6', '#7a848c'], lamp: '#f8f2dc', halo: '#ffe6b0', door: ['#2a3a4a', '#4a5a6a'], snow: ['#f4f6f8', '#d8e0e8'], tub: ['#3a3e44', '#d8d2c4'],
    } }, bySeason({
      leaf: { spring: ['#4f8a3a', '#7ab04a'], summer: ['#2f6a2c', '#4f8a38'], autumn: ['#8a6a2a', '#b8823a'], winter: ['#3e4a38', '#56604a'] },
      bloom: { spring: ['#f4d23a', '#f8f4ec'], summer: ['#d8405a', '#f4a0c0'], autumn: ['#d8782a', '#c04a2a'], winter: ['#6a5a4a', '#7a6a5a'] },
    })),
    night: { glow: { lamp: '#fff0c8', window: '#ffe2a0' }, on: 1 },
    shadow: { rx: 70, ry: 6, h: 90 },
    tags: ['uk', 'london', 'station', 'entrance', 'stairs', 'subway', 'kit:london', 'kit:urban', 'role:street'],
    credit: 'after London street entrances to sub-surface and deep stations; generic, no marks',
    build(v, r, ctx) {
      const body = [], lit = [], winter = ctx.season === 'winter', s = ctx.season;
      const trough = (x) => { body.push(['@tub.0', rect(x - 11, -10, 22, 10)], ['@tub.1', rect(x - 12, -11, 24, 1.6)], ['@leaf.0', lobed(r, x, -14, 12, 6, 8, .35)], ['@leaf.1', lobed(r, x - 3, -17, 6, 3, 6, .3)]); if (!winter) { let b = ''; for (let i = 0; i < 6; i++) b += ell(x + rr(r, -10, 10), rr(r, -20, -11), 1.4, 1.4); body.push(['@bloom.0', b]); } else body.push(['@snow.0', `M${x - 12} -16q12 -8 24 0z`]); };
      if (v === 0 || v === 1) {
        // the stairwell: a dark opening in the pavement, treads going down into the dark, the tiled far wall
        const W = 46, D = 18;
        body.push(['@dark.0', `M${-W} 0L${-W + 6} ${-D}H${W - 6}L${W} 0z`]);
        body.push([v ? '@steel.1' : '@tile.0', `M${-W + 6} ${-D}H${W - 6}v6H${-W + 6}z`, .9]);
        for (let i = 0; i < 6; i++) { const y = -1.5 - i * 2.4, t = i / 6, xw = W - 1 - t * 6; body.push([`@dark.${3 - Math.min(3, Math.floor(i / 1.6))}`, rect(-xw, y - 1, 2 * xw, 1.2), .9 - t * .5]); }
        if (v === 0) {
          // side and back railings in perspective, stone piers at the front corners with lanterns, an iron arch over the head of the stairs
          const rail = (x0, y0, x1, y1, h) => { let d = `M${x0} ${y0 - h}L${x1} ${y1 - h}M${x0} ${y0 - 3}L${x1} ${y1 - 3}`; const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 4); for (let i = 1; i < n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; d += `M${f1(x)} ${f1(y)}V${f1(y - h)}`; } return { s: '@iron.0', w: 1, d }; };
          body.push(rail(-W + 6, -D, W - 6, -D, 28), { s: '@iron.0', w: 2, d: `M${-W + 6} ${-D - 28}H${W - 6}` });
          body.push(rail(-W - 2, 0, -W + 6, -D, 30), rail(W + 2, 0, W - 6, -D, 30), { s: '@iron.0', w: 2, d: `M${-W - 2} -30L${-W + 6} ${-D - 28}M${W + 2} -30L${W - 6} ${-D - 28}` });
          for (const sx of [-1, 1]) {
            const px = sx * (W + 6);
            body.push(['@stone.0', rect(px - 7, -40, 14, 40)], ['@stone.3', rect(px + (sx < 0 ? 3 : 3), -40, 4, 40), .4], ['@stone.2', rect(px - 9, -44, 18, 5)], ['@stone.1', rect(px - 6, -48, 12, 4)]);
            body.push(['@iron.0', rect(px - 1.4, -60, 2.8, 12)], ['@iron.0', `M${px - 6} -74h12l-2 -4h-8z`], { f: '@lamp', d: `M${px - 5} -74h10l-2 13h-6z`, glow: 'lamp' }, { s: '@iron.0', w: .8, d: `M${px} -74v13` }, ['@iron.0', rect(px - 4, -61, 8, 2)]);
            lit.push(wash(px, -68, 26, 26, .5, '@halo'));
          }
          // the overthrow: two scrolled iron arcs meeting under a small lantern (no disc, no ring)
          body.push({ s: '@iron.0', w: 2.2, d: `M${-W - 6} -48Q${-W + 4} -96 0 -98Q${W - 4} -96 ${W + 6} -48` }, { s: '@iron.0', w: 1.1, d: `M${-W} -50Q${-W + 8} -86 0 -88Q${W - 8} -86 ${W} -50M-20 -88q-6 8 -14 6M20 -88q6 8 14 6M-10 -88v-4M10 -88v-4` });
          body.push(['@iron.0', 'M-5 -98h10l-1 -4h-8z'], { f: '@lamp', d: 'M-4 -96h8l-1.4 9h-5.2z', glow: 'lamp' }, ['@iron.0', rect(-3.6, -87, 7.2, 1.6)]);
          lit.push(wash(0, -90, 34, 30, .5, '@halo'), wash(0, -8, 60, 14, .4, '@halo'));
          if (winter) body.push(['@snow.0', rect(-W - 15, -46, 18, 2)], ['@snow.0', rect(W - 3, -46, 18, 2)], ['@snow.1', `M${-W} 0L${-W + 6} ${-D}h8L${-W + 8} 0z`, .8]);
          trough(-W - 30); trough(W + 30);
        } else {
          // glass balustrades with a steel top rail; a lean-to glass canopy on two raked steel posts; a strip light
          const pane = (x0, y0, x1, y1, h) => ({ f: '@glass.0', d: `M${x0} ${y0}L${x1} ${y1}V${y1 - h}L${x0} ${y0 - h}z`, op: .45 });
          body.push(pane(-W + 6, -D, W - 6, -D, 30), pane(-W - 2, 0, -W + 6, -D, 32), pane(W + 2, 0, W - 6, -D, 32));
          body.push({ s: '@steel.0', w: 2.4, d: `M${-W - 2} -32L${-W + 6} ${-D - 30}H${W - 6}L${W + 2} -32` }, { s: '@steel.1', w: 1.4, d: `M${-W - 2} 0V-32M${W + 2} 0V-32M${-W + 6} ${-D}v-30M${W - 6} ${-D}v-30` });
          body.push({ s: '@steel.1', w: 3, d: `M${-W + 10} ${-D}L${-W + 4} -96M${W - 10} ${-D}L${W - 4} -96` }, ['@glass.1', `M${-W - 14} -92L${-W - 8} -102H${W + 8}L${W + 14} -92z`, .8], ['@steel.0', rect(-W - 14, -94, 2 * W + 28, 4)], ['@steel.1', rect(-W - 14, -91, 2 * W + 28, 1.2)]);
          body.push({ f: '@lamp', d: rect(-W, -89.6, 2 * W, 1.6), glow: 'lamp' });
          lit.push(wash(0, -70, 70, 30, .35, '@halo'), wash(0, -6, 60, 14, .45, '@halo'));
          if (winter) body.push(['@snow.0', `M${-W - 12} -100q${W + 12} -4 ${2 * W + 24} 0z`]);
          trough(-W - 24); trough(W + 24);
        }
      } else {
        // steps up to a stone portal with glazed doors, handrails, a lamp each side
        const W = 56, n = 6, rise = 3.6;
        for (let i = 0; i < n; i++) body.push(['@stone.' + (i % 2 ? 1 : 0), rect(-W + i * 2, -(i + 1) * rise, 2 * (W - i * 2), rise)], ['@stone.2', rect(-W + i * 2, -(i + 1) * rise, 2 * (W - i * 2), .9)]);
        const ty = -n * rise;
        body.push(['@stone.0', rect(-46, ty - 92, 92, 92)], ['@stone.3', rect(30, ty - 92, 16, 92), .3], ['@stone.2', rect(-50, ty - 98, 100, 7)], ['@stone.1', rect(-50, ty - 92, 100, 1.4)]);
        body.push(['@stone.1', `M-34 ${ty}V${ty - 58}A34 34 0 0 1 34 ${ty - 58}V${ty}z`], ['@door.0', `M-30 ${ty}V${ty - 58}A30 30 0 0 1 30 ${ty - 58}V${ty}z`]);
        body.push({ f: '@glass.0', d: `M-28 ${ty - 56}A28 28 0 0 1 28 ${ty - 56}z`, glow: 'window' }, { f: '@glass.0', d: rect(-26, ty - 52, 24, 48), glow: 'window' }, { f: '@glass.0', d: rect(2, ty - 52, 24, 48), glow: 'window' }, { s: '@door.1', w: 1.2, d: `M0 ${ty}V${ty - 84}M-28 ${ty - 56}H28` }, ['@stone.2', `M-4 ${ty - 88}h8l-1 8h-6z`]);
        body.push({ s: '@iron.0', w: 1.4, d: `M${-W + 4} -2L-40 ${ty - 22}M${W - 4} -2L40 ${ty - 22}` }, { s: '@iron.0', w: .8, d: `M${-W + 4} -2v-22M-40 ${ty}v-22M${W - 4} -2v-22M40 ${ty}v-22` });
        for (const sx of [-1, 1]) { const lx = sx * 40; body.push({ s: '@iron.0', w: 1.4, d: `M${lx} ${ty - 70}h${sx * 8}` }, ['@iron.0', `M${lx + sx * 8 - 5} ${ty - 76}h10l-2 -4h-6z`], { f: '@lamp', d: `M${lx + sx * 8 - 4} ${ty - 76}h8l-1.4 10h-5.2z`, glow: 'lamp' }); lit.push(wash(lx + sx * 8, ty - 70, 24, 24, .5, '@halo')); }
        lit.push(wash(0, ty - 30, 46, 40, .3, '@halo'), wash(0, -4, 70, 12, .4, '@halo'));
        if (winter) for (let i = 0; i < n; i++) body.push(['@snow.0', rect(-W + i * 2 + 4, -(i + 1) * rise - .6, 2 * (W - i * 2) - 8, 1.2), .9]);
        trough(-W - 14); trough(W + 14);
      }
      if (s === 'autumn') { let lv = '', lv2 = ''; for (let i = 0; i < 16; i++) { const d = ell(rr(r, -70, 70), rr(r, -1.5, 1), rr(r, 1.2, 2), .9); if (i & 1) lv += d; else lv2 += d; } body.push(['@bloom.0', lv, .9], ['@bloom.1', lv2, .9]); }
      return { lit, body };
    },
  });
})();
