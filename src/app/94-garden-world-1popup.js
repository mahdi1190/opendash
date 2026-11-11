/* ============================================================
   GARDEN, the pop-ups and the right-click menu (2.22, second round). User request, 30 Oct 2026: "the shop should be a pop up maybe instead of
   a page that you can easily close out of by clicking out of the focus of it. same with everything else like the mailbox."

   The buildings on the shore (94-garden-world-0walk.js, GARDEN_PROPS) open the garden's pages as pop-ups over the garden: the shop, the market
   stall's basket, the notice board's almanac, the post box's friends, the tackle shop and the field journal's catch pages. They are the
   garden's ordinary dialogs (openDialog): click beside one, press Esc or the x and you are back where you stood. The pages themselves are
   unchanged (gardenShopTab, gardenAlmanacTab, gardenBasketTab, gardenFriendsTab, gardenCatchTab fill any element), and they are still
   routes (#view=garden:shop ...) for the palette, the Home card and the sidebar.

     gardenPopupOpen(tab, o)    tab: 'shop' | 'basket' | 'almanac' | 'friends' | 'catch'; o {title, sub (a Catch page: bag, fish, bugs, tackle, show)}
     gardenPopupClose()
     gardenGoPage(view)         a link between the garden's pages: a pop-up while you are in the garden, a page elsewhere
     gardenPopupRefresh()       the pop-up's content again (the garden calls it after every change)
   ============================================================ */
const _GDPOP = Object.freeze({
  shop: { title: 'Garden shop', icon: 'store', fill: (el, m) => gardenShopTab(el, m) },
  basket: { title: 'Market stall', icon: 'shopping-basket', fill: (el, m) => gardenBasketTab(el, m) },
  almanac: { title: 'Notice board', icon: 'book-open', fill: (el, m) => gardenAlmanacTab(el, m) },
  friends: { title: 'Post box', icon: 'users', fill: (el, m) => gardenFriendsTab(el, m) },
  catch: { title: 'Catch', icon: 'fish', fill: (el, m) => gardenCatchTab(el, m) },
  nature: { title: 'Nature book', icon: 'leaf', fill: (el, m) => gardenLifeBookTab(el, m) },
  wonder: { title: 'Keepsakes', icon: 'mail', fill: (el, m) => gardenWonderBox(el, m) },
  goals: { title: 'Goals', icon: 'target', fill: (el, m) => gardenGoalsPanel(el, m) },
  sail: { title: 'Where to?', icon: 'ship', fill: (el) => gardenSailTab(el) },
  visit: { title: 'Guestbook', icon: 'feather', fill: (el) => gardenVisitNotes(el) },
  lands: { title: 'Land office', icon: 'map-pin', fill: (el, m) => gardenLandsTab(el, m) },
  craft: { title: 'Crafting bench', icon: 'hammer', fill: (el, m) => gardenCraftTab(el, m) },
  play: { title: 'Play', icon: 'gamepad-2', fill: (el, m) => gardenPlayTab(el, m) },
  tricks: { title: 'Trick book', icon: 'wand-sparkles', fill: (el) => { el.textContent = ''; petBookPage(el, { panel: true }); } },
});
/** The rowing boat: the friends whose gardens you can row over to (the cards the Post box shows), and a click on one takes you there. */
function gardenSailTab(el) {
  const fill = () => {
    if (!el.isConnected) return;
    el.textContent = '';
    el.appendChild(_gsvGallery({ crop: 'wide' }));
  };
  fill();
  if (typeof gardenSocialLoad === 'function') gardenSocialLoad(false).then(fill).catch(fill);
  if (!el.dataset.sail) {
    el.dataset.sail = '1';
    // choosing a garden takes you there (the card changes the page): close the pop-up behind you
    const leave = (e) => { if (e.target.closest && e.target.closest('.gsv-gcard')) setTimeout(() => gardenPopupClose(), 0); };
    el.addEventListener('click', leave);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') leave(e); });
  }
}
function _gdpopInGarden() { return typeof _gdp !== 'undefined' && !!_gdp.root && _gdp.root.isConnected && _gdpWorldView(); }
function gardenPopupOpen(tab, o) {
  o = o || {};
  const def = _GDPOP[tab];
  if (!def) return;
  if (!gardenEnsure()) return;
  if (tab === 'catch' && o.sub) { try { _gdG().prefs.catchTab = o.sub; } catch (e) { /* fine */ } }
  if (typeof _gw !== 'undefined') { _gw.keys.clear(); _gw.path = []; }
  gardenBubbleClose();
  if (typeof _gwFishBusy === 'function' && _gwFishBusy()) _gwFishCancel('');
  _gdpGhostClear();
  gardenPagerFresh();
  if (typeof gardenSfx === 'function') gardenSfx('open');
  openDialog({
    // a panel is as big as what is in it; the long lists keep a steady height so paging through them does not jump
    title: o.title || def.title, size: tab === 'goals' ? 'md' : 'xl', fixed: !['goals', 'basket'].includes(tab), height: ['goals', 'basket'].includes(tab) ? '' : '82vh', className: 'gd-popup gd-popup-' + tab, keepOnOutside: false,
    body(el) {
      el.classList.add('gd-body', 'gd-popup-body');
      _gdp.pop = { tab, el };
      def.fill(el, gardenModel());
    },
    onClose() {
      _gdp.pop = null;
      if (typeof gardenSfx === 'function') gardenSfx('close');
      if (_gdp.root && _gdp.root.isConnected) { const box = _gdp.root.querySelector('.gd-stagebox'); if (box) box.focus({ preventScroll: true }); _gdpRepaintSoon(); }
    },
  });
}
function _gdpRepaintSoon() { try { if (typeof gardenRepaintSoon === 'function') gardenRepaintSoon(); } catch (e) { /* later */ } }
function gardenPopupClose() {
  if (!_gdp.pop) return;
  _gdp.pop = null;
  try { if (typeof _dialogClose === 'function' && _dialogClose) _dialogClose(); } catch (e) { /* closed already */ }
}
/** Local identities survive a panel repaint; positions in a changing goods list
 * do not. New repeated controls can supply data-garden-action/section keys. */
