/* ============================================================
   HOME widget "focus": the few tasks that matter right now.
   User request, 3 Oct: Home showed every task and every subtask; "we should
   be able to click on it, and then read all of the sub tasks, with nice
   animations that expand it as we click on it".

   Compact rows (Things 3 Today, Linear My Issues): the task's scene, its
   title (two lines at most), the stream marker and why it is here, people,
   a subtask ring (done/total) and the due chip. Hovering a row (pointer
   only) swaps the people and the ring for two quick actions: Done (X) and
   Tomorrow (]).
   A row is a disclosure: click it, or Enter / Space on it, and it opens IN
   PLACE into a lifted card (12-home-focus-card.js): the description, the
   whole checklist (tick in place, add, drag to reorder), linked folders and
   files, people, time, and Done / Snooze / Reschedule / Open full card.
   Clicking the row again closes it; clicks inside the open card never do.
   Several can be open (Collapse all in the header). The open set is the UI
   key state.homeUI.expanded, so it survives saves, live sync, undo and reloads.
   Sizes: l (default) one list; full two columns of rows, an open card spans
   both; m the compact one-column card. The widget's own width decides the
   layout (container queries in 13-home-w-focus.css).
   Also: drag a row to reorder (home.focusOrder) or onto anything with
   data-drop-date (the week strip) to reschedule. Keys on a row: Enter /
   Space open or close, Esc close, O full card, X done, P pin, H hide today,
   [ ] date, Alt+Up/Down order, Up/Down move. The Tune popover (also the
   widget's settings in Customise). Below the list: today's done Focus tasks,
   struck through. Empty: a quick add for a new user, "Worth pulling forward"
   on a clear day.
   Owner: HB2 (focus). Rules: homeFocusTasks / homeFocusWhy (12-home.js).
   The open card, the motion and the task actions: 12-home-focus-card.js.
   CSS: 13-home-w-focus.css.
   ============================================================ */
registerHomeWidget({
  id: 'focus', title: 'Focus', icon: 'target', order: 20,
  description: 'Your most important tasks right now, with their subtasks',
  sizes: ['m', 'l', 'full'], defaultSize: 'l',
  render(el, ctx) { _hfRender(el, ctx); },
  settings(anchor) { _homeTunePopover(anchor); },
});

let _hfCtx = null;                                   // the latest render's ctx (in-place changes use it)
const _hfShown = { day: '', ids: new Set() };        // tasks Focus showed today ("done today" keeps them)

/* ---------- pure helpers (tests/home-focus.test.mjs) ---------- */
/** Subtask progress: {total, done, open, pct, next (first open id), label 'done/total', allDone}. */
function homeFocusProgress(subs) {
  const list = Array.isArray(subs) ? subs.filter(s => s && typeof s === 'object') : [];
  const total = list.length, done = list.filter(s => s.done).length;
  const next = list.find(s => !s.done);
  return { total, done, open: total - done, pct: total ? Math.round(done / total * 100) : 0, next: next ? next.id : null, label: total ? `${done}/${total}` : '', allDone: total > 0 && done === total };
}
/**
 * Today's Focus tasks that are done: completed today and either shown in Focus
 * today or still matching its rules. Oldest first. -> [{item, at}]
 */
function homeFocusDoneToday(shownIds) {
  const today = todayStr(), out = [];
  const shown = shownIds || _hfShown.ids;
  for (const [id, arr] of Object.entries(state.completionLog || {})) {
    const ts = Array.isArray(arr) && arr.length ? Number(arr[arr.length - 1]) : 0;
    if (!ts || Clock.parts(ts).iso !== today) continue;
    const it = getItem(id);
    if (!it || statusOf(id) !== 'done' || (typeof isWontDo === 'function' && isWontDo(it))) continue;
    if (!shown.has(id) && !homeFocusWhy(it).why.length) continue;
    out.push({ item: it, at: ts });
  }
  return out.sort((a, b) => a.at - b.at);
}

