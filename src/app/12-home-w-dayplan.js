/* ============================================================
   HOME widget "dayplan": Plan my day (WIDGETS_CATALOGUE.md 3.3).
   OWNER: the "dayplan" widget builder (Phase 1, wave 2: built on W0-B's
   planned slots, working hours and 12-home-plan-logic.js). The pure rules
   are in 12-home-dayplan-logic.js (tests/home-w-dayplan.test.mjs); styles in
   13-home-w-dayplan.css.

   The job: does today's plan fit today's free time? If not, fix it in one click.
     M     the capacity bar ("Planned 4 h 10 in 3 h 20 free · 50 min over"; green
           under 85 %, amber, red over) and today's tasks (inViewScope 'today'), each
           with estimate chips 15/30/60/120 ("?" when unset), → Tomorrow and a menu
           (Plan at… the free gaps, remove the planned time, open, done).
     L     + the day on a two-lane timeline over the working hours: meetings above
           (grey), the plan below (planned slots dashed in the stream colour, the
           dashboard's own calendar blocks solid, due times), free gaps hatched, the
           past shaded, a now marker. The tasks with no time sit underneath: drag one
           onto the timeline to plan it there (15-minute snap; over a meeting or
           another block the ghost turns red and the drop is refused). A planned
           block drags to move. A free gap is a button: plan a task there, or block
           it in Google Calendar (S1: the event card, prefilled).
     Full  + a tray of tasks not on today yet (Focus, due this week) to drag in.
   Recommendations follow the user's rule (3 Oct): the main button OPENS the
   proposal prefilled (an inline panel with a selectList: untick, then Apply
   selected = one undo step); the small "✓" applies it as it is, at once, with
   Undo. Three of them: Auto-plan (homeAutoPlan over the free gaps; with
   "Book them in my calendar" the blocks become Google Calendar events, no
   guests, linked to their tasks: one Undo removes them all), Move N to
   tomorrow (when over: the lowest-priority tasks that are only planned, until
   the day fits; never a deadline) and Pull 3 from Focus (nothing planned yet).
   At L and Full, the first free stretch of 45 min+ carries S1's card
   (sgFreeSlotCard, surface 'dayplan'): Block opens the event card prefilled,
   ✓ books it, its receipt stays at the top (sgSurfaceReceipts).
   Deadlines: → Tomorrow on a task that is only planned moves the plan; on a task
   due today or overdue it says "Move deadline" (setDateWithReason, reason
   'over capacity'). Nothing moves a deadline silently.
   No calendar: free time = working hours minus timed tasks, with a hint.
   Motion: the capacity bar grows once per entry (homeGrowEntering); its length
   glides and its colour crossfades when the day changes; blocks and rows glide
   (data-flip); new ones rise (ctx.enterNew); reduced motion = instant.
   ============================================================ */
registerHomeWidget({
  id: 'dayplan', title: 'Plan my day', icon: 'gauge', order: 120, group: 'time',
  description: 'Does today’s plan fit your free time? Fix it in one click',
  sizes: ['m', 'l', 'full'], defaultSize: 'l', defaultHidden: true, fresh: true,
  aliases: ['day plan', 'plan my day', 'capacity', 'planner', 'day planner', 'time blocking'],
  defaults: { unestimated: 30, buffer: 5, book: false },
  emptyHint: 'Plans today’s tasks into your free time',
  sample(kit) { return _hdpSampleInput(kit); },
  available: () => true,
  render(el, ctx) { return _hdpRender(el, ctx); },
  settings(anchor, ctx) { _hdpSettings(anchor, ctx); },
  unmount() { _hdpUnmount(); },
});

const _HDP_ROWS = Object.freeze({ m: 6, l: 6, full: 8 });
const _HDP_TRAY = 8;
const _HDP_EST_LABEL = Object.freeze({ 15: '15', 30: '30', 60: '1 h', 120: '2 h' });
let _hdpPanel = null;          // the open proposal: {kind: 'auto'|'tomorrow'|'pull', day, slots?, frozen?}
let _hdpOpenId = '';           // the task whose card was opened from here (aria-current)
let _hdpAllRows = false;       // "Show N more" (until Home is left)
let _hdpLast = null;           // the capacity bar at the last paint: {colors, pct} (glide + crossfade)
let _hdpDrag = null;           // a drag onto / along the timeline
let _hdpBooking = null;        // {k, of}: blocks being booked in Google Calendar

function _hdpUnmount() {
  _hdpPanel = null; _hdpOpenId = ''; _hdpAllRows = false; _hdpLast = null; _hdpBooking = null;
  _hdpDragEnd(false);
}

/* ---------- gathering the day (page) ---------- */
function _hdpTaskInfo(i, rank) {
  return {
    id: i.id, title: String(effTitle(i) || ''), stream: effStream(i) || '', priority: effPriority(i),
    estimate: Number(i.estimate) > 0 ? Number(i.estimate) : null, due: effDate(i) || null, dueTime: i.dueTime || null,
    plannedFor: i.plannedFor || null, plannedTime: i.plannedTime || null, plannedMinutes: Number(i.plannedMinutes) > 0 ? Number(i.plannedMinutes) : null,
    doing: statusOf(i.id) === 'doing', pinned: typeof isPinned === 'function' && !!isPinned(i.id), focus: rank.has(i.id) ? rank.get(i.id) : -1,
  };
}
function _hdpFocusRank() {
  const rank = new Map();
  try { (typeof homeFocusTasks === 'function' ? homeFocusTasks(9) : []).forEach((x, n) => rank.set(x.i.id, n)); } catch (e) { /* no Focus */ }
  return rank;
}
/** {cal, input} for homeDayplanModel: today's timed events (own blocks apart), Today's tasks, the settings. */
function _hdpInput(ctx) {
  const today = todayStr();
  const p = ctx.prefs || homePrefs(ctx);
  const cal = homeCalStatus(() => { if (typeof state !== 'undefined' && state.view === 'home') homeRerenderWidget(ctx.id); });
  const events = [], own = [];
  if (cal.ok) {
    for (const e of homeCalEvents(today)) {
      if (e.allDay || e.bg) continue;
      const meta = state.eventMeta && state.eventMeta[e.id];
      if (meta && meta.origin) own.push({ id: e.id, title: e.title, start: e.start, end: e.end, taskId: meta.origin.taskId || (Array.isArray(meta.tasks) && meta.tasks[0]) || null });
      else events.push({ id: e.id, title: e.title, start: e.start, end: e.end, color: e.color });
    }
  }
  const rank = _hdpFocusRank();
  const tasks = [];
  for (const i of getAllItems()) {
    if (statusOf(i.id) === 'done' || !inViewScope(i, 'today', today)) continue;
    tasks.push(_hdpTaskInfo(i, rank));
  }
  return { cal, input: { today, nowMin: homeNowMin(), workHours: homeWorkHours(), events, own, tasks, unestimated: p.unestimated, buffer: p.buffer } };
}
/** The gallery's sample day (synthetic, relative to today). */
function _hdpSampleInput(kit) {
  const min = (iso) => { const p = Clock.parts(Date.parse(iso)); return p.h * 60 + p.mi; };   // wall minutes on the page's clock
  const t = Object.fromEntries((kit.tasks || []).map(x => [x.id, x]));
  const task = (id, extra) => Object.assign({ id, title: (t[id] && t[id].title) || id, stream: (t[id] && t[id].stream) || '', priority: (t[id] && t[id].priority) || 'p0',
    estimate: (t[id] && t[id].estimate) || null, due: null, dueTime: null, plannedFor: kit.today, plannedTime: null, plannedMinutes: null, doing: false, pinned: false, focus: -1 }, extra);
  return {
    today: kit.today, nowMin: 10 * 60 + 20, workHours: planWorkHours(null), own: [], unestimated: 30, buffer: 5,
    events: (kit.events || []).map(e => ({ id: e.id, title: e.title, start: min(e.start), end: min(e.end) })),
    tasks: [
      task('sample-1', { due: kit.today, plannedTime: '13:30', focus: 0 }),
      task('sample-2', { due: _homeAddDays(kit.today, -2), plannedFor: null, focus: 1 }),
      task('sample-5', { focus: 2 }),
      task('sample-3', { due: kit.tomorrow }),
      task('sample-4', { estimate: null }),
      task('sample-6', { estimate: null, priority: 'p0' }),
    ],
  };
}

