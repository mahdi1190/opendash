/* ============================================================
   PLAYING TOGETHER, the rules (docs/dev/GARDEN_TOGETHER.md). PURE: tables and small functions, no DOM, no state.
   lib/friends/live.mjs evaluates this file too, so what the page offers and what the host's server accepts come
   from one table. Levels, acts, caps, phrases and budgets are data: change them here.

     GL_LEVELS            none < look < help < play
     GL_ACTS              each act a visitor can ask for: the level it needs; mine: only what is theirs (unless May touch)
     GL_CAPS              how many of each a visitor may do in one garden in a day
     GL_BUDGET            this computer's allowance of room messages a day, sent and arrived, and one visitor's share (direct links do not count)
     GL_EMOTES            the moves anyone can see, GL_PHRASES the preset speech bubbles: ids on the wire, drawn from these tables
     GL_FX_KINDS          what people see each other do (pets, fishing, nets, a catch held up): glFxOk(b) -> '' | why
     GL_QUEUE             what can wait for a host who is out
     GL_CT                contests: a timed round of fishing or bug-netting that the host referees; glCtFishPoints / glCtBugPoints score a catch
     glAtLeast(lv, min)   glMayDo(lv, t) -> '' | why     glIntentOk(b) -> '' | why     glPostOk(p) -> '' | why
   ============================================================ */
const GL_V = 2;                   // 2: what a visit can ask for grew (feed, turn), and what waits for the host. An older peer gets the saved copy
const GL_PEOPLE = 8;              // everyone in a garden at once, the host included
const GL_LEVELS = Object.freeze(['none', 'look', 'help', 'play']);
const GL_LEVEL_NAMES = Object.freeze({ none: 'Not yet', look: 'Look', help: 'Help', play: 'Play' });
const GL_SHARES = Object.freeze(['keeper', 'split', 'owner']);
const GL_SHARE_NAMES = Object.freeze({ keeper: 'Whoever planted keeps it', split: 'Half each', owner: 'All to me' });
const GL_ACTS = Object.freeze({
  plant: Object.freeze({ lv: 'play', place: 'plant' }),
  place: Object.freeze({ lv: 'play', place: 'decor' }),
  water: Object.freeze({ lv: 'help', on: 'plant' }),
  weed: Object.freeze({ lv: 'help', on: 'plant' }),
  harvest: Object.freeze({ lv: 'help', on: 'plant', mine: true }),
  dig: Object.freeze({ lv: 'play', on: 'plant', mine: true }),
  move: Object.freeze({ lv: 'play', on: 'any', mine: true, to: true }),
  take: Object.freeze({ lv: 'play', on: 'decor', mine: true }),
  give: Object.freeze({ lv: 'play', on: 'decor', mine: true }),
  drop: Object.freeze({ lv: 'play' }),
  pick: Object.freeze({ lv: 'look' }),
  catch: Object.freeze({ lv: 'look' }),
  feed: Object.freeze({ lv: 'play', on: 'plant' }),
  turn: Object.freeze({ lv: 'play', on: 'decor', mine: true }),
});
const GL_ACT_IDS = Object.freeze(Object.keys(GL_ACTS));
const GL_CAPS = Object.freeze({ plant: 40, place: 20, water: 40, weed: 40, harvest: 60, dig: 40, move: 60, take: 40, give: 10, drop: 6, pick: 12, catch: 3, feed: 30, turn: 40, postsPerFriend: 120 });
/** What can wait for an owner who is out: which acts (each still needs its level in GL_ACTS), how many from one friend at once and in a day, and how many days it keeps. */
const GL_QUEUE = Object.freeze({ acts: Object.freeze(['plant', 'place', 'water']), perFriend: 20, perDay: 30, days: 14 });
/** Room messages a host's rooms carry in a day, what it sends and what arrives from visitors: 80,000 is 4,000 of Cloudflare's 100,000 free requests (incoming socket messages count 20 to 1). Over thin, walking sends less. guestDay: one visitor's share (the relay holds them to it too: ROOM.guestDay). */
const GL_BUDGET = Object.freeze({ day: 1e9, thin: 1e9, guestDay: 1e9, restMs: 15 * 60000 });   // no daily limits on people you have let in (the owner's choice); the relay stops rooms before Cloudflare's free day
const GL_WALK_GAP = Object.freeze({ normal: 250, thin: 1500 });     // the least time between two destinations, ms
const GL_EMOTES = Object.freeze(['wave', 'cheer', 'clap', 'bow', 'shrug', 'sit', 'dance', 'twirl', 'backflip', 'waltz', 'jazz']);
const GL_PHRASES = Object.freeze([
  Object.freeze({ id: 'hi', t: 'Hello!' }), Object.freeze({ id: 'lovely', t: 'Your garden is lovely' }), Object.freeze({ id: 'look', t: 'Look at this!' }),
  Object.freeze({ id: 'help', t: 'Can I help?' }), Object.freeze({ id: 'thanks', t: 'Thank you!' }), Object.freeze({ id: 'follow', t: 'Follow me!' }),
  Object.freeze({ id: 'yes', t: 'Yes!' }), Object.freeze({ id: 'wait', t: 'Wait for me!' }), Object.freeze({ id: 'ha', t: 'Ha ha!' }),
  Object.freeze({ id: 'wow', t: 'Wow!' }), Object.freeze({ id: 'gift', t: 'This is for you' }), Object.freeze({ id: 'bye', t: 'See you soon!' }),
]);
const GL_PHRASE_IDS = Object.freeze(GL_PHRASES.map(p => p.id));
const GL_TOGETHER = Object.freeze(['high5', 'follow', 'unfollow', 'sit', 'greet']);   // what two people do together: an `em` with c: 'do'
/** What people SEE each other do (gl:fx, a kind of its own: an older app has no such kind and drops it, so GL_V stays). Ids and cells on the wire, each side draws them from its own tables;
 *  an id this version does not know is ignored. `c` is the family, `e` the step or the id: pet (a clip of the pet library, or pat / eat), wow (a pet spectacle), nap (on / off), roam (a species of the host's pack),
 *  fish (a step of the line), bug (a step of the net), got (what was caught or found: `e` its kind, `i` its id), make (a recipe's id), cheer (a moment of yours: a garden level, an achievement's id, a photo taken), ct (a contest round: the host's, see GL_CT). `to` and `w` are slots as in gl:em. */
