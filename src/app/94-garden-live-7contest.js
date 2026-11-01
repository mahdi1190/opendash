/* ============================================================
   CONTESTS (docs/dev/GARDEN_TOGETHER.md section 15). The user, 31 Oct 2026: a fishing or bug contest for live play: a timed round, everyone in the garden competes,
   a live leaderboard, and at the end the host announces the winner with a small celebration.
   THE HOST'S PAGE IS THE REFEREE. It starts the round (`ct|start`: kind, length), keeps the scores, sends the board when it changes (`ct|board`, at most every 1.8 s, and every 10 s so
   clocks stay together) and names the winner (`ct|end`). Those are host-only fx (GL_FX_HOST_ONLY 'ct|*'): the host's server and every guest's server refuse a guest's. A guest sends nothing new:
   its casts and nets are the `fish`, `bug` and `got` events it always sends.

     fishing   the host counts a guest's catch only when it can match it to the steps of a line it saw: cast, then a bite no sooner than 0.9 s later, then reel, land, and the `got` after
               them, all in that order, the cast after the round began, the fish a kind that lives in the water that was cast into, its size inside the kind's range, and no sooner than
               GL_CT.gap seconds after that guest's last catch. One line, one catch. Points: size and quality (glCtFishPoints). A guest could still invent a plausible line (it is only
               messages): the most that buys is points in a game, a trophy-sized reward capped each day on its own computer, and the host seeing the board.
     bugs      the host DECIDES who got a bug (94-garden-live-6life.js: the first claim it hears wins), so it scores that. A bug round also shows a bug every few seconds, the same ones
               on every screen, worked out from the round's id (gardenContestBugsNow), so there is something to race for.
     released  what is caught in a round is released: a contest cast costs nothing, uses no bait and keeps no fish; a contest bug is not kept (gardenCatchFish, gardenCatchBug). So starting
               rounds cannot make money, and a person who has used up their casts can still play. Nothing here creates coins except the reward below.
     reward    on each person's OWN computer, once a round, from the board the host sent: GL_CT.reward.play for having played (a catch of your own and GL_CT.minPts points), .win for winning
               when a second person scored; at most GL_CT.reward.day coins a day from contests, whoever hosts. A host starts at most GL_CT.perDay rounds a day, and not alone.
     leaving   the host closing the garden, leaving, or pressing End sends `ct|stop` (no winner, no reward); a guest whose host goes quiet clears the board on its own.
   What a dishonest host can do: name a winner and pay the small daily-capped reward. What a dishonest guest can do: claim a plausible line (above). Neither can touch the other's garden or bag.

     gardenContestStart(kind, len)    the host: start a round ({ok, msg})        gardenContestEnd()      the host: end it now
     gardenContestLive(kind)          the round that is running now, or null      gardenContestMine(kind, id, o)    you caught something: it counts if a round is on
     gardenContestSeen(A, ev)         the host heard a guest's fish step or catch (94-garden-live-4fx.js)
     gardenContestBug(w, bug)         the host decided a guest got a bug (94-garden-live-6life.js)
     gardenContestBugsNow(m)          the extra bugs a bug round shows (94-garden-fish-2core.js)
   ============================================================ */
const _cth = { r: null, seq: new Map(), last: new Map(), tickT: 0, boardT: 0, boardAt: 0, confirm: 0 };   // the host: the round, each guest's line, each guest's last catch
const _ctg = { r: null, tickT: 0 };                                                                      // a guest: the round the host told it about
const _ctm = { id: '', n: 0, pts: 0 };                                                                  // YOUR catches in this round (host or guest): a reward needs one of your own
const _ct = { sig: '', wave: -1, clearT: 0, prev: null };
const _CT_LATE = 1000;        // ms after the end a catch already on its way still counts
const _CT_NAME = Object.freeze({ fish: 'Fishing contest', bug: 'Bug contest' });
const _CT_LEN_NAME = (s) => (s % 60 === 0 ? (s / 60) + ' min' : s + ' s');

