/* ============================================================
   SUGGESTIONS T1-T14: travel and time zones (travel spec 5.6). Owner: TRIPS.
   User request, 3 Oct: "we can make recommendations based off the location
   and country and timezone". Every card follows the user's rule (3 Oct): the
   PRIMARY opens the normal editor PREFILLED (task card, event card, person
   page, a selectList preview, Settings); a small ✓ applies it as it is, with
   Undo, where that is safe.
   PURE like 68-suggest-rules-s1.js: rules read ctx only, never the page.
   The facts come from ctx.travel, which 69-travel.js trSnapshot() builds with
   69-travel-logic.js trBuildSnapshot() (Node and tests: lib/travel-logic.mjs):
     ctx.travel = {
       on, now (ms), zone (effective), today, home {zone, cc, label, ccy}, system {zone, cc, isHome},
       overrideReady, where {place {cc, cityId, label, zone}, source, conf, away, domestic, layover, mismatch},
       away, trip (the current / next / just-ended one),
       trips [{id, label, dest {cc, cityId, label, zone}, from, to, start, end, status (planned | departing |
               away | returning | home | past), nights, workDays, intl, domestic, candidate, confirmed, unplanned,
               sources, legs, outbound, inbound, events, tasks, ooo, packTask, awayTasks [{id, title, due,
               planned}], plugs, plugsDiffer, ccy, diffMin, slug, weather {lo, hi, rainDays}|null, meetings}],
       legs [{eventId, mode, code, from, to, depart, arrive, dep {date, min}, arr, leave {buffer, travel,
              leaveWall, atWall}, leaveBlock, checkinTask, tripId, intl}]   (in 48 h, or landed in 36 h)
       landed {eventId, tripId, zone, label, cc, minutes, until, code} | null   (T7)
       body {D, Dtomorrow, dir, bodyNowMin, active, zoneMatches} | null           (T8)
       meetings [{eventId, title, date, min, endMin, start, end, organizerSelf, attendees, tripId,
                  local {zone, label, date, min} | null, their [{personId, first, name, zone, label, cc,
                  date, min, unsocial, diffMin}], unsocial, slot {date, startMin, endMin} | null}]
       personZones [{personId, first, name, zone, label, n}]                      (T13)
       holidays [{cc, date, name, home, why}], daysOff, longStay {zone, label, days} | null
     }
   Keys follow the spec (5.6): tr-checkin:<eventId>, tr-leaveby:<eventId>, tr-pack:<tripId>, tr-awaydue:<tripId>,
   tr-ooo:<tripId>, tr-awaymeet:<eventId>, tr-usezone:<tripId>, tr-jetlag:<date>, tr-jetprep:<tripId>,
   tr-holiday:<cc>:<date>, tr-back:<tripId>, tr-theirtime:<eventId>, tr-ptz:<personId>:<zone>, tr-trip:<tripId>
   (and tr-homezone:<zone>, the long stay of 3.3). Rule ids are the spec's (travel-checkin ... travel-trip-found).
   Tests: tests/travel-rules.test.mjs (+ tests/fixtures/travel/).
   ============================================================ */

const _SG_TR_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _SG_TR_DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** The travel facts when travel features are on (else null: every T rule stays quiet). */
function sgTravel(ctx) { const t = ctx && ctx.travel; return t && t.on && Array.isArray(t.trips) ? t : null; }
/** 'Mon 12 Oct'. */
function sgTrDate(iso) {
  const [, m, d] = String(iso || '').split('-').map(Number);
  return `${_SG_DAY_NAMES[sgDow(iso)]} ${d} ${_SG_TR_MONTHS[(m || 1) - 1]}`;
}
/** 'today' | 'tomorrow' | 'on Saturday' (this week) | 'on Mon 12 Oct'. */
function sgTrWhen(iso, today) {
  const n = sgDaysBetween(today, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n > 1 && n < 7) return 'on ' + _SG_TR_DAYS_LONG[sgDow(iso)];
  return 'on ' + sgTrDate(iso);
}
/** '4–9 Oct', '28 Sep – 3 Oct'. */
function sgTrRange(from, to) {
  if (!to || to === from) return sgTrDate(from).slice(4);
  const [, m1, d1] = from.split('-').map(Number), [, m2, d2] = to.split('-').map(Number);
  return m1 === m2 ? `${d1}–${d2} ${_SG_TR_MONTHS[m2 - 1]}` : `${d1} ${_SG_TR_MONTHS[m1 - 1]} – ${d2} ${_SG_TR_MONTHS[m2 - 1]}`;
}
/** 'Mon–Fri' for a trip's days. */
function sgTrDays(from, to) { return `${_SG_DAY_NAMES[sgDow(from)]}–${_SG_DAY_NAMES[sgDow(to || from)]}`; }
/** '+8 h', '−5 h 30'. */
function sgTrDiff(min) {
  const v = Math.round(Number(min) || 0), a = Math.abs(v), h = Math.floor(a / 60), m = a % 60;
  return (v >= 0 ? '+' : '−') + (h ? `${h} h${m ? ' ' + m : ''}` : `${m} min`);
}
function sgTrPlural(n, one, many) { return `${n} ${n === 1 ? one : many || one + 's'}`; }
function sgTrLabel(trip) { return (trip && (trip.label || (trip.dest && (trip.dest.label || trip.dest.name)))) || 'your trip'; }
function sgTrTags(trip) { return ['trip'].concat(trip && trip.slug ? [trip.slug] : []); }
/** Proposed dates for moving tasks: the first work day on or after `from`, at most 3 a day. */
function sgTrSpread(ctx, items, from, skip) {
  const per = new Map();
  let day = from;
  for (let i = 0; i < 14 && (!sgIsWorkDay(ctx.work, day) || (skip && skip.has(day))); i++) day = sgAddDays(day, 1);
  return items.map((t) => {
    while ((per.get(day) || 0) >= 3 || !sgIsWorkDay(ctx.work, day) || (skip && skip.has(day))) day = sgAddDays(day, 1);
    per.set(day, (per.get(day) || 0) + 1);
    return Object.assign({}, t, { to: day });
  });
}
/** The ops that move one task: a due date moves (task.reschedule), a plan-only task is re-planned (task.plan). */
function sgTrMoveOps(t, reason) {
  if (t.due) return [{ op: 'task.reschedule', id: t.id, dueDate: t.to, reason }];
  return [{ op: 'task.plan', id: t.id, date: t.to }];
}
/** A selectList preview (list.open) and its ✓ (ops) for moving tasks. */
function sgTrMoveCard(rows, o) {
  const listRows = rows.map(t => ({ id: t.id, label: sgShort(t.title, 60), sub: `${t.due ? 'Due' : 'Planned'} ${sgTrDate(t.due || t.planned)} → ${sgTrDate(t.to)}`, ops: sgTrMoveOps(t, o.reason) }));
  return {
    primary: { label: o.primaryLabel, icon: 'calendar-clock', action: { type: 'list.open', args: { title: o.listTitle, rows: listRows, applyLabel: 'Move selected', line: o.line } } },
    quick: { label: o.quickLabel || 'Move them', icon: 'check', action: { type: 'ops', args: { ops: listRows.flatMap(r => r.ops), line: o.line } } },
  };
}

