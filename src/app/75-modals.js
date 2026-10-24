/* ============================================================
   CONTEXT MENU
   ============================================================ */
function showCtxMenu(x, y, items) {
  const m = document.getElementById('ctx-menu');
  if (!m) return;
  m.innerHTML = '';
  for (const it of items) {
    if (it === 'sep') { const s = document.createElement('div'); s.className = 'ctx-sep'; m.appendChild(s); continue; }
    const el = document.createElement('div');
    el.className = 'ctx-item' + (it.danger ? ' danger' : '');
    // icon: a sprite name (preferred) or trusted markup from code; label is text.
    el.innerHTML = `<span class="ctx-ic">${it.icon ? (_isIconName(it.icon) ? icon(it.icon) : it.icon) : ''}</span><span class="ctx-lbl">${esc(it.label)}</span>`;
    el.onclick = () => { closeCtxMenu(); it.action && it.action(); };
    m.appendChild(el);
  }
  m.style.left = Math.min(x, window.innerWidth - 240) + 'px';
  m.style.top = Math.min(y, window.innerHeight - items.length * 30 - 20) + 'px';
  m.classList.add('open');
}
function closeCtxMenu() { const m = document.getElementById('ctx-menu'); if (m) m.classList.remove('open'); }
document.addEventListener('click', closeCtxMenu);

// Task rows use openTaskMenu() (32-tasks-ui.js); this keeps the old
// showCtxMenu() shape for any caller that still builds a ctx menu.
function buildTaskCtxMenu(taskId) {
  return taskMenuItems(taskId).map(it => (it === 'sep' ? 'sep' : { icon: it.icon, label: it.label, danger: it.danger, action: it.run }));
}

/* ============================================================
   GENERIC MODAL (legacy: nothing in the app calls it any more; the
   dialogs below and in 86-live-sync.js use openDialog, 11-ui-kit.js)
   ============================================================ */
function showModal(html, onOpen) {
  const card = document.getElementById('modal-card');
  if (!card) return;
  card.innerHTML = html;
  document.getElementById('modal-overlay').classList.add('open');
  // Drag the edges to resize (13-splitter.js); the handles go with the HTML, so they are made each time.
  if (typeof makeResizable === 'function') { if (card._rz) card._rz.destroy(); card._rz = makeResizable(card, { key: 'dialog:legacy', edges: ['e', 'w', 's', 'se', 'sw'], center: 'x', min: { w: 320, h: 160 }, max: () => ({ h: Math.round(window.innerHeight * 0.88) }) }); }
  if (onOpen) onOpen(card);
}
function closeModal() { const o = document.getElementById('modal-overlay'); if (o) o.classList.remove('open'); }

