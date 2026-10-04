/* ============================================================
   CUSTOMISE + RENAME (owner: Customise). Right-click a stream, a tag or a
   person wherever it shows (sidebar, task rows, the task card, Settings >
   Streams, the stream / tag view title, All tags, People) for ONE shared
   menu: rename in place, colour / symbol / shape, and the actions that
   belong to it. The same menu opens with the keyboard's Menu key or
   Shift+F10 on the focused item, and with a long press on touch screens.

   Mark an element:   data-cz="stream|tag|person" data-cz-id="<id>"
                      (czAttrs(kind, id) in markup, czMark(el, kind, id) on elements;
                      data-cz-label on the part that holds the name, for rename)
   Draw a marker:     streamMarkHtml(id), tagMarkHtml(tag), czMarkHtml({color, icon, shape})
                      (one helper, so the sidebar, chips, the card, the calendar
                      and the palette all agree); people keep avatarHtml, which
                      shows their symbol instead of the initials.
   Every change goes through the actions layer (update_stream, reorder_streams,
   update_tag, rename_tag, merge_tags, delete_tag, update_person,
   merge_people) with an Undo toast, so the page, the assistant and MCP share
   one implementation. Pure rules: 28-customise-logic.js (also the server's).
   ============================================================ */
const _CZ_CLIENT = 'right-click menu';
let _czKeyAt = 0;            // when the keyboard (or a long press) opened a menu: its own contextmenu event follows
let _czPress = null;         // a touch long press in progress: {timer, x, y}
let _czSwallowClick = 0;     // a long press opened the menu: the click that follows does nothing
let _czQueue = Promise.resolve();   // one change at a time (popover clicks in quick succession)

/* ---------- marking elements ---------- */
function czAttrs(kind, id) { return id ? ` data-cz="${escAttr(kind)}" data-cz-id="${escAttr(id)}"` : ''; }
function czMark(el, kind, id) {
  if (el && id) { el.dataset.cz = kind; el.dataset.czId = id; }
  return el;
}

/* ---------- markers (one helper, drawn everywhere) ---------- */
/** A marker: <span class="dot mk mk-<shape> [mk-sym]" style="--c"> + symbol. Escaped. */
function czMarkHtml(o, extraCls) {
  o = o || {};
  const p = czMarkParts(o);
  const style = o.color ? ` style="--c:${escAttr(safeColor(o.color))}"` : '';
  const inner = p.iconKind === 'icon' ? icon(p.icon) : p.iconKind === 'emoji' ? `<span class="mk-e">${esc(p.icon)}</span>` : '';
  return `<span class="dot ${czMarkClass(p)}${extraCls ? ' ' + String(extraCls).replace(/[^a-z0-9 _-]/gi, '') : ''}"${style} aria-hidden="true">${inner}</span>`;
}
/** A stream's marker. o.inherit: take --c from the parent (.stream chips set it). */
function streamMarkHtml(sid, o) {
  o = o || {};
  const s = (typeof STREAMS !== 'undefined' && STREAMS[sid]) || {};
  return czMarkHtml({ color: o.inherit ? '' : (s.color || '#868a94'), icon: s.icon, shape: s.shape }, o.cls);
}
/** Is the stream's marker more than the plain dot (the calendar only shows customised ones)? */
function streamIsCustomised(sid) { const s = STREAMS[sid]; return !!(s && czIsCustom(s)); }
/** A tag's registry entry (colour, symbol), or {}. */
function czTagLook(tag) { return (typeof tglEntry === 'function' && tglEntry(state, tag)) || {}; }
/** A tag's marker: its symbol in its colour, or a dot of its colour; '' when it has neither. */
function tagMarkHtml(tag, o) {
  o = o || {};
  const e = czTagLook(tag);
  if (!e.color && !e.icon) return o.fallback || '';
  return czMarkHtml({ color: e.color || '', icon: e.icon }, 'mk-tag' + (e.icon ? ' mk-bare' : '') + (o.cls ? ' ' + o.cls : ''));
}
/** Give a tag chip its colour and symbol (a tint and a leading marker). */
function czTagChip(el, tag) {
  if (!el) return el;
  czMark(el, 'tag', tag);
  const e = czTagLook(tag);
  if (e.color) { el.style.setProperty('--c', safeColor(e.color)); el.classList.add('cz-tinted'); }
  if (e.color || e.icon) el.insertAdjacentHTML('afterbegin', tagMarkHtml(tag));
  return el;
}

/* ---------- the actions layer ---------- */
async function _czPost(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.ok === false) {
    const err = j.error || {};
    const inner = Array.isArray(err.errors) && err.errors.length === 1 ? err.errors[0] : err;
    const e = new Error(String(inner.message || err.message || `The dashboard answered ${r.status}`).replace(/^ops\[\d+\] \([a-z._]+\): /, ''));
    e.code = inner.code || err.code; e.confirm = err.confirm; e.hint = inner.hint;
    throw e;
  }
  return j;
}
/** A message for a failed change: the shared "server isn't running" text (02-core-net.js), else the server's own. */
function _czErrText(e) {
  if (typeof netIsDown === 'function' && netIsDown(e)) return netErrorMessage(e);
  return (e && e.message ? e.message : 'That did not work') + (e && e.hint ? ` (${e.hint})` : '');
}
/**
 * Apply ops through POST /api/actions, adopt the result, render, and offer
 * Undo. o: {done, icon, confirmed (the caller already asked: a danger op runs
 * its dry run silently), after(j), undone()}. -> the result or null.
 */
