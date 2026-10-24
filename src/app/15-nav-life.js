/* ============================================================
   LIFE, the fifth area (2.18, docs/dev/NAVIGATION_PLAN.md 2.1 to 2.3).
   User requests, 24 Oct: "it is unclear how to access these pages"; "we have
   home, tasks, calendar, finances, we could add another one ... but we just
   need overall cleanup and consistency"; "a proper nice UI design for
   everything". The switcher reads Home · Tasks · Calendar · Money · Life.

   Life's six tabs (pages with area 'life' and tab: true in the registry,
   14-shell.js registerPage), in this order:
     Friends 10 (96-friends-1ui.js)        Garden 20 (here, guarded: the garden module's section 'garden')
     Pets 30 (here, guarded: section 'pet') Achievements 40 (92-game-3ui.js, view 'game')
     Memories 50 (93-memories-page.js)     Places 60 (90-locations-view.js: Locations and Trips)
   A tab whose page is not on this build (Garden and Pets until their modules
   merge) is left out everywhere; a tab whose feature is off stays and its page
   shows one calm "Turn on" (pageOff, drawn by the shell's header note below).

   ADDING A LIFE TAB (another module): register the section, then
     registerPage({ id, view, match, label, icon, desc, area: 'life', tab: true, order, since: '2.18',
                    sections?, ownTabs?, badge?, off?, available? })
   The Life sidebar, the tab strip, All pages, the palette, the corner hub's icons
   and the new-page dot follow. A page that is not a tab (area 'life', no tab)
   shows in All pages and the palette only.

     lifeTileView()     where the Life tile goes: the last Life page this session,
                        else the synced uiPrefs.lifeLast, else Friends (with a
                        friend), Garden, Achievements (Fun on), Memories
     lifeBadge()        the tile's number: friend requests + time capsules due +
                        garden plants ready (only things that need you)
     lifeRemember(view) the shell tells us a Life page was shown
     lifeTabs()         the available Life tab pages, in order
   Sidebar blocks (Customise sidebar lists them): 'life-tabs' (the six, with
   badges), 'life-you' (You: Profile, Wardrobe once 2.18 adds it, Set status),
   'all-pages' (one row at the foot of every tab's sidebar, 16-pages.js).
   ============================================================ */

/* ---------- guarded 2.18 pages: on this build only once their sections are registered ---------- */
function _lifeHasSection(name) { try { return typeof SECTIONS !== 'undefined' && SECTIONS.has(name); } catch (e) { return false; } }
function _lifeFunOff() { try { return typeof gameFun === 'function' && gameFun() === 'off'; } catch (e) { return false; } }
function _lifeFunOn() {
  if (typeof gamePrefSet !== 'function') return;
  gamePrefSet({ fun: 'subtle' });
  toast('Fun is on (Subtle)', { icon: 'party-popper', action: { label: 'Undo', run: () => gamePrefSet({ fun: 'off' }) } });
}
/** The calm "Turn on" for pages that need the Fun level (Achievements, Garden, Pets). */
function lifeFunOffState() { return _lifeFunOff() ? { label: 'Fun is off: no garden, pets or game moments for now.', action: { label: 'Turn Fun on', run: _lifeFunOn } } : null; }

registerPage({
  // integrate 2.18: the garden's own tabs (94-garden-4page.js GARDEN_TABS, Friends from garden-social) and a friend's garden
  // (garden:visit:<id>, 94-garden-social-2visit.js) are all Life › Garden.
  id: 'garden', view: 'garden', match: v => v === 'garden' || /^garden:[a-z]+$/.test(v) || /^garden:visit:[0-9a-f]{16}$/.test(v),
  label: 'Garden', icon: 'sprout', area: 'life', tab: true, order: 20, since: '2.18', ownTabs: true,
  desc: 'Plants, visitors, the shop and the almanac',
  keywords: 'garden plants grow flowers seeds water harvest shop almanac basket decorations visitors friends visit guestbook',
  sections: () => [['garden', 'Garden'], ['garden:shop', 'Shop'], ['garden:almanac', 'Almanac'], ['garden:basket', 'Basket']]
    .concat(_lifeHasSection('garden-visit') ? [['garden:friends', 'Friends’ gardens']] : []),
  available: () => _lifeHasSection('garden'),
  off: lifeFunOffState,
  badge: () => _lifeGardenReady() || '',
});
registerPage({
  id: 'pets', view: 'pet', match: v => v === 'pet' || /^pet:[a-z]+$/.test(v),
  label: 'Pets', icon: 'paw-print', area: 'life', tab: true, order: 30, since: '2.18', ownTabs: true,
  desc: 'Your companion: pats, treats, tricks and outfits',
  keywords: 'pet pets companion cat dog animal treat tricks wardrobe journal',
  sections: [['pet', 'Together'], ['pet:wardrobe', 'Wardrobe'], ['pet:journal', 'Journal']],
  available: () => _lifeHasSection('pet'),
  off: lifeFunOffState,
});
// You (Life sidebar › You): listed under Life in All pages, but the page itself is Settings › Profile.
registerPage({
  id: 'profile', view: 'settings:me', match: v => v === 'settings:me', label: 'Profile', icon: 'user-round', area: 'life', order: 80, keepGroup: true, family: 'settings',
  desc: 'Your card, avatar and status', keywords: 'profile avatar character card status name you me',
  available: () => typeof profileGet === 'function',
});
registerPage({
  id: 'wardrobe', view: 'settings:me', match: () => false, label: 'Wardrobe', icon: 'shirt', area: 'life', order: 85, keepGroup: true, since: '2.18',
  desc: 'Outfits for your character, and Surprise me', keywords: 'wardrobe outfit clothes dress up avatar surprise',
  available: () => typeof profileWardrobeEl === 'function',
  run: () => lifeOpenWardrobe(),
});
/** Settings › Profile, scrolled to the wardrobe (the wardrobe module marks it data-whats-new~="wardrobe"). */
function lifeOpenWardrobe() {
  try { seenSet('pages', 'wardrobe', todayStr()); } catch (e) { /* the dot clears next time */ }
  if (state.view !== 'settings:me') setView('settings:me');
  let n = 0;
  const find = () => {
    const el = document.querySelector('[data-whats-new~="wardrobe"], .pfw-strip, .pfw');
    if (el) { try { el.scrollIntoView({ block: 'start', behavior: (window.Motion && Motion.prefersReduced()) ? 'auto' : 'smooth' }); } catch (e) { /* old browser */ } return; }
    if (++n < 12) setTimeout(find, 100);
  };
  setTimeout(find, 80);
}

