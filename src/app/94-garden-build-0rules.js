/* ============================================================
   BUILD YOUR VALE, phase 1 (C:/tmp/r3/design/build-PLAN.md sections 2.1 and 7): ONE WAY TO CHANGE THE GARDEN.
   PURE: no DOM, no state of its own, no clock. Every change to a garden is one op, and every place that changes a garden
   runs this same file, so they can never disagree about what is allowed:
     the player's page and the host's page (94-garden-build-1do.js gardenDo, 94-garden-live-3host.js),
     lib/friends/live.mjs (gardenOpShape: what may cross the wire) and lib/agent-engine.mjs (the assistant's garden tool).

     op = { o, ... }   o: put | lift | turn | plant | dig | water | drop | grab
       put    { i: 'decor:<id>', x, y, r?, u }           a thing from your bag, set out (u: its new uid)
       lift   { u }                                       a set-out thing back into the bag
       turn   { u, s? }                                   a quarter turn (s: the next look instead)
       plant  { i: 'seed:<id>', x, y, u, v }              a seed from your bag (v: its look)
       dig    { u }                                       a plant dug up
       water  { u }                                       one plant watered
       drop   { i: 'thing:<id>', fx, fy }                 something carried, set down where you stand (fx, fy: tenths of a cell). It stays,
                                                          for everyone, and anyone there may pick it up again
       grab   { i: 'thing:<id>' }                         pick it up (from where it lies, or from its own place in the layout)
     Undo ops (gardenOpApply hands them back as `inverse`) may also carry rec / to / un: the exact record to put back.

   gardenOpShape(op)              -> '' | why    the op's own shape (ids, numbers in bounds): the wire's check, needs no garden
   gardenOpCheck(world, op, who)  -> '' | why    the plain reason it cannot happen in this garden now, or ''
   gardenOpApply(g, op, who, world) -> { inverse, dirty }   writes the garden object g, once; dirty: the [map, key] rows it touched
   gardenOpTouches(op, g)         -> [[map, key]]  the rows an op will write (for the Undo mark, before it is applied)
   gardenDropKey(item)            -> the one key a thing lies under in g.dr (a thing is in one place only: it can never be two)

   `world` is what this garden is like now, worked out by the caller (the page from its model, Node from the page engine):
     { cols, rows, now, today, placeOk(kind, def, x, y, ignoreUid) -> '' | why, has(item) -> n, plant(id), decor(id),
       thing(id) -> { id, x, y, carry } | null (a thing of the layout that can be carried), free(x, y) -> bool,
       heldBy(item) -> '' | who (somebody carries it now: '@host' the garden's owner, else a friend's id), waterWhy(uid) -> '' | why, dry(uid) -> hours of thirst }
   Rule 17: what can be carried is said by the thing's KIND (GARDEN_KINDS acts with carry), never by a name or a cell.
   ============================================================ */
