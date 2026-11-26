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
     jar   { s, c, t, st, lk, day }              coins, timber and stone into the builders' jar for room s (HOUSE_PLAN); full, the
                                                 builders come that night: the room is ready the next day (st 3, d)
     help  { s, day, seed }                      a friend lends the builders a hand: the room is finished at once
     ready { s, day, seed }                      the builders' day has come (the owner's page): the room is finished
     guest { s, n }                              the guest room named for a friend (n: the name they show) or for nobody ('')
     banner { b }                                your banner, a little flag on a grid (HOUSE_BANNER: one letter a square)
     dye   { u, v }                              a piece of cloth dipped in a dye pot: its colour (v, 0-7)
   A friend's op (who set) is a gift to the house: what they put down costs this garden nothing, and whoever puts it away
   puts it in this garden's bag. lk: the ledger key the caller chose (so the Undo mark knows it before the op runs).
   A room finished makes way: what stands where its new doorway opens moves over, or goes back in the bag (houseMakeWay).
   ============================================================ */
const HOUSE_HOME_WORDS = Object.freeze(['cottage', 'house', 'oldhouse', 'bothy', 'hut', 'woodhut', 'boathouse']);
const HOUSE_LOOK_OF = Object.freeze({ cottage: 'thatch', house: 'stone', oldhouse: 'stone', bothy: 'stone', hut: 'timber', woodhut: 'timber', boathouse: 'timber' });
const HOUSE_LOOKS = Object.freeze(['thatch', 'stone', 'timber']);
const HOUSE_SLOTS = 8, HOUSE_ROOM_MAX = 24, HOUSE_WIRE_MAX = 72, HOUSE_TOP_MAX = 3;
const HOUSE_WALL0 = 'hfw-limewash', HOUSE_FLOOR0 = 'hff-boards';   // what every room starts with: free, never in the bag
const HOUSE_OPS = Object.freeze(['home', 'put', 'move', 'lift', 'use', 'wall', 'floor', 'jar', 'help', 'ready', 'guest', 'banner', 'dye']);
const _hsF = Object.freeze, _hsBox = (x0, x1, y0, y1, o) => _hsF(Object.assign({ x0, x1, y0, y1 }, o || {}));
/** The hearth room's shell in room px (the first room, slot 0). The front door is in the back wall, left; the window in the middle;
 *  the hearth on the right. Every room's way back is the door on its left; the way on, once that room is built, on its right. */
const HOUSE_SHELL = _hsF({
  slot: 0, kind: 'hearth',
  wall: _hsBox(0, 960, 150, 400),
  floor: _hsBox(34, 926, 404, 574),
  door: _hsBox(30, 104, 302, 400),                   // (1.35 times the figure's height)
  stand: _hsF({ x: 67, y: 420 }),                    // where you stand at the door to go out
  window: _hsBox(294, 466, 202, 330, { kind: 'casement' }),
  hearth: _hsBox(598, 850, 150, 400),
  fire: _hsBox(658, 790, 298, 400),
  hang: _hsF({ y0: 168, y1: 382 }),                  // where wall pieces may hang (under the beams, over the skirting)
  keep: _hsF([
    _hsBox(0, 164, 400, 540, { why: 'Keep the way to the door clear' }),
    _hsBox(606, 842, 400, 448, { why: 'Not on the hearth: that is for the fire' }),
  ]),
  back: 432,                                         // a foot further back than this stands against the wall
  spawn: _hsF({ x: 148, y: 470 }),
  left: -1,                                          // the left door: -1 out of the house, else the room it leads back to
  ceil: _hsF([[0, 150], [960, 150]]),                // the line where the wall meets the ceiling (a sloping roof comes lower)
});
/** The rooms you build on, one at a time (FUN-ROADMAP Phase 6): each is reached through the room before it (from), on that room's
 *  right; cost: coins, timber and stone (the builders' jar; friends can put in too). The builders come the night the jar is full. */
