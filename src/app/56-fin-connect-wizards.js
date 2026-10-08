/* ============================================================
   MONEY connection sheets (Connections > Money). Owner: Finance
   connections UI. One provider-agnostic sheet shell driven by each
   provider's flow descriptor (FIN_FLOWS): a step header ("Step 2 of 4"),
   Back, Cancel, and the step's own body and main button. State is kept
   per provider while the page is open, so closing and reopening a sheet
   resumes it; a secret (Monzo client secret, Enable Banking key file) is
   never kept in the page after it was saved.

   finOpenFlow(id, {step, reauth, bank})   open a provider's sheet
   Flows: plasma (paste address, done), monzo (key, connect, approve in
   the app with a 5-minute countdown, done), enable-banking (is my bank
   supported?, free app + key file, choose bank, sign in, done).
   Routes: /api/fin-connect/* (server/routes/fin-connect.mjs).
   ============================================================ */
const FIN_EB_REDIRECTS = {
  bounce: 'https://mahdi1190.github.io/opendash/eb-callback.html',
  paste: 'https://localhost/opendash-eb-callback',
};
const FIN_EB_COUNTRIES = [
  ['GB', 'United Kingdom'], ['IE', 'Ireland'], ['FR', 'France'], ['DE', 'Germany'], ['ES', 'Spain'], ['IT', 'Italy'],
  ['NL', 'Netherlands'], ['BE', 'Belgium'], ['LU', 'Luxembourg'], ['PT', 'Portugal'], ['AT', 'Austria'], ['FI', 'Finland'],
  ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['IS', 'Iceland'], ['PL', 'Poland'], ['CZ', 'Czechia'],
  ['SK', 'Slovakia'], ['SI', 'Slovenia'], ['HR', 'Croatia'], ['HU', 'Hungary'], ['RO', 'Romania'], ['BG', 'Bulgaria'],
  ['GR', 'Greece'], ['CY', 'Cyprus'], ['MT', 'Malta'], ['EE', 'Estonia'], ['LV', 'Latvia'], ['LT', 'Lithuania'],
];
const FIN_MONZO_WINDOW = 300;   // seconds of full-history access after approval in the app

/* ---------- pure checks (tests/fin-connect-ui.test.mjs) ---------- */
function finMonzoClientCheck(id) {
  const s = String(id || '').trim();
  if (!s) return { ok: false };
  if (/^oauth2client_[A-Za-z0-9]{8,}$/.test(s)) return { ok: true, value: s };
  return { ok: false, message: 'A Monzo client ID starts with oauth2client_ followed by letters and numbers.' };
}
/** A private key file (PEM) for Enable Banking, checked before it is sent. Never echoes the key. */
function finPemCheck(text, size) {
  const s = String(text || '');
  if (!s.trim()) return { ok: false };
  if ((size || s.length) > 16384) return { ok: false, message: 'That file is too big for a key file (over 16 KB).' };
  if (/-{5}BEGIN ENCRYPTED PRIVATE KEY-{5}/.test(s)) return { ok: false, message: 'That key has a password on it. Download a new key from Enable Banking with “Generate in the browser”.' };
  if (/-{5}BEGIN (RSA )?PUBLIC KEY-{5}|-{5}BEGIN CERTIFICATE-{5}/.test(s) && !/PRIVATE KEY-{5}/.test(s)) return { ok: false, message: 'That is a public key or certificate. Upload the private key file (.pem) Enable Banking downloaded.' };
  if (/-{5}BEGIN (RSA )?PRIVATE KEY-{5}[\s\S]{100,}-{5}END (RSA )?PRIVATE KEY-{5}/.test(s)) return { ok: true };
  return { ok: false, message: 'That is not a private key file. Choose the .pem file Enable Banking downloaded when you created the app.' };
}
function finUuidCheck(id) {
  const s = String(id || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) ? { ok: true, value: s.toLowerCase() } : { ok: false };
}
/** The address pasted back from the bank (paste return): only the registered callback is accepted. */
function finEbPasteCheck(text) {
  const s = String(text || '').trim();
  if (!s) return { ok: false };
  let u;
  try { u = new URL(s); } catch (e) { return { ok: false, message: 'Paste the whole address from the browser tab, starting with https://localhost/' }; }
  if (u.protocol !== 'https:' || u.hostname !== 'localhost' || u.port || u.pathname !== '/opendash-eb-callback') return { ok: false, message: 'That is not the address the bank sent you back to. It starts with https://localhost/opendash-eb-callback' };
  if (u.searchParams.get('error')) return { ok: false, bankError: true, message: 'The bank did not give access (it said: ' + String(u.searchParams.get('error')).slice(0, 60) + '). Try signing in again.' };
  if (!u.searchParams.get('code') || !u.searchParams.get('state')) return { ok: false, message: 'That address has no sign-in code in it. Copy it again after the bank sends you back.' };
  return { ok: true, value: s };
}
/** What the Monzo approval step shows for a status from GET monzo/approval. */
function finMonzoView(st) {
  st = st || {};
  const n = Number(st.imported) || 0;
  const year = st.earliest ? String(st.earliest).slice(0, 4) : '';
  switch (st.state) {
    case 'waiting': return { phase: 'waiting', title: 'Approve in your Monzo app now', text: 'Open Monzo on your phone and tap Allow access. Do it within 5 minutes to bring in your full history.' };
    case 'importing': return { phase: 'importing', title: 'Bringing in your history', text: `${n.toLocaleString()} transaction${n === 1 ? '' : 's'}${year ? ', back to ' + year : ''} so far. Keep this open for a moment.` };
    case 'done': return { phase: 'done', title: 'Your Monzo history is in', text: `${n.toLocaleString()} transaction${n === 1 ? '' : 's'}${year ? ' since ' + year : ''}.` };
    case 'expired': return { phase: 'expired', title: 'Connected, with the last 90 days', text: 'Monzo is connected, with the last 90 days. To bring in older history, press Get full history and approve within 5 minutes.' };
    case 'auth': case 'error': return { phase: 'error', title: 'Monzo did not connect', text: st.message || 'Sign in to Monzo again from step 2.' };
    default: return { phase: 'signin', title: 'Waiting for Monzo sign-in', text: 'Finish signing in on the Monzo tab: enter your email, then open the link Monzo emails you.' };
  }
}

