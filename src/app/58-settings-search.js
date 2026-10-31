/* Search metadata never renders an unopened group: those renderers can fetch
   data, start watchers, or consume a proposed change. New groups can provide
   search: [{ label, description, keywords, target, selector }] at registration.
   Row/card labels are tagged by the shared helpers for reliable navigation.
   2.18 (SIMPLIFY_PLAN.md 6): Sync, Data, Diagnostics, Server and Updates carry
   their own search: arrays at registration, so they have no keys here. A row
   that moved into a More / Advanced fold keeps its entry (search opens the fold),
   and a renamed row keeps its old words as keywords. */
const SETTINGS_SEARCH_CATALOG = {
  // Region & language (was Name & region): the Name row moved to Profile, the Icon to Appearance.
  profile: [
    ['Your email addresses', 'The addresses used to recognise your own calendars.'],
    ['Currency', 'The currency used in Finances.', 'money dollars pounds euros USD GBP EUR'],
    ['Language and date format', 'Language, region and how dates are written.', 'locale English Deutsch Français Español'],
    ['Time zone', 'Dashboard time, home time zone and clock settings.'],
    ['Week starts on', 'Choose Monday, Sunday or Saturday for calendars.'],
    ['Working hours', 'Your work days and the hours used for planning (set in Settings > Home).', 'schedule availability free time focus'],
    ['Your location', 'Device location or a chosen town for weather and nearby art.', 'city weather GPS geolocation manual automatic permissions'],
  ],
  appearance: [
    ['Theme', 'Light, dark or automatic colour theme.'],
    ['Task rows', 'Comfortable or compact task row spacing.', 'density'],
    ['Reduce motion', 'Keep interface animations to a minimum.', 'accessibility'],
    ['App icon', 'Choose the workspace icon, initial or emoji.', 'icon logo brand sidebar browser tab'],
    ['Theme for a new browser', 'The light or dark theme a new browser starts with.', 'default theme for new devices'],
  ],
  tasks: [
    ['Open tasks and events in', 'Choose the centre card or side panel.'],
    ['Scene header', 'Show the animated scene in task and event cards.'],
    ['Panel and window sizes', 'Resize panels or reset their saved sizes.', 'sidebar assistant calendar dialogs drawers'],
  ],
  streams: [
    { label: 'Manage streams', description: 'Rename, recolour, reorder and archive task streams.', keywords: 'color colour symbol shape', selector: '.set-list' },
    { label: 'Add a stream', description: 'Create another area for your tasks.', selector: '.set-add' },
    ['New tasks go to', 'The default stream when the current view does not imply one.'],
  ],
  templates: [
    { label: 'Quick-add templates', description: 'Starter title, stream, tags, priority, date and repeat schedule.', selector: '.set-tpls' },
    ['Full task templates', 'Saved tasks with their subtasks and notes.'],
  ],
  home: [
    ['Widgets', 'Customise Home, add widgets, drag, resize or hide panels.'],
    ['Suggestions on Home', 'Show one-click ideas on the Home board.'],
    ['Hide amounts', 'Blur money until you point at it.', 'privacy screen sharing finances'],
    ['Working hours', 'The hours used by free time, focus and planning widgets.'],
  ],
  autolink: [
    ['Auto-linking', 'Find the folders, repositories, meetings, emails and people related to tasks.', 'status last run'],
    ['Auto-attach confident links', 'Automatically attach links above your confidence threshold.'],
    ['Check with Claude', 'Have Claude check suggested links.'],
    ['Run every', 'How often auto-linking runs while Freeflo is open.', 'interval hours'],
    { label: 'Workspace folders', description: 'Add or browse folders to index for related files.', selector: '.al-add' },
    { label: 'Never read', description: 'Folders whose contents are never read or sent to Claude.', keywords: 'names only privacy secrets confidential exclusions', selector: '.al-names + .al-add' },
    { label: 'Auto-link now', description: 'Run auto-linking now, or review the suggested links.', keywords: 'review suggestions run', selector: '.al-runbtns' },
    ['Index now', 'Index your workspace folders again now.', 'index rebuild refresh status'],
  ],
  suggestions: [
    ['Show suggestions', 'Ideas on Home, Today and the morning story.'],
    ['How many on Home', 'The maximum number of suggestions on Home.'],
    ['Working hours', 'Keep time suggestions inside your working hours (set in Settings > Home).'],
    ['Which ideas', 'Turn each kind of suggestion on or off.', 'rules switches areas'],
    ['Muted and dismissed', 'Reset suggestions hidden by Not now or Fewer like this.', 'reset hidden'],
    ['Counts', 'View or reset suggestion usage counts.'],
  ],
  time: [
    ['Dashboard time', 'Follow this computer or keep the home time zone.', 'automatic local timezone'],
    ['Home time zone', 'Where you live; used by money days and home time.', 'timezone'],
    ['Clock', 'Choose 12-hour or 24-hour times.', 'AM PM format'],
    ['Second clock', 'Local and home time in the top bar while away.'],
    ['Meetings', 'Show your time, home time and other people’s time.'],
    ['Travel features', 'Notice trips and show local time, weather and tips.'],
    ['Notice trips from', 'Time zone, calendar flights, card payments and browser location.'],
    ['Use this browser’s location', 'Notice trips from this browser’s location; only the nearest city is kept.', 'browser location geolocation'],
    ['Moments', 'Arrival, departure and welcome-home cards.'],
    ['Weather where you are', 'Weather for your current city.'],
    ['Public holidays', 'Home country, region, calendar holidays and days off.'],
    ['Exchange rates', 'Use card payment rates or online exchange rates.'],
    ['Jet-lag tips', 'Timing tips after long flights.'],
    ['Let Claude see trips', 'Share your city and trip dates with Claude and your AI apps.', 'AI privacy MCP clients'],
    ['Keep past trips', 'How long to keep past trip decisions.', 'history retention'],
    ['Trips', 'Open or forget a trip.', 'delete forget'],
    ['Forget all travel history', 'Clear trips and time-zone history, and turn travel off.', 'delete forget all reset clear'],
  ],
  ai: [
    ['Assistant', 'Claude model for conversations and task chat.', 'Haiku Sonnet Opus'],
    ['Quick jobs', 'Claude model for suggestions, linking and tidy-ups.', 'Haiku Sonnet Opus'],
    ['Thinking effort', 'Low, medium or high reasoning effort.'],
    ['Tone and style', 'Extra instructions for every AI request.', 'prompt spelling concise'],
    ['Models for each job', 'Choose the Claude model for each job that has its own.', 'Haiku Sonnet Opus model for summaries story script'],
    ['Money brief', 'The Claude model that words the money brief and story.', 'money wording finances Haiku Sonnet Opus'],
    ['Morning summary', 'The Claude model for the day in three sentences.', 'model for summaries brief Haiku Sonnet Opus'],
    ['Story script', 'The Claude model that writes the story narration.', 'model for the story script inflections Haiku Sonnet Opus'],
    ['Checking links', 'The Claude model that checks suggested links.', 'auto-link judge Haiku Sonnet'],
    ['Scene suggestions', 'The model that suggests scenes for event titles.', 'animations unmatched titles Haiku'],
  ],
  brief: [
    ['Open on the first visit of the day', 'Bring Home forward with the daily greeting.', 'morning automatic opening'],
    ['Day in three sentences', 'A short daily summary written by Claude.', 'AI summary'],
    ['Offer “Finish the day” from', 'The hour to suggest the evening recap.', 'evening schedule'],
    ['Temperatures', 'Use Celsius or Fahrenheit.', 'weather units metric imperial'],
    ['AI day adviser', 'Review your day each morning, afternoon and evening.'],
    ['Try it', 'Preview Home, the morning story or Finish the day.'],
    ['Read it out', 'Read morning stories, evening recaps and weekly reviews aloud.', 'narration speech audio mute'],
    ['Browser voice', 'Choose the free voice and ElevenLabs fallback.', 'speech Windows local voice'],
    ['Weekly review opens as', 'The full-screen story or the step-by-step page.', 'week story page'],
    ['Narration voice', 'Use the free browser voice or connect ElevenLabs.', 'speech eleven labs audio API key'],
    ['ElevenLabs voice', 'Connect your account and choose an eligible voice.', 'voice ID API key custom'],
    ['ElevenLabs connection', 'Save or remove the API key for your account.', 'eleven labs API key account connect'],
    ['Speech model', 'Economical Flash or expressive Eleven v3 narration.', 'inflections tone pauses'],
    ['Use ElevenLabs for', 'Use one voice for every spoken moment, or save allowance with highlights.', 'intro end of day recap all voice'],
    ['Monthly character limit', 'Cap newly generated speech and fall back to the browser voice.', 'free budget credits quota allowance'],
    ['This month', 'See how much narration allowance remains.', 'usage budget'],
    ['Try ElevenLabs', 'Listen to a short voice sample.', 'preview test audio'],
  ],
  animations: [
    { label: 'Animation gallery', description: 'Browse, search, preview, favourite, block or pin animations.', keywords: 'pack season technique old new originals', selector: '.apg' },
    { label: 'Animation theme', description: 'Choose the drawing style for every animation.', selector: '.apg-theme-row' },
    ['A different theme each day', 'Rotate through animation themes.'],
    ['Your birthday', 'Play a birthday opening and sky on your birthday.'],
    ['Regional animations (UK)', 'Use nearby places for regional backgrounds.'],
    { label: 'My animations', description: 'Describe and create your own animations.', selector: '.apg-mine' },
    ['Animate anyway', 'Override this device’s reduced-motion request.'],
    ['Intensity', 'Off, subtle, standard or playful motion.'],
    ['Opening', 'The opening animation on every load, daily or off.', 'welcome intro logo'],
    ['Animations', 'Animate weather, scenes and moving text.'],
    ['Celebrate completed tasks', 'Small celebrations when you finish a task.', 'confetti'],
    ['Your keyword rules', 'Match words in titles to animation scenes.'],
    ['Set by hand', 'Scenes chosen manually for particular tasks or events.'],
    ['Unmatched titles', 'Ask Claude to suggest scenes for unmatched events.'],
    { label: 'Achievements', description: 'Earn animation rewards for using your dashboard.', selector: '#ach-panel' },
    ['Your year and month in Freeflo', 'Animated monthly and yearly recaps.', 'review summary export image'],
  ],
  notifications: [
    ['Show notifications', 'Allow desktop notifications in this browser.', 'permission reminders'],
    ['Morning summary', 'Daily count of tasks due today and overdue.', 'digest'],
    ['Before calendar events', 'How many minutes before events to remind you.', '5 10 15 30 lead time'],
    { label: 'Send a test', description: 'Send a test desktop notification.', keywords: 'test', target: 'Show notifications' },
  ],
  advanced: [
    ['Your own sign-in apps', 'For IT teams and developers: your own Microsoft or Google app for signing in.', 'client id application entra azure google cloud oauth developer it'],
    ['Advanced: use your own Microsoft app', 'Enter the application (client) ID of your own Microsoft Entra app.', 'outlook hotmail office 365 client id'],
    ['Advanced: use your own Google app', 'Enter the client ID and secret of your own Google app.', 'gmail google workspace client id secret json'],
  ],
  about: [
    { label: 'App and licences', description: 'Version, project, documentation and third-party licences.', keywords: 'MIT Inter Lucide ECharts GeoNames Open-Meteo weather copyright open source', selector: '.kv' },
  ],
};
let _settingsSearchText = '';
let _settingsSearchPending = null;
const _settingsTravelOnly = new Set(['Notice trips from', 'Use this browser’s location', 'Moments', 'Weather where you are', 'Public holidays', 'Exchange rates', 'Jet-lag tips', 'Let Claude see trips', 'Keep past trips', 'Trips', 'Forget all travel history']);

