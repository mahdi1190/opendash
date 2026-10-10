// 79-world-3order.js - World engine v3, module D: depth order and chunks (docs/dev/WORLD_ENGINE.md 2.2, 2.3, 8.4).
// Pure (Node + browser). Depth convention: larger z = farther from the camera; draw far to near.
//   worldChunks(world, nav, cam)        -> [{ i, z0, z1, ents, bbox, stand, backdrop? }]  (far to near, <= 24)
//   worldFrameOrder(chunks, agents, cam) -> [{ kind: 'chunk' | 'agent' | 'redraw', ref }]
//   worldOrderCheck(order, boxes)        -> [{ a, b, why }]   (must be empty)
// Entities/agents: { id, x, z, y?, foot?: [[x, z], ...], box?: { x0, y0, x1, y1 }, attach?, static? }.
// A screen box comes from boxes (Map / object / function), else ent.box, else cam projection.

var WORLD_CHUNK_CAP = 24;

function worldOrderFrontZ(foot, x) {
  if (typeof worldFrontZ === 'function' && worldFrontZ !== worldOrderFrontZ) {
    var r = worldFrontZ(foot, x);
    if (typeof r === 'number' && isFinite(r)) return r;
  }
  if (!foot || !foot.length) return Infinity;
  if (foot.length === 1) return foot[0][1];
  var lo = Infinity, hi = -Infinity, i;
  for (i = 0; i < foot.length; i++) { if (foot[i][0] < lo) lo = foot[i][0]; if (foot[i][0] > hi) hi = foot[i][0]; }
  if (x < lo) x = lo; if (x > hi) x = hi;
  var best = Infinity;
  for (i = 0; i < foot.length; i++) {
    var a = foot[i], b = foot[(i + 1) % foot.length];
    var ax = a[0], bx = b[0];
    if ((x >= Math.min(ax, bx)) && (x <= Math.max(ax, bx))) {
      var z = ax === bx ? Math.min(a[1], b[1]) : a[1] + (b[1] - a[1]) * (x - ax) / (bx - ax);
      if (z < best) best = z;
    }
  }
  return best;
}

function worldOrderFoot(e) { return e.foot && e.foot.length ? e.foot : [[e.x, e.z]]; }

function worldOrderZKey(e) {
  if (e._zk != null && e._zkF === e.foot && e._zkZ === e.z) return e._zk;
  var f = worldOrderFoot(e), m = Infinity;
  for (var i = 0; i < f.length; i++) if (f[i][1] < m) m = f[i][1];
  e._zk = m; e._zkF = e.foot; e._zkZ = e.z;
  return m;
}

function worldOrderZMax(e) {
  if (e._zm != null && e._zmF === e.foot && e._zmZ === e.z) return e._zm;
  var f = worldOrderFoot(e), m = -Infinity;
  for (var i = 0; i < f.length; i++) if (f[i][1] > m) m = f[i][1];
  e._zm = m; e._zmF = e.foot; e._zmZ = e.z;
  return m;
}

function worldOrderChunkZMax(ch) {
  if (ch._zm == null) { var m = -Infinity; for (var i = 0; i < ch.ents.length; i++) m = Math.max(m, worldOrderZMax(ch.ents[i])); ch._zm = m; }
  return ch._zm;
}

