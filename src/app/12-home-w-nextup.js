/* ============================================================
   HOME widget "nextup": Meeting prep (WIDGETS_CATALOGUE.md 3.4).
   OWNER: the "nextup" widget builder (Phase 1, wave 2). Pure rules:
   12-home-nextup-logic.js (nuModel and friends); meetings: 12-home-meet-logic.js
   through homeNextMeetingNow (53-people-contact.js). CSS: 13-home-w-nextup.css.
   Tests: tests/home-w-nextup.test.mjs.

   The job: everything for the next meeting with other people, on one card.
   Which meeting: the one under way, else the next one starting within
   prefs.horizonH hours (18: in the evening it shows tomorrow morning). Only
   meetings with someone else (timed, not declined, not out of office / focus
   time / working location; homeIsMeeting).

   Sizes
     S     the title (a heading with its time), "in 42 min" (the shared minute tick;
           "Now · 20 min left" while it runs), up to 4 faces then "+N", Join when there
           is a call link, else the place.
     M     + one line per attendee: in People, the one open loop with them ("You owe:"
           or "Waiting on:", pplIsWaiting), else the last note or last contact; someone
           not in People shows their address and Add person. Then the agenda preview
           (eventMeta.notes, 4 lines) and "Add an agenda point". Then the actions.
     L     + the event's linked tasks (tickable), files from those tasks, and the last
           emails with the people there (prefs.showEmails; switch off before sharing
           the screen).
     Full  two columns: the people on the left, the full notes editor on the right
           (saves 800 ms after typing stops; Draft with Claude).

   Actions. The user's rule (3 Oct): one click on something that makes or edits
   a thing opens the NORMAL editor, prefilled; the small ✓ beside it does it as
   it is, at once, with Undo.
     Follow-up       the task card in create mode: "Follow up: <title>", due 2
                     working days after the meeting, its people and the event linked.
                     ✓ = that task now and linked to the event (one undo step).
                     Afterwards the button reads "Follow-up added" (the task is in
                     eventMeta.tasks) and does nothing.
     Email attendees the Gmail draft editor (GmailDraft.openEditor: To = the People
                     addresses, the agenda in the text; a DRAFT, never sent). ✓ = the
                     draft saved as it is (Undo deletes it). No Gmail: the mail app
                     (mailto, every address).
     Add person      the person editor prefilled (name, address); ✓ = added now (Undo).
     Agenda point    calAnnotate(id, {appendNotes}) with Undo (what the user typed).
     Draft with Claude   calDraftAgenda (gated on Claude); Undo puts the notes back.
     Join            window.open(safeUrl(link), '_blank', 'noopener').
     Open event / a person / a task: the card (a no-op when it is already open; the
                     row or button is aria-current while it is).
   Gating: no calendar connected -> ctx.off ("Connect a calendar to prepare for
   meetings"); no meeting in the horizon -> render() returns false (emptyHint);
   calendar data older than 6 h -> "Updated 07:02" in the header (click = update).
   Motion, once per entry: the faces stagger in on first paint (6 at most, 40 ms
   apart); when the meeting changes (ctx.isNew) the card crossfades once.
   ============================================================ */
const _NU_ROWS = { s: 0, m: 4, l: 6, full: 8 };
const _NU_SAVE_MS = 800;
const _nu = {
  untick: null,
  sig: '',              // the meeting shown: id|current ('' = none), for the minute tick
  edit: null,           // the Full notes editor: {evId, text, saved, base, dirty, sel}
  timer: 0,             // its autosave
  followKey: '',        // the draft key of the follow-up card this widget opened
  drafted: new Map(),   // event id -> Gmail draft id saved from here this session
  horizonH: 18,
};

registerHomeWidget({
  id: 'nextup', title: 'Meeting prep', icon: 'presentation', order: 130, group: 'time', gate: 'calendar',
  description: 'Everything for your next meeting with other people, on one card',
  emptyHint: 'Appears before a meeting with other people',
  sizes: ['s', 'm', 'l', 'full'], defaultSize: 'm', defaultHidden: true, fresh: true,
  aliases: ['next meeting', 'meeting prep', 'prep', 'next up', 'prepare for meeting'],
  defaults: { horizonH: 18, showEmails: true },
  available: () => true,
  sample: (kit) => _nuSample(kit),
  render(el, ctx) { return _nuRender(el, ctx || {}); },
  settings(anchor, ctx) {
    homeSettingsMenu(anchor, ctx, [
      { key: 'horizonH', label: 'Look ahead', type: 'choice', hint: 'How far ahead the next meeting may be',
        choices: [[6, '6 h'], [12, '12 h'], [18, '18 h'], [24, '1 day'], [72, '3 days']] },
      { key: 'showEmails', label: 'Recent emails', type: 'toggle', hint: 'Large and full size. Switch off before sharing your screen.' },
    ]);
  },
  unmount() { _nuFlush(); if (_nu.untick) _nu.untick(); _nu.untick = null; _nu.sig = ''; },
});

