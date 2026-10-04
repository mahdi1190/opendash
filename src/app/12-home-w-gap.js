/* ============================================================
   HOME widget "gap": Fill the gap (WIDGETS_CATALOGUE.md 3.2).
   OWNER: the "gap" widget builder. Styles: 13-home-w-gap.css. The rules are
   pure, in 12-home-gap-logic.js (gapDay, gapCandidates, gapPlanAll, gapWords),
   tested in a VM (tests/home-w-gap.test.mjs).

   The job: "You have 25 min until Standup. Try: draft the reply (10 min)."
     S   a ring that empties as the free stretch runs out ("25 min free until
         Standup at 14:00"; "until 18:00" without a calendar; during an event
         "Busy until 14:30 · then 45 min free"), one task that fits (stream mark,
         its reason "fits 10 min"), Start, Done, Block (opens the event card) and
         Shuffle (another task; writes nothing).
     M   3 tasks with reason chips, each with Start and Done; a click picks one
         (the current row), and under them "Plan into this gap" for the picked
         task: S1's card (68-suggest-rules-s1.js sgFreeSlotCard, its length).
     L   M, plus every later gap today of 15 min or more with its best task
         ("Plan it"), plus Plan all (a selectList: tick, then book).
   The user's rule (3 Oct): blocking time is a CALENDAR EVENT, never a new
   task. The main button opens the event card in create mode, prefilled (Focus:
   <task>, the task's length, no guests, the task linked); Save books it, links
   it and plans the task for today. The small ✓ books it as it is, at once, with
   a receipt (Undo, Open, change task / length) at the top of this widget
   (sgSurfaceReceipts). Without a calendar that can be written, "Plan…" opens a
   small editor, prefilled, for a planned slot on the dashboard (setPlannedSlot:
   the deadline never moves), and its ✓ plans it at once with Undo. Plan all
   books at most 3 blocks (cal.blockMany), or plans every ticked slot as one
   undo step.
   Start = in progress (toggleDoing, Undo; "In progress" does nothing again).
   Done = homeCompleteTask. Nothing fits: 15 / 30 / 60 estimate chips on the
   top Focus tasks with no estimate (setOverride, Undo).
   Hidden outside working hours (homeWorkHours, Settings > Profile) and when no
   gap of 15 min is left today. The ring drains on the shared minute tick, in
   place; the widget repaints only when the picture changes. Settings: the
   breathing room kept before the next event (buffer) and whether tasks with no
   estimate are offered (in gaps of 45 min or more).
   ============================================================ */
const _gapSel = new Map();        // widget id -> the task picked (Shuffle, a row click), until Home is left
let _gapEd = null;                // the open "Plan…" editor: {key, close, pop}
let _gapMemo = { snap: null, pk: '', val: null };

registerHomeWidget({
  id: 'gap', title: 'Fill the gap', icon: 'zap', order: 110, group: 'time',
  description: 'A task that fits the free time before your next event',
  emptyHint: 'Appears during your working hours when you have free time',
  sizes: ['s', 'm', 'l'], defaultSize: 's', defaultHidden: true, fresh: true,
  aliases: ['gap', 'fill gap', 'free time', 'spare time', 'what next', 'what now'],
  defaults: { buffer: 5, allowUnestimated: true },
  available: () => true,
  sample: (kit) => _gapSample(kit),
  render(el, ctx) { return _gapRender(el, ctx || {}); },
  settings(anchor, ctx) { _gapSettings(anchor, ctx); },
  unmount() { _gapSel.clear(); _gapMemo = { snap: null, pk: '', val: null }; if (_gapEd) { try { _gapEd.close(); } catch (e) { /* gone */ } _gapEd = null; } },
});

