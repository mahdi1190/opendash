/* ============================================================
   ALL PAGES (2.18, docs/dev/NAVIGATION_PLAN.md 2.7): every page in one
   searchable grid, by area, with icons and one-line descriptions. User
   request, 24 Oct: "so many new features, I want them clear and easy to
   access through the UI while not being overwhelming".

   Reads the pages registry (14-shell.js registerPage): a page registered
   there shows here, in the palette's Go to, in the sidebar's Life tabs and
   with a new-page dot, with nothing else to do.

   Ways in: the grid button by the search box (#pages-btn, src/body.html), the
   'All pages' row at the foot of every tab's sidebar (15-nav-life.js), the
   corner hub and the More menu (registerMoreItem 'all-pages', also on phones
   where the sidebar is a drawer), the palette ('All pages…' and each page as
   a Go to row) and G then G (90-wiring.js).

   Behaviour: type to filter (the palette's match over label, description,
   keywords and sections); arrows move (up and down by row, left and right
   while the box is empty), Enter opens, Shift+Enter pins the page to the
   sidebar (Undo in the toast), Esc clears the box, then closes. Life shows
   cards; the other areas compact rows, so it stays one screen. A switched-off
   page shows its reason and one button. Choosing the page you are on only
   closes. Reduced motion: no zoom.

     openAllPages(o)        o.query: start filtered; a second call closes it
     pagesOpen(page, view)  open a page (or one of its sections) as a chrome move
   Styles: src/styles/16-pages.css.
   ============================================================ */
let _apClose = null;
const _apOpenSecs = new Set();   // pages whose section chips are all shown (the +N chip opens them; this session)

/** Open a page (its run, else its view) or one of its sections; no 'Back to' (it is not a link inside a page). */
function pagesOpen(p, section) {
  if (!p) return;
  if (typeof navVia === 'function') navVia('chrome');
  try {
    if (section && typeof section.run === 'function') section.run();
    else if (section && section.view) setView(section.view);
    else if (typeof p.run === 'function') p.run();
    else setView(pageView(p));
  } catch (e) { console.error('[all pages]', e); }
  if (typeof _navViaNext !== 'undefined') _navViaNext = '';
}
function _apScore(p, q) {
  if (!q) return 1;
  const sc = (t) => (typeof _palScore === 'function' ? _palScore(t, q) : (String(t || '').toLowerCase().includes(q) ? 50 : 0));
  const kw = (t) => (typeof _palKwScore === 'function' ? _palKwScore(t, q) : 0);
  let s = Math.max(sc(pageLabel(p)), sc(pageDesc(p)) * 0.6, kw(p.keywords));
  for (const x of pageSectionsOf(p)) s = Math.max(s, sc(x.label) * 0.8);
  return s;
}
/** Extra rows for Settings and help: things you open, that are not pages. */
function _apExtras() {
  return [
    typeof openWhatsNew === 'function' ? { label: 'What’s new', icon: 'gift', desc: 'What came in this release, with Show me', keywords: 'whats new release notes changes tour', run: () => openWhatsNew() } : null,
    typeof showKbHelp === 'function' ? { label: 'Keyboard shortcuts', icon: 'keyboard', desc: 'Every key, in one sheet (?)', keywords: 'keys keyboard shortcuts hotkeys', run: () => showKbHelp() } : null,
  ].filter(Boolean);
}

