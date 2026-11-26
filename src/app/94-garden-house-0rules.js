/* ============================================================
   YOUR OWN HOUSE, the rules (FUN-ROADMAP Phase 6 "Make it yours, inside"; BIG-IDEAS era 1, your home first).
   PURE: tables and small functions, no DOM, no state of its own, no clock. Every change to the house is one op, and the
   player's page and the host's page (a friend changing your house) run this same file, so they never disagree.

   Rule 17: nothing here names a place. Your house is found by KIND from the layout (houseFindHome), its look comes from
   its home word, and every room is the same shell in room units (960 x 600, the hidden rooms' stage, 94-garden-world-4rooms.js).
   The furniture and the finishes are GARDEN_DECOR rows of cat 'home' (94-garden-0catalog.js): their size and what they
   do are on the row (hp: where it goes, hw/hd/hh: width, depth on the floor, height, top: a surface small things stand on,
   fk: what it does indoors, lit: a light, finish: 'wall' or 'floor').

     houseFindHome(things, heart, taken, doorOf) -> thing | null   the free home nearest the garden's heart
     houseFits(pieces, def, x, y, z, r, self)    -> '' | why        can this piece stand here (nothing overlaps, rule 12)
     houseOpShape(op) / houseOpCheck(W, op, who) / houseOpApply(g, op, who, W) / houseOpTouches(op, g)

   op = { o, ... }
     home  { h, k, l, day, us: [uid...] }        moving in: the house and its first things (free, never in the bag)
     put   { s, d, x, y, z, r, u, lk }           a piece from the bag set out in room s (u: its new uid)
     move  { u, x, y, z, r }                     set down somewhere else, turned (what stands on it goes with it)
     lift  { u, lk }                             put away: back in the bag (with what stands on it)
     use   { u }                                 a lamp on or off
     wall  { s, d, lk } / floor { s, d, lk }     a finish pressed on (d: the finish's id; the old one goes back in the bag)
   A friend's op (who set) is a gift to the house: what they put down costs this garden nothing, and whoever puts it away
   puts it in this garden's bag. lk: the ledger key the caller chose (so the Undo mark knows it before the op runs).
   ============================================================ */