const HOUSE_PLAN = _hsF([
  _hsF({ s: 1, id: 'parlour', name: 'The parlour', from: 0, cost: _hsF({ c: 250, t: 6, st: 4 }), via: 'doorway', blurb: 'Through the kitchen wall: a sitting room with a little fireplace and a window seat in a bay.', use: 'Sit by its fire once a day: a quiet minute and a small gift.' }),
  _hsF({ s: 2, id: 'loft', name: 'The loft', from: 1, cost: _hsF({ c: 400, t: 10, st: 4 }), via: 'ladder', blurb: 'Up a ladder from the parlour, under the thatch, with a round window over the vale.', use: 'Look out over the vale, and nap under the rafters.' }),
  _hsF({ s: 3, id: 'guest', name: 'The guest room', from: 2, cost: _hsF({ c: 500, t: 8, st: 8 }), via: 'door', blurb: 'Off the loft: a little room for a friend, with their name on the door.', use: 'Name it for a friend: their name goes on the door, and they get a key.' }),
]);
const HOUSE_PLAN_OF = new Map(HOUSE_PLAN.map(r => [r.s, r]));
const HOUSE_ROOM_NAMES = _hsF({ 0: 'The kitchen', 1: 'The parlour', 2: 'The loft', 3: 'The guest room' });
/** The other rooms' shells, as they are with nothing built beyond them (houseShellFor adds the way on). */
const _HS_SHELLS = _hsF({
  // the parlour: a doorway back to the kitchen, a bay window with a seat, a small fireplace with a mantel, the loft ladder at the right
  1: _hsF({
    slot: 1, kind: 'parlour', wall: _hsBox(0, 960, 150, 400), floor: _hsBox(34, 926, 404, 574),
    door: _hsBox(30, 104, 300, 400), stand: _hsF({ x: 67, y: 420 }), left: 0,
    window: _hsBox(300, 520, 190, 334, { kind: 'bay' }),
    hearth: _hsBox(600, 764, 236, 400), fire: _hsBox(648, 716, 322, 400),
    hang: _hsF({ y0: 168, y1: 382 }), back: 432, spawn: _hsF({ x: 148, y: 470 }), ceil: _hsF([[0, 150], [960, 150]]),
    keep: _hsF([_hsBox(0, 164, 400, 540, { why: 'Keep the way through clear' }), _hsBox(606, 758, 400, 440, { why: 'Not on the hearth: that is for the fire' })]),
    way: _hsBox(838, 914, 148, 400, { to: 2, kind: 'ladder', stand: _hsF({ x: 876, y: 424 }), spawn: _hsF({ x: 862, y: 456 }), keep: _hsBox(816, 936, 400, 468, { why: 'Keep the foot of the ladder clear' }) }),
  }),
  // the loft: under the roof, the gable wall with a round window, the ladder down through a hatch on the left, a door to the guest room
  2: _hsF({
    slot: 2, kind: 'loft', wall: _hsBox(0, 960, 36, 400), floor: _hsBox(34, 926, 404, 574),
    door: _hsBox(40, 140, 336, 404), stand: _hsF({ x: 168, y: 432 }), left: 1, hatch: 1,
    window: _hsBox(426, 534, 150, 258, { kind: 'round' }),
    hearth: null, fire: null,
    hang: _hsF({ y0: 160, y1: 382 }), back: 432, spawn: _hsF({ x: 176, y: 458 }), ceil: _hsF([[0, 292], [480, 36], [960, 292]]),
    keep: _hsF([_hsBox(0, 196, 400, 486, { why: 'Keep the top of the ladder clear' })]),
    way: _hsBox(812, 886, 300, 400, { to: 3, kind: 'door', stand: _hsF({ x: 849, y: 420 }), spawn: _hsF({ x: 812, y: 470 }), keep: _hsBox(792, 910, 400, 472, { why: 'Keep the way to the door clear' }) }),
  }),
  // the guest room: a plank door back to the loft, a dormer window, the roof sloping down on the right
  3: _hsF({
    slot: 3, kind: 'guest', wall: _hsBox(0, 960, 150, 400), floor: _hsBox(34, 926, 404, 574),
    door: _hsBox(30, 104, 300, 400), stand: _hsF({ x: 67, y: 420 }), left: 2,
    window: _hsBox(384, 556, 196, 326, { kind: 'dormer' }),
    hearth: null, fire: null,
    hang: _hsF({ y0: 168, y1: 382 }), back: 432, spawn: _hsF({ x: 148, y: 470 }), ceil: _hsF([[0, 150], [620, 150], [960, 300]]),
    keep: _hsF([_hsBox(0, 164, 400, 540, { why: 'Keep the way to the door clear' })]),
  }),
});
/** The kitchen's way on (to the parlour), once it is built: a doorway at the right end of its back wall. */
const _HS_WAY0 = _hsBox(866, 942, 300, 400, { to: 1, kind: 'doorway', stand: _hsF({ x: 904, y: 424 }), spawn: _hsF({ x: 900, y: 462 }), keep: _hsBox(846, 960, 400, 476, { why: 'Keep the way through clear' }) });
const _HS_SHELL_MEMO = new Map();
/** The shell of room `slot` as it is now: its way on is open when the room it leads to is built (rooms: {slot: {st}}). */
function houseShellFor(slot, rooms) {
  slot = Number(slot) || 0;
  const base = slot === 0 ? HOUSE_SHELL : _HS_SHELLS[slot] || HOUSE_SHELL, way0 = slot === 0 ? _HS_WAY0 : base.way;
  const open = !!(way0 && rooms && rooms[String(way0.to)] && Number(rooms[String(way0.to)].st) === 2);
  const key = slot + '|' + (open ? 1 : 0);
  const had = _HS_SHELL_MEMO.get(key); if (had) return had;
  const keep = base.keep.slice(); if (open && way0.keep) keep.push(way0.keep);
  const sh = _hsF(Object.assign({}, base, { way: open ? way0 : null, shut: !open && way0 ? way0 : null, keep: _hsF(keep) }));
  _HS_SHELL_MEMO.set(key, sh); return sh;
}
/** How low the ceiling comes at x (room px): the top of the wall there. */
function houseCeilAt(sh, x) {
  const C = (sh && sh.ceil) || HOUSE_SHELL.ceil;
  for (let i = 1; i < C.length; i++) if (x <= C[i][0]) { const [x0, y0] = C[i - 1], [x1, y1] = C[i]; return y0 + (y1 - y0) * (x1 === x0 ? 0 : (x - x0) / (x1 - x0)); }
  return C[C.length - 1][1];
}
/** The room a slot's left door leads back to (-1: out of the house). */
function houseRoomBack(slot) { const sh = slot === 0 ? HOUSE_SHELL : _HS_SHELLS[slot]; return sh ? sh.left : -1; }
/** A room's name for people: "The parlour" (the kitchen is the house's own name outside). */
function houseRoomName(slot) { return HOUSE_ROOM_NAMES[slot] || 'A room'; }
/** The next room the plan offers (its row), given the rooms ({slot: {st}}): null when everything is built or one is on its way. */
function housePlanNext(rooms) {
  rooms = rooms || {};
  for (const r of HOUSE_PLAN) { const me = rooms[String(r.s)]; if (me && Number(me.st) === 3) return null; }   // (one at a time: the builders are busy)
  for (const r of HOUSE_PLAN) { const me = rooms[String(r.s)], from = rooms[String(r.from)]; if ((!me || !me.st) && from && Number(from.st) === 2) return r; }
  return null;
}
/** The first things in a new house: ids and where they stand (room px, foot). A candle on the table. The right end of the back
 *  wall is left clear: the doorway to the parlour opens there one day. */
