/* ============================================================
   HOME widget "owe" (I owe): the pure rules. OWNER: the "owe" widget builder
   (WIDGETS_CATALOGUE.md 3.8). No DOM, no state, no clock: everything comes in
   as arguments, so tests run it in a VM. The page side is 12-home-w-owe.js.

   homeOweList(items, o) -> [Row]   promises the user made to other people
     items: tasks [{id, title, status, due, createdAt, startDate, people: [personId]}]
     o: {today (YYYY-MM-DD), selfIds | selfId, snoozed {taskId: last hidden day},
         isWaiting(item) (the page passes both waiting rules), and optional readers
         statusOf(item), dueOf(item), titleOf(item), peopleOf(item) (page: effDate...)}
     Keeps open tasks (not done or won't do) linked to someone who is not the user,
     not waiting on anyone, already started (startDate <= today) and not snoozed on
     Home. Order: overdue, then the soonest due, then the oldest created; then title.
     Row = {id, item, title, people [ids, the user left out], due, late (days, 0 when
            not late), dueIn (days | null), created (YYYY-MM-DD | null), age (days | null)}
   homeOweGroups(rows) -> [{personId, rows, oldest: Row}]   by each row's first person,
     in the order of their first (most pressing) row
   homeOweEmailRows(replyRows, o) -> the needs-reply rows (homeNeedsReply) from people
     the user knows, waiting more than o.minDays (2) days, at most o.limit (2)
   homeOweWhen(row) -> 'late' | 'today' | 'due' | 'age' | ''  and homeOweWhenText(row, o)
   homeOweDraft({first, me, items: [{title, due}], dueLabel(iso), today}) -> {subject, body}
     the plain-text draft "Write" opens (one item, or a person's list at Large);
     the user finishes it in the editor; it is only ever saved as a draft
   ============================================================ */

function _howDays(a, b) {
  const p = (s) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
  const d = Math.round((p(b) - p(a)) / 86400000);
  return Number.isFinite(d) ? d : null;
}
/** A createdAt (ms, ISO or YYYY-MM-DD) as a local YYYY-MM-DD, or null. */
function _howIsoOf(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(typeof v === 'number' ? v : String(v));
  if (isNaN(d)) return null;
  if (typeof Clock !== 'undefined') return Clock.parts(d.getTime()).iso;   // the page's day (travel spec 2.7)
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;   // clock-ok: Node fallback
}

function homeOweList(items, o) {
  o = o || {};
  const today = String(o.today || '');
  const self = new Set([].concat(o.selfIds ? [...o.selfIds] : [], o.selfId ? [o.selfId] : []).filter(Boolean));
  const snoozed = o.snoozed && typeof o.snoozed === 'object' ? o.snoozed : {};
  const isWaiting = typeof o.isWaiting === 'function' ? o.isWaiting : (i) => !!(i && (i.waiting === true || i.status === 'waiting'));
  const statusOf = typeof o.statusOf === 'function' ? o.statusOf : (i) => i.status;
  const dueOf = typeof o.dueOf === 'function' ? o.dueOf : (i) => i.due || i.dueDate || null;
  const titleOf = typeof o.titleOf === 'function' ? o.titleOf : (i) => i.title;
  const peopleOf = typeof o.peopleOf === 'function' ? o.peopleOf : (i) => i.people;
  const out = [];
  const seen = new Set();
  for (const i of Array.isArray(items) ? items : []) {
    if (!i || typeof i.id !== 'string' || !i.id || seen.has(i.id)) continue;
    seen.add(i.id);
    const st = statusOf(i);
    if (st === 'done' || st === 'wontdo' || i.wontDo === true) continue;
    if (i.startDate && today && String(i.startDate) > today) continue;            // not started yet
    if (snoozed[i.id] && today && String(snoozed[i.id]) >= today) continue;       // snoozed on Home
    const raw = peopleOf(i);
    const people = [];
    for (const p of Array.isArray(raw) ? raw : []) if (typeof p === 'string' && p && !self.has(p) && !people.includes(p)) people.push(p);
    if (!people.length) continue;                                                  // owed to nobody else
    if (isWaiting(i)) continue;                                                    // they owe the user (Waiting on)
    const due = dueOf(i) || null;
    const dueIn = due && today ? _howDays(today, due) : null;
    const created = _howIsoOf(i.createdAt);
    const age = created && today ? Math.max(0, _howDays(created, today) || 0) : null;
    out.push({ id: i.id, item: i, title: String(titleOf(i) || ''), people, due, late: dueIn != null && dueIn < 0 ? -dueIn : 0, dueIn, created, age });
  }
  out.sort((a, b) => {
    if (!!a.due !== !!b.due) return a.due ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    if (!!a.created !== !!b.created) return a.created ? -1 : 1;
    if (a.created && b.created && a.created !== b.created) return a.created < b.created ? -1 : 1;
    return a.title.localeCompare(b.title) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  });
  return out;
}

