/* ============================================================
   HOME widget "nextup" (Meeting prep): the pure rules.
   OWNER: the "nextup" widget builder (WIDGETS_CATALOGUE.md 3.4). The widget
   is 12-home-w-nextup.js; tests/home-w-nextup.test.mjs runs this file in a VM.
   No DOM, no page state, no clock: callers pass today / now.

     nuLoopFor(tasks, o)            the one open loop to show on a person's line:
                                    {kind: 'owe'|'waiting', id, title, due, late, lateDays, more}
                                    | null. tasks: [{id, title, due, priority, waiting}]
                                    (waiting: the task waits on them, pplIsWaiting).
                                    The earliest due first (undated last), then priority,
                                    then what the user owes before what they wait on.
     nuLastNote(notes, today)       the newest person note: {date, daysAgo, text} | null
     nuDaysBetween(a, b)            whole days from ISO date a to ISO date b
     nuDur(min)                     "42 min", "2 h", "1 h 5 min"
     nuWhen(o)                      the pill: {text, kind: 'now'|'soon'|'today'|'tomorrow'|'later'}
                                    o: {inMin, current, leftMin, dayDiff, weekday}
     nuWorkdaysAfter(iso, n, days)  the date n working days after iso (days: the working
                                    weekdays, 0 = Sunday; default Monday to Friday)
     nuNotesPreview(md, max)        {lines: the first `max` non-empty lines, more: how many left}
     nuAgendaLine(text)             what the user typed as one bullet ('- …'), '' when empty
     nuWaitingWhat(title)           'Waiting on the signed contract' -> 'the signed contract'
     nuFollowUpTitle(title)         'Follow up: <title>' (the meeting's title, clipped)
     nuIsFollowUp(title)            a follow-up task's title
     nuOrderAttendees(list)         the organiser first, then People, then the rest; declined last
     nuNamesText(names, max)        "Sam, Jo and 2 others"
     nuMailPlan(attendees, o)       who an email to the attendees goes to: {to (3 at most),
                                    cc (3 at most), all (every address, for the mail app)}.
                                    Only People addresses go in to / cc (Gmail drafts allow
                                    nothing else); o.emailsOf(personId) -> [address]
     nuNameFromEmail(email)         'sam.taylor@x.org' -> 'Sam Taylor' (for Add person)
     nuFirstName(name)              'Dr Sam Taylor' -> 'Sam'
     nuMailBody(o)                  the draft's text: greeting, the agenda when there is one,
                                    sign-off. o: {firsts, notes, when, me}
     nuMailtoUrl(to, subject, body) a mailto: link for several addresses (the mail app; it
                                    never sends by itself), '' without an address
     nuModel(o)                     the card's whole view model from plain data (see below)
   ============================================================ */
const _NU_PRI = { p1: 0, p2: 1, p3: 2, p0: 3 };

function nuDaysBetween(a, b) {
  const d = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
  const x = d(a), y = d(b);
  return Number.isFinite(x) && Number.isFinite(y) ? Math.round((y - x) / 864e5) : NaN;
}

/** The one open loop with a person (see the header). */
function nuLoopFor(tasks, o) {
  o = o || {};
  const today = String(o.today || '');
  const list = (Array.isArray(tasks) ? tasks : []).filter(t => t && t.id && String(t.title || '').trim());
  if (!list.length) return null;
  const key = (t) => [t.due ? 0 : 1, t.due || '', Object.prototype.hasOwnProperty.call(_NU_PRI, t.priority) ? _NU_PRI[t.priority] : 3, t.waiting ? 1 : 0];
  const cmp = (a, b) => {
    const x = key(a), y = key(b);
    for (let i = 0; i < x.length; i++) { if (x[i] < y[i]) return -1; if (x[i] > y[i]) return 1; }
    return String(a.title).localeCompare(String(b.title));
  };
  const t = list.slice().sort(cmp)[0];
  const lateDays = t.due && today ? nuDaysBetween(t.due, today) : 0;
  return {
    kind: t.waiting ? 'waiting' : 'owe', id: t.id, title: String(t.title).trim(), due: t.due || null,
    late: lateDays > 0, lateDays: lateDays > 0 ? lateDays : 0, more: list.length - 1,
  };
}

/** The newest note on a person ({ts, text} entries). */
function nuLastNote(notes, today) {
  let best = null;
  for (const n of Array.isArray(notes) ? notes : []) {
    const ts = n && Number(n.ts);
    if (!Number.isFinite(ts) || ts <= 0) continue;
    if (!best || ts > best.ts) best = { ts, text: String(n.text || '') };
  }
  if (!best) return null;
  const d = new Date(best.ts);
  const date = typeof Clock !== 'undefined' ? Clock.parts(best.ts).iso   // the page's day (travel spec 2.7)
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;   // clock-ok: Node fallback
  const daysAgo = today ? Math.max(0, nuDaysBetween(date, today)) : 0;
  return { date, daysAgo, text: best.text };
}

