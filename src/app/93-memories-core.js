/* ============================================================
   MEMORIES (2.16): the dashboard remembers your days. Owner: Memories.
     93-memories-core.js     data, the completion index, stats, mood, people, postcards,
                             capsules, seasons, milestones, fun facts, the public API (this file)
     93-memories-journal.js  the daily journal (template lines, optional "Polish with Claude")
     93-memories-ui.js       shared pieces: heatmap, garden, postcards + album, capsules,
                             the day dialog, the birthday field, the living-scene layer
     93-memories-page.js     the Memories section (#view=memories, memories:<tab>), sidebar, palette
     93-memories-wrapped.js  Wrapped: your year in OpenDash, full screen, story-like
     Home widgets            12-home-w-onthisday / heatmap / garden / reportcard / funfact / seasonal
     CSS                     src/styles/93-memories.css

   DATA: state.memories (synced: lib/sync/manifest.mjs '── memories ──'; a data key with no
   undo step, like the chats: 01-core-state.js _NO_UNDO_KEYS) = {
     v: 1,
     journal:   {'YYYY-MM-DD': {text, facts, line, mood 1-5, polished, at, lineAt}}   kept forever
     capsules:  [{id, text, created, opens 'YYYY-MM-DD', opened}]                       notes to your future self
     postcards: {CC: {cc, name, city, from, to, days, done, people, art, note, at}}    first visit to a country
     goals:     {'YYYY': {list: [{id, text, done}], at}}                               the New Year ritual
     advent:    {'YYYY': {'1'..'24': ms}}                                              advent doors done
   }
   People records may carry an optional `birthday` ('MM-DD' or 'YYYY-MM-DD'; 50-people.js _pplApply
   calls memBirthdayCheck). Flags shown once (toasts) use the synced seen flags (06-core-seen.js).

   PUBLIC API (plain functions, also on window.OpenDashMemories):
     memFunLevel()            'off' | 'subtle' | 'full': agent game's "Fun level" when its API is there
                              (gameFun(), window.OpenDashGame.fun(), uiPrefGet('funLevel')),
                              else 'subtle'
     homeSceneMood()          THE single mood input for scenes: {key: 'quiet'|'calm'|'lively'|'buzzing',
                              busy 0..1, done, usual, streak, fireworks, label, fun}
     memDay(iso)              {iso, done:[{id, title, stream, ts, people}], people:[[id, n]], streams:[[id, n]], place, journal}
     memOnThisDay(today)      [{kind: 'year'|'month'|'week', iso, day}] the days worth showing
     memYearStats(year)       Wrapped's numbers (see the function)
     memWeekReport()          this week against your own average (Home's report card)
     memFunFacts()            [{id, icon, text}] about your own data; memFunFactToday()
     memMilestones()          [{n, iso, ts, title}] the 1st, 10th, 50th, 100th... task finished
     memBirthdaysSoon(days)   [{person, iso, inDays, turning}]; memFriendship(personId)
     memPostcards()           newest first; memPostcardAlbumEl({limit, compact}) (93-memories-ui.js)
     memCapsulesDue()         sealed capsules whose day has come
   Stats read agent game's gameStats() when it is there (level, xp, badges for Wrapped) and agent
   locations' locationsFacts() (places, countries); without them they come from the completion log,
   the trips (TravelStore) and the journal.
   ============================================================ */

const MEM_VERSION = 1;
const MEM_MILESTONE_STEPS = [1, 10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000];

/* ---------- the state ---------- */
/** state.memories, made whole (never null). */
function memState() {
  let m = state.memories;
  if (!m || typeof m !== 'object' || Array.isArray(m)) m = state.memories = {};
  if (m.v !== MEM_VERSION) m.v = MEM_VERSION;
  if (!m.journal || typeof m.journal !== 'object' || Array.isArray(m.journal)) m.journal = {};
  if (!Array.isArray(m.capsules)) m.capsules = [];
  if (!m.postcards || typeof m.postcards !== 'object' || Array.isArray(m.postcards)) m.postcards = {};
  if (!m.goals || typeof m.goals !== 'object' || Array.isArray(m.goals)) m.goals = {};
  if (!m.advent || typeof m.advent !== 'object' || Array.isArray(m.advent)) m.advent = {};
  return m;
}
/** Save a memories change: data (backed up, synced), no undo step (01-core-state.js _NO_UNDO_KEYS). */
function memSave() { _memIx = null; _memMemo.clear(); saveData(); }
function _memId(p) { return (p || 'm') + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }

