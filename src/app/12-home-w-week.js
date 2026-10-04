/* ============================================================
   HOME widget "week": This week. Owner: HB3 (schedule, week, countdowns).
   CSS: 13-home-w-schedule.css. Events: 12-home-cal.js (read-only).

   Seven day columns for the next 7 days, starting today (today tinted,
   aria-current="date"; weekends with muted headers). Each day:
     the header ("Thu 8" and how many things are due),
     a 4 px load bar (hours of events against an 8 h day),
     what is due: dated top-bar countdowns (amber, a flag), tasks (stream
       dot and title; drag one onto another day to move it), birthdays (a
       small scene, muted); L shows 2 and Full 4, then "+N more" (the day);
     under a hairline, the day's events ("10:30 Coffee"; L 3, Full 4, then
       "+N more"), or "Free day" when the calendar has nothing.
   Today also shows "N overdue" (opens Today).
   Sizes: L (two thirds: titles wrap to 2 lines) and Full (one line each,
   more of them). Narrow (a phone, or under 640 px of its own width): the
   strip scrolls sideways with snap, 104 px columns, fading at the right.
   Drop to reschedule: while any Home task is dragged (a Focus row, or a task
   here), each day is a drop target ("Move to Thu 8"); dropping writes the
   date (one undo step, homeReschedule) and says so. Dropping on the day it
   already has does nothing.
   Empty (nothing at all in the 7 days): short columns and one hint line.
   Once per entry: the load bars grow on the widget's first paint only; new
   items that arrive later (a save, live sync) rise in (ctx.enterNew).
   ============================================================ */
registerHomeWidget({
  id: 'week', title: 'This week', icon: 'calendar-range', order: 80,
  description: 'The next seven days: what is due, countdowns and events. Drop a task on a day to move it',
  sizes: ['l', 'full'], defaultSize: 'l',                                // L + Waiting on (S) share a row
  render(el, ctx) { return _hwkRender(el, ctx); },
});

const _HWK_DAY_MIN = 8 * 60;              // a "full" day of events for the load bar

/**
 * PURE: the next `days` days. o: {start, days, tasks:[{id, title, date, time, prio, color}],
 * overdue, countdowns:[{id, label, date, color, icon}], eventsOn(iso) -> homeCalEvents-like}
 * -> [{iso, k, today, weekend, dow, dn, due:[{kind:'cd'|'task'|'bday', ...}], events:[timed],
 *      allDay:[], loadMin, overdue}]  (due: countdowns, then tasks by priority and time, then birthdays)
 */
function homeWeekModel(o) {
  const days = Math.max(1, Math.min(14, Number(o.days) || 7));
  const PO = { p1: 0, p2: 1, p3: 2, p0: 3 };
  const out = [];
  for (let k = 0; k < days; k++) {
    const iso = _homeAddDays(o.start, k);
    const [y, mo, d] = iso.split('-').map(Number);
    const dow = new Date(y, mo - 1, d).getDay();
    const evs = typeof o.eventsOn === 'function' ? (o.eventsOn(iso) || []) : [];
    const bdays = evs.filter(e => e.type === 'birthday');
    const timed = evs.filter(e => !e.allDay && !e.bg && e.type !== 'birthday');
    const allDay = evs.filter(e => e.allDay && !e.bg && e.type !== 'birthday');
    const tasks = (o.tasks || []).filter(t => t.date === iso)
      .sort((a, b) => ((PO[a.prio] ?? 3) - (PO[b.prio] ?? 3)) || String(a.time || '99').localeCompare(String(b.time || '99')) || String(a.title).localeCompare(String(b.title)));
    const cds = (o.countdowns || []).filter(c => c.date === iso);
    const loadMin = timed.reduce((n, e) => n + Math.max(0, Math.min(e.end, 24 * 60) - Math.max(e.start, 0)), 0);
    out.push({
      iso, k, today: k === 0, weekend: dow === 0 || dow === 6, dow, dn: d,
      due: [...cds.map(c => Object.assign({ kind: 'cd' }, c)), ...tasks.map(t => Object.assign({ kind: 'task' }, t)), ...bdays.map(e => ({ kind: 'bday', id: e.id, title: e.title, type: e.type }))],
      events: timed, allDay, loadMin, overdue: k === 0 ? Number(o.overdue) || 0 : 0,
    });
  }
  return out;
}

