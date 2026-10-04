/* ============================================================
   NEEDS REPLY: the pure part of the Home widget "inbox" (12-home-w-inbox.js).
   OWNER: the "inbox" widget builder (WIDGETS_CATALOGUE.md 3.7).
   No DOM and no page globals: everything comes in as arguments, so
   tests/home-w-inbox.test.mjs runs it in a VM. It loads before 12-home.js
   (build order): declarations only. Which threads need the user is
   homeNeedsReply (12-home-mail-logic.js); this file shapes them for the widget.

   homeInboxCap(size)                  rows shown: s 0, m 6, l 6, full 8
   homeInboxModel(rows, o)             {count, known, oldestKnown, shown, more, cap}
                                       o = {size}
   homeInboxSummary(model)             the small size's lines: {big, unit, known, oldest}
   homeInboxStale(fetchedAt, now)      older than 6 hours (the Update button shows)
   homeInboxRowKey(row)                the enter-once key: the newest message id, else the thread id
   homeInboxAgeText(days)              'today', '1 day', '3 days', '2 weeks', '3 months'
   homeInboxTaskPrefill(row, o)        the task card's prefill: the same task the ✓ adds
                                       (emailQuickTask): "Reply to <first>: <subject>", due
                                       today, the sender linked when known, tag email
                                       o = {today, link, sender}
   homeInboxSuggestionPrefill(s, o)    the task card's prefill for one of Claude's suggestions
                                       (the same task acceptSuggestion adds)
                                       o = {today, email, link, sender, streams}
   homeInboxPending(triage, o)         Claude's pending suggestions whose thread still needs
                                       the user, newest first; o = {limit}
   homeInboxAddDays(iso, n)            'YYYY-MM-DD' + n days (local calendar arithmetic)
   homeInboxIgnore(parsed)             the raw words parseQuickAdd found in a prefilled title:
                                       the card leaves them as text (an email subject such as
                                       "Lunch on Friday #budget" must not move the due date)
   homeInboxFoldUndo(stack, mark)      fold every undo entry pushed after `mark` into it (the
                                       card's Save adds the task, then marks the thread
                                       handled: one Undo takes both back). -> entries folded
   homeInboxParseFrom(text)            '"Sam Lee" <sam@x.org>' -> {name, email}
   homeInboxSampleRows(emails, o)      the gallery preview's rows from the shared sample kit
                                       o = {now, known: n (the first n are "people you know")}
   ============================================================ */

const HOME_INBOX_STALE_MS = 6 * 3600 * 1000;
const _HOME_INBOX_CAP = Object.freeze({ s: 0, m: 6, l: 6, full: 8 });

function homeInboxCap(size) {
  return Object.prototype.hasOwnProperty.call(_HOME_INBOX_CAP, size) ? _HOME_INBOX_CAP[size] : _HOME_INBOX_CAP.m;
}

/** The rows to draw for a size, plus the counts the header and the small size show. */
function homeInboxModel(rows, o) {
  o = o || {};
  const list = Array.isArray(rows) ? rows.filter(r => r && r.id) : [];
  const known = list.filter(r => r.known);
  // The oldest thread from someone the user knows (ties: the first, which homeNeedsReply put oldest-first).
  let oldestKnown = null;
  for (const r of known) if (!oldestKnown || (Number(r.ageDays) || 0) > (Number(oldestKnown.ageDays) || 0)) oldestKnown = r;
  const cap = homeInboxCap(o.size);
  const shown = list.slice(0, cap);
  return { count: list.length, known: known.length, oldestKnown, shown, more: Math.max(0, list.length - shown.length), cap };
}

function homeInboxAgeText(days) {
  const d = Math.max(0, Math.round(Number(days) || 0));
  if (d < 1) return 'today';
  if (d === 1) return '1 day';
  if (d < 14) return d + ' days';
  if (d < 60) return Math.round(d / 7) + ' weeks';
  return Math.max(2, Math.round(d / 30.44)) + ' months';
}