/* ---------- sheet shell ---------- */
const _finWiz = {};
let _finWizCtx = null;
function _finCopyRow(label, value, note) {
  const row = _finEl('div', 'fc-copy');
  const t = _finEl('div', 'fc-copy-t');
  t.append(_finEl('span', 'fc-copy-l', label));
  if (value) t.appendChild(_finEl('code', null, value));
  if (note) t.appendChild(_finEl('span', 'fc-copy-n', note));
  row.appendChild(t);
  if (value) row.appendChild(_connCopyBtn(value));
  return row;
}
function _finCallout(kind, ic, text, extra) {
  const c = _finEl('div', 'fc-callout is-' + kind); c.innerHTML = icon(ic, 'i-xs');
  const body = _finEl('div'); body.appendChild(typeof text === 'string' ? _finEl('span', null, text) : text);
  if (extra) body.appendChild(extra);
  c.appendChild(body);
  if (kind === 'err') c.setAttribute('role', 'alert');
  return c;
}
function _finField(label, input, hint) {
  const f = _finEl('label', 'fc-field');
  f.appendChild(_finEl('span', 'fc-field-l', label));
  f.appendChild(input);
  if (hint) f.appendChild(_finEl('span', 'fc-field-h', hint));
  return f;
}
function _finSteps(items) {
  const ol = _finEl('ol', 'fc-steps');
  for (const it of items) { const li = _finEl('li'); for (const part of (Array.isArray(it) ? it : [it])) li.appendChild(typeof part === 'string' ? _finEl('span', null, part) : part); ol.appendChild(li); }
  return ol;
}
function _finReduced() { return !!(window.Motion && Motion.prefersReduced && Motion.prefersReduced()) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); }
async function _finRefreshAll() {
  await Promise.all([SourcesStore.refresh(), FinConnectStore.load({ force: true })]);
  _srcAfterChange('bank');
}

const FIN_FLOWS = {
  plasma: { title: 'Add Plasma One', width: 520, steps: [{ id: 'address', title: 'Paste your address', render: _finPlasmaStep }] },
  monzo: { title: 'Connect Monzo', width: 580, steps: [
    { id: 'client', title: 'Make your Monzo key', render: _finMonzoClient },
    { id: 'connect', title: 'Connect', render: _finMonzoConnect },
    { id: 'approve', title: 'Approve in your Monzo app', render: _finMonzoApprove, noBack: true },
    { id: 'done', title: 'Done', render: _finDoneStep, noBack: true },
  ] },
  'enable-banking': { title: 'Connect your bank', width: 600, steps: [
    { id: 'lookup', title: 'Is my bank supported?', render: _finEbLookup },
    { id: 'app', title: 'Create your free Enable Banking app', render: _finEbApp },
    { id: 'bank', title: 'Choose your bank', render: _finEbBank },
    { id: 'signin', title: 'Sign in to your bank', render: _finEbSignin },
    { id: 'done', title: 'Done', render: _finDoneStep, noBack: true },
  ] },
};

/** Open a provider's sheet. opts: {step, reauth: sourceId, bank: name}. */
function finOpenFlow(id, opts) {
  const flow = FIN_FLOWS[id];
  if (!flow) return;
  opts = opts || {};
  const entry = FinConnectStore.entry(id) || {};
  const w = _finWiz[id] = _finWiz[id] || { step: flow.steps[0].id };
  if (w.step === 'done') w.step = flow.steps[0].id;        // a finished flow starts again
  if (id === 'monzo') {
    // A Monzo source whose client is saved but not signed in yet: carry on from Connect.
    const pending = (entry.sources || []).find(x => x && x.status && x.status.configured && !x.status.connected);
    if (opts.reauth) { w.sourceId = opts.reauth; w.reauth = true; w.step = 'connect'; w.connectAt = null; }
    else if (!w.sourceId && pending) { w.sourceId = pending.id; if (w.step === 'client') w.step = 'connect'; }
  }
  if (id === 'enable-banking') {
    if (opts.reauth) {
      const src = ((SourcesStore.data && SourcesStore.data.sources) || []).find(s => s.id === opts.reauth) || {};
      const aspsp = src.aspsp || src.bank || null;
      w.reauth = opts.reauth; w.startedAt = null;
      w.bank = aspsp && aspsp.name ? { name: aspsp.name, country: aspsp.country || _finCountry(), maxConsentDays: aspsp.maxConsentDays } : null;
      w.step = w.bank ? 'signin' : 'bank';
    }
    const appReady = !!(entry.configured && (!entry.app || entry.app.active !== false));
    if (opts.step === 'bank') w.step = appReady ? 'bank' : 'app';
    if (opts.bank) {
      w.query = opts.bank; w.bank = { name: opts.bank };
      w.step = appReady ? 'bank' : 'lookup';
    }
  }
  if (opts.step && flow.steps.some(s => s.id === opts.step) && id !== 'enable-banking') w.step = opts.step;
  openDrawer({
    title: flow.title, width: flow.width, resizeId: 'fin-flow',
    onClose: () => { if (_finWizCtx && _finWizCtx.id === id) { _finWizCtx.stop(); _finWizCtx = null; } delete w.clientSecret; delete w.pem; },
    body: (el, close) => {
      el.classList.add('fc-sheet');
      const ctx = _finWizCtx = {
        id, flow, w, el, close, entry: () => FinConnectStore.entry(id) || {}, timers: [],
        stop() { for (const t of this.timers) clearInterval(t); this.timers = []; },
        every(fn, ms) { const t = setInterval(fn, ms); this.timers.push(t); return t; },
        go(step) { if (w.step === step) return; this.stop(); w.step = step; w.err = null; this.paint(); },
        paint() { _finPaintSheet(this); },
      };
      ctx.paint();
    },
  });
}
function _finPaintSheet(ctx) {
  const { flow, w, el } = ctx;
  if (!el.isConnected && el.parentNode == null && _finWizCtx !== ctx) return;
  const idx = Math.max(0, flow.steps.findIndex(s => s.id === w.step));
  const step = flow.steps[idx];
  const keepFocus = el.contains(document.activeElement) && document.activeElement.dataset && document.activeElement.dataset.keep;
  el.replaceChildren();
  if (flow.steps.length > 1) {
    const head = _finEl('div', 'fc-stephead');
    head.appendChild(_finEl('span', 'fc-stephead-n', `Step ${idx + 1} of ${flow.steps.length}`));
    const dots = _finEl('ol', 'fc-dots'); dots.setAttribute('aria-hidden', 'true');
    flow.steps.forEach((s, i) => dots.appendChild(_finEl('li', i < idx ? 'done' : i === idx ? 'on' : '')));
    head.appendChild(dots);
    el.appendChild(head);
  }
  const h = _finEl('h3', 'fc-step-title', step.title); h.tabIndex = -1;
  el.appendChild(h);
  const body = _finEl('div', 'fc-step'); body.dataset.step = step.id;
  el.appendChild(body);
  const foot = _finEl('div', 'fc-foot');
  ctx.foot = {
    el: foot,
    back: idx > 0 && !step.noBack ? () => ctx.go(flow.steps[idx - 1].id) : null,
    buttons: [],
    add(label, ic, cls, run, o) { const b = _connBtn(label, ic, cls, run); b.classList.remove('btn-sm'); if (o && o.disabled) b.disabled = true; if (o && o.act) b.dataset.act = o.act; this.buttons.push(b); return b; },
  };
  step.render(ctx, body);
  if (ctx.foot.back) foot.appendChild(_connBtn('Back', 'arrow-left', 'btn-ghost', ctx.foot.back));
  foot.appendChild(_finEl('span', 'spacer'));
  if (!ctx.foot.noCancel) foot.appendChild(_connBtn(step.id === 'done' ? 'Close' : 'Cancel', null, 'btn-ghost', () => ctx.close()));
  for (const b of ctx.foot.buttons) foot.appendChild(b);
  el.appendChild(foot);
  if (w.focusTitle) { w.focusTitle = false; requestAnimationFrame(() => h.focus({ preventScroll: true })); }
  if (!keepFocus) { const auto = body.querySelector('[data-autofocus]'); if (auto) requestAnimationFrame(() => { if (auto.isConnected) auto.focus(); }); }
}

