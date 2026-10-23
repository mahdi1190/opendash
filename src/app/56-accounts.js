/* ============================================================
   ACCOUNTS on the Connections tab (docs/dev/ACCOUNTS.md). Owner: Connections.
   There is no OpenDash account. People add their own mail and calendar
   accounts, as many as they like, side by side:
     + Add Google account   + Add Microsoft account   + Other email
     Add a calendar link
   Each account shows Mail ✓ Calendar ✓, "synced N min ago", and can be
   paused or removed. Signing in happens on Microsoft's (or Google's) own page
   in a new tab; this page notices the return. Logic lives in
   56-accounts-logic.js (tested); this file only draws.
   ============================================================ */
const AccountsStore = { data: null, loading: null, error: null, busy: {} };
let _accSignInAt = 0, _accBefore = null;

async function accLoad() {
  if (AccountsStore.loading) return AccountsStore.loading;
  AccountsStore.loading = (async () => {
    try { AccountsStore.data = await _srcApi('/api/accounts'); AccountsStore.error = null; }
    catch (e) { AccountsStore.error = netErrorMessage(e); }
    AccountsStore.loading = null;
    if (state.view === 'connections') renderMain();
    return AccountsStore.data;
  })();
  return AccountsStore.loading;
}
function accList() {
  const d = AccountsStore.data || ((window.Connections && Connections.all()) || {}).accounts && { accounts: Connections.all().accounts.list, providers: Connections.all().accounts.providers };
  return d || null;
}
async function accAct(a, path, body, done) {
  if (AccountsStore.busy[a.id]) return;
  AccountsStore.busy[a.id] = true;
  if (state.view === 'connections') renderMain();
  try {
    const r = await _srcApi(path, { method: 'POST', body: { id: a.id, ...(body || {}) } });
    if (done) done(r);
  } catch (e) { toast(e.message || netErrorMessage(e), { kind: 'err' }); }
  delete AccountsStore.busy[a.id];
  await accLoad();
  if (typeof SourcesStore !== 'undefined') SourcesStore.refresh({ cached: true });
}

/** New mail or events were saved: the calendar and inbox views read them again. */
function accReloadData() {
  try { if (typeof CalStore !== 'undefined' && CalStore.load) CalStore.load(true); } catch (e) { /* not loaded */ }
  try { if (typeof InboxStore !== 'undefined' && InboxStore.load) InboxStore.load(true); } catch (e) { /* not loaded */ }
}

/* ---------- signing in (a new tab), and noticing the return ---------- */
function accOpenSignIn(o) {
  _accSignInAt = Date.now();
  _accBefore = ((AccountsStore.data && AccountsStore.data.accounts) || []).map(a => ({ id: a.id, status: a.status }));
  window.open(accBeginUrl(o), '_blank', 'noopener');
}
window.addEventListener('focus', async () => {
  if (!accSignInPending(_accSignInAt)) return;
  const before = _accBefore;
  const d = await accLoad();
  const fresh = accNewlyConnected(before, d && d.accounts);
  if (fresh) {
    _accSignInAt = 0;
    toast(`${fresh.email} is connected. Mail and calendar are on their way.`, { kind: 'ok', timeout: 6000 });
    if (typeof _drawerClose === 'function' && _drawerClose) _drawerClose();
    if (typeof SourcesStore !== 'undefined') SourcesStore.refresh({ cached: true });
    accReloadData();
  }
});

