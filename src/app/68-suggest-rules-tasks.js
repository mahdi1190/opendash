/* ============================================================
   SUGGESTIONS S10-S20: tasks, people, focus and housekeeping cards
   (SUGGESTIONS_CATALOGUE.md 2.4)
   OWNER: the suggestion-card builder for TASKS, PEOPLE, FOCUS, HYGIENE.
   ------------------------------------------------------------
   The user's rule (3 Oct): "it's a one click recommendation but it still
   gives us the option where it starts off with the recommendation but still
   we open it and we can adjust etc like normal". So the main button opens
   the NORMAL editor, prefilled, and the small "✓" applies the suggestion as
   it is, with Undo:
     S10 day-overload     Too much for today: move the lowest
                          (primary: the move list, pre-ticked; ✓ moves them)
     S11 roll-leftovers   Roll today's leftovers to the next work day (evening)
                          (primary: the roll list with day choices; ✓ rolls all)
     S12 keeps-moving     The task you keep moving: book an hour, or let it go
                          (primary: the event card in create mode; ✓ books it)
     S13 task-estimate    How long will it take? (primary: the task card; ✓ sets
                          the suggested length; chips set others)
     S14 nudge-waiting    Nudge someone you're waiting on (the draft editor,
                          prefilled; ✓ saves the Gmail draft at once; never sent)
     S15 reply-owed       A reply you owe (draft in the thread when there is one)
     S16 email-known      Email from someone you know, no reply yet: make it
                          today's task (primary: the task card in create mode)
     S17 email-tasks      Emails that look like tasks: add them (the task card
                          for one, the pre-ticked list for several)
     S18 meeting-ended    Meeting just ended: capture actions (the task card in
                          create mode, linked to the meeting)
     S19 stream-quiet     A stream has gone quiet: hold time for it
     S20 calendar-stale   Calendar out of date: update it (read-only guard)
   A block of time is always a calendar event (+ task.plan); never a task.
   Mail is only ever a Gmail DRAFT (or the mail app); nothing is sent.
   PURE like 68-suggest-rules-s1.js: no DOM, no page globals, no clock
   (ctx.now). Extra snapshot fields these cards read (68-suggest-context-
   tasks.js fills them on the page; tests give them directly; all optional):
     task.moves [{at, from, to, reason}]   forward date moves, last 21 days
     task.waitingOn 'personId'             who a waiting task waits on
     task.emails [{id, label, date}]       related email threads (newest last)
     event.wrapped                         the meeting was wrapped up
     ctx.streams {id: {label, lastDone}}   last completion per stream
     ctx.eveningSaved, ctx.myEmails, inbox thread.personId
   Tests: tests/suggest-tasks.test.mjs.
   ============================================================ */

const SGK_MEETING_TYPES = Object.freeze(['meeting', 'one-on-one', 'video-call', 'call', 'interview', 'conference', 'lecture']);
const SGK_OWE = /\b(reply|respond|get back to|answer|send|share|confirm|return|call back|write back|let \S+ know)\b/i;
const SGK_ROLL_REASON = 'Rolled over at the end of the day';      // = EVENING_ROLL_REASON (76-brief-evening.js)
const SGK_REBALANCE_REASON = 'Rebalanced: day overbooked';
const SGK_EST_CHIPS = Object.freeze([15, 30, 60, 120, 240, 480]);

/* ---------- small helpers (pure) ---------- */
function _sgkOpen(t) { return !!t && t.status !== 'done' && !t.snoozed && !t.notStarted; }
function _sgkRank(p) { return { p1: 0, p2: 1, p3: 2, p0: 3 }[p] ?? 3; }
/** 'today' / 'tomorrow' / 'Mon' for a day relative to ctx.now. */
function _sgkDay(ctx, iso, cap) {
  const n = sgDaysBetween(ctx.now.date, iso);
  const w = n === 0 ? 'today' : n === 1 ? 'tomorrow' : _SG_DAY_NAMES[sgDow(iso)];
  return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}
