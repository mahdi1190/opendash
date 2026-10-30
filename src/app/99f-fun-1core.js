/* ============================================================
   FUN WITH FRIENDS (2.17), the page core (owner: agent 'fun').
   Waves, high-fives and "thinking of you"; reactions on the feed; gifts
   with an unwrap; duo streaks (you both finished something today: a
   shared flame on the friend card); friendship quests and achievements;
   the Sunday recap "Your week with friends"; seasonal friend events
   (Trick or treat now; Winter lights and Spring bloom later); friendship
   level rewards (card and space themes, high-five animations, stickers).
   The rules and allow-lists are 99f-fun-0rules.js; the panels, dialogs
   and animations are 99f-fun-2ui.js; the server is lib/friends/fun.mjs.

   THE OWNER'S RULES. Everything a friend sends is an id from the rules'
   tables (no free text, no emoji or pictures from outside): it is drawn
   from the tables with textContent only. Nothing here enters the state
   except your own game XP (gameAward: one per key, at most three a day per
   kind; keys hash friend ids) and your own achievements (ids). Nothing
   reaches Claude, the MCP, an action or People.

   These files load after 99-boot.js, so module state is `var` and every
   hook checks funOn() first.

   API (all safe to call at any time):
     funLoad(force) -> Promise   GET /api/fun (cached 10 s); funCancelLoad()
     funData()                   the last answer, or null
     funFor(friendId)            {level, duo, quests, theme, gifts, knock, used} | null
     funWave(friend, t, o)       t: wave | high5 | nudge | thanks -> Promise
     funReact(friend, entryId, e, on) -> Promise
     funEventNow()               the running friend event {def, inst, ...} | null
     funInCostume(profile?)      wearing the event's costume item
     funAchFacts()               the friendship achievements' facts (78-achievements.js reads them)
   Hooks other files call (all `typeof fn === 'function'`):
     funFriendCard(card, friend)    96-friends-1ui.js _frCard: the duo flame, costume, gifts, quick actions, theme
     funFriendHero(el, friend)      96-friends-1ui.js _frFriendHero: Wave / High five / Gift (/ the event's knock)
     funFeedItem(li, entry, friend) 96-friends-1ui.js the feed: reactions, Unwrap, answer a knock
     funSpaceDecor(root, space)     99-together-1space.js tgRenderSpace: the space theme
     funOnEvent(d)                  86-live-sync.js: /api/events 'fun'
   ============================================================ */
var _fun = { data: null, sig: '', at: 0, loading: null, ctl: null, err: null, stopped: false, t: 0, dayAt: '', dayT: 0, costumeAsk: null, toastAt: {}, booted: false };
var FUN_REACTABLE = ['cheer', 'quest', 'focus', 'challenge', 'fun:wave', 'fun:gift', 'fun:event'];

function funOn() { return typeof _fun !== 'undefined' && !!_fun && typeof window !== 'undefined' && !!window.Friends && typeof state !== 'undefined' && !!state; }
function funData() { return funOn() ? _fun.data : null; }
function funFor(id) { const d = funData(); return d && d.friends && Object.prototype.hasOwnProperty.call(d.friends, id) ? d.friends[id] : null; }
function _funToday() { try { return todayStr(); } catch (e) { return new Date().toISOString().slice(0, 10); } }   // clock-ok: fallback only
function _funName(f) { try { return typeof friendName === 'function' ? friendName(f) : String((f && (f.nick || f.name)) || 'Your friend'); } catch (e) { return 'Your friend'; } }
function _funFirst(f) { return String(_funName(f)).split(/\s+/)[0] || 'Your friend'; }
function _funReduced() { return !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }
function _funPlayful() { return !_funReduced() && (typeof gameOn !== 'function' || gameOn()); }

