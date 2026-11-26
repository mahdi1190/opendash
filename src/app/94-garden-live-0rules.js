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
     GL_TRADE             trading: the level, how much, how often, the seal; glTradeOk(b, fromHost) -> '' | why
     GL_GOALS / GL_GOAL   shared goals (a joint quest in a live garden): the table, the pacing and the reward; glGoalOk(b) -> '' | why checks gl:goal, glGoalCap(of), glGoalSize(def, people)
     glAtLeast(lv, min)   glMayDo(lv, t) -> '' | why     glIntentOk(b) -> '' | why     glPostOk(p) -> '' | why
   ============================================================ */
const GL_V=6; // Expanded island sessions use the exact authored world and layout.
function glWorldFields(source){
 if(source===undefined){
  if(typeof _gdv!=='undefined'&&_gdv.on&&_gdv.clean)source=_gdv.clean;
  // (2.74.2) a garden never opened yet (a fresh pair who visit straight away) has no saved world: it will start on this one, so it says this one.
  // It said none, the host's computer refused the visit as another world, and the first visit after pairing stayed 'look' until something saved it.
  else if(typeof state!=='undefined'&&state?.garden&&(state.garden.seen?.world!=null||state.garden.wv!=null))source=state.garden;
  else source={wv:GARDEN_WORLD.v,lh:GARDEN_WORLD.lh};
 }
 source=source?.visit?.snap||source;
 const wv=Number(source?.seen?.world??source?.wv),lh=source?.seen?.worldLayout??source?.lh;
 return{wv,lh};
}
function glWorldSupported(source){const w=glWorldFields(source);return w.wv===GARDEN_WORLD.v&&w.lh===GARDEN_WORLD.lh}
function glProtocolForWorld(source){return glWorldSupported(source)?GL_V:0}
function glSameWorld(body,expected){const a=glWorldFields(body),b=glWorldFields(expected);return glWorldSupported(a)&&glWorldSupported(b)&&a.wv===b.wv&&a.lh===b.lh}
const GL_PEOPLE = 8;              // everyone in a garden at once, the host included
const GL_LEVELS = Object.freeze(['none', 'look', 'help', 'play']);
const GL_LEVEL_NAMES = Object.freeze({ none: 'Sent home', look: 'Look', help: 'Help', play: 'Build together' });   // (full co-op, 20 Nov 2026: a friend you made yourself plays here as you do, lib/friends/live.mjs permOf; Look and Help are only what an older app may still say)
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
  // full co-op (2.75): a friend buys a piece of this garden's land, or builds one of its things, with their own coins; it is the garden's for good (p: the section's or the thing's id; x, y: where they stand, for setting it out)
  land: Object.freeze({ lv: 'play', land: 'land' }),
  build: Object.freeze({ lv: 'play', land: 'feat' }),
  gate: Object.freeze({ lv: 'play', land: 'gate' }),   // open one of this garden's gates (p: the gate's id; r 1: I bring its find myself)
  solve: Object.freeze({ lv: 'play', land: 'solve' }),   // a trail puzzle solved here (p: the place it leads to; x, y: where they stand, for setting it out)
  tunnel: Object.freeze({ lv: 'play', land: 'tunnel' }),   // (the depth lane) open one of this garden's ways underground (p: the tunnel's id; r 0 its secret way, r 2 its hidden alcove): 94-garden-zz-8depth-7secret.js
  // (build phase 1, 94-garden-build-0rules.js) pick up a thing that can be carried (p: its id), and set it down (fx, fy: tenths of a cell): saved, for everyone
  grab: Object.freeze({ lv: 'play', carry: 'grab' }),
  set: Object.freeze({ lv: 'play', carry: 'drop' }),
  // (build2) give one of your catches or finds to this garden's museum (k: fish, bug, fos or cur; item: its id; u: '<cm>-<quality>'): the host's page writes it with your name on it, and only then is it out of your pockets
  donate: Object.freeze({ lv: 'play', give: 'museum' }),
  // your friend's house (94-garden-house-0rules.js): item says what (put, move, lift, use, wall, floor), x the room, p the piece or finish, u the piece's uid, fx/fy where in the room, y how high (a top, in 2 px)
  house: Object.freeze({ lv: 'play', house: true }),
});
const GL_ACT_IDS = Object.freeze(Object.keys(GL_ACTS));
// Friends are trusted (full co-op, the owner, 20 Nov 2026): these are only there so a runaway loop cannot fill the diary, never to hold a friend back
const GL_CAPS = Object.freeze({ plant: 2000, place: 1000, water: 2000, weed: 2000, harvest: 2000, dig: 2000, move: 2000, take: 1000, give: 500, drop: 200, pick: 200, catch: 200, feed: 1000, turn: 2000, land: 200, build: 200, gate: 50, solve: 50, tunnel: 50, grab: 5000, set: 5000, donate: 500, house: 5000, postsPerFriend: 120 });
/** What can wait for an owner who is out: which acts (each still needs its level in GL_ACTS), how many from one friend at once and in a day, and how many days it keeps. */
const GL_QUEUE = Object.freeze({ acts: Object.freeze(['plant', 'place', 'water']), perFriend: 20, perDay: 30, days: 14 });
/** Room messages a host's rooms carry in a day, what it sends and what arrives from visitors: 80,000 is 4,000 of Cloudflare's 100,000 free requests (incoming socket messages count 20 to 1). Over thin, walking sends less. guestDay: one visitor's share (the relay holds them to it too: ROOM.guestDay). */
const GL_BUDGET = Object.freeze({ day: 1e9, thin: 1e9, guestDay: 1e9, restMs: 15 * 60000 });   // no daily limits on people you have let in (the owner's choice); the relay stops rooms before Cloudflare's free day
const GL_WALK_GAP = Object.freeze({ normal: 250, thin: 1500 });     // the least time between two destinations, ms
const GL_EMOTES = Object.freeze(['wave', 'cheer', 'clap', 'bow', 'shrug', 'sit', 'dance', 'twirl', 'backflip', 'waltz', 'jazz',
  // round 3: things done with the world (GARDEN_ACTS, 94-garden-zz-7act-0table.js), one message when each starts; an older app ignores them
  'act-sit', 'act-dangle', 'act-lie', 'act-nap', 'act-ladder', 'act-shake', 'act-bell', 'act-pump', 'act-wish', 'act-warm', 'act-lean', 'act-read', 'act-look', 'act-feed', 'act-skim', 'act-shower', 'act-hide', 'act-climbtree', 'act-row', 'act-photo', 'act-laugh', 'act-angel',
  // round 3, round 2 of the moves: up the trunk then on the branch, a swim, a kick, a stick for the pet, belly rubs, the busker's fiddle, picking up, fishing side by side
  'act-perch', 'act-swim', 'act-kick', 'act-throwstick', 'act-rub', 'act-play', 'act-carry', 'act-fishsit', 'act-fishsitfront',
  // round 3, round 3 of the moves: up the treehouse's ladder, up to the hay loft
  'act-ladderhi', 'act-ladderlo',
  // round 3, height and swimming: up and down a floor's ladder (they then see you up there), out of the water on to the bank
  'act-climbup', 'act-climbdown', 'act-swimout', 'act-loftsit',
  // where someone already is, told to whoever arrives later (up on a floor, out in the water): put there at once, no climb
  'act-onlevel', 'act-inwater',
  // and back on the ground (down from a floor or out of the water any way at all, a reset, a floor no longer drawn): their copy comes down
  'act-onground',
  // music (20 Nov): the band's other places at a pitch
  'act-whistle', 'act-squeeze', 'act-drum',
  // (the depth lane) into a tunnel at its mouth, out at a mouth, and where someone is underground (told to whoever arrives): 94-garden-zz-8depth-3tunnel.js
  'act-tunnelin', 'act-tunnelout', 'act-intunnel',
  // the tide (94-garden-tide-*.js): scooping a find from the sand, lifting a stone on the rocks, kneeling to look into a rock pool, hauling a storm's chest
  'act-scoop', 'act-lift', 'act-peer', 'act-heave',
  // the shore's games (94-garden-tide-6castle.js to -c-pits.js): patting a sandcastle into shape, cheering a crab on, kneeling at a game of pebble pits, throwing a bottle out to sea
  'act-build', 'act-cheer', 'act-pits', 'act-throw']);
