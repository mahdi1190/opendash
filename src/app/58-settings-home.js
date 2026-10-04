/* ============================================================
   SETTINGS > HOME (integrator, 4 Oct). One place for the Home board's own
   switches: Customise / Add widget, the Suggestions panel on Home (the day's
   hero at the top is Settings > Home and stories), Hide amounts, and a link to the working hours every time widget
   uses. Everything here goes through the Home platform's own helpers
   (homeSaveLayout: one undo step; homeSetAmountsHidden: a UI key), so
   Customise, the assistants' set_home_layout and this page always agree.
   Loads after 57-settings.js (registerSettingsGroup).
   ============================================================ */
function _setHomeShown(id) {
  const w = typeof homeLayout === 'function' ? homeLayout().widgets.find(x => x.id === id) : null;
  return !!(w && !w.hidden);
}
/** Show or hide a widget in its own slot (not at the end, as Add widget does): one undo step. */
function _setHomeToggle(id, on) {
  const def = typeof homeWidgetDef === 'function' ? homeWidgetDef(id) : null;
  if (!def) return;
  const next = homeLayout().widgets.map(w => (w.id === id ? Object.assign({}, w, { hidden: !on }) : w));
  homeSaveLayout(next, { toast: `${def.title} ${on ? 'shown on' : 'hidden from'} Home`, say: `${def.title} ${on ? 'shown' : 'hidden'}` });
  render();
}
registerSettingsGroup({
  id: 'home', title: 'Home', icon: 'house', order: 44,
  description: 'Your Home board: which panels it shows, hidden amounts, and the working hours the time widgets plan around.',
  render(el) {
    if (typeof homeLayout !== 'function') { el.textContent = 'Home is not available in this build.'; return; }
    const shown = homeLayout().widgets.filter(w => !w.hidden && homeWidgetAvailable(homeWidgetDef(w.id))).length;
    const more = homeWidgetCatalog().filter(d => homeWidgetAvailable(d) && !_setHomeShown(d.id)).length;
    const btns = document.createElement('div'); btns.className = 'set-btns';
    const cust = document.createElement('button'); cust.type = 'button'; cust.className = 'btn btn-secondary btn-sm';
    cust.innerHTML = icon('layout-grid', 'i-sm') + '<span>Customise Home</span>';
    cust.onclick = () => homeEditStart();
    const add = document.createElement('button'); add.type = 'button'; add.className = 'btn btn-ghost btn-sm';
    add.innerHTML = icon('plus', 'i-sm') + '<span>Add a widget</span>';
    add.onclick = () => homeEditStart({ gallery: true });
    btns.append(cust, add);
    el.appendChild(_settingsRow('Widgets', `${shown} on Home${more ? `, ${more} more in Add widget` : ''}. Drag, resize, hide or add them in Customise.`, btns));
    if (homeWidgetDef('suggest')) {
      el.appendChild(_settingsRow('Suggestions on Home', 'One-click ideas: the button opens the normal editor filled in, the small ✓ does it at once with Undo. More in Settings > Suggestions.',
        _settingsSwitch(_setHomeShown('suggest'), 'Suggestions on Home', (on) => _setHomeToggle('suggest', on))));
    }
    if (typeof homeSetAmountsHidden === 'function') {
      el.appendChild(_settingsRow('Hide amounts', 'Blurs money on Home (Money, Payday & safe to spend) until you point at it. Handy when sharing your screen.',
        _settingsSwitch(homeAmountsHidden(), 'Hide amounts', (on) => { homeSetAmountsHidden(on); render(); })));
    }
    if (typeof homeWorkHours === 'function') {
      const wk = homeWorkHours();
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = (wk.days || []).join(',') === '1,2,3,4,5' ? 'Mon–Fri' : (wk.days || []).map(d => names[d]).join(', ');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn btn-ghost btn-sm';
      b.innerHTML = `<span>${esc(`${days} ${wk.start}–${wk.end}`)}</span>` + icon('arrow-right');
      b.onclick = () => setView('settings:profile');
      el.appendChild(_settingsRow('Working hours', 'The hero\'s free time, Fill the gap, Plan my day and the time suggestions use these.', b));
    }
  },
});