function settingsSearchQuery() { return _settingsSearchText.trim(); }
function settingsSearchClear() { _settingsSearchText = ''; _settingsSearchPending = null; }
function settingsSearchNormalize(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function settingsSearchEntries() {
  const entries = [];
  for (const group of SETTINGS_GROUPS) {
    entries.push({ group: group.id, groupTitle: group.title, icon: group.icon, label: group.title, description: group.description || 'Open these settings.', overview: true });
    const rows = [...(SETTINGS_SEARCH_CATALOG[group.id] || []), ...(typeof group.search === 'function' ? group.search() : group.search || [])];
    if (group.id === 'suggestions' && typeof sgRules === 'function') {
      for (const rule of sgRules()) rows.push({ label: rule.title, description: rule.description || '', keywords: rule.area || '' });
    }
    if (group.id === 'animations' && typeof animPacks === 'function') {
      for (const pack of animPacks()) rows.push({ label: pack.name, target: pack.name + ' ·', description: pack.description || 'Enable this animation pack.', keywords: 'pack' });
    }
    for (const row of rows) {
      const entry = Array.isArray(row) ? { label: row[0], description: row[1], keywords: row[2] || '' } : row;
      entries.push(Object.assign({ group: group.id, groupTitle: group.title, icon: group.icon, target: entry.label }, entry));
    }
  }
  if (typeof connOpen === 'function') {
    for (const [id, label, description, keywords] of [
      ['', 'Connections', 'Manage connected accounts, assistants and data sources.', 'integrations accounts sign in OAuth'],
      ['claude', 'AI assistants', 'Connect Claude or choose another assistant.', 'AI model provider'],
      ['email', 'Email connections', 'Connect mail accounts and manage email sources.', 'Gmail Outlook inbox'],
      ['calendar', 'Calendar connections', 'Connect calendar accounts and sources.', 'Google Outlook events meetings'],
      ['money', 'Money connections', 'Connect banks or import financial data.', 'bank finance CSV'],
    ]) entries.push({ group: 'connections', groupTitle: 'Connections', label, description, keywords, icon: 'plug', run: () => connOpen(id) });
    if (typeof spotifySetup === 'function') entries.push({ group: 'connections', groupTitle: 'Connections', label: 'Spotify', description: 'Link Spotify to search music, show top artists on your card and send friends songs.', keywords: 'music songs playlist albums artists listen friends premium client id', icon: 'music', run: () => { connOpen('spotify'); spotifySetup(); } });
    if (typeof googleHealthConnectionSetup === 'function') entries.push({ group: 'connections', groupTitle: 'Connections', label: 'Google Health', description: 'Connect activity and sleep from Google Health and Fitbit.', keywords: 'fitness wellness steps OAuth integration', icon: 'heart', run: () => { connOpen('google-health'); googleHealthConnectionSetup(); } });
  }
  return entries;
}
function settingsSearchFind(query) {
  const normal = settingsSearchNormalize(query);
  if (!normal) return [];
  const terms = normal.split(' ');
  return settingsSearchEntries().map((entry, order) => {
    const label = settingsSearchNormalize(entry.label);
    const text = settingsSearchNormalize([entry.groupTitle, entry.label, entry.description, entry.keywords].join(' '));
    if (!terms.every(term => text.includes(term))) return null;
    const score = (label === normal ? 100 : label.startsWith(normal) ? 70 : label.includes(normal) ? 50 : 0)
      + terms.filter(term => label.includes(term)).length * 8 + (entry.overview ? -1 : 0);
    return { entry, score, order };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.order - b.order).map(item => item.entry);
}
function settingsSearchOpen(entry) {
  if (entry.run) { settingsSearchClear(); entry.run(); return; }
  _settingsSearchText = '';
  _settingsSearchPending = Object.assign({ at: Date.now() }, entry);
  const view = 'settings:' + entry.group;
  if (state.view === view) renderMain(); else setView(view);
}

function settingsSearchBar(main, paintGroup) {
  const bar = document.createElement('div'); bar.className = 'set-search';
  const label = document.createElement('label'); label.className = 'set-search-field';
  label.innerHTML = icon('search');
  const input = document.createElement('input'); input.type = 'search'; input.className = 'set-search-input';
  input.id = 'settings-search'; input.setAttribute('aria-label', 'Search all settings'); input.placeholder = 'Search all settings';
  input.autocomplete = 'off'; input.value = _settingsSearchText;
  if (settingsSearchQuery()) input.setAttribute('aria-controls', 'settings-search-results');
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'btn-icon btn-sm set-search-clear';
  clear.innerHTML = icon('x'); clear.setAttribute('aria-label', 'Clear settings search');
  const paint = () => {
    clear.hidden = !input.value;
    if (settingsSearchQuery()) { input.setAttribute('aria-controls', 'settings-search-results'); settingsSearchResults(main); }
    else { input.removeAttribute('aria-controls'); paintGroup(); }
  };
  input.oninput = () => { _settingsSearchText = input.value; _settingsSearchPending = null; paint(); };
  clear.onclick = () => { settingsSearchClear(); input.value = ''; paint(); input.focus(); };
  input.onkeydown = (e) => {
    if (e.key === 'Escape' && input.value) { e.preventDefault(); e.stopPropagation(); clear.click(); }
    if (e.key === 'ArrowDown' && settingsSearchQuery()) { e.preventDefault(); main.querySelector('.set-search-result')?.focus(); }
    if (e.key === 'Enter' && settingsSearchQuery()) { e.preventDefault(); main.querySelector('.set-search-result')?.click(); }
  };
  clear.hidden = !input.value;
  label.appendChild(input); bar.append(label, clear);
  return bar;
}
function settingsSearchResults(main) {
  const results = settingsSearchFind(_settingsSearchText);
  main.replaceChildren();
  const head = document.createElement('div'); head.className = 'set-page-h';
  const title = document.createElement('h2'); title.textContent = 'Search results';
  const count = document.createElement('p'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
  count.textContent = results.length ? `${results.length} ${results.length === 1 ? 'result' : 'results'} across all settings` : `No settings found for “${_settingsSearchText.trim()}”`;
  head.append(title, count); main.appendChild(head);
  const list = document.createElement('div'); list.className = 'set-search-results'; list.id = 'settings-search-results';
  if (!results.length) {
    const hint = document.createElement('p'); hint.className = 'set-search-empty'; hint.textContent = 'Try a setting name or a word like theme, notifications, location or backups.'; list.appendChild(hint);
  }
  for (const entry of results) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'set-search-result';
    const mark = document.createElement('span'); mark.className = 'set-search-result-icon'; mark.innerHTML = icon(entry.icon || 'settings'); mark.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span'); text.className = 'set-search-result-text';
    const path = document.createElement('span'); path.className = 'set-search-result-path'; path.textContent = 'Settings › ' + entry.groupTitle;
    const label = document.createElement('span'); label.className = 'set-search-result-label'; label.textContent = entry.label;
    const description = document.createElement('span'); description.className = 'set-search-result-description'; description.textContent = entry.description || '';
    text.append(path, label, description); button.append(mark, text); button.onclick = () => settingsSearchOpen(entry);
    button.onkeydown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); const sibling = e.key === 'ArrowDown' ? button.nextElementSibling : button.previousElementSibling;
        if (sibling) sibling.focus(); else if (e.key === 'ArrowUp') document.getElementById('settings-search')?.focus();
      }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); document.getElementById('settings-search')?.focus(); }
    };
    list.appendChild(button);
  }
  main.appendChild(list);
}

