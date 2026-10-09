/* ============================================================
   COMPOSED SCENES uk-south-east / Yateley Common: the shared helpers
   (docs/dev/SCENE_ENGINE.md section 3). The four views are
   71-scene-uk-south-east-yateley-common-1..4.js; each defines
   sceneYateleyCommonN(season), a PURE function that returns the view's
   scene data for one season (the season's own creatures: butterflies in
   summer, robins in winter, ducks off the frozen pond). The view files
   72-anim-pack-uk-south-east-yateley-common-v1..v4.js register the items.

   The place: Yateley Common Country Park (Hampshire County Council), about
   200 ha of lowland heath in the Thames Basin Heaths SPA and an SSSI: ling,
   bell heather and cross-leaved heath, common and dwarf gorse, bracken,
   spreading silver birch and Scots pine on pale sandy soils, small acid
   ponds in the hollows, sandy rides, conservation grazing cattle (Belted
   Galloways among them), stonechats and Dartford warblers on the gorse,
   nightjars at dusk, and light aircraft from Blackbushe on its southern edge.
   https://www.hants.gov.uk/thingstodo/countryside/walking/yateleycommon

   Helpers here are PURE (no DOM, nothing run at load): path builders for the
   sandy rides, the ponds and the land bands, and the heath palettes.
   ============================================================ */