/* ---------- the model ---------- */
function _gapPrefs(ctx) {
  const p = (ctx && ctx.prefs) || homePrefs(ctx);
  const b = Math.round(Number(p.buffer));
  return { buffer: Number.isFinite(b) ? Math.max(0, Math.min(30, b)) : 5, allowUnestimated: p.allowUnestimated !== false };
}
/** Can a block go into the calendar? 'cal' (S1's card; it says Update calendar when stale) or 'slot' (a planned slot here). */
function _gapMode() {
  const can = typeof sgCanBlock === 'function' ? sgCanBlock() : { ok: false, reason: 'none' };
  return can.ok || can.reason === 'stale' ? 'cal' : 'slot';
}
/** Everything the widget shows, from the suggestions snapshot (memoised with it: the minute, saves, the calendar). */
function _gapModel(prefs) {
  const snap = sgSnapshot();
  const wh = homeWorkHours();
  const pk = JSON.stringify([prefs, wh.startMin, wh.endMin, wh.days]);
  if (_gapMemo.snap === snap && _gapMemo.pk === pk) return _gapMemo.val;
  const today = snap.now.date, now = snap.now.min;
  const blocks = [];
  for (const e of (snap.cal.days && snap.cal.days[today]) || []) if (e && !e.allDay && !e.free && !e.declined) blocks.push({ start: e.start, end: e.end, title: e.title, kind: 'event' });
  for (const t of (snap.timed && snap.timed[today]) || []) { const tk = sgTask(snap, t.id); blocks.push({ start: t.start, end: t.end, title: tk ? tk.title : '', kind: 'task' }); }
  const day = gapDay({ nowMin: now, workStart: wh.startMin, workEnd: wh.endMin, workDay: planIsWorkDay(wh, today), blocks });
  // Tasks with an own block still to come (S1's rule): they have their time already.
  const blocked = new Set();
  for (const iso of Object.keys((snap.cal && snap.cal.days) || {})) {
    if (iso < today) continue;
    for (const e of snap.cal.days[iso] || []) {
      if (!e || !e.origin || (iso === today && e.end <= now)) continue;
      if (e.origin.taskId) blocked.add(e.origin.taskId);
      for (const id of e.linked || []) blocked.add(id);
    }
  }
  const o = { today, buffer: prefs.buffer, allowUnestimated: prefs.allowUnestimated, focus: snap.focus || [], skip: [...blocked] };
  const len = day.cur ? day.cur.end - day.cur.start : 0;
  const cands = day.cur ? gapCandidates(len, snap.tasks, Object.assign({}, o, { limit: 5 })) : [];
  // Nothing fits: the top Focus tasks with no estimate get 15 / 30 / 60 chips.
  const noEst = cands.length ? [] : (snap.focus || []).map(id => sgTask(snap, id))
    .filter(t => t && !(Number(t.estimate) > 0) && !t.waiting && !t.snoozed && !t.notStarted).slice(0, 3)
    .map(t => ({ id: t.id, title: t.title, stream: t.stream || '' }));
  const val = { snap, today, now, day, cands, noEst, o, len, preview: false };
  _gapMemo = { snap, pk, val };
  return val;
}
/** The picked task: the one Shuffle or a click chose, while it is still a candidate; else the best. */
function _gapPicked(ctx, list) {
  const id = _gapSel.get(ctx.id);
  return list.find(c => c.id === id) || list[0] || null;
}
/** The minute tick's signature: repaint when it changes (the gap, the tasks that fit, a block's 5-minute start). */
function _gapTickSig(m) { return [m.day.sig, m.cands.map(c => c.id).join(','), Math.ceil(m.now / 5) * 5].join('#'); }

/* ---------- render ---------- */
function _gapRender(el, ctx) {
  if (ctx.preview) { const m = homeSample(ctx.id); if (!m) return false; _gapPaint(el, ctx, m); return true; }
  if (typeof sgSnapshot !== 'function' || typeof gapDay !== 'function') return false;
  // Hidden for now: the minute tick still looks, so the widget comes back when the working day starts or a gap opens.
  // A block just booked here keeps it on screen until its receipt (Undo) folds, even when it filled the last gap.
  const hide = () => {
    homeTick(ctx, () => (_gapInHours() && _gapModel(_gapPrefs(ctx)).day.cur ? 'rerender' : undefined));
    if (typeof sgSurfaceReceipts !== 'function') return false;
    const card = _gapCard(el, ctx);
    const body = card.querySelector('.hgap-b');
    if (!sgSurfaceReceipts(body, 'gap')) { el.innerHTML = ''; return false; }
    body.insertAdjacentHTML('beforeend', `<p class="hgap-none-t">${_gapInHours() ? 'No more free time today.' : 'Your working day is over.'}</p>`);
    return true;
  };
  if (!_gapInHours()) return hide();                                                // outside working hours
  const cs = homeCalStatus(() => { if (typeof state !== 'undefined' && state.view === 'home') homeRerenderWidget(ctx.id); });
  if (cs.loading) {
    const card = _gapCard(el, ctx);
    card.querySelector('.hgap-b').innerHTML = '<div class="hgap-skel" role="status" aria-label="Reading your calendar"><span class="skeleton"></span><span class="skeleton"></span></div>';
    return true;
  }
  const prefs = _gapPrefs(ctx);
  const m = _gapModel(prefs);
  if (!m.day.cur) return hide();                                                  // no gap of 15 min left today
  if (!(m.snap.tasks || []).length) return hide();                                // no open tasks at all (a new user)
  m.cal = cs;
  _gapPaint(el, ctx, m);
  const card = el.querySelector('.hgap');
  if (card) card.dataset.tick = _gapTickSig(m);
  homeTick(ctx, () => {
    const c = el.querySelector('.hgap');
    if (!c || !c.isConnected) return undefined;
    if (!_gapInHours()) return 'rerender';
    const m2 = _gapModel(_gapPrefs(ctx));
    if (!m2.day.cur || _gapTickSig(m2) !== c.dataset.tick) return 'rerender';
    _gapTop(c.querySelector('.hgap-top'), m2, false);                              // the ring drains in place
    return undefined;
  });
  return true;
}
function _gapInHours() {
  const wh = homeWorkHours(), now = homeNowMin();
  return homeWorkDay(todayStr()) && now >= wh.startMin && now < wh.endMin;
}
function _gapCard(el, ctx) {
  const card = document.createElement('section');
  card.className = `card home-card hgap hgap--${ctx.size || 's'}`;
  card.innerHTML = `<div class="card-h hgap-h">${icon('zap')}<h3>Fill the gap</h3><span class="spacer"></span></div><div class="card-b hgap-b"></div>`;
  el.appendChild(card);
  return card;
}