const HOUSE_HOME_WORDS = Object.freeze(['cottage', 'house', 'oldhouse', 'bothy', 'hut', 'woodhut', 'boathouse']);
const HOUSE_LOOK_OF = Object.freeze({ cottage: 'thatch', house: 'stone', oldhouse: 'stone', bothy: 'stone', hut: 'timber', woodhut: 'timber', boathouse: 'timber' });
const HOUSE_LOOKS = Object.freeze(['thatch', 'stone', 'timber']);
const HOUSE_SLOTS = 8, HOUSE_ROOM_MAX = 24, HOUSE_WIRE_MAX = 72, HOUSE_TOP_MAX = 3;
const HOUSE_WALL0 = 'hfw-limewash', HOUSE_FLOOR0 = 'hff-boards';   // what every room starts with: free, never in the bag
const HOUSE_OPS = Object.freeze(['home', 'put', 'move', 'lift', 'use', 'wall', 'floor']);
/** The room's shell in room px. The front door is in the back wall, left; the window in the middle; the hearth on the right. */
const HOUSE_SHELL = Object.freeze({
  wall: Object.freeze({ x0: 0, x1: 960, y0: 150, y1: 400 }),
  floor: Object.freeze({ x0: 34, x1: 926, y0: 404, y1: 574 }),
  door: Object.freeze({ x0: 22, x1: 112, y0: 280, y1: 400 }),
  stand: Object.freeze({ x: 67, y: 420 }),            // where you stand at the door to go out
  window: Object.freeze({ x0: 294, x1: 466, y0: 202, y1: 330 }),
  hearth: Object.freeze({ x0: 598, x1: 850, y0: 150, y1: 400 }),
  fire: Object.freeze({ x0: 658, x1: 790, y0: 298, y1: 400 }),
  hang: Object.freeze({ y0: 168, y1: 382 }),         // where wall pieces may hang (under the beams, over the skirting)
  keep: Object.freeze([
    Object.freeze({ x0: 0, x1: 164, y0: 400, y1: 540, why: 'Keep the way to the door clear' }),
    Object.freeze({ x0: 606, x1: 842, y0: 400, y1: 448, why: 'Not on the hearth: that is for the fire' }),
  ]),
  back: 432,                                         // a foot further back than this stands against the wall
  spawn: Object.freeze({ x: 148, y: 470 }),
});
/** The first things in a new house: ids and where they stand (room px, foot). A candle on the table. */
const HOUSE_START = Object.freeze([
  Object.freeze({ d: 'hf-cottage-bed', x: 262, y: 452 }),
  Object.freeze({ d: 'hf-oak-chest', x: 262, y: 494 }),
  Object.freeze({ d: 'hf-dresser', x: 530, y: 434 }),
  Object.freeze({ d: 'hf-kitchen-table', x: 470, y: 522 }),
  Object.freeze({ d: 'hf-ladder-chair', x: 374, y: 516 }),
  Object.freeze({ d: 'hf-ladder-chair', x: 566, y: 516, r: 1 }),
  Object.freeze({ d: 'hf-candlestick', x: 478, y: 520, z: 58 }),
  Object.freeze({ d: 'hf-rag-rug', x: 724, y: 502 }),
  Object.freeze({ d: 'hf-armchair', x: 884, y: 474, r: 1 }),
  Object.freeze({ d: 'hf-stool', x: 640, y: 540 }),
  Object.freeze({ d: 'hf-picture', x: 196, y: 344 }),
  Object.freeze({ d: 'hf-wall-shelf', x: 904, y: 292 }),
]);
const _HS_ID_RE = /^[A-Za-z0-9_-]{1,24}$/;
const _hsOwn = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const _hsCopy = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
const _hsInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function _hsDecor(id) { return typeof gardenDecor === 'function' ? gardenDecor(id) : null; }
/** A home row's own shape: where it goes and how big it is (a row without the numbers is a small floor thing). */
function houseShape(def) {
  if (!def || !def.indoor) return null;
  return { hp: def.hp || 'floor', w: def.hw || 40, d: def.hd || 18, h: def.hh || 40, top: def.top || null, fk: def.fk || '', lit: !!def.lit, rot: !!def.rot };
}
/** The home word of a thing (cottage, bothy...), or '' when it is not a house. By kind and the words in its id, as the folk read homes. */
function houseHomeWord(t) {
  if (!t || t.kind !== 'building') return '';
  const id = String(t.id || '').toLowerCase().replace(/^(ld|lf|fk)-/, '').replace(/-\d+$/, '');
  if (/shop|hall|office|stall|icehouse|chapel|barn|mill|tower|lighthouse|folly|grotto|woodshed|smoke|hide|journal|summer/.test(id)) return '';
  for (const w of HOUSE_HOME_WORDS) if (id === w || id.endsWith(w) || id.split('-').includes(w)) return w;
  return '';
}
function houseLookOf(word) { return HOUSE_LOOK_OF[word] || 'thatch'; }
/**
 * Your house: the free home-kind building with a door, nearest the garden's heart (layout data). taken: ids that are someone
 * else's (a villager's saved home, a building with a hidden room). doorOf(t) -> {x, y} | null: its door in the layout.
 * open(t) -> bool: in land you have opened. A layout with no free house has none: no door shows, nothing breaks.
 */
function houseFindHome(things, heart, taken, doorOf, open) {
  let best = null, bd = Infinity;
  for (const t of things || []) {
    if (!t || !houseHomeWord(t) || (taken && taken.has(t.id))) continue;
    const d = doorOf ? doorOf(t) : null; if (!d) continue;
    if (open && !open(t)) continue;
    const dist = Math.hypot(d.x - heart.x, (d.y - heart.y) * 1.1);
    if (dist < bd || (dist === bd && String(t.id) < String(best.id))) { bd = dist; best = t; }
  }
  return best;
}

