/* ============================================================
   TRADING (docs/dev/GARDEN_TOGETHER.md section 16). Two people in one live garden, the host and a guest or two guests, offer things from their bags face to face. Both see both offers.
   Nothing moves until BOTH have confirmed the same terms, and then it moves once, whatever happens to a connection in between.

   THE HOST'S PAGE IS THE REFEREE. It keeps each open trade (who, both offers, who has confirmed, a version that goes up with every change), tells each of the two their own view (gl:tr st),
   and decides exactly once: both confirmed the current version -> GO. It writes the decision (`gl.t.<id>` in the ledger, and a durable post to each guest) in the same save as its own side,
   and only then says go. A guest never learns another guest's friend id: they speak to the host in slot numbers and the host answers each one.

   HOLD, THEN SWAP. When you confirm, what you offer leaves your bag at once into a hold (`gl.x.<id>` in your ledger: the items, minus; and what you were shown they offer, `get`). A hold is
   released only by the referee: a state that says your confirmation is not in force (it has seen your last message: `an` >= the hold's `sq`, or the version has moved on), or `x`. On `go` the
   hold becomes the swap in one entry (what you gave minus, what you get plus): nothing is in flight, so nothing can be duplicated or lost on the way. A hold never times out by itself:
   the referee may have decided to go while you were away. It asks (chk, and the decision is also posted: gl:post why trade) until it hears; an id the host has no record of was never decided
   (the record is written before anything is sent), so that answer is x.

     gardenLiveTradeOpen(A)       the person menus: trade with this person (A is their figure)
     gardenLiveTradePost(p)       a decision posted to you (go or x), for a trade you held things for (94-garden-live-1core.js hands it over)
     _gltHostOn(ev) / _gltHostStart() / _gltHostStop() / _gltHostLeft(w, f)   the referee (94-garden-live-3host.js)
     _gltFromHost(ev) / _gltResume() / _gltLost()                             a guest (94-garden-live-2visit.js)
   ============================================================ */
const _glt = { trades: new Map(), mine: null, panel: false, q: [], pumping: false, sweepT: 0, chkT: 0, keepT: 0, offerT: 0 };
const _gltHoldKey = (t) => 'gl.x.' + t;   // my hold, then my swap
const _gltRecKey = (t) => 'gl.t.' + t;    // the host's record of its decision
function _gltReady() { return typeof gardenReady === 'function' && gardenReady() && !!gardenEnsure(); }
function _gltLive() { return _gll.role === 'host' ? !!_glh.on : _gll.role === 'visit' ? _glvLive() : false; }
function _gltCanon(rows) { return (rows || []).map(r => [String(r[0]), r[1] | 0]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)); }
function _gltSplit(item) { const i = item.indexOf(':'); return [item.slice(0, i), item.slice(i + 1)]; }
function _gltItemName(item) { const [k, id] = _gltSplit(item); return _gscItemName(k, id); }
function _gltSum(rows) {
  const parts = (rows || []).map(([item, n]) => (n > 1 ? n + ' × ' + _gltItemName(item) : _gscA(_gltItemName(item))));
  return !parts.length ? 'nothing' : parts.length === 1 ? parts[0] : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}
function _gltHave(item) { return typeof gardenHas === 'function' ? gardenHas(item) : 0; }
function _gltHoldOf(t) { const e = _gdG().led[_gltHoldKey(t)]; return e && e.t === 'trade' ? e : null; }
function _gltOpenHolds() { return Object.entries(_gdG().led).filter(([k, e]) => k.startsWith('gl.x.') && e && e.t === 'trade' && !e.ok); }
/** Trades you have confirmed or finished today: what your own daily limit counts (the host counts the same for you from its record). */
function _gltMineToday() { const d = _gllToday(); let n = 0; for (const [k, e] of Object.entries(_gdG().led)) if (k.startsWith('gl.x.') && e && e.d === d) n++; return n; }
/** Trades the host's record shows this person finished today (the host's own friend id is 'host'). */
function _gltDoneToday(f) { const d = _gllToday(); let n = 0; for (const [k, e] of Object.entries(_gdG().led)) if (k.startsWith('gl.t.') && e && e.st === 'go' && e.d === d && (e.pa === f || e.pb === f)) n++; return n; }

