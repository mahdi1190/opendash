/* ============================================================
   THE VALE'S FOLK, the rules (C:/tmp/r3/design/npcs-PLAN.md, Phase 1 "the vale is lived in"). Pure: no page, no DOM, no clock of its own.
   The same code is loaded by tools/folk-audit.mjs in node, so what the audit says is what the game does.

   ONE REGISTRY. VALE_FOLK holds one row per villager: who they are, how they look (their painted cast id), the KIND of home they want
   (a query: never a cell, never required to be a named landmark; `prefer` lists old landmark ids, tried first), their round (a routine of
   time blocks), their games and tells. The old tables are built from these rows (WD_FOLK, WK_HOMES in 94-garden-wonder-1folk.js and
   -1kin.js), so every saved key (fh. fs. fv. fn. fd) keeps its meaning.

   PLACES ARE QUERIES (rule 17). An activity asks for { kinds: [...], near: 'home' | 'plaza' | {kinds, r}, terrain, public }, answered on
   whatever layout is loaded: a thing of that kind, and the stand point its kind gives (GARDEN_KINDS acts[].stand, relative to the drawn
   footprint), so a villager sits on any bench exactly as the player does. A query nothing answers is skipped, and the next choice is used.

   THE DAY PLANNER is seeded (gardenId + day + villager), so every device works out the same day with nothing sent. Stand points are
   booked by time for everyone together: two villagers never claim one seat (rule 12).

   valeFolkHomeOf(thing)                    -> 'home' kind words for a thing that someone could live in ('' when nobody could)
   valeFolkSolveHomes(rows, things, saved, ctx) -> Map villager id -> thing id (saved homes are kept: homes never shuffle)
   valeFolkFind(q, ctx, o)                  -> one stand point { x, y, deg, src, kind, act, key } or null
   valeFolkPlanAll(rows, ctx)               -> Map villager id -> [{ t0, t1 (minutes of the day), act, spot, inside, walk (s) }]
   valeFolkAt(plan, minute)                 -> { e (the activity), i, walking (between the last place and this one) }
   valeFolkRel(a, b, flags)                 -> 'close' | 'warm' | 'wary' | 'cold' | 'no'
   ============================================================ */
const VALE_FOLK_SPEED = 58;   // world px a second, the callers' old pace: the painted walk's stride (.37 s a step) is planted at this speed
/** The day's blocks, by season: [start hour, end hour]. Dawn and dusk follow the season's light (the vale's own sky uses the same months). */
const VALE_BLOCKS = Object.freeze(['dawn', 'morning', 'midday', 'afternoon', 'dusk', 'evening', 'night']);
const VALE_BLOCK_HOURS = Object.freeze({
  spring: Object.freeze({ dawn: [5.5, 7.5], morning: [7.5, 11.5], midday: [11.5, 14], afternoon: [14, 18.5], dusk: [18.5, 20.5], evening: [20.5, 22.5], night: [22.5, 29.5] }),
  summer: Object.freeze({ dawn: [4.5, 6.5], morning: [6.5, 11.5], midday: [11.5, 14], afternoon: [14, 19.5], dusk: [19.5, 21.5], evening: [21.5, 23.5], night: [23.5, 28.5] }),
  autumn: Object.freeze({ dawn: [6, 8], morning: [8, 11.5], midday: [11.5, 14], afternoon: [14, 17], dusk: [17, 19], evening: [19, 22], night: [22, 30] }),
  winter: Object.freeze({ dawn: [7, 8.5], morning: [8.5, 11.5], midday: [11.5, 13.5], afternoon: [13.5, 16], dusk: [16, 17.5], evening: [17.5, 22], night: [22, 31] }),
});
/** What anyone can do. q: the place query; d: minutes [min, max]; clip: the pose ('sit' seated on the stand point, 'idle' standing,
 *  'fish' sat with a rod, 'read' standing reading); inside: indoors at home (out of sight, the windows lit). Nothing names a place. */
