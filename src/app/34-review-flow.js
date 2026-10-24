/* ============================================================
   THE GUIDED WEEKLY REVIEW (owner: Review, v2.16). Visible and quick:
     - a "Weekly review" button on every task list's header (rfHeaderButton,
       called by 31-task-views.js), with a menu of the other review tools;
     - Home's Review card on Friday to Sunday ("Weekly review · about 12 min",
       12-home-w-review.js);
     - the task views' Review mode (the stats page) opens with the review hub (rfReviewHub);
     - Shift+R anywhere, or "Weekly review" in the command palette.
   The flow, one task at a time in the card deck (34-flow.js):
     Unsorted (new, no date) -> Overdue -> This week (the next 7 days) -> Someday
     -> Waiting (time to chase), then a summary and a plan for next week: the
     load of each day, three things that matter, Plan my week, Save.
   It shares the Home Week tab's data (77-brief-review.js): the draft
   state.drafts['week:<from>'] (synced, so a review started on one computer
   resumes on another; d.flow = {decided: {taskId: kind}, counts, startedAt}),
   its outcomes, and review.save into state.reviews (+ triage counts).
   ============================================================ */
function rfReviewRange() {
  if (typeof _wkRange === 'function') return _wkRange();
  const r = reviewWeekRange(todayStr(), APP_CONFIG.weekStart || 'Mon');
  return { from: r.from, to: r.to, nextFrom: r.nextFrom, nextTo: r.nextTo };
}
function rfReviewDraft() {
  const d = typeof _wkDraft === 'function' ? _wkDraft() : { outcomes: {}, notes: '', summary: '', wins: '', done: {} };
  if (!d.flow || typeof d.flow !== 'object') d.flow = { decided: {}, counts: {}, startedAt: 0, minutes: 0 };
  if (!d.flow.decided || typeof d.flow.decided !== 'object') d.flow.decided = {};
  if (!d.flow.counts || typeof d.flow.counts !== 'object') d.flow.counts = {};
  if (!d.outcomes || typeof d.outcomes !== 'object') d.outcomes = {};
  return d;
}
function _rfDraftSave() { if (typeof _wkSaveDraft === 'function') _wkSaveDraft(); }
/** Weeks in a row with a saved review, up to this week (or last week while this one is not saved yet). */
function rfReviewStreak() {
  const saved = new Set((state.reviews || []).filter(x => x && x.kind === 'week' && x.date).map(x => x.date));
  let from = rfReviewRange().from;
  if (!saved.has(from)) from = briefAddDays(from, -7);
  let n = 0;
  while (saved.has(from) && n < 520) { n++; from = briefAddDays(from, -7); }
  return n;
}
function rfReviewSaved() { const r = rfReviewRange(); return (state.reviews || []).find(x => x && x.kind === 'week' && x.date === r.from) || null; }

function _rfAgo(ms) { const d = Math.max(0, Math.round((Date.now() - ms) / 864e5)); return d < 1 ? 'today' : d < 2 ? 'yesterday' : d < 14 ? `${d} days ago` : d < 60 ? `${Math.round(d / 7)} weeks ago` : `${Math.round(d / 30)} months ago`; }
function _rfReviewedSince(i, days) { const cut = Date.now() - days * 864e5; return ((state.taskActivity || {})[i.id] || []).some(a => a && a.type === 'review' && Number(a.ts) > cut); }
function _rfMoves(i) { return ((state.taskActivity || {})[i.id] || []).filter(a => a && a.type === 'date' && a.from && a.to && a.to > a.from).length; }

