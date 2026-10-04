/* ============================================================
   APP SHELL (Shell/Design). The frame around every view:
     sidebar  = workspace head, search (command palette), section tiles,
                nav#sidebar (blocks per section), footer (Bin, Settings, keys)
     top bar  = breadcrumb, widget strip (#countdowns slot + registered
                widgets), save status, theme, More menu
     main     = page header (#view-header) + #main-body, detail pane.

   Shell API (all declared here, safe to call from any module):
     registerTile({id, label, icon, order, view, feature})      section tiles
     shellGroupFor(view)        -> 'home'|'tasks'|'calendar'|'finance'|'system'
     registerSidebarBlock(groups, {id, order, render(el, ctx)})  sidebar content
         groups: a group id or an array; same id replaces. render() may return
         false to hide the block. ctx: {view, group, navItem(o), section(o)}.
     sbNavItem(o) / sbSection(o)    build sidebar rows (see below)
     registerTopbarWidget({id, order, render(el)})                top-bar strip
     registerMoreItem({id, label, icon, order, where, run, checked, hidden, hint, kbd})
         where: ['more'] (top-bar More menu) and/or 'workspace' (brand menu)
     onShell(event, fn) / emitShell(event, payload)               tiny event bus
     openNewTask(prefill, {quick, from})  the centre card in create mode (side-panel
                                    mode: focus quick add, or the quick-add dialog)
     renderShell()                  repaint the chrome (called by render())
   Sections themselves register with registerSection() (00-core-config.js);
   add `group: 'calendar'` (etc.) so the right tile lights up and `crumb(view)`
   for a custom breadcrumb.
   ============================================================ */

/* ---------- section tiles ---------- */
const SHELL_TILES = [];
function registerTile(def) {
  if (!def || !def.id) throw new Error('registerTile needs an id');
  const i = SHELL_TILES.findIndex(t => t.id === def.id);
  const t = Object.assign({ order: 50, icon: 'circle', label: def.id, view: def.id }, def);
  if (i >= 0) SHELL_TILES[i] = t; else SHELL_TILES.push(t);
  SHELL_TILES.sort((a, b) => a.order - b.order);
}
function _tileEnabled(t) {
  if (!t.feature) return true;
  const f = APP_CONFIG.features || {};
  return f[t.feature] !== false;
}
// The last task view this session visited (the Tasks tile returns to it).
let _shellLastTaskView = 'today';
let _shellLastGroup = 'home';

registerTile({ id: 'home', label: 'Home', icon: 'house', order: 10, view: 'home' });
registerTile({ id: 'tasks', label: 'Tasks', icon: 'list-todo', order: 20, view: () => _shellLastTaskView || 'today' });
registerTile({ id: 'calendar', label: 'Calendar', icon: 'calendar-days', order: 30, view: 'calendar', feature: 'calendar' });
registerTile({ id: 'finance', label: 'Finances', icon: 'wallet', order: 40, view: 'finance', feature: 'finance' });

const _TASK_GROUP_VIEWS = new Set(['today', 'tomorrow', 'week', 'all', 'no-date', 'completed', 'wins', 'triage']);
const _SYSTEM_VIEWS = new Set(['bin']);
/** Which tile a view belongs to. */
function shellGroupFor(view) {
  const v = String(view || '');
  const sec = typeof sectionFor === 'function' ? sectionFor(v) : null;
  if (sec && sec.group) return sec.group;
  if (v === 'finance') return 'finance';
  if (v === 'home') return 'home';
  if (v === 'calendar' || v.startsWith('calendar:')) return 'calendar';
  if (_SYSTEM_VIEWS.has(v)) return 'system';
  if (_TASK_GROUP_VIEWS.has(v) || /^(stream|tag|day|person):/.test(v)) return 'tasks';
  return sec ? 'system' : 'tasks';
}
const _SHELL_GROUP_LABEL = { home: 'Home', tasks: 'Tasks', calendar: 'Calendar', finance: 'Finances', system: '' };