// Keyboard-shortcut sheet ('?', the sidebar's keyboard button, More > Keyboard
// shortcuts). Every key the app answers to, one place; type to find one.
// '?' again, Esc, × or a click outside closes it, and focus goes back.
let _kbPrevFocus = null;
function kbHelpGroups() {
  const mod = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
  return [
    ['General', [
      ['Search or jump to', [mod, 'K']], ['New task', ['Q']], ['New task (anywhere)', [mod, '/']], ['Filter this list', ['/']],
      ['Ask the assistant', [mod, 'J']], ['Undo', [mod, 'Z']], ['Redo', [mod, 'Shift', 'Z']], ['Redo (also)', [mod, 'Y']],
      ['Close / clear', ['Esc']], ['Dismiss a notification', ['Esc']], ['This sheet', ['?']],
    ]],
    ['Go to', [
      ['All pages', ['G', 'G']], ['Home', ['G', 'H']], ['Today', ['G', 'T']], ['Upcoming', ['G', 'U']], ['All tasks', ['G', 'A']], ['Logbook', ['G', 'O']],
      ['Calendar', ['G', 'C']], ['Money', ['G', 'F']], ['Life', ['G', 'L']], ['People', ['G', 'P']], ['Settings', ['G', 'S']], ['Bin', ['G', 'B']],
      ['Pinned pages', ['Alt', '1–9']],
    ]],
    ['Tasks', [
      ['Move between tasks', ['J', 'K']], ['Extend selection', ['Shift', '↑']], ['Open task', ['Enter']],
      ['Complete / reopen', ['X']], ['In progress', ['S']], ['Plan for today', ['T']], ['Due date', ['D']],
      ['Priority', ['P']], ['Set priority', ['1', '–', '4']], ['Edit title', ['E']], ['Task menu', ['.']],
      ['Move to bin', ['Del']], ['Select a task', [mod, 'click']], ['Select a range', ['Shift', 'click']],
      ['Select by dragging (from empty space)', ['Drag']], ['Select all tasks', [mod, 'A']], ['Clear the selection', ['Esc']],
      ['With tasks selected: same keys for all', ['X', 'T', 'D', '1–4', 'Del']],
      ['Move a subtask up / down', ['Alt', '↑', '↓']], ['This task’s commands', [mod, 'K']],
    ]],
    ['View', [
      ['Toggle sidebar', [mod, '\\']], ['Dark mode', [mod, 'Shift', 'D']], ['Focus mode', [mod, 'Shift', 'F']],
      ['Export to Markdown', [mod, 'E']], ['Print view', [mod, 'P']],
    ]],
    ['Search box (' + mod + '+K)', [
      ['Commands only', ['>']], ['Tags', ['#']], ['People', ['@']], ['Ask the assistant', ['?']],
      ['Open beside', [mod, 'Enter']], ['Next group', ['Tab']],
    ]],
    ['Dialogs and cards', [
      ['Save / confirm', [mod, 'Enter']], ['Close', ['Esc']], ['Maximise the open card', ['M']],
    ]],
    // The calendar's keys, Google Calendar's (45-calendar-grid-logic.js)
    ...(typeof cglKeyHelp === 'function' ? [['Calendar', cglKeyHelp()]] : []),
    // Task layouts: Timeline and Matrix (31-views-switcher.js)
    ...(typeof viewsKeyHelp === 'function' ? [['Task layouts', viewsKeyHelp()]] : []),
  ];
}
function kbHelpOpen() { const ov = document.getElementById('kb-overlay'); return !!(ov && ov.classList.contains('open')); }
function closeKbHelp() {
  const ov = document.getElementById('kb-overlay');
  if (!ov || !ov.classList.contains('open')) return;
  ov.classList.remove('open');
  const f = _kbPrevFocus; _kbPrevFocus = null;
  if (f && f.isConnected && f.focus) try { f.focus({ preventScroll: true }); } catch (e) { /* gone */ }
}
function showKbHelp() {
  const ov = document.getElementById('kb-overlay'), card = document.getElementById('kb-card');
  if (!ov || !card) return;
  if (ov.classList.contains('open')) { closeKbHelp(); return; }   // '?' again closes it
  const groups = kbHelpGroups();
  const keys = (ks) => `<span class="kbd-group">${ks.map(k => `<kbd class="kbd">${esc(k)}</kbd>`).join('')}</span>`;
  card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'kb-title');
  card.innerHTML = `<div class="kb-head"><h3 id="kb-title">Keyboard shortcuts</h3>`
    + `<label class="input input-sm kb-find">${icon('search')}<input type="search" id="kb-find" placeholder="Find a shortcut" aria-label="Find a shortcut" autocomplete="off" spellcheck="false" /></label>`
    + '</div>'
    + `<div class="kb-cols">${groups.map(([g, rows]) => `<section><h4>${esc(g)}</h4>${rows.map(([l, k]) => `<div class="kb-row" data-find="${escAttr((g + ' ' + l + ' ' + k.join(' ')).toLowerCase())}"><span>${esc(l)}</span>${keys(k)}</div>`).join('')}</section>`).join('')}</div>`
    + `<p class="kb-none muted" hidden>No shortcut matches. Try a word like “undo”, “today” or “sidebar”.</p>`;
  const find = card.querySelector('#kb-find');
  find.oninput = () => {
    const q = find.value.trim().toLowerCase();
    let any = false;
    for (const sec of card.querySelectorAll('.kb-cols section')) {
      let n = 0;
      for (const row of sec.querySelectorAll('.kb-row')) { const on = !q || row.dataset.find.includes(q); row.hidden = !on; if (on) n++; }
      sec.hidden = !n; if (n) any = true;
    }
    card.querySelector('.kb-none').hidden = any;
  };
  find.onkeydown = (e) => {
    if (e.key === 'Escape' && find.value) { e.preventDefault(); e.stopPropagation(); find.value = ''; find.oninput(); }
    else if (e.key === '?' && !find.value) { e.preventDefault(); closeKbHelp(); }   // '?' again closes the sheet
  };
  card.querySelector('.kb-head').appendChild(uiButton({ icon: 'x', aria: 'Close', data: { kbClose: '1' }, run: closeKbHelp }));
  ov.onclick = (e) => { if (e.target === ov) closeKbHelp(); };
  _kbPrevFocus = document.activeElement;
  ov.classList.add('open');
  setTimeout(() => { try { find.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 0);
}

/* ============================================================
   BULK IMPORT
   ============================================================ */
/** More › Bulk add tasks: one task per line, quick-add words on each (the kit's dialog, size md). */
function openBulkImport() {
  let ta = null;
  openDialog({
    title: 'Bulk add tasks', size: 'md',
    body: (el) => {
      const p = document.createElement('p'); p.className = 'muted bulk-hint';
      p.append('One task per line. Quick add works on each line, like ');
      const c = document.createElement('code'); c.textContent = 'email Sam tomorrow #email !p2'; p.append(c, '.');
      ta = document.createElement('textarea'); ta.className = 'control bulk-text'; ta.id = 'bulk-text'; ta.rows = 7;
      ta.placeholder = 'email Sam about the report tomorrow !p1\nwrite the cover letter #writing\nfix the build by friday !p2';
      ta.setAttribute('aria-label', 'Tasks, one per line'); ta.setAttribute('autofocus', '');
      el.append(p, ta);
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Add tasks', primary: true, run: () => {
        const lines = String(ta ? ta.value : '').split('\n').map(l => l.trim()).filter(Boolean);
        let count = 0;
        for (const line of lines) {
          const parsed = parseQuickAdd(line);
          if (parsed.title) { addParsedTask(parsed, quickAddDefaults(state.view)); count++; }
        }
        if (!count) { if (ta) ta.focus(); toast('Nothing to add yet: type one task per line.', { icon: 'clipboard-list' }); return false; }
        toast(`Added ${count} task${count === 1 ? '' : 's'}`, { kind: 'ok' });
        return true;
      } },
    ],
  });
}