function _gdpopMark(el) {
  for (const attr of ['data-garden-action', 'data-game', 'data-activity-return', 'data-focus-key', 'data-shop-item', 'data-shop-deal', 'data-garden-section', 'data-rid', 'data-uid', 'data-item', 'data-id', 'data-action', 'data-tab', 'data-shop-reveal', 'id', 'name']) {
    if (el.hasAttribute(attr)) return { attr, value: el.getAttribute(attr) };
  }
  return null;
}
function _gdpopWords(text) { return String(text || '').replace(/\s+/g, ' ').trim(); }
function _gdpopClasses(el) { return [...el.classList].filter(c => !/^(?:is-|has-)|^(?:active|chip-accent)$/.test(c)).sort().join(' '); }
function _gdpopPart(el) {
  const mark = _gdpopMark(el);
  if (mark) return { tag: el.tagName, mark };
  if (el.tagName === 'DETAILS') return { tag: 'DETAILS', cls: _gdpopClasses(el), summary: _gdpopWords(el.querySelector(':scope > summary')?.textContent) };
  return null;
}
function _gdpopPartIs(el, key) {
  if (el.tagName !== key.tag) return false;
  if (key.mark) return el.getAttribute(key.mark.attr) === key.mark.value;
  return key.cls ? _gdpopClasses(el) === key.cls : _gdpopWords(el.querySelector(':scope > summary')?.textContent) === key.summary;
}
function _gdpopFindPart(root, key) {
  const matches = [...root.querySelectorAll(key.mark ? '[' + key.mark.attr + ']' : 'details')].filter(el => _gdpopPartIs(el, key));
  return matches.length === 1 ? matches[0] : null;
}
function _gdpopFocusState(el, root) {
  if (!el || !root.contains(el)) return null;
  let scope = null;
  for (let p = el.parentElement; p && p !== root; p = p.parentElement) { scope = _gdpopPart(p); if (scope) break; }
  return { el, tag: el.tagName, type: el.getAttribute('type') || '', mark: _gdpopMark(el), scope, aria: el.getAttribute('aria-label') || '', words: _gdpopWords(el.textContent), cls: _gdpopClasses(el) };
}
function _gdpopCanFocus(el) { return !!(el && el.isConnected && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !el.closest('[hidden],[inert],[aria-hidden="true"]') && el.getClientRects().length); }
function _gdpopFindFocus(root, saved) {
  const scope = saved.scope ? _gdpopFindPart(root, saved.scope) : root;
  if (!scope) return null;   // the item/section went away: never choose its neighbour
  const controls = [...scope.querySelectorAll('button,input,textarea,select,summary,a[href],[role="button"],[tabindex]')].filter(el => el.tagName === saved.tag && (el.getAttribute('type') || '') === saved.type);
  const one = list => list.length === 1 && _gdpopCanFocus(list[0]) ? list[0] : null;
  if (saved.mark) return one(controls.filter(el => el.getAttribute(saved.mark.attr) === saved.mark.value));
  let match = saved.aria && one(controls.filter(el => el.getAttribute('aria-label') === saved.aria));
  if (!match && saved.words) match = one(controls.filter(el => _gdpopWords(el.textContent) === saved.words));
  // A price or progress label can change inside the same specifically keyed
  // item. Its unique action class/sole control is safe; a global index is not.
  if (!match && saved.scope && saved.cls) match = one(controls.filter(el => _gdpopClasses(el) === saved.cls));
  if (!match && saved.scope) match = one(controls);
  return match || null;
}
/** Refresh the actual model while retaining local focus, disclosures and scroll;
 * the existing editing guard leaves a live text/select interaction alone. */
