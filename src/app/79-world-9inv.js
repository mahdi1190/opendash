/* ============================================================
   WORLD ENGINE (scene format v3): the invariant checker (docs/dev/WORLD_ENGINE.md 16.1, 16.2; requirements section 16).
   Package `tools`, private prefix _wiv. PURE classic script: nothing runs at load except constants, so it runs the same in
   Node (over the life sim, tools/lib/world/adversarial.mjs) and in the browser (on real frames, 79-world-9debug.js).

     WORLD_INVARIANTS                       [{ rule, req, what, needs }]: every per-frame rule of 16.2 and its requirement ids
     worldInvariants(frame, o)              -> [{ rule, req, id, msg }]: the violations of one frame record (16.1). The count must
                                               be zero. o: { world (surfaces, cam, nav, life: what the probes need), prev (the
                                               previous frame; default track.prev), track (worldInvariantTracker(): history for
                                               popping, stuck, grace periods and the static cache), rules (a subset), skip (rules
                                               to leave out), isSpawn(ent) (a spawn cell, door, stop or cover), stats ({} gets
                                               { ran, na, ms })}
     worldInvariantTracker()                -> the history object one run keeps across frames (o.track)
     worldInvariantFrame(world, agents, o)  -> a frame record built from a world and the life sim's agents when the render
                                               package's worldFrameAt is not there (Node tools, the dev overlay). o: { t, ctx, cam,
                                               W, H, cache, born, sun, wind }

   The frame's ctx is the time context of 11.11 as systems' worldTimeCtx gives it (month 0-11, January = 0; sun { az, alt }).
   Rules over the statics alone (habitat, pathBlocked) run once per world when a tracker is given and are replayed after.
   The checker reads only the frame record (and, for the surface probes, o.world): pairs go through the spatial index
   (systems' worldGrid when loaded, a local hash grid otherwise), so nothing is all-pairs. Other packages are reached through
   typeof guards: a missing package makes its rules report n/a (stats.na), never a crash or a false alarm.
   ============================================================ */
const WORLD_INVARIANTS = Object.freeze([
  { rule: 'habitat', req: 'K1, P1', what: 'every entity on its habitat (the whole footprint for floaters; nothing inside a solid)', needs: 'world' },
  { rule: 'overlap', req: 'P2', what: 'solid footprints never intersect (5 cm tolerance)' },
  { rule: 'inSolid', req: 'A2', what: 'no mover inside a solid footprint' },
  { rule: 'personalSpace', req: 'A2, Y4', what: 'no two movers on one layer overlap or pass through each other (a floor of 0.85 x the sum of their body radii)' },
  { rule: 'onWater', req: 'A2', what: 'no walker on water', needs: 'world' },
  { rule: 'floating', req: 'W2', what: 'nothing above or through the ground, the water or its deck' },
  { rule: 'orphan', req: 'K4', what: 'every attached class (bough, frond, lead, mooring line, smoke, window light) has its parent' },
  { rule: 'pathBlocked', req: 'P3', what: 'a 1.2 m walking line stays clear on every walk path', needs: 'world' },
  { rule: 'reflectOutsideWater', req: 'H1, H2', what: 'reflections come from a water surface only', needs: 'world' },
  { rule: 'shadowOnWater', req: 'L2', what: 'no cast shadow falls on water (the mirror dims instead)', needs: 'world' },
  { rule: 'shadowDir', req: 'L2', what: 'one shadow direction for the whole scene' },
  { rule: 'waterGap', req: 'H6', what: 'no gap or transparent pixel in the water', needs: 'pixels' },
  { rule: 'edgeCut', req: 'C1, C2', what: 'nothing over 25 % of the frame cut by an edge unless framing; no half mover at an edge' },
  { rule: 'nearBand', req: 'C2', what: 'no mover inside the near clip band' },
  { rule: 'giant', req: 'A10, K8', what: 'true scale: heights inside the class range, no giant at the lens' },
  { rule: 'popping', req: 'A3', what: 'movers appear and vanish only at frame edges, spawn cells or behind cover', needs: 'prev' },
  { rule: 'stuck', req: 'A4', what: 'no mover without progress for 20 s while it has somewhere to go (its pose does not excuse it)', needs: 'track' },
  { rule: 'slidingFeet', req: 'A6', what: 'stride rate matches speed', needs: 'anim' },
  { rule: 'facing', req: 'A5', what: 'the drawn view matches the velocity (with hysteresis)' },
  { rule: 'laneDir', req: 'A9, K3', what: 'vehicles keep to the left lane for their direction', needs: 'world' },
  { rule: 'animStill', req: 'M1', what: 'nothing plays a moving cycle while still', needs: 'anim' },
  { rule: 'stillMoving', req: 'M1', what: 'nothing slides along in an idle pose', needs: 'anim' },
  { rule: 'staticAnim', req: 'M2', what: 'statics never animate (sway only by wind, for plants)' },
  { rule: 'clones', req: 'M4', what: 'no two neighbours of a kind animate in step', needs: 'anim' },
  { rule: 'windDir', req: 'M3, S3', what: 'everything sways with the one wind', needs: 'wind' },
  { rule: 'order', req: 'R1, R2', what: 'for every overlapping pair, the nearer is drawn later' },
  { rule: 'landmark', req: 'C4', what: 'each landmark shows at least 60 % of its face' },
  { rule: 'bare', req: 'C6', what: 'no bare region over 15 % of the frame (sky excluded)', needs: 'world' },
  { rule: 'season', req: 'S1, V3, V7', what: 'state matches the date: no green trees in January, lit windows at noon, shadows at night or snow in July', needs: 'ctx' },
]);

/* ---------- small maths ---------- */
const _WIV_DEG = 180 / Math.PI;
const _wivNum = v => typeof v === 'number' && Number.isFinite(v);
const _wivR = v => Math.round(v * 100) / 100;
function _wivAngDiff(a, b) { const d = Math.abs(((a - b) % 360 + 540) % 360 - 180); return d; }
function _wivBox(e) {
  const b = e && e.box;
  if (!b) return null;
  if (Array.isArray(b)) return b.length >= 4 && b.every(_wivNum) ? b : null;
  if (_wivNum(b.x0)) return [b.x0, b.y0, b.x1, b.y1];
  return null;
}
function _wivInPoly(P, x, z) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const a = P[i], b = P[j];
    if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
function _wivSegDist(x, z, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L)) : 0;
  return Math.hypot(x - a[0] - t * dx, z - a[1] - t * dz);
}
/** Distance from a point to a polygon's boundary, negative inside. */
function _wivPolyDist(P, x, z) {
  let d = Infinity;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) d = Math.min(d, _wivSegDist(x, z, P[j], P[i]));
  return _wivInPoly(P, x, z) ? -d : d;
}
/** Penetration depth of two convex polygons (separating axes), 0 when apart. */
function _wivPen(A, B) {
  let best = Infinity;
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], nx = -(b[1] - a[1]), nz = b[0] - a[0], L = Math.hypot(nx, nz);
    if (!L) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (const q of A) { const v = (q[0] * nx + q[1] * nz) / L; if (v < a0) a0 = v; if (v > a1) a1 = v; }
    for (const q of B) { const v = (q[0] * nx + q[1] * nz) / L; if (v < b0) b0 = v; if (v > b1) b1 = v; }
    const ov = Math.min(a1, b1) - Math.max(a0, b0);
    if (ov <= 0) return 0;
    if (ov < best) best = ov;
  }
  return best === Infinity ? 0 : best;
}
function _wivFootOf(e) { return Array.isArray(e.foot) && e.foot.length >= 3 ? e.foot : null; }
function _wivRadiusOf(e) {
  const f = _wivFootOf(e);
  if (!f) return Math.max(0.2, Number(e.r) || 0.25);
  let r = 0; for (const p of f) r = Math.max(r, Math.hypot(p[0] - e.x, p[1] - e.z));
  return r;
}
function _wivBoxOverlap(a, b) { return Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1])); }

/* ---------- the spatial index (G3): systems' worldGrid when it is there, else a local hash grid ---------- */
function _wivLocalGrid(cell) {
  const m = new Map(), K = (i, j) => i * 73856093 ^ j * 19349663, pos = new Map();
  const cells = (x, z, r) => { const out = []; const i0 = Math.floor((x - r) / cell), i1 = Math.floor((x + r) / cell), j0 = Math.floor((z - r) / cell), j1 = Math.floor((z + r) / cell); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push(K(i, j)); return out; };
  return {
    local: true,
    add(id, x, z, r) { const ks = cells(x, z, r || 0); pos.set(id, ks); for (const k of ks) { let l = m.get(k); if (!l) m.set(k, l = []); l.push(id); } },
    remove(id) { const ks = pos.get(id); if (!ks) return; for (const k of ks) { const l = m.get(k); if (l) { const i = l.indexOf(id); if (i >= 0) l.splice(i, 1); } } pos.delete(id); },
    move(id, x, z, r) { this.remove(id); this.add(id, x, z, r); },
    query(x, z, r, fn) { const seen = new Set(); for (const k of cells(x, z, r || 0)) { const l = m.get(k); if (l) for (const id of l) if (!seen.has(id)) { seen.add(id); fn(id); } } },
  };
}
function _wivGrid(cell) {
  if (typeof worldGrid === 'function') {
    try { const g = worldGrid(cell); if (g && typeof g.add === 'function' && typeof g.query === 'function') return g; } catch (e) { /* the local grid */ }
  }
  return _wivLocalGrid(cell);
}
/** Candidate ids near (x, z) within r: the grid's ids, deduplicated (the exact test is the caller's). */
function _wivNear(g, x, z, r) {
  const out = [], seen = new Set();
  try { g.query(x, z, r, (id) => { const k = id && typeof id === 'object' && id.id != null ? id.id : id; if (!seen.has(k)) { seen.add(k); out.push(k); } }); } catch (e) { /* none */ }
  return out;
}

/* ---------- knowledge (typeof guards) ---------- */
function _wivInfo(obj) { try { return typeof worldObjectInfo === 'function' && obj ? worldObjectInfo(obj) : null; } catch (e) { return null; } }
function _wivKb(obj) { try { return typeof worldKb === 'function' && obj ? worldKb(obj) : null; } catch (e) { return null; } }
function _wivSurfaceAt(C, x, z) {
  const w = C.world;
  if (w && typeof worldSurfaceAt === 'function') { try { return worldSurfaceAt(w, x, z); } catch (e) { /* the local lookup */ } }
  const S = C.surfaces;
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    // a path surface is the polygon the world draws and clips by (look's _wlSurfPoly: mitred joints), not a round-jointed band: a bend of a stream is where the water is
    const P = Array.isArray(s.poly) && s.poly.length >= 3 ? s.poly : Array.isArray(s.path) && s.width > 0 && typeof _wlSurfPoly === 'function' ? _wivPathPoly(s) : null;
    if (P ? _wivInPoly(P, x, z) : Array.isArray(s.path) && s.width > 0 ? _wivLineDist(s.path, x, z) <= s.width / 2 : false) return s;
  }
  return null;
}
function _wivLineDist(path, x, z) { let d = Infinity; for (let i = 1; i < path.length; i++) d = Math.min(d, _wivSegDist(x, z, path[i - 1], path[i])); return d; }
/** The authored surface under a ground point (later surfaces win), ignoring decks and the water cut of solids: a boat's own
 *  footprint must not hide the water it floats on. */
