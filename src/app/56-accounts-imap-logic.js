/* ============================================================
   "+ OTHER EMAIL" (IMAP with an app password): the pure helpers of the
   guided flow (no DOM, no fetch). The drawer (56-accounts-imap.js) draws
   with these; tests/accounts-imap-ui.test.mjs runs them in a sandbox.
   The steps and server facts come from the server (lib/accounts/imap-
   providers.mjs, POST /api/accounts/imap/lookup); this file decides what
   each screen says and does. Plain words only: no ports, TLS or IMAP
   jargon unless the user opened "Server settings".
   ============================================================ */
const IMAP_SERVICE_NAMES = { yahoo: 'Yahoo Mail', aol: 'AOL Mail', icloud: 'iCloud Mail', gmx: 'GMX', zoho: 'Zoho Mail', fastmail: 'Fastmail', proton: 'Proton Mail' };

/** What people call the service of an IMAP account card ("Yahoo Mail", or the address's domain). */
function imapServiceName(a) {
  const s = a && a.server && a.server.service;
  if (s && IMAP_SERVICE_NAMES[s]) return IMAP_SERVICE_NAMES[s];
  const e = String((a && a.email) || '');
  return e.includes('@') ? e.slice(e.lastIndexOf('@') + 1) : 'Email';
}

