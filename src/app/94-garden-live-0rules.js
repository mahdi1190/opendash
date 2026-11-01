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
     GL_PP / glPpOk       pets in place (gl:pp); GL_PLAY / glPlayLevel playdates; GL_SNAP the group photo
     GL_QUEUE             what can wait for a host who is out
     GL_CT                contests: a timed round of fishing or bug-netting that the host referees; glCtFishPoints / glCtBugPoints score a catch
     GL_TRADE             trading: the level, how much, how often; glTradeOk(b, fromHost) -> '' | why
     GL_GOALS / GL_GOAL   shared goals (a joint quest in a live garden): the table, the pacing and the reward; glGoalOk(b) -> '' | why checks gl:goal, glGoalCap(of), glGoalSize(def, people)
     glAtLeast(lv, min)   glMayDo(lv, t) -> '' | why     glIntentOk(b) -> '' | why     glPostOk(p) -> '' | why
   ============================================================ */
const GL_V = 3;   // 3: the world moved (GARDEN_WORLD.v 2): a cell means something else now, so an older peer keeps the saved copy. 2:                 // 2: what a visit can ask for grew (feed, turn), and what waits for the host. An older peer gets the saved copy
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
 *  fish (a step of the line), bug (a step of the net), got (what was caught or found: `e` its kind, `i` its id), make (a recipe's id), cheer (a moment of yours: a garden level, an achievement's id, a photo taken), ct (a contest round: the host's, see GL_CT), snap (ask for a group photo: `i` its id, `x` and `y` the middle of the frame, see GL_SNAP). `to` and `w` are slots as in gl:em. */
const GL_FX_KINDS = Object.freeze(['pet', 'wow', 'nap', 'roam', 'fish', 'bug', 'got', 'make', 'cr', 'egg', 'pick', 'cheer', 'ct', 'snap', 'hall', 'fs', 'sync']);
const GL_FX_STEPS = Object.freeze({ sync: Object.freeze(['ask', 'at', 'away', 'back']), fs: Object.freeze(['hook', 'land', 'free']), fish: Object.freeze(['cast', 'bite', 'reel', 'land', 'lost', 'in', 'big', 'help']), bug: Object.freeze(['sneak', 'swing', 'miss', 'gone', 'claim', 'lost']), cr: Object.freeze(['poke', 'react', 'look', 'greet']), egg: Object.freeze(['fire']), pick: Object.freeze(['spawn', 'claim', 'take', 'gone']), ct: Object.freeze(['start', 'board', 'end', 'stop']), nap: Object.freeze(['on', 'off']), got: Object.freeze(['fish', 'bug', 'keep', 'craft', 'crop', 'gear']), cheer: Object.freeze(['level', 'ach', 'photo']), snap: Object.freeze(['ask']), hall: Object.freeze(['in', 'at', 'out']) });
/** What only the garden's host may say (the host decides: who netted a bug, who took a gift, which creatures are about, what the pets notice), and what goes to the host alone (a claim, a poke). A guest's own fx of these kinds is refused at both ends. */
const GL_FX_HOST_ONLY = Object.freeze(new Set(['bug|gone', 'bug|lost', 'cr|react', 'cr|look', 'cr|greet', 'egg|fire', 'pick|spawn', 'pick|take', 'pick|gone', 'roam|*', 'ct|*']));
const GL_FX_TO_HOST = Object.freeze(new Set(['bug|claim', 'pick|claim', 'cr|poke', 'fs|hook', 'fs|land', 'fs|free', 'sync|ask', 'sync|away', 'sync|back']));
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
  if (b.c === 'sync' && b.e === 'at' && !(Number.isInteger(b.x) && Number.isInteger(b.y))) return 'cell';   // (staying in step: 94-garden-live-8sync.js)
  if (b.c === 'fs' && !/^\d{1,3}$/.test(String(b.i || ''))) return 'id';   // (a fish in the water: 94-garden-fish-6school.js)
  if ((b.c === 'cr' || b.c === 'egg') && !GL_FX_ID_RE.test(String(b.i || ''))) return 'id';
  if (b.c === 'pick' && (!Number.isInteger(b.n) || b.n < 0 || b.n > 999)) return 'id';
  if (b.c === 'pick' && b.e === 'spawn' && (!GL_FX_ID_RE.test(String(b.i || '')) || !['keep', 'fish'].includes(b.kd) || !Number.isInteger(b.x) || !Number.isInteger(b.y))) return 'pick';
  if (b.c === 'cheer' && b.e === 'level' && !(Number.isInteger(b.n) && b.n >= 1 && b.n <= 99)) return 'level';   // 2.29.0: a moment of yours the others there cheer
  if (b.c === 'cheer' && b.e === 'ach' && !GL_FX_ID_RE.test(String(b.i || ''))) return 'id';
  if (b.c === 'fish' && b.e === 'cast' && !(Number.isInteger(b.x) && Number.isInteger(b.y))) return 'cell';
  if (b.c === 'snap' && !(GL_ID_RE.test(String(b.i || '')) && Number.isInteger(b.x) && Number.isInteger(b.y) && b.x >= 0 && b.y >= 0)) return 'snap';
  if (b.c === 'hall' && b.e !== 'out' && !(Number.isInteger(b.x) && Number.isInteger(b.y) && b.x >= 0 && b.x <= 59 && b.y >= 0 && b.y <= 37)) return 'hall';
  return '';
}
/** PETS IN PLACE (docs/dev/GARDEN_TOGETHER.md section 18). A person's own computer says where its pets really are, so every screen shows them in the same place (`gl:pp`, a kind of its own: an older app drops
 *  it and keeps the old rule, a pet that follows its person). Tenths of a cell; a walk is its end point, never a stream. `gap` the least ms between two while a pet walks (`thin`: when walking is sent less),
 *  `settle` ms after it stops before its resting place is sent, `idle` ms between the "still here" messages while it sits, `stale` ms after which a screen stops trusting the last place and follows the person
 *  again, `snap` cells of difference after which a screen puts the pet in its place instead of walking it there. */
