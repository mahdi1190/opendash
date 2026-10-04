/* ============================================================
   TOP BAR WIDGETS (owner: Home / top-bar builder)
   The strip in the shell's #countdowns slot. Widgets are user data in
   state.countdowns (the name is kept for compatibility with the actions
   layer, live sync and older files); the array order is the display order
   and the headline widget is always first.

   Widget shape (all optional except id/type; tbNormalize fills defaults):
     { id, type: 'countdown'|'countup'|'progress'|'tasks'|'event'|'clock',
       label, date 'YYYY-MM-DD', time 'HH:MM', start 'YYYY-MM-DD',
       icon (sprite id or an emoji), color (swatch name or #hex),
       style 'subtle'|'tinted'|'solid', unit 'days'|'weeks'|'workdays'|'date',
       headline, showBar, warnDays (0 = off), hideWhenPast, visible,
       tasks 'today'|'overdue'|'week'|'doing'|'pinned'   (type tasks),
       clock 'both'|'time'|'date'                         (type clock) }
   Migration 020-countdowns writes this shape into older data; the
   countdown.* / topbar.add_widget actions (server/actions/ops-home.mjs) let an
   assistant edit it; lib/home-topbar.mjs has the same rules for the server.

   API: renderTopbar() (render() calls it), tbList(), tbNormalize(w, i),
   tbCompute(w), tbWidgetEl(w, opts), calendarSoon(cb), openCountdownEditor(id)
   and openTopbarCustomiser(opts) (10-header-editor.js).
   ============================================================ */
