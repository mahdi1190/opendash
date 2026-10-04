/* ============================================================
   SUGGESTIONS S2-S9: time and calendar cards (SUGGESTIONS_CATALOGUE.md 2.4)
   OWNER: the suggestion-card builder for TIME & CALENDAR.
   ------------------------------------------------------------
   The user's rule (3 Oct): "it's a one click recommendation but it still
   gives us the option where it starts off with the recommendation but still
   we open it and we can adjust etc like normal". So the main button opens
   the NORMAL editor, prefilled (the event card in create mode, the event or
   task card), and the small "✓" applies the suggestion as it is, with Undo.
     S2 block-task       Block time for this task (the task card)
     S3 deadline-hours   Book the hours a deadline needs
     S4 meeting-prep     Prep before a meeting (and what you owe them)
     S5 block-clash      A meeting landed on your block: move it
     S6 answer-invite    Answer an invitation (asks before anyone is told)
     S7 block-started    Your block has started: start the task
     S8 block-missed     A block came and went: re-book it
     S9 tomorrow-first   Book tomorrow's first block (evening)
   A block is always a calendar event (+ task.plan); never a task standing in
   for one. Own events only are moved, resized or removed (origin set, no
   guests); an RSVP needs a second press.
   PURE like 68-suggest-rules-s1.js: no DOM, no page globals, no clock
   (ctx.now). Tests: tests/suggest-time.test.mjs.
   ============================================================ */

/** Event types that count as a meeting (the same list as the brief's BRIEF_MEETING_TYPES). */
const SGT_MEETING_TYPES = Object.freeze(['meeting', 'one-on-one', 'video-call', 'call', 'interview', 'conference', 'lecture']);

/* ---------- small helpers (pure) ---------- */
/** 'today' / 'tomorrow' / 'Thu' for a day relative to ctx.now. cap = capitalised. */
function _sgtDay(ctx, iso, cap) {
  const n = sgDaysBetween(ctx.now.date, iso);
  const w = n === 0 ? 'today' : n === 1 ? 'tomorrow' : _SG_DAY_NAMES[sgDow(iso)];
  return cap ? w.charAt(0).toUpperCase() + w.slice(1) : w;
}
function _sgtRange(a, b) { return `${sgHM(a)}–${sgHM(b)}`; }
function _sgtOpen(t) { return !!t && t.status !== 'done' && !t.waiting; }
/** p1 (high) sorts first; p0 is "no priority" and sorts last, with none. */
function _sgtPrio(t) { const m = /^p([1-9])$/.exec(String(t && t.priority || '')); return m ? Number(m[1]) : 9; }
/** Busy things on a day overlapping [a, b): timed events that are not free or declined (minus `skipId`), and timed tasks. */
function _sgtBusy(ctx, iso, a, b, skipId) {
  const out = [];
  for (const e of ((ctx.cal && ctx.cal.days) || {})[iso] || []) {
    if (!e || e.allDay || e.free || e.declined || e.id === skipId) continue;
    if (e.start < b && e.end > a) out.push(e);
  }
  for (const t of ((ctx.timed || {})[iso]) || []) if (t.start < b && t.end > a) out.push({ id: 'task:' + t.id, title: '', start: t.start, end: t.end, task: true });
  return out;
}
/** ctx without one event (to find where a block could move to). */
function _sgtWithout(ctx, iso, id) {
  const days = Object.assign({}, (ctx.cal && ctx.cal.days) || {});
  days[iso] = (days[iso] || []).filter(e => e && e.id !== id);
  return Object.assign({}, ctx, { cal: Object.assign({}, ctx.cal, { days }) });
}
/** The first free stretch of at least `len` minutes on a day (today: from now). */
function _sgtFirstGap(ctx, iso, len) {
  const g = sgFreeStretches(ctx, iso, { gapMin: Math.max(SG_BLOCK_MIN, len) });
  return g[0] || null;
}
/** The task an own block is for: origin.taskId, else the first linked task. */
function _sgtBlockTask(ctx, b) {
  const id = (b.origin && b.origin.taskId) || (b.linked || [])[0] || '';
  return id ? sgTask(ctx, id) : null;
}
/** Block args (cal.block / cal.blockOpen) for a task on a day. */
function _sgtBlockArgs(t, date, start, len, gapEnd, rule) {
  return { taskId: t ? t.id : null, date, start, end: start + len, gapEnd: gapEnd || start + len, rule, title: sgBlockTitle(t), description: sgBlockDescription(t) };
}
/** G2: no way to write the calendar -> the button says how to get one (never a task); the ✓ goes. */
function _sgtNeedsWrite(ctx, card) {
  if ((ctx.capabilities || {}).calWrite) return card;
  card.primary = { label: 'Connect calendar', icon: 'plug', aria: 'Connect Google Calendar to book time', action: { type: 'nav', args: { to: 'connections', name: 'calendar' } } };
  card.quick = null;
  card.secondary = (card.secondary || []).filter(s => !/^cal\./.test(s.action.type));
  card.preview = 'Opens Connections: once Google Calendar is connected, this button books the time.';
  return card;
}
/** Drop the calendar-changing buttons (✓ and chips) when the calendar cannot be written. */
function _sgtDropWrites(ctx, card) {
  if ((ctx.capabilities || {}).calWrite) return card;
  if (card.quick && /^cal\./.test(card.quick.action.type)) card.quick = null;
  card.secondary = (card.secondary || []).filter(s => !/^cal\./.test(s.action.type));
  return card;
}
function _sgtPlural(n, one, many) { return `${n} ${n === 1 ? one : (many || one + 's')}`; }

