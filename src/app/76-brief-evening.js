/* ============================================================
   FINISH THE DAY (owner: Brief + Review): #view=home:evening (Home's Evening tab).
   Same style as the Morning brief: a recap of what got done (tasks,
   subtasks ticked today, meetings that happened) in a warm, specific
   voice; what slipped with one-click "tomorrow" or a new date; tomorrow's
   preview; "pick tomorrow's top 3" (planned for tomorrow + first in Home's
   Focus); an optional AI recap; a streak; an evening sky. "Done for
   today" saves the recap (actions op review.save, kind 'evening') and a
   snapshot for Review > History.
   Offered from config.brief.eveningHour (17:00) on Home and in the top bar.
   ============================================================ */
const _ev = { picked: null, pickedFor: '', introFor: '', savedFor: '' };
const EVENING_ROLL_REASON = 'Rolled over at the end of the day';

function _evTomorrow(d) { return Clock.addDays(Clock.parts(d ? d.getTime() : Clock.now()).iso, 1); }
function _evDayCounts() {
  const out = {};
  for (const arr of Object.values(state.completionLog || {})) for (const ts of (arr || [])) { const d = Clock.parts(Number(ts)).iso; out[d] = (out[d] || 0) + 1; }
  return out;
}
/** Everything the recap shows. */
function eveningModel() {
  const nowD = new Date(Clock.now()), date = todayStr(), now = _bfMin(nowD), tomorrow = _evTomorrow(nowD);
  const seen = new Set(), done = [];
  for (const [id, arr] of Object.entries(state.completionLog || {})) {
    for (const ts of (arr || [])) {
      if (Clock.parts(Number(ts)).iso !== date || seen.has(id)) continue;
      const it = getItem(id); if (!it) continue;
      seen.add(id); done.push({ i: it, ts: Number(ts), type: animForTask(it).type, prio: effPriority(it) });
    }
  }
  done.sort((a, b) => (PRIORITY_ORDER[a.prio] ?? 3) - (PRIORITY_ORDER[b.prio] ?? 3) || a.ts - b.ts);
  const subs = [];
  for (const it of getAllItems()) for (const s of effSubtasks(it)) if (s && s.done && s.doneAt && Clock.parts(Number(s.doneAt)).iso === date) subs.push({ i: it, s });
  const events = _bfEventsOn(date);
  const happened = events.filter(e => !e.allDay && e.end <= now && !e.free);
  const meetings = happened.filter(e => BRIEF_MEETING_TYPES.includes(e.type));
  const open = _bfOpen();
  const slipped = briefRollover(open.map(i => ({ id: i.id, title: effTitle(i), due: effDate(i), planned: i.plannedFor || null, done: false, priority: effPriority(i) })), date)
    .map(x => Object.assign(x, { i: getItem(x.id) })).filter(x => x.i);
  const tomEvents = _bfEventsOn(tomorrow);
  const tomTasks = open.filter(i => effDate(i) === tomorrow || (i.plannedFor && i.plannedFor === tomorrow));
  // Candidates for tomorrow's top 3: what slipped, what is due tomorrow, high priority, pinned, in progress.
  const cand = [];
  const add = (i, why) => { if (i && !cand.some(c => c.i.id === i.id)) cand.push({ i, why, type: animForTask(i).type }); };
  slipped.forEach(x => add(x.i, x.why === 'overdue' ? 'Overdue' : 'Slipped today'));
  tomTasks.forEach(i => add(i, 'Due tomorrow'));
  open.filter(i => statusOf(i.id) === 'doing').forEach(i => add(i, 'In progress'));
  open.filter(i => isPinned(i.id)).forEach(i => add(i, 'Pinned'));
  open.filter(i => effPriority(i) === 'p1').forEach(i => add(i, 'High priority'));
  const counts = _evDayCounts();
  const streak = briefStreak(counts, date);
  const week = reviewWeekRange(date, APP_CONFIG.weekStart || 'Mon');
  let thisWeek = 0, lastWeekSoFar = 0;
  const elapsed = briefDaysBetween(week.from, date);
  for (const [d, n] of Object.entries(counts)) {
    if (d >= week.from && d <= date) thisWeek += n;
    if (d >= week.prevFrom && d <= briefAddDays(week.prevFrom, elapsed)) lastWeekSoFar += n;
  }
  const rolledToday = Object.values(state.taskActivity || {}).reduce((t, list) => t + (list || []).filter(a => a && a.reason === EVENING_ROLL_REASON && Clock.parts(new Date(a.ts).getTime()).iso === date).length, 0);
  const w = _bfForcedWx(_bf.weather && _bf.weather.ok ? _bf.weather : null);
  return { date, nowD, now, tomorrow, done, subs, happened, meetings, slipped, tomEvents, tomTasks, cand: cand.slice(0, 12), streak, thisWeek, lastWeekSoFar, rolledToday, weather: w };
}
/** The warm, specific line (no exclamation marks, no cheese). */
function eveningPraise(m) {
  const n = m.done.length, k = m.subs.length, mt = m.meetings.length;
  if (!n && !k && !mt) return m.slipped.length ? 'A quieter day on the list. Pick what matters for tomorrow and let the rest wait.' : 'A quiet day. Rest counts too.';
  const top = m.done[0];
  const parts = [];
  if (n) parts.push(`You closed ${n} task${n === 1 ? '' : 's'}${top ? `, including “${effTitle(top.i)}”` : ''}`);
  if (k) parts.push(`ticked off ${k} step${k === 1 ? '' : 's'}`);
  if (mt) parts.push(`got through ${mt} meeting${mt === 1 ? '' : 's'}`);
  const list = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
  const lead = top && top.prio === 'p1' ? 'Good work today: the important one is done.' : n >= 5 ? 'A properly productive day.' : 'Good work today.';
  return `${lead} ${list.charAt(0).toUpperCase() + list.slice(1)}.`;
}