/* ---------- my wallet: hold, swap, release ---------- */
/** Release a hold: what you put on it is in your bag again. Never one that has been swapped. True when something came back. */
function _gltRelease(t) {
  const g = _gdG(), h = g.led[_gltHoldKey(t)];
  if (!h || h.t !== 'trade' || h.ok) return false;
  delete g.led[_gltHoldKey(t)];
  _gscSaveGarden();
  return true;
}
/** The referee said go: the hold becomes the swap, once (the entry says it is done). True the first time. */
function _gltSettle(t) {
  const g = _gdG(), h = g.led[_gltHoldKey(t)];
  if (!h || h.t !== 'trade' || h.ok || glTradeRowsOk(h.get)) return false;
  const net = Object.assign({}, h.i);
  for (const [item, n] of h.get) net[item] = (net[item] || 0) + n;
  const gave = Object.entries(h.i || {}).map(([item, n]) => [item, -n]), got = h.get.map(r => [r[0], r[1]]);
  h.i = net; h.ok = 1; h.sat = _gdNow();
  for (const [item] of got) {
    const [k, id] = _gltSplit(item), today = _gllToday();
    if (k === 'decor' && !g.disc[id]) g.disc[id] = today;
    if ((k === 'fish' || k === 'bug') && typeof gardenCatchReceived === 'function') gardenCatchReceived(k, id);
  }
  _gscSaveGarden();
  const M = _glt.mine, who = M && M.t === t && M.name ? ' with ' + M.name : '';
  const line = `You traded ${_gltSum(gave)} for ${_gltSum(got)}${who}.`;
  if (typeof _gllFeed === 'function' && typeof _gw !== 'undefined' && _gw.box) _gllFeed(line); else if (typeof toast === 'function') gardenToast(line, { icon: 'repeat', kind: 'ok' });
  if (typeof gameCheer === 'function') gameCheer(null, { text: '🤝', tone: 'gold' });
  return true;
}

/* ---------- what is said to the page: a decision, however it came ---------- */
function _gltOnGo(t) {
  const did = _gltSettle(t);
  const M = _glt.mine;
  if (M && M.t === t && !M.done) { M.done = true; M.end = null; M.c = true; _gltPaint(); setTimeout(() => { if (_glt.mine === M) _gltClearMine(); }, 3200); }
  return did;
}
function _gltOnX(t, why) {
  const back = _gltRelease(t);
  const M = _glt.mine;
  if (M && M.t === t && !M.done) { M.end = { why: why || 'cancel', back, me: !!M.ending }; _gltPaint(); }
  else if (back && typeof toast === 'function') gardenToast('The trade did not happen. What you had put on hold is back in your bag.', { icon: 'undo-2' });
}
/** A state for me: the whole picture of my trade. */
function _gltOnSt(ev) {
  let M = _glt.mine, hello = false;
  if (M && M.t !== ev.t) {
    // two requests crossed (we each asked the other): the referee kept one, and so do we
    if (!M.r && !M.seen && M.w === ev.to) { M.t = ev.t; hello = true; }
    else { _gltSend({ t: ev.t, e: 'end' }); return; }
  }
  if (!M) {
    if (!_gltLive()) return;
    const A = _gll.actors.get(ev.to) || (ev.to === 0 ? { n: _gllMyName() } : null);
    M = _glt.mine = { t: ev.t, w: ev.to, name: A ? A.n : 'A friend', incoming: true, r: false, o: [], p: [], c: false, d: false, v: 0, n: 0, an: 0 };
    hello = true;
    _gltKeep();
    const feed = `${M.name} wants to trade`;
    if (typeof _gllFeed === 'function') _gllFeed(feed);
  }
  M.seen = true;
  if (M.end && M.end.why === 'lost') M.end = null;   // (back in the garden, and the referee still has this trade)
  const synced = !_glt.offerT && ev.an >= M.n;
  Object.assign(M, { w: ev.to, v: ev.v, p: ev.p.map(r => [r[0], r[1]]), c: ev.c, d: ev.d, r: ev.r, an: ev.an });
  if (synced) M.o = ev.o.map(r => [r[0], r[1]]);
  // a hold goes only when the referee has seen my last word and my confirmation is not in force, or the terms have moved on
  const h = _gltHoldOf(M.t);
  if (h && !h.ok && !(ev.c && h.v === ev.v) && (ev.v > h.v || ev.an >= h.sq)) {
    if (_gltRelease(M.t)) M.note = ev.v > h.v ? `${M.name} changed the offer, so your confirmation is off. Have a look and confirm again.` : 'Your confirmation is off. What you offered is back in your bag.';
  }
  _gltPaint();
  if (hello && _gll.role !== 'host') _gltSend({ t: M.t, e: 'hi' });   // (last: the referee's answer to it can arrive inside this call, and must find this state already in place)
}
/** What guests hear from the host. Checked against the same tables as at the server, then the page. */
function _gltFromHost(ev) {
  const why = glTradeOk(ev, true);
  if (why) { if ((why === 'item' || why === 'rows') && ev.t && ev.e === 'st') { gardenToast(`${(_glt.mine && _glt.mine.name) || 'They'} offered something your Freeflo does not know yet. Update Freeflo to trade.`, { icon: 'repeat' }); _gltSend({ t: ev.t, e: 'end' }); } return; }
  if (ev.e === 'st') _gltOnSt(ev); else if (ev.e === 'go') _gltOnGo(ev.t); else _gltOnX(ev.t, ev.why);
}
/** A decision posted to me (94-garden-live-1core.js): only the host I hold things with may make it. */
function gardenLiveTradePost(p) {
  const h = _gltHoldOf(p.i);
  if (!h || h.to !== p.f) return;
  if (p.d === 'go') _gltOnGo(p.i); else _gltOnX(p.i, 'cancel');
}

