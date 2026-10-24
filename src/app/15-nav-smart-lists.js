/* ============================================================
   SMART LISTS (owner: lists). Any filter + grouping + sort + view type,
   saved as a sidebar item ('Waiting on others', 'This week in a stream',
   'Quick wins under 15 min'). Synced data: state.smartLists (items by id,
   lib/sync/manifest.mjs '── lists ──'), so every device shows the same lists.

   A list: {id, name, icon, base, q, sort, group, mode, order, createdAt}
     base   the view it starts from (all, today, week, no-date, inbox, now,
            stream:<id>, tag:<tag>, person:<id>)
     q      search operators on top (21-task-query.js: #tag @person p1 is:...
            due:... stream:... ctx:/@phone energy:low est:<=15 -word)
   Its view is 'list:<id>' (#view=list:<id>). Display changes made while on
   it (sort, grouping) are saved into the list itself.

   This file also holds the view hooks the task views call for the three
   new views (list:<id>, 'now' = Do now in 24-do-now.js, 'inbox' =
   24-quick-capture.js): extraViewScope / extraViewTitle / extraViewDefaults /
   extraViewEmpty / taskViewHeaderStrip.
     smartListsAll() / smartListById(id)
     openSmartList(id)                 go there (its view type applied)
     openSmartListEditor(id, preset)   create (id null) or edit; preset {base, q, sort, group, mode, name}
     smartListFromView(view)           "Save as smart list" for the list on screen
   ============================================================ */
const SL_ICONS = ['list-filter', 'star', 'flag', 'zap', 'timer', 'phone', 'mail', 'users', 'briefcase', 'house', 'shopping-cart', 'rocket', 'target', 'leaf', 'flame', 'heart', 'book-open', 'trophy', 'coffee', 'sun', 'moon', 'calendar-range', 'hourglass', 'inbox'];
const SL_BASES = [['all', 'All tasks'], ['today', 'Today'], ['week', 'Upcoming (7 days)'], ['no-date', 'No date'], ['inbox', 'Inbox'], ['now', 'Do now (your current choices)']];

function smartListsAll() {
  const L = Array.isArray(state.smartLists) ? state.smartLists.filter(x => x && typeof x.id === 'string') : [];
  return L.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || 0) - (b.createdAt || 0));
}
function smartListById(id) { return (Array.isArray(state.smartLists) ? state.smartLists : []).find(x => x && x.id === id) || null; }
function _slBase(sl) { const b = String((sl && sl.base) || 'all'); return b.startsWith('list:') ? 'all' : b; }
const _slParsed = new Map();
function _slQuery(q) {
  if (!q) return null;
  if (!_slParsed.has(q)) { if (_slParsed.size > 60) _slParsed.clear(); _slParsed.set(q, Object.assign({}, parseTaskSearch(q))); }
  return _slParsed.get(q);
}
function _slMatches(item, sl, today) {
  const base = _slBase(sl);
  if (base !== 'all' && !inViewScope(item, base, today)) return false;
  const p = _slQuery(sl.q);
  return !p || matchesSearch(item, p);
}
function _slSave(list) { state.smartLists = list; saveData(); }
function smartListCreate(o) {
  const id = 'sl-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const all = smartListsAll();
  const sl = { id, name: String(o.name || 'Smart list').trim().slice(0, 60) || 'Smart list', icon: _isIconName(o.icon) ? o.icon : 'list-filter',
    base: o.base || 'all', q: String(o.q || '').trim().slice(0, 400), order: all.length ? (all[all.length - 1].order ?? all.length) + 1 : 0, createdAt: Date.now() };
  for (const k of ['sort', 'group', 'mode']) if (o[k]) sl[k] = o[k];
  _slSave([...(Array.isArray(state.smartLists) ? state.smartLists : []), sl]);
  return id;
}
function smartListUpdate(id, patch) {
  const L = (Array.isArray(state.smartLists) ? state.smartLists : []).map(x => {
    if (!x || x.id !== id) return x;
    const n = Object.assign({}, x, patch);
    for (const k of Object.keys(n)) if (n[k] === null || n[k] === undefined || n[k] === '') delete n[k];
    if (!n.name) n.name = x.name;
    return n;
  });
  _slSave(L);
}
function smartListDelete(id) {
  const sl = smartListById(id); if (!sl) return;
  state.smartLists = state.smartLists.filter(x => x && x.id !== id);
  if (typeof sbUnpin === 'function') sbUnpin('list:' + id, { noSave: true });
  if (state.view === 'list:' + id) state.view = 'all';
  saveData(); render();
  toast(`Deleted “${sl.name}”`, { icon: 'trash-2', action: { label: 'Undo', run: () => undo() } });
}
function smartListDuplicate(id) {
  const sl = smartListById(id); if (!sl) return;
  const nid = smartListCreate(Object.assign({}, sl, { name: sl.name + ' copy' }));
  render();
  openSmartListEditor(nid);
}
function openSmartList(id) {
  const sl = smartListById(id); if (!sl) return;
  const v = 'list:' + id;
  if (sl.mode && (sl.mode === 'list' || sl.mode === 'kanban') && state.viewMode !== sl.mode && state.view !== v) { state.viewMode = sl.mode; saveUI(); }
  setView(v);
}
function smartListCount(sl, open) {
  const today = todayStr();
  let n = 0;
  for (const i of open) if (_slMatches(i, sl, today)) n++;
  return n;
}

