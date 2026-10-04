/* ============================================================
   HOME'S TABS (owner: Brief + Review). The Morning brief and the Review pages are
   one place now, Home (user request, 4 Oct): Today ('home': the day's hero, its three
   sentences, Play my morning, then the widgets; 12-home.js, 12-home-head.js), Evening
   ('home:evening': Finish the day, 76-brief-evening.js), Week ('home:week': the guided
   weekly review below) and History ('home:history': saved reviews + the daily brief /
   recap snapshots kept by the server). Old '#view=review:*' links redirect (viewAlias).
   Weekly review steps:
     1 inbox and suggestions  2 overdue and stale  3 waiting-on chase list
     4 next week against capacity  5 three outcomes per area
     6 wins and stats (per stream, slipped deadlines and why, money)
     7 optional AI summary, notes and Save (actions op review.save, kind 'week')
   A draft is kept in this browser until it is saved.
   ============================================================ */
const HOME_TABS = Object.freeze([['today', 'Today', 'sunrise'], ['evening', 'Evening', 'sunset'], ['week', 'Week', 'calendar-range'], ['history', 'History', 'history']]);
/** The tab a Home view shows: 'home' = today, 'home:evening' = evening... */
function homeTabOf(v) { const m = /^home:([a-z]+)$/.exec(String(v || '')); const t = m ? m[1] : 'today'; return HOME_TABS.some(x => x[0] === t) ? t : 'today'; }
function homeTabView(tab) { return !tab || tab === 'today' ? 'home' : 'home:' + tab; }
/** The tab bar at the top of Home (the current tab is selected; clicking it again does nothing). */
function homeTabsEl(cur) {
  const bar = document.createElement('div'); bar.className = 'rv-tabs home-tabs'; bar.setAttribute('role', 'tablist'); bar.setAttribute('aria-label', 'Home');
  for (const [id, label, ic] of HOME_TABS) {
    const on = id === cur;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'rv-tab' + (on ? ' on' : ''); b.setAttribute('role', 'tab');
    b.dataset.tab = id;
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    if (on) b.setAttribute('aria-current', 'page');
    if (id === 'evening' && typeof _eveningNow === 'function' && _eveningNow() && typeof _eveningSavedToday === 'function' && !_eveningSavedToday()) b.classList.add('is-due');
    b.innerHTML = icon(ic, 'i-sm') + `<span>${esc(label)}</span>`;
    b.onclick = () => setView(homeTabView(id));
    bar.appendChild(b);
  }
  return bar;
}
/** Evening, Week or History into Home's body (Today is the widget board: 12-home.js). */
function homeTabMount(body, tab) {
  if (tab !== 'evening' && typeof eveningUnmount === 'function') eveningUnmount();
  if (tab === 'evening') eveningRender(body);
  else if (tab === 'week') weeklyRender(body);
  else if (tab === 'history') historyRender(body);
}

