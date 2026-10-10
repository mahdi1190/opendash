/* ============================================================
   SCENE LIBRARY: manchester-quays-nq (docs/dev/SCENE_ENGINE_V2.md), the cameras and own objects of the four Manchester and
   Salford views (71-scene-uk-north-manchester-quays-nq.js). PURE: data and sceneObjDefine calls only.

   Each view is a different real viewpoint, composed by hand on the v2 engine:
     v1  Salford Quays: the Lowry's south promenade on Pier 8, looking west down the Ship Canal: the Lowry's steel on the right,
         the lift footbridge across the water, Imperial War Museum North's shards on the far bank, MediaCity beyond
     v2  MediaCityUK: the piazza by the Metrolink stop, looking south over the tram tracks to the quay, the white leaning pylon
         of the swing footbridge, and IWM North across the water
     v3  the Northern Quarter: Stevenson Square from its south-west corner, looking north-east: the painted kiosk, warehouses
         and mills with murals on their gables, cafe tables, cyclists and the buses that turn round the square
     v4  Ancoats: the Rochdale Canal towpath under the mills of Redhill Street, looking east: the six- and eight-storey cotton
         mills on the far bank, a lock, narrowboats, cyclists on the towpath and the chimney over the roofs

   The landmarks are drawn IN EACH CAMERA'S PERSPECTIVE (as the Fleet Pond boardwalk): every one is a 3D model in ground
   metres (x right of the view axis, d forward, h up) projected through its view's camera, visible faces only, far to near.
   Placed as pinned pixel items at their nearest ground point, so the depth sort draws people and boats in front of them.
     landmark.mqn-lowry-v1         the Lowry (Pier 8): stainless-steel drums and flytower boxes over a glazed foyer
     landmark.mqn-iwm-v1 / -v2     Imperial War Museum North: the Earth, Air and Water shards (aluminium)
     structure.mqn-liftbridge-v1   the Lowry lift footbridge: four steel masts, the deck between, its cables
     structure.mqn-mcbridge-v1/-v2 the MediaCityUK swing footbridge: the leaning white pylon and its fan of stays
     structure.mqn-quayrail-<v>    the quay's black railing along the water's edge, in perspective (pieces)
     building.mqn-media-<v>        MediaCity's glass blocks with their coloured fins and the studios' screen box
     structure.mqn-tramstop-v2     the Metrolink platform: canopy, yellow edge, ticket machine, the tracks' overhead masts
     structure.mqn-kiosk-v3        the painted kiosk in the middle of Stevenson Square (its walls covered in a mural)
     structure.mqn-mural-v3        the big painted gables round the square (abstract colour, no lettering)
     building.mqn-mill-v4          the Ancoats mills on the far bank (a model per mill: Royal Mill, Sedgwick, Paragon)
     structure.mqn-lock-v4         the lock: chamber walls, the balance beams and gates
     street.mqn-cafe               a cafe table under a parasol with chairs (4 variants)
     street.mqn-lifebuoy           a red lifebuoy housing on its post (quayside)
     street.mqn-bike-hoop          a Sheffield bike stand with a bike locked to it (3 variants)
     street.mqn-planter-tree       a young street tree in a square timber planter
   Lit from the LEFT. No lettering, logos or brands anywhere.
   ============================================================ */
const SCENE_MQN = Object.freeze({
  /** A seeded LCG. */
  rnd(seed) { let s = seed >>> 0 || 1; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); },
  /** The four cameras (water: the still-water level under the quay or towpath). */
  cams: Object.freeze({
    v1: Object.freeze({ eye: 1.7, fov: 56, horizon: 480, heading: 258, lat: 53.4704, lon: -2.2946, water: -2.4 }),
    v2: Object.freeze({ eye: 6.0, fov: 56, horizon: 400, heading: 190, lat: 53.4726, lon: -2.2978, water: -1.6 }),
    v3: Object.freeze({ eye: 1.65, fov: 58, horizon: 520, heading: 40, lat: 53.4824, lon: -2.2346 }),
    v4: Object.freeze({ eye: 1.7, fov: 56, horizon: 480, heading: 80, lat: 53.4837, lon: -2.2268, water: -0.6 }),
  }),
  /** View 2: the Metrolink tracks' centreline (two tracks, 7.2 m wide), from beside the platform curving away left. */
  track2: Object.freeze([[-3.5, 2], [-3.5, 30], [-5, 50], [-12, 70], [-30, 86], [-70, 96], [-160, 104], [-300, 110]]),
  /** The camera's projection: { f, p(x, d, h) -> [X, Y] }. */
  view(cam) { const f = 800 / Math.tan(cam.fov * Math.PI / 360), x0 = cam.x0 || 800; return { f, p: (x, d, h) => [x0 + f * x / d, cam.horizon + f * (cam.eye - (h || 0)) / d] }; },
  /** Round a placement's pixel numbers. */
  r1(v) { return Math.round(v * 10) / 10; },
});

/* ---------- building styles of the views (generator data, 19.3): MediaCity glass, Northern Quarter warehouses, Ancoats mills ---------- */
(function () {
  if (typeof sceneBuildingStyleDefine !== 'function') return;
  // MediaCity: curtain walls in grey-green glass, white slabs, some blocks with coloured spandrel panels (orange, teal, slate)
  sceneBuildingStyleDefine('mqn-media', {
    label: 'MediaCity glass', eras: [2007, 2030], regions: ['uk'], grouping: 'block', layout: 'curtain', flippable: false,
    storeys: [6, 14], storeyH: [5, 3.8], frontage: [24, 50], depth: [18, 30], roof: 'flat', parapet: 1.4,
    wall: { cols: ['#d6dadc', '#c46e3a', '#5e8e9e', '#7e8a94', '#e2e4e2', '#3e4a56'], grime: '#4a5058', texture: 'glass' },
    roofMat: { cols: ['#5a6066'], kind: 'metal' },
    dress: { cols: ['#eceeee'] },
    coping: '#e8eaea',
    win: { glass: ['#4e6e7a', '#3e5a6a', '#5c7a86', '#34505e', '#6a8a94'], frames: ['#e2e6e8', '#9aa4aa'] },
    grid: { col: 1.5, spandrel: 1.1, mullion: '#d8dcde', slab: '#f0f2f2', canopy: 2.6 },
    chimney: { where: 'none' }, plinth: false,
    details: { downpipe: 0, alarm: 0, boxes: 0, ivy: 0 },
    night: { on: 0.55, curtain: 0, tv: 0 },
  });
  // the Northern Quarter: Victorian brick warehouses with stone dressings, cafes and bars in the ground floor under awnings
  sceneBuildingStyleDefine('mqn-nq-warehouse', {
    label: 'Northern Quarter warehouse', eras: [1830, 1910], regions: ['uk', 'north'], grouping: 'row', layout: 'shops', flippable: false,
    storeys: [4, 6], storeyH: [4.4, 3.6, 3.4], frontage: [9, 20], depth: [14, 22], roof: 'flat', parapet: 1.2, party: 'both',
    wall: { cols: ['#8a3e2c', '#9c4a34', '#7a3628', '#a65a3e', '#6e3426', '#b0603c'], grime: '#2a2420', texture: 'brick', mortar: '#b8a890',
      alt: { chance: 0.18, cols: ['#c8b89a', '#b8a88a'], texture: 'stone' } },
    roofMat: { cols: ['#3a3c40'], kind: 'felt' },
    dress: { cols: ['#d0c4a8', '#c4b494', '#b8a080'] },
    coping: '#cfc2a4',
    win: { type: 'sash', panes: [2, 2], w: 1.3, hk: 0.6, sill: 0.95, head: 'seg', recess: 0.18, frames: ['#e8e4d8', '#2e3236', '#4a5a3a'], glass: ['#2c3640', '#323c46', '#283038'] },
    door: { w: 1.1, h: 2.4, fan: true, panels: 2, recess: 0.2, cols: ['#2a2a2a', '#1f3a5a', '#5a1f24', '#2a4a3a'] },
    shop: { always: true, fascia: 0.7, riser: 0.45, pilaster: 0.4, awning: true, top: 4.2, cols: ['#1f3a34', '#5a1f24', '#1d2a44', '#3a2a1e', '#2a2a2a', '#4a5a2a', '#6a2a3a', '#2a4a5a', '#7a5a1e'] },
    chimney: { where: 'none' },
    bands: [{ storey: 2, dz: 0.05, h: 0.25, col: 'dress' }, { storey: 4, dz: 0.05, h: 0.2, col: 'dress' }],
    colW: 2.4, sideWindows: true,
    details: { downpipe: 0.7, alarm: 0.4, boxes: 0.25, ivy: 0.05 },
    night: { on: 0.55, curtain: 0.3, tv: 0.1 },
  });
  // the Ancoats cotton mills: soot-dark red brick, six to eight storeys, long ranks of small-paned windows, string courses
  sceneBuildingStyleDefine('mqn-ancoats-mill', {
    label: 'Ancoats cotton mill', eras: [1798, 1912], regions: ['uk', 'north'], grouping: 'block', layout: 'grid',
    storeys: [6, 8], storeyH: [3.9, 3.5], frontage: [40, 90], depth: [14, 18], roof: 'flat', parapet: 1.0,
    wall: { cols: ['#7a3426', '#843a2a', '#6e3024', '#8e4430'], grime: '#221c18', texture: 'brick', mortar: '#a89a84' },
    roofMat: { cols: ['#3e444c'], kind: 'slate' },
    dress: { cols: ['#bcb098', '#a89c84'] },
    coping: '#b8ac94',
    win: { type: 'metal', panes: [2, 2], w: 1.6, hk: 0.58, sill: 0.95, head: 'flat', recess: 0.22, lintelCol: 'dress', frames: ['#2e3236', '#e2ded2', '#3a4a3a'], glass: ['#2c3640', '#323c46', '#3a4650'] },
    door: { w: 1.6, h: 2.8, fan: false, panels: 0, recess: 0.25, cols: ['#3a2a1e', '#2a3a2e'] },
    grid: { col: 3.0, margin: 1.0, loading: true, doorCol: '#3a2a1e' },
    chimney: { where: 'none' },
    bands: [1, 2, 3, 4, 5, 6, 7].map(k => ({ storey: k, h: 0.22, col: '#5e281c' })),
    sideWindows: true,
    details: { downpipe: 0.8, alarm: 0, boxes: 0, ivy: 0.15 },
    night: { on: 0.6, curtain: 0.2, tv: 0.05 },
    extraBlocks(sp, m) {
      if (!m.quad || sp.extra >= 0.4) return [];
      // the mill's engine-house chimney behind one end: round-shouldered, tapering, a little over twice the mill's height
      const p = sp.extra < 0.2 ? m.Q(0.1, 1.3, 0) : m.Q(0.9, 1.3, 0);
      return [{ kind: 'tower', at: [p[0], p[2]], base: 3.0, top: 2.0, h: Math.min(64, m.E * 2.2), col: sp.wall }];
    },
  });
})();

/**
 * Paving as GROUND fills (drawn under every item, so the depth sort never puts the paving over a figure): granite flags in
 * perspective with their joints, a share of lighter and darker flags, darker bands across every o.band metres, a coping strip at
 * the quay edge (o.coping: its x), a slot drain (o.drain: its x) and ironwork covers. pieces: [[x0, x1, d0, d1], ...] in metres.
 * Paints are the scene's palette slots @pv.0..6 (dark flag, base, light flag, band, joint, stain, iron). -> [{ layer, d, fill }]
 */
