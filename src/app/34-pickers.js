/* ============================================================
   REVIEW PICKERS (owner: Review, v2.16): "Waiting on…" (a person) and
   "Blocked by…" (another task). Keyboard-first popovers: type to filter,
   Up/Down to move, Enter to pick, Esc to close.
     rfPickPerson(anchor, {taskId, title, onPick(personId | null)})
       null = "no one in particular"; a name nobody has is offered as a new person.
     rfPickTask(anchor, {taskId, onPick(depId), onRemove(depId)})
       open tasks that would not make a loop; the current blockers are listed with x.
   ============================================================ */
function _rfPickList(pop, o) {
  // o = {placeholder, rows(q) -> [{id, html, run}], head?: el}
  pop.classList.add('rf-pick');
  const inp = document.createElement('input');
  inp.type = 'search'; inp.className = 'control control-sm rf-pick-q'; inp.placeholder = o.placeholder || 'Search'; inp.autocomplete = 'off';
  inp.setAttribute('aria-label', o.placeholder || 'Search');
  const list = document.createElement('div'); list.className = 'rf-pick-list'; list.setAttribute('role', 'listbox');
  if (o.head) pop.appendChild(o.head);
  pop.append(inp, list);
  let rows = [], at = 0;
  const paint = () => {
    rows = o.rows(inp.value.trim()).slice(0, 40);
    at = Math.min(at, Math.max(0, rows.length - 1));
    list.innerHTML = '';
    if (!rows.length) { const e = document.createElement('div'); e.className = 'rf-pick-none'; e.textContent = o.empty || 'Nothing matches'; list.appendChild(e); return; }
    rows.forEach((r, k) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'pop-item rf-pick-row' + (k === at ? ' on' : '');
      b.setAttribute('role', 'option'); b.setAttribute('aria-selected', k === at ? 'true' : 'false');
      b.innerHTML = r.html;
      b.onmousedown = (e) => e.preventDefault();
      b.onclick = () => r.run();
      b.onmousemove = () => { if (at !== k) { at = k; mark(); } };
      list.appendChild(b);
    });
  };
  const mark = () => [...list.children].forEach((c, k) => { c.classList.toggle('on', k === at); c.setAttribute('aria-selected', k === at ? 'true' : 'false'); if (k === at) c.scrollIntoView({ block: 'nearest' }); });
  inp.oninput = () => { at = 0; paint(); };
  inp.onkeydown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); at = Math.min(rows.length - 1, at + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); at = Math.max(0, at - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); if (rows[at]) rows[at].run(); }
  };
  paint();
  setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 0);
  return { repaint: paint };
}

/** People to wait on: linked to the task first, then the people you wait on most, then by name. */
function rfPickPerson(anchor, o) {
  o = o || {};
  const task = o.taskId ? getItem(o.taskId) : null;
  const linked = new Set(task && typeof effPeople === 'function' ? effPeople(task) : []);
  const freq = {};
  for (const t of getAllItems()) if (t.waitingOn) freq[t.waitingOn] = (freq[t.waitingOn] || 0) + 1;
  const people = (state.people || []).filter(p => p && !p.self && !p.archived);
  openPopover(anchor, (pop, close) => {
    const head = document.createElement('div'); head.className = 'pop-label'; head.textContent = o.title || 'Waiting on…';
    _rfPickList(pop, {
      head, placeholder: 'Who are you waiting on?', empty: 'Nobody by that name',
      rows: (q) => {
        const f = q.toLowerCase();
        const hit = (p) => !f || String(p.name || '').toLowerCase().includes(f) || (p.aliases || []).some(a => String(a).toLowerCase().includes(f)) || (p.emails || []).concat(p.email || []).some(m => String(m).toLowerCase().startsWith(f));
        const list = people.filter(hit).sort((a, b) => (linked.has(b.id) - linked.has(a.id)) || ((freq[b.id] || 0) - (freq[a.id] || 0)) || String(a.name).localeCompare(String(b.name)));
        const rows = list.map(p => ({ id: p.id, html: `${homeAvatar(p, 20)}<span class="lbl">${esc(p.name)}</span>${linked.has(p.id) ? '<span class="rf-pick-tag">on this task</span>' : ''}`, run: () => { close(); o.onPick && o.onPick(p.id); } }));
        if (q && !people.some(p => String(p.name || '').toLowerCase() === f)) {
          rows.push({ id: '+new', html: `${icon('user-plus', 'i-sm')}<span class="lbl">Add “${esc(q)}” as a new person</span>`, run: () => {
            const r = typeof createPerson === 'function' ? createPerson({ name: q }) : { error: 'People are not available' };
            close();
            if (r && r.id) { if (o.onPick) o.onPick(r.id); } else toast((r && r.error) || 'Could not add that person', { kind: 'err' });
          } });
        }
        if (!q) rows.push({ id: '-', html: `${icon('hourglass', 'i-sm')}<span class="lbl">Someone (no one in particular)</span>`, run: () => { close(); o.onPick && o.onPick(null); } });
        return rows;
      },
    });
  }, { width: 300, align: o.align || 'start' });
}