const VALE_ACTIVITIES = Object.freeze({
  home:    { q: { home: true }, d: [40, 120], inside: true, clip: 'idle' },
  sleep:   { q: { home: true }, d: [300, 600], inside: true, clip: 'idle' },
  porch:   { q: { home: true, porch: true }, d: [15, 40], clip: 'idle' },
  sit:     { q: { kinds: ['bench', 'seat', 'log-seat', 'stump'], acts: ['sit'], near: 'home', r: 22 }, d: [20, 55], clip: 'sit' },
  sitout:  { q: { kinds: ['bench', 'seat', 'log-seat', 'stump'], acts: ['sit'], public: true }, d: [20, 50], clip: 'sit' },
  fish:    { q: { kinds: ['pier', 'fishing-bank'], acts: ['dangle', 'fishsit', 'fishsitfront'] }, d: [40, 110], clip: 'fish', prop: 'rod' },
  read:    { q: { kinds: ['notice-board', 'signpost', 'milestone'], acts: ['read'] }, d: [6, 15], clip: 'read' },
  post:    { q: { kinds: ['postbox'] }, d: [5, 12], clip: 'idle' },
  warm:    { q: { kinds: ['campfire', 'fire'], acts: ['warm'] }, d: [20, 50], clip: 'idle' },
  look:    { q: { kinds: ['telescope', 'wall', 'lighthouse', 'tower', 'stones', 'falls', 'well', 'sundial', 'chapel', 'mill', 'bridge'], near: 'home', r: 26 }, d: [10, 30], clip: 'idle' },
  wander:  { q: { kinds: ['lamp', 'signpost', 'sundial', 'well', 'bench', 'postbox', 'notice-board', 'milestone', 'bridge'], public: true, any: true }, d: [8, 20], clip: 'idle' },
  tend:    { q: { home: true, ground: 'open-grass', r: 4 }, d: [25, 60], clip: 'idle' },
  shelter: { q: { home: true, porch: true }, d: [30, 80], clip: 'idle', rain: true },
});
/** Routines: per block, weighted choices [activity, weight, when?] (when: 'rain' | 'dry' | 'snow' | a season | a list). 4 or 5 blocks each
 *  carry a real choice; the rest are home or sleep. */
const VALE_ROUTINES = Object.freeze({
  angler: { dawn: [['fish', 6]], morning: [['fish', 8], ['sit', 1]], midday: [['fish', 5], ['sitout', 2, 'dry']], afternoon: [['fish', 7], ['shelter', 4, 'rain']], dusk: [['fish', 6], ['warm', 2]], evening: [['home', 5], ['warm', 2, 'dry']], night: [['sleep', 1]] },
  thistle: { dawn: [['tend', 3], ['home', 2]], morning: [['sleep', 1]], midday: [['sleep', 1]], afternoon: [['home', 3], ['sit', 2, 'dry']], dusk: [['tend', 4], ['warm', 3], ['sitout', 1, 'dry']], evening: [['tend', 3], ['warm', 3], ['look', 1]], night: [['tend', 2, 'dry'], ['home', 2]] },
  pip: { dawn: [['fish', 4], ['look', 2]], morning: [['wander', 5], ['fish', 3], ['read', 1]], midday: [['sitout', 3, 'dry'], ['wander', 3], ['post', 1]], afternoon: [['fish', 4], ['wander', 4], ['shelter', 3, 'rain']], dusk: [['wander', 2], ['sitout', 2, 'dry'], ['home', 1]], evening: [['home', 3], ['warm', 1]], night: [['sleep', 1]] },
  tam: { dawn: [['tend', 4], ['look', 1]], morning: [['tend', 3], ['home', 2], ['wander', 2, 'rain']], midday: [['home', 3], ['sit', 1, 'dry']], afternoon: [['tend', 3], ['wander', 3, 'rain'], ['look', 1]], dusk: [['tend', 3], ['sit', 2]], evening: [['home', 1]], night: [['sleep', 1]] },
  bramble: { dawn: [['home', 1]], morning: [['read', 3], ['sitout', 3, 'dry'], ['look', 3]], midday: [['sitout', 4, 'dry'], ['sit', 2], ['shelter', 4, 'rain']], afternoon: [['look', 3], ['read', 2], ['sitout', 3, 'dry'], ['wander', 2]], dusk: [['sit', 3], ['look', 2]], evening: [['home', 3], ['warm', 1]], night: [['sleep', 1]] },
  quince: { dawn: [['tend', 4], ['look', 1]], morning: [['post', 3], ['read', 2], ['sitout', 2, 'dry']], midday: [['sit', 3], ['tend', 2], ['shelter', 3, 'rain']], afternoon: [['tend', 3], ['look', 2], ['wander', 2]], dusk: [['porch', 3], ['sit', 2]], evening: [['home', 1]], night: [['sleep', 1]] },
  wick: { dawn: [['home', 1]], morning: [['sleep', 1]], midday: [['sleep', 1]], afternoon: [['sleep', 1]], dusk: [['look', 4], ['porch', 1]], evening: [['look', 4], ['sitout', 1, 'dry'], ['warm', 1]], night: [['look', 3, 'dry'], ['home', 2]] },
  hollin: { dawn: [['warm', 3], ['porch', 1]], morning: [['tend', 3], ['look', 2], ['fish', 1, 'thursday']], midday: [['sit', 3], ['warm', 2], ['fish', 3, 'thursday']], afternoon: [['tend', 3], ['look', 2], ['shelter', 3, 'rain']], dusk: [['warm', 4], ['sit', 1]], evening: [['warm', 2], ['home', 3]], night: [['sleep', 1]] },
  perpetua: { dawn: [['home', 1]], morning: [['post', 3], ['wander', 2]], midday: [['wander', 3], ['post', 2]], afternoon: [['wander', 3], ['sitout', 1, 'dry'], ['shelter', 2, 'rain']], dusk: [['post', 2], ['home', 2]], evening: [['home', 1]], night: [['sleep', 1]] },
});
/** THE REGISTRY. look: the painted cast id (94-garden-art-g-cast.js), plus the classic drawing's colours (the classic style keeps its own).
 *  home: a query on kinds and words (valeFolkHomeOf), prefer: old landmark ids, tried first; region: where the old tables put them.
 *  caller: they were one of the daily callers (WD_FOLK). The caller rows' words (when, thanks, chance) stay in 94-garden-wonder-1folk.js. */
