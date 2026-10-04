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
   GENERIC MODAL
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

// Keyboard-shortcut sheet ('?' or the topbar ? button). Was referenced but
// never defined, so both threw a ReferenceError.
function showKbHelp() {
  const ov = document.getElementById('kb-overlay'), card = document.getElementById('kb-card');
  if (!ov || !card) return;
  const mod = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl';
  const groups = [
    ['General', [
      ['Search or jump to', [mod, 'K']], ['New task', ['Q']], ['Filter this list', ['/']],
      ['Undo', [mod, 'Z']], ['Redo', [mod, 'Shift', 'Z']], ['Close / clear', ['Esc']], ['This sheet', ['?']],
    ]],
    ['Go to', [
      ['Home', ['G', 'H']], ['Today', ['G', 'T']], ['Upcoming', ['G', 'U']], ['Calendar', ['G', 'C']],
      ['Finances', ['G', 'F']], ['People', ['G', 'P']], ['Settings', ['G', 'S']],
    ]],
    ['Tasks', [
      ['Move between tasks', ['J', 'K']], ['Extend selection', ['Shift', '↑']], ['Open task', ['Enter']],
      ['Complete / reopen', ['X']], ['In progress', ['S']], ['Plan for today', ['T']], ['Due date', ['D']],
      ['Priority', ['P']], ['Set priority', ['1', '–', '4']], ['Edit title', ['E']], ['Task menu', ['.']],
      ['Move to bin', ['Del']], ['Select all tasks', [mod, 'A']],
    ]],
    ['View', [
      ['Toggle sidebar', [mod, '\\']], ['Dark mode', [mod, 'Shift', 'D']], ['Focus mode', [mod, 'Shift', 'F']],
      ['Export to Markdown', [mod, 'E']], ['Print view', [mod, 'P']],
    ]],
  ];
  const keys = (ks) => `<span class="kbd-group">${ks.map(k => `<kbd class="kbd">${esc(k)}</kbd>`).join('')}</span>`;
  card.innerHTML = `<div class="kb-head"><h3>Keyboard shortcuts</h3><button type="button" class="btn-icon" id="kb-close" aria-label="Close">${icon('x')}</button></div>`
    + `<div class="kb-cols">${groups.map(([g, rows]) => `<section><h4>${esc(g)}</h4>${rows.map(([l, k]) => `<div class="kb-row"><span>${esc(l)}</span>${keys(k)}</div>`).join('')}</section>`).join('')}</div>`;
  card.querySelector('#kb-close').onclick = () => ov.classList.remove('open');
  ov.onclick = (e) => { if (e.target === ov) ov.classList.remove('open'); };
  ov.classList.add('open');
}

/* ============================================================
   BULK IMPORT
   ============================================================ */
function openBulkImport() {
  showModal(`
    <h3>Bulk import tasks</h3>
    <p>Paste a list — one task per line. Quick-add syntax works on each line: <code>email Sam tomorrow #email !p2</code></p>
    <textarea id="bulk-text" placeholder="email Sam about the report tomorrow !p1\nwrite the cover letter #writing\nfix the build by friday !p2"></textarea>
    <div class="modal-actions">
      <button class="btn secondary" id="bulk-cancel">Cancel</button>
      <button class="btn primary" id="bulk-import">Import as tasks</button>
    </div>
  `, (card) => {
    card.querySelector('#bulk-cancel').onclick = closeModal;
    card.querySelector('#bulk-import').onclick = () => {
      const text = card.querySelector('#bulk-text').value;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      let count = 0;
      for (const line of lines) {
        const parsed = parseQuickAdd(line);
        if (parsed.title) { addParsedTask(parsed, quickAddDefaults(state.view)); count++; }
      }
      closeModal();
      showToast(`✓ imported ${count} task${count===1?'':'s'}`, false);
    };
  });
  setTimeout(() => document.getElementById('bulk-text')?.focus(), 100);
}

/* ============================================================
   TASK TEMPLATES
   ============================================================ */