/* ---------- T1: check in online ---------- */
function sgTrCheckinCard(ctx, T, l) {
  const h = (l.depart - T.now) / 3600000;
  if (l.mode !== 'flight' || h < 20 || h > 48 || l.checkinTask) return null;
  const today = ctx.now.date;
  const dueDate = sgAddDays(l.dep.date, -1) < today ? today : sgAddDays(l.dep.date, -1);
  const dueMin = Math.max(19 * 60, sgDaysBetween(dueDate, l.dep.date) === 1 ? ((l.dep.min % 1440) + 1440) % 1440 : 0);
  const dueTime = sgHM(Math.min(23 * 60 + 45, Math.ceil(dueMin / 5) * 5));
  const dest = (l.to && (l.to.label || l.to.name)) || 'your destination';
  const what = l.code || 'your flight';
  const title = `Check in online: ${l.code || dest}`;
  const trip = T.trips.find(t => t.id === l.tripId) || null;
  const tags = sgTrTags(trip || { slug: (l.to && l.to.cityId) || '' });
  const tonight = dueDate === today ? 'tonight' : sgTrWhen(dueDate, today).replace(/^on /, '');
  return {
    key: `tr-checkin:${l.eventId}`, icon: 'circle-check', scene: 'flight', urgency: h <= 30 ? 1.3 : 1,
    title: `Flight ${sgTrWhen(l.dep.date, today).replace(/^on /, '')} ${sgHM(l.dep.min)}: add “Check in online” for ${tonight}?`,
    text: `${what} to ${dest}. Online check-in usually opens 24 h before.`,
    why: [`${what} to ${dest} leaves ${sgTrWhen(l.dep.date, today)} at ${sgHM(l.dep.min)}, in ${Math.round(h)} h.`, 'Online check-in usually opens 24 h before departure.', 'No check-in task for it yet.'],
    preview: `Opens a new task “${title}”, due ${sgTrDate(dueDate)} at ${dueTime}, tagged ${tags.join(' and ')} and linked to the flight, for you to adjust. Save adds it. The ✓ adds it straight away; Undo removes it.`,
    primary: { label: `Add for ${tonight}…`, icon: 'list-todo', aria: `Add a check-in task for ${what}, due ${sgTrDate(dueDate)} ${dueTime}`,
      action: { type: 'task.createOpen', args: { title, date: dueDate, time: dueTime, minutes: 15, tags, eventId: l.eventId } } },
    quick: { label: 'Add it now', icon: 'check', aria: `Add the check-in task for ${what} now, with Undo`, action: { type: 'ops', args: { line: `Added “${title}”`, ops: [
      { op: 'task.create', ref: 'checkin', title, dueDate, tags, createTag: true },
      { op: 'task.plan', id: '$checkin', date: dueDate, time: dueTime, minutes: 15 },
      { op: 'event.annotate', eventId: l.eventId, linkTasks: ['$checkin'] }] } } },
    claims: [`checkin:${l.eventId}`], entity: `event:${l.eventId}`,
  };
}
sgRegisterRule({
  id: 'travel-checkin', area: 'travel', title: 'Check in online before a flight', value: 5,
  description: 'A flight leaves in the next two days and nothing reminds you to check in: a task for the evening before, linked to the flight.',
  safetyHint: 'The button opens the new task filled in; ✓ adds it at once, with Undo.',
  needs: ['travel'], hours: 'any', surfaces: ['hero', 'home'], inPlace: ['travel'], multi: true,
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    return (T.legs || []).map(l => sgTrCheckinCard(ctx, T, l)).filter(Boolean).slice(0, 2);
  },
});

/* ---------- T2: leave by ---------- */
function sgTrLeaveCard(ctx, T, l) {
  const h = (l.depart - T.now) / 3600000;
  if (h < 3 || h > 30 || l.leaveBlock || !l.leave) return null;
  const lv = l.leave, a = lv.leaveWall, b = lv.atWall;
  const date = a.date;
  const start = a.min, end = b.date === a.date ? b.min : 24 * 60;
  if (end - start < 15 || date < ctx.now.date || (date === ctx.now.date && end <= ctx.now.min)) return null;
  const place = (l.from && (l.from.label || l.from.name)) || (l.mode === 'flight' ? 'the airport' : 'the station');
  const at = l.mode === 'flight' ? 'the airport' : 'the station';
  const what = l.mode === 'flight' ? 'flight' : l.mode === 'eurostar' ? 'Eurostar' : l.mode;
  const range = `${sgHM(start)}–${sgHM(end)}`;
  const title = `Travel to ${place}`;
  const args = { date, start, end, title, kind: 'travel', rule: 'travel-leave-by', location: place, description: `${l.code ? l.code + ' ' : ''}leaves at ${sgHM(l.dep.min)}.` };
  const caps = ctx.capabilities || {};
  const card = {
    key: `tr-leaveby:${l.eventId}`, icon: 'calendar-plus', scene: l.mode === 'flight' ? 'flight' : 'train', urgency: h <= 12 ? 1.3 : 1.1,
    title: `Leave by ${sgHM(start)}`,
    text: `For the ${sgHM(l.dep.min)} ${what}: ${sgDur(lv.buffer)} at ${at} plus about ${sgDur(lv.travel)} to get there. Block it in the calendar?`,
    why: [`${l.code || 'Your ' + what} leaves ${sgTrWhen(l.dep.date, ctx.now.date)} at ${sgHM(l.dep.min)}.`, `${sgDur(lv.buffer)} at ${at} and ${sgDur(lv.travel)} to get there.`, 'Nothing in your calendar covers getting there yet.'],
    preview: `Opens a new event “${title}”, ${sgTrWhen(date, ctx.now.date)} ${range}, in your primary calendar with no guests, for you to adjust. Save adds it. The ✓ adds it straight away; Undo removes it.`,
    primary: { label: `Block ${range}…`, icon: 'calendar-plus', aria: `Block ${range} to travel to ${place}`, action: { type: 'cal.createOpen', args } },
    quick: { label: 'Add it now', icon: 'check', aria: `Add the travel block ${range} now, with Undo`, action: { type: 'cal.create', args } },
    claims: [`slot:${date}:${start}-${end}`, `leaveby:${l.eventId}`], entity: `event:${l.eventId}`, expiresDate: date, expiresMin: date === ctx.now.date ? start : undefined,
  };
  if (!caps.calWrite) {
    card.primary = { label: 'Connect calendar', icon: 'plug', action: { type: 'nav', args: { to: 'connections', name: 'calendar' } } };
    card.quick = null;
    card.preview = 'Opens Connections: once Google Calendar is connected, this button blocks the time to get there.';
  }
  return card;
}
sgRegisterRule({
  id: 'travel-leave-by', area: 'travel', title: 'When to leave for a flight or train', value: 5,
  description: 'A flight or train leaves within 30 hours: block the time to get to the airport or station.',
  safetyHint: 'The button opens the new event filled in; ✓ adds it at once, with Undo. Never invites anyone.',
  needs: ['travel'], hours: 'any', surfaces: ['hero', 'home'], inPlace: ['travel'], multi: true,
  run(ctx) { const T = sgTravel(ctx); return T ? (T.legs || []).map(l => sgTrLeaveCard(ctx, T, l)).filter(Boolean).slice(0, 2) : []; },
});

