/* ============================================================
   SCENE LIBRARY: Manchester, Castlefield (docs/dev/SCENE_ENGINE_V2.md): the ground plans of the four Castlefield views
   (71-scene-uk-north-manchester-castlefield.js) and the objects they need, drawn FROM each view's camera, in true perspective
   (the method of the Fleet Pond and Basingstoke Canal views). PURE: data and sceneObjDefine calls at load.

   Castlefield is the Bridgewater Canal's terminus basin in the south-west corner of Manchester city centre: the wharves and
   arms of the 1760s canal, the brick warehouses of the canal age (Merchants' Warehouse, 1825; Middle Warehouse, 1831), the
   reconstructed north gate of the Roman fort of Mamucium, and the Victorian railway viaducts that stride across the basin on
   castellated piers: the 1877 Cheshire Lines viaduct (cream lattice girders, now the Metrolink's), the 1849 brick arcade of
   the line to Oxford Road (trains), the 1890s Great Central steel viaduct (today a planted sky park). Merchants' Bridge (1995)
   crosses the basin on a curved deck slung from one leaning white steel arch; Beetham Tower stands over it all on Deansgate.
     https://www.castlefield.org.uk   https://historicengland.org.uk (Castlefield conservation area, Roman fort)

   Objects (each variant one piece of one view, anchored on the ground or the water under it, so it mirrors about its own
   waterline and the depth sort puts the life in front of or behind it; every shape is clipped to the frame's margin):
     structure.mcf-railbridge     the BACK of a run of viaduct spans: the deck's underside, the far girder, the overhead masts
                                  and wire, the sky park's planting; the brick arcade whole (its barrels, face and arches)
     structure.mcf-railbridge-front  the FRONT of the same run, drawn one depth band nearer than the trams and trains that cross
                                  it: the near lattice girder; the arcade's parapet and coping. So a tram runs BETWEEN the
                                  girders and a train behind the parapet.
     structure.mcf-railbridge-pier   the castellated brick piers of the run with their sandstone dressings (front band too; a
                                  separate sprite so a long girder and a tall pier never make one huge sprite box)
     structure.mcf-merchants-bridge  the curved deck, the leaning arch, its hangers, balustrade and deck lights
     boat.mcf-narrowboat          narrowboats as true 3D boxes (hull, cabin, panels, roof rails, portholes lit at dusk, smoke)
     landmark.mcf-roman-gate      the reconstructed north gate of Mamucium: twin arches between flanking towers, a timber
                                  fighting gallery under a shingled roof, the stone curtain wall each side
     structure.mcf-shipping-hole  the arched canal openings in the Middle Warehouse's water face
     structure.mcf-frame          the framing foreground: Merchants' Bridge's balustrade and hangers; a quay railing
     street.mcf-litter-bin        the city centre's black steel litter bin (v1 with a bag of rubbish beside it)
   The viaduct pieces are named 'railbridge' on purpose: the motion engine treats a bridge as an overhead (people and boats
   pass under it), where a plain structure would be a solid block the size of its whole sprite box.
   Ground metres: x to the right of the view axis, d forward, h up from the camera's ground. Lit from the LEFT.
   No lettering, no logos, no brands.
   ============================================================ */
const SCENE_MCF = (function () {
  const D2R = Math.PI / 180;
  function cam(c) {
    const f = 800 / Math.tan(c.fov * D2R / 2), x0 = c.x0 || 800;
    return { f, x0, proj: (x, d, h) => [x0 + f * x / d, c.horizon + f * (c.eye - (h || 0)) / d] };
  }
  const inPoly = (P, x, d) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > d) !== (b[1] > d) && x < (b[0] - a[0]) * (d - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; };

  // ---- the four views ----
  const views = {
    // 1: on the setts of Slate Wharf at the west end of the basin, looking east down the water: the basin opening out, boats
    // moored along the north quay under its warehouses, Merchants' Bridge's white arch across the middle, the tram viaduct and
    // the brick arcade striding diagonally over the water, Beetham Tower standing over Deansgate beyond
    basin: {
      camera: { eye: 1.7, fov: 62, horizon: 520, heading: 96, lat: 53.47455, lon: -2.25790, water: -0.7 },
      water: [[-15, 8.6], [-4, 8.2], [12, 8.6], [21, 32], [25, 70], [24, 120], [19, 180], [12, 250], [8, 330], [5, 420], [-6, 420], [-11, 330], [-20, 250], [-27, 180], [-30, 120], [-29, 70], [-25, 32]],
    },
    // 2: on the towpath by Castlefield Junction looking west-south-west, under the viaducts: the canal running away to Pomona,
    // the tram viaduct overhead in front, the brick arcade behind it and the steel sky-park viaduct beyond, layer on layer
    viaducts: {
      camera: { eye: 1.65, fov: 68, horizon: 590, heading: 248, lat: 53.47380, lon: -2.25530, water: -0.6 },
      water: [[-5.5, 2], [6, 2], [6.2, 30], [5.6, 60], [3.5, 100], [-2, 150], [-12, 210], [-26, 280], [-44, 360], [-58, 360], [-40, 280], [-26, 210], [-16, 150], [-10, 100], [-7, 60], [-6, 30]],
    },
    // 3: from the crown of Merchants' Bridge looking north-east up the canal: the Middle Warehouse straight up from the water on
    // the left with its arched shipping holes, the wharf, the cafe tables and Merchants' Warehouse on the right, boats moored on
    // both sides, the tram viaduct across the end of the reach, Beetham Tower over the roofs
    warehouses: {
      camera: { eye: 6.2, fov: 64, horizon: 470, heading: 52, lat: 53.47425, lon: -2.25640, water: -0.5 },
      water: [[-9, 4], [9, 4], [9.5, 60], [9.5, 120], [10, 170], [12, 210], [20, 260], [12, 275], [-9, 260], [-9.5, 160], [-9.5, 80], [-9.6, 29.6], [-19.5, 29.6], [-19.5, 19.5], [-9.2, 19.5]],
    },
    // 4: on the grass of Castlefield Arena looking east-south-east to the reconstructed north gate of the Roman fort and its
    // wall, the tram viaduct striding past behind it with Liverpool Road's traffic under the girders, Beetham Tower beyond
    fort: {
      camera: { eye: 1.65, fov: 58, horizon: 610, heading: 112, lat: 53.47620, lon: -2.25760 },
      water: null,
    },
  };
  for (const k in views) Object.assign(views[k], cam(views[k].camera), { id: k });

  // ---- the pieces: one variant of an object each ----
  const via = [], boats = [], bridges = [], holes = [], frames = [], gates = [];
  /**
   * A viaduct from A to B (ground metres) in spans of `span` metres with a pier at each span's start (and the end); `group`
   * spans to a piece (Infinity: the whole run in one piece, anchored at opt.anchor). H: the rail height above the camera's
   * ground; w: the deck width; opt.layer: the band of the back piece (default: from its anchor's depth).
   */
  function viaduct(view, type, A, B, span, H, w, opt) {
    opt = opt || {};
    const V = views[view], W = V.camera.water == null ? 0 : V.camera.water;
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), t = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], n = [t[1], -t[0]];
    const base = (x, d) => (V.water && inPoly(V.water, x, d) ? W : 0);
    const spans = [];
    for (let s = 0; s < L - 1; s += span) spans.push([[A[0] + t[0] * s, A[1] + t[1] * s], [A[0] + t[0] * Math.min(L, s + span), A[1] + t[1] * Math.min(L, s + span)]]);
    const g = opt.group || 1;
    for (let i = 0; i < spans.length; i += g) {
      const run = spans.slice(i, i + g), an = opt.anchor || run[0][0];
      via.push({ view, type, spans: run.map(([a, b]) => ({ a, b, ba: base(a[0], a[1]), bb: base(b[0], b[1]) })), endPier: i + g >= spans.length, H, w, t, n,
        anchor: an, base: base(an[0], an[1]), i: via.length, masts: !!opt.masts, park: !!opt.park, layer: opt.layer || null });
    }
  }
  // view 1: the tram viaduct (cream lattice) and the brick arcade beyond it, both crossing the basin toward Deansgate
  viaduct('basin', 'lat', [43, 52], [-40, 332], 34, 10.5, 8.6, { masts: true, group: 2 });
  viaduct('basin', 'arc', [74, 60], [30, 220], 26, 9.2, 8, { group: 2 });
  // view 2: the tram viaduct overhead and the brick arcade behind it (left to right across the cut)
  viaduct('viaducts', 'lat', [-70, 24], [90, 44], 32, 10.5, 8.6, { masts: true, layer: 'mid' });
  viaduct('viaducts', 'arc', [-90, 58], [100, 76], 21, 9.2, 8, { group: Infinity, anchor: [-0.6, 66.5], layer: 'mid' });
  // view 3: the tram viaduct across the end of the reach
  viaduct('warehouses', 'lat', [-100, 196], [120, 236], 34, 10.5, 8.6, { masts: true, group: Infinity, anchor: [8, 213], layer: 'far' });
  // view 4: the tram viaduct striding past behind the fort (right to left, a little oblique)
  viaduct('fort', 'lat', [130, 84], [-150, 128], 33, 10.5, 8.6, { masts: true, group: Infinity, anchor: [0, 104.8], layer: 'mid' });

  // the narrowboats: [view, x, d (the middle at the waterline), heading in the ground plane (degrees: 0 = straight away,
  // 90 = to the right), length, livery, extras]
  const LIVS = 6;
  for (const [view, x, d, hd, len, liv, o] of [
    ['basin', -25.6, 36, 2, 18, 0, { smoke: true, roof: 'pots' }], ['basin', -27.6, 56, 4, 20, 2, { roof: 'logs' }], ['basin', -28.8, 80, 4, 16, 4, {}],
    ['basin', 15.6, 26, 172, 17, 1, { roof: 'bike', smoke: true }], ['basin', 19.4, 46, 176, 19, 3, { roof: 'pots' }], ['basin', 21.4, 68, 178, 17, 0, { roof: 'logs', smoke: true }], ['basin', 6, 112, 92, 21, 5, { trip: true }],
    ['viaducts', -4.3, 22, 1, 19, 3, { roof: 'logs' }], ['viaducts', -4.5, 42, 0, 17, 1, { roof: 'pots' }], ['viaducts', 4.4, 74, 182, 18, 0, {}],
    ['warehouses', -7.6, 34, 0, 20, 1, { roof: 'pots' }], ['warehouses', -7.8, 56, 0, 18, 3, {}], ['warehouses', 7.6, 27, 180, 19, 5, { roof: 'pots', smoke: true }],
    ['warehouses', 7.8, 48, 180, 16, 4, {}], ['warehouses', 7.9, 98, 180, 21, 5, { trip: true }], ['warehouses', -8, 118, 0, 18, 0, {}],
  ]) boats.push(Object.assign({ view, x, d, hd, len, liv: liv % LIVS, i: boats.length }, o));

  // Merchants' Bridge in view 1: the deck from the north quay to Catalan Square, curving toward the camera
  bridges.push({ view: 'basin', A: [-30.5, 68], B: [26, 86], bow: -6, deck: 0.9, rise: 2.6, arch: 13.5, lean: 4.5, w: 3.2 });

  // the shipping holes of the Middle Warehouse (view 3): on its water face (x = -9.6), [d of the middle, span]
  holes.push({ view: 'warehouses', plane: 'd', x: -14.6, d: 27.95, sp: 7.2, crown: 6.2 }, { view: 'warehouses', plane: 'x', x: -9.62, d: 66, sp: 6.4, crown: 5.4 });
  // the frames: the bridge's balustrade and hangers (view 3); the quay's railing (view 2)
  frames.push({ view: 'warehouses', kind: 'bridge' }, { view: 'warehouses', kind: 'hanger', side: -1 }, { view: 'warehouses', kind: 'hanger', side: 1 }, { view: 'viaducts', kind: 'railing' });
  gates.push({ view: 'fort', at: [8.4, 40], hd: -12 });
  return { views, via, boats, bridges, holes, frames, gates, inPoly, LIVS };
})();

/* ---------- the drawing helpers shared by the objects below ----------
   pen(V, o): a pen for view V with the sprite origin o (the anchor's screen point). P(x, d, h) -> the sprite point; path(pts)
   and poly3(pts3) -> closed path data CLIPPED to the frame's margin (so no sprite is bigger than the frame); line3(pts3) -> an
   open polyline, clipped; disc(x, y, r) -> a circle. prism() -> the visible faces of a prism; tone(n) -> 0 lit, 1 side, 2 shade. */