const GL_PP = Object.freeze({ gap: 3000, thin: 6000, settle: 450, idle: 30000, stale: 40000, snap: 3 });
/** The pets in a `gl:pp` (a list of up to 4: `u` 0 is the sender's own companion, 1 to 3 the host's pack with `e` its species): '' when it fits, else why. The pack is the host's to say. */
function glPpOk(b, fromHost) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.l) || b.l.length < 1 || b.l.length > 4) return 'pp';
  const seen = new Set();
  for (const r of b.l) {
    if (!r || typeof r !== 'object' || !Number.isInteger(r.u) || r.u < 0 || r.u > 3 || seen.has(r.u)) return 'pp';
    seen.add(r.u);
    if (r.u > 0 && !(fromHost && GL_FX_ID_RE.test(String(r.e || '')))) return 'pp';
    if (r.u === 0 && r.e != null) return 'pp';
    if (!Number.isInteger(r.x) || r.x < 0 || r.x > 640 || !Number.isInteger(r.y) || r.y < 0 || r.y > 320) return 'pp';
    if ((r.gx == null) !== (r.gy == null)) return 'pp';
    if (r.gx != null && !(Number.isInteger(r.gx) && r.gx >= 0 && r.gx <= 640 && Number.isInteger(r.gy) && r.gy >= 0 && r.gy <= 320)) return 'pp';
  }
  return '';
}
/** PLAYDATES (section 18). Two people's pets that stay close for a few seconds greet each other, and a pet remembers the friend it played with: playdates on different days make them pals. Rules, not messages:
 *  every screen sees where the pets are, so each computer works it out for itself. `near` cells apart (the up-and-down counted 1.4 times as far), `trot` the distance from which a pet that knows the other trots over,
 *  `hold` ms they must stay near, `cool` ms before the same two greet again, `keep` friends remembered, `pals` and `best` the days of playdates for each level, `bond` the friendship points the pet gets
 *  (once a friend a day, inside the pet's own daily limit). */
const GL_PLAY = Object.freeze({ near: 1.8, trot: 4.5, hold: 2200, cool: 240000, keep: 60, pals: 3, best: 8, bond: 2 });
/** How well two pets know each other after this many days of playdates: 0 not at all, 1 met, 2 pals, 3 best pals. */
function glPlayLevel(days) { const d = Math.max(0, Math.floor(Number(days) || 0)); return d >= GL_PLAY.best ? 3 : d >= GL_PLAY.pals ? 2 : d >= 1 ? 1 : 0; }
/** THE GROUP PHOTO (section 19). Anyone there can ask for one (`gl:fx snap ask`); every screen that does not skip it counts down and takes the same part of the garden itself, and keeps it in its own Memories.
 *  The picture is never sent. `w` and `h` the frame in the garden's own units (a cell is 48 wide and 30 tall), `count` seconds of "smile", `gap` the least seconds between two asks from one person,
 *  `keep` photos kept in Memories (the oldest go; lib/memory-photos.mjs holds the same number). */