function _hwkRender(el, ctx) {
  const today = todayStr();
  const cal = homeCalStatus(() => { if (typeof state !== 'undefined' && state.view === 'home') homeRerenderWidget('week'); });
  const open = getAllItems().filter(i => statusOf(i.id) !== 'done');
  const overdue = open.filter(i => { const d = effDate(i); return d && d < today; }).length;
  const tasks = open.filter(i => effDate(i)).map(i => {
    const st = STREAMS[effStream(i)];
    return { id: i.id, title: effTitle(i), date: effDate(i), time: i.dueTime || '', prio: effPriority(i), color: st && st.color ? st.color : '', stream: st ? st.label || '' : '' };
  });
  const countdowns = (typeof tbList === 'function' ? tbList() : [])
    .filter(w => w && typeof TB_TYPES !== 'undefined' && TB_TYPES[w.type] && TB_TYPES[w.type].dated && w.date && w.type !== 'countup')
    .map(w => ({ id: w.id, label: w.label || TB_TYPES[w.type].label, date: w.date, color: w.color }));
  const week = homeWeekModel({ start: today, days: 7, tasks, overdue, countdowns, eventsOn: cal.ok ? homeCalEvents : null });
  const full = ctx.size === 'full';
  const maxDue = full ? 4 : 2, maxEv = full ? 4 : 3;
  const dueN = week.reduce((n, d) => n + d.due.filter(x => x.kind !== 'bday').length, 0);
  const empty = !week.some(d => d.due.length || d.events.length || d.allDay.length) && !overdue;

  const card = document.createElement('section');
  card.className = 'card home-card hwk' + (full ? ' is-full' : '') + (empty ? ' is-empty' : '');
  card.innerHTML = `<div class="card-h">${icon('calendar-range')}<h3>This week</h3><span class="n">${esc('next 7 days' + (dueN ? ` · ${dueN} due` : ''))}</span><span class="spacer"></span>`
    + `<button type="button" class="btn btn-ghost btn-sm" data-act="upcoming"><span>Upcoming</span>${icon('arrow-right')}</button></div><div class="card-b hwk-b"></div>`;
  el.appendChild(card);
  const body = card.querySelector('.hwk-b');
  const scroll = document.createElement('div'); scroll.className = 'hwk-scroll';
  const strip = document.createElement('div'); strip.className = 'hw-week';
  scroll.appendChild(strip); body.appendChild(scroll);
  for (const d of week) strip.insertAdjacentHTML('beforeend', _hwkDayHtml(d, { maxDue, maxEv, cal, empty }));
  if (empty) body.insertAdjacentHTML('beforeend', `<p class="hwk-hint">${icon('info', 'i-xs')}<span>Deadlines and countdowns for the next seven days land here. Drag a Focus task onto a day to move it.</span></p>`);
  homeGrowEntering(card, 'week', ctx.firstPaint);

  card.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act], .hw-item[data-id], [data-cd], [data-bday], .hw-day');
    if (!t || !card.contains(t)) return;
    if (t.dataset.act === 'upcoming') { setView('week'); return; }
    if (t.dataset.act === 'overdue') { setView('today'); return; }
    if (t.dataset.act === 'day') { setView('day:' + t.dataset.day); return; }
    if (t.matches('.hw-item[data-id]')) { ctx.openTask(t.dataset.id, t); return; }
    if (t.dataset.cd) { if (typeof openCountdownEditor === 'function') openCountdownEditor(t.dataset.cd); return; }
    if (t.dataset.bday !== undefined) { homeCalOpenEvent(t.dataset.bday, t); return; }
    if (t.matches('.hw-day')) setView('day:' + t.dataset.dropDate);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = e.target;
    if (t.matches && (t.matches('.hw-item[data-id], [data-cd], [data-bday]') || t.matches('.hw-day'))) { e.preventDefault(); t.click(); }
  });
  ctx.enterNew(strip.querySelectorAll('.hw-item[data-id], .hw-cd[data-cd]'), (x) => x.dataset.id || x.dataset.cd);
  if (!ctx.editing) ctx.sortable(strip, {
    items: '.hw-item[data-id]', reorder: false, dropTargets: '.hw-day[data-drop-date]', compactLift: _homeDragPill,
    onDropTarget: (id, t) => homeReschedule(id, t.dataset.dropDate),
  });
  return true;
}