const GL_FX_KINDS = Object.freeze(['pet', 'wow', 'nap', 'roam', 'fish', 'bug', 'got', 'make', 'cr', 'egg', 'pick', 'cheer', 'ct']);
const GL_FX_STEPS = Object.freeze({ fish: Object.freeze(['cast', 'bite', 'reel', 'land', 'lost', 'in']), bug: Object.freeze(['sneak', 'swing', 'miss', 'gone', 'claim', 'lost']), cr: Object.freeze(['poke', 'react', 'look', 'greet']), egg: Object.freeze(['fire']), pick: Object.freeze(['spawn', 'claim', 'take', 'gone']), ct: Object.freeze(['start', 'board', 'end', 'stop']), nap: Object.freeze(['on', 'off']), got: Object.freeze(['fish', 'bug', 'keep', 'craft', 'crop']), cheer: Object.freeze(['level', 'ach', 'photo']) });
/** What only the garden's host may say (the host decides: who netted a bug, who took a gift, which creatures are about, what the pets notice), and what goes to the host alone (a claim, a poke). A guest's own fx of these kinds is refused at both ends. */
const GL_FX_HOST_ONLY = Object.freeze(new Set(['bug|gone', 'bug|lost', 'cr|react', 'cr|look', 'cr|greet', 'egg|fire', 'pick|spawn', 'pick|take', 'pick|gone', 'roam|*', 'ct|*']));
const GL_FX_TO_HOST = Object.freeze(new Set(['bug|claim', 'pick|claim', 'cr|poke']));
const glFxHostOnly = (b) => !!b && (GL_FX_HOST_ONLY.has(b.c + '|' + b.e) || GL_FX_HOST_ONLY.has(b.c + '|*'));
const glFxToHost = (b) => !!b && GL_FX_TO_HOST.has(b.c + '|' + b.e);
const GL_FX_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** CONTESTS (docs/dev/GARDEN_TOGETHER.md section 15). The host's page is the referee: it starts a timed round (`ct|start`), keeps the scores, sends the board (`ct|board`) and names the winner (`ct|end`);
 *  all of those are host-only. A guest says nothing new: its casts and nets are the `fish`, `bug` and `got` events it always sends, and the host counts only a catch it can match to the steps of a line.
 *  Points come from size and quality (a fish) or rarity (a bug), never from money. Everything here is data: change it here.
 *    lens      the lengths a round may have (seconds); `len` the usual one.  minLen / maxLen: what the wire accepts
 *    perDay    rounds a garden's host may start in a day (on the host's computer, in the day's fishing record)
 *    minPts    points that count as having played; a guest also needs a catch of its own in the round
 *    reward    coins and XP for winning (needs a second player with points) and for playing; `day` the most coins one person is given by contests in a day, counted on their own computer
 *    gap       the least seconds between two catches of one guest (a line cannot be cast, bitten, reeled and landed faster)
 *    grace     seconds after the end a catch already landed still counts, and the board is held before the winner is named
 *    waveSec   a bug round: another bug shows every this many seconds (the same ones on every screen, from the round's id), and stays `bugLife` seconds
 *    bugPts    points for a bug, by rarity */
const GL_CT = Object.freeze({
  kinds: Object.freeze(['fish', 'bug']), lens: Object.freeze([120, 180, 300]), len: 180, minLen: 60, maxLen: 600, perDay: 4, minPts: 3,
  reward: Object.freeze({ win: Object.freeze({ c: 20, x: 10 }), play: Object.freeze({ c: 5, x: 2 }), day: 40 }),
  gap: 2.5, grace: 3, boardGap: 1800, beat: 10, waveSec: 5, bugLife: 30, maxCatch: 50,
  bugPts: Object.freeze({ common: 2, uncommon: 4, rare: 8, epic: 14, legendary: 25 }),
});
const GL_CT_Q = Object.freeze([1, 1.25, 1.6, 2.2]);   // the quality multipliers of the fish catalogue (GARDEN_QUALITY), so this file stays pure
/** A fish's points: one for every 5 cm, times its quality (a 40 cm plain fish is 8, a fine one 13, a perfect one 18). At least 1, at most GL_CT.maxCatch. */
function glCtFishPoints(cm, q) {
  const c = Math.max(0, Math.min(400, Math.floor(Number(cm) || 0))); if (c < 1) return 0;
  return Math.max(1, Math.min(GL_CT.maxCatch, Math.round(c / 5 * GL_CT_Q[Math.max(0, Math.min(3, Math.floor(Number(q) || 0)))])));
}
function glCtBugPoints(rarity) { return Object.prototype.hasOwnProperty.call(GL_CT.bugPts, rarity) ? GL_CT.bugPts[rarity] : 0; }
/** The board: up to GL_PEOPLE rows of [slot, points, catches]. */
function _glCtBoardOk(l) {
  if (!Array.isArray(l) || l.length > GL_PEOPLE) return false;
  const seen = new Set();
  for (const r of l) { if (!Array.isArray(r) || !Number.isInteger(r[0]) || r[0] < 0 || r[0] > GL_PEOPLE || seen.has(r[0]) || !Number.isInteger(r[1]) || r[1] < 0 || r[1] > 9999 || !Number.isInteger(r[2]) || r[2] < 0 || r[2] > 99) return false; seen.add(r[0]); }
  return true;
}
/** '' when an fx body fits the tables, else why. (The page checks the ids against its own catalogues, and ignores what it does not know.) */
function glFxOk(b) {
  if (!b || typeof b !== 'object' || !GL_FX_KINDS.includes(b.c) || !GL_FX_ID_RE.test(String(b.e || ''))) return 'kind';
  const steps = GL_FX_STEPS[b.c];
  if (steps && !steps.includes(b.e)) return 'step';
  if (b.c === 'ct') {
    if (!GL_ID_RE.test(String(b.i || ''))) return 'id';
    const secs = Number.isInteger(b.n) && b.n >= 0 && b.n <= GL_CT.maxLen;
    if (b.e === 'start' && !(GL_CT.kinds.includes(b.kd) && secs && b.n >= 1 && Number.isInteger(b.tt) && b.tt >= GL_CT.minLen && b.tt <= GL_CT.maxLen && b.n <= b.tt)) return 'ct';
    if (b.e === 'board' && !(secs && _glCtBoardOk(b.l))) return 'ct';
    if (b.e === 'end' && !(_glCtBoardOk(b.l) && (b.to == null || (Number.isInteger(b.to) && b.l.some(r => r[0] === b.to))))) return 'ct';
    return '';
  }
  if (b.c === 'got' && !GL_FX_ID_RE.test(String(b.i || ''))) return 'id';
  if (b.c === 'bug' && ['gone', 'claim', 'lost'].includes(b.e) && !GL_FX_ID_RE.test(String(b.i || ''))) return 'id';
  if ((b.c === 'cr' || b.c === 'egg') && !GL_FX_ID_RE.test(String(b.i || ''))) return 'id';
  if (b.c === 'pick' && (!Number.isInteger(b.n) || b.n < 0 || b.n > 999)) return 'id';
  if (b.c === 'pick' && b.e === 'spawn' && (!GL_FX_ID_RE.test(String(b.i || '')) || !['keep', 'fish'].includes(b.kd) || !Number.isInteger(b.x) || !Number.isInteger(b.y))) return 'pick';
  if (b.c === 'cheer' && b.e === 'level' && !(Number.isInteger(b.n) && b.n >= 1 && b.n <= 99)) return 'level';   // 2.29.0: a moment of yours the others there cheer
  if (b.c === 'cheer' && b.e === 'ach' && !GL_FX_ID_RE.test(String(b.i || ''))) return 'id';
  if (b.c === 'fish' && b.e === 'cast' && !(Number.isInteger(b.x) && Number.isInteger(b.y))) return 'cell';
  return '';
}
const GL_COLS = 64;               // cells are 0..63 on the wire, as in a garden snapshot
const GL_ID_RE = /^[0-9a-z]{6,24}$/;   // an intent's id, as _gllNewId makes it: it ends up in synced records, so it can never look like a credential

function glAtLeast(lv, min) { return GL_LEVELS.indexOf(lv) >= GL_LEVELS.indexOf(min) && GL_LEVELS.indexOf(min) >= 0; }
function glMayDo(lv, t) {
  const a = Object.prototype.hasOwnProperty.call(GL_ACTS, t) ? GL_ACTS[t] : null;
  if (!a) return 'kind';
  return glAtLeast(lv, a.lv) ? '' : 'level';
}
const _glCell = (v) => Number.isInteger(v) && v >= 0 && v < GARDEN_WORLD.cols && v < GL_COLS;
/** '' when an intent's body fits the tables (not yet the garden as it is: that is the host's page), else why. */
function glIntentOk(b) {
  if (!b || typeof b !== 'object' || !Object.prototype.hasOwnProperty.call(GL_ACTS, b.t)) return 'kind';
  const a = GL_ACTS[b.t];
  if (a.place === 'plant') { const d = gardenPlant(b.p); if (!d || d.special === 'heart') return 'plant'; }
  if (a.place === 'decor' && !gardenDecor(b.p)) return 'decor';
  if (a.on === 'plant' && !gardenPlant(b.p)) return 'plant';
  if (a.on === 'decor' && !gardenDecor(b.p)) return 'decor';
  if (a.on === 'any' && !gardenPlant(b.p) && !gardenDecor(b.p)) return 'item';
  if (a.place || a.on) { if (!_glCell(b.x) || !Number.isInteger(b.y) || b.y < 0 || b.y >= GARDEN_WORLD.rows) return 'cell'; }
  if (a.to) { if (!_glCell(b.tx) || !Number.isInteger(b.ty) || b.ty < 0 || b.ty >= GARDEN_WORLD.rows) return 'cell'; }
  if (b.t === 'water' && !gsocWaterOk(b.p)) return 'plant';
  if (b.t === 'drop') { if (!gsocGiftOk(b.k, b.item)) return 'gift'; if (!Number.isInteger(b.to) || b.to < 0 || b.to >= GL_PEOPLE) return 'who'; }
  if (!GL_ID_RE.test(String(b.i || ''))) return 'id';
  return '';
}
/** What may arrive by post: known things, a few at a time. */
function glPostItemOk(item) {
  const m = /^(crop|seed|decor|fish|bug):([a-z0-9-]{1,64})$/.exec(String(item || ''));
  if (!m) return false;
  if (m[1] === 'crop') { const p = gardenPlant(m[2]); return !!p && !!p.yield; }
  return gsocGiftOk(m[1], m[2]);
}
function glPostOk(p) {
  if (!p || typeof p !== 'object' || !['crop', 'back', 'did'].includes(p.why)) return 'why';
  if (p.why === 'back' || p.why === 'did') return '';
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 4) return 'items';
  for (const row of p.items) { if (!Array.isArray(row) || !glPostItemOk(row[0]) || !Number.isInteger(row[1]) || row[1] < 1 || row[1] > 99) return 'items'; }
  return '';
}