/* ---------- the guest's link ---------- */
/** One at a time and in order: a trade is a conversation (offer, then confirm), and requests from one page can overtake each other. */
function _gltSend(body) {
  if (_gll.role === 'host') { _gltCoord(0, body); return; }
  if (!_glvLive()) return;
  _glt.q.push(body); _gltPump();
}
function _gltPump() {
  if (_glt.pumping || !_glt.q.length) return;
  _glt.pumping = true;
  const b = _glt.q.shift();
  Promise.resolve(glTradeOk(b, false) ? null : _glvSend('tr', b)).finally(() => { _glt.pumping = false; _gltPump(); });
}
/** A guest is live in the garden (again): ask what became of anything held for this host. The referee answers from its record (go, or x for an id it never decided). Until it answers, nothing is released. */
function _gltResume() {
  clearInterval(_glt.chkT); _glt.chkT = 0;
  const mineHere = () => _gltOpenHolds().filter(([, h]) => h.to === _glv.fid);
  if (!mineHere().length) return;
  const ask = () => { if (!_glvLive()) return; const hs = mineHere(); if (!hs.length) { clearInterval(_glt.chkT); _glt.chkT = 0; return; } for (const [k] of hs.slice(0, 6)) _gltSend({ t: k.slice(5), e: 'chk' }); };
  setTimeout(ask, 1500); _glt.chkT = setInterval(ask, 20000);
}
function _gltLost() {
  clearInterval(_glt.chkT); _glt.chkT = 0; _glt.q.length = 0;
  const M = _glt.mine;
  if (M && !M.done && !M.end) { M.end = { why: 'lost', held: !!_gltHoldOf(M.t) }; _gltPaint(); }
}

/* ============================================================
   THE REFEREE (the host's page)
   T: {t, a, b (slots), fa, fb (friend ids; 'host' for the host), oa, ob (offers), ca, cb (confirmed), v (version: up with every offer), an {slot: highest n seen},
       open (the other app said hi), any (someone has confirmed: a record and posts exist), at (last word), born}
   ============================================================ */