/* ---------- the tile ---------- */
function lifeTabs() { return pagesInArea('life', { tabs: true }); }
function _lifeViewOk(v) {
  if (typeof v !== 'string' || !v) return false;
  const p = pageFor(v);
  if (!p || p.area !== 'life' || p.keepGroup || !pageAvailable(p)) return false;
  try { return typeof _viewFromHash !== 'function' || _viewFromHash('#view=' + v) === v; } catch (e) { return false; }
}
function _lifeHasFriend() { try { return !!(_fr && _fr.data && Array.isArray(_fr.data.friends) && _fr.data.friends.some(f => f && f.status === 'friend')); } catch (e) { return false; } }
function lifeTileView() {
  if (_lifeViewOk(_shellLastLifeView)) return _shellLastLifeView;
  let last = '';
  try { last = typeof uiPrefGet === 'function' ? uiPrefGet('lifeLast') : ''; } catch (e) { last = ''; }
  if (_lifeViewOk(last)) return last;
  const has = (id) => { const p = pageById(id); return !!(p && pageAvailable(p)); };
  if (_lifeHasFriend() && has('friends')) return 'friends';
  if (has('garden') && !_lifeFunOff()) return 'garden';
  if (has('game') && !_lifeFunOff()) return 'game';
  if (has('memories')) return 'memories';
  const first = lifeTabs()[0];
  return first ? pageView(first) : 'memories';
}
/** The shell saw a Life page: the tile returns here (this session exactly; other devices the page itself). */
function lifeRemember(v) {
  if (!_lifeViewOk(v)) return;
  _shellLastLifeView = v;
  const p = pageFor(v), keep = p ? pageView(p) : v;
  try { if (typeof uiPrefGet === 'function' && uiPrefGet('lifeLast') !== keep) uiPrefSet('lifeLast', keep); } catch (e) { /* kept for this session */ }
}
function _lifeRequests() { try { return (_fr && _fr.data && Array.isArray(_fr.data.friends)) ? _fr.data.friends.filter(f => f && f.status === 'incoming').length : 0; } catch (e) { return 0; } }
function _lifeCapsules() { try { return typeof memCapsulesDue === 'function' ? memCapsulesDue().length : 0; } catch (e) { return 0; } }
function _lifeGardenReady() { try { return typeof gardenModel === 'function' && state.garden && state.garden.since ? (gardenModel().ripe || 0) : 0; } catch (e) { return 0; } }
/** Only what needs you: friend requests waiting, letters from past you, plants ready to pick. */
function lifeBadge() {
  const n = _lifeRequests() + _lifeCapsules() + (_lifeFunOff() ? 0 : _lifeGardenReady());
  return n || null;
}