/* ---------- sidebar blocks ---------- */
const SIDEBAR_BLOCKS = [];
function registerSidebarBlock(groups, def) {
  if (!def || !def.id || typeof def.render !== 'function') throw new Error('registerSidebarBlock needs {id, render}');
  const g = Array.isArray(groups) ? groups.slice() : [groups];
  const i = SIDEBAR_BLOCKS.findIndex(b => b.id === def.id);
  const b = Object.assign({ order: 50 }, def, { groups: g });
  if (i >= 0) SIDEBAR_BLOCKS[i] = b; else SIDEBAR_BLOCKS.push(b);
  SIDEBAR_BLOCKS.sort((a, b2) => a.order - b2.order);
}

/**
 * A sidebar row. o: {label, icon, dot (CSS colour), avatarHtml (trusted
 * markup from avatarHtml()), count, countAlert, badge, view, active,
 * onClick, title, className, disabled}
 */
function sbNavItem(o) {
  const el = document.createElement('button');
  el.type = 'button';
  const active = o.active !== undefined ? o.active : (o.view && state.view === o.view);
  el.className = 'nav-item' + (active ? ' active' : '') + (o.className ? ' ' + o.className : '') + (o.disabled ? ' is-disabled' : '');
  if (active) el.setAttribute('aria-current', 'page');
  let lead = '';
  if (o.avatarHtml) lead = o.avatarHtml;
  else if (o.dot) lead = `<span class="ic"><span class="dot" style="--c:${escAttr(safeColor(o.dot))}"></span></span>`;
  else if (o.icon) lead = `<span class="ic">${icon(o.icon)}</span>`;
  const count = (o.count === 0 || o.count) && o.count !== '' ? `<span class="count${o.countAlert ? ' alert' : ''}">${esc(o.count)}</span>` : '';
  const badge = o.badge ? `<span class="badge badge-danger">${esc(o.badge)}</span>` : '';
  el.innerHTML = `${lead}<span class="label">${esc(o.label)}</span>${badge}${count}`;
  if (o.title) el.title = o.title;
  // Icon rail (the sidebar dragged narrow, 13-splitter.js): the label shows as a tooltip.
  else if (state.paneSizes && state.paneSizes.sidebarRail) el.setAttribute('data-tip', String(o.label || ''));
  if (o.disabled) el.setAttribute('aria-disabled', 'true');
  el.onclick = (e) => {
    if (o.disabled) return;
    // Re-selecting the view you are on is a no-op (CLAUDE.md "Interaction conventions").
    if (!o.onClick && o.view && state.view === o.view) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); _shellCloseDrawer(); return; }
    if (o.onClick) o.onClick(e);
    else if (o.view) setView(o.view);
    _shellCloseDrawer();
  };
  return el;
}
/**
 * A sidebar section heading. o: {title, actions:[{icon,label,run,className}],
 * collapsible: key} - collapsible headings fold their block (remembered in
 * state.collapsedSidebar, a UI key).
 */
function sbSection(o) {
  const h = document.createElement('div');
  h.className = 'nav-sec' + (o.collapsible ? ' collapsible' : '');
  const t = document.createElement('span'); t.className = 't'; t.textContent = o.title || '';
  h.appendChild(t);
  if (o.collapsible) {
    t.setAttribute('role', 'button'); t.tabIndex = 0;
    const toggle = () => {
      state.collapsedSidebar = state.collapsedSidebar && typeof state.collapsedSidebar === 'object' ? state.collapsedSidebar : {};
      state.collapsedSidebar[o.collapsible] = !state.collapsedSidebar[o.collapsible];
      saveUI(); renderSidebar();
    };
    t.onclick = toggle;
    t.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  }
  if (o.actions && o.actions.length) {
    const act = document.createElement('span'); act.className = 'act';
    for (const a of o.actions) {
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'btn-icon btn-sm' + (a.className ? ' ' + a.className : '');
      b.innerHTML = icon(a.icon || 'plus');
      b.setAttribute('aria-label', a.label || '');
      if (a.label) b.setAttribute('data-tip', a.label);
      b.onclick = (e) => { e.stopPropagation(); a.run && a.run(e, b); };
      act.appendChild(b);
    }
    h.appendChild(act);
  }
  return h;
}
function sbIsCollapsed(key) {
  return !!(state.collapsedSidebar && typeof state.collapsedSidebar === 'object' && state.collapsedSidebar[key]);
}

