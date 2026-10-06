/* Direct Microsoft browser sign-in, reused by Connections and setup. Account
   access is separate from the assistant: this flow does not require Claude. */
function microsoftConnectionCard(all, compact = false) {
  const ms = all.microsoft || {};
  const box = _connEl('section', 'card conn-card'); box.dataset.conn = 'microsoft';
  const head = _connEl('div', 'conn-head');
  const mark = _connEl('span', 'conn-ic'); mark.innerHTML = _connMark('outlook', 'mail');
  const names = _connEl('div', 'conn-titles'); names.append(_connEl('div', 'conn-name', 'Outlook / Microsoft 365'), _connEl('div', 'conn-sub', 'Personal and work or school accounts'));
  head.append(mark, names, _connEl('span', 'status ' + (ms.connected ? 'ok' : 'off'), ms.connected ? 'Connected' : ms.configured ? 'Sign in' : 'Setup needed'));
  box.append(head, _connEl('p', 'conn-text', compact ? 'Email and calendar, read-only through your browser. No Claude app required.' : 'Bring Outlook or Hotmail email and Microsoft 365 calendars into OpenDash. Sign in with Microsoft in your browser; this connection reads email previews and events, and never sends or changes them.'));
  if (ms.connected && ms.account) box.appendChild(_connEl('p', 'conn-note', ms.account));
  if (!ms.configured) box.appendChild(_connEl('p', 'conn-note', 'Microsoft app registration is required before browser sign-in is available.'));
  const actions = _connEl('div', 'assistant-actions');
  actions.appendChild(_connBtn(ms.connected ? 'Manage Microsoft' : ms.configured ? 'Sign in with Microsoft' : 'Set up Microsoft', 'arrow-right', 'btn-secondary', () => ms.configured && !ms.connected ? microsoftSignIn() : microsoftConnectionSetup()));
  box.appendChild(actions); return box;
}
function microsoftSignIn() { window.open('/api/microsoft/connect', '_blank', 'noopener'); }
function microsoftConnectionSetup() {
  openDrawer({ title: 'Microsoft email and calendar', width: 560, body: async (el, close) => {
    el.appendChild(_connEl('p', 'conn-text', 'Use a personal Outlook/Hotmail account or a work or school Microsoft 365 account. Microsoft handles your password and consent.'));
    let ms;
    try { ms = await _srcApi('/api/microsoft/status'); } catch (e) { el.appendChild(_connEl('p', 'conn-note', e.message)); return; }
    if (ms.configured) {
      el.appendChild(_connBtn(ms.connected ? 'Reconnect Microsoft' : 'Sign in with Microsoft', 'log-in', 'btn-primary', microsoftSignIn));
      if (ms.connected) el.appendChild(_connBtn('Disconnect Microsoft', 'unplug', 'btn-secondary', async () => {
        try { await _srcApi('/api/microsoft/disconnect', { method: 'POST', body: {} });
          await SourcesStore.refresh({ cached: true }); await connRefresh({ force: true }); close(); toast('Microsoft disconnected.', { kind: 'ok' });
        } catch (e) { toast(e.message, { kind: 'err' }); }
      }));
      el.appendChild(_connEl('p', 'conn-note', 'Return to OpenDash after sign-in. Reconnecting replaces the Microsoft account sources; existing calendars and mailbox choices can be selected again.'));
      return;
    }
    el.appendChild(_connEl('h3', 'conn-name', 'One-time app registration'));
    el.appendChild(_connEl('p', 'conn-note', 'OpenDash does not yet ship a Microsoft application ID. Register a native public-client app once, or use an ID supplied by your administrator. No client secret belongs in this app.'));
    el.appendChild(_connSteps([
      'In Microsoft Entra App registrations, create an app for accounts in any organisational directory AND personal Microsoft accounts.',
      'Under Authentication, add the Mobile and desktop applications platform and redirect URI http://localhost/api/microsoft/callback. Enable public client flows.',
      'Add Microsoft Graph delegated permissions User.Read, Mail.Read and Calendars.Read. Work or school policy may require administrator approval.',
      'Paste its Application (client) ID below, save, then sign in. The browser also requests offline_access for refresh tokens.',
    ]));
    el.appendChild(_connBtn('Microsoft registration guide', 'external-link', 'btn-ghost', () => window.open('https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app', '_blank', 'noopener')));
    const input = document.createElement('input'); input.className = 'control'; input.placeholder = 'Application (client) ID'; input.setAttribute('aria-label', 'Microsoft application client ID'); input.autocomplete = 'off'; el.appendChild(input);
    el.appendChild(_connBtn('Save Microsoft setup', 'check', 'btn-primary', async b => {
      b.disabled = true;
      try { await _srcApi('/api/microsoft/configure', { method: 'PUT', body: { clientId: input.value.trim() } }); await connRefresh({ force: true }); close(); microsoftConnectionSetup(); }
      catch (e) { toast(e.message, { kind: 'err' }); b.disabled = false; }
    }));
  } });
}
window.addEventListener('focus', () => { if (state.view === 'connections' || (typeof _obOpen !== 'undefined' && _obOpen)) connRefresh({ force: true }); });
