/* ============================================================
   PROOF SCENE: Yateley Green, Hampshire (docs/dev/SCENE_ENGINE_V2.md).
   Composed BY HAND on the v2 engine (no composer, no OSM): from the green
   at Church End, looking north-east across the village pond to St Peter's
   (the dark timber bell tower and its short shingled spire), the cottages
   along the lane, mature oaks in groups and singles, and a ragged treeline.
   The engine does the light, water, shadows, seasons and weather; the life
   is choreographed here:

     the heron    stalks the near shallows, freezes, and stabs: the bill
                  goes in at the peak of the strike and a splash bursts
                  where it went in (three actors swapped by a scale mask,
                  timed to the strike's turn hook; see HERON below)
     the brood    a mallard hen and five ducklings (half-grown in autumn and
                  winter) paddle a wandering loop round the pond in a line
     the fetch    a walker throws a ball across the green, the dog races
                  after it, noses it up and trots it home (see FETCH below)
     and          strollers and dog walkers on the gravel path, a car on the
                  lane now and then, swallows over the water, a kingfisher's
                  blue streak along the pond every so often

   How the choreography works with the engine's movers (constant speed along
   a path): each mover's path is built from a TIMELINE, so it is at the right
   place at the right second; a pause is a tiny zigzag that uses up path
   length; a mover is hidden by a sByY scale of 0 outside a half-pixel band
   round its row, so it can wait or travel unseen below that row.
   Seeds and phases are fixed: the same frame at the same t, always.
   ============================================================ */