/* ---------- top-bar widgets ---------- */
const TOPBAR_WIDGETS = [];
function registerTopbarWidget(def) {
  if (!def || !def.id || typeof def.render !== 'function') throw new Error('registerTopbarWidget needs {id, render}');
  const i = TOPBAR_WIDGETS.findIndex(w => w.id === def.id);
  const w = Object.assign({ order: 50 }, def);
  if (i >= 0) TOPBAR_WIDGETS[i] = w; else TOPBAR_WIDGETS.push(w);
  TOPBAR_WIDGETS.sort((a, b) => a.order - b.order);
}

/* ---------- More menu / workspace menu ---------- */
const MORE_ITEMS = [];
function registerMoreItem(def) {
  if (!def || !def.id) throw new Error('registerMoreItem needs an id');
  const i = MORE_ITEMS.findIndex(m => m.id === def.id);
  const m = Object.assign({ order: 50, where: ['more'] }, def);
  if (!Array.isArray(m.where)) m.where = [m.where];
  if (i >= 0) MORE_ITEMS[i] = m; else MORE_ITEMS.push(m);
  MORE_ITEMS.sort((a, b) => a.order - b.order);
}
/** Menu rows for 'more' or 'workspace', with a separator between order bands of 100. */
function shellMenuItems(where) {
  const out = []; let band = null;
  for (const m of MORE_ITEMS) {
    if (!m.where.includes(where)) continue;
    if (m.hidden && (typeof m.hidden === 'function' ? m.hidden() : m.hidden)) continue;
    const b = Math.floor(m.order / 100);
    if (band !== null && b !== band) out.push('sep');
    band = b;
    out.push(m);
  }
  return out;
}

/* ---------- event bus ---------- */
const _shellListeners = new Map();
function onShell(ev, fn) {
  if (!_shellListeners.has(ev)) _shellListeners.set(ev, new Set());
  _shellListeners.get(ev).add(fn);
  return () => _shellListeners.get(ev).delete(fn);
}
function emitShell(ev, payload) {
  const set = _shellListeners.get(ev);
  if (!set || !set.size) return false;
  for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error('[shell] ' + ev, e); } }
  return true;
}

/* ---------- drawer (narrow screens) ---------- */
function _shellCloseDrawer() { const a = document.getElementById('app'); if (a) a.classList.remove('drawer-open'); }
function _shellToggleSidebar() {
  const app = document.getElementById('app');
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) { app.classList.toggle('drawer-open'); return; }
  state.sidebarCollapsed = !state.sidebarCollapsed;
  if (!state.sidebarCollapsed && state.focus) state.focus = false;
  saveUI(); renderShell();
}

/* ---------- new task ---------- */
/**
 * New task. Centre-card mode (the default): the card in create mode (61-task-card.js).
 * o.quick (the Q key): the list's inline quick-add box when there is one, for fast capture.
 * Side-panel mode: the inline box, else the quick-add dialog (as before).
 */
function openNewTask(prefill, o) {
  o = o || {};
  const qa = document.getElementById('quick-add');
  const inline = qa && qa.offsetParent !== null && !prefill;
  const card = typeof tcOpenCreate === 'function' && typeof itemOpenTarget === 'function' && itemOpenTarget() === 'card';
  if (inline && (o.quick || !card)) { qa.focus(); qa.scrollIntoView({ block: 'nearest' }); return; }
  if (card) return tcOpenCreate(prefill || '', { from: o.from || null });
  if (typeof openQuickAddDialog === 'function') return openQuickAddDialog(prefill);   // 23-quick-add-dialog.js
  let go = null;
  openDialog({
    title: 'New task', width: 560,
    body: (el, close) => {
      const wrap = document.createElement('div'); wrap.className = 'vstack';
      const box = document.createElement('label'); box.className = 'input';
      box.innerHTML = icon('plus');
      const inp = document.createElement('input');
      inp.placeholder = 'e.g. "email Sam tomorrow #email !p2"';
      inp.value = prefill || '';
      inp.setAttribute('autofocus', '');
      box.appendChild(inp);
      const hint = document.createElement('div'); hint.className = 'field-hint';
      hint.textContent = 'Dates: today, tomorrow, fri, next mon, in 2 weeks. Priority: !p1 to !p3. Tags: #tag.';
      wrap.append(box, hint);
      el.appendChild(wrap);
      go = () => {
        const parsed = parseQuickAdd(inp.value);
        if (!parsed.title) { box.classList.add('is-invalid'); inp.focus(); return false; }
        addParsedTask(parsed, quickAddDefaults(state.view));
        toast('Task added', { kind: 'ok' });
        return true;
      };
      inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (go()) close(); } };
    },
    actions: [
      { label: 'Cancel' },
      { label: 'Add task', primary: true, run: () => (go ? go() : true) },
    ],
  });
}

