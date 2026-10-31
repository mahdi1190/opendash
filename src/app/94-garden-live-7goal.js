/* ============================================================
   SHARED GOALS (2.30, docs/dev/GARDEN_TOGETHER.md section 17). While friends are in a live garden the HOST'S page offers one joint quest at a time: "Catch 6 fish together", "Water 12 plants
   together", "Net 5 bugs together" (GL_GOALS in 94-garden-live-0rules.js is the table). Everyone in the garden sees one small card with a progress bar and who did how much; when it is done there is a
   line in the corner feed and a small thank-you for each person who took part.

   THE HOST OWNS THE GOAL. Its page picks it (from what the garden can really do: no water goal in the rain, no bug goal in winter), counts it, and tells everyone the WHOLE state each time (gl:goal: a
   lost message costs nothing, and someone who comes in half way is told at once). Guests only draw it. What counts is what the host's own page applied or confirmed:
     water   a watering the host applied for a visitor (_glhIntent), or the host's own
     bug     a bug the host named a winner for (_glcBugClaim, or a 'catch' it applied), or the host's own net
     fish    a fish the person says they landed (gl:fx got fish): the one thing the host can only hear about, so it is counted no faster than GL_GOAL.claimMs for each person, only for a fish the
             catalogue knows, and (like everything) never more than a share
   Nobody's part counts for more than GL_GOAL.share of the goal (glGoalCap): it takes two of you, and one dishonest guest cannot finish it alone. Somebody who leaves takes their part off their slot (the next
   person to come in gets that slot): it still counts towards the goal, and neither they nor anyone after them is thanked for it.

   THE REWARD is small and is each person's own: the host says "done" with who took part, and each person's page (the host's too) writes ONE ledger entry on its own computer, `gl.q.<goal id>`, if it saw
   the goal go on, was one of those who took part, has not had that goal, and has had fewer than GL_GOAL.dayMax goals today in any garden. Coins and XP count as in a daily task (the wallet adds the
   entry); a modified app can write itself anything, as it always could, but nobody else's garden, bag or coins are touched.

     gardenLiveGoalPaint(box)      the card, brought up to date (called by the HUD's paint; each block only changes when what it shows has changed)
     gardenLiveGoalsOn() / gardenLiveGoalsSet(on)    the host's switch ("Suggest shared goals", on by default)
     gardenLiveGoalSkip()          the host lets this one go
     _glgCount(w, c, n)            the host counts something somebody did (w is a slot, 0 the host)
   ============================================================ */
const _glg = { cur: null, view: null, seen: new Set(), done: new Set(), lastC: '', endAt: 0, arriveAt: 0, tickT: 0, sendT: 0, sentAt: 0, started: { day: '', n: 0 }, hideT: 0, resendT: [], sig: '' };