function czApply(ops, o) {
  o = o || {};
  const job = _czQueue.then(() => _czApplyNow(ops, o));
  _czQueue = job.catch(() => null);
  return job;
}
async function _czApplyNow(ops, o) {
  const body = { ops, source: 'ui', client: _CZ_CLIENT };
  try {
    // The server must have this tab's latest edits before it changes anything.
    if (typeof _persistFire === 'function' && (state._localDirty || (typeof _persistTimer !== 'undefined' && _persistTimer))) { _persistFire(); await new Promise(r => setTimeout(r, 400)); }
    let j;
    if (o.confirmed) {
      const dry = await _czPost('/api/actions', Object.assign({}, body, { dryRun: true }));
      j = await _czPost('/api/actions', Object.assign({}, body, { confirm: dry.confirm }));
    } else {
      try { j = await _czPost('/api/actions', body); }
      catch (e) {
        if (e.code !== 'NEEDS_CONFIRM') throw e;
        const ok = await confirmDialog({ title: o.confirmTitle || 'Apply this change?', text: 'It changes a lot at once. You can undo it afterwards.', confirmLabel: 'Apply' });
        if (!ok) return null;
        j = await _czPost('/api/actions', Object.assign({}, body, { confirm: e.confirm }));
      }
    }
    if (typeof _asstAdopt === 'function') await _asstAdopt(j.version);
    if (o.after) try { o.after(j); } catch (e) { console.error('[customise]', e); }
    render();
    if (typeof _tmRepaint === 'function') _tmRepaint();   // the tag manager modal, when open
    if (o.done !== false) toast(o.done || j.summary || 'Done', { kind: 'ok', icon: o.icon || 'circle-check', action: j.undo ? { label: 'Undo', run: () => czUndo(j.undo, o.undone) } : undefined });
    return j;
  } catch (e) {
    toast(_czErrText(e), { kind: 'err' });
    return null;
  }
}
async function czUndo(token, after) {
  try {
    const u = await _czPost('/api/actions/undo', { token, source: 'ui', client: _CZ_CLIENT });
    if (typeof _asstAdopt === 'function') await _asstAdopt(u.version);
    if (after) try { after(); } catch (e) { console.error('[customise]', e); }
    render();
    if (typeof _tmRepaint === 'function') _tmRepaint();
    toast('Undone', { kind: 'ok', icon: 'undo-2' });
  } catch (e) { toast(_czErrText(e), { kind: 'err' }); }
}

/* ---------- opening the menu: right-click, Menu key / Shift+F10, long press ---------- */
function _czTarget(node) {
  const el = node && node.closest ? node.closest('[data-cz][data-cz-id]') : null;
  if (!el || !['stream', 'tag', 'person'].includes(el.dataset.cz)) return null;
  // Text fields keep the browser's own menu (copy, paste); menus and popovers stay as they are.
  if (node.closest('input, textarea, [contenteditable="true"], .pop')) return null;
  return el;
}
document.addEventListener('contextmenu', (e) => {
  const el = _czTarget(e.target);
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  if (_czPress) { clearTimeout(_czPress.timer); _czPress = null; _czSwallowClick = Date.now(); }
  if (Date.now() - _czKeyAt < 700) return;            // the key (or the long press) opened it already
  const fromKeys = !e.clientX && !e.clientY;           // the Menu key: no pointer position
  czOpenMenu(el, fromKeys ? null : { x: e.clientX, y: e.clientY });
}, true);
document.addEventListener('keydown', (e) => {
  if (!(e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) return;
  const el = _czTarget(document.activeElement);
  if (!el) return;
  e.preventDefault(); e.stopPropagation();
  _czKeyAt = Date.now();
  czOpenMenu(el, null);
}, true);
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  const el = _czTarget(e.target);
  if (!el) return;
  if (_czPress) clearTimeout(_czPress.timer);
  const at = { x: e.clientX, y: e.clientY };
  _czPress = { x: at.x, y: at.y, timer: setTimeout(() => { _czPress = null; _czKeyAt = _czSwallowClick = Date.now(); czOpenMenu(el, at); }, 550) };
}, true);
document.addEventListener('pointermove', (e) => {
  if (_czPress && Math.hypot(e.clientX - _czPress.x, e.clientY - _czPress.y) > 10) { clearTimeout(_czPress.timer); _czPress = null; }
}, true);
for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, () => { if (_czPress) { clearTimeout(_czPress.timer); _czPress = null; } }, true);
// The tap that ends a long press: its mousedown would close the menu it just opened
// (openPopover listens on document too, so stopImmediatePropagation), its click would navigate.
for (const ev of ['mousedown', 'click']) document.addEventListener(ev, (e) => {
  if (Date.now() - _czSwallowClick < 700 && _czTarget(e.target)) { e.preventDefault(); e.stopImmediatePropagation(); if (ev === 'click') _czSwallowClick = 0; }
}, true);

