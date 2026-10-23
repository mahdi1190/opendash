/* ============================================================
   ACCOUNTS on the Connections tab: the pure helpers (no DOM, no fetch).
   docs/dev/ACCOUNTS.md. The page (56-accounts.js) draws with these;
   tests/accounts-ui.test.mjs runs them in a sandbox. Plain words only: no
   client IDs, ports or jargon in anything a user reads.
   ============================================================ */
const ACC_MS_CONSUMER = /^(?:hotmail|outlook|live|msn|windowslive|passport)\.(?:com|net|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/;
const ACC_PUBLIC_MAIL = /^(?:gmail\.com|googlemail\.com|yahoo\.(?:com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})|ymail\.com|icloud\.com|me\.com|mac\.com|aol\.(?:com|co\.uk)|proton\.me|protonmail\.com|pm\.me|gmx\.(?:com|de|net|co\.uk)|btinternet\.com|sky\.com|virginmedia\.com)$/;

/** A plausible email address (trimmed, lower case) or ''. */
function accCleanEmail(s) {
  const e = String(s == null ? '' : s).trim().toLowerCase();
  return e.length <= 254 && /^[^\s@<>()",;:\\[\]]{1,64}@[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/.test(e) ? e : '';
}
/** 'personal' for Hotmail/Outlook/Live and public mail addresses, else 'work'. Mirrors lib/accounts/microsoft.mjs guessKind. */
function accGuessKind(email) {
  const e = accCleanEmail(email);
  const d = e ? e.slice(e.lastIndexOf('@') + 1) : '';
  return ACC_MS_CONSUMER.test(d) || ACC_PUBLIC_MAIL.test(d) ? 'personal' : 'work';
}
function accKindText(kind) { return kind === 'work' ? 'Work or school account' : 'Personal account'; }
/** The name people know the service by. */
function accProviderName(a) {
  if (!a) return 'Email';
  if (a.provider === 'microsoft') return a.kind === 'work' ? 'Microsoft 365' : 'Outlook';
  if (a.provider === 'google') return a.kind === 'work' ? 'Google Workspace' : 'Gmail';
  return 'Email';
}
/** The brand mark for _connMark (56-connections-brands.js). */
function accBrand(a) { return a && a.provider === 'microsoft' ? 'outlook' : a && a.provider === 'google' ? 'gmail' : null; }

/**
 * How an account's card looks and what its main button does.
 * -> {tone: 'ok'|'warn'|'off', label, note, primary: {id, label} | null, secondary: [{id, label}]}
 * ids: 'sync' | 'sign-in' | 'approval' | 'resume' | 'fetch-here'
 */
function accStatusView(a) {
  const name = accProviderName(a);
  const here = (a && a.here) || { fetcher: true, signedIn: true };
  if (!a) return { tone: 'off', label: 'Not connected', note: null, primary: null, secondary: [] };
  if (a.status === 'paused') return { tone: 'off', label: 'Paused', note: 'Nothing new is read while it is paused. What was already read stays here.', primary: { id: 'resume', label: 'Resume' }, secondary: [] };
  if (a.status === 'needs-admin-approval') {
    return { tone: 'warn', label: 'Waiting for your organisation', note: 'Your organisation needs to approve OpenDash once. Ask your IT team, then press Try again.',
      primary: { id: 'approval', label: 'Ask for approval' }, secondary: [{ id: 'sign-in', label: 'Try again' }] };
  }
  if (!here.fetcher) {
    return { tone: 'ok', label: 'Connected', note: 'Your other computer checks this account. What it reads appears here too.',
      primary: null, secondary: [{ id: 'fetch-here', label: 'Fetch on this computer instead' }] };
  }
  if (a.status === 'needs-sign-in') return { tone: 'warn', label: 'Sign in again', note: `${name} asked you to sign in again. Your saved mail and events are still here.`, primary: { id: 'sign-in', label: 'Sign in again' }, secondary: [] };
  return { tone: 'ok', label: 'Connected', note: a.error && a.error.message ? a.error.message : null, primary: { id: 'sync', label: 'Check now' }, secondary: [] };
}
/** Mail ✓ Calendar ✓ */
function accFeatureList(a) {
  const f = (a && a.features) || {};
  return [{ id: 'mail', label: 'Mail', on: f.mail !== false }, { id: 'calendar', label: 'Calendar', on: f.calendar !== false }];
}
/** "synced 4 min ago", from the server's text, else worked out here. */
function accSyncedText(a, now) {
  if (a && a.status === 'needs-admin-approval') return 'not synced yet';
  if (a && a.syncedText) return a.syncedText;
  const t = Date.parse((a && a.lastSync) || '');
  if (!Number.isFinite(t)) return 'not synced yet';
  const m = Math.max(0, Math.round(((now == null ? Date.now() : now) - t) / 60000));
  return m < 1 ? 'synced just now' : m < 60 ? `synced ${m} min ago` : m < 1440 ? `synced ${Math.round(m / 60)} hour${Math.round(m / 60) === 1 ? '' : 's'} ago` : `synced ${Math.round(m / 1440)} day${Math.round(m / 1440) === 1 ? '' : 's'} ago`;
}
/** Where the browser goes to sign in (the server answers with a redirect to the provider). */
function accBeginUrl(o) {
  o = o || {};
  const q = new URLSearchParams({ provider: o.provider || 'microsoft' });
  if (o.email) q.set('email', accCleanEmail(o.email) || String(o.email).trim());
  if (o.kind === 'personal' || o.kind === 'work') q.set('kind', o.kind);
  if (o.accountId) q.set('accountId', o.accountId);
  if (o.features && typeof o.features === 'object') q.set('features', ['mail', 'calendar'].filter(k => o.features[k]).join(','));
  return '/api/accounts/begin?' + q.toString();
}
/** Personal before work, then by provider and address. */
function accSort(list) {
  const rank = { microsoft: 0, google: 1, imap: 2 };
  return (list || []).slice().sort((x, y) => (x.kind === 'work') - (y.kind === 'work') || (rank[x.provider] ?? 9) - (rank[y.provider] ?? 9) || String(x.email).localeCompare(String(y.email)));
}
/** The three add buttons, in the order people expect. */
function accAddButtons(providers) {
  const p = providers || {};
  return [
    { id: 'google', label: '+ Add Google account', available: !!(p.google && p.google.available) },
    { id: 'microsoft', label: '+ Add Microsoft account', available: !(p.microsoft && p.microsoft.available === false) },
    { id: 'other', label: '+ Other email', available: !!(p.imap && p.imap.available) },
  ];
}
/** What the email box says under it while the user types. */
function accEmailHint(email, provider) {
  const e = accCleanEmail(email);
  if (!e) return String(email || '').trim() ? 'Type the whole address, for example name@outlook.com.' : '';
  if (provider === 'google') return 'Next, Google opens so you can sign in.';
  return accGuessKind(e) === 'personal' ? 'Personal Microsoft account. Next, Microsoft opens so you can sign in.' : 'Work or school account. Next, Microsoft opens so you can sign in.';
}
/** A sign-in started from this page is still worth waiting for (ten minutes, as on the server). */
function accSignInPending(startedAt, now) { return !!startedAt && (now == null ? Date.now() : now) - startedAt < 600000; }
/** What changed after a sign-in: the first new or newly connected account, or null. */
function accNewlyConnected(before, after) {
  const was = new Map((before || []).map(a => [a.id, a.status]));
  return (after || []).find(a => a.status === 'connected' && was.get(a.id) !== 'connected') || null;
}