/* ---------- the data ---------- */
function _nuHorizon(prefs) {
  const h = Math.round(Number(prefs && prefs.horizonH));
  return Number.isFinite(h) && h >= 1 && h <= 72 ? h : 18;
}
/** The meeting under way or next (memoised per minute and calendar version). */
function _nuPick(horizonH) {
  if (typeof homeNextMeetingNow !== 'function') return null;
  return homeMemo('nextup:pick', homeMemoSig({ minute: true, extra: _nuCalSig(horizonH) }), () => homeNextMeetingNow({ horizonH }));
}
/** A cheap fingerprint of the events that could be picked (a calendar write replaces events in place). */
function _nuCalSig(horizonH) {
  const d = typeof CalStore !== 'undefined' && CalStore ? CalStore.data : null;
  const list = d && Array.isArray(d.events) ? d.events : [];
  const now = Date.now(), from = now - 13 * 3600000, to = now + (horizonH + 1) * 3600000;
  let s = String(d && d.fetchedAt) + '#' + list.length + '#' + horizonH;
  for (const e of list) {
    const st = e && e.start ? Date.parse(e.start.dateTime || e.start.date || '') : NaN;
    if (!(st >= from && st <= to)) continue;
    s += '|' + e.id + '@' + (e.start.dateTime || e.start.date) + '-' + (e.end && (e.end.dateTime || e.end.date)) + ':' + (e.attendees ? e.attendees.length : 0) + (e.selfResponse || '') + (e.status || '') + (e.summary || '').length;
  }
  return s;
}
function _nuIso(ms) { return Clock.parts(Number(ms)).iso; }   // the page's day (travel spec 2.7)
function _nuTomorrow() { return Clock.addDays(Clock.today(), 1); }
function _nuDayLabel(ms, long) {
  const L = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  try { return new Date(ms).toLocaleDateString(L, long ? { weekday: 'long' } : { weekday: 'short', day: 'numeric', month: 'short' }); }
  catch (e) { return _nuIso(ms); }
}
function _nuWaiting(t) {
  if (typeof statusOf === 'function' && statusOf(t.id) === 'waiting') return true;
  return typeof pplIsWaiting === 'function' && pplIsWaiting({ title: effTitle(t), tags: typeof effTags === 'function' ? effTags(t) : t.tags });
}
/** The view model of the live meeting (nuModel over the page's data). */
function _nuLiveModel(pick, ctx) {
  const m = pick.meeting;
  const people = {}, loops = {}, contact = {};
  for (const a of m.attendees || []) {
    const p = a.personId && typeof getPerson === 'function' ? getPerson(a.personId) : null;
    if (!p || people[p.id] || Object.keys(people).length >= 14) continue;
    people[p.id] = { id: p.id, name: p.name, color: p.color, avatarUrl: p.avatarUrl, notes: p.notes,
      emails: typeof pplPersonEmails === 'function' ? pplPersonEmails(p) : [p.email].filter(Boolean), streams: p.streams };
    try {
      loops[p.id] = (typeof tasksForPerson === 'function' ? tasksForPerson(p.id, { open: true }) : []).slice(0, 60)
        .map(t => ({ id: t.id, title: effTitle(t), due: effDate(t) || null, priority: effPriority(t), waiting: _nuWaiting(t) }));
    } catch (e) { loops[p.id] = []; }
    try { const c = typeof personLastContact === 'function' ? personLastContact(p.id) : null; if (c && c.label) contact[p.id] = c.label; } catch (e) { /* no contact yet */ }
  }
  const raw = state.eventMeta && typeof state.eventMeta === 'object' ? state.eventMeta[m.id] : null;
  const tasks = (raw && Array.isArray(raw.tasks) ? raw.tasks : []).map(id => (typeof getItem === 'function' ? getItem(id) : null)).filter(Boolean)
    .map(t => ({ id: t.id, title: effTitle(t), done: statusOf(t.id) === 'done', due: effDate(t) || null, stream: t.stream || null }));
  let stream = (tasks.find(t => t.stream && typeof STREAMS !== 'undefined' && STREAMS[t.stream]) || {}).stream || null;
  if (!stream) for (const p of Object.values(people)) { const s = (p.streams || []).find(x => typeof STREAMS !== 'undefined' && STREAMS[x] && !STREAMS[x].archived); if (s) { stream = s; break; } }
  const wh = typeof homeWorkHours === 'function' ? homeWorkHours() : null;
  return nuModel({
    meeting: m, current: pick.current, inMin: pick.inMin, nowMs: Date.now(), today: todayStr(), tomorrow: _nuTomorrow(),
    dayLabel: _nuDayLabel(m.start), weekday: _nuDayLabel(m.start, true), people, loops, contact,
    meta: { notes: raw && raw.notes, notesBy: raw && raw.notesBy, tasks },
    me: typeof userName === 'function' ? userName().split(/\s+/)[0] : '', workDays: wh && wh.days, stream,
    maxRows: _NU_ROWS[ctx.size] || 0, maxAvatars: ctx.size === 's' ? 4 : 6,
  });
}
/** Gallery preview: a synthetic meeting (generic names only). */
function _nuSample(kit) {
  const start = Math.ceil((Date.now() + 42 * 60000) / 300000) * 300000, end = start + 60 * 60000;
  const at = Clock.parts(Number(start)), to = Clock.parts(Number(end));
  const date = _nuIso(start);
  const ppl = {};
  for (const p of kit.people || []) ppl[p.id] = Object.assign({}, p, { emails: [p.email], notes: [] });
  const meeting = {
    id: 'sample-nextup', title: 'Design review with Acme', start, end, date, minutes: 60,
    startMin: at.h * 60 + at.mi, endMin: _nuIso(end) === date ? to.h * 60 + to.mi : 1440,
    attendees: [
      { email: 'jo@example.com', name: 'Jo Rivera', personId: 'sample-jo', organizer: true, response: 'accepted' },
      { email: 'sam@example.com', name: 'Sam Taylor', personId: 'sample-sam', response: 'accepted' },
      { email: 'lee.park@acme.example', name: '', personId: null, response: 'needsAction' },
    ],
    join: 'https://meet.example.com/abc', location: '',
  };
  return nuModel({
    meeting, current: false, inMin: Math.round((start - Date.now()) / 60000), nowMs: Date.now(), today: kit.today, tomorrow: kit.tomorrow,
    dayLabel: _nuDayLabel(start), weekday: _nuDayLabel(start, true), people: ppl,
    loops: { 'sample-jo': [{ id: 'sample-5', title: 'Prepare slides for Monday', due: kit.tasks[4] && kit.tasks[4].dueDate, priority: 'p1' }],
      'sample-sam': [{ id: 'sample-2', title: 'Waiting on the signed contract', due: null, priority: 'p2', waiting: true }] },
    meta: { notes: '- Walk through the new layout\n- Agree the launch date\n- Who owns the copy?', tasks: [{ id: 'sample-3', title: 'Review the pull request', done: false, due: kit.tomorrow }] },
    me: 'Alex', maxRows: 4, maxAvatars: 6,
  });
}

