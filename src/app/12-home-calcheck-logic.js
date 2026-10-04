/* ============================================================
   HOME widget "calcheck" (Invites & clashes): the pure rules.
   OWNER: the "calcheck" widget builder (WIDGETS_CATALOGUE.md 3.6). The widget
   is 12-home-w-calcheck.js; tests/home-w-calcheck.test.mjs runs this file
   (with 12-home-meet-logic.js) in a VM. No DOM, no page state, no clock:
   callers pass `now`. Events are the calendar store's shape (lib/calendar.mjs,
   see 12-home-meet-logic.js); local wall-clock time.

     homeCalProblems(events, o) -> {items, counts, total, nearest}
         o: {now (ms | ISO), days (14), myEmails [address], myCalendars [calendar id],
             workHours {startMin, endMin, days:[0-6]} | null (null: no "outside working
             hours" check: it runs only when the user set working hours),
             checks {reply, clash, b2b, link, hours} (missing = on), dismissed {key: until ms}}
         Copies of one event on several calendars count once (homeDedupeEvents: id,
         iCalUID at the same start, or start + end + title). The checks, over the next
         o.days days:
           reply  an invitation the user has not answered (or said Maybe to: listed lower).
                  {response: 'needsAction'|'tentative', organizer {email, name}|null,
                  guests (others invited), overlaps [{id, title}] (committed events it
                  overlaps by 10 min or more)}
           clash  two committed timed events overlapping by 10 min or more (free, all-day,
                  declined, out of office, working location and 12 h+ events ignored).
                  {a, b: {id, ev, title, start, end}, start, end (the overlap), minutes}
           b2b    3 h or more of meetings with others with less than 10 min between them,
                  today and tomorrow only. {ids, titles, start, end, minutes, count, date}
           link   a meeting with others in the next 24 h with no place and no call link.
                  {others, mine (the user organises it), organizer}
           hours  a committed meeting with others outside working hours.
                  {why: 'early'|'late'|'dayoff'}
         Every item: {kind, key, id, ev, title, start, end (ms), allDay, more (later copies
         of the same series, folded into this row), until (ms: when a dismissal expires)}.
         A series (a repeating invitation, a weekly clash) is one row: its next copy,
         with `more`. Items are most severe first (CCK_ORDER), then by start; `nearest`
         is the one that starts first. counts {reply, maybe, clash, b2b, link, hours}.
     cckMyResponse(ev, o)       the user's own answer: 'organizer' | 'accepted' | 'tentative' |
                                'needsAction' | 'declined' | 'own' (no guests) | null (not the
                                user's event: someone else's calendar the user can see)
     cckCommitted(r)            organiser, accepted or own: the user will be there
     cckHasJoin(ev)             a place or a call link (also a meeting URL in the description)
     cckSeriesKey(ev)           the series an event belongs to (itself when it does not repeat)
     cckKey(kind, parts)        a short stable key for "It's fine" (kind:hash)
     cckPruneDismissed(d, now, max)   the dismissals still running, the newest max
     cckSummary(counts)         [{kind, n, text}] most severe first: "3 to answer", "1 clash"
     cckMinutesText(min)        "45 min", "3 h", "3 h 30 min"
   ============================================================ */
const CCK_ORDER = ['reply', 'clash', 'b2b', 'link', 'hours', 'maybe'];
const CCK_GAP_MIN = 10;               // back to back: less than this between two meetings
const CCK_OVERLAP_MIN = 10;           // a clash: at least this much overlap
const CCK_B2B_MIN = 180;              // a back-to-back run worth a warning
const CCK_LONG_MIN = 12 * 60;         // timed events this long (trips, all-week blocks) never clash
const _CCK_SKIP_TYPES = ['outOfOffice', 'workingLocation', 'birthday'];
const _CCK_JOIN_RE = /https?:\/\/[^\s"'<>]*(zoom\.us|meet\.google\.com|teams\.microsoft\.com|teams\.live\.com|webex\.com|whereby\.com|gotomeeting\.com|meet\.jit\.si|chime\.aws|bluejeans\.com)/i;

function _cckMs(w) {
  if (w == null) return NaN;
  if (typeof w === 'number') return w;
  if (w instanceof Date) return w.getTime();
  if (typeof w === 'string') return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(w) ? w + 'T00:00:00' : w);
  if (w.dateTime) return Date.parse(w.dateTime);
  if (w.date) return Date.parse(w.date + 'T00:00:00');
  return NaN;
}
function _cckLower(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
function _cckTitle(ev) { return String((ev && (ev.summary != null ? ev.summary : ev.title)) || '').replace(/\s+/g, ' ').trim() || '(no title)'; }
// The page's day, minute and weekday of an instant (Clock, travel spec 2.7); this machine's clock in Node.
function _cckDay(ms) {
  if (typeof Clock !== 'undefined') return Clock.parts(ms).iso;
  const d = new Date(ms); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // clock-ok: Node fallback
}
function _cckMinOf(ms) {
  if (typeof Clock !== 'undefined') { const p = Clock.parts(ms); return p.h * 60 + p.mi; }
  const d = new Date(ms); return d.getHours() * 60 + d.getMinutes();   // clock-ok: Node fallback
}
function _cckDow(ms) { return typeof Clock !== 'undefined' ? Clock.parts(ms).dow : new Date(ms).getDay(); }   // clock-ok: Node fallback
function _cckNextDay(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10); }   // clock-ok: pure ISO arithmetic (UTC)
function _cckAllDay(ev) { return !!(ev && (ev.allDay || (ev.start && ev.start.date && !ev.start.dateTime))); }
function _cckCalIds(ev) { const c = Array.isArray(ev.calendars) && ev.calendars.length ? ev.calendars : [ev.calendarId]; return c.filter(Boolean).map(_cckLower); }
function _cckResp(a) { return (a && (a.response || a.responseStatus)) || 'needsAction'; }