function homeOweGroups(rows) {
  const groups = [];
  const by = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const pid = r && r.people && r.people[0];
    if (!pid) continue;
    let g = by.get(pid);
    if (!g) { g = { personId: pid, rows: [], oldest: r }; by.set(pid, g); groups.push(g); }
    g.rows.push(r);
    if (r.age != null && (g.oldest.age == null || r.age > g.oldest.age)) g.oldest = r;
  }
  return groups;
}

function homeOweEmailRows(replyRows, o) {
  o = o || {};
  const min = Number.isFinite(o.minDays) ? o.minDays : 2;
  const limit = Number.isFinite(o.limit) ? o.limit : 2;
  const out = [];
  for (const r of Array.isArray(replyRows) ? replyRows : []) {
    if (!r || !r.known || !r.personId || !(Number(r.ageDays) > min)) continue;
    if (o.selfIds && [...o.selfIds].includes(r.personId)) continue;
    out.push(r);
  }
  out.sort((a, b) => (b.ageDays - a.ageDays) || (a.id < b.id ? -1 : 1));
  return out.slice(0, Math.max(0, limit));
}

/** What a row's chip says first: late beats due today beats a due date beats its age. */
function homeOweWhen(r) {
  if (!r) return '';
  if (r.late > 0) return 'late';
  if (r.due && r.dueIn === 0) return 'today';
  if (r.due) return 'due';
  return r.age != null ? 'age' : '';
}
/** "3 days late", "due today", "due Fri 9 Oct", "9 days" (o.dueLabel(iso) formats a date). */
function homeOweWhenText(r, o) {
  o = o || {};
  const k = homeOweWhen(r);
  const days = (n) => (n === 1 ? '1 day' : `${n} days`);
  if (k === 'late') return `${days(r.late)} late`;
  if (k === 'today') return 'due today';
  if (k === 'due') return r.dueIn === 1 ? 'due tomorrow' : `due ${typeof o.dueLabel === 'function' ? o.dueLabel(r.due) : r.due}`;
  if (k === 'age') return r.age < 1 ? 'new today' : days(r.age);
  return '';
}

function homeOweDraft(o) {
  o = o || {};
  const items = (Array.isArray(o.items) ? o.items : []).filter(x => x && String(x.title || '').trim());
  const clean = (s) => String(s || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
  const hi = o.first ? `Hi ${clean(o.first)},` : 'Hi,';
  const me = clean(o.me);
  const sign = `Best,${me ? '\n' + me : ''}`;
  // A deadline still ahead reads '(by Fri 9 Oct)'; one already past is left out (the user words that).
  const when = (x) => (x.due && typeof o.dueLabel === 'function' && !(o.today && String(x.due) < String(o.today)) ? ` (by ${o.dueLabel(x.due)})` : '');
  if (items.length <= 1) {
    const t = clean(items[0] && items[0].title);
    // A long task title makes a short subject (cut at a word, with an ellipsis); the body keeps it whole.
    const st = t.length > 72 ? t.slice(0, 72).replace(/[\s,;:.\-–]+\S*$/, '').replace(/[\s,;:.\-–]+$/, '') + '…' : t;
    return { subject: (t ? 'Update: ' + st : 'A quick update').slice(0, 200), body: `${hi}\n\nA quick update on ${t || 'this'}:\n\n\n\n${sign}` };
  }
  const list = items.slice(0, 12).map(x => `- ${clean(x.title).slice(0, 160)}${when(x)}`).join('\n');
  const more = items.length > 12 ? `\n- and ${items.length - 12} more` : '';
  return { subject: `A quick update on ${items.length} things`, body: `${hi}\n\nA quick update on what I owe you:\n\n${list}${more}\n\n\n\n${sign}` };
}
