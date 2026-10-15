/* ============================================================
   WORLD ENGINE (scene format v3.1), package look: the STRICT detail coverage (docs/dev/WORLD_ENGINE.md 12.3, 16.4; requirements
   C3, C6, N2, N4, P7, QP1, QP4, QP5). Private prefix _wdt. PURE (Node + browser): only frozen data and functions at load.

   worldCoverage (79-world-4backdrop.js) judges the frame by entity BOXES and counts a lived surface as dressed: a tree's box
   covers the sky gaps and the bare lawn under its crown, a crowd population dresses a whole plaza, a sunken river's wall faces
   are never looked at. It passes bare channels, flat quays, empty lawns and empty foregrounds. This measure looks at what the
   eye SEES instead: entities by their ART silhouette (the union of their shapes' boxes on a 24 x 24 grid over the art box),
   the extruded buildings and lines, the channel walls, the ground detail (79-world-4ground.js) and the self-dressed surfaces.

     worldArtMask(obj, variant, season)     -> { box, n, grid: Uint8Array(n * n) } the silhouette of a library object (memoised)
     worldDetailCoverage(world, cam, o)     -> the strict record (below); o: { W, H, cols, rows, season, backdrop, kit }
     worldDetailProblems(rec, o)            -> [{ rule, msg, fix }] the strict rules (the critic's FAIL list):
         flatSurface   more than 4 % of the frame below the horizon is a flat untextured surface
         bareChannel   a sunken water region's channel walls show untextured (flat slabs of colour)
         bareQuay      more than 10 % of the frame is paving with nothing on it (no furniture, trees, planters or people)
         bareGround    more than 15 % of the frame below the horizon is undressed (texture alone does not dress ground, C6)
         bareRegion    one ninth of the ground (a 3 x 3 grid) is more than 55 % undressed
         emptyForeground  the near band (the bottom third of the ground rows) is under 60 % dressed, or nothing stands in it
         fewLayers     fewer than 5 depth layers (0-6, 6-15, 15-40, 40-120, 120-400 m, the backdrop) carry 1.5 % of the frame
         noFraming     no framing element: neither a bough or crown at a top corner nor something standing at a side of the near band
         lowVariety    fewer than 14 distinct objects in the frame, or fewer than 6 in the middle distance (15-80 m)
         noLife        no population of people or animals that can be seen
         skyShare      (a warning) the sky share is outside the kit's range by more than 0.12
   The record: { bare, flat, dressed, sky, near: { dressed, object }, layers: [6 shares], layerCount, frame: { top, left, right },
     variety: { all, mid }, life, paving, channel: { area, flat }, regions: [{ name, bare, flat }], surfaces: { <id>: { bare, flat,
     kind } }, samples }.
   ============================================================ */

const WORLD_DETAIL_LAYERS = Object.freeze([6, 15, 40, 120, 400]);
const WORLD_DETAIL_LIMITS = Object.freeze({ flat: 0.04, bare: 0.15, region: 0.55, near: 0.6, nearObject: 0.08, paving: 0.1, channel: 0.01, layers: 5, layerShare: 0.015,
  variety: 14, varietyMid: 6, skySlack: 0.12 });
const _WDT_SELF = new Set(['water', 'reeds', 'reedbed', 'bed', 'hedge', 'weir', 'rail', 'tram', 'boardwalk', 'bridge-deck', 'deck', 'jetty', 'pontoon', 'stairs', 'ramp']);
const _WDT_PAVING = new Set(['pavement', 'plaza', 'platform', 'driveway', 'crossing', 'steps']);
const _WDT_STRIP = new Set(['path', 'towpath', 'track', 'cycleway', 'pavement', 'boardwalk', 'bridge-deck']);
const _WDT_SKIP_PART = /^(lit|glow|glint|shadow|shade|reflect|reflection|mirror|smoke)/i;
const _WDT_N = 24;

/* ---------- the art silhouette ---------- */
const _wdtMaskMemo = new Map();
/**
 * The subpaths of an SVG path as point rings (every command; a curve by its control points and end point, an arc by its end
 * points and its radius box), for the silhouette fill. -> [[[x, y], ...], ...]
 */