/* ---------- saving through the actions layer ---------- */
/** Apply one review.save op (server when it runs, else straight into the state). */
async function reviewSave(op, okMsg) {
  if (typeof _serverAvailable !== 'undefined' && _serverAvailable) {
    try {
      if (typeof _persistFire === 'function' && state._localDirty) { await _persistFire(); }
      const r = await fetch('/api/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops: [op], source: 'ui', client: 'review', idempotencyKey: `review-${op.kind}-${op.date}-${Date.now()}` }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j.ok === false) throw new Error((j.error && (j.error.message || j.error)) || ('HTTP ' + r.status));
      if (typeof _asstAdopt === 'function') await _asstAdopt(j.version);
      toast(okMsg || 'Saved', { kind: 'ok', icon: 'circle-check', action: j.undo ? { label: 'Undo', run: async () => {
        try { const u = await fetch('/api/actions/undo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: j.undo, source: 'ui', client: 'review' }) }).then(x => x.json()); if (typeof _asstAdopt === 'function') await _asstAdopt(u.version); }
        catch (e) { toast('Could not undo', { kind: 'err' }); }
      } } : undefined });
      return true;
    } catch (e) {
      toast('Not saved: ' + (e.message || 'the server did not answer'), { kind: 'err' });
      return false;
    }
  }
  // No server: keep it in this browser's state.
  if (!Array.isArray(state.reviews)) state.reviews = [];
  const { op: _o, ...rest } = op;
  const at = state.reviews.findIndex(r => r && r.kind === op.kind && r.date === op.date);
  const rec = Object.assign({ id: `rv-${op.kind}-${op.date}`, savedAt: new Date(Date.now()).toISOString(), source: 'ui' }, rest);
  if (at >= 0) state.reviews[at] = rec; else state.reviews.push(rec);
  saveData();
  toast(okMsg || 'Saved', { kind: 'ok' });
  return true;
}

/* ============================================================
   WEEKLY REVIEW
   ============================================================ */
const WEEK_STEPS = [
  ['inbox', 'Clear the inbox', 'inbox'], ['overdue', 'Overdue and stale', 'circle-alert'], ['waiting', 'Chase list', 'hourglass'],
  ['capacity', 'Next week', 'calendar-range'], ['outcomes', 'Outcomes', 'target'], ['wins', 'Wins and stats', 'trophy'], ['finish', 'Summary and save', 'sparkles'],
];
const _wk = { step: 0, weekFrom: '', draft: null, money: null, summaryLoading: false };
function _wkRange() {
  const today = todayStr();
  const r = reviewWeekRange(today, APP_CONFIG.weekStart || 'Mon');
  // Early in the week (before Wednesday) a review usually looks back at last week.
  const back = briefDaysBetween(r.from, today) < 2;
  return back ? { from: r.prevFrom, to: r.prevTo, nextFrom: r.from, nextTo: r.to } : { from: r.from, to: r.to, nextFrom: r.nextFrom, nextTo: r.nextTo };
}
function _wkDraftKey(from) { return 'dashboard-weekly-draft-' + from; }
function _wkDraft() {
  const r = _wkRange();
  if (_wk.weekFrom !== r.from || !_wk.draft) {
    _wk.weekFrom = r.from; _wk.step = 0;
    let d = null; try { d = JSON.parse(localStorage.getItem(_wkDraftKey(r.from)) || 'null'); } catch (e) { d = null; }
    const saved = (state.reviews || []).find(x => x && x.kind === 'week' && x.date === r.from);
    _wk.draft = d || (saved ? { outcomes: Object.fromEntries((saved.outcomes || []).map(o => [o.area, o.items.concat(['', '', '']).slice(0, 3)])), notes: saved.notes || '', summary: saved.summary || '', wins: (saved.wins || []).join('\n'), done: {} } : { outcomes: {}, notes: '', summary: '', wins: '', done: {} });
  }
  return _wk.draft;
}
function _wkSaveDraft() { try { localStorage.setItem(_wkDraftKey(_wk.weekFrom), JSON.stringify(_wk.draft)); } catch (e) { /* full */ } }

function weeklyRender(container) {
  const r = _wkRange();
  const d = _wkDraft();
  const root = document.createElement('div'); root.className = 'wk';
  const saved = (state.reviews || []).find(x => x && x.kind === 'week' && x.date === r.from);
  const head = document.createElement('div'); head.className = 'wk-head';
  head.innerHTML = `<div><div class="overline">Weekly review</div><h1>${esc(_wkLabel(r.from, r.to))}</h1><p class="muted">Seven short steps. Your answers are kept in this browser until you save.</p></div>${saved ? `<span class="badge badge-success">${icon('circle-check', 'i-xs')}Saved ${esc(new Date(saved.savedAt).toLocaleDateString(APP_CONFIG.locale || undefined, { day: 'numeric', month: 'short' }))}</span>` : ''}`;
  root.appendChild(head);
  const layout = document.createElement('div'); layout.className = 'wk-layout';
  const rail = document.createElement('ol'); rail.className = 'wk-rail';
  WEEK_STEPS.forEach(([id, label, ic], i) => {
    const li = document.createElement('li');
    li.className = 'wk-r' + (i === _wk.step ? ' on' : '') + (d.done[id] ? ' done' : '');
    li.innerHTML = `<button type="button"><span class="wk-r-n">${d.done[id] ? icon('check', 'i-xs') : esc(i + 1)}</span><span>${esc(label)}</span></button>`;
    li.querySelector('button').onclick = () => { _wk.step = i; renderMain(); };
    rail.appendChild(li);
  });
  const pane = document.createElement('section'); pane.className = 'card wk-pane';
  const [sid, slabel, sic] = WEEK_STEPS[_wk.step];
  pane.innerHTML = `<div class="wk-pane-h">${icon(sic)}<h2>${esc(slabel)}</h2><span class="muted">Step ${_wk.step + 1} of ${WEEK_STEPS.length}</span></div><div class="wk-pane-b"></div>`;
  const b = pane.querySelector('.wk-pane-b');
  try { ({ inbox: _wkInbox, overdue: _wkOverdue, waiting: _wkWaiting, capacity: _wkCapacity, outcomes: _wkOutcomes, wins: _wkWins, finish: _wkFinish })[sid](b, r, d); }
  catch (e) { console.error('[weekly ' + sid + ']', e); b.textContent = 'This step could not be shown.'; }
  const nav = document.createElement('div'); nav.className = 'wk-nav';
  if (_wk.step > 0) { const bk = document.createElement('button'); bk.type = 'button'; bk.className = 'btn btn-ghost'; bk.innerHTML = icon('arrow-left') + '<span>Back</span>'; bk.onclick = () => { _wk.step--; renderMain(); }; nav.appendChild(bk); }
  nav.appendChild(Object.assign(document.createElement('span'), { className: 'spacer' }));
  if (_wk.step < WEEK_STEPS.length - 1) {
    const nx = document.createElement('button'); nx.type = 'button'; nx.className = 'btn btn-primary';
    nx.innerHTML = '<span>Next</span>' + icon('arrow-right');
    nx.onclick = () => { d.done[sid] = true; _wkSaveDraft(); _wk.step++; renderMain(); };
    nav.appendChild(nx);
  }
  pane.appendChild(nav);
  layout.append(rail, pane);
  root.appendChild(layout);
  if (typeof storyMountEntry === 'function') storyMountEntry(root, 'week');   // 79-story-engine.js
  if (window.MoneyStory) window.MoneyStory.weekEntry(root, r.from);          // src/finance/28-money-story.js: "Money this week"
  if (typeof storyWeekOnEnter === 'function') storyWeekOnEnter();             // 79-story-weekly.js: the first visit each week opens the story
  container.appendChild(root);
  animActivate(root);
}
function _wkLabel(from, to) {
  const f = (iso, o) => _calParse(iso).toLocaleDateString(APP_CONFIG.locale || undefined, o);
  return `${f(from, { day: 'numeric', month: 'short' })} – ${f(to, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
function _wkRow(i, extra) {
  const li = document.createElement('li'); li.className = 'wk-row anim-hover-host';
  li.innerHTML = `${animSceneHtml(animForTask(i).type, { size: 'xs', hover: true })}<div class="ev-d-b"><div class="ev-d-t">${esc(effTitle(i))}</div><div class="ev-d-s">${_homeStreamHtml(effStream(i))}${extra ? `<span>${esc(extra)}</span>` : ''}</div></div>`;
  li.addEventListener('click', (e) => { if (!e.target.closest('button')) homeOpenSheet(i.id, li); });
  return li;
}
function _wkBtn(label, ic, run, cls) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm' + (cls ? ' ' + cls : '');
  b.innerHTML = (ic ? icon(ic, 'i-sm') : '') + `<span>${esc(label)}</span>`;
  b.onclick = (e) => { e.stopPropagation(); run(b); };
  return b;
}
function _wkIntro(b, text) { const p = document.createElement('p'); p.className = 'wk-intro'; p.textContent = text; b.appendChild(p); }

/* 1. inbox and suggestions */
function _wkInbox(b) {
  _wkIntro(b, 'Start with a clear head: deal with the email suggestions and anything still sitting in the inbox.');
  const sugs = ((state.emailTriage && state.emailTriage.suggestions) || []).filter(s => s.status === 'pending');
  const handled = (state.emailTriage && state.emailTriage.handled) || {};
  if (!InboxStore.st.loaded && !InboxStore.st.loading && _serverAvailable) InboxStore.load().then(() => { if (state.view === 'home:week' && _wk.step === 0) renderMain(); });
  const weekAgo = Date.now() - 7 * 86400000;
  const msgs = (typeof emailMessages === 'function' ? emailMessages() : []).filter(m => !handled[m.id] && (!m.date || Date.parse(m.date) >= weekAgo));
  const linkSugs = typeof pplSuggestionsCount === 'function' ? pplSuggestionsCount() : null;
  const tiles = document.createElement('div'); tiles.className = 'wk-tiles';
  const tile = (n, label, ic, view, cta) => {
    const t = document.createElement('div'); t.className = 'wk-tile' + (n ? '' : ' ok');
    t.innerHTML = `${icon(n ? ic : 'circle-check')}<b class="num">${esc(n)}</b><span>${esc(label)}</span>`;
    if (view && n) t.appendChild(_wkBtn(cta, 'arrow-right', () => setView(view)));
    tiles.appendChild(t);
  };
  tile(sugs.length, 'email suggestions waiting', 'mail', 'triage', 'Email triage');
  tile(Math.min(msgs.length, 99), 'emails this week not dealt with', 'inbox', 'triage', 'Open');
  if (linkSugs !== null) tile(linkSugs, 'people link suggestions', 'users', 'people', 'People');
  b.appendChild(tiles);
  if (gdConnAccess('gmail') === 'no' && !msgs.length) { const c = document.createElement('div'); c.className = 'callout'; c.innerHTML = `${icon('plug')}<span>Email is not connected, so there is nothing to clear here.</span>`; b.appendChild(c); }
}
/* 2. overdue and stale */
function _wkOverdue(b, r) {
  _wkIntro(b, 'Everything overdue gets a decision: a new date, done, or let it go. Then the tasks nobody has touched in a month.');
  const today = todayStr();
  const open = _bfOpen();
  const overdue = open.filter(i => { const d = effDate(i); return d && d < today; }).sort((a, c) => effDate(a).localeCompare(effDate(c)));
  const lastTouch = (i) => {
    const acts = (state.taskActivity || {})[i.id] || [];
    const t = Math.max(Number(i.createdAt && Date.parse(i.createdAt)) || 0, ...acts.map(a => Number(a.ts) || 0));
    return t || 0;
  };
  const stale = open.filter(i => !effDate(i) && statusOf(i.id) !== 'doing' && lastTouch(i) && Date.now() - lastTouch(i) > 30 * 86400000).slice(0, 8);
  const sec = (title, list, extra, acts) => {
    const h = document.createElement('div'); h.className = 'wk-sub'; h.innerHTML = `<b>${esc(title)}</b><span class="n">${esc(list.length)}</span>`;
    b.appendChild(h);
    if (!list.length) { const e = document.createElement('div'); e.className = 'wk-none'; e.innerHTML = `${icon('check-check', 'i-sm')}<span>Nothing here.</span>`; b.appendChild(e); return; }
    const ul = document.createElement('ul'); ul.className = 'wk-list';
    for (const i of list.slice(0, 12)) { const li = _wkRow(i, extra(i)); const box = document.createElement('span'); box.className = 'wk-acts'; acts(i).forEach(x => box.appendChild(x)); li.appendChild(box); ul.appendChild(li); }
    b.appendChild(ul);
  };
  sec('Overdue', overdue, (i) => `${-daysUntil(effDate(i))}d overdue`, (i) => [
    _wkBtn('Next week', 'calendar-range', () => setDateWithReason(i.id, r.nextFrom, 'Weekly review')),
    _wkBtn('', 'calendar', (btn) => openDueDatePopover(btn, { title: 'Move to', onPick: (d2) => d2 && setDateWithReason(i.id, d2, 'Weekly review') }), 'btn-icon'),
    _wkBtn('Done', 'check', () => toggleDone(i.id)),
    _wkBtn('Let go', 'circle-x', () => markWontDo(i.id)),
  ]);
  sec('Stale (no date, untouched for 30+ days)', stale, (i) => `last touched ${Math.round((Date.now() - lastTouch(i)) / 86400000)} days ago`, (i) => [
    _wkBtn('Next week', 'calendar-range', () => setDateWithReason(i.id, r.nextFrom, 'Weekly review')),
    _wkBtn('Let go', 'circle-x', () => markWontDo(i.id)),
  ]);
}
/* 3. waiting-on chase list */
function _wkWaiting(b) {
  _wkIntro(b, 'Who are you waiting on? Chase the ones that are late, or close what has arrived.');
  const list = _bfOpen().filter(i => typeof homeIsWaiting === 'function' && homeIsWaiting(i));
  if (!list.length) { const e = document.createElement('div'); e.className = 'wk-none'; e.innerHTML = `${icon('check-check', 'i-sm')}<span>Nobody to chase this week.</span>`; b.appendChild(e); return; }
  const ul = document.createElement('ul'); ul.className = 'wk-list';
  for (const i of list) {
    const p = typeof homeWaitingPerson === 'function' ? homeWaitingPerson(i) : null;
    const d = effDate(i);
    const li = _wkRow(i, `${p ? p.name : 'Someone'}${d ? ' · follow up ' + dueLabel(d) : ''}`);
    const box = document.createElement('span'); box.className = 'wk-acts';
    box.append(
      _wkBtn('Chase today', 'send', () => { setDateWithReason(i.id, todayStr(), 'Chase (weekly review)'); }),
      _wkBtn('Arrived', 'check', () => toggleDone(i.id)),
    );
    li.appendChild(box);
    ul.appendChild(li);
  }
  b.appendChild(ul);
}
/* 4. next week's calendar against capacity */
function _wkCapacity(b, r) {
  _wkIntro(b, 'Next week at a glance: booked time against an 8-hour day, and what is due. Days above three quarters full are marked.');
  const days = [];
  for (let k = 0; k < 7; k++) {
    const iso = briefAddDays(r.nextFrom, k);
    const evs = _bfEventsOn(iso);
    const due = _bfOpen().filter(i => effDate(i) === iso);
    days.push({ date: iso, events: evs.map(e => ({ minutes: e.minutes, type: e.type, allDay: e.allDay })), tasks: due.length, estimate: due.reduce((t, i) => t + (Number(i.estimate) || 0), 0), _evs: evs, _due: due });
  }
  const cap = reviewCapacity(days, 8 * 60);
  const grid = document.createElement('div'); grid.className = 'wk-cap';
  cap.forEach((c, k) => {
    const d = days[k];
    const col = document.createElement('div'); col.className = 'wk-day' + (c.warn ? ' warn' : '');
    const wd = _calParse(c.date).toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'short', day: 'numeric' });
    col.innerHTML = `<div class="wk-day-h"><b>${esc(wd)}</b><span class="num">${esc((c.booked / 60).toFixed(c.booked % 60 ? 1 : 0))} h</span></div>`
      + `<div class="wk-bar" title="${escAttr(`${Math.round(c.load * 100)}% of the day booked`)}"><i style="--pct:${Math.min(100, Math.round(c.load * 100))}%"></i></div>`
      + `<div class="wk-day-s">${esc(c.meetings)} meeting${c.meetings === 1 ? '' : 's'} · ${esc(c.tasks)} due</div>`
      + `<ul>${d._evs.filter(e => !e.allDay).slice(0, 4).map(e => `<li class="anim-hover-host">${animSceneHtml(e.type, { size: 'xs', hover: true })}<span>${esc(e.title)}</span></li>`).join('')}${d._evs.filter(e => !e.allDay).length > 4 ? `<li class="muted">+${d._evs.filter(e => !e.allDay).length - 4} more</li>` : ''}</ul>`;
    grid.appendChild(col);
  });
  b.appendChild(grid);
  const total = cap.reduce((t, c) => t + c.booked, 0);
  const busiest = cap.slice().sort((a, c) => c.load - a.load)[0];
  const note = document.createElement('p'); note.className = 'wk-note';
  note.textContent = `${Math.round(total / 60)} hours booked next week.${busiest && busiest.load > 0.75 ? ` ${_calParse(busiest.date).toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'long' })} is the fullest day: keep its tasks light.` : ' There is room for focused work.'}`;
  b.appendChild(note);
  if (!CalStore.data) { const c = document.createElement('div'); c.className = 'callout'; c.innerHTML = `${icon('plug')}<span>No calendar data yet: Update calendar first for an accurate picture.</span>`; b.appendChild(c); }
}
/* 5. three outcomes per area */
function _wkOutcomes(b, r, d) {
  _wkIntro(b, 'For each area, up to three outcomes that would make next week a good one. Leave an area empty to skip it.');
  const streams = Object.entries(STREAMS).filter(([, s]) => !s.archived).slice(0, 10);
  const open = _bfOpen();
  const grid = document.createElement('div'); grid.className = 'wk-out';
  for (const [sid, s] of streams) {
    const area = s.label || sid;
    const items = (d.outcomes[area] || ['', '', '']).concat(['', '', '']).slice(0, 3);
    const sug = open.filter(i => effStream(i) === sid && (effPriority(i) === 'p1' || (effDate(i) && effDate(i) <= r.nextTo))).slice(0, 3).map(i => effTitle(i));
    const box = document.createElement('div'); box.className = 'wk-area';
    box.innerHTML = `<div class="wk-area-h">${_homeStreamHtml(sid)}</div>`;
    items.forEach((v, k) => {
      const inp = document.createElement('input'); inp.className = 'control control-sm'; inp.maxLength = 300; inp.value = v;
      inp.placeholder = sug[k] ? `e.g. ${sug[k].slice(0, 70)}` : `Outcome ${k + 1}`;
      inp.setAttribute('aria-label', `${area}: outcome ${k + 1}`);
      inp.oninput = () => { d.outcomes[area] = (d.outcomes[area] || ['', '', '']).slice(); d.outcomes[area][k] = inp.value; _wkSaveDraft(); };
      box.appendChild(inp);
    });
    grid.appendChild(box);
  }
  b.appendChild(grid);
}
/* 6. wins and stats */
function _wkStats(r) {
  const tasks = getAllItems().map(i => ({ id: i.id, title: effTitle(i), stream: (STREAMS[effStream(i)] || {}).label || effStream(i) || 'No stream' }));
  return reviewWeekStats({ from: r.from, to: r.to, tasks, completions: state.completionLog || {}, activity: state.taskActivity || {}, dayOf: (ms) => Clock.parts(Number(ms)).iso });
}
function _wkWins(b, r, d) {
  const st = _wkStats(r);
  const top = document.createElement('div'); top.className = 'wk-tiles';
  top.innerHTML = `<div class="wk-tile"><b class="num">${esc(st.completed)}</b><span>tasks completed</span></div><div class="wk-tile${st.slipped.length ? ' warn' : ' ok'}"><b class="num">${esc(st.slipped.length)}</b><span>deadlines moved later</span></div>`;
  const money = document.createElement('div'); money.className = 'wk-tile';
  money.innerHTML = '<span class="skeleton skeleton-text" style="width:80px"></span>';
  top.appendChild(money);
  b.appendChild(top);
  briefLoadMoney().then(m => {
    if (m && m.available && m.week && typeof m.week.total === 'number') {
      const diff = typeof m.week.avg === 'number' && m.week.avg > 0 ? Math.round((m.week.total - m.week.avg) / m.week.avg * 100) : null;
      const span = m.week.from && m.week.to ? `${_calFmt(m.week.from, { day: 'numeric', month: 'short' })}–${_calFmt(m.week.to, { day: 'numeric', month: 'short' })}` : 'last full week';
      money.innerHTML = `<b class="num">${esc(_bfMoneyFmt(m.week.total, m.currency))}</b><span>spent ${esc(span)}${diff !== null ? ` · ${diff >= 0 ? '+' : ''}${diff}% vs your usual week` : ''}</span>`;
    } else money.innerHTML = `${icon('wallet')}<span>No finance data</span>`;
  });
  const per = document.createElement('div'); per.className = 'wk-per';
  const max = Math.max(1, ...st.perStream.map(x => x.n));
  per.innerHTML = `<div class="wk-sub"><b>Completed per area</b></div>` + (st.perStream.length ? st.perStream.map(x => `<div class="wk-ps"><span class="wk-ps-l">${esc(x.stream)}</span><span class="wk-ps-b"><i style="--pct:${Math.round(x.n / max * 100)}%"></i></span><span class="num">${esc(x.n)}</span></div>`).join('') : '<div class="wk-none">Nothing completed in this week yet.</div>');
  b.appendChild(per);
  const sl = document.createElement('div');
  sl.innerHTML = `<div class="wk-sub"><b>What slipped, and why</b></div>` + (st.slipped.length ? `<ul class="wk-list">${st.slipped.slice(0, 10).map(x => `<li class="wk-row"><div class="ev-d-b"><div class="ev-d-t">${esc(x.title)}</div><div class="ev-d-s"><span>${esc(x.from)} → ${esc(x.to)}${x.moves > 1 ? ` (moved ${esc(x.moves)} times)` : ''}</span><span class="wk-why">${esc(x.reason)}</span></div></div></li>`).join('')}</ul>` : '<div class="wk-none">No deadline moved later this week.</div>');
  b.appendChild(sl);
  const w = document.createElement('label'); w.className = 'field wk-wins';
  w.innerHTML = '<span class="field-label">Wins worth remembering (one per line)</span>';
  const ta = document.createElement('textarea'); ta.className = 'control'; ta.rows = 3; ta.maxLength = 3000; ta.value = d.wins || '';
  ta.oninput = () => { d.wins = ta.value; _wkSaveDraft(); };
  w.appendChild(ta);
  b.appendChild(w);
}
/* 7. AI summary, notes and save */
function _wkFacts(r, d) {
  const st = _wkStats(r);
  return {
    week: `${r.from} to ${r.to}`, completed: st.completed, perArea: st.perStream.slice(0, 10),
    slipped: st.slipped.slice(0, 8).map(x => ({ title: x.title.slice(0, 120), reason: x.reason.slice(0, 120), moves: x.moves })),
    outcomesNextWeek: Object.entries(d.outcomes).map(([area, items]) => ({ area, items: items.filter(Boolean).map(s => s.slice(0, 160)) })).filter(o => o.items.length),
    wins: String(d.wins || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 10),
    overdueNow: _bfOpen().filter(i => effDate(i) && effDate(i) < todayStr()).length,
  };
}
function _wkFinish(b, r, d) {
  _wkIntro(b, 'Optionally let Claude sum the week up, add a note for yourself, and save. Saved reviews are in History.');
  const ai = document.createElement('section'); ai.className = 'bf-ai wk-ai';
  ai.setAttribute('data-requires', 'claude'); ai.setAttribute('data-requires-soft', '');
  ai.innerHTML = `<div class="bf-ai-h">${icon('sparkles', 'i-sm')}<span class="overline">Summary</span><span class="spacer"></span></div><p class="bf-ai-t${d.summary ? '' : ' muted'}"></p>`;
  const t = ai.querySelector('.bf-ai-t');
  t.textContent = d.summary || 'Optional: a few honest lines about the week, written by Claude from the numbers above.';
  const gen = _wkBtn(d.summary ? 'Rewrite' : 'Write summary', 'sparkles', async () => {
    if (_wk.summaryLoading) return;
    _wk.summaryLoading = true; t.innerHTML = '<span class="skeleton skeleton-text" style="width:90%"></span>';
    try {
      const j = await _bfPost('/api/brief/summary', { kind: 'week', date: r.from, facts: _wkFacts(r, d), regenerate: true });
      d.summary = j.text || ''; _wkSaveDraft(); t.classList.remove('muted'); briefTypeText(t, d.summary);
    } catch (e) { t.textContent = e.status === 503 ? 'Connect Claude for a written summary.' : 'The summary could not be written just now.'; }
    _wk.summaryLoading = false;
  });
  if (!briefPrefs().ai) ai.hidden = true;
  ai.querySelector('.bf-ai-h').appendChild(gen);
  b.appendChild(ai);
  const n = document.createElement('label'); n.className = 'field';
  n.innerHTML = '<span class="field-label">Notes for next week</span>';
  const ta = document.createElement('textarea'); ta.className = 'control'; ta.rows = 4; ta.maxLength = 4000; ta.value = d.notes || '';
  ta.oninput = () => { d.notes = ta.value; _wkSaveDraft(); };
  n.appendChild(ta);
  b.appendChild(n);
  const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary btn-lg wk-save';
  save.innerHTML = icon('circle-check') + '<span>Save this review</span>';
  save.onclick = async () => {
    const st = _wkStats(r);
    const op = {
      op: 'review.save', kind: 'week', date: r.from,
      outcomes: Object.entries(d.outcomes).map(([area, items]) => ({ area: area.slice(0, 80), items: items.map(s => String(s || '').trim()).filter(Boolean).slice(0, 3) })).filter(o => o.items.length).slice(0, 20),
      wins: String(d.wins || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 30),
      slipped: st.slipped.slice(0, 50).map(x => ({ taskId: x.id, title: x.title.slice(0, 300), reason: x.reason.slice(0, 300) })),
      notes: d.notes || '', ...(d.summary ? { summary: d.summary } : {}),
      stats: { completed: st.completed, slipped: st.slipped.length, perStream: st.perStream.slice(0, 30).map(x => ({ stream: String(x.stream).slice(0, 80), n: x.n })), spent: _bf.money && _bf.money.week ? _bf.money.week.total : null, spentAvg: _bf.money && _bf.money.week ? _bf.money.week.avg : null },
    };
    if (await reviewSave(op, 'Weekly review saved')) {
      d.done.finish = true; _wkSaveDraft();
      try { localStorage.removeItem(_wkDraftKey(r.from)); } catch (e) { /* ignore */ }
      if (typeof animBurst === 'function') animBurst(save, 'celebration');
      state.lastReviewPrompt = Date.now(); saveUI();
      setTimeout(() => setView('home:history'), 700);
    }
  };
  b.appendChild(save);
}

/* ============================================================
   HISTORY
   ============================================================ */
const _hist = { snaps: null, at: 0, open: null };
function historyRender(container) {
  const root = document.createElement('div'); root.className = 'hist';
  root.innerHTML = `<div class="wk-head"><div><div class="overline">Home</div><h1>History</h1><p class="muted">Your weekly reviews, evening recaps and the mornings you opened.</p></div></div>`;
  const list = document.createElement('div'); list.className = 'hist-list';
  root.appendChild(list);
  container.appendChild(root);
  const paint = () => {
    list.innerHTML = '';
    const items = [];
    for (const r of (state.reviews || [])) if (r && r.date) items.push({ date: r.date, kind: r.kind === 'week' ? 'week' : 'evening-review', r });
    (state.weeklyReviews || []).forEach((r, i) => { const date = r.weekOf || (r.ts ? Clock.parts(new Date(r.ts).getTime()).iso : null); if (date) items.push({ date, kind: 'legacy', r, i }); });
    for (const s of (_hist.snaps || [])) if (!(s.kind === 'evening' && items.some(x => x.kind === 'evening-review' && x.date === s.date))) items.push({ date: s.date, kind: 'snap-' + s.kind, s });
    items.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind));
    if (!items.length) { mountEmptyState(list, { icon: 'history', title: 'Nothing here yet', text: 'Open Home in the morning, finish a day or save a weekly review and it will show up here.', actions: [{ label: 'Weekly review', icon: 'calendar-range', primary: true, run: () => setView('home:week') }] }); return; }
    let month = '';
    for (const it of items.slice(0, 200)) {
      const mo = _calParse(it.date).toLocaleDateString(APP_CONFIG.locale || undefined, { month: 'long', year: 'numeric' });
      if (mo !== month) { month = mo; const h = document.createElement('div'); h.className = 'hist-month overline'; h.textContent = mo; list.appendChild(h); }
      list.appendChild(_histRow(it));
    }
  };
  paint();
  if (_serverAvailable && (!_hist.snaps || Date.now() - _hist.at > 60000)) {
    _bfJson('/api/brief/history?limit=120').then(j => { _hist.snaps = j.snapshots || []; _hist.at = Date.now(); if (list.isConnected) paint(); }).catch(() => {});
  }
}
function _histRow(it) {
  const row = document.createElement('article'); row.className = 'card hist-row k-' + it.kind;
  const day = _calParse(it.date).toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const KIND = { week: ['Weekly review', 'calendar-range'], 'evening-review': ['Finished the day', 'sunset'], legacy: ['Weekly review (old)', 'calendar-range'], 'snap-brief': ['Morning', 'sunrise'], 'snap-evening': ['Evening recap', 'sunset'] }[it.kind] || ['Review', 'history'];
  let sub = '', detail = '';
  if (it.kind === 'week') {
    const r = it.r;
    sub = [r.stats && typeof r.stats.completed === 'number' ? `${r.stats.completed} done` : '', (r.outcomes || []).length ? `${r.outcomes.reduce((t, o) => t + o.items.length, 0)} outcomes` : '', r.stats && r.stats.slipped ? `${r.stats.slipped} slipped` : ''].filter(Boolean).join(' · ');
    detail = (r.summary ? `<p class="hist-ai">${esc(r.summary)}</p>` : '')
      + ((r.outcomes || []).length ? `<div class="hist-sec"><b>Outcomes</b>${r.outcomes.map(o => `<div class="hist-out"><span class="hist-area">${esc(o.area)}</span><ul>${o.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}</div>` : '')
      + ((r.wins || []).length ? `<div class="hist-sec"><b>Wins</b><ul>${r.wins.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '')
      + ((r.slipped || []).length ? `<div class="hist-sec"><b>Slipped</b><ul>${r.slipped.slice(0, 10).map(x => `<li>${esc(x.title)}${x.reason ? ` <span class="muted">· ${esc(x.reason)}</span>` : ''}</li>`).join('')}</ul></div>` : '')
      + (r.notes ? `<div class="hist-sec"><b>Notes</b><p>${esc(r.notes)}</p></div>` : '');
  } else if (it.kind === 'evening-review') {
    const r = it.r;
    const n = (r.done || []).filter(x => x.kind !== 'event' && x.kind !== 'subtask').length;
    sub = [`${n} done`, r.rolled ? `${r.rolled} rolled over` : '', r.stats && r.stats.streak >= 2 ? `${r.stats.streak}-day streak` : ''].filter(Boolean).join(' · ');
    detail = (r.summary ? `<p class="hist-ai">${esc(r.summary)}</p>` : '') + ((r.done || []).length ? `<ul class="hist-done">${r.done.slice(0, 20).map(x => `<li>${icon(x.kind === 'event' ? 'calendar-clock' : x.kind === 'subtask' ? 'list-checks' : 'check', 'i-xs')}<span>${esc(x.title)}</span></li>`).join('')}</ul>` : '')
      + ((r.top3 || []).length ? `<div class="hist-sec"><b>Top 3 for the next day</b><ul>${r.top3.map(id => { const t = getItem(id); return `<li>${esc(t ? effTitle(t) : 'A task that no longer exists')}</li>`; }).join('')}</ul></div>` : '');
  } else if (it.kind === 'legacy') {
    const r = it.r;
    detail = [r.oneThing ? `<div class="hist-sec"><b>The one thing</b><p>${esc(r.oneThing)}</p></div>` : '', r.blocked ? `<div class="hist-sec"><b>Blocked</b><p>${esc(r.blocked)}</p></div>` : '', r.wins ? `<div class="hist-sec"><b>Wins</b><p>${esc(r.wins)}</p></div>` : ''].join('');
  } else {
    const s = it.s.summary || {};
    sub = it.kind === 'snap-brief' ? [s.stats, s.weather].filter(Boolean).join(' · ') : [typeof s.done === 'number' ? `${s.done} done` : '', s.rolled ? `${s.rolled} rolled over` : ''].filter(Boolean).join(' · ');
    detail = `<p>${esc(s.tagline || s.praise || '')}</p>${s.ai ? `<p class="hist-ai">${esc(s.ai)}</p>` : ''}<div class="hist-more" data-date="${escAttr(it.date)}" data-kind="${escAttr(it.kind.slice(5))}"></div>`;
  }
  const scene = it.kind === 'snap-brief' && it.s.summary && it.s.summary.headline ? it.s.summary.headline.type : it.kind.includes('evening') ? 'rest' : 'review';
  row.innerHTML = `<button type="button" class="hist-h">${animSceneHtml(scene, { size: 'sm', hover: true })}<span class="hist-k">${icon(KIND[1], 'i-sm')}<b>${esc(KIND[0])}</b></span><span class="hist-sub">${esc(sub)}</span><span class="spacer"></span><span class="hist-d">${esc(day)}</span>${icon('chevron-down', 'i-sm hist-chev')}</button><div class="hist-b" hidden>${detail || '<p class="muted">Nothing more was saved.</p>'}</div>`;
  row.classList.add('anim-hover-host');
  const key = it.kind + '|' + it.date;
  const b = row.querySelector('.hist-b');
  if (_hist.open === key) { b.hidden = false; row.classList.add('open'); }
  row.querySelector('.hist-h').onclick = () => {
    b.hidden = !b.hidden; row.classList.toggle('open', !b.hidden); _hist.open = b.hidden ? null : key;
    const more = b.querySelector('.hist-more');
    if (!b.hidden && more && !more.dataset.loaded) {
      more.dataset.loaded = '1';
      _bfJson(`/api/brief/snapshot?date=${encodeURIComponent(more.dataset.date)}&kind=${encodeURIComponent(more.dataset.kind)}`).then(sn => {
        const ev = (sn.events || []).slice(0, 12), fc = (sn.focus || sn.done || []).slice(0, 8);
        more.innerHTML = (ev.length ? `<div class="hist-sec"><b>${sn.kind === 'brief' ? 'The day' : 'Meetings'}</b><ul class="hist-done">${ev.map(e => `<li>${animSceneHtml(e.type, { size: 'xs' })}<span>${esc(e.allDay ? 'all day' : e.start || '')} ${esc(e.title)}</span></li>`).join('')}</ul></div>` : '')
          + (fc.length ? `<div class="hist-sec"><b>${sn.kind === 'brief' ? 'Focus' : 'Done'}</b><ul class="hist-done">${fc.map(f => `<li>${animSceneHtml(f.type || 'task', { size: 'xs' })}<span>${esc(f.title)}</span></li>`).join('')}</ul></div>` : '');
      }).catch(() => { more.textContent = ''; });
    }
  };
  return row;
}
