// 79-world-3order.js - World engine v3, package render: depth order and chunks (docs/dev/WORLD_ENGINE.md 2.2, 2.3; R1, R2).
// Pure (Node + browser). Depth convention: larger z = farther from the camera; draw far to near.
//   worldChunks(world, nav, cam, opts)       -> [{ i, z0, z1, ents, bbox, stand, backdrop? }]  (far to near, <= 24)
//   worldFrameOrder(chunks, agents, cam, boxes) -> [{ kind: 'chunk' | 'agent' | 'redraw', ref, chunk? }]
//   worldOrderCheck(order, boxes, opts)      -> [{ a, b, why }]   (must be empty; opts.all also tests static pairs)
//   worldOrderNearer(a, b)                   -> true when a is nearer than b (footprint test, stable tie by id)
//   worldOrderFrontZ(foot, x)                -> the footprint's front edge z at x (x clamped into the footprint)
// Entities/agents: { id, x, z, y?, foot?: [[x, z], ...], box?: { x0, y0, x1, y1 }, attach?, static? }.
// A screen box comes from boxes (Map / object / function), else ent.box, else the cam projection of the footprint.
// Size never exempts an occluder (R2): a building or a boat occludes like a post. Budget (7): < 0.7 ms per frame for
// 500 statics + 60 agents; the checker is O(movers x entities) per frame, not O(n^2).

var WORLD_CHUNK_CAP = 24;

/** The z of a footprint's front (camera-facing) edge at x; x is clamped into the footprint's x range. */
function worldOrderFrontZ(foot, x) {
  if (!foot || !foot.length) return Infinity;
  if (foot.length === 1) return foot[0][1];
  var lo = Infinity, hi = -Infinity, i;
  for (i = 0; i < foot.length; i++) { if (foot[i][0] < lo) lo = foot[i][0]; if (foot[i][0] > hi) hi = foot[i][0]; }
  if (x < lo) x = lo; if (x > hi) x = hi;
  var best = Infinity;
  for (i = 0; i < foot.length; i++) {
    var a = foot[i], b = foot[(i + 1) % foot.length];
    var ax = a[0], bx = b[0];
    if (x >= (ax < bx ? ax : bx) && x <= (ax > bx ? ax : bx)) {
      var z = ax === bx ? (a[1] < b[1] ? a[1] : b[1]) : a[1] + (b[1] - a[1]) * (x - ax) / (bx - ax);
      if (z < best) best = z;
    }
  }
  return best;
}

function worldOrderFoot(e) { return e.foot && e.foot.length ? e.foot : [[e.x, e.z]]; }

// per-entity memo of the footprint's z range and x range (invalidated when the foot array or the anchor changes)
function _worldOrderMemo(e) {
  var m = e._om;
  if (m && m.f === e.foot && m.x === e.x && m.z === e.z && m.at === e.attach) return m;
  var f = worldOrderFoot(e), zl = Infinity, zh = -Infinity, xl = Infinity, xh = -Infinity;
  for (var i = 0; i < f.length; i++) {
    var p = f[i];
    if (p[1] < zl) zl = p[1]; if (p[1] > zh) zh = p[1];
    if (p[0] < xl) xl = p[0]; if (p[0] > xh) xh = p[0];
  }
  m = { f: e.foot, x: e.x, z: e.z, at: e.attach, h: worldOrderHostId(e), zk: zl, zm: zh, xr: [xl, xh], fl: undefined, oh: undefined };
  e._om = m;
  return m;
}
function worldOrderZKey(e) { return _worldOrderMemo(e).zk; }
function worldOrderZMax(e) { return _worldOrderMemo(e).zm; }
function worldOrderXRange(e) { return _worldOrderMemo(e).xr; }

function worldOrderChunkZMax(ch) {
  if (ch._zm == null) { var m = -Infinity; for (var i = 0; i < ch.ents.length; i++) { var z = worldOrderZMax(ch.ents[i]); if (z > m) m = z; } ch._zm = m; }
  return ch._zm;
}