const _wivPathMemo = new WeakMap();
function _wivPathPoly(s) { let P = _wivPathMemo.get(s); if (!P) { try { P = _wlSurfPoly(s); } catch (e) { P = null; } if (!Array.isArray(P) || P.length < 3) P = false; _wivPathMemo.set(s, P); } return P || null; }
function _wivSurfRaw(C, x, z) {
  const S = C.surfaces;
  for (let i = S.length - 1; i >= 0; i--) {
    const s = S[i];
    if (Array.isArray(s.poly) && s.poly.length >= 3 ? _wivInPoly(s.poly, x, z) : Array.isArray(s.path) && s.width > 0 ? _wivLineDist(s.path, x, z) <= s.width / 2 : false) return s;
  }
  return null;
}
function _wivIsWater(s) { return !!s && s.kind === 'water'; }
/** The open water surface under a point (no deck over it, no hull on it), or null. Decks are listed once per call. */
function _wivWaterAt(C, x, z) {
  const s = _wivSurfRaw(C, x, z);
  if (!_wivIsWater(s)) return null;
  if (!C.decks) C.decks = C.ents.filter(e => e.deck && Array.isArray(e.deck.poly) && e.deck.poly.length >= 3);
  for (const e of C.decks) if (_wivInPoly(e.deck.poly, x, z)) return null;
  return s;
}
function _wivGroundY(C, x, z) {
  // the world's own camera carries the relief (the frame record's copy may not): a hill or a cliff is ground, never 'above the ground'
  const cam = C.world && C.world.cam && C.world.cam.relief ? C.world.cam : C.cam;
  if (cam && typeof sceneGroundHeight === 'function') { try { const h = sceneGroundHeight(cam, x, z); if (_wivNum(h)) return h; } catch (e) { /* flat */ } }
  return 0;
}
function _wivLevel(C, s) {
  if (s && _wivNum(s.level)) return s.level;
  if (typeof worldWaterLevel === 'function' && C.world) { try { const v = worldWaterLevel(C.world, s); if (_wivNum(v)) return v; } catch (e) { /* camera */ } }
  return C.cam && _wivNum(C.cam.water) ? C.cam.water : 0;
}

// classes (or object ids) that hang from a parent (K4); classes that may sway (M3); idle states (A4, M1)
const _WIV_PARENT_CLS = new Set(['bough', 'branch', 'frond', 'lead', 'mooring-line', 'smoke', 'steam', 'washing-line', 'window-light']);
const _WIV_PARENT_RE = /(^|[.-])(bough|branch|fronds?)([.-]|$)/;
const _WIV_PARENT_OF = { bough: ['tree'], branch: ['tree'], frond: ['tree'], lead: ['dog', 'person'], 'mooring-line': ['boat'], smoke: ['building', 'boat', 'landmark'], steam: ['building', 'boat', 'train'], 'washing-line': ['building', 'post', 'fence', 'tree'], 'window-light': ['building', 'landmark'] };
const _WIV_SWAY_CLS = new Set(['tree', 'shrub', 'reed', 'hedge', 'grass', 'flower', 'cover', 'bough', 'branch', 'frond', 'washing-line', 'plant', 'smoke', 'steam', 'air']);
const _WIV_IDLE = new Set(['idle', 'sit', 'lie', 'chat', 'look', 'graze', 'dabble', 'preen', 'perch', 'wait', 'fish', 'feed', 'view', 'moored', 'stopped', 'dive', 'board', 'none', 'still']);
/** States a mover rests in by design (the stuck rule never counts them). */
const _WIV_AT_REST = new Set(['sit', 'lie', 'wait', 'fish', 'feed', 'graze', 'perch', 'moored', 'stopped', 'board', 'view', 'dive']);
const _WIV_MOVE_ANIM = new Set(['move', 'walk', 'run', 'swim', 'fly', 'drive', 'pedal']);
const _WIV_STILL_ANIM = new Set(['idle', 'sit', 'lie', 'none', 'stopped', 'moored', 'still']);
const _WIV_OPAQUE = new Set(['building', 'landmark', 'structure', 'tree', 'hedge', 'fence', 'wall', 'boat', 'vehicle', 'train', 'tram', 'rock']);
const _WIV_GROUND_COVER = new Set(['shrub', 'reed', 'cover', 'flower', 'grass', 'plant', 'lily', 'fish-ring']);
const _WIV_FRAMERS = new Set(['tree', 'hedge', 'fence', 'wall', 'bough', 'branch', 'frond', 'shrub', 'reed', 'cover']);
const _WIV_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const _WIV_EVERGREEN = /pine|fir\b|yew|holly|conifer|spruce|cedar|palm|ivy|laurel|box-|-box|scots|cypress|juniper/;
// K8 fallback ranges (metres; the kb's worldKb(obj).size.h wins when it is loaded)
const _WIV_SIZE = { person: [0.9, 2.0], cyclist: [1.3, 2.1], dog: [0.25, 0.75], duck: [0.22, 0.5], coot: [0.2, 0.45], grebe: [0.22, 0.55], swan: [0.45, 1.3],
  goose: [0.4, 1.0], heron: [0.75, 1.1], gull: [0.25, 0.7], bird: [0.06, 0.7], kingfisher: [0.1, 0.25], grazer: [0.5, 1.8], animal: [0.1, 1.2], fish: [0.05, 0.6],
  vehicle: [1.0, 4.8], boat: [0.6, 4], train: [2.6, 4.6], tram: [2.6, 4.6] };

/* ---------- the context of one call ---------- */
function _wivContext(frame, o) {
  const ents = Array.isArray(frame && frame.ents) ? frame.ents.filter(e => e && e.id != null) : [];
  const world = o.world || null, track = o.track || null;
  const C = { frame, o, world, track, ents, byId: new Map(), cam: frame.cam || (world && world.cam) || null,
    W: _wivNum(frame.W) ? frame.W : 1600, H: _wivNum(frame.H) ? frame.H : 900, t: _wivNum(frame.t) ? frame.t : 0,
    surfaces: Array.isArray(frame.surfaces) ? frame.surfaces : (world && Array.isArray(world.surfaces) ? world.surfaces : []),
    out: [], na: new Set(), ran: new Set() };
  for (const e of ents) C.byId.set(e.id, e);
  C.statics = ents.filter(e => e.static !== false);
  C.movers = ents.filter(e => e.static === false);
  C.solids = null; C.screen = null;
  return C;
}
function _wivPush(C, rule, id, msg) {
  const d = WORLD_INVARIANTS.find(r => r.rule === rule);
  C.out.push({ rule, req: d ? d.req : '', id: id == null ? null : String(id), msg });
}
function _wivSolidity(e) {
  if (e.solidity) return e.solidity;
  const i = _wivInfo(e.obj);
  return i ? i.solidity : 'passable';
}
function _wivCls(e) { if (e.cls) return e.cls; const i = _wivInfo(e.obj); return i ? i.cls : null; }
/** The solid statics in a grid (built once per call). */
function _wivSolids(C) {
  if (C.solids) return C.solids;
  const g = _wivGrid(4), list = new Map();
  for (const e of C.ents) {
    if (e.static === false && !/^(vehicle|train|tram|boat)$/.test(_wivCls(e) || '')) continue;
    const s = _wivSolidity(e), f = _wivFootOf(e);
    if (s !== 'solid' || !f || e.backdrop) continue;
    list.set(e.id, e);
    g.add(e.id, e.x, e.z, _wivRadiusOf(e));
  }
  C.solids = { g, list };
  return C.solids;
}
/** Every on-screen box in a screen grid (built once per call; boxes clipped to the frame plus a margin). */
function _wivScreen(C) {
  if (C.screen) return C.screen;
  const g = _wivLocalGrid(128), by = new Map(), M = 64;
  for (const e of C.ents) {
    const b = _wivBox(e);
    if (!b || b[2] < -M || b[0] > C.W + M || b[3] < -M || b[1] > C.H + M) continue;
    const c = [Math.max(-M, b[0]), Math.max(-M, b[1]), Math.min(C.W + M, b[2]), Math.min(C.H + M, b[3])];
    by.set(e.id, e);
    g.add(e.id, (c[0] + c[2]) / 2, (c[1] + c[3]) / 2, Math.hypot(c[2] - c[0], c[3] - c[1]) / 2);
  }
  C.screen = { g, by };
  return C.screen;
}
/** The entities whose screen box overlaps box b (exact test). */
function _wivOnScreen(C, b) {
  const S = _wivScreen(C), M = 64, c = [Math.max(-M, b[0]), Math.max(-M, b[1]), Math.min(C.W + M, b[2]), Math.min(C.H + M, b[3])];
  if (c[0] > c[2] || c[1] > c[3]) return [];
  const out = [];
  for (const id of _wivNear(S.g, (c[0] + c[2]) / 2, (c[1] + c[3]) / 2, Math.hypot(c[2] - c[0], c[3] - c[1]) / 2)) { const e = S.by.get(id); if (e && _wivBoxOverlap(_wivBox(e), b) > 0) out.push(e); }
  return out;
}
const _wivHostOf = (e) => e.host != null ? e.host : (typeof e.attach === 'string' && e.attach.indexOf(':') > 0 ? e.attach.slice(e.attach.indexOf(':') + 1) : null);
const _wivRelated = (a, b) => _wivHostOf(a) === b.id || _wivHostOf(b) === a.id || a.parent === b.id || b.parent === a.id;