/* ---------- render ---------- */
function _hdpRender(el, ctx) {
  const pv = !!ctx.preview;
  let cal = { ok: true }, input;
  if (pv) input = homeSample('dayplan');
  else ({ cal, input } = _hdpInput(ctx));
  if (!input) return false;
  const m = homeDayplanModel(input);
  const size = ctx.size === 'full' ? 'full' : ctx.size === 'm' ? 'm' : 'l';
  const wide = size !== 'm';
  const prefs = pv ? { unestimated: 30, buffer: 5, book: false } : ctx.prefs || homePrefs(ctx);
  if (!pv && _hdpOpenId && !(typeof tcIsOpen === 'function' && tcIsOpen())) _hdpOpenId = '';
  const panel = pv ? null : _hdpPanelNow(m, prefs);

  const card = document.createElement('section');
  card.className = `card home-card hdp hdp-${size}`;
  card.dataset.level = m.cap.level;
  card.dataset.sig = m.sig;
  card.dataset.day = m.today;
  card.innerHTML = `<div class="card-h hdp-h">${icon('gauge')}<h3>Plan my day</h3>${m.rows.length ? `<span class="n">${m.rows.length} today</span>` : ''}<span class="spacer"></span></div><div class="card-b hdp-b"></div>`;
  if (!pv && typeof homeSettingsButton === 'function' && !ctx.editing) card.querySelector('.hdp-h').appendChild(homeSettingsButton(ctx));
  el.appendChild(card);
  const body = card.querySelector('.hdp-b');
  const receipts = !pv && typeof sgSurfaceReceipts === 'function' ? sgSurfaceReceipts(body, 'dayplan') : null;

  body.appendChild(_hdpCapEl(m, ctx));
  const note = _hdpNoteHtml(m, cal);
  if (note) body.insertAdjacentHTML('beforeend', note);
  if (wide && !m.over) body.appendChild(_hdpTimelineEl(m, panel));
  if (panel) body.appendChild(_hdpPanelEl(m, ctx, panel, prefs));
  body.appendChild(_hdpListEl(m, ctx, size));
  if (size === 'full') { const tray = _hdpTrayEl(m); if (tray) body.appendChild(tray); }
  const acts = _hdpActionsEl(m, ctx, panel, prefs);
  if (acts) body.appendChild(acts);
  if (wide && !pv) _hdpGapCard(body, m, receipts);
  if (!pv && typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx, { date: m.today });

  _hdpMarkOpen(card);
  if (pv) return true;
  _hdpWire(card, m, ctx, prefs);
  if (typeof homeGrowEntering === 'function') homeGrowEntering(card, ctx.id, ctx.firstPaint);
  _hdpBarMotion(card, ctx.firstPaint);
  ctx.enterNew(card.querySelectorAll('.hdp-row[data-flip], .hdp-blk[data-flip], .hdp-ti[data-flip]'), (x) => x.dataset.flip);
  homeTick(ctx, () => _hdpTick(card, ctx));
  return true;
}

