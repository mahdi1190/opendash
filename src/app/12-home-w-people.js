/* ============================================================
   HOME widget "people": People today - who you meet today (calendar
   attendees and names in event titles, matched to People) and who is linked
   to today's Focus tasks, each with why it matters; then the one person
   waiting longest on you, with a Reply that drafts an email (never sends).
   Owner: HB4 (finance, people, waiting). CSS: 13-home-w-glances.css.

   Matching: pplEventPeople (52-people-link.js: attendee and organiser
   addresses, then names in the title) plus attendee display names and
   aliases; tasks through effPeople (pplLinked). Never the user, never an
   archived person or a mailbox. Events come from the calendar snapshot with
   attendees (40-calendar.js CalStore, loaded on demand), else the light
   list (calendarSoon: names in titles only). homePeopleToday() is pure
   (tests/home-glances.test.mjs). Click a row: the person's page.
   Sizes: S a list; M two columns. Under 250 px: a tile (avatars, count).
   No people at all: hidden (it appears once People has someone).
   ============================================================ */
let _hbpCalAsked = false;

registerHomeWidget({
  id: 'people', title: 'People today', icon: 'users', order: 70,
  description: 'Who you will see today, why it matters, and who is waiting on you',
  emptyHint: 'Appears when you have people, with today’s meetings',
  sizes: ['s', 'm'], defaultSize: 's',
  render(el, ctx) { return _hbpRender(el, ctx || {}); },
});

/* ---------- people of the day (pure) ---------- */
const _HBP_OWE = /\b(reply|respond|get back to|answer|send|share|confirm|return|call back|write back|let \S+ know)\b/i;
const _HBP_CELEBRATE = /\b(birthday|bday|b-day|anniversary)\b/i;
function _hbpMin(hm) { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function _hbpDays(a, b) { const d = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); return Math.round((d(b) - d(a)) / 864e5); }

/**
 * Who matters today, and why.
 *   people    state.people;  idx: pplBuildIndex(people)
 *   events    today's (and tomorrow's, for birthdays) events:
 *             [{id, title, date, start 'HH:MM', end, allDay, location, attendees: [{email, name, self}], organizer, declined}]
 *   tasks     open tasks: [{id, title, people: [ids linked], due, createdAt (ms or ISO), waiting, waitingOn (id), focus, focusRank}]
 *   today 'YYYY-MM-DD', nowHM 'HH:MM', lastSeen {id: 'YYYY-MM-DD'} (optional), max (6)
 * -> { rows: [{id, person, time, end, past, meeting: {id, title, location, start, end} | null, meetings: n,
 *              focus: [{id, title}], why: [{k, pre, b, post}], owed: {task, days} | null, score}],
 *      owed: {id, person, task: {id, title}, days, late} | null   (only when that person has no row) }
 */
