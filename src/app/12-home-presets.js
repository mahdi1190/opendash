/* ============================================================
   HOME LAYOUT PRESETS (2.16). Owner: Home foundation.
   Four ready-made boards in Customise ("Layouts" in the edit bar, and the
   palette): Focused, Balanced, Everything and Fun. A preset is a curated list
   of widgets with sizes; applying it is ONE undoable layout save through the
   normal model (homeSaveLayout, 12-home.js): the preset's widgets shown in
   that order, every other widget hidden (so Add widget brings any back).
   A widget that is not on this build (it lands in another branch), is
   switched off (config features) or is unavailable is skipped. A slot may
   list several ids: the first one present is used. Fun also takes every
   widget registered in the 'fun' group.
     HOME_PRESETS                    the list (id, label, icon, text, widgets | all, groups)
     homePresetPlan(id) -> [{id, size}]   what the preset would show here (PURE on the registry)
     homePresetCurrent() -> id|null  the preset the board matches right now
     homeApplyPreset(id)             apply it (no-op when the board already matches)
     homePresetsMenu(anchor)         the popover: each preset with a mini board
   ============================================================ */
const HOME_PRESETS = Object.freeze([
  { id: 'focused', label: 'Focused', icon: 'target', text: 'Just today: your focus tasks and the day’s schedule. Nothing else to look at.',
    widgets: [['today', 'full'], ['focus', 'l'], ['schedule', 's']] },
  { id: 'balanced', label: 'Balanced', icon: 'layout-grid', text: 'Today, the week ahead, your review, who you’re waiting on, notes and money at a glance.',
    widgets: [['today', 'full'], ['focus', 'l'], ['schedule', 's'], ['week', 'l'], ['waiting', 's'], ['review', 'l'], ['spendable', 's'], ['capture', 'm'], ['notebook', 'm'], ['finance', 's'], ['people', 's'], ['countdowns', 's']] },
  { id: 'everything', label: 'Everything', icon: 'layers', text: 'Every widget on one board. Hide the ones you don’t need later.', all: true },
  // Widget ids: game (92-game-3ui.js, Level and streaks), the memories cards (12-home-w-seasonal / onthisday / garden / heatmap / funfact / reportcard.js).
  { id: 'fun', label: 'Fun', icon: 'party-popper', text: 'Your day with the playful side up: your level and streaks, the garden, the season and little surprises.',
    widgets: [['today', 'full'], ['seasonal', 'l'], ['game', 's'], ['onthisday', 'm'], ['garden', 'm'], ['heatmap', 'full'], ['funfact', 's'], ['reportcard', 's'],
      ['animday', 's'], ['focus', 'l'], ['habits', 's'], ['countdowns', 's']],
    groups: ['fun'] },
]);

function _hpAvail(id) {
  if (typeof homeWidgetDef !== 'function') return null;
  const d = homeWidgetDef(id);
  return d && d.copy === 1 && homeWidgetAvailable(d) ? d : null;
}
/** What preset `id` shows on this build: [{id, size}] in board order (empty when unknown). */
function homePresetPlan(id) {
  const p = HOME_PRESETS.find(x => x.id === id);
  if (!p || typeof homeWidgetCatalog !== 'function') return [];
  const out = [], used = new Set();
  const add = (ids, size) => {
    for (const wid of [].concat(ids)) {
      const d = _hpAvail(wid);
      if (!d || used.has(d.id)) continue;
      used.add(d.id);
      out.push({ id: d.id, size: homeClampSize(size || d.defaultSize, d.sizes, d.defaultSize) });
      return;
    }
  };
  const catalog = homeWidgetCatalog();
  if (p.all) for (const d of catalog) add(d.id, d.defaultSize);
  for (const [ids, size] of (p.widgets || [])) add(ids, size);
  for (const d of catalog) if ((p.groups || []).includes(d.group)) add(d.id, d.defaultSize);
  return out;
}
function _hpShown() { return homeLayout().widgets.filter(w => !w.hidden && homeWidgetAvailable(homeWidgetDef(w.id))).map(w => ({ id: w.id, size: w.size, ...(w.c ? { c: w.c } : {}) })); }   // a custom width is no longer the preset
function homePresetCurrent() {
  try {
    const now = JSON.stringify(_hpShown());
    const hit = HOME_PRESETS.find(p => { const plan = homePresetPlan(p.id); return plan.length && JSON.stringify(plan) === now; });
    return hit ? hit.id : null;
  } catch (e) { return null; }
}
function homeApplyPreset(id) {
  const p = HOME_PRESETS.find(x => x.id === id);
  const plan = homePresetPlan(id);
  if (!p || !plan.length) return false;
  if (homePresetCurrent() === id) { homeAnnounce(`Home already uses the ${p.label} layout`); return false; }   // re-selecting does nothing
  const used = new Set(plan.map(w => w.id));
  const rest = homeLayout().widgets.filter(w => !used.has(w.id)).map(w => ({ id: w.id, size: w.size, hidden: true }));
  return homeSaveLayout(plan.map(w => ({ id: w.id, size: w.size, hidden: false })).concat(rest),
    { toast: `Home now uses the ${p.label} layout`, say: `${p.label} layout: ${plan.length} widget${plan.length === 1 ? '' : 's'}` });
}

