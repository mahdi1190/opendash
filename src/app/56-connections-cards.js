/* Connections page cards. Uses the existing Sources actions and permissions.
   Account names, messages and server identities are always escaped or text. */
const _connPageAccountOpen = new Set();

function _connPageSourceState(s) {
  return s.enabled === false ? 'off' : s.demo ? 'demo' : (s.health && (s.health.connectionState || s.health.state)) || 'unknown';
}
function _connPageSourceNeedsReconnect(s) {
  const h = s.health || {}, st = _connPageSourceState(s);
  const code = h.code || (s.lastCheck && !s.lastCheck.ok && s.lastCheck.code) || (s.lastError && s.lastError.code);
  return (st === 'auth' || st === 'setup') && !['TOOL_MISSING', 'TIMEOUT', 'CLI_TIMEOUT', 'NETWORK', 'NETWORK_ERROR', 'RATE_LIMIT', 'RATE_LIMITED'].includes(code);
}
function _connPageToolsReady(s) {
  const check = s.lastCheck;
  return !!(check && check.ok && check.level === 'tools' && (!s.lastSync || Date.parse(check.at) > Date.parse(s.lastSync)));
}
function _connPageSourceService(s) {
  if (s.kind === 'microsoft') return 'outlook';
  if (s.kind !== 'mcp') return null;
  const server = String(s.server || '').toLowerCase();
  if (s.preset === 'gmail' || /\bgmail\b/.test(server)) return 'gmail';
  if (s.preset === 'google-calendar' || /google[\s_-]*calendar|calendar[\s_-]*google/.test(server)) return 'calendar';
  if (/outlook|microsoft[\s_-]*365|office[\s_-]*365/.test(server)) return 'outlook';
  return null;
}
function _connPageSourceMark(s) {
  const fallback = s.kind === 'csv' ? 'file-spreadsheet' : s.kind === 'ical' ? 'link' : s.capability === 'bank' ? 'landmark' : s.capability === 'calendar' ? 'calendar-days' : 'mail';
  return _connMark(_connPageSourceService(s), fallback);
}
function _connPageAccountCaption(s) {
  const accounts = Array.isArray(s.accounts) ? s.accounts : [];
  if (s.kind === 'csv') return 'Your bank’s CSV export';
  if (accounts.length) {
    const n = accounts.filter(a => a.enabled !== false).length;
    const word = s.capability === 'calendar' ? 'calendar' : s.capability === 'email' ? 'mailbox' : 'account';
    return `${n} of ${accounts.length} ${word}${accounts.length === 1 ? '' : 's'} selected`;
  }
  if (s.kind === 'ical') return s.urlHint || 'Read-only calendar feed';
  if (s.kind === 'microsoft') return 'Microsoft browser sign-in · read-only';
  return s.server || 'Read-only account source';
}
function _connPageSourceDescription(s) {
  if (s.demo) return 'Sample data to explore the dashboard. No account is read or synced.';
  if (s.kind === 'csv') return 'Bring in a bank export without connecting an account.';
  if (s.kind === 'ical') return 'Bring calendar events alongside your tasks, without Claude.';
  if (s.capability === 'bank') return 'Transactions and balances for your spending overview and money brief.';
  if (s.capability === 'calendar') return 'See your calendar events and your tasks in one place.';
  return 'Recent senders, subjects and previews for email triage and tasks.';
}
function _connPageSourceHelp(s) {
  if (s.kind === 'microsoft') { microsoftConnectionSetup(); return; }
  if (s.kind === 'mcp' && /^claude\.ai /.test(s.server || '') && typeof connCloudSignIn === 'function') {
    connCloudSignIn(s); return;
  }
  openDrawer({
    title: `Reconnect ${s.label}`, width: 520,
    body: (el, closeD) => {
      const message = s.health && s.health.message;
      if (message) el.appendChild(_connEl('p', 'conn-note', String(message).replace(/:\s*open Connections( to connect it)?\.?$/i, '.')));
      el.appendChild(_srcFixHelp(s));
      if (s.health && s.health.from === 'claude') {
        el.appendChild(_connBtn('Connect Claude first', 'sparkles', 'btn-primary', () => { closeD(); connOpen('claude'); }));
      }
      const sync = _connBtn('Sync now', 'refresh-cw', 'btn-secondary', () => {
        if (SourcesStore.busy[s.id]) return;
        closeD(); _srcSync(s);
      });
      sync.disabled = !!SourcesStore.busy[s.id] || s.enabled === false || !!s.demo;
      el.appendChild(sync);
    },
  });
}
async function _connPageResumeSource(s) {
  if (SourcesStore.busy[s.id]) return;
  SourcesStore.busy[s.id] = true;
  renderMain();
  try { await _srcUpdate(s, { enabled: true }, `${s.label} resumed`); }
  finally { delete SourcesStore.busy[s.id]; if (state.view === 'connections') renderMain(); }
}
function _connPageSourceAccounts(s, busy) {
  const accounts = Array.isArray(s.accounts) ? s.accounts : [];
  if (!accounts.length || s.kind === 'csv') return null;
  const kind = s.capability === 'calendar' ? 'calendars' : s.capability === 'email' ? 'mailboxes' : 'accounts';
  const details = _connEl('details', 'cp-accounts');
  details.open = _connPageAccountOpen.has(s.id);
  details.ontoggle = () => { if (details.open) _connPageAccountOpen.add(s.id); else _connPageAccountOpen.delete(s.id); };
  details.appendChild(_connEl('summary', null, `Choose ${kind} (${accounts.length})`));
  const list = _connEl('div', 'src-accounts cp-account-options');
  for (const a of accounts) {
    const on = a.enabled !== false;
    const button = _connEl('button', 'src-acc' + (on ? '' : ' off'));
    button.type = 'button';
    button.setAttribute('role', 'switch');
    button.setAttribute('aria-checked', String(on));
    button.setAttribute('aria-label', `Include ${a.name || a.id}`);
    button.dataset.account = a.id;
    button.setAttribute('data-tip', on ? 'Read on every sync. Click to switch off.' : 'Not read. Click to switch on.');
    const colour = SRC_SWATCHES.includes(a.colour) ? a.colour : SRC_SWATCHES.includes(s.colour) ? s.colour : 'slate';
    button.append(_connEl('span', 'dot c-' + colour), _connEl('span', null, a.name || a.id));
    button.disabled = busy || !!s.demo;
    button.onclick = () => {
      if (SourcesStore.busy[s.id] || s.demo) return;
      button.disabled = true;
      _srcSetAccount(s, a, !on);
    };
    list.appendChild(button);
  }
  details.appendChild(list);
  return details;
}

