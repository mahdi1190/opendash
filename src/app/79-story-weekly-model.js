/* ============================================================
   WEEKLY STORY MODEL (owner: Weekly story). PURE classic script: no DOM, no
   page globals at load, so tests/story-weekly.test.mjs evaluates it in Node
   exactly as the page does. 79-story-weekly.js renders it.

     stwWeekModel(data, env)   GET /api/story?kind=week `data` + what only the page
                               knows (env: tasks, completions, streams, people,
                               dayOf, draft, pending) -> one model for every beat:
                               numbers, wins, stream progress, people of the week,
                               slipped and why, next week against capacity,
                               outcome suggestions, the guided-review steps and
                               the week type (palette, mood, pacing, order)
     stwBuildBeats(m, script, o) -> beats for the story engine (stable ids:
                               numbers s0 s1 s2 wins streams people slipped next
                               outcomes guided); beats with no data are dropped
     stwSyncOutcomes(draft, list)  the story's three outcomes -> the guided
                               review's draft (outcomes per area)
   ============================================================ */
const STW_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STW_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STW_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const STW_CAP_MIN = 8 * 60;            // a working day, as in reviewCapacity / the guided review
const STW_TONES = ['warning', 'danger', 'violet', 'teal'];
const STW_STEPS = [['inbox', 'Clear the inbox'], ['overdue', 'Overdue and stale'], ['waiting', 'Chase list'], ['capacity', 'Next week'], ['outcomes', 'Outcomes'], ['wins', 'Wins and stats'], ['finish', 'Summary and save']];