const SCENE_MCF_PEN = (function () {
  const R = (v) => Math.round(v * 10) / 10;
  const BOX = [-140, -140, 1740, 1040];
  /** Sutherland-Hodgman against the frame's margin (absolute screen points). */
  function clipPoly(pts) {
    let out = pts;
    const edges = [[0, BOX[0], 1], [0, BOX[2], -1], [1, BOX[1], 1], [1, BOX[3], -1]];
    for (const [k, v, s] of edges) {
      if (!out.length) break;
      const inp = out; out = [];
      const ins = (p) => (p[k] - v) * s >= 0;
      for (let i = 0; i < inp.length; i++) {
        const a = inp[i], b = inp[(i + 1) % inp.length], ia = ins(a), ib = ins(b);
        if (ia) out.push(a);
        if (ia !== ib) { const u = (v - a[k]) / (b[k] - a[k]); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
      }
    }
    return out;
  }
  /** Liang-Barsky for one segment; null when outside. */
  function clipSeg(a, b) {
    let t0 = 0, t1 = 1; const dx = b[0] - a[0], dy = b[1] - a[1];
    for (const [p, q] of [[-dx, a[0] - BOX[0]], [dx, BOX[2] - a[0]], [-dy, a[1] - BOX[1]], [dy, BOX[3] - a[1]]]) {
      if (p === 0) { if (q < 0) return null; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]];
  }
  function pen(V, o) {
    const c = V.camera;
    const A = (x, d, h) => V.proj(x, Math.max(0.35, d), h);
    const P = (x, d, h) => { const q = A(x, d, h); return [q[0] - o[0], q[1] - o[1]]; };
    const pt = (p) => R(p[0]) + ' ' + R(p[1]);
    /** pts in SPRITE coordinates -> clipped closed path data. */
    const path = (pts) => { const q = clipPoly(pts.map(p => [p[0] + o[0], p[1] + o[1]])); return q.length < 3 ? '' : 'M' + q.map(p => pt([p[0] - o[0], p[1] - o[1]])).join('L') + 'Z'; };
    const poly3 = (pts) => { const q = clipPoly(pts.map(p => A(p[0], p[1], p[2]))); return q.length < 3 ? '' : 'M' + q.map(p => pt([p[0] - o[0], p[1] - o[1]])).join('L') + 'Z'; };
    const line3 = (pts) => {
      let d = '', last = null;
      for (let i = 1; i < pts.length; i++) {
        const s = clipSeg(A(...pts[i - 1]), A(...pts[i]));
        if (!s) { last = null; continue; }
        const a = [s[0][0] - o[0], s[0][1] - o[1]], b = [s[1][0] - o[0], s[1][1] - o[1]];
        if (!last || Math.abs(last[0] - a[0]) > 0.05 || Math.abs(last[1] - a[1]) > 0.05) d += 'M' + pt(a);
        d += 'L' + pt(b); last = b;
      }
      return d;
    };
    const disc = (x, y, rx, ry) => { ry = ry == null ? rx : ry; if (x + o[0] < BOX[0] - rx || x + o[0] > BOX[2] + rx || y + o[1] < BOX[1] - ry || y + o[1] > BOX[3] + ry) return ''; return `M${R(x - rx)} ${R(y)}a${R(rx)} ${R(ry)} 0 1 0 ${R(2 * rx)} 0a${R(rx)} ${R(ry)} 0 1 0 ${R(-2 * rx)} 0z`; };
    /** px per metre at a ground point. */
    const k = (x, d) => V.f / Math.max(1, Math.hypot(x, d));
    return { P, pt, path, poly3, line3, disc, k, R, eye: c.eye };
  }
  /**
   * The faces of a prism over the footprint foot ([[x, d]...], any order) from h0 to h1: the walls that face the eye and the
   * top (when below the eye) or the bottom (when above it). Each { pts, n, z, kind: 'wall' | 'top' | 'bottom' }.
   */
  function prism(foot, h0, h1, eye) {
    let a2 = 0; for (let i = 0; i < foot.length; i++) { const p = foot[i], q = foot[(i + 1) % foot.length]; a2 += p[0] * q[1] - q[0] * p[1]; }
    const F = a2 >= 0 ? foot : foot.slice().reverse(), out = [];
    for (let i = 0; i < F.length; i++) {
      const a = F[i], b = F[(i + 1) % F.length], ex = b[0] - a[0], ed = b[1] - a[1], L = Math.hypot(ex, ed) || 1, nx = ed / L, nd = -ex / L;
      const mx = (a[0] + b[0]) / 2, md = (a[1] + b[1]) / 2;
      if (nx * -mx + nd * -md <= 0) continue;
      out.push({ pts: [[a[0], a[1], h0], [b[0], b[1], h0], [b[0], b[1], h1], [a[0], a[1], h1]], n: [nx, nd, 0], z: Math.hypot(mx, md), kind: 'wall' });
    }
    const cz = Math.hypot(F.reduce((s, p) => s + p[0], 0) / F.length, F.reduce((s, p) => s + p[1], 0) / F.length);
    if (h1 < eye) out.push({ pts: F.map(p => [p[0], p[1], h1]), n: [0, 0, 1], z: cz, kind: 'top' });
    if (h0 > eye) out.push({ pts: F.map(p => [p[0], p[1], h0]), n: [0, 0, -1], z: cz, kind: 'bottom' });
    return out;
  }
  const tone = (n) => (n[2] > 0.5 ? 0 : n[0] < -0.35 ? 0 : n[0] > 0.35 ? 2 : 1);
  /** Leafy lobes (ivy, planting) round seeded points: three path strings for three tones. */
  function lobes(G, rnd, pts, r0, r1) { const dd = ['', '', '']; pts.forEach((p, i) => { const r = r0 + rnd() * (r1 - r0); dd[i % 3] += G.disc(p[0], p[1], r, r * 0.78); }); return dd; }
  return { pen, prism, tone, lobes, clipPoly };
})();

/* ---------- structure.mcf-viaduct (the back) and structure.mcf-railbridge-front: a run of viaduct spans in perspective ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCF, PN = SCENE_MCF_PEN;
  function run(v, rnd, season, part) {
    const front = part > 0;
    const S = M.via[v], V = M.views[S.view], c = V.camera, t = S.t, n = S.n, hw = S.w / 2, H = S.H;
    const o = V.proj(S.anchor[0], S.anchor[1], S.base);
    const G = PN.pen(V, o), P = G.P, out = [], lit = [];
    const push = (f, d, extra) => { if (d) out.push(Object.assign({ f, d }, extra || {})); };
    const strokeOf = (s, w, d, extra) => { if (d) out.push(Object.assign({ s, w, d }, extra || {})); };
    const ivyOn = season !== 'winter';
    // which side of the deck is nearer the camera (the run's middle)
    const sa = S.spans[0].a, sb = S.spans[S.spans.length - 1].b, mid = [(sa[0] + sb[0]) / 2, (sa[1] + sb[1]) / 2];
    const sN = Math.hypot(mid[0] + n[0] * hw, mid[1] + n[1] * hw) < Math.hypot(mid[0] - n[0] * hw, mid[1] - n[1] * hw) ? 1 : -1;
    // far spans first
    const spans = S.spans.map((sp, i) => Object.assign({ i, z: Math.hypot((sp.a[0] + sp.b[0]) / 2, (sp.a[1] + sp.b[1]) / 2) }, sp)).sort((p, q) => q.z - p.z);
    const red = S.type === 'red';
    for (const sp of spans) {
      const a0 = sp.a, b0 = sp.b, L = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
      const g = (s, u, h) => [a0[0] + t[0] * s + n[0] * u, a0[1] + t[1] * s + n[1] * u, h];
      const kPx = G.k((a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2);
      const lowB = Math.min(sp.ba, sp.bb, 0);
      if (S.type === 'arc') { if (part < 2) arcade(sp, g, L, kPx, lowB); continue; }
      // ---- a through-lattice span: the rails at H, the deck's underside at hb, the girders from hb to ht each side
      const hb = H - 0.8, ht = H + (red ? 1.5 : 2.1), pierA = 1.9, s0 = pierA, s1 = L - pierA;
      if (!front) {
        // the deck's underside (the eye is below it) with its cross girders, the far girder's lattice (sky shows through)
        if (c.eye < hb) {
          push('@soffit.0', G.poly3([g(s0, -hw, hb), g(s1, -hw, hb), g(s1, hw, hb), g(s0, hw, hb)]));
          let dd = ''; for (let s = s0 + 2.5; s < s1; s += 2.5) dd += G.line3([g(s, -hw, hb), g(s, hw, hb)]);
          strokeOf('@soffit.1', Math.max(0.6, kPx * 0.12), dd, { op: 0.9, detail: true });
        } else push('@soffit.0', G.poly3([g(s0, -hw, H - 0.1), g(s1, -hw, H - 0.1), g(s1, hw, H - 0.1), g(s0, hw, H - 0.1)]), { op: 0.9 });
        girder(g, -sN * hw, s0, s1, hb, ht, kPx, true, red);
        if (S.park) {
          // the sky park: birches, grasses and shrubs in raised beds along the deck (seasonal)
          const pts = []; for (let k = 0; k < 16; k++) { const s = s0 + rnd() * (s1 - s0), u = (rnd() - 0.5) * S.w * 0.7, tall = rnd() < 0.25, q = P(...g(s, u, ht + (tall ? 1.5 + rnd() * 2.5 : rnd() * 0.6))); pts.push([q[0], q[1], tall]); }
          const dd = PN.lobes(G, rnd, pts, kPx * 0.6, kPx * 1.4);
          dd.forEach((x, j) => push('@park.' + j, x));
        }
        if (S.masts) {
          const u = -sN * (hw - 0.3), a = g(s0 + 0.4, u, H), b = g(s0 + 0.4, u, H + 6.6), c2 = g(s0 + 0.4, sN * 0.9, H + 6.2);
          strokeOf('@mast', Math.max(0.6, kPx * 0.22), G.line3([a, b]), { detail: kPx < 12 });
          strokeOf('@mast', Math.max(0.4, kPx * 0.07), G.line3([b, c2]) + G.line3([g(s0 + 0.4, u, H + 5.2), c2]), { detail: true });
          strokeOf('@mast', Math.max(0.3, kPx * 0.035), G.line3([g(0, sN * 1.0, H + 5.7), g(L, sN * 1.0, H + 5.7)]) + G.line3([g(0, -sN * 1.0, H + 5.7), g(L, -sN * 1.0, H + 5.7)]), { op: 0.7, detail: true });
        }
      } else if (part === 1) girder(g, sN * hw, s0, s1, hb, ht, kPx, false, red);
      else {
        pier(g, 0, sp.ba, kPx, hb, ht, red);
        if (S.endPier && sp.i === S.spans.length - 1) pier(g, L, sp.bb, kPx, hb, ht, red);
      }
    }
    /** One lattice girder at offset u: chords, end posts, a double (X) lattice; the far one in shade. */
    function girder(g, u, s0, s1, hb, ht, kPx, far, red) {
      const col = red ? (far ? '@steel.1' : '@steel.0') : (far ? '@cream.1' : '@cream.0'), ch = 0.42;
      push(col, G.poly3([g(s0, u, ht - ch), g(s1, u, ht - ch), g(s1, u, ht), g(s0, u, ht)]));
      push(far ? col : (red ? '@steel.1' : '@cream.1'), G.poly3([g(s0, u, hb), g(s1, u, hb), g(s1, u, hb + ch + 0.25), g(s0, u, hb + ch + 0.25)]));
      const bay = red ? 3.0 : 2.3, nB = Math.max(2, Math.round((s1 - s0) / bay)), bw = (s1 - s0) / nB;
      let dd = '', vv = '';
      for (let i = 0; i < nB; i++) { const sa = s0 + i * bw, sb = sa + bw; dd += G.line3([g(sa, u, hb + ch), g(sb, u, ht - ch)]) + G.line3([g(sa, u, ht - ch), g(sb, u, hb + ch)]); if (i) vv += G.line3([g(sa, u, hb), g(sa, u, ht)]); }
      strokeOf(col, Math.max(0.6, kPx * 0.15), dd, far ? { op: 0.8, detail: true } : { detail: kPx < 9 });
      strokeOf(col, Math.max(0.7, kPx * 0.2), vv, far ? { op: 0.8, detail: true } : { detail: kPx < 9 });
      strokeOf(col, Math.max(0.8, kPx * 0.34), G.line3([g(s0, u, hb), g(s0, u, ht)]) + G.line3([g(s1, u, hb), g(s1, u, ht)]));
      if (!far) {
        // the deck's edge below the bottom chord (in shade), the rivet lines and the light on the top chord's upper edge
        push('@shadow', G.poly3([g(s0, u, hb - 0.45), g(s1, u, hb - 0.45), g(s1, u, hb), g(s0, u, hb)]), { op: 0.75 });
        if (kPx > 5) strokeOf('@rivet', Math.max(0.4, kPx * 0.05), G.line3([g(s0, u, ht - ch * 0.5), g(s1, u, ht - ch * 0.5)]) + G.line3([g(s0, u, hb + ch * 0.6), g(s1, u, hb + ch * 0.6)]), { op: 0.5, detail: true });
        strokeOf(red ? '@steel.0' : '@rail.0', Math.max(0.4, kPx * 0.06), G.line3([g(s0, u, ht), g(s1, u, ht)]), { op: 0.8 });
      }
    }
    /** The castellated pier at s along the run: a brick tower with sandstone quoins, string courses, arrow slits, merlons. */
    function pier(g, s, base, kPx, hb, ht, red) {
      const pa = 1.9, pc = hw + (red ? 0.5 : 1.3), h0 = Math.min(base, 0) - 0.4, top = red ? hb : ht + 0.4;
      const foot = [g(s - pa, -pc, 0), g(s + pa, -pc, 0), g(s + pa, pc, 0), g(s - pa, pc, 0)].map(p => [p[0], p[1]]);
      for (const F of PN.prism(foot, h0, top, c.eye).sort((p, q) => q.z - p.z)) {
        if (F.kind === 'top') { push('@stone.0', G.poly3(F.pts)); continue; }
        if (F.kind === 'bottom') continue;
        const tn = PN.tone(F.n), [p0, p1] = [F.pts[0], F.pts[1]], lerp = (u, h) => [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, h];
        push({ lin: [[0, '@brick.' + tn], [1, '@brick.' + Math.min(3, tn + 1)]], x1: 0, y1: G.R(P(...lerp(0.5, top))[1]), x2: 0, y2: G.R(P(...lerp(0.5, h0))[1]) }, G.poly3(F.pts));
        push('@stone.' + Math.min(2, tn + 1), G.poly3([lerp(0, h0), lerp(1, h0), lerp(1, Math.max(0.8, base + 1.6)), lerp(0, Math.max(0.8, base + 1.6))]));
        if (!red) {
          push('@stone.' + tn, G.poly3([lerp(0, hb - 0.7), lerp(1, hb - 0.7), lerp(1, hb - 0.2), lerp(0, hb - 0.2)]));
          // quoins up both corners (alternate long and short)
          if (kPx > 3) { let dd = ''; for (let h = Math.max(base + 1.6, 1.6), k = 0; h < top - 0.6; h += 0.55, k++) { const w = k % 2 ? 0.08 : 0.13; dd += G.poly3([lerp(0, h), lerp(w, h), lerp(w, h + 0.5), lerp(0, h + 0.5)]) + G.poly3([lerp(1 - w, h), lerp(1, h), lerp(1, h + 0.5), lerp(1 - w, h + 0.5)]); } push('@stone.' + Math.min(2, tn + 1), dd, { detail: true }); }
          if (kPx > 2.5) push('@shadow', G.poly3([lerp(0.47, hb - 4.4), lerp(0.53, hb - 4.4), lerp(0.53, hb - 2.4), lerp(0.47, hb - 2.4)]) + G.poly3([lerp(0.47, hb + 0.6), lerp(0.53, hb + 0.6), lerp(0.53, hb + 1.5), lerp(0.47, hb + 1.5)]), { detail: true });
          // the corbelled parapet and its merlons
          push('@stone.' + Math.min(2, tn + 1), G.poly3([lerp(-0.03, top - 0.45), lerp(1.03, top - 0.45), lerp(1.03, top), lerp(-0.03, top)]));
          let mm = ''; const nM = 4; for (let k = 0; k < nM; k++) { const ua = (k + 0.08) / nM, ub = (k + 0.6) / nM; mm += G.poly3([lerp(ua, top), lerp(ub, top), lerp(ub, top + 0.95), lerp(ua, top + 0.95)]); }
          push('@stone.' + tn, mm, { detail: kPx < 10 });
        }
        if (kPx > 6) { let dd = ''; for (let h = Math.max(base + 1.8, 1.8); h < (red ? top : hb - 0.8); h += 0.45) dd += G.line3([lerp(0.13, h), lerp(0.87, h)]); strokeOf('@mortar', Math.max(0.4, kPx * 0.02), dd, { op: 0.3, detail: true }); }
        if (base < 0) push('@shadow', G.poly3([lerp(0, base - 0.4), lerp(1, base - 0.4), lerp(1, base + 0.6), lerp(0, base + 0.6)]), { op: 0.5 });
        // soot streaks down from the string course, ivy climbing some piers
        if (kPx > 2) push('@brick.3', G.poly3([lerp(0.2, hb - 3.5), lerp(0.32, hb - 3.5), lerp(0.3, hb - 0.7), lerp(0.22, hb - 0.7)]) + G.poly3([lerp(0.62, hb - 2.2), lerp(0.7, hb - 2.2), lerp(0.69, hb - 0.7), lerp(0.63, hb - 0.7)]), { op: 0.35, detail: true });
        if (kPx > 3 && rnd() < 0.4) { const pts = []; const nL = ivyOn ? 22 : 10; for (let k = 0; k < nL; k++) { const u = rnd(), h = Math.max(0, base) + Math.pow(rnd(), 1.3) * 6; pts.push(P(...lerp(0.12 + u * 0.76, h))); } PN.lobes(G, rnd, pts, kPx * 0.22, kPx * 0.45).forEach((x, j) => push('@ivy.' + j, x, { detail: true })); }
      }
      // a lantern on the near face (night)
      const q = P(...g(s - pa - 0.12, sN * (pc + 0.12), 3.6)), r = Math.max(1.1, kPx * 0.28);
      const dl = G.disc(q[0], q[1], r * 0.8);
      if (dl) { out.push({ f: '@mast', d: `M${G.R(q[0] - r * 0.7)} ${G.R(q[1] - r)}h${G.R(r * 1.4)}v${G.R(r * 2)}h${G.R(-r * 1.4)}z` }); lit.push({ f: '#ffd98a', d: dl, glow: 'lamp' }); }
    }
    /** The brick arcade: the back is the whole of it, the front its parapet and coping (a train runs behind them). */
    function arcade(sp, g, L, kPx, lowB) {
      const fN = (s, h) => g(s, sN * hw, h), fF = (s, h) => g(s, -sN * hw, h);
      const pierW = 2.4, nA = Math.max(1, Math.round(L / 10.5)), aw = L / nA, hs = H - 4.6, hc = H - 1.5, top = H + 1.1;
      if (front) {
        push('@brick.0', G.poly3([fN(0, H - 0.2), fN(L, H - 0.2), fN(L, top), fN(0, top)]));
        push('@stone.0', G.poly3([fN(0, top - 0.22), fN(L, top - 0.22), fN(L, top + 0.12), fN(0, top + 0.12)]));
        push('@stone.1', G.poly3([fN(0, H - 0.65), fN(L, H - 0.65), fN(L, H - 0.2), fN(0, H - 0.2)]));
        if (kPx > 6) strokeOf('@mortar', Math.max(0.4, kPx * 0.02), G.line3([fN(0, H + 0.3), fN(L, H + 0.3)]) + G.line3([fN(0, H + 0.7), fN(L, H + 0.7)]), { op: 0.35, detail: true });
        return;
      }
      const arch = (f, i, grow) => { const pts = [], a = i * aw + pierW / 2, b = (i + 1) * aw - pierW / 2, r = (b - a) / 2, m = (a + b) / 2; for (let k = 0; k <= 12; k++) { const th = Math.PI * (1 - k / 12); pts.push(f(m + Math.cos(th) * (r + grow), hs + Math.sin(th) * (hc - hs + grow))); } return { pts, a, b }; };
      // the barrels behind the face: the soffit strips between the near and the far arch, and the piers' inner faces
      for (let i = 0; i < nA; i++) {
        const A = arch(fN, i, 0), B = arch(fF, i, 0);
        if (kPx < 12) {
          // far: the barrel's soffit as one shape (the near arch's crown band); the far opening still shows through below it
          push('@soffit.0', G.poly3(A.pts.concat(B.pts.slice().reverse())));
          continue;
        }
        let s0 = '', s1 = '';
        for (let k = 0; k < A.pts.length - 1; k++) { const d = G.poly3([A.pts[k], A.pts[k + 1], B.pts[k + 1], B.pts[k]]); if (k % 2) s0 += d; else s1 += d; }
        push('@soffit.0', s0); push('@soffit.1', s1);
        let jj = ''; for (const s of [A.a, A.b]) jj += G.poly3([fN(s, lowB - 0.3), fN(s, hs), fF(s, hs), fF(s, lowB - 0.3)]);
        push('@soffit.1', jj);
      }
      // the near face with the arches as holes (opposite winding): what is beyond shows through
      const outer = [fN(0, lowB - 0.3), fN(L, lowB - 0.3), fN(L, top), fN(0, top)].map(p => P(...p));
      const area = (pts) => { let s = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; s += p[0] * q[1] - q[0] * p[1]; } return s; };
      let d = G.path(outer);
      for (let i = 0; i < nA; i++) {
        const A = arch(fN, i, 0), ring = [fN(A.a, lowB - 0.3)].concat(A.pts, [fN(A.b, lowB - 0.3)]).map(p => P(...p));
        d += G.path(Math.sign(area(ring)) === Math.sign(area(outer)) ? ring.reverse() : ring);
      }
      push({ lin: [[0, '@brick.4'], [0.45, '@brick.0'], [1, '@brick.2']], x1: 0, y1: G.R(P(...fN(L / 2, top))[1]), x2: 0, y2: G.R(P(...fN(L / 2, 0))[1]) }, d);
      for (let i = 0; i < nA; i++) {
        const A = arch(fN, i, 0), B = arch(fN, i, 0.5);
        push('@brick.1', G.path(B.pts.map(p => P(...p)).concat(A.pts.slice().reverse().map(p => P(...p)))), { detail: kPx < 12 });
        if (kPx > 5) { let dd = ''; for (let k = 1; k < 12; k++) dd += G.line3([A.pts[k], B.pts[k]]); strokeOf('@mortar', Math.max(0.4, kPx * 0.03), dd, { op: 0.5, detail: true }); }
        if (i) { const s = i * aw; push('@brick.4', G.poly3([fN(s - 0.7, Math.max(lowB, 0)), fN(s + 0.7, Math.max(lowB, 0)), fN(s + 0.7, hs - 0.3), fN(s - 0.7, hs - 0.3)]), { op: 0.45, detail: true }); push('@stone.1', G.poly3([fN(s - 1.3, hs - 0.3), fN(s + 1.3, hs - 0.3), fN(s + 1.3, hs + 0.1), fN(s - 1.3, hs + 0.1)])); }
      }
      push('@stone.1', G.poly3([fN(0, H - 0.65), fN(L, H - 0.65), fN(L, H - 0.2), fN(0, H - 0.2)]));
      push('@stone.0', G.poly3([fN(0, top - 0.22), fN(L, top - 0.22), fN(L, top + 0.12), fN(0, top + 0.12)]));
      if (kPx > 6) { let dd = ''; for (let h = hc + 0.6; h < H - 0.7; h += 0.45) dd += G.line3([fN(0, h), fN(L, h)]); strokeOf('@mortar', Math.max(0.4, kPx * 0.02), dd, { op: 0.3, detail: true }); }
      push('@brick.3', G.poly3([fN(0, H - 0.2), fN(L, H - 0.2), fN(L, H - 1.9), fN(0, H - 1.9)]), { op: 0.22 });
      if (lowB < 0) push('@shadow', G.poly3([fN(0, lowB - 0.3), fN(L, lowB - 0.3), fN(L, lowB + 0.6), fN(0, lowB + 0.6)]), { op: 0.45 });
      for (let i = 1; i < nA; i++) if (rnd() < 0.55) { const s = i * aw, pts = []; for (let k = 0; k < (ivyOn ? 24 : 10); k++) { const u = Math.pow(rnd(), 0.8); pts.push(P(...fN(s + (rnd() - 0.5) * 2.6 * (1 - u * 0.4), Math.max(lowB, 0) + u * (hs + 1.2)))); } PN.lobes(G, rnd, pts, kPx * 0.22, kPx * 0.46).forEach((x, j) => push('@ivy.' + j, x, { detail: true })); }
    }
    return { body: out, lit };
  }
  const palette = {
    base: { brick: ['#a04e38', '#86402e', '#6a3226', '#3e1e1a', '#b06048'], mortar: '#cdb8a0', stone: ['#d6bc92', '#b89a72', '#8e7456'],
      cream: ['#efe6c8', '#cfc4a4'], steel: ['#8e3e30', '#6a2c24'], soffit: ['#2e2826', '#40352f'], shadow: '#1a1614', rail: ['#f4eedc', '#9a948a'],
      rivet: '#8a7e66', mast: '#34363a', ivy: ['#2a4a24', '#3a5e2c', '#527a38'], park: ['#4a7a34', '#6a9a44', '#3a6a3a'] },
    spring: { park: ['#6a9a44', '#8aba5a', '#d8c8e0'], ivy: ['#3a6a2c', '#4e7e34', '#6a9a44'] },
    autumn: { ivy: ['#8a3a22', '#a85a26', '#6a4a24'], park: ['#b07a34', '#c89a44', '#7a6a34'] },
    winter: { ivy: ['#2a3a26', '#34482c', '#405a34'], park: ['#6a6a58', '#8a8676', '#5a5e4e'] },
  };
  const tags = ['uk', 'manchester', 'castlefield', 'viaduct', 'railway', 'perspective', 'row', 'signature', 'kit:urban', 'kit:water', 'role:landmark', 'class:structure'];
  sceneObjDefine({
    id: 'structure.mcf-railbridge', category: 'structure', size: [900, 500], variants: Math.max(1, M.via.length),
    seasonal: true, shapeBySeason: true, flippable: false, real: { h: 13, l: 34, w: 9 }, palette,
    night: { glow: { lamp: '#ffd98a' }, on: 1 }, parts: ['body', 'lit'], reflect: true, shadow: false, tags,
    credit: 'drawn for the Castlefield views: the 1877 tram viaduct, the 1849 brick arcade and the sky-park viaduct, in each camera\'s perspective (the back)',
    build(v, rnd, ctx) { return run(v, rnd, (ctx && ctx.season) || 'summer', 0); },
  });
  sceneObjDefine({
    id: 'structure.mcf-railbridge-front', category: 'structure', size: [900, 500], variants: Math.max(1, M.via.length),
    seasonal: true, shapeBySeason: true, flippable: false, real: { h: 13, l: 34, w: 9 }, palette,
    night: { glow: { lamp: '#ffd98a' }, on: 1 }, parts: ['body', 'lit'], reflect: true, shadow: false, tags,
    credit: 'drawn for the Castlefield views: the near girders, castellated piers and parapets of the viaducts (the front)',
    build(v, rnd, ctx) { return run(v, rnd, (ctx && ctx.season) || 'summer', 1); },
  });
  sceneObjDefine({
    id: 'structure.mcf-railbridge-pier', category: 'structure', size: [300, 500], variants: Math.max(1, M.via.length),
    seasonal: true, shapeBySeason: true, flippable: false, real: { h: 13, l: 4, w: 11 }, palette,
    night: { glow: { lamp: '#ffd98a' }, on: 1 }, parts: ['body', 'lit'], reflect: true, shadow: false, tags,
    credit: 'drawn for the Castlefield views: the castellated brick piers of the tram viaduct, with their sandstone dressings',
    build(v, rnd, ctx) { return run(v, rnd, (ctx && ctx.season) || 'summer', 2); },
  });
})();