/* ---------- T3: pack ---------- */
function sgTrPackList(T, t) {
  const out = [];
  if (t.intl) out.push('Passport');
  if (t.plugsDiffer && t.plugs) out.push(`Travel adapter, type ${t.plugs.split('').join('/')}`);
  const w = t.weather;
  if (w && w.rainDays > 0) out.push('Umbrella');
  if (w && Number.isFinite(w.lo) && w.lo < 8) out.push('Warm coat');
  else if (w && Number.isFinite(w.lo) && w.lo < 16) out.push('Light jacket');
  if (w && Number.isFinite(w.hi) && w.hi >= 25) out.push('Sun cream and a hat');
  if (t.ccy && T.home && t.ccy !== T.home.ccy) out.push(`${t.ccy}, or a card without fees`);
  out.push('Chargers', 'Medication', 'Copy of the booking');
  return out;
}
sgRegisterRule({
  id: 'travel-pack', area: 'travel', title: 'A packing list before a trip', value: 4,
  description: 'A trip starts in the next three days: a packing task with a list made for it (passport, adapter, umbrella...).',
  safetyHint: 'The button opens the new task with its list filled in; ✓ adds it at once, with Undo.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const t = T.trips.find(x => !x.candidate && x.dest && !x.packTask && ['planned', 'departing'].includes(x.status)
      && sgDaysBetween(ctx.now.date, x.from) >= 1 && sgDaysBetween(ctx.now.date, x.from) <= 3);
    if (!t) return [];
    const label = sgTrLabel(t);
    const list = sgTrPackList(T, t);
    const w = t.weather;
    const facts = [t.nights ? sgTrPlural(t.nights, 'night') : '', w && Number.isFinite(w.lo) && Number.isFinite(w.hi) ? `${Math.round(w.lo)}–${Math.round(w.hi)}°` : '',
      w && w.rainDays ? `rain on ${sgTrPlural(w.rainDays, 'day')}` : ''].filter(Boolean);
    const dueDate = sgAddDays(t.from, -1) < ctx.now.date ? ctx.now.date : sgAddDays(t.from, -1);
    const title = `Pack for ${label}`;
    const tags = sgTrTags(t);
    const leg = t.outbound && t.outbound.legs && t.outbound.legs[0];
    const plugLine = t.plugsDiffer && t.plugs ? `${t.dest.name || label} uses plug types ${t.plugs.split('').join('/')}: your plugs need an adapter.` : '';
    return [{
      key: `tr-pack:${t.id}`, icon: 'luggage', scene: 'travel', urgency: sgDaysBetween(ctx.now.date, t.from) <= 1 ? 1.2 : 1,
      title: `${title}${facts.length ? ': ' + facts.join(', ') : ''}`,
      text: plugLine || `A packing list made for this trip, ${sgTrPlural(list.length, 'thing')} to tick off.`,
      why: [`${label}, ${sgTrRange(t.from, t.to)}${t.nights ? ` (${sgTrPlural(t.nights, 'night')})` : ''}: you leave ${sgTrWhen(t.from, ctx.now.date)}.`]
        .concat(plugLine ? [plugLine] : [], w && w.rainDays ? [`Rain is forecast on ${sgTrPlural(w.rainDays, 'day')}.`] : [], ['No packing task for it yet.']),
      preview: `Opens a new task “${title}” due ${sgTrDate(dueDate)} with ${sgTrPlural(list.length, 'step')} (${list.slice(0, 3).join(', ')}…), tagged ${tags.join(' and ')}, for you to adjust. Save adds it. The ✓ adds it straight away; Undo removes it.`,
      primary: { label: 'Make the list…', icon: 'list-checks', action: { type: 'task.createOpen', args: { title, date: dueDate, time: '19:00', tags, subtasks: list, ...(leg ? { eventId: leg.eventId } : {}) } } },
      quick: { label: 'Add it now', icon: 'check', action: { type: 'ops', args: { line: `Added “${title}”`, ops: [{ op: 'task.create', title, dueDate, tags, createTag: true, subtasks: list }] } } },
      claims: [`pack:${t.id}`], entity: `trip:${t.id}`,
    }];
  },
});