async function _funApi(path, body, opts) {
  const o = opts || {};
  const init = body === undefined ? { method: 'GET', signal: o.signal } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: o.signal };
  const r = await fetch(path, init);
  let j = null;
  try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok || !j || j.ok === false) {
    const e = new Error((j && typeof j.error === 'string' && j.error) || (r.status === 404 ? 'This part of Freeflo is not on the server yet: restart Freeflo after updating.' : `That didn't work just now (${r.status}). Try again in a moment.`));
    e.code = j && j.code; e.status = r.status;
    throw e;
  }
  return j;
}
function funLoad(force) {
  if (!funOn()) return Promise.resolve(null);
  if (_fun.loading) return _fun.loading;
  if (!force && _fun.data && Date.now() - _fun.at < 10000) return Promise.resolve(_fun.data);
  const ctl = new AbortController();
  _fun.ctl = ctl;
  _fun.loading = _funApi('/api/fun', undefined, { signal: ctl.signal }).then((d) => {
    const prev = _fun.data;
    _fun.data = d; _fun.at = Date.now(); _fun.err = null; _fun.stopped = false;
    const sig = JSON.stringify(d);
    const changed = sig !== _fun.sig;
    _fun.sig = sig;
    try { _funAfterLoad(prev, d); } catch (e) { console.error('[fun] after load', e); }
    if (changed) _funRepaint();
    return d;
  }).catch((e) => { if (!(e && e.name === 'AbortError')) _fun.err = e; throw e; }).finally(() => { _fun.loading = null; if (_fun.ctl === ctl) _fun.ctl = null; });
  return _fun.loading;
}
function funCancelLoad() { if (_fun.ctl) { _fun.ctl.abort(); _fun.ctl = null; } }
function _funRefreshSoon(ms) { clearTimeout(_fun.t); _fun.t = setTimeout(() => { funLoad(true).catch(() => {}); }, ms == null ? 300 : ms); }
/** The Friends tab repainted (a cheer went out, a friend's message came in): look again if the data is over 10 s old. */
function _funFreshen() { if (_fun.data && !_fun.loading && !_fun.err && !_fun.stopped && Date.now() - _fun.at > 10000) _funRefreshSoon(600); }
/** Paint what shows fun again: the Friends tab in place, an open shared space. */
function _funRepaint() {
  try {
    const v = String(state.view || '');
    if (/^friends(:|$)/.test(v) && typeof friendsPageRefresh === 'function') friendsPageRefresh();
    else if (/^together:/.test(v) && typeof render === 'function') render();
  } catch (e) { console.error('[fun] repaint', e); }
}

/* ---------- XP and moments from what the server reports (gameAward dedupes by key and caps 3 a day per kind) ---------- */
function _funAward(kind, key, xp, label, quiet) {
  if (typeof gameAward !== 'function') return null;
  return gameAward({ kind, key: String(key).slice(0, 90), xp, label: label ? String(label).slice(0, 40) : '', quiet: !!quiet });
}
function _funMoment(o) { if (typeof gameMoment === 'function') gameMoment(o); else toast(o.title + (o.sub ? '. ' + o.sub : ''), { icon: o.icon || 'sparkles' }); }
function _funAfterLoad(prev, d) {
  if (!d || !d.friends) return;
  const first = !prev;
  for (const [id, x] of Object.entries(d.friends)) {
    const f = Friends.get(id);
    const h = funHash(id);
    for (const q of x.quests || []) {
      if (!q.done) continue;
      const def = funItem('quest', q.id);
      const was = prev && prev.friends && prev.friends[id] && (prev.friends[id].quests || []).find(p => p.id === q.id && p.done);
      const r = _funAward('friend-quest', `${d.week.from}:${h}:${q.id}`, 10, 'Friendship quest', true);
      if (r && !first && !was && def) _funMoment({ over: 'Friendship quest', title: def.label.replace('{name}', _funFirst(f)), sub: `+${r.xp} XP`, icon: def.icon || 'target', sound: 'quest' });
    }
    const duo = x.duo || {};
    const mark = FUN_DUO_MARKS.filter(m => (duo.cur || 0) >= m).pop();
    if (mark && duo.start) _funAward('duo-streak', `${h}:${duo.start}:${mark}`, 10, 'Duo streak', true);
  }
  if (d.event && d.event.tier && d.event.tier.at) _funAward('event-candy', `${d.event.inst}:${d.event.tier.at}`, 5, d.event.tier.label, true);
  if (!prev || JSON.stringify(prev.facts) !== JSON.stringify(d.facts)) { if (typeof achCheckSoon === 'function') achCheckSoon(900); }
  _funCostumeTick();
  _funRecapNudge(d);
}

/* ---------- the achievements' facts (71-achievements.js group 'friends') ---------- */
function funAchFacts() {
  if (!funOn()) return null;
  const out = Object.assign({}, (_fun.data && _fun.data.facts) || {});
  try {
    const aw = state.game && state.game.awards && typeof state.game.awards === 'object' ? state.game.awards : {};
    out.coopDone = Object.values(aw).filter(a => a && a.k === 'coop').length;
  } catch (e) { out.coopDone = 0; }
  out.planSundays = _funPlanSundays();
  return out;
}
/** Sundays on which you put something on a Plan together board shared with at least one friend. */
function _funPlanSundays() {
  try {
    if (typeof tgAllSpaces !== 'function' || typeof tgMe !== 'function') return 0;
    const me = tgMe(); if (!me) return 0;
    const days = new Set();
    for (const sp of tgAllSpaces()) {
      if (!sp || sp.status !== 'joined' || !sp.value) continue;
      if (typeof tgMembers === 'function' && tgMembers(sp.value).length < 2) continue;
      for (const c of (Array.isArray(sp.value.plan) ? sp.value.plan : []).slice(0, 300)) {
        if (!c || c.by !== me || !Number.isFinite(Number(c.at))) continue;
        const p = Clock.parts(Number(c.at));
        if (p.dow === 0) days.add(p.iso);
      }
    }
    return days.size;
  } catch (e) { return 0; }
}