/* ---------- the host ---------- */
function gardenLiveGoalsOn() { try { return ((_gdG().prefs || {}).glGoals) !== false; } catch (e) { return true; } }
function gardenLiveGoalsSet(on) {
  const g = _gdG();
  if (on) delete g.prefs.glGoals; else g.prefs.glGoals = false;
  _gdSave();
  if (!on && _glg.cur) _glgEnd(2);
}
function _glgHostStart() {
  _glg.arriveAt = Date.now();   // clock-ok: pacing
  clearInterval(_glg.tickT);
  _glg.tickT = setInterval(_glgHostTick, 2500);
}
function _glgHostStop() {
  clearInterval(_glg.tickT); _glg.tickT = 0;
  clearTimeout(_glg.sendT); _glg.sendT = 0; clearTimeout(_glg.hideT);
  for (const t of _glg.resendT) clearTimeout(t);
  _glg.resendT = []; _glg.cur = null; _glg.view = null;
  gardenLiveGoalPaint();
}
/** Somebody has come in: if a goal is going they are told at once; if they are the first, the next goal waits a little for them to settle. */
function _glgJoin(fid) {
  if (_gll.actors.size <= 1) _glg.arriveAt = Date.now();   // clock-ok: pacing
  if (_glg.cur) _glgSendNow(fid);
}
/** Somebody left: their part stays in the goal, but a slot is handed to the next person who comes in, so the part is no longer on any slot (nobody inherits it or its thanks). */
function _glgLeft(w) {
  const G = _glg.cur; if (!G || G.st !== 0) return;
  G.claimAt.delete(w);
  if (G.by[w]) { delete G.by[w]; _glgShow(false); _glgSendSoon(); }
}
function _glgHostTick() {
  if (!_glh.on || _gll.role !== 'host') return;
  const t = Date.now(), here = _glhAnyone(), G = _glg.cur;   // clock-ok: pacing
  if (G) {
    if (G.st !== 0) return;
    if (!here) { G.idleAt = G.idleAt || t; if (t - G.idleAt > GL_GOAL.idleMs) _glgEnd(2); return; }
    G.idleAt = 0;
    if (t - G.at > GL_GOAL.staleMs) { _glgEnd(2); return; }   // nobody has moved it for a long while: let it go
    if (G.c === 'water') { try { if (gardenModel().rain.now) { _glgEnd(2); return; } } catch (e) { /* the next look */ } }   // (the rain does the watering: nothing is left to do)
    if (t - _glg.sentAt > 45000) _glgSendNow('all');          // (repairs a screen that missed one)
    return;
  }
  if (!here || !gardenLiveGoalsOn() || t - _glg.arriveAt < GL_GOAL.firstMs || t - _glg.endAt < GL_GOAL.gapMs) return;
  _glgPick();
}
/** How big a goal of this kind can be in this garden now, or 0 when it cannot be done now. */
function _glgSizeFor(def, m, people, help) {
  let of = glGoalSize(def, people);
  if (def.needs && !help) return 0;
  if (def.id === 'water') {
    if (m.rain.now) return 0;
    of = Math.min(of, m.plants.filter(p => p.thirsty && p.def.thirst && gsocWaterOk(p.def.id)).length);
  } else if (def.id === 'bug') {
    if (typeof gardenBugsNow !== 'function' || gardenFun() === 'off') return 0;
    of = Math.min(of, gardenBugsNow(m).length);
  } else if (def.id === 'fish') {
    if (typeof gardenFishDef !== 'function' || !m.areas.includes('lake')) return 0;
  }
  return of >= def.n[0] ? of : 0;
}
function _glgPick() {
  const t = Date.now(), day = _gllToday();   // clock-ok: pacing
  if (_glg.started.day !== day) _glg.started = { day, n: 0 };
  if (_glg.started.n >= GL_GOAL.startsMax) return;
  let m; try { m = gardenModel(); } catch (e) { return; }
  const people = _gll.actors.size + 1, help = [..._gll.actors.values()].some(A => glAtLeast(A.lv, 'help'));
  const opts = [];
  for (const def of GL_GOALS) { if (def.id === _glg.lastC && GL_GOALS.length > 1) continue; const of = _glgSizeFor(def, m, people, help); if (of) opts.push({ def, of }); }
  if (!opts.length) { _glg.endAt = t - GL_GOAL.gapMs + 60000; return; }   // nothing fits just now: look again in a minute
  const o = opts[Math.floor(Math.random() * opts.length)];
  _glg.started.n++;
  _glg.cur = { g: _gllNewId(), c: o.def.id, of: o.of, n: 0, by: {}, st: 0, at: t, claimAt: new Map(), idleAt: 0 };
  _glgShow(true);
  _glgSendNow('all');
}
/** The state as it goes on the wire. */
function _glgBody(G) {
  return { g: G.g, c: G.c, n: G.n, of: G.of, st: G.st, p: Object.entries(G.by).filter(([, v]) => v > 0).map(([w, v]) => [Number(w), v]).slice(0, GL_PEOPLE) };
}
function _glgSendNow(to) {
  const G = _glg.cur; if (!G) return;
  clearTimeout(_glg.sendT); _glg.sendT = 0; _glg.sentAt = Date.now();   // clock-ok: pacing
  const body = _glgBody(G);
  if (glGoalOk(body)) return;   // (it adds up by construction)
  if (_glhAnyone()) _glhSend(to || 'all', 'goal', body);
}
function _glgSendSoon() { if (!_glg.sendT) _glg.sendT = setTimeout(() => { _glg.sendT = 0; _glgSendNow('all'); }, 250); }
/** The host's own card, and the corner line. */
function _glgShow(fresh) {
  const G = _glg.cur; if (!G) return;
  const prev = _glg.view && _glg.view.g === G.g ? _glg.view : null;
  _glg.view = { g: G.g, c: G.c, n: G.n, of: G.of, st: G.st, by: Object.assign({}, G.by) };
  if (fresh) _glgFeedLine('start', _glg.view);
  else if (G.st === 0 && prev && G.n * 2 >= G.of && prev.n * 2 < G.of) _glgFeedLine('half', _glg.view);
  gardenLiveGoalPaint();
}
/** The host counts a part of a goal: only while somebody is here, only for the goal's own kind, never past one person's share. Returns how much counted. */
function _glgCount(w, c, n) {
  const G = _glg.cur;
  if (!G || G.st !== 0 || G.c !== c || _gll.role !== 'host' || !_glh.on || !_glhAnyone() || !Number.isInteger(w)) return 0;
  if (w !== 0 && !_gll.actors.has(w)) return 0;
  const have = G.by[w] || 0, add = Math.max(0, Math.min(n | 0, glGoalCap(G.of) - have, G.of - G.n));
  if (!add) return 0;
  G.by[w] = have + add; G.n += add; G.at = Date.now();   // clock-ok: pacing
  if (G.n >= G.of) _glgDone(); else { _glgShow(false); _glgSendSoon(); }
  return add;
}
function _glgDone() {
  const G = _glg.cur; if (!G || G.st !== 0) return;
  G.st = 1; _glg.endAt = Date.now(); _glg.lastC = G.c;   // clock-ok: pacing
  clearTimeout(_glg.sendT); _glg.sendT = 0;
  _glgShow(false);
  _glgSendNow('all');
  for (const ms of [1500, 5000]) _glg.resendT.push(setTimeout(() => { if (_glg.cur === G) _glgSendNow('all'); }, ms));   // (the end is the one message that must arrive)
  _glgCelebrate(_glg.view);
  if (G.by[0] > 0) _glgThanks(_glg.view, '');
  clearTimeout(_glg.hideT);
  _glg.hideT = setTimeout(() => { if (_glg.cur === G) { _glg.cur = null; _glg.view = null; gardenLiveGoalPaint(); } }, GL_GOAL.doneMs);
}
/** The host lets it go (the switch, the skip button, nobody left, nobody moving it). Everyone's card goes. */
function _glgEnd(st) {
  const G = _glg.cur; if (!G) return;
  if (G.st === 0) { G.st = st; _glgSendNow('all'); _glg.endAt = Date.now(); }   // clock-ok: pacing
  _glg.cur = null; _glg.view = null;
  gardenLiveGoalPaint();
}
function gardenLiveGoalSkip() {
  if (_gll.role !== 'host' || !_glg.cur || _glg.cur.st !== 0) return;
  _glgEnd(2);
  _glg.endAt = Date.now() - GL_GOAL.gapMs + 30000;   // clock-ok: pacing (the next one comes in half a minute)
}