/* ---------- capacity ---------- */
function _hdpCapEl(m, ctx) {
  const c = m.cap, D = homeDayplanDur;
  const box = document.createElement('div'); box.className = `hdp-cap is-${c.level}`;
  const text = homeDayplanCapText(m);
  const track = Math.max(c.needMin, c.availMin, 1);
  const pct = (x) => Math.round((x / track) * 1000) / 10;
  const plan = pct(c.plannedMin), load = pct(c.loadMin), lim = pct(c.availMin);
  let html = `<div class="hdp-cap-t" data-cap-t aria-hidden="true">${_hdpCapTextHtml(m)}</div>`;
  if (!m.over) {
    html += `<div class="hdp-bar" role="img" data-cap-say aria-label="${escAttr(homeDayplanCapSay(m))}">`
      + `<span class="hdp-fills" style="width:${Math.min(100, plan + load)}%"><i class="hdp-fill is-plan" style="flex-grow:${c.plannedMin}"></i><i class="hdp-fill is-load" style="flex-grow:${c.loadMin}"></i></span>`
      + (c.over ? `<span class="hdp-lim" style="left:${lim}%" aria-hidden="true"></span>` : '') + '</div>';
    const parts = [];
    if (c.meetingMin) parts.push(`<span><i class="hdp-k is-meet"></i>Meetings ${esc(D(c.meetingMin))}</span>`);
    if (c.plannedMin) parts.push(`<span><i class="hdp-k is-plan"></i>Planned ${esc(D(c.plannedMin))}</span>`);
    if (c.loadMin) parts.push(`<span><i class="hdp-k is-load"></i>No time yet ${esc(D(c.loadMin))}</span>`);
    parts.push(`<span class="hdp-k-until">until ${esc(homeHM(m.end))}</span>`);
    html += `<div class="hdp-cap-k">${parts.join('')}</div>`;
  } else html = `<div class="hdp-cap-t is-over-day" data-cap-t>${icon('moon', 'i-xs')}<span>${esc(text)}</span></div>`;
  box.innerHTML = html;
  box.dataset.pct = String(Math.min(100, plan + load));
  return box;
}
function _hdpCapTextHtml(m) {
  const c = m.cap, D = homeDayplanDur;
  if (!c.needMin) return `<b>Nothing planned</b> · ${esc(D(c.availMin))} free`;
  const tail = c.over ? `<span class="hdp-over">${esc(D(c.overMin))} over</span>` : `<span class="hdp-spare">${esc(D(c.spareMin))} spare</span>`;
  return `<b>Planned ${esc(D(c.needMin))}</b> in ${esc(D(c.availMin))} free · ${tail}`;
}
/** The bar's length glides and its colour crossfades from the last paint (not on entry, not reduced). */
function _hdpBarMotion(card, entering) {
  const fills = [...card.querySelectorAll('.hdp-fill')];
  const wrap = card.querySelector('.hdp-fills');
  if (!wrap) return;
  const pct = Number(card.querySelector('.hdp-cap').dataset.pct) || 0;
  requestAnimationFrame(() => {
    if (!wrap.isConnected) return;
    const colors = fills.map(f => getComputedStyle(f).backgroundColor);
    const prev = _hdpLast;
    _hdpLast = { colors, pct };
    if (!prev || entering || card.classList.contains('is-entering') || !window.Motion || Motion.prefersReduced()) return;
    if (prev.pct !== pct) Motion.animate(wrap, [{ width: prev.pct + '%' }, { width: pct + '%' }], { duration: 420, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    fills.forEach((f, n) => { if (prev.colors[n] && prev.colors[n] !== colors[n]) Motion.animate(f, [{ backgroundColor: prev.colors[n] }, { backgroundColor: colors[n] }], { duration: 480, easing: 'ease-out' }); });
  });
}
function _hdpNoteHtml(m, cal) {
  const btn = (act, ic, label) => `<button type="button" class="hdp-note-btn" data-act="${act}">${icon(ic, 'i-xs')}<span>${esc(label)}</span></button>`;
  if (cal && cal.loading) return `<div class="hdp-note">${icon('clock', 'i-xs')}<span>Reading your calendar…</span></div>`;
  if (cal && cal.error) return `<div class="hdp-note">${icon('circle-alert', 'i-xs')}<span>Couldn’t read the calendar: free time counts your working hours only.</span>${btn('retry', 'refresh-cw', 'Retry')}</div>`;
  if (cal && (cal.none || cal.off)) return `<div class="hdp-note">${icon('plug', 'i-xs')}<span>Free time counts your working hours and timed tasks.</span>${cal.off ? '' : btn('connect', 'calendar-plus', 'Connect a calendar for real gaps')}</div>`;
  if (!m.work) return `<div class="hdp-note">${icon('sun', 'i-xs')}<span>Not one of your working days: planned with your usual hours (${esc(homeHM(m.start))}–${esc(homeHM(m.end))}).</span>${btn('hours', 'clock', 'Working hours')}</div>`;
  return '';
}

/* ---------- the timeline (L, Full) ---------- */
function _hdpColor(sid) { const s = typeof STREAMS !== 'undefined' ? STREAMS[sid] : null; return homeCalColor(s && s.color, 'var(--accent)'); }
function _hdpTimelineEl(m, panel) {
  const from = m.start, to = m.end;
  const span = Math.max(30, to - from);
  const pct = (min) => Math.max(0, Math.min(100, ((min - from) / span) * 100));
  const w = (a, b) => Math.max(0.6, pct(b) - pct(a));
  const now = m.nowMin;
  const box = document.createElement('div'); box.className = 'hdp-tl';
  box.dataset.from = from; box.dataset.to = to;
  box.setAttribute('role', 'group');
  box.setAttribute('aria-label', `Today from ${homeHM(from)} to ${homeHM(to)}`);
  const gaps = m.gaps.map(g => `<button type="button" class="hdp-gap" data-gap="${g.start}-${g.end}" data-min="${g.minutes}" style="left:${pct(g.start)}%;width:${w(g.start, g.end)}%" aria-label="${escAttr(`Free ${homeHM(g.start)} to ${homeHM(g.end)}, ${homeDayplanSayDur(g.minutes)}. Plan a task here`)}" data-tip="${escAttr(`Free ${homeHM(g.start)}–${homeHM(g.end)} · plan a task here`)}"><span></span></button>`).join('');
  const evs = m.events.map(e => `<button type="button" class="hdp-ev${e.past ? ' is-past' : ''}" data-ev="${escAttr(e.id)}" data-flip="hdp:${escAttr(e.key)}" style="left:${pct(e.start)}%;width:${w(e.start, e.end)}%" aria-label="${escAttr(`${homeHM(e.start)} to ${homeHM(e.end)}, ${e.title}, meeting`)}" data-tip="${escAttr(`${homeHM(e.start)}–${homeHM(e.end)} · ${e.title}`)}"><span>${esc(e.title)}</span></button>`).join('');
  const lane = m.lane.map(x => {
    const kind = x.kind === 'slot' ? 'planned' : x.kind === 'block' ? 'in your calendar' : 'due then';
    const cur = _hdpOpenId && x.taskId === _hdpOpenId;
    const drag = x.kind === 'slot' && !x.past ? ` data-drag="${escAttr(x.taskId)}"` : '';
    const ids = x.kind === 'block' ? `data-ev="${escAttr(x.eventId)}"` : `data-id="${escAttr(x.taskId)}"`;
    return `<button type="button" class="hdp-blk is-${x.kind}${x.past ? ' is-past' : ''}" ${ids}${drag} data-flip="hdp:${escAttr(x.key)}" style="left:${pct(x.start)}%;width:${w(x.start, x.end)}%;--c:${escAttr(_hdpColor(x.stream))}"${cur ? ' aria-current="true"' : ''}`
      + ` aria-label="${escAttr(`${homeHM(x.start)} to ${homeHM(x.end)}, ${x.title}, ${kind}`)}" data-tip="${escAttr(`${homeHM(x.start)}–${homeHM(x.end)} · ${x.title} (${kind})`)}"><span>${esc(x.title)}</span></button>`;
  }).join('');
  const props = panel && panel.kind === 'auto' && panel.slots ? panel.slots.map(s => `<span class="hdp-prop" data-prop="${escAttr(s.id)}" style="left:${pct(s.start)}%;width:${w(s.start, s.end)}%" aria-hidden="true"><span>${esc(s.title)}</span></span>`).join('') : '';
  const ticks = [];
  const stepH = span > 12 * 60 ? 3 : span > 7 * 60 ? 2 : 1;
  for (let h = Math.ceil(from / 60) * 60; h <= to; h += stepH * 60) ticks.push(`<span class="hdp-tick num" style="left:${pct(h)}%">${esc(homeHM(h))}</span>`);
  const nowOn = now !== null && now >= from && now <= to;
  const say = [...m.events.map(e => ({ s: e.start, t: `${homeHM(e.start)}–${homeHM(e.end)} ${e.title} (meeting)` })),
    ...m.lane.map(x => ({ s: x.start, t: `${homeHM(x.start)}–${homeHM(x.end)} ${x.title} (${x.kind === 'slot' ? 'planned' : x.kind === 'block' ? 'calendar block' : 'due'})` })),
    ...m.gaps.map(g => ({ s: g.start, t: `Free ${homeHM(g.start)}–${homeHM(g.end)}` }))].sort((a, b) => a.s - b.s);
  box.innerHTML = `<div class="hdp-rail"><span class="hdp-past" style="width:${now === null ? 0 : pct(now)}%" aria-hidden="true"></span>`
    + `<span class="hdp-lane-l is-cal" aria-hidden="true">${icon('calendar-days', 'i-xs')}</span><span class="hdp-lane-l is-plan" aria-hidden="true">${icon('list-checks', 'i-xs')}</span>`
    + gaps + evs + lane + props
    + '<span class="hdp-ghost" hidden aria-hidden="true"><span></span></span>'
    + (nowOn ? `<span class="hdp-now" style="left:${pct(now)}%" aria-hidden="true"><i></i></span>` : '') + '</div>'
    + `<div class="hdp-ticks" aria-hidden="true">${ticks.join('')}</div>`
    + `<ol class="sr-only">${say.map(x => `<li>${esc(x.t)}</li>`).join('')}</ol>`;
  return box;
}

/* ---------- the rows ---------- */
function _hdpDueHtml(r) {
  if (r.dueState === 'overdue') { const n = -(_homeDaysBetweenSafe(r.due)); return `<span class="hdp-due is-overdue">${icon('circle-alert', 'i-xs')}${esc(n > 0 ? n + 'd overdue' : 'Overdue')}</span>`; }
  if (r.dueState === 'today') return `<span class="hdp-due is-today">${icon('calendar', 'i-xs')}Due today</span>`;
  if (r.doing) return '<span class="hdp-due is-doing">In progress</span>';
  if (r.onlyPlanned) return '<span class="hdp-due">Planned</span>';
  return '';
}
function _homeDaysBetweenSafe(iso) { return typeof daysUntil === 'function' ? daysUntil(iso) : 0; }
function _hdpPlaceHtml(r) {
  const x = r.place; if (!x) return '';
  const ic = x.kind === 'slot' ? 'calendar-clock' : x.kind === 'block' ? 'calendar-check' : 'clock';
  return `<span class="hdp-when${x.past ? ' is-past' : ''}">${icon(ic, 'i-xs')}<span class="num">${esc(homeHM(x.start))}–${esc(homeHM(x.end))}</span></span>`;
}
function _hdpEstHtml(r) {
  const cur = r.estimate;
  const known = HOME_DAYPLAN_ESTIMATES.includes(cur);
  const q = !cur ? `<span class="hdp-q" data-tip="No estimate: counted as ${escAttr(homeDayplanDur(r.minutes))}" aria-hidden="true">?</span>`
    : !known ? `<span class="hdp-q is-other num" data-tip="Estimate: ${escAttr(homeDayplanDur(cur))}" aria-hidden="true">${esc(homeDayplanDur(cur).replace(' min', ''))}</span>` : '';
  const btns = HOME_DAYPLAN_ESTIMATES.map(v => `<button type="button" data-est="${v}" aria-pressed="${cur === v ? 'true' : 'false'}" aria-label="${escAttr(homeDayplanSayDur(v))}">${esc(_HDP_EST_LABEL[v])}</button>`).join('');
  return `<span class="hdp-est" role="group" aria-label="${escAttr(`Estimate for ${r.title}${cur ? ', now ' + homeDayplanSayDur(cur) : ', not set'}`)}">${q}${btns}</span>`;
}
function _hdpTomorrowHtml(r) {
  if ((r.place && r.place.kind === 'block') || (!r.dueState && !r.planned)) return '<span class="hdp-tm-x" aria-hidden="true"></span>';   // a calendar block / in progress only: nothing to move here
  const dl = !!r.dueState;
  const aria = dl ? `Move the deadline of ${r.title} to tomorrow` : `Plan ${r.title} for tomorrow instead`;
  const tip = dl ? 'Moves the deadline to tomorrow' : 'Plans it for tomorrow · the deadline stays';
  return `<button type="button" class="hdp-tm${dl ? ' is-deadline' : ''}" data-act="tomorrow" aria-label="${escAttr(aria)}" data-tip="${escAttr(tip)}">${icon('sunrise', 'i-xs')}<span>${dl ? 'Move deadline' : 'Tomorrow'}</span></button>`;
}
function _hdpRowHtml(r, wide) {
  const drag = wide && !r.place ? ` data-drag="${escAttr(r.id)}"` : '';
  const st = typeof STREAMS !== 'undefined' ? STREAMS[r.stream] : null;
  const meta = [st ? `<span class="hdp-st">${typeof streamMarkHtml === 'function' ? streamMarkHtml(r.stream) : ''}<span>${esc(st.label || r.stream)}</span></span>` : '', _hdpDueHtml(r), wide ? '' : _hdpPlaceHtml(r)].filter(Boolean).join('');
  const label = `${r.title}${r.dueState === 'overdue' ? ', overdue' : r.dueState === 'today' ? ', due today' : ''}${r.place ? `, ${homeHM(r.place.start)} to ${homeHM(r.place.end)}` : ''}, ${r.estimate ? homeDayplanSayDur(r.estimate) : 'no estimate'}`;
  return `<div class="hdp-row${r.place ? ' is-placed' : ''}" data-id="${escAttr(r.id)}" data-flip="hdp-r:${escAttr(r.id)}"${drag} ${homeRowAttrs(r.id, label)}${_hdpOpenId === r.id ? ' aria-current="true"' : ''}>`
    + (wide ? `<span class="hdp-grip" aria-hidden="true">${icon('grip-vertical', 'i-xs')}</span>` : '')
    + `<span class="hdp-rt"><button type="button" class="hdp-tt" data-act="open" tabindex="-1">${esc(r.title)}</button>${meta ? `<span class="hdp-rm">${meta}</span>` : ''}</span>`
    + `<span class="hdp-ra">${_hdpEstHtml(r)}${_hdpTomorrowHtml(r)}<button type="button" class="btn-icon btn-sm hdp-mn" data-act="menu" aria-haspopup="menu" aria-label="${escAttr('More for ' + r.title)}">${icon('ellipsis')}</button></span></div>`;
}
function _hdpListEl(m, ctx, size) {
  const wide = size !== 'm';
  const box = document.createElement('div'); box.className = 'hdp-list';
  const rows = wide ? m.unplaced : m.rows;
  if (!m.rows.length) { box.appendChild(_hdpEmptyEl(m, ctx)); return box; }
  if (!rows.length) {
    box.innerHTML = `<div class="hdp-allset">${icon('circle-check', 'i-xs')}<span>Everything for today has a time.</span></div>`;
    return box;
  }
  const max = _HDP_ROWS[size] || 6;
  const shown = _hdpAllRows || ctx.preview ? rows : rows.slice(0, max);
  const head = wide ? `<div class="hdp-lh"><span>No time yet</span><small>${ctx.preview ? '' : 'Drag one onto the timeline, or use its menu'}</small></div>` : '';
  box.innerHTML = head + `<div class="hdp-rows" role="list" aria-label="${escAttr(wide ? 'Tasks with no time yet' : 'Today’s tasks')}">${shown.map(r => _hdpRowHtml(r, wide)).join('')}</div>`
    + (rows.length > max && !ctx.preview ? `<button type="button" class="hdp-more" data-act="more" aria-expanded="${_hdpAllRows}">${icon(_hdpAllRows ? 'chevron-up' : 'chevron-down', 'i-xs')}<span>${_hdpAllRows ? 'Show fewer' : `${rows.length - max} more`}</span></button>` : '');
  for (const r of box.querySelectorAll('.hdp-row')) r.setAttribute('role', 'listitem');
  return box;
}
function _hdpEmptyEl(m, ctx) {
  const box = document.createElement('div'); box.className = 'hdp-empty';
  const pull = ctx.preview ? [] : _hdpPullCands(m);
  box.innerHTML = `${homeScene('rest', { size: 'sm' })}<div><b>Nothing planned yet</b><span>${pull.length ? 'Pull your top Focus tasks into today, then fit them around your meetings.' : 'Tasks due or planned today show here, with how much of your free time they take.'}</span></div>`;
  return box;
}

/* ---------- the tray (Full): tasks not on today yet ---------- */
function _hdpTrayCands(m) {
  const today = m.today, until = _homeAddDays(today, 7);
  const on = new Set(m.rows.map(r => r.id));
  const out = [], seen = new Set();
  const add = (i) => { if (!i || seen.has(i.id) || on.has(i.id) || statusOf(i.id) === 'done') return; if (i.startDate && i.startDate > today) return; seen.add(i.id); out.push(i); };
  try { for (const x of homeFocusTasks(9)) add(x.i); } catch (e) { /* no Focus */ }
  const due = getAllItems().filter(i => { const d = effDate(i); return d && d > today && d <= until; }).sort((a, b) => String(effDate(a)).localeCompare(String(effDate(b))) || String(effTitle(a)).localeCompare(String(effTitle(b))));
  for (const i of due) add(i);
  return out.slice(0, _HDP_TRAY);
}
function _hdpTrayEl(m) {
  const list = _hdpTrayCands(m);
  if (!list.length) return null;
  const box = document.createElement('div'); box.className = 'hdp-tray';
  box.innerHTML = `<div class="hdp-lh"><span>Not on today</span><small>Focus and due this week · drag one onto the timeline</small></div><div class="hdp-tis" role="list">`
    + list.map(i => {
      const d = effDate(i), est = Number(i.estimate) > 0 ? homeDayplanDur(Number(i.estimate)) : '';
      return `<div class="hdp-ti" role="listitem" data-id="${escAttr(i.id)}" data-drag="${escAttr(i.id)}" data-flip="hdp-t:${escAttr(i.id)}" ${homeRowAttrs(i.id, `${effTitle(i)}${d ? ', due ' + dueLabel(d) : ''}`)}>`
        + `<span class="hdp-grip" aria-hidden="true">${icon('grip-vertical', 'i-xs')}</span>${typeof streamMarkHtml === 'function' ? streamMarkHtml(effStream(i)) : ''}`
        + `<span class="hdp-ti-t">${esc(effTitle(i))}</span>${d ? `<small>${esc(dueLabel(d))}</small>` : ''}${est ? `<small class="num">${esc(est)}</small>` : ''}`
        + `<button type="button" class="hdp-ti-add" data-act="today" aria-label="${escAttr('Plan ' + effTitle(i) + ' for today')}" data-tip="Plan it for today">${icon('plus', 'i-xs')}<span>Today</span></button></div>`;
    }).join('') + '</div>';
  return box;
}

/* ---------- recommendations: the panel (opens, prefilled) and the ✓ (at once, with Undo) ---------- */
function _hdpCanBook() { return typeof sgCanBlock === 'function' && typeof sgRun === 'function' ? sgCanBlock() : { ok: false, reason: 'none' }; }
function _hdpAutoOpts(prefs) { const book = !!prefs.book && _hdpCanBook().ok; return { buffer: prefs.buffer, book, minMinutes: book ? 15 : undefined, maxMinutes: book ? 240 : undefined }; }
function _hdpPullCands(m) {
  const list = [];
  try { for (const x of homeFocusTasks(9)) list.push({ id: x.i.id }); } catch (e) { /* none */ }
  return homeDayplanPullPick(m, list, 6);
}
/** The panel to draw this time (recomputed from the day unless blocks are being booked); null when none. */
function _hdpPanelNow(m, prefs) {
  const p = _hdpPanel;
  if (!p) return null;
  if (p.day !== m.today) { _hdpPanel = null; return null; }
  if (p.kind === 'auto' && !_hdpBooking) { const o = _hdpAutoOpts(prefs); const a = homeDayplanAuto(m, o); p.slots = a.slots; p.left = a.left; p.book = o.book; }
  if (p.kind === 'tomorrow') { const t = homeDayplanTomorrowPick(m); p.pick = t; }
  if (p.kind === 'pull') p.ids = _hdpPullCands(m);
  return p;
}
function _hdpPanelOpen(kind, ctx) {
  if (_hdpPanel && _hdpPanel.kind === kind) return;            // pressed again: nothing changes
  const today = todayStr();
  const s = selStore(`hdp-${kind}:${today}`);
  s.on.clear(); s.seen.clear(); s.done.clear(); s.errors.clear();
  _hdpPanel = { kind, day: today };
  ctx.rerender();
  requestAnimationFrame(() => {
    const el = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(ctx.id)}"] .hdp-panel .sel-cbx[role="checkbox"]:not(.sel-master)`);
    if (el) try { el.focus({ preventScroll: false }); } catch (e) { /* gone */ }
  });
}
function _hdpPanelClose(ctx) { if (!_hdpPanel || _hdpBooking) return; _hdpPanel = null; ctx.rerender(); }
function _hdpPanelEl(m, ctx, p, prefs) {
  const box = document.createElement('div'); box.className = `hdp-panel is-${p.kind}`;
  box.setAttribute('role', 'region');
  const D = homeDayplanDur;
  let title = '', sub = '', rows = '', foot = '';
  let defaultOn = true;
  if (p.kind === 'auto') {
    const n = p.slots.length, mins = p.slots.reduce((x, s) => x + s.minutes, 0);
    title = 'Proposed plan';
    sub = n ? `${n} block${n === 1 ? '' : 's'} · ${D(mins)} · until ${homeHM(p.slots[p.slots.length - 1].end)}` : 'Nothing fits in today’s free time';
    rows = p.slots.map(s => `<div class="hdp-prow" data-sel-id="${escAttr(s.id)}" aria-label="${escAttr(`${homeHM(s.start)} to ${homeHM(s.end)}, ${s.title}`)}"><time class="num">${esc(homeHM(s.start))}–${esc(homeHM(s.end))}</time><span class="hdp-pt">${esc(s.title)}</span><span class="hdp-pm num">${esc(D(s.minutes))}</span></div>`).join('');
    if (p.left && p.left.length) foot += `<p class="hdp-pnote">${icon('info', 'i-xs')}<span>${p.left.length} more ${p.left.length === 1 ? 'does' : 'do'} not fit today.</span></p>`;
    const can = _hdpCanBook();
    if (can.ok || can.reason === 'connect' || can.reason === 'stale') {
      const on = !!prefs.book && can.ok;
      foot += `<div class="hdp-book${can.ok ? '' : ' is-off'}"><button type="button" class="switch${on ? ' on' : ''}" role="switch" aria-checked="${on}" data-act="book"${can.ok ? '' : ' disabled'} aria-label="Book them in my calendar"></button>`
        + `<span><b>Book them in my calendar</b><small>${can.ok ? 'Google Calendar events, no guests, linked to their tasks. One Undo removes them.' : can.reason === 'stale' ? 'Update the calendar first.' : 'Connect Google Calendar to book them.'}</small></span>`
        + (can.ok ? '' : `<button type="button" class="hdp-note-btn" data-act="${can.reason === 'stale' ? 'cal-refresh' : 'connect'}">${esc(can.reason === 'stale' ? 'Update' : 'Connect')}</button>`) + '</div>';
    }
  } else if (p.kind === 'tomorrow') {
    const t = p.pick, all = t.candidates;
    const byId = new Map(m.rows.map(r => [r.id, r]));
    title = m.over ? 'Move to tomorrow' : 'Make today fit';
    sub = m.over ? 'Plans that did not happen today' : t.fits ? `Moving ${t.ids.length} frees ${D(t.minutes)} · the day fits` : `Moving all of these frees ${D(t.minutes)} of ${D(t.need)}`;
    defaultOn = (id) => t.ids.includes(id);
    rows = all.map(id => { const r = byId.get(id); return r ? `<div class="hdp-prow" data-sel-id="${escAttr(id)}" aria-label="${escAttr(r.title)}"><span class="hdp-pt">${esc(r.title)}</span><span class="hdp-pm">${esc(r.priority && r.priority !== 'p0' ? r.priority.toUpperCase() + ' · ' : '')}${esc(D(r.place ? r.place.minutes : r.minutes))}</span></div>` : ''; }).join('');
    foot = `<p class="hdp-pnote">${icon('info', 'i-xs')}<span>Only plans move: deadlines stay where they are.</span></p>`;
  } else {
    title = 'Pull into today';
    sub = 'From Focus · the top 3 are ticked';
    const n3 = p.ids.slice(0, 3);
    defaultOn = (id) => n3.includes(id);
    rows = p.ids.map(id => { const it = getItem(id); return it ? `<div class="hdp-prow" data-sel-id="${escAttr(id)}" aria-label="${escAttr(effTitle(it))}"><span class="hdp-pt">${esc(effTitle(it))}</span><span class="hdp-pm">${effDate(it) ? esc(dueLabel(effDate(it))) : ''}</span></div>` : ''; }).join('');
  }
  box.setAttribute('aria-label', title);
  const status = _hdpBooking ? `<div class="hdp-pstatus" role="status"><span class="spinner" aria-hidden="true"></span><span>Booking ${_hdpBooking.k + 1} of ${_hdpBooking.of} in Google Calendar…</span></div>` : '';
  box.innerHTML = `<div class="hdp-ph">${icon(p.kind === 'auto' ? 'wand-sparkles' : p.kind === 'tomorrow' ? 'sunrise' : 'list-checks')}<b>${esc(title)}</b><span class="hdp-ps">${esc(sub)}</span>`
    + `<button type="button" class="btn-icon btn-sm" data-act="panel-close" aria-label="Close without changing anything"${_hdpBooking ? ' disabled' : ''}>${icon('x')}</button></div>`
    + `<div class="hdp-plist">${rows}</div>${foot}${status}<div class="hdp-pbar"></div>`;
  const list = box.querySelector('.hdp-plist');
  if (!list.children.length) return box;
  const key = `hdp-${p.kind}:${m.today}`;
  const sl = selectList(list, {
    key, rows: '.hdp-prow', defaultOn, compact: true, rowClick: true, bar: box.querySelector('.hdp-pbar'), label: title,
    apply: { label: p.kind === 'auto' ? (p.book ? 'Book selected' : 'Plan selected') : p.kind === 'tomorrow' ? 'Move selected' : 'Add selected', icon: p.kind === 'auto' && p.book ? 'calendar-check' : 'check',
      run: (ids) => _hdpPanelApply(p, ids, ctx) },
    onChange: (on) => _hdpPropsShow(box.closest('.hdp'), on),
  });
  if (_hdpBooking) sl.setBusy(true);
  requestAnimationFrame(() => _hdpPropsShow(box.closest('.hdp'), selStore(key).on));
  return box;
}
/** The timeline shows the ticked proposals (dotted) while the auto-plan panel is open. */
function _hdpPropsShow(card, on) {
  if (!card) return;
  for (const x of card.querySelectorAll('.hdp-prop[data-prop]')) x.hidden = !(on && on.has(x.dataset.prop));
}
async function _hdpPanelApply(p, ids, ctx) {
  const pick = new Set(ids);
  if (p.kind === 'auto') {
    const slots = p.slots.filter(s => pick.has(s.id));
    if (p.book) {
      const r = await _hdpBookSlots(slots, ctx);
      if (!Object.keys(r.errors).length) { _hdpPanel = null; ctx.rerender(); }
      return { done: r.done, errors: r.errors };
    }
    _hdpPanel = null;
    _hdpApplySlots(slots);
    return { done: ids };
  }
  _hdpPanel = null;
  if (p.kind === 'tomorrow') _hdpApplyTomorrow(ids);
  else _hdpApplyPull(ids);
  return { done: ids };
}

/* ---------- the writes (one undo step each) ---------- */
function _hdpApplySlots(slots) {
  const today = todayStr();
  let n = 0;
  selUndoGroup(() => { for (const s of slots) if (setPlannedSlot(s.id, today, s.time, s.minutes, { toast: false, render: false, reason: 'Auto-plan on Home' })) n++; });
  render();
  if (n) toast(`Planned ${n} task${n === 1 ? '' : 's'} into today’s free time · the deadlines stay`, { kind: 'ok', icon: 'calendar-clock', action: { label: 'Undo', run: () => undo() } });
  if (typeof homeAnnounce === 'function') homeAnnounce(n ? `Planned ${n} task${n === 1 ? '' : 's'}` : 'Nothing changed');
  return n;
}
function _hdpApplyTomorrow(ids) {
  const tmrw = _homeAddDays(todayStr(), 1);
  let n = 0;
  selUndoGroup(() => { for (const id of ids) if (setPlannedSlot(id, tmrw, null, undefined, { toast: false, render: false, reason: 'over capacity' })) n++; });
  render();
  if (n) toast(`Moved ${n} plan${n === 1 ? '' : 's'} to tomorrow · the deadlines stay`, { kind: 'ok', icon: 'sunrise', action: { label: 'Undo', run: () => undo() } });
  return n;
}
function _hdpApplyPull(ids) {
  const today = todayStr();
  const list = ids.filter(id => { const it = getItem(id); return it && it.plannedFor !== today; });
  if (!list.length) return 0;
  batchTasks(list, (id) => { const it = getItem(id); const from = it.plannedFor || null; it.plannedFor = today; logActivity(id, 'plan', { from, to: today, reason: 'Pulled into today on Home' }); });
  toast(`Added ${list.length} task${list.length === 1 ? '' : 's'} to today`, { kind: 'ok', icon: 'sun', action: { label: 'Undo', run: () => undo() } });
  return list.length;
}
/** Book proposal slots as Google Calendar blocks (S1's cal.block: own events, no guests, linked, the task planned). One undo group. */
async function _hdpBookSlots(slots, ctx) {
  const today = todayStr();
  const g = sgUndoGroup('dayplan:' + today);
  const done = [], errors = {};
  const snap = sgSnapshot({ fresh: true });
  _hdpBooking = { k: 0, of: slots.length };
  try {
    for (let k = 0; k < slots.length; k++) {
      const s = slots[k];
      const it = getItem(s.id);
      if (g.undone) break;
      if (!it) { errors[s.id] = 'That task is gone.'; continue; }
      _hdpBooking = { k, of: slots.length };
      _hdpBookingPaint(ctx);
      const st = sgTask(snap, s.id) || { title: effTitle(it) };
      const r = await sgRun({ type: 'cal.block', args: { taskId: s.id, date: today, start: s.start, end: s.end, rule: 'dayplan', title: sgBlockTitle(st), description: sgBlockDescription(st) } }, null, { group: g, surface: 'dayplan' });
      if (r && r.ok !== false && !r.undone) done.push(s.id);
      else { errors[s.id] = (r && r.message) || 'Google Calendar did not take it.'; break; }
    }
  } finally { _hdpBooking = null; }
  const n = done.length;
  const undoIt = async () => { const u = await g.undo(); if (u && u.ok) toast('Undone', { kind: 'ok', icon: 'undo-2' }); };
  if (n && !Object.keys(errors).length) toast(`Booked ${n} block${n === 1 ? '' : 's'} in Google Calendar`, { kind: 'ok', icon: 'calendar-check', action: { label: 'Undo', run: undoIt } });
  else if (n) toast(`Booked ${n} of ${slots.length}. ${Object.values(errors)[0]}`, { kind: 'err', action: { label: 'Undo', run: undoIt } });
  if (typeof homeAnnounce === 'function') homeAnnounce(n ? `Booked ${n} block${n === 1 ? '' : 's'} in Google Calendar` : 'Nothing was booked');
  ctx.rerender();
  return { done, errors, group: g };
}
function _hdpBookingPaint(ctx) {
  const card = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(ctx.id)}"] .hdp`);
  const st = card && card.querySelector('.hdp-pstatus span:last-child, .hdp-bstatus span:last-child');
  if (st && _hdpBooking) st.textContent = `Booking ${_hdpBooking.k + 1} of ${_hdpBooking.of} in Google Calendar…`;
  else if (card) ctx.rerender();
}
function _hdpSetEstimate(id, v) {
  const it = getItem(id); if (!it) return;
  if (Number(it.estimate) === v) return;                        // the current one: nothing to do
  setOverride(id, 'estimate', v);
  render();
  toast(`Estimate: ${homeDayplanDur(v)} · ${effTitle(it)}`, { kind: 'ok', icon: 'hourglass', action: { label: 'Undo', run: () => undo() } });
}
function _hdpTomorrow(id) {
  const it = getItem(id); if (!it) return;
  const today = todayStr(), tmrw = _homeAddDays(today, 1);
  const d = effDate(it);
  if (d && d <= today) {
    selUndoGroup(() => {
      setDateWithReason(id, tmrw, 'over capacity');
      if (it.plannedFor && it.plannedFor <= today) setPlannedSlot(id, tmrw, null, undefined, { toast: false, render: false, reason: 'over capacity' });
    });
    render();
    toast(`Deadline moved to tomorrow · ${effTitle(it)}`, { kind: 'ok', icon: 'sunrise', action: { label: 'Undo', run: () => undo() } });
  } else setPlannedSlot(id, tmrw, null, undefined, { reason: 'over capacity' });
}
function _hdpToday(id) {
  const it = getItem(id); if (!it || it.plannedFor === todayStr()) return;
  setPlanned(id, todayStr());
  toast(`Planned for today · ${effTitle(it)}`, { kind: 'ok', icon: 'sun', action: { label: 'Undo', run: () => undo() } });
}
function _hdpPlanAt(id, start, minutes) {
  setPlannedSlot(id, todayStr(), homeHM(start), minutes, { reason: 'Planned on Home' });
}