/* ============================================================
   S2. Block time for this task (in place: the task card)
   ============================================================ */
/**
 * The card for one task (the open task card): today's first free stretch long enough for
 * L = clamp(estimate || 60, 30, 120), else the next work day's. null when the task is done,
 * waiting, already has a block to come, or no slot exists.
 */
function sgBlockTaskCard(ctx, taskId) {
  const t = sgTask(ctx, taskId);
  if (!_sgtOpen(t) || t.snoozed) return null;
  if (sgFutureBlocksFor(ctx, t.id).length) return null;
  const L = Math.max(30, Math.min(120, Number(t.estimate) || 60));
  const today = ctx.now.date, nwd = sgNextWorkDay(ctx.work, today);
  const gToday = sgIsWorkDay(ctx.work, today) ? _sgtFirstGap(ctx, today, L) : null;
  const gNext = _sgtFirstGap(ctx, nwd, L);
  const g = gToday || gNext;
  if (!g) return null;
  const date = gToday ? today : nwd;
  const len = Math.min(L, g.minutes);
  const args = _sgtBlockArgs(t, date, g.start, len, g.end, 'block-task');
  const range = _sgtRange(args.start, args.end);
  const dayCap = date === today ? '' : _sgtDay(ctx, date, true) + ' ';
  const short = sgShort(t.title, 48);
  const secondary = [];
  if (gToday && gNext) {
    const l2 = Math.min(L, gNext.minutes);
    secondary.push({ label: `${_sgtDay(ctx, nwd, true)} ${sgHM(gNext.start)}`, icon: 'calendar-plus', aria: `Block ${_sgtDay(ctx, nwd)} ${sgHM(gNext.start)} to ${sgHM(gNext.start + l2)} instead`,
      action: { type: 'cal.blockOpen', args: _sgtBlockArgs(t, nwd, gNext.start, l2, gNext.end, 'block-task') } });
  }
  for (const m of [30, 60, 90]) {
    if (secondary.length >= 3) break;
    if (m === len || m > g.minutes) continue;
    secondary.push({ label: sgDur(m), aria: `Block ${sgDur(m)} from ${sgHM(g.start)} instead`, action: { type: 'cal.blockOpen', args: _sgtBlockArgs(t, date, g.start, m, g.end, 'block-task') } });
  }
  const card = {
    key: `blocktask:${t.id}:${date}`,
    icon: 'calendar-plus', scene: t.scene || 'writing', urgency: 1,
    title: `${dayCap}${dayCap ? 'free' : 'Free'} ${_sgtRange(g.start, g.end)}`,
    text: `Block ${sgDur(len)} for this?`,
    why: [`${sgDur(g.minutes)} free ${date === today ? 'today' : _sgtDay(ctx, date)} from ${sgHM(g.start)}.`,
      t.estimate ? `Your estimate for it is ${sgDur(t.estimate)}.` : 'No estimate yet, so an hour.',
      'Nothing is booked for it yet.'],
    preview: `Opens a new event "${args.title}" ${dayCap ? _sgtDay(ctx, date) + ' ' : ''}${range} in your primary Google calendar, with no guests, for you to adjust. `
      + 'Save adds it, links it to this task and plans the task for that day. The ✓ adds it straight away; Undo removes both.',
    primary: { label: `Block ${date === today ? '' : _sgtDay(ctx, date) + ' '}${range}`, icon: 'calendar-plus', aria: `Block ${_sgtDay(ctx, date)} ${sgHM(args.start)} to ${sgHM(args.end)} for ${short}`, action: { type: 'cal.blockOpen', args } },
    quick: { label: 'Add it now', icon: 'check', aria: `Add the block ${sgHM(args.start)} to ${sgHM(args.end)} now, with Undo`, action: { type: 'cal.block', args } },
    secondary,
    claims: [], entity: 'task:' + t.id, stream: t.stream || '',
  };
  if (date === today) card.expiresMin = g.end - SG_BLOCK_MIN;
  return _sgtNeedsWrite(ctx, card);
}
sgRegisterRule({
  id: 'block-task', area: 'time', title: 'Block time for this task', value: 5, defaultOn: true,
  description: 'In an open task: the first free stretch long enough for its estimate (an hour without one), today or on the next work day.',
  safetyHint: 'The button opens the new event filled in, for you to adjust and save; ✓ adds it at once, with Undo. Never invites anyone.',
  needs: ['calendar'], hours: 'any', contextual: true, surfaces: [], inPlace: ['taskcard'],
  cooldown: { notFor: 7 },
  run(ctx) {
    if (!ctx.openTask) return [];
    const c = sgBlockTaskCard(ctx, ctx.openTask);
    return c ? [c] : [];
  },
});

/* ============================================================
   S3. Book the hours a deadline needs
   ============================================================ */
/** The Monday of iso's week (the key re-arms weekly). */
function _sgtWeek(iso) { return sgAddDays(iso, -((sgDow(iso) + 6) % 7)); }
/**
 * For one deadline task: how much is still needed and up to 3 blocks (one per work day,
 * the day's largest free stretch, at most 2 h each) from today to the day before it is due.
 * -> {need, booked, progress, blocks [{date, start, end, gapEnd}], free} or null.
 */
