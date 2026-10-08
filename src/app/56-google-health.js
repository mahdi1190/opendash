/* Google Health connects directly through Google OAuth, independently of mail
   and calendar. Credentials stay in the local server's secrets folder. */
let _googleHealthBusy = false;
let _googleHealthConsentCleanup = null;

function googleHealthConnectionCard(all) {
  const health = all.googleHealth || {};
  const card = _connEl('section', 'card conn-card google-health-card');
  card.dataset.conn = 'google-health';
  const head = _connEl('div', 'conn-head');
  const mark = _connEl('span', 'conn-ic'); mark.innerHTML = icon('heart'); mark.setAttribute('aria-hidden', 'true');
  const names = _connEl('div', 'conn-titles');
  names.append(_connEl('div', 'conn-name', 'Google Health'), _connEl('div', 'conn-sub', 'Google Health & Fitbit · read-only'));
  const label = health.needsAuth ? 'Needs sign-in' : health.connected ? 'Connected' : health.configured ? 'Ready to connect' : 'Setup needed';
  head.append(mark, names, _connEl('span', 'status ' + (health.needsAuth || health.error ? 'warn' : health.connected ? 'ok' : 'off'), label));
  card.append(head, _connEl('p', 'conn-text', 'Connect your activity and sleep to OpenDash. Google handles sign-in and consent; your synced data stays in your local data folder.'));
  if (health.lastSync) {
    card.appendChild(_connEl('p', 'conn-note', 'Last synced ' + _connAgo(health.lastSync) + '.'));
    const snapshot = health.snapshot;
    if (snapshot) {
      const stats = _connEl('div', 'google-health-stats');
      if (Array.isArray(snapshot.steps)) stats.appendChild(_connEl('span', 'chip', snapshot.steps.length + ' activity day' + (snapshot.steps.length === 1 ? '' : 's')));
      if (Array.isArray(snapshot.sleep)) stats.appendChild(_connEl('span', 'chip', snapshot.sleep.length + ' sleep record' + (snapshot.sleep.length === 1 ? '' : 's')));
      card.appendChild(stats);
      for (const warning of snapshot.warnings || []) card.appendChild(_connEl('p', 'conn-note', warning));
    }
  }
  if (health.error) {
    const error = _connEl('p', 'conn-note', typeof health.error === 'string' ? health.error : health.error.message || 'Google Health needs attention. Open setup to reconnect.');
    error.setAttribute('role', 'alert'); card.appendChild(error);
  }
  if (!health.configured) card.appendChild(_connEl('p', 'conn-note', 'One-time Google Cloud setup required. Google currently limits access to approved projects.'));
  const actions = _connEl('div', 'assistant-actions');
  if (health.connected) {
    const sync = _connBtn(_googleHealthBusy ? 'Syncing…' : 'Sync now', 'refresh-cw', 'btn-primary', () => googleHealthSync());
    sync.disabled = _googleHealthBusy; actions.appendChild(sync);
  }
  actions.appendChild(_connBtn(health.connected ? 'Manage Google Health' : health.configured ? 'Connect Google Health' : 'Set up Google Health', 'arrow-right', 'btn-secondary', () => health.configured && !health.connected ? googleHealthSignIn() : googleHealthConnectionSetup()));
  card.appendChild(actions); return card;
}

function _googleHealthStopConsentWatch() {
  if (_googleHealthConsentCleanup) _googleHealthConsentCleanup();
}
function googleHealthSignIn() {
  _googleHealthStopConsentWatch();
  const before = typeof Connections !== 'undefined' && Connections.all ? Connections.all()?.googleHealth : null;
  let departed = false, refreshing = false, stopped = false;
  const leave = () => { departed = true; };
  const cleanup = () => {
    stopped = true;
    window.removeEventListener('blur', leave); window.removeEventListener('focus', returned);
    document.removeEventListener('visibilitychange', visibility);
    if (_googleHealthConsentCleanup === cleanup) _googleHealthConsentCleanup = null;
  };
  const returned = async () => {
    if (stopped || !departed || refreshing || document.visibilityState === 'hidden') return;
    departed = false; refreshing = true;
    try {
      // The shared connection refresh waits a minute between focus events.
      // Consent can finish sooner. Refresh only after leaving and returning;
      // a premature return keeps this watch alive for the next return.
      const all = await connRefresh({ force: true });
      const health = all && all.googleHealth;
      if (health && (!health.configured || (health.connected && (!before?.connected || health.lastSync !== before.lastSync)))) cleanup();
      // Connections' own subscription updates its card. Other pages stay put.
    } finally { refreshing = false; }
  };
  const visibility = () => { if (document.visibilityState === 'hidden') leave(); else return returned(); };
  _googleHealthConsentCleanup = cleanup;
  window.addEventListener('blur', leave); window.addEventListener('focus', returned);
  document.addEventListener('visibilitychange', visibility);
  let popup;
  try {
    // Open an empty tab first so a blocked pop-up is detectable. Detach its
    // opener before navigating to Google; noopener directly returns null even
    // for an allowed tab, which cannot distinguish success from blocking.
    popup = window.open('about:blank', '_blank');
    if (popup) { popup.opener = null; popup.location.replace(location.origin + '/api/google-health/connect'); return; }
  } catch (e) { if (popup) try { popup.close(); } catch (_) { /* already closed */ } }
  cleanup();
  toast('The sign-in tab did not open. You can sign in here instead.', { kind: 'info', timeout: 8000,
    action: { label: 'Sign in here', run: () => location.assign('/api/google-health/connect') } });
}