/* ---------- the action bar: the three recommendations ---------- */
function _hdpActionsEl(m, ctx, panel, prefs) {
  const out = [];
  const btn = (kind, ic, label, aria, okAria, okTip) => {
    const open = panel && panel.kind === kind;
    return `<span class="hdp-rec${open ? ' is-open' : ''}"><button type="button" class="btn btn-secondary btn-sm hdp-go" data-rec="${kind}" aria-expanded="${open ? 'true' : 'false'}" aria-label="${escAttr(aria)}">${icon(ic)}<span>${esc(label)}</span></button>`
      + `<button type="button" class="btn btn-secondary btn-sm btn-icon hdp-ok" data-rec-now="${kind}" aria-label="${escAttr(okAria)}" data-tip="${escAttr(okTip)}"${open || _hdpBooking ? ' disabled' : ''}>${icon('check')}</button></span>`;
  };
  if (!m.rows.length) {
    const pull = ctx.preview ? [] : _hdpPullCands(m);
    if (pull.length) { const n = Math.min(3, pull.length); out.push(btn('pull', 'list-checks', `Pull ${n} from Focus`, `Pull ${n} from Focus: choose which, then add them`, `Add the top ${n} Focus tasks to today now, with Undo`, 'Add them now · Undo')); }
  } else if (!m.over) {
    const o = _hdpAutoOpts(prefs);
    const a = homeDayplanAuto(m, o);
    if (a.slots.length) out.push(btn('auto', 'wand-sparkles', `Auto-plan ${a.slots.length}`, `Auto-plan: see a proposed time for ${a.slots.length} task${a.slots.length === 1 ? '' : 's'}, adjust, then apply`,
      o.book ? `Book ${a.slots.length} block${a.slots.length === 1 ? '' : 's'} in Google Calendar now, with Undo` : `Plan ${a.slots.length} task${a.slots.length === 1 ? '' : 's'} now, with Undo`, o.book ? 'Book them now · Undo' : 'Plan them now · Undo'));
  }
  if (m.rows.length && (m.cap.over || m.over)) {
    const t = homeDayplanTomorrowPick(m);
    if (t.ids.length) out.push(btn('tomorrow', 'sunrise', `Move ${t.ids.length} to tomorrow`, `Move ${t.ids.length} to tomorrow: choose which plans move, then apply`, `Move ${t.ids.length} plan${t.ids.length === 1 ? '' : 's'} to tomorrow now, with Undo`, 'Move them now · Undo'));
  }
  if (!out.length && !_hdpBooking) return null;
  const box = document.createElement('div'); box.className = 'hdp-acts';
  box.innerHTML = out.join('') + (_hdpBooking && !panel ? `<span class="hdp-bstatus" role="status"><span class="spinner" aria-hidden="true"></span><span>Booking ${_hdpBooking.k + 1} of ${_hdpBooking.of} in Google Calendar…</span></span>` : '');
  return box;
}
/** The ✓ of a recommendation: the proposal as it is, now, with Undo. */
function _hdpRecNow(kind, btn, m, ctx, prefs) {
  if (kind === 'auto') {
    const o = _hdpAutoOpts(prefs);
    const a = homeDayplanAuto(m, o);
    if (!a.slots.length) return;
    if (o.book) return homeAction(btn, () => _hdpBookSlots(a.slots, ctx).then(r => (r.done.length ? r : false)));
    return homeAction(btn, () => (_hdpApplySlots(a.slots) ? true : false));
  }
  if (kind === 'tomorrow') { const t = homeDayplanTomorrowPick(m); if (t.ids.length) homeAction(btn, () => (_hdpApplyTomorrow(t.ids) ? true : false)); return; }
  if (kind === 'pull') { const ids = _hdpPullCands(m).slice(0, 3); if (ids.length) homeAction(btn, () => (_hdpApplyPull(ids) ? true : false)); }
}