/** Tasks this one could wait for: open, not itself, no loop. Same stream and sooner deadlines first. */
function rfPickTask(anchor, o) {
  o = o || {};
  const self = getItem(o.taskId);
  if (!self) return;
  openPopover(anchor, (pop, close) => {
    const head = document.createElement('div'); head.className = 'rf-pick-head';
    const paintHead = () => {
      const cur = (Array.isArray(self.blockedBy) ? self.blockedBy : []).map(getItem).filter(Boolean);
      head.innerHTML = `<div class="pop-label">${cur.length ? 'Waits for' : 'Blocked by… (pick the task that must be done first)'}</div>`;
      for (const t of cur) {
        const row = document.createElement('div'); row.className = 'rf-pick-cur' + (rfIsOpen(t) ? '' : ' is-done');
        row.innerHTML = `${icon(rfIsOpen(t) ? 'lock' : 'lock-open', 'i-sm')}<span class="lbl">${esc(effTitle(t))}</span>`;
        const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon btn-sm'; x.setAttribute('aria-label', 'Remove'); x.innerHTML = icon('x', 'i-sm');
        x.onclick = () => { if (o.onRemove) o.onRemove(t.id); paintHead(); picker.repaint(); };
        row.appendChild(x); head.appendChild(row);
      }
    };
    paintHead();
    const picker = _rfPickList(pop, {
      head, placeholder: 'Find the task it waits for', empty: 'No open task matches',
      rows: (q) => {
        const cur = new Set(Array.isArray(self.blockedBy) ? self.blockedBy : []);
        const words = q.toLowerCase().split(/\s+/).filter(Boolean);
        const cands = getAllItems().filter(t => t.id !== self.id && rfIsOpen(t) && !cur.has(t.id) && !rfDependsOn(t.id, self.id)
          && (!words.length || words.every(w => String(effTitle(t)).toLowerCase().includes(w))));
        const score = (t) => (effStream(t) === effStream(self) ? 0 : 1) * 1e6 + (effDate(t) ? Math.max(-999, daysUntil(effDate(t))) + 1000 : 5000);
        return cands.sort((a, b) => score(a) - score(b)).map(t => ({ id: t.id, html: `${typeof streamMarkHtml === 'function' ? streamMarkHtml(effStream(t)) : ''}<span class="lbl">${esc(effTitle(t))}</span>${effDate(t) ? `<span class="rf-pick-tag">${esc(dueLabel(effDate(t)))}</span>` : ''}`, run: () => { close(); o.onPick && o.onPick(t.id); } }));
      },
    });
  }, { width: 360, align: o.align || 'start' });
}

/* ---------- the task-level entry points (menu, W / B keys, the flows) ---------- */
function rfAskWaiting(id, anchor, after) {
  const i = getItem(id); if (!i) return;
  rfPickPerson(anchor, { taskId: id, onPick: (pid) => {
    const m = rfDo('wait', id, { person: pid });
    const p = pid ? getPerson(pid) : null;
    if (after) after(m, pid); else rfToast(`Waiting on ${p ? p.name : 'someone'}: it moved to your Waiting list`, m, 'hourglass');
  } });
}
function rfStopWaiting(id) {
  const m = rfDo('unwait', id);
  if (m) rfToast('Back on your list', m, 'rotate-ccw');
}
function rfAskBlocked(id, anchor) {
  rfPickTask(anchor, { taskId: id,
    onPick: (dep) => { const m = rfDo('block', id, { dep }); if (m) rfToast(`Blocked until “${String(effTitle(getItem(dep))).slice(0, 60)}” is done`, m, 'lock'); },
    onRemove: (dep) => { const m = rfDo('unblock', id, { dep }); if (m) rfToast('Dependency removed', m, 'lock-open'); },
  });
}