let _evRoot = null;
function eveningRender(container) {
  _animSyncRoot();
  if (CalStore && !CalStore.st.loaded && !CalStore.st.loading && _serverAvailable) CalStore.load().then(() => _evRepaint());
  if (!_bf.weather) briefLoadWeather().then(() => _evRepaint());
  const m = eveningModel();
  if (_ev.pickedFor !== m.date) { _ev.pickedFor = m.date; _ev.picked = (homeState().focusOrder || []).filter(id => m.cand.some(c => c.i.id === id)).slice(0, 3); }
  const intro = _ev.introFor !== m.date && animEnabled();
  _ev.introFor = m.date;
  const root = document.createElement('div');
  root.className = 'brief evening' + (intro ? ' intro' : '');
  root.style.setProperty('--bf-accent', 'var(--sw-orange)');
  _evRoot = root;
  root.appendChild(_evHero(m, intro));
  root.appendChild(_evAiCard(m));
  const grid = document.createElement('div'); grid.className = 'bf-grid'; grid.dataset.region = 'cards';
  _evFill(grid, m);
  root.appendChild(grid);
  root.appendChild(_evFooter(m));
  if (typeof storyMountEntry === 'function') storyMountEntry(root, 'evening');   // 79-story-engine.js
  container.appendChild(root);
  if (intro) {
    root.querySelectorAll('.bf-stat b[data-n]').forEach((b, i) => setTimeout(() => briefCountUp(b, Number(b.dataset.n) || 0), 450 + i * 120));
    setTimeout(() => root.classList.remove('intro'), 2600);
  }
  animActivate(root);
  _evLoadSummary(m, false);
  return root;
}
function eveningUnmount() { _evRoot = null; }
function _evRepaint() {
  if (!_evRoot || !_evRoot.isConnected) return;
  const m = eveningModel();
  _evRoot.classList.remove('intro');
  const h = _evRoot.querySelector('[data-region="hero"]'); if (h) h.replaceWith(_evHero(m, false));
  const g = _evRoot.querySelector('[data-region="cards"]'); if (g) { g.innerHTML = ''; _evFill(g, m); }
  animActivate(_evRoot);
}
function _evFill(grid, m) {
  const main = document.createElement('div'); main.className = 'bf-col bf-col-main';
  const side = document.createElement('div'); side.className = 'bf-col bf-col-side';
  main.append(_evDone(m), _evSlipped(m));
  side.append(_evTomorrowCard(m), _evPick(m));
  grid.append(main, side);
}