const GL_SNAP = Object.freeze({ w: 720, h: 450, count: 3, gap: 30, keep: 200 });
/** SHARED GOALS (docs/dev/GARDEN_TOGETHER.md section 14). The host's page picks one from this table while somebody is in the garden, counts what it applied or confirmed itself,
 *  and tells everyone the WHOLE state each time (gl:goal, host to guests, a kind of its own: an older app drops it, so GL_V stays). A row: `t` the goal (`{n}` its size), `d` how it reads
 *  when it is done, `n` the sizes it may have [least, most], `per` how many more for each person beyond two, `needs` the level somebody must have for it to be possible, and `rew` what each
 *  person who took part gets, on their own computer, once (the ids are the garden's own items). Add a goal: add a row here and say where the host counts it (94-garden-live-7goal.js). */
const GL_GOALS = Object.freeze([
  Object.freeze({ id: 'fish', t: 'Catch {n} fish together', d: 'Caught {n} fish together', icon: 'fish', n: Object.freeze([4, 10]), per: 2, rew: Object.freeze({ c: 6, x: 4, i: Object.freeze({ 'bait:dough': 3 }) }) }),
  Object.freeze({ id: 'water', t: 'Water {n} plants together', d: 'Watered {n} plants together', icon: 'droplets', n: Object.freeze([4, 20]), per: 3, needs: 'help', rew: Object.freeze({ c: 6, x: 4, i: Object.freeze({ fertiliser: 1 }) }) }),
  Object.freeze({ id: 'bug', t: 'Net {n} bugs together', d: 'Netted {n} bugs together', icon: 'bug', n: Object.freeze([3, 8]), per: 1, rew: Object.freeze({ c: 6, x: 4, i: Object.freeze({ 'bait:maggot': 3 }) }) }),
]);
/** share: nobody's part counts for more than this much of a goal (so it takes at least two of you, and one dishonest guest cannot finish it alone); dayMax: goals one person is rewarded for in a day, in every garden;
 *  startsMax: goals one host starts in a day; firstMs / gapMs: the wait after somebody arrives and between goals; staleMs: a goal nobody has moved on is let go; idleMs: how long an empty garden keeps one;
 *  claimMs: the least time between two fish the same person is counted for (a fish is the one thing the host can only hear about). */
const GL_GOAL = Object.freeze({ share: 0.6, dayMax: 3, startsMax: 6, firstMs: 20000, gapMs: 150000, staleMs: 30 * 60000, idleMs: 15 * 60000, claimMs: 4000, doneMs: 9000 });
const glGoalDef = (id) => GL_GOALS.find(g => g.id === id) || null;
/** The most one person's part can count for in a goal of this size: never all of it. */
const glGoalCap = (of) => Math.max(1, Math.min(of - 1, Math.ceil(of * GL_GOAL.share)));
/** How big a goal of this kind is for this many people here (the host, and then each guest), inside the row's range. */
const glGoalSize = (def, people) => Math.max(def.n[0], Math.min(def.n[1], def.n[0] + def.per * Math.max(0, (people | 0) - 2)));
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
/* ---------- trading (docs/dev/GARDEN_TOGETHER.md section 14) ----------
   Two people in one live garden swap what is in their bags, and it happens only when BOTH have confirmed the same terms. The host's page is the referee (it decides, once, and is the
   only one that does); each side holds what it offers when it confirms, and takes the other's offer when the host says go. gl:tr is a kind of its own (an older app drops it, GL_V stays 2).
   lv: the level both need. rows, qty: what one side may offer (seed, decor, fish, bug, as gsocGiftOk allows; never coins). perDay: trades one person may finish in a day.
   askMs: how long a request waits for the other app to say it can trade (an older one never does). idleMs: an open trade nobody touches is called off. */
const GL_TRADE = Object.freeze({ lv: 'play', rows: 4, qty: 20, perDay: 10, askMs: 8000, idleMs: 5 * 60000 });
/** From a guest to the host: ask (to a slot), hi (I can trade), offer (my whole offer), ok (I confirm version v), no (I take my confirmation back), end, chk (what became of this trade?).
 *  From the host: st (the state, for you), go (it happened), x (it did not, why). Counters: n on a guest's offer, ok and no, answered by an in st (the host has seen up to n). */