function openAllPages(o) {
  o = o || {};
  if (_apClose) { _apClose(); return; }
  closePopovers();
  if (typeof _paletteClose === 'function' && _paletteClose) _paletteClose();
  const prevFocus = document.activeElement;
  const scrim = document.createElement('div'); scrim.className = 'scrim ap-scrim';
  const box = document.createElement('div'); box.className = 'ap'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'All pages');
  box.innerHTML = `<div class="ap-in">${icon('search')}<input class="ap-q" type="text" placeholder="Find a page…" aria-label="Find a page" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="ap-list" />`
    + '</div><div class="ap-list" id="ap-list" role="listbox" aria-label="Pages"></div><div class="ap-f"></div>';
  const input = box.querySelector('.ap-q'), list = box.querySelector('.ap-list'), foot = box.querySelector('.ap-f');
  box.querySelector('.ap-in').appendChild(uiButton({ icon: 'x', size: 'sm', cls: 'ap-x', aria: 'Close', kbd: 'Esc', run: () => close(false) }));
  let items = [], cur = 0;

  function close(ran) {
    if (!_apClose) return;
    _apClose = null;
    scrim.remove(); box.remove();
    document.removeEventListener('keydown', onDocKey, true);
    if (!ran && prevFocus && prevFocus.focus && prevFocus.isConnected) { try { prevFocus.focus({ preventScroll: true }); } catch (e) { /* gone */ } }
  }
  function openItem(it, pin) {
    if (!it) return;
    if (it.expand) { _apOpenSecs.add(it.expand); paint(); input.focus(); return; }   // "+N": the rest of a page's sections
    if (pin && it.page) {
      close(true);
      const v = pageView(it.page);
      if (typeof sbTogglePin === 'function') sbTogglePin(v);
      return;
    }
    if (it.page && !it.section && pageFor(state.view) === it.page && typeof it.page.run !== 'function') { close(false); return; }   // you are here
    if (it.section && it.section.view && it.section.view === state.view) { close(false); return; }
    close(true);
    if (it.run) { if (typeof navVia === 'function') navVia('chrome'); try { it.run(); } catch (e) { console.error('[all pages]', e); } if (typeof _navViaNext !== 'undefined') _navViaNext = ''; return; }
    pagesOpen(it.page, it.section);
  }
  function mark(scroll) {
    items.forEach((it, i) => { it.el.classList.toggle('on', i === cur); it.el.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
    const it = items[cur];
    if (it) { input.setAttribute('aria-activedescendant', it.el.id); if (scroll) it.el.scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }
  function addItem(el, it) {
    const i = items.length;
    el.id = 'ap-i-' + i; el.setAttribute('role', 'option'); el.tabIndex = -1;
    el.addEventListener('click', (e) => { if (e.target.closest('.ap-pin, .ap-off-b')) return; openItem(it, e.shiftKey); });
    el.addEventListener('mousemove', () => { if (cur !== i) { cur = i; mark(false); } });
    items.push(Object.assign(it, { el }));
    return el;
  }
  function pinBtn(p) {
    const v = pageView(p);
    const on = typeof sbIsPinned === 'function' && sbIsPinned(v);
    return uiButton({ icon: on ? 'pin-off' : 'pin', iconCls: 'i-sm', size: 'sm', cls: 'ap-pin' + (on ? ' on' : ''),
      aria: (on ? 'Unpin ' : 'Pin ') + pageLabel(p) + (on ? ' from' : ' to') + ' the sidebar', tip: on ? 'Unpin from the sidebar' : 'Pin to the sidebar (Shift+Enter)',
      run: () => { if (typeof sbTogglePin === 'function') sbTogglePin(v); paint(); } });
  }
  /** A page's sections as chips: three, then "+N" (UX_BLUEPRINT.md 3); a search shows every match. */
  function sectionChips(host, p, q) {
    const secs = pageSectionsOf(p);
    if (secs.length < 2) return;
    const row = document.createElement('div'); row.className = 'ap-secs';
    const hits = secs.filter(s => !(q && typeof _palScore === 'function' && !_palScore(s.label, q) && !_apScore(p, q)));
    const all = !!q || _apOpenSecs.has(p.id) || hits.length <= 4;
    for (const s of all ? hits : hits.slice(0, 3)) {
      const c = document.createElement('span'); c.className = 'ap-sec';
      c.textContent = s.label;
      row.appendChild(addItem(c, { page: p, section: s }));
    }
    if (!all) {
      const c = document.createElement('span'); c.className = 'ap-sec ap-sec-more';
      c.textContent = '+' + (hits.length - 3);
      c.setAttribute('aria-label', `${hits.length - 3} more in ${pageLabel(p)}`);
      c.title = hits.slice(3).map(s => s.label).join(', ');
      row.appendChild(addItem(c, { expand: p.id }));
    }
    if (row.childNodes.length) host.appendChild(row);
  }
  function paint() {
    const q = input.value.trim().toLowerCase();
    const keep = items[cur] ? (items[cur].page ? items[cur].page.id : '') + '|' + (items[cur].section ? items[cur].section.label : '') : '';
    list.innerHTML = ''; items = [];
    const here = pageFor(state.view);
    // Recently: the pages you opened this session (the newest first).
    if (!q && typeof _navTrail !== 'undefined' && _navTrail.length) {
      const seen = new Set(here ? [here.id] : []), recent = [];
      for (let i = _navTrail.length - 1; i >= 0 && recent.length < 4; i--) { const p = pageFor(_navTrail[i]); if (p && !seen.has(p.id) && pageAvailable(p)) { seen.add(p.id); recent.push(p); } }
      if (recent.length) {
        const r = document.createElement('div'); r.className = 'ap-recent';
        r.appendChild(Object.assign(document.createElement('span'), { className: 'ap-recent-h', textContent: 'Recently' }));
        for (const p of recent) { const c = document.createElement('span'); c.className = 'ap-chip'; c.innerHTML = icon(p.icon, 'i-xs') + `<span>${esc(pageLabel(p))}</span>`; r.appendChild(addItem(c, { page: p })); }
        list.appendChild(r);
      }
    }
    let best = null, bestS = 0;
    for (const [area, alabel, aicon] of SHELL_AREAS) {
      let pages = pagesAll().filter(p => p.area === area).map(p => ({ p, s: _apScore(p, q) })).filter(x => x.s > 0);
      const extras = area === 'system' ? _apExtras().map(x => ({ x, s: q ? Math.max(typeof _palScore === 'function' ? _palScore(x.label, q) : 0, typeof _palKwScore === 'function' ? _palKwScore(x.keywords, q) : 0) : 1 })).filter(x => x.s > 0) : [];
      if (q) pages = pages.sort((a, b) => b.s - a.s);
      if (!pages.length && !extras.length) continue;
      const sec = document.createElement('section'); sec.className = 'ap-area ap-area-' + area;
      sec.innerHTML = `<h3 class="ap-area-h">${icon(aicon, 'i-sm')}<span>${esc(alabel)}</span></h3>`;
      const tabs = pages.filter(x => area === 'life' && x.p.tab), rest = pages.filter(x => !(area === 'life' && x.p.tab));
      if (tabs.length) {
        const grid = document.createElement('div'); grid.className = 'ap-cards';
        for (const { p, s } of tabs) {
          const off = pageOff(p), badge = pageBadge(p), fresh = pageIsFresh(p);
          const card = document.createElement('div'); card.className = 'ap-card' + (p === here ? ' is-here' : '') + (off ? ' is-off' : '');
          card.innerHTML = `<div class="ap-card-h"><span class="ap-ic">${icon(p.icon)}</span><b>${esc(pageLabel(p))}</b>`
            + (fresh ? '<span class="ap-new">New</span>' : badge ? `<span class="ap-badge">${esc(badge)}</span>` : '') + '</div>'
            + `<div class="ap-desc">${esc(off ? off.label : pageDesc(p))}</div>`;
          if (off && off.action) {
            card.appendChild(uiButton({ label: off.action.label || 'Turn on', size: 'sm', cls: 'ap-off-b',
              run: () => { try { off.action.run(); } catch (x) { console.error('[all pages] turn on', x); } paint(); } }));
          }
          card.querySelector('.ap-card-h').appendChild(pinBtn(p));
          grid.appendChild(addItem(card, { page: p }));
          if (s > bestS) { bestS = s; best = items[items.length - 1]; }
        }
        sec.appendChild(grid);
      }
      if (rest.length || extras.length) {
        const rows = document.createElement('div'); rows.className = 'ap-rows' + (area === 'life' ? ' ap-you' : '');
        if (area === 'life' && rest.length) rows.appendChild(Object.assign(document.createElement('span'), { className: 'ap-rows-k', textContent: 'You' }));
        for (const { p, s } of rest) {
          const wrap = document.createElement('div'); wrap.className = 'ap-rowwrap';
          const r = document.createElement('div'); r.className = 'ap-row' + (p === here ? ' is-here' : '');
          r.title = pageDesc(p);
          const badge = pageBadge(p), fresh = pageIsFresh(p);
          r.innerHTML = icon(p.icon, 'i-sm') + `<span class="ap-row-l">${esc(pageLabel(p))}</span>` + (fresh ? '<span class="ap-new">New</span>' : badge ? `<span class="ap-badge">${esc(badge)}</span>` : '');
          r.appendChild(pinBtn(p));
          wrap.appendChild(addItem(r, { page: p }));
          if (s > bestS) { bestS = s; best = items[items.length - 1]; }
          if (!p.ownTabs || area === 'calendar' || area === 'money') sectionChips(wrap, p, q);
          rows.appendChild(wrap);
        }
        for (const { x, s } of extras) {
          const r = document.createElement('div'); r.className = 'ap-row'; r.title = x.desc;
          r.innerHTML = icon(x.icon, 'i-sm') + `<span class="ap-row-l">${esc(x.label)}</span>`;
          const wrap = document.createElement('div'); wrap.className = 'ap-rowwrap';
          wrap.appendChild(addItem(r, { run: x.run, label: x.label }));
          rows.appendChild(wrap);
          if (s > bestS) { bestS = s; best = items[items.length - 1]; }
        }
        sec.appendChild(rows);
      }
      list.appendChild(sec);
    }
    if (!items.length) {
      const e = document.createElement('div'); e.className = 'ap-empty';
      e.innerHTML = `${icon('search', 'i-lg')}<div><b>No page called that</b><span>Try another word, or search everything (tasks, people, settings) in the palette.</span></div>`;
      e.appendChild(uiButton({ label: 'Search everything', size: 'sm', run: () => { const v = input.value; close(true); openCommandPalette(v); } }));
      list.appendChild(e);
    }
    // The cursor: the best match while you type, else where it was (or the page you are on).
    const again = keep ? items.findIndex(it => ((it.page ? it.page.id : '') + '|' + (it.section ? it.section.label : '')) === keep) : -1;
    cur = q && best ? items.indexOf(best) : again >= 0 ? again : Math.max(0, items.findIndex(it => it.page && it.page === here && !it.section));
    mark(true);
    paintFoot();
  }
  function paintFoot() {
    foot.innerHTML = `<span class="k"><span class="kbd-group"><kbd class="kbd">↑</kbd><kbd class="kbd">↓</kbd></span>Move</span><span class="k"><kbd class="kbd">↵</kbd>Open</span><span class="k"><span class="kbd-group"><kbd class="kbd">Shift</kbd><kbd class="kbd">↵</kbd></span>Pin</span><span class="spacer"></span>`;
    if (pagesFresh().length) foot.appendChild(uiButton({ label: 'Mark all as seen', kind: 'ghost', size: 'sm', run: () => { const n = pagesMarkAllSeen(); if (n) { renderShell(); renderSidebar(); } paint(); input.focus(); } }));
    if (typeof openSidebarCustomiser === 'function') foot.appendChild(uiButton({ label: 'Customise sidebar…', kind: 'ghost', size: 'sm', run: () => { close(true); openSidebarCustomiser(); } }));
  }
  /** Up / Down: the item in the next row whose middle is nearest (a grid of cards, rows, chips). */
  function vertical(dir) {
    const a = items[cur]; if (!a) return cur;
    const ra = a.el.getBoundingClientRect(), mid = ra.left + ra.width / 2;
    let pick = -1, pickRow = null, pickDx = Infinity;
    items.forEach((it, i) => {
      if (i === cur) return;
      const r = it.el.getBoundingClientRect();
      const below = r.top >= ra.bottom - 2, above = r.bottom <= ra.top + 2;
      if ((dir > 0 && !below) || (dir < 0 && !above)) return;
      const row = Math.round(dir > 0 ? r.top : -r.bottom);
      if (pickRow !== null && row > pickRow + 2) return;
      const dx = Math.abs(r.left + r.width / 2 - mid);
      if (pickRow === null || row < pickRow - 2 || dx < pickDx) { pick = i; pickRow = row; pickDx = dx; }
    });
    return pick < 0 ? cur : pick;
  }
  function onKey(e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { close(true); return; }   // the palette opens instead (90-wiring.js)
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); if (input.value) { input.value = ''; paint(); } else close(false); return; }
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); cur = vertical(e.key === 'ArrowDown' ? 1 : -1); mark(true); return; }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !input.value) { e.preventDefault(); cur = (cur + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length; mark(true); return; }
    if (e.key === 'Home' && e.ctrlKey) { e.preventDefault(); cur = 0; mark(true); return; }
    if (e.key === 'End' && e.ctrlKey) { e.preventDefault(); cur = items.length - 1; mark(true); return; }
    if (e.key === 'Enter') { e.preventDefault(); openItem(items[cur], e.shiftKey); }
  }
  // Keys from anywhere inside (a pin button, Turn on) still move, open and close.
  function onDocKey(e) { if (!box.contains(e.target) || e.target === input) return; if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); } }
  input.addEventListener('keydown', onKey);
  input.addEventListener('input', () => paint());
  scrim.onclick = () => close(false);
  document.body.append(scrim, box);
  document.addEventListener('keydown', onDocKey, true);
  _apClose = () => close(false);
  input.value = o.query || '';
  paint();
  setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (e) { /* gone */ } }, 0);
  return true;
}