const VALE_FOLK = Object.freeze([
  Object.freeze({ id: 'angler', name: 'The old angler', species: 'man', body: 'tall', cast: 'angler', temper: 'quiet', home: Object.freeze({ want: ['boathouse', 'cottage', 'house', 'hut'], near: Object.freeze({ kinds: ['pier'], r: 14 }) }), prefer: Object.freeze(['ld-boathouse', 'old-angler']), region: '', place: 'the pier', routine: 'angler', tells: Object.freeze(['back-to-water']), arrives: 'start' }),
  Object.freeze({ id: 'thistle', name: 'Mother Thistle', species: 'hedgehog', body: 'small', cast: 'thistle', temper: 'cosy', home: Object.freeze({ want: ['hollow', 'burrow', 'cottage'], terrain: 'woodland' }), prefer: Object.freeze(['ld-hollow', 'great-oak-clearing']), region: 'west-woods', place: 'the Great Oak', routine: 'thistle', caller: 1, arrives: 'start' }),
  Object.freeze({ id: 'pip', name: 'Pip', species: 'otter', body: 'tall', cast: 'pip', temper: 'bright', home: Object.freeze({ want: ['holt'], near: Object.freeze({ kinds: ['mill', 'bridge', 'falls'], r: 16 }) }), prefer: Object.freeze(['fk-holt-pip', 'ld-churn']), region: 'east-mill', place: 'the mill race', routine: 'pip', caller: 1, arrives: 'start' }),
  Object.freeze({ id: 'tam', name: 'Tam', species: 'mole', body: 'small', cast: 'tam', temper: 'deadpan', home: Object.freeze({ want: ['burrow'], near: Object.freeze({ kinds: ['chapel', 'maze', 'stones'], r: 18 }) }), prefer: Object.freeze(['fk-burrow-tam', 'ld-chapel']), region: 'southwest-ruins', place: 'the old chapel', routine: 'tam', caller: 1, arrives: 'start' }),
  Object.freeze({ id: 'bramble', name: 'Bramble', species: 'badger', body: 'tall', cast: 'bramble', temper: 'dry', home: Object.freeze({ want: ['cottage', 'house', 'oldhouse'], near: Object.freeze({ kinds: ['mill', 'barn'], r: 40 }) }), prefer: Object.freeze(['mill-yard']), region: 'east-mill', place: 'the mill yard', routine: 'bramble', caller: 1, tells: Object.freeze(['rub-out']), arrives: 'start' }),
  Object.freeze({ id: 'quince', name: 'Quince', species: 'hare', body: 'tall', cast: 'quince', temper: 'bright', home: Object.freeze({ want: ['house', 'cottage'], near: Object.freeze({ kinds: ['bell', 'trough'], r: 14 }) }), prefer: Object.freeze(['ld-quince-house', 'cider-square']), region: 'orchard-headland', place: 'the cider square', routine: 'quince', caller: 1, arrives: 'start' }),
  Object.freeze({ id: 'wick', name: 'Wick', species: 'owl', body: 'bird', cast: 'wick', temper: 'dry', home: Object.freeze({ want: ['hut', 'bothy', 'nest'], high: true }), prefer: Object.freeze(['ld-hut', 'summit-cairn']), region: 'north-headland', place: 'the mountain hut', routine: 'wick', caller: 1, arrives: 'start' }),
  Object.freeze({ id: 'hollin', name: 'Hollin', species: 'stag', body: 'tall', cast: 'hollin', temper: 'quiet', home: Object.freeze({ want: ['woodhut', 'hut', 'cottage'], away: Object.freeze({ kinds: ['trough', 'bell'], r: 12 }) }), prefer: Object.freeze(['ld-woodhut', 'ld-hollin-yard']), region: 'southwest-ruins', place: 'the woodman\u2019s hut', routine: 'hollin', resident: 1, tells: Object.freeze(['steps-aside']), arrives: 'start' }),
  Object.freeze({ id: 'perpetua', name: 'Perpetua', species: 'snail', body: 'shell', cast: 'perpetua', temper: 'proud', home: Object.freeze({ want: ['postbox'], postbox: true }), prefer: Object.freeze(['post-box']), region: '', place: 'the post box', routine: 'perpetua', speed: 0.42, arrives: 'start' }),
]);
const VALE_FOLK_ROW = new Map(VALE_FOLK.map(r => [r.id, r]));
/** Reed stays a traveller: the road's own runtime walks him in by the arrival road (94-garden-travellers-1runtime.js). One system, so
 *  he is a row of that table, not this one. */