function _gapPaint(el, ctx, m) {
  const size = ctx.size || 's';
  const card = _gapCard(el, ctx);
  card.classList.toggle('is-busy', m.day.state === 'busy');
  card.dataset.sig = m.day.sig;
  const body = card.querySelector('.hgap-b');
  // Blocks just booked here (✓): Undo, Open, the chooser, until they fold.
  const rec = !m.preview && typeof sgSurfaceReceipts === 'function' ? sgSurfaceReceipts(body, 'gap') : null;
  const shown = new Set(rec ? [...rec.querySelectorAll('[data-sg-key]')].map(x => x.dataset.sgKey) : []);
  const top = document.createElement('div'); top.className = 'hgap-top';
  body.appendChild(top);
  _gapTop(top, m, !!ctx.firstPaint);
  const pick = _gapPicked(ctx, size === 's' ? m.cands : m.cands.slice(0, 3));
  if (!m.cands.length) body.appendChild(_gapNothing(m, ctx));
  else if (size === 's') body.appendChild(_gapOne(m, ctx, pick));
  else {
    body.appendChild(_gapList(m, ctx, pick));
    const plan = _gapPlanRow(m, ctx, m.day.cur, pick, shown, 'cur');
    if (plan) { const box = document.createElement('div'); box.className = 'hgap-plan'; box.innerHTML = `<div class="hgap-sub-h">Plan into this gap</div>`; box.appendChild(plan); body.appendChild(box); }
  }
  if (size === 'l') { const later = _gapLater(m, ctx, pick, shown); if (later) body.appendChild(later); }
  const foot = _gapFoot(m);
  if (foot) body.appendChild(foot);
  // A suggestion card a rule hosts here (inPlace: 'gap'), M and up; nothing when there is none.
  if (!m.preview && size !== 's' && typeof homeSuggestSlot === 'function') homeSuggestSlot(body, ctx, { gap: { start: m.day.cur.start, end: m.day.cur.end }, taskId: pick ? pick.id : null });
  if (!m.preview) {
    ctx.enterNew(body.querySelectorAll('.hgap-row[data-flip], .hgap-lrow[data-flip]'), (x) => x.dataset.flip);
    homeRowKeys(body, {
      open: (id, row) => { if (!_gapIsTask(id)) return; ctx.openTask(id, row); },
      done: (id, row) => { if (_gapIsTask(id)) _gapDone(id, row); },
      keys: { s: (id, row) => { const b = row.querySelector('[data-act="start"]'); if (b) b.click(); } },
    });
  }
}
function _gapIsTask(id) { return !!(id && typeof getItem === 'function' && getItem(id)); }

/* ---------- the ring and its words ---------- */
function _gapTop(top, m, sweep) {
  if (!top) return;
  const now = m.now;
  const w = gapWords(m.day, now);
  const r = m.day.state === 'free' ? gapRing(m.day.cur, now) : { frac: 1 };
  const pct = Math.round(r.frac * 100);
  const ring = top.querySelector('.hgap-ring');
  if (ring) {
    // The tick: text and the ring in place, nothing re-enters.
    ring.setAttribute('aria-label', w.aria);
    const svg = ring.querySelector('svg'); if (svg) svg.style.setProperty('--p', pct);
    const b = ring.querySelector('.hgap-num b'), u = ring.querySelector('.hgap-num small');
    if (b && b.textContent !== w.big) b.textContent = w.big;
    if (u && u.textContent !== w.unit) u.textContent = w.unit;
    const l = top.querySelector('.hgap-line'), s = top.querySelector('.hgap-sub2');
    if (l && l.textContent !== w.line) l.textContent = w.line;
    if (s && s.textContent !== w.sub) s.textContent = w.sub;
    return;
  }
  top.innerHTML = `<div class="hgap-ring${m.day.state === 'busy' ? ' is-later' : ''}" role="img" aria-label="${escAttr(w.aria)}">`
    + `<svg class="hgap-svg${sweep ? ' is-sweep' : ''}" viewBox="0 0 36 36" style="--p:${pct}" aria-hidden="true"><circle class="tr" cx="18" cy="18" r="15.9" pathLength="100"/><circle class="fl" cx="18" cy="18" r="15.9" pathLength="100"/></svg>`
    + `<span class="hgap-num" aria-hidden="true"><b>${esc(w.big)}</b><small>${esc(w.unit)}</small></span></div>`
    + `<div class="hgap-when" aria-hidden="true"><div class="hgap-line">${esc(w.line)}</div><div class="hgap-sub2">${esc(w.sub)}</div></div>`;
}

