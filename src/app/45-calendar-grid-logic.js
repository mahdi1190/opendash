/* ============================================================
   CALENDAR GRID EDITING: the pure rules (owner: Calendar)
   ------------------------------------------------------------
   User request, 3 Oct: the calendar should feel "very similar if not
   identical to Google Calendar ... when we click events and move stuff
   around". These are the numbers behind 45-calendar-grid-edit.js, kept free
   of the DOM so tests/calendar-grid.test.mjs can run them in a VM:
     cglSnap / cglFloor / cglCeil   15-minute snapping (Google's drag step)
     cglMoveTimed(p, o)             where a dragged timed block lands
     cglResizeEnd / cglResizeStart  edge drags (15-minute minimum)
     cglCreateRange(a, p)           click-and-drag on an empty slot
     cglClickRange(min, len)        a single click: a half-hour slot + default length
     cglAllDayToTimed / cglMoveAllDay   lane <-> grid conversions, day spans
     cglLocalIso(day, min)          'YYYY-MM-DDTHH:MM:00+01:00' (local offset, DST-safe)
     cglTimedPatch / cglAllDayPatch {start, end, allDay} for CalWrite.move
     cglEventGeom(ev)               an event as {startDay, start, end, allDay, days}
     cglRangeLabel(a, b, fmt)       '10:15 – 11:00'
     CGL_KEYS, cglKeyAction(e, ctx), cglKeyHelp()   the calendar's keys (clash-free)
   Minutes are counted from the local midnight of a day; 1440 = the next midnight.
   ============================================================ */
const CGL_STEP = 15;                 // snap (minutes), like Google's drag
const CGL_DAY = 24 * 60;
const CGL_MIN_LEN = 15;              // shortest block a resize leaves
const CGL_CLICK_LEN = 30;            // a single click on an empty slot
const CGL_ALLDAY_TO_TIMED = 60;      // an all-day event dropped on the grid (Google: one hour)

function cglSnap(min, step) { step = step || CGL_STEP; return Math.round(min / step) * step; }
function cglFloor(min, step) { step = step || CGL_STEP; return Math.floor(min / step) * step; }
function cglCeil(min, step) { step = step || CGL_STEP; return Math.ceil(min / step) * step; }
function cglClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/**
 * A timed block dragged with the pointer at minute `p.min` of column `p.day`.
 * o: {grab (pointer minus block start when it was picked up), dur (minutes),
 *     overnight (it already crossed midnight: may keep doing so)}.
 * -> {day, start, end}: start snapped to 15 minutes and kept inside the day
 * (end may pass 1440 only for an overnight event).
 */
function cglMoveTimed(p, o) {
  const dur = Math.max(CGL_MIN_LEN, Math.round(o.dur || 0));
  const maxStart = o.overnight || dur >= CGL_DAY ? CGL_DAY - CGL_STEP : CGL_DAY - dur;
  const start = cglClamp(cglSnap(p.min - (o.grab || 0)), 0, Math.max(0, maxStart));
  return { day: p.day, start, end: start + dur };
}
/** Bottom edge dragged to `pointerMin`: the new end (snapped, >= start + 15, <= the next midnight unless `max`). */
function cglResizeEnd(start, pointerMin, max) {
  return cglClamp(cglSnap(pointerMin), start + CGL_MIN_LEN, max || CGL_DAY);
}
/** Top edge dragged to `pointerMin`: the new start (snapped, >= 0, <= end - 15). */
function cglResizeStart(end, pointerMin) {
  return cglClamp(cglSnap(pointerMin), 0, end - CGL_MIN_LEN);
}
/** Click-and-drag on an empty slot: the 15-minute slots from the press to the pointer, either direction. */
function cglCreateRange(anchorMin, pointerMin) {
  const a = cglClamp(cglFloor(anchorMin), 0, CGL_DAY - CGL_STEP);
  const b = cglClamp(cglFloor(pointerMin), 0, CGL_DAY - CGL_STEP);
  return { start: Math.min(a, b), end: Math.max(a, b) + CGL_STEP };
}
/** A single click: Google starts on the half-hour slot under the pointer; the block keeps inside the day. */
function cglClickRange(min, len) {
  len = Math.max(CGL_MIN_LEN, Math.round(len || CGL_CLICK_LEN));
  const start = Math.min(cglClamp(cglFloor(min, 30), 0, CGL_DAY - 30), CGL_DAY - len);
  return { start: Math.max(0, start), end: Math.max(0, start) + len };
}
/** An all-day event dragged onto the grid becomes a timed one starting at the slot under the pointer. */
function cglAllDayToTimed(pointerMin, dur) {
  dur = dur || CGL_ALLDAY_TO_TIMED;
  const start = cglClamp(cglFloor(pointerMin), 0, CGL_DAY - dur);
  return { start, end: start + dur };
}