/* ============================================================
   TASK TEMPLATES
   ============================================================ */
async function saveTaskAsTemplate(taskId) {
  let item = getItem(taskId); if (!item) return;
  // The app's own dialog (the browser's prompt() blocked the page and looked out of place).
  const name = await promptDialog({ title: 'Save as template', label: 'Template name', value: effTitle(item), confirmLabel: 'Save template' });
  item = getItem(taskId);
  if (!name || !item) return;
  state.taskTemplates.push({
    id: 'tmpl-' + Date.now(), name,
    title: effTitle(item), stream: effStream(item), priority: effPriority(item),
    tags: [...effTags(item)], detail: effDetail(item),
    subtasks: effSubtasks(item).map(s => ({ title: s.title, done: false })), recurrence: effRecurrence(item), people: [...(item.people || [])],
  });
  saveData();
  toast(`Template “${name}” saved`, { kind: 'ok', icon: 'layout-template', action: { label: 'Manage', run: () => openTemplatesModal() } });
}
function applyTemplate(tmplId) {
  const t = state.taskTemplates.find(x => x.id === tmplId); if (!t) return;
  const newId = 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
  let dueDate = null;
  if (typeof t.daysAhead === 'number' && Number.isFinite(t.daysAhead)) {
    dueDate = Clock.addDays(todayStr(), t.daysAhead);
  }
  state.custom.push({
    id: newId, title: t.title, dueDate,
    priority: t.priority, tags: [...(t.tags || [])],
    stream: t.stream, detail: t.detail || '',
    subtasks: (t.subtasks || []).map(s => ({ id: 'st-' + Date.now() + '-' + Math.random().toString(36).slice(2,5), title: s.title, done: false, ts: Date.now() })),
    recurrence: t.recurrence || 'none',
    people: [...(t.people || [])],
    createdAt: Date.now(), createdVia: 'ui',
  });
  logActivity(newId, 'created', { text: 'Created from template: ' + (t.name || t.title) });
  saveData(); render();
  toast('Task created from template', { kind: 'ok', action: { label: 'Open', run: () => openTask(newId) } });
}
function updateTemplate(tmplId, field, value) {
  const t = state.taskTemplates.find(x => x.id === tmplId); if (!t) return;
  t[field] = value;
  saveData();
}
function deleteTemplate(tmplId) {
  state.taskTemplates = state.taskTemplates.filter(t => t.id !== tmplId);
  saveData();
}
/** More › Templates: edit each template where it stands (saved as you go, so the button is Done);
 *  Use makes a task, Delete goes at once with Undo. The kit's dialog, size md, fixed (a list). */