function nuDur(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

/** The time pill: "Now · 20 min left", "in 42 min", "Tomorrow", "Monday". */
function nuWhen(o) {
  o = o || {};
  if (o.current) {
    const left = Number(o.leftMin);
    return { text: Number.isFinite(left) && left > 0 ? `Now · ${nuDur(left)} left` : 'Now', kind: 'now' };
  }
  const inMin = Math.max(0, Math.round(Number(o.inMin) || 0));
  const dd = Number(o.dayDiff) || 0;
  if (dd <= 0) return { text: inMin <= 0 ? 'Starting now' : `in ${nuDur(inMin)}`, kind: inMin <= 15 ? 'soon' : 'today' };
  // After midnight but within the hour (23:50 -> 00:20) still reads as minutes.
  if (inMin < 60) return { text: `in ${nuDur(inMin)}`, kind: inMin <= 15 ? 'soon' : 'today' };
  if (dd === 1) return { text: 'Tomorrow', kind: 'tomorrow' };
  return { text: String(o.weekday || `In ${dd} days`), kind: 'later' };
}

/** n working days after iso (not counting iso itself). */
function nuWorkdaysAfter(iso, n, days) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  const work = new Set((Array.isArray(days) && days.length ? days : [1, 2, 3, 4, 5]).map(Number).filter(x => x >= 0 && x <= 6));
  if (!work.size) [1, 2, 3, 4, 5].forEach(x => work.add(x));
  let t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  let left = Math.max(0, Math.round(Number(n) || 0));
  for (let guard = 0; left > 0 && guard < 400; guard++) {
    t += 864e5;
    if (work.has(new Date(t).getUTCDay())) left--;
  }
  return new Date(t).toISOString().slice(0, 10);   // clock-ok: pure ISO arithmetic (UTC)
}

/** The first `max` non-empty lines of the notes. */
function nuNotesPreview(md, max) {
  const n = Math.max(1, Math.round(Number(max) || 4));
  const lines = String(md || '').replace(/\r\n?/g, '\n').split('\n').filter(l => l.trim());
  return { lines: lines.slice(0, n), more: Math.max(0, lines.length - n) };
}

/** One agenda bullet from what the user typed. */
function nuAgendaLine(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim().replace(/^(?:[-*+•]|\d+[.)])\s+/, '').replace(/^\[[ xX]?\]\s+/, '').trim();
  if (!s) return '';
  const a = Array.from(s);
  return '- ' + (a.length > 300 ? a.slice(0, 299).join('') + '…' : s);
}

/** What a waiting task waits for, without its own "Waiting on" ("Waiting on: the signed contract"). */
function nuWaitingWhat(title) {
  const s = String(title || '').replace(/\s+/g, ' ').trim();
  const t = s.replace(/^(wait(ing)?\s+(for|on)|await(ing)?|blocked\s+(by|on))\s*[:,-]?\s+/i, '');
  return t || s;
}
function nuFollowUpTitle(title) {
  const a = Array.from(String(title || '').replace(/\s+/g, ' ').trim() || 'the meeting');
  return 'Follow up: ' + (a.length > 120 ? a.slice(0, 119).join('').replace(/\s+\S*$/, '') + '…' : a.join(''));
}
function nuIsFollowUp(title) { return /^\s*follow[\s-]?up\b/i.test(String(title || '')); }

/** The organiser first, then People, then by name; declined last. Does not change the input. */
function nuOrderAttendees(list) {
  const rank = (a) => (a.response === 'declined' ? 3 : a.organizer ? 0 : a.personId ? 1 : 2);
  return (Array.isArray(list) ? list : []).filter(Boolean).map((a, i) => ({ a, i }))
    .sort((x, y) => rank(x.a) - rank(y.a) || x.i - y.i).map(x => x.a);
}

/** "Sam", "Sam and Jo", "Sam, Jo and Alex", "Sam, Jo and 3 others". */
function nuNamesText(names, max) {
  const list = (Array.isArray(names) ? names : []).map(s => String(s || '').trim()).filter(Boolean);
  const k = Math.max(1, Math.round(Number(max) || 2));
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length <= k + 1) return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  const rest = list.length - k;
  return list.slice(0, k).join(', ') + ` and ${rest} other${rest === 1 ? '' : 's'}`;
}

