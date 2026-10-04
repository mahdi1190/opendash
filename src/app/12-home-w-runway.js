/* ============================================================
   HOME widget "runway": Deadline runway (WIDGETS_CATALOGUE.md 3.10).
   OWNER: the "runway" widget builder (Phase 1, wave 1).
   "Will I make it?" for a countdown, from the user's real pace. Can be on
   Home up to 4 times (multi: 4): copies 'runway', 'runway~2'..., each with its
   own settings (ctx.instance; homePrefs(ctx) / homeSetPrefs):
     {countdownId, scope: {kind: 'stream'|'tag'|'query', value}, unit: 'tasks'|'steps',
      countWeekends, since}   (server schema: lib/home-topbar.mjs HOME_WIDGET_PREFS.runway)
   The model is pure: homeRunway() in 12-home-runway-logic.js; homeRunwayFor(id)
   below feeds it the page's data (tasks, statuses, completionLog, the top
   bar's countdowns, working hours and, for the hours line, the calendar).

   S: the countdown's name, "76 days · 18 left", a pace pill (text, never colour
      alone) and a done/total ring.
   M: S + the burn-up chart with the line still needed, "Need 1.7 per workday ·
      you're at 2.1", and the next open task with Plan for today.
   L: M + the next 3 tasks, the hours line (when half the open tasks have
      estimates) and the finish at this pace.
   Actions:
     - the countdown's name: the top bar's editor on it (openCountdownEditor);
     - the chart: the scope's own view (stream:x, tag:x, or All tasks searched);
     - Choose… (inline when not set up, and the gear): the picker (countdown, or
       New countdown… = the editor prefilled with a new one; the scope; the unit;
       weekends). Each pick saves at once, one undo step; the current one does nothing;
     - Plan for today (the user's rule, 3 Oct: a recommendation OPENS the normal
       editor prefilled, a small ✓ applies it as-is with Undo): when Google
       Calendar can be written and time is free today, the button opens the event
       card in create mode for this task (S1's cal.blockOpen: "Focus: <task>", the
       next free stretch, the task's estimate or 1 h; Save books it, links it and
       plans the task for today, with Undo) and the ✓ plans it for today at once
       (setPlanned, Undo). Without a calendar to write or free time left, the one
       button plans it for today at once, with Undo. Planned today: a pressed
       "Planned today" that does nothing when clicked again.
   Empty states: not set up = a setup card (countdown chips, Choose…); the
   countdown deleted = "Its countdown was removed · Choose another"; no date;
   nothing chosen to count; nothing in scope yet (Add a task opens the task
   card prefilled). Never hidden.
   Motion: on the widget's first paint the ring sweeps and the chart draws;
   later changes (a task done, a plan) morph in place (the ring and the lines
   glide from their last values). Reduced motion: instant.
   Accessibility: the chart is a button with a summary label and a visually
   hidden table (week, done, needed); pace is always text; rows take Enter
   (open) and T (plan for today, at once).
   ============================================================ */
registerHomeWidget({
  id: 'runway', title: 'Deadline runway', icon: 'milestone', order: 190, group: 'tasks', multi: 4,
  description: 'Will you make a deadline at your current pace?',
  sizes: ['s', 'm', 'l'], defaultSize: 'm', defaultHidden: true, fresh: true,
  aliases: ['deadline runway', 'pace', 'burn-up', 'burnup', 'on track', 'will i make it'],
  defaults: { countdownId: null, scope: null, unit: 'tasks', countWeekends: false, since: null },
  emptyHint: 'Pick a countdown and the tasks that count towards it',
  available: true,
  sample: (kit) => _rwSample(kit),
  render(el, ctx) { return _rwRender(el, ctx); },
  settings(anchor, ctx) { _rwPicker(anchor, ctx); },
  unmount() { _rwPrev.clear(); },
});

const _rwPrev = new Map();            // copy id -> {p, done, area, need, total}: what the last paint drew (to morph from)

