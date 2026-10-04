/* ============================================================
   HOME widget "list" (Smart list): the pure rules (WIDGETS_CATALOGUE.md 3.11).
   OWNER: the "list" widget builder. The widget itself: 12-home-w-list.js.
   No DOM and no state here: the page passes in what it knows, so
   tests/home-w-list.test.mjs runs these in a VM. Declarations only (this file
   loads before 12-home.js).

     homeListParse(query, parse)        the query parsed once per render: a FRESH copy of
                                        parseTaskSearch's answer (it caches only its last
                                        query, and several copies share it) with is:open
                                        implied unless the query asks for closed tasks
     homeListDoneQuery(parsed)          the same query without the implied is:open
                                        (what was ticked today)
     homeQueryDefaults(parsed, known)   what a task added to the list gets from its query:
                                        #tag, @person, stream:, p1, due:today|tomorrow,
                                        is:doing, is:planned
     homeListBucket(due, today)         'overdue'|'today'|'week'|'later'|'none' (grouping by due)
     homeListGroups(rows, by, o)        [{key, label, ids}] in display order (due, stream, person)
     homeListColumn(status)             the board column: 'todo'|'doing'|'done'
     homeListAutoTitle(parsed, o)       a title from the query when the user gave none
     HOME_LIST_PRESETS                  the set-up presets
   ============================================================ */
const HOME_LIST_PRESETS = Object.freeze([
  Object.freeze({ id: 'week', label: 'Due this week', query: 'due:week', icon: 'calendar-range' }),
  Object.freeze({ id: 'nodate', label: 'No date', query: 'due:none', icon: 'circle-dashed' }),
  Object.freeze({ id: 'tag', label: 'A tag…', pick: 'tag', icon: 'hash' }),
  Object.freeze({ id: 'person', label: 'A person…', pick: 'person', icon: 'at-sign' }),
  Object.freeze({ id: 'stream', label: 'A stream…', pick: 'stream', icon: 'layers' }),
  Object.freeze({ id: 'custom', label: 'Custom search', pick: 'custom', icon: 'search' }),
]);
const HOME_LIST_BUCKETS = Object.freeze([
  ['overdue', 'Overdue'], ['today', 'Today'], ['week', 'This week'], ['later', 'Later'], ['none', 'No date'],
]);
const _HLS_CLOSED = ['done', 'wontdo', 'skipped'];

/** The query, parsed: a fresh object every call (never the parser's cached one). */
function homeListParse(query, parse) {
  const q = String(query == null ? '' : query).trim();
  const p = typeof parse === 'function' ? parse(q) : null;
  const base = p && typeof p === 'object' ? p : { words: [], not: [], tags: [], people: [], prio: null, is: [], due: null, stream: null, raw: q };
  const out = {
    words: [...(base.words || [])], not: [...(base.not || [])], tags: [...(base.tags || [])], people: [...(base.people || [])],
    prio: base.prio || null, is: [...(base.is || [])], due: base.due || null, stream: base.stream || null, raw: q,
  };
  out.wantsClosed = out.is.some(k => _HLS_CLOSED.includes(k));
  out.implied = !out.wantsClosed && !out.is.includes('open');
  if (out.implied) out.is.push('open');
  return out;
}
/** The query without the implied is:open: the tasks of this list that are closed. */
function homeListDoneQuery(parsed) {
  const p = parsed || { is: [] };
  return Object.assign({}, p, { is: (p.is || []).filter(k => !(k === 'open' && p.implied)) });
}