/** A 1px fixed anchor at a pointer position (removed when the popover closes). */
function _czPoint(at) {
  const a = document.createElement('span');
  a.className = 'menu-point';
  a.style.cssText = `position:fixed;left:${Math.round(at.x)}px;top:${Math.round(at.y)}px;width:1px;height:1px;pointer-events:none`;
  document.body.appendChild(a);
  return a;
}
/** Where a follow-up popover opens: the element if it is still on the page, else the point. */
function _czWhere(el, at) {
  if (at) return at;
  if (el && el.isConnected && el.offsetParent !== null) return el;
  return { x: window.innerWidth / 2 - 150, y: 120 };
}
function _czOpenAt(where, fill, opts) {
  const anchor = where instanceof Element ? where : _czPoint(where);
  let pop = null;
  const close = openPopover(anchor, (el, c) => { pop = el; fill(el, c); }, Object.assign({ align: 'start' }, opts || {}, {
    onClose: () => { if (anchor !== where) anchor.remove(); if (opts && opts.onClose) opts.onClose(); },
  }));
  // Too tall to fit above or below the point: keep it on screen (offset sizes: the entrance animation scales it).
  if (pop) { const top = parseFloat(pop.style.top) || 0, h = pop.offsetHeight; if (top + h > window.innerHeight - 8) pop.style.top = Math.max(8, Math.round(window.innerHeight - h - 8)) + 'px'; }
  return close;
}
/** The right-click menu for a marked element. at = {x, y} (pointer) or null (keyboard: under the element). */
function czOpenMenu(el, at) {
  const kind = el.dataset.cz, id = el.dataset.czId;
  const items = kind === 'stream' ? czStreamItems(id, el, at) : kind === 'tag' ? czTagItems(id, el, at) : czPersonItems(id, el, at);
  if (!items) return;
  closePopovers();
  _czOpenAt(at || el, (pop, close) => buildMenuItems(pop, items, close), { role: 'menu', width: 252, className: 'cz-menu' });
}

/* ---------- streams ---------- */
/** The streams in display order: [{id, archived}]. */
function _czStreamOrder() {
  return Object.entries(STREAMS).filter(([, s]) => !s.synthetic).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0)).map(([id, s]) => ({ id, archived: !!s.archived }));
}
function czStreamItems(sid, el, at) {
  const s = STREAMS[sid];
  if (!s) return null;
  const live = _czStreamOrder().filter(x => !x.archived).map(x => x.id);
  const i = live.indexOf(sid);
  const here = state.view === 'stream:' + sid;
  const calOnly = typeof calPrefs === 'function' && calPrefs().stream === sid && String(state.view).startsWith('calendar');
  const label = s.label;
  return [
    { heading: 'Stream' },
    { label: 'Open ' + label, icon: 'layers', disabled: here, run: () => setView('stream:' + sid) },
    { label: 'Rename…', icon: 'pencil', run: () => czRename('stream', sid, el) },
    { label: 'Colour, symbol & shape…', icon: streamMarkHtml(sid), run: () => czOpenCustomise('stream', sid, _czWhere(el, at)) },
    'sep',
    { label: 'New task in this stream', icon: 'circle-plus', run: () => openNewTask('+' + sid + ' ') },
    { label: 'Show in calendar', icon: 'calendar', disabled: calOnly, hint: calOnly ? 'shown' : '', run: () => czShowStreamInCalendar(sid) },
    { label: 'Copy link', icon: 'link', run: () => czCopyLink('stream:' + sid, label) },
    'sep',
    { label: 'Move up', icon: 'arrow-up', disabled: s.archived || i <= 0, run: () => czMoveStream(sid, -1) },
    { label: 'Move down', icon: 'arrow-down', disabled: s.archived || i < 0 || i >= live.length - 1, run: () => czMoveStream(sid, 1) },
    s.archived
      ? { label: 'Unarchive', icon: 'archive-restore', run: () => czApply([{ op: 'stream.update', stream: sid, archived: false }], { done: `${label} is back in the sidebar`, icon: 'archive-restore' }) }
      : { label: 'Archive', icon: 'archive', disabled: live.length <= 1, title: live.length <= 1 ? 'Keep at least one stream' : '', run: () => czApply([{ op: 'stream.update', stream: sid, archived: true }], { done: `Archived ${label}: its tasks are kept`, icon: 'archive' }) },
  ];
}
function czMoveStream(sid, dir) {
  const ids = czMoveOrder(_czStreamOrder(), sid, dir);
  if (!ids) return;
  czApply([{ op: 'stream.reorder', ids }], { done: `Moved ${STREAMS[sid] ? STREAMS[sid].label : sid} ${dir < 0 ? 'up' : 'down'}`, icon: dir < 0 ? 'arrow-up' : 'arrow-down' });
}
/** The calendar with only this stream's tasks (a chip there clears it). */
function czShowStreamInCalendar(sid) {
  const p = calPrefs();
  p.stream = sid;
  if (p.hidden) delete p.hidden.tasks;
  saveUI();
  if (!String(state.view).startsWith('calendar')) setView('calendar'); else render();
}
function czCopyLink(view, label) {
  const url = location.origin + location.pathname + '#view=' + encodeURIComponent(view).replace(/%3A/gi, ':');
  const done = () => toast(`Copied a link to ${label}`, { kind: 'ok', icon: 'link' });
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => toast('Could not copy the link', { kind: 'err' }));
  else toast('Could not copy the link', { kind: 'err' });
}