function _connPageSourceCard(s) {
  const st = _connPageSourceState(s), busy = !!SourcesStore.busy[s.id];
  const card = _connEl('article', 'cp-source-card st-' + st + (st === 'off' ? ' is-paused' : ''));
  card.dataset.source = s.id;
  card.dataset.conn = s.id;
  card.dataset.cap = s.capability;
  const head = _connEl('div', 'cp-card-top');
  const mark = _connEl('span', 'cp-service-mark'); mark.innerHTML = _connPageSourceMark(s);
  const pill = _srcPill(st); pill.classList.add('cp-card-status');
  if (st === 'off') pill.textContent = 'Paused';
  else if (s.kind === 'csv' && st === 'ok') { pill.textContent = 'Manual import'; pill.className = 'status off cp-card-status'; }
  else if (st === 'ok' && _connPageToolsReady(s)) pill.textContent = 'Tools ready';
  const more = _connEl('button', 'btn-icon btn-sm cp-card-menu'); more.type = 'button';
  more.setAttribute('aria-label', 'Manage ' + s.label); more.innerHTML = icon('ellipsis');
  more.disabled = busy;
  more.onclick = (event) => { event.stopPropagation(); if (!SourcesStore.busy[s.id]) _srcMenu(more, s); };
  head.append(mark, pill, more);
  card.appendChild(head);

  const title = _connEl('div', 'cp-card-title');
  const capLabel = s.capability === 'bank' ? 'Finances' : s.capability === 'calendar' ? 'Calendar' : 'Email';
  title.append(_connEl('h3', null, s.label), _connEl('span', 'cp-card-category', capLabel));
  card.append(title, _connEl('p', 'cp-description', _connPageSourceDescription(s)));

  const account = _connEl('div', 'cp-account-line');
  const accountIcon = _connEl('span', 'cp-account-icon'); accountIcon.innerHTML = icon(s.kind === 'csv' ? 'file-spreadsheet' : s.capability === 'calendar' ? 'calendar-days' : 'user-round', 'i-xs');
  const permission = _connEl('span', 'cp-readonly cp-permission-tag');
  permission.innerHTML = icon(s.kind === 'csv' ? 'hard-drive' : 'lock', 'i-xs');
  permission.appendChild(_connEl('span', null, s.kind === 'csv' ? 'Local import' : 'Read-only'));
  account.append(accountIcon, _connEl('span', 'cp-account-caption', _connPageAccountCaption(s)), permission);
  card.appendChild(account);

  const message = s.health && s.health.message;
  const noteText = st === 'off' ? 'New data is paused. Previously imported data stays in your dashboard.' : message ? String(message).replace(/:\s*open Connections( to connect it)?\.?$/i, '.') : st === 'auth' ? 'Sign in again to bring in new data.' : st === 'setup' ? 'Finish setting up this source to bring in new data.' : st === 'unknown' ? 'Sync this source to check it and bring in new data.' : st === 'error' ? 'This source could not be checked. Try syncing again.' : s.kind === 'csv' ? 'Import a file whenever you need an update.' : s.capability === 'bank' ? 'Transactions and your money brief' : s.capability === 'calendar' ? 'Events alongside your tasks' : 'Email triage and mail on people';
  const note = _connEl('div', 'cp-card-note' + (st === 'auth' || st === 'setup' ? ' attention-note' : st === 'error' ? ' error-note' : ''));
  note.innerHTML = icon(st === 'auth' || st === 'error' ? 'circle-alert' : st === 'off' ? 'eye-off' : st === 'setup' || st === 'unknown' ? 'info' : s.capability === 'bank' ? 'landmark' : s.capability === 'calendar' ? 'calendar-days' : 'mail', 'i-xs');
  note.appendChild(_connEl('span', null, noteText));
  card.appendChild(note);
  const warning = s.health && s.health.syncWarning;
  const syncWarning = typeof warning === 'string' ? warning : warning && warning.message || '';
  if (syncWarning && st !== 'off' && st !== 'demo') {
    card.appendChild(_connEl('p', 'conn-note', 'Previous sync failed: ' + syncWarning + ' Retry sync to update your data.'));
  }
  if (st === 'ok' && _connPageToolsReady(s)) card.appendChild(_connEl('p', 'conn-note', 'Connector tools checked. Data will be read when you sync.'));
  const accountDetails = _connPageSourceAccounts(s, busy); if (accountDetails) card.appendChild(accountDetails);

  const foot = _connEl('div', 'cp-card-footer');
  const when = busy ? 'Updating this source…' : s.kind === 'csv' ? 'Import CSV in Finances' : s.demo ? 'Demo data · never synced' : st === 'off' ? 'Sync paused' : s.lastSync ? `Synced ${_connAgo(s.lastSync)}` : 'Not synced yet';
  const time = _connEl('span', 'conn-when cp-sync-time'); time.innerHTML = icon('clock', 'i-xs'); time.appendChild(_connEl('span', null, when));
  let action;
  if (s.kind === 'csv') action = _connBtn('Open Finances', 'arrow-right', 'btn-ghost', () => setView('finance'));
  else if (st === 'off') action = _connBtn(busy ? 'Resuming…' : 'Resume', busy ? null : 'eye', 'btn-secondary', () => _connPageResumeSource(s));
  else if (_connPageSourceNeedsReconnect(s)) action = _connBtn('Reconnect', 'arrow-right', 'btn-secondary', () => { if (!SourcesStore.busy[s.id]) _connPageSourceHelp(s); });
  else action = _connBtn(busy ? 'Syncing…' : syncWarning || st === 'error' || st === 'setup' ? 'Retry sync' : 'Sync now', busy ? null : 'refresh-cw', 'btn-ghost', () => { if (!SourcesStore.busy[s.id]) _srcSync(s); });
  action.disabled = busy || (s.kind !== 'csv' && !!s.demo);
  if (busy && s.kind !== 'csv') action.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>');
  foot.append(time, action);
  card.appendChild(foot);
  return card;
}

