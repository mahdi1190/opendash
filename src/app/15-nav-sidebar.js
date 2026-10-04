/* ============================================================
   NAVIGATION: setView, '#view=' hash routing, the sidebar.
   The sidebar body (nav#sidebar) is built from the blocks registered for
   the active section group (registerSidebarBlock in 14-shell.js). The
   default blocks for Home, Tasks, Calendar and Finances live below; a
   feature builder replaces one by registering a block with the same id.
   ============================================================ */
// The data change (state.view + save) is instant; only the repaint runs inside
// a View Transition (src/motion.js) when one is available.
function setView(v) {
  const changed = state.view !== v;
  // The person panel only renders when no task is selected, so going to a
  // person must close any open task panel (otherwise the person never shows).
  if (typeof v === 'string' && v.startsWith('person:')) state.selectedTaskId = null;
  state.view = v; saveUI();
  _syncViewHash();
  closePopovers();
  if (changed && window.Motion) Motion.viewTransition(render); else render();
}

// Hash routing: '#view=<name>' (e.g. #view=finance, #view=stream:<id>)
// selects a view on load / hash edit; renderMain keeps the hash in sync.
const _HASH_VIEWS = new Set(['home', 'today', 'tomorrow', 'week', 'all', 'no-date', 'completed', 'wins', 'triage', 'finance', 'bin']);
// hash: optional, defaults to the current location.hash.
function _viewFromHash(hash) {
  const m = /^#view=(.+)$/.exec(hash == null ? (location.hash || '') : hash);
  if (!m) return null;
  let v; try { v = decodeURIComponent(m[1]); } catch (e) { return null; }
  if (_HASH_VIEWS.has(v)) return v;
  { const sec = sectionFor(v); if (sec && sec.hashable) return v; }   // registerSection() views
  if (/^stream:/.test(v)) return STREAMS[v.slice(7)] ? v : null;
  if (/^day:\d{4}-\d{2}-\d{2}$/.test(v) || /^tag:./.test(v)) return v;
  if (/^person:/.test(v)) return (state.people || []).some(p => p.id === v.slice(7)) ? v : null;
  return null;
}
function _syncViewHash() {
  const want = '#view=' + encodeURIComponent(state.view || 'home').replace(/%3A/gi, ':');
  if (location.hash === want) return;
  try { history.replaceState(history.state, '', want); } catch (e) { /* sandboxed host: no-op */ }
}
window.addEventListener('hashchange', () => {
  const v = _viewFromHash();
  if (v && v !== state.view) setView(v);
});

/** Open-task counts the sidebar shows (computed once per render). */
function sidebarCounts() {
  const all = getAllItems();
  const open = all.filter(i => statusOf(i.id) !== 'done');
  const due = (i) => daysUntil(effDate(i));
  const c = {
    open,
    today: open.filter(i => matchesView(i, 'today')).length,   // same rule as the Today list (21-task-query.js)
    overdue: open.filter(i => { const d = due(i); return d !== null && d < 0; }).length,
    tomorrow: open.filter(i => due(i) === 1).length,
    week: open.filter(i => matchesView(i, 'week')).length,
    all: open.length,
    'no-date': open.filter(i => effDate(i) === null).length,
    completed: all.filter(i => statusOf(i.id) === 'done' && !isArchived(i)).length,
    streams: {}, tags: {},
  };
  for (const i of open) {
    const s = effStream(i); c.streams[s] = (c.streams[s] || 0) + 1;
    for (const t of effTags(i)) c.tags[t] = (c.tags[t] || 0) + 1;
  }
  return c;
}

