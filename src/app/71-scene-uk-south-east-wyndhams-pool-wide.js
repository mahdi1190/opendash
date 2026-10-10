/* ============================================================
   COMPOSED SCENE uk-south-east / Wyndham's Pool, view 1 (wide)
   docs/dev/SCENE_ENGINE.md sections 3, 15 and 17 (the convert stage).

   The rich hand-drawn view (72-anim-pack-uk-south-east-wyndhams-pool-v1.js,
   kept there as legacySvg) rebuilt from the object library, so the canvas
   renderer bakes it: dense static detail in a few layer bitmaps and a
   measured number of movers. ONE auto-season scene serves the view's four
   seasonal items (the date picks the season, the live sky the light).

   The place: Wyndham's Pool, the largest pond on Yateley Common (Yateley
   Common Country Park, Hampshire), a man-made pool ringed by silver birch
   and Scots pine with oak behind; reed and rush margins, lily pads in the
   sheltered bays; a coarse fishery with wooden swims on the bank; mute
   swans, mallard, coot, moorhen, great crested grebe and a grey heron.
   Sources: hants.gov.uk (Yateley Common Country Park), hwas.co.uk.
   The wide view looks south-west across the open water from the bank path:
   a wooded spit with a tall veteran pine on the left, the birch bank on the
   right, the far shore's birch, pine and oak mirrored in the water.

   This file also holds sceneUkWyndhamsPoolKit(), the helpers the four view
   files share (the far-wood skyline, single placements, the tint rule, the
   palette and the layers).

   PURE: defines functions only; each runs once (through the item's thunk)
   when the scene is shown, linted or sheeted.
   ============================================================ */
/**
 * The views' ground movers (user request, 10 Oct: the animation overhaul): built by the behaviour presets (sceneBehave,
 * 70-scene-lib-behaviours.js) in ground metres, so the water birds sit on open water clear of the banks, the walkers keep to
 * the bank path round the stones, everything is its real size at its depth, and every route goes out and back (no jumps).
 * These views are v1 (pixel) scenes: the routes are authored as screen points and laid on the ground through the view's own
 * camera { eye, fov, horizon } (the eye the scene's people are drawn from), the open water as a screen polygon.
 *   view: data.view; eye: metres; water: [[[X, Y], ...]] the open water; specs: [{ obj, preset, px: [[X, Y], ...] | route,
 *   kind: 'dog' (a walker and an off-lead dog) | 'pair', layer, seed, offset, variant }]
 */
function sceneUkWyndhamsPoolMovers(view, eye, water, specs) {
  if (typeof sceneBehave === 'undefined') return [];
  const f = 800 / Math.tan(view.fov * Math.PI / 360), hor = view.horizon;
  const toM = ([X, Y]) => { const d = f * eye / Math.max(1.5, Y - hor); return [Math.round((X - 800) * d / f * 100) / 100, Math.round(d * 100) / 100]; };
  const proxy = { id: 'wyndhams-pool', camera: { eye, fov: view.fov, horizon: hor, x0: 800 }, water: water.map(P => ({ poly: P.map(toM) })), place: [] };
  const out = [];
  for (const s of specs) {
    // no dive or dabble stops: their hidden legs (drawn off-screen) read as a dash across the bank to the motion lint
    const acts = s.acts != null ? s.acts : { duck: ['look', 'preen', 'look'], coot: ['look', 'preen'], grebe: ['look', 'preen'], moorhen: ['look'] }[s.preset];
    // the small water birds' drawn figures fill less of their boxes than the swan's: k brings them to their real size
    const k = s.k || { duck: 1.42, coot: 1.42, moorhen: 1.5, grebe: 1.4, swan: 0.86, 'heron-stalk': 1.28 }[s.preset];
    const spec = Object.assign({}, s, { route: s.route || s.px.map(toM) }, acts ? { acts } : {}, k ? { k } : {});
    delete spec.px; delete spec.kind;
    if (s.kind === 'dog') {
      // the dog's cycle ends where it began (a closed loop on the walker's clock, not a pingpong of double length)
      const [w, dog] = sceneBehave.walkWithDog(proxy, spec), P = dog.path, a = P[0], b = P[P.length - 1];
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 0.05) { b[2] = 0; P.push([a[0], a[1], 0, 0, 0.25]); }
      // and lasts exactly the walker's cycle, so the pair never drift apart
      const cyc = (Q) => Q.reduce((t, q) => t + (q[2] || 0) + (q[4] || 0), 0), gap = cyc(w.path) - cyc(P);
      if (gap > 0) P[P.length - 1][2] = Math.round(((P[P.length - 1][2] || 0) + gap) * 100) / 100;
      out.push(w, dog);
    }
    else if (s.kind === 'pair') out.push(...sceneBehave.pair(proxy, spec));
    else out.push(...sceneBehave.actors(proxy, spec));
  }
  for (const a of out) delete a.$behave;
  return out;
}