/* ---------- S: one task ---------- */
function _gapChips(c, n) {
  return (c.why || []).slice(0, n || 4).map((w, i) => `<span class="hgap-chip${i === 0 ? ' is-fit' : /overdue|due today/.test(w) ? ' is-due' : ''}">${esc(w)}</span>`).join('');
}
function _gapOne(m, ctx, c) {
  const box = document.createElement('div'); box.className = 'hgap-one';
  box.appendChild(_gapPickEl(m, ctx, c));
  return box;
}
function _gapPickEl(m, ctx, c) {
  const wrap = document.createElement('div'); wrap.className = 'hgap-pickw';
  const row = document.createElement('div');
  row.className = 'hgap-pick'; row.dataset.flip = 'gp:one';
  row.setAttribute('data-row', c.id); row.tabIndex = 0;
  row.setAttribute('aria-label', `${c.title}, ${c.why.join(', ')}. Enter opens it`);
  row.innerHTML = `<span class="hgap-mk">${typeof streamMarkHtml === 'function' ? streamMarkHtml(c.stream) : ''}</span>`
    + `<span class="hgap-pt"><span class="hgap-tt">${esc(c.title)}</span><span class="hgap-why">${_gapChips(c, 2)}</span></span>`;
  if (!m.preview) row.onclick = (e) => { if (!e.target.closest('button')) ctx.openTask(c.id, row); };
  wrap.appendChild(row);
  const acts = document.createElement('div'); acts.className = 'hgap-acts';
  acts.appendChild(_gapStartBtn(m, ctx, c, true));
  acts.appendChild(_gapDoneBtn(m, ctx, c, true, row));
  const blk = _gapBlockBtn(m, ctx, c);
  if (blk) acts.appendChild(blk);
  if (m.cands.length > 1) {
    const sh = _gapBtn('btn btn-ghost btn-sm btn-icon hgap-shuf', icon('arrow-down-up'), 'Show another task');
    sh.setAttribute('data-tip', 'Another task');
    if (!m.preview) sh.onclick = () => _gapShuffle(m, ctx, wrap);
    acts.appendChild(sh);
  }
  wrap.appendChild(acts);
  return wrap;
}
/** Shuffle: the next task that fits, in place (a 160 ms crossfade); writes nothing. */
function _gapShuffle(m, ctx, wrap) {
  if (wrap._busy) return;
  const cur = _gapPicked(ctx, m.cands);
  const i = m.cands.findIndex(c => c.id === (cur && cur.id));
  const next = m.cands[(i + 1) % m.cands.length];
  if (!next || (cur && next.id === cur.id)) return;
  _gapSel.set(ctx.id, next.id);
  const swap = () => { const n = _gapPickEl(m, ctx, next); wrap.replaceWith(n); return n; };
  homeAnnounce(`${next.title}, ${next.why.join(', ')}`);
  const quiet = !window.Motion || (typeof Motion.prefersReduced === 'function' && Motion.prefersReduced()) || document.hidden;
  if (quiet) { swap(); return; }
  wrap._busy = true;
  const out = Motion.animate(wrap, [{ opacity: 1 }, { opacity: 0 }], { duration: 80, easing: 'ease-out', fill: 'forwards' });
  const done = () => { const n = swap(); Motion.animate(n, [{ opacity: 0 }, { opacity: 1 }], { duration: 80, easing: 'ease-out' }); };
  if (out && out.finished && typeof out.finished.then === 'function') out.finished.then(done, done); else setTimeout(done, 80);
}

/* ---------- M / L: three tasks, one picked ---------- */
function _gapList(m, ctx, pick) {
  const list = document.createElement('ul'); list.className = 'hgap-list';
  list.setAttribute('aria-label', 'Tasks that fit');
  for (const c of m.cands.slice(0, 3)) {
    const on = !!pick && pick.id === c.id;
    const li = document.createElement('li');
    li.className = 'hgap-row' + (on ? ' is-on' : ''); li.dataset.flip = 'gp:' + c.id;
    li.setAttribute('data-row', c.id); li.tabIndex = 0;
    if (on) li.setAttribute('aria-current', 'true');
    li.setAttribute('aria-label', `${c.title}, ${c.why.join(', ')}${on ? ', picked' : ''}. Enter opens it, X marks it done`);
    li.innerHTML = `<span class="hgap-mk">${typeof streamMarkHtml === 'function' ? streamMarkHtml(c.stream) : ''}</span>`
      + `<span class="hgap-pt"><span class="hgap-tt">${esc(c.title)}</span><span class="hgap-why">${_gapChips(c, 3)}</span></span>`;
    const ra = document.createElement('span'); ra.className = 'hgap-ra';
    ra.appendChild(_gapStartBtn(m, ctx, c, false));
    ra.appendChild(_gapDoneBtn(m, ctx, c, false, li));
    li.appendChild(ra);
    // A click picks it for "Plan into this gap" (the picked row again: nothing happens).
    if (!m.preview) li.onclick = (e) => {
      if (e.target.closest('button') || on) return;
      _gapSel.set(ctx.id, c.id);
      ctx.rerender();
    };
    list.appendChild(li);
  }
  return list;
}

/* ---------- buttons ---------- */
function _gapBtn(cls, html, aria) {
  const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.innerHTML = html;
  if (aria) b.setAttribute('aria-label', aria);
  return b;
}
function _gapStartBtn(m, ctx, c, labelled) {
  const doing = !m.preview && typeof statusOf === 'function' && statusOf(c.id) === 'doing';
  const b = _gapBtn(labelled ? 'btn btn-secondary btn-sm hgap-start' : 'btn-icon btn-sm hgap-start', icon('circle-dot') + (labelled ? `<span>${doing ? 'In progress' : 'Start'}</span>` : ''),
    doing ? `${c.title} is in progress` : `Start ${c.title} (in progress)`);
  b.dataset.act = 'start';
  b.setAttribute('aria-pressed', doing ? 'true' : 'false');
  if (!labelled) b.setAttribute('data-tip', doing ? 'In progress' : 'Start');
  if (doing) { b.dataset.done = '1'; b.classList.add('is-done'); }
  if (!m.preview) b.onclick = () => {
    if (b.dataset.done === '1') return;                                   // already in progress: nothing to do
    homeAction(b, () => { toggleDoing(c.id); return true; }, { done: labelled ? 'In progress' : undefined, toast: `Started: ${sgShort(c.title, 48)}`, undo: true, say: `${c.title} is in progress` });
  };
  return b;
}
function _gapDoneBtn(m, ctx, c, labelled, rowEl) {
  const b = _gapBtn(labelled ? 'btn btn-ghost btn-sm hgap-done' : 'btn-icon btn-sm hgap-done', icon('circle-check') + (labelled ? '<span>Done</span>' : ''), `Mark ${c.title} done`);
  b.dataset.act = 'done';
  if (!labelled) b.setAttribute('data-tip', 'Done');
  if (!m.preview) b.onclick = () => { if (b.disabled) return; b.disabled = true; _gapDone(c.id, rowEl); };
  return b;
}
function _gapDone(id, rowEl) { if (typeof statusOf === 'function' && statusOf(id) === 'done') return; homeCompleteTask(id, rowEl && rowEl.isConnected ? rowEl : null); }

