/* ============================================================
   SCENE LIBRARY: boats, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   A sailing dinghy and an inshore fishing boat. FACING RIGHT (the bow on the
   right). No sail numbers, names or registration letters. Anchor: the
   waterline at the middle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rr = (r, a, b) => a + r() * (b - a);
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const poly = pts => 'M' + pts.map(p => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'z';
  const SEAS = ['spring', 'summer', 'autumn', 'winter'];
  const bySeason = (o) => { const p = {}; for (const s of SEAS) p[s] = {}; for (const [slot, v] of Object.entries(o)) for (const s of SEAS) p[s][slot] = v[s]; return p; };
  const hx = c => { const n = parseInt(String(c).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  /** A colour set [base, shade, light, deep] from one colour. */
  const tone4 = c => [c, mix(c, '#000000', .28), mix(c, '#ffffff', .25), mix(c, '#000000', .52)];
  /** Structural randomness that does NOT change with the season (shapeBySeason objects re-seed r per season). */
  const srnd = k => sceneRnd(sceneHash(k));
  /** A rotation matrix of deg degrees about (cx, cy), and shapes with a matrix applied. */
  const rot = (deg, cx, cy) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, f1(cx - c * cx + s * cy), f1(cy - s * cx - c * cy)].map(n => Math.round(n * 1e4) / 1e4); };
  const withM = (shapes, m) => shapes.filter(Boolean).map(sh => Array.isArray(sh) ? { f: sh[0], d: sh[1], op: sh[2], m } : Object.assign({}, sh, { m }));
  /** A scalloped clump outline (foliage, fleece, rubble): n lobes round an ellipse. */
  const lobed = (r, cx, cy, rx, ry, n, rag = .3) => {
    const a = i => (i / n) * Math.PI * 2 - Math.PI / 2, k = Array.from({ length: n }, () => 1 - rag * r());
    const P = i => [cx + Math.cos(a(i)) * rx * k[i % n], cy + Math.sin(a(i)) * ry * k[i % n]];
    let d = `M${f1(P(0)[0])} ${f1(P(0)[1])}`;
    for (let i = 0; i < n; i++) { const am = (a(i) + a(i + 1)) / 2, km = (k[i] + k[(i + 1) % n]) / 2 * 1.32, q = P(i + 1); d += `Q${f1(cx + Math.cos(am) * rx * km)} ${f1(cy + Math.sin(am) * ry * km)} ${f1(q[0])} ${f1(q[1])}`; }
    return d + 'z';
  };
  /** Seasonal grass: the palette slot 'grass' [mid, light, deep] for the four seasons. */
  const GRASS = { spring: ['#5f9a3a', '#8ab84e', '#3e6e2a'], summer: ['#4d7f2e', '#78a040', '#345a22'], autumn: ['#7d7a3a', '#a8954c', '#585428'], winter: ['#5e6450', '#7c7c64', '#40463a'] };
  /** Grass tufts along the ground from x0 to x1 at y (blades h tall): three shapes. */
  const tufts = (r, x0, x1, n, h, y = 0) => {
    const p = ['', '', ''];
    for (let i = 0; i < n; i++) {
      const x = x0 + (x1 - x0) * (i + r()) / n, hh = h * rr(r, .5, 1.2), l = rr(r, -3, 3);
      p[i % 3] += `M${f1(x - 3)} ${f1(y + 1)}Q${f1(x - 2 + l * .3)} ${f1(y - hh * .5)} ${f1(x - 3 + l)} ${f1(y - hh)}Q${f1(x + l * .2)} ${f1(y - hh * .45)} ${f1(x + 1)} ${f1(y + 1)}z`
        + `M${f1(x)} ${f1(y + 1)}Q${f1(x + 2 + l * .3)} ${f1(y - hh * .4)} ${f1(x + 4 + l)} ${f1(y - hh * .8)}Q${f1(x + 3)} ${f1(y - hh * .35)} ${f1(x + 3)} ${f1(y + 1)}z`;
    }
    return [['@grass.2', p[2]], ['@grass.0', p[0]], ['@grass.1', p[1]]];
  };

  /* ---------- boat.dinghy: a sailing dinghy, bermudan main and jib, one crew at the helm; v0 white sails, v1 cream sails on a varnished hull, v2 white main with a red jib ---------- */
  defineObj({
    id: 'boat.dinghy', category: 'boat', size: [150, 200], variants: 3, seasonal: false, flippable: true, parts: ['sails', 'hull'],
    palette: { base: {
      hull: ['#f4f2ec', '#c8a070', '#2f5a8a'], hullD: ['#c8c6c0', '#9a7448', '#1f3e62'], deck: ['#d8cfbe', '#b88a58', '#e8e4dc'], boot: ['#c0392b', '#2a3a4a', '#f4f2ec'],
      sail: ['#f6f4ee', '#ecdcb8', '#f6f4ee'], sailD: ['#d4d2cc', '#cdb990', '#d4d2cc'], jib: ['#f6f4ee', '#ecdcb8', '#c8402e'], jibD: ['#d4d2cc', '#cdb990', '#9a2e22'],
      spar: '#b8bcc0', rope: '#e8e2d2', crew: ['#2a2e36', '#e0b030', '#c84a2a', '#3a6aa8'], skin: '#c89a78', wake: '#eefaf6',
    } },
    anim: { paddle: { dy: 1.6, deg: 2.5, period: 3.2 }, sway: { part: 'sails', pivot: [6, -18], deg: 1.4 } },
    reflect: true,
    tags: ['uk', 'coast', 'seaside', 'harbour', 'estuary', 'sailing', 'dinghy', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'coast-country kit (generic sailing dinghy, no sail numbers)',
    build(v) {
      const heel = rot(5, 0, 0);
      const sails = withM([
        { s: '@spar', w: 2.4, d: 'M6 -14V-192' },
        [`@sail.${v}`, 'M7 -188Q-24 -120 -58 -32L7 -30z'], { f: `@sailD.${v}`, d: 'M7 -188L7 -30L-6 -30Q-2 -110 7 -188z', op: .7, detail: true }, { f: `@sailD.${v}`, d: 'M7 -188Q-24 -120 -58 -32L-50 -32Q-20 -112 7 -180z', op: .45, detail: true },
        { s: `@sailD.${v}`, w: 1, op: .8, d: 'M-6 -150L5 -150M-18 -118L5 -118M-32 -86L5 -86M-44 -56L5 -56', detail: true },
        { s: '@spar', w: 3, d: 'M7 -30L-60 -32' }, { s: '@rope', w: .8, op: .8, d: 'M-56 -32L-40 -12M7 -150L62 -10', detail: true },
        [`@jib.${v}`, 'M10 -146L58 -16L14 -24Q22 -90 10 -146z'], { f: `@jibD.${v}`, d: 'M10 -146Q22 -90 14 -24L22 -22Q26 -90 10 -146z', op: .5, detail: true },
      ], heel);
      const C = `@crew.${1 + v}`;
      const hull = [
        { s: '@wake', w: 1.6, op: .55, d: 'M-70 4h50M30 4h40', detail: true },
        // the far topside's inside over the near sheer; the helm IN the cockpit (hidden below the waist), tiller, rudder (detail)
        [`@deck.${v}`, 'M-64-18q54-2.6 104-3q18-.6 28-4.4q-8 6.4-28 8.4q-50 3-104-1z'], { s: `@hull.${v}`, w: 1.2, d: 'M-63-18.6q53-2.6 103-3q18-.6 27-4', detail: true },
        { f: C, d: 'M-38-15q-1-14 5-18q7-1 9 6l1 12z', detail: true }, { f: '@skin', d: circ(-30.6, -38, 4.6), detail: true }, { f: '@crew.0', d: 'M-35.2-39q4.6-6 9.2 0z', detail: true },
        { s: C, w: 2.4, d: 'M-29-30q-5 4-11 7', detail: true }, { s: '@spar', w: 1.6, d: 'M-62-19l22-4', detail: true }, { f: `@hullD.${v}`, d: 'M-64-17l-5 20 5 3 2-18z', detail: true },
        // the near side: sheer rising to the bow, bilge, boot-top on the waterline, gunwale
        [`@hull.${v}`, 'M-64-18q54 4 104 1q20-2 28-8q-1 13-11 24q-13 7-73 7q-36 0-46-4z'], { f: `@hullD.${v}`, d: 'M-63-5q63 3 124-1q-5 6-17 10q-24 2-60 2q-36 0-46-4z', op: .7, detail: true },
        { f: `@boot.${v}`, d: 'M-63-6q63 3 125-1.4l-1 2.4q-61 4.2-124 1.4z', detail: true }, { f: `@deck.${v}`, d: 'M-64-18q54 4 104 1q20-2 28-8l.4 2q-8 6-28.4 7.8q-50 3-104-1.2z', detail: true },
      ];
      return { sails, hull: withM(hull, heel) };
    },
  });

  /* ---------- boat.fishing-boat: an inshore fishing boat with a wheelhouse aft, a short mast and gear on deck; v0 blue with a gantry, v1 red with a net drum, v2 green with a stack of crab pots ---------- */
  defineObj({
    id: 'boat.fishing-boat', category: 'boat', size: [250, 170], variants: 3, seasonal: false, flippable: true,
    palette: { base: {
      hull: ['#2f5a8a', '#a8322a', '#2f6a4a'], hullD: ['#1f3e62', '#7a221c', '#1f4a32'], top: ['#f2efe6', '#1e2226', '#f0e6c8'], anti: ['#8a2a22', '#3a3a3a', '#8a2a22'],
      house: ['#f4f2ec', '#cfcabd', '#ffffff'], glass: ['#3a4a5a', '#c8dce8'], deck: '#8a7a64', iron: ['#4a4e54', '#2a2e33', '#7a8088'], rust: '#9a5a32',
      net: ['#3a6a5a', '#5a8a7a'], pot: ['#3a3a38', '#8a5a2a'], buoy: ['#f08a2a', '#e8e2d2'], fender: '#1a1a1a', rope: '#d8cdb8', wake: '#eefaf6',
    } },
    night: { glow: { window: '#ffd68a', lamp: '#fff2c0' }, on: .7 },
    anim: { paddle: { dy: 1.4, deg: 1.6, period: 4.2 } },
    reflect: true,
    tags: ['uk', 'coast', 'seaside', 'harbour', 'fishing', 'fishing-boat', 'trawler', 'kit:boats', 'kit:water', 'role:boat'],
    credit: 'coast-country kit (generic inshore fishing boat, no registration marks)',
    build(v) {
      const body = [];
      // a tile still (LOD < .5) draws the hull, the top strake, the wheelhouse and the mast: the rest is detail
      body.push({ s: '@wake', w: 1.8, op: .5, d: 'M-120 6h60M70 6h50', detail: true });
      // the mast, stays and derrick (behind the house)
      body.push({ s: '@iron.1', w: 3.4, d: 'M40 -46V-150' }, { s: '@iron.1', w: 1, op: .8, d: 'M40 -146L116 -48M40 -146L-100 -40', detail: true }, { s: '@iron.0', w: 2.2, d: 'M40 -96L96 -66', detail: true }, { s: '@iron.1', w: 1.4, d: 'M40 -132h8M40 -110h6', detail: true });
      body.push({ f: '@buoy.1', d: rect(34, -150, 12, 5), glow: 'lamp', detail: true }, { f: '@buoy.1', d: circ(40, -154, 2.6), glow: 'lamp', detail: true });
      // the hull: a sheer rising to the bow, clinker strakes, a contrasting top strake, antifouling at the waterline
      body.push(['@hull.' + v, 'M-112 -38L104 -50Q118 -52 118 -44L98 6H-102Q-114 -12 -112 -38z'], { f: '@hullD.' + v, d: 'M-108 -14L110 -18L98 6H-102z', op: .55, detail: true }, ['@top.' + v, 'M-113 -40L104 -52Q118 -54 119 -46L104 -44L-113 -34z']);
      body.push({ s: '@hullD.' + v, w: 1, op: .6, d: 'M-110 -26L112 -34M-106 -16L108 -22M-104 -6L104 -10', detail: true }, ['@anti.' + v, 'M-103 0H100L98 6H-102z']);
      body.push({ f: '@fender', d: ell(-60, -26, 4, 7) + ell(-10, -28, 4, 7) + ell(40, -31, 4, 7), detail: true }, { s: '@rope', w: 1, d: 'M-60 -40v8M-10 -42v8M40 -45v8', detail: true });
      // the wheelhouse: windows that light at dusk, a door, the roof with its lamp and exhaust
      body.push(['@house.0', rect(-84, -92, 54, 52)], { f: '@house.1', d: rect(-42, -92, 12, 52), op: .7, detail: true }, ['@iron.1', rect(-88, -96, 62, 5)], { f: '@iron.0', d: rect(-74, -110, 7, 16), detail: true }, { f: '@iron.1', d: rect(-75, -112, 9, 3), detail: true });
      body.push({ f: '@glass.0', d: rect(-80, -84, 14, 14), glow: 'window', detail: true }, { f: '@glass.0', d: rect(-62, -84, 14, 14), glow: 'window', detail: true }, { f: '@glass.0', d: 'M-44 -84h11v14h-11z', glow: 'window', detail: true }, { f: '@glass.1', d: 'M-80 -84h6l-6 6z', op: .4, detail: true }, { f: '@glass.1', d: 'M-62 -84h6l-6 6z', op: .4, detail: true });
      body.push({ f: '@house.1', d: rect(-60, -64, 14, 24), detail: true }, { f: '@buoy.1', d: rect(-50, -100, 6, 4), glow: 'lamp', detail: true }, { s: '@iron.1', w: 1.4, d: 'M-56 -96v-14M-62 -110h12', detail: true });
      // the gear
      if (v === 0) body.push({ s: '@iron.0', w: 4, d: 'M-108 -38L-100 -96L-92 -38', detail: true }, { s: '@iron.0', w: 3, d: 'M-104 -96h12', detail: true }, { s: '@rust', w: 1.2, op: .6, d: 'M-100 -96v-6', detail: true }, { f: '@net.0', d: 'M-20 -46q10 -16 30 -8q10 6 0 10z', detail: true }, { f: '@buoy.0', d: circ(70, -54, 5) + circ(80, -55, 5), detail: true });
      if (v === 1) body.push({ f: '@iron.1', d: rect(-24, -64, 34, 22), detail: true }, { f: '@net.0', d: ell(-7, -56, 15, 10), detail: true }, { f: '@net.1', d: ell(-10, -58, 9, 5), op: .7, detail: true }, { s: '@net.1', w: .8, op: .7, d: 'M-20 -60h26M-20 -54h26M-20 -48h26', detail: true }, { f: '@buoy.0', d: circ(70, -55, 5) + circ(82, -56, 5), detail: true });
      if (v === 2) { let pt = '', mesh = ''; for (const [x, y] of [[-20, -46], [2, -46], [24, -47], [-10, -60], [12, -61]]) { pt += `M${x} ${y}h20v-13q-10 -6 -20 0z`; mesh += `M${x + 4} ${y}v-14M${x + 10} ${y}v-16M${x + 16} ${y}v-14M${x} ${y - 6}h20`; } body.push({ f: '@pot.0', d: pt, detail: true }, { s: '@pot.1', w: .8, op: .8, d: mesh, detail: true }, { f: '@buoy.0', d: circ(74, -56, 5), detail: true }, { s: '@iron.1', w: 1.2, d: 'M74 -61v-16', detail: true }, { f: '@iron.1', d: circ(74, -79, 3), detail: true }); }
      body.push({ s: '@iron.0', w: 1.4, d: 'M70 -50v-10h40v6', detail: true }, { s: '@rope', w: 1.4, d: 'M114 -50q8 18 2 40', detail: true });
      return { body };
    },
  });
})();
