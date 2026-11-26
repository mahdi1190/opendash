/* ============================================================
   BUILD 2: POCKETS, THE TOOL RING AND HOME STORAGE (the rules: plain data and pure functions, no page and no clock).
   The owner, 21 Nov 2026: "an inventory system, not necessarily a bag: things like a rod and net always equipped, pick up items we find,
   fish go into the inventory that we can bank, like Animal Crossing".

   ONE TRUTH. What you own is the ledger, as always (gardenWallet().items). Pockets only say WHICH of your things sit in which slot
   (g.pk, one entry per slot: '0'..'39' -> { i: item key, n }, so two devices merge slot by slot); home is everything you own that is not in
   your pockets. Nothing is kept twice, so nothing can double and nothing can be lost: a slot that says more than you own shows what you own,
   and two devices that put the same new thing in different slots show it once.

     GB2_POCKET         what can be in pockets: one row per class of thing, found by its item key (stack: how many share one slot; tab: its
                        place in your storage at home). Coins, timber and stone (the purse), tools, tackle, land, keys and clothes are never
                        in pockets. Another file adds a class with gardenB2PocketAdd(row) (a shell, a stone): it is in pockets from then on.
     GB2_TABS           the tabs of your storage at home, in order
     GB2_TOOLS          the tool ring: Hands first, then every tool you carry. Always with you, never in a slot, never used up. A row's
                        `page` is the page tool it is (94-garden-4page.js), `need` an item you must own for it to show (none: everyone has it)
     GB2_SIZE           how many slots: 20, then 30 with the satchel, 40 with the big bag (worked out from what you own, never from a save)
     GB2_FIRST          the first time: how many kinds of each go in your pockets (the rest is at home)

     gardenB2Class(item)                 its row in GB2_POCKET, or null
     gardenB2Avail(items, kept)          { item: n } of everything you own that can be in pockets (kept: what is on show elsewhere, taken off)
     gardenB2Size(items)                 the number of slots
     gardenB2Slots(pk, avail, size, ok)  the slots as they really are: an array of size, each null, { i, n } or { u, m } (a whole thing kept in
                                         one slot: ok(entry) says whether it still is). Each n is clamped to what is left after the slots before it
     gardenB2Home(avail, slots)          { item: n } at home
     gardenB2Diff(before, after)         { up: [[item, n]], down: [[item, n]] } between two avail maps
     gardenB2Arrive(slots, up, o)        what came in, stacked into pockets: { slots, home: [[item, n, why]] } (why 'full': no room;
                                         'more': a big delivery keeps one new slot per thing and the rest goes home, like the post)
     gardenB2Spend(slots, down, first)   what was used comes out of your pockets first (first: the slot in your hand), never below none
     gardenB2FirstFill(avail, size)      the first time: a few of each kind in your pockets, a new slots array
     gardenB2Fit(slots, item, n)         how many of a thing would fit in these pockets
   Evaluated as it is by nothing on the server: it may name the catalogue's lookups only inside functions, guarded with typeof.
   ============================================================ */