/** A local day 'YYYY-MM-DD' from an ISO string or epoch ms (null when unknown). */
function _sgkDate(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number' || /^\d{10,}$/.test(String(v))) {
    const ms = Number(v);
    if (!Number.isFinite(ms)) return null;
    if (typeof Clock !== 'undefined') return Clock.parts(ms).iso;
    const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;   // clock-ok: fallback where Clock is not loaded (tests)
  }
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(v));
  return m ? m[1] : null;
}
/** Epoch ms of an ISO string or ms (NaN when unknown). */
function _sgkTs(v) { return typeof v === 'number' ? v : /^\d{10,}$/.test(String(v || '')) ? Number(v) : Date.parse(String(v || '')); }
/** A task title short enough for a sentence (sgShort), with "…" when it was cut mid-phrase (no dangling "to the"). */
function _sgkT(title, n) {
  const full = String(title == null ? '' : title).replace(/\s+/g, ' ').trim();
  const s = sgShort(full, n || 48);
  if (s.length >= full.length) return s;
  const rest = full.slice(s.length).replace(/^\s+/, '');
  if (/^[:;(\[|–—-]/.test(rest) && s.length >= 8) return s;
  return s.replace(/(\s+(the|a|an|to|of|and|or|for|in|on|with|at|by|from|about))+$/i, '') + '…';
}
function _sgkPlural(n, one, many) { return `${n} ${n === 1 ? one : (many || one + 's')}`; }
/** "3 Oct" for an ISO day. */
function _sgkShortDate(iso) {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [, m, d] = String(iso).split('-').map(Number);
  return `${d} ${M[(m || 1) - 1]}`;
}
/** n work days after iso. */
function _sgkWorkDays(ctx, iso, n) { let d = iso; for (let i = 0; i < n; i++) d = sgNextWorkDay(ctx.work, d); return d; }
function _sgkPerson(ctx, id) { const p = id && ctx.people ? ctx.people[id] : null; return p && !p.self ? p : null; }
function _sgkFirst(p) { return (p && (p.first || String(p.name || '').split(/\s+/)[0])) || ''; }
function _sgkMine(ctx, email) {
  const e = String(email || '').toLowerCase();
  if (!e) return false;
  if ((ctx.myEmails || []).map(x => String(x).toLowerCase()).includes(e)) return true;
  return Object.values(ctx.people || {}).some(p => p && p.self && String(p.email || '').toLowerCase() === e);
}
/** The person (id) behind an email address: the thread's personId, else People by address. */
function _sgkPersonByEmail(ctx, email, hint) {
  if (hint && _sgkPerson(ctx, hint)) return hint;
  const e = String(email || '').toLowerCase();
  if (!e) return null;
  for (const [id, p] of Object.entries(ctx.people || {})) if (p && !p.self && String(p.email || '').toLowerCase() === e) return id;
  return null;
}
/** Plain-text bodies (no AI), as homeMailDraftTemplate (12-home-mail-logic.js): the user finishes them. */
function _sgkBody(kind, first, me, what) {
  const hi = first ? `Hi ${first},` : 'Hi,';
  if (kind === 'nudge') return `${hi}\n\nJust checking in${what ? ' on ' + what : ''}. Is there anything you need from me?\n\nThanks,${me ? '\n' + me : ''}`;
  return `${hi}\n\n\n\nBest,${me ? '\n' + me : ''}`;
}
function _sgkReSubject(s) { const x = String(s || '').replace(/[\r\n\t]+/g, ' ').trim() || '(no subject)'; return /^re:/i.test(x) ? x : 'Re: ' + x; }
/** A related email thread of a task that is still in the inbox (a draft can answer in it). */
function _sgkTaskThread(ctx, t) {
  const ids = new Set(((ctx.inbox && ctx.inbox.threads) || []).map(x => x.id));
  const rel = (t && t.emails) || [];
  for (const r of rel.slice().reverse()) if (r && r.id && ids.has(r.id)) return ((ctx.inbox.threads || []).find(x => x.id === r.id)) || null;
  return null;
}
/** Own blocks today for a task (they keep it on today). */
function _sgkBlockedToday(ctx, id) { return sgFutureBlocksFor(ctx, id).some(e => e.date === ctx.now.date) || (sgPrepare(ctx)._sgIx.own || []).some(e => e.date === ctx.now.date && ((e.origin && e.origin.taskId === id) || (e.linked || []).includes(id))); }
/** The first free stretch of at least `len` minutes on a day (today: from now). */
function _sgkGap(ctx, iso, len) { return sgFreeStretches(ctx, iso, { gapMin: Math.max(SG_BLOCK_MIN, len) })[0] || null; }
/** A block offer for a task on a day: {date, start, end, gapEnd} or null. Today first when o.today, else the next work days (up to 3). */
function _sgkBlockSlot(ctx, len, o) {
  o = o || {};
  const days = [];
  if (o.today && sgIsWorkDay(ctx.work, ctx.now.date)) days.push(ctx.now.date);
  let d = ctx.now.date;
  for (let i = 0; i < 3; i++) { d = sgNextWorkDay(ctx.work, d); days.push(d); }
  for (const iso of days) {
    const g = _sgkGap(ctx, iso, o.gapMin || len);
    if (!g) continue;
    const start = iso === ctx.now.date ? Math.max(g.start, Math.ceil(ctx.now.min / 5) * 5) : g.start;
    const l = Math.min(len, g.end - start);
    if (l < SG_BLOCK_MIN) continue;
    return { date: iso, start, end: start + l, gapEnd: g.end };
  }
  return null;
}
function _sgkBlockArgs(t, s, rule) { return { taskId: t ? t.id : null, date: s.date, start: s.start, end: s.end, gapEnd: s.gapEnd, rule, title: sgBlockTitle(t), description: sgBlockDescription(t) }; }
/** G2: no calendar write -> "Connect calendar" (never a task); the ✓ and calendar chips go. */
function _sgkNeedsWrite(ctx, card) {
  const caps = ctx.capabilities || {};
  if (caps.calWrite && !(ctx.cal && ctx.cal.stale)) return card;
  if (!caps.calWrite) {
    card.primary = { label: 'Connect calendar', icon: 'plug', aria: 'Connect Google Calendar to book time', action: { type: 'nav', args: { to: 'connections', name: 'calendar' } } };
    card.preview = 'Opens Connections: once Google Calendar is connected, this button books the time.';
  } else {
    card.primary = { label: 'Update calendar', icon: 'refresh-cw', aria: 'Read the calendar again before booking time', action: { type: 'store.refresh', args: { store: 'calendar' } } };
    card.preview = 'Reads your calendar again (nothing is changed), so the free time shown is right.';
  }
  card.quick = null;
  card.secondary = (card.secondary || []).filter(s => !/^cal\./.test(s.action.type));
  return card;
}
/** Ops that move a task to a day: planned-only -> task.plan; due -> task.reschedule (with a reason). */
function _sgkMoveOps(t, today, to, reason) {
  const due = t.due && t.due <= today;
  return due ? [{ op: 'task.reschedule', id: t.id, dueDate: to, reason }] : [{ op: 'task.plan', id: t.id, date: to }];
}
/** A small stable hash for keys made of several ids. */
function _sgkHash(s) { let h = 5381; for (const ch of String(s)) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); }

/* ======================= S10 Too much for today ======================= */
/** The overload model for today (null = it fits): {left, busy, taskMin, free, movable, pick, nwd}. */
function sgOverloadModel(ctx) {
  const today = ctx.now.date;
  if (!sgIsWorkDay(ctx.work, today) || ctx.now.min >= 15 * 60) return null;
  const w = sgWork(ctx.work);
  const from = Math.max(ctx.now.min, w.start);
  if (from >= w.end) return null;
  const left = w.end - from;
  let busy = 0;
  for (const e of ((ctx.cal && ctx.cal.days) || {})[today] || []) {
    if (!e || e.allDay || e.free || e.declined) continue;
    busy += Math.max(0, Math.min(e.end, w.end) - Math.max(e.start, from));
  }
  const onToday = (ctx.tasks || []).filter(t => _sgkOpen(t) && !t.waiting && ((t.due && t.due <= today) || (t.planned && t.planned <= today)));
  const est = (t) => Number(t.estimate) || 30;
  const taskMin = onToday.reduce((a, t) => a + est(t), 0);
  const load = busy + taskMin;
  if (load <= left - 30) return null;
  const movable = onToday.filter(t => {
    if (t.priority === 'p1' || t.dueTime || t.plannedTime || _sgkBlockedToday(ctx, t.id)) return false;
    const plannedOnly = t.planned && t.planned <= today && !(t.due && t.due <= today);
    return plannedOnly || (t.due === today && (t.priority === 'p3' || t.priority === 'p0' || !t.priority));
  }).map(t => ({ t, plannedOnly: !(t.due && t.due <= today) }));
  if (movable.length < 2) return null;
  movable.sort((a, b) => (a.plannedOnly === b.plannedOnly ? 0 : a.plannedOnly ? -1 : 1) || _sgkRank(b.t.priority) - _sgkRank(a.t.priority) || est(b.t) - est(a.t) || (a.t.id < b.t.id ? -1 : 1));
  const pick = [];
  let over = load - (left - 30);
  for (const m of movable) { if (over <= 0) break; pick.push(m.t); over -= est(m.t); }
  return { left, busy, taskMin, free: Math.max(0, left - busy), movable: movable.map(m => m.t), pick, nwd: sgNextWorkDay(ctx.work, today) };
}
function sgOverloadCard(ctx) {
  const m = sgOverloadModel(ctx);
  if (!m || !m.pick.length) return null;
  const today = ctx.now.date, n = m.pick.length, day = _sgkDay(ctx, m.nwd), after = sgNextWorkDay(ctx.work, m.nwd);
  const picked = new Set(m.pick.map(t => t.id));
  const ops = [];
  for (const t of m.pick) ops.push(..._sgkMoveOps(t, today, m.nwd, SGK_REBALANCE_REASON));
  const items = m.movable.slice(0, 10).map(t => ({
    id: t.id, label: sgShort(t.title, 60), sub: `${t.due && t.due <= today ? 'Due today' : 'Planned for today'} · ${sgDur(Number(t.estimate) || 30)}`, on: picked.has(t.id),
    alts: [
      { label: _sgkDay(ctx, m.nwd, true), ops: _sgkMoveOps(t, today, m.nwd, SGK_REBALANCE_REASON) },
      { label: _sgkDay(ctx, after, true), ops: _sgkMoveOps(t, today, after, SGK_REBALANCE_REASON) },
    ],
  }));
  return {
    key: `overload:${today}`, icon: 'calendar-clock', scene: null, urgency: m.busy + m.taskMin - m.left > 120 ? 1.2 : 1,
    title: `About ${sgDur(m.taskMin)} of tasks and ${sgDur(m.free)} free today`,
    text: `Move ${n} lower-priority ${n === 1 ? 'one' : 'ones'} to ${day}?`,
    why: [`${sgDur(m.busy)} of meetings and about ${sgDur(m.taskMin)} of tasks, with ${sgDur(m.left)} of working time left.`,
      `Lowest first: ${m.pick.slice(0, 3).map(t => '“' + sgShort(t.title, 32) + '”').join(', ')}${n > 3 ? ` and ${n - 3} more` : ''}.`],
    preview: `Opens the list of tasks that can move, with ${_sgkPlural(n, 'task')} ticked for ${day}; change the ticks or the day, then Move. The ✓ moves the ${_sgkPlural(n, 'ticked task')} at once; Undo puts them back. Deadlines move with a reason; planned tasks keep their deadline.`,
    primary: { label: `Move ${n} to ${day}`, icon: 'arrow-right', aria: `Choose which tasks move to ${day}`,
      action: { type: 'ops.choose', args: { title: 'Too much for today', intro: `About ${sgDur(m.taskMin)} of tasks and ${sgDur(m.free)} free. Tick what can wait, and pick the day.`, apply: 'Move selected', line: 'Moved to a lighter day', items } } },
    quick: { label: `Move ${n} now`, icon: 'check', aria: `Move ${n} lower-priority tasks to ${day} now, with Undo`, action: { type: 'ops', args: { ops, line: `Moved ${_sgkPlural(n, 'task')} to ${day}` } } },
    claims: ['day:' + today], entity: '', expiresMin: 15 * 60,
  };
}
sgRegisterRule({
  id: 'day-overload', area: 'tasks', title: 'Too much for today', value: 5, defaultOn: true,
  description: 'Today holds more tasks than your free working time: move the lowest-priority ones to the next work day.',
  safetyHint: 'The button opens the list of tasks that can move, ticked as suggested; ✓ moves them at once, with Undo.',
  needs: [], hours: 'work', surfaces: ['hero', 'home', 'story-morning'], cooldown: { notFor: 7 },
  run(ctx) { const c = sgOverloadCard(ctx); return c ? [c] : []; },
});

/* ======================= S11 Roll today's leftovers ======================= */
/** What slipped today (as briefRollover): due today or earlier, or planned for today or earlier. */
function sgLeftovers(ctx) {
  const today = ctx.now.date;
  const out = [];
  for (const t of ctx.tasks || []) {
    if (!t || t.status === 'done' || t.notStarted) continue;
    if (t.due && t.due <= today) out.push({ t, field: 'due', why: t.due === today ? 'due' : 'overdue' });
    else if (t.planned && t.planned <= today) out.push({ t, field: 'planned', why: 'planned' });
  }
  return out.sort((a, b) => (a.why === 'overdue' ? 0 : a.why === 'due' ? 1 : 2) - (b.why === 'overdue' ? 0 : b.why === 'due' ? 1 : 2) || _sgkRank(a.t.priority) - _sgkRank(b.t.priority));
}
function sgRollCard(ctx) {
  if (ctx.eveningSaved) return null;
  const list = sgLeftovers(ctx);
  if (!list.length) return null;
  const today = ctx.now.date, nwd = sgNextWorkDay(ctx.work, today), after = sgNextWorkDay(ctx.work, nwd);
  const n = list.length, day = _sgkDay(ctx, nwd);
  const ops = [];
  for (const x of list.slice(0, 20)) ops.push(..._sgkMoveOps(x.t, today, nwd, SGK_ROLL_REASON));
  const items = list.slice(0, 12).map(x => ({
    id: x.t.id, label: sgShort(x.t.title, 60), sub: x.why === 'overdue' ? `Due ${_sgkShortDate(x.t.due)}` : x.why === 'due' ? 'Due today' : 'Planned for today', on: true,
    alts: [
      { label: _sgkDay(ctx, nwd, true), ops: _sgkMoveOps(x.t, today, nwd, SGK_ROLL_REASON) },
      { label: _sgkDay(ctx, after, true), ops: _sgkMoveOps(x.t, today, after, SGK_ROLL_REASON) },
      { label: 'Won’t do', ops: [{ op: 'task.wont_do', id: x.t.id, reason: 'Let go at the end of the day' }] },
    ],
  }));
  const overdue = list.filter(x => x.why === 'overdue').length;
  return {
    key: `roll:${today}`, icon: 'arrow-right', scene: 'rest', urgency: 1,
    title: n === 1 ? `1 thing didn’t happen today` : `${n} things didn’t happen today`,
    text: `Move ${n === 1 ? 'it' : 'them'} to ${day}?`,
    why: [`${_sgkPlural(n, 'task')} due or planned for today ${n === 1 ? 'is' : 'are'} still open${overdue ? ` (${overdue} from earlier days)` : ''}.`,
      `${_sgkDay(ctx, nwd, true)} is your next work day.`],
    preview: `Opens the list, every task ticked for ${day}; pick another day or Won’t do per task, then Roll over. The ✓ rolls them all to ${day} at once; Undo puts them back.`,
    primary: { label: `Roll ${n} to ${day}`, icon: 'arrow-right', aria: `Choose how to roll ${n} leftover tasks`,
      action: { type: 'ops.choose', args: { title: 'Roll today’s leftovers', intro: 'Tick what moves; pick a day or Won’t do for each.', apply: 'Roll over selected', line: 'Rolled over', items } } },
    quick: { label: `Roll all to ${day}`, icon: 'check', aria: `Roll all ${n} to ${day} now, with Undo`, action: { type: 'ops', args: { ops, line: `Rolled ${_sgkPlural(n, 'task')} to ${day}` } } },
    secondary: [{ label: 'Finish the day', icon: 'sunset', action: { type: 'nav', args: { to: 'view', view: 'home:evening' } } }],
    claims: ['roll:' + today], entity: '',
  };
}
sgRegisterRule({
  id: 'roll-leftovers', area: 'tasks', title: 'Roll today’s leftovers', value: 4, defaultOn: true,
  description: 'In the evening, what was due or planned today and is still open: move it to the next work day.',
  safetyHint: 'The button opens the list with a day per task; ✓ rolls them all at once, with Undo.',
  needs: [], hours: 'evening', surfaces: ['hero', 'home', 'story-evening'], cooldown: { notFor: 1 },
  run(ctx) { const c = sgRollCard(ctx); return c ? [c] : []; },
});

/* ======================= S12 The task you keep moving ======================= */
/** Forward date moves of a task in the last 21 days. */
function sgTaskMoves(ctx, t) {
  const cut = sgAddDays(ctx.now.date, -21);
  return ((t && t.moves) || []).filter(m => m && m.from && m.to && m.to > m.from && (!m.at || m.at >= cut) && m.reason !== 'Nudged');
}
function sgMovingCards(ctx) {
  const out = [];
  const list = (ctx.tasks || []).filter(t => _sgkOpen(t) && !t.waiting).map(t => ({ t, moves: sgTaskMoves(ctx, t) })).filter(x => x.moves.length >= 3);
  list.sort((a, b) => b.moves.length - a.moves.length || (a.t.id < b.t.id ? -1 : 1));
  for (const { t, moves } of list.slice(0, 2)) {
    const short = _sgkT(t.title, 48);
    const since = moves[0].at || moves[0].from;
    const slot = ctx.cal && ctx.cal.ok ? _sgkBlockSlot(ctx, 60) : null;
    const chips = [{ label: 'Won’t do', icon: 'x', action: { type: 'ops', args: { ops: [{ op: 'task.wont_do', id: t.id, reason: 'Kept moving it' }], line: `Let go: ${short}` } } }];
    if (t.priority !== 'p3') chips.push({ label: 'Lower priority', icon: 'chevron-down', action: { type: 'ops', args: { ops: [{ op: 'task.set_priority', id: t.id, priority: 'p3' }], line: `Lower priority: ${short}` } } });
    chips.push({ label: 'Break it down', icon: 'list-todo', action: { type: 'task.open', args: { id: t.id } } });
    const why = [`Moved ${_sgkPlural(moves.length, 'time')} since ${_sgkShortDate(since)}${moves[moves.length - 1].reason ? ` (last: ${sgClip(moves[moves.length - 1].reason, 40)})` : ''}.`];
    let card;
    if (slot) {
      const args = _sgkBlockArgs(t, slot, 'keeps-moving');
      const when = `${_sgkDay(ctx, slot.date)} ${sgHM(slot.start)}–${sgHM(slot.end)}`;
      why.push(`${_sgkDay(ctx, slot.date, true)} has ${sgDur(slot.gapEnd - slot.start)} free from ${sgHM(slot.start)}.`);
      card = {
        text: `Book ${sgDur(slot.end - slot.start)} ${_sgkDay(ctx, slot.date)}, or let it go?`,
        preview: `Opens a new event "${args.title}" ${when} in your primary calendar, for you to adjust. Save books it and plans the task for that day. The ✓ books it at once; Undo removes it. Won’t do and Lower priority have Undo too.`,
        primary: { label: 'Book ' + when, icon: 'calendar-plus', aria: `Book ${when} for ${short}`, action: { type: 'cal.blockOpen', args } },
        quick: { label: 'Book it now', icon: 'check', aria: `Book ${when} for ${short} now, with Undo`, action: { type: 'cal.block', args } },
        claims: ['task:' + t.id, `slot:${slot.date}:${slot.start}-${slot.gapEnd}`],
      };
    } else {
      card = {
        text: 'Break it down, or let it go?',
        preview: 'Opens the task to split it into smaller steps. Won’t do and Lower priority apply at once, with Undo.',
        primary: { label: 'Open the task', icon: 'list-todo', action: { type: 'task.open', args: { id: t.id } } },
        quick: null, claims: ['task:' + t.id],
      };
      chips.pop();
    }
    out.push(Object.assign({
      key: `moving:${t.id}`, icon: 'repeat', scene: null, urgency: moves.length >= 5 ? 1.2 : 1,
      title: `“${short}” has moved ${_sgkPlural(moves.length, 'time')}`, why, secondary: chips,
      entity: 'task:' + t.id, stream: t.stream || '',
    }, card));
    if (slot) _sgkNeedsWrite(ctx, out[out.length - 1]);
  }
  return out;
}
sgRegisterRule({
  id: 'keeps-moving', area: 'tasks', title: 'The task you keep moving', value: 5, defaultOn: true,
  description: 'A task whose date moved 3 or more times in three weeks: book an hour for it, or let it go.',
  safetyHint: 'The button opens the new event filled in, for you to adjust and save; ✓ books it at once, with Undo. Never invites anyone.',
  needs: [], hours: 'work', surfaces: ['hero', 'home', 'story-morning'], cooldown: { notFor: 14 },
  run(ctx) { return sgMovingCards(ctx); },
});

/* ======================= S13 How long will it take? ======================= */
function _sgkEstGuess(t) {
  const open = (t.subtasks && t.subtasks.total) ? (t.subtasks.total - t.subtasks.done) : 0;
  const raw = open ? open * 30 : t.priority === 'p1' ? 120 : 60;
  return SGK_EST_CHIPS.reduce((b, c) => (Math.abs(c - raw) < Math.abs(b - raw) ? c : b), 60);
}
function _sgkEstLabel(m) { return m === 240 ? 'Half a day' : m === 480 ? 'A day' : sgDur(m); }
function sgEstimateCard(ctx) {
  const today = ctx.now.date, soon = sgAddDays(today, 7);
  const open = (ctx.tasks || []).filter(t => _sgkOpen(t) && !t.waiting && !(Number(t.estimate) > 0));
  let t = open.filter(x => x.due && x.due >= today && x.due <= soon && (x.priority === 'p1' || (x.tags || []).includes('deadline'))).sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0))[0];
  let reason = t ? `Due ${_sgkDay(ctx, t.due)}${t.priority === 'p1' ? ', high priority' : ''}, in ${_sgkPlural(sgDaysBetween(today, t.due), 'day')}.` : '';
  if (!t) {
    const focus = (ctx.focus || []).slice(0, 5);
    const i = focus.findIndex(id => open.some(x => x.id === id));
    if (i >= 0) { t = open.find(x => x.id === focus[i]); reason = `Number ${i + 1} in Focus.`; }
  }
  if (!t) return null;
  const g = _sgkEstGuess(t), short = _sgkT(t.title, 48);
  const set = (m) => ({ type: 'ops', args: { ops: [{ op: 'task.set_estimate', id: t.id, minutes: m }], line: `${_sgkEstLabel(m)} for ${short}` } });
  const others = [30, 60, 120, 240].filter(m => m !== g).slice(0, 3);
  return {
    key: `estimate:${t.id}`, icon: 'timer', scene: null, urgency: t.due ? 1.1 : 0.9,
    title: `How long will “${short}” take?`,
    text: `About ${_sgkEstLabel(g).toLowerCase()}?`,
    why: [reason, 'With a length, free time and blocks are sized to fit it.'],
    preview: `Opens the task, where you set its estimate. The ✓ sets ${_sgkEstLabel(g).toLowerCase()} at once; the chips set another length. Undo puts it back.`,
    primary: { label: 'Set the length', icon: 'timer', aria: `Open ${short} to set its estimate`, action: { type: 'task.open', args: { id: t.id } } },
    quick: { label: `Set ${_sgkEstLabel(g).toLowerCase()}`, icon: 'check', aria: `Set ${_sgkEstLabel(g).toLowerCase()} for ${short}, with Undo`, action: set(g) },
    secondary: others.map(m => ({ label: _sgkEstLabel(m), action: set(m) })),
    menu: SGK_EST_CHIPS.filter(m => m !== g && !others.includes(m)).map(m => ({ label: _sgkEstLabel(m), icon: 'timer', action: set(m) })),
    claims: ['estimate:' + t.id], entity: 'task:' + t.id, stream: t.stream || '',
  };
}
sgRegisterRule({
  id: 'task-estimate', area: 'tasks', title: 'How long will it take?', value: 3, defaultOn: true,
  description: 'An important task due soon has no length: one tap sets it, so blocks and free time fit.',
  safetyHint: 'The button opens the task; ✓ and the chips set its estimate at once, with Undo.',
  needs: [], hours: 'any', surfaces: ['home', 'story-morning'], cooldown: { notFor: 3 },
  run(ctx) { const c = sgEstimateCard(ctx); return c ? [c] : []; },
});

