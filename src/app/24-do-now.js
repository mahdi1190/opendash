/* ============================================================
   WHAT CAN I DO NOW? (owner: lists). The 'now' task view: open tasks that
   fit where you are (contexts), your energy and the time you have, most
   urgent first (the view's sort: due date, then priority). Choices are a
   synced preference (state.uiPrefs.doNow {ctx: [ids], energy: ''|'low'|'high',
   mins: 0|15|30|60|120}): set them on the phone, the laptop knows.
   Rules:
     where   a task with no context fits anywhere; with contexts, one must be chosen
     energy  low: no high-energy tasks; high: no low-energy ones
     time    the estimate must fit (no estimate counts as 30 min)
     later   a task planned for a later day, or not yet started (startDate), waits
     doNowScope(item, today)   the rule above (21-task-query.js inViewScope via extraViewScope)
     doNowDefaults()           what a task added here gets (the one context, the energy)
     doNowStrip()              the choices above the list (31-task-views.js header strip)
     doNowAsQuery()            the choices as search operators (Save as smart list)
   ============================================================ */
const DO_NOW_TIMES = [[15, '15m'], [30, '30m'], [60, '1h'], [120, '2h'], [0, 'Any']];
const DO_NOW_UNKNOWN_MINS = 30;
let _dnMemo = null;   // read once per render pass (the sidebar counts call it per task)
function doNowPrefs() {
  if (_dnMemo && Date.now() - _dnMemo.at < 40) return _dnMemo.v;
  const p = typeof uiPrefGet === 'function' ? uiPrefGet('doNow') : null;
  const o = p && typeof p === 'object' ? p : {};
  const v = {
    ctx: Array.isArray(o.ctx) ? o.ctx.filter(x => typeof x === 'string') : [],
    energy: o.energy === 'low' || o.energy === 'high' ? o.energy : '',
    mins: DO_NOW_TIMES.some(t => t[0] === o.mins) ? o.mins : 0,
  };
  _dnMemo = { at: Date.now(), v };
  return v;
}
function doNowActive() { const p = doNowPrefs(); return !!(p.ctx.length || p.energy || p.mins); }
function doNowSet(patch) {
  const next = Object.assign({}, doNowPrefs(), patch);
  _dnMemo = null;
  if (typeof uiPrefSet === 'function') uiPrefSet('doNow', next);
  else { state.uiPrefs = Object.assign({}, state.uiPrefs || {}, { doNow: next }); saveUI(); }
  render();
}
function doNowScope(item, today) {
  if (!item || statusOf(item.id) === 'done') return false;
  today = today || todayStr();
  if (item.plannedFor && item.plannedFor > today) return false;
  if (item.startDate && item.startDate > today) return false;
  const p = doNowPrefs();
  const cx = effContexts(item);
  if (p.ctx.length && cx.length && !cx.some(c => p.ctx.includes(c))) return false;
  const en = effEnergy(item);
  if (p.energy === 'low' && en === 'high') return false;
  if (p.energy === 'high' && en === 'low') return false;
  if (p.mins && (Number(item.estimate) || DO_NOW_UNKNOWN_MINS) > p.mins) return false;
  return true;
}
function doNowDefaults() {
  const p = doNowPrefs();
  const d = {};
  if (p.ctx.length === 1) d.contexts = p.ctx.slice();
  if (p.energy) d.energy = p.energy;
  return d;
}
function doNowAsQuery() {
  const p = doNowPrefs();
  return [p.ctx.length === 1 ? '@' + p.ctx[0] : '', p.energy ? 'energy:' + p.energy : '', p.mins ? 'est:<=' + p.mins : ''].filter(Boolean).join(' ');
}
function _doNowHits() { return getAllItems().filter(i => matchesView(i, 'now')); }
function doNowStrip() {
  const p = doNowPrefs();
  const box = document.createElement('div'); box.className = 'dn-strip';
  const row = (label, build) => {
    const r = document.createElement('div'); r.className = 'dn-row';
    const l = document.createElement('span'); l.className = 'dn-lbl'; l.textContent = label;
    r.appendChild(l); build(r); box.appendChild(r);
  };
  const pill = (r, o) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-lg dn-pill' + (o.on ? ' on' : '');
    b.setAttribute('aria-pressed', o.on ? 'true' : 'false');
    b.innerHTML = (o.icon ? icon(o.icon, 'i-xs') : '') + `<span>${esc(o.label)}</span>`;
    if (o.title) b.title = o.title;
    b.onclick = o.run;
    r.appendChild(b);
  };
  row('Where', (r) => {
    pill(r, { label: 'Anywhere', icon: 'compass', on: !p.ctx.length, title: 'Every context', run: () => { if (p.ctx.length) doNowSet({ ctx: [] }); } });
    for (const c of ctxList()) pill(r, { label: c.label, icon: c.icon, on: p.ctx.includes(c.id), title: `Tasks for @${c.id} (and those with no context)`,
      run: () => doNowSet({ ctx: p.ctx.includes(c.id) ? p.ctx.filter(x => x !== c.id) : [...p.ctx, c.id] }) });
  });
  row('Energy', (r) => {
    pill(r, { label: 'Low', icon: 'leaf', on: p.energy === 'low', title: 'Leave out tasks marked high energy', run: () => doNowSet({ energy: p.energy === 'low' ? '' : 'low' }) });
    pill(r, { label: 'Normal', icon: 'zap', on: !p.energy, run: () => { if (p.energy) doNowSet({ energy: '' }); } });
    pill(r, { label: 'High', icon: 'flame', on: p.energy === 'high', title: 'Leave out tasks marked low energy: ready for a big one', run: () => doNowSet({ energy: p.energy === 'high' ? '' : 'high' }) });
  });
  row('Time', (r) => {
    for (const [m, l] of DO_NOW_TIMES) pill(r, { label: l, icon: m ? 'timer' : 'hourglass', on: p.mins === m, title: m ? `Tasks that take ${l} or less (no estimate counts as ${DO_NOW_UNKNOWN_MINS} min)` : 'Any length', run: () => { if (p.mins !== m) doNowSet({ mins: m }); } });
  });
  // The summary: how many fit, how many are due, the time they add up to, and "Pick one for me".
  const hits = _doNowHits();
  const due = hits.filter(i => { const d = daysUntil(effDate(i)); return d !== null && d <= 0; }).length;
  const mins = hits.reduce((a, i) => a + (Number(i.estimate) || 0), 0);
  const sum = document.createElement('div'); sum.className = 'dn-sum';
  sum.innerHTML = `<span>${icon('target', 'i-xs')}<b>${hits.length}</b> ${hits.length === 1 ? 'task fits' : 'tasks fit'}</span>`
    + (due ? `<span class="dn-due">${icon('calendar', 'i-xs')}${due} due today or earlier</span>` : '')
    + (mins ? `<span>${icon('timer', 'i-xs')}${esc(fmtEstimate(mins))} estimated</span>` : '');
  if (hits.length) {
    const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'btn btn-secondary btn-sm dn-pick';
    pick.innerHTML = icon('sparkles') + '<span>Pick one for me</span>';
    pick.onclick = () => doNowPick();
    sum.appendChild(pick);
  }
  box.appendChild(sum);
  return box;
}
/** The best fit, with a little spin through the candidates first (skipped under reduced motion). */
let _dnLastPick = null;
function doNowPick() {
  const hits = sortItems(_doNowHits(), 'date', 'now');
  if (!hits.length) return;
  // The most urgent few, with priority and quick wins first; never the same one twice in a row.
  const score = (i) => { const d = daysUntil(effDate(i)); const pr = { p1: 3, p2: 2, p3: 1 }[effPriority(i)] || 0; return (d !== null && d <= 0 ? 6 : d !== null && d <= 2 ? 3 : 0) + pr + (Number(i.estimate) && Number(i.estimate) <= 15 ? 1 : 0) + (statusOf(i.id) === 'doing' ? 2 : 0); };
  const top = hits.slice().sort((a, b) => score(b) - score(a)).slice(0, 3);
  const pool = top.length > 1 ? top.filter(i => i.id !== _dnLastPick) : top;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  _dnLastPick = pick.id;
  const reduced = window.Motion && Motion.prefersReduced();
  const rows = [...document.querySelectorAll('#main-body .task[data-id]')];
  const land = () => {
    rows.forEach(r => r.classList.remove('dn-spin'));
    const el = document.querySelector(`#main-body .task[data-id="${CSS.escape(pick.id)}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      el.classList.add('dn-picked'); setTimeout(() => el.classList.remove('dn-picked'), 2400);
      _lastSelectedTaskId = pick.id;
    }
    toast(`How about “${effTitle(pick).slice(0, 60)}”?`, { icon: 'sparkles', action: { label: 'Open', run: () => openTask(pick.id) } });
  };
  if (reduced || rows.length < 2) { land(); return; }
  let n = 0; const steps = Math.min(8, rows.length * 2);
  const tick = () => {
    rows.forEach(r => r.classList.remove('dn-spin'));
    if (n >= steps) { land(); return; }
    rows[n % rows.length].classList.add('dn-spin'); n++;
    setTimeout(tick, 55 + n * 12);
  };
  tick();
}
registerCommand({ id: 'do-now', label: 'What can I do now?', icon: 'target', keywords: 'context energy time available next pick suggest do now', run: () => setView('now') });
registerCommand({ id: 'do-now-pick', label: 'Pick a task for me', icon: 'sparkles', keywords: 'random suggest choose next what now', run: () => { if (state.view !== 'now') setView('now'); setTimeout(doNowPick, 120); } });