function sceneMqnPaving(cam, pieces, o, seed, origin) {
  const V = SCENE_MQN.view(cam), P = V.p, f = V.f, r = SCENE_MQN.rnd(seed || 5), R = v => Math.round(v), O = origin || [0, 0];
  const quad = (a, b, c, d) => 'M' + [a, b, c, d].map(p => { const q = P(p[0], p[1], 0); return R(q[0] - O[0]) + ' ' + R(q[1] - O[1]); }).join('L') + 'Z';
  const band = (d) => (d < 15 ? 'fore' : d < 50 ? 'near' : d < 200 ? 'mid' : 'far');
  const fw = (o.flag && o.flag[0]) || 0.6, fl = (o.flag && o.flag[1]) || 1.2, out = [];
  /** a thin strip along a ground segment, w metres wide (at least a minimum pixel width) */
  const strip = (a, b, wm, minPx) => {
    const dm = Math.max(0.5, Math.min(a[1], b[1])), w = Math.max(wm, (minPx || 0.6) * dm / f) / 2, tx = b[0] - a[0], td = b[1] - a[1], L = Math.hypot(tx, td) || 1, nx = -td / L * w, nd = tx / L * w;
    // a strip running away from the eye widens with depth (its far end stays at least minPx wide)
    const w2 = Math.max(wm, (minPx || 0.6) * Math.max(a[1], b[1]) / f) / 2, nx2 = -td / L * w2, nd2 = tx / L * w2;
    return quad([a[0] - nx, a[1] - nd], [a[0] + nx, a[1] + nd], [b[0] + nx2, b[1] + nd2], [b[0] - nx2, b[1] - nd2]);
  };
  for (const [x0, x1, d0, d1] of pieces) {
    const L = band((d0 + d1) / 2), push = (d, fill, det) => { if (d) out.push(Object.assign({ layer: L, d, fill }, det ? { detail: true } : null)); };
    push(quad([x0, d0], [x1, d0], [x1, d1], [x0, d1]), '@pv.1');
    let light = '', dark = '', stain = '';
    for (let d = Math.ceil(d0 / fl - 1e-9) * fl; d < d1 - 1e-9; d += fl) {
      if (f * fw / d < 2.5 || d > 16) break;
      for (let x = Math.ceil(x0 / fw - 1e-9) * fw; x < x1 - 1e-6; x += fw) {
        const u = r(), dd = Math.min(d1, d + fl), xx = Math.min(x1, x + fw);
        if (u < 0.06) dark += quad([x, d], [xx, d], [xx, dd], [x, dd]); else if (u < 0.11) light += quad([x, d], [xx, d], [xx, dd], [x, dd]); else if (u < 0.13) stain += quad([x, d], [xx, d], [xx, dd], [x, dd]);
      }
    }
    push(dark, '@pv.0', 1); push(light, '@pv.2', 1); push(stain, '@pv.5', 1);
    let joints = '';
    for (let x = Math.ceil(x0 / (2 * fw) - 1e-9) * 2 * fw; x < x1 - 1e-6; x += 2 * fw) { const dEnd = Math.min(d1, f * fw / 12); if (dEnd > d0 + 0.2) joints += strip([x, d0], [x, dEnd], 0.008, 0.6); }
    for (let d = Math.ceil(d0 / fl - 1e-9) * fl; d < d1; d += fl) if (f * fl * cam.eye / (d * d) > 6) joints += strip([x0, d], [x1, d], 0.008, 0.6);
    push(joints, '@pv.4', 1);
    const bandM = o.band || 8;
    let bands = '';
    for (let d = Math.ceil(d0 / bandM - 1e-9) * bandM; d < d1; d += bandM) bands += quad([x0, d], [x1, d], [x1, Math.min(d1, d + 0.6)], [x0, Math.min(d1, d + 0.6)]);
    push(bands, '@pv.3');
    if (o.coping != null && o.coping >= x0 - 0.01 && o.coping < x1) { push(quad([o.coping, d0], [o.coping + 0.55, d0], [o.coping + 0.55, d1], [o.coping, d1]), '@pv.2'); push(strip([o.coping + 0.55, d0], [o.coping + 0.55, d1], 0.03, 0.6), '@pv.3'); }
    if (o.drain != null && o.drain > x0 && o.drain < x1) push(strip([o.drain, d0], [o.drain, d1], 0.06, 0.6), '@pv.6');
    let iron = '';
    for (let i = 0; i < Math.max(1, Math.round((d1 - d0) / 10)); i++) { if (r() < 0.5) continue; const cx = x0 + 1 + r() * (x1 - x0 - 2), cd = d0 + r() * (d1 - d0), w = 0.6; iron += quad([cx, cd], [cx + w, cd], [cx + w, cd + w], [cx, cd + w]); }
    push(iron, '@pv.6');
  }
  return out;
}
/** The palette slots the paving fills use (granite greys; a frosted look in winter). */
const SCENE_MQN_PV = Object.freeze({
  base: { pv: ['#8f8a84', '#a39e97', '#b3aea6', '#88837c', '#7e7a74', '#9a948a', '#45423e'] },
  autumn: { pv: ['#7c7268', '#8c8276', '#9a9082', '#74695e', '#6a6158', '#80725e', '#3e3a34'] },
  winter: { pv: ['#a8a8a8', '#bdbcba', '#cac9c6', '#a2a19e', '#9c9b98', '#b4b2ae', '#55534f'] },
});

/* ---------- the perspective solids ---------- */
const SCENE_MQN_SOLID = (function () {
  const f1 = v => Math.round(v * 10) / 10;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  /** Newell normal of a 3D polygon [[x, d, h], ...]. */
  const normal = (P) => {
    const n = [0, 0, 0];
    for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]); }
    const l = Math.hypot(n[0], n[1], n[2]) || 1; return [n[0] / l, n[1] / l, n[2] / l];
  };
  const centre = (P) => P.reduce((c, p) => [c[0] + p[0] / P.length, c[1] + p[1] / P.length, c[2] + p[2] / P.length], [0, 0, 0]);
  /**
   * A model builder for one camera. Faces are added with an INSIDE point (the solid's centre) so each face's normal is turned
   * outward; a face is drawn only when it looks toward the eye. tone(n): the paint index by facing, lit from the left (0 dark,
   * 1 mid, 2 light, 3 top). Every face may carry details (window grids and seams) laid out on its own plane.
   */
  function model(cam) {
    const V = SCENE_MQN.view(cam), eye = [0, 0, cam.eye], faces = [], off = [0, 0];
    const sh = (p) => (off[0] || off[1] ? [p[0] + off[0], p[1] + off[1], p[2]] : p);
    const api = {
      f: V.f, P: V.p, cam, off,
      /** shift every following face and prism by [dx, dd] metres (a model drawn at its own origin) */
      shift(dx, dd) { off[0] = dx; off[1] = dd; },
      /** add a planar face: pts [[x, d, h], ...]; inside: a point inside the solid; o: { f (paint or [dark, mid, light, top]),
       *  op, glow, part, detail, both (draw even when it faces away), extra: [(map, put) => {}] details } */
      face(pts, inside, o) {
        pts = pts.map(sh); if (inside) inside = sh(inside);
        let n = normal(pts), c = centre(pts);
        if (inside && dot(n, sub(c, inside)) < 0) n = [-n[0], -n[1], -n[2]];
        const toEye = sub(eye, c), vis = dot(n, toEye) > 0;
        if (!vis && !(o && o.both)) return null;
        // the depth key: the face's distance from the eye (centre), nearer drawn later
        const F = { pts, n, c, key: Math.hypot(c[0], c[1], c[2] - cam.eye), o: o || {} };
        faces.push(F); return F;
      },
      /** a vertical prism: footprint [[x, d], ...] from h0 to h1, walls (visible ones) and the top face; o.wall / o.top paints,
       *  o.on(F, edge i, a, b) per visible wall to add details */
      prism(foot, h0, h1, o) {
        o = o || {};
        const sv = [off[0], off[1]];
        foot = foot.map(p => [p[0] + sv[0], p[1] + sv[1]]); off[0] = 0; off[1] = 0;
        const cx = foot.reduce((s, p) => s + p[0], 0) / foot.length, cd = foot.reduce((s, p) => s + p[1], 0) / foot.length, ins = [cx, cd, (h0 + h1) / 2];
        const out = [];
        for (let i = 0; i < foot.length; i++) {
          const a = foot[i], b = foot[(i + 1) % foot.length];
          const F = api.face([[a[0], a[1], h0], [b[0], b[1], h0], [b[0], b[1], h1], [a[0], a[1], h1]], ins, { f: o.wall, op: o.op, part: o.part, seam: o.seam });
          if (F) { F.wall = { a, b, h0, h1, i }; out.push(F); if (o.on) o.on(F, i, a, b); }
        }
        if (o.top !== false) api.face(foot.map(p => [p[0], p[1], h1]), ins, { f: o.top || o.wall, op: o.op, part: o.part, top: true });
        if (o.bottom) api.face(foot.map(p => [p[0], p[1], h0]), ins, { f: o.bottom, op: o.op, part: o.part });
        off[0] = sv[0]; off[1] = sv[1];
        return out;
      },
      /** a point on a wall plane: u along a..b (0..1), h height */
      on(w, u, h) { return [w.a[0] + (w.b[0] - w.a[0]) * u, w.a[1] + (w.b[1] - w.a[1]) * u, h]; },
      /** add a detail polygon (already in 3D) to a face, drawn with it */
      detail(F, pts, o) { if (F) (F.det = F.det || []).push({ pts, o }); },
      /** a window grid on a wall face: cols x rows cells between u0..u1 and h0..h1 (cell fill share kw, kh) */
      grid(F, u0, u1, h0, h1, cols, rows, kw, kh, o) {
        if (!F || !F.wall) return;
        const w = F.wall;
        for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
          if (o && o.skip && o.skip(i, j)) continue;
          const cu = u0 + (u1 - u0) * (i + 0.5) / cols, ch = h0 + (h1 - h0) * (j + 0.5) / rows, hu = (u1 - u0) / cols * kw / 2, hh = (h1 - h0) / rows * kh / 2;
          api.detail(F, [api.on(w, cu - hu, ch - hh), api.on(w, cu + hu, ch - hh), api.on(w, cu + hu, ch + hh), api.on(w, cu - hu, ch + hh)], Object.assign({ i, j }, o));
        }
      },
      /** lines on a face (seams, mullions, cladding courses): pairs of 3D points, stroked */
      lines(F, segs, o) { if (F) (F.ln = F.ln || []).push({ segs, o }); },
      /** the faces' screen shapes relative to the anchor o ([X, Y]), far to near: { body: [...], lit: [...], glint: [...] } */
      shapes(anchor, opt) {
        opt = opt || {};
        const pd = (pts) => 'M' + pts.map(p => { const q = V.p(p[0], p[1], p[2]); return f1(q[0] - anchor[0]) + ' ' + f1(q[1] - anchor[1]); }).join('L') + 'z';
        const ld = (segs) => segs.map(s => s.map((p, k) => { const q = V.p(p[0], p[1], p[2]); return (k ? 'L' : 'M') + f1(q[0] - anchor[0]) + ' ' + f1(q[1] - anchor[1]); }).join('')).join('');
        const out = { body: [], lit: [], glint: [] };
        const tone = (n) => (n[2] > 0.7 ? 3 : n[0] < -0.35 ? 2 : n[0] > 0.35 ? 0 : 1);
        faces.slice().sort((a, b) => b.key - a.key).forEach(F => {
          const o = F.o, part = out[o.part || 'body'] || out.body;
          const paint = Array.isArray(o.f) ? o.f[tone(F.n)] : typeof o.f === 'function' ? o.f(F.n, tone(F.n)) : o.f;
          if (paint) part.push(Object.assign({ f: paint, d: pd(F.pts) }, o.op != null ? { op: o.op } : null, o.glow ? { glow: o.glow } : null, o.detail ? { detail: true } : null));
          for (const D of F.det || []) {
            const dp = D.o.f === undefined ? null : typeof D.o.f === 'function' ? D.o.f(D.o.i, D.o.j, tone(F.n)) : Array.isArray(D.o.f) ? D.o.f[tone(F.n)] : D.o.f;
            if (!dp) continue;
            (out[D.o.part || o.part || 'body'] || out.body).push(Object.assign({ f: dp, d: pd(D.pts) }, D.o.op != null ? { op: D.o.op } : null, D.o.glow ? { glow: D.o.glow } : null, D.o.detail ? { detail: true } : null));
          }
          for (const L of F.ln || []) {
            const sp = Array.isArray(L.o.s) ? L.o.s[tone(F.n)] : L.o.s;
            const dd = F.c[1] > 0 ? F.c[1] : 50, w = L.o.wm ? Math.max(L.o.min || 0.4, V.f * L.o.wm / Math.hypot(F.c[0], F.c[1])) : (L.o.w || 0.8);
            (out[L.o.part || o.part || 'body'] || out.body).push(Object.assign({ s: sp, w: f1(w), d: ld(L.segs) }, L.o.op != null ? { op: L.o.op } : null, L.o.detail ? { detail: true } : null));
            void dd;
          }
        });
        return out;
      },
      faces,
    };
    return api;
  }
  /** Points along an arc in plan: centre [x, d], radius r, from angle a0 to a1 (radians; 0 = +x, PI/2 = +d), n steps. */
  const arc = (c, r, a0, a1, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]; });
  return { model, arc, normal };
})();

/** The pixel anchors of the perspective objects: SCENE_MQN_ANCHORS[id](v) -> [X, Y] (filled by the objects below). */
const SCENE_MQN_ANCHORS = {};

