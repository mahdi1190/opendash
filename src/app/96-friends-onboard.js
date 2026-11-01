/* ============================================================
   FRIENDS: getting started (the first-run welcome) and "How friends work".
   Mounted on the hangout (#view=friends) through Friends.registerPanel
   ({where: 'hangout'}), moved to just under the header; it hides the plain
   "No relay yet" card while it shows (CSS :has, 96-friends-onboard.css).

     1. Make your character   opens the profile builder (Settings > Profile)
     2. Set up your connection to friends     Set up my connection (free, about 2 minutes:
                              relaySettingsOpen({start: true}), 58-settings-relay.js)
                              or Paste an invite (friendsAddDialog('paste'))
     3. Invite a friend       a single-use link, copied as it is or inside a
                              ready message (POST /api/friends/invite)

   It shows progress, can be closed (Undo), shows by itself only while you
   have no friends yet, and comes back from the palette: "Friends: getting
   started". "How friends work" (friendsHelpOpen) is a plain-language help
   panel that links to docs/FRIENDS_GUIDE.md.

   This browser only (localStorage 'dashboard-friends-onboard'): {closed,
   avatarOk, doneAt}. Nothing here reads or shows friend text: the panel is
   about you. Every string is set with textContent; markup is static or icon().
   2.18 (UI_CLEANUP_PLAN.md C6): the steps share one height (the tallest step's)
   and each step's buttons sit at its foot, so a step changing never moves the
   page below (96-friends-onboard.css); buttons are uiButton, copies copyText.
   ============================================================ */
const _FRO_KEY = 'dashboard-friends-onboard';
const FRIENDS_GUIDE_URL = 'https://github.com/mahdi1190/opendash/blob/main/docs/FRIENDS_GUIDE.md';
const _fro = { forcedAt: 0, scroll: false, invite: null, burst: false };
const _froForced = () => Date.now() - _fro.forcedAt < 15 * 60000;   // opened from the palette: shown for a while whatever the rules say

