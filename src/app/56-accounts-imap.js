/* ============================================================
   "+ OTHER EMAIL": the guided drawer for Yahoo, iCloud, AOL, GMX, Zoho,
   Fastmail, Proton (through Bridge) and any other IMAP mailbox, signed in
   with an APP PASSWORD, read-only (docs/dev/ACCOUNTS.md, provider 'imap').
   Owner: Connections. Logic in 56-accounts-imap-logic.js (tested).

     1  Type your email address                       -> POST /api/accounts/imap/lookup
        Gmail / Outlook: "use the one-click button" (Continue with Google/Microsoft)
     2  What an app password is; this provider's steps and a button to its
        app-password page; paste it; Test connection  -> POST /api/accounts/imap/connect
        Friendly errors stay on this screen (wrong password, IMAP off, two-step first...)
     3  Connected: how much mail was found, then "Add your <provider> calendar too?"
        (a calendar link, srcAddFlow with this provider's steps)

   imapConnectFlow({account}) re-opens step 2 for an account whose app
   password stopped working ("Paste a new app password").
   ============================================================ */
function imapConnectFlow(o) {
  o = o || {};
  const account = o.account || null;
  const st = { step: account ? 'loading' : 'email', email: account ? account.email : String(o.email || ''), info: null, screen: null, busy: false, error: null, result: null,
    form: { password: '', username: '', host: '', port: '', security: 'tls', serverOpened: false } };
  openDrawer({ title: account ? 'Paste a new app password' : 'Other email', width: 560, body: (el, close) => {
    const paint = () => {
      el.replaceChildren();
      if (st.step === 'email') return paintEmail(el);
      if (st.step === 'loading') { const b = _connEl('div', 'imap-wait'); const sp = _connEl('span', 'spinner'); sp.setAttribute('aria-hidden', 'true'); b.append(sp, _connEl('span', null, 'One moment…')); el.appendChild(b); return; }
      if (st.step === 'redirect') return paintRedirect(el, close);
      if (st.step === 'soon') return paintSoon(el, close);
      if (st.step === 'password') return paintPassword(el);
      if (st.step === 'done') return paintDone(el, close);
    };
    async function lookup() {
      const chk = imapEmailCheck(st.email);
      if (!chk.ok) { st.error = { title: 'Check the address', text: chk.hint || 'Type your whole email address.' }; paint(); return; }
      st.busy = true; st.error = null; paint();
      try {
        const r = await _srcApi('/api/accounts/imap/lookup', { method: 'POST', body: { email: chk.email } });
        st.info = r.provider; st.screen = imapScreenFor(r.provider); st.email = chk.email;
        if (st.screen.kind === 'invalid') { st.error = { title: 'Check the address', text: st.screen.text }; st.step = 'email'; }
        else {
          st.step = st.screen.kind === 'redirect' ? 'redirect' : st.screen.kind === 'soon' ? 'soon' : 'password';
          if (st.screen.kind === 'password') Object.assign(st.form, { host: st.screen.server.host, port: String(st.screen.server.port), security: st.screen.server.security, serverOpened: st.screen.showServer });
        }
      } catch (e) { st.error = { title: 'That did not work', text: e.message || netErrorMessage(e) }; st.step = account ? 'email' : st.step; }
      st.busy = false; paint();
    }

    /* ---- 1: the address ---- */
    function paintEmail(box) {
      box.appendChild(_connEl('p', 'conn-text', 'Type the email address you want to add. OpenDash works out the rest.'));
      const field = _connEl('label', 'field');
      field.appendChild(_connEl('span', 'field-label', 'Your email address'));
      const input = document.createElement('input'); input.className = 'control'; input.type = 'email'; input.autocomplete = 'email'; input.spellcheck = false;
      input.placeholder = 'name@yahoo.com'; input.value = st.email; input.setAttribute('autofocus', '');
      field.appendChild(input); box.appendChild(field);
      const hint = _connEl('p', 'conn-note'); hint.setAttribute('aria-live', 'polite');
      hint.textContent = 'Works with Yahoo, iCloud, AOL, GMX, Zoho, Fastmail, Proton and most other email services.';
      box.appendChild(hint);
      if (st.error) box.appendChild(errorBox(st.error));
      const actions = _connEl('div', 'assistant-actions');
      const go = uiButton({ label: st.busy ? 'Checking…' : 'Next', icon: st.busy ? null : 'arrow-right', kind: 'primary', size: 'sm', run: () => { st.email = input.value; lookup(); } });
      go.disabled = st.busy;
      input.oninput = () => { st.email = input.value; const c = imapEmailCheck(input.value); if (c.hint && input.value.includes('@') && input.value.split('@')[1].includes('.')) hint.textContent = c.hint; };
      input.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); if (!go.disabled) go.click(); } };
      actions.appendChild(go); box.appendChild(actions);
      setTimeout(() => { try { input.focus(); } catch (e) { /* closed */ } }, 0);
    }

    /* ---- Gmail / Outlook: the one-click buttons ---- */
    function paintRedirect(box, closeFn) {
      const s = st.screen;
      box.append(_connEl('h3', 'conn-name', s.title), _connEl('p', 'conn-text', s.text));
      const actions = _connEl('div', 'assistant-actions');
      actions.appendChild(uiButton({ label: s.button, icon: 'log-in', kind: 'primary', size: 'sm', run: () => {
        const d = (typeof accList === 'function' && accList()) || {};
        const avail = d.providers && d.providers[s.provider] && d.providers[s.provider].available !== false;
        closeFn();
        if (avail && typeof accOpenSignIn === 'function') { accOpenSignIn({ provider: s.provider, email: st.email }); if (typeof accWaiting === 'function') openDrawer({ title: 'Signing in', width: 480, body: (el2, close2) => el2.appendChild(accWaiting(s.provider === 'google' ? 'Google' : 'Microsoft', close2)) }); }
        else if (typeof accAdd === 'function') accAdd(s.provider);
      } }));
      actions.appendChild(uiButton({ label: 'Use another address', kind: 'ghost', size: 'sm', run: () => { st.step = 'email'; st.error = null; paint(); } }));
      box.appendChild(actions);
    }

    /* ---- Outlook / Hotmail while Microsoft sign-in is off: coming soon, and the calendar link ---- */
    function paintSoon(box, closeFn) {
      const s = st.screen;
      box.append(_connEl('h3', 'conn-name', s.title), _connEl('p', 'conn-text', s.text), _connEl('p', 'conn-note', st.email));
      if (s.calendar && s.calendar.ics) {
        const cal = _connEl('div', 'imap-steps imap-calendar');
        cal.appendChild(_connEl('p', 'src-lead', `Add your ${s.calendar.name || 'calendar'} now`));
        cal.appendChild(_connSteps(s.calendar.steps));
        const row = _connEl('div', 'assistant-actions');
        row.appendChild(uiButton({ label: 'Add a calendar link', icon: 'link', kind: 'primary', size: 'sm', run: () => {
          closeFn();
          if (typeof srcAddFlow === 'function') srcAddFlow({ ical: true, label: s.calendar.name || 'Calendar', icalHelp: { steps: s.calendar.steps, url: s.calendar.url, button: s.calendar.button, note: s.calendar.note } });
        } }));
        if (s.calendar.url) row.appendChild(uiButton({ label: s.calendar.button || 'Open your calendar', icon: 'external-link', kind: 'ghost', size: 'sm', run: () => window.open(s.calendar.url, '_blank', 'noopener,noreferrer') }));
        cal.appendChild(row);
        box.appendChild(cal);
      }
      const actions = _connEl('div', 'assistant-actions');
      actions.appendChild(uiButton({ label: 'Use another address', kind: 'ghost', size: 'sm', run: () => { st.step = 'email'; st.error = null; paint(); } }));
      box.appendChild(actions);
    }

    /* ---- 2: what an app password is, the steps, paste, test ---- */
    function paintPassword(box) {
      const s = st.screen;
      box.appendChild(_connEl('h3', 'conn-name imap-title', s.title));
      if (account) box.appendChild(_connEl('p', 'conn-text', `The saved app password for ${account.email} stopped working. Make a new one and paste it below. Your saved mail stays where it is.`));
      else box.appendChild(_connEl('p', 'conn-note', st.email));
      const intro = _connEl('div', 'imap-intro');
      intro.innerHTML = icon('key-round', 'i-sm');
      const words = _connEl('div');
      words.append(_connEl('strong', null, s.intro.title), _connEl('p', null, s.intro.text));
      intro.appendChild(words);
      box.appendChild(intro);
      const steps = _connEl('div', 'imap-steps' + (st.error && st.error.showSteps ? ' is-attention' : ''));
      steps.appendChild(_connEl('p', 'src-lead', s.bridge ? 'Set up Proton Mail Bridge' : `Make an app password at ${s.name}`));
      steps.appendChild(_connSteps(s.steps));
      if (s.open) steps.appendChild(uiButton({ label: s.open.label, icon: 'external-link', kind: 'secondary', size: 'sm', run: () => window.open(s.open.url, '_blank', 'noopener,noreferrer') }));
      for (const t of s.tips) { const n = _connEl('p', 'conn-note imap-tip'); n.innerHTML = icon('info', 'i-xs'); n.appendChild(_connEl('span', null, t)); steps.appendChild(n); }
      box.appendChild(steps);

      let userInput = null;
      if (s.askUsername) {
        const uf = _connEl('label', 'field');
        uf.appendChild(_connEl('span', 'field-label', s.usernameLabel));
        userInput = document.createElement('input'); userInput.className = 'control'; userInput.autocomplete = 'off'; userInput.spellcheck = false; userInput.value = st.form.username || st.email;
        userInput.oninput = () => { st.form.username = userInput.value; };
        uf.appendChild(userInput); box.appendChild(uf);
      }
      const pf = _connEl('label', 'field');
      pf.appendChild(_connEl('span', 'field-label', s.passwordLabel));
      const row = _connEl('div', 'imap-pw-row');
      const pw = document.createElement('input'); pw.className = 'control'; pw.type = 'password'; pw.autocomplete = 'off'; pw.spellcheck = false;
      pw.placeholder = s.passwordPlaceholder; pw.value = st.form.password; pw.setAttribute('aria-describedby', 'imap-pw-hint');
      const eye = _connEl('button', 'btn btn-ghost btn-sm imap-show'); eye.type = 'button'; eye.textContent = 'Show';
      eye.onclick = () => { pw.type = pw.type === 'password' ? 'text' : 'password'; eye.textContent = pw.type === 'password' ? 'Show' : 'Hide'; };
      row.append(pw, eye); pf.appendChild(row);
      const pwHint = _connEl('span', 'field-hint'); pwHint.id = 'imap-pw-hint'; pwHint.setAttribute('aria-live', 'polite');
      const paintHint = () => { pwHint.textContent = imapPasswordHint(pw.value, s.id) || 'Spaces are fine: OpenDash removes them. The password stays on this computer.'; };
      pw.oninput = () => { st.form.password = pw.value; paintHint(); test.disabled = st.busy || !pw.value.trim(); };
      pf.appendChild(pwHint); box.appendChild(pf);

      // Server settings: open for "Other", tucked away for known services.
      const det = _connEl('details', 'imap-server'); det.open = !!(s.showServer || st.form.serverOpened || (st.error && st.error.openServer));
      det.appendChild(_connEl('summary', null, 'Server settings'));
      det.appendChild(_connEl('p', 'conn-note', s.serverNote));
      const grid = _connEl('div', 'imap-server-grid');
      const hf = _connEl('label', 'field'); hf.appendChild(_connEl('span', 'field-label', 'Mail server (IMAP)'));
      const host = document.createElement('input'); host.className = 'control'; host.spellcheck = false; host.autocomplete = 'off'; host.value = st.form.host; host.placeholder = 'imap.example.com';
      host.oninput = () => { st.form.host = host.value; st.form.serverOpened = true; };
      hf.appendChild(host);
      const portF = _connEl('label', 'field'); portF.appendChild(_connEl('span', 'field-label', 'Port'));
      const port = document.createElement('input'); port.className = 'control'; port.inputMode = 'numeric'; port.value = st.form.port; port.placeholder = '993';
      port.oninput = () => { st.form.port = port.value; st.form.serverOpened = true; };
      portF.appendChild(port);
      const secF = _connEl('label', 'field'); secF.appendChild(_connEl('span', 'field-label', 'Security'));
      const sec = document.createElement('select'); sec.className = 'control';
      for (const [v, t] of [['tls', 'SSL/TLS (usually port 993)'], ['starttls', 'STARTTLS (usually port 143)']]) { const op = document.createElement('option'); op.value = v; op.textContent = t; if (st.form.security === v) op.selected = true; sec.appendChild(op); }
      sec.onchange = () => { st.form.security = sec.value; st.form.serverOpened = true; if (!port.value || port.value === '993' || port.value === '143') { port.value = sec.value === 'tls' ? '993' : '143'; st.form.port = port.value; } };
      secF.appendChild(sec);
      grid.append(hf, portF, secF); det.appendChild(grid);
      det.ontoggle = () => { if (det.open) st.form.serverOpened = true; };
      box.appendChild(det);

      if (st.error) box.appendChild(errorBox(st.error));
      const promise = _connEl('p', 'conn-note acc-promise'); promise.innerHTML = icon('shield-check', 'i-xs');
      promise.appendChild(_connEl('span', null, 'OpenDash only reads your mail. It never sends, changes or deletes anything, and the password is kept on this computer only.'));
      box.appendChild(promise);
      const actions = _connEl('div', 'assistant-actions');
      const test = uiButton({ label: st.busy ? `Checking with ${s.name}…` : 'Test connection', icon: st.busy ? null : 'plug', kind: 'primary', size: 'sm', run: (e, b) => connect(b) });
      if (st.busy) test.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>');
      test.disabled = st.busy || !String(st.form.password).trim();
      actions.appendChild(test);
      if (!account) actions.appendChild(uiButton({ label: 'Back', kind: 'ghost', size: 'sm', run: () => { st.step = 'email'; st.error = null; paint(); } }));
      box.appendChild(actions);
      if (st.busy) box.appendChild(_connEl('p', 'conn-note', 'This takes a few seconds.'));
      paintHint();
      const focusOn = st.error && st.error.focus;
      setTimeout(() => {
        try {
          if (focusOn === 'server') host.focus();
          else if (focusOn === 'username' && userInput) userInput.focus();
          else { pw.focus(); if (focusOn === 'password') pw.select(); }
        } catch (e) { /* closed */ }
      }, 0);
    }
    async function connect() {
      if (st.busy) return;
      st.busy = true; st.error = null; paint();
      try {
        st.result = await _srcApi('/api/accounts/imap/connect', { method: 'POST', body: imapConnectBody({ ...st.form, email: st.email }, st.screen, account) });
        st.form.password = '';
        st.step = 'done';
        if (typeof accLoad === 'function') accLoad();
        if (typeof SourcesStore !== 'undefined') SourcesStore.refresh({ cached: true });
        if (typeof accReloadData === 'function') accReloadData();
      } catch (e) {
        const view = imapErrorView({ code: e.status ? e.code : 'NETWORK', message: e.message, retryProvider: e.retryProvider }, st.screen);
        if (view.redirect) { st.screen = imapScreenFor({ kind: 'redirect', provider: view.redirect, message: e.message }); st.step = 'redirect'; }
        st.error = view;
      }
      st.busy = false; paint();
    }

    /* ---- 3: connected, and the calendar ---- */
    function paintDone(box, closeFn) {
      const v = imapDoneView(st.result, st.screen);
      const head = _connEl('div', 'imap-done');
      head.innerHTML = icon('circle-check', 'i-md');
      head.appendChild(_connEl('h3', 'conn-name', v.title));
      box.appendChild(head);
      for (const l of v.lines) box.appendChild(_connEl('p', 'conn-text', l));
      const cal = _connEl('div', 'imap-steps imap-calendar');
      if (v.calendar.ics) {
        cal.appendChild(_connEl('p', 'src-lead', v.calendar.title));
        cal.appendChild(_connEl('p', 'conn-note', 'Your calendar comes in through a private calendar link. Here is where to find it:'));
        cal.appendChild(_connSteps(v.calendar.steps));
        const row = _connEl('div', 'assistant-actions');
        row.appendChild(uiButton({ label: 'Add a calendar link', icon: 'link', kind: 'secondary', size: 'sm', run: () => {
          closeFn();
          if (typeof srcAddFlow === 'function') srcAddFlow({ ical: true, label: v.calendar.label, icalHelp: { steps: v.calendar.steps, url: v.calendar.url, button: v.calendar.button, note: v.calendar.note } });
        } }));
        if (v.calendar.url) row.appendChild(uiButton({ label: v.calendar.button || 'Open your calendar', icon: 'external-link', kind: 'ghost', size: 'sm', run: () => window.open(v.calendar.url, '_blank', 'noopener,noreferrer') }));
        cal.appendChild(row);
      } else if (v.calendar.text) cal.appendChild(_connEl('p', 'conn-note', v.calendar.text));
      box.appendChild(cal);
      const actions = _connEl('div', 'assistant-actions');
      actions.appendChild(uiButton({ label: 'Done', icon: 'check', kind: 'primary', size: 'sm', run: (e, b) => closeFn(b) }));
      box.appendChild(actions);
    }

    function errorBox(err) {
      const b = _connEl('div', 'imap-error'); b.setAttribute('role', 'alert');
      b.innerHTML = icon('circle-alert', 'i-sm');
      const words = _connEl('div');
      words.append(_connEl('strong', null, err.title || 'That did not work'), _connEl('p', null, err.text || ''));
      b.appendChild(words);
      return b;
    }

    paint();
    if (account) lookup();
  } });
}

/** A calendar link for an IMAP account (its card's Calendar button). */
async function imapCalendarLink(a) {
  let info = null;
  try { info = (await _srcApi('/api/accounts/imap/lookup', { method: 'POST', body: { email: a.email } })).provider; } catch (e) { info = null; }
  const screen = info ? imapScreenFor(info) : null;
  const cal = screen && screen.calendar;
  if (typeof srcAddFlow !== 'function') return;
  if (cal && cal.ics) srcAddFlow({ ical: true, label: imapDoneView({}, screen).calendar.label, icalHelp: { steps: cal.steps, url: cal.url, button: cal.button, note: cal.note } });
  else if (cal && cal.text) toast(cal.text, { kind: 'info', timeout: 6000 });
  else srcAddFlow({ ical: true });
}
