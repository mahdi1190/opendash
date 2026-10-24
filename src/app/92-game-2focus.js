/* ============================================================
   GAME: the FOCUS TIMER (2.16). A stopwatch on one task that logs the time
   actually spent and learns how long things really take ("you usually take
   1.5x your estimate on writing"). Reachable from the task card (its Focus
   button and the Game panel in the side column) and the command palette.
   Separate from the 25-minute focus block (78-anim-moments.js), which grows
   a scene and has no task.

     state.game.run = {t: taskId, s: start of this stretch, f: first start, acc: ms before it, p: paused at | 0}
                      synced: started on one computer, it shows (and stops) on the other too
     state.game.focus[id] = {t, s, ms, e, k, d}   one logged session (92-game-1core.js header)

     gameFocusStart(taskId) / gameFocusPause() / gameFocusResume()
     gameFocusStop({done, quiet}) -> the session logged (a minute or more; 4 hours at most) | null
                      done: also marks the task done
     gameFocusRun() / gameFocusElapsed()      the running timer and its time so far
     gameEstimateFor(task) -> {ratio, n, kind, line, expected (min)} | null   what the timer has learned
     gameFocusPaint()  the floating timer (bottom left; above the focus block when both run)
   The timer is a tool, not a game: it works at every Fun level; XP and hints follow the level.
   ============================================================ */
