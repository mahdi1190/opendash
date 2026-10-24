/* ============================================================
   CONTEXTS AND ENERGY, the page side (owner: lists; the model is
   20-task-contexts.js).
     ctxTaskProp(id)          the task's "Context" property (card and side panel,
                              60-task-detail.js tdProps): context chips + energy
     ctxRowMeta(item, m)      the row's meta line marks (30-task-row.js)
     openContextPicker(anchor, id)
     openContextManager()     add, rename, re-icon, remove contexts
   ============================================================ */
function ctxTaskProp(id) {
  const item = getItem(id);
  const wrap = document.createElement('div'); wrap.className = 'ctx-prop';
  if (!item) return wrap;
  const cx = effContexts(item), en = effEnergy(item);
  for (const c of cx) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip ctx-chip';
    b.innerHTML = icon(ctxIcon(c), 'i-xs') + `<span>@${esc(ctxLabel(c))}</span>` + icon('x', 'i-xs x');
    b.title = `Remove @${ctxLabel(c)}`;
    b.onclick = () => setTaskContexts(id, cx.filter(x => x !== c));
    wrap.appendChild(b);
  }
  const add = document.createElement('button'); add.type = 'button'; add.className = 'chip chip-more ctx-add';
  add.innerHTML = icon('plus', 'i-xs') + `<span>${cx.length ? 'Context' : 'Anywhere'}</span>`;
  add.title = cx.length ? 'Add a context' : 'No context: it can be done anywhere. Click to set where.';
  add.onclick = (e) => openContextPicker(e.currentTarget, id);
  wrap.appendChild(add);
  const seg = document.createElement('span'); seg.className = 'seg ctx-energy'; seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Energy');
  for (const lv of ['low', 'high']) {
    const b = document.createElement('button'); b.type = 'button';
    b.innerHTML = icon(TASK_ENERGY[lv].icon, 'i-xs') + `<span>${TASK_ENERGY[lv].short}</span>`;
    b.setAttribute('aria-pressed', en === lv ? 'true' : 'false');
    b.title = en === lv ? `${TASK_ENERGY[lv].label}: click to clear` : `Needs ${lv} energy`;
    b.onclick = () => setTaskEnergy(id, en === lv ? null : lv);
    seg.appendChild(b);
  }
  wrap.appendChild(seg);
  return wrap;
}
function openContextPicker(anchor, id) {
  const item = getItem(id); if (!item) return;
  const cur = effContexts(item);
  const items = [{ heading: 'Where can it be done?' }];
  for (const c of ctxList()) items.push({ label: '@' + c.label, icon: c.icon, checked: cur.includes(c.id), keepOpen: false,
    run: () => setTaskContexts(id, cur.includes(c.id) ? cur.filter(x => x !== c.id) : [...cur, c.id]) });
  items.push({ label: 'Anywhere (no context)', icon: 'compass', checked: !cur.length, run: () => setTaskContexts(id, []) });
  items.push('sep', { label: 'New context…', icon: 'plus', run: async () => {
    const v = await promptDialog({ title: 'New context', label: 'Where or with what, e.g. Train, Garden, Car', placeholder: 'Train', confirmLabel: 'Add' });
    if (!v) return;
    const cid = ctxAdd(v);
    if (cid) setTaskContexts(id, [...new Set([...cur, cid])]);
  } }, { label: 'Manage contexts…', icon: 'sliders-horizontal', run: () => openContextManager() });
  openMenu(anchor, items, { align: 'start', width: 240 });
}
/** The row's marks: @context (its icon) and a leaf / flame for energy. */
function ctxRowMeta(item, m) {
  const cx = effContexts(item);
  if (cx.length) {
    const s = m('t-ctx', ctxIcon(cx[0]), cx.length > 1 ? `@${ctxLabel(cx[0])} +${cx.length - 1}` : '@' + ctxLabel(cx[0]), 'Context: ' + cx.map(c => '@' + ctxLabel(c)).join(', '));
    if (s) s.dataset.ctx = cx[0];
  }
  const en = effEnergy(item);
  if (en) m('t-energy t-energy-' + en, TASK_ENERGY[en].icon, '', TASK_ENERGY[en].label);
}
function openContextManager() {
  let list = ctxList().map(c => ({ id: c.id, label: c.label, icon: c.icon, aliases: c.aliases }));
  const counts = {};
  for (const it of getAllItems()) for (const c of effContexts(it)) counts[c] = (counts[c] || 0) + 1;
  let body = null;
  const paint = () => {
    body.innerHTML = '';
    const p = document.createElement('p'); p.className = 'muted';
    p.textContent = 'Type @ and the name in any quick add (“@phone”). A task with no context fits anywhere.';
    body.appendChild(p);
    for (const c of list) {
      const row = document.createElement('div'); row.className = 'ctxm-row';
      const ic = document.createElement('button'); ic.type = 'button'; ic.className = 'btn-icon btn-sm'; ic.innerHTML = icon(c.icon); ic.setAttribute('aria-label', 'Icon');
      ic.onclick = (e) => openMenu(e.currentTarget, CTX_ICONS.map(n => ({ label: n.replace(/-/g, ' '), icon: n, checked: c.icon === n, run: () => { c.icon = n; paint(); } })), { align: 'start', width: 220 });
      const name = document.createElement('input'); name.className = 'control control-sm'; name.value = c.label; name.setAttribute('aria-label', 'Name');
      name.oninput = () => { c.label = name.value; };
      const id = document.createElement('span'); id.className = 'subtle ctxm-id'; id.textContent = '@' + c.id + (counts[c.id] ? ` · ${counts[c.id]} task${counts[c.id] === 1 ? '' : 's'}` : '');
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn-icon btn-sm'; del.innerHTML = icon('trash-2'); del.setAttribute('aria-label', 'Remove ' + c.label);
      del.title = counts[c.id] ? 'Remove from the list (tasks keep the word until you change them)' : 'Remove';
      del.onclick = () => { list = list.filter(x => x !== c); paint(); };
      row.append(ic, name, id, del);
      body.appendChild(row);
    }
    const add = document.createElement('div'); add.className = 'ctxm-row ctxm-add';
    const inp = document.createElement('input'); inp.className = 'control control-sm'; inp.placeholder = 'Add a context, e.g. Train'; inp.setAttribute('aria-label', 'New context');
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = inp.value.trim(); const sid = ctxSlug(v); if (sid && !list.some(x => x.id === sid)) { list.push({ id: sid, label: v, icon: 'map-pin', aliases: [] }); paint(); body.querySelector('.ctxm-add input').focus(); } } };
    add.innerHTML = `<span class="btn-icon btn-sm" aria-hidden="true">${icon('plus')}</span>`;
    add.appendChild(inp);
    body.appendChild(add);
  };
  openDialog({
    title: 'Contexts', size: 'sm', resizeKey: 'contexts',
    body: (el) => { el.classList.add('ctxm'); body = el; paint(); },
    actions: [
      { label: 'Back to the defaults', run: () => { list = TASK_CONTEXT_DEFAULTS.map(c => ({ id: c.id, label: c.label, icon: c.icon, aliases: c.aliases.slice() })); paint(); return false; } },
      'spacer',
      { label: 'Cancel' },
      { label: 'Save', primary: true, run: () => { ctxSaveList(list); toast('Contexts saved', { kind: 'ok', action: { label: 'Undo', run: () => undo() } }); } },
    ],
  });
}
// The open task (or the keyboard cursor) in the palette: its context and energy.
if (typeof _palTaskId === 'function') {
  registerCommand({ id: 'this-task-context', group: 'This task', icon: 'map-pin', keywords: 'context where computer phone errands home office', label: 'Set context…', when: () => !!_palTaskId(),
    run: () => { const id = _palTaskId(); if (id) openContextPicker(_palTaskAnchor(id, '[data-prop="context"]'), id); } });
  registerCommand({ id: 'this-task-energy-low', group: 'This task', icon: 'leaf', keywords: 'energy low easy tired', label: () => (effEnergy(getItem(_palTaskId())) === 'low' ? 'Clear low energy' : 'Mark as low energy'), when: () => !!_palTaskId(),
    run: () => { const id = _palTaskId(); if (id) setTaskEnergy(id, effEnergy(getItem(id)) === 'low' ? null : 'low'); } });
  registerCommand({ id: 'this-task-energy-high', group: 'This task', icon: 'flame', keywords: 'energy high focus deep', label: () => (effEnergy(getItem(_palTaskId())) === 'high' ? 'Clear high energy' : 'Mark as high energy'), when: () => !!_palTaskId(),
    run: () => { const id = _palTaskId(); if (id) setTaskEnergy(id, effEnergy(getItem(id)) === 'high' ? null : 'high'); } });
}
registerCommand({ id: 'contexts-manage', label: 'Manage contexts…', icon: 'map-pin', keywords: 'context computer phone errands home office where', run: () => openContextManager() });