function _gltWho(w) {
  if (w === 0) return { w: 0, f: 'host', n: _gllMyName(), lv: 'play' };
  const A = _gll.actors.get(w);
  return A && A.f ? { w, f: A.f, n: A.n, lv: A.lv } : null;
}
function _gltSt(T, w) {
  const first = w === T.a;
  return { t: T.t, e: 'st', to: first ? T.b : T.a, v: T.v, o: first ? T.oa : T.ob, p: first ? T.ob : T.oa, c: first ? T.ca : T.cb, d: first ? T.cb : T.ca, r: T.open, an: T.an[w] || 0 };
}
function _gltDeliver(w, body) {
  if (w === 0) { _gltOnHostSays(body); return; }
  const A = _gll.actors.get(w);
  if (A && A.f) _glhSend(A.f, 'tr', body);
}
/** The host's own seat at the table hears the referee the way a guest does (without the wire). */
function _gltOnHostSays(body) { if (body.e === 'st') _gltOnSt(body); else if (body.e === 'go') _gltOnGo(body.t); else _gltOnX(body.t, body.why); }
function _gltTell(T) { for (const w of [T.a, T.b]) _gltDeliver(w, _gltSt(T, w)); }
function _gltHostOn(ev) {
  const A = _gll.actors.get(ev.w);
  if (!A || glTradeOk(ev, false)) return;   // (the server checked these tables too; the page checks them again, as for every intent)
  if (ev.lv) A.lv = ev.lv;
  _gltCoord(ev.w, ev);
}
/** Someone's word about a trade, from slot `from` (0 is the host's own seat). */
function _gltCoord(from, b) {
  if (!_glh.on || !_gltReady()) return;   // (no answer at all while the garden is not loaded: an answer of x would be a guess)
  if (b.e === 'ask') { _gltAsk(from, b); return; }
  if (b.e === 'chk') { _gltChk(from, b.t); return; }
  const T = _glt.trades.get(b.t);
  if (!T || (T.a !== from && T.b !== from)) { if (b.e !== 'hi') _gltChk(from, b.t); return; }   // not open (any more): what became of it?
  T.at = Date.now();   // clock-ok: when it was last touched
  if (b.e === 'hi') { if (from === T.b && !T.open) { T.open = true; _gltTell(T); } return; }
  if (b.e === 'end') { _gltAbort(T, 'cancel'); return; }
  if (b.n > (T.an[from] || 0)) T.an[from] = b.n;
  if (b.e === 'offer') {
    if (from === T.a) T.oa = _gltCanon(b.o); else T.ob = _gltCanon(b.o);
    T.v++; T.ca = false; T.cb = false;
    _gltTell(T);
  } else if (b.e === 'ok') {
    if (b.v !== T.v || !T.open || !T.oa.length || !T.ob.length) { _gltTell(T); return; }   // (stale: they will release their hold when they see this)
    if (from === T.a) T.ca = true; else T.cb = true;
    T.any = true; _gltRecOpen(T);
    if (T.ca && T.cb) _gltDecide(T); else _gltTell(T);
  } else if (b.e === 'no') {
    if (from === T.a) T.ca = false; else T.cb = false;
    _gltTell(T);
  }
}
function _gltAsk(from, b) {
  const A = _gltWho(from), B = _gltWho(b.to), no = (why) => _gltDeliver(from, { t: b.t, e: 'x', why });
  if (!A || !B || from === b.to) { no('gone'); return; }
  if (_glt.trades.has(b.t)) return;
  if (!glAtLeast(A.lv, GL_TRADE.lv) || !glAtLeast(B.lv, GL_TRADE.lv)) { no('level'); return; }
  const busy = [..._glt.trades.values()].find(X => [X.a, X.b].some(w => w === from || w === b.to));
  if (busy) { if ((busy.a === from && busy.b === b.to) || (busy.a === b.to && busy.b === from)) _gltDeliver(from, _gltSt(busy, from)); else no('busy'); return; }
  if (_gltDoneToday(A.f) >= GL_TRADE.perDay || _gltDoneToday(B.f) >= GL_TRADE.perDay) { no('cap'); return; }
  const now = Date.now();   // clock-ok: when it was asked
  const T = { t: b.t, a: from, b: b.to, fa: A.f, fb: B.f, oa: [], ob: [], ca: false, cb: false, v: 1, an: {}, open: b.to === 0, any: false, at: now, born: now };
  _glt.trades.set(T.t, T);
  if (!_glt.sweepT) _glt.sweepT = setInterval(_gltSweep, 5000);
  _gltTell(T);
}
/** The first confirmation writes the open record: if this page goes away, the next start knows who may be holding things and tells them. (The host's own hold is written with it.) */
function _gltRecOpen(T) {
  const g = _gdG(), k = _gltRecKey(T.t);
  if (g.led[k]) return;
  g.led[k] = { d: _gllToday(), k: 'gl', n: 0, st: 'open', pa: T.fa, pb: T.fb, at: _gdNow() };
  _gscSaveGarden();
}
/** Both confirmed this version. The decision, my own side of it, and what tells the guests are written in ONE save; only then is anyone told. */
function _gltDecide(T) {
  const A = _gltWho(T.a), B = _gltWho(T.b);
  if (!A || !B) { _gltAbort(T, 'left'); return; }
  if (!glAtLeast(A.lv, GL_TRADE.lv) || !glAtLeast(B.lv, GL_TRADE.lv)) { _gltAbort(T, 'level'); return; }
  if (_gltDoneToday(T.fa) >= GL_TRADE.perDay || _gltDoneToday(T.fb) >= GL_TRADE.perDay) { _gltAbort(T, 'cap'); return; }
  const g = _gdG(), today = _gllToday(), at = _gdNow();
  g.led[_gltRecKey(T.t)] = { d: today, k: 'gl', n: 0, st: 'go', pa: T.fa, pb: T.fb, v: T.v, at };
  for (const [w, f, side] of [[T.a, T.fa, 'a'], [T.b, T.fb, 'b']]) if (w !== 0) g.gq['t' + T.t + side + 'g'] = { to: f, why: 'trade', i: T.t, d: 'go', at };
  const guests = [[T.a, T.fa], [T.b, T.fb]].filter(x => x[0] !== 0).map(x => x[1]);
  g.gl['t.' + T.t] = { f: guests[0] || '', f2: guests[1] || '', t: 'trade', d: today, at, noUndo: true };
  _glhPrune();
  _glt.trades.delete(T.t);
  if (T.a === 0 || T.b === 0) _gltSettle(T.t); else _gdSave();   // (the host's side is part of this save)
  for (const w of [T.a, T.b]) _gltDeliver(w, { t: T.t, e: 'go', v: T.v });
  _glhFlushPosts();
  _glhHud();
}
/** It did not happen. Everyone is told; whoever may be holding things (anyone who has confirmed) is told by post as well, in case they are not here to hear it. */
function _gltAbort(T, why) {
  if (!_glt.trades.delete(T.t)) return;
  if (T.any) {
    const g = _gdG(), rec = g.led[_gltRecKey(T.t)];
    if (rec && rec.st === 'open') rec.st = 'x';
    for (const [w, f, side] of [[T.a, T.fa, 'a'], [T.b, T.fb, 'b']]) if (w !== 0) g.gq['t' + T.t + side + 'x'] = { to: f, why: 'trade', i: T.t, d: 'x', at: _gdNow() };
    _gdSave();
  }
  for (const w of [T.a, T.b]) _gltDeliver(w, { t: T.t, e: 'x', why });
  if (T.any) _glhFlushPosts();
}
/** What became of this trade, for someone who asks (or whose word came for a trade that is not open): open -> its state; decided go -> go; anything else was never decided -> x. */
function _gltChk(from, t) {
  const T = _glt.trades.get(t), W = _gltWho(from);
  if (!W) return;
  if (T && (T.a === from || T.b === from)) { _gltDeliver(from, _gltSt(T, from)); return; }
  const rec = _gdG().led[_gltRecKey(t)];
  if (rec && rec.st === 'go' && (rec.pa === W.f || rec.pb === W.f)) _gltDeliver(from, { t, e: 'go', v: rec.v || 0 });
  else _gltDeliver(from, { t, e: 'x', why: 'gone' });
}
function _gltHostLeft(w) { for (const T of [..._glt.trades.values()]) if (T.a === w || T.b === w) _gltAbort(T, 'left'); }
function _gltSweep() {
  const now = Date.now();   // clock-ok: how long it has been quiet
  for (const T of [..._glt.trades.values()]) {
    if (!T.open && now - T.born > GL_TRADE.askMs) _gltAbort(T, 'old');
    else if (now - T.at > GL_TRADE.idleMs) _gltAbort(T, 'idle');
  }
  if (!_glt.trades.size) { clearInterval(_glt.sweepT); _glt.sweepT = 0; }
}
/** This page hosts: whatever a page that went away left open is called off (the record was written before anything was sent), and whatever I held myself comes back or lands. */
function _gltHostStart() {
  if (!_gltReady()) { setTimeout(() => { if (_glh.on) _gltHostStart(); }, 2000); return; }
  const g = _gdG(); let changed = false;
  for (const [k, e] of Object.entries(g.led)) {
    if (!k.startsWith('gl.t.') || !e || e.st !== 'open') continue;
    const t = k.slice(5);
    e.st = 'x'; changed = true;
    for (const [f, side] of [[e.pa, 'a'], [e.pb, 'b']]) if (f && f !== 'host') g.gq['t' + t + side + 'x'] = { to: f, why: 'trade', i: t, d: 'x', at: _gdNow() };
  }
  for (const [k, h] of Object.entries(g.led)) {
    if (!k.startsWith('gl.x.') || !h || h.t !== 'trade' || h.ok || h.to !== 'self') continue;
    const rec = g.led[_gltRecKey(k.slice(5))];
    if (rec && rec.st === 'go') _gltSettle(k.slice(5)); else { delete g.led[k]; changed = true; }
  }
  if (changed) { _gdSave(); _glhFlushPosts(); }
}
function _gltHostStop() {
  for (const T of [..._glt.trades.values()]) _gltAbort(T, 'host');
  clearInterval(_glt.sweepT); _glt.sweepT = 0;
  const M = _glt.mine; if (M && _gll.role === 'host') _gltClearMine();
}