/* ---------- T4: due while you're away ---------- */
sgRegisterRule({
  id: 'travel-away-due', area: 'travel', title: 'Things due while you are away', value: 4,
  description: 'Tasks due or planned on the days of a trip: move them to the first work days back.',
  safetyHint: 'The button shows the list with the new dates, ticked, for you to choose; ✓ moves them all at once, with Undo.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const t = T.trips.find(x => !x.candidate && x.to && (x.awayTasks || []).length && ['planned', 'departing', 'away'].includes(x.status)
      && sgDaysBetween(ctx.now.date, x.from) <= 7);
    if (!t) return [];
    const back = sgAddDays(t.to, 1);
    const rows = sgTrSpread(ctx, t.awayTasks.slice(0, 12), back);
    const n = rows.length, first = rows[0].to;
    const label = sgTrLabel(t);
    const mv = sgTrMoveCard(rows, { reason: `Away: ${label}`, primaryLabel: 'Choose…', quickLabel: `Move ${n === 1 ? 'it' : 'them'}`, listTitle: `Due while you're away in ${label}`, line: `Moved ${sgTrPlural(n, 'task')}` });
    return [{
      key: `tr-awaydue:${t.id}`, icon: 'calendar-clock', scene: 'travel', urgency: 1,
      title: `${sgTrPlural(n, 'thing')} ${n === 1 ? 'is' : 'are'} due while you're away. Move ${n === 1 ? 'it' : 'them'} to ${sgTrDate(first)}?`,
      text: `${label}, ${sgTrRange(t.from, t.to)}. ${sgTrDate(first)} is your first work day back.`,
      why: [`You're away ${sgTrRange(t.from, t.to)}.`, `${sgTrPlural(n, 'open task')} ${n === 1 ? 'is' : 'are'} due or planned on those days.`, 'At most 3 are put on any one day.'],
      preview: `Shows the ${sgTrPlural(n, 'task')} with their new dates, all ticked: Apply moves the ticked ones in one step. The ✓ moves them all at once. Undo puts them back.`,
      primary: mv.primary, quick: mv.quick,
      claims: rows.map(r => 'task:' + r.id), entity: `trip:${t.id}`,
    }];
  },
});

/* ---------- T5: out of office ---------- */
sgRegisterRule({
  id: 'travel-ooo', area: 'travel', title: 'An out-of-office event for a trip', value: 3,
  description: 'A trip covers two or more work days and nothing in the calendar says you are away: an all-day "Away" event.',
  safetyHint: 'The button opens the new all-day event filled in; ✓ adds it at once, with Undo. Never invites anyone.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const t = T.trips.find(x => !x.candidate && x.to && !x.ooo && x.workDays >= 2 && ['planned', 'departing'].includes(x.status) && sgDaysBetween(ctx.now.date, x.from) <= 21);
    if (!t) return [];
    const label = sgTrLabel(t);
    const title = `Away: ${label}`;
    const args = { allDay: true, date: t.from, endDate: sgAddDays(t.to, 1), title, kind: 'travel', rule: 'travel-ooo' };
    const caps = ctx.capabilities || {};
    const card = {
      key: `tr-ooo:${t.id}`, icon: 'calendar-days', scene: 'holiday', urgency: 0.9,
      title: `Away ${sgTrDays(t.from, t.to)}: add an out-of-office event?`,
      text: `An all-day “${title}” for ${sgTrRange(t.from, t.to)}, so people who see your calendar know.`,
      why: [`${label}, ${sgTrRange(t.from, t.to)}, covers ${sgTrPlural(t.workDays, 'work day')}.`, 'Nothing in your calendar says you are away.'],
      preview: `Opens a new all-day event “${title}” from ${sgTrDate(t.from)} to ${sgTrDate(t.to)} in your primary calendar, with no guests, for you to adjust. Save adds it. The ✓ adds it straight away; Undo removes it.`,
      primary: { label: 'Add it…', icon: 'calendar-plus', action: { type: 'cal.createOpen', args } },
      quick: { label: 'Add it now', icon: 'check', action: { type: 'cal.create', args } },
      claims: [`ooo:${t.id}`], entity: `trip:${t.id}`,
    };
    if (!caps.calWrite) { card.primary = { label: 'Connect calendar', icon: 'plug', action: { type: 'nav', args: { to: 'connections', name: 'calendar' } } }; card.quick = null; card.preview = 'Opens Connections: once Google Calendar is connected, this button adds the event.'; }
    return [card];
  },
});

/* ---------- T6: a meeting at night where you will be ---------- */
sgRegisterRule({
  id: 'travel-meet-hours', area: 'travel', title: 'A meeting at night while you are away', value: 3,
  description: 'A meeting with other people during a trip falls between 22:00 and 07:00 where you will be.',
  safetyHint: 'Opens the meeting; answering or moving it stays with you (guests are asked first).',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'], multi: true,
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const out = [];
    for (const m of T.meetings || []) {
      if (!m.local || !m.tripId || out.length >= 2) continue;
      const t = T.trips.find(x => x.id === m.tripId);
      if (!t || !['planned', 'departing', 'away', 'returning'].includes(t.status)) continue;
      const lm = m.local.min;
      if (!(lm >= 22 * 60 || lm < 7 * 60)) continue;
      const where = m.local.label || sgTrLabel(t);
      out.push({
        key: `tr-awaymeet:${m.eventId}`, icon: 'moon', scene: 'video-call', urgency: 1,
        title: `${sgShort(m.title, 40)} is ${sgHM(lm)} in ${where}`,
        text: `${sgTrDate(m.local.date)} at ${sgHM(lm)} ${where} time, ${sgHM(m.min)} on your calendar now. Move it, or join from there?`,
        why: [`You'll be in ${where} ${sgTrRange(t.from, t.to)}.`, `It starts at ${sgHM(lm)} there, between 22:00 and 07:00.`, `${sgTrPlural(m.attendees, 'other person', 'other people')} ${m.attendees === 1 ? 'is' : 'are'} invited.`],
        preview: 'Opens the meeting. Nothing changes unless you change it; guests are asked before they are emailed.',
        primary: { label: 'Open the meeting', icon: 'calendar', action: { type: 'event.open', args: { id: m.eventId } } },
        claims: [`event:${m.eventId}`], entity: `event:${m.eventId}`,
      });
    }
    return out;
  },
});