/* ---------- the event and costumes ---------- */
function funEventNow() { return funEventOn(_funToday()); }
function funInCostume(p) {
  const ev = funEventNow();
  if (!ev || typeof profileGet !== 'function') return false;
  const a = ((p || profileGet()) || {}).avatar || {};
  return ev.def.costume.some(([k, id]) => a[k] === id);
}
function funFriendInCostume(f) {
  const ev = funEventNow();
  const a = f && f.profile && f.profile.avatar && typeof f.profile.avatar === 'object' ? f.profile.avatar : null;
  return !!(ev && a && ev.def.costume.some(([k, id]) => a[k] === id));
}
/** Tell the server when the costume goes on or off (sweets get a bonus while you wear it). */
function _funCostumeTick() {
  const d = _fun.data;
  if (!d || !d.on) return;
  const want = !!d.event && funInCostume();
  if (want === !!(d.prefs && d.prefs.costume) || _fun.costumeAsk === want) return;
  _fun.costumeAsk = want;
  _funApi('/api/fun/prefs', { costume: want }).then(() => _funRefreshSoon(200)).catch(() => {}).finally(() => { _fun.costumeAsk = null; });
}
/** Put the event's costume on (with Undo): the item is collected for good while the season is open. */
function funDressUp() {
  const ev = funEventNow();
  if (!ev || typeof profileSet !== 'function' || typeof profileGet !== 'function') return;
  const ctx = typeof profileUnlockCtx === 'function' ? profileUnlockCtx() : {};
  const pick = ev.def.costume.find(([k, id]) => !(typeof profileLockOf === 'function' && profileLockOf(k, id, ctx)));
  if (!pick) { toast('The costume opens with the season. Try again on the first day of the event.', { icon: 'info' }); return; }
  const [k, id] = pick;
  const before = profileGet().avatar[k];
  profileSet({ avatar: { [k]: id }, collected: { [k + ':' + id]: _funToday() } });
  toast(`You're dressed up: ${ev.def.costumeLabel} is on. Sweets drop a little faster.`, { icon: 'wand-sparkles', action: { label: 'Undo', run: () => profileSet({ avatar: { [k]: before } }) } });
  _funCostumeTick();
}