/* ---------- view hooks (21-task-query.js, 22-quick-add.js, 31-task-views.js call them) ---------- */
function extraViewScope(item, view, today) {
  if (view === 'now') return typeof doNowScope === 'function' ? doNowScope(item, today) : true;
  if (view === 'inbox') return !!item.inbox;
  if (view.startsWith('list:')) { const sl = smartListById(view.slice(5)); return !!sl && _slMatches(item, sl, today); }
  return false;
}
function extraViewTitle(v) {
  if (v === 'now') return 'What can I do now?';
  if (v === 'inbox') return 'Inbox';
  if (typeof v === 'string' && v.startsWith('list:')) { const sl = smartListById(v.slice(5)); return sl ? sl.name : 'Smart list'; }
  return null;
}
/** What a task added on a smart list gets so it shows there: the base view's, plus tags, stream, people, priority, context, energy in the filter. */
function extraViewDefaults(view) {
  if (view === 'inbox') return { inbox: true };
  if (view === 'now') return typeof doNowDefaults === 'function' ? doNowDefaults() : {};
  if (!String(view).startsWith('list:')) return null;
  const sl = smartListById(view.slice(5)); if (!sl) return {};
  const base = _slBase(sl);
  const d = Object.assign({}, base === 'all' ? {} : quickAddDefaults(base));
  const p = _slQuery(sl.q);
  if (p) {
    if (p.tags.length) d.tags = [...new Set([...(d.tags || []), ...p.tags])];
    if (p.prio && p.prio !== 'p0') d.priority = p.prio;
    if (p.stream) { const st = typeof _qaStream === 'function' ? _qaStream(p.stream) : null; if (st || STREAMS[p.stream]) d.stream = st || p.stream; }
    if (p.people.length) { const ids = p.people.map(n => (typeof _qaPerson === 'function' ? _qaPerson(n) : null)).filter(Boolean).map(x => x.id); if (ids.length) d.people = [...new Set([...(d.people || []), ...ids])]; }
    const cx = p.ctx.map(c => (typeof ctxMatch === 'function' ? ctxMatch(c) : null)).filter(Boolean).map(c => c.id);
    if (cx.length) d.contexts = cx;
    if (p.energy === 'low' || p.energy === 'high') d.energy = p.energy;
    if (p.due === 'today' && !d.dueDate) d.dueDate = todayStr();
    if (p.est && !p.est.none && p.est.mins && (p.est.op === '<=' || p.est.op === '<' || p.est.op === '=')) d.estimate = p.est.op === '<' ? Math.max(5, p.est.mins - 5) : p.est.mins;
    if (p.is.includes('inbox')) d.inbox = true;
  }
  return d;
}
function extraViewEmpty(view, inline) {
  if (view === 'inbox') return { icon: 'inbox', title: 'Inbox zero', text: `Nothing waiting to be sorted. Capture a thought from any page with ${_qcapKeyLabel()} and it lands here.`, actions: [{ label: 'Quick capture', icon: 'plus', run: () => openQuickCapture() }] };
  if (view === 'now') return { icon: 'target', title: inline ? 'Nothing else fits right now' : 'Nothing fits right now', text: 'No open task matches where you are, your energy and the time you have. Widen a choice above, or take a break.' };
  if (String(view).startsWith('list:')) {
    const sl = smartListById(view.slice(5));
    return { icon: (sl && sl.icon) || 'list-filter', title: 'Nothing matches this list', text: 'No open task fits its filter right now. Add one above (it gets the list’s tags and stream), or change the filter.', actions: sl ? [{ label: 'Edit list', icon: 'pencil', run: () => openSmartListEditor(sl.id) }] : [] };
  }
  return null;
}
function _qcapKeyLabel() { return 'Ctrl+Shift+Space'; }
function taskViewHeaderStrip(view) {
  if (view === 'now') return typeof doNowStrip === 'function' ? doNowStrip() : null;
  if (view === 'inbox') return typeof inboxStrip === 'function' ? inboxStrip() : null;
  if (String(view).startsWith('list:')) { const sl = smartListById(view.slice(5)); return sl ? _slStrip(sl) : null; }
  return null;
}
/** A smart list's own sort / grouping (21-task-query.js taskViewPrefs). */
function smartListViewPrefs(id) {
  const sl = smartListById(id); if (!sl) return {};
  const o = {};
  if (sl.sort) o.sort = sl.sort;
  if (sl.group) o.group = sl.group;
  return o;
}
/** Display changes on a smart list: sort and grouping go into the list (synced); the rest (folded groups) stays a view pref. */
function smartListTakePrefs(id, patch) {
  const sl = smartListById(id); if (!sl || !patch) return patch;
  const mine = {}, rest = {};
  for (const [k, v] of Object.entries(patch)) (k === 'sort' || k === 'group' ? mine : rest)[k] = v;
  if (Object.keys(mine).length && Object.entries(mine).some(([k, v]) => (v || null) !== (sl[k] || null))) smartListUpdate(id, mine);
  return Object.keys(rest).length ? rest : null;
}