/* ---------- render ---------- */
function _nuRender(el, ctx) {
  const prefs = ctx.prefs || homePrefs(ctx);
  _nu.horizonH = _nuHorizon(prefs);
  if (ctx.preview) {
    const vm = homeSample('nextup');
    if (!vm) return false;
    el.appendChild(_nuCard(vm, ctx, prefs, { files: [], emails: [] }));
    return true;
  }
  const cal = homeCalStatus(() => { if (typeof state !== 'undefined' && state.view === 'home') homeRerenderWidget(ctx.id); });
  if (cal.off) return false;
  _nuArmTick(ctx);
  if (!cal.ok) {
    if (cal.loading) { _nu.sig = ''; return false; }          // its 'load' repaints Home
    const connected = !!(window.Connections && typeof Connections.has === 'function' && Connections.has('calendar'));
    if (!cal.error && connected) { _nu.sig = ''; return false; }
    el.appendChild(_nuOffCard(ctx, cal));
    _nu.sig = 'off';
    return true;
  }
  const pick = _nuPick(_nu.horizonH);
  _nu.sig = pick ? pick.meeting.id + '|' + (pick.current ? 1 : 0) : '';
  if (!pick) return false;
  const vm = _nuLiveModel(pick, ctx);
  if (!vm) return false;
  vm.ev = pick.meeting.ev;                                   // for its scene (animForEvent)
  const extra = { cal, ev: pick.meeting.ev, files: ctx.size === 'l' || ctx.size === 'full' ? _nuFiles(vm) : [], emails: [] };
  if ((ctx.size === 'l' || ctx.size === 'full') && prefs.showEmails !== false) extra.emails = _nuEmails(vm);
  const card = _nuCard(vm, ctx, prefs, extra);
  el.appendChild(card);
  // Once per entry: faces stagger in on the first paint; a different meeting crossfades once.
  const fresh = ctx.isNew('ev:' + vm.id);
  if (ctx.firstPaint) _nuStagger(card);
  else if (fresh) hglAnim(card.querySelector('.nu-b'), [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 300 });
  if (ctx.size !== 's') {
    homeSuggestSlot(card.querySelector('.nu-b'), ctx, { eventId: vm.id });
    // Whether Gmail drafts work (the ✓ beside Email attendees): asked once, repaints when known.
    if (window.GmailDraft && typeof GmailDraft.info === 'function') {
      homeData('nextup:gmail-drafts', () => GmailDraft.info().then(j => (j ? { fake: !!j.fake } : null)),
        { ctx, maxAge: 10 * 60000, sig: String(typeof _serverAvailable === 'undefined' || !!_serverAvailable) });
    }
  }
  if (typeof animActivate === 'function') requestAnimationFrame(() => { if (card.isConnected) animActivate(card); });
  return true;
}

function _nuOffCard(ctx, cal) {
  const card = document.createElement('section'); card.className = 'card home-card nu nu--off';
  card.appendChild(_nuHead(null, ctx, null));
  const body = document.createElement('div'); body.className = 'card-b nu-b';
  const off = cal.error
    ? ctx.off({ icon: 'calendar', title: 'Couldn’t read the calendar', text: 'Meeting prep will be back once the calendar loads. The rest of Home is fine.',
      action: { label: 'Retry', icon: 'refresh-cw', run: () => { if (typeof CalStore !== 'undefined' && CalStore) CalStore.load(true); } } })
    : ctx.off({ icon: 'calendar', title: 'Connect a calendar to prepare for meetings', text: 'See who you are meeting, what you owe them and the agenda, before every meeting.',
      action: { label: 'Connect', icon: 'plug', run: () => { if (window.Connections && typeof Connections.open === 'function') Connections.open('calendar'); else setView('connections'); } } });
  body.appendChild(off);
  card.appendChild(body);
  return card;
}

/* The minute tick: the pill counts down in place; a meeting starting, ending or coming
   into the horizon repaints. Armed even while the widget is hidden (it stays in the DOM). */
function _nuArmTick(ctx) {
  if (_nu.untick) _nu.untick();
  _nu.untick = homeTick(ctx, () => {
    const pick = typeof homeNextMeetingNow === 'function' ? homeNextMeetingNow({ horizonH: _nu.horizonH }) : null;
    const sig = pick ? pick.meeting.id + '|' + (pick.current ? 1 : 0) : '';
    if (_nu.sig === 'off') return undefined;
    if (sig !== _nu.sig) return 'rerender';
    if (!pick) return undefined;
    const pill = document.querySelector(`#main-body .hg-w[data-wid="${CSS.escape(ctx.id)}"] .nu-when`);
    if (!pill) return undefined;
    const m = pick.meeting;
    const w = nuWhen({ inMin: pick.inMin, current: pick.current, leftMin: Math.max(0, Math.round((m.end - Date.now()) / 60000)),
      dayDiff: nuDaysBetween(todayStr(), m.date), weekday: _nuDayLabel(m.start, true) });
    if (pill.textContent !== w.text) pill.textContent = w.text;
    pill.className = 'nu-when is-' + w.kind;
    return undefined;
  });
}