/* ---------- structure.mcf-merchants-bridge: Merchants' Bridge, the curved deck slung from one leaning white arch ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCF, PN = SCENE_MCF_PEN;
  function bridge(v) {
    const B = M.bridges[v], V = M.views[B.view], W = V.camera.water || 0;
    const A = B.A, C = B.B, L = Math.hypot(C[0] - A[0], C[1] - A[1]);
    const t = [(C[0] - A[0]) / L, (C[1] - A[1]) / L], n = [t[1], -t[0]];
    const mid = [(A[0] + C[0]) / 2 + n[0] * B.bow * 0.7, (A[1] + C[1]) / 2 + n[1] * B.bow * 0.7];
    const o = V.proj(mid[0], mid[1], W), G = PN.pen(V, o), P = G.P, out = [], kPx = G.k(mid[0], mid[1]);
    const N = 24, deck = (u, off, dh) => { const s = u * L, bw = B.bow * 4 * u * (1 - u), x = A[0] + t[0] * s + n[0] * (bw + off), d = A[1] + t[1] * s + n[1] * (bw + off); return [x, d, B.deck + B.rise * 4 * u * (1 - u) + (dh || 0)]; };
    const side = (off, dh) => { const pts = []; for (let i = 0; i <= N; i++) pts.push(deck(i / N, off, dh)); return pts; };
    const hw = B.w / 2;
    const sNear = (Math.hypot(...deck(0.5, hw).slice(0, 2)) < Math.hypot(...deck(0.5, -hw).slice(0, 2))) ? 1 : -1;
    const nearE = side(sNear * hw), farE = side(-sNear * hw);
    const arch = []; for (let i = 0; i <= N; i++) { const u = i / N, p = deck(u, -sNear * (hw + 0.6 + B.lean * Math.sin(Math.PI * u))); arch.push([p[0], p[1], 0.2 + (B.arch - 0.2) * Math.sin(Math.PI * u)]); }
    let hg = ''; for (let i = 2; i < N - 1; i += 2) hg += G.line3([arch[i], [farE[i][0], farE[i][1], farE[i][2] + 1.1]]);
    out.push({ s: '@cable', w: Math.max(0.4, kPx * 0.035), op: 0.9, d: hg });
    out.push({ s: '@steel.1', w: Math.max(1.2, kPx * 0.55), d: G.line3(arch) });
    out.push({ s: '@steel.0', w: Math.max(0.8, kPx * 0.3), d: G.line3(arch.map(p => [p[0], p[1], p[2] + 0.1])) });
    out.push({ f: '@deck', d: G.poly3(nearE.concat(farE.slice().reverse())) });
    const rail = (E, h, op) => out.push({ s: '@rail', w: Math.max(0.5, kPx * 0.06), op, d: G.line3(E.map(p => [p[0], p[1], p[2] + h])) });
    rail(farE, 1.15, 0.7);
    { let dd = ''; for (let i = 0; i <= N; i++) dd += G.line3([farE[i], [farE[i][0], farE[i][1], farE[i][2] + 1.15]]); out.push({ s: '@rail', w: Math.max(0.4, kPx * 0.03), op: 0.5, d: dd }); }
    out.push({ f: '@steel.0', d: G.poly3(nearE.concat(nearE.slice().reverse().map(p => [p[0], p[1], p[2] - 0.75]))) });
    out.push({ f: '@steel.2', op: 0.6, d: G.poly3(nearE.map(p => [p[0], p[1], p[2] - 0.5]).concat(nearE.slice().reverse().map(p => [p[0], p[1], p[2] - 0.75]))) });
    out.push({ f: '@mesh', op: 0.3, d: G.poly3(nearE.concat(nearE.slice().reverse().map(p => [p[0], p[1], p[2] + 1.15]))) });
    rail(nearE, 1.15, 1); rail(nearE, 0.1, 0.9);
    { let dd = ''; for (let i = 0; i <= N; i++) dd += G.line3([nearE[i], [nearE[i][0], nearE[i][1], nearE[i][2] + 1.15]]); out.push({ s: '@rail', w: Math.max(0.4, kPx * 0.05), d: dd }); }
    for (const u of [0, 1]) {
      const a = deck(u, -hw - 0.6), b = deck(u, hw + 0.6), e = [t[0] * (u ? 1.6 : -1.6), t[1] * (u ? 1.6 : -1.6)];
      const F = [[a[0], a[1]], [b[0], b[1]], [b[0] + e[0], b[1] + e[1]], [a[0] + e[0], a[1] + e[1]]];
      for (const f of PN.prism(F, W - 0.3, B.deck - 0.1, V.camera.eye).sort((p, q2) => q2.z - p.z)) out.push({ f: '@stone.' + PN.tone(f.n), d: G.poly3(f.pts) });
    }
    const lit = []; for (let i = 3; i < N; i += 5) { const q = P(nearE[i][0], nearE[i][1], nearE[i][2] + 1.25), r = Math.max(1, kPx * 0.18); lit.push({ f: '#e8f0ff', glow: 'lamp', d: G.disc(q[0], q[1], r) }); }
    return { body: out, lit };
  }
  sceneObjDefine({
    id: 'structure.mcf-merchants-bridge', category: 'structure', size: [900, 400], variants: Math.max(1, M.bridges.length),
    seasonal: false, flippable: false, real: { h: 14, l: 60, w: 3.2 },
    palette: { base: { steel: ['#f6f4ee', '#c8c6c0', '#8a8a86'], cable: '#6a6c70', deck: '#5a5a58', rail: '#eeeeea', mesh: '#b8bcc0', stone: ['#a89a84', '#8a7c68', '#6a5e50'] } },
    night: { glow: { lamp: '#e8f0ff' }, on: 1 },
    parts: ['body', 'lit'], reflect: true, shadow: false,
    tags: ['uk', 'manchester', 'castlefield', 'footbridge', 'bridge', 'perspective', 'signature', 'kit:urban', 'kit:water', 'role:landmark', 'class:structure'],
    credit: 'drawn for the Castlefield views: Merchants\' Bridge (1995), in the camera\'s perspective',
    build(v) { return bridge(v); },
  });
})();

/* ---------- boat.mcf-narrowboat: a narrowboat moored or under way, a true 3D box in the camera's perspective ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCF, PN = SCENE_MCF_PEN, D2R = Math.PI / 180;
  const LIV = [
    { cab: '#1f4a34', panel: '#2a5e44', trim: '#e0c060', roof: '#8a2a24', band: '#8a2a24' },
    { cab: '#7a1e22', panel: '#8e2a2c', trim: '#e8dcc0', roof: '#24304a', band: '#24304a' },
    { cab: '#1e2e5a', panel: '#2a3e6e', trim: '#d8b048', roof: '#7a1e22', band: '#7a1e22' },
    { cab: '#2a5a5a', panel: '#367070', trim: '#f0e0b0', roof: '#3a2a20', band: '#c8a040' },
    { cab: '#4a2a5a', panel: '#5e3a6e', trim: '#e0c060', roof: '#2a4a34', band: '#2a4a34' },
    { cab: '#e8e2d0', panel: '#d8d0bc', trim: '#2a4a8a', roof: '#2a4a8a', band: '#2a4a8a' },
  ];
  function boat(v, rnd, season) {
    const B = M.boats[v], V = M.views[B.view], W = V.camera.water || -0.5;
    const hd = B.hd * D2R, t = [Math.sin(hd), Math.cos(hd)], n = [t[1], -t[0]], L = B.len, bw = B.trip ? 1.6 : 1.05;
    const o = V.proj(B.x, B.d, W), G = PN.pen(V, o), P = G.P, eye = V.camera.eye, kPx = G.k(B.x, B.d);
    const at = (s, u) => [B.x + t[0] * (s - L / 2) + n[0] * u, B.d + t[1] * (s - L / 2) + n[1] * u];
    const faces = [];
    const addPrism = (foot, h0, h1, paint, extra) => { for (const f of PN.prism(foot, h0, h1, eye)) faces.push(Object.assign({ f: paint(f) }, f, extra || {})); };
    // the hull: a rounded counter stern, straight sides, a long fine bow (no box ends)
    const bowL = 3.2, hull = [at(0.7, -bw), at(L - bowL, -bw), at(L - bowL * 0.5, -bw * 0.8), at(L - bowL * 0.15, -bw * 0.35), at(L, 0), at(L - bowL * 0.15, bw * 0.35), at(L - bowL * 0.5, bw * 0.8), at(L - bowL, bw), at(0.7, bw), at(0.22, bw * 0.78), at(0, 0.3), at(0, -0.3), at(0.22, -bw * 0.78)];
    addPrism(hull, W - 0.05, W + 0.55, (f) => (f.kind === 'top' ? '@deck' : '@hull.' + PN.tone(f.n)), { hull: true });
    const c0 = B.trip ? 2.4 : 2.2, c1 = L - (B.trip ? 3.4 : 4.4), cw = bw - 0.12, ch = W + (B.trip ? 1.75 : 1.65);
    const cab = [at(c0, -cw), at(c1, -cw), at(c1, cw), at(c0, cw)];
    const isSide = (f) => Math.abs(f.n[0] * t[0] + f.n[1] * t[1]) < 0.5;
    // the cabin with its tumblehome: straight sides to the cant, then a narrower, cambered roof (not one flat slab)
    addPrism(cab, W + 0.5, ch - 0.2, (f) => (f.kind === 'top' ? '@roof' : isSide(f) ? '@cab.' + PN.tone(f.n) : '@panel'), { cabin: true });
    const ci = cw - 0.16, cabT = [at(c0 + 0.08, -ci), at(c1 - 0.08, -ci), at(c1 - 0.08, ci), at(c0 + 0.08, ci)];
    addPrism(cabT, ch - 0.2, ch, (f) => (f.kind === 'top' ? '@roof' : '@band'), { cant: true });
    // the hull first, then the cabin on it, then the cant and roof (a deck and a roof share a centroid: a plain depth sort can
    // lay the deck over the cabin), each tier far to near
    const tier = (f) => (f.hull ? 0 : f.cabin ? 1 : 2);
    faces.sort((p, q) => tier(p) - tier(q) || q.z - p.z);
    const out = [], lit = [], smoke = [];
    for (const f of faces) {
      out.push({ f: f.f, d: G.poly3(f.pts) });
      if (f.kind !== 'wall') continue;
      const [p0, p1] = [f.pts[0], f.pts[1]], lerp = (u, h) => [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u, h];
      if (f.hull) out.push({ f: '@band', op: 0.9, d: G.poly3([lerp(0, W + 0.36), lerp(1, W + 0.36), lerp(1, W + 0.5), lerp(0, W + 0.5)]) });
      if (f.cabin && isSide(f)) {
        // the panel inset with its coachline, the portholes (or the trip boat's long windows)
        const nP = B.trip ? 1 : 2;
        for (let j = 0; j < nP; j++) { const ua = 0.03 + j / nP, ub = (j + 1) / nP - 0.03; out.push({ f: '@panel', d: G.poly3([lerp(ua, W + 0.72), lerp(ub, W + 0.72), lerp(ub, ch - 0.26), lerp(ua, ch - 0.26)]), detail: true }); out.push({ s: '@trim', w: Math.max(0.4, kPx * 0.035), d: G.line3([lerp(ua, W + 0.72), lerp(ub, W + 0.72), lerp(ub, ch - 0.26), lerp(ua, ch - 0.26), lerp(ua, W + 0.72)]), detail: true }); }
        out.push({ f: '@trim', d: G.poly3([lerp(0, ch - 0.16), lerp(1, ch - 0.16), lerp(1, ch - 0.08), lerp(0, ch - 0.08)]) });
        const nW = B.trip ? Math.round((c1 - c0) / 1.6) : Math.round((c1 - c0) / 1.5);
        for (let i = 0; i < nW; i++) {
          const u = (i + 0.5) / nW;
          if (B.trip) { const g = G.poly3([lerp(u - 0.32 / nW, W + 0.95), lerp(u + 0.32 / nW, W + 0.95), lerp(u + 0.32 / nW, ch - 0.32), lerp(u - 0.32 / nW, ch - 0.32)]); out.push({ f: '@glass', d: g }); lit.push({ f: '#ffd68a', d: g, glow: 'window' }); }
          else if (kPx > 2.2) { const q = P(...lerp(u, W + 1.15)), r = Math.max(0.6, kPx * 0.14); out.push({ f: '@brass', d: G.disc(q[0], q[1], r), detail: true }); const d2 = G.disc(q[0], q[1], r * 0.68); out.push({ f: '@glass', d: d2, detail: true }); if (rnd() < 0.7) lit.push({ f: '#ffd68a', d: d2, glow: 'window' }); }
        }
      }
    }
    out.push({ s: '@trim', w: Math.max(0.4, kPx * 0.05), op: 0.7, d: G.line3(hull.concat([hull[0]]).map(p => [p[0], p[1], W + 0.55])) });
    // the roof: two grab rails, its clutter, the chimney (smoking when lived in), the cratch at the bow, the tiller
    const roofAt = (s, u, h) => P(...at(s, u), ch + h);
    out.push({ s: '@rails', w: Math.max(0.4, kPx * 0.05), detail: true, d: G.line3([[...at(c0 + 0.4, -cw + 0.18), ch + 0.08], [...at(c1 - 0.4, -cw + 0.18), ch + 0.08]]) + G.line3([[...at(c0 + 0.4, cw - 0.18), ch + 0.08], [...at(c1 - 0.4, cw - 0.18), ch + 0.08]]) });
    // the roof's camber (a lit crown, shaded edges) and the clutter of a lived-on roof: mats, the plank and pole, a coil of rope,
    // a solar panel, the stern's sliding hatch
    const rq = (s0, s1, u0, u1, h) => G.poly3([[...at(s0, u0), ch + h], [...at(s1, u0), ch + h], [...at(s1, u1), ch + h], [...at(s0, u1), ch + h]]);
    out.push({ f: '@hull.0', op: 0.22, d: rq(c0 + 0.1, c1 - 0.1, -ci, -ci * 0.45, 0.005) + rq(c0 + 0.1, c1 - 0.1, ci * 0.45, ci, 0.005) });
    out.push({ f: '@trim', op: 0.16, d: rq(c0 + 0.2, c1 - 0.2, -0.18, 0.18, 0.01) });
    if (!B.trip) {
      out.push({ f: '@stove', op: 0.85, d: rq(c0 + 0.1, c0 + 1.3, -0.5, 0.5, 0.06), detail: true });
      out.push({ f: '@cab.1', d: rq(c0 + 0.15, c0 + 1.2, -0.42, 0.42, 0.14) });
      if (B.liv % 2 === 0) { out.push({ f: '@solar', d: rq(c0 + 6.2, c0 + 7.6, -0.55, 0.45, 0.08), detail: true }); out.push({ s: '@rails', w: Math.max(0.3, kPx * 0.02), op: 0.5, d: G.line3([[...at(c0 + 6.9, -0.55), ch + 0.09], [...at(c0 + 6.9, 0.45), ch + 0.09]]), detail: true }); }
      out.push({ s: '@log', w: Math.max(0.8, kPx * 0.16), d: G.line3([[...at(c1 - 5.5, 0.62), ch + 0.06], [...at(c1 - 1.8, 0.62), ch + 0.06]]) });
      out.push({ s: '@rails', w: Math.max(0.5, kPx * 0.06), d: G.line3([[...at(c0 + 2.2, -0.66), ch + 0.06], [...at(c1 - 2.4, -0.66), ch + 0.06]]) });
      out.push({ f: '@mat', op: 0.85, d: rq(c1 - 3.6, c1 - 2.2, -0.45, 0.35, 0.03), detail: true });
      { const q = roofAt(c0 + 4.6, 0.2, 0.06), r = Math.max(0.6, kPx * 0.24); out.push({ s: '@rope', w: Math.max(0.5, kPx * 0.07), d: G.disc(q[0], q[1], r, r * 0.45) + G.disc(q[0], q[1], r * 0.6, r * 0.27), detail: true }); }
    }
    if (B.roof === 'pots') for (let i = 0; i < 4; i++) { const q = roofAt(c0 + 2 + i * 1.3, (rnd() - 0.5) * 0.6, 0.15), r = kPx * 0.22; out.push({ f: '@pot', detail: true, d: G.path([[q[0] - r, q[1] - r], [q[0] + r, q[1] - r], [q[0] + r * 0.7, q[1] + r * 0.4], [q[0] - r * 0.7, q[1] + r * 0.4]]) }); out.push({ f: '@bloom.' + (i % 2), detail: true, d: G.disc(q[0], q[1] - r, r * 1.4, r) }); }
    if (B.roof === 'logs') { const a = roofAt(c0 + 1.5, -0.3, 0.3), b = roofAt(c0 + 4.5, -0.3, 0.3); out.push({ s: '@log', w: Math.max(1, kPx * 0.45), d: `M${G.pt(a)}L${G.pt(b)}` }); }
    if (B.roof === 'bike') { const a = roofAt(c0 + 3, 0, 0.45), r = kPx * 0.32; out.push({ s: '#2a2a2a', w: Math.max(0.5, kPx * 0.05), d: G.disc(a[0] - r * 1.6, a[1], r) + G.disc(a[0] + r * 1.6, a[1], r) }); }
    if (!B.trip) {
      const cq = roofAt(c1 - 1.2, 0.2, 0), cr = Math.max(0.6, kPx * 0.09);
      out.push({ f: '@stove', d: `M${G.R(cq[0] - cr)} ${G.R(cq[1])}v${G.R(-kPx * 0.6)}h${G.R(cr * 2)}v${G.R(kPx * 0.6)}z` });
      out.push({ f: '@brass', d: `M${G.R(cq[0] - cr * 1.3)} ${G.R(cq[1] - kPx * 0.6)}h${G.R(cr * 2.6)}v${G.R(-cr)}h${G.R(-cr * 2.6)}z` });
      if (B.smoke) { const q = [cq[0], cq[1] - kPx * 0.8], r = Math.max(1.2, kPx * 0.2); smoke.push({ f: '@smoke', op: 0.32, d: G.disc(q[0], q[1] - r, r, r * 0.8) + G.disc(q[0] + r * 0.9, q[1] - r * 2.4, r * 1.3, r) + G.disc(q[0] + r * 2.2, q[1] - r * 3.8, r * 1.6, r * 1.1) }); }
      // the cratch: a triangular board at the cabin's front, its cover sloping to the bow
      const a = [...at(c1, 0), ch + 0.05], b = [...at(c1, -cw), W + 0.55], c2 = [...at(c1, cw), W + 0.55], tip = [...at(L - 1.2, 0), W + 0.75];
      out.push({ f: '@cratch', d: G.poly3([a, b, tip]) + G.poly3([a, c2, tip]) });
      out.push({ s: '@trim', w: Math.max(0.4, kPx * 0.04), d: G.line3([b, a, c2]) });
      const s0 = P(...at(0.6, 0), W + 0.6), s1 = P(...at(-0.2, 0.3), W + 1.4);
      out.push({ s: '@brass', w: Math.max(0.5, kPx * 0.06), d: `M${G.pt(s0)}L${G.pt(s1)}` });
    } else {
      const a = roofAt(c1, -cw, 0), b = roofAt(c1 + 1.6, -cw, -0.2), c2 = roofAt(c1 + 1.6, cw, -0.2), d2 = roofAt(c1, cw, 0);
      out.push({ f: '@roof', op: 0.85, d: G.path([a, b, c2, d2]) });
    }
    // a button fender at the bow and the stern
    for (const s of [L, 0]) { const q = P(...at(s, 0), W + 0.25), r = Math.max(0.6, kPx * 0.2); out.push({ f: '@fender', d: G.disc(q[0], q[1], r, r * 0.8), detail: true }); }
    return { body: out, lit, smoke };
  }
  sceneObjDefine({
    id: 'boat.mcf-narrowboat', category: 'boat', size: [600, 200], variants: Math.max(1, M.boats.length),
    seasonal: true, shapeBySeason: true, flippable: false, real: { h: 1.9, l: 19, w: 2.1 },
    palette: {
      base: {
        cab: LIV.map(l => l.cab), panel: LIV.map(l => l.panel), trim: LIV.map(l => l.trim), roof: LIV.map(l => l.roof), band: LIV.map(l => l.band), hull: ['#2e2e2e', '#222222', '#161616'],
        deck: '#3a332c', glass: '#3a4852', brass: '#d0a850', stove: '#232326', smoke: '#eceef0', pot: '#a0522d', log: '#6a4a30', bloom: ['#3f7a34', '#e05a6a'],
        rails: '#c8b070', cratch: '#3a3a2e', fender: '#2a2420', solar: '#1e2a44', mat: '#5a4636', rope: '#d8ccb0',
      },
      spring: { bloom: ['#4a8a3a', '#f0c0d0'] }, autumn: { bloom: ['#6a5a2a', '#e0a040'] }, winter: { bloom: ['#4a4a3a', '#6a6058'] },
    },
    night: { glow: { window: '#ffd68a' }, on: 0.85 },
    parts: ['body', 'lit', 'smoke'],
    anim: { flicker: { part: 'smoke', op: [0.25, 0.6], period: 6 } },
    reflect: true, shadow: false,
    tags: ['uk', 'canal', 'narrowboat', 'boat', 'perspective', 'row', 'kit:water', 'kit:boats', 'role:boat', 'class:boat'],
    credit: 'drawn for the Castlefield views: narrowboats and a trip boat in the camera\'s perspective',
    build(v, rnd, ctx) { return boat(v, rnd, (ctx && ctx.season) || 'summer'); },
  });
})();

/* ---------- landmark.mcf-roman-gate: the reconstructed north gate of Mamucium and its wall ----------
   Twin round-arched carriageways between two flanking towers of squared red sandstone, a timber fighting gallery with a
   boarded parapet under a shingled pent roof, the stone curtain wall each side with its crenellations, the turf rampart. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCF, PN = SCENE_MCF_PEN, D2R = Math.PI / 180;
  function gate(v, rnd, season) {
    const Gt = M.gates[v], V = M.views[Gt.view], eye = V.camera.eye;
    const hd = Gt.hd * D2R, t = [Math.cos(hd), -Math.sin(hd)], n = [Math.sin(hd), Math.cos(hd)];   // t along the face (to the right), n back from it
    const at = (u, b) => [Gt.at[0] + t[0] * u + n[0] * b, Gt.at[1] + t[1] * u + n[1] * b];
    const o = V.proj(Gt.at[0], Gt.at[1], 0), G = PN.pen(V, o), P = G.P, out = [], lit = [], kPx = G.k(Gt.at[0], Gt.at[1]);
    const ivyOn = season !== 'winter';
    const F3 = (u, b, h) => [...at(u, b), h];
    const push = (f, d, ex) => { if (d) out.push(Object.assign({ f, d }, ex || {})); };
    const box = (u0, u1, b0, b1, h0, h1, mat) => { for (const f of PN.prism([at(u0, b0), at(u1, b0), at(u1, b1), at(u0, b1)], h0, h1, eye).sort((p, q) => q.z - p.z)) push(f.kind === 'top' ? mat + '.0' : f.kind === 'wall' && Math.abs(f.n[0] * n[0] + f.n[1] * n[1]) > 0.7 ? { lin: [[0, mat + '.0'], [1, mat + '.1']], x1: 0, y1: G.R(P(...f.pts[2])[1]), x2: 0, y2: G.R(P(...f.pts[0])[1]) } : mat + '.' + Math.max(1, PN.tone(f.n)), G.poly3(f.pts)); };
    /** Ashlar courses on a face plane at b from u0 to u1, h0 to h1 (staggered joints). */
    const courses = (u0, u1, b, h0, h1, step) => { let dd = ''; for (let h = h0 + step, k = 0; h < h1; h += step, k++) { dd += G.line3([F3(u0, b, h), F3(u1, b, h)]); for (let u = u0 + (k % 2) * step * 1.1; u < u1; u += step * 2.2) dd += G.line3([F3(u, b, h - step), F3(u, b, h)]); } return dd; };
    /** Ashlar blocks on a face plane at b: each block its own tone (three tones, staggered courses, uneven lengths), a few
     *  spalled or replaced ones, so the face reads as dressed sandstone and not as one flat card. */
    const ashlar = (u0, u1, b, h0, h1, step) => {
      const dd = ['', '', '', ''];
      for (let h = h0, k = 0; h < h1 - 0.05; h += step, k++) {
        let u = u0 + (k % 2 ? -step * 0.9 * rnd() : 0);
        while (u < u1) {
          const len = step * (1.4 + rnd() * 1.6), ua = Math.max(u0, u), ub = Math.min(u1, u + len), hb = Math.min(h1, h + step);
          const r = rnd(), tn = r < 0.34 ? 0 : r < 0.68 ? 1 : r < 0.93 ? 2 : 3;
          if (ub - ua > 0.12) dd[tn] += G.poly3([F3(ua + 0.03, b - 0.012, h + 0.03), F3(ub - 0.03, b - 0.012, h + 0.03), F3(ub - 0.03, b - 0.012, hb - 0.03), F3(ua + 0.03, b - 0.012, hb - 0.03)]);
          u += len;
        }
      }
      dd.forEach((d, j) => push('@block.' + j, d, { op: j === 3 ? 0.55 : 0.5, detail: j > 1 }));
      // weathering: darker toward the foot (splash and soot), a pale lit lip under the coping
      push('@stone.3', G.poly3([F3(u0, b - 0.015, h0), F3(u1, b - 0.015, h0), F3(u1, b - 0.015, h0 + 1.3), F3(u0, b - 0.015, h0 + 1.3)]), { op: 0.22 });
      push('@stone.3', G.poly3([F3(u0, b - 0.015, h0), F3(u1, b - 0.015, h0), F3(u1, b - 0.015, h0 + 0.5), F3(u0, b - 0.015, h0 + 0.5)]), { op: 0.25 });
    };
    // the excavated footings of the fort's buildings in the lawn before the wall (low sandstone courses outlining rooms)
    for (const [u0, u1, b0, b1] of [[-21, -14, -11, -5], [-14, -9.5, -11, -7.5]]) for (const [a, b, c2, e] of [[u0, u1, b0, b0 + 0.5], [u0, u1, b1 - 0.5, b1], [u0, u0 + 0.5, b0, b1], [u1 - 0.5, u1, b0, b1]]) box(a, b, c2, e, 0, 0.45, '@stone');
    // the turf rampart behind the wall
    push('@turf.1', G.poly3([F3(-20, 2.2, 4.6), F3(18, 2.2, 4.6), F3(18, 7, 0.4), F3(-20, 7, 0.4)]));
    const wallH = 4.6;
    for (const [u0, u1] of [[-20, -7.6], [7.6, 18]]) {
      box(u0, u1, 0, 2.2, 0, wallH, '@stone');
      ashlar(u0, u1, 0, 0, wallH, 0.5);
      out.push({ s: '@joint', w: Math.max(0.5, kPx * 0.035), op: 0.55, d: courses(u0, u1, 0, 0, wallH, 0.5), detail: true });
      let mm = ''; for (let u = u0 + 0.4; u < u1 - 0.6; u += 1.7) mm += G.poly3([F3(u, 0, wallH), F3(u + 0.9, 0, wallH), F3(u + 0.9, 0, wallH + 1.0), F3(u, 0, wallH + 1.0)]);
      push('@stone.1', mm);
      push('@stone.2', G.poly3([F3(u0, -0.01, wallH - 0.25), F3(u1, -0.01, wallH - 0.25), F3(u1, -0.01, wallH), F3(u0, -0.01, wallH)]), { op: 0.55 });
      push('@moss', G.poly3([F3(u0, -0.01, 0), F3(u1, -0.01, 0), F3(u1, -0.01, 0.55), F3(u0, -0.01, 0.55)]), { op: 0.45 });
      // rain streaks and a few darker replaced blocks
      { let dd = ''; for (let k = 0; k < 7; k++) { const u = u0 + rnd() * (u1 - u0); dd += G.poly3([F3(u, -0.01, wallH - 0.2), F3(u + 0.25, -0.01, wallH - 0.2), F3(u + 0.15, -0.01, wallH - 1.6 - rnd() * 1.5), F3(u + 0.05, -0.01, wallH - 1.6)]); } push('@stone.2', dd, { op: 0.3 }); }
      { let dd = ''; for (let k = 0; k < 10; k++) { const u = u0 + rnd() * (u1 - u0 - 1), h = Math.floor(rnd() * 8) * 0.5; dd += G.poly3([F3(u, -0.01, h), F3(u + 1.1, -0.01, h), F3(u + 1.1, -0.01, h + 0.5), F3(u, -0.01, h + 0.5)]); } push('@stone.3', dd, { op: 0.5 }); }
      if (ivyOn) { const pts = []; for (let k = 0; k < 30; k++) { const cu = u0 + (0.2 + 0.6 * (k % 3) / 2) * (u1 - u0) + (rnd() - 0.5) * 3, h = Math.pow(rnd(), 1.6) * 3; pts.push(P(...F3(cu, -0.02, h))); } PN.lobes(G, rnd, pts, kPx * 0.12, kPx * 0.26).forEach((x, j) => push('@ivy.' + j, x, { detail: true })); }
    }
    // the gatehouse: two towers flanking twin arches; the towers stand proud and higher than the gate's front
    const gH = 6.6, tH = 8.2;
    box(-4.4, 4.4, 0.0, 4.6, 0, gH, '@stone');
    ashlar(-4.4, 4.4, 0, 0, gH, 0.5);
    out.push({ s: '@joint', w: Math.max(0.5, kPx * 0.035), op: 0.5, d: courses(-4.4, 4.4, -0.01, 0, gH, 0.5), detail: true });
    for (const [u0, u1] of [[-8.2, -4.4], [4.4, 8.2]]) {
      box(u0, u1, -0.9, 4.8, 0, tH, '@stone');
      ashlar(u0, u1, -0.9, 0, tH, 0.5);
      out.push({ s: '@joint', w: Math.max(0.5, kPx * 0.035), op: 0.55, d: courses(u0, u1, -0.91, 0, tH, 0.5), detail: true });
      // the quoins: alternate long and short dressed blocks up the tower's corners, a shade paler
      { let q = ''; for (let h = 0, k = 0; h < tH - 0.1; h += 0.5, k++) for (const [ua, ub] of [[u0, u0 + (k % 2 ? 0.55 : 0.95)], [u1 - (k % 2 ? 0.95 : 0.55), u1]]) q += G.poly3([F3(ua, -0.93, h + 0.03), F3(ub, -0.93, h + 0.03), F3(ub, -0.93, h + 0.47), F3(ua, -0.93, h + 0.47)]); push('@block.0', q, { op: 0.7 }); }
      // a slit window high in each tower and its merlons
      push('@dark', G.poly3([F3((u0 + u1) / 2 - 0.25, -0.92, 5.2), F3((u0 + u1) / 2 + 0.25, -0.92, 5.2), F3((u0 + u1) / 2 + 0.25, -0.92, 6.6), F3((u0 + u1) / 2 - 0.25, -0.92, 6.6)]));
      let mm = ''; for (let k = 0; k < 3; k++) { const ua = u0 + 0.2 + k * 1.3, ub = ua + 0.8; mm += G.poly3([F3(ua, -0.9, tH), F3(ub, -0.9, tH), F3(ub, -0.9, tH + 1.0), F3(ua, -0.9, tH + 1.0)]); }
      push('@stone.1', mm);
      push('@stone.2', G.poly3([F3(u0, -0.92, tH - 0.3), F3(u1, -0.92, tH - 0.3), F3(u1, -0.92, tH), F3(u0, -0.92, tH)]), { op: 0.6 });
      push('@moss', G.poly3([F3(u0, -0.92, 0), F3(u1, -0.92, 0), F3(u1, -0.92, 0.5), F3(u0, -0.92, 0.5)]), { op: 0.45 });
    }
    // the twin arches: dark passages, the far end's light, voussoirs and a central pier's impost
    for (const uc of [-2.1, 2.1]) {
      const r = 1.6, hs = 2.7, pts = [], ring = [];
      for (let k = 0; k <= 14; k++) { const th = Math.PI * (1 - k / 14); pts.push(F3(uc + Math.cos(th) * r, -0.01, hs + Math.sin(th) * r)); ring.push(F3(uc + Math.cos(th) * (r + 0.55), -0.02, hs + Math.sin(th) * (r + 0.55))); }
      push('@dark', G.poly3([F3(uc - r, -0.01, 0)].concat(pts, [F3(uc + r, -0.01, 0)])));
      const far = []; for (let k = 2; k <= 12; k++) { const th = Math.PI * (1 - k / 14); far.push(F3(uc + Math.cos(th) * r * 0.82, 4.6, hs * 0.8 + Math.sin(th) * r * 0.8)); }
      push('@daylight', G.poly3([F3(uc - r * 0.62, 4.6, 0)].concat(far, [F3(uc + r * 0.62, 4.6, 0)])), { op: 0.55 });
      push('@stone.0', G.poly3(ring.concat(pts.slice().reverse())));
      let vv = ''; for (let k = 1; k < 14; k++) vv += G.line3([pts[k], ring[k]]); out.push({ s: '@joint', w: Math.max(0.4, kPx * 0.03), op: 0.6, d: vv });
      push('@stone.0', G.poly3([F3(uc - 0.3, -0.03, hs + r + 0.1), F3(uc + 0.3, -0.03, hs + r + 0.1), F3(uc + 0.35, -0.03, hs + r + 0.65), F3(uc - 0.35, -0.03, hs + r + 0.65)]));
    }
    push('@stone.0', G.poly3([F3(-0.55, -0.03, 2.5), F3(0.55, -0.03, 2.5), F3(0.55, -0.03, 2.8), F3(-0.55, -0.03, 2.8)]));
    // the timber gallery over the gate: a boarded parapet with gaps between posts, braces, a shingled pent roof
    const b0 = -0.35, gt = gH + 2.3;
    push('@timber.1', G.poly3([F3(-4.4, b0, gH), F3(4.4, b0, gH), F3(4.4, b0, gH + 0.35), F3(-4.4, b0, gH + 0.35)]));
    { let boards = ''; for (let u = -4.2; u < 4.1; u += 1.45) boards += G.poly3([F3(u, b0, gH + 0.35), F3(u + 0.95, b0, gH + 0.35), F3(u + 0.95, b0, gH + 1.35), F3(u, b0, gH + 1.35)]); push('@timber.0', boards); }
    { let pp = ''; for (let u = -4.3; u <= 4.31; u += 1.45) pp += G.line3([F3(u, b0, gH), F3(u, b0, gt)]); out.push({ s: '@timber.2', w: Math.max(0.6, kPx * 0.16), d: pp }); }
    push('@shingle.0', G.poly3([F3(-4.9, b0 - 0.6, gt), F3(4.9, b0 - 0.6, gt), F3(4.9, 2.4, gt + 1.6), F3(-4.9, 2.4, gt + 1.6)]));
    push('@shingle.1', G.poly3([F3(-4.9, b0 - 0.6, gt - 0.22), F3(4.9, b0 - 0.6, gt - 0.22), F3(4.9, b0 - 0.6, gt), F3(-4.9, b0 - 0.6, gt)]));
    { let dd = ''; for (let k = 1; k < 5; k++) { const f = k / 5; dd += G.line3([F3(-4.9, b0 - 0.6 + (2.4 - b0 + 0.6) * f, gt + 1.6 * f), F3(4.9, b0 - 0.6 + (2.4 - b0 + 0.6) * f, gt + 1.6 * f)]); } out.push({ s: '@shingle.1', w: Math.max(0.4, kPx * 0.04), op: 0.6, d: dd }); }
    // lanterns either side of the arches (night)
    for (const uc of [-4.0, 4.0]) { const q = P(...F3(uc, -0.95, 3.6)), r = Math.max(1, kPx * 0.18); out.push({ f: '@timber.2', d: `M${G.R(q[0] - r)} ${G.R(q[1] - r * 1.4)}h${G.R(2 * r)}v${G.R(r * 2.6)}h${G.R(-2 * r)}z`, op: 0.85 }); lit.push({ f: '#ffcf80', glow: 'lamp', d: G.disc(q[0], q[1], r * 0.8) }); }
    return { body: out, lit };
  }
  sceneObjDefine({
    id: 'landmark.mcf-roman-gate', category: 'landmark', size: [700, 300], variants: Math.max(1, M.gates.length),
    seasonal: true, shapeBySeason: true, flippable: false, real: { h: 10.8, l: 64, w: 6 },
    palette: {
      base: { stone: ['#b8906e', '#9c7458', '#7e5a46', '#5e4234'], block: ['#caa486', '#a27a5e', '#8a6650', '#6e5446'], joint: '#4e3628', dark: '#1e1814', daylight: '#b8bcae', timber: ['#6a4a34', '#4e3628', '#3a2a20'], shingle: ['#5a4a3e', '#3a302a'],
        turf: ['#5a7a3a', '#4a6a30'], ivy: ['#2a4a24', '#3a5e2c', '#4e6e34'], moss: '#4a5a2a' },
      spring: { ivy: ['#3a6a2c', '#4e7e34', '#6a9a44'] },
      autumn: { turf: ['#7a7a3a', '#6a6a34'], ivy: ['#8a3a22', '#a85a26', '#6a4a24'] },
      winter: { turf: ['#7a806a', '#6a705c'], ivy: ['#2a3a26', '#34482c', '#405a34'], moss: '#5a6048' },
    },
    night: { glow: { lamp: '#ffcf80' }, on: 1 },
    parts: ['body', 'lit'], reflect: false, shadow: false,
    tags: ['uk', 'manchester', 'castlefield', 'roman', 'fort', 'gate', 'perspective', 'signature', 'kit:urban', 'role:landmark', 'class:landmark'],
    credit: 'drawn for the Castlefield views: the reconstructed north gate of the Roman fort of Mamucium',
    build(v, rnd, ctx) { return gate(v, rnd, (ctx && ctx.season) || 'summer'); },
  });
})();

