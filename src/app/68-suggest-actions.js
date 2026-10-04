/* ============================================================
   SUGGESTIONS ENGINE: what the buttons do (owner: Suggestions engine)
   ------------------------------------------------------------
   SG_ACTIONS[type] = {safety, check(args, o) -> '' | why it is refused,
   run(args, o) -> Promise<{ok, ...}>}. sgRun(action, card, o) refuses any
   type that is not registered (and listed in SG_ACTION_TYPES, the pure file)
   and any arguments its check refuses. The user's rule (3 Oct): a card's
   PRIMARY opens the normal editor PREFILLED ('cal.blockOpen', 'cal.createOpen',
   'task.createOpen', 'gmail.draftOpen'); its "✓" applies at once with Undo
   ('cal.block', 'ops', ...).

   Never here, by design: sending email, any Bank write / payment / transfer,
   moving or deleting an event with guests or one the dashboard did not make
   (except RSVP, which asks first), binning or deleting tasks.

   Data changes go through the actions layer (/api/actions: validation, one
   batch, an Undo token for exactly that batch); calendar changes through
   window.CalWrite (no guests; `silent` = this card shows the receipt and owns
   the Undo). An undo group (sgUndoGroup) puts back everything one click did.
   o (run options): {card, from (the clicked element), surface, onState(st)}:
   onState({state: 'saving'|'saved'|'warn'|'error'|'undone', line, sub, message,
   eventId, retry}) drives the card's receipt (68-suggest-ui.js).
   ============================================================ */

// (This file loads BEFORE 68-suggest-logic.js in the build: nothing here may touch the logic
// file's consts (SG_ACTION_TYPES...) at load time, only inside functions.)
const SG_ACTIONS = {};
let _sgCalwTick = 0;                 // bumped on CalWrite changes: the snapshot memo key
const _sgOpenOps = new Map();        // card key -> extra ops to run when its prefilled event card is saved (cal.createOpen)
function sgDefineAction(type, def) { SG_ACTIONS[type] = Object.assign({ check: () => '' }, def); }
function sgActionSafety(type) { return SG_ACTION_TYPES[type] || ''; }
function _sgToday() { return typeof todayStr === 'function' ? todayStr() : sgAddDays('1970-01-01', 0); }
function _sgNowMin() { const d = Clock.parts(Clock.now()); return d.h * 60 + d.mi; }
/** 'YYYY-MM-DDTHH:MM' on the wall clock (CalWrite and the event card read it as local time). */
function sgLocalISO(date, min) { return `${date}T${sgHM(min)}`; }
function _sgCW() { const w = typeof window !== 'undefined' ? window.CalWrite : null; return w && typeof w.create === 'function' ? w : null; }
function _sgPrimaryCal() { const w = _sgCW(); try { return (w && w.defaultCalendarId && w.defaultCalendarId()) || null; } catch (e) { return null; } }

/** Run one card action. -> Promise<{ok, code?, message?}> (never rejects). */
async function sgRun(action, card, o) {
  o = Object.assign({}, o || {}, { card: card || (o && o.card) || null });
  const a = action || {};
  if (!Object.prototype.hasOwnProperty.call(SG_ACTION_TYPES, a.type) || !SG_ACTIONS[a.type]) {
    console.warn('[suggest] refused an unknown action', a.type);
    return { ok: false, code: 'UNKNOWN_ACTION', message: 'That suggestion cannot run here.' };
  }
  const def = SG_ACTIONS[a.type];
  const args = a.args && typeof a.args === 'object' ? a.args : {};
  let bad = '';
  try { bad = def.check(args, o) || ''; } catch (e) { bad = String((e && e.message) || e); }
  if (bad) return { ok: false, code: 'REFUSED', message: bad };
  if (o.card && o.count !== false && typeof sgCountActed === 'function') sgCountActed(o.card);
  try { return (await def.run(args, o)) || { ok: true }; }
  catch (e) { console.error('[suggest]', a.type, e); return { ok: false, code: 'FAILED', message: netErrorMessage(e, 'That did not work.') }; }
}
function _sgState(o, st) { if (o && typeof o.onState === 'function') { try { o.onState(st); } catch (e) { console.error('[suggest] receipt', e); } } }

/* ---------- undo groups: one Undo for everything one click did ---------- */
function sgUndoGroup(key) {
  const g = {
    key: key || '', steps: [], undone: false,
    push(step) { if (step) g.steps.push(step); return g; },
    replace(kind, step) { const i = g.steps.findIndex(s => s.kind === kind); if (i >= 0) g.steps[i] = step; else g.steps.push(step); return g; },
    /** Puts back every step, newest first; a step that fails does not stop the others (a toast names it). */
    async undo() {
      if (g.undone) return { ok: true, already: true };
      g.undone = true;
      const fails = [];
      for (const s of g.steps.slice().reverse()) {
        let r = null;
        try { r = await _sgUndoStep(s); } catch (e) { r = { ok: false, message: (e && e.message) || String(e) }; }
        if (r && r.ok === false && !r.cancelled) fails.push(Object.assign({ kind: s.kind }, r));
      }
      if (fails.length) {
        const f = fails[0];
        toast((f.kind === 'ops' ? 'The task link could not be undone: ' : 'Not everything could be undone: ') + (f.message || 'try again from the event or the task'), { kind: 'err', timeout: 9000 });
      }
      return { ok: !fails.length, fails };
    },
  };
  return g;
}
async function _sgUndoStep(s) {
  const w = _sgCW();
  if (s.kind === 'cal-remove') return w ? w.remove(s.id, { quiet: true, silent: true }) : { ok: false, message: 'The calendar is not available.' };
  if (s.kind === 'cal-move-back') return w ? w.update(s.id, { start: s.start, end: s.end }, { quiet: true, silent: true }) : { ok: false };
  if (s.kind === 'cal-patch-back') return w ? w.update(s.id, s.patch, { quiet: true, silent: true }) : { ok: false };
  if (s.kind === 'cal-recreate') {
    if (!w) return { ok: false };
    const r = await w.create(s.fields, { quiet: true, silent: true });
    const m = s.meta || {};
    if (r && r.ok && r.event && m.origin) {
      await sgApplyOps([{ op: 'event.annotate', eventId: r.event.id, origin: m.origin, ...(Array.isArray(m.tasks) && m.tasks.length ? { linkTasks: m.tasks } : {}) }], { client: 'suggestions' });
    }
    return r;
  }
  if (s.kind === 'ops') return sgUndoOps(s.token);
  if (s.kind === 'draft') return window.GmailDraft && typeof window.GmailDraft.remove === 'function' ? window.GmailDraft.remove(s.id) : { ok: false, message: 'Delete the draft in Gmail.' };
  if (s.kind === 'mem') { state.suggest = s.before; saveData(); render(); return { ok: true }; }
  if (s.kind === 'travel') { state.travel = s.before; saveData(); if (typeof TravelStore !== 'undefined') TravelStore.changed(); render(); return { ok: true }; }
  if (s.kind === 'time') return typeof ClockOverride !== 'undefined' ? ClockOverride.set(s.before, { quiet: true }) : { ok: false, message: 'Change it back in Settings > Profile & region.' };
  return { ok: true };
}