/* ---------- S1 on the first free stretch (L, Full): block it in Google Calendar ---------- */
function _hdpGapCard(body, m, receipts) {
  if (typeof sgFreeSlotCard !== 'function' || typeof sgCardEl !== 'function' || m.over || !m.work) return;
  const mem = state.suggest;
  if (typeof sgMemNorm === 'function' && sgMemNorm(mem).off) return;
  const rule = typeof sgRule === 'function' ? sgRule('free-slot') : null;
  if (rule && typeof sgRuleOn === 'function' && !sgRuleOn(rule, mem, m.today)) return;
  const g = m.gaps.find(x => x.minutes >= (typeof SG_GAP_MIN !== 'undefined' ? SG_GAP_MIN : 45));
  if (!g) return;
  const snap = sgSnapshot();
  const top = m.unplaced.find(r => r.minutes <= g.minutes && !r.doing);
  const card = sgFreeSlotCard(snap, { start: g.start, end: g.end, lead: g.start === m.from }, top ? { surface: 'dayplan', taskId: top.id } : { surface: 'dayplan' });
  if (!card) return;
  card.rule = card.rule || 'free-slot'; card.area = card.area || 'time';
  if (typeof sgHiddenBy === 'function' && sgHiddenBy(card, mem, snap)) return;
  if (receipts && receipts.querySelector(`[data-sg-key="${CSS.escape(card.key)}"]`)) return;
  const box = document.createElement('div'); box.className = 'hdp-s1';
  box.appendChild(sgCardEl(card, { surface: 'dayplan', size: 'row' }));
  body.appendChild(box);
}