function _evHero(m, intro) {
  const w = m.weather;
  let tod = briefTod(w, m.nowD);
  if (tod === 'day' || tod === 'morning') tod = 'dusk';          // the recap is an evening scene
  const hero = document.createElement('section');
  hero.className = 'bf-hero' + (tod !== 'dusk' ? ' on-dark' : ' on-dusk');
  hero.dataset.region = 'hero'; hero.dataset.tod = tod;
  const cond = w && w.current ? w.current.cond : 'none';
  const name = userName();
  const greet = m.done.length || m.meetings.length ? (name ? `Nice work today, ${name}` : 'Nice work today') : (name ? `Winding down, ${name}` : 'Winding down');
  const stats = [
    { k: 'tasks', n: m.done.length, one: 'task done', many: 'tasks done' },
    ...(m.subs.length ? [{ k: 'steps', n: m.subs.length, one: 'step', many: 'steps' }] : []),
    ...(m.meetings.length ? [{ k: 'meetings', n: m.meetings.length, one: 'meeting', many: 'meetings' }] : []),
  ];
  // the plain task tick is the fallback scene: a ticked-off list says 'done' better
  const heroType = m.done[0] ? (m.done[0].type === 'task' ? 'review' : m.done[0].type) : m.meetings[0] ? m.meetings[0].type : 'rest';
  const wk = m.thisWeek - m.lastWeekSoFar;
  hero.innerHTML = briefSkyHtml(cond === 'clear' || cond === 'partly' ? cond : cond === 'none' ? 'none' : cond, tod, { setting: true }) + `
    <div class="bf-hero-in">
      <div class="bf-hero-l">
        <div class="bf-date overline">${esc(m.nowD.toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'long', day: 'numeric', month: 'long', timeZone: Clock.zone() }))} · Finish the day</div>
        <h1 class="bf-greet">${intro ? kineticWordsHtml(greet, 120) : esc(greet)}</h1>
        <p class="bf-tagline">${esc(eveningPraise(m))}</p>
        <div class="bf-stats">${stats.map(s => `<span class="bf-stat"><b class="num" data-n="${escAttr(s.n)}">${intro ? '0' : esc(s.n)}</b> ${esc(s.n === 1 ? s.one : s.many)}</span>`).join('<span class="bf-dot" aria-hidden="true">·</span>')}</div>
        <div class="bf-next">${m.streak.days >= 2 ? `<span class="bf-pill">${icon('flame', 'i-sm')}<span>${esc(m.streak.days)}-day streak</span></span>` : ''}<span class="bf-pill subtle">${icon('chart-column', 'i-sm')}<span>${esc(`${m.thisWeek} done this week${wk > 0 ? `, ${wk} more than last week by now` : wk < 0 ? '' : ', level with last week'}`)}</span></span></div>
      </div>
      <div class="bf-hero-r">
        <figure class="bf-headline">${animSceneHtml(heroType, { size: 'hero', hero: true })}<figcaption><span class="overline">${esc(m.done[0] ? 'Done today' : m.meetings[0] ? 'Today' : 'Evening')}</span><b>${esc(m.done[0] ? effTitle(m.done[0].i) : m.meetings[0] ? m.meetings[0].title : 'Time to rest')}</b></figcaption></figure>
      </div>
    </div>`;
  return hero;
}