/* ---------- render ---------- */
function _hfRender(root, ctx) {
  _hfCtx = ctx;
  const focus = homeFocusTasks();
  const total = homeFocusCandidateCount();
  const today = todayStr();
  if (_hfShown.day !== today) { _hfShown.day = today; _hfShown.ids = new Set(); }
  for (const f of focus) _hfShown.ids.add(f.i.id);
  const done = homeFocusDoneToday();
  const w = document.createElement('section');
  w.className = 'card home-card hf-w';
  w.dataset.size = ctx.size || 'l';
  w.appendChild(_hfHead(focus.length, total, done.length));
  const body = document.createElement('div'); body.className = 'hf-b';
  w.appendChild(body);
  root.appendChild(w);
  if (!focus.length) {
    _hfEmpty(body, ctx, total);
    _hfDoneList(body, done, ctx);
    return;
  }
  const list = document.createElement('div'); list.className = 'hf-list';
  list.setAttribute('role', 'list'); list.setAttribute('aria-label', 'Focus tasks');
  for (const f of focus) list.appendChild(_hfCard(f.i, f.why, ctx));
  body.appendChild(list);
  _hfDoneList(body, done, ctx);
  const hint = document.createElement('div'); hint.className = 'hf-hint'; hint.dataset.flip = 'hf-hint';
  hint.innerHTML = `Click to open · <kbd class="kbd">X</kbd> done · <kbd class="kbd">[</kbd><kbd class="kbd">]</kbd> date · <kbd class="kbd">Alt</kbd><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd> order · drag onto a day to reschedule`;
  body.appendChild(hint);
  if (typeof _lastRenderedTaskIds !== 'undefined') _lastRenderedTaskIds = focus.map(f => f.i.id);   // the centre card's previous / next
  ctx.enterNew(list.children, (c) => c.dataset.id);   // a task that just joined Focus slides in
  for (const c of list.querySelectorAll('.hf-card.is-open')) _hfDetailsMounted(c, ctx);
  _hfSyncHead(w);
  if (!ctx.editing) ctx.sortable(list, {
    items: '.hf-card[data-id]', axis: ctx.size === 'full' ? 'grid' : 'y',
    dropTargets: '[data-drop-date]', compactLift: _homeDragPill,
    onReorder: (ids) => { _homeRememberNow(); homeUpdate({ focusOrder: ids }); },
    onDropTarget: (id, t) => homeReschedule(id, t.dataset.dropDate),
  });
  if (ctx.firstPaint) _hfEntrance(w);
  requestAnimationFrame(() => { if (w.isConnected && typeof animActivate === 'function') animActivate(w); });
}

function _hfHead(nOpen, total, nDone) {
  const h = document.createElement('header'); h.className = 'hf-h';
  const count = homeFocusCountLabel(nOpen, total, homeFocusConfig().count);
  h.innerHTML = `${icon('target')}<h3>Focus</h3><span class="n">${esc([count, nDone ? `${nDone} done` : ''].filter(Boolean).join(' · '))}</span><span class="spacer"></span>`;
  const act = document.createElement('span'); act.className = 'hf-h-act';
  const all = document.createElement('button'); all.type = 'button'; all.className = 'btn btn-ghost btn-sm hf-collapse-all'; all.hidden = true;
  all.innerHTML = icon('minimize-2') + '<span>Collapse all</span>';
  all.onclick = () => homeFocusCollapseAll();
  const tune = document.createElement('button'); tune.type = 'button'; tune.className = 'btn btn-ghost btn-sm hf-tune';
  tune.innerHTML = '<span>Tune</span>' + icon('sliders-horizontal');
  tune.setAttribute('aria-haspopup', 'dialog');
  tune.onclick = () => _homeTunePopover(tune);
  const add = document.createElement('button'); add.type = 'button'; add.className = 'btn-icon btn-sm hf-new';
  add.innerHTML = icon('plus'); add.setAttribute('aria-label', 'New task'); add.setAttribute('data-tip', 'New task');
  add.onclick = () => openNewTask('', { from: add });
  // A focus block with a scene that grows as it runs (78-anim-moments.js)
  const blk = document.createElement('button'); blk.type = 'button'; blk.className = 'btn-icon btn-sm hf-block';
  blk.innerHTML = icon('timer'); blk.setAttribute('aria-label', 'Start a 25-minute focus block'); blk.setAttribute('data-tip', 'Focus block (25 min)');
  blk.onclick = () => { if (typeof animFocusStart === 'function') animFocusStart(25); };
  if (typeof animFocusStart !== 'function') blk.hidden = true;
  act.append(all, tune, blk, add);
  h.appendChild(act);
  return h;
}
/** The header's Collapse all shows while a card is open. */
function _hfSyncHead(w) {
  if (!w) return;
  const n = w.querySelectorAll('.hf-card.is-open:not(.is-closing)').length;
  const b = w.querySelector('.hf-collapse-all');
  if (!b) return;
  b.hidden = n < 2;                     // one open card closes from its own chevron (HOME_SPEC.md 5.3)
  const lbl = b.querySelector('span'); if (lbl) lbl.textContent = n > 1 ? 'Collapse all' : 'Collapse';
}