const HOUSE_START = Object.freeze([
  Object.freeze({ d: 'hf-cottage-bed', x: 262, y: 452 }),
  Object.freeze({ d: 'hf-oak-chest', x: 262, y: 494 }),
  Object.freeze({ d: 'hf-dresser', x: 530, y: 434 }),
  Object.freeze({ d: 'hf-kitchen-table', x: 470, y: 522 }),
  Object.freeze({ d: 'hf-ladder-chair', x: 392, y: 516 }),
  Object.freeze({ d: 'hf-ladder-chair', x: 548, y: 516, r: 1 }),
  Object.freeze({ d: 'hf-candlestick', x: 478, y: 520, z: 48 }),
  Object.freeze({ d: 'hf-rag-rug', x: 724, y: 502 }),
  Object.freeze({ d: 'hf-armchair', x: 812, y: 512, r: 1 }),
  Object.freeze({ d: 'hf-stool', x: 640, y: 540 }),
  Object.freeze({ d: 'hf-picture', x: 196, y: 344 }),
  Object.freeze({ d: 'hf-wall-shelf', x: 530, y: 292 }),
  Object.freeze({ d: 'hf-guest-book', x: 192, y: 542 }),
]);
const _HS_ID_RE = /^[A-Za-z0-9_-]{1,24}$/;
const _hsOwn = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const _hsCopy = v => v === undefined ? undefined : JSON.parse(JSON.stringify(v));
const _hsInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
function _hsDecor(id) { return typeof gardenDecor === 'function' ? gardenDecor(id) : null; }
/** A piece's name in a sentence: 'A painted picture' is 'painted picture' after 'the'. */
function houseLowName(def) { return String((def && def.name) || 'thing').toLowerCase().replace(/^(a|an|the) /, ''); }
/** A home row's own shape: where it goes and how big it is (a row without the numbers is a small floor thing). */
const _HS_SHAPES = new Map();   // (a row's shape, worked out once: it is asked for every piece every frame while one is carried)
function houseShape(def) {
  if (!def || !def.indoor) return null;
  const had = _HS_SHAPES.get(def.id); if (had && had.def === def) return had.s;
  const s = Object.freeze({ hp: def.hp || 'floor', w: def.hw || 40, d: def.hd || 18, h: def.hh || 40, top: def.top || null, fk: def.fk || '', lit: !!def.lit, rot: !!def.rot });
  _HS_SHAPES.set(def.id, { def, s }); return s;
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

/* ---------- fairy lights: a string hung along the top of a wall (94-garden-house-7lights.js) ---------- */
/** How long a string of lights is, by its look v (room px). */
const HOUSE_SPANS = _hsF([140, 190, 240, 290, 340, 400, 460, 520]);
function houseSpan(v) { return HOUSE_SPANS[Math.max(0, Math.min(HOUSE_SPANS.length - 1, v | 0))]; }
/** A string's box: x is its left pin, y its pins' height, and it droops a seventh of its length. */
function houseStringBox(p) { const w = houseSpan(p.v); return { x0: p.x, x1: p.x + w, y0: p.y - 8, y1: p.y + w * .14 + 12 }; }
/** '' when a string of length v may hang from (x, y) in this room: along the top of the wall, under the ceiling, not over another string. */
function houseStringFits(pieces, x, y, v, self, shell) {
  const H = shell || HOUSE_SHELL, b = houseStringBox({ x, y, v });
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'Not there';
  if (b.x0 < H.wall.x0 + 8 || b.x1 > H.wall.x1 - 8) return 'It needs wall at both ends';
  if (y < Math.max(houseCeilAt(H, b.x0), houseCeilAt(H, b.x1)) + 6) return 'The ceiling is in the way there';
  if (y > H.hang.y0 + 90) return 'Fairy lights go up near the top of the wall';
  for (const q of pieces || []) { if (q.u === self) continue; const qs = houseShape(_hsDecor(q.d)); if (qs && qs.hp === 'string' && _hsOver(b, houseStringBox(q), 4)) return 'Another string is there already'; }
  return '';
}

/* ---------- where a piece stands ---------- */
/** Its footprint on the floor (floor things, rugs, a small thing on the floor) or its picture's box (wall things), room px. */
function houseBox(p, def) {
  const S = houseShape(def); if (!S) return null;
  const hw = S.w / 2;
  if (S.hp === 'string') return houseStringBox(p);
  if (S.hp === 'wall') return { x0: p.x - hw, x1: p.x + hw, y0: p.y - S.h, y1: p.y };
  return { x0: p.x - hw, x1: p.x + hw, y0: p.y - S.d, y1: p.y };
}
/** Its drawn picture's box (for what it would cover on the wall): from its foot up its height. */
function houseDrawn(p, def) { const S = houseShape(def); if (S && S.hp === 'string') return houseStringBox(p); return S ? { x0: p.x - S.w / 2, x1: p.x + S.w / 2, y0: p.y - (p.z || 0) - S.h, y1: p.y - (p.z || 0) } : null; }
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
function houseFits(pieces, def, x, y, z, self, skip, shell, v) {
  const S = houseShape(def); if (!S) return 'That does not go indoors';
  if (S.hp === 'string') return houseStringFits((pieces || []).filter(q => !(skip && skip.has(q.u))), x, y, v | 0, self, shell);
  const H = shell || HOUSE_SHELL, others = (pieces || []).filter(q => q.u !== self && !(skip && skip.has(q.u))), me = { x, y, z: z || 0 };
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 'Not there';
  if (S.hp === 'wall') {
    const b = houseBox(me, def), W = H.wall;
    if (b.x0 < W.x0 + 6 || b.x1 > W.x1 - 6 || b.y0 < H.hang.y0 || b.y1 > H.hang.y1) return 'That needs a bit of wall';
    if (b.y0 < Math.max(houseCeilAt(H, b.x0), houseCeilAt(H, b.x1)) + 10) return 'The ceiling comes down too low there';
    if (_hsOver(b, H.door, -6)) return H.hatch ? 'Not over the ladder' : 'Not over the door';
    if (H.way && _hsOver(b, H.way, -6)) return H.way.kind === 'ladder' ? 'Not over the ladder' : 'Not over the doorway';
    if (_hsOver(b, H.window, -6)) return 'Not over the window';
    if (H.hearth && _hsOver(b, H.hearth, -4)) return 'Not on the chimney breast';
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
    if (d.y0 < Math.max(houseCeilAt(H, d.x0), houseCeilAt(H, d.x1)) + 4) return 'Too tall for under the roof there';
    if (_hsOver(d, H.window, 4)) return 'That would cover the window';
    if (H.way && _hsOver(d, H.way, 2)) return H.way.kind === 'ladder' ? 'That would block the ladder' : 'That would block the doorway';
    if (H.fire && (_hsOver(d, H.fire, 0) || _hsOver(d, H.hearth, 8) && d.y0 < H.hearth.y1 - 40)) return 'Not in front of the fire';
    for (const q of others) { const qd = _hsDecor(q.d), qs = houseShape(qd); if (qs && qs.hp === 'wall' && _hsOver(d, houseBox(q, qd), 2)) return 'That would hide the ' + houseLowName(qd); }
  }
  for (const q of others) {
    if ((q.z || 0) > 0) continue;
    const qd = _hsDecor(q.d), qs = houseShape(qd); if (!qs || qs.hp === 'wall' || qs.hp === 'string') continue;
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

/* ---------- the builders' jar, your banner, the dye pot ---------- */
/** What the builders still need for room row `row`, with what is in the jar: { c, t, st }. */
function houseJarNeed(row, jar) {
  const C = (row && row.cost) || { c: 0, t: 0, st: 0 }, J = jar && row && jar.s === row.s ? jar : { c: 0, t: 0, st: 0 };
  return { c: Math.max(0, C.c - (J.c | 0)), t: Math.max(0, C.t - (J.t | 0)), st: Math.max(0, C.st - (J.st | 0)) };
}
/** Your banner: a little flag on a grid of HOUSE_BANNER.cols x rows squares, one letter a square (an index into its colours). */
const HOUSE_BANNER = _hsF({ cols: 8, rows: 6, colours: _hsF(['#f4ecd8', '#c8402e', '#e8889a', '#e8893a', '#f0c040', '#5e9a44', '#9ab88a', '#6aa8d8', '#2e4a7a', '#7a4a8a', '#7a5232', '#2a2a30']), names: _hsF(['Cream', 'Poppy red', 'Rose', 'Marigold', 'Honey', 'Leaf green', 'Sage', 'Sky', 'Navy', 'Plum', 'Oak brown', 'Charcoal']) });
const HOUSE_BANNER_RE = /^[0-9ab]{48}$/;
/** The banner every house starts with: a cream field, a gold sun, a green hill. */
const HOUSE_BANNER0 = '000000440000004400000000005555000555555555555555';
/** Dye pots: a crop boiled for its colour. v: the look a dyed piece takes (0 is its own first colours). */
const HOUSE_DYES = _hsF([
  _hsF({ v: 1, name: 'Mere blue', c: '#3f6ea8', from: _hsF(['blueberry', 'cornflower', 'bluebell']) }),
  _hsF({ v: 2, name: 'Madder red', c: '#b8382e', from: _hsF(['beetroot', 'raspberry', 'red-campion', 'poppy']) }),
  _hsF({ v: 3, name: 'Onion gold', c: '#d8a032', from: _hsF(['onion', 'marigold', 'daffodil', 'buttercup']) }),
  _hsF({ v: 4, name: 'Nettle green', c: '#5a8a3c', from: _hsF(['kale', 'mint', 'parsley', 'sage']) }),
  _hsF({ v: 5, name: 'Heather plum', c: '#7a3e7a', from: _hsF(['blackcurrant', 'lavender', 'iris']) }),
  _hsF({ v: 6, name: 'Rose pink', c: '#e07a92', from: _hsF(['rose', 'strawberry', 'peony']) }),
  _hsF({ v: 7, name: 'Carrot orange', c: '#e0782e', from: _hsF(['carrot', 'pumpkin', 'squash']) }),
]);
const HOUSE_DYE_OF = new Map(HOUSE_DYES.map(d => [d.v, d]));
/** The colour a dyed piece's cloth takes (base: its own, for v 0). */
function houseDyeCol(v, base) { const d = HOUSE_DYE_OF.get(v | 0); return d ? d.c : base; }
/** Which dye a crop gives (crop id or 'crop:id'), or null. */
function houseDyeFrom(crop) { const id = String(crop || '').replace(/^crop:/, ''); for (const d of HOUSE_DYES) if (d.from.includes(id)) return d; return null; }
/** Days since 1970 of an ISO day (for the snapshot: a number), 0 when it is not one. */
function houseDayNum(iso) { const t = Date.parse(String(iso || '') + 'T12:00:00Z'); return Number.isFinite(t) ? Math.floor(t / 86400000) : 0; }   // clock-ok: an ISO day as a number

/* ---------- making way: a new doorway opens where something stands ---------- */
/**
 * What has to move in room `slot` when its shell becomes `shell` (a doorway opened): { moves: [{u, x, y}], away: [u] }. Each piece that no
 * longer fits moves to the nearest place it does fit (what stands on it goes with it), or, with nowhere to go, back into the bag. Pure
 * and the same every time for the same house, so the Undo mark (houseOpTouches) and the change itself (houseOpApply) agree.
 */
function houseMakeWayPlan(g, slot, shell) {
  const room = housePieces(g, slot).map(p => Object.assign({}, p)), out = { moves: [], away: [] }, gone = new Set();
  const tops = new Map(); for (const p of room) tops.set(p.u, houseOnTop(room, p.u).map(q => q.u));
  const kind = p => { const S = houseShape(_hsDecor(p.d)); return S.hp === 'wall' ? 2 : S.hp === 'rug' ? 1 : 0; }, area = p => { const S = houseShape(_hsDecor(p.d)); return S.w * S.d; };
  // floor things first (the biggest first), then rugs, then wall things; small things on top go with what they stand on
  const order = room.filter(p => !(p.z > 0) && houseShape(_hsDecor(p.d)).hp !== 'string').sort((a, b) => kind(a) - kind(b) || area(b) - area(a) || a.u.localeCompare(b.u));
  for (const p of order) {
    const def = _hsDecor(p.d), S = houseShape(def), riders = new Set(tops.get(p.u) || []);
    const others = room.filter(q => !gone.has(q.u));
    if (!houseFits(others, def, p.x, p.y, 0, p.u, riders, shell)) continue;
    let best = null, bd = Infinity;
    const F = shell.floor, H = shell.hang;
    const tryAt = (x, y) => { x = Math.round(x); y = Math.round(y); const d = Math.hypot(x - p.x, (y - p.y) * 1.6); if (d >= bd) return; if (!houseFits(others, def, x, y, 0, p.u, riders, shell)) { bd = d; best = { x, y }; } };
    if (S.hp === 'wall') { for (let y = H.y0 + S.h; y <= H.y1; y += 12) for (let x = shell.wall.x0 + S.w / 2 + 8; x <= shell.wall.x1 - S.w / 2 - 8; x += 12) tryAt(x, y); }
    else for (let y = F.y0 + S.d; y <= F.y1; y += 8) for (let x = F.x0 + S.w / 2; x <= F.x1 - S.w / 2; x += 12) tryAt(x, y);
    if (best) {
      const dx = best.x - p.x, dy = best.y - p.y; out.moves.push({ u: p.u, x: best.x, y: best.y });
      const me = room.find(q => q.u === p.u); me.x = best.x; me.y = best.y;
      for (const u of riders) { const q = room.find(r => r.u === u); if (q) { q.x = Math.max(0, Math.min(960, q.x + dx)); q.y = Math.max(0, Math.min(640, q.y + dy)); out.moves.push({ u, x: q.x, y: q.y }); } }
    } else { out.away.push(p.u); gone.add(p.u); for (const u of riders) { out.away.push(u); gone.add(u); } }
  }
  return out;
}
/** The rooms with room `s` finished (for the shell the room it opens from will have). */
function _hsRoomsDone(g, s) { const r = Object.assign({}, (g && g.hr) || {}); r[String(s)] = Object.assign({}, r[String(s)] || {}, { st: 2 }); return r; }

/* ---------- one way to change the house ---------- */
function houseOpShape(op) {
  if (!op || typeof op !== 'object' || Array.isArray(op) || !HOUSE_OPS.includes(op.o)) return 'kind';
  const id = v => _HS_ID_RE.test(String(v || '')), px = (v, hi) => Number.isInteger(v) && v >= 0 && v <= hi;
  switch (op.o) {
    case 'home': return typeof op.h === 'string' && /^[a-z][a-z0-9:,-]{0,40}$/.test(op.h) && Array.isArray(op.us) && op.us.length === HOUSE_START.length && op.us.every(id) ? '' : 'home';
    case 'put': return _hsInt(op.s, 0, HOUSE_SLOTS - 1) && id(op.u) && typeof op.d === 'string' && px(op.x, 960) && px(op.y, 640) && px(op.z || 0, 300) && px(op.r || 0, 3) && px(op.v || 0, 7) ? '' : 'put';
    case 'move': return id(op.u) && px(op.x, 960) && px(op.y, 640) && px(op.z || 0, 300) && px(op.r || 0, 3) ? '' : 'move';
    case 'lift': case 'use': return id(op.u) ? '' : 'id';
    case 'wall': case 'floor': return _hsInt(op.s, 0, HOUSE_SLOTS - 1) && typeof op.d === 'string' ? '' : 'finish';
    case 'jar': return HOUSE_PLAN_OF.has(op.s) && px(op.c || 0, 99999) && px(op.t || 0, 999) && px(op.st || 0, 999) && (op.c || 0) + (op.t || 0) + (op.st || 0) > 0 ? '' : 'jar';
    case 'help': case 'ready': return HOUSE_PLAN_OF.has(op.s) && px(op.seed || 0, 9999) ? '' : 'room';
    case 'guest': return HOUSE_PLAN_OF.has(op.s) && typeof (op.n == null ? '' : op.n) === 'string' && String(op.n || '').length <= 22 ? '' : 'guest';
    case 'banner': return typeof op.b === 'string' && HOUSE_BANNER_RE.test(op.b) ? '' : 'banner';
    case 'dye': return id(op.u) && px(op.v, 7) && (op.k == null || /^crop:[a-z0-9-]{1,32}$/.test(String(op.k))) ? '' : 'dye';
  }
  return 'kind';
}
/** The pieces of room s as rows ({u, d, s, x, y, z, r, v, l}) from the garden object. */
function housePieces(g, s) {
  const out = [];
  for (const [u, p] of Object.entries((g && g.hf) || {})) if (p && typeof p === 'object' && (s == null || p.s === s) && _hsDecor(p.d)) out.push({ u, d: p.d, s: p.s, x: p.x, y: p.y, z: p.z || 0, r: p.r || 0, v: p.v || 0, l: p.l ? 1 : 0, by: p.by || '' });
  return out;
}
/** The shell of room s in this garden as it is now. */
function houseShellOfG(g, s) { return houseShellFor(s, (g && g.hr) || {}); }
/** The plain reason this op cannot happen in this house now, or ''. W: { has(item) -> n, coins, feet: [[x, y]...] (people standing in the room), today }. who: '' the owner, else a friend. */
function houseOpCheck(W, op, who) {
  if (houseOpShape(op)) return 'That cannot be done';
  W = W || {}; const g = W.g || {}, hs = g.hs || {}, hr = g.hr || {};
  const feetOn = (def, x, y, z) => { if (z || !W.feet) return ''; const S = houseShape(def); if (!S || S.hp !== 'floor') return ''; const b = houseBox({ x, y }, def); for (const [fx, fy] of W.feet) if (fx > b.x0 - 6 && fx < b.x1 + 6 && fy > b.y0 - 6 && fy < b.y1 + 8) return 'Someone is standing there'; return ''; };
  switch (op.o) {
    case 'home': return hs.home ? 'You live here already' : who ? 'That is for whoever lives here' : '';
    case 'put': {
      const def = _hsDecor(op.d), S = houseShape(def); if (!S || def.finish) return 'That does not go indoors';
      if (!hs.home) return 'Nobody lives here yet';
      const rm = hr[String(op.s)]; if (op.s !== 0 && !(rm && Number(rm.st) === 2)) return 'That room is not built yet';
      if (!who && W.has && W.has('decor:' + def.id) < 1) return `You have no ${houseLowName(def)} left to bring in`;
      if (_hsOwn(g.hf, op.u)) return 'That is set out already';
      const room = housePieces(g, op.s); if (room.length >= HOUSE_ROOM_MAX) return `There is room for ${HOUSE_ROOM_MAX} things in here: put something away first`;
      if (op.r && !S.rot) return `${def.name} looks the same either way round`;
      return houseFits(room, def, op.x, op.y, op.z || 0, op.u, null, houseShellOfG(g, op.s), op.v || 0) || feetOn(def, op.x, op.y, op.z || 0);
    }
    case 'move': {
      const rec = _hsOwn(g.hf, op.u) ? g.hf[op.u] : null; if (!rec) return 'That is not here any more';
      const def = _hsDecor(rec.d), S = houseShape(def); if (!S) return 'That is not here any more';
      if (op.r && !S.rot) return `${def.name} looks the same either way round`;
      if (S.hp === 'string') return 'Take it down and hang it again';
      const room = housePieces(g, rec.s), riders = new Set(houseOnTop(room, op.u).map(q => q.u));
      return houseFits(room, def, op.x, op.y, op.z || 0, op.u, riders, houseShellOfG(g, rec.s)) || feetOn(def, op.x, op.y, op.z || 0);
    }
    case 'lift': return _hsOwn(g.hf, op.u) ? '' : 'That is put away already';
    case 'use': { const rec = _hsOwn(g.hf, op.u) ? g.hf[op.u] : null, S = rec && houseShape(_hsDecor(rec.d)); return !rec ? 'That is not here any more' : S && S.lit ? '' : 'There is nothing to switch'; }
    case 'wall': case 'floor': {
      const def = _hsDecor(op.d); if (!def || def.finish !== op.o) return op.o === 'wall' ? 'That is not for walls' : 'That is not for floors';
      if (!hs.home) return 'Nobody lives here yet';
      const room = hr[String(op.s)]; if (!room || Number(room.st) !== 2) return 'That room is not built yet';
      const was = (op.o === 'wall' ? room.w : room.f) || (op.o === 'wall' ? HOUSE_WALL0 : HOUSE_FLOOR0);
      if (was === def.id) return op.o === 'wall' ? 'The walls are like that already' : 'The floor is like that already';
      const base = op.o === 'wall' ? HOUSE_WALL0 : HOUSE_FLOOR0;
      if (!who && def.id !== base && W.has && W.has('decor:' + def.id) < 1) return `You have no ${houseLowName(def)} left`;
      return '';
    }
    case 'jar': {
      if (!hs.home) return 'Nobody lives here yet';
      const row = HOUSE_PLAN_OF.get(op.s), me = hr[String(op.s)], next = housePlanNext(hr);
      if (me && Number(me.st) === 2) return 'That room is built already';
      if (me && Number(me.st) === 3) return 'The builders are on it already';
      if (!next || next.s !== op.s) return 'That room has to wait its turn';
      const need = houseJarNeed(row, hs.jar);
      if (!(need.c + need.t + need.st)) return 'The jar is full';
      if ((op.c || 0) > need.c || (op.t || 0) > need.t || (op.st || 0) > need.st) return 'That is more than the builders need';
      if (!who && Number.isFinite(W.coins) && (op.c || 0) > W.coins) return 'You do not have that many coins';
      if (!who && W.has && (op.t || 0) > W.has('mat:timber')) return 'You do not have that much timber';
      if (!who && W.has && (op.st || 0) > W.has('mat:stone')) return 'You do not have that much stone';
      return '';
    }
    case 'help': { if (!who) return 'The builders will be done by morning'; const me = hr[String(op.s)]; return me && Number(me.st) === 3 ? '' : 'Nobody is building that just now'; }
    case 'ready': { const me = hr[String(op.s)]; if (!me || Number(me.st) !== 3) return 'Nobody is building that just now'; return !W.today || !me.d || String(me.d) <= String(W.today) ? '' : 'The builders are not done yet'; }
    case 'guest': { const row = HOUSE_PLAN_OF.get(op.s), me = hr[String(op.s)]; if (!row || row.id !== 'guest') return 'That is not the guest room'; if (!me || Number(me.st) !== 2) return 'The guest room is not built yet'; return who ? 'That is for whoever lives here' : ''; }
    case 'banner': return !hs.home ? 'Nobody lives here yet' : hs.bn === op.b ? 'Your banner is like that already' : '';
    case 'dye': {
      const rec = _hsOwn(g.hf, op.u) ? g.hf[op.u] : null; if (!rec) return 'That is not here any more';
      const def = _hsDecor(rec.d); if (!def || !def.dye) return 'That will not take a dye';
      if ((rec.v | 0) === op.v) return op.v ? 'It is that colour already' : 'It is its own colour already';
      if (op.v && (!op.k || !houseDyeFrom(op.k) || houseDyeFrom(op.k).v !== op.v)) return 'That does not make that colour';
      if (op.v && !who && W.has && W.has(op.k) < 1) return 'You have nothing to boil for that colour';
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
    case 'jar': rows.push(['hs', 'jar'], ['hr', String(op.s)]); if (op.lk) rows.push(['led', op.lk]); break;
    case 'help': case 'ready': {
      rows.push(['hr', String(op.s)], ['hs', 'hw'], ['hs', 'hands'], ['hs', 'made']);
      const row = HOUSE_PLAN_OF.get(op.s), plan = row ? houseMakeWayPlan(g, row.from, houseShellFor(row.from, _hsRoomsDone(g, op.s))) : { moves: [], away: [] };
      for (const m of plan.moves) rows.push(['hf', m.u]); for (const u of plan.away) piece(u);
      break;
    }
    case 'guest': rows.push(['hs', 'guest']); break;
    case 'banner': rows.push(['hs', 'bn']); break;
    case 'dye': rows.push(['hf', op.u]); if (op.lk) rows.push(['led', op.lk]); break;
  }
  return rows;
}
/** Apply one checked op to the garden object g, once. -> { dirty: [[map, key]] }. W.now, W.today, W.tomorrow: the caller's clock. */
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
      map('hf')[op.u] = Object.assign({ d: op.d, s: op.s, x: op.x, y: op.y, z: op.z || 0, r: op.r || 0, v: op.v || 0, l: 0, at: now }, who ? { by: who } : {});
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
    case 'jar': {
      const hs = map('hs'), row = HOUSE_PLAN_OF.get(op.s);
      if (!hs.jar || hs.jar.s !== op.s) hs.jar = { s: op.s, c: 0, t: 0, st: 0 };
      const J = hs.jar; J.c = (J.c | 0) + (op.c || 0); J.t = (J.t | 0) + (op.t || 0); J.st = (J.st | 0) + (op.st || 0); if (who) J.f = (J.f | 0) + 1; touch('hs', 'jar');
      if (!who && op.lk) { const i = {}; if (op.t) i['mat:timber'] = -op.t; if (op.st) i['mat:stone'] = -op.st; map('led')[op.lk] = { d: today, k: 'hs', c: -(op.c || 0), i, n: 0 }; touch('led', op.lk); }   // (out of your purse; a friend's came out of theirs)
      const need = houseJarNeed(row, J);
      if (!(need.c + need.t + need.st)) { map('hr')[String(op.s)] = Object.assign({ st: 3, d: W.tomorrow || today, at: now }, J.f ? { f: J.f } : {}); touch('hr', String(op.s)); delete hs.jar; }   // (full: the builders come tonight)
      break;
    }
    case 'help': case 'ready': {
      const row = HOUSE_PLAN_OF.get(op.s), hr = map('hr');
      // the room it opens from makes way for the new doorway first (the plan is worked out with the room finished)
      const plan = houseMakeWayPlan(g, row.from, houseShellFor(row.from, _hsRoomsDone(g, op.s)));
      for (const m of plan.moves) { const r = map('hf')[m.u]; if (r) { r.x = m.x; r.y = m.y; r.at = now; touch('hf', m.u); } }
      for (const u of plan.away) away(u);
      hr[String(op.s)] = { st: 2, w: HOUSE_WALL0, f: HOUSE_FLOOR0, at: now, d: today }; touch('hr', String(op.s));
      const hs = map('hs'); hs.hw = { s: op.s, d: today, seed: op.seed | 0 }; touch('hs', 'hw');
      if (who && op.o === 'help') { const L = Array.isArray(hs.hands) ? hs.hands.slice(-11) : []; L.push([String(op.i || '?').slice(0, 1).toUpperCase(), (op.col | 0) % 16, op.s]); hs.hands = L; touch('hs', 'hands'); }
      if (plan.moves.length || plan.away.length) { hs.made = { s: row.from, n: plan.moves.length, a: plan.away.length, d: today }; touch('hs', 'made'); }
      break;
    }
    case 'guest': { const hs = map('hs'); if (op.n) hs.guest = Object.assign({ s: op.s, n: String(op.n).slice(0, 22) }, op.f ? { f: String(op.f).slice(0, 64) } : {}); else delete hs.guest; touch('hs', 'guest'); break; }
    case 'banner': { map('hs').bn = op.b; touch('hs', 'bn'); break; }
    case 'dye': {
      const rec = map('hf')[op.u]; rec.v = op.v; rec.at = now; touch('hf', op.u);
      if (!who && op.v && op.lk) { map('led')[op.lk] = { d: today, k: 'hs', i: { [op.k]: -1 }, n: 0 }; touch('led', op.lk); }
      break;
    }
  }
  return { dirty };
}

/* ---------- the housewarming: who calls, what they like, the cosy stars ---------- */
/** Who may come to a housewarming, and the kinds of things each makes for first (rule 17: a kind, never a place). The old angler, Hollin
 *  and Perpetua never come (the story, Hollin's own arc, and the post is her round). night: only after dusk (an owl). */
const HOUSE_CALLERS = _hsF([
  _hsF({ id: 'thistle', likes: _hsF(['seat', 'bed', 'fire']), gift: 'hf-braided-rug' }),
  _hsF({ id: 'pip', likes: _hsF(['picture', 'clock', 'window']), gift: 'hf-picture' }),
  _hsF({ id: 'tam', likes: _hsF(['rug', 'light', 'store']), gift: 'hf-oil-lamp' }),
  _hsF({ id: 'bramble', likes: _hsF(['picture', 'table', 'books']), gift: 'hf-bookcase', critic: 1 }),
  _hsF({ id: 'quince', likes: _hsF(['plant', 'window', 'table']), gift: 'hf-geranium' }),
  _hsF({ id: 'wick', likes: _hsF(['window', 'books', 'clock']), gift: 'hf-wall-clock', night: 1 }),
]);
/** The callers for a housewarming: 2 or 3, the same on every device for the same seed; awake: ids that are up now (the caller's clock). */
function houseCallersFor(seed, awake) {
  const pool = HOUSE_CALLERS.filter(c => !awake || awake.has(c.id)), out = [];
  let a = (Number(seed) | 0) * 2654435761 >>> 0 || 7;
  const rnd = () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; };
  const n = Math.min(pool.length, 2 + (rnd() < .5 ? 1 : 0)), left = pool.slice();
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rnd() * left.length), 1)[0]);
  if (out.length && !out.some(c => c.critic)) { const b = HOUSE_CALLERS.find(c => c.critic); if (b && (!awake || awake.has(b.id))) out[out.length - 1] = b; }   // (Bramble always comes to give the stars, if he is up)
  return out;
}
/**
 * How cosy the house is, 1 to 5 stars, from what is in it (pure: by kind). Variety counts most (something to sit on, sleep in, read by,
 * a light, a plant, a rug, a picture), then how much there is, papered walls and laid floors, and rooms built. Never a judgement: the
 * best is kept (g.hs.stars), so the stars never go down.
 */