/** A tiny picture of the board: one bar per widget, as wide as its size (12 columns). */
function _hpMiniHtml(plan) {
  const cells = plan.slice(0, 14).map(w => `<i class="hp-cell" style="grid-column: span ${HOME_SIZE_COLS[w.size] || 12}"></i>`).join('');
  return `<span class="hp-mini" aria-hidden="true">${cells}${plan.length > 14 ? '<i class="hp-cell hp-more" style="grid-column: span 12"></i>' : ''}</span>`;
}
function homePresetsMenu(anchor) {
  return openPopover(anchor, (el, close) => {
    el.classList.add('hp-pop');
    const cur = homePresetCurrent();
    const h = document.createElement('div'); h.className = 'pop-label'; h.textContent = 'Start from a layout';
    el.appendChild(h);
    for (const p of HOME_PRESETS) {
      const plan = homePresetPlan(p.id);
      if (!plan.length) continue;
      const on = cur === p.id;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'hp-opt' + (on ? ' on' : '');
      b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.innerHTML = `<span class="hp-ic">${icon(p.icon)}</span><span class="hp-txt"><span class="hp-t">${esc(p.label)}${on ? `<span class="hp-now">${icon('check', 'i-xs')}In use</span>` : ''}</span>`
        + `<span class="hp-s">${esc(p.text)}</span>${_hpMiniHtml(plan)}<span class="hp-n">${plan.length} widget${plan.length === 1 ? '' : 's'}</span></span>`;
      b.onclick = () => { if (on) return; close(); homeApplyPreset(p.id); };
      el.appendChild(b);
    }
    const note = document.createElement('div'); note.className = 'hp-note';
    note.textContent = 'A layout replaces what is shown now. Undo puts your board back, and Add widget brings back anything hidden.';
    el.appendChild(note);
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const rows = [...el.querySelectorAll('.hp-opt')];
      const i = rows.indexOf(document.activeElement);
      e.preventDefault();
      rows[(i + (e.key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length].focus();
    });
  }, { role: 'menu', width: 360, align: 'center', className: 'hp-popover' });
}

// The palette (16-command-palette.js loads after the Home files: register once everything has run).
if (typeof setTimeout === 'function') setTimeout(() => {
  if (typeof registerCommand !== 'function') return;
  registerCommand({ id: 'home-layouts', label: 'Home layouts…', icon: 'layout-grid', keywords: 'home preset layout focused balanced everything fun widgets board',
    run: () => { homeEditStart(); setTimeout(() => { const b = document.querySelector('.home-editbar .heb-presets'); if (b) homePresetsMenu(b); }, 120); } });
  for (const p of HOME_PRESETS) {
    registerCommand({ id: 'home-layout-' + p.id, label: `Home layout: ${p.label}`, icon: p.icon, keywords: 'home preset layout widgets board ' + p.id,
      run: () => { if (state.view !== 'home') setView('home'); setTimeout(() => homeApplyPreset(p.id), 0); } });
  }
}, 0);
