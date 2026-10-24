/* ============================================================
   SETTINGS > ADVANCED: for IT teams and developers
   ============================================================
   "Use your own Microsoft app" and "Use your own Google app": the only place
   a client ID appears (docs/dev/MICROSOFT_CONNECT.md, GOOGLE_CONNECT.md). The
   Connections cards never show these: there "+ Add Microsoft account" and
   "+ Add Google account" are greyed out with "Coming soon" until this copy
   has an app (shipped, in the environment or .env, or saved here); they
   switch on by themselves once one is saved here.
   Builds on accAdvancedMicrosoft (56-accounts.js) and
   AccountProviders.google.advanced (56-accounts-google.js).
   ============================================================ */
function _advRefresh() {
  if (typeof accLoad === 'function') accLoad().then(() => { if (typeof renderMain === 'function') renderMain(); }).catch(() => {});
}

function _advOwnAppsCard(el) {
  // One sentence (P2): OpenDash signs in with its own app registrations; an organisation (or a copy with none) can enter its own here.
  const card = _settingsCard('Your own sign-in apps', 'For an organisation that registers its own Microsoft or Google app; most people never need this.');
  const d = (typeof accList === 'function' && accList()) || null;
  if (!d) {
    card.body.appendChild((typeof AccountsStore !== 'undefined' && AccountsStore.error) ? emptyLine('Couldn’t load your accounts just now.', { label: 'Try again', run: _advRefresh }) : _connEl('p', 'conn-note', 'Loading…'));
    if (typeof accLoad === 'function' && typeof AccountsStore !== 'undefined' && !AccountsStore.loading) _advRefresh();
    el.appendChild(card.card);
    return;
  }
  const p = d.providers || {};
  if (typeof accAdvancedMicrosoft === 'function') card.body.appendChild(accAdvancedMicrosoft(p.microsoft || {}, _advRefresh, false));
  if (window.AccountProviders && AccountProviders.google && typeof AccountProviders.google.advanced === 'function') {
    const g = _connEl('div', 'set-adv-google');
    AccountProviders.google.advanced(g, p.google || {}, { onChange: _advRefresh });
    card.body.appendChild(g);
  }
  el.appendChild(card.card);
}

registerSettingsGroup({
  id: 'advanced', title: 'Advanced', icon: 'wrench', order: 96,
  description: 'Your own Microsoft or Google sign-in app, for IT teams.',
  render(el) { _advOwnAppsCard(el); },
});