const VALE_FOLK_TRAVELLERS = Object.freeze(['travelling-angler']);
/** Relationships: every pair is warm unless listed. `turns` names the story flag that warms it. The one who was harmed never steps aside. */
const VALE_REL = Object.freeze([
  Object.freeze({ a: 'thistle', b: 'hollin', v: 'no', aside: 'hollin' }),
  Object.freeze({ a: 'quince', b: 'hollin', v: 'no', aside: 'hollin' }),
  Object.freeze({ a: 'hollin', b: 'angler', v: 'close' }),
  Object.freeze({ a: 'pip', b: 'bramble', v: 'close' }),
  Object.freeze({ a: 'tam', b: 'thistle', v: 'close' }),
]);
function valeFolkRel(a, b, flags) {
  for (const r of VALE_REL) if ((r.a === a && r.b === b) || (r.a === b && r.b === a)) return r.turns && flags && flags[r.turns] ? 'warm' : r.v;
  return 'warm';
}
/** Who steps off the path when these two meet ('' : nobody). */
function valeFolkAside(a, b) { for (const r of VALE_REL) if (((r.a === a && r.b === b) || (r.a === b && r.b === a)) && r.v === 'no') return r.aside || b; return ''; }
/* ---------- a seeded number line: the same on every device ---------- */
function valeHash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function valeRng(seed) { let a = valeHash(seed) || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; }
/* ---------- homes ---------- */
const VALE_HOME_WORDS = Object.freeze(['boathouse', 'woodhut', 'oldhouse', 'cottage', 'house', 'hut', 'bothy', 'keeper', 'hollow', 'burrow', 'holt', 'nest', 'tent']);
const VALE_NOT_HOME = /shop|hall|office|stall|icehouse|chapel|barn|mill|tower|lighthouse|folly|grotto|woodshed|smoke|hide|journal/;
/** The home word a thing answers to ('' : nobody lives there). Kinds first (a burrow row is a burrow), then the last home word in its id. */
function valeFolkHomeOf(t) {
  if (!t) return '';
  if (['burrow', 'holt', 'nest', 'tent', 'hollow', 'treehouse'].includes(t.kind)) return t.kind === 'treehouse' ? 'nest' : t.kind;
  if (t.kind === 'postbox') return 'postbox';
  if (t.kind !== 'building') return '';
  const id = String(t.id || '').toLowerCase().replace(/^(ld|lf|fk)-/, '').replace(/-\d+$/, '');
  if (VALE_NOT_HOME.test(id)) return '';
  for (const w of VALE_HOME_WORDS) if (id === w || id.endsWith(w) || id.split('-').includes(w)) return w;
  return '';
}
function _vfD(a, b) { return Math.hypot((a.x - b.x) * 48, (a.y - b.y) * 30); }   // world px (cells are 48 by 30)
function _vfNearKind(ctx, kinds, p, r) { let best = Infinity; for (const t of ctx.things) if (kinds.includes(t.kind)) { const d = Math.hypot(t.x - p.x, t.y - p.y); if (d < best) best = d; } return best <= r ? best : Infinity; }
/** How well a home fits someone (lower is better; Infinity: not at all). */
function _vfHomeScore(row, t, ctx) {
  const want = row.home.want || [], w = valeFolkHomeOf(t); if (!w) return Infinity;
  const wi = want.indexOf(w); if (wi < 0) return Infinity;
  if (ctx.open && !ctx.open(t)) return Infinity;
  let s = wi * 30;
  const pi = (row.prefer || []).indexOf(t.id); if (pi >= 0) s -= 400 - pi * 10;
  const H = row.home;
  if (H.near) { const d = _vfNearKind(ctx, H.near.kinds, t, 999); s += Number.isFinite(d) ? d * 2 : 200; }
  if (H.away) { const d = _vfNearKind(ctx, H.away.kinds, t, H.away.r); if (Number.isFinite(d)) s += 150; }
  if (H.high) s += t.y * 0.8;
  if (H.terrain === 'woodland' && ctx.woodland && !ctx.woodland(t)) s += 60;
  return s + (valeHash(row.id + '|' + t.id + '|' + (ctx.layout || '')) % 100) / 100;
}
/** The home solver: villagers in order take the best free home for their query. saved: { id: thingId } (vh.<id>), kept while that thing
 *  still stands and still fits. Families share (a row's `with`). A villager with no home that fits is travelling (no entry). */