/* ---------- dates ---------- */
function _memAdd(iso, n) { return Clock.addDays(iso, n); }
function _memDate(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }   // clock-ok: a wall date
function _memDow(iso) { return _memDate(iso).getDay(); }
function _memNum(iso) { const [y, m, d] = String(iso).split('-').map(Number); return Math.round(Date.UTC(y, (m || 1) - 1, d || 1) / 864e5); }
function _memBetween(a, b) { return _memNum(b) - _memNum(a); }
function _memFmt(iso, opts) {
  try { return new Intl.DateTimeFormat(APP_CONFIG.locale || undefined, opts || { weekday: 'short', day: 'numeric', month: 'short' }).format(_memDate(iso)); }
  catch (e) { return iso; }
}
function _memFmtLong(iso) { return _memFmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); }
function _memWeekday(iso) { return _memFmt(iso, { weekday: 'long' }); }
function _memTime(ts) { try { return Clock.fmtTime(ts); } catch (e) { const p = Clock.parts(ts); return String(p.h).padStart(2, '0') + ':' + String(p.mi).padStart(2, '0'); } }
function _memHourLabel(h) {
  const h12 = (APP_CONFIG.locale || '').startsWith('en-US') || (APP_CONFIG.time && APP_CONFIG.time.h12);
  if (!h12 && !(APP_CONFIG.locale || '').startsWith('en-GB') && !(APP_CONFIG.locale || '').startsWith('en')) return String(h).padStart(2, '0') + ':00';
  return h === 0 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? h + ' am' : (h - 12) + ' pm';
}
/** The same day a year / a month ago (31 Mar a month ago = 28/29 Feb's last day, 29 Feb a year ago = 28 Feb). */
function _memMonthsAgo(iso, k) {
  const [y, m, d] = iso.split('-').map(Number);
  let yy = y, mm = m - k;
  while (mm < 1) { mm += 12; yy--; }
  const last = new Date(yy, mm, 0).getDate();   // clock-ok: days in a month
  return `${String(yy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}
function _memWeekStartIdx() { return ({ Mon: 1, Sun: 0, Sat: 6 })[APP_CONFIG.weekStart || 'Mon'] ?? 1; }
function _memWeekOf(iso) { const back = (_memDow(iso) - _memWeekStartIdx() + 7) % 7; return _memAdd(iso, -back); }
function _memHash(s) { s = String(s); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function _memPick(arr, seed) { return arr.length ? arr[_memHash(seed) % arr.length] : ''; }
function _memPlural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }
function _memList(names) {
  const a = names.filter(Boolean);
  if (a.length <= 1) return a[0] || '';
  return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
}
function _memMotionOn() { return typeof animEnabled === 'function' ? animEnabled() : !(window.Motion && Motion.prefersReduced && Motion.prefersReduced()); }

/* ---------- fun level (agent game) ---------- */
function _memFunNorm(v) {
  v = String(v == null ? '' : v).toLowerCase();
  return v === 'off' || v === 'none' || v === '0' ? 'off' : v === 'full' || v === 'max' || v === 'high' || v === '2' ? 'full' : v === 'subtle' || v === 'low' || v === 'on' || v === '1' ? 'subtle' : '';
}
function memFunLevel() {
  const G = typeof window !== 'undefined' ? (window.OpenDashGame || null) : null;
  const tries = [
    () => (typeof gameFun === 'function' ? gameFun() : ''),
    () => (G && typeof G.fun === 'function' ? G.fun() : ''),
    () => (typeof uiPrefGet === 'function' ? uiPrefGet('funLevel') : ''),
    () => (typeof uiPrefGet === 'function' ? (uiPrefGet('game') || {}).funLevel : ''),
  ];
  for (const f of tries) { try { const v = _memFunNorm(f()); if (v) return v; } catch (e) { /* next */ } }
  return 'subtle';
}
/** Agent game's numbers for Wrapped, when its API is there: {level, title, xp (the year's), xpTotal, focusMin, bosses}, else null. */
function memGameStats(year) {
  try {
    const G = typeof window !== 'undefined' ? window.OpenDashGame : null;
    const s = typeof gameStats === 'function' ? gameStats() : G && typeof G.stats === 'function' ? G.stats() : null;
    if (!s) return null;
    const lv = s.level && typeof s.level === 'object' ? s.level : { level: s.level };
    const out = { level: Number(lv.level) || 0, title: lv.title || '', xpTotal: s.xp && typeof s.xp === 'object' ? Number(s.xp.total) || 0 : Number(s.xp) || 0, xp: 0, focusMin: 0, bosses: 0 };
    if (year) {
      const from = year + '-01-01', to = year + '-12-31' < todayStr() ? year + '-12-31' : todayStr();
      const days = typeof gameDailyXp === 'function' ? gameDailyXp(from, to) : G && typeof G.dailyXp === 'function' ? G.dailyXp(from, to) : [];
      for (const d of days || []) { out.xp += Number(d.xp) || 0; out.focusMin += Number(d.focusMin) || 0; }
      out.bosses = s.bosses && Array.isArray(s.bosses.defeated) ? s.bosses.defeated.filter(b => String(b.d || '').slice(0, 4) === String(year)).length : 0;
    } else out.xp = out.xpTotal;
    return out;
  } catch (e) { return null; }
}
/** XP from agent game for a moment (a journal line, the garden, Wrapped); nothing when the game is not there. */
function memAward(kind, o) {
  try { if (typeof gameAward === 'function') return gameAward(Object.assign({ kind }, o || {})); } catch (e) { /* the game is optional */ }
  return null;
}
/** Agent locations' facts, when its API is there, else null. */
function memLocationsFacts() {
  try { if (typeof locationsFacts === 'function') return locationsFacts() || null; } catch (e) { /* not there */ }
  return null;
}

/* ---------- the completion index (memoised per save and day) ---------- */
let _memIx = null;
const _memMemo = new Map();
/** A memo that lives until the next save or the next day. */
function _memCached(key, fn) {
  const sig = [state._lastSave || 0, state._saveCount || 0, todayStr()].join('|');
  const hit = _memMemo.get(key);
  if (hit && hit.sig === sig) return hit.v;
  const v = fn();
  if (_memMemo.size > 80) _memMemo.clear();
  _memMemo.set(key, { sig, v });
  return v;
}
function memIndex() {
  const key = [state._lastSave || 0, state._saveCount || 0, todayStr(), (state.custom || []).length].join('|');
  if (_memIx && _memIx.key === key) return _memIx;
  const tasks = new Map();
  for (const t of (state.bin && Array.isArray(state.bin.tasks) ? state.bin.tasks : [])) if (t && t.id) tasks.set(t.id, t);
  for (const t of (Array.isArray(state.custom) ? state.custom : [])) if (t && t.id) tasks.set(t.id, t);
  const days = new Map(), all = [];
  for (const [id, arr] of Object.entries(state.completionLog || {})) {
    if (!Array.isArray(arr)) continue;
    for (const raw of arr) {
      const ts = Number(raw);
      if (!Number.isFinite(ts) || ts <= 0) continue;
      const p = Clock.parts(ts);
      const c = { id, ts, iso: p.iso, h: p.h, dow: p.dow };
      all.push(c);
      let d = days.get(p.iso); if (!d) days.set(p.iso, d = []);
      d.push(c);
    }
  }
  all.sort((a, b) => a.ts - b.ts);
  for (const d of days.values()) d.sort((a, b) => a.ts - b.ts);
  _memIx = { key, tasks, days, all };
  return _memIx;
}
function memSelfIds() { return new Set((state.people || []).filter(p => p && (p.self || p.isSelf)).map(p => p.id)); }
/** {title, stream, people (ids, not you), prio} of a task id (the Bin too). */
function memTaskInfo(id) {
  const ix = memIndex();
  if (!ix.info) { ix.info = new Map(); ix.self = memSelfIds(); }
  const hit = ix.info.get(id);
  if (hit) return hit;
  const t = ix.tasks.get(id);
  let out;
  if (!t) out = { title: 'A task', stream: '', people: [], prio: 'p0', gone: true };
  else {
    let people = [];
    try { people = typeof effPeople === 'function' ? effPeople(t) : (Array.isArray(t.people) ? t.people : []); } catch (e) { people = []; }
    out = { title: String(t.title || 'A task'), stream: t.stream || '', people: people.filter(p => !ix.self.has(p) && typeof getPerson === 'function' && getPerson(p)), prio: t.priority || 'p0', createdAt: t.createdAt || 0 };
  }
  ix.info.set(id, out);
  return out;
}
function memDayCount(iso) { const d = memIndex().days.get(iso); return d ? d.length : 0; }
/** Consecutive days with a completion, ending today (or yesterday while today is still empty). */
function memStreak() {
  const ix = memIndex();
  let d = todayStr(), n = 0;
  if (!ix.days.has(d)) d = _memAdd(d, -1);
  while (ix.days.has(d) && n < 3700) { n++; d = _memAdd(d, -1); }
  return n;
}
/** The longest run of days with a completion between from and to: {days, from, to}. */
function memLongestStreak(from, to) {
  const ix = memIndex();
  const isos = [...ix.days.keys()].filter(d => (!from || d >= from) && (!to || d <= to)).sort();
  let best = { days: 0, from: '', to: '' }, run = 0, start = '', prev = '';
  for (const d of isos) {
    if (prev && _memAdd(prev, 1) === d) run++; else { run = 1; start = d; }
    if (run > best.days) best = { days: run, from: start, to: d };
    prev = d;
  }
  return best;
}
function _memPersonName(id, first) {
  const p = typeof getPerson === 'function' ? getPerson(id) : null;
  if (!p) return '';
  return first && typeof _pplFirst === 'function' ? _pplFirst(p) : p.name;
}
function _memStreamLabel(id) { return (typeof STREAMS !== 'undefined' && STREAMS[id] && STREAMS[id].label) || ''; }

/* ---------- one day ---------- */
/** Events of a day with the people in them ([] when the calendar does not have that day). */
function _memEventsOn(iso) {
  try { return typeof homeCalEvents === 'function' ? homeCalEvents(iso).filter(e => !e.bg) : []; } catch (e) { return []; }
}
/** Where you were on a day: agent locations, a trip, the journal (the place written down that evening), or ''. */
function memPlaceOn(iso) {
  try {
    // agent locations' permanent log: where you were at lunchtime that day
    const L = typeof window !== 'undefined' ? window.Locations : null;
    if (L && typeof L.where === 'function' && (typeof L.on !== 'function' || L.on())) {
      const seg = L.where(Clock.at(iso, 13 * 60));
      const name = seg && (seg.city || seg.place || seg.country);
      if (name && !(seg.via === 'zone' && !seg.city)) return { name: String(name), cc: seg.cc || '', trip: seg.src === 'trip', source: 'locations' };
    }
  } catch (e) { /* their API changed: fall through */ }
  try {
    if (typeof TravelStore !== 'undefined' && TravelStore.on()) {
      const t = TravelStore.trips().find(t => t && !t.candidate && t.from && t.from <= iso && (t.to || t.from) >= iso);
      if (t && (t.label || (t.dest && (t.dest.label || t.dest.name)))) return { name: String(t.label || t.dest.label || t.dest.name), cc: (t.dest && t.dest.cc) || '', trip: true, source: 'trip' };
    }
  } catch (e) { /* travel off */ }
  const j = memState().journal[iso];
  if (j && j.facts && j.facts.place) return { name: String(j.facts.place), cc: j.facts.cc || '', source: 'journal' };
  return null;
}
/** Where you are today (for tonight's journal): a trip, else your home place in Settings. */
function _memPlaceToday() {
  const p = memPlaceOn(todayStr());
  if (p) return p;
  const loc = APP_CONFIG.location && typeof APP_CONFIG.location === 'object' ? APP_CONFIG.location : null;
  return loc && loc.name ? { name: String(loc.name).split(',')[0], cc: loc.countryCode || '', home: true, source: 'home' } : null;
}
function memDay(iso) {
  return _memCached('day:' + iso, () => {
    const list = memIndex().days.get(iso) || [];
    const done = list.map(c => Object.assign({ ts: c.ts, id: c.id, h: c.h }, memTaskInfo(c.id)));
    const pc = new Map(), sc = new Map();
    for (const t of done) {
      for (const p of t.people) pc.set(p, (pc.get(p) || 0) + 1);
      if (t.stream) sc.set(t.stream, (sc.get(t.stream) || 0) + 1);
    }
    const events = _memEventsOn(iso);
    const self = memSelfIds();
    let meetings = 0;
    for (const e of events) {
      const ppl = (e.people || []).filter(p => !self.has(p));
      if (ppl.length && !e.allDay) meetings++;
      for (const p of ppl) pc.set(p, (pc.get(p) || 0) + 1);
    }
    const sortE = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
    return { iso, done, people: sortE(pc), streams: sortE(sc), meetings, events: events.length, place: memPlaceOn(iso), journal: memState().journal[iso] || null };
  });
}
/** The days worth looking back on from `today`: a year ago, a month ago (and a week ago when neither has anything). */
function memOnThisDay(today) {
  today = today || todayStr();
  const out = [];
  const has = (d) => d.done.length || (d.journal && (d.journal.line || d.journal.text)) || d.place;
  const y = _memMonthsAgo(today, 12), m = _memMonthsAgo(today, 1), w = _memAdd(today, -7);
  const dy = memDay(y); if (has(dy)) out.push({ kind: 'year', label: 'A year ago', iso: y, day: dy });
  const dm = memDay(m); if (has(dm)) out.push({ kind: 'month', label: 'A month ago', iso: m, day: dm });
  if (!out.length) { const dw = memDay(w); if (dw.done.length >= 2 || (dw.journal && dw.journal.line)) out.push({ kind: 'week', label: 'A week ago', iso: w, day: dw }); }
  return out;
}
/** A random day from your past worth rediscovering (at least 30 days ago, with 2+ things done or a journal line). */
function memRediscover(seed) {
  const ix = memIndex(), cut = _memAdd(todayStr(), -30);
  const cands = [...ix.days.keys()].filter(d => d < cut && (ix.days.get(d).length >= 2 || (memState().journal[d] || {}).line));
  for (const d of Object.keys(memState().journal)) if (d < cut && memState().journal[d].line && !cands.includes(d)) cands.push(d);
  if (!cands.length) return '';
  cands.sort();
  return cands[_memHash(String(seed == null ? Date.now() : seed)) % cands.length];   // clock-ok: only a seed
}

/* ---------- mood: THE single input for the living Home scene ---------- */
function homeSceneMood() {
  return _memCached('mood:' + Clock.parts(Clock.now()).h, () => {
    const fun = memFunLevel();
    const ix = memIndex(), today = todayStr();
    const done = memDayCount(today);
    let sum = 0, act = 0;
    for (let k = 1; k <= 28; k++) { const n = memDayCount(_memAdd(today, -k)); if (n) { sum += n; act++; } }
    const usual = act ? sum / act : 2;
    const streak = memStreak();
    const now = Clock.parts(Clock.now()), dow = now.dow, weekend = dow === 0 || dow === 6;
    let key = 'calm';
    if (done >= Math.max(6, usual * 1.8)) key = 'buzzing';
    else if (done >= Math.max(3, usual * 1.1)) key = 'lively';
    else if (done <= 1 && weekend) key = 'quiet';
    else if (!done && now.h >= 14) key = 'quiet';
    const busy = Math.max(0, Math.min(1, done / Math.max(4, usual * 2)));
    const special = [7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500].includes(streak) || (streak >= 30 && streak % 30 === 0);
    const fireworks = fun !== 'off' && streak >= 7 && (fun === 'full' || special);
    const wd = _memWeekday(today);
    const label = key === 'buzzing' ? `Buzzing: ${done} done today` : key === 'lively' ? `A lively ${wd}: ${done} done` : key === 'quiet' ? (dow === 0 ? 'A lazy Sunday' : `A quiet ${wd}`) : done ? `A calm ${wd}: ${done} done` : `A calm ${wd}`;
    void ix;
    return { key, busy: Math.round(busy * 100) / 100, done, usual: Math.round(usual * 10) / 10, streak, fireworks, special, fun, label };
  });
}

/* ---------- people: birthdays and friendship ---------- */
const _MEM_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
/** '14 March', 'March 14', '14/03', '14/03/1990', '1990-03-14', '03-14' -> {ok, value: 'MM-DD' | 'YYYY-MM-DD'} ('' clears it). */
function memBirthdayCheck(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (!s) return { ok: true, value: '' };
  let y = 0, m = 0, d = 0, r;
  const us = (APP_CONFIG.locale || '').startsWith('en-US');
  if ((r = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) { y = +r[1]; m = +r[2]; d = +r[3]; }
  else if ((r = /^-{0,2}(\d{1,2})-(\d{1,2})$/.exec(s))) { m = +r[1]; d = +r[2]; }
  else if ((r = /^(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?$/.exec(s))) { d = +r[us ? 2 : 1]; m = +r[us ? 1 : 2]; y = r[3] ? +r[3] : 0; if (y && y < 100) y += y > 30 ? 1900 : 2000; }
  else if ((r = /^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,})\.?(?:,?\s+(\d{4}))?$/.exec(s))) { d = +r[1]; m = _MEM_MONTHS.indexOf(r[2].slice(0, 3)) + 1; y = r[3] ? +r[3] : 0; }
  else if ((r = /^([a-z]{3,})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?$/.exec(s))) { m = _MEM_MONTHS.indexOf(r[1].slice(0, 3)) + 1; d = +r[2]; y = r[3] ? +r[3] : 0; }
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1] || 0;
  if (!m || !d || d > max || (y && (y < 1900 || y > 2100))) return { ok: false, message: 'Birthday: write it like "14 March" or "1990-03-14".' };
  const md = String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  return { ok: true, value: y ? y + '-' + md : md };
}
/** The next birthday on or after `from`: {iso, inDays, turning (or 0)} or null. */
function memNextBirthday(p, from) {
  const b = p && typeof p.birthday === 'string' ? p.birthday : '';
  const r = /^(?:(\d{4})-)?(\d{2})-(\d{2})$/.exec(b);
  if (!r) return null;
  from = from || todayStr();
  const fy = +from.slice(0, 4);
  for (const yy of [fy, fy + 1]) {
    let mo = +r[2], dd = +r[3];
    if (mo === 2 && dd === 29 && new Date(yy, 2, 0).getDate() !== 29) dd = 28;   // clock-ok: a leap-year check
    const iso = `${yy}-${String(mo).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    if (iso >= from) return { iso, inDays: _memBetween(from, iso), turning: r[1] ? yy - +r[1] : 0 };
  }
  return null;
}
function memBirthdaysSoon(days) {
  const today = todayStr(), out = [];
  for (const p of (state.people || [])) {
    if (!p || p.self || p.isSelf || !p.birthday) continue;
    const n = memNextBirthday(p, today);
    if (n && n.inDays <= (days == null ? 14 : days)) out.push(Object.assign({ person: p }, n));
  }
  return out.sort((a, b) => a.inDays - b.inDays || String(a.person.name).localeCompare(String(b.person.name)));
}
/** Every day you were in touch with each person: finished tasks linked to them, their notes, past meetings with them. Map id -> Set(iso). */
function memTouches() {
  return _memCached('touches', () => {
    const out = new Map(), add = (id, iso) => { if (!id || !iso) return; let s = out.get(id); if (!s) out.set(id, s = new Set()); s.add(iso); };
    const self = memSelfIds();
    for (const c of memIndex().all) for (const p of memTaskInfo(c.id).people) if (!self.has(p)) add(p, c.iso);
    for (const p of (state.people || [])) for (const n of (p && Array.isArray(p.notes) ? p.notes : [])) if (n && n.ts) { const t = typeof n.ts === 'number' ? n.ts : Date.parse(n.ts); if (Number.isFinite(t)) add(p.id, Clock.parts(t).iso); }
    try {
      const evs = typeof CalStore !== 'undefined' && CalStore.data && Array.isArray(CalStore.data.events) ? CalStore.data.events : [];
      const ix = typeof homeMeetIndex === 'function' ? homeMeetIndex() : null, now = Date.now();   // clock-ok: past events only
      if (ix && typeof homeEventPeople === 'function') for (const ev of evs) {
        if (!ev || !ev.start || ev.allDay) continue;
        const st = calEventStart(ev).getTime();
        if (!Number.isFinite(st) || st > now) continue;
        for (const p of homeEventPeople(ev, ix)) if (!self.has(p)) add(p, Clock.parts(st).iso);
      }
    } catch (e) { /* no calendar */ }
    return out;
  });
}
/** {lastIso, daysAgo, weeks (weeks in a row with contact, up to this or last week), total (days), sinceIso} for a person, or null. */
function memFriendship(pid) {
  const days = memTouches().get(pid);
  let lastIso = days && days.size ? [...days].sort().pop() : '';
  try {
    const lc = typeof peopleLastContact === 'function' ? peopleLastContact() : null;
    const l = lc && lc.get ? lc.get(pid) : null;
    const li = l && (l.iso || l.date);
    if (li && /^\d{4}-\d{2}-\d{2}/.test(li) && li.slice(0, 10) > lastIso) lastIso = li.slice(0, 10);
  } catch (e) { /* email index not ready */ }
  if (!lastIso) return null;
  const today = todayStr();
  const weeks = new Set([...(days || [])].map(_memWeekOf));
  let w = _memWeekOf(today), n = 0;
  if (!weeks.has(w)) w = _memAdd(w, -7);
  while (weeks.has(w) && n < 520) { n++; w = _memAdd(w, -7); }
  const sorted = [...(days || [])].sort();
  return { lastIso, daysAgo: Math.max(0, _memBetween(lastIso, today)), weeks: n, total: days ? days.size : 0, sinceIso: sorted[0] || lastIso };
}
/** People ranked by days in touch between from and to: [{id, n}]. */
function memTopPeople(from, to, max) {
  const out = [];
  for (const [id, set] of memTouches()) {
    let n = 0; for (const d of set) if (d >= from && d <= to) n++;
    if (n && typeof getPerson === 'function' && getPerson(id)) out.push({ id, n });
  }
  return out.sort((a, b) => b.n - a.n).slice(0, max || 5);
}

