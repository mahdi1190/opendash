/* Google Health connects directly through Google OAuth, independently of mail
   and calendar. Credentials stay in this computer's secret store (lib/secret-store.mjs). */
let _googleHealthBusy = false;
let _googleHealthConsentCleanup = null;

/** Is there anything to show on the page? Not available yet (unconfigured) goes under Advanced instead. */
function googleHealthActive(all) {
  const h = (all && all.googleHealth) || {};
  return !!(h.connected || h.needsAuth || h.error || h.configured);
}
/**
 * Google Health card (SIMPLIFY_PLAN.md 5.6): status first (Not available yet / Ready to connect /
 * Connected / Needs you), one sentence, one action; the stats and setup sit under More.
 */
function googleHealthConnectionCard(all) {
  const health = all.googleHealth || {};
  const card = _connEl('section', 'card conn-card google-health-card');
  card.dataset.conn = 'google-health';
  const head = _connEl('div', 'conn-head');
  const mark = _connEl('span', 'conn-ic'); mark.innerHTML = icon('heart'); mark.setAttribute('aria-hidden', 'true');
  const names = _connEl('div', 'conn-titles');
  names.append(_connEl('div', 'conn-name', 'Google Health'), _connEl('div', 'conn-sub', 'Google Health & Fitbit · read-only'));
  head.append(mark, names); card.appendChild(head);
  const errText = health.error ? (typeof health.error === 'string' ? health.error : health.error.message || 'Open setup to reconnect') : '';
  card.appendChild(health.needsAuth ? setStatusLine('warn', 'Needs you', 'Sign in again')
    : health.error ? setStatusLine('warn', 'Needs you', errText)
      : health.connected ? setStatusLine('ok', 'Connected', health.lastSync ? 'Updated ' + _connAgo(health.lastSync) : '')
        : health.configured ? setStatusLine('idle', 'Ready to connect')
          : setStatusLine('off', 'Not available yet', 'Google only lets approved projects connect'));
  card.appendChild(_connEl('p', 'conn-text', 'Activity and sleep, read-only.'));
  const row = _connEl('div', 'set-action'); card.appendChild(row);
  if (health.connected && !health.needsAuth) {
    const upd = uiButton({ label: _googleHealthBusy ? 'Updating…' : 'Update now', icon: 'refresh-cw', kind: 'primary', size: 'sm', run: () => googleHealthSync() });
    upd.disabled = _googleHealthBusy; row.appendChild(upd);
  } else row.appendChild(uiButton({ label: health.configured ? (health.needsAuth ? 'Sign in again' : 'Connect Google Health') : 'Set up Google Health', icon: 'arrow-right', kind: health.configured ? 'primary' : 'secondary', size: 'sm', run: () => health.configured ? googleHealthSignIn() : googleHealthConnectionSetup() }));
  setFold(card, 'conn-ghealth-more', 'More', ({ body }) => {
    const snapshot = health.lastSync && health.snapshot;
    if (snapshot) {
      const stats = _connEl('div', 'google-health-stats');
      if (Array.isArray(snapshot.steps)) stats.appendChild(_connEl('span', 'chip', snapshot.steps.length + ' activity day' + (snapshot.steps.length === 1 ? '' : 's')));
      if (Array.isArray(snapshot.sleep)) stats.appendChild(_connEl('span', 'chip', snapshot.sleep.length + ' sleep record' + (snapshot.sleep.length === 1 ? '' : 's')));
      body.appendChild(stats);
      for (const warning of snapshot.warnings || []) body.appendChild(_connEl('p', 'conn-note', warning));
    }
    if (!health.configured) body.appendChild(_connEl('p', 'conn-note', 'Needs a one-time Google Cloud setup. Google currently limits access to approved projects.'));
    body.appendChild(_connEl('p', 'conn-note', 'Google handles sign-in and consent. What it brings in stays in your data folder.'));
    const acts = _connEl('div', 'assistant-actions');
    acts.appendChild(uiButton({ label: health.connected ? 'Manage Google Health' : 'Setup steps', icon: 'settings', kind: 'ghost', size: 'sm', run: () => googleHealthConnectionSetup() }));
    body.appendChild(acts);
  });
  return card;
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
  toast('The sign-in tab didn’t open. You can sign in here instead', { kind: 'info', timeout: 8000,
    action: { label: 'Sign in here', run: () => location.assign('/api/google-health/connect') } });
}

async function googleHealthSync() {
  if (_googleHealthBusy) return;
  _googleHealthBusy = true;
  if (state.view === 'connections') renderMain();
  try {
    const result = await _srcApi('/api/google-health/sync', { method: 'POST', body: {} });
    toast(result.snapshot && result.snapshot.warnings && result.snapshot.warnings.length ? 'Google Health updated, with some data missing. See the card for details' : 'Google Health updated', { kind: 'ok' });
  } catch (e) { toastError('update Google Health', e, () => googleHealthSync()); }
  finally { _googleHealthBusy = false; await connRefresh({ force: true }); if (state.view === 'connections') renderMain(); }
}

