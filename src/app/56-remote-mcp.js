// Browser Claude uses the dedicated remote MCP gateway, never the dashboard URL.
let _remoteMcpState = null, _remoteMcpLoading = false, _remoteMcpTimer = null;
const _remoteMcpCodes = {};   // request id -> code typed so far (kept across the 5 s refresh)
async function remoteMcpRefresh() {
  if (_remoteMcpLoading) return;
  _remoteMcpLoading = true;
  try {
    const r = await fetch('/api/connections/remote-mcp', { cache: 'no-store' });
    if (r.ok) _remoteMcpState = await r.json();
    else if (!_remoteMcpState) _remoteMcpState = { configured: false, unavailable: true };
  } catch { if (!_remoteMcpState) _remoteMcpState = { configured: false, unavailable: true }; }
  finally {
    _remoteMcpLoading = false;
    // Not while the owner is typing an approval code (a re-render would drop the focus).
    const typing = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.remoteCode;
    if (state.view === 'connections' && !typing) renderMain();
  }
}
async function remoteMcpAction(action, body = {}) {
  try {
    const r = await fetch('/api/connections/remote-mcp/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || 'The connection could not be updated.');
    await remoteMcpRefresh();
    toast(action === 'approve' ? 'Claude access approved. Return to the sign-in tab' : action === 'revoke' ? 'Browser access revoked' : action === 'start' ? 'Gateway started. Connect your Cloudflare Tunnel next' : action === 'connect' ? 'New Claude connections allowed for 10 minutes' : 'Cloudflare hostname saved', { kind: 'ok' });
    return true;
  } catch (e) { toastError(action === 'approve' ? 'approve the code' : action === 'revoke' ? 'revoke browser access' : action === 'start' ? 'start the gateway' : action === 'connect' ? 'allow a new connection' : 'save the hostname', e, () => remoteMcpAction(action, body)); return false; }
}
function remoteMcpConfigure() {
  openDrawer({ title: 'Claude in your browser', width: 520, body(el, close) {
    el.appendChild(_connEl('p', 'conn-note', 'Use a hostname managed by Cloudflare. The tunnel connects to the separate MCP gateway on port 4911.'));
    const input = _connEl('input', 'field'); input.type = 'url'; input.placeholder = 'https://opendash.example.com'; input.setAttribute('aria-label', 'Cloudflare public HTTPS hostname'); input.value = _remoteMcpState && _remoteMcpState.publicOrigin || '';
    el.appendChild(input);
    el.appendChild(uiButton({ label: 'Save hostname', icon: 'check', kind: 'primary', size: 'sm', run: async () => { await remoteMcpAction('configure', { publicOrigin: input.value.trim() }); if (_remoteMcpState && _remoteMcpState.publicOrigin === input.value.trim().replace(/\/$/, '')) close(); } }));
    el.appendChild(_connEl('p', 'conn-note', 'In Cloudflare, route this hostname to http://127.0.0.1:4911. Then add the /mcp URL as a custom connector in Claude’s browser settings. Press Connect Claude here first (new connections are accepted for 10 minutes), then type the code from your Claude sign-in tab here to approve it.'));
  } });
}
function remoteMcpCard() {
  if (!_remoteMcpState && !_remoteMcpLoading) remoteMcpRefresh();
  if (!_remoteMcpTimer) _remoteMcpTimer = setInterval(() => { if (!document.hidden && state.view === 'connections') remoteMcpRefresh(); }, 5000);
  const card = _connEl('section', 'cp-source-card');
  card.append(_connEl('h3', null, 'Claude in your browser, through your own Cloudflare Tunnel (for developers)'), _connEl('p', 'cp-description', 'claude.ai can read your tasks and suggest changes you approve. This computer and your tunnel must stay running.'));
  const s = _remoteMcpState;
  if (!s || !s.configured) {
    card.append(_connEl('p', 'conn-note', s ? 'Cloudflare hostname needed.' : 'Checking browser connection…'), uiButton({ label: 'Set up Cloudflare connection', icon: 'globe', kind: 'secondary', size: 'sm', run: (e, b) => remoteMcpConfigure(b) }));
    return card;
  }
  card.appendChild(_connEl('p', 'conn-note', s.running ? 'Local gateway running. Cloudflare routing and Claude sign-in complete the connection.' : 'Local gateway stopped.'));
  const endpoint = _connEl('code'); endpoint.textContent = s.endpoint; card.appendChild(endpoint);
  const buttons = _connEl('div', 'cp-card-footer');
  // New connections are accepted only for 10 minutes after Connect (anyone on the internet can reach the gateway).
  buttons.append(uiButton({ label: 'Copy connector URL', icon: 'copy', kind: 'secondary', size: 'sm', run: () => copyText(s.endpoint, 'connector URL') }), uiButton({ label: 'Connect Claude', icon: 'external-link', kind: 'primary', size: 'sm', run: () => { window.open('https://claude.ai/settings/connectors', '_blank', 'noopener,noreferrer'); return remoteMcpAction('connect'); } }));
  if (!s.running) buttons.appendChild(uiButton({ label: 'Start gateway', icon: 'play', kind: 'secondary', size: 'sm', run: () => remoteMcpAction('start') }));
  buttons.appendChild(uiButton({ label: 'Revoke browser access', icon: 'unlink', kind: 'ghost', size: 'sm', run: () => remoteMcpAction('revoke') }));
  card.appendChild(buttons);
  const left = s.connectUntil ? Math.max(0, Math.ceil((s.connectUntil - Date.now()) / 60000)) : 0;
  card.appendChild(_connEl('p', 'conn-note', left ? `New Claude connections allowed for about ${left} more minute${left === 1 ? '' : 's'}.` : 'New Claude connections are closed. Press Connect Claude when you want to add one (open for 10 minutes).'));
  for (const request of s.requests || []) {
    const row = _connEl('div', 'conn-note');
    const from = [request.ip, request.country].filter(Boolean).join(', ');
    row.append(
      _connEl('p', null, `Connection request from "${request.clientName || 'Claude connector'}". It will send its sign-in back to ${request.redirectHost || request.redirectOrigin}${from ? ` (request came from ${from})` : ''}.`),
      _connEl('p', null, 'Only approve if YOU just started this in Claude. Type the code shown in your own Claude sign-in tab:'),
      _connEl('p', null, 'Allows dashboard reads and proposals. Applied changes still require approval in OpenDash.'));
    const input = _connEl('input', 'field'); input.placeholder = 'Code from your sign-in tab'; input.setAttribute('aria-label', 'Code from your Claude sign-in tab'); input.maxLength = 12; input.autocomplete = 'off'; input.spellcheck = false;
    input.dataset.remoteCode = request.id; input.value = _remoteMcpCodes[request.id] || ''; input.oninput = () => { _remoteMcpCodes[request.id] = input.value; };
    const approve = uiButton({ label: 'Approve', icon: 'check', kind: 'primary', size: 'sm', run: () => remoteMcpAction('approve', { id: request.id, code: input.value.trim() }) });
    approve.onclick = async () => { approve.disabled = true; const ok = await remoteMcpAction('approve', { id: request.id, code: input.value.trim() }); if (!ok) approve.disabled = false; };
    row.append(input, approve); card.appendChild(row);
  }
  return card;
}