/** S: the block button, the same as M's main button (the event card, prefilled); null without a gap or a calendar. */
function _gapBlockBtn(m, ctx, c) {
  if (m.preview) return _gapBtn('btn btn-ghost btn-sm btn-icon hgap-blk', icon('calendar-plus'), 'Block time for it');
  const p = _gapProposal(m, m.day.cur, c);
  if (!p) return null;
  if (_gapMode() === 'cal') {
    const card = _gapS1(m, p);
    if (!card || card.primary.action.type !== 'cal.blockOpen') return null;
    const b = _gapBtn('btn btn-ghost btn-sm btn-icon hgap-blk', icon('calendar-plus'), card.primary.aria || card.primary.label);
    b.setAttribute('data-tip', card.primary.label);
    b.onclick = () => { const k = _gapS1(_gapModel(_gapPrefs(ctx)), p); if (k) sgRun(k.primary.action, k, { from: b, surface: 'gap' }); };
    return b;
  }
  const b = _gapBtn('btn btn-ghost btn-sm btn-icon hgap-blk', icon('calendar-clock'), `Plan ${_gapHMs(p.start)} to ${_gapHMs(p.end)} for ${c.title}`);
  b.setAttribute('data-tip', `Plan ${_gapHMs(p.start)}–${_gapHMs(p.end)}…`);
  b.onclick = () => _gapSlotEditor(b, p);
  return b;
}
function _gapHMs(min) { return typeof sgHM === 'function' ? sgHM(min) : _gapHM(min); }