/* ======================= S14 Nudge someone you're waiting on ======================= */
function _sgkDraftCard(ctx, card, draft, label) {
  const can = !!(ctx.capabilities || {}).gmailDraft;
  card.primary = { label: can ? label : 'Open in your mail app', icon: 'mail', aria: can ? `${label}: opens the draft, filled in` : 'Opens your mail app with the message filled in', action: { type: 'gmail.draftOpen', args: draft } };
  card.quick = can ? { label: 'Save the draft now', icon: 'check', aria: 'Save it as a Gmail draft now (not sent), with Undo', action: { type: 'gmail.draft', args: draft } } : null;
  if (!can) card.preview = 'Opens your mail app with the message filled in. Nothing is sent until you send it there.';
  return card;
}
function sgNudgeCards(ctx) {
  const out = [];
  const today = ctx.now.date;
  for (const t of ctx.tasks || []) {
    if (!t || t.status === 'done' || !t.waiting) continue;
    const pid = t.waitingOn || (t.people || []).find(id => _sgkPerson(ctx, id));
    const p = _sgkPerson(ctx, pid);
    if (!p || !p.email) continue;
    const asked = _sgkDate(t.createdAt);
    const age = asked ? Math.max(0, sgDaysBetween(asked, today)) : null;
    const followUp = t.due && t.due <= today;
    if (!((age != null && age >= 5) || followUp)) continue;
    const first = _sgkFirst(p), short = _sgkT(t.title, 48);
    const th = _sgkTaskThread(ctx, t);
    const later = _sgkWorkDays(ctx, today, 3);
    const ops = [{ op: 'task.add_note', id: t.id, text: `Nudge drafted ${today}` }, { op: 'task.reschedule', id: t.id, dueDate: later, reason: 'Nudged' }];
    const draft = { to: [p.email], subject: th ? _sgkReSubject(th.subject) : sgShort(t.title, 80), body: _sgkBody('nudge', first, ctx.userFirst || '', sgShort(t.title, 80)),
      ...(th ? { threadId: th.id } : {}), purpose: 'nudge', taskId: t.id, ops, editorTitle: `Nudge ${first}` };
    const why = [age != null ? `You asked ${_sgkPlural(age, 'day')} ago (${_sgkShortDate(asked)}).` : `The follow-up date was ${_sgkShortDate(t.due)}.`];
    if (followUp && age != null) why.push(`The follow-up date ${t.due === today ? 'is today' : 'was ' + _sgkShortDate(t.due)}.`);
    if (th) why.push(`It goes in the thread "${sgClip(th.subject, 50)}".`);
    const secondary = [
      { label: 'They replied', icon: 'check-check', action: { type: 'ops', args: { ops: [{ op: 'task.complete', id: t.id }], line: `Done: ${short}` } } },
      { label: 'Wait 3 more days', icon: 'hourglass', action: { type: 'ops', args: { ops: [{ op: 'task.reschedule', id: t.id, dueDate: later, reason: 'Waiting a bit longer' }], line: `Follow up ${_sgkDay(ctx, later)}` } } },
    ];
    // A meeting with them in the next 7 days: put it on that meeting's notes instead.
    let meet = null;
    for (let k = 0; k <= 7 && !meet; k++) {
      const iso = sgAddDays(today, k);
      meet = (((ctx.cal && ctx.cal.days) || {})[iso] || []).find(e => e && !e.declined && (e.people || []).includes(pid) && (k > 0 || e.start > ctx.now.min)) || null;
      if (meet) meet = Object.assign({ date: iso }, meet);
    }
    if (meet) secondary.push({ label: `Raise it ${_sgkDay(ctx, meet.date)}`, icon: 'notebook-pen', action: { type: 'ops', args: { ops: [{ op: 'event.annotate', eventId: meet.id, appendNotes: `Ask ${first} about: ${sgClip(t.title, 160)}` }], line: `On the notes for ${sgClip(meet.title, 40)}` } } });
    out.push(_sgkDraftCard(ctx, {
      key: `nudge:${t.id}:${t.due || 'none'}`, icon: 'mail', scene: null, urgency: (age || 0) >= 10 ? 1.2 : 1,
      title: age != null ? `Waiting ${_sgkPlural(age, 'day')} on ${first}` : `Time to follow up with ${first}`,
      text: `Draft a nudge about “${short}”?`,
      why,
      preview: `Opens a draft to ${p.email}${th ? ' in the same thread' : ''}, filled in, for you to change. Save keeps it as a Gmail draft (never sent), notes it on the task and follows up again ${_sgkDay(ctx, later)}. The ✓ saves the draft at once; Undo deletes it.`,
      secondary, claims: ['task:' + t.id], entity: 'task:' + t.id, stream: t.stream || '', people: [pid],
    }, draft, 'Draft nudge'));
  }
  return out.sort((a, b) => b.urgency - a.urgency).slice(0, 3);
}
sgRegisterRule({
  id: 'nudge-waiting', area: 'people', title: 'Nudge someone you’re waiting on', value: 5, defaultOn: true,
  description: 'You have waited 5 days or more (or the follow-up date came): a nudge, drafted in Gmail for you to send.',
  safetyHint: 'The button opens the draft, filled in; ✓ saves it as a Gmail draft at once, with Undo. Nothing is ever sent.',
  needs: [], hours: 'work', surfaces: ['hero', 'home', 'story-morning'], cooldown: { notFor: 7 },
  run(ctx) { return sgNudgeCards(ctx); },
});