function valeFolkSolveHomes(rows, things, saved, ctx) {
  const out = new Map(), taken = new Set(), byId = new Map(things.map(t => [t.id, t])), c = Object.assign({ things }, ctx || {});
  for (const row of rows) {
    const s = saved && saved[row.id], t = s && byId.get(s);
    if (t && Number.isFinite(_vfHomeScore(row, t, Object.assign({}, c, { open: null })))) { out.set(row.id, t.id); if (!row.home.postbox) taken.add(t.id); }
  }
  for (const row of rows) {
    if (out.has(row.id)) continue;
    if (row.with && out.has(row.with)) { out.set(row.id, out.get(row.with)); continue; }
    let best = null, bs = Infinity;
    for (const t of things) { if (taken.has(t.id) && !row.home.postbox) continue; const sc = _vfHomeScore(row, t, c); if (sc < bs) { bs = sc; best = t; } }
    if (best) { out.set(row.id, best.id); if (!row.home.postbox) taken.add(best.id); }
  }
  return out;
}
/* ---------- the place finder ---------- */
/** One stand point for a query, or null. ctx: { things, spots(t) -> [{act, stand {x, y}, deg, seat?}], home (the villager's home thing),
 *  door(t) -> {x, y}, ground(type, x, y, r, rng) -> {x, y} | null, public(x, y), open(t), booked(key, t0, t1), rng, from {x, y} }.
 *  The best candidates are near the anchor (home, or where they are), with a seeded shuffle among the near ones so days differ. */
