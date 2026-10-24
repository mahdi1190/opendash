/* ============================================================
   FUN WITH FRIENDS (2.17), the rules. PURE: tables and functions only. No
   DOM, no state, no page globals at load: Node evaluates this file
   (lib/friends/fun.mjs) so the server checks what friends send against the
   SAME allow-lists the page draws from. Every top-level name is `var`: these
   files load after 99-boot.js, and a hook the first render calls must never
   meet a TDZ.

   EVERYTHING THAT TRAVELS IS AN ID FROM THESE TABLES. No free text, no emoji
   from outside, no URLs, no pictures: the page maps each id to what it shows,
   and anything unknown is dropped on arrival.

     FUN_WAVES / FUN_WAVE_INFO   wave | high5 | nudge ("thinking of you") | thanks
     FUN_HIGH5          high-five animations {id, label, e, level}: level = the friendship level that unlocks it
     FUN_REACTIONS      reaction emoji {id, e, label}
     FUN_STICKERS       stickers {id, e, label, level?, event?}
     FUN_EMOTES         emotes (an animation, played when unwrapped) {id, e, label, level?, event?}
     FUN_COSMETICS      giftable avatar items: profile's seasonal items {id, k, item, e, label, season}
     FUN_WRAPS / FUN_LINES   gift paper and gift tags (a tag is an id: its words come from this table)
     FUN_THEMES         friend card and shared space themes {id, label, level}
     FUN_EVENTS         seasonal friend events (Trick or treat now; Winter lights and Spring bloom later)
     FUN_QUESTS         friendship quests {id, label ('{name}' is the friend's name), of, icon, event?}
     FUN_CAPS           the per-day caps, sending and receiving
     FUN_DUO_MARKS      the duo streak milestones
     funItem(t, id)     the table row of a sticker / emote / cosmetic / high5 / wrap / line / theme / reaction
     funIsoAdd(iso, n), funDow(iso), funWeekFrom(iso, ws), funHash(s)
     funEventOn(today)  the event running that day: {def, inst: 'halloween-2026', from, to, daysLeft} | null
     funDuo(mine, theirs, today)   the duo streak {cur, best, today, me, them, start}
     funDuoBest(both)   the longest run in a set of days
     funQuestPick(fid, week, ev)   three quest ids for one friend and one week
     funUnlocks(level)  what a friendship level has opened {high5, themes, stickers, emotes, wraps}
     funRewardsTrack()  [{level, items: [{t, id, label, e}]}]: the friendship level rewards, in order
     funCanSend(t, id, ctx)   '' or why that gift / wrap / line / high-five cannot be used now
                        ctx {level, event (an event id or ''), book: {stickerId: day}, owned: {cosmeticId: true}}
     funTierOf(def, n)  {at, label, next, nextLabel} for an amount of the event's currency
   ============================================================ */
var FUN_V = 1;
var FUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
var FUN_MSG_RE = /^[0-9a-f]{32}$/;
var FUN_FID_RE = /^[0-9a-f]{16}$/;
var FUN_DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
var _funF = Object.freeze;
var _funRows = function (rows) { return _funF(rows.map(function (r) { return _funF(r); })); };

/* ---------- waves, high-fives, nudges, reactions ---------- */
var FUN_WAVES = _funF(['wave', 'high5', 'nudge', 'thanks']);
var FUN_WAVE_INFO = _funF({
  wave: _funF({ e: '👋', label: 'Wave', did: 'waved at', icon: 'sparkles' }),
  high5: _funF({ e: '🙌', label: 'High five', did: 'high-fived', icon: 'zap' }),
  nudge: _funF({ e: '💭', label: 'Thinking of you', did: 'is thinking of', icon: 'heart' }),
  thanks: _funF({ e: '🙏', label: 'Thank you', did: 'thanked', icon: 'heart' }),
});
var FUN_HIGH5 = _funRows([
  { id: 'classic', label: 'High five', e: '🙌', level: 1 },
  { id: 'fist', label: 'Fist bump', e: '👊', level: 2 },
  { id: 'spin', label: 'Spinning five', e: '🌀', level: 4 },
  { id: 'fireworks', label: 'Fireworks five', e: '🎆', level: 5 },
  { id: 'rainbow', label: 'Rainbow five', e: '🌈', level: 7 },
]);
var FUN_REACTIONS = _funRows([
  { id: 'heart', e: '❤️', label: 'Love it' }, { id: 'clap', e: '👏', label: 'Applause' }, { id: 'party', e: '🎉', label: 'Party' },
  { id: 'fire', e: '🔥', label: 'On fire' }, { id: 'laugh', e: '😂', label: 'Ha!' }, { id: 'wow', e: '😮', label: 'Wow' },
  { id: 'hug', e: '🤗', label: 'Hug' }, { id: 'strong', e: '💪', label: 'Strong' },
]);

