/* ============================================================
   HOME widget "wrapup" (After meetings): the pure rules.
   OWNER: the "wrapup" widget builder (WIDGETS_CATALOGUE.md 3.5). The widget
   is 12-home-w-wrapup.js; tests/home-w-wrapup.test.mjs runs this file in a VM
   (with 52-people-link.js and 12-home-meet-logic.js, whose homeMeetings it uses).
   No DOM, no page state, no clock: callers pass now / today.

     homeWrapCandidates(list, eventMeta, now, o)
                            the meetings to wrap up, newest first: meetings with other
                            people (homeMeetings: timed, not declined, someone else invited)
                            that ENDED within o.windowH hours (36; 0 = since the start of
                            the day `now` is in), are not wrapped up (wuIsWrapped) and, with
                            o.skipRecurring, are not repeating. list = homeMeetings() rows
                            (or calendar events, then o is passed on to homeMeetings).
                            o.createdAt(taskId) -> ms | null (when a linked task was made).
                            -> [{id, title, start, end, date, endedMin, minutes, attendees,
                                people, others, recurring, hasNotes, ev}]
     wuIsWrapped(meta, m, createdAt)
                            wrapped up: meta.wrapped === true, or a task linked to the meeting
                            that was made after it began (a follow-up). Notes alone do not
                            count: they are often the agenda, written before the meeting
                            (Meeting prep); the widget's own Save note sets wrapped.
     wuEndedText(min, dayDiff)  'just now', '12 min ago', '2 h ago', 'yesterday', '3 days ago'
     wuSummary(n)           '1 meeting to wrap up' / '3 meetings to wrap up'
     wuFollowUpTitle(title) 'Follow up: <title>' (clipped to 120 characters)
     wuWorkdaysAfter(iso, n, days)   n working days after iso (days: 0 = Sunday; default Mon-Fri)
     wuDueChoices(today, days)       the follow-up's due-date choices [{key, label, date}]:
                            '2wd' in 2 working days (the default), 'tomorrow', 'nextweek'
                            (the first working day of next week), 'none' (no date)
     wuGuessStream(tasks, people)    the stream most open tasks with these people are in
                            (ties: the name), or null. tasks: [{stream, people: [id]}]
     wuNoteLine(text)       the note as typed: trimmed, at most 2000 characters ('' = blank)
     wuPersonNote(text, title, day)  'After “Title” (Mon 5 Oct): text' for a person's notes
     wuNamesText(names)     'Sam', 'Sam and Jo', 'Sam, Jo and 2 others'
     wuDetail(title, when, names)    the follow-up's description
     wuThanksPlan(attendees, o)      who a thank-you goes to: {to (3 at most), cc (3 at most),
                            first: [first names of `to`], all: every address (the mail app)}.
                            Only People addresses go in to / cc (Gmail drafts allow nothing
                            else); o.emailsOf(personId) -> [address], o.firstOf(personId)
     wuThanksDraft(o)       {subject, body}: o = {title, first: [names], me, when ('today',
                            'yesterday' or a phrase like 'on Monday')}
   ============================================================ */
const WU_WINDOWS = Object.freeze([0, 36, 168]);       // the settings' choices (today, 36 h, 7 days)

function _wuMs(w) {
  if (w == null) return NaN;
  if (typeof w === 'number') return w;
  if (w instanceof Date) return w.getTime();
  return Date.parse(String(w));
}

/** Wrapped up? (see the header) */
function wuIsWrapped(meta, m, createdAt) {
  if (!meta || typeof meta !== 'object') return false;
  if (meta.wrapped === true) return true;
  const start = m && Number.isFinite(m.start) ? m.start : NaN;
  const made = typeof createdAt === 'function' ? createdAt : () => null;
  for (const id of Array.isArray(meta.tasks) ? meta.tasks : []) {
    const t = Number(made(id));
    if (Number.isFinite(t) && t > 0 && Number.isFinite(start) && t >= start) return true;
  }
  return false;
}