function renderSidebar() {
  renderShell();
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  const keepScroll = sb.scrollTop;
  sb.innerHTML = '';
  const group = shellGroupFor(state.view);
  const g = group === 'system' ? _shellLastGroup : group;
  const counts = sidebarCounts();
  const ctx = { view: state.view, group: g, counts, navItem: sbNavItem, section: sbSection };
  for (const b of SIDEBAR_BLOCKS) {
    if (!b.groups.includes(g)) continue;
    const el = document.createElement('div');
    el.className = 'sb-block'; el.dataset.block = b.id;
    let r;
    try { r = b.render(el, ctx); } catch (e) { console.error('[sidebar block ' + b.id + ']', e); r = false; }
    if (r !== false && el.childNodes.length) sb.appendChild(el);
  }
  // Motion adds a "Reduce motion" footer to a sidebar that has none; that
  // switch lives in the More menu and Settings now.
  const stub = document.createElement('div'); stub.className = 'sidebar-footer'; stub.hidden = true;
  sb.appendChild(stub);
  sb.scrollTop = keepScroll;
  // Motion: gliding active indicator.
  if (window.Motion) Motion.decorateSidebar(sb);
}

/* ---------- Tasks (and Home): smart lists ---------- */
registerSidebarBlock(['home', 'tasks'], {
  id: 'task-views', order: 10,
  render(el, ctx) {
    const c = ctx.counts;
    const pendingSugs = ((state.emailTriage && state.emailTriage.suggestions) || []).filter(s => s.status === 'pending').length;
    if (ctx.group === 'home') el.appendChild(sbNavItem({ label: 'Home', icon: 'house', view: 'home' }));
    const rows = [
      { label: 'Today', icon: 'sun', view: 'today', count: c.today || '', countAlert: c.overdue > 0, title: c.overdue ? `${c.overdue} overdue` : '' },
      { label: 'Upcoming', icon: 'calendar-range', view: 'week', count: c.week || '' },
      { label: 'All tasks', icon: 'layers', view: 'all', count: c.all || '' },
      { label: 'No date', icon: 'circle-dashed', view: 'no-date', count: c['no-date'] || '' },
      { label: 'Logbook', icon: 'circle-check', view: 'completed' },
      { label: 'Wins', icon: 'trophy', view: 'wins' },
      { label: 'Email triage', icon: 'mail', view: 'triage', count: pendingSugs || '' },
    ];
    // Home's sidebar holds only Home and the Review items: the task views
    // belong to the Tasks tab, so clicking one there never switches tabs.
    const list = ctx.group === 'home' ? [] : rows;
    for (const r of list) el.appendChild(sbNavItem(r));
  },
});

/* ---------- Tasks: streams (empty ones folded away) ---------- */
// The Streams heading's +: Settings > Streams with the 'Add a stream' field focused.
function _sbNewStream() {
  setView('settings:streams');
  setTimeout(() => { const i = document.querySelector('input[aria-label="New stream name"]'); if (i) i.focus(); }, 60);
}
let _sbShowEmptyStreams = false;
registerSidebarBlock('tasks', {
  id: 'streams', order: 20,
  render(el, ctx) {
    const entries = Object.entries(STREAMS).filter(([, s]) => !s.archived).sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0));
    if (!entries.length) return false;
    el.appendChild(sbSection({ title: 'Streams', collapsible: 'streams', actions: [{ icon: 'plus', label: 'New stream', run: _sbNewStream }] }));
    czSectionHint(el, 'streams');
    if (sbIsCollapsed('streams')) return;
    const full = entries.filter(([k]) => ctx.counts.streams[k]);
    const empty = entries.filter(([k]) => !ctx.counts.streams[k] && state.view !== 'stream:' + k);
    for (const [k, s] of entries) {
      if (!ctx.counts.streams[k] && !_sbShowEmptyStreams && full.length && state.view !== 'stream:' + k) continue;   // nothing open anywhere: list them all
      // Its marker (colour, symbol, shape) and the right-click menu: 28-customise.js.
      el.appendChild(czMark(sbNavItem({ label: s.label, avatarHtml: `<span class="ic">${streamMarkHtml(k)}</span>`, view: 'stream:' + k, count: ctx.counts.streams[k] || '' }), 'stream', k));
    }
    if (empty.length && full.length) {
      el.appendChild(sbNavItem({
        label: _sbShowEmptyStreams ? 'Hide empty streams' : `${empty.length} empty stream${empty.length === 1 ? '' : 's'}`,
        icon: _sbShowEmptyStreams ? 'chevron-up' : 'chevron-right', className: 'nav-more', active: false,
        onClick: () => { _sbShowEmptyStreams = !_sbShowEmptyStreams; renderSidebar(); },
      }));
    }
  },
});