/* ---------- Home: a card's title opens its page (NAVIGATION_PLAN.md 2.8) ----------
   A widget's own `page` (registerHomeWidget, 12-home.js) wins; else this map. A page that is not on
   this build gets no link. The title becomes a button with a chevron on hover and focus; it is a link
   inside Home, so the page it opens offers 'Back to Home'. */
const HOME_WIDGET_PAGES = Object.freeze({
  today: 'today', dayplan: 'today', week: 'week', runway: 'week',
  schedule: 'calendar', nextup: 'calendar', gap: 'calendar', wrapup: 'calendar', calcheck: 'calendar', countdowns: 'calendar',
  capture: 'inbox', inbox: 'triage', launchpad: 'files', links: 'files', finance: 'finance', spendable: 'finance',
  heatmap: 'memories:year', onthisday: 'memories', seasonal: 'memories', funfact: 'memories:milestones',
  reportcard: 'home:week', review: 'home:week', waiting: 'waiting', owe: 'people', people: 'people',
  travel: 'trips', animday: 'settings:animations', game: 'game', friends: 'friends', pet: 'pet',
  garden: () => (typeof sectionFor === 'function' && sectionFor('garden') ? 'garden' : 'memories:year'),
});
function homeWidgetPage(def, ctx) {
  if (!def) return null;
  let p = Object.prototype.hasOwnProperty.call(def, 'page') ? def.page : HOME_WIDGET_PAGES[def.baseId || def.id];
  if (typeof p === 'function') { try { p = p(ctx || {}); } catch (e) { p = null; } }
  if (!p || typeof p !== 'string') return null;
  try { if (typeof _viewFromHash === 'function' && _viewFromHash('#view=' + p) !== p) return null; } catch (e) { return null; }
  return p;
}
function homeCardTitleLink(frame, def, ctx) {
  const view = homeWidgetPage(def, ctx);
  if (!view) return false;
  const h = frame.querySelector('[data-hw-title]') || frame.querySelector('.card-h > h3') || frame.querySelector('.card-h h3');
  if (!h || h.closest('button, a') || h.querySelector('.hw-title-link')) return false;
  const p = pageFor(view);
  let label = p ? pageLabel(p) : '';
  if (!label) { try { const sec = sectionFor(view); label = sec ? String(sec.title(view) || '') : viewTitle(view); } catch (e) { label = view; } }
  return cardTitleLink(h, view, label || view);   // the button and its chevron: the 2.18 kit (11-ui-kit.js)
}
/** The Life cards (Your garden, Your pet, Quests and streaks, Friends around) on Home, in one step with Undo. */
function homeAddLifeCards() {
  if (typeof homeLayout !== 'function' || typeof homeSaveLayout !== 'function') return false;
  const ids = ['garden', 'pet', 'game', 'friends'].filter(id => typeof homeWidgetDef === 'function' && homeWidgetDef(id));
  const widgets = homeLayout().widgets.map(w => (ids.includes(w.id) ? Object.assign({}, w, { hidden: false }) : w));
  const did = homeSaveLayout(widgets, { toast: 'The Life cards are on Home' });
  if (!did) toast('The Life cards are on Home already', { icon: 'check' });
  if (state.view !== 'home') setView('home');
  return did;
}

/* ---------- the ways in that are not the sidebar ---------- */
registerMoreItem({ id: 'all-pages', label: 'All pages…', icon: 'layout-grid', order: 5, where: ['more', 'workspace'], kbd: 'G G', run: () => openAllPages() });
registerCommand({ id: 'home-add-life-cards', label: 'Add the Life cards to Home', icon: 'heart', keywords: 'home widgets garden pet quests streaks friends around life cards add', run: () => homeAddLifeCards() });
registerCommand({ id: 'pages-open', label: 'All pages…', icon: 'layout-grid', group: 'Go to', kbd: 'G G', keywords: 'pages launcher every page find where navigation menu map sitemap', run: () => openAllPages() });
