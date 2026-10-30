/* ============================================================
   SETTINGS > Your relay (#view=settings:relay). Server: server/routes/relay.mjs
   (lib/relay/deploy.mjs); the relay itself: docs/dev/RELAY_PROTOCOL.md.
   A private relay on the person's own Cloudflare account carries their sync
   and their friends' messages, end-to-end encrypted. The card (2.17.1,
   docs/dev/SIMPLIFY_PLAN.md 5.3) starts with a status line (On, Setting up,
   Not set up); not set up, its one button is Set up my relay: wrangler
   signs in (the browser opens, they click Allow), the relay is deployed with
   their identity as its owner, checked, and its address saved for all their
   computers. Every wait shows its step, a note and its time, with Cancel;
   every stop says why in one line, what to do next, and offers Try again
   (and, when it fits, Check again, an account list, Sign in with another
   account, Use a new address). Done: a small celebration and "Your relay is
   ready" with Invite a friend and Use it for sync (the choice follows the
   person: their other computers switch to it as soon as they have its key,
   the folder kept as a backup). More: How friends work, Use a friend's relay.
   Advanced: Update my relay (in place), Stop using this relay (Undo).
   Then who may use it (their computers by name; the friends they invited,
   with what they may do and their storage; invites with when they end;
   Remove access / Remove / Cancel invite with Undo) and today's free
   allowance, folded unless nearly used up.
   Page API: relaySettingsOpen({start}), relayInviteFriend(), relaySyncToo().
   relayStepIcon and relayUsageRows are pure.
   ============================================================ */
let _rlMoreOpen = false, _rlUsageOpen = false, _rlAdvOpen = false;   // the page's folded parts, open across repaints
let _rlSt = null, _rlAdmin = null, _rlBusy = false, _rlPoll = null, _rlAdminAt = 0, _rlAccount = '', _rlInvite = '', _rlFrAsked = false, _rlWasRunning = false, _rlTick = null;
const _RL_NEXT_KEY = 'dashboard-relay-next-seen';   // this browser: the "You're connected" card was closed for this job (its start time)