/* ---------- days (ISO dates, local calendar days) ---------- */
function _cglUtc(iso) { const [y, m, d] = String(iso).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); }
function cglDayDelta(fromIso, toIso) { return Math.round((_cglUtc(toIso) - _cglUtc(fromIso)) / 86400000); }
function cglShiftDay(iso, n) {
  const d = new Date(_cglUtc(iso) + n * 86400000);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
/** An all-day span [first, last] moved so that the grabbed day lands on `toDay`. */
function cglMoveAllDay(span, grabDay, toDay) {
  const n = cglDayDelta(grabDay, toDay);
  return { first: cglShiftDay(span.first, n), last: cglShiftDay(span.last, n), delta: n };
}

/* ---------- local times as Google wants them ---------- */
function _cglPad(n) { return String(n).padStart(2, '0'); }
/** The wall time on `dayIso` + `min` minutes (1440 = next midnight) in the dashboard's zone (Clock) as an RFC 3339 string with that zone's offset. */
function cglLocalIso(dayIso, min) {
  min = Math.round(min);
  const extra = Math.floor(min / CGL_DAY);
  const ms = Clock.at(cglShiftDay(dayIso, extra), min - extra * CGL_DAY);
  const t = Clock.parts(ms), off = Clock.offset(ms, Clock.zone());
  const sign = off >= 0 ? '+' : '-', a = Math.abs(off);
  return `${t.iso}T${_cglPad(t.h)}:${_cglPad(t.mi)}:00${sign}${_cglPad(Math.floor(a / 60))}:${_cglPad(a % 60)}`;
}
/** CalWrite.move arguments for a timed block on `day` from `start` to `end` minutes. */
function cglTimedPatch(day, start, end) { return { start: cglLocalIso(day, start), end: cglLocalIso(day, end), allDay: false }; }
/** CalWrite.move arguments for an all-day span (Google's end date is exclusive). */
function cglAllDayPatch(first, last) { return { start: first, end: cglShiftDay(last || first, 1), allDay: true }; }

/**
 * An event (the snapshot's Google shape) on the local clock:
 * {allDay, startDay, endDay (last day it touches), start, end (minutes from
 *  startDay's midnight; end may pass 1440), dur, overnight}.
 */
function cglEventGeom(ev) {
  const allDay = !!(ev.allDay || (ev.start && ev.start.date && !ev.start.dateTime));
  if (allDay) {
    const first = ev.start.date;
    const endEx = ev.end && ev.end.date && ev.end.date > first ? ev.end.date : cglShiftDay(first, 1);
    const last = cglShiftDay(endEx, -1);
    return { allDay: true, startDay: first, endDay: last, start: 0, end: CGL_DAY * (cglDayDelta(first, last) + 1), dur: CGL_DAY * (cglDayDelta(first, last) + 1), overnight: first !== last };
  }
  const s = new Date(ev.start.dateTime), e = new Date(ev.end && ev.end.dateTime ? ev.end.dateTime : ev.start.dateTime);
  // Wall clock in the dashboard's zone (Clock, 07-core-clock.js).
  const day = (d) => Clock.parts(d.getTime()).iso;
  const sp = Clock.parts(s.getTime()), ep = Clock.parts(e.getTime());
  const startDay = sp.iso;
  const startMin = sp.h * 60 + sp.mi;
  // The end on the wall clock (as the grid draws it): across a clock change the length shown is not
  // the time elapsed, and a move keeps what the user sees (00:30 - 03:00 stays two and a half hours).
  const endMin = e > s ? cglDayDelta(startDay, ep.iso) * CGL_DAY + ep.h * 60 + ep.mi : startMin;
  const dur = Math.max(0, endMin - startMin);
  const endDay = day(new Date(Math.max(e.getTime() - 1, s.getTime())));
  return { allDay: false, startDay, endDay, start: startMin, end: startMin + dur, dur, overnight: endDay !== startDay };
}

/** '10:15 – 11:00' with fmt(min) -> a clock label ('24:00' shows as the next midnight). */
function cglRangeLabel(a, b, fmt) {
  fmt = fmt || ((m) => _cglPad(Math.floor((m % CGL_DAY) / 60)) + ':' + _cglPad(m % 60));
  return `${fmt(a)} – ${fmt(b)}`;
}

/* ---------- keys ----------
   One table for every calendar key, like Google's: who handles it ('section'
   = 41-calendar-section.js, 'grid' = 45-calendar-grid-edit.js) and whether it
   needs a selected event. The app's own keys (q new task, / filter, ? help,
   g then a letter, Ctrl/Cmd combinations) are never used here; p, e and
   Delete belong to an open task (32-tasks-ui.js) when one is in the side panel. */
const CGL_KEYS = [
  { key: 'c', action: 'create', label: 'Create an event', by: 'grid' },
  { key: 't', action: 'today', label: 'Today', by: 'section' },
  { key: 'd', action: 'mode:day', label: 'Day view', by: 'section' },
  { key: 'w', action: 'mode:week', label: 'Week view', by: 'section' },
  { key: 'm', action: 'mode:month', label: 'Month view', by: 'section' },
  { key: 'a', action: 'mode:agenda', label: 'Agenda view', by: 'section' },
  { key: 'j', action: 'next', label: 'Next period', by: 'section' },
  { key: 'k', action: 'prev', label: 'Previous period', by: 'section' },
  { key: 'n', action: 'next', label: 'Next period', by: 'grid' },
  { key: 'p', action: 'prev', label: 'Previous period', by: 'grid', yieldsToTask: true },
  { key: 'ArrowRight', action: 'next', label: 'Next period', by: 'section' },
  { key: 'ArrowLeft', action: 'prev', label: 'Previous period', by: 'section' },
  { key: 'e', action: 'open', label: 'Open the selected event', by: 'grid', needsEvent: true, yieldsToTask: true },
  { key: 'Enter', action: 'open', label: 'Open the selected event', by: 'grid', needsEvent: true },
  { key: 'Delete', action: 'delete', label: 'Delete the selected event', by: 'grid', needsEvent: true, yieldsToTask: true },
  { key: 'Backspace', action: 'delete', label: 'Delete the selected event', by: 'grid', needsEvent: true, yieldsToTask: true },
  { key: 'ArrowUp', alt: true, action: 'earlier', label: '15 minutes earlier', by: 'grid', needsEvent: true },
  { key: 'ArrowDown', alt: true, action: 'later', label: '15 minutes later', by: 'grid', needsEvent: true },
  { key: 'ArrowLeft', alt: true, action: 'dayBefore', label: 'A day earlier', by: 'grid', needsEvent: true },
  { key: 'ArrowRight', alt: true, action: 'dayAfter', label: 'A day later', by: 'grid', needsEvent: true },
  { key: 'ArrowUp', alt: true, shift: true, action: 'shorter', label: '15 minutes shorter', by: 'grid', needsEvent: true },
  { key: 'ArrowDown', alt: true, shift: true, action: 'longer', label: '15 minutes longer', by: 'grid', needsEvent: true },
  { key: 'z', action: 'undo', label: 'Undo the last change', by: 'grid' },
  { key: 'Escape', action: 'escape', label: 'Close / cancel a drag', by: 'grid' },
];
/** Keys the rest of the app owns everywhere (90-wiring.js): the calendar must not take them. */
const CGL_RESERVED = ['q', 'Q', '/', '?', 'g'];
/**
 * The calendar action for a key event, or null.
 * e: {key, altKey, shiftKey, ctrlKey, metaKey}; ctx: {hasEvent, taskOpen, by}.
 * Letters match either case only without Shift (Shift+letter is left alone).
 */
function cglKeyAction(e, ctx) {
  ctx = ctx || {};
  if (!e || e.ctrlKey || e.metaKey) return null;
  const k = String(e.key || '');
  const key = k.length === 1 ? k.toLowerCase() : k;
  if (k.length === 1 && e.shiftKey) return null;
  for (const row of CGL_KEYS) {
    if (row.key !== key || !!row.alt !== !!e.altKey || (row.alt && !!row.shift !== !!e.shiftKey)) continue;
    if (!row.alt && k.length > 1 && e.shiftKey) continue;
    if (ctx.by && row.by !== ctx.by) return null;
    if (row.needsEvent && !ctx.hasEvent) return null;
    if (row.yieldsToTask && ctx.taskOpen && !ctx.hasEvent) return null;
    return row.action;
  }
  return null;
}
/** Rows for the shortcut sheet (75-modals.js): [label, [keys]]. Every key in it is in CGL_KEYS (a test checks). */
function cglKeyHelp() {
  return [
    ['Create an event', ['C']], ['Go to today', ['T']], ['Day / week / month / agenda', ['D', 'W', 'M', 'A']],
    ['Next / previous period', ['J', 'K']], ['Next / previous (Google keys)', ['N', 'P']],
    ['Open the selected event', ['E']], ['Delete the selected event', ['Del']],
    ['Move it 15 minutes', ['Alt', '↑', '↓']], ['Move it a day', ['Alt', '←', '→']],
    ['Shorter / longer', ['Alt', 'Shift', '↑', '↓']], ['Undo the last change', ['Z']], ['Cancel a drag', ['Esc']],
  ];
}
