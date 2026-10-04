/* ============================================================
   HOME widget "calcheck": Invites & clashes (WIDGETS_CATALOGUE.md 3.6).
   OWNER: the "calcheck" widget builder. Rules (pure, tested in a VM):
   12-home-calcheck-logic.js (homeCalProblems). Styles: 13-home-w-calcheck.css.
   Tests: tests/home-w-calcheck.test.mjs.

   The job: catch calendar problems before they hurt. Over the next 14 days
   (Settings: 7 / 14 / 30): invitations to answer (Maybe listed lower), two
   events that clash, 3 h+ back to back (today, tomorrow), meetings in the next
   24 h with no place or call link, and (only when working hours are set)
   meetings outside working hours. A copy of one event on two calendars is one
   event; a repeating invitation or a weekly clash is one row ("+1 more").
   Only the user's own events count: their calendars (config.myEmails, the
   primary, their own group calendars) or an invitation to their address;
   someone else's calendar that is switched on is left out.

   Sizes: S "2 to answer · 1 clash" (most severe first) plus the nearest item;
   M rows grouped by kind (day and time, calendar colour, a text badge); L the
   same plus a two-lane timeline for each clash and the organiser and guests of
   each invitation. Nothing to fix: hidden (emptyHint). No calendar: the greyed
   Connect state. Data older than 6 h: "Updated 07:02" in the header (click =
   read the calendar again).

   Actions (the user's rule, 3 Oct: a one-click recommendation opens the NORMAL
   editor prefilled; a small check applies it as it is, with Undo):
     row            the event (the centre card); the row is aria-current while
                    it is open, and clicking it again does nothing
     Going / Maybe / Can't   an invitation's answer, only through CalWrite.rsvp
                    after confirmDialog ("This tells the organiser"); CalWrite's
                    toast offers Undo (answer again) when there was an earlier
                    answer. Only the user's own invitations (CalWrite.canRsvp);
                    otherwise "Answer in Google". The current answer is pressed.
     Task           "Reply to invitation: <title>", due the day before: opens the
                    task card PREFILLED (linked to the event); its check adds it at
                    once (one undo step: the task and the link) with Undo. Once a
                    reply task exists: "Task added" (a re-click does nothing).
     Ask for the link   (no place or link, someone else organises it) opens the
                    Gmail DRAFT editor prefilled to the organiser (never sends);
                    its check saves the draft as it is (Undo deletes it). Not in
                    People: the mail app (mailto). The user's own meeting: "Add a
                    link" opens the event card.
     It's fine      hides that problem until its event ends (widgetPrefs
                    .calcheck.dismissed[key] = end ms; one undo step + Undo); the
                    row glides out and focus moves to the next row.
     "…"            Open in Google; a clash's "Decline <one>…" (confirm, CalWrite).
   Keys on a focused row: Enter open, X It's fine, Up/Down move.
   Motion: rows rise in once on first paint (the clash timelines grow), new rows
   once later (ctx.enterNew), dismissed rows glide out; reduced motion: none.
   ============================================================ */
let _cckAll = false;          // "+N more" opened (until Home is left)
let _cckCalTick = 0;          // bumped by CalWrite changes (optimistic): the model's memo key
let _cckSubbed = false;
let _cckFocusKey = null;      // the row to focus after the next paint (after "It's fine")
let _cckGmdAsked = false;     // GmailDraft.info() asked once (drafts possible?)
let _cckWriteOk = null;       // can the calendar be written (one answer per paint)
const _CCK_HEAD = { reply: 'To answer', clash: 'Clashes', b2b: 'Back to back', link: 'No place or call link', hours: 'Outside working hours', maybe: 'You said maybe' };
const _CCK_BADGE = { reply: 'Invite', clash: 'Clash', b2b: 'Back to back', link: 'No link', hours: 'Out of hours', maybe: 'Maybe' };
const _CCK_RSVP = [['accepted', 'Going', 'check'], ['tentative', 'Maybe', 'circle-help'], ['declined', 'Can’t', 'x']];

registerHomeWidget({
  id: 'calcheck', title: 'Invites & clashes', icon: 'calendar-clock', order: 150, group: 'time', gate: 'calendar',
  description: 'Invitations to answer and events that clash',
  emptyHint: 'Appears when an invitation needs an answer or two events clash',
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['invites', 'invitations', 'clashes', 'conflicts', 'calendar check', 'rsvp', 'double bookings'],
  defaults: { checks: { reply: true, clash: true, b2b: true, link: true, hours: true }, days: 14, dismissed: {} },
  available: () => true,
  sample: (kit) => _cckSample(kit),
  render(el, ctx) { return _cckRender(el, ctx || {}); },
  settings(anchor, ctx) { _cckSettings(anchor, ctx); },
  unmount() { _cckAll = false; _cckFocusKey = null; },
});

