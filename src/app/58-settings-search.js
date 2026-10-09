/* Search metadata never renders an unopened group: those renderers can fetch
   data, start watchers, or consume a proposed change. New groups can provide
   search: [{ label, description, keywords, target, selector }] at registration.
   Row/card labels are tagged by the shared helpers for reliable navigation. */
const SETTINGS_SEARCH_CATALOG = {
  profile: [
    ['Name', 'Your first name, greetings and the app title.'],
    ['Icon', 'Choose the workspace icon, initial or emoji.', 'logo brand sidebar'],
    ['Your email addresses', 'The addresses used to recognise your own calendars.'],
    ['Currency', 'The currency used in Finances.', 'money dollars pounds euros USD GBP EUR'],
    ['Language and date format', 'Language, region and how dates are written.', 'locale English Deutsch Français Español'],
    ['Time zone', 'Dashboard time, home time zone and clock settings.'],
    ['Week starts on', 'Choose Monday, Sunday or Saturday for calendars.'],
    ['Working hours', 'Your work days and the hours used for planning.', 'schedule availability free time focus'],
    ['Your location', 'Device location or a chosen town for weather and nearby art.', 'city weather GPS geolocation manual automatic permissions'],
  ],
  appearance: [
    ['Theme', 'Light, dark or automatic colour theme.'],
    ['Task rows', 'Comfortable or compact task row spacing.', 'density'],
    ['Reduce motion', 'Keep interface animations to a minimum.', 'accessibility'],
    ['Default theme for new devices', 'The light or dark theme a new browser starts with.'],
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
    ['Auto-linking', 'Find the folders, repositories, meetings, emails and people related to tasks.'],
    ['Auto-attach confident links', 'Automatically attach links above your confidence threshold.'],
    ['Check with Claude', 'Have Claude check suggested links.'],
    ['Run every', 'How often auto-linking runs while the dashboard is open.', 'interval hours'],
    { label: 'Workspace folders', description: 'Add or browse folders to index for related files.', selector: '.al-add' },
    { label: 'Names only', description: 'Folders whose contents are never read or sent to Claude.', keywords: 'privacy secrets confidential exclusions', selector: '.al-names + .al-add' },
    { label: 'Index and review links', description: 'Index now, auto-link now, or review suggestions.', selector: '.al-runbtns' },
  ],
  suggestions: [
    ['Show suggestions', 'Ideas on Home, Today and the morning story.'],
    ['How many on Home', 'The maximum number of suggestions on Home.'],
    ['Working hours', 'Keep time suggestions inside your working hours.'],
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
    ['Moments', 'Arrival, departure and welcome-home cards.'],
    ['Weather where you are', 'Weather for your current city.'],
    ['Public holidays', 'Home country, region, calendar holidays and days off.'],
    ['Exchange rates', 'Use card payment rates or online exchange rates.'],
    ['Jet-lag tips', 'Timing tips after long flights.'],
    ['Let Claude see trips', 'Share the city and trip dates with Claude and MCP clients.', 'AI privacy'],
    ['Keep past trips', 'How long to keep past trip decisions.', 'history retention'],
    ['Trips', 'Open or forget trips and clear travel history.', 'delete forget all'],
  ],
  ai: [
    ['Assistant', 'Claude model for conversations and task chat.', 'Haiku Sonnet Opus'],
    ['Quick jobs', 'Claude model for suggestions, linking and tidy-ups.', 'Haiku Sonnet Opus'],
    ['Thinking effort', 'Low, medium or high reasoning effort.'],
    ['Tone and style', 'Extra instructions for every AI request.', 'prompt spelling concise'],
  ],
  brief: [
    ['Open on the first visit of the day', 'Bring Home forward with the daily greeting.', 'morning automatic opening'],
    ['Day in three sentences', 'A short daily summary written by Claude.', 'AI summary'],
    ['Model for summaries', 'Choose the Claude model for stories.', 'Haiku Sonnet Opus'],
    ['Offer “Finish the day” from', 'The hour to suggest the evening recap.', 'evening schedule'],
    ['Temperatures', 'Use Celsius or Fahrenheit.', 'weather units metric imperial'],
    ['AI day adviser', 'Review your day each morning, afternoon and evening.'],
    ['Try it', 'Preview Home, the morning story or Finish the day.'],
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
    ['Your year and month in OpenDash', 'Animated monthly and yearly recaps.', 'review summary export image'],
  ],
  notifications: [
    ['Show notifications', 'Allow desktop notifications in this browser.', 'permission reminders'],
    ['Morning summary', 'Daily count of tasks due today and overdue.', 'digest'],
    ['Before calendar events', 'How many minutes before events to remind you.', '5 10 15 30 lead time'],
    ['Test', 'Send a test desktop notification.'],
  ],
  data: [
    ['Data folder', 'Where your files live on this computer.'],
    ['Backups', 'Back up now, download or restore a saved copy.', 'automatic recovery'],
    ['Export and import', 'Move data to another computer or export JSON and Markdown.', 'zip tasks'],
    ['Share the app', 'Export a clean copy of the app for someone else.'],
    ['Reset app data', 'Start over after backing up the data folder.', 'delete erase clear'],
  ],
  server: [
    ['This server', 'Server status, version, restart, rebuild, stop or open the log.', 'port process uptime'],
    ['Start automatically when I log in', 'Start OpenDash when you sign in to Windows.', 'autostart startup'],
    ['Enable the Start server button', 'Let the offline banner start the server.'],
    ['Show an offline page', 'Keep the app page available when the server is stopped.', 'service worker cache'],
  ],
  updates: [
    ['OpenDash version', 'Check for updates and install a newer release.', 'upgrade GitHub'],
    ['Check once a day', 'Choose whether to check for updates automatically.'],
    ['This copy', 'How this app copy was installed and updated.', 'zip git'],
  ],
  diagnostics: [
    { label: 'Copy diagnostics', description: 'Copy system, app, connection and queue details for troubleshooting.', keywords: 'debug problems Node migrations', selector: '.set-btns' },
    { label: 'Recent server log', description: 'Read recent server messages.', keywords: 'errors debug', selector: '.set-log' },
  ],
  about: [
    { label: 'App and licences', description: 'Version, project, documentation and third-party licences.', keywords: 'MIT Inter Lucide ECharts GeoNames copyright open source', selector: '.kv' },
  ],
};
let _settingsSearchText = '';
let _settingsSearchPending = null;
const _settingsTravelOnly = new Set(['Notice trips from', 'Moments', 'Weather where you are', 'Public holidays', 'Exchange rates', 'Jet-lag tips', 'Let Claude see trips', 'Keep past trips', 'Trips']);

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