function _connPageSuggestion(cap = 'bank') {
  if (!['bank', 'calendar', 'email'].includes(cap)) cap = 'bank';
  const bank = cap === 'bank';
  const card = _connEl('article', 'cp-source-card cp-suggestion');
  card.dataset.cap = cap;
  card.dataset.conn = 'add-' + cap;
  const head = _connEl('div', 'cp-card-top');
  const mark = _connEl('span', 'cp-service-mark'); mark.innerHTML = _connMark(null, bank ? 'landmark' : cap === 'calendar' ? 'calendar-days' : 'mail');
  head.append(mark, _connEl('span', 'cp-suggestion-label', 'CONNECT WHAT HELPS'));
  card.appendChild(head);
  const title = bank ? 'Your money, in the picture.' : cap === 'calendar' ? 'Make room for your schedule.' : 'Turn email into your next steps.';
  const copy = bank ? 'Connect a bank to see transactions, spending and your money brief together.' : cap === 'calendar' ? 'Bring calendar events alongside your tasks. An iCal link works without Claude.' : 'Bring in recent email for triage, task suggestions and the people you work with.';
  card.append(_connEl('h3', null, title), _connEl('p', 'cp-description', copy));
  const tags = _connEl('div', 'cp-suggestion-tags');
  const read = _connEl('span'); read.innerHTML = icon('shield-check', 'i-xs'); read.appendChild(_connEl('span', null, 'Read-only'));
  const local = _connEl('span'); local.innerHTML = icon('hard-drive', 'i-xs'); local.appendChild(_connEl('span', null, 'Local data'));
  tags.append(read, local); card.appendChild(tags);
  const foot = _connEl('div', 'cp-card-footer');
  foot.appendChild(_connBtn(bank ? 'Connect a bank' : cap === 'calendar' ? 'Add a calendar' : 'Connect email', 'plus', 'btn-secondary', () => srcAddFlow({ capability: cap })));
  if (bank) foot.appendChild(_connBtn('Or use a CSV', 'arrow-right', 'btn-ghost', () => setView('finance')));
  card.appendChild(foot);
  return card;
}