/* ---------- sending ---------- */
/** A wave, high five, "thinking of you" or thank you. o: {a (high-five style), quiet, anchor}. */
async function funWave(f, t, o) {
  o = o || {};
  if (!f || !f.id) return null;
  try {
    const r = await _funApi('/api/fun/wave', { to: f.id, t, a: o.a || undefined });
    const info = FUN_WAVE_INFO[t] || FUN_WAVE_INFO.wave;
    if (t === 'high5' && typeof funFxHigh5 === 'function') funFxHigh5(r.a || 'classic', { anchor: o.anchor });
    else if (typeof funFxFloat === 'function' && (t === 'wave' || t === 'thanks')) funFxFloat(info.e, { anchor: o.anchor });
    if (t !== 'nudge' && t !== 'thanks') _funAward('friend-wave', r.id || Date.now(), 2, info.label, true);   // clock-ok: a fallback key only
    if (r.combo) _funCombo(f, r.id);
    if (!o.quiet) {
      const away = r.queued && !r.sent;
      const line = t === 'nudge' ? `${_funFirst(f)} will know you're thinking of them 💭` : t === 'thanks' ? `Thank you sent to ${_funFirst(f)} 🙏` : `${info.label} sent to ${_funFirst(f)} ${info.e}`;
      toast(away ? `${_funFirst(f)} isn't around right now: it arrives when they're back.` : line + (r.candy ? ` · +${r.candy} ${_funCurrency(r.candy)}` : ''), { icon: away ? 'moon' : info.icon, kind: away ? '' : 'ok' });
    }
    _funRefreshSoon(150);
    return r;
  } catch (e) {
    toast(netErrorMessage(e), { kind: 'err', retry: e && e.code === 'CAP' ? null : () => funWave(f, t, o) });
    return null;
  }
}
function _funCombo(f, id) {
  _funAward('high5-combo', id || ('c' + Date.now()), 5, 'Double high-five');   // clock-ok: a fallback key only
  if (typeof funFxCombo === 'function') funFxCombo();
  _funMoment({ over: 'Perfect timing', title: `Double high-five with ${_funFirst(f)}!`, sub: 'You both high-fived within ten minutes', icon: 'zap', sound: 'achievement' });
}
function _funCurrency(n) { const ev = funEventNow(); return ev ? (n === 1 ? ev.def.currency.one : ev.def.currency.many) + ' ' + ev.def.currency.e : ''; }
/** React to a feed entry (on: false takes your reaction back). */
async function funReact(f, entryId, e, on) {
  try {
    const r = await _funApi('/api/fun/react', { to: f.id, re: entryId, e, on: on !== false });
    if (_fun.data) { _fun.data.reacts = _fun.data.reacts || {}; if (r.reacts) _fun.data.reacts[entryId] = r.reacts; else delete _fun.data.reacts[entryId]; }
    return r;
  } catch (x) { toast(netErrorMessage(x), { kind: 'err', retry: x && x.code === 'CAP' ? null : () => funReact(f, entryId, e, on) }); return null; }
}
/** Knock on a friend's door (the running event), or answer their knock with a treat or a trick. */
async function funKnock(f, t, o) {
  o = o || {};
  const ev = funEventNow();
  if (!ev) { toast('There is no friend event on right now.', { icon: 'info' }); return null; }
  try {
    const r = await _funApi('/api/fun/event', { to: f.id, t });
    const away = r.queued && !r.sent;
    const said = t === 'knock' ? `You knocked on ${_funFirst(f)}'s door: ${ev.def.knock.label}! ${ev.def.knock.e}` : t === 'treat' ? `${ev.def.treat.label}: sent to ${_funFirst(f)} ${ev.def.treat.e}` : `${ev.def.trick.label}: sent to ${_funFirst(f)} ${ev.def.trick.e}`;
    toast(away ? `${_funFirst(f)} isn't around right now: it arrives when they're back.` : said + (r.candy ? ` · +${r.candy} ${_funCurrency(r.candy)}` : ''), { icon: away ? 'moon' : ev.def.icon, kind: away ? '' : 'ok' });
    if (t === 'knock' && typeof funFxFloat === 'function') funFxFloat(ev.def.knock.e, { anchor: o.anchor });
    _funRefreshSoon(150);
    return r;
  } catch (e) { toast(netErrorMessage(e), { kind: 'err', retry: e && (e.code === 'CAP' || e.code === 'NO_KNOCK') ? null : () => funKnock(f, t, o) }); return null; }
}