/* ---------- the add flows ---------- */
function accAdd(provider) {
  const d = accList() || {};
  const p = d.providers || {};
  if (provider === 'other') return accOtherEmail();
  // Google has its own card (56-accounts-google.js): the ticks, the unverified-app explanation, its own app.
  // Not switched on in this copy (the button is greyed out; this answers a search or a shortcut).
  if (provider === 'google' && !(p.google && p.google.available)) return accComingSoon('Google accounts', 'Adding a Google account with one click is coming soon. Until then, Gmail can come in through + Other email with an app password, or through Claude: choose Add connection at the top of this page.');
  if (provider === 'microsoft' && p.microsoft && p.microsoft.available === false) return accComingSoon('Microsoft accounts', 'Adding Outlook, Hotmail and Microsoft 365 accounts with one click is coming soon. Your Outlook calendar can come in now through a calendar link: choose Add a calendar link.');
  if (provider === 'google' && window.AccountProviders && AccountProviders.google) return AccountProviders.google.signIn({ info: p.google || null });
  openDrawer({ title: provider === 'google' ? 'Add a Google account' : 'Add a Microsoft account', width: 520, body: (el, close) => {
    const name = provider === 'google' ? 'Google' : 'Microsoft';
    el.appendChild(_connEl('p', 'conn-text', provider === 'google'
      ? 'Type the Gmail or Google Workspace address you want to add.'
      : 'Type the email address you use with Microsoft: Hotmail, Outlook or Live, or your work or school email.'));
    const field = _connEl('label', 'field acc-email-field');
    field.appendChild(_connEl('span', 'field-label', 'Email address'));
    const input = document.createElement('input'); input.className = 'control'; input.type = 'email'; input.autocomplete = 'email'; input.spellcheck = false;
    input.placeholder = provider === 'google' ? 'name@gmail.com' : 'name@outlook.com'; input.setAttribute('autofocus', '');
    field.appendChild(input); el.appendChild(field);
    const hint = _connEl('p', 'conn-note acc-hint'); hint.setAttribute('aria-live', 'polite');
    let kind = null;     // null: chosen from the address
    const swap = _connEl('button', 'btn btn-ghost btn-sm acc-swap'); swap.type = 'button'; swap.hidden = true;
    const paintHint = () => {
      const email = accCleanEmail(input.value);
      const k = kind || accGuessKind(email);
      hint.textContent = kind && email ? (k === 'personal' ? 'Personal Microsoft account. Next, Microsoft opens so you can sign in.' : 'Work or school account. Next, Microsoft opens so you can sign in.') : accEmailHint(input.value, provider);
      swap.hidden = provider !== 'microsoft' || !email;
      swap.textContent = k === 'personal' ? 'This is a work or school account' : 'This is a personal account';
      go.disabled = !email;
    };
    swap.onclick = () => { kind = (kind || accGuessKind(input.value)) === 'personal' ? 'work' : 'personal'; paintHint(); };
    el.append(hint, swap);
    el.appendChild(_connSteps([`${name} opens in a new tab. Sign in there and say yes.`, 'Come back to this tab. OpenDash finishes on its own.']));
    const note = _connEl('p', 'conn-note acc-promise'); note.innerHTML = icon('shield-check', 'i-xs');
    note.appendChild(_connEl('span', null, 'OpenDash only reads. It never sends, changes or deletes your mail or events, and your password stays with ' + name + '.'));
    el.appendChild(note);
    const actions = _connEl('div', 'assistant-actions');
    const go = _connBtn('Continue to ' + name, 'log-in', 'btn-primary', () => {
      const email = accCleanEmail(input.value);
      if (!email) { input.focus(); return; }
      accOpenSignIn({ provider, email, kind: kind || undefined });
      el.replaceChildren(accWaiting(name, close));
    });
    input.oninput = paintHint;
    input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!go.disabled) go.click(); } };
    actions.appendChild(go); el.appendChild(actions);
    paintHint();
    // (Your own Microsoft app: Settings > Advanced, 58-settings-advanced.js; never on this card.)
  } });
}
function accWaiting(name, close) {
  const box = _connEl('div', 'acc-waiting');
  const sp = _connEl('span', 'spinner'); sp.setAttribute('aria-hidden', 'true');
  box.append(sp, _connEl('h3', 'conn-name', `Finish signing in on the ${name} tab`), _connEl('p', 'conn-text', 'When you have said yes, come back here. This page updates by itself.'));
  const actions = _connEl('div', 'assistant-actions');
  actions.append(_connBtn('I have finished', 'check', 'btn-primary', async () => { await accLoad(); close(); }), _connBtn('Cancel', null, 'btn-ghost', () => { _accSignInAt = 0; close(); }));
  box.appendChild(actions);
  return box;
}
/** Advanced: a user's own Microsoft app (IT teams, developers). The only place a client ID appears. */
function accAdvancedMicrosoft(ms, close, open) {
  const det = _connEl('details', 'acc-advanced'); det.open = !!open;
  det.appendChild(_connEl('summary', null, 'Advanced: use your own Microsoft app'));
  det.appendChild(_connEl('p', 'conn-note', 'Only for IT teams and developers. Register an app in Microsoft Entra for personal and work accounts, add the "Mobile and desktop" return address below, and allow the read-only permissions User.Read, Mail.Read and Calendars.Read.'));
  det.appendChild(_connCode((ms && ms.callback) || 'http://localhost/api/accounts/callback', 'Copy'));
  const input = document.createElement('input'); input.className = 'control'; input.placeholder = 'Application (client) ID'; input.autocomplete = 'off'; input.spellcheck = false;
  input.setAttribute('aria-label', 'Application (client) ID');
  det.appendChild(input);
  const row = _connEl('div', 'assistant-actions');
  row.appendChild(_connBtn('Use this app', 'check', 'btn-secondary', async (b) => {
    b.disabled = true;
    try { await _srcApi('/api/accounts/microsoft-app', { method: 'PUT', body: { clientId: input.value.trim() } }); toast('Saved. New Microsoft sign-ins use your app.', { kind: 'ok' }); await accLoad(); close(); }
    catch (e) { toast(e.message, { kind: 'err' }); b.disabled = false; }
  }));
  if (ms && ms.custom) row.appendChild(_connBtn('Go back to the built-in app', null, 'btn-ghost', async () => {
    try { await _srcApi('/api/accounts/microsoft-app', { method: 'PUT', body: { clientId: null } }); await accLoad(); close(); }
    catch (e) { toast(e.message, { kind: 'err' }); }
  }));
  det.appendChild(row);
  return det;
}
function accComingSoon(title, text) {
  openDrawer({ title, width: 480, body: (el) => {
    const card = _connEl('div', 'acc-soon');
    card.innerHTML = icon('hourglass');
    card.append(_connEl('h3', 'conn-name', 'Coming soon'), _connEl('p', 'conn-text', text),
      _connEl('p', 'conn-note', 'People who look after IT can use their own app in Settings > Advanced.'));
    el.appendChild(card);
  } });
}
/** An add button: greyed out with "Coming soon" when that sign-in is not switched on (disabled, not hidden). */
function accAddButton(b, cls) {
  const btn = _connEl('button', 'btn ' + cls + ' acc-add' + (b.soon ? ' acc-add-soon' : '')); btn.type = 'button'; btn.dataset.add = b.id;
  btn.innerHTML = b.id === 'other' ? icon('at-sign', 'i-xs') : _connMark(b.id === 'google' ? 'gmail' : 'outlook', 'mail');
  btn.appendChild(_connEl('span', null, b.label));
  if (b.soon) {
    btn.disabled = true;
    btn.title = 'Coming soon';
    btn.setAttribute('aria-disabled', 'true');
    btn.appendChild(_connEl('span', 'acc-soon-tag', 'Coming soon'));
  } else btn.onclick = () => accAdd(b.id);
  return btn;
}
function accOtherEmail() {
  const d = accList() || {};
  // "+ Other email": the guided app-password flow (56-accounts-imap.js).
  if (!(d.providers && d.providers.imap && d.providers.imap.available === false) && typeof imapConnectFlow === 'function') return imapConnectFlow({});
  openDrawer({ title: 'Other email', width: 480, body: (el, close) => {
    const card = _connEl('div', 'acc-soon');
    card.innerHTML = icon('hourglass');
    card.append(_connEl('h3', 'conn-name', 'Coming soon: Yahoo, iCloud and others with an app password'),
      _connEl('p', 'conn-text', 'An app password is a special password your email provider makes just for apps like OpenDash. When this arrives, OpenDash will show you where to get one, step by step.'),
      _connEl('p', 'conn-note', 'Already have a calendar link from iCloud, Yahoo or another calendar? You can add it now.'));
    card.appendChild(_connBtn('Add a calendar link', 'link', 'btn-secondary', () => { close(); accAddCalendarLink(); }));
    el.appendChild(card);
  } });
}
function accAddCalendarLink() { if (typeof srcAddFlow === 'function') srcAddFlow({ capability: 'calendar', ical: true }); }

