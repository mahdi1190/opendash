/* ============================================================
   SCENE LIBRARY: city structures (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per variant.

   River bridges in the manner of the Thames crossings, GENERIC (no real
   bridge is copied, no crests or lettering): a multi-arch bridge and a
   suspension bridge, seen side on. Lamps along the parapet light at real
   dusk (glow 'lamp'); the 'lit' part holds their halos, the light strips
   under the arches and the festoon lights along the cables. Anchor: the
   waterline at the middle of the bridge; the river bank abutments sit at
   the two ends. reflect: true (they stand in water).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  /** Drop shapes with no path data (a season or variant that draws nothing in a slot); strokes are round-capped. */
  const tidy = parts => { for (const k of Object.keys(parts)) parts[k] = parts[k].filter(sh => sh && (Array.isArray(sh) ? sh[1] : sh.d)).map(sh => (!Array.isArray(sh) && sh.s && !sh.cap ? Object.assign({ cap: 'round' }, sh) : sh)); return parts; };
  const defineObj = def => sceneObjDefine(Object.assign({}, def, { build: (v, r, ctx) => tidy(def.build(v, r, ctx)) }));
  const f1 = v => Math.round(v * 10) / 10;
  const rect = (x, y, w, h) => `M${f1(x)} ${f1(y)}h${f1(w)}v${f1(h)}h${f1(-w)}z`;
  const ell = (x, y, rx, ry) => `M${f1(x - rx)} ${f1(y)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
  const halo = (cx, cy, r) => ({ f: { rad: [[0, '@halo', .55], [.3, '@halo', .2], [1, '@halo', 0]], cx, cy, r }, d: ell(cx, cy, r, r) });
  /** A parapet lamp standard: a short column with a lantern (glow) at (x, y = the parapet top). */
  const lamp = (x, y, I) => [{ s: I, w: 2.4, d: `M${f1(x)} ${f1(y)}v-26` }, [I, rect(x - 4, y - 3, 8, 3)], { f: '@lampg', d: `M${f1(x - 4)} ${f1(y - 38)}h8l-1.4 11h-5.2z`, glow: 'lamp' }, [I, `M${f1(x - 6)} ${f1(y - 38)}h12l-4-5h-4z`], [I, ell(x, y - 44.5, 1.6, 1.6)]];

  /* =====================================================================
     structure.bridge-arch: v0 five cast-iron arches painted green on
     granite piers, v1 seven stone arches (semicircular, rusticated
     voussoirs), v2 three shallow concrete arches with a slim deck, v3 five
     cast-iron arches painted deep red.
     ===================================================================== */
  defineObj({
    id: 'structure.bridge-arch', category: 'structure', size: [1500, 230], variants: 4, seasonal: false, flippable: true, parts: ['body', 'lit'],
    palette: { base: {
      granite: ['#a8a296', '#847e72', '#c4beb2', '#5e5a52'], stone: ['#cbbf9e', '#a89a78', '#e0d6ba', '#7a6e54'], conc: ['#c8c6c0', '#a2a09a', '#e2e0da', '#76746e'],
      green: ['#2e5a46', '#1e3e30', '#4a7a62'], red: ['#8a2a2a', '#5e1a1a', '#b04a42'], iron: ['#22262a', '#3a3e44'], gold: '#b8984a',
      under: '#2a2e32', lampg: '#e8e4d0', halo: '#ffe0a0', strip: '#ffd890', wet: '#4a5a5a',
    } },
    night: { glow: { lamp: '#ffe2a0' }, on: 1 },
    reflect: true,
    tags: ['uk', 'london', 'city', 'river', 'thames', 'bridge', 'arch-bridge', 'embankment', 'signature', 'kit:london', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'city kit: a generic multi-arch river bridge',
    build(v) {
      const body = [], lit = [];
      const W = 1440, x0 = -W / 2, n = [5, 7, 3, 5][v], abut = 70, pw = v === 2 ? 34 : v === 1 ? 46 : 40;
      const deck = v === 2 ? 128 : 150, soffit = deck - (v === 2 ? 16 : 24), spring = v === 1 ? 46 : v === 2 ? 40 : 56;
      const M = v === 0 ? 'green' : v === 3 ? 'red' : null, S = v === 1 ? 'stone' : v === 2 ? 'conc' : 'granite';
      const span = (W - 2 * abut - (n - 1) * pw) / n;
      // the spans: arch spandrels hang from the deck; under each arch, the dark soffit seen through
      for (let i = 0; i < n; i++) {
        const xa = x0 + abut + i * (span + pw), xb = xa + span, rise = soffit - spring - (v === 2 ? 6 : 4), mid = xa + span / 2;
        const ry = v === 1 ? Math.min(rise, span / 2) : rise;
        const arc = `M${f1(xa)} ${f1(-spring)}A${f1(span / 2)} ${f1(ry)} 0 0 1 ${f1(xb)} ${f1(-spring)}`;
        if (M) {
          // cast iron: a solid outer rib, open spandrels with vertical posts, a lighter inner rib
          body.push([`@${M}.0`, `${arc}V${f1(-spring - 10)}A${f1(span / 2)} ${f1(ry - 10)} 0 0 0 ${f1(xa)} ${f1(-spring - 10)}z`], { s: `@${M}.2`, w: 1.4, op: .7, d: `M${f1(xa + 6)} ${f1(-spring - 6)}A${f1(span / 2 - 6)} ${f1(ry - 6)} 0 0 1 ${f1(xb - 6)} ${f1(-spring - 6)}` });
          let posts = '';
          for (let k = 1; k < 12; k++) { const x = xa + span * k / 12, t = (x - mid) / (span / 2), y = -spring - ry * Math.sqrt(Math.max(0, 1 - t * t)); posts += `M${f1(x)} ${f1(y - 8)}V${f1(-soffit)}`; }
          body.push({ s: `@${M}.0`, w: 3, d: posts }, { s: `@${M}.1`, w: 1, op: .6, d: posts.replace(/M(-?[\d.]+)/g, (m, x) => `M${f1(+x + 1.6)}`) });
          body.push([`@${M}.0`, rect(xa - 2, -soffit - 2, span + 4, 8)]);
        } else {
          // masonry or concrete: a solid spandrel over the arch, voussoirs round the stone arches
          body.push([`@${S}.0`, `${arc}V${f1(-soffit)}H${f1(xa)}z`], [`@${S}.1`, `${arc}V${f1(-spring - 4)}A${f1(span / 2)} ${f1(ry + 4)} 0 0 0 ${f1(xa)} ${f1(-spring - 4)}z`, .5]);
          if (v === 1) { let vs = ''; for (let k = 1; k < 16; k++) { const a = Math.PI * k / 16, cx = mid - Math.cos(a) * span / 2, cy = -spring - Math.sin(a) * ry; vs += `M${f1(cx)} ${f1(cy)}L${f1(cx - Math.cos(a) * 14)} ${f1(cy - Math.sin(a) * 14)}`; } body.push({ s: `@${S}.3`, w: 1, op: .6, d: vs }, { s: `@${S}.2`, w: 2, op: .6, d: `M${f1(xa - 4)} ${f1(-spring - 2)}A${f1(span / 2 + 4)} ${f1(ry + 16)} 0 0 1 ${f1(xb + 4)} ${f1(-spring - 2)}` }); }
        }
        // under the arch at night: a warm light strip along the soffit
        lit.push({ s: '@strip', w: 2.2, op: .75, d: `M${f1(xa + 4)} ${f1(-spring - 2)}A${f1(span / 2 - 4)} ${f1(ry - 2)} 0 0 1 ${f1(xb - 4)} ${f1(-spring - 2)}` }, { f: { lin: [[0, '@strip', .22], [1, '@strip', 0]], x1: 0, y1: -spring - ry, x2: 0, y2: -spring }, d: `M${f1(xa + 4)} ${f1(-spring)}A${f1(span / 2 - 4)} ${f1(ry - 4)} 0 0 1 ${f1(xb - 4)} ${f1(-spring)}z` });
      }
      // the piers with their cutwaters (lit face on the left), wet at the waterline
      for (let i = 1; i < n; i++) {
        const px = x0 + abut + i * (span + pw) - pw;
        body.push([`@${S === 'conc' ? 'conc' : 'granite'}.0`, rect(px, -soffit, pw, soffit)], [`@${S === 'conc' ? 'conc' : 'granite'}.1`, rect(px + pw * .62, -soffit, pw * .38, soffit), .7]);
        if (v !== 2) body.push([`@${S}.2`, `M${f1(px + pw * .2)} 0V${f1(-spring + 6)}l${f1(pw * .3)} -14l${f1(pw * .3)} 14V0z`], [`@${S}.3`, `M${f1(px + pw * .5)} ${f1(-spring - 8)}l${f1(pw * .3)} 14V0h${f1(-pw * .3)}z`, .5], [`@${S}.0`, rect(px - 4, -spring + 4, pw + 8, 5)]);
        if (M) body.push([`@${M}.0`, rect(px - 2, -soffit, pw + 4, 12)], ['@gold', rect(px + pw * .3, -soffit + 3, pw * .4, 4)]);
        body.push(['@wet', rect(px, -10, pw, 10), .6]);
      }
      // the abutments on each bank and the embankment wall
      for (const sx of [-1, 1]) { const ax = sx < 0 ? x0 - 30 : -x0 - abut; body.push([`@${S === 'conc' ? 'conc' : 'granite'}.0`, rect(ax, -deck, abut + 30, deck)], [`@${S === 'conc' ? 'conc' : 'granite'}.1`, rect(ax, -deck, abut + 30, deck), sx > 0 ? .45 : 0], { s: `@${S === 'conc' ? 'conc' : 'granite'}.3`, w: .8, op: .35, d: Array.from({ length: 10 }, (_, k) => `M${f1(ax)} ${f1(-deck + 12 + k * 14)}h${abut + 30}`).join('') }, ['@wet', rect(ax, -10, abut + 30, 10), .6]); }
      // the deck: fascia, cornice, parapet (balusters for stone, an iron rail otherwise)
      body.push([`@${S}.0`, rect(x0 - 30, -deck, W + 60, deck - soffit)], [`@${S}.2`, rect(x0 - 32, -deck - 4, W + 64, 5)], [`@${S}.3`, rect(x0 - 30, -soffit - 3, W + 60, 3), .5]);
      if (M) body.push([`@${M}.0`, rect(x0 + abut - 6, -deck + 1, W - 2 * abut + 12, deck - soffit - 2)], [`@${M}.2`, rect(x0 + abut - 6, -deck + 2, W - 2 * abut + 12, 2), .6]);
      if (v === 1 || v === 0 || v === 3) {
        const top = -deck - 26;
        body.push([`@${S}.2`, rect(x0 - 32, top - 4, W + 64, 5)]);
        if (v === 1) body.push({ s: `@${S}.1`, w: 3.4, d: Array.from({ length: R(W / 9) }, (_, k) => `M${f1(x0 - 26 + k * 9)} ${f1(-deck - 4)}v-22`).join('') });
        else body.push({ s: '@iron.0', w: 1.4, d: Array.from({ length: R(W / 8) }, (_, k) => `M${f1(x0 - 28 + k * 8)} ${f1(-deck - 4)}v-22`).join('') + `M${f1(x0 - 30)} ${f1(-deck - 14)}h${W + 60}` });
      } else body.push({ s: '@iron.1', w: 2, d: `M${f1(x0 - 30)} ${f1(-deck - 18)}h${W + 60}M${f1(x0 - 30)} ${f1(-deck - 10)}h${W + 60}` }, { s: '@iron.1', w: 1.4, d: Array.from({ length: 40 }, (_, k) => `M${f1(x0 - 28 + k * W / 39)} ${f1(-deck - 4)}v-14`).join('') });
      // lamp standards over each pier and the abutments
      const I = M ? `@${M}.1` : '@iron.0', ptop = v === 2 ? -deck - 22 : -deck - 30;
      const lx = [x0 + abut / 2, ...Array.from({ length: n - 1 }, (_, i) => x0 + abut + (i + 1) * (span + pw) - pw / 2), -x0 - abut / 2];
      for (const x of lx) { body.push(...lamp(x, ptop, I)); lit.push(halo(x, ptop - 32, 40)); }
      return { body, lit };
    },
  });
  const R = Math.round;

  /* =====================================================================
     structure.bridge-suspension: two towers, sagging main cables with
     vertical hangers, a truss-stiffened deck, side spans to the banks.
     v0 ornamental painted steel towers (pale green and cream) with festoon
     lights, v1 stone portal towers with arched openings and iron chains,
     v2 slender modern white concrete towers.
     ===================================================================== */
  defineObj({
    id: 'structure.bridge-suspension', category: 'structure', size: [1520, 400], variants: 3, seasonal: false, flippable: true, parts: ['body', 'lit'],
    palette: { base: {
      paint: ['#b8ccb4', '#8aa488', '#dce8d8', '#5a7258'], cream: ['#ece2c8', '#c8bc9e'], stone: ['#c4bca8', '#9e9682', '#ddd6c4', '#6e6858'], white: ['#e8e8e4', '#bcbcb6', '#fafaf8', '#8a8a84'],
      chain: ['#3a4a44', '#5a6e66'], cable: '#4a4e52', deck: ['#5a6064', '#3a3e42', '#7a8084'], granite: ['#9a948a', '#76716a'], wet: '#4a5a5a',
      lampg: '#e8e4d0', halo: '#ffe0a0', bulb: '#fff0c0', flood: '#ffe8c0',
    } },
    night: { glow: { lamp: '#ffe2a0' }, on: 1 },
    reflect: true,
    tags: ['uk', 'london', 'city', 'river', 'thames', 'bridge', 'suspension-bridge', 'embankment', 'signature', 'kit:london', 'kit:urban', 'kit:water', 'role:building-mid'],
    credit: 'city kit: a generic river suspension bridge',
    build(v) {
      const body = [], lit = [];
      const W = 1480, x0 = -W / 2, deck = 110, tx = W * .3, tH = [270, 250, 300][v], tW = [56, 70, 30][v];
      const P = ['paint', 'stone', 'white'][v], cab = v === 1 ? '@chain.0' : '@cable', sag = deck + 26;
      // cable y at x (main span: a parabola from tower top to sag at the middle; side spans: tower top to the anchorage)
      const top = -deck - tH + 14;
      const cy = (x) => {
        const ax = Math.abs(x);
        if (ax <= tx) { const t = ax / tx; return -sag + (top + sag) * t * t; }
        const t = (ax - tx) / (W / 2 - tx); return top + (-deck - 20 - top) * (t * (2 - t)) * .98 + 0;
      };
      // the river piers under the towers
      for (const sx of [-1, 1]) body.push(['@granite.0', rect(sx * tx - tW / 2 - 14, -deck + 10, tW + 28, deck - 10)], ['@granite.1', rect(sx * tx + tW / 2 - 4, -deck + 10, 18, deck - 10), .7], ['@granite.0', `M${f1(sx * tx - tW / 2 - 20)} 0l6 -24h${f1(tW + 28)}l6 24z`], ['@wet', rect(sx * tx - tW / 2 - 20, -10, tW + 40, 10), .6]);
      // the bank abutments and anchorages
      for (const sx of [-1, 1]) { const ax = sx < 0 ? x0 - 20 : -x0 - 60; body.push(['@granite.0', rect(ax, -deck - 20, 80, deck + 20)], ['@granite.1', rect(ax, -deck - 20, 80, 6)], ['@wet', rect(ax, -10, 80, 10), .6]); }
      // the deck: a stiffening truss under the roadway
      body.push(['@deck.0', rect(x0 - 10, -deck, W + 20, 12)], ['@deck.1', rect(x0 - 10, -deck + 12, W + 20, 14)]);
      let truss = ''; for (let x = x0; x < -x0; x += 16) truss += `M${f1(x)} ${f1(-deck + 12)}l8 14l8 -14`;
      body.push({ s: '@deck.2', w: 1.2, op: .8, d: truss }, { s: '@deck.2', w: 1.4, d: `M${f1(x0 - 10)} ${f1(-deck + 26)}h${W + 20}` });
      body.push({ s: '@deck.1', w: 1.4, d: `M${f1(x0 - 10)} ${f1(-deck - 12)}h${W + 20}M${f1(x0 - 10)} ${f1(-deck - 5)}h${W + 20}` }, { s: '@deck.1', w: 1, d: Array.from({ length: 80 }, (_, k) => `M${f1(x0 + k * W / 79)} ${f1(-deck)}v-12`).join('') });
      // hangers from the cables to the deck
      let hang = ''; for (let x = x0 + 40; x < -x0 - 40; x += 20) { if (Math.abs(Math.abs(x) - tx) < tW) continue; const y = cy(x); if (y < -deck - 6) hang += `M${f1(x)} ${f1(y)}V${f1(-deck)}`; }
      body.push({ s: cab, w: 1, op: .8, d: hang });
      // the main cables (two in step; the near one drawn bolder)
      let cable = `M${f1(x0 + 20)} ${f1(-deck - 20)}`; for (let x = x0 + 30; x <= -x0 - 20; x += 10) cable += `L${f1(x)} ${f1(cy(x))}`;
      body.push({ s: cab, w: v === 1 ? 5 : 3.4, d: cable }, { s: v === 1 ? '@chain.1' : '@deck.2', w: 1, op: .6, d: cable.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, a, b) => `${a} ${f1(+b - 1.4)}`) });
      // the towers
      for (const sx of [-1, 1]) {
        const cx = sx * tx, l = cx - tW / 2, ty = -deck - tH;
        if (v === 0) {
          // ornamental steel: twin legs with cross bracing, a cream band, a pointed cap with finials
          body.push([`@${P}.0`, rect(l, ty + 30, 14, tH - 30) + rect(l + tW - 14, ty + 30, 14, tH - 30)], [`@${P}.1`, rect(l + 9, ty + 30, 5, tH - 30) + rect(l + tW - 5, ty + 30, 5, tH - 30), .7]);
          let br = ''; for (let k = 0; k < 4; k++) { const y0 = ty + 50 + k * 50; br += `M${f1(l + 14)} ${f1(y0)}L${f1(l + tW - 14)} ${f1(y0 + 46)}M${f1(l + tW - 14)} ${f1(y0)}L${f1(l + 14)} ${f1(y0 + 46)}`; }
          body.push({ s: `@${P}.1`, w: 2, d: br }, ['@cream.0', rect(l - 4, ty + 30, tW + 8, 12)], ['@cream.1', rect(l - 4, ty + 38, tW + 8, 4)], ['@cream.0', rect(l - 4, -deck - 40, tW + 8, 10)]);
          body.push([`@${P}.0`, `M${f1(l - 2)} ${f1(ty + 30)}L${f1(cx)} ${f1(ty - 10)}L${f1(l + tW + 2)} ${f1(ty + 30)}z`], [`@${P}.1`, `M${f1(cx)} ${f1(ty - 10)}L${f1(l + tW + 2)} ${f1(ty + 30)}H${f1(cx + 4)}z`, .6], ['@cream.0', ell(cx, ty - 13, 3, 3)], ['@cream.0', `M${f1(l - 2)} ${f1(ty + 30)}l3 -10l3 10zM${f1(l + tW - 4)} ${f1(ty + 30)}l3 -10l3 10z`]);
        } else if (v === 1) {
          // stone portal: two piers joined by an arch at the top and a lintel at the deck, a cornice and cap
          body.push([`@${P}.0`, `M${f1(l)} ${f1(-deck)}V${f1(ty + 20)}H${f1(l + tW)}V${f1(-deck)}H${f1(l + tW - 18)}V${f1(ty + 70)}A${f1(tW / 2 - 18)} 22 0 0 0 ${f1(l + 18)} ${f1(ty + 70)}V${f1(-deck)}z`], [`@${P}.1`, rect(l + tW - 10, ty + 20, 10, tH - 20), .7]);
          body.push({ s: `@${P}.3`, w: .8, op: .4, d: Array.from({ length: R(tH / 14) }, (_, k) => `M${f1(l)} ${f1(ty + 24 + k * 14)}h18M${f1(l + tW - 18)} ${f1(ty + 24 + k * 14)}h18`).join('') }, [`@${P}.2`, rect(l - 5, ty + 12, tW + 10, 9)], [`@${P}.0`, `M${f1(l - 2)} ${f1(ty + 12)}l6 -16h${f1(tW - 8)}l6 16z`], [`@${P}.2`, rect(l - 4, -deck - 34, tW + 8, 6)]);
          lit.push({ f: { lin: [[0, '@flood', .4], [1, '@flood', 0]], x1: 0, y1: -deck, x2: 0, y2: ty }, d: rect(l, ty + 4, tW, tH - 4) });
        } else {
          // modern: a slim tapered white mast pair, a single cross beam
          body.push([`@${P}.0`, `M${f1(l)} ${f1(-deck + 10)}L${f1(l + 6)} ${f1(ty)}h8L${f1(l + 16)} ${f1(-deck + 10)}z`], [`@${P}.0`, `M${f1(l + tW - 16)} ${f1(-deck + 10)}L${f1(l + tW - 14)} ${f1(ty)}h8L${f1(l + tW)} ${f1(-deck + 10)}z`], [`@${P}.1`, `M${f1(l + tW - 7)} ${f1(-deck + 10)}L${f1(l + tW - 8)} ${f1(ty)}h2L${f1(l + tW)} ${f1(-deck + 10)}z`, .7], [`@${P}.0`, rect(l + 4, ty + 40, tW - 8, 8)]);
          lit.push({ s: '@bulb', w: 1.6, op: .85, d: `M${f1(l + 10)} ${f1(-deck)}L${f1(l + 10)} ${f1(ty + 2)}M${f1(l + tW - 10)} ${f1(-deck)}L${f1(l + tW - 10)} ${f1(ty + 2)}` });
        }
        // the saddle where the cable crosses the tower top
        body.push([cab, ell(cx, top, 6, 4)]);
      }
      // deck lamps (glow) and, at night, their halos and the festoon lights along the cables
      for (let x = x0 + 60; x < -x0 - 40; x += 120) { body.push({ s: '@deck.1', w: 2, d: `M${f1(x)} ${f1(-deck - 12)}v-18` }, { f: '@lampg', d: rect(x - 3, -deck - 38, 6, 8), glow: 'lamp' }, ['@deck.1', rect(x - 4.5, -deck - 40, 9, 3)]); lit.push(halo(x, -deck - 34, 30)); }
      if (v !== 2) { let b = ''; for (let x = x0 + 30; x < -x0 - 20; x += 14) b += ell(x, cy(x) + 1, 1.8, 1.8); lit.push({ f: '@bulb', d: b }, { s: '@halo', w: 6, op: .18, d: cable }); }
      return { body, lit };
    },
  });
})();