const GL_TRADE_GUEST = Object.freeze(['ask', 'hi', 'offer', 'ok', 'no', 'end', 'chk']);
const GL_TRADE_HOST = Object.freeze(['st', 'go', 'x']);
const GL_TRADE_STEPS = Object.freeze([...GL_TRADE_GUEST, ...GL_TRADE_HOST]);
const GL_TRADE_WHY = Object.freeze(['busy', 'gone', 'level', 'cap', 'left', 'cancel', 'idle', 'old', 'item', 'host', 'lost']);
const GL_TRADE_ITEM_RE = /^(seed|decor|fish|bug):([a-z0-9-]{1,64})$/;
function glTradeItemOk(item) { const m = GL_TRADE_ITEM_RE.exec(String(item || '')); return !!m && gsocGiftOk(m[1], m[2]); }
/** '' when rows ([[item, n], ...]) are a fitting offer: few, distinct, known and given-able, a few of each. */
function glTradeRowsOk(rows) {
  if (!Array.isArray(rows) || rows.length > GL_TRADE.rows) return 'rows';
  const seen = new Set();
  for (const r of rows) {
    if (!Array.isArray(r) || typeof r[0] !== 'string' || seen.has(r[0]) || !Number.isInteger(r[1]) || r[1] < 1 || r[1] > GL_TRADE.qty) return 'rows';
    seen.add(r[0]);
    if (!glTradeItemOk(r[0])) return 'item';
  }
  return '';
}
/** '' when a gl:tr body fits the tables, else why. host: it comes from the garden's host (st, go, x); otherwise from a guest. */
function glTradeOk(b, host) {
  if (!b || typeof b !== 'object' || !GL_ID_RE.test(String(b.t || ''))) return 'id';
  if (!(host ? GL_TRADE_HOST : GL_TRADE_GUEST).includes(b.e)) return 'step';
  const slot = (v) => Number.isInteger(v) && v >= 0 && v < GL_PEOPLE, count = (v) => Number.isInteger(v) && v >= 0 && v <= 1e6;
  switch (b.e) {
    case 'ask': return slot(b.to) ? '' : 'who';
    case 'offer': return count(b.n) ? glTradeRowsOk(b.o) : 'n';
    case 'ok': return count(b.v) && count(b.n) ? '' : 'n';
    case 'no': return count(b.n) ? '' : 'n';
    case 'st': return slot(b.to) && count(b.v) && count(b.an) && typeof b.c === 'boolean' && typeof b.d === 'boolean' && typeof b.r === 'boolean' ? glTradeRowsOk(b.o) || glTradeRowsOk(b.p) : 'st';
    case 'go': return count(b.v) ? '' : 'n';
    case 'x': return GL_TRADE_WHY.includes(b.why) ? '' : 'why';
    default: return '';
  }
}

/** What may arrive by post: known things, a few at a time. */
function glPostItemOk(item) {
  const m = /^(crop|seed|decor|fish|bug):([a-z0-9-]{1,64})$/.exec(String(item || ''));
  if (!m) return false;
  if (m[1] === 'crop') { const p = gardenPlant(m[2]); return !!p && !!p.yield; }
  return gsocGiftOk(m[1], m[2]);
}
function glPostOk(p) {
  if (!p || typeof p !== 'object' || !['crop', 'back', 'did', 'trade'].includes(p.why)) return 'why';
  if (p.why === 'back' || p.why === 'did') return '';
  if (p.why === 'trade') return GL_ID_RE.test(String(p.i || '')) && (p.d === 'go' || p.d === 'x') ? '' : 'trade';   // (the host's decision about a trade you held things for: go, or x)
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 4) return 'items';
  for (const row of p.items) { if (!Array.isArray(row) || !glPostItemOk(row[0]) || !Number.isInteger(row[1]) || row[1] < 1 || row[1] > 99) return 'items'; }
  return '';
}
/** '' when a gl:goal body fits the tables, else why: the goal exists, its size is one the row allows, the parts of the people here are no more than the progress (somebody who has left took their part with them: it still counts, and is theirs no longer) and none is more than the cap. */
function glGoalOk(b) {
  if (!b || typeof b !== 'object') return 'kind';
  const def = glGoalDef(b.c); if (!def) return 'goal';
  if (!GL_ID_RE.test(String(b.g || ''))) return 'id';
  if (!Number.isInteger(b.of) || b.of < def.n[0] || b.of > def.n[1]) return 'size';
  if (!Number.isInteger(b.n) || b.n < 0 || b.n > b.of || ![0, 1, 2].includes(b.st) || (b.st === 1 && b.n !== b.of)) return 'count';
  if (!Array.isArray(b.p) || b.p.length > GL_PEOPLE) return 'who';
  const cap = glGoalCap(b.of), seen = new Set();
  let sum = 0;
  for (const r of b.p) {
    if (!Array.isArray(r) || r.length !== 2 || !Number.isInteger(r[0]) || r[0] < 0 || r[0] >= GL_PEOPLE || seen.has(r[0]) || !Number.isInteger(r[1]) || r[1] < 1 || r[1] > cap) return 'who';
    seen.add(r[0]); sum += r[1];
  }
  return sum <= b.n ? '' : 'count';
}