const GARDEN_OPS = Object.freeze(['put', 'lift', 'turn', 'plant', 'dig', 'water', 'drop', 'grab']);
const GB_DROP_MAX = 40;          // things lying about in one garden (the snapshot's bound, build-PLAN 3.6)
const GB_HOME_NEAR = 0.6;        // set down this close to its own place in the layout, a thing is back home (no record at all)
const _GB_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const _GB_ITEM_RE = /^(thing|decor|seed):([A-Za-z0-9_-]{1,60})$/;
function _gbOwn(o, k) { return !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
function _gbCopy(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
/** 'thing:ga-log' -> { k: 'thing', id: 'ga-log' }, or null. */
function gardenOpItem(item) { const m = _GB_ITEM_RE.exec(String(item || '')); return m ? { k: m[1], id: m[2] } : null; }
/** The key a dropped thing lies under: a layout thing has exactly one (its own id), so two people can never make two of it. */
function gardenDropKey(item) { const it = gardenOpItem(item); return it && it.k === 'thing' ? it.id : ''; }
/** The op's own shape. Needs no garden: the server checks this before the page ever hears of it. */
function gardenOpShape(op) {
  if (!op || typeof op !== 'object' || Array.isArray(op)) return 'shape';
  if (!GARDEN_OPS.includes(op.o)) return 'kind';
  const cell = (v, n) => Number.isInteger(v) && v >= 0 && v < n, tenth = (v, n) => Number.isInteger(v) && v >= 0 && v <= n * 10;
  const C = typeof GARDEN_WORLD !== 'undefined' ? GARDEN_WORLD : { cols: 96, rows: 96 };
  const it = op.i != null ? gardenOpItem(op.i) : null;
  if (op.i != null && !it) return 'item';
  if (op.u != null && !_GB_ID_RE.test(String(op.u))) return 'id';
  switch (op.o) {
    case 'put': if (!it || it.k !== 'decor' || !cell(op.x, C.cols) || !cell(op.y, C.rows) || !_GB_ID_RE.test(String(op.u || ''))) return 'put'; if (op.r != null && !(Number.isInteger(op.r) && op.r >= 0 && op.r <= 3)) return 'turn'; return '';
    case 'plant': if (!it || it.k !== 'seed' || !cell(op.x, C.cols) || !cell(op.y, C.rows) || !_GB_ID_RE.test(String(op.u || ''))) return 'plant'; return '';
    case 'lift': case 'turn': case 'dig': case 'water': return _GB_ID_RE.test(String(op.u || '')) ? '' : 'id';
    case 'drop': if (!it || it.k !== 'thing' || !tenth(op.fx, C.cols) || !tenth(op.fy, C.rows)) return 'drop'; return '';
    case 'grab': return it && it.k === 'thing' ? '' : 'grab';
  }
  return 'kind';
}
/** The plain reason this op cannot happen in this garden now, or ''. who: '' you (the garden's owner), else a friend's id. */
function gardenOpCheck(world, op, who) {
  const shape = gardenOpShape(op); if (shape) return 'That cannot be done';
  const W = world || {}, g = W.g || {};
  switch (op.o) {
    case 'put': {
      const id = gardenOpItem(op.i).id, def = W.decor && W.decor(id); if (!def) return 'Unknown decoration';
      if (!who && W.has && W.has(op.i) < 1) return `You have no ${String(def.name).toLowerCase()} to place: the shop has them`;
      if (_gbOwn(g.decor, op.u)) return 'That is placed already';
      return W.placeOk ? W.placeOk('decor', def, op.x, op.y) : '';
    }
    case 'plant': {
      const id = gardenOpItem(op.i).id, def = W.plant && W.plant(id); if (!def) return 'Unknown seed';
      if (def.special === 'heart') return 'That cannot be planted';
      if (!who && W.has && W.has(op.i) < 1) return `No ${def.name} seeds left: the shop has more`;
      if (_gbOwn(g.plants, op.u)) return 'That is planted already';
      return W.placeOk ? W.placeOk('plant', def, op.x, op.y) : '';
    }
    case 'lift': return _gbOwn(g.decor, op.u) ? '' : 'Nothing to put away';
    case 'turn': {
      const rec = _gbOwn(g.decor, op.u) ? g.decor[op.u] : null; if (!rec) return 'Nothing to turn';
      if (op.to) return '';
      const def = W.decor && W.decor(rec.d); if (!def) return 'Nothing to turn';
      if (op.s ? !(def.v > 1) : !def.rot && !(def.v > 1)) return `${def.name} looks the same every way round`;
      return '';
    }
    case 'dig': {
      const rec = _gbOwn(g.plants, op.u) ? g.plants[op.u] : null; if (!rec) return 'Nothing to dig up there';
      const def = W.plant && W.plant(rec.p); if (def && def.special === 'heart') return 'The old oak stays: it is your garden’s heart';
      return '';
    }
    case 'water': {
      if (!_gbOwn(g.plants, op.u)) return 'Nothing to water there';
      if (op.rec) return '';
      return W.waterWhy ? W.waterWhy(op.u) : '';
    }
    case 'grab': {
      const k = gardenDropKey(op.i), lying = _gbOwn(g.dr, k), t = W.thing && W.thing(k);
      if (!t && !lying) return 'That is not something you can pick up';
      const by = W.heldBy ? W.heldBy(op.i) : '';
      if (by && by !== (who || '@host')) return 'Someone is carrying that already';
      return '';
    }
    case 'drop': {
      const k = gardenDropKey(op.i), t = W.thing && W.thing(k);
      if (!t && !_gbOwn(g.dr, k)) return 'That is not something you can put down';
      const by = W.heldBy ? W.heldBy(op.i) : '';
      if (by && by !== (who || '@host')) return 'Someone else is carrying that';
      const x = op.fx / 10, y = op.fy / 10;
      if (W.free && !W.free(x, y)) return 'There is no room just there';
      const home = t && Math.hypot(t.x - x, t.y - y) <= GB_HOME_NEAR;
      if (!home && !_gbOwn(g.dr, k) && Object.keys(g.dr || {}).length >= GB_DROP_MAX) return 'Plenty is lying about already: put something back first';
      return '';
    }
  }
  return 'That cannot be done';
}
/** The rows an op writes, before it is applied (the page's Undo mark keeps their old values). */
function gardenOpTouches(op, g) {
  g = g || {};
  switch (op.o) {
    case 'put': return [['decor', op.u], ['disc', gardenOpItem(op.i).id]];
    case 'lift': case 'turn': return [['decor', op.u]];
    case 'plant': return [['plants', op.u], ['disc', gardenOpItem(op.i).id], ['led', op.lk || 'p.' + (op.day || '') + '.' + op.u]];
    case 'dig': return [['plants', op.u], ...(op.un || []).map(k => ['led', k])];
    case 'water': return [['plants', op.u], ['wl', op.day || '']];
    case 'drop': case 'grab': return [['dr', gardenDropKey(op.i)]];
  }
  return [];
}
/** Apply one op to the garden object g (already checked). -> { inverse (the op that takes it back), dirty ([map, key] rows written) }. */
function gardenOpApply(g, op, who, world) {
  const W = world || {}, now = Number(op.at) || Number(W.now) || 0, today = op.day || W.today || '', dirty = [];
  const map = (k) => { if (!g[k] || typeof g[k] !== 'object' || Array.isArray(g[k])) g[k] = {}; return g[k]; };
  const touch = (k, id) => dirty.push([k, id]);
  switch (op.o) {
    case 'put': {
      const id = gardenOpItem(op.i).id, def = (W.decor && W.decor(id)) || {};
      map('decor')[op.u] = op.rec ? _gbCopy(op.rec) : Object.assign({ d: id, x: op.x, y: op.y, r: def.rot ? ((Number(op.r) || 0) & 3) : 0, v: 0, at: now }, who ? { by: who, from: who } : {});
      touch('decor', op.u);
      if (!op.rec && !map('disc')[id]) { g.disc[id] = today; touch('disc', id); }
      return { inverse: { o: 'lift', u: op.u }, dirty };
    }
    case 'lift': {
      const rec = _gbCopy(map('decor')[op.u]); delete g.decor[op.u]; touch('decor', op.u);
      return { inverse: { o: 'put', i: 'decor:' + (rec && rec.d), x: rec ? rec.x : 0, y: rec ? rec.y : 0, u: op.u, rec }, dirty };
    }
    case 'turn': {
      const rec = map('decor')[op.u], was = { r: Number(rec.r) || 0, v: Number(rec.v) || 0 }, def = (W.decor && W.decor(rec.d)) || {};
      if (op.to) { rec.r = op.to.r; rec.v = op.to.v; }
      else if (!op.s && def.rot) rec.r = ((Number(rec.r) || 0) + 1) & 3;
      else rec.v = ((Number(rec.v) || 0) + 1) % Math.max(1, def.v || 1);
      rec.at = now; touch('decor', op.u);
      return { inverse: { o: 'turn', u: op.u, to: was }, dirty };
    }
    case 'plant': {
      const id = gardenOpItem(op.i).id, lk = op.lk || 'p.' + today + '.' + op.u;
      map('plants')[op.u] = op.rec ? _gbCopy(op.rec) : Object.assign({ p: id, x: op.x, y: op.y, t: now, w: now, v: Number(op.v) || 0 }, who ? { by: who } : {});
      touch('plants', op.u);
      let fresh = false;
      if (!op.rec) { map('led')[lk] = { d: today, k: 'p', i: { ['seed:' + id]: -1 }, x: 2, n: 1 }; touch('led', lk); if (!map('disc')[id]) { g.disc[id] = today; fresh = true; touch('disc', id); } }
      return { inverse: { o: 'dig', u: op.u, un: op.rec ? [] : [lk], ...(fresh ? { undisc: id } : {}) }, dirty, fresh };
    }
    case 'dig': {
      const rec = _gbCopy(map('plants')[op.u]); delete g.plants[op.u]; touch('plants', op.u);
      const led = {}; for (const k of op.un || []) { if (_gbOwn(map('led'), k)) { led[k] = _gbCopy(g.led[k]); delete g.led[k]; touch('led', k); } }
      if (op.undisc && _gbOwn(map('disc'), op.undisc)) { delete g.disc[op.undisc]; touch('disc', op.undisc); }
      return { inverse: { o: 'plant', i: 'seed:' + (rec && rec.p), x: rec ? rec.x : 0, y: rec ? rec.y : 0, u: op.u, rec, led }, dirty };
    }
    case 'water': {
      const pl = map('plants')[op.u], was = _gbCopy(pl), day = op.day || today, wl = map('wl');
      const wasDay = _gbCopy(wl[day]);
      if (op.rec) { map('plants')[op.u] = _gbCopy(op.rec); if (op.wl === undefined) delete wl[day]; else wl[day] = _gbCopy(op.wl); }
      else { const dry = Number(op.dry != null ? op.dry : W.dry ? W.dry(op.u) : 0) || 0; pl.dh = Math.round(((Number(pl.dh) || 0) + dry) * 10) / 10; pl.w = now; (wl[day] = wl[day] || {})[op.u] = 1; }
      touch('plants', op.u); touch('wl', day);
      return { inverse: { o: 'water', u: op.u, day, rec: was, wl: wasDay }, dirty };
    }
    case 'drop': {
      const k = gardenDropKey(op.i), dr = map('dr'), was = _gbCopy(dr[k]), t = W.thing && W.thing(k);
      const x = op.fx / 10, y = op.fy / 10;
      if (op.rec === null || (!op.rec && t && Math.hypot(t.x - x, t.y - y) <= GB_HOME_NEAR)) delete dr[k];   // back in its own place: nothing to remember
      else dr[k] = op.rec ? _gbCopy(op.rec) : Object.assign({ i: op.i, x: op.fx, y: op.fy, at: now }, who ? { by: who } : {});
      touch('dr', k);
      return { inverse: { o: 'grab', i: op.i, rec: was === undefined ? null : was }, dirty };
    }
    case 'grab': {
      const k = gardenDropKey(op.i), dr = map('dr'), was = _gbCopy(dr[k]), t = W.thing && W.thing(k);
      if (op.rec) dr[k] = _gbCopy(op.rec); else delete dr[k];
      touch('dr', k);
      const at = was || (t ? { x: Math.round(t.x * 10), y: Math.round(t.y * 10) } : { x: 0, y: 0 });
      return { inverse: { o: 'drop', i: op.i, fx: at.x, fy: at.y, rec: was === undefined ? null : was }, dirty };
    }
  }
  return { inverse: null, dirty };
}
/** Where a thing lies now, from a garden's g.dr (or a snapshot's dr rows), in cells: { x, y } or null. */
function gardenDropRows(g) {
  const out = [];
  for (const [k, e] of Object.entries((g && g.dr) || {})) if (e && _GB_ID_RE.test(k) && Number.isInteger(e.x) && Number.isInteger(e.y)) out.push([k, String(e.i || ('thing:' + k)), e.x, e.y]);
  return out.slice(0, GB_DROP_MAX);
}
/** A snapshot's dr rows, cleaned: [[key, item, x tenths, y tenths]], at most GB_DROP_MAX, one per key. */
function gardenDropClean(rows) {
  if (!Array.isArray(rows)) return [];
  const C = typeof GARDEN_WORLD !== 'undefined' ? GARDEN_WORLD : { cols: 96, rows: 96 }, seen = new Set(), out = [];
  for (const r of rows.slice(0, GB_DROP_MAX)) {
    if (!Array.isArray(r) || r.length !== 4 || !_GB_ID_RE.test(String(r[0])) || seen.has(r[0]) || gardenDropKey(r[1]) !== r[0]) continue;
    if (!Number.isInteger(r[2]) || !Number.isInteger(r[3]) || r[2] < 0 || r[3] < 0 || r[2] > C.cols * 10 || r[3] > C.rows * 10) continue;
    seen.add(r[0]); out.push([r[0], r[1], r[2], r[3]]);
  }
  return out;
}