function sgDeadlinePlan(ctx, t) {
  if (!_sgtOpen(t) || !t.due) return null;
  const days = sgDaysBetween(ctx.now.date, t.due);
  if (days < 1 || days > 7) return null;
  if (!(t.priority === 'p1' || t.type === 'deadline')) return null;
  const est = Number(t.estimate) || 0;
  if (est < 60) return null;
  const booked = sgFutureBlocksFor(ctx, t.id).reduce((a, e) => a + Math.max(0, e.end - e.start), 0);
  const st = t.subtasks || {};
  const progress = st.total ? Math.round(est * (Number(st.done) || 0) / st.total) : 0;
  const need = est - booked - progress;
  if (need < 45) return null;
  const blocks = [];
  let left = need;
  for (let i = 0; i < days && blocks.length < 3 && left >= 30; i++) {
    const iso = sgAddDays(ctx.now.date, i);
    if (!sgIsWorkDay(ctx.work, iso)) continue;
    const gaps = sgFreeStretches(ctx, iso);
    let best = null;
    for (const g of gaps) if (!best || g.minutes > best.minutes) best = g;
    if (!best) continue;
    const len = Math.min(best.minutes, SG_BLOCK_MAX, Math.max(30, left));
    if (len < 30) continue;
    blocks.push({ date: iso, start: best.start, end: best.start + len, gapEnd: best.end });
    left -= len;
  }
  return { need, booked, progress, blocks, free: blocks.reduce((a, b) => a + (b.end - b.start), 0), days };
}
function _sgtBlockList(ctx, blocks) {
  const parts = blocks.map(b => `${_sgtDay(ctx, b.date)} ${_sgtRange(b.start, b.end)}`);
  return parts.length <= 1 ? parts.join('') : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}
function sgDeadlineCard(ctx, t) {
  const p = sgDeadlinePlan(ctx, t);
  if (!p) return null;
  const short = sgShort(t.title, 48);
  const dueDay = _sgtDay(ctx, t.due);
  const st = t.subtasks || {};
  const args = p.blocks.map(b => _sgtBlockArgs(t, b.date, b.start, b.end - b.start, b.gapEnd, 'deadline-hours'));
  const short4 = p.free < p.need;
  const why = [`Your estimate is ${sgDur(t.estimate)}${p.progress ? `; ${st.done} of ${st.total} steps done` : ''}.`,
    p.booked ? `${sgDur(p.booked)} is booked for it already.` : 'No time is booked for it yet.',
    `It is due ${dueDay} (in ${_sgtPlural(p.days, 'day')}).`];
  const card = {
    key: `deadline:${t.id}:${_sgtWeek(ctx.now.date)}:${Number(t.estimate) || 0}`,
    icon: 'calendar-clock', scene: t.scene || 'deadline', urgency: p.days <= 2 ? 1.2 : 1,
    title: `${short} is due ${dueDay}`,
    text: !p.blocks.length ? `It needs about ${sgDur(p.need)} and nothing is free before then. Move the deadline?`
      : short4 ? `Only ${sgDur(p.free)} free before ${dueDay}, and it needs about ${sgDur(p.need)}. Book ${_sgtBlockList(ctx, p.blocks)}?`
        : `It needs about ${sgDur(p.need)}${p.booked ? ' more' : ''}. Book ${_sgtBlockList(ctx, p.blocks)}?`,
    why,
    preview: (p.blocks.length ? `The button opens the first block (${_sgtBlockList(ctx, p.blocks.slice(0, 1))}) filled in, for you to adjust and save; it then offers the next. `
      + `The ✓ books ${p.blocks.length === 1 ? 'it' : 'all ' + p.blocks.length} at once (no guests); one Undo removes ${p.blocks.length === 1 ? 'it' : 'them all'}. ` : '')
      + (short4 ? '"Move the deadline" opens the task.' : ''),
    secondary: [],
    claims: ['task:' + t.id].concat(p.blocks.map(b => `slot:${b.date}:${b.start}-${b.gapEnd}`)),
    entity: 'task:' + t.id, stream: t.stream || '',
  };
  const open = args.length ? { label: `Book ${_sgtBlockList(ctx, p.blocks.slice(0, 1))}`, icon: 'calendar-plus', aria: `Book ${_sgtBlockList(ctx, p.blocks.slice(0, 1))} for ${short}`, action: { type: 'cal.blockOpen', args: args[0] } } : null;
  const move = { label: 'Move the deadline', icon: 'calendar-days', aria: `Open ${short} to move its deadline`, action: { type: 'task.open', args: { id: t.id } } };
  if (!args.length || short4) {
    card.primary = move;
    if (open) card.secondary.push(open);
  } else {
    card.primary = open;
    card.secondary.push(move);
  }
  if (args.length) card.quick = args.length === 1
    ? { label: 'Book it now', icon: 'check', aria: 'Book it now, with Undo', action: { type: 'cal.block', args: args[0] } }
    : { label: `Book ${args.length} slots now`, icon: 'check', aria: `Book all ${args.length} slots now, with Undo`, action: { type: 'cal.blockMany', args: { blocks: args } } };
  if (!card.preview) card.preview = 'Opens the task, to move its deadline or change the estimate.';
  if (card.primary.action.type === 'cal.blockOpen') return _sgtNeedsWrite(ctx, card);
  return _sgtDropWrites(ctx, card);
}
sgRegisterRule({
  id: 'deadline-hours', area: 'time', title: 'Book the hours a deadline needs', value: 5, defaultOn: true,
  description: 'A high-priority task due within a week, with an estimate of an hour or more, that does not have enough time booked: up to three blocks before it is due.',
  safetyHint: 'The button opens the first block filled in, for you to adjust and save; ✓ books them all at once, with one Undo. Never invites anyone.',
  needs: ['calendar'], hours: 'work', surfaces: ['home', 'story-morning'],
  cooldown: { notFor: 7 },
  run(ctx) {
    const list = (ctx.tasks || []).filter(t => _sgtOpen(t) && t.due && (t.priority === 'p1' || t.type === 'deadline') && Number(t.estimate) >= 60)
      .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0) || (a.id < b.id ? -1 : 1));
    const out = [];
    for (const t of list) {
      if (out.length >= 2) break;
      const c = sgDeadlineCard(ctx, t);
      if (c) out.push(c);
    }
    return out;
  },
});