/* ---------- gifts ---------- */
var FUN_STICKERS = _funRows([
  { id: 'sunflower', e: '🌻', label: 'Sunflower' }, { id: 'rocket', e: '🚀', label: 'Rocket' }, { id: 'coffee', e: '☕', label: 'Coffee break' },
  { id: 'cat', e: '🐱', label: 'Cat nap' }, { id: 'star', e: '⭐', label: 'Gold star' }, { id: 'rainbow', e: '🌈', label: 'Rainbow' },
  { id: 'cake', e: '🍰', label: 'Slice of cake' }, { id: 'plant', e: '🪴', label: 'Pot plant' },
  { id: 'trophy', e: '🏆', label: 'Trophy', level: 3 }, { id: 'unicorn', e: '🦄', label: 'Unicorn', level: 5 }, { id: 'crown', e: '👑', label: 'Crown', level: 8 },
  { id: 'pumpkin', e: '🎃', label: 'Pumpkin', event: 'halloween' }, { id: 'ghost', e: '👻', label: 'Friendly ghost', event: 'halloween' },
  { id: 'bat', e: '🦇', label: 'Bat', event: 'halloween' }, { id: 'lollipop', e: '🍭', label: 'Lollipop', event: 'halloween' },
  { id: 'snowman', e: '⛄', label: 'Snowman', event: 'winter' }, { id: 'present', e: '🎁', label: 'Present', event: 'winter' }, { id: 'mitten', e: '🧤', label: 'Mittens', event: 'winter' },
  { id: 'blossom', e: '🌸', label: 'Blossom', event: 'spring' }, { id: 'tulip', e: '🌷', label: 'Tulip', event: 'spring' }, { id: 'chick', e: '🐣', label: 'Chick', event: 'spring' },
]);
var FUN_EMOTES = _funRows([
  { id: 'dance', e: '💃', label: 'Happy dance' }, { id: 'confetti', e: '🎊', label: 'Confetti' }, { id: 'hearts', e: '💕', label: 'Floating hearts' },
  { id: 'fireworks', e: '🎆', label: 'Fireworks', level: 6 },
  { id: 'boo', e: '👻', label: 'Boo!', event: 'halloween' }, { id: 'snow', e: '❄️', label: 'Snowfall', event: 'winter' }, { id: 'petals', e: '🌸', label: 'Petal shower', event: 'spring' },
]);
/** Profile's seasonal avatar items (97-profile-0kit.js PF_PARTS, `season`): a friend who gets one keeps it for good. */
var FUN_COSMETICS = _funRows([
  { id: 'hat-witch', k: 'hat', item: 'witch', e: '🧙', label: 'Witch hat', season: 'halloween' },
  { id: 'hat-santa', k: 'hat', item: 'santa', e: '🎅', label: 'Santa hat', season: 'december' },
  { id: 'top-festive', k: 'top', item: 'festive', e: '🧶', label: 'Festive jumper', season: 'festive' },
  { id: 'hat-flowers', k: 'hat', item: 'flowers', e: '💐', label: 'Flower crown', season: 'spring' },
  // integrate 2.18: the wardrobe's seasonal pieces (97-profile-0kit-*.js, agent 'wardrobe') can be gifted too. A friend
  // still on 2.17 does not know these ids and drops the gift quietly, like any newer gift.
  { id: 'hat-horns', k: 'hat', item: 'horns', e: '😈', label: 'Little horns', season: 'halloween' },
  { id: 'paint-skull', k: 'paint', item: 'skull', e: '💀', label: 'Sugar skull face paint', season: 'halloween' },
  { id: 'paint-pumpkin', k: 'paint', item: 'pumpkin', e: '🎃', label: 'Pumpkin face paint', season: 'halloween' },
  { id: 'pattern-bats', k: 'pattern', item: 'bats', e: '🦇', label: 'Bat print top', season: 'halloween' },
  { id: 'paint-snowflake', k: 'paint', item: 'snowflake', e: '❄️', label: 'Snowflake face paint', season: 'december' },
  { id: 'pattern-snow', k: 'pattern', item: 'snow', e: '⛄', label: 'Snowflake print top', season: 'december' },
  { id: 'hat-antlers', k: 'hat', item: 'antlers', e: '🦌', label: 'Antlers', season: 'festive' },
  { id: 'hat-bunny', k: 'hat', item: 'bunny', e: '🐰', label: 'Bunny ears', season: 'spring' },
  { id: 'paint-flowers', k: 'paint', item: 'flowers', e: '🌼', label: 'Spring flowers face paint', season: 'spring' },
  { id: 'pattern-tropical', k: 'pattern', item: 'tropical', e: '🌴', label: 'Tropical print top', season: 'summer' },
  { id: 'necklace-shell', k: 'necklace', item: 'shell', e: '🐚', label: 'Shell necklace', season: 'summer' },
  { id: 'hat-party', k: 'hat', item: 'party', e: '🥳', label: 'Party hat', season: 'birthday' },
]);
// When each season's items come (the cosmetics' `season`, as 97-profile-0kit.js PF_SEASONS says it)
var _FUN_SEASON_WHEN = _funF({ halloween: 'around Halloween', december: 'in December', festive: 'from December to early January', spring: 'in spring',
  summer: 'in summer', birthday: 'in the week of your birthday' });