/* ---------- planning a gap: S1's card (calendar) or a planned slot ---------- */
/** One proposal: the task in the gap, from now (rounded up to 5 minutes), its length. null when under 15 min is left. */
function _gapProposal(m, gap, c) {
  if (!gap || !c) return null;
  const start = gap.start <= m.now ? Math.max(gap.start, Math.ceil(m.now / 5) * 5) : gap.start;
  const len = gapBlockLength(c, gap.end - start);
  if (!len) return null;
  return { id: c.id, title: c.title, stream: c.stream, start, end: start + len, len, gapStart: gap.start, gapEnd: gap.end };
}
/** S1's card for one proposal, on this widget's surface (its own key per task, so receipts never mix). */
function _gapS1(m, p) {
  if (typeof sgFreeSlotCard !== 'function' || !p) return null;
  const raw = sgFreeSlotCard(m.snap, { start: p.gapStart, end: p.gapEnd }, { taskId: p.id, minutes: p.len, surface: 'gap' });
  if (!raw) return null;
  const rule = (typeof sgRule === 'function' && sgRule('free-slot')) || { id: 'free-slot', area: 'time', hours: 'work', title: 'Block a free stretch', surfaces: [] };
  const card = typeof sgNormCard === 'function' ? sgNormCard(raw, rule) : Object.assign({ rule: 'free-slot', area: 'time' }, raw);
  card.key = `gap:${m.today}:${p.gapEnd}:${p.id}`;
  card.menu = [];                    // in place: no "make it a task", no Not now (this widget is the user's own choice)
  return card;
}
function _gapPlanRow(m, ctx, gap, c, shown, where) {
  if (m.preview) return _gapPreviewPlan(m, gap, c);
  const p = _gapProposal(m, gap, c);
  if (!p) return null;
  if (_gapMode() === 'cal') {
    const card = _gapS1(m, p);
    if (!card || shown.has(card.key)) return null;
    const el = sgCardEl(card, { surface: 'gap', size: 'row' });
    const tools = el.querySelector('.sg-tools'); if (tools) tools.remove();
    el.classList.add('hgap-s1');
    return el;
  }
  return _gapSlotRow(m, p, where);
}
/** Without a calendar to write to: "Plan 10:35–11:00" (the editor, prefilled) + ✓ (planned at once, Undo). */
function _gapSlotRow(m, p, where) {
  const row = document.createElement('div'); row.className = 'hgap-slot';
  const range = `${_gapHMs(p.start)}–${_gapHMs(p.end)}`;
  row.innerHTML = `<span class="hgap-slot-ic">${icon('calendar-clock')}</span><span class="hgap-slot-t"><b>${esc(range)}</b><span>${esc(sgShort(p.title, 60))} · ${esc(_gapDur(p.len))}</span></span><span class="hgap-slot-a"></span>`;
  const a = row.querySelector('.hgap-slot-a');
  const go = _gapBtn('btn btn-primary btn-sm hgap-slot-go', icon('calendar-clock') + `<span>Plan ${esc(range)}</span>`, `Plan ${p.title} from ${_gapHMs(p.start)} to ${_gapHMs(p.end)}: opens the plan, ready to adjust`);
  go.setAttribute('data-tip', 'Opens the plan, ready to adjust');
  go.onclick = () => _gapSlotEditor(go, p);
  const ok = _gapBtn('btn btn-secondary btn-sm btn-icon hgap-slot-ok', icon('check'), `Plan ${p.title} ${range} now, with Undo`);
  ok.setAttribute('data-tip', 'Plan it now · Undo');
  ok.onclick = () => homeAction(ok, () => setPlannedSlot(p.id, m.today, _gapHMs(p.start), p.len, { reason: 'Fill the gap' }), {});
  a.append(go, ok);
  return row;
}
/** The plan editor: the task, its start and length, prefilled; Save plans it (Undo in the toast). Pressed again while open: nothing. */
function _gapSlotEditor(anchor, p) {
  const key = `${p.id}:${p.gapEnd}`;
  if (_gapEd && _gapEd.key === key && _gapEd.pop && _gapEd.pop.isConnected) {
    const f = _gapEd.pop.querySelector('input'); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* gone */ }
    return;
  }
  if (anchor && anchor._popClose) return;
  const today = todayStr();
  let pop = null;
  const close = openPopover(anchor, (el, closeIt) => {
    pop = el;
    el.classList.add('hgap-ed');
    const lens = [15, 30, 45, 60, 90].filter(n => p.start + n <= p.gapEnd || n === p.len);
    if (!lens.includes(p.len)) lens.push(p.len);
    lens.sort((a, b) => a - b);
    el.innerHTML = `<div class="hgap-ed-h">${icon('calendar-clock')}<b>Plan a time for it</b></div>`
      + `<div class="hgap-ed-task">${typeof streamMarkHtml === 'function' ? streamMarkHtml(p.stream) : ''}<span class="hgap-ed-tt"></span></div>`
      + `<label class="hgap-ed-row"><span>Start</span><input type="time" step="300" class="input input-sm hgap-ed-time" value="${_gapHMs(p.start)}" aria-label="Start time"></label>`
      + `<div class="hgap-ed-row"><span>Length</span><span class="seg hgap-ed-len" role="radiogroup" aria-label="Length">${lens.map(n => `<button type="button" role="radio" data-len="${n}" aria-checked="${n === p.len ? 'true' : 'false'}" class="${n === p.len ? 'on' : ''}">${esc(_gapDur(n))}</button>`).join('')}</span></div>`
      + `<p class="hgap-ed-note">Free ${esc(_gapHMs(p.gapStart))}–${esc(_gapHMs(p.gapEnd))}. Shows in Today’s schedule; the deadline stays.</p>`
      + '<div class="hgap-ed-acts"><button type="button" class="btn btn-ghost btn-sm" data-ed="cancel">Cancel</button><button type="button" class="btn btn-primary btn-sm" data-ed="save">Save</button></div>';
    el.querySelector('.hgap-ed-tt').textContent = p.title;
    let len = p.len;
    el.querySelector('.hgap-ed-len').addEventListener('click', (e) => {
      const b = e.target.closest('[data-len]'); if (!b) return;
      const n = Number(b.dataset.len); if (n === len) return;                 // the current length: nothing
      len = n;
      for (const x of el.querySelectorAll('[data-len]')) { const on = Number(x.dataset.len) === n; x.classList.toggle('on', on); x.setAttribute('aria-checked', on ? 'true' : 'false'); }
    });
    el.querySelector('[data-ed="cancel"]').onclick = () => closeIt();
    const save = el.querySelector('[data-ed="save"]');
    save.onclick = () => {
      const t = el.querySelector('.hgap-ed-time').value;
      if (!/^\d\d:\d\d$/.test(t)) { toast('Pick a start time', { kind: 'err' }); return; }
      const [hh, mm] = t.split(':').map(Number);
      if (hh * 60 + mm + len > 24 * 60) { toast('That runs past midnight', { kind: 'err' }); return; }
      closeIt();
      setPlannedSlot(p.id, today, t, len, { reason: 'Fill the gap' });
    };
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); save.click(); } });
  }, { width: 300, align: 'start', className: 'hgap-ed-pop', onClose: () => { if (_gapEd && _gapEd.key === key) _gapEd = null; } });
  _gapEd = { key, close, pop };
}