const GB2_POCKET = [
  Object.freeze({ c: 'seed', re: /^seed:[a-z0-9-]+$/, tab: 'seeds', stack: 30 }),
  Object.freeze({ c: 'compost', re: /^fertiliser$/, tab: 'seeds', stack: 30 }),
  Object.freeze({ c: 'decor', re: /^decor:[a-z0-9-]+$/, tab: 'things', stack: 10 }),
  Object.freeze({ c: 'bq', re: /^bq:[a-z0-9-]+$/, tab: 'things', stack: 10 }),
  Object.freeze({ c: 'fish', re: /^fish:[a-z0-9-]+-[0-3]$/, tab: 'catches', stack: 30 }),
  Object.freeze({ c: 'bug', re: /^bug:[a-z0-9-]+$/, tab: 'catches', stack: 30 }),
  Object.freeze({ c: 'fos', re: /^fos:[a-z0-9-]+$/, tab: 'finds', stack: 30, keep: true }),   // keep: kept in the ledger when put on show (every "found" count keeps working)
  Object.freeze({ c: 'cur', re: /^cur:[a-z0-9-]+$/, tab: 'finds', stack: 1, keep: true }),
  Object.freeze({ c: 'clover', re: /^clover$/, tab: 'finds', stack: 30 }),
  Object.freeze({ c: 'crop', re: /^crop:[a-z0-9-]+$/, tab: 'food', stack: 30 }),
  Object.freeze({ c: 'food', re: /^(egg|flour|honey|dish:[a-z0-9-]+|meal:[a-z0-9-]+)$/, tab: 'food', stack: 30 }),
];
const GB2_TABS = [
  Object.freeze({ id: 'seeds', name: 'Seeds', icon: 'sprout' }),
  Object.freeze({ id: 'things', name: 'Things', icon: 'armchair' }),
  Object.freeze({ id: 'catches', name: 'Catches', icon: 'fish' }),
  Object.freeze({ id: 'finds', name: 'Finds', icon: 'gem' }),
  Object.freeze({ id: 'food', name: 'Food', icon: 'apple' }),
];
const GB2_TOOLS = Object.freeze([
  Object.freeze({ id: 'hands', name: 'Hands', page: 'hand', says: 'Pick, open, talk, and do whatever a thing needs' }),
  Object.freeze({ id: 'can', name: 'Watering can', page: 'water', says: 'Water a thirsty plant' }),
  Object.freeze({ id: 'shears', name: 'Shears', page: 'trim', says: 'Trim a plant that has grown wild' }),
  Object.freeze({ id: 'spade', name: 'Spade', page: 'dig', says: 'Dig a plant up' }),
  Object.freeze({ id: 'rod', name: 'Fishing rod', page: 'hand', says: 'Face the water and press E, or click the water, to cast' }),
  Object.freeze({ id: 'net', name: 'Bug net', page: 'hand', says: 'Press E near a bug, or click it, to net it' }),
  // building in the game (94-garden-zz-8build2-land.js): what the garden designer did, now done where you stand
  Object.freeze({ id: 'paths', name: 'Path kit', page: 'hand', says: 'Stand on a path, a plaza or by a door and press E, walk, then press E again. R changes the stones' }),
  Object.freeze({ id: 'hoe', name: 'Hoe', page: 'hand', says: 'Press E, walk over the ground to make a bed or lay moss, sand or bark, then press E again. R changes what you lay' }),
  Object.freeze({ id: 'stakes', name: 'Moving stakes', page: 'hand', says: 'Face a bench, a lamp, a stall or a shop and press E to move it' }),
]);
const GB2_SIZE = Object.freeze({ base: 20, max: 40, more: Object.freeze([Object.freeze(['tool:satchel', 30]), Object.freeze(['tool:big-bag', 40])]) });
const GB2_FIRST = Object.freeze({ lead: Object.freeze(['decor:storage-chest', 'fertiliser']), kinds: Object.freeze([Object.freeze(['seed', 6]), Object.freeze(['decor', 5]), Object.freeze(['catch', 4])]) });

const _gb2ClassMemo = new Map();
/** Another kind of thing for pockets (a lane's shells, stones): { c, re, tab, stack, keep? }. Its tab must be one of GB2_TABS, or a new tab
 *  row may come with it ({ tab: { id, name, icon } }). */
function gardenB2PocketAdd(row) {
  if (!row || !row.c || !row.re || typeof row.re.test !== 'function' || GB2_POCKET.some(r => r.c === row.c)) return false;
  const tab = row.tab && typeof row.tab === 'object' ? row.tab : null;
  if (tab && tab.id && !GB2_TABS.some(t => t.id === tab.id)) GB2_TABS.push(Object.freeze({ id: String(tab.id), name: String(tab.name || tab.id), icon: String(tab.icon || 'package') }));
  GB2_POCKET.push(Object.freeze({ c: String(row.c), re: row.re, tab: tab ? String(tab.id) : String(row.tab || 'things'), stack: Math.max(1, Math.min(99, Math.floor(Number(row.stack) || 30))), keep: !!row.keep }));
  _gb2ClassMemo.clear();
  return true;
}
function gardenB2Class(item) {
  const k = String(item || '');
  let r = _gb2ClassMemo.get(k);
  if (r === undefined) { r = GB2_POCKET.find(x => x.re.test(k)) || null; if (_gb2ClassMemo.size > 4000) _gb2ClassMemo.clear(); _gb2ClassMemo.set(k, r); }
  return r;
}
/** Is it a thing this app knows (a seed of a plant it has, a fish of its book)? A thing from a newer app is left out of pockets and home
 *  (it stays in the ledger, so nothing is lost: it shows once this app knows it). */