/* ---------- live events (/api/events 'fun', 86-live-sync.js) ---------- */
function _funQuietToast(key, ms) { const now = Date.now(); if (_fun.toastAt[key] && now - _fun.toastAt[key] < ms) return false; _fun.toastAt[key] = now; return true; }
function funOnEvent(d) {
  if (!funOn() || !d || typeof d !== 'object') return;
  const f = typeof d.from === 'string' ? (Friends.get(d.from) || { id: d.from, name: 'A friend' }) : null;
  const who = f ? _funFirst(f) : 'A friend';
  try {
    if (d.type === 'wave' && f) {
      const info = FUN_WAVE_INFO[d.t] || FUN_WAVE_INFO.wave;
      if (d.t === 'high5') { if (typeof funFxHigh5 === 'function') funFxHigh5(funItem('high5', d.a) ? d.a : 'classic', {}); }
      else if (typeof funFxFloat === 'function') funFxFloat(info.e, {});
      if (d.combo) _funCombo(f, d.id);
      else if (_funQuietToast('wave:' + d.from, 20000)) {
        const text = d.t === 'nudge' ? `${who} is thinking of you 💭` : d.t === 'thanks' ? `${who} says thank you 🙏` : d.t === 'high5' ? `${who} high-fived you 🙌` : `${who} waved at you 👋`;
        toast(text, { icon: info.icon, action: d.t === 'thanks' ? null : { label: d.t === 'high5' ? 'High-five back' : 'Wave back', run: () => funWave(f, d.t === 'high5' ? 'high5' : 'wave') } });
      }
    } else if (d.type === 'gift' && f) {
      toast(`${who} sent you a gift 🎁`, { icon: 'gift', action: { label: 'Unwrap it', run: () => { if (typeof funUnwrap === 'function') funUnwrap(d.id); } } });
    } else if (d.type === 'react' && f) {
      const r = funItem('reaction', d.e);
      if (d.on && r && _funQuietToast('react:' + d.from, 30000)) toast(`${who} reacted ${r.e} to ${d.k === 'cheer' ? 'a cheer' : 'something you two did'}`, { icon: 'heart' });
    } else if (d.type === 'event' && f) {
      const ev = funEventNow();
      if (ev) {
        if (d.t === 'knock') toast(`${who} ${ev.def.knock.did}: ${ev.def.knock.label}! ${ev.def.knock.e}`, { icon: ev.def.icon, timeout: 12000, action: { label: 'Answer', run: () => { if (typeof funAnswerDialog === 'function') funAnswerDialog(f); } } });
        else if (d.t === 'treat') toast(`${who} ${ev.def.treat.did} ${ev.def.treat.e}${d.candy ? ` · +${d.candy} ${_funCurrency(d.candy)}` : ''}`, { icon: ev.def.icon, kind: 'ok' });
        else if (d.t === 'trick') { if (typeof funFxEmote === 'function') funFxEmote(ev.def.emote); toast(`${who} ${ev.def.trick.did} ${ev.def.trick.e}${d.candy ? ` · +${d.candy} ${_funCurrency(d.candy)} anyway` : ''}`, { icon: ev.def.icon }); }
      }
    } else if (d.type === 'duo' && f) {
      _funAward('duo-streak', `${funHash(d.from)}:${d.start || ''}:${d.n}`, 10, 'Duo streak', true);
      _funMoment({ over: 'Duo streak', title: `${d.n} days in a row with ${who}`, sub: 'You both finished something every day', icon: 'flame', big: d.n >= 30, sound: 'milestone' });
    } else if (d.type === 'tier') {
      const ev = funEventNow();
      if (ev) { _funAward('event-candy', `${ev.inst}:${d.n}`, 5, ev.def.label, true); _funMoment({ over: ev.def.label, title: String(funTierOf(ev.def, Number(d.n) || 0).label || ''), sub: `${Number(d.n) || 0} ${ev.def.currency.many} collected ${ev.def.currency.e}`, icon: ev.def.icon, sound: 'milestone' }); }
    }
  } catch (e) { console.error('[fun] event', e); }
  _funRefreshSoon(d.type === 'day' ? 800 : 200);
}

/* ---------- the duo day: tell friends once a day that you finished something ---------- */
function _funDayTick() {
  if (!funOn() || !_fun.data || !_fun.data.on) return;
  const t = _funToday();
  if (_fun.dayAt === t) return;
  let done = 0;
  try { const s = typeof gameStats === 'function' ? gameStats() : null; done = s && s.done && s.done.byDay ? Number(s.done.byDay[t]) || 0 : 0; } catch (e) { done = 0; }
  if (!done) return;
  _fun.dayAt = t;
  _funApi('/api/fun/day', {}).then(() => _funRefreshSoon(400)).catch(() => { _fun.dayAt = ''; });
}
document.addEventListener('opendash:game', () => { if (!funOn()) return; clearTimeout(_fun.dayT); _fun.dayT = setTimeout(_funDayTick, 4000); });
document.addEventListener('opendash:profile', () => { if (funOn()) _funCostumeTick(); });

/* ---------- the weekly recap: one gentle nudge on Sundays ---------- */
function _funRecapNudge(d) {
  try {
    if (!d || !d.recap || !d.recap.week || !d.recap.week.any) return;
    if (Clock.parts(Clock.now()).dow !== 0) return;
    const wk = d.week.from;
    if (d.prefs && d.prefs.recapSeen === wk) return;
    if (_fun.recapAsked === wk) return;
    _fun.recapAsked = wk;
    setTimeout(() => toast('Your week with friends is ready', { icon: 'calendar-heart', timeout: 10000, action: { label: 'See it', run: () => { if (typeof funRecapOpen === 'function') funRecapOpen(); } } }), 3000);
  } catch (e) { /* the recap is a bonus */ }
}

/* ---------- hooks: the friend card, a friend's page, the feed, a shared space ---------- */
function _funEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
/** A button: a thin wrapper over uiButton (11-ui-kit.js). o: {kind, sm, cls, icon, e (an emoji before the label), tip, aria, disabled, run};
    raw: true is a custom-styled control (an emoji pick, a badge) that keeps only o.cls. */
