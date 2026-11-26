/* ============================================================
   THE WEEK AND THE YEAR, the rules (npcs-PLAN 1.5 and 3.10; the folk3 plan, steps 6 and 7). Pure: no page, no DOM, no clock of its own,
   nothing called at load, so tools can load it in node.

   THE WEEK. The vale has a rhythm you learn without being told; nothing is announced and nothing is missed:
     Saturday    market day: stalls round the village plaza, the keepers behind them, everyone else browsing
     Wednesday   card evening: a folding table and stools set out under a lamp by the plaza, a game of cards till late
   THE YEAR. Festivals are rows with a date rule (fixed, the first / nth / last weekday of a month), hours and a kit; south of the equator
   each moves six months. The first is the Frost Fair (19 to 21 December): stalls, a brazier, bunting between lantern posts, everyone at it.

   KINDS, NEVER PLACES (rule 17). What a day sets out (its KIT: stalls, a brazier, lantern posts, a card table) is placed by
   94-garden-wonder-folk3-6kit.js round "the village plaza", found by data (the plaza in open land with the most homes near it, then the
   largest, then nearest the arrival point). The planner learns what is on from the kit itself: every kit spot it can book is a thing in the
   day's list with `kitDay` set, so a layout with no plaza (no kit) simply has an ordinary day, with no code change.

     VALE_YEAR_ROWS / VALE_YEAR_ROW   the week's rows and the festivals, one table (id -> row)
     valeFestDates(row, y, south)     {from, to} ISO days a festival is held in year y
     valeFestOn(iso, south)           the festival on that day, or null
     valeFestNext(iso, south)         every festival, soonest first: [{row, from, to, days}]
     valeYearToday(iso, south)        the row that is on that day (a festival first, then the week's), or null
     valeWeekBlock(row, blk, ctx)     the planner's hook (P2): this villager's choices for a block on a day the kit is out, or null
     valeWeekAct(id)                  the planner's hook (P3): an activity row for the week's own activity ids ('vy:keep:quince', 'vy:warm')
   ============================================================ */
/** Each stall's goods and its sign: drawn by the kit (94-garden-wonder-folk3-6kit.js), worded here. */
const VALE_STALLS = Object.freeze({
  quince: Object.freeze({ sign: 'Honey', goods: 'honey', awning: ['#e8b830', '#fbf3dc'], line: 'Honey from the top of the stair. The bees did most of it.' }),
  bramble: Object.freeze({ sign: 'Maps', goods: 'maps', awning: ['#3f7a5a', '#f4ecd8'], line: 'Maps. All true. One corner of each is wrong. I tell people which.' }),
  pip: Object.freeze({ sign: 'Stones', goods: 'stones', awning: ['#3f7fa8', '#f4f0e6'], line: 'River stones! Each one has been all the way down the river. That is more than most people.' }),
  perpetua: Object.freeze({ sign: 'Stamps', goods: 'stamps', awning: ['#c8442e', '#fbf0e0'], line: 'Stamps. They go on letters. Letters go with me. You can see how it all fits together.' }),
  'quince-cakes': Object.freeze({ sign: 'Honey cakes', goods: 'cakes', awning: ['#c8442e', '#fbf5ec'], line: 'Honey cakes, warm. Warm-ish. They were warm when I set out.' }),
  'perpetua-cards': Object.freeze({ sign: 'Cards', goods: 'cards', awning: ['#3a6a4a', '#fbf5ec'], line: 'Winter cards. They will arrive by spring. That is on time, for me.' }),
});
/** The week and the year in one table. kind 'week' (day: 0 Sunday .. 6 Saturday) or 'fest' (rule). blocks: the day's blocks it holds
 *  (VALE_BLOCKS). kit: what is set out. keepers: [villager, stall look] behind the stalls; the rest browse (market) or warm their hands
 *  and watch (fair). players: who sits down to cards. thing: what taking part gives, once a year (a GARDEN_DECOR id). */