/* ---------- where a piece stands ---------- */
/** Its footprint on the floor (floor things, rugs, a small thing on the floor) or its picture's box (wall things), room px. */
function houseBox(p, def) {
  const S = houseShape(def); if (!S) return null;
  const hw = S.w / 2;
  if (S.hp === 'wall') return { x0: p.x - hw, x1: p.x + hw, y0: p.y - S.h, y1: p.y };
  return { x0: p.x - hw, x1: p.x + hw, y0: p.y - S.d, y1: p.y };
}
/** Its drawn picture's box (for what it would cover on the wall): from its foot up its height. */
function houseDrawn(p, def) { const S = houseShape(def); return S ? { x0: p.x - S.w / 2, x1: p.x + S.w / 2, y0: p.y - (p.z || 0) - S.h, y1: p.y - (p.z || 0) } : null; }
const _hsOver = (a, b, m) => a.x0 < b.x1 - (m || 0) && a.x1 > b.x0 + (m || 0) && a.y0 < b.y1 - (m || 0) && a.y1 > b.y0 + (m || 0);
/** The surface small things stand on, of a piece that has one: { x0, x1, y, z } (y: the foot small things take on it). */
function houseTopOf(p, def) { const S = houseShape(def); if (!S || !S.top || (p.z || 0) > 0) return null; const hw = S.top.w / 2; return { x0: p.x - hw, x1: p.x + hw, y: p.y - 2, z: S.top.h, u: p.u }; }
/** What stands on top of piece u (they go where it goes). */
function houseOnTop(pieces, u) {
  const base = pieces.find(q => q.u === u), bd = base && _hsDecor(base.d), top = base && houseTopOf(base, bd); if (!top) return [];
  return pieces.filter(q => q.u !== u && (q.z || 0) > 0 && q.s === base.s && q.y === top.y && Math.abs((q.z || 0) - top.z) < 1 && q.x >= top.x0 - 1 && q.x <= top.x1 + 1);
}
/**
 * '' when def may stand at (x, y, z) in a room holding `pieces` (the room's own, the moving one left out: self, and what rides
 * on it: skip), else the plain reason. Nothing overlaps (rule 12): pieces, rugs with rugs, the hearth, the way to the door,
 * the window and the door; a rug lies under floor things (meant to), a small thing may stand on a table's top.
 */