/* ---------- Tasks: top tags + "All tags" ---------- */
const SIDEBAR_TAG_LIMIT = 8;
registerSidebarBlock('tasks', {
  id: 'tags', order: 30,
  render(el, ctx) {
    const pinned = Array.isArray(state.pinnedTags) ? state.pinnedTags : [];
    const all = Object.entries(ctx.counts.tags);
    if (!all.length && !pinned.length) return false;
    const manage = () => setView('tags');
    el.appendChild(sbSection({ title: 'Tags', collapsible: 'tags', actions: [{ icon: 'sliders-horizontal', label: 'Manage tags', run: manage }] }));
    if (sbIsCollapsed('tags')) return;
    const top = [];
    for (const t of pinned) if (!top.includes(t)) top.push(t);
    for (const [t] of all.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) { if (top.length >= SIDEBAR_TAG_LIMIT) break; if (!top.includes(t)) top.push(t); }
    const cur = state.view.startsWith('tag:') ? state.view.slice(4) : null;
    if (cur && !top.includes(cur)) top.push(cur);
    for (const t of top) el.appendChild(sbNavItem({ label: t, icon: 'hash', view: 'tag:' + t, count: ctx.counts.tags[t] || '' }));
    const more = sbNavItem({ label: `All ${all.length} tags`, icon: 'tags', className: 'nav-more', view: 'tags', active: state.view === 'tags' });
    if (all.length > SIDEBAR_TAG_LIMIT) {
      const link = document.createElement('span'); link.className = 'link'; link.textContent = 'Clean up';
      more.appendChild(link);
    }
    el.appendChild(more);
  },
});

/* ---------- Tasks (and Home): people shortcut ---------- */
registerSidebarBlock('tasks', {
  id: 'people', order: 40,
  render(el, ctx) {
    const people = Array.isArray(state.people) ? state.people : [];
    el.appendChild(sbSection({
      title: 'People', collapsible: 'people',
      actions: [
        { icon: 'sparkles', label: 'Link tasks to people with AI', className: 'ai-only', run: () => aiAutoLinkPeople() },
        { icon: 'user-plus', label: 'Add person', run: () => addNewPerson() },
      ],
    }));
    if (sbIsCollapsed('people')) return;
    el.appendChild(sbNavItem({ label: 'All people', icon: 'users', view: 'people', count: people.filter(p => !p.self).length || '' }));
    // Shortcuts: pinned people first, then whoever has the most open tasks.
    const scored = people.filter(p => !p.self).map(p => ({ p, n: tasksForPerson(p.id).filter(i => statusOf(i.id) !== 'done').length }));
    const pick = scored.filter(x => x.p.pinned).concat(scored.filter(x => !x.p.pinned && x.n > 0).sort((a, b) => b.n - a.n)).slice(0, ctx.group === 'home' ? 3 : 5);
    const cur = state.view.startsWith('person:') ? state.view.slice(7) : null;
    if (cur && !pick.some(x => x.p.id === cur)) { const p = people.find(x => x.id === cur); if (p) pick.push({ p, n: 0 }); }
    for (const { p, n } of pick) {
      el.appendChild(sbNavItem({ label: p.name, avatarHtml: avatarHtml(p, 18), view: 'person:' + p.id, count: n || '' }));
    }
  },
});