function sceneUkWyndhamsPoolKit() {
  /** A woodland skyline: crowns of uneven size along y, filled down to foot (seeded, deterministic). */
  const crowns = (seed, y, amp, foot, x0 = -160, x1 = 1760, w0 = 26, w1 = 70) => {
    const r = sceneRnd(seed);
    let x = x0, d = `M${x0} ${foot}V${y}`;
    while (x < x1) { const w = w0 + r() * (w1 - w0), h = 6 + r() * amp, j = Math.round(r() * 8 - 4); d += `c${Math.round(w * 0.1)} ${-Math.round(h * 1.4)} ${Math.round(w * 0.9)} ${-Math.round(h * 1.4)} ${Math.round(w)} ${j}`; x += w; }
    return `${d}V${foot}H${x0}Z`;
  };
  /** One object as a one-placement scatter rule: placed exactly, but dropped from small tiles by the LOD like any scatter. */
  const one = (obj, x, y, s, variant, layer, seed, flip, anim) => ({ obj, layer, seed, area: { rect: [x - 0.5, y - 0.5, x + 0.5, y + 0.5] }, n: 1, s: [s, s], flip: flip ? 1 : 0, variant, anim: anim === false ? false : undefined });
  /** The tint rule that breaks up a stamp (two buckets: plain and 8 % toward col). */
  const T = (col) => ({ col, k: [0, 0.1] });
  const palette = {
    base: { pine: ['#4a6a5a', '#2e4a3a'], hill: ['#6f8f6a', '#56785a'], shore: ['#4a6a3e', '#3a5232'], bank: ['#4f7a34', '#7a6648'], near: ['#6a8a42', '#8a7550'], path: ['#b39a70', '#d2ba8e'], verge: ['#5f8f3a', '#4a6e30'], mud: ['#6a5a44', '#4e4232'] },
    spring: { hill: ['#7a9c6c', '#5f8a5a'], shore: ['#567a3a', '#40602e'], bank: ['#5f8f3a', '#8a7553'], near: ['#6f9f40', '#8a7553'], path: ['#a99069', '#cbb48a'], verge: ['#6f9f40', '#4c7a37'] },
    summer: { hill: ['#628a62', '#4f7553'], shore: ['#46703a', '#36562c'], bank: ['#4f7f34', '#8c7651'], near: ['#5f8f3a', '#8c7651'], path: ['#ad936a', '#d2ba8e'], verge: ['#5f8f3a', '#3f6b31'] },
    autumn: { hill: ['#a0844a', '#8a6a3c'], shore: ['#7a6e36', '#5e5428'], bank: ['#8a8a45', '#7d6247'], near: ['#8a8a45', '#7d6247'], path: ['#9e7f5a', '#c4a57c'], verge: ['#8a8a45', '#5f6a35'] },
    winter: { pine: ['#4a625c', '#2c443c'], hill: ['#7e7682', '#686270'], shore: ['#5e5c4e', '#4a4a3e'], bank: ['#8d9277', '#7a6a58'], near: ['#8d9277', '#7a6a58'], path: ['#9a8a76', '#c4b8a6'], verge: ['#8d9277', '#6b735a'], mud: ['#7a7064', '#5e564c'] },
  };
  // near, fore and front share haze 0, so a sprite drawn in all three is one sprite (the SVG still's size)
  const layers = [
    { id: 'horizon', depth: 0.08, haze: 0.3 },
    { id: 'far', depth: 0.2, haze: 0.14 },
    { id: 'mid', depth: 0.45, haze: 0.05 },
    { id: 'near', depth: 0.75, haze: 0 },
    { id: 'fore', depth: 1, haze: 0 },
    { id: 'front', depth: 1.25, haze: 0 },
  ];
  const sky = (n) => ({ stars: 200, clouds: { n: n || 6, y: [30, 320], speed: 5 }, sunR: 26, moonR: 20 });
  /** The far shore's woods: three bands of distant pine, birch and broadleaf (horizon, far, mid), the mid band at the waterline. */
  const farWoods = (y0, seed) => [
    { obj: { 'tree.far-pine': 3, 'tree.far-broad': 5 }, layer: 'horizon', seed: seed, area: { rect: [-140, y0 - 40, 1740, y0 - 24] }, n: 70, minGap: 18, s: [0.24, 0.36], flip: 0.5, variant: 0, anim: false },
    { obj: { 'tree.far-pine': 3, 'tree.far-birch': 2, 'tree.far-broad': 5 }, layer: 'far', seed: seed + 1, area: { rect: [-140, y0 - 18, 1740, y0 - 4] }, n: 115, minGap: 13, s: [0.36, 0.62], flip: 0.5, variant: 'random', tint: T('#6a7a50'), anim: false },
    // the tall Scots pines that stand above the far wood (the skyline of the pool)
    { obj: 'tree.far-pine', layer: 'far', seed: seed + 3, area: { rect: [-100, y0 - 14, 1700, y0 - 6] }, n: 7, minGap: 140, s: [0.62, 0.86], flip: 0.5, variant: 'random', mask: { noise: { scale: 300, cut: 0.25 } }, anim: false },
    { obj: { 'tree.far-birch': 3, 'tree.far-broad': 4 }, layer: 'mid', seed: seed + 2, area: { rect: [-120, y0 + 1, 1720, y0 + 9] }, n: 50, minGap: 18, s: [0.42, 0.66], flip: 0.5, variant: 1, anim: false },
  ];
  /** A lobed woodland skyline (after the Wyndham's Pool proof): every lobe its own width and height, Scots pines standing
   *  out of it on bare trunks (sink: an object that takes the crowns' path as .tiers, to fill in pine green), each crown two to four flat, ragged tiers set off to either side (never one round cap on a
   *  stick); filled down to foot. Never a straight band. */
  const canopy = (base, seed, hMin, hMax, pine, foot, sink) => {
    const r = sceneRnd(seed), R1 = v => Math.round(v * 10) / 10;
    /** one flat, ragged needle tier centred (cx, cy), rx by ry, drawn clockwise like the skyline (so the fill unites them) */
    const tier = (cx, cy, rx, ry) => {
      const nn = 7, pts = [];
      for (let i = 0; i < nn; i++) { const a = Math.PI * 2 * i / nn + r() * 0.3, kk = 0.8 + r() * 0.35; pts.push([cx + Math.cos(a) * rx * kk, cy + Math.sin(a) * ry * kk * (Math.sin(a) > 0 ? 0.7 : 1.15)]); }
      let s = `M${R1(pts[0][0])} ${R1(pts[0][1])}`;
      for (let i = 1; i <= nn; i++) { const p = pts[(i - 1) % nn], q = pts[i % nn], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, ox = mx - cx, oy = my - cy, l = Math.hypot(ox, oy) || 1, b = 0.25 + r() * 0.35; s += `Q${R1(mx + ox / l * rx * b * 0.5)} ${R1(my + oy / l * ry * b * 0.5)} ${R1(q[0])} ${R1(q[1])}`; }
      return s + 'Z';
    };
    let d = `M-170 ${foot}V${base}`, x = -170, tiers = '';
    while (x < 1770) {
      const w = 14 + r() * 40, h = hMin + Math.pow(r(), 1.6) * (hMax - hMin), y1 = base - h;
      if (r() < pine) {
        // the bare trunk up out of the wood, then the crown: a top tier and one to three lower tiers out to the sides
        const tx = x + w / 2, top = y1 - 16 - r() * 28, cw = 9 + r() * 12, lean = (r() - 0.5) * 6, tw = 0.9 + r() * 0.6;
        d += `L${R1(tx - tw)} ${R1(y1 + 4)}L${R1(tx - tw * 0.6 + lean)} ${R1(top + 3)}L${R1(tx + tw * 0.6 + lean)} ${R1(top + 3)}L${R1(tx + tw)} ${R1(y1 + 4)}`;
        tiers += tier(tx + lean + (r() - 0.5) * cw * 0.5, top, cw, 3 + r() * 3);
        const nt = 1 + Math.floor(r() * 3);
        let sd = r() < 0.5 ? -1 : 1;
        for (let i = 0; i < nt; i++) {
          const ty = top + (i + 1) * (5 + r() * 5);
          if (ty > y1 - 2) break;
          const f = (ty - top) / Math.max(1, y1 - top), tcx = tx + lean * (1 - f) + sd * cw * (0.35 + r() * 0.45);
          tiers += tier(tcx, ty, cw * (0.45 + r() * 0.35), 2.4 + r() * 2.4);
          sd = -sd;
        }
      } else d += `Q${R1(x + w * 0.1)} ${R1(y1 - h * 0.25)} ${R1(x + w * 0.5)} ${R1(y1 - h * 0.3)}Q${R1(x + w * 0.95)} ${R1(y1 - h * 0.2)} ${R1(x + w)} ${R1(base - h * (0.3 + r() * 0.5))}`;
      x += w * (0.6 + r() * 0.35);
    }
    if (sink) { sink.tiers = tiers; return d + `L1770 ${base}V${foot}Z`; }   // the pine crowns drawn apart, in their own green
    return d + `L1770 ${base}V${foot}Z` + tiers;
  };
  /** The far shore at waterline WL: three lobed skylines (no stamps), then real trees in GROUPS with gaps between them:
   *  stands of tall Scots pine, birch clumps, oak and mixed wood, an open heathy gap now and then. `hide` lists x ranges
   *  a near tree already covers (no far trees drawn there). Returns { ground, scatter }. */
  const farShore = (WL, seed, o = {}) => {
    const k = o.k || 1, hide = o.hide || [], r = sceneRnd(seed + 900), sc = [];
    const hz = {}, fz = {};
    const ground = [
      { layer: 'horizon', d: canopy(WL - 40 * k, seed, 14 * k, 50 * k, 0.18, WL + 4, hz), fill: { lin: [[0, '@hill.0'], [1, '@hill.1']], x1: 0, y1: WL - 90 * k, x2: 0, y2: WL } },
      { layer: 'horizon', d: hz.tiers, fill: '@pine.0' },
      { layer: 'far', d: canopy(WL - 18 * k, seed + 1, 10 * k, 42 * k, 0.18, WL + 4, fz), fill: { lin: [[0, '@shore.0'], [1, '@shore.1']], x1: 0, y1: WL - 60 * k, x2: 0, y2: WL } },
      { layer: 'far', d: fz.tiers, fill: '@pine.1' },
      { layer: 'mid', d: canopy(WL - 2, seed + 2, 3 * k, 16 * k, 0, WL + 6), fill: { lin: [[0, '@shore.1'], [1, '@mud.0']], x1: 0, y1: WL - 20 * k, x2: 0, y2: WL + 6 } },
    ];
    let x = -120, n = 0;
    while (x < 1740) {
      const pick = r(), cx = x, hidden = hide.some(([a, b]) => cx > a && cx < b);
      if (!hidden) {
        if (pick < 0.3) {         // a stand of Scots pine: two to four, uneven heights, one usually taller
          const m = 2 + Math.floor(r() * 3);
          for (let i = 0; i < m; i++) sc.push(one('tree.pool-pine', cx + i * (18 + r() * 30) * k, WL + 2 + r() * 6, (0.22 + r() * 0.15 + (i === 1 ? 0.07 : 0)) * k, Math.floor(r() * 3), 'far', seed + 10 + n++, r() < 0.5, false));
        } else if (pick < 0.57) { // a birch clump
          const m = 2 + Math.floor(r() * 3);
          for (let i = 0; i < m; i++) sc.push(one(r() < 0.7 ? 'tree.birch-heath' : 'tree.pool-birch', cx + i * (12 + r() * 18) * k, WL + 3 + r() * 5, (0.2 + r() * 0.12) * k, Math.floor(r() * 3), 'far', seed + 10 + n++, r() < 0.5, false));
        } else if (pick < 0.8) {  // a broadleaf group: a big oak, a smaller oak or a birch beside it, sallow scrub at the water in front
          const big = 0.34 + r() * 0.26, fl = r() < 0.5;
          sc.push(one('tree.wyv-far-oak', cx + (14 + r() * 36) * k, WL + 3 + r() * 2, big * k, r() < 0.6 ? 0 : 2, 'far', seed + 10 + n++, fl, false));
          if (r() < 0.75) sc.push(one(r() < 0.6 ? 'tree.wyv-far-oak' : 'tree.birch-heath', cx + (fl ? -(26 + r() * 34) : 76 + r() * 50) * k, WL + 2 + r() * 3, (r() < 0.5 ? 0.3 : 0.24) * k, r() < 0.5 ? 1 : 3, 'far', seed + 10 + n++, r() < 0.5, false));
          if (r() < 0.7) sc.push(one('tree.wyv-far-sallow', cx + (10 + r() * 60) * k, WL + 6 + r() * 2, (0.24 + r() * 0.12) * k, Math.floor(r() * 2), 'far', seed + 10 + n++, r() < 0.5, false));
        } else if (pick < 0.92) { // a lone oak, now and then just sallow scrub
          if (r() < 0.75) sc.push(one('tree.wyv-far-oak', cx, WL + 4 + r() * 3, (0.26 + r() * 0.2) * k, Math.floor(r() * 4), 'far', seed + 10 + n++, r() < 0.5, false));
          else sc.push(one('tree.wyv-far-sallow', cx, WL + 6, (0.22 + r() * 0.1) * k, Math.floor(r() * 2), 'far', seed + 10 + n++, r() < 0.5, false));
        }                         // else: an open gap, the heath showing through
      }
      x += (44 + r() * 90) * k;
    }
    // gorse and heather at the far water's edge, in clumps (the mask breaks the run)
    sc.push({ obj: { 'plant.gorse': 1, 'plant.heather': 2 }, layer: 'mid', seed: seed + 5, area: { rect: [-160, WL, 1760, WL + 6] }, n: 40, minGap: 20, s: [0.12 * k, 0.22 * k], flip: 0.5, variant: 'random', mask: { noise: { scale: 220, cut: 0.45 } }, anim: false });
    return { ground, scatter: sc };
  };
  return { crowns, one, T, palette, layers, sky, farWoods, canopy, farShore };
}