function homePeopleToday(o) {
  o = o || {};
  const people = Array.isArray(o.people) ? o.people : [];
  const idx = o.idx || (typeof pplBuildIndex === 'function' ? pplBuildIndex(people) : null);
  const today = String(o.today || ''), now = _hbpMin(o.nowHM);
  const fold = (s) => (typeof pplFold === 'function' ? pplFold(s) : String(s || '').toLowerCase()).trim();
  const byId = new Map();
  const names = new Map();
  const put = (k, id) => { if (!k || k.length < 3) return; names.set(k, names.has(k) && names.get(k) !== id ? null : id); };
  for (const p of people) {
    if (!p || typeof p.id !== 'string') continue;
    byId.set(p.id, p);
    if (p.self || p.isSelf) continue;
    put(fold(p.name), p.id);
    for (const a of Array.isArray(p.aliases) ? p.aliases : []) put(fold(a), p.id);
  }
  const usable = (id) => { const p = byId.get(id); return !!(p && !p.self && !p.isSelf && !p.inactive && p.kind !== 'mailbox'); };
  const eventPeople = (ev) => {
    const out = [];
    const add = (id) => { if (id && usable(id) && !out.includes(id)) out.push(id); };
    if (idx && typeof pplEventPeople === 'function') for (const id of pplEventPeople({ summary: ev.title, attendees: ev.attendees, organizer: ev.organizer }, idx)) add(id);
    for (const a of Array.isArray(ev.attendees) ? ev.attendees : []) {
      if (!a || a.self) continue;
      if (a.personId) add(a.personId);
      const nm = fold(a.name || '');
      if (nm && names.get(nm)) add(names.get(nm));
      const local = String(a.email || '').split('@')[0].replace(/[._-]+/g, ' ');
      if (local && names.get(fold(local))) add(names.get(fold(local)));
    }
    return out;
  };
  const rec = new Map();
  const get = (id) => { if (!usable(id)) return null; let r = rec.get(id); if (!r) { r = { id, meetings: [], celebration: null, focus: [], youOwe: [], theyOwe: [] }; rec.set(id, r); } return r; };
  for (const ev of Array.isArray(o.events) ? o.events : []) {
    if (!ev || ev.declined) continue;
    const ids = eventPeople(ev);
    const celebrate = _HBP_CELEBRATE.test(String(ev.title || ''));
    if (celebrate) {
      const named = idx && typeof pplMentions === 'function' ? new Set(pplMentions(ev.title || '', idx).map(x => x.pid)) : new Set(ids);
      for (const id of ids) {
        if (!named.has(id)) continue;
        const r = get(id); if (!r || r.celebration) continue;
        if (ev.date === today || (ev.allDay && ev.until && ev.date < today && ev.until >= today)) r.celebration = { when: 'today', title: ev.title };
        else if (ev.date > today && _hbpDays(today, ev.date) === 1) r.celebration = { when: 'tomorrow', title: ev.title };
      }
      if (ev.allDay) continue;
    }
    if (ev.allDay || ev.date !== today) continue;                 // "Clara away" is not a meeting
    for (const id of ids) {
      const r = get(id); if (!r) continue;
      r.meetings.push({ id: ev.id || null, title: String(ev.title || 'Event'), location: ev.location || '', start: ev.start || null, end: ev.end || null, ev });
    }
  }
  const tasks = (Array.isArray(o.tasks) ? o.tasks : []).filter(t => t && t.id);
  for (const t of tasks) if (t.focus) for (const id of Array.isArray(t.people) ? t.people : []) get(id);   // Focus people get a row
  for (const t of tasks) {
    for (const id of Array.isArray(t.people) ? t.people : []) {
      const r = usable(id) ? rec.get(id) : null;
      if (!r) continue;
      const item = { id: t.id, title: String(t.title || ''), due: t.due || null, createdAt: t.createdAt || null, focusRank: t.focusRank };
      if (t.focus) r.focus.push(item);
      if (t.waiting) { if (!t.waitingOn || t.waitingOn === id) r.theyOwe.push(item); }
      else r.youOwe.push(item);
    }
  }
  // How long someone has been waiting on you: a reply-type task, overdue or asked 2+ days ago.
  const ageOf = (t) => {
    if (t.due && t.due < today) return { days: _hbpDays(t.due, today), late: true };
    const c = t.createdAt ? (typeof t.createdAt === 'number' ? new Date(t.createdAt) : new Date(String(t.createdAt))) : null;
    if (!c || isNaN(c)) return null;
    const iso = `${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, '0')}-${String(c.getDate()).padStart(2, '0')}`;
    return { days: Math.max(0, _hbpDays(iso, today)), late: false };
  };
  let owedBest = null;
  for (const t of tasks) {
    if (!t || t.waiting || !_HBP_OWE.test(String(t.title || ''))) continue;
    const a = ageOf(t); if (!a || (a.days < 2 && !a.late)) continue;
    const who = (Array.isArray(t.people) ? t.people : []).find(usable);
    if (!who) continue;
    if (!owedBest || a.days > owedBest.days) owedBest = { id: who, person: byId.get(who), task: { id: t.id, title: String(t.title || '') }, days: a.days, late: a.late };
  }
  const weekday = (iso) => { try { return new Date(iso + 'T12:00:00').toLocaleDateString(o.locale || 'en-GB', { weekday: 'long' }); } catch (e) { return iso; } };
  const rows = [];
  for (const r of rec.values()) {
    if (!r.meetings.length && !r.focus.length && !(r.celebration && r.celebration.when === 'today')) continue;
    r.meetings.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
    const upcoming = r.meetings.find(m => { const e = _hbpMin(m.end) ?? _hbpMin(m.start); return now == null || e == null || e > now; });
    const meeting = upcoming || r.meetings[r.meetings.length - 1] || null;
    const past = !!(meeting && !upcoming);
    const why = [];
    if (r.celebration) why.push({ k: 'celebrate', pre: '', b: r.celebration.when === 'today' ? 'Birthday today' : 'Birthday tomorrow', post: '' });
    const metaTask = !meeting && r.focus[0] ? r.focus[0].id : null;   // already on the row's second line
    const owe = r.youOwe.filter(t => t.due && t.id !== metaTask).sort((a, b) => a.due.localeCompare(b.due))[0];
    if (owe && owe.due < today) why.push({ k: 'late', pre: 'You owe them ', b: owe.title, post: ` · ${_hbpDays(owe.due, today)} d late` });
    else if (owe && _hbpDays(today, owe.due) <= 7) why.push({ k: 'promised', pre: 'You promised ', b: owe.title, post: owe.due === today ? ' today' : ` by ${weekday(owe.due)}` });
    const ask = r.theyOwe.find(t => t.id !== metaTask);
    if (ask && why.length < 2) why.push({ k: 'ask', pre: meeting ? 'Ask about ' : 'Waiting on them for ', b: ask.title, post: '' });
    // Without a meeting the row's second line names the Focus task; with one, it is a reason.
    const f = r.focus.find(x => !owe || x.id !== owe.id);
    if (f && meeting && why.length < 2) why.push({ k: 'focus', pre: '', b: f.title, post: ' is in Focus' });
    const seen = o.lastSeen && o.lastSeen[r.id];
    if (seen && meeting && why.length < 2) { const d = _hbpDays(seen, today); if (d >= 14) why.push({ k: 'seen', pre: 'Last seen ', b: hglAgoText(d), post: '' }); }
    const owedHere = owedBest && owedBest.id === r.id ? { task: owedBest.task, days: owedBest.days, late: owedBest.late } : null;
    const start = meeting ? _hbpMin(meeting.start) : null;
    const score = (meeting && !past ? 1000 - (start ?? 0) / 2 : 0) + (r.celebration ? 200 : 0) + (r.focus.length ? 300 - Math.min(...r.focus.map(x => x.focusRank ?? 9)) * 10 : 0) - (past ? 900 : 0);
    rows.push({ id: r.id, person: byId.get(r.id), time: meeting ? meeting.start : null, end: meeting ? meeting.end : null, past, meeting, meetings: r.meetings.length, focus: r.focus.map(x => ({ id: x.id, title: x.title })), why: why.slice(0, 2), owed: owedHere, score });
  }
  // Upcoming meetings in time order, then Focus people, then meetings already over.
  rows.sort((a, b) => {
    const ga = a.meeting && !a.past ? 0 : a.meeting ? 2 : 1, gb = b.meeting && !b.past ? 0 : b.meeting ? 2 : 1;
    if (ga !== gb) return ga - gb;
    if (ga !== 1) return (a.time || '').localeCompare(b.time || '') || String(a.person.name).localeCompare(String(b.person.name));
    return b.score - a.score || String(a.person.name).localeCompare(String(b.person.name));
  });
  // A group meeting (3+ people whose row is about it) is one row, not a wall of the
  // same line; someone with a birthday or waiting on you keeps their own row.
  const members = new Map();
  for (const r of rows) {
    if (!r.meeting || !r.meeting.id || r.owed || r.why.some(w => w.k === 'celebrate')) continue;
    if (!members.has(r.meeting.id)) members.set(r.meeting.id, []);
    members.get(r.meeting.id).push(r);
  }
  const grouped = [];
  const done = new Set();
  for (const r of rows) {
    const list = r.meeting && r.meeting.id ? members.get(r.meeting.id) : null;
    if (!list || list.length < 3 || !list.includes(r)) { grouped.push(r); continue; }
    if (done.has(r.meeting.id)) continue;
    done.add(r.meeting.id);
    const lead = list.find(x => x.why.length);
    const why = lead ? [Object.assign({}, lead.why[0], { pre: hglFirst(lead.person) + ': ' + (lead.why[0].pre ? lead.why[0].pre.charAt(0).toLowerCase() + lead.why[0].pre.slice(1) : '') })] : [];
    grouped.push({ id: 'ev:' + r.meeting.id, group: true, ids: list.map(x => x.id), people: list.map(x => x.person), person: list[0].person,
      time: r.time, end: r.end, past: r.past, meeting: r.meeting, meetings: 1, focus: [], why, owed: null, score: r.score });
  }
  const max = Math.max(1, Math.min(12, o.max || 6));
  const shown = grouped.slice(0, max);
  const owed = owedBest && !shown.some(r => r.id === owedBest.id) ? owedBest : null;
  const count = (list) => list.reduce((n, r) => n + (r.group ? r.ids.length : 1), 0);
  return { rows: shown, more: count(grouped) - count(shown), people: count(grouped), owed };
}
/** "3 weeks ago" (pure; hglAge is the page's copy for ages without "ago"). */
function hglAgoText(d) {
  if (d < 14) return d + ' days ago';
  if (d < 60) return Math.round(d / 7) + ' weeks ago';
  if (d < 365) return Math.round(d / 30.44) + ' months ago';
  return 'over a year ago';
}