/* ======================= S15 A reply you owe ======================= */
function sgOweCards(ctx) {
  const out = [];
  const today = ctx.now.date;
  for (const t of ctx.tasks || []) {
    if (!_sgkOpen(t) || t.waiting || !SGK_OWE.test(String(t.title || ''))) continue;
    const pid = (t.people || []).find(id => { const p = _sgkPerson(ctx, id); return p && p.email; });
    if (!pid) continue;
    const p = _sgkPerson(ctx, pid);
    const late = t.due && t.due < today;
    const made = _sgkDate(t.createdAt);
    const days = late ? sgDaysBetween(t.due, today) : made ? sgDaysBetween(made, today) : null;
    if (days == null || (!late && days < 2)) continue;
    const first = _sgkFirst(p), short = _sgkT(t.title, 48);
    const th = _sgkTaskThread(ctx, t);
    const ops = [{ op: 'task.plan', id: t.id, date: today }];
    const draft = { to: [p.email], subject: th ? _sgkReSubject(th.subject) : sgClip(t.title, 200), body: _sgkBody('reply', first, ctx.userFirst || ''),
      ...(th ? { threadId: th.id } : {}), purpose: 'reply', taskId: t.id, ops, editorTitle: `Reply to ${first}` };
    const secondary = [{ label: 'Already replied', icon: 'check-check', action: { type: 'ops', args: { ops: [{ op: 'task.complete', id: t.id }], line: `Done: ${short}` } } }];
    const caps = ctx.capabilities || {};
    const slot = caps.calWrite && ctx.cal && ctx.cal.ok && !ctx.cal.stale && sgIsWorkDay(ctx.work, today) ? (() => { const g = _sgkGap(ctx, today, 15); return g ? { date: today, start: Math.max(g.start, Math.ceil(ctx.now.min / 5) * 5), gapEnd: g.end } : null; })() : null;
    if (slot && slot.gapEnd - slot.start >= 15) {
      slot.end = slot.start + 15;
      secondary.unshift({ label: `Block ${sgHM(slot.start)}`, icon: 'calendar-plus', action: { type: 'cal.block', args: _sgkBlockArgs(t, slot, 'reply-owed') } });
    }
    out.push(_sgkDraftCard(ctx, {
      key: `owe:${t.id}`, icon: 'mail', scene: null, urgency: late ? 1.2 : days >= 5 ? 1.1 : 1,
      title: late ? `${first} has waited ${_sgkPlural(days, 'day')} past the date` : `${first} has waited ${_sgkPlural(days, 'day')} for you`,
      text: `Draft the reply about “${short}”?`,
      why: [late ? `Due ${_sgkShortDate(t.due)}, ${_sgkPlural(days, 'day')} ago.` : `On your list for ${_sgkPlural(days, 'day')}.`, th ? `It goes in the thread "${sgClip(th.subject, 50)}".` : `${first} is ${p.email}.`],
      preview: `Opens a reply to ${p.email}${th ? ' in the same thread' : ''}, ready for you to write. Save keeps it as a Gmail draft (never sent) and puts the task on today. The ✓ saves the draft at once; Undo deletes it.`,
      secondary, claims: ['task:' + t.id], entity: 'task:' + t.id, stream: t.stream || '', people: [pid],
    }, draft, 'Draft reply'));
  }
  return out.sort((a, b) => b.urgency - a.urgency).slice(0, 3);
}
sgRegisterRule({
  id: 'reply-owed', area: 'people', title: 'A reply you owe', value: 5, defaultOn: true,
  description: 'Someone has waited 2 days or more for your reply: a draft, filled in, for you to write and send.',
  safetyHint: 'The button opens the draft; ✓ saves it as a Gmail draft at once, with Undo. Nothing is ever sent.',
  needs: [], hours: 'work', surfaces: ['hero', 'home', 'story-morning'], cooldown: { notFor: 7 },
  run(ctx) { return sgOweCards(ctx); },
});

