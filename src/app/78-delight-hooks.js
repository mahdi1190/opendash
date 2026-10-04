/* ============================================================
   DELIGHT HOOKS: contextual celebrations in the page (DELIGHT_LIBRARY §1, §3.1).
   The art, the moments and the chooser are pure (71-delight-library.js,
   window-free); this file reads the page (the completion log, Focus, the
   inbox count) and shows the result:
     L1 pop      the moment's art where the user clicked
     L2 flourish the pop plus themed particles (planes, hearts, brackets...)
     L3 moment   a small card at the bottom with a few words (submission,
                 milestone, streak day, all Focus done, inbox zero)
   Called from animCelebrate (78-brief-hooks.js, after its bulk and click
   guards) and from the Home inbox widget (delightInboxSeen). Nothing plays
   under Off / Reduced / Animations off; the level (Settings > Animations >
   Intensity) sets the weight and the particle count (delightAllowed).
   Variants rotate per day and never repeat the last one shown
   (localStorage 'dashboard-delight-recent', UI only, per device).
   ============================================================ */
const _DL_RECENT_KEY = 'dashboard-delight-recent';
const _DL_WORDS = {
  'done.submission': { over: 'Submitted', h: 'Handed in. Nicely done.' },
  'done.milestone': { over: 'Milestone', h: 'A summit reached.' },
  'moment.inbox-zero': { over: 'Inbox zero', h: 'Nothing waiting on you.' },
  'moment.all-focus': { over: 'Focus done', h: 'Today\'s plan, done.' },
  'moment.streak': { over: 'Streak', h: 'Another day in a row.' },
  'moment.budget': { over: 'Money', h: 'Goal reached.' },
  'moment.last': { over: 'Done for today', h: 'Time to stop.' },
};
function _dlLoad() {
  try { const v = JSON.parse(localStorage.getItem(_DL_RECENT_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; }
}
function _dlSave(v) { try { localStorage.setItem(_DL_RECENT_KEY, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
/** The recent-plays record for today (older days drop out). */
function _dlRecent() {
  const today = todayStr(), all = _dlLoad();
  const out = { plays: Array.isArray(all.plays) ? all.plays.filter(p => p && Date.now() - p.at < 86400000) : [], m: {} };
  for (const [k, r] of Object.entries(all.m || {})) if (r && r.day === today) out.m[k] = r; else if (r) out.m[k] = { v: r.v, n: 0, day: today };
  out.inbox = all.inbox && all.inbox.day === today ? all.inbox : { day: today, max: 0, zeroShown: false };
  return out;
}
function _dlLevel() {
  if (typeof animEnabled === 'function' && !animEnabled()) return 'off';
  return window.Motion && Motion.level ? Motion.level() : 'standard';
}
/** Completions per day from the completion log; `skip` drops this item's latest entry (the one just made). */
function _dlDayCounts(skip) {
  const out = {};
  for (const [id, arr] of Object.entries(state.completionLog || {})) {
    if (!Array.isArray(arr)) continue;
    const list = id === skip ? arr.slice(0, -1) : arr;
    for (const ts of list) { const d = fmtDate(new Date(Number(ts))); out[d] = (out[d] || 0) + 1; }
  }
  return out;
}
function _dlStreak(counts, today) { return typeof briefStreak === 'function' ? briefStreak(counts, today).days : 0; }

/** Build the context for a completion (DELIGHT_LIBRARY §1.4). */
function _dlCtx(item, type) {
  const today = todayStr(), hour = typeof Clock !== 'undefined' ? Clock.parts().h : new Date().getHours();   // clock-ok: fallback where Clock is not loaded (tests)
  const before = _dlDayCounts(item.id), after = _dlDayCounts(null);
  const ctx = { type, hour, eveningHour: 18, doneToday: before[today] || 0, streak: _dlStreak(after, today), streakBefore: _dlStreak(before, today) };
  // The last of today's Focus: the task was on Focus and nothing open is left there.
  try {
    if (typeof _hfShown !== 'undefined' && _hfShown.ids && _hfShown.ids.has(item.id) && _hfShown.ids.size >= 2
      && typeof homeFocusTasks === 'function' && homeFocusTasks().length === 0) ctx.event = 'focus-done';
  } catch (e) { /* Home not loaded */ }
  return ctx;
}

/**
 * The contextual celebration for a completed task. true when it handled it (a moment or a
 * kind-specific pop played, or the budget said "quiet"); false for the generic pop.
 */
function delightCelebrate(item, type) {
  if (typeof Delight === 'undefined' || !item) return false;
  const lv = _dlLevel();
  if (lv === 'off' || lv === 'reduced') return false;
  const rec = _dlRecent();
  const ctx = _dlCtx(item, type);
  const pick = Delight.delightFor({ kind: 'task', title: effTitle(item), tags: effTags(item), priority: effPriority(item),
    dueToday: effDate(item) === todayStr(), subtasks: item.subtasks }, ctx, rec.m, todayStr());
  if (!pick || pick.moment === 'done.generic' || !pick.variant) return false;
  if (!_dlUnblocked(pick)) return false;
  return _dlPlay(pick, rec, lv, { title: effTitle(item), streak: ctx.streak });
}
/** Settings > Animations gallery: a blocked celebration is swapped for the moment's next variant (none left = no art). */
function _dlUnblocked(pick) {
  if (typeof animBlocked !== 'function' || !animBlocked('core/cel-' + pick.variant)) return true;
  const m = Delight.DL_MOMENT_BY.get(pick.moment);
  const alt = m && m.variants.find(v => !animBlocked('core/cel-' + v));
  if (!alt) return false;
  pick.variant = alt;
  return true;
}

/** Called by the Home inbox widget on every paint with the count of threads waiting. */
function delightInboxSeen(count) {
  if (typeof Delight === 'undefined' || typeof count !== 'number') return;
  const rec = _dlRecent();
  const ib = rec.inbox;
  if (count > ib.max) ib.max = count;
  const all = _dlLoad(); all.inbox = ib; _dlSave(all);
  if (count === 0 && ib.max >= 3 && typeof achNote === 'function') achNote('inbox-zero');   // the achievement (78-achievements.js); motion or not
  if (count !== 0 || ib.max < 5 || ib.zeroShown) return;
  if (typeof _pointer === 'undefined' || Date.now() - _pointer.at > 4000) return;   // reached by the user's own action, not a sync
  const lv = _dlLevel();
  if (lv === 'off' || lv === 'reduced') return;
  ib.zeroShown = true; all.inbox = ib; _dlSave(all);
  const pick = Delight.delightFor(null, { event: 'inbox-zero' }, rec.m, todayStr());
  if (pick && _dlUnblocked(pick)) _dlPlay(pick, rec, lv, {});
}

function _dlPlay(pick, rec, lv, info) {
  const m = Delight.DL_MOMENT_BY.get(pick.moment);
  if (!m) return false;
  const now = Date.now();
  const hour = rec.plays.filter(p => now - p.at < 3600000);
  const l3 = rec.plays.filter(p => p.l3);
  const st = { lastL3: l3.length ? l3[l3.length - 1].at : 0, l3Today: l3.length, playedToday: {}, lastHour: {} };
  for (const p of rec.plays) st.playedToday[p.id] = (st.playedToday[p.id] || 0) + 1;
  for (const p of hour) st.lastHour[p.id] = (st.lastHour[p.id] || 0) + 1;
  const ok = Delight.delightAllowed(m, st, { level: lv }, now);
  if (!ok.ok) return false;
  if (ok.level === 0) return true;          // habituation: the row's own tick is enough
  const q = window.Motion && Motion.profile ? Motion.profile() : { particles: 1 };
  if (ok.level >= 3) _dlCard(pick, m, ok, q, info);
  else _dlPop(pick, m, ok.level, q);
  const all = _dlLoad();
  const r = rec.m[pick.moment] || { n: 0 };
  all.m = Object.assign({}, rec.m, { [pick.moment]: { v: pick.variant, n: (r.n || 0) + 1, day: todayStr() } });
  all.plays = rec.plays.concat([{ id: pick.moment, at: now, l3: ok.level >= 3 }]).slice(-40);
  all.inbox = rec.inbox;
  _dlSave(all);
  return true;
}
function _dlPointer() {
  const p = typeof _pointer !== 'undefined' ? _pointer : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return { x: Math.max(48, Math.min(window.innerWidth - 48, p.x)), y: Math.max(72, p.y) };
}
function _dlPop(pick, m, level, q) {
  const at = _dlPointer();
  const pop = document.createElement('div');
  pop.className = 'dl-pop is-app'; pop.setAttribute('aria-hidden', 'true');
  pop.style.left = at.x + 'px'; pop.style.top = at.y + 'px';
  pop.style.setProperty('--dl-dur', m.dur + 'ms');
  pop.innerHTML = Delight.delightSceneHtml(pick.variant, { size: 'xl' });   // v2.2: bigger (71-anim-wire.css)
  document.body.appendChild(pop);
  let fx = null;
  if (level >= 2 && m.fx && q.particles) {
    fx = document.createElement('div'); fx.className = 'dl-fxhost';
    fx.style.left = at.x + 'px'; fx.style.top = (at.y - 40) + 'px';
    fx.innerHTML = Delight.delightFxHtml(m.fx, Math.round(22 * q.particles), Date.now() % 97, 140 * (q.dk || 1));
    document.body.appendChild(fx);
  }
  setTimeout(() => { pop.remove(); if (fx) fx.remove(); }, m.dur + 200);
}
function _dlCard(pick, m, ok, q, info) {
  document.querySelectorAll('.dl-moment.is-app').forEach(x => x.remove());   // one card at a time
  const w = _DL_WORDS[pick.moment] || { over: 'Done', h: 'Nicely done.' };
  const art = Delight.DL_ART[pick.variant];
  let sub = '';
  if (pick.moment === 'moment.streak' && info.streak) sub = `<b>${info.streak}</b> days in a row`;
  else if (info.title && (pick.moment === 'done.submission' || pick.moment === 'done.milestone')) sub = esc(String(info.title).slice(0, 80));
  const words = w.h.split(' ').map((x, i) => `<span class="w" style="--i:${i}">${esc(x)}</span>`).join(' ');
  const card = document.createElement('div');
  card.className = `dl-moment is-app c-${art ? art.colour : 'violet'}`;
  card.setAttribute('role', 'status');
  card.style.setProperty('--dl-dur', m.dur + 'ms');
  card.innerHTML = Delight.delightSceneHtml(pick.variant, { size: 'hero' })
    + `<div><span class="dl-m-over">${esc(w.over)}</span><span class="dl-m-h">${words}</span>${sub ? `<span class="dl-m-sub">${sub}</span>` : ''}</div>`
    + (!ok.quiet && m.fx && q.particles ? Delight.delightFxHtml(m.fx, Math.round(30 * q.particles), Date.now() % 97, 220 * (q.dk || 1)) : '');
  document.body.appendChild(card);
  setTimeout(() => card.remove(), m.dur + 200);
}