/** The round on this screen (the host's own, or the one a host told you about), running or just over. */
function _ctRound() { return _cth.r || _ctg.r || null; }
/** The round that is running now (nothing after the end), of this kind if one is asked for. */
function gardenContestLive(kind) {
  const r = _ctRound();
  if (!r || r.over || r.done || Date.now() >= r.t1) return null;   // clock-ok: a round is timed by the clock
  if (_cth.r === r ? !(_gll.role === 'host' && _glh.on) : !(_gll.role === 'visit' && _glvLive())) return null;
  return kind && r.kind !== kind ? null : r;
}
function _ctFirst(w) {
  const me = _gll.role === 'visit' ? _glv.w : 0;
  if (w === me) return 'You';
  const A = _gll.actors.get(w);
  return A ? String(A.n).split(/\s+/)[0].slice(0, 20) : (w === 0 ? 'The host' : 'A guest');
}
const _ctMe = () => (_gll.role === 'visit' ? _glv.w : 0);
function _ctToday() { return typeof _gdToday === 'function' ? _gdToday() : new Date().toISOString().slice(0, 10); }   // clock-ok: fallback
function _ctSecs(r) { return Math.max(0, Math.ceil((r.t1 - Date.now()) / 1000)); }   // clock-ok: the round's clock

/* ---------- the host: start, score, board, end ---------- */
/** How many rounds this garden has left today (the host's own record of the day's fishing). */
function gardenContestLeft() {
  try { if (typeof gardenReady !== 'function' || !gardenReady() || !gardenEnsure()) return GL_CT.perDay; return Math.max(0, GL_CT.perDay - (Number((_gdG().fd[_ctToday()] || {}).cr) || 0)); } catch (e) { return GL_CT.perDay; }
}
function gardenContestStart(kind, len) {
  if (_gll.role !== 'host' || !_glh.on) return { ok: false, msg: 'Contests start from your own garden.' };
  if (!GL_CT.kinds.includes(kind)) return { ok: false, msg: 'That is not a kind of contest.' };
  len = GL_CT.lens.includes(len) ? len : GL_CT.len;
  if (_cth.r && !_cth.r.done) return { ok: false, msg: 'A round is on already.' };
  if (!_glhAnyone()) return { ok: false, msg: 'A contest needs someone else in the garden.' };
  if (typeof gardenReady !== 'function' || !gardenReady() || !gardenEnsure()) return { ok: false, msg: 'The garden is not ready yet.' };
  if (!gardenContestLeft()) return { ok: false, msg: `That is ${GL_CT.perDay} contests today. They come back tomorrow.` };
  const day = _gcFd(_gdG(), _ctToday());
  day.cr = (Number(day.cr) || 0) + 1; _gdSave();   // (counted as it starts: ending it early does not give it back)
  clearTimeout(_ct.clearT);
  const id = _gllNewId(), t0 = Date.now();   // clock-ok: the round's start
  const r = { id, kind, tt: len, t0, t1: t0 + len * 1000, score: new Map(), l: [], over: false, done: false, win: null };
  _cth.r = r; _cth.seq.clear(); _cth.last.clear(); _cth.boardAt = 0;
  Object.assign(_ctm, { id, n: 0, pts: 0 });
  _ct.prev = null; _ct.sig = ''; _ct.wave = -1;
  _glhSend('all', 'fx', { c: 'ct', e: 'start', i: id, kd: kind, n: len, tt: len });
  r.l = _cthStandings();
  _cthBoardNow();
  clearInterval(_cth.tickT); _cth.tickT = setInterval(_cthTick, 500);
  _ctAfterChange();
  if (typeof _fxSound === 'function') _fxSound('chime');
  return { ok: true };
}
/** Everyone in the garden, best first: points, then who got there first, then the lower slot. Rows are [slot, points, catches]. */
function _cthStandings() {
  const r = _cth.r; if (!r) return [];
  const slots = new Set([0, ..._gll.actors.keys()]);
  const rows = [];
  for (const w of slots) { const s = r.score.get(w) || { pts: 0, n: 0, at: 0 }; rows.push({ w, pts: s.pts, n: s.n, at: s.at || 1e15 }); }
  rows.sort((a, b) => b.pts - a.pts || a.at - b.at || a.w - b.w);
  return rows.slice(0, GL_PEOPLE).map(x => [x.w, Math.min(9999, x.pts), Math.min(99, x.n)]);
}
function _cthScore(w, pts) {
  const r = _cth.r; if (!r || r.done || !(pts > 0) || !(w === 0 || _gll.actors.has(w))) return;
  let s = r.score.get(w); if (!s) { s = { pts: 0, n: 0, at: 0 }; r.score.set(w, s); }
  s.pts = Math.min(9999, s.pts + Math.floor(pts)); s.n = Math.min(99, s.n + 1); s.at = Date.now();   // clock-ok: who got there first
  r.l = _cthStandings();
  _cthBoardSoon();
  _ctPaint();
}
/** The board: at once, or at most every GL_CT.boardGap ms (a catch a second would be a message a second). */
function _cthBoardSoon() {
  const gap = GL_CT.boardGap - (Date.now() - _cth.boardAt);   // clock-ok: spacing messages
  if (gap <= 0) { _cthBoardNow(); return; }
  if (!_cth.boardT) _cth.boardT = setTimeout(_cthBoardNow, gap + 20);
}
function _cthBoardNow() {
  clearTimeout(_cth.boardT); _cth.boardT = 0;
  const r = _cth.r; if (!r || r.done || !_glh.on) return;
  _cth.boardAt = Date.now();   // clock-ok: spacing messages
  r.l = _cthStandings();
  if (_glhAnyone()) _glhSend('all', 'fx', { c: 'ct', e: 'board', i: r.id, n: Math.min(_ctSecs(r), GL_CT.maxLen), l: r.l });
}
function _cthTick() {
  const r = _cth.r;
  if (!r) { clearInterval(_cth.tickT); return; }
  if (!_glh.on) { _cthStop(true); return; }
  const now = Date.now();   // clock-ok: the round's clock
  if (!r.over && now >= r.t1) { r.over = true; _ctPaint(); _ctAfterChange(); }
  if (r.over && !r.done && now >= r.t1 + GL_CT.grace * 1000) { _cthFinish(); return; }
  if (!r.over && now - _cth.boardAt >= GL_CT.beat * 1000) _cthBoardNow();   // (a beat: so the guests' clocks stay together, and a late joiner's board is never old)
  _ctWaves(r);
  _ctPaint();
}
/** Time (and a moment for the last lines to land): the winner is named. */
function _cthFinish() {
  const r = _cth.r; if (!r || r.done) return;
  clearInterval(_cth.tickT); clearTimeout(_cth.boardT); _cth.boardT = 0;
  r.l = _cthStandings(); r.done = true; r.over = true;
  const top = r.l[0];
  r.win = top && top[1] >= 1 ? top[0] : null;
  if (_glhAnyone()) _glhSend('all', 'fx', { c: 'ct', e: 'end', i: r.id, l: r.l, ...(r.win != null ? { to: r.win } : {}) });
  _ctResult(r, 0);
  _ctAfterChange();
  _ctClearLater();
}
/** The host ends it now (End on the board), or it ends by itself because the host left: nobody wins, nobody is paid. */
function _cthStop(quiet) {
  const r = _cth.r; if (!r) return;
  clearInterval(_cth.tickT); clearTimeout(_cth.boardT); _cth.boardT = 0;
  if (!r.done && _glh.on && _glhAnyone()) _glhSend('all', 'fx', { c: 'ct', e: 'stop', i: r.id });
  _cth.r = null; _cth.seq.clear(); _cth.last.clear();
  _ctPaint(); _ctAfterChange();
  if (!quiet && typeof toast === 'function') toast('The contest is over. Nobody wins this one.', { icon: 'trophy' });
}
function gardenContestEnd() { if (_cth.r && !_cth.r.done) _cthStop(false); }
/** You left your garden (or the page is going): the round goes with it. */
function gardenContestHostGone() { if (_cth.r) _cthStop(true); }
/** Someone has come in: the round, as it stands, for them. */
function gardenContestJoin(fid) {
  const r = _cth.r; if (!r || r.done || r.over || !_glh.on) return;
  _glhSend(fid, 'fx', { c: 'ct', e: 'start', i: r.id, kd: r.kind, n: Math.max(1, Math.min(_ctSecs(r), r.tt)), tt: r.tt });
  _glhSend(fid, 'fx', { c: 'ct', e: 'board', i: r.id, n: Math.min(_ctSecs(r), GL_CT.maxLen), l: _cthStandings() });
}
function gardenContestLeave(w) {
  _cth.seq.delete(w); _cth.last.delete(w);
  const r = _cth.r; if (!r || r.done) return;
  if (r.score.delete(w)) { r.l = _cthStandings(); _cthBoardSoon(); _ctPaint(); }
}