/* ---------- Plasma One ---------- */
function _finPlasmaStep(ctx, body) {
  const w = ctx.w;
  body.appendChild(_finEl('p', 'fc-lead', 'In Plasma One, open Receive and copy your address. That is all OpenDash needs: an address is public, so it can only ever read.'));
  const row = _finEl('div', 'fc-addr-row');
  const input = _finEl('input', 'fc-input fc-mono'); input.type = 'text'; input.value = w.address || '';
  input.placeholder = '0x…'; input.autocomplete = 'off'; input.spellcheck = false; input.setAttribute('autocapitalize', 'off');
  input.setAttribute('aria-label', 'Plasma wallet address'); input.dataset.autofocus = '1'; input.dataset.keep = '1';
  const paste = _connBtn('Paste', 'clipboard', 'btn-secondary', async () => {
    try { const t = await navigator.clipboard.readText(); input.value = t; onInput(); }
    catch (e) { toast('Your browser did not allow reading the clipboard. Press Ctrl+V in the box instead.', { kind: 'err' }); input.focus(); }
  });
  paste.classList.remove('btn-sm');
  row.append(input, paste);
  body.appendChild(row);
  const status = _finEl('div', 'fc-addr-status'); status.setAttribute('aria-live', 'polite');
  body.appendChild(status);
  const preview = _finEl('div', 'fc-preview');
  body.appendChild(preview);
  const nameInput = _finEl('input', 'fc-input'); nameInput.value = w.label || ''; nameInput.placeholder = 'Plasma One'; nameInput.maxLength = 60;
  nameInput.oninput = () => { w.label = nameInput.value; };
  body.appendChild(_finField('Name (optional)', nameInput, 'Shown in Finances and on Connections.'));
  body.appendChild(_finCallout('info', 'info', 'Card purchases come from the blockchain, so they show as “Plasma One payment” without the shop name, and some may be combined. Transfers show the other address; you can name addresses you recognise. Amounts are converted from USD at each day’s rate.'));
  const add = ctx.foot.add('Add wallet', 'plus', 'btn-primary', async () => {
    const chk = finAddressCheck(input.value);
    if (chk.state !== 'ok' || w.adding) return;
    w.adding = true; add.disabled = true; add.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>');
    try {
      const j = await finApi('plasma', { method: 'POST', body: { address: chk.address, label: (w.label || '').trim() || undefined } });
      ctx.close();
      delete _finWiz.plasma;
      toast(`${(j.source && j.source.label) || 'Plasma One'} added. Bringing in its history…`, { kind: 'ok', timeout: 7000, action: { label: 'Open Finances', run: () => setView('finance') } });
      await _finRefreshAll();
    } catch (e) {
      w.adding = false; add.disabled = false; const sp = add.querySelector('.spinner'); if (sp) sp.remove();
      showError(e);
    }
  }, { disabled: true, act: 'plasma-add' });
  let timer = null, seq = 0;
  function showError(e) {
    if (e.code === 'SECRET_REFUSED') { input.value = ''; w.address = ''; }
    status.className = 'fc-addr-status is-err';
    status.replaceChildren(_finCallout('err', e.code === 'SECRET_REFUSED' ? 'shield-check' : 'circle-alert', e.code === 'NOT_WALLET' || e.code === 'CONTRACT' ? 'That is a token contract, not your wallet. Copy the address from Receive in Plasma One.' : e.message));
    preview.replaceChildren(); add.disabled = true;
  }
  function onInput() {
    const chk = finAddressCheck(input.value);
    clearTimeout(timer); preview.replaceChildren();
    status.className = 'fc-addr-status';
    status.replaceChildren();
    add.disabled = true;
    if (chk.state === 'secret') {
      input.value = ''; w.address = '';               // never kept, never sent, never logged
      status.className = 'fc-addr-status is-err';
      status.appendChild(_finCallout('err', 'shield-check', chk.message));
      return;
    }
    w.address = chk.state === 'empty' ? '' : input.value.trim();
    if (chk.state === 'partial' || chk.state === 'invalid') { status.appendChild(_finEl('span', chk.state === 'invalid' ? 'fc-bad' : 'fc-mute', chk.message)); return; }
    if (chk.state !== 'ok') return;
    add.disabled = false;
    const mine = ++seq;
    status.innerHTML = '<span class="spinner"></span>'; status.appendChild(_finEl('span', 'fc-mute', 'Looking up this wallet…'));
    timer = setTimeout(async () => {
      try {
        const j = await finApi('plasma/preview', { method: 'POST', body: { address: chk.address } });
        if (mine !== seq) return;
        status.replaceChildren(); status.className = 'fc-addr-status is-ok';
        const ok = _finEl('span', 'fc-good'); ok.innerHTML = icon('circle-check', 'i-xs'); ok.appendChild(_finEl('span', null, 'Wallet found ' + finMask(chk.address))); status.appendChild(ok);
        const bal = j.balance || {};
        const amount = bal.amount != null ? `${Number(bal.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${bal.currency || 'USD'}` : '';
        const home = j.homeBalance && j.homeBalance.pence != null ? finMoney(j.homeBalance.pence, j.homeBalance.currency) : '';
        const count = j.transfers30d != null ? Number(j.transfers30d) : j.count30d != null ? Number(j.count30d) : null;
        const card = _finEl('div', 'fc-preview-card');
        const a = _finEl('div', 'fc-preview-big'); a.append(_finEl('b', null, amount || '0 USD'), _finEl('span', null, home ? '≈ ' + home + ' now' : 'now'));
        const b = _finEl('div', 'fc-preview-big'); b.append(_finEl('b', null, count == null ? '—' : String(count)), _finEl('span', null, `transfer${count === 1 ? '' : 's'} in the last 30 days`));
        card.append(a, b);
        preview.replaceChildren(card);
        if (j.empty || (count === 0 && !(Number(bal.amount) > 0))) preview.appendChild(_finEl('p', 'fc-mute', 'This wallet has no USDT activity yet. You can still add it; new transfers appear after each update.'));
      } catch (e) {
        if (mine !== seq) return;
        if (e.code === 'SECRET_REFUSED' || e.code === 'NOT_WALLET' || e.code === 'CONTRACT' || e.status === 400) showError(e);
        else { status.replaceChildren(_finEl('span', 'fc-mute', 'Could not look it up right now (' + e.message.replace(/\.$/, '') + '). You can still add it.')); add.disabled = false; }
      }
    }, 350);
  }
  input.oninput = onInput;
  input.onpaste = () => setTimeout(onInput, 0);
  if (input.value) onInput();
}