/* ---------- T7: landed, but the computer still shows home time ---------- */
sgRegisterRule({
  id: 'travel-use-zone', area: 'travel', title: 'Landed: use the local time', value: 5,
  description: 'Your flight landed abroad more than 30 minutes ago but this computer still shows home time.',
  safetyHint: 'The button opens Settings > Travel & time (or the Windows date and time page); ✓ uses the local time until the trip ends, with Undo.',
  needs: ['travel'], hours: 'any', surfaces: ['hero', 'home'], inPlace: ['travel'], contextual: true,
  run(ctx) {
    const T = sgTravel(ctx);
    const L = T && T.landed;
    if (!L || !L.zone || (T.zone && T.zone === L.zone)) return [];   // the dashboard already shows the local time (the override, 2.8)
    const where = L.label || 'your destination';
    const home = (T.home && T.home.label) || 'home';
    const ready = !!T.overrideReady;
    const card = {
      key: `tr-usezone:${L.tripId || L.eventId}`, icon: 'globe', scene: 'flight', urgency: 1.4,
      title: `Your flight landed in ${where}. This computer still shows ${home} time.`,
      text: ready ? `Show ${where} time until ${sgTrDate(L.until)}? Tasks keep their dates; meetings show both times.` : `Switch the time zone in Windows and the dashboard follows at once.`,
      why: [`${L.code || 'Your flight'} landed ${L.minutes >= 90 ? sgDur(L.minutes) : L.minutes + ' min'} ago.`, `This computer is still on ${home} time.`],
      preview: ready ? `Opens Settings > Travel & time with “Use ${where} time until ${sgTrDate(L.until)}” ticked, for you to save. The ✓ switches it now; Undo goes back to following the computer.`
        : 'Opens the Windows date and time settings (your browser asks first). Nothing in the dashboard changes until Windows does.',
      // nav 'clock' (87-clock-override.js): Settings with the trip's zone ticked for Save; without the override, Windows' own page.
      primary: { label: ready ? `Use ${where} time…` : 'Change it in Windows', icon: ready ? 'globe' : 'external-link',
        action: { type: 'nav', args: { to: 'clock', proposal: { trip: { zone: L.zone, until: L.until } } } } },
      quick: ready ? { label: `Use ${where} time`, icon: 'check', action: { type: 'time.follow', args: { follow: 'system', trip: { zone: L.zone, until: L.until } } } } : null,
      claims: [`usezone:${L.tripId || L.eventId}`], entity: `trip:${L.tripId || L.eventId}`,
    };
    return [card];
  },
});

/* ---------- T8: jet lag (J1 east / J2 west) ---------- */
/** Tomorrow's own guest-less blocks and planned slots: [{kind: 'event'|'task', id, title, start, end}]. */
function sgTrOwnTomorrow(ctx) {
  const d = sgAddDays(ctx.now.date, 1);
  const out = [];
  for (const e of ((ctx.cal && ctx.cal.days) || {})[d] || []) if (e && e.origin && !e.allDay && !e.declined && !(e.attendees > 0)) out.push({ kind: 'event', id: e.id, title: e.title, start: e.start, end: e.end });
  for (const t of ctx.tasks || []) {
    const s = sgMinOf(t.plannedTime);
    if (t.planned === d && s !== null && t.status !== 'done') out.push({ kind: 'task', id: t.id, title: t.title, start: s, end: s + Math.max(15, Math.min(240, t.plannedMinutes || t.estimate || 30)) });
  }
  return out.sort((a, b) => a.start - b.start);
}
function sgTrGuestMeetingsTomorrow(ctx) {
  const d = sgAddDays(ctx.now.date, 1);
  return (((ctx.cal && ctx.cal.days) || {})[d] || []).filter(e => e && !e.allDay && !e.declined && !e.origin && e.attendees > 0);
}
sgRegisterRule({
  id: 'travel-jetlag', area: 'travel', title: 'Jet lag: move a block out of your body\'s night', value: 4,
  description: 'After a long flight east or west: tomorrow\'s own focus blocks that fall in your body\'s night move to a better time. Meetings with others are only mentioned.',
  safetyHint: 'The button opens the block with the new time filled in; ✓ moves your own block at once, with Undo. Meetings with guests are never moved.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    const B = T && T.body;
    if (!B || !B.active || B.zoneMatches === false) return [];
    const D = Number.isFinite(B.Dtomorrow) && Math.abs(B.Dtomorrow) >= 1 ? B.Dtomorrow : B.D;
    if (Math.abs(D) < 3) return [];
    const day = sgAddDays(ctx.now.date, 1);
    const w = sgWork(ctx.work);
    const own = sgTrOwnTomorrow(ctx);
    const meet = sgTrGuestMeetingsTomorrow(ctx);
    let b = null, slot = null, title, text;
    if (D > 0) {
      const bodyMorning = Math.min(22 * 60, 7 * 60 + Math.round(D * 60));       // body 07:00 in local time
      b = own.find(x => x.start >= 7 * 60 && x.start < bodyMorning);
      if (!b) return [];
      const len = b.end - b.start;
      const from = Math.ceil(Math.max(bodyMorning, w.start) / 15) * 15;
      const g = sgFreeStretches(ctx, day, { start: from, end: Math.max(w.end, from + len), gapMin: len }).find(x => x.minutes >= len);
      if (!g) return [];
      slot = { start: g.start, end: g.start + len };
      title = `Your body thinks it's ${sgHM(B.bodyNowMin)}`;
      text = `Keep tomorrow morning light: the ${sgHM(b.start)} ${sgShort(b.title, 32)} falls at ${sgHM(b.start - Math.round(D * 60))} body time. Move it to ${sgHM(slot.start)}?`;
    } else {
      const bodyNight = 23 * 60 + Math.round(D * 60);                        // body 23:00 in local time
      b = own.find(x => x.start >= bodyNight && x.start < 21 * 60);
      if (!b) return [];
      const len = b.end - b.start;
      const g = sgFreeStretches(ctx, day, { start: Math.max(w.start, 8 * 60), end: Math.min(bodyNight, 13 * 60), gapMin: len }).find(x => x.minutes >= len);
      if (!g) return [];
      slot = { start: g.start, end: g.start + len };
      title = `By ${sgHM(bodyNight)} tomorrow it will feel like midnight`;
      text = `Keep the afternoon light: move your ${sgHM(b.start)} ${sgShort(b.title, 32)} to the morning, ${sgHM(slot.start)}?`;
    }
    const range = `${sgHM(slot.start)}–${sgHM(slot.end)}`;
    const why = [`You flew ${sgTrDiff(Math.round(B.D0 * 60)).replace(/^[+−]/, '')} ${B.dir}; your body is about ${Math.abs(Math.round(D))} h ${D > 0 ? 'behind' : 'ahead of'} local time tomorrow.`,
      `${sgShort(b.title, 40)} is your own ${b.kind === 'event' ? 'block' : 'planned slot'} at ${sgHM(b.start)}.`]
      .concat(meet.length ? [`Your ${sgHM(meet[0].start)} meeting with others stays where it is.`] : []);
    const isEv = b.kind === 'event';
    return [{
      key: `tr-jetlag:${ctx.now.date}`, icon: D > 0 ? 'sunrise' : 'sunset', scene: 'flight', urgency: 1.1,
      title, text, why,
      preview: isEv ? `Opens the block with ${range} tomorrow filled in, for you to save. The ✓ moves it now; Undo puts it back.` : `Opens the task; the ✓ plans it ${range} tomorrow instead. Undo puts it back.`,
      primary: isEv ? { label: `Move it to ${sgHM(slot.start)}…`, icon: 'calendar-clock', action: { type: 'event.open', args: { id: b.id, propose: { date: day, start: slot.start, end: slot.end } } } }
        : { label: 'Open the task', icon: 'square-check-big', action: { type: 'task.open', args: { id: b.id } } },
      quick: isEv ? { label: `Move to ${sgHM(slot.start)}`, icon: 'check', action: { type: 'cal.move', args: { id: b.id, date: day, start: slot.start, end: slot.end } } }
        : { label: `Plan ${range}`, icon: 'check', action: { type: 'ops', args: { line: `Planned ${range} tomorrow`, ops: [{ op: 'task.plan', id: b.id, date: day, time: sgHM(slot.start), minutes: slot.end - slot.start }] } } },
      claims: [`slot:${day}:${slot.start}-${slot.end}`, isEv ? `event:${b.id}` : `task:${b.id}`], entity: isEv ? `event:${b.id}` : `task:${b.id}`,
    }];
  },
});