const _scYc = (function () {
  const R = v => Math.round(v);
  /** Smooth samples along a centreline of [x, y, width] points (Catmull-Rom), every ~4 units of y. */
  const samples = (pts) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(2, Math.ceil(Math.abs(p2[1] - p1[1]) / 4));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t, cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), p1[2] + (p2[2] - p1[2]) * t]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  return {
    /** The sandy ride between y0 and y1 (so each depth layer draws its own stretch): a ribbon polygon. Its edges are
     *  ragged (worn, the heather creeping in and the sand spilling out), seeded by y so the layers' stretches meet. */
    track(pts, y0, y1) {
      const s = samples(pts).filter(p => p[1] >= y0 - 3 && p[1] <= y1 + 3);
      if (s.length < 2) return '';
      const wob = (y, w, k) => w * (0.05 * Math.sin(y * 0.07 + k) + 0.035 * Math.sin(y * 0.19 + 2 * k) + 0.015 * Math.sin(y * 0.41 + k));
      const L = s.map(([x, y, w]) => `${R(x - w / 2 + wob(y, w, 1))} ${R(y)}`), Rr = s.slice().reverse().map(([x, y, w]) => `${R(x + w / 2 + wob(y, w, 4))} ${R(y)}`);
      return 'M' + L.join('L') + 'L' + Rr.join('L') + 'Z';
    },
    /** The ride's wear between y0 and y1: two wheel ruts (worn darker) either side of a raised, paler centre. */
    ruts(pts, y0, y1) {
      const s = samples(pts).filter(p => p[1] >= y0 - 3 && p[1] <= y1 + 3);
      if (s.length < 2) return { ruts: '', crown: '' };
      const rib = (off, k) => {
        const L = s.map(([x, y, w]) => `${R(x + w * off - w * k / 2 + w * 0.025 * Math.sin(y * 0.05))} ${R(y)}`), Rr = s.slice().reverse().map(([x, y, w]) => `${R(x + w * off + w * k / 2 + w * 0.025 * Math.sin(y * 0.05))} ${R(y)}`);
        return 'M' + L.join('L') + 'L' + Rr.join('L') + 'Z';
      };
      return { ruts: rib(-0.25, 0.08) + rib(0.23, 0.075), crown: rib(-0.01, 0.12) };
    },
    /**
     * The heath drifts (ground.yc-heath-drift): dense, clustered mats of ling, bell heather, moor-grass and dwarf gorse that
     * cover the ground of a band (noise-masked, so the kinds come in patches, never in rows). o: { far, mid, near, fore: [y0, y1];
     * avoid: { band: [areas] }; n: { band: count }; seed; x0, x1 }.
     */
    drifts(o) {
      const x0 = o.x0 == null ? -160 : o.x0, x1 = o.x1 == null ? 1760 : o.x1, s0 = o.seed || 0, out = [];
      const n = Object.assign({ far: 90, mid: 110, near: 80, fore: 40 }, o.n || {}), k0 = o.k == null ? 0.5 : o.k;   // k0: the density (performance: 0.5 since round 2, the drifts were most of the cold bake)
      const sc = { far: [0.32, 0.5], mid: [0.5, 0.8], near: [0.75, 1.1], fore: [1.15, 1.6] }, gap = { far: 22, mid: 30, near: 50, fore: 80 };
      // the ride (o.ride: its centreline points) stays clear: the big drifts keep a wide berth (their half width), small
      // ones fill the strip beside it up to a narrow berth, so the heather comes right to the sand's edge
      const padW = { far: 70, mid: 120, near: 180, fore: 260 }, padN = { far: 20, mid: 32, near: 46, fore: 60 }, scE = { far: [0.12, 0.18], mid: [0.18, 0.28], near: [0.26, 0.38], fore: [0.36, 0.48] };
      ['far', 'mid', 'near', 'fore'].forEach((k, i) => {
        if (!o[k] || !(o[k][1] > o[k][0])) return;
        const y0 = o[k][0], y1 = o[k][1], rect = { rect: [x0, y0, x1, y1] }, sBy = [[y0, 0.8], [y1, 1.2]];
        const av = ((o.avoid && o.avoid[k]) || []).slice(), avE = av.slice();
        let edge = null;
        if (o.ride) {
          const w = this.around(o.ride, y0 - 12, y1 + 12, padW[k]);
          if (w.length > 4) { av.push({ poly: w }); edge = { poly: w }; avE.push({ poly: this.around(o.ride, y0 - 12, y1 + 12, padN[k]) }); }
        }
        // ling and bell heather everywhere; moor-grass and dwarf gorse in patches (noise masks)
        n[k] = Math.round(n[k] * k0);
        out.push({ obj: 'ground.yc-heath-drift', layer: k, seed: s0 + 40 + i, area: rect, n: n[k], minGap: gap[k], s: sc[k], sByY: sBy, flip: 0.5, variant: [0, 1], anim: false, mask: { avoid: av } });
        out.push({ obj: 'ground.yc-heath-drift', layer: k, seed: s0 + 50 + i, area: rect, n: Math.round(n[k] * 0.45), minGap: gap[k], s: sc[k], sByY: sBy, flip: 0.5, variant: 2, anim: false, mask: { avoid: av, noise: { scale: 300, cut: 0.55 } } });
        out.push({ obj: 'ground.yc-heath-drift', layer: k, seed: s0 + 60 + i, area: rect, n: Math.round(n[k] * 0.35), minGap: gap[k], s: sc[k], sByY: sBy, flip: 0.5, variant: 3, anim: false, mask: { avoid: av, noise: { scale: 220, cut: 0.6 } } });
        if (edge) out.push({ obj: 'ground.yc-heath-drift', layer: k, seed: s0 + 70 + i, area: edge, n: Math.round(n[k] * 0.9), minGap: Math.round(gap[k] * 0.35), s: scE[k], sByY: sBy, flip: 0.5, variant: [0, 1, 3], anim: false, mask: { avoid: avE } });
      });
      return out;
    },
    /** The track's centreline as an actor path (from far to near), every `step` units of y. */
    path(pts, y0, y1, step = 24) {
      const s = samples(pts).filter(p => p[1] >= y0 && p[1] <= y1), out = [];
      let last = -1e9;
      for (const p of s) if (p[1] - last >= step) { out.push([R(p[0]), R(p[1])]); last = p[1]; }
      return out;
    },
    /** A mask polygon around the ride (the cover avoids it), widened by `pad`. */
    around(pts, y0, y1, pad = 8) {
      const s = samples(pts).filter(p => p[1] >= y0 && p[1] <= y1);
      return s.map(([x, y, w]) => [R(x - w / 2 - pad), R(y)]).concat(s.slice().reverse().map(([x, y, w]) => [R(x + w / 2 + pad), R(y)]));
    },
    /** Cover on a pond's far bank, hand-placed (seeded) with reflect: true, so it is mirrored in the water. */
    bank(pond, layer, seed, n = 34, s = [0.36, 0.56]) {
      const r = sceneRnd(seed), out = [], ids = ['plant.heather', 'plant.heather', 'plant.grass', 'plant.heather', 'plant.reed'];
      for (let i = 0; i < n; i++) {
        const x = pond.x0 - 30 + (i + r() * 0.8) * (pond.x1 - pond.x0 + 60) / n, y = pond.y0 - 34 + r() * 30;
        const obj = ids[i % ids.length];   // the mid carpet's and the tinted drifts' variants, so the bank adds no new sprites
        out.push({ obj, x: R(x), y: R(y), s: Math.round((s[0] + r() * (s[1] - s[0])) * (0.8 + (y - pond.y0 + 34) / 30 * 0.4) * 100) / 100, layer, variant: obj === 'plant.reed' ? i % 2 : i % 2 ? 1 : 3, flip: r() < 0.5, seed: seed + i, anim: false, reflect: true, tint: i % 2 && obj !== 'plant.reed' ? ['#8a7a40', 0.08] : null });
      }
      return out;
    },
    /** The default layers with lighter haze in the far heath (the heather should still read purple there). The near
     *  layer has no haze, so it shares its sprites with the fore (fewer distinct sprites, a smaller SVG still). */
    layers: [
      { id: 'horizon', depth: 0.08, haze: 0.6 }, { id: 'far', depth: 0.2, haze: 0.28 }, { id: 'mid', depth: 0.45, haze: 0.14 },
      { id: 'near', depth: 0.75, haze: 0 }, { id: 'fore', depth: 1, haze: 0 }, { id: 'front', depth: 1.25, haze: 0 },
    ],
    /**
     * The heath carpet, far to near: heather cushions with grass and (summer) wildflowers (bracken goes in as drifts, per view), then grass
     * that moves in the wind along the foot (wind strips). The far, near and fore layers use variants 0 and 1, the mid layer 2 and 3,
     * and only a few drifts in the mid layer are tinted, so the whole carpet is a dozen or so distinct sprites (the SVG still stays small) while every
     * object still shows two or more variants and tints. o: { far, mid, near, fore: [y0, y1] bands; avoid: { far, mid,
     * near, fore: [areas] }; n: { far, mid, near, fore, grass }; season; seed; x0, x1 (default the full width) }.
     */
    carpet(o) {
      const x0 = o.x0 == null ? -160 : o.x0, x1 = o.x1 == null ? 1760 : o.x1, n = Object.assign({ far: 240, mid: 260, near: 240, fore: 130, grass: 60 }, o.n || {});
      const av = (k) => ((o.avoid && o.avoid[k]) || []).length ? { mask: { avoid: o.avoid[k] } } : {};
      const bloom = o.season === 'summer', s0 = o.seed || 0, out = [];
      const band = (k) => o[k] && o[k][1] > o[k][0];
      if (band('far')) out.push(Object.assign({ obj: { 'plant.heather': 7, 'plant.grass': 2 }, layer: 'far', seed: s0 + 1, area: { rect: [x0, o.far[0], x1, o.far[1]] }, n: n.far, minGap: 11, s: [0.34, 0.52], sByY: [[o.far[0], 0.8], [o.far[1], 1.25]], flip: 0.5, variant: [0, 1], anim: false }, av('far')));
      if (band('mid')) out.push(Object.assign({ obj: { 'plant.heather': 8, 'plant.grass': 2 }, layer: 'mid', seed: s0 + 2, area: { rect: [x0, o.mid[0], x1, o.mid[1]] }, n: n.mid, minGap: 14, s: [0.5, 0.8], sByY: [[o.mid[0], 0.8], [o.mid[1], 1.2]], flip: 0.5, variant: [2, 3], anim: false }, av('mid')));
      // a few olive-tinted drifts in the mid heath (one tint bucket, one variant that the mid carpet does not use, so the
      // two never stack: two extra sprites in all)
      if (band('mid')) out.push(Object.assign({ obj: { 'plant.heather': 3, 'plant.grass': 1 }, layer: 'mid', seed: s0 + 6, area: { rect: [x0, o.mid[0], x1, o.mid[1]] }, n: Math.round(n.mid * 0.25), minGap: 14, s: [0.5, 0.8], sByY: [[o.mid[0], 0.8], [o.mid[1], 1.2]], mask: { avoid: ((o.avoid && o.avoid.mid) || []), noise: { scale: 260, cut: 0.45 } }, flip: 0.5, variant: 1, tint: { col: '#8a7a40', k: [0.09, 0.11] }, anim: false }));
      if (band('near')) out.push(Object.assign({ obj: { 'plant.heather': 8, 'plant.grass': 3 }, layer: 'near', seed: s0 + 3, area: { rect: [x0, o.near[0], x1, o.near[1]] }, n: n.near, minGap: 20, s: [0.8, 1.2], sByY: [[o.near[0], 0.8], [o.near[1], 1.2]], flip: 0.5, variant: [0, 1], anim: false }, av('near')));
      if (band('fore')) out.push(Object.assign({ obj: Object.assign({ 'plant.heather': 6 }, bloom ? { 'plant.wildflowers': 0.8 } : {}), layer: 'fore', seed: s0 + 4, area: { rect: [x0, o.fore[0], x1, o.fore[1]] }, n: n.fore, minGap: 28, s: [1.15, 2.1], sByY: [[o.fore[0], 0.85], [o.fore[1], 1.2]], flip: 0.5, variant: [0, 1], anim: false }, av('fore')));
      if (band('fore') && n.grass) out.push(Object.assign({ obj: 'plant.grass', layer: 'fore', seed: s0 + 5, area: { rect: [x0, Math.max(o.fore[0], o.fore[1] - 50), x1, o.fore[1]] }, n: n.grass, minGap: 22, s: [1.4, 2], flip: 0.5, variant: [2, 3], anim: 'strip' }, av('fore')));
      return out;
    },
    /** The heath palette with a view's own slots merged in (extra: { base, spring, summer, autumn, winter }). */
    pal(extra) {
      const out = {};
      for (const k of ['base', 'spring', 'summer', 'autumn', 'winter']) out[k] = Object.assign({}, this.palette[k] || {}, (extra && extra[k]) || {});
      return out;
    },
    /** A closed polygon path through [x, y] points, smoothed (quadratic through the midpoints) when smooth is true. */
    poly(pts, smooth) {
      if (!smooth) return 'M' + pts.map(([x, y]) => `${R(x)} ${R(y)}`).join('L') + 'Z';
      const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      let d = `M${R(mid(pts[n - 1], pts[0])[0])} ${R(mid(pts[n - 1], pts[0])[1])}`;
      for (let i = 0; i < n; i++) { const m = mid(pts[i], pts[(i + 1) % n]); d += `Q${R(pts[i][0])} ${R(pts[i][1])} ${R(m[0])} ${R(m[1])}`; }
      return d + 'Z';
    },
    /** A pond: an irregular ellipse in the box (seeded wobble). */
    pond(x0, x1, y0, y1, seed) {
      const r = sceneRnd(seed), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
      let d = '';
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, k = 1 + (r() - 0.5) * 0.12; d += `${i ? 'L' : 'M'}${R(cx + Math.cos(a) * rx * k)} ${R(cy + Math.sin(a) * ry * k)}`; }
      return d + 'Z';
    },
    /** Heather cushions as ground: n low, flat-topped mounds (one path) scattered in a band, so the open heath reads as
     *  a mottled carpet of cushions under the plants rather than a flat fill (cheap: a single ground shape per layer). */
    mounds(x0, x1, y0, y1, n, seed, w = [26, 60]) {
      const r = sceneRnd(seed);
      let d = '';
      for (let i = 0; i < n; i++) {
        const x = x0 + (i + r()) * (x1 - x0) / n, y = y0 + r() * (y1 - y0), k = 0.6 + 0.4 * (y - y0) / Math.max(1, y1 - y0), rx = (w[0] + r() * (w[1] - w[0])) * k, ry = rx * (0.22 + r() * 0.1);
        d += `M${R(x - rx)} ${R(y)}q${R(rx * 0.2)} ${R(-ry * 2)} ${R(rx)} ${R(-ry * 2)}t${R(rx)} ${R(ry * 2)}z`;
      }
      return d;
    },
    /** A land band from y (gently waving) down to `foot` (default the foot of the scene). A band need only reach a little
     *  below the top of the next nearer layer's band: each layer's bitmap is cropped to what it draws, so short bands blit less. */
    band(y, amp = 6, phase = 0, foot = 900) {
      return `M-160 ${R(foot)}V${R(y)}Q${R(240 + phase)} ${R(y - amp)} ${R(800 + phase / 2)} ${R(y + amp * 0.4)}T1760 ${R(y - amp * 0.3)}V${R(foot)}Z`;
    },
    /** The heath's colours by season: land (far, mid, near), sand (dark, mid, light), the woods' foot and the pond bank. */
    palette: {
      base: { wood: ['#4a5e44', '#3a4c36'], bank: ['#4a4430', '#3a3424'], mound: ['#6a5660', '#4e4440'], rut: ['#a88c64', '#c0a67c'], crown: ['#e2d0a8', '#d4c098'] },
      spring: { heath: ['#7c8a5a', '#5f7340', '#46582f'], sand: ['#b89a6c', '#d6bf92', '#efe0bc'], mound: ['#5e6646', '#46503a'] },
      summer: { heath: ['#7a7262', '#5e5c44', '#44482e'], mound: ['#7e5a74', '#5e4658'], sand: ['#b89a6c', '#d6bf92', '#efe0bc'] },
      autumn: { heath: ['#8c765a', '#6e5640', '#50402e'], sand: ['#b0946a', '#cfb68c', '#e8d6b0'], wood: ['#5a5a3c', '#46462e'], mound: ['#6e4c3a', '#523a2c'] },
      winter: { heath: ['#8c8478', '#6a5c4c', '#4c4236'], sand: ['#a4927a', '#c4b49a', '#e2d6c0'], wood: ['#4c5450', '#3c4440'], mound: ['#6e6058', '#54483e'], rut: ['#7e6c58', '#9a8870'], crown: ['#c8bca4', '#b4a890'] },
    },
    /**
     * Make a view's seasonal item composed (called by the view files at load): the scene is built lazily, once,
     * from build(season); the item keeps its id, place fields, ukSeason and season, and draws ITS season (pins and
     * the gallery show the season they were made for; the rotation already picks the item of the date's season).
     * The hand-drawn art stays as legacySvg (scene sheet --compare). Without the engine the item is left as it is.
     */
    composed(item, season, build) {
      if (typeof build !== 'function' || typeof sceneSvg !== 'function' || typeof sceneObj !== 'function' || !sceneObj('tree.pine-veteran') || !sceneObj('tree.birch-heath')) return item;
      const scene = () => build(season);
      // a still with no clock (Node, the gallery's sheets) shows the item's own season; with a live sky, the date's
      const own = (o) => o.season || (o.sky && Number.isFinite(o.sky.ms)) ? o : Object.assign({}, o, { season });
      return Object.assign(item, { composed: true, full: true, rich: true, scene, sceneSeason: season, legacySvg: item.svg, reduced: 'static',
        svg: (o = {}) => sceneSvg(scene, own(o)) });
    },
    /** Butterfly variants by season (animal.butterfly: 0 brimstone, 1 red admiral, 2 peacock, 3 common blue, 4 orange-tip, 5 small tortoiseshell). */
    butterflies: { spring: [0, 2, 4], summer: [3, 3, 5], autumn: [1], winter: [] },
  };
})();