/* ---------- milestones ---------- */
function memMilestones() {
  return _memCached('milestones', () => {
    const all = memIndex().all, out = [];
    for (const n of MEM_MILESTONE_STEPS) { const c = all[n - 1]; if (!c) break; out.push({ n, iso: c.iso, ts: c.ts, id: c.id, title: memTaskInfo(c.id).title }); }
    return out;
  });
}

/* ---------- counts over a range ---------- */
function _memRange(from, to) {
  const ix = memIndex(), out = [];
  for (const c of ix.all) if (c.iso >= from && c.iso <= to) out.push(c);
  return out;
}
function _memTopStreams(list, max) {
  const m = new Map();
  for (const c of list) { const s = memTaskInfo(c.id).stream; if (s) m.set(s, (m.get(s) || 0) + 1); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, max || 5).map(([id, n]) => ({ id, n, label: _memStreamLabel(id) || id, color: (STREAMS[id] && STREAMS[id].color) || '' }));
}

/* ---------- the year (Wrapped) ---------- */
/**
 * Wrapped's numbers for a year (the year so far for the current one): {year, from, to, total, perWeek,
 * activeDays, busiest: {iso, n, titles}, busiestMonth: {m, n}, streams: [{id, n, label, color}],
 * people: [{id, n}], places: [{name, cc, days}], streak: {days, from, to}, perDay: Map, facts,
 * journalLines, favouriteLine, milestones, game, postcards, firstIso, weekday: {dow, n}, hour}
 */