function _evDone(m) {
  const { card, body } = _bfCardShell('done', 'Done today', 'circle-check', { n: (m.done.length + m.subs.length + m.happened.length) || '' });
  if (!m.done.length && !m.subs.length && !m.happened.length) { _bfEmpty(body, 'sun', 'Nothing ticked off yet', 'That is fine. Tomorrow is a fresh page.'); return card; }
  const ul = document.createElement('ul'); ul.className = 'ev-done';
  let i = 0;
  const shown = _ev.allDone ? m.done : m.done.slice(0, 6);
  for (const d of shown) {
    const li = document.createElement('li'); li.className = 'anim-hover-host'; li.style.setProperty('--i', i++);
    li.innerHTML = `${animSceneHtml(d.type, { size: 'sm', hover: i > 3 })}<div class="ev-d-b"><div class="ev-d-t">${esc(effTitle(d.i))}</div><div class="ev-d-s">${_homeStreamHtml(effStream(d.i))}<span>${esc(new Date(d.ts).toLocaleTimeString(APP_CONFIG.locale || undefined, { hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}), timeZone: Clock.zone() }))}</span></div></div><span class="ev-tick">${icon('check', 'i-sm')}</span>`;
    li.onclick = () => homeOpenSheet(d.i.id, li);
    ul.appendChild(li);
  }
  if (m.done.length > shown.length) {
    const li = document.createElement('li'); li.className = 'ev-more';
    li.appendChild(_wkBtn(`Show all ${m.done.length} tasks`, 'chevron-down', () => { _ev.allDone = true; _evRepaint(); }));
    ul.appendChild(li);
  }
  if (m.subs.length) {
    const li = document.createElement('li'); li.className = 'ev-subs'; li.style.setProperty('--i', i++);
    const byTask = new Map();
    for (const x of m.subs) { if (!byTask.has(x.i.id)) byTask.set(x.i.id, { i: x.i, list: [] }); byTask.get(x.i.id).list.push(x.s); }
    li.innerHTML = `<span class="ev-subs-ic">${icon('list-checks', 'i-sm')}</span><div class="ev-d-b">${[...byTask.values()].slice(0, 4).map(g => `<div class="ev-d-t">${esc(g.list.map(s => s.title).slice(0, 3).join(' · '))}${g.list.length > 3 ? ` +${g.list.length - 3}` : ''}</div><div class="ev-d-s">steps of ${esc(effTitle(g.i))}</div>`).join('')}</div>`;
    ul.appendChild(li);
  }
  for (const e of m.happened.slice(0, 6)) {
    const li = document.createElement('li'); li.className = 'anim-hover-host ev-meet'; li.style.setProperty('--i', i++);
    li.innerHTML = `${animSceneHtml(e.type, { size: 'sm', hover: true })}<div class="ev-d-b"><div class="ev-d-t">${esc(e.title)}</div><div class="ev-d-s"><span>${esc(_bfTimeTxt(e.start))}–${esc(_bfTimeTxt(e.end))}</span></div></div>`;
    ul.appendChild(li);
  }
  body.appendChild(ul);
  return card;
}

function _evRoll(id, field, date, reason) {
  const it = getItem(id); if (!it) return;
  if (field === 'planned') { const from = it.plannedFor || null; it.plannedFor = date; logActivity(id, 'plan', { from, to: date, reason }); }
  else { const from = it.dueDate || null; if (from !== date) logActivity(id, 'date', { from, to: date, reason }); it.dueDate = date; }
}
function eveningRollAll() {
  const m = eveningModel();
  if (!m.slipped.length) return;
  for (const x of m.slipped) _evRoll(x.id, x.field, m.tomorrow, EVENING_ROLL_REASON);
  saveData(); render();
  toast(`${m.slipped.length} moved to tomorrow`, { kind: 'ok', icon: 'sunrise', action: { label: 'Undo', run: () => undo() } });
}
function _evSlipped(m) {
  const { card, body } = _bfCardShell('slipped', 'What slipped', 'redo-2', { n: m.slipped.length || '' });
  if (!m.slipped.length) { _bfEmpty(body, 'check-check', 'Nothing slipped', 'Everything due today is done or has a later date.'); return card; }
  const all = document.createElement('button'); all.type = 'button'; all.className = 'btn btn-secondary btn-sm';
  all.innerHTML = icon('sunrise', 'i-sm') + '<span>All to tomorrow</span>';
  all.onclick = () => eveningRollAll();
  card.querySelector('.card-h').appendChild(all);
  const ul = document.createElement('ul'); ul.className = 'ev-slip';
  for (const x of m.slipped.slice(0, 12)) {
    const li = document.createElement('li');
    const why = x.why === 'overdue' ? `${x.days}d overdue` : x.why === 'due' ? 'due today' : 'planned today';
    li.innerHTML = `<span class="hw-p ${escAttr(effPriority(x.i))}"></span><div class="ev-d-b"><div class="ev-d-t">${esc(effTitle(x.i))}</div><div class="ev-d-s"><span class="${x.why === 'overdue' ? 'danger' : ''}">${esc(why)}</span></div></div>`;
    const tom = document.createElement('button'); tom.type = 'button'; tom.className = 'btn btn-ghost btn-sm';
    tom.innerHTML = icon('sunrise', 'i-sm') + '<span>Tomorrow</span>';
    tom.onclick = (e) => { e.stopPropagation(); _evRoll(x.id, x.field, m.tomorrow, EVENING_ROLL_REASON); saveData(); render(); toast('Moved to tomorrow', { kind: 'ok', action: { label: 'Undo', run: () => undo() } }); };
    const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'btn btn-ghost btn-sm btn-icon'; pick.setAttribute('aria-label', 'Pick a date'); pick.setAttribute('data-tip', 'Pick a date');
    pick.innerHTML = icon('calendar', 'i-sm');
    pick.onclick = (e) => { e.stopPropagation(); openDueDatePopover(pick, { title: 'Move to', onPick: (d) => { if (!d) return; _evRoll(x.id, 'due', d, 'Moved at the end of the day'); saveData(); render(); } }); };
    li.append(tom, pick);
    li.onclick = () => homeOpenSheet(x.id, li);
    ul.appendChild(li);
  }
  body.appendChild(ul);
  return card;
}