function valeFolkFind(q, ctx, o) {
  o = o || {}; const rng = o.rng || Math.random, home = ctx.home, from = o.from || (home && (ctx.door ? ctx.door(home) : home)) || null;
  if (q.home) {
    if (!home) return null;
    const door = ctx.door ? ctx.door(home) : { x: home.x, y: home.y + 0.6 };
    if (q.ground) { const g = ctx.ground && ctx.ground(q.ground, door.x, door.y + 1.5, q.r || 4, rng); return g ? { x: g.x, y: g.y, deg: 90, src: home.id, kind: 'ground', act: 'tend', key: 'g:' + home.id + ':' + Math.round(g.x * 4) + ',' + Math.round(g.y * 4) } : null; }
    if (q.porch) return { x: door.x + 0.55, y: door.y + 0.35, deg: 90, src: home.id, kind: 'porch', act: 'porch', key: 'porch:' + home.id };
    return { x: door.x, y: door.y, deg: -90, src: home.id, kind: 'door', act: 'home', key: 'door:' + home.id, inside: true };
  }
  const cands = [];
  for (const t of ctx.things) {
    if (!q.kinds.includes(t.kind)) continue;
    if (ctx.open && !ctx.open(t)) continue;
    let spots = ctx.spots ? ctx.spots(t) : [];
    if (q.acts) spots = spots.filter(s => q.acts.includes(s.act));
    if (!spots.length) spots = [{ act: 'stand', stand: { x: t.x, y: t.y + 0.75 }, deg: -90 }];
    for (const s of spots) {
      if (!s.stand) continue;
      const p = s.stand;
      if (q.public && ctx.public && !ctx.public(p.x, p.y)) continue;
      if (ctx.walkable && !ctx.walkable(p.x, p.y, s)) continue;
      let d = from ? _vfD(p, from) : 0;
      if (q.near === 'home' && home) { const hd = _vfD(p, ctx.door ? ctx.door(home) : home) / 48; if (hd > (q.r || 20)) continue; d = hd * 48; }
      cands.push({ t, s, d });
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => a.d - b.d);
  // the near ones, shuffled by the day's seed (any: anywhere public, the near ones still first)
  const n = Math.min(cands.length, q.any ? 10 : 5), pool = cands.slice(0, n);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
  for (const c of pool.concat(cands.slice(n))) {
    const key = 's:' + c.t.id + ':' + (c.s.i == null ? c.s.act : c.s.i);
    if (o.booked && o.booked(key)) continue;
    return { x: c.s.stand.x, y: c.s.stand.y, deg: c.s.deg == null ? 90 : c.s.deg, src: c.t.id, kind: c.t.kind, act: c.s.act, seat: c.s.seat, key, at: { x: c.t.x, y: c.t.y } };
  }
  return null;
}
/* ---------- the day planner ---------- */
function _vfWhen(w, ctx) {
  if (!w) return true;
  const L = Array.isArray(w) ? w : [w];
  return L.every(k => k === 'rain' ? ctx.rain : k === 'dry' ? !ctx.rain : k === 'snow' ? ctx.snow : k === 'thursday' ? ctx.weekday === 4 : ['spring', 'summer', 'autumn', 'winter'].includes(k) ? ctx.season === k : true);
}
function _vfPick(choices, ctx, rng) {
  const ok = choices.filter(c => _vfWhen(c[2], ctx)); if (!ok.length) return null;
  // rain sends the dry choices home or under shelter: a 'dry' row is already out; a rain row (shelter) is weighed up
  let sum = 0; for (const c of ok) sum += c[1] * (ctx.rain && c[2] === 'rain' ? 3 : 1);
  let r = rng() * sum; for (const c of ok) { r -= c[1] * (ctx.rain && c[2] === 'rain' ? 3 : 1); if (r <= 0) return c[0]; }
  return ok[ok.length - 1][0];
}
/** Seconds to walk from a to b at a speed (world px a second): straight, times a little for the bends of a route. */
function valeFolkWalkSecs(a, b, speed) { return !a || !b ? 0 : _vfD(a, b) * 1.35 / (speed || VALE_FOLK_SPEED); }
/** Plan everyone's day together. ctx: { day ('YYYY-MM-DD'), seed (the garden's id), season, weekday (0 Sunday), rain, snow, homes (Map id ->
 *  thing), plus the finder's ctx (things, spots, door, ground, public, open, walkable) }. Returns Map id -> entries, sorted by t0, covering
 *  the day from its night block's end (the early hours) to the next night: minutes 0 .. 1440 (night wraps). Pure and deterministic. */
function valeFolkPlanAll(rows, ctx) {
  const plans = new Map(), book = ctx.book || new Map();   // key -> [[t0, t1]] (ctx.book: shared, so one villager at a time can be planned over several frames)
  const H = VALE_BLOCK_HOURS[ctx.season] || VALE_BLOCK_HOURS.spring;
  const isBooked = (key, t0, t1) => (book.get(key) || []).some(([a, b]) => a < t1 + 2 && b > t0 - 2);
  const doBook = (key, t0, t1) => { if (!key || key.startsWith('door:') || key.startsWith('porch:')) return; const L = book.get(key) || []; L.push([t0, t1]); book.set(key, L); };
  for (const row of rows) {
    const home = ctx.homes && ctx.homes.get(row.id) || null, R = VALE_ROUTINES[row.routine] || {}, rng = valeRng((ctx.seed || '') + '|' + ctx.day + '|' + row.id);
    const speed = VALE_FOLK_SPEED * (row.speed || 1), out = [];
    const fctx = Object.assign({}, ctx, { home });
    let at = home ? (ctx.door ? ctx.door(home) : home) : null;
    // the early hours: the end of last night's sleep
    const night = H.night, early = Math.max(0, (night[1] - 24) * 60);
    if (home) out.push({ t0: 0, t1: early, act: 'sleep', spot: valeFolkFind({ home: true }, fctx), inside: true, walk: 0 });
    for (const blk of VALE_BLOCKS) {
      const [h0, h1] = H[blk], b0 = Math.round(h0 * 60), b1 = Math.min(1440, Math.round(h1 * 60));
      let t = b0, guard = 0;
      while (t < b1 - 4 && guard++ < 12) {
        const id = _vfPick(R[blk] || [['home', 1]], ctx, rng) || 'home', A = VALE_ACTIVITIES[id] || VALE_ACTIVITIES.home;
        const len = Math.round(A.d[0] + rng() * (A.d[1] - A.d[0])), t1 = Math.min(b1, t + len);
        let spot = null;
        for (let k = 0; k < 3 && !spot; k++) spot = valeFolkFind(A.q, fctx, { rng, from: at, booked: (key) => isBooked(key, t, t1) });
        let act = id, inside = !!A.inside;
        if (!spot) { spot = home ? valeFolkFind({ home: true }, fctx) : null; act = 'home'; inside = !!spot; }
        if (!spot) { t = t1; continue; }   // nowhere at all (a layout with no home and no seat): the time passes off the map
        const walk = valeFolkWalkSecs(at, spot, speed);
        const prev = out[out.length - 1];
        if (prev && prev.act === act && prev.spot && prev.spot.key === spot.key) prev.t1 = t1;   // the same again: they stay
        else { out.push({ t0: t, t1, act, spot, inside, walk: Math.round(walk), clip: A.clip, prop: A.prop || '' }); doBook(spot.key, t, t1); }
        at = spot; t = t1;
      }
    }
    // jitter: each start moves by a seeded few minutes, so the top of the hour doesn't hitch (never before the last one's start)
    for (let i = 1; i < out.length; i++) { const j = Math.round((rng() - 0.5) * 8); const t0 = Math.max(out[i - 1].t0 + 3, Math.min(out[i].t1 - 3, out[i].t0 + j)); out[i - 1].t1 = t0; out[i].t0 = t0; }
    plans.set(row.id, out);
  }
  return plans;
}
/** Where someone is in their plan at a minute of the day: the entry, and whether they are still walking to it (with how far along). */
function valeFolkAt(plan, minute, speedMul) {
  if (!plan || !plan.length) return null;
  let i = plan.findIndex(e => minute >= e.t0 && minute < e.t1); if (i < 0) i = minute < plan[0].t0 ? 0 : plan.length - 1;
  const e = plan[i], prev = plan[i - 1] || null, secs = (minute - e.t0) * 60, walk = e.walk || 0;
  return { e, i, prev, walking: !!prev && walk > 0 && secs < walk, along: walk > 0 ? Math.max(0, Math.min(1, secs / walk)) : 1, secs };
}
