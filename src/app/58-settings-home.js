/* ============================================================
   SETTINGS > HOME (integrator, 4 Oct). One place for the Home board's own
   switches: Customise / Add widget, the Suggestions panel on Home (the day's
   hero at the top is Settings > Brief and stories), Hide amounts, and the
   working hours every time widget uses (since 2.18 their one control). Everything here goes through the Home platform's own helpers
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
  description: 'What Home shows and when you work.',
  render(el) {
    if (typeof homeLayout !== 'function') { el.appendChild(emptyLine('Home isn’t part of this copy of OpenDash.')); return; }
    const shown = homeLayout().widgets.filter(w => !w.hidden && homeWidgetAvailable(homeWidgetDef(w.id))).length;
    const more = homeWidgetCatalog().filter(d => homeWidgetAvailable(d) && !_setHomeShown(d.id)).length;
    const btns = document.createElement('div'); btns.className = 'set-btns';
    btns.append(uiButton({ label: 'Customise Home', icon: 'layout-grid', iconCls: 'i-sm', size: 'sm', run: () => homeEditStart() }),
      uiButton({ label: 'Add a widget', icon: 'plus', iconCls: 'i-sm', kind: 'ghost', size: 'sm', run: () => homeEditStart({ gallery: true }) }));
    el.appendChild(_settingsRow('Widgets', `${shown} on Home${more ? `, ${more} more in Add widget` : ''}. Drag, resize, hide or add them in Customise.`, btns));
    if (homeWidgetDef('suggest')) {
      el.appendChild(_settingsRow('Suggestions on Home', 'One-click ideas on Home. More in Settings > Suggestions.',
        _settingsSwitch(_setHomeShown('suggest'), 'Suggestions on Home', (on) => _setHomeToggle('suggest', on))));
    }
    if (typeof homeSetAmountsHidden === 'function') {
      el.appendChild(_settingsRow('Hide amounts', 'Blurs money on Home until you point at it.',
        _settingsSwitch(homeAmountsHidden(), 'Hide amounts', (on) => { homeSetAmountsHidden(on); render(); })));
    }
    // Working hours: their one control (SIMPLIFY_PLAN.md L12); other pages link here (planSettingsWorkHoursLink).
    if (typeof planSettingsWorkHoursRow === 'function') el.appendChild(planSettingsWorkHoursRow());
  },
});
