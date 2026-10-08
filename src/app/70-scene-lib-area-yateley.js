/* ============================================================
   AREA LIBRARY: Yateley (docs/dev/SCENE_ENGINE.md sections 3 and 8).
   Three ARCHETYPES for the Yateley area, each built from a small data row:

     yateley-heath  Yateley Common: lowland heath (ling, bell heather, gorse,
                    bracken, silver birch, Scots pine) on pale sandy rides,
                    small acid ponds in the hollows, conservation cattle,
                    stonechats and Dartford warblers, nightjars at dusk, light
                    aircraft from Blackbushe on the southern edge.
     yateley-pool   Wyndham's Pool: the wooded pond on the Common, ringed by
                    Scots pine and birch, anglers' swims on the bank, reeds,
                    lilies and waterbirds.
     yateley-green  Yateley Green and the village at Church End: the open
                    green and its pond, oaks and chestnuts, St Peter's church
                    (timber tower and spire), brick and rendered cottages,
                    benches and lamps along the lane.

   Every archetype is PURE (no DOM, nothing drawn at load): build(p) returns
   scene data for one season (p.season), so the four seasonal items of a view
   are four pictures of the same place, each with its own creatures. The
   scene itself keeps season 'auto', the live sky and the live weather.
   Seeds come from the row id (sceneHash), never from the library order.
   Scene rows: 71-scene-uk-yateley-*.js. Items: 72-anim-pack-uk-area-yateley.js.
   ============================================================ */