/** The user's own answer to an event (see the header). */
function cckMyResponse(ev, o) {
  if (!ev) return null;
  o = o || {};
  const mine = new Set((o.myEmails || []).map(_cckLower).filter(Boolean));
  const cals = new Set((o.myCalendars || []).map(_cckLower).filter(Boolean));
  for (const m of mine) cals.add(m);
  const atts = (Array.isArray(ev.attendees) ? ev.attendees : []).filter(Boolean);
  const org = ev.organizer ? _cckLower(ev.organizer.email) : '';
  if (org && mine.has(org)) return 'organizer';
  const me = atts.find(a => mine.has(_cckLower(a.email)));
  if (me) return me.organizer ? 'organizer' : _cckResp(me);
  const known = cals.size > 0;
  if (known && !_cckCalIds(ev).some(id => cals.has(id))) return null;      // someone else's calendar
  // The user's own calendar (or nothing is known about the user): Google's own view of "self".
  const self = atts.find(a => a.self);
  if (self) return self.organizer ? 'organizer' : _cckResp(self);
  if (ev.selfResponse) return ev.selfResponse;
  if (ev.organizer && (ev.organizer.self || (org && cals.has(org)))) return 'organizer';
  return atts.length ? null : 'own';
}
function cckCommitted(r) { return r === 'organizer' || r === 'accepted' || r === 'own'; }
function cckHasJoin(ev) {
  if (!ev) return false;
  if (String(ev.location || '').trim() || ev.conferenceUrl || ev.hangoutLink) return true;
  return _CCK_JOIN_RE.test(String(ev.description || ''));
}
function cckSeriesKey(ev) {
  if (!ev) return '';
  if (ev.recurringEventId) return String(ev.recurringEventId);
  const id = String(ev.id || '');
  return ev.recurring ? id.replace(/_\d{8}(T\d{4,6}Z?)?$/, '') : id;
}
/** FNV-1a (32 bit) in base 36: keys stay short (the widget's settings hold at most 4 KB). */
function _cckHash(s) {
  let h = 0x811c9dc5;
  const str = String(s);
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
function cckKey(kind, parts) { return String(kind) + ':' + _cckHash((Array.isArray(parts) ? parts : [parts]).join('|')); }
function cckPruneDismissed(d, now, max) {
  const t = _cckMs(now);
  const n = Number.isFinite(max) ? max : 40;
  const live = Object.entries(d && typeof d === 'object' ? d : {})
    .filter(([k, v]) => typeof k === 'string' && /^[a-z0-9]+:[a-z0-9]+$/.test(k) && Number.isFinite(Number(v)) && Number(v) > t)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, n);
  const out = {};
  for (const [k, v] of live) out[k] = Number(v);
  return out;
}
function cckMinutesText(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
const _CCK_WORDS = {
  reply: (n) => `${n} to answer`, clash: (n) => `${n} clash${n === 1 ? '' : 'es'}`, b2b: (n) => `${n} back to back`,
  link: (n) => `${n} without a link`, hours: (n) => `${n} out of hours`, maybe: (n) => `${n} maybe`,
};
function cckSummary(counts) {
  const c = counts || {};
  return CCK_ORDER.filter(k => (c[k] || 0) > 0).map(k => ({ kind: k, n: c[k], text: _CCK_WORDS[k](c[k]) }));
}

/** Who organises it, when that is someone else (a room or resource calendar is nobody to ask). */
function _cckOrg(ev, mine) {
  const o = ev && ev.organizer;
  const email = o ? _cckLower(o.email) : '';
  if (!o || (email && mine.has(email)) || o.self || /@resource\.calendar\.google\.com$/.test(email)) return null;
  if (!email && !o.name && !o.displayName) return null;
  return { email, name: String(o.name || o.displayName || '').trim() };
}
/** Other guests (not the user, no rooms or group calendars). */
function _cckOthers(ev, mine) {
  const out = [];
  for (const a of Array.isArray(ev.attendees) ? ev.attendees : []) {
    if (!a || a.self || a.resource) continue;
    const e = _cckLower(a.email);
    if (e && (mine.has(e) || /@(group\.calendar|resource\.calendar|group\.v\.calendar|import\.calendar)\.google\.com$/.test(e))) continue;
    out.push(a);
  }
  return out;
}

function homeCalProblems(events, o) {
  o = o || {};
  const now = _cckMs(o.now != null ? o.now : Date.now());
  const days = Number.isFinite(Number(o.days)) && Number(o.days) > 0 ? Math.min(60, Number(o.days)) : 14;
  const to = now + days * 864e5;
  const checks = Object.assign({ reply: true, clash: true, b2b: true, link: true, hours: true }, o.checks || {});
  const dismissed = o.dismissed && typeof o.dismissed === 'object' ? o.dismissed : {};
  const mine = new Set((o.myEmails || []).map(_cckLower).filter(Boolean));
  const ropt = { myEmails: o.myEmails || [], myCalendars: o.myCalendars || [] };
  const wh = o.workHours && Number.isFinite(o.workHours.startMin) && Number.isFinite(o.workHours.endMin) ? o.workHours : null;
  const list = typeof homeDedupeEvents === 'function' ? homeDedupeEvents(events) : (Array.isArray(events) ? events.filter(e => e && e.start) : []);

  // One pass: the user's events in the window, with what the checks need.
  const evs = [];
  for (const ev of list) {
    if (!ev || ev.status === 'cancelled') continue;
    const start = _cckMs(ev.start), end0 = _cckMs(ev.end);
    if (!Number.isFinite(start)) continue;
    const end = Number.isFinite(end0) && end0 > start ? end0 : start + (_cckAllDay(ev) ? 864e5 : 0);
    if (end <= now || start >= to) continue;
    const resp = cckMyResponse(ev, ropt);
    if (!resp || resp === 'declined') continue;
    const others = _cckOthers(ev, mine);
    evs.push({ ev, id: String(ev.id || ''), title: _cckTitle(ev), start, end, allDay: _cckAllDay(ev), resp, others, series: cckSeriesKey(ev), recurring: !!(ev.recurring || ev.recurringEventId) });
  }
  evs.sort((a, b) => a.start - b.start || a.end - b.end || a.title.localeCompare(b.title));
  // Timed, busy, the user is going: what can clash.
  const busy = evs.filter(x => !x.allDay && !x.ev.free && !_CCK_SKIP_TYPES.includes(x.ev.eventType) && x.end - x.start < CCK_LONG_MIN * 60000 && cckCommitted(x.resp));
  const meetings = busy.filter(x => x.others.length > 0);

  const raw = [];
  // Several copies of one series fold into the first (the row says "+N more").
  const fold = (groups, gk, item) => {
    const g = groups.get(gk);
    if (!g) { groups.set(gk, item); raw.push(item); return; }
    g.more = (g.more || 0) + 1;
    g.until = Math.max(g.until, item.until);
  };

  if (checks.reply) {
    const groups = new Map();
    for (const x of evs) {
      if (x.resp !== 'needsAction' && x.resp !== 'tentative') continue;
      if (x.start <= now) continue;                       // under way: too late to answer here
      const overlaps = x.allDay ? [] : busy.filter(y => y.id !== x.id && Math.min(y.end, x.end) - Math.max(y.start, x.start) >= CCK_OVERLAP_MIN * 60000).map(y => ({ id: y.id, title: y.title }));
      const kind = x.resp === 'tentative' ? 'maybe' : 'reply';
      const gk = kind + '|' + (x.recurring ? x.series : x.id + '@' + x.start);
      const org = _cckOrg(x.ev, mine);
      fold(groups, gk, {
        kind, key: cckKey(kind, x.recurring ? ['s', x.series] : [x.id, x.start]), id: x.id, ev: x.ev, title: x.title, start: x.start, end: x.end, allDay: x.allDay,
        response: x.resp, organizer: org, guests: x.others.length, overlaps, more: 0, until: x.end,
      });
    }
  }
  if (checks.clash) {
    const groups = new Map();
    for (let i = 0; i < busy.length; i++) {
      const a = busy[i];
      for (let j = i + 1; j < busy.length; j++) {
        const b = busy[j];
        if (b.start >= a.end) break;                      // sorted by start: nothing later overlaps a
        const s = Math.max(a.start, b.start), e = Math.min(a.end, b.end);
        if (e - s < CCK_OVERLAP_MIN * 60000 || e <= now) continue;
        if (a.recurring && b.recurring && a.series === b.series) continue;
        const pair = [a, b].map(x => (x.recurring ? 's:' + x.series : x.id)).sort();
        const anySeries = a.recurring || b.recurring;
        const gk = pair.join('|') + (anySeries ? '' : '@' + s);
        const side = (x) => ({ id: x.id, ev: x.ev, title: x.title, start: x.start, end: x.end });
        fold(groups, gk, {
          kind: 'clash', key: cckKey('clash', anySeries ? pair : pair.concat([s])), id: a.id, ev: a.ev, title: a.title + ' / ' + b.title,
          start: s, end: e, allDay: false, a: side(a), b: side(b), minutes: Math.round((e - s) / 60000), more: 0, until: Math.max(a.end, b.end),
        });
      }
    }
  }
  if (checks.b2b) {
    const today = _cckDay(now), tomorrow = _cckNextDay(today);
    for (const day of [today, tomorrow]) {
      const ms = meetings.filter(x => _cckDay(x.start) === day);
      let run = [];
      const flush = () => {
        if (run.length >= 2) {
          const s = run[0].start, e = Math.max(...run.map(x => x.end));
          if (e - s >= CCK_B2B_MIN * 60000 && e > now) {
            raw.push({ kind: 'b2b', key: cckKey('b2b', [day, run[0].id]), id: run[0].id, ev: run[0].ev, title: run.map(x => x.title).join(', '), start: s, end: e, allDay: false,
              ids: run.map(x => x.id), titles: run.map(x => x.title), minutes: Math.round((e - s) / 60000), count: run.length, date: day, more: 0, until: e });
          }
        }
        run = [];
      };
      for (const x of ms) {
        const runEnd = run.length ? Math.max(...run.map(y => y.end)) : -Infinity;
        if (run.length && x.start - runEnd >= CCK_GAP_MIN * 60000) flush();
        run.push(x);
      }
      flush();
    }
  }
  if (checks.link) {
    for (const x of evs) {
      if (x.allDay || x.others.length === 0 || x.ev.free || _CCK_SKIP_TYPES.includes(x.ev.eventType)) continue;
      if (!(cckCommitted(x.resp) || x.resp === 'tentative')) continue;
      if (x.start <= now || x.start > now + 864e5 || cckHasJoin(x.ev)) continue;
      const org = _cckOrg(x.ev, mine);
      raw.push({ kind: 'link', key: cckKey('link', [x.id, x.start]), id: x.id, ev: x.ev, title: x.title, start: x.start, end: x.end, allDay: false,
        others: x.others.length, mine: x.resp === 'organizer' || x.resp === 'own', organizer: org, more: 0, until: x.end });
    }
  }
  if (checks.hours && wh) {
    const groups = new Map();
    const wdays = Array.isArray(wh.days) && wh.days.length ? wh.days : [1, 2, 3, 4, 5];
    for (const x of meetings) {
      if (x.start <= now) continue;
      const dow = _cckDow(x.start);
      const sMin = _cckMinOf(x.start);
      const eMin = _cckDay(x.end) === _cckDay(x.start) ? _cckMinOf(x.end) : 24 * 60;
      const why = !wdays.includes(dow) ? 'dayoff' : sMin < wh.startMin ? 'early' : eMin > wh.endMin ? 'late' : '';
      if (!why) continue;
      const gk = x.recurring ? 's:' + x.series : x.id + '@' + x.start;
      fold(groups, gk, { kind: 'hours', key: cckKey('hours', x.recurring ? ['s', x.series] : [x.id, x.start]), id: x.id, ev: x.ev, title: x.title, start: x.start, end: x.end, allDay: false,
        why, more: 0, until: x.end });
    }
  }

  const items = raw.filter(it => !(Number(dismissed[it.key]) > now));
  const rank = (k) => { const i = CCK_ORDER.indexOf(k); return i < 0 ? 99 : i; };
  items.sort((a, b) => rank(a.kind) - rank(b.kind) || a.start - b.start || a.title.localeCompare(b.title));
  const counts = { reply: 0, maybe: 0, clash: 0, b2b: 0, link: 0, hours: 0 };
  for (const it of items) counts[it.kind] = (counts[it.kind] || 0) + 1;
  let nearest = null;
  for (const it of items) if (!nearest || it.start < nearest.start) nearest = it;
  return { items, counts, total: items.length, nearest };
}