/* ---------- rendering ---------- */
function _shellCrumbs() {
  const v = state.view || 'home';
  const group = shellGroupFor(v);
  const sec = typeof sectionFor === 'function' ? sectionFor(v) : null;
  if (sec && typeof sec.crumb === 'function') {
    try { const c = sec.crumb(v); if (Array.isArray(c)) return { group, parts: c }; } catch (e) { /* fall through */ }
  }
  const title = sec ? String(sec.title(v) || '') : (typeof viewTitle === 'function' ? viewTitle(v) : v);
  if (group === 'home') return { group, parts: [] };
  if (group === 'finance') {
    const FV = window.FinanceView;
    let sub = '';
    try { if (FV && typeof FV.sectionLabel === 'function') sub = FV.sectionLabel() || ''; } catch (e) {}
    return { group, parts: sub ? [sub] : [] };
  }
  if (group === 'system') return { group, parts: [title] };
  return { group, parts: title && title !== _SHELL_GROUP_LABEL[group] ? [title] : [] };
}
const _SHELL_IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
const _GROUP_ICON = { home: 'house', tasks: 'list-todo', calendar: 'calendar-days', finance: 'wallet', system: 'settings' };

function renderCrumb() {
  const el = document.getElementById('crumb');
  if (!el) return;
  const { group, parts } = _shellCrumbs();
  const glabel = _SHELL_GROUP_LABEL[group] || '';
  let html = icon(_GROUP_ICON[group] || 'circle');
  if (glabel) {
    html += parts.length ? `<button type="button" data-crumb-group="${escAttr(group)}">${esc(glabel)}</button>` : `<b>${esc(glabel)}</b>`;
  }
  parts.forEach((p, i) => {
    if (glabel || i > 0) html += icon('chevron-right', 'i-xs sep');
    html += i === parts.length - 1 ? `<b>${esc(p)}</b>` : `<span>${esc(p)}</span>`;
  });
  el.innerHTML = html;
  const gb = el.querySelector('[data-crumb-group]');
  if (gb) gb.onclick = () => { const t = SHELL_TILES.find(x => x.id === group); if (t) setView(typeof t.view === 'function' ? t.view() : t.view); };
}

function renderSwitcher() {
  const sw = document.getElementById('section-switcher');
  if (!sw) return;
  const group = shellGroupFor(state.view);
  const tiles = SHELL_TILES.filter(_tileEnabled);
  sw.style.setProperty('--tiles', String(Math.max(1, tiles.length)));
  const key = tiles.map(t => t.id).join(',');
  if (sw.dataset.key !== key) {
    sw.innerHTML = '';
    for (const t of tiles) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw-tile'; b.dataset.tile = t.id;
      b.setAttribute('role', 'tab');
      b.innerHTML = icon(t.icon) + `<span>${esc(t.label)}</span><span class="sw-badge" hidden></span>`;
      b.onclick = () => {
        const v = typeof t.view === 'function' ? t.view() : t.view;
        // Re-selecting the view you are on is a no-op, at most a smooth scroll back to the top (CLAUDE.md).
        if (state.view === v) { const m = document.getElementById('main'); if (m && m.scrollTop > 0) m.scrollTo({ top: 0, behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); _shellCloseDrawer(); return; }
        setView(v);
        _shellCloseDrawer();
      };
      sw.appendChild(b);
    }
    sw.dataset.key = key;
  }
  for (const b of sw.querySelectorAll('.sw-tile')) {
    const on = b.dataset.tile === group;
    b.classList.toggle('on', on);
    b.setAttribute('aria-selected', on ? 'true' : 'false');
    const t = SHELL_TILES.find(x => x.id === b.dataset.tile);
    const badge = b.querySelector('.sw-badge');
    let n = null;
    try { n = t && typeof t.badge === 'function' ? t.badge() : null; } catch (e) { n = null; }
    badge.hidden = !(n || n === 0) || n === 0;
    if (!badge.hidden) badge.textContent = String(n);
  }
}