const _gmT = { tick: 0, sig: '' };
/** What the timer shows (a pause or a stop made on another device changes it). */
function _gmRunSig() { const r = gameFocusRun(); return r ? `${r.t}|${r.p || 0}|${r.s}` : ''; }
function gameFocusRun() {
  const r = typeof state !== 'undefined' && state && state.game ? state.game.run : null;
  return r && typeof r === 'object' && r.t && isFinite(Number(r.s)) ? r : null;
}
function gameFocusElapsed(r) {
  r = r || gameFocusRun();
  if (!r) return 0;
  return Math.max(0, (Number(r.acc) || 0) + (r.p ? 0 : Date.now() - Number(r.s)));
}
function gameFocusStart(taskId) {
  const t = getItem(taskId);
  if (!t) return;
  const r = gameFocusRun();
  if (r && r.t === taskId) { if (r.p) gameFocusResume(); return; }
  if (r) gameFocusStop({ quiet: true });
  const g = _gmG(), now = Date.now();
  g.run = { t: taskId, s: now, f: now, acc: 0, p: 0 };
  _gmSave();
  if (statusOf(taskId) === 'todo') setStatus(taskId, 'doing');   // in progress, like the card's Start
  gameFocusPaint();
  _gmEmit('focus', { action: 'start', task: taskId });
}
function gameFocusPause() {
  const r = gameFocusRun(); if (!r || r.p) return;
  const now = Date.now();
  _gmG().run = Object.assign({}, r, { acc: (Number(r.acc) || 0) + now - Number(r.s), p: now });
  _gmSave(); gameFocusPaint();
}
function gameFocusResume() {
  const r = gameFocusRun(); if (!r || !r.p) return;
  _gmG().run = Object.assign({}, r, { s: Date.now(), p: 0 });
  _gmSave(); gameFocusPaint();
}
function _gmFmtMs(ms, clock) {
  const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  if (clock) return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
  return h ? `${h} h${m ? ' ' + m + ' min' : ''}` : `${Math.max(1, m)} min`;
}
function gameFocusStop(o) {
  o = o || {};
  const r = gameFocusRun(); if (!r) return null;
  const before = gameOn() && gameStats() ? gameStats().xp.total : 0;
  const CAP = 4 * 3600000;
  let ms = gameFocusElapsed(r);
  const capped = ms > CAP; ms = Math.min(ms, CAP);
  const g = _gmG();
  g.run = null;
  const t = getItem(r.t);
  let id = '', sess = null;
  if (ms >= 60000) {
    id = 'f' + Number(r.f || r.s).toString(36) + Math.random().toString(36).slice(2, 6);
    sess = g.focus[id] = { t: r.t, s: Number(r.f || r.s), ms: Math.round(ms), e: t && Number(t.estimate) > 0 ? Number(t.estimate) : 0, k: _gmKindOf(t), d: _gmDayOf(Number(r.f || r.s)) };
  }
  _gmSave();
  gameFocusPaint();
  _gmEmit('focus', { action: 'stop', task: r.t, ms: sess ? sess.ms : 0 });
  if (!o.quiet) {
    if (sess) {
      _gm.key = '';
      const after = gameOn() && gameStats() ? gameStats().xp.total : 0;
      const xp = Math.max(0, after - before);
      toast(`Logged ${_gmFmtMs(ms)} on “${t ? effTitle(t) : 'the task'}”${xp && gameOn() ? ` · +${xp} XP` : ''}${capped ? ' (kept to 4 hours)' : ''}`, { icon: 'timer', action: { label: 'Undo', run: () => { delete _gmG().focus[id]; _gmSave(); } } });
    } else toast('Focus timer stopped: under a minute, so nothing was logged', { icon: 'timer' });
  }
  if (o.done && t && statusOf(r.t) !== 'done') toggleDone(r.t);
  _gmCheckSoon();
  return sess;
}
/** The time logged on one task so far: {ms, n}. */
function gameFocusOn(taskId) {
  const g = _gmG(); let ms = 0, n = 0;
  for (const s of Object.values(g.focus)) if (s && s.t === taskId && Number(s.ms) > 0) { ms += Number(s.ms); n++; }
  return { ms, n };
}
/** What the timer has learned for a task like this one (its first tag, else its stream). */
function gameEstimateFor(t) {
  if (!t) return null;
  const s = gameStats(); if (!s) return null;
  const kind = _gmKindOf(t);
  const r = s.estimates.byKind[kind] && s.estimates.byKind[kind].n >= 3 ? s.estimates.byKind[kind] : null;
  if (!r) return null;
  const line = gameEstimateLine(kind, r);
  const est = Number(t.estimate) || 0;
  return { ratio: r.ratio, n: r.n, kind, line, expected: est ? Math.round(est * r.ratio) : 0 };
}
/** The next task worth focusing on: the open task in view, else the first of today's (overdue, due, planned) by priority. */
function gameFocusNextTask() {
  const open = typeof tcCurrentTaskId === 'function' ? tcCurrentTaskId() : null;
  if (open && statusOf(open) !== 'done') return open;
  if (state.selectedTaskId && getItem(state.selectedTaskId) && statusOf(state.selectedTaskId) !== 'done') return state.selectedTaskId;
  const today = todayStr(), rank = { p1: 0, p2: 1, p3: 2, p0: 3 };
  const list = (state.custom || []).filter(t => t && statusOf(t.id) !== 'done' && ((t.dueDate && t.dueDate <= today) || (t.plannedFor && t.plannedFor <= today) || statusOf(t.id) === 'doing'));
  list.sort((a, b) => (statusOf(a.id) === 'doing' ? -1 : 0) - (statusOf(b.id) === 'doing' ? -1 : 0) || (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3) || String(a.dueDate || '9').localeCompare(String(b.dueDate || '9')));
  return list[0] ? list[0].id : null;
}