// Screen-column index of a chunk's statics (built once per chunk; statics do not move).
var WORLD_ORDER_COLW = 64, worldOrderStamp = 0;
function worldOrderNearby(ch, box, boxes, cam) {
  if (!ch._cols) {
    var cols = {};
    for (var i = 0; i < ch.ents.length; i++) {
      var s = ch.ents[i], b = worldOrderBoxOf(s, boxes, cam);
      s._ob = b;
      if (!b) continue;
      var c0 = Math.floor(b.x0 / WORLD_ORDER_COLW), c1 = Math.floor(b.x1 / WORLD_ORDER_COLW);
      if (c1 - c0 > 200) c1 = c0 + 200;
      for (var c = c0; c <= c1; c++) (cols[c] || (cols[c] = [])).push(i);
    }
    ch._cols = cols;
  }
  if (!box) return [];
  var k0 = Math.floor(box.x0 / WORLD_ORDER_COLW), k1 = Math.floor(box.x1 / WORLD_ORDER_COLW), stamp = ++worldOrderStamp, idx = [];
  for (var k = k0; k <= k1; k++) {
    var l = ch._cols[k];
    if (!l) continue;
    for (var j = 0; j < l.length; j++) {
      var e = ch.ents[l[j]];
      if (e._os !== stamp) { e._os = stamp; if (worldOrderOverlap(box, e._ob)) idx.push(l[j]); }
    }
  }
  if (idx.length > 1) idx.sort(function (a, b) { return a - b; });
  var res = new Array(idx.length);
  for (j = 0; j < idx.length; j++) res[j] = ch.ents[idx[j]];
  return res;
}

function worldOrderHostId(e) {
  var a = e && e.attach;
  if (typeof a !== 'string') return null;
  var k = a.indexOf(':');
  if (k < 0) return null;
  var kind = a.slice(0, k);
  return (kind === 'deck' || kind === 'wall' || kind === 'perch' || kind === 'host') ? a.slice(k + 1) : null;
}

// True when a is nearer than b (a must be drawn after b). Footprint test, not anchor test (2.3 rule 3); a stable tie by
// height then id, so two things at one depth never swap from frame to frame (no z-fighting, 19).
/**
 * How flat a thing is for the order (memoised on the entity): 2 = a ground decal (leaf litter, puddles, petals: kb `decal`, or
 * under 0.15 m tall), always drawn under anything standing; 1 = a walkable or low thing (a boardwalk, a platform, a deck, under
 * 0.6 m), drawn under a mover standing on or in it; 0 = upright.
 */
var _worldOrderKbMemo = new Map();
function _worldOrderKb(obj) {
  if (!obj || typeof worldKb !== 'function') return null;
  var k = _worldOrderKbMemo.get(obj);
  if (k === undefined) { try { k = worldKb(obj) || null; } catch (err) { k = null; } _worldOrderKbMemo.set(obj, k); }
  return k;
}
function _worldOrderFlat(e) {
  var m = _worldOrderMemo(e);
  if (m.fl !== undefined) return m.fl;
  var f = 0, h = Number.isFinite(e.height) ? e.height : null, kb = e.static === false ? null : _worldOrderKb(e.obj);
  if (e.static !== false && (e.decal || (kb && kb.decal) || (h !== null && h <= 0.15))) f = 2;
  else if (e.static !== false && (e.solidity === 'walkable' || (kb && kb.solidity === 'walkable') || (h !== null && h <= 0.6 && e.flat === true))) f = 1;
  m.fl = f;
  return f;
}
/** Is this an overhead span (solidity 'overhead': a bridge, a viaduct)? From the entity, its draw record's entity, or the kb. */
function _worldOrderOverhead(e) {
  var m = _worldOrderMemo(e);
  if (m.oh !== undefined) return m.oh;
  var so = e.solidity || (e.ent && e.ent.solidity), k = so ? null : _worldOrderKb(e.obj);
  m.oh = so ? so === 'overhead' : !!(k && k.solidity === 'overhead');
  return m.oh;
}
function worldOrderNearer(a, b) {
  var ma = _worldOrderMemo(a), mb = _worldOrderMemo(b);
  if (ma.h !== null && ma.h === b.id) return true;
  if (mb.h !== null && mb.h === a.id) return false;
  if (ma.zm < mb.zk) return true;
  if (mb.zm < ma.zk) return false;
  // depth ranges that meet: flat things lie under what stands on them (a decal under anything upright; a walkable thing under
  // a mover inside it). Strictly nearer or farther things are ordered by depth above, flat or not.
  var la = _worldOrderFlat(a), lb = _worldOrderFlat(b);
  if (lb === 2 && la < 2) return true;
  if (la === 2 && lb < 2) return false;
  if (lb === 1 && la === 0 && a.static === false && mb.f && mb.f.length > 2 && worldOrderInside(mb.f, a.x, a.z)) return true;
  if (la === 1 && lb === 0 && b.static === false && ma.f && ma.f.length > 2 && worldOrderInside(ma.f, b.x, b.z)) return false;
  var ra = ma.xr, rb = mb.xr;
  var lo = ra[0] > rb[0] ? ra[0] : rb[0], hi = ra[1] < rb[1] ? ra[1] : rb[1];
  var x = lo <= hi ? (lo + hi) / 2 : (ra[1] < rb[0] ? (ra[1] + rb[0]) / 2 : (rb[1] + ra[0]) / 2);
  var fa = worldOrderFoot(a), fb = worldOrderFoot(b);
  var da = worldOrderFrontZ(fa, x), db = worldOrderFrontZ(fb, x);
  // a mover standing INSIDE a passable footprint (a walker in a stand of meadow plants, a heron in a reed clump) is compared
  // with the thing's own anchor, not its front edge: the order stays transitive with the things beside it
  // (not under an overhead span: a bridge or a viaduct's near face is in front of whoever walks beneath it, by its front edge)
  if (fa.length === 1 && fb.length > 2 && !_worldOrderOverhead(b) && worldOrderInside(fb, fa[0][0], fa[0][1])) db = Number.isFinite(b.z) ? b.z : db;
  else if (fb.length === 1 && fa.length > 2 && !_worldOrderOverhead(a) && worldOrderInside(fa, fb[0][0], fb[0][1])) da = Number.isFinite(a.z) ? a.z : da;
  if (Math.abs(da - db) > 1e-6) return da < db;
  var ya = a.y || 0, yb = b.y || 0;
  if (ya !== yb) return ya > yb;
  return String(a.id) > String(b.id);
}

