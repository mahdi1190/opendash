/* ============================================================
   SCENE LIBRARY: boats (canal views in perspective) (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: sceneObjDefine calls only, built lazily per (variant, season).

   boat.narrowboat-receding: a moored (or slowly passing) narrowboat seen from
   behind its stern, RECEDING down the cut toward the vanishing point, for the
   one-point-perspective canal views (the Basingstoke Canal at Fleet). The flat
   side-on boat.narrowboat cannot stand in a view that looks along the water.
   The boat is built in true perspective from world metres: hull, counter
   stern, rear deck and tiller, the cabin with its rear doors, painted panel,
   coachlines and brass portholes (glow: they light at real dusk), the roof
   with a plank, pots and the chimney, the cratch at the bow, stove smoke.

   Geometry. The ANCHOR (0, 0) is the stern's near corner at the waterline.
   The boat stands to the LEFT of the eye and recedes up and to the right;
   flip it for a boat to the right of the eye (the far bank from the towpath).
   variant = geometry * 3 + livery:
     geometry 0  from a bridge parapet, close below          (eye 5.85 m above the water, 3.95 m to the side, stern 13 m away)
     geometry 1  from a bridge parapet, farther down the reach (5.85 m up, 3.8 m aside, 48 m away)
     geometry 2  from the towpath, a boat close alongside     (2.05 m up, 2.5 m aside, 8.5 m away)
     geometry 3  from the towpath, across the cut             (2.05 m up, 11.9 m aside, 14 m away)
     geometry 4  from the towpath, across the cut, farther    (2.05 m up, 11.9 m aside, 45 m away)
     livery 0 green and gold, 1 maroon and cream, 2 navy and gold.
   Scale: at s = 1 the stern is at its geometry's distance for a lens of about
   920 px; place it at another distance z with s = (F / z) / U (U below).
   Seasons: frost on the roof in winter, leaves on it in autumn, pots in
   flower in spring and summer, stove smoke except on summer days.
   No names or lettering on the boats. Tile sizes (LOD < .5) skip the `detail` shapes: brass rings, door and
   panel lines, rope, roof leaves.
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const f1 = v => Math.round(v * 10) / 10;
  // [a: the visible side's distance to the side of the eye (m), b: the eye above the water (m), z0: the stern's distance (m), U: units a metre at the stern]
  const GEO = [[3.95, 5.85, 13, 70], [3.8, 5.85, 48, 19], [2.5, 2.05, 8.5, 104], [11.9, 2.05, 14, 64], [11.9, 2.05, 45, 20]];
  const LEN = [19, 18, 19, 19, 18];
  sceneObjDefine({
    id: 'boat.narrowboat-receding', category: 'boat', size: [560, 300], variants: 15,
    seasonal: true, shapeBySeason: true, flippable: true,
    palette: {
      base: {
        cabin: ['#2f5a46', '#6a2a2e', '#22304a'], cabinD: ['#22443a', '#4e1e22', '#182438'], cabinL: ['#4a7a62', '#8a4248', '#3a4a6a'],
        trim: ['#e9c86a', '#efe2c4', '#e9c86a'], panel: ['#b0402a', '#2f5a46', '#b0402a'], hull: ['#1c2224', '#5a2a22', '#2a3436'],
        port: ['#c8dadc', '#6a8088'], roof: ['#4a3e34', '#3a3028', '#6a5a48'], deck: ['#5a4a3a', '#3a3028'], cratch: ['#2a3a2a', '#3a2a20', '#22304a'],
        stove: '#26262a', rope: '#d8cdb8', smoke: '#e8e8ec', lamp: '#ffcf80',
      },
      spring: { pot: ['#3f7a34', '#f0c0d0', '#f4e070'], roofTop: ['#4a3e34', '#5a4a3a'] },
      summer: { pot: ['#3a7030', '#e05a6a', '#f0c040'], roofTop: ['#4a3e34', '#5a4a3a'] },
      autumn: { pot: ['#6a5a2a', '#c0702a', '#e0a040'], roofTop: ['#7a4e2a', '#d08a3a'] },
      winter: { pot: ['#4a4a3a', '#5a5048', '#6a6058'], roofTop: ['#d8dee4', '#eef2f4'] },
    },
    night: { glow: { window: '#ffd68a' }, on: 0.85 },
    parts: ['body', 'smoke', 'lit'],
    anim: { bob: { part: '*', dy: 0.8, period: 5 }, flicker: { part: 'smoke', op: [0.35, 0.85], period: 6 } },
    reflect: true,
    tags: ['uk', 'canal', 'narrowboat', 'boat', 'perspective', 'signature', 'kit:water', 'kit:boats', 'kit:temperate', 'role:boat'],
    credit: 'after the perspective narrowboats of the Basingstoke Canal views (72-anim-pack-uk-south-east-basingstoke-canal-fleet-v1..v4.js)',
    build(v, rnd, ctx) {
      const g = Math.floor(v / 3) % GEO.length, l = v % 3, season = ctx.season;
      const [a, b, z0, U] = GEO[g], L = LEN[g];
      const P = (dx, dy, dz) => { const k = z0 / (z0 + dz); return [f1(U * ((dx - a) * k + a)), f1(U * ((b - dy) * k - b))]; };
      const Q = pts => 'M' + pts.map(p => P(p[0], p[1], p[2]).join(' ')).join('L') + 'z';
      const line = pts => 'M' + pts.map(p => P(p[0], p[1], p[2]).join(' ')).join('L');
      const ell = (c, rx, ry) => `M${f1(c[0] - rx)} ${c[1]}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0z`;
      const kAt = dz => z0 / (z0 + dz), w = sw => Math.max(0.6, f1(sw * U / 70));
      const B = -2.1, X0 = -0.15, X1 = -1.95, GW = 0.75, RF = 2.0, C0 = 1.2, C1 = L - 2.8;
      const body = [], smoke = [], lit = [];
      // the hull: the near side to the bow sweep, the bow, the counter stern facing us, the gunwale band and rubbing strake
      body.push(['@hull.0', Q([[0, -0.08, 0], [0, GW, 0], [0, GW, L - 2.4], [B / 2, GW + 0.25, L], [B / 2, -0.08, L - 0.6], [0, -0.08, L - 2.4]])]);
      body.push(['@hull.1', Q([[0, GW - 0.16, 0.05], [0, GW, 0.05], [0, GW, L - 2.4], [B / 2, GW + 0.25, L], [B / 2, GW + 0.1, L - 0.1], [0, GW - 0.16, L - 2.4]])]);
      body.push({ s: '#5a6a6e', w: w(1.4), op: 0.55, detail: true, d: line([[0, 0.32, 0.2], [0, 0.32, L - 2.6]]) });
      body.push(['@hull.2', Q([[B, -0.08, 0], [B, GW, 0], [0, GW, 0], [0, -0.08, 0]])], ['@hull.1', Q([[B, GW - 0.14, 0], [B, GW, 0], [0, GW, 0], [0, GW - 0.14, 0]])]);
      // the rear deck and its tiller
      body.push(['@deck.0', Q([[B, GW, 0], [B, GW, C0], [0, GW, C0], [0, GW, 0]])]);
      body.push({ s: '@trim.' + l, w: w(3), cap: 'round', d: line([[B / 2, GW, 0.25], [B / 2, GW + 0.75, 0.15], [B / 2 + 0.3, GW + 1.05, -0.35]]) });
      // the cabin: rear doors, the side with its shaded base, panel and coachlines, the roof
      body.push(['@cabinD.' + l, Q([[X1, GW, C0], [X1, RF, C0], [X0, RF, C0], [X0, GW, C0]])]);
      for (const [d0, d1] of [[X1 + 0.12, -1.07], [-1.03, X0 - 0.12]]) {
        body.push(['@cabin.' + l, Q([[d0, GW + 0.1, C0], [d0, RF - 0.12, C0], [d1, RF - 0.12, C0], [d1, GW + 0.1, C0]])]);
        body.push({ s: '@trim.' + l, w: w(2), detail: true, d: Q([[d0 + 0.1, GW + 0.2, C0], [d0 + 0.1, RF - 0.22, C0], [d1 - 0.1, RF - 0.22, C0], [d1 - 0.1, GW + 0.2, C0]]) });
      }
      body.push({ f: '@port.1', glow: 'window', d: Q([[-0.9, RF - 0.45, C0], [-0.9, RF - 0.2, C0], [-1.2, RF - 0.2, C0], [-1.2, RF - 0.45, C0]]) });
      body.push(['@cabin.' + l, Q([[X0, GW, C0], [X0, RF, C0], [X0, RF, C1], [X0, GW, C1]])]);
      body.push(['@cabinD.' + l, Q([[X0, GW, C0], [X0, GW + 0.24, C0], [X0, GW + 0.24, C1], [X0, GW, C1]])]);
      body.push(['@cabinL.' + l, Q([[X0, RF - 0.08, C0], [X0, RF, C0], [X0, RF, C1], [X0, RF - 0.08, C1]])]);
      body.push(['@panel.' + l, Q([[X0, GW + 0.34, C0 + 0.35], [X0, RF - 0.3, C0 + 0.35], [X0, RF - 0.3, C0 + 2.4], [X0, GW + 0.34, C0 + 2.4]])]);
      body.push({ s: '@trim.' + l, w: w(2.4), detail: true, d: Q([[X0, GW + 0.4, C0 + 0.5], [X0, RF - 0.36, C0 + 0.5], [X0, RF - 0.36, C0 + 2.25], [X0, GW + 0.4, C0 + 2.25]]) });
      body.push({ s: '@trim.' + l, w: w(2.2), d: line([[X0, RF - 0.18, C0 + 0.2], [X0, RF - 0.18, C1 - 0.2]]) + line([[X0, GW + 0.32, C0 + 0.2], [X0, GW + 0.32, C1 - 0.2]]) });
      // portholes along the cabin: brass rings, glass that lights at dusk, a glint
      for (let zz = C0 + 3.1, i = 0; zz < C1 - 0.6; zz += 1.15, i++) {
        const k = kAt(zz), c = P(X0, 1.38, zz), ry = 0.17 * U * k;
        if (ry < 0.9) continue;
        const e = P(X0, 1.38, zz + 0.17), s0 = P(X0, 1.38, zz - 0.17), rx = Math.abs(e[0] - s0[0]) / 2 + 0.25 * ry;
        body.push({ f: '@trim.' + l, d: ell(c, rx * 1.3, ry * 1.3), detail: true }, { f: '@port.0', glow: 'window', d: ell(c, rx, ry) });
        if (i % 2 === 0) lit.push({ f: '@lamp', op: 0.28, d: Q([[0.15, 0.02, zz - 0.25], [1.4, 0.02, zz - 0.5], [1.4, 0.02, zz + 0.5], [0.15, 0.02, zz + 0.25]]) });
      }
      // the roof (seen from above on the bridge views): frost, leaves or plain; a plank, pots, the chimney with brass bands
      body.push(['@roofTop.0', Q([[X1, RF, C0], [X1, RF, C1], [X0, RF, C1], [X0, RF, C0]])]);
      if (b > RF + 0.3) {
        body.push({ detail: true, f: '@roof.1', d: Q([[-1.45, RF + 0.05, C0 + 3], [-1.45, RF + 0.05, C1 - 4.5], [-1.15, RF + 0.05, C1 - 4.5], [-1.15, RF + 0.05, C0 + 3]]) });
        if (season === 'autumn' || season === 'winter') for (let i = 0; i < 14; i++) { const zz = C0 + rnd() * (C1 - C0), x = X1 + rnd() * (X0 - X1), c = P(x, RF + 0.01, zz), k = kAt(zz); body.push({ f: '@roofTop.1', d: ell(c, 0.16 * U * k, 0.07 * U * k), detail: true }); }
      }
      for (const [x, zz, h] of [[-0.5, C0 + 0.7, 0.32], [-1.4, C0 + 0.8, 0.26], [-0.6, C0 + 6, 0.24]]) {
        const p0 = P(x - 0.16, RF, zz), p1 = P(x + 0.16, RF, zz), top = P(x, RF + h, zz), k = kAt(zz);
        body.push(['@roof.2', `M${p0[0]} ${p0[1]}L${p1[0]} ${p1[1]}L${f1(p1[0] - 0.02 * U * k)} ${top[1]}L${f1(p0[0] + 0.02 * U * k)} ${top[1]}z`]);
        body.push({ detail: true, f: '@pot.0', d: ell([top[0], f1(top[1] - 0.06 * U * k)], 0.2 * U * k, 0.12 * U * k) }, { detail: true, f: '@pot.' + (1 + (zz | 0) % 2), d: ell([f1(top[0] - 0.05 * U * k), f1(top[1] - 0.12 * U * k)], 0.07 * U * k, 0.06 * U * k) });
      }
      const cz = C1 - 1.6, ck = kAt(cz), cb = P(-0.7, RF, cz), ctop = P(-0.7, RF + 0.62, cz), cw = 0.11 * U * ck;
      body.push(['@stove', `M${f1(cb[0] - cw)} ${cb[1]}V${ctop[1]}h${f1(2 * cw)}V${cb[1]}z`]);
      body.push({ s: '@trim.' + l, w: w(1.6), detail: true, d: `M${f1(cb[0] - cw)} ${f1(ctop[1] + 0.1 * U * ck)}h${f1(2 * cw)}M${f1(cb[0] - cw)} ${f1(ctop[1] + 0.25 * U * ck)}h${f1(2 * cw)}` });
      // the cratch board and cover over the bow well, a coil of rope at the stern
      body.push(['@cratch.' + l, Q([[X0, GW + 0.15, C1], [-1.05, RF - 0.2, C1 + 0.15], [-1.05, GW + 0.2, L - 0.5]])]);
      body.push(['@cratch.' + l, Q([[X0, GW + 0.15, C1], [X1, GW + 0.15, C1], [-1.05, RF - 0.2, C1 + 0.15]])]);
      body.push({ s: '@rope', w: w(2.6), detail: true, d: line([[-0.25, GW, 0.4], [-0.45, GW + 0.06, 0.65], [-0.25, GW + 0.03, 0.9], [-0.1, GW, 0.6]]) });
      // stove smoke from the chimney (not on summer days): soft puffs drifting up and away
      if (season !== 'summer') {
        const k = ck, r = (n) => (0.25 + n * 0.16) * U * k;
        for (let i = 0; i < 4; i++) smoke.push({ f: '@smoke', op: 0.42 - i * 0.08, d: ell([f1(ctop[0] - i * 0.35 * U * k), f1(ctop[1] - (0.3 + i * 0.5) * U * k)], r(i), r(i) * 0.7) });
      }
      return { body, smoke, lit };
    },
  });
})();