/* ---------- the page's data ---------- */
/** The countdowns a runway can follow: the top bar's dated ones (not count-ups), soonest first, past ones last. */
function _rwCountdowns() {
  const types = typeof TB_TYPES !== 'undefined' ? TB_TYPES : {};
  const today = todayStr();
  return (typeof tbList === 'function' ? tbList() : [])
    .filter(w => w && types[w.type] && types[w.type].dated && w.type !== 'countup')
    .sort((a, b) => ((a.date && a.date < today) - (b.date && b.date < today)) || String(a.date || '9999').localeCompare(String(b.date || '9999')));
}
function _rwStreams() {
  return Object.entries(typeof STREAMS !== 'undefined' ? STREAMS : {}).filter(([, s]) => s && !s.archived)
    .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0)).map(([id, s]) => ({ id, label: s.label || id }));
}
/** Tags on any task, most used first: [[tag, open count, all count]]. */
function _rwTags() {
  const m = new Map();
  for (const it of getAllItems()) for (const t of (typeof effTags === 'function' ? effTags(it) : it.tags) || []) {
    const r = m.get(t) || [t, 0, 0];
    r[2]++; if (statusOf(it.id) !== 'done') r[1]++;
    m.set(t, r);
  }
  return [...m.values()].sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0]));
}
function _rwOpenIn(scope) {
  let n = 0;
  const match = _rwMatcher(scope);
  for (const it of getAllItems()) if (statusOf(it.id) !== 'done' && rwInScope(it, scope, match)) n++;
  return n;
}
/** A query scope's test: the task search (parsed once), open and done tasks alike. */
function _rwMatcher(scope) {
  if (!scope || scope.kind !== 'query' || typeof parseTaskSearch !== 'function' || typeof matchesSearch !== 'function') return null;
  const parsed = parseTaskSearch(String(scope.value || ''));
  const q = Object.assign({}, parsed, { is: (parsed.is || []).filter(k => k !== 'open' && k !== 'done') });
  return (item) => matchesSearch(item, q);
}
function _rwScopeOk(s) { return !!(s && typeof s === 'object' && ['stream', 'tag', 'query'].includes(s.kind) && typeof s.value === 'string' && s.value.trim()); }
/** The last day the calendar data reaches (free hours come from it up to there), or null. */
let _rwHorizonKey = '', _rwHorizon = null;
function _rwCalHorizon() {
  const st = typeof homeCalStatus === 'function' ? homeCalStatus() : null;
  if (!st || !st.ok || typeof CalStore === 'undefined' || !CalStore || !CalStore.data) return null;
  const d = CalStore.data;
  const key = (d.fetchedAt || '') + ':' + (Array.isArray(d.events) ? d.events.length : 0);
  if (key === _rwHorizonKey) return _rwHorizon;
  let max = null;
  for (const e of Array.isArray(d.events) ? d.events : []) {
    const s = String((e && e.start && (e.start.dateTime || e.start.date)) || (e && typeof e.start === 'string' ? e.start : '')).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s) && (!max || s > max)) max = s;
  }
  _rwHorizonKey = key; _rwHorizon = max;
  return max;
}
/** Free minutes on a day: the calendar's meetings inside working hours where it has data, else the working day. */
function _rwFreeMinOn(countWeekends) {
  const wh = typeof homeWorkHours === 'function' ? homeWorkHours() : (typeof planWorkHours === 'function' ? planWorkHours(null) : { startMin: 540, endMin: 1080, minutes: 540, days: [1, 2, 3, 4, 5] });
  const today = todayStr();
  const nowMin = typeof Clock !== 'undefined' ? Clock.parts().min
    : (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();   // clock-ok: fallback where Clock is not loaded (tests)
  const horizon = _rwCalHorizon();
  const all = Object.assign({}, wh, { days: [0, 1, 2, 3, 4, 5, 6] });
  return (iso) => {
    if (!countWeekends && typeof planIsWorkDay === 'function' && !planIsWorkDay(wh, iso)) return 0;
    if (horizon && iso <= horizon && typeof homeCalEvents === 'function' && typeof homeDayCapacity === 'function') {
      const events = homeCalEvents(iso).filter(e => !e.allDay && !e.bg).map(e => ({ start: e.start, end: e.end }));
      return homeDayCapacity({ workHours: all, date: iso, nowMin: iso === today ? nowMin : null, events }).freeMin;
    }
    return iso === today ? Math.max(0, wh.endMin - Math.max(wh.startMin, nowMin)) : wh.minutes;
  };
}

/**
 * One copy's runway from the page's data: {setup, prefs, countdown, model}.
 * setup: null (ready) | 'start' (nothing chosen) | 'gone' (its countdown was removed) |
 * 'nodate' | 'scope' (nothing chosen to count). o.hours: also the hours line (Large).
 */
function homeRunwayFor(ctxOrId, o) {
  o = o || {};
  const prefs = homePrefs(ctxOrId);
  if (!prefs.countdownId) return { setup: 'start', prefs };
  const cd = _rwCountdowns().find(w => w.id === prefs.countdownId) || null;
  if (!cd) return { setup: 'gone', prefs };
  if (!cd.date) return { setup: 'nodate', prefs, countdown: cd };
  if (!_rwScopeOk(prefs.scope)) return { setup: 'scope', prefs, countdown: cd };
  const wh = typeof homeWorkHours === 'function' ? homeWorkHours() : null;
  const model = homeRunway({
    items: getAllItems(), statuses: state.statuses || {}, completionLog: state.completionLog || {},
    countdown: { id: cd.id, label: cd.label, date: cd.date }, scope: prefs.scope, match: _rwMatcher(prefs.scope),
    unit: prefs.unit, today: todayStr(), countWeekends: !!prefs.countWeekends, workDays: wh ? wh.days : undefined,
    since: prefs.since || null, freeMinOn: o.hours ? _rwFreeMinOn(!!prefs.countWeekends) : undefined,
  });
  return { setup: null, prefs, countdown: cd, model };
}

/* ---------- words ---------- */
function _rwNum(x) {
  if (!(x > 0)) return '0';
  if (x >= 10) return String(Math.round(x));
  if (x < 0.1) return 'under 0.1';
  return String(Math.round(x * 10) / 10);
}
function _rwPl(n, one, many) { return `${n} ${n === 1 ? one : (many || one + 's')}`; }
function _rwDate(iso, wd) { return typeof _tbShortDate === 'function' ? _tbShortDate(iso, wd !== false) : iso; }
function _rwDaysText(m) {
  if (m.daysLeft == null) return '';
  if (m.daysLeft === 0) return 'Today';
  return m.daysLeft > 0 ? _rwPl(m.daysLeft, 'day') : _rwPl(-m.daysLeft, 'day') + ' ago';
}
function _rwUnitWord(m, n) { return m.unit === 'steps' ? (n === 1 ? 'step' : 'steps') : (n === 1 ? 'task' : 'tasks'); }
function _rwLeftText(m) {
  if (!m.total) return 'Nothing to count yet';
  if (!m.open) return `All ${m.total} done`;
  return `${m.open} ${m.unit === 'steps' ? (m.open === 1 ? 'step ' : 'steps ') : ''}left`;
}
function _rwPaceText(m) {
  if (!m.total) return '';
  if (!m.open) return `All ${_rwPl(m.total, m.unit === 'steps' ? 'step' : 'task')} done.`;
  if (m.status === 'past') return `The date passed with ${m.open} ${_rwUnitWord(m, m.open)} still open.`;
  const per = m.unit === 'steps' ? ' steps' : '';
  const at = m.recentDone ? `you're at ${_rwNum(m.actual)}` : `none finished in the last ${m.window.workdays > 1 ? m.window.workdays + ' workdays' : 'workday'}`;
  return `Need ${_rwNum(m.required)}${per} per workday · ${at}`;
}
function _rwProjectedText(m) {
  if (!m.open || m.status === 'past') return '';
  if (!m.projected) return m.recentDone ? 'At this pace: more than three years' : 'No pace yet to project a finish';
  const d = (typeof _planDaysBetween === 'function' ? _planDaysBetween(m.date, m.projected) : 0);
  const rel = !m.date ? '' : d > 0 ? ` · ${_rwPl(d, 'day')} late` : d < 0 ? ` · ${_rwPl(-d, 'day')} early` : ' · on the day';
  return `At this pace: done ${_rwDate(m.projected)}${rel}`;
}
function _rwHoursText(m) {
  const h = m.hours;
  if (!h) return '';
  const hh = (min) => (min >= 600 ? Math.round(min / 60) : Math.round(min / 6) / 10);
  return `About ${hh(h.remainingMin)} h of work left · ${hh(h.freeMin)} h free before ${_rwDate(m.date)}`;
}
function _rwScopeHtml(scope) {
  if (!_rwScopeOk(scope)) return '';
  if (scope.kind === 'stream') {
    const s = typeof STREAMS !== 'undefined' ? STREAMS[scope.value] : null;
    return `${typeof streamMarkHtml === 'function' ? streamMarkHtml(scope.value) : ''}<span>${esc(s ? s.label : scope.value)}</span>`;
  }
  if (scope.kind === 'tag') return `${(typeof tagMarkHtml === 'function' && tagMarkHtml(scope.value)) || icon('hash', 'i-xs')}<span>${esc(scope.value)}</span>`;
  return `${icon('search', 'i-xs')}<span>${esc(scope.value.length > 28 ? scope.value.slice(0, 27) + '…' : scope.value)}</span>`;
}
function _rwScopeWords(scope) {
  if (!_rwScopeOk(scope)) return '';
  if (scope.kind === 'stream') { const s = typeof STREAMS !== 'undefined' ? STREAMS[scope.value] : null; return `the ${s ? s.label : scope.value} stream`; }
  if (scope.kind === 'tag') return `#${scope.value}`;
  return `the search “${scope.value}”`;
}

/* ---------- drawing ---------- */
function _rwRingHtml(m, sweep, from) {
  const p = m.total ? Math.round(m.done / m.total * 100) : 0;
  const start = from != null && from !== p ? from : p;
  return `<span class="rw-ring-wrap" aria-hidden="true"><svg class="rw-ring${sweep ? ' is-sweep' : ''}${p ? '' : ' is-zero'}" viewBox="0 0 36 36" style="--p:${start}" data-p="${p}">`
    + `<circle class="tr" cx="18" cy="18" r="15.9" pathLength="100"/><circle class="fl" cx="18" cy="18" r="15.9" pathLength="100"/></svg>`
    + `<span class="rw-ring-n num"><b>${esc(m.done)}</b><small>/${esc(m.total)}</small></span></span>`;
}
function _rwChartHtml(m, scope, cd, draw, prev) {
  const g = rwSparkGeometry(m, { w: 300, h: 64 });
  const from = prev && !draw ? prev : null;
  const d = (k) => (from && from[k] && from[k] !== g[k] ? from[k] : g[k]);
  const style = (k) => `style="d: path('${d(k)}')"`;
  const rows = rwWeekRows(m);
  const label = `Burn-up chart for ${cd.label || 'the countdown'}: ${m.done} of ${m.total} ${_rwUnitWord(m, m.total)} done since ${_rwDate(m.since, false)}`
    + (m.open && m.date && m.daysLeft > 0 ? `, ${m.open} to go by ${_rwDate(m.date)}` : '') + `. ${m.statusText}. Opens ${_rwScopeWords(scope)}.`;
  const table = `<table class="sr-only"><caption>${esc(cd.label || 'Countdown')}: done and needed by week</caption><thead><tr><th scope="col">Week of</th><th scope="col">Done by then</th><th scope="col">Needed by then</th></tr></thead><tbody>`
    + rows.map(r => `<tr><th scope="row">${esc(_rwDate(r.week, false))}</th><td>${r.done == null ? '–' : esc(r.done)}</td><td>${r.needed == null ? '–' : esc(r.needed)}</td></tr>`).join('') + '</tbody></table>';
  return `<button type="button" class="rw-chart${draw ? ' is-draw' : ''}" data-act="chart" aria-label="${escAttr(label)}"><span class="rw-plot">`
    + `<svg viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">`
    + `<path class="rw-total" d="${g.total}" ${style('total')} vector-effect="non-scaling-stroke"/>`
    + `<path class="rw-area" d="${g.area}" ${style('area')}/>`
    + (g.need ? `<path class="rw-need" d="${g.need}" ${style('need')} vector-effect="non-scaling-stroke"/>` : '')
    + `<path class="rw-done" d="${g.done}" ${style('done')} vector-effect="non-scaling-stroke"/>`
    + (g.dateX != null ? `<line class="rw-dl" x1="${g.dateX}" x2="${g.dateX}" y1="2" y2="62" vector-effect="non-scaling-stroke"/>` : '')
    + `</svg>${_rwDotHtml(g.today, from && from.dot)}</span>`
    + `<span class="rw-axis"><span>${esc(_rwDate(m.since, false))}</span><span>${esc(m.date && m.daysLeft >= 0 ? _rwDate(m.date, false) : 'Today')}</span></span></button>${table}`;
}
/** Today's point on the chart (a dot over the stretched SVG, so it stays round); from = where it was. */
function _rwDotHtml(pt, from) {
  const pos = (p) => `left:${(p.x / 300 * 100).toFixed(2)}%;top:${(p.y / 64 * 100).toFixed(2)}%`;
  return `<span class="rw-dot" style="${pos(from || pt)}" data-to="${escAttr(pos(pt))}" aria-hidden="true"></span>`;
}
/** What the ✓ / the one button does for a task: {block: args | null, why} (cal.blockOpen args). */
function _rwBlockArgs(id) {
  if (typeof sgCanBlock !== 'function' || typeof sgSnapshot !== 'function' || typeof sgFreeStretches !== 'function') return { block: null, why: 'plain' };
  let can = null;
  try { can = sgCanBlock(); } catch (e) { can = null; }
  if (!can || !can.ok) return { block: null, why: can && can.reason === 'stale' ? 'stale' : 'nocal' };
  let snap = null;
  try { snap = sgSnapshot(); } catch (e) { return { block: null, why: 'plain' }; }
  const today = snap.now.date;
  const g = sgFreeStretches(snap, today, { gapMin: 15 }).find(x => x.end - x.start >= 15);
  if (!g) return { block: null, why: 'full' };
  const it = getItem(id);
  const t = (typeof sgTask === 'function' && sgTask(snap, id)) || (it ? { id, title: effTitle(it), subtasks: { open: [] } } : null);
  const est = it && Number(it.estimate) > 0 ? Number(it.estimate) : 60;
  const len = Math.max(15, Math.min(120, Math.round(est / 15) * 15 || 60, g.end - g.start));
  return { block: { taskId: id, date: today, start: g.start, end: g.start + len, gapEnd: g.end, rule: 'runway',
    title: typeof sgBlockTitle === 'function' ? sgBlockTitle(t) : 'Focus time', description: typeof sgBlockDescription === 'function' ? sgBlockDescription(t) : '' }, why: '' };
}
function _rwPlanHtml(t, preview) {
  const it = getItem(t.id);
  const today = todayStr();
  if (it && it.plannedFor === today) {
    const slot = typeof planSlotLabel === 'function' ? planSlotLabel(it) : '';
    return `<button type="button" class="btn btn-ghost btn-sm rw-planned" aria-pressed="true" data-act="planned" data-tip="Planned for today${slot ? ', ' + escAttr(slot) : ''}">${icon('check')}<span>Planned today</span></button>`;
  }
  const b = preview ? { block: null, why: 'plain' } : _rwBlockArgs(t.id);
  const name = esc(t.title.length > 60 ? t.title.slice(0, 59) + '…' : t.title);
  if (b.block) {
    const range = `${sgHM(b.block.start)}–${sgHM(b.block.end)}`;
    return `<span class="rw-split"><button type="button" class="btn btn-secondary btn-sm rw-plan" data-act="block" data-start="${b.block.start}" aria-label="Plan ${name} for today: open a new event ${range}, to adjust and save" data-tip="Opens a new event ${range} for it, to adjust; Save books it and plans it for today">${icon('calendar-plus')}<span>Plan for today</span></button>`
      + `<button type="button" class="btn btn-secondary btn-sm btn-icon rw-ok" data-act="plan" aria-label="Plan ${name} for today now, without a time, with Undo" data-tip="Plan for today now, no time · Undo">${icon('check')}</button></span>`;
  }
  const tip = b.why === 'full' ? 'Plans it for today (no free time left today to book)' : b.why === 'stale' ? 'Plans it for today (update the calendar to book time for it)' : b.why === 'nocal' ? 'Plans it for today (connect Google Calendar to book time for it)' : 'Plans it for today · Undo';
  return `<button type="button" class="btn btn-secondary btn-sm rw-plan" data-act="plan" aria-label="Plan ${name} for today, with Undo" data-tip="${escAttr(tip)}">${icon('sun')}<span>Plan for today</span></button>`;
}
function _rwTaskHtml(t, ctx, m) {
  const it = getItem(t.id);
  const bits = [];
  if (t.due) bits.push(`Due ${_rwDate(t.due)}`);
  if (t.steps) bits.push(`${t.steps.done} of ${t.steps.total} steps`);
  if (it && statusOf(t.id) === 'doing') bits.unshift('In progress');
  const cur = !ctx.preview && typeof tcCurrentTaskId === 'function' && tcCurrentTaskId() === t.id;
  const prio = it && typeof effPriority === 'function' ? effPriority(it) : 'p0';
  return `<div class="rw-task${cur ? ' is-current' : ''}" ${homeRowAttrs(t.id, t.title + (bits.length ? ', ' + bits.join(', ') : ''))} data-id="${escAttr(t.id)}" data-flip="${escAttr('rw:t:' + t.id)}"${cur ? ' aria-current="true"' : ''}>`
    + `<span class="rw-p ${escAttr(prio)}" aria-hidden="true"></span>`
    + `<span class="rw-tm"><button type="button" class="rw-tt" data-act="open" tabindex="-1">${esc(t.title || '(untitled)')}</button>`
    + (bits.length ? `<span class="rw-meta">${esc(bits.join(' · '))}</span>` : '') + `</span>`
    + `<span class="rw-tact">${_rwPlanHtml(t, ctx.preview)}</span></div>`;
}

/* ---------- render ---------- */
function _rwRender(el, ctx) {
  const size = ctx.size === 's' || ctx.size === 'l' ? ctx.size : 'm';
  const r = ctx.preview ? _rwSampleRun(ctx) : homeMemo('rw:' + ctx.id, homeMemoSig({ extra: [ctx.prefs, size, size === 'l' ? _rwCalHorizon() : '', size === 'l' ? Math.floor(Date.now() / 900000) : 0] }), () => homeRunwayFor(ctx.id, { hours: size === 'l' }));
  const card = document.createElement('section');
  card.className = `card home-card rw rw-${size}`;
  card.dataset.flip = 'rw:' + ctx.id;
  const cd = r.countdown || null;
  const head = `<div class="card-h">${icon('milestone')}`
    + (cd && !r.setup ? `<h3 class="rw-h"><button type="button" class="rw-name" data-act="cd" aria-label="${escAttr(`Edit the countdown ${cd.label || ''}`)}">${esc(cd.label || 'Countdown')}</button></h3>`
      : `<h3>${esc(ctx.def && ctx.def.title || 'Deadline runway')}</h3>`)
    + (!r.setup && size !== 's' ? `<span class="rw-scope">${_rwScopeHtml(r.prefs.scope)}</span>` : '')
    + `<span class="spacer"></span></div>`;
  card.innerHTML = head + `<div class="card-b rw-b"></div>`;
  const hd = card.querySelector('.card-h');
  if (!ctx.preview) {
    const gear = homeSettingsButton(ctx, 'Choose what this runway tracks');
    gear.dataset.act = 'choose';
    gear.onclick = null;
    gear.setAttribute('data-tip', 'Choose…');
    hd.appendChild(gear);
  }
  const body = card.querySelector('.rw-b');
  el.appendChild(card);
  if (r.setup) _rwSetupHtml(body, r, ctx);
  else _rwReadyHtml(body, r, ctx, size);
  _rwBind(card, ctx, r);
  if (!ctx.preview) {
    const day = todayStr();
    homeTick(ctx, (now) => (typeof fmtDate === 'function' && fmtDate(now) !== day ? 'rerender' : undefined));
  }
  return true;
}
function _rwReadyHtml(body, r, ctx, size) {
  const m = r.model, cd = r.countdown;
  const prev = _rwPrev.get(ctx.id) || null;
  const morph = !ctx.firstPaint && !ctx.preview && !!prev;
  const sweep = !!ctx.firstPaint && !ctx.preview;
  if (!m.total) {
    body.innerHTML = `<div class="rw-empty">${typeof homeScene === 'function' ? homeScene('deadline', { size: 'sm' }) : ''}<div><b>Nothing in ${esc(_rwScopeWords(r.prefs.scope))} yet</b>`
      + `<span>${esc(cd.label || 'This countdown')} ${m.daysLeft > 0 ? `is ${esc(_rwPl(m.daysLeft, 'day'))} away` : m.daysLeft === 0 ? 'is today' : `was ${esc(_rwPl(-m.daysLeft, 'day'))} ago`}. Add the tasks it needs, or count something else.</span></div>`
      + `<div class="rw-empty-act">${r.prefs.scope.kind !== 'query' ? `<button type="button" class="btn btn-secondary btn-sm" data-act="add-task">${icon('plus')}<span>Add a task</span></button>` : ''}`
      + `<button type="button" class="btn btn-ghost btn-sm" data-act="choose">${icon('sliders-horizontal')}<span>Choose…</span></button></div></div>`;
    return;
  }
  const g = size === 's' ? null : rwSparkGeometry(m, { w: 300, h: 64 });
  const pill = `<span class="rw-pill is-${escAttr(m.status)}" data-flip="${escAttr('rw:pill:' + ctx.id)}">${esc(m.statusText)}</span>`;
  const sub = m.date ? `${_rwDate(m.date)}${m.daysLeft > 0 ? ` · ${_rwPl(m.workdaysLeft, 'workday')}` : ''}` : '';
  let html = `<div class="rw-top">${_rwRingHtml(m, sweep, morph ? prev.p : null)}`
    + `<div class="rw-facts"><div class="rw-left"><b class="num">${esc(_rwDaysText(m))}</b><span class="rw-sep" aria-hidden="true">·</span><span>${esc(_rwLeftText(m))}</span></div>`
    + `<div class="rw-sub">${pill}${sub ? `<span class="rw-when">${esc(sub)}</span>` : ''}</div></div></div>`;
  if (size === 's') {
    html += `<p class="rw-pace">${esc(_rwPaceText(m))}</p>`;
  } else {
    html += `<div class="rw-chart-wrap">${_rwChartHtml(m, r.prefs.scope, cd, sweep, morph ? prev : null)}</div>`
      + `<p class="rw-pace">${esc(_rwPaceText(m))}</p>`;
    if (size === 'l') {
      const facts = [_rwProjectedText(m), _rwHoursText(m)].filter(Boolean);
      if (facts.length) {
        html += `<ul class="rw-more">` + facts.map((f, i) => `<li class="${i === 0 && m.projectedLate ? 'is-late' : i === 1 && m.hours && m.hours.short ? 'is-late' : ''}">${icon(i === 0 ? 'flag' : 'clock', 'i-xs')}<span>${esc(f)}</span></li>`).join('') + `</ul>`;
      }
    }
    const next = m.next.slice(0, size === 'l' ? 3 : 1);
    if (next.length) html += `<div class="rw-next"><div class="rw-next-h">${size === 'l' && next.length > 1 ? 'Next up' : 'Next'}</div><div class="rw-tasks">${next.map(t => _rwTaskHtml(t, ctx, m)).join('')}</div></div>`;
  }
  body.innerHTML = html;
  if (body.parentElement) body.parentElement.classList.add('rw-st-' + m.status);
  if (!ctx.preview) {
    // What this paint drew, so the next one (a save, live sync) glides from it.
    _rwPrev.set(ctx.id, { p: m.total ? Math.round(m.done / m.total * 100) : 0, done: g && g.done, area: g && g.area, need: g && g.need, total: g && g.total, dot: g && g.today });
    if (morph) _rwMorph(body);
    const rows = body.querySelector('.rw-tasks');
    if (rows) {
      homeRowKeys(rows, {
        open: (id, row) => ctx.openTask(id, row),
        today: (id, row) => { const b = row.querySelector('[data-act="plan"]'); if (b) _rwPlanNow(id, b); },
      });
      ctx.enterNew(rows.querySelectorAll('.rw-task'), (x) => x.dataset.id);
    }
    if (size !== 's') homeSuggestSlot(body, ctx, { countdownId: cd.id, scope: r.prefs.scope });
  }
}
/** Later paints: the ring and the chart's lines glide from what was drawn before to now. */
function _rwMorph(body) {
  const reduced = (window.Motion && typeof Motion.prefersReduced === 'function' && Motion.prefersReduced()) || document.documentElement.dataset.motion === 'reduced';
  const ring = body.querySelector('.rw-ring');
  const paths = [...body.querySelectorAll('.rw-chart path')];
  const dot = body.querySelector('.rw-dot');
  const settle = () => {
    if (ring) ring.style.setProperty('--p', ring.dataset.p);
    for (const p of paths) { const d = p.getAttribute('d'); if (d) p.style.d = `path('${d}')`; }
    if (dot && dot.dataset.to) dot.setAttribute('style', dot.dataset.to);
  };
  if (reduced) { settle(); return; }
  body.classList.add('is-morph');
  requestAnimationFrame(() => requestAnimationFrame(() => { if (body.isConnected) settle(); }));
}
function _rwSetupHtml(body, r, ctx) {
  const scene = typeof homeScene === 'function' ? homeScene('deadline', { size: 'sm' }) : '';
  const cds = _rwCountdowns();
  const today = todayStr();
  if (r.setup === 'gone' || r.setup === 'nodate') {
    const gone = r.setup === 'gone';
    body.innerHTML = `<div class="rw-empty">${scene}<div><b>${gone ? 'Its countdown was removed' : `${esc(r.countdown.label || 'This countdown')} has no date`}</b>`
      + `<span>${gone ? 'Choose another countdown to follow.' : 'Give it a date in the top bar and the runway starts counting.'}</span></div>`
      + `<div class="rw-empty-act">${gone ? `<button type="button" class="btn btn-secondary btn-sm" data-act="choose">${icon('sliders-horizontal')}<span>Choose another</span></button>`
        : `<button type="button" class="btn btn-secondary btn-sm" data-act="cd-edit" data-cd="${escAttr(r.countdown.id)}">${icon('pencil')}<span>Set its date</span></button>`}</div></div>`;
    return;
  }
  if (r.setup === 'scope') {
    const streams = _rwStreams().map(s => [s, _rwOpenIn({ kind: 'stream', value: s.id })]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
    body.innerHTML = `<div class="rw-setup"><p class="rw-q">What counts towards <b>${esc(r.countdown.label || 'this countdown')}</b>?</p>`
      + `<div class="rw-chips" role="group" aria-label="Streams">${streams.map(([s, n]) => `<button type="button" class="chip rw-chip" data-act="scope" data-kind="stream" data-value="${escAttr(s.id)}">${typeof streamMarkHtml === 'function' ? streamMarkHtml(s.id) : ''}<span>${esc(s.label)}</span><small class="num">${n}</small></button>`).join('')}`
      + `<button type="button" class="chip rw-chip is-more" data-act="choose">${icon('sliders-horizontal', 'i-xs')}<span>Choose…</span></button></div></div>`;
    return;
  }
  // Not set up: the soonest countdowns as one-click chips, Choose… for the rest.
  const soon = cds.filter(w => w.date && w.date >= today).slice(0, ctx.size === 's' ? 2 : 3);
  if (!cds.length) {
    body.innerHTML = `<div class="rw-empty">${scene}<div><b>Will you make it?</b><span>Add a countdown for a deadline first; the runway then shows your pace against it.</span></div>`
      + `<div class="rw-empty-act"><button type="button" class="btn btn-secondary btn-sm" data-act="new-cd">${icon('plus')}<span>New countdown…</span></button></div></div>`;
    return;
  }
  body.innerHTML = `<div class="rw-setup"><div class="rw-intro">${scene}<p><b>Will you make it?</b><span>Pick a deadline: the runway compares your recent pace with what is left.</span></p></div>`
    + `<div class="rw-chips" role="group" aria-label="Countdowns">${soon.map(w => `<button type="button" class="chip rw-chip" data-act="pick-cd" data-cd="${escAttr(w.id)}"><span>${esc(w.label || 'Countdown')}</span><small>${esc(_rwDate(w.date, false))}</small></button>`).join('')}`
    + `<button type="button" class="chip rw-chip is-more" data-act="choose">${icon('sliders-horizontal', 'i-xs')}<span>Choose…</span></button></div></div>`;
}

/* ---------- actions ---------- */
function _rwBind(card, ctx, r) {
  if (ctx.preview) return;
  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !card.contains(b) || b.disabled) return;
    const act = b.dataset.act;
    const row = b.closest('.rw-task');
    const id = row ? row.dataset.id : null;
    if (act === 'choose') { _rwPicker(b, ctx); return; }
    if (act === 'cd' && r.countdown) { if (typeof openCountdownEditor === 'function') openCountdownEditor(r.countdown.id); return; }
    if (act === 'cd-edit') { if (typeof openCountdownEditor === 'function') openCountdownEditor(b.dataset.cd); return; }
    if (act === 'new-cd') { if (typeof openCountdownEditor === 'function') openCountdownEditor(); return; }
    if (act === 'chart') { _rwOpenScope(r.prefs.scope); return; }
    if (act === 'open' && id) { ctx.openTask(id, row); return; }
    if (act === 'plan' && id) { _rwPlanNow(id, b); return; }
    if (act === 'block' && id) { _rwBlockOpen(id, b, ctx); return; }
    if (act === 'pick-cd') { _rwPickCountdown(ctx, b.dataset.cd, true); return; }
    if (act === 'scope') { _rwSetScope(ctx, { kind: b.dataset.kind, value: b.dataset.value }, true); return; }
    if (act === 'add-task') { _rwAddTask(r, b); return; }
    // 'planned': already planned for today; clicking it again does nothing.
  });
}
/** Plan a task for today at once (the ✓, T, or the one button without a calendar). One undo step. */
function _rwPlanNow(id, btn) {
  const it = getItem(id);
  if (!it || it.plannedFor === todayStr()) return Promise.resolve(false);
  const name = effTitle(it);
  return homeAction(btn, () => { setPlanned(id, todayStr()); return true; },
    { done: 'Planned', toast: `Planned for today: ${name.length > 48 ? name.slice(0, 47) + '…' : name}`, undo: true, say: `${name} planned for today` });
}
/** Plan for today, the editor way: the event card in create mode, prefilled for this task (S1's cal.blockOpen). */
function _rwBlockOpen(id, btn, ctx) {
  const b = _rwBlockArgs(id);
  if (!b.block) { toast('No free time left today to book; the ✓ plans it without a time.', { icon: 'calendar-clock' }); ctx.rerender(); return; }
  const card = { key: `runway:${id}:${b.block.date}`, rule: 'runway', title: 'Plan for today', text: '', primary: { label: 'Plan for today', action: { type: 'cal.blockOpen', args: b.block } } };
  sgRun(card.primary.action, card, { from: btn, surface: 'runway', count: false }).then((res) => {
    if (res && res.ok === false && res.message) toast(res.message, { kind: 'err' });
  });
}
/** Add a task to the scope: the task card in create mode, prefilled with the stream or tag. */
function _rwAddTask(r, from) {
  const s = r.prefs.scope || {};
  const pre = s.kind === 'stream' ? { stream: s.value } : s.kind === 'tag' ? { tags: [s.value] } : {};
  if (r.countdown && r.countdown.date && r.countdown.date >= todayStr()) pre.date = r.countdown.date;
  if (typeof tcOpenCreate === 'function') tcOpenCreate(pre, { from });
  else if (typeof openNewTask === 'function') openNewTask('', { from });
}
function _rwOpenScope(scope) {
  if (!_rwScopeOk(scope)) return;
  if (scope.kind === 'stream') { if (typeof STREAMS !== 'undefined' && STREAMS[scope.value]) setView('stream:' + scope.value); return; }
  if (scope.kind === 'tag') { setView('tag:' + scope.value); return; }
  setView('all');
  searchQuery = scope.value;
  const si = document.getElementById('search-input'); if (si) si.value = scope.value;
  renderMain();
}
/** Follow a countdown; with nothing chosen to count yet, a scope guessed from its name comes too (one undo step). */
function _rwPickCountdown(ctxOrId, cdId, fromCard) {
  const id = typeof ctxOrId === 'string' ? ctxOrId : ctxOrId.id;
  const p = homePrefs(id);
  if (!cdId || p.countdownId === cdId) return false;
  const cd = _rwCountdowns().find(w => w.id === cdId);
  if (!cd) return false;
  const patch = { countdownId: cdId };
  let guess = null;
  if (!_rwScopeOk(p.scope)) {
    guess = rwGuessScope(cd.label, _rwStreams(), _rwTags().map(x => x[0]));
    if (guess) patch.scope = guess;
  }
  const msg = fromCard ? `Tracking ${cd.label || 'the countdown'}${guess ? ' · ' + _rwScopeWords(guess) : ''}` : null;
  const ok = homeSetPrefs(id, patch, msg);
  if (ok && fromCard && !guess) _rwPickerLater(id);        // still to choose: what counts
  return ok;
}
function _rwSetScope(ctxOrId, scope, fromCard) {
  const id = typeof ctxOrId === 'string' ? ctxOrId : ctxOrId.id;
  if (!_rwScopeOk(scope)) return false;
  const p = homePrefs(id);
  if (p.scope && p.scope.kind === scope.kind && p.scope.value === scope.value) return false;
  return homeSetPrefs(id, { scope: { kind: scope.kind, value: scope.value.trim() } }, fromCard ? `Counting ${_rwScopeWords(scope)}` : null);
}
/** Open the picker on a copy once Home has repainted (its button is a new one). */
function _rwPickerLater(id) {
  setTimeout(() => {
    const b = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(id)}"] [data-act="choose"]`);
    const rec = typeof homeWidgetDef === 'function' ? homeWidgetDef(id) : null;
    if (b && rec) _rwPicker(b, { id, def: rec, preview: false });
  }, 60);
}