/* ---------- what the host counts ---------- */
/** The host applied a visitor's intent (94-garden-live-3host.js, after the save): a watering, or a bug from the host's own spawn. */
function _glgApplied(ev) {
  if (!_glg.cur || ev.away) return;
  if (ev.t === 'water') _glgCount(ev.w, 'water', 1);
  else if (ev.t === 'catch') _glgCount(ev.w, 'bug', 1);
}
/** The host named a winner for a bug (94-garden-live-6life.js). */
function _glgBugWon(w) { if (_glg.cur) _glgCount(w, 'bug', 1); }
/** The host's own catch (gardenLiveFx got): a fish of the catalogue (not junk), or a bug. */
function _glgOwnGot(kind, id) {
  if (!_glg.cur) return;
  if (kind === 'fish') { const d = typeof gardenFishDef === 'function' ? gardenFishDef(String(id)) : null; if (d && d.cat === 'fish') _glgCount(0, 'fish', 1); }
  else if (kind === 'bug') _glgCount(0, 'bug', 1);
}
/** A guest says they landed a fish (gl:fx got): counted, at a pace a real line allows. A bug is not counted here: the host named its winner. */
function _glgFxGot(A, ev) {
  const G = _glg.cur;
  if (!G || G.st !== 0 || G.c !== 'fish' || !A || ev.e !== 'fish') return;
  const d = typeof gardenFishDef === 'function' ? gardenFishDef(String(ev.i)) : null; if (!d || d.cat !== 'fish') return;
  const t = Date.now();   // clock-ok: pacing
  if (t - (G.claimAt.get(A.w) || 0) < GL_GOAL.claimMs) return;
  G.claimAt.set(A.w, t);
  _glgCount(A.w, 'fish', 1);
}
// the host's own watering (a single plant, or the whole bed with the can)
document.addEventListener('opendash:garden', (ev) => {
  if (!_glg.cur || _gll.role !== 'host') return;
  const d = ev && ev.detail; if (!d || d.kind !== 'water') return;
  _glgCount(0, 'water', d.x != null ? 1 : Math.max(0, Math.min(40, Number(d.n) || 0)));
});

