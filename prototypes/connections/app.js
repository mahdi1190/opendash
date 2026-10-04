'use strict';

// A UI prototype: all connection records and operations stay in memory.
// No account API, credential, or live dashboard data is accessed here.
const extraIcons = {
  'wifi-off': '<path d="m2 2 20 20M8.5 16.5a5 5 0 0 1 7 0M12 20h.01M5 12a10 10 0 0 1 5-2.5M16 10a10 10 0 0 1 3 2M2 8a16 16 0 0 1 3-2M9 4a16 16 0 0 1 13 4"/>',
  pause: '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  play: '<path d="m7 4 13 8-13 8Z"/>',
  'lock-keyhole': '<rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V6a5 5 0 0 1 10 0v4M12 15v2"/>',
  'clock-3': '<circle cx="12" cy="12" r="9"/><path d="M12 7v5h5"/>',
  'arrow-up-right': '<path d="M7 17 17 7M7 7h10v10"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${extraIcons[name] || `<use href="../../vendor/icons/lucide-sprite.svg#i-${name}"></use>`}</svg>`;
const SERVICE_LOGOS = {
  gmail: './logos/gmail.svg',
  calendar: './logos/google-calendar.svg',
  outlook: './logos/outlook.png',
  claude: './logos/claude.svg',
  mcp: '../../assets/brand/logo-mark.svg',
};
function serviceMark(service, fallbackIcon = 'plug') {
  const src = SERVICE_LOGOS[service];
  return src ? `<img class="service-brand-image" src="${src}" alt="" width="28" height="28" decoding="async">` : icon(fallbackIcon, 'lg');
}
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const $ = selector => document.querySelector(selector);
const providers = [
  { id: 'gmail', name: 'Gmail', category: 'Email', logo: 'gmail', icon: 'mail', description: 'Turn the emails that matter into your next steps.', benefit: 'Email triage & tasks from email', account: 'personal@example.com', permissions: ['Read recent senders, subjects and previews', 'Suggest tasks for you to review'], blocked: 'Send, edit or delete messages' },
  { id: 'calendar', name: 'Google Calendar', category: 'Calendar', logo: 'calendar', icon: 'calendar-days', description: 'See your meetings and your to-dos in one place.', benefit: 'Events alongside your tasks', account: '3 calendars selected', permissions: ['Read event times, titles and attendees', 'Show meetings alongside your tasks'], blocked: 'Create, change or respond to events' },
  { id: 'outlook', name: 'Outlook Calendar', category: 'Calendar', logo: 'outlook', icon: 'calendar-days', description: 'Keep your work schedule in the picture, too.', benefit: 'Work meetings & meeting prep', account: 'work@example.com', permissions: ['Read event times, titles and attendees', 'Show work meetings alongside your tasks'], blocked: 'Create, change or respond to events' },
  { id: 'bank', name: 'Bank account', category: 'Finances', logo: 'bank', icon: 'landmark', description: 'A clearer view of where your money goes.', benefit: 'Transactions & your money brief', account: 'Everyday account · sample', permissions: ['Read transactions and balances', 'Build your spending overview locally'], blocked: 'Move money, pay bills or change your accounts' },
  { id: 'ical', name: 'Calendar link', category: 'Calendar', logo: 'ical', icon: 'link', description: 'Bring in any calendar with an iCal feed.', benefit: 'Calendar events, without Claude', account: 'Read-only calendar feed', permissions: ['Read events from your calendar feed', 'Show events alongside your tasks'], blocked: 'Create, change or respond to events' },
];
let connections = [];
let activeFilter = 'all';
let query = '';
let offline = false;
let assistantConnected = true;
let sceneVersion = 0;
let dialogVersion = 0;
let refreshing = false;
let dialogReturnFocus = null;
let toastTimer;
const dialog = $('#connection-dialog');
const busy = new Set();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const providerFor = source => providers.find(provider => provider.id === source.provider);
const makeSource = (provider, state = 'connected', extra = {}) => ({ id: provider, provider, state, lastSync: '2 min ago', ...extra });
const visibleState = source => source.state === 'paused' ? 'paused' : offline ? 'offline' : source.state;

function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(element => { element.innerHTML = icon(element.dataset.icon); });
  root.querySelectorAll('[data-service-logo]').forEach(element => { element.innerHTML = serviceMark(element.dataset.serviceLogo); });
}
function notify(message) {
  clearTimeout(toastTimer);
  $('#toast').innerHTML = icon('circle-check') + `<span>${escapeText(message)}</span>`;
  $('#toast').classList.add('show');
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4200);
}
function status(source) {
  const state = visibleState(source);
  const labels = { connected: 'Connected', attention: 'Needs sign-in', paused: 'Paused', offline: 'Offline' };
  return `<span class="status-badge ${state === 'offline' ? 'neutral' : state}">${icon(state === 'connected' ? 'check' : state === 'attention' ? 'circle-alert' : state === 'paused' ? 'pause' : 'wifi-off', 'sm')}${labels[state]}</span>`;
}
function setScenario(name) {
  sceneVersion++;
  busy.clear();
  refreshing = false;
  offline = name === 'offline';
  assistantConnected = name !== 'empty';
  connections = name === 'empty' ? [] : [makeSource('gmail'), makeSource('calendar', 'connected', { calendars: [true, true, true] }), makeSource('outlook', name === 'healthy' ? 'connected' : 'attention', { name: 'Work calendar' })];
  activeFilter = 'all'; query = ''; $('#connection-search').value = '';
  $('#scenario').value = name;
  if (dialog.open) dialog.close();
  render();
}
function renderOverview() {
  const connected = connections.filter(source => visibleState(source) === 'connected').length;
  const attention = connections.filter(source => visibleState(source) === 'attention' || visibleState(source) === 'offline').length;
  const paused = connections.filter(source => source.state === 'paused').length;
  $('#overview').innerHTML = `<div class="overview-item"><span class="overview-icon green">${icon('circle-check')}</span><span class="overview-value">${connected}</span><span class="overview-label">Connected</span></div><span class="overview-divider"></span><div class="overview-item"><span class="overview-icon ${attention ? 'amber' : 'green'}">${icon(attention ? 'circle-alert' : 'check')}</span><span class="overview-value">${attention}</span><span class="overview-label">Need attention</span></div><span class="overview-divider"></span><div class="overview-item overview-note"><span class="overview-icon purple">${icon(offline ? 'wifi-off' : 'shield-check')}</span><div><strong>${offline ? 'Your dashboard still works offline' : paused ? `${paused} connection${paused === 1 ? '' : 's'} paused` : 'You’re in control'}</strong><span class="overview-label">${offline ? 'Saved data stays available on your computer.' : 'Connect, pause or remove at any time.'}</span></div></div>`;
  $('#count-all').textContent = connections.length;
  $('#count-connected').textContent = connected;
  $('#count-attention').textContent = attention;
  document.querySelectorAll('[data-filter]').forEach(button => {
    const selected = button.dataset.filter === activeFilter;
    button.classList.toggle('active', selected); button.setAttribute('aria-pressed', String(selected));
  });
}
function sourceCard(source) {
  const provider = providerFor(source);
  const state = visibleState(source);
  const isBusy = busy.has(source.id);
  const action = state === 'attention' ? 'reconnect' : state === 'paused' ? 'resume' : 'sync';
  const actionLabel = isBusy ? 'Checking…' : state === 'attention' ? 'Reconnect' : state === 'paused' ? 'Resume' : state === 'offline' ? 'Retry' : 'Sync now';
  const note = state === 'attention' ? `<div class="connection-note attention-note">${icon('circle-alert', 'sm')}<span>Your sign-in expired. Reconnect to bring in new data.</span></div>` : state === 'offline' ? `<div class="connection-note">${icon('wifi-off', 'sm')}<span>Unable to check right now. Your saved data is still here.</span></div>` : state === 'paused' ? `<div class="connection-note">${icon('pause', 'sm')}<span>New data is paused. Everything you already brought in stays.</span></div>` : `<div class="connection-note">${icon(provider.icon, 'sm')}<span>${escapeText(provider.benefit)}</span></div>`;
  return `<article class="connection-card ${state === 'attention' ? 'needs-attention' : state === 'paused' ? 'is-paused' : ''}" data-connection="${escapeText(source.id)}"><div class="connection-card-top"><span class="service-logo ${provider.logo}">${serviceMark(provider.logo, provider.icon)}</span>${status(source)}<button class="icon-button card-menu" data-action="manage" data-id="${escapeText(source.id)}" aria-label="Manage ${escapeText(source.name || provider.name)}">${icon('ellipsis')}</button></div><div class="connection-title"><h3>${escapeText(source.name || provider.name)}</h3><span class="connection-provider">${source.name ? escapeText(provider.name) : escapeText(provider.category)}</span></div><p class="connection-description">${escapeText(provider.description)}</p><div class="connection-account">${icon(source.provider === 'calendar' || source.provider === 'ical' ? 'calendar-days' : 'user-round', 'sm')}<span>${escapeText(source.provider === 'calendar' ? `${(source.calendars || [true, true, true]).filter(Boolean).length} calendars selected` : provider.account)}</span><span class="permission-tag">${icon('lock-keyhole', 'sm')}Read-only</span></div>${note}<div class="connection-card-footer"><span class="sync-time">${icon('clock-3', 'sm')}${state === 'attention' ? 'Last synced yesterday' : state === 'paused' ? 'Sync paused' : state === 'offline' ? 'Showing saved status' : `Synced ${escapeText(source.lastSync)}`}</span><button class="button ${state === 'attention' ? 'attention-button' : 'ghost'} small" data-action="${action}" data-id="${escapeText(source.id)}" ${isBusy ? 'disabled' : ''}>${icon(isBusy ? 'loader-circle' : state === 'attention' ? 'arrow-right' : state === 'paused' ? 'play' : 'refresh-cw')}${actionLabel}</button></div></article>`;
}
function suggestionCard() {
  const hasBank = connections.some(source => source.provider === 'bank');
  return `<article class="connection-card suggestion-card"><div class="connection-card-top"><span class="service-logo ${hasBank ? 'ical' : 'bank'}">${icon(hasBank ? 'plus' : 'landmark', 'lg')}</span><span class="suggestion-label">${hasBank ? 'MAKE IT YOURS' : 'A LITTLE MORE CLARITY'}</span></div><h3>${hasBank ? 'There’s room for more.' : 'Your money, in the picture.'}</h3><p class="connection-description">${hasBank ? 'Another mailbox, a shared calendar, or a calendar link. Bring in what makes your day easier.' : 'Connect a bank to see transactions, spending and your money brief, all in one place.'}</p><div class="suggestion-tags"><span>${icon('shield-check', 'sm')}Read-only</span><span>${icon('hard-drive', 'sm')}Local data</span></div><div class="connection-card-footer"><button class="button secondary small" data-action="${hasBank ? 'add' : 'setup-bank'}">${icon('plus')}${hasBank ? 'Add connection' : 'Connect a bank'}</button>${hasBank ? '' : '<button class="button ghost small" data-action="csv-info">Or use a CSV<span data-icon="arrow-right"></span></button>'}</div></article>`;
}
function renderCards() {
  const focused = document.activeElement;
  const focusAction = focused && focused.dataset.action;
  const focusId = focused && focused.dataset.id;
  const grid = $('#connection-grid');
  const results = connections.filter(source => {
    const provider = providerFor(source);
    const state = visibleState(source);
    return (activeFilter === 'all' || activeFilter === 'connected' && state === 'connected' || activeFilter === 'attention' && ['attention', 'offline'].includes(state)) && `${source.name || ''} ${provider.name} ${provider.category} ${provider.account}`.toLowerCase().includes(query.toLowerCase());
  });
  if (!connections.length && !query && activeFilter === 'all') {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon('plug', 'lg')}</span><h3>A fresh start, at your pace.</h3><p>OpenDash already works on its own. Connect your first account whenever you’re ready.</p><button class="button primary" data-action="add">${icon('plus')}Add your first connection</button><button class="button ghost small" data-action="csv-info">Start with a CSV instead${icon('arrow-right')}</button></div>`;
  } else if (!results.length) {
    grid.innerHTML = `<div class="empty-state"><span class="empty-icon">${icon(activeFilter === 'attention' && !query ? 'circle-check' : 'search', 'lg')}</span><h3>${activeFilter === 'attention' && !query ? 'All clear. You’re good to go.' : 'No connections found.'}</h3><p>${activeFilter === 'attention' && !query ? 'None of your connections need attention.' : 'Try another search or view all your connections.'}</p><button class="button secondary" data-action="clear-filters">Show all connections</button></div>`;
  } else {
    grid.innerHTML = results.map(sourceCard).join('') + (activeFilter === 'all' && !query ? suggestionCard() : '');
  }
  paintIcons(grid);
  $('#results-status').textContent = `${results.length} connection${results.length === 1 ? '' : 's'} shown.`;
  if (focusAction && focusId) {
    Array.from(grid.querySelectorAll('[data-action]')).find(button => button.dataset.action === focusAction && button.dataset.id === focusId)?.focus({ preventScroll: true });
  }
}
function render() {
  renderOverview(); renderCards();
  $('#assistant-status').className = 'status-badge ' + (assistantConnected ? 'connected' : 'neutral');
  $('#assistant-status').textContent = assistantConnected ? 'Connected' : 'Not set up';
  $('#assistant-button').innerHTML = (assistantConnected ? 'Manage assistant' : 'Set up assistant') + icon('arrow-right');
  document.querySelectorAll('.capability .icon').forEach(element => { element.innerHTML = `<use href="../../vendor/icons/lucide-sprite.svg#i-${assistantConnected ? 'check' : 'lock'}"></use>`; });
  $('#refresh-button').disabled = refreshing;
  $('#refresh-button').innerHTML = icon(refreshing ? 'loader-circle' : 'refresh-cw') + (refreshing ? 'Checking…' : 'Check status');
}
function showDialog({ eyebrow = 'ADD A CONNECTION', title, subtitle, body }) {
  if (!dialog.open) {
    const opener = document.activeElement;
    dialogReturnFocus = { element: opener, action: opener.dataset.action, source: opener.dataset.id };
  }
  dialogVersion++;
  $('#dialog-eyebrow').textContent = eyebrow;
  $('#dialog-title').textContent = title;
  $('#dialog-subtitle').textContent = subtitle || '';
  $('#dialog-body').innerHTML = body;
  paintIcons($('#dialog-body'));
  if (!dialog.open) dialog.showModal();
  else $('#dialog-close').focus({ preventScroll: true });
}
function addConnection() {
  showDialog({ title: 'What would you like to bring in?', subtitle: 'Connect what helps. You can add more than one of each.', body: `<div class="provider-grid">${providers.map(provider => `<button class="provider-option" data-action="choose-provider" data-provider="${provider.id}"><span class="provider-icon service-logo ${provider.logo}">${serviceMark(provider.logo, provider.icon)}</span><span class="provider-copy"><strong>${provider.name}</strong><span>${provider.category === 'Finances' ? 'Transactions & spending' : provider.benefit}</span></span><span class="provider-tag">${icon('arrow-right')}</span></button>`).join('')}</div><div class="setup-notice">${icon('shield-check')}<span>No passwords in OpenDash. Real sign-in would happen with your provider. This preview only simulates setup.</span></div>` });
}
function setupProvider(providerId, reconnectId) {
  const provider = providers.find(item => item.id === providerId);
  if (!provider) return;
  showDialog({ eyebrow: reconnectId ? 'RECONNECT YOUR ACCOUNT' : 'YOU CHOOSE THE ACCESS', title: reconnectId ? `Reconnect ${provider.name}` : `Connect ${provider.name}`, subtitle: 'Here’s exactly what this connection is for.', body: `<div class="setup-summary"><span class="service-logo ${provider.logo}">${serviceMark(provider.logo, provider.icon)}</span><div><strong>${provider.name}</strong><p>${provider.benefit}</p></div><span class="permission-tag">Read-only</span></div><div class="setup-permissions"><h3>OpenDash can</h3>${provider.permissions.map(permission => `<div class="permission-row"><span class="permission-icon">${icon('check')}</span><span class="permission-copy">${permission}</span></div>`).join('')}<h3>OpenDash can never</h3><div class="permission-row blocked"><span class="permission-icon">${icon('lock-keyhole')}</span><span class="permission-copy">${provider.blocked}</span></div></div>${reconnectId ? '' : `<div class="form-field"><label for="connection-name">Connection name <span>(optional)</span></label><input id="connection-name" maxlength="60" placeholder="${provider.name}" autocomplete="off"></div>`}${providerId === 'ical' && !reconnectId ? '<div class="form-field"><label for="calendar-url">Calendar feed URL</label><input id="calendar-url" type="url" placeholder="https://example.com/calendar.ics" autocomplete="off" aria-describedby="url-error"><span id="url-error" class="field-error" role="alert"></span></div>' : ''}<div class="setup-notice">${icon('flask-conical')}<span>This is a simulated connection. No sign-in opens and no account data is fetched.</span></div><div class="dialog-actions"><button class="button secondary" data-action="add">${icon('arrow-left')}Back</button><button class="button primary" data-action="confirm-connect" data-provider="${providerId}" ${reconnectId ? `data-id="${escapeText(reconnectId)}"` : ''}>${reconnectId ? 'Simulate reconnect' : 'Simulate connection'}${icon('arrow-right')}</button></div>` });
}
async function connectProvider(button) {
  if (button.disabled) return;
  if (offline) { notify('Offline preview: choose Everyday setup to try connecting.'); return; }
  const provider = providers.find(item => item.id === button.dataset.provider);
  const feed = $('#calendar-url');
  if (feed) {
    try { if (!['https:', 'http:', 'webcal:'].includes(new URL(feed.value).protocol)) throw new Error(); }
    catch { $('#url-error').textContent = 'Enter a complete https:// or webcal:// calendar link.'; feed.setAttribute('aria-invalid', 'true'); feed.focus(); return; }
    feed.removeAttribute('aria-invalid'); $('#url-error').textContent = '';
  }
  const name = $('#connection-name')?.value.trim();
  const operationVersion = sceneVersion, flowVersion = dialogVersion;
  button.disabled = true; button.innerHTML = icon('loader-circle') + 'Connecting…';
  await sleep(850);
  if (operationVersion !== sceneVersion || flowVersion !== dialogVersion || !dialog.open) return;
  const existing = connections.find(source => source.id === button.dataset.id);
  if (existing) { existing.state = 'connected'; existing.lastSync = 'just now'; }
  else connections.push(makeSource(provider.id, 'connected', { id: `${provider.id}-${Date.now()}`, lastSync: 'just now', ...(name ? { name } : {}), ...(provider.id === 'calendar' ? { calendars: [true, true, true] } : {}) }));
  activeFilter = 'all'; query = ''; $('#connection-search').value = ''; render();
  showDialog({ eyebrow: 'ALL SET · SIMULATED', title: `${provider.name} is connected.`, subtitle: 'A little less switching starts here.', body: `<div class="confirm-state"><span class="confirm-icon">${icon('circle-check')}</span><h3>${provider.benefit}</h3><p>In the real app, your next sync would bring this account into your dashboard. You can manage access or pause it at any time.</p></div><div class="dialog-actions"><button class="button secondary" data-action="add">Connect something else</button><button class="button primary" data-action="close-dialog">Done${icon('check')}</button></div>` });
}
function manageSource(id) {
  const source = connections.find(item => item.id === id);
  if (!source) return;
  const provider = providerFor(source);
  const calendars = source.provider === 'calendar' ? `<div class="setup-permissions"><h3>Calendars included</h3>${['Personal', 'Family', 'Holidays'].map((name, index) => `<div class="permission-row"><span class="permission-copy">${name}</span><button class="calendar-switch" role="switch" aria-label="Include ${name} calendar" aria-checked="${(source.calendars || [true, true, true])[index]}" data-action="toggle-calendar" data-id="${escapeText(id)}" data-index="${index}"><span></span></button></div>`).join('')}</div>` : '';
  showDialog({ eyebrow: 'YOUR CONNECTION', title: source.name || provider.name, subtitle: provider.account, body: `<div class="setup-summary"><span class="service-logo ${provider.logo}">${serviceMark(provider.logo, provider.icon)}</span><div><strong>${provider.name}</strong><p>${provider.benefit}</p></div>${status(source)}</div><div class="form-field"><label for="rename-connection">Display name</label><input id="rename-connection" maxlength="60" value="${escapeText(source.name || provider.name)}"><button class="button ghost small" data-action="rename" data-id="${escapeText(id)}">Save name${icon('check')}</button></div>${calendars}<div class="setup-notice">${icon('shield-check')}<span>Read-only access. OpenDash can never ${provider.blocked.charAt(0).toLowerCase() + provider.blocked.slice(1)}. Removing this connection keeps the data you already imported.</span></div><div class="dialog-actions"><button class="button danger" data-action="remove-confirm" data-id="${escapeText(id)}">${icon('trash-2')}Remove</button><button class="button secondary" data-action="${source.state === 'paused' ? 'resume' : 'pause'}" data-id="${escapeText(id)}">${icon(source.state === 'paused' ? 'play' : 'pause')}${source.state === 'paused' ? 'Resume connection' : 'Pause connection'}</button></div>` });
}
async function syncSource(id) {
  const source = connections.find(item => item.id === id);
  if (!source || busy.has(id)) return;
  if (offline) { notify('Still offline. Your saved data is available; new syncs can wait.'); return; }
  const version = sceneVersion;
  busy.add(id); renderCards();
  await sleep(800);
  if (version !== sceneVersion) return;
  busy.delete(id);
  const current = connections.find(item => item.id === id);
  if (!current || current.state !== 'connected' || offline) { render(); return; }
  current.lastSync = 'just now'; render();
  notify(`${current.name || providerFor(current).name} synced. This was a simulated check.`);
}
async function checkStatus(button) {
  if (refreshing) return;
  const version = sceneVersion;
  refreshing = true; render(); await sleep(900);
  if (version !== sceneVersion) return;
  refreshing = false; render();
  notify(offline ? 'Still offline. Your dashboard works with the data already saved.' : connections.some(source => source.state === 'attention') ? 'Status checked. One account needs sign-in.' : 'Status checked. No sign-in issues found.');
}
function accessInfo() {
  showDialog({ eyebrow: 'CONNECTED, ON YOUR TERMS', title: 'A connection is an invitation to read.', subtitle: 'You decide what comes in, and when.', body: `<div class="setup-permissions"><div class="permission-row"><span class="permission-icon">${icon('eye')}</span><div class="permission-copy"><strong>Account sources are read-only</strong><p>Calendar and email connections can look things up. Bank sources can read transactions. They cannot send mail, change events or move money.</p></div></div><div class="permission-row"><span class="permission-icon">${icon('hard-drive')}</span><div class="permission-copy"><strong>Your dashboard data stays local</strong><p>Imported data is saved on your computer. Optional account syncs and AI features contact the services you choose.</p></div></div><div class="permission-row"><span class="permission-icon">${icon('sliders-horizontal')}</span><div class="permission-copy"><strong>AI tools have their own permissions</strong><p>The OpenDash MCP can read and change dashboard tasks. In the real app, those changes appear with an Undo button. This is separate from read-only account sources.</p></div></div></div><div class="dialog-actions"><button class="button primary" data-action="close-dialog">Got it${icon('check')}</button></div>` });
}
function assistantInfo() {
  showDialog({ eyebrow: 'AN OPTIONAL HELPING HAND', title: assistantConnected ? 'Claude is ready when you are.' : 'Meet your dashboard assistant.', subtitle: 'Connected through Claude Code on your computer.', body: `<div class="setup-summary"><span class="service-logo claude">${serviceMark('claude')}</span><div><strong>Claude Code</strong><p>Smart suggestions, task chat & meeting prep</p></div><span class="status-badge ${assistantConnected ? 'connected' : 'neutral'}">${assistantConnected ? 'Connected' : 'Not set up'}</span></div><ol class="setup-steps"><li class="setup-step"><span class="step-number">1</span><span>Install Claude Code and sign in with your own Claude account.</span></li><li class="setup-step"><span class="step-number">2</span><span>OpenDash checks the connection on this computer.</span></li><li class="setup-step"><span class="step-number">3</span><span>Ask for a hand. Review proposed dashboard changes before applying them.</span></li></ol><div class="setup-notice">${icon('flask-conical')}<span>This prototype won’t install software or open a sign-in window.</span></div><div class="dialog-actions"><button class="button secondary" data-action="close-dialog">Close</button><button class="button primary" data-action="toggle-assistant">${assistantConnected ? 'Simulate disconnect' : 'Simulate connect'}</button></div>` });
}
function mcpInfo() {
  showDialog({ eyebrow: 'FOR YOUR AI TOOLS', title: 'Take your dashboard into Claude.', subtitle: 'OpenDash MCP connects AI tools to your local dashboard.', body: `<div class="setup-summary"><span class="service-logo mcp">${serviceMark('mcp')}</span><div><strong>OpenDash MCP</strong><p>23 tools · prototype sample</p></div><span class="status-badge connected">Installed</span></div><div class="setup-permissions"><h3>Choose an app</h3><div class="permission-row"><span class="permission-copy"><strong>Claude Code / T3 Code</strong><p>Install the local OpenDash server in your AI app’s MCP settings.</p></span></div><div class="permission-row"><span class="permission-copy"><strong>Claude Desktop</strong><p>Add the local server to Claude Desktop’s configuration, then restart Claude.</p></span></div></div><div class="setup-notice">${icon('info')}<span>The current Connections page provides commands specific to this computer. This preview does not change your AI configuration.</span></div><div class="dialog-actions"><button class="button primary" data-action="close-dialog">Done${icon('check')}</button></div>` });
}
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action, id = button.dataset.id;
  const source = connections.find(item => item.id === id);
  if (action === 'add') addConnection();
  else if (action === 'choose-provider') setupProvider(button.dataset.provider);
  else if (action === 'setup-bank') setupProvider('bank');
  else if (action === 'confirm-connect') await connectProvider(button);
  else if (action === 'close-dialog') dialog.close();
  else if (action === 'manage') manageSource(id);
  else if (action === 'sync') await syncSource(id);
  else if (action === 'reconnect' && source) setupProvider(source.provider, id);
  else if (action === 'pause' || action === 'resume') {
    if (!source) return;
    if (action === 'pause') { source.resumeState = source.state; source.state = 'paused'; }
    else { source.state = source.resumeState || 'connected'; delete source.resumeState; }
    render();
    if (dialog.open) dialog.close(); notify(`${source.name || providerFor(source).name} ${action === 'pause' ? 'paused' : 'resumed'}.`);
  } else if (action === 'rename' && source) {
    source.name = $('#rename-connection').value.trim() || providerFor(source).name;
    render(); notify('Display name saved for this preview.');
  } else if (action === 'toggle-calendar' && source) {
    source.calendars ||= [true, true, true];
    const index = Number(button.dataset.index);
    source.calendars[index] = !source.calendars[index];
    button.setAttribute('aria-checked', String(source.calendars[index])); render();
  } else if (action === 'remove-confirm' && source) {
    showDialog({ eyebrow: 'REMOVE CONNECTION', title: `Remove ${source.name || providerFor(source).name}?`, subtitle: 'Previously imported data stays in your dashboard.', body: `<div class="setup-notice">${icon('info')}<span>OpenDash would stop reading from this connection. You can add it again whenever you want. This removes only a sample record.</span></div><div class="dialog-actions"><button class="button secondary" data-action="manage" data-id="${escapeText(id)}">Keep connection</button><button class="button danger" data-action="remove" data-id="${escapeText(id)}">Remove connection</button></div>` });
  } else if (action === 'remove' && source) {
    connections = connections.filter(item => item.id !== id); dialog.close(); render(); notify('Sample connection removed.');
  } else if (action === 'clear-filters') {
    activeFilter = 'all'; query = ''; $('#connection-search').value = ''; render();
  } else if (action === 'csv-info') {
    showDialog({ eyebrow: 'A SIMPLE WAY TO START', title: 'Bring your own bank export.', subtitle: 'No bank connection or assistant needed.', body: `<ol class="setup-steps"><li class="setup-step"><span class="step-number">1</span><span>Download a CSV transaction export from your bank.</span></li><li class="setup-step"><span class="step-number">2</span><span>Open Finances in your dashboard and choose Import CSV.</span></li><li class="setup-step"><span class="step-number">3</span><span>Review and import. Your transactions stay on your computer.</span></li></ol><div class="setup-notice">${icon('flask-conical')}<span>No files are imported in this prototype. The current app already supports CSV import.</span></div><div class="dialog-actions"><button class="button primary" data-action="close-dialog">Got it${icon('check')}</button></div>` });
  } else if (action === 'toggle-assistant') {
    if (offline && !assistantConnected) { notify('Offline preview: choose Everyday setup to try connecting.'); return; }
    assistantConnected = !assistantConnected; render(); dialog.close(); notify('Assistant state updated for this preview.');
  } else if (action === 'mcp-settings') mcpInfo();
  else if (action === 'test-mcp') {
    const version = sceneVersion;
    button.disabled = true; button.innerHTML = icon('loader-circle') + 'Testing…'; await sleep(750);
    button.disabled = false; button.textContent = 'Test connection';
    if (version === sceneVersion) notify(offline ? 'Offline preview: the sample connection could not be checked.' : 'OpenDash MCP answered with 23 tools. Simulated test passed.');
  }
});
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; render(); }));
$('#connection-search').addEventListener('input', event => { query = event.target.value; renderCards(); });
$('#scenario').addEventListener('change', event => setScenario(event.target.value));
$('#refresh-button').addEventListener('click', checkStatus);
$('#dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  dialogVersion++;
  if (dialog.open || !dialogReturnFocus) return;
  const { element, action, source } = dialogReturnFocus;
  const restored = element.isConnected ? element : Array.from(document.querySelectorAll('[data-action]')).find(button => button.dataset.id === source && button.dataset.action === action)
    || (source && Array.from(document.querySelectorAll('[data-action="manage"]')).find(button => button.dataset.id === source))
    || $('#refresh-button');
  restored.focus({ preventScroll: true });
});
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
$('#theme-toggle').addEventListener('click', () => {
  const dark = document.body.dataset.theme !== 'dark';
  document.body.dataset.theme = dark ? 'dark' : 'light';
  $('#theme-toggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  $('#theme-toggle').innerHTML = icon(dark ? 'sun' : 'moon');
});
$('#privacy-button').addEventListener('click', accessInfo);
$('#assistant-button').addEventListener('click', assistantInfo);
$('#help-button').addEventListener('click', () => showDialog({ eyebrow: 'A BETTER CONNECTIONS PAGE', title: 'Try it. It’s all sample data.', subtitle: 'An interactive design prototype for OpenDash.', body: `<div class="setup-permissions"><div class="permission-row">${icon('search')}<span class="permission-copy">Search connections and filter by status.</span></div><div class="permission-row">${icon('plug')}<span class="permission-copy">Try adding, reconnecting, pausing and removing a sample connection.</span></div><div class="permission-row">${icon('sliders-horizontal')}<span class="permission-copy">Use “Try a state” at the bottom to explore a fresh setup or offline experience.</span></div></div><div class="setup-notice">${icon('shield-check')}<span>This preview does not contact account services or change your real dashboard. Reloading restores the sample setup. Sidebar links open the current app.</span></div><div class="dialog-actions"><button class="button primary" data-action="close-dialog">Let’s take a look${icon('arrow-right')}</button></div>` }));
document.addEventListener('keydown', event => {
  if (event.key === '/' && !dialog.open && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#connection-search').focus(); }
});
paintIcons();
setScenario('everyday');