const GL_PHRASES = Object.freeze([
  Object.freeze({ id: 'hi', t: 'Hello!' }), Object.freeze({ id: 'lovely', t: 'Your garden is lovely' }), Object.freeze({ id: 'look', t: 'Look at this!' }),
  Object.freeze({ id: 'help', t: 'Can I help?' }), Object.freeze({ id: 'thanks', t: 'Thank you!' }), Object.freeze({ id: 'follow', t: 'Follow me!' }),
  Object.freeze({ id: 'yes', t: 'Yes!' }), Object.freeze({ id: 'wait', t: 'Wait for me!' }), Object.freeze({ id: 'ha', t: 'Ha ha!' }),
  Object.freeze({ id: 'wow', t: 'Wow!' }), Object.freeze({ id: 'gift', t: 'This is for you' }), Object.freeze({ id: 'bye', t: 'See you soon!' }),
]);
const GL_PHRASE_IDS = Object.freeze(GL_PHRASES.map(p => p.id));
const GL_TOGETHER = Object.freeze(['high5', 'follow', 'unfollow', 'sit', 'greet']);   // what two people do together: an `em` with c: 'do'
/** What people SEE each other do (gl:fx, a kind of its own: an older app has no such kind and drops it, so GL_V stays). Ids and cells on the wire, each side draws them from its own tables;
 *  an id this version does not know is ignored. `c` is the family, `e` the step or the id: pet (a clip of the pet library, or pat / eat), petplay (an environment/guide endpoint or critical exact-request guide stop; optional u 1..3 plus i species addresses the host pack), wow (a pet spectacle), nap (on / off), roam (a species of the host's pack),
 *  fish (a step of the line), bug (a step of the net), got (what was caught or found: `e` its kind, `i` its id), make (a recipe's id), cheer (a moment of yours: a garden level, an achievement's id, a photo taken), ct (a contest round: the host's, see GL_CT), snap (ask for a group photo: `i` its id, `x` and `y` the middle of the frame, see GL_SNAP). `to` and `w` are slots as in gl:em. */
