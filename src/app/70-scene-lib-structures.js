/* ============================================================
   SCENE LIBRARY: structures (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   Bridges, boardwalks, platforms and fences after the Basingstoke Canal
   and Fleet Pond views, as side elevations lit from the LEFT. Anchor: the
   ground or waterline under the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const WOOD = { spring: ['#6a5440', '#8f7656', '#b49c74', '#3e3328'], summer: ['#6a5440', '#8f7656', '#b49c74', '#3e3328'], autumn: ['#64503c', '#8a7052', '#ac9470', '#3a3026'], winter: ['#6f6556', '#8f8572', '#b9b09c', '#46403a'] };
  const IVY = { spring: ['#2f5a2a', '#4f8a3a'], summer: ['#24502a', '#3f7a34'], autumn: ['#5a3a1e', '#8a4a22'], winter: ['#2a4228', '#3e5a36'] };
  const GRASS = { spring: ['#4c7a37', '#6f9f40', '#a6c95e'], summer: ['#3f6b31', '#5f8f3a', '#8db352'], autumn: ['#5f6a35', '#8a8a45', '#b5a65c'], winter: ['#6b735a', '#8d9277', '#b3b59c'] };

  /* ---------- structure.bridge-brick: a hump-backed brick canal bridge (anchor: the waterline under the arch) ---------- */
  defineObj({
    id: 'structure.bridge-brick', category: 'structure', size: [460, 134], variants: 2, seasonal: true, shapeBySeason: false, flippable: true,
    palette: Object.assign({ base: { brick: ['#9a5a40', '#7a4430', '#c07a5a', '#5a3428'], cope: ['#cfc6b4', '#a89e8a'], arch: '#120a08', path: ['#a89a7a', '#8a7c5e'], water: '#1d3a44' } }, bySeason({ ivy: IVY, bank: GRASS })),
    reflect: true,
    tags: ['uk', 'canal', 'bridge', 'brick', 'towpath', 'kit:temperate', 'kit:water', 'kit:london', 'role:building-mid'],
    credit: 'the Basingstoke Canal view art (the brick road bridge), as an elevation',
    build(v, r) {
      const W = 210, deck = -120, ah = 78, aw = 74, body = [];
      // the bridge face: a hump-backed parapet over the arch, wing walls running down to the banks
      const top = `M${-W} ${deck + 46}Q${-W * .5} ${deck + 6} 0 ${deck}Q${W * .5} ${deck + 6} ${W} ${deck + 46}`;
      const face = `${top}L${W} 6H${aw}V0Q${aw} ${-ah * 1.25} 0 ${-ah * 1.25}Q${-aw} ${-ah * 1.25} ${-aw} 0V6H${-W}z`;
      body.push(['@bank.0', `M${-W - 20} 6L${-W + 10} ${deck + 50}H${-aw}V6zM${W + 20} 6L${W - 10} ${deck + 50}H${aw}V6z`, .9]);
      body.push(['@brick.0', face], ['@brick.1', `M${W * .4} ${deck + 12}Q${W * .7} ${deck + 22} ${W} ${deck + 46}L${W} 6H${aw}V${-ah * .6}Q${aw * .8} ${-ah * 1.1} ${aw * .3} ${-ah * 1.22}z`, .4]);
      // brick courses (rows of short strokes so they read as bricks, not lines)
      let crs = '';
      for (let y = 2; y > deck + 8; y -= 6) for (let x = -W + ((y / 6) % 2 ? 6 : 0); x < W; x += 13) { const inArch = Math.abs(x) < aw + 2 && y > -ah * 1.25 * Math.sqrt(Math.max(0, 1 - (x / aw) ** 2)) - 2; if (!inArch) crs += `M${f1(x)} ${f1(y)}h10`; }
      body.push({ s: '@brick.3', w: .7, op: .35, d: crs, detail: true });
      let mot = ''; for (let i = 0; i < 60; i++) { const x = rr(r, -W + 10, W - 10), y = rr(r, deck + 30, -4); if (Math.abs(x) > aw + 6 || y < -ah * 1.3) mot += `M${f1(x)} ${f1(y)}h${f1(rr(r, 4, 9))}`; }
      body.push({ s: '@brick.2', w: 2, op: .45, d: mot, detail: true });
      // the arch ring of headers (voussoirs) and its keystone, the shade under the arch, the towpath through it
      let vs = ''; for (let i = 0; i <= 18; i++) { const a = Math.PI * (1 - i / 18), x1 = Math.cos(a) * aw, y1 = -Math.sin(a) * ah * 1.25, x2 = Math.cos(a) * (aw + 10), y2 = -Math.sin(a) * (ah * 1.25 + 10); vs += `M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}`; }
      body.push({ s: '@brick.2', w: 9, op: .55, d: `M${-aw - 5} 0Q${-aw - 5} ${-ah * 1.25 - 5} 0 ${-ah * 1.25 - 5}Q${aw + 5} ${-ah * 1.25 - 5} ${aw + 5} 0` }, { s: '@brick.3', w: 1, op: .6, d: vs });
      body.push(['@arch', `M${-aw} 6V0Q${-aw} ${-ah * 1.25} 0 ${-ah * 1.25}Q${aw} ${-ah * 1.25} ${aw} 0V6z`, .8], ['@water', `M${-aw} 6V-2H${aw}V6z`, .6]);
      body.push(['@path.0', `M${-aw} -2V-12H${-aw * .35}V-2z`], ['@path.1', `M${-aw} -2H${-aw * .35}v2H${-aw}z`]);
      body.push({ s: '@cope.1', w: 1.6, d: `M${-aw * .35} -12v-20` });   // the towpath rope rail post
      // the string course and the coping along the parapet top
      body.push({ s: '@cope.1', w: 4, d: top.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (m, a, _, b) => `${a} ${+b + 14}`) }, { s: '@cope.0', w: 7, d: top }, { s: '@cope.1', w: 1.4, op: .7, d: top.replace(/(-?\d+(\.\d+)?) (-?\d+(\.\d+)?)/g, (m, a, _, b) => `${a} ${+b + 3.5}`) });
      // ivy down one side of the arch, a variant with a second patch
      const iv = ['', '']; const patches = v ? [[-aw - 30, -60], [aw + 40, -40]] : [[-aw - 30, -60]];
      for (const [px, py] of patches) for (let i = 0; i < 26; i++) iv[i % 2] += sceneD.leaf(px + rr(r, -22, 22), py + rr(r, -40, 50), rr(r, 0, 6.3), rr(r, 6, 9), 4);
      body.push(['@ivy.0', iv[0]], ['@ivy.1', iv[1]]);
      return { body };
    },
  });

  /* ---------- structure.boardwalk: a section of raised boardwalk through reeds (side elevation), handrail on posts ---------- */
  defineObj({
    id: 'structure.boardwalk', category: 'structure', size: [326, 68], variants: 2, seasonal: true, flippable: true,
    palette: Object.assign({ base: { water: '#1d3a44' } }, bySeason({ wood: WOOD, sheen: { spring: '#c8d8a0', summer: '#c8d8a0', autumn: '#d8c8a0', winter: '#eef4f6' } })),
    reflect: true,
    tags: ['uk', 'pond', 'marsh', 'boardwalk', 'nature-reserve', 'kit:temperate', 'kit:water', 'role:street'],
    credit: 'the Fleet Pond view art (the boardwalk out of the reeds), as an elevation',
    build(v) {
      const W = 160, dk = -22, rail = v ? -60 : -54, body = [];
      let posts = ''; for (let x = -W + 6; x <= W; x += 40) posts += rect(x - 3, rail - 2, 6, -rail + 8);
      body.push(['@wood.3', posts]);
      body.push(['@wood.1', rect(-W, dk - 6, 2 * W, 7)], ['@wood.0', rect(-W, dk + 1, 2 * W, 4)], { s: '@wood.3', w: .8, op: .6, d: Array.from({ length: 16 }, (_, i) => `M${-W + i * 20} ${dk - 6}v7`).join('') });
      body.push({ s: '@wood.2', w: 1.2, op: .6, d: `M${-W} ${dk - 5.5}h${2 * W}` });
      body.push(['@wood.1', rect(-W, rail - 2, 2 * W, 5)], { s: '@wood.0', w: 3, d: `M${-W} ${(rail + dk) / 2}h${2 * W}` }, { s: '@sheen', w: 1, op: .35, d: `M${-W} ${rail - 2.5}h${2 * W}` });
      if (v) { let x2 = ''; for (let x = -W + 6; x < W; x += 40) x2 += `M${x} ${rail + 3}L${x + 40} ${dk - 6}M${x + 40} ${rail + 3}L${x} ${dk - 6}`; body.push({ s: '@wood.0', w: 1.6, op: .8, d: x2 }); }
      // legs into the water, with a ring of wet at each
      let legs = ''; for (let x = -W + 26; x < W; x += 40) legs += rect(x - 2.5, dk + 5, 5, 20);
      body.push(['@wood.3', legs], { s: '@water', w: 2, op: .5, d: Array.from({ length: 8 }, (_, i) => `M${-W + 20 + i * 40} 3h13`).join('') });
      return { body };
    },
  });

  /* ---------- structure.viewing-platform: a railed deck over the water with a bench facing the view (3/4 view from the shore) ---------- */
  defineObj({
    id: 'structure.viewing-platform', category: 'structure', size: [286, 71], variants: 1, seasonal: true, flippable: true,
    palette: Object.assign({ base: { water: '#1d3a44', shade: '#0f1a1c' } }, bySeason({ wood: WOOD, sheen: { spring: '#c8d8a0', summer: '#c8d8a0', autumn: '#d8c8a0', winter: '#eef4f6' } })),
    reflect: true,
    tags: ['uk', 'pond', 'lake', 'platform', 'viewpoint', 'nature-reserve', 'kit:temperate', 'kit:water', 'role:street'],
    credit: 'the Fleet Pond view art (the viewing platform)',
    build() {
      // the deck front edge at y 0 (its legs go below into the water), the far edge 32 up and in
      const body = [];
      body.push({ s: '@wood.3', w: 4, d: 'M-135 4v18M-80 4v16M0 4v16M80 4v16M135 4v18' }, ['@shade', 'M-138 4h276l-4 6h-268z', .4]);
      body.push(['@wood.0', 'M-141 0h282v8h-282z'], ['@wood.1', 'M-141 0L-117-32H117L141 0z'], { s: '@wood.0', w: 1, op: .6, d: 'M-129-16H129M-123-24H123M-135-8H135' });
      // rails on three sides
      body.push({ s: '@wood.0', w: 2.4, d: 'M-141 0v-20M-117-32v-16M117-32v-16M141 0v-20M3-32v-16M-129-16v-18M129-16v-18' });
      body.push({ s: '@wood.0', w: 2, d: 'M-141-20L-117-48H117L141-20M-141-10L-117-40H117L141-10' }, { s: '@sheen', w: 1, op: .35, d: 'M-141-21L-117-49H117L141-21' });
      // the bench, facing away (towards the water)
      body.push(['@wood.0', 'M-38-22h76v4h-76zM-34-18v7h3v-7zM31-18v7h3v-7zM-40-30h80v3h-80z'], ['@wood.2', 'M-38-22h76v1.2h-76z', .7]);
      // the front rail (nearest the viewer) last
      body.push({ s: '@wood.0', w: 2.6, d: 'M-141 0v-22M-70 0v-22M0 0v-22M70 0v-22M141 0v-22' }, ['@wood.1', 'M-143-24h286v4h-286z'], { s: '@wood.0', w: 1.6, d: 'M-141-11h282' });
      return { body };
    },
  });

  /* ---------- structure.fence: v0 post and rail, v1 a field gate between posts, v2 posts and wire, v3 a white picket fence ---------- */
  defineObj({
    id: 'structure.fence', category: 'structure', size: [167, 51], variants: 4, seasonal: true, flippable: true,
    palette: Object.assign({ base: { wire: '#5a5a5e', paint: ['#f4f2ec', '#c8c4b8'], metal: '#4a4a50' } }, bySeason({ wood: WOOD, moss: { spring: '#5a7a3a', summer: '#5a7a3a', autumn: '#6a7238', winter: '#6a7458' }, tuft: GRASS })),
    shadow: { rx: 80, ry: 4, h: 40 },
    tags: ['uk', 'field', 'heath', 'path', 'fence', 'gate', 'kit:temperate', 'kit:urban', 'role:street'],
    credit: 'library: field fences after the canal-side fencing',
    build(v, r) {
      const W = 80, body = [];
      const post = (x, h, w) => [['@wood.0', `M${f1(x - w / 2)} 0V${f1(-h + 2)}l${f1(w / 2)} -2l${f1(w / 2)} 2V0z`], ['@wood.3', rect(x + w * .1, -h, w * .4, h), .45], ['@moss', rect(x - w / 2, -h + 2, w, 3), .5]];
      if (v === 3) {
        for (let x = -W; x <= W; x += 10) body.push(['@paint.0', `M${x - 3} 0V-30l3-4 3 4V0z`], ['@paint.1', rect(x + 1, -30, 2, 30), .7]);
        body.push(['@paint.0', rect(-W - 2, -24, 2 * W + 4, 3)], ['@paint.0', rect(-W - 2, -10, 2 * W + 4, 3)], ['@paint.1', rect(-W - 2, -21, 2 * W + 4, 1)]);
      } else if (v === 1) {
        body.push(...post(-W + 4, 50, 9), ...post(W - 4, 50, 9));
        // a five-bar gate with its diagonal brace and hinges
        let bars = ''; for (let i = 0; i < 5; i++) bars += rect(-W + 10, -44 + i * 9, 2 * W - 20, 3.4);
        body.push(['@wood.1', bars], ['@wood.1', rect(-W + 10, -44, 5, 42) + rect(W - 15, -44, 5, 42)], { s: '@wood.1', w: 4, d: `M${-W + 14} -4L${W - 14} -42` }, { s: '@wood.2', w: 1, op: .6, d: `M${-W + 10} -44h${2 * W - 20}` }, ['@metal', rect(W - 18, -40, 6, 3) + rect(W - 18, -12, 6, 3)]);
      } else {
        for (let x = -W + 4; x <= W; x += 52) body.push(...post(x, v ? 40 : 44, v ? 5 : 8));
        if (v === 2) body.push({ s: '@wire', w: .9, d: `M${-W} -14q${W} 3 ${2 * W} 0M${-W} -24q${W} 3 ${2 * W} 0M${-W} -34q${W} 2 ${2 * W} 0` });
        else body.push(['@wood.1', `M${-W} -38l${2 * W} -1v5l${-2 * W} 1z` + `M${-W} -20l${2 * W} 1v5l${-2 * W} -1z`], { s: '@wood.2', w: 1, op: .6, d: `M${-W} -38l${2 * W} -1M${-W} -20l${2 * W} 1` });
      }
      // grass tufts round the feet
      let tf = ''; for (let i = 0; i < 18; i++) { const x = rr(r, -W, W), a = rr(r, -.6, .6), h = rr(r, 6, 13); tf += `M${f1(x - 1.2)} 1Q${f1(x + a * h * .3)} ${f1(-h * .6)} ${f1(x + a * h)} ${f1(-h)}Q${f1(x + a * h * .3 + 1.2)} ${f1(-h * .6)} ${f1(x + 1.2)} 1z`; }
      body.push(['@tuft.1', tf]);
      return { body };
    },
  });
})();