/* ---------- the host counts what it can match ---------- */
/** A guest did something on its line, or caught something (94-garden-live-4fx.js hands over every fx from a guest). */
function gardenContestSeen(A, ev) {
  const r = _cth.r; if (!r || r.done || !A || !ev) return;
  const w = A.w, now = Date.now();   // clock-ok: when it was heard
  if (ev.c === 'fish') {
    const e = String(ev.e || '');
    if (e === 'cast') { _cth.seq.set(w, { cast: now, x: Number(ev.x), y: Number(ev.y), bite: 0, reel: 0, land: 0 }); return; }
    const q = _cth.seq.get(w); if (!q) return;
    if (e === 'bite' && !q.bite) q.bite = now;
    else if (e === 'reel' && q.bite && !q.reel) q.reel = now;
    else if (e === 'land' && q.reel && !q.land) q.land = now;
    else if (e === 'lost' || e === 'in') _cth.seq.delete(w);
    return;
  }
  if (ev.c === 'got' && ev.e === 'fish' && r.kind === 'fish') _cthFishGot(r, w, ev, now);
}
function _cthFishGot(r, w, ev, now) {
  const q = _cth.seq.get(w); if (!q || !q.land) return;
  _cth.seq.delete(w);   // one line, one catch
  const def = typeof gardenFishDef === 'function' ? gardenFishDef(String(ev.i)) : null;
  if (!def || def.cat !== 'fish') return;
  if (q.cast < r.t0 || q.land > r.t1 + _CT_LATE || now > r.t1 + GL_CT.grace * 1000) return;   // (cast before it began, or landed after it ended)
  if (!(q.bite - q.cast >= 900 && q.reel >= q.bite && q.land >= q.reel && now >= q.land && now - q.land <= 8000)) return;   // (a line cannot bite sooner than 1.4 s, and the steps come in order)
  if (now - (_cth.last.get(w) || 0) < GL_CT.gap * 1000) return;
  let zone = null; try { zone = typeof gardenWaterZone === 'function' ? gardenWaterZone(q.x, q.y) : null; } catch (e) { zone = null; }
  if (!zone || !def.zone.includes(zone)) return;   // (a fish of the deep does not come out of the pond)
  const cm = Math.max(def.cm[0], Math.min(def.cm[1], Math.floor(Number(ev.n) || 0)));
  _cth.last.set(w, now);
  _cthScore(w, glCtFishPoints(cm, Math.max(0, Math.min(3, Math.floor(Number(ev.ql) || 0)))));
}
/** The host decided a guest got a bug (the first claim it heard): that is the score, by the bug's rarity. */
function gardenContestBug(w, bug) {
  const r = _cth.r; if (!r || r.done || r.kind !== 'bug' || Date.now() > r.t1 + _CT_LATE || !bug || !bug.def) return;   // clock-ok: the round's clock
  _cthScore(w, glCtBugPoints(bug.def.rarity));
}