function _funBtn(label, o) {
  o = o || {};
  let b;
  if (o.raw) {
    b = document.createElement('button');
    b.type = 'button';
    b.className = o.cls || '';
    if (o.icon) b.innerHTML = icon(o.icon);
    if (o.e) b.appendChild(_funEl('span', 'fun-e', o.e));
    if (label) b.appendChild(_funEl('span', null, label));
    if (o.tip) b.setAttribute('data-tip', o.tip);
    if (o.aria) b.setAttribute('aria-label', o.aria);
    if (o.disabled) b.disabled = true;
    if (o.run) b.onclick = (e) => { e.stopPropagation(); o.run(e, b); };
    return b;
  }
  b = uiButton({ label, icon: o.icon, kind: String(o.kind || 'secondary').replace(/^btn-/, ''), size: o.sm ? 'sm' : 'md', cls: o.cls, tip: o.tip, aria: o.aria, disabled: o.disabled, run: o.run });
  if (o.e) { const em = _funEl('span', 'fun-e', o.e); const lab = b.querySelector(':scope > span'); if (lab) b.insertBefore(em, lab); else b.appendChild(em); }
  return b;
}
function _funDuoChip(x, f, big) {
  const duo = x && x.duo;
  if (!duo || (!duo.cur && !big)) return null;
  const c = _funEl('span', 'fun-duo' + (duo.today ? ' is-lit' : '') + (big ? ' is-big' : ''));
  c.innerHTML = icon('flame', 'i-xs');
  c.appendChild(_funEl('span', 'num', String(duo.cur || 0)));
  const name = _funFirst(f);
  const tip = duo.cur
    ? `Duo streak: you and ${name} both finished something ${duo.cur} day${duo.cur === 1 ? '' : 's'} in a row.` + (duo.today ? ' Both done today.' : duo.me ? ` Waiting for ${name} today.` : duo.them ? ` ${name} is done today: your turn.` : ' Keep it going today.')
    : `Duo streak: finish something on the same day as ${name} to light it.`;
  c.setAttribute('data-tip', tip);
  c.setAttribute('aria-label', tip);
  return c;
}
function funFriendCard(card, f) {
  if (!funOn() || !card || !f || f.status !== 'friend') return;
  const x = funFor(f.id);
  if (!x) { if (!_fun.data && !_fun.loading && !_fun.err && !_fun.stopped) funLoad(false).catch(() => {}); return; }
  _funFreshen();
  if (x.theme && x.theme !== 'plain' && funItem('theme', x.theme)) card.classList.add('fun-th', 'fun-th-' + x.theme);
  const g = card.querySelector('.fr-card-g');
  const chip = _funDuoChip(x, f, false);
  if (g && chip) g.appendChild(chip);
  const head = card.querySelector('.fr-card-h');
  if (head && funFriendInCostume(f)) { const c = _funEl('span', 'fun-costume', '🧙'); c.setAttribute('data-tip', `${_funFirst(f)} is dressed up for ${funEventNow().def.label}`); head.appendChild(c); }
  if (head && x.gifts) {
    const b = _funBtn('', { raw: true, cls: 'fun-giftbadge', e: '🎁', tip: `${x.gifts} gift${x.gifts === 1 ? '' : 's'} from ${_funFirst(f)} to unwrap`, aria: `Unwrap ${_funFirst(f)}'s gift`, run: () => { const gg = ((_fun.data && _fun.data.gifts && _fun.data.gifts.inbox) || []).find(y => y.f === f.id); if (gg && typeof funUnwrap === 'function') funUnwrap(gg.id); } });
    if (x.gifts > 1) b.appendChild(_funEl('span', 'num', String(x.gifts)));
    head.appendChild(b);
  }
  const foot = card.querySelector('.fr-card-foot');
  if (foot) {
    const wave = _funBtn('', { kind: 'btn-ghost', sm: true, cls: 'fun-wavebtn', e: '👋', tip: `Wave at ${_funFirst(f)}`, aria: `Wave at ${_funFirst(f)}`, run: (e, b) => funWave(f, 'wave', { anchor: b }) });
    const more = _funBtn('', { kind: 'btn-ghost', sm: true, cls: 'fun-morebtn', icon: 'sparkles', tip: `High five, thinking of you, a gift${funEventNow() ? ', ' + funEventNow().def.knock.label.toLowerCase() : ''}`, aria: `More fun with ${_funFirst(f)}`, run: (e, b) => { if (typeof funActionsMenu === 'function') funActionsMenu(b, f); } });
    const cheer = foot.querySelector('.fr-cheer');
    for (const b of [wave, more]) { if (cheer) foot.insertBefore(b, cheer); else foot.appendChild(b); }
  }
}
function funFriendHero(el, f) {
  if (!funOn() || !el || !f || f.status !== 'friend') return;
  const x = funFor(f.id);
  if (!x) { if (!_fun.data && !_fun.loading && !_fun.err && !_fun.stopped) funLoad(false).catch(() => {}); return; }
  if (x.theme && x.theme !== 'plain' && funItem('theme', x.theme)) el.classList.add('fun-th', 'fun-th-' + x.theme);
  const acts = el.querySelector('.fr-fhero-a');
  if (acts) {
    const more = acts.lastElementChild;
    // 2.19.1: Wave, High five, Gift, the event's knock and Thinking of you are ONE button with a menu (they were five)
    const ev = funEventNow();
    const items = [
      { label: 'Wave', icon: '👋', run: () => funWave(f, 'wave', { anchor: hi }) },
      { label: 'High five', icon: '🙌', run: () => funWave(f, 'high5', { anchor: hi }) },
      { label: 'Gift', icon: 'gift', run: () => { if (typeof funGiftDialog === 'function') funGiftDialog(f); } },
    ];
    if (ev) items.push({ label: ev.def.knock.label, icon: ev.def.knock.e, run: () => funKnock(f, 'knock', { anchor: hi }) });
    items.push({ label: 'Thinking of you', icon: '💭', hint: 'once a day', title: `Let ${_funFirst(f)} know you're thinking of them`, disabled: !!(x.used && x.used.nudge >= 1), run: () => funWave(f, 'nudge', { anchor: hi }) });
    const hi = uiButton({ label: 'Say hi', icon: 'smile-plus', size: 'sm', run: (e, btn) => openMenu(btn, items, { align: 'start' }) });
    acts.insertBefore(hi, more);
  }
  const rt = el.querySelector('.fr-fring-t');
  const chip = _funDuoChip(x, f, !!(x.duo && x.duo.cur));   // no chip for a streak of nothing
  if (rt && chip) rt.appendChild(chip);
}
function funFeedItem(li, e, f) {
  if (!funOn() || !li || !e || !f || f.status !== 'friend' || !FUN_MSG_RE.test(String(e.id || ''))) return;
  const d = _fun.data;
  if (!d) return;
  // a gift still wrapped, a knock to answer
  if (e.k === 'fun:gift' && e.dir === 'in' && ((d.gifts && d.gifts.inbox) || []).some(g => g.id === e.id)) {
    li.appendChild(_funBtn('Unwrap', { sm: true, kind: 'btn-primary', cls: 'fun-feed-act', icon: 'gift', run: () => { if (typeof funUnwrap === 'function') funUnwrap(e.id); } }));
  }
  if (e.k === 'fun:event' && e.dir === 'in' && e.b && e.b.t === 'knock' && d.event) {
    const k = (d.event.knocks || []).find(y => y.id === e.id);
    if (k && !k.ans) li.appendChild(_funBtn('Answer', { sm: true, kind: 'btn-primary', cls: 'fun-feed-act', e: funEventNow() ? funEventNow().def.knock.e : '🚪', run: () => { if (typeof funAnswerDialog === 'function') funAnswerDialog(f); } }));
  }
  if (!FUN_REACTABLE.includes(e.k) || (e.dir !== 'in' && e.dir !== 'out')) return;
  const tx = li.querySelector('.fr-feed-t') || li;
  if (typeof funReactBar === 'function') tx.appendChild(funReactBar(e, f));
}
function funSpaceDecor(root, sp) {
  if (!funOn() || !root || !sp || !sp.id || !_fun.data) return;
  const th = _fun.data.prefs && _fun.data.prefs.spaceThemes ? _fun.data.prefs.spaceThemes[sp.id] : '';
  const head = root.querySelector('.tg-space-head');
  const body = root.querySelector('.tg-body');
  if (th && th !== 'plain' && funItem('theme', th)) for (const el of [head, body]) if (el) el.classList.add('fun-sp', 'fun-th', 'fun-th-' + th);
  if (head && sp.status === 'joined' && typeof funSpaceThemeMenu === 'function') {
    const b = _funBtn('', { raw: true, cls: 'btn-icon btn-sm', icon: 'palette', tip: 'Space theme (unlocked by your friendship levels)', aria: 'Space theme', run: (ev, btn) => funSpaceThemeMenu(btn, sp) });
    head.insertBefore(b, head.lastElementChild);
  }
}