/* ---------- small pure helpers ---------- */
function _stwUtc(iso) { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || '')); return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : new Date(NaN); }
function _stwAdd(iso, n) { const d = _stwUtc(iso); return isNaN(d) ? iso : new Date(d.getTime() + n * 86400000).toISOString().slice(0, 10); }
function _stwWd(iso) { const d = _stwUtc(iso); return isNaN(d) ? 0 : d.getUTCDay(); }
function _stwMin(hm) { const m = /^(\d{1,2}):(\d{2})/.exec(String(hm || '')); return m ? +m[1] * 60 + +m[2] : 0; }
function _stwDM(iso) { const d = _stwUtc(iso); return isNaN(d) ? '' : `${d.getUTCDate()} ${STW_MONTHS[d.getUTCMonth()]}`; }
/** ISO-8601 week number of a date. */
function stwWeekNo(iso) {
  const d = _stwUtc(iso); if (isNaN(d)) return 0;
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - y0) / 86400000 + 1) / 7);
}
/** "five", "Five" for 0-12, else digits. */
function stwWord(n, cap) { n = Math.round(Number(n) || 0); const s = n >= 0 && n < STW_WORDS.length ? STW_WORDS[n] : String(n); return cap ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function stwPlural(n, one, many) { return `${n} ${n === 1 ? one : (many || one + 's')}`; }
/** "2 h 30", "45 min", "3 h". */
function stwHm(min) { min = Math.max(0, Math.round(Number(min) || 0)); const h = Math.floor(min / 60), r = min % 60; return h ? (r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`) : `${r} min`; }
/** Hours for speech: "an hour", "eleven and a half hours". */
function stwHoursSay(min) {
  const h = Math.round((Number(min) || 0) / 30) / 2;
  if (!h) return '';
  if (h === 0.5) return 'half an hour';
  if (h === 1) return 'an hour';
  const whole = Math.floor(h), half = h % 1 ? ' and a half' : '';
  return `${whole <= 12 ? STW_WORDS[whole] : whole}${half} hours`;
}
function stwList(a) { a = (a || []).filter(Boolean); return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
/** A title short enough to say and show (same rule as lib/story-data.mjs shortTitle). */
function stwShortTitle(t, max) {
  max = max || 56;
  let s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  const head = s.split(/\s*(?::(?!\d)|;|\s[–—-]\s|\(|\[|\|)\s*/)[0];   // "1:1" and "10:30" are not separators
  if (head.length >= 8 && head.length < s.length) s = head;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s.replace(/[\s,.;:–—-]+$/, '');
}
/** A slip reason as speech: "Too big" -> "because they were too big"; a custom one is quoted plainly. */
function stwBecause(label) {
  const k = String(label || '').trim().replace(/[.!]+$/, '').toLowerCase();
  const map = { 'too big': 'because they were too big', 'no time': 'because there was no time', blocked: 'because they were blocked', 'not important': 'because they mattered less' };
  return map[k] || (k ? `because of ${k}` : '');
}
/** A scene type, or the fallback when it is missing or only the generic one. */
function stwSceneOr(type, fallback) { return type && !/^(task|event|todo)$/.test(type) ? type : fallback; }
function _stwCap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

/** What to do about one slipped task (deterministic, from its reason and how often it moved). */
function stwFixFor(x, open, slot) {
  const why = String((x && x.reason) || '').toLowerCase();
  const day = slot ? slot.weekday : 'a quiet day';
  const plan = slot ? { act: 'move', label: 'Plan ' + slot.weekday.slice(0, 3), to: slot.date } : { act: null };
  if (!open) return { text: 'Done since, so nothing to fix.', act: null };
  if (/block|wait|depend|stuck|need/.test(why)) return Object.assign({ text: `Chase what it waits on, then give it ${day}.` }, plan);
  if (/prior|important|drop|later|someday|not needed/.test(why)) return { text: 'Maybe it can go: let it go, or keep it without a date.', act: 'drop', label: 'Let go' };
  // The evening story's reasons: No time / Too big / Blocked / Not important.
  if (/big|long|hard|tired|energy/.test(why) || (x && x.moves >= 3)) return Object.assign({ text: `Do just the first small step on ${day}.` }, plan);
  return Object.assign({ text: `Give it a fixed day: ${day} is the lightest.` }, plan);
}

/**
 * The weekly story model.
 * d   = GET /api/story?kind=week -> data (lib/story-data.mjs)
 * env = { tasks: [{id, title, stream, done, estimate, due, priority}],  completions: {id: [ms]},
 *         streams: {id: {label, color, archived}},  person(id) -> {id, name, first, color, avatarUrl, kind} | null,
 *         peopleAll: [{id, createdAt}],  dayOf(ms) -> 'YYYY-MM-DD',  pending (email suggestions),
 *         draft (the guided review's draft),  steps ([[id, label]...]) }
 */
function stwWeekModel(d, env) {
  d = d || {}; env = env || {};
  const r = d.range && d.range.from ? d.range : { from: d.date, to: _stwAdd(d.date, 6), nextFrom: _stwAdd(d.date, 7), nextTo: _stwAdd(d.date, 13) };
  const today = d.date || r.to;
  const nowMin = _stwMin(d.now);
  const days = Array.from({ length: 7 }, (_, i) => _stwAdd(r.from, i));
  const inWeek = (iso) => !!iso && iso >= r.from && iso <= r.to;
  const person = typeof env.person === 'function' ? (id) => { try { return env.person(id) || null; } catch (e) { return null; } } : () => null;
  const comps = env.completions && typeof env.completions === 'object' ? env.completions : {};
  const dayOf = typeof env.dayOf === 'function' ? env.dayOf : (ms) => new Date(ms).toISOString().slice(0, 10);
  const tasks = Array.isArray(env.tasks) ? env.tasks.filter(t => t && t.id) : [];
  const taskById = new Map(tasks.map(t => [t.id, t]));
  const streams = env.streams && typeof env.streams === 'object' ? env.streams : {};
  const sLabel = (sid) => (streams[sid] && streams[sid].label) || sid || 'No stream';
  const sColor = (sid) => (streams[sid] && streams[sid].color) || null;
  const labelToId = new Map(Object.entries(streams).map(([id, s]) => [String((s && s.label) || id), id]));
  const lastIn = (id) => { let best = null; for (const ts of Array.isArray(comps[id]) ? comps[id] : []) { const x = dayOf(Number(ts)); if (inWeek(x) && (!best || x > best)) best = x; } return best; };

  /* ---- 1. the week in numbers ---- */
  const byDay = days.map(x => Number((d.byDay || {})[x]) || 0);
  const done = Number.isFinite(Number(d.completed)) && d.completed !== null ? Number(d.completed) : byDay.reduce((a, b) => a + b, 0);
  let prev = null;
  if (env.completions) {
    prev = 0;
    const pf = _stwAdd(r.from, -7), pt = _stwAdd(r.from, -1);
    for (const list of Object.values(comps)) for (const ts of Array.isArray(list) ? list : []) { const x = dayOf(Number(ts)); if (x >= pf && x <= pt) prev++; }
  }
  const evs = (Array.isArray(d.events) ? d.events : []).filter(e => e && inWeek(e.date));
  const isPast = (e) => e.date < today || (e.date === today && Number.isFinite(e.endMin) && e.endMin <= nowMin);
  const past = evs.filter(e => !e.allDay && isPast(e));
  const evMin = (e) => Math.min(600, Math.max(0, Number(e.minutes) || 0));
  const minutesByDay = days.map(x => past.filter(e => e.date === x).reduce((t, e) => t + evMin(e), 0));
  const minutes = minutesByDay.reduce((a, b) => a + b, 0);
  const met = new Map();
  for (const e of past) for (const pid of Array.isArray(e.people) ? e.people : []) {
    const x = met.get(pid) || { minutes: 0, count: 0 };
    x.minutes += evMin(e); x.count++; met.set(pid, x);
  }
  const seen = [...met.entries()].map(([id, x]) => Object.assign({ id, p: person(id) }, x)).filter(x => x.p).sort((a, b) => b.minutes - a.minutes || b.count - a.count || String(a.p.name).localeCompare(String(b.p.name)));
  const daysSoFar = days.filter(x => x <= today).length || 7;
  const numbers = {
    done, prev, delta: prev === null ? null : done - prev, byDay, minutes, hours: Math.round(minutes / 30) / 2, minutesByDay,
    events: past.length, people: seen.map(x => x.p), activeDays: byDay.filter(n => n > 0).length, daysSoFar,
  };

  /* ---- 2. wins ---- */
  const wins = (Array.isArray(d.wins) ? d.wins : []).filter(t => t && t.id).map((t, k) => {
    const day = lastIn(t.id);
    const ppl = (Array.isArray(t.people) ? t.people : []).map(person).filter(Boolean);
    const subs = t.subtasks || {};
    const allSteps = subs.total > 0 && subs.done === subs.total;
    const score = (t.priority === 'p1' ? 6 : t.priority === 'p2' ? 2 : 0) + (t.type === 'deadline' ? 3 : 0) + (ppl.length ? 1 : 0) + (allSteps ? 1 : 0) + Math.min(2, (subs.total || 0) / 4) - k * 0.01;
    const desc = allSteps ? `All ${subs.total} steps done` : ppl.length ? `With ${stwList(ppl.slice(0, 2).map(p => p.first || p.name))}` : '';
    const tid = taskById.get(t.id);
    return { id: t.id, title: stwShortTitle(t.title, 70), full: String(t.title || ''), stream: t.stream || null, color: tid ? sColor(tid.stream) : null, type: t.type || 'task', priority: t.priority || null, day, weekday: day ? STW_WEEKDAYS[_stwWd(day)] : null, people: ppl, desc, score };
  }).sort((a, b) => b.score - a.score).slice(0, 5);

  /* ---- 3. stream progress: share of each stream's tasks done, before this week and this week ---- */
  const per = new Map();
  for (const t of tasks) {
    const sid = t.stream || '';
    if (!sid || (streams[sid] && streams[sid].archived)) continue;
    const x = per.get(sid) || { total: 0, done: 0, week: 0 };
    x.total++;
    if (t.done) { x.done++; if (lastIn(t.id)) x.week++; }
    per.set(sid, x);
  }
  const streamRows = [...per.entries()].filter(([, x]) => x.total >= 2).map(([sid, x]) => {
    const before = Math.round((x.done - x.week) / x.total * 1000) / 10;
    const gainRaw = x.week / x.total * 100;
    return { id: sid, label: sLabel(sid), color: sColor(sid), total: x.total, done: x.done, week: x.week, before, gainRaw, gain: x.week ? Math.max(1, Math.round(gainRaw)) : 0, pct: Math.round(x.done / x.total * 100) };
  }).sort((a, b) => b.gainRaw - a.gainRaw || b.week - a.week || b.total - a.total).slice(0, 6);

  /* ---- next week (needed by slipped fixes too) ---- */
  const capDays = ((d.next && Array.isArray(d.next.capacity)) ? d.next.capacity : []).map(c => {
    const booked = Math.max(0, Number(c.booked) || 0), planned = Math.max(0, Number(c.planned) || 0);
    const total = booked + planned;
    return { date: c.date, weekday: c.weekday || STW_WEEKDAYS[_stwWd(c.date)], wd: _stwWd(c.date), booked, planned, total, over: Math.max(0, total - STW_CAP_MIN), load: total / STW_CAP_MIN, warn: total / STW_CAP_MIN > 0.75, tasks: Number(c.tasks) || 0, meetings: Number(c.meetings) || 0, deadline: null, deadlines: 0 };
  });
  for (const t of Array.isArray(d.deadlines) ? d.deadlines : []) {
    const c = capDays.find(x => x.date === t.due);
    if (!c) continue;
    c.deadlines++;
    if (!c.deadline) c.deadline = { id: t.id, title: stwShortTitle(t.title, 28) };
  }
  const workdays = capDays.filter(c => c.wd >= 1 && c.wd <= 5);
  const lightest = (workdays.length ? workdays : capDays).slice().sort((a, b) => a.total - b.total || a.tasks - b.tasks || a.date.localeCompare(b.date))[0] || null;
  const slot = lightest ? { date: lightest.date, weekday: lightest.weekday } : null;
  const overDays = capDays.filter(c => c.over > 0);
  const heavyDays = capDays.filter(c => c.warn);
  let hint = null;
  const dlIds = new Set((Array.isArray(d.deadlines) ? d.deadlines : []).map(t => t && t.id));
  for (const c of heavyDays.slice().sort((a, b) => b.load - a.load)) {
    // Never suggest moving a deadline or a top-priority task: those dates are real.
    const movable = tasks.filter(t => !t.done && t.due === c.date && Number(t.estimate) > 0 && !dlIds.has(t.id) && t.priority !== 'p1').sort((a, b) => b.estimate - a.estimate)[0];
    if (!movable) continue;
    const target = (workdays.length ? workdays : capDays).filter(x => x.date !== c.date && x.total + Number(movable.estimate) <= STW_CAP_MIN * 0.75).sort((a, b) => a.total - b.total || a.date.localeCompare(b.date))[0];
    if (!target) continue;
    hint = { taskId: movable.id, title: stwShortTitle(movable.title, 48), est: Number(movable.estimate), from: c.date, fromWd: c.weekday, to: target.date, toWd: target.weekday, overBy: c.over };
    break;
  }
  const scale = Math.max(STW_CAP_MIN * 1.25, ...capDays.map(c => c.total));
  const next = {
    days: capDays, scale, capFrac: STW_CAP_MIN / scale, over: overDays, heavy: heavyDays, lightest, hint,
    booked: capDays.reduce((t, c) => t + c.total, 0), meetings: (d.next && Number(d.next.meetings)) || 0,
    range: { from: r.nextFrom, to: r.nextTo },
  };

  /* ---- 4. people of the week ---- */
  const dp = Array.isArray(d.people) ? d.people : [];
  const nextIn = (iso) => !!iso && iso >= r.nextFrom && iso <= r.nextTo;
  const why = (p) => {
    if (p.celebration && nextIn(p.celebration.date)) return `${p.celebration.kind === 'birthday' ? 'Birthday' : 'Celebration'} ${STW_WEEKDAYS[_stwWd(p.celebration.date)].slice(0, 3)}`;
    if (p.counts && p.counts.followUps) return p.counts.followUps === 1 ? 'Follow-up due' : `${p.counts.followUps} follow-ups due`;
    if (p.counts && p.counts.waiting) return 'You are waiting on them';
    if (p.lastContact && p.lastContact.daysAgo >= 21) return `${Math.round(p.lastContact.daysAgo / 7)} weeks since you spoke`;
    return '';
  };
  const nodes = seen.slice(0, 6).map(x => ({ id: x.id, p: x.p, minutes: x.minutes, count: x.count, faded: false, meta: `${stwPlural(x.count, 'meeting')} · ${stwHm(x.minutes)}` }));
  for (const p of dp) {
    if (nodes.length >= 7 || nodes.filter(n => n.faded).length >= 2) break;
    if (met.has(p.id) || nodes.some(n => n.id === p.id)) continue;
    const w = why(p);
    if (!w) continue;
    const pp = person(p.id) || p;
    nodes.push({ id: p.id, p: pp, minutes: 0, count: 0, faded: true, meta: w });
  }
  const reach = [];
  for (const p of dp) {
    if (reach.length >= 3) break;
    const m = (p.meetings || []).find(x => nextIn(x.date));
    const w = m ? `Meeting ${STW_WEEKDAYS[_stwWd(m.date)].slice(0, 3)}${m.start ? ' ' + m.start : ''}` : why(p);
    if (!w) continue;
    const pp = person(p.id) || p, nm = pp.first || pp.name;
    // A sentence for the narrator about this person.
    let say = '';
    if (m) say = `You see ${nm} on ${STW_WEEKDAYS[_stwWd(m.date)]}${m.start ? ' at ' + m.start : ''}.`;
    else if (p.celebration && nextIn(p.celebration.date)) say = `${nm} has a ${p.celebration.kind === 'birthday' ? 'birthday' : 'celebration'} on ${STW_WEEKDAYS[_stwWd(p.celebration.date)]}.`;
    else if (p.counts && p.counts.followUps) say = `A follow-up with ${nm} is due.`;
    else if (p.counts && p.counts.waiting) say = `You are waiting on ${nm}.`;
    else if (p.lastContact) say = `${nm} hasn't heard from you in ${stwWord(Math.round(p.lastContact.daysAgo / 7))} weeks.`;
    reach.push({ p: pp, why: w, say });
  }
  const thanks = [];
  for (const w of wins) for (const p of w.people) if (thanks.length < 2 && !thanks.some(x => x.p.id === p.id)) thanks.push({ p, why: w.title });
  const fresh = (Array.isArray(env.peopleAll) ? env.peopleAll : []).filter(p => p && p.id && p.createdAt && inWeek(dayOf(Number(p.createdAt))))
    .slice(0, 2).map(p => ({ p: person(p.id) || p, why: 'Added ' + STW_WEEKDAYS[_stwWd(dayOf(Number(p.createdAt)))] }));
  const people = { nodes, top: nodes.find(n => !n.faded) || null, reach, thanks, fresh, quiet: dp.find(p => p.lastContact && p.lastContact.daysAgo >= 21 && !met.has(p.id)) || null };

  /* ---- 5. slipped, and why ---- */
  const reasons = (Array.isArray(d.reasons) ? d.reasons : []).filter(x => x && x.n > 0).map((x, k) => {
    const none = /^no reason given$/i.test(String(x.reason || ''));
    return { reason: String(x.reason || ''), label: none ? 'No reason given' : _stwCap(x.reason), n: Number(x.n) || 0, tone: none ? 'slate' : STW_TONES[k % STW_TONES.length], none };
  });
  const slippedTotal = reasons.reduce((t, x) => t + x.n, 0) || (Array.isArray(d.slippedWeek) ? d.slippedWeek.length : 0);
  const slippedItems = (Array.isArray(d.slippedWeek) ? d.slippedWeek : []).slice(0, 4).map(x => {
    const t = taskById.get(x.id);
    const open = !!(t && !t.done);
    const rs = reasons.find(y => y.reason === x.reason);
    return { id: x.id, title: stwShortTitle(x.title, 60), reason: rs ? rs.label : _stwCap(x.reason || 'No reason given'), tone: rs ? rs.tone : 'slate', moves: Number(x.moves) || 1, open, fix: stwFixFor(x, open, slot) };
  });
  const slipped = { total: slippedTotal, reasons, items: slippedItems, top: reasons.find(x => !x.none) || null };

  /* ---- 7. outcomes ---- */
  const areas = Object.entries(streams).filter(([, s]) => s && !s.archived).map(([id, s]) => ({ id, label: String(s.label || id), color: s.color || null }));
  const areaOf = (label) => (label && areas.some(a => a.label === label) ? label : null);
  const sug = [];
  const addSug = (text, area) => {
    text = stwShortTitle(text, 44);
    if (!text || sug.length >= 4 || sug.some(s => s.text.toLowerCase() === text.toLowerCase())) return;
    sug.push({ text, area: areaOf(area) });
  };
  for (const t of Array.isArray(d.deadlines) ? d.deadlines : []) if (nextIn(t.due)) addSug(t.title, t.stream);
  for (const t of Array.isArray(d.focus) ? d.focus : []) addSug(t.title, t.stream);
  for (const w of Array.isArray(d.waiting) ? d.waiting : []) { const p = (w.people || []).map(person).filter(Boolean)[0]; if (p) addSug(`Hear back from ${p.first || p.name}`, null); }
  const defArea = (sug.find(s => s.area) || {}).area || (Array.isArray(d.perStream) && d.perStream[0] && areaOf(d.perStream[0].label)) || (areas[0] && areas[0].label) || 'Next week';
  // The slots show what is already named: the story's own outcomes, else the guided review's.
  let prevOut = env.draft && Array.isArray(env.draft.storyOutcomes) ? env.draft.storyOutcomes.filter(o => o && o.text) : [];
  if (!prevOut.length && env.draft && env.draft.outcomes && typeof env.draft.outcomes === 'object') {
    prevOut = Object.entries(env.draft.outcomes).flatMap(([area, list]) => (Array.isArray(list) ? list : []).filter(Boolean).map(text => ({ text: String(text), area }))).slice(0, 3);
  }
  const outcomes = {
    slots: [0, 1, 2].map(k => ({ text: String((prevOut[k] && prevOut[k].text) || ''), area: (prevOut[k] && prevOut[k].area) || defArea })),
    suggestions: sug, areas, defArea,
  };

  /* ---- 8. the guided review ---- */
  const labels = new Map((Array.isArray(env.steps) && env.steps.length ? env.steps : STW_STEPS).map(s => [s[0], s[1]]));
  const doneSteps = (env.draft && env.draft.done) || {};
  const named = Object.values((env.draft && env.draft.outcomes) || {}).reduce((t, a) => t + (Array.isArray(a) ? a.filter(Boolean).length : 0), 0);
  const counts = {
    inbox: env.pending ? stwPlural(env.pending, 'suggestion') : 'Clear',
    overdue: d.overdue ? `${d.overdue} overdue` : 'None overdue',
    waiting: (d.waiting || []).length ? `${(d.waiting || []).length} to chase` : 'Nobody',
    capacity: stwPlural(next.meetings, 'meeting'),
    outcomes: named > 0 ? `${named} named` : '',
    wins: `${done} done`,
    finish: '',
  };
  const steps = STW_STEPS.map(([id]) => ({ id, label: labels.get(id) || id, v: counts[id] || '', done: !!doneSteps[id] }));
  const firstOpen = Math.max(0, steps.findIndex(s => !s.done));
  const guided = { steps, first: firstOpen, minutes: Math.max(2, steps.filter(s => !s.done).length * 2 - 2) };

  /* ---- the week type: palette, mood, pacing, order ---- */
  const wd = _stwWd(today);
  const weekend = wd === 0 || wd === 6;
  const big = done >= 15 || wins.filter(w => w.priority === 'p1').length >= 2;
  const quiet = done <= 3 && numbers.events <= 3;
  const slippy = slippedTotal >= 5 && slippedTotal > done / 2;
  const heavyNext = overDays.length > 0 || heavyDays.length >= 2;
  const key = big ? 'big' : slippy ? 'slippy' : quiet ? 'quiet' : 'steady';
  const type = {
    key, heavyNext, weekend,
    mood: heavyNext && key !== 'big' ? 'focused' : { big: 'celebratory', slippy: 'reflective', quiet: 'gentle', steady: 'calm' }[key],
    palette: { big: 'dawn', slippy: 'slate', quiet: 'ocean', steady: 'lavender' }[key],
    pace: key === 'quiet' || weekend ? 1.15 : 1,
  };
  // The aurora: the colours of the streams that moved (then the busiest ones).
  const aurora = [...streamRows.filter(x => x.week), ...streamRows].map(x => x.color).filter(Boolean).filter((c, i, a) => a.indexOf(c) === i).slice(0, 4);

  return {
    range: r, today, days, weekNo: stwWeekNo(r.from), label: `${_stwDM(r.from)} – ${_stwDM(r.to)}`, nextLabel: `${_stwDM(r.nextFrom)} – ${_stwDM(r.nextTo)}`,
    lookingBack: r.to < today, numbers, wins, streams: streamRows, people, slipped, next, outcomes, guided, type, aurora, labelToId,
  };
}

/* ---------- beats ---------- */
/** The next-week headline and narration. */
function stwNextWords(n) {
  const wd = (c) => c.weekday;
  const busiest = n.days.slice().sort((a, b) => b.load - a.load)[0];
  if (n.over.length) {
    const o = n.over.slice().sort((a, b) => b.over - a.over)[0];
    if (n.heavy.length >= 3) return { title: `Nearly full, and ${wd(o)} is over`, say: `Next week is nearly full, and ${wd(o)} is over capacity.` };
    return { title: `${wd(o)} is over capacity`, say: `${wd(o)} next week is over capacity, by ${stwHm(o.over).replace(' h', ' hours').replace(' min', ' minutes')}.` };
  }
  if (n.heavy.length >= 3) return { title: 'Next week is nearly full', say: 'Next week is nearly full. Protect a little room each day.' };
  if (n.heavy.length) return { title: `${wd(n.heavy[0])} is the one to watch`, say: `Next week has room, but ${wd(n.heavy[0])} is busy.` };
  if (busiest && busiest.total > 0) return { title: 'Room to breathe next week', say: `Next week has room to breathe. ${wd(busiest)} is the busiest day.` };
  return { title: 'A wide-open week ahead', say: 'Next week is wide open. A good week for deep work.' };
}

/**
 * Beats for the engine. o = {sceneFor(entities, fallback) -> scene type, chipsMax}.
 * Every beat keeps the model (b.m) for its renderer; ids are stable for the AI swap.
 */
function stwBuildBeats(m, script, o) {
  o = o || {}; script = script || {};
  const bg = { tod: 'day', cond: 'none', palette: m.type.palette, mood: m.type.mood };
  const pace = m.type.pace || 1;
  const B = (x) => Object.assign({ bg, m }, x, { className: `stw-f stw-b-${x.id} stw-k-${m.type.key}`, hold: Math.round((x.hold || 2400) * pace) });
  const n = m.numbers;
  const wk = `Week ${m.weekNo}`;
  const beats = {};

  // 1. numbers
  const bits = [];
  if (n.minutes >= 30) bits.push(`${stwHoursSay(n.minutes)} in meetings and events`);
  if (n.people.length) bits.push(`${stwPlural(n.people.length, 'person', 'people')} seen`);
  beats.numbers = B({
    id: 'numbers', type: 'stw-numbers', scene: 'review', hold: 4200,
    overline: `${wk} · ${m.label}`, title: 'Your week in numbers',
    say: n.done ? `${wk}: ${stwPlural(n.done, 'task')} done${bits.length ? ', ' + stwList(bits) : ''}.` : `${wk}: a quiet week on the list${bits.length ? ', with ' + stwList(bits) : ''}.`,
  });

  // the week in three sentences (the script: Claude's, or the built-in one)
  const sents = (Array.isArray(script.sentences) ? script.sentences : []).filter(s => s && String(s.text || '').trim()).slice(0, 3);
  const sentBeats = sents.map((s, i) => B({
    id: 's' + i, type: 'stw-sentence', idx: i, count: sents.length, all: sents.map(x => x.text), text: s.text, entities: s.entities || [], say: s.text, hold: 1600,
    scene: stwSceneOr(typeof o.sceneFor === 'function' ? o.sceneFor(s.entities || [], 'review') : null, 'review'),
    chips: (s.entities || []).filter(e => e && ['person', 'event', 'task', 'deadline'].includes(e.type)).slice(0, o.chipsMax || 4),
  }));

  // 2. wins
  if (m.wins.length) {
    const w0 = m.wins[0];
    beats.wins = B({
      id: 'wins', type: 'stw-wins', hold: 2600 + 650 * Math.min(5, m.wins.length),   // time to read every card that dealt in
      overline: `Wins · ${stwPlural(n.done, 'task')} done`,
      title: m.wins.length === 1 ? 'One win worth keeping' : `${stwWord(m.wins.length, true)} wins worth keeping`,
      say: m.wins.length === 1 ? `Your win this week: ${w0.title}.` : `Your biggest win: ${w0.title}.`,
    });
  }
  // 3. streams
  const moved = m.streams.filter(x => x.week > 0);
  if (moved.length) {
    const t = moved[0];
    beats.streams = B({
      id: 'streams', type: 'stw-streams', hold: 2600 + 300 * Math.min(6, m.streams.length), overline: 'Stream progress', title: `${t.label} moved the most`,
      say: `${t.label} moved the most this week, up ${stwPlural(t.gain, 'point')}.`,
    });
  }
  // 4. people
  const P = m.people;
  if (P.nodes.length || P.reach.length) {
    const top = P.top;
    let say = top ? `You spent the most time with ${top.p.first || top.p.name}.` : 'Here is who matters next week.';
    if (P.quiet && P.quiet.lastContact) say += ` ${P.quiet.first || P.quiet.name} hasn't heard from you in ${stwWord(Math.round(P.quiet.lastContact.daysAgo / 7))} weeks.`;
    else if (P.reach[0] && P.reach[0].say && (!top || P.reach[0].p.id !== top.id)) say += ' ' + P.reach[0].say;
    beats.people = B({ id: 'people', type: 'stw-people', hold: 3000 + 250 * Math.min(8, P.nodes.length), overline: 'People of the week', title: top ? `Most time with ${top.p.first || top.p.name}` : 'People of the week', say });
  }
  // 5. slipped
  const S = m.slipped;
  if (S.total > 0) {
    const tail = S.top ? `, mostly ${S.top.label.toLowerCase()}` : '';
    beats.slipped = B({
      id: 'slipped', type: 'stw-slipped', hold: 3600, overline: 'Slipped, and why', title: `${stwWord(S.total, true)} ${S.total === 1 ? 'thing' : 'things'} slipped${tail}`,
      say: S.top ? `${stwWord(S.total, true)} ${S.total === 1 ? 'thing' : 'things'} slipped, mostly ${stwBecause(S.top.label)}.` :`${stwWord(S.total, true)} ${S.total === 1 ? 'thing' : 'things'} slipped. Each one gets a fix.`,
    });
  }
  // 6. next week
  if (m.next.days.length) {
    const w = stwNextWords(m.next);
    beats.next = B({ id: 'next', type: 'stw-next', hold: 3800, overline: `Next week · ${m.nextLabel}`, title: w.title, say: w.say });
  }
  // 7. outcomes
  beats.outcomes = B({ id: 'outcomes', type: 'stw-outcomes', hold: 4200, overline: 'Next week', title: 'Three outcomes that would make it a good week', say: 'Name three outcomes that would make next week a good one.' });
  // 8. the guided review
  const closing = String(script.closing || '').trim();
  beats.guided = B({
    id: 'guided', type: 'stw-guided', hold: 2000, auto: false, overline: 'Last step', title: 'Now, the guided review.',
    say: `${closing ? closing + ' ' : ''}Ready for the guided review? About ${stwWord(m.guided.minutes)} minutes.`,
  });

  // Order follows the week: a big week leads with its wins, a heavy next week looks ahead early.
  let order = ['numbers', 'S', 'wins', 'streams', 'people', 'slipped', 'next', 'outcomes', 'guided'];
  if (m.type.key === 'big') order = ['numbers', 'wins', 'S', 'streams', 'people', 'slipped', 'next', 'outcomes', 'guided'];
  else if (m.type.key === 'slippy') order = ['numbers', 'S', 'slipped', 'wins', 'streams', 'people', 'next', 'outcomes', 'guided'];
  if (m.type.heavyNext && m.type.key !== 'big') order = order.filter(x => x !== 'next').reduce((a, x) => (x === 'wins' ? a.concat('next', x) : a.concat(x)), []);
  const out = [];
  for (const k of order) { if (k === 'S') out.push(...sentBeats); else if (beats[k]) out.push(beats[k]); }
  for (const b of out) b._auto0 = b.auto;
  return out;
}

/**
 * Write the story's outcomes into the guided review draft: each fills a free slot
 * of its area (three per area); the ones written last time are replaced, not doubled.
 */
function stwSyncOutcomes(draft, list) {
  if (!draft || typeof draft !== 'object') return draft;
  if (!draft.outcomes || typeof draft.outcomes !== 'object') draft.outcomes = {};
  for (const prev of Array.isArray(draft.storyOutcomes) ? draft.storyOutcomes : []) {
    if (!prev || !prev.text || !Array.isArray(draft.outcomes[prev.area])) continue;
    const k = draft.outcomes[prev.area].indexOf(prev.text);
    if (k >= 0) draft.outcomes[prev.area][k] = '';
  }
  const clean = (Array.isArray(list) ? list : []).slice(0, 3).map(o => ({ text: String((o && o.text) || '').replace(/\s+/g, ' ').trim().slice(0, 300), area: String((o && o.area) || 'Next week').slice(0, 80) }));
  for (const o of clean) {
    if (!o.text) continue;
    const a = (Array.isArray(draft.outcomes[o.area]) ? draft.outcomes[o.area] : []).concat(['', '', '']).slice(0, 3);
    if (a.includes(o.text)) { draft.outcomes[o.area] = a; continue; }
    let k = a.indexOf('');
    if (k < 0) k = 2;
    a[k] = o.text;
    draft.outcomes[o.area] = a;
  }
  draft.storyOutcomes = clean;
  return draft;
}