const GL_FX_KINDS = Object.freeze(['pet', 'petplay', 'wow', 'nap', 'roam', 'fish', 'bug', 'got', 'make', 'cr', 'egg', 'pick', 'cheer', 'ct', 'snap', 'hall', 'fs', 'sync', 'use', 'pose', 'kite', 'soap', 'leaf', 'marble', 'tune', 'folk', 'gm', 'mo', 'tide']);
const GL_FX_STEPS = Object.freeze({ mo: Object.freeze(['play', 'skip']), gm: Object.freeze(['ask', 'start', 'state', 'end', 'stop', 'act', 'join', 'leave']), folk: Object.freeze(['talk', 'bye']), sync: Object.freeze(['ask', 'at', 'away', 'back']), fs: Object.freeze(['hook', 'land', 'free']), fish: Object.freeze(['cast', 'bite', 'reel', 'land', 'lost', 'in', 'big', 'help']), bug: Object.freeze(['sneak', 'swing', 'miss', 'gone', 'claim', 'lost']), cr: Object.freeze(['poke', 'react', 'look', 'greet']), egg: Object.freeze(['fire']), pick: Object.freeze(['spawn', 'claim', 'take', 'gone']), ct: Object.freeze(['start', 'board', 'end', 'stop']), nap: Object.freeze(['on', 'off']), got: Object.freeze(['fish', 'bug', 'keep', 'craft', 'crop', 'gear', 'shore']), cheer: Object.freeze(['level', 'ach', 'photo']), snap: Object.freeze(['ask']), hall: Object.freeze(['in', 'at', 'out', 'hold']), use: Object.freeze(['bell', 'wish', 'collect', 'machine']), kite: Object.freeze(['take', 'letgo', 'state']), soap: Object.freeze(['take', 'letgo', 'release', 'state']), leaf: Object.freeze(['launch', 'control', 'retrieve', 'state']), marble: Object.freeze(['set', 'roll', 'reset', 'state']), tune: Object.freeze(['on', 'off', 'ping', 'pong']), tide: Object.freeze(['got', 'lift', 'haul', 'heave', 'open', 'castle', 'cset', 'race', 'rstate', 'rend', 'rpick', 'cheer', 'lback']) });
/** What only the garden's host may say (the host decides: who netted a bug, who took a gift, which creatures are about, what the pets notice), and what goes to the host alone (a claim, a poke). A guest's own fx of these kinds is refused at both ends. */
const GL_FX_HOST_ONLY = Object.freeze(new Set(['mo|*', 'gm|start', 'gm|state', 'gm|end', 'gm|stop', 'tune|pong', 'bug|gone', 'bug|lost', 'cr|react', 'cr|look', 'cr|greet', 'egg|fire', 'pick|spawn', 'pick|take', 'pick|gone', 'roam|*', 'ct|*', 'kite|state', 'soap|state', 'leaf|state', 'marble|state', 'tide|heave', 'tide|open', 'tide|cset', 'tide|race', 'tide|rstate', 'tide|rend']));
const GL_FX_TO_HOST = Object.freeze(new Set(['gm|act', 'gm|join', 'gm|leave', 'gm|ask', 'folk|talk', 'folk|bye', 'tune|ping', 'bug|claim', 'pick|claim', 'cr|poke', 'fs|hook', 'fs|land', 'fs|free', 'sync|ask', 'sync|away', 'sync|back', 'pose|on', 'pose|off', 'kite|take', 'kite|letgo', 'soap|take', 'soap|letgo', 'soap|release', 'leaf|launch', 'leaf|control', 'leaf|retrieve', 'marble|set', 'marble|roll', 'marble|reset', 'tide|haul', 'tide|castle', 'tide|rpick', 'tide|cheer', 'tide|lback']));
const glFxHostOnly = (b) => !!b && (GL_FX_HOST_ONLY.has(b.c + '|' + b.e) || GL_FX_HOST_ONLY.has(b.c + '|*') || b.c === 'petplay' && b.u != null);
const glFxToHost = (b) => !!b && GL_FX_TO_HOST.has(b.c + '|' + b.e);
const GL_GM_GAMES = Object.freeze(['race', 'seek', 'hide', 'stones', 'hunt']);   // (folk3: the games a gm message may name, VALE_GAMES in 94-garden-folk3-0rules.js)
const GL_FX_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
/** WHAT I AM DOING (gl:dg, 2.74.1): one person's whole state, sent when it changes (never a stream), so every screen shows the same, and a late
 *  arrival or a lost message comes right with the next one. a: the move from the things-to-do table (an 'act-' id of GL_EMOTES), none = nothing;
 *  x, y: where it is done (cells); d: the way they face for it (degrees on the screen, 0 east, 90 south); t: tenths of a second since it began (a late arrival joins it part way, a held pose at its end); i, h: the thing
 *  in your hands and how it is drawn (carry); p: the stick's part of a throw (0 in the hand, 1 lying out there, 2 coming back, 3 dropped at your
 *  feet) with fx, fy where it landed; m: things you have set down elsewhere this visit [[id, x tenths, y tenths]]; sv: the trail puzzles a
 *  visitor has solved here this visit (the host's page keeps them). Ids only: each side draws them. */