function googleHealthConnectionSetup() {
  let alive = true;
  openDrawer({ title: 'Google Health', width: 580, onClose: () => { alive = false; }, body: async (el, close) => {
    el.appendChild(_connEl('p', 'conn-text', 'Connect activity and sleep from Google Health, including supported Fitbit devices. Sign in to the Google Health mobile app with the same Google Account first.'));
    let health;
    try { health = await _srcApi('/api/google-health/status'); }
    catch (e) {
      if (!alive) return;
      const p = _connEl('p', 'conn-note', 'The Google Health status did not load: ' + netErrorMessage(e) + ' ');
      p.appendChild(uiButton({ label: 'Try again', icon: 'refresh-cw', kind: 'ghost', size: 'sm', run: () => { close(); googleHealthConnectionSetup(); } }));
      el.appendChild(p);
      return;
    }
    if (!alive) return;
    const notice = _connEl('p', 'callout info conn-msg', 'Google currently pauses access for new projects. An approved Google Cloud project is needed to finish connecting.');
    el.appendChild(notice);
    el.appendChild(uiButton({ label: 'Google Health setup guide', icon: 'external-link', kind: 'ghost', size: 'sm', run: () => window.open('https://developers.google.com/health/setup', '_blank', 'noopener') }));
    if (health.error) { const error = _connEl('p', 'conn-note', typeof health.error === 'string' ? health.error : health.error.message || 'Please reconnect Google Health.'); error.setAttribute('role', 'alert'); el.appendChild(error); }
    if (health.configured) {
      const actions = _connEl('div', 'assistant-actions');
      actions.appendChild(uiButton({ label: health.connected ? 'Reconnect Google Health' : 'Sign in with Google', icon: 'log-in', kind: 'primary', size: 'sm', run: (e, b) => googleHealthSignIn(b) }));
      if (health.connected || health.needsAuth || health.lastSync) actions.appendChild(uiButton({ label: 'Disconnect Google Health', icon: 'unplug', kind: 'secondary', size: 'sm', run: async (e, b) => {
        b.disabled = true;
        try { await _srcApi('/api/google-health/disconnect', { method: 'POST', body: {} }); _googleHealthStopConsentWatch(); await connRefresh({ force: true }); close(); toast('Google Health disconnected', { kind: 'ok' }); }
        catch (e) { if (alive) b.disabled = false; toastError('disconnect Google Health', e); }
      } }));
      el.append(actions, _connEl('p', 'conn-note', 'Return here after sign-in, then choose Update now to read your recent activity and sleep. You can allow either or both permissions on Google’s consent screen.'));
      if (health.lastSync) el.appendChild(_connEl('p', 'conn-note', 'Last updated ' + _connAgo(health.lastSync) + '.'));
    }
    const details = _connEl('details', 'google-health-setup'); details.open = !health.configured;
    details.appendChild(_connEl('summary', null, health.configured ? 'Replace Google Cloud setup' : 'One-time Google Cloud setup'));
    details.appendChild(_connSteps([
      'Enable the Google Health API in a Google Cloud project with access. Add your Google Account as a test user on the OAuth consent screen.',
      'In Google Auth Platform → Data Access, allow the Google Health read-only scopes for activity and fitness (googlehealth.activity_and_fitness.readonly) and sleep (googlehealth.sleep.readonly).',
      'Create a Web application OAuth client and add the redirect address below exactly. Download its credentials JSON.',
      'Choose that JSON file below. It is saved only on this computer (never in your data folder), then you can sign in with Google.',
    ]));
    const redirect = health.redirectUri || location.origin.replace('127.0.0.1', 'localhost') + '/api/google-health/callback';
    details.appendChild(_connCode(redirect, 'Copy redirect address'));
    const field = _connEl('label', 'field google-health-file');
    field.appendChild(_connEl('span', 'field-label', 'Google OAuth credentials JSON'));
    const input = _connEl('input', 'control'); input.type = 'file'; input.accept = '.json,application/json';
    field.appendChild(input); details.appendChild(field);
    const feedback = _connEl('p', 'conn-note'); feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite'); details.appendChild(feedback);
    const save = uiButton({ label: 'Save Google Health setup', icon: 'check', kind: 'primary', size: 'sm', run: async (e, b) => {
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
        toast('Google Health setup saved. Sign in with Google to connect', { kind: 'ok' });
      } catch (e) { if (alive) { feedback.textContent = e.message; b.disabled = false; input.disabled = false; } }
    } });
    details.appendChild(save); el.appendChild(details);
  } });
}

registerCommand({ id: 'connect-google-health', label: 'Connect Google Health', icon: 'heart', group: 'Connections', keywords: 'fitbit activity steps sleep wellness health', run: () => { setView('connections'); googleHealthConnectionSetup(); } });