/* ---------- the user's calendars and the model ---------- */
function _cckLow(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
function _cckRawCalendars() { return typeof CalStore !== 'undefined' && CalStore && CalStore.data && Array.isArray(CalStore.data.calendars) ? CalStore.data.calendars : []; }
/** The user's addresses: config.myEmails and the primary calendar. */
function _cckMyEmails() {
  const out = new Set(((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.myEmails) || []).map(_cckLow).filter(Boolean));
  const p = _cckRawCalendars().find(c => c && c.primary);
  if (p && p.id) out.add(_cckLow(p.id));
  return [...out];
}
/** The user's own calendars: the primary, their addresses, ones they own, and group calendars when access is not known. */
function _cckMyCalendars(mine) {
  const out = [];
  for (const c of _cckRawCalendars()) {
    const id = _cckLow(c && c.id);
    if (!id) continue;
    if (c.primary || mine.includes(id) || c.accessRole === 'owner') out.push(id);
    else if (!c.accessRole && /@group\.calendar\.google\.com$/.test(id)) out.push(id);
  }
  return out;
}
function _cckEvents() {
  if (typeof calAllEvents !== 'function') return [];
  return calAllEvents().filter(ev => ev && ev.status !== 'cancelled' && (typeof calEventVisible !== 'function' || calEventVisible(ev)));
}
function _cckWorkHours() {
  try { const w = typeof homeWorkHours === 'function' ? homeWorkHours() : null; return w && w.custom ? { startMin: w.startMin, endMin: w.endMin, days: w.days } : null; } catch (e) { return null; }
}
function _cckModel(prefs) {
  const evs = _cckEvents();
  const d = typeof CalStore !== 'undefined' && CalStore && CalStore.data ? CalStore.data : {};
  const hidden = typeof calPrefs === 'function' ? calPrefs().hidden : null;
  const sig = homeMemoSig({ minute: true, extra: [d.fetchedAt || '', evs.length, _cckCalTick, prefs, hidden, (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.workHours) || null] });
  return homeMemo('calcheck:model', sig, () => {
    const mine = _cckMyEmails();
    return homeCalProblems(evs, { now: Date.now(), days: prefs.days, myEmails: mine, myCalendars: _cckMyCalendars(mine), workHours: _cckWorkHours(), checks: prefs.checks, dismissed: prefs.dismissed });
  });
}
function _cckSigOf(model) { return model.items.map(i => i.key + (i.more || '') + (i.response || '')).join(','); }

/* ---------- sample content for the gallery (synthetic, relative to now) ---------- */
function _cckSample() {
  const me = 'you@example.com';
  // Wall times on the page's clock (Clock, travel spec 2.7).
  const at = (days, h, m) => new Date(Clock.at(Clock.addDays(Clock.today(), days), h * 60 + (m || 0))).toISOString();
  // the meeting with no link: the next 10:00, 14:00 or 16:00 at least 30 min away (always within 24 h)
  const soon = (() => { const n = Clock.now() + 30 * 60000; for (let d = 0; d < 2; d++) for (const h of [10, 14, 16]) { const x = Clock.at(Clock.addDays(Clock.today(), d), h * 60); if (x > n) return new Date(x); } return new Date(n); })();
  const people = (resp, org) => [{ email: me, self: true, response: resp }, { email: org.email, name: org.name, organizer: true, response: 'accepted' }, { email: 'jo@example.com', name: 'Jo Rivera', response: 'accepted' }];
  const sam = { email: 'sam@example.com', name: 'Sam Taylor' }, alex = { email: 'alex@example.com', name: 'Alex Kim' };
  const e = (id, summary, s, en, resp, org, extra) => Object.assign({ id, summary, calendarId: me, start: { dateTime: s }, end: { dateTime: en }, organizer: org, attendees: people(resp, org), location: 'Room 2', htmlLink: '' }, extra || {});
  return {
    events: [
      e('sample-inv1', 'Reading group', at(1, 16), at(1, 17), 'needsAction', sam),
      e('sample-inv2', 'Quarterly planning', at(3, 10), at(3, 11, 30), 'needsAction', alex, { location: '', conferenceUrl: 'https://meet.example.com/q' }),
      e('sample-a', 'Design review with Acme', at(2, 14), at(2, 15), 'accepted', sam),
      e('sample-b', 'Planning with Sam', at(2, 14, 30), at(2, 15, 30), 'accepted', sam),
      e('sample-c', 'Supplier call', soon.toISOString(), new Date(soon.getTime() + 30 * 60000).toISOString(), 'accepted', alex, { location: '' }),
    ],
    opts: { now: Date.now(), myEmails: [me], myCalendars: [me], days: 14 },
  };
}

/* ---------- small text helpers ---------- */
function _cckLocale() { return (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined; }
// One formatter per locale (toLocale*String builds a new one on every call: slow over many rows).
let _cckFmtKey = null, _cckFmtT = null, _cckFmtD = null;
function _cckFmt() {
  const k = String(_cckLocale() || '') + '|' + JSON.stringify(typeof clockH12Opt === 'function' ? clockH12Opt() : {});
  if (k !== _cckFmtKey || !_cckFmtT) {
    _cckFmtKey = k;
    try { _cckFmtT = new Intl.DateTimeFormat(_cckLocale(), { hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}) }); } catch (e) { _cckFmtT = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', ...(typeof clockH12Opt === 'function' ? clockH12Opt() : {}) }); }
    try { _cckFmtD = new Intl.DateTimeFormat(_cckLocale(), { weekday: 'short', day: 'numeric', month: 'short' }); } catch (e) { _cckFmtD = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); }
  }
  return { t: _cckFmtT, d: _cckFmtD };
}
function _cckTime(ms) { try { return _cckFmt().t.format(new Date(ms)); } catch (e) { return ''; } }
function _cckDate(ms) { try { return _cckFmt().d.format(new Date(ms)); } catch (e) { return fmtDate(new Date(ms)); } }
function _cckDayText(ms) {
  const iso = Clock.parts(Number(ms)).iso, today = todayStr();
  if (iso === today) return 'Today';
  if (iso === Clock.addDays(today, 1)) return 'Tomorrow';
  return _cckDate(ms);
}
function _cckWhen(ms, endMs, allDay) {
  if (allDay) return _cckDayText(ms) + ' · all day';
  return `${_cckDayText(ms)} ${_cckTime(ms)}${endMs ? '–' + _cckTime(endMs) : ''}`;
}
function _cckIn(ms) {
  const m = Math.round((ms - Date.now()) / 60000);
  if (m <= 0) return 'now';
  if (m < 60) return `in ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `in ${h} h` : '';
}
function _cckColor(ev) { try { return typeof calEventColor === 'function' ? calEventColor(ev) : 'blue'; } catch (e) { return 'blue'; } }
function _cckFirst(name, email) {
  const n = String(name || '').replace(/^(dr|prof|professor|mr|mrs|ms|miss|mx)\.?\s+/i, '').trim().split(/\s+/)[0];
  return n || String(email || '').split('@')[0] || 'the organiser';
}
function _cckPersonFor(email) {
  try { if (email && typeof pplIndex === 'function') { const id = pplIndex().email.get(_cckLow(email)); return id || null; } } catch (e) { /* no index */ }
  return null;
}
function _cckOrgText(it) { return it.organizer ? (it.organizer.name || String(it.organizer.email || '').split('@')[0]) : ''; }
function _cckAria(it) {
  const w = _cckWhen(it.start, it.end, it.allDay);
  if (it.kind === 'clash') return `Clash: ${it.a.title} ${_cckTime(it.a.start)}–${_cckTime(it.a.end)} and ${it.b.title} ${_cckTime(it.b.start)}–${_cckTime(it.b.end)}, ${_cckDayText(it.start)}`;
  if (it.kind === 'b2b') return `Back to back: ${cckMinutesText(it.minutes)} of meetings, ${w}`;
  if (it.kind === 'link') return `No place or call link: ${it.title}, ${w}`;
  if (it.kind === 'hours') return `Outside working hours: ${it.title}, ${w}`;
  return `${it.kind === 'maybe' ? 'You said maybe' : 'Invitation'}: ${it.title}, ${w}${it.organizer ? ', from ' + _cckOrgText(it) : ''}`;
}

/* ---------- which event card is open (the current row) ---------- */
function _cckOpenEventId() {
  try {
    if (typeof _tc !== 'undefined' && _tc && !_tc.closing && typeof _tcCur === 'function') { const c = _tcCur(); if (c && c.kind === 'event') return c.id; }
    if (typeof _dpEventId !== 'undefined' && _dpEventId) return _dpEventId;
  } catch (e) { /* no card */ }
  return null;
}
function _cckIds(it) { return it.kind === 'clash' ? [it.a.id, it.b.id] : it.kind === 'b2b' ? it.ids.slice() : [it.id]; }
function _cckOpen(it, row, from, id) {
  const target = id || it.id;
  if (!target) return;
  if (_cckOpenEventId() === target) return;                         // already open: a no-op
  for (const r of document.querySelectorAll('.cck-row[aria-current="true"]')) r.removeAttribute('aria-current');
  if (row) row.setAttribute('aria-current', 'true');
  if (typeof openEvent === 'function') openEvent(target, { from: from || row, context: 'home' });
}

/* ---------- writes ---------- */
function _cckCanRsvp(ev) {
  const W = typeof window !== 'undefined' ? window.CalWrite : null;
  if (!W || typeof W.rsvp !== 'function' || typeof W.canRsvp !== 'function') return false;
  try {
    if (!W.canRsvp(ev).ok) return false;
    // Can the calendar be written at all (asked once per paint; the suggestions engine's answer)?
    if (_cckWriteOk === null) {
      _cckWriteOk = true;
      if (typeof sgCanBlock === 'function') { const c = sgCanBlock(); if (c && (c.reason === 'none' || c.reason === 'connect')) _cckWriteOk = false; }
    }
    if (!_cckWriteOk) return false;
    return true;
  } catch (e) { return false; }
}
/** Answer an invitation: a confirm first (someone is told), then CalWrite (its toast; Undo answers again). */
async function _cckRsvp(btn, it, response, ev) {
  if (!btn || btn.getAttribute('aria-pressed') === 'true' || btn.getAttribute('aria-busy') === 'true') return;
  const target = ev || it.ev;
  const word = { accepted: 'Going', tentative: 'Maybe', declined: 'Can’t go' }[response];
  const org = target === it.ev && it.organizer ? it.organizer : (target && target.organizer ? { name: target.organizer.name || '', email: target.organizer.email || '' } : null);
  const who = org ? (org.name || org.email) : 'the organiser';
  const title = String((target && (target.summary || target.title)) || it.title);
  const ok = await confirmDialog({
    title: `Reply “${word}” to ${title}?`,
    text: `This tells ${who}. You can change your answer later from the event.`,
    confirmLabel: `Send “${word}”`,
  });
  if (!ok || !btn.isConnected) return;
  btn.setAttribute('aria-busy', 'true');
  const row = btn.closest('.cck-row');
  const go = async () => {
    const r = await window.CalWrite.rsvp(target.id, response);
    if (r && r.ok && typeof homeAnnounce === 'function') homeAnnounce(`Replied ${word} to ${title}`);
    if (!r || !r.ok) {
      // Cancelled (CalWrite's "This event / All events") or refused: the row comes back as it was.
      btn.removeAttribute('aria-busy');
      if (typeof homeRerenderWidget === 'function' && state.view === 'home') homeRerenderWidget('calcheck');
    }
  };
  // The answer takes it off the list (Maybe moves it lower): it glides out first, unless
  // CalWrite still has a question to ask (a repeating event: this one or all of them).
  const asks = !!(target && (target.recurringEventId || target.recurring));
  if (row && !asks && response !== 'tentative' && window.Motion && it.kind !== 'clash') { _cckFocusKey = _cckNextKey(row); Motion.collapse(row, go); } else go();
}
function _cckNextKey(row) {
  const rows = [...document.querySelectorAll('#main-body .cck-row[data-key]')];
  const i = rows.indexOf(row);
  const n = rows[i + 1] || rows[i - 1];
  return n ? n.dataset.key : null;
}
/** "It's fine": hidden until its event ends; one undo step with Undo. */
function _cckDismiss(it, row, ctx) {
  if (!it || !ctx || ctx.preview) return;
  const id = ctx.instance || ctx.id;
  const p = homePrefs(id);
  if (Number(p.dismissed && p.dismissed[it.key]) > Date.now()) return;      // already hidden
  const next = cckPruneDismissed(p.dismissed, Date.now(), 39);
  next[it.key] = Math.round(it.until || it.end || Date.now() + 864e5);
  _cckFocusKey = row ? _cckNextKey(row) : null;
  const save = () => {
    if (!homeSetPrefs(id, { dismissed: next }, `Hidden until ${_cckDayText(next[it.key])} ${_cckTime(next[it.key])}`)) { homeRerenderWidget(id); return; }
    if (typeof homeAnnounce === 'function') homeAnnounce(`Hidden: ${_CCK_BADGE[it.kind]}, ${it.title}`);
  };
  if (row && window.Motion && row.isConnected) Motion.collapse(row, save); else save();
}
/** The reply task for an invitation: title, the day before (not before today), the organiser if in People. */
function _cckTaskPrefill(it) {
  const day = Clock.addDays(Clock.parts(new Date(it.start).getTime()).iso, -1);   // the page's day before (travel spec 2.7)
  const today = todayStr();
  const due = day < today ? today : day;
  const pid = it.organizer ? _cckPersonFor(it.organizer.email) : null;
  return { title: 'Reply to invitation: ' + String(it.title).slice(0, 160), date: due, eventId: it.id, people: pid ? [pid] : [] };
}
/** An open reply task already linked to the event (then "Task added"). */
function _cckReplyTask(it) {
  try {
    const m = typeof calEventMeta === 'function' ? calEventMeta(it.id) : null;
    for (const tid of (m && m.tasks) || []) {
      const t = typeof getItem === 'function' ? getItem(tid) : null;
      if (t && statusOf(tid) !== 'done' && /^Reply to invitation/i.test(typeof effTitle === 'function' ? effTitle(t) : t.title)) return tid;
    }
  } catch (e) { /* no meta */ }
  return null;
}
function _cckTaskOpen(it, btn) {
  // Pressed again while its card is open: nothing (the user's edits stay).
  try { if (typeof _tc !== 'undefined' && _tc && !_tc.closing) { const c = _tcCur(); if (c && c.kind === 'create' && c.draft && c.draft.eventId === it.id) return; } } catch (e) { /* no card */ }
  if (typeof tcOpenCreate === 'function') tcOpenCreate(_cckTaskPrefill(it), { from: btn });
}
function _cckTaskQuick(it, btn) {
  if (_cckReplyTask(it)) return;
  const pre = _cckTaskPrefill(it);
  homeAction(btn, () => {
    let id = null;
    selUndoGroup(() => {
      id = addCustomTask(pre.title, pre.date, 'p0', [], null, 'none', { people: pre.people });
      if (id && typeof calLinkTask === 'function') calLinkTask(it.id, id, true);
    });
    return id || false;
  }, { done: 'Added', toast: `Task added: ${pre.title}`, undo: true, say: 'Reply task added' });
}
/** Ask the organiser for the place or link: the Gmail draft editor, prefilled (never sends). */
function _cckLinkDraft(it) {
  const org = it.organizer;
  if (!org || !org.email) return null;
  const when =_cckDate(it.start) + ', ' + _cckTime(it.start);
  const subject = `Link for ${it.title}`.slice(0, 200);
  const line = `Is there a room or a call link for ${it.title} (${when})? I couldn't find one in the invitation.`;
  const pid = _cckPersonFor(org.email);
  const G = typeof window !== 'undefined' ? window.GmailDraft : null;
  let prefill = null;
  if (pid && G && typeof G.prefill === 'function') {
    try { prefill = G.prefill('note', { person: pid, subject, line }); } catch (e) { prefill = null; }
    if (prefill) prefill.to = [org.email];
  }
  return { prefill, subject, line, org, pid, gmail: !!(prefill && G && (typeof G.available !== 'function' || G.available())) };
}
function _cckLinkOpen(it, btn) {
  const d = _cckLinkDraft(it);
  if (!d) return;
  if (d.gmail) { window.GmailDraft.openEditor(d.prefill, { title: 'Ask for the link' }); return; }
  const body = `Hi ${_cckFirst(d.org.name, d.org.email)},\n\n${d.line}\n\nThanks`;
  const url = typeof hglMailto === 'function' ? hglMailto({ email: d.org.email }, d.subject, body) : null;
  if (url) hglOpenMail(url);
}
function _cckLinkQuick(it, btn) {
  const d = _cckLinkDraft(it);
  if (!d || !d.gmail) return;
  homeAction(btn, async () => {
    const r = await window.GmailDraft.quick(d.prefill, {});
    return r && r.ok ? r : false;
  }, { done: 'Drafted', say: 'Draft saved in Gmail, not sent' });
}