/* ---------- a guest ---------- */
/** The host's state arrived (94-garden-live-2visit.js). */
function _glgGuestIn(ev) {
  if (_gll.role !== 'visit' || !_glvLive() || glGoalOk(ev)) return;
  const prev = _glg.view && _glg.view.g === ev.g ? _glg.view : null, by = {};
  for (const [w, n] of ev.p) by[w] = n;
  const view = { g: ev.g, c: ev.c, n: ev.n, of: ev.of, st: ev.st, by };
  if (ev.st === 2) { if (_glg.view && _glg.view.g === ev.g) { _glg.view = null; gardenLiveGoalPaint(); } return; }
  if (_glg.done.has(ev.g)) return;   // (a repeat of the end)
  _glg.view = view;
  if (ev.st === 0) {
    if (!_glg.seen.has(ev.g)) { _glg.seen.add(ev.g); if (_glg.seen.size > 12) _glg.seen.delete(_glg.seen.values().next().value); if (!prev) _glgFeedLine('start', view); }
    else if (prev && ev.n * 2 >= ev.of && prev.n * 2 < ev.of) _glgFeedLine('half', view);
  } else {
    _glg.done.add(ev.g); if (_glg.done.size > 12) _glg.done.delete(_glg.done.values().next().value);
    _glgCelebrate(view);
    if (_glg.seen.has(ev.g) && (by[_glv.w] || 0) > 0) _glgThanks(view, _glv.fid);   // (only a goal this page watched, and only if the host says you took part)
    clearTimeout(_glg.hideT);
    _glg.hideT = setTimeout(() => { if (_glg.view && _glg.view.g === ev.g) { _glg.view = null; gardenLiveGoalPaint(); } }, GL_GOAL.doneMs);
  }
  gardenLiveGoalPaint();
}
function _glgGuestClear() { clearTimeout(_glg.hideT); _glg.view = null; _glg.seen.clear(); _glg.done.clear(); gardenLiveGoalPaint(); }

/* ---------- the reward: each person's own ---------- */
function _glgItemName(k) {
  const m = /^bait:(.+)$/.exec(k);
  if (m && typeof GARDEN_BAITS !== 'undefined') { const b = GARDEN_BAITS.find(x => x.id === m[1]); if (b) return b.name.toLowerCase(); }
  try { return typeof _gdxItemName === 'function' ? _gdxItemName(k).toLowerCase() : k; } catch (e) { return k; }
}
/** One ledger entry on this computer, once for this goal, and no more than GL_GOAL.dayMax goals a day. Returns the row it paid, or null. */
function _glgReward(view, fid) {
  const def = glGoalDef(view.c);
  if (!def || typeof gardenReady !== 'function' || !gardenReady()) return null;
  const g = _gdG(), key = 'gl.q.' + view.g, today = _gllToday();
  if (g.led[key]) return null;
  let n = 0; for (const [k, e] of Object.entries(g.led)) if (k.startsWith('gl.q.') && e && e.d === today) n++;
  if (n >= GL_GOAL.dayMax) return null;
  const r = def.rew, items = Object.assign({}, r.i);
  g.led[key] = Object.assign({ d: today, k: 'gl', ok: 1, c: r.c, x: r.x, n: 0 }, Object.keys(items).length ? { i: items } : {}, fid ? { f: fid } : {});
  _gscSaveGarden();
  return r;
}
function _glgThanks(view, fid) {
  const r = _glgReward(view, fid);
  if (!r) return;
  const bits = [`${r.c} coins`, `${r.x} XP`].concat(Object.entries(r.i || {}).map(([k, v]) => `${v} ${_glgItemName(k)}`));
  setTimeout(() => _gllFeed('Your thanks: ' + bits.join(', ')), 900);
}

