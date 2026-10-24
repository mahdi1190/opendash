/* ============================================================
   LISTS: the palette's commands and places (owner: lists). Here and not in
   15-nav-smart-lists.js / 15-nav-custom.js because the palette's registers
   (16-command-palette.js) must exist first: the app is one script, run in
   file-name order.
   ============================================================ */
/* ---------- smart lists (15-nav-smart-lists.js) ---------- */
registerCommand({ id: 'smart-list-new', label: 'New smart list…', icon: 'list-plus', keywords: 'saved filter view custom list create', run: () => openSmartListEditor(null) });
registerCommand({ id: 'smart-list-save', label: 'Save this view as a smart list…', icon: 'list-plus', keywords: 'saved filter save view custom list', when: () => isTaskView(state.view), run: () => smartListFromView(state.view) });
registerPaletteSource((add, mode) => {
  if (mode && mode !== 'go') return;
  for (const sl of smartListsAll()) add({ group: 'Go to', icon: sl.icon || 'list-filter', label: sl.name, keywords: 'smart list ' + (sl.q || ''), hint: 'Smart list', run: () => openSmartList(sl.id) });
  add({ group: 'Go to', icon: 'target', label: 'What can I do now?', keywords: 'do now context energy time available next', hint: 'Do now', run: () => setView('now') });
  add({ group: 'Go to', icon: 'inbox', label: 'Inbox', keywords: 'inbox captured sort triage', run: () => setView('inbox') });
});

/* ---------- the customised sidebar (15-nav-custom.js) ---------- */
registerCommand({ id: 'sidebar-customise', label: 'Customise sidebar…', icon: 'sliders-horizontal', keywords: 'sidebar layout hide move rename pin sections navigation', run: () => openSidebarCustomiser() });
registerCommand({ id: 'sidebar-reset', label: 'Reset sidebar', icon: 'rotate-ccw', keywords: 'sidebar default layout restore', run: () => sbResetLayout() });
registerCommand({ id: 'sidebar-pin-view', label: () => (sbIsPinned(state.view) ? 'Unpin this view from the sidebar' : 'Pin this view to the sidebar'), icon: 'pin', keywords: 'pin sidebar top shortcut favourite',
  when: () => !!sbPinInfo(state.view, null) && state.view !== 'home', run: () => sbTogglePin(state.view) });