/* ============================================================
   MY SEAT AT THE TABLE (host or guest): the panel
   M: {t, w (their slot), name, incoming, r (they can trade), o (mine), p (theirs), c (I confirmed), d (they did), v, n (my counter), an (the referee has seen up to), note, end, done}
   ============================================================ */
function gardenLiveTradeOpen(A) {
  if (!A || !_gltLive()) return;
  const M = _glt.mine;
  if (M) { if (M.w === A.w && !M.end) { _glt.panel = true; _gltPaint(); } else if (typeof toast === 'function') gardenToast(M.end || M.done ? 'Close the other trade first.' : `Finish your trade with ${M.name} first.`, { icon: 'repeat' }); return; }
  if (!glAtLeast(A.lv, GL_TRADE.lv)) { if (typeof toast === 'function') gardenToast(`${A.n} can only look or help here, so they cannot trade yet.`, { icon: 'repeat' }); return; }
  if (_gltMineToday() >= GL_TRADE.perDay) { if (typeof toast === 'function') gardenToast('That is all the trades for today.', { icon: 'repeat' }); return; }
  const t = _gllNewId();
  _glt.mine = { t, w: A.w, name: A.n, incoming: false, r: false, o: [], p: [], c: false, d: false, v: 0, n: 0, an: 0, asked: Date.now() };   // clock-ok: how long we have waited
  _glt.panel = true;
  _gltKeep();
  _gltPaint();
  _gltSend({ t, e: 'ask', to: A.w });
}
/** The page keeps the panel on the stage while a trade is open (a repaint of the garden makes a new stage), and calls off a request nobody answered. */
function _gltKeep() {
  if (_glt.keepT) return;
  _glt.keepT = setInterval(() => {
    const M = _glt.mine;
    if (!M) { clearInterval(_glt.keepT); _glt.keepT = 0; return; }
    if (!M.r && !M.end && !M.done && !M.incoming && Date.now() - M.asked > GL_TRADE.askMs + 3000) { M.end = { why: 'old' }; _gltPaint(); return; }   // clock-ok: how long we have waited
    if (!_gltLive() && !M.end && !M.done) { _gltLost(); return; }
    const box = typeof _gw !== 'undefined' ? _gw.box : null;
    if (box && box.isConnected && !box.querySelector(':scope > .gll-trade-wrap')) _gltPaint();   // (a repaint of the garden made a new stage)
  }, 1500);
}
function _gltClearMine() { clearTimeout(_glt.offerT); _glt.offerT = 0; _glt.mine = null; _glt.panel = false; _gltPaint(); }
/** The trade is over for this seat: the panel says so, and closing it clears the seat. */
function _gltClose() {
  const M = _glt.mine; if (!M) return;
  if (M.end || M.done) { _gltClearMine(); return; }
  _glt.panel = false; _gltPaint();
}
function _gltCancel() {
  const M = _glt.mine; if (!M) return;
  if (M.end || M.done) { _gltClearMine(); return; }
  M.ending = true; M.note = 'Calling it off…';
  _gltSend({ t: M.t, e: 'end' });
  _gltPaint();
  setTimeout(() => { if (_glt.mine === M && M.ending && !M.done) { M.end = { why: 'cancel', me: true }; _gltPaint(); } }, 4000);
}
function _gltEdit(fn) {
  const M = _glt.mine; if (!M || M.c || M.end || M.done) return;
  const rows = fn(M.o.map(r => [r[0], r[1]])); if (!rows) return;
  M.o = _gltCanon(rows); M.note = '';
  clearTimeout(_glt.offerT);
  _glt.offerT = setTimeout(() => { _glt.offerT = 0; const m = _glt.mine; if (!m || m.c || m.end) return; m.n++; _gltSend({ t: m.t, e: 'offer', n: m.n, o: m.o }); _gltPaint(); }, 220);
  _gltPaint();
}
const _gltSynced = (M) => !_glt.offerT && M.an >= M.n;
/** Why you cannot confirm yet, or ''. The bag is checked here, on your own computer: it is the only place that knows. */
function _gltWhyNot(M) {
  if (!M.r) return 'Waiting for them to say they can trade.';
  if (!M.o.length || !M.p.length) return 'You each need to offer something.';
  if (!_gltSynced(M)) return 'One moment…';
  if (_gltMineToday() >= GL_TRADE.perDay) return 'That is all the trades for today.';
  if (_gltHoldOf(M.t)) return 'One moment…';
  for (const [item, n] of M.o) if (_gltHave(item) < n) return `You do not have ${n > 1 ? n + ' ' : 'any '}${_gltItemName(item)}${_gltHave(item) > 0 ? ' (you have ' + _gltHave(item) + ')' : ''}.`;
  return '';
}
function _gltConfirm() {
  const M = _glt.mine; if (!M || M.c || M.end || M.done) return;
  const why = _gltWhyNot(M);
  if (why) { if (typeof toast === 'function') gardenToast(why, { icon: 'repeat' }); return; }
  if (!_gltReady()) return;
  // the hold first (your things leave your bag now, and are saved), then the word
  const g = _gdG(), i = {};
  for (const [item, n] of M.o) i[item] = -n;
  M.n++;
  g.led[_gltHoldKey(M.t)] = { d: _gllToday(), k: 'gl', n: 0, i, t: 'trade', to: _gll.role === 'host' ? 'self' : _glv.fid, v: M.v, sq: M.n, get: M.p.map(r => [r[0], r[1]]), at: _gdNow() };
  if (_gll.role === 'host') { const T = _glt.trades.get(M.t); if (T) { T.any = true; _gltRecOpen(T); } }
  _gscSaveGarden();
  M.c = true; M.note = '';
  _gltSend({ t: M.t, e: 'ok', v: M.v, n: M.n });
  _gltPaint();
}
function _gltUnconfirm() {
  const M = _glt.mine; if (!M || !M.c || M.end || M.done) return;
  M.n++;
  const h = _gltHoldOf(M.t); if (h) { h.sq = M.n; _gscSaveGarden(); }
  M.note = 'Taking it back…';
  _gltSend({ t: M.t, e: 'no', n: M.n });
  _gltPaint();
}