/* ======================= S16 Email from someone you know ======================= */
function sgKnownEmailCards(ctx) {
  const out = [];
  const today = ctx.now.date;
  const related = new Set();
  for (const t of ctx.tasks || []) for (const e of (t && t.emails) || []) if (e && e.id) related.add(e.id);
  for (const th of ((ctx.inbox && ctx.inbox.threads) || [])) {
    if (!th || th.handled || related.has(th.id)) continue;
    if (['promotions', 'social', 'updates', 'forums'].includes(String(th.category || '').toLowerCase())) continue;
    const email = th.from && th.from.email;
    if (!email || _sgkMine(ctx, email)) continue;
    const pid = _sgkPersonByEmail(ctx, email, th.personId);
    if (!pid) continue;
    const day = _sgkDate(th.date);
    if (!day) continue;
    const age = sgDaysBetween(day, today);
    if (age < 2 || age > 14) continue;
    const open = (ctx.tasks || []).filter(t => _sgkOpen(t) && (t.people || []).includes(pid)).length;
    if (!(th.important || th.unread || open || (th.count || 1) >= 2)) continue;
    const p = _sgkPerson(ctx, pid), first = _sgkFirst(p);
    const subject = String(th.subject || '(no subject)').replace(/[\r\n\t]+/g, ' ').trim();
    const title = `Reply to ${first}: ${subject}`.slice(0, 140);
    const detail = `From: ${(th.from && th.from.name) || email}\nSubject: ${subject}`;
    const after = [{ op: 'task.relate', id: '$new', type: 'email', target: th.id, label: subject.slice(0, 200) }, { op: 'email.triage', threadId: th.id, action: 'task', taskId: '$new' }];
    const ops = [{ op: 'task.create', title, dueDate: today, people: [pid], tags: ['email'], createTag: true, detail, ref: 't' },
      { op: 'task.relate', id: '$t', type: 'email', target: th.id, label: subject.slice(0, 200) }, { op: 'email.triage', threadId: th.id, action: 'task', taskId: '$t' }];
    const flags = [th.important ? 'marked important' : '', th.unread ? 'unread' : '', (th.count || 1) >= 2 ? `${th.count} messages` : '', open ? `${_sgkPlural(open, 'open task')} with ${first}` : ''].filter(Boolean);
    const secondary = [{ label: 'Nothing to do', icon: 'x', action: { type: 'ops', args: { ops: [{ op: 'email.triage', threadId: th.id, action: 'dismiss' }], line: 'Marked as handled' } } }];
    if ((ctx.capabilities || {}).gmailDraft && p.email) {
      secondary.unshift({ label: 'Draft a reply', icon: 'mail', action: { type: 'gmail.draftOpen', args: { to: [String(email).toLowerCase()], subject: _sgkReSubject(subject), body: _sgkBody('reply', first, ctx.userFirst || ''), threadId: th.id, purpose: 'reply', editorTitle: `Reply to ${first}` } } });
    }
    out.push({
      key: `email:${th.id}`, icon: 'inbox', scene: null, urgency: th.important ? 1.2 : 1, _age: age,
      title: `${first} emailed ${age <= 6 ? _SG_DAY_NAMES[sgDow(day)] : _sgkShortDate(day)}: “${sgShort(subject, 40)}”`,
      text: `Add “Reply to ${first}” for today?`,
      why: [`“${sgClip(subject, 60)}” came ${_sgkPlural(age, 'day')} ago, with no reply from you yet.`].concat(flags.length ? [`It is ${flags.join(', ')}.`] : []),
      preview: `Opens a new task "${sgClip(title, 60)}" due today, linked to ${first} and the email, for you to adjust. Save adds it and marks the email as handled. The ✓ adds it at once; Undo removes it.`,
      primary: { label: 'Add for today', icon: 'list-todo', aria: `Add a task to reply to ${first}, filled in`,
        action: { type: 'task.createOpen', args: { title, date: today, people: [pid], tags: ['email'], detail, ignore: subject.split(/\s+/).filter(Boolean).slice(0, 30), afterOps: after } } },
      quick: { label: 'Add it now', icon: 'check', aria: `Add "Reply to ${first}" for today now, with Undo`, action: { type: 'ops', args: { ops, line: `Added: Reply to ${first}` } } },
      secondary, claims: ['email:' + th.id], entity: 'email:' + th.id, people: [pid],
    });
  }
  return out.sort((a, b) => b.urgency - a.urgency || a._age - b._age).slice(0, 3).map(c => { delete c._age; return c; });
}
sgRegisterRule({
  id: 'email-known', area: 'people', title: 'Email from someone you know', value: 4, defaultOn: true,
  description: 'Someone in People emailed 2 to 14 days ago and has no reply yet: make it today’s task.',
  safetyHint: 'The button opens the new task filled in; ✓ adds it at once, with Undo. Never sends anything.',
  needs: ['inbox'], hours: 'work', surfaces: ['hero', 'home', 'story-morning'], cooldown: { notFor: 14 },
  run(ctx) { return sgKnownEmailCards(ctx); },
});