const GL_DG_MAX_MOVED = 6;
function glDoingOk(b) {
  if (!b || typeof b !== 'object') return 'shape';
  const cols = GARDEN_WORLD.cols, rows = GARDEN_WORLD.rows, num = (v, hi) => v == null || typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= hi;
  if (b.a != null && (!GL_FX_ID_RE.test(String(b.a)) || !GL_EMOTES.includes('act-' + b.a))) return 'act';
  if (!num(b.x, cols) || !num(b.y, rows) || !num(b.fx, cols) || !num(b.fy, rows)) return 'cell';
  if (b.t != null && !(Number.isInteger(b.t) && b.t >= 0 && b.t <= 6000)) return 'time';
  if (b.d != null && !(Number.isInteger(b.d) && b.d >= -180 && b.d <= 180)) return 'facing';
  for (const k of ['i', 'h']) if (b[k] != null && !GL_FX_ID_RE.test(String(b[k]))) return 'thing';
  if (b.p != null && !(Number.isInteger(b.p) && b.p >= 0 && b.p <= 3)) return 'stick';
  if (b.gk != null && (!Array.isArray(b.gk) || b.gk.length > 12 || b.gk.some(k => typeof k !== 'string' || !/^[a-z][a-z0-9-]{0,23}$/.test(k)))) return 'finds';
  if (b.gz != null && (!Array.isArray(b.gz) || b.gz.length > 32 || b.gz.some(n => !Number.isInteger(n) || n < 0 || n > 64))) return 'gates';
  if (b.sv != null && (!Array.isArray(b.sv) || b.sv.length > 8 || b.sv.some(k => typeof k !== 'string' || !/^ld-[a-z0-9-]{1,24}$/.test(k)))) return 'solved';
  if (b.m != null) { if (!Array.isArray(b.m) || b.m.length > GL_DG_MAX_MOVED) return 'moved'; for (const r of b.m) if (!Array.isArray(r) || r.length !== 3 || !GL_FX_ID_RE.test(String(r[0])) || !Number.isInteger(r[1]) || !Number.isInteger(r[2]) || r[1] < 0 || r[2] < 0 || r[1] > cols * 10 || r[2] > rows * 10) return 'moved'; }
  return '';
}
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
  if (b.pc != null && b.c !== 'petplay') return 'pet';
  if ((b.lb != null || b.lc != null) && b.c !== 'leaf') return 'leaf';
  // Only the new play family addresses a host pack member. A species check
  // accompanies its transient pp slot, so a changed roster cannot misaddress it.
  if (b.u != null && b.c !== 'petplay') return 'pet';
  if (b.c === 'petplay') {
    const match = /^(?:puddle-(cat|dog|duck|rabbit)|guide-(?:stop-)?(owl|otter|fox|rabbit))$/.exec(String(b.e || '')), species = match && (match[1] || match[2]);
    if (!species || match[2] && !GL_FX_ID_RE.test(String(b.p || '')) || b.u != null && (!Number.isInteger(b.u) || b.u < 1 || b.u > 3 || b.i !== species) || b.u == null && b.i != null || !Array.isArray(b.pc) || b.pc.length !== 3 || !Number.isInteger(b.pc[0]) || b.pc[0] < 0 || b.pc[0] > GARDEN_WORLD.cols * 10 || !Number.isInteger(b.pc[1]) || b.pc[1] < 0 || b.pc[1] > GARDEN_WORLD.rows * 10 || b.pc[2] !== 0 && b.pc[2] !== 1) return 'pet';
    return '';
  }
  if (b.c === 'pose') {
    if (!['on', 'off'].includes(b.e) || !GL_FX_ID_RE.test(String(b.p || ''))) return 'pose';
    if (b.e === 'off') return b.i == null && b.kd == null && b.v == null && b.n == null && b.ql == null ? '' : 'pose';
    if (b.i == null) return b.kd == null && b.v == null && b.n == null && b.ql == null ? '' : 'pose';
    if (!GL_FX_ID_RE.test(String(b.i)) || !['fish', 'bug', 'gear'].includes(b.kd)) return 'pose';
    if (b.v != null && (!GL_FX_ID_RE.test(String(b.v)) || b.kd === 'gear')) return 'pose';
    if (b.n != null && (!Number.isInteger(b.n) || b.n < 1 || b.n > (b.kd === 'fish' ? 400 : 999) || b.kd === 'gear')) return 'pose';
    return b.ql == null || Number.isInteger(b.ql) && b.ql >= 0 && b.ql <= 3 ? '' : 'pose';
  }
  const steps = GL_FX_STEPS[b.c];
  if (steps && !steps.includes(b.e)) return 'step';
  if (b.c === 'tide') {   // the shore (94-garden-tide-*.js): a glint, a stone, a chest, a castle or a race by its number, cells, ids from the tables
    const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (b.n != null && !int(b.n, 0, 999) || b.tt != null && !int(b.tt, 0, 99999999) || b.to != null && !int(b.to, 0, GL_PEOPLE)) return 'tide';
    if (b.x != null && !int(b.x, 0, GARDEN_WORLD.cols - 1) || b.y != null && !int(b.y, 0, GARDEN_WORLD.rows - 1)) return 'cell';
    if (b.i != null && !GL_FX_ID_RE.test(String(b.i)) || b.v != null && !GL_FX_ID_RE.test(String(b.v))) return 'id';
    return '';
  }
  if (b.c === 'folk') return typeof b.i === 'string' && b.i.length <= 24 && GL_FX_ID_RE.test(b.i) ? '' : 'folk';   // a guest talks to one of the host's folk (94-garden-wonder-0vale-folk.js): which one, nothing else
  // games with the vale's folk (94-garden-wonder-folk3-1games.js), the host refereeing: `i` the round, `p` the game, `v` folk ids or their
  // state, `x`/`y` a cell, `n` seconds or a move's number, `ql` the phase, `l` people's [slot, score, count] or a course's [k, cell, fraction]
  // a public moment (a festival's opening, 94-garden-wonder-folk3-8scene.js): `i` the moment, `x`/`y` its stage's cell, `tt` seconds in
  if (b.c === 'mo') { const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi; return typeof b.i === 'string' && b.i.length <= 24 && GL_FX_ID_RE.test(b.i) && int(b.x, 0, GARDEN_WORLD.cols - 1) && int(b.y, 0, GARDEN_WORLD.rows - 1) && (b.tt == null || int(b.tt, 0, 999)) && b.l == null && b.v == null && b.p == null ? '' : 'mo'; }
  if (b.c === 'gm') {
    const id = v => typeof v === 'string' && v.length <= 24 && GL_FX_ID_RE.test(v), int = (v, lo, hi) => v == null || (Number.isInteger(v) && v >= lo && v <= hi);
    if (!id(b.i) || (b.p != null && !GL_GM_GAMES.includes(b.p)) || (b.v != null && !GL_FX_ID_RE.test(String(b.v)))) return 'gm';
    if (!int(b.x, 0, GARDEN_WORLD.cols - 1) || !int(b.y, 0, GARDEN_WORLD.rows - 1) || !int(b.n, 0, 600) || !int(b.ql, 0, 3) || !int(b.to, 0, GL_PEOPLE) || !int(b.tt, 0, 999)) return 'gm';
    if (b.l != null) { if (!Array.isArray(b.l) || b.l.length > 8) return 'gm'; for (const r of b.l) if (!Array.isArray(r) || r.length !== 3 || !Number.isInteger(r[0]) || !int(r[0], 0, GL_PEOPLE) || !Number.isInteger(r[1]) || !int(r[1], 0, 9999) || !Number.isInteger(r[2]) || !int(r[2], 0, 99)) return 'gm'; }
    if ((b.e === 'start' || b.e === 'ask') && b.p == null) return 'gm';
    return '';
  }
  if (b.c === 'marble') {
    const id = v => typeof v === 'string' && v.length <= 13 && GL_FX_ID_RE.test(v), int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (!id(b.i) || b.p != null && !id(b.p)) return 'id';
    if (b.e !== 'state') {
      if (!id(b.p) || b.mr != null) return 'marble';
      return b.e === 'set' ? int(b.n, 1, 2) && int(b.ql, 1, 2) ? '' : 'marble' : b.n == null && b.ql == null ? '' : 'marble';
    }
    const r = b.mr;
    if (!id(b.v) || !int(b.x, 0, GARDEN_WORLD.cols - 1) || !int(b.y, 0, GARDEN_WORLD.rows - 1) || !Array.isArray(r) || r.length !== 10) return 'marble';
    return int(r[0], 0, 999) && int(r[1], 0, 4) && int(r[2], 0, 6) && int(r[3], 0, 1000) && int(r[4], 0, 1200) && int(r[5], 0, 1) && int(r[6], 0, 1) && int(r[7], 0, 3) && int(r[8], 0, 99) && int(r[9], 0, 1) && (r[1] === 1 || !r[9]) ? '' : 'marble';
  }
  if (b.c === 'leaf') {
    const id = v => typeof v === 'string' && v.length <= 13 && GL_FX_ID_RE.test(v), int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
    if (!id(b.i) || b.p != null && !id(b.p)) return 'id';
    if (b.e !== 'state') {
      if (!id(b.p) || b.lb != null || b.lc != null) return 'leaf';
      if (b.e === 'launch') return int(b.n, 1, 3) ? '' : 'leaf';
      if (b.e === 'control') return int(b.tt, 1, 999) && int(b.n, 1, 3) && int(b.ql, 1, 2) ? '' : 'leaf';
      return int(b.tt, 0, 999) ? '' : 'leaf';
    }
    if (!int(b.x, 0, GARDEN_WORLD.cols - 1) || !int(b.y, 0, GARDEN_WORLD.rows - 1) || !int(b.tt, 0, 1) || !Array.isArray(b.lc) || b.lc.length !== 5 || !Array.isArray(b.lb) || b.lb.length > GL_PEOPLE) return 'leaf';
    for (const p of b.lc) if (!Array.isArray(p) || p.length !== 2 || !int(p[0], 0, GARDEN_WORLD.cols * 100) || !int(p[1], 0, GARDEN_WORLD.rows * 100)) return 'leaf';
    const seen = new Set();
    for (const r of b.lb) {
      if (!Array.isArray(r) || r.length !== 9 || !int(r[0], 0, GL_PEOPLE) || seen.has(r[0]) || !int(r[1], 1, 999) || !int(r[2], 0, GARDEN_WORLD.cols * 100) || !int(r[3], 0, GARDEN_WORLD.rows * 100) || !int(r[4], 0, 628) || !int(r[5], 0, 2) || !int(r[6], 0, 1) || !int(r[7], 0, 2) || !int(r[8], 0, 4)) return 'leaf';
      seen.add(r[0]);
    }
    return '';
  }
  if (b.c === 'soap') {
    if (!GL_FX_ID_RE.test(String(b.i || '')) || b.p != null && !GL_FX_ID_RE.test(String(b.p))) return 'id';
    if (b.e !== 'state') return GL_FX_ID_RE.test(String(b.p || '')) ? '' : 'soap';
    if (!GL_FX_ID_RE.test(String(b.v || '')) || !Number.isInteger(b.x) || !Number.isInteger(b.y) || b.x < 0 || b.x >= GARDEN_WORLD.cols || b.y < 0 || b.y >= GARDEN_WORLD.rows || !Number.isInteger(b.n) || b.n < 0 || b.n > 100 || !Number.isInteger(b.ql) || b.ql < 0 || b.ql > 3 || !Array.isArray(b.l) || b.l.length > 2) return 'soap';
    const seen = new Set();
    for (const r of b.l) { if (!Array.isArray(r) || r.length !== 3 || !Number.isInteger(r[0]) || r[0] < 0 || r[0] > GL_PEOPLE || r[1] !== 0 && r[1] !== 1 || r[2] !== 0 || seen.has(r[0])) return 'soap'; seen.add(r[0]); }
    if (b.sb != null && (!Array.isArray(b.sb) || b.sb.length !== 5 || !GL_FX_ID_RE.test(String(b.sb[0])) || !Number.isInteger(b.sb[1]) || b.sb[1] < 0 || b.sb[1] > GARDEN_WORLD.cols * 10 || !Number.isInteger(b.sb[2]) || b.sb[2] < 0 || b.sb[2] > GARDEN_WORLD.rows * 10 || !Number.isInteger(b.sb[3]) || b.sb[3] < 10 || b.sb[3] > 140 || !Number.isInteger(b.sb[4]) || b.sb[4] < 0 || b.sb[4] > 99)) return 'soap';
    return (b.ql === 3) === !!b.sb && (b.ql !== 3 || !b.l.length) ? '' : 'soap';
  }
  if (b.c === 'kite') {
    if (!GL_FX_ID_RE.test(String(b.i || '')) || b.p != null && !GL_FX_ID_RE.test(String(b.p))) return 'id';
    if (b.e !== 'state') return GL_FX_ID_RE.test(String(b.p || '')) ? '' : 'kite';
    if (!Number.isInteger(b.x) || !Number.isInteger(b.y) || b.x < 0 || b.x >= GARDEN_WORLD.cols || b.y < 0 || b.y >= GARDEN_WORLD.rows || !Array.isArray(b.l) || b.l.length > GL_PEOPLE) return 'kite';
    const seen = new Set();
    for (const r of b.l) { if (!Array.isArray(r) || r.length !== 3 || !Number.isInteger(r[0]) || r[0] < 0 || r[0] > GL_PEOPLE || r[1] !== 0 || r[2] !== 0 || seen.has(r[0])) return 'kite'; seen.add(r[0]); }
    return '';
  }
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
  if ((b.c === 'fish' && b.e === 'cast') || b.c === 'use') { if (!(Number.isInteger(b.x) && Number.isInteger(b.y))) return 'cell'; }
  if (b.c === 'snap' && !(GL_ID_RE.test(String(b.i || '')) && Number.isInteger(b.x) && Number.isInteger(b.y) && b.x >= 0 && b.y >= 0)) return 'snap';
  if (b.c === 'hall' && b.e !== 'out' && !(Number.isInteger(b.x) && Number.isInteger(b.y) && b.x >= 0 && b.x <= 59 && b.y >= 0 && b.y <= 37)) return 'hall';
  if (b.c === 'hall' && b.i != null && !GL_FX_ID_RE.test(String(b.i))) return 'id';   // (`i`: which hidden room; none is the stage)
  // playing music together (94-garden-zz-7act-3music.js): on / off: `i` the instrument's thing, `n` its place there (0 to 3, none is 0);
  // ping (to the host alone) and pong (the host's answer): `v` the asker's token, and in a pong the host's tune clock, `tt` seconds and `n` ms
  if (b.c === 'tune') {
    if ((b.e === 'on' || b.e === 'off') && (!GL_FX_ID_RE.test(String(b.i || '')) || b.n != null && !(Number.isInteger(b.n) && b.n >= 0 && b.n <= 3))) return 'tune';
    if ((b.e === 'ping' || b.e === 'pong') && !/^[0-9a-z]{1,8}$/.test(String(b.v || ''))) return 'tune';
    if (b.e === 'pong' && !(Number.isInteger(b.tt) && b.tt >= 0 && b.tt <= 999 && (b.n == null || Number.isInteger(b.n) && b.n >= 0 && b.n <= 999))) return 'tune';
  }
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
    if (!Number.isInteger(r.x) || r.x < 0 || r.x > GARDEN_WORLD.cols * 10 || !Number.isInteger(r.y) || r.y < 0 || r.y > GARDEN_WORLD.rows * 10) return 'pp';
    if ((r.gx == null) !== (r.gy == null)) return 'pp';
    if (r.gx != null && !(Number.isInteger(r.gx) && r.gx >= 0 && r.gx <= GARDEN_WORLD.cols * 10 && Number.isInteger(r.gy) && r.gy >= 0 && r.gy <= GARDEN_WORLD.rows * 10)) return 'pp';
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
const GL_COLS = Math.max(GARDEN_WORLD.cols, GARDEN_WORLD.rows);
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
  if (a.land) { if (!GL_FX_ID_RE.test(String(b.p || ''))) return 'land'; if (a.land === 'land' && typeof gardenLandRow === 'function' && !(gardenLandRow(b.p) || {}).buy) return 'land'; if (a.land === 'feat' && typeof gardenLandFeature === 'function' && !gardenLandFeature(b.p)) return 'land'; if (a.land === 'gate' && typeof gardenGateOf === 'function' && !gardenGateOf(b.p)) return 'land'; if (a.land === 'solve' && typeof gardenExploreIds === 'function' && !gardenExploreIds().includes(String(b.p))) return 'land'; if (a.land === 'tunnel' && ((b.r != null && b.r !== 0 && b.r !== 2) || (typeof gardenDepthTunnelIds === 'function' && !gardenDepthTunnelIds().includes(String(b.p))))) return 'land'; if (b.x != null && (!_glCell(b.x) || !Number.isInteger(b.y) || b.y < 0 || b.y >= GARDEN_WORLD.rows)) return 'cell'; }   // (the server has no land table: it checks the shape, the page the id)
  if (a.give && (!['fish', 'bug', 'fos', 'cur'].includes(b.k) || !GL_FX_ID_RE.test(String(b.item || '')) || (b.u != null && !/^\d{1,3}-[0-3]$/.test(String(b.u))))) return 'gift';   // (build2) a gift to the museum
  if (b.t === 'drop') { if (!gsocGiftOk(b.k, b.item)) return 'gift'; if (!Number.isInteger(b.to) || b.to < 0 || b.to >= GL_PEOPLE) return 'who'; }
  if (a.house) { if (!['put', 'move', 'lift', 'use', 'wall', 'floor', 'jar', 'help', 'dye'].includes(b.item) || !Number.isInteger(b.x) || b.x < 0 || b.x > 7) return 'house'; if (['put', 'wall', 'floor'].includes(b.item) && !gardenDecor(b.p)) return 'decor'; if (['put', 'move', 'lift', 'use', 'dye'].includes(b.item) && !/^[A-Za-z0-9_-]{1,24}$/.test(String(b.u || ''))) return 'id'; if (['put', 'move'].includes(b.item) && !(Number.isInteger(b.fx) && b.fx >= 0 && b.fx <= 960 && Number.isInteger(b.fy) && b.fy >= 0 && b.fy <= 640 && (b.y == null || Number.isInteger(b.y) && b.y >= 0 && b.y <= 95))) return 'cell'; if (b.item === 'jar' && (!['coin', 'timber', 'stone'].includes(b.p) || b.p === 'coin' && !(Number.isInteger(b.fx) && b.fx >= 1 && b.fx <= 960))) return 'house'; if (b.item === 'dye' && !(Number.isInteger(b.fx) && b.fx >= 0 && b.fx <= 7 && (b.fx === 0 || /^[a-z0-9-]{1,32}$/.test(String(b.p || ''))))) return 'house'; }   // (ids and numbers: the host's page runs the house rules; jar: p coin (fx of them) or one timber or stone; dye: fx the colour, p the crop boiled)
  if (a.carry) { const op = a.carry === 'grab' ? { o: 'grab', i: 'thing:' + b.p } : { o: 'drop', i: 'thing:' + b.p, fx: b.fx, fy: b.fy }; if (typeof gardenOpShape !== 'function' || gardenOpShape(op)) return 'carry'; }   // (the same rules file as the page: 94-garden-build-0rules.js)
  if (!GL_ID_RE.test(String(b.i || ''))) return 'id';
  return '';
}
/* ---------- trading (docs/dev/GARDEN_TOGETHER.md section 14) ----------
   Two people in one live garden swap what is in their bags, and it happens only when BOTH have confirmed the same terms. The host's page is the referee (it decides, once, and is the
   only one that does); each side holds what it offers when it confirms, and takes the other's offer when the host says go. gl:tr is a kind of its own (an older app drops it, GL_V stays 2).
   lv: the level both need. rows, qty: what one side may offer (seed, decor, fish, bug, as gsocGiftOk allows; never coins). perDay: trades one person may finish in a day.
   askMs: how long a request waits for the other app to say it can trade (an older one never does). idleMs: an open trade nobody touches is called off. */