function _hwkWeekday(iso, k) {
  if (k === 0) return 'Today';
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(APP_CONFIG.locale || undefined, { weekday: 'short' }); } catch (e) { return ''; }
}
function _hwkDayHtml(d, o) {
  const wd = _hwkWeekday(d.iso, d.k);
  const label = d.k === 0 ? 'Today' : `${wd} ${d.dn}`;
  const dueTasks = d.due.filter(x => x.kind !== 'bday').length;
  const shown = d.due.slice(0, o.maxDue), more = d.due.length - shown.length;
  const items = shown.map(x => {
    if (x.kind === 'cd') return `<div class="hw-cd" role="button" tabindex="0" data-cd="${escAttr(x.id)}" title="${escAttr(x.label + ' · countdown')}">${icon('flag')}<span>${esc(x.label)}</span></div>`;
    if (x.kind === 'bday') return `<div class="hw-bd anim-hover-host" role="button" tabindex="0" data-bday="${escAttr(x.id || '')}" title="${escAttr(x.title)}">${homeScene(x.type, { size: 'dense', hover: true })}<span>${esc(x.title)}</span></div>`;
    return `<div class="hw-item p-${escAttr(x.prio)}" role="button" tabindex="0" data-id="${escAttr(x.id)}" data-flip="${escAttr('wk:' + x.id)}" title="${escAttr(x.title + (x.time ? ' · ' + x.time : '') + (x.stream ? ' · ' + x.stream : ''))}">`
      + `<i class="hw-sd" style="--c:${escAttr(homeCalColor(x.color, 'var(--fg-subtle)'))}" aria-hidden="true"></i><span class="hw-it">${esc(x.title)}</span></div>`;
  }).join('');
  const over = d.overdue ? `<button type="button" class="hw-over" data-act="overdue">${icon('circle-alert')}<span>${esc(d.overdue)} overdue</span></button>` : '';
  const moreBtn = more > 0 ? `<button type="button" class="hw-more" data-act="day" data-day="${escAttr(d.iso)}">+${more} more</button>` : '';
  const evRows = [...d.allDay.map(e => ({ t: 'all day', e })), ...d.events.map(e => ({ t: homeHM(e.start), e }))];
  const evShown = evRows.slice(0, o.maxEv), evMore = evRows.length - evShown.length;
  const evs = !o.cal.ok || o.empty ? ''
    : evRows.length ? `<div class="hw-evs">${evShown.map(x => `<div class="hw-ev" title="${escAttr(`${x.t} · ${x.e.title}`)}"><time class="num">${esc(x.t)}</time><span>${esc(x.e.title)}</span></div>`).join('')}${evMore > 0 ? `<div class="hw-ev is-more">+${evMore} more</div>` : ''}</div>`
    : '<div class="hw-evs is-free"><span>Free day</span></div>';
  const loadPct = Math.round(Math.min(1, d.loadMin / _HWK_DAY_MIN) * 100);
  const load = `<div class="hw-load${d.loadMin >= 6 * 60 ? ' is-heavy' : ''}" title="${escAttr(d.loadMin ? homeDur(d.loadMin) + ' of events' : 'No events')}" aria-hidden="true"><i style="--load:${loadPct}%"></i></div>`;
  const aria = `${d.k === 0 ? 'Today, ' : ''}${wd} ${d.dn}: ${dueTasks} due${d.events.length ? `, ${d.events.length} event${d.events.length === 1 ? '' : 's'}` : ''}`;
  return `<div class="hw-day${d.today ? ' today' : ''}${d.weekend ? ' weekend' : ''}" data-drop-date="${escAttr(d.iso)}" tabindex="0" role="group" aria-label="${escAttr(aria)}"${d.today ? ' aria-current="date"' : ''}>`
    + `<div class="hw-h"><span class="hw-wd">${esc(d.k === 0 ? 'Today' : wd)}</span><b class="hw-dn num">${esc(d.dn)}</b>${dueTasks ? `<span class="hw-n num">${esc(dueTasks)}</span>` : ''}</div>`
    + load + `<div class="hw-items">${over}${items}${moreBtn}</div>`
    + `<div class="hw-drop" aria-hidden="true">${icon('calendar-check')}<span>Move to ${esc(label)}</span></div>`
    + evs + '</div>';
}