var FUN_WRAPS = _funRows([
  { id: 'red', label: 'Red ribbon' }, { id: 'blue', label: 'Blue stars' }, { id: 'green', label: 'Green stripes' }, { id: 'gold', label: 'Gold foil', level: 3 },
  { id: 'pumpkin', label: 'Pumpkin paper', event: 'halloween' }, { id: 'snow', label: 'Snowflakes', event: 'winter' }, { id: 'petal', label: 'Petals', event: 'spring' },
]);
var FUN_LINES = _funRows([
  { id: 'because', text: 'Just because' }, { id: 'well-done', text: 'Well done!' }, { id: 'thanks', text: 'Thank you' },
  { id: 'thinking', text: 'Thinking of you' }, { id: 'congrats', text: 'Congratulations' }, { id: 'keep-going', text: 'Keep going!' },
  { id: 'spooky', text: 'Happy Halloween', event: 'halloween' }, { id: 'cosy', text: 'Warm winter wishes', event: 'winter' }, { id: 'bloom', text: 'Happy spring', event: 'spring' },
]);
var FUN_GIFT_TYPES = _funF(['sticker', 'emote', 'cosmetic']);

/* ---------- friendship level rewards: card and space themes (the rest carry a level above) ---------- */
var FUN_THEMES = _funRows([
  { id: 'plain', label: 'Plain', level: 1 }, { id: 'sunny', label: 'Sunny', level: 3 }, { id: 'meadow', label: 'Meadow', level: 4 },
  { id: 'starlight', label: 'Starlight', level: 5 }, { id: 'aurora', label: 'Aurora', level: 7 },
]);