/* ---------- the actions layer (dry run, then apply, keep the token) ---------- */
async function _sgPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    const err = new Error((j.error && (j.error.message || j.error)) || `HTTP ${r.status}`);
    err.code = (j.error && j.error.code) || j.code || 'HTTP_' + r.status;
    if (j.error && j.error.candidates) err.candidates = j.error.candidates;
    throw err;
  }
  return j;
}
/** Apply ops (allowlist SG_OPS_ALLOW) -> {ok, undo (token), summary, version} | {ok:false, code, message, cancelled?}. */
async function sgApplyOps(ops, o) {
  o = o || {};
  const list = Array.isArray(ops) ? ops : [];
  const bad = list.find(op => !op || !SG_OPS_ALLOW.includes(op.op));
  if (!list.length || bad) return { ok: false, code: 'REFUSED', message: bad ? `"${bad && bad.op}" is not something a suggestion may do.` : 'Nothing to apply.' };
  const client = o.client || 'suggestions';
  try {
    if (typeof _persistFire === 'function' && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer))) { _persistFire(); await new Promise(r => setTimeout(r, 400)); }
    const dry = await _sgPost('/api/actions', { ops: list, dryRun: true, source: 'ui', client });
    if (dry.needsConfirm) {
      const n = (dry.preview || []).reduce((a, p) => a + ((p.changes || []).length || 1), 0);
      if (!await confirmDialog({ title: o.confirmTitle || 'Apply this suggestion?', text: `${n} change${n === 1 ? '' : 's'}. You can undo it afterwards.`, confirmLabel: 'Apply' })) return { ok: false, cancelled: true, code: 'CANCELLED' };
    }
    const j = await _sgPost('/api/actions', { ops: list, confirm: dry.confirm, source: 'ui', client });
    if (typeof _asstAdopt === 'function') await _asstAdopt(j.version);
    return { ok: true, undo: j.undo || null, summary: j.summary || '', version: j.version, result: j };
  } catch (e) {
    return { ok: false, code: e.code || 'FAILED', message: netErrorMessage(e, 'That did not work.'), candidates: e.candidates || null };
  }
}
async function sgUndoOps(token) {
  if (!token) return { ok: true };
  try {
    const u = await _sgPost('/api/actions/undo', { token, source: 'ui', client: 'suggestions' });
    if (typeof _asstAdopt === 'function') await _asstAdopt(u.version);
    return { ok: true };
  } catch (e) { return { ok: false, code: e.code || 'FAILED', message: netErrorMessage(e, 'Could not undo.') }; }
}

/* ---------- memory and counts (state.suggest = data; suggestStats = UI) ---------- */
/** Change the memory (one undo step, synced); msg = a toast with Undo. */
function sgMemWrite(fn, msg) {
  const before = state.suggest ? JSON.parse(JSON.stringify(state.suggest)) : undefined;
  state.suggest = sgMemPrune(fn(sgMemNorm(state.suggest)), _sgToday(), Date.now());
  saveData();
  if (typeof sgRefresh === 'function') sgRefresh();
  else render();
  if (msg) toast(msg, { kind: 'ok', icon: 'eye-off', action: { label: 'Undo', run: () => { state.suggest = before; saveData(); render(); } } });
}
function _sgStatsWrite(fn) {
  try { state.suggestStats = fn(sgStatsRoll(state.suggestStats, _sgToday())); saveUI(); } catch (e) { console.error('[suggest] counts', e); }
}
function sgCountShown(card) { if (!card) return; const r = sgStatsShown(sgStatsRoll(state.suggestStats, _sgToday()), card.rule, card.key, _sgToday()); if (r.changed) { state.suggestStats = r.stats; saveUI(); } }
function sgCountActed(card) { if (card) _sgStatsWrite(s => sgStatsActed(s, card.rule, card.key, _sgToday())); }
function sgCountDismissed(card) { if (card) _sgStatsWrite(s => sgStatsDismissed(s, card.rule, card.key, _sgToday())); }