/* ---------- the page's inputs ---------- */
function _hbpHM(d) { return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
/** Today's and tomorrow's events with attendees (CalStore), else the light list (titles only). */
function _hbpEvents(today, tomorrow) {
  const full = typeof CalStore !== 'undefined' && CalStore.data && typeof calEventsOn === 'function';
  if (!full && !_hbpCalAsked && typeof CalStore !== 'undefined' && CalStore.st && !CalStore.st.loaded && !CalStore.st.loading
    && (typeof _serverAvailable === 'undefined' || _serverAvailable) && !(APP_CONFIG.features && APP_CONFIG.features.calendar === false)) {
    _hbpCalAsked = true;
    try { CalStore.load(); } catch (e) { /* the light list will do */ }   // its onChange repaints Home
  }
  const out = [];
  if (full) {
    for (const iso of [today, tomorrow]) {
      for (const ev of calEventsOn(iso)) {
        if (typeof calEventVisible === 'function' && !calEventVisible(ev)) continue;
        const allDay = !!(ev.allDay || (ev.start && ev.start.date));
        let start = null, end = null;
        if (!allDay) { try { start = _hbpHM(calEventStart(ev)); end = _hbpHM(calEventEnd(ev)); } catch (e) { /* partial */ } }
        let first = iso;
        try { first = calEventDays(ev)[0]; } catch (e) { /* keep */ }
        out.push({ id: ev.id, title: ev.summary || ev.title || '', date: allDay ? (first <= iso ? iso : first) : first, start, end, allDay, location: ev.location || '',
          attendees: ev.attendees || [], organizer: ev.organizer || null, declined: typeof calIsDeclined === 'function' ? calIsDeclined(ev) : ev.selfResponse === 'declined', raw: ev });
      }
    }
    return out.filter((e, i, a) => a.findIndex(x => x.id === e.id && x.date === e.date) === i);
  }
  if (typeof calendarSoon === 'function') {
    const cal = calendarSoon(() => { if (state.view === 'home' && typeof homeRerenderWidget === 'function') homeRerenderWidget('people'); });
    for (const e of cal.events || []) {
      if (e.date !== today && e.date !== tomorrow && !(e.until && e.date <= today && e.until >= today)) continue;
      out.push({ id: e.id, title: e.title || '', date: e.date, start: e.start || null, end: e.end || null, allDay: !!e.allDay, until: e.until, location: e.location || '', attendees: [], declined: false });
    }
  }
  return out;
}
function _hbpTasks() {
  const focus = typeof homeFocusTasks === 'function' ? homeFocusTasks().map(x => x.i.id) : [];
  const out = [];
  for (const i of getAllItems()) {
    if (statusOf(i.id) === 'done') continue;
    const ppl = typeof effPeople === 'function' ? effPeople(i) : (i.people || []);
    if (!ppl.length) continue;
    const waiting = typeof homeIsWaiting === 'function' && homeIsWaiting(i);
    const wp = waiting && typeof homeWaitingPerson === 'function' ? homeWaitingPerson(i) : null;
    out.push({ id: i.id, title: effTitle(i), people: ppl, due: effDate(i), createdAt: i.createdAt || null, waiting, waitingOn: wp ? wp.id : null, focus: focus.includes(i.id), focusRank: focus.indexOf(i.id) });
  }
  return out;
}
/** When each person was last met (the calendar snapshot's past events). */
function _hbpLastSeen(ids, today) {
  const out = {};
  if (typeof calendarEventsFor !== 'function' || typeof CalStore === 'undefined' || !CalStore.data) return out;
  for (const id of ids) {
    const p = getPerson(id); if (!p) continue;
    try {
      for (const ev of calendarEventsFor(p, 20)) { const d = calEventDays(ev)[0]; if (d < today && (!out[id] || d > out[id])) out[id] = d; }
    } catch (e) { /* skip */ }
  }
  return out;
}

/* ---------- render ---------- */
function _hbpRender(el, ctx) {
  const people = (state.people || []).filter(p => p && !p.self && !p.isSelf);
  if (!people.length) return false;                              // a new user: it appears once People has someone
  const today = todayStr();
  const t2 = new Date(); t2.setDate(t2.getDate() + 1);
  const tomorrow = fmtDate(t2);
  const events = _hbpEvents(today, tomorrow);
  const tasks = _hbpTasks();
  const idx = typeof pplIndex === 'function' ? pplIndex() : undefined;
  const first = homePeopleToday({ people: state.people, idx, events, tasks, today, nowHM: _hbpHM(new Date()), locale: APP_CONFIG.locale, max: ctx.size === 'm' ? 8 : 5 });
  const seen = _hbpLastSeen(first.rows.filter(r => r.meeting && !r.group).map(r => r.id), today);
  const res = Object.keys(seen).length ? homePeopleToday({ people: state.people, idx, events, tasks, today, nowHM: _hbpHM(new Date()), lastSeen: seen, locale: APP_CONFIG.locale, max: ctx.size === 'm' ? 8 : 5 }) : first;

  const card = document.createElement('section');
  card.className = `card home-card hbp hbp--${ctx.size || 's'}`;
  const nToday = res.people;
  card.appendChild(hglHead({ icon: 'users', title: 'People today', n: nToday ? `${nToday} today` : '', link: { label: 'People', title: 'All people', run: () => { if (state.view !== 'people') setView('people'); } } }));
  const body = document.createElement('div'); body.className = 'card-b hbp-b';
  card.appendChild(body);
  el.appendChild(card);

  if (!res.rows.length) {
    body.appendChild(hglEmpty({ scene: 'friends', title: 'People you will see', text: 'When an event or a Focus task names someone, they show up here with why it matters.' }));
    if (res.owed) body.appendChild(_hbpOwedCard(res.owed));
    _hbpTile(body, res);
    return true;
  }
  const list = document.createElement('ul'); list.className = 'hbp-list';
  for (const r of res.rows) list.appendChild(_hbpRow(r, today));
  body.appendChild(list);
  if (res.more) { const m = document.createElement('div'); m.className = 'hgl-foot'; m.textContent = `+${res.more} more today`; body.appendChild(m); }
  if (res.owed) body.appendChild(_hbpOwedCard(res.owed));
  _hbpTile(body, res);
  if (ctx.enterNew) ctx.enterNew(list.children, (li) => li.dataset.flip);
  return true;
}

/** A task title short enough for a reason line ("You promised <title> by Friday"). */
function _hbpClip(s, max) {
  const a = Array.from(String(s || '').replace(/\s+/g, ' ').trim());
  return a.length > max ? a.slice(0, max - 1).join('').replace(/[\s,.;:–-]+\S*$/, '') + '…' : a.join('');
}
function _hbpWhyHtml(why) {
  return why.map(w => `${esc(w.pre || '')}<b>${esc(_hbpClip(w.b, 40))}</b>${esc(w.post || '')}`).join(' · ');
}
function _hbpRow(r, today) {
  const p = r.person;
  const li = document.createElement('li');
  li.className = 'hbp-row hgl-row' + (r.past ? ' is-past' : '') + (r.owed ? ' is-owed' : '') + (r.group ? ' is-group' : '');
  li.dataset.flip = 'pp:' + r.id;
  li.tabIndex = 0; li.setAttribute('role', 'link');
  const m = r.meeting;
  let scene = '';
  if (m) {
    let type = 'event';
    try { if (m.ev && m.ev.raw && typeof animForEvent === 'function') type = animForEvent(m.ev.raw).type || 'event'; else if (typeof animClassify === 'function') type = animClassify({ kind: 'event', title: m.title, location: m.location }).type || 'event'; } catch (e) { /* default */ }
    scene = hglScene(type, { size: 'xs', hover: true, cls: 'hbp-sc' });
  }
  const meta = m ? `<div class="hbp-m">${scene || icon('calendar')}<span>${esc(m.title)}${m.location ? ` · ${esc(m.location)}` : ''}</span></div>`
    : (r.focus.length ? `<div class="hbp-m hbp-mf" title="${escAttr('In Focus: ' + r.focus.map(f => f.title).join(' · '))}">${icon('target')}<span>${esc(r.focus[0].title)}</span>${r.focus.length > 1 ? `<em>+${r.focus.length - 1}</em>` : ''}</div>` : '');
  const owed = r.owed ? `<span class="hbp-tagw">${icon('hourglass')}Waiting on you · ${esc(String(r.owed.days))} d</span>` : '';
  const time = r.time ? `<time class="num">${r.past ? icon('check') : ''}${esc(r.time)}</time>` : '<span></span>';
  if (r.group) {
    // One row for a group meeting: stacked faces, first names, the event.
    const names = r.people.slice(0, 3).map(hglFirst).join(', ') + (r.people.length > 3 ? ` +${r.people.length - 3}` : '');
    li.innerHTML = `<span class="hbp-stack">${r.people.slice(0, 3).map(x => homeAvatar(x, 26)).join('')}</span><div class="hbp-body"><div class="hbp-n"><span class="nm">${esc(names)}</span></div>${meta}${r.why.length ? `<div class="hbp-y">${_hbpWhyHtml(r.why)}</div>` : ''}</div>${time}`;
    const canEvent = typeof openEvent === 'function' && m && m.id;
    li.title = canEvent ? 'Open ' + m.title : r.people.map(x => x.name).join(', ');      // a property: no markup
    const go = () => { if (canEvent) openEvent(m.id, { from: li }); else hglOpenPerson(r.ids[0]); };
    li.onclick = go;
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    return li;
  }
  li.innerHTML = `${homeAvatar(p, 32)}<div class="hbp-body"><div class="hbp-n"><span class="nm">${esc(p.name || p.id)}</span>${owed}</div>${meta}${r.why.length ? `<div class="hbp-y">${_hbpWhyHtml(r.why)}</div>` : ''}</div>${time}`;
  li.title = `Open ${p.name || 'this person'}`;
  li.onclick = () => hglOpenPerson(r.id);
  li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); hglOpenPerson(r.id); } };
  return li;
}
function _hbpOwedCard(o) {
  const p = o.person;
  // Two buttons side by side (the person, then Reply), never one inside the other.
  const box = document.createElement('div'); box.className = 'hbp-owed hgl-row'; box.dataset.flip = 'pp-owed:' + o.id;
  const main = document.createElement('button'); main.type = 'button'; main.className = 'hbp-row hbp-main'; main.title = `Open ${p.name || 'this person'}`;
  main.innerHTML = `${homeAvatar(p, 32)}<span class="hbp-body"><span class="hbp-n"><span class="nm">${esc(p.name || p.id)}</span><span class="hbp-tagw">${icon('hourglass')}Waiting on you · ${esc(String(o.days))} d</span></span><span class="hbp-y">${esc(o.task.title)}${o.late ? ' · overdue' : ''}</span></span>`;
  main.onclick = () => hglOpenPerson(o.id);
  box.appendChild(main);
  const url = hglMailto(p, 'Re: ' + o.task.title, `Hi ${hglFirst(p)},\n\n`);
  const b = document.createElement('button'); b.type = 'button'; b.className = 'hgl-mini';
  if (url) { b.innerHTML = icon('send') + '<span>Reply</span>'; b.title = 'Draft a reply in your mail app (nothing is sent)'; b.onclick = () => hglOpenMail(url); }
  else { b.innerHTML = icon('arrow-right') + '<span>Open</span>'; b.title = 'Open the task'; b.onclick = () => hglOpenTask(null, o.task.id, box, b); }
  box.appendChild(b);
  return box;
}
/** The phone tile (under 250 px): stacked avatars, a count and who is waiting. */
function _hbpTile(body, res) {
  const t = document.createElement('div'); t.className = 'hbp-tile';
  const avs = res.rows.flatMap(r => (r.group ? r.people : [r.person])).slice(0, 3).map(p => homeAvatar(p, 30)).join('');
  const n = res.people;
  t.innerHTML = (avs ? `<div class="hbp-stack">${avs}</div>` : '') + `<div class="hbp-tn"><b>${n ? `${n} today` : 'Nobody today'}</b></div>`
    + (res.owed ? `<div class="hbp-tw">${esc(hglFirst(res.owed.person))} is waiting</div>` : res.rows.find(r => r.owed) ? `<div class="hbp-tw">${esc(hglFirst(res.rows.find(r => r.owed).person))} is waiting</div>` : '');
  body.appendChild(t);
}