/** Who "Email the attendees" writes to (see the header). */
function nuMailPlan(attendees, o) {
  o = o || {};
  const emailsOf = typeof o.emailsOf === 'function' ? o.emailsOf : () => [];
  const known = [], all = [];
  for (const a of Array.isArray(attendees) ? attendees : []) {
    if (!a || a.response === 'declined') continue;
    const own = String(a.email || '').trim().toLowerCase();
    if (own && !all.includes(own)) all.push(own);
    if (!a.personId) continue;
    const list = (emailsOf(a.personId) || []).map(e => String(e || '').trim().toLowerCase()).filter(Boolean);
    const addr = own && list.includes(own) ? own : list[0];
    if (addr && !known.includes(addr)) known.push(addr);
  }
  return { to: known.slice(0, 3), cc: known.slice(3, 6), all };
}

/** A readable name from an address's local part, for "Add person". */
function nuNameFromEmail(email) {
  const local = String(email || '').trim().split('@')[0] || '';
  const words = local.replace(/\+.*$/, '').split(/[._-]+/).map(w => w.replace(/\d+/g, '')).filter(w => w.length > 0);
  if (!words.length) return '';
  return words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}
function nuFirstName(name) {
  const n = String(name || '').replace(/^(dr|prof|professor|mr|mrs|ms|miss|mx)\.?\s+/i, '').trim();
  return n.split(/\s+/)[0] || '';
}

/** The text of the email to the attendees (a draft: the user finishes it). */
function nuMailBody(o) {
  o = o || {};
  const firsts = (Array.isArray(o.firsts) ? o.firsts : []).map(s => String(s || '').trim()).filter(Boolean);
  const hi = firsts.length === 0 || firsts.length > 3 ? 'Hi all,' : `Hi ${nuNamesText(firsts, 3)},`;
  const notes = String(o.notes || '').replace(/\r\n?/g, '\n').trim();
  const when = String(o.when || '').trim();
  const me = String(o.me || '').trim();
  const mid = notes ? `Ahead of our meeting${when ? ' ' + when : ''}, this is what I would like to cover:\n\n${notes.slice(0, 1500)}` : '';
  return `${hi}\n\n${mid}${mid ? '\n\n' : '\n\n'}${me ? 'Best,\n' + me : 'Best,'}`;
}