function _evTomorrowCard(m) {
  const { card, body } = _bfCardShell('tomorrow', 'Tomorrow', 'sunrise', { action: { label: 'Calendar', run: () => setView('calendar:week') } });
  const w = m.weather && m.weather.tomorrow;
  if (w) {
    const wx = document.createElement('div'); wx.className = 'ev-tw';
    wx.innerHTML = `${briefWxIcon(w.cond, true)}<span><b>${esc(w.label)}</b> · ${esc(_bfDeg(w.hi))} / ${esc(_bfDeg(w.lo))}${typeof w.rainChance === 'number' ? ` · ${esc(w.rainChance)}% rain` : ''}</span>`;
    body.appendChild(wx);
  }
  const timed = m.tomEvents.filter(e => !e.allDay).sort((a, b) => a.start - b.start);
  const allDay = m.tomEvents.filter(e => e.allDay);
  const ul = document.createElement('ul'); ul.className = 'ev-tom';
  for (const e of allDay.slice(0, 3)) { const li = document.createElement('li'); li.className = 'anim-hover-host'; li.innerHTML = `${animSceneHtml(e.type, { size: 'xs', hover: true })}<span class="ev-t-time">all day</span><span>${esc(e.title)}</span>`; ul.appendChild(li); }
  for (const e of timed.slice(0, 6)) { const li = document.createElement('li'); li.className = 'anim-hover-host'; li.innerHTML = `${animSceneHtml(e.type, { size: 'xs', hover: true })}<span class="ev-t-time num">${esc(_bfTimeTxt(e.start))}</span><span>${esc(e.title)}</span>`; ul.appendChild(li); }
  for (const i of m.tomTasks.slice(0, 4)) { const li = document.createElement('li'); li.className = 'anim-hover-host'; li.innerHTML = `${animSceneHtml(animForTask(i).type, { size: 'xs', hover: true })}<span class="ev-t-time">due</span><span>${esc(effTitle(i))}</span>`; li.onclick = () => homeOpenSheet(i.id, li); ul.appendChild(li); }
  if (!ul.children.length) _bfEmpty(body, 'sun', 'An open day tomorrow', 'Nothing booked and nothing due yet.');
  else body.appendChild(ul);
  if (timed[0]) { const f = document.createElement('div'); f.className = 'home-foot'; f.innerHTML = `${icon('clock')}<span>First thing: ${esc(_bfTimeTxt(timed[0].start))} ${esc(timed[0].title)}</span>`; body.appendChild(f); }
  return card;
}