async function googleHealthSync() {
  if (_googleHealthBusy) return;
  _googleHealthBusy = true;
  if (state.view === 'connections') renderMain();
  try {
    const result = await _srcApi('/api/google-health/sync', { method: 'POST', body: {} });
    toast(result.snapshot && result.snapshot.warnings && result.snapshot.warnings.length ? 'Google Health synced with some missing data. See the connection for details.' : 'Google Health synced.', { kind: 'ok' });
  } catch (e) { toast(e.message, { kind: 'err', timeout: 7000 }); }
  finally { _googleHealthBusy = false; await connRefresh({ force: true }); if (state.view === 'connections') renderMain(); }
}

function googleHealthConnectionSetup() {
  let alive = true;
  openDrawer({ title: 'Google Health', width: 580, onClose: () => { alive = false; }, body: async (el, close) => {
    el.appendChild(_connEl('p', 'conn-text', 'Connect activity and sleep from Google Health, including supported Fitbit devices. Sign in to the Google Health mobile app with the same Google Account first.'));
    let health;
    try { health = await _srcApi('/api/google-health/status'); }
    catch (e) { if (alive) el.appendChild(_connEl('p', 'conn-note', e.message)); return; }
    if (!alive) return;
    const notice = _connEl('p', 'callout info conn-msg', 'Google currently pauses access for new projects. An approved Google Cloud project is needed to finish connecting.');
    el.appendChild(notice);
    el.appendChild(_connBtn('Google Health setup guide', 'external-link', 'btn-ghost', () => window.open('https://developers.google.com/health/setup', '_blank', 'noopener')));
    if (health.error) { const error = _connEl('p', 'conn-note', typeof health.error === 'string' ? health.error : health.error.message || 'Please reconnect Google Health.'); error.setAttribute('role', 'alert'); el.appendChild(error); }
    if (health.configured) {
      const actions = _connEl('div', 'assistant-actions');
      actions.appendChild(_connBtn(health.connected ? 'Reconnect Google Health' : 'Sign in with Google', 'log-in', 'btn-primary', googleHealthSignIn));
      if (health.connected || health.needsAuth || health.lastSync) actions.appendChild(_connBtn('Disconnect Google Health', 'unplug', 'btn-secondary', async b => {
        b.disabled = true;
        try { await _srcApi('/api/google-health/disconnect', { method: 'POST', body: {} }); _googleHealthStopConsentWatch(); await connRefresh({ force: true }); close(); toast('Google Health disconnected.', { kind: 'ok' }); }
        catch (e) { if (alive) b.disabled = false; toast(e.message, { kind: 'err' }); }
      }));
      el.append(actions, _connEl('p', 'conn-note', 'Return here after sign-in, then choose Sync now to read your recent activity and sleep. You can allow either or both permissions on Google’s consent screen.'));
      if (health.lastSync) el.appendChild(_connEl('p', 'conn-note', 'Last synced ' + _connAgo(health.lastSync) + '.'));
    }
    const details = _connEl('details', 'google-health-setup'); details.open = !health.configured;
    details.appendChild(_connEl('summary', null, health.configured ? 'Replace Google Cloud setup' : 'One-time Google Cloud setup'));
    details.appendChild(_connSteps([
      'Enable the Google Health API in a Google Cloud project with access. Add your Google Account as a test user on the OAuth consent screen.',
      'In Google Auth Platform → Data Access, allow the Google Health read-only scopes for activity and fitness (googlehealth.activity_and_fitness.readonly) and sleep (googlehealth.sleep.readonly).',
      'Create a Web application OAuth client and add the redirect address below exactly. Download its credentials JSON.',
      'Choose that JSON file below. It is saved only to OpenDash’s local secrets folder, then you can sign in with Google.',
    ]));
    const redirect = health.redirectUri || location.origin.replace('127.0.0.1', 'localhost') + '/api/google-health/callback';
    details.appendChild(_connCode(redirect, 'Copy redirect address'));
    const field = _connEl('label', 'field google-health-file');
    field.appendChild(_connEl('span', 'field-label', 'Google OAuth credentials JSON'));
    const input = _connEl('input', 'control'); input.type = 'file'; input.accept = '.json,application/json';
    field.appendChild(input); details.appendChild(field);
    const feedback = _connEl('p', 'conn-note'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); details.appendChild(feedback);
    const save = _connBtn('Save Google Health setup', 'check', 'btn-primary', async b => {
      const file = input.files && input.files[0];
      if (!file) { feedback.textContent = 'Choose the credentials JSON you downloaded from Google Cloud.'; input.focus(); return; }
      b.disabled = true; input.disabled = true; feedback.textContent = 'Saving setup…';
      try {
        if (file.size > 32768) throw new Error('Choose the small OAuth credentials JSON downloaded from Google Cloud.');
        let credentials;
        try { credentials = JSON.parse(await file.text()); } catch { throw new Error('This file is not valid JSON. Choose your Google OAuth credentials download.'); }
        await _srcApi('/api/google-health/configure', { method: 'PUT', body: { credentials } });
        _googleHealthStopConsentWatch();
        await connRefresh({ force: true });
        if (alive) { close(); googleHealthConnectionSetup(); }
        toast('Google Health setup saved. Sign in with Google to connect.', { kind: 'ok' });
      } catch (e) { if (alive) { feedback.textContent = e.message; b.disabled = false; input.disabled = false; } }
    });
    details.appendChild(save); el.appendChild(details);
  } });
}

registerCommand({ id: 'connect-google-health', label: 'Connect Google Health', icon: 'heart', group: 'Connections', keywords: 'fitbit activity steps sleep wellness health', run: () => { setView('connections'); googleHealthConnectionSetup(); } });