/* ---------- render ---------- */
function _cckRender(el, ctx) {
  _cckWriteOk = null;
  const size = ctx.size || 's';
  const prefs = homePrefs(ctx.instance || ctx.id || 'calcheck');
  let model, cal = null;
  if (ctx.preview) {
    const s = homeSample('calcheck') || _cckSample();
    model = homeCalProblems(s.events, s.opts);
  } else {
    cal = typeof homeCalStatus === 'function' ? homeCalStatus(() => homeRerenderWidget(ctx.id)) : { ok: false, none: true };
    if (cal.off) return false;
    if (cal.loading) return false;                                    // appears when the calendar has loaded
    if (cal.error || cal.none) {
      el.appendChild(ctx.off({
        icon: 'calendar-clock', title: cal.error ? 'Couldn’t read the calendar' : 'Connect a calendar',
        text: cal.error ? 'Invitations and clashes show here again once the calendar loads.' : 'Connect a calendar to catch invitations to answer and events that clash.',
        action: cal.error
          ? { label: 'Try again', icon: 'refresh-cw', run: () => { if (typeof CalStore !== 'undefined') CalStore.load(true); } }
          : { label: 'Connect', icon: 'plug', run: () => (window.Connections && Connections.open ? Connections.open('calendar') : setView('connections')) },
      }));
      return true;
    }
    if (!_cckSubbed && window.CalWrite && typeof CalWrite.onChange === 'function') { _cckSubbed = true; CalWrite.onChange(() => { _cckCalTick++; }); }
    model = _cckModel(prefs);
    // "Ask for the link" drafts in Gmail when a mailbox can take drafts: ask once (cached), then repaint.
    if (!_cckGmdAsked && model.counts.link && window.GmailDraft && typeof GmailDraft.info === 'function') {
      _cckGmdAsked = true;
      Promise.resolve(GmailDraft.info()).then((i) => { if (i && state.view === 'home') homeRerenderWidget(ctx.id); }, () => {});
    }
  }
  if (!model.total) return false;
  if (ctx.firstPaint && !ctx.preview) _cckAll = false;

  const card = document.createElement('section');
  card.className = `card home-card cck cck--${size}`;
  card.appendChild(_cckHead(ctx, model, cal, size));
  const body = document.createElement('div'); body.className = 'card-b cck-b';
  card.appendChild(body);
  el.appendChild(card);

  let rows = [];
  if (size === 's') {
    body.appendChild(_cckSummaryEl(model));
    const list = document.createElement('ul'); list.className = 'cck-list';
    const li = _cckRow(model.nearest, ctx, { compact: true });
    list.appendChild(li); rows = [li];
    body.appendChild(list);
    if (model.total > 1) {
      const more = document.createElement('div'); more.className = 'cck-s-more';
      more.textContent = `+${model.total - 1} more · make it bigger to see them all`;
      body.appendChild(more);
    }
    _cckKeys(list, ctx, model);
  } else {
    const cap = size === 'l' ? 10 : 6;
    let shown = 0;
    const wrap = document.createElement('div'); wrap.className = 'cck-groups';
    for (const kind of CCK_ORDER) {
      const its = model.items.filter(i => i.kind === kind);
      if (!its.length) continue;
      if (!_cckAll && shown >= cap) break;
      const g = document.createElement('section'); g.className = `cck-g k-${kind}`;
      g.dataset.flip = 'cckg:' + kind;
      g.innerHTML = `<h4 class="hgl-ovl cck-gh"><span>${esc(_CCK_HEAD[kind])}</span><span class="cck-gn">${its.length}</span></h4>`;
      const list = document.createElement('ul'); list.className = 'cck-list';
      for (const it of its) {
        if (!_cckAll && shown >= cap) break;
        const li = _cckRow(it, ctx, { large: size === 'l' });
        list.appendChild(li); rows.push(li); shown++;
      }
      g.appendChild(list);
      wrap.appendChild(g);
    }
    body.appendChild(wrap);
    _cckKeys(wrap, ctx, model);
    const foot = document.createElement('div'); foot.className = 'hgl-foot cck-foot';
    foot.innerHTML = `${icon('info')}<span>Next ${prefs.days || 14} days · replies tell the organiser</span>`;
    if (model.total > cap) {
      const more = document.createElement('button'); more.type = 'button'; more.className = 'btn btn-ghost btn-sm cck-more';
      more.innerHTML = `<span>${_cckAll ? 'Show less' : `+${model.total - cap} more`}</span>${icon(_cckAll ? 'chevron-up' : 'chevron-down')}`;
      more.setAttribute('aria-expanded', _cckAll ? 'true' : 'false');
      if (!ctx.preview) more.onclick = () => { _cckAll = !_cckAll; if (ctx.rerender) ctx.rerender(); };
      foot.appendChild(more);
    }
    body.appendChild(foot);
    if (!ctx.preview && typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx, { kinds: Object.keys(model.counts).filter(k => model.counts[k]) });
  }

  if (ctx.preview) { card.inert = true; return true; }
  // Motion: once per entry (rows rise, the clash timelines grow); later only new rows.
  if (ctx.firstPaint) _cckEnter(card, rows);
  if (ctx.enterNew) ctx.enterNew(rows, (li) => li.dataset.flip);      // on first paint it only remembers them
  // The minute tick: repaint only when the list itself changes (an invitation starts, a clash passes).
  const sig = _cckSigOf(model);
  homeTick(ctx, () => (_cckSigOf(_cckModel(homePrefs(ctx.instance || ctx.id))) !== sig ? 'rerender' : undefined));
  if (_cckFocusKey) {
    const k = _cckFocusKey; _cckFocusKey = null;
    const r = card.querySelector(`.cck-row[data-key="${CSS.escape(k)}"]`) || card.querySelector('.cck-row');
    if (r) setTimeout(() => { try { r.focus({ preventScroll: true }); } catch (e) { /* gone */ } }, 0);
  }
  return true;
}
function _cckEnter(card, rows) {
  if (typeof hglAnim !== 'function') return;
  rows.slice(0, 10).forEach((r, i) => hglAnim(r, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 160 + i * 50 }));
  const pills = card.querySelectorAll('.cck-pill');
  pills.forEach((p, i) => hglAnim(p, [{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 120 + i * 60 }));
  const bars = card.querySelectorAll('.cck-tl-bar');
  bars.forEach((b, i) => hglAnim(b, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 520, delay: 360 + i * 70 }));
}
function _cckHead(ctx, model, cal, size) {
  const h = document.createElement('div'); h.className = 'card-h hgl-h cck-h';
  const parts = cckSummary(model.counts);
  const n = size === 's' || parts.length < 2 ? '' : parts.map(s => s.text).join(' · ');
  h.innerHTML = `${icon('calendar-clock')}<h3>Invites &amp; clashes</h3>${n ? `<span class="n hgl-n">${esc(n)}</span>` : ''}<span class="spacer"></span>`;
  if (cal && cal.ok && (cal.stale || cal.running) && cal.label) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cck-upd' + (cal.running ? ' is-running' : '');
    b.innerHTML = icon('refresh-cw') + `<span>${esc(cal.running ? 'Updating…' : cal.label)}</span>`;
    b.setAttribute('aria-label', cal.running ? 'Updating the calendar' : `${cal.label}. Read the calendar again`);
    if (cal.running) b.disabled = true;
    else b.onclick = () => { if (typeof CalStore !== 'undefined' && CalStore.update) CalStore.update({ force: true }); };
    h.appendChild(b);
  }
  if (size !== 's' && !ctx.preview && typeof homeSettingsButton === 'function') h.appendChild(homeSettingsButton(ctx, 'Invites & clashes settings'));
  return h;
}
function _cckSummaryEl(model) {
  const box = document.createElement('div'); box.className = 'cck-sum';
  const parts = cckSummary(model.counts);
  box.innerHTML = parts.map(p => `<span class="cck-pill k-${escAttr(p.kind)}"><i aria-hidden="true"></i>${esc(p.text)}</span>`).join('<span class="cck-sep" aria-hidden="true">·</span>');
  return box;
}
function _cckKeys(list, ctx, model) {
  if (ctx.preview || typeof homeRowKeys !== 'function') return;
  const find = (key) => model.items.find(i => i.key === key);
  homeRowKeys(list, {
    open: (key, row) => { const it = find(key); if (it) _cckOpen(it, row, row); },
    done: (key, row) => { const it = find(key); if (it) _cckDismiss(it, row, ctx); },
  });
}