function memYearStats(year) {
  year = +year || +todayStr().slice(0, 4);
  return _memCached('year:' + year, () => {
    const from = year + '-01-01', last = year + '-12-31', today = todayStr();
    const to = last < today ? last : today;
    const list = _memRange(from, to);
    const perDay = new Map();
    for (const c of list) perDay.set(c.iso, (perDay.get(c.iso) || 0) + 1);
    let busiest = { iso: '', n: 0 };
    for (const [iso, n] of perDay) if (n > busiest.n) busiest = { iso, n };
    busiest.titles = busiest.iso ? (memIndex().days.get(busiest.iso) || []).map(c => memTaskInfo(c.id).title).slice(0, 4) : [];
    const months = new Array(12).fill(0), dows = new Array(7).fill(0), hours = new Array(24).fill(0);
    for (const c of list) { months[+c.iso.slice(5, 7) - 1]++; dows[c.dow]++; hours[c.h]++; }
    const bm = months.indexOf(Math.max(...months)), bd = dows.indexOf(Math.max(...dows)), bh = hours.indexOf(Math.max(...hours));
    const weeks = Math.max(1, (_memBetween(from, to) + 1) / 7);
    // places: agent locations, else trips that started this year, else the journal's places
    let places = [];
    const f = memLocationsFacts();
    try {
      // agent locations' cities: {city, cc, days (a Set of ISO days)}
      for (const c of (f && Array.isArray(f.cities) ? f.cities : [])) {
        if (!c || !c.city) continue;
        let n = 0;
        if (c.days instanceof Set) for (const d of c.days) if (String(d).slice(0, 4) === String(year)) n++;
        if (n) places.push({ name: String(c.city), cc: c.cc || '', days: n });
      }
      places = places.sort((a, b) => b.days - a.days).slice(0, 5);
    } catch (e) { places = []; }
    if (!places.length) {
      const m = new Map();
      try {
        if (typeof TravelStore !== 'undefined' && TravelStore.on()) for (const t of TravelStore.trips()) {
          if (!t || t.candidate || !t.from || t.from > to || (t.to || t.from) < from) continue;
          const name = t.label || (t.dest && (t.dest.label || t.dest.name)); if (!name) continue;
          const a = t.from < from ? from : t.from, b = (t.to || t.from) > to ? to : (t.to || t.from);
          const e = m.get(name) || { name, cc: (t.dest && t.dest.cc) || '', days: 0 }; e.days += _memBetween(a, b) + 1; m.set(name, e);
        }
      } catch (e) { /* travel off */ }
      // the journal's places (written each evening), for the days no trip covers
      for (const p of m.values()) p.trip = true;
      for (const [iso, j] of Object.entries(memState().journal)) {
        if (iso < from || iso > to || !j || !j.facts || !j.facts.place || (j.facts.trip && m.has(j.facts.place))) continue;
        const e = m.get(j.facts.place) || { name: j.facts.place, cc: j.facts.cc || '', days: 0 };
        e.days++; m.set(j.facts.place, e);
      }
      places = [...m.values()].map(p => ({ name: p.name, cc: p.cc, days: p.days, trip: !!p.trip })).sort((a, b) => b.days - a.days).slice(0, 5);
    }
    const jl = Object.entries(memState().journal).filter(([iso, j]) => iso >= from && iso <= to && j && j.line);
    const fav = jl.length ? jl.sort((a, b) => (b[1].mood || 0) - (a[1].mood || 0) || String(b[1].line).length - String(a[1].line).length)[0] : null;
    return {
      year, from, to, partial: to < last, total: list.length, perWeek: Math.round(list.length / weeks * 10) / 10, activeDays: perDay.size,
      busiest, busiestMonth: { m: bm, n: months[bm] || 0 }, weekday: { dow: bd, n: dows[bd] || 0 }, hour: { h: bh, n: hours[bh] || 0 }, months,
      streams: _memTopStreams(list, 5), people: memTopPeople(from, to, 5), places, streak: memLongestStreak(from, to), perDay,
      journalLines: jl.length, favouriteLine: fav ? { iso: fav[0], line: fav[1].line } : null,
      milestones: memMilestones().filter(m => m.iso >= from && m.iso <= to),
      postcards: memPostcards().filter(p => p.from >= from && p.from <= to),
      game: memGameStats(year), firstIso: list.length ? list[0].iso : '',
      goals: (memState().goals[String(year)] || {}).list || [],
    };
  });
}