/* ============================================================
   S4. Prep before a meeting (and what you owe them)
   ============================================================ */
function _sgtIsMeeting(e) { return !!e && (SGT_MEETING_TYPES.includes(e.type) || (Number(e.attendees) || 0) >= 2); }
/** The meeting to prep for: the next one today, or (from the evening hour) tomorrow's first. */
function _sgtNextMeeting(ctx) {
  const days = (ctx.cal && ctx.cal.days) || {};
  const ok = (e) => e && !e.allDay && !e.free && !e.declined && !e.origin && e.myResponse !== 'needsAction';
  const today = (days[ctx.now.date] || []).filter(e => ok(e) && e.start > ctx.now.min).sort((a, b) => a.start - b.start);
  const m = today.find(_sgtIsMeeting);
  if (m) return { ev: m, date: ctx.now.date };
  if (ctx.now.min >= (Number(ctx.eveningHour) || 17) * 60) {
    const iso = sgAddDays(ctx.now.date, 1);
    const t = (days[iso] || []).filter(ok).sort((a, b) => a.start - b.start).find(_sgtIsMeeting);
    if (t) return { ev: t, date: iso };
  }
  return null;
}
function sgPrepCard(ctx) {
  const nx = _sgtNextMeeting(ctx);
  if (!nx) return null;
  const { ev, date } = nx;
  const isToday = date === ctx.now.date;
  if (isToday && ev.start < ctx.now.min + 30) return null;
  const people = (ev.people || []).filter(p => !(ctx.people && ctx.people[p] && ctx.people[p].self));
  const owe = (ctx.tasks || []).filter(t => _sgtOpen(t) && (t.people || []).some(p => people.includes(p)));
  const linked = (ev.linked || []).filter(id => sgTask(ctx, id));
  const bigNoAgenda = (Number(ev.attendees) || 0) >= 3 && !ev.notes;
  if (!owe.length && !linked.length && !bigNoAgenda) return null;
  const owedNew = owe.filter(t => !(ev.linked || []).includes(t.id));
  const one = people.length === 1 && ctx.people && ctx.people[people[0]] ? (ctx.people[people[0]].first || '') : '';
  const evShort = sgShort(ev.title, 40);
  const head = one && owe.length ? one : evShort;
  const when = `${isToday ? '' : 'tomorrow '}at ${sgHM(ev.start)}`;
  const annotate = owedNew.length
    ? [{ op: 'event.annotate', eventId: ev.id, appendNotes: sgClip('To bring: ' + owedNew.map(t => sgShort(t.title, 60)).join('; '), 1900), linkTasks: owedNew.slice(0, 20).map(t => t.id) }]
    : [];
  const why = [`${evShort} starts ${when}${ev.attendees ? `, with ${_sgtPlural(ev.attendees, 'other person', 'other people')}` : ''}.`];
  if (owe.length) why.push(`You owe ${one || 'them'} ${_sgtPlural(owe.length, 'thing')}: ${owe.slice(0, 3).map(t => sgShort(t.title, 40)).join('; ')}.`);
  if (linked.length) why.push(`${_sgtPlural(linked.length, 'task is', 'tasks are')} linked to it.`);
  if (bigNoAgenda && !owe.length) why.push('There is no agenda or note for it yet.');
  const pStart = ev.start - 30, pEnd = ev.start;
  const free = pStart >= 0 && !_sgtBusy(ctx, date, pStart, pEnd, ev.id).length && (!isToday || pStart >= ctx.now.min + 10);
  const owedLine = owe.length ? `You owe ${one || 'them'} ${_sgtPlural(owe.length, 'thing')}. ` : '';
  const card = {
    key: `prep:${ev.id}`, icon: 'clipboard-list', scene: ev.type || 'meeting', urgency: isToday ? 1.1 : 1,
    title: `${head} ${when}`,
    why, claims: [`event:${ev.id}`], entity: `event:${ev.id}`, expiresDate: date, expiresMin: ev.start - 10, people,
    secondary: [],
  };
  if (free) {
    const desc = [`Prep for ${sgClip(ev.title, 120)} at ${sgHM(ev.start)}.`].concat(owe.length ? ['To bring: ' + owe.slice(0, 6).map(t => sgClip(t.title, 80)).join('; ')] : []).join('\n');
    const base = { date, start: pStart, end: pEnd, title: 'Prep: ' + sgShort(ev.title, 70), description: desc, kind: 'prep', rule: 'meeting-prep', ops: annotate };
    const range = _sgtRange(pStart, pEnd);
    card.text = `${owedLine}Block ${range} to prep?`;
    card.preview = `Opens a new event "${base.title}" ${isToday ? '' : 'tomorrow '}${range} in your calendar, with no guests, for you to adjust and save. `
      + `The ✓ adds it at once${annotate.length ? ' and adds what you owe to the meeting\'s notes' : ''}; Undo removes it.`;
    card.primary = { label: `Book ${range}`, icon: 'calendar-plus', aria: `Book ${range} to prep for ${evShort}`, action: { type: 'cal.createOpen', args: base } };
    card.quick = { label: 'Add it now', icon: 'check', aria: `Add the prep block ${range} now, with Undo`, action: { type: 'cal.create', args: base } };
    card.secondary.push({ label: 'Just 15 min', aria: `Book ${_sgtRange(pEnd - 15, pEnd)} instead`, action: { type: 'cal.createOpen', args: Object.assign({}, base, { start: pEnd - 15 }) } });
    card.claims.push(`slot:${date}:${pStart}-${pEnd}`);
  } else {
    if (!annotate.length) return null;           // nothing to add without a free half hour
    card.text = `${owedLine}Add it to the meeting's agenda?`;
    card.preview = 'The button opens the meeting. The ✓ adds what you owe to its notes and links those tasks to it (only the dashboard changes, not Google); Undo takes it back.';
    card.primary = { label: 'Open the meeting', icon: 'calendar', action: { type: 'event.open', args: { id: ev.id } } };
    card.quick = { label: 'Add to agenda', icon: 'check', aria: 'Add what you owe to the meeting notes, with Undo', action: { type: 'ops', args: { ops: annotate, line: 'Added to the agenda' } } };
  }
  if (free) card.secondary.push({ label: 'Open the meeting', icon: 'calendar', action: { type: 'event.open', args: { id: ev.id } } });
  if (one && /^[a-z0-9][a-z0-9_-]{0,50}$/i.test(people[0])) card.secondary.push({ label: one, icon: 'user', aria: `Open ${one} in People`, action: { type: 'nav', args: { to: 'view', view: 'person:' + people[0] } } });
  return free ? _sgtNeedsWrite(ctx, card) : card;
}
sgRegisterRule({
  id: 'meeting-prep', area: 'time', title: 'Prep before a meeting', value: 4, defaultOn: true,
  description: 'Before a meeting where you owe someone something, have linked tasks, or there is no agenda: the half hour before it, to prepare.',
  safetyHint: 'The button opens the prep event filled in, for you to adjust and save; ✓ adds it at once, with Undo. The meeting itself is never changed in Google.',
  needs: ['calendar'], hours: 'any', surfaces: ['hero', 'home', 'story-morning'], inPlace: ['nextup'],
  cooldown: { notFor: 30 },
  run(ctx) { const c = sgPrepCard(ctx); return c ? [c] : []; },
});