/* ---------- approval (work accounts) ---------- */
async function accApproval(a) {
  let help = a.approval || null;
  if (!help) { try { help = await _srcApi('/api/accounts/approval?id=' + encodeURIComponent(a.id)); } catch (e) { help = null; } }
  openDrawer({ title: 'Your organisation needs to approve OpenDash once', width: 540, body: (el, close) => {
    const org = String(a.email || '').split('@')[1] || 'your organisation';
    el.appendChild(_connEl('p', 'conn-text', `Your work account belongs to ${org}. It only lets apps in after an administrator says yes. This is normal for work accounts and only needs doing once.`));
    if (!help || !help.consentUrl) { el.appendChild(_connEl('p', 'conn-note', 'Ask your IT team to approve OpenDash for read-only mail and calendar.')); return; }
    el.appendChild(_connSteps([
      [_connEl('strong', null, 'If you look after Microsoft 365 yourself:'), _connBtn('Approve OpenDash', 'external-link', 'btn-primary', () => window.open(help.consentUrl, '_blank', 'noopener'))],
      [_connEl('strong', null, 'If not, send this to your IT team:'), _connBtn('Email my IT team', 'send', 'btn-secondary', () => { window.location.href = help.mailto; }), _connCopyBtn(help.body || help.mailto, 'Copy the message')],
      [_connEl('span', null, 'When it has been approved:'), _connBtn('Try again', 'log-in', 'btn-secondary', () => { close(); accOpenSignIn({ provider: a.provider, accountId: a.id }); })],
    ]));
    el.appendChild(_connEl('p', 'conn-note', 'OpenDash asks only to read your profile, mail and calendar. It cannot send, change or delete anything.'));
  } });
}