/** The review's stages with the tasks still to look at (the ones decided in this week's draft are skipped: resume). */
function rfReviewStages() {
  const today = todayStr(), end = _isoPlus(7);
  const dec = rfReviewDraft().flow.decided;
  const open = getAllItems().filter(i => rfIsOpen(i) && !dec[i.id]);
  const act = open.filter(i => !rfIsWaitingAny(i));
  const dueOf = (i) => effDate(i) || '';
  const recent = Date.now() - 30 * 864e5;
  const STD = ['keep', 'tomorrow', 'nextweek', 'wait', 'someday', 'done', 'drop', 'edit'];
  const unsorted = act.filter(i => !effDate(i) && !i.plannedFor && !rfIsSomeday(i) && statusOf(i.id) !== 'doing' && rfCreatedMs(i) >= recent && !_rfReviewedSince(i, 21))
    .sort((a, b) => rfCreatedMs(b) - rfCreatedMs(a)).slice(0, 30);
  const overdue = act.filter(i => dueOf(i) && dueOf(i) < today).sort((a, b) => dueOf(a).localeCompare(dueOf(b))).slice(0, 40);
  const inWeek = (v) => !!v && v >= today && v <= end;
  const week = act.filter(i => !(dueOf(i) && dueOf(i) < today) && (inWeek(dueOf(i)) || inWeek(i.plannedFor)))
    .sort((a, b) => ((a.plannedFor || dueOf(a)) || '').localeCompare((b.plannedFor || dueOf(b)) || '')).slice(0, 40);
  const someday = open.filter(i => rfIsSomeday(i) && !effDate(i) && !_rfReviewedSince(i, 28)).sort((a, b) => rfLastTouch(a) - rfLastTouch(b)).slice(0, 12);
  const chase = open.filter(i => rfIsWaitingAny(i) && rfNudgeDue(i)).slice(0, 15);
  const used = new Set();
  const take = (list) => list.filter(i => !used.has(i.id) && used.add(i.id)).map(i => i.id);
  return [
    { id: 'unsorted', label: 'Unsorted', icon: 'inbox', keys: STD, ids: take(unsorted), why: (i) => `added ${_rfAgo(rfCreatedMs(i))}, no date yet` },
    { id: 'overdue', label: 'Overdue', icon: 'circle-alert', keys: STD, labels: { keep: 'Keep the date' }, ids: take(overdue),
      why: (i) => { const n = -daysUntil(effDate(i)), m = _rfMoves(i); return `${n} day${n === 1 ? '' : 's'} late${m >= 2 ? ` · moved ${m} times already: drop it?` : ''}`; } },
    { id: 'week', label: 'This week', icon: 'calendar-range', keys: STD, ids: take(week),
      why: (i) => { const v = i.plannedFor && inWeek(i.plannedFor) ? i.plannedFor : effDate(i); const n = daysUntil(v); return `${i.plannedFor === v ? 'planned' : 'due'} ${n === 0 ? 'today' : n === 1 ? 'tomorrow' : rfDayName(v, true)}`; } },
    { id: 'someday', label: 'Someday', icon: 'cloud', keys: ['keep', 'tomorrow', 'nextweek', 'done', 'drop', 'bin', 'edit'], labels: { keep: 'Keep for someday', tomorrow: 'Do it tomorrow', nextweek: 'Next week' }, ids: take(someday),
      why: (i) => `parked, last touched ${_rfAgo(rfLastTouch(i))}` },
    { id: 'waiting', label: 'Waiting', icon: 'hourglass', keys: ['nudge', 'keep', 'done', 'unwait', 'drop', 'edit'], labels: { keep: 'Keep waiting', done: 'It arrived' }, ids: take(chase),
      why: (i) => { const p = rfWaitPerson(i); const n = rfDaysSince(rfWaitSince(i)); return `waiting on ${p ? p.name : 'someone'}${n ? ` for ${n} day${n === 1 ? '' : 's'}` : ''}`; } },
  ];
}
/** How many tasks the review will show, and about how long it takes (20 s a task + 3 min to plan). */
function rfReviewSize() {
  const stages = rfReviewStages();
  const n = stages.reduce((t, s) => t + s.ids.length, 0);
  return { n, minutes: Math.max(3, Math.round(n * 20 / 60 + 3)), stages };
}
/** Friday to Sunday, and the week's review not saved yet. */
function rfReviewDueNow() {
  const dow = Clock.parts(Clock.now()).dow;
  return (dow === 5 || dow === 6 || dow === 0) && !rfReviewSaved();
}

function rfReviewStart() {
  const stages = rfReviewStages();
  const d = rfReviewDraft();
  if (!d.flow.startedAt) { d.flow.startedAt = Date.now(); _rfDraftSave(); }
  rfDeckOpen({
    title: 'Weekly review', reason: 'Weekly review', stages, finishLabel: 'Plan next week',
    onDecide(id, kind) {
      const f = rfReviewDraft().flow;
      const prev = f.decided[id];
      if (prev) f.counts[prev] = Math.max(0, (f.counts[prev] || 1) - 1);
      f.decided[id] = kind; f.counts[kind] = (f.counts[kind] || 0) + 1;
      const keys = Object.keys(f.decided); if (keys.length > 600) for (const k of keys.slice(0, keys.length - 600)) delete f.decided[k];
      _rfDraftSave();
    },
    onUndo(id, kind, prev) {
      const f = rfReviewDraft().flow;
      if (kind === 'edit') return;
      f.counts[kind] = Math.max(0, (f.counts[kind] || 1) - 1);
      if (prev) { f.decided[id] = prev; f.counts[prev] = (f.counts[prev] || 0) + 1; } else delete f.decided[id];
      _rfDraftSave();
    },
    finish: rfReviewFinish,
    onClose(ctx) { const f = rfReviewDraft().flow; f.minutes = (f.minutes || 0) + (ctx.decided ? ctx.minutes : 0); _rfDraftSave(); renderMain(); },
  });
}