/* ---------- Monzo ---------- */
function _finMonzoRedirect() {
  const e = FinConnectStore.entry('monzo') || {};
  const u = e.redirectUri || e.redirectUrl;
  if (u && /^http:\/\/(localhost|127\.0\.0\.1):\d+\//.test(u)) return u;
  return `http://localhost:${location.port || '80'}/api/fin-connect/monzo/callback`;
}
function _finMonzoClient(ctx, body) {
  const w = ctx.w, entry = ctx.entry();
  const mine = (entry.sources || []).find(x => x && x.id === w.sourceId);
  const saved = mine && mine.status && mine.status.configured;
  if (saved && !w.changeClient) {
    body.appendChild(_finCallout('ok', 'circle-check', `Your Monzo client is saved on this computer${mine.status.client ? ' (' + mine.status.client + ')' : ''}.`));
    const change = _finEl('button', 'fc-link', 'Use a different client'); change.type = 'button';
    change.onclick = () => { w.changeClient = true; ctx.paint(); };
    body.appendChild(change);
    ctx.foot.add('Continue', 'arrow-right', 'btn-primary', () => ctx.go('connect'), { act: 'monzo-continue' });
    return;
  }
  body.appendChild(_finEl('p', 'fc-lead', 'Monzo lets you read your own account with a free developer “client”. You make it once; it takes about two minutes.'));
  const open = _connBtn('Open Monzo developers', 'external-link', 'btn-secondary', () => window.open('https://developers.monzo.com/', '_blank', 'noopener,noreferrer'));
  open.classList.remove('btn-sm');
  body.appendChild(_finSteps([
    [open, _finEl('span', 'fc-mute', 'Sign in with your email. Monzo emails you a link and asks you to approve in the app.')],
    'Open Clients, then New OAuth Client, and fill it in:',
  ]));
  const fields = _finEl('div', 'fc-copylist');
  fields.append(
    _finCopyRow('Name', 'OpenDash'),
    _finCopyRow('Logo URL', '', 'Leave empty'),
    _finCopyRow('Redirect URLs', _finMonzoRedirect()),
    _finCopyRow('Description', 'Personal dashboard (read-only)'),
  );
  const conf = _finEl('div', 'fc-copy is-key');
  const ct = _finEl('div', 'fc-copy-t'); ct.append(_finEl('span', 'fc-copy-l', 'Confidentiality'), _finEl('b', null, 'Confidential'), _finEl('span', 'fc-copy-n', 'Needed so you stay signed in.'));
  conf.appendChild(ct); fields.appendChild(conf);
  body.appendChild(fields);
  body.appendChild(_finEl('p', 'fc-sub', 'Then press Submit and copy the two values Monzo shows:'));
  const id = _finEl('input', 'fc-input fc-mono'); id.value = w.clientId || ''; id.placeholder = 'oauth2client_…'; id.autocomplete = 'off'; id.spellcheck = false; id.dataset.autofocus = '1';
  const secret = _finEl('input', 'fc-input fc-mono'); secret.type = 'password'; secret.value = w.clientSecret || ''; secret.autocomplete = 'new-password'; secret.placeholder = 'mnzconf.…';
  body.append(_finField('Client ID', id), _finField('Client secret', secret, 'Saved only on this computer, in your data folder’s secrets area. It is never shown again.'));
  const err = _finEl('div', 'fc-field-err'); err.setAttribute('aria-live', 'polite'); body.appendChild(err);
  if (w.err) err.appendChild(_finCallout('err', 'circle-alert', w.err));
  const save = ctx.foot.add('Save and continue', 'arrow-right', 'btn-primary', async () => {
    const c = finMonzoClientCheck(id.value);
    if (!c.ok) { err.replaceChildren(_finCallout('err', 'circle-alert', c.message || 'Paste the client ID.')); id.focus(); return; }
    if (secret.value.trim().length < 8) { err.replaceChildren(_finCallout('err', 'circle-alert', 'Paste the client secret too.')); secret.focus(); return; }
    save.disabled = true;
    try {
      const j = await finApi('monzo/client', { method: 'PUT', body: { clientId: c.value, clientSecret: secret.value.trim(), sourceId: w.reauth ? w.sourceId : undefined } });
      secret.value = ''; delete w.clientSecret; w.changeClient = false;
      w.sourceId = j.sourceId || (j.source && j.source.id) || w.sourceId;
      FinConnectStore.load({ force: true });
      ctx.go('connect');
    } catch (e) { save.disabled = false; err.replaceChildren(_finCallout('err', 'circle-alert', e.message)); }
  }, { act: 'monzo-save' });
  id.oninput = () => { w.clientId = id.value; };
  secret.oninput = () => { w.clientSecret = secret.value; };        // only while the sheet is open
}
function _finMonzoConnect(ctx, body) {
  const w = ctx.w;
  body.appendChild(_finEl('p', 'fc-lead', 'Monzo opens in a new tab. Enter your email, then open the link Monzo emails you. Come back here straight after: the next step has a 5-minute window.'));
  const steps = _finSteps(['Press Connect Monzo.', 'Enter your email on Monzo’s page and open the link in the email it sends.', 'Come back to this tab. Have your phone ready to approve in the Monzo app.']);
  body.appendChild(steps);
  const wait = _finEl('div', 'fc-waiting'); wait.setAttribute('aria-live', 'polite');
  body.appendChild(wait);
  const start = () => {
    if (!w.sourceId) { ctx.go('client'); return; }
    const tab = window.open(FIN_API + 'monzo/connect?source=' + encodeURIComponent(w.sourceId), '_blank');
    if (!tab) toast('Your browser blocked the new tab. Allow pop-ups for OpenDash and press Connect Monzo again.', { kind: 'err', timeout: 8000 });
    w.connectAt = Date.now(); ctx.paint();
  };
  if (w.connectAt) {
    wait.innerHTML = '<span class="spinner"></span>';
    wait.appendChild(_finEl('span', null, 'Waiting for you to finish signing in on the Monzo tab…'));
    const poll = async () => {
      try {
        const st = await finApi('monzo/approval?source=' + encodeURIComponent(w.sourceId));
        if (st && ['waiting', 'importing', 'done', 'expired'].includes(st.state)) { w.approval = st; w.deadline = Date.now() + (Number(st.secondsLeft) || 0) * 1000; ctx.go('approve'); }
        else if (st && (st.state === 'auth' || st.state === 'error')) { w.connectAt = null; w.err = st.message || 'Monzo did not finish the sign-in. Try again.'; ctx.paint(); }
      } catch (e) { /* keep waiting: the server may be busy */ }
    };
    ctx.every(poll, 2000); poll();
    ctx.foot.add('Open Monzo again', 'external-link', 'btn-secondary', start);
  } else ctx.foot.add('Connect Monzo', 'log-in', 'btn-primary', start, { act: 'monzo-connect' });
  if (w.err) body.appendChild(_finCallout('err', 'circle-alert', w.err));
}
function _finMonzoApprove(ctx, body) {
  const w = ctx.w;
  const view = finMonzoView(w.approval);
  const reduced = _finReduced();
  const wrap = _finEl('div', 'fc-approve is-' + view.phase);
  const total = Number(w.approval && w.approval.windowSeconds) || Number(ctx.entry().windowSeconds) || FIN_MONZO_WINDOW;
  const clock = _finEl('div', 'fc-ring' + (reduced ? ' is-plain' : ''));
  clock.setAttribute('role', 'timer'); clock.setAttribute('aria-label', 'Time left to approve');
  const C = 2 * Math.PI * 52;
  if (!reduced) clock.innerHTML = `<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="fc-ring-bg" cx="60" cy="60" r="52"/><circle class="fc-ring-fg" cx="60" cy="60" r="52" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0" transform="rotate(-90 60 60)"/></svg>`;
  const num = _finEl('span', 'fc-ring-n');
  const lab = _finEl('span', 'fc-ring-l', view.phase === 'importing' ? 'left to import' : 'left to approve');
  const mid = _finEl('div', 'fc-ring-mid'); mid.append(num, lab);
  clock.appendChild(mid);
  const text = _finEl('div', 'fc-approve-t');
  const tt = _finEl('b', null, view.title), tx = _finEl('p', null, view.text);
  text.append(tt, tx);
  if (view.phase === 'waiting') {
    const ph = _finEl('div', 'fc-phone'); ph.innerHTML = icon('phone', 'i-xs'); ph.appendChild(_finEl('span', null, 'Monzo app › Allow access'));
    text.appendChild(ph);
  }
  wrap.append(view.phase === 'expired' || view.phase === 'error' ? _finEl('span') : clock, text);
  body.appendChild(wrap);
  const tick = () => {
    const left = Math.max(0, Math.round(((w.deadline || Date.now()) - Date.now()) / 1000));
    num.textContent = finClock(left);
    const fg = clock.querySelector('.fc-ring-fg');
    if (fg) fg.setAttribute('stroke-dashoffset', String((C * (1 - Math.min(1, left / total))).toFixed(1)));
    clock.classList.toggle('is-low', left <= 60);
  };
  tick();
  if (view.phase === 'waiting' || view.phase === 'importing') ctx.every(tick, 1000);
  const poll = async () => {
    try {
      const st = await finApi('monzo/approval?source=' + encodeURIComponent(w.sourceId));
      if (!st) return;
      if (st.secondsLeft != null) w.deadline = Date.now() + Number(st.secondsLeft) * 1000;
      const changed = !w.approval || st.state !== w.approval.state || st.imported !== w.approval.imported;
      w.approval = st;
      if (st.state === 'done') { w.doneSource = w.sourceId; FinConnectStore.load({ force: true }); SourcesStore.refresh(); ctx.go('done'); return; }
      if (changed) { ctx.stop(); ctx.paint(); }
    } catch (e) { /* keep the countdown going */ }
  };
  if (view.phase === 'waiting' || view.phase === 'importing' || view.phase === 'signin') ctx.every(poll, 2000);
  if (view.phase === 'expired') {
    ctx.foot.add('Finish with 90 days', null, 'btn-secondary', () => { w.doneSource = w.sourceId; _finRefreshAll(); ctx.go('done'); });
    ctx.foot.add('Get full history', 'history', 'btn-primary', () => { w.connectAt = null; w.approval = null; ctx.go('connect'); }, { act: 'monzo-full' });
  } else if (view.phase === 'error') {
    ctx.foot.add('Sign in again', 'log-in', 'btn-primary', () => { w.connectAt = null; w.approval = null; ctx.go('connect'); });
  }
}

/* ---------- Done (shared): accounts found, Show in Finances switches ---------- */
function _finDoneStep(ctx, body) {
  const w = ctx.w;
  const sid = w.doneSource || w.sourceId;
  const groups = _finGroups().filter(g => g.source.id === sid || (ctx.id !== 'monzo' && Array.isArray(w.doneSources) && w.doneSources.includes(g.source.id)));
  const hero = _finEl('div', 'fc-done');
  const ic = _finEl('span', 'fc-done-ic'); ic.innerHTML = icon('party-popper');
  const t = _finEl('div'); t.append(_finEl('b', null, ctx.id === 'monzo' ? 'Monzo is connected' : `${(w.bank && w.bank.name) || 'Your bank'} is connected`), _finEl('span', null, 'Choose what shows in Finances. Hidden accounts keep their data, and you can change this any time on Connections.'));
  hero.append(ic, t); body.appendChild(hero);
  const list = _finEl('div', 'fc-done-list');
  let n = 0;
  for (const g of groups) for (const a of g.accounts) {
    n++;
    const row = _finEl('div', 'fc-done-row');
    row.append(_finEl('span', 'fc-sw c-' + (SRC_SWATCHES.includes(a.colour) ? a.colour : 'slate')));
    const names = _finEl('div', 'fc-acc-names'); names.append(_finEl('span', 'fc-acc-name', a.name), _finEl('span', 'fc-acc-sub', [FIN_KIND_LABEL[a.kind] || '', finMask(a.mask), a.kind === 'pot' ? 'balance only' : ''].filter(Boolean).join(' · ')));
    row.appendChild(names);
    if (a.balance != null) row.appendChild(_finEl('span', 'fc-acc-bal', finMoney(a.balance, a.currency)));
    const sw = _finEl('button', 'fc-switch'); sw.type = 'button'; sw.setAttribute('role', 'switch'); sw.setAttribute('aria-checked', String(a.enabled));
    sw.setAttribute('aria-label', 'Show ' + a.name + ' in Finances'); sw.appendChild(_finEl('span', 'fc-switch-knob'));
    sw.onclick = async () => { sw.disabled = true; await _finPatchAccount(g, a, { enabled: !a.enabled }); ctx.paint(); };
    row.appendChild(sw);
    list.appendChild(row);
  }
  if (!n) {
    const l = _finEl('div', 'fc-waiting'); l.innerHTML = '<span class="spinner"></span>'; l.appendChild(_finEl('span', null, 'Finding your accounts…'));
    list.appendChild(l);
    ctx.every(async () => { await FinConnectStore.load({ force: true }); await SourcesStore.load({ force: true }); if (_finGroups().some(g => g.source.id === sid && g.accounts.length)) { ctx.stop(); ctx.paint(); } }, 2500);
  }
  body.appendChild(list);
  if (ctx.id === 'enable-banking') ctx.foot.add('Add another bank', 'plus', 'btn-secondary', () => { w.bank = null; w.query = ''; ctx.go('bank'); });
  ctx.foot.add('Open Finances', 'arrow-right', 'btn-primary', () => { ctx.close(); delete _finWiz[ctx.id]; setView('finance'); }, { act: 'open-finances' });
}

/* ---------- Enable Banking ---------- */
function _finEbRedirect() {
  const e = FinConnectStore.entry('enable-banking') || {};
  const mode = (e.redirect && e.redirect.mode) || e.ebRedirect || (FinConnectStore.meta && FinConnectStore.meta.ebRedirect) || 'paste';
  const url = (e.redirect && e.redirect.url) || FIN_EB_REDIRECTS[mode === 'bounce' ? 'bounce' : 'paste'];
  return { mode: mode === 'bounce' ? 'bounce' : 'paste', url };
}
function _finBankRow(b, onPick, selected) {
  const btn = _finEl('button', 'fc-bank' + (selected ? ' on' : '')); btn.type = 'button';
  if (selected) btn.setAttribute('aria-current', 'true');
  const logo = _finEl('span', 'fc-bank-logo');
  if (b.logo && /^https:\/\//.test(b.logo)) { const img = _finEl('img'); img.alt = ''; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; img.src = b.logo; img.onerror = () => { img.remove(); logo.textContent = _finInitials(b.name); }; logo.appendChild(img); }
  else logo.textContent = _finInitials(b.name);
  const t = _finEl('span', 'fc-bank-t');
  t.append(_finEl('b', null, b.name));
  const days = Number(b.maxConsentDays) || (b.maximum_consent_validity ? Math.round(b.maximum_consent_validity / 86400) : 0);
  t.appendChild(_finEl('span', null, [b.beta ? 'In beta' : 'Supported', days ? `sign in again every ${Math.min(days, 180)} days` : ''].filter(Boolean).join(' · ')));
  btn.append(logo, t);
  if (b.beta) btn.appendChild(_finEl('span', 'fc-beta', 'beta'));
  btn.onclick = () => { if (selected) return; onPick(b); };
  return btn;
}
function _finInitials(name) { return String(name || '?').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join('') || '?'; }
function _finEbLookup(ctx, body) {
  const w = ctx.w, entry = ctx.entry();
  w.country = w.country || _finCountry();
  body.appendChild(_finEl('p', 'fc-lead', 'Check your bank first. Enable Banking connects to banks across Europe through open banking.'));
  const row = _finEl('div', 'fc-lookup');
  const sel = _finEl('select', 'fc-input');
  for (const [code, name] of FIN_EB_COUNTRIES) { const o = _finEl('option', null, name); o.value = code; if (code === w.country) o.selected = true; sel.appendChild(o); }
  sel.setAttribute('aria-label', 'Country');
  const q = _finEl('input', 'fc-input'); q.type = 'search'; q.placeholder = 'Your bank’s name'; q.value = w.query || ''; q.dataset.autofocus = '1'; q.dataset.keep = '1';
  q.setAttribute('aria-label', 'Your bank’s name');
  row.append(sel, q); body.appendChild(row);
  const out = _finEl('div', 'fc-lookup-out'); out.setAttribute('aria-live', 'polite');
  body.appendChild(out);
  const setup = ctx.foot.add(entry.configured ? 'Continue' : 'Set up Enable Banking', 'arrow-right', 'btn-primary', () => ctx.go(entry.configured ? 'bank' : 'app'), { act: 'eb-setup' });
  const paint = () => {
    out.replaceChildren();
    const info = _finBankList(w.country);
    const query = (w.query || '').trim().toLowerCase();
    const countryName = (FIN_EB_COUNTRIES.find(c => c[0] === w.country) || [, w.country])[1];
    if (/monzo|plasma/.test(query)) {
      const id = /monzo/.test(query) ? 'monzo' : 'plasma';
      out.appendChild(_finCallout('info', 'arrow-right', `${finProviderInfo(id).name} has its own, simpler connection.`, _connBtn('Use the ' + finProviderInfo(id).name + ' connection', 'arrow-right', 'btn-secondary', () => { ctx.close(); finOpenFlow(id); })));
      setup.disabled = true; return;
    }
    if (info.source === 'none' || !info.banks.length) {
      out.appendChild(_finCallout('warn', 'info', `We could not confirm which banks in ${countryName} Enable Banking covers yet: their full list needs your own free app. Set it up to check the live list (about 5 minutes), or import a CSV instead.`,
        _connBtn('Import a CSV instead', 'upload', 'btn-ghost', () => { ctx.close(); finImportCsv(); })));
      setup.disabled = false; setup.lastChild.textContent = entry.configured ? 'Continue' : 'Set up and check';
      return;
    }
    if (!query) {
      out.appendChild(_finEl('p', 'fc-mute', `${info.banks.length} bank${info.banks.length === 1 ? '' : 's'} in ${countryName}${info.source === 'snapshot' && info.asOf ? ' (list from ' + finDateLabel(info.asOf) + ')' : ''}. Type your bank’s name.`));
      setup.disabled = !entry.configured; return;
    }
    const hits = info.banks.filter(b => String(b.name).toLowerCase().includes(query)).slice(0, 8);
    if (!hits.length) {
      out.appendChild(_finCallout('warn', 'circle-alert', `“${w.query.trim()}” is not available through Enable Banking${info.source === 'snapshot' ? ' in the list we have' : ''}. Use CSV import instead.`,
        _connBtn('Import a CSV', 'upload', 'btn-secondary', () => { ctx.close(); finImportCsv(); })));
      setup.disabled = !entry.configured; return;
    }
    const list = _finEl('div', 'fc-banks');
    for (const b of hits) list.appendChild(_finBankRow(b, (pick) => { w.bank = pick; paint(); }, w.bank && w.bank.name === b.name));
    out.appendChild(list);
    if (w.bank && hits.some(b => b.name === w.bank.name)) {
      const days = Number(w.bank.maxConsentDays) || 0;
      out.appendChild(_finCallout('ok', 'circle-check', `Supported: ${w.bank.name}${w.bank.beta ? ' (in beta)' : ''}${days ? `. You sign in again every ${Math.min(days, 180)} days` : ''}.`));
      setup.disabled = false;
    } else setup.disabled = true;
  };
  sel.onchange = () => { w.country = sel.value; w.bank = null; paint(); };
  q.oninput = () => { w.query = q.value; paint(); };
  paint();
}
function _finEbApp(ctx, body) {
  const w = ctx.w, entry = ctx.entry();
  if (entry.configured && !w.app && !w.changeApp) {
    // Ask the server whether the saved app is active (one signed call, nothing secret comes back).
    const l = _finEl('div', 'fc-waiting'); l.innerHTML = '<span class="spinner"></span>'; l.appendChild(_finEl('span', null, 'Checking your Enable Banking app…'));
    body.appendChild(l);
    if (!w.appChecking) {
      w.appChecking = true;
      finApi('eb/app').then(j => { w.app = j && j.configured !== false ? j : null; if (!w.app) w.changeApp = true; })
        .catch(e => { w.app = { active: null, error: e.message }; })
        .finally(() => { w.appChecking = false; if (_finWizCtx === ctx && w.step === 'app') ctx.paint(); });
    }
    return;
  }
  const app = w.app || null;
  if (entry.configured && app && !w.changeApp) {
    const active = app.active !== false;
    if (app.error) body.appendChild(_finCallout('warn', 'circle-alert', 'Could not check the app just now (' + app.error.replace(/\.$/, '') + '). You can still continue.'));
    else body.appendChild(_finCallout(active ? 'ok' : 'warn', active ? 'circle-check' : 'info', `App found${entry.appIdMasked ? ' (' + entry.appIdMasked + ')' : ''}: ${app.restricted === false ? 'full' : 'restricted'} mode, ${active ? 'active' : 'inactive'}.`));
    if (!active) {
      body.appendChild(_finSteps(['In the Enable Banking Control Panel, open your OpenDash app.', 'Press Activate by linking accounts, and link the bank you want.', 'Come back here and press Check again.']));
      ctx.foot.add('Check again', 'refresh-cw', 'btn-primary', async (b) => {
        b.disabled = true;
        try { w.app = await finApi('eb/app'); } catch (e) { toast(e.message, { kind: 'err' }); }
        if (w.app && w.app.active) toast('Your Enable Banking app is active.', { kind: 'ok' });
        ctx.paint();
      }, { act: 'eb-check' });
    } else ctx.foot.add('Continue', 'arrow-right', 'btn-primary', () => ctx.go('bank'), { act: 'eb-continue' });
    const change = _finEl('button', 'fc-link', 'Use a different app'); change.type = 'button'; change.onclick = () => { w.changeApp = true; ctx.paint(); };
    body.appendChild(change);
    return;
  }
  const red = _finEbRedirect();
  body.appendChild(_finEl('p', 'fc-lead', 'Enable Banking is free for your own accounts. You make one app, once; then each bank takes about a minute.'));
  const open = _connBtn('Open Enable Banking', 'external-link', 'btn-secondary', () => window.open('https://enablebanking.com/sign-in/', '_blank', 'noopener,noreferrer'));
  open.classList.remove('btn-sm');
  body.appendChild(_finSteps([[open, _finEl('span', 'fc-mute', 'Sign up with your email (free).')], 'Go to API applications, press Add, and fill it in:']));
  const fields = _finEl('div', 'fc-copylist');
  fields.append(
    _finCopyRow('Environment', 'Production'),
    _finCopyRow('Application name', 'OpenDash'),
    _finCopyRow('Allowed redirect URLs', red.url, red.mode === 'paste' ? 'Nothing runs at this address: after the bank, you paste it back here.' : 'A small page that sends your browser straight back to OpenDash.'),
    _finCopyRow('Description', 'Personal dashboard (read-only)'),
    _finCopyRow('Private key', '', 'Keep “Generate in the browser”. Submitting downloads a .pem key file.'),
  );
  body.appendChild(fields);
  const drop = _finEl('label', 'fc-drop' + (w.pemName ? ' has-file' : ''));
  const file = _finEl('input'); file.type = 'file'; file.accept = '.pem,application/x-pem-file,text/plain'; file.className = 'fc-file';
  drop.innerHTML = icon(w.pemName ? 'circle-check' : 'file-up');
  const dt = _finEl('span', 'fc-drop-t');
  dt.append(_finEl('b', null, w.pemName ? 'Key file ready' : 'Upload the .pem key file'), _finEl('span', null, w.pemName ? `${w.pemName} · kept only on this computer` : 'Drop it here or choose it. It is saved only in your data folder’s secrets area.'));
  drop.append(dt, file);
  body.appendChild(drop);
  const err = _finEl('div', 'fc-field-err'); err.setAttribute('aria-live', 'polite');
  const read = async (f) => {
    if (!f) return;
    if (f.size > 16384) { err.replaceChildren(_finCallout('err', 'circle-alert', 'That file is too big for a key file (over 16 KB).')); return; }
    const text = await f.text();
    const c = finPemCheck(text, f.size);
    if (!c.ok) { w.pem = null; w.pemName = null; err.replaceChildren(_finCallout('err', 'circle-alert', c.message || 'That is not a key file.')); return; }
    w.pem = text; w.pemName = String(f.name || 'key.pem').slice(0, 60); err.replaceChildren(); ctx.paint();
  };
  file.onchange = () => read(file.files && file.files[0]);
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('is-over'); };
  drop.ondragleave = () => drop.classList.remove('is-over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('is-over'); read(e.dataTransfer.files && e.dataTransfer.files[0]); };
  const appId = _finEl('input', 'fc-input fc-mono'); appId.value = w.appId || ''; appId.placeholder = '00000000-0000-0000-0000-000000000000'; appId.autocomplete = 'off'; appId.spellcheck = false;
  appId.oninput = () => { w.appId = appId.value; };
  body.appendChild(_finField('Application ID', appId, 'Shown on the app’s page in Enable Banking (a long code with dashes).'));
  body.appendChild(err);
  if (w.err) err.appendChild(_finCallout('err', 'circle-alert', w.err));
  const save = ctx.foot.add('Save and check', 'arrow-right', 'btn-primary', async () => {
    const u = finUuidCheck(appId.value);
    if (!w.pem) { err.replaceChildren(_finCallout('err', 'circle-alert', 'Upload the .pem key file first.')); return; }
    if (!u.ok) { err.replaceChildren(_finCallout('err', 'circle-alert', 'Paste the Application ID: a long code with dashes.')); appId.focus(); return; }
    save.disabled = true; save.insertAdjacentHTML('afterbegin', '<span class="spinner"></span>');
    try {
      const j = await finApi('eb/app', { method: 'PUT', body: { appId: u.value, pem: w.pem } });
      delete w.pem; w.pemName = null; w.changeApp = false;
      w.app = j.app || { active: j.active !== false };
      await FinConnectStore.load({ force: true });
      if (w.app.active === false) ctx.paint(); else ctx.go('bank');
    } catch (e) { save.disabled = false; const sp = save.querySelector('.spinner'); if (sp) sp.remove(); err.replaceChildren(_finCallout('err', 'circle-alert', e.message)); }
  }, { act: 'eb-save' });
}
function _finEbBank(ctx, body) {
  const w = ctx.w;
  w.country = w.country || _finCountry();
  const row = _finEl('div', 'fc-lookup');
  const sel = _finEl('select', 'fc-input');
  for (const [code, name] of FIN_EB_COUNTRIES) { const o = _finEl('option', null, name); o.value = code; if (code === w.country) o.selected = true; sel.appendChild(o); }
  sel.setAttribute('aria-label', 'Country');
  const q = _finEl('input', 'fc-input'); q.type = 'search'; q.placeholder = 'Search banks'; q.value = w.query || ''; q.dataset.autofocus = '1'; q.dataset.keep = '1';
  q.setAttribute('aria-label', 'Search banks');
  row.append(sel, q); body.appendChild(row);
  const out = _finEl('div', 'fc-banks fc-banks-tall'); out.setAttribute('role', 'list');
  body.appendChild(out);
  const psu = _finEl('div', 'fc-psu');
  body.appendChild(psu);
  const next = ctx.foot.add('Continue', 'arrow-right', 'btn-primary', () => ctx.go('signin'), { disabled: !w.bank || !w.bank.country, act: 'eb-bank-next' });
  const load = async () => {
    if (w.banksFor === w.country && w.banks) return;
    out.replaceChildren(); const l = _finEl('div', 'fc-waiting'); l.innerHTML = '<span class="spinner"></span>'; l.appendChild(_finEl('span', null, 'Loading banks…')); out.appendChild(l);
    try {
      const j = await finApi('eb/banks?country=' + encodeURIComponent(w.country));
      w.banks = (j.banks || []).map(b => Object.assign({ country: w.country }, b)); w.banksFor = w.country;
    } catch (e) { w.banks = null; w.banksFor = null; out.replaceChildren(_finCallout('err', 'circle-alert', e.message)); return; }
    paint();
  };
  const paint = () => {
    if (!w.banks) return;
    out.replaceChildren(); psu.replaceChildren();
    const query = (w.query || '').trim().toLowerCase();
    const hits = w.banks.filter(b => !query || String(b.name).toLowerCase().includes(query)).slice(0, 60);
    if (!hits.length) out.appendChild(_finCallout('warn', 'circle-alert', `No bank called “${w.query.trim()}” in this country through Enable Banking. Use CSV import instead.`, _connBtn('Import a CSV', 'upload', 'btn-secondary', () => { ctx.close(); finImportCsv(); })));
    for (const b of hits) out.appendChild(_finBankRow(b, (pick) => { w.bank = pick; w.psuType = (pick.psuTypes || ['personal'])[0]; next.disabled = false; paint(); }, w.bank && w.bank.name === b.name && w.bank.country === b.country));
    if (w.bank && w.banks.some(b => b.name === w.bank.name)) {
      w.bank = w.banks.find(b => b.name === w.bank.name);
      if (!w.psuType) w.psuType = (w.bank.psuTypes || ['personal'])[0];
      next.disabled = false;
      const types = Array.isArray(w.bank.psuTypes) ? w.bank.psuTypes : [];
      if (types.includes('personal') && types.includes('business')) {
        psu.appendChild(_finEl('span', 'fc-field-l', 'Account type'));
        const seg = _finEl('div', 'fc-seg'); seg.setAttribute('role', 'radiogroup');
        for (const t of ['personal', 'business']) {
          const b = _finEl('button', w.psuType === t ? 'on' : '', t === 'personal' ? 'Personal' : 'Business'); b.type = 'button';
          b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(w.psuType === t));
          b.onclick = () => { if (w.psuType === t) return; w.psuType = t; paint(); };
          seg.appendChild(b);
        }
        psu.appendChild(seg);
      }
    }
  };
  sel.onchange = () => { w.country = sel.value; w.bank = null; next.disabled = true; load(); };
  q.oninput = () => { w.query = q.value; paint(); };
  if (w.banksFor === w.country && w.banks) paint(); else load();
}
function _finEbSignin(ctx, body) {
  const w = ctx.w;
  const bank = w.bank || {};
  const red = _finEbRedirect();
  if (!bank.name) { ctx.go('bank'); return; }
  const days = Math.min(Number(bank.maxConsentDays) || 180, 180);
  body.appendChild(_finEl('p', 'fc-lead', `You sign in on ${bank.name}’s own page (usually you approve in its app). ${bank.name} then gives OpenDash read-only access for ${days} days; we remind you before it ends.`));
  const wait = _finEl('div', 'fc-waiting'); wait.setAttribute('aria-live', 'polite');
  const err = _finEl('div', 'fc-field-err'); err.setAttribute('aria-live', 'polite');
  if (w.err) err.appendChild(_finCallout('err', 'circle-alert', w.err));
  const begin = async (btn) => {
    if (w.starting) return;
    w.starting = true; if (btn) btn.disabled = true;
    const tab = window.open('about:blank', '_blank');      // opened inside the click, so it is not blocked
    try {
      const j = await finApi('eb/start', { method: 'POST', body: { bank: bank.name, country: bank.country || w.country, psuType: w.psuType || 'personal', sourceId: typeof w.reauth === 'string' ? w.reauth : undefined } });
      if (!j.url || !/^https?:\/\//.test(j.url)) throw new Error('Enable Banking did not return a sign-in page. Try again.');
      if (tab) { try { tab.opener = null; } catch (e) { /* ignore */ } tab.location.href = j.url; }
      else window.open(j.url, '_blank', 'noopener');
      w.startedAt = Date.now(); w.ebState = j.state || null; w.before = _finGroups().filter(g => g.provider === 'enable-banking').map(g => g.source.id);
      w.starting = false; w.err = null; ctx.paint();
    } catch (e) {
      if (tab) tab.close();
      w.starting = false; if (btn) btn.disabled = false;
      err.replaceChildren(_finCallout('err', 'circle-alert', e.message));
    }
  };
  if (!w.startedAt) {
    ctx.foot.add(`Continue to ${bank.name}`, 'external-link', 'btn-primary', (b) => begin(b), { act: 'eb-start' });
    body.appendChild(err);
    return;
  }
  const finished = (sourceIds) => { w.doneSources = sourceIds; w.doneSource = sourceIds[0]; w.startedAt = null; _finRefreshAll(); ctx.go('done'); };
  if (red.mode === 'bounce') {
    wait.innerHTML = '<span class="spinner"></span>'; wait.appendChild(_finEl('span', null, `Waiting for ${bank.name}… Finish signing in on the bank’s tab; it brings you back here.`));
    body.appendChild(wait);
    ctx.every(async () => {
      let r = null;
      try { r = w.ebState ? await finApi('eb/pending?state=' + encodeURIComponent(w.ebState)) : null; } catch (e) { return; }
      if (r && r.status === 'done' && r.sourceId) { ctx.stop(); finished([r.sourceId]); }
      else if (r && r.status === 'error') { ctx.stop(); w.startedAt = null; w.err = r.message || 'The bank sign-in did not finish. Try again.'; ctx.paint(); }
      else if (r && r.status === 'unknown') { ctx.stop(); w.startedAt = null; w.err = 'This bank sign-in expired. Start it again.'; ctx.paint(); }
    }, 2500);
  } else {
    body.appendChild(_finCallout('info', 'info', 'After the bank, your browser shows “This site can’t be reached”. That is expected: copy the whole address from that tab and paste it here.'));
    const input = _finEl('input', 'fc-input fc-mono'); input.placeholder = 'https://localhost/opendash-eb-callback?…'; input.autocomplete = 'off'; input.spellcheck = false; input.dataset.autofocus = '1';
    body.appendChild(_finField('The address from that tab', input));
    const fin = ctx.foot.add('Finish', 'check', 'btn-primary', async () => {
      const c = finEbPasteCheck(input.value);
      if (!c.ok) { err.replaceChildren(_finCallout('err', 'circle-alert', c.message || 'Paste the address first.')); return; }
      fin.disabled = true;
      try {
        const j = await finApi('eb/finish', { method: 'POST', body: { url: c.value } });
        input.value = '';
        const ids = [j.sourceId || (j.source && j.source.id)].filter(Boolean);
        finished(ids.length ? ids : [typeof w.reauth === 'string' ? w.reauth : null].filter(Boolean));
      } catch (e) { fin.disabled = false; err.replaceChildren(_finCallout('err', 'circle-alert', e.message)); }
    }, { act: 'eb-finish' });
    input.oninput = () => { const c = finEbPasteCheck(input.value); err.replaceChildren(); if (input.value && !c.ok && c.message) err.appendChild(_finEl('span', 'fc-bad', c.message)); };
  }
  body.appendChild(err);
  const again = _finEl('button', 'fc-link', `Open ${bank.name} again`); again.type = 'button';
  again.onclick = () => { w.startedAt = null; ctx.paint(); };
  body.appendChild(again);
}