/** The small size: "3" "need a reply", "2 from people you know", "Sam · 3 days". */
function homeInboxSummary(model) {
  const m = model || { count: 0, known: 0, oldestKnown: null };
  const n = Math.max(0, Number(m.count) || 0);
  const k = Math.max(0, Number(m.known) || 0);
  const o = m.oldestKnown;
  return {
    big: String(n),
    unit: n === 1 ? 'needs a reply' : 'need a reply',
    known: n === 0 ? '' : k === n ? (n === 1 ? 'from someone you know' : 'all from people you know') : k ? `${k} from people you know` : 'none from people you know',
    oldest: o ? `${o.first || o.name || 'Someone'} · ${homeInboxAgeText(o.ageDays)}` : '',
  };
}

/** Older than 6 hours, or never fetched: offer Update. */
function homeInboxStale(fetchedAt, now) {
  const t = Date.parse(fetchedAt || '');
  if (!Number.isFinite(t)) return true;
  return (Number.isFinite(now) ? now : Date.now()) - t > HOME_INBOX_STALE_MS;
}

/** New threads enter once: keyed by the newest message, so a new reply in a thread counts as new. */
function homeInboxRowKey(r) {
  if (!r) return '';
  return 'in:' + (r.lastMessageId || (r.m && r.m.lastMessageId) || r.id);
}

function homeInboxAddDays(iso, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + (Number(n) || 0), 12);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;   // clock-ok: wall date
}

function _homeInboxClean(s, max) { return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200); }
function _homeInboxDetail(sender, subject, link) {
  return `From: ${_homeInboxClean(sender, 200) || 'Unknown sender'}\nSubject: ${_homeInboxClean(subject, 200) || '(no subject)'}${/^https:\/\//.test(String(link || '')) ? '\n' + link : ''}`;
}

/**
 * The prefilled task card for a thread: exactly what the ✓ (emailQuickTask) adds, so
 * Save without changes gives the same task. -> {title, date, priority, tags, people, detail}
 */
function homeInboxTaskPrefill(r, o) {
  o = o || {};
  const m = (r && r.m) || r || {};
  const first = (r && r.first) || 'them';
  // The same title the ✓ gives (12-home-mail-logic.js), when that file is there.
  const title = typeof homeMailQuickTaskTitle === 'function'
    ? homeMailQuickTaskTitle({ m, first })
    : `Reply to ${first}: ${_homeInboxClean(m.subject, 200) || '(no subject)'}`.slice(0, 140);
  return {
    title,
    date: o.today || null, priority: 'p0', tags: ['email'],
    people: r && r.personId ? [r.personId] : [],
    detail: _homeInboxDetail(o.sender || (r && r.name) || (m.from && (m.from.name || m.from.email)), m.subject, o.link),
  };
}

/**
 * The prefilled task card for one of Claude's suggestions (emailTriage.suggestions):
 * what acceptSuggestion adds. -> {title, date, priority, tags, people, detail, stream}
 */
function homeInboxSuggestionPrefill(s, o) {
  o = o || {};
  s = s || {};
  const due = Number.isInteger(s.dueHint) && s.dueHint >= 0 && s.dueHint < 400 && o.today ? homeInboxAddDays(o.today, s.dueHint) : null;
  const tags = [...new Set(['email', ...(Array.isArray(s.tags) ? s.tags : [])])].filter(x => typeof x === 'string' && x && x !== 'from-email');
  const email = o.email || null;
  const parts = [_homeInboxClean(s.detail, 600), email ? _homeInboxDetail(o.sender || (email.from && (email.from.name || email.from.email)) || email.sender, email.subject, o.link) : ''].filter(Boolean);
  const streams = o.streams && typeof o.streams === 'object' ? o.streams : null;
  return {
    title: _homeInboxClean(s.title, 200) || '(untitled)',
    date: due, priority: /^p[0-3]$/.test(String(s.priority || '')) ? s.priority : 'p3', tags,
    people: Array.isArray(s.peopleIds) ? s.peopleIds.filter(x => typeof x === 'string' && x).slice(0, 5) : [],
    detail: parts.join('\n\n'),
    ...(s.stream && (!streams || Object.prototype.hasOwnProperty.call(streams, s.stream)) ? { stream: s.stream } : {}),
  };
}