(function () {
  if (typeof sceneArchetypeDefine !== 'function') return;
  const R = v => Math.round(v), K = v => Math.round(v * 100) / 100;
  const SEASONS = ['summer', 'spring', 'autumn', 'winter'];
  const AT = ['afternoon', 'morning', 'dawn', 'day', 'noon', 'golden', 'sunset', 'dusk', 'night'];
  const rr = (p, tag) => sceneRnd(sceneHash(String(p.id) + '|' + tag));
  const num = (v, d) => (Number.isFinite(v) ? v : d);
  const has = (p, f) => (p.features || []).includes(f);

  /* ---------- shapes (pure path builders) ---------- */
  /** A gently waving land band from y down to foot. */
  const band = (y, amp, ph, foot) => `M-160 ${R(foot)}V${R(y)}Q${R(260 + ph)} ${R(y - amp)} ${R(780 + ph / 2)} ${R(y + amp * 0.5)}T1760 ${R(y - amp * 0.4)}V${R(foot)}Z`;
  /** A lobed tree-line silhouette along y (one path: cheaper than hundreds of tiny trees). pine: share of tall pointed crowns. */
  const treeline = (y, seed, k, pine, foot) => {
    const r = sceneRnd(seed);
    let d = `M-160 ${R(foot)}V${R(y)}`;
    for (let x = -160; x < 1760;) {
      const w = (18 + r() * 34) * k, h = (10 + r() * 26) * k, y1 = y - r() * 6 * k;
      if (r() < pine) d += `L${R(x + w * 0.5)} ${R(y1 - h * 1.5)}L${R(x + w)} ${R(y1)}`;
      else d += `A${R(w / 2)} ${R(h)} 0 0 1 ${R(x + w)} ${R(y1)}`;
      x += w * (0.72 + r() * 0.2);
    }
    return d + `L1760 ${R(y)}V${R(foot)}Z`;
  };
  /** Low flat-topped cushions scattered in a band (one path): the mottled heath under the plants. */
  const cushions = (x0, x1, y0, y1, n, seed, w0, w1) => {
    const r = sceneRnd(seed);
    let d = '';
    for (let i = 0; i < n; i++) {
      const x = x0 + (i + r()) * (x1 - x0) / n, y = y0 + r() * (y1 - y0), k = 0.55 + 0.45 * (y - y0) / Math.max(1, y1 - y0);
      const rx = (w0 + r() * (w1 - w0)) * k, ry = rx * (0.2 + r() * 0.12);
      d += `M${R(x - rx)} ${R(y)}Q${R(x - rx * 0.7)} ${R(y - ry * 2)} ${R(x)} ${R(y - ry * 2.1)}Q${R(x + rx * 0.75)} ${R(y - ry * 1.9)} ${R(x + rx)} ${R(y)}Z`;
    }
    return d;
  };
  /** An irregular pond in the box (seeded wobble). */
  const pond = (x0, x1, y0, y1, seed) => {
    const r = sceneRnd(seed), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
    let d = '';
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, k = 1 + (r() - 0.5) * 0.1; d += `${i ? 'L' : 'M'}${R(cx + Math.cos(a) * rx * k)} ${R(cy + Math.sin(a) * ry * k)}`; }
    return d + 'Z';
  };
  /** Catmull-Rom samples of [x, y, w] control points, about every 5 units of y. */
  const smooth = (pts) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[i], c = pts[i + 1], e = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.abs(c[1] - b[1]) / 5));
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        const cr = (p0, p1, p2, p3) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (3 * p1 - p0 - 3 * p2 + p3) * t3);
        out.push([cr(a[0], b[0], c[0], e[0]), cr(a[1], b[1], c[1], e[1]), b[2] + (c[2] - b[2]) * t]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  /** A path that winds from (x0, y0) to (x1, 905), widening from w0 to w1, with `bend` of sideways swing. */
  const ride = (x0, y0, x1, w0, w1, bend) => {
    const ys = [0, 0.08, 0.2, 0.38, 0.62, 1].map(t => y0 + (905 - y0) * t);
    return ys.map((y, i) => { const t = i / 5; return [R(x0 + (x1 - x0) * t * t + Math.sin(t * Math.PI * 1.6) * bend * (1 - t * 0.4)), R(y), R(w0 + (w1 - w0) * t * t)]; });
  };
  const rideStrip = (pts, y0, y1) => {
    const s = smooth(pts).filter(q => q[1] >= y0 - 3 && q[1] <= y1 + 3);
    if (s.length < 2) return '';
    return 'M' + s.map(q => `${R(q[0] - q[2] / 2)} ${R(q[1])}`).join('L') + 'L' + s.slice().reverse().map(q => `${R(q[0] + q[2] / 2)} ${R(q[1])}`).join('L') + 'Z';
  };
  const rideAvoid = (pts, y0, y1, pad) => {
    const s = smooth(pts).filter(q => q[1] >= y0 && q[1] <= y1);
    return s.length < 2 ? null : { poly: s.map(q => [R(q[0] - q[2] / 2 - pad), R(q[1])]).concat(s.slice().reverse().map(q => [R(q[0] + q[2] / 2 + pad), R(q[1])])) };
  };
  const ridePath = (pts, y0, y1, step) => {
    const out = []; let last = -1e9;
    for (const q of smooth(pts)) if (q[1] >= y0 && q[1] <= y1 && q[1] - last >= step) { out.push([R(q[0]), R(q[1])]); last = q[1]; }
    return out.length >= 2 ? out : [[800, y0], [820, y1]];
  };
  const rideX = (pts, y) => { const s = smooth(pts); let best = s[0]; for (const q of s) if (Math.abs(q[1] - y) < Math.abs(best[1] - y)) best = q; return best; };
  const avoids = (...a) => a.filter(Boolean);
  const scatterRule = (o) => Object.assign({ flip: 0.5, anim: false }, o);

  /* ---------- the season's own small life (shared) ---------- */
  const BUTTERFLIES = { spring: [0, 2, 4], summer: [3, 5, 1], autumn: [1, 5], winter: [] };
  const insects = (d, p, box, layer, seed) => {
    const s = p.season, [x0, y0, x1, y1] = box, r = sceneRnd(seed);
    BUTTERFLIES[s].forEach((v, i) => {
      const x = x0 + (i + 0.5) * (x1 - x0) / BUTTERFLIES[s].length, y = y0 + r() * (y1 - y0);
      d.actors.push({ obj: 'animal.butterfly', layer, path: [[R(x - 60), R(y)], [R(x + 40), R(y - 30)], [R(x - 10), R(y + 28)], [R(x + 80), R(y + 6)]], speed: 18 + i * 3, loop: 'pingpong', s: K(0.9 + r() * 0.3), variant: v, seed: seed + i, offset: K(i * 0.31) });
    });
    if (s === 'summer' || s === 'spring') for (let i = 0; i < 2; i++) {
      const x = x0 + r() * (x1 - x0), y = y1 - r() * 40;
      d.actors.push({ obj: 'animal.bee', layer: 'fore', path: [[R(x), R(y)], [R(x + 70), R(y - 20)], [R(x + 30), R(y + 22)]], speed: 26 + i * 4, loop: 'pingpong', s: K(1 + r() * 0.2), seed: seed + 10 + i });
    }
  };
  const PEOPLE = ['person.walker', 'person.dog-walker', 'person.jogger', 'person.family', 'person.cyclist'];

  /* =====================================================================
     yateley-heath: Yateley Common
     ===================================================================== */
  const HEATH_PALETTE = {
    base: { wood: ['#475b43', '#38492f', '#5b6e4e'], sand: ['#bc9e6e', '#d8c194', '#eedfbb'], bank: ['#4c4632', '#3c3626'], mound: ['#6c5862', '#504642'], heath: ['#7c7464', '#605c46', '#46482f'] },
    spring: { heath: ['#7f8c5c', '#627542', '#485a30'], mound: ['#5c6644', '#47513a'], wood: ['#4d6646', '#3d5233', '#64804f'] },
    summer: { heath: ['#7c7464', '#605c46', '#46482f'], mound: ['#7c5872', '#5e4658'] },
    autumn: { heath: ['#8e7858', '#705840', '#52422f'], wood: ['#5e5a3c', '#4a462e', '#7a6a42'], mound: ['#704e3a', '#543a2c'], sand: ['#b2966a', '#d0b68c', '#e8d6b0'] },
    winter: { heath: ['#8e877a', '#6c5e4e', '#4e4438'], wood: ['#4e5652', '#3e4642', '#646c66'], mound: ['#6c5e56', '#54483e'], sand: ['#a6947c', '#c6b69c', '#e2d6c2'] },
  };
  sceneArchetypeDefine('yateley-heath', {
    kits: ['temperate', 'birds', 'people'],
    params: { id: 'id', season: SEASONS, at: AT, heading: 'number', hz: 'number', tx: 'number', tb: 'number', bend: 'number', px: 'number', pw: 'number', sx: 'number', ss: 'number', frame: ['pine-birch', 'birch-pine', 'birches', 'pines', 'open'], features: 'list' },
    meta: (p) => ({ id: String(p.id), label: 'Yateley Common', site: 'Yateley Common', tags: ['uk', 'yateley', 'heathland', 'heather', 'gorse', 'scots pine'], mood: 'calm', colour: 'green' }),
    build: (p) => {
      const s = p.season || 'summer', winter = s === 'winter', summer = s === 'summer', spring = s === 'spring', autumn = s === 'autumn';
      const H = num(p.hz, 500), r = rr(p, 'heath'), seed0 = sceneHash(String(p.id)) % 5000 + 1000;
      const yF = H + 8, yM = H + 66, yN = H + 166, yFo = 800;
      const TR = has(p, 'track') ? ride(num(p.tx, 900), H + 6, num(p.tb, 700), 6, 270, num(p.bend, 60)) : null;
      const dusk = p.at === 'dusk' || p.at === 'sunset' || p.at === 'night';
      const PW = num(p.pw, 380), PX = num(p.px, 420), PY = yM + 12;
      const P = has(p, 'pond') ? { x0: PX - PW / 2, x1: PX + PW / 2, y0: PY, y1: PY + R(PW * 0.17) } : null;
      const pondAv = P ? { rect: [R(P.x0 - 46), R(P.y0 - 46), R(P.x1 + 46), R(P.y1 + 40)] } : null;
      const tAv = (y0, y1, pad) => (TR ? rideAvoid(TR, y0, y1, pad) : null);
      const sand = (y0, y1) => ({ lin: [[0, '@sand.0'], [0.5, '@sand.1'], [1, '@sand.2']], y1: H, y2: 905 });
      const d = {
        v: 1, id: String(p.id), view: { lat: 51.336, lon: -0.833, heading: num(p.heading, 210), fov: 80, horizon: H, lift: 1 },
        at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, weather: 'live', particles: 'season',
        palette: HEATH_PALETTE,
        layers: [{ id: 'horizon', depth: 0.08, haze: 0.55 }, { id: 'far', depth: 0.2, haze: 0.26 }, { id: 'mid', depth: 0.45, haze: 0.12 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
        sky: { stars: 220, clouds: { n: 6, y: [40, Math.max(180, H - 170)], speed: 5 }, sunR: 26, moonR: 20 },
        ground: [
          { layer: 'horizon', d: treeline(H - 4, seed0 + 1, 1, 0.45, H + 30), fill: '@wood.1' },
          { layer: 'horizon', d: treeline(H + 2, seed0 + 2, 0.7, 0.3, H + 34), fill: '@wood.0' },
          { layer: 'far', d: band(yF, 4, 30, yM + 30), fill: { lin: [[0, '@heath.0'], [1, '@heath.1']], y1: yF, y2: yM + 30 } },
          { layer: 'far', d: cushions(-160, 1760, yF + 6, yM - 6, 20, seed0 + 3, 26, 50), fill: '@mound.0' },
          { layer: 'mid', d: band(yM, 6, -50, yN + 30), fill: { lin: [[0, '@heath.1'], [1, '@heath.2']], y1: yM, y2: yN + 30 } },
          { layer: 'mid', d: cushions(-160, 1760, yM + 10, yN - 8, 14, seed0 + 4, 44, 86), fill: '@mound.1' },
          { layer: 'near', d: band(yN, 8, 70, yFo + 20), fill: '@heath.2' },
          { layer: 'near', d: cushions(-160, 1760, yN + 14, yFo - 10, 12, seed0 + 5, 70, 130), fill: '@mound.1' },
          { layer: 'fore', d: band(yFo, 6, -90, 905), fill: '@heath.2' },
        ],
        water: [], place: [], scatter: [], actors: [], flocks: [],
      };
      if (TR) for (const [layer, y0, y1] of [['mid', H + 4, yN + 4], ['near', yN - 2, yFo + 4], ['fore', yFo - 4, 905]]) d.ground.push({ layer, d: rideStrip(TR, y0, y1), fill: sand(y0, y1) });
      if (P) {
        d.ground.push({ layer: 'mid', d: pond(P.x0 - 10, P.x1 + 10, P.y0 - 5, P.y1 + 7, seed0 + 6), fill: '@bank.0' });
        d.water.push({ layer: 'mid', d: pond(P.x0, P.x1, P.y0, P.y1, seed0 + 7), y0: P.y0, y1: P.y1, base: ['#86aab0', '#456e78', '#26444c'], reflect: true, shimmer: 22, lightPath: true });
      }
      const F = d.place, S = d.scatter, A = d.actors;
      // the far woods and belts of pine and birch (static, hazed)
      S.push(scatterRule({ obj: { 'tree.far-pine': 2, 'tree.far-birch': 1 }, layer: 'horizon', seed: 1, area: { rect: [-160, H - 2, 1760, H + 6] }, n: 14, minGap: 44, s: [0.3, 0.56], variant: 0, mask: { noise: { scale: 240, cut: 0.3 } } }));
      S.push(scatterRule({ obj: { 'tree.far-pine': 3, 'tree.far-birch': 2 }, layer: 'far', seed: 2, area: { rect: [-160, yF + 2, 1760, yF + 14] }, n: 12, minGap: 40, s: [0.22, 0.42], variant: 1, tint: { col: '#4a5a4a', k: [0.08, 0.08] }, mask: { noise: { scale: 300, cut: 0.4 }, avoid: avoids(pondAv, { rect: [num(p.sx, 760) - 90, H - 40, num(p.sx, 760) + 90, yF + 30] }) } }));
      // the signature: a veteran Scots pine standing alone on the open heath, younger pines near it
      const SX = num(p.sx, 760), SS = num(p.ss, 0.42);
      F.push({ obj: 'tree.pine-veteran', x: SX, y: yF + 40, s: SS, layer: 'far', variant: 1, seed: 3, anim: false, flip: SX > 800 });
      F.push({ obj: 'tree.pine-veteran', x: SX + 70, y: yF + 32, s: K(SS * 0.42), layer: 'far', variant: 1, seed: 4, anim: false, flip: SX <= 800 });
      F.push({ obj: 'tree.pine-veteran', x: SX - 96, y: yF + 36, s: K(SS * 0.3), layer: 'far', variant: 1, flip: true, seed: 5, anim: false });
      // the heath carpet far to near (heather and grass; summer wildflowers), with the ride and the pond kept clear. Far, near and fore
      // share variants 0 and 1 (near and fore have no haze, so they share sprites), the mid layer 2 and 3, and one olive-tinted drift
      // in the mid heath gives the big carpets their second tint, so the whole carpet stays a dozen or so distinct sprites.
      const bloom = {};   // the heath's summer colour is the heather's own bloom
      S.push(scatterRule({ obj: { 'plant.heather': 6, 'plant.grass': 2 }, layer: 'far', seed: 6, area: { rect: [-160, yF + 4, 1760, yM] }, n: 160, minGap: 12, s: [0.26, 0.46], sByY: [[yF, 0.8], [yM, 1.2]], variant: 0, mask: { avoid: avoids(tAv(H, yM + 10, 6), pondAv) } }));
      S.push(scatterRule({ obj: { 'plant.heather': 7, 'plant.grass': 2 }, layer: 'mid', seed: 7, area: { rect: [-160, yM + 4, 1760, yN] }, n: 200, minGap: 14, s: [0.42, 0.72], sByY: [[yM, 0.8], [yN, 1.2]], variant: [2, 3], mask: { avoid: avoids(tAv(yM, yN + 10, 10), pondAv) } }));
      S.push(scatterRule({ obj: { 'plant.heather': 3, 'plant.grass': 1 }, layer: 'mid', seed: 15, area: { rect: [-160, yM + 4, 1760, yN] }, n: 50, minGap: 14, s: [0.42, 0.72], sByY: [[yM, 0.8], [yN, 1.2]], variant: 1, tint: { col: '#8a7a40', k: [0.09, 0.11] }, mask: { noise: { scale: 260, cut: 0.45 }, avoid: avoids(tAv(yM, yN + 10, 10), pondAv) } }));
      S.push(scatterRule({ obj: { 'plant.heather': 7, 'plant.grass': 3 }, layer: 'near', seed: 8, area: { rect: [-160, yN + 4, 1760, yFo] }, n: 210, minGap: 20, s: [0.7, 1.15], sByY: [[yN, 0.8], [yFo, 1.2]], variant: [0, 1], mask: { avoid: avoids(tAv(yN, yFo + 10, 18)) } }));
      S.push(scatterRule({ obj: Object.assign({ 'plant.heather': 6, 'plant.grass': 2 }, bloom), layer: 'fore', seed: 9, area: { rect: [-160, yFo + 4, 1760, 905] }, n: 120, minGap: 28, s: [1.1, 1.9], sByY: [[yFo, 0.85], [905, 1.2]], variant: [0, 1], mask: { avoid: avoids(tAv(yFo, 905, 14)) } }));
      S.push(scatterRule({ obj: 'plant.grass', layer: 'front', seed: 10, area: { rect: [-160, 872, 1760, 906] }, n: 46, minGap: 22, s: [1.3, 1.9], variant: [2, 3], anim: 'strip', mask: { avoid: avoids(tAv(860, 906, 0)) } }));
      // gorse bushes through the mid and near heath, stonechats and a Dartford warbler on their tops
      const gorse = [[0.08, yN - 6, 0.36], [0.34, yN + 4, 0.42], [0.62, yN - 2, 0.38], [0.44, yN + 66, 0.62], [0.95, yN + 62, 0.7]];
      gorse.forEach(([fx, y, sc], i) => {
        let x = R(-60 + fx * 1720 + (r() - 0.5) * 60);
        if (TR) { const q = rideX(TR, y); if (Math.abs(x - q[0]) < q[2] / 2 + 70) x = R(q[0] + (x < q[0] ? -1 : 1) * (q[2] / 2 + 80)); }
        F.push({ obj: 'plant.gorse', x, y: R(y), s: K(sc * (0.85 + r() * 0.3)), layer: 'near', variant: 0, flip: i % 3 === 0, seed: 20 + i, anim: false });
        if (i === 2 || i === 4) F.push({ obj: 'bird.stonechat', x: x + 6, y: R(y - sc * 100), s: K(0.8 + sc * 0.4), layer: 'near', variant: i === 2 ? 0 : 1, flip: i === 4, seed: 40 + i });
        if (i === 1 && !winter) F.push({ obj: 'bird.dartford-warbler', x: x - 10, y: R(y - sc * 96), s: 0.85, layer: 'near', flip: true, seed: 47 });
      });
      // bracken drifts at the sides
      S.push(scatterRule({ obj: 'plant.bracken', layer: 'near', seed: 11, area: { rect: [1260, yN + 40, 1760, yFo] }, n: 3, minGap: 80, s: [0.5, 1.05], variant: [0, 1] }));
      S.push(scatterRule({ obj: 'plant.bracken', layer: 'near', seed: 12, area: { rect: [-160, yN + 50, 320, yFo] }, n: 2, minGap: 80, s: [0.5, 1.05], variant: [0, 1] }));
      // stones and puddles along the sandy ride
      if (TR) {
        const q1 = rideX(TR, yN + 70), q2 = rideX(TR, yFo + 50);
        F.push({ obj: 'rock.stones', x: R(q1[0] - q1[2] * 0.2), y: yN + 70, s: 0.6, layer: 'near', variant: 0, seed: 50 }, { obj: 'rock.stones', x: R(q2[0] + q2[2] * 0.25), y: yFo + 50, s: 1, layer: 'fore', variant: 0, seed: 51, flip: true });
        if (winter || autumn || spring) F.push({ obj: 'ground.puddle', x: R(q2[0] - q2[2] * 0.12), y: yFo + 30, s: 0.9, layer: 'fore', variant: 1, seed: 52 });
      }
      // trees: birch groups and pines in the near heath (a grove when the view is among the birches)
      const grove = has(p, 'birches');
      const nearTrees = grove ? [[0.12, yN + 30, 0.9], [0.3, yN + 10, 0.66], [0.66, yN + 16, 0.72], [0.86, yN + 40, 1], [0.52, yN - 4, 0.46]] : [[0.78, yN + 24, 0.62], [0.73, yN + 12, 0.48], [0.1, yN + 36, 0.56]];
      nearTrees.forEach(([fx, y, sc], i) => {
        let x = R(-80 + fx * 1760);
        if (TR) { const q = rideX(TR, y); if (Math.abs(x - q[0]) < q[2] / 2 + 60) x = R(q[0] + (x < q[0] ? -1 : 1) * (q[2] / 2 + 70)); }
        F.push({ obj: i === 2 && !grove ? 'tree.pine-veteran' : 'tree.birch-heath', x, y: R(y), s: i === 2 && !grove ? K(sc * 0.9) : K(sc), layer: 'near', variant: i === 2 && !grove ? 1 : 1 + (i % 2), flip: i % 2 === 1, seed: 60 + i, anim: i < 2 ? { sway: { k: 0.7 } } : false });
      });
      // the framing trees
      const fr = p.frame || 'pine-birch';
      if (fr !== 'open') {
        const L = fr === 'pine-birch' || fr === 'birches' ? 'tree.birch-heath' : 'tree.pine-veteran', Rt = fr === 'birch-pine' || fr === 'birches' ? 'tree.birch-heath' : 'tree.pine-veteran';
        F.push({ obj: L, x: 150, y: 902, s: L === 'tree.birch-heath' ? 1.2 : 1.05, layer: 'front', variant: 1, flip: true, seed: 70, anim: L === 'tree.birch-heath' ? { sway: { k: 0.8 } } : false });
        F.push({ obj: Rt, x: 1530, y: 906, s: Rt === 'tree.birch-heath' ? 1.15 : 1.15, layer: 'fore', variant: Rt === 'tree.birch-heath' ? 2 : 0, seed: 71, anim: false });
      }
      // a fallen birch limb in the heather (the detail view)
      if (has(p, 'log')) {
        F.push({ obj: 'ground.log', x: 760, y: 846, s: 1.5, layer: 'fore', variant: 0, seed: 72 });
        F.push({ obj: 'ground.leaves', x: 690, y: 862, s: 1.2, layer: 'fore', variant: autumn ? 1 : 0, seed: 73 });
        F.push({ obj: winter ? 'bird.robin' : 'bird.stonechat', x: 790, y: 806, s: 1.7, layer: 'fore', variant: 0, seed: 74 });
        F.push({ obj: 'rock.boulder', x: 940, y: 868, s: 0.7, layer: 'fore', variant: 1, seed: 75, flip: true });
      }
      // the pond: birches on its far bank (mirrored), reeds in the margins, ducks on the water
      if (P) {
        F.push({ obj: 'tree.birch-heath', x: R(P.x0 + PW * 0.62), y: P.y0 + 4, s: 0.28, layer: 'mid', variant: 1, seed: 80, anim: false, reflect: true });
        F.push({ obj: 'tree.birch-heath', x: R(P.x0 + PW * 0.75), y: P.y0 + 2, s: 0.22, layer: 'mid', variant: 1, flip: true, seed: 81, anim: false, reflect: true });
        S.push(scatterRule({ obj: { 'plant.heather': 3, 'plant.grass': 2 }, layer: 'mid', seed: 13, area: { rect: [R(P.x0 - 30), P.y0 - 38, R(P.x1 + 30), P.y0 + 2] }, n: 24, minGap: 16, s: [0.34, 0.52], variant: [2, 3], reflect: true }));
        S.push(scatterRule({ obj: 'plant.reed', layer: 'mid', seed: 14, area: { rect: [R(P.x0 - 6), R(P.y1 - 18), R(P.x0 + PW * 0.3), P.y1 + 8] }, n: 5, minGap: 12, s: [0.28, 0.48], variant: 0, reflect: true }));
        if (!winter) {
          A.push({ obj: 'bird.mallard', layer: 'mid', path: [[R(P.x0 + PW * 0.2), R(P.y0 + PW * 0.08)], [R(P.x0 + PW * 0.5), R(P.y0 + PW * 0.09)]], speed: 3, loop: 'pingpong', s: 0.38, variant: 0, seed: 82, offset: 0.1 });
          A.push({ obj: 'bird.mallard', layer: 'mid', path: [[R(P.x0 + PW * 0.6), R(P.y0 + PW * 0.11)], [R(P.x0 + PW * 0.8), R(P.y0 + PW * 0.1)]], speed: 2.5, loop: 'pingpong', s: 0.36, variant: 1, seed: 83, offset: 0.6 });
        }
        if (summer || spring) A.push({ obj: 'animal.dragonfly', layer: 'mid', path: [[R(P.x0 + 40), P.y0 - 20], [R(P.x0 + PW * 0.5), P.y0 - 36], [R(P.x1 - 40), P.y0 - 14]], speed: 40, loop: 'pingpong', s: 0.6, variant: 0, seed: 84 });
      }
      // conservation cattle grazing (Belted Galloways among them)
      if (has(p, 'cattle')) {
        const cx = num(p.px, 420) > 800 ? 380 : 1080;
        [[0, 6, 0.46, 0], [110, -4, 0.4, 2], [250, 10, 0.52, 0], [-80, -8, 0.36, 2]].forEach(([dx, dy, sc, v], i) => F.push({ obj: 'animal.cattle', x: cx + dx, y: yM + 34 + dy, s: sc, layer: 'mid', variant: v, flip: i % 2 === 1, seed: 90 + i }));
      }
      // a roe deer at the edge of the trees (dawn and dusk views)
      if (has(p, 'deer')) {
        F.push({ obj: 'animal.deer', x: 1240, y: yM + 20, s: 0.5, layer: 'mid', variant: 0, seed: 95 });
        F.push({ obj: 'animal.deer', x: 1300, y: yM + 26, s: 0.42, layer: 'mid', variant: 1, flip: true, seed: 96 });
      }
      // rabbits by the ride
      F.push({ obj: 'animal.rabbit', x: TR ? R(rideX(TR, yN + 110)[0] - 150) : 560, y: yN + 110, s: 0.9, layer: 'near', variant: 0, seed: 97 });
      F.push({ obj: 'animal.rabbit', x: TR ? R(rideX(TR, yN + 120)[0] + 170) : 1060, y: yN + 120, s: 0.8, layer: 'near', variant: 0, flip: true, seed: 98 });
      if (winter) F.push({ obj: 'bird.robin', x: 1222, y: yFo + 6, s: 1.3, layer: 'near', variant: 0, seed: 99 }, { obj: 'bird.robin', x: 620, y: yFo + 12, s: 1, layer: 'near', variant: 1, flip: true, seed: 100 });
      // people on the ride (tiny anonymous silhouettes): fewer at dusk
      if (TR) {
        const walk = [['person.dog-walker', 'mid', H + 30, yN, 7, 0.5], ['person.jogger', 'mid', H + 20, yN - 10, 12, 0.48], ['person.walker', 'near', yN + 10, yFo - 30, 9, 0.8]];
        if (has(p, 'cyclist')) walk.push(['person.cyclist', 'mid', H + 20, yN + 10, 16, 0.5]);
        if (has(p, 'family')) walk.push(['person.walker', 'near', yN, yFo, 7, 0.8]);
        walk.slice(0, dusk ? 2 : 5).forEach(([obj, layer, y0, y1, sp, sc], i) => {
          const path = ridePath(TR, y0, y1, 22);
          A.push({ obj, layer, path: i % 2 ? path.slice().reverse() : path, speed: sp, loop: 'pingpong', s: sc, sByY: [[y0, K(sc * 0.75)], [y1, K(sc * 1.25)]], seed: 110 + i, offset: K(0.2 + i * 0.23), variant: i % 4 });
        });
      } else {
        A.push({ obj: 'person.dog-walker', layer: 'mid', path: [[200, yM + 40], [700, yM + 46]], speed: 6, loop: 'pingpong', s: 0.5, seed: 110, offset: 0.3 });
        A.push({ obj: 'person.walker', layer: 'mid', path: [[1500, yM + 30], [1000, yM + 36]], speed: 7, loop: 'pingpong', s: 0.48, variant: 2, seed: 111, offset: 0.7 });
      }
      // light aircraft out of Blackbushe; small birds; geese in autumn; a nightjar and a bat-dark sky at dusk
      if (has(p, 'aircraft')) {
        A.push({ obj: 'vehicle.light-aircraft', layer: 'far', path: [[-220, R(H * 0.4)], [1820, R(H * 0.28)]], speed: 26, loop: 'loop', s: 0.9, seed: 120, offset: 0.3 });
        A.push({ obj: 'vehicle.light-aircraft', layer: 'far', path: [[1820, R(H * 0.5)], [-220, R(H * 0.58)]], speed: 20, loop: 'loop', s: 0.6, variant: 0, seed: 121, offset: 0.75 });
      }
      d.flocks.push({ obj: 'bird.small-flight', n: winter ? 9 : 6, area: [260, R(H * 0.3), 1240, R(H * 0.58)], speed: 26, s: 0.55, seed: 122, layer: 'far' });
      d.flocks.push({ obj: 'bird.small-flight', n: 3, area: [640, H - 110, 1100, H - 50], speed: 34, s: 0.45, seed: 123, layer: 'far' });
      if (autumn || winter) d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [900, R(H * 0.22), 1500, R(H * 0.44)], speed: 30, s: 0.5, seed: 124, layer: 'far' });
      if (has(p, 'nightjar') && !winter) {
        A.push({ obj: 'bird.nightjar', layer: 'mid', path: [[300, H - 40], [700, H - 90], [1100, H - 30], [1400, H - 70]], speed: 30, loop: 'pingpong', s: 0.8, seed: 125 });
        A.push({ obj: 'bird.nightjar', layer: 'far', path: [[1300, H - 60], [900, H - 110]], speed: 26, loop: 'pingpong', s: 0.6, seed: 126, offset: 0.5 });
      }
      insects(d, p, [380, yN + 30, 1180, yFo + 40], 'near', 130);
      return d;
    },
  });

  /* =====================================================================
     yateley-pool: Wyndham's Pool
     ===================================================================== */
  const POOL_PALETTE = {
    base: { wood: ['#33473a', '#26382e', '#4a6250'], bank: ['#5a5034', '#463e28'], grass: ['#6a7e44', '#52683a', '#3e5230'], path: ['#b49c74', '#c8b48c'] },
    spring: { wood: ['#3a5640', '#2c4434', '#5a7c52'], grass: ['#74904a', '#5a7640', '#445c32'] },
    summer: { wood: ['#30463a', '#24362c', '#466052'], grass: ['#6a7e44', '#52683a', '#3e5230'] },
    autumn: { wood: ['#5a5232', '#463e28', '#7e6a3a'], grass: ['#8a7e4a', '#6c623a', '#52482e'], bank: ['#62543a', '#4a3e2a'] },
    winter: { wood: ['#3c4642', '#2e3834', '#56625c'], grass: ['#8a8c7a', '#6c705e', '#545848'], path: ['#a89c88', '#c2b8a4'] },
  };
  sceneArchetypeDefine('yateley-pool', {
    kits: ['temperate', 'water', 'birds', 'people'],
    params: { id: 'id', season: SEASONS, at: AT, heading: 'number', hz: 'number', wl: 'number', px: 'number', sx: 'number', ss: 'number', frame: ['birch-pine', 'pine-birch', 'oak-pine', 'open'], features: 'list' },
    meta: (p) => ({ id: String(p.id), label: "Wyndham's Pool", site: "Wyndham's Pool", tags: ['uk', 'yateley', 'pond', 'woodland', 'reeds', 'scots pine'], mood: 'calm', colour: 'teal' }),
    build: (p) => {
      const s = p.season || 'summer', winter = s === 'winter', summer = s === 'summer', spring = s === 'spring', autumn = s === 'autumn';
      const H = num(p.hz, 470), W1 = num(p.wl, 720), r = rr(p, 'pool'), seed0 = sceneHash(String(p.id)) % 5000 + 2000;
      const dusk = p.at === 'dusk' || p.at === 'sunset' || p.at === 'night', dawn = p.at === 'dawn';
      // the water: from the far bank (H) to a curving near shore around W1
      const shore = (x) => R(W1 + Math.sin((x + num(p.px, 0)) / 300) * 22 + (x > 1200 ? (x - 1200) * 0.12 : 0) - (x < 300 ? (300 - x) * 0.08 : 0));
      let wd = `M-160 ${H + 2}Q400 ${H - 4} 800 ${H + 3}T1760 ${H}V${shore(1760)}`;
      for (let x = 1700; x >= -160; x -= 80) wd += `L${x} ${shore(x)}`;
      wd += 'Z';
      let bd = `M-160 905V${shore(-160) - 6}`;
      for (let x = -80; x <= 1760; x += 80) bd += `L${x} ${shore(x) - 6}`;
      bd += 'V905Z';
      const d = {
        v: 1, id: String(p.id), view: { lat: 51.332, lon: -0.822, heading: num(p.heading, 20), fov: 78, horizon: H, lift: 1 },
        at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, weather: 'live', particles: 'season',
        palette: POOL_PALETTE,
        layers: [{ id: 'horizon', depth: 0.08, haze: 0.5 }, { id: 'far', depth: 0.2, haze: 0.22 }, { id: 'mid', depth: 0.45, haze: 0.08 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
        sky: { stars: 200, clouds: { n: 5, y: [40, Math.max(160, H - 220)], speed: 5 }, sunR: 24, moonR: 20 },
        ground: [
          { layer: 'horizon', d: treeline(H - 60, seed0 + 1, 1.6, 0.6, H + 4), fill: '@wood.1' },
          { layer: 'horizon', d: treeline(H - 24, seed0 + 2, 1.1, 0.35, H + 6), fill: '@wood.0' },
          { layer: 'far', d: `M-160 ${H + 8}V${H - 2}Q600 ${H - 8} 1000 ${H - 1}T1760 ${H - 3}V${H + 8}Z`, fill: '@bank.0' },
          { layer: 'near', d: bd, fill: { lin: [[0, '@bank.0'], [0.12, '@grass.0'], [1, '@grass.2']], y1: W1 - 30, y2: 905 } },
          { layer: 'near', d: `M-160 ${W1 + 70}Q300 ${W1 + 56} 700 ${W1 + 74}T1760 ${W1 + 66}V${W1 + 92}Q1100 ${W1 + 98} 700 ${W1 + 94}T-160 ${W1 + 96}Z`, fill: { lin: [[0, '@path.0'], [1, '@path.1']], y1: W1 + 56, y2: W1 + 98 } },
        ],
        water: [{ layer: 'mid', d: wd, y0: H, y1: W1 + 20, base: ['#7ea0a0', '#3e6466', '#1e3a3c'], reflect: true, shimmer: 30, lightPath: true }],
        place: [], scatter: [], actors: [], flocks: [],
      };
      const F = d.place, S = d.scatter, A = d.actors;
      // the far bank: the wood of pine and birch, mirrored in the pool
      S.push(scatterRule({ obj: 'tree.pond-wood', layer: 'far', seed: 1, area: { rect: [-160, H - 2, 1760, H + 4] }, n: 18, minGap: 36, s: [0.22, 0.56], variant: [0, 1], reflect: true, mask: { noise: { scale: 220, cut: 0.35 } } }));
      const SX = num(p.sx, 1040), SS = num(p.ss, 0.36);
      F.push({ obj: 'tree.pool-pine', x: SX, y: H + 2, s: SS, layer: 'far', variant: 0, seed: 2, anim: false, reflect: true });
      F.push({ obj: 'tree.pool-pine', x: SX + 120, y: H + 1, s: K(SS * 0.72), layer: 'far', variant: 0, seed: 3, anim: false, reflect: true, flip: true });
      F.push({ obj: 'tree.pond-birch', x: SX - 210, y: H + 3, s: K(SS * 1.4), layer: 'far', variant: 0, seed: 4, anim: false, reflect: true });
      F.push({ obj: 'tree.pool-pine', x: SX - 520, y: H + 2, s: K(SS * 0.62), layer: 'far', variant: 0, seed: 5, anim: false, reflect: true });
      // far-bank reeds and the boathouse-less natural margin
      S.push(scatterRule({ obj: { 'plant.reed': 2, 'plant.bulrush': 1, 'plant.grass': 1 }, layer: 'far', seed: 2, area: { rect: [-160, H + 1, 1760, H + 8] }, n: 40, minGap: 18, s: [0.18, 0.3], variant: 0, reflect: true, tint: { col: '#8a7a40', k: [0.08, 0.08] } }));
      // lilies (summer and spring), fish rings
      if (!winter) S.push(scatterRule({ obj: 'water.lily', layer: 'mid', seed: 3, area: { rect: [R(220 + r() * 300), H + 70, R(820 + r() * 200), H + 150] }, n: 7, minGap: 22, s: [0.22, 0.62], sByY: [[H + 70, 0.8], [H + 150, 1.2]], variant: [0, 1] }));
      F.push({ obj: 'water.fish-ring', x: R(500 + r() * 300), y: H + 110, s: 0.5, layer: 'mid', seed: 6 }, { obj: 'water.fish-ring', x: R(1000 + r() * 300), y: H + 170, s: 0.6, layer: 'mid', variant: 1, seed: 7 });
      // the near bank: reeds and bulrush beds, grass, ferns under the trees, the path
      S.push(scatterRule({ obj: { 'plant.reed': 3, 'plant.bulrush': 2 }, layer: 'near', seed: 4, area: { rect: [-160, W1 - 18, 520, W1 + 30] }, n: 40, minGap: 11, s: [0.6, 1], variant: [0, 1], anim: 'strip', reflect: true }));
      S.push(scatterRule({ obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'near', seed: 5, area: { rect: [1180, W1 - 10, 1760, W1 + 40] }, n: 30, minGap: 11, s: [0.6, 1], variant: [0, 1], anim: 'strip', reflect: true }));
      S.push(scatterRule({ obj: { 'plant.grass': 5, 'plant.wildflowers': summer ? 0.5 : 0.15 }, layer: 'near', seed: 6, area: { rect: [-160, W1 + 8, 1760, W1 + 66] }, n: 190, minGap: 14, s: [0.5, 0.9], sByY: [[W1, 0.8], [W1 + 66, 1.2]], variant: [0, 1], tint: { col: '#8a7a40', k: [0, 0.09] } }));
      S.push(scatterRule({ obj: Object.assign({ 'plant.grass': 4 }, spring ? { 'plant.bluebells': 0.8 } : {}), layer: 'fore', seed: 7, area: { rect: [-160, W1 + 96, 1760, 905] }, n: 150, minGap: 22, s: [0.9, 1.5], sByY: [[W1 + 96, 0.85], [905, 1.2]], variant: [0, 1], tint: { col: '#7a6a3a', k: [0, 0.09] } }));
      S.push(scatterRule({ obj: 'plant.grass', layer: 'front', seed: 8, area: { rect: [-160, 874, 1760, 906] }, n: 40, minGap: 24, s: [1.3, 1.9], variant: [2, 3], anim: 'strip' }));
      [[300, W1 + 150, 1.1], [700, W1 + 170, 0.9], [1060, W1 + 140, 1.2], [1380, W1 + 160, 1], [90, W1 + 130, 0.8]].forEach(([x, y, sc], i) => F.push({ obj: 'plant.fern', x, y: R(Math.min(900, y)), s: sc, layer: 'fore', variant: 0, flip: i % 2 === 1, seed: 90 + i }));
      if (autumn) S.push(scatterRule({ obj: 'ground.leaves', layer: 'fore', seed: 9, area: { rect: [-160, W1 + 100, 1760, 900] }, n: 10, minGap: 90, s: [0.8, 1.3], variant: [0, 1] }));
      // anglers' swims on the near bank, an angler at one (two at dawn)
      const swims = has(p, 'anglers') ? [[420, W1 + 4, 0.9], [1120, W1 + 10, 0.8]] : [[1120, W1 + 10, 0.8]];
      swims.forEach(([x, y, sc], i) => {
        F.push({ obj: 'ground.swim', x, y, s: sc, layer: 'near', variant: 0, seed: 10 + i, flip: i === 1 });
        if (!dusk || dawn) F.push({ obj: 'person.angler', x: x + 10, y: y - 2, s: K(sc * 0.75), layer: 'near', variant: 0, flip: x > 800, seed: 12 + i });
      });
      // logs and a heron on the margin, a kingfisher on a reed stem
      F.push({ obj: 'ground.log', x: 260, y: W1 + 4, s: 0.8, layer: 'near', variant: 1, seed: 14, reflect: true });
      F.push({ obj: 'bird.heron', x: 1460, y: W1 - 4, s: 0.6, layer: 'near', variant: 0, seed: 15, flip: true, reflect: true });
      if (has(p, 'kingfisher')) F.push({ obj: 'bird.kingfisher', x: 300, y: W1 - 14, s: 1.1, layer: 'near', variant: 0, seed: 16 });
      // the framing trees (pool birch and Scots pine) and a near-bank tree group
      const fr = p.frame || 'birch-pine';
      const fL = fr === 'birch-pine' ? 'tree.birch-heath' : fr === 'oak-pine' ? 'tree.pond-oak' : 'tree.pine-veteran', fR = fr === 'pine-birch' ? 'tree.birch-heath' : 'tree.pine-veteran';
      if (fr !== 'open') {
        F.push({ obj: fL, x: 110, y: 904, s: fL === 'tree.pond-oak' ? 2.1 : fL === 'tree.birch-heath' ? 1.45 : 1.15, layer: 'front', variant: 0, seed: 17, anim: { sway: { k: 0.7 } }, flip: true });
        F.push({ obj: fR, x: 1520, y: 906, s: fR === 'tree.birch-heath' ? 1.35 : 1.15, layer: 'fore', variant: 0, seed: 18, anim: false });
      }
      F.push({ obj: 'tree.pond-alder', x: 1300, y: W1 + 30, s: 0.7, layer: 'near', variant: 0, seed: 19, anim: false, reflect: true });
      F.push({ obj: 'tree.pond-birch', x: 640, y: W1 + 50, s: 0.62, layer: 'near', variant: 1, seed: 20, anim: false, flip: true });
      if (has(p, 'margin')) {   // the woodland margin: big trees right at the water, holly beneath
        F.push({ obj: 'tree.pond-oak', x: 900, y: W1 + 60, s: 1.7, layer: 'near', variant: 0, seed: 21, anim: false });
        F.push({ obj: 'plant.holly', x: 820, y: W1 + 70, s: 0.7, layer: 'near', variant: 0, seed: 22 }, { obj: 'plant.holly', x: 1010, y: W1 + 76, s: 0.6, layer: 'near', variant: 0, seed: 23, flip: true });
        F.push({ obj: 'animal.squirrel', x: 960, y: W1 + 90, s: 0.8, layer: 'near', seed: 24 });
      }
      // waterbirds
      const wy = (k) => R(H + (W1 - H) * k);
      A.push({ obj: 'bird.mallard', layer: 'mid', path: [[540, wy(0.45)], [820, wy(0.42)]], speed: 5, loop: 'pingpong', s: 0.46, variant: 0, seed: 30, offset: 0.2 });
      A.push({ obj: 'bird.mallard', layer: 'mid', path: [[600, wy(0.5)], [860, wy(0.5)]], speed: 4.5, loop: 'pingpong', s: 0.44, variant: 1, seed: 31, offset: 0.6 });
      A.push({ obj: 'bird.coot', layer: 'mid', path: [[1080, wy(0.3)], [1300, wy(0.32)]], speed: 4, loop: 'pingpong', s: 0.36, seed: 32, offset: 0.4 });
      A.push({ obj: 'bird.moorhen', layer: 'mid', path: [[300, wy(0.7)], [180, wy(0.74)]], speed: 3.5, loop: 'pingpong', s: 0.42, seed: 33, offset: 0.3 });
      if (!dusk) A.push({ obj: 'bird.swan', layer: 'mid', path: [[1400, wy(0.55)], [960, wy(0.6)]], speed: 3, loop: 'pingpong', s: 0.6, variant: 0, seed: 34, offset: 0.5 });
      if (spring || summer) A.push({ obj: 'bird.grebe', layer: 'mid', path: [[200, wy(0.22)], [520, wy(0.2)]], speed: 3, loop: 'pingpong', s: 0.4, seed: 35, offset: 0.7 });
      if (summer || spring) {
        A.push({ obj: 'animal.dragonfly', layer: 'near', path: [[300, W1 - 40], [520, W1 - 70], [420, W1 - 30], [640, W1 - 50]], speed: 40, loop: 'pingpong', s: 0.8, variant: 0, seed: 36 });
        A.push({ obj: 'animal.dragonfly', layer: 'near', path: [[1200, W1 - 30], [1000, W1 - 60], [1100, W1 - 20]], speed: 36, loop: 'pingpong', s: 0.7, variant: 1, seed: 37 });
      }
      if (has(p, 'kingfisher')) A.push({ obj: 'bird.kingfisher-flight', layer: 'mid', path: [[200, wy(0.6)], [900, wy(0.55)], [1500, wy(0.62)]], speed: 60, loop: 'pingpong', s: 1, seed: 38 });
      // people on the bank path
      const walkers = [['person.dog-walker', 900, 60, 6], ['person.jogger', 1500, 200, 11], ['person.walker', 400, 1200, 7], ['person.walker', 1300, 700, 5]];
      walkers.slice(0, dusk ? 1 : has(p, 'busy') ? 4 : 3).forEach(([obj, xa, xb, sp], i) => A.push({ obj, layer: 'near', path: [[xa, W1 + 84], [xb, W1 + 86]], speed: sp, loop: 'pingpong', s: 0.95, seed: 40 + i, offset: K(0.15 + i * 0.27), variant: i % 4 }));
      if (winter) F.push({ obj: 'bird.robin', x: 1380, y: W1 + 110, s: 1.2, layer: 'fore', variant: 0, seed: 45 });
      d.flocks.push({ obj: 'bird.small-flight', n: 6, area: [300, R(H * 0.3), 1300, R(H * 0.6)], speed: 24, s: 0.5, seed: 46, layer: 'far' });
      if (autumn || winter) d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [700, R(H * 0.18), 1400, R(H * 0.4)], speed: 28, s: 0.5, seed: 47, layer: 'far' });
      insects(d, p, [360, W1 + 20, 1240, W1 + 120], 'near', 50);
      return d;
    },
  });

  /* =====================================================================
     yateley-green: Yateley Green and the village at Church End
     ===================================================================== */
  const GREEN_PALETTE = {
    base: { woods: ['#4f6a4c', '#62805a'], far: ['#86a06a', '#6f8c55'], grass: ['#5f8f3a', '#3f6b31', '#8db352'], path: ['#b8aa8a', '#9c8e70', '#d2c6a8'], lane: ['#6e6c68', '#8a8884'], bank: ['#6a5c3a'] },
    spring: { woods: ['#557552', '#6a8c5e'], far: ['#8fab6c', '#76964f'], grass: ['#6f9f40', '#4c7a37', '#a6c95e'] },
    autumn: { woods: ['#7a6a3c', '#8e7c48'], far: ['#9a9a62', '#7f7e4c'], grass: ['#8a8a45', '#5f6a35', '#b5a65c'], path: ['#ae9c78', '#8e7c5c', '#c8b690'] },
    winter: { woods: ['#6a6870', '#7e7c80'], far: ['#9aa096', '#848c7e'], grass: ['#8d9277', '#6b735a', '#b3b59c'], path: ['#a89c88', '#8a7e6c', '#c4b8a6'], bank: ['#5a5040'] },
  };
  sceneArchetypeDefine('yateley-green', {
    kits: ['temperate', 'birds', 'people', 'water'],
    params: { id: 'id', season: SEASONS, at: AT, heading: 'number', hz: 'number', cx: 'number', cs: 'number', clayer: ['far', 'mid'], px: 'number', pw: 'number', features: 'list' },
    meta: (p) => ({ id: String(p.id), label: 'Yateley Green', site: 'Yateley Green', tags: ['uk', 'yateley', 'village green', 'pond', 'church', 'cottages'], mood: 'calm', colour: 'green' }),
    build: (p) => {
      const s = p.season || 'summer', winter = s === 'winter', summer = s === 'summer', spring = s === 'spring', autumn = s === 'autumn';
      const H = num(p.hz, 480), r = rr(p, 'green'), seed0 = sceneHash(String(p.id)) % 5000 + 3000;
      const dusk = p.at === 'dusk' || p.at === 'sunset' || p.at === 'night';
      const yL = H + 40, yM = H + 90, yN = H + 220, yFo = 800;
      const PW = num(p.pw, 640), PX = num(p.px, 760);
      const P = has(p, 'pond') ? { x0: PX - PW / 2, x1: PX + PW / 2, y0: yM + 40, y1: yM + 40 + R(PW * 0.2) } : null;
      const pondAv = P ? { rect: [R(P.x0 - 46), R(P.y0 - 46), R(P.x1 + 46), R(P.y1 + 30)] } : null;
      const CX = num(p.cx, 1150), CS = num(p.cs, 0.78), CL = p.clayer || 'far';
      const d = {
        v: 1, id: String(p.id), view: { lat: 51.343, lon: -0.829, heading: num(p.heading, 100), fov: 78, horizon: H, lift: 1 },
        at: p.at || 'afternoon', season: 'auto', tropic: 'summer', setting: 'natural', signage: false, weather: 'live', particles: 'season',
        palette: GREEN_PALETTE,
        layers: [{ id: 'horizon', depth: 0.08, haze: 0.55 }, { id: 'far', depth: 0.2, haze: 0.24 }, { id: 'mid', depth: 0.45, haze: 0.08 }, { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 }],
        sky: { stars: 200, clouds: { n: 5, y: [40, Math.max(170, H - 160)], speed: 6 }, sunR: 26, moonR: 20 },
        ground: [
          { layer: 'horizon', d: band(H, 3, 0, H + 40), fill: '@far.0' },
          { layer: 'horizon', d: treeline(H + 2, seed0 + 1, 1, 0.15, H + 30), fill: '@woods.0' },
          { layer: 'horizon', d: treeline(H + 8, seed0 + 2, 0.7, 0.1, H + 34), fill: '@woods.1' },
          { layer: 'far', d: band(H + 30, 3, 40, yM + 40), fill: { lin: [[0, '@far.1'], [0.3, '@grass.0'], [1, '@grass.1']], y1: H + 30, y2: yM + 40 } },
          { layer: 'far', d: `M-160 ${yL - 4}Q500 ${yL - 8} 900 ${yL - 3}T1760 ${yL - 6}V${yL + 9}Q1100 ${yL + 12} 700 ${yL + 10}T-160 ${yL + 11}Z`, fill: { lin: [[0, '@lane.1'], [1, '@lane.0']], y1: yL - 8, y2: yL + 12 } },
          { layer: 'mid', d: band(yM, 5, -40, yN + 30), fill: { lin: [[0, '@grass.0'], [1, '@grass.1']], y1: yM, y2: yN + 30 } },
          { layer: 'near', d: band(yN, 6, 60, yFo + 20), fill: { lin: [[0, '@grass.1'], [1, '@grass.0']], y1: yN, y2: yFo + 20 } },
          { layer: 'fore', d: band(yFo, 5, -70, 905), fill: '@grass.1' },
        ],
        water: [], place: [], scatter: [], actors: [], flocks: [],
      };
      // the gravel path across the green, from the lane to the foot
      const px0 = num(p.cx, 1150) > 800 ? 980 : 620, px1 = px0 > 800 ? 1180 : 420;
      d.ground.push({ layer: 'mid', d: `M${px0 - 8} ${yL + 10}L${px0 + 8} ${yL + 10}Q${R((px0 + px1) / 2 + 60)} ${yN - 40} ${px1 + 120} 905H${px1 - 60}Q${R((px0 + px1) / 2 - 20)} ${yN - 40} ${px0 - 8} ${yL + 10}Z`, fill: { lin: [[0, '@path.2'], [1, '@path.0']], y1: yL, y2: 905 } });
      const pathAv = { poly: [[px0 - 30, yL + 6], [px0 + 30, yL + 6], [px1 + 150, 906], [px1 - 90, 906]] };
      if (P) {
        d.ground.push({ layer: 'mid', d: pond(P.x0 - 12, P.x1 + 12, P.y0 - 6, P.y1 + 8, seed0 + 3), fill: '@bank' });
        d.water.push({ layer: 'mid', d: pond(P.x0, P.x1, P.y0, P.y1, seed0 + 4), y0: P.y0, y1: P.y1, base: ['#8fb4a8', '#4f8088', '#244a54'], reflect: true, shimmer: 20, lightPath: true });
      }
      const F = d.place, S = d.scatter, A = d.actors;
      // the signature: St Peter's church (timber tower and spire) at Church End, cottages along the lane
      F.push({ obj: 'landmark.st-peters-yateley', x: CX, y: CL === 'far' ? yL - 6 : yM + 6, s: CS, layer: CL, variant: dusk ? 1 : 0, seed: 1 });
      const cot = has(p, 'village') ? [[-0.95, 0.36, 0], [-0.6, 0.42, 1], [-0.37, 0.28, 0], [0.58, 0.34, 1], [0.98, 0.25, 0], [-1.24, 0.31, 1]] : [[-1.6, 0.27, 1], [-1.33, 0.32, 0], [-1.1, 0.24, 1], [0.7, 0.24, 0]];
      cot.forEach(([dx, sc, v], i) => {
        const x = R(CX + dx * 410 * CS);
        if (x > -120 && x < 1720) F.push({ obj: 'building.green-cottage', x, y: yL - 8 - (i % 2) * 3, s: K(sc * (CL === 'mid' ? 1.4 : 1)), layer: 'far', variant: v, flip: i % 2 === 1, seed: 2 + i });
      });
      // trees beyond the lane and around the green
      S.push(scatterRule({ obj: 'tree.far-broad', layer: 'far', seed: 1, area: { rect: [-160, H + 22, 1760, H + 34] }, n: 22, minGap: 40, s: [0.2, 0.5], variant: [0, 1], tint: { col: '#3a5a2a', k: [0, 0.1] }, mask: { noise: { scale: 260, cut: 0.3 }, avoid: [{ rect: [CX - 220 * CS, H - 20, CX + 220 * CS, H + 40] }] } }));
      // the green: mown grass with wildflowers (one variant set per layer, the fore layer tinted: few distinct sprites)
      const wf = summer || spring ? 1.4 : 1;
      S.push(scatterRule({ obj: 'plant.grass', layer: 'far', seed: 2, area: { rect: [-160, yL + 14, 1760, yM - 6] }, n: 70, minGap: 11, s: [0.16, 0.34], sByY: [[yL, 0.8], [yM, 1.2]], variant: 0, mask: { avoid: avoids(pathAv) } }));
      S.push(scatterRule({ obj: { 'plant.grass': 3, 'plant.wildflowers': wf }, layer: 'mid', seed: 3, area: { rect: [-160, yM + 4, 1760, yN] }, n: 190, minGap: 11, s: [0.3, 0.58], sByY: [[yM, 0.8], [yN, 1.25]], variant: [2, 3], mask: { avoid: avoids(pathAv, pondAv) } }));
      S.push(scatterRule({ obj: { 'plant.grass': 3, 'plant.wildflowers': wf }, layer: 'near', seed: 4, area: { rect: [-160, yN + 4, 1760, yFo] }, n: 200, minGap: 16, s: [0.55, 0.95], sByY: [[yN, 0.85], [yFo, 1.2]], variant: 0, mask: { avoid: avoids(pathAv) } }));
      S.push(scatterRule({ obj: { 'plant.grass': 3, 'plant.wildflowers': wf }, layer: 'fore', seed: 5, area: { rect: [-160, yFo + 4, 1760, 905] }, n: 120, minGap: 22, s: [0.9, 1.5], sByY: [[yFo, 0.85], [905, 1.2]], variant: 1, tint: { col: '#b8a050', k: [0.08, 0.08] }, mask: { avoid: avoids(pathAv) } }));
      S.push(scatterRule({ obj: 'plant.grass', layer: 'front', seed: 6, area: { rect: [-160, 874, 1760, 906] }, n: 34, minGap: 26, s: [1.3, 1.8], variant: [2, 3], anim: 'strip' }));
      if (autumn) S.push(scatterRule({ obj: 'ground.leaves', layer: 'near', seed: 7, area: { rect: [-160, yN + 20, 1760, yFo] }, n: 12, minGap: 50, s: [0.6, 1.3], variant: [0, 1], mask: { noise: { scale: 200, cut: 0.35 } } }));
      // the pond: reeds and bulrushes, alders and a willow on the bank, lilies, fish rings
      if (P) {
        S.push(scatterRule({ obj: 'plant.reed', layer: 'mid', seed: 8, area: { rect: [R(P.x0 + 20), P.y0 - 8, R(P.x0 + PW * 0.4), P.y0 + 2] }, n: 16, minGap: 10, s: [0.32, 0.5], variant: 1, anim: 'strip', reflect: true, tint: { col: '#a09050', k: [0.08, 0.08] } }));
        S.push(scatterRule({ obj: { 'plant.reed': 3, 'plant.bulrush': 1 }, layer: 'mid', seed: 9, area: { rect: [R(P.x1 - PW * 0.3), R(P.y1 - 20), R(P.x1 + 10), P.y1 + 6] }, n: 18, minGap: 15, s: [0.36, 0.9], variant: [0, 1], anim: 'strip', reflect: true }));
        S.push(scatterRule({ obj: 'plant.grass', layer: 'mid', seed: 10, area: { rect: [R(P.x0 + PW * 0.45), P.y0 - 10, R(P.x1 - 20), P.y0 + 2] }, n: 14, minGap: 12, s: [0.3, 0.45], variant: [2, 3], reflect: true }));
        if (!winter) S.push(scatterRule({ obj: 'water.lily', layer: 'mid', seed: 11, area: { rect: [R(P.x0 + PW * 0.15), R(P.y0 + PW * 0.1), R(P.x0 + PW * 0.5), R(P.y1 - 12)] }, n: 10, minGap: 16, s: [0.24, 0.56], variant: [0, 1] }));
        F.push({ obj: 'tree.pond-willow', x: R(P.x0 + 10), y: P.y0 + 4, s: 0.8, layer: 'mid', variant: 0, seed: 20, reflect: true, anim: { sway: { k: 0.8 } } });
        F.push({ obj: 'tree.pond-alder', x: R(P.x0 + PW * 0.72), y: P.y0 + 2, s: 0.62, layer: 'mid', variant: 1, seed: 21, reflect: true, anim: false });
        F.push({ obj: 'water.fish-ring', x: R(P.x0 + PW * 0.6), y: R(P.y0 + PW * 0.12), s: 0.5, layer: 'mid', seed: 22 });
        const wy = k => R(P.y0 + (P.y1 - P.y0) * k), wx = k => R(P.x0 + PW * k);
        A.push({ obj: 'bird.mallard', layer: 'mid', path: [[wx(0.3), wy(0.4)], [wx(0.55), wy(0.36)]], speed: 5, loop: 'pingpong', s: 0.42, variant: 0, seed: 23, offset: 0.2 });
        A.push({ obj: 'bird.mallard', layer: 'mid', path: [[wx(0.35), wy(0.55)], [wx(0.6), wy(0.6)]], speed: 4.5, loop: 'pingpong', s: 0.44, variant: 1, seed: 24, offset: 0.6 });
        A.push({ obj: 'bird.coot', layer: 'mid', path: [[wx(0.62), wy(0.3)], [wx(0.82), wy(0.32)]], speed: 4, loop: 'pingpong', s: 0.36, seed: 25, offset: 0.4 });
        A.push({ obj: 'bird.moorhen', layer: 'mid', path: [[wx(0.85), wy(0.6)], [wx(0.68), wy(0.66)]], speed: 3.5, loop: 'pingpong', s: 0.38, seed: 26, offset: 0.3 });
        A.push({ obj: 'bird.goose', layer: 'mid', path: [[wx(0.2), wy(0.7)], [wx(0.42), wy(0.74)]], speed: 3, loop: 'pingpong', s: 0.4, variant: 0, seed: 27, offset: 0.7 });
        if (!dusk) A.push({ obj: 'bird.swan', layer: 'mid', path: [[wx(0.7), wy(0.72)], [wx(0.45), wy(0.8)]], speed: 2.5, loop: 'pingpong', s: 0.5, variant: 0, seed: 28, offset: 0.1 });
        F.push({ obj: 'bird.heron', x: wx(0.96), y: wy(0.6), s: 0.4, layer: 'mid', variant: 1, seed: 29, flip: true });
      } else {
        // no pond in view: geese grazing the green, a bench group
        F.push({ obj: 'bird.goose', x: 560, y: yM + 60, s: 0.42, layer: 'mid', variant: 0, seed: 23 }, { obj: 'bird.goose', x: 640, y: yM + 70, s: 0.46, layer: 'mid', variant: 1, flip: true, seed: 24 }, { obj: 'bird.goose', x: 600, y: yM + 84, s: 0.44, layer: 'mid', variant: 0, seed: 25 });
        F.push({ obj: 'tree.pond-oak', x: 260, y: yM + 22, s: 0.85, layer: 'mid', variant: 1, seed: 28, anim: false }, { obj: 'tree.pond-alder', x: 1420, y: yM + 16, s: 0.72, layer: 'mid', variant: 0, seed: 29, anim: false, flip: true }, { obj: 'tree.pond-birch', x: 1200, y: yM + 26, s: 0.7, layer: 'mid', variant: 1, seed: 30, anim: false });
        F.push({ obj: 'bird.pigeon', x: 900, y: yN - 20, s: 0.7, layer: 'mid', variant: 0, seed: 26 }, { obj: 'bird.pigeon', x: 940, y: yN - 14, s: 0.7, layer: 'mid', variant: 1, flip: true, seed: 27 });
      }
      // big trees on the green: oaks, a horse chestnut, birches; the framing oak
      const big = has(p, 'birches') ? [['tree.green-birch', 0.06, yN + 60, 1.0], ['tree.green-birch', 0.24, yN + 20, 0.72], ['tree.green-birch', 0.86, yN + 40, 0.9], ['tree.green-oak', 0.98, yN + 70, 0.8]]
        : [['tree.green-oak', 0.92, yN - 10, 0.8], ['tree.green-oak', 0.08, yN + 10, 0.62], ['tree.green-birch', 0.78, yN - 40, 0.5]];
      big.forEach(([obj, fx, y, sc], i) => F.push({ obj, x: R(-160 + fx * 1920), y: R(y), s: sc, layer: 'near', variant: obj === 'tree.green-oak' ? 0 : 1 + (i % 2), flip: i % 2 === 1, seed: 30 + i, anim: i === 0 ? { sway: { k: 0.6 } } : false }));
      F.push({ obj: has(p, 'birches') ? 'tree.green-birch' : 'tree.green-oak', x: 90, y: 900, s: has(p, 'birches') ? 1.5 : 1.05, layer: 'front', variant: has(p, 'birches') ? 1 : 0, seed: 35, anim: false, flip: true });
      // benches and lamps along the path; a squirrel and a robin
      const bx = px1 > 800 ? 1290 : 300;
      F.push({ obj: 'street.bench', x: bx, y: yN + 40, s: 0.95, layer: 'near', variant: 0, seed: 40, flip: bx < 800 });
      F.push({ obj: 'street.lamp', x: bx + (bx > 800 ? 120 : -110), y: yN + 30, s: 0.72, layer: 'near', variant: 0, seed: 41 });
      if (has(p, 'village') || has(p, 'lamps')) {
        [[180, 0.32], [460, 0.3], [1340, 0.3], [1580, 0.34]].forEach(([x, sc], i) => F.push({ obj: 'street.lamp', x, y: yL + 4, s: sc, layer: 'far', variant: i % 2, seed: 43 + i }));
      }
      F.push({ obj: 'animal.squirrel', x: bx + 60, y: yN + 70, s: 0.7, layer: 'near', seed: 48, flip: true });
      F.push({ obj: 'bird.robin', x: bx - 16, y: yN + 10, s: 0.7, layer: 'near', variant: winter ? 0 : 1, seed: 49 });
      F.push({ obj: 'animal.rabbit', x: R(px0 > 800 ? 300 : 1300), y: yFo + 10, s: 0.9, layer: 'fore', variant: 0, seed: 50 });
      // the lane: a cyclist, a car now and then; people on the green
      A.push({ obj: 'person.cyclist', layer: 'far', path: [[-80, yL + 3], [1700, yL]], speed: 24, loop: 'loop', s: 0.34, seed: 60, offset: 0.15 });
      if (has(p, 'village')) A.push({ obj: 'vehicle.car', layer: 'far', path: [[1760, yL + 4], [-160, yL + 6]], speed: 30, loop: 'loop', s: 0.32, variant: 1, seed: 61, offset: 0.5 });
      const ppl = [['person.dog-walker', [[px0, yL + 30], [R((px0 + px1) / 2), yN - 20]], 5, 0.45], ['person.walker', [[200, yM + 30], [520, yM + 36]], 4, 0.5], ['person.walker', [[1500, yN + 40], [1180, yN + 60]], 6, 0.75], ['person.walker', [[R((px0 + px1) / 2), yN], [px1, yFo + 40]], 4, 0.85], ['person.jogger', [[1600, yM + 20], [1000, yM + 40]], 10, 0.5]];
      ppl.slice(0, dusk ? 2 : 5).forEach(([obj, path, sp, sc], i) => A.push({ obj, layer: i >= 2 ? 'near' : 'mid', path, speed: sp, loop: 'pingpong', s: sc, seed: 62 + i, offset: K(0.1 + i * 0.21), variant: i % 4 }));
      d.flocks.push({ obj: 'bird.small-flight', n: 6, area: [300, R(H * 0.3), 1200, R(H * 0.58)], speed: 26, s: 0.5, seed: 70, layer: 'far' });
      if (autumn || winter) d.flocks.push({ obj: 'bird.goose-flight', n: 5, area: [700, R(H * 0.2), 1400, R(H * 0.4)], speed: 28, s: 0.5, seed: 71, layer: 'far' });
      insects(d, p, [300, yN + 20, 1200, yFo + 40], 'near', 80);
      return d;
    },
  });
})();