/** mailto: for several addresses (opens the mail app; nothing is sent). */
function nuMailtoUrl(to, subject, body) {
  const list = (Array.isArray(to) ? to : [to]).map(e => String(e || '').trim()).filter(e => /^[^\s@<>",;?&]+@[^\s@<>",;?&]+\.[^\s@<>",;?&]+$/.test(e)).slice(0, 20);
  if (!list.length) return '';
  const q = [];
  if (subject) q.push('subject=' + encodeURIComponent(String(subject).slice(0, 180)));
  if (body) q.push('body=' + encodeURIComponent(String(body).slice(0, 1600)));
  return 'mailto:' + list.map(e => encodeURIComponent(e).replace(/%40/g, '@')).join(',') + (q.length ? '?' + q.join('&') : '');
}

/**
 * The card's view model from plain data (no page globals).
 *   meeting     a homeMeetings() entry: {id, title, start, end (ms), date, startMin, endMin,
 *               minutes, attendees: [{email, name, personId, response, organizer, optional}],
 *               people, join, location}
 *   current, inMin   from homeNextMeeting; nowMs; today, tomorrow ('YYYY-MM-DD')
 *   dayLabel    how the meeting's day reads when it is not today or tomorrow ('Mon 5 Oct')
 *   weekday     its weekday ('Monday'), for the pill
 *   people      {id: {id, name, color, avatarUrl, notes, emails: [address]}} (the ones that matter)
 *   loops       {personId: [{id, title, due, priority, waiting}]} (open tasks with them)
 *   contact     {personId: '3 days ago · email'} (personLastContact labels)
 *   meta        {notes, notesBy, tasks: [{id, title, done, due}]} (the event's own notes, eventMeta)
 *   me, workDays, maxRows (attendee lines), maxAvatars, stream (for the follow-up)
 */
function nuModel(o) {
  o = o || {};
  const m = o.meeting;
  if (!m || !m.id) return null;
  const people = o.people && typeof o.people === 'object' ? o.people : {};
  const today = String(o.today || '');
  const pOf = (id) => (id && Object.prototype.hasOwnProperty.call(people, id) ? people[id] : null);
  const now = Number(o.nowMs);
  const leftMin = o.current && Number.isFinite(now) ? Math.max(0, Math.round((m.end - now) / 60000)) : null;
  const dayDiff = today ? nuDaysBetween(today, m.date) : 0;
  const when = nuWhen({ inMin: o.inMin, current: !!o.current, leftMin, dayDiff, weekday: o.weekday });
  const dayText = m.date === today ? 'Today' : m.date === o.tomorrow ? 'Tomorrow' : String(o.dayLabel || m.date || '');
  const hm = (x) => String(Math.floor(x / 60) % 24).padStart(2, '0') + ':' + String(x % 60).padStart(2, '0');
  const timeText = Number.isFinite(m.startMin) ? hm(m.startMin) + (Number.isFinite(m.endMin) && m.endMin > m.startMin ? '–' + hm(m.endMin >= 1440 ? 0 : m.endMin) : '') : '';

  const ordered = nuOrderAttendees(m.attendees);
  const rows = [];
  for (const a of ordered) {
    const p = pOf(a.personId);
    const name = (p && p.name) || String(a.name || '').trim() || nuNameFromEmail(a.email) || String(a.email || '');
    if (!name) continue;
    const row = { key: a.personId ? 'p:' + a.personId : 'e:' + (a.email || name), name, email: a.email || '', personId: p ? p.id : null,
      person: p ? { id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl } : null,
      organizer: !!a.organizer, declined: a.response === 'declined', optional: !!a.optional, unknown: !p, line: null };
    if (p) {
      const loop = nuLoopFor((o.loops || {})[p.id], { today });
      if (loop) {
        row.line = { kind: loop.kind, taskId: loop.id, title: loop.title, late: loop.late, lateDays: loop.lateDays, more: loop.more,
          text: loop.kind === 'waiting' ? 'Waiting on: ' + nuWaitingWhat(loop.title) : 'You owe: ' + loop.title };
      } else {
        const note = nuLastNote(p.notes, today);
        const c = (o.contact || {})[p.id];
        if (note) row.line = { kind: 'note', text: `Last note ${note.daysAgo === 0 ? 'today' : note.daysAgo === 1 ? 'yesterday' : note.daysAgo + ' days ago'}${note.text ? ': ' + note.text : ''}`, date: note.date };
        else if (c) row.line = { kind: 'contact', text: 'Last contact ' + c };
        else row.line = { kind: 'none', text: 'Nothing open with them' };
      }
    }
    rows.push(row);
  }
  const maxRows = Math.max(0, Math.round(Number(o.maxRows) || 0));
  const maxAv = Math.max(1, Math.round(Number(o.maxAvatars) || 4));
  const going = rows.filter(r => !r.declined);
  const meta = o.meta || {};
  const tasks = (Array.isArray(meta.tasks) ? meta.tasks : []).filter(t => t && t.id);
  const fu = tasks.find(t => nuIsFollowUp(t.title)) || null;
  const plan = nuMailPlan(m.attendees, { emailsOf: (pid) => { const p = pOf(pid); return p && Array.isArray(p.emails) ? p.emails : []; } });
  const firstOf = (addr) => {
    for (const r of rows) {
      if (!r.person) continue;
      const p = pOf(r.personId);
      if (p && Array.isArray(p.emails) && p.emails.map(e => String(e).toLowerCase()).includes(addr)) return nuFirstName(p.name);
    }
    return '';
  };
  const subject = 'Re: ' + String(m.title || 'our meeting').slice(0, 180);
  const whenWords = (dayText === 'Today' ? 'today' : dayText === 'Tomorrow' ? 'tomorrow' : 'on ' + dayText) + (timeText ? ' at ' + timeText.split('–')[0] : '');
  return {
    id: m.id, title: String(m.title || '(no title)'), date: m.date, start: m.start, end: m.end, startMin: m.startMin, endMin: m.endMin,
    minutes: m.minutes, current: !!o.current, inMin: Math.max(0, Math.round(Number(o.inMin) || 0)), leftMin,
    when, dayText, timeText, join: m.join || '', location: m.location || '',
    avatars: going.slice(0, maxAv), avatarsMore: Math.max(0, going.length - maxAv), others: going.length,
    names: nuNamesText(going.map(r => nuFirstName(r.name) || r.name), 2),
    rows: maxRows ? rows.slice(0, maxRows) : [], rowsMore: maxRows ? Math.max(0, rows.length - maxRows) : rows.length,
    notes: String(meta.notes || ''), notesBy: String(meta.notesBy || ''),
    tasks, followUp: fu ? { id: fu.id, title: fu.title } : null,
    follow: { title: nuFollowUpTitle(m.title), due: nuWorkdaysAfter(m.date, 2, o.workDays), people: [...new Set(rows.filter(r => r.personId && !r.declined).map(r => r.personId))],
      stream: o.stream || null, detail: `After the meeting “${String(m.title || '').slice(0, 200)}” (${dayText}${timeText ? ' ' + timeText : ''}).` },
    mail: { to: plan.to, cc: plan.cc, all: plan.all, subject,
      body: nuMailBody({ firsts: plan.to.map(firstOf).filter(Boolean), notes: meta.notes, when: whenWords, me: o.me }) },
  };
}
