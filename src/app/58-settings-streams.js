/* ============================================================
   SETTINGS > Streams and Templates. Owner: Connections/Settings.
   Streams (state.streams [{id,label,color,order,archived}]) and quick-add
   templates (state.quickTemplates) are DATA: every edit is one saveData()
   undo step and goes to the state file. The same stream changes are
   available to assistants and MCP clients as the actions create_stream /
   update_stream / reorder_streams (server/actions/ops-streams.mjs).
   Streams are never deleted (tasks keep pointing at them): archive hides one.
   ============================================================ */
const STREAM_SWATCHES = ['#4f46e5', '#2563eb', '#0891b2', '#0d9488', '#059669', '#65a30d', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#9333ea', '#64748b'];

/** state.streams, created from the current lookup the first time it is edited. */
function _ssList() {
  if (!Array.isArray(state.streams) || !state.streams.length) {
    state.streams = Object.entries(STREAMS).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
      .map(([id, s], i) => ({ id, label: s.label, color: s.color, order: i, archived: !!s.archived }));
  }
  // tasks may use ids the list lacks (shown grey): give them a real entry
  for (const [id, s] of Object.entries(STREAMS)) {
    if (!state.streams.some(x => x.id === id)) state.streams.push({ id, label: s.label, color: s.color, order: state.streams.length, archived: false });
  }
  return state.streams;
}
function _ssCommit(msg) {
  applyStreams(state);
  saveData();
  render();
  if (msg) toast(msg, { kind: 'ok' });
}
function _ssOpenCount(id) {
  try { return getAllItems().filter(i => effStream(i) === id && statusOf(i.id) !== 'done').length; } catch (e) { return 0; }
}
function _ssSlug(label) {
  return String(label || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'stream';
}
function _ssColorPop(anchor, cur, onPick) {
  openPopover(anchor, (pop, close) => {
    pop.classList.add('set-swatch-pop');
    const grid = document.createElement('div'); grid.className = 'set-swatches';
    for (const c of STREAM_SWATCHES) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'set-swatch' + (String(cur).toLowerCase() === c ? ' on' : '');
      b.style.setProperty('--c', c); b.setAttribute('aria-label', 'Colour ' + c);
      b.onclick = () => { close(); onPick(c); };
      grid.appendChild(b);
    }
    pop.appendChild(grid);
    const row = document.createElement('label'); row.className = 'set-swatch-custom';
    const inp = document.createElement('input'); inp.type = 'color'; inp.value = /^#[0-9a-f]{6}$/i.test(cur) ? cur : '#64748b';
    inp.onchange = () => { close(); onPick(inp.value.toLowerCase()); };
    row.append(inp, document.createTextNode('Custom colour'));
    pop.appendChild(row);
  }, { align: 'start', width: 216 });
}

registerSettingsGroup({
  id: 'streams', title: 'Streams', icon: 'layers', order: 30,
  description: 'The areas your tasks belong to. Rename, recolour, reorder or archive them; archived streams keep their tasks.',
  render(el) {
    const list = (Array.isArray(state.streams) && state.streams.length ? state.streams.slice() : Object.entries(STREAMS).map(([id, s], i) => ({ id, label: s.label, color: s.color, order: s.order ?? i, archived: !!s.archived })))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const active = list.filter(s => !s.archived), archived = list.filter(s => s.archived);
    const box = document.createElement('div'); box.className = 'set-list';
    const move = (id, dir) => {
      const L = _ssList().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const live = L.filter(s => !s.archived);
      const i = live.findIndex(s => s.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= live.length) return;
      [live[i], live[j]] = [live[j], live[i]];
      const order = [...live, ...L.filter(s => s.archived)];
      order.forEach((s, k) => { s.order = k; });
      state.streams = order;
      _ssCommit();
    };
    const row = (s, i, n) => {
      const r = document.createElement('div'); r.className = 'set-item' + (s.archived ? ' is-archived' : '');
      czMark(r, 'stream', s.id);   // right-click: the same stream menu as the sidebar (28-customise.js)
      const sw = document.createElement('button'); sw.type = 'button'; sw.className = 'set-color cz-swatch'; sw.style.setProperty('--c', safeColor(s.color));
      sw.setAttribute('aria-label', 'Colour, symbol and shape of ' + s.label); sw.setAttribute('data-tip', 'Colour, symbol & shape');
      sw.innerHTML = streamMarkHtml(s.id, { inherit: true });
      sw.onclick = () => czOpenCustomise('stream', s.id, sw);
      const name = document.createElement('input'); name.className = 'set-inline'; name.value = s.label; name.maxLength = 40;
      name.setAttribute('aria-label', 'Stream name'); name.setAttribute('data-cz-label', '');
      name.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); name.blur(); } if (e.key === 'Escape') { name.value = s.label; name.blur(); } };
      name.onblur = () => {
        const v = name.value.trim();
        if (!v || v === s.label) { name.value = s.label; return; }
        if (_ssList().some(y => y.id !== s.id && y.label.toLowerCase() === v.toLowerCase())) { toast('Another stream already has that name.', { kind: 'err' }); name.value = s.label; return; }
        const x = _ssList().find(y => y.id === s.id); if (x) { x.label = v; _ssCommit('Renamed'); }
      };
      const cnt = document.createElement('span'); cnt.className = 'set-count num'; const oc = _ssOpenCount(s.id); cnt.textContent = oc ? `${oc} open` : 'empty';
      const acts = document.createElement('span'); acts.className = 'set-acts';
      const mk = (ic, tip, run, dis) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm'; b.innerHTML = icon(ic); b.setAttribute('aria-label', tip); b.setAttribute('data-tip', tip); if (dis) b.disabled = true; b.onclick = run; return b; };
      if (!s.archived) {
        acts.append(mk('arrow-up', 'Move up', () => move(s.id, -1), i === 0), mk('arrow-down', 'Move down', () => move(s.id, 1), i === n - 1));
        acts.append(mk('archive', 'Archive', () => {
          if (_ssList().filter(y => !y.archived).length <= 1) { toast('Keep at least one stream.', { kind: 'err' }); return; }
          const x = _ssList().find(y => y.id === s.id); if (x) { x.archived = true; _ssCommit(`Archived ${x.label}`); }
        }));
      } else {
        acts.append(mk('rotate-ccw', 'Unarchive', () => { const x = _ssList().find(y => y.id === s.id); if (x) { x.archived = false; _ssCommit(`${x.label} is back`); } }));
      }
      r.append(sw, name, cnt, acts);
      return r;
    };
    active.forEach((s, i) => box.appendChild(row(s, i, active.length)));
    // add
    const add = document.createElement('form'); add.className = 'set-item set-add';
    const plus = document.createElement('span'); plus.className = 'set-color set-color-new'; plus.innerHTML = icon('plus');
    const inp = document.createElement('input'); inp.className = 'set-inline'; inp.placeholder = 'Add a stream'; inp.maxLength = 40; inp.setAttribute('aria-label', 'New stream name');
    const go = document.createElement('button'); go.type = 'submit'; go.className = 'btn btn-secondary btn-sm'; go.textContent = 'Add';
    add.append(plus, inp, go);
    add.onsubmit = (e) => {
      e.preventDefault();
      const label = inp.value.trim(); if (!label) { inp.focus(); return; }
      const L = _ssList();
      if (L.some(y => y.label.toLowerCase() === label.toLowerCase())) { toast('A stream with that name exists already.', { kind: 'err' }); return; }
      let id = _ssSlug(label); for (let k = 2; L.some(y => y.id === id); k++) id = `${_ssSlug(label)}-${k}`;
      L.push({ id, label, color: STREAM_SWATCHES[L.length % STREAM_SWATCHES.length], order: L.reduce((m, y) => Math.max(m, y.order ?? 0), -1) + 1, archived: false });
      _ssCommit(`Added ${label}`);
    };
    box.appendChild(add);
    el.appendChild(box);
    if (archived.length) {
      const det = document.createElement('details'); det.className = 'set-archived';
      const sm = document.createElement('summary'); sm.textContent = `Archived (${archived.length})`;
      det.appendChild(sm);
      const ab = document.createElement('div'); ab.className = 'set-list';
      archived.forEach((s, i) => ab.appendChild(row(s, i, archived.length)));
      det.appendChild(ab);
      el.appendChild(det);
    }
    const opts = active.map(s => [s.id, s.label]);
    el.appendChild(_settingsRow('New tasks go to', 'When a view does not imply a stream (for example Today).', _settingsSelect(opts, defaultStreamId(), (v) => {
      state.defaultStream = v; saveData(); toast('Saved', { kind: 'ok' });
    })));
  },
});