/* ---------- the rules ---------- */
const _WIV_RULES = {
  habitat(C) {
    if (!C.surfaces.length && !C.world) return 'na';
    const sol = _wivSolids(C);
    for (const e of C.statics) {
      if (e.backdrop || e.auto === 'backdrop') continue;
      // an extruded line piece (coping, kerb, railing, wall, hedge) runs along an edge by construction: only one lying wholly
      // in the water is off its habitat (its centroid may fall over the water on a curving bank)
      if (e.prim === 'line') {
        const f = _wivFootOf(e);
        if (f && f.length && f.every(p => _wivIsWater(_wivSurfRaw(C, p[0], p[1])))) _wivPush(C, 'habitat', e.id, `${e.obj} (a line) lies wholly in the water`);
        continue;
      }
      const cls = _wivCls(e), info = _wivInfo(e.obj), host = _wivHostOf(e), att = String(e.attach || (info && info.attachOk && info.attachOk[0]) || 'ground');
      if (att.startsWith('air') || att.startsWith('wall') || att.startsWith('perch') || att.startsWith('lead')) continue;
      if (att.startsWith('deck')) {
        const h = C.byId.get(host);
        if (h && !h.deck && !(h.solidity === 'walkable')) _wivPush(C, 'habitat', e.id, `${e.obj} stands on ${host}, which has no deck (a duck on a roof)`);
        continue;
      }
      const kb = _wivKb(e.obj);
      // the knowledge base judges when it is loaded (kb's habitat tags over sense's probe); a probe that throws falls back
      let judged = false;
      if (kb && kb.habitat && typeof worldKbHabitatOk === 'function' && typeof worldPlaceProbe === 'function' && C.world) {
        let ok = true, why = '';
        try {
          const pts = (kb.floats || att === 'water') && _wivFootOf(e) ? _wivFootOf(e) : [[e.x, e.z]];
          for (const p of pts) { const r = worldKbHabitatOk(kb, worldPlaceProbe(C.world, p[0], p[1])); if (r === false || (r && r.ok === false)) { ok = false; why = r && r.reason ? r.reason : ''; break; } }
          judged = true;
        } catch (err) { judged = false; }
        if (judged && !ok) { _wivPush(C, 'habitat', e.id, `${e.obj} is off its habitat (${(kb.habitat.on || []).join(', ')})${why ? ': ' + why : ''}`); continue; }
      }
      if (!judged) {
        const s = _wivSurfRaw(C, e.x, e.z), okW = !!(info && info.attachOk && info.attachOk.includes('water'));
        if ((att === 'water' && info && info.floats) || (info && info.floats && _wivIsWater(s))) {
          const f = _wivFootOf(e) || [[e.x, e.z]];
          const off = f.filter(p => !_wivIsWater(_wivSurfRaw(C, p[0], p[1])));
          if (off.length) { _wivPush(C, 'habitat', e.id, `${e.obj} floats but ${off.length} of ${f.length} footprint corners are on land (${(_wivSurfRaw(C, off[0][0], off[0][1]) || {}).kind || 'nothing'})`); continue; }
        } else if (att === 'water' && !_wivIsWater(s) && !okW) { _wivPush(C, 'habitat', e.id, `${e.obj} is attached to water but stands on ${s ? s.kind : 'nothing'}`); continue; }
        else if (_wivIsWater(s) && !okW && cls !== 'walkway') { _wivPush(C, 'habitat', e.id, `${e.obj} (${cls}) stands in the water`); continue; }
        if ((cls === 'train' || cls === 'tram') && !(s && (s.kind === 'rail' || s.kind === 'tram'))) { _wivPush(C, 'habitat', e.id, `${e.obj} is off its rails (on ${s ? s.kind : 'nothing'})`); continue; }
        if (cls === 'vehicle' && s && !/^(road|crossing|plaza|pavement|path)$/.test(s.kind) && !e.parked) { _wivPush(C, 'habitat', e.id, `${e.obj} stands on ${s.kind}, not a road`); continue; }
      }
      // nothing passable stands inside a solid (a duck in a wall, a person in a hedge); ground cover may grow under one
      if (_wivSolidity(e) !== 'solid' && !_WIV_GROUND_COVER.has(cls) && !/^(plant|ground|flower|water)\./.test(String(e.obj))) {
        for (const id of _wivNear(sol.g, e.x, e.z, 0.01)) {
          const s = sol.list.get(id);
          if (!s || s === e || _wivRelated(e, s)) continue;
          if (_wivPolyDist(s.foot, e.x, e.z) < -0.1) { _wivPush(C, 'habitat', e.id, `${e.obj} stands inside ${s.obj} (${s.id})`); break; }
        }
      }
    }
  },
  overlap(C) {
    const sol = _wivSolids(C), seen = new Set();
    for (const a of sol.list.values()) {
      for (const id of _wivNear(sol.g, a.x, a.z, _wivRadiusOf(a))) {
        if (id === a.id) continue;
        const b = sol.list.get(id);
        if (!b || _wivRelated(a, b)) continue;
        if (_wivCls(a) === 'hedge' && _wivCls(b) === 'hedge') continue;   // hedge clumps merge into one hedge
        if (a.line != null && a.line === b.line) continue;                 // pieces of one line feature (Q2)
        const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
        if (seen.has(k)) continue;
        seen.add(k);
        const p = _wivPen(a.foot, b.foot);
        if (p > 0.05) _wivPush(C, 'overlap', a.id, `${a.obj} (${a.id}) and ${b.obj} (${b.id}) overlap by ${_wivR(p)} m`);
      }
    }
  },
  inSolid(C) {
    const sol = _wivSolids(C);
    for (const m of C.movers) {
      if (m.layer === 'air' || m.layer === 'rail' || _wivHostOf(m)) continue;
      for (const id of _wivNear(sol.g, m.x, m.z, 0.01)) {
        const s = sol.list.get(id);
        if (!s || s === m || _wivRelated(m, s) || s.static === false) continue;
        const d = _wivPolyDist(s.foot, m.x, m.z);
        if (d < -0.1) { _wivPush(C, 'inSolid', m.id, `${m.obj || m.cls} is ${_wivR(-d)} m inside ${s.obj} (${s.id})`); break; }
      }
    }
  },
  onWater(C) {
    if (!C.surfaces.length && !C.world) return 'na';
    for (const m of C.movers) {
      const cls = _wivCls(m);
      const walker = m.layer === 'walk' || m.layer === 'drive' || ((cls === 'person' || cls === 'dog' || cls === 'vehicle' || cls === 'cyclist') && m.layer !== 'swim' && m.layer !== 'wade');
      if (!walker || _wivHostOf(m)) continue;
      const s = _wivSurfaceAt(C, m.x, m.z);
      // a body has width: feet within 0.2 m of a deck or a bank are standing on it (the walk grid is 0.5 m cells)
      if (_wivIsWater(s) && [[0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2]].some(d => { const q = _wivSurfaceAt(C, m.x + d[0], m.z + d[1]); return q && !_wivIsWater(q); })) continue;
      if (_wivIsWater(s)) _wivPush(C, 'onWater', m.id, `${m.obj || cls} walks on the water (${s.id})`);
    }
  },
  floating(C) {
    for (const e of C.ents) {
      if (!_wivNum(e.y) || e.backdrop) continue;
      if (/^line./.test(String(e.obj || ''))) continue;                         // extruded lines, buildings and terrain follow the ground by construction (4extrude, 4terrain)
      const cls = _wivCls(e), att = String(e.attach || ''), host = _wivHostOf(e);
      if (e.layer === 'air' || att.startsWith('air') || att.startsWith('wall') || att.startsWith('perch') || att.startsWith('lead') || cls === 'bird-air' || cls === 'air') continue;
      if (e.state === 'fly' || e.state === 'perch' || e.state === 'dive') continue;
      // things that hang from a parent (boughs, fronds, leads, lines, smoke) are judged by orphan, not by the ground
      if (e.parent != null || _WIV_PARENT_CLS.has(cls || '') || _WIV_PARENT_RE.test(String(e.obj || '')) || (_wivKb(e.obj) || {}).parent) continue;
      if (host) {
        const h = C.byId.get(host);
        if (h && h.deck && _wivNum(h.deck.y) && Math.abs(e.y - h.deck.y) > 0.08 && e.static !== false) _wivPush(C, 'floating', e.id, `${e.obj} is at y ${_wivR(e.y)} on a deck at ${_wivR(h.deck.y)}`);
        continue;
      }
      const info = _wivInfo(e.obj), raw = _wivSurfRaw(C, e.x, e.z), g = _wivGroundY(C, e.x, e.z);
      const lvl = _wivNum(e.waterline) ? e.waterline : _wivLevel(C, _wivIsWater(raw) ? raw : null), sink = info && info.floats ? (info.sink || 0) : 0;
      let wants, what;
      if (e.layer === 'swim' || e.layer === 'wade' || att === 'water') {
        // a floater's base is the level less its sink (statics); the life sim may give the waterline and leave the sink to the draw
        wants = sink ? (e.static === false ? [lvl - sink, lvl] : [lvl - sink]) : [lvl]; what = 'the water';
      } else if (_wivIsWater(raw) || _wivNum(e.waterline)) { wants = [lvl, lvl - sink, g]; what = 'the water'; }
      else {
        // movers stand on decks; statics under a deck stand on the ground. A mover is judged at its own level (a walker on the
        // towpath under a bridge stands on the ground, not on the deck above it): the surface at or below its height
        let s = null;
        if (e.static === false) {
          if (C.world && typeof worldSurfaceAt === 'function') { try { s = worldSurfaceAt(C.world, e.x, e.z, { y: e.y }); } catch (err) { s = null; } }
          else s = _wivSurfaceAt(C, e.x, e.z);
        }
        wants = s && _wivNum(s.y) ? [s.y] : [g]; what = s && _wivNum(s.y) ? 'its deck' : 'the ground';
      }
      let best = wants[0];
      for (const w of wants) if (Math.abs(e.y - w) < Math.abs(e.y - best)) best = w;
      if (Math.abs(e.y - best) > 0.08) _wivPush(C, 'floating', e.id, `${e.obj || cls} at y ${_wivR(e.y)}: ${e.y > best ? 'above' : 'through'} ${what} (${_wivR(best)})`);
    }
  },
  orphan(C) {
    for (const e of C.ents) {
      const kb = _wivKb(e.obj), cls = _wivCls(e) || '';
      const need = kb && kb.parent ? kb.parent : (_WIV_PARENT_CLS.has(cls) || _WIV_PARENT_RE.test(String(e.obj || '')) ? { cls: _WIV_PARENT_OF[cls] || _WIV_PARENT_OF[(String(e.obj).match(_WIV_PARENT_RE) || [])[2] === 'fronds' ? 'frond' : (String(e.obj).match(_WIV_PARENT_RE) || [])[2]] || ['tree'] } : null);
      if (!need) continue;
      if (e.parentOff === true) continue;   // the parent stands just outside the frame (sense declared it)
      const p = e.parent != null ? C.byId.get(e.parent) : null;
      if (!p) { _wivPush(C, 'orphan', e.id, `${e.obj} hangs from nothing${e.parent != null ? ` (parent ${e.parent} is not in the frame)` : ''}`); continue; }
      const want = [].concat(need.cls || []);
      const pc = _wivCls(p);
      // a parent of the right kind by class or by library family (a 'tree.*-trunk' is a tree whatever its drawing class)
      const fam = String(p.obj || '').split('.')[0];
      if (want.length && pc && !want.includes(pc) && !want.includes(fam)) _wivPush(C, 'orphan', e.id, `${e.obj}: parent ${p.obj} is a ${pc}, not ${want.join(' or ')}`);
      const reach = _wivNum(need.reach) ? need.reach : 14;
      if (Math.hypot(p.x - e.x, p.z - e.z) > reach + _wivRadiusOf(p)) _wivPush(C, 'orphan', e.id, `${e.obj} is ${_wivR(Math.hypot(p.x - e.x, p.z - e.z))} m from its parent ${p.id} (reach ${reach} m)`);
    }
  },
  pathBlocked(C) {
    if (!C.surfaces.length) return 'na';
    const sol = _wivSolids(C);
    const WALK = /^(path|pavement|towpath|boardwalk|bridge-deck|footpath)$/;
    for (const s of C.surfaces) {
      if (!WALK.test(s.kind) || !Array.isArray(s.path) || !(s.width > 0)) continue;
      const half = Math.min(0.6, s.width / 2), hit = new Set();
      for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1], b = s.path[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / 0.75));
        for (let k = 0; k <= n; k++) {
          const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n;
          for (const id of _wivNear(sol.g, x, z, half)) {
            if (hit.has(id)) continue;
            const e = sol.list.get(id);
            if (!e || e.static === false || e.blocks === true || e.solidity === 'walkable' || e.solidity === 'overhead') continue;
            if (_wivPolyDist(e.foot, x, z) < half - 0.02) { hit.add(id); _wivPush(C, 'pathBlocked', e.id, `${e.obj} stands on the walking line of ${s.id}`); }
          }
        }
      }
    }
  },
  reflectOutsideWater(C) {
    const ids = new Set(C.surfaces.filter(_wivIsWater).map(s => s.id));
    let any = false;
    for (const e of C.ents) {
      if (!e.reflect) continue;
      any = true;
      if (!ids.has(e.reflect.surface)) _wivPush(C, 'reflectOutsideWater', e.id, `${e.obj || e.cls} reflects in '${e.reflect.surface}', which is not water`);
    }
    if (!any && !C.surfaces.length) return 'na';
  },
  shadowOnWater(C) {
    if (!C.surfaces.some(_wivIsWater)) return;
    for (const e of C.ents) {
      const sh = e.shadow;
      if (!sh || !Array.isArray(sh.poly) || sh.poly.length < 3 || sh.kind === 'contact') continue;
      const cut = new Set([].concat(sh.cutWater || [], sh.clip || []));
      const P = sh.poly, pts = P.slice();
      for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; pts.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); }
      pts.push([P.reduce((s, p) => s + p[0], 0) / P.length, P.reduce((s, p) => s + p[1], 0) / P.length]);
      // look cuts the part over water out as holes ({ surface, poly }): a point in a hole is not drawn
      // (a hole is { surface, poly } from worldShadowPlan, or a bare polygon from worldLookOf)
      const holes = Array.isArray(sh.holes) ? sh.holes.map(h => (Array.isArray(h) ? { poly: h } : h)).filter(h => h && Array.isArray(h.poly) && h.poly.length >= 3) : [];
      for (const p of pts) {
        const s = _wivWaterAt(C, p[0], p[1]);
        if (s && holes.some(h => (!h.surface || h.surface === s.id) && (_wivInPoly(h.poly, p[0], p[1]) || _wivPolyDist(h.poly, p[0], p[1]) < 0.02))) continue;
        // a shadow that only touches the water's edge (within 2 cm: look's clip drops slivers that thin) is on the bank
        const sp = s && (Array.isArray(s.poly) && s.poly.length >= 3 ? s.poly : Array.isArray(s.path) && s.width > 0 && typeof _wlSurfPoly === 'function' ? _wivPathPoly(s) : null);   // a stream (a path surface) is the drawn polygon too
        if (s && sp && _wivPolyDist(sp, p[0], p[1]) > -0.02) continue;
        if (s && !cut.has(s.id) && !cut.has('water')) { _wivPush(C, 'shadowOnWater', e.id, `the shadow of ${e.obj || e.cls} falls on ${s.id}`); break; }
      }
    }
  },
  shadowDir(C) {
    const dirs = [];
    for (const e of C.ents) {
      const sh = e.shadow;
      if (!sh || sh.kind === 'contact') continue;
      const d = sh.dir;
      if (Array.isArray(d) && Math.hypot(d[0], d[1]) > 1e-3) dirs.push({ e, a: Math.atan2(d[0], d[1]) * _WIV_DEG, kind: sh.sun || sh.kind || 'sun' });
      else if (_wivNum(d)) dirs.push({ e, a: d, kind: sh.sun || sh.kind || 'sun' });
    }
    const sun = dirs.filter(d => d.kind === 'sun' || d.kind === 'cast');
    if (sun.length < 2) return;
    // the median direction (circular): the angle with the smallest summed difference
    let best = sun[0].a, bestS = Infinity;
    for (const c of sun.slice(0, 40)) { let s = 0; for (const d of sun) s += _wivAngDiff(c.a, d.a); if (s < bestS) { bestS = s; best = c.a; } }
    for (const d of sun) if (_wivAngDiff(d.a, best) > 3) _wivPush(C, 'shadowDir', d.e.id, `the shadow of ${d.e.obj || d.e.cls} points ${Math.round(d.a)} degrees, the scene's ${Math.round(best)}`);
  },
  waterGap(C) {
    const f = C.frame;
    if (_wivNum(f.waterGaps)) { if (f.waterGaps > 0) _wivPush(C, 'waterGap', null, `${f.waterGaps} gap pixel(s) in the water`); return; }
    if (Array.isArray(f.water)) { let any = false; for (const w of f.water) if (w && _wivNum(w.gaps)) { any = true; if (w.gaps > 0) _wivPush(C, 'waterGap', w.id, `${w.gaps} gap pixel(s) in ${w.id}`); } if (any) return; }
    if (typeof C.o.waterProbe === 'function') { const r = C.o.waterProbe(C.frame); if (r && r.gaps > 0) _wivPush(C, 'waterGap', r.id || null, `${r.gaps} gap pixel(s) in the water (${r.where || 'probe'})`); return; }
    return 'na';
  },
  edgeCut(C) {
    const W = C.W, H = C.H, A = W * H;
    for (const e of C.ents) {
      const b = _wivBox(e);
      if (!b || e.backdrop || e.cls === 'terrain' || /^line.terrain/.test(String(e.obj || ''))) continue;      // the ground is not an object: a hill runs off the frame
      const cut = { l: b[0] < -0.5, r: b[2] > W + 0.5, t: b[1] < -0.5, b: b[3] > H + 0.5 };
      if (!(cut.l || cut.r || cut.t || cut.b)) continue;
      const cls = _wivCls(e) || '';
      if (e.static === false) {
        if (e.framed || cls === 'bird-air' || e.layer === 'air') continue;
        if (cut.b) { _wivPush(C, 'edgeCut', e.id, `${e.obj || cls} is cut by the bottom edge (a half mover at the lens)`); continue; }
        const still = !(e.speed > 0.05) && _WIV_IDLE.has(String(e.state || 'idle'));
        if ((cut.l || cut.r) && still && b[2] > 0 && b[0] < W) _wivPush(C, 'edgeCut', e.id, `${e.obj || cls} idles half out of the frame at the ${cut.l ? 'left' : 'right'} edge`);
        continue;
      }
      const vis = Math.max(0, Math.min(W, b[2]) - Math.max(0, b[0])) * Math.max(0, Math.min(H, b[3]) - Math.max(0, b[1]));
      if (vis / A <= 0.25) continue;
      if (e.framing || _WIV_FRAMERS.has(cls)) continue;
      if (cut.t && !cut.l && !cut.r && !cut.b && /^(building|landmark|structure)$/.test(cls)) continue;   // a tall building cut at the top
      _wivPush(C, 'edgeCut', e.id, `${e.obj} fills ${Math.round(vis / A * 100)} % of the frame and is cut by the ${['l', 'r', 't', 'b'].filter(k => cut[k]).map(k => ({ l: 'left', r: 'right', t: 'top', b: 'bottom' })[k]).join(' and ')} edge`);
    }
  },
  nearBand(C) {
    const f = C.cam && _wivNum(C.cam.f) ? C.cam.f : null;
    if (!f) return 'na';
    for (const m of C.movers) {
      if (m.framed || m.layer === 'air') continue;
      const h = _wivNum(m.height) && m.height > 0 ? m.height : _wivNum(m.h) ? m.h : 1.7;
      if (m.z > 0 && m.z < f * h / 405 - 0.01) _wivPush(C, 'nearBand', m.id, `${m.obj || m.cls} at ${_wivR(m.z)} m is inside the near band (${_wivR(f * h / 405)} m for ${_wivR(h)} m)`);
    }
  },
  giant(C) {
    const H = C.H;
    for (const e of C.ents) {
      const cls = _wivCls(e);
      if (!cls || e.backdrop) continue;
      const kb = _wivKb(e.obj), S = kb && kb.size;
      let hr = S && Array.isArray(S.h) ? S.h : _WIV_SIZE[cls];
      // the range of its pose and age (K8): a seated adult is about 1.3 m to the head, a child 1.0-1.4 m
      if (S) {
        const pose = e.pose || (/^(sit|seated)/.test(String(e.state || '')) ? 'sit' : null), age = e.age || null;
        if (age === 'child' && S.child && pose && Array.isArray(S.child[pose])) hr = S.child[pose];
        else if (age === 'child' && S.ages && Array.isArray(S.ages.child) && (!pose || pose === 'stand' || pose === 'walk')) hr = S.ages.child;
        else if (pose && S.poses && Array.isArray(S.poses[pose])) hr = S.poses[pose];
      }
      const h = _wivNum(e.height) ? e.height : _wivNum(e.h) ? e.h : null;
      if (hr && h != null && (h > hr[1] * 1.15 || h < hr[0] / 1.15)) _wivPush(C, 'giant', e.id, `${e.obj || cls} is ${_wivR(h)} m tall; a ${cls} is ${hr[0]}-${hr[1]} m`);
      const b = _wivBox(e);
      if (b && (cls === 'person' || cls === 'dog' || cls === 'cyclist') && !e.framed && (b[3] - b[1]) > 0.45 * H) _wivPush(C, 'giant', e.id, `${e.obj || cls} is drawn ${Math.round((b[3] - b[1]) / H * 100)} % of the frame tall (a giant at the lens)`);
    }
  },
  popping(C) {
    const prev = C.o.prev || (C.track && C.track.prev) || null;
    if (!prev || !Array.isArray(prev.ents)) return 'na';
    const W = C.W, H = C.H, was = new Map();
    for (const e of prev.ents) if (e && e.static === false) was.set(e.id, e);
    const atEdge = (e) => { const b = _wivBox(e); if (!b) return true; return b[0] <= 2 || b[2] >= W - 2 || b[3] >= H - 2 || b[1] <= 0 || b[2] < 0 || b[0] > W || (b[3] - b[1]) < 4; };
    const covered = (e, list) => {
      const b = _wivBox(e); if (!b) return true;
      const area = Math.max(1, (b[2] - b[0]) * (b[3] - b[1]));
      for (const s of list) {
        if (s === e || s.static === false || !_WIV_OPAQUE.has(_wivCls(s) || '')) continue;
        const sb = _wivBox(s); if (!sb) continue;
        if (_wivBoxOverlap(b, sb) / area > 0.85 && (!_wivNum(s.order) || !_wivNum(e.order) || s.order > e.order)) return true;
      }
      return false;
    };
    // a newcomer may have walked on from its spawn cell since the last frame (sparse checks: 1 Hz in the matrix): try its track back
    const dtp = _wivNum(prev.t) && _wivNum(C.t) ? Math.max(0, C.t - prev.t) : 0;
    const spawnOk = (e) => {
      if (typeof C.o.isSpawn !== 'function') return false;
      if (C.o.isSpawn(e)) return true;
      if (!(dtp > 0.25) || !_wivNum(e.vx) || !_wivNum(e.vz)) return false;
      for (let k = 1; k <= 4; k++) { const f = dtp * k / 4; if (C.o.isSpawn(Object.assign({}, e, { x: e.x - e.vx * f, z: e.z - e.vz * f }))) return true; }
      return false;
    };
    // ... and one that left may have gone on to its exit (a lane end, a door) and faded there since the last frame
    const exitOk = (e) => {
      if (typeof C.o.isSpawn !== 'function' || !(dtp > 0.25) || !_wivNum(e.vx) || !_wivNum(e.vz)) return false;
      for (let k = 1; k <= 4; k++) { const f = dtp * k / 4; if (C.o.isSpawn(Object.assign({}, e, { x: e.x + e.vx * f, z: e.z + e.vz * f }))) return true; }
      return false;
    };
    for (const m of C.movers) {
      if (was.has(m.id) || m.layer === 'air' || _wivHostOf(m)) continue;
      // a mover still fading in (life's visible spawn, A3) has not popped: it is appearing
      if (_wivNum(m.alpha) && m.alpha < 0.95) continue;
      if (atEdge(m) || spawnOk(m) || covered(m, C.statics)) continue;
      _wivPush(C, 'popping', m.id, `${m.obj || m.cls} appeared mid-frame at (${_wivR(m.x)}, ${_wivR(m.z)})`);
    }
    for (const [id, m] of was) {
      if (C.byId.has(id) || m.layer === 'air' || _wivHostOf(m)) continue;
      if (_wivNum(m.alpha) && m.alpha < 0.95) continue;   // faded out before it left
      if (atEdge(m) || spawnOk(m) || exitOk(m) || covered(m, prev.ents)) continue;
      _wivPush(C, 'popping', id, `${m.obj || m.cls} vanished mid-frame at (${_wivR(m.x)}, ${_wivR(m.z)})`);
    }
  },
  personalSpace(C) {
    const M = C.movers.filter(m => m.layer && m.layer !== 'air' && m.layer !== 'rail' && m.layer !== 'drive' && !/^(boat|vehicle|train|tram)$/.test(_wivCls(m) || '') && !_wivHostOf(m) && !(_wivNum(m.alpha) && m.alpha < 0.5));
    if (M.length < 2) return;
    const g = _wivGrid(2), by = new Map(), was = new Map(), prev = C.o.prev || (C.track && C.track.prev) || null;
    for (const m of M) { by.set(m.id, m); g.add(m.id, m.x, m.z, 1); }
    if (prev && Array.isArray(prev.ents)) for (const e of prev.ents) if (e && e.static === false) was.set(e.id, e);
    const rad = (e) => (_wivNum(e.r) && e.r > 0 ? e.r : _wivRadiusOf(e));
    for (const a of M) for (const id of _wivNear(g, a.x, a.z, 1.2)) {
      const b = by.get(id);
      if (!b || b === a || String(b.id) < String(a.id) || b.layer !== a.layer) continue;
      const rel = (a.group != null && (a.group === b.id || a.group === b.group)) || (b.group != null && b.group === a.id) || a.leader === b.id || b.leader === a.id || (a.leader != null && a.leader === b.leader);
      // a floor of 85 % of the bodies; a group (a walker and its dog) 27 %, never on the same spot; two passing in a lane a body wide (life's squeeze: they turn sideways and pass through each other for a step) are left to life
      if (!rel && (a.squeeze || b.squeeze)) continue;   // a lane a body wide: they turn sideways and pass through each other for a step (life says so)
      const minD = (rad(a) + rad(b)) * (rel ? 0.27 : 0.85), d = Math.hypot(a.x - b.x, a.z - b.z);
      if (d < minD) { _wivPush(C, 'personalSpace', a.id, `${a.obj || a.cls} (${a.id}) and ${b.obj || b.cls} (${b.id}) are ${_wivR(d)} m apart; their bodies need ${_wivR(minD)} m`); continue; }
      // passed through between two frames: the closest approach of their straight tracks over the interval
      const pa = was.get(a.id), pb = was.get(b.id);
      if (!rel && pa && pb && pa.layer === a.layer && pb.layer === b.layer) {
        const r0x = pb.x - pa.x, r0z = pb.z - pa.z, r1x = b.x - a.x, r1z = b.z - a.z, dx = r1x - r0x, dz = r1z - r0z, L2 = dx * dx + dz * dz;
        const s = L2 > 1e-9 ? Math.max(0, Math.min(1, -(r0x * dx + r0z * dz) / L2)) : 0, md = Math.hypot(r0x + dx * s, r0z + dz * s);
        if (md < minD * 0.7 && Math.hypot(r0x, r0z) >= minD) _wivPush(C, 'personalSpace', a.id, `${a.obj || a.cls} (${a.id}) walked through ${b.obj || b.cls} (${b.id}) (${_wivR(md)} m at the closest, bodies ${_wivR(minD)} m)`);
      }
    }
  },
  stuck(C) {
    const T = C.track;
    if (!T) return 'na';
    for (const m of C.movers) {
      let h = T.ids.get(m.id);
      if (!h) { h = { x: m.x, z: m.z, prog: C.t, mov: null, flagged: false }; T.ids.set(m.id, h); }
      // a mover with somewhere to go has 20 s (its pose does not excuse it: an idle pose IS what being stuck looks like); one
      // without is a statue only after 90 s. Seated, queuing, fishing, grazing, moored, aboard and airborne movers are at rest by design.
      const st = String(m.state || ''), travel = m.intent === 'travel', lim = travel ? 20 : m.cls === 'heron' || m.resident ? 400 : 90;   // a heron stands for minutes; a resident (an angler, a boater at its boat) lives where it is placed
      const rest = m.layer === 'air' || m.layer === 'rail' || !!_wivHostOf(m) || _WIV_AT_REST.has(st);
      if (rest || Math.hypot(m.x - h.x, m.z - h.z) > 0.5) { h.x = m.x; h.z = m.z; h.prog = C.t; h.tv = null; h.flagged = false; continue; }
      // the 20 s run on the move starts when the wish to travel starts (an idle goal before it is a legitimate pause)
      if (travel) { if (h.tv == null) h.tv = C.t; } else h.tv = null;
      const since = travel ? Math.max(0, C.t - Math.max(h.prog, h.tv)) : C.t - h.prog;
      if (since > lim && !h.flagged) { h.flagged = true; _wivPush(C, 'stuck', m.id, `${m.obj || m.cls} (${st || 'moving'}${travel ? ', with somewhere to go' : ''}) has made no progress for ${Math.round(since)} s at (${_wivR(m.x)}, ${_wivR(m.z)})`); }
    }
  },
  slidingFeet(C) {
    let any = false;
    for (const m of C.movers) {
      const a = m.anim;
      if (!a || !_wivNum(m.speed) || m.layer === 'air' || m.layer === 'rail') continue;
      // the ground speeds of the last second: the animation system reads the world a tick (or a lower-rate LOD step) behind the
      // record, so the feet are judged against the range the mover has really covered over the last 0.8 s, not one instant
      const T = C.track, h = T ? (T.anim.get(m.id) || T.anim.set(m.id, { mov: -1e9, still: -1e9 }).get(m.id)) : null;
      let lo = m.speed, hi = m.speed;
      if (h) {
        const H = h.hist || (h.hist = []);
        if (!H.length || H[H.length - 1][0] !== C.t) H.push([C.t, m.speed]);
        while (H.length > 1 && C.t - H[0][0] > 0.8) H.shift();
        for (const q of H) { lo = Math.min(lo, q[1]); hi = Math.max(hi, q[1]); }
      }
      if (hi < 0.15) continue;
      any = true;
      if (!_WIV_MOVE_ANIM.has(String(a.state)) || !(a.rate > 0)) continue;   // stillMoving reports these
      const kb = _wivKb(m.obj), stride = _wivNum(a.stride) && a.stride > 0 ? a.stride : kb && kb.anim && _wivNum(kb.anim.stride) ? kb.anim.stride : null;
      if (!stride) continue;
      const feet = a.rate * stride;          // the ground speed the feet pace out
      if (feet < lo * 0.6 - 0.1 || feet > hi * 1.5 + 0.1) _wivPush(C, 'slidingFeet', m.id, `${m.obj || m.cls} steps at ${_wivR(a.rate)} Hz over a ${_wivR(stride)} m stride (${_wivR(feet)} m/s of feet) on ground moving ${_wivR(lo)}-${_wivR(hi)} m/s`);
    }
    if (!any && !C.movers.some(m => m.anim)) return 'na';
  },
  facing(C) {
    const V = ['back', 'q-back', 'side', 'q-front', 'front'];
    for (const m of C.movers) {
      if (!_wivNum(m.vx) || !_wivNum(m.vz) || m.view == null) continue;
      const sp = Math.hypot(m.vx, m.vz);
      if (sp < 0.25 || m.state === 'turn') continue;
      const hx = m.vx / sp, hz = m.vz / sp, rl = Math.hypot(m.x, m.z) || 1, rx = m.x / rl, rz = m.z / rl;
      const ang = Math.atan2(-(rx * hz - rz * hx), rx * hx + rz * hz) * _WIV_DEG, abs = Math.abs(ang);
      const b = V.indexOf(m.view);
      if (b < 0) continue;
      if (m.view !== 'side' || m.sideOnly === false) {
        // an object that has no drawing of the wanted view shows its nearest drawn one (appearance's worldViewOf says so)
        let nearestDrawn = false;
        if (Math.abs(abs - b * 45) > 22.5 + 15 + 5 && typeof worldViewOf === 'function' && m.obj) {
          try { const v = worldViewOf({ obj: m.obj, x: m.x, z: m.z, facing: Math.atan2(m.vx, m.vz) * _WIV_DEG }, null, { prev: m.view }); nearestDrawn = !!(v && v.missing && v.view === m.view); } catch (e) { nearestDrawn = false; }
        }
        if (!nearestDrawn && Math.abs(abs - b * 45) > 22.5 + 15 + 5 && !(m.view === 'side' && m.sideOnly)) _wivPush(C, 'facing', m.id, `${m.obj || m.cls} shows its ${m.view} moving ${Math.round(abs)} degrees off the line of sight`);
      }
      // front and back views are drawn unmirrored (they are symmetric): only the side and three-quarter views carry a mirror
      if (m.view !== 'front' && m.view !== 'back' && abs > 20 && abs < 160 && typeof m.mirror === 'boolean' && m.mirror !== (ang < 0)) _wivPush(C, 'facing', m.id, `${m.obj || m.cls} faces ${m.mirror ? 'left' : 'right'} but moves ${ang < 0 ? 'left' : 'right'}`);
    }
  },
  laneDir(C) {
    if (!C.surfaces.length) return 'na';
    const roads = C.surfaces.filter(s => s.kind === 'road' && Array.isArray(s.path) && s.path.length >= 2 && !s.oneway);
    if (!roads.length) return;
    const check = (e, dx, dz, what) => {
      let best = null;
      for (const s of roads) for (let i = 1; i < s.path.length; i++) {
        const a = s.path[i - 1], b = s.path[i], d = _wivSegDist(e.x, e.z, a, b);
        if (d <= s.width / 2 + 0.5 && (!best || d < best.d)) best = { d, a, b, s };
      }
      if (!best) return;
      let tx = best.b[0] - best.a[0], tz = best.b[1] - best.a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      if (dx * tx + dz * tz < 0) { tx = -tx; tz = -tz; }
      // left of travel (x right, z forward): (-tz, tx)
      const ox = e.x - best.a[0], oz = e.z - best.a[1], along = ox * tx + oz * tz, lx = ox - along * tx, lz = oz - along * tz, side = lx * -tz + lz * tx;
      if (side < -0.2) _wivPush(C, 'laneDir', e.id, `${e.obj || e.cls} ${what} on the right of ${best.s.id} (UK traffic keeps left)`);
    };
    for (const m of C.movers) {
      const cls = _wivCls(m);
      if (!(cls === 'vehicle' || m.layer === 'drive') || !(Math.hypot(m.vx || 0, m.vz || 0) > 0.5)) continue;
      check(m, m.vx, m.vz, 'drives');
    }
    for (const e of C.statics) {
      if (_wivCls(e) !== 'vehicle' || e.parked || !_wivNum(e.facing)) continue;
      const f = e.facing / _WIV_DEG;
      check(e, Math.sin(f), Math.cos(f), 'faces the traffic');
    }
  },
  animStill(C) {
    if (!C.ents.some(e => e.anim)) return 'na';
    for (const m of C.movers) {
      const a = m.anim;
      if (!a) continue;
      const h = C.track ? (C.track.anim.get(m.id) || C.track.anim.set(m.id, { mov: -1e9, still: -1e9 }).get(m.id)) : null;
      const sp = _wivNum(m.speed) ? m.speed : Math.hypot(m.vx || 0, m.vz || 0);
      if (h && sp > 0.15) h.mov = C.t;
      if (sp >= 0.05 || !_WIV_MOVE_ANIM.has(String(a.state)) || !(a.rate > 0)) continue;
      if (h && C.t - h.mov < 0.65) continue;   // M7: walk-to-stop eases over 0.2-0.6 s
      _wivPush(C, 'animStill', m.id, `${m.obj || m.cls} plays '${a.clip || a.state}' at ${_wivR(a.rate)} Hz while still`);
    }
  },
  stillMoving(C) {
    if (!C.ents.some(e => e.anim)) return 'na';
    for (const m of C.movers) {
      const a = m.anim;
      if (!a || m.layer === 'rail') continue;
      const h = C.track ? (C.track.anim.get(m.id) || C.track.anim.set(m.id, { mov: -1e9, still: -1e9 }).get(m.id)) : null;
      const sp = _wivNum(m.speed) ? m.speed : Math.hypot(m.vx || 0, m.vz || 0);
      if (h && sp < 0.05) h.still = C.t;
      if (sp <= 0.2) continue;
      const bad = _WIV_STILL_ANIM.has(String(a.state)) || !(a.rate > 0);
      if (!bad || (h && C.t - h.still < 0.65)) continue;   // M7: stop-to-walk eases
      if (a.from && _wivNum(a.blend) && a.blend < 1 && a.from.state === 'move') continue;   // M7: walk-to-sit / walk-to-stop eases out
      _wivPush(C, 'stillMoving', m.id, `${m.obj || m.cls} moves at ${_wivR(sp)} m/s in '${a.state}' (rate ${_wivR(a.rate || 0)})`);
    }
  },
  staticAnim(C) {
    for (const e of C.statics) {
      const cls = _wivCls(e) || '', a = e.anim;
      if (a && a.rate > 0 && !_WIV_STILL_ANIM.has(String(a.state)) && a.state !== 'sway') _wivPush(C, 'staticAnim', e.id, `${e.obj} is a static but plays '${a.clip || a.state}'`);
      else if (e.sway && _wivNum(e.sway.amp) && e.sway.amp > 1e-3 && !_WIV_SWAY_CLS.has(cls) && !/(^|[.-])(plant|tree|reed|grass|flower|hedge|bough|frond|washing|smoke)/.test(String(e.obj))) _wivPush(C, 'staticAnim', e.id, `${e.obj} (${cls}) sways`);
    }
  },
  clones(C) {
    const list = C.ents.filter(e => e.anim && _wivNum(e.anim.period) && e.anim.period > 0 && _wivNum(e.anim.phase) && (e.static === false || e.sway));
    if (!list.length) return C.ents.some(e => e.anim) ? undefined : 'na';
    const g = _wivGrid(10), by = new Map();
    for (const e of list) { by.set(e.id, e); g.add(e.id, e.x, e.z, 0); }
    const seen = new Set();
    for (const a of list) {
      for (const id of _wivNear(g, a.x, a.z, 10)) {
        if (id === a.id) continue;
        const b = by.get(id);
        if (!b || (_wivCls(a) || a.obj) !== (_wivCls(b) || b.obj) || a.anim.state !== b.anim.state) continue;
        if (Math.hypot(a.x - b.x, a.z - b.z) > 10) continue;
        const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
        if (seen.has(k)) continue;
        seen.add(k);
        // in step = the same period AND the same place in the cycle now (anim.cyc, appearance's running cycle; the static
        // phase offset only when the record has no cycle)
        const pa = _wivNum(a.anim.cyc) && _wivNum(b.anim.cyc) ? a.anim.cyc : a.anim.phase, pb = _wivNum(a.anim.cyc) && _wivNum(b.anim.cyc) ? b.anim.cyc : b.anim.phase;
        const dp = Math.abs(a.anim.period - b.anim.period) / a.anim.period, ph = Math.abs(((pa - pb) % 1 + 1.5) % 1 - 0.5);
        // two cycles a hair apart in period drift through step now and then (a beat): only a pair that stays in step for 3 s is
        // a clone (with a tracker; one frame without one)
        let held = true;
        if (C.track && C.track.cache && _wivNum(C.frame.t)) {
          let since = C.track.cache.get('clones');
          if (!since) { since = new Map(); C.track.cache.set('clones', since); }
          if (dp < 0.015 && ph < 0.025) { if (!since.has(k)) since.set(k, C.frame.t); held = C.frame.t - since.get(k) >= 3; }
          else { since.delete(k); held = false; }
        }
        if (held && dp < 0.015 && ph < 0.025) _wivPush(C, 'clones', a.id, `${a.obj || a.cls} ${a.id} and ${b.id} animate in step (period ${_wivR(a.anim.period)} s, phase ${_wivR(a.anim.phase)})`);
      }
    }
  },
  windDir(C) {
    const w = C.frame.wind;
    if (!w) return 'na';
    const wd = _wivNum(w.dir) ? w.dir : _wivNum(w.dx) ? Math.atan2(w.dx, w.dz) * _WIV_DEG : null, ws = _wivNum(w.s) ? w.s : 1;
    for (const e of C.ents) {
      const s = e.sway;
      if (!s) continue;
      const amp = _wivNum(s.amp) ? s.amp : _wivNum(s.dx) ? Math.hypot(s.dx, s.dz) : 0;
      if (!(amp > 1e-3)) continue;
      if (ws <= 0) { _wivPush(C, 'windDir', e.id, `${e.obj} sways in calm air`); continue; }
      const sd = _wivNum(s.dir) ? s.dir : _wivNum(s.dx) ? Math.atan2(s.dx, s.dz) * _WIV_DEG : null;
      if (sd == null || wd == null) continue;
      if (_wivAngDiff(sd, wd) > 30) _wivPush(C, 'windDir', e.id, `${e.obj} sways ${Math.round(sd)} degrees against a wind of ${Math.round(wd)}`);
    }
  },
  order(C) {
    const f = C.frame;
    if (Array.isArray(f.orderViolations)) { for (const v of f.orderViolations) _wivPush(C, 'order', v.a, v.why || `${v.a} / ${v.b} drawn in the wrong order`); return; }
    const withOrder = C.ents.filter(e => _wivNum(e.order) && _wivBox(e));
    if (!withOrder.length) return 'na';
    const seen = new Set(), all = !!C.o.allPairs;
    for (const a of withOrder) {
      if (a.static !== false && !all) continue;
      const ab = _wivBox(a);
      for (const b of _wivOnScreen(C, ab)) {
        if (b === a || !_wivNum(b.order)) continue;
        const bb = _wivBox(b);
        if (_wivBoxOverlap(ab, bb) < 1 || _wivRelated(a, b)) continue;
        // terrain that does not reach above a mover's feet cannot hide it (the order skips its redraw: 4terrain worldTerrainOccludes)
        if (typeof worldTerrainOccludes === 'function' && ((a.static !== false && a.tops && !worldTerrainOccludes({ tops: a.tops }, { x0: bb[0], y0: bb[1], x1: bb[2], y1: bb[3] })) || (b.static !== false && b.tops && !worldTerrainOccludes({ tops: b.tops }, { x0: ab[0], y0: ab[1], x1: ab[2], y1: ab[3] })))) continue;
        const k = a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
        if (seen.has(k)) continue;
        seen.add(k);
        const aNear = _wivNearer(a, b);
        // a static redrawn over this very mover (render's occluder redraw, clipped to the mover) counts as drawn after it
        const oa = a.static !== false && Array.isArray(a.redrawFor) && a.redrawFor.includes(b.id) ? Infinity : a.order;
        const ob = b.static !== false && Array.isArray(b.redrawFor) && b.redrawFor.includes(a.id) ? Infinity : b.order;
        if (aNear ? oa < ob : ob < oa) _wivPush(C, 'order', a.id, `${aNear ? a.id : b.id} is nearer than ${aNear ? b.id : a.id} but drawn first`);
      }
    }
  },
  landmark(C) {
    const lms = C.ents.filter(e => e.landmark);
    if (!lms.length) return;
    if (typeof worldLandmarkCheck === 'function' && C.world && C.cam && C.track) {
      const key = 'lm';
      let r = C.track.cache.get(key);
      if (r === undefined) { try { r = worldLandmarkCheck(C.world, C.cam); } catch (e) { r = null; } C.track.cache.set(key, r); }
      const list = Array.isArray(r) ? r : r && Array.isArray(r.landmarks) ? r.landmarks : null;
      if (list) { for (const x of list) if (x && x.ok === false) _wivPush(C, 'landmark', x.id, x.msg || `landmark ${x.id} shows ${Math.round((x.visible || 0) * 100)} % of its face`); return; }
    }
    for (const L of lms) {
      const b = _wivBox(L);
      if (!b) continue;
      const occ = _wivOnScreen(C, b).filter(s => s !== L && !s.landmark && _WIV_OPAQUE.has(_wivCls(s) || '') && (_wivNum(s.order) && _wivNum(L.order) ? s.order > L.order : _wivNearer(s, L)));
      let vis = 0, n = 0;
      for (let i = 0; i < 12; i++) for (let j = 0; j < 8; j++) {
        const X = b[0] + (b[2] - b[0]) * (i + 0.5) / 12, Y = b[1] + (b[3] - b[1]) * (j + 0.5) / 8;
        n++;
        if (X < 0 || X > C.W || Y < 0 || Y > C.H) continue;
        let hid = 0;
        for (const s of occ) { const sb = _wivBox(s); if (X >= sb[0] && X <= sb[2] && Y >= sb[1] && Y <= sb[3]) hid += _wivCls(s) === 'tree' ? 0.6 : 1; if (hid >= 1) break; }
        vis += Math.max(0, 1 - hid);
      }
      const share = n ? vis / n : 1;
      if (share < 0.6) _wivPush(C, 'landmark', L.id, `landmark ${L.obj} shows ${Math.round(share * 100)} % of its face (60 % needed)`);
    }
  },
  bare(C) {
    if (!C.world || !C.cam || typeof worldCoverage !== 'function') return 'na';
    let r = C.track ? C.track.cache.get('bare') : undefined;
    if (r === undefined) {
      try { r = worldCoverage(C.world, C.cam, { season: C.frame.season || (C.frame.ctx && C.frame.ctx.season) }); } catch (e) { r = null; }
      if (C.track) C.track.cache.set('bare', r);
    }
    if (r && r.ok === false) _wivPush(C, 'bare', null, r.msg || `${Math.round((r.bare || 0) * 100)} % of the frame is bare`);
  },
  season(C) {
    const ctx = C.frame.ctx;
    if (!ctx || !_wivNum(ctx.month)) return 'na';
    // ctx.month is 0-11 (January = 0), as systems' worldTimeCtx gives it
    const mo = ctx.month, MN = _WIV_MONTHS[mo] || 'month ' + mo, winter = mo === 11 || mo <= 1, summer = mo >= 5 && mo <= 7, snowMonths = mo >= 4 && mo <= 8;
    const sunAlt = C.frame.sun && _wivNum(C.frame.sun.alt) ? C.frame.sun.alt : ctx.sun && _wivNum(ctx.sun.alt) ? ctx.sun.alt : null;
    const drawn = C.frame.season || null;
    if (drawn && ((winter && drawn === 'summer') || (summer && drawn === 'winter'))) _wivPush(C, 'season', null, `the scene is drawn as ${drawn} in ${MN}`);
    if (snowMonths && (ctx.snowing || ctx.snowDay)) _wivPush(C, 'season', null, `snow in ${MN}`);
    for (const e of C.ents) {
      const kb = _wivKb(e.obj), look = e.look || null, cls = _wivCls(e) || '';
      // drawn while its descriptor says it is not there: a static by its state (S1, V3), a mover by its when-rule (K6, S4)
      if (kb && e.static !== false && typeof worldKbState === 'function' && !e.landmark) {
        let st = null; try { st = worldKbState(kb, ctx, e.id); } catch (err) { st = null; }
        if (st && st.present === false) _wivPush(C, 'season', e.id, `${e.obj} is drawn but not present in ${MN} (its descriptor's state)`);
      } else if (kb && e.static === false && typeof worldKbWhen === 'function') {
        let w = null; try { w = worldKbWhen(kb, ctx); } catch (err) { w = null; }
        if (w && w.ok === false) _wivPush(C, 'season', e.id, `${e.obj} out of season (${MN}, ${_wivNum(ctx.hour) ? Math.round(ctx.hour) + ' h' : ''} ${ctx.weather || ''}: ${w.why || 'when'})`.trim());
      }
      if (!look) continue;
      if (kb && typeof worldKbState === 'function') {
        let want = null; try { want = worldKbState(kb, ctx, e.id); } catch (err) { want = null; }
        if (want && want.leaf && look.leaf && want.leaf !== look.leaf && !(want.leaf === 'turn' && look.leaf === 'full') && !(want.leaf === 'bud' && look.leaf === 'bare')) _wivPush(C, 'season', e.id, `${e.obj} drawn ${look.leaf}, the date says ${want.leaf}`);
        if (want && want.snow === false && look.snow) _wivPush(C, 'season', e.id, `${e.obj} has snow on a day without snow`);
      } else if (cls === 'tree' && !_WIV_EVERGREEN.test(String(e.obj))) {
        if (winter && look.leaf === 'full') _wivPush(C, 'season', e.id, `${e.obj} is green in ${MN}`);
        if (summer && look.leaf === 'bare') _wivPush(C, 'season', e.id, `${e.obj} is bare in ${MN}`);
      }
      if (look.snow && snowMonths) _wivPush(C, 'season', e.id, `${e.obj} has snow in ${MN}`);
      if (look.lit && sunAlt != null && sunAlt > 8) _wivPush(C, 'season', e.id, `${e.obj} has lit windows with the sun at ${Math.round(sunAlt)} degrees`);
    }
    for (const l of Array.isArray(C.frame.lights) ? C.frame.lights : []) {
      if (l && l.on && (l.kind === 'window' || l.kind === 'lamp') && sunAlt != null && sunAlt > 8) { _wivPush(C, 'season', l.ref || null, `a ${l.kind} is lit with the sun at ${Math.round(sunAlt)} degrees`); break; }
    }
    if (sunAlt != null && sunAlt < -6) for (const e of C.ents) {
      const sh = e.shadow;
      if (sh && sh.kind !== 'contact' && (sh.sun === 'sun' || sh.kind === 'sun' || sh.kind === 'cast') && !(sh.sun === 'moon' || sh.sun === 'lamp') && (!_wivNum(sh.op) || sh.op > 0.12)) { _wivPush(C, 'season', e.id, `${e.obj} casts a sun shadow with the sun at ${Math.round(sunAlt)} degrees (night)`); break; }
    }
  },
};
/** a is nearer than b (drawn later): the footprint test of 2.3 rule 3; worldOrderNearer when the order module is loaded. */
function _wivNearer(a, b) {
  // one definition of "nearer" for the renderer and the checker: the order module's, when it is loaded
  if (typeof worldOrderNearer === 'function') { try { return worldOrderNearer(a, b); } catch (e) { /* the checker's own below */ } }
  if (_wivHostOf(a) === b.id) return true;
  if (_wivHostOf(b) === a.id) return false;
  const fa = _wivFootOf(a) || [[a.x, a.z]], fb = _wivFootOf(b) || [[b.x, b.z]];
  const minZ = f => { let m = Infinity; for (const p of f) m = Math.min(m, p[1]); return m; }, maxZ = f => { let m = -Infinity; for (const p of f) m = Math.max(m, p[1]); return m; };
  if (maxZ(fa) < minZ(fb)) return true;
  if (maxZ(fb) < minZ(fa)) return false;
  const xr = f => [Math.min(...f.map(p => p[0])), Math.max(...f.map(p => p[0]))], ra = xr(fa), rb = xr(fb);
  const lo = Math.max(ra[0], rb[0]), hi = Math.min(ra[1], rb[1]);
  const x = lo <= hi ? (lo + hi) / 2 : (ra[1] < rb[0] ? (ra[1] + rb[0]) / 2 : (rb[1] + ra[0]) / 2);
  // the front edge at column x, x clamped into the footprint's own span (as the order module's worldOrderFrontZ does)
  const front = (f) => {
    if (f.length < 3) return f[0][1];
    const r = xr(f), cx = Math.max(r[0], Math.min(r[1], x));
    let best = Infinity;
    for (let i = 0; i < f.length; i++) {
      const p = f[i], q = f[(i + 1) % f.length];
      if (cx < Math.min(p[0], q[0]) || cx > Math.max(p[0], q[0])) continue;
      const z = p[0] === q[0] ? Math.min(p[1], q[1]) : p[1] + (q[1] - p[1]) * (cx - p[0]) / (q[0] - p[0]);
      if (z < best) best = z;
    }
    return best === Infinity ? minZ(f) : best;
  };
  const da = front(fa), db = front(fb);
  if (Math.abs(da - db) > 1e-6) return da < db;
  if ((a.y || 0) !== (b.y || 0)) return (a.y || 0) > (b.y || 0);
  return String(a.id) > String(b.id);
}