/* ---------- the card ---------- */
function _nuHead(vm, ctx, cal) {
  const h = document.createElement('div'); h.className = 'card-h nu-h';
  h.innerHTML = `${icon('presentation')}<h3>Meeting prep</h3>${vm && vm.others ? `<span class="n">${esc(vm.others === 1 ? 'with 1 person' : `with ${vm.others} people`)}</span>` : ''}<span class="spacer"></span>`;
  if (cal && cal.ok && (cal.stale || cal.running) && cal.label) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'nu-upd' + (cal.running ? ' is-running' : ''); b.dataset.act = 'refresh';
    b.innerHTML = icon('refresh-cw') + `<span>${esc(cal.running ? 'Updating…' : cal.label)}</span>`;
    b.setAttribute('data-tip', cal.running ? 'Reading your calendars' : 'Read the calendar again');
    b.setAttribute('aria-label', cal.running ? 'Updating the calendar' : `${cal.label}. Read the calendar again`);
    h.appendChild(b);
  }
  return h;
}
function _nuCard(vm, ctx, prefs, extra) {
  const size = ctx.size || 'm';
  const card = document.createElement('section');
  card.className = `card home-card nu nu--${size}` + (vm.current ? ' is-now' : '');
  card.dataset.ev = vm.id;
  card.appendChild(_nuHead(vm, ctx, extra.cal));
  const body = document.createElement('div'); body.className = 'card-b nu-b';
  card.appendChild(body);
  const main = document.createElement('div'); main.className = 'nu-main';
  main.appendChild(_nuTop(vm, size));
  main.appendChild(_nuWho(vm, size));
  if (size !== 's') {
    if (vm.rows.length) main.appendChild(_nuRows(vm));
    if (size !== 'full') main.appendChild(_nuNotes(vm, size));
    if (size === 'l' || size === 'full') {
      if (vm.tasks.length) main.appendChild(_nuTasks(vm));
      if (extra.files.length) main.appendChild(_nuFilesEl(extra.files));
      if (extra.emails.length) main.appendChild(_nuMailsEl(extra.emails));
    }
  }
  if (size === 'full') {
    const cols = document.createElement('div'); cols.className = 'nu-cols';
    const side = document.createElement('div'); side.className = 'nu-side';
    side.appendChild(_nuEditor(vm, extra));
    side.appendChild(_nuActs(vm, size));
    cols.append(main, side);
    body.appendChild(cols);
  } else {
    body.appendChild(main);
    if (size !== 's') body.appendChild(_nuActs(vm, size));
  }
  _nuWire(card, vm, ctx, extra);
  _nuMarkOpen(card);
  return card;
}

function _nuTop(vm, size) {
  const top = document.createElement('div'); top.className = 'nu-top';
  let type = 'meeting';
  try { if (typeof animForEvent === 'function' && vm.ev) type = animForEvent(vm.ev).type || 'meeting'; } catch (e) { /* the meeting scene */ }
  const scene = size !== 's' ? hglScene(type === 'event' ? 'meeting' : type, { size: 'sm' }) : '';
  const when = `${vm.dayText}${vm.timeText ? ' · ' + vm.timeText : ''}`;
  const tid = 'nu-t-' + String(vm.id).replace(/[^\w-]/g, '').slice(0, 40);
  // The pulse keeps its phase across repaints (a negative delay from the clock).
  const phase = vm.current ? ` style="--nu-phase:-${Date.now() % 2400}ms"` : '';
  top.innerHTML = (scene ? `<span class="nu-sc" data-scene-key="nu:${escAttr(vm.id)}">${scene}</span>` : '')
    + `<div class="nu-hd"><h4 class="nu-tt" id="${escAttr(tid)}"><button type="button" class="nu-tt-b" data-act="event" data-tip="Open the event">${esc(vm.title)}</button>`
    + `<span class="sr-only">, ${esc(when)}</span></h4>`
    + `<div class="nu-meta"><time datetime="${escAttr(vm.date)}">${esc(when)}</time><span class="nu-when is-${escAttr(vm.when.kind)}"${phase}>${esc(vm.when.text)}</span></div></div>`;
  return top;
}

function _nuAvatar(r, sz) {
  const p = r.person || { id: r.key, name: r.name };
  return `<span class="nu-av${r.declined ? ' is-declined' : ''}">${homeAvatar(p, sz)}</span>`;
}
function _nuWho(vm, size) {
  const who = document.createElement('div'); who.className = 'nu-who';
  const names = vm.avatars.map(r => r.name).concat(vm.avatarsMore ? [`${vm.avatarsMore} more`] : []);
  who.innerHTML = `<span class="nu-avs" aria-hidden="true">${vm.avatars.map(r => _nuAvatar(r, size === 's' ? 24 : 26)).join('')}`
    + `${vm.avatarsMore ? `<span class="nu-av nu-av-more">+${esc(String(vm.avatarsMore))}</span>` : ''}</span>`
    + `<span class="sr-only">With ${esc(names.join(', '))}</span>`
    + (size === 's' ? `<span class="nu-names" aria-hidden="true">${esc(vm.names)}</span>` : '')
    + '<span class="spacer"></span>';
  const link = vm.join && typeof safeUrl === 'function' ? safeUrl(vm.join) : '';
  if (link) {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.act = 'join';
    b.className = 'btn btn-sm nu-join ' + (vm.current || vm.when.kind === 'soon' ? 'btn-primary' : 'btn-secondary');
    b.innerHTML = icon('video') + '<span>Join</span>';
    b.setAttribute('aria-label', `Join ${vm.title} call`);
    b.setAttribute('data-tip', 'Opens the call in a new tab');
    who.appendChild(b);
  } else if (vm.location) {
    const c = document.createElement('span'); c.className = 'chip nu-loc'; c.title = vm.location;
    c.innerHTML = icon('map-pin', 'i-xs') + `<span>${esc(vm.location)}</span>`;
    who.appendChild(c);
  }
  return who;
}