function _froPrefs() {
  try { const v = JSON.parse(localStorage.getItem(_FRO_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
}
function _froSave(patch) {
  const v = Object.assign(_froPrefs(), patch || {});
  try { localStorage.setItem(_FRO_KEY, JSON.stringify(v)); } catch (e) { /* private mode: this visit only */ }
  return v;
}
function _froRepaint() { if (typeof friendsPageRefresh === 'function') friendsPageRefresh(); }

/** Has the character been made? Its avatar differs from the starting one (or you said it is fine as it is). */
function _froAvatarDone(p) {
  if (p.avatarOk) return true;
  if (typeof profileGet !== 'function' || typeof profileAvatarDefault !== 'function') return true;   // no profile in this build: nothing to do
  try {
    const now = profileGet().avatar;
    const start = typeof profileAvatarNormalize === 'function' ? profileAvatarNormalize(profileAvatarDefault()) : profileAvatarDefault();
    return JSON.stringify(now) !== JSON.stringify(start);
  } catch (e) { return false; }
}
/** The three steps' state from the friends data: {avatar, relay, invite, n, all}. Pure apart from the profile. */
function friendsOnboardState(d, p) {
  d = d || {}; p = p || {};
  const c = d.counts || {};
  const relay = !!(d.relay && d.relay.home);
  const invites = (d.me && Array.isArray(d.me.invites)) ? d.me.invites.length : 0;
  const s = { avatar: _froAvatarDone(p), relay, invite: !!(c.friends || c.requested || c.incoming || invites || _fro.invite) };
  s.n = (s.avatar ? 1 : 0) + (s.relay ? 1 : 0) + (s.invite ? 1 : 0);
  s.all = s.n === 3;
  return s;
}
/** Shown by itself while you have no friends yet and have not closed it; always when opened from the palette. */
function _froVisible(d, p, s) {
  if (_froForced()) return true;
  if (p.closed) return false;
  if (d && d.counts && d.counts.friends) return false;
  if (s.all && p.doneAt && Date.now() - p.doneAt > 12 * 3600000) return false;
  return true;
}

/* ---------- the panel ---------- */
function _froEl(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
function _froDone(text) {
  const e = _froEl('div', 'fro-done');
  e.innerHTML = icon('circle-check', 'i-sm');
  e.appendChild(_froEl('span', null, text));
  return e;
}
function _froStep(n, done, active, title, sub) {
  const li = _froEl('li', 'fro-step' + (done ? ' is-done' : '') + (active ? ' is-active' : ''));
  const num = _froEl('span', 'fro-num');
  if (done) num.innerHTML = icon('check', 'i-sm'); else num.textContent = String(n);
  num.setAttribute('aria-hidden', 'true');
  const body = _froEl('div', 'fro-body');
  const h = _froEl('div', 'fro-t');
  h.appendChild(_froEl('b', null, title));
  if (done) h.appendChild(_froEl('span', 'sr-only', ' (done)'));
  body.appendChild(h);
  if (sub) body.appendChild(_froEl('p', 'fro-sub muted', sub));
  const acts = _froEl('div', 'fro-acts');
  body.appendChild(acts);
  li.append(num, body);
  return { li, body, acts };
}
function _froOpenBuilder() {
  if (typeof _pfShowSec === 'function') _pfShowSec('avatar'); else setView('profile');
  setTimeout(() => { const b = document.getElementById('pf-builder'); if (b) b.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 80);
}
function _froConnect() {
  if (typeof relaySettingsOpen === 'function') relaySettingsOpen({ start: true });
  else setView('settings:relay');
}
/** Setting up your connection to friends on this computer right now (Settings > Your connection to friends keeps it in _rlSt), or null. */
function _froConnectJob() {
  try { return typeof _rlSt !== 'undefined' && _rlSt && _rlSt.connect ? _rlSt.connect : null; } catch (e) { return null; }
}
function _froInviteMessage(inv) {
  const when = inv.exp ? new Date(Number(inv.exp)).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '';
  return 'Hi! I use Freeflo and would love to add you as a friend there (we can cheer each other on and do things together).\n\n'
    + 'In Freeflo, open Friends > Add a friend > Paste an invite, and paste this link:\n' + inv.link + '\n\n'
    + `It works once${when ? ' and ends on ' + when : ''}. We'll both see the same pictures to check before we're connected.\n\n`
    + "Don't have Freeflo yet? It's free: https://github.com/mahdi1190/opendash";
}
/** Step 3: make a single-use invite (with relay access when it is your own relay) and offer it two ways. */
function _froInviteBox(acts, d, again) {
  const out = _froEl('div', 'fro-invite');
  const paint = () => {
    out.textContent = '';
    const inv = _fro.invite;
    if (!inv) return;
    const inp = document.createElement('input');
    inp.className = 'input input-sm fro-link'; inp.readOnly = true; inp.value = inv.link; inp.setAttribute('aria-label', 'Your invite link');
    inp.onfocus = () => inp.select();
    const row = _froEl('div', 'fro-acts');
    row.append(
      uiButton({ label: 'Copy link', icon: 'copy', kind: 'primary', size: 'sm', run: () => copyText(inv.link, 'invite link') }),
      uiButton({ label: 'Copy a ready message', icon: 'mail', size: 'sm', run: () => copyText(_froInviteMessage(inv), 'message') }),
    );
    if (navigator.share) row.appendChild(uiButton({ label: 'Share', icon: 'send', size: 'sm', run: () => navigator.share({ title: 'Join me on Freeflo', text: _froInviteMessage(inv) }).catch(() => {}) }));
    row.appendChild(uiButton({ label: 'Cancel this invite', kind: 'ghost', size: 'sm', run: (e, b) => _frDo(b, async () => {
      await _frApi('/api/friends/invite/cancel', { id: inv.id });
      _fro.invite = null; paint();
      await friendsLoad(true).catch(() => {}); _froRepaint();
    }, 'Invite cancelled: the link no longer works', 'cancel the invite') }));
    const when = inv.exp ? new Date(Number(inv.exp)).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : '';
    out.append(inp, row, _froEl('p', 'fro-sub muted', `Send it to one person. It works once${when ? ', until ' + when : ''}, and you accept them after you both check the same pictures.`));
  };
  const relay = d.relay && d.relay.home;
  if (!_fro.invite) {
    acts.appendChild(uiButton({ label: again ? 'Make another invite' : 'Make an invite link', icon: 'link', kind: again ? 'secondary' : 'primary', run: (e, b) => _frDo(b, async () => {
      // Your own relay: they may use it for friends (not for their own sync: that is a choice in Add a friend).
      const r = await _frApi('/api/friends/invite', { ttlDays: 7, relayScopes: relay && relay.role === 'owner' ? ['message'] : null });
      const link = String(r.link || r.text || '');
      if (!link) throw new Error('The invite didn’t come back. Try again.');
      _fro.invite = { id: String(r.id || ''), link, exp: Number(r.exp) || 0 };
      paint();
      if (acts.isConnected) acts.querySelectorAll('.fro-make').forEach(x => x.remove());
      friendsLoad(true).then(_froRepaint).catch(() => {});
      return r;
    }, null, 'make the invite link') }));
    acts.lastChild.classList.add('fro-make');
    acts.appendChild(uiButton({ label: 'More ways to add', kind: 'ghost', size: 'sm', run: () => friendsAddDialog('invite') }));
  }
  paint();
  return out;
}
function _froRender(sec, d) {
  const p = _froPrefs();
  const s = friendsOnboardState(d, p);
  if (!_froVisible(d, p, s)) return false;
  if (s.all && !p.doneAt) _froSave({ doneAt: Date.now() });
  sec.textContent = '';
  sec.className = 'fr-sec card fro' + (s.all ? ' is-all' : '');
  sec.setAttribute('aria-label', 'Getting started with Friends');
  // header
  const head = _froEl('div', 'fro-h');
  const ic = _froEl('span', 'fro-ic');
  ic.innerHTML = icon(s.all ? 'party-popper' : 'sparkles', 'i-hero');
  const t = _froEl('div', 'fro-ht');
  t.appendChild(_froEl('span', 'overline', 'Getting started'));
  t.appendChild(_froEl('h2', null, s.all ? "You're all set" : 'Welcome to Friends'));
  t.appendChild(_froEl('p', 'muted', s.all
    ? 'Your character is ready, your connection to friends is ready, and your first invite is out. When they paste it, you will both see the same pictures: check they match, then accept.'
    : 'Three small steps to your first friend. Everything between friends is end-to-end encrypted, and you choose what each friend can see.'));
  const ha = _froEl('div', 'fro-hacts');
  ha.appendChild(uiButton({ label: 'How friends work', icon: 'circle-help', kind: 'ghost', size: 'sm', run: () => friendsHelpOpen() }));
  const x = uiButton({ icon: 'x', kind: 'ghost', size: 'sm', aria: s.all ? 'Close' : 'Close getting started', run: () => friendsOnboardClose() });
  ha.appendChild(x);
  head.append(ic, t, ha);
  sec.appendChild(head);
  // progress
  const prog = _froEl('div', 'fro-prog');
  const bar = _froEl('div', 'fro-bar');
  bar.setAttribute('role', 'progressbar'); bar.setAttribute('aria-valuemin', '0'); bar.setAttribute('aria-valuemax', '3'); bar.setAttribute('aria-valuenow', String(s.n));
  bar.setAttribute('aria-label', `${s.n} of 3 steps done`);
  const fill = _froEl('span', 'fro-fill'); fill.style.width = Math.round((s.n / 3) * 100) + '%';
  bar.appendChild(fill);
  prog.append(bar, _froEl('span', 'fro-n muted', `${s.n} of 3 done`));
  sec.appendChild(prog);
  // steps
  const ol = _froEl('ol', 'fro-steps');
  const active = !s.avatar ? 1 : !s.relay ? 2 : !s.invite ? 3 : 0;
  // 1. character
  const a = _froStep(1, s.avatar, active === 1, 'Make your character', s.avatar ? 'Friends see it next to your name.' : 'Pick a face, hair and an outfit: friends see it next to your name. It takes a minute.');
  if (typeof profileAvatarEl === 'function') {
    try { const av = profileAvatarEl(null, { size: 40 }); if (av && av.nodeType === 1) { av.classList.add('fro-av'); a.li.insertBefore(av, a.body.nextSibling); } } catch (e) { /* no avatar */ }
  }
  a.acts.appendChild(uiButton({ label: s.avatar ? 'Change it' : 'Open the builder', icon: 'wand-sparkles', kind: s.avatar ? 'ghost' : 'primary', size: (s.avatar) ? 'sm' : 'md', run: _froOpenBuilder }));
  if (!s.avatar) a.acts.appendChild(uiButton({ label: 'It looks fine as it is', kind: 'ghost', size: 'sm', run: () => { _froSave({ avatarOk: true }); _froRepaint(); } }));
  ol.appendChild(a.li);
  // 2. relay
  const job = _froConnectJob();
  const b = _froStep(2, s.relay, active === 2, 'Set up your connection to friends', s.relay
    ? (d.relay.home.role === 'owner' ? 'Your own.' : 'A friend’s.')
    : 'Your own private link that carries messages between you and your friends. Set up yours (free, about 2 minutes) or join a friend’s.');
  if (!s.relay) {
    if (job && job.state === 'running') {
      const w = _froEl('div', 'fro-wait');
      w.innerHTML = icon('loader-circle', 'i-sm fr-spin');
      w.appendChild(_froEl('span', null, 'Setting up your connection to friends…'));
      b.acts.append(w, uiButton({ label: 'Open', size: 'sm', run: () => setView('settings:relay') }));
    } else {
      if (job && job.state === 'error' && job.error) b.body.insertBefore(_froEl('p', 'fro-sub fro-err', `Setting up your connection to friends stopped: ${job.error.message}`), b.acts);
      b.acts.append(uiButton({ label: 'Set up my connection', icon: 'cloud', kind: active === 2 ? 'primary' : 'secondary', run: _froConnect }),
        uiButton({ label: 'Paste an invite', icon: 'clipboard', run: () => friendsAddDialog('paste') }));
    }
  } else b.acts.appendChild(uiButton({ label: 'Your connection to friends', kind: 'ghost', size: 'sm', run: () => setView('settings:relay') }));
  ol.appendChild(b.li);
  // 3. invite
  const c = _froStep(3, s.invite, active === 3, 'Invite a friend', !s.relay ? 'After step 2: invites travel through your connection to friends.'
    : _fro.invite ? 'Here is your link. Send it as it is, or copy a ready message that explains what to do.'
    : s.invite ? 'Your invite is out. When they paste it, you both check the same pictures, then you accept.'
    : 'Send one person a link, as it is or in a ready message.');
  if (s.relay) {
    const box = _froInviteBox(c.acts, d, s.invite);
    c.body.insertBefore(box, c.acts);   // the step's buttons stay at its foot
  } else c.li.classList.add('is-waiting');
  ol.appendChild(c.li);
  sec.appendChild(ol);
  if (s.all && !_fro.burst) {
    _fro.burst = true;
    setTimeout(() => { if (sec.isConnected && typeof _frBurst === 'function') _frBurst(ic); }, 250);
  }
  // Just under the hangout header (panels are added near the end of the page).
  Promise.resolve().then(() => {
    const root = sec.parentNode, hang = root && root.querySelector(':scope > .fr-hang');
    if (hang && hang.nextSibling !== sec) hang.after(sec);
    if (_fro.scroll && sec.isConnected) { _fro.scroll = false; sec.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  });
  return true;
}
/** Close the welcome, with Undo; it stays in the palette as "Friends: getting started". */
function friendsOnboardClose() {
  const was = _froPrefs().closed;
  _fro.forcedAt = 0;
  _froSave({ closed: true });
  _froRepaint();
  if (!was) toast('Getting started is closed. It stays under More and in the command palette.', { icon: 'sparkles', action: { label: 'Undo', run: () => { _froSave({ closed: false }); _froRepaint(); } } });
}
/** Open the welcome again (the palette): it shows even when every step is done. */
function friendsOnboardOpen() {
  _fro.forcedAt = Date.now(); _fro.scroll = true;
  _froSave({ closed: false });
  if (/^friends$/.test(String(state.view || ''))) _froRepaint(); else setView('friends');
}

if (typeof Friends !== 'undefined' && Friends && typeof Friends.registerPanel === 'function') {
  Friends.registerPanel({ id: 'onboard', order: 1, where: 'hangout', tab: 'friends', title: 'Getting started', icon: 'sparkles', render: _froRender });
}
// The character changed (Settings > Profile): step 1 may be done now.
document.addEventListener('opendash:profile', () => { if (/^friends$/.test(String(state.view || ''))) _froRepaint(); });

/* ---------- How friends work (plain language; the full guide: docs/FRIENDS_GUIDE.md) ---------- */
const _FRO_HELP = Object.freeze([
  ['eye', 'What friends can see', 'At first only your profile (name, character, bio) and your game progress (level, streaks). Tasks, calendar, money, places and your journal stay off until you turn them on for a friend you mark Trusted. On a friend\'s page, Preview shows exactly what would go to them.'],
  ['cloud', 'Your connection', "Friends' messages travel through a small private link: your own on your Cloudflare account (free), or a friend's that you join with their invite. It only ever holds encrypted messages it can't read. Only you, your computers and the people you invite can use yours."],
  ['user-plus', 'Adding someone', 'Send an invite link (it works once and ends by itself), or show your friend a 4-letter friend code (it works once, for 10 minutes). You both see the same pictures: check they match (in person, a call or a message) before you accept. A forwarded link alone is not enough.'],
  ['shield-check', 'Privacy', "Everything between friends is end-to-end encrypted. Your sign-ins, keys, email, Claude, connectors and accounts are never shared. Nothing a friend sends reaches Claude or changes your tasks unless you click."],
  ['user-minus', 'Removing someone', "Remove or Block them on their page (with Undo). Their access to your connection to friends ends, your copy of what they shared is deleted, and their app is asked to delete what you shared."],
  ['lock', "What can't be forced", "Deleting on their device is a request their app carries out: it cannot be forced, and nobody can stop a screenshot. So only share what you are happy for them to have seen."],
]);
function friendsHelpOpen() {
  openDialog({
    title: 'How friends work', size: 'md', resizeKey: 'friends-help',
    body(el, close) {
      el.classList.add('fro-help');
      const ul = _froEl('ul', 'fro-help-list');
      for (const [ic, title, text] of _FRO_HELP) {
        const li = _froEl('li');
        const i = _froEl('span', 'fro-help-ic'); i.innerHTML = icon(ic, 'i-lg');
        const t = _froEl('div');
        t.append(_froEl('b', null, title), _froEl('p', 'muted', text));
        li.append(i, t);
        ul.appendChild(li);
      }
      el.appendChild(ul);
      const a = document.createElement('a');
      a.href = FRIENDS_GUIDE_URL; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.className = 'fro-help-link';
      a.innerHTML = icon('book-open', 'i-sm');
      a.appendChild(document.createTextNode(' Read the full guide (docs/FRIENDS_GUIDE.md)'));
      el.appendChild(a);
    },
    actions: [
      { label: 'Getting started', icon: 'sparkles', run: () => { friendsOnboardOpen(); } },
      'spacer',
      { label: 'Close', primary: true },
    ],
  });
}
window.friendsHelpOpen = friendsHelpOpen;

registerCommand({ id: 'friends-onboard', label: 'Friends: getting started', icon: 'sparkles', group: 'Go to', keywords: 'friends welcome start onboarding first relay invite character setup', run: () => friendsOnboardOpen() });
registerCommand({ id: 'friends-help', label: 'How friends work', icon: 'circle-help', keywords: 'friends help privacy relay invite remove what can friends see guide', run: () => friendsHelpOpen() });