const VALE_YEAR_ROWS = Object.freeze([
  Object.freeze({ id: 'market', kind: 'week', day: 6, name: 'Market day', blocks: Object.freeze(['morning', 'midday', 'afternoon']), hours: Object.freeze([9, 16]), kit: 'market',
    keepers: Object.freeze([['quince', 'quince'], ['bramble', 'bramble'], ['pip', 'pip'], ['perpetua', 'perpetua']]), browse: 1,
    blurb: 'Stalls round the green on Saturdays: honey, maps, river stones and stamps.', line: 'Market day until four.' }),
  Object.freeze({ id: 'cards', kind: 'week', day: 3, name: 'Card evening', blocks: Object.freeze(['evening']), hours: Object.freeze([18, 22]), kit: 'cards', dry: 1,
    players: Object.freeze(['bramble', 'quince', 'angler', 'perpetua', 'pip']),
    blurb: 'Wednesday evenings: a card table under the lamp by the green. Anyone may sit in.', line: 'Card evening tonight, under the lamp.' }),
  Object.freeze({ id: 'frost-fair', kind: 'fest', rule: Object.freeze({ k: 'fixed', mo: 12, d: 19, len: 3 }), name: 'The Frost Fair', blocks: Object.freeze(['afternoon', 'dusk', 'evening']), hours: Object.freeze([13, 21]), kit: 'fair',
    keepers: Object.freeze([['quince', 'quince-cakes'], ['perpetua', 'perpetua-cards']]), warm: 1, open: 'frost-open', thing: 'vy-star-lantern', season: 'winter',
    blurb: 'Three days before midwinter: stalls, a brazier, bunting and lanterns on the green, and everyone at it.', line: 'The Frost Fair is on, on the green.',
    notice: 'The Frost Fair is coming: stalls and a brazier on the green, and lanterns at dusk.' }),
]);
const VALE_YEAR_ROW = new Map(VALE_YEAR_ROWS.map(r => [r.id, r]));
/* ---------- festival dates (ported from the unmerged feat/festivals: the same rules, south six months on) ---------- */
function _vyIso(y, mo, d) { return String(y).padStart(4, '0') + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
function _vyDow(y, mo, d) { return new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); }   // clock-ok: the weekday of a calendar day
function _vyDim(y, mo) { return new Date(Date.UTC(y, mo, 0)).getUTCDate(); }   // clock-ok: days in a month
function _vyAdd(iso, n) { const t = Date.parse(iso + 'T12:00:00Z') + n * 86400000; return new Date(t).toISOString().slice(0, 10); }   // clock-ok: ISO day arithmetic
function valeFestDates(row, y, south) {
  const R0 = row.rule, R = south ? Object.assign({}, R0, { mo: ((R0.mo + 5) % 12) + 1 }) : R0, mo = R.mo;
  let d = 1;
  if (R.k === 'fixed') d = R.d;
  else if (R.k === 'first') { while (_vyDow(y, mo, d) !== R.dow) d++; }
  else if (R.k === 'nth') { while (_vyDow(y, mo, d) !== R.dow) d++; d += 7 * ((R.n || 1) - 1); }
  else if (R.k === 'last') { d = _vyDim(y, mo); while (_vyDow(y, mo, d) !== R.dow) d--; }
  const from = _vyIso(y, mo, d);
  return { from, to: _vyAdd(from, (R.len || 1) - 1) };
}
function valeFestOn(iso, south) {
  const s = String(iso || '').slice(0, 10), y = Number(s.slice(0, 4)); if (!y) return null;
  for (const r of VALE_YEAR_ROWS) { if (r.kind !== 'fest') continue; for (const yy of [y, y - 1]) { const D = valeFestDates(r, yy, south); if (s >= D.from && s <= D.to) return r; } }
  return null;
}
function valeFestNext(iso, south) {
  const s = String(iso || '').slice(0, 10), y = Number(s.slice(0, 4)), out = [];
  for (const r of VALE_YEAR_ROWS) {
    if (r.kind !== 'fest') continue;
    let pick = null; for (const yy of [y - 1, y, y + 1]) { const D = valeFestDates(r, yy, south); if (D.to >= s && (!pick || D.from < pick.from)) pick = D; }
    if (!pick) continue;
    const days = pick.from <= s ? 0 : Math.round((Date.parse(pick.from + 'T12:00:00Z') - Date.parse(s + 'T12:00:00Z')) / 86400000);   // clock-ok: days between two ISO days
    out.push({ row: r, from: pick.from, to: pick.to, days });
  }
  return out.sort((a, b) => a.days - b.days);
}
/** What is on that day: a festival first (it takes the whole day over), then the week's row for the weekday. */
function valeYearToday(iso, south) {
  const f = valeFestOn(iso, south); if (f) return f;
  const s = String(iso || '').slice(0, 10); if (!s) return null;
  const dow = new Date(s + 'T12:00:00Z').getUTCDay();   // clock-ok: the weekday of an ISO day
  return VALE_YEAR_ROWS.find(r => r.kind === 'week' && r.day === dow) || null;
}
/* ---------- the planner's hooks ---------- */
const VY_STALL_KINDS = Object.freeze(['vk-keep']);
/** The week's own activities (the planner asks this for an id it does not know: P3). Each asks for kit spots by kind, like any bench. */
function valeWeekAct(id) {
  const s = String(id || '');
  if (s.startsWith('vy:keep:')) return { q: { kinds: ['vk-keep-' + s.slice(8)], acts: ['keep'] }, d: [90, 300], clip: 'stall' };
  if (s === 'vy:browse') return { q: { kinds: ['vk-browse'], acts: ['browse'] }, d: [14, 34], clip: 'browse' };
  if (s === 'vy:cards') return { q: { kinds: ['vk-stool'], acts: ['sit'] }, d: [80, 260], clip: 'sit' };
  if (s === 'vy:watch') return { q: { kinds: ['vk-watch'], acts: ['watch'] }, d: [30, 90], clip: 'idle' };
  if (s === 'vy:warm') return { q: { kinds: ['vk-warm'], acts: ['warm'] }, d: [30, 90], clip: 'warm' };
  return null;
}
/** The kit out today, read from the day's things (cached on the planner's per-villager ctx): { row, keep: Set(villager ids with a stall),
 *  stools, warm, watch } or null. */
