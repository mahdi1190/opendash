// Shared public relay: ordinary users never configure a tunnel or a hostname.
let _hostedRelayState = null, _hostedRelayBusy = false, _hostedRelayTimer = null;
function hostedRelayInstallUrl(endpoint) {
  const connectorPage = 'https://claude.ai/customize/connectors';
  const url = new URL(connectorPage);
  url.search = new URLSearchParams({ modal: 'add-custom-connector', connectorName: 'OpenDash', connectorUrl: endpoint }).toString();
  return url.href;
}
async function _hostedRelayApi(action, body) {
  const r = await fetch('/api/connections/hosted-relay' + (action ? '/' + action : ''), action ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) } : { cache: 'no-store' });
  const out = await r.json(); if (!r.ok) throw new Error(out.error || 'The shared connection could not be updated.'); return out;
}
async function hostedRelayRefresh() {
  if (_hostedRelayBusy) return;
  _hostedRelayBusy = true;
  const before = JSON.stringify(_hostedRelayState);
  try { _hostedRelayState = await _hostedRelayApi(); } catch { if (!_hostedRelayState) _hostedRelayState = { available: false }; }
  finally { _hostedRelayBusy = false; if (before !== JSON.stringify(_hostedRelayState)) { if (state.view === 'connections') renderMain(); if (typeof _obOpen !== 'undefined' && _obOpen) connRefresh({ force: true }); } }
}
async function hostedRelayAction(action, body) {
  let signIn;
  if (action === 'link') {
    signIn = window.open('about:blank', '_blank');
    if (signIn) signIn.opener = null;
  }
  try {
    _hostedRelayState = await _hostedRelayApi(action, body);
    if (action === 'link') {
      const install = hostedRelayInstallUrl(_hostedRelayState.endpoint);
      if (signIn && !signIn.closed) signIn.location.replace(install);
      toast(signIn && !signIn.closed ? 'Sign in and approve OpenDash in Claude, then match the approval code here.' : 'Your connection is ready. Press Continue in Claude to sign in and approve.', { kind: 'ok' });
    } else toast(action === 'approve' ? 'Matching code approved. Return to the Claude sign-in tab.' : action === 'disconnect' ? 'Claude relay disconnected.' : 'Claude browser access revoked.', { kind: 'ok' });
    if (state.view === 'connections') renderMain();
    if (typeof _obOpen !== 'undefined' && _obOpen) connRefresh({ force: true });
  } catch (e) { if (signIn && !signIn.closed) signIn.close(); toast(e.message, { kind: 'err' }); }
}
function hostedRelayCard(compact = false) {
  if (!_hostedRelayState && !_hostedRelayBusy) hostedRelayRefresh();
  if (!_hostedRelayTimer) _hostedRelayTimer = setInterval(() => { const card = document.querySelector('[data-conn="hosted-relay"]'); if (!document.hidden && card && (!card.closest('details') || card.closest('details').open)) hostedRelayRefresh(); }, 5000);
  const s = _hostedRelayState || {}, card = _connEl('section', 'card conn-card'); card.dataset.conn = 'hosted-relay';
  const head = _connEl('div', 'conn-head'), mark = _connEl('span', 'conn-ic'); mark.innerHTML = _connMark('claude');
  const names = _connEl('div', 'conn-titles'); names.append(_connEl('div', 'conn-name', 'Claude in your browser'), _connEl('div', 'conn-sub', 'OpenDash and its tools, one connection'));
  head.append(mark, names, _connEl('span', 'status ' + (s.linked && s.online ? 'ok' : 'off'), s.linked && s.online ? 'Linked' : s.configured ? s.online ? 'Ready for Claude' : 'Offline' : s.available ? 'Ready to link' : 'Not published yet')); card.appendChild(head);
  card.appendChild(_connEl('p', 'conn-text', compact ? 'Link Claude to this dashboard. Sign in and approve in your browser; keep OpenDash running.' : 'Press Link Claude, sign in in your browser and approve OpenDash. We fill in the connection details for you. Match the approval code here to finish. Keep OpenDash running.'));
  card.appendChild(_connEl('p', 'conn-note', 'Claude requests and selected dashboard responses pass through the shared relay. Your main dashboard stays local; changes are proposals you approve in OpenDash.'));
  if (!s.available) { card.appendChild(_connEl('p', 'conn-note', 'The OpenDash service operator must publish the shared relay before Link Claude is available.')); return card; }
  const actions = _connEl('div', 'assistant-actions');
  actions.appendChild(_connBtn(s.linked && s.online ? 'Open Claude' : s.configured ? 'Continue in Claude' : 'Link Claude', 'external-link', 'btn-primary', () => s.linked && s.online ? window.open('https://claude.ai/new', '_blank', 'noopener,noreferrer') : hostedRelayAction('link')));
  if (s.endpoint) {
    const details = _connEl('details'), summary = _connEl('summary', 'conn-note', 'Connection details and troubleshooting'); details.appendChild(summary);
    const url = _connEl('code', 'conn-note', s.endpoint); url.style.overflowWrap = 'anywhere'; details.appendChild(url);
    const tools = _connEl('div', 'assistant-actions');
    tools.appendChild(_connCopyBtn(s.endpoint, 'Copy connector URL'));
    tools.appendChild(_connBtn('Revoke Claude access', 'unlink', 'btn-ghost', () => hostedRelayAction('revoke')));
    tools.appendChild(_connBtn('Disconnect relay', 'unplug', 'btn-ghost', () => hostedRelayAction('disconnect')));
    details.appendChild(tools);
    details.appendChild(_connEl('p', 'conn-note', 'If Claude loses the connection details after sign-in, return here and press Continue in Claude again. You can also paste this URL in Claude Customize → Connectors → Add custom connector.'));
    card.appendChild(details);
  }
  card.appendChild(actions);
  if (s.error) card.appendChild(_connEl('p', 'conn-note', s.error));
  for (const r of s.requests || []) {
    const row = _connEl('div', 'callout info'); row.append(_connEl('p', null, 'Match this code with the Claude sign-in tab:'), _connEl('strong', null, r.displayCode), _connEl('p', null, 'Allows dashboard reads and proposals. Approve only the sign-in you started.'));
    row.appendChild(_connBtn('Approve matching code', 'check', 'btn-primary', b => { b.disabled = true; hostedRelayAction('approve', { id: r.id, code: r.displayCode }).finally(() => { b.disabled = false; }); })); card.appendChild(row);
  }
  return card;
}