/* ---------- you caught something ---------- */
/** Called whenever a catch is held up (94-garden-fish-5moment.js). In a fishing round only a contest cast counts; in a bug round any bug the host (or you, as host) took. */
function gardenContestMine(kind, id, o) {
  const r = _ctRound(); if (!r || r.done || Date.now() > r.t1 + _CT_LATE) return;   // clock-ok: the round's clock
  if (r.kind !== kind || !(_cth.r === r ? _glh.on : _glvLive())) return;
  o = o || {};
  let pts = 0;
  if (kind === 'fish') { const d = gardenFishDef(id); if (d && d.cat === 'fish' && o.contest) pts = glCtFishPoints(o.cm, o.q); }
  else if (kind === 'bug') { const d = gardenBugDef(id); if (d) pts = glCtBugPoints(d.rarity); }
  if (!(pts > 0)) return;
  if (_ctm.id !== r.id) Object.assign(_ctm, { id: r.id, n: 0, pts: 0 });
  _ctm.n++; _ctm.pts += pts;
  if (_cth.r === r) { _cthScore(0, pts); if (typeof gameCheer === 'function' && gardenFun() !== 'off') gameCheer(null, { text: '+' + pts, tone: 'gold', quiet: true }); }
}

/* ---------- a bug round shows bugs ---------- */
/** The bugs a bug round adds (the same on every screen: from the round's id and how far into it we are; a bug stays GL_CT.bugLife seconds unless netted). Keys 'c<round>.<n>'. */
function gardenContestBugsNow(m) {
  const r = gardenContestLive('bug'); if (!r || gardenFun() === 'off' || typeof GARDEN_BUGS === 'undefined') return [];
  const el = Math.max(0, Date.now() - (r.t1 - r.tt * 1000)), W = GARDEN_WORLD;   // clock-ok: how far into the round
  const last = Math.floor(el / (GL_CT.waveSec * 1000)), first = Math.max(0, Math.floor((el - GL_CT.bugLife * 1000) / (GL_CT.waveSec * 1000)) + 1);
  const pool = GARDEN_BUGS.filter(b => b.lv <= 3 && !b.rain && !b.needs && (b.hab.includes('flower') || b.hab.includes('lawn') || b.hab.includes('ground')));
  if (!pool.length) return [];
  const wt = pool.map(b => (GARDEN_RARITY[b.rarity] || GARDEN_RARITY.common).weight), tot = wt.reduce((a, b) => a + b, 0), out = [];
  for (let k = first; k <= last && k < 200; k++) {
    const rnd = gardenRand('ct|' + r.id + '|' + k);
    let v = rnd() * tot, i = 0; for (; i < pool.length - 1; i++) { v -= wt[i]; if (v <= 0) break; }
    let spot = null;
    for (let t = 0; t < 10 && !spot; t++) {
      const x = W.ox + 2 + rnd() * 24, y = W.oy + 6.2 + rnd() * 5, cx = Math.floor(x), cy = Math.floor(y);
      if (m.occ && m.occ.has(cx + ',' + cy) || gardenPropAt(cx, cy) || gardenIsWater(cx, cy)) continue;
      spot = { x, y };
    }
    if (spot) out.push({ key: 'c' + r.id + '.' + k, id: pool[i].id, x: spot.x, y: spot.y, hab: 'lawn', t: rnd() });
  }
  return out;
}
/** A new bug is due: the stage looks again (both ends, on the same beat), and once more at the end so they go. */
function _ctWaves(r) {
  if (r.kind !== 'bug') return;
  const el = Math.max(0, Date.now() - (r.t1 - r.tt * 1000)), k = r.over ? -2 : Math.floor(el / (GL_CT.waveSec * 1000));   // clock-ok: how far into the round
  if (k === _ct.wave) return;
  _ct.wave = k;
  try { if (typeof _gwBugsSync === 'function' && typeof _gw !== 'undefined' && _gw.on) _gwBugsSync(gardenHere()); } catch (e) { /* the next sync has it */ }
}