/* ---------- the end: summary + a plan for next week ---------- */
function rfReviewFinish(el, ctx) {
  const d = rfReviewDraft(), r = rfReviewRange();
  const counts = d.flow.counts || {};
  const sorted = Object.values(counts).reduce((t, n) => t + (Number(n) || 0), 0);
  const st = typeof _wkStats === 'function' ? _wkStats(r) : { completed: 0, slipped: [] };
  const art = typeof animSceneHtml === 'function' ? animSceneHtml(sorted ? 'celebration' : 'review', { size: 'hero', once: true }) : '';
  const mins = (d.flow.minutes || 0) + (ctx.decided ? ctx.minutes : 0);
  el.innerHTML = `<div class="rf-end-hero">${art}</div><div class="rf-end-h"><div class="overline">Week of ${esc(_rfShort(r.from))}</div><h2>${sorted ? 'Your lists are sorted' : 'Nothing needed sorting'}</h2>`
    + `<p class="muted">${sorted ? `${esc(sorted)} task${sorted === 1 ? '' : 's'} decided${mins ? ` in about ${esc(mins)} min` : ''}` : 'Every list is already in order'}${st.completed ? ` · ${esc(st.completed)} done this week` : ''}${st.slipped && st.slipped.length ? ` · ${esc(st.slipped.length)} deadline${st.slipped.length === 1 ? '' : 's'} slipped` : ''}.</p></div>`
    + rfCountsHtml(counts);
  const streak = rfReviewStreak(), savedNow = !!rfReviewSaved();
  const nextStreak = savedNow ? streak : streak + 1;
  if (nextStreak >= 2) el.insertAdjacentHTML('beforeend', `<div class="rf-streak">${icon('flame', 'i-sm')}<span>${savedNow ? `${esc(streak)} weeks in a row` : `Save it for ${esc(nextStreak)} weeks in a row`}</span></div>`);
  // Next week: each day's load against your capacity.
  const plan = document.createElement('section'); plan.className = 'rf-end-plan';
  plan.innerHTML = `<div class="rf-sub"><b>Next week</b><span class="muted">${esc(_rfShort(r.nextFrom))} – ${esc(_rfShort(r.nextTo))} · booked time and planned work against ${esc(rfCapacityHours())} h a day</span></div>`;
  plan.appendChild(rfCapacityStrip(r.nextFrom, 7, { compact: true }));
  el.appendChild(plan);
  // Three things that would make it a good week (the draft's outcomes, area "Focus").
  const focus = document.createElement('section'); focus.className = 'rf-end-focus';
  focus.innerHTML = '<div class="rf-sub"><b>Three things that would make next week a good one</b></div>';
  const vals = (d.outcomes.Focus || ['', '', '']).concat(['', '', '']).slice(0, 3);
  const sug = getAllItems().filter(i => rfIsOpen(i) && !rfIsWaiting(i) && (effPriority(i) === 'p1' || (effDate(i) && effDate(i) >= r.nextFrom && effDate(i) <= r.nextTo))).sort((a, b) => (PRIORITY_ORDER[effPriority(a)] - PRIORITY_ORDER[effPriority(b)]) || String(effDate(a) || '9').localeCompare(String(effDate(b) || '9'))).slice(0, 3).map(effTitle);
  vals.forEach((v, k) => {
    const inp = document.createElement('input'); inp.className = 'control control-sm'; inp.maxLength = 300; inp.value = v;
    inp.placeholder = sug[k] ? `e.g. ${String(sug[k]).slice(0, 70)}` : `Outcome ${k + 1}`;
    inp.setAttribute('aria-label', `Next week: outcome ${k + 1}`);
    inp.oninput = () => { const dd = rfReviewDraft(); dd.outcomes.Focus = (dd.outcomes.Focus || ['', '', '']).slice(); dd.outcomes.Focus[k] = inp.value; _rfDraftSave(); };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const nx = focus.querySelectorAll('input')[k + 1]; if (nx) nx.focus(); else save.focus(); } };
    focus.appendChild(inp);
  });
  el.appendChild(focus);
  const bar = document.createElement('div'); bar.className = 'rf-end-bar';
  const planBtn = document.createElement('button'); planBtn.type = 'button'; planBtn.className = 'btn btn-secondary';
  planBtn.innerHTML = icon('calendar-days') + '<span>Plan my week</span><kbd class="kbd">P</kbd>';
  planBtn.onclick = () => { ctx.close(); rfPlanWeekOpen({ from: r.nextFrom }); };
  const hist = document.createElement('button'); hist.type = 'button'; hist.className = 'btn btn-ghost';
  hist.innerHTML = icon('calendar-range') + '<span>Full review (wins, outcomes)</span>';
  hist.onclick = () => { ctx.close(); setView('home:week'); };
  const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary';
  const saved = rfReviewSaved();
  save.innerHTML = icon('circle-check') + `<span>${saved ? 'Save again' : 'Save this review'}</span><kbd class="kbd">Enter</kbd>`;
  save.onclick = () => rfReviewSave(save, ctx);
  bar.append(hist, Object.assign(document.createElement('span'), { className: 'spacer' }), planBtn, save);
  el.appendChild(bar);
  ctx.enter(() => save.click());
  ctx.key('p', () => planBtn.click());
  setTimeout(() => { try { save.focus({ preventScroll: true }); } catch (e) {} }, 30);
}
async function rfReviewSave(btn, ctx) {
  if (btn.disabled) return;
  btn.disabled = true;
  const r = rfReviewRange(), d = rfReviewDraft();
  const st = typeof _wkStats === 'function' ? _wkStats(r) : { completed: 0, slipped: [], perStream: [] };
  const c = d.flow.counts || {};
  const n = (k) => Math.max(0, Math.round(Number(c[k]) || 0));
  const money = typeof _bf !== 'undefined' && _bf && _bf.money && _bf.money.week ? _bf.money.week : null;
  const op = {
    op: 'review.save', kind: 'week', date: r.from,
    outcomes: Object.entries(d.outcomes || {}).map(([area, items]) => ({ area: String(area).slice(0, 80), items: (Array.isArray(items) ? items : []).map(s => String(s || '').trim()).filter(Boolean).slice(0, 3) })).filter(o => o.items.length).slice(0, 20),
    wins: String(d.wins || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, 30),
    slipped: (st.slipped || []).slice(0, 50).map(x => ({ taskId: x.id, title: String(x.title).slice(0, 300), reason: String(x.reason || '').slice(0, 300) })),
    notes: d.notes || '', ...(d.summary ? { summary: d.summary } : {}),
    stats: { completed: st.completed || 0, slipped: (st.slipped || []).length, perStream: (st.perStream || []).slice(0, 30).map(x => ({ stream: String(x.stream).slice(0, 80), n: x.n })), spent: money ? money.total : null, spentAvg: money ? money.avg : null },
    triage: { reviewed: Object.values(c).reduce((t, v) => t + (Number(v) || 0), 0), kept: n('keep'), moved: n('tomorrow') + n('nextweek'), waiting: n('wait'), someday: n('someday'), done: n('done'), dropped: n('drop'), binned: n('bin'), nudged: n('nudge'), minutes: Math.max(0, Math.round((d.flow.minutes || 0) + (ctx && ctx.decided ? ctx.minutes : 0))) },
  };
  const was = rfReviewSaved() ? rfReviewStreak() : rfReviewStreak() + 1;
  const ok = typeof reviewSave === 'function' ? await reviewSave(op, was >= 2 ? `Weekly review saved: ${was} weeks in a row` : 'Weekly review saved: see you next week') : false;
  btn.disabled = false;
  if (!ok) return;
  if (typeof animBurst === 'function') try { animBurst(btn, 'celebration'); } catch (e) {}
  if (typeof draftDel === 'function' && typeof _wkDraftKey === 'function') draftDel(_wkDraftKey(r.from));
  state.lastReviewPrompt = Date.now(); saveUI();
  setTimeout(() => { if (ctx) ctx.close(); render(); }, 700);
}

