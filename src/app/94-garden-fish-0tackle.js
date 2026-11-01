/* ============================================================
   GARDEN, THE CATCHING OVERHAUL: THE TABLES (docs/dev/CATCH_FEATURES.md). PURE: tables and small functions, no state, no DOM at load.
   The owner, 1 Nov 2026: "make catching certain fishes unique and we need a setup, doing certain things increases the probability ... as animal crossing like as possible."

     GARDEN_REELS, GARDEN_LINES, GARDEN_HOOKS   what you fish with. Owned for good (items gear:<id>), chosen in prefs.reel, prefs.line, prefs.hook. Each does something you can feel in the reel game and shows on the figure or the line
     GARDEN_KIT                                 the bug kit: a lantern and a jar you carry, a pot of sugar for trees
     GARDEN_SPOTS, gardenSpotAt(x, y)           places in the water, with their own fish (a fish's needs.spot)
     GARDEN_LAKE_EVENTS, gardenCatchEventsAt(...)    what goes on at the lake. Worked out from the day and the hour, so everybody in a garden sees the same thing without a message being sent
     gardenHotSpot, gardenFestivalOn, gardenWantedFor, gardenLakeKnownFor, GARDEN_CHEST_MAPS: the same on every screen, from the date or the lake's own number

   Every id is stable, saved and sent to friends: never rename or reuse one.
   ============================================================ */