function sceneUkWyndhamsPoolWide() {
  const { one, T, palette, layers, sky, farShore } = sceneUkWyndhamsPoolKit();
  const AREA = (pts) => ({ poly: pts });
  const WL = 508;
  const far = farShore(WL, 21, { hide: [[-200, 120], [1640, 1800]] });
  // the movers' ground: the view, the eye the scene is drawn from (a low bank; the angler, the swim and the heath birds are
  // drawn to it), the open water between the
  // spit, the right bank and the near reeds, and the bank path's centre line
  const VIEW = { lat: 51.332, lon: -0.822, heading: 222, fov: 82, horizon: 470, lift: 1 }, EYE = 5;
  const OPEN = [[[300, 516], [1390, 516], [1404, 600], [1392, 660], [1420, 740], [1440, 784], [640, 794], [262, 794], [300, 720], [282, 650], [220, 590], [140, 560]]];
  const PATH = [[450, 900], [560, 874], [700, 860], [900, 846], [1100, 840], [1350, 836], [1700, 832]];
  return {
    v: 1,
    id: 'wyndhams-pool-1',
    view: VIEW,
    at: 'afternoon',
    season: 'auto',
    setting: 'natural',
    signage: false,
    sky: sky(7),
    palette,
    layers,
    ground: [
      // the far shore: lobed woods with Scots pines standing out of them (no stamps in a row)
      ...far.ground,
      // the wooded spit on the left and the birch bank on the right
      { layer: 'near', d: 'M-160 528Q40 534 150 572Q250 610 292 664Q330 724 250 800H-160Z', fill: { lin: [[0, '@bank.0'], [1, '@bank.1']], x1: 0, y1: 530, x2: 0, y2: 800 } },
      { layer: 'near', d: 'M1760 522Q1600 530 1500 556Q1410 590 1394 640Q1384 704 1460 790H1760Z', fill: { lin: [[0, '@bank.0'], [1, '@bank.1']], x1: 0, y1: 522, x2: 0, y2: 790 } },
      // the spit's sandy scar where the anglers walk out
      { layer: 'near', d: 'M120 600Q180 612 232 652Q252 690 226 720Q200 690 170 650Q140 620 120 600Z', fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: 600, x2: 0, y2: 720 } },
      // the near bank, and the sandy path: it comes in at the bottom and sweeps right along the water (the leading line)
      { layer: 'fore', d: 'M-160 806Q240 782 640 800T1300 796T1760 790V900H-160Z', fill: { lin: [[0, '@near.0'], [1, '@near.1']], x1: 0, y1: 790, x2: 0, y2: 900 } },
      { layer: 'fore', d: 'M330 912Q420 872 610 850Q900 826 1300 828Q1560 828 1760 822V848Q1520 852 1240 858Q900 866 760 884Q690 898 676 912Z', fill: { lin: [[0, '@path.0'], [1, '@path.1']], x1: 0, y1: 822, x2: 0, y2: 912 } },
      { layer: 'fore', d: 'M560 870Q700 852 900 846Q760 860 700 872Z', fill: '@path.1' },
      // the framing foreground: the heath rises into banks either side of the path (the path drops between them)
      { layer: 'front', d: 'M-160 706Q-40 704 70 738Q190 782 268 846Q318 884 336 912H-160Z', fill: { lin: [[0, '@near.0'], [1, '@mud.1']], x1: 0, y1: 706, x2: 0, y2: 912 } },
      { layer: 'front', d: 'M1760 726Q1630 736 1530 790Q1446 836 1398 878Q1370 898 1360 912H1760Z', fill: { lin: [[0, '@near.0'], [1, '@mud.1']], x1: 0, y1: 726, x2: 0, y2: 912 } },
    ],
    water: [
      { layer: 'mid', d: `M-160 ${WL + 4}Q260 ${WL - 2} 700 ${WL + 6}T1760 ${WL + 2}V804Q1300 810 640 814Q240 798 -160 820Z`, y0: WL + 2, y1: 860, base: ['#7c9a8c', '#3a5e56', '#1c3a36'], reflect: true, shimmer: 36, lightPath: true },
    ],
    place: [
      // the pool's signature: the tall veteran Scots pine leaning out from the spit
      { obj: 'tree.pool-pine', x: 46, y: 648, s: 1.06, layer: 'near', variant: 0, seed: 37 },
      { obj: 'ground.log', x: 1556, y: 782, s: 0.42, layer: 'near', variant: 0, seed: 45 },
      // a dead branch in the shallows off the spit, and the kingfisher that uses it
      { obj: 'tree.wyv-snag', x: 404, y: 664, s: 0.62, layer: 'mid', variant: 0, seed: 53 },
      { obj: 'bird.wp-kingfisher-perch', x: 425, y: 571, s: 0.8, layer: 'mid', seed: 54 },
      { obj: 'animal.squirrel', x: 1600, y: 566, s: 0.8, layer: 'near', variant: 0, seed: 49, flip: true },
      { obj: 'bird.robin', x: 1572, y: 770, s: 0.35, layer: 'near', variant: 0, seed: 50 },
      // the angler's swim on the near bank
      { obj: 'ground.swim', x: 1086, y: 806, s: 1.79, layer: 'fore', variant: 0, seed: 51 },
      { obj: 'person.angler', x: 1074, y: 798, s: 1.5, layer: 'fore', variant: 0, seed: 52, flip: true },
      // a Dartford warbler on the gorse top (Yateley Common is one of its strongholds), a stonechat on the bracken
      { obj: 'bird.dartford-warbler', x: 262, y: 806, s: 0.31, layer: 'front', seed: 55 },
      { obj: 'bird.stonechat', x: 1536, y: 838, s: 0.37, layer: 'front', variant: 1, seed: 56, flip: true },
      // framing: a silver birch bough hanging into the top right
      { obj: 'tree.wyv-birch-bough', x: 1640, y: -14, s: 0.9, layer: 'front', variant: 0, seed: 57, flip: true, pin: true },
      // dusk: mist lying on the water (drawn only after real dusk)
      { obj: 'sky.wp-mist', x: 520, y: WL - 4, s: 1.0, layer: 'mid', variant: 0, pin: true, anim: false },
      { obj: 'sky.wp-mist', x: 1180, y: WL - 2, s: 1.1, layer: 'mid', variant: 1, flip: true, pin: true, anim: false },
    ],
    scatter: [
      ...far.scatter,
      { obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 4, area: { rect: [-160, WL, 1760, WL + 8] }, n: 70, minGap: 14, s: [0.2, 0.3], flip: 0.5, variant: 0, mask: { noise: { scale: 240, cut: 0.4 } }, anim: false },
      // lily pads in the two sheltered bays (a few bob on the ripples), rising fish
      { obj: 'water.lily', layer: 'mid', seed: 5, area: { poly: [[120, 600], [560, 590], [580, 690], [140, 700]] }, n: 30, minGap: 22, s: [0.32, 0.5], sByY: [[590, 0.8], [700, 1.15]], flip: 0.5, variant: [0, 1], tint: T('#a0a050'), mask: { noise: { scale: 120, cut: 0.35 } }, anim: false },
      { obj: 'water.lily', layer: 'mid', seed: 6, area: { poly: [[1020, 556], [1330, 552], [1340, 604], [1030, 608]] }, n: 14, minGap: 22, s: [0.28, 0.42], flip: 0.5, variant: [0, 1], anim: false },
      one('water.fish-ring', 430, 700, 0.5, 0, 'mid', 8), one('water.fish-ring', 640, 690, 0.5, 1, 'mid', 9), one('water.fish-ring', 905, 572, 0.32, 0, 'mid', 10, 1),
      one('water.fish-ring', 1060, 724, 0.55, 1, 'mid', 11, 1), one('water.fish-ring', 1250, 640, 0.42, 0, 'mid', 12),
      // the near trees: a second pine and birches on the banks, an oak at the water
      one('tree.pool-pine', 1716, 700, 0.92, 1, 'near', 44, 1, false),
      one('tree.pool-birch', 176, 632, 0.9, 0, 'near', 38, 0),
      one('tree.pool-birch', 244, 690, 0.6, 2, 'near', 39, 1, false),
      one('tree.pool-birch', 1502, 612, 1.0, 1, 'near', 42, 1),
      one('tree.pool-birch', 1588, 652, 0.84, 2, 'near', 43, 0, false),
      one('tree.canal-oak', 1420, 652, 0.5, 1, 'near', 41, 0, false),
      one('plant.holly', 100, 650, 0.6, 0, 'near', 58, 0, false),
      // heath on the spit and the right bank: heather and gorse mounds, fern
      one('plant.wyv-heath-bank', 60, 744, 0.8, 0, 'near', 59, 0, false), one('plant.wyv-heath-bank', 210, 790, 0.7, 1, 'near', 60, 1, false),
      one('plant.wyv-heath-bank', 1500, 726, 0.7, 2, 'near', 61, 0, false), one('plant.wyv-heath-bank', 1660, 776, 0.85, 0, 'near', 62, 1, false),
      one('plant.fern', 84, 762, 0.7, 1, 'near', 46, 0, false),
      // the banks' water edge: grassy and stony margins
      one('water.edge', 120, 798, 0.7, 0, 'fore', 22, 0, false),       one('water.edge', 1290, 799, 0.6, 0, 'fore', 25, 1, false), one('water.edge', 1530, 796, 0.75, 1, 'fore', 26, 0, false),
      // reeds at the spit and the right bank
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 9, area: AREA([[150, 600], [300, 640], [330, 730], [160, 736]]), n: 36, minGap: 9, s: [0.5, 0.86], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 10, area: AREA([[1380, 600], [1480, 600], [1480, 770], [1390, 760]]), n: 30, minGap: 9, s: [0.5, 0.86], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), anim: 'strip' },
      { obj: { 'plant.grass': 3, 'plant.heather': 3 }, layer: 'near', seed: 11, area: AREA([[-160, 560], [120, 560], [250, 700], [220, 790], [-160, 790]]), n: 90, minGap: 11, s: [0.45, 0.9], sByY: [[560, 0.7], [790, 1.15]], flip: 0.5, variant: 'random', tint: T('#8a7a40'), anim: false },
      { obj: { 'plant.grass': 3, 'plant.heather': 3 }, layer: 'near', seed: 12, area: AREA([[1450, 560], [1760, 540], [1760, 790], [1470, 786], [1410, 680]]), n: 80, minGap: 11, s: [0.45, 0.9], sByY: [[560, 0.7], [790, 1.15]], flip: 0.5, variant: 'random', tint: T('#8a7a40'), anim: false },
      // the near water's edge: reeds in clumps (gaps where the bank is open), stones
      { obj: { 'plant.reed': 3, 'plant.bulrush': 2, 'plant.grass-long': 1 }, layer: 'fore', seed: 13, area: { rect: [-160, 790, 1760, 822] }, n: 120, minGap: 9, s: [0.5, 0.9], flip: 0.5, variant: [0, 1], tint: T('#8a7a40'), mask: { noise: { scale: 200, cut: 0.42 }, avoid: [{ rect: [940, 770, 1240, 830] }] }, anim: false },
      { obj: { 'rock.stones': 1, 'rock.boulder': 1 }, layer: 'fore', seed: 14, area: { rect: [300, 804, 1240, 818] }, n: 12, minGap: 40, s: [0.14, 0.42], mask: { noise: { scale: 90, cut: 0.4 } }, flip: 0.5, variant: [0, 1], anim: false },
      // the near bank either side of the path: heather, long grass, flowers thinning off the path
      { obj: { 'plant.heather': 5, 'plant.grass-long': 2, 'plant.grass': 2, 'plant.wildflowers': 1 }, layer: 'fore', seed: 16, area: AREA([[-160, 806], [640, 800], [1300, 800], [1760, 794], [1760, 824], [1300, 830], [900, 832], [620, 850], [420, 872], [330, 912], [-160, 912]]), n: 170, minGap: 10, s: [0.5, 0.95], sByY: [[800, 0.8], [910, 1.3]], flip: 0.5, variant: 'random', tint: T('#8a7a40'), mask: { avoid: [{ rect: [940, 770, 1240, 830] }] }, anim: false },
      { obj: { 'plant.heather': 3, 'plant.grass': 3, 'plant.wildflowers': 1 }, layer: 'fore', seed: 15, area: AREA([[676, 912], [760, 884], [1240, 858], [1760, 848], [1760, 912]]), n: 90, minGap: 12, s: [0.6, 1], sByY: [[850, 0.9], [912, 1.3]], flip: 0.5, variant: 'random', tint: T('#8a7a40'), anim: false },
      one('plant.wyv-heath-bank', 40, 900, 1.25, 1, 'front', 63, 0, false), one('plant.wyv-heath-bank', 260, 916, 1.0, 2, 'front', 64, 1, false),
      one('plant.gorse', 210, 820, 0.7, 0, 'fore', 65, 0, false), one('plant.gorse', 1380, 862, 0.6, 1, 'fore', 66, 1, false),
      // the verge in front, moving in the wind; bracken at the corners
      { obj: { 'plant.grass-long': 4, 'plant.grass': 3, 'plant.heather': 2 }, layer: 'front', seed: 17, area: { rect: [700, 893, 1760, 912] }, n: 80, minGap: 12, s: [0.7, 1.1], flip: 0.5, variant: 'random', tint: T('#8a7a40'), anim: 'strip' },
      // the banks in the foreground: big bracken arching over, gorse in flower, heather and bilberry, long grass moving
      one('plant.wyv-heath-bank', -40, 790, 1.25, 1, 'front', 31, 1, false), one('plant.wyv-heath-bank', 150, 860, 1.0, 2, 'front', 32, 0, false),
      one('plant.wyv-heath-bank', 1640, 820, 1.25, 1, 'front', 38, 0, false), one('plant.wyv-heath-bank', 1480, 890, 1.0, 2, 'front', 39, 1, false),
      { obj: 'plant.moor-heather', layer: 'front', seed: 40, area: AREA([[-160, 716], [70, 748], [250, 852], [320, 912], [-160, 912]]), n: 22, minGap: 30, s: [1.1, 1.4], flip: 0.5, variant: 0, anim: false },
      { obj: 'plant.moor-heather', layer: 'front', seed: 41, area: AREA([[1760, 736], [1540, 800], [1420, 880], [1380, 912], [1760, 912]]), n: 18, minGap: 30, s: [1.1, 1.4], flip: 0.5, variant: 0, anim: false },
      one('plant.yc-gorse-spray', 10, 770, 0.7, 0, 'front', 33, 0, false), one('plant.yc-gorse-spray', 1700, 790, 0.64, 1, 'front', 34, 1, false),
      one('ground.log', 1540, 884, 0.62, 1, 'front', 35, 1, false),
      one('plant.fern', 214, 884, 0.9, 0, 'front', 36, 1, false),
      { obj: 'plant.grass-long', layer: 'front', seed: 37, area: AREA([[-160, 712], [90, 760], [300, 900], [-160, 912]]), n: 10, minGap: 34, s: [1.4, 1.4], flip: 0.5, variant: 'random', tint: T('#8a7a40'), mask: { noise: { scale: 120, cut: 0.35 } }, anim: 'strip' },
      one('plant.bracken', -60, 918, 2.1, 0, 'front', 18, 0, false), one('plant.bracken', 170, 930, 1.6, 2, 'front', 20, 0, false), one('plant.bracken', 60, 830, 1.2, 1, 'front', 19, 1, false),
      one('plant.bracken', 1450, 916, 1.4, 1, 'front', 28, 1, false), one('plant.bracken', 1630, 922, 2.0, 0, 'front', 29, 0, false), one('plant.bracken', 1700, 836, 1.2, 2, 'front', 30, 1, false),
    ],
    actors: [
      // the ground movers, by the behaviour presets at their real sizes (sceneUkWyndhamsPoolMovers above): the heron stalking the
      // shallows off the spit, the swans, mallard, coot, moorhen and grebe on open water, a walker with an off-lead dog and a
      // jogger on the bank path
      ...sceneUkWyndhamsPoolMovers(VIEW, EYE, OPEN, [
        { obj: 'bird.wp-heron-stalk', preset: 'heron-stalk', px: [[452, 762], [410, 766], [372, 772]], layer: 'mid', seed: 48, offset: 0.2 },
        { obj: 'bird.swan', preset: 'swan', px: [[620, 734], [820, 728], [1000, 738]], layer: 'mid', seed: 61, offset: 0.2 },
        { obj: 'bird.swan', preset: 'swan', px: [[700, 752], [900, 748], [1040, 756]], layer: 'mid', seed: 62, offset: 0.35 },
        { obj: 'bird.mallard', preset: 'duck', px: [[1120, 700], [1000, 708], [900, 704]], layer: 'mid', seed: 63, offset: 0.1 },
        { obj: 'bird.mallard', preset: 'duck', px: [[1160, 716], [1040, 722], [940, 718]], layer: 'mid', seed: 64, offset: 0.16, variant: 1 },
        { obj: 'bird.coot', preset: 'coot', px: [[1250, 650], [1130, 660]], layer: 'mid', seed: 66, offset: 0.7 },
        { obj: 'bird.moorhen', preset: 'moorhen', px: [[1340, 730], [1250, 738]], layer: 'mid', seed: 67, offset: 0.4 },
        { obj: 'bird.grebe', preset: 'grebe', px: [[760, 640], [520, 650]], layer: 'mid', seed: 68, offset: 0.6 },
        { kind: 'dog', walker: 'person.walker', px: PATH.map(([x, y]) => [x, y - 6]), layer: 'fore', seed: 71, offset: 0.12 },
        { obj: 'person.jogger', preset: 'jogger', px: PATH.map(([x, y]) => [x, y + 14]).reverse(), layer: 'fore', seed: 72, offset: 0.62 },
      ]),
      // swallows skimming the water (none in winter), pipistrelles after dusk
      { obj: 'bird.wp-swallow', layer: 'near', path: [[-140, 620], [300, 650], [640, 600], [1000, 660], [1400, 610], [1760, 640]], speed: 300, loop: 'fade', s: 0.8, variant: 0, seed: 73, offset: 0.1 },
      { obj: 'bird.wp-swallow', layer: 'near', path: [[1760, 560], [1300, 580], [900, 545], [500, 575], [-160, 550]], speed: 260, loop: 'fade', s: 0.6, variant: 1, seed: 74, offset: 0.6 },
      { obj: 'animal.wp-bat', layer: 'mid', path: [[500, 420], [700, 380], [900, 440], [700, 470], [500, 420]], speed: 160, loop: 'loop', s: 0.9, seed: 75, offset: 0.3 },
      { obj: 'animal.wp-bat', layer: 'mid', path: [[1000, 360], [1240, 410], [1100, 460], [900, 400], [1000, 360]], speed: 150, loop: 'loop', s: 0.8, variant: 1, seed: 76, offset: 0.7 },
      // a light aircraft climbing out of Blackbushe, just over the common
      { obj: 'vehicle.light-aircraft', layer: 'horizon', path: [[-200, 260], [1800, 170]], speed: 24, loop: 'loop', s: 0.5, seed: 77, offset: 0.4 },
    ],
    flocks: [
      { obj: 'bird.small-flight', n: 5, area: [200, 140, 1300, 320], speed: 34, s: 0.5, seed: 81, layer: 'far' },
      { obj: 'bird.goose-flight', n: 5, area: [500, 90, 1500, 220], speed: 26, s: 0.32, seed: 82, layer: 'far' },
    ],
    particles: 'season',
    weather: 'live',
  };
}