/* ---------- T9: get ready for the zone change (J3) ---------- */
sgRegisterRule({
  id: 'travel-jet-prep', area: 'travel', title: 'Shift bedtime before a long flight', value: 3,
  description: 'Three days before a trip five or more hours away: move bedtime an hour a night towards the new time.',
  safetyHint: 'Opens a repeating task filled in, for you to adjust and save.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const t = T.trips.find(x => !x.candidate && x.intl && Math.abs(x.diffMin || 0) >= 300 && ['planned', 'departing'].includes(x.status)
      && sgDaysBetween(ctx.now.date, x.from) >= 1 && sgDaysBetween(ctx.now.date, x.from) <= 3);
    if (!t) return [];
    if ((ctx.tasks || []).some(x => /\bbed ?(by|time)\b|\bbedtime\b/i.test(x.title || '') && x.status !== 'done')) return [];
    const east = t.diffMin > 0;
    const h = Math.round(Math.abs(t.diffMin) / 60);
    const nights = Math.min(3, sgDaysBetween(ctx.now.date, t.from));
    const bed = east ? '22:30' : '00:30';
    const title = east ? `Bed by ${bed}` : `Stay up until ${bed}`;
    const label = sgTrLabel(t);
    return [{
      key: `tr-jetprep:${t.id}`, icon: 'bed', scene: 'flight', urgency: 0.9,
      title: `Flying ${h} h ${east ? 'east' : 'west'} ${sgTrWhen(t.from, ctx.now.date)}. Shift bedtime 1 h ${east ? 'earlier' : 'later'} for ${sgTrPlural(nights, 'night')}?`,
      text: `A nightly reminder until you leave for ${label}, so the first days there are easier.`,
      why: [`${label} is ${sgTrDiff(t.diffMin)} from home.`, `You leave ${sgTrWhen(t.from, ctx.now.date)}, in ${sgTrPlural(sgDaysBetween(ctx.now.date, t.from), 'day')}.`],
      preview: `Opens a new daily task “${title}” for you to adjust; it repeats until you stop it. Nothing changes until you save.`,
      primary: { label: 'Set a reminder…', icon: 'alarm-clock', action: { type: 'task.createOpen', args: { title, date: ctx.now.date, time: bed === '00:30' ? '23:45' : bed, recurrence: 'daily', tags: sgTrTags(t),
        detail: `For ${sgTrPlural(nights, 'night')} before the flight to ${label}, then stop it.` } } },
      claims: [`jetprep:${t.id}`], entity: `trip:${t.id}`,
    }];
  },
});

/* ---------- T10: public holidays ---------- */
sgRegisterRule({
  id: 'travel-holiday', area: 'travel', title: 'Public holidays that touch your plans', value: 3,
  description: 'A public holiday in the next week: tasks due that day at home (with days off on), or a meeting where someone lives.',
  safetyHint: 'Tasks: the list with new dates, for you to choose; ✓ moves them, with Undo. Meetings: opens the event.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'], multi: true,
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T || !(T.holidays || []).length) return [];
    const out = [];
    const offDays = new Set(T.holidays.filter(h => h.home).map(h => h.date));
    for (const h of T.holidays) {
      if (out.length >= 2) break;
      const dayWord = sgDaysBetween(ctx.now.date, h.date) < 7 ? _SG_TR_DAYS_LONG[sgDow(h.date)] : sgTrDate(h.date);
      if (h.home && T.daysOff) {
        const due = (ctx.tasks || []).filter(t => t.status !== 'done' && (t.due === h.date || (!t.due && t.planned === h.date)));
        if (!due.length) continue;
        const rows = sgTrSpread(ctx, due.slice(0, 12).map(t => ({ id: t.id, title: t.title, due: t.due, planned: t.planned })), sgAddDays(h.date, 1), offDays);
        const n = rows.length;
        const mv = sgTrMoveCard(rows, { reason: `Public holiday: ${h.name}`, primaryLabel: 'Choose…', quickLabel: `Move ${n === 1 ? 'it' : 'them'}`, listTitle: `Due on ${h.name}`, line: `Moved ${sgTrPlural(n, 'task')}` });
        out.push({
          key: `tr-holiday:${h.cc}:${h.date}`, icon: 'calendar-days', scene: 'holiday', urgency: 1,
          title: `${dayWord} is a bank holiday: ${sgTrPlural(n, 'task')} ${n === 1 ? 'is' : 'are'} due then`,
          text: `${h.name}${h.estimated ? ' (the date may move by a day)' : ''}. Move ${n === 1 ? 'it' : 'them'} to ${sgTrDate(rows[0].to)}?`,
          why: [`${h.name} is on ${sgTrDate(h.date)}.`, `You treat public holidays as days off.`, `${sgTrPlural(n, 'open task')} ${n === 1 ? 'is' : 'are'} due that day.`],
          preview: 'Shows the tasks with their new dates, all ticked: Apply moves the ticked ones in one step. The ✓ moves them all at once. Undo puts them back.',
          primary: mv.primary, quick: mv.quick, claims: rows.map(r => 'task:' + r.id), entity: `holiday:${h.cc}:${h.date}`,
        });
        continue;
      }
      if (h.home) continue;
      const m = (T.meetings || []).find(x => (x.their || []).some(p => p.cc === h.cc && p.date === h.date));
      if (!m) continue;
      const p = m.their.find(x => x.cc === h.cc && x.date === h.date);
      const country = p.label || h.cc;
      out.push({
        key: `tr-holiday:${h.cc}:${h.date}`, icon: 'calendar-days', scene: 'holiday', urgency: 0.9,
        title: `${h.name} in ${country} on ${dayWord}: your call with ${p.first || p.name || 'them'} is that day`,
        text: `${sgShort(m.title, 40)} at ${sgHM(m.min)}${h.estimated ? '. The date may move by a day' : ''}. Worth checking it still suits ${p.first || 'them'}?`,
        why: [`${h.name} is a public holiday where ${p.first || p.name || 'they'} ${p.first || p.name ? 'is' : 'are'}, on ${sgTrDate(h.date)}.`, `${sgShort(m.title, 40)} is that day at ${sgHM(p.min)} their time.`],
        preview: 'Opens the meeting. Nothing changes unless you change it; guests are asked before they are emailed.',
        primary: { label: 'Open the meeting', icon: 'calendar', action: { type: 'event.open', args: { id: m.eventId } } },
        claims: [`event:${m.eventId}`], entity: `event:${m.eventId}`,
      });
    }
    return out;
  },
});