/* ---------- a row ---------- */
function _hfStreamColor(item) { const s = STREAMS[effStream(item)]; return safeColor(s && s.color, '#868a94'); }
function _hfPeople(item) { return (typeof effPeople === 'function' ? effPeople(item) : []).map(getPerson).filter(p => p && !p.self); }
function _hfAvatar(p, size) { return typeof avatarHtml === 'function' ? avatarHtml(p, size) : homeAvatar(p, size); }
/** The task's scene (73/74: animForTask + animSceneHtml); live when the card is open, else on hover. */
function _hfSceneHtml(item, live) {
  if (typeof animSceneHtml === 'function') {
    let type = 'task';
    try { type = typeof animForTask === 'function' ? animForTask(item).type : (typeof animClassify === 'function' ? animClassify({ kind: 'task', id: item.id, title: effTitle(item), tags: effTags(item) }).type : 'task'); } catch (e) { type = 'task'; }
    return animSceneHtml(type, { size: 'sm', hover: !live });
  }
  return `<span class="hf-scene-fb" aria-hidden="true">${icon(statusOf(item.id) === 'doing' ? 'circle-dot' : 'list-checks')}</span>`;
}
function _hfStreamMark(sid) {
  if (typeof streamMarkHtml === 'function') return streamMarkHtml(sid);
  const s = STREAMS[sid];
  return `<span class="dot" style="--c:${escAttr(safeColor(s && s.color, '#868a94'))}" aria-hidden="true"></span>`;
}
function _hfRing(prog) {
  if (!prog.total) return '';
  return `<span class="hf-ringn" title="${escAttr(`${prog.done} of ${prog.total} subtasks done`)}"><svg class="hf-ring${prog.done ? '' : ' is-zero'}" viewBox="0 0 36 36" aria-hidden="true" style="--p:${prog.pct}"><circle class="tr" cx="18" cy="18" r="15.9" pathLength="100"/><circle class="fl" cx="18" cy="18" r="15.9" pathLength="100"/></svg><span class="num">${esc(prog.label)}</span></span>`;
}
/** The due chip's look: "Today" accent, "2d overdue" danger, "Tomorrow" warning, else a weekday or date (neutral). */
function _hfDueParts(item) {
  const d = effDate(item);
  if (!d) return null;
  const n = daysUntil(d);
  return {
    cls: n < 0 ? 'late' : n === 0 ? 'today' : n === 1 ? 'soon' : '',
    txt: n < 0 ? `${-n}d overdue` : dueLabel(d) + (n === 0 && item.dueTime ? ' ' + item.dueTime : ''),
    title: 'Due ' + (typeof _tbShortDate === 'function' ? _tbShortDate(d, true) : d) + (item.dueTime ? ' ' + item.dueTime : ''),
  };
}
function _hfDue(item) {
  const p = _hfDueParts(item);
  return p ? `<span class="hf-due ${p.cls}" title="${escAttr(p.title)}">${esc(p.txt)}</span>` : '';
}
/** The same, inside the meta line: an open card on a narrow widget shows it there to give the title the room. */
function _hfMetaDue(item) {
  const p = _hfDueParts(item);
  return p ? `<span class="hf-meta-due"><span class="sep" aria-hidden="true">·</span><span class="hf-why w-due ${p.cls}">${esc(p.txt)}</span></span>` : '';
}
function _hfWhyHtml(item, why) {
  // The due chip already says "Today" / "2d overdue" / "Mon": never repeat it here.
  let whyShown = effDate(item) ? why.filter(w => !['overdue', 'today', 'soon'].includes(w.k)) : why;
  // The pin marker always shows (first), so a pinned card says why it sits on top.
  whyShown = whyShown.filter(w => w.k === 'pinned').concat(whyShown.filter(w => w.k !== 'pinned'));
  const sep = '<span class="sep" aria-hidden="true">·</span>';
  const est = Number(item.estimate) > 0 ? `${sep}<span class="hf-why w-est">~${esc(_hfMinutes(Number(item.estimate)))}</span>` : '';
  return `${whyShown.slice(0, 2).map(w => `${sep}<span class="hf-why w-${escAttr(w.k)}">${w.k === 'pinned' ? icon('pin') : ''}${esc(w.t)}</span>`).join('')}${est}`;
}
function _hfMinutes(m) {
  m = Math.round(Number(m) || 0);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function _hfCard(item, why, ctx) {
  const id = item.id;
  // Customise shows the compact rows (the open set is kept and comes back on Done).
  const open = !!(ctx && !ctx.editing && ctx.expanded && ctx.expanded.has(id));
  const status = statusOf(id);
  const prog = homeFocusProgress(getSubtasks(id));
  const ppl = _hfPeople(item);
  const s = STREAMS[effStream(item)];
  why = why || homeFocusWhy(item).why;
  const el = document.createElement('article');
  el.className = 'hf-card' + (open ? ' is-open' : '') + (status === 'doing' ? ' doing' : '') + (isPinned(id) ? ' pinned' : '');
  el.dataset.id = id; el.dataset.flip = 'hf:' + id; el.setAttribute('data-flip-h', '');
  el.setAttribute('role', 'listitem');
  el.style.setProperty('--sc', _hfStreamColor(item));
  // The hover actions are not Tab stops: a row is one stop (X and ] on it do the same), and a
  // button shown only while its row has focus would vanish as Tab moved onto it (focus fell to <body>).
  el.innerHTML = `
    <div class="hf-row anim-hover-host">
      <span class="hf-scene">${_hfSceneHtml(item, open)}</span>
      <div class="hf-tt" role="button" tabindex="0" aria-expanded="${open ? 'true' : 'false'}" aria-controls="${escAttr('hfx-' + id)}" aria-keyshortcuts="X O P H [ ]" data-fk="${escAttr('hf-' + id)}">
        <span class="hf-title">${esc(effTitle(item))}</span>
        <span class="hf-meta"><span class="hf-stream">${_hfStreamMark(effStream(item))}<span>${esc((s && s.label) || effStream(item) || 'No stream')}</span></span>${_hfWhyHtml(item, why)}${_hfMetaDue(item)}</span>
      </div>
      <span class="hf-r">
        <span class="hf-glance">${ppl.length ? `<span class="hf-avs">${ppl.slice(0, 3).map(p => _hfAvatar(p, 20)).join('')}</span>` : ''}${_hfRing(prog)}</span>
        <span class="hf-quick"><button type="button" class="hf-qb ok" data-act="done" tabindex="-1" aria-label="${escAttr('Mark done: ' + effTitle(item))}" data-tip="Done" data-kbd="X">${icon('check')}</button><button type="button" class="hf-qb" data-act="tomorrow" tabindex="-1" aria-label="Move to tomorrow" data-tip="Tomorrow" data-kbd="]">${icon('arrow-right')}</button></span>
      </span>
      ${_hfDue(item)}
      <span class="hf-chev" aria-hidden="true">${icon('chevron-down')}</span>
    </div>`;
  if (open && typeof _hfDetails === 'function') el.appendChild(_hfDetails(item, ctx));
  el.addEventListener('click', (e) => _hfCardClick(e, el));
  el.addEventListener('contextmenu', (e) => {
    if (e.target.closest('[data-cz], input, textarea, a[href]')) return;   // a person's own menu, text fields, links
    e.preventDefault(); homeTaskMenu(el.querySelector('.hf-tt') || el, id);
  });
  el.querySelector('.hf-tt').addEventListener('keydown', (e) => _hfRowKey(e, el));
  return el;
}

function _hfCardClick(e, el) {
  const id = el.dataset.id;
  const a = e.target.closest('[data-act]');
  if (a && el.contains(a)) {
    e.stopPropagation();
    homeFocusAct(a.dataset.act, id, el, a, e);
    return;
  }
  if (e.target.closest('.hf-x, input, textarea, a[href], button')) return;     // inside the open card: never toggles
  if (!e.target.closest('.hf-row')) return;
  if (window.getSelection && String(window.getSelection()).length) return;   // selecting the title
  homeFocusToggle(id);
}

/* ---------- keys on a row (its title is the disclosure button) ---------- */
function _hfRowKey(e, el) {
  if (e.target !== e.currentTarget) return;
  const id = el.dataset.id, k = e.key;
  const plain = !e.altKey && !e.ctrlKey && !e.metaKey;
  const rows = () => [...document.querySelectorAll('#main-body .hf-card[data-id] .hf-tt')];
  let done = true;
  if ((k === 'Enter' && (e.ctrlKey || e.metaKey)) || ((k === 'o' || k === 'O') && plain)) homeOpenTask(id, el.querySelector('.hf-row'));
  else if ((k === 'Enter' || k === ' ') && plain) homeFocusToggle(id);
  else if (k === 'Escape' && el.classList.contains('is-open')) homeFocusToggle(id, false);
  else if (e.altKey && (k === 'ArrowUp' || k === 'ArrowDown')) homeMoveInFocus(id, k === 'ArrowUp' ? -1 : 1);
  else if ((k === 'ArrowDown' || k === 'ArrowUp' || k === 'j' || k === 'k') && plain) {
    const all = rows(); const i = all.indexOf(e.currentTarget);
    const n = all[Math.max(0, Math.min(all.length - 1, i + (k === 'ArrowDown' || k === 'j' ? 1 : -1)))];
    if (n) n.focus();
  }
  else if (!plain) done = false;
  else if (k === 'x' || k === 'X') homeFocusDone(id, el);
  else if (k === 'p' || k === 'P') { _homeRefocusRow(id); togglePin(id); }
  else if (k === ']') _homeShiftDate(id, 1);
  else if (k === '[') _homeShiftDate(id, -1);
  else if (k === 'h' || k === 'H') homeFocusSnooze(id, null, el);
  else if ((k === 'F10' && e.shiftKey) || k === 'ContextMenu') homeTaskMenu(e.currentTarget, id);
  else done = false;
  // Handled here: the page's list shortcuts (90-wiring.js: Enter opens the "cursor" task, arrows move it) stay out of it.
  if (done) { e.preventDefault(); e.stopPropagation(); }
}
/** After the re-render a save causes, keyboard focus comes back to this row. */
function _homeRefocusRow(id) {
  setTimeout(() => { const c = document.querySelector(`#main-body .hf-card[data-id="${CSS.escape(id)}"] .hf-tt`); if (c) try { c.focus({ preventScroll: true }); } catch (e) { /* gone */ } }, 0);
}
function homeMoveInFocus(id, dir) {
  const ids = homeFocusTasks().map(f => f.i.id);
  const i = ids.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  _homeRememberNow();
  homeUpdate({ focusOrder: ids });
  _homeRefocusRow(id);
  if (typeof homeAnnounce === 'function') homeAnnounce(`Position ${j + 1} of ${ids.length}`);
}
function _homeShiftDate(id, n) {
  const it = getItem(id); if (!it) return;
  const base = effDate(it) || todayStr();
  const d = new Date(base + 'T00:00:00'); d.setDate(d.getDate() + n); // clock-ok: wall date
  homeReschedule(id, fmtDate(d));
  _homeRefocusRow(id);
}

/* ---------- below the list: today's done Focus tasks ---------- */
function _hfDoneList(body, done, ctx) {
  if (!done.length) return;
  const wrap = document.createElement('div'); wrap.className = 'hf-done';
  wrap.setAttribute('role', 'list'); wrap.setAttribute('aria-label', 'Done today');
  const max = 4;
  for (const d of done.slice(-max)) {
    const r = document.createElement('div'); r.className = 'hf-done-row';
    r.setAttribute('role', 'listitem'); r.dataset.id = d.item.id; r.dataset.flip = 'hfd:' + d.item.id;
    const t = Clock.parts(Number(d.at));
    const hm = homeHM(t.h * 60 + t.mi);
    r.innerHTML = `<span class="hf-done-ck" aria-hidden="true">${icon('check')}</span><button type="button" class="hf-done-t" data-tip="Open">${esc(effTitle(d.item))}</button><small>${esc(hm)}</small>`;
    r.querySelector('button').onclick = () => homeOpenTask(d.item.id, r);
    wrap.appendChild(r);
  }
  if (done.length > max) {
    const more = document.createElement('div'); more.className = 'hf-done-more';
    more.textContent = `+${done.length - max} more done today`;
    wrap.appendChild(more);
  }
  body.appendChild(wrap);
  if (ctx) ctx.enterNew(wrap.querySelectorAll('.hf-done-row'), (r) => 'done:' + r.dataset.id);
}

/* ---------- empty: a new user, everything hidden, a clear day ---------- */
function _hfEmpty(body, ctx, total) {
  const open = getAllItems().filter(i => statusOf(i.id) !== 'done');
  if (!open.length) { _hfEmptyNew(body); return; }
  const sn = homeState().snoozed || {}, today = todayStr();
  const snoozed = total ? open.filter(i => sn[i.id] && sn[i.id] >= today && homeFocusWhy(i).why.length).length : 0;
  if (snoozed) {
    const e = document.createElement('div'); e.className = 'hf-emp';
    e.innerHTML = `${_hfEmpScene('rest')}<h4>Everything here is resting</h4><p>${esc(snoozed === 1 ? 'You hid the one task that would be here. It comes back on its own.' : `You hid all ${snoozed} tasks that would be here. They come back on their own.`)}</p>`;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm';
    b.innerHTML = icon('eye') + `<span>Show ${esc(snoozed)} hidden</span>`;
    b.onclick = () => { _homeRememberNow(); homeUpdate({ snoozed: {} }, 'Hidden tasks are back in Focus'); };
    const acts = document.createElement('div'); acts.className = 'acts'; acts.appendChild(b);
    e.appendChild(acts);
    body.appendChild(e);
    return;
  }
  const e = document.createElement('div'); e.className = 'hf-emp hf-emp-clear';
  e.innerHTML = `${_hfEmpScene('rest')}<h4>Nothing pressing today</h4><p>No overdue, pinned or in-progress tasks. Pull one forward, or keep the day light.</p>`;
  body.appendChild(e);
  const pulls = homeFocusPullForward(3);
  if (!pulls.length) return;
  const h = document.createElement('div'); h.className = 'hf-ovl'; h.textContent = 'Worth pulling forward';
  body.appendChild(h);
  const list = document.createElement('div'); list.className = 'hf-pulls'; list.setAttribute('role', 'list');
  for (const p of pulls) {
    const r = document.createElement('div'); r.className = 'hf-pull'; r.setAttribute('role', 'listitem');
    r.dataset.id = p.item.id; r.dataset.flip = 'hfp:' + p.item.id;
    const s = STREAMS[effStream(p.item)];
    r.innerHTML = `<span class="hf-scene hf-scene-xs">${typeof animSceneHtml === 'function' ? _hfSceneHtml(p.item, false).replace('sz-sm', 'sz-xs') : ''}</span><button type="button" class="hf-pull-t">${esc(effTitle(p.item))}<small>${esc([(s && s.label) || '', p.why].filter(Boolean).join(' · '))}</small></button><button type="button" class="btn btn-secondary btn-sm" data-act="plan">${icon('sun')}<span>Do today</span></button><button type="button" class="btn-icon btn-sm" data-act="dismiss" aria-label="Not now" data-tip="Not now">${icon('x')}</button>`;
    r.querySelector('.hf-pull-t').onclick = () => homeOpenTask(p.item.id, r);
    r.querySelector('[data-act="plan"]').onclick = () => { _homeRememberNow(); setPlanned(p.item.id, todayStr()); toast('Planned for today', { kind: 'ok', icon: 'sun', action: { label: 'Undo', run: () => undo() } }); };
    r.querySelector('[data-act="dismiss"]').onclick = () => _hfPullDismiss(p.item.id, r);
    list.appendChild(r);
  }
  body.appendChild(list);
  if (ctx) ctx.enterNew(list.children, (r) => 'pull:' + r.dataset.id);
}
function _hfEmpScene(type) {
  return typeof animSceneHtml === 'function' ? animSceneHtml(type, { size: 'lg' }) : `<span class="hf-emp-ic">${icon('circle-check')}</span>`;
}
function _hfEmptyNew(body) {
  const qa = document.createElement('label'); qa.className = 'hf-qa';
  qa.innerHTML = icon('plus');
  const inp = document.createElement('input'); inp.type = 'text'; inp.maxLength = 300; inp.dataset.fk = 'hf-qa';
  inp.placeholder = 'Add a task for today, e.g. “Email Sam about rent”';
  inp.setAttribute('aria-label', 'Add a task for today');
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter' && inp.value.trim()) {
      e.preventDefault();
      const v = inp.value.trim(); inp.value = '';
      if (typeof addTaskFromText === 'function') homeFocusAfterAdd(addTaskFromText(v, { plannedFor: todayStr() }), '#main-body .hf-w .hf-new');
      else openNewTask(v);
    } else if (e.key === 'Escape') { inp.value = ''; inp.blur(); }
  });
  qa.appendChild(inp);
  body.appendChild(qa);
  const ghosts = document.createElement('div'); ghosts.className = 'hf-ghosts'; ghosts.setAttribute('aria-hidden', 'true');
  ghosts.innerHTML = [[46, 28], [38, 22]].map(([a, b], i) => `<div class="hf-ghost" style="opacity:${i ? 0.6 : 1}"><span class="sq"></span><span class="ln"><i style="width:${a}%"></i><i style="width:${b}%"></i></span></div>`).join('');
  body.appendChild(ghosts);
  const p = document.createElement('p'); p.className = 'hf-emp-note';
  p.textContent = 'Tasks you pin, start, mark high priority or give a date in the next few days land here, a handful at a time. Click one to see its subtasks without leaving Home.';
  body.appendChild(p);
}
/** Up to n open tasks worth doing today on a clear day: the nearest due, a quick one, the most important. */
function homeFocusPullForward(n) {
  const today = todayStr();
  const ui = state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {};
  const notNow = ui.notNow && ui.notNow.day === today && Array.isArray(ui.notNow.ids) ? new Set(ui.notNow.ids) : new Set();
  const snoozed = homeState().snoozed || {};
  const cands = getAllItems().filter(i => statusOf(i.id) !== 'done' && !(i.startDate && i.startDate > today) && !(snoozed[i.id] && snoozed[i.id] >= today) && !notNow.has(i.id));
  const out = [], seen = new Set();
  const take = (it, why) => { if (it && !seen.has(it.id) && out.length < (n || 3)) { seen.add(it.id); out.push({ item: it, why }); } };
  const dated = cands.filter(i => effDate(i) && effDate(i) > today).sort((a, b) => effDate(a).localeCompare(effDate(b)));
  if (dated[0]) take(dated[0], 'due ' + dueLabel(effDate(dated[0])));
  const quick = cands.filter(i => Number(i.estimate) > 0 && Number(i.estimate) <= 15).sort((a, b) => Number(a.estimate) - Number(b.estimate));
  if (quick[0]) take(quick[0], `~${_hfMinutes(quick[0].estimate)}`);
  const rank = { p1: 0, p2: 1, p3: 2, p0: 3 };
  const important = cands.slice().sort((a, b) => (rank[effPriority(a)] - rank[effPriority(b)]) || ((effDate(a) || '9999').localeCompare(effDate(b) || '9999')));
  for (const it of important) { if (out.length >= (n || 3)) break; take(it, effPriority(it) === 'p0' ? '' : effPriority(it).toUpperCase()); }
  return out;
}
function _hfPullDismiss(id, row) {
  const today = todayStr();
  const ui = state.homeUI && typeof state.homeUI === 'object' ? state.homeUI : {};
  const ids = ui.notNow && ui.notNow.day === today && Array.isArray(ui.notNow.ids) ? ui.notNow.ids.slice() : [];
  if (!ids.includes(id)) ids.push(id);
  state.homeUI = Object.assign({}, ui, { notNow: { day: today, ids: ids.slice(-50) } });
  saveUI();
  const go = () => { if (typeof homeRerenderWidget === 'function') homeRerenderWidget('focus'); else render(); };
  const a = row && window.Motion ? Motion.animate(row, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(10px)' }], { duration: 160, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }) : null;
  if (a) a.finished.then(go, go); else go();
}

/* ---------- once per entry: rings sweep, bars grow ---------- */
function _hfEntrance(w) {
  if (!window.Motion || Motion.prefersReduced()) return;
  w.querySelectorAll('.hf-ring .fl').forEach((c, i) => {
    const to = getComputedStyle(c).strokeDashoffset;
    Motion.animate(c, [{ strokeDashoffset: '100' }, { strokeDashoffset: to }], { duration: 800, delay: 300 + i * 40, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' });
  });
  w.querySelectorAll('.hf-bar > i').forEach((b) => Motion.animate(b, [{ transform: 'scaleX(0)' }, { transform: 'none' }], { duration: 700, delay: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }));
}

/* ---------- Tune popover ---------- */
function _homeTunePopover(anchor) {
  openPopover(anchor, (el, close) => {
    el.classList.add('pad', 'home-tune');
    const cfg = homeFocusConfig();
    const set = (patch) => {
      _homeRememberNow();
      homeUpdate({ focus: Object.assign({}, homeState().focus || {}, patch) });
      close();
      setTimeout(() => { const t = document.querySelector('#main-body .hf-w .hf-tune'); if (t) _homeTunePopover(t); }, 0);
    };
    el.innerHTML = `<div class="pop-label">Show</div>`;
    const seg = document.createElement('div'); seg.className = 'seg seg-block';
    for (const n of [3, 4, 5, 6, 7]) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = n + '';
      b.setAttribute('aria-pressed', cfg.count === n ? 'true' : 'false'); b.setAttribute('aria-label', `${n} tasks`);
      b.onclick = () => { if (cfg.count !== n) set({ count: n }); };
      seg.appendChild(b);
    }
    el.appendChild(seg);
    const lab = document.createElement('div'); lab.className = 'pop-label'; lab.textContent = 'Include'; el.appendChild(lab);
    const rows = [['overdue', 'Overdue'], ['pinned', 'Pinned'], ['doing', 'In progress'], ['planned', 'Planned for today'], ['p1', 'High priority (P1)']];
    for (const [k, t] of rows) {
      const r = document.createElement('div'); r.className = 'pop-row';
      r.innerHTML = `<span class="lbl">${esc(t)}</span>`;
      const s = document.createElement('button'); s.type = 'button'; s.className = 'switch'; s.setAttribute('role', 'switch');
      s.setAttribute('aria-checked', cfg[k] ? 'true' : 'false'); s.setAttribute('aria-label', t);
      s.onclick = () => set({ [k]: !cfg[k] });
      r.appendChild(s); el.appendChild(r);
    }
    const r = document.createElement('div'); r.className = 'pop-row';
    r.innerHTML = '<span class="lbl">Due within</span>';
    const ds = document.createElement('div'); ds.className = 'seg';
    for (const [v, t] of [[0, 'Off'], [1, '1d'], [3, '3d'], [7, '7d']]) {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = t;
      b.setAttribute('aria-pressed', cfg.dueSoonDays === v ? 'true' : 'false');
      b.onclick = () => { if (cfg.dueSoonDays !== v) set({ dueSoonDays: v }); };
      ds.appendChild(b);
    }
    r.appendChild(ds); el.appendChild(r);
    const st = Object.entries(STREAMS).filter(([, v]) => !v.archived);
    if (st.length > 1) {
      const l2 = document.createElement('div'); l2.className = 'pop-label'; l2.textContent = 'Streams'; el.appendChild(l2);
      const chips = document.createElement('div'); chips.className = 'chips home-tune-streams';
      const all = document.createElement('button'); all.type = 'button'; all.className = 'chip chip-lg' + (cfg.streams.length ? '' : ' chip-accent');
      all.textContent = 'All'; all.setAttribute('aria-pressed', cfg.streams.length ? 'false' : 'true');
      all.onclick = () => { if (cfg.streams.length) set({ streams: [] }); };
      chips.appendChild(all);
      for (const [sid, s] of st) {
        const on = cfg.streams.includes(sid);
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-lg' + (on ? ' chip-accent' : '');
        b.innerHTML = `${_hfStreamMark(sid)}<span>${esc(s.label)}</span>`;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        b.onclick = () => set({ streams: on ? cfg.streams.filter(x => x !== sid) : [...cfg.streams, sid] });
        chips.appendChild(b);
      }
      el.appendChild(chips);
    }
    const foot = document.createElement('div'); foot.className = 'home-tune-f';
    const h = homeState();
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'btn btn-ghost btn-sm';
    reset.textContent = 'Reset order'; reset.disabled = !(h.focusOrder && h.focusOrder.length);
    reset.onclick = () => { close(); _homeRememberNow(); homeUpdate({ focusOrder: [] }, 'Focus order reset'); };
    const un = document.createElement('button'); un.type = 'button'; un.className = 'btn btn-ghost btn-sm';
    const nSnoozed = Object.values(h.snoozed || {}).filter(v => v >= todayStr()).length;
    un.textContent = nSnoozed ? `Show ${nSnoozed} hidden` : 'None hidden'; un.disabled = !nSnoozed;
    un.onclick = () => { close(); _homeRememberNow(); homeUpdate({ snoozed: {} }, 'Hidden tasks are back'); };
    foot.append(reset, un);
    el.appendChild(foot);
  }, { align: 'end', width: 300 });
}
