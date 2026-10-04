/* ============================================================
   SUGGESTIONS ENGINE: the pure rules (owner: Suggestions engine)
   ------------------------------------------------------------
   User request, 3 Oct: suggestions like "free from 14:45, block some time?"
   should DO the thing when clicked, and there should be many of them. And:
   "it's a one click recommendation but it still gives us the option where it
   starts off with the recommendation but still we open it and we can adjust
   etc like normal". So every card has:
     primary  opens the NORMAL editor, PREFILLED (the event card in create
              mode, the task card, the draft editor); the user adjusts, Saves
     quick    a small "✓" that applies the suggestion as it is, at once, with
              Undo (optional: only where an instant version is safe)
   PURE: no DOM, no page globals; Node loads this file and every
   68-suggest-rules-*.js file through lib/suggest-logic.mjs (tests, later the
   server). The page side: 68-suggest-context.js (the snapshot), 68-suggest-
   actions.js (what buttons do), 68-suggest-ui.js (cards, surfaces, settings).

   RULE CONTRACT (a rule file calls this at load; see 68-suggest-rules-s1.js):
     sgRegisterRule({
       id: 'free-slot',             stable: keys, settings, counts use it
       area: 'time',                time | tasks | people | money | health | links | hygiene
       title: 'Block a free stretch',   the name in Settings and in "why"
       description: 'one line for Settings',
       value: 5,                    base value 1-5
       defaultOn: true,
       needs: ['calendar'],         capabilities (ctx.capabilities): calendar (loaded and
                                    fresh), calWrite, inbox, gmailDraft, server, ai; missing ->
                                    the rule does not run (G1/G4: check ctx.capabilities in
                                    run() yourself if you have a fallback)
       hours: 'work',               proactive surfaces only: 'work' | 'any' | 'evening' (G6)
       contextual: false,           true = still runs during a meeting with others (G5)
       surfaces: ['hero', 'home'],  proactive: hero | home | story-morning | story-evening
       inPlace: 'schedule',         widget id(s) that show it as a control; while one is on
                                    the board the proactive copy is skipped, and that
                                    widget's sgForWidget(id) gets it
       cooldown: { notFor: 30 },    days "Not for this one" lasts
       multi: false,                true = several cards of this rule on one surface
       run(ctx, mem, env) { return [card, ...]; },   pure, fast (< 1 ms), may return []
     });
   CARD (what run() returns; sgNormCard fills the rest):
     key 'kind:ids:date' (stable; memory keys on it), title (one fact), text (one
     offer), why [facts, at least one with a number], preview (what the buttons
     do, in words), primary {label, icon?, aria?, action:{type, args}}, quick
     {label, action} (the ✓; optional), secondary [{label, action}] (up to 3 chips),
     menu [{label, icon?, action}] (overflow extras), urgency 0.5-1.5, icon, scene,
     claims ['slot:..', 'task:<id>'] (two cards never claim one), entity
     ('task:<id>', what "Not for this one" mutes), expiresMin (today's minute it
     goes stale), people/stream ids for markers.
   ACTION TYPES (SG_ACTION_TYPES; 68-suggest-actions.js implements each, a test
   checks): the "...Open" ones open an editor prefilled (primary), the others
   apply at once with Undo (quick) or navigate.
   ============================================================ */

const SG_VERSION = 1;
const SG_AREAS = Object.freeze(['time', 'tasks', 'people', 'money', 'health', 'links', 'hygiene', 'travel']);
const SG_AREA_LABEL = Object.freeze({ time: 'Time and calendar', tasks: 'Tasks', people: 'People and email', money: 'Money', health: 'Health and balance', links: 'Files and links', hygiene: 'Housekeeping', travel: 'Travel and time zones' });
const SG_HOURS = Object.freeze(['work', 'any', 'evening']);
const SG_PROACTIVE = Object.freeze(['hero', 'home', 'story-morning', 'story-evening']);
// 'travel': travel features are on and ctx.travel is there (69-travel.js trSnapshot; 68-suggest-rules-travel.js).
const SG_NEEDS = Object.freeze(['calendar', 'calWrite', 'inbox', 'gmailDraft', 'server', 'ai', 'travel']);
const SG_THRESHOLD = Object.freeze({ show: 30, hero: 60 });
const SG_GAP_MIN = 45;           // free stretches shorter than this are not offered
const SG_BLOCK_MAX = 120;        // a block is at most 2 h by default
const SG_BLOCK_MIN = 15;         // less than this left in a gap: it has passed
const SG_MEM_KEEP_DAYS = 60;     // memory entries older than this are pruned
/**
 * Every action a card may name, with its safety class (4.2): instant (own data or own
 * guest-less events, reversible), draft (a Gmail draft, nobody emailed), confirm (someone
 * is notified: a second press), opens (an editor, prefilled: nothing changes until Save),
 * navigate (opens a place).
 */