/** Is (x, z) inside a footprint polygon? */
function worldOrderInside(P, x, z) {
  var c = false;
  for (var i = 0, j = P.length - 1; i < P.length; j = i++) {
    var xi = P[i][0], zi = P[i][1], xj = P[j][0], zj = P[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function worldOrderBoxOf(e, boxes, cam) {
  if (boxes) {
    var b = typeof boxes === 'function' ? boxes(e) : (typeof boxes.get === 'function' ? boxes.get(e.id) : boxes[e.id]);
    if (b) return b;
  }
  if (e.box) return e.box;
  var proj = cam && (cam.project || (typeof sceneProject === 'function' ? function (x, z, y) { return sceneProject(cam, x, z, y); } : null));
  if (!proj) return null;
  var f = worldOrderFoot(e), h = e.height || 1, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (var i = 0; i < f.length; i++) {
    for (var k = 0; k < 2; k++) {
      var p = proj.call(cam, f[i][0], f[i][1], (e.y || 0) + (k ? h : 0));
      if (!p) continue;
      var px = p.x != null ? p.x : p.X != null ? p.X : p[0], py = p.y != null ? p.y : p.Y != null ? p.Y : p[1];
      if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
    }
  }
  return x0 <= x1 ? { x0: x0, y0: y0, x1: x1, y1: y1 } : null;
}

function worldOrderOverlap(a, b) {
  return !!(a && b && a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1);
}

function worldOrderUnion(a, b) {
  if (!a) return b; if (!b) return a;
  return { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
}

// Number of nav cells movers can stand on with z in (zNear, zFar). Accepts nav.standZ (sorted asc array),
// nav.standBetween(zNear, zFar), or nav.cells [{ z, stand }].
function worldOrderStandCount(nav, zNear, zFar) {
  if (!nav) return 0;
  if (typeof nav.standBetween === 'function') return nav.standBetween(zNear, zFar) | 0;
  var a = nav.standZ;
  if (!a && nav.cells) {
    a = nav._standZ;
    if (!a) { a = []; for (var i = 0; i < nav.cells.length; i++) if (nav.cells[i].stand !== false) a.push(nav.cells[i].z); a.sort(function (p, q) { return p - q; }); nav._standZ = a; }
  }
  if (!a || !a.length) return 0;
  var lo = 0, hi = a.length;
  while (lo < hi) { var m = (lo + hi) >> 1; if (a[m] <= zNear) lo = m + 1; else hi = m; }
  var n = 0;
  for (var j = lo; j < a.length && a[j] < zFar; j++) n++;
  return n;
}

function worldChunks(world, nav, cam, opts) {
  opts = opts || {};
  var cap = opts.cap || WORLD_CHUNK_CAP;
  var ents = ((world && world.entities) || []).filter(function (e) { return e && e.static !== false; });
  ents.sort(function (a, b) { var d = worldOrderZKey(b) - worldOrderZKey(a); return d || (worldOrderNearer(a, b) ? 1 : -1); });
  var chunks = [], cur = null;
  for (var i = 0; i < ents.length; i++) {
    var e = ents[i], zk = worldOrderZKey(e);
    if (cur) {
      var span = cur.z1 - zk, lim = Math.max(0.5, 0.04 * Math.max(0, zk));
      if (span > lim || worldOrderStandCount(nav, zk, cur.z0) > 0) cur = null;
    }
    if (!cur) { cur = { z0: zk, z1: zk, ents: [] }; chunks.push(cur); }
    cur.ents.push(e); cur.z0 = zk;
  }
  var hasBackdrop = !!(world && world.backdrop);
  var max = Math.max(1, cap - (hasBackdrop ? 1 : 0));
  // merge cheapest adjacent pairs (fewest mover-reachable cells between them, then smallest joint span)
  while (chunks.length > max) {
    var best = -1, bc = Infinity, bs = Infinity;
    for (var k = 0; k + 1 < chunks.length; k++) {
      var c = worldOrderStandCount(nav, chunks[k + 1].z1, chunks[k].z0), s = chunks[k].z1 - chunks[k + 1].z0;
      if (c < bc || (c === bc && s < bs)) { bc = c; bs = s; best = k; }
    }
    var A = chunks[best], B = chunks[best + 1];
    chunks.splice(best, 2, { z0: B.z0, z1: A.z1, ents: A.ents.concat(B.ents) });
  }
  var out = [];
  if (hasBackdrop) out.push({ i: 0, z0: Infinity, z1: Infinity, ents: [], bbox: null, stand: 0, backdrop: world.backdrop });
  for (var q = 0; q < chunks.length; q++) {
    var ch = chunks[q], bb = null;
    for (var r = 0; r < ch.ents.length; r++) {
      var b = worldOrderBoxOf(ch.ents[r], opts.boxes || null, cam);
      if (b) { ch.ents[r].box = ch.ents[r].box || b; bb = worldOrderUnion(bb, b); }
    }
    out.push({ i: out.length, z0: ch.z0, z1: ch.z1, ents: ch.ents, bbox: bb, stand: worldOrderStandCount(nav, ch.z0, ch.z1) });
  }
  return out;
}

/**
 * Movers in drawing order (far to near): the zKey order, corrected where movers with a real footprint overlap on screen and
 * their depth ranges meet (an edge from the farther to the nearer by the footprint test). Kahn's algorithm with the zKey
 * position as priority; a cycle (rare: the footprint relation is not transitive) is broken at the earliest remaining one.
 * Points only: the zKey order is exact and returned as it is.
 */
function worldOrderMovers(roots) {
  var N = roots.length, i, j, ext = false;
  for (i = 0; i < N && !ext; i++) if (roots[i].foot && roots[i].foot.length > 1) ext = true;
  if (!ext || N < 2) return roots;
  var adj = null, indeg = null;
  for (i = 0; i < N; i++) {
    var A = roots[i], zA = worldOrderZKey(A), eA = A.foot && A.foot.length > 1;
    for (j = i + 1; j < N; j++) {
      var B = roots[j];
      // every pair that overlaps on the screen is constrained (two points too, and a B wholly nearer): once a footprint
      // mover reorders the list, an unconstrained pair could come out of depth order (a walker drawn before the dog behind him)
      if (!worldOrderOverlap(A._box, B._box)) continue;
      if (!adj) { adj = []; indeg = new Int32Array(N); for (var k = 0; k < N; k++) adj.push(null); }
      if (worldOrderZMax(B) >= zA && worldOrderNearer(A, B)) { (adj[j] || (adj[j] = [])).push(i); indeg[i]++; }   // A is nearer: B first
      else { (adj[i] || (adj[i] = [])).push(j); indeg[j]++; }
    }
  }
  if (!adj) return roots;
  var out = [], done = new Uint8Array(N);
  for (var n = 0; n < N; n++) {
    var pick = -1;
    for (i = 0; i < N; i++) if (!done[i] && indeg[i] === 0) { pick = i; break; }
    if (pick < 0) for (i = 0; i < N; i++) if (!done[i]) { pick = i; break; }   // a cycle: the earliest by zKey
    done[pick] = 1; out.push(roots[pick]);
    var l = adj[pick];
    if (l) for (j = 0; j < l.length; j++) indeg[l[j]]--;
  }
  return out;
}

// Per-frame order. Each agent is slotted after the last chunk holding an overlapping static it is in front
// of (at least its zKey slot); statics in chunks up to that slot that are nearer and overlap are redrawn.
// Agents attached to a host draw straight after the host (and after any redraws of the host).
function worldFrameOrder(chunks, agents, cam, boxes) {
  chunks = chunks || []; agents = agents || [];
  var n = chunks.length, i, j, k;
  var byId = {}, roots = [], kids = {};
  for (i = 0; i < agents.length; i++) byId[agents[i].id] = agents[i];
  // the chunk of each static id (kept on the chunk list: statics do not move between frames)
  var staticHost = chunks._host;
  if (!staticHost) {
    staticHost = {};
    for (i = 0; i < n; i++) for (j = 0; j < chunks[i].ents.length; j++) staticHost[chunks[i].ents[j].id] = i;
    try { Object.defineProperty(chunks, '_host', { value: staticHost, enumerable: false, configurable: true }); } catch (e) { /* frozen: rebuilt per frame */ }
  }
  for (i = 0; i < agents.length; i++) {
    var a = agents[i], h = worldOrderHostId(a);
    a._box = worldOrderBoxOf(a, boxes, cam);
    if (h != null && byId[h] && byId[h] !== a) (kids[h] || (kids[h] = [])).push(a); else roots.push(a);
  }
  roots.sort(function (p, q) { var d = worldOrderZKey(q) - worldOrderZKey(p); return d || (worldOrderNearer(p, q) ? 1 : -1); });
  // movers with a footprint (a long boat, a swaying fern drawn live) are not points: where two overlap on screen and their
  // depth ranges meet, the footprint test decides. A topological order of those constraints, the zKey order breaking ties
  // (and any cycle): a nearer one never goes before a farther one it overlaps.
  roots = worldOrderMovers(roots);
  // slot per root (group = root + attached descendants share one slot)
  var slots = [];
  for (i = 0; i <= n; i++) slots.push(null);
  var minSlot = 0;
  function groupOf(r, acc) { acc.push(r); var c = kids[r.id]; if (c) for (var t = 0; t < c.length; t++) groupOf(c[t], acc); return acc; }
  for (i = 0; i < roots.length; i++) {
    var r = roots[i], grp = groupOf(r, []), zk = worldOrderZKey(r);
    // slot = number of chunks drawn before the agent (chunks with z0 >= zk are behind it; chunks run far to near)
    var slot = 0;
    for (k = 0; k < n; k++) { if (chunks[k].backdrop || chunks[k].z0 >= zk) slot = k + 1; else if (!chunks[k].backdrop) break; }
    var hostChunk = staticHost[worldOrderHostId(r)];
    if (hostChunk != null && hostChunk + 1 > slot) slot = hostChunk + 1;
    for (k = slot; k < n; k++) {
      var ch = chunks[k];
      if (!ch.bbox || worldOrderChunkZMax(ch) <= zk) continue;
      var hit = false;
      for (var g = 0; g < grp.length && !hit; g++) if (worldOrderOverlap(grp[g]._box, ch.bbox)) hit = true;
      if (!hit) continue;
      var found = false;
      for (g = 0; g < grp.length && !found; g++) {
        var near = worldOrderNearby(ch, grp[g]._box, boxes, cam);
        for (j = 0; j < near.length; j++) if (worldOrderNearer(grp[g], near[j])) { found = true; break; }
      }
      if (found) slot = k + 1;
    }
    if (slot < minSlot) slot = minSlot;
    minSlot = slot;
    (slots[slot] || (slots[slot] = [])).push(grp);
  }
  var out = [];
  function emitGroup(grp, upTo) {
    for (var t = 0; t < grp.length; t++) {
      var m = grp[t], mz = worldOrderZMax(m), hid = worldOrderHostId(m);
      out.push({ kind: 'agent', ref: m });
      if (!m._box) continue;
      // occluder redraws: statics drawn so far that are nearer than m and overlap it (size never exempts one, R2)
      for (var c = 0; c < upTo; c++) {
        var ch = chunks[c];
        if (!ch.bbox || ch.z0 > mz || !worldOrderOverlap(m._box, ch.bbox)) continue;
        var near = worldOrderNearby(ch, m._box, boxes, cam);
        for (var e = 0; e < near.length; e++) {
          var s = near[e];
          if (s.id !== hid && (!s.occlude || s.occlude(m._box)) && worldOrderNearer(s, m)) out.push({ kind: 'redraw', ref: s, chunk: c });
        }
      }
    }
  }
  for (i = 0; i <= n; i++) {
    var sl = slots[i];
    if (sl) for (j = 0; j < sl.length; j++) emitGroup(sl[j], i);
    if (i < n) out.push({ kind: 'chunk', ref: chunks[i] });
  }
  return out;
}

// Expand the order into per-entity last draw positions and test every overlapping pair involving a mover
// (opts.all also tests static pairs): the nearer one must be drawn later. O(movers x entities) per frame.
var _worldOrderCheckStamp = 0;
function worldOrderCheck(order, boxes, opts) {
  opts = opts || {};
  var stamp = ++_worldOrderCheckStamp, ents = [], pos = [], mov = [], p = 0, i, j;
  function put(e, mover) {
    var k;
    if (e._ocs === stamp) k = e._oci;
    else { e._ocs = stamp; k = e._oci = ents.length; ents.push(e); mov.push(false); }
    pos[k] = p++;
    if (mover) mov[k] = true;
  }
  for (i = 0; i < (order || []).length; i++) {
    var it = order[i];
    if (it.kind === 'chunk') { var es = it.ref.ents || []; for (j = 0; j < es.length; j++) put(es[j], false); }
    else put(it.ref, it.kind === 'agent');
  }
  var n = ents.length, X0 = new Float64Array(n), Y0 = new Float64Array(n), X1 = new Float64Array(n), Y1 = new Float64Array(n), has = new Uint8Array(n), movers = [];
  for (i = 0; i < n; i++) {
    var e = ents[i], b = worldOrderBoxOf(e, boxes, null) || e._box || null;
    if (e.static === false) mov[i] = true;
    if (!b) continue;
    has[i] = 1; X0[i] = b.x0; Y0[i] = b.y0; X1[i] = b.x1; Y1[i] = b.y1;
    if (mov[i]) movers.push(i);
  }
  var bad = [];
  function test(a, b) {
    var aNear = worldOrderNearer(ents[a], ents[b]);
    if (aNear ? pos[a] < pos[b] : pos[b] < pos[a]) bad.push({ a: ents[a].id, b: ents[b].id, why: (aNear ? ents[a].id : ents[b].id) + ' is nearer but drawn first' });
  }
  if (opts.all) {
    // a sweep over x: only pairs whose x ranges meet are compared
    var idx = [];
    for (i = 0; i < n; i++) if (has[i]) idx.push(i);
    idx.sort(function (a, b) { return X0[a] - X0[b]; });
    var act = [];
    for (i = 0; i < idx.length; i++) {
      var A = idx[i], keep = [];
      for (j = 0; j < act.length; j++) {
        var B = act[j];
        if (X1[B] <= X0[A]) continue;
        keep.push(B);
        if (Y0[A] < Y1[B] && Y0[B] < Y1[A] && X0[B] < X1[A]) test(B, A);
      }
      keep.push(A);
      act = keep;
    }
    return bad;
  }
  for (i = 0; i < movers.length; i++) {
    var m = movers[i], mx0 = X0[m], my0 = Y0[m], mx1 = X1[m], my1 = Y1[m];
    for (j = 0; j < n; j++) {
      if (j === m || !has[j] || (mov[j] && j < m)) continue;   // a mover pair is tested once
      if (mx0 < X1[j] && X0[j] < mx1 && my0 < Y1[j] && Y0[j] < my1) { if (ents[j].occlude && !ents[j].occlude({ x0: mx0, y0: my0, x1: mx1, y1: my1 })) continue; test(m, j); }
    }
  }
  return bad;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { worldChunks: worldChunks, worldFrameOrder: worldFrameOrder, worldOrderCheck: worldOrderCheck,
    worldOrderNearer: worldOrderNearer, worldOrderFrontZ: worldOrderFrontZ, worldOrderMovers: worldOrderMovers, WORLD_CHUNK_CAP: WORLD_CHUNK_CAP };
}