/* ---------- the filter as chips (each one can be taken off) ---------- */
/** [{label, icon, raw}] for a query: raw is the token to take out of q. */
function smartListChips(q) {
  const out = [];
  for (const tok of String(q || '').trim().split(/\s+/).filter(Boolean)) {
    const low = tok.toLowerCase(); let m;
    if ((m = /^#(.+)$/.exec(low)) || (m = /^tag:(.+)$/.exec(low))) out.push({ icon: 'hash', label: m[1], raw: tok });
    else if ((m = /^(?:ctx|context):(.+)$/.exec(low))) out.push({ icon: m[1] === 'none' ? 'compass' : ctxIcon((ctxMatch(m[1]) || {}).id), label: m[1] === 'none' ? 'No context' : '@' + ctxLabel((ctxMatch(m[1]) || { id: m[1] }).id), raw: tok });
    else if ((m = /^@(.+)$/.exec(low))) {
      const en = ctxEnergyMatch(m[1]), cx = ctxMatch(m[1]);
      if (en) out.push({ icon: TASK_ENERGY[en].icon, label: TASK_ENERGY[en].label, raw: tok });
      else if (cx && !(state.people || []).some(p => p.id === m[1])) out.push({ icon: cx.icon, label: '@' + cx.label, raw: tok });
      else { const p = typeof _qaPerson === 'function' ? _qaPerson(m[1]) : null; out.push({ icon: 'at-sign', label: p ? p.name : m[1], raw: tok }); }
    }
    else if ((m = /^energy:(low|high|none)$/.exec(low))) out.push({ icon: m[1] === 'none' ? 'zap' : TASK_ENERGY[m[1]].icon, label: m[1] === 'none' ? 'No energy set' : TASK_ENERGY[m[1]].label, raw: tok });
    else if ((m = /^(?:est|estimate|time):(.+)$/.exec(low))) out.push({ icon: 'timer', label: m[1] === 'none' ? 'No estimate' : m[1].replace('<=', '≤ ').replace('>=', '≥ ').replace(/^</, '< ').replace(/^>/, '> ').replace(/^(\d+)$/, '≤ $1') + (/\d$/.test(m[1]) ? 'm' : ''), raw: tok });
    else if ((m = /^!?p([0-3])$/.exec(low))) out.push({ icon: 'flag', label: m[1] === '0' ? 'No priority' : 'P' + m[1], raw: tok, cls: 'qa-priority qa-p' + m[1] });
    else if ((m = /^is:(\w+)$/.exec(low))) out.push({ icon: 'circle-dot', label: { open: 'Open', done: 'Done', doing: 'In progress', pinned: 'Pinned', planned: 'Planned', repeating: 'Repeating', inbox: 'In the Inbox', wontdo: "Won't do" }[m[1]] || m[1], raw: tok });
    else if ((m = /^due:(\w+)$/.exec(low))) out.push({ icon: 'calendar', label: { today: 'Due today', overdue: 'Overdue', tomorrow: 'Due tomorrow', week: 'Due this week', month: 'Due this month', soon: 'Due soon', none: 'No due date' }[m[1]] || 'Due ' + m[1], raw: tok });
    else if ((m = /^stream:(.+)$/.exec(low))) { const st = (typeof _qaStream === 'function' && _qaStream(m[1])) || (STREAMS[m[1]] ? m[1] : null); out.push({ icon: 'layers', label: st ? STREAMS[st].label : m[1], raw: tok, stream: st }); }
    else if (low.length > 1 && low[0] === '-') out.push({ icon: 'minus', label: 'not “' + tok.slice(1) + '”', raw: tok });
    else out.push({ icon: 'search', label: '“' + tok + '”', raw: tok });
  }
  return out;
}
function _slBaseLabel(base) {
  const b = String(base || 'all');
  const hit = SL_BASES.find(x => x[0] === b);
  if (hit) return hit[1];
  return viewTitle(b);
}
// The list whose filter chips are all shown (UX_BLUEPRINT.md 3: at most 3 chips in a row, then +N).
let _slChipsOpen = null;
function _slStrip(sl) {
  const strip = document.createElement('div'); strip.className = 'sl-strip';
  const lead = document.createElement('span'); lead.className = 'sl-strip-lead'; lead.innerHTML = icon(sl.icon || 'list-filter', 'i-sm') + '<span>Smart list</span>';
  strip.appendChild(lead);
  const chips = document.createElement('span'); chips.className = 'sl-chips';
  const base = _slBase(sl);
  if (base !== 'all') { const c = document.createElement('span'); c.className = 'chip chip-solid sl-chip'; c.innerHTML = icon('layers', 'i-xs') + `<span>${esc(_slBaseLabel(base))}</span>`; c.title = 'Starts from this list'; chips.appendChild(c); }
  const allChips = smartListChips(sl.q);
  const room = Math.max(0, (base !== 'all' ? 2 : 3));
  const showAll = _slChipsOpen === sl.id || allChips.length <= room + 1;
  for (const c of showAll ? allChips : allChips.slice(0, room)) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip sl-chip qa-tok' + (c.cls ? ' ' + c.cls : '');
    b.innerHTML = (c.stream ? `<span class="dot" style="--c:${escAttr(safeColor(STREAMS[c.stream].color))}"></span>` : icon(c.icon, 'i-xs')) + `<span>${esc(c.label)}</span>` + icon('x', 'i-xs x');
    b.title = 'Take this off the filter (Undo puts it back)';
    b.onclick = () => {
      const toks = String(sl.q || '').trim().split(/\s+/);
      const i = toks.indexOf(c.raw); if (i >= 0) toks.splice(i, 1);
      smartListUpdate(sl.id, { q: toks.join(' ') }); render();
      toast(`Filter: ${c.label} taken off`, { icon: 'list-filter', action: { label: 'Undo', run: () => undo() } });
    };
    chips.appendChild(b);
  }
  if (!showAll) {
    const n = allChips.length - room;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip sl-chip sl-chip-more';   // a chip, like its neighbours
    b.textContent = '+' + n;
    b.setAttribute('aria-label', `Show ${n} more filter${n === 1 ? '' : 's'}`);
    b.setAttribute('data-tip', allChips.slice(room).map(c => c.label).join(', '));
    b.onclick = () => { _slChipsOpen = sl.id; render(); };
    chips.appendChild(b);
  }
  if (!chips.childNodes.length) { const c = document.createElement('span'); c.className = 'subtle'; c.textContent = 'Every open task'; chips.appendChild(c); }
  strip.appendChild(chips);
  const edit = uiButton({ label: 'Edit', icon: 'pencil', kind: 'ghost', size: 'sm', run: () => openSmartListEditor(sl.id) });
  const more = uiButton({ icon: 'ellipsis', size: 'sm', aria: 'More', run: (e, btn) => openMenu(btn, smartListMenuItems(sl.id), { align: 'end', width: 220 }) });
  strip.append(edit, more);
  return strip;
}
/** The list's menu (its sidebar row's right-click and the ⋯ on its page). */
function smartListMenuItems(id) {
  const sl = smartListById(id); if (!sl) return [];
  const v = 'list:' + id;
  const pinned = typeof sbIsPinned === 'function' && sbIsPinned(v);
  return [
    { label: 'Edit…', icon: 'pencil', run: () => openSmartListEditor(id) },
    { label: 'Duplicate', icon: 'copy', run: () => smartListDuplicate(id) },
    ...(typeof sbTogglePin === 'function' ? [{ label: pinned ? 'Unpin from the top' : 'Pin to the top', icon: pinned ? 'pin-off' : 'pin', run: () => sbTogglePin(v) }] : []),
    { label: 'Copy link', icon: 'link', run: () => copyText(location.origin + location.pathname + '#view=' + v, 'link') },
    'sep',
    { label: 'Delete list', icon: 'trash-2', danger: true, run: () => smartListDelete(id) },
  ];
}

/* ---------- the sidebar block ---------- */
const SB_SL_DEFAULTS = { sort: 'custom', show: 0 };
function _slSaveOrder(ids) {
  const pos = new Map(ids.map((id, i) => [id, i]));
  _slSave((Array.isArray(state.smartLists) ? state.smartLists : []).map(x => (x && pos.has(x.id) ? Object.assign({}, x, { order: pos.get(x.id) }) : x)));
}
registerSidebarBlock('tasks', {
  id: 'smart-lists', order: 15, label: 'Smart lists',
  render(el, ctx) {
    const lists = smartListsAll();
    // None saved yet: no heading (2.18: empty sections hide; "New smart list" waits under More views and in the palette).
    if (!lists.length) return false;
    el.appendChild(sbSection({ title: 'Smart lists', collapsible: 'smart-lists', actions: [{ icon: 'plus', label: 'New smart list', run: () => openSmartListEditor(null) }] }));
    if (sbIsCollapsed('smart-lists')) return;
    const open = ctx.counts.open;
    sbOrderedList(el, {
      key: 'smart-lists', noun: 'Smart lists', defaults: SB_SL_DEFAULTS,
      items: lists.map(sl => ({ id: sl.id, label: sl.name, open: smartListCount(sl, open), total: 0, recent: sl.createdAt || 0, icon: sl.icon })),
      custom: lists.map(sl => sl.id),
      saveCustom: _slSaveOrder,
      keepId: state.view.startsWith('list:') ? state.view.slice(5) : null,
      row: (it) => sbNavItem({ label: it.label, icon: it.icon || 'list-filter', view: 'list:' + it.id, count: it.open || '',
        onClick: () => { if (state.view === 'list:' + it.id) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: 'smooth' }); return; } openSmartList(it.id); } }),
    });
  },
});