/* ---------- the list ---------- */
function accCard(a) {
  const view = accStatusView(a), busy = !!AccountsStore.busy[a.id];
  const card = _connEl('article', 'cp-source-card acc-card st-' + view.tone + (a.status === 'paused' ? ' is-paused' : ''));
  card.dataset.accountId = a.id;
  const top = _connEl('div', 'cp-card-top');
  const mark = _connEl('span', 'cp-service-mark'); mark.innerHTML = _connMark(accBrand(a), 'mail');
  const titles = _connEl('div', 'acc-titles');
  const h = _connEl('h3', 'acc-email', a.email);
  titles.append(h, _connEl('span', 'acc-sub', `${accProviderName(a)} · ${accKindText(a.kind)}`));
  top.append(mark, titles, _connEl('span', 'status ' + (view.tone === 'ok' ? 'ok' : view.tone === 'warn' ? 'warn' : 'off'), view.label));
  card.appendChild(top);
  const feats = _connEl('div', 'acc-features'); feats.setAttribute('role', 'group'); feats.setAttribute('aria-label', 'What OpenDash reads from ' + a.email);
  for (const f of accFeatureList(a)) {
    const b = _connEl('button', 'acc-feature' + (f.on ? ' on' : '')); b.type = 'button';
    b.setAttribute('aria-pressed', String(f.on));
    b.innerHTML = icon(f.id === 'mail' ? 'mail' : 'calendar-days', 'i-xs');
    b.append(_connEl('span', null, f.label), _connEl('span', 'acc-tick', f.link ? '+' : f.on ? '✓' : 'off'));
    b.title = f.link ? 'Add a calendar link for this account' : f.on ? `Stop reading ${f.label.toLowerCase()}` : `Read ${f.label.toLowerCase()} too`;
    b.disabled = busy;
    b.onclick = () => (f.link ? imapCalendarLink(a) : accAct(a, '/api/accounts/features', { [f.id]: !f.on }));
    feats.appendChild(b);
  }
  card.appendChild(feats);
  if (view.note) {
    const n = _connEl('p', 'cp-card-note' + (view.tone === 'warn' ? ' attention-note' : ''));
    n.innerHTML = icon(view.tone === 'warn' ? 'circle-alert' : 'info', 'i-xs');
    n.appendChild(_connEl('span', null, view.note));
    card.appendChild(n);
  }
  const foot = _connEl('div', 'cp-card-footer');
  const when = _connEl('span', 'cp-synced'); when.innerHTML = icon('clock', 'i-xs'); when.appendChild(_connEl('span', null, accSyncedText(a)));
  const acts = _connEl('div', 'acc-actions');
  const run = (id) => {
    if (id === 'sync') return accAct(a, '/api/accounts/sync', {}, (r) => { const bad = (r.results || []).find(x => !x.ok); toast(bad ? bad.error : 'Checked. Everything is up to date.', { kind: bad ? 'err' : 'ok' }); accReloadData(); });
    if (id === 'sign-in' && a.provider === 'google' && window.AccountProviders && AccountProviders.google) return AccountProviders.google.signIn({ email: a.email, accountId: a.id, features: a.features });
    if (id === 'sign-in') return a.provider === 'imap' ? imapConnectFlow({ account: a }) : accOpenSignIn({ provider: a.provider, accountId: a.id });
    if (id === 'approval') return accApproval(a);
    if (id === 'resume') return accAct(a, '/api/accounts/pause', { paused: false });
    // Refused without a sign-in here ("Sign in on this computer to take over"); else this computer reads it from now on.
    if (id === 'fetch-here') return accAct(a, '/api/accounts/fetch-here', {}, (r) => { toast(r.message, { kind: r.ok ? 'ok' : 'info', timeout: 6000 }); if (r.ok) accReloadData(); });
  };
  for (const s of view.secondary) { const b = _connBtn(s.label, null, 'btn-ghost', () => run(s.id)); b.disabled = busy; acts.appendChild(b); }
  if (view.primary) {
    const b = _connBtn(busy ? 'Working…' : view.primary.label, busy ? null : view.primary.id === 'sync' ? 'refresh-cw' : view.primary.id === 'sign-in' ? 'log-in' : null, 'btn-secondary', () => run(view.primary.id));
    if (busy) { b.disabled = true; b.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>'); }
    acts.appendChild(b);
  }
  const more = _connEl('button', 'btn-icon acc-more'); more.type = 'button'; more.innerHTML = icon('ellipsis');
  more.setAttribute('aria-label', 'More for ' + a.email); more.disabled = busy;
  more.onclick = (e) => {
    e.stopPropagation();
    const items = [
      a.status === 'paused' ? { label: 'Resume', icon: 'refresh-cw', run: () => run('resume') } : { label: 'Pause', icon: 'clock', run: () => accAct(a, '/api/accounts/pause', { paused: true }) },
      ...(a.status !== 'needs-admin-approval' && a.here && a.here.fetcher ? [{ label: 'Sign in again', icon: 'log-in', run: () => run('sign-in') }] : []),
      { label: 'Remove…', icon: 'trash-2', danger: true, run: async () => {
        const ok = await confirmDialog({ title: 'Remove this account?', text: `OpenDash stops reading ${a.email} and forgets the mail and events it saved from it. Your account itself is not changed.`, confirmLabel: 'Remove', danger: true });
        if (ok) accAct(a, '/api/accounts/remove', {}, () => toast(`${a.email} was removed.`, { kind: 'ok' }));
      } },
    ];
    openMenu(more, items);
  };
  acts.appendChild(more);
  foot.append(when, acts);
  card.appendChild(foot);
  return card;
}

/** The "Your email and calendar accounts" block of the Connections page. */
function accountsSection() {
  if (!AccountsStore.data && !AccountsStore.loading && !AccountsStore.error) accLoad();
  const d = accList();
  const section = _connEl('section', 'cp-connections acc-section'); section.dataset.conn = 'accounts';
  const head = _connEl('div', 'cp-section-head');
  const title = _connEl('div'); title.append(_connEl('h2', null, 'Your email and calendar accounts'), _connEl('p', null, 'Add as many as you like: personal and work, side by side.'));
  const note = _connEl('span', 'cp-readonly'); note.innerHTML = icon('lock', 'i-xs'); note.appendChild(_connEl('span', null, 'Read-only'));
  head.append(title, note); section.appendChild(head);
  const adds = _connEl('div', 'acc-adds');
  for (const b of accAddButtons(d && d.providers)) adds.appendChild(accAddButton(b, b.id === 'other' ? 'btn-ghost' : 'btn-secondary'));
  const ics = _connEl('button', 'btn btn-ghost acc-add acc-add-link'); ics.type = 'button'; ics.innerHTML = icon('link', 'i-xs'); ics.appendChild(_connEl('span', null, 'Add a calendar link'));
  ics.onclick = accAddCalendarLink;
  adds.appendChild(ics);
  section.appendChild(adds);
  const grid = _connEl('div', 'cp-source-grid acc-grid');
  const list = accSort((d && d.accounts) || []);
  if (!d) grid.appendChild(_connEl('p', 'cp-loading', AccountsStore.error ? 'Your accounts are unavailable. Try again when the server is ready.' : 'Loading your accounts…'));
  else if (!list.length) {
    const empty = _connEl('div', 'cp-empty acc-empty');
    empty.append(_connEl('h3', null, 'No accounts yet'), _connEl('p', null, 'Add your first one above. OpenDash only reads: it never sends, changes or deletes anything.'));
    grid.appendChild(empty);
  } else for (const a of list) grid.appendChild(accCard(a));
  section.appendChild(grid);
  return section;
}

/** Compact version for first-run setup: the three buttons and a line per account. */
function accountsCompactCard() {
  if (!AccountsStore.data && !AccountsStore.loading) accLoad();
  const d = accList();
  const box = _connEl('section', 'card conn-card acc-compact'); box.dataset.conn = 'accounts';
  box.append(_connEl('div', 'conn-name', 'Email and calendar (optional)'), _connEl('p', 'conn-note', 'Add your accounts now or later from Connections. OpenDash only reads.'));
  for (const a of accSort((d && d.accounts) || [])) box.appendChild(_connEl('p', 'conn-note', `${a.email}: ${accStatusView(a).label}`));
  const row = _connEl('div', 'assistant-actions');
  for (const b of accAddButtons(d && d.providers)) row.appendChild(accAddButton(b, b.id === 'other' ? 'btn-ghost' : 'btn-secondary'));
  box.appendChild(row);
  return box;
}