/* ---------- tags ---------- */
function _czTagCount(tag) {
  let n = 0, open = 0;
  for (const i of getAllItems()) if (effTags(i).includes(tag)) { n++; if (statusOf(i.id) !== 'done') open++; }
  return { n, open };
}
function czTagItems(tag, el, at) {
  const c = _czTagCount(tag);
  const pinned = tglIsPinned(state, tag);
  const here = state.view === 'tag:' + tag;
  return [
    { heading: '#' + tag },
    { label: 'Show tasks', icon: 'list', hint: `${c.open} open`, disabled: here, run: () => setView('tag:' + tag) },
    { label: 'Rename…', icon: 'pencil', run: () => czRename('tag', tag, el) },
    { label: 'Merge into…', icon: 'git-merge', run: () => czTagMerge(tag) },
    { label: 'Colour & symbol…', icon: tagMarkHtml(tag) || 'palette', run: () => czOpenCustomise('tag', tag, _czWhere(el, at)) },
    { label: pinned ? 'Unpin from the sidebar' : 'Pin to the sidebar', icon: pinned ? 'pin-off' : 'pin',
      run: () => czApply([{ op: 'tag.update', tag, pinned: !pinned }], { done: pinned ? `Unpinned #${tag}` : `Pinned #${tag} to the sidebar`, icon: pinned ? 'pin-off' : 'pin' }) },
    'sep',
    { label: 'Delete…', icon: 'trash-2', danger: true, hint: c.n ? `${c.n} task${c.n === 1 ? '' : 's'}` : '', run: () => czTagDelete(tag) },
  ];
}
/** This tab follows a renamed or merged tag: its view and that view's sort/group (UI keys stay per tab). */
function czFollowTag(from, to) {
  const before = state.view;
  tglRenameRefs(state, from, to);
  if (state.view !== before) { saveUI(); _syncViewHash(); }
}
async function czRenameTag(tag, raw) {
  const it = czTagRenameIntent(tag, raw, tglKnown(state), tglNorm);
  if (it.kind === 'empty' || it.kind === 'same') return;
  if (it.kind === 'merge') {
    const c = _czTagCount(tag);
    const ok = await confirmDialog({
      title: `#${it.to} already exists`,
      text: `Merge #${tag} into #${it.to}? ${c.n} task${c.n === 1 ? '' : 's'} with #${tag} get #${it.to} instead, and #${tag} goes. You can undo it.`,
      confirmLabel: `Merge into #${it.to}`,
    });
    if (!ok) return;
    return czApply([{ op: 'tag.merge', from: [tag], into: it.to }], { confirmed: true, icon: 'git-merge', done: `Merged #${tag} into #${it.to}`, after: () => czFollowTag(tag, it.to), undone: () => czFollowTag(it.to, tag) });
  }
  // Typing the new name is the confirmation, even when it touches more than 25 tasks.
  return czApply([{ op: 'tag.rename', from: tag, to: it.to }], { confirmed: true, icon: 'tags', after: () => czFollowTag(tag, it.to), undone: () => czFollowTag(it.to, tag) });
}
function czTagMerge(tag) {
  let input = null, info = null;
  const others = tagPickerOptions('', [tag]);
  openDialog({
    title: `Merge #${tag} into…`, width: 440,
    body: (el) => {
      const f = document.createElement('label'); f.className = 'field';
      f.innerHTML = '<span class="field-label">Tag to keep</span>';
      input = document.createElement('input'); input.className = 'control'; input.placeholder = others[0] ? others[0].tag : 'tag'; input.setAttribute('autofocus', '');
      const dl = document.createElement('datalist'); dl.id = 'cz-merge-dl';
      for (const o of others) { const op = document.createElement('option'); op.value = o.tag; dl.appendChild(op); }
      input.setAttribute('list', dl.id);
      info = document.createElement('span'); info.className = 'field-hint';
      const c = _czTagCount(tag);
      const upd = () => {
        const to = tglNorm(input.value);
        info.textContent = !to || to === tag ? `Pick the tag that ${c.n} task${c.n === 1 ? '' : 's'} with #${tag} should get instead.`
          : tagIsKnown(to) ? `${c.n} task${c.n === 1 ? '' : 's'} get #${to}; #${tag} goes.` : `#${to} is new, so this renames #${tag}.`;
      };
      input.oninput = upd; upd();
      input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = el.closest('.modal').querySelector('.modal-f .btn-danger'); if (b) b.click(); } };
      f.append(input, dl, info);
      el.appendChild(f);
    },
    actions: [{ label: 'Cancel' }, { label: 'Merge', danger: true, run: () => {
      const to = tglNorm(input.value);
      if (!to || to === tag) { input.focus(); return false; }
      if (!tagIsKnown(to)) { czRenameTag(tag, to); return true; }
      czApply([{ op: 'tag.merge', from: [tag], into: to }], { confirmed: true, icon: 'git-merge', done: `Merged #${tag} into #${to}`, after: () => czFollowTag(tag, to), undone: () => czFollowTag(to, tag) });
      return true;
    } }],
  });
}
async function czTagDelete(tag) {
  const c = _czTagCount(tag);
  const ok = await confirmDialog({
    title: `Delete #${tag}?`,
    text: `It comes off ${c.n} task${c.n === 1 ? '' : 's'} (${c.open} open), the templates and the sidebar. The tasks stay. You can undo it.`,
    confirmLabel: c.n ? `Delete from ${c.n} task${c.n === 1 ? '' : 's'}` : 'Delete', danger: true,
  });
  if (!ok) return;
  czApply([{ op: 'tag.delete', tag }], { confirmed: true, icon: 'trash-2', done: `Deleted #${tag}`,
    after: () => { if (state.view === 'tag:' + tag) { state.view = 'tags'; saveUI(); _syncViewHash(); } } });
}