/* ---------- a guest: the round the host told it about ---------- */
function _ctGuestEvent(ev) {
  if (_gll.role !== 'visit' || !_glvLive() || ev.w !== 0) return;   // (only the host refereed it)
  const e = String(ev.e || ''), now = Date.now();   // clock-ok: the round's clock
  let r = _ctg.r;
  if (e === 'start') {
    if (r && r.id === ev.i) { r.t1 = now + ev.n * 1000; return; }
    clearTimeout(_ct.clearT);
    r = _ctg.r = { id: String(ev.i), kind: ev.kd, tt: ev.tt, t1: now + ev.n * 1000, n0: ev.n, seenAt: now, l: [], over: false, done: false, win: null };
    Object.assign(_ctm, { id: r.id, n: 0, pts: 0 });
    _ct.prev = null; _ct.sig = ''; _ct.wave = -1;
    clearInterval(_ctg.tickT); _ctg.tickT = setInterval(_ctGuestTick, 500);
    _ctAfterChange();
    if (typeof _fxSound === 'function') _fxSound('chime');
    _ctPaint();
    return;
  }
  if (!r || r.id !== ev.i || r.done) return;
  if (e === 'board') {
    r.l = ev.l || []; if (!r.over) r.t1 = now + ev.n * 1000;   // (the host's clock wins)
    _ctNoteMine(r);
    _ctPaint();
  } else if (e === 'end') {
    r.l = ev.l || []; r.win = ev.to == null ? null : ev.to; r.over = true; r.done = true;
    clearInterval(_ctg.tickT);
    _ctResult(r, _ctMe());
    _ctAfterChange();
    _ctClearLater();
  } else if (e === 'stop') {
    clearInterval(_ctg.tickT); _ctg.r = null; _ctPaint(); _ctAfterChange();
    if (typeof _gllFeed === 'function') _gllFeed('The host ended the contest.');
  }
}
function _ctGuestTick() {
  const r = _ctg.r;
  if (!r || !(_gll.role === 'visit' && _glvLive())) { gardenContestGuestClear(); return; }
  const now = Date.now();   // clock-ok: the round's clock
  if (!r.over && now >= r.t1) { r.over = true; _ctPaint(); _ctAfterChange(); }
  if (r.over && !r.done && now > r.t1 + (GL_CT.grace + 9) * 1000) { gardenContestGuestClear(); return; }   // the host went quiet: nobody wins, nobody is paid
  _ctWaves(r);
  _ctPaint();
}
/** The visit ended, the host went, or the page is going. */
function gardenContestGuestClear() {
  clearInterval(_ctg.tickT); clearTimeout(_ct.clearT);
  const had = !!_ctg.r; _ctg.r = null;
  if (had) { _ctPaint(); _ctAfterChange(); }
}