function _gtT(id, kind, tier, name, price, lv, st, blurb, more) { return Object.freeze(Object.assign({ id, kind, tier, name, price, lv, st: Object.freeze(st), blurb, tackle: 1 }, more || {})); }
/* A reel: lift (the bar rises this much quicker), wind (the meter fills this much quicker), ease (line tension drops this much quicker when you let go), rounds (off the longest fights), c (its colour on the rod). */
const GARDEN_REELS = Object.freeze([
  _gtT('reel-basic', 'reel', 1, 'Wooden reel', 0, 1, { lift: 0, wind: 1, ease: 0, rounds: 0, c: '#a87c4f' }, 'Clicks a lot. It does the job.', { own: 1, good: 'small and middling fish' }),
  _gtT('reel-spin', 'reel', 2, 'Spinning reel', 70, 3, { lift: 0.12, wind: 1.12, ease: 0.1, rounds: 0, c: '#4a8ab4' }, 'The bar lifts quicker, so you can catch up with a fish that darts.', { good: 'quick fish that dart about' }),
  _gtT('reel-bait', 'reel', 3, 'Baitcaster', 170, 5, { lift: 0.18, wind: 1.2, ease: 0.2, rounds: 0, c: '#d8642a' }, 'Winds in faster. The fight is shorter.', { good: 'strong fish in open water' }),
  _gtT('reel-deep', 'reel', 4, 'Deep-water reel', 420, 8, { lift: 0.24, wind: 1.3, ease: 0.35, rounds: -1, c: '#2a3a5a' }, 'Big and slow to tire. One round less with the biggest fish.', { good: 'the big fish of the deep' }),
  _gtT('reel-gold', 'reel', 5, 'Golden reel', 950, 12, { lift: 0.3, wind: 1.4, ease: 0.45, rounds: -1, c: '#f2c432' }, 'Runs like water. Friends will ask about it.', { good: 'anything that swims' }),
]);
/* A line: str (how much tension it takes), shy (how keen shy fish are to come to it), c and w (how it looks on the water). */
const GARDEN_LINES = Object.freeze([
  _gtT('line-mono', 'line', 1, 'Plain line', 0, 1, { str: 1, shy: 1, c: '#fbfbf2', w: 0.9 }, 'Clear and simple. A big fish on a run can snap it.', { own: 1, good: 'everyday fishing' }),
  _gtT('line-braid', 'line', 2, 'Braided line', 100, 4, { str: 1.4, shy: 0.9, c: '#7ac24a', w: 1.15 }, 'Green and strong. It holds a heavy fish, though shy ones can see it.', { good: 'heavy fish that run' }),
  _gtT('line-wire', 'line', 3, 'Wire trace', 260, 7, { str: 1.8, shy: 0.8, c: '#a8b0b6', w: 1.35 }, 'Teeth cannot bite through it. Nearly nothing snaps it.', { good: 'hunters with teeth' }),
  _gtT('line-silk', 'line', 4, 'Silk line', 560, 10, { str: 1.3, shy: 1.5, c: '#f4c8d8', w: 0.75 }, 'Almost invisible. Shy fish come to it far more readily.', { good: 'the shyest rare fish' }),
]);
/* A hook: slip (how fast a fish gets away while you miss it), big and small (how keen big fish, over 60 cm, and small ones are), strike (seconds more to strike), q (a perfect reel lands a better one). */
const GARDEN_HOOKS = Object.freeze([
  _gtT('hook-small', 'hook', 1, 'Small hook', 0, 1, { slip: 1, big: 1, small: 1.2, strike: 0, q: 0 }, 'Little fish take it gladly.', { own: 1, good: 'little fish' }),
  _gtT('hook-large', 'hook', 2, 'Large hook', 50, 3, { slip: 0.8, big: 1.5, small: 0.5, strike: 0, q: 0 }, 'Big fish hold on it, and big ones come. Little ones cannot get it in their mouths.', { good: 'big fish only' }),
  _gtT('hook-barbless', 'hook', 3, 'Barbless hook', 140, 6, { slip: 1.15, big: 1, small: 1, strike: 0, q: 1 }, 'Gentle: a fish that fights clean comes in finer. Slips a little easier.', { good: 'better stars on a perfect reel' }),
  _gtT('hook-gold', 'hook', 4, 'Golden hook', 720, 11, { slip: 0.7, big: 1.25, small: 1.1, strike: 0.4, q: 1 }, 'It holds anything, and gives you longer to strike.', { good: 'all fish' }),
]);
/* The bug kit. pack: a thing you use up. */
const GARDEN_KIT = Object.freeze([
  _gtT('bug-lantern', 'kit', 1, 'Hand lantern', 80, 3, {}, 'Carried on your belt, lit at dusk. Moths and fireflies come to you at night, even with no lamp in the garden.', { good: 'moths and night bugs' }),
  _gtT('bug-jar', 'kit', 1, 'Firefly jar', 25, 2, {}, 'Hangs at your hip. Every firefly you catch today lights it up a little more.', { good: 'showing off at night' }),
  _gtT('sugar-pot', 'kit', 1, 'Pot of sugar', 12, 4, {}, 'Paint it on a tree. Come back a few hours later: something rarer than usual will be on it.', { pack: 2, good: 'rare beetles and moths' }),
]);
for (const d of [...GARDEN_REELS, ...GARDEN_LINES, ...GARDEN_HOOKS, ...GARDEN_KIT]) _GF_GEAR.set(d.id, d);
const GARDEN_TACKLE_KINDS = Object.freeze({ reel: GARDEN_REELS, line: GARDEN_LINES, hook: GARDEN_HOOKS });
function gardenLineLook(id) { const d = id ? gardenGearDef(id) : null, s = d && d.kind === 'line' ? d.st : GARDEN_LINES[0].st; return { c: s.c, w: s.w }; }
/** Who loves a bait: fish that feed at the top, on the bottom, hunters or grazers, from how they swim and how they are shaped. */
function gardenBaitLikes(bait, def) {
  const likes = bait && bait.st && bait.st.likes; if (!likes || !def || !def.look) return false;
  const s = def.look.s, tags = [];
  if (def.beh === 'floater' || (def.beh === 'dart' && (s === 'slim' || s === 'round'))) tags.push('surface');
  if (def.beh === 'sinker' || ['cat', 'eel', 'crayfish', 'sturgeon'].includes(s)) tags.push('bottom');
  if (['pike', 'angler'].includes(s) || /perch|zander|trout|pike/.test(def.id)) tags.push('hunter');
  if (['carp', 'koi', 'fancy', 'flat'].includes(s)) tags.push('grazer');
  return likes.some(t => tags.includes(t));
}