function _nuRows(vm) {
  const wrap = document.createElement('div'); wrap.className = 'nu-ppl';
  const ul = document.createElement('ul'); ul.className = 'nu-rows'; ul.setAttribute('aria-label', 'Who is coming');
  for (const r of vm.rows) {
    const li = document.createElement('li');
    const kind = r.line ? r.line.kind : 'unknown';
    li.className = `nu-row is-${kind}` + (r.declined ? ' is-declined' : '') + (r.unknown ? ' is-unknown' : '');
    li.dataset.flip = 'nu:' + r.key;
    if (r.line && r.line.taskId) li.dataset.id = r.line.taskId;
    const tags = (r.organizer ? '<span class="nu-tag">Organiser</span>' : '') + (r.declined ? '<span class="nu-tag is-no">Declined</span>' : '') + (r.optional && !r.declined ? '<span class="nu-tag">Optional</span>' : '');
    const nameHtml = r.personId
      ? `<button type="button" class="nu-name" data-act="person" data-pid="${escAttr(r.personId)}" data-tip="Open ${escAttr(r.name)}">${esc(r.name)}</button>`
      : `<span class="nu-name is-plain">${esc(r.name)}</span>`;
    let line = '';
    if (r.line && r.line.taskId) {
      const late = r.line.late ? `<span class="nu-late">${esc(r.line.lateDays === 1 ? '1 day late' : r.line.lateDays + ' days late')}</span>` : '';
      const more = r.line.more ? `<span class="nu-more" title="${escAttr(r.line.more + ' more open with ' + r.name)}">+${esc(String(r.line.more))}</span>` : '';
      line = `<button type="button" class="nu-loop" data-act="task" data-id="${escAttr(r.line.taskId)}">${icon(r.line.kind === 'waiting' ? 'hourglass' : 'corner-down-left', 'i-xs')}<span class="nu-loop-t">${esc(r.line.text)}</span></button>${late}${more}`;
    } else if (r.line) {
      line = `<span class="nu-quiet">${esc(r.line.text)}</span>`;
    } else if (r.email) {
      line = `<span class="nu-quiet nu-addr">${esc(r.email)}</span>`;
    }
    li.innerHTML = _nuAvatar(r, 24) + `<div class="nu-row-b"><div class="nu-row-n">${nameHtml}${tags}</div><div class="nu-row-l">${line}</div></div>`;
    if (r.unknown && r.email && !r.declined) {
      const split = document.createElement('span'); split.className = 'nu-split';
      split.innerHTML = `<button type="button" class="btn btn-secondary btn-xs nu-add-p" data-act="person-add" data-key="${escAttr(r.key)}" data-tip="Opens Add person, filled in">${icon('user-plus', 'i-xs')}<span>Add person</span></button>`
        + `<button type="button" class="btn btn-secondary btn-xs nu-ok" data-act="person-add-now" data-key="${escAttr(r.key)}" aria-label="Add ${escAttr(r.name)} to People now" data-tip="Add now · Undo">${icon('check')}</button>`;
      li.appendChild(split);
    }
    ul.appendChild(li);
  }
  wrap.appendChild(ul);
  if (vm.rowsMore) {
    const m = document.createElement('button'); m.type = 'button'; m.className = 'nu-rows-more'; m.dataset.act = 'event';
    m.innerHTML = `<span>+${esc(String(vm.rowsMore))} more in the event</span>${icon('arrow-right', 'i-xs')}`;
    wrap.appendChild(m);
  }
  return wrap;
}

function _nuNotes(vm, size) {
  const box = document.createElement('div'); box.className = 'nu-notes';
  const pv = nuNotesPreview(vm.notes, size === 'l' ? 6 : 4);
  const head = `<div class="nu-sec"><span>Agenda</span>${pv.more ? `<button type="button" class="nu-sec-a" data-act="event">+${esc(String(pv.more))} more</button>` : ''}</div>`;
  const body = pv.lines.length
    ? `<div class="nu-md">${typeof renderMarkdown === 'function' ? renderMarkdown(pv.lines.join('\n')) : pv.lines.map(l => `<p>${esc(l)}</p>`).join('')}</div>`
    : '';
  box.innerHTML = head + body;
  const lab = document.createElement('label'); lab.className = 'nu-add';
  lab.innerHTML = `${icon('plus', 'i-xs')}<span class="sr-only">Add an agenda point to ${esc(vm.title)}</span>`;
  const inp = document.createElement('input'); inp.type = 'text'; inp.className = 'nu-add-i'; inp.dataset.fk = 'nu-agenda'; inp.maxLength = 300;
  inp.placeholder = pv.lines.length ? 'Add an agenda point' : 'Add the first agenda point';
  inp.setAttribute('enterkeyhint', 'done');
  lab.appendChild(inp);
  box.appendChild(lab);
  return box;
}

function _nuTasks(vm) {
  const box = document.createElement('div'); box.className = 'nu-block nu-tasks-b';
  box.innerHTML = `<div class="nu-sec"><span>Linked tasks</span><span class="nu-n">${esc(String(vm.tasks.filter(t => !t.done).length))} open</span></div>`;
  const ul = document.createElement('ul'); ul.className = 'nu-tasks';
  for (const t of vm.tasks.slice(0, 6)) {
    const li = document.createElement('li'); li.className = 'nu-task hgl-row' + (t.done ? ' is-done' : ''); li.dataset.id = t.id; li.dataset.flip = 'nu:t:' + t.id;
    li.innerHTML = `<button type="button" class="nu-cbx${t.done ? ' on' : ''}" role="checkbox" aria-checked="${t.done ? 'true' : 'false'}" data-act="tick" data-id="${escAttr(t.id)}" aria-label="${escAttr((t.done ? 'Not done: ' : 'Done: ') + t.title)}">${icon('check')}</button>`
      + `<button type="button" class="nu-task-t" data-act="task" data-id="${escAttr(t.id)}">${esc(t.title)}</button>`
      + (t.due ? `<span class="nu-due">${esc(typeof dueLabel === 'function' ? dueLabel(t.due) : t.due)}</span>` : '');
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}

function _nuFiles(vm) {
  if (typeof resFor !== 'function') return [];
  const seen = new Set(), out = [];
  for (const t of vm.tasks) {
    for (const r of resFor('task', t.id) || []) { if (r && !seen.has(r.id)) { seen.add(r.id); out.push({ r, taskId: t.id }); } }
  }
  return out.slice(0, 6);
}
function _nuFilesEl(files) {
  const box = document.createElement('div'); box.className = 'nu-block';
  box.innerHTML = `<div class="nu-sec"><span>Files</span></div>`;
  const row = document.createElement('div'); row.className = 'nu-files';
  for (const f of files) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip nu-file'; b.dataset.act = 'file'; b.dataset.rid = f.r.id; b.dataset.id = f.taskId;
    const label = typeof rsrcDisplayLabel === 'function' ? rsrcDisplayLabel(f.r) : (f.r.label || f.r.target || '');
    b.innerHTML = (typeof _resIconHtml === 'function' ? _resIconHtml(f.r) : icon('file')) + `<span>${esc(label)}</span>`;
    b.title = label;
    row.appendChild(b);
  }
  box.appendChild(row);
  return box;
}