/* ---------- L: the later gaps, Plan all ---------- */
function _gapLater(m, ctx, pick, shown) {
  if (!m.day.later.length) return null;
  const rows = gapPlanAll(m.day.later.slice(0, 6), m.preview ? m.tasks : m.snap.tasks, Object.assign({}, m.o, { skip: (m.o.skip || []).concat(pick ? [pick.id] : []) }));
  const box = document.createElement('div'); box.className = 'hgap-later';
  box.innerHTML = '<div class="hgap-sub-h">Later today</div>';
  const list = document.createElement('div'); list.className = 'hgap-llist';
  const props = [];
  const curP = pick ? _gapProposal(m, m.day.cur, pick) : null;
  if (curP) props.push(curP);
  for (const r of rows) {
    const g = r.gap;
    const range = `${_gapHMs(g.start)}–${_gapHMs(g.end)}`;
    if (!r.pick) {
      const x = document.createElement('div'); x.className = 'hgap-lrow is-empty'; x.dataset.flip = 'gl:' + g.end;
      x.innerHTML = `<b>${esc(range)}</b><span>${esc(_gapDur(g.minutes))} · nothing fits</span>`;
      list.appendChild(x);
      continue;
    }
    const p = _gapProposal(m, g, r.pick);
    if (!p) continue;
    props.push(p);
    const el = _gapPlanRow(m, ctx, g, r.pick, shown, 'later');
    if (!el) continue;
    const wrap = document.createElement('div'); wrap.className = 'hgap-lrow'; wrap.dataset.flip = 'gl:' + g.end;
    wrap.appendChild(el);
    list.appendChild(wrap);
  }
  if (!list.children.length) return null;
  box.appendChild(list);
  const can = m.preview ? { ok: true } : sgCanBlock();
  if (props.length >= 2 && (m.preview || _gapMode() === 'slot' || can.ok)) {
    const all = _gapBtn('btn btn-secondary btn-sm hgap-all', icon('list-checks') + '<span>Plan all…</span>', 'Plan all: pick which to plan');
    all.setAttribute('aria-haspopup', 'dialog');
    if (!m.preview) all.onclick = () => _gapPlanAllOpen(all, m, props);
    box.appendChild(all);
  }
  return box;
}
/** Plan all: the proposals in a selectList; Apply books them (at most 3 calendar blocks) or plans them (one undo step). */
function _gapPlanAllOpen(anchor, m, props) {
  if (anchor._popClose) return;                                              // already open: nothing
  const cal = _gapMode() === 'cal' && sgCanBlock().ok;
  const max = cal ? 3 : props.length;
  openPopover(anchor, (el, close) => {
    el.classList.add('hgap-allp');
    el.innerHTML = `<div class="hgap-ed-h">${icon('list-checks')}<b>Plan the rest of today</b></div>`
      + `<p class="hgap-ed-note">${cal ? 'Each one becomes a block in your calendar, with no guests, linked to its task. Up to 3 at a time; Undo removes them.' : 'Each task gets a planned time here on the dashboard. The deadlines stay; one Undo puts it all back.'}</p>`
      + '<div class="hgap-all-list"></div>';
    const list = el.querySelector('.hgap-all-list');
    props.forEach((p, i) => {
      const r = document.createElement('div'); r.className = 'hgap-all-row'; r.dataset.selId = p.id;
      r.setAttribute('aria-label', `${_gapHMs(p.start)} to ${_gapHMs(p.end)}, ${p.title}`);
      r.innerHTML = `<b>${esc(_gapHMs(p.start))}–${esc(_gapHMs(p.end))}</b><span class="t"></span><span class="d">${esc(_gapDur(p.len))}</span>`;
      r.querySelector('.t').textContent = p.title;
      list.appendChild(r);
    });
    const run = async (ids) => {
      const chosen = props.filter(p => ids.includes(p.id));
      if (!chosen.length) return { error: 'Tick at least one.' };
      if (chosen.length > max) return { error: `Up to ${max} blocks at a time.` };
      if (cal) {
        const snap = sgSnapshot({ fresh: true });
        const blocks = chosen.map(p => { const t = sgTask(snap, p.id); return { taskId: p.id, date: m.today, start: p.start, end: p.end, gapEnd: p.gapEnd, rule: 'free-slot', title: sgBlockTitle(t), description: sgBlockDescription(t) }; });
        const card = { key: `gap-all:${m.today}`, rule: 'free-slot', area: 'time', title: 'Plan the rest of today' };
        const r = await sgRun({ type: 'cal.blockMany', args: { blocks } }, card, { from: anchor, surface: 'gap', count: false });
        if (!r || r.ok === false) return { error: (r && r.message) || 'Nothing was booked.' };
        close();
        const n = chosen.length;
        toast(`Booked ${n} block${n === 1 ? '' : 's'} in your calendar`, { kind: 'ok', icon: 'calendar-check', action: r.group ? { label: 'Undo', run: async () => { const u = await r.group.undo(); if (u && u.ok) toast('Undone', { kind: 'ok', icon: 'undo-2' }); } } : undefined });
        homeAnnounce(`Booked ${n} block${n === 1 ? '' : 's'}`);
        return { done: ids };
      }
      selUndoGroup(() => { for (const p of chosen) setPlannedSlot(p.id, m.today, _gapHMs(p.start), p.len, { toast: false, render: false, reason: 'Fill the gap' }); });
      close();
      render();
      const n = chosen.length;
      toast(`Planned ${n} task${n === 1 ? '' : 's'} into today’s gaps`, { kind: 'ok', icon: 'calendar-clock', action: { label: 'Undo', run: () => undo() } });
      homeAnnounce(`Planned ${n} task${n === 1 ? '' : 's'}`);
      return { done: ids };
    };
    selectList(list, { key: 'gap-all:' + m.today, compact: true, label: 'Plan the rest of today', rows: '.hgap-all-row', rowClick: true,
      defaultOn: (id) => props.findIndex(p => p.id === id) < max,
      apply: { label: cal ? 'Book selected' : 'Plan selected', icon: cal ? 'calendar-plus' : 'calendar-clock', run } });
  }, { width: 380, align: 'end', className: 'hgap-all-pop' });
}

