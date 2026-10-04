/* ============================================================
   QUICK ADD (owner: Tasks): the natural-language parser, task creation
   and the per-view defaults.

   Syntax (date words only count at the END of the text, or after "due"/"by",
   so "Email Tom about paper" and "Sun Widgets application" stay as typed):
     dates   today, tonight, tomorrow, tmrw, fri, friday, next mon, this fri,
             next week, next month, in 3 days, in 2 weeks, eow / end of week,
             eom / end of month, weekend, 15 oct, oct 15, 15/10, 2026-10-15
     time    3pm, 9:30am, 14:00 (optionally "at 3pm")
     repeat  every day | weekday | week | 2 weeks | month | monday, daily, weekly, monthly
     !p1     priority (!p1-!p3 anywhere; p1-p3 at the end)
     #word   a stream if it names one, otherwise a tag
     +word   stream
     @name   link a person (a new name creates them)
     ~2h     estimate (~30m, ~1.5h)
   parseQuickAdd(text, {ignore}) also returns `tokens` for the live preview;
   `ignore` holds raw token texts the user clicked off ("keep as text").
   ============================================================ */
const _QA_WD = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, weds: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };
const _QA_MONTHS = { jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11 };

// The parser's dates are wall dates: local Dates at midnight built from y/m/d, used for calendar
// arithmetic only. "Today" (or the instant `now`) is read in the dashboard's zone through Clock.
function _qaToday(now) { const [y, m, d] = (now ? Clock.parts(new Date(now).getTime()).iso : todayStr()).split('-').map(Number); return new Date(y, m - 1, d); }
function _qaAdd(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; } // clock-ok: wall date
function _qaWeekStartIdx() { return typeof _tWeekStart === 'function' ? _tWeekStart() : 1; }
/** Start (as Date) of the week containing d, using the configured week start. */
function _qaWeekStart(d) { const ws = _qaWeekStartIdx(); return _qaAdd(d, -((d.getDay() - ws + 7) % 7)); } // clock-ok: wall date
function _qaNextWeekday(today, wd, strictlyAfter) {
  let ahead = (wd - today.getDay() + 7) % 7; // clock-ok: wall date
  if (ahead === 0 && strictlyAfter) ahead = 7;
  return _qaAdd(today, ahead);
}
function _qaValidDay(y, m, d) { const x = new Date(y, m, d); return x.getFullYear() === y && x.getMonth() === m && x.getDate() === d ? x : null; } // clock-ok: wall date
/** Day-month order for "15/10": month first only for US-style locales. */
function _qaMonthFirst() { const l = String((typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || 'en-GB'); return /^en-US|^en-PH|^fil/i.test(l); }

/**
 * Try to read a date phrase from words[i..]. Returns {date: Date, len, label} or null.
 * `ctx.trailing`: the phrase must use up every remaining word.
 */
function _qaDateAt(words, i, today) {
  const w = (k) => (words[i + k] || '').toLowerCase().replace(/[.,;]$/, '');
  const a = w(0), b = w(1), c = w(2);
  if (!a) return null;
  if (a === 'today' || a === 'tonight') return { date: today, len: 1 };
  if (a === 'tomorrow' || a === 'tmrw' || a === 'tmr') return { date: _qaAdd(today, 1), len: 1 };
  if (a === 'eow' || (a === 'end' && b === 'of' && c === 'week')) {
    const fri = _qaNextWeekday(today, 5, false);
    return { date: fri, len: a === 'eow' ? 1 : 3 };
  }
  if (a === 'eom' || (a === 'end' && b === 'of' && c === 'month')) {
    return { date: new Date(today.getFullYear(), today.getMonth() + 1, 0), len: a === 'eom' ? 1 : 3 }; // clock-ok: wall date
  }
  if (a === 'weekend' || (a === 'this' && b === 'weekend')) return { date: _qaNextWeekday(today, 6, false), len: a === 'this' ? 2 : 1 };
  if (a === 'next' && b === 'week') return { date: _qaAdd(_qaWeekStart(today), 7), len: 2 };
  if (a === 'next' && b === 'month') return { date: new Date(today.getFullYear(), today.getMonth() + 1, 1), len: 2 }; // clock-ok: wall date
  if (a === 'next' && b === 'weekend') return { date: _qaAdd(_qaNextWeekday(today, 6, false), 7), len: 2 };
  if ((a === 'next' || a === 'this') && b in _QA_WD) {
    // "next fri": that day in NEXT week; "this fri": that day in the current week (or the coming one).
    if (a === 'this') return { date: _qaNextWeekday(today, _QA_WD[b], false), len: 2 };
    const ws = _qaAdd(_qaWeekStart(today), 7);
    return { date: _qaAdd(ws, (_QA_WD[b] - ws.getDay() + 7) % 7), len: 2 }; // clock-ok: wall date
  }
  if (a === 'in' && /^\d{1,3}$/.test(b) && /^(day|days|d|week|weeks|wk|wks|w|month|months|mo)$/.test(c)) {
    const n = Number(b);
    if (/^d/.test(c)) return { date: _qaAdd(today, n), len: 3 };
    if (/^w/.test(c)) return { date: _qaAdd(today, n * 7), len: 3 };
    const x = new Date(today); x.setMonth(x.getMonth() + n); return { date: x, len: 3 }; // clock-ok: wall date
  }
  if (a in _QA_WD) {
    // Bare weekday: the next one (today's weekday means a week from today).
    // "sat"/"sun" only as lower-case or full names, so "the Sun" stays text.
    const raw = (words[i] || '').replace(/[.,;]$/, '');
    if ((a === 'sat' || a === 'sun') && raw !== a) return null;
    return { date: _qaNextWeekday(today, _QA_WD[a], true), len: 1 };
  }
  let m;
  if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a))) { const d = _qaValidDay(+m[1], +m[2] - 1, +m[3]); return d ? { date: d, len: 1 } : null; }
  if ((m = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/.exec(a))) {
    let [x, y] = [Number(m[1]), Number(m[2])];
    if (_qaMonthFirst()) [x, y] = [y, x];
    let yr = m[3] ? Number(m[3].length === 2 ? '20' + m[3] : m[3]) : today.getFullYear(); // clock-ok: wall date
    let d = _qaValidDay(yr, y - 1, x);
    if (d && !m[3] && d < today) d = _qaValidDay(yr + 1, y - 1, x);
    return d ? { date: d, len: 1 } : null;
  }
  // "15 oct" / "15th oct 2027" / "oct 15"
  const dayNum = (s) => { const r = /^(\d{1,2})(st|nd|rd|th)?$/.exec(s); return r ? Number(r[1]) : null; };
  const yearAt = (s) => (/^20\d{2}$/.test(s) ? Number(s) : null);
  if (dayNum(a) && b in _QA_MONTHS) {
    const y = yearAt(c);
    let d = _qaValidDay(y || today.getFullYear(), _QA_MONTHS[b], dayNum(a)); // clock-ok: wall date
    if (d && !y && d < today) d = _qaValidDay(today.getFullYear() + 1, _QA_MONTHS[b], dayNum(a)); // clock-ok: wall date
    return d ? { date: d, len: y ? 3 : 2 } : null;
  }
  if (a in _QA_MONTHS && dayNum(b) && a.length >= 3) {
    const y = yearAt(c);
    let d = _qaValidDay(y || today.getFullYear(), _QA_MONTHS[a], dayNum(b)); // clock-ok: wall date
    if (d && !y && d < today) d = _qaValidDay(today.getFullYear() + 1, _QA_MONTHS[a], dayNum(b)); // clock-ok: wall date
    return d ? { date: d, len: y ? 3 : 2 } : null;
  }
  return null;
}
/** A time: 3pm, 3:30pm, 15:00, 9am. Returns {time:'HH:MM', len} or null. */
function _qaTimeAt(words, i) {
  let k = 0;
  const first = (words[i] || '').toLowerCase();
  if (first === 'at' || first === '@') k = 1;
  const s = (words[i + k] || '').toLowerCase().replace(/[.,;]$/, '');
  let m;
  if ((m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/.exec(s))) {
    let h = Number(m[1]) % 12; if (m[3] === 'pm') h += 12;
    const mi = Number(m[2] || 0);
    if (h > 23 || mi > 59) return null;
    return { time: String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'), len: k + 1 };
  }
  if ((m = /^(\d{1,2}):(\d{2})$/.exec(s))) {
    const h = Number(m[1]), mi = Number(m[2]);
    if (h > 23 || mi > 59) return null;
    return { time: String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'), len: k + 1 };
  }
  return null;
}
/** A repeat rule: every day/weekday/week/2 weeks/month/<weekday>, daily, weekly, monthly. */
function _qaRepeatAt(words, i, today) {
  const a = (words[i] || '').toLowerCase(), b = (words[i + 1] || '').toLowerCase().replace(/[.,;]$/, ''), c = (words[i + 2] || '').toLowerCase();
  if (a === 'daily') return { rec: 'daily', len: 1 };
  if (a === 'weekly') return { rec: 'weekly', len: 1 };
  if (a === 'monthly') return { rec: 'monthly', len: 1 };
  if (a === 'fortnightly') return { rec: 'biweekly', len: 1 };
  if (a !== 'every') return null;
  if (b === 'day') return { rec: 'daily', len: 2 };
  if (b === 'weekday' || b === 'weekdays' || b === 'workday') return { rec: 'weekdays', len: 2 };
  if (b === 'week') return { rec: 'weekly', len: 2 };
  if (b === 'month') return { rec: 'monthly', len: 2 };
  if (b === 'fortnight' || (b === '2' && /^weeks?$/.test(c)) || (b === 'other' && c === 'week')) return { rec: 'biweekly', len: b === 'fortnight' ? 2 : 3 };
  if (b in _QA_WD) return { rec: 'weekly', len: 2, date: _qaNextWeekday(today, _QA_WD[b], false) };
  return null;
}
function _qaPerson(name) {
  const n = String(name || '').toLowerCase().replace(/[_-]+/g, ' ').trim();
  if (!n) return null;
  const people = (typeof state !== 'undefined' && state.people) || [];
  return people.find(p => p.id === n || p.id === n.replace(/\s+/g, '-'))
    || people.find(p => String(p.name || '').toLowerCase() === n)
    || people.find(p => (p.aliases || []).some(a => String(a).toLowerCase() === n))
    || people.find(p => String(p.name || '').toLowerCase().split(/\s+/)[0] === n)
    || null;
}
function _qaStream(word) {
  const w = String(word || '').toLowerCase();
  if (!w || typeof STREAMS === 'undefined') return null;
  for (const [id, s] of Object.entries(STREAMS)) {
    if (s.archived) continue;
    const lbl = String(s.label || '').toLowerCase();
    if (id.toLowerCase() === w || lbl === w || lbl.replace(/[^a-z0-9]+/g, '') === w.replace(/[^a-z0-9]+/g, '')) return id;
  }
  return null;
}
function _qaFmtDay(d) {
  const iso = fmtDate(d);
  const n = typeof daysUntil === 'function' ? daysUntil(iso) : null;
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  const loc = (typeof APP_CONFIG !== 'undefined' && APP_CONFIG.locale) || undefined;
  return d.toLocaleDateString(loc, n !== null && n > 0 && n < 7 ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: iso.slice(0, 4) === todayStr().slice(0, 4) ? undefined : 'numeric' });
}

function parseQuickAdd(input, opts) {
  opts = opts || {};
  const ignore = new Set([...(opts.ignore || [])].map(s => String(s).toLowerCase()));
  const today = _qaToday(opts.now);
  const out = { title: '', dueDate: null, dueTime: null, priority: 'p0', tags: [], stream: null, people: [], newPeople: [], recurrence: null, estimate: null, tokens: [] };
  const tok = (kind, raw, label, extra) => out.tokens.push(Object.assign({ kind, raw, label }, extra || {}));
  const skip = (raw) => ignore.has(String(raw).toLowerCase());
  let words = String(input || '').trim().split(/\s+/).filter(Boolean);
  const keep = [];

  // 1) Explicit markers anywhere: #tag/#stream, +stream, @person, !p1, ~2h, ISO dates, "due/by <date>".
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let m;
    if ((m = /^#([\p{L}\p{N}_-]+)$/u.exec(w)) && !skip(w)) {
      const st = _qaStream(m[1]);
      if (st && !out.stream) { out.stream = st; tok('stream', w, STREAMS[st].label, { color: STREAMS[st].color }); }
      else { const t = m[1].toLowerCase(); if (!out.tags.includes(t)) out.tags.push(t); tok('tag', w, '#' + t); }
      continue;
    }
    if ((m = /^\+([\p{L}\p{N}_-]+)$/u.exec(w)) && !skip(w)) {
      const st = _qaStream(m[1]);
      if (st) { out.stream = st; tok('stream', w, STREAMS[st].label, { color: STREAMS[st].color }); continue; }
    }
    if ((m = /^@([\p{L}\p{N}._'-]+)$/u.exec(w)) && !skip(w) && !/^\d/.test(m[1])) {
      const name = m[1].replace(/[.,;]$/, '');
      const p = _qaPerson(name);
      if (p) { if (!out.people.includes(p.id)) out.people.push(p.id); tok('person', w, p.name, { personId: p.id }); }
      else {
        const nice = name.replace(/[_-]+/g, ' ').replace(/\b\p{L}/gu, c => c.toUpperCase());
        if (!out.newPeople.includes(nice)) out.newPeople.push(nice);
        tok('person', w, nice + ' (new)', { isNew: true });
      }
      continue;
    }
    if ((m = /^!p?([1-3])$/i.exec(w)) && !skip(w)) { out.priority = 'p' + m[1]; tok('priority', w, 'P' + m[1]); continue; }
    if ((m = /^~(\d+(?:\.\d+)?)(m|min|mins|h|hr|hrs)$/i.exec(w)) && !skip(w)) {
      const n = Number(m[1]); const mins = /^h/i.test(m[2]) ? Math.round(n * 60) : Math.round(n);
      if (mins > 0 && mins <= 100 * 60) { out.estimate = mins; tok('estimate', w, fmtEstimate(mins)); continue; }
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(w) && !skip(w)) {
      const r = _qaDateAt(words, i, today);
      if (r && !out.dueDate) { out.dueDate = fmtDate(r.date); tok('date', w, _qaFmtDay(r.date)); continue; }
    }
    if (/^(due|by)$/i.test(w) && i + 1 < words.length) {
      const r = _qaDateAt(words, i + 1, today);
      const raw = words.slice(i, i + 1 + (r ? r.len : 0)).join(' ');
      if (r && !out.dueDate && !skip(raw)) { out.dueDate = fmtDate(r.date); tok('date', raw, _qaFmtDay(r.date)); i += r.len; continue; }
    }
    keep.push(w);
  }
  words = keep;

  // 2) Trailing phrases: date, time, repeat, bare priority (any order, from the end).
  let progress = true;
  while (progress && words.length > 1) {
    progress = false;
    for (let start = Math.max(1, words.length - 4); start < words.length; start++) {
      const len = words.length - start;
      const raw = words.slice(start).join(' ');
      if (skip(raw)) continue;
      const lowFirst = words[start].toLowerCase();
      // connectors before a trailing date ("on fri", "by mon", "due tomorrow")
      const conn = /^(on|by|due)$/.test(lowFirst) && start + 1 < words.length ? 1 : 0;
      let r = !out.dueDate ? _qaDateAt(words, start + conn, today) : null;
      if (r && r.len + conn === len) { out.dueDate = fmtDate(r.date); tok('date', raw, _qaFmtDay(r.date)); words = words.slice(0, start); progress = true; break; }
      const t = !out.dueTime ? _qaTimeAt(words, start) : null;
      if (t && t.len === len) { out.dueTime = t.time; tok('time', raw, t.time); words = words.slice(0, start); progress = true; break; }
      const rp = !out.recurrence ? _qaRepeatAt(words, start, today) : null;
      if (rp && rp.len === len) {
        out.recurrence = rp.rec; tok('repeat', raw, recurrenceLabel(rp.rec));
        if (rp.date && !out.dueDate) out.dueDate = fmtDate(rp.date);
        words = words.slice(0, start); progress = true; break;
      }
      if (len === 1 && /^p[1-3]$/i.test(words[start]) && out.priority === 'p0') {
        out.priority = words[start].toLowerCase(); tok('priority', raw, words[start].toUpperCase()); words = words.slice(0, start); progress = true; break;
      }
    }
  }
  // A repeating task with no date starts today.
  if (out.recurrence && !out.dueDate) out.dueDate = fmtDate(today);
  // A time without a date means today.
  if (out.dueTime && !out.dueDate) out.dueDate = fmtDate(today);
  out.title = words.join(' ').replace(/\s+/g, ' ').trim();
  if (!out.title && String(input || '').trim()) {
    // Everything was a keyword ("tomorrow"): keep the text as the title instead.
    return parseQuickAdd(input, Object.assign({}, opts, { ignore: [...ignore, ...out.tokens.map(t => t.raw)] }));
  }
  return out;
}

/** "45m", "1h", "1h 30m" */
function fmtEstimate(mins) {
  mins = Number(mins) || 0;
  if (mins < 60) return mins + 'm';
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** What a new task gets by default in a view, so it stays visible where it was added. */
function quickAddDefaults(view) {
  view = view || state.view;
  if (view === 'today' || view === 'week') return { dueDate: todayStr() };
  if (view === 'tomorrow') return { dueDate: tomorrowStr() };
  if (view.startsWith('day:')) return { dueDate: view.slice(4) };
  if (view.startsWith('stream:')) return { stream: view.slice(7) };
  if (view.startsWith('tag:')) return { tags: [view.slice(4)] };
  if (view.startsWith('person:')) return { people: [view.slice(7)] };
  return {};
}

/** Make a person record for a name typed as @Name (minimal: the People page fills the rest). */
function ensurePersonByName(name) {
  const n = String(name || '').trim();
  if (!n) return null;
  const hit = _qaPerson(n);
  if (hit) return hit.id;
  let base = n.toLowerCase().split(/\s+/)[0].replace(/[^\p{L}\p{N}-]/gu, '') || 'person';
  let id = base, k = 2;
  while (state.people.some(p => p.id === id)) id = base + '-' + (k++);
  const palette = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777', '#7c3aed', '#475569'];
  state.people.push({ id, name: n, email: '', role: '', aliases: [], color: palette[state.people.length % palette.length], createdAt: Date.now() });
  return id;
}

/**
 * Create a task. Returns the new id.
 * extra: {dueTime, people, newPeople, estimate, plannedFor, detail, subtasks, status}
 */
function addCustomTask(title, dueDate, priority, tags, stream, recurrence, extra) {
  title = String(title || '').trim();
  if (!title) return null;
  extra = extra || {};
  const people = [...(extra.people || [])];
  for (const n of (extra.newPeople || [])) { const pid = ensurePersonByName(n); if (pid && !people.includes(pid)) people.push(pid); }
  const item = {
    id: _newTaskId(),
    title, dueDate: dueDate || null, priority: priority || 'p0',
    tags: tags || [],
    stream: stream || (state.view.startsWith('stream:') ? state.view.slice(7) : defaultStreamId()),
    detail: extra.detail || '',
    subtasks: (extra.subtasks || []).map(t => ({ id: _newSubId(), title: String(t), done: false, ts: Date.now() })),
    recurrence: recurrence || 'none',
    people,
    createdAt: Date.now(), createdVia: 'ui',
  };
  if (extra.dueTime && item.dueDate) item.dueTime = extra.dueTime;
  if (extra.estimate) item.estimate = extra.estimate;
  if (extra.plannedFor) item.plannedFor = extra.plannedFor;
  if (typeof pplAutoLinkOnCreate === 'function') pplAutoLinkOnCreate(item);   // People: link names in the title (50-people.js)
  state.custom.push(item);
  if (extra.status && extra.status !== 'todo') state.statuses[item.id] = extra.status;
  logActivity(item.id, 'created', { text: 'Created' });
  saveData(); render();
  return item.id;
}

/** Create from a parse result + the view's defaults. Returns the id. */
function addParsedTask(parsed, defaults) {
  if (!parsed || !parsed.title) return null;
  const d = defaults || {};
  const tags = [...new Set([...(d.tags || []), ...(parsed.tags || [])])];
  const people = [...new Set([...(d.people || []), ...(parsed.people || [])])];
  return addCustomTask(parsed.title, parsed.dueDate || d.dueDate || null, parsed.priority !== 'p0' ? parsed.priority : (d.priority || 'p0'),
    tags, parsed.stream || d.stream || null, parsed.recurrence || 'none',
    { dueTime: parsed.dueTime, people, newPeople: parsed.newPeople, estimate: parsed.estimate, plannedFor: d.plannedFor, status: d.status });
}
/** Parse + create in one go (dialogs, bulk add). Returns the id or null. */
function addTaskFromText(text, defaults) {
  const parsed = parseQuickAdd(text);
  return parsed.title ? addParsedTask(parsed, defaults) : null;
}
/** Where a task lives, for "Added to …" toasts. */
function homeViewForTask(item) {
  if (statusOf(item.id) === 'done') return 'completed';
  const d = daysUntil(effDate(item));
  if (inViewScope(item, 'today')) return 'today';
  if (d === null) return 'no-date';
  if (d <= 7) return 'week';
  return 'all';
}
