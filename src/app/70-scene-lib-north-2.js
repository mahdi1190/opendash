/* ============================================================
   SCENE LIBRARY: the North, part 2: the Peak District (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build runs lazily,
   once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint <id>; LOOK with: object sheet <id>.

     rock.gritstone-edge        a long gritstone edge (Stanage-type): buttresses with bedding planes and
                                cracks, the moor on top, a talus of boulders and bracken below (4 variants;
                                v1 and v3 with abandoned millstones); grass tufts sway
     landmark.ladybower-dam     the reservoir from the water: the stone-pitched dam face, the crest wall and
                                its lamps, the two bellmouth overflows (the water pours), wooded hills either end
     structure.drystone-wall    a gritstone drystone wall with cope stones and through-stones (4 variants:
                                level, climbing, a squeeze stile, a tumbled gap); grass at its foot sways
     plant.moor-heather         a moorland heather patch (purple in late summer, russet in autumn)
     plant.bilberry             a low bilberry patch (berries in summer, crimson in autumn, bare stems in winter)
     animal.sheep-moor          hill sheep: a horned black-faced ewe, a white-faced fell ewe with dark patches, a lamb
     person.climber             a boulderer at the foot of a gritstone block, a crash pad behind (shared people builder)
     structure.packhorse-bridge a narrow stone packhorse bridge over a beck (one arch, or two)
   Lit from the LEFT. Every object draws four seasons (snow lies on tops in winter).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1, rect = SD.rect, ell = SD.ell, poly = SD.poly;
  const SNOW = '#eef2f6';
  const snow = (season, d, op) => (season === 'winter' ? { f: SNOW, d, op: op || 0.95 } : null);
  /** Seasonal moorland colours: grass, heather, bracken, moss. */
  const MOOR = {
    grass: { spring: ['#7a9a4e', '#5a7a3a', '#9ab866'], summer: ['#6a8a3e', '#4e6e30', '#8aa856'], autumn: ['#a08a4a', '#7a6838', '#c0a860'], winter: ['#7a7a62', '#5e5e4c', '#9a9a80'] },
    heath: { spring: ['#5a5236', '#463e2a', '#6e6a44'], summer: ['#8a4e8a', '#5e3a5e', '#b07ab0'], autumn: ['#7a4a30', '#5a3424', '#9a6040'], winter: ['#4a3e34', '#382e26', '#5e5246'] },
    bracken: { spring: ['#7aa04a', '#5a8036', '#a0c066'], summer: ['#4e7a30', '#3a5e24', '#6a9a40'], autumn: ['#b0602a', '#8a4620', '#d08040'], winter: ['#8a5a3a', '#6a4430', '#a8785a'] },
    moss: { spring: ['#7a9a3a'], summer: ['#6a8a34'], autumn: ['#8a8a3a'], winter: ['#5a6a3a'] },
  };
  const pal = (base, keys) => { const o = {}; for (const k of keys) o[k] = MOOR[k]; return Object.assign({ base }, SD.seasons(o)); };
  const GRIT = ['#8a8274', '#6a6458', '#a8a092', '#4e4a42', '#c0b8a8'];
  const tuft = (r, x, y, h, slot) => ({ s: slot || '@grass.0', w: 0.9, d: Array.from({ length: 4 }, (_, i) => `M${f1(x + i * 1.2)} ${f1(y)}q${f1((i - 1.5) * 1.5)} ${f1(-h * 0.6)} ${f1((i - 1.5) * 2.4 + r())} ${f1(-h)}`).join('') });

  /* =======================================================================================
     rock.gritstone-edge
     ======================================================================================= */
  SD.define({
    id: 'rock.gritstone-edge', category: 'rock', size: [900, 240], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: pal({ grit: GRIT, path: ['#c8b898'], mill: ['#a49a88', '#7a7266'] }, ['grass', 'heath', 'bracken', 'moss']),
    parts: ['body', 'tufts'], anim: { sway: { part: 'tufts', pivot: [0, -10], deg: 2 } },
    tags: ['uk', 'peak', 'peak-district', 'gritstone', 'edge', 'moor', 'climbing', 'stanage', 'natural', 'kit:temperate', 'kit:alpine', 'role:rock'],
    credit: 'native: a Peak District gritstone edge (Stanage-type), generic',
    build(v, r, ctx) {
      const b = [], tufts = [], L = 450, base = -96;
      // the talus slope: bracken and grass, rising to the foot of the crag
      b.push(['@bracken.0', `M${-L} 0V${base + 20}Q${-L / 2} ${base - 4} 0 ${base + 6}Q${L / 2} ${base + 14} ${L} ${base + 4}V0z`]);
      b.push(['@grass.0', `M${-L} 0V-30Q${-200} -40 0 -26Q${250} -14 ${L} -36V0z`]);
      for (let i = 0; i < 18; i++) b.push(['@bracken.' + (i % 3), SD.blob(r, -L + 20 + i * 50 + r() * 20, base + 30 + r() * 40, 18 + r() * 14, 7, 7, 0.4)]);
      // the moor on top
      const topY = x => -196 - 10 * Math.sin(x / 140 + v) - 4 * Math.sin(x / 37);
      b.push(['@heath.0', `M${-L} ${base}V${f1(topY(-L) - 14)}` + Array.from({ length: 19 }, (_, i) => `L${-L + i * 50} ${f1(topY(-L + i * 50) - 12)}`).join('') + `L${L} ${base}z`]);
      // buttresses: blocky, rounded tops, uneven heights (the moor shows behind the lower ones)
      let x = -L + 10;
      while (x < L - 20) {
        const w = 60 + r() * 80, t = topY(x + w / 2) + 26 + r() * 34, bt = base + (r() - 0.5) * 12, over = r() < 0.35 ? 5 + r() * 6 : 0, rr = 6 + r() * 8;
        b.push(['@grit.' + (r() < 0.5 ? 0 : 1), `M${f1(x)} ${f1(bt)}L${f1(x + 1)} ${f1(t + rr + 8)}L${f1(x - over)} ${f1(t + rr)}Q${f1(x - over)} ${f1(t)} ${f1(x + rr)} ${f1(t)}L${f1(x + w - rr)} ${f1(t + 2)}Q${f1(x + w + over * 0.4)} ${f1(t + 2)} ${f1(x + w + over * 0.4)} ${f1(t + rr + 2)}L${f1(x + w)} ${f1(bt)}z`]);
        b.push({ f: '@grit.2', d: poly([[x + 1, t + rr + 8], [x + 4, t + 6], [x + w * 0.5, t + 4], [x + w * 0.3, t + 14]]), op: 0.45 });
        b.push({ f: '@grit.3', d: poly([[x + w - 9, bt], [x + w - 7, t + rr], [x + w, t + rr + 4], [x + w, bt]]), op: 0.45 });
        let beds = ''; for (let y = t + 18 + r() * 12; y < bt - 8; y += 18 + r() * 22) { const s0 = x + 3 + r() * w * 0.3; beds += `M${f1(s0)} ${f1(y)}h${f1(w * (0.3 + r() * 0.5))}`; }
        b.push({ s: '@grit.3', w: 1.1, op: 0.55, d: beds });
        b.push({ s: '@grit.3', w: 1.6, op: 0.8, d: `M${f1(x + w * (0.3 + r() * 0.4))} ${f1(t + 3)}l${f1((r() - 0.5) * 6)} ${f1((bt - t) * (0.5 + r() * 0.5) - 6)}` });
        b.push({ f: '@moss.0', d: SD.blob(r, x + w * 0.5, bt - 6, w * 0.3, 4, 6, 0.4), op: 0.6, detail: true });
        b.push({ f: '@heath.0', d: SD.blob(r, x + w * 0.5, t + 1, w * 0.3, 2.4, 6, 0.3), op: 0.9 });
        b.push(snow(ctx.season, `M${f1(x - over + 1)} ${f1(t + rr)}Q${f1(x - over)} ${f1(t - 1)} ${f1(x + rr)} ${f1(t - 1)}L${f1(x + w - rr)} ${f1(t + 1)}Q${f1(x + w)} ${f1(t + 1)} ${f1(x + w)} ${f1(t + rr)}Q${f1(x + w / 2)} ${f1(t + 3)} ${f1(x - over + 1)} ${f1(t + rr)}z`));
        x += w - 6 + r() * 8;
      }
      // the gully shadows between and the path along the foot
      b.push({ s: '@path.0', w: 2.4, op: 0.85, d: `M${-L} ${base + 30}Q${-100} ${base + 14} ${L} ${base + 26}` });
      // the talus boulders, and abandoned millstones (v1, v3)
      for (let i = 0; i < 14; i++) { const bx = -L + 30 + r() * (2 * L - 60), by = base + 18 + r() * 60, s = 8 + r() * 16; b.push(['@grit.' + (i % 3), SD.blob(r, bx, by - s * 0.4, s, s * 0.55, 7, 0.25)], { f: '@grit.3', d: ell(bx + s * 0.2, by - s * 0.1, s * 0.7, s * 0.2), op: 0.4 }); }
      if (v % 2 === 1) for (const mx of [-180, -150, 120]) { b.push(['@mill.0', ell(mx, -54, 16, 16)], ['@mill.1', ell(mx, -54, 4, 4)], { s: '@mill.1', w: 1, op: 0.6, d: ell(mx, -54, 12, 12) }); }
      b.push(snow(ctx.season, `M${-L} ${f1(topY(-L) - 14)}` + Array.from({ length: 19 }, (_, i) => `L${-L + i * 50} ${f1(topY(-L + i * 50) - 12)}`).join('') + Array.from({ length: 19 }, (_, i) => `L${L - i * 50} ${f1(topY(L - i * 50) - 6)}`).join('') + 'z', 0.85));
      for (let i = 0; i < 16; i++) tufts.push(tuft(r, -L + 20 + i * 56 + r() * 20, -10 - r() * 20, 8 + r() * 6));
      return { body: b, tufts };
    },
  });

  /* =======================================================================================
     landmark.ladybower-dam: from the water: the stone-pitched upstream face, the crest wall
     with its lamps, the two bellmouth overflows (water pours into them), wooded hills at
     either end.
     ======================================================================================= */
  SD.define({
    id: 'landmark.ladybower-dam', category: 'landmark', size: [920, 190], variants: 1, seasonal: true, shapeBySeason: true, flippable: false,
    palette: pal({ stone: ['#b0a690', '#8a8270', '#cfc6b0', '#6a6252'], water: ['#3e5a66', '#6a8a96', '#c8dce4', '#24343c'], pine: ['#2a4030', '#1e3024', '#3a5440'], lamp: ['#2a2a2a', '#f0e6c8'], flood: '#ffe2a8' }, ['grass', 'bracken']),
    night: { glow: { window: '#ffd98a', lamp: '#ffe6a8' }, on: 0.9 },
    parts: ['body', 'pour', 'lit'], anim: { flicker: { part: 'pour', op: [0.55, 1], period: 1.2 } },
    shadow: { rx: 440, ry: 10, h: 80 }, reflect: true,
    tags: ['landmark', 'signature', 'place:uk/ladybower', 'uk', 'peak', 'peak-district', 'reservoir', 'dam', 'water', 'kit:temperate', 'kit:water'],
    credit: 'native: Ladybower Reservoir dam and its bellmouth overflows (stylised)',
    build(v, r, ctx) {
      const b = [], pour = [], lit = [], L = 460, crest = -88, wl = -44;
      // wooded hills at either end
      b.push(['@grass.1', `M${-L} ${wl}V-170Q${-L + 60} -184 ${-L + 120} -150Q${-L + 160} -120 ${-L + 200} ${crest}V${wl}z`]);
      b.push(['@grass.1', `M${L} ${wl}V-160Q${L - 70} -176 ${L - 130} -140Q${L - 170} -110 ${L - 210} ${crest}V${wl}z`]);
      b.push(['@bracken.0', `M${-L} -120Q${-L + 70} -136 ${-L + 150} -110L${-L + 190} ${crest}H${-L}z`, 0.7], ['@bracken.0', `M${L} -110Q${L - 80} -124 ${L - 160} -104L${L - 200} ${crest}H${L}z`, 0.7]);
      for (let i = 0; i < 26; i++) {
        const left = i < 13, k = i % 13, px = left ? -L + 10 + k * 15 + r() * 6 : L - 10 - k * 15 - r() * 6, py = left ? -170 + k * 6 + 30 : -160 + k * 5 + 30, h = 22 + r() * 14;
        b.push(['@pine.' + (i % 3), `M${f1(px)} ${f1(py - h)}L${f1(px + 7)} ${f1(py)}H${f1(px - 7)}z`]);
        b.push(snow(ctx.season, `M${f1(px)} ${f1(py - h)}L${f1(px + 3)} ${f1(py - h * 0.6)}H${f1(px - 3)}z`, 0.8));
      }
      // the dam: crest road, parapet wall with coping, the stone-pitched face down into the water
      const x0 = -L + 190, x1 = L - 200;
      b.push(['@stone.1', poly([[x0 - 10, wl], [x0, crest + 6], [x1, crest + 6], [x1 + 10, wl]])]);
      b.push({ s: '@stone.3', w: 0.6, op: 0.5, d: Array.from({ length: 6 }, (_, i) => `M${x0 - i * 2} ${crest + 12 + i * 6}H${x1 + i * 2}`).join('') });
      b.push({ s: '@stone.3', w: 0.5, op: 0.35, detail: true, d: Array.from({ length: 40 }, (_, i) => `M${f1(x0 + i * (x1 - x0) / 40)} ${crest + 8}v${f1(30 + (i % 3) * 4)}`).join('') });
      b.push(['@stone.0', rect(x0, crest - 4, x1 - x0, 10)], ['@stone.2', rect(x0, crest - 12, x1 - x0, 8)], ['@stone.3', rect(x0, crest - 13, x1 - x0, 2)]);
      b.push({ s: '@stone.3', w: 0.6, op: 0.5, d: Array.from({ length: 60 }, (_, i) => `M${f1(x0 + i * (x1 - x0) / 60)} ${crest - 12}v8`).join('') });
      b.push(snow(ctx.season, rect(x0, crest - 15, x1 - x0, 3)));
      // crest lamps
      for (let i = 0; i <= 9; i++) {
        const lx = x0 + 10 + i * (x1 - x0 - 20) / 9;
        b.push(['@lamp.0', rect(lx - 1, crest - 40, 2, 28)], ['@lamp.0', rect(lx - 4, crest - 44, 8, 4)], { f: '@lamp.1', d: rect(lx - 3, crest - 42, 6, 3), glow: 'lamp' });
        lit.push({ f: { rad: [[0, '@flood', 0.5], [1, '@flood', 0]], cx: lx, cy: crest - 40, r: 26 }, d: rect(lx - 26, crest - 66, 52, 52) });
      }
      // the water
      b.push({ f: { lin: [[0, '@water.1'], [1, '@water.0']], x1: 0, y1: wl, x2: 0, y2: 0 }, d: rect(-L, wl, 2 * L, -wl) });
      b.push({ s: '@water.2', w: 0.8, op: 0.45, d: Array.from({ length: 14 }, (_, i) => `M${f1(-L + r() * 2 * L)} ${f1(wl + 3 + i * 3)}h${f1(20 + r() * 40)}`).join('') });
      // the two bellmouths: a stone ring, the dark throat, the water curtain pouring in
      for (const bx of [-120, 70]) {
        b.push(['@stone.2', ell(bx, -20, 46, 9)], ['@stone.3', ell(bx, -20, 38, 7)], ['@water.3', ell(bx, -19, 30, 5)]);
        b.push({ s: '@stone.1', w: 0.7, op: 0.6, d: Array.from({ length: 16 }, (_, i) => { const a = i * Math.PI / 8; return `M${f1(bx + Math.cos(a) * 38)} ${f1(-20 + Math.sin(a) * 7)}L${f1(bx + Math.cos(a) * 46)} ${f1(-20 + Math.sin(a) * 9)}`; }).join('') });
        pour.push({ f: '@water.2', d: `M${bx - 38} -20Q${bx} -12 ${bx + 38} -20Q${bx + 30} -16 ${bx + 28} -19Q${bx} -12 ${bx - 28} -19Q${bx - 30} -16 ${bx - 38} -20z`, op: 0.85 }, { f: '@water.2', d: ell(bx, -22, 40, 2), op: 0.5 });
        lit.push({ f: { rad: [[0, '@flood', 0.25], [1, '@flood', 0]], cx: bx, cy: -20, r: 50 }, d: rect(bx - 50, -40, 100, 40) });
      }
      return { body: b, pour, lit };
    },
  });

  /* =======================================================================================
     structure.drystone-wall
     ======================================================================================= */
  SD.define({
    id: 'structure.drystone-wall', category: 'structure', size: [330, 70], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: pal({ grit: GRIT }, ['grass', 'moss']),
    parts: ['body', 'tufts'], anim: { sway: { part: 'tufts', pivot: [0, -2], deg: 3 } },
    tags: ['uk', 'peak', 'peak-district', 'dales', 'drystone', 'wall', 'field', 'moor', 'kit:temperate', 'role:edge'],
    credit: 'native: a gritstone drystone wall',
    build(v, r, ctx) {
      const b = [], tufts = [], L = 160, H = 44, slope = v === 1 ? 0.14 : 0;
      const gy = x => -(x + L) * slope;
      const gap = v === 2 ? [-12, 6] : v === 3 ? [20, 70] : null;
      b.push(['@grass.1', `M${-L - 6} 4V${f1(gy(-L - 6) - 4)}L${L + 6} ${f1(gy(L + 6) - 4)}V4z`]);
      // stones course by course, three tones, batter (the wall narrows to the top)
      const groups = ['', '', ''];
      let joints = '';
      for (let c = 0; c < 6; c++) {
        const y1 = -c * (H / 6), hh = H / 6;
        let x = -L + (c % 2) * 6;
        while (x < L) {
          const w = 10 + r() * 14, xe = Math.min(L, x + w);
          const inGap = gap && x + w > gap[0] && x < gap[1] && (v === 2 || c > 1);
          if (!inGap) { const g = gy((x + xe) / 2); groups[Math.floor(r() * 3)] += poly([[x + 0.6, y1 + g], [x + 1, y1 - hh + 1 + g + r()], [xe - 1, y1 - hh + 1 + g + r()], [xe - 0.6, y1 + g]]); joints += `M${f1(x)} ${f1(y1 + g)}v${f1(-hh)}`; }
          x = xe;
        }
      }
      groups.forEach((d, k) => b.push({ f: '@grit.' + [0, 1, 2][k], d }));
      b.push({ s: '@grit.3', w: 0.6, op: 0.6, d: joints, detail: true });
      // through-stones and the upright cope stones
      for (const tx of [-110, -10, 90]) if (!gap || tx < gap[0] - 10 || tx > gap[1] + 10) b.push(['@grit.4', rect(tx, -H / 2 - 4 + gy(tx), 18, 4)]);
      let cope = '', copeHi = '';
      for (let x = -L; x < L; x += 5) { if (gap && x > gap[0] - 4 && x < gap[1]) continue; const g = gy(x), h = 7 + r() * 3; cope += poly([[x, -H + g], [x + 0.6, -H - h + g], [x + 4.4, -H - h + 1 + g], [x + 5, -H + g]]); if (r() < 0.4) copeHi += rect(x + 0.8, -H - h + 1 + g, 1.4, h - 1); }
      b.push(['@grit.1', cope], { f: '@grit.4', d: copeHi, op: 0.5 });
      if (v === 2) b.push(['@grit.2', rect(gap[0] - 4, -H - 10 + gy(gap[0]), 4, H + 10)], ['@grit.2', rect(gap[1], -H - 10 + gy(gap[1]), 4, H + 10)]);
      if (v === 3) for (let i = 0; i < 6; i++) b.push(['@grit.' + (i % 3), SD.blob(r, gap[0] + 6 + r() * 46, -2 - r() * 6, 5 + r() * 3, 3, 6, 0.3)]);
      for (let i = 0; i < 8; i++) b.push({ f: '@moss.0', d: SD.blob(r, -L + 20 + r() * 2 * L - 40, -6 - r() * 30 + gy(0), 5 + r() * 6, 2.6, 6, 0.4), op: 0.7 });
      b.push(snow(ctx.season, `M${-L} ${f1(-H - 9)}L${L} ${f1(gy(L) - H - 9)}L${L} ${f1(gy(L) - H - 6)}L${-L} ${f1(-H - 6)}z`));
      for (let i = 0; i < 12; i++) { const tx = -L + 6 + i * 28 + r() * 10; tufts.push(tuft(r, tx, gy(tx) + 2, 6 + r() * 5)); }
      return { body: b, tufts };
    },
  });

  /* =======================================================================================
     plant.moor-heather and plant.bilberry
     ======================================================================================= */
  SD.define({
    id: 'plant.moor-heather', category: 'plant', size: [130, 34], variants: 4, seasonal: true, shapeBySeason: true, flippable: true,
    palette: pal({ stem: ['#3a2e24'] }, ['heath', 'grass']),
    parts: ['body'], anim: { sway: { part: 'body', pivot: [0, 0], deg: 1.4 } },
    tags: ['uk', 'peak', 'moor', 'heather', 'ling', 'kit:temperate', 'role:ground'],
    credit: 'native: moorland heather (ling)',
    build(v, r, ctx) {
      const b = [], W = 50 + v * 6, n = 7 + v;
      b.push(['@grass.1', ell(0, 0, W + 6, 3)]);
      for (let i = 0; i < n; i++) { const x = -W + (2 * W) * (i + 0.5) / n + (r() - 0.5) * 8, h = 12 + r() * 16; b.push(['@heath.' + (i % 2 ? 1 : 0), SD.blob(r, x, -h * 0.5, 9 + r() * 6, h * 0.55, 8, 0.45)]); }
      for (let i = 0; i < n; i++) { const x = -W + (2 * W) * (i + 0.3) / n, h = 14 + r() * 12; b.push({ f: '@heath.2', d: SD.blob(r, x, -h * 0.7, 6, h * 0.3, 7, 0.5), op: 0.8 }); }
      if (ctx.season === 'summer') { let d = ''; for (let i = 0; i < 40; i++) d += ell(-W + r() * 2 * W, -6 - r() * 22, 1.1, 1.6); b.push({ f: '#c890d0', d, op: 0.9 }); }
      b.push({ s: '@stem', w: 0.5, op: 0.6, d: Array.from({ length: 10 }, (_, i) => `M${f1(-W + i * W / 5)} 0l${f1((r() - 0.5) * 4)} -6`).join(''), detail: true });
      b.push(snow(ctx.season, Array.from({ length: n }, (_, i) => ell(-W + (2 * W) * (i + 0.5) / n, -18 - r() * 6, 7, 2)).join(''), 0.8));
      return { body: b };
    },
  });
  SD.define({
    id: 'plant.bilberry', category: 'plant', size: [80, 28], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { stem: ['#4e7a3a', '#3a5a2a'], berry: ['#2e2e5a', '#4a4a8a'], flower: ['#e8a0a8'] } }, SD.seasons({ leaf: { spring: ['#8ac05a', '#6aa040', '#a8d878'], summer: ['#4e8a3a', '#3a6e2c', '#6aa84a'], autumn: ['#b8302a', '#8a2420', '#d8603a'], winter: ['#5a6a3a', '#4a5a30', '#6a7a46'] } })),
    parts: ['body'], anim: { sway: { part: 'body', pivot: [0, 0], deg: 2 } },
    tags: ['uk', 'peak', 'moor', 'bilberry', 'whinberry', 'kit:temperate', 'role:ground'],
    credit: 'native: bilberry (whinberry) on the moor',
    build(v, r, ctx) {
      const b = [], W = 30 + v * 6, s = ctx.season;
      let stems = ''; for (let i = 0; i < 14; i++) { const x = -W + r() * 2 * W, h = 10 + r() * 14; stems += `M${f1(x)} 0q${f1((r() - 0.5) * 6)} ${f1(-h * 0.5)} ${f1((r() - 0.5) * 10)} ${f1(-h)}`; }
      b.push({ s: '@stem.0', w: 1, d: stems });
      if (s !== 'winter') {
        const leaves = ['', '', '']; for (let i = 0; i < 70; i++) { const x = -W + r() * 2 * W, y = -3 - r() * 20; leaves[i % 3] += SD.leaf(x, y, r() * 6.28, 3 + r() * 2, 1.4); }
        leaves.forEach((d, k) => b.push({ f: '@leaf.' + k, d }));
      } else b.push({ s: '@stem.1', w: 0.6, d: Array.from({ length: 16 }, () => `M${f1(-W + r() * 2 * W)} ${f1(-4 - r() * 14)}l${f1((r() - 0.5) * 6)} -4`).join('') }, { f: '@leaf.0', d: SD.blob(r, 0, -4, W, 4, 7, 0.4), op: 0.5 });
      if (s === 'summer') { let d = ''; for (let i = 0; i < 16; i++) d += ell(-W + r() * 2 * W, -4 - r() * 14, 1.5, 1.5); b.push({ f: '@berry.0', d }, { f: '@berry.1', d: ell(-4, -10, 0.6, 0.6) + ell(8, -7, 0.6, 0.6), op: 0.8, detail: true }); }
      if (s === 'spring') { let d = ''; for (let i = 0; i < 10; i++) d += ell(-W + r() * 2 * W, -4 - r() * 14, 1, 1.4); b.push({ f: '@flower.0', d }); }
      b.push(snow(s, SD.blob(r, 0, -10, W * 0.8, 3, 7, 0.4), 0.85));
      return { body: b };
    },
  });

  /* =======================================================================================
     animal.sheep-moor: v0 a horned black-faced ewe with a white muzzle, v1 a hornless
     white-faced fell ewe with dark patches, v2 a lamb. Shaggy in winter, shorn in summer.
     ======================================================================================= */
  SD.define({
    id: 'animal.sheep-moor', category: 'animal', size: [96, 66], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    palette: Object.assign({ base: { face: ['#1e1a18', '#f0eadc', '#3a3430'], horn: ['#c8b890', '#8a7a58'], leg: ['#2a2420', '#e8e0d0'], mark: ['#b83a30'] } }, SD.seasons({ wool: { spring: ['#d8d0bc', '#b0a690', '#e8e0cc'], summer: ['#eeeae0', '#cac2b2', '#f8f6f0'], autumn: ['#e2dccc', '#bab2a0', '#f0ece2'], winter: ['#c8c0aa', '#a29882', '#dad2bc'] } })),
    parts: ['legsFar', 'body', 'legsNear', 'head'], anim: { turn: { part: 'head', pivot: [24, -42], deg: 16, period: 7, hold: 0.7 } },
    shadow: { rx: 36, ry: 5, h: 56 },
    tags: ['uk', 'peak', 'moor', 'hill', 'sheep', 'grazing', 'kit:animals', 'kit:temperate', 'role:animal'],
    credit: 'native: hill sheep of the Peak and the Dales',
    build(v, r, ctx) {
      const s = ctx.season, k = v === 2 ? 0.62 : 1, shorn = s === 'summer' && v !== 2, shag = s === 'winter' || s === 'spring';
      const P = (x, y) => [f1(x * k), f1(y * k)];
      const rx = (shorn ? 30 : 36) * k, ry = (shorn ? 16 : 20) * k, cy = -34 * k;
      const leg = v === 0 ? '@leg.0' : '@leg.1';
      const L = x => poly([P(x - 3, -22), P(x - 2.2, 0), P(x + 2.2, 0), P(x + 3, -22)]);
      const legsFar = [{ f: leg, d: L(-14) + L(12), op: 0.85 }, { f: '@face.0', d: rect(-16 * k, -2 * k, 5 * k, 2 * k) + rect(10 * k, -2 * k, 5 * k, 2 * k) }];
      const legsNear = [{ f: leg, d: L(-20) + L(18) }, { f: '@face.0', d: rect(-22.6 * k, -2 * k, 5 * k, 2 * k) + rect(15.4 * k, -2 * k, 5 * k, 2 * k) }];
      const body = [['@wool.1', SD.blob(r, 0, cy + 2 * k, rx, ry, shag ? 14 : 10, shag ? 0.4 : 0.2)], ['@wool.0', SD.blob(r, -2 * k, cy, rx * 0.92, ry * 0.88, shag ? 14 : 10, shag ? 0.35 : 0.15)], ['@wool.2', SD.blob(r, -8 * k, cy - ry * 0.4, rx * 0.5, ry * 0.35, 8, 0.3), 0.8]];
      if (shag) body.push({ s: '@wool.1', w: 0.8, op: 0.7, d: Array.from({ length: 10 }, (_, i) => `M${f1((-rx + i * rx / 5))} ${f1(cy + ry * 0.6)}q1 ${f1(4 * k)} ${f1(-1)} ${f1(7 * k)}`).join(''), detail: true });
      if (v !== 2) body.push({ f: '@mark.0', d: SD.blob(r, -10 * k, cy - ry * 0.5, 5, 3, 6, 0.3), op: 0.75 });
      body.push(['@wool.1', SD.blob(r, -rx + 2, cy - 2, 4, 6, 6, 0.4)]);
      // the head: neck, face, ears, horns
      const hx = 30 * k, hy = -50 * k, face = v === 1 ? '@face.1' : '@face.0';
      const head = [['@wool.0', poly([P(18, -48), P(26, -56), P(32, -50), P(24, -38)])],
        { f: face, d: `M${f1(hx - 4 * k)} ${f1(hy - 6 * k)}Q${f1(hx + 8 * k)} ${f1(hy - 8 * k)} ${f1(hx + 11 * k)} ${f1(hy + 6 * k)}Q${f1(hx + 8 * k)} ${f1(hy + 10 * k)} ${f1(hx + 2 * k)} ${f1(hy + 6 * k)}Q${f1(hx - 6 * k)} ${f1(hy + 2 * k)} ${f1(hx - 4 * k)} ${f1(hy - 6 * k)}z` },
        { f: face, d: poly([P(26, -55), P(19, -58), P(20, -54)]) }];
      if (v === 0) head.push({ f: '@face.1', d: ell(hx + 8.6 * k, hy + 5 * k, 3 * k, 2.4 * k) }, { s: '@horn.0', w: 2.6, d: `M${f1(hx - 1)} ${f1(hy - 5)}c-6 -4 -12 2 -8 7c3 4 8 1 6 -2` }, { s: '@horn.1', w: 0.6, op: 0.7, d: `M${f1(hx - 3)} ${f1(hy - 7)}l1 2M${f1(hx - 7)} ${f1(hy - 6)}l1 2`, detail: true });
      if (v === 1) head.push({ f: '@face.0', d: ell(hx + 2, hy - 1, 2.6, 2) + ell(hx + 8.8, hy + 5.4, 2.4, 1.8), op: 0.85 });
      if (v === 2) head.push({ f: '@face.0', d: ell(hx + 6.4 * k, hy + 4 * k, 1.6, 1.2), op: 0.6 });
      const sn = snow(s, SD.blob(r, -4 * k, cy - ry * 0.85, rx * 0.6, 3, 7, 0.3), 0.7);
      if (sn) body.push(sn);
      return { legsFar, body, legsNear, head };
    },
  });

  /* =======================================================================================
     structure.packhorse-bridge: a narrow stone packhorse bridge over a beck, low parapets,
     voussoirs; v0 one arch, v1 two arches.
     ======================================================================================= */
  SD.define({
    id: 'structure.packhorse-bridge', category: 'structure', size: [240, 80], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    palette: pal({ grit: GRIT, water: ['#3e5660', '#6a8a94', '#d0e2e8'] }, ['grass', 'moss']),
    parts: ['body', 'glint'], anim: { flicker: { part: 'glint', op: [0.25, 1], period: 1.6 } },
    shadow: { rx: 100, ry: 8, h: 60 }, reflect: true,
    tags: ['uk', 'peak', 'peak-district', 'dales', 'bridge', 'packhorse', 'stream', 'kit:temperate', 'kit:water', 'role:building-mid'],
    credit: 'native: a Peak District packhorse bridge',
    build(v, r, ctx) {
      const b = [], g = [], L = 116, deck = -54;
      const arches = v === 0 ? [[0, 30, 30]] : [[-38, 22, 22], [38, 22, 22]];
      b.push(['@water.0', rect(-L, -10, 2 * L, 10)], ['@water.1', rect(-L, -10, 2 * L, 2), 0.7]);
      // the body of the bridge with the arch openings cut by drawing the beck behind
      const hump = x => -10 - 48 * Math.pow(Math.cos(Math.PI * x / (2 * L)), 0.8);
      let top = ''; for (let x = -L; x <= L; x += 8) top += `L${f1(x)} ${f1(hump(x))}`;
      b.push(['@grit.0', `M${-L} -8` + top + `L${L} -8z`]);
      for (const [ax, rx, ry] of arches) {
        b.push(['@water.0', `M${ax - rx} -8V-10Q${ax - rx} ${-10 - ry * 1.25} ${ax} ${-10 - ry * 1.25}Q${ax + rx} ${-10 - ry * 1.25} ${ax + rx} -10V-8z`]);
        b.push({ f: '@grit.3', d: `M${ax - rx} -10Q${ax - rx} ${-10 - ry * 1.25} ${ax} ${-10 - ry * 1.25}Q${ax + rx} ${-10 - ry * 1.25} ${ax + rx} -10H${ax + rx - 6}Q${ax + rx - 6} ${-14 - ry} ${ax} ${-14 - ry}Q${ax - rx + 6} ${-14 - ry} ${ax - rx + 6} -10z`, op: 0.55 });
        let vs = ''; for (let i = 0; i <= 12; i++) { const a = Math.PI * (1 - i / 12), cx = ax + Math.cos(a) * rx, cy = -10 - Math.sin(a) * ry * 1.0; vs += `M${f1(cx)} ${f1(cy)}L${f1(ax + Math.cos(a) * (rx + 7))} ${f1(-10 - Math.sin(a) * (ry + 7))}`; }
        b.push({ s: '@grit.3', w: 0.9, op: 0.8, d: vs }, { s: '@grit.2', w: 2.4, d: `M${ax - rx - 3} -10Q${ax - rx - 3} ${-14 - ry * 1.32} ${ax} ${-14 - ry * 1.32}Q${ax + rx + 3} ${-14 - ry * 1.32} ${ax + rx + 3} -10`, op: 0.7 });
        g.push({ f: '@water.2', d: ell(ax - 6, -5, rx * 0.5, 1), op: 0.7 });
      }
      b.push({ s: '@grit.3', w: 0.5, op: 0.4, detail: true, d: Array.from({ length: 6 }, (_, i) => { const y = -14 - i * 7; let xe = L; while (xe > 0 && hump(xe) > y - 2) xe -= 2; return xe > 4 ? `M${-xe} ${y}H${xe}` : ''; }).join('') });
      // parapets with coping, a little moss
      let par = ''; for (let x = -L; x <= L; x += 8) par += `L${f1(x)} ${f1(hump(x) - 10)}`;
      b.push(['@grit.1', `M${-L} ${f1(hump(-L))}` + par + top.split('L').filter(Boolean).reverse().map(p => 'L' + p).join('') + 'z']);
      b.push({ s: '@grit.4', w: 2, d: 'M' + par.slice(1) });
      b.push({ f: '@moss.0', d: SD.blob(r, -30, hump(-30) - 6, 14, 3, 6, 0.4) + SD.blob(r, 50, hump(50) - 5, 10, 3, 6, 0.4), op: 0.75 });
      b.push(snow(ctx.season, `M${-L} ${f1(hump(-L) - 13)}` + Array.from({ length: 30 }, (_, i) => `L${f1(-L + i * 8)} ${f1(hump(-L + i * 8) - 13)}`).join('') + Array.from({ length: 30 }, (_, i) => `L${f1(L - i * 8)} ${f1(hump(L - i * 8) - 10)}`).join('') + 'z'));
      b.push(['@grass.1', `M${-L - 6} -6Q${-L + 10} -16 ${-L + 34} -18L${-L + 40} -8z`], ['@grass.1', `M${L + 6} -6Q${L - 10} -16 ${L - 34} -18L${L - 40} -8z`], ['@grass.0', SD.blob(r, -L + 6, -10, 12, 5, 7, 0.4)], ['@grass.2', SD.blob(r, L - 8, -11, 12, 5, 7, 0.4)]);
      for (let i = 0; i < 6; i++) b.push(['@grit.' + (i % 3), SD.blob(r, -L + 20 + r() * 2 * L - 40, -3, 5 + r() * 4, 2.4, 6, 0.3)]);
      g.push({ f: '@water.2', d: ell(-L + 30, -4, 12, 0.8), op: 0.6 });
      return { body: b, glint: g };
    },
  });

  /* =======================================================================================
     person.climber: a boulderer at the foot of a gritstone block, reaching for the first
     holds; a chalk bag; a crash pad behind. On the shared people builder (scenePeople, which
     sorts after this file: it is only touched lazily, inside build() and the getters).
     ======================================================================================= */
  const CLIMB = [
    { build: 'slim', skin: 1, hair: { style: 'short', col: 2 },
      spring: { top: { kind: 'tee', col: 'teal' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'shoe', col: 'charcoal' } },
      summer: { top: { kind: 'tee', col: 'coral' }, bottom: { kind: 'shorts', col: 'khaki' }, shoes: { kind: 'shoe', col: 'charcoal' } },
      autumn: { top: { kind: 'hoodie', col: 'mustard' }, bottom: { kind: 'trousers', col: 'olive' }, shoes: { kind: 'shoe', col: 'charcoal' } },
      winter: { top: { kind: 'jacket', col: 'red' }, bottom: { kind: 'trousers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'charcoal' }, hat: { kind: 'beanie', col: 'navy' } } },
    { build: 'average', skin: 4, hair: { style: 'pony', col: 0 },
      spring: { top: { kind: 'jumper', col: 'plum' }, bottom: { kind: 'trousers', col: 'khaki' }, shoes: { kind: 'shoe', col: 'black' } },
      summer: { top: { kind: 'tee', col: 'yellow' }, bottom: { kind: 'trousers', col: 'stone' }, shoes: { kind: 'shoe', col: 'black' } },
      autumn: { top: { kind: 'hoodie', col: 'forest' }, bottom: { kind: 'trousers', col: 'tan' }, shoes: { kind: 'shoe', col: 'black' } },
      winter: { top: { kind: 'jacket', col: 'sky' }, bottom: { kind: 'trousers', col: 'black' }, shoes: { kind: 'shoe', col: 'black' }, hat: { kind: 'beanie', col: 'coral' } } },
    { build: 'slim', age: 'young', skin: 3, hair: { style: 'curly', col: 0 },
      spring: { top: { kind: 'tee', col: 'white' }, bottom: { kind: 'joggers', col: 'grey' }, shoes: { kind: 'shoe', col: 'red' } },
      summer: { top: { kind: 'tee', col: 'sky' }, bottom: { kind: 'shorts', col: 'navy' }, shoes: { kind: 'shoe', col: 'red' } },
      autumn: { top: { kind: 'hoodie', col: 'burgundy' }, bottom: { kind: 'joggers', col: 'charcoal' }, shoes: { kind: 'shoe', col: 'red' } },
      winter: { top: { kind: 'parka', col: 'olive' }, bottom: { kind: 'joggers', col: 'black' }, shoes: { kind: 'shoe', col: 'red' }, hat: { kind: 'beanie', col: 'mustard' } } },
  ];
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = (parts[k] || []).filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)); return parts; };
  sceneObjDefine({
    id: 'person.climber', category: 'person', size: [110, 84], variants: CLIMB.length, seasonal: true, shapeBySeason: true, flippable: true,
    get palette() { return this._pal || (this._pal = scenePeople.palette({ grit: GRIT, pad: ['#2e5a8a', '#1e3a5a', '#e2c23a'], chalk: ['#f4f2ee'], bag: ['#b83a30', '#7a2420'] })); },
    get night() { return scenePeople.NIGHT; },
    parts: ['rock', 'pad', 'legB', 'body', 'legA'],
    anim: { walk: { parts: ['legB', 'legA'], pivot: [0, -31.5], deg: 4, period: 3.2, bob: 0.6 } },
    shadow: { rx: 30, ry: 3, h: 64 }, detailPx: true,
    tags: ['uk', 'people', 'anonymous', 'peak', 'climbing', 'bouldering', 'gritstone', 'kit:people', 'kit:temperate', 'role:walker'],
    credit: 'the shared people builder (scenePeople.figure, arms reaching to the holds) with a gritstone block and a crash pad',
    build(v, r, ctx) {
      const PP = scenePeople, o = Object.assign({}, PP.outfit(CLIMB[v], ctx.season), { arms: { far: { hand: [9, -68] }, near: { hand: [13, -58] } } });
      const f = PP.figure(o);
      const rock = [['@grit.0', 'M8 0L6 -40Q4 -70 14 -80Q40 -88 74 -82Q96 -76 98 -50L100 0z'], ['@grit.2', 'M8 0L6 -40Q4 -70 14 -80Q18 -60 16 -30L18 0z', 0.6], ['@grit.3', 'M80 0L84 -60Q96 -66 98 -50L100 0z', 0.45]];
      rock.push({ s: '@grit.3', w: 1, op: 0.6, d: 'M10 -30H96M8 -54H98M30 -80L34 -54M60 -54L58 0' }, { f: '@chalk.0', d: ell(10, -68, 3, 1.4) + ell(14, -58, 2.6, 1.2) + ell(22, -76, 3, 1.4), op: 0.8 });
      const sn = snow(ctx.season, 'M14 -80Q40 -88 74 -82Q96 -76 98 -50Q90 -72 74 -78Q40 -84 14 -78z', 0.9);
      if (sn) rock.push(sn);
      const pad = [['@pad.0', 'M-46 0V-10Q-46 -14 -42 -14H-14Q-10 -14 -10 -10V0z'], ['@pad.1', rect(-46, -6, 36, 2)], { f: '@pad.2', d: rect(-30, -14, 4, 14), op: 0.8 }];
      const body = f.body.slice();
      body.splice(f.at.nearArm[0], 0, ['@bag.0', 'M-5.4 -34Q-6.4 -30 -4.4 -28.4Q-2.4 -28 -2 -31L-2.4 -34z'], { f: '@chalk.0', d: ell(-3.8, -34, 1.8, 0.6), detail: true });
      return tidy({ rock, pad, legB: f.legB, body, legA: f.legA });
    },
  });
})();