function renderSidebarFooter() {
  const f = document.getElementById('sb-foot');
  if (!f) return;
  const binCount = (state.bin && (state.bin.tasks.length + state.bin.notes.length)) || 0;
  f.innerHTML = `
    <button type="button" class="btn${state.view === 'bin' ? ' on' : ''}" data-act="bin">${icon('trash-2')}<span>Bin</span>${binCount ? `<span class="count">${binCount}</span>` : ''}</button>
    <button type="button" class="btn${state.view === 'settings' ? ' on' : ''}" data-act="settings">${icon('settings')}<span>Settings</span></button>
    <button type="button" class="btn sb-ask" data-act="assistant" data-requires="claude" aria-label="Ask the assistant" data-tip="Ask the assistant" data-kbd="Ctrl+J">${icon('sparkles')}<span>Ask</span></button>
    <button type="button" class="btn-icon" data-act="keys" aria-label="Keyboard shortcuts" data-tip="Keyboard shortcuts" data-kbd="?">${icon('keyboard')}</button>`;
  f.querySelector('[data-act="bin"]').onclick = () => { setView('bin'); _shellCloseDrawer(); };
  f.querySelector('[data-act="settings"]').onclick = () => { setView('settings'); _shellCloseDrawer(); };
  f.querySelector('[data-act="assistant"]').onclick = () => { if (typeof toggleAssistant === 'function') toggleAssistant(); _shellCloseDrawer(); };   // 72-assistant.js
  if (typeof renderSidebarFooterAssistant === 'function') renderSidebarFooterAssistant();
  f.querySelector('[data-act="keys"]').onclick = () => showKbHelp();
}

/** Save status in the top bar (also called by updateSyncIndicator after each write). */
function renderSaveStatus() {
  const btn = document.getElementById('folder-btn');
  if (!btn) return;
  const lbl = btn.querySelector('.sync-lbl');
  let kind, text, tip;
  if (!_serverAvailable) {
    kind = 'local'; text = 'Local only';
    tip = 'Saved in this browser only. Start OpenDash with start-opendash to save to your data folder.';
  } else if (_serverLastError) {
    kind = 'err'; text = 'Not saved';
    tip = 'Saving to the data folder failed: ' + _serverLastError + '. Your work is still in this browser.';
  } else if (state._localDirty || _persistInFlight || _persistTimer) {
    kind = 'busy'; text = 'Saving…';
    tip = 'Saving to the data folder';
  } else {
    kind = 'ok'; text = 'Saved';
    tip = 'Saved to the data folder' + (state._lastSave ? ' · ' + formatTimestamp(state._lastSave) : '');
  }
  btn.classList.remove('ok', 'err', 'busy', 'local');
  btn.classList.add(kind);
  if (lbl && lbl.textContent !== text) lbl.textContent = text;
  btn.title = tip;
}

function renderTopbarWidgets() {
  const host = document.getElementById('tb-widgets');
  if (!host) return;
  for (const w of TOPBAR_WIDGETS) {
    let el = document.getElementById('tbw-' + w.id);
    if (!el) { el = document.createElement('div'); el.id = 'tbw-' + w.id; el.className = 'tb-widget'; host.appendChild(el); }
    try { const r = w.render(el); el.hidden = r === false; } catch (e) { console.error('[topbar widget ' + w.id + ']', e); el.hidden = true; }
  }
  _fitTopbarWidgets();
}
// Hide whole widgets (from the end) that would be clipped, instead of cutting one in half.
function _fitTopbarWidgets() {
  const host = document.getElementById('tb-widgets');
  if (!host) return;
  const items = [...host.querySelectorAll('.cdw')];
  items.forEach(n => { n.style.display = ''; });
  // Hide from the end of the strip (least important first).
  for (let i = items.length - 1; i >= 0 && host.scrollWidth > host.clientWidth + 1; i--) items[i].style.display = 'none';
}
window.addEventListener('resize', () => { if (typeof state !== 'undefined') _fitTopbarWidgets(); });

function renderPageHeaderControls() {
  const sec = typeof sectionFor === 'function' ? sectionFor(state.view) : null;
  const main = document.getElementById('main');
  if (main) {
    const layout = sec && sec.layout ? sec.layout : (state.view === 'finance' ? 'wide' : 'page');
    main.classList.toggle('wide', layout === 'wide');
    main.classList.toggle('bare', layout === 'bare');
  }
  const sel = document.getElementById('display-btn');
  if (sel) sel.hidden = state.viewMode === 'review' || state.viewMode === 'calendar';
}