/* ---------- spots ----------
   x, y, r in cells, in the lake. They are drawn where they are (gardenCatchWorldArt) and stand still, so you learn them. says: what the spot is good for, in words. */
const GARDEN_SPOTS = Object.freeze([   // world cells
  { id: 'reed-bank', name: 'The reed bank', x: 22.8, y: 13.9, r: 1.8, zone: 'shallow', says: 'Reeds, right by the shore. Shy fish feel safe in them.' },
  { id: 'lily-pads', name: 'The lily pads', x: 6.2, y: 14.3, r: 1.7, zone: 'shallow', says: 'Warm and still under the leaves. Carp and tench love it. It grows when you let fish go.' },
  { id: 'weed-bed', name: 'The weed bed', x: 17.6, y: 15.7, r: 1.8, zone: 'mid', says: 'Thick weed where small fish hide, and hunters wait for them.' },
  { id: 'sunken-log', name: 'The sunken log', x: 8.8, y: 16.3, r: 1.5, zone: 'mid', says: 'An old trunk, half under. Things with whiskers live below it.' },
  { id: 'cold-spring', name: 'The cold spring', x: 23.4, y: 16.8, r: 1.3, zone: 'mid', says: 'Bubbles of cold clean water come up here. Trout come for it.' },
  { id: 'drop-off', name: 'The drop-off', x: 5.4, y: 18.8, r: 2.3, zone: 'deep', says: 'The bottom falls away here. Big fish patrol the edge.' },
  { id: 'old-wreck', name: 'The old wreck', x: 18.6, y: 22.4, r: 2.1, zone: 'deep', says: 'A boat that never came home. You need a boat, a long pier or a great rod to reach it.' },
].map(Object.freeze));
const _GT_SPOT = new Map(GARDEN_SPOTS.map(s => [s.id, s]));
/* Where the rest of it stands, all in one place. */
const GARDEN_CATCH_CELLS = Object.freeze({   // world cells
  rack: Object.freeze({ x: 16.6, y: 12.9 }),                 // today's catch, hung up by the pier
  boatIn: Object.freeze({ x: 5.3, y: 14.2 }), boatOut: Object.freeze({ x: 5.5, y: 12.6 }),   // getting in and out of the rowing boat, by the mooring post
  bunting: Object.freeze({ x0: 6, x1: 21, y: 12.5 }),        // the festival's flags, along the shore
  sky: Object.freeze({ dx: 0, y: -2.5 }),                    // how far above the lake's near edge the sky's show is drawn
  thing: Object.freeze({ y0: 19, yN: 5, out: 6, secs: 90 }),  // the thing in the lake: its row, how many rows it may vary by, how far beyond the water it starts and ends, how long a pass takes
});
/** The lake's water, from the areas table: {x, y, w, h}. */
function gardenLakeWater() { const a = GARDEN_AREAS.find(q => q.water && q.fishing); return a ? a.water : { x: 0, y: 13, w: 28, h: 15 }; }
function gardenSpotDef(id) { return _GT_SPOT.get(String(id)) || null; }
/** Which spot is this point in? '' if none. Up and down count for a little more: a cell is shorter than it is wide. */
function gardenSpotAt(x, y) {
  let best = '', bd = 1e9;
  for (const s of GARDEN_SPOTS) { const d = Math.hypot(x - s.x, (y - s.y) * 1.3) / s.r; if (d <= 1 && d < bd) { bd = d; best = s.id; } }
  return best;
}
/** Today's hot spot: gulls over it, more fish at it. The same for everyone, so you can tell a friend. */
function gardenHotSpot(iso) { return GARDEN_SPOTS[gardenHash('hot|' + iso) % GARDEN_SPOTS.length]; }

/* ---------- events ----------
   rare: how much likelier the rarer kinds are, keen: how keen every fish is, shy: how keen shy fish are, snap: how much harder on a thin line. */