/* ---------- the week (Home's report card) ---------- */
/**
 * This week so far against your own average for the same days of your last 8 weeks:
 * {from, to, days (days so far), done, avgDone, active, avgActive, bestDay: {iso, n}, streams, people, streak, verdict, ratio}
 */
function memWeekReport() {
  return _memCached('week', () => {
    const today = todayStr(), from = _memWeekOf(today), days = _memBetween(from, today) + 1;
    const sumWeek = (start) => {
      let done = 0, active = 0;
      for (let k = 0; k < days; k++) { const n = memDayCount(_memAdd(start, k)); done += n; if (n) active++; }
      return { done, active };
    };
    const cur = sumWeek(from);
    const firstIso = memIndex().all.length ? memIndex().all[0].iso : today;
    const past = [];
    for (let w = 1; w <= 8; w++) { const s = _memAdd(from, -7 * w); if (_memAdd(s, 6) < firstIso) break; past.push(sumWeek(s)); }
    const avg = (k) => past.length ? past.reduce((n, x) => n + x[k], 0) / past.length : 0;
    const avgDone = avg('done'), avgActive = avg('active');
    let bestDay = { iso: '', n: 0 };
    for (let k = 0; k < days; k++) { const iso = _memAdd(from, k), n = memDayCount(iso); if (n > bestDay.n) bestDay = { iso, n }; }
    const list = _memRange(from, today);
    const ratio = avgDone ? cur.done / avgDone : (cur.done ? 2 : 1);
    const verdict = !past.length ? 'new' : ratio >= 1.4 ? 'stellar' : ratio >= 1.05 ? 'ahead' : ratio >= 0.85 ? 'steady' : 'gentle';
    return {
      from, to: _memAdd(from, 6), days, done: cur.done, active: cur.active, avgDone: Math.round(avgDone * 10) / 10, avgActive: Math.round(avgActive * 10) / 10,
      weeks: past.length, bestDay, streams: _memTopStreams(list, 3), people: memTopPeople(from, today, 3), streak: memStreak(), verdict, ratio,
    };
  });
}