/* ======================= S17 Emails that look like tasks ======================= */
function sgTriageCard(ctx) {
  const handled = new Set(((ctx.inbox && ctx.inbox.threads) || []).filter(t => t && t.handled).map(t => t.id));
  const list = ((ctx.triage && ctx.triage.pending) || []).filter(s => s && s.id && s.emailId && s.title && !handled.has(s.emailId)
    && (s.confidence == null || Number(s.confidence) >= 0.5)).slice(0, 12);
  if (!list.length) return null;
  const today = ctx.now.date;
  const fields = (s, i) => {
    const due = Number.isFinite(Number(s.dueHint)) && s.dueHint !== null && s.dueHint !== '' ? sgAddDays(today, Math.max(0, Math.min(365, Math.round(Number(s.dueHint))))) : null;
    const tags = [...new Set(['email', ...(Array.isArray(s.tags) ? s.tags : [])])].filter(x => x && x !== 'from-email').slice(0, 8);
    // createTag: the triage tags are made as the Email triage page makes them (acceptSuggestion).
    const op = { op: 'task.create', title: String(s.title).slice(0, 200), ref: 'e' + i, tags, ...(tags.length ? { createTag: true } : {}), ...(due ? { dueDate: due } : {}), ...(/^p[0-3]$/.test(s.priority || '') ? { priority: s.priority } : {}),
      ...(s.stream ? { stream: s.stream } : {}), ...(s.detail ? { detail: String(s.detail).slice(0, 2000) } : {}), ...(Array.isArray(s.peopleIds) && s.peopleIds.length ? { people: s.peopleIds.slice(0, 5) } : {}) };
    return { due, tags, op, triage: { op: 'email.triage', threadId: s.emailId, action: 'task', taskId: '$e' + i } };
  };
  const n = list.length;
  const all = [];
  list.slice(0, 8).forEach((s, i) => { const f = fields(s, i); all.push(f.op, f.triage); });
  const names = list.slice(0, 2).map(s => sgShort(s.title, 40));
  const card = {
    key: `triage:${_sgkHash(list.map(s => s.id).sort().join(','))}`, icon: 'inbox', scene: null, urgency: n >= 3 ? 1.1 : 1,
    title: n === 1 ? `An email looks like a task` : `${n} emails look like tasks`,
    text: n === 1 ? `Add “${sgShort(list[0].title, 60)}”?` : `${names.join(', ')}${n > 2 ? ` and ${n - 2} more` : ''}. Add ${n === 2 ? 'both' : 'them'}?`,
    why: [`${_sgkPlural(n, 'suggestion')} from Email triage ${n === 1 ? 'is' : 'are'} waiting for you.`].concat(list[0].confidence != null ? [`The surest is ${Math.round(Number(list[0].confidence) * 100)}% sure.`] : []),
    quick: { label: n === 1 ? 'Add it now' : `Add ${Math.min(n, 8)} now`, icon: 'check', aria: `Add ${_sgkPlural(Math.min(n, 8), 'task')} from email now, with Undo`, action: { type: 'ops', args: { ops: all, line: `Added ${_sgkPlural(Math.min(n, 8), 'task')} from email` } } },
    secondary: [{ label: n === 1 ? 'Not a task' : 'Review in Email triage', icon: n === 1 ? 'x' : 'inbox', action: n === 1
      ? { type: 'ops', args: { ops: [{ op: 'email.triage', threadId: list[0].emailId, action: 'dismiss' }], line: 'Dismissed' } }
      : { type: 'nav', args: { to: 'view', view: 'triage' } } }],
    claims: list.map(s => 'email:' + s.emailId), entity: '',
  };
  if (n === 1) {
    const s = list[0], f = fields(s, 0);
    card.preview = 'Opens the new task filled in from the email, for you to adjust. Save adds it and marks the email as handled. The ✓ adds it at once; Undo removes it.';
    card.primary = { label: 'Add the task', icon: 'list-todo', aria: `Add "${sgShort(s.title, 60)}", filled in`,
      action: { type: 'task.createOpen', args: { title: f.op.title, ...(f.due ? { date: f.due } : {}), tags: f.tags, ...(f.op.priority ? { priority: f.op.priority } : {}), ...(s.stream ? { stream: s.stream } : {}),
        ...(f.op.detail ? { detail: f.op.detail } : {}), ...(f.op.people ? { people: f.op.people } : {}), ignore: String(s.title).split(/\s+/).slice(0, 30),
        afterOps: [{ op: 'email.triage', threadId: s.emailId, action: 'task', taskId: '$new' }] } } };
  } else {
    card.preview = `Opens the ${n} suggestions, all ticked; untick any, then Add. The ✓ adds ${n > 8 ? 'the first 8' : 'all of them'} at once; Undo removes them.`;
    card.primary = { label: `Review ${n}`, icon: 'list-todo', aria: `Choose which of ${n} emails become tasks`,
      action: { type: 'ops.choose', args: { title: 'Emails that look like tasks', intro: 'Tick the ones to add as tasks.', apply: 'Add selected', line: 'Added from email',
        items: list.map((s, i) => { const f = fields(s, i); return { id: s.id, label: sgShort(s.title, 70), sub: f.due ? `Due ${_sgkDay(ctx, f.due)}` : 'No date', on: true, alts: [{ label: 'Add', ops: [f.op, f.triage] }] }; }) } } };
  }
  return card;
}
sgRegisterRule({
  id: 'email-tasks', area: 'people', title: 'Emails that look like tasks', value: 4, defaultOn: true,
  description: 'Email triage found emails that look like tasks: add them in one go.',
  safetyHint: 'The button opens the task (or the list, ticked); ✓ adds them at once, with Undo.',
  needs: [], hours: 'any', surfaces: ['hero', 'home', 'story-morning'], cooldown: { notFor: 7 },
  run(ctx) { const c = sgTriageCard(ctx); return c ? [c] : []; },
});