function gardenB2Known(item) {
  const k = String(item || ''), i = k.indexOf(':'), kind = i < 0 ? k : k.slice(0, i), id = i < 0 ? '' : k.slice(i + 1);
  try {
    if (kind === 'seed' || kind === 'crop') return typeof gardenPlant !== 'function' || !!gardenPlant(id);
    if (kind === 'decor') return typeof gardenDecor !== 'function' || !!gardenDecor(id);
    if (kind === 'fish') return typeof gardenFishParse !== 'function' || !!gardenFishParse(k);
    if (kind === 'bug') return typeof gardenBugDef !== 'function' || !!gardenBugDef(id);
    if (kind === 'bq') return typeof GARDEN_BOUQUETS === 'undefined' || GARDEN_BOUQUETS.some(b => b.id === id);
    if (kind === 'cur') return typeof GARDEN_LAND_CURIOS === 'undefined' || GARDEN_LAND_CURIOS.some(c => c.id === id);
    if (kind === 'dish') return typeof gpDish !== 'function' || !!gpDish(id);
  } catch (e) { return false; }
  return true;
}
function gardenB2Avail(items, kept) {
  const out = {};
  for (const k in items || {}) {
    const n = Math.floor(Number(items[k]) || 0); if (n <= 0 || !gardenB2Class(k) || !gardenB2Known(k)) continue;
    const v = n - Math.max(0, Math.floor(Number(kept && kept[k]) || 0));
    if (v > 0) out[k] = v;
  }
  return out;
}
function gardenB2Size(items) {
  let n = GB2_SIZE.base;
  for (const [k, s] of GB2_SIZE.more) if (Math.floor(Number(items && items[k]) || 0) > 0) n = Math.max(n, s);
  return Math.min(GB2_SIZE.max, n);
}
function gardenB2Slots(pk, avail, size, ok) {
  const left = Object.assign({}, avail), out = new Array(size).fill(null);
  for (let s = 0; s < size; s++) {
    const e = pk ? pk[s] : null;
    if (!e || typeof e !== 'object') continue;
    if (e.u) { if (typeof ok === 'function' && ok(e)) out[s] = { u: String(e.u), m: e.m === 'plants' ? 'plants' : 'decor' }; continue; }
    const it = String(e.i || ''), row = gardenB2Class(it); if (!row) continue;
    const n = Math.min(Math.floor(Number(e.n) || 0), left[it] || 0, row.stack);
    if (n <= 0) continue;
    left[it] -= n; out[s] = { i: it, n };
  }
  return out;
}
function gardenB2Home(avail, slots) {
  const out = Object.assign({}, avail);
  for (const s of slots) if (s && s.i && out[s.i]) { out[s.i] -= s.n; if (out[s.i] <= 0) delete out[s.i]; }
  return out;
}
function gardenB2Diff(before, after) {
  const up = [], down = [];
  for (const k in after) { const d = (after[k] || 0) - (before[k] || 0); if (d > 0) up.push([k, d]); else if (d < 0) down.push([k, -d]); }
  for (const k in before) if (!(k in after) && before[k] > 0) down.push([k, before[k]]);
  return { up, down };
}
/** o.fresh: how many new slots one thing may take in one go (1: a sack of 200 compost puts 30 in your pockets, the rest goes home). */
function gardenB2Arrive(slots, up, o) {
  const out = slots.slice(), home = [], fresh = Math.max(1, (o && o.fresh) || 1);
  for (const [it, n0] of up) {
    const row = gardenB2Class(it); let n = Math.floor(Number(n0) || 0); if (!row || n <= 0) continue;
    for (let s = 0; s < out.length && n > 0; s++) { const e = out[s]; if (e && e.i === it && e.n < row.stack) { const t = Math.min(n, row.stack - e.n); out[s] = { i: it, n: e.n + t }; n -= t; } }
    let made = 0;
    for (let s = 0; s < out.length && n > 0 && made < fresh; s++) if (!out[s]) { const t = Math.min(n, row.stack); out[s] = { i: it, n: t }; n -= t; made++; }
    if (n > 0) home.push([it, n, out.includes(null) ? 'more' : 'full']);
  }
  return { slots: out, home };
}
function gardenB2Spend(slots, down, first) {
  const out = slots.slice();
  for (const [it, n0] of down) {
    let n = Math.floor(Number(n0) || 0);
    const order = [];
    if (first != null && out[first] && out[first].i === it) order.push(first);
    for (let s = out.length - 1; s >= 0; s--) if (s !== first && out[s] && out[s].i === it) order.push(s);
    for (const s of order) { if (n <= 0) break; const t = Math.min(n, out[s].n); n -= t; out[s] = out[s].n - t > 0 ? { i: it, n: out[s].n - t } : null; }
  }
  return out;
}
function gardenB2FirstFill(avail, size) {
  const out = new Array(size).fill(null); let s = 0;
  const put = (it) => { const row = gardenB2Class(it), n = Math.min(avail[it] || 0, row ? row.stack : 0); if (n > 0 && s < size) out[s++] = { i: it, n }; };
  for (const it of GB2_FIRST.lead) put(it);
  const lead = new Set(GB2_FIRST.lead), byCount = (a, b) => (avail[b] || 0) - (avail[a] || 0) || (a < b ? -1 : a > b ? 1 : 0);
  for (const [cls, many] of GB2_FIRST.kinds) {
    const keys = Object.keys(avail).filter(k => { if (lead.has(k)) return false; const r = gardenB2Class(k); return !!r && (cls === 'catch' ? r.c === 'fish' || r.c === 'bug' : r.c === cls); }).sort(byCount);
    for (const k of keys.slice(0, many)) put(k);
  }
  return out;
}
function gardenB2Fit(slots, item, n) {
  const row = gardenB2Class(item); if (!row) return 0;
  let room = 0;
  for (const e of slots) { if (!e) room += row.stack; else if (e.i === item) room += Math.max(0, row.stack - e.n); if (room >= n) return n; }
  return Math.min(n, room);
}