/* ---------- fun facts about your own data ---------- */
const _MEM_STOP = new Set(['the', 'and', 'for', 'with', 'from', 'into', 'about', 'this', 'that', 'your', 'our', 'new', 'all', 'one', 'two', 'some', 'more', 'next', 'last']);
function memFunFacts() {
  return _memCached('facts', () => {
    const ix = memIndex(), today = todayStr(), yearAgo = _memAdd(today, -365);
    const list = ix.all.filter(c => c.iso >= yearAgo);
    const out = [];
    if (list.length >= 15) {
      const dows = new Array(7).fill(0), hrs = new Array(24).fill(0);
      for (const c of list) { dows[c.dow]++; hrs[c.h]++; }
      const d = dows.indexOf(Math.max(...dows)), h = hrs.indexOf(Math.max(...hrs));
      const dn = _memFmt('2026-01-' + String(4 + d).padStart(2, '0'), { weekday: 'long' });   // 2026-01-04 is a Sunday
      out.push({ id: 'when', icon: 'clock', text: `You finish most tasks on ${dn}s, around ${_memHourLabel(h)}.` });
      const early = list.filter(c => c.h < 9).length / list.length, late = list.filter(c => c.h >= 21).length / list.length;
      if (early >= 0.18) out.push({ id: 'early', icon: 'sunrise', text: `Early bird: ${Math.round(early * 100)}% of your tasks are done before 9 am.` });
      if (late >= 0.15) out.push({ id: 'late', icon: 'moon', text: `Night owl: ${Math.round(late * 100)}% of your tasks are done after 9 pm.` });
      const wk = (dows[0] + dows[6]) / list.length;
      out.push(wk <= 0.1 ? { id: 'weekend', icon: 'coffee', text: `Only ${Math.round(wk * 100)}% of your tasks get done at weekends. Weekends well guarded.` }
        : { id: 'weekend', icon: 'coffee', text: `${Math.round(wk * 100)}% of your tasks get done at weekends.` });
    }
    let best = { iso: '', n: 0 };
    for (const [iso, arr] of ix.days) if (arr.length > best.n) best = { iso, n: arr.length };
    if (best.n >= 4) out.push({ id: 'record', icon: 'trophy', text: `Your record day: ${best.n} tasks on ${_memFmt(best.iso, { day: 'numeric', month: 'long', year: 'numeric' })}.` });
    const ls = memLongestStreak();
    if (ls.days >= 3) out.push({ id: 'streak', icon: 'flame', text: `Your longest streak: ${ls.days} days in a row, ending ${_memFmt(ls.to, { day: 'numeric', month: 'short', year: 'numeric' })}.` });
    const words = new Map();
    for (const c of list) {
      const w = String(memTaskInfo(c.id).title).trim().split(/\s+/)[0] || '';
      const k = w.toLowerCase().replace(/[^\p{L}]/gu, '');
      if (k.length >= 3 && !_MEM_STOP.has(k)) { const e = words.get(k) || { w: w.replace(/[^\p{L}]/gu, ''), n: 0 }; e.n++; words.set(k, e); }
    }
    const top = [...words.values()].sort((a, b) => b.n - a.n)[0];
    if (top && top.n >= 5) out.push({ id: 'verb', icon: 'pencil', text: `Your favourite first word in a task: “${top.w.charAt(0).toUpperCase() + top.w.slice(1)}” (${top.n} times this year).` });
    const lags = [];
    for (const c of list) { const t = ix.tasks.get(c.id); if (t && t.createdAt && (!t.recurrence || t.recurrence === 'none') && c.ts > t.createdAt) lags.push((c.ts - t.createdAt) / 864e5); }
    if (lags.length >= 10) {
      lags.sort((a, b) => a - b);
      const med = lags[Math.floor(lags.length / 2)];
      out.push({ id: 'lag', icon: 'hourglass', text: med < 1 ? 'Half of your tasks are done within a day of adding them.' : `You usually finish a task about ${Math.round(med)} day${Math.round(med) === 1 ? '' : 's'} after adding it.` });
    }
    const ms = _memRange(today.slice(0, 8) + '01', today), st = _memTopStreams(ms, 1)[0];
    if (st && st.n >= 5) out.push({ id: 'stream', icon: 'layers', text: `This month belongs to ${st.label}: ${st.n} tasks so far.` });
    const tp = memTopPeople(yearAgo, today, 1)[0];
    if (tp && tp.n >= 3) out.push({ id: 'person', icon: 'users', text: `You were in touch with ${_memPersonName(tp.id)} on ${tp.n} days this year, more than anyone else.` });
    if (list.length >= 20) out.push({ id: 'pace', icon: 'trending-up', text: `${list.length} tasks in the last 12 months: about ${Math.round(list.length / 52 * 10) / 10} a week.` });
    const mils = memMilestones(); const lm = mils[mils.length - 1];
    if (lm && lm.n >= 10) out.push({ id: 'milestone', icon: 'award', text: `Task number ${lm.n} was “${lm.title}”, on ${_memFmt(lm.iso, { day: 'numeric', month: 'short', year: 'numeric' })}.` });
    return out;
  });
}
function memFunFactToday(shift) {
  const f = memFunFacts();
  if (!f.length) return null;
  return f[(_memHash(todayStr() + '|fact') + (shift || 0)) % f.length];
}