/* ---------- Calendar: mini month, calendars, countdowns ---------- */
let _sbCalCursor = null;          // first day of the month shown in the mini month
let _sbCalShown = null;           // the state.calMonth the mini month last followed
let _calSelectedDate = null;      // 'YYYY-MM-DD' picked in the mini month (Calendar section reads it)
function calendarSelectedDate() { return _calSelectedDate || todayStr(); }
function _weekStartIndex() {
  const ws = String(APP_CONFIG.weekStart || 'Mon').toLowerCase();
  return ws.startsWith('sun') ? 0 : ws.startsWith('sat') ? 6 : 1;
}
registerSidebarBlock('calendar', {
  id: 'minical', order: 10,
  render(el) {
    const today = todayStr();
    // Follow the month the Calendar section shows, unless the user is paging the mini month.
    // Entering the Calendar fresh (first load, or back from elsewhere): the section is about to
    // jump to the selected day (today by default), so follow that, not a month saved last session.
    const fresh = typeof _calSectionFresh !== 'undefined' && _calSectionFresh;
    const want = String(state.view).startsWith('calendar') ? (fresh ? calendarSelectedDate().slice(0, 7) : /^\d{4}-\d{2}$/.test(state.calMonth || '') ? state.calMonth : null) : null;
    if (want && want !== _sbCalShown) { const [yy, mm] = want.split('-').map(Number); _sbCalCursor = new Date(yy, mm - 1, 1); _sbCalShown = want; }
    if (!_sbCalCursor) { const d = new Date(); _sbCalCursor = new Date(d.getFullYear(), d.getMonth(), 1); }
    const y = _sbCalCursor.getFullYear(), m = _sbCalCursor.getMonth();
    const locale = APP_CONFIG.locale || undefined;
    const ws = _weekStartIndex();
    const dueDays = new Set(getAllItems().filter(i => statusOf(i.id) !== 'done' && effDate(i)).map(i => effDate(i)));
    const wrap = document.createElement('div'); wrap.className = 'minical';
    const head = document.createElement('div'); head.className = 'minical-h';
    const title = document.createElement('span');
    title.textContent = _sbCalCursor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const nav = document.createElement('span'); nav.className = 'hstack'; nav.style.gap = '0';
    nav.innerHTML = `<button type="button" class="btn-icon" data-d="-1" aria-label="Previous month">${icon('chevron-left')}</button><button type="button" class="btn-icon" data-d="1" aria-label="Next month">${icon('chevron-right')}</button>`;
    nav.querySelectorAll('button').forEach(b => { b.onclick = () => { _sbCalCursor = new Date(y, m + Number(b.dataset.d), 1); renderSidebar(); }; });
    head.append(title, nav);
    const grid = document.createElement('div'); grid.className = 'minical-g';
    const base = new Date(2024, 0, 7 + ws);   // a Sunday + offset
    for (let i = 0; i < 7; i++) {
      const w = document.createElement('span'); w.className = 'w';
      w.textContent = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i).toLocaleDateString(locale, { weekday: 'narrow' });
      grid.appendChild(w);
    }
    const first = new Date(y, m, 1);
    const lead = (first.getDay() - ws + 7) % 7;
    const start = new Date(y, m, 1 - lead);
    const sel = calendarSelectedDate();
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (i >= 35 && d.getMonth() !== m) break;
      const iso = fmtDate(d);
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'd' + (d.getMonth() !== m ? ' o' : '') + (iso === today ? ' t' : '') + (iso === sel && String(state.view).startsWith('calendar') ? ' sel' : '') + (dueDays.has(iso) ? ' has' : '');
      b.textContent = String(d.getDate());
      b.setAttribute('aria-label', d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }));
      b.onclick = () => {
        _calSelectedDate = iso;
        state.calMonth = iso.slice(0, 7);
        if (!emitShell('calendar:select-date', iso)) { if (state.view !== 'calendar') setView('calendar'); else { saveUI(); render(); } }
      };
      grid.appendChild(b);
    }
    wrap.append(head, grid);
    el.appendChild(wrap);
  },
});
registerSidebarBlock('calendar', {
  id: 'calendars', order: 20,
  render(el) {
    el.appendChild(sbSection({ title: 'Calendars' }));
    const rows = [
      { label: 'Google Calendar', c: 'var(--sw-blue)', src: GOOGLE_CONNECTED ? (GOOGLE_LIVE ? 'Live' : 'Snapshot') : 'Not connected', off: !GOOGLE_CONNECTED },
      { label: 'Task due dates', c: 'var(--sw-indigo)', src: 'OpenDash' },
      { label: 'Countdowns', c: 'var(--sw-amber)', src: 'OpenDash' },
    ];
    for (const r of rows) {
      const row = document.createElement('div'); row.className = 'calrow';
      row.style.setProperty('--c', r.c);
      row.innerHTML = `<span class="cb${r.off ? ' off' : ''}">${r.off ? '' : icon('check')}</span><span>${esc(r.label)}</span><span class="src">${esc(r.src)}</span>`;
      el.appendChild(row);
    }
  },
});
registerSidebarBlock('calendar', {
  id: 'cal-countdowns', order: 30,
  render(el) {
    // Only dated, shown widgets (the top bar also holds live ones: tasks, next event, clock).
    const list = (typeof tbList === 'function' ? tbList() : (Array.isArray(state.countdowns) ? state.countdowns : [])).filter(c => c.date && c.visible !== false);
    if (!list.length) return false;
    el.appendChild(sbSection({ title: 'Countdowns' }));
    for (const c of list) {
      const d = daysUntil(c.date);
      // Same number and unit as the widget in the top bar (15w, 79d, 40%), in the widget's colour.
      let count = d === null ? '' : d < 0 ? `${-d}d ago` : `${d}d`;
      if (typeof tbCompute === 'function') {
        try { const v = tbCompute(c); if (v.num) count = /^\d/.test(v.num) && v.unit && v.unit.length <= 3 ? `${v.num}${v.unit}` : `${v.num}${v.unit ? ' ' + v.unit : ''}`; } catch (e) { /* keep the day count */ }
      }
      const item = sbNavItem({
        label: c.label || 'Untitled', icon: _isIconName(c.icon) ? c.icon : 'hourglass', active: false,
        count, onClick: () => openCountdownEditor(c.id),
      });
      const ic = item.querySelector('.ic');
      if (ic && typeof tbColorAttrs === 'function') {
        const col = tbColorAttrs(c.color);
        ic.classList.add('sb-cd-ic');
        if (col.cls) ic.classList.add(col.cls);
        if (col.style) ic.setAttribute('style', col.style);
      }
      el.appendChild(item);
    }
  },
});