/* ---------- the picker (Choose… and the gear) ---------- */
function _rwPicker(anchor, ctx) {
  if (!anchor || !ctx || ctx.preview || typeof openPopover !== 'function') return;
  const id = ctx.id;
  let kindShown = null;            // a scope kind looked at but not picked yet
  openPopover(anchor, (el) => {
    el.classList.add('hg-set', 'rw-pick');
    // Keep it on screen: when the rest of the page leaves no room below, it slides up and scrolls inside.
    const fit = () => requestAnimationFrame(() => {
      if (!el.isConnected) return;
      el.style.maxHeight = '';
      const vh = window.innerHeight, h = el.offsetHeight;
      let top = el.getBoundingClientRect().top;
      if (top + h > vh - 8) top = Math.max(8, vh - 8 - h);
      el.style.top = Math.round(top) + 'px';
      el.style.maxHeight = Math.max(160, vh - 8 - top) + 'px';
    });
    const paint = (focusKey) => {
      const p = homePrefs(id);
      const kind = kindShown || (p.scope && p.scope.kind) || 'stream';
      const cds = _rwCountdowns();
      const today = todayStr();
      const opt = (key, on, html, attrs) => `<button type="button" class="rw-opt${on ? ' on' : ''}" role="radio" aria-checked="${on}" data-k="${escAttr(key)}" ${attrs}>${html}${on ? icon('check', 'i-xs rw-opt-ck') : ''}</button>`;
      let html = `<div class="hg-set-h">${icon('milestone')}<b>${esc((ctx.def && ctx.def.title) || 'Deadline runway')}</b></div>`;
      html += `<div class="rw-sec"><div class="rw-sec-h" id="rw-cd-h-${escAttr(id)}">Deadline</div><div class="rw-opts" role="radiogroup" aria-labelledby="rw-cd-h-${escAttr(id)}">`
        + cds.map(w => opt('cd:' + w.id, p.countdownId === w.id, `<span class="rw-ol">${esc(w.label || 'Countdown')}</span><small>${esc(w.date ? _rwDate(w.date) + (w.date < today ? ' · passed' : '') : 'no date')}</small>`, `data-cd="${escAttr(w.id)}"`)).join('')
        + `</div><button type="button" class="rw-opt rw-new" data-k="new-cd" data-new="1">${icon('plus', 'i-xs')}<span class="rw-ol">New countdown…</span></button></div>`;
      html += `<div class="rw-sec"><div class="rw-sec-h" id="rw-sc-h-${escAttr(id)}">What counts</div>`
        + `<span class="seg rw-kinds" role="radiogroup" aria-labelledby="rw-sc-h-${escAttr(id)}">${[['stream', 'Stream'], ['tag', 'Tag'], ['query', 'Search']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${kind === k}" class="${kind === k ? 'on' : ''}" data-k="kind:${k}" data-kind="${k}">${l}</button>`).join('')}</span>`;
      if (kind === 'stream') {
        html += `<div class="rw-opts" role="radiogroup" aria-label="Streams">` + _rwStreams().map(s => {
          const on = !!(p.scope && p.scope.kind === 'stream' && p.scope.value === s.id);
          return opt('stream:' + s.id, on, `${typeof streamMarkHtml === 'function' ? streamMarkHtml(s.id) : ''}<span class="rw-ol">${esc(s.label)}</span><small class="num">${_rwOpenIn({ kind: 'stream', value: s.id })} open</small>`, `data-kind="stream" data-value="${escAttr(s.id)}"`);
        }).join('') + `</div>`;
      } else if (kind === 'tag') {
        const tags = _rwTags().slice(0, 14);
        html += tags.length ? `<div class="rw-opts" role="radiogroup" aria-label="Tags">` + tags.map(([t, open]) => {
          const on = !!(p.scope && p.scope.kind === 'tag' && p.scope.value === t);
          return opt('tag:' + t, on, `${(typeof tagMarkHtml === 'function' && tagMarkHtml(t)) || icon('hash', 'i-xs')}<span class="rw-ol">${esc(t)}</span><small class="num">${open} open</small>`, `data-kind="tag" data-value="${escAttr(t)}"`);
        }).join('') + `</div>` : `<p class="rw-hint">No tags yet.</p>`;
      } else {
        const v = p.scope && p.scope.kind === 'query' ? p.scope.value : '';
        html += `<input class="input input-sm rw-q-in" type="text" data-k="query" maxlength="200" placeholder="#corrections stream:report" aria-label="Tasks that count: a task search" value="${escAttr(v)}">`
          + `<p class="rw-hint">A task search: #tag, @person, stream:name, words. Press Enter to use it.</p>`;
      }
      html += `</div><div class="rw-sec rw-row"><div class="rw-sec-h" id="rw-u-h-${escAttr(id)}">Count</div><span class="seg" role="radiogroup" aria-labelledby="rw-u-h-${escAttr(id)}">`
        + [['tasks', 'Tasks'], ['steps', 'Checklist steps']].map(([k, l]) => `<button type="button" role="radio" aria-checked="${p.unit === k}" class="${p.unit === k ? 'on' : ''}" data-k="unit:${k}" data-unit="${k}">${l}</button>`).join('') + `</span></div>`
        + `<div class="rw-sec rw-row"><div class="rw-sec-h"><span>Weekends count as workdays</span></div><button type="button" class="switch${p.countWeekends ? ' on' : ''}" role="switch" aria-checked="${!!p.countWeekends}" aria-label="Weekends count as workdays" data-k="weekends" data-weekends="1"></button></div>`;
      el.innerHTML = html;
      fit();
      if (focusKey) {
        const f = el.querySelector(`[data-k="${CSS.escape(focusKey)}"]`);
        if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* gone */ }
      }
    };
    el.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || !el.contains(b)) return;
      const key = b.dataset.k || '';
      if (b.dataset.new) { closePopovers(); if (typeof openCountdownEditor === 'function') openCountdownEditor(); return; }
      if (b.dataset.cd) { if (_rwPickCountdown(id, b.dataset.cd, false)) { kindShown = null; paint(key); } return; }
      if (b.dataset.kind && !b.dataset.value) { const k = b.dataset.kind; const p = homePrefs(id); const cur = kindShown || (p.scope && p.scope.kind) || 'stream'; if (k !== cur) { kindShown = k; paint(key); } return; }
      if (b.dataset.kind && b.dataset.value) { if (_rwSetScope(id, { kind: b.dataset.kind, value: b.dataset.value }, false)) { kindShown = null; paint(key); } return; }
      if (b.dataset.unit) { if (homeSetPrefs(id, { unit: b.dataset.unit })) paint(key); return; }
      if (b.dataset.weekends) { if (homeSetPrefs(id, { countWeekends: !homePrefs(id).countWeekends })) paint(key); }
    });
    el.addEventListener('keydown', (e) => {
      const inp = e.target.closest && e.target.closest('.rw-q-in');
      if (!inp || e.key !== 'Enter') return;
      e.preventDefault();
      const v = inp.value.trim();
      if (v && _rwSetScope(id, { kind: 'query', value: v }, false)) { kindShown = null; paint('query'); }
    });
    el.addEventListener('change', (e) => {
      const inp = e.target.closest && e.target.closest('.rw-q-in');
      if (!inp) return;
      const v = inp.value.trim();
      if (v && _rwSetScope(id, { kind: 'query', value: v }, false)) { kindShown = null; paint(); }
    });
    paint();
  }, { width: 340, align: 'end', className: 'hg-set-pop rw-pop' });
}