let _tmplRepaint = null;
function openTemplatesModal() {
  if (_tmplRepaint) { _tmplRepaint(); return; }
  let host = null;
  const paint = () => {
    if (!host) return;
    const keep = host.scrollTop;
    host.replaceChildren();
    const intro = document.createElement('p'); intro.className = 'muted tmpl-intro';
    intro.textContent = 'Edit a template here; “Due in” counts from the day you use it.';
    host.appendChild(intro);
    const list = state.taskTemplates || [];
    if (!list.length) { host.appendChild(emptyLine('No templates yet. Right-click a task and choose Save as template.')); return; }
    for (const t of list) {
      const row = document.createElement('div'); row.className = 'tmpl-row';
      const main = document.createElement('div'); main.className = 'tmpl-main';
      const name = document.createElement('input'); name.className = 'control control-sm tmpl-name'; name.value = t.name || ''; name.setAttribute('aria-label', 'Template name');
      let timer = null;
      name.oninput = () => { clearTimeout(timer); timer = setTimeout(() => updateTemplate(t.id, 'name', name.value), 300); };
      const title = document.createElement('div'); title.className = 'tmpl-title'; title.textContent = 'Task: ' + (t.title || '');
      const opts = document.createElement('div'); opts.className = 'tmpl-opts';
      const stream = document.createElement('select'); stream.className = 'control control-sm'; stream.setAttribute('aria-label', 'Stream');
      for (const [k, v] of Object.entries(STREAMS)) { const o = document.createElement('option'); o.value = k; o.textContent = v.label; if (k === t.stream) o.selected = true; stream.appendChild(o); }
      stream.onchange = () => updateTemplate(t.id, 'stream', stream.value);
      const prio = document.createElement('select'); prio.className = 'control control-sm'; prio.setAttribute('aria-label', 'Priority');
      for (const p of ['p1', 'p2', 'p3', 'p0']) { const o = document.createElement('option'); o.value = p; o.textContent = PRIORITIES[p].label; if (p === t.priority) o.selected = true; prio.appendChild(o); }
      prio.onchange = () => updateTemplate(t.id, 'priority', prio.value);
      const due = document.createElement('label'); due.className = 'tmpl-due';
      const days = document.createElement('input'); days.type = 'number'; days.min = '0'; days.max = '365'; days.className = 'control control-sm tmpl-days';
      days.value = typeof t.daysAhead === 'number' ? String(t.daysAhead) : ''; days.placeholder = '–';
      days.onchange = () => updateTemplate(t.id, 'daysAhead', days.value === '' ? null : Number(days.value));
      due.append('Due in', days, 'days');
      opts.append(stream, prio, due);
      main.append(name, title, opts);
      const acts = document.createElement('div'); acts.className = 'tmpl-acts';
      acts.append(
        uiButton({ label: 'Use', icon: 'plus', kind: 'secondary', size: 'sm', run: () => { applyTemplate(t.id); if (_tmplClose) _tmplClose(); } }),
        uiButton({ icon: 'trash-2', size: 'sm', aria: 'Delete the template ' + (t.name || ''), run: () => {
          deleteTemplate(t.id);
          const mark = typeof undoMark === 'function' ? undoMark() : null;   // Undo brings back this one, even after other edits
          paint();
          toast(`Deleted the template “${t.name || ''}”`, { icon: 'trash-2', action: { label: 'Undo', run: () => { if (mark) undoMarked(mark); else undo(); if (_tmplRepaint) _tmplRepaint(); } } });
        } }));
      row.append(main, acts);
      host.appendChild(row);
    }
    host.scrollTop = keep;
  };
  let _tmplClose = null;
  _tmplClose = openDialog({
    title: 'Task templates', size: 'md', fixed: true, resizeKey: 'templates',
    body: (el) => { el.classList.add('tmpl-body'); host = el; paint(); },
    actions: [{ label: 'Done', primary: true }],
    onClose: () => { _tmplRepaint = null; },
  });
  _tmplRepaint = paint;
}