/* ---------- the end: the winner, a small celebration, and the reward ---------- */
function _ctResult(r, me) {
  const rows = r.l || [], top = r.win, motion = typeof gardenMotionOn === 'function' && gardenMotionOn();
  const won = top != null && top === me;
  if (typeof gardenFun === 'function' && gardenFun() !== 'off') {
    try { if (typeof _fxSound === 'function') _fxSound(top != null ? 'chime' : 'sparkle'); } catch (e) { /* silent */ }
    if (top != null) {
      if (won) {
        if (typeof gameCheer === 'function') gameCheer(null, { text: '🏆', tone: 'gold', sound: true });
        if (typeof gartEmoteRun === 'function') { try { gartEmoteRun('cheer'); } catch (e) { /* only a flourish */ } }   // (not quiet: everyone here sees you cheer)
      } else {
        const A = _gll.actors.get(top);
        if (A) {
          if (motion && typeof _glFx === 'function' && typeof _gl !== 'undefined' && _gl.W) { try { _glFx(A.x, A.y, 'sparkle', { lift: 30 }); } catch (e) { /* only a flourish */ } }
          if (typeof _gllOffscreen === 'function' && !_gllOffscreen(A) && typeof _gw !== 'undefined' && _gw.svg) _gllFloat(_gw.svg, A.x, A.y - 1.8, '🏆', _ctFirst(top));
        }
      }
    }
  }
  const got = _ctPay(r, rows, me, top);
  r.paid = got;
  if (got && typeof toast === 'function') toast(`${won ? 'You won! ' : ''}+${got.c} coin${got.c === 1 ? '' : 's'}${got.x ? ` and ${got.x} XP` : ''} for the ${r.kind === 'bug' ? 'bug' : 'fishing'} contest`, { icon: 'trophy', kind: 'ok', timeout: 6000 });
  _ct.sig = ''; _ctPaint();
}
/** What you are given, on your own computer, from the board the host sent. Once a round, only for playing, never more than GL_CT.reward.day coins a day. */
function _ctPay(r, rows, me, winner) {
  try {
    const mine = rows.find(x => x[0] === me);
    if (_ctm.id !== r.id || _ctm.n < 1 || !mine || mine[1] < GL_CT.minPts) return null;       // (a catch of your own, and points on the board)
    if (r.seenAt && Date.now() - r.seenAt < 0.8 * (r.n0 || 0) * 1000) return null;            // clock-ok: the round really ran its length (a host cannot pay out a round it flashed past)
    if (!GL_ID_RE.test(r.id) || typeof gardenReady !== 'function' || !gardenReady() || !gardenEnsure()) return null;
    const real = rows.filter(x => x[1] >= 1).length >= 2;                                      // (a win needs someone to beat)
    const want = winner === me && real ? GL_CT.reward.win : GL_CT.reward.play;
    const g = _gdG(), today = _ctToday(), key = 'cw.' + today + '.' + r.id;
    if (g.led[key]) return null;                                                               // (once a round)
    let had = 0; for (const [k, e] of Object.entries(g.led)) if (e && k.startsWith('cw.' + today + '.')) had += Number(e.c) || 0;
    const c = Math.max(0, Math.min(want.c, GL_CT.reward.day - had)), x = c > 0 ? want.x : 0;
    g.led[key] = { d: today, k: 'cw', c, x, n: 0 };
    _gdSave();
    return c > 0 ? { c, x } : null;
  } catch (e) { return null; }
}
/** You scored: a little +N over your head, the first time the board says so. */
function _ctNoteMine(r) {
  const me = _ctMe(), mine = (r.l || []).find(x => x[0] === me), was = _ct.prev;
  _ct.prev = mine ? mine[1] : 0;
  if (mine && was != null && mine[1] > was && typeof gameCheer === 'function' && typeof gardenFun === 'function' && gardenFun() !== 'off') gameCheer(null, { text: '+' + (mine[1] - was), tone: 'gold', quiet: true });
}
function _ctClearLater() { clearTimeout(_ct.clearT); _ct.clearT = setTimeout(() => { if (_cth.r && _cth.r.done) _cth.r = null; if (_ctg.r && _ctg.r.done) _ctg.r = null; _ctPaint(); _ctAfterChange(); }, 12000); }
/** Casts and the HUD's cast count follow the round; a bug round's bugs come and go. */
function _ctAfterChange() {
  try { if (typeof _gwBugsSync === 'function' && typeof _gw !== 'undefined' && _gw.on) _gwBugsSync(gardenHere()); } catch (e) { /* the next sync has it */ }
  try { if (typeof _gdpRefreshChromeSoon === 'function') _gdpRefreshChromeSoon(); } catch (e) { /* the next paint has it */ }
  try { if (_gll.role === 'host' && typeof _glhHud === 'function') _glhHud(); } catch (e) { /* the next paint has it */ }
}