/* ---------- clicks, menus, keys ---------- */
function _hdpWire(card, m, ctx, prefs) {
  card.addEventListener('click', (e) => {
    if (_hdpDrag && _hdpDrag.started) return;
    const b = e.target.closest('[data-act], [data-est], [data-rec], [data-rec-now], [data-gap], .hdp-blk, .hdp-ev');
    if (!b || !card.contains(b) || b.disabled) return;
    const row = b.closest('[data-id]');
    const id = row ? row.dataset.id : '';
    if (b.dataset.est) { _hdpSetEstimate(id, Number(b.dataset.est)); return; }
    if (b.dataset.rec) { if (!_hdpBooking) _hdpPanelOpen(b.dataset.rec, ctx); return; }
    if (b.dataset.recNow) { _hdpRecNow(b.dataset.recNow, b, m, ctx, prefs); return; }
    if (b.dataset.gap) { _hdpGapMenu(b, m, ctx); return; }
    if (b.classList.contains('hdp-ev') || (b.classList.contains('hdp-blk') && b.dataset.ev)) { homeCalOpenEvent(b.dataset.ev, b); return; }
    if (b.classList.contains('hdp-blk')) { _hdpBlockMenu(b, m, ctx); return; }
    const act = b.dataset.act;
    if (act === 'open') { _hdpOpen(id, row, ctx); return; }
    if (act === 'tomorrow') { _hdpTomorrow(id); return; }
    if (act === 'menu') { _hdpRowMenu(b, id, m, ctx); return; }
    if (act === 'today') { _hdpToday(id); return; }
    if (act === 'more') { _hdpAllRows = !_hdpAllRows; ctx.rerender(); return; }
    if (act === 'panel-close') { _hdpPanelClose(ctx); return; }
    if (act === 'book') { homeSetPrefs(ctx, { book: b.getAttribute('aria-checked') !== 'true' }); return; }
    if (act === 'connect') { if (window.Connections && typeof Connections.open === 'function') Connections.open('calendar'); else setView('connections'); return; }
    if (act === 'cal-refresh') { if (typeof CalStore !== 'undefined' && CalStore.update) CalStore.update({ force: true }); return; }
    if (act === 'retry') { const s = typeof _homeCalStore === 'function' ? _homeCalStore() : null; if (s) s.load(true); return; }
    if (act === 'hours') { setView('settings:profile'); return; }
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _hdpPanel && card.querySelector('.hdp-panel') && card.querySelector('.hdp-panel').contains(e.target)) { e.preventDefault(); _hdpPanelClose(ctx); }
  });
  card.addEventListener('focusin', () => { if (_hdpOpenId && !(typeof tcIsOpen === 'function' && tcIsOpen())) { _hdpOpenId = ''; _hdpMarkOpen(card); } });
  const list = card.querySelector('.hdp-rows');
  if (list) {
    homeRowKeys(list, {
      open: (id, row) => _hdpOpen(id, row, ctx),
      done: (id, row) => homeCompleteTask(id, row),
      tomorrow: (id) => _hdpTomorrow(id),
      keys: {
        p: (id, row) => _hdpRowMenu(row.querySelector('[data-act="menu"]') || row, id, m, ctx),
        1: (id) => _hdpSetEstimate(id, 15), 2: (id) => _hdpSetEstimate(id, 30), 3: (id) => _hdpSetEstimate(id, 60), 4: (id) => _hdpSetEstimate(id, 120),
      },
    });
  }
  const tray = card.querySelector('.hdp-tis');
  if (tray) homeRowKeys(tray, { open: (id, row) => _hdpOpen(id, row, ctx), today: (id) => _hdpToday(id) });
  card.addEventListener('pointerdown', (e) => _hdpDragDown(e, card, m, ctx, prefs));
}
function _hdpOpen(id, from, ctx) {
  if (!id || !getItem(id)) return;
  ctx.openTask(id, from);
  if (typeof tcIsOpen === 'function' && tcIsOpen()) {
    _hdpOpenId = id;
    const card = from && from.closest('.hdp');
    if (card) _hdpMarkOpen(card);
  }
}
function _hdpMarkOpen(card) {
  for (const el of card.querySelectorAll('[aria-current]')) if (el.matches('.hdp-row, .hdp-blk, .hdp-ti')) el.removeAttribute('aria-current');
  if (!_hdpOpenId) return;
  for (const el of card.querySelectorAll(`.hdp-row[data-id="${CSS.escape(_hdpOpenId)}"], .hdp-blk[data-id="${CSS.escape(_hdpOpenId)}"], .hdp-ti[data-id="${CSS.escape(_hdpOpenId)}"]`)) el.setAttribute('aria-current', 'true');
}
/** A row's menu: Plan at… (the free gaps that fit), remove the planned time, open, done. */
function _hdpRowMenu(anchor, id, m, ctx) {
  const it = getItem(id); if (!it) return;
  const r = m.rows.find(x => x.id === id);
  const mins = r ? (r.place ? r.place.minutes : r.minutes) : (Number(it.estimate) || m.unestimated);
  const slot = r && r.place && r.place.kind === 'slot' ? r.place : null;
  const at = m.over ? [] : homeDayplanPlanAt(m, mins, slot ? { selfId: id } : {});
  const items = [{ label: 'Open the task', icon: 'maximize-2', kbd: '↵', run: () => _hdpOpen(id, anchor.closest('[data-id]') || anchor, ctx) }, 'sep', { heading: slot ? `Move (${homeDayplanDur(mins)})` : `Plan at (${homeDayplanDur(mins)})` }];
  if (at.length) for (const x of at) items.push({ label: x.label, icon: 'calendar-clock', hint: `free until ${homeHM(x.gap.end)}`, run: () => _hdpPlanAt(id, x.start, mins) });
  else items.push({ label: m.over ? 'Your working day is over' : `No free ${homeDayplanDur(mins)} left today`, disabled: true });
  if (slot) items.push({ label: 'Remove the planned time', icon: 'circle-x', run: () => setPlannedSlot(id, it.plannedFor, null) });
  items.push('sep', { label: 'Mark done', icon: 'circle-check', kbd: 'X', run: () => homeCompleteTask(id, anchor.closest('.hdp-row')) });
  openMenu(anchor, items, { align: 'end', width: 260 });
}
/** A planned block on the timeline: open, move to a free gap, remove the time. (Drag moves it too.) */
function _hdpBlockMenu(b, m, ctx) {
  const id = b.dataset.id; if (!id) return;
  _hdpRowMenu(b, id, m, ctx);
}
/** A free gap: plan a task that fits there, or block it in Google Calendar (S1, the event card prefilled). */
function _hdpGapMenu(b, m, ctx) {
  const [gs, ge] = String(b.dataset.gap).split('-').map(Number);
  if (!Number.isFinite(gs) || !Number.isFinite(ge)) return;
  const items = [{ heading: `Free ${homeHM(gs)}–${homeHM(ge)} · ${homeDayplanDur(ge - gs)}` }];
  const fits = m.unplaced.filter(r => r.minutes <= ge - gs).slice(0, 5);
  for (const r of fits) {
    const at = homeDayplanPlanAt(m, r.minutes, { limit: 20 }).find(x => x.gap.start === gs);
    if (!at) continue;
    items.push({ label: r.title, icon: 'calendar-clock', hint: at.label, run: () => _hdpPlanAt(r.id, at.start, r.minutes) });
  }
  if (items.length === 1) items.push({ label: m.unplaced.length ? 'Nothing with no time fits here' : 'Every task has a time', disabled: true });
  if (typeof sgFreeSlotCard === 'function' && typeof sgRun === 'function') {
    const snap = sgSnapshot();
    const card = sgFreeSlotCard(snap, { start: gs, end: ge }, fits[0] ? { surface: 'dayplan', taskId: fits[0].id } : { surface: 'dayplan' });
    if (card) {
      card.rule = card.rule || 'free-slot'; card.area = card.area || 'time';
      items.push('sep', { label: card.primary.label, icon: card.primary.icon || 'calendar-plus', hint: card.primary.action.type === 'cal.blockOpen' ? 'opens the event' : '',
        run: () => sgRun(card.primary.action, card, { from: b, surface: 'dayplan' }) });
    }
  }
  openMenu(b, items, { align: 'start', width: 300 });
}