function _nuEmails(vm) {
  if (typeof recentEmailsFor !== 'function') return [];
  const out = [], seen = new Set();
  for (const r of vm.rows.filter(x => x.personId).slice(0, 4)) {
    const p = typeof getPerson === 'function' ? getPerson(r.personId) : null;
    let list = [];
    try { list = recentEmailsFor(p, 2) || []; } catch (e) { list = []; }
    for (const m of list) if (m && m.id && !seen.has(m.id)) { seen.add(m.id); out.push({ m, who: r.name }); }
  }
  return out.sort((a, b) => (Date.parse(b.m.date || '') || 0) - (Date.parse(a.m.date || '') || 0)).slice(0, 4);
}
function _nuMailsEl(emails) {
  const box = document.createElement('div'); box.className = 'nu-block';
  box.innerHTML = `<div class="nu-sec"><span>Recent emails</span></div>`;
  const ul = document.createElement('ul'); ul.className = 'nu-mails';
  for (const e of emails) {
    const li = document.createElement('li');
    const link = typeof _emLink === 'function' ? _emLink(e.m) : '';
    const when = typeof _emDate === 'function' ? _emDate(e.m.date) : '';
    li.innerHTML = `<button type="button" class="nu-mail" data-act="mail" data-link="${escAttr(link)}"${link ? '' : ' disabled'}>${icon('mail', 'i-xs')}`
      + `<span class="nu-mail-s">${esc(e.m.subject || '(no subject)')}</span><span class="nu-mail-w">${esc(e.who)}${when ? ' · ' + esc(when) : ''}</span></button>`;
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}

/* The Full size's notes: the whole agenda, saved 800 ms after typing stops. */
function _nuEditor(vm, extra) {
  const box = document.createElement('div'); box.className = 'nu-ed';
  const ai = !!(window.Connections && typeof Connections.has === 'function' ? Connections.has('claude') : (typeof AI_AVAILABLE !== 'undefined' && AI_AVAILABLE));
  box.innerHTML = `<div class="nu-sec"><span>Agenda &amp; notes</span><span class="nu-saved" aria-live="polite"></span>`
    + `<button type="button" class="btn btn-ghost btn-xs nu-draft" data-act="draft" data-requires="claude"${ai ? '' : ' data-requires-hint="Connect Claude to draft an agenda from your open tasks with these people"'}>${icon('sparkles', 'i-xs')}<span>Draft with Claude</span></button></div>`;
  const e = _nu.edit;
  let text = vm.notes;
  if (e && e.evId === vm.id) { if (e.dirty || e.saved === vm.notes) text = e.text; else _nu.edit = null; }
  else if (e) { _nuFlush(); _nu.edit = null; }
  const ta = document.createElement('textarea'); ta.className = 'nu-ta'; ta.dataset.fk = 'nu-notes'; ta.maxLength = 4000; ta.rows = 8;
  ta.setAttribute('aria-label', `Agenda and notes for ${vm.title}`);
  ta.placeholder = 'Agenda, questions, notes… (kept in this dashboard, not in Google)';
  ta.value = text;
  box.appendChild(ta);
  if (vm.notesBy) box.insertAdjacentHTML('beforeend', `<p class="nu-by">${icon('sparkles', 'i-xs')}<span>${esc(vm.notesBy)}</span></p>`);
  const remember = () => { const x = _nu.edit; if (x && x.evId === vm.id) x.sel = [ta.selectionStart, ta.selectionEnd]; };
  ta.addEventListener('input', () => {
    const x = _nu.edit && _nu.edit.evId === vm.id ? _nu.edit : (_nu.edit = { evId: vm.id, base: vm.notes, saved: vm.notes, text: vm.notes, dirty: false, sel: null });
    x.text = ta.value; x.dirty = true; remember();
    const s = box.querySelector('.nu-saved'); if (s) s.textContent = '';
    clearTimeout(_nu.timer);
    _nu.timer = setTimeout(_nuFlush, _NU_SAVE_MS);
  });
  ta.addEventListener('keyup', remember);
  ta.addEventListener('mouseup', remember);
  ta.addEventListener('blur', () => { _nuFlush(); });
  ta.addEventListener('focus', () => {
    const x = _nu.edit;
    if (x && x.evId === vm.id && Array.isArray(x.sel)) { try { ta.setSelectionRange(x.sel[0], x.sel[1]); } catch (err) { /* not a text field */ } }
  });
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(420, Math.max(120, ta.scrollHeight + 2)) + 'px'; };
  ta.addEventListener('input', fit);
  requestAnimationFrame(fit);
  return box;
}
/** Save the Full editor's notes now (one undo step); the editor stays as it is. */
function _nuFlush() {
  clearTimeout(_nu.timer); _nu.timer = 0;
  const x = _nu.edit;
  if (!x || !x.dirty) return;
  x.dirty = false;
  const v = String(x.text || '').slice(0, 4000).trim();
  if (v === (x.saved || '')) return;
  if (typeof calAnnotate !== 'function' || !calAnnotate(x.evId, { notes: v || null }, { toast: false, render: false })) return;
  x.saved = v;
  const s = document.querySelector('#main-body .nu-ed .nu-saved');
  if (!s) return;
  s.textContent = '';
  s.append(Object.assign(document.createElement('span'), { textContent: 'Saved' }));
  const u = document.createElement('button'); u.type = 'button'; u.className = 'nu-undo'; u.textContent = 'Undo';
  u.setAttribute('aria-label', 'Undo the notes changes');
  u.onclick = () => {
    const base = x.base || '';
    _nu.edit = null;
    calAnnotate(x.evId, { notes: base || null }, { toast: false });
    toast('Notes put back', { icon: 'undo-2' });
  };
  s.appendChild(u);
}