/* ---------- seasonal friend events ---------- */
// Windows are month-day ranges (a range may cross the new year). Halloween's matches profile's 'halloween'
// season (97-profile-0kit.js PF_SEASONS), so its costume (the witch hat) can be picked while the event runs.
var FUN_EVENTS = _funRows([
  { id: 'halloween', label: 'Trick or treat', icon: 'moon', from: '10-15', to: '11-05', season: 'halloween',
    blurb: "Cheering friends on drops sweets in your bag. Knock on a friend's door: they answer with a treat or a trick.",
    currency: _funF({ id: 'candy', one: 'sweet', many: 'sweets', e: '🍬' }), costume: _funF([_funF(['hat', 'witch'])]), costumeLabel: 'the witch hat',
    stickers: _funF(['pumpkin', 'ghost', 'bat', 'lollipop']), emote: 'boo', wrap: 'pumpkin', line: 'spooky',
    knock: _funF({ label: 'Trick or treat', icon: 'house', e: '🚪', did: 'knocked on your door' }),
    treat: _funF({ label: 'Give a treat', e: '🍬', did: 'gave you a treat' }), trick: _funF({ label: 'Play a trick', e: '👻', did: 'played a trick on you' }),
    drops: _funF({ cheerOut: 1, cheerIn: 1, wave: 1, gift: 2, give: 1, trick: 1 }), dayCap: 15, costumeBonus: 1,
    tiers: _funF([_funF([10, 'A bag of sweets']), _funF([25, 'Sweet tooth']), _funF([50, 'Sugar rush']), _funF([100, 'Candy royalty'])]) },
  { id: 'winter', label: 'Winter lights', icon: 'snowflake', from: '12-01', to: '01-06', season: 'festive',
    blurb: "Every cheer lights a snowflake. Sing a carol at a friend's door: they answer with cocoa or a snowball.",
    currency: _funF({ id: 'snowflake', one: 'snowflake', many: 'snowflakes', e: '❄️' }), costume: _funF([_funF(['hat', 'santa']), _funF(['top', 'festive'])]), costumeLabel: 'a Santa hat or festive jumper',
    stickers: _funF(['snowman', 'present', 'mitten']), emote: 'snow', wrap: 'snow', line: 'cosy',
    knock: _funF({ label: 'Sing a carol', icon: 'music', e: '🎶', did: 'sang a carol at your door' }),
    treat: _funF({ label: 'Share cocoa', e: '☕', did: 'shared cocoa with you' }), trick: _funF({ label: 'Throw a snowball', e: '❄️', did: 'threw a snowball at you' }),
    drops: _funF({ cheerOut: 1, cheerIn: 1, wave: 1, gift: 2, give: 1, trick: 1 }), dayCap: 15, costumeBonus: 1,
    tiers: _funF([_funF([10, 'Fairy lights']), _funF([25, 'Snow globe']), _funF([50, 'Winter wonderland']), _funF([100, 'Northern lights'])]) },
  { id: 'spring', label: 'Spring bloom', icon: 'flower-2', from: '03-20', to: '04-10', season: 'spring',
    blurb: "Every cheer grows a petal. Leave a posy at a friend's door: they answer with honey or a bee.",
    currency: _funF({ id: 'petal', one: 'petal', many: 'petals', e: '🌸' }), costume: _funF([_funF(['hat', 'flowers'])]), costumeLabel: 'the flower crown',
    stickers: _funF(['blossom', 'tulip', 'chick']), emote: 'petals', wrap: 'petal', line: 'bloom',
    knock: _funF({ label: 'Leave a posy', icon: 'flower-2', e: '💐', did: 'left a posy at your door' }),
    treat: _funF({ label: 'Share honey', e: '🍯', did: 'shared honey with you' }), trick: _funF({ label: 'Send a bee', e: '🐝', did: 'sent a buzzing bee your way' }),
    drops: _funF({ cheerOut: 1, cheerIn: 1, wave: 1, gift: 2, give: 1, trick: 1 }), dayCap: 15, costumeBonus: 1,
    tiers: _funF([_funF([10, 'A posy']), _funF([25, 'Flower bed']), _funF([50, 'Secret garden']), _funF([100, 'Full bloom'])]) },
]);

/* ---------- friendship quests (three per friend per week) ---------- */
var FUN_QUESTS = _funRows([
  { id: 'cheer3', label: 'Cheer {name} on 3 times', of: 3, icon: 'heart' },
  { id: 'wave5', label: 'Wave or high-five {name} 5 times', of: 5, icon: 'sparkles' },
  { id: 'gift1', label: 'Send {name} a gift', of: 1, icon: 'gift' },
  { id: 'duo3', label: 'Reach a 3-day duo streak with {name}', of: 3, icon: 'flame' },
  { id: 'both4', label: 'Both finish something on 4 days', of: 4, icon: 'calendar-check' },
  { id: 'react3', label: "React to 3 of {name}'s moments", of: 3, icon: 'party-popper' },
  { id: 'focus1', label: 'Focus together with {name}', of: 1, icon: 'timer' },
  { id: 'knock1', label: "Knock on {name}'s door", of: 1, icon: 'house', event: true },
]);