/* ============================================================
   WEEKLY REVIEW PROMPT
   ============================================================ */
function maybeShowReviewPrompt() {
  if (typeof reviewMaybePrompt === 'function') return reviewMaybePrompt();   // the guided weekly review (77/78-brief-*.js)
  const now = Clock.parts(Clock.now());
  const dow = now.dow;
  const hour = now.h;
  const isSundayEvening = dow === 0 && hour >= 17;
  const isMondayMorning = dow === 1 && hour < 12;
  if (!isSundayEvening && !isMondayMorning) return;
  if (Date.now() - (state.lastReviewPrompt || 0) < 5 * 86400000) return;
  showWeeklyReviewModal();
}
/** The old weekly prompt (only without the guided review of 77/78-brief-*.js): three questions. */
function showWeeklyReviewModal() {
  const fields = {};
  openDialog({
    title: 'Weekly review', size: 'md',
    body: (el) => {
      const p = document.createElement('p'); p.className = 'muted'; p.textContent = 'Answer what you can and skip the rest.';
      el.appendChild(p);
      for (const [k, q] of [['one', 'What’s the one thing for this week?'], ['blocked', 'What’s in your way right now?'], ['wins', 'What went well last week?']]) {
        const f = document.createElement('label'); f.className = 'field';
        const l = document.createElement('span'); l.className = 'field-label'; l.textContent = q;
        const ta = document.createElement('textarea'); ta.className = 'control'; ta.rows = 2;
        fields[k] = ta; f.append(l, ta); el.appendChild(f);
      }
    },
    actions: [
      { label: 'Not now', run: () => { state.lastReviewPrompt = Date.now(); saveUI(); } },
      { label: 'Save', primary: true, run: () => {
        state.weeklyReviews.push({ ts: Date.now(), weekOf: todayStr(), oneThing: fields.one.value, blocked: fields.blocked.value, wins: fields.wins.value });
        state.lastReviewPrompt = Date.now();
        saveData();
        toast('Review saved', { kind: 'ok' });
      } },
    ],
  });
}