/** The OpenDash logo as an image URL: the SVG favicon build.mjs inlines ('' without one). */
function brandLogoSrc() {
  const l = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
  return (l && l.getAttribute('href')) || '';
}
/** A brand mark (sidebar, welcome): the user's initial when a name is set, else the OpenDash logo. */
function setBrandMark(el, name) {
  if (!el) return;
  const n = String(name || '').trim();
  const src = n ? '' : brandLogoSrc();
  const key = src ? 'logo' : (n || 'O').slice(0, 1).toUpperCase();
  if (el.dataset.mark === key) return;
  el.dataset.mark = key;
  el.classList.toggle('has-logo', !!src);
  if (!src) { el.textContent = key; return; }
  const img = document.createElement('img'); img.className = 'brand-logo'; img.alt = ''; img.src = src;
  el.replaceChildren(img);
}

/* ---------- the light/dark switch ---------- */
const _SHELL_TT_SVG = '<svg class="i tt-morph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><defs><mask id="tt-mask">'
  + '<rect width="24" height="24" fill="#fff"/><circle class="tt-bite" cx="12" cy="12" r="6.5" fill="#000"/></mask></defs>'
  + '<g class="tt-rays">' + [0, 1, 2, 3, 4, 5, 6, 7].map(i => { const a = i * Math.PI / 4, c = Math.cos(a), s = Math.sin(a); return `<path d="M${(12 + 7.5 * c).toFixed(2)} ${(12 + 7.5 * s).toFixed(2)}L${(12 + 10 * c).toFixed(2)} ${(12 + 10 * s).toFixed(2)}"/>`; }).join('') + '</g>'
  + '<circle class="tt-core" cx="12" cy="12" r="4.5" mask="url(#tt-mask)"/>'
  + '<g class="tt-stars"><path d="M19 4.5v3M17.5 6h3"/><path d="M21 12.5v2M20 13.5h2"/><path d="M4 4.5v2M3 5.5h2"/></g></svg>';
let _shellThemeSwapVariant = null;   // a one-off variant ref (the gallery's "Try it")
let _shellThemeTo = null;            // the theme a running swap is about to apply
/** Options for Motion.themeSwap: where the toggle is, and today's variant from the animation library. */
function _shellThemeSwapOpts(theme) {
  const tt = document.getElementById('theme-toggle');
  const r = tt && tt.getBoundingClientRect();
  const origin = r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  let it = _shellThemeSwapVariant && typeof animItem === 'function' ? animItem(_shellThemeSwapVariant) : null;
  if (!it && typeof animToday === 'function') { try { it = animToday('theme-switch'); } catch (e) { it = null; } }
  return { origin, dark: theme === 'dark', kind: it && it.vt ? it.vt.kind : 'fade', ms: it && it.vt ? it.vt.ms : 320 };   // every variant blocked: the plain crossfade
}