/* ============================================================
   S5. A meeting landed on your block
   ============================================================ */
function sgClashCards(ctx) {
  const ix = sgPrepare(ctx)._sgIx;
  const today = ctx.now.date, tomorrow = sgAddDays(today, 1);
  const out = [];
  const blocks = ix.own.filter(b => !b.allDay && (b.date === tomorrow || (b.date === today && b.start > ctx.now.min)))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.start - b.start));
  for (const b of blocks) {
    const other = (((ctx.cal && ctx.cal.days) || {})[b.date] || []).filter(e => e && e.id !== b.id && !e.origin && !e.free && !e.declined && !e.allDay
      && e.myResponse !== 'needsAction' && Math.min(b.end, e.end) - Math.max(b.start, e.start) >= 15).sort((x, y) => x.start - y.start)[0];
    if (!other) continue;
    const len = b.end - b.start;
    const t = _sgtBlockTask(ctx, b);
    const free = _sgtWithout(ctx, b.date, b.id);
    let to = null;
    const g = _sgtFirstGap(free, b.date, len);
    if (g) to = { date: b.date, start: g.start, end: g.start + len };
    else {
      const nwd = sgNextWorkDay(ctx.work, b.date);
      const g2 = _sgtFirstGap(free, nwd, len);
      if (g2) to = { date: nwd, start: g2.start, end: g2.start + len };
    }
    const oShort = sgShort(other.title, 40);
    const what = t ? `your block for ${sgShort(t.title, 40)}` : 'your focus block';
    const day = b.date === today ? '' : 'Tomorrow, ';
    const toLabel = to ? `${to.date === b.date ? '' : _sgtDay(ctx, to.date, true) + ' '}${_sgtRange(to.start, to.end)}` : '';
    const card = {
      key: `clash:${b.id}:${other.id}`, icon: 'calendar-range', scene: other.type || 'meeting', urgency: 1.2,
      title: `${day}${oShort} at ${sgHM(other.start)} overlaps ${what}`,
      text: to ? `Move the block to ${toLabel}?` : 'There is no free stretch as long as it today or on the next work day. Shorten or remove it?',
      why: [`The block is ${_sgtRange(b.start, b.end)}; ${oShort} is ${_sgtRange(other.start, other.end)}.`,
        `They overlap by ${sgDur(Math.min(b.end, other.end) - Math.max(b.start, other.start))}.`],
      preview: 'The button opens your block, to change it yourself. '
        + (to ? `The ✓ moves it to ${toLabel} at once (only your own block, never the meeting); Undo moves it back.` : ''),
      primary: { label: 'Open the block', icon: 'calendar', aria: `Open the block ${_sgtRange(b.start, b.end)} to adjust it`, action: { type: 'event.open', args: { id: b.id } } },
      quick: to ? { label: `Move to ${toLabel}`, icon: 'check', aria: `Move the block to ${toLabel} now, with Undo`, action: { type: 'cal.move', args: { id: b.id, date: to.date, start: to.start, end: to.end } } } : null,
      secondary: [],
      claims: [`event:${b.id}`], entity: `event:${b.id}`, stream: t ? t.stream || '' : '',
      expiresDate: b.date, expiresMin: b.start,
    };
    if (other.start > b.start && other.start - b.start >= 30) card.secondary.push({ label: `Shorten to ${sgHM(other.start)}`, icon: 'minus', aria: `Make the block end at ${sgHM(other.start)}, with Undo`, action: { type: 'cal.resize', args: { id: b.id, date: b.date, end: other.start } } });
    card.secondary.push({ label: 'Remove the block', icon: 'trash-2', aria: 'Remove the block from your calendar, with Undo', action: { type: 'cal.remove', args: { id: b.id } } });
    card.secondary.push({ label: `Open ${sgShort(other.title, 24)}`, icon: 'calendar', action: { type: 'event.open', args: { id: other.id } } });
    out.push(_sgtDropWrites(ctx, card));
  }
  return out;
}
sgRegisterRule({
  id: 'block-clash', area: 'time', title: 'A meeting landed on your block', value: 5, defaultOn: true,
  description: 'One of your own focus blocks (today or tomorrow) now overlaps a meeting by 15 minutes or more: move it to the next free stretch.',
  safetyHint: 'The button opens your block; ✓ moves it at once, with Undo. Only blocks the dashboard made are moved; the meeting is never touched.',
  needs: ['calendar'], hours: 'any', contextual: true, surfaces: ['hero', 'home'],
  cooldown: { notFor: 7 },
  run(ctx) { return sgClashCards(ctx); },
});