/* ---------- people ---------- */
function czPersonItems(pid, el, at) {
  const p = getPerson(pid);
  if (!p) return null;
  const here = state.view === 'person:' + pid;
  const first = String(p.name || '').split(/\s+/)[0] || p.name;
  return [
    { heading: p.self ? 'You' : 'Person' },
    { label: 'Open ' + p.name, icon: 'user', disabled: here, run: () => { state.selectedTaskId = null; setView('person:' + pid); } },
    { label: 'Rename…', icon: 'pencil', run: () => czRename('person', pid, el) },
    { label: 'Colour & symbol…', icon: avatarHtmlInitials(p, 16), run: () => czOpenCustomise('person', pid, _czWhere(el, at)) },
    { label: 'Edit details…', icon: 'contact', run: () => openPersonEditor(pid) },
    'sep',
    { label: `New task for ${first}`, icon: 'circle-plus', run: () => openNewTask('@' + pid + ' ') },
    { label: p.pinned ? 'Unpin from the sidebar' : 'Pin to the sidebar', icon: p.pinned ? 'pin-off' : 'pin',
      run: () => czApply([{ op: 'person.update', id: pid, pinned: !p.pinned }], { done: p.pinned ? `Unpinned ${p.name}` : `Pinned ${p.name} to the sidebar`, icon: p.pinned ? 'pin-off' : 'pin' }) },
    p.self ? null : 'sep',
    p.self ? null : { label: 'Merge into…', icon: 'git-merge', run: () => czPersonMerge(pid) },
  ];
}
function czPersonMerge(pid) {
  const a = getPerson(pid);
  if (!a) return;
  const others = (state.people || []).filter(x => x && x.id !== a.id && !x.stub).sort((x, y) => String(x.name).localeCompare(String(y.name)));
  let sel = null;
  openDialog({
    title: `Merge ${a.name} into…`, width: 460,
    body: (el) => {
      const p = document.createElement('p'); p.className = 'muted';
      p.textContent = `For duplicates. ${a.name}'s task links, emails, aliases and notes move to the person you pick, and ${a.name}'s name becomes one of their aliases.`;
      sel = document.createElement('select'); sel.className = 'control'; sel.setAttribute('autofocus', '');
      sel.innerHTML = '<option value="">Choose a person…</option>' + others.map(o => `<option value="${escAttr(o.id)}">${esc(o.name)}${o.org ? ' · ' + esc(o.org) : ''}</option>`).join('');
      const n = tasksForPerson(a.id).length;
      const info = document.createElement('div'); info.className = 'field-hint';
      info.textContent = `${n} task${n === 1 ? '' : 's'} will be relinked. You can undo it.`;
      el.append(p, sel, info);
    },
    actions: [{ label: 'Cancel' }, { label: 'Merge', danger: true, run: () => {
      if (!sel.value) { sel.focus(); return false; }
      const into = getPerson(sel.value);
      czApply([{ op: 'person.merge', from: a.id, into: sel.value }], { confirmed: true, icon: 'git-merge', done: `Merged ${a.name} into ${into ? into.name : sel.value}`,
        after: () => { if (state.view === 'person:' + a.id) { state.view = 'person:' + sel.value; saveUI(); _syncViewHash(); } } });
      return true;
    } }],
  });
}

/* ---------- rename in place ---------- */
function _czLabelEl(el) {
  return el.querySelector('[data-cz-label]') || el.querySelector(':scope > .label') || el.querySelector('.pp-name') || el;
}
function czRename(kind, id, el) {
  const cur = kind === 'stream' ? (STREAMS[id] && STREAMS[id].label) : kind === 'tag' ? id : (getPerson(id) || {}).name;
  if (cur == null) return;
  const commit = (v) => {
    if (kind === 'tag') return czRenameTag(id, v);
    if (kind === 'stream') return czApply([{ op: 'stream.update', stream: id, label: v }], { icon: 'pencil', done: `Renamed to ${v}` });
    return czApply([{ op: 'person.update', id, name: v }], { icon: 'pencil', done: `Renamed to ${v}. The old name still links their tasks.` });
  };
  const what = kind === 'stream' ? 'stream' : kind === 'tag' ? 'tag' : 'person';
  czInlineRename(el, cur, commit, { label: `New name for the ${what}`, max: kind === 'stream' ? 40 : kind === 'tag' ? 40 : 100, title: `Rename ${kind === 'tag' ? '#' + cur : cur}` });
}
/**
 * Edit a name where it is shown: a field over the label (Enter saves, Esc
 * cancels, clicking away saves). A label that is already a text field is
 * just focused; one that is not on screen gets a small dialog instead.
 */