function worldOrderXRange(e) {
  if (e._xr && e._xrF === e.foot && e._xrX === e.x) return e._xr;
  var f = worldOrderFoot(e), lo = Infinity, hi = -Infinity;
  for (var i = 0; i < f.length; i++) { if (f[i][0] < lo) lo = f[i][0]; if (f[i][0] > hi) hi = f[i][0]; }
  e._xr = [lo, hi]; e._xrF = e.foot; e._xrX = e.x;
  return e._xr;
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
      for (var c = c0; c <= c1; c++) (cols[c] = cols[c] || []).push(i);
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

// True when a is nearer than b (a must be drawn after b). Footprint test, not anchor test (2.3 rule 3).
function worldOrderNearer(a, b) {
  if (worldOrderHostId(a) === b.id) return true;
  if (worldOrderHostId(b) === a.id) return false;
  var ka = worldOrderZKey(a), kb = worldOrderZKey(b);
  if (worldOrderZMax(a) < kb) return true;
  if (worldOrderZMax(b) < ka) return false;
  var ra = worldOrderXRange(a), rb = worldOrderXRange(b);
  var lo = Math.max(ra[0], rb[0]), hi = Math.min(ra[1], rb[1]);
  var x = lo <= hi ? (lo + hi) / 2 : (ra[1] < rb[0] ? (ra[1] + rb[0]) / 2 : (rb[1] + ra[0]) / 2);
  var da = worldOrderFrontZ(worldOrderFoot(a), x), db = worldOrderFrontZ(worldOrderFoot(b), x);
  if (Math.abs(da - db) > 1e-6) return da < db;
  var ya = a.y || 0, yb = b.y || 0;
  if (ya !== yb) return ya > yb;
  return String(a.id) > String(b.id);
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
      var px = p.x != null ? p.x : p[0], py = p.y != null ? p.y : p[1];
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
  var ents = ((world && world.entities) || []).filter(function (e) { return e.static !== false; });
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
      var b = worldOrderBoxOf(ch.ents[r], null, cam);
      if (b) { ch.ents[r].box = ch.ents[r].box || b; bb = worldOrderUnion(bb, b); }
    }
    out.push({ i: out.length, z0: ch.z0, z1: ch.z1, ents: ch.ents, bbox: bb, stand: worldOrderStandCount(nav, ch.z0, ch.z1) });
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
  var staticHost = {};
  for (i = 0; i < n; i++) for (j = 0; j < chunks[i].ents.length; j++) staticHost[chunks[i].ents[j].id] = i;
  for (i = 0; i < agents.length; i++) {
    var a = agents[i], h = worldOrderHostId(a);
    a._box = worldOrderBoxOf(a, boxes, cam);
    if (h != null && byId[h] && byId[h] !== a) (kids[h] = kids[h] || []).push(a); else roots.push(a);
  }
  roots.sort(function (p, q) { var d = worldOrderZKey(q) - worldOrderZKey(p); return d || (worldOrderNearer(p, q) ? 1 : -1); });
  // slot per root (group = root + attached descendants share one slot)
  var slots = [];
  for (i = 0; i <= n; i++) slots.push([]);
  var minSlot = 0;
  function groupOf(r, acc) { acc.push(r); var c = kids[r.id]; if (c) for (var t = 0; t < c.length; t++) groupOf(c[t], acc); return acc; }
  for (i = 0; i < roots.length; i++) {
    var r = roots[i], grp = groupOf(r, []), zk = worldOrderZKey(r);
    // slot = number of chunks drawn before the agent (chunks with z0 > zk are behind it)
    var slot = 0;
    for (k = 0; k < n; k++) if (chunks[k].backdrop || chunks[k].z0 >= zk) slot = k + 1;
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
    slots[slot].push(grp);
  }
  var out = [];
  function emitGroup(grp, upTo) {
    for (var t = 0; t < grp.length; t++) {
      var m = grp[t];
      out.push({ kind: 'agent', ref: m });
      // occluder redraws: statics drawn so far that are nearer than m and overlap it
      for (var c = 0; c < upTo; c++) {
        var ch = chunks[c];
        if (!ch.bbox || ch.z0 > worldOrderZMax(m) || !worldOrderOverlap(m._box, ch.bbox)) continue;
        var list = [], near = worldOrderNearby(ch, m._box, boxes, cam), hid = worldOrderHostId(m);
        for (var e = 0; e < near.length; e++) {
          var s = near[e];
          if (s.id !== hid && worldOrderNearer(s, m)) list.push(s);
        }
        for (e = 0; e < list.length; e++) out.push({ kind: 'redraw', ref: list[e], chunk: c });
      }
    }
  }
  for (i = 0; i <= n; i++) {
    for (j = 0; j < slots[i].length; j++) emitGroup(slots[i][j], i);
    if (i < n) out.push({ kind: 'chunk', ref: chunks[i] });
  }
  return out;
}

// Expand the order into per-entity last draw positions and test every overlapping pair involving a mover
// (opts.all also tests static pairs): the nearer one must be drawn later.
function worldOrderCheck(order, boxes, opts) {
  opts = opts || {};
  var pos = new Map(), list = [], p = 0;
  function put(e, mover) {
    if (!pos.has(e)) list.push({ e: e, mover: mover });
    pos.set(e, p++);
  }
  for (var i = 0; i < (order || []).length; i++) {
    var it = order[i];
    if (it.kind === 'chunk') { var es = it.ref.ents || []; for (var j = 0; j < es.length; j++) put(es[j], false); }
    else put(it.ref, it.kind === 'agent');
  }
  for (i = 0; i < list.length; i++) {
    var e = list[i].e;
    list[i].box = worldOrderBoxOf(e, boxes, null) || e._box || null;
    if (list[i].mover) list[i].mover = true; else list[i].mover = e.static === false;
  }
  var bad = [];
  for (i = 0; i < list.length; i++) {
    var A = list[i];
    if (!A.box) continue;
    for (j = i + 1; j < list.length; j++) {
      var B = list[j];
      if (!opts.all && !A.mover && !B.mover) continue;
      if (!worldOrderOverlap(A.box, B.box)) continue;
      var aNear = worldOrderNearer(A.e, B.e), pa = pos.get(A.e), pb = pos.get(B.e);
      if (aNear ? pa < pb : pb < pa) bad.push({ a: A.e.id, b: B.e.id, why: (aNear ? A.e.id : B.e.id) + ' is nearer but drawn first' });
    }
  }
  return bad;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { worldChunks: worldChunks, worldFrameOrder: worldFrameOrder, worldOrderCheck: worldOrderCheck,
    worldOrderNearer: worldOrderNearer, worldOrderFrontZ: worldOrderFrontZ, WORLD_CHUNK_CAP: WORLD_CHUNK_CAP };
}