function _evPick(m) {
  const { card, body } = _bfCardShell('pick', "Tomorrow's top 3", 'target', { n: `${(_ev.picked || []).length}/3` });
  if (!m.cand.length) { _bfEmpty(body, 'circle-check', 'Nothing to choose from', 'No open tasks need a slot tomorrow.'); return card; }
  const ul = document.createElement('ul'); ul.className = 'ev-pick';
  const picked = _ev.picked || [];
  const list = _ev.morePick ? m.cand : m.cand.filter((c, k) => k < 6 || picked.includes(c.i.id));
  for (const c of list) {
    const at = (_ev.picked || []).indexOf(c.i.id);
    const li = document.createElement('li'); li.className = at >= 0 ? 'on' : ''; li.tabIndex = 0; li.setAttribute('role', 'checkbox'); li.setAttribute('aria-checked', at >= 0 ? 'true' : 'false');
    li.innerHTML = `<span class="ev-pick-n num">${at >= 0 ? at + 1 : ''}</span><span class="ev-d-b"><span class="ev-d-t">${esc(effTitle(c.i))}</span><span class="ev-d-s">${esc(c.why)}</span></span>`;
    const toggle = () => {
      const cur = (_ev.picked || []).slice();
      const k = cur.indexOf(c.i.id);
      if (k >= 0) cur.splice(k, 1); else if (cur.length < 3) cur.push(c.i.id); else { toast('Three is the limit: untick one first.', {}); return; }
      _ev.picked = cur; _evRepaint();
    };
    li.onclick = toggle; li.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle(); } };
    ul.appendChild(li);
  }
  body.appendChild(ul);
  if (list.length < m.cand.length) body.appendChild(_wkBtn(`${m.cand.length - list.length} more to choose from`, 'chevron-down', () => { _ev.morePick = true; _evRepaint(); }));
  const set = document.createElement('button'); set.type = 'button'; set.className = 'btn btn-primary btn-sm ev-pick-go';
  set.innerHTML = icon('target', 'i-sm') + '<span>Make these tomorrow’s focus</span>';
  set.disabled = !(_ev.picked || []).length;
  set.onclick = () => eveningSetTop3(_ev.picked);
  body.appendChild(set);
  return card;
}
/** Plan the picked tasks for tomorrow and put them first in Home's Focus (one undo step). */
function eveningSetTop3(ids) {
  ids = (ids || []).filter(id => getItem(id)).slice(0, 3);
  if (!ids.length) return;
  const tom = _evTomorrow();
  for (const id of ids) { const it = getItem(id); const from = it.plannedFor || null; if (from !== tom) { it.plannedFor = tom; logActivity(id, 'plan', { from, to: tom, reason: "Tomorrow's top 3" }); } }
  const h = homeState();
  state.home = Object.assign({}, h, { focusOrder: [...ids, ...(h.focusOrder || []).filter(x => !ids.includes(x))].slice(0, 30) });
  saveData(); render();
  toast("Tomorrow's top 3 are set", { kind: 'ok', icon: 'target', action: { label: 'Undo', run: () => undo() } });
}

function _evAiCard(m) {
  const card = document.createElement('section');
  card.className = 'card bf-ai'; card.dataset.region = 'ai';
  card.setAttribute('data-requires', 'claude'); card.setAttribute('data-requires-soft', '');
  card.innerHTML = `<div class="bf-ai-h">${icon('sparkles', 'i-sm')}<span class="overline">Your day, in a few lines</span><span class="spacer"></span></div><p class="bf-ai-t muted"></p>`;
  const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
  b.innerHTML = icon('sparkles', 'i-sm') + '<span>Write my recap</span>';
  b.onclick = () => _evLoadSummary(eveningModel(), true);
  card.querySelector('.bf-ai-h').appendChild(b);
  if (!briefPrefs().ai) card.hidden = true;
  _evPaintAi(card, false);
  return card;
}
function _evPaintAi(card, typeIt) {
  card = card || (_evRoot && _evRoot.querySelector('[data-region="ai"]'));
  if (!card) return;
  const t = card.querySelector('.bf-ai-t');
  const s = _bf.summary.evening;
  if (s && s.date === todayStr() && s.text) { t.classList.remove('muted'); if (typeIt) briefTypeText(t, s.text); else t.textContent = s.text; }
  else if (_bf.summaryLoading.evening) t.innerHTML = '<span class="skeleton skeleton-text" style="width:90%"></span>';
  else t.textContent = (s && s.error) || 'An optional short recap written by Claude.';
}
function _evFacts(m) {
  return {
    date: m.date, done: m.done.slice(0, 15).map(d => ({ title: effTitle(d.i).slice(0, 140), priority: d.prio })), stepsDone: m.subs.length,
    meetings: m.happened.slice(0, 10).map(e => e.title.slice(0, 100)), slipped: m.slipped.slice(0, 10).map(x => ({ title: effTitle(x.i).slice(0, 120), why: x.why })),
    tomorrow: { first: m.tomEvents.filter(e => !e.allDay).sort((a, b) => a.start - b.start).slice(0, 4).map(e => `${_calHM(e.start)} ${e.title.slice(0, 80)}`), due: m.tomTasks.slice(0, 5).map(i => effTitle(i).slice(0, 100)) },
    streakDays: m.streak.days, doneThisWeek: m.thisWeek,
  };
}
function _evLoadSummary(m, generate) {
  if (!briefPrefs().ai || !_serverAvailable || _bf.summaryLoading.evening) return;
  const date = m.date;
  const cur = _bf.summary.evening;
  if (!generate && cur && cur.date === date) { _evPaintAi(null, false); return; }
  _bf.summaryLoading.evening = true; _evPaintAi(null, false);
  const p = generate ? _bfPost('/api/brief/summary', { kind: 'evening', date, facts: _evFacts(m), regenerate: !!(cur && cur.text) })
    : _bfJson(`/api/brief/summary?kind=evening&date=${date}`);
  p.then(j => { _bf.summary.evening = Object.assign({ date }, j); _bf.summaryLoading.evening = false; _evPaintAi(null, !!generate); })
    .catch(e => { _bf.summaryLoading.evening = false; _bf.summary.evening = { date, text: null, error: e.status === 503 ? 'Connect Claude for a written recap.' : 'The recap could not be written just now.' }; _evPaintAi(null, false); });
}