/* ---------- templates: ideas built from the user's own streams, tags and contexts ---------- */
function smartListIdeas() {
  const ideas = [
    { name: 'Quick wins under 15 min', icon: 'zap', base: 'all', q: 'est:<=15', group: 'auto', sort: 'date' },
    { name: 'High priority', icon: 'flag', base: 'all', q: 'p1', group: 'stream' },
    { name: 'Calls to make', icon: 'phone', base: 'all', q: '@phone' },
    { name: 'Errands', icon: 'shopping-cart', base: 'all', q: '@errands' },
    { name: 'Low-energy tasks', icon: 'leaf', base: 'all', q: 'energy:low' },
    { name: 'Due in the next 3 days', icon: 'hourglass', base: 'all', q: 'due:soon', sort: 'date', group: 'date' },
    { name: 'No estimate yet', icon: 'timer', base: 'week', q: 'est:none' },
  ];
  // The busiest streams and tags: "<Stream> this week", "Waiting on others" when that tag is used.
  try {
    const sc = {}, tc = {};
    for (const it of getAllItems()) {
      if (statusOf(it.id) === 'done') continue;
      const s = effStream(it); sc[s] = (sc[s] || 0) + 1;
      for (const t of effTags(it)) tc[t] = (tc[t] || 0) + 1;
    }
    for (const [s] of Object.entries(sc).sort((a, b) => b[1] - a[1]).slice(0, 2)) if (STREAMS[s]) ideas.unshift({ name: `${STREAMS[s].label} this week`, icon: 'calendar-range', base: 'week', q: 'stream:' + s, group: 'date' });
    const wait = Object.keys(tc).find(t => /^(waiting|waiting-on|waiting-for|wait|blocked)$/.test(t));
    if (wait) ideas.unshift({ name: 'Waiting on others', icon: 'hourglass', base: 'all', q: '#' + wait, group: 'stream' });
    const top = Object.entries(tc).sort((a, b) => b[1] - a[1]).find(([t]) => t !== wait);
    if (top) ideas.push({ name: `#${top[0]} by stream`, icon: 'hash', base: 'all', q: '#' + top[0], group: 'stream' });
  } catch (e) { /* the fixed ideas are enough */ }
  return ideas.slice(0, 10);
}