/* ---------- the header button + its menu ---------- */
/** Make sure the task list header has the Weekly review button (31-task-views.js calls this on every task view). */
function rfHeaderButton() {
  const host = document.getElementById('view-controls');
  if (!host) return;
  let g = document.getElementById('rf-head');
  if (!g) {
    g = document.createElement('div'); g.id = 'rf-head'; g.className = 'rf-head';
    const main = document.createElement('button'); main.type = 'button'; main.className = 'btn btn-secondary rf-head-main'; main.dataset.tip = 'One task at a time: keep, move, wait, drop'; main.dataset.kbd = 'Shift+R';
    main.innerHTML = icon('calendar-check') + '<span>Weekly review</span><i class="rf-head-dot" aria-hidden="true"></i>';
    main.onclick = () => rfReviewStart();
    const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-secondary rf-head-more'; more.setAttribute('aria-label', 'More review tools'); more.setAttribute('aria-haspopup', 'menu');
    more.innerHTML = icon('chevron-down', 'i-sm');
    more.onclick = () => openMenu(more, rfToolsMenu(), { align: 'end', width: 270 });
    g.append(main, more);
    const before = document.getElementById('display-btn');
    if (before && before.parentNode === host) host.insertBefore(g, before); else host.appendChild(g);
  }
  // A dot when the review is due (Friday to Sunday, not saved yet).
  g.classList.toggle('is-due', rfReviewDueNow());
}
function rfToolsMenu() {
  const left = typeof rfSweepTasks === 'function' ? rfSweepTasks().length : 0;
  const wait = rfWaitingTasks(), due = wait.filter(rfNudgeDue).length;
  const stale = rfStaleTasks(rfStaleDays()).length;
  const size = rfReviewSize();
  return [
    { label: `Weekly review · about ${size.minutes} min`, icon: 'calendar-check', kbd: 'Shift+R', run: () => rfReviewStart() },
    { label: left ? `Today → Tomorrow (${left} left)` : 'Today → Tomorrow', icon: 'sunset', kbd: 'Shift+T', run: () => rfSweepOpen() },
    { label: 'Plan my week', icon: 'calendar-days', kbd: 'Shift+P', run: () => rfPlanWeekOpen() },
    'sep',
    { label: `Waiting (${wait.length}${due ? ` · ${due} to nudge` : ''})`, icon: 'hourglass', run: () => setView('waiting') },
    { label: stale ? `Clean up: ${stale} untouched for ${rfStaleDays()} days` : 'Clean up stale tasks', icon: 'archive', run: () => rfCleanupOpen() },
    { label: 'Someday list', icon: 'cloud', run: () => setView('tag:' + RF_SOMEDAY_TAG) },
    'sep',
    { label: 'Review stats', icon: 'list-checks', run: () => { state.viewMode = 'review'; saveUI(); if (!isTaskView(state.view)) setView('today'); else render(); } },
  ];
}