const GARDEN_LAKE_EVENTS = Object.freeze({
  frenzy: Object.freeze({ id: 'frenzy', name: 'The fish are feeding', says: 'For a little while there are more about, and they bite quicker.', icon: 'fish', keen: 1.5, rare: 1 }),
  fog: Object.freeze({ id: 'fog', name: 'Fog on the lake', says: 'Shy fish come much closer in the fog.', icon: 'cloud', shy: 1.6, rare: 1.3 }),
  storm: Object.freeze({ id: 'storm', name: 'A storm', says: 'Big fish feed near the top in rough water, but a thin line snaps more easily.', icon: 'cloud-lightning', rare: 1.5, keen: 1.15, snap: 1.25 }),
  meteor: Object.freeze({ id: 'meteor', name: 'Shooting stars tonight', says: 'Rare fish rise to look at the sky. A good night to stay up.', icon: 'sparkles', rare: 2 }),
  'blood-moon': Object.freeze({ id: 'blood-moon', name: 'A red moon', says: 'Strange things swim on a night like this. The rarest fish are about.', icon: 'moon', rare: 3, shy: 1.3 }),
  festival: Object.freeze({ id: 'festival', name: 'Fishing festival', says: 'Everything is biting. Weigh in your best fish at the lake board for a rosette.', icon: 'party-popper', rare: 1.5, keen: 1.3 }),
  spawning: Object.freeze({ id: 'spawning', name: 'The fish are spawning', says: 'Shoals in the shallows, and the big ones follow them in.', icon: 'waves', keen: 1.2, rare: 1.2 }),
});
function _gtDayNo(iso) { return Math.floor(Date.parse(String(iso).slice(0, 10) + 'T12:00:00Z') / 86400000); }   // clock-ok: a day's number, for sums
function _gtWeekday(iso) { return new Date(String(iso).slice(0, 10) + 'T12:00:00Z').getUTCDay(); }   // clock-ok: weekday maths
/** The moon, from the catalogue's table if it is there, else worked out here. */
function _gtMoon(iso) {
  if (typeof gardenMoonPhase === 'function') return gardenMoonPhase(iso);
  const age = ((_gtDayNo(iso) - 10962.5) % 29.53 + 29.53) % 29.53;   // (days since a new moon, from one known one)
  return age < 2 || age > 27.5 ? 'new' : age < 13 ? 'waxing' : age < 16.5 ? 'full' : 'waning';
}
/** A festival today? 'fish' on the second Saturday of a month, 'bug' (the bug-off) on the fourth, else ''. */
function gardenFestivalOn(iso) {
  if (_gtWeekday(iso) !== 6) return '';
  const d = Number(String(iso).slice(8, 10)), nth = Math.ceil(d / 7);
  return nth === 2 ? 'fish' : nth === 4 ? 'bug' : '';
}
/** The next festival from this day on: {iso, kind, days}. */
function gardenNextFestival(iso) {
  const n0 = _gtDayNo(iso);
  for (let i = 0; i < 40; i++) { const d = new Date((n0 + i) * 86400000 + 43200000).toISOString().slice(0, 10), k = gardenFestivalOn(d); if (k) return { iso: d, kind: k, days: i }; }   // clock-ok: walking the calendar
  return null;
}
/** Which events are on? Everything here comes from the day, the hour and the garden's own sky, so a host and its guests agree without a word. */
function gardenCatchEventsAt(now, iso, tod, season, rain) {
  const out = [], day = gardenHash('ev|' + iso), block = Math.floor(now / 10800000), bh = gardenHash('evb|' + block);
  if (bh % 8 === 0 && now % 10800000 < 1200000) out.push('frenzy');   // 20 minutes, about once a day
  if ((tod === 'dawn' || tod === 'dusk') && day % (season === 'autumn' || season === 'winter' ? 2 : 4) === 0) out.push('fog');
  if (rain && bh % 2 === 0) out.push('storm');
  if (tod === 'night' && day % 7 === 0) out.push('meteor');
  if (tod === 'night' && _gtMoon(iso) === 'full' && gardenHash('moon|' + iso.slice(0, 7)) % 2 === 0) out.push('blood-moon');
  if (gardenFestivalOn(iso) === 'fish') out.push('festival');
  if ((season === 'spring' || season === 'autumn') && (tod === 'dawn' || tod === 'day') && day % 5 === 0) out.push('spawning');
  return out;
}
const _gtEv = { key: '', list: [] };
/** What is on in the garden you are standing in, asked often: worked out afresh every 20 seconds. */
function gardenEventsNow() {
  try {
    const m = gardenHere(), key = Math.floor(m.now / 20000) + m.today + m.tod + (m.rain && m.rain.now ? 'r' : '');
    if (_gtEv.key !== key) { _gtEv.key = key; _gtEv.list = gardenCatchEventsAt(m.now, m.today, m.tod, m.season, !!(m.rain && m.rain.now)); }
    return _gtEv.list;
  } catch (e) { return []; }
}
function gardenEventOn(id) { return gardenEventsNow().includes(id); }
/** How the events on now change a number: gardenEventFactor('rare') */
function gardenEventFactor(k) { let f = 1; for (const id of gardenEventsNow()) { const e = GARDEN_LAKE_EVENTS[id]; if (e && e[k]) f *= e[k]; } return f; }