const SG_ACTION_TYPES = Object.freeze({
  'cal.blockOpen': 'opens',      // the event card in create mode: a focus block for a task (Save -> CalWrite.create + link)
  'cal.createOpen': 'opens',     // the event card in create mode: an own event (prep, travel, lunch...)
  'event.open': 'navigate',      // an existing event's card
  'task.open': 'navigate',       // the task card
  'task.createOpen': 'opens',    // the task card in create mode, prefilled (afterOps: run once it is saved, '$new' = its id)
  'ops.choose': 'opens',         // a list of proposed changes, pre-ticked, a day per row (68-suggest-choose.js); Apply runs the ticked ones
  'gmail.draftOpen': 'opens',    // the draft editor, prefilled (falls back to mailto)
  'cal.block': 'instant',        // CalWrite.create (no guests) + link the task + plan it today
  'cal.blockMany': 'instant',    // up to 3 blocks, one Undo
  'cal.create': 'instant',       // an own event without a task
  'cal.move': 'instant',         // only events the dashboard made, with no guests
  'cal.resize': 'instant',
  'cal.remove': 'instant',
  'cal.rsvp': 'confirm',         // someone is told: second press
  'ops': 'instant',              // the actions layer (allowlisted ops), Undo by token
  'gmail.draft': 'draft',        // a Gmail draft (never sent)
  'nav': 'navigate',             // a view, a story, Connections, quick add
  'store.refresh': 'instant',    // read-only update of the calendar / inbox
  'mailto': 'navigate',          // the mail app (fallback when drafts are not available)
  'suggest.keep': 'instant',     // "Keep suggesting these?" Yes / No
  'time.follow': 'instant',      // the zone the dashboard shows (config.time; travel T7 "Use Tokyo time"), Undo puts it back
  'list.open': 'opens',          // a selectList preview of proposed changes, ticked (travel T4, T10, T11): Apply selected = one batch, Undo
  'trip.forget': 'instant',      // "Not a trip" (travel T14): the decision in state.travel, Undo through saveData
});
/** Ops a suggestion may run through the actions layer (4.1). Never bin, delete, merge, tags. person.update: only `tz` (travel T13). */
const SG_OPS_ALLOW = Object.freeze(['task.plan', 'task.reschedule', 'task.update', 'task.complete', 'task.wont_do', 'task.set_estimate',
  'task.set_priority', 'task.create', 'task.add_note', 'task.relate', 'email.triage', 'event.annotate', 'home.set_focus', 'person.update']);

/* ---------- the registry (hangs off a function declaration, so rule files can register at load) ---------- */
function sgRules() { return sgRules.list || (sgRules.list = []); }
function sgRule(id) { return sgRules().find(r => r.id === id) || null; }
/** Add or replace a rule (same id replaces). Throws on a malformed definition, so a mistake shows at once. */
function sgRegisterRule(def) {
  const bad = sgCheckRule(def);
  if (bad.length) throw new Error('sgRegisterRule(' + (def && def.id) + '): ' + bad.join('; '));
  const r = Object.assign({ value: 3, defaultOn: true, needs: [], hours: 'any', contextual: false, surfaces: [], inPlace: [], cooldown: {}, multi: false, description: '' }, def);
  r.inPlace = [].concat(r.inPlace || []);
  r.cooldown = Object.assign({ notFor: 30 }, r.cooldown || {});
  const list = sgRules();
  const i = list.findIndex(x => x.id === r.id);
  if (i >= 0) list[i] = r; else list.push(r);
  return r;
}
function sgCheckRule(d) {
  const out = [];
  if (!d || typeof d !== 'object') return ['not an object'];
  if (typeof d.id !== 'string' || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(d.id)) out.push('id: lower-case words joined by -');
  if (!SG_AREAS.includes(d.area)) out.push('area: one of ' + SG_AREAS.join(', '));
  if (!d.title || typeof d.title !== 'string') out.push('title');
  if (typeof d.run !== 'function') out.push('run(ctx, mem, env)');
  if (d.hours !== undefined && !SG_HOURS.includes(d.hours)) out.push('hours: work | any | evening');
  if (d.value !== undefined && !(d.value >= 1 && d.value <= 5)) out.push('value 1-5');
  for (const n of d.needs || []) if (!SG_NEEDS.includes(n)) out.push('needs: unknown ' + n);
  for (const s of d.surfaces || []) if (!SG_PROACTIVE.includes(s)) out.push('surfaces: unknown ' + s);
  return out;
}
/** Problems with one card (tests, the builders' harness, and the engine drops bad cards). */
function sgCheckCard(c) {
  const out = [];
  if (!c || typeof c !== 'object') return ['not an object'];
  if (typeof c.key !== 'string' || !/^[a-z][a-z0-9-]*:/.test(c.key)) out.push('key: "kind:ids:date"');
  if (!c.title) out.push('title');
  if (!c.text) out.push('text');
  if (!Array.isArray(c.why) || !c.why.length) out.push('why: at least one fact');
  else if (!c.why.some(w => /\d/.test(String(w)))) out.push('why: at least one fact with a number');
  if (!c.preview) out.push('preview');
  const acts = [c.primary, c.quick, ...(c.secondary || []), ...(c.menu || [])].filter(Boolean);
  if (!c.primary || !c.primary.label || !c.primary.action) out.push('primary {label, action}');
  for (const a of acts) {
    if (!a.action || !Object.prototype.hasOwnProperty.call(SG_ACTION_TYPES, a.action.type)) out.push('action type: ' + (a.action && a.action.type));
    if (a.action && a.action.type === 'ops') {
      for (const op of (a.action.args && a.action.args.ops) || []) if (!SG_OPS_ALLOW.includes(op && op.op)) out.push('op not allowed: ' + (op && op.op));
    }
    if (a.action && a.action.type === 'ops.choose') {          // every row's every choice is allowlisted too
      for (const it of (a.action.args && a.action.args.items) || []) for (const alt of (it && it.alts) || []) for (const op of (alt && alt.ops) || []) if (!SG_OPS_ALLOW.includes(op && op.op)) out.push('op not allowed: ' + (op && op.op));
    }
    if (a.action && a.action.type === 'task.createOpen') {
      for (const op of (a.action.args && a.action.args.afterOps) || []) if (!SG_OPS_ALLOW.includes(op && op.op)) out.push('op not allowed: ' + (op && op.op));
    }
  }
  if (c.quick && c.quick.action && SG_ACTION_TYPES[c.quick.action.type] === 'opens') out.push('quick (✓) must apply at once, not open an editor');
  return out;
}

