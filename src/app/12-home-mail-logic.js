/* ============================================================
   MAIL LOGIC (pure; owner: Home foundations W0-C)
   ------------------------------------------------------------
   Which email threads need the user, and the plain-text drafts the
   dashboard offers. No DOM and no globals: everything comes in as
   arguments, so Node (lib/mail-logic.mjs) and the page agree.

   homeNeedsReply(messages, triage, o) -> [Row]   the inbox cut down to what needs a reply
     messages = inbox threads (GET /api/inbox: {id, subject, from:{name,email}, date,
                unread, important, category?, count, link, lastMessageId?})
     triage   = state.emailTriage ({handled:{[threadId]:{action}}})
     o = {myEmails, peopleIdx, maxDays (14), knownOnly (false), now (ms),
          taskThreads (Set of thread ids an open task already relates to), limit}
       peopleIdx: a Map address -> personId (pplIndex().email), or {email: Map}
     Keeps threads that are not handled, not linked to a task, whose newest
     message is not from the user, not promotions / social / updates / forums,
     not from a noreply or notification address, with a sender address, and
     newer than maxDays. Order: people you know first, then important, then
     oldest first.
     Row = {id, m, email, name, first, personId, known, important, unread, count, ageDays, lastMessageId}
   homeNeedsReplySummary(rows) -> {count, known, oldestKnown: Row|null}
   homeMailIsAutomated(email)  noreply@, notifications@, mailer-daemon@ ...
   homeMailFirstName(name, email), homeMailAgeDays(iso, now)
   homeMailReplySubject(subject)            "Re: <subject>" (once)
   homeMailQuickTaskTitle(row|message)      "Reply to <first>: <subject>"
   homeMailDraftTemplate(kind, {first, me, taskTitle, line})   kind: nudge | reply | note
   ============================================================ */

const HOME_MAIL_SKIP_CATS = ['promotions', 'social', 'updates', 'forums'];
// Automated senders and role mailboxes: no person waits for the user's reply
// (local part of the address; only applied to senders who are not in People).
const HOME_MAIL_AUTO_RE = new RegExp('(^|[._+-])(no-?reply|do-?not-?reply|donotreply|noreply\\d*|notifications?|notify|alerts?|mailer-daemon|mailer|postmaster|bounces?'
  + '|newsletters?|news|digest|automated|auto-?confirm|robot|daemon|marketing|info|hello|updates?|offers?|deals|promos?|promotions?|mailing|campaigns?'
  + '|community|events?|webinars?|receipts?|orders?|billing|invoices?|accounts?|support|help|service|feedback|surveys?)([._+-]|\\d|$)', 'i');

