/* ============================================================
   SCENE ENGINE v2: CAMERA PRESETS AND THE COMPOSITION MEASURES
   (docs/dev/SCENE_ENGINE_V2.md 20.1 and 20.2; builder G).
   PURE: functions and consts only, no DOM, nothing expensive at load. Loaded after 70-scene-0core.js
   (it calls nothing at load). Every other engine function is called LAZILY, behind a typeof guard.
   Top-level names: SCENE_CAMERA_PRESETS, sceneCameraPreset, sceneCompositionOf, sceneCompositionSetups;
   private helpers live in the _sccm IIFE.

   SCENE_CAMERA_PRESETS          the 8 presets: eye (m), fov (deg), horizon (row) and the composition targets each one wants
                                 (sky, subject: share ranges; lines: wants a leading line; framing + frame; water: the water's share)
   sceneCameraPreset(id, { heading, lat, lon, alt, eye, fov, horizon })
                                 -> a camera (V2 2.1) filled from the preset; explicit numbers win; unknown id -> null
   sceneCompositionOf(C, { data, obj, shapes })
                                 -> the composition MEASURES of a compiled scene (v1 or v2), judged by G's lint
                                    (tools/lib/scene-composition.mjs) and drawn as overlays by the editor (H):
      { v: 1, w, h, horizon, eye, fov, f, heading, headingClass, horizonBucket, preset,
        skyShare,                                    share of the frame where open sky shows (above the land and everything standing on it)
        waterShare,                                  share of the frame that is water
        subject: { i, o, box: [x0, y0, x1, y1], cx, cy, xFrac, size, thirdsDist, third, central, symmetric, src } | null,
        lines: [{ id, kind, vp: [X, Y], from: [X, Y], len, src }],   leading lines: strips running into the picture and where they converge
        leading: { n, best, dist, ok },             the best line's distance (fraction of width) from the subject or its third line
        framing: { left, right, cover, sides },      'front'-band cover of the left and right edges (fractions of the width)
        grid: { cols: 16, rows: 9, groups: { sky, water, hard, soft, building, tree, life } },   coverage fractions per cell
        kinds: { <surface kind>: share },           share of the frame per surface kind (v2) or per inferred ground class (v1)
        counts: { items, salient, front } }
   C is the compiled scene (V2 12 for v2: C.cam, C.surfaces; v1 4: the camera is inferred from view.horizon / view.fov with
   the depth ladder, eye = 1.72 * (900 - horizon) / 132, as the sanity lint does (V2 15.1)).
   o.data (the scene data) lets the leading lines come from the declared strip and water centrelines (exact);
   o.obj / o.shapes default to the core's sceneObj / sceneObjShapes (object boxes for the coverage and the subject).
   ============================================================ */