// sealMs (2.75, the trading overhaul): once BOTH have agreed, the swap waits this long before it is final, and either of you can still say "Wait, undo". The referee keeps the time; nothing new goes on the wire
// coins (full co-op, 2.75): friends may put coins in a trade too ('coin:c', at most this many in one trade), so one can buy a fish or a seed from the other
const GL_TRADE = Object.freeze({ lv: 'play', rows: 4, qty: 20, perDay: 500, askMs: 8000, idleMs: 5 * 60000, sealMs: 5000, coins: 5000 });
/** From a guest to the host: ask (to a slot), hi (I can trade), offer (my whole offer), ok (I confirm version v), no (I take my confirmation back), end, chk (what became of this trade?).
 *  From the host: st (the state, for you), go (it happened), x (it did not, why). Counters: n on a guest's offer, ok and no, answered by an in st (the host has seen up to n). */
const GL_TRADE_GUEST = Object.freeze(['ask', 'hi', 'offer', 'ok', 'no', 'end', 'chk']);
const GL_TRADE_HOST = Object.freeze(['st', 'go', 'x']);
const GL_TRADE_STEPS = Object.freeze([...GL_TRADE_GUEST, ...GL_TRADE_HOST]);
const GL_TRADE_WHY = Object.freeze(['busy', 'gone', 'level', 'cap', 'left', 'cancel', 'idle', 'old', 'item', 'host', 'lost']);
const GL_TRADE_ITEM_RE = /^(seed|decor|fish|bug):([a-z0-9-]{1,64})$/;
const GL_TRADE_COIN = 'coin:c';   // coins, as a row of a trade (an older app does not know it, and says so: why 'item')
function glTradeItemOk(item) { if (item === GL_TRADE_COIN) return true; const m = GL_TRADE_ITEM_RE.exec(String(item || '')); return !!m && gsocGiftOk(m[1], m[2]); }
/** '' when rows ([[item, n], ...]) are a fitting offer: few, distinct, known and given-able, a few of each. */
function glTradeRowsOk(rows) {
  if (!Array.isArray(rows) || rows.length > GL_TRADE.rows) return 'rows';
  const seen = new Set();
  for (const r of rows) {
    if (!Array.isArray(r) || typeof r[0] !== 'string' || seen.has(r[0]) || !Number.isInteger(r[1]) || r[1] < 1 || r[1] > (r[0] === GL_TRADE_COIN ? GL_TRADE.coins : GL_TRADE.qty)) return 'rows';
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