/* ---------- the Life sidebar ---------- */
registerSidebarBlock('life', {
  id: 'life-tabs', order: 10, label: 'Life',
  render(el) {
    const cur = pageFor(state.view);
    for (const p of lifeTabs()) {
      const b = pageBadge(p), num = /^\d+$/.test(b);
      el.appendChild(sbNavItem({
        label: pageLabel(p), icon: p.icon, view: pageView(p), active: cur === p,
        count: num ? b : '', countAlert: num && p.id === 'friends', hint: num ? '' : b,
        title: pageDesc(p), className: pageOff(p) ? 'is-off' : '',
      }));
    }
  },
});
registerSidebarBlock('life', {
  id: 'life-you', order: 20, label: 'You',
  render(el) {
    if (typeof profileGet !== 'function') return false;
    el.appendChild(sbSection({ title: 'You' }));
    el.appendChild(sbNavItem({ label: 'Profile', icon: 'user-round', view: 'settings:me', title: 'Your card, avatar and status' }));
    const w = pageById('wardrobe');
    if (w && pageAvailable(w)) el.appendChild(sbNavItem({ label: 'Wardrobe', icon: 'shirt', active: false, fresh: pageIsFresh(w), title: pageDesc(w), onClick: () => lifeOpenWardrobe() }));
    if (typeof profileHubOpen === 'function') {
      el.appendChild(sbNavItem({ label: 'Set status', icon: 'circle-user', active: false, title: 'Focusing, on holiday… it clears itself',
        onClick: () => { const a = document.getElementById('ws-btn'); setTimeout(() => profileHubOpen(a, { status: true }), 0); } }));
    }
  },
});
// One row at the foot of every tab's sidebar: All pages (16-pages.js), G then G.
registerSidebarBlock(['home', 'tasks', 'calendar', 'finance', 'life'], {
  id: 'all-pages', order: 99, label: 'All pages',
  render(el) {
    const r = sbNavItem({ label: 'All pages', icon: 'layout-grid', className: 'nav-more sb-all-pages', active: false, title: 'Every page in one place (G then G)',
      onClick: () => { if (typeof openAllPages === 'function') openAllPages(); else openCommandPalette(); } });
    r.setAttribute('aria-keyshortcuts', 'G G');
    el.appendChild(r);
  },
});

/* ---------- a page that is switched off: one calm row under the header, with Turn on ---------- */
function _lifeOffPaint() {
  const head = document.getElementById('view-header');
  if (!head) return;
  let row = document.getElementById('view-off');
  const p = pageFor(state.view);
  const off = p && !p.offHandled ? pageOff(p) : null;
  if (!off) { if (row) row.remove(); return; }
  const key = p.id + '|' + off.label;
  if (row && row.dataset.k === key) return;
  if (!row) { row = document.createElement('div'); row.id = 'view-off'; row.className = 'view-off-row'; head.appendChild(row); }
  row.dataset.k = key;
  row.replaceChildren();
  row.insertAdjacentHTML('beforeend', icon('moon', 'i-sm'));
  const t = document.createElement('span'); t.textContent = off.label; row.appendChild(t);
  if (off.action && typeof off.action.run === 'function') {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-secondary btn-sm'; b.textContent = off.action.label || 'Turn on';
    b.onclick = () => { try { off.action.run(); } catch (e) { console.error('[life] turn on', e); } };
    row.appendChild(b);
  }
}

/* ---------- the corner hub (97-profile-3corner.js calls lifeHubEl): Life one click away (NAVIGATION_PLAN.md 2.5) ----------
   "Open Life" goes where the Life tile goes; then one icon per Life tab (a dot on a new one). The hub's own
   arrow keys move between them (a .pfc-row moves left and right inside, up and down between rows). */
function lifeHubEl(close) {
  const tabs = lifeTabs();
  if (!tabs.length) return null;
  const here = pageFor(state.view);
  const wrap = document.createElement('div'); wrap.className = 'pfc-life';
  const open = document.createElement('button'); open.type = 'button'; open.className = 'pfc-life-open';
  const n = lifeBadge();
  open.innerHTML = icon('heart', 'i-sm') + '<span class="pfc-life-l">Open Life</span>' + (n ? `<span class="pfc-life-n">${esc(String(n))}</span>` : '') + `<kbd class="kbd">G L</kbd>` + icon('chevron-right', 'i-sm');
  open.setAttribute('aria-label', 'Open Life' + (n ? `, ${n} waiting` : ''));
  open.onclick = (e) => { e.stopPropagation(); close(); navVia('chrome'); setView(lifeTileView()); };
  wrap.appendChild(open);
  const row = document.createElement('div'); row.className = 'pfc-life-icons pfc-row'; row.setAttribute('role', 'group'); row.setAttribute('aria-label', 'Life');
  let dots = 0;   // at most three new-page dots at once (UX_BLUEPRINT.md 3)
  for (const p of tabs) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'pfc-life-ic' + (here === p ? ' is-here' : '');
    const fresh = here !== p && dots < 3 && pageIsFresh(p);
    if (fresh) dots++;
    b.innerHTML = icon(p.icon) + (fresh ? '<span class="nav-new" aria-hidden="true"></span>' : '');
    b.setAttribute('aria-label', pageLabel(p) + (fresh ? ', new' : ''));
    b.setAttribute('data-tip', pageLabel(p));
    if (here === p) b.setAttribute('aria-current', 'page');
    b.onclick = (e) => { e.stopPropagation(); close(); if (here === p && pageView(p) === state.view) return; pagesOpen(p); };
    row.appendChild(b);
  }
  wrap.appendChild(row);
  return wrap;
}
// Without the profile hub (an older build, or no profile module) the corner opens the workspace menu: Life is there too.
registerMoreItem({ id: 'open-life', label: 'Open Life', icon: 'heart', order: 4, where: ['workspace'], kbd: 'G L', hidden: () => typeof profileHubOpen === 'function',
  run: () => { navVia('chrome'); setView(lifeTileView()); } });