/* ======================= S18 Meeting just ended ======================= */
function sgAfterMeetingCards(ctx) {
  const out = [];
  const today = ctx.now.date, now = ctx.now.min;
  for (const e of (((ctx.cal && ctx.cal.days) || {})[today] || [])) {
    if (!e || e.allDay || e.declined || e.origin || e.wrapped || e.notes || (e.linked || []).length) continue;
    // A work meeting: a meeting type, or a plain event with guests (not a lunch, a party, travel...).
    if (!(SGK_MEETING_TYPES.includes(e.type) || ((!e.type || e.type === 'event') && (Number(e.attendees) || 0) >= 1))) continue;
    const ppl = (e.people || []).filter(id => _sgkPerson(ctx, id));
    if (!ppl.length) continue;
    const ago = now - e.end;
    if (ago < 0 || ago > 180) continue;
    const endTs = ctx.now.ts - ago * 60000;
    const made = (ctx.tasks || []).some(t => (t.people || []).some(id => ppl.includes(id)) && _sgkTs(t.createdAt) >= endTs);
    if (made) continue;
    const names = ppl.slice(0, 2).map(id => _sgkFirst(_sgkPerson(ctx, id)));
    const who = names.join(' and ') + (ppl.length > 2 ? ` and ${ppl.length - 2} more` : '');
    const due = _sgkWorkDays(ctx, today, 2);
    const title = `Follow up: ${sgClip(e.title, 120)}`;
    out.push({
      key: `after:${e.id}`, icon: 'notebook-pen', scene: null, urgency: ago <= 30 ? 1.2 : 1,
      title: `Your meeting with ${who} ended at ${sgHM(e.end)}`,
      text: 'Anything to follow up?',
      why: [`“${sgClip(e.title, 50)}” ended ${ago < 60 ? _sgkPlural(ago, 'minute') : sgDur(ago)} ago.`, 'It has no notes or tasks yet.'],
      preview: `Opens a new task "${sgClip(title, 60)}" with ${who}, linked to the meeting and due ${_sgkDay(ctx, due)}, for you to adjust. The ✓ adds it at once; Undo removes it.`,
      primary: { label: 'Add actions', icon: 'list-todo', aria: `Add a follow-up task for the meeting with ${who}, filled in`,
        action: { type: 'task.createOpen', args: { title, date: due, people: ppl.slice(0, 5), eventId: e.id, ignore: String(e.title || '').split(/\s+/).slice(0, 30) } } },
      quick: { label: `Follow up ${_sgkDay(ctx, due)}`, icon: 'check', aria: `Add "${sgClip(title, 60)}" for ${_sgkDay(ctx, due)} now, with Undo`,
        action: { type: 'ops', args: { ops: [{ op: 'task.create', title, people: ppl.slice(0, 5), ref: 't' }, { op: 'task.plan', id: '$t', date: due }, { op: 'event.annotate', eventId: e.id, linkTasks: ['$t'] }], line: `Follow-up for ${_sgkDay(ctx, due)}` } } },
      secondary: [{ label: 'Nothing to note', icon: 'check-check', action: { type: 'ops', args: { ops: [{ op: 'event.annotate', eventId: e.id, wrapped: true }], line: 'Wrapped up' } } }],
      claims: ['event:' + e.id], entity: 'event:' + e.id, people: ppl, expiresMin: e.end + 180,
    });
  }
  return out.sort((a, b) => b.urgency - a.urgency).slice(0, 2);
}
sgRegisterRule({
  id: 'meeting-ended', area: 'people', title: 'Meeting just ended', value: 4, defaultOn: true,
  description: 'A meeting with people you know ended in the last 3 hours with nothing noted: add the follow-ups.',
  safetyHint: 'The button opens the new task, linked to the meeting; ✓ adds a follow-up at once, with Undo.',
  needs: ['calendar'], hours: 'any', surfaces: ['hero', 'home'], cooldown: { notFor: 1 },
  run(ctx) { return sgAfterMeetingCards(ctx); },
});