const SCENE_CAMERA_PRESETS = Object.freeze({
  street:          Object.freeze({ id: 'street', eye: 1.65, fov: 64, horizon: 470, label: 'street level', sky: [0.22, 0.45], subject: [0.18, 0.45], vp: [0.38, 0.62], lines: true, framing: 'one', frame: [0.08, 0.25], subjectD: [40, 400], words: ['street', 'square', 'high street', 'market', 'road'] }),
  raised:          Object.freeze({ id: 'raised', eye: 7, fov: 68, horizon: 400, label: 'raised (a first-floor window, a bridge)', sky: [0.22, 0.45], subject: [0.18, 0.45], diagonal: true, lines: true, subjectD: [60, 500], words: ['from above', 'from the bridge', 'from a window', 'raised', 'overlooking'] }),
  'across-water':  Object.freeze({ id: 'across-water', eye: 1.7, fov: 66, horizon: 440, label: 'across water', sky: [0.22, 0.45], subject: [0.18, 0.45], water: [0.18, 0.32], farBank: [30, 250], mirror: true, subjectD: [60, 600], words: ['across the river', 'across the lake', 'across the water', 'across the canal', 'across the pond', 'across the harbour', 'across the basin', 'over the water'] }),
  'from-hill':     Object.freeze({ id: 'from-hill', eye: 1.7, fov: 72, horizon: 330, label: 'from a hill', sky: [0.30, 0.50], aim: { sky: [0.35, 0.45] }, subject: [0.10, 0.45], ridges: 3, aboveTerrain: true, subjectD: [300, 5000], words: ['from the hill', 'from a hill', 'from the edge', 'from the moor', 'from the down', 'from the tor', 'over the town', 'over the valley', 'view over'] }),
  'down-street':   Object.freeze({ id: 'down-street', eye: 1.6, fov: 58, horizon: 480, label: 'down a street or canal', sky: [0.22, 0.45], subject: [0.18, 0.45], vp: [0.30, 0.70], offCentre: true, axis: true, lines: true, subjectD: [50, 500], words: ['down the street', 'down the canal', 'along the canal', 'along the street', 'down the road', 'along the towpath', 'down the lane', 'along the river'] }),
  'through-arch':  Object.freeze({ id: 'through-arch', eye: 1.6, fov: 54, horizon: 470, label: 'through an arch or trees', sky: [0.22, 0.45], subject: [0.18, 0.45], framing: 'both', frame: [0.25, 0.40], subjectD: [40, 300], words: ['through the arch', 'through the gate', 'through the trees', 'framed by', 'under the arch'] }),
  'close-up':      Object.freeze({ id: 'close-up', eye: 1.5, fov: 42, horizon: 500, label: 'close-up', sky: [0.10, 0.35], subject: [0.35, 0.60], aim: { subject: [0.35, 0.55] }, subjectD: [8, 15], shallow: true, words: ['close up', 'close-up', 'detail', 'at the door', 'up close'] }),
  panorama:        Object.freeze({ id: 'panorama', eye: 2.2, fov: 96, horizon: 500, label: 'panorama', sky: [0.30, 0.50], aim: { sky: [0.30, 0.40] }, subject: [0.10, 0.45], wide: true, subjectD: [200, 5000], words: ['panorama', 'panoramic', 'wide view', 'skyline', 'the whole'] }),
});

/** A camera (V2 2.1) from a preset. Explicit eye / fov / horizon / heading / lat / lon / alt win over the preset's numbers. */
function sceneCameraPreset(id, o) {
  const P = SCENE_CAMERA_PRESETS[id];
  if (!P) return null;
  o = o || {};
  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);
  const cam = { eye: num(o.eye, P.eye), fov: num(o.fov, P.fov), horizon: Math.round(num(o.horizon, P.horizon)), heading: ((num(o.heading, 180) % 360) + 360) % 360 };
  if (typeof o.x0 === 'number' && isFinite(o.x0)) cam.x0 = o.x0;
  if (typeof o.lat === 'number' && isFinite(o.lat)) cam.lat = o.lat;
  if (typeof o.lon === 'number' && isFinite(o.lon)) cam.lon = o.lon;
  if (typeof o.alt === 'number' && isFinite(o.alt)) cam.alt = o.alt;
  if (typeof o.water === 'number' && isFinite(o.water)) cam.water = o.water;
  cam.preset = P.id;
  return cam;
}

/** The setups the editor's camera panel and the composer list: [{ id, label, eye, fov, horizon }]. */
function sceneCompositionSetups() {
  return Object.keys(SCENE_CAMERA_PRESETS).map(k => { const P = SCENE_CAMERA_PRESETS[k]; return { id: P.id, label: P.label, eye: P.eye, fov: P.fov, horizon: P.horizon }; });
}