function _vyKitOf(ctx) {
  if (!ctx || !ctx.things) return null;
  if (ctx._vy !== undefined) return ctx._vy;
  let day = '', keep = new Set(), stools = 0, warm = 0, watch = 0, browse = 0;
  for (const t of ctx.things) {
    if (!t || !t.kit || !t.kitDay) continue;
    day = t.kitDay;
    if (t.kind && t.kind.startsWith('vk-keep-')) keep.add(t.kind.slice(8));
    else if (t.kind === 'vk-stool') stools++; else if (t.kind === 'vk-warm') warm++; else if (t.kind === 'vk-watch') watch++; else if (t.kind === 'vk-browse') browse++;
  }
  const row = day ? VALE_YEAR_ROW.get(day) : null;
  ctx._vy = row ? { row, keep, stools, warm, watch, browse } : null;
  return ctx._vy;
}
/** A villager's choices for a block on a day something is on (null: their own routine stands). Asleep and indoor blocks are left alone
 *  (a night owl sleeps through market day), and so is anyone away from home (they visit by day, as always). */
function valeWeekBlock(row, blk, ctx) {
  const K = _vyKitOf(ctx); if (!K || !row || !K.row.blocks.includes(blk)) return null;
  if (ctx.away && ctx.away.has && ctx.away.has(row.id)) return null;
  const own = (typeof VALE_ROUTINES !== 'undefined' && VALE_ROUTINES[row.routine] && VALE_ROUTINES[row.routine][blk]) || [];
  if (own.length && own.every(c => c[0] === 'sleep')) return null;   // (asleep: a night owl by day, anyone at night)
  const R = K.row;
  if (R.kit === 'market' || R.kit === 'fair') {
    if (K.keep.has(row.id)) return [['vy:keep:' + row.id, 10]];
    const out = [];
    if (K.browse) out.push(['vy:browse', R.kit === 'fair' ? 3 : 5]);
    if (R.kit === 'fair') { if (K.warm) out.push(['vy:warm', 5]); if (K.watch) out.push(['vy:watch', 4]); }
    if (!out.length) return null;
    // (market day: the rest of the day is still theirs, a browse among their usual things; at the fair everyone is at the fair)
    return R.kit === 'fair' ? out : out.concat(own.filter(c => c[0] !== 'sleep'));
  }
  if (R.kit === 'cards') {
    if (!K.stools || !(R.players || []).includes(row.id)) return null;
    return R.dry ? [['vy:cards', 8, 'dry'], ['home', 1]] : [['vy:cards', 8], ['home', 1]];
  }
  return null;
}
/* ---------- words for the day (joined to each villager's day lines: hook T3) ---------- */
const VF3_DAY_LINES = Object.freeze({
  pip: Object.freeze([
    { if: F => F.weekday === 6, t: 'Market day! I’ve got a stall. It’s stones. I found every one of them myself. Some of them twice.' },
    { if: F => F.weekday === 3, t: 'Cards tonight! I don’t know the rules. Nobody minds. I mind a bit. I like to win the ones I don’t know.' },
    { if: F => F.fest === 'frost-fair', t: 'The Frost Fair! I put my ear on the ice of the trough. You can hear the fish thinking. They think slowly in December.' },
  ]),
  quince: Object.freeze([
    { if: F => F.weekday === 6, t: 'Honey at the stall till four. I counted the jars. Forty. Then thirty-nine. I tested one. For the bees.' },
    { if: F => F.weekday === 3, t: 'Card evening. I keep the score. I count very carefully, which is why it takes all night.' },
    { if: F => F.fest === 'frost-fair', t: 'Honey cakes at the fair! Bees don’t come. They’re asleep in a ball. I take them a cake anyway, after.' },
  ]),
  bramble: Object.freeze([
    { if: F => F.weekday === 6, t: 'I have a stall on market day. Maps. I tell people which corner is wrong. It saves arguments.' },
    { if: F => F.weekday === 3, t: 'Cards tonight. I always lose. I am very good at losing. Years of practice.' },
    { if: F => F.fest === 'frost-fair', t: 'The fair is on the green. I drew it. I drew it last year too. The green has not moved. I check.' },
  ]),
  angler: Object.freeze([
    { if: F => F.weekday === 3, t: 'Cards tonight, under the lamp. I play slow. They say I play slow. I say I play properly.' },
    { if: F => F.fest === 'frost-fair', t: 'Fair’s on. I go for the brazier. Warm hands, good company. In that order.' },
  ]),
  tam: Object.freeze([
    { if: F => F.weekday === 6, t: 'Market day. I go round the stalls. I don’t buy anything. I like to know what there is.' },
    { if: F => F.fest === 'frost-fair', t: 'Frost Fair. Ground’s hard. I came up for the brazier. Thought you’d want to know.' },
  ]),
  thistle: Object.freeze([
    { if: F => F.fest === 'frost-fair', t: 'The Frost Fair, dear! I ought to be asleep under the leaves. I set myself a little alarm. It’s a frog.' },
  ]),
  perpetua: Object.freeze([
    { if: F => F.weekday === 6, t: 'Stamps on market day. People buy them and then wait for me. It is a whole arrangement.' },
    { if: F => F.fest === 'frost-fair', t: 'Winter cards at my stall. They will arrive by spring. That is on time, for me.' },
  ]),
  hollin: Object.freeze([
    { if: F => F.fest === 'frost-fair', t: 'I brought the logs for the brazier. I stand at the edge. It’s warm enough, at the edge.' },
  ]),
});