/* ---------- one row ---------- */
function _cckBtn(cls, ic, label, o) {
  o = o || {};
  const b = document.createElement('button'); b.type = 'button'; b.className = cls;
  b.innerHTML = (ic ? icon(ic) : '') + (o.iconOnly ? '' : `<span>${esc(label)}</span>`);
  if (o.iconOnly || o.tip) { b.setAttribute('aria-label', o.aria || label); b.setAttribute('data-tip', o.tip || label); }
  else if (o.aria) b.setAttribute('aria-label', o.aria);
  return b;
}
function _cckRow(it, ctx, o) {
  o = o || {};
  const li = document.createElement('li');
  li.className = `cck-row hgl-row k-${it.kind}`;
  li.dataset.flip = 'cck:' + it.key; li.dataset.key = it.key; li.dataset.row = it.key;
  li.tabIndex = 0;
  li.setAttribute('aria-label', _cckAria(it));
  const openId = ctx.preview ? null : _cckOpenEventId();
  if (openId && _cckIds(it).includes(openId)) li.setAttribute('aria-current', 'true');
  const main = document.createElement('div'); main.className = 'cck-main';
  const acts = document.createElement('div'); acts.className = 'cck-acts';
  const tools = document.createElement('div'); tools.className = 'cck-tools';
  li.append(main, acts, tools);
  if (it.kind === 'clash') _cckClashMain(main, it, li, ctx, o);
  else _cckPlainMain(main, it, o);
  if (!ctx.preview) {
    main.onclick = (e) => {
      const evBtn = e.target.closest && e.target.closest('[data-ev]');
      _cckOpen(it, li, evBtn || main, evBtn ? evBtn.dataset.ev : null);
    };
    li.addEventListener('focus', () => { const cur = _cckOpenEventId(); if (!cur || !_cckIds(it).includes(cur)) li.removeAttribute('aria-current'); });
  }
  _cckActs(acts, tools, it, li, ctx, o);
  if (!acts.children.length) acts.hidden = true;
  return li;
}
function _cckPlainMain(main, it, o) {
  const color = _cckColor(it.ev);
  const when = it.kind === 'b2b' ? `${_cckDayText(it.start)} ${_cckTime(it.start)}–${_cckTime(it.end)}` : _cckWhen(it.start, it.end, it.allDay);
  let title = it.title, l2 = [esc(when)];
  if (it.kind === 'reply' || it.kind === 'maybe') {
    if (it.organizer) l2.push(o.large ? `organised by ${esc(_cckOrgText(it))}` : `from ${esc(_cckFirst(it.organizer.name, it.organizer.email))}`);
    if (o.large && it.guests) l2.push(`${it.guests} guest${it.guests === 1 ? '' : 's'}`);
    if (it.more) l2.push(`+${it.more} more`);
    if (it.overlaps && it.overlaps.length) l2.push(`<b class="cck-warn">overlaps ${esc(it.overlaps[0].title)}${it.overlaps.length > 1 ? ` +${it.overlaps.length - 1}` : ''}</b>`);
  } else if (it.kind === 'b2b') {
    title = `${cckMinutesText(it.minutes)} back to back`;
    l2.push(`${it.count} meetings`);
    if (o.large) l2.push(esc(it.titles.slice(0, 3).join(', ') + (it.titles.length > 3 ? '…' : '')));
  } else if (it.kind === 'link') {
    const rel = _cckIn(it.start);
    if (rel) l2.push(esc(rel));
    l2.push(`${it.others + 1} people`);
  } else if (it.kind === 'hours') {
    l2.push(esc(it.why === 'dayoff' ? 'not a working day' : it.why === 'early' ? 'before your day starts' : 'after your day ends'));
    if (it.more) l2.push(`+${it.more} more`);
  }
  const lead = it.kind === 'b2b' ? `<span class="cck-ic">${icon('layers')}</span>` : `<span class="cck-dot c-${escAttr(color)}" aria-hidden="true"></span>`;
  main.innerHTML = `${lead}<span class="cck-body"><span class="cck-l1"><span class="cck-t">${esc(title)}</span><span class="cck-badge k-${escAttr(it.kind)}">${esc(_CCK_BADGE[it.kind])}</span></span>`
    + `<span class="cck-l2">${l2.join(' · ')}</span></span>`;
}
function _cckClashMain(main, it, li, ctx, o) {
  const side = (x) => `<button type="button" class="cck-ev" data-ev="${escAttr(x.id)}" aria-label="Open ${escAttr(x.title)}"><span class="cck-dot c-${escAttr(_cckColor(x.ev))}" aria-hidden="true"></span><span class="cck-ev-t">${esc(x.title)}</span><time>${esc(_cckTime(x.start))}–${esc(_cckTime(x.end))}</time></button>`;
  const more = it.more ? `<span class="cck-l2">Repeats: +${it.more} more in the next weeks</span>` : '';
  main.innerHTML = `<span class="cck-ic">${icon('triangle-alert')}</span><span class="cck-body"><span class="cck-l1"><span class="cck-t">${esc(_cckDayText(it.start))}</span><span class="cck-badge k-clash">${esc(cckMinutesText(it.minutes))} overlap</span></span>`
    + `<span class="cck-pair">${side(it.a)}${side(it.b)}</span>${o.large ? _cckTimeline(it) : ''}${more}</span>`;
  if (ctx.preview) for (const b of main.querySelectorAll('button')) b.tabIndex = -1;
}
/** L: two lanes on one time axis; the overlap is hatched. */
function _cckTimeline(it) {
  const s = Math.min(it.a.start, it.b.start), e = Math.max(it.a.end, it.b.end);
  const span = Math.max(1, e - s);
  const pc = (x) => Math.max(0, Math.min(100, ((x - s) / span) * 100)).toFixed(2) + '%';
  const lane = (x, n) => `<span class="cck-tl-lane"><span class="cck-tl-bar c-${escAttr(_cckColor(x.ev))}" style="left:${pc(x.start)};width:calc(${pc(x.end)} - ${pc(x.start)})"></span><span class="sr-only">${esc(x.title)} ${esc(_cckTime(x.start))} to ${esc(_cckTime(x.end))}</span></span>`;
  return `<span class="cck-tl" aria-hidden="false"><span class="cck-tl-ov" style="left:${pc(it.start)};width:calc(${pc(it.end)} - ${pc(it.start)})"></span>${lane(it.a, 1)}${lane(it.b, 2)}`
    + `<span class="cck-tl-ax" aria-hidden="true"><span>${esc(_cckTime(s))}</span><span>${esc(_cckTime(e))}</span></span></span>`;
}
function _cckActs(acts, tools, it, li, ctx, o) {
  const pv = !!ctx.preview;
  const bind = (b, fn) => { if (pv) { b.tabIndex = -1; return b; } b.onclick = (e) => { e.stopPropagation(); fn(b, e); }; return b; };
  const fine = () => bind(_cckBtn('cck-x', 'eye-off', 'It’s fine', { iconOnly: true, tip: 'It’s fine: hide until it ends', aria: `It’s fine: hide ${it.title} until it ends` }), () => _cckDismiss(it, li, ctx));
  const menu = (items) => {
    const list = items.filter(Boolean);
    if (!list.length) return null;
    const b = _cckBtn('cck-x', 'ellipsis', 'More', { iconOnly: true, aria: `More for ${it.title}` });
    b.setAttribute('aria-haspopup', 'menu');
    return bind(b, () => openMenu(b, list, { align: 'end' }));
  };
  const google = (x, label) => { const u = typeof safeUrl === 'function' ? safeUrl(x && x.htmlLink) : ''; return u ? { label: label || 'Open in Google', icon: 'external-link', run: () => window.open(u, '_blank', 'noopener') } : null; };
  const openItem = (x, label) => ({ label: label || 'Open', icon: 'calendar-days', run: () => _cckOpen(it, li, li, x.id) });

  if (it.kind === 'reply' || it.kind === 'maybe') {
    const seg = document.createElement('span'); seg.className = 'cck-rsvp'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', `Answer ${it.title}`);
    if (_cckCanRsvp(it.ev) || pv) {
      const cur = it.response === 'tentative' ? 'tentative' : '';
      for (const [r, label, ic] of _CCK_RSVP) {
        const b = _cckBtn('cck-r' + (r === cur ? ' on' : ''), ic, label, { aria: `${label}: answer ${it.title} (tells ${it.organizer ? _cckOrgText(it) : 'the organiser'})` });
        b.setAttribute('aria-pressed', r === cur ? 'true' : 'false');
        b.dataset.r = r;
        seg.appendChild(bind(b, (btn) => _cckRsvp(btn, it, r)));
      }
    } else {
      const g = google(it.ev, 'Answer in Google');
      if (g) seg.appendChild(bind(_cckBtn('cck-r', 'external-link', 'Answer in Google'), g.run));
    }
    acts.appendChild(seg);
    if (!o.compact) {
      const done = pv ? null : _cckReplyTask(it);
      const tk = document.createElement('span'); tk.className = 'cck-split';
      if (done) {
        const b = _cckBtn('cck-chip is-done', 'check', 'Task added', { aria: 'A reply task is already added' });
        b.setAttribute('aria-disabled', 'true');
        tk.appendChild(b);
      } else {
        tk.appendChild(bind(_cckBtn('cck-chip', 'list-todo', 'Task', { tip: 'Make a reply task (opens it to adjust)', aria: `Make a task to reply to ${it.title}: opens the task, filled in` }), (b) => _cckTaskOpen(it, b)));
        tk.appendChild(bind(_cckBtn('cck-chip cck-ok', 'check', 'Add it now', { iconOnly: true, tip: 'Add the task as it is (Undo)', aria: `Add the reply task for ${it.title} now` }), (b) => _cckTaskQuick(it, b)));
      }
      acts.appendChild(tk);
    }
    tools.appendChild(fine());
    const m = menu([openItem(it, 'Open the event'), google(it.ev)]);
    if (m) tools.appendChild(m);
  } else if (it.kind === 'clash') {
    tools.appendChild(fine());
    const items = [openItem(it.a, 'Open ' + it.a.title), openItem(it.b, 'Open ' + it.b.title)];
    for (const x of [it.a, it.b]) {
      if (!pv && _cckCanRsvp(x.ev)) items.push({ label: `Decline ${x.title}…`, icon: 'x', run: () => _cckRsvp(li.querySelector('.cck-x') || li, it, 'declined', x.ev) });
    }
    items.push('sep', google(it.a.ev, 'Open ' + it.a.title + ' in Google'), google(it.b.ev, 'Open ' + it.b.title + ' in Google'));
    const m = menu(items.filter((x, i, a) => !(x === 'sep' && (i === a.length - 1 || !a[i + 1]))));
    if (m) tools.appendChild(m);
  } else if (it.kind === 'link') {
    if (!o.compact) {
      const tk = document.createElement('span'); tk.className = 'cck-split';
      if (it.mine) tk.appendChild(bind(_cckBtn('cck-chip', 'link', 'Add a link', { tip: 'Open the event to add a place or link' }), () => _cckOpen(it, li, li)));
      else if (it.organizer) {
        const d = pv ? { gmail: true } : _cckLinkDraft(it);
        tk.appendChild(bind(_cckBtn('cck-chip', 'mail', 'Ask for the link', { tip: d && d.gmail ? 'Opens a draft to the organiser (never sent)' : 'Opens your mail app (nothing is sent)', aria: `Ask ${_cckOrgText(it)} for the link: opens a draft` }), (b) => _cckLinkOpen(it, b)));
        if (d && d.gmail) tk.appendChild(bind(_cckBtn('cck-chip cck-ok', 'check', 'Save the draft now', { iconOnly: true, tip: 'Save the draft as it is (not sent; Undo)' }), (b) => _cckLinkQuick(it, b)));
      }
      if (tk.children.length) acts.appendChild(tk);
    }
    tools.appendChild(fine());
    const m = menu([openItem(it, 'Open the event'), google(it.ev)]);
    if (m) tools.appendChild(m);
  } else {
    tools.appendChild(fine());
    const items = it.kind === 'b2b'
      ? it.ids.map((id, i) => ({ label: 'Open ' + it.titles[i], icon: 'calendar-days', run: () => _cckOpen(it, li, li, id) }))
      : [openItem(it, 'Open the event'), google(it.ev), !pv && _cckCanRsvp(it.ev) ? { label: 'Decline…', icon: 'x', run: () => _cckRsvp(li, it, 'declined') } : null];
    const m = menu(items);
    if (m) tools.appendChild(m);
  }
}