/* ---------- caps: [a day in all, a day per friend] when sending; per friend a day when receiving ----------
   Every send is one relay post to that friend, and a friend's drop token takes 100 a day for everything
   (cheers, presence, spaces...): fun stays well under half of it. */
var FUN_CAPS = _funF({
  send: _funF({ wave: _funF([30, 10]), nudge: _funF([3, 1]), react: _funF([60, 20]), gift: _funF([5, 2]), knock: _funF([5, 1]), answer: _funF([20, 5]) }),
  recv: _funF({ wave: 20, nudge: 3, react: 60, gift: 10, day: 3, event: 10 }),
  unopened: 30,          // gifts from one friend waiting to be opened
  comboMs: 10 * 60000,   // two high-fives within ten minutes: a double high-five
  knockMs: 2 * 86400000, // a knock can be answered for two days
});
var FUN_DUO_MARKS = _funF([3, 7, 14, 30, 50, 100, 200, 365]);

/* ---------- small helpers ---------- */
function funItem(t, id) {
  var list = t === 'sticker' ? FUN_STICKERS : t === 'emote' ? FUN_EMOTES : t === 'cosmetic' ? FUN_COSMETICS : t === 'high5' ? FUN_HIGH5
    : t === 'wrap' ? FUN_WRAPS : t === 'line' ? FUN_LINES : t === 'theme' ? FUN_THEMES : t === 'reaction' ? FUN_REACTIONS : t === 'event' ? FUN_EVENTS : t === 'quest' ? FUN_QUESTS : null;
  if (!list || typeof id !== 'string') return null;
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}
function funIsoAdd(iso, n) { return new Date(Date.parse(iso + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10); }   // clock-ok: UTC date maths on ISO days
function funDow(iso) { return new Date(iso + 'T12:00:00Z').getUTCDay(); }   // clock-ok: the weekday of an ISO day
function funDaysBetween(a, b) { return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000); }
/** The first day of the week that holds `iso` (ws: 'Mon' | 'Sun' | 'Sat'). */
function funWeekFrom(iso, ws) {
  var start = ws === 'Sun' ? 0 : ws === 'Sat' ? 6 : 1;
  return funIsoAdd(iso, -((funDow(iso) - start + 7) % 7));
}
/** FNV-1a, 8 hex digits: keys that must not carry a friend id (the game's award keys live in the state). */
function funHash(s) {
  var h = 2166136261; s = String(s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
}
function _funRand(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** The friend event running on `today` (ISO): {def, inst, from, to, daysLeft}, or null. */
function funEventOn(today) {
  if (typeof today !== 'string' || !FUN_DAY_RE.test(today)) return null;
  var md = today.slice(5), y = Number(today.slice(0, 4));
  for (var i = 0; i < FUN_EVENTS.length; i++) {
    var d = FUN_EVENTS[i], startY;
    if (d.from <= d.to) { if (md < d.from || md > d.to) continue; startY = y; }
    else if (md >= d.from) startY = y; else if (md <= d.to) startY = y - 1; else continue;
    var from = startY + '-' + d.from, to = (d.from <= d.to ? startY : startY + 1) + '-' + d.to;
    return { def: d, inst: d.id + '-' + startY, from: from, to: to, daysLeft: funDaysBetween(today, to) };
  }
  return null;
}
/** The amount's tier in an event: {at, label, next, nextLabel}. */
function funTierOf(def, n) {
  var out = { at: 0, label: '', next: 0, nextLabel: '' };
  var tiers = def && def.tiers ? def.tiers : [];
  for (var i = 0; i < tiers.length; i++) {
    if (n >= tiers[i][0]) { out.at = tiers[i][0]; out.label = tiers[i][1]; }
    else { out.next = tiers[i][0]; out.nextLabel = tiers[i][1]; break; }
  }
  return out;
}

/** The longest run of consecutive days in a list or Set of ISO days. */
function funDuoBest(days) {
  var set = days instanceof Set ? days : new Set(days || []);
  var best = 0;
  set.forEach(function (d) {
    if (set.has(funIsoAdd(d, -1))) return;
    var n = 1, c = d;
    while (set.has(c = funIsoAdd(c, 1))) n++;
    if (n > best) best = n;
  });
  return best;
}
/**
 * The duo streak with one friend: days on which you BOTH finished at least one task (each side's own
 * calendar day). Today stays open until it ends: a run that reached yesterday is still alive.
 * mine / theirs: {day: 1} or arrays of ISO days. -> {cur, best, today, me, them, start}
 */
function funDuo(mine, theirs, today) {
  var a = new Set(Array.isArray(mine) ? mine : Object.keys(mine || {}));
  var b = new Set(Array.isArray(theirs) ? theirs : Object.keys(theirs || {}));
  var both = new Set();
  a.forEach(function (d) { if (b.has(d) && FUN_DAY_RE.test(d) && d <= today) both.add(d); });
  var start = both.has(today) ? today : funIsoAdd(today, -1);
  var cur = 0, d = start;
  while (both.has(d)) { cur++; d = funIsoAdd(d, -1); }
  return { cur: cur, best: Math.max(cur, funDuoBest(both)), today: both.has(today), me: a.has(today), them: b.has(today), start: cur ? funIsoAdd(start, -(cur - 1)) : '' };
}

/** Three quests for one friend and one week, the same on every device (an event swaps in its door quest). */
function funQuestPick(fid, week, eventOn) {
  var pool = FUN_QUESTS.filter(function (q) { return !q.event; }).map(function (q) { return q.id; });
  var rnd = _funRand(parseInt(funHash(String(fid) + '|' + String(week)), 16));
  var out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  if (eventOn) out[2] = 'knock1';
  return out;
}

/** What friendship level `level` has opened (everything at or below it). */
function funUnlocks(level) {
  var lv = Math.max(1, Number(level) || 1);
  var ok = function (r) { return !r.event && (r.level || 1) <= lv; };
  var ids = function (list) { return list.filter(ok).map(function (r) { return r.id; }); };
  return { high5: ids(FUN_HIGH5), themes: ids(FUN_THEMES), stickers: ids(FUN_STICKERS), emotes: ids(FUN_EMOTES), wraps: ids(FUN_WRAPS) };
}
/** The friendship level rewards, level by level: [{level, items: [{t, id, label, e?}]}]. */
function funRewardsTrack() {
  var by = {};
  var add = function (t, list) { list.forEach(function (r) { if (r.event || !r.level || r.level < 2) return; (by[r.level] = by[r.level] || []).push({ t: t, id: r.id, label: r.label, e: r.e || '' }); }); };
  add('high5', FUN_HIGH5); add('theme', FUN_THEMES); add('sticker', FUN_STICKERS); add('emote', FUN_EMOTES); add('wrap', FUN_WRAPS);
  return Object.keys(by).map(Number).sort(function (x, y) { return x - y; }).map(function (l) { return { level: l, items: by[l] }; });
}
/**
 * May this be used now? t: sticker | emote | cosmetic | wrap | line | high5 | theme. '' when it may, else why not.
 * ctx {level: friendship level with that friend, event: the running event's id or '', book: {stickerId: day}, owned: {cosmeticId: true}}
 */
function funCanSend(t, id, ctx) {
  var r = funItem(t, id);
  if (!r) return 'Not available';
  ctx = ctx || {};
  if (t === 'cosmetic') {
    if (ctx.owned && ctx.owned[id]) return '';
    return 'Collect it first (it comes ' + (_FUN_SEASON_WHEN[r.season] || 'with its season') + ')';
  }
  if (r.event) {
    if (ctx.event === r.event) return '';
    if (t === 'sticker' && ctx.book && ctx.book[id]) return '';
    var ev = funItem('event', r.event);
    return 'Seasonal: comes with ' + (ev ? ev.label : 'its event');
  }
  if (r.level && (Number(ctx.level) || 1) < r.level) return 'Friendship level ' + r.level;
  return '';
}