/* ---------- prefilled editors (the PRIMARY of a card) ---------- */
function _sgTaskTitle(id) { const t = id && typeof getItem === 'function' ? getItem(id) : null; return t ? String(effTitle(t) || '') : ''; }
/** The event card in create mode for a focus block; Save -> CalWrite.create, then sgAfterEventCreate links it. */
sgDefineAction('cal.blockOpen', {
  check(a) { return _sgCheckRange(a); },
  run(a, o) {
    if (typeof openEvent !== 'function') return { ok: false, message: 'The event card is not available.' };
    // Pressed again while its card is open: a no-op (the user's edits stay); just back to the card.
    const key = (o.card && o.card.key) || '';
    const open = key && typeof _tc !== 'undefined' && _tc && !_tc.closing && typeof _tcCur === 'function' ? _tcCur() : null;
    if (open && open.kind === 'evcreate' && open.draft && open.draft.link && open.draft.link.key === key) { if (typeof _tcFocusStart === 'function') _tcFocusStart(); return { ok: true, opened: true, again: true }; }
    const t = a.taskId ? (typeof getItem === 'function' ? getItem(a.taskId) : null) : null;
    const now = a.date === _sgToday() ? Math.ceil(_sgNowMin() / 5) * 5 : 0;
    const start = Math.max(a.start, now), end = Math.max(start + 15, Math.min(a.end, a.gapEnd || a.end));
    openEvent(null, { from: o.from, create: {
      title: a.title || (t ? 'Focus: ' + sgShort(effTitle(t), 80) : 'Focus time'),
      start: sgLocalISO(a.date, start), end: sgLocalISO(a.date, end), calendarId: _sgPrimaryCal() || '',
      description: a.description || '', relatedTaskId: t ? t.id : '', origin: { kind: 'block', rule: a.rule || 'free-slot' },
      suggestKey: (o.card && o.card.key) || '',
    } });
    return { ok: true, opened: true };
  },
});
/** The event card in create mode for an own event without a task (prep, travel, lunch...). */
sgDefineAction('cal.createOpen', {
  check(a) { return (a.allDay ? _sgCheckDays(a) : _sgCheckRange(a)) || (a.guests && a.guests.length ? 'A suggestion never invites anyone.' : ''); },
  run(a, o) {
    // Extra ops a card wants after Save (S4 prep: the meeting's notes); sgAfterEventCreate runs them in its batch.
    const key = (o.card && o.card.key) || '';
    // Pressed again while its card is open: a no-op (the user's edits stay), as cal.blockOpen.
    const open = key && typeof _tc !== 'undefined' && _tc && !_tc.closing && typeof _tcCur === 'function' ? _tcCur() : null;
    if (open && open.kind === 'evcreate' && open.draft && open.draft.link && open.draft.link.key === key) { if (typeof _tcFocusStart === 'function') _tcFocusStart(); return { ok: true, opened: true, again: true }; }
    if (key) { if (Array.isArray(a.ops) && a.ops.length) _sgOpenOps.set(key, a.ops.slice(0, 5)); else _sgOpenOps.delete(key); }
    // a.allDay (travel T5 "Away: Tokyo"): start = a.date, end = a.endDate (Google's exclusive end).
    const when = a.allDay ? { allDay: true, start: a.date, end: a.endDate } : { start: sgLocalISO(a.date, a.start), end: sgLocalISO(a.date, a.end) };
    openEvent(null, { from: o.from, create: Object.assign({ title: a.title || '' }, when, { calendarId: _sgPrimaryCal() || '',
      description: a.description || '', location: a.location || '', relatedTaskId: a.taskId || '', origin: { kind: a.kind || 'block', rule: a.rule || '' }, suggestKey: (o.card && o.card.key) || '' }) });
    return { ok: true, opened: true };
  },
});
// a.propose = {date, start, end} (travel T8 / T12): the card opens with that time filled in, saved only with Save.
sgDefineAction('event.open', { check: (a) => (a.id ? '' : 'No event.'), run(a, o) { if (typeof openEvent === 'function') openEvent(a.id, Object.assign({ from: o.from }, a.propose ? { propose: a.propose } : {})); return { ok: true, opened: true }; } });
sgDefineAction('task.open', {
  check: (a) => (a.id && (typeof getItem !== 'function' || getItem(a.id)) ? '' : 'That task is gone.'),
  run(a, o) { if (typeof openTask === 'function') openTask(a.id, { from: o.from, context: o.surface === 'home' || o.surface === 'hero' ? 'home' : undefined }); return { ok: true, opened: true }; },
});
/** The task card in create mode, prefilled (tcOpenCreate: {title, date, time, minutes, people, detail, stream, tags, priority}). */
sgDefineAction('task.createOpen', {
  run(a, o) {
    // Pressed again while its card is open: a no-op (the user's edits stay), as cal.blockOpen.
    const key = (o.card && o.card.key) || '';
    const cur = key && typeof _tc !== 'undefined' && _tc && !_tc.closing && typeof _tcCur === 'function' ? _tcCur() : null;
    if (cur && cur.kind === 'create' && cur.draft && cur.draft.sgKey === key) { if (typeof _tcFocusStart === 'function') _tcFocusStart(); return { ok: true, opened: true, again: true }; }
    const pre = {};
    for (const k of ['title', 'date', 'time', 'minutes', 'people', 'detail', 'stream', 'tags', 'priority', 'eventId', 'ignore', 'subtasks', 'recurrence']) if (a[k] !== undefined) pre[k] = a[k];
    pre.suggested = true;   // the card says "Filled in from a suggestion" and sweeps the prefilled fields (5.6 request 5)
    // afterOps (S16/S17 cards): allowlisted ops run once the task is saved ('$new' = its id): relate the email, mark it handled.
    const after = Array.isArray(a.afterOps) ? a.afterOps.filter(op => op && SG_OPS_ALLOW.includes(op.op)).slice(0, 5) : [];
    if (after.length) pre.onCreated = (id) => { if (id) sgApplyOps(JSON.parse(JSON.stringify(after).replace(/"\$new"/g, JSON.stringify(id))), { client: 'suggestions' }); };
    if (typeof tcOpenCreate === 'function') {
      tcOpenCreate(pre, { from: o.from });
      const now = key && typeof _tcCur === 'function' && typeof _tc !== 'undefined' && _tc ? _tcCur() : null;
      if (now && now.kind === 'create' && now.draft) now.draft.sgKey = key;
    }
    else if (typeof openNewTask === 'function') openNewTask(pre.title || '', { from: o.from });
    return { ok: true, opened: true };
  },
});
/**
 * A list of proposed changes, pre-ticked, with a choice per row (a day, Won't do): the
 * "editor" for a batch (S10 move the lowest, S11 roll leftovers, S17 several emails).
 * args {title, intro, apply, line, items: [{id, label, sub, on, alts: [{label, ops}]}]};
 * Apply runs the ticked rows' chosen ops in ONE batch with one Undo. 68-suggest-choose.js draws it.
 */