/* ---------- drag onto / along the timeline ---------- */
function _hdpDragDown(e, card, m, ctx, prefs) {
  if (e.button !== 0 || ctx.editing || _hdpBooking || _hdpDrag) return;
  const src = e.target.closest('[data-drag]');
  if (!src || !card.contains(src)) return;
  const grip = !!e.target.closest('.hdp-grip');
  const isBlk = src.classList.contains('hdp-blk');
  if (e.pointerType !== 'mouse' && !grip && !isBlk) return;          // touch: from the grip, so the list still scrolls
  const ctl = e.target.closest('button:not(.hdp-tt), input, a[href], [role="checkbox"], .hdp-est');
  if (ctl && ctl !== src && !grip) return;
  const rail = card.querySelector('.hdp-rail');
  const id = src.dataset.drag;
  const it = getItem(id);
  if (!rail || !it) return;
  const row = m.rows.find(r => r.id === id);
  const minutes = isBlk && row && row.place ? row.place.minutes : row ? row.minutes : (Number(it.estimate) > 0 ? Number(it.estimate) : prefs.unestimated || 30);
  _hdpDrag = { id, src, card, ctx, m, rail, minutes, self: isBlk ? id : null, x0: e.clientX, y0: e.clientY, started: false, at: null, pill: null,
    off: isBlk && row && row.place ? 0 : null, start0: isBlk && row && row.place ? row.place.start : null, title: String(effTitle(it) || '') };
  window.addEventListener('pointermove', _hdpDragMove, true);
  window.addEventListener('pointerup', _hdpDragUp, true);
  window.addEventListener('pointercancel', _hdpDragCancel, true);
  window.addEventListener('keydown', _hdpDragKey, true);
}
function _hdpDragMove(e) {
  const d = _hdpDrag; if (!d) return;
  if (!d.started) {
    if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    d.started = true;
    d.src.classList.add('is-dragging');
    document.body.classList.add('hdp-is-dragging');
    d.card.classList.add('is-dropzone');
    const pill = document.createElement('div'); pill.className = 'hdp-pill'; pill.setAttribute('aria-hidden', 'true');
    pill.innerHTML = `${icon('calendar-clock', 'i-xs')}<span class="hdp-pill-t"></span><small></small>`;
    pill.querySelector('.hdp-pill-t').textContent = d.title;
    pill.querySelector('small').textContent = homeDayplanDur(d.minutes);
    document.body.appendChild(pill);
    d.pill = pill;
  }
  e.preventDefault();
  d.pill.style.left = (e.clientX + 14) + 'px'; d.pill.style.top = (e.clientY + 12) + 'px';
  const r = d.rail.getBoundingClientRect();
  const over = e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 48 && e.clientY <= r.bottom + 48;
  const ghost = d.rail.querySelector('.hdp-ghost');
  if (!over || !r.width) { d.at = null; if (ghost) ghost.hidden = true; d.pill.classList.remove('is-bad', 'is-ok'); d.pill.querySelector('small').textContent = homeDayplanDur(d.minutes); return; }
  const from = Number(d.rail.parentElement.dataset.from), to = Number(d.rail.parentElement.dataset.to);
  const minAt = from + ((e.clientX - r.left) / r.width) * (to - from);
  const want = d.start0 !== null ? d.start0 + ((e.clientX - d.x0) / r.width) * (to - from) : minAt - d.minutes / 2;
  const at = homeDayplanDropAt(d.m, want, d.minutes, { selfId: d.self });
  d.at = at;
  if (ghost) {
    const pct = (x) => Math.max(0, Math.min(100, ((x - from) / (to - from)) * 100));
    ghost.hidden = false;
    ghost.style.left = pct(at.start) + '%'; ghost.style.width = Math.max(0.6, pct(at.end) - pct(at.start)) + '%';
    ghost.classList.toggle('is-bad', !at.ok);
    ghost.querySelector('span').textContent = at.minutes >= 60 ? `${at.time}–${homeHM(at.end)}` : at.time;
  }
  d.pill.classList.toggle('is-bad', !at.ok); d.pill.classList.toggle('is-ok', at.ok);
  d.pill.querySelector('small').textContent = at.ok ? `${at.time}–${homeHM(at.end)}` : at.reason;
}
function _hdpDragUp(e) {
  const d = _hdpDrag; if (!d) return;
  if (!d.started) { _hdpDragEnd(false); return; }
  e.preventDefault();
  const at = d.at;
  _hdpDragEnd(true);
  if (!at) return;
  if (!at.ok) { toast(`Not planned: ${at.reason}`, { kind: 'err', icon: 'calendar-clock' }); if (typeof homeAnnounce === 'function') homeAnnounce(`Not planned: ${at.reason}`); return; }
  const it = getItem(d.id); if (!it) return;
  if (d.self && it.plannedFor === todayStr() && it.plannedTime === at.time) return;          // dropped where it was
  _hdpPlanAt(d.id, at.start, at.minutes);
}
function _hdpDragCancel() { _hdpDragEnd(!!(_hdpDrag && _hdpDrag.started)); }
function _hdpDragKey(e) { if (e.key === 'Escape' && _hdpDrag) { e.preventDefault(); e.stopPropagation(); _hdpDragEnd(!!_hdpDrag.started); } }
function _hdpDragEnd(swallow) {
  const d = _hdpDrag; _hdpDrag = null;
  if (!d) return;                                                  // no drag: no listeners were added
  window.removeEventListener('pointermove', _hdpDragMove, true);
  window.removeEventListener('pointerup', _hdpDragUp, true);
  window.removeEventListener('pointercancel', _hdpDragCancel, true);
  window.removeEventListener('keydown', _hdpDragKey, true);
  if (d.pill) d.pill.remove();
  if (d.src) d.src.classList.remove('is-dragging');
  if (d.card) d.card.classList.remove('is-dropzone');
  const ghost = d.rail && d.rail.querySelector('.hdp-ghost'); if (ghost) ghost.hidden = true;
  document.body.classList.remove('hdp-is-dragging');
  if (swallow) {
    const sw = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', sw, true);
    setTimeout(() => window.removeEventListener('click', sw, true), 0);
  }
}

