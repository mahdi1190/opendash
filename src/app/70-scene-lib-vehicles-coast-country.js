/* ============================================================
   SCENE LIBRARY: vehicles, coast-country kit (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   A farm tractor, FACING RIGHT, no maker's marks. Head and work lamps light
   at real dusk. Anchor: the ground under the middle.
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

  /* ---------- vehicle.tractor: a farm tractor (big rear wheels, small front, a glazed cab); v0 green, v1 red, v2 blue, v3 an old grey tractor with no cab. No maker's marks ---------- */
  defineObj({
    id: 'vehicle.tractor', category: 'vehicle', size: [200, 148], variants: 4, seasonal: false, flippable: true,
    palette: { base: {
      paint: ['#3a7a34', '#b8322a', '#2a5a9a', '#8a8e88'], paintD: ['#28582a', '#86241e', '#1e4270', '#666a64'], paintL: ['#5a9a4a', '#d8524a', '#4a7aba', '#a8aca6'],
      rim: ['#f0c838', '#a8acb0', '#eeeeea', '#b8322a'], tyre: ['#262626', '#3a3a3a', '#141414'], glass: ['#3e5260', '#a8c4d0'], frame: '#1e2226', iron: ['#3a3e44', '#5a5e64', '#22262a'],
      lamp: '#f4ecd0', tail: '#c02a20', mud: ['#6a5a44', '#4a3e30'], seat: '#2a2a2a',
    } },
    night: { glow: { window: '#ffe6a8', lamp: '#fff4c8' }, on: .9 },
    anim: { bob: { part: '*', dy: .5, period: .45 } },
    shadow: { rx: 90, ry: 9, h: 110 },
    tags: ['uk', 'countryside', 'farm', 'field', 'lane', 'tractor', 'kit:vehicles', 'kit:temperate', 'role:vehicle'],
    credit: 'coast-country kit (generic farm tractor, no maker livery)',
    build(v) {
      const P = i => `@${['paint', 'paintD', 'paintL'][i]}.${v}`, old = v === 3, body = [];
      const wheel = (cx, cy, R, rim) => {
        const out = [['@tyre.0', circ(cx, cy, R)]];
        let lug = ''; const n = Math.round(R * .9); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), t = -s, u = c; lug += `M${f1(cx + c * (R - 1))} ${f1(cy + s * (R - 1))}l${f1(c * 3 + t * 3)} ${f1(s * 3 + u * 3)}l${f1(t * 3.4)} ${f1(u * 3.4)}l${f1(-c * 3 - t * 1)} ${f1(-s * 3 - u * 1)}z`; }
        out.push(['@tyre.2', lug], ['@tyre.1', circ(cx, cy, R * .82)], ['@tyre.0', circ(cx, cy, R * .74)], [`@rim.${v}`, circ(cx, cy, rim)], ['#000000', `M${f1(cx)} ${f1(cy - rim)}a${rim} ${rim} 0 0 1 0 ${2 * rim}z`, .2], ['@iron.0', circ(cx, cy, rim * .42)], ['@iron.1', circ(cx, cy, rim * .22)]);
        let bolts = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; bolts += circ(cx + Math.cos(a) * rim * .62, cy + Math.sin(a) * rim * .62, 1.3); } out.push(['@iron.2', bolts], ['@mud.0', `M${f1(cx - R * .9)} ${f1(cy + R * .3)}a${R} ${R} 0 0 0 ${f1(R * 1.8)} 0q${f1(-R * .9)} ${f1(R * .2)} ${f1(-R * 1.8)} 0z`, .35]);
        return out;
      };
      const RX = -44, RR = old ? 34 : 40, FX = 62, FR = old ? 18 : 24;
      // chassis, engine block and bonnet
      body.push(['@iron.0', rect(RX, -46, FX - RX + 10, 16)], [P(0), `M${RX + 26} -${old ? 56 : 62}H${FX + 22}Q${FX + 30} -${old ? 56 : 62} ${FX + 30} -${old ? 48 : 54}V-34H${RX + 26}z`], [P(2), `M${RX + 26} -${old ? 56 : 62}H${FX + 22}Q${FX + 28} -${old ? 56 : 62} ${FX + 29} -${old ? 52 : 58}H${RX + 26}z`, .7], [P(1), `M${RX + 26} -40H${FX + 30}V-34H${RX + 26}z`, .7]);
      body.push({ s: P(1), w: 1, op: .7, d: `M${FX - 18} -${old ? 54 : 60}V-36M${FX - 10} -${old ? 54 : 60}V-36` }, ['@iron.2', `M${FX + 24} -${old ? 52 : 58}h6v18h-6z`], { s: '@iron.1', w: 1, d: `M${FX + 25} -${old ? 50 : 56}v14M${FX + 27.5} -${old ? 50 : 56}v14` });
      body.push(['@iron.1', rect(RX + 30, -34, 30, 10)], ['@iron.2', rect(FX + 26, -34, 10, 12)]);
      // the exhaust stack and air intake
      body.push(['@iron.2', rect(FX - 24, old ? -96 : -116, 4, old ? 40 : 54)], ['@iron.2', rect(FX - 25, old ? -98 : -118, 6, 3)], ['@iron.1', rect(FX - 36, old ? -66 : -72, 5, 10)]);
      // headlamps (in the grille surround, plus roof work lamps on the cab)
      body.push({ f: '@lamp', d: rect(FX + 22, -50, 8, 5), glow: 'lamp' }, { f: '@lamp', d: rect(FX + 22, -44, 8, 4), glow: 'lamp' });
      if (!old) {
        // the cab: four pillars, big glass, a roof with work lamps, steps, the seat and wheel seen through the glass
        const cx0 = RX - 30, cx1 = RX + 30, cy0 = -142, cy1 = -60;
        body.push(['@frame', rect(cx0, cy0, cx1 - cx0, cy1 - cy0)], { f: '@glass.0', d: rect(cx0 + 4, cy0 + 10, (cx1 - cx0) / 2 - 6, cy1 - cy0 - 14), glow: 'window' }, { f: '@glass.0', d: rect(cx0 + (cx1 - cx0) / 2 + 2, cy0 + 10, (cx1 - cx0) / 2 - 6, cy1 - cy0 - 14), glow: 'window' });
        body.push(['@glass.1', `M${cx0 + 4} ${cy0 + 10}h14l-14 26z`, .35], ['@glass.1', `M${cx1 - 20} ${cy0 + 10}h10l-10 18z`, .3], ['@seat', `M${RX - 18} -66v-26q0 -6 6 -6h4v32z`], { s: '@seat', w: 2.4, d: `M${RX + 4} -96l10 -4M${RX + 6} -98v-8`, op: .9 });
        body.push([P(0), `M${cx0 - 4} ${cy0}h${cx1 - cx0 + 8}v-6q0 -4 -4 -4h${-(cx1 - cx0)}q-4 0 -4 4z`], [P(2), rect(cx0 - 4, cy0 - 10, cx1 - cx0 + 8, 3), .6], { f: '@lamp', d: rect(cx0 + 2, cy0 - 14, 7, 4), glow: 'lamp' }, { f: '@lamp', d: rect(cx1 - 9, cy0 - 14, 7, 4), glow: 'lamp' }, ['@iron.2', rect(cx1 - 1, cy0 + 16, 6, 3)]);
        body.push({ s: '@iron.1', w: 2, d: `M${cx1 - 6} -40h12M${cx1 - 6} -48h12` });
      } else {
        // an open seat and steering wheel, small round wings, rear lamps
        body.push(['@seat', `M${RX - 6} -78q-2 -10 10 -10q6 0 6 6v8z`], { s: '@iron.2', w: 2.2, d: `M${RX + 10} -76L${RX + 34} -96` }, { s: '@frame', w: 2.6, d: `M${RX + 28} -98l12 4` }, { f: '@tail', d: rect(RX - 30, -64, 5, 5), glow: 'lamp' }, { f: '@tail', d: rect(RX - 30, -56, 5, 4), glow: 'lamp' });
      }
      // the rear wheel and its mudguard, the front wheel, the three-point linkage behind
      body.push({ s: '@iron.2', w: 2.6, d: `M${RX - 34} -30l-14 6M${RX - 34} -44l-14 -4` });
      body.push(...wheel(RX, -RR, RR, RR * .52));
      body.push([P(0), `M${RX - RR - 6} ${-RR}Q${RX - RR - 6} ${-RR * 2 - 8} ${RX} ${-RR * 2 - 8}Q${RX + RR + 6} ${-RR * 2 - 8} ${RX + RR + 6} ${-RR}H${RX + RR - 2}Q${RX + RR - 2} ${-RR * 2} ${RX} ${-RR * 2}Q${RX - RR + 2} ${-RR * 2} ${RX - RR + 2} ${-RR}z`], [P(2), `M${RX - RR} ${-RR - 14}Q${RX - RR} ${-RR * 2 - 6} ${RX} ${-RR * 2 - 6}v2Q${RX - RR + 4} ${-RR * 2 - 4} ${RX - RR + 3} ${-RR - 12}z`, .6]);
      if (!old) body.push({ f: '@tail', d: rect(RX - RR - 6, -RR - 6, 4, 6), glow: 'lamp' }, { f: '@tail', d: rect(RX + RR + 2, -RR - 6, 4, 6), glow: 'lamp' });
      body.push(...wheel(FX, -FR, FR, FR * .5));
      body.push([P(0), `M${FX - FR - 2} ${-FR + 2}Q${FX - FR} ${-FR * 2 - 6} ${FX} ${-FR * 2 - 6}Q${FX + FR} ${-FR * 2 - 6} ${FX + FR + 2} ${-FR + 2}h-3Q${FX + FR - 2} ${-FR * 2 - 3} ${FX} ${-FR * 2 - 3}Q${FX - FR + 2} ${-FR * 2 - 3} ${FX - FR + 1} ${-FR + 2}z`]);
      // mud on the lower body
      body.push(['@mud.1', `M${RX + 26} -34q20 4 40 0q20 3 ${FX - RX - 30} -2v4H${RX + 26}z`, .45]);
      return { body };
    },
  });
})();