/* ---------- the review hub at the top of the Review mode (31-task-views.js) ---------- */
function rfReviewHub() {
  const size = rfReviewSize();
  const saved = rfReviewSaved();
  const d = rfReviewDraft();
  const sorted = Object.values(d.flow.counts || {}).reduce((t, n) => t + (Number(n) || 0), 0);
  const hub = document.createElement('section'); hub.className = 'rf-hub';
  const hero = document.createElement('div'); hero.className = 'card rf-hub-hero' + (rfReviewDueNow() ? ' is-due' : '');
  const art = typeof animSceneHtml === 'function' ? animSceneHtml('review', { size: 'xl', hover: true }) : '';
  const line = saved ? `Saved ${esc(new Date(saved.savedAt).toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'short', day: 'numeric', month: 'short' }))}${size.n ? ` · ${esc(size.n)} new to look at` : ''}`
    : sorted ? `${esc(sorted)} sorted so far · ${esc(size.n)} to go` : `${esc(size.n)} task${size.n === 1 ? '' : 's'} to look at, one at a time`;
  hero.innerHTML = `<div class="rf-hub-art anim-hover-host">${art}</div><div class="rf-hub-b"><div class="overline">Weekly review · about ${esc(size.minutes)} min</div><h2>${saved ? 'This week is reviewed' : sorted ? 'Pick up where you left off' : 'Clear your head for next week'}</h2><p class="muted">${line}</p>`
    + `<div class="rf-hub-steps">${rfReviewStreak() >= 2 ? `<span class="rf-pill rf-streak-pill">${icon('flame', 'i-xs')}<span>${esc(rfReviewStreak())}-week streak</span></span>` : ''}${size.stages.map(s => `<span class="rf-pill${s.ids.length ? '' : ' empty'}">${icon(s.icon, 'i-xs')}<span>${esc(s.label)}</span><b class="num">${esc(s.ids.length)}</b></span>`).join('')}</div></div>`;
  const go = document.createElement('button'); go.type = 'button'; go.className = 'btn btn-primary btn-lg rf-hub-go';
  go.innerHTML = icon(sorted && !saved ? 'arrow-right' : 'calendar-check') + `<span>${saved ? 'Review again' : sorted ? 'Resume' : 'Start the review'}</span><kbd class="kbd">Shift+R</kbd>`;
  go.onclick = () => rfReviewStart();
  hero.appendChild(go);
  hub.appendChild(hero);
  const tools = document.createElement('div'); tools.className = 'rf-hub-tools';
  const left = typeof rfSweepTasks === 'function' ? rfSweepTasks().length : 0;
  const wait = rfWaitingTasks(), due = wait.filter(rfNudgeDue).length;
  const blocked = getAllItems().filter(i => rfIsOpen(i) && rfIsBlocked(i)).length;
  const stale = rfStaleTasks(rfStaleDays()).length;
  const tool = (ic, title, sub, run, tone) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'card rf-tool' + (tone ? ' t-' + tone : '');
    b.innerHTML = `<span class="rf-tool-i">${icon(ic)}</span><span class="rf-tool-b"><b>${esc(title)}</b><span class="muted">${esc(sub)}</span></span>${icon('chevron-right', 'i-sm')}`;
    b.onclick = run; tools.appendChild(b);
  };
  tool('sunset', 'Today → Tomorrow', left ? `${left} left today: one key each` : 'Nothing left over today', () => rfSweepOpen(), left ? 'accent' : '');
  tool('calendar-days', 'Plan my week', 'Spread tasks over the days that have room', () => rfPlanWeekOpen());
  tool('hourglass', 'Waiting', wait.length ? `${wait.length} waiting${due ? ` · ${due} to nudge` : ''}` : 'Nobody to chase', () => setView('waiting'), due ? 'warn' : '');
  tool('archive', 'Clean up', stale ? `${stale} untouched for ${rfStaleDays()} days` : 'Nothing has gone stale', () => rfCleanupOpen(), stale ? 'warn' : '');
  if (blocked) tool('lock', 'Blocked', `${blocked} waiting for other tasks`, () => { state.viewMode = 'list'; saveUI(); setView('all'); setTimeout(() => { const s = document.getElementById('search-input'); if (s) { s.value = 'is:blocked'; s.dispatchEvent(new Event('input', { bubbles: true })); } }, 0); });
  hub.appendChild(tools);
  return hub;
}