/** Rules that read the statics only (and the surfaces): computed once per world with a tracker, replayed on later frames. */
const _WIV_STATIC_RULES = new Set(['habitat', 'pathBlocked']);
/** The history one run keeps across frames (popping, stuck, grace periods, the static cache). */
function worldInvariantTracker() { return { prev: null, ids: new Map(), anim: new Map(), cache: new Map(), frames: 0 }; }

/**
 * The violations of one frame record (16.1, 16.2). Never throws: a rule that throws is reported once as a violation of
 * that rule with the error, so a broken rule can never hide as a clean frame.
 */
function worldInvariants(frame, o) {
  o = o || {};
  if (!frame || typeof frame !== 'object') return [{ rule: 'frame', req: '16.1', id: null, msg: 'no frame record' }];
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const C = _wivContext(frame, o), want = o.rules ? new Set(o.rules) : null, skip = new Set(o.skip || []);
  if (C.track && C.track.world !== C.world) { C.track.world = C.world; C.track.cache.clear(); }
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()), byRule = {};
  const nStatic = C.statics.length;
  for (const d of WORLD_INVARIANTS) {
    if ((want && !want.has(d.rule)) || skip.has(d.rule)) continue;
    let r;
    const a = now();
    // rules over the statics alone run once per world (a tracker keeps them); later frames replay their result
    const cached = _WIV_STATIC_RULES.has(d.rule) && C.track ? C.track.cache.get('static:' + d.rule) : null;
    if (cached && cached.n === nStatic) { for (const v of cached.out) C.out.push(Object.assign({}, v)); r = cached.r; }
    else {
      const from = C.out.length;
      try { r = _WIV_RULES[d.rule](C); } catch (e) { _wivPush(C, d.rule, null, `the rule threw: ${e && e.message || e}`); r = null; }
      if (_WIV_STATIC_RULES.has(d.rule) && C.track) C.track.cache.set('static:' + d.rule, { n: nStatic, r, out: C.out.slice(from).map(v => Object.assign({}, v)) });
    }
    byRule[d.rule] = now() - a;
    if (r === 'na') C.na.add(d.rule); else C.ran.add(d.rule);
  }
  if (C.track) { C.track.prev = frame; C.track.frames++; }
  if (o.stats && typeof o.stats === 'object') { o.stats.ran = [...C.ran]; o.stats.na = [...C.na]; o.stats.ms = now() - t0; o.stats.byRule = byRule; }
  return C.out;
}