/** The address box: {ok, email, hint}. */
function imapEmailCheck(value) {
  const raw = String(value == null ? '' : value).trim();
  const email = raw.toLowerCase();
  if (!raw) return { ok: false, email: '', hint: '' };
  if (!/^[^\s@<>()",;:\\[\]]{1,64}@[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?)+$/.test(email)) {
    return { ok: false, email: '', hint: raw.includes('@') ? 'Check the address: it looks like name@example.com.' : 'Type your whole email address, with the @ and the part after it.' };
  }
  return { ok: true, email, hint: '' };
}

/**
 * The screen after the address, from the server's lookup.
 * -> {kind: 'redirect'|'password'|'invalid', ...}
 *   redirect: {provider: 'google'|'microsoft', title, text, button}
 *   password: {title, name, intro, steps, tips, open: {label, url}|null, askUsername, usernameLabel,
 *              passwordLabel, passwordPlaceholder, showServer, server, serverNote, bridge, calendar}
 */
function imapScreenFor(info) {
  const p = info || {};
  if (p.kind === 'invalid' || !p.kind) return { kind: 'invalid', text: p.message || 'Type your whole email address, for example name@yahoo.com.' };
  if (p.kind === 'redirect') {
    const google = p.provider === 'google';
    return { kind: 'redirect', provider: google ? 'google' : 'microsoft', title: google ? 'This is a Google address' : 'This is a Microsoft address',
      text: p.message || '', button: google ? 'Continue with Google' : 'Continue with Microsoft' };
  }
  const other = p.kind === 'other';
  const name = other ? p.domain || 'your email' : p.name;
  return {
    kind: 'password', title: 'Connect ' + name,
    name, id: p.id || 'other',
    intro: p.intro || { title: 'What is an app password?', text: '' },
    steps: Array.isArray(p.steps) ? p.steps.slice() : [],
    tips: Array.isArray(p.tips) ? p.tips.slice() : [],
    open: p.appPassword && p.appPassword.url ? { label: p.appPassword.button || 'Open the app password page', url: p.appPassword.url } : null,
    askUsername: !!p.bridge,
    usernameLabel: p.bridge ? 'User name from Bridge' : 'User name',
    passwordLabel: p.bridge ? 'Password from Bridge' : other || (p.appPassword && p.appPassword.required === false) ? 'App password (or your email password)' : 'App password',
    passwordPlaceholder: p.id === 'icloud' ? 'abcd-efgh-ijkl-mnop' : 'Paste it here',
    showServer: other,
    server: { host: (p.imap && p.imap.host) || '', port: (p.imap && p.imap.port) || 993, security: (p.imap && p.imap.security) || 'tls' },
    serverNote: other ? 'We guessed your mail server. If the test cannot reach it, check the server name on your provider’s help pages.' : 'You do not need to change these.',
    bridge: !!p.bridge,
    calendar: p.calendar || { ics: false, text: '' },
    webmail: p.webmail || '',
  };
}

/**
 * A soft hint while pasting: does it look like this service's app password?
 * Never blocks the test (the server decides). '' when it looks fine or we cannot tell.
 */
function imapPasswordHint(pw, id) {
  const s = String(pw == null ? '' : pw).trim();
  if (!s) return '';
  const compact = s.replace(/\s+/g, '');
  if (id === 'icloud' && !/^[a-z]{4}-[a-z]{4}-[a-z]{4}-[a-z]{4}$/i.test(compact)) return 'Apple’s app-specific passwords look like abcd-efgh-ijkl-mnop. Your Apple Account password will not work here.';
  if ((id === 'yahoo' || id === 'aol') && !/^[a-z]{16}$/i.test(compact)) return `${IMAP_SERVICE_NAMES[id]} app passwords are 16 letters. Your normal password will not work here.`;
  if (id === 'fastmail' && !/^[a-z0-9]{16}$/i.test(compact)) return 'Fastmail app passwords are 16 letters and numbers. Your normal password will not work here.';
  return '';
}

/** The request body for POST /api/accounts/imap/connect from the form. */
function imapConnectBody(form, screen, account) {
  const f = form || {};
  const body = { email: String(f.email || '').trim().toLowerCase(), password: String(f.password == null ? '' : f.password) };
  if (f.username && String(f.username).trim()) body.username = String(f.username).trim();
  // The server only when the user saw and could change it (Other, or Server settings opened).
  if (screen && (screen.showServer || f.serverOpened) && f.host) {
    body.host = String(f.host).trim();
    if (f.port !== '' && f.port != null) body.port = Number(f.port);
    body.security = f.security === 'starttls' ? 'starttls' : 'tls';
  }
  if (account && account.id) body.accountId = account.id;
  return body;
}

/**
 * What to show after a failed test. err: {code, message} from the server.
 * -> {title, text, focus: 'password'|'server'|'username'|'email'|null, showSteps, openServer, redirect?}
 */
function imapErrorView(err, screen) {
  const code = (err && err.code) || 'FAILED';
  const text = (err && err.message) || 'Something went wrong. Try again.';
  const name = (screen && screen.name) || 'your email provider';
  const v = (title, focus, extra) => Object.assign({ title, text, focus, showSteps: false, openServer: false }, extra || {});
  switch (code) {
    case 'WRONG_PASSWORD': return v('That password did not work', screen && screen.askUsername ? 'username' : 'password', { showSteps: true });
    case 'APP_PASSWORD_NEEDED': return v('You need an app password', 'password', { showSteps: true });
    case 'TWO_STEP_NEEDED': return v('Turn on two-step verification first', 'password', { showSteps: true });
    case 'IMAP_DISABLED': return v('Email access for apps is switched off', 'password', { showSteps: true });
    case 'IMAP_UNREACHABLE': return v('OpenDash could not reach the mail server', 'server', { openServer: true });
    case 'IMAP_NOT_TRUSTED': return v('The connection could not be checked', 'server', { openServer: true });
    case 'IMAP_NOT_SECURE': return v('The connection is not secure', 'server', { openServer: true });
    case 'BRIDGE_NOT_RUNNING': return v('Proton Mail Bridge is not running', null, { showSteps: true });
    case 'PROVIDER_BUSY': case 'PROVIDER_NETWORK': return v(`${name} did not answer in time`, null);
    case 'USE_ONE_CLICK': return v('Use the one-click button', 'email', { redirect: (err && err.retryProvider) || (/google|gmail/i.test(text) ? 'google' : 'microsoft') });
    case 'BAD_REQUEST': return v('Check what you typed', /server/i.test(text) ? 'server' : /address/i.test(text) ? 'email' : 'password', { openServer: /server|port/i.test(text) });
    case 'NETWORK': return v('OpenDash is not answering', null, { text: 'OpenDash itself did not answer. Check it is still running, then try again.' });
    default: return v('That did not work', null);
  }
}

/** The "Connected" screen. result: the connect answer {account, inbox, results}. */
function imapDoneView(result, screen) {
  const r = result || {};
  const n = r.inbox && Number.isFinite(Number(r.inbox.exists)) ? Number(r.inbox.exists) : null;
  const mail = (r.results || []).find((x) => x.feature === 'mail');
  const email = (r.account && r.account.email) || '';
  const lines = [n == null ? `${email} is connected.` : `${email} is connected. Your inbox has ${n === 1 ? '1 message' : n.toLocaleString('en-GB') + ' messages'}.`];
  if (mail && mail.ok) lines.push(mail.count ? `The last two weeks of mail (${mail.count}) are now in OpenDash.` : 'There is no mail from the last two weeks yet. New mail appears here on its own.');
  else if (mail && !mail.ok) lines.push('Reading your mail needs another try. OpenDash tries again on its own.');
  lines.push('OpenDash only reads. It never sends, changes or deletes your mail.');
  const cal = (screen && screen.calendar) || { ics: false };
  const short = screen && screen.id && screen.id !== 'other' && screen.name ? screen.name.replace(/ Mail$/, '') + ' ' : '';
  return {
    title: 'Connected', lines,
    calendar: cal.ics ? { ics: true, title: `Add your ${short}calendar too?`, label: `${short}calendar`.replace(/^./, (c) => c.toUpperCase()), steps: cal.steps || [], url: cal.url || '', button: cal.button || '', note: cal.note || '' }
      : { ics: false, text: cal.text || '' },
  };
}

/** The card's main button and words for an IMAP account that needs a new app password. */
function imapNeedsPasswordView(a) {
  return {
    tone: 'warn', label: 'Sign in again',
    note: `The app password for ${imapServiceName(a)} stopped working (it may have been deleted or changed). Make a new one and paste it here. Your saved mail is still here.`,
    primary: { id: 'sign-in', label: 'Paste a new app password' }, secondary: [],
  };
}