function gardenPopupRefresh() {
  const P = _gdp.pop;
  if (!P) return;
  if (!P.el.isConnected) { _gdp.pop = null; return; }
  const ae = document.activeElement;
  if (ae && P.el.contains(ae) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) return;
  const scroller = P.el, y = scroller.scrollTop, x = scroller.scrollLeft, focus = _gdpopFocusState(ae, scroller);
  if (P.tab === 'tricks') return;   // the book has its own stage: it paints itself
  const details = [...scroller.querySelectorAll('details')].map(el => ({ key: _gdpopPart(el), open: el.open }));
  if (P.tab !== 'friends' && P.tab !== 'craft' && P.tab !== 'play') scroller.textContent = '';   // Play reconciles its connected keyed cards
  const def = _GDPOP[P.tab];
  if (P.tab === 'friends') { if (typeof gardenFriendsTabRepaint === 'function') gardenFriendsTabRepaint(); }
  else def.fill(scroller, gardenModel());
  if (_gdp.pop !== P || !scroller.isConnected) return;
  for (const saved of details) { const el = _gdpopFindPart(scroller, saved.key); if (el && el.open !== saved.open) el.open = saved.open; }
  scroller.scrollTop = y; scroller.scrollLeft = x;
  if (!focus) return;   // refreshing a panel never summons focus from elsewhere
  const current = document.activeElement;
  if (current === ae && _gdpopCanFocus(ae)) return;   // a retained control stayed put
  if (current && current !== ae && current !== document.body && current !== document.documentElement) return;   // the action/fill deliberately focused something else
  const close = scroller.closest('[role="dialog"]')?.querySelector('.modal-h button[aria-label="Close"]');
  const stage = _gdp.root && _gdp.root.querySelector('.gd-stagebox');
  const target = _gdpopFindFocus(scroller, focus) || (_gdpopCanFocus(close) ? close : _gdpopCanFocus(stage) ? stage : null);
  if (target) target.focus({ preventScroll: true });
}
/** A link between the garden's own pages: in the garden it is a pop-up, anywhere else the page. */
function gardenGoPage(view) {
  const mm = /^garden:(shop|almanac|basket|friends|catch|sail|craft)$/.exec(String(view || ''));
  if (mm && _gdpopInGarden()) { gardenPopupOpen(mm[1]); return; }
  if (view === 'garden' && _gdp.pop) { gardenPopupClose(); return; }
  setView(view);
}