function relayStepIcon(state) { return state === 'done' ? 'check' : state === 'doing' ? 'loader-circle' : state === 'error' ? 'triangle-alert' : 'circle-dashed'; }
/** [{label, used, max, text}] for the usage bars (relay.today and storage). */
function relayUsageRows(relay) {
  if (!relay) return [];
  const lim = relay.limits || {}, today = relay.today || {};
  const mb = (n) => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' GB' : Math.max(0, Math.round(n / 1e5) / 10) + ' MB');
  const num = (n) => Number(n || 0).toLocaleString();
  const free = Number(lim.storageBytes) || 5e9, cap = Number(relay.max) || 0;
  const store = cap > 0 && cap < free ? cap : free;
  return [
    { label: 'Messages and checks', used: today.requests || 0, max: lim.workerRequests || 100000, text: `${num(today.requests)} of ${num(lim.workerRequests || 100000)}` },
    { label: 'Changes saved', used: today.writes || 0, max: lim.rowsWritten || 100000, text: `${num(today.writes)} of ${num(lim.rowsWritten || 100000)}` },
    // the relay's own cap (relay.max, below the free 5 GB) when it is the smaller
    { label: 'Storage', used: relay.used || 0, max: store, text: `${mb(relay.used || 0)} of ${mb(store)}` },
  ];
}
function _rlHost(origin) { return String(origin || '').replace(/^https?:\/\//, ''); }
/* The relay shown here is THE relay: the home relay in friends/relays.json (GET /api/relay
   reads it; the Friends tab and Settings > Sync read the same file). */
function _rlRender() { if (state.view === 'settings:relay' && typeof renderMain === 'function') renderMain(); }
function _rlLoad() {
  return fetch('/api/relay', { cache: 'no-store' }).then(r => r.json()).then((j) => {
    _rlSt = j && 'relay' in j ? j : { error: true };
    const running = _rlSt.connect && _rlSt.connect.state === 'running';
    // Connect Cloudflare just finished: a small celebration, then the next steps (invite, sync).
    if (_rlWasRunning && !running && _rlSt.connect && _rlSt.connect.state === 'done') _rlConnectedToast(_rlSt);
    _rlWasRunning = !!running;
    clearTimeout(_rlPoll);
    // While it runs: every 1.5 s on this page, every 5 s elsewhere (so the end is still celebrated).
    if (running) _rlPoll = setTimeout(function tick() { if (state.view === 'settings:relay' || !document.hidden) _rlLoad(); else _rlPoll = setTimeout(tick, 5000); }, state.view === 'settings:relay' ? 1500 : 5000);
    else if (_rlSt.relay && !_rlSt.relay.pending && (Date.now() - _rlAdminAt > 20000 || !_rlAdmin)) _rlLoadAdmin();
    // The relay is on its way from the other computer: look again in a few seconds while this page is open.
    else if (_rlSt.relay && _rlSt.relay.pending && state.view === 'settings:relay') _rlPoll = setTimeout(_rlLoad, 5000);
  }).catch(() => { _rlSt = { error: true }; }).finally(_rlRender);
}
function _rlLoadAdmin() {
  _rlAdminAt = Date.now();
  return fetch('/api/relay/admin', { cache: 'no-store' }).then(r => r.json()).then((j) => { _rlAdmin = j; }).catch(() => { _rlAdmin = { error: { message: 'The OpenDash server is not running.' } }; }).finally(_rlRender);
}
async function _rlPost(path, body, okMsg) {
  if (_rlBusy) return null;
  _rlBusy = true;
  try {
    const r = await fetch(path.charAt(0) === '/' ? path : '/api/relay/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
    if (okMsg) toast(okMsg, { kind: 'ok' });
    return j;
  } catch (e) {
    toastError('do that', e, () => _rlPost(path, body, okMsg));
    return null;
  } finally { _rlBusy = false; }
}
function _rlBtn(label, kind, run, ic) {
  return uiButton({ label, icon: ic, kind: kind || 'secondary', size: 'sm', disabled: _rlBusy, run });
}
/** One of your computers on the relay by its sync name (L8), else "Another computer of yours". */
function _rlDeviceName(d) {
  const id = String((d && d.device) || '');
  const devs = (typeof _syncSt !== 'undefined' && _syncSt && _syncSt.devices) || [];
  const hit = id && devs.find(x => x.id === id || (id.length >= 6 && String(x.id || '').startsWith(id)));
  return hit ? (hit.me ? hit.name + ' (this computer)' : hit.name) : 'Another computer of yours';
}
function _rlP(text, cls) { return Object.assign(document.createElement('p'), { className: cls || 'set-h', textContent: text }); }

/* ---------- friends and profile hooks (96-friends-0core.js, 97-profile-1core.js) ---------- */
/** The friend whose identity key a relay member has ('me' for your own key), or null. */
function _rlFriendFor(key) {
  if (typeof Friends === 'undefined' || !Friends) return null;
  const me = typeof Friends.me === 'function' ? Friends.me() : null;
  if (me && me.ed && me.ed === key) return 'me';
  return (typeof Friends.list === 'function' ? Friends.list() : []).find(f => f && f.ed === key) || null;
}
/** Friends' data is loaded once for the names and avatars here (a peek: it makes no identity). */
function _rlFriendsWanted() {
  if (_rlFrAsked || typeof Friends === 'undefined' || !Friends || typeof Friends.load !== 'function') return;
  if (typeof Friends.me === 'function' && Friends.me()) return;
  _rlFrAsked = true;
  Friends.load(false).then(_rlRender).catch(() => {});
}
/** A member's avatar: agent 'profile' draws it (a friend's own avatar, or initials); else a plain icon. Never a picture from a URL. */
function _rlAvatarEl(who) {
  if (who && typeof profileAvatarEl === 'function') {
    try { const el = profileAvatarEl(who === 'me' ? null : who, { size: 24 }); if (el && el.nodeType === 1) { el.classList.add('relay-av'); return el; } } catch (e) { console.error('[relay] avatar', e); }
  }
  const s = document.createElement('span'); s.className = 'relay-av relay-av-ic'; s.innerHTML = icon(who === 'me' ? 'circle-user' : 'user');
  return s;
}

/* ---------- device sync through the relay (Settings > Sync, 58-settings-sync.js) ---------- */
/* Offered while sync does not go through it yet: sync is off for the relay, or it is a friend's relay not chosen for sync. */
function _rlSyncOffer(st) { const s = st && st.sync; return !!(st && st.relay && s && s.usable && (!s.on || !s.chosen)); }
/** "Sync all your devices through it": the one click of Settings > Sync's "Use my relay too" (for every computer of yours), or its setup when sync is off. */
async function relaySyncToo() {
  const s = (_rlSt && _rlSt.sync) || {};
  // A friend's relay joined from Friends carries device sync only once chosen here (it never takes it over by itself).
  if (!s.chosen && !(await _rlPost('sync', {}))) return;
  if (!s.enabled) { _rlLoad(); setView('settings:sync'); return; }
  const j = await _rlPost('/api/sync/settings', { relay: true }, 'Your computers sync through your relay now');
  if (j) _rlLoad();
}
/** "Invite a friend" after connecting: the Friends invite dialog, once Friends has read the new relay. */
function relayInviteFriend() {
  if (typeof friendsAddDialog !== 'function' || typeof Friends === 'undefined' || !Friends) { setView('friends'); return; }
  Friends.load(true).catch(() => null).then(() => friendsAddDialog('invite'));
}
/** Connect Cloudflare just finished: a small celebration for a new relay, a quiet line for an update in place. */
function _rlConnectedToast(st) {
  const res = (st.connect && st.connect.result) || {};
  if (res.updated) { toast('Your relay is up to date', { kind: 'ok', icon: 'cloud' }); return; }
  if (typeof gameMoment === 'function' && typeof gameOn === 'function' && gameOn()) {
    gameMoment({ over: 'Your relay', title: 'Your relay is ready', sub: 'Next: invite a friend, and sync your computers through it', icon: 'party-popper', action: { label: 'Invite a friend', run: relayInviteFriend } });
  } else {
    toast('Your relay is ready', { kind: 'ok', icon: 'party-popper', action: { label: 'Invite a friend', run: relayInviteFriend } });
  }
  // a burst on the "You're connected" card once it is drawn
  setTimeout(() => { const card = document.querySelector('.relay-next'); if (card && typeof animBurst === 'function') { try { animBurst(card, 'celebration'); } catch (e) { /* no animations */ } } }, 120);
}

/** Connect Cloudflare (again: the same relay is updated in place). extra: {fresh, checkOnly, relogin, adopt, accountId}. */
async function relayConnect(extra) {
  const acct = String((extra && extra.accountId) || _rlAccount || '').trim().toLowerCase();
  const body = Object.assign({}, /^[a-f0-9]{32}$/.test(acct) ? { accountId: acct } : {});
  for (const k of ['fresh', 'checkOnly', 'relogin', 'adopt']) if (extra && extra[k] === true) body[k] = true;
  const j = await _rlPost('connect', body);
  if (j) { _rlSt = j; _rlWasRunning = !!(j.connect && j.connect.state === 'running'); _rlRender(); _rlLoad(); }
}
/** Open Settings > Your relay (the Friends tab and its welcome call this); {start: true} also starts Connect Cloudflare. */
function relaySettingsOpen(o) {
  setView('settings:relay');
  if (!o || !o.start) return;
  // read it fresh first: never start a deploy from a stale view
  _rlLoad().then(() => { if (_rlSt && !_rlSt.error && !_rlSt.relay && !(_rlSt.connect && _rlSt.connect.state === 'running')) relayConnect(); });
}
window.relaySettingsOpen = relaySettingsOpen;
/** Disconnect at once, with Undo (no confirm): every device stops using it; the Worker stays on Cloudflare. */
async function relayDisconnect() {
  const mine = _rlSt && _rlSt.mine;
  const j = await _rlPost('disconnect', {});
  if (!j) return;
  _rlAdmin = null; _rlLoad();
  toast(mine ? 'Stopped using your relay' : 'You no longer use your friend\'s relay.', {
    kind: 'ok', timeout: 60000,
    action: j.undo ? { label: 'Undo', run: async () => { if (await _rlPost('reconnect', {}, 'Relay connected again')) { _rlAdmin = null; _rlLoad(); } } } : null,
  });
}
async function relayRevoke(m, label) {
  const j = await _rlPost('members/revoke', { iid: m.iid });
  if (!j) return;
  _rlLoadAdmin();
  toast(`${label} can no longer use your relay`, { kind: 'ok', action: { label: 'Undo', run: async () => { if (await _rlPost('members/restore', { iid: m.iid }, 'Restored')) _rlLoadAdmin(); } } });
}

/* Links the page may open from the connect job: only these (the server checks them too). Opened in a new tab. */
const _RL_LINK_OK = /^https:\/\/(dash\.cloudflare\.com\/|nodejs\.org\/)[A-Za-z0-9/?&=%:._~+-]*$/;
function _rlLink(href, text) {
  if (!_RL_LINK_OK.test(String(href || ''))) return null;
  const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'relay-link';
  a.innerHTML = icon('external-link', 'i-sm'); a.appendChild(document.createTextNode(' ' + text));
  return a;
}
/** How long the job has run, as m:ss (the running step shows it, so a long wait visibly moves). */
function _rlElapsed(at) { const s = Math.max(0, Math.round((Date.now() - Number(at || Date.now())) / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function _rlConnectBox(el, st) {
  const c = st.connect;
  clearInterval(_rlTick); _rlTick = null;
  if (!c || c.state === 'done') return;
  const box = document.createElement('div'); box.className = 'relay-steps'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  for (const s of c.steps || []) {
    const row = document.createElement('div'); row.className = 'relay-step relay-step-' + s.state;
    row.innerHTML = icon(relayStepIcon(s.state));
    row.appendChild(Object.assign(document.createElement('span'), { textContent: s.label }));
    if (s.state === 'doing' && c.state === 'running') {
      const t = Object.assign(document.createElement('span'), { className: 'relay-step-t num', textContent: _rlElapsed(c.at) });
      row.appendChild(t);
      _rlTick = setInterval(() => { if (!t.isConnected) { clearInterval(_rlTick); _rlTick = null; return; } t.textContent = _rlElapsed(c.at); }, 1000);
    }
    box.appendChild(row);
    if (s.state === 'doing' && c.state === 'running' && c.note) {
      const n = _rlP(c.note, 'relay-note'); box.appendChild(n);
      if (s.id === 'login') {
        const a = c.loginUrl ? _rlLink(c.loginUrl, 'No page opened? Open the Cloudflare sign-in page') : null;
        if (a) box.appendChild(a);
        box.appendChild(_rlP('Signing in happens on Cloudflare\'s own page: OpenDash never sees your password or sign-in.', 'set-h'));
      }
    }
  }
  const acts = document.createElement('div'); acts.className = 'btn-group relay-acts';
  if (c.state === 'running') {
    acts.appendChild(_rlBtn('Cancel', 'ghost', async () => { const j = await _rlPost('cancel', {}); if (j) { _rlSt = j; _rlWasRunning = false; _rlRender(); } }, 'x'));
  }
  if (c.state === 'cancelled') {
    box.appendChild(_rlP('Stopped. Nothing changed.'));
    acts.appendChild(_rlBtn('Try again', 'primary', () => relayConnect(), 'refresh-cw'));
  }
  if (c.state === 'error' && c.error) {
    const er = c.error;
    const e = document.createElement('div'); e.className = 'relay-error';
    e.appendChild(_rlP(er.message, 'relay-error-t'));
    e.appendChild(_rlP(er.next));
    const a = er.link ? _rlLink(er.link, er.linkLabel || 'Open the Cloudflare dashboard') : null;
    if (a) e.appendChild(a);
    // Several Cloudflare accounts: pick one (names from your own sign-in, shown as text).
    if (Array.isArray(er.accounts) && er.accounts.length) {
      const list = document.createElement('div'); list.className = 'relay-accounts'; list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Cloudflare accounts');
      for (const ac of er.accounts.slice(0, 20)) {
        if (!ac || !/^[a-f0-9]{32}$/.test(String(ac.id || ''))) continue;
        const b = _rlBtn('', 'secondary', () => { _rlAccount = ac.id; relayConnect({ accountId: ac.id }); }, 'cloud');
        b.classList.add('relay-account');
        b.querySelector('span').remove();
        b.append(Object.assign(document.createElement('span'), { className: 'relay-account-n', textContent: String(ac.name || 'Cloudflare account') }),
          Object.assign(document.createElement('span'), { className: 'relay-account-id num', textContent: String(ac.id).slice(0, 8) + '…' }));
        list.appendChild(b);
      }
      e.appendChild(list);
    }
    if (er.field === 'accountId') {
      const inp = document.createElement('input'); inp.className = 'control control-sm'; inp.placeholder = 'Or paste an Account ID (32 letters and digits)'; inp.value = _rlAccount;
      inp.setAttribute('aria-label', 'Cloudflare Account ID'); inp.spellcheck = false; inp.autocomplete = 'off'; inp.maxLength = 40;
      inp.oninput = () => { _rlAccount = inp.value; };
      inp.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); relayConnect(); } };
      e.appendChild(inp);
    }
    box.appendChild(e);
    if (er.check) acts.appendChild(_rlBtn('Check again', 'primary', () => relayConnect({ checkOnly: true }), 'refresh-cw'));
    acts.appendChild(_rlBtn('Try again', er.check ? 'secondary' : 'primary', () => relayConnect(), 'refresh-cw'));
    if (er.relogin) acts.appendChild(_rlBtn('Sign in with another account', 'secondary', () => relayConnect({ relogin: true }), 'log-in'));
    if (er.adopt) acts.appendChild(_rlBtn('Use the new relay instead', 'ghost', () => relayConnect({ checkOnly: true, adopt: true }), 'arrow-right'));
    if (er.fresh) acts.appendChild(_rlBtn('Use a new address', 'ghost', () => relayConnect({ fresh: true }), 'sparkles'));
  }
  if (acts.childNodes.length) box.appendChild(acts);
  el.appendChild(box);
}
/** After connecting: "You're connected" and the two next steps (closed for good per connect, in this browser). */
function _rlNextCard(el, st) {
  const c = st.connect;
  if (!c || c.state !== 'done' || !c.result || c.result.updated || !st.relay || !st.mine) return false;
  try { if (localStorage.getItem(_RL_NEXT_KEY) === String(c.at)) return false; } catch (e) { /* private mode */ }
  const card = document.createElement('section'); card.className = 'card relay-next'; card.setAttribute('role', 'status');
  const h = document.createElement('div'); h.className = 'relay-next-h';
  h.innerHTML = `<span class="relay-next-ic">${icon('party-popper')}</span>`;
  const t = document.createElement('div');
  t.append(Object.assign(document.createElement('b'), { textContent: 'Your relay is ready' }), _rlP('Next:', 'set-h'));
  const x = document.createElement('button'); x.type = 'button'; x.className = 'btn-icon relay-next-x'; x.setAttribute('aria-label', 'Close'); x.innerHTML = icon('x');
  x.onclick = () => { try { localStorage.setItem(_RL_NEXT_KEY, String(c.at)); } catch (e) { /* private mode */ } card.remove(); };
  h.append(t, x);
  const steps = document.createElement('div'); steps.className = 'relay-next-steps';
  const one = (ic, title, text, btn) => {
    const s = document.createElement('div'); s.className = 'relay-next-step';
    s.innerHTML = `<span class="relay-next-n">${icon(ic)}</span>`;
    const tt = document.createElement('div');
    tt.append(Object.assign(document.createElement('b'), { textContent: title }), _rlP(text, 'set-h'));
    s.append(tt, btn);
    return s;
  };
  steps.appendChild(one('user-plus', 'Invite a friend', 'They get a link; you both check the same pictures.', _rlBtn('Invite a friend', 'primary', relayInviteFriend, 'user-plus')));
  const sy = st.sync || {};
  steps.appendChild(sy.on
    ? one('circle-check', 'Your computers sync through it', 'Changes arrive within a second, anywhere.', _rlBtn('Open Sync', 'secondary', () => setView('settings:sync'), 'refresh-cw'))
    : one('refresh-cw', 'Sync your computers through it', sy.enabled ? 'Changes arrive within a second, anywhere.' : 'Set up sync first.',
      _rlBtn(sy.enabled ? 'Use it for sync' : 'Set up sync', 'secondary', relaySyncToo, 'refresh-cw')));
  card.append(h, steps);
  el.appendChild(card);
  return true;
}

function _rlMainCard(el, st) {
  const nextShown = _rlNextCard(el, st);
  const c = _settingsCard('Your relay', '');
  el.appendChild(c.card);
  const running = st.connect && st.connect.state === 'running';
  // 2.17.1: set up on another computer of the person (its record arrived through sync, or is on its way): never a second relay.
  const pend = !!(st.relay && st.relay.pending);
  // The status line first (docs/dev/SIMPLIFY_PLAN.md 5.3): a dot, one word, one detail.
  const nComp = ((typeof _syncSt !== 'undefined' && _syncSt && _syncSt.devices) || []).filter(d => d.kind !== 'phone').length;
  const cloud = typeof _syncSt !== 'undefined' && typeof syncCloudName === 'function' ? syncCloudName(_syncSt) : null;
  const S = running ? ['busy', 'Setting up', '']
    : pend ? ['busy', 'Setting up', 'Its details are on their way from your other computer' + (st.relay.by ? ' (' + st.relay.by + ')' : '')]
      : st.relay ? ['ok', 'On', st.mine ? 'On your Cloudflare account, used by ' + (nComp > 1 ? 'your ' + nComp + ' computers' : 'this computer') : "A friend's relay"]
        : ['off', 'Not set up', "Friends can't reach you, and sync uses Wi-Fi and " + (cloud || 'your cloud folder') + ' only'];
  c.body.appendChild(setStatusLine(S[0], S[1], S[2]));
  if (pend) {
    c.body.appendChild(_settingsRow('Check again', 'Keep OpenDash open on your other computer for a moment.', _rlBtn('Check again', 'secondary', async () => { if (await _rlPost('/api/sync/relay/check', {})) _rlLoad(); }, 'refresh-cw')));
    return;
  }
  if (!running && !nextShown && _rlSyncOffer(st)) {
    const sy = st.sync || {};
    c.body.appendChild(_settingsRow('Sync your computers through it', sy.enabled
      ? 'Faster than ' + (cloud || 'a cloud folder') + ', and works anywhere. Each of your computers switches as soon as it has the key.'
      : 'Sync is off on this computer: set it up first.', _rlBtn(sy.enabled ? 'Use it for sync' : 'Set up sync', 'primary', relaySyncToo, 'refresh-cw')));
  }
  // Not set up: the one main button. Set up: updating and stopping are rare (Advanced).
  if (!running && !st.relay) {
    c.body.appendChild(_settingsRow('Set up my relay', 'Free, about 2 minutes. You sign in to Cloudflare; OpenDash never sees your password.', _rlBtn('Set up my relay', 'primary', () => relayConnect(), 'cloud')));
  }
  _rlConnectBox(c.body, st);
  // More: how friends work, a friend's relay.
  setFold(c, 'relay-card-more', 'More', (more) => {
  more = more.body;
  if (typeof friendsHelpOpen === 'function') more.appendChild(_settingsRow('How friends work', '', _rlBtn('How friends work', 'ghost', () => friendsHelpOpen(), 'circle-help')));
  if (!running) {
    const wrap = document.createElement('div'); wrap.className = 'relay-invite';
    const inp = document.createElement('input'); inp.className = 'control control-sm'; inp.placeholder = 'Paste the invite link from your friend'; inp.value = _rlInvite;
    inp.setAttribute('aria-label', 'Invite link'); inp.spellcheck = false; inp.autocomplete = 'off';
    inp.oninput = () => { _rlInvite = inp.value; };
    wrap.append(inp, _rlBtn('Use this relay', 'secondary', async () => {
      if (!_rlInvite.trim()) { inp.focus(); return; }
      const j = await _rlPost('use-invite', { invite: _rlInvite.trim() }, 'You are using your friend\'s relay');
      if (j) { _rlInvite = ''; _rlAdmin = null; _rlLoad(); }
    }, 'users'));
    more.appendChild(_settingsRow('Use a friend\'s relay', 'Paste the invite link they sent you. To add them as a friend too, paste it in Friends.', wrap));
  }
  });
  // Advanced: update it, stop using it.
  if (!running && st.relay) setFold(c, 'relay-card-adv', 'Advanced', (adv) => {
    adv = adv.body;
    if (st.mine) adv.appendChild(_settingsRow('Update my relay', st.fromOther ? 'Set up on your other computer. This puts the newest relay on Cloudflare from this one; same address, everyone keeps access.' : 'Puts the newest relay on Cloudflare. Same address; everyone keeps access.', _rlBtn('Update my relay', 'secondary', () => relayConnect(), 'cloud')));
    adv.appendChild(_settingsRow('Stop using this relay', st.mine ? 'Your computers stop using it (Undo for a minute). It stays in your Cloudflare account until you delete it there.' : 'Your computers stop using your friend\'s relay (Undo for a minute). Your friendships stay.', _rlBtn('Stop using this relay', 'ghost', relayDisconnect, 'link-2-off')));
  }, { advanced: true });
}

/* ---------- removals that wait a moment (Undo instead of a confirm) ---------- */
const _rlPending = new Map();   // key -> timer: a device removal or an invite cancel waiting for its Undo
/** Do the POST from `req()` ([path, body]) in 6 s unless Undo is pressed; the row shows it as going meanwhile. */
function _rlLater(key, text, req, done) {
  if (_rlPending.has(key)) return;
  const fire = async () => {
    if (_rlBusy) { _rlPending.set(key, setTimeout(fire, 400)); return; }   // another change is on its way: right after it
    _rlPending.delete(key);
    const [path, body] = req();
    await _rlPost(path, body, done);
    _rlLoadAdmin();
  };
  const t = setTimeout(fire, 6000);
  _rlPending.set(key, t);
  _rlRender();
  toast(text, { timeout: 6000, icon: 'hourglass', action: { label: 'Undo', run: () => { clearTimeout(_rlPending.get(key)); _rlPending.delete(key); _rlRender(); } } });
}
const _rlWhen = (t) => (t ? new Date(Number(t)).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');
/** "in 3 days" / "today" / "tomorrow" for an expiry. */
function _rlIn(t) {
  if (!t) return 'by itself';
  if (Number(t) <= Date.now()) return 'now';
  const d = Math.round((Number(t) - Date.now()) / 86400000);
  return d <= 0 ? 'today' : d === 1 ? 'tomorrow' : `in ${d} days`;
}
function _rlMb(n) { const v = Number(n) || 0; return v >= 1e9 ? (v / 1e9).toFixed(2) + ' GB' : v >= 1e6 ? (Math.round(v / 1e5) / 10) + ' MB' : Math.max(0, Math.round(v / 1e3)) + ' KB'; }
/** A small usage bar (used of max), its text beside it. */
function _rlMiniBar(used, max, text) {
  const w = document.createElement('div'); w.className = 'relay-bar';
  const pct = Math.max(0, Math.min(100, Number(max) ? (Number(used) / Number(max)) * 100 : 0));
  const tr = document.createElement('div'); tr.className = 'relay-bar-track';
  tr.setAttribute('role', 'meter'); tr.setAttribute('aria-valuemin', '0'); tr.setAttribute('aria-valuemax', '100'); tr.setAttribute('aria-valuenow', pct.toFixed(0)); tr.setAttribute('aria-label', text);
  const f = document.createElement('div'); f.className = 'relay-bar-fill' + (pct > 95 ? ' relay-bar-full' : pct > 80 ? ' relay-bar-hot' : ''); f.style.width = pct.toFixed(1) + '%';
  tr.appendChild(f);
  w.append(tr, Object.assign(document.createElement('div'), { className: 'set-h', textContent: text }));
  return w;
}
function _rlChip(text, ic) {
  const s = document.createElement('span'); s.className = 'relay-chip';
  if (ic) s.innerHTML = icon(ic, 'i-sm');
  s.appendChild(document.createTextNode(text));
  return s;
}

function _rlPeopleCard(el, a) {
  const c = _settingsCard('Who can use it', 'Your devices and the people you invited; everyone else is refused.');
  el.appendChild(c.card);
  // your devices
  const devs = (a.ownerDevices || []).filter(d => d && !d.revoked);
  if (devs.length) {
    const list = document.createElement('div'); list.className = 'relay-list';
    for (const d of devs) {
      const going = _rlPending.has('dev:' + d.cert);
      const row = document.createElement('div'); row.className = 'relay-row' + (going ? ' relay-row-gone' : '');
      const info = document.createElement('div'); info.className = 'relay-info';
      const nm = document.createElement('div'); nm.className = 'relay-name';
      nm.innerHTML = icon('laptop');
      nm.appendChild(document.createTextNode(' ' + _rlDeviceName(d)));
      info.append(nm, _rlP(going ? 'Removing in a moment…' : 'seen ' + (_rlWhen(d.seen) || 'not yet')));
      row.appendChild(info);
      if (!going && /^[A-Za-z0-9_-]{22}$/.test(String(d.cert || ''))) {
        row.appendChild(_rlBtn('Remove', 'ghost', () => _rlLater('dev:' + d.cert,
          'Removing it from your relay. Also remove it in Settings > Sync.',
          () => ['devices/revoke', { cert: d.cert }], 'Device removed from your relay'), 'x'));
      }
      list.appendChild(row);
    }
    c.body.appendChild(_settingsRow('Your computers', '', list));
  }
  // the people you invited
  const members = (a.members || []).filter(m => m && /^[A-Za-z0-9_-]{22}$/.test(String(m.iid || '')));
  if (members.length) _rlFriendsWanted();
  const ml = document.createElement('div'); ml.className = 'relay-list';
  for (const m of members) {
    // The relay's answer is untrusted: the name comes from your own friends list only (friendsNameForRelayKey), set as text.
    const known = typeof friendsNameForRelayKey === 'function' ? friendsNameForRelayKey(String(m.key || '')) : null;
    const name = String(known || 'Someone you invited (' + String(m.iid).slice(0, 6) + ')');
    const scopes = Array.isArray(m.scopes) ? m.scopes.filter(x => x === 'message' || x === 'sync') : [];
    const revoked = !!m.revoked;
    const row = document.createElement('div'); row.className = 'relay-row relay-member' + (revoked ? ' relay-row-gone' : '');
    const info = document.createElement('div'); info.className = 'relay-info';
    const nm = document.createElement('div'); nm.className = 'relay-name';
    nm.append(_rlAvatarEl(_rlFriendFor(m.key)), document.createTextNode(' ' + name));
    info.appendChild(nm);
    if (revoked) {
      const until = Number(m.revoked) > 1e12 ? Number(m.revoked) + 7 * 86400000 : 0;
      info.appendChild(_rlP(`Removed. You can undo this${until ? ' until ' + _rlWhen(until) : ' for 7 days'}; after that their data on your relay is deleted.`));
    } else {
      const chips = document.createElement('div'); chips.className = 'relay-chips';
      chips.appendChild(_rlChip('Can message you', 'message-square'));
      if (scopes.includes('sync')) chips.appendChild(_rlChip('Syncs their computers', 'refresh-cw'));
      const nd = Array.isArray(m.devices) ? m.devices.filter(x => x && !x.revoked).length : 0;
      if (nd) chips.appendChild(_rlChip(nd + (nd === 1 ? ' computer' : ' computers'), 'laptop'));
      if (m.since) chips.appendChild(_rlChip('Since ' + _rlWhen(m.since), 'clock'));
      info.appendChild(chips);
      if (Number(m.quota) > 0) info.appendChild(_rlMiniBar(m.used, m.quota, `${_rlMb(m.used)} of their ${_rlMb(m.quota)}`));
    }
    row.appendChild(info);
    const acts = document.createElement('div'); acts.className = 'btn-group relay-member-acts';
    if (revoked) acts.appendChild(_rlBtn('Undo', 'secondary', async () => { if (await _rlPost('members/restore', { iid: m.iid }, `${name} can use your relay again`)) _rlLoadAdmin(); }, 'undo-2'));
    else {
      const lab = document.createElement('span'); lab.className = 'relay-sw';
      lab.append(_settingsSwitch(scopes.includes('sync'), 'Can sync their computers too', async (on) => {
        if (await _rlPost('members/scopes', { iid: m.iid, scopes: on ? ['message', 'sync'] : ['message'] }, on ? 'They can sync their devices through your relay' : 'They can only message you now')) _rlLoadAdmin();
      }, _rlBusy), Object.assign(document.createElement('span'), { className: 'set-h', textContent: 'Can sync their computers too' }));
      acts.append(lab, _rlBtn('Remove access', 'ghost', () => relayRevoke(m, name), 'user-minus'));
    }
    row.appendChild(acts);
    ml.appendChild(row);
  }
  if (!members.length) {
    const e = document.createElement('div'); e.className = 'relay-empty';
    e.append(_rlP('Nobody else yet.', 'set-h'),
      _rlBtn('Invite a friend', 'secondary', relayInviteFriend, 'user-plus'));
    ml.appendChild(e);
  }
  c.body.appendChild(_settingsRow('Friends', members.length ? 'Remove access works at once, with Undo for 7 days.' : '', ml));
  // invites not used yet
  const inv = (a.invites || []).filter(i => i && /^[A-Za-z0-9_-]{11}$/.test(String(i.id || '')));
  if (inv.length) {
    const il = document.createElement('div'); il.className = 'relay-list';
    for (const i of inv) {
      const going = _rlPending.has('inv:' + i.id);
      const sc = Array.isArray(i.scopes) ? i.scopes : [];
      const row = document.createElement('div'); row.className = 'relay-row' + (going ? ' relay-row-gone' : '');
      const info = document.createElement('div'); info.className = 'relay-info';
      const nm = document.createElement('div'); nm.className = 'relay-name';
      nm.innerHTML = icon('mail');
      nm.appendChild(document.createTextNode(' Invite' + (i.at ? ' made ' + _rlWhen(i.at) : '') + (sc.includes('sync') ? ': message and sync' : ': message')));
      info.append(nm, _rlP(going ? 'Cancelling in a moment…' : `Not used yet · ends ${_rlIn(i.exp)}${i.exp ? ' (' + _rlWhen(i.exp) + ')' : ''}`));
      row.appendChild(info);
      if (!going) {
        row.appendChild(_rlBtn('Cancel invite', 'ghost', () => _rlLater('inv:' + i.id,
          'Cancelling this invite: it will no longer give access to your relay.',
          () => ['invites/cancel', { id: i.id }], 'Invite cancelled'), 'x'));
      }
      il.appendChild(row);
    }
    c.body.appendChild(_settingsRow('Invites not used yet', 'Each works once and ends by itself. Make new ones in Friends > Add a friend.', il));
  }
}

/** The relay's own usage against Cloudflare's free allowance (relayUsageRows, pure). */
function _rlUsageCard(el, a) {
  // Folded (2.17.1): open it to see today's use.
  const det = document.createElement('details'); det.className = 'set-more relay-fold relay-usage-fold';
  det.open = !!_rlUsageOpen; det.ontoggle = () => { _rlUsageOpen = det.open; };
  const rows = relayUsageRows(a.relay);
  const hot = rows.some(u => u.max > 0 && u.used / u.max > 0.8);
  det.appendChild(Object.assign(document.createElement('summary'), { textContent: hot ? Math.round(100 * Math.max(...rows.map(u => (u.max > 0 ? u.used / u.max : 0)))) + '% of today\'s free allowance used' : 'Today\'s free allowance' }));
  if (hot) det.open = true;
  el.appendChild(det);
  const c = _settingsCard('Today\'s free allowance', 'If it runs out, your relay rests until tomorrow. Nothing is lost, and nothing is ever paid.');
  det.appendChild(c.card);
  for (const u of rows) c.body.appendChild(_settingsRow(u.label, '', _rlMiniBar(u.used, u.max, u.text)));
  c.body.appendChild(_rlP('Approximate.'));
}

registerSettingsGroup({
  id: 'relay', title: 'Your relay', icon: 'cloud', order: 91.5,
  description: 'Your private relay: sync and friends anywhere, within a second.',
  search: [
    { label: 'Set up my relay', target: 'Your relay', description: 'Your own private relay for friends and sync, free on Cloudflare', keywords: 'relay cloudflare connect deploy wrangler friends sync update deploy again' },
    { label: 'Who can use your relay', target: 'Who can use it', description: 'Your computers, the friends you invited, invites not used yet', keywords: 'relay members revoke invite devices' },
    { label: 'Today\'s free allowance', target: 'Today\'s free allowance', description: "Today's use of Cloudflare's free allowance", keywords: 'relay usage limit quota free storage requests' },
    { label: 'Stop using this relay', target: 'Stop using this relay', description: 'Your computers stop using it (Undo for a minute)', keywords: 'relay disconnect remove stop' },
  ],
  render(el) {
    if (!_rlSt) { _rlLoad(); el.appendChild(_rlP('Loading…')); return; }
    if (_rlSt.error) {
      el.appendChild(_rlP("OpenDash isn't answering."));
      el.appendChild(_rlBtn('Try again', 'secondary', () => { _rlSt = null; _rlLoad(); }, 'refresh-cw'));
      return;
    }
    _rlMainCard(el, _rlSt);
    if (!_rlSt.relay || _rlSt.relay.pending) return;
    const a = _rlAdmin;
    if (!a) { el.appendChild(_rlP('Loading who can use it…')); return; }
    if (a.relay == null) return;
    if (a.error) {
      const c = _settingsCard('Who can use it'); el.appendChild(c.card);
      const note = document.createElement('div'); note.className = 'relay-calm' + (a.error.calm ? '' : ' relay-calm-err'); note.setAttribute('role', 'status');
      note.innerHTML = icon(a.error.calm ? 'moon' : 'circle-alert');
      note.appendChild(Object.assign(document.createElement('span'), { textContent: a.error.calm
        ? (a.error.message || 'Your relay cannot be reached right now.') + ' Nothing is lost: your devices try again by themselves.'
        : (a.error.message || 'The relay could not be reached.') }));
      c.body.append(note, _rlBtn('Try again', 'secondary', _rlLoadAdmin, 'refresh-cw'));
      return;
    }
    if (a.role !== 'owner') {
      const c = _settingsCard('Your access'); el.appendChild(c.card);
      c.body.appendChild(_rlP((a.scopes || []).includes('sync') ? 'You can message friends and sync your computers through it.' : 'You can message friends through this relay.'));
      if (Number(a.quota) > 0) c.body.appendChild(_settingsRow('Your storage on it', 'Set by its owner.', _rlMiniBar(a.used, a.quota, `${_rlMb(a.used)} of ${_rlMb(a.quota)}`)));
      return;
    }
    _rlPeopleCard(el, a);
    _rlUsageCard(el, a);
  },
});