function _hlsLow(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
/** The one known tag the query's #tag means: itself, else the only tag it starts. */
function _hlsTag(t, known) {
  const tags = (known || []).map(String);
  if (tags.includes(t)) return t;
  const pre = tags.filter(x => x.toLowerCase().startsWith(t));
  return pre.length === 1 ? pre[0] : t;
}
/** The person an @name means (exact id, then a unique first name, then a unique word prefix), or null. */
function _hlsPerson(q, people) {
  const list = (people || []).filter(p => p && p.id && !p.self);
  const exact = list.find(p => _hlsLow(p.id) === q);
  if (exact) return exact.id;
  const words = (p) => [p.name, ...(p.aliases || [])].flatMap(n => _hlsLow(n).split(/\s+/)).filter(Boolean);
  const whole = list.filter(p => [_hlsLow(p.name), ...(p.aliases || []).map(_hlsLow)].includes(q));
  if (whole.length === 1) return whole[0].id;
  const first = list.filter(p => words(p)[0] === q);
  if (first.length === 1) return first[0].id;
  const pre = list.filter(p => words(p).some(w => w.startsWith(q)));
  return pre.length === 1 ? pre[0].id : null;
}
/** The stream a stream: operator means (its id, else the first whose label starts with it, in order), or null. */
function _hlsStream(q, streams) {
  const list = (streams || []).filter(s => s && s.id);
  const exact = list.find(s => _hlsLow(s.id) === q);
  if (exact) return exact.id;
  const pre = list.filter(s => _hlsLow(s.label).startsWith(q)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  return pre.length ? pre[0].id : null;
}
/**
 * What a task added to this list gets from the query, so it lands in the list.
 * known: {tags: [tag], people: [{id, name, aliases, self}], streams: [{id, label, order}], today, tomorrow}.
 * -> {tags, people, stream, priority, dueDate, status, plannedFor} (only what the query says).
 */
function homeQueryDefaults(parsed, known) {
  const p = parsed || {};
  const k = known || {};
  const out = {};
  const tags = (p.tags || []).map(t => _hlsTag(_hlsLow(t), k.tags)).filter(Boolean);
  if (tags.length) out.tags = [...new Set(tags)];
  const people = (p.people || []).map(n => _hlsPerson(_hlsLow(n), k.people)).filter(Boolean);
  if (people.length) out.people = [...new Set(people)];
  if (p.stream) { const s = _hlsStream(_hlsLow(p.stream), k.streams); if (s) out.stream = s; }
  if (/^p[1-3]$/.test(p.prio || '')) out.priority = p.prio;
  if (p.due === 'today' && k.today) out.dueDate = k.today;
  else if (p.due === 'tomorrow' && k.tomorrow) out.dueDate = k.tomorrow;
  if ((p.is || []).includes('doing')) out.status = 'doing';
  if ((p.is || []).includes('planned') && k.today) out.plannedFor = k.today;
  return out;
}

function _hlsDayNo(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : null;
}
/** Which due group a date falls in: overdue, today, the next 7 days, later, or no date. */
function homeListBucket(due, today) {
  const d = _hlsDayNo(due), t = _hlsDayNo(today);
  if (d == null || t == null) return 'none';
  const n = Math.round(d - t);
  return n < 0 ? 'overdue' : n === 0 ? 'today' : n <= 7 ? 'week' : 'later';
}
/**
 * Group rows for the large list. rows: [{id, due, stream, people: [personId]}] in display order
 * (each group keeps it). by: 'due' | 'stream' | 'person'. o: {today, streamLabel(id), streamOrder(id),
 * personName(id), selfIds: [id]}. -> [{key, label, ids}] (empty groups left out).
 */
function homeListGroups(rows, by, o) {
  o = o || {};
  const groups = new Map();
  const add = (key, label, id) => { if (!groups.has(key)) groups.set(key, { key, label, ids: [] }); groups.get(key).ids.push(id); };
  const self = new Set(o.selfIds || []);
  for (const r of rows || []) {
    if (!r || !r.id) continue;
    if (by === 'stream') {
      const s = r.stream || '';
      add('s:' + s, s ? ((o.streamLabel && o.streamLabel(s)) || s) : 'No stream', r.id);
    } else if (by === 'person') {
      const pid = (r.people || []).find(x => x && !self.has(x)) || '';
      add('p:' + pid, pid ? ((o.personName && o.personName(pid)) || pid) : 'No one', r.id);
    } else {
      const b = homeListBucket(r.due, o.today);
      add('d:' + b, (HOME_LIST_BUCKETS.find(x => x[0] === b) || [b, b])[1], r.id);
    }
  }
  const list = [...groups.values()];
  if (by === 'stream') {
    const ord = (g) => (g.key === 's:' ? 1e9 : (o.streamOrder ? (o.streamOrder(g.key.slice(2)) ?? 999) : 999));
    list.sort((a, b) => ord(a) - ord(b) || a.label.localeCompare(b.label));
  } else if (by === 'person') {
    list.sort((a, b) => ((a.key === 'p:') - (b.key === 'p:')) || (b.ids.length - a.ids.length) || a.label.localeCompare(b.label));
  } else {
    const at = (g) => HOME_LIST_BUCKETS.findIndex(x => 'd:' + x[0] === g.key);
    list.sort((a, b) => at(a) - at(b));
  }
  return list;
}
/** The board column of a task: done (closed), in progress, or to do. */
function homeListColumn(status) { return status === 'done' ? 'done' : status === 'doing' ? 'doing' : 'todo'; }

/**
 * A title from the query when the user gave none. o: {streamLabel(id), personName(q)}.
 * 'due:week' -> 'Due this week'; '#onboarding' -> '#onboarding'; '@sam' -> the person's name.
 */
function homeListAutoTitle(parsed, o) {
  o = o || {};
  const p = parsed || {};
  const raw = String(p.raw || '').trim();
  if (!raw) return 'Smart list';
  const preset = HOME_LIST_PRESETS.find(x => x.query && x.query === raw);
  if (preset) return preset.label;
  const tags = p.tags || [], people = p.people || [];
  const parts = (p.words || []).length + (p.not || []).length + tags.length + people.length + (p.prio ? 1 : 0) + (p.due ? 1 : 0) + (p.stream ? 1 : 0)
    + (p.is || []).filter(x => !(x === 'open' && p.implied)).length;
  if (parts === 1) {
    if (tags.length) return '#' + tags[0];
    if (people.length) return (o.personName && o.personName(people[0])) || '@' + people[0];
    if (p.stream) return (o.streamLabel && o.streamLabel(p.stream)) || p.stream;
    if (p.due) return ({ today: 'Due today', overdue: 'Overdue', tomorrow: 'Due tomorrow', week: 'Due this week', none: 'No date' })[p.due] || raw;
  }
  return raw.length > 40 ? raw.slice(0, 39) + '…' : raw;
}