/* ---------- structure.mcf-shipping-hole: an arched canal opening in a warehouse wall (the water runs in under it) ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCF, PN = SCENE_MCF_PEN;
  function hole(v) {
    const Hh = M.holes[v], V = M.views[Hh.view], W = V.camera.water || -0.5;
    const o = V.proj(Hh.x, Hh.d, W), G = PN.pen(V, o), out = [], kPx = G.k(Hh.x, Hh.d);
    const r = Hh.sp / 2, hs = W + Hh.crown - r, pts = [], ring = [];
    // F(u, h, b): u along the wall (to the right as seen), h up, b into the wall
    const F = Hh.plane === 'd' ? (u, h, b) => [Hh.x + u, Hh.d + (b || 0), h] : (u, h, b) => [Hh.x - (b || 0), Hh.d - u, h];
    for (let k = 0; k <= 16; k++) { const th = Math.PI * (1 - k / 16); pts.push(F(Math.cos(th) * r, hs + Math.sin(th) * r)); ring.push(F(Math.cos(th) * (r + 0.6), hs + Math.sin(th) * (r + 0.6))); }
    out.push({ f: '@dark', d: G.poly3([F(-r, W - 0.05)].concat(pts, [F(r, W - 0.05)])) });
    // inside: the barrel's soffit catching a little light, the water running in with its sheen, a moored boat's bow in the dark
    out.push({ f: '@inner', op: 0.6, d: G.poly3(pts.slice(2, 15).concat(pts.slice(2, 15).reverse().map(p => { const q = Hh.plane === 'd' ? [p[0], p[1] + 5, p[2] - 0.4] : [p[0] - 5, p[1], p[2] - 0.4]; return q; }))) });
    out.push({ f: '@sheen', op: 0.45, d: G.poly3([F(-r, W), F(r, W), F(r * 0.7, W, 8), F(-r * 0.7, W, 8)]) });
    out.push({ f: '@brick', d: G.poly3(ring.concat(pts.slice().reverse())) });
    let vv = ''; for (let k = 1; k < 16; k++) vv += G.line3([pts[k], ring[k]]); out.push({ s: '@mortar', w: Math.max(0.5, kPx * 0.03), op: 0.55, d: vv });
    out.push({ f: '@stone', d: G.poly3([F(-0.35, hs + r - 0.05), F(0.35, hs + r - 0.05), F(0.45, hs + r + 0.75), F(-0.45, hs + r + 0.75)]) });
    out.push({ f: '@stone', d: G.poly3([F(-r - 0.7, hs - 0.25), F(-r + 0.05, hs - 0.25), F(-r + 0.05, hs + 0.1), F(-r - 0.7, hs + 0.1)]) + G.poly3([F(r - 0.05, hs - 0.25), F(r + 0.7, hs - 0.25), F(r + 0.7, hs + 0.1), F(r - 0.05, hs + 0.1)]) });
    out.push({ f: '@dark', op: 0.3, d: G.poly3([F(-r - 3, W), F(r + 3, W), F(r + 3, W + 0.7), F(-r - 3, W + 0.7)]) });
    return { body: out };
  }
  sceneObjDefine({
    id: 'structure.mcf-shipping-hole', category: 'structure', size: [200, 200], variants: Math.max(1, M.holes.length),
    seasonal: false, flippable: false, real: { h: 6, l: 8, w: 1 },
    palette: { base: { dark: '#16120f', sheen: '#5a6a6a', inner: '#3a2a22', brick: '#8a4434', mortar: '#c8b49a', stone: '#c8b08a' } },
    parts: ['body'], reflect: true, shadow: false,
    tags: ['uk', 'manchester', 'castlefield', 'warehouse', 'canal', 'perspective', 'kit:urban', 'kit:water', 'role:detail', 'class:structure'],
    credit: 'drawn for the Castlefield views: the shipping holes of the Middle Warehouse',
    build(v) { return hole(v); },
  });
})();

/* ---------- structure.mcf-frame: the framing foreground (front layer, pinned at the screen's bottom-left) ----------
   'bridge' (view 3): Merchants' Bridge's own balustrade along the bottom of the frame and its hangers rising out of the top;
   'railing' (view 2): the quay's cast-iron railing receding along the towpath edge at the right. */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCF, PN = SCENE_MCF_PEN;
  function frame(v) {
    const F = M.frames[v], V = M.views[F.view], G = PN.pen(V, [0, 900]), out = [];
    const S = (s, w, d, ex) => { if (d) out.push(Object.assign({ s, w, d }, ex || {})); };
    if (F.kind === 'bridge') {
      // the deck edge (4.6 m up) on a gentle curve; the eye 1.6 m over the deck: the handrail crosses the lower frame
      const dk = 4.6, us = []; for (let x = -12; x <= 12.01; x += 1.2) us.push(x);
      const dAt = (x) => 2.6 + 0.022 * x * x;
      const top = us.map(x => [x, dAt(x), dk + 1.15]), mid = us.map(x => [x, dAt(x), dk + 0.55]), bot = us.map(x => [x, dAt(x), dk + 0.05]);
      out.push({ f: '@mesh', op: 0.16, d: G.poly3(top.concat(bot.slice().reverse())) });
      let posts = ''; for (const x of us) posts += G.line3([[x, dAt(x), dk], [x, dAt(x), dk + 1.15]]);
      S('@steel.1', 5, posts);
      S('@steel.2', 13, G.line3(top.map(p => [p[0], p[1] + 0.02, p[2] - 0.04])));
      S('@steel.0', 9, G.line3(top));
      S('@steel.1', 3, G.line3(mid));
    } else if (F.kind === 'hanger') {
      // the hangers: from the deck edge up out of the frame toward the arch leaning over the water beyond
      const dk = 4.6, dAt = (x) => 2.6 + 0.022 * x * x;
      let hg = ''; for (const x of [1.5, 4.5].map(u => u * F.side)) hg += G.line3([[x, dAt(x) + 0.05, dk + 1.2], [x * 0.55, dAt(x) + 4.5, dk + 13.5]]);
      S('@cable', 3.2, hg);
      S('@steel.0', 1.2, hg, { op: 0.6 });
    } else {
      const xs = 3.4, pts = []; for (let d = 1.6; d <= 26; d *= 1.08) pts.push(d);
      let bal = ''; for (const d of pts) bal += G.line3([[xs, d, 0], [xs, d, 1.05]]);
      S('@iron', 2.2, bal);
      S('@iron', 6, G.line3(pts.map(d => [xs, d, 1.05])) + G.line3(pts.map(d => [xs, d, 0.18])));
      S('@iron', 3, G.line3(pts.map(d => [xs, d, 0.9])));
      let spear = ''; for (const d of pts) { const q = G.P(xs, d, 1.12), r = 6 / d; if (q[1] > -1040 && q[0] < 860) spear += `M${G.R(q[0] - r)} ${G.R(q[1] + r)}L${G.R(q[0])} ${G.R(q[1] - r * 2.4)}L${G.R(q[0] + r)} ${G.R(q[1] + r)}z`; }
      if (spear) out.push({ f: '@iron', d: spear });
    }
    return { body: out };
  }
  sceneObjDefine({
    id: 'structure.mcf-frame', category: 'structure', size: [1600, 300], variants: Math.max(1, M.frames.length),
    seasonal: false, flippable: false, real: { h: 1.2, l: 20, w: 0.3 },
    palette: { base: { steel: ['#f6f4ee', '#c4c2bc', '#7a7a76'], cable: '#5a5c60', mesh: '#a8acb0', iron: '#22262a' } },
    parts: ['body'], reflect: false, shadow: false,
    tags: ['uk', 'manchester', 'castlefield', 'frame', 'perspective', 'kit:urban', 'role:frame', 'class:shrub'],
    credit: 'drawn for the Castlefield views: the bridge balustrade and the quay railing that frame the views',
    build(v) { return frame(v); },
  });
})();