/* ---------- the gallery's preview: synthetic data, nothing fetched or written ---------- */
function _rwSample(kit) {
  const today = kit.today;
  const day = 86400000, now = Date.now();
  const titles = ['Draft the launch notes', 'Review the onboarding flow', 'Prepare slides for Monday', 'Check the pricing page', 'Fix the sign-up email', 'Write the FAQ', 'Test on a phone', 'Plan the announcement'];
  const items = [], statuses = {}, completionLog = {};
  for (let i = 0; i < 22; i++) {
    const id = 'sample-rw-' + i;
    items.push({ id, title: titles[i % titles.length] + (i >= titles.length ? ' (' + (Math.floor(i / titles.length) + 1) + ')' : ''), stream: 'work', priority: i % 3 ? 'p2' : 'p1', createdAt: now - (34 - i) * day, estimate: 45 + (i % 4) * 15, dueDate: i >= 12 ? _rwAdd(today, i - 6) : null });
    if (i < 12) { statuses[id] = 'done'; completionLog[id] = [now - (26 - i * 2) * day]; }
  }
  return { countdown: Object.assign({ label: 'Launch' }, kit.countdown || {}), items, statuses, completionLog, scope: { kind: 'stream', value: 'work' } };
}
function _rwSampleRun(ctx) {
  const s = homeSample('runway') || _rwSample(_homeSampleKit());
  const model = homeRunway({ items: s.items, statuses: s.statuses, completionLog: s.completionLog, countdown: s.countdown, scope: s.scope, unit: 'tasks', today: todayStr(), freeMinOn: () => 300 });
  // The sample's tasks are not in the data: draw them without lookups.
  return { setup: null, prefs: { scope: s.scope, unit: 'tasks' }, countdown: s.countdown, model, sample: s };
}