/* ---------- T11: slipped while you were away ---------- */
sgRegisterRule({
  id: 'travel-back', area: 'travel', title: 'What slipped while you were away', value: 4,
  description: 'Back from a trip: the tasks that were due while you were away and are still open, with new dates.',
  safetyHint: 'The button shows the list with new dates, ticked, for you to choose; ✓ moves them all at once, with Undo.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const t = T.trips.find(x => !x.candidate && x.to && ['home', 'past'].includes(x.status) && sgDaysBetween(x.to, ctx.now.date) >= 0 && sgDaysBetween(x.to, ctx.now.date) <= 2);
    if (!t) return [];
    const slipped = (t.awayTasks || []).filter(x => (x.due || x.planned) < ctx.now.date);
    if (!slipped.length) return [];
    const start = sgIsWorkDay(ctx.work, ctx.now.date) && ctx.now.min < 12 * 60 ? ctx.now.date : sgNextWorkDay(ctx.work, ctx.now.date);
    const rows = sgTrSpread(ctx, slipped.slice(0, 12), start);
    const n = rows.length;
    const label = sgTrLabel(t);
    const mv = sgTrMoveCard(rows, { reason: `Back from ${label}`, primaryLabel: 'Choose new dates…', quickLabel: `Move ${n === 1 ? 'it' : 'them'}`, listTitle: `Slipped while you were in ${label}`, line: `Moved ${sgTrPlural(n, 'task')}` });
    return [{
      key: `tr-back:${t.id}`, icon: 'undo-2', scene: 'travel', urgency: 1.1,
      title: `${sgTrPlural(n, 'thing')} slipped while you were away`,
      text: `From ${label}, ${sgTrRange(t.from, t.to)}. New dates from ${sgTrDate(rows[0].to)}, at most 3 a day?`,
      why: [`You were away ${sgTrRange(t.from, t.to)}.`, `${sgTrPlural(n, 'task')} due then ${n === 1 ? 'is' : 'are'} still open.`],
      preview: 'Shows the tasks with their new dates, all ticked: Apply moves the ticked ones in one step. The ✓ moves them all at once. Undo puts them back.',
      primary: mv.primary, quick: mv.quick, claims: rows.map(r => 'task:' + r.id), entity: `trip:${t.id}`,
    }];
  },
});

/* ---------- T12: their time ---------- */
sgRegisterRule({
  id: 'travel-their-time', area: 'travel', title: 'A meeting at an unsocial hour for someone', value: 4,
  description: 'A meeting with others falls outside 07:00-21:00 for them (or 07:00-22:00 for you): a time that suits both, if there is one.',
  safetyHint: 'Opens the meeting with a better time filled in; saving it asks before the guests are emailed.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'], multi: true,
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const out = [];
    const end = sgAddDays(ctx.now.date, 7);
    for (const m of T.meetings || []) {
      if (out.length >= 2) break;
      if (!m.unsocial || !(m.their || []).length || m.date > end || m.start < T.now) continue;
      const p = m.their.find(x => x.unsocial) || m.their[0];
      const who = p.first || p.name || 'them';
      const ahead = p.diffMin > 0 ? `${sgTrDiff(p.diffMin).slice(1)} ahead of you` : p.diffMin < 0 ? `${sgTrDiff(p.diffMin).slice(1)} behind you` : 'your time';
      const theirDay = p.date !== m.date ? ' ' + _SG_DAY_NAMES[sgDow(p.date)] : '';
      const s = m.slot;
      const sTheir = s ? ((s.startMin + (p.diffMin || 0)) % 1440 + 1440) % 1440 : null;
      out.push({
        key: `tr-theirtime:${m.eventId}`, icon: 'moon', scene: 'video-call', urgency: 1,
        title: m.unsocial === 'them' ? `Your ${sgHM(m.min)} call on ${_SG_DAY_NAMES[sgDow(m.date)]} is ${sgHM(p.min)}${theirDay} for ${who}` : `Your call with ${who} on ${_SG_DAY_NAMES[sgDow(m.date)]} is at ${sgHM(m.min)} your time`,
        text: `${sgShort(m.title, 40)} with ${who} in ${p.label}, ${ahead}.` + (s && m.organizerSelf ? ` Suggest ${sgHM(s.startMin)} ${_SG_DAY_NAMES[sgDow(s.date)]} your time instead, ${sgHM(sTheir)} for them?` : ''),
        why: [`It is ${sgHM(p.min)} for ${who} in ${p.label}${p.unsocial ? ', outside 07:00–21:00' : ''}.`].concat(m.unsocial === 'you' ? [`It is ${sgHM(m.min)} for you, outside 07:00–22:00.`] : [],
          s ? [`${sgHM(s.startMin)}–${sgHM(s.endMin)} ${sgTrDate(s.date)} is inside 08:00–20:00 for both of you and free in your calendar.`] : []),
        preview: s && m.organizerSelf ? `Opens the meeting with ${sgHM(s.startMin)}–${sgHM(s.endMin)} on ${sgTrDate(s.date)} filled in, for you to save. Saving asks whether to email the guests.`
          : 'Opens the meeting. Nothing changes unless you change it; guests are asked before they are emailed.',
        primary: { label: s && m.organizerSelf ? 'Propose a time…' : 'Open the meeting', icon: 'calendar-clock',
          action: { type: 'event.open', args: Object.assign({ id: m.eventId }, s && m.organizerSelf ? { propose: { date: s.date, start: s.startMin, end: s.endMin } } : {}) } },
        claims: [`event:${m.eventId}`], entity: `event:${m.eventId}`,
      });
    }
    return out;
  },
});