function _wdtPathRings(d) {
  if (typeof d !== 'string' || !d) return [];
  const tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
  if (!tok) return [];
  const rings = [];
  let i = 0, cx = 0, cy = 0, sx = 0, sy = 0, cmd = '', cur = null;
  const ARGS = { m: 2, l: 2, h: 1, v: 1, q: 4, t: 2, c: 6, s: 4, a: 7, z: 0 };
  const put = (x, y) => { if (!cur) { cur = []; rings.push(cur); } cur.push([x, y]); };
  while (i < tok.length) {
    if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
    const lc = cmd.toLowerCase(), n = ARGS[lc];
    if (n == null) { i++; continue; }
    if (lc === 'z') { cx = sx; cy = sy; cur = null; continue; }
    if (i + n > tok.length) break;
    const a = []; for (let k = 0; k < n; k++) a.push(+tok[i++]);
    if (a.some(v => !Number.isFinite(v))) break;
    const rel = cmd === lc;
    if (lc === 'm') { cx = rel ? cx + a[0] : a[0]; cy = rel ? cy + a[1] : a[1]; sx = cx; sy = cy; cur = null; put(cx, cy); cmd = rel ? 'l' : 'L'; continue; }
    if (lc === 'h') { cx = rel ? cx + a[0] : a[0]; put(cx, cy); continue; }
    if (lc === 'v') { cy = rel ? cy + a[0] : a[0]; put(cx, cy); continue; }
    if (lc === 'a') { cx = rel ? cx + a[5] : a[5]; cy = rel ? cy + a[6] : a[6]; put(cx, cy); continue; }
    for (let k = 0; k < n; k += 2) put(rel ? cx + a[k] : a[k], rel ? cy + a[k + 1] : a[k + 1]);
    cx = rel ? cx + a[n - 2] : a[n - 2]; cy = rel ? cy + a[n - 1] : a[n - 1];
  }
  return rings.filter(r => r.length >= 2);
}
function _wdtRingIn(R, x, y) { let c = false; for (let i = 0, j = R.length - 1; i < R.length; j = i++) { const a = R[i], b = R[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
/** The silhouette of a library object (see the header): each filled shape's subpaths filled on the grid (cell centres and the
    cells its outline crosses), strokes along their lines; the art box is the object's own (sceneObjShapes); null without one. */
function worldArtMask(obj, variant, season) {
  const key = obj + '|' + (variant | 0) + '|' + (season || 'summer');
  if (_wdtMaskMemo.has(key)) return _wdtMaskMemo.get(key);
  let out = null;
  try {
    const sh = typeof sceneObjShapes === 'function' ? sceneObjShapes(obj, variant | 0, season || 'summer') : null;
    if (sh && Array.isArray(sh.box) && sh.parts) {
      const b = sh.box, w = Math.max(1e-6, b[2] - b[0]), h = Math.max(1e-6, b[3] - b[1]), N = _WDT_N, grid = new Uint8Array(N * N), cw = w / N, ch = h / N;
      const cell = (x, y) => { const i = Math.floor((x - b[0]) / cw), j = Math.floor((y - b[1]) / ch); if (i >= 0 && j >= 0 && i < N && j < N) grid[j * N + i] = 1; };
      const trace = (R, closed) => { for (let k = 0; k < R.length - (closed ? 0 : 1); k++) { const p = R[k], q = R[(k + 1) % R.length], steps = Math.max(1, Math.ceil(Math.max(Math.abs(q[0] - p[0]) / cw, Math.abs(q[1] - p[1]) / ch) * 2)); for (let t = 0; t <= steps; t++) cell(p[0] + (q[0] - p[0]) * t / steps, p[1] + (q[1] - p[1]) * t / steps); } };
      for (const part of Object.keys(sh.parts)) {
        if (_WDT_SKIP_PART.test(part)) continue;
        for (const s0 of sh.parts[part] || []) {
          if (!s0 || s0.glow) continue;
          if (s0.op != null && s0.op < 0.25) continue;
          // a shape's own transform (m: [a, b, c, d, e, f], the library's affine) applies to its outline and its stroke width
          const M = Array.isArray(s0.m) && s0.m.length === 6 ? s0.m : null, mk = M ? Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1 : 1;
          const xf = (R) => M ? R.map(q => [M[0] * q[0] + M[2] * q[1] + M[4], M[1] * q[0] + M[3] * q[1] + M[5]]) : R;
          const fill = s0.f && s0.f !== 'none', line = s0.s && s0.s !== 'none' && (s0.w || 0) > 0;
          if (s0.img && Array.isArray(s0.rect)) { const r = s0.rect; for (let y = r[1]; y <= r[3]; y += ch) for (let x = r[0]; x <= r[2]; x += cw) cell(x, y); continue; }
          if (!fill && !line) continue;
          for (const R of _wdtPathRings(s0.d).map(xf)) {
            if (fill && R.length >= 3) {
              let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
              for (const q of R) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; }
              const i0 = Math.max(0, Math.floor((x0 - b[0]) / cw)), i1 = Math.min(N - 1, Math.floor((x1 - b[0]) / cw)), j0 = Math.max(0, Math.floor((y0 - b[1]) / ch)), j1 = Math.min(N - 1, Math.floor((y1 - b[1]) / ch));
              for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) if (!grid[j * N + k] && _wdtRingIn(R, b[0] + (k + 0.5) * cw, b[1] + (j + 0.5) * ch)) grid[j * N + k] = 1;
            }
            // the outline itself (a thin leaf or a twig smaller than a cell still shows), and strokes along their lines
            if ((fill && R.length >= 2) || (line && (s0.w || 0) * mk >= Math.min(cw, ch) * 0.2)) trace(R, fill);
          }
        }
      }
      out = { box: b.slice(), n: N, grid };
    }
  } catch (e) { out = null; }
  _wdtMaskMemo.set(key, out);
  return out;
}

/* ---------- small helpers ---------- */
const _wdtNum = v => typeof v === 'number' && Number.isFinite(v);
function _wdtG(cam, x, z) { return cam.relief && typeof sceneGroundHeight === 'function' ? sceneGroundHeight(cam, x, z) : 0; }
function _wdtP(cam, x, z, y) { const d = Math.max(0.05, z), k = cam.f / d; return { X: (_wdtNum(cam.x0) ? cam.x0 : 800) + k * x, Y: cam.horizon + k * (cam.eye - (y == null ? _wdtG(cam, x, d) : y)), k }; }
function _wdtUn(cam, X, Y) {
  if (typeof sceneUnproject === 'function') { try { return sceneUnproject(cam, X, Y); } catch (e) { /* flat */ } }
  if (!(Y > cam.horizon + 1e-6)) return null;
  const d = cam.f * cam.eye / (Y - cam.horizon);
  return { x: (X - (cam.x0 || 800)) * d / cam.f, d };
}
function _wdtInPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
function _wdtSegD(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0; return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz); }
function _wdtIn(s, x, z) {
  if (Array.isArray(s.poly) && s.poly.length >= 3) return _wdtInPoly(s.poly, x, z);
  if (Array.isArray(s.path) && s.path.length >= 2) { const hw = (Number(s.width) || 2) / 2; for (let i = 1; i < s.path.length; i++) if (_wdtSegD(x, z, s.path[i - 1], s.path[i]) <= hw) return true; }
  return false;
}
function _wdtSurfAt(world, x, z) { const S = world.surfaces || []; for (let i = S.length - 1; i >= 0; i--) { const s = S[i]; if (s && !s.backdrop && _wdtIn(s, x, z)) return s; } return null; }
function _wdtHeight(e) {
  if (_wdtNum(e.height) && e.height > 0) return e.height;
  const kb = typeof worldKb === 'function' ? worldKb(e.obj) : null;
  if (kb && kb.size && kb.size.h0 > 0) return kb.size.h0;
  const r = typeof sceneObjReal === 'function' ? sceneObjReal(e.obj) : null;
  return r && r.h > 0 ? r.h : 1;
}