/* ============================================================
   S6. Answer an invitation (confirm: someone is told)
   ============================================================ */
function sgInviteCards(ctx) {
  const days = (ctx.cal && ctx.cal.days) || {};
  const list = [];
  for (let i = 0; i <= 7; i++) {
    const iso = sgAddDays(ctx.now.date, i);
    for (const e of days[iso] || []) {
      if (!e || e.myResponse !== 'needsAction' || e.organizerSelf || e.origin || e.canRsvp === false) continue;
      if (i === 0 && !e.allDay && e.end <= ctx.now.min) continue;
      list.push({ e, iso });
    }
  }
  list.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : a.e.start - b.e.start));
  const out = [];
  for (const { e, iso } of list.slice(0, 3)) {
    const over = e.allDay ? [] : (days[iso] || []).filter(x => x && x.id !== e.id && !x.allDay && !x.free && !x.declined
      && x.myResponse !== 'needsAction' && x.myResponse !== 'tentative' && x.start < e.end && x.end > e.start);
    const hard = over.find(x => !x.origin), soft = over.find(x => x.origin);
    const org = sgClip(String(e.organizer || ''), 40);
    const who = org || sgClip(String(e.organizerEmail || ''), 60) || 'the organiser';   // the confirm names who is told
    const dayCap = _sgtDay(ctx, iso, true);
    const when = e.allDay ? `${dayCap}, all day` : `${dayCap} ${sgHM(e.start)}`;
    const evShort = sgShort(e.title, 40);
    const said = { accepted: 'Going', tentative: 'Maybe', declined: 'Can’t go' };
    const rsvp = (response, label, icon) => ({ label, icon, aria: `${label}: answer ${evShort}. Press twice; ${who} is told.`,
      action: { type: 'cal.rsvp', confirmLabel: `Send ‘${said[response]}’ to ${who}`, args: { id: e.id, response } } });
    const clashLine = hard ? `It overlaps ${sgShort(hard.title, 40)}.` : soft ? 'It overlaps one of your focus blocks (you can move that).' : 'You’re free then.';
    const card = {
      key: `rsvp:${e.id}`, icon: 'mail', scene: e.type || 'meeting', urgency: iso === ctx.now.date ? 1.2 : 1,
      title: `${org ? org + ' invited you' : 'An invitation'}: ${evShort}`,
      text: `${when}. ${clashLine}${hard ? '' : ' Going?'}`,
      why: [e.allDay ? `${dayCap}, all day.` : `${dayCap} ${_sgtRange(e.start, e.end)}.`,
        hard ? `${sgShort(hard.title, 40)} is ${_sgtRange(hard.start, hard.end)}.` : soft ? `Your block is ${_sgtRange(soft.start, soft.end)}.` : 'Nothing else is booked then.',
        'You have not answered yet.'],
      preview: `Your answer goes to ${who}, so each button asks first: press it twice to send. Change it later from the event.`,
      secondary: [], claims: [`event:${e.id}`], entity: `event:${e.id}`, people: e.people || [],
      expiresDate: iso, expiresMin: e.allDay ? undefined : e.start,
    };
    const going = rsvp('accepted', 'Going', 'check');
    const maybe = rsvp('tentative', 'Maybe', 'circle-help');
    const no = rsvp('declined', 'Can’t', 'x');
    const open = { label: 'Open the invitation', icon: 'calendar', action: { type: 'event.open', args: { id: e.id } } };
    if (hard) { card.primary = open; card.secondary.push(going, maybe, no); }
    else { card.primary = going; card.secondary.push(maybe, no, open); }
    out.push(card);
  }
  return out;
}
sgRegisterRule({
  id: 'answer-invite', area: 'time', title: 'Answer an invitation', value: 4, defaultOn: true,
  description: 'An invitation in the next 7 days you have not answered, with whether you are free then.',
  safetyHint: 'Going, Maybe and Can’t each ask first: the organiser is told, so a second press sends it.',
  needs: ['calendar', 'calWrite'], hours: 'any', surfaces: ['home', 'story-morning'],
  cooldown: { notFor: 7 },
  run(ctx) {
    const evening = ctx.now.min >= (Number(ctx.eveningHour) || 17) * 60;
    if (!sgInWorkHours(ctx) && !evening) return [];
    return sgInviteCards(ctx);
  },
});

/* ============================================================
   S7. Your block has started
   ============================================================ */