sgDefineAction('ops.choose', {
  check(a) {
    const items = Array.isArray(a.items) ? a.items : [];
    if (!items.length || items.length > 12) return 'One to twelve items.';
    for (const it of items) {
      const alts = it && Array.isArray(it.alts) ? it.alts : [];
      if (!it.id || !alts.length || alts.length > 3) return 'Each item needs one to three choices.';
      for (const alt of alts) {
        const bad = (alt && Array.isArray(alt.ops) && alt.ops.length ? alt.ops : [null]).find(op => !op || !SG_OPS_ALLOW.includes(op.op));
        if (bad !== undefined) return `"${bad && bad.op}" is not something a suggestion may do.`;
      }
    }
    return '';
  },
  run(a, o) {
    if (typeof sgChooseOpen !== 'function') return { ok: false, message: 'The list is not available.' };
    return sgChooseOpen(a, o);
  },
});
/**
 * The draft editor, prefilled (window.GmailDraft.openEditor, 55-email-actions.js: Save = a Gmail
 * DRAFT, never sent); without a connected mailbox, the mail app (mailto). a.ops run after it is saved.
 */
function _sgDraftPrefill(a) { return { to: a.to, cc: a.cc || [], subject: a.subject || '', body: a.body || '', ...(a.threadId ? { threadId: a.threadId } : {}), purpose: a.purpose || 'note', ...(a.taskId ? { taskId: a.taskId } : {}) }; }
sgDefineAction('gmail.draftOpen', {
  check: (a) => (Array.isArray(a.to) && a.to.length && a.to.length <= 3 && !a.bcc ? '' : 'A draft needs one to three People addresses.'),
  run(a, o) {
    const G = window.GmailDraft;
    if (G && typeof G.openEditor === 'function' && (typeof G.available !== 'function' || G.available())) {
      G.openEditor(_sgDraftPrefill(a), { title: a.editorTitle || undefined, onSaved: (res) => {
        // The ops first, then the memory (one after the other: a local save racing the server's batch is a 409).
        const accept = () => { if (o.card && res && res.ok !== false) { try { sgMemWrite(m => sgMemAccept(m, o.card.key, Date.now())); } catch (e) { /* shown again tomorrow at worst */ } } };
        if (Array.isArray(a.ops) && a.ops.length) sgApplyOps(a.ops, { client: 'suggestions' }).then(accept, accept);
        else accept();
      } });
      return { ok: true, opened: true };
    }
    return _sgMailto(a);
  },
});