/* ---------- T13: learn a person's time zone ---------- */
sgRegisterRule({
  id: 'travel-person-tz', area: 'travel', title: 'Remember someone\'s time zone', value: 2,
  description: 'Someone organised two or more events in another time zone: save it on their person card, so meetings show their time.',
  safetyHint: 'The button opens their person page with the zone filled in; ✓ saves it at once, with Undo.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    const z = T && (T.personZones || [])[0];
    if (!z || !z.personId || !z.zone) return [];
    const who = z.first || z.name || 'They';
    return [{
      key: `tr-ptz:${z.personId}:${z.zone}`, icon: 'user', scene: 'video-call', urgency: 0.8,
      title: `${who}'s events are usually in ${z.label} time. Save it?`,
      text: `Then meetings with ${who} show their time too, and late or early ones are flagged.`,
      why: [`${who} organised ${z.n} events set in ${z.label} time.`, 'No time zone is saved for them yet.'],
      preview: `Opens ${who}'s person page with the time zone ${z.label} filled in, for you to save. The ✓ saves it now; Undo removes it.`,
      primary: { label: 'Review…', icon: 'pencil', action: { type: 'nav', args: { to: 'view', view: 'person:' + z.personId, prefill: { tz: z.zone } } } },
      quick: { label: 'Save it', icon: 'check', action: { type: 'ops', args: { line: `Saved ${z.label} time for ${who}`, ops: [{ op: 'person.update', id: z.personId, tz: z.zone }] } } },
      claims: [`person:${z.personId}`], entity: `person:${z.personId}`, people: [z.personId],
    }];
  },
});

/* ---------- T14: looks like a trip ---------- */
sgRegisterRule({
  id: 'travel-trip-found', area: 'travel', title: 'A trip the dashboard noticed', value: 3,
  description: 'The first time a trip shows up from your calendar or card payments: open it to name it, fix the dates, or say it is not a trip.',
  safetyHint: 'Opens the trip; "Not a trip" forgets it (Undo brings it back). Calendar events, tasks and payments are never touched.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    if (!T) return [];
    const t = T.trips.find(x => !x.confirmed && !x.sources.includes('zone') && ['planned', 'departing', 'away', 'returning'].includes(x.status)
      && sgDaysBetween(ctx.now.date, x.from) <= 60);
    if (!t) return [];
    const label = t.dest ? sgTrLabel(t) : '';
    const from = t.sources.includes('bank') && t.sources.length === 1 ? 'card payments' : t.legs.length ? 'your calendar\'s flights and trains' : 'your calendar';
    return [{
      key: `tr-trip:${t.id}`, icon: 'map-pin', scene: 'travel', urgency: 0.9,
      title: label ? `Looks like a trip to ${label}, ${sgTrRange(t.from, t.to)}` : `Looks like a trip, ${sgTrRange(t.from, t.to)}: where to?`,
      text: label ? 'Open it to name it, fix the dates or add events and tasks. The dashboard then shows local time, weather and tips there.' : 'Tell the dashboard where, and it shows local time, weather and tips there.',
      why: [`Seen in ${from}: ${sgTrRange(t.from, t.to)}${t.nights ? ` (${sgTrPlural(t.nights, 'night')})` : ''}.`],
      preview: 'Opens the trip page. "Not a trip" forgets it and it is never inferred again; your events, tasks and payments stay as they are.',
      primary: { label: 'See the trip', icon: 'map', action: { type: 'nav', args: { to: 'view', view: 'trip:' + t.id } } },
      quick: { label: 'Not a trip', icon: 'x', action: { type: 'trip.forget', args: { id: t.id, mode: 'not' } } },
      claims: [`trip:${t.id}`], entity: `trip:${t.id}`,
    }];
  },
});

/* ---------- 3.3: a long stay ---------- */
sgRegisterRule({
  id: 'travel-home-zone', area: 'travel', title: 'A long stay: make it your home time zone', value: 2,
  description: 'After 30 days on one time zone abroad: make it your home time zone (finance days and "Welcome home" follow it).',
  safetyHint: 'Opens Settings > Travel & time with the new home zone filled in, for you to save.',
  needs: ['travel'], hours: 'any', surfaces: ['home'], inPlace: ['travel'],
  run(ctx) {
    const T = sgTravel(ctx);
    const L = T && T.longStay;
    if (!L || !L.zone) return [];
    return [{
      key: `tr-homezone:${L.zone}`, icon: 'house', scene: 'travel', urgency: 0.8,
      title: `You've been on ${L.label} time for ${L.days} days`,
      text: `Make ${L.label} your home time zone? Money days and "Welcome home" would follow it.`,
      why: [`This computer has shown ${L.label} time for ${L.days} days.`, `Your home time zone is still ${(T.home && T.home.label) || 'the old one'}.`],
      preview: `Opens Settings > Travel & time with ${L.label} as the home time zone, for you to save. Nothing changes until you do.`,
      primary: { label: 'Review…', icon: 'settings', action: { type: 'nav', args: { to: 'view', view: 'settings:time', prefill: { home: L.zone } } } },
      claims: [`homezone:${L.zone}`], entity: `zone:${L.zone}`,
    }];
  },
});