/* ---------- the board on the stage ---------- */
function _ctPaint() {
  const box = typeof _gw !== 'undefined' ? _gw.box : null; if (!box || !box.isConnected) return;
  const r = _ctRound();
  let el = box.querySelector(':scope > .gll-ct');
  if (!r) { if (el) el.remove(); _ct.sig = ''; return; }
  const host = _cth.r === r, rows = r.l || [], me = _ctMe(), phase = r.done ? 'done' : r.over ? 'over' : 'on';
  const sig = [r.id, phase, r.win, host ? _cth.confirm : 0, rows.map(x => x.join(':')).join(','), [...(_gll.actors.keys())].join(',')].join('|');
  if (!el) { el = document.createElement('aside'); el.className = 'gll-ct'; el.setAttribute('role', 'group'); box.appendChild(el); _ct.sig = ''; }
  if (_ct.sig !== sig || !el.firstChild) {
    _ct.sig = sig;
    el.textContent = ''; el.setAttribute('aria-label', _CT_NAME[r.kind] || 'Contest'); el.classList.toggle('is-over', phase !== 'on');
    const h = _gsvEl('div', 'gll-ct-h');
    h.appendChild(_ctIcon(r.kind));
    h.appendChild(_gsvEl('b', 'gll-ct-title', _CT_NAME[r.kind] || 'Contest'));
    h.appendChild(_gsvEl('span', 'gll-ct-t', ''));
    if (host && phase === 'on') {
      const b = _gsvBtn(_cth.confirm ? 'Really end?' : 'End', { kind: 'btn-ghost', cls: 'gll-ct-end', tip: 'End the contest now: nobody wins', run: () => { if (_cth.confirm) { _cth.confirm = 0; gardenContestEnd(); } else { _cth.confirm = 1; _ct.sig = ''; _ctPaint(); setTimeout(() => { if (_cth.confirm) { _cth.confirm = 0; _ct.sig = ''; _ctPaint(); } }, 3000); } } });
      h.appendChild(b);
    }
    el.appendChild(h);
    const bar = _gsvEl('div', 'gll-ct-bar'); bar.appendChild(document.createElement('i')); el.appendChild(bar);
    const ol = _gsvEl('ol', 'gll-ct-l');
    const top = rows.length ? rows[0][1] : 0;
    rows.forEach((x, i) => {
      const li = _gsvEl('li', 'gll-ct-row' + (x[0] === me ? ' is-me' : '') + (phase === 'done' && r.win === x[0] ? ' is-win' : ''));
      if (x[0] === me) li.setAttribute('aria-current', 'true');
      li.appendChild(_gsvEl('span', 'gll-ct-rank', phase === 'done' && r.win === x[0] ? '🏆' : String(i + 1)));
      li.appendChild(_gsvEl('span', 'gll-ct-name', _ctFirst(x[0])));
      const pts = _gsvEl('b', 'gll-ct-pts', String(x[1])); pts.title = x[2] + (x[2] === 1 ? ' catch' : ' catches');
      li.appendChild(pts);
      li.style.setProperty('--ct-w', top > 0 ? Math.round(100 * x[1] / top) + '%' : '0%');
      ol.appendChild(li);
    });
    if (!rows.length) ol.appendChild(_gsvEl('li', 'gll-ct-row muted', 'Waiting for the first catch'));
    el.appendChild(ol);
    const w = _gsvEl('div', 'gll-ct-w'); w.setAttribute('aria-live', 'polite');
    if (phase === 'over') w.textContent = 'Time! Counting the last catches…';
    else if (phase === 'done') {
      w.textContent = r.win == null ? 'Nobody caught anything this time.' : r.win === me ? 'You win!' : `${_ctFirst(r.win)} wins!`;
      if (r.paid) w.textContent += ` +${r.paid.c} coin${r.paid.c === 1 ? '' : 's'}`;
    }
    el.appendChild(w);
  }
  // the clock and the bar, every tick (only when they change)
  const left = r.done || r.over ? 0 : _ctSecs(r), t = el.querySelector('.gll-ct-t'), txt = phase === 'on' ? Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0') : (phase === 'over' ? '0:00' : 'Done');
  if (t && t.textContent !== txt) t.textContent = txt;
  const i = el.querySelector('.gll-ct-bar > i'), pct = phase === 'on' ? Math.max(0, Math.min(100, Math.round(100 * left / Math.max(1, r.tt)))) : 0;
  if (i && i.dataset.p !== String(pct)) { i.dataset.p = String(pct); i.style.width = pct + '%'; }
}
function _ctIcon(kind) {
  const s = _gsvEl('span', 'gll-ct-ic'); s.setAttribute('aria-hidden', 'true');
  s.innerHTML = icon(kind === 'bug' ? 'bug' : 'fish');   // (our own icon set, never friend text)
  return s;
}

