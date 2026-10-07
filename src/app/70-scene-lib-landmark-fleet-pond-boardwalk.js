/* ============================================================
   SCENE LIBRARY: landmark-fleet-pond-boardwalk (docs/dev/SCENE_ENGINE.md, section 2).
   PURE: one sceneObjDefine call inside this IIFE and nothing else; every
   build runs lazily, once per (variant, season), memoised by the core.
   Check with: node tools/anim-pack.mjs object lint landmark.fleet-pond-boardwalk
   LOOK with:  node tools/anim-pack.mjs object sheet landmark.fleet-pond-boardwalk --mode night

   Fleet Pond's boardwalks and viewing platforms (Hart District Council's
   Local Nature Reserve; the Fleet Pond Society keeps them up): raised timber
   walkways on posts across the Phragmites reedbed, with handrails, leading
   to railed platforms over the open water, a bench facing the view and an
   interpretation board. There is no lighting on them: the night look (the
   `lit` part) is only the moon- and sky-light caught on the wet handrails and
   deck edges, so the structure still reads after dusk.

   One variant per composed view of the place, each drawn in that view's
   perspective (the views: 71-scene-uk-south-east-fleet-pond-v1..v4.js):
     v0  view 1: from the walkway's end, the deck receding to a railed platform (anchor: the near deck edge, centre)
     v1  view 2: the raised walkway through the reeds, running up-left from the viewer (anchor: its near end)
     v2  view 3: the walkway across the east reedbed out to its platform, seen from the side (anchor: its near end)
     v3  view 4: the platform along the right-hand shore, seen side-on, a bench and the board (anchor: its middle)
   Seasons: weathered oak by summer, darker and wet with fallen leaves in
   autumn, frost on the planks and rails in winter. Light from the upper left
   (tops lit, the right-hand faces of posts shaded).
   ============================================================ */
