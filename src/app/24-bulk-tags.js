/* ============================================================
   BULK TAGS AND CONTEXTS (owner: lists): the bulk bar's Tag and Context
   buttons (32-tasks-ui.js renderBulkBar).
     openBulkTagPicker(anchor, ids)   every tag with a three-way box: on all
                                      the selected tasks, on some (–), on none.
                                      Click (or Space) cycles all -> none -> back;
                                      type to filter, Enter on a new word adds
                                      that tag. Apply (Ctrl+Enter) is one undo step.
     openBulkContextMenu(anchor, ids) the same for contexts, plus energy.
   ============================================================ */
function _btCounts(ids, of) {
  const m = new Map();
  for (const id of ids) { const it = getItem(id); if (!it) continue; for (const t of of(it)) m.set(t, (m.get(t) || 0) + 1); }
  return m;
}
function openBulkTagPicker(anchor, ids) {
  ids = ids.filter(id => getItem(id));
  if (!ids.length) return;
  const n = ids.length;
  const have = _btCounts(ids, effTags);
  const usage = {};
  for (const it of getAllItems()) if (statusOf(it.id) !== 'done') for (const t of effTags(it)) usage[t] = (usage[t] || 0) + 1;
  for (const e of (Array.isArray(state.tagRegistry) ? state.tagRegistry : [])) { const t = typeof e === 'string' ? e : e && (e.id || e.name); if (t && !(t in usage)) usage[t] = 0; }
  const all = [...new Set([...have.keys(), ...Object.keys(usage)])].sort((a, b) => (have.get(b) || 0) - (have.get(a) || 0) || (usage[b] || 0) - (usage[a] || 0) || a.localeCompare(b));
  const want = new Map();   // tag -> 'all' | 'none' (only the ones changed)
  const stateOf = (t) => want.has(t) ? want.get(t) : (have.get(t) || 0) === n ? 'all' : have.get(t) ? 'some' : 'none';
  const cycle = (t) => {
    const cur = stateOf(t), orig = (have.get(t) || 0) === n ? 'all' : have.get(t) ? 'some' : 'none';
    const next = cur === 'all' ? 'none' : 'all';
    // some -> all -> none -> some (back to how it was)
    if (orig === 'some' && cur === 'none') want.delete(t); else if (next === orig) want.delete(t); else want.set(t, next);
  };
  openPopover(anchor, (el, close) => {
    el.classList.add('bt-pop');
    el.innerHTML = `<div class="pop-label">Tags for ${n} task${n === 1 ? '' : 's'}</div>`;
    const q = document.createElement('input'); q.className = 'control control-sm bt-q'; q.placeholder = 'Filter or add a tag…'; q.setAttribute('aria-label', 'Filter or add a tag');
    q.setAttribute('autofocus', '');
    const list = document.createElement('div'); list.className = 'bt-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-multiselectable', 'true');
    const foot = document.createElement('div'); foot.className = 'bt-foot';
    const sum = document.createElement('span'); sum.className = 'subtle bt-sum';
    const apply = document.createElement('button'); apply.type = 'button'; apply.className = 'btn btn-primary btn-sm'; apply.innerHTML = icon('check') + '<span>Apply</span>';
    foot.append(sum, apply);
    el.append(q, list, foot);
    let cursor = 0;
    const visible = () => {
      const f = q.value.trim().toLowerCase().replace(/^#/, '');
      const rows = all.filter(t => !f || t.includes(f));
      const exact = f && all.includes(f);
      return { rows, newTag: f && !exact && /^[\p{L}\p{N}_-]{1,40}$/u.test(f) ? f : null };
    };
    const paint = () => {
      const { rows, newTag } = visible();
      list.innerHTML = '';
      const items = [];
      if (newTag) items.push({ tag: newTag, isNew: true });
      for (const t of rows.slice(0, 60)) items.push({ tag: t });
      cursor = Math.max(0, Math.min(cursor, items.length - 1));
      items.forEach((x, i) => {
        const st = x.isNew ? (want.get(x.tag) === 'all' ? 'all' : 'none') : stateOf(x.tag);
        const b = document.createElement('button'); b.type = 'button';
        b.className = 'pop-item bt-row' + (i === cursor ? ' on' : '') + (want.has(x.tag) ? ' is-changed' : '');
        b.setAttribute('role', 'option'); b.setAttribute('aria-selected', st === 'all' ? 'true' : 'false');
        if (st === 'some') b.setAttribute('aria-checked', 'mixed');
        const cnt = x.isNew ? 'new tag' : st === 'some' ? `${have.get(x.tag)} of ${n}` : (usage[x.tag] ? `${usage[x.tag]} open` : '');
        b.innerHTML = `<span class="bt-box bt-${st}">${st === 'all' ? icon('check', 'i-xs') : st === 'some' ? icon('minus', 'i-xs') : ''}</span>`
          + `<span class="lbl">${x.isNew ? 'Add ' : ''}#${esc(x.tag)}</span><span class="hint">${esc(cnt)}</span>`;
        b.onclick = () => { if (x.isNew) { if (!all.includes(x.tag)) all.unshift(x.tag); want.set(x.tag, 'all'); q.value = ''; } else cycle(x.tag); cursor = i; paint(); q.focus(); };
        list.appendChild(b);
      });
      if (!items.length) list.innerHTML = '<div class="subtle bt-empty">No tags yet. Type one to add it.</div>';
      const adds = [...want].filter(([, v]) => v === 'all').length, rems = [...want].filter(([, v]) => v === 'none').length;
      sum.textContent = adds || rems ? [adds ? `+${adds}` : '', rems ? `−${rems}` : ''].filter(Boolean).join(' ') + ' to apply' : 'Click a tag to add or remove it';
      apply.disabled = !want.size;
    };
    const doApply = () => {
      if (!want.size) { close(); return; }
      const add = [...want].filter(([, v]) => v === 'all').map(([t]) => (typeof tglNorm === 'function' ? tglNorm(t) : t));
      const rem = [...want].filter(([, v]) => v === 'none').map(([t]) => t);
      let changed = 0;
      batchTasks(ids, id => {
        const it = getItem(id); const before = effTags(it);
        let tags = before.filter(t => !rem.includes(t));
        for (const t of add) if (t && !tags.includes(t)) tags.push(t);
        if (before.join('\u0000') !== tags.join('\u0000')) { changed++; logActivity(id, 'tags', { added: tags.filter(x => !before.includes(x)), removed: before.filter(x => !tags.includes(x)) }); it.tags = tags; }
      });
      close();
      const parts = [add.length ? add.map(t => '#' + t).join(' ') + ' added' : '', rem.length ? rem.map(t => '#' + t).join(' ') + ' removed' : ''].filter(Boolean).join(', ');
      toast(changed ? `${parts} on ${changed} task${changed === 1 ? '' : 's'}` : 'Tags already like that', { kind: 'ok', icon: 'hash', action: changed ? { label: 'Undo', run: () => undo() } : undefined });
    };
    apply.onclick = doApply;
    q.addEventListener('input', () => { cursor = 0; paint(); });
    q.addEventListener('keydown', (e) => {
      const rows = [...list.querySelectorAll('.bt-row')];
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cursor = (cursor + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % Math.max(1, rows.length); paint(); const r = list.querySelectorAll('.bt-row')[cursor]; if (r) r.scrollIntoView({ block: 'nearest' }); return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); doApply(); return; }
      if (e.key === 'Enter' || (e.key === ' ' && !q.value.trim())) { e.preventDefault(); if (rows[cursor]) rows[cursor].click(); else if (!q.value.trim()) doApply(); return; }
    });
    paint();
  }, { width: 300, align: 'center' });
}