/* ---------- the same for everyone, from the date or the lake's own number ---------- */
/** This week's wanted poster: a fish anybody can go and get. */
function gardenWantedFor(weekFrom) {
  const list = GARDEN_FISH.filter(f => f.cat === 'fish' && f.lv <= 4 && (f.rarity === 'common' || f.rarity === 'uncommon') && !f.tod.length && !f.seasons.length && !f.needs && f.zone.some(z => z !== 'pond'));
  return list.length ? list[gardenHash('wanted|' + weekFrom) % list.length] : null;
}
const _gtKnown = new Map();
/** Every lake is known for four fish, from its own number: they come more often there. A reason to go and fish at a friend's. */
function gardenLakeKnownFor(seed) {
  const k = String(seed); if (_gtKnown.has(k)) return _gtKnown.get(k);
  const pool = GARDEN_FISH.filter(f => f.cat === 'fish' && f.lv <= 8 && !f.needs && ['common', 'uncommon', 'rare'].includes(f.rarity) && f.zone.some(z => z !== 'pond')), out = [];
  for (let i = 0; i < 40 && out.length < 4 && pool.length; i++) { const d = pool[gardenHash('known|' + k + '|' + i) % pool.length]; if (!out.includes(d.id)) out.push(d.id); }
  _gtKnown.set(k, out);
  return out;
}
/* Treasure maps, in four torn pieces fished up one at a time; where the cross is comes from your lake's number. What it makes is a decoration, so friends see it. */
const GARDEN_CHEST_MAPS = Object.freeze([
  Object.freeze({ id: 'm1', name: 'The torn map', make: 'sea-chest', coins: 60, says: 'Four pieces of old paper, with a cross on the water.' }),
  Object.freeze({ id: 'm2', name: 'The second map', make: 'ship-wheel', coins: 90, says: 'Somebody drew this one in a hurry.' }),
  Object.freeze({ id: 'm3', name: 'The last map', make: 'figurehead', coins: 140, says: 'It is drawn on the back of a ship’s log.' }),
]);
function gardenChestAt(seed, mapId) {
  // anywhere in the lake's middle rows, clear of the pier
  const h = gardenHash('chest|' + seed + '|' + mapId), L = gardenLakeWater(), P = GARDEN_PROPS.find(q => q.id === 'pier');
  const span = Math.max(1, L.w - 4), x = L.x + 2 + (h % span), y = L.y + 1 + ((h >> 7) % 7), inPier = P && x >= P.x - 1 && x <= P.x + P.w;
  return { x: inPier ? x + P.w + 3 : x, y };
}