/* ---------- postcards ---------- */
function memPostcards() {
  return Object.values(memState().postcards).filter(p => p && p.cc).sort((a, b) => String(b.from).localeCompare(String(a.from)));
}
function _memHomeCc() {
  try {
    const loc = APP_CONFIG.location && APP_CONFIG.location.countryCode;
    if (/^[A-Z]{2}$/.test(loc || '')) return loc;
    if (typeof Clock !== 'undefined' && Clock.away) { const a = Clock.away(); if (a && a.homeCc) return a.homeCc; }
  } catch (e) { /* unknown */ }
  return '';
}
function _memCountryName(cc) { try { return (typeof trCountryLabel === 'function' && trCountryLabel(cc)) || cc; } catch (e) { return cc; } }
/** The scene for a country or city when the library has one: an opening item whose tags name it. */
function memPostcardArt(cc, city) {
  try {
    if (typeof animItems !== 'function') return null;
    const look = typeof animLook === 'function' ? animLook() : null;
    const items = animItems({ look, slot: 'opening' });
    const lc = String(cc || '').toLowerCase(), cname = _memCountryName(cc).toLowerCase(), cid = String(city || '').toLowerCase();
    const has = (it, w) => Array.isArray(it.tags) && it.tags.some(t => String(t).toLowerCase() === w);
    return (cid && (items.find(it => it.city === city && it.worldKind === 'signature') || items.find(it => has(it, cid))))
      || items.find(it => it.full && (has(it, lc) || has(it, cname))) || items.find(it => has(it, lc) || has(it, cname)) || null;
  } catch (e) { return null; }
}
/** New countries become postcards: agent locations' countries, else past trips abroad. Returns how many were added. */
function memPostcardsUpdate() {
  const m = memState(), home = _memHomeCc(), today = todayStr();
  const visits = [];
  const f = memLocationsFacts();
  try {
    // agent locations' countries: {cc, country, first, last (ms), cities (a Set of names), home}
    const day = (v) => (typeof v === 'number' && Number.isFinite(v) ? Clock.parts(v).iso : String(v || '').slice(0, 10));
    for (const c of (f && Array.isArray(f.countries) ? f.countries : [])) {
      if (!c || c.home || !/^[A-Z]{2}$/.test(c.cc || '') || !c.first) continue;
      const cities = c.cities instanceof Set ? [...c.cities] : Array.isArray(c.cities) ? c.cities : [];
      visits.push({ cc: c.cc, from: day(c.first), to: day(c.last || c.first), city: '', name: cities[0] || '' });
    }
  } catch (e) { /* their API changed */ }
  try {
    if (typeof TravelStore !== 'undefined' && TravelStore.on()) for (const t of TravelStore.trips()) {
      if (!t || t.candidate || !t.from || t.from > today || !t.dest || !/^[A-Z]{2}$/.test(t.dest.cc || '')) continue;
      visits.push({ cc: t.dest.cc, from: t.from, to: t.to && t.to < today ? t.to : (t.to ? today : t.from), city: t.dest.cityId || '', name: t.label || t.dest.label || t.dest.name || '', trip: t.id });
      for (const s of (t.stops || [])) if (s && /^[A-Z]{2}$/.test(s.cc || '')) visits.push({ cc: s.cc, from: t.from, to: t.to || t.from, city: s.cityId || '', name: s.label || s.name || '' });
    }
  } catch (e) { /* travel off */ }
  visits.sort((a, b) => a.from.localeCompare(b.from));
  let added = 0;
  for (const v of visits) {
    if (v.cc === home || m.postcards[v.cc]) continue;
    const to = v.to >= v.from ? v.to : v.from;
    const list = _memRange(v.from, to);
    const ppl = new Map();
    for (const c of list) for (const p of memTaskInfo(c.id).people) ppl.set(p, (ppl.get(p) || 0) + 1);
    const art = memPostcardArt(v.cc, v.city);
    m.postcards[v.cc] = {
      cc: v.cc, name: _memCountryName(v.cc), city: String(v.name || '').slice(0, 80), from: v.from, to, days: _memBetween(v.from, to) + 1, done: list.length,
      people: [...ppl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => _memPersonName(id)).filter(Boolean), art: art ? art.ref : '', note: '', at: Date.now(),   // clock-ok: a stamp
    };
    added++;
  }
  return added;
}

/* ---------- time capsules ---------- */
function memCapsules() { return memState().capsules.filter(c => c && c.id && c.opens); }
function memCapsulesDue() { const t = todayStr(); return memCapsules().filter(c => !c.opened && c.opens <= t).sort((a, b) => a.opens.localeCompare(b.opens)); }
function memCapsuleAdd(text, opens) {
  text = String(text || '').trim().slice(0, 4000);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(opens || '') || opens <= todayStr()) return null;
  const c = { id: _memId('cap'), text, created: Date.now(), opens, opened: 0 };   // clock-ok: a stamp
  memState().capsules.push(c);
  memSave();
  return c;
}
function memCapsuleOpen(id) {
  const c = memCapsules().find(x => x.id === id);
  if (!c || c.opened || c.opens > todayStr()) return c || null;
  c.opened = Date.now();   // clock-ok: a stamp
  memSave();
  return c;
}
function memCapsuleDelete(id) {
  const m = memState(), i = m.capsules.findIndex(x => x && x.id === id);
  if (i < 0) return false;
  m.capsules.splice(i, 1);
  memSave();
  return true;
}

/* ---------- seasons: advent and the New Year ritual ---------- */
const MEM_ADVENT = [
  'Send a thank-you message to someone who helped you this year',
  'Clear ten old emails',
  'Take a 15-minute walk without your phone',
  'Write down three things that went well this week',
  'Tidy one folder on your desktop',
  'Ask someone how they are really doing',
  'Finish one small task you keep postponing',
  'Back up your photos',
  'Make a playlist for the winter evenings',
  'Write a kind review for a local place you love',
  'Plan one thing to look forward to in January',
  'Unsubscribe from five newsletters',
  'Drink a glass of water and stretch for five minutes',
  'Call or message an old friend',
  'Write tomorrow’s three most important things tonight',
  'Learn one keyboard shortcut and use it all day',
  'Donate something you no longer need',
  'Read ten pages of a book',
  'Close every browser tab you do not need',
  'Write a note to your future self (a time capsule)',
  'Cook or buy something warming for someone',
  'Look back at what you finished this year',
  'Take an evening fully off',
  'Rest. Tomorrow is a holiday for many: enjoy it',
];
/** What the season offers on Home: {kind: 'advent', year, day} in December 1-24, {kind: 'newyear', year} from 26 Dec to 14 Jan, else null. */
function memSeason(today) {
  today = today || todayStr();
  const y = +today.slice(0, 4), md = today.slice(5);
  if (md >= '12-01' && md <= '12-24') return { kind: 'advent', year: y, day: +today.slice(8, 10) };
  if (md >= '12-26') return { kind: 'newyear', year: y + 1 };
  if (md <= '01-14') return { kind: 'newyear', year: y };
  return null;
}
function memAdventDone(year, day) { return !!(memState().advent[String(year)] || {})[String(day)]; }
function memAdventMark(year, day, on) {
  const m = memState(), y = String(year);
  if (!m.advent[y] || typeof m.advent[y] !== 'object') m.advent[y] = {};
  if (on) m.advent[y][String(day)] = Date.now(); else delete m.advent[y][String(day)];   // clock-ok: a stamp
  memSave();
}
function memGoals(year) { const g = memState().goals[String(year)]; return g && Array.isArray(g.list) ? g.list : []; }
function memGoalsSet(year, texts) {
  const m = memState(), y = String(year), old = memGoals(year);
  const list = texts.map(t => String(t || '').trim().slice(0, 200)).filter(Boolean).slice(0, 7).map((text, i) => {
    const prev = old.find(o => o.text === text) || old[i];
    return { id: prev && prev.text === text ? prev.id : _memId('goal'), text, done: !!(prev && prev.text === text && prev.done) };
  });
  m.goals[y] = { list, at: Date.now() };   // clock-ok: a stamp
  memSave();
}
function memGoalToggle(year, id) {
  const g = memGoals(year).find(x => x.id === id);
  if (!g) return;
  g.done = !g.done;
  memSave();
}