function openBulkContextMenu(anchor, ids) {
  ids = ids.filter(id => getItem(id));
  if (!ids.length) return;
  const n = ids.length;
  const have = _btCounts(ids, effContexts);
  const toggle = (cid) => {
    const all = (have.get(cid) || 0) === n;
    batchTasks(ids, id => { const it = getItem(id); const cur = effContexts(it); const next = all ? cur.filter(x => x !== cid) : (cur.includes(cid) ? cur : [...cur, cid]); setTaskContexts(id, next, { noSave: true }); });
    toast(`${all ? 'Removed' : 'Added'} @${ctxLabel(cid)} ${all ? 'from' : 'to'} ${n} task${n === 1 ? '' : 's'}`, { kind: 'ok', icon: ctxIcon(cid), action: { label: 'Undo', run: () => undo() } });
  };
  const energy = (lv) => {
    batchTasks(ids, id => setTaskEnergy(id, lv, { noSave: true }));
    toast(lv ? `${TASK_ENERGY[lv].label} on ${n} task${n === 1 ? '' : 's'}` : `Energy cleared on ${n}`, { kind: 'ok', icon: lv ? TASK_ENERGY[lv].icon : 'zap', action: { label: 'Undo', run: () => undo() } });
  };
  const items = [{ heading: `Context for ${n} task${n === 1 ? '' : 's'}` }];
  for (const c of ctxList()) {
    const k = have.get(c.id) || 0;
    items.push({ label: '@' + c.label, icon: c.icon, checked: k === n, hint: k && k < n ? `${k} of ${n}` : '', run: () => toggle(c.id) });
  }
  items.push({ label: 'Clear contexts', icon: 'compass', disabled: !have.size, run: () => { batchTasks(ids, id => setTaskContexts(id, [], { noSave: true })); toast('Contexts cleared', { kind: 'ok', action: { label: 'Undo', run: () => undo() } }); } });
  items.push('sep', { heading: 'Energy' });
  for (const lv of ['low', 'high']) items.push({ label: TASK_ENERGY[lv].label, icon: TASK_ENERGY[lv].icon, checked: ids.every(id => effEnergy(getItem(id)) === lv), run: () => energy(lv) });
  items.push({ label: 'No energy set', icon: 'zap', run: () => energy(null) });
  openMenu(anchor, items, { align: 'center', width: 240 });
}