/* ---------- the panel ---------- */
const _GLT_ENDS = {
  busy: (n) => `${n} is in another trade just now.`, gone: () => 'That trade is over.', level: () => 'You both need Play to trade here.', cap: () => 'That is all the trades for today.',
  left: (n) => `${n} left the garden.`, cancel: (n, e) => (e.me ? 'You called the trade off.' : `${n} called the trade off.`), idle: () => 'Nobody did anything for a while, so the trade was called off.',
  old: (n) => `${n} did not answer. Their Freeflo may be older and cannot trade yet.`, item: () => 'One of those things is not known to both Freeflos. Update Freeflo to trade it.',
  host: () => 'The garden\'s host left.', lost: (n, e) => (e.held ? 'The connection dropped. What you put on hold comes back, or the swap finishes, as soon as the host\'s computer says which.' : 'The connection dropped.'),
};
function _gltStatus(M) {
  if (M.done) return 'Traded!';
  if (M.end) return (_GLT_ENDS[M.end.why] || _GLT_ENDS.gone)(M.name, M.end) + (M.end.back ? ' Everything you had put forward is back in your bag.' : '');
  if (M.note) return M.note;
  if (!M.r) return M.incoming ? 'Connecting…' : `Asking ${M.name}…`;
  if (M.c) return `Waiting for ${M.name} to confirm.`;
  if (M.d) return `${M.name} has confirmed. Look it over, then confirm if you are happy.`;
  return 'Choose what each of you gives. Nothing moves until you both confirm.';
}
function _gltIcon(item, px) {
  const [k, id] = _gltSplit(item), s = _gsvEl('span', 'gll-trade-ic');
  try {
    if (k === 'fish' || k === 'bug') { const m = k === 'fish' ? /^([a-z0-9-]+)-([0-3])$/.exec(id) : null; s.innerHTML = gardenCatchSvg(k, m ? m[1] : id, px, { uid: 'tr' + k + id }); }
    else s.innerHTML = gardenIconSvg(id, { kind: k === 'seed' ? 'seed' : 'decor', px });   // (drawings from the catalogue, for ids that passed the tables)
  } catch (e) { /* no picture */ }
  return s;
}
/** A button with a name the panel can find again after it is repainted (so the keyboard stays where it was). */
function _gltBtn(key, label, o) { const b = _gsvBtn(label, o); b.setAttribute('data-k', key); return b; }
function _gltCol(M, mine) {
  const col = _gsvEl('section', 'gll-trade-col' + (mine ? ' is-mine' : ''));
  const rows = mine ? M.o : M.p, can = mine && !M.c && !M.end && !M.done && M.r;
  const head = _gsvEl('div', 'gll-trade-ch');
  head.appendChild(_gsvEl('b', null, mine ? 'You give' : `${M.name} gives`));
  if (mine ? M.c : M.d) head.appendChild(_gsvEl('span', 'gll-trade-ok', 'Confirmed'));
  col.appendChild(head);
  const ul = _gsvEl('ul', 'gll-trade-rows');
  for (const [item, n] of rows) {
    const li = _gsvEl('li', 'gll-trade-row' + (can ? ' is-edit' : ''));
    li.appendChild(_gltIcon(item, 30));
    li.appendChild(_gsvEl('span', 'gll-trade-nm', _gltItemName(item)));
    if (can) {
      const have = _gltHave(item), ctl = _gsvEl('span', 'gll-trade-ctl');
      const st = _gsvEl('span', 'gll-trade-step');
      st.appendChild(_gltBtn('-' + item, '', { icon: 'minus', kind: 'btn-ghost', aria: `One fewer ${_gltItemName(item)}`, run: () => _gltEdit(r => r.map(x => (x[0] === item ? [item, x[1] - 1] : x)).filter(x => x[1] > 0)) }));
      st.appendChild(_gsvEl('span', 'gll-trade-q', '×' + n));
      st.appendChild(_gltBtn('+' + item, '', { icon: 'plus', kind: 'btn-ghost', aria: `One more ${_gltItemName(item)}`, disabled: n >= Math.min(have, GL_TRADE.qty), run: () => _gltEdit(r => r.map(x => (x[0] === item ? [item, Math.min(x[1] + 1, have, GL_TRADE.qty)] : x))) }));
      ctl.appendChild(st);
      ctl.appendChild(_gltBtn('x' + item, '', { icon: 'x', kind: 'btn-ghost', aria: `Take ${_gltItemName(item)} out`, run: () => _gltEdit(r => r.filter(x => x[0] !== item)) }));
      li.appendChild(ctl);
    } else li.appendChild(_gsvEl('span', 'gll-trade-q', '×' + n));
    ul.appendChild(li);
  }
  if (!rows.length) ul.appendChild(_gsvEl('li', 'gll-trade-empty', mine ? 'Nothing yet' : 'Nothing yet'));
  col.appendChild(ul);
  if (can) col.appendChild(_gltBtn('add', 'Add something', { icon: 'plus', kind: 'btn-secondary', run: (e, b) => _gltPicker(b) }));
  return col;
}
/** What you could add: your bag's seeds, decorations, fish and bugs that can be given (the same list gifts use), less what is already in. */
function _gltPicker(anchor) {
  const M = _glt.mine; if (!M) return;
  const list = _gsvGiftables();
  openPopover(anchor, (el, close) => {
    el.classList.add('gsv-pop', 'gsv-gifts');
    el.appendChild(_gsvEl('div', 'pop-label', 'Add to what you give'));
    const box = _gsvEl('div', 'gsv-gift-list'); let any = false;
    for (const k of ['seed', 'decor', 'fish', 'bug']) for (const it of list[k].slice(0, 40)) {
      const item = k + ':' + (k === 'fish' ? it.def.id + '-' + it.q : it.id), inOffer = (M.o.find(r => r[0] === item) || [0, 0])[1];
      if (inOffer >= it.n) continue;
      any = true;
      const b = _gsvEl('button', 'gsv-gift'); b.type = 'button';
      b.appendChild(_gltIcon(item, 34));
      const t = _gsvEl('span', 'gsv-gift-t'); t.appendChild(_gsvEl('b', null, it.def.name + (it.q ? ' ' + gardenQuality(it.q).stars : ''))); t.appendChild(_gsvEl('span', 'muted', k)); b.appendChild(t);
      b.appendChild(_gsvEl('span', 'gsv-gift-n', '×' + (it.n - inOffer)));
      b.onclick = () => {
        close();
        _gltEdit(r => {
          const at = r.find(x => x[0] === item);
          if (at) { at[1] = Math.min(at[1] + 1, it.n, GL_TRADE.qty); return r; }
          if (r.length >= GL_TRADE.rows) { gardenToast(`${GL_TRADE.rows} different things at most.`, { icon: 'repeat' }); return null; }
          r.push([item, 1]); return r;
        });
      };
      box.appendChild(b);
    }
    if (!any) box.appendChild(_gsvEl('p', 'muted gsv-small', 'Nothing more in your bag can be traded.'));
    el.appendChild(box);
  }, { align: 'center', width: 300 });
}
function _gltPanel(M) {
  const p = _gsvEl('aside', 'gll-trade'); p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', `Trade with ${M.name}`);
  const head = _gsvEl('div', 'gll-trade-top');
  head.appendChild(_gsvEl('h3', 'gll-trade-h', `Trade with ${M.name}`));
  head.appendChild(_gltBtn('close', '', { icon: 'x', kind: 'btn-ghost', aria: M.end || M.done ? 'Close' : 'Hide (the trade stays open)', tip: M.end || M.done ? 'Close' : 'Hide: the trade stays open', run: () => _gltClose() }));
  p.appendChild(head);
  const st = _gsvEl('p', 'gll-trade-st' + (M.end ? ' is-end' : M.done ? ' is-done' : ''), _gltStatus(M)); st.setAttribute('role', 'status'); st.setAttribute('aria-live', 'polite');
  p.appendChild(st);
  const cols = _gsvEl('div', 'gll-trade-cols');
  cols.appendChild(_gltCol(M, true)); cols.appendChild(_gltCol(M, false));
  p.appendChild(cols);
  const foot = _gsvEl('div', 'gll-trade-foot');
  if (M.end || M.done) foot.appendChild(_gltBtn('done', 'Close', { kind: 'btn-primary', run: () => _gltClearMine() }));
  else {
    if (M.c) foot.appendChild(_gltBtn('unok', 'Take my confirmation back', { icon: 'undo-2', kind: 'btn-secondary', run: () => _gltUnconfirm() }));
    else { const why = _gltWhyNot(M); foot.appendChild(_gltBtn('ok', 'Confirm trade', { icon: 'handshake', kind: 'btn-primary', disabled: !!why, tip: why || 'Your things go on hold until the trade happens or is called off', run: () => _gltConfirm() })); }
    foot.appendChild(_gltBtn('cancel', 'Cancel trade', { kind: 'btn-ghost', run: () => _gltCancel() }));
  }
  p.appendChild(foot);
  p.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); _gltClose(); } });
  return p;
}
function _gltChip(M) {
  const c = _gsvEl('div', 'gll-trade-chip');
  c.appendChild(_gsvEl('span', null, M.end ? 'The trade ended' : M.done ? 'Traded!' : M.incoming && !M.seenPanel ? `${M.name} wants to trade` : `Trade with ${M.name}`));
  c.appendChild(_gsvBtn(M.incoming && !M.seenPanel ? 'Have a look' : 'Open', { icon: 'repeat', kind: 'btn-ghost', run: () => { M.seenPanel = true; _glt.panel = true; _gltPaint(); } }));
  if (M.incoming && !M.seenPanel && !M.end && !M.done) c.appendChild(_gsvBtn('No thanks', { kind: 'btn-ghost', run: () => _gltCancel() }));
  return c;
}
function _gltPaint() {
  const box = typeof _gw !== 'undefined' ? _gw.box : null, M = _glt.mine;
  const old = box ? box.querySelector(':scope > .gll-trade-wrap') : null;
  if (!M || !box || !box.isConnected) { if (old) old.remove(); return; }
  if (_glt.panel) M.seenPanel = true;
  const keep = old && old.querySelector('.gll-trade') ? old.querySelector('.gll-trade').scrollTop : 0, fk = old && old.contains(document.activeElement) ? document.activeElement.getAttribute('data-k') : null;
  const wrap = _gsvEl('div', 'gll-trade-wrap');
  wrap.appendChild(_glt.panel ? _gltPanel(M) : _gltChip(M));
  if (old) old.replaceWith(wrap); else box.appendChild(wrap);
  const p = wrap.querySelector('.gll-trade'); if (p && keep) p.scrollTop = keep;
  if (fk) { const b = [...wrap.querySelectorAll('[data-k]')].find(x => x.getAttribute('data-k') === fk && !x.disabled); if (b) b.focus({ preventScroll: true }); }   // (the same control, in the repainted panel)
}

/* ---------- a hold that never resolved ---------- */
/** Holds older than three days: the referee never answered. Never undone by itself (the host may have decided to go while you were away); this is the person's own choice. */
function gardenLiveTradeGiveUp(t) { return _gltRelease(t); }
setTimeout(function _gltBoot() {
  try {
    if (typeof gardenReady !== 'function' || !gardenReady() || !state.garden || !state.garden.since) { setTimeout(_gltBoot, 30000); return; }
    const old = _gltOpenHolds().filter(([, h]) => h.at && _gdNow() - h.at > 3 * 86400000).sort((a, b) => a[1].at - b[1].at)[0];
    if (!old) return;
    const [k, h] = old, rows = Object.entries(h.i || {}).map(([item, n]) => [item, -n]);
    gardenToast(`A trade never finished: ${_gltSum(rows)} is still on hold. If their computer is only away, wait: it will finish by itself. If it is gone for good, you can take it back.`, { icon: 'repeat', timeout: 20000, action: { label: 'Take it back', run: () => { if (gardenLiveTradeGiveUp(k.slice(5))) gardenToast('It is back in your bag.', { icon: 'undo-2', kind: 'ok' }); } } });
  } catch (e) { /* the next start */ }
}, 14000);