/* ---------- the landmarks and structures in perspective ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const S = SCENE_MQN_SOLID, C = SCENE_MQN.cams, SD = sceneDraw;
  const NIGHT = { glow: { window: '#ffd98a', lamp: '#ffe6a8', screen: '#9ad0ff' }, on: 0.7 };
  /**
   * Define a perspective object for one camera: model(M, season, rnd, v) adds faces to M and returns the ground anchor [x, d, h]
   * (its nearest foot: the pixel placement goes there, SCENE_MQN_ANCHORS[id](v)).
   */
  function solid(id, cam, def, model) {
    const at = (M, a) => M.P(a[0] + M.off[0], a[1] + M.off[1], a[2] || 0);
    SCENE_MQN_ANCHORS[id] = (v) => { const M = S.model(cam); return at(M, model(M, 'summer', SCENE_MQN.rnd(7), v || 0)); };
    const after = def.after;
    const d2 = Object.assign({}, def); delete d2.after;
    // the weather on the materials: damp and dulled in autumn, cold and pale in winter (every slot of the base palette)
    if (d2.palette && d2.palette.base) {
      const mix = (c, t, k) => { if (typeof c !== 'string' || c[0] !== '#' || c.length !== 7) return c; const a = [1, 3, 5].map(i => parseInt(c.substr(i, 2), 16)), b = [1, 3, 5].map(i => parseInt(t.substr(i, 2), 16)); return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
      const tone = (t, k) => Object.fromEntries(Object.entries(d2.palette.base).map(([n, v]) => [n, Array.isArray(v) ? v.map(c => mix(c, t, k)) : mix(v, t, k)]));
      d2.palette = Object.assign({ spring: {}, summer: {}, autumn: tone('#6a5a44', 0.14), winter: tone('#dfe6ee', 0.2) }, d2.palette);
    }
    SD.define(Object.assign({
      size: [600, 400], variants: 1, seasonal: true, shapeBySeason: true, flippable: false,
      night: NIGHT, parts: ['body', 'glint', 'lit'], shadow: false, reflect: true,
    }, d2, {
      id,
      build(v, rnd, ctx) {
        const season = (ctx && ctx.season) || 'summer', M = S.model(cam), o = at(M, model(M, season, rnd, v));
        const out = M.shapes(o);
        if (after) after(out, M, o, season, rnd, v);
        return out;
      },
    }));
  }
  const SNOWC = '#eef2f6';
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const T4 = (x) => [x + '.0', x + '.1', x + '.2', x + '.3'];

  /* ======================================================================================
     the Lowry (v1): seen from its south-east, the canal promenade along its south side.
     A glazed ground floor (bars and the foyer, warm at night), the Lyric's great steel drum, the flytower box rising
     behind, the smaller Quays drum to the west, and the slim triangular tower at the plaza end; stainless-steel cladding in
     horizontal courses, purple and orange glass where the foyers show.
     ====================================================================================== */
  function lowry(M, season, dx, dd) {
    M.shift(dx || 0, dd || 0);
    const courses = (F, h0, h1, step) => { if (!F || !F.wall) return; const segs = []; for (let h = h0 + step; h < h1; h += step) segs.push([M.on(F.wall, 0, h), M.on(F.wall, 1, h)]); M.lines(F, segs, { s: ['@seam.0', '@seam.0', '@seam.1', '@seam.1'], wm: 0.12, op: 0.55, detail: true }); };
    const ribs = (F, n, h0, h1) => { if (!F || !F.wall) return; const segs = []; for (let i = 1; i < n; i++) segs.push([M.on(F.wall, i / n, h0), M.on(F.wall, i / n, h1)]); M.lines(F, segs, { s: '@seam.0', wm: 0.1, op: 0.4, detail: true }); };
    // the flytower: the tallest box, set back from the water
    M.prism([[26, 98], [56, 98], [56, 128], [26, 128]], 0, 38, { wall: T4('@steel'), on: (F) => { courses(F, 8, 38, 2.2); ribs(F, 12, 8, 38); } });
    // the Lyric's drum, steel in courses, a lip at the top
    const drum = S.arc([40, 78], 24, Math.PI * 0.55, Math.PI * 2.55, 22); drum.pop();
    M.prism(drum, 7, 27, { wall: T4('@steel'), on: (F) => courses(F, 7, 27, 1.8) });
    const lip = S.arc([40, 78], 24.4, Math.PI * 0.55, Math.PI * 2.55, 22); lip.pop();
    M.prism(lip, 27, 28.2, { wall: '@steel.2', top: '@steel.3' });
    // after dark the Lowry is washed in purple and blue light: the drum, the flytower and the tower
    M.prism(drum, 7, 27, { wall: '@wash.0', op: 0.4, part: 'lit', top: false });
    M.prism([[26, 98], [56, 98], [56, 128], [26, 128]], 8, 38, { wall: '@wash.1', op: 0.3, part: 'lit', top: false });
    // the Quays theatre: a lower drum further west
    const drum2 = S.arc([32, 140], 15, 0, Math.PI * 2, 16); drum2.pop();
    M.prism(drum2, 7, 21, { wall: T4('@steel'), on: (F) => courses(F, 7, 21, 1.8) });
    // the long glazed ground floor along the promenade (bars, the foyer): mullions, purple and orange behind the glass
    M.prism([[12, 46], [64, 46], [64, 158], [12, 158]], 0, 7, { wall: ['@glass.0', '@glass.1', '@glass.2', '@steel.3'], top: '@steel.1', on: (F) => {
      const L = Math.hypot(F.wall.b[0] - F.wall.a[0], F.wall.b[1] - F.wall.a[1]), n = Math.max(2, Math.round(L / 2.4));
      M.grid(F, 0.005, 0.995, 0.4, 6.4, n, 1, 0.84, 1, { f: (i) => (i % 7 === 3 ? '@purple.1' : i % 5 === 1 ? '@orange.1' : '@glass.1'), glow: 'window', op: 0.85 });
      M.grid(F, 0.005, 0.995, 3.6, 6.2, n, 1, 0.84, 1, { f: (i) => (i % 4 === 0 ? '@purple.2' : null), op: 0.5, detail: true });
      M.lines(F, [[M.on(F.wall, 0, 6.6), M.on(F.wall, 1, 6.6)], [M.on(F.wall, 0, 0.35), M.on(F.wall, 1, 0.35)]], { s: '@steel.2', wm: 0.25, op: 0.9 });
    } });
    // the first-floor gallery band over the glazing
    M.prism([[11, 45], [64, 45], [64, 159], [11, 159]], 7, 8.2, { wall: ['@steel.1', '@steel.2', '@steel.3', '@steel.3'] });
    // the upper glazed gallery between the drums (purple-lit inside)
    M.prism([[14, 100], [24, 100], [24, 126], [14, 126]], 8.2, 16, { wall: ['@purple.0', '@purple.1', '@purple.2', '@steel.3'], top: '@steel.2', on: (F) => {
      M.grid(F, 0.03, 0.97, 9, 15.4, 6, 2, 0.8, 0.8, { f: '@purple.3', glow: 'window', op: 0.9 });
    } });
    // the orange-glazed wedge of the east foyer under the drum
    M.prism([[13, 52], [22, 50], [22, 66], [13, 66]], 8.2, 14, { wall: ['@orange.0', '@orange.1', '@orange.2', '@steel.3'], top: '@steel.3', on: (F) => {
      M.grid(F, 0.04, 0.96, 8.6, 13.6, 4, 2, 0.82, 0.82, { f: '@orange.3', glow: 'window', op: 0.9 });
    } });
    // the tall steel tower at the plaza end: triangular, a glazed lantern at the top
    const tri = [[15, 40], [19, 38.6], [18.6, 42.6]];
    M.prism(tri, 0, 34, { wall: T4('@steel'), on: (F) => { courses(F, 0, 34, 1.4); M.grid(F, 0.42, 0.58, 3, 32, 1, 6, 1, 0.86, { f: '@glass.1', glow: 'window' }); } });
    M.prism(tri, 8, 34, { wall: '@wash.0', op: 0.45, part: 'lit', top: false });
    M.prism(tri, 34, 38, { wall: ['@glass.0', '@glass.2', '@glass.2', '@steel.3'], top: '@steel.2', on: (F) => M.grid(F, 0.1, 0.9, 34.4, 37.6, 2, 1, 0.8, 0.9, { f: '@glass.3', glow: 'lamp', op: 0.9 }) });
    // the cantilevered canopy over the east entrance (a sloping steel wedge)
    M.face([[12, 44, 9], [26, 34, 9.4], [30, 44, 9.8], [16, 50, 10.2]], [20, 44, 20], { f: '@steel.2', both: true });
    if (season === 'winter') M.face(lip.map(p => [p[0], p[1], 28.25]), [40, 78, 0], { f: SNOWC, op: 0.85, both: true });
    return [12, 45];
  }
  solid('landmark.mqn-lowry-v1', C.v1, {
    category: 'landmark', size: [600, 520],
    palette: { base: { steel: ['#788089', '#a3abb3', '#d0d6db', '#bcc3c8'], seam: ['#5e666e', '#e8ecef'], glass: ['#344052', '#4c5c70', '#7d93a8', '#9fb4c6'], purple: ['#462a62', '#5a3a7c', '#7650a0', '#9a76c4'], orange: ['#a85a1a', '#c87428', '#e2923c', '#f2b05a'], wash: ['#8a5ad8', '#5a7ae0'], flood: '#ffe2b0' } },
    tags: ['landmark', 'signature', 'place:uk/salford', 'uk', 'uk-north-west', 'salford', 'salford-quays', 'arts-centre', 'stainless-steel', 'kit:urban', 'kit:water', 'class:landmark'],
    credit: 'drawn for the Manchester views: the Lowry arts centre on Pier 8, Salford Quays (stylised, no lettering)',
  }, (M, season) => lowry(M, season, 6.5, 42));

  /* ======================================================================================
     Imperial War Museum North (Libeskind, 2002): three aluminium shards on the Trafford bank. The Earth shard's long curved
     roof, the Water shard's concave roof dipping to the canal, the tall Air shard leaning, slotted, with its lookout at the
     top. Placed at [ox, od] (the Earth shard's centre), plan rotation rot (radians), in metres.
     ====================================================================================== */
  function iwm(M, season, ox, od, rot) {
    const cs = Math.cos(rot), sn = Math.sin(rot), T = (x, d, h) => [ox + x * cs - d * sn, od + x * sn + d * cs, h || 0];
    const seam = (F, n) => { if (!F) return; const P = F.pts, segs = []; for (let i = 1; i < n; i++) { const t = i / n; segs.push([lerp3(P[0], P[3], t), lerp3(P[1], P[2], t)]); } M.lines(F, segs, { s: '@seam.0', wm: 0.08, op: 0.45, detail: true }); };
    // the Earth shard: a long body (local x across, d along), its roof a curve (a fragment of the globe)
    const N = 12, L0 = -46, L1 = 46, w = (t) => 15 + 6 * Math.sin(Math.PI * t), hh = (t) => 5 + 15 * Math.pow(Math.sin(Math.PI * (0.15 + 0.8 * t)), 0.8);
    const ctr = T(0, 0, 8);
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, d0 = L0 + (L1 - L0) * t0, d1 = L0 + (L1 - L0) * t1;
      const aL = T(-w(t0), d0), bL = T(-w(t1), d1), aR = T(w(t0) * 0.8, d0), bR = T(w(t1) * 0.8, d1);
      const tl = (p, t) => [p[0], p[1], hh(t)];
      for (const [p0, p1] of [[aL, bL], [aR, bR]]) {
        const F = M.face([p0, p1, tl(p1, t1), tl(p0, t0)], ctr, { f: T4('@alu') });
        seam(F, 3);
        // a slot window low in every other panel (the galleries inside), warm after dark
        if (F && i % 2 === 0) M.detail(F, [lerp3(p0, p1, 0.2).map((v, k) => (k === 2 ? 2.2 : v)), lerp3(p0, p1, 0.8).map((v, k) => (k === 2 ? 2.2 : v)), lerp3(p0, p1, 0.8).map((v, k) => (k === 2 ? 3 : v)), lerp3(p0, p1, 0.2).map((v, k) => (k === 2 ? 3 : v))], { f: '@glass.0', glow: 'window' });
      }
      const roof = M.face([tl(aL, t0), tl(bL, t1), tl(bR, t1), tl(aR, t0)], ctr, { f: ['@alu.1', '@alu.2', '@alu.3', '@alu.3'] });
      seam(roof, 4);
      M.lines(roof, [[tl(aL, t0), tl(bL, t1)], [tl(aR, t0), tl(bR, t1)]], { s: '@alu.2', wm: 0.12, op: 0.8 });
      M.face([aL, bL, tl(bL, t1), tl(aL, t0)], ctr, { f: '@flood', op: 0.22, part: 'lit' });
      M.face([aR, bR, tl(bR, t1), tl(aR, t0)], ctr, { f: '@flood', op: 0.22, part: 'lit' });
      if (i === 0) M.face([aL, aR, tl(aR, 0), tl(aL, 0)], ctr, { f: T4('@alu') });
      if (i === N - 1) M.face([bL, bR, tl(bR, 1), tl(bL, 1)], ctr, { f: T4('@alu') });
    }
    // the glazed entrance slot at the foot of the Air shard (warm at night)
    M.face([T(8, -16, 0), T(14, -12, 0), T(14, -12, 4.2), T(8, -16, 4.2)], T(0, 0, 2), { f: '@glass.1', glow: 'window', both: true });
    // the Water shard: low, its concave roof falling toward the canal (local -x), at the north end
    const WN = 8;
    for (let i = 0; i < WN; i++) {
      const t0 = i / WN, t1 = (i + 1) / WN, x0 = -18 - 16 * t0, x1 = -18 - 16 * t1, h0 = 11 - 8 * Math.pow(t0, 0.6), h1 = 11 - 8 * Math.pow(t1, 0.6);
      const a = T(x0, 12), b = T(x1, 12), c = T(x1, 40), d = T(x0, 40), cc = T(-26, 26, 3);
      M.face([a, b, [b[0], b[1], h1], [a[0], a[1], h0]], cc, { f: T4('@alu') });
      seam(M.face([[a[0], a[1], h0], [b[0], b[1], h1], [c[0], c[1], h1], [d[0], d[1], h0]], cc, { f: ['@alu.1', '@alu.2', '@alu.3', '@alu.3'] }), 3);
      M.face([a, b, [b[0], b[1], h1], [a[0], a[1], h0]], cc, { f: '@flood', op: 0.2, part: 'lit' });
      if (i === WN - 1) M.face([b, c, [c[0], c[1], h1], [b[0], b[1], h1]], cc, { f: T4('@alu') });
    }
    M.face([T(-18, 12, 0), T(-34, 12, 0), T(-34, 12, 2.6), T(-18, 12, 2.6)], T(-26, 26, 3), { f: '@glass.0', glow: 'window', both: true, op: 0.9 });
    // the Air shard: a tall leaning slab, slotted, its open lookout at the top
    const lean = 13, A0 = [[8, -22], [15, -25], [17, -15], [10, -12]];
    const base = A0.map(p => T(p[0], p[1], 0)), top = A0.map(p => T(p[0] - lean, p[1] + 2, 55));
    const ac = T(12 - lean / 2, -17, 27);
    for (let i = 0; i < 4; i++) {
      const F = M.face([base[i], base[(i + 1) % 4], top[(i + 1) % 4], top[i]], ac, { f: T4('@alu') });
      if (!F) continue;
      const P = F.pts, segs = [];
      for (let k = 1; k < 26; k++) { const t = k / 26; segs.push([lerp3(P[0], P[3], t), lerp3(P[1], P[2], t)]); }
      M.lines(F, segs, { s: '@seam.1', wm: 0.35, op: 0.35, detail: true });
      for (let k = 0; k < 3; k++) {
        const t0 = 0.84 + k * 0.045, t1 = t0 + 0.025, e0 = [lerp3(P[0], P[3], t0), lerp3(P[1], P[2], t0)], e1 = [lerp3(P[0], P[3], t1), lerp3(P[1], P[2], t1)];
        M.detail(F, [lerp3(e0[0], e0[1], 0.1), lerp3(e0[0], e0[1], 0.9), lerp3(e1[0], e1[1], 0.9), lerp3(e1[0], e1[1], 0.1)], { f: '#2a3038', op: 0.85, glow: k === 1 ? 'lamp' : undefined });
      }
    }
    M.face(top, ac, { f: '@alu.3' });
    for (let i = 0; i < 4; i++) M.face([base[i], base[(i + 1) % 4], top[(i + 1) % 4], top[i]], ac, { f: '@flood', op: 0.2, part: 'lit' });
    return T(-34, 12, 0);
  }
  const iwmPal = { base: { alu: ['#7e868c', '#a5acb1', '#ccd2d6', '#bfc5c9'], seam: ['#5a6268', '#3a4048'], glass: ['#3a4654', '#58687a'], flood: '#e8f0ff' } };
  const iwmTags = ['landmark', 'signature', 'place:uk/trafford', 'uk', 'uk-north-west', 'salford-quays', 'museum', 'aluminium', 'kit:urban', 'kit:water', 'class:landmark'];
  solid('landmark.mqn-iwm-v1', C.v1, { category: 'landmark', size: [520, 480], palette: iwmPal, tags: iwmTags,
    credit: 'drawn for the Manchester views: Imperial War Museum North, Trafford Wharf (stylised, no lettering)' }, (M, season) => iwm(M, season, -128, 300, -0.5));

  /* ======================================================================================
     the Lowry lift footbridge: a steel deck across the canal between four tall masts, the cables that lift it
     ====================================================================================== */
  function liftBridge(M, season, xa, xb, dm, H) {
    const D0 = dm - 2.2, D1 = dm + 2.2, deck = 1.2, ins = [(xa + xb) / 2, dm, 0];
    M.face([[xa, D0, deck - 1.1], [xb, D0, deck - 1.1], [xb, D0, deck], [xa, D0, deck]], ins, { f: ['@deck.0', '@deck.1', '@deck.2', '@deck.2'], both: true });
    for (const [d, op] of [[D1, 0.5], [D0, 1]]) {
      const F = M.face([[xa, d, deck], [xb, d, deck], [xb, d, deck + 1.15], [xa, d, deck + 1.15]], ins, { f: '@glassr.0', op: 0.35 * op, both: true });
      const segs = [[[xa, d, deck + 1.15], [xb, d, deck + 1.15]]];
      for (let x = xa; x >= xb; x -= 2.5) segs.push([[x, d, deck], [x, d, deck + 1.15]]);
      M.lines(F, segs, { s: '@mast.2', wm: 0.07, min: 0.5, op });
    }
    for (const x of [xa - 0.8, xb + 0.8]) {
      for (const d of [D0 - 0.6, D1 + 0.6]) M.prism([[x - 0.35, d - 0.35], [x + 0.35, d - 0.35], [x + 0.35, d + 0.35], [x - 0.35, d + 0.35]], -2.4, H, { wall: ['@mast.0', '@mast.1', '@mast.2', '@mast.2'] });
      M.prism([[x - 0.3, D0 - 0.9], [x + 0.3, D0 - 0.9], [x + 0.3, D1 + 0.9], [x - 0.3, D1 + 0.9]], H - 0.9, H, { wall: ['@mast.0', '@mast.1', '@mast.2', '@mast.2'] });
      M.prism([[x - 0.6, D0 - 1.1], [x + 0.6, D0 - 1.1], [x + 0.6, D0 - 0.1], [x - 0.6, D0 - 0.1]], H * 0.55, H * 0.55 + 3, { wall: ['@weight.0', '@weight.1', '@weight.1', '@weight.1'] });
      M.face([[x - 0.2, D0 - 0.7, H + 0.1], [x + 0.2, D0 - 0.7, H + 0.1], [x + 0.2, D0 - 0.7, H + 0.6], [x - 0.2, D0 - 0.7, H + 0.6]], [x, dm, H], { f: '#e8e4d0', glow: 'lamp', both: true });
    }
    const cables = [], mid = (xa + xb) / 2;
    for (const d of [D0, D1]) {
      for (const [x, s] of [[xa - 0.8, -1], [xb + 0.8, 1]]) for (const k of [0.12, 0.24, 0.36]) cables.push([[x, d, H - 1], [x + s * Math.abs(xb - xa) * k, d, deck + 1.15]]);
      cables.push([[xa - 0.8, d, H - 0.5], [mid, d, H * 0.42], [xb + 0.8, d, H - 0.5]]);
    }
    const Fc = M.face([[xa, D0 - 0.01, 0], [xb, D0 - 0.01, 0], [xb, D0 - 0.01, 0.01], [xa, D0 - 0.01, 0.01]], ins, { f: null, both: true });
    M.lines(Fc, cables, { s: '@cable.0', wm: 0.05, min: 0.6, op: 0.85 });
    if (season === 'winter') M.face([[xa, D0, deck + 0.01], [xb, D0, deck + 0.01], [xb, D1, deck + 0.01], [xa, D1, deck + 0.01]], ins, { f: SNOWC, both: true, op: 0.8 });
    return [xa, D0 - 1.2];
  }
  const bridgePal = { base: { deck: ['#4a5258', '#6e777e', '#9aa2a8'], mast: ['#8e969c', '#c9cfd3', '#e8ecee'], weight: ['#3e464c', '#5a636a'], cable: ['#3a4046'], glassr: ['#a8c8d6'] } };
  solid('structure.mqn-liftbridge-v1', C.v1, { category: 'structure', size: [900, 300], palette: bridgePal,
    tags: ['uk', 'salford-quays', 'bridge', 'lift-bridge', 'footbridge', 'kit:urban', 'kit:water', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: the Lowry lift footbridge across the Manchester Ship Canal (stylised)' }, (M, season) => liftBridge(M, season, -1.5, -82, 196, 24));

  /* ======================================================================================
     the MediaCityUK swing footbridge: an asymmetric cable-stayed deck from a single leaning white pylon on the Salford bank
     ====================================================================================== */
  function mcBridge(M, season, A, B, H, lean) {
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]), u = [(B[0] - A[0]) / L, (B[1] - A[1]) / L], nv = [-u[1], u[0]];
    const deck = 1.4, n = 16, hw = 2.1, Hh = (t) => deck + Math.sin(Math.PI * t) * 1.2, ins = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, -2];
    const at = (t, s) => [A[0] + u[0] * L * t + nv[0] * s, A[1] + u[1] * L * t + nv[1] * s];
    for (let i = 0; i < n; i++) {
      const ta = i / n, tb = (i + 1) / n;
      for (const s of [-hw, hw]) {
        const a = at(ta, s), b = at(tb, s);
        M.face([[a[0], a[1], Hh(ta) - 1], [b[0], b[1], Hh(tb) - 1], [b[0], b[1], Hh(tb)], [a[0], a[1], Hh(ta)]], ins, { f: ['@white.0', '@white.1', '@white.2', '@white.2'], both: true });
        const F = M.face([[a[0], a[1], Hh(ta)], [b[0], b[1], Hh(tb)], [b[0], b[1], Hh(tb) + 1.1], [a[0], a[1], Hh(ta) + 1.1]], ins, { f: '@rail.0', op: 0.3, both: true });
        M.lines(F, [[[a[0], a[1], Hh(ta) + 1.1], [b[0], b[1], Hh(tb) + 1.1]]], { s: '@white.2', wm: 0.08, min: 0.5 });
      }
      const a0 = at(ta, -hw), a1 = at(ta, hw), b0 = at(tb, -hw), b1 = at(tb, hw);
      M.face([[a0[0], a0[1], Hh(ta) - 1], [a1[0], a1[1], Hh(ta) - 1], [b1[0], b1[1], Hh(tb) - 1], [b0[0], b0[1], Hh(tb) - 1]], [ins[0], ins[1], 10], { f: '@white.0', both: true });
    }
    // the pylon: a tapering white mast behind the landing, leaning back away from the span
    const pb = [A[0] - u[0] * 3, A[1] - u[1] * 3], top = [pb[0] - u[0] * lean, pb[1] - u[1] * lean, H];
    const pc = [pb[0] - u[0] * lean / 2, pb[1] - u[1] * lean / 2, H / 2];
    const w0 = 0.7, w1 = 0.22;
    const ring = (c, w, h) => [[c[0] - nv[0] * w - u[0] * w, c[1] - nv[1] * w - u[1] * w, h], [c[0] + nv[0] * w - u[0] * w, c[1] + nv[1] * w - u[1] * w, h], [c[0] + nv[0] * w + u[0] * w, c[1] + nv[1] * w + u[1] * w, h], [c[0] - nv[0] * w + u[0] * w, c[1] - nv[1] * w + u[1] * w, h]];
    const r0 = ring(pb, w0, 0), r1 = ring(top, w1, H);
    for (let i = 0; i < 4; i++) M.face([r0[i], r0[(i + 1) % 4], r1[(i + 1) % 4], r1[i]], pc, { f: ['@white.0', '@white.1', '@white.2', '@white.2'] });
    const stays = [];
    for (let i = 3; i <= n; i += 1) { const t = i / n; for (const s of [-hw, hw]) { const p = at(t, s); stays.push([[top[0], top[1], H - 1 - i * 0.6], [p[0], p[1], Hh(t) + 1.1]]); } }
    for (let i = 0; i < 4; i++) { const g = [pb[0] - u[0] * (12 + i * 4), pb[1] - u[1] * (12 + i * 4)]; stays.push([[top[0], top[1], H - 2 - i * 1.5], [g[0], g[1], 0]]); }
    const Fc = M.face([[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], 0.01]], ins, { f: null, both: true });
    M.lines(Fc, stays, { s: '@cable.0', wm: 0.06, min: 0.5, op: 0.8 });
    M.face([[top[0] - nv[0] * 0.4, top[1] - nv[1] * 0.4, H], [top[0] + nv[0] * 0.4, top[1] + nv[1] * 0.4, H], [top[0] + nv[0] * 0.4, top[1] + nv[1] * 0.4, H + 0.8], [top[0] - nv[0] * 0.4, top[1] - nv[1] * 0.4, H + 0.8]], pc, { f: '#f2efe0', glow: 'lamp', both: true });
    const near = [A, B, pb].reduce((m, p) => (p[1] < m[1] ? p : m), A);
    return [near[0], near[1] - 2];
  }
  const mcPal = { base: { white: ['#b8bec4', '#e2e6e8', '#f6f8f8'], rail: ['#a8c4d0'], cable: ['#d8dce0'] } };
  const mcTags = ['uk', 'salford-quays', 'mediacity', 'bridge', 'swing-bridge', 'cable-stayed', 'footbridge', 'kit:urban', 'kit:water', 'role:street', 'class:structure'];
  solid('structure.mqn-mcbridge-v1', C.v1, { category: 'structure', size: [300, 300], palette: mcPal, tags: mcTags,
    credit: 'drawn for the Manchester views: the MediaCityUK swing footbridge (stylised)' }, (M, season) => mcBridge(M, season, [-2, 560], [-76, 560], 46, 9));

  /* ======================================================================================
     the quay railing: black steel posts and rails along the water's edge, in pieces (each sorted at its own depth)
     ====================================================================================== */
  function quayRail(key, cam, line, h, step) {
    const pcs = [];
    for (let i = 0; i < line.length - 1; i++) pcs.push([line[i], line[i + 1]]);
    solid('structure.mqn-quayrail-' + key, cam, { category: 'structure', size: [600, 300], variants: pcs.length, reflect: false,
      palette: { base: { iron: ['#1e2226', '#2e3439', '#4a5258', '#5e666c'] } },
      tags: ['uk', 'quay', 'railing', 'row', 'kit:urban', 'kit:water', 'role:street', 'class:structure'],
      credit: 'drawn for the Manchester views: the black quayside railings' }, (M, season, r, v) => {
      const [a, b] = pcs[Math.min(v, pcs.length - 1)], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
      const pt = (t, hh) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, hh];
      const segs = [[pt(0, h), pt(1, h)], [pt(0, h * 0.55), pt(1, h * 0.55)], [pt(0, 0.12), pt(1, 0.12)]], posts = [];
      for (let i = 0; i <= n; i++) posts.push([pt(i / n, 0), pt(i / n, h + 0.04)]);
      const F = M.face([pt(0, 0), pt(1, 0), pt(1, 0.01), pt(0, 0.01)], [a[0] + 5, (a[1] + b[1]) / 2, 0], { f: null, both: true });
      M.lines(F, segs, { s: '@iron.1', wm: 0.05, min: 0.6 });
      M.lines(F, posts, { s: '@iron.0', wm: 0.07, min: 0.7 });
      if (season === 'winter') M.lines(F, [[pt(0, h + 0.03), pt(1, h + 0.03)]], { s: SNOWC, wm: 0.03, min: 0.5, op: 0.8 });
      return a[1] < b[1] ? [a[0], a[1], 0] : [b[0], b[1], 0];
    });
    return pcs.length;
  }
  SCENE_MQN_ANCHORS._rails = {};
  SCENE_MQN_ANCHORS._rails.v1 = quayRail('v1', C.v1, [[-1.1, 4.2], [-1.1, 6.5], [-1.1, 9], [-1.15, 13], [-1.2, 20], [-1.25, 30], [-1.3, 44], [-1.4, 62], [-1.5, 86], [-1.5, 118]], 1.1, 1.8);

  /* ======================================================================================
     view 2 (MediaCityUK): IWM North across the water, the swing footbridge from the piazza's quay, the tram stop's
     shelters along the platform, the overhead line masts and wires along the tracks, the piazza's big screen
     ====================================================================================== */
  solid('landmark.mqn-iwm-v2', C.v2, { category: 'landmark', size: [520, 480], palette: iwmPal, tags: iwmTags,
    credit: 'drawn for the Manchester views: Imperial War Museum North, Trafford Wharf (stylised, no lettering)' }, (M, season) => iwm(M, season, -30, 385, 1.35));
  solid('structure.mqn-mcbridge-v2', C.v2, { category: 'structure', size: [600, 500], palette: mcPal, tags: mcTags,
    credit: 'drawn for the Manchester views: the MediaCityUK swing footbridge (stylised)' }, (M, season) => mcBridge(M, season, [16, 130], [22, 318], 44, 8));
  // the track centreline (shared with the scene's tramway surface)
  const TRACK2 = SCENE_MQN.track2;
  const trackAt = (s) => {
    let acc = 0;
    for (let i = 0; i < TRACK2.length - 1; i++) { const a = TRACK2[i], b = TRACK2[i + 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (acc + l >= s) { const t = (s - acc) / l; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (b[0] - a[0]) / l, (b[1] - a[1]) / l]; } acc += l; }
    const a = TRACK2[TRACK2.length - 2], b = TRACK2[TRACK2.length - 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]); return [b[0], b[1], (b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  // the overhead line: a mast every ~25 m on the outside of the curve, its cantilever arm over both tracks, the contact wires
  const OLE = [28, 48, 68, 90, 115, 150];
  solid('structure.mqn-ole-v2', C.v2, { category: 'structure', size: [600, 400], variants: OLE.length - 1, reflect: false,
    palette: { base: { mast: ['#5e666c', '#8a9298', '#aab2b8'], wire: ['#2a2e32'] } },
    tags: ['uk', 'tram', 'metrolink', 'overhead-line', 'row', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: the Metrolink overhead line masts and wires' }, (M, season, r, v) => {
    const s0 = OLE[v], s1 = OLE[v + 1], a = trackAt(s0), nA = [-a[3], a[2]], mast = [a[0] - nA[0] * 4.6, a[1] - nA[1] * 4.6];
    M.prism([[mast[0] - 0.14, mast[1] - 0.14], [mast[0] + 0.14, mast[1] - 0.14], [mast[0] + 0.14, mast[1] + 0.14], [mast[0] - 0.14, mast[1] + 0.14]], 0, 7.2, { wall: ['@mast.0', '@mast.1', '@mast.2', '@mast.2'] });
    const segs = [[[mast[0], mast[1], 6.9], [a[0] + nA[0] * 2.2, a[1] + nA[1] * 2.2, 6.6]], [[mast[0], mast[1], 6.2], [a[0] + nA[0] * 2.2, a[1] + nA[1] * 6.0 * 0 + nA[1] * 2.2, 6.0]]];
    const wires = [];
    for (const off of [-1.6, 1.6]) {
      const pts = [];
      for (let k = 0; k <= 8; k++) { const q = trackAt(s0 + (s1 - s0) * k / 8), nq = [-q[3], q[2]]; pts.push([q[0] + nq[0] * off, q[1] + nq[1] * off, 5.9 + 0.12 * Math.sin(Math.PI * k / 8)]); }
      wires.push(pts);
      const pts2 = pts.map(p => [p[0], p[1], 6.6 - 0.35 * Math.sin(Math.PI * (pts.indexOf(p)) / 8)]);
      wires.push(pts2);
    }
    const F = M.face([[a[0], a[1], 0], [a[0] + 1, a[1], 0], [a[0] + 1, a[1], 0.01]], [a[0], a[1] + 5, -1], { f: null, both: true });
    M.lines(F, segs, { s: '@mast.1', wm: 0.09, min: 0.6 });
    M.lines(F, wires, { s: '@wire.0', wm: 0.012, min: 0.45, op: 0.8 });
    return [mast[0], mast[1], 0];
  });
  // the tram stop: two shelters on the platform (steel posts, glass backs, a canopy with a yellow fascia), the ticket machine
  // and the information display on their posts; piece v: a shelter (0, 1) or the machine and display (2)
  const STOP2 = [[1.4, 34, 43, 1], [1.6, 28, 30.5, 1], [-8.6, 30, 39, -1]];
  solid('structure.mqn-tramstop-v2', C.v2, { category: 'structure', size: [800, 500], variants: STOP2.length, reflect: false,
    palette: { base: { steel: ['#4a5258', '#7a848c', '#a4aeb6', '#c0c8ce'], yellow: ['#c89a10', '#e8b818', '#f4cc3a'], glass: ['#8eaebc'], screen: ['#1a2a3a', '#ff9a2a'], lamp: '#f6f0dc' } },
    tags: ['uk', 'tram', 'metrolink', 'tram-stop', 'shelter', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: a Metrolink stop (shelters, machine, display; no lettering or logos)' }, (M, season, r, v) => {
    const [x, d0, d1, sd] = STOP2[v], side = sd || 1;
    if (v !== 1) {
      const xb = x + 1.4 * side, H = 2.7, xl = Math.min(x - 0.5 * side, xb + 0.2 * side), xr = Math.max(x - 0.5 * side, xb + 0.2 * side), xf = x - 0.5 * side;
      // posts at both ends and the middle
      for (const d of [d0, (d0 + d1) / 2, d1]) for (const xx of [x, xb]) M.prism([[xx - 0.06, d - 0.06], [xx + 0.06, d - 0.06], [xx + 0.06, d + 0.06], [xx - 0.06, d + 0.06]], 0, H, { wall: ['@steel.0', '@steel.1', '@steel.2', '@steel.2'] });
      // the glass back and ends
      M.face([[xb, d0, 0.15], [xb, d1, 0.15], [xb, d1, H - 0.1], [xb, d0, H - 0.1]], [x, (d0 + d1) / 2, 1], { f: '@glass.0', op: 0.35, both: true });
      M.face([[x + 0.1 * side, d1, 0.15], [xb, d1, 0.15], [xb, d1, H - 0.1], [x + 0.1 * side, d1, H - 0.1]], [x, (d0 + d1) / 2, 1], { f: '@glass.0', op: 0.3, both: true });
      // the bench along the back
      const b0 = xb - 0.5 * side, b1 = xb - 0.05 * side;
      M.prism([[Math.min(b0, b1), d0 + 1], [Math.max(b0, b1), d0 + 1], [Math.max(b0, b1), d1 - 1], [Math.min(b0, b1), d1 - 1]], 0.42, 0.48, { wall: ['@steel.1', '@steel.2', '@steel.3', '@steel.3'] });
      // the canopy slab, its yellow fascia, a lamp strip under its front edge
      M.prism([[xl, d0 - 0.3], [xr, d0 - 0.3], [xr, d1 + 0.3], [xl, d1 + 0.3]], H, H + 0.18, { wall: ['@yellow.0', '@yellow.1', '@yellow.2', '@steel.3'], top: '@steel.3', bottom: '@steel.0' });
      M.face([[xf, d0 - 0.28, H - 0.01], [xf + 0.18 * side, d0 - 0.28, H - 0.01], [xf + 0.18 * side, d1 + 0.28, H - 0.01], [xf, d1 + 0.28, H - 0.01]], [x, d0, H + 1], { f: '@lamp', glow: 'lamp', both: true });
      if (season === 'winter') M.face([[xl, d0 - 0.3, H + 0.2], [xr, d0 - 0.3, H + 0.2], [xr, d1 + 0.3, H + 0.2], [xl, d1 + 0.3, H + 0.2]], [x, d0, 0], { f: SNOWC, op: 0.85, both: true });
      return [xf, d0 - 0.3, 0];
    }
    // the ticket machine (yellow and grey) and the passenger display on a post
    M.prism([[x, d0], [x + 0.6, d0], [x + 0.6, d0 + 0.45], [x, d0 + 0.45]], 0, 1.8, { wall: ['@steel.1', '@yellow.1', '@yellow.2', '@steel.3'], on: (F) => M.grid(F, 0.2, 0.8, 1.1, 1.55, 1, 1, 1, 1, { f: '@screen.0' }) });
    M.prism([[x + 0.25, d1 - 0.05], [x + 0.35, d1 - 0.05], [x + 0.35, d1 + 0.05], [x + 0.25, d1 + 0.05]], 0, 2.6, { wall: ['@steel.0', '@steel.1', '@steel.2', '@steel.2'] });
    M.prism([[x - 0.2, d1 - 0.06], [x + 0.8, d1 - 0.06], [x + 0.8, d1 + 0.06], [x - 0.2, d1 + 0.06]], 2.6, 3.0, { wall: ['@steel.0', '@steel.0', '@steel.1', '@steel.1'], on: (F) => M.grid(F, 0.08, 0.92, 2.66, 2.94, 1, 1, 1, 1, { f: '@screen.1', glow: 'lamp', op: 0.9 }) });
    return [x, d0, 0];
  });
  // the piazza's big screen on the wall of the studios block (an abstract picture, no lettering), lit after dark
  solid('structure.mqn-screen-v2', C.v2, { category: 'structure', size: [300, 300], reflect: false,
    palette: { base: { frame: ['#2a2e34', '#3e444a', '#55606a'], img: ['#2f6fb0', '#e07a3a', '#3aa078', '#f0d060', '#c84a6a', '#86c8e8'] } },
    tags: ['uk', 'mediacity', 'big-screen', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: the big screen on the MediaCityUK piazza (an abstract picture)' }, (M, season, r) => {
    const x = 27.9, d0 = 52, d1 = 64, h0 = 6, h1 = 13;
    M.prism([[x, d0 - 0.4], [x + 0.6, d0 - 0.4], [x + 0.6, d1 + 0.4], [x, d1 + 0.4]], h0 - 0.4, h1 + 0.4, { wall: ['@frame.0', '@frame.1', '@frame.2', '@frame.2'] });
    const F = M.face([[x - 0.01, d0, h0], [x - 0.01, d1, h0], [x - 0.01, d1, h1], [x - 0.01, d0, h1]], [x + 1, (d0 + d1) / 2, 9], { f: '@img.0', glow: 'screen' });
    if (F) {
      // an abstract picture: soft colour fields
      const cells = [[0, 0.45, 0, 0.6, 1], [0.45, 1, 0, 0.35, 2], [0.45, 0.75, 0.35, 1, 3], [0.75, 1, 0.35, 1, 4], [0, 0.45, 0.6, 1, 5]];
      for (const [u0, u1, v0, v1, k] of cells) M.detail(F, [[x - 0.02, d0 + (d1 - d0) * u0, h0 + (h1 - h0) * v0], [x - 0.02, d0 + (d1 - d0) * u1, h0 + (h1 - h0) * v0], [x - 0.02, d0 + (d1 - d0) * u1, h0 + (h1 - h0) * v1], [x - 0.02, d0 + (d1 - d0) * u0, h0 + (h1 - h0) * v1]], { f: '@img.' + k, op: 0.85, glow: 'screen' });
      M.detail(F, [[x - 0.03, d0 + 2, h0 + 2], [x - 0.03, d0 + 6, h0 + 2.6], [x - 0.03, d0 + 5, h0 + 5.6], [x - 0.03, d0 + 1.5, h0 + 4.8]], { f: '#ffffff', op: 0.3, part: 'glint' });
    }
    return [x - 1, 48, 0];
  });
  SCENE_MQN_ANCHORS._rails.v2 = quayRail('v2', C.v2, [[-90, 130], [13.6, 130]], 1.1, 1.8);

  /* ======================================================================================
     view 3 (Stevenson Square): the painted kiosk in the middle of the square and the big painted gable at the end of the
     street. The paintings are abstract (bold colour fields, birds and bees, stripes and dots); no lettering, no faces.
     ====================================================================================== */
  /** Paint an abstract mural on a vertical wall rectangle: the wall from a to b (plan points), h0..h1; r: seeded; style 0..2. */
  function mural(M, F, a, b, h0, h1, r, style) {
    if (!F) return;
    const at = (u, h) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, h], H = h1 - h0, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const box = (u0, u1, v0, v1, f, o) => M.detail(F, [at(u0, h0 + H * v0), at(u1, h0 + H * v0), at(u1, h0 + H * v1), at(u0, h0 + H * v1)], Object.assign({ f }, o || {}));
    const blob = (cu, cv, ru, rv, n, f, o) => { const pts = []; for (let i = 0; i < n; i++) { const t = i / n * Math.PI * 2, k = 0.75 + r() * 0.4; pts.push(at(cu + Math.cos(t) * ru * k, h0 + H * (cv + Math.sin(t) * rv * k))); } M.detail(F, pts, Object.assign({ f }, o || {})); };
    // the ground: a wash of two colours, then bold fields, then figures
    box(0, 1, 0, 1, '@paint.' + (style === 1 ? 5 : style === 2 ? 3 : 0));
    box(0, 1, 0.55 + r() * 0.1, 1, '@paint.' + (style === 1 ? 0 : style === 2 ? 6 : 4), { op: 0.9 });
    const n = Math.max(3, Math.round(L / 2.4));
    for (let i = 0; i < n; i++) { const u = (i + r() * 0.6) / n, v = 0.1 + r() * 0.7; blob(u, v, 0.06 + r() * 0.08, 0.08 + r() * 0.14, 9, '@paint.' + (1 + Math.floor(r() * 6)), { op: 0.95 }); }
    // stripes and a band of dots
    for (let i = 0; i < 5; i++) { const v = 0.04 + i * 0.035; box(0, 1, v, v + 0.015, '@paint.' + ((i + style) % 7), { op: 0.9 }); }
    for (let i = 0; i < Math.round(L * 1.2); i++) blob((i + 0.5) / Math.round(L * 1.2), 0.5, 0.008, 0.02, 6, '@paint.' + (i % 7), { op: 0.9 });
    // birds and bees: small dark shapes in a drift across the upper half
    for (let i = 0; i < Math.round(L / 1.5); i++) {
      const u = r(), v = 0.6 + r() * 0.35, s = 0.012 + r() * 0.01;
      if (r() < 0.5) M.detail(F, [at(u - s * 2, h0 + H * v), at(u, h0 + H * (v - s * 0.8)), at(u + s * 2, h0 + H * v), at(u, h0 + H * (v - s * 0.3))], { f: '@paint.7', op: 0.85 });
      else { blob(u, v, s, s * 1.4, 7, '@paint.2'); M.detail(F, [at(u - s * 0.6, h0 + H * (v + s * 0.4)), at(u + s * 0.6, h0 + H * (v + s * 0.4)), at(u + s * 0.6, h0 + H * (v + s * 0.8)), at(u - s * 0.6, h0 + H * (v + s * 0.8))], { f: '@paint.7' }); }
    }
  }
  const PAINT = { base: { paint: ['#e8d24a', '#e4572e', '#2e86ab', '#f2a541', '#5aa66a', '#c8457a', '#7a4fb0', '#1e1e24'], brick: ['#7a3628', '#8e4430', '#a65a3e', '#5e281c'], roof: ['#3a3c40', '#55585c'], shutter: ['#6a7078', '#8a9098'], lamp: '#ffe2a8' },
    winter: { paint: ['#d8c650', '#d05a36', '#3a7c9e', '#e0a04a', '#5a9a68', '#b84a74', '#704ea0', '#1e1e24'] } };
  solid('structure.mqn-kiosk-v3', C.v3, { category: 'structure', size: [500, 300], palette: PAINT, reflect: false,
    tags: ['signature', 'uk', 'manchester', 'northern-quarter', 'street-art', 'mural', 'kiosk', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: the painted kiosk on Stevenson Square (an abstract mural, no lettering)' }, (M, season, r) => {
    const foot = [[3, 30], [11, 30], [11, 35], [3, 35]], H = 3.4;
    M.prism(foot, 0, H, { wall: ['@brick.3', '@brick.0', '@brick.1', '@brick.2'], top: '@roof.0', on: (F, i, a, b) => {
      mural(M, F, a, b, 0.25, H - 0.35, r, i % 3);
      if (i === 0) M.detail(F, [M.on(F.wall, 0.62, 0.05), M.on(F.wall, 0.86, 0.05), M.on(F.wall, 0.86, 2.3), M.on(F.wall, 0.62, 2.3)], { f: '@shutter.0', op: 1 });
    } });
    M.prism([[2.85, 29.85], [11.15, 29.85], [11.15, 35.15], [2.85, 35.15]], H, H + 0.3, { wall: '@roof.1', top: '@roof.0' });
    if (season === 'winter') M.face([[2.85, 29.85, H + 0.31], [11.15, 29.85, H + 0.31], [11.15, 35.15, H + 0.31], [2.85, 35.15, H + 0.31]], [7, 32, 0], { f: SNOWC, op: 0.9, both: true });
    return [3, 30, 0];
  });
  // the big painted gable at the end of the street (the wall at d 88 from x -22 to -4, 22 m high), anchored just in front of it
  solid('structure.mqn-mural-v3', C.v3, { category: 'structure', size: [600, 600], palette: PAINT, reflect: false,
    tags: ['signature', 'uk', 'manchester', 'northern-quarter', 'street-art', 'mural', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: a painted gable in the Northern Quarter (abstract, no lettering)' }, (M, season, r) => {
    const a = [-4, 87.9], b = [-22, 87.9];
    const F = M.face([[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], 21], [a[0], a[1], 21]], [-13, 95, 10], { f: null });
    mural(M, F, a, b, 2.5, 20.5, r, 1);
    return [-13, 87.2, 0];
  });

  /* ======================================================================================
     view 4 (Ancoats): a lock on the Rochdale Canal: the chamber's stone copings with their white edge lines, the lower and
     upper pairs of mitre gates (dark oak, a walkway with a handrail along their tops), the black and white balance beams
     lying back over the banks, paddle gear, bollards. The canal: x -9 (the wharf side) to -1 (the towpath side).
     ====================================================================================== */
  const LOCK4 = { x0: -8.6, x1: -1.4, gates: [[30, -1], [54, 1]] };
  solid('structure.mqn-lock-v4', C.v4, { category: 'structure', size: [800, 300], variants: 2, reflect: true,
    palette: { base: { oak: ['#2e2620', '#4a3e32', '#5e5040', '#3a3028'], beam: ['#1c1c1e', '#f2f0ea', '#3a3a3c'], stone: ['#8a8478', '#b4ac9c', '#e8e6e0'], iron: ['#2a2c2e', '#5a5e62'] },
      winter: { oak: ['#2e2a26', '#4a4440', '#5e5650', '#3a3430'] } },
    tags: ['signature', 'uk', 'canal', 'lock', 'lock-gate', 'rochdale-canal', 'kit:water', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: a Rochdale Canal lock (gates, balance beams, paddle gear)' }, (M, season, r, v) => {
    const [dg, dir] = LOCK4.gates[v], x0 = LOCK4.x0, x1 = LOCK4.x1, xm = (x0 + x1) / 2, mit = 1.2 * dir, top = 0.55, bot = C.v4.water - 0.1;
    const ins = [xm, dg + 3 * dir, -1];
    // the two leaves: from each wall to the mitre in the middle (pointing upstream, +d for the lower gates)
    for (const [xa, xb] of [[x0, xm], [x1, xm]]) {
      const a = [xa, dg], b = [xb, dg + mit];
      const F = M.face([[a[0], a[1], bot], [b[0], b[1], bot], [b[0], b[1], top], [a[0], a[1], top]], ins, { f: ['@oak.0', '@oak.1', '@oak.2', '@oak.2'], both: true });
      if (F) {
        const segs = []; for (let h = bot + 0.3; h < top; h += 0.3) segs.push([[a[0], a[1], h], [b[0], b[1], h]]);
        segs.push([[a[0], a[1], bot], [b[0], b[1], top]]);
        M.lines(F, segs, { s: '@oak.3', wm: 0.03, min: 0.5, op: 0.7 });
        // the walkway on the top and its handrail on posts
        M.lines(F, [[[a[0], a[1], top + 0.05], [b[0], b[1], top + 0.05]]], { s: '@beam.1', wm: 0.14, min: 0.8 });
        M.lines(F, [[[a[0], a[1] - 0.2 * dir, top + 1.0], [b[0], b[1] - 0.2 * dir, top + 1.0]], [[a[0], a[1] - 0.2 * dir, top], [a[0], a[1] - 0.2 * dir, top + 1.0]], [[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.2 * dir, top], [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 0.2 * dir, top + 1.0]]], { s: '@beam.2', wm: 0.04, min: 0.6 });
      }
      // the balance beam: from the gate's heel back over the bank (downstream for the lower gates), black with a white tip
      const side = xa < xm ? -1 : 1, bx = xa + side * 0.5, bd0 = dg, bd1 = dg - 7 * dir, bh = 1.1, bw = 0.22;
      // the beam leans out a little from the gate line toward its tail (a quad from the heel to the tail)
      const tx = bx + side * 0.9, d0b = Math.min(bd0, bd1), d1b = Math.max(bd0, bd1), xn = dir > 0 ? tx : bx, xf = dir > 0 ? bx : tx;
      const beam = (h0, h1, fill) => {
        const foot = [[xn - bw, d0b], [xn + bw, d0b], [xf + bw, d1b], [xf - bw, d1b]];
        M.prism(foot, h0, h1, { wall: fill, top: fill[2] });
      };
      beam(bh - 0.22, bh + 0.22, ['@beam.0', '@beam.0', '@beam.2', '@beam.2']);
      // its white tail end and a white band at the heel
      const tipD = dir > 0 ? d0b : d1b, tipX = dir > 0 ? xn : xf;
      M.prism([[tipX - bw - 0.02, tipD - 0.9], [tipX + bw + 0.02, tipD - 0.9], [tipX + bw + 0.02, tipD + 0.9], [tipX - bw - 0.02, tipD + 0.9]], bh - 0.23, bh + 0.23, { wall: ['@beam.1', '@beam.1', '@beam.1', '@beam.1'], top: '@beam.1' });
      // the white-painted top rail of the gate
      // the paddle gear: a small iron post by the heel
      M.prism([[bx + side * 0.6 - 0.12, dg + 0.6 * dir - 0.12], [bx + side * 0.6 + 0.12, dg + 0.6 * dir - 0.12], [bx + side * 0.6 + 0.12, dg + 0.6 * dir + 0.12], [bx + side * 0.6 - 0.12, dg + 0.6 * dir + 0.12]], 0, 0.85, { wall: ['@iron.0', '@iron.1', '@iron.1', '@iron.1'] });
    }
    if (season === 'winter') M.face([[x0, dg, top + 0.07], [xm, dg + mit, top + 0.07], [x1, dg, top + 0.07], [xm, dg + mit - 0.3, top + 0.07]], ins, { f: SNOWC, op: 0.7, both: true });
    return [x1 + 1, dg - 6.6 * Math.max(0, dir), 0];
  });
  // a brick road bridge over the canal far down the cut: an elliptical arch, stone voussoirs and coping, the parapet over
  solid('structure.mqn-arch-v4', C.v4, { category: 'structure', size: [900, 400], reflect: true,
    palette: { base: { brick: ['#6e3024', '#7e3a2a', '#94482e', '#5a261c'], stone: ['#a49a86', '#c4baa4'], dark: ['#1e1a18'] } },
    tags: ['signature', 'uk', 'canal', 'bridge', 'brick', 'kit:water', 'kit:urban', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: a brick road bridge over the Rochdale Canal' }, (M, season) => {
    const d = 214, d1 = 222, xa = -15, xb = 4, sp0 = -9.2, sp1 = -1.6, spring = 0.8, crown = 3.6, deck = 4.6, par = 5.6, wl = C.v4.water;
    const arch = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16, x = sp0 + (sp1 - sp0) * t; arch.push([x, spring + (crown - spring) * Math.sqrt(Math.max(0, 1 - Math.pow(2 * t - 1, 2)))]); }
    // the face: the brick spandrel round the arch, the dark arch hole, the voussoir ring and the coping
    const face = [[xa, wl], [sp0, wl], [sp0, spring]].concat(arch.slice(1, -1)).concat([[sp1, spring], [sp1, wl], [xb, wl], [xb, par], [xa, par]]);
    M.face(face.map(p => [p[0], d, p[1]]), [(xa + xb) / 2, d + 4, 2], { f: ['@brick.0', '@brick.1', '@brick.2', '@brick.2'] });
    M.face([[sp0, d + 0.01, wl], [sp1, d + 0.01, wl]].concat(arch.slice().reverse().map(p => [p[0], d + 0.01, p[1]])).map(p => p), [(xa + xb) / 2, d + 4, 2], { f: '@dark.0', both: true, op: 0.92 });
    const F = M.face([[xa, d - 0.02, deck], [xb, d - 0.02, deck], [xb, d - 0.02, deck + 0.3], [xa, d - 0.02, deck + 0.3]], [(xa + xb) / 2, d + 4, 2], { f: '@stone.0', both: true });
    M.face([[xa - 0.2, d - 0.04, par - 0.25], [xb + 0.2, d - 0.04, par - 0.25], [xb + 0.2, d - 0.04, par], [xa - 0.2, d - 0.04, par]], [(xa + xb) / 2, d + 4, 2], { f: '@stone.1', both: true });
    const ring = [];
    for (let i = 0; i < 16; i++) { const a = arch[i], b = arch[i + 1]; ring.push([[a[0], d - 0.03, a[1]], [a[0] + (a[0] - (sp0 + sp1) / 2) * 0.12, d - 0.03, a[1] + 0.7]]); }
    M.lines(F, ring, { s: '@stone.0', wm: 0.18, min: 0.6, op: 0.9 });
    const courses = []; for (let h = wl + 0.3; h < par - 0.3; h += 0.3) courses.push([[xa, d - 0.02, h], [sp0, d - 0.02, h]], [[sp1, d - 0.02, h], [xb, d - 0.02, h]]);
    M.lines(F, courses, { s: '@brick.3', wm: 0.02, min: 0.35, op: 0.35, detail: true });
    // the bridge's depth: the underside of the arch seen through (a darker soffit band)
    M.face(arch.map(p => [p[0], d + 0.02, p[1]]).concat(arch.slice().reverse().map(p => [p[0], d1, p[1] + 0.05])), [(xa + xb) / 2, d + 4, -2], { f: '@brick.3', both: true, op: 0.9 });
    if (season === 'winter') M.face([[xa - 0.2, d - 0.05, par + 0.02], [xb + 0.2, d - 0.05, par + 0.02], [xb + 0.2, d + 0.4, par + 0.02], [xa - 0.2, d + 0.4, par + 0.02]], [(xa + xb) / 2, d + 4, 2], { f: SNOWC, both: true, op: 0.9 });
    return [xb, d - 0.5, 0];
  });
  // the lock chamber's copings: white-edged stone along both sides between the gates (one piece)
  solid('structure.mqn-lockside-v4', C.v4, { category: 'structure', size: [800, 200], reflect: false,
    palette: { base: { stone: ['#8a8478', '#b4ac9c', '#ecebe6'] } },
    tags: ['uk', 'canal', 'lock', 'coping', 'kit:water', 'role:street', 'class:structure'],
    credit: 'drawn for the Manchester views: a lock chamber coping' }, (M) => {
    for (const x of [LOCK4.x0, LOCK4.x1]) {
      const s = x < -5 ? -1 : 1, xa = x, xb = x + s * 0.7;
      M.face([[Math.min(xa, xb), 26, 0.02], [Math.max(xa, xb), 26, 0.02], [Math.max(xa, xb), 58, 0.02], [Math.min(xa, xb), 58, 0.02]], [x, 42, -1], { f: '@stone.1', both: true });
      M.face([[xa, 26, 0.035], [xa + s * 0.15, 26, 0.035], [xa + s * 0.15, 58, 0.035], [xa, 58, 0.035]], [x, 42, -1], { f: '@stone.2', both: true });
    }
    return [LOCK4.x1, 26, 0];
  });
})();

/* ---------- small street objects of the views (elevation sprites, real sizes, four seasons) ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1, rect = SD.rect, ell = SD.ell, poly = SD.poly;
  const SNOW = '#eef2f6';
  const snow = (season, d, op) => (season === 'winter' ? { f: SNOW, d, op: op || 0.9 } : null);

  /* street.mqn-parasol: a cafe parasol on its pole and weighted base (4 colours: cream, slate, bottle green, terracotta) */
  SD.define({
    id: 'street.mqn-parasol', category: 'street', size: [150, 130], variants: 4, seasonal: true, flippable: true,
    real: { h: 2.6, w: 2.6 },
    palette: { base: { cloth: ['#e8dcc0', '#5a6670', '#2e5a44', '#b8643e'], under: ['#c4b89a', '#3e4850', '#22443a', '#8e4a2e'], pole: ['#3a3836', '#8a8680'], lamp: '#ffe2a8' },
      spring: {}, summer: {}, autumn: { cloth: ['#d4c8ac', '#505c66', '#2a5040', '#a85a38'], under: ['#b0a488', '#363f46', '#1e3c34', '#7e4228'] }, winter: { cloth: ['#dcd4c4', '#56626c', '#2c5242', '#ac6040'] } },
    parts: ['body', 'lit'], night: { glow: { lamp: '#ffe2a8' }, on: 0.9 },
    tags: ['uk', 'cafe', 'parasol', 'terrace', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester views: a cafe parasol (no lettering)',
    build(v, r, ctx) {
      const b = [], c = '@cloth.' + v, u = '@under.' + v, W = 70, top = -128, rim = -100;
      b.push(['@pole.0', rect(-14, -4, 28, 4)], ['@pole.0', rect(-2, rim, 4, 98)]);
      b.push([u, `M${-W} ${rim}Q0 ${rim + 12} ${W} ${rim}L${W - 4} ${rim + 5}Q0 ${rim + 15} ${-W + 4} ${rim + 5}z`]);
      b.push([c, `M${-W} ${rim}L-6 ${top}L6 ${top}L${W} ${rim}Q0 ${rim + 12} ${-W} ${rim}z`]);
      // the panels: seams from the crown, the valance scallops
      b.push({ s: u, w: 1, d: `M0 ${top}L${-W * 0.55} ${rim + 6}M0 ${top}L${-W * 0.15} ${rim + 9}M0 ${top}L${W * 0.25} ${rim + 9}M0 ${top}L${W * 0.62} ${rim + 5}` });
      b.push({ f: u, d: Array.from({ length: 10 }, (_, i) => { const x = -W + i * 14; return `M${x} ${rim + (i === 0 ? 0 : 2)}q7 9 14 2z`; }).join('') });
      b.push({ f: '#ffffff', op: 0.18, detail: true, d: `M${-W + 8} ${rim - 2}L-6 ${top + 2}L-2 ${top + 4}L${-W * 0.45} ${rim + 4}z` });
      b.push(['@pole.1', rect(-3, top - 6, 6, 6)]);
      if (ctx.season === 'winter') b.push({ f: SNOW, d: `M${-W + 10} ${rim - 3}L-6 ${top}L6 ${top}L${W - 10} ${rim - 3}L${W * 0.3} ${rim - 10}L0 ${top + 6}L${-W * 0.3} ${rim - 10}z`, op: 0.85 });
      const lit = [{ f: '@lamp', d: ell(0, rim + 4, 5, 2.5), glow: 'lamp' }, { f: '@lamp', d: `M${-W + 6} ${rim + 3}Q0 ${rim + 13} ${W - 6} ${rim + 3}L${W - 10} ${rim + 6}Q0 ${rim + 15} ${-W + 10} ${rim + 6}z`, op: 0.35 }];
      return { body: b, lit };
    },
  });

  /* street.mqn-planter-grass: a square timber planter with ornamental grasses and a few perennials (the Quays' planting) */
  SD.define({
    id: 'street.mqn-planter-grass', category: 'street', size: [120, 110], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 1.5, w: 2 },
    palette: { base: { wood: ['#6e5236', '#8e6c48', '#4e3a26'], grass: ['#7a9a4a', '#a8b85e', '#5a7a36'], head: ['#d8c88a'], bloom: ['#8a5aa0'] },
      spring: { grass: ['#6a9a3e', '#8ab84e', '#4e7a2e'], bloom: ['#e0c048'] }, summer: { grass: ['#6e9440', '#9ab456', '#4e7230'], bloom: ['#8a5aa0'] },
      autumn: { grass: ['#b89a52', '#d4b468', '#8a6e3a'], head: ['#e8d8a8'], bloom: ['#a8582e'] }, winter: { grass: ['#a8987a', '#c4b494', '#7e705a'], head: ['#d8d0bc'], bloom: ['#6a5a4a'] } },
    parts: ['body', 'blades'], anim: { sway: { part: 'blades', amp: 2.2, period: 4.6 } },
    tags: ['uk', 'planter', 'grasses', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester views: a timber planter of ornamental grasses',
    build(v, r, ctx) {
      const b = [], g = [], W = 54, Hb = 40;
      b.push(['@wood.0', rect(-W, -Hb, 2 * W, Hb)], ['@wood.2', rect(W - 16, -Hb, 16, Hb), 0.7]);
      for (let y = -Hb + 8; y < 0; y += 8) b.push({ s: '@wood.2', w: 0.8, op: 0.6, d: `M${-W} ${y}h${2 * W}` });
      b.push(['@wood.1', rect(-W - 2, -Hb - 4, 2 * W + 4, 4)]);
      b.push({ f: '#3a2e22', d: rect(-W + 2, -Hb - 2, 2 * W - 4, 3) });
      let s0 = '', s1 = '', s2 = '';
      for (let i = 0; i < 32; i++) {
        const x = -W + 4 + r() * (2 * W - 8), h = 30 + r() * 42, lean = (r() - 0.5) * 26, d = `M${f1(x - 1.4)} ${-Hb}Q${f1(x + lean * 0.3)} ${f1(-Hb - h * 0.6)} ${f1(x + lean)} ${f1(-Hb - h)}Q${f1(x + lean * 0.3 + 1)} ${f1(-Hb - h * 0.55)} ${f1(x + 1.4)} ${-Hb}z`;
        const k = r(); if (k < 0.4) s0 += d; else if (k < 0.75) s1 += d; else s2 += d;
      }
      g.push({ f: '@grass.2', d: s2, detail: true }, { f: '@grass.0', d: s0 }, { f: '@grass.1', d: s1 });
      let heads = '', bl = '';
      for (let i = 0; i < 14; i++) { const x = -W + 6 + r() * (2 * W - 12), y = -Hb - 50 - r() * 26; heads += ell(x, y, 2.2, 7); }
      if (v !== 1) for (let i = 0; i < 9; i++) { const x = -W + 6 + r() * (2 * W - 12), y = -Hb - 14 - r() * 24; bl += ell(x, y, 3.2, 3.2); }
      g.push({ f: '@head.0', d: heads, op: 0.9 }, { f: '@bloom.0', d: bl });
      b.push(snow(ctx.season, rect(-W - 2, -Hb - 6, 2 * W + 4, 3)));
      return { body: b, blades: g };
    },
  });

  /* street.mqn-lifebuoy: a red lifebuoy housing on its post at the quay edge */
  SD.define({
    id: 'street.mqn-lifebuoy', category: 'street', size: [40, 120], variants: 1, seasonal: true, flippable: true,
    real: { h: 1.6, w: 0.6 },
    palette: { base: { box: ['#b42a22', '#d84a36', '#8a1e18'], buoy: ['#f0ece2', '#d83a2a'], post: ['#2e3236'] }, spring: {}, summer: {}, autumn: { box: ['#ac2a22', '#d04834', '#841e18'] }, winter: { box: ['#b42c26', '#d8503c', '#8a2018'], buoy: ['#f4f2ec', '#d83a2a'] } },
    parts: ['body'],
    tags: ['uk', 'quay', 'lifebuoy', 'kit:urban', 'kit:water', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester views: a quayside lifebuoy housing (no lettering)',
    build(v, r, ctx) {
      const b = [];
      b.push(['@post.0', rect(-3, -64, 6, 64)], ['@box.2', rect(-18, -118, 36, 56)], ['@box.0', rect(-16, -116, 32, 52)], ['@box.1', rect(-16, -116, 10, 52), 0.6]);
      b.push(['@buoy.0', ell(0, -90, 12, 12)], ['@box.0', ell(0, -90, 6, 6)]);
      b.push({ f: '@buoy.1', d: `M-12 -90h4v2h-4zM8 -90h4v2h-4zM-1 -102h2v4h-2zM-1 -82h2v4h-2z` });
      b.push(snow(ctx.season, rect(-19, -121, 38, 3)));
      return { body: b };
    },
  });

  /* street.mqn-bike-hoop: a Sheffield stand with a bike locked to it (v0 a town bike, v1 a road bike, v2 two bikes) */
  SD.define({
    id: 'street.mqn-bike-hoop', category: 'street', size: [140, 60], variants: 3, seasonal: true, flippable: true,
    real: { h: 1.05, w: 1.8 },
    palette: { base: { hoop: ['#2e3236', '#5a6066'], frame: ['#2a5a8a', '#b83a2e', '#2e6a44', '#e0b030'], tyre: ['#1e1e20'], metal: ['#9aa0a6'] }, spring: {}, summer: {}, autumn: { metal: ['#8e949a'] }, winter: { hoop: ['#343a3e', '#6a7076'], metal: ['#a8aeb4'] } },
    parts: ['body'],
    tags: ['uk', 'bicycle', 'cycle-stand', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester views: a Sheffield cycle stand with bikes',
    build(v, r, ctx) {
      const b = [];
      const bike = (x, col, road) => {
        const R = 16, y = -R, w1 = x - 30, w2 = x + 30;
        b.push({ s: '@tyre.0', w: 3.4, d: ell(w1, y, R, R) + ell(w2, y, R, R) });
        b.push({ s: '@metal.0', w: 0.7, op: 0.7, d: `M${w1 - R + 3} ${y}h${2 * R - 6}M${w1} ${y - R + 3}v${2 * R - 6}M${w2 - R + 3} ${y}h${2 * R - 6}M${w2} ${y - R + 3}v${2 * R - 6}` });
        b.push({ s: col, w: 3, d: `M${w1} ${y}L${x - 4} ${y - 2}L${x + 18} ${y - 26}L${x - 8} ${y - 26}L${w1} ${y}M${x - 4} ${y - 2}L${x - 10} ${y - 30}M${x + 18} ${y - 26}L${w2} ${y}` });
        b.push({ s: '@hoop.0', w: 2.6, d: `M${x - 14} ${y - 32}h12M${x + 16} ${y - 30}L${x + 20} ${y - 36}` + (road ? `q8 -2 6 6` : `h8`) });
        b.push({ s: '@metal.0', w: 2, d: `M${x - 4} ${y - 2}l6 4` });
      };
      b.push({ s: '@hoop.0', w: 4.5, d: 'M-34 0V-30Q-34 -42 -20 -42H20Q34 -42 34 -30V0' }, { s: '@hoop.1', w: 1.2, op: 0.6, d: 'M-35 -2V-30Q-35 -43 -21 -43' });
      bike(-6, ['@frame.0', '@frame.1', '@frame.2'][v], v === 1);
      if (v === 2) bike(14, '@frame.3', false);
      if (ctx.season === 'winter') b.push({ f: SNOW, d: 'M-22 -44H22Q34 -43 34 -38H-34Q-34 -43 -22 -44z', op: 0.8 });
      return { body: b };
    },
  });
})();

/* ---------- tree.mqn-street-tree: a young city street tree (plane or lime) in a pit: a mottled trunk, an open branch
   frame and many small leaf clusters at the twig ends (not a blob crown); bare twigs and seed balls in winter ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1;
  SD.define({
    id: 'tree.mqn-street-tree', category: 'tree', size: [280, 420], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 10, w: 6 },
    palette: {
      base: { bark: ['#6e6a5c', '#a49c84', '#c8c0a6', '#4e4a40'], leaf: ['#3e6a2e', '#5a8a3a', '#7aa84a', '#2e5224'], grate: ['#2e2e30'], ball: ['#6a5a3a'] },
      spring: { leaf: ['#5a8a34', '#7aac44', '#9ccc5e', '#467026'] },
      summer: { leaf: ['#3a6428', '#548436', '#72a046', '#2a4c20'] },
      autumn: { leaf: ['#a8762a', '#c8963a', '#e0b858', '#7a5622'] },
      winter: { leaf: ['#6e6a5c'] },
    },
    parts: ['trunk', 'crown'], anim: { sway: { part: 'crown', amp: 1.6, period: 5.2 } },
    tags: ['uk', 'tree', 'street-tree', 'plane', 'city', 'kit:urban', 'kit:temperate', 'role:tree', 'class:tree'],
    credit: 'drawn for the Manchester views: a young street tree in its pit',
    build(v, r, ctx) {
      const season = ctx.season, trunk = [], crown = [], H = 400, tH = 150 + v * 18;
      // the trunk: a slight taper and lean, plane-bark mottling, the grate at its foot
      const lean = (r() - 0.5) * 10;
      trunk.push({ f: '@bark.0', d: `M-9 0C-8 ${-tH * 0.4} ${-6 + lean * 0.5} ${-tH * 0.8} ${-4 + lean} ${-tH}L${4 + lean} ${-tH}C${6 + lean * 0.5} ${-tH * 0.8} 8 ${-tH * 0.4} 9 0z` });
      let mott = '';
      for (let i = 0; i < 16; i++) { const y = -10 - r() * (tH - 20), x = (r() - 0.5) * 10 + lean * (-y / tH); mott += SD.ell(x, y, 2 + r() * 3, 4 + r() * 6); }
      trunk.push({ f: '@bark.2', d: mott, op: 0.7, detail: true }, { f: '@bark.3', d: `M2 0C3 ${-tH * 0.4} ${2 + lean * 0.5} ${-tH * 0.8} ${2 + lean} ${-tH}L${4 + lean} ${-tH}C${6 + lean * 0.5} ${-tH * 0.8} 8 ${-tH * 0.4} 9 0z`, op: 0.45 });
      trunk.push({ f: '@grate.0', d: 'M-34 0h68v4h-68z' }, { s: '@grate.0', w: 1, op: 0.6, d: 'M-30 -1h60' });
      // the branch frame: main limbs from the top of the trunk, forking, thinner at each fork; an oval crown
      const tops = [], nodes = [], limbs = ['', '', '', ''];
      const grow = (x, y, a, len, k) => {
        const x2 = x + Math.sin(a) * len, y2 = y - Math.cos(a) * len;
        limbs[3 - k] += `M${f1(x)} ${f1(y)}Q${f1((x + x2) / 2 + (r() - 0.5) * len * 0.25)} ${f1((y + y2) / 2)} ${f1(x2)} ${f1(y2)}`;
        nodes.push([x2, y2, k]);
        if (k <= 0) { tops.push([x2, y2]); return; }
        const n = r() < 0.35 ? 3 : 2;
        for (let i = 0; i < n; i++) grow(x2, y2, a * 0.8 + (i - (n - 1) / 2) * (0.42 + r() * 0.3) + (r() - 0.5) * 0.3, len * (0.6 + r() * 0.18), k - 1);
      };
      const nl = 4 + (v % 2);
      for (let i = 0; i < nl; i++) grow(lean, -tH + i * 6, (i - (nl - 1) / 2) * 0.36 + (r() - 0.5) * 0.3, 62 + r() * 34, 3);
      [4.2, 3, 2, 1.2].forEach((w, i) => crown.push(Object.assign({ s: '@bark.0', w, d: limbs[i] }, i === 3 ? { detail: true } : null)));
      if (season === 'winter') {
        // bare: fine twigs off every tip and the hanging seed balls
        crown.push({ s: '@bark.0', w: 0.8, op: 0.7, detail: true, d: SD.twigs(r, tops.map(p => [p[0], p[1], (r() - 0.5) * 1.4, 14 + r() * 10]), 2, 0.5) });
        let balls = '';
        for (let i = 0; i < 14; i++) { const p = tops[Math.floor(r() * tops.length)]; balls += SD.circ(p[0] + (r() - 0.5) * 16, p[1] + 6 + r() * 10, 2.4); }
        crown.push({ f: '@ball.0', d: balls });
        return { trunk, crown };
      }
      // leaf clusters at every tip and the outer forks: small leaves in four tones, darker underneath and inside
      const tones = ['', '', '', ''];
      const cluster = (x, y, n, R) => {
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R, lx = x + Math.cos(a) * rr, ly = y + Math.sin(a) * rr * 0.8, L = 8 + r() * 7;
          const t = ly > y + R * 0.35 ? 3 : r() < 0.35 ? 0 : r() < 0.65 ? 1 : 2;
          tones[t] += SD.leaf(lx, ly, -Math.PI / 2 + (r() - 0.5) * 2.6, L, L * 0.45);
        }
      };
      for (const [x, y] of tops) cluster(x, y, 5 + Math.floor(r() * 3), 24);
      for (const [x, y, k] of nodes) if (k === 1) cluster(x, y, 4, 20);
      crown.push({ f: '@leaf.3', d: tones[3] }, { f: '@leaf.0', d: tones[0], detail: true }, { f: '@leaf.1', d: tones[1], detail: true }, { f: '@leaf.2', d: tones[2], detail: true });
      if (season === 'autumn') { let fallen = ''; for (let i = 0; i < 10; i++) fallen += SD.leaf(-30 + r() * 60, -2 + r() * 3, (r() - 0.5) * 3, 6, 2.6); crown.push({ f: '@leaf.2', d: fallen }); }
      return { trunk, crown };
    },
  });
})();

/* ---------- plant.mqn-buddleia: the buddleia that grows out of every canal wall and towpath edge in Manchester: arching stems,
   long grey-green leaves, purple flower spikes in summer, brown spent spikes in autumn and winter ---------- */
(function () {
  if (typeof sceneObjDefine !== 'function' || typeof sceneDraw === 'undefined') return;
  const SD = sceneDraw, f1 = SD.f1;
  SD.define({
    id: 'plant.mqn-buddleia', category: 'plant', size: [200, 170], variants: 3, seasonal: true, shapeBySeason: true, flippable: true,
    real: { h: 2.4, w: 2.8 },
    palette: {
      base: { stem: ['#5a5a48'], leaf: ['#5e7a4e', '#7a9466', '#4a6240'], bloom: ['#8a5aa8', '#a676c4', '#6e4290'] },
      spring: { leaf: ['#6a8a50', '#88a86a', '#52703e'], bloom: ['#6a8a50', '#88a86a', '#52703e'] },
      autumn: { leaf: ['#6a7a4e', '#86905e', '#56603e'], bloom: ['#7a5a3a', '#8e6a44', '#5e4630'] },
      winter: { leaf: ['#5a5e4a', '#6e7058', '#4a4c3c'], bloom: ['#6a5038', '#7a5e42', '#584430'] },
    },
    parts: ['stems', 'spikes'], anim: { sway: { part: 'spikes', amp: 2.4, period: 4.2 } },
    tags: ['uk', 'buddleia', 'canal', 'wall-plant', 'kit:urban', 'kit:water', 'kit:temperate', 'role:ground', 'class:shrub'],
    credit: 'drawn for the Manchester views: canal-side buddleia',
    build(v, r, ctx) {
      const season = ctx.season, stems = [], spikes = [];
      let st = '', lv = ['', '', ''], sp = ['', '', ''];
      const n = 9 + v * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * 2.0 + (r() - 0.5) * 0.3, L = 90 + r() * 70, x2 = Math.sin(a) * L, y2 = -Math.cos(a) * L * 0.85, cx = x2 * 0.4, cy = y2 * 1.15;
        st += `M0 0Q${f1(cx)} ${f1(cy)} ${f1(x2)} ${f1(y2)}`;
        // leaves in pairs down the stem
        for (let k = 0.3; k < 0.97; k += 0.2) {
          const t = k, x = 2 * (1 - t) * t * cx + t * t * x2, y = 2 * (1 - t) * t * cy + t * t * y2, ll = 20 + r() * 10;
          if (season === 'winter' && r() < 0.5) continue;
          lv[Math.floor(r() * 3)] += SD.leaf(x, y, Math.atan2(y2 - cy, x2 - cx) + 1.2, ll, ll * 0.26) + SD.leaf(x, y, Math.atan2(y2 - cy, x2 - cx) - 1.2 + Math.PI, ll, ll * 0.26);
        }
        // the flower spike at the tip, nodding outward
        if (season !== 'spring' || r() < 0.2) sp[Math.floor(r() * 3)] += SD.leaf(x2, y2, Math.atan2(y2 - cy, x2 - cx) + (Math.sign(x2) || 1) * 0.5, 34 + r() * 16, 10);
      }
      stems.push({ s: '@stem.0', w: 2.2, d: st });
      stems.push({ f: '@leaf.2', d: lv[2] }, { f: '@leaf.0', d: lv[0] }, { f: '@leaf.1', d: lv[1] });
      spikes.push({ f: '@bloom.2', d: sp[2] }, { f: '@bloom.0', d: sp[0] }, { f: '@bloom.1', d: sp[1] });
      if (season === 'summer') spikes.push({ f: '#e8a040', d: SD.circ(30 * (v - 1), -110, 3) + SD.circ(-20, -90, 2.6), op: 0.9 });
      return { stems, spikes };
    },
  });
  const rect = SD.rect, snow = (season, d) => (season === 'winter' ? { f: '#f2f4f6', d, op: 0.9 } : null);
  /* street.mqn-bin: a city litter bin (black body, grey band, a domed lid with its slot) */
  SD.define({
    id: 'street.mqn-bin', category: 'street', size: [50, 80], variants: 2, seasonal: true, flippable: true,
    real: { h: 1.0, w: 0.55 },
    palette: { base: { body: ['#23272b', '#3a4046', '#15181b'], band: ['#8c949a', '#5e666c'] }, spring: {}, summer: {}, autumn: {}, winter: { band: ['#9aa2a8', '#6a7278'] } },
    parts: ['body'],
    tags: ['uk', 'litter bin', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester views: a city litter bin (no lettering)',
    build(v, r, ctx) {
      const b = [], W = 19;
      b.push(['@body.0', `M${-W} 0L${-W + 2} -62L${W - 2} -62L${W} 0Z`], ['@body.1', `M${-W + 3} -2L${-W + 4} -60L${-W + 10} -60L${-W + 9} -2Z`, 0.7]);
      b.push(['@band.0', rect(-W + 1, -48, 2 * W - 2, v ? 5 : 7)], ['@band.1', rect(W - 8, -48, 7, v ? 5 : 7), 0.6]);
      b.push(['@body.2', `M${-W - 1} -62Q0 -78 ${W + 1} -62Z`], ['#0a0b0c', rect(-9, -66, 18, 3)]);
      b.push({ s: '@body.2', w: 1, op: 0.5, d: `M${-W + 1} -14h${2 * W - 2}` });
      b.push(snow(ctx.season, `M${-W} -63Q0 -79 ${W} -63L${W} -61Q0 -75 ${-W} -61Z`));
      return { body: b };
    },
  });

  /* street.mqn-aboard: a cafe A-board on the pavement (chalk scribbles, no lettering) */
  SD.define({
    id: 'street.mqn-aboard', category: 'street', size: [56, 76], variants: 2, seasonal: true, flippable: true,
    real: { h: 0.95, w: 0.6 },
    palette: { base: { frame: ['#6e5236', '#2e3236'], board: ['#1f2a26', '#2a2a2e'], chalk: ['#e8e4d8', '#e0b84a', '#8ac0d8'] }, spring: {}, summer: {}, autumn: {}, winter: {} },
    parts: ['body'],
    tags: ['uk', 'a-board', 'cafe', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester views: a chalkboard A-board (abstract chalk marks, no lettering)',
    build(v, r, ctx) {
      const b = [], fr = v ? '@frame.1' : '@frame.0';
      b.push([fr, 'M-22 0L-15 -72L15 -72L22 0L18 0L12 -66L-12 -66L-18 0Z'], ['@board.' + v, 'M-17 -4L-12 -66L12 -66L17 -4Z']);
      let c0 = '', c1 = '', c2 = '';
      for (let y = -58; y < -10; y += 7) { const w = 8 + r() * 12, x = -w / 2 + (r() - 0.5) * 4, k = r(); const d = `M${f1(x)} ${y}h${f1(w)}v1.4h${f1(-w)}z`; if (k < 0.55) c0 += d; else if (k < 0.8) c1 += d; else c2 += d; }
      b.push({ f: '@chalk.0', d: c0, op: 0.85 }, { f: '@chalk.1', d: c1, op: 0.85 }, { f: '@chalk.2', d: c2, op: 0.85 });
      b.push(snow(ctx.season, rect(-15, -74, 30, 2)));
      return { body: b };
    },
  });

  /* street.mqn-totem: a wayfinding totem (dark grey slab, a coloured map panel, no lettering) */
  SD.define({
    id: 'street.mqn-totem', category: 'street', size: [40, 180], variants: 2, seasonal: true, flippable: true,
    real: { h: 2.4, w: 0.5 },
    palette: { base: { body: ['#2e3438', '#454c52', '#1e2226'], panel: ['#d8dcd8', '#c8b048', '#4a8aa8', '#c46e3a'] }, spring: {}, summer: {}, autumn: {}, winter: {} },
    parts: ['body'],
    tags: ['uk', 'wayfinding', 'sign', 'kit:urban', 'role:street', 'class:street'],
    credit: 'drawn for the Manchester views: a city wayfinding totem (no lettering)',
    build(v, r, ctx) {
      const b = [];
      b.push(['@body.0', rect(-16, -176, 32, 176)], ['@body.1', rect(-16, -176, 7, 176), 0.8], ['@body.2', rect(-17, -178, 34, 4)]);
      b.push(['@panel.0', rect(-12, -150, 24, 64)], ['@panel.' + (v ? 3 : 2), rect(-12, -162, 24, 9)]);
      let m = ''; for (let i = 0; i < 6; i++) m += `M${f1(-10 + r() * 14)} ${f1(-146 + i * 10)}h${f1(4 + r() * 6)}v1.6h${f1(-4 - r() * 6)}z`;
      b.push({ f: '@body.1', d: m, op: 0.6 }, { f: '@panel.1', d: rect(-12, -80, 24, 3) });
      b.push(snow(ctx.season, rect(-17, -180, 34, 3)));
      return { body: b };
    },
  });
})();