/* ---------- ground.mcf-setts: the granite setts of a wharf in perspective (courses, staggered joints, worn patches), its
   coping along the water with mooring rings and squat iron bollards. Pinned in the fore layer, anchored at the coping's row
   so the life on the wharf draws over it. ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const M = SCENE_MCF, PN = SCENE_MCF_PEN;
  const SETTS = M.setts = [{ view: 'basin', x0: -12, x1: 12, d0: 5.6, d1: 8.4 }];
  function setts(v, rnd, season) {
    const S = SETTS[v], V = M.views[S.view], o = V.proj(0, S.d1, 0), G = PN.pen(V, o), out = [], kNear = G.k(0, S.d0);
    // worn and darker patches (the setts' tones)
    for (let i = 0; i < 9; i++) { const x = S.x0 * 0.4 + rnd() * (S.x1 - S.x0) * 0.4, d = S.d0 + rnd() * (S.d1 - S.d0 - 0.8), w = 0.8 + rnd() * 2.2, l = 0.4 + rnd() * 1.2; out.push({ f: i % 2 ? '@tone.0' : '@tone.1', op: 0.35, d: G.poly3([[x - w, d, 0], [x + w, d + 0.2, 0], [x + w * 0.8, d + l, 0], [x - w * 1.1, d + l * 0.8, 0]]) }); }
    // the courses, parallel to the quay edge, and their staggered joints
    let courses = '', joints = '';
    for (let d = S.d0, k = 0; d < S.d1 - 0.5; d += 0.3, k++) {
      courses += G.line3([[S.x0, d, 0], [S.x1, d, 0]]);
      const half = Math.min(S.x1, d * 0.66), step = 0.42;
      for (let x = -half + (k % 2) * step / 2; x < half; x += step) joints += G.line3([[x, d, 0], [x, d + 0.3, 0]]);
    }
    out.push({ s: '@joint', w: Math.max(0.6, kNear * 0.012), op: 0.45, d: courses });
    out.push({ s: '@joint', w: Math.max(0.5, kNear * 0.01), op: 0.35, d: joints, detail: true });
    // the coping: a granite kerb along the water with its joints, a dark wet lip, rings and bollards
    const e0 = S.d1 - 0.5, e1 = S.d1;
    out.push({ f: '@coping.0', d: G.poly3([[S.x0, e0, 0.02], [S.x1, e0, 0.02], [S.x1, e1, 0.02], [S.x0, e1, 0.02]]) });
    out.push({ f: '@coping.1', d: G.poly3([[S.x0, e1, 0.02], [S.x1, e1, 0.02], [S.x1, e1, -0.12], [S.x0, e1, -0.12]]) });
    let cj = ''; for (let x = S.x0; x < S.x1; x += 1.3) cj += G.line3([[x, e0, 0.03], [x, e1, 0.03]]);
    out.push({ s: '@joint', w: 1, op: 0.5, d: cj });
    for (const x of [-9, -3.4, 2.6, 8.4]) {
      const q = G.P(x, e0 + 0.25, 0.03), r = G.k(x, e0) * 0.11;
      out.push({ s: '@iron', w: Math.max(0.8, r * 0.35), d: G.disc(q[0], q[1], r, r * 0.45) });
    }
    for (const x of [-6.2, 5.6]) {
      const b = G.P(x, e0 + 0.1, 0), t = G.P(x, e0 + 0.1, 0.55), r = G.k(x, e0) * 0.17;
      out.push({ f: '@iron', d: `M${G.R(b[0] - r)} ${G.R(b[1])}L${G.R(t[0] - r * 0.85)} ${G.R(t[1] + r * 0.4)}Q${G.R(t[0])} ${G.R(t[1] - r * 0.5)} ${G.R(t[0] + r * 0.85)} ${G.R(t[1] + r * 0.4)}L${G.R(b[0] + r)} ${G.R(b[1])}Z` });
      out.push({ f: '@ironHi', op: 0.6, d: G.disc(t[0] - r * 0.3, t[1] + r * 0.2, r * 0.25, r * 0.5) });
    }
    void season;
    return { body: out };
  }
  sceneObjDefine({
    id: 'ground.mcf-setts', category: 'ground', size: [1600, 220], variants: SETTS.length,
    seasonal: true, shapeBySeason: false, flippable: false, real: { h: 0.5, l: 40, w: 6 },
    palette: {
      base: { tone: ['#6e6862', '#9a948a'], joint: '#4a4640', coping: ['#c6c0b2', '#3a3a36'], iron: '#1e2226', ironHi: '#6a7076' },
      spring: { tone: ['#6e6862', '#9a948a'] }, summer: { tone: ['#6e6862', '#9a948a'] }, autumn: { tone: ['#6a6058', '#8a7a62'] }, winter: { tone: ['#8a8a8a', '#b4b4b4'] },
    },
    parts: ['body'], reflect: false, shadow: false,
    tags: ['uk', 'manchester', 'castlefield', 'setts', 'wharf', 'perspective', 'kit:urban', 'role:ground', 'class:cover'],
    credit: 'drawn for the Castlefield views: the granite setts and coping of Slate Wharf',
    build(v, rnd, ctx) { return setts(v, rnd, (ctx && ctx.season) || 'summer'); },
  });
})();

/* ---------- plant.mcf-plane-bough: a London plane's bough reaching into the frame from the top-left corner (front layer,
   pinned; flip it for the right). A tapering limb with the plane's flaking bark (pale cream and olive patches), side branches,
   leaf clusters of five-lobed palmate leaves in three tones (lit tops, shaded undersides), the seed balls hanging on long
   stalks; fresh lime in spring, deep green in summer, ochre and russet in autumn, bare twigs and seed balls in winter.
   Anchor: where the bough leaves the frame's edge (0, 0). ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  const R = (v) => Math.round(v);
  /** A palmate leaf at (x, y), size L, pointing at angle a (radians): five lobes, tips and notches, integer points. */
  function leaf(x, y, L, a) {
    const pts = [], lobes = [[-1.25, 0.55], [-0.62, 0.86], [0, 1], [0.62, 0.86], [1.25, 0.55]];
    pts.push([x + Math.cos(a + 2.4) * L * 0.16, y + Math.sin(a + 2.4) * L * 0.16]);
    for (let i = 0; i < lobes.length; i++) {
      const [o, k] = lobes[i], ta = a + o * 0.9;
      pts.push([x + Math.cos(ta) * L * k, y + Math.sin(ta) * L * k]);
      if (i < lobes.length - 1) { const na = a + (o + lobes[i + 1][0]) / 2 * 0.9; pts.push([x + Math.cos(na) * L * 0.45, y + Math.sin(na) * L * 0.45]); }
    }
    pts.push([x + Math.cos(a - 2.4) * L * 0.16, y + Math.sin(a - 2.4) * L * 0.16]);
    return 'M' + pts.map(p => R(p[0]) + ' ' + R(p[1])).join('L') + 'Z';
  }
  /** A tapered limb along a cubic (p0..p3) from width w0 to w1: a polygon. */
  function limb(p, w0, w1, n, knots) {
    const at = (t) => { const u = 1 - t; return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]; };
    const L = [], Rr = [];
    for (let i = 0; i <= n; i++) {
      // the taper is not linear: a limb swells at each fork (knots) and pinches between, so it never reads as a plank
      const t = i / n, a = at(Math.max(0, t - 0.01)), b = at(Math.min(1, t + 0.01)), q = at(t), dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
      const swell = (knots || []).reduce((k, kt) => k + 0.28 * Math.exp(-Math.pow((t - kt) / 0.045, 2)), 1) * (1 + 0.05 * Math.sin(t * 23));
      const w = (w0 + (w1 - w0) * Math.pow(t, 0.8)) / 2 * swell;
      L.push([q[0] - dy / m * w, q[1] + dx / m * w]); Rr.push([q[0] + dy / m * w, q[1] - dx / m * w]);
    }
    const line = (P) => 'M' + P.map(q => R(q[0]) + ' ' + R(q[1])).join('L');
    return { d: 'M' + L.concat(Rr.slice().reverse()).map(q => R(q[0]) + ' ' + R(q[1])).join('L') + 'Z', at, under: line(L), over: line(Rr) };
  }
  function bough(v, rnd, season) {
    const body = [], leaves = [];
    const win = season === 'winter';
    // the main limb out of the corner and its side branches (each a tapered polygon), the bark's patches
    // the main limb: an S-curve (it dips, then lifts toward the light), not a straight taper
    const main = v === 0 ? [[-20, -10], [210, -30], [250, 170], [560, 120]] : [[-20, -10], [160, -10], [170, 200], [390, 210]];
    const sides = v === 0 ? [[0.18, 1.1, 150], [0.36, -0.2, 170], [0.52, 1.4, 160], [0.7, 0.3, 160], [0.86, 1.05, 140], [1, 0.4, 120]] : [[0.24, 1.15, 140], [0.45, -0.1, 160], [0.66, 1.35, 130], [0.84, 0.35, 130], [1, 0.8, 110]];
    const M0 = limb(main, 50, 12, 28, sides.map(x => x[0]).filter(t => t < 1));
    body.push({ f: '@bark.0', d: M0.d });
    body.push({ s: '@bark.1', w: 8, op: 0.6, d: M0.under });
    body.push({ s: '@bark.2', w: 4, op: 0.45, d: M0.over });
    let patches = '', olive = ''; for (let i = 1; i < 14; i++) { const q = M0.at(i / 14.5), r = 10 - i * 0.55, jx = (rnd() - 0.5) * 8, jy = (rnd() - 0.5) * 10; if (i % 3 === 2) { olive += `M${R(q[0] + jx - r)} ${R(q[1] + jy)}a${R(r)} ${R(r * 0.55)} 0 1 0 ${R(2 * r)} 0a${R(r)} ${R(r * 0.55)} 0 1 0 ${R(-2 * r)} 0z`; continue; } q[0] += jx; q[1] += jy; patches += `M${R(q[0] - r * 1.7)} ${R(q[1] - 3)}a${R(r * 1.7)} ${R(r * 0.32)} 0 1 0 ${R(3.4 * r)} 0a${R(r * 1.7)} ${R(r * 0.32)} 0 1 0 ${R(-3.4 * r)} 0z`; }
    body.push({ f: '@bark.2', op: 0.55, d: patches }); body.push({ f: '@bark.3', op: 0.5, d: olive });
    const tips = [];
    for (const [t, ang, len] of sides) {
      const p = M0.at(t), q = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len], c1 = [p[0] + Math.cos(ang - 0.35) * len * 0.35, p[1] + Math.sin(ang - 0.35) * len * 0.35], c2 = [p[0] + Math.cos(ang + 0.2) * len * 0.7, p[1] + Math.sin(ang + 0.2) * len * 0.7];
      const B = limb([p, c1, c2, q], 18 - t * 7, 3, 8, [0.55]);
      body.push({ f: '@bark.1', d: B.d });
      body.push({ s: '@bark.2', w: 1.6, op: 0.35, d: B.over });
      tips.push([q, ang, len]);
      // a fork two-thirds out: the branch splits (a plane's limbs divide again and again)
      const fp = B.at(0.55), fa = ang + (rnd() < 0.5 ? -0.7 : 0.7), fl = len * 0.55, fq = [fp[0] + Math.cos(fa) * fl, fp[1] + Math.sin(fa) * fl];
      const F = limb([fp, [fp[0] + Math.cos(fa) * fl * 0.4, fp[1] + Math.sin(fa) * fl * 0.4], [fq[0] - Math.cos(fa + 0.3) * fl * 0.3, fq[1] - Math.sin(fa + 0.3) * fl * 0.3], fq], 6, 2, 5);
      body.push({ f: '@bark.1', d: F.d });
      tips.push([fq, fa, fl * 0.8]);
    }
    // twigs and the leaf clusters at the tips (none in winter: bare twigs, the seed balls hanging on)
    let twigs = '', stalks = '', balls = '';
    const tones = ['', '', ''], fine = ['', '', ''];
    for (const [q, ang, len] of tips) {
      for (let k = 0; k < 4; k++) { const a = ang + (rnd() - 0.5) * 1.6, l = len * (0.3 + rnd() * 0.35); twigs += `M${R(q[0] - Math.cos(ang) * len * 0.3)} ${R(q[1] - Math.sin(ang) * len * 0.3)}l${R(Math.cos(a) * l)} ${R(Math.sin(a) * l)}`; }
      for (let k = 0; k < 2; k++) { const s = [q[0] + (rnd() - 0.5) * 50, q[1] + (rnd() - 0.3) * 30], e = [s[0] + (rnd() - 0.5) * 10, s[1] + 34 + rnd() * 30]; stalks += `M${R(s[0])} ${R(s[1])}Q${R(s[0] + 5)} ${R((s[1] + e[1]) / 2)} ${R(e[0])} ${R(e[1])}`; balls += `M${R(e[0] - 6)} ${R(e[1])}a6 6 0 1 0 12 0a6 6 0 1 0 -12 0z`; }
      if (win) continue;
      // a cluster: big leaves on the outside, small ones inside; tones by height in the cluster (lit above, shade below)
      const nL = Math.round(14 + len * 0.16), rad = 40 + len * 0.36;
      for (let i = 0; i < nL; i++) {
        const r = Math.sqrt(rnd()) * rad, a = rnd() * Math.PI * 2, x = q[0] + Math.cos(a) * r * 1.2, y = q[1] + Math.sin(a) * r * 0.85 + 12;
        const tone = y < q[1] - 18 ? 1 : y > q[1] + 26 ? 2 : 0, L = r > rad * 0.6 ? 23 + rnd() * 9 : 15 + rnd() * 7;
        const d = leaf(x, y, L, Math.PI / 2 + (rnd() - 0.5) * 2.2);
        if (r > rad * 0.6) tones[tone] += d; else fine[tone] += d;
      }
    }
    // leaf sprays hanging along the main limb (they hide stretches of it, so it reads as a branch in leaf, not a bare beam)
    if (!win) for (const t of v === 0 ? [0.3, 0.46, 0.62, 0.8] : [0.36, 0.56, 0.76]) {
      const q = M0.at(t);
      for (let i = 0; i < 16; i++) {
        const r = Math.sqrt(rnd()) * 54, a = rnd() * Math.PI * 2, x = q[0] + Math.cos(a) * r * 1.3, y = q[1] + Math.abs(Math.sin(a)) * r * 0.9 + 10;
        const tone = y > q[1] + 34 ? 2 : i % 3 === 0 ? 1 : 0, d = leaf(x, y, 15 + rnd() * 9, Math.PI / 2 + (rnd() - 0.5) * 1.8);
        (r > 32 ? tones : fine)[tone] += d;
      }
    }
    leaves.push({ s: '@bark.1', w: 3, cap: 'round', d: twigs });
    if (win) leaves.push({ s: '@bark.1', w: 1.4, op: 0.7, d: twigs.replace(/l(-?\d+) (-?\d+)/g, (m, a, b) => `l${R(a * 1.6)} ${R(b * 1.6)}`) });
    fine.forEach((d, j) => d && leaves.push({ f: '@leaf.' + j, d, detail: true }));
    tones.forEach((d, j) => d && leaves.push({ f: '@leaf.' + j, d }));
    leaves.push({ s: '@bark.1', w: 1.2, d: stalks, detail: true });
    leaves.push({ f: '@seed', d: balls });
    return { body, leaves };
  }
  sceneObjDefine({
    id: 'plant.mcf-plane-bough', category: 'plant', size: [700, 420], variants: 2, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 5, l: 8, w: 3 },
    palette: {
      base: { bark: ['#6e685a', '#3e3a30', '#cdc8a2', '#8a8a5a'], leaf: ['#4a7a30', '#6a9a44', '#2e5626'], seed: '#6a5a3a' },
      spring: { leaf: ['#86b04e', '#a4c862', '#628e3a'] },
      autumn: { leaf: ['#b8862e', '#d4a440', '#8a5226'], seed: '#5a4a30' },
      winter: { bark: ['#6a665a', '#3a3830', '#bab69a', '#7a7a5a'], seed: '#4e422e' },
    },
    parts: ['body', 'leaves'], anim: { sway: { part: 'leaves', pivot: [0, 0], deg: 0.8 } }, reflect: false, shadow: false,
    tags: ['uk', 'manchester', 'plane', 'bough', 'frame', 'kit:urban', 'kit:temperate', 'role:frame', 'class:shrub'],
    credit: 'drawn for the Castlefield views: a London plane bough framing the view',
    build(v, rnd, ctx) { return bough(v, rnd, (ctx && ctx.season) || 'summer'); },
  });
})();