/* ---------- settings ---------- */
function _cckSettings(anchor, ctx) {
  if (!ctx || ctx.preview) return;
  const id = ctx.instance || ctx.id || 'calcheck';
  const checks = [['reply', 'Invitations to answer'], ['clash', 'Events that clash'], ['b2b', '3 h or more back to back'], ['link', 'Meetings with no place or link'], ['hours', 'Outside working hours']];
  openPopover(anchor, (el) => {
    el.classList.add('hg-set', 'cck-set');
    const paint = () => {
      const p = homePrefs(id);
      const wh = _cckWorkHours();
      el.innerHTML = `<div class="hg-set-h">${icon('calendar-clock')}<b>Invites &amp; clashes settings</b></div>`;
      for (const [k, label] of checks) {
        const on = !p.checks || p.checks[k] !== false;
        const row = document.createElement('div'); row.className = 'hg-set-row'; row.dataset.key = k;
        const hint = k === 'hours' && !wh ? 'Set your working hours in Settings › Profile first' : '';
        row.innerHTML = `<div class="hg-set-l"><span>${esc(label)}</span>${hint ? `<small>${esc(hint)}</small>` : ''}</div>`;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'switch' + (on ? ' on' : '');
        b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.setAttribute('aria-label', label);
        b.onclick = () => {
          const next = Object.assign({ reply: true, clash: true, b2b: true, link: true, hours: true }, p.checks || {}, { [k]: !on });
          if (homeSetPrefs(id, { checks: next })) { paint(); const f = el.querySelector(`.hg-set-row[data-key="${k}"] .switch`); if (f) f.focus(); }
        };
        row.appendChild(b);
        el.appendChild(row);
      }
      const dr = document.createElement('div'); dr.className = 'hg-set-row'; dr.dataset.key = 'days';
      dr.innerHTML = '<div class="hg-set-l"><span>Look ahead</span></div>';
      const seg = document.createElement('span'); seg.className = 'seg'; seg.setAttribute('role', 'radiogroup'); seg.setAttribute('aria-label', 'Look ahead');
      for (const n of [7, 14, 30]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = `${n} days`;
        const on = Number(p.days || 14) === n;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', on ? 'true' : 'false'); if (on) b.classList.add('on');
        b.onclick = () => { if (on) return; if (homeSetPrefs(id, { days: n })) { paint(); const f = el.querySelector('.hg-set-row[data-key="days"] .on'); if (f) f.focus(); } };
        seg.appendChild(b);
      }
      dr.appendChild(seg); el.appendChild(dr);
      const live = Object.keys(cckPruneDismissed(p.dismissed, Date.now(), 100)).length;
      if (live) {
        const rr = document.createElement('div'); rr.className = 'hg-set-row'; rr.dataset.key = 'dismissed';
        rr.innerHTML = `<div class="hg-set-l"><span>Hidden with “It’s fine”</span><small>${live} until their events end</small></div>`;
        const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = 'Show them again';
        b.onclick = () => { if (homeSetPrefs(id, { dismissed: null }, 'Hidden problems shown again')) paint(); };
        rr.appendChild(b); el.appendChild(rr);
      }
      const foot = document.createElement('div'); foot.className = 'hg-set-foot';
      foot.textContent = 'Only your own events count. Answers go to the organiser after you confirm.';
      el.appendChild(foot);
    };
    paint();
  }, { width: 340, align: 'end', className: 'hg-set-pop' });
}