/* ---------- a frame record without the render package (Node tools, the dev overlay) ---------- */
function _wivProject(cam, x, z, y) {
  if (typeof sceneProject !== 'function' || !cam) return null;
  try { const p = sceneProject(cam, x, Math.max(0.3, z), y); return p && _wivNum(p.X) ? p : null; } catch (e) { return null; }
}
function _wivBoxOf(cam, e, h, w) {
  const f0 = _wivFootOf(e), y = _wivNum(e.y) ? e.y : 0, zMin = Math.max(0.5, (cam && cam.dMin ? cam.dMin : 1) * 0.5);
  // the footprint clipped at the near plane (a long boat reaching behind the lens is cut there, never projected to infinity)
  let f = null;
  if (f0) {
    f = [];
    for (let i = 0; i < f0.length; i++) {
      const a = f0[i], b = f0[(i + 1) % f0.length];
      if (a[1] >= zMin) f.push(a);
      if ((a[1] >= zMin) !== (b[1] >= zMin)) { const t = (zMin - a[1]) / (b[1] - a[1]); f.push([a[0] + (b[0] - a[0]) * t, zMin]); }
    }
    if (f.length < 2) f = null;
  }
  if (f) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of f) for (const k of [0, 1]) {
      const q = _wivProject(cam, p[0], p[1], y + (k ? h : 0)); if (!q) continue;
      x0 = Math.min(x0, q.X); x1 = Math.max(x1, q.X); y0 = Math.min(y0, q.Y); y1 = Math.max(y1, q.Y);
    }
    if (x0 <= x1) return [x0, y0, x1, y1];
  }
  const a = _wivProject(cam, e.x, e.z, y), b = _wivProject(cam, e.x, e.z, y + h);
  if (!a || !b) return null;
  const k = cam.f / Math.max(0.3, e.z), hw = (w || h * 0.4) * k / 2;
  return [a.X - hw, b.Y, a.X + hw, a.Y];
}
/**
 * A frame record (16.1) from a world (sense's worldBuild) and the life sim's agents (worldAgents), for when render's
 * worldFrameAt is not loaded. o: { t, ctx, cam, W, H, cache ({} kept by the caller: chunks and shadows), born (Map), sun, wind }.
 * Fields owned by other packages come from their functions when loaded (anim: worldAnimOf, sway: worldWind + worldSway,
 * shadow: worldShadowPlan), else stay null so their rules report n/a.
 */