/* ---------- how fun lines read in the feed (Friends.describe) ---------- */
function _funDescribe() {
  const mine = (e) => e.dir === 'out' || e.dir === 'local';
  Friends.describe('fun:wave', (e, f) => {
    const b = e.b || {}, who = f ? _funFirst(f) : 'A friend', info = FUN_WAVE_INFO[b.t] || FUN_WAVE_INFO.wave;
    const style = b.t === 'high5' && b.a && b.a !== 'classic' && funItem('high5', b.a) ? ` (${funItem('high5', b.a).label})` : '';
    const text = mine(e)
      ? { wave: `You waved at ${who}`, high5: `You high-fived ${who}`, nudge: `You let ${who} know you're thinking of them`, thanks: `You thanked ${who}` }[b.t]
      : { wave: `${who} waved at you`, high5: `${who} high-fived you`, nudge: `${who} is thinking of you`, thanks: `${who} thanked you` }[b.t];
    return { icon: info.icon, text: `${text || `${who} waved`}${style} ${info.e}`, tone: b.t === 'nudge' ? 'warm' : '' };
  });
  Friends.describe('fun:gift', (e, f) => {
    const b = e.b || {}, who = f ? _funFirst(f) : 'A friend', it = funItem(b.t, b.item);
    const what = it ? `${it.e ? it.e + ' ' : ''}${it.label}${b.t === 'sticker' ? ' sticker' : b.t === 'emote' ? ' emote' : ''}` : 'a gift';
    const line = b.line && funItem('line', b.line) ? ` “${funItem('line', b.line).text}”` : '';
    if (mine(e)) return { icon: 'gift', text: `You sent ${who} ${it ? 'a ' + what : 'a gift'} 🎁${line}`, tone: 'warm' };
    const wrapped = ((_fun.data && _fun.data.gifts && _fun.data.gifts.inbox) || []).some(g => g.id === e.id);
    return { icon: 'gift', text: wrapped ? `${who} sent you a gift 🎁${line}` : `${who} gave you ${it ? 'a ' + what : 'a gift'}${line}`, tone: 'warm' };
  });
  Friends.describe('fun:event', (e, f) => {
    const b = e.b || {}, who = f ? _funFirst(f) : 'A friend', def = funItem('event', b.ev);
    if (!def) return { icon: 'sparkles', text: mine(e) ? `You visited ${who}` : `${who} visited you` };
    if (b.t === 'knock') return { icon: def.icon, text: mine(e) ? `You knocked on ${who}'s door: ${def.knock.label}! ${def.knock.e}` : `${who} ${def.knock.did}: ${def.knock.label}! ${def.knock.e}`, tone: 'party' };
    if (b.t === 'treat') return { icon: def.icon, text: mine(e) ? `You answered ${who} with a treat ${def.treat.e}` : `${who} ${def.treat.did} ${def.treat.e}`, tone: 'warm' };
    return { icon: def.icon, text: mine(e) ? `You played a trick on ${who} ${def.trick.e}` : `${who} ${def.trick.did} ${def.trick.e}`, tone: 'party' };
  });
  Friends.describe('fun:line', (e, f) => {
    const b = e.b || {}, who = f ? _funFirst(f) : 'a friend';
    if (b.t === 'duo') return { icon: 'flame', text: `You and ${who}: a ${Number(b.n) || 0}-day duo streak 🔥`, tone: 'party' };
    if (b.t === 'combo') return { icon: 'zap', text: `Double high-five with ${who}! 🙌🙌`, tone: 'party' };
    if (b.t === 'quest') { const q = funItem('quest', b.q); return { icon: q ? q.icon : 'target', text: `Friendship quest done${q ? ': ' + q.label.replace('{name}', who) : ''}`, tone: 'party' }; }
    if (b.t === 'tier') { const def = funItem('event', b.ev); const tier = def ? funTierOf(def, Number(b.n) || 0) : null; return { icon: def ? def.icon : 'sparkles', text: def ? `${def.label}: ${tier.label} (${Number(b.n) || 0} ${def.currency.many} ${def.currency.e})` : 'A seasonal milestone', tone: 'party' }; }
    return { icon: 'sparkles', text: 'Something fun happened' };
  });
}

/* ---------- start ---------- */
function _funBoot() {
  if (_fun.booted || !funOn()) return;
  _fun.booted = true;
  Friends.ready.then(() => funLoad(true)).then(() => { _funDayTick(); if (/^friends(:|$)/.test(String(state.view || '')) && typeof friendsPageRefresh === 'function') friendsPageRefresh(); }).catch(() => {});
  setInterval(() => { if (!document.hidden) { _funDayTick(); if (/^friends(:|$)/.test(String(state.view || '')) && Date.now() - _fun.at > 60000) funLoad(true).catch(() => {}); } }, 120000);
}
setTimeout(function _funStart() {
  if (typeof _serverAvailable !== 'undefined' && !_serverAvailable) { setTimeout(_funStart, 30000); return; }
  _funBoot();
}, 4500);