/* ---------- quick-add templates ---------- */
function _tplList() {
  if (!Array.isArray(state.quickTemplates)) state.quickTemplates = TEMPLATES.map(t => Object.assign({}, t, { tags: Array.isArray(t.tags) ? t.tags.slice() : [] }));
  return state.quickTemplates;
}
const TPL_REPEAT = [['none', 'Does not repeat'], ['daily', 'Daily'], ['weekdays', 'Weekdays'], ['weekly', 'Weekly'], ['biweekly', 'Every 2 weeks'], ['monthly', 'Monthly']];
const TPL_DUE = [['', 'No date'], ['0', 'Today'], ['1', 'Tomorrow'], ['2', 'In 2 days'], ['7', 'In a week'], ['14', 'In 2 weeks']];
const TPL_PRIO = [['p0', 'No priority'], ['p1', 'High'], ['p2', 'Medium'], ['p3', 'Low']];
registerSettingsGroup({
  id: 'templates', title: 'Templates', icon: 'layout-template', order: 40,
  description: 'One-click starters shown under quick add. A template fills in the title, stream, tags, priority and date.',
  render(el) {
    const L = Array.isArray(state.quickTemplates) ? state.quickTemplates : TEMPLATES;
    const box = document.createElement('div'); box.className = 'set-tpls';
    const commit = (msg) => { applyStreams(state); saveData(); if (msg) toast(msg, { kind: 'ok' }); };
    L.forEach((t, i) => {
      const card = document.createElement('div'); card.className = 'set-tpl';
      const field = (label, control, cls) => { const f = document.createElement('label'); f.className = 'field ' + (cls || ''); const s = document.createElement('span'); s.className = 'field-label'; s.textContent = label; f.append(s, control); return f; };
      const upd = (k, v) => { const list = _tplList(); if (!list[i]) return; list[i][k] = v; commit(); };
      const txt = (v, max, ph, k) => { const x = document.createElement('input'); x.className = 'control control-sm'; x.value = v || ''; x.maxLength = max; x.placeholder = ph; x.onchange = () => upd(k, x.value.trim()); return x; };
      const streamOpts = Object.entries(STREAMS).filter(([, s]) => !s.archived).map(([id, s]) => [id, s.label]);
      const tags = document.createElement('input'); tags.className = 'control control-sm'; tags.value = (t.tags || []).join(', '); tags.placeholder = 'email, follow-up';
      tags.onchange = () => upd('tags', tags.value.split(',').map(x => x.trim().replace(/^#/, '').toLowerCase()).filter(Boolean).slice(0, 10));
      const del = document.createElement('button'); del.type = 'button'; del.className = 'btn-icon btn-sm set-tpl-del'; del.innerHTML = icon('trash-2'); del.setAttribute('aria-label', 'Delete template'); del.setAttribute('data-tip', 'Delete');
      del.onclick = () => { const list = _tplList(); const gone = list.splice(i, 1)[0]; commit(); render(); toast(`Deleted “${gone ? gone.label : ''}”`, { action: { label: 'Undo', run: () => undo() } }); };
      card.append(
        field('Name', txt(t.label, 40, 'Button label', 'label'), 'f-name'),
        field('Task title', txt(t.title, 200, 'e.g. Email re: ', 'title'), 'f-title'),
        field('Stream', _settingsSelect(streamOpts, t.stream || defaultStreamId(), (v) => upd('stream', v))),
        field('Priority', _settingsSelect(TPL_PRIO, t.priority || 'p0', (v) => upd('priority', v))),
        field('Due', _settingsSelect(TPL_DUE, t.daysAhead == null ? '' : String(t.daysAhead), (v) => upd('daysAhead', v === '' ? undefined : Number(v)))),
        field('Repeat', _settingsSelect(TPL_REPEAT, t.recurrence || 'none', (v) => upd('recurrence', v === 'none' ? undefined : v))),
        field('Tags', tags, 'f-tags'),
        del);
      box.appendChild(card);
    });
    if (!L.length) mountEmptyState(box, { icon: 'layout-template', title: 'No templates yet', text: 'Add one for things you type often.', compact: true });
    el.appendChild(box);
    const addB = document.createElement('button'); addB.type = 'button'; addB.className = 'btn btn-secondary btn-sm set-tpl-add';
    addB.innerHTML = icon('plus') + '<span>Add template</span>';
    addB.onclick = () => { _tplList().push({ label: 'New template', title: '', stream: defaultStreamId(), tags: [], priority: 'p0' }); commit(); render(); };
    el.appendChild(addB);
    const n = Array.isArray(state.taskTemplates) ? state.taskTemplates.length : 0;
    const saved = document.createElement('button'); saved.type = 'button'; saved.className = 'btn btn-ghost btn-sm';
    saved.innerHTML = icon('clipboard-list') + `<span>Saved task templates (${n})</span>`;
    saved.onclick = () => openTemplatesModal();
    el.appendChild(_settingsRow('Full task templates', 'Whole tasks with subtasks and notes, saved from a task’s menu.', saved));
  },
});