/* ---------- instant (the ✓) ---------- */
function _sgCheckRange(a) {
  if (!a || !/^\d{4}-\d{2}-\d{2}$/.test(String(a.date || ''))) return 'No day.';
  if (!Number.isFinite(a.start) || !Number.isFinite(a.end) || a.end <= a.start) return 'No time.';
  if (a.start < 0 || a.end > 24 * 60) return 'A block stays inside one day.';
  if (a.end - a.start > 240) return 'A block is at most 4 hours.';
  if (a.end - a.start < 15) return 'A block is at least 15 minutes.';
  return '';
}
function _sgCheckBlock(a) {
  const r = _sgCheckRange(a);
  if (r) return r;
  if (a.date < _sgToday() || (a.date === _sgToday() && a.end <= _sgNowMin())) return 'That time has passed.';
  if (a.guests && a.guests.length) return 'A suggestion never invites anyone.';
  if (!_sgCW()) return 'The calendar cannot be written from here.';
  const can = sgCanBlock();
  if (!can.ok) return can.reason === 'stale' ? 'Update the calendar first.' : 'Connect Google Calendar first.';
  return '';
}
/** Create an own event now (no guests): CalWrite.create silent, then the link batch. Used by cal.block / cal.create. */
async function _sgCreateOwn(a, o, kind) {
  const w = _sgCW();
  const g = o.group || sgUndoGroup(o.card && o.card.key);
  const t = a.taskId && typeof getItem === 'function' ? getItem(a.taskId) : null;
  const today = _sgToday();
  const start = a.date === today ? Math.max(a.start, Math.ceil(_sgNowMin() / 5) * 5) : a.start;
  const end = a.date === today && start !== a.start ? Math.max(start + 15, Math.min(a.end + (start - a.start), a.gapEnd || a.end)) : a.end;
  if (end - start < 15) { _sgState(o, { state: 'error', message: 'That gap has passed.' }); return { ok: false, code: 'PASSED', message: 'That gap has passed.' }; }
  const title = a.title || (t ? 'Focus: ' + sgShort(effTitle(t), 80) : 'Focus time');
  const line = `${kind === 'block' ? 'Blocked' : 'Added'} ${sgHM(start)}–${sgHM(end)} · ${title}`;
  let tmpId = null;
  const off = w.onChange((ev) => { if (!tmpId && ev && ev.op === 'create' && ev.state === 'pending' && /^tmp-/.test(String(ev.id))) tmpId = ev.id; });
  const input = { title, start: sgLocalISO(a.date, start), end: sgLocalISO(a.date, end), description: a.description || '' };
  const cal = _sgPrimaryCal(); if (cal) input.calendarId = cal;
  if (a.location) input.location = String(a.location);
  const p = w.create(input, { quiet: true, silent: true });
  off();
  // This block's own remove step: a shared group (cal.blockMany, Plan my day's booking) holds one per block.
  const rm = tmpId ? { kind: 'cal-remove', id: tmpId } : null;
  if (rm) g.push(rm);                                        // an Undo while Google is still saving queues behind the create
  _sgState(o, { state: 'saving', line, sub: 'Saving to Google…', group: g, start, end, date: a.date, taskId: t ? t.id : null, eventId: tmpId });
  const res = await p;
  if (!res || res.ok === false) {
    if (rm) g.steps = g.steps.filter(s => s !== rm);         // CalWrite already put things back
    _sgState(o, { state: g.undone ? 'undone' : 'error', message: (res && res.message) || 'Google Calendar did not take it.', code: res && res.code });
    return res || { ok: false };
  }
  const id = res.event && res.event.id;
  if (rm) rm.id = id; else g.push({ kind: 'cal-remove', id });
  if (g.undone) return { ok: true, undone: true };                 // the remove queued behind the create; no link batch
  const ops = [{ op: 'event.annotate', eventId: id, origin: Object.assign({ kind, rule: a.rule || 'free-slot' }, t ? { taskId: t.id } : {}), ...(t ? { linkTasks: [t.id] } : {}) }];
  if (t && kind === 'block') ops.push({ op: 'task.plan', id: t.id, date: a.date });
  // A card's own extra ops in the same batch (S4 prep: what you owe goes on the meeting's notes); allowlisted again by sgApplyOps.
  if (Array.isArray(a.ops)) for (const op of a.ops.slice(0, 5)) if (op && SG_OPS_ALLOW.includes(op.op)) ops.push(op);
  const j = await sgApplyOps(ops, { client: 'suggestions' });
  if (g.undone) { if (j.ok && j.undo) sgUndoOps(j.undo); return { ok: true, undone: true }; }
  if (j.ok) { if (j.undo) g.push({ kind: 'ops', token: j.undo }); _sgState(o, { state: 'saved', line, sub: 'In Google Calendar', eventId: id, group: g, start, end, date: a.date, taskId: t ? t.id : null }); }
  else _sgState(o, { state: 'warn', line, sub: t ? 'Blocked. Couldn’t link it to the task' : 'Added, but not marked as yours', message: j.message, eventId: id, group: g,
    retry: () => sgApplyOps(ops, { client: 'suggestions' }).then(k => { if (k.ok) { if (k.undo) g.push({ kind: 'ops', token: k.undo }); _sgState(o, { state: 'saved', line, sub: 'In Google Calendar', eventId: id, group: g }); } return k; }) });
  return { ok: true, eventId: id, linked: !!j.ok, group: g };
}
/** An all-day own event (travel T5 "Away: Tokyo"): a.date to a.endDate (exclusive), 1-60 days, not in the past. */
function _sgCheckDays(a) {
  if (!a || !/^\d{4}-\d{2}-\d{2}$/.test(String(a.date || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(a.endDate || ''))) return 'No days.';
  const n = sgDaysBetween(a.date, a.endDate);
  if (n < 1 || n > 60) return 'An all-day event of 1 to 60 days.';
  if (a.endDate <= _sgToday()) return 'Those days have passed.';
  return '';
}
async function _sgCreateAllDay(a, o, kind) {
  const w = _sgCW();
  const g = o.group || sgUndoGroup(o.card && o.card.key);
  const line = `Added ${a.title || 'the event'}`;
  const input = { title: a.title || 'Away', start: a.date, end: a.endDate, allDay: true, description: a.description || '' };
  const cal = _sgPrimaryCal(); if (cal) input.calendarId = cal;
  _sgState(o, { state: 'saving', line, sub: 'Saving to Google…', group: g });
  const res = await w.create(input, { quiet: true, silent: true });
  if (!res || res.ok === false) { _sgState(o, { state: 'error', message: (res && res.message) || 'Google Calendar did not take it.', code: res && res.code }); return res || { ok: false }; }
  const id = res.event && res.event.id;
  g.push({ kind: 'cal-remove', id });
  const j = await sgApplyOps([{ op: 'event.annotate', eventId: id, origin: { kind, rule: a.rule || '' } }], { client: 'suggestions' });
  if (j.ok && j.undo) g.push({ kind: 'ops', token: j.undo });
  _sgState(o, { state: 'saved', line, sub: 'In Google Calendar', eventId: id, group: g });
  return { ok: true, eventId: id, group: g };
}
const _sgOwnKind = (k) => (k && /^(block|prep|travel|lunch|rest|habit)$/.test(k) ? k : 'block');
sgDefineAction('cal.block', { check: (a) => _sgCheckBlock(a), run: (a, o) => _sgCreateOwn(a, o, 'block') });
sgDefineAction('cal.create', {
  check: (a) => (a.allDay ? _sgCheckDays(a) || (a.guests && a.guests.length ? 'A suggestion never invites anyone.' : '') || (_sgCW() ? '' : 'The calendar cannot be written from here.') : _sgCheckBlock(a)),
  run: (a, o) => (a.allDay ? _sgCreateAllDay(a, o, _sgOwnKind(a.kind)) : _sgCreateOwn(a, o, _sgOwnKind(a.kind))),
});
sgDefineAction('cal.blockMany', {
  check(a) {
    const list = Array.isArray(a.blocks) ? a.blocks : [];
    if (!list.length || list.length > 3) return 'One to three blocks.';
    for (const b of list) { const r = _sgCheckBlock(b); if (r) return r; }
    return '';
  },
  async run(a, o) {
    const g = sgUndoGroup(o.card && o.card.key);
    let n = 0;
    for (const b of a.blocks) {
      const r = await _sgCreateOwn(b, Object.assign({}, o, { group: g, onState: (st) => { if (st.state === 'error') _sgState(o, st); } }), 'block');
      if (r && r.ok) n++; else break;
    }
    _sgState(o, n ? { state: 'saved', line: `Booked ${n} block${n === 1 ? '' : 's'}`, sub: 'In Google Calendar', group: g } : { state: 'error', message: 'Nothing was booked.' });
    return { ok: n > 0, group: g };
  },
});
/** Only events the dashboard made (eventMeta origin) with no guests may be moved, resized or removed. */
function _sgOwnEventCheck(id) {
  const meta = state.eventMeta && state.eventMeta[id];
  if (!meta || !meta.origin) return 'Only blocks the dashboard made can be changed from a suggestion.';
  const w = _sgCW();
  if (!w) return 'The calendar cannot be written from here.';
  let guests = [];
  try { guests = typeof w.guests === 'function' ? (w.guests(id) || []) : []; } catch (e) { guests = []; }
  if (guests.length) return 'This event has guests: change it from the event itself.';
  return '';
}
function _sgEvTimes(id) {
  const ev = typeof calEventById === 'function' ? calEventById(id) : null;
  return ev && ev.start && ev.start.dateTime ? { start: ev.start.dateTime, end: ev.end && ev.end.dateTime } : null;
}
sgDefineAction('cal.move', {
  check: (a) => _sgOwnEventCheck(a.id) || _sgCheckRange(a),
  async run(a, o) {
    const g = sgUndoGroup(o.card && o.card.key), was = _sgEvTimes(a.id);
    _sgState(o, { state: 'saving', line: `Moved to ${sgHM(a.start)}–${sgHM(a.end)}`, sub: 'Saving to Google…', group: g });
    const r = await _sgCW().move(a.id, { start: sgLocalISO(a.date, a.start), end: sgLocalISO(a.date, a.end) }, { quiet: true, silent: true });
    if (r && r.ok && was) g.push({ kind: 'cal-move-back', id: (r.event && r.event.id) || a.id, start: was.start, end: was.end });
    _sgState(o, r && r.ok ? { state: 'saved', line: `Moved to ${sgHM(a.start)}–${sgHM(a.end)}`, sub: 'In Google Calendar', group: g, eventId: a.id } : { state: 'error', message: (r && r.message) || 'Not moved.' });
    return r;
  },
});
sgDefineAction('cal.resize', {
  check: (a) => _sgOwnEventCheck(a.id) || (Number.isFinite(a.end) && a.date ? '' : 'No new end.'),
  async run(a, o) {
    const g = sgUndoGroup(o.card && o.card.key), was = _sgEvTimes(a.id);
    const r = await _sgCW().resize(a.id, { end: sgLocalISO(a.date, a.end) }, { quiet: true, silent: true });
    if (r && r.ok && was) g.push({ kind: 'cal-move-back', id: a.id, start: was.start, end: was.end });
    _sgState(o, r && r.ok ? { state: 'saved', line: `Now ends ${sgHM(a.end)}`, sub: 'In Google Calendar', group: g, eventId: a.id } : { state: 'error', message: (r && r.message) || 'Not changed.' });
    return r;
  },
});
sgDefineAction('cal.remove', {
  check: (a) => _sgOwnEventCheck(a.id),
  async run(a, o) {
    const ev = typeof calEventById === 'function' ? calEventById(a.id) : null;
    const meta = JSON.parse(JSON.stringify((state.eventMeta && state.eventMeta[a.id]) || {}));
    const g = sgUndoGroup(o.card && o.card.key);
    const r = await _sgCW().remove(a.id, { quiet: true, silent: true });
    if (r && r.ok && ev && ev.start && ev.start.dateTime) {
      g.push({ kind: 'cal-recreate', fields: { title: ev.summary || '', start: ev.start.dateTime, end: ev.end && ev.end.dateTime, description: ev.description || '', calendarId: ev.calendarId }, meta });
    }
    _sgState(o, r && r.ok ? { state: 'saved', line: 'Removed the block', sub: 'From Google Calendar', group: g } : { state: 'error', message: (r && r.message) || 'Not removed.' });
    return r;
  },
});
/** RSVP: someone is told, so the card asks first (o.confirmed = the second press). */
sgDefineAction('cal.rsvp', {
  check(a, o) {
    if (!['accepted', 'declined', 'tentative'].includes(a.response)) return 'Going, Maybe or Can’t.';
    const w = _sgCW();
    if (!w || typeof w.rsvp !== 'function') return 'The calendar cannot be written from here.';
    const can = typeof w.canRsvp === 'function' ? w.canRsvp(a.id) : { ok: true };
    if (!can || !can.ok) return (can && can.reason) || 'You cannot answer this invitation from here.';
    if (!o || o.confirmed !== true) return 'Press again to send it.';
    return '';
  },
  async run(a, o) {
    const r = await _sgCW().rsvp(a.id, a.response, { quiet: true });
    _sgState(o, r && r.ok ? { state: 'saved', line: { accepted: 'You said yes', declined: 'You said no', tentative: 'You said maybe' }[a.response], sub: 'Change it from the event', eventId: a.id } : { state: 'error', message: (r && r.message) || 'Not sent.' });
    return r;
  },
});
/** Data changes through the actions layer; Undo by token. */
sgDefineAction('ops', {
  check(a) {
    const ops = Array.isArray(a.ops) ? a.ops : [];
    if (!ops.length) return 'Nothing to apply.';
    const bad = ops.find(op => !op || !SG_OPS_ALLOW.includes(op.op));
    if (bad) return `"${bad && bad.op}" is not something a suggestion may do.`;
    const upd = ops.find(op => op.op === 'task.update' && Object.keys(op).some(k => !['op', 'id', 'status'].includes(k)));
    if (upd) return 'A suggestion may only change a task’s status.';
    const pu = ops.find(op => op.op === 'person.update' && Object.keys(op).some(k => !['op', 'id', 'tz'].includes(k)));
    if (pu) return 'A suggestion may only set a person’s time zone.';
    return '';
  },
  async run(a, o) {
    const g = o.group || sgUndoGroup(o.card && o.card.key);
    _sgState(o, { state: 'saving', line: a.line || 'Saving…', group: g });
    const j = await sgApplyOps(a.ops, { client: 'suggestions' });
    if (j.ok) { if (j.undo) g.push({ kind: 'ops', token: j.undo }); _sgState(o, { state: 'saved', line: a.line || j.summary || 'Done', sub: a.sub || '', group: g }); }
    else _sgState(o, { state: j.cancelled ? 'undone' : 'error', message: j.message, candidates: j.candidates });
    if (j.ok && a.then && a.then.type === 'task.open') sgRun(a.then, o.card, { from: o.from, count: false });
    return j;
  },
});
/** A Gmail draft (never sent): window.GmailDraft.create when the draft path is there; else the mail app. */
sgDefineAction('gmail.draft', {
  check: (a) => (Array.isArray(a.to) && a.to.length && a.to.length <= 3 && !a.bcc ? '' : 'A draft needs one to three People addresses.'),
  async run(a, o) {
    const G = window.GmailDraft;
    if (!G || typeof G.create !== 'function' || (typeof G.available === 'function' && !G.available())) return _sgMailto(a);
    const g = sgUndoGroup(o.card && o.card.key);
    _sgState(o, { state: 'saving', line: 'Drafting in Gmail…', group: g });
    const r = await G.create(_sgDraftPrefill(a));
    if (!r || !r.ok) { _sgState(o, { state: 'error', message: (r && r.message) || 'The draft was not saved.', code: r && r.code }); return r; }
    g.push({ kind: 'draft', id: r.draftId });
    if (Array.isArray(a.ops) && a.ops.length) { const j = await sgApplyOps(a.ops, { client: 'suggestions' }); if (j.ok && j.undo) g.push({ kind: 'ops', token: j.undo }); }
    _sgState(o, { state: 'saved', line: 'Draft saved in Gmail, not sent', sub: '', group: g, viewUrl: r.viewUrl || '' });
    return r;
  },
});
function _sgMailto(a) {
  const to = (Array.isArray(a.to) ? a.to : [a.to]).filter(x => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(String(x || ''))).slice(0, 3);
  if (!to.length) return { ok: false, message: 'No email address.' };
  const q = [];
  if (a.subject) q.push('subject=' + encodeURIComponent(String(a.subject).slice(0, 180)));
  if (a.body) q.push('body=' + encodeURIComponent(String(a.body).slice(0, 1200)));
  const url = 'mailto:' + to.map(x => encodeURIComponent(x).replace(/%40/g, '@')).join(',') + (q.length ? '?' + q.join('&') : '');
  if (typeof hglOpenMail === 'function') hglOpenMail(url); else window.location.href = url;
  return { ok: true, opened: true, mailto: true };
}
sgDefineAction('mailto', { run: (a) => _sgMailto(a) });
/** Places: Connections, a view, a story, quick add. Only these. */
sgDefineAction('nav', {
  check(a) { return ['connections', 'view', 'story', 'quickAdd', 'clock'].includes(a.to) ? '' : 'Unknown place.'; },
  run(a, o) {
    if (a.to === 'connections') { if (window.Connections && typeof Connections.open === 'function') Connections.open(a.name || 'calendar'); else setView('connections'); }
    else if (a.to === 'view' && /^[a-z][a-z0-9:_-]{0,60}$/i.test(String(a.view || ''))) {
      _sgNavPrefill = a.prefill && typeof a.prefill === 'object' ? { view: a.view, prefill: a.prefill, at: Date.now() } : null;
      if (state.view === a.view && _sgNavPrefill) render(); else setView(a.view);
      // a.focus: scroll to and ring a row of that view ('time:home', 'person:<id>'); changes nothing (travel 5.6 request 4).
      if (a.focus && typeof trNavFocus === 'function') trNavFocus(String(a.focus).slice(0, 80));
    }
    else if (a.to === 'story' && ['morning', 'evening', 'week'].includes(a.kind) && window.Story) Story.open(a.kind);
    else if (a.to === 'story' && a.kind === 'money' && window.MoneyStory) MoneyStory.open({ period: a.period === 'week' ? 'week' : 'month', ref: /^\d{4}-\d{2}-\d{2}$/.test(String(a.ref || '')) ? a.ref : undefined });   // src/finance/28-money-story.js
    // The Dashboard time row, a proposal ({trip:{zone, until}}) ticked for Save (T7); without the override, Windows' own page.
    else if (a.to === 'clock') { if (typeof ClockOverride !== 'undefined' && ClockOverride.ready()) ClockOverride.openSettings(a.proposal || null); else window.open('ms-settings:dateandtime'); }
    else if (a.to === 'quickAdd' && typeof openQuickAddDialog === 'function') openQuickAddDialog(String(a.prefill || ''), { multi: !!a.multi, onCreated: typeof a.onCreated === 'function' ? a.onCreated : undefined });
    return { ok: true, opened: true };
  },
});
/**
 * The zone the dashboard shows (travel T7 "Use Tokyo time until Fri 9 Oct", "Keep London time"):
 * {follow:'system'|'home'|'zone', zone?, trip?:{zone, until}} saved as config.time through
 * ClockOverride (87-clock-override.js). Undo puts the old config.time back.
 */
sgDefineAction('time.follow', {
  check: (a) => (typeof ClockOverride === 'undefined' ? 'The dashboard cannot change its time zone here.' : ClockOverride.check(a)),
  async run(a, o) {
    const g = o.group || sgUndoGroup(o.card && o.card.key);
    _sgState(o, { state: 'saving', line: 'Saving…', group: g });
    const r = await ClockOverride.set(a, { quiet: true });
    if (r.ok) { if (!r.same) g.push({ kind: 'time', before: r.before }); _sgState(o, { state: 'saved', line: ClockOverride.describe(r.after), sub: '', group: g }); }
    else _sgState(o, { state: 'error', message: r.message });
    return r;
  },
});
/**
 * A view opened by a suggestion with fields to fill in (nav {to:'view', view, prefill}: travel T13
 * the person's time zone, T14 the trip). The view takes it once, within 30 s: sgTakePrefill(view).
 */
let _sgNavPrefill = null;
function sgTakePrefill(view) {
  const p = _sgNavPrefill;
  if (!p || p.view !== view || Date.now() - p.at > 30000) return null;
  _sgNavPrefill = null;
  return p.prefill;
}
/**
 * A selectList preview of proposed changes, all ticked (travel T4, T10, T11): a.rows = [{id, label,
 * sub, ops}] (ops allowlisted). Apply selected runs the ticked rows' ops as ONE batch with Undo;
 * nothing changes until then.
 */
sgDefineAction('list.open', {
  check(a) {
    const rows = Array.isArray(a.rows) ? a.rows : [];
    if (!rows.length || rows.length > 25) return 'One to 25 changes.';
    for (const r of rows) {
      const bad = (Array.isArray(r && r.ops) ? r.ops : [null]).find(op => !op || !SG_OPS_ALLOW.includes(op.op) || op.op === 'person.update');
      if (bad !== undefined) return 'That change is not something a suggestion may do.';
    }
    return '';
  },
  run(a, o) {
    if (typeof openDialog !== 'function' || typeof selectList !== 'function') return { ok: false, message: 'The list is not available.' };
    const key = 'sg-list:' + ((o.card && o.card.key) || a.title || '');
    openDialog({
      title: String(a.title || 'Suggested changes').slice(0, 120),
      body(el, close) {
        const list = document.createElement('div');
        list.className = 'sg-list';
        list.innerHTML = a.rows.map(r => `<div class="sg-list-row" data-sel-id="${escAttr(String(r.id))}"><span class="sg-list-l">${esc(String(r.label || ''))}</span><span class="sg-list-s muted">${esc(String(r.sub || ''))}</span></div>`).join('');
        el.appendChild(list);
        selectList(list, { key, defaultOn: true, label: a.title || 'Suggested changes',
          apply: { label: a.applyLabel || 'Apply selected', icon: 'check', async run(ids) {
            const ops = a.rows.filter(r => ids.includes(String(r.id))).flatMap(r => r.ops);
            const j = await sgApplyOps(ops, { client: 'suggestions' });
            if (!j.ok) { if (j.cancelled) return { done: [] }; throw Object.assign(new Error(j.message || 'That did not work.'), { code: j.code }); }
            if (o.card) sgCountActed(o.card);
            close();
            toast(`${a.line || 'Done'}${ids.length !== a.rows.length ? ` (${ids.length} of ${a.rows.length})` : ''}`, { kind: 'ok', icon: 'check', timeout: 9000,
              action: j.undo ? { label: 'Undo', run: () => sgUndoOps(j.undo).then(u => { if (u.ok) toast('Undone', { kind: 'ok', icon: 'undo-2' }); }) } : undefined });
            return { done: ids };
          } } });
      },
      actions: [{ label: 'Close', run: () => true }],
    });
    return { ok: true, opened: true };
  },
});
/** "Not a trip" (travel T14): TravelStore.notTrip (69-travel.js), one saveData step; Undo puts state.travel back. */
sgDefineAction('trip.forget', {
  check: (a) => (typeof TravelStore === 'undefined' ? 'Travel is not available here.' : a && /^[a-z0-9-]{3,60}$/i.test(String(a.id || '')) ? '' : 'No trip.'),
  async run(a, o) {
    const g = o.group || sgUndoGroup(o.card && o.card.key);
    const before = state.travel ? JSON.parse(JSON.stringify(state.travel)) : undefined;
    const r = await TravelStore.notTrip(a.id, { forget: a.mode === 'forget', quiet: true });
    if (r && r.ok !== false) { g.push({ kind: 'travel', before }); _sgState(o, { state: 'saved', line: a.mode === 'forget' ? 'Trip forgotten' : 'Not a trip', sub: 'Your events, tasks and payments are unchanged', group: g }); }
    else _sgState(o, { state: 'error', message: (r && r.message) || 'That did not work.' });
    return r || { ok: false };
  },
});
/** Read the calendar / inbox again (read-only: nothing to undo). */
sgDefineAction('store.refresh', {
  run(a, o) {
    const s = a.store === 'inbox' ? (typeof InboxStore !== 'undefined' ? InboxStore : null) : (typeof CalStore !== 'undefined' ? CalStore : null);
    if (s && typeof s.update === 'function') s.update({ force: true });
    _sgState(o, { state: 'saved', line: a.store === 'inbox' ? 'Updating the inbox…' : 'Updating the calendar…', sub: '' });
    return { ok: true };
  },
});
/** "Keep suggesting these?" Yes / No. */
sgDefineAction('suggest.keep', {
  run(a) {
    _sgStatsWrite(s => sgStatsKeep(s, a.rule, !!a.yes));
    if (!a.yes) sgMemWrite(m => sgMemRule(m, a.rule, 'off', _sgToday()), 'Turned off. Settings > Suggestions turns it back on.');
    else if (typeof sgRefresh === 'function') sgRefresh();
    return { ok: true };
  },
});

/* ---------- the prefilled event card saved: link it back (46-cal-event-edit.js calls this) ---------- */
/**
 * After the event card (create mode, opened by a suggestion) saved the event: mark it as
 * the dashboard's own, link the task and plan it for the event's day, then one toast
 * whose Undo removes the event and puts the task back. `d` = the card's draft
 * (d.link = {taskId, origin, key}); r = CalWrite.create's result.
 */
async function sgAfterEventCreate(r, d) {
  const link = d && d.link;
  if (!link || !r || !r.event || !r.event.id) return;
  const id = r.event.id;
  const g = sgUndoGroup(link.key || '');
  g.push({ kind: 'cal-remove', id });
  const t = link.taskId && typeof getItem === 'function' ? getItem(link.taskId) : null;
  let date = '', range = '';
  try {
    const s = r.event.start && (r.event.start.dateTime || r.event.start.date);
    const e = r.event.end && (r.event.end.dateTime || r.event.end.date);
    const sd = Clock.parts(Date.parse(s)), ed = Clock.parts(Date.parse(e));   // wall times in the dashboard's zone
    date = r.event.allDay || (r.event.start && r.event.start.date) ? String(r.event.start.date).slice(0, 10) : sd.iso;
    if (!(r.event.start && r.event.start.date)) range = `${sgHM(sd.h * 60 + sd.mi)}–${sgHM(ed.h * 60 + ed.mi)}`;
  } catch (e) { date = _sgToday(); }
  const origin = Object.assign({ kind: (link.origin && link.origin.kind) || 'block' }, link.origin && link.origin.rule ? { rule: link.origin.rule } : {}, t ? { taskId: t.id } : {});
  // Guests added in the card make it a meeting, not one of the dashboard's own blocks: link the task only.
  const guests = (Array.isArray(r.event.attendees) ? r.event.attendees : []).filter(a => a && !a.self).length;
  if (guests && !t) return;
  const ops = [{ op: 'event.annotate', eventId: id, ...(guests ? {} : { origin }), ...(t ? { linkTasks: [t.id] } : {}) }];
  if (t && origin.kind === 'block' && date) ops.push({ op: 'task.plan', id: t.id, date });
  for (const op of (link.key && _sgOpenOps.get(link.key)) || []) if (op && SG_OPS_ALLOW.includes(op.op)) ops.push(op);
  if (link.key) _sgOpenOps.delete(link.key);
  const j = await sgApplyOps(ops, { client: 'suggestions' });
  if (j.ok && j.undo) g.push({ kind: 'ops', token: j.undo });
  if (link.key && typeof sgCountActed === 'function') sgCountActed({ rule: (link.origin && link.origin.rule) || 'free-slot', key: link.key });
  const what = `${origin.kind === 'block' ? 'Blocked' : 'Added'}${range ? ' ' + range : ''} · ${String(r.event.summary || d.title || '').slice(0, 60)}`;
  toast(j.ok ? what : what + '. Couldn’t link it to the task.', { kind: j.ok ? 'ok' : 'err', icon: 'calendar-check', timeout: 9000, action: { label: 'Undo', run: () => g.undo().then((u) => { if (u && u.ok) toast('Undone', { kind: 'ok', icon: 'undo-2' }); }) } });
}

/* ---------- CalWrite changes repaint the engine's surfaces ---------- */
function _sgWatchCalw() {
  const w = _sgCW();
  if (!w || _sgWatchCalw.on) return;
  _sgWatchCalw.on = true;
  try { w.onChange(() => { _sgCalwTick++; }); } catch (e) { _sgWatchCalw.on = false; }
}