/* ======================= S19 A stream has gone quiet ======================= */
function _sgkIsoWeek(iso) { return sgAddDays(iso, -((sgDow(iso) + 6) % 7)); }
function sgQuietCards(ctx) {
  const out = [];
  const today = ctx.now.date, weekAgo = sgAddDays(today, -7), soon = sgAddDays(today, 30);
  const byStream = new Map();
  for (const t of ctx.tasks || []) if (t && t.stream && t.status !== 'done') (byStream.get(t.stream) || byStream.set(t.stream, []).get(t.stream)).push(t);
  const horizon = _sgkWorkDays(ctx, today, 3);
  for (const [sid, list] of byStream) {
    const open = list.filter(t => _sgkOpen(t) && !t.waiting);
    const urgent = open.filter(t => t.priority === 'p1' || (t.due && t.due >= today && t.due <= soon));
    if (!urgent.length) continue;
    const info = (ctx.streams || {})[sid];
    if (!info) continue;                                          // no record of this stream: no claim it went quiet
    const lastDone = info.lastDone || null;
    if (lastDone && lastDone >= weekAgo) continue;
    // Never done anything in it: only once its work has been open for over a week.
    if (!lastDone && !open.some(t => { const d = _sgkDate(t.createdAt); return d && d < weekAgo; })) continue;
    const subDone = list.some(t => ((t.subtasks && t.subtasks.doneAt) || []).some(ts => { const d = _sgkDate(Number(ts)); return d && d >= weekAgo; }));
    if (subDone) continue;
    const blocked = list.some(t => sgFutureBlocksFor(ctx, t.id).some(b => b.date <= horizon));
    if (blocked) continue;
    urgent.sort((a, b) => ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0) || _sgkRank(a.priority) - _sgkRank(b.priority));
    const t = urgent[0];
    const slot = _sgkBlockSlot(ctx, 120, { gapMin: 90 });
    if (!slot) continue;
    const label = info.label || sid;
    const quiet = lastDone ? sgDaysBetween(lastDone, today) : null;
    const next = urgent.filter(x => x.due).map(x => x.due).sort()[0];
    const args = _sgkBlockArgs(t, slot, 'stream-quiet');
    const when = `${_sgkDay(ctx, slot.date)} ${sgHM(slot.start)}–${sgHM(slot.end)}`;
    const why = [quiet != null ? `Nothing done in ${label} for ${_sgkPlural(quiet, 'day')}.` : `Nothing done in ${label} in the last 7 days.`];
    if (next) why.push(`The next deadline is ${_sgkDay(ctx, next)}, in ${_sgkPlural(sgDaysBetween(today, next), 'day')}.`);
    else why.push(`${_sgkPlural(urgent.length, 'high-priority task')} open.`);
    why.push('No time is booked for it in the next 3 work days.');
    const card = {
      key: `quiet:${sid}:${_sgkIsoWeek(today)}`, icon: 'calendar-plus', scene: null, urgency: next && sgDaysBetween(today, next) <= 7 ? 1.2 : 1,
      title: quiet != null ? `No ${label} work in ${_sgkPlural(quiet, 'day')}` : `${label} has gone quiet`,
      text: `Hold ${when} for “${_sgkT(t.title, 40)}”?`,
      why,
      preview: `Opens a new event "${args.title}" ${when} in your primary calendar, for you to adjust. Save books it and plans the task. The ✓ books it at once; Undo removes it. "Not for this one" pauses ${label} for 14 days.`,
      primary: { label: 'Hold ' + when, icon: 'calendar-plus', aria: `Hold ${when} for ${label}`, action: { type: 'cal.blockOpen', args } },
      quick: { label: 'Book it now', icon: 'check', aria: `Book ${when} for ${label} now, with Undo`, action: { type: 'cal.block', args } },
      secondary: [{ label: 'Open the task', icon: 'list-todo', action: { type: 'task.open', args: { id: t.id } } }],
      claims: ['task:' + t.id, `slot:${slot.date}:${slot.start}-${slot.gapEnd}`], entity: 'stream:' + sid, stream: sid,
    };
    out.push(_sgkNeedsWrite(ctx, card));
  }
  return out.slice(0, 2);
}
sgRegisterRule({
  id: 'stream-quiet', area: 'health', title: 'A stream has gone quiet', value: 5, defaultOn: true,
  description: 'A stream with something important coming has had no progress for a week: hold time for it.',
  safetyHint: 'The button opens the new event filled in, for you to adjust and save; ✓ books it at once, with Undo. Never invites anyone.',
  needs: ['calendar'], hours: 'work', surfaces: ['hero', 'home', 'story-morning'], cooldown: { notFor: 14 },
  run(ctx) { return sgQuietCards(ctx); },
});

/* ======================= S20 Calendar out of date ======================= */
function sgStaleCalCard(ctx, suppressed) {
  if (!ctx.cal || !ctx.cal.ok || !ctx.cal.stale) return null;
  if (!(suppressed || []).length) return null;
  if ((ctx.surfacesVisible || {}).schedule) return null;      // that widget already says "Updated 07:02"
  const at = _sgkTs(ctx.cal.fetchedAt);
  const hours = Number.isFinite(at) ? Math.max(1, Math.round((ctx.now.ts - at) / 3600000)) : null;
  const label = String(ctx.cal.label || '').replace(/^Updated\s+/i, '');
  return {
    key: `calstale:${ctx.now.date}:${ctx.cal.fetchedAt || 'unknown'}`, icon: 'refresh-cw', scene: null, urgency: 1,
    title: label ? `Calendar last updated ${label}` : 'Your calendar is out of date',
    text: 'Update it so free times are right?',
    why: [hours != null ? `The calendar was read ${_sgkPlural(hours, 'hour')} ago.` : 'The calendar has not been read for over 6 hours.',
      `${_sgkPlural(suppressed.length, 'time suggestion')} ${suppressed.length === 1 ? 'is' : 'are'} on hold until it is up to date.`],
    preview: 'Reads your calendar again. Nothing is changed, so there is nothing to undo.',
    primary: { label: 'Update calendar', icon: 'refresh-cw', aria: 'Read the calendar again', action: { type: 'store.refresh', args: { store: 'calendar' } } },
    claims: ['calstale'], entity: '',
  };
}
sgRegisterRule({
  id: 'calendar-stale', area: 'hygiene', title: 'Calendar out of date', value: 3, defaultOn: true,
  description: 'The calendar has not been read for hours and time suggestions are on hold: update it.',
  safetyHint: 'Reads the calendar again; nothing is changed.',
  needs: [], hours: 'any', surfaces: ['hero', 'home'], reads: ['suppressed'], cooldown: { notFor: 1 },
  run(ctx, mem, env) { const c = sgStaleCalCard(ctx, (env && env.suppressed) || []); return c ? [c] : []; },
});
