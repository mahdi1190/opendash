/* ============================================================
   HOW MUCH FREEFLO READS YOUR EMAIL (2.35, docs/dev/ACCOUNTS.md "How much it reads"). The owner, 1 Nov 2026, for a friend: "having all of your emails and making tasks and calendar stuff off the
   emails, configurable based on what people need: how much do we read emails, how sensitive tasks are, how often we make tasks and scrape."

   One set of choices (uiPrefs.emailRead, synced), with three ready-made levels:
     every      how often Claude looks for tasks and events by itself, and the inbox is read: minutes, or 'off' (only when you press Suggest tasks)
     days       how far back the inbox is read (each kind of account has its own limit: lib/inbox-sources)
     batch      how many emails Claude reads in one go
     picky      how sure Claude must be for a suggestion: strict, normal or open
     calendar   whether it suggests calendar events too. An event is always yours to add: nothing reaches a calendar by itself, and it never carries guests
     auto       'ask', or 'sure': a task it is very sure of (GL_READ_SURE) is added straight away, with Undo. Off by default: an email is written by a stranger
     bulk       leave out automated senders and promotions before Claude reads anything
     known      only read email from people in your People list
     ignore     addresses or domains Claude never reads, one per line
   Filters run on this computer, before anything is sent. The mail itself is still fetched and listed: this decides what Claude reads, and how often.
   ============================================================ */
const EMAIL_READ_DEFAULT = Object.freeze({ every: '60', days: 14, batch: 40, picky: 'normal', calendar: true, auto: 'ask', bulk: false, known: false, ignore: '' });
const EMAIL_READ_LEVELS = Object.freeze({
  light: Object.freeze({ every: '1440', days: 7, batch: 20, picky: 'strict', calendar: false, auto: 'ask', bulk: true, known: false }),
  normal: Object.freeze({ every: '60', days: 14, batch: 40, picky: 'normal', calendar: true, auto: 'ask', bulk: false, known: false }),
  thorough: Object.freeze({ every: '30', days: 30, batch: 100, picky: 'open', calendar: true, auto: 'ask', bulk: false, known: false }),
});
const EMAIL_READ_LEVEL_NAMES = Object.freeze([['light', 'Light: once a day, only clear requests'], ['normal', 'Balanced: every hour'], ['thorough', 'Thorough: every 30 minutes, catches more'], ['custom', 'My own choices']]);
const EMAIL_READ_EVERY = Object.freeze([['30', 'Every 30 minutes'], ['60', 'Every hour'], ['240', 'Every 4 hours'], ['1440', 'Once a day'], ['off', 'Only when I ask']]);
const EMAIL_READ_DAYS = Object.freeze([['3', 'The last 3 days'], ['7', 'The last week'], ['14', 'The last 2 weeks'], ['30', 'The last month'], ['60', 'The last 2 months']]);
const EMAIL_READ_BATCH = Object.freeze([['20', '20 emails'], ['40', '40 emails'], ['100', '100 emails'], ['200', '200 emails']]);
const EMAIL_READ_PICKY = Object.freeze([['strict', 'Only clear requests'], ['normal', 'Balanced'], ['open', 'Catch more, even if some are not needed']]);
const EMAIL_READ_AUTO = Object.freeze([['ask', 'Ask me first'], ['sure', 'Add tasks it is very sure of, with Undo']]);
const EMAIL_READ_MIN = Object.freeze({ strict: 0.75, normal: 0.5, open: 0.3 });
const EMAIL_READ_SAY = Object.freeze({
  strict: 'Be strict: only when the email clearly asks for something and you are very sure.',
  normal: 'Be conservative: only when you are fairly sure.',
  open: 'Lean towards including: if the email might need something done, suggest it, with a lower confidence.',
});
const GL_READ_SURE = 0.85;