function saveTaskAsTemplate(taskId) {
  const item = getItem(taskId); if (!item) return;
  const name = prompt('Template name:', effTitle(item));
  if (!name) return;
  state.taskTemplates.push({
    id: 'tmpl-' + Date.now(), name,
    title: effTitle(item), stream: effStream(item), priority: effPriority(item),
    tags: [...effTags(item)], detail: effDetail(item),
    subtasks: effSubtasks(item).map(s => ({ title: s.title, done: false })), recurrence: effRecurrence(item), people: [...(item.people || [])],
  });
  saveData();
  showToast('✓ template saved', false);
}
function applyTemplate(tmplId) {
  const t = state.taskTemplates.find(x => x.id === tmplId); if (!t) return;
  const newId = 'u-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
  let dueDate = null;
  if (typeof t.daysAhead === 'number' && Number.isFinite(t.daysAhead)) {
    const d = new Date(); d.setDate(d.getDate() + t.daysAhead);
    dueDate = fmtDate(d);
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
function openTemplatesModal() {
  const escAttr = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const tmplsHtml = state.taskTemplates.length === 0 ?
    `<p style="color:var(--text-dim);font-style:italic">No templates yet. Right-click any task → Save as template.</p>` :
    state.taskTemplates.map(t => {
      const streamOpts = Object.entries(STREAMS).map(([k, v]) => `<option value="${escAttr(k)}"${k === t.stream ? ' selected' : ''}>${esc(v.label)}</option>`).join('');
      const prioOpts = ['p1','p2','p3','p0'].map(p => `<option value="${p}"${p === t.priority ? ' selected' : ''}>${PRIORITIES[p].label}</option>`).join('');
      return `
      <div style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px dashed var(--border)">
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:4px">
          <input data-act="rename" data-id="${escAttr(t.id)}" value="${escAttr(t.name)}" style="font-weight:600;font-size:13px;border:1px solid var(--border);border-radius:4px;padding:4px 6px;background:var(--bg);color:var(--text)" />
          <div style="font-size:11px;color:var(--text-muted)">title: ${escAttr(t.title)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:11px">
            <select data-act="set-stream" data-id="${escAttr(t.id)}" style="font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">${streamOpts}</select>
            <select data-act="set-prio" data-id="${escAttr(t.id)}" style="font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text)">${prioOpts}</select>
            <label style="display:flex;gap:4px;align-items:center;color:var(--text-muted)">due in
              <input data-act="set-days" data-id="${escAttr(t.id)}" type="number" min="0" max="365" value="${typeof t.daysAhead === 'number' ? t.daysAhead : ''}" placeholder="–" style="width:54px;font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg);color:var(--text);font-variant-numeric:tabular-nums" />
              days
            </label>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          <button class="btn primary" data-act="apply" data-id="${escAttr(t.id)}">+ Use</button>
          <button class="btn danger" data-act="del" data-id="${escAttr(t.id)}" title="Delete template">×</button>
        </div>
      </div>
    `;
    }).join('');
  showModal(`
    <h3>Task templates</h3>
    <p>Reusable templates for quick task creation. Edit fields inline; "due in N days" applies on Use.</p>
    ${tmplsHtml}
    <div class="modal-actions"><button class="btn secondary" id="tmpl-close">Close</button></div>
  `, (card) => {
    card.querySelector('#tmpl-close').onclick = closeModal;
    card.querySelectorAll('[data-act="apply"]').forEach(b => b.onclick = () => { applyTemplate(b.dataset.id); closeModal(); });
    card.querySelectorAll('[data-act="del"]').forEach(b => b.onclick = () => { if (confirm('Delete template?')) { deleteTemplate(b.dataset.id); closeModal(); openTemplatesModal(); } });
    card.querySelectorAll('[data-act="rename"]').forEach(inp => {
      let timer;
      inp.oninput = () => { clearTimeout(timer); timer = setTimeout(() => updateTemplate(inp.dataset.id, 'name', inp.value), 300); };
    });
    card.querySelectorAll('[data-act="set-stream"]').forEach(sel => sel.onchange = () => updateTemplate(sel.dataset.id, 'stream', sel.value));
    card.querySelectorAll('[data-act="set-prio"]').forEach(sel => sel.onchange = () => updateTemplate(sel.dataset.id, 'priority', sel.value));
    card.querySelectorAll('[data-act="set-days"]').forEach(inp => {
      inp.onchange = () => {
        const n = inp.value === '' ? null : Number(inp.value);
        updateTemplate(inp.dataset.id, 'daysAhead', n);
      };
    });
  });
}

/* ============================================================
   WEEKLY REVIEW PROMPT
   ============================================================ */
function maybeShowReviewPrompt() {
  if (typeof reviewMaybePrompt === 'function') return reviewMaybePrompt();   // the guided weekly review (77/78-brief-*.js)
  const now = new Date();
  const dow = now.getDay();
  const hour = now.getHours();
  const isSundayEvening = dow === 0 && hour >= 17;
  const isMondayMorning = dow === 1 && hour < 12;
  if (!isSundayEvening && !isMondayMorning) return;
  if (Date.now() - (state.lastReviewPrompt || 0) < 5 * 86400000) return;
  showWeeklyReviewModal();
}
function showWeeklyReviewModal() {
  showModal(`
    <h3>Weekly review</h3>
    <p>Quick reflection — answer what you can, skip what you can't.</p>
    <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;font-weight:700">What's the ONE thing for this week?</label>
    <textarea id="rv-one" rows="2" style="margin-bottom:10px"></textarea>
    <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;font-weight:700">What's blocking you right now?</label>
    <textarea id="rv-blocked" rows="2" style="margin-bottom:10px"></textarea>
    <label style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em;font-weight:700">What went well last week?</label>
    <textarea id="rv-wins" rows="2"></textarea>
    <div class="modal-actions">
      <button class="btn secondary" id="rv-skip">Skip this week</button>
      <button class="btn primary" id="rv-save">Save</button>
    </div>
  `, (card) => {
    card.querySelector('#rv-skip').onclick = () => { state.lastReviewPrompt = Date.now(); saveUI(); closeModal(); };
    card.querySelector('#rv-save').onclick = () => {
      state.weeklyReviews.push({ ts: Date.now(), weekOf: todayStr(), oneThing: card.querySelector('#rv-one').value, blocked: card.querySelector('#rv-blocked').value, wins: card.querySelector('#rv-wins').value });
      state.lastReviewPrompt = Date.now();
      saveData(); closeModal();
      showToast('✓ review saved', false);
    };
  });
}