function worldInvariantFrame(world, agents, o) {
  o = o || {};
  const cam = o.cam || (world && world.cam) || null, t = _wivNum(o.t) ? o.t : 0, cache = o.cache || {}, born = o.born || null;
  const ents = [];
  let hidden = 0;
  for (const e of (world && world.entities) || []) {
    if (!e || !e.obj || !(e.z > 0)) continue;
    const fid = e.id != null ? e.id : e.obj + '@' + _wivR(e.x) + ',' + _wivR(e.z);
    // what the renderer leaves out: a static its descriptor's state says is not there at this date (S1, V3; kb's worldKbState)
    if (o.ctx && typeof worldKb === 'function' && typeof worldKbState === 'function' && !e.landmark) {
      let st = null; try { const kb = worldKb(e.obj); st = kb ? worldKbState(kb, o.ctx, fid) : null; } catch (err) { st = null; }
      if (st && st.present === false) { hidden++; continue; }
    }
    const info = _wivInfo(e.obj), h = _wivNum(e.height) ? e.height : info ? info.size.h : 1;
    ents.push({ id: fid, cls: e.cls || (info && info.cls) || null, obj: e.obj, static: true, auto: e.auto || null,
      landmark: !!e.landmark, framing: !!e.framing, framed: !!e.framed, x: e.x, y: e.y, z: e.z, facing: e.facing, foot: e.foot || null, height: h,
      layer: null, host: e.host || null, parent: e.parent != null ? e.parent : null, parentOff: e.parentOff, attach: e.attach || null, solidity: e.solidity || (info && info.solidity) || null,
      deck: e.deck || null, waterline: e.waterline != null ? e.waterline : null, blocks: !!e.blocks, view: e.view || null, mirror: !!e.mirror,
      box: cam ? _wivBoxOf(cam, e, h, info ? info.size.w : null) : null, order: null, speed: 0, vx: 0, vz: 0, state: null, born: null,
      anim: e.anim || null, sway: null, shadow: null, reflect: null, look: e.look || null, backdrop: !!e.backdrop });
  }
  for (const a of agents || []) {
    if (!a || a.id == null) continue;
    const info = _wivInfo(a.obj), h = _wivNum(a.h) ? a.h : info ? info.size.h : 1.7, r = info ? Math.max(0.12, Math.min(info.size.w, info.size.d || info.size.w) / 2) : 0.25;
    if (born && !born.has(a.id)) born.set(a.id, t);
    const foot = info && info.foot === 'box' && info.solidity === 'solid' ? (() => { const hd = Math.atan2(a.vx || 0, a.vz || 1), L = info.size.w / 2, W = info.size.d / 2, hx = Math.sin(hd), hz = Math.cos(hd), rx = Math.cos(hd), rz = -Math.sin(hd); return [[-L, -W], [L, -W], [L, W], [-L, W]].map(([u, v]) => [a.x + u * hx + v * rx, a.z + u * hz + v * rz]); })() : null;
    let anim = a.anim || null;
    if (!anim && typeof worldAnimOf === 'function') { try { anim = worldAnimOf(a) || null; } catch (e) { anim = null; } }
    ents.push({ id: a.id, cls: a.cls || (info && info.cls) || null, obj: a.obj, static: false, x: a.x, y: a.y, z: a.z, facing: a.heading != null ? a.heading * _WIV_DEG : null,
      foot, height: h, r: _wivNum(a.r) ? a.r : r, group: a.group || null, leash: !!a.lead, intent: a.intent || null, resident: !!a.resident, squeeze: !!a.squeeze, leader: a.leader || null, layer: a.layer || null, host: a.host || null, view: a.view || null, mirror: !!a.mirror, framed: !!a.framed, sideOnly: a.sideOnly,
      box: cam ? _wivBoxOf(cam, { x: a.x, z: a.z, y: a.y, foot: null }, h, info ? info.size.w : h * 0.4) : null, order: null,
      speed: Math.hypot(a.vx || 0, a.vz || 0), vx: a.vx || 0, vz: a.vz || 0, state: a.state || null, born: born ? born.get(a.id) : null,
      anim, sway: null, shadow: a.shadow || null, reflect: a.reflect || null, look: a.look || null, leaving: !!a.leaving });
  }
  // depth order: the order module's chunks and frame order when loaded (the last draw position of each entity), else depth
  const byId = new Map(ents.map(e => [e.id, e]));
  if (cam && typeof worldChunks === 'function' && typeof worldFrameOrder === 'function' && typeof sceneProject === 'function') {
    try {
      const zMin = Math.max(0.3, (cam.dMin || 1) * 0.5);
      const proj = { f: cam.f, project: (x, z, y) => { const p = sceneProject(cam, x, Math.max(zMin, z), y); return [p.X, p.Y]; } };
      if (!cache.chunks || cache.world !== world) { cache.world = world; cache.chunks = worldChunks(world, cache.nav || null, proj); }
      const ag = ents.filter(e => !e.static).map(e => ({ id: e.id, x: e.x, z: e.z, y: e.y, foot: e.foot, height: e.height, static: false, attach: e.host ? 'deck:' + e.host : null }));
      // the screen boxes the checker uses (a mover's box has its real width, never a zero-width foot point)
      const boxes = (e) => { const r = byId.get(e.id), b = r && r.box; return b ? { x0: b[0], y0: b[1], x1: b[2], y1: b[3] } : null; };
      const order = worldFrameOrder(cache.chunks, ag, proj, boxes);
      let p = 0;
      for (const it of order) {
        if (it.kind === 'chunk') { for (const s of it.ref.ents || []) { const r = byId.get(s.id); if (r) r.order = p++; else p++; } }
        else { const r = byId.get(it.ref.id); if (r) r.order = p; p++; }
      }
    } catch (e) { /* depth below */ }
  }
  if (!ents.some(e => _wivNum(e.order))) {
    const s = ents.slice().sort((a, b) => (_wivNearer(a, b) ? 1 : -1));
    s.forEach((e, i) => { e.order = i; });
  }
  // wind and sway (systems), shadows (look)
  let wind = o.wind || null;
  if (!wind && typeof worldWind === 'function' && world) { try { const w = worldWind(world, 0, 30, t); if (w) wind = { dir: Math.atan2(w.dx || 0, w.dz || 0) * _WIV_DEG, s: _wivNum(w.s) ? w.s : Math.hypot(w.dx || 0, w.dz || 0) }; } catch (e) { wind = null; } }
  if (!wind && o.ctx && o.ctx.wind) wind = { dir: o.ctx.wind.dir, s: o.ctx.wind.s };
  if (typeof worldSway === 'function' && typeof worldWind === 'function' && world) {
    for (const e of ents) {
      if (!e.static) continue;
      try { const w = worldWind(world, e.x, e.z, t), s = worldSway(e, w, t); if (s) e.sway = { dir: _wivNum(s.dir) ? s.dir : Math.atan2(s.dx || 0, s.dz || 0) * _WIV_DEG, amp: _wivNum(s.amp) ? s.amp : Math.hypot(s.dx || 0, s.dz || 0) }; } catch (err) { /* no sway */ }
    }
  }
  // shadows and reflections of the statics: look's per-entity view (worldLookOf) when loaded, else its shadow plan; cached by sun
  const sun = o.sun || (o.ctx && o.ctx.sun) || null;
  if (sun && cam && world && (typeof worldLookOf === 'function' || typeof worldShadowPlan === 'function')) {
    const key = _wivR(sun.az || 0) + '|' + _wivR(sun.alt || 0);
    if (cache.shadowKey !== key || cache.shadowWorld !== world) {
      cache.shadowKey = key; cache.shadowWorld = world; cache.shadows = new Map(); cache.reflects = new Map();
      const keep = (s) => ({ poly: s.poly, dir: s.dir, kind: s.kind === 'contact' ? 'contact' : 'cast', sun: s.sun, op: s.op, cutWater: s.cutWater, holes: s.holes, on: s.on });
      let done = false;
      if (typeof worldLookOf === 'function') {
        try {
          const m = worldLookOf(world, cam, { sun, ctx: o.ctx || null, statics: true });
          if (m && typeof m.forEach === 'function') { m.forEach((v, id) => { if (v && v.shadow && v.shadow.kind !== 'contact') cache.shadows.set(id, keep(v.shadow)); if (v && v.reflect) cache.reflects.set(id, v.reflect); }); done = true; }
        } catch (e) { done = false; }
      }
      if (!done && typeof worldShadowPlan === 'function') { try { for (const s of worldShadowPlan(world, cam, sun) || []) if (s && s.kind !== 'contact' && !s.mover) cache.shadows.set(s.ref, keep(s)); } catch (e) { /* none */ } }
    }
    for (const e of ents) if (e.static) { if (cache.shadows.has(e.id)) e.shadow = cache.shadows.get(e.id); if (cache.reflects && cache.reflects.has(e.id)) e.reflect = cache.reflects.get(e.id); }
  }
  return { t, ctx: o.ctx || null, cam, W: _wivNum(o.W) ? o.W : 1600, H: _wivNum(o.H) ? o.H : 900, ents, wind, sun, lights: o.lights || [], log: (world && world.log) || [],
    surfaces: (world && world.surfaces) || [], season: o.season || (world && world.season) || null, hidden };
}