function settingsSearchTarget(body, entry) {
  if (entry.selector) return body.querySelector(entry.selector);
  const target = settingsSearchNormalize(entry.target || entry.label);
  const nodes = [...body.querySelectorAll('[data-setting-label]')];
  return nodes.find(n => settingsSearchNormalize(n.dataset.settingLabel) === target)
    || nodes.find(n => settingsSearchNormalize(n.dataset.settingLabel).startsWith(target + ' '));
}
function settingsSearchReveal(body) {
  const entry = _settingsSearchPending;
  if (!entry || entry.group !== body.dataset.group || Date.now() - entry.at > 5000) return;
  let observer = null, timeout = null;
  const finish = () => { if (observer) observer.disconnect(); if (timeout) clearTimeout(timeout); };
  const focus = (target) => {
    finish(); _settingsSearchPending = null;
    for (let parent = target.parentElement; parent && parent !== body; parent = parent.parentElement) if (parent.tagName === 'DETAILS') parent.open = true;
    target.classList.add('set-search-hit'); target.tabIndex = -1;
    target.setAttribute('aria-label', target.getAttribute('aria-label') || entry.label);
    target.scrollIntoView({ block: 'center', behavior: 'instant' }); target.focus({ preventScroll: true });
    setTimeout(() => target.classList.remove('set-search-hit'), 3600);
  };
  const attempt = () => {
    if (!body.isConnected || _settingsSearchPending !== entry) { finish(); return true; }
    if (entry.overview) { focus(body); return true; }
    const target = settingsSearchTarget(body, entry);
    if (target) { focus(target); return true; }
    if (entry.group === 'time' && _settingsTravelOnly.has(entry.label) && !(APP_CONFIG.travel && APP_CONFIG.travel.on)) {
      const toggle = settingsSearchTarget(body, { label: 'Travel features' });
      if (toggle) { focus(toggle); toast('Turn on Travel features to see “' + entry.label + '”.', { kind: 'info' }); return true; }
    }
    return false;
  };
  requestAnimationFrame(() => {
    if (attempt()) return;
    observer = new MutationObserver(attempt); observer.observe(body, { childList: true, subtree: true });
    timeout = setTimeout(() => { if (body.isConnected && _settingsSearchPending === entry) focus(body); else finish(); }, 4000);
  });
}

/* The command palette (Ctrl+K) reaches every setting too ("dark", "backups",
   "notifications"...): the same entries as this search, in a Settings group
   that shows when you type (16-command-palette.js registerPaletteSource). */
if (typeof registerPaletteSource === 'function') registerPaletteSource((add, mode) => {
  if (mode !== '' && mode !== 'cmd') return;
  let entries = [];
  try { entries = settingsSearchEntries(); } catch (e) { return; }
  // A group's own page that is already a "Go to" command (Server, Diagnostics...) is listed once.
  const known = new Set(PALETTE_COMMANDS.filter(c => typeof c.label === 'string').map(c => c.label.toLowerCase()));
  for (const entry of entries) {
    if (!entry || !entry.label) continue;
    if (entry.overview && known.has(String(entry.label).toLowerCase())) continue;
    add({
      group: 'Settings', icon: entry.icon || 'settings', label: entry.label,
      hint: entry.overview ? 'Settings' : 'Settings › ' + entry.groupTitle,
      keywords: [entry.groupTitle, entry.keywords, entry.description].filter(Boolean).join(' '),
      run: () => settingsSearchOpen(entry),
    });
  }
});
