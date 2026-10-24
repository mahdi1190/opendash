// Browser Claude uses the dedicated remote MCP gateway, never the dashboard URL.
let _remoteMcpState = null, _remoteMcpLoading = false, _remoteMcpTimer = null;
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
    if (state.view === 'connections') renderMain();
  }
}
async function remoteMcpAction(action, body = {}) {
  try {
    const r = await fetch('/api/connections/remote-mcp/' + action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || 'The connection could not be updated.');
    await remoteMcpRefresh();
    toast(action === 'approve' ? 'Claude access approved. Return to the sign-in tab' : action === 'revoke' ? 'Browser access revoked' : action === 'start' ? 'Gateway started. Connect your Cloudflare Tunnel next' : 'Cloudflare hostname saved', { kind: 'ok' });
  } catch (e) { toastError(action === 'approve' ? 'approve the code' : action === 'revoke' ? 'revoke browser access' : action === 'start' ? 'start the gateway' : 'save the hostname', e, () => remoteMcpAction(action, body)); }
}
function remoteMcpConfigure() {
  openDrawer({ title: 'Claude in your browser', width: 520, body(el, close) {
    el.appendChild(_connEl('p', 'conn-note', 'Use a hostname managed by Cloudflare. The tunnel connects to the separate MCP gateway on port 4911.'));
    const input = _connEl('input', 'field'); input.type = 'url'; input.placeholder = 'https://opendash.example.com'; input.setAttribute('aria-label', 'Cloudflare public HTTPS hostname'); input.value = _remoteMcpState && _remoteMcpState.publicOrigin || '';
    el.appendChild(input);
    el.appendChild(uiButton({ label: 'Save hostname', icon: 'check', kind: 'primary', size: 'sm', run: async () => { await remoteMcpAction('configure', { publicOrigin: input.value.trim() }); if (_remoteMcpState && _remoteMcpState.publicOrigin === input.value.trim().replace(/\/$/, '')) close(); } }));
    el.appendChild(_connEl('p', 'conn-note', 'In Cloudflare, route this hostname to http://127.0.0.1:4911. Then add the /mcp URL as a custom connector in Claude’s browser settings. OpenDash will ask you to approve a matching code here.'));
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
  buttons.append(uiButton({ label: 'Copy connector URL', icon: 'copy', kind: 'secondary', size: 'sm', run: () => copyText(s.endpoint, 'connector URL') }), uiButton({ label: 'Open Claude connectors', icon: 'external-link', kind: 'secondary', size: 'sm', run: () => window.open('https://claude.ai/settings/connectors', '_blank', 'noopener,noreferrer') }));
  if (!s.running) buttons.appendChild(uiButton({ label: 'Start gateway', icon: 'play', kind: 'primary', size: 'sm', run: () => remoteMcpAction('start') }));
  buttons.appendChild(uiButton({ label: 'Revoke browser access', icon: 'unlink', kind: 'ghost', size: 'sm', run: () => remoteMcpAction('revoke') }));
  card.appendChild(buttons);
  for (const request of s.requests || []) {
    const row = _connEl('div', 'conn-note');
    row.append(_connEl('p', null, 'Connection request to ' + request.redirectOrigin + '. Match this code with the Claude sign-in tab:'), _connEl('strong', null, request.displayCode), _connEl('p', null, 'Allows dashboard reads and proposals. Applied changes still require approval in OpenDash.'));
    const approve = uiButton({ label: 'Approve matching code', icon: 'check', kind: 'primary', size: 'sm', run: () => remoteMcpAction('approve', { id: request.id }) });
    approve.onclick = async () => { approve.disabled = true; await remoteMcpAction('approve', { id: request.id }); };
    row.appendChild(approve); card.appendChild(row);
  }
  return card;
}