/* ---------- the host's Start button (beside the gate's) ---------- */
function gardenContestHostBtn(hud) {
  if (!_glh.on || !_glhAnyone() || (_cth.r && !_cth.r.done)) return;
  const left = gardenContestLeft();
  hud.appendChild(_gsvBtn('', { icon: 'trophy', cls: 'gll-gate-b gll-ct-b', kind: 'btn-secondary', tip: left ? 'Start a contest' : 'No more contests today', aria: 'Start a contest', run: (e, btn) => _cthMenu(btn) }));
}
function _cthMenu(anchor) {
  let len = GL_CT.len;
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gll-menu', 'gll-ct-menu');
    el.appendChild(_gsvEl('b', null, 'Start a contest'));
    el.appendChild(_gsvEl('p', 'muted gsv-small', 'Everyone in your garden competes for the most points. What is caught is let go again, so it costs nothing.'));
    const seg = _gsvEl('div', 'gll-switch');
    const paint = () => { seg.textContent = ''; for (const s of GL_CT.lens) { const b = _gsvEl('button', 'gll-seg' + (s === len ? ' is-on' : ''), _CT_LEN_NAME(s)); b.type = 'button'; b.setAttribute('aria-pressed', s === len ? 'true' : 'false'); b.onclick = () => { len = s; paint(); }; seg.appendChild(b); } };
    paint(); el.appendChild(seg);
    const row = _gsvEl('div', 'gll-menu-row');
    const go = (kind, label, ic) => row.appendChild(_gsvBtn(label, { icon: ic, kind: 'btn-secondary', run: () => { const r = gardenContestStart(kind, len); close(); if (!r.ok && typeof toast === 'function') toast(r.msg, { icon: 'trophy' }); } }));
    go('fish', 'Fishing', 'fish'); go('bug', 'Bug-netting', 'bug');
    el.appendChild(row);
    const left = gardenContestLeft();
    el.appendChild(_gsvEl('p', 'muted gsv-small', left ? `${left} left today.` : 'That is all the contests for today.'));
  }, { align: 'center' });
}