/* ---------- small pure helpers ---------- */
function sgHM(min) {
  const m = Math.max(0, Math.min(24 * 60, Math.round(Number(min) || 0)));
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
}
/** "45 min", "2 h", "1 h 30 min". */
function sgDur(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
function sgMinOf(hm) { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hm == null ? '' : hm)); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
function sgAddDays(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const t = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + (n || 0)));
  return t.toISOString().slice(0, 10); // clock-ok: UTC civil date (no zone)
}
function sgDow(iso) { const [y, m, d] = String(iso).split('-').map(Number); return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay(); }
function sgDaysBetween(a, b) {
  const p = (s) => { const [y, m, d] = String(s).split('-').map(Number); return Date.UTC(y, (m || 1) - 1, d || 1); };
  return Math.round((p(b) - p(a)) / 86400000);
}
const _SG_DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Working hours: {days:[1..5] (0 = Sunday), start, end} in minutes. Accepts config shapes ('09:00', 'Mon'). */
function sgWork(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const days = (Array.isArray(r.days) ? r.days : [1, 2, 3, 4, 5])
    .map(d => (typeof d === 'number' ? d : _SG_DAY_NAMES.indexOf(String(d).slice(0, 3)))).filter(d => d >= 0 && d <= 6);
  const mins = (v, dflt) => (Number.isFinite(v) ? v : sgMinOf(v) !== null ? sgMinOf(v) : dflt);
  let start = mins(r.start, 9 * 60), end = mins(r.end, 18 * 60);
  if (!(end > start)) { start = 9 * 60; end = 18 * 60; }
  return { days: days.length ? [...new Set(days)].sort() : [1, 2, 3, 4, 5], start, end };
}
function sgIsWorkDay(work, iso) { return sgWork(work).days.includes(sgDow(iso)); }
function sgNextWorkDay(work, iso) {
  const w = sgWork(work);
  for (let i = 1; i <= 7; i++) { const d = sgAddDays(iso, i); if (w.days.includes(sgDow(d))) return d; }
  return sgAddDays(iso, 1);
}
/** A title short enough for a sentence (same rule as homeTodayShort / lib/story-data.mjs shortTitle). */
function sgShort(t, max) {
  max = max || 48;
  const full = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  let s = full;
  const head = s.split(/\s*(?::|;|\s[–—-]\s|\(|\[|\|)\s*/)[0];
  if (head.length >= 8 && head.length < s.length) s = head;
  if (s.length > max) s = s.slice(0, max).replace(/\s+\S*$/, '');
  s = s.replace(/[\s,.;:–—-]+$/, '');
  return s || full.slice(0, max);
}
/** Clip on a word boundary with an ellipsis. */
function sgClip(t, max) {
  const s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/* ---------- the snapshot's indexes (built once per ctx) ---------- */
/**
 * ctx (68-suggest-context.js builds it on the page; tests give JSON):
 *   now {date, min, dow, ts}, work, eveningHour,
 *   cal {ok, stale, writable, fetchedAt, label, days: {iso: [{id, title, start, end, allDay,
 *        free, declined, type, people, attendees, organizerSelf, myResponse, recurring,
 *        calendarId, origin, linked, notes}]}},
 *   tasks [{id, title, stream, priority, due, dueTime, planned, plannedTime, plannedMinutes,
 *           status, estimate, waiting, snoozed, notStarted, subtasks {done, total, open[]},
 *           people, focusWhy[]}],
 *   focus [taskId], people {id: {first, email, self}}, inbox {...}, triage {...},
 *   surfacesVisible {widgetId: bool}, capabilities {calendar, calWrite, inbox, gmailDraft,
 *   server, ai}, net {down}
 */
function sgPrepare(ctx) {
  if (!ctx || ctx._sgIx) return ctx;
  const byId = {};
  for (const t of ctx.tasks || []) if (t && t.id) byId[t.id] = t;
  const own = [];           // events the dashboard made (origin set), any day in the window
  const days = (ctx.cal && ctx.cal.days) || {};
  for (const iso of Object.keys(days)) for (const e of days[iso] || []) if (e && e.origin) own.push(Object.assign({ date: iso }, e));
  Object.defineProperty(ctx, '_sgIx', { value: { byId, own }, enumerable: false });
  return ctx;
}
function sgTask(ctx, id) { return (sgPrepare(ctx)._sgIx.byId[id]) || null; }
/** Own blocks (origin set) linked to a task that are still to come (today from now, or later days). */
function sgFutureBlocksFor(ctx, taskId) {
  const ix = sgPrepare(ctx)._sgIx;
  return ix.own.filter(e => (e.origin.taskId === taskId || (e.linked || []).includes(taskId))
    && (e.date > ctx.now.date || (e.date === ctx.now.date && e.end > ctx.now.min)));
}
/** An own block starts within the next `min` minutes (S1: no nagging right before a block). */
function sgOwnBlockSoon(ctx, min) {
  const ix = sgPrepare(ctx)._sgIx;
  return ix.own.some(e => e.date === ctx.now.date && !e.allDay && e.start >= ctx.now.min && e.start < ctx.now.min + min);
}
/** In a meeting with other people right now (G5). */
function sgInMeeting(ctx) {
  const list = ((ctx.cal && ctx.cal.days) || {})[ctx.now.date] || [];
  return list.some(e => e && !e.allDay && !e.free && !e.declined && !e.origin && (e.attendees || 0) > 0 && e.start <= ctx.now.min && e.end > ctx.now.min);
}
function sgInWorkHours(ctx) {
  const w = sgWork(ctx.work);
  return w.days.includes(sgDow(ctx.now.date)) && ctx.now.min >= w.start && ctx.now.min < w.end;
}
function sgHoursOk(rule, ctx) {
  const h = (rule && rule.hours) || 'any';
  if (h === 'any') return true;
  if (h === 'work') return sgInWorkHours(ctx);
  if (h === 'evening') return ctx.now.min >= (Number(ctx.eveningHour) || 17) * 60;
  return true;
}

/**
 * Free stretches on a day: busy = timed events that are not free / declined (own blocks
 * count) + timed tasks (ctx.timed[iso] = [{start, end}]), inside working hours (or o.start /
 * o.end), from now on for today (a gap that starts now begins at the next quarter hour),
 * at least o.gapMin (45). -> [{start, end, minutes, lead, best}] (best = the longest of 90+).
 */
function sgFreeStretches(ctx, iso, o) {
  o = o || {};
  const w = sgWork(ctx.work);
  const ws = Number.isFinite(o.start) ? o.start : w.start;
  const we = Number.isFinite(o.end) ? o.end : w.end;
  const gmin = Number.isFinite(o.gapMin) ? o.gapMin : SG_GAP_MIN;
  const today = ctx.now.date;
  if (iso < today) return [];
  const busy = [];
  for (const e of ((ctx.cal && ctx.cal.days) || {})[iso] || []) if (e && !e.allDay && !e.free && !e.declined) busy.push([e.start, Math.max(e.end, e.start + 1)]);
  for (const t of ((ctx.timed || {})[iso]) || []) busy.push([t.start, Math.max(t.end, t.start + 1)]);
  busy.sort((a, b) => a[0] - b[0]);
  const from0 = iso === today ? Math.max(ws, Math.ceil(ctx.now.min / 15) * 15) : ws;
  const gaps = [];
  let cur = from0;
  const add = (a, b) => { if (b - a >= gmin) gaps.push({ start: a, end: b, minutes: b - a, lead: a === from0 && iso === today, best: false }); };
  for (const [s, e] of busy) {
    if (cur >= we) break;
    if (e <= cur) continue;
    if (s > cur) add(cur, Math.min(s, we));
    cur = Math.max(cur, e);
  }
  if (cur < we) add(cur, we);
  let best = null;
  for (const g of gaps) if (g.minutes >= 90 && (!best || g.minutes > best.minutes)) best = g;
  if (best) best.best = true;
  return gaps;
}

/* ---------- memory (state.suggest, data: saved with saveData, undoable, synced) ---------- */
function sgMemNorm(m) {
  const x = m && typeof m === 'object' ? m : {};
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  return { v: SG_VERSION, off: x.off === true, homeMax: Number.isFinite(x.homeMax) ? Math.max(1, Math.min(5, Math.round(x.homeMax))) : 3,
    rules: obj(x.rules), dismissed: obj(x.dismissed), notFor: obj(x.notFor), accepted: obj(x.accepted), fewer: obj(x.fewer) };
}
/** Is a rule switched on? (the master switch, Settings, "Stop these", "Not today") */
function sgRuleOn(rule, mem, today) {
  const m = sgMemNorm(mem);
  if (m.off) return false;
  const s = m.rules[rule.id];
  if (s && s.off === true) return false;
  if (s && s.on === true) return true;
  if (s && s.until && s.until >= today) return false;
  return rule.defaultOn !== false;
}
/** Hidden by memory? -> '' (shown) or why: 'dismissed' | 'accepted' | 'notFor' | 'expired'. */
function sgHiddenBy(card, mem, ctx) {
  const m = sgMemNorm(mem);
  const today = ctx.now.date;
  if (m.accepted[card.key]) return 'accepted';
  if (m.dismissed[card.key] && m.dismissed[card.key] >= today) return 'dismissed';
  if (card.entity && m.notFor[card.entity] && m.notFor[card.entity] >= today) return 'notFor';
  if (Number.isFinite(card.expiresMin) && (card.expiresDate || today) === today && ctx.now.min >= card.expiresMin) return 'expired';
  return '';
}
function _sgMemPatch(mem, fn) { const m = sgMemNorm(mem); const n = JSON.parse(JSON.stringify(m)); fn(n); return n; }
/** Not now: hidden until tomorrow (the key's date is today; "until" is inclusive). */
function sgMemDismiss(mem, key, today) { return _sgMemPatch(mem, (m) => { m.dismissed[key] = today; }); }
/** Not for this one: the entity is muted for `days` (the rule's cooldown, default 30). */
function sgMemNotFor(mem, entity, today, days) { return _sgMemPatch(mem, (m) => { if (entity) m.notFor[entity] = sgAddDays(today, Math.max(1, days || 30)); }); }
function sgMemFewer(mem, ruleId) { return _sgMemPatch(mem, (m) => { m.fewer[ruleId] = Math.min(4, (m.fewer[ruleId] || 0) + 1); }); }
/** Stop these (off) / back on (on) / not today (until). */
function sgMemRule(mem, ruleId, how, today) {
  return _sgMemPatch(mem, (m) => {
    if (how === 'off') m.rules[ruleId] = { off: true };
    else if (how === 'today') m.rules[ruleId] = { until: today };
    else { delete m.rules[ruleId]; delete m.fewer[ruleId]; if (how === 'force-on') m.rules[ruleId] = { on: true }; }
  });
}
function sgMemAccept(mem, key, ts) { return _sgMemPatch(mem, (m) => { m.accepted[key] = ts || 1; }); }
function sgMemSetOff(mem, off) { return _sgMemPatch(mem, (m) => { m.off = !!off; }); }
function sgMemSetHomeMax(mem, n) { return _sgMemPatch(mem, (m) => { m.homeMax = Math.max(1, Math.min(5, Math.round(Number(n) || 3))); }); }
/** Forget dismissals and mutes (Settings: Reset). Rules switched off stay off. */
function sgMemReset(mem) { return _sgMemPatch(mem, (m) => { m.dismissed = {}; m.notFor = {}; m.accepted = {}; m.fewer = {}; }); }
function sgMemCount(mem, today) {
  const m = sgMemNorm(mem);
  return Object.values(m.dismissed).filter(d => d >= today).length + Object.values(m.notFor).filter(d => d >= today).length;
}
/** Drop entries older than 60 days (dismissed / notFor by their date; accepted by time). */
function sgMemPrune(mem, today, nowTs) {
  return _sgMemPatch(mem, (m) => {
    const cut = sgAddDays(today, -SG_MEM_KEEP_DAYS);
    for (const k of Object.keys(m.dismissed)) if (!(m.dismissed[k] >= cut)) delete m.dismissed[k];
    for (const k of Object.keys(m.notFor)) if (!(m.notFor[k] >= today)) delete m.notFor[k];
    const old = (Number(nowTs) || 0) - SG_MEM_KEEP_DAYS * 86400000;
    for (const k of Object.keys(m.accepted)) if (Number(m.accepted[k]) < old) delete m.accepted[k];
  });
}

/* ---------- local counts (UI key suggestStats: no undo, no backup, never leaves the machine) ---------- */
function sgStatsNorm(s) {
  const x = s && typeof s === 'object' ? s : {};
  return { rules: x.rules && typeof x.rules === 'object' ? x.rules : {}, seen: x.seen && typeof x.seen === 'object' ? x.seen : {} };
}
function _sgStatsPatch(s, fn) { const n = JSON.parse(JSON.stringify(sgStatsNorm(s))); fn(n); return n; }
function _sgRuleStats(n, id) { return n.rules[id] || (n.rules[id] = { shown: 0, acted: 0, dismissed: 0, ignoredStreak: 0, askedKeep: false }); }
/** Shown (half on screen for a second): counted once per key per day. -> {stats, changed}. */
function sgStatsShown(s, ruleId, key, today) {
  const cur = sgStatsNorm(s).seen[key];
  if (cur && cur.d === today) return { stats: s, changed: false };
  return { stats: _sgStatsPatch(s, (n) => { _sgRuleStats(n, ruleId).shown++; n.seen[key] = { d: today, r: ruleId, a: 0 }; }), changed: true };
}
/** Acted on (primary, ✓, a secondary): the ignored streak starts again. */
function sgStatsActed(s, ruleId, key, today) {
  return _sgStatsPatch(s, (n) => { const r = _sgRuleStats(n, ruleId); r.acted++; r.ignoredStreak = 0; r.askedKeep = false; n.seen[key] = { d: today, r: ruleId, a: 1 }; });
}
function sgStatsDismissed(s, ruleId, key, today) {
  return _sgStatsPatch(s, (n) => { _sgRuleStats(n, ruleId).dismissed++; n.seen[key] = { d: today, r: ruleId, a: 1 }; });
}
/** A new day: yesterday's shown-but-untouched keys count as ignored (one each per rule). */
function sgStatsRoll(s, today) {
  return _sgStatsPatch(s, (n) => {
    for (const [k, v] of Object.entries(n.seen)) {
      if (!v || v.d >= today) continue;
      if (!v.a) _sgRuleStats(n, v.r).ignoredStreak++;
      delete n.seen[k];
    }
  });
}
function sgStatsKeep(s, ruleId, yes) { return _sgStatsPatch(s, (n) => { const r = _sgRuleStats(n, ruleId); r.askedKeep = !yes; if (yes) r.ignoredStreak = 0; }); }
function sgStatsReset() { return { rules: {}, seen: {} }; }
/** 0.5 for every 5 ignored in a row, never under 0.25. */
function sgLearn(streak) { return Math.max(0.25, Math.pow(0.5, Math.floor((Number(streak) || 0) / 5))); }
function sgFewerFactor(n) { return Math.max(0.25, Math.pow(0.5, Number(n) || 0)); }

/* ---------- the pipeline ---------- */
/** Fill a rule's card in (defaults, the rule's id, area, hours, surfaces). */
function sgNormCard(c, rule) {
  const out = Object.assign({ urgency: 1, icon: 'lightbulb', scene: null, secondary: [], menu: [], claims: [], why: [], entity: '' }, c);
  out.rule = rule.id; out.area = rule.area; out.hours = rule.hours; out.ruleTitle = rule.title;
  out.surfaces = Array.isArray(c.surfaces) ? c.surfaces : rule.surfaces;
  out.inPlace = [].concat(c.inPlace || rule.inPlace || []);
  out.urgency = Math.max(0.5, Math.min(1.5, Number(out.urgency) || 1));
  out.secondary = (out.secondary || []).filter(Boolean).slice(0, 3);
  out.claims = (out.claims || []).filter(Boolean);
  out.safety = out.primary && out.primary.action ? SG_ACTION_TYPES[out.primary.action.type] || '' : '';
  return out;
}
function sgScore(card, rule, mem, stats) {
  const m = sgMemNorm(mem), st = sgStatsNorm(stats);
  const streak = (st.rules[rule.id] || {}).ignoredStreak || 0;
  return Math.round(rule.value * 20 * card.urgency * sgLearn(streak) * sgFewerFactor(m.fewer[rule.id]) * 10) / 10;
}
/** Keep one per key, and one per claim (the higher score wins). Input sorted best first. */
function sgDedupe(cards) {
  const keys = new Set(), claims = new Set(), out = [];
  for (const c of cards) {
    if (keys.has(c.key)) continue;
    if ((c.claims || []).some(x => claims.has(x))) continue;
    keys.add(c.key);
    for (const x of c.claims || []) claims.add(x);
    out.push(c);
  }
  return out;
}
/**
 * Run every switched-on rule over the snapshot.
 * o: {stats, only: [ruleId] (tests), rules (default sgRules())}
 * -> {cards (ranked, deduped, memory-filtered; each with score), hidden [{key, why}],
 *     skipped [{rule, why}], errors [{rule, message}], guards {down, calStale, inMeeting},
 *     suppressed [ruleId] (calendar rules held back by a stale calendar: S20 reads it)}
 */
function sgEvaluate(ctx, mem, o) {
  o = o || {};
  sgPrepare(ctx);
  const rules = (o.rules || sgRules()).filter(r => !o.only || o.only.includes(r.id));
  const today = ctx.now.date;
  const caps = ctx.capabilities || {};
  const guards = { down: !!(ctx.net && ctx.net.down), calStale: !!(ctx.cal && ctx.cal.ok && ctx.cal.stale), inMeeting: sgInMeeting(ctx) };
  const res = { cards: [], hidden: [], skipped: [], errors: [], guards, suppressed: [] };
  if (guards.down) return res;                                      // G3: the offline banner explains
  const order = new Map(rules.map((r, i) => [r.id, i]));
  const env = { today, guards, suppressed: res.suppressed, mem: sgMemNorm(mem) };
  const all = [];
  // A rule that reads env.suppressed (the stale-calendar guard card, S20: `reads: ['suppressed']`)
  // runs after the others, so it knows which calendar rules a stale calendar held back.
  const ranLast = rules.filter(r => (r.reads || []).includes('suppressed'));
  const ranFirst = rules.filter(r => !ranLast.includes(r));
  for (const r of ranFirst.concat(ranLast)) {
    if (!sgRuleOn(r, mem, today)) { res.skipped.push({ rule: r.id, why: 'off' }); continue; }
    const missing = (r.needs || []).filter(n => !caps[n]);
    if (missing.length) {
      if (missing.includes('calendar') && guards.calStale) res.suppressed.push(r.id);   // G1
      res.skipped.push({ rule: r.id, why: 'needs ' + missing.join(', ') });
      continue;
    }
    if (guards.inMeeting && !r.contextual) { res.skipped.push({ rule: r.id, why: 'meeting' }); continue; }   // G5
    let cards;
    try { cards = r.run(ctx, env.mem, env) || []; }
    catch (e) { res.errors.push({ rule: r.id, message: String((e && e.message) || e) }); continue; }
    for (const raw of cards) {
      if (!raw) continue;
      const c = sgNormCard(raw, r);
      const bad = sgCheckCard(c);
      if (bad.length) { res.errors.push({ rule: r.id, message: 'bad card ' + c.key + ': ' + bad.join(', ') }); continue; }
      const why = sgHiddenBy(c, mem, ctx);
      if (why) { res.hidden.push({ key: c.key, why }); continue; }
      c.score = sgScore(c, r, mem, o.stats);
      c.askKeep = (((sgStatsNorm(o.stats).rules[r.id]) || {}).ignoredStreak || 0) >= 5 && !((sgStatsNorm(o.stats).rules[r.id] || {}).askedKeep);
      all.push(c);
    }
  }
  all.sort((a, b) => (b.score - a.score) || (order.get(a.rule) - order.get(b.rule)) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  res.cards = sgDedupe(all);
  return res;
}
/**
 * Who shows what (3.5 step 6). Only cards scoring 30+; proactive copies follow the
 * hours rule (G6) and are skipped while their in-place control is on screen; one place per card.
 * -> {hero, home [], story {morning [], evening []}, widgets {id: card}}
 */
function sgAssign(cards, ctx, o) {
  o = o || {};
  const homeMax = Number.isFinite(o.homeMax) ? o.homeMax : 3;
  const vis = ctx.surfacesVisible || {};
  const ruleOf = (c) => sgRule(c.rule) || { hours: c.hours, multi: false };
  const out = { hero: null, home: [], story: { morning: [], evening: [] }, widgets: {} };
  const used = new Set();
  const shown = cards.filter(c => c.score >= SG_THRESHOLD.show);
  // In place first: a widget that hosts the card shows it (one per widget).
  for (const c of shown) {
    const host = (c.inPlace || []).find(w => vis[w]);
    if (!host) continue;
    used.add(c.key);
    if (!out.widgets[host]) out.widgets[host] = c;
  }
  const proactive = (c, s) => !used.has(c.key) && (c.surfaces || []).includes(s) && sgHoursOk(ruleOf(c), ctx);
  const hero = shown.find(c => c.score >= SG_THRESHOLD.hero && proactive(c, 'hero'));
  if (hero) { out.hero = hero; used.add(hero.key); }
  const perRule = new Map();
  for (const c of shown) {
    if (out.home.length >= homeMax) break;
    if (!proactive(c, 'home')) continue;
    if (!ruleOf(c).multi && perRule.get(c.rule)) continue;
    perRule.set(c.rule, 1); used.add(c.key); out.home.push(c);
  }
  // Variety first (one per rule), then honour the count the user chose: when fewer rules
  // fired than "How many on Home", a rule's next cards fill the rest (user report, 4 Oct:
  // set 5, saw 1, while three "reply you owe" cards were waiting behind the first).
  for (const c of shown) {
    if (out.home.length >= homeMax) break;
    if (!proactive(c, 'home')) continue;
    used.add(c.key); out.home.push(c);
  }
  for (const kind of ['morning', 'evening']) {
    const per = new Map();
    for (const c of shown) {
      if (out.story[kind].length >= 3) break;
      if (!(c.surfaces || []).includes('story-' + kind) || (!ruleOf(c).multi && per.get(c.rule))) continue;
      per.set(c.rule, 1); out.story[kind].push(c);         // the story is its own moment: it may repeat Home's cards
    }
  }
  return out;
}
/**
 * Why Home shows fewer than "How many on Home": {shown, max, later, elsewhere, hidden, text}.
 * later = cards held for working hours / the evening (G6); elsewhere = shown in the Today
 * hero, in place by another widget, or in alsoShown (keys); hidden = dismissed / Not now / cooling down.
 * text: "" when Home is full, else one plain line, e.g. "1 suggestion right now (up to 5). 5 more wait for working hours (Mon–Fri 09:00–18:00)."
 */
function sgHomeShortfall(res, assign, ctx, homeMax, alsoShown) {
  const max = Number.isFinite(homeMax) ? homeMax : 3;
  const shown = ((assign && assign.home) || []).length;
  const out = { shown, max, later: 0, laterEvening: 0, elsewhere: 0, hidden: ((res && res.hidden) || []).length, text: '' };
  if (shown >= max) return out;
  const homeKeys = new Set(((assign && assign.home) || []).map(c => c.key));
  // alsoShown: keys another Home surface draws (the Brief's "Ideas for today").
  const there = new Set([assign && assign.hero && assign.hero.key, ...Object.values((assign && assign.widgets) || {}).map(c => c && c.key), ...(alsoShown || [])].filter(Boolean));
  for (const c of (res && res.cards) || []) {
    if (homeKeys.has(c.key) || c.score < SG_THRESHOLD.show) continue;
    if (there.has(c.key)) { out.elsewhere++; continue; }
    if (!(c.surfaces || []).includes('home')) continue;
    const r = sgRule(c.rule) || { hours: c.hours };
    if (!sgHoursOk(r, ctx)) { if (r.hours === 'evening') out.laterEvening++; else out.later++; }
  }
  const w = sgWork(ctx && ctx.work);
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const ds = w.days.slice().sort((a, b) => a - b);
  const run = ds.length > 1 && ds.every((d, i) => !i || d === ds[i - 1] + 1);
  const dayTxt = !ds.length ? '' : ds.length === 7 ? 'every day' : run ? `${names[ds[0]]}–${names[ds[ds.length - 1]]}` : ds.map(d => names[d]).join(', ');
  const parts = [];
  if (out.later) parts.push(`${out.later} more wait${out.later === 1 ? 's' : ''} for working hours (${dayTxt} ${sgHM(w.start)}–${sgHM(w.end)})`);
  if (out.laterEvening) parts.push(`${out.laterEvening} more wait${out.laterEvening === 1 ? 's' : ''} for the evening`);
  if (out.elsewhere) parts.push(`${out.elsewhere} ${out.elsewhere === 1 ? 'is' : 'are'} shown elsewhere on Home`);
  if (out.hidden) parts.push(`${out.hidden} you set aside (Not now / dismissed)`);
  const head = `${shown} suggestion${shown === 1 ? '' : 's'} right now (up to ${max}).`;
  out.text = parts.length ? `${head} ${parts.join('; ').replace(/^./, ch => ch.toUpperCase())}.` : `${head} ${shown === 0 ? 'Nothing fits' : shown === 1 ? 'No other idea fits' : 'No other ideas fit'} your tasks and calendar at the moment.`;
  return out;
}
/** "Why am I seeing this?" as plain lines (the popover draws them). */
function sgWhyText(card, ctx) {
  const based = [];
  if (ctx && ctx.cal && ctx.cal.label && card.area === 'time') based.push('calendar ' + String(ctx.cal.label).replace(/^Updated\s+/i, 'updated '));
  based.push(`rule "${card.ruleTitle || card.rule}"`);
  return { why: (card.why || []).map(String), does: String(card.preview || ''), based: 'Based on: ' + based.join(' · ') };
}