(function () {
  if (typeof sceneObjDefine !== 'function') return;   // the engine core (70-scene-0core.js) is not in this build
  const R = v => Math.round(v * 10) / 10;
  const quad = (a, b, c, d) => `M${R(a[0])} ${R(a[1])}L${R(b[0])} ${R(b[1])}L${R(c[0])} ${R(c[1])}L${R(d[0])} ${R(d[1])}Z`;
  const rect = (x, y, w, h) => quad([x, y], [x + w, y], [x + w, y + h], [x, y + h]);
  const line = (pts) => 'M' + pts.map(p => R(p[0]) + ' ' + R(p[1])).join('L');
  const lerp = (a, b, t) => a + (b - a) * t;

  /** A walkway along a centre line [[x, y, halfWidth], ...] (near to far): deck, planks, posts, two handrails, its shadow on the reeds. */
  function walkway(out, pts, o) {
    const steps = o.planks || 34, L = [], Rr = [];
    const at = (t) => { const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f)), u = f - i, a = pts[i], b = pts[i + 1]; return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]; };
    for (let i = 0; i <= steps; i++) { const [x, y, w] = at(i / steps); L.push([x - w, y]); Rr.push([x + w, y]); }
    const deck = line(L.concat(Rr.slice().reverse())) + 'Z';
    // the shadow it throws on the reeds and water below, and the side of the deck
    out.body.push({ f: '#10201a', d: line(L.map(p => [p[0] + 6, p[1] + 14]).concat(Rr.slice().reverse().map(p => [p[0] + 18, p[1] + 16]))) + 'Z', op: 0.28 });
    out.body.push({ f: '@wood.0', d: line(L.map(p => [p[0], p[1] + 9]).concat(Rr.slice().reverse().map(p => [p[0], p[1] + 9]))) + 'Z' });
    out.body.push({ f: { lin: [[0, '@wood.1'], [1, '@wood.2']], x1: 0, y1: Math.min(...L.map(p => p[1])), x2: 0, y2: Math.max(...L.map(p => p[1])) }, d: deck });
    // the planks: one shape each, alternating weathering, the gaps dark
    for (let i = 1; i < steps; i += 1) {
      const a = L[i], b = Rr[i], c = Rr[i + 1] || Rr[i], d = L[i + 1] || L[i], th = Math.max(0.8, (b[0] - a[0]) * 0.012);
      out.body.push({ f: i % 2 ? '@wood.3' : '@wood.0', d: quad([a[0], a[1] - th / 2], [b[0], b[1] - th / 2], [b[0], b[1] + th / 2], [a[0], a[1] + th / 2]), op: i % 2 ? 0.55 : 0.4, detail: i % 2 === 0 });
      if (o.season === 'autumn' && i % 4 === 1) out.body.push({ f: '@leaf.' + (i % 3), d: sceneD.ell(lerp(a[0], b[0], 0.2 + 0.6 * ((i * 37) % 10) / 10), lerp(a[1], c[1], 0.5), Math.max(1.5, (b[0] - a[0]) * 0.03), Math.max(1, (b[0] - a[0]) * 0.015)), detail: true });
      if (o.season === 'winter' && i % 2 === 0) out.body.push({ f: '#eef3f6', d: quad([a[0], a[1] - th], [b[0], b[1] - th], [c[0], c[1] - th], [d[0], d[1] - th]), op: 0.32, detail: true });
    }
    // posts and handrails on both sides, shorter with distance
    for (const [side, sgn] of [[L, -1], [Rr, 1]]) {
      const top = [];
      side.forEach((p, i) => {
        const w = at(i / steps)[2], ph = Math.max(6, w * (o.rail || 0.55)), pw = Math.max(1.2, w * 0.05);
        top.push([p[0], p[1] - ph]);
        if (i % (o.postEvery || 4) === 0) {
          out.body.push({ f: '@post.0', d: rect(p[0] - pw / 2, p[1] - ph, pw, ph + 6 + w * 0.06) });
          out.body.push({ f: '@post.1', d: rect(p[0] + pw * 0.1, p[1] - ph, pw * 0.4, ph + 6 + w * 0.06), op: 0.8, detail: true });
        }
      });
      out.body.push({ s: '@rail.0', w: o.railW || 3, cap: 'round', d: line(top) });
      out.body.push({ s: '@post.0', w: (o.railW || 3) * 0.8, cap: 'round', d: line(top.map((p, i) => [p[0], lerp(p[1], side[i][1], 0.5)])) });
      out.body.push({ s: '@rail.1', w: (o.railW || 3) * 0.4, cap: 'round', d: line(top.map(p => [p[0], p[1] - (o.railW || 3) * 0.35])), op: 0.6, detail: true });
      if (o.season === 'winter') out.body.push({ s: '#f4f8fa', w: (o.railW || 3) * 0.5, cap: 'round', d: line(top.map(p => [p[0], p[1] - (o.railW || 3) * 0.5])), op: 0.7 });
      out.lit.push({ s: '#c8d8ec', w: (o.railW || 3) * 0.45, cap: 'round', d: line(top.map(p => [p[0], p[1] - (o.railW || 3) * 0.4])), op: 0.42 });
      out.lit.push({ s: '#a8bcd4', w: 1.2, cap: 'round', d: line(side), op: 0.3 });
    }
  }

  /** A railed platform: deck quad (near-left, near-right, far-right, far-left), legs into the water, rails on the given sides. */
  function platform(out, q, o) {
    const [nl, nr, fr, fl] = q, depth = o.depth || 8, rh = o.railH || 28;
    // its shadow on the water and the legs' reflections
    out.body.push({ f: '#0c2230', d: quad([nl[0], nl[1] + depth], [nr[0], nr[1] + depth], [nr[0] + 10, nr[1] + depth + 14], [nl[0] + 10, nl[1] + depth + 14]), op: 0.3 });
    for (let i = 0; i <= 5; i++) {
      const x = lerp(nl[0], nr[0], i / 5), y = lerp(nl[1], nr[1], i / 5) + depth;
      out.body.push({ f: '@post.0', d: rect(x - 2, y - 2, 4, o.legs || 22) });
      out.body.push({ f: '#1c3644', d: rect(x - 1.5, y + (o.legs || 22) + 2, 3, (o.legs || 22) * 0.8), op: 0.25, detail: true });
    }
    out.body.push({ f: '@wood.0', d: quad(nl, nr, [nr[0], nr[1] + depth], [nl[0], nl[1] + depth]) });
    out.body.push({ f: { lin: [[0, '@wood.2'], [1, '@wood.1']], x1: 0, y1: fl[1], x2: 0, y2: nl[1] }, d: quad(nl, nr, fr, fl) });
    for (let i = 1; i < 8; i++) {
      const t = i / 8, a = [lerp(fl[0], nl[0], t), lerp(fl[1], nl[1], t)], b = [lerp(fr[0], nr[0], t), lerp(fr[1], nr[1], t)];
      out.body.push({ s: i % 2 ? '@wood.3' : '@wood.0', w: 0.9, d: line([a, b]), op: 0.5, detail: true });
      if (o.season === 'winter' && i % 2) out.body.push({ s: '#eef3f6', w: 1.4, d: line([[a[0], a[1] - 1], [b[0], b[1] - 1]]), op: 0.35 });
      if (o.season === 'autumn' && i % 3 === 1) out.body.push({ f: '@leaf.' + (i % 3), d: sceneD.ell(lerp(a[0], b[0], 0.3 + 0.1 * i), a[1], 2.4, 1.2) });
    }
    // the rails: posts on each railed edge, a top rail and a mid rail
    for (const [a, b] of (o.sides || [[nl, fl], [fl, fr], [fr, nr]])) {
      const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / (o.postGap || 34)));
      for (let i = 0; i <= n; i++) { const x = lerp(a[0], b[0], i / n), y = lerp(a[1], b[1], i / n); out.body.push({ f: '@post.0', d: rect(x - 1.6, y - rh, 3.2, rh) }); out.body.push({ f: '@post.1', d: rect(x + 0.4, y - rh, 1.2, rh), op: 0.8, detail: true }); }
      out.body.push({ s: '@rail.0', w: 3, cap: 'round', d: line([[a[0], a[1] - rh], [b[0], b[1] - rh]]) });
      out.body.push({ s: '@post.0', w: 2.2, cap: 'round', d: line([[a[0], a[1] - rh * 0.5], [b[0], b[1] - rh * 0.5]]) });
      out.body.push({ s: '@rail.1', w: 1.2, cap: 'round', d: line([[a[0], a[1] - rh - 1], [b[0], b[1] - rh - 1]]), op: 0.6 });
      if (o.season === 'winter') out.body.push({ s: '#f4f8fa', w: 1.6, cap: 'round', d: line([[a[0], a[1] - rh - 1.5], [b[0], b[1] - rh - 1.5]]), op: 0.7 });
      out.lit.push({ s: '#c8d8ec', w: 1.4, cap: 'round', d: line([[a[0], a[1] - rh - 1], [b[0], b[1] - rh - 1]]), op: 0.45 });
    }
    out.lit.push({ s: '#a8bcd4', w: 1.2, cap: 'round', d: line([nl, nr]), op: 0.35 });
  }
  /** A bench (seat, back, legs) and an interpretation board on two legs. */
  function bench(out, x, y, w) {
    out.body.push({ f: '@wood.0', d: rect(x, y - w * 0.18, w, w * 0.07) });
    out.body.push({ f: '@wood.3', d: rect(x, y - w * 0.32, w, w * 0.06) });
    out.body.push({ f: '@post.0', d: rect(x + w * 0.06, y - w * 0.32, w * 0.05, w * 0.32) });
    out.body.push({ f: '@post.0', d: rect(x + w * 0.89, y - w * 0.32, w * 0.05, w * 0.32) });
  }
  function board(out, x, y, h) {
    out.body.push({ f: '@post.0', d: rect(x + h * 0.08, y - h * 0.62, h * 0.07, h * 0.62) });
    out.body.push({ f: '@post.0', d: rect(x + h * 0.6, y - h * 0.62, h * 0.07, h * 0.62) });
    out.body.push({ f: '@board.0', d: rect(x, y - h, h * 0.75, h * 0.48) });
    out.body.push({ f: '@board.1', d: rect(x + h * 0.05, y - h * 0.95, h * 0.65, h * 0.2) });   // a picture panel of the pond's birds: blocks of colour only, no text
    out.body.push({ f: '@board.2', d: rect(x + h * 0.05, y - h * 0.72, h * 0.3, h * 0.15) });
    out.body.push({ f: '@wood.0', d: rect(x - h * 0.03, y - h * 1.04, h * 0.81, h * 0.06) });
  }

  sceneObjDefine({
    id: 'landmark.fleet-pond-boardwalk',
    category: 'landmark',
    size: [640, 300],
    variants: 4,
    seasonal: true,
    shapeBySeason: true,
    flippable: false,
    palette: {
      base:   { wood: ['#5e4a36', '#8f7656', '#b49c74', '#6e5a44'], post: ['#4a3a2a', '#2e241a'], rail: ['#a88e6a', '#d8c4a0'], board: ['#35503e', '#7a9a8a', '#c8a85a'], leaf: ['#c0702a', '#e0a040', '#8a4a1e'] },
      spring: { wood: ['#5e4a36', '#937a58', '#b8a078', '#6e5a44'] },
      summer: { wood: ['#5e4a36', '#8f7656', '#b49c74', '#6e5a44'] },
      autumn: { wood: ['#4e3c2a', '#7a6248', '#9c8462', '#5a4836'], rail: ['#94785a', '#c4ac88'] },
      winter: { wood: ['#5a5246', '#8a8272', '#b4ad9c', '#6e665a'], post: ['#4a443a', '#2e2a24'], rail: ['#a8a090', '#e0dccf'] },
    },
    parts: ['body', 'lit'],
    reflect: false,
    tags: ['landmark', 'place:uk/fleet-pond', 'uk-south-east', 'uk', 'boardwalk', 'nature-reserve', 'reedbed'],
    credit: 'after the Fleet Pond boardwalks in 72-anim-pack-uk-south-east-fleet-pond-v1..v4.js',
    build(v, rnd, ctx) {
      const season = (ctx && ctx.season) || 'summer', out = { body: [], lit: [] };
      if (v === 0) {
        // view 1: the deck from the viewer's feet (y 0, 480 wide) to the platform's front edge (y -224), the platform beyond
        platform(out, [[-156, -224], [126, -224], [104, -256], [-132, -256]], { season, depth: 8, railH: 28, legs: 18, postGap: 30, sides: [[[-156, -224], [-132, -256]], [[-132, -256], [104, -256]], [[104, -256], [126, -224]]] });
        bench(out, -60, -248, 80);
        board(out, 52, -256, 38);
        walkway(out, [[0, 0, 240], [0, -224, 70]], { season, planks: 26, rail: 0.36, postEvery: 4, railW: 3.4 });
      } else if (v === 1) {
        // view 2: the raised walkway through the reedbed, from below the frame up-left to the reeds
        walkway(out, [[60, 60, 160], [0, 0, 132], [-110, -70, 92], [-240, -140, 60], [-360, -210, 34], [-430, -250, 20]], { season, planks: 46, rail: 0.55, postEvery: 5, railW: 4 });
      } else if (v === 2) {
        // view 3: the walkway across the east reedbed out to the viewing platform on the water
        platform(out, [[-340, -204], [-220, -204], [-226, -214], [-334, -214]], { season, depth: 8, railH: 24, legs: 26, postGap: 15 });
        walkway(out, [[160, 30, 95], [60, -80, 65], [-60, -152, 45], [-160, -192, 33], [-220, -204, 29]], { season, planks: 40, rail: 0.5, postEvery: 3, railW: 2.6 });
      } else {
        // view 4: the platform along the right-hand shore, side-on: deck, piles, rails, a bench and the board
        platform(out, [[-290, -94], [320, -24], [320, -84], [-310, -120]], { season, depth: 18, railH: 40, legs: 26, postGap: 52, sides: [[[-310, -120], [320, -84]]] });
        bench(out, 120, -96, 70);
        board(out, -88, -112, 48);
      }
      return out;
    },
  });
})();