/* ---------- the measure ---------- */
/**
 * The strict coverage of a world through its camera (see the header). Every sample of the frame (o.cols x o.rows) is classed:
 * 'object' (an entity's silhouette, an extruded building or line, a dressed channel wall), 'self' (water, reeds, hedges, decks),
 * 'life' (a lived walk strip: people walk it), 'texture' (a surface the ground detail textures, nothing on it), 'flat' (an
 * untextured surface or bare ground), 'sky'.
 */
function worldDetailCoverage(world, cam, o) {
  o = o || {};
  const W = o.W || 1600, H = o.H || 900, cols = o.cols || 80, rows = o.rows || 45, L = WORLD_DETAIL_LIMITS;
  const rec = { bare: 1, flat: 1, dressed: 0, sky: 0, near: { dressed: 0, object: 0 }, layers: [0, 0, 0, 0, 0, 0], layerCount: 0, frame: { top: null, left: null, right: null },
    variety: { all: 0, mid: 0 }, life: 0, paving: 0, channel: { area: 0, flat: 0 }, regions: [], surfaces: {}, samples: 0 };
  try {
    cam = cam || (world && world.cam);
    if (!world || !cam || !_wdtNum(cam.f)) return rec;
    const season = o.season || world.season || 'summer', hz = cam.horizon;
    // the occupancy: per sample the nearest thing drawn there (depth z, kind, object id)
    const N = cols * rows, zOf = new Float32Array(N).fill(Infinity), objOf = new Array(N).fill(null), cw = W / cols, ch = H / rows;
    const mark = (i, j, z, id) => { if (i < 0 || j < 0 || i >= cols || j >= rows) return; const k = j * cols + i; if (z < zOf[k]) { zOf[k] = z; objOf[k] = id; } };
    let bd = o.backdrop;
    if (!bd && typeof worldBackdrop === 'function' && world.backdrop) { try { bd = worldBackdrop(world, cam, season) || []; } catch (e) { bd = []; } }
    const ents = (world.entities || []).filter(e => e && e.obj && e.z > 0.3).concat((bd || []).map(b => Object.assign({ backdrop: true }, b)));
    const seenObj = new Set(), seenMid = new Set();
    for (const e of ents) {
      const kbE = typeof worldKb === 'function' ? worldKb(e.obj) : null;
      if (kbE && kbE.when && typeof worldStaticPresent === 'function' && o.ctx) { try { if (!worldStaticPresent(e, o.ctx)) continue; } catch (err) { /* present */ } }
      const mask = worldArtMask(e.obj, e.variant, season), def = typeof sceneObj === 'function' ? sceneObj(e.obj) : null;
      if (!mask || !def || !Array.isArray(def.size) || !(def.size[1] > 0)) continue;
      const air = String(e.attach || '') === 'air' || (kbE && kbE.hang);
      const P = _wdtP(cam, e.x, e.z, _wdtNum(e.y) ? e.y : null), s = P.k * _wdtHeight(e) / def.size[1], flip = _wdtNum(e.facing) && e.facing > 180 && e.facing < 360 ? -1 : 1;
      const b = mask.box, X0 = P.X + Math.min(b[0] * s * flip, b[2] * s * flip), X1 = P.X + Math.max(b[0] * s * flip, b[2] * s * flip), Y0 = P.Y + b[1] * s, Y1 = P.Y + b[3] * s;
      if (X1 < 0 || X0 > W || Y1 < 0 || Y0 > H) continue;
      if (!e.backdrop) { seenObj.add(e.obj); if (e.z >= 15 && e.z < 150) seenMid.add(e.obj); }
      const n = mask.n, gw = (b[2] - b[0]) / n, gh = (b[3] - b[1]) / n;
      const i0 = Math.max(0, Math.floor(X0 / cw)), i1 = Math.min(cols - 1, Math.floor(X1 / cw)), j0 = Math.max(0, Math.floor(Y0 / ch)), j1 = Math.min(rows - 1, Math.floor(Y1 / ch));
      for (let j = j0; j <= j1; j++) {
        const Y = (j + 0.5) * ch, ay = (Y - P.Y) / s, gj = Math.floor((ay - b[1]) / gh);
        if (gj < 0 || gj >= n) continue;
        for (let i = i0; i <= i1; i++) {
          const X = (i + 0.5) * cw, ax = (X - P.X) / s * flip, gi = Math.floor((ax - b[0]) / gw);
          if (gi < 0 || gi >= n || !mask.grid[gj * n + gi]) continue;
          mark(i, j, e.z, e.backdrop ? 'bd' : e.obj);
        }
      }
      void air;
    }
    // extruded buildings and lines: solid faces from the ground to their height
    const prim = (foot, h, y0, id) => {
      const near = Math.max(0.4, (cam.dMin || 1) * 0.3);
      for (let a = 0; a < foot.length; a++) {
        const p = foot[a], q = foot[(a + 1) % foot.length];
        if (p[1] < near && q[1] < near) continue;
        // steps by the screen length of the edge (a near wall spans the frame in a few metres)
        const pa = _wdtP(cam, p[0], Math.max(near, p[1]), 0), pb = _wdtP(cam, q[0], Math.max(near, q[1]), 0);
        const steps = Math.max(1, Math.min(600, Math.ceil(Math.hypot(pb.X - pa.X, pb.Y - pa.Y) / (cw * 0.5)), Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.25)));
        for (let t = 0; t <= steps; t++) {
          const x = p[0] + (q[0] - p[0]) * t / steps, z = Math.max(near, p[1] + (q[1] - p[1]) * t / steps), g = _wdtG(cam, x, z) + (y0 || 0);
          const A = _wdtP(cam, x, z, g), B = _wdtP(cam, x, z, g + h), i = Math.floor(A.X / cw);
          for (let j = Math.max(0, Math.floor(B.Y / ch)); j <= Math.min(rows - 1, Math.floor(A.Y / ch)); j++) for (let di = -1; di <= 1; di++) mark(i + di, j, z, id);
        }
      }
    };
    for (const bdg of world.buildings || []) if (bdg && Array.isArray(bdg.foot)) prim(bdg.foot, _wdtNum(bdg.h) ? bdg.h : 6, 0, 'building:' + (bdg.id || ''));
    for (const Ln of world.lines || []) if (Ln && Array.isArray(Ln.path) && /wall|hedge|fence|railing/.test(Ln.kind)) { for (let a = 1; a < Ln.path.length; a++) prim([Ln.path[a - 1], Ln.path[a]], _wdtNum(Ln.h) ? Ln.h : 1.2, _wdtNum(Ln.y) ? Ln.y : 0, 'line:' + Ln.kind); }
    // the channel walls: dressed (an object) when the ground detail dresses them, else flat slabs
    const wallOf = new Array(N).fill(null);
    let walls = [];
    if (typeof worldChannelWalls === 'function') { try { walls = worldChannelWalls(world, cam) || []; } catch (e) { walls = []; } }
    else walls = _wdtWallsOwn(world, cam);
    const dressedWalls = typeof worldGroundDetail === 'function' && typeof worldChannelWalls === 'function';
    for (const w of walls) for (const r of w.runs || []) {
      const P = r.scr; if (!Array.isArray(P) || P.length < 3) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const q of P) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
      for (let j = Math.max(0, Math.floor(y0 / ch)); j <= Math.min(rows - 1, Math.floor(y1 / ch)); j++) for (let i = Math.max(0, Math.floor(x0 / cw)); i <= Math.min(cols - 1, Math.floor(x1 / cw)); i++) {
        const X = (i + 0.5) * cw, Y = (j + 0.5) * ch;
        if (!_wdtInPoly(P, X, Y)) continue;
        const k = j * cols + i;
        const z = r.zNear || 1;
        if (!Number.isFinite(zOf[k]) || zOf[k] > z) wallOf[k] = { dressed: dressedWalls && (w.look === 'earth' || r.courses > 0), look: w.look, water: w.water, z };
      }
    }
    // the samples
    const lived = new Set(); for (const p of world.life || []) if (p && p.on) lived.add(p.on);
    const regs = Array.from({ length: 9 }, () => ({ n: 0, bare: 0, flat: 0 })), surf = {};
    let n = 0, bare = 0, flat = 0, sky = 0, skyN = 0, nearN = 0, nearD = 0, nearO = 0, paving = 0, chA = 0, chF = 0, midN = 0, midSelf = 0;
    const layerHits = [0, 0, 0, 0, 0, 0], dbg = o.debug ? new Array(N).fill(' ') : null;
    const look = typeof worldGroundTextured === 'function';
    for (let j = 0; j < rows; j++) {
      const Y = (j + 0.5) * ch;
      for (let i = 0; i < cols; i++) {
        const X = (i + 0.5) * cw, k = j * cols + i, z = zOf[k], id = objOf[k];
        if (Y <= hz) { skyN++; if (!Number.isFinite(z)) { sky++; if (dbg) dbg[k] = 's'; } else { layerHits[_wdtLayer(z, id)]++; if (dbg) dbg[k] = 'o'; } continue; }
        n++;
        const rr = Math.min(2, Math.floor((Y - hz) / (H - hz) * 3)), ri = rr * 3 + Math.min(2, Math.floor(i / cols * 3)), nearRow = rr === 2;
        regs[ri].n++;
        if (nearRow) nearN++;
        let cls;
        const wl = wallOf[k];
        if (wl) { chA++; cls = wl.dressed ? 'object' : 'flat'; if (!wl.dressed) chF++; else layerHits[_wdtLayer(wl.z, null)]++; }
        else if (Number.isFinite(z)) { cls = 'object'; layerHits[_wdtLayer(z, id)]++; }
        else {
          const g = _wdtUn(cam, X, Y);
          const s = g ? _wdtSurfAt(world, g.x, g.d) : null;
          // two questions per ground sample: is the surface textured (or flat colour), and is it dressed (people walk a lived strip)
          let tex = false;
          if (!s) { tex = !!(g && (g.d > 400 || (look && worldGroundTextured(world, cam, g.x, g.d).textured))); cls = tex ? 'texture' : 'flat'; }
          else if (_WDT_SELF.has(s.kind)) { tex = true; cls = 'self'; }
          else {
            const gt = look ? worldGroundTextured(world, cam, g.x, g.d) : null;
            tex = !!(gt && gt.textured);
            var openLook = !!(gt && typeof WORLD_GROUND_OPEN === 'object' && WORLD_GROUND_OPEN.includes(gt.look));
            // people dress the walk strips they walk, traffic the roads it drives; a crowd on a textured square dresses half of it
            const strip = Array.isArray(s.path) && (Number(s.width) || 2) <= (s.kind === 'road' || s.kind === 'tramway' ? 12 : 6);
            cls = lived.has(s.id) && strip && (_WDT_STRIP.has(s.kind) || s.kind === 'road' || s.kind === 'tramway') ? 'life' : lived.has(s.id) && tex && _WDT_PAVING.has(s.kind) ? 'crowd' : tex && openLook ? 'open' : tex ? 'texture' : 'flat';
          }
          if (!tex) { flat++; regs[ri].flat++; }
          if (s) { const q = surf[s.id] || (surf[s.id] = { kind: s.kind, n: 0, bare: 0, flat: 0 }); q.n++; if (cls === 'texture' || cls === 'flat') q.bare++; if (cls === 'open' || cls === 'crowd') q.bare += 0.5; if (!tex) q.flat++; }
          if (s && _WDT_PAVING.has(s.kind) && (cls === 'texture' || cls === 'flat' || cls === 'life' || cls === 'crowd')) paving += cls === 'crowd' ? 0.5 : 1;
          // a dressed or textured surface is a depth layer of its own (a lake, a lawn), flat colour is not
          if (g && cls !== 'flat') layerHits[_wdtLayer(g.d, null)]++;
          if (g && g.d >= 15 && g.d < 150) { midN++; if (cls === 'self') midSelf++; }
        }
        if (dbg) dbg[k] = ({ object: 'o', self: 'w', life: 'l', crowd: 'c', open: 'p', texture: 't', flat: 'f' })[cls] || '?';
        if (cls === 'texture' || cls === 'flat') { bare++; regs[ri].bare++; }
        if (cls === 'crowd' || cls === 'open') { bare += 0.5; regs[ri].bare += 0.5; }
        if (cls === 'flat' && wl) { flat++; regs[ri].flat++; }
        if (nearRow && cls !== 'texture' && cls !== 'flat') nearD += cls === 'crowd' || cls === 'open' ? 0.5 : 1;
        if (nearRow && cls === 'object') nearO++;
      }
    }
    const frameN = cols * rows;
    rec.samples = n;
    rec.bare = n ? _wdtR(bare / n) : 0; rec.flat = n ? _wdtR(flat / n) : 0; rec.dressed = n ? _wdtR(1 - bare / n) : 0;
    rec.sky = skyN ? _wdtR(sky / frameN) : 0;
    rec.near = { dressed: nearN ? _wdtR(nearD / nearN) : 1, object: nearN ? _wdtR(nearO / nearN) : 0 };
    rec.layers = layerHits.map(h => _wdtR(h / frameN));
    rec.frame = _wdtFraming(world, cam, W, H);
    // a near layer must carry 1.5 % of the frame, a far one (from 40 m) 0.5 %: far things are small; the sky is the farthest plane
    // of an enclosed view (a street, a wood) when 4 % of the frame shows it
    rec.layerCount = rec.layers.filter((v, i) => v >= (i < 3 ? L.layerShare : L.layerShare / 3)).length + (rec.layers[4] < L.layerShare / 3 && rec.layers[5] < L.layerShare / 3 && rec.sky >= ((rec.frame.left && rec.frame.right && /^building/.test(String(rec.frame.left)) && /^building/.test(String(rec.frame.right))) ? 0.015 : 0.04) ? 1 : 0);   // a street walled by houses on both sides shows a slot of sky between the roofs: 1.5 % is its farthest plane
    // a layer wholly nearer than the ground at the frame's bottom edge cannot be seen from a raised camera (a terrace, a bridge): it is not missing
    const zBottom = cam && cam.f > 0 && cam.eye > 0 ? cam.f * cam.eye / Math.max(1, H - (cam.horizon || 0)) : 0;
    for (let i = 0; i < WORLD_DETAIL_LAYERS.length; i++) if (WORLD_DETAIL_LAYERS[i] <= zBottom && rec.layers[i] < (i < 3 ? L.layerShare : L.layerShare / 3)) rec.layerCount++;
    rec.paving = _wdtR(paving / frameN);
    rec.channel = { area: _wdtR(chA / frameN), flat: _wdtR(chF / frameN) };
    const RN = ['far', 'mid', 'near'], CN = ['left', 'centre', 'right'];
    rec.regions = regs.map((q, i) => ({ name: RN[Math.floor(i / 3)] + '-' + CN[i % 3], bare: q.n ? _wdtR(q.bare / q.n) : 0, flat: q.n ? _wdtR(q.flat / q.n) : 0 }));
    for (const [sid, q] of Object.entries(surf)) rec.surfaces[sid] = { kind: q.kind, share: _wdtR(q.n / frameN), bare: q.n ? _wdtR(q.bare / q.n) : 0, flat: q.n ? _wdtR(q.flat / q.n) : 0 };
    // extruded buildings count by style, lines by kind (a row of houses is one kind of thing per style)
    // a street of generated houses is eight kinds of thing at most, not one: every house has its own seed (colours, frame, openings, fittings)
    for (const bdg of world.buildings || []) if (bdg) { const k = 'building:' + (bdg.style || 'victorian-terrace') + (_wdtNum(bdg.seed) ? '#' + (Math.abs(bdg.seed) % 8) : ''); seenObj.add(k); if (Array.isArray(bdg.foot) && bdg.foot.length && Math.min(...bdg.foot.map(p => p[1])) >= 15 && Math.min(...bdg.foot.map(p => p[1])) < 150) seenMid.add(k); }
    for (const Ln of world.lines || []) if (Ln && /wall|hedge|fence|railing/.test(Ln.kind)) seenObj.add('line:' + Ln.kind);
    rec.variety = { all: seenObj.size, mid: seenMid.size, midWater: midN ? _wdtR(midSelf / midN) : 0 };
    rec.life = (world.life || []).filter(p => p && (p.on || p.count || p.rate || p.every || p.who)).length;
    if (dbg) rec.grid = { cols, rows, cells: dbg.join(''), z: Array.from(zOf, v => Number.isFinite(v) ? Math.round(v * 10) / 10 : -1) };
  } catch (e) { rec.error = String(e && e.message || e); }
  return rec;
}
const _wdtR = v => Math.round(v * 1000) / 1000;
function _wdtLayer(z, id) { if (id === 'bd') return 5; const B = WORLD_DETAIL_LAYERS; for (let i = 0; i < B.length; i++) if (z < B[i]) return i; return 5; }
/** The channel walls without look's ground detail (the bare engine): every sunken water region's visible bank faces, flat. */
function _wdtWallsOwn(world, cam) {
  const out = [];
  for (const s of world.surfaces || []) {
    if (!s || s.kind !== 'water' || !Array.isArray(s.poly)) continue;
    const lvl = _wdtNum(s.level) ? s.level : _wdtNum(cam.water) ? cam.water : 0;
    if (!(lvl < -0.12)) continue;
    const runs = [], P = s.poly;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dz = b[1] - a[1], Ls = Math.hypot(dx, dz);
      if (!(Ls > 0) || Math.max(a[1], b[1]) < 0.5) continue;
      let nx = -dz / Ls, nz = dx / Ls;
      if (!_wdtInPoly(P, (a[0] + b[0]) / 2 + nx * 0.3, (a[1] + b[1]) / 2 + nz * 0.3)) { nx = -nx; nz = -nz; }
      if (!(nx * -(a[0] + b[0]) / 2 + nz * -(a[1] + b[1]) / 2 > 0)) continue;
      const pa = [a[0], Math.max(0.5, a[1])], pb = [b[0], Math.max(0.5, b[1])], A = _wdtP(cam, pa[0], pa[1], 0), B = _wdtP(cam, pb[0], pb[1], 0), C = _wdtP(cam, pb[0], pb[1], lvl), D = _wdtP(cam, pa[0], pa[1], lvl);
      runs.push({ scr: [[A.X, A.Y], [B.X, B.Y], [C.X, C.Y], [D.X, D.Y]], zNear: Math.min(pa[1], pb[1]), courses: 0 });
    }
    if (runs.length) out.push({ water: s.id, look: 'flat', runs });
  }
  return out;
}
/** What frames the view (C3): a bough or frond at a top corner, a structured crown cut by the top at a side, things at the sides of the near band. */
function _wdtFraming(world, cam, W, H) {
  const out = { top: null, hang: null, left: null, right: null }, hz = cam.horizon, nearRow = hz + (H - hz) * 0.6;
  for (const e of world.entities || []) {
    if (!e || !e.obj || e.backdrop || !(e.z > 0.3)) continue;
    const kb = typeof worldKb === 'function' ? worldKb(e.obj) : null;
    if (!kb || kb.decal) continue;
    const mask = worldArtMask(e.obj, e.variant, 'summer'), def = typeof sceneObj === 'function' ? sceneObj(e.obj) : null;
    if (!mask || !def || !Array.isArray(def.size)) continue;
    const P = _wdtP(cam, e.x, e.z, _wdtNum(e.y) ? e.y : null), s = P.k * _wdtHeight(e) / def.size[1], b = mask.box, flip = _wdtNum(e.facing) && e.facing > 180 && e.facing < 360 ? -1 : 1;
    const X0 = P.X + Math.min(b[0] * s * flip, b[2] * s * flip), X1 = P.X + Math.max(b[0] * s * flip, b[2] * s * flip), Y0 = P.Y + b[1] * s, Y1 = P.Y + b[3] * s;
    if (X1 < 0 || X0 > W || Y1 < 0 || Y0 > H) continue;
    const hang = kb.cls === 'bough' || kb.cls === 'frond' || (kb.hang && String(e.attach || '') === 'air');
    const domed = (typeof WORLD_KIT_WEAK === 'object' && WORLD_KIT_WEAK && WORLD_KIT_WEAK[e.obj]) || (typeof WORLD_KIT_DISTANT_ONLY === 'object' && WORLD_KIT_DISTANT_ONLY && WORLD_KIT_DISTANT_ONLY.includes(e.obj));
    if (!out.hang && hang && Y0 <= 0.1 * H && (X0 <= 0.03 * W || X1 >= 0.97 * W)) { out.top = e.obj; out.hang = e.obj; }
    if (!out.top && kb.cls === 'tree' && !domed && Y0 < 0.02 * H && (X0 < 0.08 * W || X1 > 0.92 * W) && Y1 - Y0 > 0.6 * H) out.top = e.obj;
    if (!hang && Y1 >= nearRow && Math.min(H, Y1) - Math.max(0, Y0) >= 0.12 * H && Math.min(W, X1) - Math.max(0, X0) >= 0.035 * W) {
      if (X0 < 0.2 * W && !out.left) out.left = e.obj;
      if (X1 > 0.8 * W && !out.right) out.right = e.obj;
    }
  }
  // buildings and walls standing in the near band at a side frame it (a building's edge, C1)
  const sideBox = (x0, y0, x1, y1, what) => { if (y1 >= nearRow && Math.min(H, y1) - Math.max(0, y0) >= 0.12 * H && Math.min(W, x1) - Math.max(0, x0) >= 0.035 * W) { if (x0 < 0.2 * W && x1 > 0 && !out.left) out.left = what; if (x1 > 0.8 * W && x0 < W && !out.right) out.right = what; } };
  const near0 = Math.max(0.4, (cam.dMin || 1) * 0.3);
  const primBox = (foot, h, what) => { let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const p of foot) { if (p[1] < near0) continue; const A = _wdtP(cam, p[0], p[1], 0), B = _wdtP(cam, p[0], p[1], h); x0 = Math.min(x0, A.X, B.X); x1 = Math.max(x1, A.X, B.X); y0 = Math.min(y0, B.Y); y1 = Math.max(y1, A.Y); } if (Number.isFinite(x0)) sideBox(x0, y0, x1, y1, what); };
  for (const bdg of world.buildings || []) if (bdg && Array.isArray(bdg.foot)) primBox(bdg.foot, _wdtNum(bdg.h) ? bdg.h : 6, 'building:' + (bdg.id || ''));
  for (const Ln of world.lines || []) if (Ln && Array.isArray(Ln.path) && /wall|hedge|fence|railing/.test(Ln.kind)) for (let i = 1; i < Ln.path.length; i++) primBox([Ln.path[i - 1], Ln.path[i]], _wdtNum(Ln.h) ? Ln.h : 1.2, 'line:' + Ln.kind);
  // dressed channel walls reaching a bottom corner frame that side (a wall edge, C1)
  if (typeof worldChannelWalls === 'function' && typeof worldGroundDetail === 'function') {
    try {
      for (const w of worldChannelWalls(world, cam)) for (const r of w.runs) {
        if (w.look === 'earth') continue;
        let x0 = Infinity, x1 = -Infinity, y1 = -Infinity; for (const q of r.scr) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
        if (y1 >= 0.97 * H) { if (x0 < 0.2 * W && !out.left) out.left = 'wall:' + w.water; if (x1 > 0.8 * W && !out.right) out.right = 'wall:' + w.water; }
      }
    } catch (e) { /* none */ }
  }
  return out;
}
/** The strict rules over a record of worldDetailCoverage (see the header). o: { kit (a kit or key: its sky range), city }. */
function worldDetailProblems(rec, o) {
  o = o || {};
  const L = WORLD_DETAIL_LIMITS, out = [], P = (rule, msg, fix, severity) => out.push({ rule, msg, fix, severity: severity || 'fail' });
  if (!rec || rec.error) { P('noMeasure', 'the detail measure could not run: ' + (rec && rec.error), 'check the world'); return out; }
  const K1 = o.kit ? (typeof o.kit === 'string' && typeof worldKit === 'function' ? worldKit(o.kit) : o.kit) : null, B = (K1 && K1.bare) || {};
  const bareMax = Math.max(L.bare, B.ground || 0), pavMax = Math.max(L.paving, B.paving || 0);
  const pct = v => Math.round(v * 100) + ' %', worst = (key) => Object.entries(rec.surfaces).filter(([, q]) => q.share > 0.02 && q[key] > 0.3).sort((a, b) => b[1].share * b[1][key] - a[1].share * a[1][key]).slice(0, 3).map(([id, q]) => `${id} (${q.kind}, ${pct(q[key])} of it)`).join(', ');
  if (rec.channel.flat > L.channel) P('bareChannel', `${pct(rec.channel.flat)} of the frame is untextured channel wall (flat slabs of colour beside the water)`, 'the ground detail dresses sunken water walls (79-world-4ground.js worldChannelWalls): load it, or give the water its edge');
  if (rec.flat > L.flat) P('flatSurface', `${pct(rec.flat)} of the ground is flat untextured colour (max ${pct(L.flat)}): ${worst('flat') || 'bare ground'}`, 'every surface kind needs a ground look (WORLD_GROUND_LOOKS / the kit look map)');
  if (rec.paving > pavMax) P('bareQuay', `${pct(rec.paving)} of the frame is paving with nothing on it (max ${pct(pavMax)})`, 'the kit paving dressing: more furniture, trees in pits, planters, people (the fill paving tier)');
  if (rec.bare > bareMax) P('bareGround', `${pct(rec.bare)} of the ground below the horizon is undressed (max ${pct(bareMax)}): ${worst('bare') || ''}`, 'the fill dresses every surface from the kit until the strict measure passes (P6, C6)');
  const badR = rec.regions.filter(r => r.bare > L.region);
  if (badR.length) P('bareRegion', `undressed ground region(s): ${badR.map(r => r.name + ' ' + pct(r.bare)).join(', ')} (max ${pct(L.region)})`, 'dress that part of the frame (fill tiers) or move the camera');
  // an open foreground (reflecting water, a lawn) held at BOTH bottom corners needs only half the standing share
  const held = rec.frame.left && rec.frame.right, needObj = held ? L.nearObject / 2 : L.nearObject;
  const nearMin = Math.min(L.near, B.near || L.near);
  if (rec.near.dressed < nearMin || rec.near.object < needObj) P('emptyForeground', `the near band is ${pct(rec.near.dressed)} dressed and ${pct(rec.near.object)} of it has something standing (min ${pct(nearMin)} and ${pct(needObj)}${held ? ', held at both corners' : ''})`, 'the framing foreground and the near dressing (C3, N2)');
  if (rec.layerCount < L.layers) P('fewLayers', `${rec.layerCount} depth layers carry content (min ${L.layers}): ${rec.layers.map((v, i) => ['0-6', '6-15', '15-40', '40-120', '120-400', 'backdrop'][i] + ' ' + pct(v)).join(', ')}`, 'dress the empty depth bands (near dressing, mid trees, far trees, the backdrop)');
  if (!rec.frame.top && !rec.frame.left && !rec.frame.right) P('noFraming', 'nothing frames the view: no bough or crown at a top corner, nothing at a side of the near band', 'the framing foreground (C3): a bough with its trunk outside the frame, reeds, a shrub, a lamp, a railing');
  if (rec.variety.all < L.variety || (rec.variety.mid < L.varietyMid && !(rec.variety.midWater >= 0.5))) P('lowVariety', `${rec.variety.all} distinct objects in the frame, ${rec.variety.mid} in the middle distance (min ${L.variety} and ${L.varietyMid})`, 'more of the kit (variety pools, P7)');
  const K0 = o.kit ? (typeof o.kit === 'string' && typeof worldKit === 'function' ? worldKit(o.kit) : o.kit) : null;
  if (K0 && (K0.place === 'rural' || K0.place === 'park') && Array.isArray(K0.frame) && K0.frame.some(f => f && f.kind === 'bough') && !rec.frame.hang) P('noBough', 'a natural view with no bough or fronds reaching in from a top corner (the gold frame: proof Fleet Pond)', 'the framing foreground (C3): the kit bough with its trunk just outside the frame on the same side');
  if (!(rec.life > 0)) P('noLife', 'no population of people or animals', 'the kit life defaults (N3)');
  const K = o.kit ? (typeof o.kit === 'string' && typeof worldKit === 'function' ? worldKit(o.kit) : o.kit) : null;
  if (K && Array.isArray(K.sky) && (rec.sky < K.sky[0] - L.skySlack || rec.sky > K.sky[1] + L.skySlack)) P('skyShare', `the sky is ${pct(rec.sky)} of the frame (the kit wants ${pct(K.sky[0])}-${pct(K.sky[1])})`, 'move the horizon or the framing', 'warn');
  return out;
}