const _CD_SWATCHES = ['indigo', 'blue', 'teal', 'green', 'amber', 'orange', 'red', 'pink', 'violet', 'slate'];
const TB_TYPES = {
  countdown: { label: 'Countdown', icon: 'hourglass', hint: 'Days until a date', dated: true },
  countup: { label: 'Count up', icon: 'timer', hint: 'Days since a date', dated: true },
  progress: { label: 'Progress', icon: 'target', hint: 'Time between two dates', dated: true },
  tasks: { label: 'Tasks due', icon: 'list-checks', hint: 'Live count of tasks' },
  event: { label: 'Next event', icon: 'calendar-clock', hint: 'From your calendar' },
  clock: { label: 'Date & time', icon: 'clock', hint: 'Today and the time' },
};
const TB_UNITS = ['days', 'weeks', 'workdays', 'date'];
const TB_STYLES = ['subtle', 'tinted', 'solid'];
const TB_TASK_FILTERS = { today: 'Due today', overdue: 'Overdue', week: 'Next 7 days', doing: 'In progress', pinned: 'Pinned' };
const TB_CLOCK_FORMATS = { both: 'Time + date', time: 'Time', date: 'Date' };
const _TB_ISO = /^\d{4}-\d{2}-\d{2}$/;
const _TB_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** A widget with every field filled in (never mutates the input). */
function tbNormalize(raw, i, legacyHeadline) {
  const w = Object.assign({}, raw && typeof raw === 'object' ? raw : {});
  w.id = String(w.id || ('tbw-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)));
  w.type = TB_TYPES[w.type] ? w.type : 'countdown';
  w.label = typeof w.label === 'string' ? w.label : '';
  w.date = _TB_ISO.test(w.date || '') ? w.date : '';
  w.time = _TB_TIME.test(w.time || '') ? w.time : '';
  w.start = _TB_ISO.test(w.start || '') ? w.start : '';
  w.unit = ({ d: 'days', w: 'weeks', wd: 'workdays' })[w.unit] || (TB_UNITS.includes(w.unit) ? w.unit : 'days');
  w.headline = typeof w.headline === 'boolean' ? w.headline : !!legacyHeadline;
  w.style = TB_STYLES.includes(w.style) ? w.style : (w.headline ? 'tinted' : 'subtle');
  if (!(typeof w.color === 'string' && (_CD_SWATCHES.includes(w.color) || /^#[0-9a-f]{3,8}$/i.test(w.color)))) {
    w.color = w.headline ? 'indigo' : _CD_SWATCHES[((Number(i) || 0) + 1) % _CD_SWATCHES.length];
  }
  if (typeof w.icon !== 'string' || !w.icon.trim()) w.icon = TB_TYPES[w.type].icon;
  const dated = !!TB_TYPES[w.type].dated;
  w.warnDays = Number.isFinite(Number(w.warnDays)) && w.warnDays !== null && w.warnDays !== '' ? Math.max(0, Math.min(365, Math.round(Number(w.warnDays)))) : (w.type === 'countdown' ? 14 : 0);
  w.showBar = typeof w.showBar === 'boolean' ? w.showBar : !!(w.type === 'progress' || (dated && w.start));
  w.hideWhenPast = !!w.hideWhenPast;
  w.visible = w.visible !== false;
  w.tasks = TB_TASK_FILTERS[w.tasks] ? w.tasks : 'today';
  w.clock = TB_CLOCK_FORMATS[w.clock] ? w.clock : 'both';
  // A clock's zone (travel spec 5.1): 'local' = the dashboard's zone (default), 'home', or an IANA id.
  if (w.type === 'clock' && w.zone && w.zone !== 'local') {
    if (w.zone !== 'home' && !(typeof Clock !== 'undefined' ? Clock.valid(w.zone) : /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$/.test(w.zone))) delete w.zone;
  } else delete w.zone;
  if (typeof w.zoneLabel === 'string' && w.zone) w.zoneLabel = w.zoneLabel.slice(0, 40); else delete w.zoneLabel;
  return w;
}

/** All widgets, normalised, headline first (array order otherwise). */
function tbList(src) {
  const raw = Array.isArray(src) ? src : (state && Array.isArray(state.countdowns) ? state.countdowns : []);
  // Before 2.0 the first countdown was the headline; keep that until a
  // widget says otherwise (migration 020 makes it explicit).
  const legacy = !raw.some(w => w && typeof w.headline === 'boolean');
  const list = raw.filter(w => w && typeof w === 'object').map((w, i) => tbNormalize(w, i, legacy && i === 0));
  let seen = false;
  for (const w of list) { if (w.headline) { if (seen) w.headline = false; seen = true; } }
  const h = list.findIndex(w => w.headline);
  if (h > 0) list.unshift(list.splice(h, 1)[0]);
  return list;
}

/* ---------- date maths (local calendar days) ---------- */
function _tbDays(iso) { return iso ? daysUntil(iso) : null; }
// Wall dates (ISO days) are counted with UTC arithmetic, so no time zone or
// clock change can shift them; "now" and "today" come from Clock (07-core-clock.js).
const _tbUtc = (iso) => (_TB_ISO.test(iso || '') ? Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) : NaN);
function _tbWorkdays(fromIso, toIso) {
  // Mon-Fri days after `from` up to and including `to` (negative if to < from).
  const a = _tbUtc(fromIso), b = _tbUtc(toIso);
  if (isNaN(a) || isNaN(b)) return null;
  const sign = b < a ? -1 : 1;
  const [lo, hi] = sign > 0 ? [a, b] : [b, a];
  // Whole weeks first, then the remainder day by day.
  const total = Math.round((hi - lo) / 86400000);
  let n = Math.floor(total / 7) * 5;
  for (let t = lo + Math.floor(total / 7) * 7 * 86400000 + 86400000; t <= hi; t += 86400000) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n * sign;
}
function _tbLocale() { return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined; }
function _tbShortDate(iso, withWeekday) {
  if (!_TB_ISO.test(iso || '')) return iso || '';
  const d = new Date(iso + 'T12:00:00Z');   // a wall date: noon UTC, formatted in UTC
  const sameYear = iso.slice(0, 4) === todayStr().slice(0, 4);
  const o = { day: 'numeric', month: 'short', timeZone: 'UTC' };
  if (withWeekday) o.weekday = 'short';
  if (!sameYear) o.year = 'numeric';
  return _tbFmtParts(d, o) || iso;
}
/** A locale date without the commas some locales put after the weekday ("Fri 18 Dec 2026"). */
function _tbFmtParts(d, o) {
  try {
    return new Intl.DateTimeFormat(_tbLocale(), o).formatToParts(d)
      // Newer ICU writes "Sept" for en-GB; the design uses three letters like every other month.
      .map(p => (p.type === 'literal' ? p.value.replace(/,\s*/g, ' ') : p.type === 'month' && p.value === 'Sept' ? 'Sep' : p.value)).join('').replace(/\s+/g, ' ').trim();
  } catch (e) { return ''; }
}
/** An instant's time ('14:05') in `zone` (default: the dashboard's zone). */
function _tbTime(d, zone) { return Clock.fmtTime(d instanceof Date ? d.getTime() : Number(d), zone ? { zone } : undefined); }
function _tbNowHM() { const p = Clock.parts(Clock.now()); return `${String(p.h).padStart(2, '0')}:${String(p.mi).padStart(2, '0')}`; }
/** {num, unit} for a day count in the widget's unit (n >= 0). */
function _tbAmount(n, unit, iso) {
  if (unit === 'date' && iso) return { num: _tbShortDate(iso), unit: '' };
  if (unit === 'weeks' && n >= 14) return { num: String(Math.floor(n / 7)), unit: 'w' };
  if (unit === 'workdays' && iso) {
    const wd = Math.abs(_tbWorkdays(todayStr(), iso) || 0);
    return { num: String(wd), unit: 'wd' };
  }
  return { num: String(n), unit: 'd' };
}
function _tbPct(startIso, endIso) {
  if (!startIso || !endIso || endIso <= startIso) return null;
  const s = _tbUtc(startIso), e = _tbUtc(endIso), now = _tbUtc(todayStr());
  return Math.max(0, Math.min(100, Math.round(((now - s) / (e - s)) * 100)));
}

/* ---------- live counts for the 'tasks' widget ---------- */
function _tbTaskCount(filter) {
  const open = getAllItems().filter(i => statusOf(i.id) !== 'done');
  const d = (i) => daysUntil(effDate(i));
  const pick = {
    today: open.filter(i => { const x = d(i); return x !== null && x <= 0; }),
    overdue: open.filter(i => { const x = d(i); return x !== null && x < 0; }),
    week: open.filter(i => { const x = d(i); return x !== null && x <= 7; }),
    doing: open.filter(i => statusOf(i.id) === 'doing'),
    pinned: open.filter(i => isPinned(i.id)),
  };
  const overdue = pick.overdue.length;
  return { n: (pick[filter] || pick.today).length, overdue };
}
const _TB_TASK_VIEW = { today: 'today', overdue: 'today', week: 'week', doing: 'all', pinned: 'all' };

/* ---------- calendar events (shared with Home) ---------- */
// One small cache of the next 8 days of events from the actions layer
// (GET /api/query?op=calendar.list). Callers get the cached value at once
// and a repaint when a fetch finishes.
const _calSoonWaiters = new Set();
const _calSoon = { at: 0, day: '', loading: false, ok: false, events: [], note: '', stale: '', fetchedAt: '' };
function calendarSoon(onUpdate, force) {
  const today = todayStr();
  const fresh = _calSoon.day === today && Date.now() - _calSoon.at < 5 * 60 * 1000;
  const featureOff = APP_CONFIG.features && APP_CONFIG.features.calendar === false;
  if (featureOff) return Object.assign({}, _calSoon, { ok: false, off: true, note: 'Calendar is turned off in Settings.' });
  if (typeof onUpdate === 'function' && (_calSoon.loading || !fresh || force)) _calSoonWaiters.add(onUpdate);
  if ((!fresh || force) && !_calSoon.loading && typeof fetch === 'function' && (typeof _serverAvailable === 'undefined' || _serverAvailable)) {
    _calSoon.loading = true;
    const url = `/api/query?op=calendar.list&from=${today}&to=${Clock.addDays(today, 8)}`;
    fetch(url, { headers: { 'Accept': 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))
      .then(j => {
        _calSoon.events = Array.isArray(j.events) ? j.events : [];
        _calSoon.ok = !j.note || _calSoon.events.length > 0;
        _calSoon.note = j.note || '';
        _calSoon.stale = j.stale || '';
        _calSoon.fetchedAt = j.fetchedAt || '';
      })
      .catch(() => { _calSoon.ok = false; _calSoon.note = 'The calendar could not be read.'; })
      .finally(() => {
        _calSoon.loading = false; _calSoon.at = Date.now(); _calSoon.day = today;
        const ws = [..._calSoonWaiters]; _calSoonWaiters.clear();
        for (const fn of ws) { try { fn(); } catch (e) { console.error(e); } }
      });
  }
  return _calSoon;
}
/** The next event from now (today's later events, then the coming days). */
function calendarNextEvent() {
  const c = _calSoon;
  if (!c.events.length) return null;
  const today = todayStr(), hm = _tbNowHM();
  const list = c.events.filter(e => e && e.date && (e.date > today || (e.date === today && (e.allDay ? false : (e.end ? e.end > hm : (e.start || '') >= hm)))))
    .sort((a, b) => (a.date + (a.start || '00:00')).localeCompare(b.date + (b.start || '00:00')));
  return list[0] || null;
}

/** What a widget shows right now. */
function tbCompute(w) {
  const out = { num: '', unit: '', lbl: w.label, tip: '', warn: false, past: false, pct: null, muted: false, hidden: false };
  const t = w.type;
  if (TB_TYPES[t].dated) {
    if (!w.date) { out.num = '–'; out.muted = true; out.tip = 'No date set'; out.lbl = w.label || TB_TYPES[t].label; return out; }
    const d = _tbDays(w.date);
    const when = _tbShortDate(w.date, true) + (w.time ? ' ' + w.time : '');
    if (t === 'progress') {
      const pct = _tbPct(w.start, w.date);
      out.pct = pct;
      if (pct === null) { out.num = '–'; out.muted = true; out.tip = 'Set a start date before the end date'; return out; }
      out.num = pct + '%';
      out.past = d < 0;
      out.tip = `${w.label || 'Progress'} · ${_tbShortDate(w.start, true)} → ${when} · ${d > 0 ? d + ' day' + (d === 1 ? '' : 's') + ' left' : d === 0 ? 'ends today' : 'finished'}`;
      if (w.warnDays && d >= 0 && d < w.warnDays) out.warn = true;
      if (out.past && w.hideWhenPast) out.hidden = true;
      return out;
    }
    if (t === 'countup') {
      const since = -d;
      if (since < 0) { const a = _tbAmount(-since, w.unit, w.date); out.num = a.num; out.unit = a.unit === '' ? '' : a.unit + ' to go'; out.muted = true; out.tip = `${w.label || 'Count up'} starts ${when}`; }
      else if (since === 0) { out.num = 'Today'; out.tip = `${w.label || 'Count up'} starts today`; }
      else { const a = _tbAmount(since, w.unit === 'workdays' ? 'workdays' : w.unit, w.date); out.num = a.num; out.unit = a.unit; out.tip = `${w.label || 'Count up'} · since ${when}`; }
      return out;
    }
    // countdown
    if (d < 0) {
      out.past = true; out.num = String(-d); out.unit = 'd ago';
      out.tip = `${w.label || 'Countdown'} was ${when}`;
      if (w.hideWhenPast) out.hidden = true;
    } else if (d === 0) {
      out.num = 'Today'; out.tip = `${w.label || 'Countdown'} · today${w.time ? ' at ' + w.time : ''}`;
      if (w.time) { const left = _tbMinutesUntil(w.time); if (left > 0) { out.num = left >= 60 ? String(Math.round(left / 60)) : String(left); out.unit = left >= 60 ? 'h' : 'min'; } }
      out.warn = !!w.warnDays;
    } else {
      const a = _tbAmount(d, w.unit, w.date);
      out.num = a.num; out.unit = a.unit;
      out.tip = `${w.label || 'Countdown'} · ${when} · ${d} day${d === 1 ? '' : 's'}`;
      if (w.warnDays && d < w.warnDays) out.warn = true;
    }
    if (w.showBar && w.start) out.pct = _tbPct(w.start, w.date);
    return out;
  }
  if (t === 'tasks') {
    const c = _tbTaskCount(w.tasks);
    out.num = String(c.n);
    out.lbl = w.label || TB_TASK_FILTERS[w.tasks].toLowerCase();
    out.tip = `${TB_TASK_FILTERS[w.tasks]}: ${c.n} open task${c.n === 1 ? '' : 's'}${c.overdue && w.tasks === 'today' ? ` (${c.overdue} overdue)` : ''} · click to open`;
    out.warn = (w.tasks === 'today' || w.tasks === 'overdue') && c.overdue > 0;
    out.muted = c.n === 0;
    if (w.showBar && w.tasks === 'today') {
      const doneToday = _tbDoneToday();
      out.pct = doneToday + c.n ? Math.round(doneToday / (doneToday + c.n) * 100) : null;
    }
    return out;
  }
  if (t === 'event') {
    const cal = calendarSoon(_tbRepaintSoon);
    if (cal.off || (!cal.ok && !cal.loading && cal.at)) {
      out.num = '–'; out.lbl = w.label || 'No calendar'; out.muted = true;
      out.tip = cal.off ? 'The calendar is turned off in Settings' : 'Connect a calendar in Connections to see your next event';
      return out;
    }
    const e = calendarNextEvent();
    if (!e) { out.num = '–'; out.lbl = w.label || (cal.loading && !cal.at ? 'Loading…' : 'No upcoming events'); out.muted = true; out.tip = 'Nothing in the next 7 days'; return out; }
    const today = todayStr();
    out.num = e.date === today ? (e.start || 'Today') : e.date === tomorrowStr() ? 'Tmrw' : _tbShortDate(e.date, true).split(' ')[0];
    out.lbl = e.title || 'Event';
    out.tip = `Next: ${e.title || 'Event'} · ${_tbShortDate(e.date, true)}${e.start ? ' ' + e.start : ''}${e.location ? ' · ' + e.location : ''}${cal.stale ? ' · ' + cal.stale : ''}`;
    if (e.date === today && e.start) { const m = _tbMinutesUntil(e.start); if (m >= 0 && m <= 30) out.warn = true; }
    return out;
  }
  // clock: the dashboard's time, home time or any zone (w.zone 'local' | 'home' | IANA id)
  const now = Clock.now();
  const zone = tbClockZone(w);
  const time = _tbTime(now, zone);
  const date = Clock.fmtDate(now, { zone, weekday: 'short', day: 'numeric', month: 'short' });
  const place = zone !== Clock.zone() ? (w.zoneLabel || Clock.label(zone)) : '';
  if (w.clock === 'date') { out.num = date; out.lbl = w.label || place; }
  else if (w.clock === 'time') { out.num = time; out.lbl = w.label || place; }
  else { out.num = time; out.lbl = w.label || (place ? place + ' · ' + date : date); }
  const diff = place ? Clock.diff(Clock.zone(), zone, now) : 0;
  out.tip = Clock.fmtDate(now, { zone, dateStyle: 'full', timeStyle: 'short' }) + (place ? ` · ${place}${diff ? ` (${Clock.fmtDiff(diff)})` : ''}` : '');
  return out;
}
/** The zone a clock widget shows: 'local' (default) = the dashboard's zone, 'home', or an IANA id. */
function tbClockZone(w) {
  const z = w && w.zone;
  if (!z || z === 'local') return Clock.zone();
  if (z === 'home') return Clock.home();
  return Clock.canon(z) || Clock.zone();
}
function _tbMinutesUntil(hm) {
  const [h, m] = String(hm).split(':').map(Number);
  return h * 60 + m - Clock.parts(Clock.now()).min;
}
function _tbDoneToday() {
  const today = todayStr();
  let n = 0;
  for (const arr of Object.values(state.completionLog || {})) for (const ts of (arr || [])) if (Number(ts) && Clock.parts(Number(ts)).iso === today) n++;
  return n;
}

/** The icon tile markup: a sprite icon, or an emoji/short text from data. */
function tbIconHtml(w) {
  const name = String(w.icon || '');
  if (_isIconName(name) && (typeof document === 'undefined' || document.getElementById('i-' + name))) return icon(name);
  if (name && !_isIconName(name)) return `<span class="cdw-emoji">${esc(Array.from(name).slice(0, 2).join(''))}</span>`;
  return icon(TB_TYPES[w.type] ? TB_TYPES[w.type].icon : 'hourglass');
}
/** Colour hook: a swatch class or a --c custom property. */
function tbColorAttrs(color) {
  if (_CD_SWATCHES.includes(color)) return { cls: 'c-' + color, style: '' };
  return { cls: '', style: `--c:${safeColor(color, 'var(--sw-indigo)')}` };
}

/** One widget as a .cdw element. opts: {tag:'button'|'div', computed} */
function tbWidgetEl(w, opts) {
  opts = opts || {};
  const v = opts.computed || tbCompute(w);
  const el = document.createElement(opts.tag || 'button');
  if (el.tagName === 'BUTTON') el.type = 'button';
  const col = tbColorAttrs(w.color);
  el.className = 'cdw ' + col.cls + (w.style !== 'subtle' ? ' ' + w.style : '') + (v.warn ? ' warn' : '') + (v.past ? ' past' : '') + (v.muted ? ' muted' : '') + (w.headline ? ' headline' : '') + ` t-${w.type}`;
  if (col.style) el.setAttribute('style', col.style);
  el.dataset.id = w.id;
  el.innerHTML = `<span class="cdw-ic">${tbIconHtml(w)}</span>`
    + `<span class="cdw-val"><span class="cdw-num">${esc(v.num)}</span>${v.unit ? `<span class="cdw-unit">${esc(v.unit)}</span>` : ''}</span>`
    + (v.lbl ? `<span class="cdw-lbl">${esc(v.lbl)}</span>` : '')
    + (v.pct !== null && v.pct !== undefined && w.showBar ? `<span class="cdw-bar"><i style="--pct:${Math.max(0, Math.min(100, Number(v.pct) || 0))}%"></i></span>` : '');
  const tip = v.tip || w.label || '';
  if (tip) el.title = tip;
  el.setAttribute('aria-label', [v.lbl || w.label, v.num + (v.unit ? ' ' + v.unit : '')].filter(Boolean).join(': '));
  return el;
}

/* ---------- the strip in the top bar ---------- */
let _tbDragging = false;
let _tbSortable = null;
let _tbTicker = null;
let _tbTickKey = '';
function renderTopbar() {
  if (typeof renderShell === 'function') renderShell();
  _tbRenderStrip();
  if (typeof renderTopbarWidgets === 'function') renderTopbarWidgets();
  _tbFitOverflow();
  _tbEnsureTicker();
}
function _tbRepaintSoon() { if (!_tbDragging) { _tbRenderStrip(); _tbFitOverflow(); } }
function _tbRenderStrip() {
  const cdEl = document.getElementById('countdowns');
  if (!cdEl || _tbDragging) return;
  cdEl.innerHTML = '';
  cdEl.setAttribute('role', 'toolbar');
  cdEl.setAttribute('aria-label', 'Top bar widgets');
  const list = tbList();
  const shown = [];
  for (const w of list) {
    if (!w.visible) continue;
    const v = tbCompute(w);
    if (v.hidden) continue;
    const b = tbWidgetEl(w, { computed: v });
    b.onclick = () => _tbActivate(w);
    b.oncontextmenu = (e) => { e.preventDefault(); _tbWidgetMenu(b, w); };
    b.onkeydown = (e) => {
      if ((e.key === 'F10' && e.shiftKey) || e.key === 'ContextMenu') { e.preventDefault(); _tbWidgetMenu(b, w); }
      else if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); _tbNudge(w.id, e.key === 'ArrowLeft' ? -1 : 1); }
    };
    cdEl.appendChild(b);
    shown.push(w);
  }
  const more = document.createElement('button');
  more.type = 'button'; more.className = 'cdw-more'; more.hidden = true;
  more.setAttribute('aria-label', 'More widgets');
  more.onclick = () => _tbOverflowMenu(more);
  cdEl.appendChild(more);
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'cdw-add' + (list.length ? '' : ' cdw-add-lg');
  add.innerHTML = list.length ? icon('sliders-horizontal') : icon('hourglass') + '<span>Add a countdown</span>';
  add.setAttribute('aria-label', 'Customise top bar');
  add.setAttribute('data-tip', list.length ? 'Customise top bar' : 'Add countdowns and other widgets');
  add.onclick = () => openTopbarCustomiser({ add: list.length ? null : 'countdown' });
  cdEl.appendChild(add);
  // Drag to reorder right in the top bar.
  if (typeof makeSortable === 'function' && shown.length > 1) {
    if (_tbSortable) _tbSortable.destroy();
    _tbSortable = makeSortable(cdEl, {
      items: '.cdw[data-id]', axis: 'x',
      onStart: () => { _tbDragging = true; },
      onEnd: () => { _tbDragging = false; },
      onReorder: (ids) => { _tbDragging = false; tbApplyOrder(ids); },
    });
  }
}
/** Save a new display order of the shown widgets (hidden ones keep their slots). */
function tbApplyOrder(ids) {
  const list = tbList();
  const shownSet = new Set(ids);
  const shownInOrder = ids.map(id => list.find(w => w.id === id)).filter(Boolean);
  const out = [];
  let k = 0;
  for (const w of list) out.push(shownSet.has(w.id) ? shownInOrder[k++] : w);
  // The headline stays first: dragging something in front of it makes that the headline.
  if (out.length && out[0].headline === false && out.some(w => w.headline)) {
    const old = out.find(w => w.headline);
    old.headline = false; if (old.style === 'tinted') old.style = 'subtle';
    out[0].headline = true; if (out[0].style === 'subtle') out[0].style = 'tinted';
  }
  tbSave(out, 'Top bar order saved');
}
function _tbNudge(id, dir) {
  const list = tbList().filter(w => w.visible);
  const i = list.findIndex(w => w.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const ids = list.map(w => w.id);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  tbApplyOrder(ids);
  setTimeout(() => { const b = document.querySelector(`#countdowns .cdw[data-id="${CSS.escape(id)}"]`); if (b) b.focus(); }, 0);
}
/** Replace the widget list (normalised, headline first), one undo step. */
function tbSave(list, msg) {
  const clean = tbList(list);
  state.countdowns = clean.map(w => {
    const o = {};
    for (const k of Object.keys(w)) o[k] = w[k];
    if (!o.time) delete o.time;
    if (!o.start) delete o.start;
    if (o.type !== 'tasks') delete o.tasks;
    if (o.type !== 'clock') delete o.clock;
    if (!TB_TYPES[o.type].dated) { delete o.date; delete o.hideWhenPast; delete o.unit; }
    return o;
  });
  saveData();
  render();
  if (msg) toast(msg, { kind: 'ok', action: { label: 'Undo', run: () => undo() } });
}
function _tbActivate(w) {
  if (w.type === 'tasks') { setView(_TB_TASK_VIEW[w.tasks] || 'today'); return; }
  if (w.type === 'event' || w.type === 'clock') {
    if (!(APP_CONFIG.features && APP_CONFIG.features.calendar === false)) { setView('calendar'); return; }
  }
  openCountdownEditor(w.id);
}
function _tbWidgetMenu(anchor, w) {
  openMenu(anchor, [
    { label: 'Edit…', icon: 'pencil', run: () => openCountdownEditor(w.id) },
    { label: w.headline ? 'Headline' : 'Make headline', icon: 'star', disabled: w.headline, run: () => tbUpdate(w.id, { headline: true }, 'Headline changed') },
    { label: 'Hide from top bar', icon: 'eye-off', run: () => tbUpdate(w.id, { visible: false }, 'Widget hidden') },
    { label: 'Delete', icon: 'trash-2', danger: true, run: () => tbSave(tbList().filter(x => x.id !== w.id), 'Widget deleted') },
    'sep',
    { label: 'Customise top bar…', icon: 'sliders-horizontal', run: () => openTopbarCustomiser({ select: w.id }) },
  ], { align: 'start' });
}
/** Patch one widget and save. Making one the headline clears the others. */
function tbUpdate(id, patch, msg) {
  const list = tbList();
  const w = list.find(x => x.id === id);
  if (!w) return;
  Object.assign(w, patch);
  if (patch.headline) for (const x of list) if (x !== w && x.headline) { x.headline = false; if (x.style === 'tinted') x.style = 'subtle'; }
  if (patch.headline && w.style === 'subtle') w.style = 'tinted';
  tbSave(list, msg);
}

/* ---------- overflow: whole widgets that do not fit go into "+N" ---------- */
function _tbFitOverflow() {
  const cdEl = document.getElementById('countdowns');
  const host = document.getElementById('tb-widgets');
  if (!cdEl || !host) return;
  const more = cdEl.querySelector('.cdw-more');
  if (!more) return;
  more.hidden = true;
  const items = [...cdEl.querySelectorAll('.cdw[data-id]')];
  items.forEach(n => { n.style.display = ''; });
  // The strip is right-aligned, so overflow happens on the left where
  // scrollWidth cannot see it: add up what is shown instead.
  const over = () => {
    const kids = [...host.children].filter(c => !c.hidden && c.offsetParent !== null);
    const gap = parseFloat(getComputedStyle(host).columnGap) || 6;
    const cs = getComputedStyle(host);
    const room = host.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    return kids.reduce((t, c) => t + c.scrollWidth, 0) + gap * Math.max(0, kids.length - 1) > room + 0.5;
  };
  if (!over()) return;
  more.hidden = false;
  let hidden = 0;
  for (let i = items.length - 1; i >= 0 && over(); i--) {
    if (i === 0 && items.length > 1) break;        // the headline always stays
    items[i].style.display = 'none'; hidden++;
    more.textContent = '+' + hidden;
  }
  if (!hidden) { more.hidden = true; return; }
  more.title = `${hidden} more widget${hidden === 1 ? '' : 's'}`;
}
function _tbOverflowMenu(anchor) {
  const ids = [...document.querySelectorAll('#countdowns .cdw[data-id]')].filter(n => n.style.display === 'none').map(n => n.dataset.id);
  const list = tbList().filter(w => ids.includes(w.id));
  openPopover(anchor, (el, close) => {
    el.classList.add('tb-overflow');
    for (const w of list) {
      const b = tbWidgetEl(w);
      b.onclick = () => { close(); _tbActivate(w); };
      el.appendChild(b);
    }
    const c = document.createElement('button'); c.type = 'button'; c.className = 'btn btn-ghost btn-sm';
    c.innerHTML = icon('sliders-horizontal') + '<span>Customise top bar</span>';
    c.onclick = () => { close(); openTopbarCustomiser({}); };
    el.appendChild(c);
  }, { align: 'end' });
}
let _tbResizeT = null;
function _tbRefit() {
  if (_tbResizeT) clearTimeout(_tbResizeT);
  _tbResizeT = setTimeout(() => { if (typeof state !== 'undefined' && !_tbDragging) _tbFitOverflow(); }, 60);
}
window.addEventListener('resize', _tbRefit);
// Widths change when the web font arrives or the breadcrumb changes length.
if (typeof document !== 'undefined' && document.fonts) {
  if (document.fonts.ready) document.fonts.ready.then(_tbRefit, () => {});
  if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', _tbRefit);
}
if (typeof ResizeObserver === 'function') {
  let _tbHostW = 0;
  const ro = new ResizeObserver((entries) => {
    const w = Math.round(entries[0].contentRect.width);
    if (w !== _tbHostW) { _tbHostW = w; _tbRefit(); }
  });
  const hook = () => { const h = document.getElementById('tb-widgets'); if (h) ro.observe(h); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
}

/* ---------- ticking: clocks and "next event" ---------- */
// The one ticker is Clock's (07-core-clock.js, every 15 s, also with no clock
// widget); a new day or time zone re-renders the page from 87-clock-ui.js.
function _tbEnsureTicker() {
  const live = tbList().some(w => w.visible && (w.type === 'clock' || w.type === 'event'));
  if (_tbTicker) return;
  _tbTicker = Clock.onTick(() => {
    const key = todayStr() + ' ' + _tbNowHM() + ' ' + Clock.zone();
    if (key === _tbTickKey) return;
    const dayChanged = _tbTickKey.slice(0, 10) !== key.slice(0, 10);
    _tbTickKey = key;
    if (dayChanged) return;   // Clock's 'day' / 'zone' event renders everything
    if (tbList().some(w => w.visible && (w.type === 'clock' || w.type === 'event'))) _tbRepaintSoon();
  });
  _tbTickKey = todayStr() + ' ' + _tbNowHM() + ' ' + Clock.zone();
  return live;
}

function lastBackupLabel() {
  if (!state._lastBackup) return 'never backed up';
  const ago = Date.now() - state._lastBackup;
  if (ago < 60000) return 'backed up just now';
  if (ago < 3600000) return `backed up ${Math.round(ago/60000)}m ago`;
  if (ago < 86400000) return `backed up ${Math.round(ago/3600000)}h ago`;
  return `backed up ${Math.round(ago/86400000)}d ago`;
}