/** Repaint the chrome. render() calls this before the sidebar and main. */
function renderShell() {
  const html = document.documentElement;
  const theme = state.theme === 'dark' ? 'dark' : 'light';
  const was = html.getAttribute('data-theme');
  // A theme change plays the day's light/dark transition once (src/motion.js themeSwap: a circular
  // reveal from the toggle, a dusk wipe or a crossfade; the animation library's 'theme-switch' slot).
  // The swap applies asynchronously (inside the View Transition), so a second render before it lands
  // must not start another one (that would cancel the first); apply reads the theme wanted by then.
  if (was && was !== theme && window.Motion && Motion.themeSwap) {
    if (_shellThemeTo !== theme) {
      _shellThemeTo = theme;
      Motion.themeSwap(() => { _shellThemeTo = null; html.setAttribute('data-theme', state.theme === 'dark' ? 'dark' : 'light'); }, _shellThemeSwapOpts(theme));
    }
  } else if (!_shellThemeTo) html.setAttribute('data-theme', theme);
  _shellThemeSwapVariant = null;
  if (typeof animThemeApply === 'function') animThemeApply();
  html.setAttribute('data-density', state.density === 'compact' ? 'compact' : 'normal');
  const app = document.getElementById('app');
  if (app) {
    app.classList.toggle('sidebar-collapsed', !!state.sidebarCollapsed);
    app.classList.toggle('focus', !!state.focus);
  }
  const group = shellGroupFor(state.view);
  if (group !== 'system') _shellLastGroup = group;
  if (group === 'tasks' && typeof isTaskView === 'function' && isTaskView(state.view)) _shellLastTaskView = state.view;
  const tt = document.getElementById('theme-toggle');
  if (tt) {
    const dark = state.theme === 'dark';
    // The icon shows the current mode and morphs: sun -> moon with stars going dark, back going light.
    if (!tt.querySelector('.tt-morph')) tt.innerHTML = _SHELL_TT_SVG;
    tt.classList.toggle('is-dark', dark);
    tt.setAttribute('data-tip', dark ? 'Light mode' : 'Dark mode');
    tt.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  }
  // The workspace button shows just the name (as in the approved mockups); the window title keeps appTitle().
  const name = userName() || 'OpenDash';
  const bn = document.getElementById('brand-name'); if (bn && bn.textContent !== name) bn.textContent = name;
  if (_SHELL_IS_MAC) { const k = document.querySelector('#palette-btn .kbd'); if (k && k.textContent !== '⌘') k.textContent = '⌘'; }
  setBrandMark(document.getElementById('brand-mark'), userName());
  renderSwitcher();
  renderCrumb();
  renderSidebarFooter();
  renderSaveStatus();
  renderPageHeaderControls();
}

/* ---------- default More / workspace items ---------- */
registerMoreItem({ id: 'new-task', label: 'New task', icon: 'plus', order: 10, kbd: 'Q', run: () => openNewTask() });
registerMoreItem({ id: 'bulk-add', label: 'Bulk add tasks…', icon: 'clipboard-list', order: 20, run: () => openBulkImport() });
registerMoreItem({ id: 'templates', label: 'Templates…', icon: 'layout-template', order: 30, run: () => openTemplatesModal() });
registerMoreItem({ id: 'density', label: 'Compact rows', icon: 'list', order: 110, checked: () => state.density === 'compact',
  run: () => { state.density = state.density === 'compact' ? 'normal' : 'compact'; saveUI(); render(); } });
registerMoreItem({ id: 'focus', label: 'Focus mode', icon: 'focus', order: 120, kbd: 'Ctrl+Shift+F', checked: () => !!state.focus,
  run: () => { state.focus = !state.focus; saveUI(); render(); } });
registerMoreItem({ id: 'reduce-motion', label: 'Reduce motion', icon: 'sparkle', order: 130,
  checked: () => !!(window.Motion && Motion.prefersReduced()),
  disabled: () => (window.Motion && Motion.systemReduced ? Motion.systemReduced() : !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)),
  title: 'Turn interface animations down to the minimum (saved on this device)',
  run: () => { if (window.Motion) Motion.setReduced(!Motion.prefersReduced()); } });
registerMoreItem({ id: 'briefing', label: 'Morning briefing', icon: 'sunrise', order: 210, hidden: () => !HAS_COWORK, run: () => runMorningBriefing() });
registerMoreItem({ id: 'backup', label: 'Back up now', icon: 'download', order: 310, where: ['more', 'workspace'],
  hint: () => lastBackupLabel(), run: () => downloadBackup(false) });
registerMoreItem({ id: 'restore', label: 'Restore from backup…', icon: 'upload', order: 320, where: ['more', 'workspace'],
  run: () => document.getElementById('import-file').click() });
registerMoreItem({ id: 'export', label: 'Export to Markdown', icon: 'file-down', order: 330, where: ['more', 'workspace'], kbd: 'Ctrl+E', run: () => exportMarkdown() });
registerMoreItem({ id: 'print', label: 'Print this view', icon: 'printer', order: 340, where: ['more', 'workspace'], run: () => printDashboard() });
registerMoreItem({ id: 'settings', label: 'Settings', icon: 'settings', order: 410, where: ['more', 'workspace'], run: () => setView('settings') });
registerMoreItem({ id: 'connections', label: 'Connections', icon: 'plug', order: 420, where: ['more', 'workspace'], run: () => setView('connections') });
registerMoreItem({ id: 'shortcuts', label: 'Keyboard shortcuts', icon: 'keyboard', order: 430, where: ['more', 'workspace'], kbd: '?', run: () => showKbHelp() });