/** The start of the day holding instant t, on the user's clock (Clock when loaded). */
function _wuDayStart(t) {
  if (typeof Clock !== 'undefined') return Clock.at(Clock.parts(t).iso, 0);
  const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime();   // clock-ok: fallback where Clock is not loaded (tests)
}

function homeWrapCandidates(list, eventMeta, now, o) {
  o = o || {};
  const t = _wuMs(now);
  if (!Number.isFinite(t)) return [];
  const rows = Array.isArray(list) ? list : [];
  const meetings = rows.length && rows[0] && rows[0].ev ? rows : (typeof homeMeetings === 'function' ? homeMeetings(rows, o) : []);
  const h = Number(o.windowH);
  let since;
  if (Number.isFinite(h) && h <= 0) since = _wuDayStart(t);
  else since = t - (Number.isFinite(h) ? Math.min(h, 24 * 30) : 36) * 3600000;
  const meta = eventMeta && typeof eventMeta === 'object' ? eventMeta : {};
  const out = [];
  for (const m of meetings) {
    if (!m || !m.id || !Number.isFinite(m.end)) continue;
    if (m.end > t || m.end <= since) continue;                 // not over yet, or too long ago
    if (m.myResponse === 'declined') continue;
    if (o.skipRecurring && m.recurring) continue;
    const mm = Object.prototype.hasOwnProperty.call(meta, m.id) ? meta[m.id] : null;
    if (wuIsWrapped(mm, m, o.createdAt)) continue;
    out.push(Object.assign({}, m, {
      endedMin: Math.max(0, Math.round((t - m.end) / 60000)),
      hasNotes: !!(mm && typeof mm.notes === 'string' && mm.notes.trim()),
    }));
  }
  return out.sort((a, b) => b.end - a.end || b.start - a.start || String(a.title).localeCompare(String(b.title)));
}

function wuEndedText(min, dayDiff) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  const d = Number.isFinite(Number(dayDiff)) ? Number(dayDiff) : Math.floor(m / 1440);
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  if (d <= 0 || m < 6 * 60) return Math.round(m / 60) + ' h ago';
  if (d === 1) return 'yesterday';
  return d + ' days ago';
}

function wuSummary(n) {
  const k = Math.max(0, Math.round(Number(n) || 0));
  return `${k} meeting${k === 1 ? '' : 's'} to wrap up`;
}

function wuFollowUpTitle(title) {
  const a = Array.from(String(title || '').replace(/\s+/g, ' ').trim() || 'the meeting');
  return 'Follow up: ' + (a.length > 120 ? a.slice(0, 119).join('').replace(/\s+\S*$/, '') + '…' : a.join(''));
}

function _wuIsoUTC(ms) { return new Date(ms).toISOString().slice(0, 10); }   // clock-ok: pure ISO arithmetic on UTC-midnight days
function _wuParse(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; }
function _wuDays(days) {
  const work = new Set((Array.isArray(days) && days.length ? days : [1, 2, 3, 4, 5]).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6));
  if (!work.size) [1, 2, 3, 4, 5].forEach(x => work.add(x));
  return work;
}
function wuWorkdaysAfter(iso, n, days) {
  let t = _wuParse(iso);
  if (!Number.isFinite(t)) return null;
  const work = _wuDays(days);
  let left = Math.max(0, Math.round(Number(n) || 0));
  for (let guard = 0; left > 0 && guard < 400; guard++) { t += 864e5; if (work.has(new Date(t).getUTCDay())) left--; }
  return _wuIsoUTC(t);
}
function wuDueChoices(today, days) {
  const t = _wuParse(today);
  if (!Number.isFinite(t)) return [{ key: 'none', label: 'No date', date: null }];
  const work = _wuDays(days);
  // Next week: the Monday after today (Sunday counts as the end of the week), then its first working day.
  const dow = new Date(t).getUTCDay();
  let nw = t + ((8 - dow) % 7 || 7) * 864e5;
  for (let g = 0; g < 7 && !work.has(new Date(nw).getUTCDay()); g++) nw += 864e5;
  return [
    { key: '2wd', label: 'In 2 working days', date: wuWorkdaysAfter(today, 2, days) },
    { key: 'tomorrow', label: 'Tomorrow', date: _wuIsoUTC(t + 864e5) },
    { key: 'nextweek', label: 'Next week', date: _wuIsoUTC(nw) },
    { key: 'none', label: 'No date', date: null },
  ];
}

