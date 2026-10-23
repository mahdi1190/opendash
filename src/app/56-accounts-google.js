/* Google accounts in Connections (docs/dev/ACCOUNTS.md, "Google specifics").
   The shared account list (56-accounts*.js) owns "+ Add Google account" and
   the list itself; this file adds what is Google's own:
     googleAddAccount({email, accountId, features, custom, info})
         the card before the browser goes to Google: which features to allow
         (email, calendar: separate ticks), and what Google's "Google hasn't
         verified this app" screen means and how to get past it; then Google
         in a new tab through the list's accOpenSignIn (GET /api/accounts/begin
         with features=), else POST /api/accounts/begin. info = providers.google:
         with no Google app at all it shows googleSetupNeeded instead.
     googleSetupNeeded(info)   no Google app in this copy: coming soon (your own app: Settings > Advanced).
     googleAdvancedFold(el, google, {onChange})
         Advanced: use your own Google app (PUT /api/accounts/google-app).
   window.AccountProviders.google = {signIn, setup, advanced, permissions} is
   how the shared list finds them. No token or secret ever reaches this page:
   a saved client secret is never sent back, only whether there is one. */

const GOOGLE_PERMISSIONS = Object.freeze([
  { id: 'mail', label: 'Read your email', text: 'Who wrote, the subject and Google’s short preview, for Email triage and People. OpenDash never sends, deletes, labels or archives anything.' },
  { id: 'calendar', label: 'See your calendars', text: 'Your events next to your tasks. OpenDash never changes them.' },
]);
const _GOOGLE_EMAIL_RE = /^[^\s@<>()",;:\\[\]]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,24}$/;

/** The words for Google's warning screen, for the built-in app or the user's own. */
function googleUnverifiedSteps(custom) {
  const name = custom ? 'the name you gave your Google app' : 'OpenDash';
  return [
    'Choose your Google account (or type the address).',
    'Google shows “Google hasn’t verified this app”. Click Advanced, at the bottom left.',
    `Click “Go to ${name} (unsafe)”.`,
    'Tick the boxes for what you chose here, then click Continue.',
  ];
}

/** Build the explanation card into el. Returns {features(), email()} readers. */
function googleSignInCard(el, { email = '', features = null, custom = false, reconnect = false } = {}) {
  const want = features || { mail: true, calendar: true };
  // 1. The address
  const field = _connEl('label', 'field');
  field.appendChild(_connEl('span', 'field-label', 'Google account'));
  const input = document.createElement('input');
  input.className = 'control'; input.type = 'email'; input.autocomplete = 'email'; input.placeholder = 'name@gmail.com';
  input.value = email || ''; input.setAttribute('aria-label', 'Google account email address');
  if (reconnect) input.readOnly = true; else input.setAttribute('autofocus', '');
  field.appendChild(input); el.appendChild(field);
  // 2. What OpenDash may read: two separate ticks
  el.appendChild(_connEl('h3', 'conn-name', 'What OpenDash may read'));
  const ticks = {};
  for (const p of GOOGLE_PERMISSIONS) {
    const row = _connEl('label', 'conn-tick');
    const box = document.createElement('input'); box.type = 'checkbox'; box.checked = want[p.id] !== false; box.dataset.feature = p.id;
    const words = _connEl('span', 'conn-tick-t');
    words.append(_connEl('b', '', p.label), _connEl('span', 'conn-note', p.text));
    row.append(box, words); el.appendChild(row); ticks[p.id] = box;
  }
  el.appendChild(_connEl('p', 'conn-note', 'Read-only. Your mail and events go straight from Google to this computer; there is no OpenDash server in between.'));
  // 3. Google's warning screen, before it appears
  const warn = _connEl('section', 'conn-card google-unverified');
  warn.setAttribute('role', 'note');
  warn.appendChild(_connEl('h3', 'conn-name', 'Google will show a warning first'));
  warn.appendChild(_connEl('p', 'conn-text', custom
    ? 'Your own Google app has not been through Google’s review, so Google says “Google hasn’t verified this app”. That is expected for an app you made yourself.'
    : 'Google reviews apps that read Gmail through a paid security assessment. This copy of OpenDash runs on your own computer and has not been through it, so Google says “Google hasn’t verified this app”. It is not a sign that something is wrong.'));
  warn.appendChild(_connEl('p', 'conn-text', 'It is your own app: nobody else sees what it reads, and you can remove its access at any time at myaccount.google.com/permissions.'));
  warn.appendChild(_connSteps(googleUnverifiedSteps(custom)));
  el.appendChild(warn);
  const err = _connEl('p', 'conn-note'); err.setAttribute('role', 'alert'); err.hidden = true; el.appendChild(err);
  return {
    email: () => String(input.value || '').trim().toLowerCase(),
    features: () => ({ mail: !!ticks.mail.checked, calendar: !!ticks.calendar.checked }),
    error: (msg) => { err.textContent = msg || ''; err.hidden = !msg; },
  };
}

/** What is wrong with a choice before anything is sent, or ''. */
function googleChoiceProblem(email, f) {
  if (!_GOOGLE_EMAIL_RE.test(email || '')) return 'Type the full Google address, for example name@gmail.com.';
  if (!f || (!f.mail && !f.calendar)) return 'Tick email, calendar or both.';
  return '';
}

/** Go to Google: an empty tab first (a blocked pop-up is detectable), then the sign-in address from the server. */
async function _googleBegin({ email, accountId, features }, popup) {
  try {
    const r = await _srcApi('/api/accounts/begin', { method: 'POST', body: { provider: 'google', email, features, ...(accountId ? { accountId } : {}) } });
    const url = String(r && r.url || '');
    if (!/^https:\/\/accounts\.google\.com\//.test(url)) throw new Error('OpenDash could not start the Google sign-in. Try again.');
    if (popup) { popup.opener = null; popup.location.replace(url); toast('Finish in the Google tab, then come back here.', { icon: 'external-link' }); return true; }
    toast('The sign-in tab did not open. You can sign in in this tab instead.', { kind: 'info', timeout: 8000, action: { label: 'Sign in here', run: () => location.assign(url) } });
    return true;
  } catch (e) {
    if (popup) try { popup.close(); } catch (_) { /* already closed */ }
    toast((e && e.message) || 'OpenDash could not start the Google sign-in.', { kind: 'err' });
    return false;
  }
}

/** "+ Add Google account" (or "Sign in again" with accountId): the card, then Google. */
function googleAddAccount({ email = '', accountId = null, features = null, custom = false, info = null } = {}) {
  // No Google app in this copy (and none of the user's own yet): explain, and offer Advanced.
  if (info && info.available === false) return googleSetupNeeded(info);
  return new Promise((resolve) => {
    let card = null, done = false;
    openDialog({
      title: accountId ? 'Sign in to Google again' : 'Add a Google account', width: 560, resizeKey: 'google-sign-in',
      body: (el) => {
        card = googleSignInCard(el, { email, features, custom: custom || !!(info && info.custom), reconnect: !!accountId });
        // (Your own Google app: Settings > Advanced, 58-settings-advanced.js; never on this card.)
      },
      actions: [
        { label: 'Cancel', run: () => { done = true; resolve(null); } },
        { label: 'Continue to Google', primary: true, icon: 'external-link', run: () => {
          const choice = { email: card.email(), features: card.features(), accountId };
          const problem = googleChoiceProblem(choice.email, choice.features);
          if (problem) { card.error(problem); return false; }
          done = true;
          // "Sign in again" keeps the account's own Mail/Calendar choice: a box changed here changes it.
          const saveChoice = () => {
            if (!accountId || !features) return;
            const changed = {};
            for (const k of ['mail', 'calendar']) if (!!features[k] !== !!choice.features[k]) changed[k] = choice.features[k];
            if (Object.keys(changed).length) _srcApi('/api/accounts/features', { method: 'POST', body: { id: accountId, ...changed } }).catch(() => {});
          };
          // The account list (56-accounts.js) opens the sign-in tab inside this click and notices the return.
          if (typeof accOpenSignIn === 'function') {
            accOpenSignIn({ provider: 'google', email: choice.email, features: choice.features, ...(accountId ? { accountId } : {}) });
            saveChoice();
            if (typeof accWaiting === 'function') openDrawer({ title: accountId ? 'Sign in to Google again' : 'Add a Google account', width: 520, body: (el, close) => el.appendChild(accWaiting('Google', close)) });
            resolve(choice);
            return;
          }
          let popup = null;
          try { popup = window.open('about:blank', '_blank'); } catch (_) { popup = null; }
          saveChoice();
          _googleBegin(choice, popup).then((ok) => resolve(ok ? choice : null));
        } },
      ],
      onClose: () => { if (!done) resolve(null); },
    });
  });
}

/** "+ Add Google account" when this copy has no Google app: coming soon (the own app lives in Settings > Advanced). */
function googleSetupNeeded(info = {}) {
  return new Promise((resolve) => {
    openDrawer({ title: 'Add a Google account', width: 560, onClose: () => resolve(null), body: (el) => {
      el.appendChild(_connEl('h3', 'conn-name', 'Coming soon'));
      el.appendChild(_connEl('p', 'conn-text', 'Adding a Google account with one click is coming soon in this copy of OpenDash.'));
      el.appendChild(_connEl('p', 'conn-note', 'Until then, Gmail can come in through + Other email with an app password, or through Claude: choose Add connection at the top of this page. People who look after IT can use their own Google app in Settings > Advanced.'));
    } });
  });
}

/**
 * Advanced: the user's own Google app. google = providers.google from GET
 * /api/accounts ({available, custom, builtIn, hasSecret, clientIdHint}).
 */
function googleAdvancedFold(el, google = {}, { onChange } = {}) {
  const box = _connEl('details', 'cp-advanced google-own-app');
  const summary = _connEl('summary', '', 'Advanced: use your own Google app');
  box.appendChild(summary);
  const body = _connEl('div', 'cp-advanced-body');
  body.appendChild(_connEl('p', 'conn-note', google.custom
    ? `Google sign-ins on this computer use your own Google app (${google.clientIdHint || 'saved'}${google.hasSecret ? ', with its secret' : ', no secret'}).`
    : google.builtIn ? 'Google sign-ins use the app built into this copy of OpenDash. Most people never need to change this.'
      : 'This copy of OpenDash has no built-in Google app. Make your own once (about 10 minutes), then paste its client ID and secret here.'));
  body.appendChild(_connSteps([
    'At console.cloud.google.com, create a project.',
    'APIs & Services > Library: enable the Gmail API and the Google Calendar API.',
    'Google Auth Platform > Branding: app name (for example OpenDash) and your email. Audience: External, then Publish app, so sign-ins do not stop after 7 days.',
    'Data access: add .../auth/calendar.readonly and .../auth/gmail.readonly.',
    'Clients > Create client > Desktop app. Copy the client ID and the client secret (or download the JSON and paste it).',
  ]));
  const id = document.createElement('textarea'); id.className = 'control'; id.rows = 2;
  id.placeholder = 'Client ID (….apps.googleusercontent.com), or the JSON from Google Cloud'; id.setAttribute('aria-label', 'Google client ID or JSON');
  const secret = document.createElement('input'); secret.className = 'control'; secret.type = 'password'; secret.autocomplete = 'off';
  secret.placeholder = google.custom && google.hasSecret ? 'Client secret (leave empty to keep the saved one)' : 'Client secret'; secret.setAttribute('aria-label', 'Google client secret');
  body.append(id, secret);
  body.appendChild(_connEl('p', 'conn-note', 'Kept on this computer only. Accounts signed in with a different Google app will need to sign in again.'));
  const actions = _connEl('div', 'assistant-actions');
  const save = async (payload, b) => {
    if (b) b.disabled = true;
    try {
      const out = await _srcApi('/api/accounts/google-app', { method: 'PUT', body: payload });
      id.value = ''; secret.value = '';
      toast(payload.clientId ? 'Your Google app is saved.' : 'Google sign-ins use the built-in app again.', { kind: 'ok' });
      if (typeof onChange === 'function') onChange(out);
    } catch (e) { toast((e && e.message) || 'The Google app could not be saved.', { kind: 'err' }); }
    finally { if (b) b.disabled = false; }
  };
  actions.appendChild(_connBtn('Save my Google app', 'check', 'btn-primary', (b) => {
    const raw = String(id.value || '').trim();
    if (!raw) { toast('Paste the client ID first.', { kind: 'err' }); return; }
    let payload = { clientId: raw, clientSecret: String(secret.value || '').trim() || null };
    if (raw.startsWith('{')) payload = { json: raw, ...(payload.clientSecret ? { clientSecret: payload.clientSecret } : {}) };
    return save(payload, b);
  }));
  if (google.custom && google.builtIn) actions.appendChild(_connBtn('Use the built-in app', 'rotate-ccw', 'btn-secondary', (b) => save({ clientId: null }, b)));
  body.appendChild(actions);
  box.appendChild(body); el.appendChild(box);
  return box;
}

if (typeof window !== 'undefined') {
  window.AccountProviders = Object.assign(window.AccountProviders || {}, {
    google: { signIn: googleAddAccount, setup: googleSetupNeeded, advanced: googleAdvancedFold, permissions: GOOGLE_PERMISSIONS, unverifiedSteps: googleUnverifiedSteps },
  });
}
