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
/** The pop-up's content again, keeping where you had scrolled; not while you are typing in it. */
function gardenPopupRefresh() {
  const P = _gdp.pop;
  if (!P) return;
  if (!P.el.isConnected) { _gdp.pop = null; return; }
  const ae = document.activeElement;
  if (ae && P.el.contains(ae) && ['INPUT', 'TEXTAREA', 'SELECT'].includes(ae.tagName)) return;
  const scroller = P.el, y = scroller.scrollTop;
  if (P.tab === 'tricks') return;   // the book has its own stage: it paints itself
  if (P.tab !== 'friends' && P.tab !== 'craft') scroller.textContent = '';
  const def = _GDPOP[P.tab];
  if (P.tab === 'friends') { if (typeof gardenFriendsTabRepaint === 'function') gardenFriendsTabRepaint(); }
  else def.fill(scroller, gardenModel());
  scroller.scrollTop = y;
}
/** A link between the garden's own pages: in the garden it is a pop-up, anywhere else the page. */
function gardenGoPage(view) {
  const mm = /^garden:(shop|almanac|basket|friends|catch|sail|craft)$/.exec(String(view || ''));
  if (mm && _gdpopInGarden()) { gardenPopupOpen(mm[1]); return; }
  if (view === 'garden' && _gdp.pop) { gardenPopupClose(); return; }
  setView(view);
}

