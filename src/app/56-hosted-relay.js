// OpenDash's link service (the shared public link): ordinary users never configure a tunnel or a hostname.
let _hostedRelayState = null, _hostedRelayBusy = false, _hostedRelayTimer = null;
function hostedRelayInstallUrl(endpoint) {
  const connectorPage = 'https://claude.ai/customize/connectors';
  const url = new URL(connectorPage);
  url.search = new URLSearchParams({ modal: 'add-custom-connector', connectorName: 'OpenDash', connectorUrl: endpoint }).toString();
  return url.href;
}
async function _hostedRelayApi(action, body) {
  const r = await fetch('/api/connections/hosted-relay' + (action ? '/' + action : ''), action ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) } : { cache: 'no-store' });
  const out = await r.json(); if (!r.ok) throw new Error(out.error || 'OpenDash’s link service didn’t answer'); return out;
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
      toast(signIn && !signIn.closed ? 'Sign in and approve OpenDash in Claude, then match the approval code here' : 'Your link is ready. Press Continue in Claude to sign in and approve', { kind: 'ok' });
    } else toast(action === 'approve' ? 'Code approved. Return to the Claude sign-in tab' : action === 'disconnect' ? 'Disconnected from Claude' : 'Claude’s access revoked', { kind: 'ok' });
    if (state.view === 'connections') renderMain();
    if (typeof _obOpen !== 'undefined' && _obOpen) connRefresh({ force: true });
  } catch (e) { if (signIn && !signIn.closed) signIn.close(); toastError(action === 'link' ? 'link Claude' : action === 'approve' ? 'approve the code' : action === 'revoke' ? 'revoke Claude’s access' : 'disconnect', e, () => hostedRelayAction(action, body)); }
}
function hostedRelayCard(compact = false) {
  if (!_hostedRelayState && !_hostedRelayBusy) hostedRelayRefresh();
  if (!_hostedRelayTimer) _hostedRelayTimer = setInterval(() => { const card = document.querySelector('[data-conn="hosted-relay"]'); if (!document.hidden && card && (!card.closest('details') || card.closest('details').open)) hostedRelayRefresh(); }, 5000);
  const s = _hostedRelayState || {}, card = _connEl('section', 'card conn-card'); card.dataset.conn = 'hosted-relay';
  const head = _connEl('div', 'conn-head'), mark = _connEl('span', 'conn-ic'); mark.innerHTML = _connMark('claude');
  const names = _connEl('div', 'conn-titles'); names.append(_connEl('div', 'conn-name', 'Claude in your browser'));
  head.append(mark, names); card.appendChild(head);
  // Status first (card template): Linked / Ready to link / Offline, or "Not available in this copy yet" when unpublished.
  card.appendChild(!s.available ? setStatusLine('off', 'Not available in this copy yet')
    : s.linked && s.online ? setStatusLine('ok', 'Linked')
      : s.configured ? (s.online ? setStatusLine('idle', 'Ready for Claude', 'Continue in Claude') : setStatusLine('idle', 'Offline'))
        : setStatusLine('off', 'Not set up', 'Ready to link'));
  card.appendChild(_connEl('p', 'conn-text', 'claude.ai can read your tasks and suggest changes you approve here.'));
  if (!s.available) return card;
  const actions = _connEl('div', 'set-action');
  actions.appendChild(uiButton({ label: s.linked && s.online ? 'Open Claude' : s.configured ? 'Continue in Claude' : 'Link Claude', icon: 'external-link', kind: 'primary', size: 'sm', run: () => s.linked && s.online ? window.open('https://claude.ai/new', '_blank', 'noopener,noreferrer') : hostedRelayAction('link') }));
  card.appendChild(actions);
  if (s.error) card.appendChild(_connEl('p', 'conn-note', s.error));
  for (const r of s.requests || []) {
    const row = _connEl('div', 'callout info'); row.append(_connEl('p', null, 'Match this code with the Claude sign-in tab:'), _connEl('strong', null, r.displayCode), _connEl('p', null, 'Allows reads and suggestions only. Approve only the sign-in you started.'));
    row.appendChild(uiButton({ label: 'Approve matching code', icon: 'check', kind: 'primary', size: 'sm', run: (e, b) => { b.disabled = true; hostedRelayAction('approve', { id: r.id, code: r.displayCode }).finally(() => { b.disabled = false; }); } })); card.appendChild(row);
  }
  setFold(card, 'conn-hosted-more', 'More', ({ body }) => {
    body.appendChild(_connEl('p', 'conn-note', compact ? 'Sign in and approve in your browser; keep OpenDash running.' : 'Press Link Claude, sign in in your browser and approve OpenDash. We fill in the details for you; match the approval code here to finish. Keep OpenDash running.'));
    body.appendChild(_connEl('p', 'conn-note', 'Requests from Claude and the tasks it asks for pass through OpenDash’s link service. Your dashboard stays on this computer; Claude’s changes are suggestions you approve in OpenDash.'));
    if (!s.endpoint) return;
    const url = _connEl('code', 'conn-note', s.endpoint); url.style.overflowWrap = 'anywhere'; body.appendChild(url);   // a long address: wrap anywhere
    const tools = _connEl('div', 'assistant-actions');
    tools.appendChild(_connCopyBtn(s.endpoint, 'Copy link', 'link'));
    tools.appendChild(uiButton({ label: 'Revoke Claude’s access', icon: 'unlink', kind: 'ghost', size: 'sm', run: () => hostedRelayAction('revoke') }));
    tools.appendChild(uiButton({ label: 'Disconnect', icon: 'unplug', kind: 'ghost', size: 'sm', run: () => hostedRelayAction('disconnect') }));
    body.appendChild(tools);
    body.appendChild(_connEl('p', 'conn-note', 'If Claude loses the details after sign-in, come back and press Continue in Claude. You can also paste this link in Claude’s Customize > Connectors > Add custom connector.'));
  });
  return card;
}