function houseFits(pieces, def, x, y, z, self, skip) {
  const S = houseShape(def); if (!S) return 'That does not go indoors';
  const H = HOUSE_SHELL, others = (pieces || []).filter(q => q.u !== self && !(skip && skip.has(q.u))), me = { x, y, z: z || 0 };
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'Not there';
  if (S.hp === 'wall') {
    const b = houseBox(me, def), W = H.wall;
    if (b.x0 < W.x0 + 6 || b.x1 > W.x1 - 6 || b.y0 < H.hang.y0 || b.y1 > H.hang.y1) return 'That needs a bit of wall';
    if (_hsOver(b, H.door, -6)) return 'Not over the door';
    if (_hsOver(b, H.window, -6)) return 'Not over the window';
    if (_hsOver(b, H.hearth, -4)) return 'Not on the chimney breast';
    for (const q of others) {
      const qd = _hsDecor(q.d), qs = houseShape(qd); if (!qs) continue;
      if (qs.hp === 'wall') { if (_hsOver(b, houseBox(q, qd), -4)) return 'Something hangs there already'; continue; }
      if (qs.hp === 'floor' && (q.z || 0) === 0 && q.y - qs.d < H.back && _hsOver(b, houseDrawn(q, qd), 2)) return 'Something tall stands in front of that wall';
    }
    return '';
  }
  if (z > 0) {   // a small thing on a top
    if (S.hp !== 'top') return 'That does not go on top of things';
    const sup = others.find(q => { const qd = _hsDecor(q.d), t = houseTopOf(q, qd); return t && Math.abs(t.y - y) < 1 && Math.abs(t.z - z) < 1 && x - S.w / 2 >= t.x0 - 1 && x + S.w / 2 <= t.x1 + 1; });
    if (!sup) return 'It needs something to stand on';
    const on = others.filter(q => q.u !== sup.u && (q.z || 0) > 0 && Math.abs(q.y - y) < 1 && Math.abs((q.z || 0) - z) < 1);
    if (on.length >= HOUSE_TOP_MAX) return 'There is no more room on top';
    for (const q of on) { const qs = houseShape(_hsDecor(q.d)); if (qs && Math.abs(q.x - x) < (qs.w + S.w) / 2 + 2) return 'Something is in the way there'; }
    return '';
  }
  const b = houseBox(me, def), F = H.floor;
  if (b.x0 < F.x0 || b.x1 > F.x1 || b.y0 < F.y0 - 2 || b.y1 > F.y1) return 'That would not fit there';
  for (const k of H.keep) if (_hsOver(b, k, 1)) return k.why;
  if (S.hp !== 'rug' && b.y0 < H.back) {   // against the back wall: it must not cover the door, the window or the fire, nor a picture
    const d = houseDrawn(me, def);
    if (_hsOver(d, H.window, 4)) return 'That would cover the window';
    if (_hsOver(d, H.fire, 0) || _hsOver(d, H.hearth, 8) && d.y0 < H.hearth.y1 - 40) return 'Not in front of the fire';
    for (const q of others) { const qd = _hsDecor(q.d), qs = houseShape(qd); if (qs && qs.hp === 'wall' && _hsOver(d, houseBox(q, qd), 2)) return 'That would hide the ' + String(qd.name).toLowerCase(); }
  }
  for (const q of others) {
    if ((q.z || 0) > 0) continue;
    const qd = _hsDecor(q.d), qs = houseShape(qd); if (!qs || qs.hp === 'wall') continue;
    const rugs = (S.hp === 'rug') + (qs.hp === 'rug');
    if (rugs === 1) continue;   // a rug lies under a floor thing: meant to
    if (_hsOver(b, houseBox(q, qd), 1)) return rugs ? 'Another rug is there' : 'Something is in the way there';
  }
  return '';
}
/** People's feet are blocked by floor things (not rugs, not what stands on top): [x, y, rx, ry] ellipses for _grmClamp. */
function houseBlocks(pieces, slot) {
  const out = [];
  for (const q of pieces || []) {
    if (q.s !== slot || (q.z || 0) > 0) continue;
    const S = houseShape(_hsDecor(q.d)); if (!S || S.hp === 'wall' || S.hp === 'rug') continue;
    out.push([q.x, q.y - S.d / 2, S.w / 2 + 8, S.d / 2 + 7]);
  }
  return out;
}