(function () {
  if (typeof sceneAdd !== 'function') return;
  const PACK = 'proof-yateley-green';
  const CAM = { eye: 1.7, fov: 64, horizon: 440, heading: 32, lat: 51.3427, lon: -0.8301, preset: 'street' };
  const R1 = v => Math.round(v * 10) / 10, R2 = v => Math.round(v * 100) / 100, R3 = v => Math.round(v * 1000) / 1000;

  /* ---------- shapes on the ground (metres) ---------- */
  /** A closed Catmull-Rom curve through the control points, n steps per span, with a seeded wobble: never a polygon. */
  const smoothLoop = (pts, n, rnd, wob) => {
    const out = [], N = pts.length;
    for (let i = 0; i < N; i++) {
      const p0 = pts[(i - 1 + N) % N], p1 = pts[i], p2 = pts[(i + 1) % N], p3 = pts[(i + 2) % N];
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        const w = wob ? (rnd() - 0.5) * wob : 0;
        out.push([R2(f(p0[0], p1[0], p2[0], p3[0]) + w), R2(f(p0[1], p1[1], p2[1], p3[1]) + w * 0.6)]);
      }
    }
    return out;
  };
  /** The loop pushed outward by w metres (a number, or a function of the vertex index: a bank whose width wanders). */
  const grow = (loop, w) => {
    let cx = 0, cd = 0;
    loop.forEach(p => { cx += p[0]; cd += p[1]; });
    cx /= loop.length; cd /= loop.length;
    return loop.map((p, i) => {
      const a = loop[(i - 1 + loop.length) % loop.length], b = loop[(i + 1) % loop.length];
      let nx = b[1] - a[1], nd = -(b[0] - a[0]);
      const L = Math.hypot(nx, nd) || 1;
      nx /= L; nd /= L;
      if (nx * (p[0] - cx) + nd * (p[1] - cd) < 0) { nx = -nx; nd = -nd; }
      const ww = typeof w === 'function' ? w(i) : w;
      return [R2(p[0] + nx * ww), R2(p[1] + nd * ww)];
    });
  };
  const inside = (poly, x, d) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, di] = poly[i], [xj, dj] = poly[j];
      if ((di > d) !== (dj > d) && x < (xj - xi) * (d - di) / (dj - di) + xi) c = !c;
    }
    return c;
  };

  /* ---------- the timeline movers (screen units) ---------- */
  /**
   * A mover's path from a timeline. segs: [{ t: seconds, to: [[X, Y], ...] (walked in order), hold: 'vis' | 'hid',
   * face: 1 | -1, then: [[X, Y], ...] (walked at the end), grow: [Y1, dx] }]. Each segment takes exactly speed * t of
   * path: the waypoints, then a pause that uses up the rest (vis: a zigzag of at most amp px up and back, its x
   * stepping a hair toward face so the mover keeps facing that way; hid: a long zigzag down into the hidden zone;
   * grow: side to side by dx while drifting to row Y1), then the `then` waypoints. A segment too short for its
   * waypoints lends the excess from the next one, so the whole cycle is exactly speed * sum(t).
   */
  const timeline = (start, speed, segs, amp) => {
    const path = [start.slice()];
    let cur = start.slice(), carry = 0;
    const go = (w) => { const L = Math.hypot(w[0] - cur[0], w[1] - cur[1]); if (L > 1e-7) { path.push([w[0], w[1]]); cur = [w[0], w[1]]; } return L; };
    for (const sg of segs) {
      let budget = speed * sg.t - carry;
      for (const w of sg.to || []) budget -= go(w);
      let tail = 0, c = cur.slice();
      for (const w of sg.then || []) { tail += Math.hypot(w[0] - c[0], w[1] - c[1]); c = w; }
      let pad = budget - tail;
      if (pad > 1e-6) {
        const face = sg.face || 1, eps = 0.0004 * face;
        if (sg.grow) {
          const [y1, dx0] = sg.grow, n = Math.max(2, 2 * Math.ceil(pad / (2 * dx0))), dy = (y1 - cur[1]) / n, dx = Math.sqrt(Math.max(0, (pad / n) ** 2 - dy * dy));
          const x0 = cur[0], y0 = cur[1];
          for (let i = 1; i <= n; i++) path.push([R3(x0 + (i % 2 ? dx : 0)), R3(y0 + dy * i)]);
          // the last point sits back on the centre line: its step is a little shorter, made up below
          let L = 0;
          for (let i = path.length - n; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
          cur = path[path.length - 1].slice();
          pad -= L;
        }
        if (pad > 1e-6) {
          const vis = sg.hold !== 'hid', amax = vis ? (amp || 0.25) : 240, n = Math.max(1, Math.ceil(pad / (2 * amax)));
          const a = Math.sqrt(Math.max(0, (pad / (2 * n)) ** 2 - eps * eps)), dir = vis ? -1 : 1;
          let x = cur[0];
          const y0 = cur[1];
          for (let i = 0; i < n; i++) { x += eps; path.push([x, y0 + dir * a]); x += eps; path.push([x, y0]); }
          cur = [x, y0];
          pad = 0;
        }
      }
      for (const w of sg.then || []) go(w);
      carry = pad < 0 ? -pad : 0;
    }
    for (const p of path) { p[0] = R3(p[0]); p[1] = R3(p[1]); }
    let len = 0;
    for (let i = 1; i < path.length; i++) len += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    return { path, len, carry };
  };
  /** sByY that shows a mover (at scale s) only within half a pixel of row y. */
  const band = (y, s, w) => [[R3(y - (w || 0.4) - 0.05), 0], [R3(y - (w || 0.4)), s], [R3(y + (w || 0.4)), s], [R3(y + (w || 0.4) + 0.05), 0]];

  const build = () => {
    sceneProofYateleyLocalObjects();
    const rnd = sceneRnd(sceneHash('proof-yateley-green'));
    const cam = sceneCamera({ camera: CAM, view: { lat: CAM.lat, lon: CAM.lon } });
    const f = cam.f, P = (x, d) => sceneProject(cam, x, d, 0), K = d => f / d;
    const xAt = (X, d) => (X - cam.x0) * d / f;

    /* ===== the ground ===== */
    const POND_C = [[-8.4, 10.62], [-7.0, 10.85], [-4.6, 10.95], [-3.0, 11.3], [-1.9, 12.1], [-0.6, 12.9], [0.5, 14.1], [1.2, 15.6],
      [1.0, 17.3], [1.7, 19.1], [2.5, 21.0], [2.2, 23.2], [0.9, 24.8], [-0.9, 26.5], [-3.4, 27.7], [-6.2, 28.8], [-8.4, 28.1], [-10.2, 26.8], [-12.1, 28.4],
      [-14.6, 30.4], [-16.6, 29.6], [-17.2, 27.4], [-15.8, 24.6], [-14.3, 21.2], [-13.2, 17.4], [-12.4, 14.2], [-12.6, 11.6], [-11.4, 10.3], [-9.6, 10.15]];
    const pond = smoothLoop(POND_C, 2, rnd, 0.12);
    const bank = grow(pond, 1.1), bankOuter = grow(pond, i => R2(0.35 + 0.65 * (1 + Math.sin(i * 0.41 + 1.3) * Math.cos(i * 0.13))));
    const PATH = [[2.5, 4.2], [4.3, 7.4], [4.9, 10.4], [5.1, 13.4], [6.3, 17.4], [8.8, 22.8], [8.4, 29.5], [7.4, 37.5], [6.0, 49.5], [5.0, 63.5], [4.8, 80], [4.5, 96], [4.0, 108]];
    const LANE = [[-260, 88], [-120, 93], [-40, 97.5], [10, 101], [60, 106], [130, 113], [260, 125]];
    const lanD = x => { for (let i = 1; i < LANE.length; i++) if (x <= LANE[i][0]) { const [x0, d0] = LANE[i - 1], [x1, d1] = LANE[i]; return d0 + (d1 - d0) * (x - x0) / (x1 - x0); } return 125; };
    const surfaces = [
      { id: 'land', kind: 'park', rest: true },
      { id: 'fields', kind: 'field', band: [150, 2000], crop: 'pasture' },
      { id: 'gardens', kind: 'garden', poly: [[-260, 92], [-40, 101], [10, 104.5], [60, 109.5], [130, 116.5], [260, 128.5], [260, 152], [130, 150], [60, 152], [0, 150], [-120, 150], [-260, 145]] },
      { id: 'churchyard', kind: 'garden', poly: [[-25.6, 107], [-3.6, 108.5], [18.4, 111], [26.4, 130], [20.4, 152], [-13.6, 154], [-29.6, 140], [-31.6, 118]] },
      { id: 'lane', kind: 'road', path: LANE, width: 5.2, markings: 'none' },
      { id: 'meadow-far', kind: 'meadow', poly: smoothLoop([[-40, 29], [-20, 30.5], [-9, 28.5], [-2, 29.2], [5, 26.5], [8.5, 31], [4, 37.5], [-6, 41], [-18, 39.5], [-34, 42]], 2, rnd, 0.3) },
      { id: 'meadow-near', kind: 'meadow', poly: smoothLoop([[-20, 6.0], [-9.5, 6.4], [-5.5, 7.6], [-3.6, 9.4], [-5.2, 10.6], [-12, 10.2], [-22, 9.8]], 2, rnd, 0.15) },
      { id: 'meadow-right', kind: 'meadow', poly: smoothLoop([[8.8, 5.0], [12, 6.2], [15, 9.5], [17, 14], [14, 15.5], [10.5, 12.5], [8.6, 8.6]], 2, rnd, 0.15) },
      { id: 'uncut-b', kind: 'meadow', poly: smoothLoop([[6.2, 6.6], [7.6, 6.2], [9.4, 7.4], [9.0, 9.6], [7.4, 10.2], [6.4, 8.6]], 2, rnd, 0.12) },
      { id: 'bank', kind: 'bank', poly: bankOuter },
      { id: 'path', kind: 'path', path: PATH, width: 1.7 },
    ];
    const water = [{ id: 'pond', kind: 'pond', poly: pond, edge: 'natural', ripple: 0.16, mirror: 0.8, clarity: 0.12 }];

    /* ===== the placements ===== */
    const place = [], clusters = [];
    let seedN = 100, shrubN = 0;
    const put = (obj, x, d, o) => { const X = P(x, d).X; if (X < -260 || X > 1860) return; place.push(Object.assign({ obj, at: [R2(x), R2(d)], seed: seedN++ }, o || {})); };
    /** An irregular clump: n pieces round (cx, cd), wider across than deep, sizes varied, a few strays. */
    const clump = (mix, cx, cd, rx, rd, n, k, o) => {
      const keys=Object.keys(mix), rush=keys.some(x=>/reed|bulrush/.test(x)), shrub=keys.some(x=>/shrub|hedge|holly/.test(x)), shrubIndex=shrub?shrubN++:0;
      const shrubX=shrub?cx+Math.sin(shrubIndex*2.39+.6)*rx*.7:cx;
      const shrubD=shrub?cd+Math.sin(shrubIndex*.83+1.2)*rd*.5:cd;
      put(rush?'plant.proof-yg-rushes':shrub?'plant.proof-yg-shrubs':'plant.proof-yg-herbs',shrubX,shrubD,Object.assign({variant:shrub?shrubIndex%4:Math.min(3,Math.max(0,Math.round(rx/.95)-1)),k:R2(k[0]+rnd()*(k[1]-k[0])),tint:['#8b8058',(seedN%3)*.03],flip:shrub?shrubIndex%2===0:seedN%3!==0,anim:false},o&&o.extra));
    };
    const inPond = (x, d) => inside(pond, x, d), inBank = (x, d) => inside(bankOuter, x, d);
    const pathX = d => { for (let i = 1; i < PATH.length; i++) if (d <= PATH[i][1]) { const [x0, d0] = PATH[i - 1], [x1, d1] = PATH[i]; return x0 + (x1 - x0) * (d - d0) / (d1 - d0); } return 37.5; };
    const onPath = (x, d) => Math.abs(x - pathX(d)) < 1.05;
    const clear = (x, d) => inPond(x, d) || onPath(x, d);

    // St Peter's tower stays inside the central phone crop, with its approach and churchyard aligned.
    put('landmark.st-peters-yateley', 4.0, 115, { fix: true, variant: 0, k: 1 });
    put('tree.proof-yew', -20.1, 117, { k: 0.85, variant: 0 });
    put('tree.proof-yew', 16.4, 128, { k: 0.7, variant: 1, flip: true });
    // the cottages along the lane at Church End, at different depths, planting at their feet
    const COT = [['building.proof-yg-thatched-cottage', -38, 109, 0, false], ['building.proof-yg-green-cottage', 35, 114, 0, true], ['building.proof-yg-thatched-cottage', 58, 121.5, 1, false],
      ['building.proof-yg-green-cottage', -56, 124, 2, false], ['building.proof-yg-green-cottage', 77, 129, 1, true], ['building.proof-yg-thatched-cottage', -84, 138, 2, true], ['building.proof-yg-green-cottage', 98, 134, 0, false]];
    COT.forEach(([obj, x, d, v, fl]) => {
      put(obj, x, d, { variant: v, flip: fl });
      clump({ 'plant.shrub': 2, 'plant.hedge': 1, 'plant.holly': 1 }, x + (rnd() - 0.5) * 3, d - 3.2, 4.5, 0.8, 2 + Math.floor(rnd() * 3), [0.55, 0.95]);
      clump({ 'plant.wildflowers': 2, 'plant.grass-long': 1 }, x, d - 2.4, 4, 0.5, 4, [0.8, 1.2]);
    });
    // hedges along the near side of the lane, in runs with gaps (field gates, drives)
    for (let x = -140; x < 120; x += 9 + rnd() * 9) { if (rnd() < 0.3) { x += 10; continue; } put('plant.hedge', x, lanD(x) - 4.4 - rnd() * 0.6, { k: R2(0.75 + rnd() * 0.4), variant: Math.floor(rnd() * 3), flip: seedN%2===0, anim: false }); }
    // lamps along the lane and one by the pond bench (night pools, reflections)
    put('street.lamp', -27, lanD(-27) - 3.2, { variant: 0 });
    put('street.lamp', 36, lanD(36) - 3.2, { variant: 0 });
    put('street.lamp', 2.3, 27.6, { variant: 0, k: 0.78 });
    put('street.bench', 3.5, 25.2, { flip: true });

    // the trees: groups and singles at varied spacing, heights and depths
    const T = (obj, x, d, k, o) => put(obj, x, d, Object.assign({ k, variant: Math.floor(rnd() * 3), flip: rnd() < 0.5, anim: false }, o || {}));
    T('tree.proof-yg-oak', -30, 52, 1.12, { anim: { sway: { k: 0.7 } } });            // the great oak of the left group
    T('tree.proof-yg-oak', -21.5, 66, 0.86);
    T('tree.proof-yg-chestnut', -44, 83, 0.95);
    T('tree.proof-yg-oak', -9.5, 155, 0.72); // beyond the churchyard; the nave and windows stay visible
    T('tree.proof-yg-birch', -11.2, 41, 0.78, { anim: { sway: { k: 0.8 } } });
    T('tree.proof-yg-willow', -14.8, 32.4, 0.72, { anim: { sway: { k: 0.9 } } });   // the weeping willow over the far bank
    T('tree.proof-yg-hawthorn', -19, 36.5, 0.7);
    T('tree.proof-yg-oak', 37.5, 59, 1.12, { anim: false });                          // the single oak framing the right edge
    T('tree.proof-yg-oak', 54, 93, 0.78);
    T('tree.proof-yg-chestnut', 66, 118, 0.62);
    T('tree.proof-yg-hawthorn', 9.5, 62, 0.55);
    // beyond the lane: a few big oaks behind the cottages, the church's own trees
    T('tree.proof-yg-oak', -70, 150, 1.05); T('tree.proof-yg-oak', -26, 158, 0.9); T('tree.proof-yg-chestnut', 4, 163, 0.85);
    T('tree.proof-yg-oak', 30, 168, 0.8); T('tree.proof-yg-oak', 86, 160, 1.0); T('tree.proof-yg-birch', 72, 150, 0.8); T('tree.proof-yg-oak', -120, 175, 1.1);
    // the treeline: woods in an irregular, layered line with gaps, standards above it
    const distantRules=[{obj:{'tree.proof-yg-edge':2,'tree.proof-yg-distant':3,'tree.far-broad':1},on:['fields','land'],avoid:['lane','gardens','churchyard','pond','path'],d:[175,550],n:30,dist:'ground',gap:16,k:[.6,1.3],variant:'random',flip:.5,tint:{col:'#8b9485',k:[0,.03]},anim:false,seed:47}];

    // the pond margin: reeds and bulrushes in clumps with gaps, hugging the water
    const edgeAt = (u) => { const i = Math.floor(u * pond.length) % pond.length; return [pond[i], grow(pond, 0.6)[i]]; };
    const REED_U = [0.05, 0.23, 0.34, 0.5, 0.56, 0.71];
    const ring = grow(pond, 0.55);
    for (const u of REED_U) {
      const i = Math.floor(u * pond.length) % pond.length, p = ring[i];
      const X = P(p[0], p[1]).X;
      if (X < -120 || X > 1720) continue;
      if (p[1] < 12.8 && X > 150 && X < 520) continue;   // the heron's shallows stay open
      const big = rnd() < 0.55;
      clump({ 'plant.reed': 4, 'plant.bulrush': 1 }, p[0], p[1], big ? 1.5 : 0.6, 0.4, big ? 8 : 3, [0.5, 1.0], { not: (x, d) => inPond(x, d) || !inside(bank, x, d) });
      const q = grow(pond, 1.7)[i];
      clump({ 'plant.grass-long': 2, 'plant.wildflowers': 1 }, q[0], q[1], 1.8, 0.5, 4, [0.8, 1.3], { not: (x, d) => inside(bank, x, d) });
    }
    void edgeAt;
    // lilies in two rafts and a moorhen by the reeds
    for (const [cx, cd, n] of [[-7.5, 21.5, 6], [-2.2, 25.2, 4]]) for (let i = 0; i < n; i++) put('water.lily', cx + (rnd() - 0.5) * 2.4, cd + (rnd() - 0.5) * 1.4, { k: R2(.72+rnd()*.65), variant: Math.floor(rnd() * 3), anim: false });
    put('bird.moorhen', -10.5, 26.4, { anim: { paddle: { k: 1 } } });
    put('bird.mallard', -12.6, 23, { variant: 0, flip: true });
    put('bird.coot', -16, 27.5, {});

    // the green: wild flowers thinning off the path, clumps of long grass and daisies with mown gaps between
    const LOW = [[-0.8, 7.2, 1.3], [1.6, 11.6, 0.8], [-2.2, 9.4, 0.6], [11.8, 13.5, 1.0]];
    for (const [cx, cd, r] of LOW) clump({ 'plant.daisies': 3, 'plant.wildflowers': 1 }, cx, cd, r, r * 0.5, Math.round(3 + r * 4), [0.5, 0.85], { not: clear });
    const ISLANDS = [[11.5, 21, 1.8], [14.5, 30, 2.2], [7.5, 40, 2.5], [-22, 45, 3], [16, 46, 2.6], [-3, 33, 1.8], [21, 42, 2]];
    for (const [cx, cd, r] of ISLANDS) clump({ 'plant.grass-long': 3, 'plant.wildflowers': 2, 'plant.daisies': 1 }, cx, cd, r, r * 0.5, Math.round(3 + r * 2.5), [0.7, 1.2], { not: clear });

    // the foreground: reeds and long grass in the bottom-left corner (in front of everything)
    clump({ 'plant.reed': 3, 'plant.grass-long': 2, 'plant.bulrush': 1 }, -3.6, 5.3, 1.0, 0.5, 9, [0.5, 0.85], { extra: { layer: 'front', anim: { sway: { k: 0.7 } } } });
    clump({ 'plant.grass-long': 3, 'plant.wildflowers': 2 }, 4.2, 4.9, 0.9, 0.3, 6, [0.9, 1.3], { extra: { layer: 'front' }, not: onPath });
    // the framing: an old oak on the bank just off the left edge, its canopy overhanging the top-left of the frame
    place.push({ obj: 'tree.proof-yg-oak', at: [-15.6, 18.6], k: 0.9, variant: 1, flip: false, anim: false, seed: 9 });

    /* ===== the ground cover rules (seeded, clustered, never a band) ===== */
    const scatter=distantRules.concat([
      {obj:{'plant.proof-yg-tuft':3,'plant.grass':1},on:['land','meadow-far','meadow-near','meadow-right','uncut-b','bank','gardens','churchyard'],avoid:['pond','path','lane'],d:[4.6,160],n:920,dist:'screen',k:[.65,1.3],variant:'random',flip:.5,tint:{col:'#94855a',k:[0,.06]},anim:false,species:1,seed:31},
      {obj:'plant.proof-yg-herbs',on:['meadow-far','meadow-near','meadow-right','uncut-b','bank','gardens','churchyard'],avoid:['pond','path','lane'],d:[8,150],n:85,dist:'screen',k:[.35,.65],variant:'random',flip:.5,tint:{col:'#8b8058',k:[0,.06]},anim:false,species:1,seed:32}
    ]);

    /* ===== the life ===== */
    const actors = [];
    /** A timeline mover: its speed is set from the built path so the cycle is exactly T seconds (movers in one act stay in step). */
    const mover = (obj, tl, T, o) => actors.push(Object.assign({ obj, path: tl.path, speed: R3(tl.len / T), loop: 'loop', s: 1 }, o));

    // A standing phase traverses less than a third of a pixel while visible, then waits below its mask.
    // Its hidden leg carries the rest of the clock without thousands of duplicate subpixel vertices.
    const stand = (obj, x, y, begin, duration, T, scale, o) => {
      const span=.24, speed=2*span/duration, hid=speed*(T-duration)/2, eps=(o.face||1)*.0001;
      actors.push(Object.assign({ obj, path: [[x,y],[x+eps,y+span],[x+2*eps,y+span+hid],[x+3*eps,y+span],[x+4*eps,y]].map(p=>p.map(R3)), speed, loop:'loop', s:1,
        sByY:[[y-.01,0],[y,scale],[y+span,scale],[y+span+.01,0]], offset: ((o.clock||0)-(begin+duration/2)/T+2)%1 },o));
    };

    // ---- HERON: two slow steps, freeze, stab; again; turn; back. A 24 s cycle; the strike peaks every 6 s inside a pause ----
    const dH = 12.15, YH = R2(P(0, dH).Y), kH = K(dH), sH = R3(kH * 0.78 / 72), vH = 29.6, TH = 24;
    const HX = [250, 321, 392];
    const HSEED = 41, ph = sceneRnd(HSEED * 7 + 3)();                     // the strike hook's phase, drawn as _scAnims draws it
    const offH = R3((((ph - 0.25) % 1) + 1) % 1 / 4);                       // strike peaks at local 4.2 + 6k s (hold .9: the peak at u .95)
    const YS = R2(YH + 0.7);                                                // the striker's row (under the stalker's: their bands never meet)
    const HOPS = [[0, 1, 1], [1, 2, 1], [2, 1, -1], [1, 0, -1]];
    // the stalker: visible while it steps, hidden under its row while the striker holds the pose
    const stalkSegs = [];
    for (const [, b, face] of HOPS) stalkSegs.push({ t: 2.4, to: [[HX[b], YH]], hold: 'vis', face }, { t: 3.6, to: [[HX[b], YH + 2]], hold: 'hid', then: [[HX[b], YH]] });
    mover('bird.proof-heron-stalk', timeline([HX[0], YH], vH, stalkSegs, 0.2), TH, { layer: 'fore', sByY: band(YH, sH, 0.3), seed: 40, offset: offH });
    // the striker: hidden while the stalker steps, visible and still through each pause (the neck's turn hook is the stab)
    HOPS.forEach(([,b,face],j) => stand('bird.proof-heron-strike',HX[b],YS,2.4+6*j,3.6,TH,sH,{layer:'fore',seed:HSEED,face,clock:offH}));
    // the splash: where the bill went in, from the peak for 0.8 s, growing; it leaves upward (above its band) and crosses back
    // down to wait under its row in a hundredth of a second
    const tipX = 33 * sH, YSP = R2(YH + 0.9), sSP = R3(kH * 0.26 / 26), splashSegs = [];
    const spot = j => R1(HX[HOPS[j][1]] + HOPS[j][2] * tipX);
    let tNow = 0;
    for (let j = 0; j < 4; j++) {
      const tPeak = 4.2 + 6 * j, X = spot(j);
      splashSegs.push({ t: tPeak - 0.04 - tNow, to: [[X, YSP - 1.1], [X, YSP + 0.6]], hold: 'hid', then: [[X, YSP + 0.5]] }, { t: 0.8, to: [[X, YSP]], grow: [R2(YSP - 0.85), 5] });
      tNow = tPeak + 0.76;
    }
    splashSegs.push({ t: TH - tNow, to: [[spot(3), YSP - 1.1], [spot(3), YSP + 0.6], [spot(0), YSP + 0.6]], hold: 'hid', then: [[spot(0), YSP + 0.5]] });
    mover('water.proof-splash', timeline([spot(0), YSP + 0.5], 120, splashSegs, 0.2), TH,
      { layer: 'fore', sByY: [[R3(YSP - 0.95), 0], [R3(YSP - 0.9), R3(sSP * 1.3)], [YSP, R3(sSP * 0.55)], [R3(YSP + 0.4), R3(sSP * 0.5)], [R3(YSP + 0.45), 0]], seed: 42, offset: offH, anim: false });

    // ---- the BROOD: a mallard hen and five ducklings in a line on a wandering loop (ground movers: the engine floats, scales,
    // turns and reflects them) ----
    const BROOD = [[-1.4, 15.0], [-4.2, 14.6], [-6.4, 15.8], [-7.2, 18.4], [-5.6, 21.6], [-3.0, 22.4], [-1.1, 21.0], [-0.9, 18.6], [0.2, 16.6]];
    BROOD.push(BROOD[0].slice());
    let broodL = 0;
    for (let i = 1; i < BROOD.length; i++) broodL += Math.hypot(BROOD[i][0] - BROOD[i - 1][0], BROOD[i][1] - BROOD[i - 1][1]);
    const off0 = 0.12;
    actors.push({ obj: 'bird.mallard', ground: BROOD, loop: 'loop', speed: 0.28, variant: 1, k: 1, seed: 51, offset: off0 });
    for (let i = 0; i < 5; i++) actors.push({ obj: 'bird.proof-duckling', ground: BROOD, loop: 'loop', speed: 0.28, variant: i % 2, k: R2(0.9 + (i % 3) * 0.07), seed: 52 + i, offset: R3(((off0 - (0.55 + 0.34 * i + (i === 3 ? 0.12 : 0)) / broodL) % 1 + 1) % 1) });

    // ---- the FETCH, a 6.8 s act: the throw at 0.2 s, the dog away at 0.57, nosing the ball up at 1.98, home by 3.84 ----
    const dF = 16.5, YG = R2(P(0, dF).Y), kF = K(dF), sDog = R3(kF * 0.6 / 46), sBall = R3(kF * 0.1 / 9), sMan = R3(kF * 1.72 / 64);
    const XO = 1505, XD0 = XO - 40, XL = 1040, XB = 1015, XSTOP = R1(XB + 34 * sDog), TF = 6.8, vDog = 300;
    const runT = Math.abs(XD0 - XSTOP) / vDog;                              // about 1.4 s each way
    const YR = R2(YG - 32 * sMan), XR = XO - 6;                             // the hand (an underarm throw), behind the walker's body
    actors.push({ obj: 'person.walker', layer: 'near', path: [[XO, YG], [XO - 0.3, YG]], speed: R3(0.3 / TF), loop: 'loop', s: sMan, variant: 3, offset: 0, seed: 61, anim: false });
    // the ball: up behind the walker (faded in: loop 'fade'), the lob, a bounce, at rest; then hidden under its row back to the hand
    const lob = [];
    for (let i = 1; i <= 16; i++) { const u = i / 16; lob.push([R1(XR + (XL - XR) * u), R1(YR + (YG - YR) * u - 4 * 175 * u * (1 - u))]); }
    const bounce = [];
    for (let i = 1; i <= 5; i++) { const u = i / 5; bounce.push([R1(XL + (XB - XL) * u), R1(YG - 4 * 46 * u * (1 - u))]); }
    const vBall = 350;
    let lobLen = 0;
    lob.forEach((p, i) => { const q = i ? lob[i - 1] : [XR, YR]; lobLen += Math.hypot(p[0] - q[0], p[1] - q[1]); });
    const ballTl = timeline([XR, YG + 1.5], vBall, [
      { t: 0.2, to: [[XR, YR]], hold: 'vis' }, { t: lobLen / vBall, to: lob, hold: 'vis' }, { t: 0.3, to: bounce, hold: 'vis', face: -1 },
      { t: 2.28 - 0.5 - lobLen / vBall, to: [[XB, YG + 1.5]], hold: 'hid' }, { t: TF - 2.28, to: [[XR, YG + 1.5]], hold: 'hid' },
    ], 0.35);
    mover('prop.proof-ball', ballTl, TF, { layer: 'near', loop: 'fade', sByY: [[R1(YR - 300), sBall], [R2(YG + 0.4), sBall], [R2(YG + 0.45), 0]], offset: 0, seed: 62, anim: false });
    stand('prop.proof-ball',XB,YG,.5+lobLen/vBall,2.28-.5-lobLen/vBall,TF,sBall,{layer:'near',seed:62,anim:false});
    // the dog waiting at the walker's side, legs still, eyes on the throw
    stand('animal.dog',XD0,YG,0,.57,TF,sDog,{layer:'near',variant:1,seed:63,face:-1,anim:{walk:false}});
    stand('animal.dog',XD0,YG,3.84,TF-3.84,TF,sDog,{layer:'near',variant:1,seed:63,face:-1,anim:{walk:false}});
    // the dog racing out and nosing the ball
    mover('animal.dog', timeline([XD0, YG + 2], vDog, [
      { t: 0.57, hold: 'hid', then: [[XD0, YG]] }, { t: runT, to: [[XSTOP, YG]], hold: 'vis', face: -1 }, { t: 2.28 - 0.57 - runT, to: [[XSTOP, YG + 2]], hold: 'hid' },
      { t: TF - 2.28, to: [[XD0, YG + 2]], hold: 'hid' },
    ], 0.2), TF, { layer: 'near', sByY: band(YG, sDog, 0.3), variant: 1, offset: 0, seed: 64, anim: { walk: { period: 0.3, k: 1.5 } } });
    stand('animal.dog',XSTOP,YG,.57+runT,2.28-.57-runT,TF,sDog,{layer:'near',variant:1,seed:64,face:-1,anim:{walk:false}});
    // the dog trotting home with the ball in its mouth
    mover('animal.proof-dog-ball', timeline([XSTOP, YG + 2], vDog, [
      { t: 2.28, hold: 'hid' }, { t: 0.15, hold: 'hid', then: [[XSTOP, YG]] }, { t: runT, to: [[XD0, YG]], hold: 'vis', face: 1 },
      { t: TF - 2.43 - runT, to: [[XD0, YG + 2], [XSTOP, YG + 2]], hold: 'hid' },
    ], 0.2), TF, { layer: 'near', sByY: band(YG, sDog, 0.3), variant: 1, offset: 0, seed: 65, anim: { walk: { period: 0.36, k: 1.3 } } });

    // ---- the kingfisher: a blue streak low along the pond, then gone for a while (a long way round, off the frame) ----
    actors.push({ obj: 'bird.kingfisher-flight', layer: 'near', path: [[-80, 600], [300, 588], [700, 566], [1000, 548], [1760, 520], [1760, -400], [-3400, -400], [-3400, 600], [-80, 600]], speed: 640, loop: 'loop', s: 0.75, seed: 70, offset: 0.62 });

    /* ===== the scene ===== */
    for(const p of place)if(p.anim===false)delete p.seed;
    for(const a of actors){delete a.face;delete a.clock;}
    const scene = {
      id: 'yateley-green', v: 2, camera: CAM, view: { lat: CAM.lat, lon: CAM.lon },
      surfaces, water, place, scatter, actors,
      flows: [
        { id: 'strollers', kind: 'walk', on: ['path'], density: 1.4, profile: 'leisure', mix: { 'person.dog-walker': 3, 'person.walker': 2, 'person.elderly-couple': 1, 'person.buggy-walker': 1 }, both: true, max: 3 },
        { id: 'lane-cars', kind: 'drive', on: ['lane'], density: 0.35, profile: 'town', mix: { 'vehicle.car': 1 }, max: 2 },
      ],
      flocks: [
        { obj: 'bird.small-flight', n: 5, area: [40, 470, 880, 520], speed: 72, s: 0.5, seed: 81, layer: 'near' },
        { obj: 'bird.small-flight', n: 4, area: [1040, 170, 1420, 300], speed: 20, s: 0.32, seed: 82, layer: 'far' },
      ],
      atmos: 'auto', weather: 'live', cover: 'auto', season: 'auto', at: 'golden', setting: 'natural', particles: 'season',
      sky: { clouds: { n: 6, y: [50, 300], speed: 5 } },
      kits: ['temperate', 'birds', 'people', 'water'],
    };
    return typeof sceneFromRecipe === 'function' ? sceneFromRecipe(scene) : scene;
  };

  sceneAdd(PACK, {
    id: 'yateley-green', label: 'Yateley Green, Hampshire', site: 'Yateley Green and St Peter\'s, Church End',
    tags: ['uk', 'hampshire', 'yateley', 'village green', 'pond', 'church', 'cottages', 'heron', 'ducklings', 'dog'],
    mood: 'calm', colour: 'green', region: ['GB-ENG'], liveSky: { lat: CAM.lat, lon: CAM.lon },
  }, build);
})();