/* ---------- Finances: its sections ---------- */
const _FIN_SECTION_ICONS = { overview: 'gauge', spending: 'chart-column', categories: 'layout-grid', merchants: 'building-2', cashflow: 'arrow-up-down', recurring: 'repeat', budgets: 'piggy-bank', transactions: 'receipt' };
registerSidebarBlock('finance', {
  id: 'finance-sections', order: 10,
  render(el) {
    const FV = window.FinanceView;
    const list = FV && typeof FV.sections === 'function' ? FV.sections() : [];
    if (!list.length) return false;
    const cur = FV && typeof FV.section === 'function' ? FV.section() : null;
    el.appendChild(sbSection({ title: 'Finances' }));
    for (const s of list) {
      el.appendChild(sbNavItem({
        label: s.label, icon: _FIN_SECTION_ICONS[s.id] || 'circle', active: state.view === 'finance' && cur === s.id,
        onClick: () => {
          if (state.view !== 'finance') setView('finance');
          try { FV.setSection(s.id); } catch (e) { console.error('[finance] setSection', e); }
          renderSidebar(); renderCrumb();
        },
      }));
    }
  },
});
// The Finances view has its own tab strip; keep the sidebar and breadcrumb in step with it.
document.addEventListener('click', (e) => {
  if (e.target && e.target.closest && e.target.closest('.fv-tabs')) setTimeout(() => { if (state.view === 'finance') { renderSidebar(); } }, 0);
});