function _nuActs(vm, size) {
  const row = document.createElement('div'); row.className = 'nu-acts';
  // Follow-up: the task card prefilled (main) + ✓ now; done once the event has one.
  if (vm.followUp) {
    row.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-ghost btn-sm nu-done" data-act="followup-done" aria-disabled="true" data-tip="${escAttr(vm.followUp.title)}">${icon('circle-check')}<span>Follow-up added</span></button>`);
  } else {
    row.insertAdjacentHTML('beforeend', `<span class="nu-split"><button type="button" class="btn btn-secondary btn-sm" data-act="followup" data-tip="Opens a new task, filled in: Save adds it">${icon('list-todo')}<span>Follow-up task</span></button>`
      + `<button type="button" class="btn btn-secondary btn-sm nu-ok" data-act="followup-now" aria-label="Add the follow-up task now: ${escAttr(vm.follow.title)}" data-tip="Add it now · Undo">${icon('check')}</button></span>`);
  }
  // Email the attendees: the draft editor prefilled (never sent) + ✓ draft now.
  const drafted = _nu.drafted.get(vm.id);
  if (drafted) {
    row.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-ghost btn-sm nu-done" data-act="noop" aria-disabled="true">${icon('mail-check')}<span>Draft in Gmail</span></button>`);
  } else if (vm.mail.all.length) {
    const gmail = _nuGmailOk() && vm.mail.to.length;
    row.insertAdjacentHTML('beforeend', `<span class="nu-split"><button type="button" class="btn btn-secondary btn-sm" data-act="email" data-tip="${gmail ? 'Opens a Gmail draft, filled in: nothing is sent' : 'Opens your mail app with a draft: nothing is sent'}">${icon('mail')}<span>Email attendees</span></button>`
      + (gmail ? `<button type="button" class="btn btn-secondary btn-sm nu-ok" data-act="email-now" aria-label="Save the email to the attendees as a Gmail draft now" data-tip="Save the draft now · Undo">${icon('check')}</button>` : '') + '</span>');
  }
  row.insertAdjacentHTML('beforeend', `<button type="button" class="btn btn-ghost btn-sm nu-open" data-act="event">${icon('calendar-clock')}<span>${size === 'm' ? 'Open' : 'Open event'}</span></button>`);
  return row;
}
function _nuGmailOk() {
  const G = window.GmailDraft;
  try { return !!(G && typeof G.openEditor === 'function' && (typeof G.available !== 'function' || G.available())); } catch (e) { return false; }
}

/* ---------- motion ---------- */
function _nuStagger(card) {
  const avs = [...card.querySelectorAll('.nu-avs > .nu-av')].slice(0, 6);
  avs.forEach((a, i) => hglAnim(a, [{ opacity: 0, transform: 'translateY(4px) scale(0.85)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 140 + i * 40 }));
}

/* ---------- what is open (the current item is highlighted) ---------- */
function _nuTcCur() {
  try { return typeof _tc !== 'undefined' && _tc && !_tc.closing && typeof _tcCur === 'function' ? _tcCur() : null; } catch (e) { return null; }
}
function _nuMarkOpen(card) {
  const cur = _nuTcCur();
  const evOpen = !!(cur && cur.kind === 'event' && cur.id === card.dataset.ev);
  for (const b of card.querySelectorAll('[data-act="event"].nu-tt-b, .nu-open')) { if (evOpen) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }
  const tid = cur && cur.kind === 'task' ? cur.id : '';
  for (const el of card.querySelectorAll('.nu-row[data-id], .nu-task[data-id]')) { if (tid && el.dataset.id === tid) el.setAttribute('aria-current', 'true'); else el.removeAttribute('aria-current'); }
}

/* ---------- clicks ---------- */
function _nuWire(card, vm, ctx, extra) {
  if (ctx.preview) return;
  card.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !card.contains(b) || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'event') { _nuOpenEvent(vm, b, card); return; }
    if (act === 'join') { const u = typeof safeUrl === 'function' ? safeUrl(vm.join) : ''; if (u) window.open(u, '_blank', 'noopener'); return; }
    if (act === 'person') { if (typeof hglOpenPerson === 'function') hglOpenPerson(b.dataset.pid); return; }
    if (act === 'task') { _nuOpenTask(ctx, b.dataset.id, b.closest('.nu-row, .nu-task') || b, b, card); return; }
    if (act === 'tick') { if (typeof toggleDone === 'function') toggleDone(b.dataset.id); return; }
    if (act === 'file') { if (typeof resPrimary === 'function') resPrimary(b.dataset.rid, { type: 'task', id: b.dataset.id }); return; }
    if (act === 'mail') { const u = typeof safeUrl === 'function' ? safeUrl(b.dataset.link) : ''; if (u) window.open(u, '_blank', 'noopener'); return; }
    if (act === 'refresh') { _nuRefresh(b); return; }
    if (act === 'followup') { _nuFollowOpen(vm, b); return; }
    if (act === 'followup-now') { _nuFollowNow(vm, b); return; }
    if (act === 'email') { _nuEmailOpen(vm, b); return; }
    if (act === 'email-now') { _nuEmailNow(vm, b); return; }
    if (act === 'person-add') { _nuPersonOpen(vm, b.dataset.key); return; }
    if (act === 'person-add-now') { _nuPersonNow(vm, b.dataset.key, b); return; }
    if (act === 'draft') { _nuDraftAgenda(vm, extra, b); return; }
    // 'noop' / 'followup-done': already done; a click does nothing.
  });
  const inp = card.querySelector('.nu-add-i');
  if (inp) {
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      const line = nuAgendaLine(inp.value);
      if (!line) return;                                   // nothing typed: nothing happens
      inp.value = '';
      if (typeof calAnnotate === 'function') calAnnotate(vm.id, { appendNotes: line });
    });
  }
  // The task card hands focus back when it closes: drop the highlight then.
  card.addEventListener('focusin', () => _nuMarkOpen(card));
}
function _nuOpenEvent(vm, from, card) {
  if (typeof openEvent !== 'function') return;
  openEvent(vm.id, { from });                              // already open: a no-op (61-task-card.js)
  _nuMarkOpen(card);
}
function _nuOpenTask(ctx, id, row, from, card) {
  if (!id) return;
  const cur = _nuTcCur();
  if (cur && cur.kind === 'task' && cur.id === id) return;           // already open: a no-op
  if (ctx && typeof ctx.openTask === 'function') ctx.openTask(id, from);
  else if (typeof homeOpenTask === 'function') homeOpenTask(id, from);
  _nuMarkOpen(card);
}
function _nuRefresh(btn) {
  const s = typeof CalStore !== 'undefined' ? CalStore : null;
  if (!s || (typeof s.running === 'function' && s.running())) return;     // already updating: a no-op
  btn.classList.add('is-running');
  const t = btn.querySelector('span'); if (t) t.textContent = 'Updating…';
  if (typeof s.update === 'function') s.update({ force: true });
}