function sgStartedCard(ctx) {
  const ix = sgPrepare(ctx)._sgIx;
  const b = ix.own.filter(e => e.date === ctx.now.date && !e.allDay && e.start <= ctx.now.min && ctx.now.min < e.end).sort((x, y) => x.start - y.start)
    .find(e => { const t = _sgtBlockTask(ctx, e); return t && t.status === 'todo' && !t.waiting; });
  if (!b) return null;
  const t = _sgtBlockTask(ctx, b);
  const short = sgShort(t.title, 48);
  const card = {
    key: `started:${b.id}`, icon: 'circle-dot', scene: t.scene || 'writing', urgency: 1.25,
    title: `Your ${sgHM(b.start)} block has started`,
    text: `Start ${short}?`,
    why: [`The block runs ${_sgtRange(b.start, b.end)}: ${sgDur(b.end - ctx.now.min)} left.`, `${short} is still to do.`],
    preview: 'The button opens the task. The ✓ marks it in progress at once; Undo puts it back.',
    primary: { label: 'Open the task', icon: 'arrow-right', aria: `Open ${short}`, action: { type: 'task.open', args: { id: t.id } } },
    quick: { label: 'Mark it started', icon: 'check', aria: `Mark ${short} as in progress, with Undo`, action: { type: 'ops', args: { ops: [{ op: 'task.update', id: t.id, status: 'doing' }], line: `Started ${short}` } } },
    secondary: [],
    claims: [`event:${b.id}`], entity: 'task:' + t.id, stream: t.stream || '', expiresMin: b.end,
  };
  const len = b.end - b.start;
  if (b.end + 30 <= 24 * 60 && !_sgtBusy(ctx, b.date, b.end, b.end + 30, b.id).length) {
    card.secondary.push({ label: 'Push back 30 min', icon: 'clock', aria: `Move the block to ${_sgtRange(b.start + 30, b.end + 30)}, with Undo`, action: { type: 'cal.move', args: { id: b.id, date: b.date, start: b.start + 30, end: b.start + 30 + len } } });
  }
  card.secondary.push({ label: 'Skip today', icon: 'calendar-range', aria: 'Remove the block, with Undo', action: { type: 'cal.remove', args: { id: b.id } } });
  return _sgtDropWrites(ctx, card);
}
sgRegisterRule({
  id: 'block-started', area: 'time', title: 'Your block has started', value: 4, defaultOn: true,
  description: 'One of your own focus blocks is under way and its task is still to do: start it.',
  safetyHint: 'The button opens the task; ✓ marks it in progress, with Undo.',
  needs: ['calendar'], hours: 'any', surfaces: ['hero', 'home'],
  cooldown: { notFor: 7 },
  run(ctx) { const c = sgStartedCard(ctx); return c ? [c] : []; },
});

/* ============================================================
   S8. A block came and went
   ============================================================ */
/** Epoch ms of a wall-clock minute on a day, from ctx.now (no time-zone library needed). */
function _sgtTs(ctx, iso, min) { return ctx.now.ts + (sgDaysBetween(ctx.now.date, iso) * 1440 + min - ctx.now.min) * 60000; }
function sgMissedCards(ctx) {
  const ix = sgPrepare(ctx)._sgIx;
  const evening = ctx.now.min >= (Number(ctx.eveningHour) || 17) * 60;
  const out = [];
  const past = ix.own.filter(b => b.date === ctx.now.date && !b.allDay && b.end <= ctx.now.min && (ctx.now.min - b.end <= 180 || evening))
    .sort((x, y) => y.end - x.end);
  const seen = new Set();
  for (const b of past) {
    const t = _sgtBlockTask(ctx, b);
    if (!_sgtOpen(t) || seen.has(t.id)) continue;
    seen.add(t.id);
    if (sgFutureBlocksFor(ctx, t.id).length) continue;
    const a = _sgtTs(ctx, b.date, b.start), z = _sgtTs(ctx, b.date, b.end);
    if (((t.subtasks && t.subtasks.doneAt) || []).some(x => Number(x) >= a && Number(x) <= z)) continue;
    const len = Math.max(SG_BLOCK_MIN, Math.min(240, b.end - b.start));
    const nwd = sgNextWorkDay(ctx.work, ctx.now.date);
    const g = _sgtFirstGap(ctx, nwd, len);
    if (!g) continue;
    const args = _sgtBlockArgs(t, nwd, g.start, len, g.end, 'block-missed');
    const short = sgShort(t.title, 48);
    const dayCap = _sgtDay(ctx, nwd, true);
    const card = {
      key: `rebook:${b.id}`, icon: 'repeat', scene: t.scene || 'writing', urgency: 1,
      title: `The ${sgHM(b.start)} block for ${short} came and went`,
      text: `Book ${_sgtDay(ctx, nwd)} ${_sgtRange(args.start, args.end)}?`,
      why: [`The block was ${_sgtRange(b.start, b.end)}, and ${short} is still open.`, `${dayCap} is free from ${sgHM(g.start)} for ${sgDur(g.minutes)}.`],
      preview: `Opens a new event "${args.title}" ${_sgtDay(ctx, nwd)} ${_sgtRange(args.start, args.end)}, with no guests, for you to adjust and save. The ✓ books it at once; Undo removes it.`,
      primary: { label: `Book ${_sgtDay(ctx, nwd)} ${sgHM(args.start)}`, icon: 'calendar-plus', aria: `Book ${_sgtDay(ctx, nwd)} ${sgHM(args.start)} to ${sgHM(args.end)} for ${short}`, action: { type: 'cal.blockOpen', args } },
      quick: { label: 'Book it now', icon: 'check', aria: 'Book it now, with Undo', action: { type: 'cal.block', args } },
      secondary: [
        { label: 'It’s done', icon: 'circle-check', aria: `Mark ${short} done, with Undo`, action: { type: 'ops', args: { ops: [{ op: 'task.complete', id: t.id }], line: `Done: ${short}` } } },
        { label: 'Open the task', icon: 'arrow-right', action: { type: 'task.open', args: { id: t.id } } },
      ],
      claims: ['task:' + t.id, `slot:${nwd}:${g.start}-${g.end}`], entity: 'task:' + t.id, stream: t.stream || '',
    };
    out.push(_sgtNeedsWrite(ctx, card));
  }
  return out;
}
sgRegisterRule({
  id: 'block-missed', area: 'time', title: 'A block came and went', value: 4, defaultOn: true,
  description: 'One of your own focus blocks ended in the last 3 hours (or today, in the evening) and its task is still open: book it again on the next work day.',
  safetyHint: 'The button opens the new event filled in, for you to adjust and save; ✓ books it at once, with Undo.',
  needs: ['calendar'], hours: 'any', surfaces: ['home', 'story-evening'],
  cooldown: { notFor: 7 },
  run(ctx) { return sgMissedCards(ctx); },
});