function czInlineRename(el, value, onCommit, o) {
  o = o || {};
  const lab = el && el.isConnected ? _czLabelEl(el) : null;
  if (lab && lab.tagName === 'INPUT') { lab.focus(); lab.select(); return; }
  const r = lab && lab.offsetParent !== null ? lab.getBoundingClientRect() : null;
  if (!r || !r.width || r.bottom < 0 || r.top > window.innerHeight) {
    promptDialog({ title: o.title || 'Rename', label: o.label, value, confirmLabel: 'Rename' }).then(v => { if (v && v.trim() && v.trim() !== value) onCommit(v.trim()); });
    return;
  }
  const inp = document.createElement('input');
  inp.className = 'control control-sm cz-rename';
  inp.value = value; inp.maxLength = o.max || 60;
  inp.setAttribute('aria-label', o.label || 'New name');
  const cs = getComputedStyle(lab);
  const w = Math.min(Math.max(r.width + 48, 150), window.innerWidth - 16);
  inp.style.cssText = `position:fixed;left:${Math.round(Math.max(8, Math.min(r.left - 6, window.innerWidth - w - 8)))}px;top:${Math.round(r.top + r.height / 2 - 13)}px;width:${Math.round(w)}px;font-size:${cs.fontSize};font-weight:${cs.fontWeight}`;
  document.body.appendChild(inp);
  inp.focus(); inp.select();
  let done = false;
  const finish = (save) => {
    if (done) return; done = true;
    window.removeEventListener('resize', cancel);
    const v = inp.value.trim();
    inp.remove();
    if (save && v && v !== value) onCommit(v);
    else if (el && el.isConnected && el.focus) try { el.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
  };
  const cancel = () => finish(false);
  inp.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(false); }
  };
  inp.onblur = () => finish(true);
  window.addEventListener('resize', cancel);
}

