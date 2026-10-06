// A user-started sign-in is checked on return. Ordinary tab focus never starts
// a model job or syncs bank data. No credentials are passed through the browser.
let _connReturningSignIn = null, _connVerifyingSignIn = false;
function connCloudSignIn(source, legacyId) {
  _connReturningSignIn = { source, legacyId, at: Date.now() };
  window.open('https://claude.ai/customize/connectors', '_blank', 'noopener,noreferrer');
  toast('Sign in to the connector in Claude. OpenDash will verify it when you return.', { icon: 'external-link' });
}
async function connVerifySignInReturn() {
  const pending = _connReturningSignIn;
  if (!pending || _connVerifyingSignIn || document.hidden) return;
  if (Date.now() - pending.at > 10 * 60000) { _connReturningSignIn = null; return; }
  if (Date.now() - pending.at < 1000) return;
  _connReturningSignIn = null; _connVerifyingSignIn = true;
  try {
    if (pending.source) {
      if (SourcesStore.busy[pending.source.id]) return;
      // Use the normal read-only update, not just the MCP transport status.
      await _srcSync(pending.source);
      const fresh = SourcesStore.data && SourcesStore.data.sources.find(s => s.id === pending.source.id);
      if (fresh && fresh.health && fresh.health.state === 'ok' && fresh.lastSync && Date.parse(fresh.lastSync) >= pending.at) toast('Connection verified and data updated.', { kind: 'ok' });
      else toast('Sign-in returned, but the data update did not succeed. Check the source’s message.', { kind: 'err' });
    } else if (pending.legacyId) await connCheck(pending.legacyId);
    if (typeof connRefresh === 'function') await connRefresh();
  } finally { _connVerifyingSignIn = false; }
}
if (typeof window !== 'undefined') {
  window.addEventListener('focus', connVerifySignInReturn);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) connVerifySignInReturn(); });
}