function homeMailIsAutomated(email) {
  const e = String(email || '').trim().toLowerCase();
  const at = e.lastIndexOf('@');
  if (at < 1) return false;
  return HOME_MAIL_AUTO_RE.test(e.slice(0, at));
}
function homeMailAgeDays(iso, now) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor(((Number.isFinite(now) ? now : Date.now()) - t) / 86400000));
}
/** "Sam Lee" -> "Sam"; "sam.lee@example.com" -> "Sam"; '' -> ''. */
function homeMailFirstName(name, email) {
  const n = String(name || '').replace(/["']/g, '').trim();
  if (n && !/@/.test(n)) {
    // "Lee, Sam" -> "Sam"
    const parts = n.includes(',') ? n.split(',').map(s => s.trim()).filter(Boolean).reverse().join(' ') : n;
    const w = parts.split(/\s+/).filter(Boolean)[0] || '';
    if (w && !/^(dr|prof|mr|mrs|ms|miss|sir)\.?$/i.test(w)) return w;
    return parts.split(/\s+/).filter(Boolean)[1] || w;
  }
  const local = String(email || n || '').split('@')[0] || '';
  const w = local.split(/[._+-]/).filter(x => x && /[a-z]/i.test(x))[0] || '';
  return w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
}
function _homeMailIdx(idx) {
  if (!idx) return null;
  if (typeof idx.get === 'function' && typeof idx.has === 'function') return idx;
  if (idx.email && typeof idx.email.get === 'function') return idx.email;
  return null;
}
function homeNeedsReply(messages, triage, o) {
  o = o || {};
  const now = Number.isFinite(o.now) ? o.now : Date.now();
  const maxDays = Number.isFinite(o.maxDays) && o.maxDays > 0 ? o.maxDays : 14;
  const handled = triage && triage.handled && typeof triage.handled === 'object' ? triage.handled : {};
  const mine = new Set((Array.isArray(o.myEmails) ? o.myEmails : []).map(x => String(x || '').trim().toLowerCase()).filter(Boolean));
  const idx = _homeMailIdx(o.peopleIdx);
  // A Set (any realm: the page, a VM, Node) or a list.
  const linked = o.taskThreads && typeof o.taskThreads.has === 'function' ? o.taskThreads : new Set(Array.isArray(o.taskThreads) ? o.taskThreads : []);
  const out = [];
  const seen = new Set();
  for (const m of Array.isArray(messages) ? messages : []) {
    if (!m || typeof m.id !== 'string' || !m.id || seen.has(m.id)) continue;
    seen.add(m.id);
    if (handled[m.id] || linked.has(m.id)) continue;
    const email = String((m.from && m.from.email) || '').trim().toLowerCase();
    if (!email || mine.has(email)) continue;
    if (m.category && HOME_MAIL_SKIP_CATS.includes(String(m.category).toLowerCase())) continue;
    const known = !!(idx && idx.has(email));
    if (o.knownOnly && !known) continue;
    if (!known && homeMailIsAutomated(email)) continue;
    const ageDays = homeMailAgeDays(m.date, now);
    if (ageDays == null || ageDays > maxDays) continue;
    const name = String((m.from && m.from.name) || '').trim() || email;
    out.push({
      id: m.id, m, email, name, first: homeMailFirstName(m.from && m.from.name, email),
      personId: known ? (idx.get(email) || null) : null, known,
      important: !!m.important, unread: !!m.unread, count: Math.max(1, Number(m.count) || 1), ageDays,
      lastMessageId: typeof m.lastMessageId === 'string' ? m.lastMessageId : null,
    });
  }
  out.sort((a, b) => (b.known - a.known) || (b.important - a.important) || (String(a.m.date) < String(b.m.date) ? -1 : String(a.m.date) > String(b.m.date) ? 1 : 0) || (a.id < b.id ? -1 : 1));
  return Number.isFinite(o.limit) && o.limit > 0 ? out.slice(0, o.limit) : out;
}
function homeNeedsReplySummary(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const known = list.filter(r => r.known);
  // The oldest thread from someone you know (rows are already oldest-first within "known").
  return { count: list.length, known: known.length, oldestKnown: known.length ? known.reduce((a, b) => (b.ageDays > a.ageDays ? b : a)) : null };
}
function homeMailReplySubject(subject) {
  const s = String(subject || '').replace(/[\r\n\t]+/g, ' ').trim() || '(no subject)';
  return /^re:/i.test(s) ? s : 'Re: ' + s;
}
function homeMailQuickTaskTitle(r) {
  const m = r && r.m ? r.m : r || {};
  const first = (r && r.first) || homeMailFirstName(m.from && m.from.name, m.from && m.from.email) || 'them';
  return `Reply to ${first}: ${String(m.subject || '(no subject)').replace(/[\r\n\t]+/g, ' ').trim()}`.slice(0, 140);
}
/** Plain-text bodies (no AI): the user finishes them in the editor or in Gmail. */
function homeMailDraftTemplate(kind, o) {
  o = o || {};
  const hi = o.first ? `Hi ${o.first},` : 'Hi,';
  const me = String(o.me || '').trim();
  if (kind === 'nudge') {
    const what = String(o.taskTitle || '').trim();
    return `${hi}\n\nJust checking in${what ? ' on ' + what : ''}. Is there anything you need from me?\n\nThanks,${me ? '\n' + me : ''}`;
  }
  if (kind === 'reply') return `${hi}\n\n\n\nBest,${me ? '\n' + me : ''}`;
  const line = String(o.line || '').trim();
  return `${hi}\n\n${line}\n\n${me}`.replace(/\n+$/, '');
}