/* ---------- what everyone sees ---------- */
function _glgText(def, view, done) { return (done ? def.d : def.t).replace('{n}', String(view.of)); }
function _glgFeedLine(what, view) {
  const def = glGoalDef(view.c); if (!def) return;
  _gllFeed(what === 'start' ? 'New goal: ' + _glgText(def, view) : 'Halfway there: ' + _glgText(def, view).toLowerCase());
}
function _glgCelebrate(view) {
  const def = glGoalDef(view.c); if (!def) return;
  _gllFeed('Goal reached: ' + _glgText(def, view, true) + '!');
  if (typeof gameCheer === 'function' && gardenFun() !== 'off') { try { gameCheer(null, { text: '★', tone: 'gold' }); } catch (e) { /* only a sparkle */ } }
  if (typeof _fxSound === 'function' && gardenFun() !== 'off') { try { _fxSound('chime'); } catch (e) { /* only a sound */ } }
}
function _glgShown() { return (_gll.role === 'host' && _glh.on) || (_gll.role === 'visit' && typeof _glvLive === 'function' && _glvLive()); }
/** The card: one element, kept, with its parts updated in place (so the bar slides and nothing replays). */
function gardenLiveGoalPaint(boxArg) {
  const box = boxArg || (typeof _gw !== 'undefined' ? _gw.box : null);
  if (!box || !box.isConnected) return;
  const v = _glg.view, def = v ? glGoalDef(v.c) : null;
  let el = box.querySelector(':scope > .glg');
  if (!v || !def || !_glgShown()) { if (el) el.remove(); _glg.sig = ''; return; }
  const me = _gll.role === 'host' ? 0 : _glv.w, nameOf = (w) => (w === me ? 'You' : String((_gll.actors.get(w) || {}).n || 'A friend').split(/\s+/)[0]);
  const parts = Object.entries(v.by).map(([w, n]) => [Number(w), n]).sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const sig = [v.g, v.n, v.of, v.st, _gll.role, parts.map(([w, n]) => w + ':' + n + ':' + nameOf(w)).join(',')].join('|');
  if (el && _glg.sig === sig) return;
  _glg.sig = sig;
  if (!el) {
    el = _gsvEl('div', 'glg');
    el.setAttribute('role', 'group');
    const top = _gsvEl('div', 'glg-top'), ic = _gsvEl('span', 'glg-ic'), t = _gsvEl('b', 'glg-t'), n = _gsvEl('span', 'glg-n');
    n.setAttribute('aria-live', 'polite');
    const skip = _gsvBtn('', { icon: 'x', cls: 'glg-skip', kind: 'btn-ghost', aria: 'Skip this goal', tip: 'Skip this goal', run: () => gardenLiveGoalSkip() });
    const bar = _gsvEl('div', 'glg-bar'), fill = _gsvEl('i');
    bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.appendChild(fill);
    const who = _gsvEl('div', 'glg-who');
    top.append(ic, t, n, skip); el.append(top, bar, who);
    el._r = { ic, t, n, skip, bar, fill, who };
    box.appendChild(el);
  }
  const r = el._r, done = v.st === 1, cap = glGoalCap(v.of);
  el.classList.toggle('is-done', done);
  r.ic.innerHTML = icon(def.icon);   // (a fixed icon name from the table)
  r.t.textContent = _glgText(def, v, done);
  r.n.textContent = v.n + '/' + v.of;
  r.skip.hidden = _gll.role !== 'host' || done;
  r.bar.setAttribute('aria-valuemax', String(v.of)); r.bar.setAttribute('aria-valuenow', String(v.n)); r.bar.setAttribute('aria-label', _glgText(def, v));
  r.fill.style.width = Math.round(v.n / v.of * 100) + '%';
  el.setAttribute('aria-label', 'Shared goal: ' + _glgText(def, v));
  r.who.textContent = '';
  for (const [w, n] of parts.slice(0, 8)) {
    const p = _gsvEl('span', 'glg-p' + (w === me ? ' is-me' : '') + (n >= cap ? ' is-full' : ''), nameOf(w) + ' ' + n);
    if (n >= cap) p.title = 'A share is never more than ' + cap + ' of ' + v.of + ': it takes more than one of you';
    r.who.appendChild(p);
  }
  if (!parts.length) r.who.appendChild(_gsvEl('span', 'glg-p glg-none', 'Everyone counts, everyone shares'));
}