/* ---------- create / edit ---------- */
function openSmartListEditor(id, preset) {
  const sl = id ? smartListById(id) : null;
  const d = Object.assign({ name: '', icon: 'list-filter', base: 'all', q: '', sort: '', group: '', mode: '' }, sl || {}, preset || {});
  let pinIt = !!(sl && typeof sbIsPinned === 'function' && sbIsPinned('list:' + sl.id));
  let nameTouched = !!(sl || (preset && preset.name));
  let els = {};
  const countNow = () => {
    const fake = { base: d.base, q: d.q };
    const today = todayStr();
    const hits = getAllItems().filter(i => statusOf(i.id) !== 'done' && _slMatches(i, fake, today));
    return hits;
  };
  const paintPreview = () => {
    if (!els.prev) return;
    let hits = [];
    try { hits = countNow(); } catch (e) { hits = []; }
    els.prev.innerHTML = `<div class="sl-prev-n">${icon('list-checks', 'i-xs')}<span>${hits.length ? `${hits.length} open task${hits.length === 1 ? '' : 's'} match` : 'No open task matches yet'}</span></div>`
      + hits.slice(0, 4).map(i => `<div class="sl-prev-row"><span class="check check-sm ${escAttr(effPriority(i))}"></span><span>${esc(effTitle(i))}</span></div>`).join('')
      + (hits.length > 4 ? `<div class="subtle sl-prev-more">and ${hits.length - 4} more</div>` : '');
    els.chips.innerHTML = '';
    for (const c of smartListChips(d.q)) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'chip qa-tok sl-chip' + (c.cls ? ' ' + c.cls : '');
      b.innerHTML = icon(c.icon, 'i-xs') + `<span>${esc(c.label)}</span>` + icon('x', 'i-xs x');
      b.title = 'Take this off the filter';
      b.onclick = () => { const toks = d.q.trim().split(/\s+/); const i = toks.indexOf(c.raw); if (i >= 0) toks.splice(i, 1); d.q = toks.join(' '); els.q.value = d.q; paintPreview(); };
      els.chips.appendChild(b);
    }
  };
  const addTok = (t) => {
    const toks = d.q.trim() ? d.q.trim().split(/\s+/) : [];
    // one of each kind for single-value operators (priority, due, energy, estimate)
    const kind = (x) => (/^!?p[0-3]$/i.test(x) ? 'p' : /^due:/i.test(x) ? 'due' : /^energy:/i.test(x) ? 'energy' : /^(est|estimate|time):/i.test(x) ? 'est' : /^stream:/i.test(x) ? 'stream' : null);
    const k = kind(t);
    const kept = k ? toks.filter(x => kind(x) !== k) : toks.filter(x => x.toLowerCase() !== t.toLowerCase());
    d.q = [...kept, t].join(' ');
    els.q.value = d.q;
    if (!nameTouched && els.name) { els.name.value = _slAutoName(d); }
    paintPreview();
  };
  const close = openDialog({
    // Filters and a live preview: a fixed height, so the buttons stay put while it changes (UI_CLEANUP_PLAN.md 1.3).
    title: sl ? 'Edit smart list' : 'New smart list', size: 'md', fixed: true, resizeKey: 'smart-list',
    body: (el) => {
      el.classList.add('sl-ed');
      if (!sl && !(preset && (preset.q || preset.base !== undefined && preset.base !== 'all'))) {
        const ideas = document.createElement('div'); ideas.className = 'sl-ideas';
        ideas.innerHTML = `<div class="field-label">Start from an idea</div>`;
        const row = document.createElement('div'); row.className = 'sl-ideas-row';
        for (const idea of smartListIdeas()) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-lg sl-idea';
          b.innerHTML = icon(idea.icon, 'i-xs') + `<span>${esc(idea.name)}</span>`;
          b.onclick = () => {
            Object.assign(d, { name: idea.name, icon: idea.icon, base: idea.base, q: idea.q, group: idea.group || '', sort: idea.sort || '' });
            nameTouched = true;
            els.name.value = d.name; els.q.value = d.q; els.base.value = d.base; paintIcons(); paintSegs(); paintPreview();
            row.querySelectorAll('.sl-idea').forEach(x => x.classList.toggle('on', x === b));
          };
          row.appendChild(b);
        }
        ideas.appendChild(row);
        el.appendChild(ideas);
      }
      // Name + icon
      const nameF = document.createElement('label'); nameF.className = 'field';
      nameF.innerHTML = '<span class="field-label">Name</span>';
      const name = document.createElement('input'); name.className = 'control'; name.value = d.name || _slAutoName(d); name.placeholder = 'e.g. Quick wins'; name.maxLength = 60;
      name.setAttribute('autofocus', '');
      name.oninput = () => { nameTouched = true; d.name = name.value; };
      nameF.appendChild(name); el.appendChild(nameF); els.name = name;
      const icons = document.createElement('div'); icons.className = 'sl-icons'; icons.setAttribute('role', 'radiogroup'); icons.setAttribute('aria-label', 'Icon');
      const paintIcons = () => {
        icons.innerHTML = '';
        for (const ic of SL_ICONS) {
          const b = document.createElement('button'); b.type = 'button'; b.className = 'btn-icon btn-sm sl-icon' + (d.icon === ic ? ' on' : '');
          b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', d.icon === ic ? 'true' : 'false'); b.setAttribute('aria-label', ic);
          b.innerHTML = icon(ic); b.onclick = () => { d.icon = ic; paintIcons(); };
          icons.appendChild(b);
        }
      };
      paintIcons(); el.appendChild(icons);
      // Base
      const baseF = document.createElement('label'); baseF.className = 'field';
      baseF.innerHTML = '<span class="field-label">Tasks from</span>';
      const base = document.createElement('select'); base.className = 'control';
      const opt = (v, t) => `<option value="${escAttr(v)}">${esc(t)}</option>`;
      const streams = Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
      const tagCounts = {}; for (const it of getAllItems()) if (statusOf(it.id) !== 'done') for (const t of effTags(it)) tagCounts[t] = (tagCounts[t] || 0) + 1;
      const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 40).map(x => x[0]);
      const people = (state.people || []).filter(p => p && !p.self).slice().sort((a, b) => String(a.name).localeCompare(String(b.name))).slice(0, 80);
      base.innerHTML = SL_BASES.map(([v, t]) => opt(v, t)).join('')
        + (streams.length ? `<optgroup label="Streams">${streams.map(([k, s]) => opt('stream:' + k, s.label)).join('')}</optgroup>` : '')
        + (tags.length ? `<optgroup label="Tags">${tags.map(t => opt('tag:' + t, '#' + t)).join('')}</optgroup>` : '')
        + (people.length ? `<optgroup label="People">${people.map(p => opt('person:' + p.id, p.name)).join('')}</optgroup>` : '');
      if (![...base.options].some(o => o.value === d.base)) base.insertAdjacentHTML('beforeend', opt(d.base, _slBaseLabel(d.base)));
      base.value = d.base;
      base.onchange = () => { d.base = base.value; if (!nameTouched) name.value = _slAutoName(d); paintPreview(); };
      baseF.appendChild(base); el.appendChild(baseF); els.base = base;
      // Filter
      const qF = document.createElement('div'); qF.className = 'field';
      qF.innerHTML = '<span class="field-label">Filter</span>';
      const q = document.createElement('input'); q.className = 'control sl-q'; q.value = d.q; q.spellcheck = false;
      q.placeholder = 'e.g. #email @phone p1 due:week est:<=30 energy:low -draft';
      let qT = 0;
      q.oninput = () => { d.q = q.value; clearTimeout(qT); qT = setTimeout(() => { if (!nameTouched) name.value = _slAutoName(d); paintPreview(); }, 120); };
      qF.appendChild(q); els.q = q;
      const adders = document.createElement('div'); adders.className = 'sl-adders';
      const adder = (label, ic, items) => {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'chip chip-more sl-add';
        b.innerHTML = icon('plus', 'i-xs') + `<span>${esc(label)}</span>`;
        b.onclick = (e) => openMenu(e.currentTarget, typeof items === 'function' ? items() : items, { align: 'start', width: 230 });
        adders.appendChild(b);
      };
      adder('Stream', 'layers', () => streams.map(([k, s]) => ({ label: s.label, icon: 'layers', run: () => addTok('stream:' + k) })));
      adder('Tag', 'hash', () => tags.length ? tags.slice(0, 20).map(t => ({ label: '#' + t, icon: 'hash', hint: String(tagCounts[t]), run: () => addTok('#' + t) })) : [{ label: 'No tags yet', disabled: true }]);
      adder('Person', 'at-sign', () => people.length ? people.slice(0, 20).map(p => ({ label: p.name, icon: 'at-sign', run: () => addTok('@' + (String(p.name).split(/\s+/)[0] || p.id).toLowerCase()) })) : [{ label: 'No people yet', disabled: true }]);
      adder('Priority', 'flag', [['p1', 'High'], ['p2', 'Medium'], ['p3', 'Low'], ['p0', 'No priority']].map(([k, l]) => ({ label: l, icon: 'flag', className: 'prio-item ' + k, run: () => addTok(k) })));
      adder('Due', 'calendar', [['overdue', 'Overdue'], ['today', 'Due today'], ['soon', 'Due in 3 days'], ['week', 'Due this week'], ['month', 'Due this month'], ['none', 'No due date']].map(([k, l]) => ({ label: l, icon: 'calendar', run: () => addTok('due:' + k) })));
      adder('Context', 'map-pin', () => [...ctxList().map(c => ({ label: '@' + c.label, icon: c.icon, run: () => addTok('@' + c.id) })), 'sep', { label: 'No context (anywhere)', icon: 'compass', run: () => addTok('ctx:none') }]);
      adder('Energy', 'zap', [{ label: 'Low energy', icon: 'leaf', run: () => addTok('energy:low') }, { label: 'High energy', icon: 'flame', run: () => addTok('energy:high') }, { label: 'Not set', icon: 'zap', run: () => addTok('energy:none') }]);
      adder('Time', 'timer', [[15, '15 min or less'], [30, '30 min or less'], [60, '1 hour or less'], [120, '2 hours or less']].map(([n, l]) => ({ label: l, icon: 'timer', run: () => addTok('est:<=' + n) })).concat(['sep', { label: 'No estimate yet', icon: 'timer', run: () => addTok('est:none') }]));
      adder('State', 'circle-dot', [['doing', 'In progress'], ['pinned', 'Pinned'], ['planned', 'Planned'], ['repeating', 'Repeating'], ['inbox', 'In the Inbox']].map(([k, l]) => ({ label: l, icon: 'circle-dot', run: () => addTok('is:' + k) })));
      qF.appendChild(adders);
      const chips = document.createElement('div'); chips.className = 'sl-chips sl-ed-chips'; qF.appendChild(chips); els.chips = chips;
      el.appendChild(qF);
      // Group / sort / view
      const segs = document.createElement('div'); segs.className = 'sl-segs';
      const seg = (label, opts, key) => {
        const f = document.createElement('div'); f.className = 'field';
        f.innerHTML = `<span class="field-label">${esc(label)}</span>`;
        const s = document.createElement('div'); s.className = 'seg seg-block seg-wrap'; s.dataset.key = key;
        for (const [k, t] of opts) {
          const b = document.createElement('button'); b.type = 'button'; b.textContent = t; b.dataset.v = k;
          b.onclick = () => { d[key] = k; paintSegs(); };
          s.appendChild(b);
        }
        f.appendChild(s); segs.appendChild(f);
      };
      seg('Group', TASK_GROUPS, 'group');
      seg('Sort', TASK_SORTS.slice(0, 4), 'sort');
      seg('View', [['list', 'List'], ['kanban', 'Board']], 'mode');
      const paintSegs = () => segs.querySelectorAll('.seg').forEach(s => {
        const key = s.dataset.key;
        const cur = d[key] || (key === 'group' ? 'auto' : key === 'sort' ? 'date' : 'list');
        s.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === cur ? 'true' : 'false'));
      });
      paintSegs();
      el.appendChild(segs);
      // Pin
      const pin = document.createElement('label'); pin.className = 'sl-pin';
      pin.innerHTML = `<input type="checkbox"${pinIt ? ' checked' : ''}> <span>Pin to the top of the sidebar</span>`;
      pin.querySelector('input').onchange = (e) => { pinIt = e.target.checked; };
      el.appendChild(pin);
      const prev = document.createElement('div'); prev.className = 'sl-prev'; prev.setAttribute('aria-live', 'polite');
      el.appendChild(prev); els.prev = prev;
      const help = document.createElement('p'); help.className = 'field-hint';
      help.textContent = 'Words search titles, notes and subtasks; -word leaves them out. A task you add on the list gets its tags, stream and context.';
      el.appendChild(help);
      paintPreview();
    },
    actions: [
      ...(sl ? [{ label: 'Delete', danger: true, run: () => { smartListDelete(sl.id); } }, 'spacer'] : []),
      { label: 'Cancel' },
      { label: sl ? 'Save' : 'Create list', primary: true, icon: sl ? 'check' : 'plus', run: () => {
        const nm = (els.name.value || '').trim() || _slAutoName(d);
        const patch = { name: nm, icon: d.icon, base: d.base, q: (els.q.value || '').trim(), sort: d.sort || null, group: d.group || null, mode: d.mode || null };
        let nid = sl ? sl.id : null;
        if (sl) smartListUpdate(sl.id, patch); else nid = smartListCreate(patch);
        const v = 'list:' + nid;
        if (typeof sbIsPinned === 'function' && sbIsPinned(v) !== pinIt) sbTogglePin(v, { quiet: true });
        if (!sl) { openSmartList(nid); toast(`“${nm}” is in the sidebar`, { kind: 'ok', action: { label: 'Undo', run: () => undo() } }); }
        else render();
      } },
    ],
  });
  return close;
}
/** A name from the filter while the user has not typed one ("#email · @phone"). */
function _slAutoName(d) {
  const parts = smartListChips(d.q).map(c => c.label).slice(0, 3);
  const base = _slBase(d);
  const b = base === 'all' ? '' : _slBaseLabel(base).replace(/ \(.*\)$/, '');
  const s = [b, ...parts].filter(Boolean).join(' · ');
  return s || 'Smart list';
}
/** "Save as smart list" for the list on screen (its view, the search, the sort / grouping and the view type). */
function smartListFromView(view) {
  view = view || state.view;
  const q = typeof searchQuery === 'string' ? searchQuery.trim() : '';
  if (String(view).startsWith('list:') && !q) { smartListDuplicate(view.slice(5)); return; }
  let base = q ? 'all' : view, extra = '';
  if (!q && view === 'now' && typeof doNowAsQuery === 'function') { base = 'all'; extra = doNowAsQuery(); }
  if (!q && (view === 'completed' || view.startsWith('day:'))) base = view.startsWith('day:') ? 'all' : 'all';
  const prefs = taskViewPrefs(view);
  openSmartListEditor(null, { base, q: [q, extra].filter(Boolean).join(' '), sort: prefs.sort && prefs.sort !== 'manual' ? prefs.sort : '', group: prefs.group || '', mode: state.viewMode === 'kanban' ? 'kanban' : '',
    name: q ? '' : extra ? 'Do now' : view.startsWith('stream:') || view.startsWith('tag:') || view.startsWith('person:') ? viewTitle(view) : '' });
}
function smartListSaveButton() {
  return uiButton({ label: 'Save as smart list', icon: 'list-plus', kind: 'ghost', size: 'sm', run: () => smartListFromView(state.view) });
}
/** The Display menu's button (32-tasks-ui.js). */
function smartListDisplayButton(view) {
  const onList = String(view).startsWith('list:');
  return uiButton({ label: onList ? 'Edit this smart list' : 'Save as smart list…', icon: onList ? 'pencil' : 'list-plus', cls: 'btn-block sl-display-save',
    run: () => { closePopovers(); if (onList) openSmartListEditor(view.slice(5)); else smartListFromView(view); } });
}