/* ---------- street.mcf-litter-bin: the city centre's black steel litter bin (a slotted drum on a plinth, a gold band, the
   domed lid with its posting mouth); v1 with a bag of rubbish beside it. Anchor: the middle of its foot. ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function') return;
  sceneObjDefine({
    id: 'street.mcf-litter-bin', category: 'street', size: [40, 64], variants: 2, seasonal: false, flippable: true,
    real: { h: 1.05, w: 0.6 },
    palette: { base: { steel: ['#26282c', '#3a3e44', '#15171a'], band: '#b8963e', mouth: '#0c0c0e', bag: ['#2e3238', '#4a5058'] } },
    parts: ['body'], reflect: false,
    tags: ['uk', 'manchester', 'street', 'litter-bin', 'bin', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Castlefield views: a city-centre litter bin',
    build(v) {
      const b = [];
      b.push({ f: '@steel.2', d: 'M-13 0h26v-4h-26z' });
      b.push({ f: '@steel.0', d: 'M-11 -4L-12 -46H12L11 -4z' });
      b.push({ f: '@steel.1', op: 0.8, d: 'M-11 -4L-12 -46H-5L-5 -4z' });
      b.push({ s: '@steel.2', w: 1.2, op: 0.7, d: 'M-2 -8V-40M3 -8V-40M8 -8V-40' });
      b.push({ f: '@band', d: 'M-12 -40H12V-36H-12z' });
      b.push({ f: '@steel.0', d: 'M-13 -46Q-13 -56 0 -57Q13 -56 13 -46z' });
      b.push({ f: '@mouth', d: 'M-7 -50Q0 -54 7 -50V-47H-7z' });
      if (v === 1) b.push({ f: '@bag.0', d: 'M12 0Q11 -11 16 -15Q21 -13 22 -8Q24 -3 21 0z' }, { f: '@bag.1', op: 0.7, d: 'M15 -14q2 -3 4 0' });
      return { body: b };
    },
  });
})();