function emailReadPrefs() {
  const raw = typeof uiPrefGet === 'function' ? uiPrefGet('emailRead') : null, o = Object.assign({}, EMAIL_READ_DEFAULT, raw && typeof raw === 'object' ? raw : {});
  const one = (list, v, d) => (list.some(x => x[0] === String(v)) ? v : d);
  return {
    every: String(one(EMAIL_READ_EVERY, o.every, EMAIL_READ_DEFAULT.every)), days: Number(one(EMAIL_READ_DAYS, o.days, EMAIL_READ_DEFAULT.days)), batch: Number(one(EMAIL_READ_BATCH, o.batch, EMAIL_READ_DEFAULT.batch)),
    picky: String(one(EMAIL_READ_PICKY, o.picky, 'normal')), calendar: o.calendar !== false, auto: o.auto === 'sure' ? 'sure' : 'ask', bulk: o.bulk === true, known: o.known === true, ignore: typeof o.ignore === 'string' ? o.ignore.slice(0, 4000) : '',
  };
}
function emailReadSet(patch) { uiPrefSet('emailRead', Object.assign(emailReadPrefs(), patch)); }
/** Which ready-made level these choices are, or 'custom'. */
function emailReadLevel(p) {
  for (const [id, L] of Object.entries(EMAIL_READ_LEVELS)) if (Object.keys(L).every(k => String(L[k]) === String(p[k]))) return id;
  return 'custom';
}
/** How long between automatic runs (ms), or 0 when it only runs when you ask. */
function emailReadMs() { const p = emailReadPrefs(); return p.every === 'off' ? 0 : Number(p.every) * 60000; }
function _emReadList(text) { return String(text || '').split(/[\s,;]+/).map(x => x.trim().toLowerCase().replace(/^@/, '')).filter(Boolean).slice(0, 300); }
function _emAddressOf(m) {
  const e = m && m.from && m.from.email ? String(m.from.email) : '';
  if (e) return e.toLowerCase();
  const x = /[^\s<>"']+@[^\s<>"']+/.exec(String((m && m.sender) || ''));
  return x ? x[0].toLowerCase() : '';
}
/** May Claude read this one? Decided here, before anything is sent. */
function emailReadAllowed(m, p, ignore) {
  const addr = _emAddressOf(m), dom = addr.slice(addr.lastIndexOf('@') + 1);
  if (addr && (ignore || []).some(x => x === addr || x === dom || dom.endsWith('.' + x))) return false;
  const inPeople = !!addr && (state.people || []).some(q => q && !q.self && (typeof pplPersonEmails === 'function' ? pplPersonEmails(q) : [q.email]).some(a => String(a || '').toLowerCase() === addr));
  if (p.known && !inPeople) return false;
  if (p.bulk && !inPeople) {
    if (typeof homeMailIsAutomated === 'function' && homeMailIsAutomated(addr)) return false;
    const cats = [].concat(m.category || [], m.categories || [], m.labels || []).map(c => String(c).toLowerCase());
    if (typeof HOME_MAIL_SKIP_CATS !== 'undefined' && cats.some(c => HOME_MAIL_SKIP_CATS.some(s => c.includes(s)))) return false;
  }
  return true;
}
/* ---------- calendar events it found ---------- */
function _emLocalDay(offset) { const d = new Date(); d.setDate(d.getDate() + (offset || 0)); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }   // clock-ok: the user's own today
/** What came back from Claude, checked: a real date soon enough, a real time, plain short text. Anything else is left out. */
function emailEventClean(e, ids, min) {
  if (!e || !ids.has(e.emailId) || (typeof e.confidence === 'number' && e.confidence < min)) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(e.date || '')) ? e.date : null, title = String(e.title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!date || !title || Number.isNaN(Date.parse(date + 'T12:00:00')) || date < _emLocalDay(0) || date > _emLocalDay(400)) return null;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(String(e.time || '')) ? e.time : null;
  const mins = Number.isInteger(e.durationMin) && e.durationMin >= 5 && e.durationMin <= 1440 ? e.durationMin : 60;
  return { emailId: e.emailId, title, date, time, mins, location: String(e.location || '').replace(/\s+/g, ' ').trim().slice(0, 120), confidence: typeof e.confidence === 'number' ? e.confidence : null };
}
function emailEventAdd(t, clean, id) {
  if (!Array.isArray(t.events)) t.events = [];
  if (t.events.some(x => x.emailId === clean.emailId && x.date === clean.date && x.title.toLowerCase() === clean.title.toLowerCase())) return false;
  t.events.push(Object.assign({ id, status: 'pending', at: Date.now() }, clean));   // clock-ok: when it was found
  t.events = t.events.filter(x => x.status === 'pending' || Date.now() - (x.at || 0) < 30 * 86400000).slice(-100);   // clock-ok: tidying
  return true;
}
function emailEventWhen(s) {
  const d = new Date(s.date + 'T' + (s.time || '12:00') + ':00');
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  return s.time ? `${day}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : `${day}, all day`;
}
async function emailEventAccept(id, btn) {
  const t = _emTriage(), s = (t.events || []).find(x => x.id === id);
  if (!s || s.status !== 'pending') return;
  if (btn) btn.disabled = true;
  const email = typeof emailById === 'function' ? emailById(s.emailId) : null;
  const body = { title: s.title, location: s.location || undefined, description: email && email.subject ? 'From an email: ' + String(email.subject).slice(0, 200) : undefined };
  if (s.time) { const a = new Date(s.date + 'T' + s.time + ':00'); body.start = a; body.end = new Date(a.getTime() + s.mins * 60000); }
  else { const n = new Date(s.date + 'T12:00:00'); n.setDate(n.getDate() + 1); body.allDay = true; body.start = s.date; body.end = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`; }   // (the end day of an all-day event is the day after)
  const r = await window.CalWrite.create(body);
  if (r && r.ok) { s.status = 'accepted'; saveData(); render(); return; }
  if (btn) btn.disabled = false;
}
function emailEventDismiss(id) {
  const s = (_emTriage().events || []).find(x => x.id === id); if (!s) return;
  s.status = 'dismissed'; saveData(); render();
  toast('Event suggestion dismissed', { action: { label: 'Undo', run: () => { s.status = 'pending'; saveData(); render(); } } });
}
/** The suggested events, on the Email triage page. */
function emailEventsSection(page) {
  const list = (_emTriage().events || []).filter(s => s.status === 'pending');
  if (!list.length) return;
  const sec = document.createElement('section'); sec.className = 'em-sec';
  sec.innerHTML = `<div class="section-h"><h2>Suggested calendar events</h2><span class="n">${list.length}</span><span class="spacer"></span></div>`;
  const box = document.createElement('div'); box.className = 'em-sugs';
  for (const s of list) {
    const email = typeof emailById === 'function' ? emailById(s.emailId) : null;
    const card = document.createElement('div'); card.className = 'em-sug';
    const b = document.createElement('div'); b.className = 'em-sug-b';
    const ti = document.createElement('div'); ti.className = 'em-sug-t'; ti.textContent = s.title;
    const d = document.createElement('div'); d.className = 'em-sug-d'; d.textContent = emailEventWhen(s) + (s.location ? ' · ' + s.location : '');
    const m = document.createElement('div'); m.className = 'em-sug-m'; m.textContent = email ? `From: ${email.subject || ''}` : '';
    b.append(ti, d, m);
    const a = document.createElement('div'); a.className = 'em-sug-a';
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-primary btn-sm'; add.textContent = 'Add to calendar'; add.onclick = () => emailEventAccept(s.id, add);
    const no = document.createElement('button'); no.type = 'button'; no.className = 'btn btn-ghost btn-sm'; no.textContent = 'Not this'; no.onclick = () => emailEventDismiss(s.id);
    a.append(add, no);
    card.append(b, a); box.appendChild(card);
  }
  sec.appendChild(box); page.appendChild(sec);
}