/* ============================================================
   S9. Book tomorrow's first block (evening)
   ============================================================ */
/** The task for the next work day's first block: planned or due that day (by priority), else the top Focus task. */
function _sgtTomorrowTask(ctx, nwd, skip) {
  const s = new Set(skip || []);
  const ok = (t) => _sgtOpen(t) && !t.snoozed && !s.has(t.id) && !sgFutureBlocksFor(ctx, t.id).length;
  const day = (ctx.tasks || []).filter(t => ok(t) && (t.planned === nwd || t.due === nwd))
    .sort((a, b) => (_sgtPrio(a) - _sgtPrio(b)) || (a.id < b.id ? -1 : 1));
  if (day.length) return day[0];
  return sgTopTask(ctx, { skip: [...s] });
}
function sgTomorrowCard(ctx) {
  if (ctx.now.min < (Number(ctx.eveningHour) || 17) * 60) return null;
  const nwd = sgNextWorkDay(ctx.work, ctx.now.date);
  const ix = sgPrepare(ctx)._sgIx;
  if (ix.own.some(e => e.date === nwd && !e.allDay && e.start < 12 * 60)) return null;
  const g = sgFreeStretches(ctx, nwd).find(x => x.minutes >= 90 && x.start < 12 * 60);
  if (!g) return null;
  const t = _sgtTomorrowTask(ctx, nwd);
  if (!t) return null;
  const len = Math.min(g.minutes, SG_BLOCK_MAX);
  const args = _sgtBlockArgs(t, nwd, g.start, len, g.end, 'tomorrow-first');
  const short = sgShort(t.title, 48);
  const dayCap = _sgtDay(ctx, nwd, true);
  const w = sgWork(ctx.work);
  const card = {
    key: `tomorrow:${nwd}`, icon: 'sunrise', scene: t.scene || 'writing', urgency: 1,
    title: g.start === w.start ? `${dayCap} is clear until ${sgHM(g.end)}` : `${dayCap} is free ${_sgtRange(g.start, g.end)}`,
    text: `Start with ${short} at ${sgHM(g.start)}?`,
    why: [`${sgDur(g.minutes)} free from ${sgHM(g.start)} ${_sgtDay(ctx, nwd)}.`,
      t.planned === nwd ? `${short} is planned for ${_sgtDay(ctx, nwd)}.` : t.due === nwd ? `${short} is due ${_sgtDay(ctx, nwd)}.` : `${short} is first in Focus.`,
      'Nothing is booked for that morning yet.'],
    preview: `Opens a new event "${args.title}" ${_sgtDay(ctx, nwd)} ${_sgtRange(args.start, args.end)}, with no guests, for you to adjust and save. The ✓ books it at once; Undo removes it.`,
    primary: { label: `Book ${_sgtRange(args.start, args.end)}`, icon: 'calendar-plus', aria: `Book ${_sgtDay(ctx, nwd)} ${sgHM(args.start)} to ${sgHM(args.end)} for ${short}`, action: { type: 'cal.blockOpen', args } },
    quick: { label: 'Book it now', icon: 'check', aria: 'Book it now, with Undo', action: { type: 'cal.block', args } },
    secondary: [],
    claims: [`slot:${nwd}:${g.start}-${g.end}`, 'task:' + t.id], entity: 'task:' + t.id, stream: t.stream || '',
  };
  const other = _sgtTomorrowTask(ctx, nwd, [t.id]);
  if (other) card.secondary.push({ label: sgShort(other.title, 28), icon: 'calendar-plus', aria: `Book it for ${other.title} instead`, action: { type: 'cal.blockOpen', args: _sgtBlockArgs(other, nwd, g.start, len, g.end, 'tomorrow-first') } });
  if ((ctx.focus || [])[0] !== t.id) {
    const order = [t.id].concat((ctx.focus || []).filter(id => id !== t.id)).slice(0, 30);
    card.secondary.push({ label: 'Just put it first in Focus', icon: 'arrow-up', aria: `Put ${short} first in Focus, with Undo`, action: { type: 'ops', args: { ops: [{ op: 'home.set_focus', order }], line: `${short} is first in Focus` } } });
  }
  return _sgtNeedsWrite(ctx, card);
}
sgRegisterRule({
  id: 'tomorrow-first', area: 'time', title: 'Book tomorrow’s first block', value: 4, defaultOn: true,
  description: 'In the evening, when the next work day has a clear morning (90 minutes or more before noon): book its first block for the task planned or due, else your top Focus task.',
  safetyHint: 'The button opens the new event filled in, for you to adjust and save; ✓ books it at once, with Undo.',
  needs: ['calendar'], hours: 'evening', surfaces: ['home', 'story-evening'],
  cooldown: { notFor: 7 },
  run(ctx) { const c = sgTomorrowCard(ctx); return c ? [c] : []; },
});