/** Claude's pending suggestions whose thread is not handled yet, newest first. */
function homeInboxPending(triage, o) {
  o = o || {};
  const t = triage && typeof triage === 'object' ? triage : {};
  const handled = t.handled && typeof t.handled === 'object' ? t.handled : {};
  const list = (Array.isArray(t.suggestions) ? t.suggestions : [])
    .filter(s => s && s.id && s.status === 'pending' && !(s.emailId && handled[s.emailId]))
    .sort((a, b) => (Number(b.at) || 0) - (Number(a.at) || 0) || (String(a.id) < String(b.id) ? -1 : 1));
  return Number.isFinite(o.limit) && o.limit > 0 ? list.slice(0, o.limit) : list;
}

/** The raw words the quick-add parser recognised in a title (dates, #tags, !p1 ...). */
function homeInboxIgnore(parsed) {
  const toks = parsed && Array.isArray(parsed.tokens) ? parsed.tokens : [];
  const out = [];
  for (const t of toks) {
    const raw = t && typeof t.raw === 'string' ? t.raw : '';
    if (raw && !out.includes(raw)) out.push(raw);
  }
  return out.slice(0, 40);
}

/** Fold the undo entries pushed after `mark` into it (as selUndoGroup does). -> how many were folded */
function homeInboxFoldUndo(stack, mark) {
  if (!Array.isArray(stack) || mark == null) return 0;
  const i = stack.lastIndexOf(mark);
  if (i < 0) return 0;
  const n = stack.length - (i + 1);
  if (n > 0) stack.splice(i + 1);
  return n;
}

/** '"Sam Lee" <sam@x.org>' / 'sam@x.org' / {name, email} -> {name, email} (email lower-case). */
function homeInboxParseFrom(v) {
  if (v && typeof v === 'object') return { name: _homeInboxClean(v.name, 120), email: _homeInboxClean(v.email, 200).toLowerCase() };
  const s = _homeInboxClean(v, 300);
  const m = /^(.*?)<([^<>\s]+@[^<>\s]+)>\s*$/.exec(s);
  if (m) return { name: m[1].replace(/["']/g, '').trim(), email: m[2].toLowerCase() };
  return /@/.test(s) ? { name: '', email: s.toLowerCase() } : { name: s, email: '' };
}

/** Rows shaped like homeNeedsReply's, from the sample kit's emails (the gallery preview only). */
function homeInboxSampleRows(emails, o) {
  o = o || {};
  const now = Number.isFinite(o.now) ? o.now : Date.now();
  const known = Number.isFinite(o.known) ? o.known : 2;
  return (Array.isArray(emails) ? emails : []).filter(e => e && e.id).map((e, i) => {
    const from = homeInboxParseFrom(e.from);
    const t = Date.parse(e.date || '');
    const name = from.name || from.email || 'Someone';
    return {
      id: e.id, email: from.email, name, first: name.split(/\s+/)[0] || name,
      m: { id: e.id, subject: e.subject || '(no subject)', from, date: e.date || null, count: Math.max(1, Number(e.threadCount) || 1), link: '' },
      personId: null, known: i < known, important: i === 0, unread: i !== 1,
      count: Math.max(1, Number(e.threadCount) || 1),
      ageDays: Number.isFinite(t) ? Math.max(0, Math.floor((now - t) / 86400000)) : 0,
      lastMessageId: null,
    };
  });
}