/* ---------- nothing fits, the foot ---------- */
function _gapNothing(m, ctx) {
  const box = document.createElement('div'); box.className = 'hgap-none';
  const len = m.day.cur ? m.day.cur.end - m.day.cur.start : 0;
  box.innerHTML = `<p class="hgap-none-t">Nothing fits ${esc(_gapDur(len))}.${m.noEst.length ? ' Add estimates:' : ' A good moment for a short break.'}</p>`;
  if (!m.noEst.length) return box;
  const ul = document.createElement('ul'); ul.className = 'hgap-est';
  for (const t of m.noEst) {
    const li = document.createElement('li'); li.className = 'hgap-est-row'; li.dataset.flip = 'ge:' + t.id;
    li.innerHTML = `<span class="hgap-mk">${typeof streamMarkHtml === 'function' ? streamMarkHtml(t.stream) : ''}</span><span class="hgap-tt"></span><span class="hgap-est-c" role="group" aria-label="Estimate"></span>`;
    li.querySelector('.hgap-tt').textContent = t.title;
    const g = li.querySelector('.hgap-est-c');
    for (const n of [15, 30, 60]) {
      const b = _gapBtn('chip hgap-est-b', `<span>${n} min</span>`, `Estimate ${t.title}: ${n} minutes`);
      if (!m.preview) b.onclick = () => homeAction(b, () => { setOverride(t.id, 'estimate', n); render(); return true; }, { toast: `Estimate: ${n} min`, undo: true });
      g.appendChild(b);
    }
    ul.appendChild(li);
  }
  box.appendChild(ul);
  return box;
}
function _gapFoot(m) {
  const cs = m.cal || {};
  if (m.preview || cs.ok || cs.off) return null;
  const f = document.createElement('div'); f.className = 'hgap-foot';
  f.innerHTML = `${icon('plug', 'i-xs')}<span>${cs.error ? 'Couldn’t read the calendar, so meetings are not counted.' : 'Connect a calendar to fit around meetings.'}</span>`;
  if (!cs.error) {
    const b = _gapBtn('btn btn-ghost btn-sm hgap-conn', '<span>Connect</span>', 'Connect a calendar');
    b.onclick = () => { if (window.Connections && typeof Connections.open === 'function') Connections.open('calendar'); else setView('connections'); };
    f.appendChild(b);
  }
  return f;
}

/* ---------- settings ---------- */
function _gapSettings(anchor, ctx) {
  const close = homeSettingsMenu(anchor, ctx, [
    { key: 'buffer', label: 'Breathing room (min)', type: 'choice', choices: [[0, '0'], [5, '5'], [10, '10'], [15, '15']], hint: 'Kept free before the next event' },
    { key: 'allowUnestimated', label: 'Tasks with no estimate', type: 'toggle', hint: 'Offered in gaps of 45 minutes or more' },
  ]);
  const pops = document.querySelectorAll('.pop.hg-set-pop');
  const pop = pops[pops.length - 1];
  if (!pop) return;
  const wh = homeWorkHours();
  const row = document.createElement('div'); row.className = 'hgap-set-wh';
  row.innerHTML = `<div class="hg-set-l"><span>Working hours</span><small>${esc(`${wh.start}–${wh.end}`)}: the widget shows inside these</small></div>`;
  const b = _gapBtn('btn btn-ghost btn-sm', '<span>Change</span>' + icon('arrow-right'), 'Change your working hours (Settings > Profile)');
  b.onclick = () => { if (typeof close === 'function') close(); setView('settings:profile'); };
  row.appendChild(b);
  const h = pop.querySelector('.hg-set-h');
  if (h) h.after(row); else pop.prepend(row);
}

/* ---------- the gallery's preview (sample data; nothing fetched, ticked or written) ---------- */
function _gapSample(kit) {
  const toMin = (iso) => { const p = Clock.parts(Date.parse(iso)); return p.h * 60 + p.mi; };   // wall minutes on the page's clock
  const now = 10 * 60 + 35;
  const blocks = (kit.events || []).map(e => ({ start: toMin(e.start), end: toMin(e.end), title: e.title, kind: 'event' }));
  const day = gapDay({ nowMin: now, workStart: 9 * 60, workEnd: 18 * 60, blocks });
  const tasks = (kit.tasks || []).map(t => ({ id: t.id, title: t.title, stream: t.stream, priority: t.priority, due: t.dueDate, estimate: t.estimate, tags: [], status: 'todo' }));
  const o = { today: kit.today, buffer: 5, allowUnestimated: true, focus: ['sample-1', 'sample-2', 'sample-3'], skip: [] };
  const len = day.cur ? day.cur.end - day.cur.start : 0;
  return { preview: true, today: kit.today, now, day, tasks, o, len, cands: day.cur ? gapCandidates(len, tasks, Object.assign({}, o, { limit: 5 })) : [], noEst: [], cal: { ok: true } };
}
function _gapPreviewPlan(m, gap, c) {
  const p = c ? _gapProposal(m, gap, c) : null;
  if (!p) return null;
  const row = document.createElement('div'); row.className = 'hgap-slot';
  const range = `${_gapHMs(p.start)}–${_gapHMs(p.end)}`;
  row.innerHTML = `<span class="hgap-slot-ic">${icon('calendar-plus')}</span><span class="hgap-slot-t"><b>Free ${esc(_gapHMs(gap.start))}–${esc(_gapHMs(gap.end))}</b><span>Block ${esc(_gapDur(p.len))} for ${esc(sgShort(p.title, 40))}?</span></span>`
    + `<span class="hgap-slot-a"><span class="btn btn-primary btn-sm">${icon('calendar-plus')}<span>Block ${esc(range)}</span></span><span class="btn btn-secondary btn-sm btn-icon">${icon('check')}</span></span>`;
  return row;
}