function _evFooter(m) {
  const f = document.createElement('div'); f.className = 'bf-foot';
  const save = document.createElement('button'); save.type = 'button'; save.className = 'btn btn-primary btn-lg bf-go';
  const saved = _ev.savedFor === m.date;
  save.innerHTML = icon(saved ? 'circle-check' : 'moon') + `<span>${saved ? 'Saved. Have a good evening' : 'Done for today'}</span>`;
  save.onclick = () => eveningSave();
  const back = document.createElement('button'); back.type = 'button'; back.className = 'btn btn-secondary btn-lg';
  back.innerHTML = '<span>Back to Home</span>'; back.onclick = () => setView('home');
  f.append(save, back);
  return f;
}
/** Save the recap (review.save kind 'evening') and the snapshot for History. */
async function eveningSave() {
  const m = eveningModel();
  const ai = _bf.summary.evening && _bf.summary.evening.date === m.date ? _bf.summary.evening.text : null;
  const op = {
    op: 'review.save', kind: 'evening', date: m.date,
    done: [...m.done.map(d => ({ taskId: d.i.id, title: effTitle(d.i).slice(0, 300), kind: 'task' })), ...m.subs.slice(0, 30).map(x => ({ taskId: x.i.id, title: String(x.s.title || '').slice(0, 300), kind: 'subtask' })), ...m.happened.slice(0, 20).map(e => ({ title: e.title.slice(0, 300), kind: 'event' }))].slice(0, 80),
    rolled: m.rolledToday, top3: (_ev.picked || []).filter(id => getItem(id)).slice(0, 3),
    stats: { completed: m.done.length, meetings: m.meetings.length, streak: m.streak.days },
    ...(ai ? { summary: ai } : {}),
  };
  const ok = await reviewSave(op, 'Recap saved. Have a good evening.');
  if (!ok) return;
  _ev.savedFor = m.date;
  _bfPost('/api/brief/snapshot', { date: m.date, kind: 'evening', snapshot: {
    summary: { praise: eveningPraise(m), done: m.done.length, steps: m.subs.length, meetings: m.meetings.length, slipped: m.slipped.length, rolled: m.rolledToday, streak: m.streak.days, ai },
    done: m.done.slice(0, 20).map(d => ({ id: d.i.id, title: effTitle(d.i), type: d.type })),
    meetings: m.happened.slice(0, 12).map(e => ({ title: e.title, type: e.type })),
    top3: (_ev.picked || []).map(id => { const it = getItem(id); return it ? { id, title: effTitle(it) } : null; }).filter(Boolean),
  } }).catch(() => {});
  if (typeof animBurst === 'function' && _evRoot) animBurst(_evRoot.querySelector('.bf-go'), 'celebration');
  _evRepaint();
  const f = _evRoot && _evRoot.querySelector('.bf-foot'); if (f) f.replaceWith(_evFooter(m));
}