/* ---------- the minute tick: text and the now marker in place; a repaint when the picture changes ---------- */
function _hdpTick(card, ctx) {
  if (!card.isConnected) return undefined;
  if (card.dataset.day !== todayStr()) return 'rerender';
  if (_hdpDrag || _hdpBooking) return undefined;
  const { input } = _hdpInput(ctx);
  const m = homeDayplanModel(input);
  if (m.sig !== card.dataset.sig) return 'rerender';
  const t = card.querySelector('[data-cap-t]');
  if (t && !m.over) t.innerHTML = _hdpCapTextHtml(m);
  const say = card.querySelector('[data-cap-say]'); if (say) say.setAttribute('aria-label', homeDayplanCapSay(m));
  const tl = card.querySelector('.hdp-tl');
  if (tl && m.nowMin !== null) {
    const from = Number(tl.dataset.from), to = Number(tl.dataset.to);
    const p = Math.max(0, Math.min(100, ((m.nowMin - from) / (to - from)) * 100)) + '%';
    const past = tl.querySelector('.hdp-past'); if (past) past.style.width = p;
    const now = tl.querySelector('.hdp-now'); if (now) now.style.left = p;
  }
  return undefined;
}

/* ---------- settings ---------- */
function _hdpSettings(anchor, ctx) {
  const wh = homeWorkHours();
  homeSettingsMenu(anchor, ctx, [
    { key: 'unestimated', label: 'A task with no estimate counts as', type: 'choice', choices: [[15, '15 min'], [30, '30 min'], [60, '1 h']] },
    { key: 'buffer', label: 'Space between blocks', type: 'choice', choices: [[0, 'None'], [5, '5 min'], [10, '10 min'], [15, '15 min']] },
    { key: 'book', label: 'Auto-plan books blocks in my calendar', type: 'toggle', hint: 'Google Calendar events with no guests; one Undo removes them' },
  ], { foot: `Working hours: ${wh.start}–${wh.end} (Settings > Profile).` });
  requestAnimationFrame(() => {
    const foot = document.querySelector('.hg-set-pop .hg-set-foot');
    if (!foot || foot.querySelector('button')) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm hdp-set-wh';
    b.innerHTML = icon('clock') + '<span>Change working hours</span>';
    b.onclick = () => { if (typeof closePopovers === 'function') closePopovers(); setView('settings:profile'); };
    foot.appendChild(b);
  });
}