/* ---------- the customise popover: colour, symbol, shape, with a live preview ---------- */
function _czLook(kind, id) {
  if (kind === 'stream') { const s = STREAMS[id] || {}; return { name: s.label || id, color: s.color || '', icon: s.icon || '', shape: s.shape || 'dot' }; }
  if (kind === 'tag') { const e = czTagLook(id); return { name: '#' + id, color: e.color || '', icon: e.icon || '', shape: 'dot' }; }
  const p = getPerson(id) || {};
  return { name: p.name || id, color: p.color || '', icon: p.icon || '', shape: 'dot' };
}
function _czPreviewHtml(kind, id, cur) {
  if (kind === 'stream') {
    return `<span class="cz-pv-row">${czMarkHtml(cur)}<span class="truncate">${esc(cur.name)}</span></span>`
      + `<span class="stream cz-pv-chip" style="--c:${escAttr(safeColor(cur.color))}">${czMarkHtml({ icon: cur.icon, shape: cur.shape })}<span>${esc(cur.name)}</span></span>`;
  }
  if (kind === 'tag') {
    const mark = cur.color || cur.icon ? czMarkHtml({ color: cur.color, icon: cur.icon }, 'mk-tag' + (cur.icon ? ' mk-bare' : '')) : '';
    return `<span class="chip t-tag${cur.color ? ' cz-tinted' : ''}"${cur.color ? ` style="--c:${escAttr(safeColor(cur.color))}"` : ''}>${mark}<span>${esc(cur.name.slice(1))}</span></span>`;
  }
  const p = Object.assign({}, getPerson(id) || {}, { color: cur.color, icon: cur.icon, avatarUrl: '' });
  return `<span class="cz-pv-row">${avatarHtmlInitials(p, 28)}<span class="truncate">${esc(cur.name)}</span></span>`;
}
/** The sprite's icon ids (read once from the inlined sprite). */
let _czIcons = null;
function czSpriteIcons() {
  if (!_czIcons) _czIcons = [...document.querySelectorAll('#icon-sprite symbol[id^="i-"]')].map(s => s.id.slice(2));
  return _czIcons;
}
function czOpenCustomise(kind, id, where) {
  const look = _czLook(kind, id);
  const cur = Object.assign({}, look);       // what the preview shows
  const saved = Object.assign({}, look);     // what has been sent
  const op = (patch) => kind === 'stream' ? Object.assign({ op: 'stream.update', stream: id }, patch)
    : kind === 'tag' ? Object.assign({ op: 'tag.update', tag: id }, patch) : Object.assign({ op: 'person.update', id }, patch);
  const what = (f) => (f === 'color' ? 'colour' : f === 'icon' ? 'symbol' : 'shape');
  let symTab = czSymbolKind(cur.icon) === 'emoji' ? 'emoji' : 'icons', symQ = '';
  _czOpenAt(where, (pop) => {
    pop.classList.add('cz-pop');
    pop.setAttribute('aria-label', `Customise ${look.name}`);
    const pv = document.createElement('div'); pv.className = 'cz-pv'; pv.setAttribute('aria-hidden', 'true');
    const paintPv = () => { pv.innerHTML = _czPreviewHtml(kind, id, cur); };
    paintPv();
    pop.appendChild(pv);
    // Every pick: preview now, then one change through the actions layer (with Undo).
    // Picking what is already chosen does nothing.
    const set = (field, v) => {
      v = v || (field === 'shape' ? 'dot' : '');
      cur[field] = v;
      paintPv(); paintAll();
      if ((saved[field] || (field === 'shape' ? 'dot' : '')) === v) return;
      saved[field] = v;
      czApply([op({ [field]: v })], { icon: 'palette', done: `${look.name}: ${what(field)} ${!v ? 'removed' : 'changed'}` });
    };
    const sec = (title) => { const h = document.createElement('div'); h.className = 'cz-h'; h.textContent = title; pop.appendChild(h); };

    // Colour: the app's swatches, then any colour (picker + hex)
    sec('Colour');
    const sw = document.createElement('div'); sw.className = 'cz-swatches'; sw.setAttribute('role', 'radiogroup'); sw.setAttribute('aria-label', 'Colour');
    const palette = typeof STREAM_SWATCHES !== 'undefined' ? STREAM_SWATCHES : ['#4f46e5', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#7c3aed', '#64748b'];
    pop.appendChild(sw);
    const custom = document.createElement('div'); custom.className = 'cz-custom';
    const picker = document.createElement('input'); picker.type = 'color'; picker.setAttribute('aria-label', 'Any colour');
    const hex = document.createElement('input'); hex.className = 'control control-sm cz-hex'; hex.placeholder = '#2563eb'; hex.maxLength = 7; hex.spellcheck = false; hex.setAttribute('aria-label', 'Colour as hex');
    picker.oninput = () => { cur.color = picker.value; hex.value = picker.value; paintPv(); };
    picker.onchange = () => set('color', picker.value.toLowerCase());
    const hexGo = () => { const v = czNormHex(hex.value); if (v) set('color', v); else { hex.classList.add('is-invalid'); } };
    hex.oninput = () => { hex.classList.remove('is-invalid'); const v = czNormHex(hex.value); if (v) { pv.innerHTML = _czPreviewHtml(kind, id, Object.assign({}, cur, { color: v })); } };
    hex.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); hexGo(); } };
    hex.onchange = hexGo;
    custom.append(picker, hex);
    if (kind !== 'stream') {
      const none = document.createElement('button'); none.type = 'button'; none.className = 'btn btn-ghost btn-sm cz-nocolor';
      none.textContent = kind === 'tag' ? 'No colour' : 'Default';
      none.onclick = () => set('color', '');
      custom.appendChild(none);
    }
    pop.appendChild(custom);

    // Shape (streams)
    let shapes = null;
    if (kind === 'stream') {
      sec('Shape');
      shapes = document.createElement('div'); shapes.className = 'cz-shapes'; shapes.setAttribute('role', 'radiogroup'); shapes.setAttribute('aria-label', 'Shape');
      pop.appendChild(shapes);
    }

    // Symbol: the app's icons (searchable) or an emoji, or none
    sec('Symbol');
    const bar = document.createElement('div'); bar.className = 'cz-symbar';
    const tabs = document.createElement('div'); tabs.className = 'seg cz-tabs'; tabs.setAttribute('role', 'tablist');
    const q = document.createElement('input'); q.type = 'search'; q.className = 'control control-sm cz-q'; q.setAttribute('aria-label', 'Search symbols, or paste an emoji');
    q.oninput = () => { symQ = q.value; paintGrid(); };
    q.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); const b = grid.querySelector('button'); if (b) b.click(); } };
    bar.append(tabs, q);
    pop.appendChild(bar);
    const grid = document.createElement('div'); grid.className = 'cz-grid'; grid.setAttribute('role', 'listbox'); grid.setAttribute('aria-label', 'Symbols');
    pop.appendChild(grid);
    grid.addEventListener('keydown', (e) => {
      const keys = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
      if (!(e.key in keys)) return;
      const bs = [...grid.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault(); e.stopPropagation();
      const n = bs[Math.max(0, Math.min(bs.length - 1, i + keys[e.key]))]; if (n) n.focus();
    });

    // Built once; a pick only moves the selection (focus stays where it is).
    const pick = (b, on) => { b.classList.toggle('on', on); b.setAttribute(b.getAttribute('role') === 'option' ? 'aria-selected' : 'aria-checked', String(on)); };
    for (const c of palette) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cz-sw'; b.dataset.val = c;
      b.style.setProperty('--c', c); b.setAttribute('role', 'radio'); b.setAttribute('aria-label', 'Colour ' + c); b.title = c;
      b.onclick = () => set('color', c);
      sw.appendChild(b);
    }
    if (shapes) {
      for (const s of CZ_SHAPES) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'cz-shape'; b.dataset.val = s;
        b.setAttribute('role', 'radio'); b.setAttribute('aria-label', CZ_SHAPE_LABELS[s]); b.setAttribute('data-tip', CZ_SHAPE_LABELS[s]);
        b.innerHTML = czMarkHtml({ shape: s });
        b.onclick = () => set('shape', s);
        shapes.appendChild(b);
      }
    }
    function paintSwatches() {
      const c = String(cur.color || '').toLowerCase();
      for (const b of sw.children) pick(b, b.dataset.val === c);
      const hv = czNormHex(cur.color);
      picker.value = hv || '#64748b';
      if (document.activeElement !== hex) hex.value = hv || '';
      pop.style.setProperty('--c', safeColor(cur.color, 'var(--fg-subtle)'));
    }
    function paintShapes() {
      if (shapes) for (const b of shapes.children) pick(b, b.dataset.val === (cur.shape || 'dot'));
    }
    function paintTabs() {
      tabs.innerHTML = '';
      for (const [k, l] of [['icons', 'Icons'], ['emoji', 'Emoji']]) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = l; b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(symTab === k)); b.setAttribute('aria-pressed', String(symTab === k));
        b.onclick = () => { if (symTab === k) return; symTab = k; paintTabs(); paintGrid(); };
        tabs.appendChild(b);
      }
      q.placeholder = symTab === 'icons' ? 'Search icons…' : 'Type or paste an emoji';
    }
    function paintGrid() {
      grid.innerHTML = '';
      grid.classList.toggle('emoji', symTab === 'emoji');
      const sym = (val, html, label) => {
        const b = document.createElement('button'); b.type = 'button';
        b.className = val ? '' : 'cz-none'; b.dataset.val = val;
        b.setAttribute('role', 'option'); b.setAttribute('aria-label', label); b.title = label;
        b.innerHTML = html;
        b.onclick = () => set('icon', val);
        grid.appendChild(b);
      };
      sym('', icon('circle-x'), 'No symbol');
      const typed = symQ.trim();
      if (typed && czIsEmoji(typed)) sym(typed, `<span>${esc(typed)}</span>`, 'Use ' + typed);
      if (symTab === 'emoji') {
        for (const e of CZ_EMOJI) sym(e, `<span>${esc(e)}</span>`, e);
      } else {
        const curated = typeof TB_SYMBOLS !== 'undefined' ? TB_SYMBOLS : [];
        const list = czSymbolSearch(typed && !czIsEmoji(typed) ? typed : '', curated, czSpriteIcons(), typed ? 120 : 63);
        if (cur.icon && czSymbolKind(cur.icon) === 'icon' && !list.includes(cur.icon)) list.unshift(cur.icon);
        for (const n of list) sym(n, icon(n), n.replace(/-/g, ' '));
        if (!list.length) { const e = document.createElement('div'); e.className = 'cz-empty subtle'; e.textContent = 'No icon matches. Try another word, or paste an emoji.'; grid.appendChild(e); }
      }
      markGrid();
    }
    function markGrid() { for (const b of grid.querySelectorAll('button')) pick(b, b.dataset.val === (cur.icon || '')); }
    function paintAll() { paintSwatches(); paintShapes(); markGrid(); }
    paintTabs(); paintGrid(); paintAll();
    const first = sw.querySelector('.cz-sw.on') || sw.querySelector('.cz-sw');
    if (first) first.setAttribute('autofocus', '');
  }, { width: 316, className: 'cz-popover' });
}