function wuGuessStream(tasks, people) {
  const want = new Set((Array.isArray(people) ? people : []).filter(Boolean));
  if (!want.size) return null;
  const n = new Map();
  for (const t of Array.isArray(tasks) ? tasks : []) {
    if (!t || !t.stream || !Array.isArray(t.people) || !t.people.some(p => want.has(p))) continue;
    n.set(t.stream, (n.get(t.stream) || 0) + 1);
  }
  let best = null, bn = 0;
  for (const [s, c] of n) if (c > bn || (c === bn && String(s).localeCompare(String(best)) < 0)) { best = s; bn = c; }
  return best;
}

function wuNoteLine(text) {
  const s = String(text == null ? '' : text).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const a = Array.from(s);
  return a.length > 2000 ? a.slice(0, 2000).join('').trimEnd() : s;
}
function wuPersonNote(text, title, day) {
  const t = wuNoteLine(text);
  if (!t) return '';
  const name = String(title || '').replace(/\s+/g, ' ').trim() || 'the meeting';
  return `After “${name}”${day ? ` (${day})` : ''}: ${t}`;
}

function wuNamesText(names) {
  const list = (Array.isArray(names) ? names : []).map(s => String(s || '').trim()).filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length <= 3) return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  const rest = list.length - 2;
  return list.slice(0, 2).join(', ') + ` and ${rest} others`;
}
function wuDetail(title, when, names) {
  const t = String(title || '').replace(/\s+/g, ' ').trim() || 'the meeting';
  return `From the meeting “${t}”${when ? ` (${when})` : ''}${names ? ` with ${names}` : ''}.`;
}

function wuThanksPlan(attendees, o) {
  o = o || {};
  const emailsOf = typeof o.emailsOf === 'function' ? o.emailsOf : () => [];
  const firstOf = typeof o.firstOf === 'function' ? o.firstOf : () => '';
  const known = [], all = [], first = [];
  for (const a of Array.isArray(attendees) ? attendees : []) {
    if (!a || a.response === 'declined') continue;
    const own = String(a.email || '').trim().toLowerCase();
    if (own && !all.includes(own)) all.push(own);
    if (!a.personId) continue;
    const list = (emailsOf(a.personId) || []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean);
    const addr = own && list.includes(own) ? own : list[0];
    if (!addr || known.includes(addr)) continue;
    known.push(addr);
    if (known.length <= 3) { const f = String(firstOf(a.personId) || '').trim(); if (f) first.push(f); }
  }
  return { to: known.slice(0, 3), cc: known.slice(3, 6), first, all };
}
function wuThanksDraft(o) {
  o = o || {};
  const title = String(o.title || '').replace(/\s+/g, ' ').trim();
  const first = (Array.isArray(o.first) ? o.first : []).filter(Boolean);
  const hi = first.length === 0 || first.length > 2 ? 'Hi all,' : `Hi ${first.join(' and ')},`;
  const w = String(o.when || '').trim();
  const line = w === 'today' || w === 'yesterday' ? `Thank you for ${w}'s meeting.` : `Thank you for the meeting${w ? ' ' + w : ''}.`;
  const sign = String(o.me || '').trim();
  return {
    subject: ('Thank you' + (title ? ': ' + title : '')).slice(0, 200),
    body: `${hi}\n\n${line}\n\n\nBest wishes${sign ? ',\n' + sign : ''}`,
  };
}