/* ---------- keyboard + palette ---------- */
document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || !e.shiftKey || rfKeysBusy(e) || rfDeckIsOpen()) return;
  if (typeof state === 'undefined') return;
  if (e.key === 'R') { e.preventDefault(); rfReviewStart(); }
  else if (e.key === 'T' && (isTaskView(state.view) || String(state.view).startsWith('home'))) { e.preventDefault(); rfSweepOpen(); }
  else if (e.key === 'P' && (isTaskView(state.view) || String(state.view).startsWith('home'))) { e.preventDefault(); rfPlanWeekOpen(); }
});
registerCommand({ id: 'rf-weekly-review', label: 'Weekly review (one task at a time)', icon: 'calendar-check', kbd: 'Shift+R', group: 'Review', keywords: 'review weekly triage sort clean inbox overdue plan', run: () => rfReviewStart() });
registerCommand({ id: 'rf-sweep', label: 'Today → Tomorrow (end of day)', icon: 'sunset', kbd: 'Shift+T', group: 'Review', keywords: 'evening roll over leftover move tomorrow sweep wrap up', run: () => rfSweepOpen() });
registerCommand({ id: 'rf-plan-week', label: 'Plan my week', icon: 'calendar-days', kbd: 'Shift+P', group: 'Review', keywords: 'plan week spread capacity schedule days', run: () => rfPlanWeekOpen() });
registerCommand({ id: 'rf-waiting', label: 'Waiting on people', icon: 'hourglass', group: 'Review', keywords: 'waiting chase follow up nudge owe delegated', run: () => setView('waiting') });
registerCommand({ id: 'rf-cleanup', label: 'Clean up stale tasks', icon: 'archive', group: 'Review', keywords: 'stale old untouched clean tidy bin someday', run: () => rfCleanupOpen() });