/* ---------- one way to change the house ---------- */
function houseOpShape(op) {
  if (!op || typeof op !== 'object' || Array.isArray(op) || !HOUSE_OPS.includes(op.o)) return 'kind';
  const id = v => _HS_ID_RE.test(String(v || '')), px = (v, hi) => Number.isInteger(v) && v >= 0 && v <= hi;
  switch (op.o) {
    case 'home': return typeof op.h === 'string' && /^[a-z][a-z0-9:,-]{0,40}$/.test(op.h) && Array.isArray(op.us) && op.us.length === HOUSE_START.length && op.us.every(id) ? '' : 'home';
    case 'put': return _hsInt(op.s, 0, HOUSE_SLOTS - 1) && id(op.u) && typeof op.d === 'string' && px(op.x, 960) && px(op.y, 640) && px(op.z || 0, 300) && px(op.r || 0, 3) ? '' : 'put';
    case 'move': return id(op.u) && px(op.x, 960) && px(op.y, 640) && px(op.z || 0, 300) && px(op.r || 0, 3) ? '' : 'move';
    case 'lift': case 'use': return id(op.u) ? '' : 'id';
    case 'wall': case 'floor': return _hsInt(op.s, 0, HOUSE_SLOTS - 1) && typeof op.d === 'string' ? '' : 'finish';
  }
  return 'kind';
}
/** The pieces of room s as rows ({u, d, s, x, y, z, r, v, l}) from the garden object. */
function housePieces(g, s) {
  const out = [];
  for (const [u, p] of Object.entries((g && g.hf) || {})) if (p && typeof p === 'object' && (s == null || p.s === s) && _hsDecor(p.d)) out.push({ u, d: p.d, s: p.s, x: p.x, y: p.y, z: p.z || 0, r: p.r || 0, v: p.v || 0, l: p.l ? 1 : 0, by: p.by || '' });
  return out;
}
/** The plain reason this op cannot happen in this house now, or ''. W: { has(item) -> n, feet: [[x, y]...] (people standing in the room) }. who: '' the owner, else a friend. */
function houseOpCheck(W, op, who) {
  if (houseOpShape(op)) return 'That cannot be done';
  W = W || {}; const g = W.g || {}, hs = g.hs || {}, hr = g.hr || {};
  const feetOn = (def, x, y, z) => { if (z || !W.feet) return ''; const S = houseShape(def); if (!S || S.hp !== 'floor') return ''; const b = houseBox({ x, y }, def); for (const [fx, fy] of W.feet) if (fx > b.x0 - 6 && fx < b.x1 + 6 && fy > b.y0 - 6 && fy < b.y1 + 8) return 'Someone is standing there'; return ''; };
  switch (op.o) {
    case 'home': return hs.home ? 'You live here already' : who ? 'That is for whoever lives here' : '';
    case 'put': {
      const def = _hsDecor(op.d), S = houseShape(def); if (!S || def.finish) return 'That does not go indoors';
      if (!hs.home) return 'Nobody lives here yet';
      if (!who && W.has && W.has('decor:' + def.id) < 1) return `You have no ${String(def.name).toLowerCase()} left to bring in`;
      if (_hsOwn(g.hf, op.u)) return 'That is set out already';
      const room = housePieces(g, op.s); if (room.length >= HOUSE_ROOM_MAX) return `There is room for ${HOUSE_ROOM_MAX} things in here: put something away first`;
      if (op.r && !S.rot) return `${def.name} looks the same either way round`;
      return houseFits(room, def, op.x, op.y, op.z || 0, op.u) || feetOn(def, op.x, op.y, op.z || 0);
    }
    case 'move': {
      const rec = _hsOwn(g.hf, op.u) ? g.hf[op.u] : null; if (!rec) return 'That is not here any more';
      const def = _hsDecor(rec.d), S = houseShape(def); if (!S) return 'That is not here any more';
      if (op.r && !S.rot) return `${def.name} looks the same either way round`;
      const room = housePieces(g, rec.s), riders = new Set(houseOnTop(room, op.u).map(q => q.u));
      return houseFits(room, def, op.x, op.y, op.z || 0, op.u, riders) || feetOn(def, op.x, op.y, op.z || 0);
    }
    case 'lift': return _hsOwn(g.hf, op.u) ? '' : 'That is put away already';
    case 'use': { const rec = _hsOwn(g.hf, op.u) ? g.hf[op.u] : null, S = rec && houseShape(_hsDecor(rec.d)); return !rec ? 'That is not here any more' : S && S.lit ? '' : 'There is nothing to switch'; }
    case 'wall': case 'floor': {
      const def = _hsDecor(op.d); if (!def || def.finish !== op.o) return op.o === 'wall' ? 'That is not for walls' : 'That is not for floors';
      if (!hs.home) return 'Nobody lives here yet';
      const room = hr[String(op.s)]; if (!room || !room.st) return 'That room is not built yet';
      const was = (op.o === 'wall' ? room.w : room.f) || (op.o === 'wall' ? HOUSE_WALL0 : HOUSE_FLOOR0);
      if (was === def.id) return op.o === 'wall' ? 'The walls are like that already' : 'The floor is like that already';
      const base = op.o === 'wall' ? HOUSE_WALL0 : HOUSE_FLOOR0;
      if (!who && def.id !== base && W.has && W.has('decor:' + def.id) < 1) return `You have no ${String(def.name).toLowerCase()} left`;
      return '';
    }
  }
  return 'That cannot be done';
}
/** The rows an op writes, before it runs (the Undo mark keeps their old values). */
function houseOpTouches(op, g) {
  g = g || {};
  const rows = [];
  const piece = u => { rows.push(['hf', u]); if (!g.led) return; rows.push(['led', 'hf.' + u], ['led', 'hfb.' + u]); };
  switch (op.o) {
    case 'home': for (const k of ['home', 'kind', 'look', 'm']) rows.push(['hs', k]); rows.push(['hr', '0']); for (const u of op.us || []) rows.push(['hf', u]); break;
    case 'put': rows.push(['hf', op.u]); if (op.lk) rows.push(['led', op.lk]); break;
    case 'move': { rows.push(['hf', op.u]); for (const q of houseOnTop(housePieces(g, (g.hf && g.hf[op.u] || {}).s), op.u)) rows.push(['hf', q.u]); break; }
    case 'lift': { piece(op.u); for (const q of houseOnTop(housePieces(g, (g.hf && g.hf[op.u] || {}).s), op.u)) piece(q.u); break; }
    case 'use': rows.push(['hf', op.u]); break;
    case 'wall': case 'floor': rows.push(['hr', String(op.s)]); if (op.lk) rows.push(['led', op.lk]); break;
  }
  return rows;
}
/** Apply one checked op to the garden object g, once. -> { dirty: [[map, key]] }. W.now, W.today: the caller's clock. */
function houseOpApply(g, op, who, W) {
  W = W || {}; const now = Number(W.now) || 0, today = W.today || '', dirty = [];
  const map = k => { if (!g[k] || typeof g[k] !== 'object' || Array.isArray(g[k])) g[k] = {}; return g[k]; };
  const touch = (k, id) => dirty.push([k, id]);
  const away = u => {   // a piece back into this garden's bag: its own line goes if it is still there, else a line gives it back
    const rec = map('hf')[u]; if (!rec) return;
    delete g.hf[u]; touch('hf', u);
    const led = map('led');
    if (_hsOwn(led, 'hf.' + u)) { delete led['hf.' + u]; touch('led', 'hf.' + u); }
    else { led['hfb.' + u] = { d: today, k: 'hs', i: { ['decor:' + rec.d]: 1 }, n: 0 }; touch('led', 'hfb.' + u); }
  };
  switch (op.o) {
    case 'home': {
      const hs = map('hs'); hs.home = op.h; hs.kind = op.k || 'cottage'; hs.look = op.l || houseLookOf(op.k); hs.m = op.day || today;
      for (const k of ['home', 'kind', 'look', 'm']) touch('hs', k);
      map('hr')['0'] = { st: 2, w: HOUSE_WALL0, f: HOUSE_FLOOR0, at: now }; touch('hr', '0');
      HOUSE_START.forEach((p, i) => { const u = op.us[i]; map('hf')[u] = { d: p.d, s: 0, x: p.x, y: p.y, z: p.z || 0, r: p.r || 0, v: 0, l: 0, at: now }; touch('hf', u); });
      break;
    }
    case 'put': {
      map('hf')[op.u] = Object.assign({ d: op.d, s: op.s, x: op.x, y: op.y, z: op.z || 0, r: op.r || 0, v: 0, l: 0, at: now }, who ? { by: who } : {});
      touch('hf', op.u);
      if (!who && op.lk) { map('led')[op.lk] = { d: today, k: 'hs', i: { ['decor:' + op.d]: -1 }, n: 0 }; touch('led', op.lk); }   // (out of your bag; a friend's came out of theirs)
      break;
    }
    case 'move': {
      const rec = map('hf')[op.u], dx = op.x - rec.x, dy = op.y - rec.y, riders = houseOnTop(housePieces(g, rec.s), op.u);
      rec.x = op.x; rec.y = op.y; rec.z = op.z || 0; rec.r = op.r || 0; rec.at = now; touch('hf', op.u);
      for (const q of riders) { const r = g.hf[q.u]; r.x = Math.max(0, Math.min(960, r.x + dx)); r.y = Math.max(0, Math.min(640, r.y + dy)); touch('hf', q.u); }
      break;
    }
    case 'lift': { const riders = houseOnTop(housePieces(g, (g.hf[op.u] || {}).s), op.u); for (const q of riders) away(q.u); away(op.u); break; }
    case 'use': { const rec = map('hf')[op.u]; rec.l = rec.l ? 0 : 1; touch('hf', op.u); break; }
    case 'wall': case 'floor': {
      const room = map('hr')[String(op.s)], base = op.o === 'wall' ? HOUSE_WALL0 : HOUSE_FLOOR0, key = op.o === 'wall' ? 'w' : 'f', was = room[key] || base;
      room[key] = op.d; room.at = now; touch('hr', String(op.s));
      const i = {}; if (!who && op.d !== base) i['decor:' + op.d] = -1; if (was !== base) i['decor:' + was] = (i['decor:' + was] || 0) + 1;   // (the new one out of your bag, the old one back in this garden's)
      if (op.lk && Object.keys(i).length) { map('led')[op.lk] = { d: today, k: 'hs', i, n: 0 }; touch('led', op.lk); }
      break;
    }
  }
  return { dirty };
}