/* ---------- the tick: tonight's journal, postcards, toasts once ---------- */
let _memTickAt = 0, _memBooted = false;
/** Runs after boot and then every few minutes: writes what is due and says so once. */
function memTick(force) {
  if (typeof state === 'undefined' || !state || !Array.isArray(state.custom)) return;
  const now = Date.now();   // clock-ok: a throttle
  if (!force && now - _memTickAt < 4 * 60000) return;
  _memTickAt = now;
  let changed = false;
  try { if (typeof memJournalUpdate === 'function') changed = memJournalUpdate() || changed; } catch (e) { console.error('[memories] journal', e); }
  try { changed = memPostcardsUpdate() > 0 || changed; } catch (e) { console.error('[memories] postcards', e); }
  if (changed) { memSave(); if (/^(home|memories)/.test(String(state.view))) render(); }
  try { _memToasts(); } catch (e) { console.error('[memories] toasts', e); }
  try { if (memFunLevel() !== 'off' && memDayCount(todayStr()) >= 2) memAward('garden', { label: 'Your garden grew', quiet: true }); } catch (e) { /* the game is optional */ }
}
/** A moment of the day (agent game's level, quest, boss, record; agent locations' badges), for tonight's journal. */
function memJournalMoment(text) {
  text = String(text || '').trim().slice(0, 120);
  if (!text) return;
  const m = memState(), today = todayStr();
  const j = m.journal[today] || (m.journal[today] = { at: Date.now() });   // clock-ok: a stamp
  const list = Array.isArray(j.moments) ? j.moments : (j.moments = []);
  if (list.includes(text) || list.length >= 6) return;
  list.push(text);
  memSave();
}
if (typeof document !== 'undefined') {
  document.addEventListener('opendash:game', (e) => {
    const d = (e && e.detail) || {};
    try {
      if (d.kind === 'level' && d.level) memJournalMoment(`You reached level ${d.level}.`);
      else if (d.kind === 'boss') memJournalMoment('You beat a boss task.');
      else if (d.kind === 'quest' && d.label) memJournalMoment(`Quest complete: ${d.label}.`);
      else if (d.kind === 'record') memJournalMoment('A new personal record.');
    } catch (x) { /* never in the way */ }
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('opendash:location-badge', (e) => { const b = (e && e.detail) || {}; try { if (b.title) memJournalMoment(`New badge: ${b.title}.`); } catch (x) { /* never in the way */ } });
}
function _memToasts() {
  if (typeof toast !== 'function' || typeof seenOn !== 'function' || document.hidden) return;
  if (typeof storyIsOpen === 'function' && storyIsOpen()) return;
  const today = todayStr();
  const due = memCapsulesDue();
  if (due.length && !seenOn('memories', 'capsule')) {
    seenMarkOn('memories', 'capsule');
    toast(due.length === 1 ? 'A letter from past you has arrived' : `${due.length} letters from past you have arrived`, { icon: 'mail', timeout: 14000, action: { label: 'Open', run: () => memCapsuleReveal(due[0].id) } });
    return;
  }
  const bd = memBirthdaysSoon(0)[0];
  if (bd && !seenOn('memories', 'bday:' + bd.person.id)) {
    seenMarkOn('memories', 'bday:' + bd.person.id);
    toast(`It's ${bd.person.name}'s birthday today${bd.turning ? ` (${bd.turning})` : ''}`, { icon: 'cake', timeout: 12000, action: { label: 'Open', run: () => (typeof openPerson === 'function' ? openPerson(bd.person.id) : null) } });
    return;
  }
  const ms = memMilestones(), lm = ms[ms.length - 1];
  if (lm && lm.iso === today && lm.n >= 10 && !seenOn('memories', 'ms:' + lm.n)) {
    seenMarkOn('memories', 'ms:' + lm.n);
    toast(`Milestone: task number ${lm.n}! It was “${lm.title}”.`, { icon: 'trophy', timeout: 12000, action: { label: 'Milestones', run: () => setView('memories:milestones') } });
    if (memFunLevel() === 'full' && typeof memBurst === 'function') memBurst();
  }
}
/** Boot (99-boot.js, after the state file loaded): the first tick, then one on the clock's ticker. */
function memoriesBoot() {
  if (_memBooted) return;
  _memBooted = true;
  // agent locations loads its log in the background: places, postcards and Wrapped are worked out again when it arrives
  try { if (window.Locations && typeof window.Locations.onChange === 'function') window.Locations.onChange(() => { _memMemo.clear(); _memTickAt = 0; }); } catch (e) { /* not there */ }
  memTick(true);
  try { if (typeof Clock !== 'undefined' && Clock.onTick) Clock.onTick(() => memTick(false)); } catch (e) { setInterval(() => memTick(false), 5 * 60000); }
}

/* ---------- the API for other agents ---------- */
if (typeof window !== 'undefined') {
  window.OpenDashMemories = Object.freeze({
    version: MEM_VERSION,
    mood: () => homeSceneMood(),
    funLevel: () => memFunLevel(),
    day: (iso) => memDay(iso),
    onThisDay: (iso) => memOnThisDay(iso),
    year: (y) => memYearStats(y),
    week: () => memWeekReport(),
    facts: () => memFunFacts(),
    milestones: () => memMilestones(),
    birthdays: (days) => memBirthdaysSoon(days),
    friendship: (id) => memFriendship(id),
    postcards: () => memPostcards(),
    postcardAlbumEl: (o) => (typeof memPostcardAlbumEl === 'function' ? memPostcardAlbumEl(o) : null),
    openWrapped: (y) => (typeof memWrappedOpen === 'function' ? memWrappedOpen(y) : null),
  });
}