function houseStars(pieces, rooms) {
  const kinds = new Set(); let lit = 0, wall = 0, rug = 0, plant = 0;
  for (const p of pieces || []) { const S = houseShape(_hsDecor(p.d)); if (!S) continue; kinds.add(S.fk); if (S.lit || S.fk === 'lights') lit++; if (S.hp === 'wall') wall++; if (S.hp === 'rug') rug++; if (S.fk === 'plant') plant++; }
  let score = Math.min(4, kinds.size * .55) + Math.min(2, (pieces || []).length / 9) + (lit ? 1 : 0) + (rug ? .5 : 0) + (plant ? .6 : 0) + (wall >= 2 ? .6 : 0);
  let papered = 0, built = 0;
  for (const r of Object.values(rooms || {})) { if (!r || Number(r.st) !== 2) continue; built++; if ((r.w && r.w !== HOUSE_WALL0) || (r.f && r.f !== HOUSE_FLOOR0)) papered++; }
  score += Math.min(1, papered * .5) + Math.min(1.5, (built - 1) * .5);
  return Math.max(1, Math.min(5, Math.round(score / 2)));
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
  // the builders' jar (so a friend can put in), the housewarming of the last room finished (a friend inside sees the same callers),
  // the guest room's friend (the name they show), your banner, the house's best cosy stars, and the helpers' handprints by the hearth
  const J = hs.jar; if (J && HOUSE_PLAN_OF.has(J.s)) out.j = [J.s, clampI(J.c, 0, 99999), clampI(J.t, 0, 999), clampI(J.st, 0, 999)];
  const HW = hs.hw; if (HW && HOUSE_PLAN_OF.has(HW.s) && houseDayNum(HW.d)) out.w = [HW.s, clampI(houseDayNum(HW.d), 0, 99999), clampI(HW.seed, 0, 9999)];
  const G = hs.guest; if (G && HOUSE_PLAN_OF.has(G.s) && typeof G.n === 'string' && G.n.trim()) out.g = [G.s, G.n.trim().slice(0, 22)];
  if (typeof hs.bn === 'string' && HOUSE_BANNER_RE.test(hs.bn)) out.b = hs.bn;
  if (Number(hs.stars) > 0) out.s = clampI(hs.stars, 0, 5);
  if (Array.isArray(hs.hands) && hs.hands.length) out.p = hs.hands.filter(h => Array.isArray(h) && /^[A-Z?]$/.test(String(h[0]))).slice(-12).map(h => [String(h[0]), clampI(h[1], 0, 15), clampI(h[2], 0, 7)]);
  return out;
}
/** A friend's house from their snapshot's `hs` (cleaned by gardenSnapshotClean): { home, kind, look, rooms: {slot: {st, w, f}}, pieces: [...] }. */
function houseFromWire(hs) {
  if (!hs || !hs.h) return null;
  const rooms = {}, pieces = [];
  for (const r of hs.r || []) rooms[String(r[0])] = { st: r[1], w: r[2] === '-' ? HOUSE_WALL0 : r[2], f: r[3] === '-' ? HOUSE_FLOOR0 : r[3], c: r[4] || 0 };
  for (const f of hs.f || []) pieces.push({ u: f[0], d: f[1], s: f[2], x: f[3], y: f[4], z: f[5] || 0, r: f[6] || 0, v: f[7] || 0, l: f[8] ? 1 : 0 });
  const out = { home: hs.h, kind: hs.k || 'cottage', look: HOUSE_LOOKS.includes(hs.l) ? hs.l : 'thatch', rooms, pieces };
  if (Array.isArray(hs.j)) out.jar = { s: hs.j[0], c: hs.j[1] | 0, t: hs.j[2] | 0, st: hs.j[3] | 0 };
  if (Array.isArray(hs.w)) out.hw = { s: hs.w[0], dn: hs.w[1] | 0, seed: hs.w[2] | 0 };
  if (Array.isArray(hs.g)) out.guest = { s: hs.g[0], n: String(hs.g[1] || '') };
  if (typeof hs.b === 'string' && HOUSE_BANNER_RE.test(hs.b)) out.bn = hs.b;
  if (Number.isInteger(hs.s)) out.stars = hs.s;
  if (Array.isArray(hs.p)) out.hands = hs.p;
  return out;
}
