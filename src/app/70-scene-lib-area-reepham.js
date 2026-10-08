/* ============================================================
   SCENE LIBRARY: area-reepham (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls inside this IIFE and nothing else; every build
   runs lazily, once per (variant, season), memoised by the core.

   The objects of the Reepham (Norfolk) area builder:
     landmark.reepham-market-place  the Georgian side of the Market Place: a tall red-brick house,
                                    a grander five-bay house with a porch, the long rendered coaching
                                    inn with its carriage arch, a shop with a Dutch gable, a gault-brick house
     landmark.reepham-churches      the two flint churches in one churchyard (St Michael's, Whitwell, and
                                    St Mary's, Reepham, joined by a low link) and the ruined wall of
                                    Hackford's church
     landmark.reepham-station       the old station on the Marriott's Way: the station house, the booking
                                    hall with its saw-tooth canopy, the platform and the goods shed
   Architecture only: no text, no signs, no logos, no people.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const def = d => sceneObjDefine(Object.assign({}, d, { build: (v, r, ctx) => tidy(d.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
  const pointed = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w * .55)}Q${f1(x + w * .05)} ${f1(y)} ${f1(x + w / 2)} ${f1(y - w * .15)}Q${f1(x + w * .95)} ${f1(y)} ${f1(x + w)} ${f1(y + w * .55)}V${f1(y + h)}z`;
  const round = (x, y, w, h) => `M${f1(x)} ${f1(y + h)}V${f1(y + w / 2)}A${f1(w / 2)} ${f1(w / 2)} 0 0 1 ${f1(x + w)} ${f1(y + w / 2)}V${f1(y + h)}z`;
  /** flint: many small knapped nodules over a wall face. */
  const flints = (r, x, y, w, h, n) => { let d = ''; n = Math.round(n * .6); for (let i = 0; i < n; i++) { const a = rr(r, 2, 4.5), c = rr(r, 1.4, 3); d += `M${f1(rr(r, x + 2, x + w - 5))} ${f1(rr(r, y + 3, y + h - 2))}l${f1(a)} ${f1(-c * .5)}l${f1(-a * .3)} ${f1(c)}z`; } return d; };
  /** brick courses as a thin stroke set. */
  const courses = (x, y, w, h, step) => { let d = ''; for (let yy = y + step; yy < y + h; yy += step) d += `M${f1(x)} ${f1(yy)}h${f1(w)}`; return d; };

  /* ---------- landmark.reepham-market-place (the Georgian north and east side of the square; lit from the left) ---------- */
  def({
    id: 'landmark.reepham-market-place', category: 'landmark', size: [780, 236], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#b0583c', '#94462e', '#c8704e', '#7a3a26'], gault: ['#d8cdb0', '#c2b694', '#e8dfc6'], render: ['#efe6cf', '#d9ceb2', '#f8f1de'],
      pantile: ['#b45a34', '#94462a', '#cc7448'], slate: ['#5e6670', '#4a525a', '#7a828c'], frame: ['#f4f0e6', '#d8d2c4'],
      glass: ['#2e3a48', '#8ea6bc'], door: ['#2c3e34', '#5a2a24', '#22303e'], stone: ['#e4dccb', '#c4baa4'], shop: ['#3e5a4a', '#e8d8a8'],
      shadow: ['#3a2a22'],
    } },
    night: { glow: { window: '#ffd690', shop: '#ffe4a8' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 380, ry: 14, h: 200 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/reepham', 'uk', 'reepham', 'norfolk', 'market place', 'georgian', 'kit:temperate'],
    credit: 'drawn for the Reepham area scenes (from public views of the Market Place)',
    build(v, r) {
      const b = [], lit = [], push = (...s) => b.push(...s);
      /** a Georgian sash: frame, glass, glazing bars (six over six), a flat brick arch or stone lintel above. */
      const sash = (x, y, w, h, lintel) => {
        push([lintel || '@brick.3', rect(x - 2, y - 5, w + 4, 4)], ['@frame.0', rect(x - 1.5, y - 1.5, w + 3, h + 3)], { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' },
          ['@glass.1', `M${f1(x)} ${f1(y)}h${f1(w * .45)}l${f1(-w * .45)} ${f1(h * .5)}z`, .3], { s: '@frame.0', w: .8, d: `M${f1(x + w / 3)} ${f1(y)}v${f1(h)}M${f1(x + w * 2 / 3)} ${f1(y)}v${f1(h)}M${f1(x)} ${f1(y + h / 2)}h${f1(w)}`, detail: true },
          ['@stone.1', rect(x - 2, y + h + 1, w + 4, 2.4)]);
      };
      const chimney = (x, y, w, h, c) => push([c || '@brick.1', rect(x, y - h, w, h)], ['@brick.3', rect(x - 1.5, y - h - 3, w + 3, 3)], ['@brick.2', rect(x + 2, y - h - 7, 4, 4)], ['@brick.2', rect(x + w - 6, y - h - 7, 4, 4)]);
      // ---- A: the tall red-brick house (left): three storeys, five bays, a parapet hiding a pantile roof
      chimney(-372, -176, 14, 30); chimney(-238, -176, 14, 30);
      push(['@pantile.1', 'M-382 -172L-360 -200H-246L-226 -172z'], ['@brick.0', rect(-386, -176, 162, 176)], ['@brick.2', rect(-386, -176, 34, 176), .4], ['@brick.3', rect(-240, -176, 16, 176), .35]);
      push({ s: '@brick.1', w: .5, d: courses(-386, -176, 162, 176, 5), op: .4, detail: true });
      push(['@stone.0', rect(-390, -182, 170, 7)], ['@stone.1', rect(-390, -128, 170, 3)], ['@stone.1', rect(-390, -70, 170, 3)]);
      for (const [row, h] of [[-166, 26], [-118, 36], [-60, 40]]) for (let i = 0; i < 5; i++) { if (row === -60 && i === 2) continue; sash(-374 + i * 30, row, 16, h); }
      push(['@stone.0', 'M-318 -62L-305 -74L-292 -62z'], ['@stone.1', rect(-318, -62, 26, 3)], ['@door.0', rect(-314, -56, 18, 56)], ['@frame.0', 'M-314 -58a9 7 0 0 1 18 0z'], { s: '@frame.1', w: .7, d: 'M-305 -64v6M-311 -60l6-4 6 4' }, ['@stone.1', rect(-320, -2, 30, 2)]);
      // ---- B: the grander five-bay house: deeper roof of slate with dormers, a columned porch
      chimney(-212, -196, 16, 26, '@brick.3'); chimney(-82, -196, 16, 26, '@brick.3');
      push(['@slate.0', 'M-226 -190L-196 -222H-92L-62 -190z'], ['@slate.2', 'M-196 -222H-92l2 3H-198z', .7]);
      for (const x of [-182, -150, -118]) push(['@slate.1', `M${x - 2} -196V-210L${x + 8} -218L${x + 18} -210V-196z`], ['@frame.0', rect(x + 2, -210, 12, 13)], { f: '@glass.0', d: rect(x + 3.5, -208.5, 9, 10), glow: 'window' });
      push(['@brick.1', rect(-224, -190, 164, 190)], ['@brick.2', rect(-224, -190, 26, 190), .35], ['@brick.3', rect(-76, -190, 16, 190), .35]);
      push({ s: '@brick.3', w: .5, d: courses(-224, -190, 164, 190, 5), op: .35, detail: true });
      push(['@stone.0', rect(-228, -194, 172, 6)], ['@stone.0', rect(-226, -190, 8, 190), .8], ['@stone.0', rect(-66, -190, 8, 190), .8]);
      for (let k = 0; k < 10; k++) push(['@stone.1', rect(-226, -186 + k * 19, 10, 6)], ['@stone.1', rect(-68, -186 + k * 19, 10, 6)]);
      for (const [row, h] of [[-178, 28], [-128, 40], [-66, 44]]) for (let i = 0; i < 5; i++) { if (row === -66 && i === 2) continue; sash(-208 + i * 30, row, 17, h, '@stone.1'); }
      push(['@stone.0', rect(-162, -84, 42, 6)], ['@stone.1', 'M-164 -84L-141 -98L-118 -84z'], ['@stone.0', rect(-160, -78, 5, 76)], ['@stone.0', rect(-125, -78, 5, 76)], ['@stone.1', rect(-156, -78, 32, 4)]);
      push(['@door.2', rect(-151, -70, 22, 70)], ['@frame.0', 'M-151 -70a11 8 0 0 1 22 0z'], { s: '@frame.1', w: .7, d: 'M-140 -78v8M-148 -73l8-5 8 5' }, ['@stone.1', rect(-166, -4, 50, 4)], ['@stone.0', rect(-162, -8, 42, 4)]);
      // ---- C: the coaching inn: long, two storeys, cream render, a steep pantile roof, dormers, a carriage arch
      chimney(-46, -150, 16, 24); chimney(104, -150, 16, 24);
      push(['@pantile.0', 'M-60 -112L-30 -158H100L130 -112z'], ['@pantile.2', 'M-30 -158H100l3 4H-33z', .8]);
      { let tc = ''; for (let i = 1; i < 7; i++) { const y = -158 + i * 6.6, k = (y + 158) / 46; tc += `M${f1(-30 - 30 * k)} ${f1(y)}H${f1(100 + 30 * k)}`; } push({ s: '@pantile.1', w: .8, d: tc, op: .6, detail: true }); }
      for (const x of [-10, 30, 70]) push(['@pantile.1', `M${x - 4} -118V-134L${x + 8} -142L${x + 20} -134V-118z`], ['@render.1', rect(x - 2, -134, 20, 16)], ['@frame.0', rect(x + 1, -133, 14, 13)], { f: '@glass.0', d: rect(x + 2.5, -131.5, 11, 10), glow: 'window' });
      push(['@render.0', rect(-60, -114, 190, 114)], ['@render.2', rect(-60, -114, 30, 114), .5], ['@render.1', rect(110, -114, 20, 114), .6], ['@render.1', rect(-60, -4, 190, 4)]);
      for (let i = 0; i < 6; i++) sash(-48 + i * 30, -100, 16, 30, '@render.1');
      push(['@shadow.0', 'M-52 0V-48A17 17 0 0 1 -18 -48V0z'], ['@render.1', 'M-56 0V-48A21 21 0 0 1 -14 -48V0h4V-48A25 25 0 0 0 -60 -48V0z'], ['@door.1', 'M-48 0V-40h26V0z', .5]);
      for (let i = 0; i < 4; i++) { const x = -2 + i * 30; if (i === 1) { push(['@door.1', rect(x + 2, -46, 16, 46)], ['@frame.0', 'M' + (x + 2) + ' -46a8 6 0 0 1 16 0z'], ['@render.1', rect(x - 2, -50, 24, 4)]); continue; }
        push(['@render.1', `M${x - 4} -14V-46H${x + 24}V-14z`], ['@frame.0', rect(x - 2, -44, 24, 30)], { f: '@glass.0', d: rect(x, -42, 20, 26), glow: 'window' }, { s: '@frame.0', w: .8, d: `M${x + 7} -42v26M${x + 14} -42v26M${x} -29h20` }, ['@render.1', rect(x - 6, -14, 32, 3)]); }
      push(['@door.1', rect(116, -112, 3, 26)], ['@door.1', rect(100, -112, 22, 3)]);
      // ---- D: the shop with a Dutch gable end (a Norfolk shape): brick, a shopfront with an awning
      chimney(212, -186, 12, 16);
      push(['@brick.0', 'M130 -128H148Q146 -150 162 -150Q160 -168 180 -172Q178 -190 196 -190Q214 -190 212 -172Q232 -168 230 -150Q246 -150 244 -128H262V0H130z']);
      push(['@brick.2', 'M130 -128H148Q146 -150 162 -150V0H130z', .35], ['@stone.0', 'M146 -129h100v3H146z'], ['@stone.0', 'M180 -173h32v3h-32z']);
      push({ s: '@brick.1', w: .5, d: courses(130, -128, 132, 128, 5), op: .4, detail: true });
      push(['@frame.0', ell(196, -162, 7, 7)], { f: '@glass.0', d: ell(196, -162, 5, 5), glow: 'window' });
      for (let i = 0; i < 3; i++) sash(146 + i * 36, -114, 18, 34);
      push(['@shop.0', rect(132, -60, 128, 60)], ['@shop.0', rect(128, -66, 136, 8)], ['@frame.1', rect(128, -58, 136, 2)]);
      push({ f: '@glass.0', d: rect(138, -52, 46, 40), glow: 'shop' }, { f: '@glass.0', d: rect(208, -52, 46, 40), glow: 'shop' }, ['@door.0', rect(188, -54, 16, 54)], ['@glass.1', 'M138 -52h20l-20 30z', .3], ['@glass.1', 'M208 -52h20l-20 30z', .3]);
      push({ s: '@shop.0', w: 1.2, d: 'M161 -52v40M231 -52v40M138 -36h46M208 -36h46' }, ['@shop.0', rect(134, -12, 54, 12)], ['@shop.0', rect(204, -12, 54, 12)]);
      { let aw = ''; for (let i = 0; i < 12; i++) aw += `M${132 + i * 11} -66h11l-1 14h-9z`; push(['@shop.1', 'M130 -66H262L266 -50H126z'], ['@shop.0', aw, .55]); }
      // ---- E: the gault-brick house (right): three storeys, slate roof, end stacks
      chimney(266, -178, 14, 30, '@gault.1'); chimney(362, -178, 14, 30, '@gault.1');
      push(['@slate.1', 'M258 -170L280 -192H360L384 -170z'], ['@gault.0', rect(262, -172, 120, 172)], ['@gault.2', rect(262, -172, 22, 172), .5], ['@gault.1', rect(366, -172, 16, 172), .6]);
      push({ s: '@gault.1', w: .5, d: courses(262, -172, 120, 172, 5), op: .5, detail: true });
      push(['@stone.0', rect(258, -176, 128, 5)], ['@gault.1', rect(260, -118, 124, 3)]);
      for (const [row, h] of [[-160, 26], [-108, 36]]) for (let i = 0; i < 3; i++) sash(276 + i * 34, row, 18, h, '@gault.1');
      sash(276, -58, 18, 40, '@gault.1'); sash(344, -58, 18, 40, '@gault.1');
      push(['@door.2', rect(311, -60, 22, 60)], ['@frame.0', rect(309, -66, 26, 6)], ['@frame.0', 'M309 -66L322 -76L335 -66z'], ['@stone.1', rect(305, -3, 34, 3)]);
      // ---- shared: drainpipes and the pavement line
      push({ s: '@shadow.0', w: 1.4, d: 'M-225 -176V0M-61 -186V0M130 -112V0M261 -168V0', op: .55 });
      push(['@stone.1', rect(-390, -3, 776, 3), .7]);
      // the night look: warm spill from the shop and the inn onto the pavement (not graded)
      lit.push(['@shop.1', 'M130 0L150 -8H250L270 0z', .25], ['@shop.1', 'M-10 0L0 -12H110L120 0z', .18], ['@shop.1', 'M-170 0L-150 -10H-130L-112 0z', .2]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.reepham-churches (from the south: St Michael's left, the link, St Mary's right, Hackford's ruined wall in front) ---------- */
  def({
    id: 'landmark.reepham-churches', category: 'landmark', size: [800, 236], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      flint: ['#6e6c66', '#585650', '#8e8b82', '#4a4844'], dress: ['#d8ceb4', '#bcb096', '#e8e0ca'], knap: ['#3e3c3a', '#9a978e', '#b4b0a4'],
      lead: ['#7c848a', '#646c72', '#9aa2a8'], tile: ['#9a5236', '#7e4028', '#b4683e'], glass: ['#323c4a', '#7e8ea2'], tracery: ['#e2d8c0'],
      door: ['#3a2c22'], louvre: ['#4a3e34'], ruin: ['#7a766c', '#8e897c', '#5e5a52'], moss: ['#6a7a44', '#56683a'], flood: ['#ffe2ae'],
    } },
    night: { glow: { window: '#f4c47a' }, on: 0.8 },
    parts: ['body', 'lit'],
    shadow: { rx: 380, ry: 14, h: 200 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/reepham', 'uk', 'reepham', 'norfolk', 'church', 'flint', 'kit:temperate'],
    credit: 'drawn for the Reepham area scenes (from public views of the churchyard)',
    build(v, r) {
      const b = [], lit = [], push = (...s) => b.push(...s);
      const win = (x, y, w, h, mull) => {
        push(['@dress.1', pointed(x - 2, y - 2, w + 4, h + 3)], { f: '@glass.0', d: pointed(x, y, w, h), glow: 'window' }, ['@glass.1', `M${f1(x)} ${f1(y + h * .45)}V${f1(y + w * .55)}Q${f1(x + w * .1)} ${f1(y + w * .05)} ${f1(x + w * .45)} ${f1(y - w * .1)}z`, .35]);
        let m = ''; for (let i = 1; i <= (mull || 1); i++) m += `M${f1(x + i * w / ((mull || 1) + 1))} ${f1(y + w * .25)}V${f1(y + h)}`;
        push({ s: '@tracery', w: .9, d: m + `M${f1(x)} ${f1(y + h * .5)}h${f1(w)}`, op: .85 });
      };
      /** a square flint west tower: diagonal buttresses, stages, belfry openings, an embattled parapet. */
      const tower = (x, w, h) => {
        push(['@flint.0', rect(x, -h, w, h)], ['@flint.2', rect(x, -h, w * .28, h), .45], ['@flint.3', rect(x + w * .8, -h, w * .2, h), .45]);
        push(['@knap.0', flints(r, x, -h, w, h, Math.round(w * h / 60)), .55], ['@knap.2', flints(r, x, -h, w, h, Math.round(w * h / 160)), .4]);
        for (const bx of [x - 6, x + w - 4]) push(['@flint.1', `M${bx} 0V${-h * .62}l5 -10V0z`], ['@dress.1', `M${bx} ${-h * .3}h10v3h-10zM${bx} ${-h * .55}h10v3h-10z`]);
        for (const fy of [h * .38, h * .7]) push(['@dress.0', rect(x - 1, -fy, w + 2, 3)]);
        // belfry: two-light openings with louvres; a ringing-chamber slit; a west window
        for (const bx of [x + w * .22, x + w * .58]) { const bw = w * .2; push(['@dress.1', pointed(bx - 1.5, -h * .92 - 1.5, bw + 3, h * .17 + 2)], ['@louvre', pointed(bx, -h * .92, bw, h * .17)]); let lv = ''; for (let k = 1; k < 5; k++) lv += `M${f1(bx)} ${f1(-h * .92 + k * h * .034 + bw * .3)}h${f1(bw)}`; push({ s: '@flint.2', w: 1, d: lv, op: .8 }); }
        push(['@dress.1', rect(x + w / 2 - 2, -h * .6, 4, 12)], ['@knap.0', rect(x + w / 2 - 1, -h * .6 + 1, 2, 10)]);
        win(x + w * .3, -h * .34, w * .4, h * .2, 2);
        // the parapet: a band, battlements with dressed stone, corner pinnacle stubs
        push(['@dress.0', rect(x - 3, -h - 4, w + 6, 6)]);
        let bt = ''; const nb = Math.max(4, Math.round(w / 9)); for (let k = 0; k < nb; k++) bt += rect(x - 3 + k * (w + 6) / nb, -h - 12, (w + 6) / nb * .55, 8);
        push(['@flint.0', bt], ['@dress.2', 'M' + (x - 4) + ' ' + (-h - 12) + 'l3 -9 3 9zM' + (x + w - 2) + ' ' + (-h - 12) + 'l3 -9 3 9z']);
      };
      // ---- St Michael's (left): tower, nave with a south aisle and lead roof, porch
      tower(-392, 58, 196);
      push(['@lead.0', 'M-336 -108L-320 -128H-150L-140 -108z'], ['@lead.2', 'M-320 -128H-150l1 3H-321z', .8]);
      push(['@flint.0', rect(-336, -108, 196, 108)], ['@flint.2', rect(-336, -108, 26, 108), .4]);
      push(['@knap.0', flints(r, -336, -108, 196, 108, 300), .5], ['@knap.2', flints(r, -336, -108, 196, 108, 90), .4]);
      push(['@lead.1', 'M-336 -62L-336 -72H-140V-62z'], ['@dress.0', rect(-336, -108, 196, 4)]);
      for (let i = 0; i < 4; i++) win(-326 + i * 46, -100, 18, 24, 1);
      for (let i = 0; i < 4; i++) { if (i === 1) continue; win(-326 + i * 46, -54, 24, 40, 2); }
      for (let i = 0; i < 5; i++) push(['@flint.1', `M${-338 + i * 46} 0V-58l6 -6V0z`], ['@dress.1', rect(-338 + i * 46, -30, 6, 3)]);
      push(['@flint.1', 'M-292 0V-56L-276 -74L-260 -56V0z'], ['@dress.0', 'M-296 -56L-276 -78L-256 -56h-4L-276 -72L-292 -56z'], ['@door', round(-284, -44, 16, 44)], ['@dress.1', 'M-286 -36a10 10 0 0 1 20 0h-2a8 8 0 0 0 -16 0z']);
      // ---- the link between the two churches (low, lead-roofed)
      push(['@lead.1', 'M-142 -64L-136 -72H58L64 -64z'], ['@flint.1', rect(-140, -66, 200, 66)], ['@knap.0', flints(r, -140, -66, 200, 66, 170), .5], ['@dress.0', rect(-140, -66, 200, 3)]);
      for (let i = 0; i < 3; i++) win(-118 + i * 60, -54, 16, 30, 1);
      // ---- St Mary's (right): its tower, a taller nave with a red-tiled roof, a lower chancel
      tower(58, 54, 184);
      push(['@tile.0', 'M110 -116L160 -170H300L330 -116z'], ['@tile.2', 'M160 -170H300l2 3H158z', .8]);
      { let tc = ''; for (let i = 1; i < 8; i++) { const y = -170 + i * 6.6, k = (y + 170) / 54; tc += `M${f1(160 - 50 * k)} ${f1(y)}H${f1(300 + 30 * k)}`; } push({ s: '@tile.1', w: .8, d: tc, op: .55, detail: true }); }
      push(['@flint.0', rect(112, -116, 214, 116)], ['@flint.3', rect(300, -116, 26, 116), .35]);
      push(['@knap.0', flints(r, 112, -116, 214, 116, 330), .5], ['@knap.2', flints(r, 112, -116, 214, 116, 100), .4], ['@dress.0', rect(110, -118, 218, 4)]);
      for (let i = 0; i < 4; i++) win(124 + i * 50, -94, 26, 62, 2);
      for (let i = 0; i < 5; i++) push(['@flint.1', `M${112 + i * 50} 0V-46l6 -6V0z`], ['@dress.1', rect(112 + i * 50, -24, 6, 3)]);
      push(['@tile.1', 'M324 -78L346 -104H392L404 -78z'], ['@flint.0', rect(326, -80, 70, 80)], ['@knap.0', flints(r, 326, -80, 70, 80, 90), .5], ['@dress.0', rect(326, -80, 70, 3)]);
      win(340, -66, 18, 40, 1); win(370, -66, 14, 36, 1);
      push(['@dress.2', 'M326 -80V-90l2-4 2 4V-80z'], ['@dress.2', 'M107 -118l3-10 3 10z']);
      // ---- Hackford's ruined wall in the churchyard (front, centre left): a jagged flint fragment with a broken window arch
      push(['@ruin.0', 'M-70 0V-42L-64 -50L-60 -44L-54 -58L-46 -54L-40 -64L-34 -56L-26 -60L-20 -46L-12 -40V0z']);
      push(['@ruin.2', 'M-70 0V-42L-64 -50L-60 -44V0z', .5], ['@knap.0', flints(r, -70, -54, 58, 54, 70), .5]);
      push(['@ruin.2', pointed(-50, -38, 16, 30)], ['@ruin.1', 'M-50 -8V-26q8 -14 16 0V-8z', .5], ['@dress.1', 'M-52 -38l2 -6h4l-2 6zM-36 -44l3 0 1 6h-3z']);
      push(['@moss.0', 'M-70 -42L-64 -50L-60 -44L-62 -40z'], ['@moss.1', 'M-46 -54L-40 -64L-36 -58L-42 -56z'], ['@moss.0', 'M-26 -60L-20 -46L-24 -50z']);
      push(['@dress.1', rect(-396, -3, 800, 3), .6]);
      // the night look: a soft flood on the two towers (not graded)
      lit.push(['@flood.0', rect(-396, -210, 66, 210), .14], ['@flood.0', rect(54, -198, 62, 198), .14], ['@flood.0', 'M-410 0L-362 -30L-314 0z', .18], ['@flood.0', 'M40 0L85 -30L130 0z', .18]);
      return { body: b, lit };
    },
  });

  /* ---------- landmark.reepham-station (the old station from the trackbed: house, booking hall, canopy, goods shed, platform) ---------- */
  def({
    id: 'landmark.reepham-station', category: 'landmark', size: [640, 176], variants: 1, seasonal: false, flippable: false,
    palette: { base: {
      brick: ['#a85a3e', '#8c4630', '#c47252', '#723624'], slate: ['#5a626c', '#465058', '#7a828c'], frame: ['#f0ece2', '#d4cec0'],
      glass: ['#2e3a48', '#8ea6bc'], door: ['#2e4a3a', '#1e3428'], canopy: ['#e6e0cc', '#2e4a3a', '#c8c0a8'], platform: ['#b8b0a0', '#968e80', '#d6cfbe'],
      edge: ['#e2dccc', '#8a8274'], shed: ['#4e6a54', '#3c5442', '#6a8670'], stone: ['#ddd4c0'], shadow: ['#3a2c24'],
    } },
    night: { glow: { window: '#ffd68e' }, on: 0.85 },
    parts: ['body', 'lit'],
    shadow: { rx: 300, ry: 10, h: 140 },
    reflect: false,
    tags: ['landmark', 'signature', 'place:uk/reepham', 'uk', 'reepham', 'norfolk', 'station', 'railway', 'marriotts way', 'kit:temperate'],
    credit: 'drawn for the Reepham area scenes (from public views of the old station on the Marriott\'s Way)',
    build(v, r) {
      const b = [], lit = [], push = (...s) => b.push(...s);
      const sash = (x, y, w, h) => push(['@stone.0', rect(x - 2, y - 4, w + 4, 3)], ['@frame.0', rect(x - 1.5, y - 1.5, w + 3, h + 3)], { f: '@glass.0', d: rect(x, y, w, h), glow: 'window' }, ['@glass.1', `M${f1(x)} ${f1(y)}h${f1(w * .4)}l${f1(-w * .4)} ${f1(h * .5)}z`, .3], { s: '@frame.0', w: .8, d: `M${f1(x + w / 2)} ${f1(y)}v${f1(h)}M${f1(x)} ${f1(y + h / 2)}h${f1(w)}`, detail: true }, ['@stone.0', rect(x - 2, y + h + 1, w + 4, 2)]);
      // ---- the platform (raised, with its pale edging) running the whole width
      push(['@platform.0', rect(-320, -26, 640, 26)], ['@platform.1', rect(-320, -8, 640, 8)], ['@edge.0', rect(-322, -28, 644, 5)], ['@edge.1', rect(-322, -23, 644, 2)]);
      { let jt = ''; for (let i = 0; i < 32; i++) jt += `M${-318 + i * 20} -22v14`; push({ s: '@platform.1', w: .7, d: jt, op: .6, detail: true }); }
      { let ft = ''; for (let i = 0; i < 26; i++) ft += `M${-318 + i * 25} -28.5h12`; push({ s: '@edge.1', w: .6, d: ft, op: .5, detail: true }); }
      // ---- the station house (left): two storeys, a steep slate gable to the platform, tall stacks
      push(['@brick.1', rect(-248, -170, 14, 26)], ['@brick.3', rect(-250, -173, 18, 3)], ['@brick.1', rect(-140, -162, 14, 24)], ['@brick.3', rect(-142, -165, 18, 3)]);
      push(['@slate.0', 'M-262 -118L-218 -158L-176 -118z'], ['@slate.1', 'M-180 -118L-218 -158H-150L-120 -118z'], ['@slate.2', 'M-218 -158H-150l1 3H-219z', .7]);
      push(['@brick.0', 'M-258 -26V-118L-218 -154L-178 -118V-26z'], ['@brick.0', rect(-178, -118, 60, 92)], ['@brick.2', 'M-258 -26V-118L-246 -129V-26z', .4]);
      push({ s: '@brick.1', w: .5, d: courses(-258, -118, 140, 92, 5), op: .4, detail: true });
      push({ s: '@frame.1', w: 2.2, d: 'M-264 -114L-218 -158L-172 -114' }, ['@stone.0', rect(-258, -76, 140, 3)]);
      sash(-228, -128, 20, 28); sash(-236, -68, 14, 30); sash(-208, -68, 14, 30); sash(-166, -106, 16, 26); sash(-140, -106, 16, 26); sash(-166, -64, 16, 30);
      push(['@door.0', rect(-138, -66, 16, 40)], ['@stone.0', rect(-140, -70, 20, 4)]);
      // ---- the booking hall (centre): single storey, hipped slate roof, two stacks, tall windows and doors
      push(['@brick.1', rect(-60, -136, 12, 24)], ['@brick.3', rect(-62, -139, 16, 3)], ['@brick.1', rect(50, -136, 12, 24)], ['@brick.3', rect(48, -139, 16, 3)]);
      push(['@slate.0', 'M-122 -96L-92 -126H90L118 -96z'], ['@slate.2', 'M-92 -126H90l2 3H-94z', .7]);
      { let sc = ''; for (let i = 1; i < 5; i++) { const y = -126 + i * 6, k = (y + 126) / 30; sc += `M${f1(-92 - 30 * k)} ${f1(y)}H${f1(90 + 28 * k)}`; } push({ s: '@slate.1', w: .7, d: sc, op: .6, detail: true }); }
      push(['@brick.0', rect(-118, -98, 232, 72)], ['@brick.3', rect(96, -98, 18, 72), .35]);
      push({ s: '@brick.1', w: .5, d: courses(-118, -98, 232, 72, 5), op: .4, detail: true }, ['@stone.0', rect(-120, -100, 236, 3)]);
      for (let i = 0; i < 7; i++) { const x = -106 + i * 32; if (i === 2 || i === 5) { push(['@door.0', rect(x, -78, 16, 52)], ['@glass.0', rect(x + 3, -74, 10, 14)], ['@stone.0', rect(x - 2, -82, 20, 4)]); continue; } sash(x, -80, 16, 36); }
      // the canopy: a light timber awning on brackets with the saw-tooth valance
      push(['@canopy.2', 'M-126 -98L-132 -84H120L114 -98z'], ['@canopy.0', 'M-132 -84H120V-80H-132z']);
      { let vt = ''; for (let i = 0; i < 42; i++) vt += `M${-132 + i * 6} -80h6l-3 7z`; push(['@canopy.0', vt]); }
      { let br = ''; for (let i = 0; i < 6; i++) br += `M${-112 + i * 44} -84l-6 -12M${-112 + i * 44} -84v58`; push({ s: '@canopy.1', w: 2, d: br }); }
      // ---- the goods shed (right): timber, painted, a wide door
      push(['@shed.1', 'M170 -26V-92L232 -112L294 -92V-26z'], ['@slate.1', 'M164 -90L232 -116L300 -90L296 -86L232 -110L168 -86z']);
      { let bd = ''; for (let i = 0; i < 20; i++) bd += `M${173 + i * 6.2} -26V${f1(-90 - (i < 10 ? i * 2 : (19 - i) * 2))}`; push({ s: '@shed.0', w: 1, d: bd, op: .6, detail: true }); }
      push(['@shed.2', rect(204, -74, 56, 48)], ['@shadow.0', rect(208, -70, 48, 44), .6], { s: '@shed.2', w: 1.2, d: 'M232 -70v44M208 -70l24 22M256 -70l-24 22' });
      push({ f: '@glass.0', d: rect(180, -70, 14, 14), glow: 'window' }, { f: '@glass.0', d: rect(270, -70, 14, 14), glow: 'window' }, ['@frame.0', 'M180 -63h14M187 -70v14M270 -63h14M277 -70v14', .9]);
      // ---- platform furniture fixed to the building: a barrow and the fence at the end
      push(['@shed.1', 'M128 -36h22v6h-22z'], ['@shadow.0', ell(132, -29, 3, 3)], ['@shed.0', 'M150 -36l10 -6v2l-9 6z']);
      { let fc = ''; for (let i = 0; i < 8; i++) fc += `M${-316 + i * 7} -28v-20`; push({ s: '@frame.1', w: 1.4, d: fc + 'M-318 -44h54M-318 -36h54' }); }
      // the night look: lamp pools on the platform (not graded)
      lit.push(['@canopy.0', 'M-120 -28L-100 -80H100L120 -28z', .14], ['@canopy.0', 'M-250 -28L-230 -60H-200L-180 -28z', .12]);
      return { body: b, lit };
    },
  });
})();
