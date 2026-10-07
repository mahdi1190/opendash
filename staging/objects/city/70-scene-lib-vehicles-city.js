/* ============================================================
   SCENE LIBRARY: city vehicles (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per variant.

   Side views FACING RIGHT (the renderer mirrors a placement for traffic
   going left). Generic designs: no operator names, fleet numbers, route
   numbers, logos, number plates with text or brand liveries. The bus's
   destination blind and the cab's roof sign are plain lit panels.

   Parts: 'wheels' (still) and 'body' (bobs a little on its suspension).
   Windows glow at real dusk (glow 'window', a seeded share lit), lamps
   glow (glow 'lamp'); the 'lit' part holds the headlight beam and the red
   tail glow. Anchor: the road under the middle of the vehicle.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const circ = (x, y, r) => ell(x, y, r, r);
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  /** A rounded rectangle. */
  const rrect = (x, y, w, h, k) => `M${f1(x + k)} ${f1(y)}h${f1(w - 2 * k)}q${f1(k)} 0 ${f1(k)} ${f1(k)}v${f1(h - 2 * k)}q0 ${f1(k)} ${f1(-k)} ${f1(k)}h${f1(-w + 2 * k)}q${f1(-k)} 0 ${f1(-k)} ${f1(-k)}v${f1(-h + 2 * k)}q0 ${f1(-k)} ${f1(k)} ${f1(-k)}z`;
  const poly = pts => 'M' + pts.map(p => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'z';
  /** A wheel: tyre, rim, hub, a lit highlight on the upper left. */
  const wheel = (x, rw, rimSlot = '@rim') => [['@tyre', circ(x, -rw, rw)], [rimSlot + '.0', circ(x, -rw, rw * .62)], [rimSlot + '.1', circ(x, -rw, rw * .3)], { s: rimSlot + '.1', w: 1, op: .7, d: `M${f1(x - rw * .5)} ${f1(-rw)}h${f1(rw)}M${f1(x)} ${f1(-rw * 1.5)}v${f1(rw)}` }, { s: '#ffffff', w: 1, op: .18, d: `M${f1(x - rw * .8)} ${f1(-rw * 1.4)}q${f1(rw * .3)} ${f1(-rw * .4)} ${f1(rw * .8)} ${f1(-rw * .55)}` }];
  const arch = (x, rw, y0) => `M${f1(x - rw * 1.22)} ${f1(y0)}a${f1(rw * 1.22)} ${f1(rw * 1.22)} 0 0 1 ${f1(rw * 2.44)} 0z`;
  const beam = (x, y, len) => ({ f: { lin: [[0, '@beam', .45], [1, '@beam', 0]], x1: x, y1: 0, x2: x + len, y2: 0 }, d: `M${f1(x)} ${f1(y - 3)}L${f1(x + len)} ${f1(y - 22)}L${f1(x + len)} ${f1(y + 18)}z` });
  const tail = (x, y) => ({ f: { rad: [[0, '@tailg', .55], [1, '@tailg', 0]], cx: x, cy: y, r: 16 }, d: ell(x, y, 16, 12) });
  const COMMON = { tyre: '#1a1b1d', rim: ['#a8acb0', '#5a5e62'], beam: '#fff2c8', tailg: '#ff3a2a', tailL: '#b8282a', head: '#f4f2e6', dark: '#1e2226', trim: ['#2a2e32', '#5a5e62'] };

  /* =====================================================================
     vehicle.bus: a generic red double-decker (no operator branding).
     v0 a modern low-floor bus (flat front, deep windscreen, two doors),
     v1 a heritage half-cab with a rounded body, a cream band between the
     decks and an open rear platform, v2 a modern bus with a continuous
     glazed side and a staircase window.
     ===================================================================== */
  defineObj({
    id: 'vehicle.bus', category: 'vehicle', size: [370, 160], variants: 3, seasonal: false, flippable: true, parts: ['wheels', 'body', 'lit'],
    palette: { base: Object.assign({}, COMMON, {
      red: ['#c8202a', '#9a161e', '#e2484e', '#6a0e14'], cream: ['#efe4c8', '#cfc2a2'], glass: ['#24303c', '#5a7080', '#8aa4b4'], blind: '#2a2418', skirt: ['#3a3c40', '#26282a'], seat: '#4a2a3a',
    }) },
    night: { glow: { window: '#fff0c8', lamp: '#ffd27a' }, on: .9 },
    anim: { bob: { part: 'body', dy: .7, period: .8 } },
    shadow: { rx: 180, ry: 9, h: 150 },
    tags: ['uk', 'london', 'city', 'street', 'bus', 'double-decker', 'traffic', 'kit:london', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
    credit: 'city kit: a generic red double-decker, no operator branding',
    build(v) {
      const body = [], lit = [], L = 350, x0 = -L / 2, x1 = L / 2, H = 150, rw = 15;
      const wF = x1 - 62, wR = x0 + (v === 1 ? 74 : 92);
      if (v === 1) {
        // heritage: domed roof, upright half-cab front with a radiator, open platform at the back
        const outline = `M${x0 + 4} -10V${-H + 20}q0 -16 18 -18H${x1 - 30}q22 2 22 22V-82H${x1 + 4}V-14q0 -4 -4 -4V-10z`;
        body.push(['@red.0', outline], ['@red.1', `M${x0 + 4} -24H${x1 + 4}V-10H${x0 + 4}z`, .8], ['@red.2', `M${x0 + 22} ${-H + 3}H${x1 - 30}`.replace(/$/, `v3H${x0 + 22}z`), .7]);
        body.push(['@cream.0', rect(x0 + 4, -84, L - 30, 9)], ['@cream.1', rect(x0 + 4, -77, L - 30, 2)]);
        // upper deck windows (rounded tops), lower deck windows
        for (let i = 0; i < 6; i++) { const wx = x0 + 26 + i * 47; body.push({ f: '@glass.0', d: rrect(wx, -H + 14, 40, 34, 5), glow: 'window' }, ['@glass.2', `M${wx + 3} ${-H + 16}h12l-12 14z`, .3]); }
        for (let i = 0; i < 5; i++) { const wx = x0 + 44 + i * 47; body.push({ f: '@glass.0', d: rrect(wx, -70, 40, 30, 3), glow: 'window' }); }
        // the open rear platform with its pole, the cab, the bonnet and radiator
        body.push(['@dark', rect(x0 + 6, -70, 30, 52)], { s: '@cream.1', w: 2.4, d: `M${x0 + 20} -70v52` }, ['@skirt.0', rect(x0 + 4, -22, 34, 6)]);
        body.push({ f: '@glass.0', d: `M${x1 - 34} -74h20v34h-20z`, glow: 'window' }, ['@red.0', rect(x1 - 12, -66, 16, 48)], ['@trim.1', rect(x1 + 1, -62, 4, 30)], { s: '@trim.0', w: .8, d: `M${x1 + 2} -60v26M${x1 + 4} -60v26` });
        body.push({ f: '@blind', d: rect(x1 - 70, -H + 2, 40, 10), glow: 'lamp' }, { f: '@head', d: circ(x1 + 1, -28, 4), glow: 'lamp' }, ['@tailL', rect(x0 + 4, -36, 3, 8)]);
        body.push({ s: '@red.3', w: .8, op: .5, d: `M${x0 + 4} -84H${x1 - 26}M${x0 + 40} -18v-52` });
      } else {
        // modern: a slab body with a deep windscreen, a black window band on each deck
        body.push(['@red.0', rrect(x0, -H, L, H - 12, 9)], ['@red.2', rect(x0 + 8, -H + 2, L - 16, 3), .6], ['@red.1', rect(x0, -H + 60, L, 4), .7]);
        body.push(['@skirt.0', rect(x0, -28, L, 16)], ['@skirt.1', rect(x0, -16, L, 4)]);
        if (v === 2) {
          // continuous glazing on both decks, a slanted staircase window behind the front door
          body.push(['@dark', rrect(x0 + 10, -H + 12, L - 28, 44, 6)], ['@dark', rect(x0 + 10, -82, L - 62, 46)]);
          for (let i = 0; i < 7; i++) body.push({ f: '@glass.0', d: rect(x0 + 13 + i * 46, -H + 15, 43, 38), glow: 'window' });
          for (let i = 0; i < 6; i++) body.push({ f: '@glass.0', d: rect(x0 + 13 + i * 46, -79, 43, 40), glow: 'window' });
          body.push(['@glass.2', `M${x1 - 110} -84l40 -52h14l-40 52z`, .35]);
        } else {
          body.push(['@dark', rect(x0 + 8, -H + 14, L - 26, 40)], ['@dark', rect(x0 + 8, -82, L - 60, 46)]);
          for (let i = 0; i < 7; i++) body.push({ f: '@glass.0', d: rrect(x0 + 11 + i * 46.5, -H + 17, 43, 34, 3), glow: 'window' });
          for (let i = 0; i < 6; i++) body.push({ f: '@glass.0', d: rrect(x0 + 11 + i * 46.5, -79, 43, 40, 3), glow: 'window' });
        }
        for (let i = 0; i < 7; i++) body.push(['@glass.2', `M${x0 + 14 + i * 46.5} ${-H + 19}h14l-14 18z`, .22]);
        // the front: deep windscreen, destination blind (a plain lit panel), headlamp cluster
        body.push(['@dark', `M${x1 - 18} ${-H + 12}h14q4 0 4 6V-40h-18z`], { f: '@glass.1', d: `M${x1 - 16} -84h12V-44h-12z`, glow: 'window' }, { f: '@glass.0', d: `M${x1 - 16} ${-H + 16}h12v36h-12z`, glow: 'window' });
        body.push({ f: '@blind', d: rect(x1 - 15, -92, 12, 7), glow: 'lamp' }, { f: '@head', d: rrect(x1 - 8, -36, 8, 6, 2), glow: 'lamp' }, ['@tailL', rect(x0, -50, 3, 16)]);
        // doors: a front door behind the windscreen and a centre door (glazed, with a dark edge)
        for (const dx of [x1 - 52, x0 + 150]) body.push(['@dark', rect(dx, -80, 30, 52)], { f: '@glass.1', d: rect(dx + 2, -78, 12, 44), glow: 'window' }, { f: '@glass.1', d: rect(dx + 16, -78, 12, 44), glow: 'window' });
        body.push({ s: '@red.3', w: .8, op: .5, d: `M${x0 + 4} -86H${x1 - 4}` });
      }
      // the wheel arches (part of the body), the wheels underneath
      body.push(['@dark', arch(wF, rw, -12)], ['@dark', arch(wR, rw, -12)]);
      const wheels = [...wheel(wF, rw), ...wheel(wR, rw)];
      lit.push(beam(x1 + 2, -30, 120), tail(x0 + 1, -42));
      return { wheels, body, lit };
    },
  });

  /* =====================================================================
     vehicle.taxi-black: a generic city cab (tall roof, a turning circle's
     short wheelbase, a plain amber roof light with no lettering).
     v0 a classic rounded cab with separate front wings, v1 a modern cab
     (smooth, raked glass), v2 the classic in deep maroon, v3 the modern in
     dark silver-grey.
     ===================================================================== */
  defineObj({
    id: 'vehicle.taxi-black', category: 'vehicle', size: [170, 72], variants: 4, seasonal: false, flippable: true, parts: ['wheels', 'body', 'lit'],
    palette: { base: Object.assign({}, COMMON, {
      paint: ['#18191c', '#18191c', '#4a1a22', '#4a5058'], shine: ['#5a5e66', '#5a5e66', '#8a4a52', '#9aa2aa'], chrome: ['#c8ccd0', '#8a8e92'], glass: ['#1e2630', '#4a6070', '#7a94a6'], sign: '#5a4a20',
    }) },
    night: { glow: { window: '#6a5e44', lamp: '#ffc860' }, on: .7 },
    anim: { bob: { part: 'body', dy: .5, period: .6 } },
    shadow: { rx: 86, ry: 6, h: 66 },
    tags: ['uk', 'london', 'city', 'street', 'taxi', 'cab', 'traffic', 'kit:london', 'kit:vehicles', 'kit:urban', 'role:vehicle'],
    credit: 'city kit: a generic city cab, no lettering or livery',
    build(v) {
      const body = [], lit = [], P = `@paint.${v}`, S = `@shine.${v}`, classic = v % 2 === 0, rw = 11;
      const xF = 50, xR = -48;
      if (classic) {
        body.push([P, 'M-80-10V-36q0-6 8-8l8-2 10-18q3-4 10-4H24q6 0 9 4l12 16 26 2q10 1 11 10V-10z']);
        body.push([P, `M${xF - 20}-12q0-26 20-28h10q12 0 14 14V-12z`], [P, `M${xR - 22}-12q0-26 20-28h12q10 0 10 14V-12z`]);
        body.push({ f: '@glass.0', d: 'M-50-44l8-16h28v16z', glow: 'window' }, { f: '@glass.0', d: 'M-10-60h30q4 0 6 3l9 13H-10z', glow: 'window' }, ['@glass.2', 'M-42-58h8l-10 12z', .3]);
        body.push(['@chrome.0', rect(76, -32, 6, 14)], { s: '@chrome.1', w: .7, d: 'M77-30v10M79-30v10M81-30v10' }, ['@chrome.0', rect(-82, -16, 10, 3)], ['@chrome.0', rect(70, -16, 14, 3)]);
        body.push({ s: S, w: 1.2, op: .7, d: 'M-74-38H70M-12-60v46' }, ['@dark', rect(-14, -40, 1.6, 26)]);
        body.push({ f: '@head', d: circ(70, -30, 4.4), glow: 'lamp' }, ['@chrome.1', circ(70, -30, 5.4), .5], { f: '@head', d: circ(70, -30, 3.6), glow: 'lamp' });
        body.push(['@trim.0', rect(-24, -72, 22, 6)], { f: '@sign', d: rect(-22, -71, 18, 4), glow: 'lamp' });
      } else {
        body.push([P, 'M-82-12V-38q0-8 8-10l10-2 10-16q4-6 12-6H20q8 0 12 6l14 16 22 2q12 2 14 14V-12z']);
        body.push({ f: '@glass.0', d: 'M-54-48l10-16h30v16z', glow: 'window' }, { f: '@glass.0', d: 'M-10-64h28q6 0 9 5l9 11H-10z', glow: 'window' }, ['@glass.0', 'M40-48l-10-14h4l14 14z'], ['@glass.2', 'M-44-62h8l-12 12z', .3]);
        body.push({ s: S, w: 1.2, op: .7, d: 'M-78-40H74M-12-64v50' }, ['@dark', rect(-14, -44, 1.6, 30)], ['@trim.0', rect(-82, -18, 164, 6)]);
        body.push({ f: '@head', d: 'M70-38h10q3 0 3 4h-14z', glow: 'lamp' }, ['@trim.1', rect(74, -28, 8, 6)]);
        body.push(['@trim.0', rect(-26, -76, 24, 6)], { f: '@sign', d: rect(-24, -75, 20, 4), glow: 'lamp' });
      }
      body.push(['@dark', arch(xF, rw, -12)], ['@dark', arch(xR, rw, -12)], ['@tailL', rect(-82, -36, 3, 8)], ['@dark', rect(-6, -36, 8, 2)]);
      const wheels = [...wheel(xF, rw), ...wheel(xR, rw)];
      lit.push(beam(82, -30, 90), tail(-81, -32));
      return { wheels, body, lit };
    },
  });

  /* =====================================================================
     vehicle.car-city: everyday cars. v % 6 the type: hatchback, saloon,
     estate, small SUV, city car, panel van; the colour from the variant
     (12 variants). No badges or plates with text.
     ===================================================================== */
  const CARS = [
    // L, rw, belt, roof, ws0 (windscreen foot from front), ws1 (top), rr1 (roof back), rr0 (rear glass foot), hood drop, nose
    { L: 150, rw: 11, belt: 30, roof: 52, ws0: 44, ws1: 70, rr1: 132, rr0: 146, nose: 6 },     // hatchback
    { L: 172, rw: 11.5, belt: 28, roof: 50, ws0: 54, ws1: 82, rr1: 132, rr0: 152, nose: 6, boot: 6 },   // saloon
    { L: 178, rw: 11.5, belt: 30, roof: 52, ws0: 52, ws1: 80, rr1: 170, rr0: 176, nose: 6 },    // estate
    { L: 168, rw: 13.5, belt: 38, roof: 64, ws0: 50, ws1: 74, rr1: 156, rr0: 164, nose: 8, high: 8 },   // SUV
    { L: 124, rw: 10, belt: 30, roof: 54, ws0: 32, ws1: 54, rr1: 112, rr0: 122, nose: 4 },     // city car
    { L: 176, rw: 12, belt: 40, roof: 76, ws0: 34, ws1: 58, rr1: 176, rr0: 176, nose: 8, van: true },   // panel van
  ];
  const CAR_PAINT = ['#b8282e', '#1f3a6a', '#e8e8e6', '#3a3e44', '#8a9aa6', '#2a5a4a', '#d8a030', '#5a2a3a', '#a8acb0', '#18191c', '#4a7ab0', '#c86a2a'];
  defineObj({
    id: 'vehicle.car-city', category: 'vehicle', size: [180, 80], variants: 12, seasonal: false, flippable: true, parts: ['wheels', 'body', 'lit'],
    palette: { base: Object.assign({}, COMMON, { paint: CAR_PAINT, shine: CAR_PAINT.map(c => { const n = parseInt(c.slice(1), 16), m = k => Math.min(255, Math.round(((n >> k) & 255) * .6 + 102)); return '#' + [16, 8, 0].map(k => m(k).toString(16).padStart(2, '0')).join(''); }), shade: CAR_PAINT.map(c => { const n = parseInt(c.slice(1), 16), m = k => Math.round(((n >> k) & 255) * .62); return '#' + [16, 8, 0].map(k => m(k).toString(16).padStart(2, '0')).join(''); }), glass: ['#22303c', '#5a7486', '#8aa4b6'] }) },
    night: { glow: { window: '#5a5444', lamp: '#fff0c8' }, on: .6 },
    anim: { bob: { part: 'body', dy: .5, period: .55 } },
    shadow: { rx: 86, ry: 6, h: 60 },
    tags: ['city', 'street', 'car', 'traffic', 'kit:vehicles', 'kit:urban', 'kit:london', 'role:vehicle'],
    credit: 'city kit: generic cars (hatchback, saloon, estate, SUV, city car, van)',
    build(v) {
      const C = CARS[v % 6], P = `@paint.${v}`, S = `@shine.${v}`, D = `@shade.${v}`, body = [], lit = [];
      const L = C.L, xF = L / 2, xB = -L / 2, g = 9 + (C.high || 0) * .4, belt = C.belt + (C.high || 0) * .3, roof = C.roof;
      const X = d => xF - d;   // distance from the front
      // the body: bumper to bumper, a rounded nose, the bonnet, glasshouse, roof, tail
      const out = C.van
        ? `M${xB} ${-g}V${-roof + 4}q0-4 4-4H${X(C.ws1)}L${X(C.ws0)} ${-belt - 6}q14 2 ${C.ws0 - 14} 10L${xF} ${-belt + 6}V${-g}z`
        : `M${xB + 2} ${-g}L${xB} ${-belt + 2}L${X(C.rr0)} ${-belt - (C.boot || 0)}L${X(C.rr1)} ${-roof}H${X(C.ws1)}L${X(C.ws0)} ${-belt - 4}Q${xF - 6} ${-belt - 2} ${xF} ${-belt + C.nose}V${-g}z`;
      body.push([P, out], [D, `M${xB + 2} ${-g}H${xF}V${-g - 8}H${xB + 1}z`, .8], { s: S, w: 1.4, op: .7, d: `M${xB + 3} ${-belt + 4}H${xF - 4}` });
      // windows: front and rear side glass split by the B pillar (glow), plus the van's single cab window
      const gy = -belt - 3, top = -roof + 4, mid = (X(C.ws0) + X(C.rr0)) / 2;
      if (C.van) {
        body.push({ f: '@glass.0', d: poly([[X(C.ws0) - 6, gy], [X(C.ws1) - 2, top], [X(C.ws1) - 26, top], [X(C.ws1) - 26, gy]]), glow: 'window' }, { f: '@glass.0', d: poly([[X(C.ws0) + 1, gy + 2], [X(C.ws1) + 2, top + 2], [X(C.ws1) + 4, top + 2], [X(C.ws0) + 4, gy + 2]]), glow: 'window' }, { s: D, w: 1, op: .6, d: `M${X(C.ws1) - 30} ${-roof + 2}V${-g - 2}M${xB + 50} ${-roof + 2}V${-g - 2}` });
        body.push(['@trim.0', rect(xB + 60, -belt - 4, 40, 2)]);
      } else {
        const bx = mid + (C.ws1 - C.ws0) * .1;
        const xA = X(C.ws0) - 5, xAt = X(C.ws1) - 2, xCt = X(C.rr1) + 3, xC = X(C.rr0) + 5;
        body.push({ f: '@glass.0', d: poly([[xA, gy], [xAt, top], [bx + 2, top], [bx + 2, gy]]), glow: 'window' }, { f: '@glass.0', d: poly([[bx - 2, gy], [bx - 2, top], [xCt, top], [xC, gy]]), glow: 'window' }, ['@glass.2', poly([[xAt - 2, top + 1], [xAt - 10, top + 1], [xA - 12, gy - 2], [xA - 6, gy - 2]]), .25], [P, rect(bx - 2, top, 4, gy - top)]);
        body.push({ s: D, w: .9, op: .6, d: `M${f1(bx)} ${f1(gy)}V${-g - 4}M${f1(X(C.ws0) - 2)} ${f1(gy)}V${-g - 4}` }, ['@trim.0', rect(bx + 6, gy + 6, 7, 2)], ['@trim.0', rect(xC + 10, gy + 6, 7, 2)]);
      }
      // lamps: the headlamp (glow), a side indicator (glow), the tail lamp, a mirror
      body.push({ f: '@head', d: `M${xF - 9} ${-belt + 2}h7q2 0 2 4h-9z`, glow: 'lamp' }, { f: '#e89a3a', d: rect(xF - 22, -belt + 2, 4, 2), glow: 'lamp' }, ['@tailL', rect(xB, -belt + 2, 4, 7)], [D, `M${X(C.ws0) - 4} ${gy}h6v-4h-4z`]);
      body.push(['@trim.0', rect(xF - 6, -g - 6, 6, 5)], ['@trim.0', rect(xB, -g - 6, 6, 5)]);
      const xFw = xF - C.rw - 14 - (C.van ? 4 : 0), xRw = xB + C.rw + 16;
      body.push(['@dark', arch(xFw, C.rw, -g + 1)], ['@dark', arch(xRw, C.rw, -g + 1)]);
      const wheels = [...wheel(xFw, C.rw), ...wheel(xRw, C.rw)];
      lit.push(beam(xF, -belt + 4, 90), tail(xB + 1, -belt + 5));
      return { wheels, body, lit };
    },
  });
})();