/* ---------- the stream / tag view title ---------- */
/** Mark the view title (right-click works there too) and show the stream's marker before it. */
function czDecorateTitle(titleEl, view) {
  if (!titleEl) return;
  const v = String(view || '');
  const head = titleEl.parentElement;
  let mk = head ? head.querySelector(':scope > .cz-vt-mark') : null;
  const sid = v.startsWith('stream:') ? v.slice(7) : null, tag = v.startsWith('tag:') ? v.slice(4) : null;
  if (sid || tag) czMark(titleEl, sid ? 'stream' : 'tag', sid || tag);
  else { delete titleEl.dataset.cz; delete titleEl.dataset.czId; }
  const html = sid && STREAMS[sid] ? streamMarkHtml(sid, { cls: 'mk-lg' }) : tag ? tagMarkHtml(tag, { cls: 'mk-lg' }) : '';
  if (!html) { if (mk) mk.remove(); return; }
  if (!mk) { mk = document.createElement('span'); mk.className = 'cz-vt-mark'; head.insertBefore(mk, titleEl); }
  if (mk.innerHTML !== html) mk.innerHTML = html;
  czMark(mk, sid ? 'stream' : 'tag', sid || tag);
}

/* ---------- sidebar headings: the hint, and a small menu on right-click ---------- */
const _CZ_SECTION_HINT = { streams: 'Right-click a stream to rename it, change its colour, symbol or shape, or reorder it',
  tags: 'Right-click a tag to rename, merge, recolour or pin it', people: 'Right-click a person to rename them or change their colour or symbol' };
/** Add the 'right-click to customise' hint to a sidebar block's heading (its actions keep working). */
function czSectionHint(blockEl, key) {
  const h = blockEl && blockEl.querySelector(':scope > .nav-sec');
  const t = h && h.querySelector('.t');
  if (!t || !_CZ_SECTION_HINT[key]) return;
  t.setAttribute('data-tip', _CZ_SECTION_HINT[key]);
  h.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.act')) return;
    e.preventDefault();
    const acts = [...h.querySelectorAll('.act button')].map(b => ({ label: b.getAttribute('aria-label') || '', icon: (b.querySelector('use') && (b.querySelector('use').getAttribute('href') || '').replace('#i-', '')) || 'circle', run: () => b.click() }));
    const items = [
      ...acts,
      { label: sbIsCollapsed(key) ? 'Show this section' : 'Fold this section', icon: sbIsCollapsed(key) ? 'chevron-down' : 'chevron-up', run: () => t.click() },
      'sep', { heading: _CZ_SECTION_HINT[key] },
    ];
    closePopovers();
    _czOpenAt({ x: e.clientX, y: e.clientY }, (pop, close) => { pop.classList.add('cz-secmenu'); buildMenuItems(pop, items, close); }, { role: 'menu', width: 260 });
  });
}