/* ---------- what friends are told ---------- */
/** The house for the snapshot (`hs`): ids and numbers, every value inside GARDEN_SCHEMA's bounds (lib/friends/garden.mjs). null: nobody lives here. */
function houseWire(g) {
  const hs = (g && g.hs) || {}; if (!hs.home || !/^[a-z][a-z0-9:,-]{0,40}$/.test(String(hs.home))) return null;
  const clampI = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
  const out = { h: String(hs.home), k: /^[a-z]{1,16}$/.test(String(hs.kind || '')) ? hs.kind : 'cottage', l: HOUSE_LOOKS.includes(hs.look) ? hs.look : 'thatch', r: [], f: [] };
  for (const [s, r] of Object.entries(g.hr || {})) {
    const slot = Number(s); if (!_hsInt(slot, 0, HOUSE_SLOTS - 1) || !r || typeof r !== 'object' || out.r.length >= HOUSE_SLOTS) continue;
    const w = _hsDecor(r.w), f = _hsDecor(r.f);
    out.r.push([slot, clampI(r.st, 0, 3), w && w.finish === 'wall' ? w.id : '-', f && f.finish === 'floor' ? f.id : '-', clampI(r.c, 0, 255)]);
  }
  const rows = housePieces(g).filter(p => _HS_ID_RE.test(p.u)).sort((a, b) => a.s - b.s || (a.z > 0) - (b.z > 0) || a.u.localeCompare(b.u));
  for (const p of rows.slice(0, HOUSE_WIRE_MAX)) out.f.push([p.u, p.d, clampI(p.s, 0, 7), clampI(p.x, 0, 960), clampI(p.y, 0, 640), clampI(p.z, 0, 300), clampI(p.r, 0, 3), clampI(p.v, 0, 7), p.l ? 1 : 0]);
  return out;
}
/** A friend's house from their snapshot's `hs` (cleaned by gardenSnapshotClean): { home, kind, look, rooms: {slot: {st, w, f}}, pieces: [...] }. */
function houseFromWire(hs) {
  if (!hs || !hs.h) return null;
  const rooms = {}, pieces = [];
  for (const r of hs.r || []) rooms[String(r[0])] = { st: r[1], w: r[2] === '-' ? HOUSE_WALL0 : r[2], f: r[3] === '-' ? HOUSE_FLOOR0 : r[3], c: r[4] || 0 };
  for (const f of hs.f || []) pieces.push({ u: f[0], d: f[1], s: f[2], x: f[3], y: f[4], z: f[5] || 0, r: f[6] || 0, v: f[7] || 0, l: f[8] ? 1 : 0 });
  return { home: hs.h, kind: hs.k || 'cottage', look: HOUSE_LOOKS.includes(hs.l) ? hs.l : 'thatch', rooms, pieces };
}