/* Follow-up: the task card prefilled; Save adds it and links it to the event (one undo step). */
function _nuFollowOpen(vm, btn) {
  const cur = _nuTcCur();
  // Pressed again while its card is open: a no-op (the user's edits stay); back to the card.
  if (cur && cur.kind === 'create' && cur.draft && _nu.followKey && cur.draft.key === _nu.followKey) { if (typeof _tcFocusStart === 'function') _tcFocusStart(); return; }
  if (typeof tcOpenCreate !== 'function') return;
  const f = vm.follow;
  tcOpenCreate({ title: f.title, date: f.due, people: f.people, stream: f.stream || undefined, detail: f.detail, eventId: vm.id }, { from: btn });
  const now = _nuTcCur();
  _nu.followKey = now && now.kind === 'create' && now.draft ? now.draft.key : '';
}
/** ✓: the follow-up task now, linked to the event; one undo step. */
function _nuFollowNow(vm, btn) {
  const f = vm.follow;
  return homeAction(btn, () => {
    let id = null;
    selUndoGroup(() => {
      id = addCustomTask(f.title, f.due, 'p0', [], f.stream || null, 'none', { people: f.people, detail: f.detail });
      if (id) calAnnotate(vm.id, { linkTasks: [id] }, { toast: false });
    });
    if (!id) return false;
    toast(`Follow-up added for ${typeof dueLabel === 'function' ? dueLabel(f.due) : f.due}`, { kind: 'ok', icon: 'list-todo', action: { label: 'Undo', run: () => undo() } });
    return id;
  }, { say: 'Follow-up task added' });
}

/* Email the attendees: the Gmail draft editor prefilled (Save = a draft, never sent). */
function _nuMailPrefill(vm) {
  return { to: vm.mail.to, cc: vm.mail.cc, subject: vm.mail.subject, body: vm.mail.body, purpose: 'note' };
}
async function _nuEmailOpen(vm, btn) {
  const G = window.GmailDraft;
  if (_nu.opening) return;                                   // a double click opens one editor
  _nu.opening = true;
  try { if (G && typeof G.info === 'function') await G.info(); } catch (e) { /* the editor says why */ }
  finally { setTimeout(() => { _nu.opening = false; }, 400); }
  if (_nuGmailOk() && vm.mail.to.length) {
    window.GmailDraft.openEditor(_nuMailPrefill(vm), {
      title: 'Email the attendees',
      onSaved: (res) => { if (res && res.draftId) { _nu.drafted.set(vm.id, res.draftId); homeRerenderWidget('nextup'); } },
      onUndone: () => { _nu.drafted.delete(vm.id); if (typeof state !== 'undefined' && state.view === 'home') homeRerenderWidget('nextup'); },
    });
    return;
  }
  const url = nuMailtoUrl(vm.mail.all, vm.mail.subject, vm.mail.body);
  if (url && typeof hglOpenMail === 'function') hglOpenMail(url);
  else toast('There is no email address to write to.', { kind: 'err' });
}
/** ✓: the draft saved in Gmail as it is (the receipt's Undo deletes it). */
function _nuEmailNow(vm, btn) {
  if (!_nuGmailOk() || !vm.mail.to.length) return;
  return homeAction(btn, async () => {
    const r = await window.GmailDraft.quick(_nuMailPrefill(vm), {
      quiet: true,
      onUndone: () => { _nu.drafted.delete(vm.id); if (typeof state !== 'undefined' && state.view === 'home') homeRerenderWidget('nextup'); },
    });
    if (!r || !r.ok) throw new Error((r && r.message) || 'The draft could not be saved.');
    _nu.drafted.set(vm.id, r.draftId || true);
    homeRerenderWidget('nextup');
    return r;
  }, { say: 'Draft saved in Gmail, not sent' });
}

/* Add person: the person editor prefilled; ✓ adds them at once (Undo). */
function _nuRowByKey(vm, key) { return vm.rows.find(r => r.key === key) || null; }
function _nuPersonOpen(vm, key) {
  const r = _nuRowByKey(vm, key);
  if (!r || typeof openPersonEditor !== 'function') return;
  openPersonEditor(null, { name: r.name, email: r.email, emails: [r.email] });
}
function _nuPersonNow(vm, key, btn) {
  const r = _nuRowByKey(vm, key);
  if (!r || typeof createPerson !== 'function') return;
  return homeAction(btn, () => {
    const res = createPerson({ name: r.name, emails: r.email ? [r.email] : [] });
    if (!res || res.error) throw new Error((res && res.error) || 'Could not add them.');
    render();
    toast(`Added ${r.name} to People`, { kind: 'ok', icon: 'user-check', action: { label: 'Undo', run: () => undo() } });
    return res.id;
  }, { say: `Added ${r.name} to People` });
}

/* Draft with Claude (Full): calDraftAgenda adds a drafted agenda to the notes; Undo puts them back. */
async function _nuDraftAgenda(vm, extra, btn) {
  if (btn.getAttribute('aria-busy') === 'true' || btn.classList.contains('is-busy')) return;
  if (typeof calDraftAgenda !== 'function' || !extra.ev) return;
  _nuFlush();
  _nu.edit = null;
  const before = (state.eventMeta && state.eventMeta[vm.id] && state.eventMeta[vm.id].notes) || '';
  btn.setAttribute('aria-busy', 'true');
  try { await calDraftAgenda(extra.ev, btn); }
  finally { btn.removeAttribute('aria-busy'); }
  const after = (state.eventMeta && state.eventMeta[vm.id] && state.eventMeta[vm.id].notes) || '';
  if (after !== before) {
    toast('Agenda drafted into the notes', { kind: 'ok', icon: 'sparkles', action: { label: 'Undo', run: () => calAnnotate(vm.id, { notes: before || null }, { toast: false }) } });
  }
}