const _sccm = (function () {
  const W = 1600, H = 900, GC = 64, GR = 36, CW = W / GC, CH = H / GR;   // the coverage raster: 64 x 36 cells of 25 x 25 units
  const GROUPS = ['sky', 'water', 'hard', 'soft', 'building', 'tree', 'life'];
  const G_SKY = 0, G_WATER = 1, G_HARD = 2, G_SOFT = 3, G_BUILDING = 4, G_TREE = 5, G_LIFE = 6, G_NONE = -1;
  const HARD_KINDS = { road: 1, parking: 1, driveway: 1, pavement: 1, plaza: 1, platform: 1, cycleway: 1, steps: 1, bridge: 1, rail: 1, tramway: 1, rock: 1, edge: 1, rooftop: 1 };
  const WATER_KINDS = { water: 1, river: 1, canal: 1, lake: 1, pond: 1, sea: 1, harbour: 1, basin: 1, stream: 1, reservoir: 1, dock: 1 };
  const LINE_KINDS = { road: 1, towpath: 1, rail: 1, tramway: 1, path: 1, cycleway: 1, pavement: 1, track: 1, canal: 1, river: 1, stream: 1, platform: 1 };
  const CAT_GROUP = { building: G_BUILDING, structure: G_BUILDING, landmark: G_BUILDING, rail: G_BUILDING, tree: G_TREE, plant: G_SOFT, ground: G_SOFT, rock: G_SOFT, water: G_WATER,
    person: G_LIFE, vehicle: G_LIFE, boat: G_LIFE, animal: G_LIFE, street: G_HARD, prop: G_HARD, bird: G_NONE, sky: G_NONE };
  const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const r3 = (v) => Math.round(v * 1000) / 1000;

  /* ---- SVG path data -> polygons (subpaths), flattened: M L H V C S Q T A Z, absolute and relative ---- */
  function pathPolys(d, m) {
    const polys = [];
    if (typeof d !== 'string' || !d) return polys;
    const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    let i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = 0, cy = 0, cur = null, prev = '';
    const num = () => parseFloat(tok[i++]);
    const put = (px, py) => { cur.push(m ? [m[0] * px + m[2] * py + m[4], m[1] * px + m[3] * py + m[5]] : [px, py]); };
    const start = () => { if (cur && cur.length > 2) polys.push(cur); cur = []; };
    start();
    while (i < tok.length) {
      if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
      if (!cmd) break;
      const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
      const bx = rel ? x : 0, by = rel ? y : 0;
      if (C === 'Z') { x = sx; y = sy; start(); prev = 'Z'; continue; }
      if (i >= tok.length || /[a-zA-Z]/.test(tok[i])) { prev = C; continue; }
      if (C === 'M') { start(); x = bx + num(); y = by + num(); sx = x; sy = y; put(x, y); cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') { x = bx + num(); y = by + num(); put(x, y); }
      else if (C === 'H') { x = bx + num(); put(x, y); }
      else if (C === 'V') { y = (rel ? y : 0) + num(); put(x, y); }
      else if (C === 'C' || C === 'S' || C === 'Q' || C === 'T') {
        let x1, y1, x2, y2;
        if (C === 'C') { x1 = bx + num(); y1 = by + num(); x2 = bx + num(); y2 = by + num(); }
        else if (C === 'S') { x1 = /[CS]/.test(prev) ? 2 * x - cx : x; y1 = /[CS]/.test(prev) ? 2 * y - cy : y; x2 = bx + num(); y2 = by + num(); }
        else if (C === 'Q') { x1 = bx + num(); y1 = by + num(); x2 = x1; y2 = y1; }
        else { x1 = /[QT]/.test(prev) ? 2 * x - cx : x; y1 = /[QT]/.test(prev) ? 2 * y - cy : y; x2 = x1; y2 = y1; }
        const ex = bx + num(), ey = by + num();
        for (let k = 1; k <= 6; k++) {
          const t = k / 6, u = 1 - t;
          if (C === 'C' || C === 'S') put(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * ex, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ey);
          else put(u * u * x + 2 * u * t * x1 + t * t * ex, u * u * y + 2 * u * t * y1 + t * t * ey);
        }
        cx = (C === 'Q' || C === 'T') ? x1 : x2; cy = (C === 'Q' || C === 'T') ? y1 : y2; x = ex; y = ey;
      } else if (C === 'A') { num(); num(); num(); num(); num(); x = bx + num(); y = by + num(); put(x, y); }
      else { i++; }
      prev = C;
    }
    if (cur && cur.length > 2) polys.push(cur);
    return polys;
  }
  /** Even-odd fill of polygons onto the raster (cell centres), calling put(index). */
  function fillPolys(polys, put) {
    for (let r = 0; r < GR; r++) {
      const yc = (r + 0.5) * CH, xs = [];
      for (const P of polys) for (let a = 0, b = P.length - 1; a < P.length; b = a++) {
        const [x1, y1] = P[a], [x2, y2] = P[b];
        if ((y1 > yc) !== (y2 > yc)) xs.push(x1 + (yc - y1) * (x2 - x1) / (y2 - y1));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const c0 = Math.max(0, Math.ceil(xs[k] / CW - 0.5)), c1 = Math.min(GC - 1, Math.floor(xs[k + 1] / CW - 0.5));
        for (let c = c0; c <= c1; c++) put(r * GC + c);
      }
    }
  }
  function fillBox(b, put, fx) {
    const c0 = Math.max(0, Math.ceil(b[0] / CW - 0.5)), c1 = Math.min(GC - 1, Math.floor(b[2] / CW - 0.5));
    const r0 = Math.max(0, Math.ceil(b[1] / CH - 0.5)), r1 = Math.min(GR - 1, Math.floor(b[3] / CH - 0.5));
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (!fx || fx(c, r)) put(r * GC + c);
  }
  /** A paint's first colour -> hard (grey: low saturation) or soft ground. */
  function paintGroup(p) {
    let hex = typeof p === 'string' ? p : p && (p.lin || p.rad) ? (p.lin || p.rad)[0][1] : null;
    if (typeof hex !== 'string' || hex[0] !== '#') return G_SOFT;
    const n = parseInt(hex.slice(1, 7), 16), R = (n >> 16) & 255, G = (n >> 8) & 255, B = n & 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    const sat = mx ? (mx - mn) / mx : 0;
    if (B > G + 8 && B > R + 14 && sat > 0.18) return G_WATER;
    return sat < 0.14 ? G_HARD : G_SOFT;
  }
  /** The camera of a compiled scene: C.cam (v2), else inferred from the view (v1, the depth ladder of V2 15.1). */
  function camOf(C) {
    const v = C.view || {};
    if (C.cam && isFinite(C.cam.horizon)) {
      const fov = C.cam.fov || 66, f = C.cam.f || 800 / Math.tan(fov * Math.PI / 360);
      return { horizon: C.cam.horizon, eye: C.cam.eye || 1.65, fov, f, x0: C.cam.x0 != null ? C.cam.x0 : 800, heading: C.cam.heading != null ? C.cam.heading : (v.heading || 0), preset: C.cam.preset || null, src: 'cam' };
    }
    const horizon = isFinite(v.horizon) ? v.horizon : 520, fov = isFinite(v.fov) ? v.fov : 66, f = 800 / Math.tan(fov * Math.PI / 360);
    return { horizon, eye: 1.72 * (H - horizon) / 132, fov, f, x0: 800, heading: v.heading || 0, preset: null, src: 'view' };
  }
  /** An item's screen box [x0, y0, x1, y1] from its object's box at its scale (flip mirrored). */
  function boxOf(it, o, season) {
    let b = null, def = null;
    // a projected building (V2 19.1) is drawn as fills with its own screen box
    if (it.direct && Array.isArray(it.direct.box)) {
      try { def = o.obj ? o.obj(it.o) : null; } catch (e) { def = null; }
      return { box: it.direct.box.slice(0, 4), def: def || { category: 'building', tags: ['class:building'] } };
    }
    try { def = o.obj ? o.obj(it.o) : null; } catch (e) { def = null; }
    try { const R = o.shapes ? o.shapes(it.o, it.v || 0, it.season || season) : null; if (R && R.box) b = R.box; } catch (e) { b = null; }
    if (!b && def && def.box) b = def.box;
    if (!b && def && def.size) b = [-def.size[0] / 2, -def.size[1], def.size[0] / 2, 0];
    if (!b) b = [-40, -100, 40, 0];
    const s = it.s || 1, x0 = it.flip ? -b[2] : b[0], x1 = it.flip ? -b[0] : b[2];
    return { box: [it.x + x0 * s, it.y + b[1] * s, it.x + x1 * s, it.y + b[3] * s], def };
  }
  const tagsOf = (def) => (def && def.tags) || [];
  /** Project a ground point (x right, d forward, metres) with the camera. */
  const proj = (cam, x, d) => [cam.x0 + cam.f * x / d, cam.horizon + cam.f * cam.eye / d];

  /** Leading lines from declared centrelines (v2 data): the far-most segment in view gives the vanishing point. */
  function linesFromData(cam, data) {
    const out = [];
    const take = (id, kind, path, src) => {
      if (!Array.isArray(path) || path.length < 2) return;
      const pts = path.filter(p => Array.isArray(p) && p[1] > 0.5);
      if (pts.length < 2) return;
      // the segment that carries the line into the distance: the last one, from the second-last to the last point
      const a = pts[pts.length - 2], b = pts[pts.length - 1];
      const dd = b[1] - a[1], dx = b[0] - a[0];
      const near = proj(cam, pts[0][0], pts[0][1]), far = proj(cam, b[0], b[1]);
      const len = Math.hypot(far[0] - near[0], far[1] - near[1]);
      let vp;
      if (Math.abs(dd) > 1e-6 && dd > 0) vp = [cam.x0 + cam.f * dx / dd, cam.horizon];
      else vp = far;   // runs across or toward the camera: its far end is where the eye goes
      out.push({ id, kind, vp: [Math.round(vp[0]), Math.round(vp[1])], from: [Math.round(near[0]), Math.round(near[1])], len: Math.round(len), src, across: !(dd > 0) || Math.abs(dx) > 4 * Math.abs(dd) });
    };
    for (const s of data.surfaces || []) if (s && LINE_KINDS[s.kind] && Array.isArray(s.path)) take(s.id, s.kind, s.path, 'surface');
    for (const w of data.water || []) if (w && Array.isArray(w.path)) take(w.id, w.kind || 'water', w.path, 'water');
    for (const f of data.flows || []) if (f && Array.isArray(f.lanes)) for (const l of f.lanes) if (l && l.path) take(f.id, f.kind, l.path, 'flow');
    return out;
  }
  /** Leading lines from compiled v2 surfaces (polyM: the principal axis of the polygon). */
  function linesFromSurfaces(cam, C) {
    const out = [];
    const regions = (C.surfaces || []).concat((C.water || []).filter(w => w && w.v2 && Array.isArray(w.v2.polyM)).map(w => ({ id: w.v2.id, kind: w.v2.kind, polyM: w.v2.polyM })));
    for (const s of regions) {
      if (!s || !LINE_KINDS[s.kind] || !Array.isArray(s.polyM) || s.polyM.length < 3) continue;
      const pts = s.polyM.filter(p => p[1] > 0.5);
      if (pts.length < 3) continue;
      let dn = Infinity, df = -Infinity;
      for (const p of pts) { dn = Math.min(dn, p[1]); df = Math.max(df, p[1]); }
      const midAt = (d0, d1) => { const q = pts.filter(p => p[1] >= d0 && p[1] <= d1); if (!q.length) return null; return [q.reduce((n, p) => n + p[0], 0) / q.length, q.reduce((n, p) => n + p[1], 0) / q.length]; };
      const span = df - dn; if (span < 4) continue;
      const a = midAt(df - span * 0.4, df - span * 0.2) || midAt(dn, dn + span * 0.5), b = midAt(df - span * 0.2, df);
      const n0 = midAt(dn, dn + span * 0.2);
      if (!a || !b || !n0) continue;
      const dd = b[1] - a[1], dx = b[0] - a[0];
      const near = proj(cam, n0[0], n0[1]), far = proj(cam, b[0], b[1]);
      const vp = dd > 1e-6 ? [cam.x0 + cam.f * dx / dd, cam.horizon] : far;
      out.push({ id: s.id, kind: s.kind, vp: [Math.round(vp[0]), Math.round(vp[1])], from: [Math.round(near[0]), Math.round(near[1])], len: Math.round(Math.hypot(far[0] - near[0], far[1] - near[1])), src: 'polyM', across: !(dd > 0) || Math.abs(dx) > 4 * Math.abs(dd) });
    }
    return out;
  }
  /** Leading lines of a v1 scene: ground or water shapes that narrow toward the horizon (a road or a canal drawn in perspective). */
  function linesFromShapes(cam, C) {
    const out = [];
    const look = (d, id, kind) => {
      for (const P of pathPolys(d)) {
        let y0 = Infinity, y1 = -Infinity;
        for (const p of P) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
        if (y0 < cam.horizon - 80 || y1 - y0 < (H - cam.horizon) * 0.25) continue;
        const span = (yy) => { const xs = []; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const [xa, ya] = P[a], [xb, yb] = P[b]; if ((ya > yy) !== (yb > yy)) xs.push(xa + (yy - ya) * (xb - xa) / (yb - ya)); } if (xs.length < 2) return null; return [Math.min(...xs), Math.max(...xs)]; };
        const top = span(y0 + (y1 - y0) * 0.1), bot = span(y0 + (y1 - y0) * 0.9);
        if (!top || !bot) continue;
        const wt = top[1] - top[0], wb = bot[1] - bot[0];
        if (wb < 60 || wt > wb * 0.5 || wb > W * 1.3) continue;
        const ct = (top[0] + top[1]) / 2, cb = (bot[0] + bot[1]) / 2;
        const yt = y0 + (y1 - y0) * 0.1, yb = y0 + (y1 - y0) * 0.9;
        // extend the centreline to the horizon row: its vanishing point
        const vx = Math.abs(yb - yt) > 1 ? cb + (ct - cb) * (yb - cam.horizon) / (yb - yt) : ct;
        out.push({ id, kind, vp: [Math.round(vx), cam.horizon], from: [Math.round(cb), Math.round(yb)], len: Math.round(Math.hypot(ct - cb, yb - yt)), src: 'shape', across: false });
      }
    };
    (C.ground || []).forEach((g, i) => look(g.d, 'ground-' + i, 'ground'));
    (C.water || []).forEach((w, i) => look(w.d, 'water-' + i, 'water'));
    return out;
  }

  function measure(C, o) {
    o = o || {};
    const data = o.data || null;
    const cam = camOf(C);
    const layers = C.layers || [];
    const layerId = (i) => (layers[i] && layers[i].id) || '';
    const season = C.season || 'summer';
    const grid = new Int8Array(GC * GR), framed = new Uint8Array(GC * GR);
    for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) grid[r * GC + c] = (r + 0.5) * CH < cam.horizon ? G_SKY : G_SOFT;
    // the kinds of the v2 surfaces, by C.ground index
    const kindOfGround = new Map(), kindCells = {};
    for (const s of C.surfaces || []) for (const gi of s.groundIdx || []) kindOfGround.set(gi, s.kind);
    // paint in layer order: ground, water, then the items of that layer (C.items is sorted by layer, then z)
    const byLayer = new Map();
    const add = (L, fn) => { if (!byLayer.has(L)) byLayer.set(L, []); byLayer.get(L).push(fn); };
    const kindAt = new Array(GC * GR).fill(null);
    (C.ground || []).forEach((g, gi) => add(g.layer | 0, () => {
      const kind = kindOfGround.get(gi) || g.kind || null;
      const grp = kind ? (WATER_KINDS[kind] ? G_WATER : HARD_KINDS[kind] ? G_HARD : G_SOFT) : paintGroup(g.fill);
      fillPolys(pathPolys(g.d), (k) => { grid[k] = grp; kindAt[k] = kind || (grp === G_HARD ? 'hard' : grp === G_WATER ? 'water' : 'soft'); });
    }));
    (C.water || []).forEach((w) => add(w.layer | 0, () => fillPolys(pathPolys(w.d), (k) => { grid[k] = G_WATER; kindAt[k] = (w.v2 && w.v2.kind) || 'water'; })));
    const items = C.items || [];
    const boxes = [];
    let salient = 0;
    items.forEach((it, i) => {
      const { box, def } = boxOf(it, o, season);
      const cat = def ? def.category : String(it.o).split('.')[0];
      const tags = tagsOf(def);
      const grp = tags.indexOf('class:building') >= 0 ? G_BUILDING : CAT_GROUP[cat] != null ? CAT_GROUP[cat] : G_SOFT;
      const h = box[3] - box[1];
      if (h >= 40 && cat !== 'plant' && cat !== 'ground' && cat !== 'bird' && cat !== 'sky') salient++;
      boxes.push({ i, box, def, cat, tags, layer: layerId(it.layer), grp });
      // flat ground decals (leaf litter, sand patches, puddles: category ground) lie ON a surface: they do not cover it
      if (grp === G_NONE || it.pin && cat === 'sky' || cat === 'ground') return;
      add(it.layer | 0, () => {
        // a tree's crown is narrower at the foot (trunk): keep the lower 30 % to the middle third of the box
        const fx = grp === G_TREE ? (c, r) => { const yc = (r + 0.5) * CH, xc = (c + 0.5) * CW, foot = box[1] + (box[3] - box[1]) * 0.7; if (yc < foot) return true; const mid = (box[0] + box[2]) / 2, half = (box[2] - box[0]) / 6; return Math.abs(xc - mid) <= half; } : null;
        // a 'front' frame (an arch, a framing tree) does not take sky away: the sky share is measured behind the frame
        const front = layerId(it.layer) === 'front';
        fillBox(box, (k) => { if (front && grid[k] === G_SKY) framed[k] = 1; grid[k] = grp; if (grp === G_HARD || grp === G_SOFT) kindAt[k] = kindAt[k] || null; }, fx);
      });
    });
    // flows (v2): the lanes' agents count as life along the lanes (a light trace: one cell per 40 units of lane)
    for (const f of C.flows || []) for (const l of f.lanes || []) {
      const P = (l.path || []).filter(p => p[1] > 0.5);
      for (let k = 1; k < P.length; k++) {
        const a = proj(cam, P[k - 1][0], P[k - 1][1]), b = proj(cam, P[k][0], P[k][1]);
        const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 80));
        for (let j = 0; j <= n; j++) { const x = a[0] + (b[0] - a[0]) * j / n, y = a[1] + (b[1] - a[1]) * j / n; const c = Math.floor(x / CW), r = Math.floor((y - 10) / CH); if (c >= 0 && c < GC && r >= 0 && r < GR) grid[r * GC + c] = G_LIFE; }
      }
    }
    const order = [...byLayer.keys()].sort((p, q) => p - q);
    for (const L of order) for (const fn of byLayer.get(L)) fn();
    for (const a of C.actors || []) { const p = a.path && a.path[0]; if (!p) continue; const c = Math.floor(p[0] / CW), r = Math.floor((p[1] - 20) / CH); if (c >= 0 && c < GC && r >= 0 && r < GR) grid[r * GC + c] = G_LIFE; }

    // shares
    let sky = 0, water = 0;
    for (let k = 0; k < grid.length; k++) { if (grid[k] === G_SKY || framed[k]) sky++; else if (grid[k] === G_WATER) water++; }
    const N = GC * GR;
    for (let k = 0; k < N; k++) if (kindAt[k] && grid[k] !== G_SKY) kindCells[kindAt[k]] = (kindCells[kindAt[k]] || 0) + 1;
    const kinds = {};
    for (const k of Object.keys(kindCells).sort()) kinds[k] = r3(kindCells[k] / N);
    // the 16 x 9 coverage grid per group
    const groups = {};
    for (const g of GROUPS) groups[g] = new Array(144).fill(0);
    for (let r = 0; r < GR; r++) for (let c = 0; c < GC; c++) { const g = grid[r * GC + c]; if (g >= 0) groups[GROUPS[g]][Math.floor(r / 4) * 16 + Math.floor(c / 4)] += 1 / 16; }
    for (const g of GROUPS) groups[g] = groups[g].map(r3);

    // the subject: a landmark or a signature (the biggest on screen), else null
    let subject = null;
    const clip = (b) => [Math.max(0, b[0]), Math.max(0, b[1]), Math.min(W, b[2]), Math.min(H, b[3])];
    const area = (b) => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
    // the author's subject (data): a building or a placement marked `subject: true`, found in the compiled items (a projected building by
    // its seed and style; a placement by its object and ground point)
    const subjIdx = new Set();
    if (data) {
      // (matched on the direct record itself: the seed and the style; robust to the draw-order sort)
      for (const b of data.buildings || []) if (b && b.subject) items.forEach((it, i) => { if (it.direct && it.direct.seed === b.seed && (!b.style || it.direct.style === b.style)) subjIdx.add(i); });
      for (const p of data.place || []) if (p && p.subject && Array.isArray(p.at)) items.forEach((it, i) => { if (it.o === p.obj && it.g && Math.abs(it.g.x - p.at[0]) < 1.5 && Math.abs(it.g.d - p.at[1]) < 1.5) subjIdx.add(i); });
    }
    // the subject: an explicit `subject` item wins; then a landmark or signature, the biggest on screen. A FRAMING one (cut by the left or
    // right edge, over half the height: a veteran tree at the side) ranks below any other, since the eye does not rest on a frame.
    for (const B of boxes) {
      const it = items[B.i];
      const isSubj = it.subject === true || subjIdx.has(B.i);
      const isLm = isSubj || B.cat === 'landmark' || B.tags.indexOf('landmark') >= 0 || B.tags.indexOf('signature') >= 0;
      if (!isLm) continue;
      const cb = clip(B.box), a = area(cb);
      if (a <= 0) continue;
      const framing = (B.box[0] < 4 || B.box[2] > W - 4) && (cb[3] - cb[1]) > H * 0.5;
      const rank = (isSubj ? 2 : 0) + (framing ? 0 : 1);
      if (!subject || rank > subject.rank || (rank === subject.rank && a > subject.a)) subject = { a, rank, B, cb, src: isSubj ? 'subject' : B.cat === 'landmark' ? 'landmark' : B.tags.indexOf('signature') >= 0 ? 'signature' : 'landmark-tag' };
    }
    let subj = null;
    if (subject) {
      const { B, cb } = subject, it = items[B.i];
      const cx = (cb[0] + cb[2]) / 2, cy = (cb[1] + cb[3]) / 2, xFrac = cx / W;
      const d1 = Math.abs(xFrac - 1 / 3), d2 = Math.abs(xFrac - 2 / 3);
      subj = { i: B.i, o: it.o, box: cb.map(Math.round), cx: Math.round(cx), cy: Math.round(cy), xFrac: r3(xFrac), size: r3((cb[3] - cb[1]) / H),
        thirdsDist: r3(Math.min(d1, d2)), third: d1 <= d2 ? 1 / 3 : 2 / 3, central: xFrac >= 0.45 && xFrac <= 0.55, symmetric: B.tags.indexOf('symmetric') >= 0, src: subject.src };
      subj.third = r3(subj.third);
    }

    // leading lines
    let lines = [];
    if (data && (data.surfaces || data.water || data.flows) && C.cam) lines = linesFromData(cam, data);
    // polygons (a river or a basin given as an area, a square) by their principal axis, unless a centreline already gave that id
    if (C.surfaces || (C.water || []).some(w => w && w.v2)) { const have = new Set(lines.map(l => l.id)); lines = lines.concat(linesFromSurfaces(cam, C).filter(l => !have.has(l.id))); }
    if (!lines.length) lines = linesFromShapes(cam, C);
    lines = lines.filter(l => l.len >= 60);
    let best = null, bestDist = Infinity;
    const target = subj ? [subj.cx, subj.third * W] : null;
    for (const l of lines) {
      if (l.across) continue;
      const dist = target ? Math.min(Math.abs(l.vp[0] - target[0]), Math.abs(l.vp[0] - target[1])) / W : (l.vp[0] >= -0.1 * W && l.vp[0] <= 1.1 * W ? 0 : Infinity);
      if (dist < bestDist) { bestDist = dist; best = l.id; }
    }
    const leading = { n: lines.filter(l => !l.across).length, best, dist: isFinite(bestDist) ? r3(bestDist) : null, ok: isFinite(bestDist) && bestDist <= 0.15 };

    // framing: 'front' placements at the edges
    let left = 0, right = 0, frontN = 0;
    for (const B of boxes) {
      if (B.layer !== 'front') continue;
      frontN++;
      const b = B.box;
      if (b[3] - b[1] < H * 0.2) continue;
      if (b[0] <= 8) left = Math.max(left, Math.min(W, b[2]) / W);
      if (b[2] >= W - 8) right = Math.max(right, (W - Math.max(0, b[0])) / W);
    }
    const framing = { left: r3(left), right: r3(right), cover: r3(Math.max(left, right)), sides: (left > 0.02 ? 1 : 0) + (right > 0.02 ? 1 : 0) };

    const heading = ((cam.heading % 360) + 360) % 360;
    return {
      v: 1, w: W, h: H, horizon: Math.round(cam.horizon), eye: r3(cam.eye), fov: cam.fov, f: Math.round(cam.f), camSrc: cam.src, heading,
      headingClass: COMPASS[Math.round(heading / 45) % 8], horizonBucket: Math.round(cam.horizon / 50),
      preset: cam.preset || (data && data.camera && data.camera.preset) || null,
      skyShare: r3(sky / N), waterShare: r3(water / N), subject: subj, lines, leading, framing,
      grid: { cols: 16, rows: 9, groups }, kinds, counts: { items: items.length, salient, front: frontN },
    };
  }
  return { measure, pathPolys, camOf, GROUPS };
})();

/** The composition measures of a compiled scene (see the header). */
function sceneCompositionOf(C, o) {
  o = o || {};
  const opt = {
    data: o.data || null,
    obj: o.obj || (typeof sceneObj === 'function' ? sceneObj : null),
    shapes: o.shapes || (typeof sceneObjShapes === 'function' ? sceneObjShapes : null),
  };
  return _sccm.measure(C || {}, opt);
}