/* ---------- the floating timer ---------- */
const _GM_SVG = {
  pause: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/></svg>',
  play: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
};
function gameFocusPaint() {
  const r = gameFocusRun();
  _gmT.sig = _gmRunSig();
  let el = document.getElementById('gm-timer');
  if (!r) { if (el) el.remove(); clearInterval(_gmT.tick); _gmT.tick = 0; return; }
  const t = getItem(r.t);
  if (!t) { setTimeout(() => gameFocusStop({ quiet: true }), 0); return; }   // the task was deleted
  if (!el) {
    el = document.createElement('div'); el.id = 'gm-timer'; el.className = 'gm-timer';
    el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Focus timer');
    el.innerHTML = `<span class="gm-timer-ring" aria-hidden="true"><svg viewBox="0 0 36 36"><circle class="gm-ring-bg" cx="18" cy="18" r="15.5"/><circle class="gm-ring-fg" cx="18" cy="18" r="15.5" pathLength="100"/></svg>${icon('timer', 'i-sm')}</span>`
      + '<button type="button" class="gm-timer-main" data-tip="Open the task"><b class="gm-timer-time num"></b><span class="gm-timer-title"></span><small class="gm-timer-hint"></small></button>'
      + '<button type="button" class="btn btn-ghost btn-sm btn-icon gm-timer-pp"></button>'
      + `<button type="button" class="btn btn-ghost btn-sm btn-icon gm-timer-done" aria-label="Stop, log the time and mark the task done" data-tip="Done: log the time and complete the task">${icon('circle-check')}</button>`
      + `<button type="button" class="btn btn-ghost btn-sm btn-icon gm-timer-stop" aria-label="Stop and log the time" data-tip="Stop and log the time">${icon('square')}</button>`;
    el.querySelector('.gm-timer-main').onclick = () => { const x = gameFocusRun(); if (x && typeof openTask === 'function') openTask(x.t, { from: el }); };
    el.querySelector('.gm-timer-pp').onclick = () => { const x = gameFocusRun(); if (x && x.p) gameFocusResume(); else gameFocusPause(); };
    el.querySelector('.gm-timer-done').onclick = () => gameFocusStop({ done: true });
    el.querySelector('.gm-timer-stop').onclick = () => gameFocusStop({});
    document.body.appendChild(el);
  }
  const pp = el.querySelector('.gm-timer-pp');
  pp.innerHTML = r.p ? _GM_SVG.play : _GM_SVG.pause;
  pp.setAttribute('aria-label', r.p ? 'Resume' : 'Pause'); pp.setAttribute('data-tip', r.p ? 'Resume' : 'Pause');
  el.classList.toggle('is-paused', !!r.p);
  el.querySelector('.gm-timer-title').textContent = effTitle(t);
  _gmTimerTick();
  clearInterval(_gmT.tick); _gmT.tick = 0;
  if (!r.p) _gmT.tick = setInterval(_gmTimerTick, 1000);
}
function _gmTimerTick() {
  const el = document.getElementById('gm-timer'), r = gameFocusRun();
  if (!el || !r) { clearInterval(_gmT.tick); _gmT.tick = 0; return; }
  if (document.hidden && _gmT.tick) return;
  const t = getItem(r.t); if (!t) return;
  const ms = gameFocusElapsed(r), est = Number(t.estimate) || 0;
  const learned = gameOn() ? gameEstimateFor(t) : null;
  const goal = est ? (learned && learned.expected ? learned.expected : est) : 0;
  el.querySelector('.gm-timer-time').textContent = _gmFmtMs(ms, true);
  const pct = goal ? Math.min(100, Math.round(100 * ms / (goal * 60000))) : Math.min(100, Math.round(100 * (ms % 1500000) / 1500000));
  el.querySelector('.gm-ring-fg').style.strokeDasharray = `${pct} 100`;
  el.classList.toggle('is-over', !!est && ms > est * 60000);
  const prior = gameFocusOn(r.t).ms;
  const bits = [];
  if (est) bits.push(`estimate ${fmtEstimate(est)}`);
  if (learned && learned.expected && learned.expected !== est) bits.push(`usually ~${fmtEstimate(learned.expected)}`);
  if (prior >= 60000) bits.push(`${_gmFmtMs(prior)} before`);
  if (r.p) bits.unshift('paused');
  el.querySelector('.gm-timer-hint').textContent = bits.join(' · ');
}
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('load', () => setTimeout(() => { try { gameFocusPaint(); } catch (e) { /* not booted */ } }, 600), { once: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && gameFocusRun()) _gmTimerTick(); });
}
